/** Quarantine our downloaded images whose inherited club identity was corrected. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const corrections = (await read('output/manager-global/evidence/report.json')).identityCorrections || [];
const manifest = await read('public/data/football-manager/artwork-sources.json');
const registry = await read('src/games/sports/manager/artwork.json');
const assets = path.resolve('public/assets/football/crests');
const quarantine = path.resolve('output/manager-global/rejected-artwork');
await fs.mkdir(quarantine, { recursive: true });
const changes = [];
for (const correction of corrections) {
  const key = `crests/${correction.id}`, record = manifest.records[key];
  if (!record || (record.wiki && record.wiki !== 'en') || record.page === correction.current) continue;
  // Only an image fetched against the now-rejected identity is moved.
  if (record.title !== correction.previous && record.page !== correction.previous) continue;
  const source = path.resolve(`public${record.path}`), destination = path.join(quarantine, path.basename(source));
  if (!source.startsWith(`${assets}${path.sep}`) || !destination.startsWith(`${quarantine}${path.sep}`)) throw Error('Artwork path outside expected directories');
  const bytes = await fs.readFile(source);
  if (createHash('sha256').update(bytes).digest('hex') !== record.sha256) throw Error(`Artwork modified since download: ${correction.id}`);
  await fs.rename(source, destination);
  delete manifest.records[key]; delete registry.crests[correction.id];
  manifest.errors = manifest.errors.filter(row => !(row.bucket === 'crests' && row.id === correction.id));
  manifest.errors.push({ id: correction.id, bucket: 'crests', title: correction.current, wiki: 'en', reason: 'corrected-club-identity' });
  changes.push({ ...correction, previousArtwork: record, quarantine: destination });
}
await fs.writeFile('public/data/football-manager/artwork-sources.json', JSON.stringify(manifest) + '\n');
await fs.writeFile('src/games/sports/manager/artwork.json', JSON.stringify(registry) + '\n');
await fs.writeFile('output/manager-global/artwork-identity-corrections.json', JSON.stringify(changes, null, 2));
console.log(`Quarantined ${changes.length} images from corrected club identities`);
