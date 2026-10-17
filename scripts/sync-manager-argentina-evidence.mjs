/** Extend Claude's Spanish biography cache for every historical Argentine top-flight club. */
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { fetchWikimedia } from './manager-wikimedia-rate-limit.mjs';
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const archive = await read('src/games/sports/manager/league-memberships.json');
const english = await read('output/manager-evidence/club-articles.json');
const root = 'output/manager-evidence-es', localized = await read(`${root}/club-articles.json`);
const ids = [...new Set(Object.values(archive.seasons).flatMap(leagues => (leagues['liga-profesional']?.teams || []).map(team => team.clubId)))];
const cache = 'output/manager-global/argentina-evidence';
await fs.mkdir(cache, { recursive: true });
const hash = text => createHash('sha256').update(text).digest('hex');
async function query(params, language = 'es') {
  const url = `https://${language}.wikipedia.org/w/api.php?${new URLSearchParams({ ...params, format: 'json', formatversion: '2', maxlag: '5' })}`;
  const file = `${cache}/${hash(url)}.json`;
  try { return await read(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetchWikimedia(url);
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.error?.code === 'maxlag' && attempt < 2) continue;
    if (data.error) throw Error(data.error.code);
    await fs.writeFile(file, JSON.stringify(data)); return data;
  }
}
for (let offset = 0; offset < ids.length; offset += 40) {
  const batch = ids.slice(offset, offset + 40).filter(id => english[id]?.title);
  const data = await query({ action: 'query', titles: batch.map(id => english[id].title).join('|'), redirects: '1', prop: 'langlinks', lllang: 'es', lllimit: '500' }, 'en');
  const aliases = new Map([...(data.query?.normalized || []), ...(data.query?.redirects || [])].map(row => [row.from, row.to]));
  for (const id of batch) {
    let title = english[id].title; const seen = new Set();
    while (aliases.has(title) && !seen.has(title)) { seen.add(title); title = aliases.get(title); }
    const page = data.query?.pages?.find(page => page.title === title);
    const translated = page?.langlinks?.find(link => link.lang === 'es')?.title;
    if (translated) localized[id] = { title: translated, via: 'verified-season-langlink', verifiedAgainst: english[id].title };
  }
}
await fs.writeFile(`${root}/club-articles.json`, JSON.stringify(localized, null, 1));
const titles = [...new Set(ids.map(id => localized[id]?.title).filter(Boolean))], wanted = new Set();
const report = { clubs: ids.length, linkedArticles: titles.length, missingArticles: ids.filter(id => !localized[id]?.title), collected: [] };
for (const [index, title] of titles.entries()) {
  const file = `${root}/links/${encodeURIComponent(title).replace(/%/g, '_').slice(0, 180)}.json`;
  let links;
  try { links = await read(file); if (links.title !== title) throw Error(`Link-cache title collision: ${title}`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!links) {
    const redirects = new Set([title]), biographies = new Map(); let continuation = {};
    do {
      const data = await query({ action: 'query', titles: title, prop: 'redirects', rdlimit: '500', rdnamespace: '0', ...continuation });
      for (const page of data.query?.pages || []) for (const alias of page.redirects || []) redirects.add(alias.title);
      continuation = data.continue;
    } while (continuation);
    continuation = {};
    do {
      const data = await query({ action: 'query', generator: 'backlinks', gbltitle: title, gblredirect: '1', gblnamespace: '0', gbllimit: '500', prop: 'templates', tltemplates: 'Plantilla:Ficha de deportista|Plantilla:Ficha de futbolista', tllimit: 'max', ...continuation });
      for (const page of data.query?.pages || []) if (page.templates?.length) biographies.set(page.pageid, page.title);
      continuation = data.continue;
    } while (continuation);
    links = { title, redirects: [...redirects], bios: [...biographies] };
    await fs.writeFile(file, JSON.stringify(links));
  }
  for (const [id] of links.bios) wanted.add(id);
  report.collected.push({ title, biographies: links.bios.length });
  console.log(`Argentine club ${index + 1}/${titles.length}: ${title} (${links.bios.length} biographies)`);
}
const indexFile = `${root}/bios/index.txt`, done = new Set((await fs.readFile(indexFile, 'utf8')).split('\n').filter(Boolean).map(Number));
const pending = [...wanted].filter(id => !done.has(id));
let batch = (await fs.readdir(`${root}/bios`)).filter(file => file.endsWith('.ndjson.gz')).length;
let tableBatch = (await fs.readdir(`${root}/tables`)).filter(file => file.endsWith('.gz')).length;
function infobox(text) {
  const start = text.search(/\{\{\s*ficha de (?:deportista|futbolista)/i); if (start < 0) return null;
  let depth = 0, end = start;
  for (; end < text.length - 1; end++) {
    const pair = text.slice(end, end + 2);
    if (pair === '{{') { depth++; end++; }
    else if (pair === '}}') { depth--; end++; if (!depth) { end++; break; } }
  }
  return text.slice(start, end);
}
console.log(`Additional Spanish biographies: ${pending.length}`);
for (let offset = 0; offset < pending.length; offset += 50) {
  const data = await query({ action: 'query', pageids: pending.slice(offset, offset + 50).join('|'), prop: 'revisions', rvprop: 'content|ids', rvslots: 'main' });
  const biographies = [], tables = [];
  for (const page of data.query?.pages || []) {
    const text = page.revisions?.[0]?.slots?.main?.content || '';
    biographies.push({ pageid: page.pageid, title: page.title, revid: page.revisions?.[0]?.revid || null, infobox: infobox(text) });
    const start = text.search(/==\s*(?:Clubes|Trayectoria|Carrera(?: deportiva)?|Equipos)\s*==/i);
    tables.push({ pageid: page.pageid, table: start < 0 ? null : text.slice(start, start + 6000).split(/\n==[^=]/)[0] });
  }
  await fs.writeFile(`${root}/bios/batch-${String(++batch).padStart(5, '0')}.ndjson.gz`, gzipSync(biographies.map(row => JSON.stringify(row)).join('\n')));
  await fs.writeFile(`${root}/tables/t-${String(++tableBatch).padStart(5, '0')}.ndjson.gz`, gzipSync(tables.map(row => JSON.stringify(row)).join('\n')));
  await fs.appendFile(indexFile, `${biographies.map(row => row.pageid).join('\n')}\n`);
  console.log(`Spanish biographies ${Math.min(offset + 50, pending.length)}/${pending.length}`);
}
report.additionalBiographies = pending.length;
await fs.writeFile(`${cache}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ clubs: ids.length, linkedArticles: titles.length, additionalBiographies: pending.length }));
