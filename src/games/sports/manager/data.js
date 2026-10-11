import { world } from '../trayectoria/world.js';
import historicalResults from './historical-results.json';
import playerMemberships from './player-memberships.json';
import historicalRosters from './historical-rosters.json';
import { getSeasonRosterArchive as seasonRosters, getSeasonRosterRecords, unambiguousSeasonPlayers, linkedPlayerIdentities, identitiesCompatible } from './season-roster-archive.js';
import { getVerifiedCareerRecords } from './verified-career-provider.js';
import { playerClubAtDate } from './providers.js';
import { rosterSnapshots, careerSeeds } from './rosters.js';
import { RESERVE_PARENTS } from './competitions.js';
import { playerIdentity } from './roster-providers.js';
import { editorialRosters, editorialSeasonEvidence } from './editorial-rosters.js';
import { getPlayerAge } from './player-age.js';
import { hasPlayableRealDepth } from './roster-depth.js';
import { getAvailableLeagues, getSeasonParticipants, getUnavailableLeagues, managerLeagueCatalog, membershipArchiveRevision } from './league-memberships.js';
export { getAvailableYears, getAvailableLeagues, getLeagueSeasonCoverage } from './league-memberships.js';

export const dataSources = [
  { id: 'wikimedia-verified-careers', name: 'Trayectorias históricas de Wikimedia', license: 'CC-BY-SA-4.0', url: 'https://en.wikipedia.org/', scope: 'Biografías individuales con períodos cerrados por club. Solo se admiten años interiores inequívocos; se excluyen años de entrada y salida, préstamos y solapamientos. Son afiliaciones parciales, no plantillas completas ni fechas exactas de inscripción.' },
  { id: 'openfootball-historical', name: 'OpenFootball v0-format / MLS y plantillas históricas', license: 'CC0-1.0', url: 'https://github.com/openfootball/v0-format', scope: 'Listas parciales de 2005–2015, cruzadas con identidades fechadas de OpenFootball y Wikidata. Cada registro conserva fuente y revisión; no acredita una plantilla completa ni una fecha exacta de traspaso.' },
  { id: 'research-match-sheets', name: 'Pappalardo et al. / convocatorias 2017', license: 'CC-BY-4.0', url: 'https://doi.org/10.1038/s41597-019-0247-7', scope: 'Convocatorias de 98 clubes en cinco ligas antes del 1 de septiembre de 2017. Ausencias, lesiones y fichajes de última hora pueden dejar huecos; no demuestra inscripción continua. Valoraciones estimadas.' },
  { id: 'league-participants', name: 'Archivo de participantes FootballCSV / OpenFootball', license: 'CC0-1.0', url: 'https://github.com/footballcsv', scope: 'Listas completas por temporada, importadas de calendarios con revisión y huella SHA-256. Las combinaciones sin cobertura no se pueden seleccionar; no se sustituyen por el catálogo moderno.' },
  { id: 'wikimedia-participants', name: 'Participantes históricos de Wikimedia', license: 'CC-BY-SA-4.0', url: 'https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use/en#7._Licensing_of_Content', scope: 'Tablas completas de participantes y fases de torneos regionales. Cada temporada conserva revisión, atribución, licencia y enlace; no implica verificación oficial de la federación.' },
  { id: 'wikimedia-squads', name: 'Plantillas históricas de Wikimedia', license: 'CC-BY-SA-4.0', url: 'https://en.wikipedia.org/', scope: 'Listas de temporada con identidad y fecha de nacimiento documentadas. Se excluyen cesiones salientes y afiliaciones ambiguas entre clubes. Cada lista conserva atribución y revisión. Las valoraciones son estimaciones originales.' },
  { id: 'openfootball', name: 'Openfootball / football.json', license: 'CC0-1.0', url: 'https://github.com/openfootball/football.json', scope: 'Participantes de temporadas disponibles y resultados de la temporada anterior; no atributos oficiales de jugadores.' },
  { id: 'openfootball-squads', name: 'OpenFootball / plantillas por temporada', license: 'CC0-1.0', url: 'https://github.com/openfootball/england/tree/master/2023-24/squads', scope: 'Plantillas disponibles de Inglaterra, España, Alemania, Italia y Austria. Afiliación de temporada, con jugadores juveniles y fichajes de invierno; no un corte exacto del 1 de septiembre. Cada lista enlaza su archivo y temporada.' },
  { id: 'wikidata', name: 'Wikidata', license: 'CC0-1.0', url: 'https://www.wikidata.org/wiki/Wikidata:Licensing', scope: 'API pública de identidad, nacimiento y períodos de pertenencia. Su cobertura histórica puede ser incompleta.' },
  { id: 'curated', name: 'Selección histórica editorial', license: 'Datos factuales; estimaciones originales del juego', url: 'https://players.fcbarcelona.com/en/chronology/2012', scope: 'Selección de jugadores reales y pertenencias por temporada; medias, potenciales, valores y presupuestos estimados, no estadísticas oficiales.' },
  { id: 'curated-verified', name: 'Archivo contrastado con clubes y federaciones', license: 'Hechos contrastados; valoraciones originales del juego. Las fuentes conservan sus derechos.', url: 'https://datencenter.dfb.de/competitions/champions-league/seasons/2013-2014/teams/real-madrid', scope: 'Madrid 2009 y Madrid, Barcelona y Bayern 2013: plantillas sénior documentadas. El corte de 2013 es el 3 de septiembre, después del cierre de mercado. Cada jugador enlaza su evidencia; medias y potenciales son estimaciones.' },
  { id: 'trayectoria', name: 'Catálogo y recursos de Carrera Futbolera', license: 'Licencias originales de cada recurso; las marcas no se relicencian', url: '/assets/football/', scope: 'Clubes, países, escudos, logos y trofeos ya presentes. El catálogo no abarca todas las ligas del mundo.' },
];

