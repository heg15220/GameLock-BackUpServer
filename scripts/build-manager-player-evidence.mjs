#!/usr/bin/env node
/**
 * Evidence-based squads and ratings for every documented league season.
 *
 *   node scripts/build-manager-player-evidence.mjs [--fit-only]
 *
 * Inputs (all cached locally):
 *   output/manager-evidence/  club articles, biographies linking to each club,
 *                             their infoboxes (Wikipedia, CC BY-SA 4.0)
 *   historical-standings.json final league tables (CC0 results / CC BY-SA tables)
 *   league-memberships.json   who played in which league and season
 *   rosters.js                editorial ratings, used only to fit the model
 *
 * Club strength for a season is its performance in that league table and the
 * two before it, on top of the league's level in that era. A player's rating
 * is the strength of his club, moved by how regularly he played there (league
 * appearances per season), his senior caps weighted by the strength of his
 * national team in that era, the level of the clubs he played for around that
 * season, his scoring rate and his age. The coefficients are fitted by least
 * squares against the editorial ratings, so the model speaks the same scale.
 *
 * Output: src/games/sports/manager/evidence/window-YYYY.json, one per five
 * seasons, loaded lazily for the chosen season.
 */
import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { parseFootballInfobox, parseSpanishInfobox, parseGermanInfobox } from './lib/infobox-evidence.mjs';
import { leagueLevel, nationWeight, seasonPerformance } from './lib/manager-strength.mjs';
import { isWomensPlayingCareer, isOtherSport } from './lib/football-biography-scope.mjs';

const OUT = 'output/manager-evidence';
const DEST = 'src/games/sports/manager/evidence';
const FIRST = 1990;
const LAST = 2026;
const fold = (s) => String(s || '').replace(/_/g, ' ').normalize('NFC').trim().toLowerCase();
const strip = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ── Memberships and club strength ── */

const memberships = JSON.parse(fs.readFileSync('src/games/sports/manager/league-memberships.json', 'utf8'));
const standings = JSON.parse(fs.readFileSync('src/games/sports/manager/historical-standings.json', 'utf8')).seasons;
const leagueOf = new Map(); // `${year}:${clubId}` → leagueId
const calendarLeague = new Map(); // `${year}:${leagueId}` → bool
const clubYears = new Map(); // clubId → Set(year)
for (const [year, leagues] of Object.entries(memberships.seasons)) {
  for (const [leagueId, record] of Object.entries(leagues)) {
    calendarLeague.set(`${year}:${leagueId}`, !/[-/]/.test(String(record.season || year)));
    for (const team of record.teams) {
      leagueOf.set(`${year}:${team.clubId}`, leagueId);
      if (!clubYears.has(team.clubId)) clubYears.set(team.clubId, new Set());
      clubYears.get(team.clubId).add(Number(year));
    }
  }
}
const performance = new Map(); // `${year}:${clubId}` → rating
for (const [year, leagues] of Object.entries(standings)) {
  for (const [leagueId, table] of Object.entries(leagues)) {
    const level = leagueLevel(leagueId, Number(year));
    for (const row of table) {
      const value = seasonPerformance(row, table, level);
      if (value != null) performance.set(`${year}:${row[0]}`, value);
    }
  }
}
// Strength at the start of season Y: that season (the squad we are rating
// played it), the one before and the one before that.
const strengthMemo = new Map();
export function clubStrength(clubId, year) {
  const key = `${year}:${clubId}`;
  if (strengthMemo.has(key)) return strengthMemo.get(key);
  let total = 0; let weight = 0;
  for (const [dy, w] of [[0, 0.45], [-1, 0.35], [-2, 0.2]]) {
    const value = performance.get(`${year + dy}:${clubId}`);
    if (value != null) { total += value * w; weight += w; }
  }
  let result = null;
  if (weight > 0) {
    // With only one season known, pull halfway towards the league level.
    const own = total / weight;
    const league = leagueOf.get(key);
    result = weight < 0.4 && league ? own * 0.65 + leagueLevel(league, year) * 0.35 : own;
  } else {
    const league = leagueOf.get(key);
    if (league) result = leagueLevel(league, year) - 1.5;
  }
  strengthMemo.set(key, result);
  return result;
}

