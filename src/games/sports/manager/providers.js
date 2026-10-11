import { managerCompetitionExtensions } from './competitions.js';

/** Public, keyless sources. Only CC0 structured facts enter the bundled snapshots. */
export const DATA_SOURCES = [
  { id: 'openfootball', name: 'OpenFootball', license: 'CC0-1.0', url: 'https://github.com/openfootball/football.json', licenseUrl: 'https://github.com/openfootball/football.json/blob/master/LICENSE.md', scope: 'Resultados y participantes; cobertura variable según liga y temporada.' },
  { id: 'wikidata', name: 'Wikidata', license: 'CC0-1.0', url: 'https://www.wikidata.org/wiki/Wikidata:Data_access', licenseUrl: 'https://www.wikidata.org/wiki/Wikidata:Licensing', scope: 'Fechas de nacimiento y afiliaciones fechadas; no valoraciones de habilidad.' },
];

export const OPENFOOTBALL_LEAGUES = {
  laliga: 'es.1', 'premier-league': 'en.1', bundesliga: 'de.1', 'serie-a': 'it.1', 'ligue-1': 'fr.1',
  'laliga-2':'es.2',championship:'en.2','2-bundesliga':'de.2','serie-b':'it.2','ligue-2':'fr.2',
  'por-primeira-liga':'pt.1',eredivisie:'nl.1','superliga-turquia':'tr.1','liga-mx':'mx.1',
  brasileirao:'br.1','liga-profesional':'ar.1','liga-dimayor':'co.1','usa-mls':'mls',
  ...Object.fromEntries(managerCompetitionExtensions.map(c=>[c.id,c.dataset])),
};
export const CALENDAR_LEAGUES = new Set(['brasileirao','brasileirao-serie-b','liga-profesional','liga-dimayor','usa-mls','japan-j1','china-super-league']);

export function seasonLabel(year) {
  if (!Number.isInteger(Number(year)) || Number(year) < 1800 || Number(year) > 2200) throw new Error('Invalid season year');
  return `${year}-${String(Number(year) + 1).slice(-2)}`;
}

export function openFootballUrl(competitionId, year, revision = 'master') {
  const league = OPENFOOTBALL_LEAGUES[competitionId];
  if (!league || !/^(master|[a-f\d]{40})$/.test(revision)) throw new Error('Unsupported football dataset');
  const season=seasonLabel(year);
  return `https://raw.githubusercontent.com/openfootball/football.json/${revision}/${CALENDAR_LEAGUES.has(competitionId)?Number(year):season}/${league}.json`;
}

