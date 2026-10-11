import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { managerCompetitionExtensions } from '../src/games/sports/manager/competitions.js';
import { editorialTransferSeasons, exceptionalTransferWindows, transferWindowSources } from '../src/games/sports/manager/transfer-window-editorial.js';
import historicalWindows from '../src/games/sports/manager/transfer-windows.historical.json' with { type: 'json' };

export const FIFA_WINDOW_URL = 'https://inside.fifa.com/transfer-system/player-transfers';
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
const copy = value => JSON.parse(JSON.stringify(value));

export function parseFifaTransferWindows(html, allowedCountries, { firstYear = 2023, lastYear = 2025 } = {}) {
  const json = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (!json) throw new Error('FIFA page has no public __NEXT_DATA__; do not infer missing dates.');
  const associations = [];
  const visit = value => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') {
      if (value.associationId && Array.isArray(value.data)) associations.push(value);
      else Object.values(value).forEach(visit);
    }
  };
  visit(JSON.parse(json));
  const records = [], rejected = [];
  for (const association of associations.filter(item => allowedCountries.has(item.associationId))) {
    const items = association.data.find(item => item.type === "Men's professional")?.timelineItems || [];
    for (const season of items.filter(item => item.itemType === 'season')) {
      const year = Number(season.startDate.slice(0, 4));
      if (year < firstYear || year > lastYear) continue;
      const prefix = season.id.replace(/season$/, '');
      const seasonStart = season.startDate.slice(0, 10), seasonEnd = season.endDate.slice(0, 10);
      const windows = items.filter(item => item.itemType === 'event' && item.id.startsWith(prefix))
        .map(item => ({ slot: item.id.endsWith('firstRegistration') ? 'primary' : item.id.endsWith('secondRegistration') ? 'secondary' : 'exceptional',
          start: item.startDate.slice(0, 10), end: item.endDate.slice(0, 10), precision: 'confirmed', sourceIds: ['fifa-public-calendar'], sourceRecordId: item.id }));
      const reason = !date(seasonStart) || !date(seasonEnd) || seasonStart > seasonEnd ? 'invalid-season'
        : windows.length !== 2 || !windows.some(item => item.slot === 'primary') || !windows.some(item => item.slot === 'secondary') ? 'incomplete-registration-periods'
          : windows.some(item => !date(item.start) || !date(item.end) || item.start > item.end
            || (Date.parse(item.end) - Date.parse(item.start)) / 86400000 > 180) ? 'invalid-or-unusually-long-period' : null;
      if (reason) { rejected.push({ country: association.associationId, year, sourceRecordId: season.id, reason }); continue; }
      records.push({ country: association.associationId, association: association.country, year,
        season: seasonEnd.slice(0, 4) === String(year) ? String(year) : `${year}/${seasonEnd.slice(2, 4)}`,
        seasonStart, seasonEnd, sourceRecordId: season.id, windows });
    }
  }
  // A source may publish parallel competitions without distinguishing them.
  // Do not union contradictory windows into a fictitious longer open period.
  const groups = Map.groupBy(records, item => `${item.country}:${item.year}`);
  return { records: [...groups.values()].flatMap(group => {
    if (group.length === 1) return group;
    const unique = new Set(group.map(item => JSON.stringify(item.windows.map(({ slot, start, end }) => [slot, start, end]))));
    if (unique.size === 1) return [group[0]];
    rejected.push({ country: group[0].country, year: group[0].year, reason: 'ambiguous-parallel-professional-calendars' });
    return [];
  }), rejected };
}

