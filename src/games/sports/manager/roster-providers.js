import { normalizeClubName, extractWikidataPlayer } from './providers.js';

export const MEMBERSHIP_ARCHIVE_REVISION = 'membership-evidence-2026-10-10-v2';
export const MEMBERSHIP_AUDIT_IDS = ['Q969146','Q654903','Q38136'];

export function parseOpenFootballSquad(text, nationality) {
  const players=[];
  for (const line of String(text).split(/\r?\n/)) {
    const match=/^\s*(\d+)\s*,\s*(.+?)\s*,\s*(GK|DF|MF|FW)\s*,\s*b\.\s*(\d{4})(?:[/-]\d{2}[/-]\d{2})?\s*,?/.exec(line);
    if (!match) continue;
    const foreign=/\s+\(([A-Z]{3})\)$/.exec(match[2]);
    players.push({name:match[2].replace(/\s+\([A-Z]{3}\)$/,''),birthYear:Number(match[4]),nationality:foreign?.[1]??nationality,position:match[3],shirtNumber:Number(match[1])});
  }
  return players;
}

/** Older CC0 lists omit birth dates. Join only one exact named identity; never guess. */
export function parseLegacyOpenFootballSquad(text, nationality, identities) {
  const index=new Map();
  for(const identity of identities){
    const identitySource=identity.identitySource??(identity.wikidataId?`https://www.wikidata.org/wiki/${identity.wikidataId}`:null);
    const key=normalizeClubName(identity.name);
    if(!index.has(key))index.set(key,[]);
    const candidates=index.get(key),same=candidates.find(candidate=>candidate.birthYear===identity.birthYear
      && (!candidate.birthDate||!identity.birthDate||candidate.birthDate===identity.birthDate)
      && (!candidate.wikidataId||!identity.wikidataId||candidate.wikidataId===identity.wikidataId));
    if(same){
      if(!same.birthDate&&identity.birthDate){same.birthDate=identity.birthDate;same.identitySource=identitySource;}
      same.wikidataId??=identity.wikidataId;same.identitySource??=identitySource;
    }else candidates.push({...identity,identitySource});
  }
  const players=[],unresolved=[];
  for(const line of String(text).split(/\r?\n/)){
    const match=/^\s*(\d+)\s+(?:\((?:c|vc)\)\s*)?(.+?)\s+(GK|DF|MF|FW)(?:\s+\d{4}-\d{0,4})?\s*$/.exec(line);
    if(!match)continue;
    const foreign=/\s*\(([A-Z]{3})\)$/.exec(match[2]),name=match[2].replace(/\s*\([A-Z]{3}\)$/,'').trim();
    const candidates=index.get(normalizeClubName(name))??[];
    if(candidates.length!==1||!Number.isInteger(candidates[0].birthYear)){unresolved.push({name,reason:candidates.length>1?'ambiguous-identity':'missing-dated-identity'});continue;}
    const identity=candidates[0];
    players.push({name,birthYear:identity.birthYear,birthDate:identity.birthDate,nationality:foreign?.[1]??nationality,position:match[3],shirtNumber:Number(match[1]),wikidataId:identity.wikidataId,identitySource:identity.identitySource??(identity.wikidataId?`https://www.wikidata.org/wiki/${identity.wikidataId}`:null)});
  }
  return {players,unresolved};
}

export const WIKIDATA_CLUBS = {
  Q7156:'barcelona',Q8682:'real-madrid',Q8701:'atletico-madrid',Q10333:'valencia',Q10329:'sevilla',
  Q18656:'manchester-united',Q9617:'arsenal',Q9616:'chelsea',Q1130849:'liverpool',Q50602:'manchester-city',Q18741:'tottenham',
  Q15789:'bayern-munchen',Q41420:'borussia-dortmund',Q104761:'bayer-leverkusen',Q32494:'fc-schalke-04',
  Q1422:'juventus',Q631:'inter',Q1543:'ac-milan',Q2739:'as-roma',Q2641:'napoli',
  Q483020:'paris-saint-germain',Q132885:'olympique-de-marseille',Q704:'olympique-lyonnais',Q180305:'monaco',
  Q81888:'ajax',Q11938:'psv',Q131499:'benfica',Q128446:'porto',Q75729:'sporting-lisboa',
  Q170703:'boca-juniors',Q15799:'river-plate',Q80955:'santos',Q17479:'flamengo',
};

