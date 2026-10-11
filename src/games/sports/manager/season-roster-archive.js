import historical from './historical-rosters.json';
import wikimedia from './wikimedia-rosters.json';
import cc0 from './cc0-season-rosters.json';
import research from './research-season-rosters.json';
import multilingual from './multilingual-season-rosters.json';
import { getVerifiedCareerRecords } from './verified-career-provider.js';

// Keep each list intact with its licence. A dated editorial snapshot takes
// priority later in data.js. Never relabel a mixed list as CC0.
export function getSeasonRosterArchive(year) {
  return { ...multilingual.seasons?.[year], ...wikimedia.seasons?.[year], ...research.seasons?.[year], ...cc0.seasons?.[year], ...historical.seasons?.[year] };
}

export function getSeasonRosterRecords(year) {
  // A bounded match-sheet list must not be silently broadened with later-season
  // observations. Other partial lists can complement each other row by row.
  return [...getVerifiedCareerRecords(year).filter(([club]) => !research.seasons?.[year]?.[club]),
    ...[multilingual, wikimedia, research, cc0, historical].flatMap(source => Object.entries(source.seasons?.[year] || {})
    .filter(([club]) => source === research || !research.seasons?.[year]?.[club]))];
}

export { linkedPlayerIdentities, linkedPlayerIdentity, identitiesCompatible, reconcileSeasonPlayerGroups, unambiguousSeasonPlayers } from './player-identity-reconciliation.js';
