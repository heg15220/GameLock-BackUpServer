#!/usr/bin/env node
/** Offline reconstruction of partial career evidence, never a complete squad.
 * node scripts/sync-manager-verified-careers.mjs [--dry-run] [--cache=path]
 */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {careerArticleKey,parseWikiSeniorCareer,unambiguousCareerClub} from './lib/wiki-career-parser.mjs';
import {validateCareerMetadata} from './lib/career-metadata.mjs';
import {isPublishableCareerStint} from '../src/games/sports/manager/career-affiliation.js';
const option=(name,fallback)=>process.argv.find(arg=>arg.startsWith(`--${name}=`))?.slice(name.length+3)||fallback;
const cache=option('cache','output/manager-v8/wikimedia-cache'),output=option('output','output/manager-v12/careers');
const dry=process.argv.includes('--dry-run'),digest=text=>createHash('sha256').update(text).digest('hex');
await fs.mkdir(output,{recursive:true});
const folder='src/games/sports/manager',snapshots={};
const load=async name=>{const text=await fs.readFile(`${folder}/${name}.json`,'utf8');snapshots[name]=digest(text);return JSON.parse(text);};
const [rosters,memberships,historical]=await Promise.all(['wikimedia-rosters','league-memberships','historical-rosters'].map(load));
const catalogue=new Map(),aliasChoices=new Map(),clubYears=new Map();
const alias=(title,id)=>{if(!title)return;const key=careerArticleKey(title);if(!aliasChoices.has(key))aliasChoices.set(key,new Set());aliasChoices.get(key).add(id);};
for(const [year,leagues] of Object.entries(memberships.seasons))for(const league of Object.values(leagues))for(const team of league.teams){
  alias(team.article,team.clubId);if(!clubYears.has(Number(year)))clubYears.set(Number(year),new Set());clubYears.get(Number(year)).add(team.clubId);
}
// Reuse the maintained explicit English Wikipedia article aliases, not fuzzy
// display-name matching. Evaluate only that literal map, never the importer.
const importer=await fs.readFile('scripts/sync-manager-wikimedia-rosters.mjs','utf8');
const aliasCode=importer.slice(importer.indexOf('const clubs = {'),importer.indexOf('const yearArgument'));
if(!aliasCode.startsWith('const clubs = {')||!aliasCode.includes('Object.assign'))throw Error('Club alias schema changed');
for(const [id,title] of Object.entries(new Function(`${aliasCode};return clubs;`)()))if([...clubYears.values()].some(ids=>ids.has(id)))alias(title,id);
// Explicit article identities absent from the season-page importer's smaller
// alias catalogue. Alternatives are resolved only against that year's actual
// participant IDs; a title with two simultaneous candidates remains unknown.
for(const [title,ids] of Object.entries({
  'Birmingham City F.C.':['birmingham'],'Derby County F.C.':['derby'],'Charlton Athletic F.C.':['charlton'],
  'Bolton Wanderers F.C.':['bolton'],'Ipswich Town F.C.':['ipswich'],'Blackburn Rovers F.C.':['blackburn'],
  'Coventry City F.C.':['coventry'],'Rotherham United F.C.':['rotherham-united','rotherham-united-fc'],
  'Preston North End F.C.':['preston','preston-north-end-fc','preston-north-end'],'Millwall F.C.':['millwall'],
  'Barnsley F.C.':['barnsley','barnsley-fc'],'Cardiff City F.C.':['cardiff'],'Cruzeiro Esporte Clube':['cruzeiro'],
  'Galatasaray S.K. (football)':['galatasaray'],'Fenerbahçe S.K. (football)':['fenerbahce'],
  // Explicit orthographic/registered-name aliases, never fuzzy matching.
  // Evidence: output/manager-v12/careers/career-club-alias-evidence.json.
  'Paris Saint-Germain FC':['paris-saint-germain'],'A.C. Milan':['ac-milan'],
  'S.S.C. Napoli':['napoli'],'U.C. Sampdoria':['sampdoria'],'A.S. Roma':['as-roma'],
  'S.S. Lazio':['lazio'],'U.S. Lecce':['lecce'],'SE Palmeiras':['palmeiras'],
  'CR Flamengo':['flamengo'],'Genoa C.F.C.':['genoa'],'Genoa C.F.C':['genoa'],
  'Bologna F.C. 1909':['bologna'],'Atalanta B.C.':['atalanta'],'Empoli F.C.':['empoli'],
  'A.C. Siena':['siena'],'A.S. Livorno Calcio':['livorno'],'Juventus F.C.':['juventus'],
  'AS Monaco':['monaco'],
}))for(const id of ids)alias(title,id);
const resolveClub=(title,year)=>{const ids=[...(aliasChoices.get(careerArticleKey(title))||[])].filter(id=>year===undefined||clubYears.get(year)?.has(id));return ids.length===1?ids[0]:null;};
for(const [year,clubs] of Object.entries(rosters.seasons))for(const [clubId,record] of Object.entries(clubs))for(const player of record.players){
  if(!player.identityPageId||!player.birthDate||!['GK','DF','MF','FW'].includes(player.position)||!player.nationality)continue;
  const id=Number(player.identityPageId),previous=catalogue.get(id);
  const observation={player,year:Number(year),clubId,season:record.season,source:record.source};
  if(previous)previous.observations.push(observation);
  else catalogue.set(id,{observations:[observation]});
}
const sources=new Map(),rejected=[],cacheFiles=(await fs.readdir(cache)).filter(file=>/\.json(?:\.gz)?$/.test(file));let cursor=0,reusedParsedFiles=0;
const careerParserText=await fs.readFile('scripts/lib/wiki-career-parser.mjs','utf8'),rosterParserText=await fs.readFile('src/games/sports/manager/wikimedia-roster-parser.js','utf8');
const parserFingerprint=digest(careerParserText+rosterParserText);
// Only template parsing, text cleaning and birth-date parsing are imported by
// the career parser. Squad/retirement checks below this boundary are separate.
const primitiveEnd=rosterParserText.indexOf('export function wikiPlayerBirthDate');
if(primitiveEnd<0)throw Error('Shared parser dependency boundary changed');
const dependencyFingerprint=digest(careerParserText+rosterParserText.slice(0,primitiveEnd));
const indexPath=`${output}/parsed-biographies-index.json`;let previousIndex={entries:{}};
try{const candidate=JSON.parse(await fs.readFile(indexPath,'utf8'));if(!process.argv.includes('--reparse')&&(candidate.parserFingerprint===parserFingerprint||candidate.dependencyFingerprint===dependencyFingerprint)&&candidate.entries&&typeof candidate.entries==='object')previousIndex=candidate;}catch(error){if(error.code!=='ENOENT')console.warn(`Ignoring unusable parsed index: ${error.message}`);}
const parsedEntries={};
await Promise.all(Array.from({length:4},async()=>{while(cursor<cacheFiles.length){const file=cacheFiles[cursor++];let source;
  try{
    const stat=await fs.stat(`${cache}/${file}`),prior=previousIndex.entries[file];
    // Cache writes are atomic. File metadata invalidates derived parsing;
    // revision and source text SHA remain attached to every parsed biography.
    if(prior&&prior.size===stat.size&&prior.mtimeMs===stat.mtimeMs){source=prior.source;reusedParsedFiles++;}
    else {const raw=await fs.readFile(`${cache}/${file}`),cached=JSON.parse((file.endsWith('.gz')?gunzipSync(raw):raw).toString('utf8'));
      source=cached.text&&cached.revision?{title:cached.title,pageId:cached.pageId,revision:cached.revision,timestamp:cached.timestamp,sourceSha256:digest(cached.text),parsed:parseWikiSeniorCareer(cached.text)}:null;}
    parsedEntries[file]={size:stat.size,mtimeMs:stat.mtimeMs,source};
  }catch{continue;}
  if(source&&catalogue.has(Number(source.pageId))){const previous=sources.get(Number(source.pageId));if(!previous||Number(source.revision)>Number(previous.revision))sources.set(Number(source.pageId),source);}
  if(cursor%5000===0)console.error(`Career cache: ${cursor}/${cacheFiles.length}`);
}}));
await fs.writeFile(`${indexPath}.tmp`,JSON.stringify({schemaVersion:1,parserFingerprint,dependencyFingerprint,entries:parsedEntries})+'\n');await fs.rename(`${indexPath}.tmp`,indexPath);
const players=[],byYear={},byLeague={},unresolvedClubs=new Map(),candidates=[],excludedMetadata=[];
const historicalNames=new Map(),nameKey=(name,birthDate)=>`${String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ')}:${birthDate}`;
for(const player of historical.historicalPlayers){const key=nameKey(player.name,player.birthDate);if(!historicalNames.has(key))historicalNames.set(key,[]);historicalNames.get(key).push(player);}
for(const [pageId,source] of sources){
  const identity=catalogue.get(pageId),parsed=source.parsed;
  const metadata=validateCareerMetadata(parsed,identity.observations,resolveClub);
  if(parsed.valid&&metadata.excluded.length)excludedMetadata.push({pageId,title:source.title,observations:metadata.excluded.map(({player,...row})=>({...row,nationality:player.nationality,position:player.position}))});
  if(!parsed.valid||!metadata.valid){rejected.push({pageId,title:source.title,reason:!parsed.valid?parsed.reason:metadata.reason,detail:parsed.index?{index:parsed.index,years:parsed.years,club:parsed.club}:undefined,...(metadata.reason==='conflicting-nationality'?{nationalities:[...new Set(metadata.observations.map(row=>row.player.nationality))]}:{})});continue;}
  const selectedMetadata=metadata.selected;
  const eligibleSeasons=[];
  for(let year=1990;year<=2025;year++){
    const choice=unambiguousCareerClub(parsed,year,title=>resolveClub(title,year));if(!choice||!isPublishableCareerStint(choice.stint,year)||!clubYears.get(year)?.has(choice.clubId))continue;
    // Historic membership evidence, not an assumed retirement age, determines
    // whether a veteran belongs in the selected year (e.g. Buffon, Parma 2022).
    const age=year-Number(parsed.birthDate.slice(0,4));if(age<16||age>65)continue;
    eligibleSeasons.push({year,clubId:choice.clubId,stintIndex:choice.stint.index});
    byYear[year]=(byYear[year]||0)+1;
    const league=Object.entries(memberships.seasons[year]).find(([,row])=>row.teams.some(team=>team.clubId===choice.clubId))?.[0];
    byLeague[league]=(byLeague[league]||0)+1;
  }
  for(const stint of parsed.stints)if(!resolveClub(stint.article))unresolvedClubs.set(stint.article,(unresolvedClubs.get(stint.article)||0)+1);
  if(!eligibleSeasons.length)continue;
  const name=source.title.replace(/ \([^)]*\)$/,'');
  const matches=historicalNames.get(nameKey(name,parsed.birthDate))||[];
  // Name+DOB is only a research candidate, never a strong cross-provider ID.
  if(matches.length===1)candidates.push({identityPageId:pageId,name,wikidataId:matches[0].wikidataId,candidateClubYears:eligibleSeasons.filter(item=>matches[0].memberships.some(m=>m.clubId===item.clubId)).length,status:'requires-wikidata-sitelink-confirmation'});
  const url=`https://en.wikipedia.org/w/index.php?oldid=${source.revision}`;
  players.push({identityPageId:pageId,identityNamespace:'en.wikipedia.org',name,birthDate:parsed.birthDate,birthYear:Number(parsed.birthDate.slice(0,4)),nationality:selectedMetadata.player.nationality,position:selectedMetadata.player.position,identitySource:url,
    source:url,sourceTitle:source.title,sourceRevision:String(source.revision),sourceTimestamp:source.timestamp,sourceSha256:source.sourceSha256,
    identityMetadataSource:selectedMetadata.source,identityMetadataYear:selectedMetadata.year,identityMetadataClubId:selectedMetadata.clubId,
    careerStints:parsed.stints,eligibleSeasons});
}
players.sort((a,b)=>a.identityPageId-b.identityPageId);
const audit={sourceSnapshots:snapshots,cachedFiles:cacheFiles.length,compressedCacheFiles:cacheFiles.filter(file=>file.endsWith('.gz')).length,knownIdentities:catalogue.size,biographiesFound:sources.size,players:players.length,playerSeasons:players.reduce((n,p)=>n+p.eligibleSeasons.length,0),clubSeasons:new Set(players.flatMap(p=>p.eligibleSeasons.map(s=>`${s.year}:${s.clubId}`))).size,byYear,byLeague,rejected:rejected.length,excludedMetadataObservations:excludedMetadata.reduce((n,row)=>n+row.observations.length,0),historicalIdentityCandidates:candidates.length};
Object.assign(audit,{reusedParsedFiles,parserFingerprint,dependencyFingerprint});
const result={schemaVersion:1,revision:'2026-10-11-verified-careers-v1',license:'CC-BY-SA-4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',attribution:'Contributors to English Wikipedia; revision-pinned football biography infobox adaptations by GameLock.',precision:'year-interior',complete:false,
  limitations:['Partial individual career evidence, not complete season squads.','Only interior calendar years of a closed senior interval are used; all transfer boundary years and potentially overlapping loans/reserve/unknown clubs are excluded.','No dates are invented from year-only membership. Nationality and broad position reuse previously validated roster metadata, not historical sporting nationality or ratings.','Wikidata P54 quarantine is unchanged; name and birthday alone never create a cross-provider identifier.'],audit,players};
await fs.writeFile(`${output}/verified-player-careers.preview.json`,JSON.stringify(result)+'\n');
await fs.writeFile(`${output}/audit.json`,JSON.stringify({...audit,rejectedRows:rejected,excludedMetadata,historicalCandidates:candidates,unresolvedClubs:[...unresolvedClubs].sort((a,b)=>b[1]-a[1])},null,2)+'\n');
if(!dry){
  if(output!=='output/manager-v12/careers')throw Error('Use --dry-run with a custom report directory');
  await import('./publish-manager-verified-careers.mjs');
}
console.log(JSON.stringify(audit,null,2));
