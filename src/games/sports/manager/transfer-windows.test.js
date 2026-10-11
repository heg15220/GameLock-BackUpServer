import { describe, it, expect } from 'vitest';
import archive from './transfer-windows.data.json';
import { createTransferWindowSnapshot, validateTransferWindowSnapshot, getTransferWindow,
  getNextTransferDate, getNextSeasonTransferDate, getClubTransferWindows, getTransferWindowCoverage } from './transfer-windows.js';
import { parseFifaTransferWindows } from '../../../../scripts/import-manager-transfer-windows.mjs';
import historicalArchive from './transfer-windows.historical.json';
import { parseDatedFifaPdf, parseDatedFifaHtml, mergeDatedWindowRecords } from '../../../../scripts/manager-transfer-window-archive-parser.mjs';

const world = {
  competitions: Object.entries(archive.competitions).map(([id, country_fifa_code]) => ({ id, country_fifa_code })),
  clubs: Object.keys(archive.competitions).map(id => ({ id: `${id}-club`, competitionId: id })),
};
const state = (date, league = 'laliga') => ({ date, year: Number(date.slice(0, 4)), clubId: `${league}-club`, world });
describe('dated historical FIFA documents', () => {
  it('reads archived HTML date formats and rejects women, unknown scope and malformed ranges', () => {
    const row = cells => `<tr>${cells.map(cell => `<td>${cell}</td>`).join('')}</tr>`;
    const parsed = parseDatedFifaHtml([
      row(['Spain', 'F', '01/07/2019', '20/09/2019', '02/01/2020', '31/01/2020']),
      row(['Spain', 'M', '2019.07.01', '2019.09.02', '2020.01.02', '2020.01.31']),
      row(['France', 'M', '31/02/2019', '31/08/2019', '01/01/2020', '31/01/2020']),
      row(['Germany', '2019-07-01', '2019-09-02', '2020-01-01', '2020-01-31']),
    ].join(''), { ESP: 'Spain', FRA: 'France', GER: 'Germany' }, 'test', { publishedAt: '2019-07-01' });
    expect(parsed.records).toHaveLength(1);
    expect(parsed.records[0]).toMatchObject({ country: 'ESP', year: 2019, season: '2019/20', seasonLabelInferred: true, sex: 'M' });
    expect(parsed.records[0].windows[0]).toMatchObject({ start: '2019-07-01', end: '2019-09-02', sourceRow: 2 });
    expect(parsed.rejected.map(item => item.reason)).toEqual(['invalid-date-or-TBC', 'unverified-sex-scope']);
    const old = row(['Colombia', '2013-12-15', '2014-03-01', '2014-07-01', '2014-07-31']);
    expect(parseDatedFifaHtml(old, { COL: 'Colombia' }, 'old', { publishedAt: '2014-05-31', sexScope: 'men-professional-pre-2018' }).records[0].year).toBe(2014);
    expect(parseDatedFifaHtml(old, { COL: 'Colombia' }, 'old', { publishedAt: '2018-05-31', sexScope: 'men-professional-pre-2018' }).records).toHaveLength(0);
  });
  it('applies newly archived 2014–2019 windows and primary LFP historical periods', () => {
    expect(getTransferWindow(state('2014-09-01', 'laliga'))).toMatchObject({ open: true, precision: 'confirmed', start: '2014-07-01', end: '2014-09-01' });
    expect(getTransferWindow(state('2014-09-02', 'laliga')).open).toBe(false);
    expect(getTransferWindow(state('2019-09-02', 'laliga'))).toMatchObject({ open: true, precision: 'confirmed', end: '2019-09-02' });
    expect(getTransferWindow(state('2009-06-09', 'ligue-1'))).toMatchObject({ open: true, precision: 'confirmed', start: '2009-06-09' });
    expect(getTransferWindow(state('2012-01-01', 'ligue-2'))).toMatchObject({ open: true, precision: 'confirmed', end: '2012-01-31' });
    expect(getTransferWindow(state('2018-08-17', 'serie-a'))).toMatchObject({ open: true, precision: 'confirmed', end: '2018-08-17' });
    expect(getTransferWindow(state('2018-08-18', 'serie-b')).open).toBe(false);
    expect(getTransferWindow(state('2017-08-31', 'por-primeira-liga'))).toMatchObject({ open: true, precision: 'confirmed', end: '2017-08-31' });
    expect(getTransferWindow(state('2017-09-01', 'por-primeira-liga')).open).toBe(false);
  });
  it('imports only professional male rows with complete valid boundaries', () => {
    const rows = ['Spain  F  2021 / 2022  01.07.2021  30.06.2022  01.07.2021  31.08.2021  03.01.2022  31.01.2022',
      'Spain  M  2021 / 2022  01.07.2021  30.06.2022  01.07.2021  31.08.2021  03.01.2022  31.01.2022',
      'France  M  2021 / 2022  01.07.2021  30.06.2022  TBC  TBC  01.01.2022  31.01.2022',
      'Germany  M  2021 / 2022  01.07.2021  30.06.2022  31.02.2021  31.08.2021  01.01.2022  31.01.2022'];
    const parsed = parseDatedFifaPdf([rows.join('\n')], { ESP: 'Spain', FRA: 'France', GER: 'Germany' }, 'example');
    expect(parsed.records).toHaveLength(1);
    expect(parsed.records[0].windows[1]).toMatchObject({ start: '2022-01-03', end: '2022-01-31', sourcePage: 1 });
    expect(parsed.rejected).toHaveLength(2);
  });
  it('keeps source seasons and December administrative calendars distinct', () => {
    const rows = ['Australia  M  2020 / 2021  27.12.2020  30.06.2021  08.11.2020  03.01.2021  12.04.2021  10.05.2021',
      'Peru  M  2021 / 2022  15.12.2021  31.12.2022  15.12.2021  08.03.2022  13.06.2022  10.07.2022'];
    const parsed = parseDatedFifaPdf([rows.join('\n')], { AUS: 'Australia', PER: 'Peru' }, 'example');
    expect(parsed.records.map(item => item.year)).toEqual([2020, 2022]);
    expect(parsed.records[1].sourceSeason).toBe('2021/2022');
  });
  it('replaces conflicting published boundaries without inventing a union', () => {
    const record = end => ({ country: 'ESP', year: 2020, windows: [{ slot: 'primary', start: '2020-08-04', end }] });
    const merged = mergeDatedWindowRecords([{ publishedAt: '2020-12-22', records: [record('2020-10-05')] },
      { publishedAt: '2020-06-01', records: [record('2020-10-31')] }]);
    expect(merged[0].windows[0].end).toBe('2020-10-05');
    const first = 'Spain  M  2021 / 2022  01.07.2021  30.06.2022  01.07.2021  31.08.2021  03.01.2022  31.01.2022';
    const conflict = parseDatedFifaPdf([[first, first.replace('31.08.2021', '30.08.2021')].join('\n')], { ESP: 'Spain' }, 'example');
    expect(conflict.records).toHaveLength(0);
    expect(conflict.rejected[0].reason).toBe('ambiguous-parallel-professional-calendars');
  });
  it('ships dated, pinned provenance for every added factual range', () => {
    expect(historicalArchive.records.length).toBeGreaterThan(160);
    expect(historicalArchive.coverage.countries).toHaveLength(39);
    for (const record of historicalArchive.records) for (const window of record.windows) {
      expect(window.sourcePage || window.sourceRow).toBeGreaterThan(0);
      expect(window.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(historicalArchive.sources[window.sourceIds[0]].sha256).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(historicalArchive.records.some(item => item.country === 'POR')).toBe(false);
  });
  it('applies archived windows to European and Central American clubs', () => {
    expect(getTransferWindow(state('2017-09-01', 'laliga')).open).toBe(true);
    expect(getTransferWindow(state('2017-09-02', 'laliga')).open).toBe(false);
    const hondurasLeague = Object.keys(archive.competitions).find(id => archive.competitions[id] === 'HON');
    const window = getTransferWindow(state('2017-08-26', hondurasLeague));
    expect(window.precision).toBe('confirmed');
    expect(window.end).toBe('2017-08-26');
    expect(getTransferWindow(state('2017-08-27', hondurasLeague)).open).toBe(false);
    expect(validateTransferWindowSnapshot(createTransferWindowSnapshot(world))).toBe(true);
  });
});
describe('country, competition and archived-season transfer windows', () => {
  it('uses actual 2012/13 and 2013/14 French and Italian dates', () => {
    expect(getTransferWindow(state('2012-06-13', 'ligue-1')).start).toBe('2012-06-13');
    expect(getTransferWindow(state('2012-09-04', 'ligue-1')).open).toBe(true);
    expect(getTransferWindow(state('2012-09-05', 'ligue-1')).open).toBe(false);
    expect(getTransferWindow(state('2013-06-11', 'ligue-2')).precision).toBe('confirmed');
    expect(getTransferWindow(state('2013-01-02', 'serie-a')).open).toBe(false);
    expect(getTransferWindow(state('2013-01-03', 'serie-a')).open).toBe(true);
    expect(getTransferWindow(state('2014-01-02', 'serie-b')).open).toBe(false);
    expect(getTransferWindow(state('2014-01-03', 'serie-b')).precision).toBe('confirmed');
  });
  it('distinguishes reported historical evidence from primary publications', () => {
    const england = getTransferWindow(state('2013-07-01', 'premier-league'));
    expect(england.precision).toBe('confirmed');
    expect(england.evidenceLevels).toContain('press-report');
    expect(england.end).toBe('2013-09-02');
    const spain = getTransferWindow(state('2012-08-31'));
    expect(spain.precision).toBe('estimated');
    expect(spain.currentWindow.endPrecision).toBe('confirmed');
    expect(getTransferWindow(state('2012-09-01')).open).toBe(false);
    expect(getTransferWindow(state('2013-09-02', 'por-primeira-liga')).open).toBe(true);
    expect(getTransferWindow(state('2013-09-03', 'por-primeira-liga')).nextOpenDate).toBe('2014-01-02');
  });
  it('does not extend Portuguese professional windows to broader national TMS dates', () => {
    expect(getTransferWindow(state('2023-07-02', 'por-primeira-liga')).open).toBe(false);
    expect(getTransferWindow(state('2023-07-03', 'por-primeira-liga')).open).toBe(true);
    expect(getTransferWindow(state('2023-09-02', 'por-primeira-liga')).open).toBe(false);
    expect(getTransferWindow(state('2024-09-03', 'por-primeira-liga')).open).toBe(false);
    expect(getTransferWindow(state('2025-09-02', 'por-primeira-liga')).open).toBe(false);
    expect(getTransferWindow(state('2026-02-03', 'por-primeira-liga')).open).toBe(false);
    expect(getTransferWindow(state('2040-09-10', 'por-primeira-liga')).open).toBe(false);
  });
  it('keeps Germany 2024 first and second division deadlines distinct from third division', () => {
    expect(getTransferWindow(state('2024-08-30', 'bundesliga')).end).toBe('2024-08-30');
    expect(getTransferWindow(state('2024-08-31', '2-bundesliga')).open).toBe(false);
    expect(getTransferWindow(state('2024-09-02', 'germany-3-liga')).open).toBe(true);
    expect(getTransferWindow(state('2024-09-03', 'germany-3-liga')).open).toBe(false);
  });
  it('retains documented annual-year historical and exceptional MLS windows', () => {
    expect(getTransferWindow(state('2013-01-03', 'japan-j1')).open).toBe(false);
    expect(getTransferWindow(state('2013-01-04', 'japan-j1')).precision).toBe('confirmed');
    expect(getTransferWindow(state('2020-07-06', 'usa-mls')).kind).toBe('exceptional');
    expect(getTransferWindow(state('2020-07-08', 'usa-mls')).open).toBe(false);
    expect(getTransferWindow(state('2020-10-29', 'usa-mls')).precision).toBe('confirmed');
    expect(getTransferWindow(state('2020-10-30', 'usa-mls')).open).toBe(false);
    expect(getTransferWindow(state('2021-06-01', 'usa-mls')).open).toBe(true);
  });
  it('documents the actual Madrid 2013 closure and January 2014 opening', () => {
    expect(getTransferWindow(state('2013-09-02')).open).toBe(true);
    const closed = getTransferWindow(state('2013-09-03'));
    expect(closed.open).toBe(false);
    expect(closed.nextOpenDate).toBe('2014-01-02');
    expect(closed.nextWindow.precision).toBe('confirmed');
    expect(getTransferWindow(state('2014-01-01')).open).toBe(false);
    expect(getTransferWindow(state('2014-01-02')).open).toBe(true);
    expect(getTransferWindow(state('2014-02-01')).open).toBe(false);
  });
  it('keeps the two 2025 English summer windows separate', () => {
    const s = date => state(date, 'premier-league');
    expect(getTransferWindow(s('2025-06-01')).kind).toBe('exceptional');
    expect(getTransferWindow(s('2025-06-10')).open).toBe(true);
    expect(getTransferWindow(s('2025-06-11')).open).toBe(false);
    expect(getTransferWindow(s('2025-06-11')).nextOpenDate).toBe('2025-06-16');
    expect(getTransferWindow(s('2025-09-01')).open).toBe(true);
    expect(getTransferWindow(s('2025-09-02')).open).toBe(false);
    expect(getTransferWindow(s('2025-06-11'), { clubId: 'laliga-club' }).nextOpenDate).toBe('2025-07-01');
  });
  it('handles natural-year MLS and Japan windows without imposing January', () => {
    expect(getNextTransferDate(state('2025-01-01', 'usa-mls'))).toBe('2025-01-31');
    expect(getTransferWindow(state('2025-04-23', 'usa-mls')).open).toBe(true);
    expect(getTransferWindow(state('2025-04-24', 'usa-mls')).open).toBe(false);
    expect(getTransferWindow(state('2025-07-10', 'usa-mls')).open).toBe(false);
    expect(getTransferWindow(state('2025-07-10', 'japan-j1')).open).toBe(true);
    expect(getTransferWindow(state('2025-03-27', 'japan-j1')).open).toBe(false);
  });
  it('checks the buyer or borrower rather than the seller', () => {
    const s = state('2025-09-01', 'laliga');
    expect(getTransferWindow(s).open).toBe(true);
    expect(getTransferWindow(s, { clubId: 'usa-mls-club', fromClubId: s.clubId }).open).toBe(false);
    expect(getNextTransferDate(s, { clubId: 'japan-j1-club', date: '2025-07-07' })).toBe('2025-07-07');
  });
  it('never extends an exact deadline using estimated business-day rules', () => {
    const end = getTransferWindow(state('2024-08-30'));
    expect(end.end).toBe('2024-08-30');
    expect(end.precision).toBe('confirmed');
    expect(getTransferWindow(state('2024-08-31')).open).toBe(false);
    expect(getTransferWindow(state('2025-02-03')).open).toBe(true);
    expect(getTransferWindow(state('2025-02-04')).open).toBe(false);
  });
  it('projects country-specific gaps and simulated future without pretending confirmation', () => {
    const future = getTransferWindow(state('2040-01-05'));
    expect(future.precision).toBe('estimated');
    expect(future.rules).toContain('Calendario estimado');
    expect(getTransferWindow(state('1990-08-10', 'brasileirao')).calendar).toBe('annual');
    expect(getTransferWindow(state('1990-08-10', 'brasileirao')).precision).toBe('estimated');
    const closed = getTransferWindow(state('2026-03-01'));
    expect(closed.nextWindow.precision).toBe('estimated');
    expect(closed.precision).toBe('estimated');
  });
  it('preserves a broader estimated pre-2002 English registration regime', () => {
    const s = state('1992-11-26', 'premier-league');
    expect(getTransferWindow(s).open).toBe(true);
    expect(getTransferWindow(s).kind).toBe('historic');
    expect(getTransferWindow(s).precision).toBe('estimated');
    expect(getTransferWindow(state('1993-04-01', 'premier-league')).open).toBe(false);
  });
  it('limits the early 2018 English opening to domestic Premier League deals', () => {
    const s = state('2018-05-18', 'premier-league');
    expect(getTransferWindow(s).open).toBe(false);
    expect(getTransferWindow(s, { fromClubId: 'championship-club' }).open).toBe(true);
    expect(getTransferWindow(s, { fromClubId: 'laliga-club' }).open).toBe(false);
    expect(getTransferWindow(state('2018-08-10', 'premier-league')).open).toBe(false);
    expect(getTransferWindow(state('2018-08-10', 'championship')).open).toBe(false);
    expect(getTransferWindow(state('2018-08-31', 'championship'), { transactionType: 'loan', fromClubId: 'laliga-club' })).toMatchObject({ open: true, precision: 'confirmed', end: '2018-08-31' });
    expect(getTransferWindow(state('2018-08-31', 'england-league-one'), { transactionType: 'loan', fromClubId: 'premier-league-club' }).open).toBe(true);
    expect(getTransferWindow(state('2018-08-31', 'premier-league'), { transactionType: 'loan', fromClubId: 'laliga-club' }).open).toBe(false);
    expect(getTransferWindow(state('2018-09-01', 'championship'), { transactionType: 'loan' }).open).toBe(false);
    expect(getTransferWindow(state('2019-08-09', 'championship'), { transactionType: 'loan' }).open).toBe(false);
    expect(getTransferWindow(state('2019-09-02', 'england-league-two')).open).toBe(true);
  });
  it('respects Covid dates and the restricted 2020 PL/EFL extension', () => {
    expect(getTransferWindow(state('2020-07-15')).open).toBe(false);
    expect(getTransferWindow(state('2020-08-04')).open).toBe(true);
    const s = state('2020-10-10', 'premier-league');
    expect(getTransferWindow(s).open).toBe(false);
    expect(getTransferWindow(s, { fromClubId: 'championship-club' }).open).toBe(true);
    expect(getTransferWindow(s, { fromClubId: 'laliga-club' }).open).toBe(false);
    expect(getTransferWindow(s, { fromClubId: 'premier-league-club' }).open).toBe(false);
  });
  it('supports all 51 catalog leagues for every playable starting year', () => {
    expect(world.competitions).toHaveLength(51);
    for (const league of world.competitions) for (let year = 1990; year <= 2025; year++) {
      const s = state(`${year}-09-03`, league.id), result = getTransferWindow(s);
      expect(result.country).toBe(league.country_fifa_code);
      expect(getNextTransferDate(s)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.sources.length).toBeGreaterThan(0);
    }
  });
  it('finds subsequent windows and next-season arrivals without overlapping-window reopening', () => {
    const s = state('2018-05-18', 'premier-league');
    expect(getNextTransferDate(s, { fromClubId: 'championship-club', includeCurrent: false })).toMatch(/^2019-01/);
    expect(getNextSeasonTransferDate(state('2025-09-03')) >= '2026-07-01').toBe(true);
    expect(getNextSeasonTransferDate(state('2025-09-03', 'usa-mls')) >= '2026-01-01').toBe(true);
  });
  it('uses a preserved snapshot instead of silently changing saved rules', () => {
    const saved = createTransferWindowSnapshot(world);
    expect(validateTransferWindowSnapshot(saved)).toBe(true);
    expect(JSON.parse(JSON.stringify(saved))).toEqual(saved);
    saved.revision = 'old-reviewed-calendar';
    const record = saved.records.find(item => item.country === 'ESP' && item.year === 2013);
    record.windows[1].start = '2014-01-03';
    const s = { ...state('2014-01-02'), transferWindowCalendar: saved };
    expect(getTransferWindow(s).open).toBe(false);
    expect(getTransferWindow(s).revision).toBe('old-reviewed-calendar');
    expect(getTransferWindow(state('2014-01-02')).open).toBe(true);
  });
  it('rejects invalid dates, unknown destinations and corrupted snapshots', () => {
    expect(() => getTransferWindow(state('2025-02-30'))).toThrow();
    expect(() => getTransferWindow(state('2025-01-01'), { clubId: 'missing' })).toThrow();
    const saved = createTransferWindowSnapshot(world);
    saved.records[0].windows[0].start = '2025-02-30';
    expect(validateTransferWindowSnapshot(saved)).toBe(false);
    expect(() => getTransferWindow({ ...state('2025-01-01'), transferWindowCalendar: saved })).toThrow();
  });
  it('exposes factual coverage and window-by-window evidence', () => {
    const coverage = getTransferWindowCoverage();
    expect(coverage.countries).toBe(40);
    expect(coverage.completeHistoricalCoverage).toBe(false);
    expect(coverage.totalCompetitionSeasons).toBe(51 * 36);
    expect(coverage.fullyDocumentedCompetitionSeasons + coverage.partlyDocumentedCompetitionSeasons + coverage.estimatedCompetitionSeasons).toBe(51 * 36);
    expect(coverage.documentedRegularWindows + coverage.estimatedRegularWindows).toBe(51 * 36 * 2);
    expect(coverage.competitionSeasons.find(item => item.competitionId === 'laliga' && item.year === 2012).coverage).toBe('partial');
    expect(coverage.competitionSeasons.find(item => item.competitionId === 'ligue-1' && item.year === 2012).coverage).toBe('complete-regular-windows');
    expect(coverage.competitionSeasons.find(item => item.competitionId === 'laliga' && item.year === 1990).coverage).toBe('estimated');
    const windows = getClubTransferWindows(state('2025-06-01'));
    expect(windows.filter(item => item.precision === 'confirmed').every(item => item.sourceUrls.every(url => url.startsWith('https://')))).toBe(true);
  });
});

describe('public FIFA calendar importer', () => {
  const page = data => `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ data })}</script>`;
  const season = (prefix, start = '2025-07-01', end = '2025-09-01') => [
    { id: `${prefix}season`, itemType: 'season', startDate: '2025-07-01', endDate: '2026-06-30' },
    { id: `${prefix}firstRegistration`, itemType: 'event', startDate: start, endDate: end },
    { id: `${prefix}secondRegistration`, itemType: 'event', startDate: '2026-01-02', endDate: '2026-02-02' },
  ];
  it('selects professional men and rejects contradictory parallel calendars', () => {
    const data = [{ associationId: 'ESP', country: 'Spain', data: [
      { type: "Women's professional", timelineItems: season('a', '2025-06-01') },
      { type: "Men's professional", timelineItems: season('b') },
    ] }];
    expect(parseFifaTransferWindows(page(data), new Set(['ESP'])).records[0].windows[0].start).toBe('2025-07-01');
    data[0].data[1].timelineItems.push(...season('c', '2025-06-15'));
    const result = parseFifaTransferWindows(page(data), new Set(['ESP']));
    expect(result.records).toHaveLength(0);
    expect(result.rejected[0].reason).toBe('ambiguous-parallel-professional-calendars');
  });
  it('quarantines malformed and impossible dates without throwing', () => {
    for (const invalid of ['2025-99-99', '2025-02-30']) {
      const data = [{ associationId: 'ESP', country: 'Spain', data: [{ type: "Men's professional", timelineItems: season('x', invalid) }] }];
      const result = parseFifaTransferWindows(page(data), new Set(['ESP']));
      expect(result.records).toHaveLength(0);
      expect(result.rejected[0].reason).toBe('invalid-or-unusually-long-period');
    }
  });
});
