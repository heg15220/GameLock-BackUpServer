// Topos a Mazazos — rejilla de agujeros y ciclo de vida de los topos. Módulo puro y
// testeable (sin DOM ni canvas).
//
// Marco del mundo (píxeles): x lateral (0 centro), z profundidad (cerca → lejos),
// y altura sobre el suelo (los topos asoman subiendo en y). La cámara la aplica la
// escena; aquí todo es geometría de mundo.

export const ARENA_HALF_X = 250; // ancho de la arena (x de -250 a 250)
export const ARENA_NEAR_Z = 40; // fondo cercano
export const ARENA_FAR_Z = 460; // fondo lejano
export const GRID_COLS = 4;
export const GRID_ROWS = 4;
export const POP_HEIGHT = 36; // cuánto asoma un topo del agujero

// Tipos de topo: valor y peso de aparición. La bomba penaliza y aturde.
export const MOLE_TYPES = {
  brown: { value: 1, weight: 66 },
  gold: { value: 3, weight: 15 },
  bomb: { value: -2, weight: 19 },
};

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export function moleValue(type) {
  return MOLE_TYPES[type]?.value ?? 0;
}

// PRNG mulberry32 sembrable, para partidas reproducibles.
export function makeRng(seed = 0x9e3779b9) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Posiciones de los agujeros: rejilla uniforme centrada en la arena.
export function createHoles() {
  const holes = [];
  const spanX = ARENA_HALF_X * 1.5;
  const z0 = ARENA_NEAR_Z + 34;
  const z1 = ARENA_FAR_Z - 34;
  for (let r = 0; r < GRID_ROWS; r += 1) {
    for (let c = 0; c < GRID_COLS; c += 1) {
      const x = -spanX / 2 + (GRID_COLS === 1 ? spanX / 2 : (c / (GRID_COLS - 1)) * spanX);
      const z = z0 + (GRID_ROWS === 1 ? 0 : (r / (GRID_ROWS - 1)) * (z1 - z0));
      holes.push({ x, z, mole: null });
    }
  }
  return holes;
}

// Elige un tipo de topo por peso. `bombChance` puede escalar la frecuencia de bomba.
export function pickMoleType(rng, bombScale = 1) {
  const weights = {
    brown: MOLE_TYPES.brown.weight,
    gold: MOLE_TYPES.gold.weight,
    bomb: MOLE_TYPES.bomb.weight * bombScale,
  };
  const total = weights.brown + weights.gold + weights.bomb;
  let r = (rng ? rng() : Math.random()) * total;
  if ((r -= weights.brown) < 0) return "brown";
  if ((r -= weights.gold) < 0) return "gold";
  return "bomb";
}

// Un topo nuevo. Ciclo: rising → up → falling → (fuera). `upMs` es cuánto se queda
// asomado antes de esconderse.
export function createMole(type, upMs = 900) {
  return { type, phase: "rising", t: 0, y: 0, upMs, whacked: false };
}

// Duraciones del ciclo (ms).
export const RISE_MS = 180;
export const FALL_MS = 220;

// Avanza un topo dt segundos. Devuelve el topo actualizado, o null si ya desapareció.
export function stepMole(mole, dt) {
  const t = mole.t + dt * 1000;
  let { phase } = mole;
  let y = mole.y;
  if (phase === "rising") {
    y = POP_HEIGHT * clamp(t / RISE_MS, 0, 1);
    if (t >= RISE_MS) phase = "up";
  }
  if (phase === "up") {
    y = POP_HEIGHT;
    if (t >= RISE_MS + mole.upMs) phase = "falling";
  }
  if (phase === "falling") {
    const ft = t - (RISE_MS + mole.upMs);
    y = POP_HEIGHT * (1 - clamp(ft / FALL_MS, 0, 1));
    if (ft >= FALL_MS) return null; // desaparece
  }
  return { ...mole, t, phase, y };
}

// ¿Se puede golpear? Debe estar suficientemente asomado y no golpeado aún.
export function isWhackable(mole) {
  return Boolean(mole) && !mole.whacked && mole.y > POP_HEIGHT * 0.45;
}

// Distancia horizontal (plano x-z).
export function distXZ(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}
