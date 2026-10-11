import world from './world.data.json';
import historicalResults from './historical-results.json';
import playerMemberships from './player-memberships.json';
import { playerClubAtDate } from './providers.js';
import { rosterSnapshots, careerSeeds } from './rosters.js';

export const dataSources = [
  { id: 'openfootball', name: 'Openfootball / football.json', license: 'CC0-1.0', url: 'https://github.com/openfootball/football.json', scope: 'Participantes de temporadas disponibles y resultados de la temporada anterior. No contiene plantillas ni atributos de jugadores.' },
  { id: 'wikidata', name: 'Wikidata', license: 'CC0-1.0', url: 'https://www.wikidata.org/wiki/Wikidata:Licensing', scope: 'API pública de identidad, nacimiento y períodos de pertenencia. Su cobertura histórica puede ser incompleta.' },
  { id: 'curated', name: 'Selección histórica editorial', license: 'Datos factuales; estimaciones originales del juego', url: 'https://players.fcbarcelona.com/en/chronology/2012', scope: 'Selección de jugadores reales y pertenencias por temporada; medias, potenciales, valores y presupuestos estimados, no estadísticas oficiales.' },
  { id: 'trayectoria', name: 'Catálogo y recursos de Carrera Futbolera', license: 'Licencias originales de cada recurso; las marcas no se relicencian', url: '/assets/football/', scope: 'Clubes, países, escudos, logos y trofeos ya presentes. El catálogo no abarca todas las ligas del mundo.' },
];

const FIRST_YEAR = 1990;
const LAST_YEAR = 2025;
const POSITIONS = ['GK','GK','DF','DF','DF','DF','DF','DF','DF','MF','MF','MF','MF','MF','MF','MF','FW','FW','FW','FW','FW','FW'];
const LOWER_DIVISION = { laliga:'laliga-2', 'premier-league':'championship', bundesliga:'2-bundesliga', 'serie-a':'serie-b', 'ligue-1':'ligue-2' };
const FALLBACK_2012_MEMBERS = {
  'serie-a': ['juventus','napoli','ac-milan','fiorentina','udinese','as-roma','lazio','catania','inter','parma','cagliari','chievo','bologna','sampdoria','atalanta','torino','genoa','palermo','siena','pescara'],
  'ligue-1': ['paris-saint-germain','olympique-de-marseille','olympique-lyonnais','nice','saint-etienne','lille','bordeaux','lorient','montpellier','toulouse','valenciennes','bastia','stade-rennais','reims','sochaux','evian','ajaccio','nancy','estac-troyes','stade-brestois'],
};
const EXTRA_NAMES = { catania:'Catania', chievo:'Chievo Verona', siena:'Siena', bordeaux:'Girondins de Bordeaux', valenciennes:'Valenciennes', bastia:'SC Bastia', evian:'Évian Thonon Gaillard', ajaccio:'AC Ajaccio' };
const ERA_CLUB_RATINGS = {
  2012: { barcelona:92, 'real-madrid':91, 'bayern-munchen':88, 'borussia-dortmund':85, 'manchester-united':86, 'manchester-city':86, chelsea:85, arsenal:82, liverpool:79, tottenham:82, juventus:85, 'ac-milan':81, inter:79, napoli:82, 'as-roma':78, 'atletico-madrid':83, malaga:79, valencia:81, 'athletic-club':78, 'paris-saint-germain':83, montpellier:77, lyon:79, porto:79, santos:77, monaco:64, 'rb-leipzig':47 },
  2025: { barcelona:89, 'real-madrid':89, 'paris-saint-germain':91, liverpool:89, arsenal:88, 'manchester-city':87, 'bayern-munchen':88, inter:87, napoli:84, chelsea:85, 'atletico-madrid':85, 'manchester-united':77, tottenham:78, juventus:82, 'ac-milan':80, 'borussia-dortmund':82, 'bayer-leverkusen':83, newcastle:84, 'aston-villa':83 },
};

// New clubs must not appear in seasons before their existence. Other membership
// gaps are still explicitly labelled estimated rather than presented as history.
const ESTABLISHED = { 'rb-leipzig':2009, 'inter-miami':2018, 'atlanta-united':2014, 'charlotte-fc':2019, 'austin-fc':2018, 'fc-cincinnati':2015, 'los-angeles-fc':2014, 'nashville-sc':2016, 'new-york-city-fc':2013, 'orlando-city':2010, 'philadelphia-union':2008, 'san-diego-fc':2023, 'st-louis-city-sc':2019, 'fc-juarez':2015, 'atletico-san-luis':2013, 'fc-andorra':1942, 'rb-bragantino':1928, 'wieczysta-krakow':1942 };

