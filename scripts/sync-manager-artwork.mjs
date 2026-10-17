#!/usr/bin/env node
/** Mirror infobox artwork from explicitly linked club/league identities. */
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fetchWikimedia } from './manager-wikimedia-rate-limit.mjs';
import { footballArtwork } from './lib/wiki-artwork.mjs';
import { managerCompetitionExtensions } from '../src/games/sports/manager/competitions.js';

const cache = 'output/manager-global/artwork';
await fs.mkdir(cache, { recursive: true });
const read = async (path, fallback) => { try { return JSON.parse(await fs.readFile(path, 'utf8')); } catch (error) { if (error.code === 'ENOENT' && fallback !== undefined) return fallback; throw error; } };
const hash = text => createHash('sha256').update(text).digest('hex');
const world = await read('src/games/sports/trayectoria/world.data.json');
const archive = await read('src/games/sports/manager/league-memberships.json');
const articles = await read('output/manager-evidence/club-articles.json', {});
const catalog = [...Object.values(world.competitions), ...managerCompetitionExtensions];
const previous = await read('public/data/football-manager/artwork-sources.json', { records: {} });
const records = previous.records;
const errors = [], rejected = await read('scripts/data/football-asset-rejects.json');
const rejectHashes = new Set(Object.keys(rejected.sha256));
const leagueTitles = {
  'liga-profesional': 'Argentine Primera División', 'primera-nacional': 'Primera Nacional', laliga: 'La Liga', 'laliga-2': 'Segunda División',
  brasileirao: 'Campeonato Brasileiro Série A', 'brasileirao-serie-b': 'Campeonato Brasileiro Série B', championship: 'EFL Championship',
  'copa-de-primera': 'Paraguayan Primera División', 'liga-bolivia': 'Bolivian Primera División', 'liga-uruguaya': 'Uruguayan Primera División',
  liga1: 'Peruvian Primera División', 'liga-premier-de-rusia': 'Russian Premier League', 'primera-division-costa-rica': 'Costa Rican Primera División',
  'slv-primera-division': 'Salvadoran Primera División', 'liga-dominicana-de-futbol': 'Liga Dominicana de Fútbol', 'pan-primera-division': 'Liga Panameña de Fútbol',
  'england-league-one': 'EFL League One', 'england-league-two': 'EFL League Two', 'belgium-first-division': 'Belgian Pro League',
  'greece-super-league': 'Super League Greece', 'scotland-premiership': 'Scottish Premiership', 'switzerland-super-league': 'Swiss Super League',
  bundesliga: 'Bundesliga', '2-bundesliga': '2. Bundesliga', 'germany-3-liga': '3. Liga',
  'austria-bundesliga': 'Austrian Football Bundesliga', 'austria-2-liga': 'Austrian Football Second League',
  'japan-j1': 'J1 League', 'japan-j2': 'J2 League', 'china-super-league': 'Chinese Super League', 'china-league-one': 'China League One',
  'australia-a-league': 'A-League Men', 'korea-k1': 'K League 1', 'korea-k2': 'K League 2', 'saudi-pro-league': 'Saudi Pro League',
  'saudi-first-division': 'Saudi First Division League', 'qatar-stars-league': 'Qatar Stars League', 'uae-pro-league': 'UAE Pro League',
  'iran-pro-league': 'Persian Gulf Pro League', 'india-super-league': 'Indian Super League', 'thailand-league-one': 'Thai League 1',
  'indonesia-liga-one': 'Indonesian Super League', 'malaysia-super-league': 'Malaysia Super League', 'vietnam-league-one': 'V.League 1',
  'uzbekistan-super-league': 'Uzbekistan Super League', 'algeria-ligue-1': 'Algerian Ligue Professionnelle 1', 'algeria-ligue-2': 'Algerian Ligue 2',
  'egypt-premier-league': 'Egyptian Premier League', 'egypt-second-division': 'Egyptian Second Division A', 'morocco-botola': 'Botola',
  'morocco-botola-2': 'Botola 2', 'south-africa-premiership': 'South African Premier Division', 'south-africa-first-division': 'National First Division',
  'tunisia-ligue-1': 'Tunisian Ligue Professionnelle 1', 'nigeria-premier-league': 'Nigeria Premier Football League', 'ghana-premier-league': 'Ghana Premier League',
  'kenya-premier-league': 'Kenyan Premier League', 'tanzania-premier-league': 'Tanzanian Premier League', 'zambia-super-league': 'Zambia Super League',
  'spain-segunda-b': 'Primera Federación', 'angola-girabola': 'Girabola', 'dr-congo-linafoot': 'Linafoot', 'senegal-ligue-1': 'Senegal Premier League', 'ivory-coast-ligue-1': 'Ligue 1 (Ivory Coast)', 'cameroon-elite-one': 'Elite One',
};
const jobs = new Map();
for (const league of catalog) jobs.set(`competitions/${league.id}`, { id: league.id, bucket: 'competitions', title: league.id === 'senegal-ligue-2' ? 'Championnat du Sénégal de football de deuxième division' : leagueTitles[league.id] || league.name, wiki: league.id === 'senegal-ligue-2' ? 'fr' : 'en' });
// The Spanish third tier kept its 1977–2021 identity until the RFEF reform.
jobs.set('competitions/spain-segunda-b-legacy', { id: 'spain-segunda-b-legacy', bucket: 'competitions', title: 'Segunda División B', wiki: 'en' });
for (const leagues of Object.values(archive.seasons)) for (const league of Object.values(leagues)) for (const team of league.teams) {
  const title = articles[team.clubId]?.title || team.article;
  if (title) jobs.set(`crests/${team.clubId}`, { id: team.clubId, bucket: 'crests', title, wiki: articles[team.clubId]?.title ? 'en' : team.articleWiki || 'en' });
}
const existingFiles = new Set();
for (const bucket of ['competitions', 'crests']) {
  await fs.mkdir(`public/assets/football/${bucket}`, { recursive: true });
  for (const file of await fs.readdir(`public/assets/football/${bucket}`)) existingFiles.add(`${bucket}/${file.replace(/\.[^.]+$/, '')}`);
}
// French federation/league articles sometimes provide a logo when their
// English counterparts do not. Follow the explicit interlanguage link only.
const frenchLeagues = process.argv.includes('--french-leagues');
if (frenchLeagues) {
  const missing = [...jobs.values()].filter(job => job.bucket === 'competitions' && job.wiki === 'en' && !records[`competitions/${job.id}`]?.path);
  for (let offset = 0; offset < missing.length; offset += 40) {
    const batch = missing.slice(offset, offset + 40);
    const data = await query({ action: 'query', titles: batch.map(job => job.title).join('|'), redirects: '1', prop: 'langlinks', lllang: 'fr', lllimit: '500' });
    const aliases = new Map([...(data.query?.normalized || []), ...(data.query?.redirects || [])].map(row => [row.from, row.to]));
    for (const job of batch) {
      let title = job.title; const seen = new Set();
      while (aliases.has(title) && !seen.has(title)) { seen.add(title); title = aliases.get(title); }
      const page = data.query?.pages?.find(page => page.title === title);
      const french = page?.langlinks?.find(link => link.lang === 'fr')?.title;
      if (french) jobs.set(`competitions/${job.id}`, { ...job, title: french, wiki: 'fr', linkedFrom: { title: job.title, wiki: 'en' } });
    }
  }
}
// Spanish clubs whose English article has no crest: follow the explicit
// interlanguage link to Spanish Wikipedia, where small clubs often have one.
if (process.argv.includes('--spanish-crests')) {
  const spanishLeagues = new Set(catalog.filter(league => league.country_fifa_code === 'ESP').map(league => league.id));
  const spanishClubs = new Set(Object.values(archive.seasons).flatMap(leagues => Object.entries(leagues).filter(([id]) => spanishLeagues.has(id)).flatMap(([, record]) => record.teams.map(team => team.clubId))));
  const missing = [...jobs.values()].filter(job => job.bucket === 'crests' && job.wiki === 'en' && spanishClubs.has(job.id) && !records[`crests/${job.id}`]?.path && !existingFiles.has(`crests/${job.id}`));
  for (let offset = 0; offset < missing.length; offset += 40) {
    const batch = missing.slice(offset, offset + 40);
    const data = await query({ action: 'query', titles: batch.map(job => job.title).join('|'), redirects: '1', prop: 'langlinks', lllang: 'es', lllimit: '500' });
    const aliases = new Map([...(data.query?.normalized || []), ...(data.query?.redirects || [])].map(row => [row.from, row.to]));
    for (const job of batch) {
      let title = job.title; const seen = new Set();
      while (aliases.has(title) && !seen.has(title)) { seen.add(title); title = aliases.get(title); }
      const spanish = data.query?.pages?.find(page => page.title === title)?.langlinks?.find(link => link.lang === 'es')?.title;
      if (spanish) jobs.set(`crests/${job.id}`, { ...job, title: spanish, wiki: 'es', linkedFrom: { title: job.title, wiki: 'en' } });
    }
  }
}
const previousErrors = new Map((previous.errors || []).map(job => [`${job.bucket}/${job.id}`, job]));
const retryMissing = process.argv.includes('--retry-missing');
const selected = [...jobs].filter(([key, job]) => {
  if (frenchLeagues && job.bucket !== 'competitions') return false;
  const old = previousErrors.get(key);
  const knownMissing = !retryMissing && old?.title === job.title && (old.wiki || 'en') === job.wiki
    && ['no-football-infobox','no-explicit-crest-image','image-not-found','no-verified-logo-entity','no-explicit-logo-property'].includes(old.reason);
  return !knownMissing && !records[key]?.path && (job.bucket === 'competitions' || !existingFiles.has(key));
}).map(([, job]) => job);
const selectedKeys = new Set(selected.map(job => `${job.bucket}/${job.id}`));
errors.push(...[...previousErrors].filter(([key]) => !records[key]?.path && !selectedKeys.has(key)).map(([, job]) => job));
console.log(`${selected.length} missing or unverified artwork identities`);
async function query(params, wiki = 'en') {
  const url = `https://${wiki}.wikipedia.org/w/api.php?${new URLSearchParams({ ...params, format: 'json', formatversion: '2', maxlag: '5' })}`;
  const path = `${cache}/${hash(url)}.json`;
  try { return await read(path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const response = await fetchWikimedia(url);
  if (!response.ok) throw Error(`HTTP ${response.status}`);
  const result = await response.json();
  if (result.error) throw Error(result.error.code);
  await fs.writeFile(path, JSON.stringify(result)); return result;
}
async function publish() {
  const registry = { crests: {}, competitions: {}, trophies: {} };
  for (const bucket of Object.keys(registry)) for (const file of await fs.readdir(`public/assets/football/${bucket}`)) {
    if (/\.(png|svg|webp|jpe?g|gif)$/i.test(file)) registry[bucket][file.replace(/\.[^.]+$/, '')] = `/assets/football/${bucket}/${file}`;
  }
  // Explicitly verified files take priority over stale files with other extensions.
  for (const [key, record] of Object.entries(records)) if (record.path) { const [bucket, id] = key.split('/'); registry[bucket][id] = record.path; }
  await fs.writeFile('src/games/sports/manager/artwork.json', JSON.stringify(registry) + '\n');
  await fs.writeFile('public/data/football-manager/artwork-sources.json', JSON.stringify({ records, errors, generatedAt: new Date().toISOString(), note: 'Logos and crests retain their own copyright and trademark status. Wikipedia text licensing does not license these images. Check each file description before redistribution.' }) + '\n');
}
await publish();
const batches = [...new Set(selected.map(job => job.wiki))].flatMap(wiki => {
  const jobs = selected.filter(job => job.wiki === wiki);
  return Array.from({ length: Math.ceil(jobs.length / 40) }, (_, index) => jobs.slice(index * 40, index * 40 + 40));
});
let processed = 0;
for (const batch of batches) {
  const wiki = batch[0].wiki;
  try {
    const response = await query({ action: 'query', titles: [...new Set(batch.map(job => job.title))].join('|'), redirects: '1', prop: 'revisions', rvprop: 'ids|content', rvslots: 'main' }, wiki);
    const aliases = new Map([...(response.query?.normalized || []), ...(response.query?.redirects || [])].map(row => [row.from, row.to]));
    const canonical = title => { const seen = new Set(); while (aliases.has(title) && !seen.has(title)) { seen.add(title); title = aliases.get(title); } return title; };
    const images = [];
    for (const job of batch) {
      const page = response.query?.pages?.find(page => page.title === canonical(job.title));
      const revision = page?.revisions?.[0], text = revision?.slots?.main?.content || '';
      const artwork = footballArtwork(text, job.bucket);
      if (artwork.reason) { errors.push({ ...job, reason: artwork.reason }); continue; }
      images.push({ ...job, page: page.title, pageid: page.pageid, revision: revision.revid, file: artwork.file });
    }
    if (images.length) {
      const info = await query({ action: 'query', titles: [...new Set(images.map(image => image.file))].join('|'), prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '160', redirects: '1' }, wiki);
      const imageAliases = new Map([...(info.query?.normalized || []), ...(info.query?.redirects || [])].map(row => [row.from, row.to]));
      for (const job of images) {
        const page = info.query?.pages?.find(page => page.title === (imageAliases.get(job.file) || job.file));
        const details = page?.imageinfo?.[0];
        if (!details?.url) { errors.push({ ...job, reason: 'image-not-found' }); continue; }
        const source = details.thumburl || details.url;
        try {
          let response;
          for (let attempt = 0; attempt < 3; attempt++) {
            response = await fetch(source, { headers: { 'User-Agent': 'GameLockArchive/1.0 (gamelockweb@gmail.com)' }, signal: AbortSignal.timeout(45000) });
            if (response.status !== 429 && response.status !== 503) break;
            const retry = Number(response.headers.get('retry-after')) || 30;
            await response.arrayBuffer(); await new Promise(resolve => setTimeout(resolve, Math.min(300, Math.max(30, retry)) * 1000));
          }
          if (!response.ok) throw Error(`HTTP ${response.status}`);
          const type = response.headers.get('content-type')?.split(';')[0];
          const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/gif': 'gif' }[type];
          if (!extension) throw Error('not-image');
          const bytes = new Uint8Array(await response.arrayBuffer());
          if (bytes.length > 2 * 1024 * 1024 || bytes.length < 100 || rejectHashes.has(hash(bytes))) throw Error('invalid-image');
          const path = `/assets/football/${job.bucket}/${job.id}.${extension}`;
          await fs.writeFile(`public${path}`, bytes);
          records[`${job.bucket}/${job.id}`] = { ...job, path, source, descriptionUrl: details.descriptionurl, license: details.extmetadata?.LicenseShortName?.value || 'Unspecified; see file description', licenseUrl: details.extmetadata?.LicenseUrl?.value || null, artist: details.extmetadata?.Artist?.value || null, copyrighted: details.extmetadata?.Copyrighted?.value || null, sha256: hash(bytes), bytes: bytes.length };
          await new Promise(resolve => setTimeout(resolve, 350));
        } catch (error) { errors.push({ ...job, source, reason: error.message }); }
      }
    }
  } catch (error) { for (const job of batch) errors.push({ ...job, reason: error.message }); }
  await publish();
  processed += batch.length;
  console.log(`${processed}/${selected.length}: ${Object.keys(records).length} verified images, ${errors.length} gaps`);
}
