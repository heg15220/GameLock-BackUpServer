/**
 * Season slices of the season-keyed archives.
 *
 * The squad archives (Wikimedia, multilingual, research, CC0, OpenFootball),
 * the verified careers and the dated Wikidata memberships weigh ~70 MB together,
 * but a career only reads the season it starts in. The build cuts them into one
 * chunk per season with these functions (see scripts/vite-manager-seasons.mjs);
 * tests run the same cut over the full files, so both paths see the same data.
 *
 * A slice keeps every record that can matter for its season: the season lists
 * of each source untouched, every verified biography with that season among its
 * eligible ones (with the fields, season row and spell the game reads), and every
 * Wikidata player with a spell that can contain the season's snapshot date
 * (data.js still applies the exact date rules).
 */

export const SEASON_SOURCES = ['historical', 'wikimedia', 'cc0', 'research', 'multilingual'];

const yearOf = (value) => Number(String(value?.value ?? '').slice(0, 4));

/** Can this dated spell contain a September date of `year`? (A superset of playerClubAtDate.) */
function spellMayCover(membership, year) {
  const start = yearOf(membership.start);
  if (!Number.isFinite(start) || start > year) return false;
  if (!membership.end) return true;
  const end = yearOf(membership.end);
  return !Number.isFinite(end) || end >= year;
}

/** Everything but the season-keyed bulk: licences, revisions, audits and counts. */
export function archiveMeta(archives) {
  const sources = {};
  for (const key of SEASON_SOURCES) {
    const { seasons, historicalPlayers, ...rest } = archives[key] || {};
    sources[key] = rest;
  }
  const { players, ...verified } = archives.verified || {};
  return { ...sources, verified: { ...verified, playerCount: players?.length || 0 } };
}

/** Seasons any of the archives has something for. */
export function seasonYears(archives) {
  const years = new Set();
  for (const key of SEASON_SOURCES) for (const year of Object.keys(archives[key]?.seasons || {})) years.add(Number(year));
  for (const player of archives.verified?.players || []) for (const row of player.eligibleSeasons || []) years.add(Number(row.year));
  return [...years].filter(Number.isFinite).sort((a, b) => a - b);
}

// What verified-career-provider.js reads from a biography for one season.
const VERIFIED_FIELDS = ['name', 'birthDate', 'birthYear', 'nationality', 'position', 'identityPageId', 'identitySource', 'wikidataId',
  'source', 'sourceTitle', 'sourceRevision', 'sourceSha256', 'identityMetadataSource'];

/** A biography reduced to this season: its eligible row and the spell it points at. */
function verifiedForSeason(player, year) {
  const membership = player.eligibleSeasons?.find((row) => Number(row.year) === year);
  if (!membership) return null;
  const out = {};
  for (const key of VERIFIED_FIELDS) if (player[key] !== undefined) out[key] = player[key];
  out.eligibleSeasons = [membership];
  out.careerStints = (player.careerStints || []).filter((row) => row.index === membership.stintIndex);
  return out;
}

/** The slice of one season. */
export function sliceSeason(archives, year) {
  const y = Number(year);
  const seasons = {};
  for (const key of SEASON_SOURCES) seasons[key] = archives[key]?.seasons?.[y] ?? archives[key]?.seasons?.[String(y)] ?? null;
  return {
    year: y,
    seasons,
    verifiedPlayers: (archives.verified?.players || []).map((player) => verifiedForSeason(player, y)).filter(Boolean),
    historicalPlayers: (archives.historical?.historicalPlayers || []).filter((row) => row.memberships?.some((m) => spellMayCover(m, y))),
  };
}
