#!/usr/bin/env node
/** Rebuild public CC0 rosters. No key. node scripts/sync-manager-rosters.mjs [--offline] [--refresh] */
import { createHash } from 'node:crypto';
import { mkdir,readFile,writeFile,rename } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveClubId } from '../src/games/sports/manager/providers.js';
import { parseOpenFootballSquad,parseLegacyOpenFootballSquad,historicalRosterQuery,extractHistoricalRoster,WIKIDATA_CLUBS,auditHistoricalMemberships,MEMBERSHIP_AUDIT_IDS } from '../src/games/sports/manager/roster-providers.js';
import { rosterSnapshots,careerSeeds } from '../src/games/sports/manager/rosters.js';
import { editorialRosters } from '../src/games/sports/manager/editorial-rosters.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),cachedOnly=args.includes('--cached-only'),offline=args.includes('--offline')||cachedOnly,refresh=args.includes('--refresh');
if(args.some(a=>!['--offline','--refresh','--cached-only','--audit-only'].includes(a))||offline&&refresh)throw new Error('Unsupported options');
const world=JSON.parse(await readFile(resolve(root,'src/games/sports/trayectoria/world.data.json'),'utf8'));
const cache=resolve(root,'.cache/football-manager-rosters');await mkdir(cache,{recursive:true});
await writeFile(resolve(cache,'.gitignore'),'*\n');
const digest=text=>createHash('sha256').update(text).digest('hex');
async function get(url) {
  const path=resolve(cache,digest(url)+'.json');
  if(!refresh)try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  if(offline){const error=new Error('Missing cached source '+url);error.code='CACHE_MISS';throw error;}
  let response;
  for(let attempt=0;attempt<3;attempt++){
    try { response=await fetch(url,{signal:AbortSignal.timeout(55000),headers:{'User-Agent':'GameLock-Football-Manager/2.0 (CC0 historical research)','Accept':'application/json'}}); }
    catch(error){if(attempt===2)throw error;await new Promise(done=>setTimeout(done,1500));continue;}
    if(response.ok)break;
    if(response.status!==429&&response.status<500)throw new Error(`HTTP ${response.status}: ${url}`);
    await new Promise(done=>setTimeout(done,1200*(attempt+1)));
  }
  if(!response.ok)throw new Error('Source unavailable; existing snapshot preserved: '+url);
  const text=await response.text();if(text.length>12_000_000)throw new Error('Source too large');
  const record={url,fetchedAt:new Date().toISOString(),sha256:digest(text),text};
  await writeFile(path,JSON.stringify(record));return record;
}
async function auditAndPublish(snapshot){
  const url=`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${MEMBERSHIP_AUDIT_IDS.join('|')}&props=claims|labels|info&languages=es|en&format=json`;
  const record=await get(url),entities=JSON.parse(record.text).entities;
  if(!entities||MEMBERSHIP_AUDIT_IDS.some(id=>!entities[id]?.claims?.P54))throw new Error('Incomplete membership audit; existing snapshot preserved');
  const audit=auditHistoricalMemberships(snapshot,entities,record);
  snapshot.limitations=[...(snapshot.limitations??[]).filter(text=>!text.startsWith('Wikidata memberships preserve')), 'Wikidata identities do not verify team membership. All unreviewed P54 claims are quarantined; only independently checked source facts may assign a club.','Open or overlapping intervals and moves to clubs outside the playable catalogue cannot establish continuous membership.'];
  snapshot.limitations=[...new Set(snapshot.limitations)];
  snapshot.generatedAt=[snapshot.generatedAt,record.fetchedAt].filter(Boolean).sort().at(-1);
  for(const folder of ['src/games/sports/manager','public/data/football-manager']){
    const target=resolve(root,folder,'historical-rosters.json');
    await mkdir(dirname(target),{recursive:true});await writeFile(target+'.tmp',JSON.stringify(snapshot)+'\n');await rename(target+'.tmp',target);
  }
  console.log(JSON.stringify(audit));
}
if(args.includes('--audit-only')){
  const snapshot=JSON.parse(await readFile(resolve(root,'src/games/sports/manager/historical-rosters.json'),'utf8'));
  await auditAndPublish(snapshot);
  process.exit(0);
}
const repos=[['england','ENG','premier-league'],['espana','ESP','laliga'],['deutschland','GER','bundesliga'],['italy','ITA','serie-a'],['austria','AUT','austria-bundesliga']];
const result={schemaVersion:1,license:'CC0-1.0',generatedAt:null,seasons:{2023:{}},historicalPlayers:[],historicalSources:[],missingHistoricalClubs:[],revisions:{},limitations:['OpenFootball club lists describe the 2023/24 season and may include winter transfers and youth registration; they do not certify a September 1 cutoff.','Wikidata memberships preserve original date precision; incomplete or overlapping intervals are not accepted as a definite club.','Ratings, potential, budgets and player values are game estimates, never supplied by the sources.']};
const dates=[];
const legacySquads=[];
for(const [repo,country,competitionId] of repos){
  const tree=JSON.parse((await get(`https://api.github.com/repos/openfootball/${repo}/git/trees/master?recursive=1`)).text);
  if(!/^[a-f0-9]{40}$/.test(tree.sha))throw new Error('Missing source revision');
  const revision=tree.sha;result.revisions[repo]=revision;
  const license=await get(`https://raw.githubusercontent.com/openfootball/${repo}/${revision}/LICENSE.md`);
  if(!/CC0|public domain/i.test(license.text))throw new Error('Unexpected source licence');
  for(const file of tree.tree.filter(f=>/^2023-24\/squads\/.+\.txt$/.test(f.path))){
    const record=await get(`https://raw.githubusercontent.com/openfootball/${repo}/${revision}/${file.path}`);dates.push(record.fetchedAt);
    const name=record.text.split(/\r?\n/).find(line=>/^=\s+[^=]/.test(line))?.replace(/^=\s+/,'').split(/\s+-\s+/)[0].trim();
    if(!name)throw new Error('Missing club heading '+file.path);
    const clubId=resolveClubId(name,world.clubs),players=parseOpenFootballSquad(record.text,country);
    if(players.length<15||players.some(p=>p.birthYear<1960||p.birthYear>2010))throw new Error('Invalid squad '+file.path);
    result.seasons[2023][clubId]={name,competitionId,source:record.url,sourceSha256:record.sha256,fetchedAt:record.fetchedAt,license:'CC0-1.0',precision:'season',season:'2023/24',players};
  }
  for(const file of tree.tree.filter(f=>/^2014-15\/squads\/.+\.txt$/.test(f.path))){
    const record=await get(`https://raw.githubusercontent.com/openfootball/${repo}/${revision}/${file.path}`);dates.push(record.fetchedAt);
    const name=record.text.split(/\r?\n/).find(line=>/^#\s+[^#].+2014\/15/.test(line))?.replace(/^#\s+/,'').replace(/\s+2014\/15.*$/,'').trim();
    if(!name)throw new Error('Missing legacy club heading '+file.path);
    legacySquads.push({clubId:resolveClubId(name,world.clubs),name,country,competitionId,record});
  }
  console.log(`${repo}: imported season squads`);
}
const byId=new Map();
for(const [entity,clubId] of Object.entries(WIKIDATA_CLUBS)){
  const query=historicalRosterQuery(entity);
  let record;
  try {record=await get('https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(query));}
  catch(error){if(!cachedOnly||error.code!=='CACHE_MISS')throw error;result.missingHistoricalClubs.push(clubId);continue;}
  dates.push(record.fetchedAt);
  const payload=JSON.parse(record.text);if(!payload.results?.bindings)throw new Error('Invalid query response');
  const players=extractHistoricalRoster(payload.results.bindings,clubId,world.countries);
  if(players.length<15)throw new Error(`Unusable historical roster ${clubId}: ${players.length}`);
  result.historicalSources.push({clubId,teamWikidataId:entity,source:record.url,sourceSha256:record.sha256,fetchedAt:record.fetchedAt,license:'CC0-1.0',players:players.length});
  for(const p of players){const existing=byId.get(p.wikidataId);if(existing)existing.memberships.push(...p.memberships);else byId.set(p.wikidataId,p);}
  console.log(`${clubId}: ${players.length} historical identities`);
}
result.historicalPlayers=[...byId.values()].sort((a,b)=>a.wikidataId.localeCompare(b.wikidataId));
// Some Wikidata P54 statements name a multi-sport parent club instead of its
// women's section. Only explicitly male identities enter this men's catalogue.
const genderQuery=`SELECT DISTINCT ?p WHERE { VALUES ?club { ${Object.keys(WIKIDATA_CLUBS).map(id=>'wd:'+id).join(' ')} } ?p wdt:P54 ?club; wdt:P21 wd:Q6581097. }`;
const genderRecord=await get('https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(genderQuery));
const maleIds=new Set(JSON.parse(genderRecord.text).results?.bindings?.map(row=>row.p.value.split('/').at(-1))??[]);
if(maleIds.size<5000)throw new Error('Insufficient verified male football identities; preserve existing snapshot');
result.demographicSource={source:genderRecord.url,sourceSha256:genderRecord.sha256,fetchedAt:genderRecord.fetchedAt,filter:'P21=Q6581097; position belongs to association football goalkeeper/defender/midfielder/forward classes'};
result.historicalPlayers=result.historicalPlayers.filter(p=>maleIds.has(p.wikidataId));
for(const p of result.historicalPlayers)p.gender='male';
dates.push(genderRecord.fetchedAt);
result.nationalitySources=[];
const british=result.historicalPlayers.filter(p=>p.nationality==='GBR');
const sportingNations={Q21:'ENG',Q22:'SCO',Q25:'WAL',Q26:'NIR',Q27:'IRL',Q47762:'ENG',Q34044:'SCO',Q180857:'WAL',Q190978:'NIR',Q163547:'IRL'};
for(let i=0;i<british.length;i+=150){
  const batch=british.slice(i,i+150);
  const query=`SELECT ?p ?nation WHERE { VALUES ?p { ${batch.map(p=>'wd:'+p.wikidataId).join(' ')} } VALUES ?nation { ${Object.keys(sportingNations).map(id=>'wd:'+id).join(' ')} } ?p (wdt:P1532|wdt:P54) ?nation. }`;
  let record;
  try{record=await get('https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(query));}
  catch(error){if(cachedOnly&&error.code==='CACHE_MISS')continue;throw error;}
  const rows=JSON.parse(record.text).results?.bindings;
  if(!rows)throw new Error('Invalid sporting nationality source');
  const nations=new Map();
  for(const row of rows){const id=row.p?.value.split('/').at(-1),nationality=sportingNations[row.nation?.value.split('/').at(-1)];if(nationality){if(!nations.has(id))nations.set(id,new Set());nations.get(id).add(nationality);}}
  for(const [id,choices] of nations)if(choices.size===1)byId.get(id).nationality=[...choices][0];
  result.nationalitySources.push({source:record.url,sourceSha256:record.sha256,fetchedAt:record.fetchedAt});dates.push(record.fetchedAt);
}
result.generatedAt=dates.sort().at(-1);
if(legacySquads.length){
  const identityCatalog=[...result.historicalPlayers];
  for(const [year,clubs] of Object.entries(rosterSnapshots))for(const [clubId,text] of Object.entries(clubs)){
    for(const line of text.split('\n')){
      const [name,birth,nationality]=line.split('|');
      const birthYear=Number(birth?.slice(0,4));
      if(!name||!Number.isInteger(birthYear))continue;
      identityCatalog.push({name,birthYear,birthDate:/^\d{4}-\d{2}-\d{2}$/.test(birth)?birth:null,nationality,identitySource:editorialRosters[year]?.[clubId]?.sourceUrl??`src/games/sports/manager/rosters.js#${year}/${clubId}`});
    }
  }
  for(const [name,birthYear,nationality] of careerSeeds)identityCatalog.push({name,birthYear,nationality,identitySource:'src/games/sports/manager/rosters.js#careerSeeds'});
  result.seasons[2014]={};
  for(const {clubId,name,country,competitionId,record} of legacySquads){
    const parsed=parseLegacyOpenFootballSquad(record.text,country,identityCatalog);
    if(parsed.players.length<15)throw new Error(`Legacy squad has insufficient identified players: ${clubId} (${parsed.players.length})`);
    result.seasons[2014][clubId]={name,competitionId,source:record.url,sourceSha256:record.sha256,fetchedAt:record.fetchedAt,license:'CC0-1.0',precision:'season',season:'2014/15',...parsed};
  }
}
await auditAndPublish(result);
console.log(`Published ${Object.values(result.seasons).reduce((sum,clubs)=>sum+Object.keys(clubs).length,0)} season squads, ${Object.values(result.seasons).flatMap(clubs=>Object.values(clubs)).reduce((sum,club)=>sum+club.players.length,0)} roster rows and ${result.historicalPlayers.length} quarantined historical identities.`);
