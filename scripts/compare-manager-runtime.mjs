import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const [beforePath='output/manager-v11/audit-after/roster-gaps.json',afterPath='output/manager-v12/runtime-archive-audit.json',outputPath='output/manager-v12/runtime-comparison.json']=process.argv.slice(2);
const before=JSON.parse(await fs.readFile(beforePath,'utf8'));
const after=JSON.parse(await fs.readFile(afterPath,'utf8'));
const key=r=>`${r.year}:${r.leagueId}:${r.clubId}`;
const old=new Map(before.rows.map(row=>[key(row),row]));
const rows=after.years.flatMap(year=>year.clubCoverage.map(club=>({year:year.year,leagueId:club.leagueId,clubId:club.id,realPlayers:club.real,generatedPlayers:club.generated,complete:club.complete})));
assert.equal(rows.length,old.size,'Compare the same participant club-seasons');
const addedCoverage=[],decreases=[],byLeague=new Map();
let beforeReal=0,afterReal=0;
for(const row of rows){
  const prior=old.get(key(row));assert.ok(prior,`Unknown comparison club-season ${key(row)}`);
  beforeReal+=prior.realPlayers;afterReal+=row.realPlayers;
  if(!prior.realPlayers&&row.realPlayers)addedCoverage.push(row);
  if(row.realPlayers<prior.realPlayers)decreases.push({...row,before:prior.realPlayers,delta:row.realPlayers-prior.realPlayers});
  const league=byLeague.get(row.leagueId)||{leagueId:row.leagueId,clubSeasons:0,beforeReal:0,afterReal:0,beforeEmpty:0,afterEmpty:0,withoutGenerated:0};
  league.clubSeasons++;league.beforeReal+=prior.realPlayers;league.afterReal+=row.realPlayers;
  league.beforeEmpty+=Number(!prior.realPlayers);league.afterEmpty+=Number(!row.realPlayers);
  league.withoutGenerated+=Number(!row.generatedPlayers);byLeague.set(row.leagueId,league);
}
const summary={participantClubSeasons:rows.length,beforeRealPlayerSeasons:beforeReal,afterRealPlayerSeasons:afterReal,addedRealPlayerSeasons:afterReal-beforeReal,
  beforeEmpty:before.rows.filter(row=>!row.realPlayers).length,afterEmpty:rows.filter(row=>!row.realPlayers).length,
  newlyDocumentedClubSeasons:addedCoverage.length,clubSeasonsWithoutGenerated:rows.filter(row=>!row.generatedPlayers).length,
  completeAuditedSnapshots:rows.filter(row=>row.complete).length,clubSeasonsWithFewerRealPlayers:decreases.length};
await fs.writeFile(outputPath,JSON.stringify({summary,byLeague:[...byLeague.values()],addedCoverage,decreases,rows,
  note:'Counts refer to simulated starting squads for documented domestic participants. Zero generated players does not certify the complete historical registration list. Decreases need review: new contradictory evidence can legitimately quarantine a previous affiliation.'},null,2)+'\n');
console.log(JSON.stringify(summary));