export function normalizeClubName(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[.'’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

const ALIASES = {
  barcelona: ['FC Barcelona'], 'real-madrid': ['Real Madrid CF'], 'atletico-madrid': ['Club Atlético de Madrid'],
  'celta-vigo': ['RC Celta', 'RC Celta de Vigo', 'Celta Vigo','RC Celta Vigo'], espanyol: ['Espanyol Barcelona', 'RCD Espanyol de Barcelona', 'RCD Espanyol'],
  alaves: ['Deportivo Alavés'], 'real-betis': ['Real Betis Balompié'], 'real-sociedad': ['Real Sociedad de Fútbol'],
  'rayo-vallecano': ['Rayo Vallecano de Madrid'], valladolid: ['Real Valladolid', 'Real Valladolid CF'],
  'real-zaragoza': ['Real Zaragoza'], 'deportivo-la-coruna': ['Deportivo La Coruña'],
  'manchester-city': ['Manchester City FC'], 'manchester-united': ['Manchester United FC'],
  liverpool: ['Liverpool FC'],
  tottenham: ['Tottenham Hotspur', 'Tottenham Hotspur FC'], brighton: ['Brighton & Hove Albion FC', 'Brighton & Hove Albion'],
  newcastle: ['Newcastle United', 'Newcastle United FC'], leeds: ['Leeds United FC'], wolves: ['Wolverhampton Wanderers', 'Wolverhampton Wanderers FC'],
  'west-ham': ['West Ham United', 'West Ham United FC'], 'west-brom': ['West Bromwich Albion', 'West Bromwich Albion FC'],
  qpr: ['Queens Park Rangers'], blackburn: ['Blackburn Rovers'], bolton: ['Bolton Wanderers'],
  norwich: ['Norwich City'], ipswich: ['Ipswich Town FC'], reading: ['Reading FC'], 'wigan-athletic': ['Wigan Athletic'],
  'bayern-munchen': ['FC Bayern München'], 'bayer-leverkusen': ['Bayer 04 Leverkusen'],
  'borussia-monchengladbach': ['Bor. Mönchengladbach'], '1899-hoffenheim': ['TSG 1899 Hoffenheim'],
  'werder-bremen': ['SV Werder Bremen'], 'fsv-mainz-05': ['1. FSV Mainz 05'],
  'vfl-bochum': ['VfL Bochum 1848'], '1-fc-heidenheim': ['1. FC Heidenheim 1846'], 'fc-st-pauli': ['FC St. Pauli 1910'],
  'fortuna-dusseldorf': ['Fortuna Düsseldorf'],
  inter: ['FC Internazionale Milano', 'Internazionale'], napoli: ['SSC Napoli'], fiorentina: ['ACF Fiorentina'],
  parma: ['Parma Calcio 1913'], genoa: ['Genoa CFC'], bologna: ['Bologna FC 1909'], udinese: ['Udinese Calcio'],
  cagliari: ['Cagliari Calcio'], como: ['Como 1907'], sassuolo: ['US Sassuolo Calcio'], pisa: ['AC Pisa 1909'],
  'paris-saint-germain': ['Paris Saint-Germain FC'], 'stade-brestois': ['Stade Brestois 29'],
  reims: ['Stade de Reims'], lille: ['Lille OSC'], nice: ['OGC Nice'], montpellier: ['Montpellier HSC'],
  'rc-strasbourg': ['RC Strasbourg Alsace'], angers: ['Angers SCO'], lens: ['Racing Club de Lens'],
  'stade-rennais': ['Stade Rennais FC 1901'],
  'athletic-club':['Athletic Bilbao','Athletic Club Bilbao'], 'real-betis':['Real Betis Balompié','Betis'],
  'bayern-munchen':['FC Bayern München','Bayern Munich','FC Bayern Munich'],
  'borussia-monchengladbach':['Bor. Mönchengladbach','Borussia Mönchengladbach'],
  '1899-hoffenheim':['TSG 1899 Hoffenheim','Hoffenheim'],
  '1-fc-heidenheim':['1. FC Heidenheim 1846','1. FC Heidenheim'],
  'fsv-mainz-05':['1. FSV Mainz 05','Mainz'], 'ac-milan':['AC Milan','Milan'],
  'as-roma':['AS Roma','Roma'], verona:['Hellas Verona FC','Hellas Verona','Verona'],
  'sporting-lisboa':['Sporting CP','Sporting Clube de Portugal'],
  atalanta:['Atalanta Bergamo','Atalanta BC'],salernitana:['US Salernitana 1919','Salernitana'],
  'rb-salzburg':['RB Salzburg','FC RB Salzburg','Red Bull Salzburg','FC Red Bull Salzburg'],
  'austria-wien':['Austria Wien','FK Austria Wien','Austria Vienna'],
  'rapid-wien':['Rapid Wien','SK Rapid Wien','Rapid Vienna'],
  'sturm-graz':['Sturm Graz','SK Sturm Graz'],lask:['LASK','LASK Linz'],
  'sk-austria-klagenfurt':['SK Austria Klagenfurt','Austria Klagenfurt'],
};
const shortName = (value) => normalizeClubName(value).split(' ').filter(token => !['fc', 'cf', 'afc', 'ac', 'as', 'rc', 'rcd', 'ca', 'cd', 'ud', 'us', 'ss', 'bc', 'aj', 'sc'].includes(token)).join(' ');
const clubResolutionCaches = new WeakMap();

/** Explicit aliases first, exact normalized world names second; never fuzzy-match clubs. */
export function resolveClubId(name, clubs = {}) {
  const normalized = normalizeClubName(name);
  let cache = clubResolutionCaches.get(clubs);
  if (!cache) { cache = new Map(); clubResolutionCaches.set(clubs, cache); }
  if (cache.has(normalized)) return cache.get(normalized);
  for (const [id, aliases] of Object.entries(ALIASES)) {
    if (aliases.some(alias => normalizeClubName(alias) === normalized)) { cache.set(normalized, id); return id; }
  }
  const candidates = Object.values(clubs).filter(club => normalizeClubName(club.name) === normalized || shortName(club.name) === shortName(name));
  const id = candidates.length === 1 ? candidates[0].id : normalized.replace(/ /g, '-');
  cache.set(normalized, id);
  return id;
}

export function footballMatches(payload) {
  if (Array.isArray(payload?.matches)) return payload.matches;
  if (Array.isArray(payload?.rounds)) return payload.rounds.flatMap(round => round.matches ?? []);
  throw new Error('OpenFootball response contains no matches');
}

/** Played matches only. Date cutoff prevents the starting season leaking into ratings. */
export function calculateClubRatings(payload, { clubs = {}, beforeDate = '9999-12-31' } = {}) {
  const rows = new Map();
  let matchesUsed = 0;
  let lastMatchDate = null;
  for (const match of footballMatches(payload)) {
    const score = match.score?.ft;
    if (!Array.isArray(score) || score.length !== 2 || !score.every(n => Number.isInteger(n) && n >= 0 && n <= 50)) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(match.date ?? '') || match.date >= beforeDate) continue;
    if (typeof match.team1 !== 'string' || typeof match.team2 !== 'string' || match.team1 === match.team2) continue;
    for (const [name, goalsFor, goalsAgainst] of [[match.team1, score[0], score[1]], [match.team2, score[1], score[0]]]) {
      const clubId = resolveClubId(name, clubs);
      const row = rows.get(clubId) ?? { clubId, name, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
      row.played += 1; row.goalsFor += goalsFor; row.goalsAgainst += goalsAgainst;
      if (goalsFor > goalsAgainst) { row.won += 1; row.points += 3; }
      else if (goalsFor === goalsAgainst) { row.drawn += 1; row.points += 1; }
      else row.lost += 1;
      rows.set(clubId, row);
    }
    matchesUsed += 1;
    if (!lastMatchDate || match.date > lastMatchDate) lastMatchDate = match.date;
  }
  const teams = [...rows.values()].map(row => ({ ...row,
    // Our game scale, NOT a rating supplied by the source. Same scale for top five leagues.
    rating: Math.round(Math.max(48, Math.min(94, 54 + 12 * row.points / row.played + 4 * (row.goalsFor - row.goalsAgainst) / row.played))),
  })).sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || a.clubId.localeCompare(b.clubId));
  return { teams, matchesUsed, lastMatchDate };
}

/** Membership uses fixture participants, independent of later results in those fixtures. */
export function extractCompetitionTeams(payload, clubs = {}) {
  const seen = new Map();
  for (const match of footballMatches(payload)) for (const name of [match.team1, match.team2]) {
    if (typeof name !== 'string' || !name.trim()) continue;
    const clubId = resolveClubId(name, clubs);
    seen.set(clubId, { clubId, name });
  }
  return [...seen.values()].sort((a, b) => a.clubId.localeCompare(b.clubId));
}

/** Preserve precision: 2004-00-00 must not become an invented exact transfer date. */
export function wikidataDate(snak) {
  const value = snak?.datavalue?.value;
  if (!value?.time || !Number.isInteger(value.precision)) return null;
  const match = /^\+(\d{4})-(\d{2})-(\d{2})T/.exec(value.time);
  if (!match || value.precision < 9) return null;
  const precision = value.precision >= 11 ? 'day' : value.precision === 10 ? 'month' : 'year';
  return { value: precision === 'day' ? `${match[1]}-${match[2]}-${match[3]}` : precision === 'month' ? `${match[1]}-${match[2]}` : match[1], precision };
}

export function extractWikidataPlayer(entity, clubEntityIds = {}, teamKinds = {}) {
  const birth = wikidataDate(entity.claims?.P569?.find(claim => claim.rank !== 'deprecated')?.mainsnak);
  return {
    wikidataId: entity.id, name: entity.labels?.es?.value ?? entity.labels?.en?.value ?? entity.id,
    birthDate: birth?.precision === 'day' ? birth.value : null,
    birthDatePrecision: birth?.precision ?? null,
    source: `https://www.wikidata.org/wiki/${entity.id}`, revision: entity.lastrevid ?? null,
    memberships: (entity.claims?.P54 ?? []).map(claim => ({
      teamWikidataId: claim.mainsnak?.datavalue?.value?.id ?? null,
      clubId: clubEntityIds[claim.mainsnak?.datavalue?.value?.id] ?? null,
      start: wikidataDate(claim.qualifiers?.P580?.[0]), end: wikidataDate(claim.qualifiers?.P582?.[0]),
      statementId: claim.id,
      rank: claim.rank ?? 'normal',
      teamKind: teamKinds[claim.mainsnak?.datavalue?.value?.id] ?? (clubEntityIds[claim.mainsnak?.datavalue?.value?.id] ? 'club' : 'unknown'),
      // Imported-from-Wikipedia and bare reference counts do not establish truth.
      references: (claim.references ?? []).map(reference => ({ hash: reference.hash ?? null,
        urls: (reference.snaks?.P854 ?? []).map(snak => snak.datavalue?.value).filter(value => typeof value === 'string'),
        statedIn: (reference.snaks?.P248 ?? []).map(snak => snak.datavalue?.value?.id).filter(Boolean),
        importedFrom: (reference.snaks?.P143 ?? []).map(snak => snak.datavalue?.value?.id).filter(Boolean),
      })),
      qualifiers: Object.fromEntries(Object.entries(claim.qualifiers ?? {}).filter(([property]) => !['P580','P582'].includes(property)).map(([property,snaks]) => [property,snaks.map(snak => snak.datavalue?.value).filter(value => value !== undefined)])),
      verificationStatus: claim.rank === 'deprecated' ? 'rejected' : 'unverified',
      auditReason: claim.rank === 'deprecated' ? 'deprecated-statement' : 'independent-evidence-not-reviewed',
    })).filter(membership => membership.teamWikidataId),
  };
}

/** An import is an assertion, not verification. Evidence covers a bounded period. */
export function membershipEvidenceAtDate(membership, date) {
  return membership?.verificationStatus === 'verified' && membership.rank !== 'deprecated'
    && (membership.evidence ?? []).some(evidence => evidence.authority === 'primary'
      && /^https:\/\//.test(evidence.sourceUrl ?? '')
      && /^\d{4}-\d{2}-\d{2}$/.test(evidence.from ?? '')
      && /^\d{4}-\d{2}-\d{2}$/.test(evidence.to ?? '')
      && evidence.from <= date && date < evidence.to);
}

/** Fail closed on unreviewed claims, external clubs, unknown dates and overlaps. */
export function playerClubAtDate(player, date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) return null;
  const bounds = (value) => {
    if (!value) return null;
    if (value.precision === 'year' && /^\d{4}$/.test(value.value)) return [`${value.value}-01-01`, `${value.value}-12-31`];
    if (value.precision === 'month') {
      const [year, month] = value.value.split('-').map(Number);
      if (!/^\d{4}-\d{2}$/.test(value.value) || month < 1 || month > 12) return null;
      const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
      return [`${value.value}-01`, `${value.value}-${last}`];
    }
    return value.precision === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(value.value) ? [value.value, value.value] : null;
  };
  const certain = (player?.memberships ?? []).filter(membership => {
    if (!membership.clubId || !membership.start || membership.teamKind === 'national'
      || !membershipEvidenceAtDate(membership,date)) return false;
    const start = bounds(membership.start), end = bounds(membership.end);
    return start && (!membership.end || end) && date >= start[1] && (!end || date < end[0]);
  });
  // A documented loan supersedes only its explicitly identified parent club.
  const loans = certain.filter(membership => membership.membershipType === 'loan' && membership.parentTeamWikidataId);
  const active = certain.filter(membership => !loans.some(loan => loan.parentTeamWikidataId === membership.teamWikidataId));
  const clubIds = [...new Set(active.map(membership => membership.clubId))];
  if(clubIds.length!==1)return null;
  const possibleOther=(player?.memberships??[]).some(membership=>{
    if(membership.verificationStatus === 'rejected' || membership.rank === 'deprecated'
      || membership.teamKind === 'national' || membership.clubId===clubIds[0]
      || loans.some(loan => loan.parentTeamWikidataId === membership.teamWikidataId)) return false;
    // Keep external club identities: a move outside our league catalogue matters.
    if(!membership.teamWikidataId && !membership.clubId) return false;
    const start=bounds(membership.start),end=bounds(membership.end);
    return (!start || date>=start[0])&&(!end||date<end[1]);
  });
  return possibleOther?null:clubIds[0];
}

export async function loadPublicManagerSnapshot({ fetcher = globalThis.fetch, signal } = {}) {
  const response = await fetcher('/data/football-manager/club-ratings.json', { signal });
  if (!response.ok) throw new Error(`Historical snapshot unavailable (${response.status})`);
  const snapshot = await response.json();
  if (snapshot.schemaVersion !== 1 || !snapshot.seasons) throw new Error('Unsupported historical snapshot');
  return snapshot;
}