/* ── Club articles ── */

const clubArticles = JSON.parse(fs.readFileSync(path.join(OUT, 'club-articles.json'), 'utf8'));
const idsByArticle = new Map();
for (const [clubId, info] of Object.entries(clubArticles)) {
  if (!info?.title) continue;
  const key = fold(info.title);
  if (!idsByArticle.has(key)) idsByArticle.set(key, new Set());
  idsByArticle.get(key).add(clubId);
}
const articleOfTitle = new Map(); // any redirect → canonical club article key
// Explicit season-table links validated as football-club articles. They also
// cover newly added leagues before a complete backlink crawl is available.
for (const info of Object.values(clubArticles)) if (info?.title) {
  for (const title of [info.title, ...(info.articleAliases || [])]) articleOfTitle.set(fold(title), fold(info.title));
}
for (const file of fs.readdirSync(path.join(OUT, 'links'))) {
  const { title, redirects } = JSON.parse(fs.readFileSync(path.join(OUT, 'links', file), 'utf8'));
  for (const r of redirects || [title]) articleOfTitle.set(fold(r), fold(title));
  articleOfTitle.set(fold(title), fold(title));
}
// Other Wikipedias' articles of the clubs they cover, keyed "<lang>:<title>".
const ES = 'output/manager-evidence-es';
const LANGS = [['es', ES], ['de', 'output/manager-evidence-de']];
for (const [lang, dir] of LANGS) {
  if (!fs.existsSync(path.join(dir, 'club-articles.json'))) continue;
  for (const [clubId, info] of Object.entries(JSON.parse(fs.readFileSync(path.join(dir, 'club-articles.json'), 'utf8')))) {
    if (!info?.title) continue;
    const key = fold(`${lang}:${info.title}`);
    if (!idsByArticle.has(key)) idsByArticle.set(key, new Set());
    idsByArticle.get(key).add(clubId);
  }
  for (const file of fs.existsSync(path.join(dir, 'links')) ? fs.readdirSync(path.join(dir, 'links')) : []) {
    const { title, redirects } = JSON.parse(fs.readFileSync(path.join(dir, 'links', file), 'utf8'));
    for (const r of redirects || [title]) articleOfTitle.set(fold(`${lang}:${r}`), fold(`${lang}:${title}`));
    articleOfTitle.set(fold(`${lang}:${title}`), fold(`${lang}:${title}`));
  }
}

function clubFor(article, year) {
  const key = articleOfTitle.get(fold(article));
  if (!key) return null;
  const ids = [...(idsByArticle.get(key) || [])];
  if (!ids.length) return null;
  return ids.find((id) => leagueOf.has(`${year}:${id}`)) || ids.sort((a, b) => (clubYears.get(b)?.size || 0) - (clubYears.get(a)?.size || 0))[0];
}

/* ── Nations ── */

