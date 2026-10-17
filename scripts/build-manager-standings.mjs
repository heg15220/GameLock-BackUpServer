#!/usr/bin/env node
/**
 * Final league tables for every documented league season.
 *
 * Match-by-match sources (footballcsv, OpenFootball; CC0) are already cached by
 * the membership importer: the table is recomputed from the results. Seasons
 * documented by a Wikipedia season article use the article's own league table
 * (CC BY-SA), fetched once by revision and cached.
 *
 *   node scripts/build-manager-standings.mjs [--offline]
 *
 * Output: src/games/sports/manager/historical-standings.json
 *   seasons[year][leagueId] = [[clubId, played, won, drawn, lost, gf, ga], …] (table order)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const offline = process.argv.includes('--offline');
const memberships = JSON.parse(fs.readFileSync('src/games/sports/manager/league-memberships.json', 'utf8'));
const cacheDirs = ['.cache/football-manager-memberships', '.cache/football-manager-regions', '.cache/football-manager', '.cache/football-manager-standings'];
fs.mkdirSync('.cache/football-manager-standings', { recursive: true });
const sha = (text) => createHash('sha256').update(text).digest('hex');
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\(\d+\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const STOP = new Set(['fc', 'cf', 'ac', 'sc', 'cd', 'ud', 'sd', 'rc', 'club', 'de', 'la', 'el', 'afc', 'cfc', 'sv', 'vfl', 'vfb', 'tsv', 'fk', 'sk', 'us', 'as', 'ss', 'calcio', 'football', 'futbol', 'clube', 'esporte', 'sport', 'sporting', 'and', 'the', 'real', 'atletico', 'sp', 'rj', 'rs', 'mg', 'pr', 'sc', 'ba', 'pe', 'go', 'ce']);

function cached(url) {
  const key = sha(url);
  for (const dir of cacheDirs) {
    const file = path.join(dir, `${key}.json`);
    if (fs.existsSync(file)) {
      try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* corrupt */ }
    }
  }
  return null;
}

function nameMatcher(teams) {
  const exact = new Map();
  for (const team of teams) {
    exact.set(fold(team.name), team.clubId);
    if (team.article) exact.set(fold(team.article), team.clubId);
  }
  const memo = new Map();
  return (raw) => {
    const key = fold(raw);
    if (memo.has(key)) return memo.get(key);
    let id = exact.get(key) || null;
    if (!id) {
      // Token overlap against the season's own participant names only.
      const tokens = key.split(' ').filter((t) => t.length > 1 && !STOP.has(t));
      let best = null; let bestScore = 0; let tie = false;
      for (const team of teams) {
        const other = new Set(fold(`${team.name} ${team.article || ''}`).split(' '));
        const score = tokens.filter((t) => other.has(t) || [...other].some((o) => o.length > 3 && (o.startsWith(t) || t.startsWith(o)))).length;
        if (score > bestScore) { best = team.clubId; bestScore = score; tie = false; } else if (score === bestScore && score > 0 && best !== team.clubId) tie = true;
      }
      id = bestScore && !tie ? best : null;
    }
    memo.set(key, id);
    return id;
  };
}

function tableFromResults(matches, teams) {
  const match = nameMatcher(teams);
  const rows = new Map();
  const row = (id) => { if (!rows.has(id)) rows.set(id, [id, 0, 0, 0, 0, 0, 0]); return rows.get(id); };
  let unmatched = 0;
  for (const [t1, t2, g1, g2] of matches) {
    const a = match(t1); const b = match(t2);
    if (!a || !b || a === b) { unmatched += 1; continue; }
    const ra = row(a); const rb = row(b);
    ra[1] += 1; rb[1] += 1; ra[5] += g1; ra[6] += g2; rb[5] += g2; rb[6] += g1;
    if (g1 > g2) { ra[2] += 1; rb[4] += 1; } else if (g1 < g2) { rb[2] += 1; ra[4] += 1; } else { ra[3] += 1; rb[3] += 1; }
  }
  const table = [...rows.values()].sort((x, y) => (y[2] * 3 + y[3]) - (x[2] * 3 + x[3]) || (y[5] - y[6]) - (x[5] - x[6]) || y[5] - x[5]);
  return { table, unmatched };
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines.shift().split(',');
  const i1 = header.indexOf('Team 1'); const i2 = header.indexOf('Team 2'); const ift = header.indexOf('FT');
  const stage = header.indexOf('Stage');
  const out = [];
  for (const line of lines) {
    const cells = line.split(',');
    if (stage >= 0 && cells[stage] && !/regular/i.test(cells[stage])) continue;
    const m = /^(\d+)-(\d+)/.exec(cells[ift] || '');
    if (!m) continue;
    out.push([cells[i1], cells[i2], Number(m[1]), Number(m[2])]);
  }
  return out;
}

function parseOpenfootballJson(text) {
  const json = JSON.parse(text);
  const out = [];
  const visit = (matches) => { for (const m of matches || []) { const ft = m.score?.ft || (Array.isArray(m.score) ? m.score : null); if (ft && ft.length === 2) out.push([m.team1?.name || m.team1, m.team2?.name || m.team2, ft[0], ft[1]]); } };
  visit(json.matches);
  for (const round of json.rounds || []) visit(round.matches);
  return out;
}

/* ── Wikipedia league tables ── */

