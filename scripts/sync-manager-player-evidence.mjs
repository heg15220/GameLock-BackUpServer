#!/usr/bin/env node
/**
 * Player evidence crawler for the manager mode.
 *
 * For every club that ever takes part in a documented league season, collect
 * the English Wikipedia football biographies that link to the club article and
 * keep only their infobox (senior career years, league appearances and goals,
 * senior national-team caps). Everything is cached and resumable:
 *
 *   node scripts/sync-manager-player-evidence.mjs resolve   club → article
 *   node scripts/sync-manager-player-evidence.mjs links     article → biographies
 *   node scripts/sync-manager-player-evidence.mjs bios      biographies → infoboxes
 *   node scripts/sync-manager-player-evidence.mjs all
 *
 * Requests are serial with a small interval, carry a contact user agent and
 * honour maxlag / Retry-After, as the Wikimedia API etiquette asks.
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';

const OUT = path.resolve('output/manager-evidence');
const API = 'https://en.wikipedia.org/w/api.php';
const UA = 'GameLock-Manager-DataBuilder/1.0 (https://gamelock.app; hugoeg2002@gmail.com) node-fetch';
const INTERVAL = Number(process.env.WIKI_INTERVAL || 350);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(path.join(OUT, 'links'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'bios'), { recursive: true });

let last = 0;
async function api(params, attempt = 0) {
  const wait = last + INTERVAL - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params })}`;
  let response;
  try {
    response = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Encoding': 'gzip' }, signal: AbortSignal.timeout(60000) });
  } catch (error) {
    if (attempt > 6) throw error;
    await sleep(5000 * (attempt + 1));
    return api(params, attempt + 1);
  }
  if (response.status === 429 || response.status >= 500) {
    const retry = Number(response.headers.get('retry-after')) || 20 * (attempt + 1);
    if (attempt > 8) throw new Error(`HTTP ${response.status} ${url}`);
    console.error(`HTTP ${response.status}, waiting ${retry}s`);
    await sleep(retry * 1000);
    return api(params, attempt + 1);
  }
  const json = await response.json();
  if (json.error?.code === 'maxlag') {
    await sleep((Number(response.headers.get('retry-after')) || 5) * 1000);
    return api(params, attempt + 1);
  }
  if (json.error) throw new Error(`${json.error.code}: ${json.error.info}`);
  return json;
}

/* ── Clubs ── */

const LEAGUE_COUNTRY = {
  bundesliga: 'Germany', '2-bundesliga': 'Germany', 'germany-3-liga': 'Germany', laliga: 'Spain', 'laliga-2': 'Spain',
  'premier-league': 'England', championship: 'England', 'england-league-one': 'England', 'england-league-two': 'England',
  'serie-a': 'Italy', 'serie-b': 'Italy', 'ligue-1': 'France', 'ligue-2': 'France', eredivisie: 'Netherlands',
  'por-primeira-liga': 'Portugal', 'scotland-premiership': 'Scotland', 'superliga-turquia': 'Turkey', 'greece-super-league': 'Greece',
  'belgium-first-division': 'Belgium', 'austria-bundesliga': 'Austria', 'austria-2-liga': 'Austria', 'switzerland-super-league': 'Switzerland',
  ekstraklasa: 'Poland', 'liga-premier-de-rusia': 'Russia', brasileirao: 'Brazil', 'brasileirao-serie-b': 'Brazil',
  'liga-profesional': 'Argentina', 'primera-nacional': 'Argentina', 'liga-uruguaya': 'Uruguay', 'liga-de-primera': 'Chile',
  'liga-dimayor': 'Colombia', liga1: 'Peru', 'ligapro-serie-a': 'Ecuador', 'copa-de-primera': 'Paraguay', 'liga-bolivia': 'Bolivia',
  'liga-futve': 'Venezuela', 'liga-mx': 'Mexico', 'usa-mls': 'United States', 'primera-division-costa-rica': 'Costa Rica',
  'hon-liga-nacional': 'Honduras', 'liga-nacional-guatemala': 'Guatemala', 'slv-primera-division': 'El Salvador',
  'pan-primera-division': 'Panama', 'liga-primera-de-nicaragua': 'Nicaragua', 'liga-dominicana-de-futbol': 'Dominican Republic',
  'spain-segunda-b': 'Spain', 'japan-j1': 'Japan', 'china-super-league': 'China', 'australia-a-league': 'Australia', 'algeria-ligue-1': 'Algeria',
  'egypt-premier-league': 'Egypt', 'morocco-botola': 'Morocco',
};

