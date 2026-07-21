import { describe, expect, it } from "vitest";
import { ToposRuntime } from "./engine.js";
import { createMole, POP_HEIGHT } from "./moles.js";

// Contexto 2D de mentira: devuelve algo utilizable para gradientes y medidas.
function stubCanvas() {
  const ctx = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "canvas") return { width: 960, height: 540 };
        return () => {
          if (prop === "createLinearGradient" || prop === "createRadialGradient") {
            return { addColorStop() {} };
          }
          if (prop === "measureText") return { width: 40 };
          return undefined;
        };
      },
      set: () => true,
    },
  );
  return { clientWidth: 960, clientHeight: 540, width: 960, height: 540, getContext: () => ctx };
}

const silentAudio = () => ({
  unlock() {},
  playHit() {},
  playGold() {},
  playBomb() {},
  playSwing() {},
  playEnd() {},
  isMuted: () => false,
  toggleMuted: () => false,
  dispose() {},
});

describe("ToposRuntime", () => {
  it("arranca la partida y avisa a la UI", () => {
    const snaps = [];
    const rt = new ToposRuntime({
      canvas: stubCanvas(),
      locale: "es",
      audio: silentAudio(),
      onSnapshot: (s) => snaps.push(s),
    });
    rt.startMatch();
    expect(rt.screen).toBe("countdown");
    expect(snaps.at(-1).screen).toBe("countdown");
  });

  // Regresión: el navegador puede negarse a crear un AudioContext (Chrome corta
  // por número de contextos por página). Si esa llamada tumba startMatch, el
  // motor cambia de pantalla pero React nunca se entera y el botón «¡A jugar!»
  // parece muerto. El sonido es accesorio: jamás debe bloquear la partida.
  it("arranca aunque el audio explote", () => {
    const snaps = [];
    const audio = {
      ...silentAudio(),
      unlock() {
        throw new Error("Failed to construct 'AudioContext': limit reached");
      },
    };
    const rt = new ToposRuntime({
      canvas: stubCanvas(),
      locale: "es",
      audio,
      onSnapshot: (s) => snaps.push(s),
    });

    expect(() => rt.startMatch()).not.toThrow();
    expect(rt.screen).toBe("countdown");
    expect(snaps.at(-1).screen).toBe("countdown");
  });

  it("un fallo de sonido durante el juego no corta la puntuación", () => {
    const audio = {
      ...silentAudio(),
      playHit() {
        throw new Error("audio backend gone");
      },
      playGold() {
        throw new Error("audio backend gone");
      },
    };
    const rt = new ToposRuntime({
      canvas: stubCanvas(),
      locale: "es",
      audio,
      onSnapshot: () => {},
    });
    rt.startMatch();
    rt.advanceTime(3200); // pasar la cuenta atrás

    // Plantamos un topo dorado asomado y ponemos al jugador encima.
    const hole = rt.holes[0];
    hole.mole = { ...createMole("gold", 900), phase: "up", y: POP_HEIGHT };
    rt.mascots[0].x = hole.x;
    rt.mascots[0].z = hole.z;
    expect(() => rt.doWhack(0)).not.toThrow();
    expect(rt.mascots[0].score).toBeGreaterThan(0);
  });
});
