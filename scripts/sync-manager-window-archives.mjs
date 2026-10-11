import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { parseDatedFifaPdf, parseDatedFifaHtml, mergeDatedWindowRecords, validArchiveDate } from './manager-transfer-window-archive-parser.mjs';
import { fifa2018Rows } from './manager-transfer-window-2018-transcription.mjs';

const root = resolve(process.argv[2] || 'output/manager-v10/windows');
const cachedPath = async name => {
  for (const directory of [root, resolve('output/manager-v9/windows')]) {
    const path = resolve(directory, name);
    try { await fs.access(path); return path; } catch { /* Try the previous verified cache. */ }
  }
  throw new Error(`Missing pinned source ${name}; run download-manager-window-archives.py`);
};
const manifest = JSON.parse(await fs.readFile('scripts/manager-transfer-window-sources.json', 'utf8'));
const base = JSON.parse(await fs.readFile('src/games/sports/manager/transfer-windows.data.json', 'utf8'));
const names = Object.fromEntries(Object.entries(base.profiles).map(([country, item]) => [country, item.association]));
const editions = [], rejected = [], sources = {};
for (const source of manifest) {
  const bytes = await fs.readFile(await cachedPath(`${source.file}.${source.format === 'html' ? 'html' : 'pdf'}`));
  if (createHash('sha256').update(bytes).digest('hex') !== source.sha256) throw new Error(`Source changed: ${source.id}`);
  const parsed = source.transcription ? { records: fifa2018Rows, rejected: [] }
    : source.format === 'html' ? parseDatedFifaHtml(bytes.toString('utf8'), names, source.id, source)
      : parseDatedFifaPdf(JSON.parse(await fs.readFile(await cachedPath(`${source.file}.json`), 'utf8')), names, source.id, source);
  // Portugal's federation/TMS periods differ from the professional league.
  // Keep this known ambiguity out of the runtime until a league source exists.
  const records = parsed.records.filter(record => {
    if (record.country === 'POR') { rejected.push({ country: 'POR', year: record.year, sourceId: source.id, reason: 'professional-league-scope-requires-LPFP-source' }); return false; }
    return record.year >= 1990 && record.year <= 2025;
  });
  for (const record of records) {
    if (record.windows.some(item => !validArchiveDate(item.start) || !validArchiveDate(item.end) || item.start > item.end)) throw new Error(`Invalid transcription: ${record.country}`);
  }
  rejected.push(...parsed.rejected);
  editions.push({ sourceId: source.id, publishedAt: source.publishedAt, records });
  const { file, transcription, id, ...metadata } = source;
  sources[id] = metadata;
}
const records = mergeDatedWindowRecords(editions);
const result = { schemaVersion: 1, revision: '2026-10-11-fifa-archives-v2', sources, records, rejected,
  coverage: { editions: editions.length, sourceRows: editions.reduce((n, item) => n + item.records.length, 0), associationYears: records.length,
    countries: [...new Set(records.map(item => item.country))].sort(), years: [...new Set(records.map(item => item.year))].sort() },
  licenseNote: 'Public historical FIFA publications and archived copies; no open-data license verified. Only factual dates and attribution are redistributed.' };
const target = 'src/games/sports/manager/transfer-windows.historical.json';
await fs.writeFile(`${target}.tmp`, `${JSON.stringify(result, null, 2)}\n`);
await fs.rename(`${target}.tmp`, target);
await fs.writeFile(resolve(root, 'archive-extraction-report.json'), `${JSON.stringify({ ...result.coverage, rejected }, null, 2)}\n`);
console.log(JSON.stringify(result.coverage));