const FIRST_YEAR = 1990;
const LAST_YEAR = 2025;
const POSITIONS = ['GK','GK','DF','DF','DF','DF','DF','DF','DF','MF','MF','MF','MF','MF','MF','MF','FW','FW','FW','FW','FW','FW'];
const ERA_CLUB_RATINGS = {
  2012: { barcelona:92, 'real-madrid':91, 'bayern-munchen':88, 'borussia-dortmund':85, 'manchester-united':86, 'manchester-city':86, chelsea:85, arsenal:82, liverpool:79, tottenham:82, juventus:85, 'ac-milan':81, inter:79, napoli:82, 'as-roma':78, 'atletico-madrid':83, malaga:79, valencia:81, 'athletic-club':78, 'paris-saint-germain':83, montpellier:77, lyon:79, porto:79, santos:77, monaco:64, 'rb-leipzig':47 },
  2025: { barcelona:89, 'real-madrid':89, 'paris-saint-germain':91, liverpool:89, arsenal:88, 'manchester-city':87, 'bayern-munchen':88, inter:87, napoli:84, chelsea:85, 'atletico-madrid':85, 'manchester-united':77, tottenham:78, juventus:82, 'ac-milan':80, 'borussia-dortmund':82, 'bayer-leverkusen':83, newcastle:84, 'aston-villa':83 },
};

// New clubs must not appear in seasons before their existence. Other membership
// gaps are still explicitly labelled estimated rather than presented as history.
const ESTABLISHED = { 'rb-leipzig':2009, 'inter-miami':2018, 'atlanta-united':2014, 'charlotte-fc':2019, 'austin-fc':2018, 'fc-cincinnati':2015, 'los-angeles-fc':2014, 'nashville-sc':2016, 'new-york-city-fc':2013, 'orlando-city':2010, 'philadelphia-union':2008, 'san-diego-fc':2023, 'st-louis-city-sc':2019, 'fc-juarez':2015, 'atletico-san-luis':2013, 'fc-andorra':1942, 'rb-bragantino':1928, 'wieczysta-krakow':1942 };

export function getManagerSnapshotDate(year) { return `${year}-09-${Number(year)===2013?'03':'01'}`; }

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const slug = (name) => name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function hash(input) { let h=2166136261; for (const char of String(input)) h=Math.imul(h ^ char.charCodeAt(0),16777619); return h>>>0; }
function playerEconomics(rating, potential, age, year) {
  const moneyScale = Math.max(.18, Math.pow(1.047, year - 2025));
  const ageScale = age <= 22 ? 1.2 : age > 32 ? .35 : age > 29 ? .7 : 1;
  const elitePremium = Math.pow(1.08,Math.max(0,rating-75));
  const value = Math.round((Math.pow(Math.max(1,rating-43),2.65)*950*elitePremium + Math.max(0,potential-rating)*170000)*moneyScale*ageScale/10000)*10000;
  return { value:Math.max(20000,value), wage:Math.max(500,Math.round(value*.0011/100)*100) };
}

