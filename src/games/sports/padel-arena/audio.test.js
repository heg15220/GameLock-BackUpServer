import { describe, expect, it } from "vitest";
import PadelAudio, { CUE_MS } from "./audio.js";

describe("audio de Pádel", () => {
  // El módulo importa 7 MP3. En el entorno node de vitest no hay window, así que
  // todo debe quedarse en no-op silencioso en vez de reventar.
  it("responde a todas las señales sin WebAudio", () => {
    const audio = new PadelAudio();
    expect(() => {
      audio.paddle();
      audio.smash();
      audio.floor();
      audio.glass();
      audio.net();
      audio.clap();
      audio.whistle();
      audio.dispose();
    }).not.toThrow();
  });

  it("respeta el interruptor de sonido", () => {
    const audio = new PadelAudio();
    expect(audio.getEnabled()).toBe(true);
    audio.setEnabled(false);
    expect(audio.getEnabled()).toBe(false);
    expect(audio.ensureContext()).toBeNull();
  });

  it("las muestras caen en síntesis mientras no estén decodificadas", () => {
    const audio = new PadelAudio();
    expect(audio._sample("paddle")).toBe(false);
  });

  describe("red de seguridad contra duplicados", () => {
    it("descarta la misma señal repetida a quemarropa", () => {
      const audio = new PadelAudio();
      expect(audio._isRetrigger("paddle", 1000)).toBe(false);
      expect(audio._isRetrigger("paddle", 1010)).toBe(true); // 10 ms después
      expect(audio._isRetrigger("paddle", 1400)).toBe(false); // 400 ms: es otro golpe
    });

    it("no estorba entre señales distintas", () => {
      // Pala y cristal en el mismo instante son dos sucesos reales.
      const audio = new PadelAudio();
      expect(audio._isRetrigger("paddle", 500)).toBe(false);
      expect(audio._isRetrigger("glass", 500)).toBe(false);
      expect(audio._isRetrigger("floor", 500)).toBe(false);
    });

    it("no limita el aplauso ni el silbato", () => {
      // No son impactos: no tiene sentido protegerlos, y el punto puede cerrarse
      // justo después de otro.
      const audio = new PadelAudio();
      expect(audio._isRetrigger("clap", 0)).toBe(false);
      expect(audio._isRetrigger("clap", 1)).toBe(false);
      expect(audio._isRetrigger("whistle", 1)).toBe(false);
    });
  });

  describe("duración por situación de juego", () => {
    it("los impactos del peloteo son secos", () => {
      // Un peloteo encadena golpes muy seguidos: si un impacto se alarga, el
      // siguiente le cae encima y todo se vuelve barro.
      for (const name of ["paddle", "smash", "floor"]) {
        expect(CUE_MS[name], name).toBeLessThanOrEqual(400);
      }
      // El cristal es el sonido firma del pádel, pero es un toque seco: la bola
      // rebota y el peloteo sigue. Nada de resonancia de panel.
      expect(CUE_MS.glass).toBeLessThanOrEqual(250);
    });

    it("el público solo aplaude: no hay señal de vítores", () => {
      expect(CUE_MS.cheer).toBeUndefined();
      expect(new PadelAudio().cheer).toBeUndefined();
      expect(CUE_MS.clap).toBeGreaterThan(CUE_MS.glass);
    });

    it("todas las señales tienen techo", () => {
      for (const [name, ms] of Object.entries(CUE_MS)) {
        expect(ms, `${name} sin techo`).toBeGreaterThan(0);
      }
    });
  });
});
