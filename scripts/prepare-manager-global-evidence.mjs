/** Resolve only explicitly linked club articles; reuse Claude's biography cache. */
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fetchWikimedia } from './manager-wikimedia-rate-limit.mjs';
import { correctGlobalParticipant } from '../src/games/sports/manager/global-club-aliases.js';
import { globalLeagueSources } from '../src/games/sports/manager/global-leagues.js';
const read = async path => JSON.parse(await fs.readFile(path, 'utf8'));
const archive = await read('src/games/sports/manager/league-memberships.json');
const file = 'output/manager-evidence/club-articles.json', clubs = await read(file);
const country = new Map(globalLeagueSources.map(league => [league.id, league.country_fifa_code]));
const jobs = new Map();
for (const [year, leagues] of Object.entries(archive.seasons)) for (const [league, record] of Object.entries(leagues)) for (const row of record.teams) {
  const team = correctGlobalParticipant(row, country.get(league), Number(year));
  if (!team.article || (team.articleWiki && team.articleWiki !== 'en')) continue;
  if (!jobs.has(team.clubId)) jobs.set(team.clubId, new Set());
  // A table may link a reserve side to its first team's article; the reserve has its own.
  jobs.get(team.clubId).add(team.identityName ?? team.article);
}
const fold = title => String(title).replace(/_/g, ' ').normalize('NFC').toLowerCase();
for (const [id, options] of jobs) {
  const known = clubs[id];
  const candidates = new Set([...options].map(fold));
  if (known?.title && [known.title, ...(known.articleAliases || [])].some(title => candidates.has(fold(title)))) jobs.delete(id);
}
const cache = 'output/manager-global/evidence';
await fs.mkdir(cache, { recursive: true });
async function query(titles, properties = { prop: 'templates', tltemplates: 'Template:Infobox football club|Template:Infobox soccer club', tllimit: 'max' }) {
  const url = `https://en.wikipedia.org/w/api.php?${new URLSearchParams({ action: 'query', titles: titles.join('|'), redirects: '1', ...properties, format: 'json', formatversion: '2', maxlag: '5' })}`;
  const path = `${cache}/${createHash('sha256').update(url).digest('hex')}.json`;
  try { return await read(path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const response = await fetchWikimedia(url);
  if (!response.ok) throw Error(`HTTP ${response.status}`);
  const data = await response.json(); if (data.error) throw Error(data.error.code);
  await fs.writeFile(path, JSON.stringify(data)); return data;
}
const titles = [...new Set([...jobs.values()].flatMap(set => [...set]))], verified = new Map();
for (let offset = 0; offset < titles.length; offset += 40) {
  const batch = titles.slice(offset, offset + 40), data = await query(batch);
  const redirects = new Map([...(data.query?.normalized || []), ...(data.query?.redirects || [])].map(row => [row.from, row.to]));
  for (const title of batch) {
    let canonical = title; const seen = new Set();
    while (redirects.has(canonical) && !seen.has(canonical)) { seen.add(canonical); canonical = redirects.get(canonical); }
    const page = data.query?.pages?.find(page => page.title === canonical);
    if (!page?.missing && page?.templates?.length) verified.set(title, { title: page.title, pageid: page.pageid });
  }
  console.log(`Validated club articles ${Math.min(offset + 40, titles.length)}/${titles.length}`);
}
const missing = [], identityCorrections = []; let added = 0;
for (const [id, options] of jobs) {
  const matches = [...options].filter(title => verified.has(title));
  const pages = new Set(matches.map(title => verified.get(title).pageid));
  if (pages.size !== 1) { missing.push({ id, titles: [...options], reason: pages.size ? 'ambiguous-linked-articles' : 'no-verified-club-article' }); continue; }
  const previous = clubs[id]?.title;
  const resolved = verified.get(matches[0]);
  clubs[id] = { ...resolved, articleAliases: matches, via: 'verified-season-table-link' }; added++;
  if (previous && previous !== resolved.title) identityCorrections.push({ id, previous, current: resolved.title });
}
await fs.writeFile(file, JSON.stringify(clubs, null, 1));
// English identities repaired by the previous crawler can still have an old
// interlanguage mapping to an unrelated club. Revalidate those explicit links.
const localizedCorrections = [];
for (const language of ['es', 'de']) {
  const path = `output/manager-evidence-${language}/club-articles.json`;
  let localized;
  try { localized = await read(path); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  const corrected = new Set(identityCorrections.map(row => row.id));
  const stale = Object.entries(localized).filter(([id, info]) => (clubs[id]?.via === 'restored' || corrected.has(id)) && info.title && info.verifiedAgainst !== clubs[id].title);
  for (let offset = 0; offset < stale.length; offset += 40) {
    const batch = stale.slice(offset, offset + 40);
    const data = await query(batch.map(([id]) => clubs[id].title), { prop: 'langlinks', lllang: language, lllimit: '500' });
    const aliases = new Map([...(data.query?.normalized || []), ...(data.query?.redirects || [])].map(row => [row.from, row.to]));
    for (const [id, previous] of batch) {
      let title = clubs[id].title; const seen = new Set();
      while (aliases.has(title) && !seen.has(title)) { seen.add(title); title = aliases.get(title); }
      const page = data.query?.pages?.find(page => page.title === title);
      const translated = page?.langlinks?.find(link => link.lang === language)?.title || null;
      localized[id] = { title: translated, via: 'verified-restored-langlink', verifiedAgainst: clubs[id].title, previousTitle: previous.title };
      if (translated !== previous.title) localizedCorrections.push({ id, language, previous: previous.title, current: translated });
    }
  }
  if (stale.length) await fs.writeFile(path, JSON.stringify(localized, null, 1));
}
await fs.writeFile(`${cache}/report.json`, JSON.stringify({ added, missing, identityCorrections, localizedCorrections }, null, 2));
console.log(JSON.stringify({ added, missing: missing.length, identityCorrections: identityCorrections.length, localizedCorrections: localizedCorrections.length }));
