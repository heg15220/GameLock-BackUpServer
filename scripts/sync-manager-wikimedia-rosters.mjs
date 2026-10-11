import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { fetchWikimedia, backoffWikimedia } from './manager-wikimedia-rate-limit.mjs';
import { parseWikiRoster, wikiPlayerBirthDate, wikiPlayerFootballFacts } from '../src/games/sports/manager/wikimedia-roster-parser.js';

const option = (name, fallback) => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const cache = option('cache', 'output/manager-v8/wikimedia-cache');
const reportDirectory = option('report-dir', 'output/manager-v12/english');
await fs.mkdir(cache, { recursive: true });
await fs.mkdir(reportDirectory, { recursive: true });
const world = JSON.parse(await fs.readFile('src/games/sports/trayectoria/world.data.json', 'utf8'));
const memberships = JSON.parse(await fs.readFile('src/games/sports/manager/league-memberships.json', 'utf8'));
try {
 const regional=JSON.parse(await fs.readFile('src/games/sports/manager/regional-memberships.json','utf8'));
 for(const [year,leagues] of Object.entries(regional.seasons || {})) memberships.seasons[year]={...leagues,...memberships.seasons[year]};
} catch { /* Regional snapshots may not have been imported yet. */ }
const countries = Object.fromEntries(Object.values(world.countries).flatMap(c => [c.fifa,c.name_en,c.name_es].filter(Boolean).map(name => [name.toLowerCase(),c.fifa])));
Object.assign(countries, { 'ivory coast': 'CIV', 'czech republic': 'CZE', 'south korea': 'KOR', 'republic of ireland': 'IRL', 'congo dr': 'COD', 'dr congo': 'COD', 'cape verde': 'CPV' });
// Historic football templates mix FIFA, IOC and ISO codes. Normalize known
// synonyms explicitly; never publish an unrecognized three-letter country.
Object.assign(countries, {spa:'ESP',chl:'CHI',ser:'SRB',prt:'POR',grc:'GRE',ngr:'NGA',rom:'ROU',swi:'SUI',drc:'COD',pry:'PAR',deu:'GER',nld:'NED',hrv:'CRO',che:'SUI',dnk:'DEN',svn:'SVN',zaf:'RSA'});
const clubs = {
 'real-madrid':'Real Madrid CF',barcelona:'FC Barcelona','atletico-madrid':'Atlético Madrid','athletic-club':'Athletic Bilbao',
 'real-zaragoza':'Real Zaragoza',valencia:'Valencia CF',sevilla:'Sevilla FC','real-betis':'Real Betis','real-sociedad':'Real Sociedad',
 malaga:'Málaga CF',espanyol:'RCD Espanyol','celta-vigo':'RC Celta de Vigo','deportivo-la-coruna':'Deportivo de La Coruña',
 'granada-cf':'Granada CF',getafe:'Getafe CF',levante:'Levante UD',mallorca:'RCD Mallorca',osasuna:'CA Osasuna',
 'rayo-vallecano':'Rayo Vallecano',valladolid:'Real Valladolid',villarreal:'Villarreal CF',elche:'Elche CF',almeria:'UD Almería',
 'manchester-united':'Manchester United F.C.','manchester-city':'Manchester City F.C.',chelsea:'Chelsea F.C.',arsenal:'Arsenal F.C.',
 liverpool:'Liverpool F.C.',tottenham:'Tottenham Hotspur F.C.',everton:'Everton F.C.',newcastle:'Newcastle United F.C.',
 'aston-villa':'Aston Villa F.C.',sunderland:'Sunderland A.F.C.','southampton':'Southampton F.C.','west-ham':'West Ham United F.C.',
 'bayern-munchen':'FC Bayern Munich','borussia-dortmund':'Borussia Dortmund','bayer-leverkusen':'Bayer 04 Leverkusen',
 'fc-schalke-04':'FC Schalke 04',juventus:'Juventus FC','ac-milan':'AC Milan',inter:'Inter Milan',
 napoli:'SSC Napoli','as-roma':'AS Roma',lazio:'SS Lazio',fiorentina:'ACF Fiorentina','paris-saint-germain':'Paris Saint-Germain F.C.',
 'olympique-lyonnais':'Olympique Lyonnais','olympique-de-marseille':'Olympique de Marseille',monaco:'AS Monaco FC',benfica:'S.L. Benfica',porto:'FC Porto','sporting-lisboa':'Sporting CP',
 'sporting-cristal':'Sporting Cristal','ldu-de-quito':'Liga Deportiva Universitaria de Quito','cerro-porteno':'Cerro Porteño',penarol:'Peñarol',
};
Object.assign(clubs, {
 ajax:'AFC Ajax',psv:'PSV Eindhoven',feyenoord:'Feyenoord',twente:'FC Twente',az:'AZ Alkmaar',utrecht:'FC Utrecht',
 galatasaray:'Galatasaray S.K.',fenerbahce:'Fenerbahçe S.K.',besiktas:'Beşiktaş J.K.',trabzonspor:'Trabzonspor',
 'celtic':'Celtic F.C.','rangers':'Rangers F.C.','aberdeen-fc':'Aberdeen F.C.',
 'boca-juniors':'Boca Juniors','river-plate':'Club Atlético River Plate','racing-club':'Racing Club de Avellaneda',
 flamengo:'Clube de Regatas do Flamengo',fluminense:'Fluminense FC',corinthians:'Sport Club Corinthians Paulista',palmeiras:'Sociedade Esportiva Palmeiras',santos:'Santos FC','sao-paulo':'São Paulo FC',gremio:'Grêmio FBPA',
 'los-angeles-galaxy':'LA Galaxy','seattle-sounders':'Seattle Sounders FC','dc-united':'D.C. United','new-york-rb':'New York Red Bulls','columbus-crew':'Columbus Crew','fc-dallas':'FC Dallas','toronto-fc':'Toronto FC','portland-timbers':'Portland Timbers',
 'club-america':'Club América','guadalajara-chivas':'C.D. Guadalajara','cruz-azul':'Cruz Azul',monterrey:'C.F. Monterrey',
 'olympiacos':'Olympiacos F.C.','panathinaikos':'Panathinaikos F.C.','aek-athens':'AEK Athens F.C.','paok':'PAOK FC',
 'anderlecht':'R.S.C. Anderlecht','club-brugge':'Club Brugge KV','red-bull-salzburg':'FC Red Bull Salzburg','rapid-wien':'SK Rapid Wien',
 'rsc-anderlecht':'R.S.C. Anderlecht','club-brugge-kv':'Club Brugge KV','rb-salzburg':'FC Red Bull Salzburg','austria-wien':'FK Austria Wien','sturm-graz':'SK Sturm Graz',
 'celtic-fc':'Celtic F.C.','rangers-fc':'Rangers F.C.','heart-of-midlothian':'Heart of Midlothian F.C.','hibernian-fc':'Hibernian F.C.',
 'olympiakos':'Olympiacos F.C.','olympiakos-piraeus':'Olympiacos F.C.','paok-saloniki':'PAOK FC','aek-athen':'AEK Athens F.C.',
 'beijing-guoan':'Beijing Guoan F.C.','shanghai-shenhua':'Shanghai Shenhua F.C.','shandong-taishan':'Shandong Taishan F.C.','shanghai-port-fc':'Shanghai Port F.C.',
 'gamba-osaka':'Gamba Osaka','kashima-antlers':'Kashima Antlers','urawa-red-diamonds':'Urawa Red Diamonds','yokohama-f-marinos':'Yokohama F. Marinos','vissel-kobe':'Vissel Kobe','kawasaki-frontale':'Kawasaki Frontale',
 'al-ahly-sc':'Al Ahly SC',zamalek:'Zamalek SC','mc-alger':'MC Alger','usm-alger':'USM Alger','js-kabylie':'JS Kabylie','es-setif':'ES Sétif','cr-belouizdad':'CR Belouizdad',
 'raja-casablanca':'Raja CA','wydad-ac':'Wydad AC','far-de-rabat':'AS FAR',
 'adelaide-united':'Adelaide United FC','melbourne-victory':'Melbourne Victory FC','sydney-fc':'Sydney FC','brisbane-roar':'Brisbane Roar FC','perth-glory':'Perth Glory FC','central-coast-mariners':'Central Coast Mariners FC',
 'lech-poznan':'Lech Poznań','legia-warszawa':'Legia Warsaw','jagiellonia-bialystok':'Jagiellonia Białystok',
 'zenit':'FC Zenit Saint Petersburg','cska-moskva':'PFC CSKA Moscow','spartak-moskva':'FC Spartak Moscow','lokomotiv-moskva':'FC Lokomotiv Moscow','rubin-kazan':'FC Rubin Kazan','dinamo-moskva':'FC Dynamo Moscow',
 'bsc-young-boys':'BSC Young Boys','fc-basel-1893':'FC Basel','fc-zurich':'FC Zürich','grasshopper-club-zurich':'Grasshopper Club Zürich','servette-fc':'Servette FC',
 'dynamo-dresden':'Dynamo Dresden','tsv-1860-munchen':'TSV 1860 Munich','1-fc-saarbrucken':'1. FC Saarbrücken','arminia-bielefeld':'Arminia Bielefeld','fc-ingolstadt-04':'FC Ingolstadt 04','hansa-rostock':'FC Hansa Rostock','energie-cottbus':'FC Energie Cottbus','waldhof-mannheim':'SV Waldhof Mannheim',
 '1-fc-kaiserslautern':'1. FC Kaiserslautern','1-fc-koln':'1. FC Köln','1-fc-nurnberg':'1. FC Nürnberg','hamburger-sv':'Hamburger SV','hertha-bsc':'Hertha BSC','hannover-96':'Hannover 96','fortuna-dusseldorf':'Fortuna Düsseldorf','karlsruher-sc':'Karlsruher SC',
 'bradford-city':'Bradford City A.F.C.','afc-wimbledon':'AFC Wimbledon','accrington-stanley':'Accrington Stanley F.C.','carlisle-united':'Carlisle United F.C.','cheltenham-town':'Cheltenham Town F.C.','chesterfield-fc':'Chesterfield F.C.','colchester-united':'Colchester United F.C.','crewe-alexandra':'Crewe Alexandra F.C.','doncaster-rovers':'Doncaster Rovers F.C.','gillingham-fc':'Gillingham F.C.','grimsby-town':'Grimsby Town F.C.','mk-dons':'Milton Keynes Dons F.C.','notts-county':'Notts County F.C.','port-vale-fc':'Port Vale F.C.','swindon-town':'Swindon Town F.C.','tranmere-rovers':'Tranmere Rovers F.C.','walsall-fc':'Walsall F.C.',
 'austria-lustenau':'SC Austria Lustenau','first-vienna-fc':'First Vienna FC','sv-ried':'SV Ried','fc-admira-wacker':'Admira Wacker','kapfenberger-sv-1919':'Kapfenberger SV','fc-liefering':'FC Liefering','skn-st-polten':'SKN St. Pölten',
 'atletico-nacional':'Atlético Nacional','millonarios':'Millonarios F.C.','america-de-cali':'América de Cali','deportivo-cali':'Deportivo Cali','santa-fe':'Independiente Santa Fe','atletico-junior':'Atlético Junior',
 'saprissa':'Deportivo Saprissa',alajuelense:'L.D. Alajuelense',Herediano:'C.S. Herediano',
 'olimpia-hon':'C.D. Olimpia',motagua:'F.C. Motagua','real-espana':'Real C.D. España',
 'ad-alcorcon':'AD Alcorcón','cd-alcoyano':'CD Alcoyano','cd-guadalajara':'CD Guadalajara (Spain)','cd-numancia':'CD Numancia','ce-sabadell':'CE Sabadell FC',cordoba:'Córdoba CF','fc-barcelona-b':'FC Barcelona B','fc-cartagena':'FC Cartagena','gimnastic-tarragona':'Gimnàstic de Tarragona',girona:'Girona FC','hercules-cf':'Hércules CF','las-palmas':'UD Las Palmas','real-murcia-cf':'Real Murcia CF','recreativo-huelva':'Recreativo de Huelva','sd-huesca':'SD Huesca','villarreal-cf-b':'Villarreal CF B','xerez-cd':'Xerez CD','racing-santander':'Racing de Santander','cd-tenerife':'CD Tenerife','real-oviedo':'Real Oviedo','sporting-gijon':'Sporting de Gijón',
});
Object.assign(clubs,{
 'bournemouth':'AFC Bournemouth',brighton:'Brighton & Hove Albion F.C.',burnley:'Burnley F.C.','crystal-palace':'Crystal Palace F.C.','leicester-city':'Leicester City F.C.',norwich:'Norwich City F.C.','sheffield-utd':'Sheffield United F.C.',watford:'Watford F.C.',wolves:'Wolverhampton Wanderers F.C.',fulham:'Fulham F.C.',leeds:'Leeds United F.C.','west-brom':'West Bromwich Albion F.C.','stoke-city':'Stoke City F.C.','swansea-city':'Swansea City A.F.C.','hull-city':'Hull City A.F.C.','qpr':'Queens Park Rangers F.C.','reading':'Reading F.C.','wigan-athletic':'Wigan Athletic F.C.','blackburn-rovers':'Blackburn Rovers F.C.','bolton-wanderers':'Bolton Wanderers F.C.','birmingham-city':'Birmingham City F.C.','blackpool':'Blackpool F.C.','portsmouth':'Portsmouth F.C.','derby-county':'Derby County F.C.','charlton-athletic':'Charlton Athletic F.C.','middlesbrough':'Middlesbrough F.C.','nottingham-forest':'Nottingham Forest F.C.','ipswich-town':'Ipswich Town F.C.','coventry-city':'Coventry City F.C.','brentford':'Brentford F.C.','cardiff-city':'Cardiff City F.C.','luton-town':'Luton Town F.C.','sheffield-wednesday':'Sheffield Wednesday F.C.',
 '1899-hoffenheim':'TSG 1899 Hoffenheim','borussia-monchengladbach':'Borussia Mönchengladbach','eintracht-frankfurt':'Eintracht Frankfurt','fc-augsburg':'FC Augsburg','fsv-mainz-05':'1. FSV Mainz 05','rb-leipzig':'RB Leipzig','sc-freiburg':'SC Freiburg','sc-paderborn-07':'SC Paderborn 07','union-berlin':'1. FC Union Berlin','vfl-wolfsburg':'VfL Wolfsburg','werder-bremen':'SV Werder Bremen','vfb-stuttgart':'VfB Stuttgart','vfl-bochum':'VfL Bochum','msv-duisburg':'MSV Duisburg','eintracht-braunschweig':'Eintracht Braunschweig','holstein-kiel':'Holstein Kiel','greuther-furth':'SpVgg Greuther Fürth','1-fc-heidenheim':'1. FC Heidenheim','darmstadt-98':'SV Darmstadt 98',
 alaves:'Deportivo Alavés',leganes:'CD Leganés','sd-eibar':'SD Eibar',
 'amiens-sc':'Amiens SC',angers:'Angers SCO','dijon-fco':'Dijon FCO','girondins-bordeaux':'FC Girondins de Bordeaux',lille:'Lille OSC',metz:'FC Metz',montpellier:'Montpellier HSC',nantes:'FC Nantes',nice:'OGC Nice','nimes-olympique':'Nîmes Olympique','olympique-marseille':'Olympique de Marseille','rc-strasbourg':'RC Strasbourg Alsace',reims:'Stade de Reims','saint-etienne':'AS Saint-Étienne','stade-brestois':'Stade Brestois 29','stade-rennais':'Stade Rennais FC',toulouse:'Toulouse FC',auxerre:'AJ Auxerre',lens:'RC Lens',lorient:'FC Lorient',sochaux:'FC Sochaux-Montbéliard',caen:'Stade Malherbe Caen',guingamp:'En Avant Guingamp',troyes:'ES Troyes AC',bastia:'SC Bastia',nancy:'AS Nancy Lorraine','le-havre':'Le Havre AC',
 atalanta:'Atalanta BC',bologna:'Bologna FC 1909','brescia-calcio':'Brescia Calcio',cagliari:'Cagliari Calcio',genoa:'Genoa CFC',lecce:'US Lecce',parma:'Parma Calcio 1913',sampdoria:'UC Sampdoria','sassuolo-calcio':'US Sassuolo Calcio','spal-2013-ferrara':'SPAL',torino:'Torino FC',udinese:'Udinese Calcio',verona:'Hellas Verona FC',empoli:'Empoli FC',palermo:'Palermo FC',livorno:'AS Livorno Calcio',siena:'AC Siena',catania:'Calcio Catania',cesena:'AC Cesena',novara:'Novara Calcio',pescara:'Delfino Pescara 1936',crotone:'FC Crotone',benevento:'Benevento Calcio',frosinone:'Frosinone Calcio',salernitana:'US Salernitana 1919',spezia:'Spezia Calcio',monza:'AC Monza','venezia-fc':'Venezia FC',bari:'AS Bari',
});
const yearArgument = option('years', 'all');
const years = yearArgument === 'all' ? Array.from({length:36}, (_,i) => 1990+i) : yearArgument.split(',').map(Number);
const offline = process.argv.includes('--offline');
const quiet = process.argv.includes('--quiet');
const compressCache=process.argv.includes('--compress-cache');
const requestedClubs=process.argv.find(arg=>arg.startsWith('--clubs='))?.split('=')[1].split(',');
const requestedLeagues=option('leagues','').split(',').filter(Boolean);
const prioritizeGaps=option('priority','balanced')==='gaps';
const maxRequests = Number(option('max-requests', '250'));
const maxJobs = Number(option('max-jobs', offline ? '100000' : '1000'));
const batchSize=Math.max(1,Math.min(50,Number(option('batch-size','50'))));
const discoveryLanguage=option('discover-language','');
if(discoveryLanguage&&!['es'].includes(discoveryLanguage))throw Error('Only reviewed discovery provider es.wikipedia.org is supported');
const alternativeDiscoveries=[];
const hash = data => createHash('sha256').update(data).digest('hex');
// One directory snapshot avoids tens of thousands of failed filesystem reads
// for missing biographies. Each successful download extends the snapshot.
const cacheFiles=new Set(await fs.readdir(cache));
async function readCache(title){
 const name=`${hash(title)}.json`;
 for(const suffix of ['', '.gz'])if(cacheFiles.has(`${name}${suffix}`))try{const bytes=await fs.readFile(`${cache}/${name}${suffix}`);return JSON.parse((suffix?gunzipSync(bytes):bytes).toString('utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 return null;
}
async function hasCache(title){
 const name=`${hash(title)}.json`;
 return cacheFiles.has(name)||cacheFiles.has(`${name}.gz`);
}
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
let requests = 0;
let nextRequest = 0;
let networkBlocked=null;
const minimumFreeBytes=Number(option('min-free-mb','160'))*1024*1024;
async function rateLimit() { if (requests >= maxRequests) throw Error('Request budget exhausted'); const now=Date.now(), at=Math.max(now,nextRequest);nextRequest=at+1800;await sleep(at-now);requests++; }
async function prefetchIdentities(titles,phase='identities') {
 if(offline || networkBlocked || requests >= maxRequests)return;
 const missing=[];
 for(const title of new Set(titles))if(!await hasCache(title))missing.push(title);
 for(let offset=0;offset<missing.length;offset+=batchSize) {
  if(requests >= maxRequests || networkBlocked)break;
  const batch=missing.slice(offset,offset+batchSize);
  const params=new URLSearchParams({action:'query',format:'json',formatversion:'2',prop:'revisions',rvprop:'ids|timestamp|content',rvslots:'main',redirects:'1',maxlag:'5',titles:batch.join('|')});
  for(let attempt=0;attempt<3;attempt++) {
   try {
    const disk=await fs.statfs('.');
    if(disk.bavail*disk.bsize<minimumFreeBytes){networkBlocked='minimum-free-disk-reserve';break;}
    await rateLimit();
    const response=await fetchWikimedia(`https://en.wikipedia.org/w/api.php?${params}`,{headers:{'User-Agent':'GameLockArchive/1.0 (historical football facts; gamelockweb@gmail.com)'}});
    if(response.status===429||response.status===503){const delay=Math.max(30,Number(response.headers.get('retry-after'))||30)*1000;nextRequest=Math.max(nextRequest,Date.now()+delay);await backoffWikimedia(delay,`enwiki-http-${response.status}`);throw Error('Server requested backoff');}
    if(!response.ok)throw Error(`HTTP${response.status}`);
    const data=await response.json();if(data.error?.code==='maxlag'){nextRequest=Math.max(nextRequest,Date.now()+30000);await backoffWikimedia(30000,'enwiki-maxlag');throw Error('Server replication lag');}if(!data.query?.pages)throw Error('No revision pages');
    const redirects=new Map([...(data.query.normalized||[]),...(data.query.redirects||[])].map(item=>[item.from,item.to]));
    const pages=new Map(data.query.pages.map(item=>[item.title,item]));
    for(const title of batch) {
     let canonical=title;const visited=new Set();
     while(redirects.has(canonical)&&!visited.has(canonical)){visited.add(canonical);canonical=redirects.get(canonical);}
     const p=pages.get(canonical);if(!p)continue;
     const revision=p.revisions?.[0],text=revision?.slots?.main?.content;
     if(!p.missing && typeof text!=='string')continue;
     const record=p.missing?{title,missing:true}:{title:p.title,pageId:p.pageid,revision:revision.revid,timestamp:revision.timestamp,text};
     const compressed=compressCache&&record.text?.length>1024;
     const target=`${cache}/${hash(title)}.json${compressed?'.gz':''}`,serialized=JSON.stringify(record);
     await fs.writeFile(`${target}.tmp`,compressed?gzipSync(serialized):serialized);await fs.rename(`${target}.tmp`,target);
     cacheFiles.add(`${hash(title)}.json${compressed?'.gz':''}`);
    }
    await fs.writeFile(`${reportDirectory}/network.json`,JSON.stringify({phase,requests,maxRequests,completedTitles:Math.min(offset+batch.length,missing.length),totalTitles:missing.length,at:new Date().toISOString()}));
    break;
   }catch(error){if(attempt===2)console.warn(`Revision batch: ${error.message}; incomplete rows remain pending for a later run.`);else await sleep(700*(attempt+1));}
  }
 }
}
// A targeted online run only fills the source cache. Rebuild the complete archive
// offline afterwards, so partial downloads never replace the published dataset.
const cacheOnly=process.argv.includes('--cache-only') || (Boolean(requestedClubs) && !process.argv.includes('--publish'));
const previous = JSON.parse(await fs.readFile('src/games/sports/manager/wikimedia-rosters.json','utf8'));
// Always merge with the published archive. A bounded or interrupted research
// pass cannot remove validated clubs or years outside its selected scope.
const seasons=structuredClone(previous.seasons), rejected=[], accepted=[], omittedRows=[];
const rosterRowsCache=new Map();
const parsedRows=(source,requireSquadSection=false)=>{
 const key=`${source.pageId}:${source.revision}:${requireSquadSection}`;
 if(!rosterRowsCache.has(key))rosterRowsCache.set(key,parseWikiRoster(source.text,countries,{requireSquadSection}));
 return rosterRowsCache.get(key);
};
let globalIdentityPrefetchFinished=false;
const birthCache=new Map();
const identityCache=new Map();
const biographyFactsCache=new Map();
async function cachedIdentity(article){
 if(identityCache.has(article))return identityCache.get(article);
 let identity;try{identity=await readCache(article);}catch{}
 // Keep compact evidence after extracting DOB. Repeated player-seasons should
 // not reopen and parse a biography thousands of times during offline rebuilds.
 const key=identity?.pageId?`${identity.pageId}:${identity.revision}`:null;
 if(key&&!biographyFactsCache.has(key))biographyFactsCache.set(key,identity.text?wikiPlayerFootballFacts(identity.text):null);
 const facts=key?biographyFactsCache.get(key):null;
 const result=facts?{verified:true,title:identity.title,pageId:identity.pageId,revision:identity.revision,timestamp:identity.timestamp,...facts}:{verified:false,reason:identity?.missing?'biography-page-missing':identity?.text?'biography-not-association-football':'biography-not-fetched'};
 if(result||offline)identityCache.set(article,result);return result;
}
const biographyBirthDate=identity=>{
 if(identity?.birthDate)return identity.birthDate;
 if(!identity?.text)return null;
 const key=`${identity.pageId}:${identity.revision}`;
 if(!birthCache.has(key))birthCache.set(key,wikiPlayerBirthDate(identity.text));
 return birthCache.get(key);
};
async function importRoster({year,id,title,competitionId,name,season}){
 let source; try { source=await readCache(title); } catch {}
 if(!source||source.missing){
  rejected.push({year,id,title,reason:source?.missing?'missing-page':'not-fetched'});
  if(source?.missing&&discoveryLanguage&&!offline&&requests<maxRequests){
   // Search results are leads, not validated squads. Never turn a current club
   // page or an old revision timestamp into historical membership evidence.
   const clubTitle=title.replace(/^\d{4}(?:–\d{2})? /,'').replace(/ season$/,'');
   const params=new URLSearchParams({action:'query',format:'json',formatversion:'2',list:'search',srsearch:`"${clubTitle}" "${year}"`,srnamespace:'0|104',srlimit:'5',srprop:'timestamp',meta:'siteinfo',siprop:'rightsinfo'});
   try{
    await rateLimit();const response=await fetchWikimedia(`https://${discoveryLanguage}.wikipedia.org/w/api.php?${params}`,{headers:{'User-Agent':'GameLockArchive/1.0 (historical football facts; gamelockweb@gmail.com)'}});
    if(response.status===429){const delay=Math.max(30,Number(response.headers.get('retry-after'))||30)*1000;nextRequest=Math.max(nextRequest,Date.now()+delay);await backoffWikimedia(delay,`${discoveryLanguage}wiki-http-429`);}
    if(!response.ok)throw Error(`HTTP${response.status}`);
    const data=await response.json();
    alternativeDiscoveries.push({year,id,competitionId,language:discoveryLanguage,query:params.get('srsearch'),rightsInfo:data.query?.rightsinfo,reviewStatus:'requires-explicit-season-evidence-and-parser-review',candidates:(data.query?.search||[]).map(page=>({title:page.title,pageId:page.pageid,url:`https://${discoveryLanguage}.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ','_'))}`,candidateKind:new RegExp(`${year}[-–/](?:${year+1}|${String(year+1).slice(-2)})(?![0-9])`).test(page.title)?'matching-season-title-needs-club-and-squad-validation':'general-reference-not-a-validated-season-squad'}))});
   }catch(error){alternativeDiscoveries.push({year,id,language:discoveryLanguage,status:'discovery-failed',error:error.message});}
  }
  return;
 }
 const expectedPrefix=season.replace('/','–');
 if(!source.title.replaceAll('-', '–').startsWith(`${expectedPrefix} `) || !/ season$/i.test(source.title)) {
  rejected.push({year,id,title,redirect:source.title,reason:'not-the-requested-season'});return;
 }
 const allRows=parsedRows(source), rows=allRows.length>=11&&allRows.some(row=>row.position==='GK')?allRows:parsedRows(source,true);
 // A successfully re-read source invalidated by stricter identity rules must
 // not leave its stale, unverified fragment in the merge from an older run.
 if(seasons[year]?.[id]?.revision===String(source.revision))delete seasons[year][id];
 let players=[];const seenIdentities=new Set(), playerArticles=new Map();
 if(!rows.length){rejected.push({year,id,title,reason:'insufficient-structured-rows',rows:allRows.length});return;}
 if(!globalIdentityPrefetchFinished)await prefetchIdentities(rows.map(row=>row.article).filter(Boolean));
 for(const row of rows){
  if(!world.countries[row.nationality]){omittedRows.push({year,id,name:row.name,reason:'unsupported-nationality',nationality:row.nationality});continue;}
  const resolved=row.article?await cachedIdentity(row.article):null;
  const identity=resolved?.verified?resolved:null;
  if(resolved&&!resolved.verified&&!row.birthDate){omittedRows.push({year,id,name:row.name,reason:resolved.reason});continue;}
  if(identity?.careerEvidence?.allSeniorPeriodsClosed&&identity.careerEvidence.lastSeniorYear<year&&String(identity.timestamp||'')>=`${year+1}-01-01`){omittedRows.push({year,id,name:row.name,reason:'biography-senior-career-ended-before-season',lastSeniorYear:identity.careerEvidence.lastSeniorYear,identitySource:`https://en.wikipedia.org/w/index.php?oldid=${identity.revision}`});continue;}
  if(identity?.birthDate&&year-Number(identity.birthDate.slice(0,4))>43&&!identity.seniorPeriods?.some(period=>period.from<=year&&(period.to===null||period.to>=year))){omittedRows.push({year,id,name:row.name,reason:'veteran-season-not-supported-by-senior-career',identitySource:`https://en.wikipedia.org/w/index.php?oldid=${identity.revision}`});continue;}
  if(!row.birthDate){row.birthDate=biographyBirthDate(identity);row.birthYear=row.birthDate?Number(row.birthDate.slice(0,4)):null;}
  const biographyBirth=biographyBirthDate(identity);
  if(row.birthDate && biographyBirth && row.birthDate!==biographyBirth){omittedRows.push({year,id,name:row.name,reason:'birth-date-conflict',rosterBirthDate:row.birthDate,biographyBirthDate:biographyBirth});continue;}
  if(!row.birthDate || row.birthYear>year-14 || row.birthYear<year-65){omittedRows.push({year,id,name:row.name,reason:row.birthDate?'outside-age-range':'missing-birth-date'});continue;}
  const identityKey=identity?.pageId?`enwiki:${identity.pageId}`:`literal:${row.name}:${row.birthDate}`;
  if(seenIdentities.has(identityKey))continue;
  seenIdentities.add(identityKey);
  const {article,...player}=row;
  // Statistics often abbreviate a name to initials. The linked biography's
  // canonical title supplies the documented public name and stable identity.
  if(identity?.pageId && identity.title)player.name=identity.title.replace(/ \([^)]*\)$/,'');
  const validated={...player,...(identity?.pageId?{identityPageId:identity.pageId,identitySource:`https://en.wikipedia.org/w/index.php?oldid=${identity.revision}`}:{identityEvidence:'dated roster row; no resolved individual biography'})};
  players.push(validated);playerArticles.set(validated,article||`literal:${row.name}:${row.birthDate}`);
 }
 // A small fragment is useful only with an explicit squad section. Keep every
 // per-player check; lowering the list threshold cannot turn scorers or awards
 // into a historical first-team roster.
 if(players.length<11||!players.some(p=>p.position==='GK')){const explicit=new Set(parsedRows(source,true).map(row=>row.article||`literal:${row.name}:${row.birthDate}`));players=players.filter(player=>explicit.has(playerArticles.get(player)));}
 if(!players.length){rejected.push({year,id,title,reason:'insufficient-identified-players',rows:rows.length,players:0});return;}
 (seasons[year] ||= {})[id]={name,competitionId,source:`https://en.wikipedia.org/w/index.php?oldid=${source.revision}`,sourceSha256:hash(source.text),revision:String(source.revision),
  license:'CC-BY-SA-4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',attribution:`Contributors to English Wikipedia, ${source.title}; extracted names, birth dates, nationalities and positions. Structured adaptation by GameLock.`,
  historyUrl:`https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(source.title)}&action=history`,precision:'season',season,complete:false,parsedRows:rows.length,validatedRows:players.length,players};
 accepted.push({year,id,competitionId,players:players.length});
 if(!quiet)console.log(JSON.stringify({year,club:id,players:players.length}));
}
const jobs=[], uncovered=[];
const inheritedArticles=new Map();
for(const [,leagues]of Object.entries(memberships.seasons))for(const league of Object.values(leagues))for(const team of league.teams)if(team.article)inheritedArticles.set(team.clubId,team.article);
const annualLeagues = new Set(['usa-mls','japan-j1','china-super-league','brasileirao','brasileirao-serie-b','liga1','ligapro-serie-a','copa-de-primera','liga-de-primera','liga-bolivia','liga-futve','liga-dominicana-de-futbol','sweden-allsvenskan','norway-eliteserien']);
for(const year of years)for(const [competitionId,league] of Object.entries(memberships.seasons[year]||{}))for(const team of league.teams){
 if(requestedLeagues.length&&!requestedLeagues.includes(competitionId))continue;
 const id=team.clubId, article=clubs[id] || team.article || inheritedArticles.get(team.clubId);
 if(requestedClubs && !requestedClubs.includes(id))continue;
 if(!article){uncovered.push({year,competitionId,id,reason:'no-verified-article-alias'});continue;}
 const annual=annualLeagues.has(competitionId) || (competitionId==='liga-uruguaya' && year>=2016) || (competitionId==='liga-profesional' && year>=2015);
 const sourceSeason=String(league.season||'').match(/^(\d{4})(?:[-–/](\d{2}|\d{4}))?$/);
 const season=sourceSeason && Number(sourceSeason[1])===year ? (sourceSeason[2]?`${year}/${sourceSeason[2].slice(-2)}`:String(year)) : annual?String(year):`${year}/${String(year+1).slice(-2)}`;
 jobs.push({year,id,title:`${season.replace('/','–')} ${article} season`,competitionId,name:team.name,season});
}
// Download scarce league/year sources first and rotate across leagues rather
// than exhausting the history of the richest league before visiting another.
const buckets=new Map();
const anchorYears=prioritizeGaps?[1990,1991,1992,1993,1994,1995,1996,1997,1998,1999,2000,2025,2024,2013,2010,2005,2020,2015,2012]:[2025,2024,2013,2000,1990,2010,2005,1995,2020,2015,2012];
const coveredLeagues=new Set(Object.values(previous.seasons).flatMap(clubs=>Object.values(clubs).map(roster=>roster.competitionId)));
jobs.sort((a,b)=>(prioritizeGaps?(Number(coveredLeagues.has(a.competitionId))-Number(coveredLeagues.has(b.competitionId))):0) || (anchorYears.includes(a.year)?anchorYears.indexOf(a.year):50+a.year)-(anchorYears.includes(b.year)?anchorYears.indexOf(b.year):50+b.year) || a.competitionId.localeCompare(b.competitionId));
for(const job of jobs){const key=`${job.competitionId}:${job.year}`,bucket=buckets.get(key)||[];bucket.push(job);buckets.set(key,bucket);}
for(const bucket of buckets.values())bucket.sort((a,b)=>(previous.seasons[a.year]?.[a.id]?1:0)-(previous.seasons[b.year]?.[b.id]?1:0) || a.id.localeCompare(b.id));
const ordered=[];while([...buckets.values()].some(bucket=>bucket.length))for(const bucket of buckets.values())if(bucket.length)ordered.push(bucket.shift());
const cached=[];const fresh=[];
for(const job of ordered){if(await hasCache(job.title))cached.push(job);else fresh.push(job);}
const selected=offline?cached:[...fresh.slice(0,Math.max(0,maxJobs)),...cached];
await fs.writeFile(`${reportDirectory}/plan.json`,JSON.stringify({years,candidates:jobs.length,cached:cached.length,selected:selected.length,missingAliases:uncovered.length,maxRequests,maxJobs},null,2));
await prefetchIdentities(offline?[]:selected.filter(job=>fresh.includes(job)).map(job=>job.title),'season-pages');
if(!offline&&option('identity-batch','global')==='global'){
 const identities=new Set();let scanned=0,structuredLists=0;
 for(const job of selected){
  let source;try{source=await readCache(job.title);}catch{}
  if(source?.text&&source.title.replaceAll('-', '–').startsWith(`${job.season.replace('/','–')} `)&&/ season$/i.test(source.title)){
   const allRows=parsedRows(source),rows=allRows.length>=11&&allRows.some(row=>row.position==='GK')?allRows:parsedRows(source,true);
   if(rows.length){structuredLists++;for(const row of rows)if(row.article&&world.countries[row.nationality])identities.add(row.article);}
  }
  if(++scanned%100===0)await fs.writeFile(`${reportDirectory}/preflight.json`,JSON.stringify({processed:scanned,total:selected.length,structuredLists,uniquePlayerTitles:identities.size,requests}));
 }
 await prefetchIdentities([...identities],'all-roster-identities');
 globalIdentityPrefetchFinished=true;
}
let cursor=0;
// Sequential parsing keeps the request budget and checkpoint deterministic.
while(cursor<selected.length){await importRoster(selected[cursor++]);if(cursor%25===0)await fs.writeFile(`${reportDirectory}/checkpoint.json`,JSON.stringify({processed:cursor,total:selected.length,requests,accepted:accepted.length,networkBlocked}));}
// Cross-season contradictions are evidence gaps, not an invitation to choose
// whichever list was processed last. Quarantine unresolved identities globally.
const birthEvidence=new Map(), identityOf=player=>player.identityPageId||player.identitySource;
for(const clubs of Object.values(seasons))for(const roster of Object.values(clubs))for(const player of roster.players){const identity=identityOf(player);if(!identity)continue;const dates=birthEvidence.get(identity)||new Set();dates.add(player.birthDate);birthEvidence.set(identity,dates);}
const disputedBirths=new Set([...birthEvidence].filter(([,dates])=>dates.size>1).map(([identity])=>identity));
for(const [year,clubs]of Object.entries(seasons))for(const [id,roster]of Object.entries(clubs)){
 roster.players=roster.players.filter(player=>{if(!disputedBirths.has(identityOf(player)))return true;omittedRows.push({year:Number(year),id,name:player.name,reason:'cross-season-birth-date-conflict'});return false;});
 if(roster.validatedRows!==undefined)roster.validatedRows=roster.players.length;
 if(!roster.players.length){delete clubs[id];rejected.push({year:Number(year),id,reason:'insufficient-players-after-identity-quarantine'});}
}
const result={revision:'2026-10-11-wikimedia-rosters-v6',license:'CC-BY-SA-4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',seasons,rejected};
const count=Object.values(seasons).reduce((n,s)=>n+Object.values(s).reduce((m,c)=>m+c.players.length,0),0);
if(!count)throw Error('No usable rosters; previous output preserved');
await fs.mkdir('public/data/football-manager',{recursive:true});
for(const target of cacheOnly ? [] : ['src/games/sports/manager/wikimedia-rosters.json','public/data/football-manager/wikimedia-rosters.json']) {
 await fs.writeFile(`${target}.tmp`,JSON.stringify(result));
 await fs.rename(`${target}.tmp`,target);
}
console.log(JSON.stringify({requests,rosters:Object.values(seasons).reduce((n,s)=>n+Object.keys(s).length,0),players:count,rejected:rejected.length}));
const coverage={};
for(const [year,leagues]of Object.entries(memberships.seasons))for(const [id,league]of Object.entries(leagues)){
 const rosters=league.teams.filter(team=>seasons[year]?.[team.clubId]);
 (coverage[id]||={})[year]={clubs:league.teams.length,documentedSeasonLists:rosters.length,playerSeasonRows:rosters.reduce((n,team)=>n+seasons[year][team.clubId].players.length,0),missingClubIds:league.teams.filter(team=>!seasons[year]?.[team.clubId]).map(team=>team.clubId)};
}
await fs.writeFile(`${reportDirectory}/coverage.json`,JSON.stringify({revision:result.revision,published:!cacheOnly,requests,accepted:accepted.length,rosters:Object.values(seasons).reduce((n,s)=>n+Object.keys(s).length,0),players:count,coverage,rejected,uncovered,omittedRows},null,2));
// A bounded pass must distinguish evidence that is absent from research that
// has never been attempted. Retain every candidate, including outside max-jobs.
const candidateStatus=[];
const failures=new Map(rejected.map(row=>[`${row.year}:${row.id}`,row]));
for(const job of jobs){
 let source;try{source=await readCache(job.title);}catch{}
 const failure=failures.get(`${job.year}:${job.id}`);
 candidateStatus.push({...job,status:seasons[job.year]?.[job.id]?'published-season-list':!source?'not-attempted':source.missing?'source-page-missing':failure?.reason||'cached-awaiting-processing',...(source?.revision?{sourceRevision:String(source.revision)}:{})});
}
await fs.writeFile(`${reportDirectory}/candidates.json`,JSON.stringify({revision:result.revision,scope:{years,leagues:requestedLeagues},candidates:candidateStatus,missingAliases:uncovered,alternativeDiscoveries},null,2));