// SPARQL returns the original time precision, including year-only qualifiers.
export function historicalRosterQuery(clubEntity, { includeEvidence = false } = {}) {
  if(!/^Q\d+$/.test(clubEntity)) throw new Error('Invalid Wikidata club');
  const query = `SELECT ?p ?label ?dob ?position ?iso ?start ?sp ?end ?ep WHERE {
    ?p p:P54 ?s. ?s ps:P54 wd:${clubEntity}; pqv:P580 ?sv.
    ?sv wikibase:timeValue ?start; wikibase:timePrecision ?sp.
    OPTIONAL { ?s pqv:P582 ?ev. ?ev wikibase:timeValue ?end; wikibase:timePrecision ?ep. }
    ?p wdt:P569 ?dob; wdt:P413/wdt:P279* ?position; rdfs:label ?label.
    VALUES ?position { wd:Q201330 wd:Q336286 wd:Q193592 wd:Q280658 }
    FILTER(LANG(?label)="en") FILTER(?dob>="1950-01-01T00:00:00Z"^^xsd:dateTime)
    FILTER(?start<="2025-12-31T00:00:00Z"^^xsd:dateTime)
    FILTER(!BOUND(?end)||?end>="1990-01-01T00:00:00Z"^^xsd:dateTime)
    OPTIONAL { ?p wdt:P27 ?nation. ?nation wdt:P297 ?iso. }
  }`;
  // Legacy cached queries remain reproducible, but are explicitly unverified.
  return includeEvidence ? query.replace('SELECT ?p', 'SELECT ?s ?team ?rank ?referenceUrl ?importedFrom ?statedIn ?p')
    .replace('?p p:P54 ?s.', '?p p:P54 ?s. ?s ps:P54 ?team; wikibase:rank ?rank. OPTIONAL { ?s prov:wasDerivedFrom ?reference. OPTIONAL { ?reference pr:P854 ?referenceUrl. } OPTIONAL { ?reference pr:P143 ?importedFrom. } OPTIONAL { ?reference pr:P248 ?statedIn. } }') : query;
}

const POSITION_IDS = {
  Q201330:'GK',Q336286:'DF',Q193592:'MF',Q280658:'FW',
};
const entityId=value=>String(value??'').split('/').at(-1);
const preciseTime=(value,precision)=>{
  if(!value||!precision)return null;
  const level=Number(precision)>=11?'day':Number(precision)===10?'month':'year';
  return {value:value.slice(0,level==='day'?10:level==='month'?7:4),precision:level};
};

export function extractHistoricalRoster(bindings,clubId,countries) {
  const byId=new Map();
  const isoToFifa=Object.fromEntries(Object.values(countries).map(c=>[c.iso2,c.fifa]));
  // British citizenship alone does not identify England/Scotland/Wales/Northern Ireland.
  isoToFifa.GB='GBR';
  for(const row of bindings??[]) {
    const id=entityId(row.p?.value),position=POSITION_IDS[entityId(row.position?.value)];
    const nationality=isoToFifa[row.iso?.value];
    if(!/^Q\d+$/.test(id)||!position||!nationality||!row.label?.value||!row.dob?.value)continue;
    const entry=byId.get(id)??{wikidataId:id,name:row.label.value,birthDate:row.dob.value.slice(0,10),birthYear:Number(row.dob.value.slice(0,4)),nationality,position,memberships:[]};
    const expectedTeam=Object.keys(WIKIDATA_CLUBS).find(id=>WIKIDATA_CLUBS[id]===clubId);
    const actualTeam=row.team?.value?entityId(row.team.value):expectedTeam;
    const membership={clubId,teamWikidataId:actualTeam??null,teamKind:'club',
      start:preciseTime(row.start?.value,row.sp?.value),end:preciseTime(row.end?.value,row.ep?.value),
      statementId:row.s?.value??null,rank:row.rank?.value?.endsWith('DeprecatedRank')?'deprecated':'normal',
      verificationStatus:actualTeam!==expectedTeam?'rejected':'unverified',
      auditReason:actualTeam!==expectedTeam?'club-entity-mismatch':'independent-evidence-not-reviewed'};
    if(row.referenceUrl||row.importedFrom||row.statedIn)membership.references=[{urls:row.referenceUrl?[row.referenceUrl.value]:[],importedFrom:row.importedFrom?[entityId(row.importedFrom.value)]:[],statedIn:row.statedIn?[entityId(row.statedIn.value)]:[]}];
    if(!entry.memberships.some(m=>JSON.stringify(m)===JSON.stringify(membership)))entry.memberships.push(membership);
    byId.set(id,entry);
  }
  return [...byId.values()];
}