export function getAvailableYears() { return Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i); }

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
    for (const row of rows.split('\n')) {
      const [name,birth,nationality,position,rating,potential] = row.split('|');
      if (!name || year-Number(birth)<16) continue;
      const player=makePlayer(name,Number(birth),nationality,position,Number(rating),Number(potential),clubId,year);
      if (players.has(player.id)) throw new Error(`Duplicated historical player: ${name} (${year})`);
      players.set(player.id,player);
    }
  }
  for (const [name,birth,nationality,position,peak,potential,segments] of careerSeeds) {
    if (players.has(slug(name)) || year-birth<16) continue;
    const segment=segments.find(([from,to,clubId])=>year>=from&&year<=to&&clubIds.has(clubId));
    if (!segment) continue;
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
  const competitions=Object.values(world.competitions).map(c=>({...c,membershipSource:'current-catalog-estimate',historicalMembership:false}));
  const competitionMap=new Map(competitions.map(c=>[c.id,c]));
  const clubs=Object.values(world.clubs).filter(c=>year>=(ESTABLISHED[c.id]??0)).map(c=>({...c,playerIds:[]}));
  const clubMap=new Map(clubs.map(c=>[c.id,c]));
  const seasonResults=historicalResults.seasons?.[String(year)]??{};
  const membershipOverlays={};
  if(year===2012) for(const [id,members] of Object.entries(FALLBACK_2012_MEMBERS)) membershipOverlays[id]={teams:members.map(clubId=>({clubId,name:EXTRA_NAMES[clubId]??world.clubs[clubId]?.name??clubId})),source:'curated-season-membership'};
  Object.assign(membershipOverlays,seasonResults);

  for(const [competitionId,entry] of Object.entries(membershipOverlays)) {
    const competition=competitionMap.get(competitionId);
    if(!competition||!Array.isArray(entry.teams)||entry.teams.length<2) continue;
    const members=new Set(entry.teams.map(t=>t.clubId));
    const fallbackId=LOWER_DIVISION[competitionId];
    for(const club of clubs) if(club.competitionId===competitionId&&!members.has(club.id)) club.competitionId=fallbackId??club.competitionId;
    for(const team of entry.teams) {
      if(!team.clubId) continue;
      let club=clubMap.get(team.clubId);
      if(!club) {
        club={id:team.clubId,name:team.name,shortName:team.name,abbreviation:team.name.replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase(),color:'#394d70',crest:null,international_reputation:1,continental_reputation:1,domestic_reputation:2,playerIds:[]};
        clubs.push(club);clubMap.set(club.id,club);
      }
      club.competitionId=competitionId;
      club.membershipSource=entry.source;
      if(Number.isFinite(team.rating)) { club.resultRating=team.rating;club.resultRatingSource=entry.ratingSource; }
    }
    competition.historicalMembership=true;
    competition.membershipSource=entry.source;
  }

  for(const club of clubs) {
    const competition=competitionMap.get(club.competitionId);
    club.country=competition?.country_fifa_code??'ESP';
    const editorial=ERA_CLUB_RATINGS[year]?.[club.id];
    const base=52+(club.international_reputation??0)*4+(competition?.strength??0)*3;
    club.rating=clamp(Math.round(Number.isFinite(club.resultRating)?club.resultRating:editorial??base),35,95);
    club.ratingSource=Number.isFinite(club.resultRating)?'previous-season-results-estimate':'editorial-estimate';
    club.membershipSource??='current-catalog-estimate';
    club.budget=Math.round(Math.pow(Math.max(1,club.rating-43),2.2)*19000*Math.max(.18,Math.pow(1.045,year-2025))/100000)*100000;
    club.budget=Math.max(250000,club.budget);
  }

  const players=readCuratedPlayers(year,new Set(clubMap.keys()));
  let verifiedPlayers=0;
  for(const evidence of playerMemberships.players??[]) {
    const player=players.find(p=>p.id===slug(evidence.name));
    if(!player) continue;
    const verifiedClub=playerClubAtDate(evidence,`${year}-09-01`);
    player.birthDate=evidence.birthDate;
    if(evidence.birthDate) {player.birthYear=Number(evidence.birthDate.slice(0,4));player.age=year-player.birthYear;}
    player.wikidataId=evidence.wikidataId;
    player.sourceUrl=evidence.source;
    if(verifiedClub&&clubMap.has(verifiedClub)) {player.clubId=verifiedClub;player.source='wikidata';player.membershipVerified=true;verifiedPlayers++;}
  }
  for(const player of players) clubMap.get(player.clubId).playerIds.push(player.id);
  const playerMap=new Map(players.map(p=>[p.id,p]));
  for(const club of clubs) {
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
  const historicalCompetitions=competitions.filter(c=>c.historicalMembership).length;
  const coverage={
    label:rosterSnapshots[year]?'Selección histórica ampliada':'Reconstrucción aproximada',
    summary:`${competitions.length} ligas del catálogo, ${clubs.length} clubes y ${realPlayers} jugadores reales seleccionados. ${historicalCompetitions} ligas con participantes de ${year}/${String(year+1).slice(-2)}. Plantillas restantes generadas; medias, potenciales y finanzas estimados.`,
    totalLeagues:competitions.length,totalClubs:clubs.length,realPlayers,generatedPlayers:players.length-realPlayers,historicalCompetitions,verifiedPlayers,
    exhaustive:false,ratingsAreEstimates:true,rostersComplete:false,snapshotDate:`${year}-09-01`,snapshotCutoff:'Cierre del 1 de septiembre del año inicial',
    limitations:[
      'No incluye todas las ligas del mundo ni todas las plantillas históricas.',
      'Los jugadores con etiqueta Generado son ficticios. Las promesas reales tienen potencial estimado, sin garantía de su carrera futura.',
      'Solo las ligas marcadas con participantes históricos reconstruyen su composición. Las demás reutilizan el catálogo actual como aproximación.',
      'Las edades se calculan por año de nacimiento. Los préstamos solo se representan cuando constan en la selección editorial.',
      'Las valoraciones basadas en resultados usan la temporada anterior; no son atributos oficiales de futbolistas.',
    ],
  };
  return {year,clubs,competitions,players,countries:Object.values(world.countries),coverage,dataSources};
}

