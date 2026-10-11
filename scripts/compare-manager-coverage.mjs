import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

// Compare exported source coverage, never the simulated contents of a saved game.
const [beforePath, afterPath = 'public/data/football-manager/archive-coverage.json', outputPath = 'output/manager-coverage-comparison.json'] = process.argv.slice(2);
assert.ok(beforePath, 'Usage: node scripts/compare-manager-coverage.mjs BEFORE [AFTER] [OUTPUT]');
const before = JSON.parse(await fs.readFile(beforePath, 'utf8'));
const after = JSON.parse(await fs.readFile(afterPath, 'utf8'));
const index = archive => new Map(Object.values(archive.seasons).flat().map(row => [`${row.year}:${row.id}`, row]));
const oldRows = index(before), newRows = index(after);
assert.equal(oldRows.size, newRows.size, 'Coverage editions must cover the same league-years');
const changed = [], leagues = new Map();
for (const [key, row] of newRows) {
  const old = oldRows.get(key);
  assert.ok(old, `Missing baseline league-year ${key}`);
  const addedLists = row.clubs.filter(c => c.hasList && !old.clubs.some(p => p.id === c.id && p.hasList)).map(c => ({ id: c.id, name: c.name }));
  const removedLists = old.clubs.filter(c => c.hasList && !row.clubs.some(p => p.id === c.id && p.hasList)).map(c => ({ id: c.id, name: c.name }));
  const windowChanged = old.windows.coverage !== row.windows.coverage;
  if (windowChanged || addedLists.length || removedLists.length) changed.push({ year: row.year, leagueId: row.id, name: row.name, windowsBefore: old.windows.coverage, windowsAfter: row.windows.coverage, addedLists, removedLists });
  const total = leagues.get(row.id) || { id: row.id, name: row.name, estimatedMarkets: 0, partialMarkets: 0, documentedMarkets: 0, participantClubSeasons: 0, withLists: 0, withoutLists: 0 };
  total.estimatedMarkets += Number(row.windows.coverage === 'estimated');
  total.partialMarkets += Number(row.windows.coverage === 'partial');
  total.documentedMarkets += Number(row.windows.coverage === 'complete-regular-windows');
  total.participantClubSeasons += row.clubs.length;
  total.withLists += row.clubsWithLists;
  total.withoutLists += row.clubs.length - row.clubsWithLists;
  leagues.set(row.id, total);
}
const delta = Object.fromEntries(Object.keys(after.summary).map(key => [key, after.summary[key] - before.summary[key]]));
const report = { before: before.summary, after: after.summary, delta, changed, leagues: [...leagues.values()], note: 'A source list does not establish a complete squad. Missing participant seasons cannot be counted as known missing club lists.' };
await fs.writeFile(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ delta, changedLeagueSeasons: changed.length }, null, 2));
