// Draft de Leyendas NBA — utilidades de aleatoriedad reproducible. PRNG mulberry32
// semilleable para que partidos y torneos se puedan repetir y testear.

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

// Semilla entera a partir de un string (para sembrar por nombre de equipo, etc.).
export function seedFrom(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function randInt(rng, n) {
  return Math.floor(rng() * n);
}

export function pick(rng, arr) {
  return arr[randInt(rng, arr.length)];
}

// Muestra sin reemplazo `count` elementos de `arr`. No muta el original.
export function sampleWithout(rng, arr, count) {
  const pool = arr.slice();
  const out = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = randInt(rng, pool.length);
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

// Elección ponderada: `weightFn(item) -> número > 0`.
export function weightedPick(rng, arr, weightFn) {
  let total = 0;
  const weights = arr.map((it) => {
    const w = Math.max(0, weightFn(it));
    total += w;
    return w;
  });
  if (total <= 0) return pick(rng, arr);
  let r = rng() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}