function makePlayer(name,birthYear,nationality,position,rating,potential,clubId,year,source='curated') {
  const age=year-birthYear;
  return { id:slug(name),name,clubId,birthYear,age,nationality,position,rating,potential,real:true,source,ratingSource:'editorial-estimate', ...playerEconomics(rating,potential,age,year) };
}

function readCuratedPlayers(year, clubIds) {
  const players = new Map();
  for (const [clubId,rows] of Object.entries(rosterSnapshots[year] ?? {})) {
    if (!clubIds.has(clubId)) continue;
    const evidence=editorialRosters[year]?.[clubId]??editorialSeasonEvidence[year]?.[clubId];
    for (const row of rows.split('\n')) {
      const [name,birth,nationality,position,rating,potential] = row.split('|');
      const birthYear=Number(birth?.slice(0,4));
      if (!name || year-birthYear<16) continue;
      const player=makePlayer(name,birthYear,nationality,position,Number(rating),Number(potential),clubId,year,evidence?'curated-verified':'curated');
      if(birth.length===10)player.birthDate=birth;
      if(evidence)Object.assign(player,{sourceUrl:evidence.sourceUrl,membershipVerified:true,membershipPrecision:evidence.precision,membershipSeason:`${year}/${String(year+1).slice(-2)}`,
        ...(evidence.precision==='exact-snapshot'?{membershipDate:evidence.asOf}:{}),evidenceSources:evidence.sources??[evidence.sourceUrl],
        ...(evidence.sourceLicense?{sourceLicense:evidence.sourceLicense,sourceAttribution:evidence.sourceAttribution}:{}),
        ...(evidence.attributionUrl?{attributionUrl:evidence.attributionUrl}:{}),
      });
      const personEvidence=evidence?.playerEvidence?.[name];
      if(personEvidence)for(const key of ['birthDate','identitySourceUrl','identityPageId','identityWiki','wikidataId']){
        if(personEvidence[key]!=null)player[key]=personEvidence[key];
      }
      if (players.has(player.id)) throw new Error(`Duplicated historical player: ${name} (${year})`);
      players.set(player.id,player);
    }
  }
  for (const [name,birth,nationality,position,peak,potential,segments] of careerSeeds) {
    if (players.has(slug(name)) || year-birth<16) continue;
    const segment=segments.find(([from,to,clubId])=>year>=from&&year<=to&&clubIds.has(clubId));
    if (!segment) continue;
    // A complete audited squad is authoritative, including known departures.
    if(editorialRosters[year]?.[segment[2]]?.complete)continue;
    const age=year-birth;
    const peakAge=position==='GK'?31:position==='DF'?29:27;
    const maturityPenalty=Math.max(0,peakAge-age)*(position==='GK'?1.3:1.65);
    const decline=Math.max(0,age-(position==='GK'?35:31))*1.8;
    const rating=clamp(Math.round(peak-maturityPenalty-decline),55,peak);
    const player=makePlayer(name,birth,nationality,position,rating,Math.max(rating,age<28?potential:rating+1),segment[2],year,'curated-career');
    players.set(player.id,player);
  }
  return [...players.values()];
}

const PLAYER_ALIASES={
  'xavi:1980':'Xavi Hernández','ronaldo:1976':'Ronaldo Nazário','raul:1977':'Raúl González',
  'gabriel:1997':'Gabriel Magalhães','gabriel barbosa:1996':'Gabigol','rodri:1996':'Rodri Hernández',
  'vinicius:2000':'Vinícius Júnior','nacho:1990':'Nacho Fernández','pedro:1987':'Pedro Rodríguez',
  'adriano:1984':'Adriano Correia','daniel alves:1983':'Dani Alves',
  'neymar jr:1992':'Neymar','alexandre song:1987':'Alex Song',
  'vitor borba ferreira:1972':'Rivaldo','edson arantes do nascimento:1940':'Pelé',
  'marcelo vieira:1988':'Marcelo','daniel carvajal:1992':'Dani Carvajal',
};
const DATED_PLAYER_ALIASES={
  'thiago:1991':['1991-04-11','Thiago Alcântara'],'joaquin:1981':['1981-07-21','Joaquín Sánchez'],
  'rafinha:1993':['1993-02-12','Rafinha Alcântara'],'oier:1989':['1989-09-14','Oier Olazábal'],
  'jese:1993':['1993-02-26','Jesé Rodríguez'],
};
const canonicalName=(name,birthYear,birthDate)=>{
  const key=playerIdentity(name,birthYear),dated=DATED_PLAYER_ALIASES[key];
  return PLAYER_ALIASES[key]??(dated&&dated[0]===birthDate?dated[1]:name);
};
const identity=player=>playerIdentity(canonicalName(player.name,player.birthYear,player.birthDate),player.birthYear);
// CC0 records retain priority where both archives cover the same club. Exact
// editorial snapshots and dated, evidenced memberships precede either archive.


