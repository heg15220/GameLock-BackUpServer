import { seasonArchive } from './season-archives.js';
import { getVerifiedCareerRecords } from './verified-career-provider.js';

// Keep each list intact with its licence. A dated editorial snapshot takes
// priority later in data.js. Never relabel a mixed list as CC0.
export function getSeasonRosterArchive(year) {
  const { multilingual, wikimedia, research, cc0, historical } = seasonArchive(year).seasons;
  return { ...multilingual, ...wikimedia, ...research, ...cc0, ...historical };
}

export function getSeasonRosterRecords(year) {
  // A bounded match-sheet list must not be silently broadened with later-season
  // observations. Other partial lists can complement each other row by row.
  const seasons = seasonArchive(year).seasons;
  const research = seasons.research || {};
  return [...getVerifiedCareerRecords(year).filter(([club]) => !research[club]),
    ...['multilingual', 'wikimedia', 'research', 'cc0', 'historical'].flatMap(source => Object.entries(seasons[source] || {})
    .filter(([club]) => source === 'research' || !research[club]))];
}

export { linkedPlayerIdentities, linkedPlayerIdentity, identitiesCompatible, reconcileSeasonPlayerGroups, unambiguousSeasonPlayers } from './player-identity-reconciliation.js';
