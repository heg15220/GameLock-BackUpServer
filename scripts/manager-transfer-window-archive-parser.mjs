// Factual rows from dated FIFA/TMS PDFs. Document text is not redistributed.
export const validArchiveDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
const iso = value => value.split('.').reverse().join('-');

const htmlText = value => value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
/** Archived TMS tables have four explicit boundaries but no season label.
 * Before 2018 ITMS covered men's professional football; later tables must
 * explicitly identify M rows. Never use current country season profiles.
 */
export function parseDatedFifaHtml(html, associations, sourceId, { publishedAt, sexScope } = {}) {
  const names = new Map(Object.entries(associations).map(([code, name]) => [name, code]));
  if (associations.TUR) names.set('Turkey', 'TUR');
  if (associations.USA) names.set('United States', 'USA');
  const records = [], rejected = [];
  let rowIndex = 0;
  for (const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    rowIndex++;
    const cells = [...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(item => htmlText(item[1]));
    const country = names.get(cells[0]);
    if (!country) continue;
    const hasSex = ['M', 'F'].includes(cells[1]);
    if (hasSex && cells[1] !== 'M') continue;
    if (!hasSex && !(sexScope === 'men-professional-pre-2018' && publishedAt < '2018-01-01')) {
      rejected.push({ country, sourceId, sourceRow: rowIndex, reason: 'unverified-sex-scope' }); continue;
    }
    const dates = cells.slice(hasSex ? 2 : 1, hasSex ? 6 : 5).map(value => /^\d{2}\/\d{2}\/\d{4}$/.test(value) ? value.split('/').reverse().join('-')
      : /^\d{4}\.\d{2}\.\d{2}$/.test(value) ? value.replaceAll('.', '-') : value);
    const reason = dates.length !== 4 || dates.some(value => !validArchiveDate(value)) ? 'invalid-date-or-TBC'
      : dates[0] > dates[1] || dates[2] > dates[3] ? 'inverted-range'
        : [[0, 1], [2, 3]].some(([a, b]) => (Date.parse(dates[b]) - Date.parse(dates[a])) / 86400000 > 180) ? 'unusually-long-period'
          : dates[2] < dates[0] || Number(dates[3].slice(0, 4)) - Number(dates[1].slice(0, 4)) > 1 ? 'ambiguous-season-order' : null;
    if (reason) { rejected.push({ country, sourceId, sourceRow: rowIndex, reason }); continue; }
    const year = Number(dates[1].slice(0, 4));
    records.push({ country, year, season: dates[3].slice(0, 4) === String(year) ? String(year) : `${year}/${dates[3].slice(2, 4)}`,
      seasonLabelInferred: true, yearAssignment: 'primary-window-end-year', sex: 'M',
      windows: [{ slot: 'primary', start: dates[0], end: dates[1] }, { slot: 'secondary', start: dates[2], end: dates[3] }].map(item => ({ ...item,
        precision: 'confirmed', sourceIds: [sourceId], sourceRow: rowIndex, evidenceLevel: 'archived-primary-table', publishedAt })) });
  }
  const groups = Map.groupBy(records, record => `${record.country}:${record.year}`);
  return { records: [...groups.values()].flatMap(group => {
    const signatures = new Set(group.map(record => JSON.stringify(record.windows.map(({ slot, start, end }) => [slot, start, end]))));
    if (signatures.size === 1) return [group[0]];
    rejected.push({ country: group[0].country, sourceId, reason: 'ambiguous-parallel-professional-calendars' }); return [];
  }), rejected };
}

/** Strict text-table parser: male professional rows, six dated columns, no TBC. */
export function parseDatedFifaPdf(pages, associations, sourceId, { publishedAt } = {}) {
  const records = [], rejected = [];
  const names = new Map(Object.entries(associations).map(([code, name]) => [name, code]));
  names.set('Turkey', 'TUR'); names.set('United States', 'USA');
  for (const [pageIndex, text] of pages.entries()) {
    for (const line of text.split(/\r?\n/)) {
      const head = line.match(/^\s*(.*?)\s+M\s+(.*)$/);
      const country = head && names.get(head[1]);
      if (!country) continue;
      const cells = head[2].trim().split(/\s{2,}/);
      const sourceSeason = cells[0]?.replace(/\s+/g, '');
      const dates = cells.slice(1, 7).map(iso);
      const reason = !/^\d{4}(\/\d{4})?$/.test(sourceSeason) || cells.length < 7 ? 'incomplete-or-ambiguous-columns'
        : dates.some(value => !validArchiveDate(value)) ? 'invalid-date-or-TBC'
          : [[0, 1], [2, 3], [4, 5]].some(([a, b]) => dates[a] > dates[b]) ? 'inverted-range'
            : [[2, 3], [4, 5]].some(([a, b]) => (Date.parse(dates[b]) - Date.parse(dates[a])) / 86400000 > 180) ? 'unusually-long-period' : null;
      if (reason) { rejected.push({ country, sourceId, page: pageIndex + 1, reason }); continue; }
      // Preserve the explicit season year, including Australian COVID 2020/21
      // whose first window ended in January 2021. Peru's December-to-December
      // administrative season instead encloses the following calendar season.
      // This uses this document's season dates, never today's country profile.
      const decemberCalendar = dates[0].slice(5, 7) === '12' && dates[1].slice(5, 7) === '12'
        && Number(dates[1].slice(0, 4)) === Number(dates[0].slice(0, 4)) + 1
        && Number(dates[3].slice(5, 7)) <= 3;
      const year = decemberCalendar ? Number(dates[1].slice(0, 4)) : Number(sourceSeason.slice(0, 4));
      const windows = [
        { slot: 'primary', start: dates[2], end: dates[3] },
        { slot: 'secondary', start: dates[4], end: dates[5] },
      ].map(item => ({ ...item, precision: 'confirmed', sourceIds: [sourceId], sourcePage: pageIndex + 1,
        evidenceLevel: 'primary-document-copy', publishedAt }));
      const third = cells.slice(7).join(' ').match(/^(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})$/);
      if (third && validArchiveDate(iso(third[1])) && validArchiveDate(iso(third[2])) && iso(third[1]) <= iso(third[2])) {
        windows.push({ slot: 'exceptional', start: iso(third[1]), end: iso(third[2]), precision: 'confirmed', sourceIds: [sourceId], sourcePage: pageIndex + 1, evidenceLevel: 'primary-document-copy', publishedAt });
      }
      records.push({ country, year, season: sourceSeason.replace(/\/(\d{2})(\d{2})$/, '/$2'), sourceSeason,
        seasonStart: dates[0], seasonEnd: dates[1], yearAssignment: decemberCalendar ? 'december-to-december-administrative-season' : 'explicit-source-season', windows });
    }
  }
  const groups = Map.groupBy(records, record => `${record.country}:${record.year}`);
  const unambiguous = [];
  for (const group of groups.values()) {
    const signatures = new Set(group.map(record => JSON.stringify(record.windows.map(({ slot, start, end }) => ({ slot, start, end })))));
    if (signatures.size > 1) rejected.push({ country: group[0].country, year: group[0].year, sourceId, reason: 'ambiguous-parallel-professional-calendars' });
    else unambiguous.push(group[0]);
  }
  return { records: unambiguous, rejected };
}

/** Latest dated evidence wins per country/year/slot, never union ranges. */
export function mergeDatedWindowRecords(editions) {
  const result = new Map();
  for (const edition of [...editions].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))) {
    for (const record of edition.records) {
      const key = `${record.country}:${record.year}`, prior = result.get(key);
      const slots = new Map(prior?.windows.map(item => [item.slot, item]) || []);
      for (const item of record.windows) slots.set(item.slot, item);
      result.set(key, { ...prior, ...record, windows: [...slots.values()] });
    }
  }
  return [...result.values()].sort((a, b) => a.country.localeCompare(b.country) || a.year - b.year);
}