const world = JSON.parse(fs.readFileSync('src/games/sports/trayectoria/world.data.json', 'utf8'));
const reputation = Object.fromEntries(Object.values(world.countries).map((c) => [c.fifa, c.international_reputation ?? 0]));
const nationByName = new Map();
for (const c of Object.values(world.countries)) {
  nationByName.set(strip(c.name_en), c.fifa);
  nationByName.set(strip(c.name_en.replace('&', 'and')), c.fifa);
}
for (const [name, fifa] of Object.entries({
  'republic of ireland': 'IRL', 'united states': 'USA', 'south korea': 'KOR', 'korea republic': 'KOR', 'ivory coast': 'CIV', 'cote d ivoire': 'CIV',
  'dr congo': 'COD', zaire: 'COD', 'bosnia and herzegovina': 'BIH', 'trinidad and tobago': 'TRI', turkey: 'TUR', 'czech republic': 'CZE',
  macedonia: 'MKD', 'north macedonia': 'MKD', 'china pr': 'CHN', china: 'CHN', 'cape verde': 'CPV', yugoslavia: 'SRB', 'fr yugoslavia': 'SRB',
  'serbia and montenegro': 'SRB', 'soviet union': 'RUS', cis: 'RUS', czechoslovakia: 'CZE', 'west germany': 'GER', 'east germany': 'GER',
  'saudi arabia': 'KSA', 'united arab emirates': 'UAE', 'new zealand': 'NZL', 'south africa': 'RSA', 'northern ireland': 'NIR',
  'congo': 'CGO', 'republic of the congo': 'CGO', 'the gambia': 'GAM', gambia: 'GAM', 'curacao': 'CUW', 'netherlands antilles': 'CUW',
  'el salvador': 'SLV', 'costa rica': 'CRC', 'dominican republic': 'DOM', 'equatorial guinea': 'EQG', 'guinea bissau': 'GNB',
})) nationByName.set(name, fifa);
function nationOfTeam(article, display) {
  const text = strip(`${article}`).replace(/ (?:men s )?national (?:association )?(?:football|soccer) team.*$/, '').replace(/ national under.*$/, '').replace(/ national team$/, '').trim();
  return nationByName.get(text) || nationByName.get(strip(display)) || null;
}
const DEMONYMS = {
  spanish: 'ESP', english: 'ENG', french: 'FRA', german: 'GER', italian: 'ITA', portuguese: 'POR', dutch: 'NED', brazilian: 'BRA', argentine: 'ARG',
  argentinian: 'ARG', uruguayan: 'URU', chilean: 'CHI', colombian: 'COL', peruvian: 'PER', ecuadorian: 'ECU', paraguayan: 'PAR', bolivian: 'BOL',
  venezuelan: 'VEN', mexican: 'MEX', american: 'USA', scottish: 'SCO', welsh: 'WAL', irish: 'IRL', belgian: 'BEL', swiss: 'SUI', austrian: 'AUT',
  danish: 'DEN', swedish: 'SWE', norwegian: 'NOR', finnish: 'FIN', polish: 'POL', czech: 'CZE', slovak: 'SVK', hungarian: 'HUN', romanian: 'ROU',
  bulgarian: 'BUL', serbian: 'SRB', croatian: 'CRO', slovenian: 'SVN', bosnian: 'BIH', greek: 'GRE', turkish: 'TUR', russian: 'RUS', ukrainian: 'UKR',
  japanese: 'JPN', korean: 'KOR', chinese: 'CHN', australian: 'AUS', nigerian: 'NGA', ghanaian: 'GHA', cameroonian: 'CMR', ivorian: 'CIV',
  senegalese: 'SEN', moroccan: 'MAR', algerian: 'ALG', tunisian: 'TUN', egyptian: 'EGY', honduran: 'HON', guatemalan: 'GUA', salvadoran: 'SLV',
  panamanian: 'PAN', nicaraguan: 'NCA', dominican: 'DOM', icelandic: 'ISL', israeli: 'ISR', malian: 'MLI', canadian: 'CAN', jamaican: 'JAM',
  georgian: 'GEO', albanian: 'ALB', macedonian: 'MKD', montenegrin: 'MNE', cypriot: 'CYP', estonian: 'EST', latvian: 'LVA', lithuanian: 'LTU',
  belarusian: 'BLR', kazakh: 'KAZ', kazakhstani: 'KAZ', armenian: 'ARM', azerbaijani: 'AZE', moldovan: 'MDA', iranian: 'IRN', saudi: 'KSA',
  qatari: 'QAT', emirati: 'UAE', haitian: 'HAI', trinidadian: 'TRI', angolan: 'ANG', congolese: 'COD', guinean: 'GUI', gabonese: 'GAB',
  togolese: 'TOG', beninese: 'BEN', burkinabe: 'BFA', zambian: 'ZAM', zimbabwean: 'ZIM', kosovan: 'KOS', luxembourgish: 'LUX', maltese: 'MLT',
  faroese: 'FRO', 'costa rican': 'CRC', 'south african': 'RSA', 'northern irish': 'NIR', 'new zealand': 'NZL', 'cape verdean': 'CPV',
};
function nationFromLead(lead) {
  const m = /\bis an? (?:former )?((?:[A-Z][a-zé]+[- ]?){1,3}?) (?:professional |former |retired |semi-professional |international )*(?:football|soccer|footballer)/.exec(String(lead || '').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1'));
  if (!m) return null;
  const word = strip(m[1]);
  return DEMONYMS[word] || DEMONYMS[word.split(' ').slice(-1)[0]] || DEMONYMS[word.split(' ')[0]] || null;
}

/* ── Biographies → player seasons ── */

const DETAIL = { GK: 'GK', CB: 'CB', LB: 'LB', RB: 'RB', FB: 'FB', WB: 'WB', CDM: 'CDM', CM: 'CM', CAM: 'CAM', LW: 'LW', RW: 'RW', W: 'W', SS: 'ST', ST: 'ST' };
const LINE = { GK: 'GK', CB: 'DF', LB: 'DF', RB: 'DF', FB: 'DF', WB: 'DF', CDM: 'MF', CM: 'MF', CAM: 'MF', LW: 'FW', RW: 'FW', W: 'FW', ST: 'FW' };

function seasonsOfPlayer(info) {
  // Candidate (year → stints) under each league's calendar.
  const rows = [];
  for (const stint of info.stints) {
    if (!stint.article) continue;
    // An open spell ("2023–") still runs in the latest season.
    const to = stint.to ?? LAST + 1;
    for (let year = Math.max(FIRST, stint.from - 1); year <= Math.min(LAST, to); year += 1) {
      const clubId = clubFor(stint.article, year);
      if (!clubId) break;
      const league = leagueOf.get(`${year}:${clubId}`);
      const calendar = league ? calendarLeague.get(`${year}:${league}`) : false;
      const inside = calendar ? year >= stint.from && year <= to : year >= stint.from && year <= to - 1 && stint.from !== to;
      if (!inside) continue;
      const seasons = calendar ? to - stint.from + 1 : Math.max(1, to - stint.from);
      rows.push({ year, clubId, league, stint, seasons, calendar });
    }
  }
  const byYear = new Map();
  for (const row of rows) {
    const current = byYear.get(row.year);
    // A loan wins over the parent club; then the most recent move.
    if (!current || (row.stint.loan && !current.stint.loan) || (row.stint.loan === current.stint.loan && row.stint.from > current.stint.from)) byYear.set(row.year, row);
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year);
}

function loadBiographies() {
  const players = [];
  let excludedWomensCareers = 0, excludedOtherSports = 0;
  const seen = new Set();
  const dir = path.join(OUT, 'bios');
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.ndjson.gz')).sort()) {
    const lines = gunzipSync(fs.readFileSync(path.join(dir, file))).toString('utf8').split('\n');
    for (const line of lines) {
      if (!line) continue;
      let record;
      try { record = JSON.parse(line); } catch { continue; }
      if (seen.has(record.pageid) || !record.infobox) continue;
      seen.add(record.pageid);
      if (isOtherSport(record)) { excludedOtherSports++; continue; }
      const info = parseFootballInfobox(record.infobox, record.title);
      if (!info || !info.birthDate || !info.stints.length) continue;
      if (isWomensPlayingCareer(info, record)) { excludedWomensCareers++; continue; }
      info.pageid = record.pageid;
      info.lead = record.lead;
      info.revid = record.revid;
      players.push(info);
    }
  }
  // Spanish Wikipedia fills the gaps; English biographies keep priority.
  const known = new Set(players.map((p) => `${strip(p.name)}:${p.birthDate}`));
  const esDir = path.join(ES, 'bios');
  const tablesDir = path.join(ES, 'tables');
  const tableOf = new Map();
  for (const file of fs.existsSync(tablesDir) ? fs.readdirSync(tablesDir).filter((f) => f.endsWith('.gz')) : []) {
    for (const line of gunzipSync(fs.readFileSync(path.join(tablesDir, file))).toString('utf8').split('\n')) if (line) { const r = JSON.parse(line); if (r.table) tableOf.set(r.pageid, r.table); }
  }
  let added = 0;
  for (const file of fs.existsSync(esDir) ? fs.readdirSync(esDir).filter((f) => f.endsWith('.ndjson.gz')).sort() : []) {
    for (const line of gunzipSync(fs.readFileSync(path.join(esDir, file))).toString('utf8').split('\n')) {
      if (!line) continue;
      let record;
      try { record = JSON.parse(line); } catch { continue; }
      if (!record.infobox) continue;
      if (isOtherSport(record)) { excludedOtherSports++; continue; }
      const info = parseSpanishInfobox(record.infobox, record.title, tableOf.get(record.pageid));
      if (!info || !info.birthDate || !info.stints.length) continue;
      if (isWomensPlayingCareer(info, record)) { excludedWomensCareers++; continue; }
      const key = `${strip(info.name)}:${info.birthDate}`;
      if (known.has(key)) continue;
      known.add(key);
      info.pageid = 900000000 + record.pageid;
      info.lang = 'es';
      players.push(info);
      added += 1;
    }
  }
  console.error(`spanish biographies added: ${added}`);
  const deDir = path.join('output/manager-evidence-de', 'bios');
  let addedDe = 0;
  for (const file of fs.existsSync(deDir) ? fs.readdirSync(deDir).filter((f) => f.endsWith('.ndjson.gz')).sort() : []) {
    for (const line of gunzipSync(fs.readFileSync(path.join(deDir, file))).toString('utf8').split('\n')) {
      if (!line) continue;
      let record;
      try { record = JSON.parse(line); } catch { continue; }
      if (!record.infobox) continue;
      if (isOtherSport(record)) { excludedOtherSports++; continue; }
      const info = parseGermanInfobox(record.infobox, record.title);
      if (!info || !info.birthDate || !info.stints.length) continue;
      if (isWomensPlayingCareer(info, record)) { excludedWomensCareers++; continue; }
      const key = `${strip(info.name)}:${info.birthDate}`;
      if (known.has(key)) continue;
      known.add(key);
      info.pageid = 1800000000 + record.pageid;
      info.lang = 'de';
      players.push(info);
      addedDe += 1;
    }
  }
  console.error(`german biographies added: ${addedDe}`);
  console.error(`excluded explicitly documented women's playing careers: ${excludedWomensCareers}`);
  console.error(`excluded biographies from other sports: ${excludedOtherSports}`);
  return players;
}

