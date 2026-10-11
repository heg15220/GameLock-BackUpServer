#!/usr/bin/env node
/** Regional participants: CC0 Football.TXT plus attributed CC-BY-SA Wikimedia tables. */
import {createHash}from'node:crypto';
import {mkdir,readFile,writeFile,rename}from'node:fs/promises';
import {resolve,dirname}from'node:path';
import {fileURLToPath}from'node:url';
import {parseWikiMembershipTables,selectWikiParticipants}from'./lib/wiki-membership-parser.mjs';
import {createMembershipClubResolver,validateSeasonParticipants}from'../src/games/sports/manager/membership-providers.js';
import {normalizeClubName}from'../src/games/sports/manager/providers.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),cache=resolve(root,'.cache/football-manager-regions');
const offline=process.argv.includes('--offline');
await mkdir(cache,{recursive:true});await writeFile(resolve(cache,'.gitignore'),'*\n');
const world=JSON.parse(await readFile(resolve(root,'src/games/sports/trayectoria/world.data.json'),'utf8'));
const historical=JSON.parse(await readFile(resolve(root,'src/games/sports/manager/historical-results.json'),'utf8'));
const resolveClub=createMembershipClubResolver(world,historical);
const digest=text=>createHash('sha256').update(text).digest('hex');
const delay=ms=>new Promise(done=>setTimeout(done,ms));let lastRequest=0;
async function get(url){
  const path=resolve(cache,`${digest(url)}.json`);
  try{return JSON.parse(await readFile(path,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  if(offline)throw new Error(`Missing offline source: ${url}`);
  for(let attempt=0;attempt<5;attempt++){
    if(url.includes('wikipedia.org'))await delay(Math.max(0,lastRequest+2000-Date.now()));
    lastRequest=Date.now();
    const response=await fetch(url,{signal:AbortSignal.timeout(45000),headers:{'User-Agent':'GameLock-Historical-Football/1.0 (attributed open data archive)'}});
    const text=await response.text();
    if(response.status===429||/too many requests/i.test(text)){await delay(Math.max(30000,Number(response.headers.get('retry-after')??0)*1000));continue;}
    if(!response.ok)throw new Error(`HTTP ${response.status}: ${url}`);
    const record={url,text,sha256:digest(text),fetchedAt:new Date().toISOString()};await writeFile(path,JSON.stringify(record));return record;
  }
  throw new Error(`Public source rate-limited: ${url}`);
}
const api=(language,params)=>`https://${language}.wikipedia.org/w/api.php?${new URLSearchParams({...params,format:'json'})}`;
const definitions=[
  ['copa-de-primera','PAR',['Paraguayan Primera División seasons','Copa de Primera seasons']],
  ['liga-bolivia','BOL',['Bolivian Primera División seasons','FBF División Profesional seasons']],
  ['liga-de-primera','CHI',['Primera División de Chile seasons']],
  ['liga-futve','VEN',['Venezuelan Primera División seasons','Liga FUTVE seasons']],
  ['liga-uruguaya','URU',['Liga AUF Uruguaya seasons','Uruguayan Primera División seasons']],
  ['liga1','PER',['Peruvian Primera División seasons','Peruvian Liga 1 seasons']],
  ['ligapro-serie-a','ECU',['Ecuadorian Serie A seasons','LigaPro Serie A seasons']],
  ['primera-nacional','ARG',['Primera B Nacional seasons']],
  ['primera-division-costa-rica','CRC',['Costa Rican Primera División seasons','Costa Rican Primera División FPD seasons','Liga FPD seasons']],
  ['hon-liga-nacional','HON',['Liga Nacional de Fútbol Profesional de Honduras seasons']],
  ['liga-nacional-guatemala','GUA',['Liga Nacional de Fútbol de Guatemala seasons','Liga Guate seasons']],
  ['slv-primera-division','SLV',['Primera División de Fútbol Profesional seasons','Salvadoran Primera División seasons']],
  ['liga-primera-de-nicaragua','NCA',['Nicaraguan Primera División seasons']],
  ['liga-dominicana-de-futbol','DOM',['Liga Dominicana de Fútbol seasons']],
  ['pan-primera-division','PAN',['Liga Panameña de Fútbol seasons']],
].map(([id,country,categories])=>({id,country,categories}));
const aliases={
  ARG:{'Estudiantes de Buenos Aires':'ca-estudiantes','Estudiantes de Río Cuarto':'estudiantes-de-rio-cuarto',
    'Gimnasia y Esgrima de Jujuy':'gimnasia-jujuy','Gimnasia y Esgrima de Mendoza':'gimnasia-m',
    'Racing de Córdoba':'racing-cordoba','Arsenal de Sarandí':'arsenal-sarandi','Talleres de Remedios de Escalada':'talleres-remedios',
    'Club Atlético Colón':'colon-santa-fe','Club Atlético Mitre':'atletico-mitre','Club Agropecuario Argentino':'agropecuario',
    'Unión de Mar del Plata':'arg-union-de-mar-del-plata',
    'Almirante Brown de Arrecifes':'arg-almirante-brown-de-arrecifes','Almirante Brown de Isidro Casanova':'almirante-brown',
    'San Martín de Tucumán':'san-martin-tucuman','San Martín de San Juan':'san-martin-sj','CSyD Tristán Suárez':'tristan-suarez'},
  ECU:{Barcelona:'barcelona-sc','Barcelona S.C.':'barcelona-sc','L.D.U. Quito':'ldu-de-quito','LDU Quito':'ldu-de-quito','Libertad de Loja':'libertad'},
  HON:{'C.D. Olimpia':'olimpia-hon','Club Deportivo Olimpia':'olimpia-hon','Olimpia':'olimpia-hon','C.D. Marathón':'marathon','F.C. Motagua':'motagua','Real C.D. España':'real-espana','Atlético Choloma':'choloma','Platense F.C.':'platense-hon','Génesis de Comayagua':'genesis'},
  PAN:{'Alianza F.C. (Panama)':'alianza-pan','Club Atlético Independiente de La Chorrera':'independiente-pan'},
  URU:{'Club Nacional de Football':'club-nacional','Liverpool F.C. (Montevideo)':'liverpool-montevideo','Racing Club de Montevideo':'racing-montevideo','Montevideo City Torque':'atletico-torque','Club Atlético Torque':'atletico-torque'},
  PER:{'Real Garcilaso':'cusco','Club Real Garcilaso':'cusco','Cusco FC':'cusco','Cusco F.C.':'cusco'},
  CHI:{'Audax Italiano':'a-italiano','Club Deportivo Universidad Católica':'u-catolica'},
};
function teamId(team,definition){
  const specific=aliases[definition.country]?.[team.article]??aliases[definition.country]?.[team.name];if(specific)return specific;
  const articleId=resolveClub(team.article,definition.country,definition.id),nameId=resolveClub(team.name,definition.country,definition.id);
  const foreign=id=>world.clubs[id]&&world.competitions[world.clubs[id].competitionId]?.country_fifa_code!==definition.country;
  if(world.clubs[articleId]&&!foreign(articleId))return articleId;
  const significant=value=>normalizeClubName(value).split(' ').filter(token=>!['club','atletico','deportivo','futbol','football','futebol','futebol','fc','cf','cd','ac','ca','cs','sc','c','f','s','d','de','del','la','el','the'].includes(token));
  const articleWords=significant(team.article);
  // A short display label cannot erase a conflicting linked identity. Unión
  // (Mar del Plata) and Unión (Santa Fe) are different Argentine clubs.
  if(world.clubs[nameId]&&!foreign(nameId)&&significant(world.clubs[nameId].name).every(token=>articleWords.includes(token)))return nameId;
  // Full linked identity is significant (Estudiantes and Gimnasia are homonyms).
  return `${definition.country.toLowerCase()}-${articleId.replace(/^(?:[a-z]{3}-)/,'')}`;
}
const seasons={},missing=[],sources=[],allCandidates=[];
const normalizeTeams=(teams,definition)=>teams.map(team=>({clubId:teamId(team,definition),name:team.name,article:team.article}));
function add(year,definition,record){seasons[year]??={};if(!seasons[year][definition.id])seasons[year][definition.id]=record;}

// Direct CC0 files omitted from football.json's publication index.
for(const entry of [
  ['ligapro-serie-a','ECU','openfootball/south-america','119fa1724b2079a1072a0cb0ca0ccac26d92fd34','ecuador/2025_ec1.txt',2025,'2025'],
  ['copa-de-primera','PAR','openfootball/south-america','119fa1724b2079a1072a0cb0ca0ccac26d92fd34','paraguay/2025_py1.txt',2025,'2025'],
  ['primera-division-costa-rica','CRC','openfootball/world','42df8203e73e922cdfa36104e3acee3aea1f2bc0','central-america/costa-rica/2024-25_cr1.txt',2024,'2024-25'],
]){
  const [id,country,repo,revision,path,year,season]=entry,definition={id,country};
  const licence=await get(`https://raw.githubusercontent.com/${repo}/${revision}/LICENSE.md`);if(!/CC0|Public Domain/i.test(licence.text))throw new Error('Unrecognised regional licence');
  const source=await get(`https://raw.githubusercontent.com/${repo}/${revision}/${path}`),matches=[];let stage='Regular season';
  for(const line of source.text.split(/\r?\n/)){
    if(line.startsWith('▪'))stage=line.slice(1).trim().split(',')[0];
    if(!/\sv\s/.test(line))continue;
    const [left,right]=line.trim().replace(/^\d{1,2}:\d{2}\s+/,'').split(/\s+v\s+/);
    matches.push({team1:left.trim(),team2:right.split(/\s{2,}/)[0].trim(),stage});
  }
  const expectedCount=Number(/^# Teams\s+(\d+)/m.exec(source.text)?.[1]);
  const resolveRegional=(name)=>teamId({name,article:name},definition);
  const result=validateSeasonParticipants(matches,resolveRegional,country,{competitionId:id,expectedCount});
  if(!result.valid)throw new Error(`Regional CC0 validation failed: ${id}: ${JSON.stringify(result)}`);
  add(year,definition,{season,edition:id==='copa-de-primera'?'Clausura':id==='primera-division-costa-rica'?'Apertura':null,sourceId:'openfootball-regional-txt',source:source.url,license:'CC0-1.0',revision,sha256:source.sha256,teams:result.teams,validation:result.validation,
    stages:[...new Set(matches.map(match=>match.stage))].filter(name=>!/playoff|final/i.test(name)).map(name=>({name,clubIds:[...new Set(matches.filter(match=>match.stage===name).flatMap(match=>[resolveRegional(match.team1),resolveRegional(match.team2)]))]}))});
  if(!sources.some(row=>row.url===`https://github.com/${repo}`))sources.push({id:'openfootball-regional-txt',url:`https://github.com/${repo}`,revision,license:'CC0-1.0',licenseUrl:`https://github.com/${repo}/blob/${revision}/LICENSE.md`,licenseSha256:licence.sha256});
}

for(const definition of definitions){
  const found=new Map();
  for(const category of definition.categories){
    const record=await get(api('en',{action:'query',list:'categorymembers',cmtitle:'Category:'+category,cmlimit:'500',cmtype:'page'}));
    const response=JSON.parse(record.text);
    for(const page of response.query?.categorymembers??[]){
      const match=/^(\d{4})(?:[–-](\d{2,4}))?/.exec(page.title);if(!match)continue;
      const year=Number(match[1]);if(year<1990||year>2025)continue;
      if(/women|reserve|segunda|promotion|relegation|cup|copa dominicana/i.test(page.title))continue;
      found.set(page.title,{title:page.title,year,split:!!match[2],language:'en',definition});
    }
  }
  // Spanish season pages also cover the leagues with sparse English archives.
  if(['CRC','GUA','SLV','PAN','DOM'].includes(definition.country))for(let year=definition.country==='DOM'?2015:1990;year<=2025;year++){
    let title;
    if(definition.country==='DOM')title=`Liga Dominicana de Fútbol ${year}${year===2025?'-26':''}`;
    if(definition.country==='PAN')title=`Torneo Clausura ${year} (Panamá)`;
    if(definition.country==='CRC')title=`Torneo de ${year>=2017?'Apertura':'Invierno'} ${year} (Costa Rica)`;
    if(definition.country==='GUA')title=`Torneo Apertura ${year} (Guatemala)`;
    if(definition.country==='SLV')title=`Torneo Apertura ${year} (El Salvador)`;
    found.set(title,{title,year,split:['CRC','GUA','SLV'].includes(definition.country)||definition.country==='DOM'&&year===2025,language:'es',definition});
  }
  if(definition.country==='ECU')for(let year=2020;year<=2025;year++){
    const title=`${year} LigaPro Serie A`;found.set(title,{title,year,split:false,language:'en',definition});
  }
  if(definition.country==='HON')for(let year=1990;year<=2025;year++){
    const title=`Campeonato de Primera División ${year}-${String(year+1).slice(-2)} (Honduras)`;
    found.set(title,{title,year,split:true,language:'es',definition});
  }
  if(definition.country==='HON'){
    const title='Torneo Apertura 2023 (Honduras)';found.set(title,{title,year:2023,split:true,language:'es',definition});
  }
  if(definition.country==='SLV')for(let year=1990;year<1998;year++){
    const title=`Campeonato salvadoreño ${year}-${String(year+1).slice(-2)}`;
    found.set(title,{title,year,split:true,language:'es',definition});
  }
  if(definition.country==='GUA')for(let year=1990;year<1999;year++){
    const title=`Liga Nacional de Guatemala ${year}-${String(year+1).slice(-2)}`;
    found.set(title,{title,year,split:true,language:'es',definition});
  }
  if(definition.country==='CRC')for(let year=1990;year<2007;year++){
    const title=`Championnat du Costa Rica de football ${year}-${year+1}`;
    found.set(title,{title,year,split:true,language:'fr',definition});
  }
  console.log(`${definition.id}: ${found.size} season article candidates`);
  allCandidates.push(...found.values());
}
// More recent starts first; within a year prefer a split season beginning in that
// year, then the second annual tournament. No replacement by a modern team list.
allCandidates.sort((a,b)=>b.year-a.year||Number(b.split)-Number(a.split)||Number(/Clausura/i.test(b.title))-Number(/Clausura/i.test(a.title))||a.title.localeCompare(b.title));
let processed=0;
for(const candidate of allCandidates){
  const {year,definition,title,language,split}=candidate;if(seasons[year]?.[definition.id])continue;
  let record;
  try{record=await get(api(language,{action:'parse',page:title,prop:'text|revid',redirects:'1'}));}
  catch(error){
    // An unavailable season must not discard other complete, licensed sources.
    // Offline mode records an uncached alternative as a visible gap as well.
    missing.push({year,competitionId:definition.id,title,language,reason:'source-unavailable',detail:String(error.message)});
    continue;
  }
  const payload=JSON.parse(record.text),article=payload.parse;
  if(!article?.text?.['*']){missing.push({year,competitionId:definition.id,title,language,reason:payload.error?.code??'no-content'});continue;}
  const targetYear=Number(/\b((?:19|20)\d{2})\b/.exec(article.title)?.[1]);
  if(targetYear!==year){missing.push({year,competitionId:definition.id,title,language,reason:'season-mismatch-redirect',target:article.title});continue;}
  if(/cup|copa dominicana|liga prom|segunda|femenin|women/i.test(article.title)){missing.push({year,competitionId:definition.id,title,language,reason:'wrong-competition-redirect',target:article.title});continue;}
  const parsed=parseWikiMembershipTables(article.text['*']);
  const historicalField=definition.country==='PER'&&year===1990?44:definition.country==='PER'&&year===1991?41:null;
  const selected=selectWikiParticipants(parsed,{expectedCount:historicalField,maxTeams:['primera-nacional','liga1'].includes(definition.id)?48:32,preferredStage:split?'Apertura|Invierno':/Apertura|Clausura|Invierno/.test(title)?null:'Clausura'});
  if(!selected.valid){missing.push({year,competitionId:definition.id,title,language,...selected});continue;}
  const teams=normalizeTeams(selected.teams,definition);
  if(new Set(teams.map(team=>team.clubId)).size!==teams.length){missing.push({year,competitionId:definition.id,title,reason:'ambiguous-club-identity',teams});continue;}
  const oldid=article.revid,source=`https://${language}.wikipedia.org/w/index.php?title=${encodeURIComponent(article.title)}&oldid=${oldid}`;
  const edition=/Apertura|Clausura|Invierno|Verano/i.exec(title)?.[0]??(/Apertura|Clausura|Invierno|Verano/i.exec(selected.tableContext)?.[0]??null);
  add(year,definition,{season:split?`${year}-${String(year+1).slice(-2)}`:String(year),edition,
    sourceId:'wikimedia-regional-seasons',source,revision:String(oldid),sha256:record.sha256,license:'CC-BY-SA-4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',
    attribution:`Contributors to ${language}.wikipedia.org: ${article.title}`,historyUrl:`https://${language}.wikipedia.org/w/index.php?title=${encodeURIComponent(article.title)}&action=history`,
    modifications:'Participant names and linked identities extracted from the named season table; positions, scores and prose omitted. Club aliases resolved against the game catalogue.',
    tableContext:selected.tableContext,teams,validation:selected.validation,
    stages:selected.stages.map(stage=>({name:stage.name,clubIds:normalizeTeams(stage.teams,definition).map(team=>team.clubId)}))});
  processed++;if(processed%20===0){console.log(`Accepted ${processed} Wikimedia league-seasons`);await writeFile(resolve(cache,'draft.json'),JSON.stringify({seasons,missing}));}
}
sources.push({id:'wikimedia-regional-seasons',name:'Wikimedia season contributors',url:'https://www.wikipedia.org/',license:'CC-BY-SA-4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',terms:'https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use/en#7._Licensing_of_Content'});
const result={schemaVersion:1,revision:'2026-10-10-regional-participants-v2',sources,seasons,missing};
for(const folder of ['src/games/sports/manager','public/data/football-manager']){
  const path=resolve(root,folder,'regional-memberships.json');await writeFile(path+'.tmp',JSON.stringify(result)+'\n');await rename(path+'.tmp',path);
}
console.log(JSON.stringify({accepted:processed,coverage:definitions.map(definition=>({id:definition.id,years:Object.keys(seasons).filter(year=>seasons[year][definition.id]).map(Number)})),missing:missing.length},null,2));
