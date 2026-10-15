import { normalizeClubName, resolveClubId } from './providers.js';

// Source spellings, not fuzzy matching. Country scopes prevent Nacional, Racing,
// Arsenal or Barcelona in different associations becoming the same club.
const ALIASES = {
  ESP: {
    'ath bilbao':'athletic-club','ath madrid':'atletico-madrid','atletico madrid':'atletico-madrid',
    sociedad:'real-sociedad',celta:'celta-vigo','la coruna':'deportivo-la-coruna','rcd la coruna':'deportivo-la-coruna',
    'rcd espanol':'espanyol',espanol:'espanyol',santander:'racing-santander','real racing santander':'racing-santander',
    'real racing club de santander':'racing-santander',
    vallecano:'rayo-vallecano','sp gijon':'sporting-gijon','real sporting':'sporting-gijon',granada:'granada-cf',
    zaragoza:'real-zaragoza',oviedo:'oviedo',logrones:'cd-logrones',lerida:'ue-lleida',lleida:'ue-lleida',
    'real burgos cf':'real-burgos','barcelona b':'barcelona-b','barcelona ii':'barcelona-b','real madrid b':'real-madrid-castilla',
  },
  ENG: {
    'man city':'manchester-city','man united':'manchester-united',"nottm forest":'nottingham-forest',
    'nott m forest':'nottingham-forest','sheffield united':'sheffield-utd','sheffield weds':'sheffield-wednesday',
    'sheffield wednesday':'sheffield-wednesday','sheff utd':'sheffield-utd','sheff wed':'sheffield-wednesday',
    'west bromwich albion':'west-brom',stoke:'stoke-city',hull:'hull-city',coventry:'coventry',
    wigan:'wigan-athletic','wigan athletic fc':'wigan-athletic','oxford':'oxford-united','cambridge':'cambridge-united',
    'luton':'luton-town','rotherham':'rotherham-united','peterboro':'peterborough-united',
    'milton keynes dons':'mk-dons','mk dons':'mk-dons','notts county':'notts-county',
    'tranmere':'tranmere-rovers','bristol rovers':'bristol-rovers',
  },
  GER: {
    'bayern munich':'bayern-munchen','bayern munchen':'bayern-munchen',dortmund:'borussia-dortmund',
    leverkusen:'bayer-leverkusen',mgladbach:'borussia-monchengladbach','m gladbach':'borussia-monchengladbach',
    'ein frankfurt':'eintracht-frankfurt',frankfurt:'eintracht-frankfurt',stuttgart:'vfb-stuttgart',
    freiburg:'sc-freiburg',hamburg:'hamburger-sv',schalke:'fc-schalke-04','schalke 04':'fc-schalke-04',
    wolfsburg:'vfl-wolfsburg',bochum:'vfl-bochum',koln:'1-fc-koln',cologne:'1-fc-koln',
    nurnberg:'1-fc-nurnberg',nuremberg:'1-fc-nurnberg',kaiserslautern:'1-fc-kaiserslautern',
    'hertha':'hertha-bsc','hertha berlin':'hertha-bsc',mainz:'fsv-mainz-05',bremen:'werder-bremen',
    hannover:'hannover-96',karlsruhe:'karlsruher-sc',cottbus:'energie-cottbus',
    bielefeld:'arminia-bielefeld',duisburg:'msv-duisburg',rostock:'hansa-rostock',
    dusseldorf:'fortuna-dusseldorf',augsburg:'fc-augsburg',darmstadt:'sv-darmstadt-98',
    'greuther furth':'spvgg-greuther-furth',furth:'spvgg-greuther-furth',paderborn:'sc-paderborn-07',
    'st pauli':'fc-st-pauli',osnabruck:'vfl-osnabruck',braunschweig:'eintracht-braunschweig',
    magdeburg:'1-fc-magdeburg',heidenheim:'1-fc-heidenheim',elversberg:'sv-elversberg',
  },
  FRA: {
    'paris sg':'paris-saint-germain',psg:'paris-saint-germain',lyon:'olympique-lyonnais',
    marseille:'olympique-de-marseille',rennes:'stade-rennais',brest:'stade-brestois',
    strasbourg:'rc-strasbourg',troyes:'estac-troyes',clermont:'clermont-foot',
    'st etienne':'saint-etienne','saint etienne':'saint-etienne','red star':'red-star-fc-93',
    'gfc ajaccio':'gazelec-ajaccio','nimes':'nimes-olympique',
  },
  ITA: {milan:'ac-milan',roma:'as-roma','inter milan':'inter','internazionale':'inter','lazio roma':'lazio'},
  POR: {sporting:'sporting-lisboa','sp lisbon':'sporting-lisboa','sp braga':'sporting-braga',braga:'sporting-braga',
    'guimaraes':'vitoria-guimaraes','vitoria guimaraes':'vitoria-guimaraes',nacional:'nacional-por',
    'sp covilha':'sporting-covilha','sp farense':'farense','estrela':'estrela-amadora',
    'sport lisboa e benfica':'benfica','sporting clube de braga':'sporting-braga',
    'cf estrela da amadora':'estrela-amadora','gd estoril praia':'estoril'},
  BRA: {'flamengo rj':'flamengo','botafogo rj':'botafogo',vasco:'vasco-da-gama','vasco da gama rj':'vasco-da-gama',
    'atletico mg':'atletico-mg','atletico pr':'atletico-paranaense','athletico pr':'atletico-paranaense',
    'atletico go':'atletico-goianiense',bragantino:'rb-bragantino','red bull bragantino':'rb-bragantino',
    'sport':'sport-recife','america mg':'america-mineiro','sport recife pe':'sport-recife',
    'corinthians sp':'corinthians','coritiba pr':'coritiba','fluminense rj':'fluminense',
    'gremio porto alegre':'gremio','vitoria ba':'vitoria','nautico pe':'nautico',
    'goias go':'goias','avai sc':'avai','ca mineiro':'atletico-mg',
    'sc corinthians paulista':'corinthians','sc recife':'sport-recife'},
  USA:{'la galaxy':'los-angeles-galaxy','los angeles galaxy':'los-angeles-galaxy',
    'new york red bulls':'new-york-rb','new york metrostars':'new-york-rb','metrostars':'new-york-rb',
    'montreal impact':'cf-montreal','kansas city wizards':'sporting-kansas-city',
    'dallas burn':'fc-dallas','san jose clash':'san-jose-earthquakes'},
  NED:{'az alkmaar':'az','psv eindhoven':'psv','feyenoord rotterdam':'feyenoord',
    'fc twente 65':'twente','fc twente':'twente','pec zwolle':'zwolle','sbv excelsior':'excelsior',
    'nec nijmegen':'nec',nijmegen:'nec','telstar 1963':'sc-telstar'},
  ARG:{'belgrano de cordoba':'belgrano','central cordoba sde':'central-cordoba-de-santiago',
    'gimnasia de la plata':'gimnasia-lp','gimnasia lp':'gimnasia-lp',
    'san martin de san juan':'san-martin-sj','san martin sj':'san-martin-sj'},
  RUS:{'terek grozny':'akhmat','akhmat grozny':'akhmat','fk rostov':'rostov',
    'fk zenit sankt peterburg':'zenit','zenit st petersburg':'zenit'},
};
const LEAGUE_ALIASES={
  'liga-profesional':{'estudiantes':'estudiantes','estudiantes lp':'estudiantes','estudiantes la plata':'estudiantes','racing':'racing-club'},
};
const clean = value => normalizeClubName(String(value).replace(/\s*\(\d+\)\s*$/,''));
const compact = value => clean(value).split(' ').filter(token=>!['fc','cf','ac','as','sc','ss','ca','cd','ud','gd','sl','se','cr','ec','fr','fbpa','rc','rcd','afc'].includes(token)).join(' ');

