/** Fill explicit missing logos using Wikidata P154, never generic photographs. */
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fetchWikimedia } from './manager-wikimedia-rate-limit.mjs';
const read = async path => JSON.parse(await fs.readFile(path, 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const cache = 'output/manager-global/wikidata-artwork';
await fs.mkdir(cache, { recursive: true });
const manifest = await read('public/data/football-manager/artwork-sources.json');
const registry = await read('src/games/sports/manager/artwork.json');
const rejected = new Set(Object.keys((await read('scripts/data/football-asset-rejects.json')).sha256));
const jobs = [...new Map(manifest.errors.map(job => [`${job.bucket}/${job.id}`, job])).values()].filter(job => !manifest.records[`${job.bucket}/${job.id}`]?.path);
const errors = []; let added = 0, completed = 0;
const batches = [...new Set(jobs.map(job => job.wiki || 'en'))].flatMap(wiki => {
  const matching = jobs.filter(job => (job.wiki || 'en') === wiki);
  return Array.from({ length: Math.ceil(matching.length / 40) }, (_, index) => matching.slice(index * 40, index * 40 + 40));
});
const ordered = batches.flat();
async function query(params, host = 'en.wikipedia.org') {
  const url = `https://${host}/w/api.php?${new URLSearchParams({ ...params, format: 'json', formatversion: '2', maxlag: '5' })}`;
  const path = `${cache}/${hash(url)}.json`;
  try { return await read(path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  for(let attempt=0;attempt<3;attempt++){
    const response = await fetchWikimedia(url);
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    const data = await response.json();
    if(data.error?.code==='maxlag'&&attempt<2)continue; // Shared limiter honours the server cooldown.
    if(data.error)throw Error(data.error.code);
    await fs.writeFile(path, JSON.stringify(data)); return data;
  }
}
async function publish() {
  manifest.errors = [...new Map([...errors, ...ordered.slice(completed)].map(job=>[`${job.bucket}/${job.id}`,job])).values()];
  manifest.generatedAt = new Date().toISOString();
  await fs.writeFile('public/data/football-manager/artwork-sources.json', JSON.stringify(manifest) + '\n');
  await fs.writeFile('src/games/sports/manager/artwork.json', JSON.stringify(registry) + '\n');
}
for (const batch of batches) {
  const candidates = [], host = `${batch[0].wiki || 'en'}.wikipedia.org`;
  try {
    const response = await query({ action: 'query', titles: [...new Set(batch.map(job => job.title))].join('|'), redirects: '1', prop: 'pageprops|templates|revisions', ppprop: 'wikibase_item', tltemplates: 'Template:Infobox football club|Template:Infobox soccer club|Template:Infobox football team|Template:Infobox sports team|Template:Infobox football league|Template:Infobox sports league|Template:Infobox Club de football|Template:Infobox Compétition sportive', tllimit: 'max', rvprop: 'ids' }, host);
    const aliases = new Map([...(response.query?.normalized || []), ...(response.query?.redirects || [])].map(row => [row.from, row.to]));
    for (const job of batch) {
      let title = job.title; const seen = new Set();
      while (aliases.has(title) && !seen.has(title)) { seen.add(title); title = aliases.get(title); }
      const page = response.query?.pages?.find(page => page.title === title);
      const id = page?.pageprops?.wikibase_item;
      const accepted = page?.templates?.some(template => job.bucket === 'crests' ? /club|team/i.test(template.title) : /league|compétition/i.test(template.title));
      if (!id || !accepted) { errors.push({ ...job, reason: 'no-verified-logo-entity' }); continue; }
      candidates.push({ ...job, page: page.title, revision: page.revisions?.[0]?.revid, wikidata: id });
    }
    if (candidates.length) {
      const data = await query({ action: 'wbgetentities', ids: [...new Set(candidates.map(job => job.wikidata))].join('|'), props: 'claims' }, 'www.wikidata.org');
      const images = [];
      for (const job of candidates) {
        const entity = data.entities?.[job.wikidata];
        const logo = entity?.claims?.P154?.filter(claim => claim.rank !== 'deprecated' && claim.mainsnak?.datavalue?.type === 'string').sort((a,b) => Number(b.rank === 'preferred') - Number(a.rank === 'preferred'))[0]?.mainsnak.datavalue.value;
        if (!logo) { errors.push({ ...job, reason: 'no-explicit-logo-property' }); continue; }
        images.push({ ...job, file: `File:${logo.replace(/_/g, ' ')}`, property: 'P154', entityRevision: entity.lastrevid });
      }
      if (images.length) {
        const data = await query({ action: 'query', titles: [...new Set(images.map(job => job.file))].join('|'), redirects: '1', prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '160' }, host);
        const aliases = new Map([...(data.query?.normalized || []), ...(data.query?.redirects || [])].map(row => [row.from, row.to]));
        for (const job of images) {
          try {
            const info = data.query?.pages?.find(page => page.title === (aliases.get(job.file) || job.file))?.imageinfo?.[0];
            if (!info?.url) throw Error('image-not-found');
            const source = info.thumburl || info.url;
            let response;
            for (let attempt=0; attempt<3; attempt++) {
              response = await fetch(source, { headers: { 'User-Agent': 'GameLockArchive/1.0 (gamelockweb@gmail.com)' }, signal: AbortSignal.timeout(45000) });
              if (![429,503].includes(response.status)) break;
              const delay = Math.min(300, Math.max(30, Number(response.headers.get('retry-after')) || 30));
              await response.arrayBuffer(); await new Promise(resolve => setTimeout(resolve, delay * 1000));
            }
            if (!response.ok) throw Error(`HTTP ${response.status}`);
            const type = response.headers.get('content-type')?.split(';')[0];
            const extension = { 'image/png':'png','image/jpeg':'jpg','image/svg+xml':'svg','image/webp':'webp','image/gif':'gif' }[type];
            const bytes = new Uint8Array(await response.arrayBuffer());
            if (!extension || bytes.length < 100 || bytes.length > 2097152 || rejected.has(hash(bytes))) throw Error('invalid-image');
            const path = `/assets/football/${job.bucket}/${job.id}.${extension}`;
            await fs.writeFile(`public${path}`, bytes);
            manifest.records[`${job.bucket}/${job.id}`] = { ...job, path, source, descriptionUrl: info.descriptionurl, license: info.extmetadata?.LicenseShortName?.value || 'Unspecified; see file description', licenseUrl: info.extmetadata?.LicenseUrl?.value || null, artist: info.extmetadata?.Artist?.value || null, copyrighted: info.extmetadata?.Copyrighted?.value || null, sha256: hash(bytes), bytes: bytes.length };
            registry[job.bucket][job.id] = path; added++;
            await new Promise(resolve => setTimeout(resolve,350));
          } catch (error) { errors.push({ ...job, reason: error.message }); }
        }
      }
    }
  } catch (error) {
    for (const job of batch) errors.push({ ...job, reason: error.message });
    if(error.message==='maxlag'){
      await publish();
      console.log('Wikidata is temporarily lagging; remaining identities preserved for a later retry.');
      break;
    }
  }
  completed += batch.length;
  await publish();
  console.log(`${completed}/${jobs.length}: ${added} additional explicit logos, ${errors.length} gaps`);
}
