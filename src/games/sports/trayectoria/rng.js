/**
 * Deterministic, seed-derived randomness for Trayectoria.
 *
 * Every draw in a career comes from a stream derived from a descriptive string
 * (`${seed}:development:22`, `${seed}:title:league:24`, …) rather than from one
 * shared generator. Two consequences we rely on:
 *
 *  - Independent events never contaminate each other. Asking "what would happen
 *    if…" for a preview costs nothing, because looking at one stream does not
 *    advance another.
 *  - The whole career is reproducible from the seed alone, so a save is just the
 *    seed plus the decisions taken.
 */

const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;
const UINT32 = 4294967296;

/** FNV-1a: descriptive seed string -> 32-bit integer. */
export function hashSeed(text) {
  let hash = FNV_OFFSET;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
}

/**
 * A xorshift32 stream. Successive calls advance it, so use one stream per event
 * and derive a new one (new key) for anything conceptually independent.
 */
export function createStream(...parts) {
  let state = hashSeed(parts.join(":")) || 1;
  return function next() {
    state ^= (state << 13) >>> 0;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= (state << 5) >>> 0;
    state >>>= 0;
    return state / UINT32;
  };
}

/** Single float in [0,1) for a one-shot draw. */
export function rand(...parts) {
  return createStream(...parts)();
}

/** Integer in [min,max] inclusive. */
export function randInt(next, min, max) {
  return min + Math.floor(next() * (max - min + 1));
}

/** True with probability `p`. */
export function chance(next, p) {
  if (p <= 0) return false;
  if (p >= 1) return true;
  return next() < p;
}

/** Uniform pick from a list. */
export function pick(next, items) {
  return items[Math.floor(next() * items.length)];
}

/** Weighted pick. `weightOf` maps an item to a non-negative number. */
export function pickWeighted(next, items, weightOf) {
  const total = items.reduce((sum, item) => sum + Math.max(0, weightOf(item)), 0);
  if (total <= 0) return items[0];
  let target = next() * total;
  for (const item of items) {
    target -= Math.max(0, weightOf(item));
    if (target <= 0) return item;
  }
  return items[items.length - 1];
}

/** Fisher-Yates using the given stream; returns a new array. */
export function shuffle(next, items) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
