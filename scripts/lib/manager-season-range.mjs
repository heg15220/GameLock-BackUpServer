// Importers discover only seasons which have begun. Runtime availability still
// comes exclusively from validated participant records, never from this range.
export const firstSeasonYear = 1990;
export function latestSeasonYear(date = new Date()) {
  return date.getUTCFullYear() - (date.getUTCMonth() < 6 ? 1 : 0);
}
export const seasonYears = () => Array.from({ length: latestSeasonYear() - firstSeasonYear + 1 }, (_, i) => firstSeasonYear + i);