function features(info) {
  const birthYear = Number(info.birthDate.slice(0, 4));
  const seniors = info.national.filter((n) => n.senior);
  const main = seniors.slice().sort((a, b) => (b.caps || 0) - (a.caps || 0))[0];
  const nat = (main && (main.fifa || nationOfTeam(main.article, main.display))) || info.national.map((n) => n.fifa || nationOfTeam(n.article, n.display)).find(Boolean) || info.nationality || nationFromLead(info.lead);
  const detail = DETAIL[info.positions[0]] || null;
  const seasons = seasonsOfPlayer(info).filter((s) => s.year - birthYear >= 16 && s.year - birthYear <= 42);
  return seasons.map((s) => {
    const age = s.year - birthYear;
    const caps = s.stint.caps;
    // Spread a spell's appearances by age: a teenager plays less than the same man at 27.
    const weight = (a) => clamp((a - 16.5) / 6, 0.12, 1) * (a > 33 ? clamp(1 - (a - 33) * 0.12, 0.4, 1) : 1);
    let total = 0;
    for (let k = 0; k < s.seasons; k += 1) total += weight(s.stint.from + k - birthYear);
    const apps = caps == null ? null : caps * weight(age) / Math.max(0.12, total);
    const goals = s.stint.goals == null || !caps ? null : s.stint.goals / caps;
    let capsAt = 0; let capsRate = 0; let active = false;
    for (const n of seniors) {
      const nt = n.to ?? LAST;
      const span = Math.max(1, nt - n.from + 1);
      const rate = (n.caps || 0) / span;
      if (s.year >= n.from) capsAt += rate * Math.min(span, s.year - n.from + 1);
      if (s.year >= n.from - 0 && s.year <= nt) { active = true; capsRate = Math.max(capsRate, rate); }
    }
    const natFifa = (main && (main.fifa || nationOfTeam(main.article, main.display))) || nat;
    return {
      year: s.year, clubId: s.clubId, league: s.league, age, apps, goals, loan: s.stint.loan, capsAt, capsRate, active,
      natWeight: natFifa ? nationWeight(natFifa, s.year, reputation[natFifa]) : 0.6, clubR: clubStrength(s.clubId, s.year),
    };
  }).filter((s) => s.clubR != null).map((s) => ({ ...s, nat, detail, line: detail ? LINE[detail] : info.line }));
}

