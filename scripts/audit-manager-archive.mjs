import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
const outputDirectory = process.argv[2] || 'output/manager-v9';
const bundle = await build({ stdin: { contents: `export { getManagerWorld } from './src/games/sports/manager/data.js';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const { getManagerWorld } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const years = [], files = {}, duplicateIdentities = [];
for (const name of ['wikimedia-rosters', 'multilingual-season-rosters', 'verified-player-careers', 'cc0-season-rosters', 'research-season-rosters', 'transfer-windows.data']) {
  const path = `src/games/sports/manager/${name}.json`, text = await fs.readFile(path, 'utf8');
  files[path] = createHash('sha256').update(text).digest('hex');
}
for (const name of ['data', 'season-roster-archive', 'player-identity-reconciliation', 'verified-career-provider', 'career-affiliation', 'roster-depth']) {
  const path=`src/games/sports/manager/${name}.js`;
  files[path]=createHash('sha256').update(await fs.readFile(path,'utf8')).digest('hex');
}
for (let year = 1990; year <= 2025; year++) {
  const world = getManagerWorld(year), ids = new Set(), sources = {}, identityOwners = new Map();
  const owners = new Map(world.clubs.flatMap(club => club.playerIds.map(id => [id, club.id])));
  for (const player of world.players) {
    assert.ok(!ids.has(player.id), `${year}: duplicate ${player.id}`); ids.add(player.id);
    assert.equal(owners.get(player.id), player.clubId, `${year}: roster ownership ${player.id}`);
    assert.ok(player.age >= 16 && player.potential >= player.rating);
    const identityKeys = [...new Set([...(player.identityKeys||[]),player.identityPageId && `${player.identityWiki || 'en'}.wikipedia.org:${player.identityPageId}`,player.wikidataId && `wikidata:${player.wikidataId}`].filter(Boolean))];
    for (const key of identityKeys) {
      const previous=identityOwners.get(key);
      if(previous)duplicateIdentities.push({year,key,players:[previous,{id:player.id,clubId:player.clubId,name:player.name}]});
      identityOwners.set(key,{id:player.id,clubId:player.clubId,name:player.name});
    }
    if (player.source === 'research-match-sheet') {
      assert.equal(player.sourceLicense, 'CC-BY-4.0');
      assert.ok(player.membershipObservations.every(o => o.date <= player.evidenceCutoff));
    }
    if (player.source === 'wikimedia-verified-career') {
      assert.equal(player.sourceLicense, 'CC-BY-SA-4.0');
      assert.equal(player.membershipPrecision, 'year-interior');
      assert.ok(player.stintFrom < year && year < player.stintTo);
      assert.ok(player.identityPageId && player.birthDate && player.sourceRevision);
      assert.ok(!player.membershipVerified && !player.membershipDate);
    }
    sources[player.source] = (sources[player.source] || 0) + 1;
  }
  assert.equal(owners.size, ids.size);
  if (year === 2017) assert.equal(world.players.filter(p => /Iniesta/.test(p.name) && p.birthYear === 1984).length, 1);
  if (year === 2013) assert.equal(world.players.filter(p => p.clubId === 'real-madrid').length, 23);
  const careerPlayer = world.players.find(player => player.source === 'wikimedia-verified-career' && world.clubs.some(club => club.id === player.clubId && club.selectable !== false));
  const careerClub = careerPlayer && world.clubs.find(club => club.id === careerPlayer.clubId);
  years.push({ year, clubs: world.clubs.length, realPlayers: world.coverage.realPlayers, generatedPlayers: world.coverage.generatedPlayers, sources,
    ...(careerPlayer ? {careerExample:{year,club:careerClub.id,league:careerClub.competitionId,name:careerPlayer.name,playerId:careerPlayer.id}} : {}),
    clubCoverage:world.clubs.filter(c=>c.selectable!==false).map(c=>({id:c.id,leagueId:c.competitionId,real:c.rosterCoverage.realPlayers,generated:c.rosterCoverage.generatedPlayers,complete:c.rosterCoverage.complete})) });
}
await fs.mkdir(outputDirectory, { recursive: true });
await fs.writeFile(`${outputDirectory}/runtime-archive-audit.json`, JSON.stringify({ files, years, duplicateIdentities, checks: ['36 independent worlds', 'unique player IDs', 'consistent roster ownership', 'documented cutoff and licence', 'Iniesta identity and audited Madrid preserved', 'shared person identifiers reported across clubs'] }, null, 2));
assert.equal(duplicateIdentities.length, 0, 'One documented person must not appear as multiple players in the same world; see runtime-archive-audit.json');
console.log(JSON.stringify({ years: years.length, checkedPlayerSeasons: years.reduce((n,y) => n + y.realPlayers + y.generatedPlayers, 0), realPlayerSeasons: years.reduce((n,y) => n + y.realPlayers, 0),duplicateIdentities:duplicateIdentities.length }));