function knownClubs() {
  const memberships = JSON.parse(fs.readFileSync('src/games/sports/manager/league-memberships.json', 'utf8'));
  const importer = fs.readFileSync('scripts/sync-manager-wikimedia-rosters.mjs', 'utf8');
  const aliasCode = importer.slice(importer.indexOf('const clubs = {'), importer.indexOf('const yearArgument'));
  const aliases = new Function(`${aliasCode};return clubs;`)();
  const clubs = new Map();
  for (const [year, leagues] of Object.entries(memberships.seasons)) for (const [leagueId, league] of Object.entries(leagues)) for (const team of league.teams) {
    if (!clubs.has(team.clubId)) clubs.set(team.clubId, { id: team.clubId, names: new Set(), articles: new Set(), leagues: new Set(), years: new Set() });
    const club = clubs.get(team.clubId);
    club.names.add(team.name); club.leagues.add(leagueId); club.years.add(Number(year));
    if (team.article) club.articles.add(team.article);
  }
  // Background clubs the existing archives mention (players' other clubs).
  const world = JSON.parse(fs.readFileSync('src/games/sports/trayectoria/world.data.json', 'utf8'));
  for (const club of Object.values(world.clubs)) {
    if (!clubs.has(club.id)) clubs.set(club.id, { id: club.id, names: new Set([club.name]), articles: new Set(), leagues: new Set([club.competitionId]), years: new Set() });
    else clubs.get(club.id).names.add(club.name);
  }
  for (const [id, title] of Object.entries(aliases)) if (clubs.has(id)) clubs.get(id).articles.add(title);
  return clubs;
}

const clubArticlesPath = path.join(OUT, 'club-articles.json');
const readJson = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } };

async function resolveClubs() {
  const clubs = knownClubs();
  const resolved = readJson(clubArticlesPath, {});
  const pending = [...clubs.values()].filter((club) => !resolved[club.id]);
  console.error(`Clubs: ${clubs.size}, pending resolution: ${pending.length}`);
  let done = 0;
  for (const club of pending) {
    const candidates = [...club.articles];
    let chosen = null;
    // Check the known article titles first (follow redirects, confirm infobox).
    if (candidates.length) {
      const json = await api({ action: 'query', titles: candidates.slice(0, 20).join('|'), redirects: '1', prop: 'templates', tltemplates: 'Template:Infobox football club', tllimit: 'max' });
      const page = (json.query?.pages || []).find((p) => !p.missing && p.templates?.length);
      if (page) chosen = { title: page.title, pageid: page.pageid, via: 'alias' };
    }
    if (!chosen) {
      const country = LEAGUE_COUNTRY[[...club.leagues][0]] || '';
      for (const name of [...club.names].slice(0, 3)) {
        const json = await api({ action: 'query', generator: 'search', gsrsearch: `${name} football club ${country}`, gsrnamespace: '0', gsrlimit: '6', prop: 'templates', tltemplates: 'Template:Infobox football club', tllimit: 'max' });
        const pages = (json.query?.pages || []).sort((a, b) => a.index - b.index);
        const tokens = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !['club', 'football', 'futbol', 'deportivo', 'sport', 'united', 'city', 'real', 'atletico', 'clube'].includes(t));
        const page = pages.find((p) => p.templates?.length && (!tokens.length || tokens.some((t) => p.title.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(t))));
        if (page) { chosen = { title: page.title, pageid: page.pageid, via: `search:${name}` }; break; }
      }
    }
    resolved[club.id] = chosen || { title: null };
    done += 1;
    if (done % 25 === 0) { fs.writeFileSync(clubArticlesPath, JSON.stringify(resolved, null, 1)); console.error(`resolved ${done}/${pending.length}`); }
  }
  fs.writeFileSync(clubArticlesPath, JSON.stringify(resolved, null, 1));
  const missing = Object.entries(resolved).filter(([, v]) => !v.title).map(([k]) => k);
  console.error(`Unresolved: ${missing.length}: ${missing.slice(0, 80).join(' ')}`);
}

