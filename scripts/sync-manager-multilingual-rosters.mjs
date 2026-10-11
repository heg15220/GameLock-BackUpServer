import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {parseMultilingualRoster,multilingualBiography} from '../src/games/sports/manager/multilingual-roster-parser.js';
import {verifiedMultilingualBirthCorrection,verifiedMultilingualSourceExclusion} from '../src/games/sports/manager/multilingual-roster-corrections.js';
import {fetchWikimedia,backoffWikimedia} from './manager-wikimedia-rate-limit.mjs';

const option=(name,fallback)=>process.argv.find(v=>v.startsWith(`--${name}=`))?.slice(name.length+3) ?? fallback;
const out=option('report-dir','output/manager-v12/multilingual'),cache=`${out}/cache`;
await fs.mkdir(cache,{recursive:true});
const offline=process.argv.includes('--offline'), maxRequests=Number(option('max-requests','500'));
const rebuild=process.argv.includes('--rebuild');
const cachedRostersOnly=process.argv.includes('--cached-rosters-only');
const years=option('years','2025,2012,2020,2015,2011,2005,2000').split(',').map(Number);
const requested=option('clubs','').split(',').filter(Boolean);
const requestedLeagues=option('leagues','').split(',').filter(Boolean);
const seasonArticles=process.argv.includes('--season-articles');
const hash=value=>createHash('sha256').update(value).digest('hex');
const read=async path=>{let buffer;try{buffer=await fs.readFile(path);}catch(error){if(error.code!=='ENOENT')throw error;buffer=await fs.readFile(`${path}.gz`);return JSON.parse(gunzipSync(buffer));}return JSON.parse(path.endsWith('.gz')?gunzipSync(buffer):buffer.toString('utf8'));};
const write=async(path,value)=>{const json=JSON.stringify(value);if(path.startsWith(`${cache}/`)&&value.query&&json.length>16384)return fs.writeFile(`${path}.gz`,gzipSync(json));return fs.writeFile(path,json);};
const memberships=await read('src/games/sports/manager/league-memberships.json');
const regional=await read('src/games/sports/manager/regional-memberships.json');
for(const [year,leagues]of Object.entries(regional.seasons))memberships.seasons[year]={...leagues,...memberships.seasons[year]};
const world=await read('src/games/sports/trayectoria/world.data.json');
const norm=value=>value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const countries=Object.fromEntries(Object.values(world.countries).flatMap(c=>[c.fifa,c.name_es,c.name_en].filter(Boolean).map(v=>[norm(v),c.fifa])));
Object.assign(countries,{spa:'ESP',chl:'CHI',ser:'SRB',prt:'POR',grc:'GRE',ngr:'NGA',rom:'ROU',swi:'SUI',pry:'PAR',deu:'GER',nld:'NED',hrv:'CRO',che:'SUI',dnk:'DEN',svn:'SVN',zaf:'RSA'});
// Reviewed club identity aliases. These only select source pages; league and
// season membership must independently exist in the published season catalog.
const aliases={
 'par-club-olimpia':'Club Olimpia','cerro-porteno':'Club Cerro Porteño','nacional-asuncion':'Club Nacional (Paraguay)','libertad-asuncion':'Club Libertad',
 bolivar:'Club Bolívar','the-strongest':'The Strongest',blooming:'Club Blooming','always-ready':'Club Always Ready',guabira:'Club Deportivo Guabirá','bol-club-aurora':'Club Aurora','nacional-potosi':'Club Atlético Nacional Potosí','bol-cd-jorge-wilstermann':'Club Deportivo Jorge Wilstermann','bol-oriente-petrolero':'Club Deportivo Oriente Petrolero',
 'atletico-nacional':'Atlético Nacional',millonarios:'Millonarios Fútbol Club','america-de-cali':'América de Cali','deportivo-cali':'Deportivo Cali','santa-fe':'Independiente Santa Fe','atletico-junior':'Junior de Barranquilla',
 'caracas-fc':'Caracas Fútbol Club','deportivo-tachira-fc':'Deportivo Táchira Fútbol Club','carabobo-fc':'Carabobo Fútbol Club','monagas-sc':'Monagas Sport Club','ven-zamora-fc':'Zamora Fútbol Club','deportivo-la-guaira':'Deportivo La Guaira Fútbol Club',
 comunicaciones:'Comunicaciones Fútbol Club',municipal:'Club Social y Deportivo Municipal',antigua:'Antigua Guatemala Fútbol Club',xelaju:'Club Social y Deportivo Xelajú Mario Camposeco','coban-imperial':'Club Social y Deportivo Cobán Imperial',malacateco:'Deportivo Malacateco',
 'slv-alianza-futbol-club-el-salvador':'Alianza Fútbol Club (El Salvador)',aguila:'Club Deportivo Águila',fas:'Club Deportivo FAS','isidro-metapan':'Asociación Deportiva Isidro Metapán','luis-angel-firpo':'Club Deportivo Luis Ángel Firpo',
 diriangen:'Diriangén Fútbol Club','real-esteli':'Real Estelí Fútbol Club',managua:'Managua Fútbol Club','walter-ferretti':'Club Deportivo Walter Ferretti','unan-managua':'Universidad Nacional Autónoma de Nicaragua Managua FC',
 cibao:'Cibao Fútbol Club',moca:'Moca Fútbol Club',pantoja:'Club Atlético Pantoja','universidad-om':'Universidad O&M FC','delfines-del-este':'Delfines del Este Fútbol Club',
 tauro:'Tauro Fútbol Club','arabe-unido':'Club Deportivo Árabe Unido','plaza-amador':'Club Deportivo Plaza Amador','san-francisco':'San Francisco Fútbol Club','sporting-san-miguelito':'Sporting San Miguelito',
 'celta-vigo':'Real Club Celta de Vigo','real-zaragoza':'Real Zaragoza','deportivo-la-coruna':'Real Club Deportivo de La Coruña','cd-alcoyano':'Club Deportivo Alcoyano','cd-guadalajara':'Club Deportivo Guadalajara (España)','ad-alcorcon':'Agrupación Deportiva Alcorcón','cd-numancia':'Club Deportivo Numancia de Soria','ce-sabadell':"Centre d'Esports Sabadell Futbol Club",cordoba:'Córdoba Club de Fútbol','fc-cartagena':'Fútbol Club Cartagena','gimnastic-tarragona':'Club Gimnàstic de Tarragona','hercules-cf':'Hércules de Alicante Club de Fútbol','real-murcia-cf':'Real Murcia Club de Fútbol','recreativo-huelva':'Real Club Recreativo de Huelva','xerez-cd':'Xerez Club Deportivo',
 albacete:'Albacete Balompié',almeria:'Unión Deportiva Almería',burgos:'Burgos Club de Fútbol',cadiz:'Cádiz Club de Fútbol',castellon:'Club Deportivo Castellón','cd-mirandes':'Club Deportivo Mirandés','cd-lugo':'Club Deportivo Lugo','cf-fuenlabrada':'Club de Fútbol Fuenlabrada',elche:'Elche Club de Fútbol',eldense:'Club Deportivo Eldense','extremadura-ud':'Extremadura Unión Deportiva',girona:'Girona Fútbol Club','granada-cf':'Granada Club de Fútbol','las-palmas':'Unión Deportiva Las Palmas',levante:'Levante Unión Deportiva',malaga:'Málaga Club de Fútbol',oviedo:'Real Oviedo','racing-ferrol':'Racing Club de Ferrol','racing-santander':'Real Racing Club de Santander','rayo-vallecano':'Rayo Vallecano de Madrid','sd-eibar':'Sociedad Deportiva Eibar','sd-huesca':'Sociedad Deportiva Huesca','sd-ponferradina':'Sociedad Deportiva Ponferradina','sporting-gijon':'Real Sporting de Gijón',tenerife:'Club Deportivo Tenerife',
};
const jobs=[];
const allowedLeagues=new Set(['copa-de-primera','liga-bolivia','liga-dimayor','liga-futve','liga-nacional-guatemala','slv-primera-division','liga-primera-de-nicaragua','liga-dominicana-de-futbol','pan-primera-division','laliga','laliga-2']);
for(const year of years)for(const [clubId,title]of Object.entries(aliases)){
 if(requested.length&&!requested.includes(clubId))continue;
 const membership=Object.entries(memberships.seasons[year]||{}).find(([,league])=>league.teams.some(t=>t.clubId===clubId));
 if(membership&&allowedLeagues.has(membership[0])&&(!requestedLeagues.length||requestedLeagues.includes(membership[0]))&&(!seasonArticles||['laliga','laliga-2'].includes(membership[0])))jobs.push({year,clubId,title:seasonArticles?`Anexo:Temporada ${year}-${String(year+1).slice(-2)} del ${title}`:title,competitionId:membership[0],seasonArticle:seasonArticles});
}
const datasetPath='src/games/sports/manager/multilingual-season-rosters.json';
const archive=rebuild?{seasons:{}}:await read(datasetPath).catch(()=>({seasons:{}}));
// Never retain a source alias outside this explicitly reviewed provider scope.
for(const season of Object.values(archive.seasons))for(const [clubId,record]of Object.entries(season))if(!aliases[clubId]||!allowedLeagues.has(record.competitionId))delete season[clubId];
Object.assign(archive,{revision:'2026-10-11-multilingual-rosters-v2',license:'CC-BY-SA-4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',languages:['es']});
let requests=0,lastRequest=0,blocked=null;
const report={jobs:jobs.length,accepted:[],rejected:[],omitted:[],conflictingRosterRows:[],quarantinedEvidence:[],requests:0};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function query(params,key){
 const path=`${cache}/${hash(key)}.json`,hit=await read(path).catch(()=>null);if(hit)return hit;
 if(cachedRostersOnly&&key.startsWith('es:roster:'))return null;
 if(offline||blocked||requests>=maxRequests)return null;
 await sleep(Math.max(0,lastRequest+Number(option('delay-ms','0'))-Date.now()));
 lastRequest=Date.now();requests++;
 const url='https://es.wikipedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',maxlag:'5',...params});
 const response=await fetchWikimedia(url,{headers:{'User-Agent':'GameLockArchive/1.0 (historical football facts; gamelockweb@gmail.com)'}});
 if(response.status===429||response.status===503){const retryAfter=response.headers.get('retry-after');await backoffWikimedia(Math.max(60,Number(retryAfter)||60)*1000,`eswiki-http-${response.status}`);blocked=`HTTP${response.status}; stopped; Retry-After=${retryAfter || 'not supplied'}`;return null;}
 if(!response.ok)throw Error(`${response.status} ${key}`);
 const data=await response.json();if(data.error){if(data.error.code==='maxlag'){await backoffWikimedia(60000,'eswiki-maxlag');blocked='API maxlag; stopped';return null;}throw Error(JSON.stringify(data.error));}
 await write(path,data);return data;
}
const normalizedTitle=value=>value.replaceAll('_',' ').trim();
// Recover individual identity caches from earlier batch responses. This also
// lets an interrupted run resume without requesting overlapping player batches.
for(const filename of await fs.readdir(cache)){
 const data=await read(`${cache}/${filename}`).catch(()=>null);if(!data?.query)continue;
 const pages=Object.values(data.query.pages||{});if(pages.some(p=>p.revisions?.[0]?.timestamp))continue;
 const redirects=new Map([...(data.query.normalized||[]),...(data.query.redirects||[])].map(r=>[r.from,r.to]));
 for(const [requestedTitle,target]of [...pages.map(p=>[p.title,p.title]),...redirects]){
  let title=target;for(let i=0;i<5&&redirects.has(title);i++)title=redirects.get(title);
  const page=pages.find(p=>p.title===title);if(!page)continue;
  const revision=page.revisions?.[0],body=revision?.slots?.main?.['*'];
  const item=body?{title:page.title,pageid:page.pageid,pageprops:page.pageprops,revisionId:revision.revid,biography:multilingualBiography(body,'es')}:null;
  await write(`${cache}/${hash(`es:identity:${requestedTitle}`)}.json`,{page:item});
 }
}
async function biographies(titles){
 const result=new Map();
 const pending=[];
 for(const title of titles){const cached=await read(`${cache}/${hash(`es:identity:${title}`)}.json`).catch(()=>null);if(cached)result.set(title,cached.page);else pending.push(title);}
 for(let i=0;i<pending.length;i+=40){
  const batch=pending.slice(i,i+40), key=`es:biography:${batch.slice().sort().join('|')}`;
  const data=await query({prop:'revisions|pageprops',titles:batch.join('|'),redirects:'1',rvprop:'ids|content',rvslots:'main'},key);
  if(!data)continue;
  const pages=Object.values(data.query?.pages||{}), redirects=new Map([...(data.query?.normalized||[]),...(data.query?.redirects||[])].map(r=>[r.from,r.to]));
  for(const requestedTitle of batch){
   let title=normalizedTitle(requestedTitle);for(let n=0;n<5&&redirects.has(title);n++)title=redirects.get(title);
   const page=pages.find(p=>p.title===title);if(!page||page.missing!==undefined){result.set(requestedTitle,null);await write(`${cache}/${hash(`es:identity:${requestedTitle}`)}.json`,{page:null});continue;}
   const revision=page.revisions?.[0],body=revision?.slots?.main?.['*'];if(!body)continue;
   const item={title:page.title,pageid:page.pageid,pageprops:page.pageprops,revisionId:revision.revid,biography:multilingualBiography(body,'es')};
   result.set(requestedTitle,item);await write(`${cache}/${hash(`es:identity:${requestedTitle}`)}.json`,{page:item});
  }
 }
 return result;
}
if(seasonArticles)for(let i=0;i<jobs.length;i+=30){
 const batch=jobs.slice(i,i+30),missing=[];
 for(const job of batch){const exists=await read(`${cache}/${hash(`es:season-article:${job.title}`)}.json`).catch(()=>null);if(!exists)missing.push(job);}
 if(!missing.length)continue;
 const data=await query({prop:'revisions',titles:missing.map(j=>j.title).join('|'),redirects:'1',rvprop:'ids|timestamp|content',rvslots:'main'},`es:season-batch:${missing.map(j=>j.title).join('|')}`);
 if(!data)continue;
 const pages=Object.values(data.query?.pages||{}),redirects=new Map([...(data.query?.normalized||[]),...(data.query?.redirects||[])].map(r=>[r.from,r.to]));
 for(const job of missing){let title=job.title;for(let n=0;n<5&&redirects.has(title);n++)title=redirects.get(title);const page=pages.find(p=>p.title===title);if(page)await write(`${cache}/${hash(`es:season-article:${job.title}`)}.json`,{query:{pages:{[page.pageid || -1]:page}}});}
}
if(seasonArticles&&process.argv.includes('--prefetch-only')){
 const found=[];for(const job of jobs){const data=await read(`${cache}/${hash(`es:season-article:${job.title}`)}.json`).catch(()=>null);const page=Object.values(data?.query?.pages||{})[0];if(page?.revisions?.[0])found.push({...job,sourceTitle:page.title,revision:page.revisions[0].revid});}
 await write(`${out}/season-discovery.json`,{requests,candidates:jobs.length,found,blocked});console.log(JSON.stringify({requests,candidates:jobs.length,found:found.length,blocked}));process.exit(0);
}
for(const [index,job]of jobs.entries()){
 try{
  const timestamp=`${job.year}-09-01T00:00:00Z`;
  const data=job.seasonArticle?await read(`${cache}/${hash(`es:season-article:${job.title}`)}.json`).catch(()=>null):await query({prop:'revisions',titles:job.title,redirects:'1',rvprop:'ids|timestamp|content',rvslots:'main',rvstart:timestamp,rvlimit:'1'},`es:roster:${job.title}:${timestamp}`);
  if(!data){report.rejected.push({...job,reason:'not fetched: budget/offline/rate limit'});continue;}
  const page=Object.values(data.query?.pages||{})[0],revision=page?.revisions?.[0],text=revision?.slots?.main?.['*'];
  if(!text){report.rejected.push({...job,reason:'no archived page'});continue;}
  const rosters=parseMultilingualRoster(text,countries,'es',{pageTitle:job.seasonArticle?page.title:null});
  if(!rosters.length){report.rejected.push({...job,reason:'no supported roster with explicit season'});continue;}
  for(const roster of rosters){
   const sourceExclusion=verifiedMultilingualSourceExclusion({clubId:job.clubId,year:roster.year,sourceRevision:String(revision.revid)});
   if(sourceExclusion){report.quarantinedEvidence.push(sourceExclusion);report.rejected.push({...job,declaredSeason:roster.season,reason:sourceExclusion.reason});continue;}
   if(roster.conflictingIdentities.length)report.conflictingRosterRows.push({year:roster.year,clubId:job.clubId,identities:roster.conflictingIdentities,sourceRevision:revision.revid});
   // A stale heading can refer to the previous season. Retain that declared
   // season only if the club's independent league catalog also confirms it.
   const membership=Object.entries(memberships.seasons[roster.year]||{}).find(([,league])=>league.teams.some(t=>t.clubId===job.clubId));
   if(!membership || roster.year>job.year || job.year-roster.year>1){report.rejected.push({...job,declaredSeason:roster.season,reason:'season outside archived request/membership'});continue;}
   if(/^\d{4}$/.test(String(membership[1].season))&&roster.season.includes('/')){report.rejected.push({...job,declaredSeason:roster.season,catalogSeason:membership[1].season,reason:'cross-year roster conflicts with documented calendar-year competition'});continue;}
   const bios=await biographies([...new Set(roster.players.filter(p=>p.linkedIdentity).map(p=>p.article))]);
   const players=[],identities=new Set();
   for(const player of roster.players){
    const bio=player.linkedIdentity?bios.get(player.article):null;
    const birthDateCorrection=verifiedMultilingualBirthCorrection({clubId:job.clubId,year:roster.year,sourceRevision:String(revision.revid),article:player.article,identityWiki:'es',identityPageId:bio?.pageid,wikidataId:bio?.pageprops?.wikibase_item,rowBirthDate:player.birthDate,biographyBirthDate:bio?.biography?.birthDate});
    const birthDate=birthDateCorrection?.to || player.birthDate || bio?.biography?.birthDate;
    let reason=null;
    if(player.linkedIdentity&&!bios.has(player.article))reason='biography lookup unavailable; defer row';
    else if(bio&&!bio.biography)reason='linked biography is not verified association football';
    else if(player.birthDate&&bio?.biography?.birthDate&&player.birthDate!==bio.biography.birthDate&&!birthDateCorrection)reason='squad/biography birth conflict';
    else if(!birthDate)reason='no exact birth date';
    else if(roster.year-Number(birthDate.slice(0,4))<14||roster.year-Number(birthDate.slice(0,4))>65)reason='age outside accepted range';
    const identity=bio?`es:${bio.pageid}`:`name:${norm(player.name)}:${birthDate}`;
    if(identities.has(identity))reason='duplicate resolved identity';
    if(reason){report.omitted.push({year:roster.year,clubId:job.clubId,name:player.name,reason});continue;}
    identities.add(identity);
    const {article,linkedIdentity,...row}=player;
    players.push({...row,name:bio?.title?.replace(/ \([^)]*\)$/,'') || row.name,birthDate,birthYear:Number(birthDate.slice(0,4)),...(birthDateCorrection?{birthDateCorrection}:{}),...(bio?{identityWiki:'es',identityPageId:bio.pageid,identitySource:`https://es.wikipedia.org/w/index.php?oldid=${bio.revisionId}`,...(/^Q\d+$/.test(bio.pageprops?.wikibase_item)?{wikidataId:bio.pageprops.wikibase_item}:{})}:{identityEvidence:'dated roster row; no resolved individual biography'})});
   }
   if(!players.length){report.rejected.push({...job,declaredSeason:roster.season,reason:'no validated dated players',players:players.length});continue;}
   const record={name:page.title,competitionId:membership[0],season:roster.season,precision:'season',complete:false,coverage:'partial',parsedRows:roster.players.length,validatedRows:players.length,language:'es',seasonEvidence:roster.seasonEvidence,source:`https://es.wikipedia.org/w/index.php?oldid=${revision.revid}`,sourceSha256:hash(text),revision:String(revision.revid),sourceRevisionDate:revision.timestamp,license:archive.license,licenseUrl:archive.licenseUrl,attribution:`Contributors to Spanish Wikipedia: ${page.title}; structured adaptation by GameLock.`,historyUrl:`https://es.wikipedia.org/w/index.php?title=${encodeURIComponent(page.title)}&action=history`,players};
   archive.seasons[roster.year]||={};const previous=archive.seasons[roster.year][job.clubId];
   // More complete evidence wins within this provider; never merge dates from
   // different snapshots into a single claimed squad.
   if(!previous||previous.revision===record.revision||players.length>previous.players.length)archive.seasons[roster.year][job.clubId]=record;
   report.accepted.push({year:roster.year,clubId:job.clubId,competitionId:membership[0],players:players.length,source:record.source});
  }
 }catch(error){report.rejected.push({...job,reason:error.message});}
 finally{if((index+1)%5===0)console.log(JSON.stringify({jobs:index+1,total:jobs.length,requests,accepted:report.accepted.length,omitted:report.omitted.length}));}
}
// A biography cannot have incompatible births across this provider. Conflicts
// are quarantined globally rather than letting order select a convenient date.
const latest=rebuild?{seasons:{}}:await read(datasetPath).catch(()=>({seasons:{}}));
const rebuilt=new Set(report.accepted.map(row=>`${row.year}:${row.clubId}`));
for(const [year,season]of Object.entries(latest.seasons||{}))for(const [clubId,record]of Object.entries(season)){
 if(!aliases[clubId]||!allowedLeagues.has(record.competitionId))continue;
 archive.seasons[year]||={};
 if(!rebuilt.has(`${year}:${clubId}`))archive.seasons[year][clubId]=record;
}
report.quarantinedCalendar=[];
for(const [year,season]of Object.entries(archive.seasons))for(const [clubId,record]of Object.entries(season)){
 const sourceExclusion=verifiedMultilingualSourceExclusion({clubId,year:Number(year),sourceRevision:String(record.revision)});
 if(sourceExclusion){if(!report.quarantinedEvidence.some(item=>item.id===sourceExclusion.id))report.quarantinedEvidence.push(sourceExclusion);delete season[clubId];continue;}
 const catalog=memberships.seasons[year]?.[record.competitionId];
 if(/^\d{4}$/.test(String(catalog?.season))&&record.season.includes('/')){
  report.quarantinedCalendar.push({year,clubId,season:record.season,catalogSeason:catalog.season,source:record.source});delete season[clubId];
 }
}
const births=new Map();for(const season of Object.values(archive.seasons))for(const roster of Object.values(season))for(const player of roster.players){const id=player.wikidataId || (player.identityPageId?`${player.identityWiki}:${player.identityPageId}`:null);if(id){if(!births.has(id))births.set(id,new Set());births.get(id).add(player.birthDate);}}
const conflicts=new Set([...births].filter(([,dates])=>dates.size>1).map(([id])=>id));
for(const season of Object.values(archive.seasons))for(const [clubId,roster]of Object.entries(season)){roster.players=roster.players.filter(p=>!conflicts.has(p.wikidataId || `${p.identityWiki}:${p.identityPageId}`));roster.complete=false;roster.coverage='partial';roster.validatedRows=roster.players.length;if(!roster.players.length)delete season[clubId];}
report.requests=requests;report.blocked=blocked;report.identityBirthConflicts=[...conflicts];
archive.quarantinedSources=[...new Map([...(archive.quarantinedSources||[]),...report.quarantinedEvidence].map(item=>[item.id,item])).values()];
report.totalLists=Object.values(archive.seasons).reduce((n,s)=>n+Object.keys(s).length,0);
report.totalPlayers=Object.values(archive.seasons).flatMap(Object.values).reduce((n,r)=>n+r.players.length,0);
report.leagues=[...new Set(Object.values(archive.seasons).flatMap(Object.values).map(r=>r.competitionId))].sort();
report.coverageByYear=Object.fromEntries(Object.entries(archive.seasons).map(([year,clubs])=>[year,{lists:Object.keys(clubs).length,players:Object.values(clubs).reduce((sum,r)=>sum+r.players.length,0)}]));
report.coverageByLeague=Object.fromEntries(report.leagues.map(league=>{const rows=Object.values(archive.seasons).flatMap(Object.values).filter(r=>r.competitionId===league);return [league,{lists:rows.length,players:rows.reduce((sum,r)=>sum+r.players.length,0)}];}));
await write(`${datasetPath}.${process.pid}.tmp`,archive);await fs.rename(`${datasetPath}.${process.pid}.tmp`,datasetPath);
await fs.mkdir('public/data/football-manager',{recursive:true});
const mirror='public/data/football-manager/multilingual-season-rosters.json';
await write(`${mirror}.${process.pid}.tmp`,archive);await fs.rename(`${mirror}.${process.pid}.tmp`,mirror);
await write(`${out}/report.json`,report);await write(`${out}/candidates.json`,jobs);
await fs.mkdir(`${out}/runs`,{recursive:true});await write(`${out}/runs/${new Date().toISOString().replaceAll(':','-')}.json`,report);
console.log(JSON.stringify({requests,lists:report.totalLists,players:report.totalPlayers,leagues:report.leagues,blocked}));
