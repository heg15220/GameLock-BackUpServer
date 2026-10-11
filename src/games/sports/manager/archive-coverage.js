import { managerLeagueCatalog, getLeagueSeasonCoverage, getSeasonParticipants } from './league-memberships.js';
import { getSeasonRosterArchive } from './season-roster-archive.js';
import { getTransferWindowCoverage } from './transfer-windows.js';
import { editorialRosters } from './editorial-rosters.js';

// Measures source lists, not full real squads or the contents of an old save.
export function getArchiveCoverage(year) {
  const season = getSeasonRosterArchive(year);
  const windows = new Map(getTransferWindowCoverage().competitionSeasons.filter(r => r.year === Number(year)).map(r => [r.competitionId, r]));
  return managerLeagueCatalog.map(league => {
    const membership = getLeagueSeasonCoverage(league.id, year);
    const clubs = getSeasonParticipants(league.id, year).map(club => {
      const record = season[club.clubId];
      const editorial = editorialRosters[year]?.[club.clubId];
      return { id: club.clubId, name: club.name, hasList: Boolean(record || editorial?.complete),
        precision: editorial?.complete ? editorial.precision : record?.precision ?? null,
        rows: editorial?.complete ? editorial.players.split('\n').filter(row => row.trim()).length : record?.players.length ?? null, source: editorial?.complete ? editorial.sourceUrl : record?.source ?? null,
        license: editorial?.complete ? editorial.sourceLicense ?? null : record?.license ?? null };
    });
    return { id: league.id, name: league.name, year: Number(year), membership, clubs,
      clubsWithLists: clubs.filter(c => c.hasList).length, windows: windows.get(league.id) ?? null };
  });
}