/* ── Rating model ── */

const FEATURES = ['bias', 'reg', 'intl', 'peak', 'goal', 'youth', 'old', 'unknownApps', 'established', 'fringe', 'star', 'benchAtBig', 'youthAtBig'];
function vector(s, peak) {
  const reg = s.apps == null ? 0 : clamp(s.apps / 34, 0, 1.15) - 0.6;
  const intl = (s.active ? 1 : s.capsAt > 0 ? 0.35 : 0) * Math.log1p(Math.min(12, s.capsRate)) * s.natWeight;
  const peakGap = Math.max(0, peak - s.clubR);
  const goal = s.goals == null ? 0 : (s.line === 'FW' ? 1 : s.line === 'MF' ? 0.5 : 0) * clamp(s.goals - (s.line === 'FW' ? 0.3 : 0.12), -0.3, 0.6);
  const established = (s.active ? 1 : 0.5) * Math.min(1, s.capsAt / 45) * s.natWeight;
  const fringe = s.apps == null ? 0 : Math.max(0, 1 - s.apps / 12);
  // A regular international of a strong nation at a strong club: the stars.
  const star = Math.max(0, reg + 0.2) * established * Math.max(0, (s.clubR - 70) / 10);
  const big = Math.max(0, (s.clubR - 72) / 10);
  return [1, reg, intl, peakGap, goal, Math.max(0, 22 - s.age), Math.max(0, s.age - 31), s.apps == null ? 1 : 0, established, fringe, star,
    Math.max(0, 0.75 - clamp((s.apps ?? 20) / 30, 0, 1)) * big, Math.max(0, 23 - s.age) * big];
}
const DEFAULT_COEF = [-3, 7, 0, 0.5, 6, -1.3, 0, 0, 5, -7, -3, -4, -0.8];