export function createMembershipClubResolver(world, historicalResults) {
  const countryClubs=new Map(), byName=new Map();
  for(const club of Object.values(world.clubs)) {
    const country=world.competitions[club.competitionId]?.country_fifa_code;
    if(!countryClubs.has(country))countryClubs.set(country,{});
    countryClubs.get(country)[club.id]=club;
  }
  // Reuse the established archive IDs, including crests and editorial identities.
  for(const season of Object.values(historicalResults.seasons??{}))for(const [competitionId,record]of Object.entries(season)){
    const country=world.competitions[competitionId]?.country_fifa_code;
    if(!country)continue;
    for(const team of record.teams??[]){
      const known=world.clubs[team.clubId];
      if(known&&world.competitions[known.competitionId]?.country_fifa_code!==country)continue;
      byName.set(`${country}:${clean(team.name)}`,team.clubId);
    }
  }
  const resolveUncached=(name,country,competitionId)=>{
    const key=clean(name),catalog=countryClubs.get(country)??{};
    const explicit=LEAGUE_ALIASES[competitionId]?.[key]??ALIASES[country]?.[key];
    if(explicit)return explicit;
    const exact=Object.values(catalog).filter(club=>compact(club.name)===compact(name));
    if(exact.length===1)return exact[0].id;
    const id=resolveClubId(String(name).replace(/\s*\(\d+\)\s*$/,''),catalog);
    if(catalog[id])return id;
    if(byName.has(`${country}:${key}`))return byName.get(`${country}:${key}`);
    // A known alias in another country is not evidence of identity here.
    if(world.clubs[id])return `${country.toLowerCase()}-${key.replace(/ /g,'-')}`;
    return id;
  };
  const cache=new Map();
  return (name,country,competitionId)=>{
    const key=`${country}:${competitionId}:${name}`;
    if(!cache.has(key))cache.set(key,resolveUncached(name,country,competitionId));
    return cache.get(key);
  };
}

