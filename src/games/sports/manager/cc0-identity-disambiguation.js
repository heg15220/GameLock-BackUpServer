const value=claim=>claim?.mainsnak?.datavalue?.value;
export const activeClaims=(entity,property)=>(entity?.claims?.[property]||[]).filter(claim=>claim.rank!=='deprecated');

/** Exact source-row corrections; never a global alias for a shared player name. */
export function verifiedCC0RosterIdentity({name,year,clubId,shirtNumber,source}) {
  const root='https://raw.githubusercontent.com/openfootball/v0-format/2516506e10a26a2d3b805f87368cf938a81fa08f/major-league-soccer';
  const matches=[
    {year:2012,clubId:'sporting-kansas-city',shirtNumber:88,source:`${root}/2012/squads/kansascity-2012.txt`},
    {year:2013,clubId:'toronto-fc',shirtNumber:18,source:`${root}/2013/squads/toronto-2013.txt`},
  ];
  if(name!=='Michael Thomas'||!matches.some(row=>row.year===year&&row.clubId===clubId&&row.shirtNumber===Number(shirtNumber)&&row.source===source))return null;
  return {
    name,birthDate:'1988-03-08',birthYear:1988,nationality:'USA',wikidataId:'Q427832',
    identitySource:'https://www.wikidata.org/w/index.php?title=Q427832&oldid=2516370814',identityRevision:2516370814,
    identityMethod:'documented-source-row-disambiguation',license:'CC0-1.0',
    identityCorrection:{
      id:'michael-thomas-mls-2012-2013',clubId,year,shirtNumber:Number(shirtNumber),source,
      from:{wikidataId:'Q275823',birthDate:'1967-08-24',nationality:'ENG'},
      to:{wikidataId:'Q427832',birthDate:'1988-03-08',nationality:'USA'},
      sources:['https://www.sportingkc.com/players/michael-thomas/','https://www.torontofc.ca/news/toronto-trades-michael-thomas'],
      reason:'Official club biography and 2 July 2013 transfer announcement identify the American midfielder, not his English namesake. The club-season affiliation remains the original CC0 roster fact.',
    },
  };
}

/** Identity verification only: intentionally never reads club-membership property P54. */
export function selectDatedFootballIdentity(name,years,entities,nationalityForEntity){
  const valid=[];
  for(const entity of entities){
    if(!activeClaims(entity,'P106').some(c=>value(c)?.id==='Q937857')||!activeClaims(entity,'P21').some(c=>value(c)?.id==='Q6581097'))continue;
    const births=activeClaims(entity,'P569').map(value).filter(v=>v?.precision===11&&/^\+\d{4}-\d\d-\d\dT/.test(v.time)).map(v=>v.time.slice(1,11));
    if(new Set(births).size!==1)continue;
    const birthDate=births[0],birthYear=Number(birthDate.slice(0,4)),date=new Date(birthDate);
    if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==birthDate)continue;
    if(!years.length||years.some(year=>year-birthYear<14||year-birthYear>48))continue;
    const nationality=nationalityForEntity(entity);
    if(!/^Q\d+$/.test(entity.id)||!Number.isSafeInteger(entity.lastrevid))continue;
    valid.push({name,wikidataId:entity.id,birthDate,birthYear,nationality,identitySource:`https://www.wikidata.org/w/index.php?title=${entity.id}&oldid=${entity.lastrevid}`,identityRevision:entity.lastrevid,license:'CC0-1.0',identityMethod:'unique-full-name-footballer-disambiguation'});
  }
  const unique=[...new Map(valid.map(p=>[p.wikidataId,p])).values()];
  return unique.length===1&&unique[0].nationality?{player:unique[0]}:{player:null,reason:unique.length>1?'multiple-valid-footballer-identities':unique.length?'missing-supported-nationality':'no-unique-dated-footballer',candidates:unique.map(p=>({id:p.wikidataId,birthDate:p.birthDate}))};
}