function addImportedPlayers(players,clubMap,year) {
  const existing=new Map();
  const rememberIdentity=player=>{const key=identity(player);if(!existing.has(key))existing.set(key,[]);existing.get(key).push(player);};
  for(const player of players)rememberIdentity(player);
  const existingPerson=row=>(existing.get(identity(row))||[]).some(player=>identitiesCompatible(row,player));
  const linkedExisting=new Set(players.flatMap(linkedPlayerIdentities));
  const ids=new Set(players.map(p=>p.id));
  const initialPlayers=[...players];
  const identityBuckets=new Map();
  const cleanName=name=>playerIdentity(name,0).split(':')[0].split(' ').filter(token=>!['de','da','do','dos','del','van','von'].includes(token));
  const remember=player=>{
    const bucketKey=`${player.birthYear}:${player.nationality}`;
    if(!identityBuckets.has(bucketKey))identityBuckets.set(bucketKey,[]);
    identityBuckets.get(bucketKey).push({player,tokens:cleanName(canonicalName(player.name,player.birthYear,player.birthDate))});
  };
  for(const player of players)remember(player);
  const roleCounts={GK:1,DF:4,MF:3,FW:3};
  const roleCeilings=new Map();
  for(const club of clubMap.values()){
    const limits={};
    for(const position of Object.keys(roleCounts)){
      const known=initialPlayers.filter(p=>p.clubId===club.id&&p.position===position).sort((a,b)=>b.rating-a.rating);
      // Unknown individual ability should not turn a reserve into a documented star.
      if(known.length>=roleCounts[position])limits[position]=known[roleCounts[position]-1].rating-(position==='GK'?5:4);
    }
    roleCeilings.set(club.id,limits);
  }
  const samePerson=row=>{
    const candidate=cleanName(canonicalName(row.fullName||row.name,row.birthYear,row.birthDate));
    return (identityBuckets.get(`${row.birthYear}:${row.nationality}`)??[]).some(({player,tokens:known})=>{
      if(!identitiesCompatible(row,player))return false;
      const shorter=candidate.length<known.length?candidate:known,longer=candidate.length<known.length?known:candidate;
      return shorter.length>=2&&shorter.every(token=>longer.includes(token));
    });
  };
  const candidates=unambiguousSeasonPlayers(getSeasonRosterRecords(year), identity);
  const add=(row,clubId,source,extra)=>{
    const key=identity(row),club=clubMap.get(clubId),age=year-row.birthYear;
    if(editorialRosters[year]?.[clubId]?.complete)return;
    if(linkedPlayerIdentities(row).some(key=>linkedExisting.has(key)))return;
    // Historical evidence can include active veterans beyond 43 (e.g. Buffon
    // at Parma in 2022). This upper bound rejects implausible data, not retirees.
    if(!club||age<16||age>65||existingPerson(row)||samePerson(row))return;
    const youthPenalty=Math.max(0,(row.position==='GK'?24:22)-age)*2.1;
    const veteranPenalty=Math.max(0,age-(row.position==='GK'?36:32))*1.7;
    const reservePenalty=row.shirtNumber>40?6:0;
    const rawRating=Math.round(club.rating-8-youthPenalty-veteranPenalty-reservePenalty);
    const rating=clamp(Math.min(rawRating,roleCeilings.get(clubId)?.[row.position]??86),38,86);
    const potential=clamp(rating+(age<22?Math.round((24-age)*1.7):age<27?3:0),rating,93);
    const player=makePlayer(canonicalName(row.name,row.birthYear,row.birthDate),row.birthYear,row.nationality,row.position,rating,potential,clubId,year,source);
    player.ratingSource='club-age-model-estimate';
    if(ids.has(player.id))player.id+=`-${row.wikidataId??(row.identityPageId?`${row.identityWiki||'en'}-${row.identityPageId}`:row.birthDate??row.birthYear)}`;
    if(ids.has(player.id))return;
    Object.assign(player,extra);players.push(player);rememberIdentity(player);ids.add(player.id);remember(player);
    for(const key of linkedPlayerIdentities(row))linkedExisting.add(key);
  };
  for(const row of historicalRosters.historicalPlayers??[]) {
    if(row.gender!=='male')continue;
    // A century-old open interval is not evidence that a retired player is active.
    const memberships=row.memberships.filter(m=>m.end||Number(m.start?.value.slice(0,4))>=year-12);
    const clubId=playerClubAtDate({memberships},getManagerSnapshotDate(year));
    if(!clubId)continue;
    add(row,clubId,'wikidata-history',{wikidataId:row.wikidataId,birthDate:row.birthDate,sourceUrl:`https://www.wikidata.org/wiki/${row.wikidataId}`,membershipPrecision:'dated-interval',membershipVerified:true});
  }
  for(const row of candidates) {
    const wiki=row.record.license==='CC-BY-SA-4.0', research=row.record.license==='CC-BY-4.0';
    const career=row.record.precision==='year-interior';
    add(row,row.clubId,career?'wikimedia-verified-career':wiki?'wikimedia-season-squad':research?'research-match-sheet':'openfootball-squad',{sourceUrl:row.record.source,sourceLicense:row.record.license||'CC0-1.0',membershipPrecision:career?'year-interior':'season',membershipSeason:row.record.season,shirtNumber:row.shirtNumber,
      identityKeys:linkedPlayerIdentities(row),
      ...(row.birthDateCorrection?{birthDateCorrection:row.birthDateCorrection}:{}),
      ...(row.identityCorrection?{identityCorrection:row.identityCorrection}:{}),
      ...(career?{stintFrom:row.stintFrom,stintTo:row.stintTo}:{}),
      ...(wiki||research?{sourceAttribution:row.record.attribution,sourceLicenseUrl:row.record.licenseUrl,sourceRevision:row.record.revision}:{}),
      ...(research?{researchPlayerId:row.researchPlayerId,evidenceCutoff:row.record.evidenceCutoff,membershipObservations:row.observations}:{}),
      ...(row.birthDate?{birthDate:row.birthDate}:{}),...(row.wikidataId?{wikidataId:row.wikidataId}:{}),...(row.identityPageId?{identityPageId:row.identityPageId,identityWiki:row.identityWiki||'en'}:{}),...(row.identitySource?{identitySourceUrl:row.identitySource}:{})});
  }
}

