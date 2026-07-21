import { describe, expect, it } from "vitest";
import { createTerrorZombiAudio, readStoredTerrorZombiMuted, CUE_MS, DETAILS, DETAIL_MIN_MS } from "./audio.js";
import { TerrorZombiRuntime, START_GRACE_MS } from "./runtime.js";

// Un audio de mentira que anota qué le piden, para comprobar el cableado del
// ciclo de vida sin necesidad de WebAudio.
function spyAudio() {
  const calls = [];
  const rec = (name) => (...args) => calls.push(args.length ? `${name}:${args[0]}` : name);
  return {
    calls,
    unlock: rec("unlock"),
    startAmbience: rec("startAmbience"),
    stopAmbience: rec("stopAmbience"),
    setAmbiencePaused: rec("setAmbiencePaused"),
    playStart: rec("playStart"),
    playBite: rec("playBite"),
    playInfect: rec("playInfect"),
    playWin: rec("playWin"),
    playLose: rec("playLose"),
    toggleMuted: () => false,
    dispose: rec("dispose"),
  };
}

describe("audio de Terror Zombi", () => {
  // El módulo importa 10 MP3. En el entorno node de vitest no hay window, así
  // que todo debe quedarse en no-op silencioso en vez de reventar.
  it("se construye y responde sin WebAudio", () => {
    const audio = createTerrorZombiAudio(false);
    expect(() => {
      audio.unlock();
      audio.playStart();
      audio.playBite();
      audio.playInfect();
      audio.playWin();
      audio.playLose();
      audio.startAmbience();
      audio.setAmbiencePaused(true);
      audio.stopAmbience();
      audio.dispose();
    }).not.toThrow();
  });

  it("expone el estado de silencio", () => {
    const audio = createTerrorZombiAudio(true);
    expect(audio.isMuted()).toBe(true);
    expect(audio.snapshot()).toMatchObject({ muted: true, available: false });
    expect(typeof readStoredTerrorZombiMuted()).toBe("boolean");
  });

  it("no carga ninguna muestra mientras no haya contexto", () => {
    const audio = createTerrorZombiAudio(false);
    audio.unlock();
    expect(audio.snapshot().samples).toBe(0);
  });
});

describe("duración de los cues según la mecánica", () => {
  it("la losa deja de sonar justo cuando ya pueden infectar", () => {
    expect(CUE_MS.tombstone).toBe(START_GRACE_MS);
  });

  it("ningún detalle de ambiente dura más que el hueco que lo sigue", () => {
    // Invariante del planificador: el hueco se cuenta desde el final del
    // detalle, así que uno más largo que el hueco mínimo ya no se solapa, pero
    // sí dejaría el cementerio sonando casi sin pausa.
    for (const name of DETAILS) {
      expect(CUE_MS[name], `${name} sin tope`).toBeGreaterThan(0);
      expect(CUE_MS[name], `${name} demasiado largo`).toBeLessThanOrEqual(DETAIL_MIN_MS);
    }
  });

  it("los cues de acción son puntuación, no colchón", () => {
    // Un mordisco puede encadenarse con otros en el mismo tick.
    expect(CUE_MS.bite).toBeLessThan(1000);
    expect(CUE_MS.snarl).toBeLessThan(1000);
    // Convertirte y perder tienen más peso, pero siguen acotados.
    expect(CUE_MS.infect).toBeLessThanOrEqual(2000);
    expect(CUE_MS.roar).toBeLessThanOrEqual(2500);
  });
});

describe("cableado del ambiente con el runtime", () => {
  it("arranca el cementerio al empezar la ronda", () => {
    const audio = spyAudio();
    const rt = new TerrorZombiRuntime({ seed: 42, audio });
    rt.startGame("normal");
    expect(audio.calls).toContain("startAmbience");
    expect(audio.calls.indexOf("unlock")).toBeLessThan(audio.calls.indexOf("startAmbience"));
  });

  it("lo baja en pausa y lo restaura al reanudar", () => {
    const audio = spyAudio();
    const rt = new TerrorZombiRuntime({ seed: 42, audio });
    rt.startGame("normal");
    rt.togglePause();
    expect(audio.calls).toContain("setAmbiencePaused:true");
    rt.togglePause();
    expect(audio.calls).toContain("setAmbiencePaused:false");
  });

  it("lo corta al volver al menú", () => {
    const audio = spyAudio();
    const rt = new TerrorZombiRuntime({ seed: 42, audio });
    rt.startGame("normal");
    rt.backToMenu();
    expect(audio.calls).toContain("stopAmbience");
  });
});