/** RFC4180 fields; quoted commas, escaped quotes, CRLF and BOM are supported. */
export function parseMembershipCsv(text) {
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(char==='"') {if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
    else if(char===','&&!quoted){row.push(field);field='';}
    else if((char==='\n'||char==='\r')&&!quoted){
      if(char==='\r'&&text[i+1]==='\n')i++;
      row.push(field);if(row.some(v=>v.trim()))rows.push(row);row=[];field='';
    }else field+=char;
  }
  if(quoted)throw new Error('Unclosed CSV quote');
  if(field||row.length){row.push(field);rows.push(row);}
  const header=rows.shift()?.map(value=>value.replace(/^\uFEFF/,'').trim())??[];
  const home=header.indexOf('Team 1'),away=header.indexOf('Team 2');
  if(home<0||away<0)throw new Error('CSV lacks Team 1 / Team 2');
  return rows.map(fields=>({team1:fields[home]?.trim().replace(/\s*\(\d+\)\s*$/,''),team2:fields[away]?.trim().replace(/\s*\(\d+\)\s*$/,'')}));
}

/** Membership, not standings: future scheduled fixtures are admissible; scores are ignored. */
export function validateSeasonParticipants(matches,resolveId,country,{conference=false,expectedCount=null,minimumOpponents=null,regularSeasonCount=null,competitionId=null}={}){
  const teams=new Map(),opponents=new Map();let fixtureCount=0;
  for(const match of matches){
    const names=[match.team1,match.team2];
    if(names.some(name=>typeof name!=='string'||!name.trim()||/^(?:\?|tbd|bye|winner|loser|sieger\b|n\.n\.$)/i.test(name)))continue;
    const ids=names.map(name=>resolveId(name,country,competitionId));
    if(ids[0]===ids[1])return {valid:false,reason:'identity-collision'};
    names.forEach((name,index)=>{teams.set(ids[index],{clubId:ids[index],name});if(!opponents.has(ids[index]))opponents.set(ids[index],new Set());opponents.get(ids[index]).add(ids[1-index]);});
    fixtureCount++;
  }
  const excluded=[];
  if(regularSeasonCount&&teams.size>regularSeasonCount){
    // Specifically documented 16-team RPL exports contain two outside challengers.
    // Removal is permitted only when exactly the documented full league remains
    // and every retained team has played every other retained opponent.
    const core=[...opponents].filter(([,value])=>value.size>=regularSeasonCount-1).map(([id])=>id);
    if(core.length===regularSeasonCount&&core.every(id=>core.every(other=>id===other||opponents.get(id).has(other)))){
      for(const [id,team]of teams)if(!core.includes(id)){excluded.push(team);teams.delete(id);opponents.delete(id);}
      for(const values of opponents.values())for(const id of values)if(!teams.has(id))values.delete(id);
    }
  }
  const count=teams.size,minOpponents=Math.min(...[...opponents.values()].map(value=>value.size));
  // Full round-robin opponent coverage detects truncated exports and outsider
  // promotion/relegation play-offs. MLS uses conferences and an unbalanced calendar.
  const required=minimumOpponents??(conference?Math.max(8,Math.floor(count/2)):count-1);
  if(count<8||count>32)return {valid:false,reason:'participant-count',count};
  if(expectedCount&&count!==expectedCount)return {valid:false,reason:'unexpected-participant-count',count,expectedCount};
  if(minOpponents<required)return {valid:false,reason:'incomplete-or-mixed-calendar',count,minOpponents,required};
  return {valid:true,teams:[...teams.values()].sort((a,b)=>a.clubId.localeCompare(b.clubId)),validation:{method:minimumOpponents?'documented-group-opponent-coverage':conference?'conference-opponent-coverage':'round-robin-opponent-coverage',fixtureCount,minOpponents,...(expectedCount?{expectedCount}:{}),...(excluded.length?{excludedPlayoffChallengers:excluded}:{})}};
}