const FIRST_NAMES = {
  ESP:['Álvaro','Diego','Pablo','Marcos','Adrián','Hugo','Iván','Sergio'], ENG:['James','Oliver','Jack','Harry','George','Charlie','Theo','Alfie'],
  FRA:['Louis','Hugo','Lucas','Léo','Adam','Mathis','Jules','Noah'], GER:['Lukas','Leon','Felix','Jonas','Paul','Finn','Max','Tim'],
  ITA:['Luca','Marco','Andrea','Matteo','Lorenzo','Davide','Simone','Alessio'], POR:['João','Tiago','Diogo','Rui','Miguel','Pedro','André','Rafael'],
  BRA:['Lucas','Gabriel','Rafael','Pedro','Gustavo','Matheus','Felipe','Bruno'], NED:['Daan','Luuk','Bram','Finn','Sem','Lars','Thijs','Jens'],
};
const LAST_NAMES = {
  ESP:['Soler','Navarro','Molina','Serrano','Vega','Torres','Vidal','Mora'], ENG:['Bennett','Collins','Parker','Turner','Walker','Reed','Morgan','Clarke'],
  FRA:['Laurent','Moreau','Dubois','Fournier','Girard','Lambert','Bernard','Petit'], GER:['Weber','Fischer','Schneider','Becker','Wagner','Hoffmann','Schulz','Bauer'],
  ITA:['Rossi','Moretti','Conti','Ricci','Lombardi','Ferrari','Costa','Gallo'], POR:['Pereira','Ferreira','Santos','Costa','Ribeiro','Teixeira','Sousa','Lopes'],
  BRA:['Silva','Santos','Oliveira','Souza','Pereira','Costa','Almeida','Lima'], NED:['de Vries','Jansen','Bakker','Visser','Smit','Bos','Mulder','Dekker'],
};