/* ── Biographies linking to each club ── */

const fileFor = (title) => path.join(OUT, 'links', `${encodeURIComponent(title).replace(/%/g, '_').slice(0, 180)}.json`);

async function collectLinks() {
  const resolved = readJson(clubArticlesPath, {});
  const titles = [...new Set(Object.values(resolved).map((v) => v.title).filter(Boolean))];
  console.error(`Club articles: ${titles.length}`);
  let done = 0;
  for (const title of titles) {
    const file = fileFor(title);
    done += 1;
    if (fs.existsSync(file)) continue;
    const bios = new Map();
    const redirects = new Set([title]);
    // Every redirect to the club counts as the club in an infobox link.
    let cont = {};
    for (;;) {
      const json = await api({ action: 'query', titles: title, prop: 'redirects', rdlimit: 'max', rdnamespace: '0', ...cont });
      for (const page of json.query?.pages || []) for (const r of page.redirects || []) redirects.add(r.title);
      if (!json.continue) break;
      cont = json.continue;
    }
    cont = {};
    for (let guard = 0; guard < 400; guard += 1) {
      const json = await api({ action: 'query', generator: 'backlinks', gbltitle: title, gblredirect: '1', gblnamespace: '0', gbllimit: '500', prop: 'templates', tltemplates: 'Template:Infobox football biography', tllimit: 'max', ...cont });
      for (const page of json.query?.pages || []) if (page.templates?.length) bios.set(page.pageid, page.title);
      if (!json.continue) break;
      cont = json.continue;
    }
    fs.writeFileSync(file, JSON.stringify({ title, redirects: [...redirects], bios: [...bios.entries()] }));
    if (done % 10 === 0) console.error(`links ${done}/${titles.length} (${title}: ${bios.size})`);
  }
}

/* ── Biography infoboxes ── */

function extractInfobox(text) {
  const start = text.search(/\{\{\s*infobox[ _]+(?:football|soccer)[ _]+biography/i);
  if (start < 0) return null;
  let depth = 0;
  let end = start;
  for (; end < text.length - 1; end += 1) {
    const pair = text.slice(end, end + 2);
    if (pair === '{{') { depth += 1; end += 1; } else if (pair === '}}') { depth -= 1; end += 1; if (!depth) { end += 1; break; } }
  }
  return text.slice(start, end);
}

/** The v8 importer already cached ~60k full biographies: index them by page id once. */
function oldCacheIndex() {
  const file = path.join(OUT, 'v8-index.json');
  if (fs.existsSync(file)) return new Map(JSON.parse(fs.readFileSync(file, 'utf8')));
  const dir = 'output/manager-v8/wikimedia-cache';
  const map = new Map();
  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir)) {
      try {
        const raw = fs.readFileSync(path.join(dir, name));
        const json = JSON.parse((name.endsWith('.gz') ? gunzipSync(raw) : raw).toString('utf8'));
        if (json.pageId && json.text && /infobox[ _]+(?:football|soccer)[ _]+biography/i.test(json.text)) map.set(Number(json.pageId), name);
      } catch { /* unreadable */ }
    }
  }
  fs.writeFileSync(file, JSON.stringify([...map]));
  return map;
}

