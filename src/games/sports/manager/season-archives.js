/**
 * The season-keyed archives, one chunk per season (see season-slices.js).
 *
 * `loadSeasonArchives(year)` fetches a season before its world is built;
 * `seasonArchive(year)` then reads it synchronously. Under Vitest every season
 * is available without loading.
 */
import { meta, years, eager, loaders } from 'virtual:manager-season-archives';

export const seasonArchiveMeta = meta;
export const seasonArchiveYears = years;

const loaded = new Map();
const empty = (year) => ({ year, seasons: {}, verifiedPlayers: [], historicalPlayers: [] });

/** Fetch one season's archives. A failed download is retried, then reported: a world is never built on half the data. */
export async function loadSeasonArchives(year) {
  const y = Number(year);
  if (eager || loaded.has(y)) return;
  const loader = loaders?.[y];
  if (!loader) { loaded.set(y, empty(y)); return; }
  let failure = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const module = await loader();
      loaded.set(y, module.default);
      return;
    } catch (error) {
      failure = error;
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  throw failure;
}

/** One season's archives, already loaded. */
export function seasonArchive(year) {
  const y = Number(year);
  if (eager) return eager(y);
  if (loaded.has(y)) return loaded.get(y);
  if (!loaders?.[y]) return empty(y);
  throw new Error(`Modo mánager: archives of ${y} were not loaded (call loadSeasonArchives first)`);
}
