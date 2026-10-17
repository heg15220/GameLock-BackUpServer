/** Reproducible coverage audit. Missing records remain explicit, never inferred. */
import fs from 'node:fs/promises';
import { managerCompetitionExtensions } from '../src/games/sports/manager/competitions.js';
const read = async path => JSON.parse(await fs.readFile(path, 'utf8'));
const root = 'src/games/sports/manager';
const archive = await read(`${root}/league-memberships.json`);
const world = await read('src/games/sports/trayectoria/world.data.json');
const catalog = [...Object.values(world.competitions), ...managerCompetitionExtensions];
const images = await read(`${root}/artwork.json`);
const evidence = new Map();
for (const file of await fs.readdir(`${root}/evidence`)) {
  if (!/^window-\d{4}\.json$/.test(file)) continue;
  const window = await read(`${root}/evidence/${file}`);
  for (const player of window.players) for (const [year, club] of player[6]) {
    const key = `${year}:${window.clubs[club]}`;
    evidence.set(key, (evidence.get(key) || 0) + 1);
  }
}
const years = Object.keys(archive.seasons).map(Number).sort(), allClubs = new Set(), errors = [];
const leagues = catalog.map(league => {
  const availableYears = [], missingYears = [], clubs = new Set(), clubSeasons = [];
  for (const year of years) {
    const record = archive.seasons[year][league.id];
    if (!record) { missingYears.push(year); continue; }
    if (league.id === 'morocco-botola' && /Botola 2/i.test(new URL(record.source).searchParams.get('title') || '')) errors.push(`Wrong Moroccan division: ${year}`);
    availableYears.push(year);
    if (record.validation?.expectedCount && record.teams.length !== record.validation.expectedCount) errors.push(`Wrong participant count: ${year} ${league.id}`);
    for (const team of record.teams) {
      clubs.add(team.clubId); allClubs.add(team.clubId);
      clubSeasons.push({ year, clubId: team.clubId, name: team.name, biographyPlayers: evidence.get(`${year}:${team.clubId}`) || 0 });
    }
  }
  return { id: league.id, name: league.name, confederation: league.confederation, tier: league.tier || 1, availableYears, missingYears,
    clubs: clubs.size, clubSeasons: clubSeasons.length, logo: Boolean(images.competitions[league.id] || league.logo),
    crests: [...clubs].filter(id => images.crests[id] || world.clubs[id]?.crest).length,
    biographyClubSeasons: clubSeasons.filter(row => row.biographyPlayers).length,
    ...(league.id === 'liga-profesional' ? { seasons: years.map(year => ({ year, clubs: clubSeasons.filter(row => row.year === year) })) } : {}) };
});
for (const year of years) {
  const ids = Object.values(archive.seasons[year]).flatMap(record => record.teams.map(team => team.clubId));
  if (new Set(ids).size !== ids.length) errors.push(`Duplicate club identities in ${year}`);
}
for (const name of ['league-memberships', 'regional-memberships']) {
  if (await fs.readFile(`${root}/${name}.json`, 'utf8') !== await fs.readFile(`public/data/football-manager/${name}.json`, 'utf8')) errors.push(`Public mirror mismatch: ${name}`);
}
for (const bucket of Object.values(images)) for (const path of Object.values(bucket)) {
  try { await fs.access(`public${path}`); } catch { errors.push(`Missing local artwork: ${path}`); }
}
const report = { checkedAt: new Date().toISOString(), years: years.length, catalogLeagues: catalog.length,
  playableLeagues: leagues.filter(league => league.availableYears.length).length,
  leagueSeasons: leagues.reduce((sum, league) => sum + league.availableYears.length, 0),
  clubSeasons: leagues.reduce((sum, league) => sum + league.clubSeasons, 0), uniqueClubs: allClubs.size,
  availableCrests: [...allClubs].filter(id => images.crests[id] || world.clubs[id]?.crest).length,
  scope: 'Configured league archive, not an exhaustive worldwide database. Biography counts are partial evidence before runtime reconciliation, not complete roster counts.',
  leagues, errors };
await fs.mkdir('output/manager-global', { recursive: true });
await fs.writeFile('output/manager-global/coverage.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, leagues: report.leagues.map(({ seasons, ...league }) => ({ ...league, availableYears: league.availableYears.length, missingYears: league.missingYears.length })) }, null, 2));
if (errors.length) process.exitCode = 1;