async function fetchBios() {
  const old = oldCacheIndex();
  const done = new Set();
  const index = path.join(OUT, 'bios', 'index.txt');
  if (fs.existsSync(index)) for (const line of fs.readFileSync(index, 'utf8').split('\n')) if (line) done.add(Number(line));
  const wanted = new Map();
  for (const file of fs.readdirSync(path.join(OUT, 'links'))) {
    const { bios } = JSON.parse(fs.readFileSync(path.join(OUT, 'links', file), 'utf8'));
    for (const [id, title] of bios) if (!done.has(id)) wanted.set(id, title);
  }
  // Reuse cached biographies (same infobox extraction), fetch only the rest.
  const reused = [];
  for (const id of [...wanted.keys()]) {
    if (!old.has(id)) continue;
    try {
      const name = old.get(id);
      const raw = fs.readFileSync(path.join('output/manager-v8/wikimedia-cache', name));
      const json = JSON.parse((name.endsWith('.gz') ? gunzipSync(raw) : raw).toString('utf8'));
      const infobox = extractInfobox(json.text);
      const at = Math.max(0, json.text.indexOf("'''"));
      reused.push({ pageid: id, title: json.title, revid: json.revision || null, infobox, lead: infobox ? json.text.slice(at, at + 400) : null, cached: 'v8' });
      wanted.delete(id);
    } catch { /* fetch it instead */ }
  }
  const ids = [...wanted.keys()];
  console.error(`Biographies to fetch: ${ids.length} (already ${done.size})`);
  let batchNo = fs.readdirSync(path.join(OUT, 'bios')).filter((f) => f.endsWith('.ndjson.gz')).length;
  let buffer = [];
  const flush = () => {
    if (!buffer.length) return;
    batchNo += 1;
    fs.writeFileSync(path.join(OUT, 'bios', `batch-${String(batchNo).padStart(5, '0')}.ndjson.gz`), gzipSync(buffer.map((r) => JSON.stringify(r)).join('\n')));
    fs.appendFileSync(index, `${buffer.map((r) => r.pageid).join('\n')}\n`);
    buffer = [];
  };
  buffer.push(...reused);
  if (buffer.length) flush();
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const json = await api({ action: 'query', pageids: chunk.join('|'), prop: 'revisions', rvprop: 'content|ids', rvslots: 'main', rvsection: '0' });
    for (const page of json.query?.pages || []) {
      const content = page.revisions?.[0]?.slots?.main?.content || '';
      const infobox = extractInfobox(content);
      // Keep the first sentence too: it carries the sporting nationality.
      const lead = content.slice(content.indexOf("'''"), content.indexOf("'''") + 400);
      buffer.push({ pageid: page.pageid, title: page.title, revid: page.revisions?.[0]?.revid || null, infobox, lead: infobox ? lead : null });
    }
    if (buffer.length >= 2000) flush();
    if ((i / 50) % 40 === 0) console.error(`bios ${i}/${ids.length}`);
  }
  flush();
}

/* ── Repair: clubs whose article gave few players in their league seasons ── */

async function backlinkSample(title, limit = 50) {
  const json = await api({ action: 'query', generator: 'backlinks', gbltitle: title, gblredirect: '1', gblnamespace: '0', gbllimit: '500', prop: 'templates', tltemplates: 'Template:Infobox football biography', tllimit: 'max' });
  return (json.query?.pages || []).filter((p) => p.templates?.length).slice(0, limit).map((p) => p.pageid);
}

async function scoreArticle(title, years) {
  const { parseFootballInfobox } = await import('./lib/infobox-evidence.mjs');
  const redirects = new Set([title.toLowerCase()]);
  const r = await api({ action: 'query', titles: title, prop: 'redirects', rdlimit: 'max', rdnamespace: '0', redirects: '1' });
  for (const page of r.query?.pages || []) { redirects.add(String(page.title).toLowerCase()); for (const x of page.redirects || []) redirects.add(x.title.toLowerCase()); }
  const ids = await backlinkSample(title);
  let score = 0;
  for (let i = 0; i < ids.length; i += 50) {
    const json = await api({ action: 'query', pageids: ids.slice(i, i + 50).join('|'), prop: 'revisions', rvprop: 'content', rvslots: 'main', rvsection: '0' });
    for (const page of json.query?.pages || []) {
      const info = parseFootballInfobox(extractInfobox(page.revisions?.[0]?.slots?.main?.content || '') || '', page.title);
      if (!info) continue;
      if (info.stints.some((s) => s.article && redirects.has(s.article.toLowerCase()) && years.some((y) => y >= s.from - 1 && y <= (s.to ?? 2026)))) score += 1;
    }
  }
  return score;
}

