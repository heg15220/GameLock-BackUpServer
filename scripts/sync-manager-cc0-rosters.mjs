#!/usr/bin/env node
/** Import additional CC0 lists. Cached revision inputs live in output/manager-v9/open-sources. */
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parsePlayerIdentities,createIdentityIndex,parseArchivedSquad,identityKey} from '../src/games/sports/manager/cc0-roster-parser.js';
import {resolveClubId} from '../src/games/sports/manager/providers.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),output=resolve(root,'output/manager-v9/open-sources');
const offline=process.argv.includes('--offline');
const digest=s=>createHash('sha256').update(s).digest('hex');
await mkdir(resolve(output,'cache'),{recursive:true});
async function get(url){
  const file=resolve(output,'cache',digest(url)+'.json');
  try{return JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  if(offline)throw new Error('Missing cached input '+url);
  const response=await fetch(url,{signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw new Error(`HTTP ${response.status}: ${url}`);
  const text=await response.text(),record={url,text,sha256:digest(text),fetchedAt:new Date().toISOString()};
  await writeFile(file,JSON.stringify(record));return record;
}
async function tree(repo){
  const file=resolve(output,`tree-${repo}.json`);
  try{return JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  const record=await get(`https://api.github.com/repos/openfootball/${repo}/git/trees/master?recursive=1`),data=JSON.parse(record.text);
  if(data.truncated||!/^[a-f0-9]{40}$/.test(data.sha))throw new Error('Incomplete repository tree');
  await writeFile(file,record.text);return data;
}
const world=JSON.parse(await readFile(resolve(root,'src/games/sports/trayectoria/world.data.json'),'utf8'));
const memberships=JSON.parse(await readFile(resolve(root,'src/games/sports/manager/league-memberships.json'),'utf8'));
const previous=JSON.parse(await readFile(resolve(root,'src/games/sports/manager/historical-rosters.json'),'utf8'));
const archive={schemaVersion:1,license:'CC0-1.0',generatedAt:null,sources:[],seasons:{},coverage:{},limitations:[
  'Season lists and tournament registrations are not a verified opening-day roster. Mid-season arrivals can occur in more than one club list.',
  'Only documented domestic participants are imported. Missing or ambiguous dated player identities are excluded; all lists may be partial.',
  'Wikidata is used only for exact, unique dated identities. Quarantined affiliations are never consumed.',
  'OpenFootball MLS age fields and statistics are not imported. No birth dates or performance ratings are inferred from them.'
]};
const rejected=[],unresolved=[],duplicates=[],identities=[],dates=[];
archive.sources.push({id:'wikidata-identity',url:'https://www.wikidata.org',license:'CC0-1.0',licenseUrl:'https://www.wikidata.org/wiki/Wikidata:Licensing',scope:'Dated player identities only; individual revisions are stored per player.'});
const sources={};
for(const repo of ['players','v0-format']){
  const data=await tree(repo),revision=data.sha;
  const license=await get(`https://raw.githubusercontent.com/openfootball/${repo}/${revision}/LICENSE.md`);
  if(!/^CC0 1\.0 Universal/.test(license.text))throw new Error('Unexpected source license');
  archive.sources.push({id:`openfootball-${repo}`,url:`https://github.com/openfootball/${repo}`,revision,license:'CC0-1.0',licenseUrl:license.url,licenseSha256:license.sha256});
  sources[repo]={tree:data.tree,revision};
}
const countryByIso=Object.fromEntries(Object.values(world.countries).map(c=>[c.iso2?.toLowerCase(),c.fifa]));
Object.assign(countryByIso,{eng:'ENG',sco:'SCO',wal:'WAL',nir:'NIR',xk:'KVX'});
for(const file of sources.players.tree.filter(f=>f.type==='blob'&&/\.players\.txt$/.test(f.path)&&!f.path.startsWith('attic/'))){
  const country=countryByIso[file.path.split('/').at(-1).split('.')[0]];
  if(!world.countries[country])continue;
  const record=await get(`https://raw.githubusercontent.com/openfootball/players/${sources.players.revision}/${file.path}`);dates.push(record.fetchedAt);
  identities.push(...parsePlayerIdentities(record.text,country,record.url));
}
for(const p of previous.historicalPlayers||[])if(p.birthDate&&p.wikidataId&&world.countries[p.nationality])identities.push({name:p.name,birthDate:p.birthDate,birthYear:p.birthYear,nationality:p.nationality,wikidataId:p.wikidataId,identitySource:`https://www.wikidata.org/wiki/${p.wikidataId}`});
try{const supplemental=JSON.parse(await readFile(resolve(root,'src/games/sports/manager/cc0-player-identities.json'),'utf8'));identities.push(...supplemental.players);}catch(error){if(error.code!=='ENOENT')throw error;}
const index=createIdentityIndex(identities);
const mls={chicago:'chicago-fire-fc',chivasusa:'cd-chivas-usa',colorado:'colorado-rapids',columbus:'columbus-crew',dallas:'fc-dallas',dcunited:'dc-united',galaxy:'los-angeles-galaxy',houston:'houston-dynamo',kansascity:'sporting-kansas-city',kcwizards:'sporting-kansas-city',newengland:'new-england-revolution',newyork:'new-york-rb',nymetro:'new-york-rb',saltlake:'real-salt-lake',sanjose:'san-jose-earthquakes',toronto:'toronto-fc',seattle:'seattle-sounders',philadelphia:'philadelphia-union',portland:'portland-timbers',vancouver:'vancouver-whitecaps',montreal:'cf-montreal'};
const champions={ajax:'ajax',anderlecht:'anderlecht',arsenal:'arsenal',athletic:'athletic-club',atletico:'atletico-madrid',barcelona:'barcelona',basel:'fc-basel-1893',bayern:'bayern-munchen',benfica:'benfica',chelsea:'chelsea',dortmund:'borussia-dortmund',galatasaray:'galatasaray',juventus:'juventus',leverkusen:'bayer-leverkusen',liverpool:'liverpool',madrid:'real-madrid',mancity:'manchester-city',monaco:'monaco',moskva:'cska-moscow',olympiacos:'olympiakos',paris:'paris-saint-germain',porto:'porto',roma:'as-roma',schalke:'fc-schalke-04',sporting:'sporting-lisboa',zenit:'zenit'};
const explicit={austria:'austria-wien',rapid:'rapid-wien',salzburg:'rb-salzburg',sturm:'sturm-graz',tsvmuenchen:'tsv-1860-munchen',fsvfrankfurt:'fsv-frankfurt',hoffenheim:'1899-hoffenheim',leipzig:'rb-leipzig'};
for(const file of sources['v0-format'].tree.filter(f=>f.type==='blob'&&/^(austria|deutschland|champions-league|major-league-soccer)\/(\d{4}(?:-\d{2})?)\/squads\/.+\.txt$/.test(f.path))){
  const [region,season,,filename]=file.path.split('/'),year=Number(season.slice(0,4)),stem=filename.replace(/(?:-\d{4})?\.txt$/,'');
  const record=await get(`https://raw.githubusercontent.com/openfootball/v0-format/${sources['v0-format'].revision}/${file.path}`);dates.push(record.fetchedAt);
  const name=record.text.split(/\r?\n/).find(line=>/^#\s+[^#]/.test(line))?.replace(/^#\s+/,'').replace(/\s+(?:2014\/15|2014\/2015).*$/,'').split(/\s+\/\s+/)[0].trim();
  const known=Object.fromEntries(Object.values(memberships.seasons[year]||{}).flatMap(c=>c.teams.map(t=>[t.clubId,{...t,id:t.clubId}])));
  const clubId=region==='major-league-soccer'?mls[stem]:region==='champions-league'?champions[stem]:explicit[stem]||resolveClubId(name,known);
  const league=Object.entries(memberships.seasons[year]||{}).find(([,c])=>c.teams.some(t=>t.clubId===clubId));
  if(!league){rejected.push({path:file.path,clubId,name,reason:'no-documented-domestic-participant'});continue;}
  const country=region==='austria'?'AUT':region==='deutschland'?'GER':undefined;
  const parsed=parseArchivedSquad(record.text,{format:region==='major-league-soccer'?'mls':region==='champions-league'?'sections':'rows',country,identities:index,year,clubId,source:record.url});
  const seen=new Set();
  const players=parsed.players.filter(p=>{
    if(!world.countries[p.nationality])return false;
    const key=identityKey(p.name)+'|'+p.birthDate;
    if(seen.has(key)){duplicates.push({path:file.path,name:p.name,birthDate:p.birthDate});return false;}
    seen.add(key);return true;
  });
  unresolved.push(...parsed.unresolved.map(p=>({year,clubId,...p})));
  if(players.length<11||!players.some(p=>p.position==='GK')){rejected.push({path:file.path,clubId,players:players.length,reason:'fewer-than-eleven-dated-players-or-no-goalkeeper'});continue;}
  const roster={name:known[clubId].name,competitionId:league[0],season,precision:'season',sourceId:'openfootball-v0-format',source:record.url,sourceSha256:record.sha256,revision:sources['v0-format'].revision,fetchedAt:record.fetchedAt,license:'CC0-1.0',players};
  archive.seasons[year]??={};
  const old=archive.seasons[year][clubId];
  if(!old||old.players.length<players.length)archive.seasons[year][clubId]=roster;
}
archive.generatedAt=dates.sort().at(-1);
const lists=Object.values(archive.seasons).flatMap(Object.values);
archive.coverage={clubSeasons:lists.length,playerSeasonRows:lists.reduce((n,r)=>n+r.players.length,0),competitionCount:new Set(lists.map(r=>r.competitionId)).size,years:Object.keys(archive.seasons).map(Number),identityRecords:identities.length,unresolvedRows:unresolved.length,rejectedLists:rejected.length};
for(const folder of ['src/games/sports/manager','public/data/football-manager']){const target=resolve(root,folder,'cc0-season-rosters.json');await writeFile(target+'.tmp',JSON.stringify(archive)+'\n');await rename(target+'.tmp',target);}
await writeFile(resolve(output,'cc0-roster-audit.json'),JSON.stringify({coverage:archive.coverage,byYear:Object.fromEntries(Object.entries(archive.seasons).map(([year,clubs])=>[year,{clubs:Object.keys(clubs).length,players:Object.values(clubs).reduce((n,c)=>n+c.players.length,0)}])),rejected,unresolved,duplicates},null,2));
console.log(JSON.stringify(archive.coverage));