function solve(rows, targets) {
  // Ridge least squares, small lambda.
  const k = rows[0].length;
  const A = Array.from({ length: k }, () => new Array(k).fill(0));
  const b = new Array(k).fill(0);
  rows.forEach((x, n) => { for (let i = 0; i < k; i += 1) { b[i] += x[i] * targets[n]; for (let j = 0; j < k; j += 1) A[i][j] += x[i] * x[j]; } });
  for (let i = 0; i < k; i += 1) A[i][i] += 2;
  // Gaussian elimination.
  for (let i = 0; i < k; i += 1) {
    let p = i; for (let r = i + 1; r < k; r += 1) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
    for (let r = i + 1; r < k; r += 1) { const f = A[r][i] / A[i][i]; for (let c = i; c < k; c += 1) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; }
  }
  const x = new Array(k).fill(0);
  for (let i = k - 1; i >= 0; i -= 1) { let sum = b[i]; for (let c = i + 1; c < k; c += 1) sum -= A[i][c] * x[c]; x[i] = sum / A[i][i]; }
  return x;
}

const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);

async function editorialTargets() {
  const { rosterSnapshots, careerSeeds } = await import('../src/games/sports/manager/rosters.js');
  const targets = new Map();
  for (const [year, clubs] of Object.entries(rosterSnapshots)) {
    for (const [clubId, rows] of Object.entries(clubs)) {
      for (const row of rows.split('\n')) {
        const [name, birth, , , rating] = row.split('|');
        if (!name || !rating) continue;
        targets.set(`${strip(name)}:${String(birth).slice(0, 4)}:${year}`, { rating: Number(rating), clubId });
      }
    }
  }
  void careerSeeds;
  return targets;
}

