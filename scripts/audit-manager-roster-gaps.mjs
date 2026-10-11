/** Read-only audit: execute just the real-player import stages, never generate a world.
 * Source-list counts are deliberately separate from accepted players and complete squads.
 * The instrumentation uses the current product functions and fails if guards change.
 */
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const directory = process.argv[2] || 'output/manager-v11/audit';
await fs.mkdir(directory, { recursive: true });
const folder = 'src/games/sports/manager/';
const read = name => fs.readFile(folder + name, 'utf8');
const files = {};
async function json(name) { const raw = await read(name + '.json'); files[name] = createHash('sha256').update(raw).digest('hex'); return JSON.parse(raw); }
const [historical, wikimedia, cc0, research, memberships, playerMemberships, multilingual, verifiedCareers] = await Promise.all(['historical-rosters', 'wikimedia-rosters', 'cc0-season-rosters', 'research-season-rosters', 'league-memberships', 'player-memberships', 'multilingual-season-rosters', 'verified-player-careers'].map(json));
const world = JSON.parse(await fs.readFile('src/games/sports/trayectoria/world.data.json', 'utf8'));
const moduleFrom = source => import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const editorial = await moduleFrom(await read('editorial-rosters.js'));
const rosters = await moduleFrom((await read('rosters.js')).replace("import { editorialRosters } from './editorial-rosters.js';", `const editorialRosters = ${JSON.stringify(editorial.editorialRosters)};`));
const providers = await moduleFrom('const managerCompetitionExtensions=[];\n' + (await read('providers.js')).replace(/^import .*;\r?\n/gm, ''));
const reconciliation = await moduleFrom(await read('player-identity-reconciliation.js'));
const archiveCode = (await read('season-roster-archive.js')).replace(/^import .*;\r?\n/gm, '').replace(/^export \{.*\} from .*;\r?\n/gm,'').replaceAll('export ', '');
const careerCode = (await read('verified-career-provider.js')).replace(/^import .*;\r?\n/gm, '').replaceAll('export ', '');
const { isPublishableCareerStint } = await moduleFrom(await read('career-affiliation.js'));
const getVerifiedCareerRecords = new Function('archive', 'isPublishableCareerStint', `${careerCode}\nreturn getVerifiedCareerRecords;`)(verifiedCareers, isPublishableCareerStint);
const archive = {...reconciliation,...new Function('historical', 'wikimedia', 'cc0', 'research', 'multilingual', 'getVerifiedCareerRecords', `${archiveCode}\nreturn {getSeasonRosterArchive,getSeasonRosterRecords};`)(historical, wikimedia, cc0, research, multilingual, getVerifiedCareerRecords)};
const dataCode = await read('data.js');
files.data = createHash('sha256').update(dataCode).digest('hex');
let instrumented = dataCode.slice(dataCode.indexOf('const FIRST_YEAR'), dataCode.indexOf('const FIRST_NAMES')).replaceAll('export ', '');
const replaceGuard = (before, after) => { if (!instrumented.includes(before)) throw Error('Audit guard changed: ' + before); instrumented = instrumented.replace(before, after); };
replaceGuard('if(editorialRosters[year]?.[clubId]?.complete)return;', "if(editorialRosters[year]?.[clubId]?.complete){auditEvents.push({clubId,name:row.name,source,reason:'authoritative-editorial-squad'});return;}");
replaceGuard('if(linkedPlayerIdentities(row).some(key=>linkedExisting.has(key)))return;', "if(linkedPlayerIdentities(row).some(key=>linkedExisting.has(key))){auditEvents.push({clubId,name:row.name,source,reason:'existing-linked-identity'});return;}");
replaceGuard('if(!club||age<16||age>65||existingPerson(row)||samePerson(row))return;', `if(!club||age<16||age>65||existingPerson(row)||samePerson(row)){
  auditEvents.push({clubId,name:row.name,birthYear:row.birthYear,source,reason:!club?'club-unavailable':age<16||age>65?'age-range':existingPerson(row)?'existing-canonical-identity':'token-subset-identity',
    ...(existingPerson(row)?{existingClubId:players.find(p=>identity(p)===key&&identitiesCompatible(row,p))?.clubId}:{} )}); return; }`);
