/**
 * Career evidence archive, five seasons per file, loaded only for the season
 * the manager picks (see scripts/build-manager-player-evidence.mjs).
 *
 * Each window holds the clubs' strength per season (league tables) and, for
 * every documented player, the clubs he belonged to in those seasons with an
 * evidence-based rating: league appearances, senior caps weighted by the
 * national team's level in that era, the level of his clubs, scoring rate and
 * age. Facts adapted from Wikipedia (CC BY-SA 4.0); ratings are game estimates.
 */
const loaders = import.meta.glob('./evidence/window-*.json', { import: 'default' });
const loaded = new Map();
const FIRST = 1990;

export const evidenceWindowStart = (year) => FIRST + Math.floor((Number(year) - FIRST) / 5) * 5;

/** Fetch the window of a season. Resolves to null when there is none. */
export async function loadSeasonEvidence(year) {
  const start = evidenceWindowStart(year);
  if (loaded.has(start)) return loaded.get(start);
  const loader = loaders[`./evidence/window-${start}.json`];
  if (!loader) { loaded.set(start, null); return null; }
  try {
    const data = await loader();
    loaded.set(start, data);
    return data;
  } catch {
    // Offline or a failed chunk: the archive squads and estimates still work.
    return null;
  }
}

/** Already loaded evidence of one season, or null (synchronous). */
export function seasonEvidence(year) {
  const data = loaded.get(evidenceWindowStart(year));
  if (!data) return null;
  const y = Number(year);
  const players = [];
  for (const [name, birthDate, nat, pos, alt, pageid, seasons] of data.players) {
    const season = seasons.find((s) => s[0] === y);
    if (!season) continue;
    const [, clubIndex, rating, potential, apps, loan] = season;
    players.push({ name, birthDate, nat, pos, alt, pageid, clubId: data.clubs[clubIndex], rating, potential, apps: apps < 0 ? null : apps, loan: Boolean(loan) });
  }
  return { year: y, strength: data.strength?.[y] || {}, players, license: data.license, attribution: data.attribution, model: data.model };
}

/** For tests and tools that load the JSON themselves. */
export function primeSeasonEvidence(start, data) { loaded.set(start, data); }