function generatedPlayer(club,year,index,position,ceiling=91) {
  const seed=hash(`${year}:${club.id}:${index}`);
  const country=club.country;
  const first=FIRST_NAMES[country]??FIRST_NAMES.ESP;
  const last=LAST_NAMES[country]??LAST_NAMES.ESP;
  const age=18+seed%15;
  const rating=clamp(club.rating-5+(seed>>>5)%10-(age<21?7:0),35,ceiling);
  const potential=clamp(rating+(age<24?4+(seed>>>12)%10:1),rating,92);
  return { id:`generated-${year}-${club.id}-${index}`,name:`${first[seed%first.length]} ${last[(seed>>>8)%last.length]}`,clubId:club.id,birthYear:year-age,age,nationality:country,position,rating,potential,real:false,source:'generated',ratingSource:'procedural-estimate', ...playerEconomics(rating,potential,age,year) };
}

/** Synchronous, deterministic, independent worlds; never mutates Carrera data. */
export function getManagerWorld(inputYear=2012) {
  const parsed=Number(inputYear);
  if (!Number.isInteger(parsed)||parsed<FIRST_YEAR||parsed>LAST_YEAR) throw new RangeError(`El año debe estar entre ${FIRST_YEAR} y ${LAST_YEAR}.`);
  const year=parsed;
  const playableCompetitions=getAvailableLeagues(year);
  const competitions=[...playableCompetitions];
  const catalogMap=new Map(managerLeagueCatalog.map(competition=>[competition.id,competition]));
  const competitionMap=new Map(competitions.map(competition=>[competition.id,competition]));
  const realBackgroundClubs=new Set([
    ...getVerifiedCareerRecords(year).map(([club])=>club),
    ...Object.keys(rosterSnapshots[year]??{}),...Object.keys(seasonRosters(year)),
    ...Object.keys(editorialRosters[year]??{}),
    ...careerSeeds.filter(([,birth,,,,,segments])=>year-birth>=16&&segments.some(([from,to])=>year>=from&&year<=to))
      .flatMap(([, , , , , ,segments])=>segments.filter(([from,to])=>year>=from&&year<=to).map(([, ,id])=>id)),
  ]);
  const memberIds=new Set(playableCompetitions.flatMap(competition=>getSeasonParticipants(competition.id,year).map(team=>team.clubId)));
  const clubs=Object.values(world.clubs).filter(club=>year>=(ESTABLISHED[club.id]??0)&&(memberIds.has(club.id)||realBackgroundClubs.has(club.id)))
    .map(club=>({...club,catalogCompetitionId:club.competitionId,competitionId:null,playerIds:[]}));
  const clubMap=new Map(clubs.map(club=>[club.id,club]));
  for(const competition of playableCompetitions){
    const priorRatings=new Map((historicalResults.seasons?.[year]?.[competition.id]?.teams??[]).map(team=>[team.clubId,team]));
    for(const team of getSeasonParticipants(competition.id,year)){
      let club=clubMap.get(team.clubId);
      if(!club){
        club={id:team.clubId,name:team.name,shortName:team.name,abbreviation:team.name.replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase(),color:'#394d70',crest:null,international_reputation:1,continental_reputation:1,domestic_reputation:2,playerIds:[]};
        clubs.push(club);clubMap.set(club.id,club);
      }
      if(club.competitionId)throw new Error(`Club in two historical divisions: ${club.id}`);
      club.competitionId=competition.id;club.selectable=true;club.membershipSource=competition.membershipSource;
      club.membershipSeason=competition.seasonLabel;
      club.seasonName=team.name;
      if(['rb-bragantino','akhmat','cf-montreal','new-york-rb','fc-dallas','sporting-kansas-city','san-jose-earthquakes','atletico-torque','cusco'].includes(club.id)){
        club.name=team.name;club.shortName=team.name;
      }
      const prior=priorRatings.get(team.clubId);
      if(Number.isFinite(prior?.rating)){club.resultRating=prior.rating;club.resultRatingSource=historicalResults.seasons[year][competition.id].ratingSource;}
    }
  }
  // A player may belong to a documented club outside the available leagues.
  // Keep that club in the market without inventing its division's participants.
  for(const club of clubs)if(!club.competitionId){
    const original=catalogMap.get(club.catalogCompetitionId);
    const country=original?.country_fifa_code??'ESP',id=`external:${country}`;
    if(!competitionMap.has(id)){
      const external={id,name:`Clubes externos (${country})`,country_fifa_code:country,confederation:original?.confederation,tier:0,strength:original?.strength??1,simulated:false,selectable:false,historicalMembership:false};
      competitions.push(external);competitionMap.set(id,external);
    }
    club.competitionId=id;club.selectable=false;club.membershipSource='documented-player-background';
  }

  for(const club of clubs) {
    const competition=competitionMap.get(club.competitionId);
    club.country=competition?.country_fifa_code??'ESP';
    const editorial=ERA_CLUB_RATINGS[year]?.[club.id];
    const base=52+(club.international_reputation??0)*4+(competition?.strength??0)*3;
    const leagueAdjustment=Math.max(0,3-(competition?.strength??0))*3+Math.max(0,(competition?.tier??1)-1)*4;
    club.rating=clamp(Math.round(Number.isFinite(club.resultRating)?club.resultRating-leagueAdjustment:editorial??base),35,95);
    club.ratingSource=Number.isFinite(club.resultRating)?'previous-season-results-estimate':'editorial-estimate';
    club.membershipSource??='current-catalog-estimate';
    club.budget=Math.round(Math.pow(Math.max(1,club.rating-43),2.2)*19000*Math.max(.18,Math.pow(1.045,year-2025))/100000)*100000;
    club.budget=Math.max(250000,club.budget);
    if(RESERVE_PARENTS[club.id])club.reserveParentId=RESERVE_PARENTS[club.id];
  }

  let players=readCuratedPlayers(year,new Set(clubMap.keys()));
  addImportedPlayers(players,clubMap,year);
  let verifiedPlayers=0;
  for(const evidence of playerMemberships.players??[]) {
    const player=players.find(p=>p.id===slug(evidence.name));
    if(!player) continue;
    const verifiedClub=playerClubAtDate(evidence,getManagerSnapshotDate(year));
    // Wikidata identity metadata cannot overwrite an independently audited club cut.
    player.birthDate??=evidence.birthDate;
    if(player.birthDate) {player.birthYear=Number(player.birthDate.slice(0,4));player.age=year-player.birthYear;}
    player.wikidataId=evidence.wikidataId;
    player.identitySourceUrl=evidence.source;
    if(verifiedClub&&clubMap.has(verifiedClub)&&!player.membershipVerified) {player.clubId=verifiedClub;player.source='wikidata';player.sourceUrl=evidence.source;player.membershipPrecision='dated-interval';player.membershipVerified=true;verifiedPlayers++;}
  }
  for(const player of players){
    player.age=getPlayerAge(player,getManagerSnapshotDate(year),year);
    Object.assign(player,playerEconomics(player.rating,player.potential,player.age,year));
  }
  players=players.filter(player=>player.age>=16);
  for(const player of players) clubMap.get(player.clubId).playerIds.push(player.id);
  const playerMap=new Map(players.map(p=>[p.id,p]));
  for(const club of clubs) {
    if(editorialRosters[year]?.[club.id]?.complete&&club.playerIds.length>=22)continue;
    if(hasPlayableRealDepth(club.playerIds.map(id=>playerMap.get(id))))continue;
    const counts={GK:0,DF:0,MF:0,FW:0};
    const ceilings={GK:91,DF:91,MF:91,FW:91};
    const starterCounts={GK:1,DF:4,MF:3,FW:3};
    for(const position of Object.keys(ceilings)) {
      const known=club.playerIds.map(id=>playerMap.get(id)).filter(p=>p.position===position).sort((a,b)=>b.rating-a.rating);
      // Fill gaps without inventing stars that displace known first-team players.
      if(known.length) ceilings[position]=Math.max(35,known[Math.min(starterCounts[position],known.length)-1].rating-2);
    }
    for(const id of club.playerIds) counts[playerMap.get(id).position]++;
    let index=0;
    for(const position of POSITIONS) {
      if(counts[position]>0) { counts[position]--;continue; }
      const player=generatedPlayer(club,year,index++,position,ceilings[position]);
      players.push(player);club.playerIds.push(player.id);
    }
  }
  const realPlayers=players.filter(p=>p.real).length;
  const playersByClub=new Map(clubs.map(club=>[club.id,[]]));
  for(const player of players)playersByClub.get(player.clubId).push(player);
  for(const club of clubs){
    const own=playersByClub.get(club.id),real=own.filter(p=>p.real);
    const imported=seasonRosters(year)[club.id];
    const editorial=editorialRosters[year]?.[club.id];
    club.rosterCoverage={realPlayers:real.length,generatedPlayers:own.length-real.length,source:editorial?.sourceUrl??imported?.source??real.find(p=>p.sourceUrl)?.sourceUrl??null,
      ...(imported?.evidenceCutoff?{evidenceCutoff:imported.evidenceCutoff}:{}),
      precision:editorial?.complete?editorial.precision:imported?'season':real.some(p=>p.membershipVerified||p.membershipPrecision==='year-interior')?'mixed-evidence':'editorial',
      ...(editorial?.complete?{snapshotDate:editorial.asOf,note:editorial.note}:{}),complete:own.every(p=>p.real)&&!!editorial?.complete};
  }
  for(const player of players)if(player.real)player.initialClubId=player.clubId;
  verifiedPlayers=players.filter(p=>p.membershipVerified).length;
  const rosterClubs=clubs.filter(c=>c.rosterCoverage.realPlayers>0).length;
  const importedRealPlayers=players.filter(p=>['openfootball-squad','wikidata-history','wikimedia-season-squad','wikimedia-verified-career','research-match-sheet'].includes(p.source)).length;
  const historicalCompetitions=playableCompetitions.length;
  const unavailableLeagues=getUnavailableLeagues(year);
  const coverage={
    label:rosterSnapshots[year]||Object.keys(seasonRosters(year)).length?'Selección histórica ampliada':'Reconstrucción aproximada con afiliaciones documentadas',
    summary:`${historicalCompetitions} de ${managerLeagueCatalog.length} ligas con participantes documentados para ${year}; ${clubs.length} clubes y ${realPlayers} jugadores reales seleccionados. Plantillas restantes generadas; medias, potenciales y finanzas estimados.`,
    totalLeagues:historicalCompetitions,catalogLeagues:managerLeagueCatalog.length,unavailableLeagues,externalClubs:clubs.filter(club=>club.selectable===false).length,totalClubs:clubs.length,realPlayers,generatedPlayers:players.length-realPlayers,historicalCompetitions,verifiedPlayers,rosterClubs,importedRealPlayers,
    seasonRosterClubs:Object.keys(seasonRosters(year)).length,completeRealSquads:clubs.filter(c=>c.rosterCoverage.complete).length,
    quarantinedMemberships:historicalRosters.membershipAudit?.quarantinedMemberships??0,rejectedMemberships:historicalRosters.membershipAudit?.rejectedMemberships??0,
    exhaustive:false,ratingsAreEstimates:true,rostersComplete:false,archiveRevision:membershipArchiveRevision+'-rosters-v12',snapshotDate:getManagerSnapshotDate(year),snapshotCutoff:Object.keys(seasonRosters(year)).length?'Listas documentadas durante la temporada; pueden incluir fichajes de invierno':year===2013?'3 de septiembre de 2013: después del cierre de mercado del día 2':'Cierre del 1 de septiembre del año inicial',
    limitations:[
      'No incluye todas las ligas del mundo ni todas las plantillas históricas.',
      'Los jugadores con etiqueta Generado son ficticios. Las promesas reales tienen potencial estimado, sin garantía de su carrera futura.',
      'Solo se pueden iniciar ligas con participantes documentados para el año elegido. Las demás quedan fuera de la simulación; algunos clubes documentados siguen disponibles para fichajes.',
      'Las edades usan el cumpleaños cuando consta; con solo el año de nacimiento son aproximadas. Las cesiones históricas iniciales solo se representan cuando constan en la selección editorial.',
      'Las valoraciones basadas en resultados usan la temporada anterior; no son atributos oficiales de futbolistas.',
      'Las plantillas de OpenFootball y Wikimedia pueden incluir juveniles y fichajes de invierno: representan la temporada completa, no un corte exacto del 1 de septiembre.',
      'Wikidata tiene lagunas y afiliaciones erróneas: una afiliación solo se usa tras contrastar su evidencia independiente. Los datos sin validar o ambiguos quedan excluidos.',
      'Los cortes editoriales completos cubren solo los primeros equipos indicados. No reconstruyen sus lesiones iniciales ni todas las inscripciones de cantera.',
    ],
  };
  return {year,clubs,competitions,players,countries:Object.values(world.countries),coverage,dataSources};
}