/* ── Main ── */

const t0 = Date.now();
const bios = loadBiographies();
console.error(`biographies parsed: ${bios.length} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
const people = [];
for (const info of bios) {
  const seasons = features(info);
  if (!seasons.length) continue;
  people.push({ info, seasons });
}
console.error(`players with documented league seasons: ${people.length}, seasons: ${people.reduce((n, p) => n + p.seasons.length, 0)}`);

// Coverage of every documented league season: who is missing players?
{
  const count = new Map();
  for (const person of people) for (const s of person.seasons) count.set(`${s.year}:${s.clubId}`, (count.get(`${s.year}:${s.clubId}`) || 0) + 1);
  const report = [];
  for (const [clubId, years] of clubYears) {
    const per = [...years].map((y) => count.get(`${y}:${clubId}`) || 0);
    const avg = per.reduce((a, b) => a + b, 0) / per.length;
    report.push({ clubId, article: clubArticles[clubId]?.title || null, via: clubArticles[clubId]?.via || null, seasons: per.length, avg: +avg.toFixed(1), min: Math.min(...per), leagues: [...new Set([...years].map((y) => leagueOf.get(`${y}:${clubId}`)))] });
  }
  report.sort((a, b) => a.avg - b.avg);
  fs.writeFileSync(path.join(OUT, 'coverage.json'), JSON.stringify(report, null, 1));
  const low = report.filter((r) => r.avg < 12);
  console.error(`club coverage: ${report.length} clubs, ${low.length} below 12 players per season on average`);
}

// Peak club level around each season (where he was a regular, ±3 years).
for (const person of people) {
  for (const s of person.seasons) {
    let peak = s.clubR;
    for (const o of person.seasons) {
      if (Math.abs(o.year - s.year) > 3 || o === s) continue;
      const regular = o.apps == null ? 0.5 : clamp(o.apps / 30, 0, 1);
      peak = Math.max(peak, o.clubR - (1 - regular) * 6);
    }
    s.peak = peak;
  }
}

const targets = await editorialTargets();
const fitRows = []; const fitY = []; const fitBase = [];
for (const person of people) {
  const key = strip(person.info.name);
  const birth = person.info.birthDate.slice(0, 4);
  for (const s of person.seasons) {
    const target = targets.get(`${key}:${birth}:${s.year}`);
    if (!target || target.clubId !== s.clubId) continue;
    fitRows.push(vector(s, s.peak)); fitY.push(target.rating - s.clubR); fitBase.push({ ...s, who: person.info.name });
  }
}
let coef = DEFAULT_COEF;
if (fitRows.length >= 60) coef = solve(fitRows, fitY);
const errors = fitRows.map((x, i) => dot(x, coef) - fitY[i]);
const mae = errors.reduce((a, e) => a + Math.abs(e), 0) / Math.max(1, errors.length);
const flat = fitBase.map((s, i) => Math.abs((s.clubR - 4) - (fitY[i] + s.clubR)));
console.error(`fit on ${fitRows.length} editorial player-seasons: MAE ${mae.toFixed(2)} (flat club-4 baseline ${(flat.reduce((a, b) => a + b, 0) / Math.max(1, flat.length)).toFixed(2)})`);
console.error(`coefficients ${FEATURES.map((f, i) => `${f}=${coef[i].toFixed(2)}`).join(' ')}`);
if (process.argv.includes('--fit-only')) {
  const dump = fitBase.map((s, i) => ({ who: s.who, year: s.year, club: s.clubId, clubR: +s.clubR.toFixed(1), target: +(fitY[i] + s.clubR).toFixed(0), pred: +(s.clubR + dot(fitRows[i], coef)).toFixed(1), apps: s.apps, caps: +s.capsRate.toFixed(1), active: s.active, nat: s.nat, age: s.age }));
  dump.sort((a, b) => Math.abs(b.target - b.pred) - Math.abs(a.target - a.pred));
  fs.writeFileSync(path.join(OUT, 'fit-residuals.json'), JSON.stringify(dump, null, 0));
  process.exit(0);
}

// Ratings, then potential from the rest of the career (the game knows history).
for (const person of people) {
  for (const s of person.seasons) s.rating = clamp(Math.round(s.clubR + dot(vector(s, s.peak), coef)), 38, 95);
  for (const s of person.seasons) {
    const future = person.seasons.filter((o) => o.year > s.year && o.year - s.year <= 8).reduce((m, o) => Math.max(m, o.rating), s.rating);
    const growth = s.age <= 21 ? 7 : s.age <= 24 ? 4 : s.age <= 27 ? 1 : 0;
    const known = person.seasons.some((o) => o.year > s.year);
    s.potential = clamp(Math.round(known ? Math.max(s.rating, future * 0.92 + s.rating * 0.08) : s.rating + growth), s.rating, 96);
  }
}

// Five-season windows, each self-contained.
fs.mkdirSync(DEST, { recursive: true });
for (let start = FIRST; start <= LAST; start += 5) {
  const end = Math.min(LAST, start + 4);
  const clubIndex = new Map();
  const clubs = [];
  const idx = (id) => { if (!clubIndex.has(id)) { clubIndex.set(id, clubs.length); clubs.push(id); } return clubIndex.get(id); };
  const players = [];
  for (const person of people) {
    const rows = person.seasons.filter((s) => s.year >= start && s.year <= end);
    if (!rows.length) continue;
    const info = person.info;
    const altDetail = info.positions.slice(1, 3).map((p) => DETAIL[p]).filter(Boolean);
    players.push([info.name, info.birthDate, rows[0].nat || null, rows[0].detail || rows[0].line || null, altDetail, info.pageid,
      rows.map((s) => [s.year, idx(s.clubId), s.rating, s.potential, s.apps == null ? -1 : Math.round(s.apps), s.loan ? 1 : 0])]);
  }
  const strength = {};
  for (let year = start; year <= end; year += 1) {
    const map = {};
    for (const [clubId, years] of clubYears) if (years.has(year)) { const v = clubStrength(clubId, year); if (v != null) map[clubId] = Math.round(v * 10) / 10; }
    strength[year] = map;
  }
  const output = {
    schemaVersion: 1, window: [start, end], generatedAt: new Date().toISOString(),
    license: 'CC-BY-SA-4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    attribution: 'Career facts (clubs, years, league appearances and goals, senior caps) adapted from English Wikipedia football biographies by their contributors; ratings are original game estimates derived from those facts and from league tables.',
    model: { features: FEATURES, coefficients: coef.map((c) => +c.toFixed(3)), fittedOn: fitRows.length, mae: +mae.toFixed(2) },
    clubs, strength, players,
  };
  fs.writeFileSync(path.join(DEST, `window-${start}.json`), JSON.stringify(output));
  console.error(`window ${start}-${end}: ${players.length} players, ${clubs.length} clubs`);
}
