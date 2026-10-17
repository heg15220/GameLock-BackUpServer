#!/usr/bin/env node
/**
 * German Wikipedia career evidence for German, Austrian and Swiss clubs where
 * English Wikipedia is thin. German infoboxes list every senior spell with its
 * league appearances and goals ({{Team-Station}}).
 *
 *   node scripts/sync-manager-evidence-de.mjs [resolve|links|bios|all]
 *
 * Same etiquette as the English crawler: serial requests, contact user agent,
 * maxlag and Retry-After honoured. Output: output/manager-evidence-de/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const OUT = path.resolve('output/manager-evidence-de');
const EN = path.resolve('output/manager-evidence');
const API = 'https://de.wikipedia.org/w/api.php';
const EN_API = 'https://en.wikipedia.org/w/api.php';
const UA = 'GameLock-Manager-DataBuilder/1.0 (https://gamelock.app; hugoeg2002@gmail.com) node-fetch';
const INTERVAL = Number(process.env.WIKI_INTERVAL || 450);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(path.join(OUT, 'links'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'bios'), { recursive: true });
const readJson = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } };

let last = 0;
async function api(base, params, attempt = 0) {
  const wait = last + INTERVAL - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  const url = `${base}?${new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params })}`;
  let response;
  try { response = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(60000) }); } catch (error) {
    if (attempt > 6) throw error;
    await sleep(5000 * (attempt + 1));
    return api(base, params, attempt + 1);
  }
  if (response.status === 429 || response.status >= 500) {
    if (attempt > 8) throw new Error(`HTTP ${response.status}`);
    await sleep((Number(response.headers.get('retry-after')) || 10 * (attempt + 1)) * 1000);
    return api(base, params, attempt + 1);
  }
  const json = await response.json();
  if (json.error?.code === 'maxlag') { await sleep(5000); return api(base, params, attempt + 1); }
  if (json.error) throw new Error(`${json.error.code}: ${json.error.info}`);
  return json;
}

const HISPANIC = new Set(['bundesliga', '2-bundesliga', 'germany-3-liga', 'austria-bundesliga', 'austria-2-liga', 'switzerland-super-league']);
const clubsPath = path.join(OUT, 'club-articles.json');

async function resolve() {
  const coverage = readJson(path.join(EN, 'coverage.json'), []);
  const enArticles = readJson(path.join(EN, 'club-articles.json'), {});
  const memberships = JSON.parse(fs.readFileSync('src/games/sports/manager/league-memberships.json', 'utf8'));
  const names = new Map();
  for (const leagues of Object.values(memberships.seasons)) for (const record of Object.values(leagues)) for (const team of record.teams) names.set(team.clubId, team.name);
  const targets = coverage.filter((row) => (row.avg < Number(process.env.DE_BELOW || 16) || row.min < 16) && row.leagues.some((l) => HISPANIC.has(l)));
  const resolved = readJson(clubsPath, {});
  console.error(`German-speaking clubs to cover: ${targets.length}`);
  // 1) Interlanguage links of the English articles, 50 at a time.
  const withEn = targets.filter((row) => !resolved[row.clubId] && enArticles[row.clubId]?.title);
  for (let i = 0; i < withEn.length; i += 50) {
    const chunk = withEn.slice(i, i + 50);
    const json = await api(EN_API, { action: 'query', titles: chunk.map((row) => enArticles[row.clubId].title).join('|'), redirects: '1', prop: 'langlinks', lllang: 'de', lllimit: 'max' });
    const byTitle = new Map();
    for (const page of json.query?.pages || []) if (page.langlinks?.[0]) byTitle.set(page.title, page.langlinks[0].title);
    const redirect = new Map((json.query?.redirects || []).map((r) => [r.from, r.to]));
    const normal = new Map((json.query?.normalized || []).map((r) => [r.from, r.to]));
    for (const row of chunk) {
      let title = enArticles[row.clubId].title;
      title = normal.get(title) || title; title = redirect.get(title) || title;
      if (byTitle.has(title)) resolved[row.clubId] = { title: byTitle.get(title), via: 'langlink' };
    }
  }
  // 2) Search on Spanish Wikipedia for the rest.
  for (const row of targets) {
    if (resolved[row.clubId]) continue;
    const name = names.get(row.clubId) || row.clubId.replace(/-/g, ' ');
    const json = await api(API, { action: 'query', generator: 'search', gsrsearch: `${name} Fußballverein`, gsrnamespace: '0', gsrlimit: '5', prop: 'templates', tltemplates: 'Vorlage:Infobox Fußballverein', tllimit: 'max' });
    const page = (json.query?.pages || []).sort((a, b) => a.index - b.index).find((p) => p.templates?.length);
    resolved[row.clubId] = page ? { title: page.title, via: `search:${name}` } : { title: null };
  }
  fs.writeFileSync(clubsPath, JSON.stringify(resolved, null, 1));
  console.error(`resolved ${Object.values(resolved).filter((v) => v.title).length}/${targets.length}`);
}

async function links() {
  const resolved = readJson(clubsPath, {});
  const titles = [...new Set(Object.values(resolved).map((v) => v.title).filter(Boolean))];
  let n = 0;
  for (const title of titles) {
    n += 1;
    const file = path.join(OUT, 'links', `${encodeURIComponent(title).replace(/%/g, '_').slice(0, 180)}.json`);
    if (fs.existsSync(file)) continue;
    const redirects = new Set([title]);
    const r = await api(API, { action: 'query', titles: title, prop: 'redirects', rdlimit: 'max', rdnamespace: '0' });
    for (const page of r.query?.pages || []) for (const x of page.redirects || []) redirects.add(x.title);
    const bios = new Map();
    let cont = {};
    for (let guard = 0; guard < 200; guard += 1) {
      const json = await api(API, { action: 'query', generator: 'backlinks', gbltitle: title, gblredirect: '1', gblnamespace: '0', gbllimit: '500', prop: 'templates', tltemplates: 'Vorlage:Infobox Fußballspieler', tllimit: 'max', ...cont });
      for (const page of json.query?.pages || []) if (page.templates?.length) bios.set(page.pageid, page.title);
      if (!json.continue) break;
      cont = json.continue;
    }
    fs.writeFileSync(file, JSON.stringify({ title, redirects: [...redirects], bios: [...bios.entries()] }));
    if (n % 20 === 0) console.error(`es links ${n}/${titles.length}`);
  }
}

function extractInfobox(text) {
  const start = text.search(/\{\{\s*infobox fu(?:ß|ss)ballspieler/i);
  if (start < 0) return null;
  let depth = 0; let end = start;
  for (; end < text.length - 1; end += 1) {
    const pair = text.slice(end, end + 2);
    if (pair === '{{') { depth += 1; end += 1; } else if (pair === '}}') { depth -= 1; end += 1; if (!depth) { end += 1; break; } }
  }
  return text.slice(start, end);
}

async function bios() {
  const index = path.join(OUT, 'bios', 'index.txt');
  const done = new Set(fs.existsSync(index) ? fs.readFileSync(index, 'utf8').split('\n').filter(Boolean).map(Number) : []);
  const wanted = new Map();
  for (const file of fs.readdirSync(path.join(OUT, 'links'))) {
    const { bios: list } = JSON.parse(fs.readFileSync(path.join(OUT, 'links', file), 'utf8'));
    for (const [id, title] of list) if (!done.has(id)) wanted.set(id, title);
  }
  const ids = [...wanted.keys()];
  console.error(`es biographies to fetch: ${ids.length}`);
  let batch = fs.readdirSync(path.join(OUT, 'bios')).filter((f) => f.endsWith('.ndjson.gz')).length;
  let buffer = [];
  const flush = () => {
    if (!buffer.length) return;
    batch += 1;
    fs.writeFileSync(path.join(OUT, 'bios', `batch-${String(batch).padStart(5, '0')}.ndjson.gz`), gzipSync(buffer.map((r) => JSON.stringify(r)).join('\n')));
    fs.appendFileSync(index, `${buffer.map((r) => r.pageid).join('\n')}\n`);
    buffer = [];
  };
  for (let i = 0; i < ids.length; i += 50) {
    const json = await api(API, { action: 'query', pageids: ids.slice(i, i + 50).join('|'), prop: 'revisions', rvprop: 'content|ids', rvslots: 'main', rvsection: '0' });
    for (const page of json.query?.pages || []) {
      const content = page.revisions?.[0]?.slots?.main?.content || '';
      buffer.push({ pageid: page.pageid, title: page.title, revid: page.revisions?.[0]?.revid || null, infobox: extractInfobox(content) });
    }
    if (buffer.length >= 2000) flush();
    if ((i / 50) % 40 === 0) console.error(`es bios ${i}/${ids.length}`);
  }
  flush();
}

/** Biographies whose infobox leaves "equipos" empty keep their career in a "Clubes" table. */
async function tables() {
  const { gunzipSync } = await import('node:zlib');
  const dir = path.join(OUT, 'bios');
  const outDir = path.join(OUT, 'tables');
  fs.mkdirSync(outDir, { recursive: true });
  const done = new Set();
  for (const f of fs.readdirSync(outDir).filter((x) => x.endsWith('.gz'))) {
    for (const line of gunzipSync(fs.readFileSync(path.join(outDir, f))).toString('utf8').split('\n')) if (line) done.add(JSON.parse(line).pageid);
  }
  const ids = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.gz'))) {
    for (const line of gunzipSync(fs.readFileSync(path.join(dir, f))).toString('utf8').split('\n')) {
      if (!line) continue;
      const r = JSON.parse(line);
      if (!r.infobox || done.has(r.pageid)) continue;
      const m = /\|\s*equipos\s*=([\s\S]*?)(?:\n\s*\||\}\}\s*$)/.exec(r.infobox);
      if (!m || !/\[\[/.test(m[1])) ids.push(r.pageid);
    }
  }
  console.error(`es clubs tables to fetch: ${ids.length}`);
  let batch = fs.readdirSync(outDir).filter((f) => f.endsWith('.gz')).length;
  let buffer = [];
  const flush = () => {
    if (!buffer.length) return;
    batch += 1;
    fs.writeFileSync(path.join(outDir, `t-${String(batch).padStart(5, '0')}.ndjson.gz`), gzipSync(buffer.map((r) => JSON.stringify(r)).join('\n')));
    buffer = [];
  };
  for (let i = 0; i < ids.length; i += 25) {
    const json = await api(API, { action: 'query', pageids: ids.slice(i, i + 25).join('|'), prop: 'revisions', rvprop: 'content', rvslots: 'main' });
    for (const page of json.query?.pages || []) {
      const text = page.revisions?.[0]?.slots?.main?.content || '';
      const at = text.search(/==\s*(?:Clubes|Trayectoria|Carrera(?: deportiva)?|Equipos)\s*==/i);
      const table = at < 0 ? null : text.slice(at, at + 6000).split(/\n==[^=]/)[0];
      buffer.push({ pageid: page.pageid, table });
    }
    if (buffer.length >= 1000) flush();
    if ((i / 25) % 40 === 0) console.error(`es tables ${i}/${ids.length}`);
  }
  flush();
}

const step = process.argv[2] || 'all';
if (step === 'tables') await tables();
if (step === 'resolve' || step === 'all') await resolve();
if (step === 'links' || step === 'all') await links();
if (step === 'bios' || step === 'all') await bios();
