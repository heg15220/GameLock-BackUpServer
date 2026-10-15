#!/usr/bin/env node
/** Complete league participant lists, pinned CC0 exports; no account/API key. */
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {OPENFOOTBALL_LEAGUES,CALENDAR_LEAGUES,footballMatches} from '../src/games/sports/manager/providers.js';
import {managerCompetitionExtensions} from '../src/games/sports/manager/competitions.js';
import {createMembershipClubResolver,parseMembershipCsv,validateSeasonParticipants} from '../src/games/sports/manager/membership-providers.js';
import {firstSeasonYear,latestSeasonYear} from './lib/manager-season-range.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),cache=resolve(root,'.cache/football-manager-memberships');
const args=process.argv.slice(2),offline=args.includes('--offline'),refresh=args.includes('--refresh');
if(args.some(arg=>!['--offline','--refresh'].includes(arg)))throw new Error('Options: --offline or --refresh');
if(offline&&refresh)throw new Error('Offline and refresh are mutually exclusive');
await mkdir(cache,{recursive:true});
await writeFile(resolve(cache,'.gitignore'),'*\n');
const json=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));
const world=await json('src/games/sports/trayectoria/world.data.json');
const old=await json('src/games/sports/manager/historical-results.json');
const competitions=[...Object.values(world.competitions),...managerCompetitionExtensions];
const resolveClub=createMembershipClubResolver(world,old);
const sources=[
  {id:'openfootball-json',repo:'openfootball/football.json',revision:'e6744429ee395bc86f247348c6184bb08d4eb361',licenseFile:'LICENSE.md',format:'json'},
  {id:'footballcsv-england',repo:'footballcsv/england',revision:'52b7e5f5f37b28db72dba1fdc8dbec1adae4c8d0',licenseFile:'LICENSE.md',format:'csv'},
  {id:'footballcsv-germany',repo:'footballcsv/deutschland',revision:'178324626681a9e4c42b81463f59f9c4500dbd53',licenseFile:'LICENSE.md',format:'csv'},
  {id:'footballcsv-spain-archive',repo:'Jack-Tilley/es-espana',revision:'d91ca620ebd484ceba25dbf7d8673d55a268aba8',licenseFile:'LICENSE.md',format:'csv'},
  {id:'footballcsv-mls',repo:'footballcsv/major-league-soccer',revision:'b821180ff275285e3e762f717c1f8de2f2ea123c',licenseFile:'LICENSE.md',format:'csv'},
  {id:'footballcsv-footballdata',repo:'footballcsv/cache.footballdata',revision:'f43a2aa0c65fb061c87e9541e7a567dd58ff933a',licenseFile:'LICENSE.md',format:'csv'},
  {id:'footballcsv-wfb',repo:'footballcsv/cache.wfb',revision:'399cc1f962d528c4e6f5314b7200405cb0836eb2',licenseFile:'LICENSE.md',format:'csv'},
].map(source=>({...source,license:'CC0-1.0',url:`https://github.com/${source.repo}`,licenseUrl:`https://github.com/${source.repo}/blob/${source.revision}/${source.licenseFile}`}));
const codes={...OPENFOOTBALL_LEAGUES,'liga-premier-de-rusia':'ru.1',ekstraklasa:'pl.1'};
const calendar=new Set([...CALENDAR_LEAGUES,'liga-bolivia','liga-futve','liga-uruguaya','liga1','ligapro-serie-a','liga-de-primera','copa-de-primera']);
let downloads=0;
async function get(url){
  const file=resolve(cache,`${createHash('sha256').update(url).digest('hex')}.json`);
  if(!refresh)try{return JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  if(offline)throw new Error(`Missing cache: ${url}`);
  let response;
  for(let attempt=0;attempt<3;attempt++){
    try{response=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{'User-Agent':'GameLock-manager-membership-archive'}});if(response.ok)break;}catch(error){if(attempt===2)throw error;}
    if(attempt===2)throw new Error(`HTTP ${response?.status}: ${url}`);
  }
  const text=await response.text();if(text.length>12_000_000)throw new Error('Source too large');
  const record={url,sha256:createHash('sha256').update(text).digest('hex'),fetchedAt:new Date().toISOString(),text};
  await writeFile(file,JSON.stringify(record));downloads++;return record;
}
const candidates=new Map();
for(const source of sources){
  const license=await get(`https://raw.githubusercontent.com/${source.repo}/${source.revision}/${source.licenseFile}`);
  if(!/CC0|Creative Commons Zero|Public Domain/i.test(license.text))throw new Error(`No CC0 declaration: ${source.repo}`);
  source.licenseSha256=license.sha256;
  const tree=JSON.parse((await get(`https://api.github.com/repos/${source.repo}/git/trees/${source.revision}?recursive=1`)).text);
  for(const item of tree.tree??[]){
    if(!item.path.endsWith(`.${source.format}`))continue;
    const match=/(?:^|\/)(\d{4})(-\d{2})?\/([^/]+)$/.exec(item.path);if(!match)continue;
    const year=Number(match[1]);if(year<firstSeasonYear||year>latestSeasonYear())continue;
    let code=match[3].replace(/\.(?:json|csv)$/,'').replace(/^eng\./,'en.');
    if(code==='1-liga')code='es.1';if(code==='2-liga2')code='es.2';if(['us.1','1-mls'].includes(code))code='mls';
    const competition=competitions.find(comp=>codes[comp.id]===code);if(!competition)continue;
    // Calendar-year and split-year seasons cannot silently substitute one another.
    if(calendar.has(competition.id)===!!match[2])continue;
    const key=`${year}:${competition.id}`;
    if(!candidates.has(key))candidates.set(key,[]);
    candidates.get(key).push({source,path:item.path,year,competition,season:`${year}${match[2]??''}`});
  }
}
const seasons={},rejected=[];let completed=0;
const tasks=[...candidates.values()];
async function worker(){
  while(tasks.length){
    const choices=tasks.shift();
    for(const choice of choices){
      const {source,path,year,competition,season}=choice;
      const record=await get(`https://raw.githubusercontent.com/${source.repo}/${source.revision}/${path}`);
      let result;
      try{
        const matches=source.format==='json'?footballMatches(JSON.parse(record.text)):parseMembershipCsv(record.text);
        const format=competition.id==='liga-profesional'&&year===2025?{expectedCount:30,minimumOpponents:16}:
          competition.id==='liga-premier-de-rusia'?{regularSeasonCount:16,expectedCount:16}:{};
        result=validateSeasonParticipants(matches,resolveClub,competition.country_fifa_code,{competitionId:competition.id,conference:competition.id==='usa-mls',...format});
        if(result.valid&&competition.id==='liga-profesional'&&year===2025)result.validation.formatEvidence='https://www.ligaprofesional.ar/notas/institucional/2025/01/11/todo-sobre-la-temporada-2025/';
        if(result.valid&&competition.id==='liga-premier-de-rusia')result.validation.formatEvidence='https://premierliga.ru/about/';
      }catch(error){result={valid:false,reason:error.message};}
      if(!result.valid){rejected.push({year,competitionId:competition.id,source:record.url,...result});continue;}
      seasons[year]??={};
      seasons[year][competition.id]={season,sourceId:source.id,source:record.url,license:source.license,revision:source.revision,sha256:record.sha256,teams:result.teams,validation:result.validation};
      break;
    }
    completed++;if(completed%100===0)console.log(`Validated ${completed}/${candidates.size} candidate league-seasons`);
  }
}
await Promise.all(Array.from({length:6},()=>worker()));
await writeFile(resolve(cache,'audit-draft.json'),JSON.stringify({seasons,rejected}));
// The regional archive is separately licensed and keeps per-row attribution.
// Its absence is allowed for rebuilding the original CC0 archive alone.
let regional;
try{regional=await json('src/games/sports/manager/regional-memberships.json');}catch(error){if(error.code!=='ENOENT')throw error;}
if(regional){
  sources.push(...regional.sources);
  for(const [year,entries]of Object.entries(regional.seasons)){
    seasons[year]??={};
    for(const [id,record]of Object.entries(entries))if(!seasons[year][id])seasons[year][id]=record;
  }
}
// Never publish ambiguous ownership: participant identities are unique per year.
for(const [year,entries]of Object.entries(seasons)){
  const seen=new Map();
  for(const [id,entry]of Object.entries(entries))for(const team of entry.teams){
    if(seen.has(team.clubId))throw new Error(`Same club in two leagues ${year}: ${team.clubId} (${seen.get(team.clubId)},${id})`);
    seen.set(team.clubId,id);
  }
}
const ordered=Object.fromEntries(Object.entries(seasons).sort(([a],[b])=>a-b).map(([year,entries])=>[year,Object.fromEntries(Object.entries(entries).sort(([a],[b])=>a.localeCompare(b)))]));
const coverage=competitions.map(competition=>({competitionId:competition.id,years:Object.keys(ordered).filter(year=>ordered[year][competition.id]).map(Number)}));
rejected.sort((a,b)=>a.year-b.year||a.competitionId.localeCompare(b.competitionId)||a.source.localeCompare(b.source));
const availableYears=Object.keys(ordered).map(Number);
const snapshot={schemaVersion:1,revision:'2026-10-15-participants-v3',range:{first:Math.min(...availableYears),last:Math.max(...availableYears)},sources,seasons:ordered,coverage,rejected};
for(const relative of ['src/games/sports/manager/league-memberships.json','public/data/football-manager/league-memberships.json']){
  const target=resolve(root,relative);await mkdir(dirname(target),{recursive:true});
  await writeFile(`${target}.tmp`,`${JSON.stringify(snapshot)}\n`);await rename(`${target}.tmp`,target);
}
console.log(JSON.stringify({leagueSeasons:Object.values(seasons).reduce((n,value)=>n+Object.keys(value).length,0),leagues:coverage.filter(row=>row.years.length).length,years:Object.keys(seasons).length,rejected:rejected.length,downloads,coverage},null,2));