async function wikiText(source) {
  const oldid = /oldid=(\d+)/.exec(source)?.[1];
  const host = /https:\/\/([a-z]+\.wikipedia\.org)/.exec(source)?.[1] || 'en.wikipedia.org';
  if (!oldid) return null;
  const url = `https://${host}/w/index.php?action=raw&oldid=${oldid}`;
  const hit = cached(url);
  if (hit) return hit.text;
  if (offline) return null;
  await new Promise((r) => setTimeout(r, 700));
  const response = await fetch(url, { headers: { 'User-Agent': 'GameLock-Manager-DataBuilder/1.0 (hugoeg2002@gmail.com)' } });
  if (!response.ok) return null;
  const text = await response.text();
  fs.writeFileSync(path.join('.cache/football-manager-standings', `${sha(url)}.json`), JSON.stringify({ url, text, fetchedAt: new Date().toISOString() }));
  return text;
}

const linkTarget = (value) => /\[\[([^\]|#]+)/.exec(value || '')?.[1]?.trim() || String(value || '').replace(/\{\{[^}]*\}\}|<[^>]+>|'''?/g, '').trim();

/** {{#invoke:Sports table}} and {{Fb cl team}} tables; first table wins. */
function tablesFromWikitext(text) {
  const tables = [];
  const invokes = text.split(/\{\{\s*#invoke:\s*sports table/i).slice(1);
  for (const body of invokes) {
    const field = (name) => new RegExp(`\\|\\s*${name}\\s*=\\s*([^|\\n}]*)`, 'i');
    const order = [];
    for (let i = 1; i < 60; i += 1) { const m = field(`team${i}`).exec(body); if (!m) break; order.push(m[1].trim()); }
    const rows = [];
    for (const code of order) {
      const get = (key) => Number((field(`${key}_${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).exec(body) || [])[1]) || 0;
      const nameMatch = new RegExp(`\\|\\s*name_${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*(\\[\\[[^\\]]*\\]\\]|[^|\\n]*)`, 'i').exec(body);
      const w = get('win'); const d = get('draw'); const l = get('loss');
      rows.push({ name: linkTarget(nameMatch?.[1] || code), display: nameMatch?.[1] || code, w, d, l, gf: get('gf'), ga: get('ga') });
    }
    if (rows.length >= 6 && rows.some((r) => r.w + r.d + r.l > 0)) tables.push(rows);
  }
  const fb = [...text.matchAll(/\{\{\s*fb cl2? team([^}]*)\}\}/gi)];
  if (fb.length >= 6) {
    const rows = fb.map(([, body]) => {
      const get = (key) => Number((new RegExp(`\\|\\s*${key}\\s*=\\s*(\\d+)`, 'i').exec(body) || [])[1]) || 0;
      const t = /\|\s*t\s*=\s*(\[\[[^\]]*\]\]|[^|]*)/i.exec(body)?.[1] || '';
      return { name: linkTarget(t), display: t, w: get('w'), d: get('d'), l: get('l'), gf: get('gf'), ga: get('ga') };
    });
    tables.push(rows);
  }
  return tables;
}

const output = { schemaVersion: 1, generatedAt: new Date().toISOString(), method: 'Tables recomputed from cached CC0 match results (footballcsv, OpenFootball); Wikipedia season tables (CC BY-SA 4.0) where the season is documented by its article.', seasons: {} };
const stats = { ok: 0, missing: 0, wiki: 0, weak: 0 };
for (const [year, leagues] of Object.entries(memberships.seasons)) {
  for (const [leagueId, record] of Object.entries(leagues)) {
    let table = null;
    let unmatched = 0;
    if (record.sourceId === 'wikimedia-regional-seasons') {
      const text = await wikiText(record.source);
      if (text) {
        const match = nameMatcher(record.teams);
        if (record.groups?.length > 1) {
          // Regional groups: one table per group, joined into the season's table.
          const seen = new Set(); const joined = [];
          for (const rows of tablesFromWikitext(text)) {
            const mapped = rows.map((r) => [match(r.name) || match(r.display), r.w + r.d + r.l, r.w, r.d, r.l, r.gf, r.ga]).filter((r) => r[0] && r[1] > 0);
            if (mapped.length < 6 || mapped.some((r) => seen.has(r[0]))) continue;
            mapped.forEach((r) => seen.add(r[0])); joined.push(...mapped);
          }
          if (joined.length >= record.teams.length * 0.6) table = joined;
        } else for (const rows of tablesFromWikitext(text)) {
          const mapped = rows.map((r) => [match(r.name) || match(r.display), r.w + r.d + r.l, r.w, r.d, r.l, r.gf, r.ga]).filter((r) => r[0]);
          const ids = new Set(mapped.map((r) => r[0]));
          if (ids.size >= Math.min(record.teams.length, 6) * 0.7) { table = mapped; break; }
        }
        if (table) stats.wiki += 1;
      }
    } else {
      const hit = cached(record.source);
      if (hit?.text) {
        const matches = record.source.endsWith('.json') ? parseOpenfootballJson(hit.text) : parseCsv(hit.text);
        const result = tableFromResults(matches, record.teams);
        table = result.table; unmatched = result.unmatched;
      }
    }
    if (!table || table.length < Math.max(4, record.teams.length * 0.6)) { stats.missing += 1; if (!table) continue; stats.weak += 1; }
    else stats.ok += 1;
    (output.seasons[year] ||= {})[leagueId] = table;
    if (unmatched > 10) console.error(`${year} ${leagueId}: ${unmatched} unmatched fixtures`);
  }
}
fs.writeFileSync('src/games/sports/manager/historical-standings.json', JSON.stringify(output));
console.log(stats);
