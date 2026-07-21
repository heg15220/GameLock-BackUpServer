// Topos a Mazazos — IA de las mascotas rivales. Módulo puro y testeable: eligen el
// topo más rentable alcanzable (evitando la bomba) y se mueven hacia él. El motor
// gestiona el retardo de reacción, la colisión con barriles y el martillazo.

import { isWhackable, moleValue, distXZ } from "./moles.js";

// Knobs por dificultad. `speed` px/s de movimiento, `reactionMs` retardo antes de
// fijar un objetivo nuevo, `targetError` ruido al ir al agujero, `bombMistake`
// probabilidad de ir a por una bomba por error (para que la IA sea batible).
export const DIFFICULTIES = {
  easy: { id: "easy", speed: 118, reactionMs: 430, targetError: 60, bombMistake: 0.2 },
  medium: { id: "medium", speed: 158, reactionMs: 250, targetError: 30, bombMistake: 0.07 },
  hard: { id: "hard", speed: 198, reactionMs: 130, targetError: 12, bombMistake: 0.015 },
};

export function createAiConfig(difficulty = "medium") {
  return { ...(DIFFICULTIES[difficulty] ?? DIFFICULTIES.medium) };
}

// Elige el índice del agujero objetivo: topo golpeable más rentable ponderado por la
// distancia. Evita la bomba salvo error ocasional. Devuelve -1 si no hay objetivo.
export function chooseTargetHole(mascot, holes, config, rng) {
  const r = rng ?? Math.random;
  let best = -1;
  let bestScore = -Infinity;
  for (let i = 0; i < holes.length; i += 1) {
    const m = holes[i].mole;
    if (!isWhackable(m)) continue;
    if (m.type === "bomb" && r() >= (config.bombMistake ?? 0)) continue; // esquiva la bomba
    const d = distXZ(mascot.x, mascot.z, holes[i].x, holes[i].z);
    const value = m.type === "bomb" ? -2 : moleValue(m.type);
    const score = value * 9 - d * 0.06;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

// Mueve una posición hacia un objetivo a `speed` px/s sin pasarse. Puro.
export function stepToward(pos, target, speed, dt) {
  const dx = target.x - pos.x;
  const dz = target.z - pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1) return { x: target.x, z: target.z };
  const step = Math.min(dist, speed * dt);
  return { x: pos.x + (dx / dist) * step, z: pos.z + (dz / dist) * step };
}