replaceGuard('if(ids.has(player.id))return;', "if(ids.has(player.id)){auditEvents.push({clubId,name:row.name,source,reason:'player-id-collision'});return;}");
const auditEvents = [];
const runtime = new Function('rosterSnapshots','careerSeeds','editorialRosters','editorialSeasonEvidence','playerIdentity','unambiguousSeasonPlayers','getSeasonRosterRecords','historicalRosters','playerClubAtDate','auditEvents','linkedPlayerIdentities','identitiesCompatible', `${instrumented}\nreturn {readCuratedPlayers,addImportedPlayers,identity,slug,ESTABLISHED,getManagerSnapshotDate};`)(rosters.rosterSnapshots,rosters.careerSeeds,editorial.editorialRosters,editorial.editorialSeasonEvidence,(name,birth)=>`${providers.normalizeClubName(name)}:${birth}`,archive.unambiguousSeasonPlayers,archive.getSeasonRosterRecords,historical,providers.playerClubAtDate,auditEvents,archive.linkedPlayerIdentities,archive.identitiesCompatible);
const sources = { multilingual, wikimedia, research, cc0, historical };
const rows = [], seasons = [], conflicts = [], temporalResolutions = [], absentClubLists = [], metadataMasked = [];
const sourceCounts = {}, allParticipantIds = new Set(Object.values(memberships.seasons).flatMap(leagues=>Object.values(leagues).flatMap(l=>l.teams.map(c=>c.clubId))));
for (const [source, data] of Object.entries(sources)) sourceCounts[source] = { lists: Object.values(data.seasons||{}).reduce((n,s)=>n+Object.keys(s).length,0), rows: Object.values(data.seasons||{}).reduce((n,s)=>n+Object.values(s).reduce((m,r)=>m+r.players.length,0),0) };
for (let year=1990; year<=2025; year++) {
  const leagues = memberships.seasons[year] || {};
  const participants = Object.values(leagues).flatMap(l=>l.teams), memberIds = new Set(participants.map(c=>c.clubId));
  const background = new Set([...getVerifiedCareerRecords(year).map(([club])=>club), ...Object.keys(rosters.rosterSnapshots[year]||{}), ...Object.keys(archive.getSeasonRosterArchive(year)), ...Object.keys(editorial.editorialRosters[year]||{}), ...rosters.careerSeeds.flatMap(([,birth,,,,,segments])=>year-birth>=16?segments.filter(([a,b])=>year>=a&&year<=b).map(([, ,id])=>id):[])]);
  const clubIds = new Set([...memberIds,...Object.keys(world.clubs).filter(id=>background.has(id)&&year>=(runtime.ESTABLISHED[id]||0))]);
  const clubMap = new Map([...clubIds].map(id=>[id,{id,rating:70}]));
  const allSourceRecords = Object.entries(sources).flatMap(([source,data])=>Object.entries(data.seasons?.[year]||{}).map(([clubId,record])=>({source,clubId,record})));
  const retainedRecords = archive.getSeasonRosterRecords(year);
  const retainedRefs = new Set(retainedRecords.map(([,record])=>record));
  const identityGroups=archive.reconcileSeasonPlayerGroups(retainedRecords,runtime.identity);
  const candidates=identityGroups.filter(group=>!group.reason).map(group=>group.row);
  const rejectedGroups=identityGroups.filter(group=>group.reason);
  for(const group of identityGroups.filter(group=>group.resolution))temporalResolutions.push({year,name:group.row.name,...group.resolution,source:group.row.record.source});
  const excluded=rejectedGroups.map(group=>group.rows);
  for(const group of rejectedGroups) conflicts.push({year,reason:group.reason,players:group.rows.map(r=>({clubId:r.clubId,name:r.name,birthYear:r.birthYear,wikidataId:r.wikidataId,identityPageId:r.identityPageId,source:r.record.source}))});
  const players = runtime.readCuratedPlayers(year,clubIds), initial=players.map(p=>({...p}));
  const start=auditEvents.length;
  runtime.addImportedPlayers(players,clubMap,year);
  for(const player of players) {
    const evidence=playerMemberships.players.find(p=>runtime.slug(p.name)===player.id);
    if(evidence){player.birthDate??=evidence.birthDate;if(player.birthDate)player.birthYear=Number(player.birthDate.slice(0,4));const club=providers.playerClubAtDate(evidence,runtime.getManagerSnapshotDate(year));if(club&&clubMap.has(club)&&!player.membershipVerified)player.clubId=club;}
  }
  const date=runtime.getManagerSnapshotDate(year);
  const accepted=players.filter(p=>p.birthDate?Number(date.slice(0,4))-p.birthYear-(date.slice(5)<p.birthDate.slice(5)?1:0)>=16:year-p.birthYear>=16);
  const events=auditEvents.slice(start).map(event=>({year,...event}));
  for(const item of allSourceRecords) {
    if(!clubIds.has(item.clubId)) absentClubLists.push({year,source:item.source,clubId:item.clubId,name:item.record.name,competitionId:item.record.competitionId,rows:item.record.players.length,knownAnySeason:allParticipantIds.has(item.clubId)});
    if(archive.getSeasonRosterArchive(year)[item.clubId]!==item.record)metadataMasked.push({year,source:item.source,clubId:item.clubId,rows:item.record.players.length,runtimeRetained:retainedRefs.has(item.record)});
  }
  for(const [leagueId,league] of Object.entries(leagues))for(const club of league.teams){
    const lists=allSourceRecords.filter(r=>r.clubId===club.clubId), sourceRows=lists.reduce((n,r)=>n+r.record.players.length,0), own=accepted.filter(p=>p.clubId===club.clubId), curated=initial.filter(p=>p.clubId===club.clubId);
    const rejected=(wikimedia.rejected||[]).filter(r=>r.year===year&&r.id===club.clubId);
    rows.push({year,leagueId,clubId:club.clubId,name:club.name,sourceLists:lists.map(r=>({source:r.source,rows:r.record.players.length,url:r.record.source})),sourceRows,
      researchSuppressedRows:lists.filter(r=>!retainedRefs.has(r.record)).reduce((n,r)=>n+r.record.players.length,0),
      conflictRows:excluded.reduce((n,g)=>n+g.filter(r=>r.clubId===club.clubId).length,0),
      candidatePlayers:candidates.filter(r=>r.clubId===club.clubId).length,curatedPlayers:curated.length,realPlayers:own.length,
      addStageRejections:events.filter(e=>e.clubId===club.clubId),sourceImportRejections:rejected,
      status:own.length?'has-real-players':sourceRows?'all-source-rows-excluded':'no-source-list-or-curated-player'});
  }
  seasons.push({year,clubs:clubIds.size,realPlayers:accepted.length,sourceRows:allSourceRecords.reduce((n,r)=>n+r.record.players.length,0),candidatePlayers:candidates.length,conflictGroups:excluded.length,conflictRows:excluded.reduce((n,g)=>n+g.length,0),addStageRejections:events.length});
}
const byLeague={};
for(const row of rows){const entry=byLeague[row.leagueId]??={clubSeasons:0,withLists:0,zeroReal:0,zeroRealWithoutLists:0,zeroRealDespiteLists:0,realPlayers:0,sourceRows:0,conflictRows:0,researchSuppressedRows:0,rejectionReasons:{}};entry.clubSeasons++;entry.withLists+=Number(row.sourceLists.length>0);entry.zeroReal+=Number(!row.realPlayers);entry.zeroRealWithoutLists+=Number(!row.realPlayers&&!row.sourceRows);entry.zeroRealDespiteLists+=Number(!row.realPlayers&&row.sourceRows>0);for(const key of ['realPlayers','sourceRows','conflictRows','researchSuppressedRows'])entry[key]+=row[key];for(const e of row.addStageRejections)entry.rejectionReasons[e.reason]=(entry.rejectionReasons[e.reason]||0)+1;}
const summary={participantClubSeasons:rows.length,withAnySourceList:rows.filter(r=>r.sourceLists.length).length,zeroReal:rows.filter(r=>!r.realPlayers).length,zeroRealWithoutSource:rows.filter(r=>!r.realPlayers&&!r.sourceRows).length,zeroRealWithSource:rows.filter(r=>!r.realPlayers&&r.sourceRows).length,sourceCounts,quarantinedMemberships:historical.membershipAudit,absentClubLists:absentClubLists.length,metadataMaskedLists:metadataMasked.length,conflictGroups:conflicts.length};
const baselinePath=process.argv[3]||'output/manager-v11/runtime-archive-audit.json';
const prior=JSON.parse(await fs.readFile(baselinePath,'utf8'));
const comparison=seasons.map(s=>({year:s.year,realPlayers:s.realPlayers,previousWorld:prior.years.find(y=>y.year===s.year)?.realPlayers,delta:s.realPlayers-(prior.years.find(y=>y.year===s.year)?.realPlayers||0)}));
await fs.writeFile(`${directory}/roster-gaps.json`,JSON.stringify({generatedAt:new Date().toISOString(),method:'Real-player import stages only; dummy club ratings do not affect identity or acceptance. No procedural squads or simulation worlds generated.',files,summary,byLeague,seasons,comparison,rows,conflicts,temporalResolutions,absentClubLists,metadataMasked},null,2)+'\n');
console.log(JSON.stringify({summary:{...summary,quarantinedMemberships:summary.quarantinedMemberships?.quarantinedMemberships},comparisonDifferences:comparison.filter(r=>r.delta)},null,2));