export function buildTransferWindowArchive(html, competitions, retrievedAt) {
  const countries = new Set(competitions.map(league => league.country_fifa_code));
  const parsed = parseFifaTransferWindows(html, countries);
  const annual = new Set('ARG BOL BRA CHI CHN COL DOM ECU JPN PAN PAR PER URU USA VEN'.split(' '));
  const sources = { ...historicalWindows.sources, ...transferWindowSources, 'fifa-public-calendar': {
    url: FIFA_WINDOW_URL, title: 'FIFA public registration-period calendar', scope: "Men's professional category, season starts 2023–2025 only",
    retrievedAt, sha256: createHash('sha256').update(html).digest('hex'), evidenceLevel: 'primary-association-calendar', license: 'No open-data license verified; factual dates only',
  } };
  const profiles = {};
  for (const country of [...countries].sort()) {
    const latest = parsed.records.filter(item => item.country === country).sort((a, b) => b.year - a.year)[0];
    if (!latest) throw new Error(`No evidenced country-specific baseline for ${country}; add one explicitly.`);
    profiles[country] = { country, association: latest.association, calendar: annual.has(country) ? 'annual' : 'split',
      baselineYear: latest.year, baselineSeason: latest.season, sourceIds: ['fifa-public-calendar'],
      // Business-day adjustment is an explicitly estimated projection. Confirmed
      // dates are never shifted, and local holidays are not guessed.
      deadlinePolicy: ['ENG', 'ESP', 'GER', 'FRA', 'ITA', 'SCO'].includes(country) ? 'next-weekday' : 'fixed-date',
      windows: latest.windows.map(item => ({ slot: item.slot, startMonthDay: item.start.slice(5), endMonthDay: item.end.slice(5),
        startYearOffset: Number(item.start.slice(0, 4)) - latest.year, endYearOffset: Number(item.end.slice(0, 4)) - latest.year })) };
  }
  // FIFA's category covers professional players across the whole association.
  // Portugal's professional league has narrower periods than FPF/TMS. Use the
  // documented league pattern for projections, without certifying future dates.
  const portugal = editorialTransferSeasons.find(item => item.country === 'POR' && item.year === 2025);
  if (profiles.POR && portugal) {
    profiles.POR.sourceIds = ['sjpf-2025'];
    profiles.POR.windows = portugal.windows.map(item => ({ slot: item.slot, startMonthDay: item.start.slice(5), endMonthDay: item.end.slice(5),
      startYearOffset: Number(item.start.slice(0, 4)) - 2025, endYearOffset: Number(item.end.slice(0, 4)) - 2025 }));
    profiles.POR.deadlinePolicy = 'next-weekday';
  }
  // Modern dated calendar wins over older published plans; editorial league
  // overrides remain last. New archives do not overlap the older partial
  // 2012/13 overrides; keep that precision distinction explicit.
  const records = [...copy(historicalWindows.records), ...parsed.records, ...copy(editorialTransferSeasons)];
  return { schemaVersion: 1, revision: '2026-10-11-transfer-windows-v3', retrievedAt,
    scope: 'Professional men; date-level registration of contracted players. Domestic exceptions require origin club. Not free-agent/emergency permission.',
    licenseNote: 'Official references are publicly accessible, not asserted to be open-license APIs. No source text or proprietary transfer database is bundled.',
    sources, profiles, competitions: Object.fromEntries(competitions.map(league => [league.id, league.country_fifa_code])),
    records, exceptional: copy(exceptionalTransferWindows).filter(item => countries.has(item.country)), rejected: [...historicalWindows.rejected, ...parsed.rejected] };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const input = process.argv[2];
  if (!input) throw new Error('Usage: node scripts/import-manager-transfer-windows.mjs <saved-official-FIFA-html> [output.json]');
  const html = await fs.readFile(input, 'utf8');
  const world = JSON.parse(await fs.readFile('src/games/sports/trayectoria/world.data.json', 'utf8'));
  const archive = buildTransferWindowArchive(html, [...Object.values(world.competitions), ...managerCompetitionExtensions], '2026-10-10');
  const target = process.argv[3] || 'src/games/sports/manager/transfer-windows.data.json';
  const output = `${JSON.stringify(archive, null, 2)}\n`;
  await fs.writeFile(`${target}.tmp`, output);
  await fs.rename(`${target}.tmp`, target);
  if (!process.argv[3]) {
    const mirror = 'public/data/football-manager/transfer-windows.json';
    await fs.writeFile(`${mirror}.tmp`, output);
    await fs.rename(`${mirror}.tmp`, mirror);
  }
  console.log(JSON.stringify({ target, countries: Object.keys(archive.profiles).length, competitions: Object.keys(archive.competitions).length,
    sourceRecords: archive.records.length, documentedWindows: archive.records.reduce((n, item) => n + item.windows.filter(window => window.precision === 'confirmed').length, 0) + archive.exceptional.length,
    partialBoundaryWindows: archive.records.reduce((n, item) => n + item.windows.filter(window => window.precision !== 'confirmed' && window.endPrecision === 'confirmed').length, 0), rejected: archive.rejected }));
}
