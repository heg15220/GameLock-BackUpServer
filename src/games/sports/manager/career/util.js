import { createStream, hashSeed } from '../../trayectoria/rng.js';

export { createStream, hashSeed };

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
/** Round persistent fractional state to a fixed grid: saves stay small and exact. */
export const quantize = (value, digits) => { const scale = 10 ** digits; return Math.round(value * scale) / scale; };
export const lerp = (a, b, t) => a + (b - a) * t;
export const round = (value, step = 1) => Math.round(value / step) * step;
export const roundMoney = (value) => {
  const abs = Math.abs(value);
  const step = abs >= 10e6 ? 100000 : abs >= 1e6 ? 50000 : abs >= 100000 ? 5000 : 500;
  return Math.round(value / step) * step;
};
export const sum = (list, pick = (x) => x) => list.reduce((total, item) => total + pick(item), 0);
export const mean = (list, pick = (x) => x) => (list.length ? sum(list, pick) / list.length : 0);
export const by = (pick, dir = 1) => (a, b) => (pick(a) > pick(b) ? dir : pick(a) < pick(b) ? -dir : 0);

/** Stable hash of a string to [0, 1). */
export const hash01 = (...parts) => hashSeed(parts.join(':')) / 4294967296;

export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

export function weighted(random, list, weight) {
  let total = 0;
  const weights = list.map((item) => {
    const w = Math.max(0, weight(item));
    total += w;
    return w;
  });
  if (total <= 0) return list[Math.floor(random() * list.length)];
  let roll = random() * total;
  for (let i = 0; i < list.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return list[i];
  }
  return list[list.length - 1];
}

export function shuffle(random, list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Normal-ish sample from the sum of uniforms. */
export function gauss(random, mu = 0, sigma = 1) {
  return mu + sigma * ((random() + random() + random() + random() - 2) / 0.5773);
}

export function poisson(random, lambda) {
  const limit = Math.exp(-lambda);
  let k = 0;
  let product = random();
  while (product > limit && k < 12) {
    k += 1;
    product *= random();
  }
  return k;
}

/* ── Dates: ISO strings at noon UTC so daylight saving never moves a day ── */

const DAY = 86400000;
const timeCache = new Map();
export const toTime = (date) => {
  let time = timeCache.get(date);
  if (time === undefined) {
    time = Date.parse(`${date}T12:00:00Z`);
    if (timeCache.size > 20000) timeCache.clear();
    timeCache.set(date, time);
  }
  return time;
};
export const fromTime = (time) => new Date(time).toISOString().slice(0, 10);
export const addDays = (date, days) => fromTime(toTime(date) + days * DAY);
export const daysBetween = (a, b) => Math.round((toTime(b) - toTime(a)) / DAY);
export const weekday = (date) => new Date(toTime(date)).getUTCDay(); // 0 Sunday
export const monthOf = (date) => Number(date.slice(5, 7));
export const yearOf = (date) => Number(date.slice(0, 4));
export const dayOf = (date) => Number(date.slice(8, 10));
export const iso = (year, month, day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/** The n-th given weekday on or after a date (n = 0 is the first one). */
export function weekdayOnOrAfter(date, day, n = 0) {
  const offset = (day - weekday(date) + 7) % 7;
  return addDays(date, offset + n * 7);
}

export function ageOn(player, date) {
  const born = player.born || `${player.birthYear || 2000}-07-01`;
  const [by, bm, bd] = born.split('-').map(Number);
  const [y, m, d] = date.split('-').map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

export const uid = (prefix, ...parts) => `${prefix}-${hashSeed(parts.join(':')).toString(36)}`;
