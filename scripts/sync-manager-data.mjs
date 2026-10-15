#!/usr/bin/env node
/**
 * Rebuild manager facts from public CC0 sources; Node >= 18, no credentials.
 * node scripts/sync-manager-data.mjs [--refresh] [--offline] [--years=2012,2025] [--memberships-only]
 * Downloads are bounded, sequential, timeout-limited, revision-pinned and cached.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DATA_SOURCES, OPENFOOTBALL_LEAGUES, CALENDAR_LEAGUES, openFootballUrl, seasonLabel,
  calculateClubRatings, extractCompetitionTeams, extractWikidataPlayer,
} from '../src/games/sports/manager/providers.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cacheRoot = resolve(root, '.cache/football-manager');
const args = process.argv.slice(2);
// The participant archive has its own pinned sources and validation. It can be
// rebuilt without redownloading ratings or the independent Wikidata sample.
if(args.includes('--memberships-only')){
  process.argv=process.argv.filter(arg=>arg!=='--memberships-only');
  await import('./sync-manager-memberships.mjs');
  process.exit(0);
}
const offline = args.includes('--offline');
const refresh = args.includes('--refresh');
const ratingsOnly = args.includes('--ratings-only');
if (offline && refresh) throw new Error('--offline and --refresh are mutually exclusive');
if (args.some(arg => !['--offline', '--refresh', '--ratings-only'].includes(arg) && !arg.startsWith('--years='))) throw new Error('Unknown option');
const { latestSeasonYear } = await import('./lib/manager-season-range.mjs');
const yearArg = args.find(arg => arg.startsWith('--years='))?.slice(8) ?? [1990,1994,1998,2002,2006,...Array.from({length:latestSeasonYear()-2009},(_,i)=>2010+i)].join(',');
const years = [...new Set(yearArg.split(',').map(Number))].sort((a, b) => a - b);
if (!years.length || years.some(year => !Number.isInteger(year) || year < 1900 || year > latestSeasonYear())) throw new Error('Provide valid start years up to the current season');
const world = JSON.parse(await readFile(resolve(root, 'src/games/sports/trayectoria/world.data.json'), 'utf8'));
await mkdir(cacheRoot, { recursive: true });
await writeFile(resolve(cacheRoot, '.gitignore'), '*\n', 'utf8');
let downloaded = 0;

async function getJson(url) {
  const cachePath = resolve(cacheRoot, `${createHash('sha256').update(url).digest('hex')}.json`);
  if (!refresh) {
    try { return JSON.parse(await readFile(cachePath, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (offline) throw new Error(`Not present in offline cache: ${url}`);
  let response;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'GameLock-Football-Manager/1.0 (CC0 historical dataset builder)', Accept: 'application/json' } });
    if (response.status !== 429 && response.status < 500) break;
    if (attempt === 0) await new Promise(resolveDelay => setTimeout(resolveDelay, 1200));
  }
  downloaded += 1;
  if (!response.ok && response.status !== 404) throw new Error(`HTTP ${response.status}: ${url}; existing snapshots preserved`);
  const text = await response.text();
  if (text.length > 8_000_000) throw new Error(`Dataset too large: ${url}`);
  const record = {
    url, fetchedAt: new Date().toISOString(), status: response.status,
    sha256: createHash('sha256').update(text).digest('hex'),
    data: response.status === 404 ? null : JSON.parse(text),
  };
  await writeFile(cachePath, JSON.stringify(record), 'utf8');
  return record;
}

const commit = await getJson('https://api.github.com/repos/openfootball/football.json/commits/master');
const revision = commit.data?.sha;
if (!/^[a-f\d]{40}$/.test(revision ?? '')) throw new Error('Could not resolve OpenFootball revision');
const tree=await getJson(`https://api.github.com/repos/openfootball/football.json/git/trees/${revision}?recursive=1`);
const availablePaths=new Set((tree.data?.tree??[]).map(file=>file.path));
if(!availablePaths.size)throw new Error('Empty source inventory');
const snapshot = {
  schemaVersion: 1,
  generatedAt: null,
  sources: DATA_SOURCES,
  revision,
  ratingModel: 'clamp(54 + 12 × points/played + 4 × goalDifference/played, 48, 94), rounded. Game estimate; prior season only.',
  seasons: {}, catalog: {}, missing: [],
};
const fetchedDates = [];
for (const year of years) {
  const competitions = {};
  for (const competitionId of Object.keys(OPENFOOTBALL_LEAGUES)) {
    const url=openFootballUrl(competitionId, year, revision);
    if(!availablePaths.has(url.split(`/${revision}/`)[1])){
      snapshot.missing.push({year,competitionId,kind:'membership',url});continue;
    }
    const memberRecord = await getJson(url);
    fetchedDates.push(memberRecord.fetchedAt);
    if (!memberRecord.data) {
      snapshot.missing.push({ year, competitionId, kind: 'membership', url: memberRecord.url });
      continue;
    }
    const priorUrl=openFootballUrl(competitionId, year - 1, revision);
    const ratingRecord=availablePaths.has(priorUrl.split(`/${revision}/`)[1])?await getJson(priorUrl):{data:null,url:priorUrl,fetchedAt:memberRecord.fetchedAt};
    fetchedDates.push(ratingRecord.fetchedAt);
    const ratingCutoff=`${year}-${CALENDAR_LEAGUES.has(competitionId)?'01-01':'07-01'}`;
    const prior = ratingRecord.data ? calculateClubRatings(ratingRecord.data, { clubs: world.clubs, beforeDate: ratingCutoff }) : null;
    if (!prior?.matchesUsed) snapshot.missing.push({ year, competitionId, kind: 'prior-season-results', url: ratingRecord.url });
    const previousById = new Map((prior?.teams ?? []).map(team => [team.clubId, team]));
    const teams = extractCompetitionTeams(memberRecord.data, world.clubs).map(team => {
      const priorTeam = previousById.get(team.clubId);
      return priorTeam ? { ...priorTeam, name: team.name, ratingBasis: 'prior-season-results' }
        : { ...team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, rating: null, ratingBasis: 'unavailable' };
    });
    if (teams.length < 8 || teams.length > 32 || new Set(teams.map(team => team.clubId)).size !== teams.length) throw new Error(`Invalid club membership in ${competitionId}/${year}`);
    competitions[competitionId] = {
      season: CALENDAR_LEAGUES.has(competitionId)?String(year):seasonLabel(year), ratingSeason: CALENDAR_LEAGUES.has(competitionId)?String(year-1):seasonLabel(year - 1), ratingCutoff,
      source: memberRecord.url, ratingSource: prior?.matchesUsed ? ratingRecord.url : null,
      license: 'CC0-1.0', fetchedAt: memberRecord.fetchedAt,
      sourceSha256: memberRecord.sha256, ratingSourceSha256: prior?.matchesUsed ? ratingRecord.sha256 : null,
      matchesUsed: prior?.matchesUsed ?? 0, lastMatchDate: prior?.lastMatchDate ?? null,
      teams,
    };
    snapshot.catalog[competitionId]={...competitions[competitionId],year};
    console.log(`${year} ${competitionId}: ${teams.length} clubs, ${prior?.matchesUsed ?? 0} prior matches, ${teams.filter(team => team.rating !== null).length} calibrated ratings`);
  }
  snapshot.seasons[year] = competitions;
}

if (ratingsOnly) {
  // An incremental season refresh must preserve the historical archive and the
  // independently audited identities/affiliations in player-memberships.json.
  const previous = JSON.parse(await readFile(resolve(root, 'src/games/sports/manager/historical-results.json'), 'utf8'));
  for (const year of years) if (!Object.keys(snapshot.seasons[year] || {}).length) throw new Error(`No results sources for ${year}; archive preserved`);
  snapshot.seasons = { ...previous.seasons, ...snapshot.seasons };
  snapshot.catalog = { ...previous.catalog, ...snapshot.catalog };
  snapshot.missing = [...previous.missing.filter(row => !years.includes(row.year)), ...snapshot.missing];
  snapshot.generatedAt = fetchedDates.sort().at(-1);
  await saveJson('src/games/sports/manager/historical-results.json', snapshot);
  await saveJson('public/data/football-manager/club-ratings.json', snapshot);
  console.log(`Updated ratings for ${years.join(', ')}; historical seasons and player identities preserved.`);
  process.exit(0);
}

const coreIds = ['Q615', 'Q11571', 'Q43913', 'Q21621995', 'Q113704154', 'Q28967995'];
const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${coreIds.join('|')}&props=claims|labels|info&languages=es|en&format=json`;
const entityRecord = await getJson(entityUrl);
if (entityRecord.data?.error || !entityRecord.data?.entities) throw new Error('Wikidata response is invalid; existing snapshots preserved');
const clubEntities = {
  Q7156: 'barcelona', Q8682: 'real-madrid', Q15789: 'bayern-munchen', Q50602: 'manchester-city',
  Q483020: 'paris-saint-germain', Q18656: 'manchester-united', Q1422: 'juventus', Q180305: 'monaco',
  Q41420: 'borussia-dortmund', Q9616: 'chelsea', Q75729: 'sporting-lisboa', Q11938: 'psv',
  Q16844931: 'inter-miami', Q482764: 'al-nassr', Q24711: 'groningen',
};
const memberships = {
  schemaVersion: 1, fetchedAt: entityRecord.fetchedAt, source: entityRecord.url,
  sourceSha256: entityRecord.sha256, license: 'CC0-1.0',
  note: 'Bounded six-player verification sample. Membership dates retain Wikidata precision; missing or uncertain data must not be interpreted as a full roster.',
  players: coreIds.map(id => extractWikidataPlayer(entityRecord.data.entities[id], clubEntities)),
};
if (memberships.players.some(player => !player.birthDate || !player.memberships.length)) throw new Error('Incomplete core player response; existing snapshots preserved');
snapshot.generatedAt = [...fetchedDates, entityRecord.fetchedAt].sort().at(-1);

async function saveJson(relativePath, data) {
  const target = resolve(root, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(`${target}.tmp`, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(`${target}.tmp`, target);
}
// Publish only after both integrations pass validation; game startup remains offline.
await saveJson('src/games/sports/manager/historical-results.json', snapshot);
await saveJson('public/data/football-manager/club-ratings.json', snapshot);
await saveJson('src/games/sports/manager/player-memberships.json', memberships);
await saveJson('public/data/football-manager/player-memberships.json', memberships);
console.log(`Saved ${Object.keys(snapshot.seasons).length} start years and ${memberships.players.length} Wikidata players; ${snapshot.missing.length} coverage gaps documented; ${downloaded} network responses.`);
// Always refresh the independently validated selection archive as part of the
// complete pipeline. --years affects ratings only; participant coverage is never
// silently truncated when a caller refreshes one era.
process.argv=[...process.argv.slice(0,2),...(offline?['--offline']:[]),...(refresh?['--refresh']:[])];
await import('./sync-manager-memberships.mjs');