async function repairClubs() {
  const coverage = readJson(path.join(OUT, 'coverage.json'), []);
  const resolved = readJson(clubArticlesPath, {});
  const clubs = knownClubs();
  const SPANISH = new Set(['liga1', 'liga-futve', 'liga-nacional-guatemala', 'slv-primera-division', 'ligapro-serie-a', 'hon-liga-nacional', 'primera-division-costa-rica', 'liga-bolivia', 'primera-nacional', 'liga-primera-de-nicaragua', 'pan-primera-division', 'copa-de-primera', 'liga-uruguaya', 'liga-dominicana-de-futbol']);
  // Spanish-speaking leagues are covered by the Spanish Wikipedia crawler instead.
  const low = coverage.filter((row) => row.avg < Number(process.env.REPAIR_BELOW || 8) && clubs.has(row.clubId) && !resolved[row.clubId]?.repaired && !row.leagues.every((l) => SPANISH.has(l)));
  console.error(`Clubs to repair: ${low.length}`);
  for (const row of low) {
    const club = clubs.get(row.clubId);
    const years = [...club.years];
    const country = LEAGUE_COUNTRY[[...club.leagues][0]] || '';
    const current = resolved[row.clubId]?.title || null;
    const candidates = new Set();
    for (const name of [...club.names].slice(0, 2)) {
      for (const query of [`${name} football club ${country}`]) {
        const json = await api({ action: 'query', generator: 'search', gsrsearch: query, gsrnamespace: '0', gsrlimit: '6', prop: 'templates', tltemplates: 'Template:Infobox football club', tllimit: 'max' });
        for (const page of json.query?.pages || []) if (page.templates?.length) candidates.add(page.title);
      }
    }
    // A candidate must carry the club's own name, and clearly beat what we have.
    const fold = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const tokens = [...club.names].flatMap((n) => fold(n).split(/[^a-z0-9]+/)).filter((t) => t.length > 3 && !['club', 'football', 'futbol', 'deportivo', 'sport', 'united', 'city', 'real', 'atletico', 'clube', 'esporte', 'association', 'asociacion', 'calcio'].includes(t));
    const named = (title) => tokens.some((t) => fold(title).includes(t));
    let best = current; let bestScore = current ? await scoreArticle(current, years) : -1;
    const baseline = Math.max(0, bestScore);
    for (const title of [...candidates].filter((t) => t !== current && named(t)).slice(0, 3)) {
      const score = await scoreArticle(title, years);
      if (score > bestScore && score >= Math.max(6, baseline * 2)) { best = title; bestScore = score; }
    }
    resolved[row.clubId] = { ...(resolved[row.clubId] || {}), title: bestScore > 0 ? best : current, via: best !== current ? `repair:${bestScore}` : resolved[row.clubId]?.via || 'repair', repaired: true, repairScore: bestScore };
    if (best !== current) console.error(`repair ${row.clubId}: ${current} → ${best} (${bestScore})`);
    fs.writeFileSync(clubArticlesPath, JSON.stringify(resolved, null, 1));
  }
}

const step = process.argv[2] || 'all';
if (step === 'repair') await repairClubs();
if (step === 'resolve' || step === 'all') await resolveClubs();
if (step === 'links' || step === 'all') { await collectLinks(); fs.writeFileSync(path.join(OUT, 'links.done'), new Date().toISOString()); }
if (step === 'bios' || step === 'all') await fetchBios();
if (step === 'bios-follow') {
  // Runs beside the links phase: fetch what has been found so far, then look again.
  for (;;) {
    const finished = fs.existsSync(path.join(OUT, 'links.done'));
    await fetchBios();
    if (finished) break;
    await sleep(60000);
  }
}
export { gunzipSync };
