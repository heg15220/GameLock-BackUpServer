import fs from 'node:fs/promises';
import { build } from 'esbuild';
const bundle = await build({ stdin: { contents: `export { getArchiveCoverage } from './src/games/sports/manager/archive-coverage.js';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const { getArchiveCoverage } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const seasons = Object.fromEntries(Array.from({ length: 36 }, (_, i) => [1990 + i, getArchiveCoverage(1990 + i)]));
const rows = Object.values(seasons).flat();
const summary = { leagueSeasons: rows.length, withParticipants: rows.filter(r => r.membership.available).length,
  withBothWindows: rows.filter(r => r.windows?.coverage === 'complete-regular-windows').length,
  withPartialWindows: rows.filter(r => r.windows?.coverage === 'partial').length,
  withEstimatedWindows: rows.filter(r => r.windows?.coverage === 'estimated').length,
  participantClubSeasons: rows.reduce((n,r) => n + r.clubs.length, 0),
  clubSeasonsWithSourceLists: rows.reduce((n,r) => n + r.clubsWithLists, 0) };
const result = { generatedAt: new Date().toISOString(), summary,
  note: 'Source lists are not complete opening-day squads. Counts cover documented domestic participants only; saved careers retain their original data.', seasons };
await fs.writeFile('public/data/football-manager/archive-coverage.json', JSON.stringify(result) + '\n');
console.log(JSON.stringify(summary, null, 2));