export const playerIdentity = (name,birthYear) => `${normalizeClubName(name)}:${birthYear}`;

/** Every source claim is quarantined until its identity and membership are reviewed. */
export function auditHistoricalMemberships(snapshot, entities = {}, record = null) {
  const reverse=Object.fromEntries(Object.entries(WIKIDATA_CLUBS).map(([qid,id])=>[id,qid]));
  const rejectedClaims={Q969146:['real-madrid'],Q654903:['real-madrid','barcelona']};
  const auditSources={
    Q969146:['https://www.sampdoria.it/en/player/gonzalo-ruben-bergessio/','https://www.sampdoria.it/news/archivio/2014/08/01/ufficiale-gonzalo-bergessio-un-calciatore-della-sampdoria/'],
    Q654903:['https://rfef.es/sites/default/files/pdf/revista/especial_mundial_2014.pdf','https://www.ecaeurope.com/media/1643/eca-player-release-analysis-world-cup-2014.pdf'],
    Q38136:['https://www.realmadrid.com/es-ES/el-club/historia/leyendas-futbol/marcelo-vieira','https://www.realmadrid.com/es-ES/noticias/futbol/primer-equipo/personalidades/acto-de-homenaje-y-despedida-de-marcelo'],
  };
  const summary={revision:MEMBERSHIP_ARCHIVE_REVISION,policy:'independent-evidence-required',identities:snapshot.historicalPlayers.length,verifiedMemberships:0,quarantinedMemberships:0,rejectedMemberships:0,reasons:{},auditedEntities:[]};
  for(const player of snapshot.historicalPlayers){
    const entity=entities[player.wikidataId];
    if(entity){
      const full=extractWikidataPlayer(entity,WIKIDATA_CLUBS);
      player.memberships=full.memberships;player.sourceRevision=full.revision;
      player.sourceUrl=full.source;player.membershipHistoryComplete=true;
      summary.auditedEntities.push({wikidataId:player.wikidataId,revision:full.revision,source:record?.url??full.source,sourceSha256:record?.sha256??null,evidence:auditSources[player.wikidataId]??[]});
    }
    for(const membership of player.memberships){
      membership.teamWikidataId??=reverse[membership.clubId]??null;
      membership.teamKind??='club';
      membership.verificationStatus='unverified';membership.auditReason='independent-evidence-not-reviewed';
      if(membership.clubId && reverse[membership.clubId] && membership.teamWikidataId!==reverse[membership.clubId]){membership.verificationStatus='rejected';membership.auditReason='club-entity-mismatch';}
      if(membership.rank==='deprecated'){membership.verificationStatus='rejected';membership.auditReason='deprecated-statement';}
      if(rejectedClaims[player.wikidataId]?.includes(membership.clubId)){
        membership.verificationStatus='rejected';membership.auditReason='contradicted-by-primary-club-record';membership.auditSources=auditSources[player.wikidataId];
      }
    }
    // Identity correction supported by Real Madrid's own profile, not Spanish citizenship.
    if(player.wikidataId==='Q38136'){
      player.name='Marcelo';player.nationality='BRA';player.identitySource=auditSources.Q38136[0];
      // Keep this audit as a bounded source fact. The reviewed 2013 squad is authoritative
      // for gameplay; do not promote an unchecked multi-team P54 history into certainty.
    }
    for(const membership of player.memberships){
      if(membership.verificationStatus==='verified')summary.verifiedMemberships++;
      else if(membership.verificationStatus==='rejected')summary.rejectedMemberships++;
      else summary.quarantinedMemberships++;
      summary.reasons[membership.auditReason]=(summary.reasons[membership.auditReason]??0)+1;
    }
  }
  snapshot.archiveRevision=MEMBERSHIP_ARCHIVE_REVISION;snapshot.membershipAudit=summary;
  return summary;
}
