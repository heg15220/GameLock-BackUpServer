/**
 * Deterministic, seed-derived randomness for FULGOR.
 *
 * A campaign is eight hours long and the design promises two things that only hold if
 * every draw is reproducible: `balance.test.js` runs a thousand simulated campaigns to
 * ask how many end unmasked (§14.3), and a transfer code has to describe a state that
 * behaves the same on the other device (§15).
 *
 * So, exactly as in `sports/trayectoria/rng.js`, randomness is never one shared
 * generator. Every draw comes from a stream keyed by a descriptive string —
 * `${seed}:clue:sabater:c3:d2`, `${seed}:duel:tasador:3` — which buys two properties
 * the design leans on hard:
 *
 *  - Independent events cannot contaminate each other. The duel panel shows the odds
 *    of a technique *before* you pick it (§5.5, "el jugador nunca se delata sin saber
 *    que se estaba delatando"), and reading a preview must not advance the stream that
 *    resolves the action.
 *  - The whole campaign replays from its seed, which is what makes Monte Carlo balancing
 *    possible at all.
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
 * A xorshift32 stream. Successive calls advance it, so use one stream per event and
 * derive a new one (new key) for anything conceptually independent.
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

/** Clamp, used often enough by the pure modules to live next to the draws. */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
