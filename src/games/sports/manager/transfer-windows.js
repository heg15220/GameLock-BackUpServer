import archive from './transfer-windows.data.json';

export const TRANSFER_WINDOW_REVISION = archive.revision;
const clone = value => JSON.parse(JSON.stringify(value));
const DAY = 86400000;
const supportedSlots = ['primary', 'secondary', 'exceptional', 'primary-domestic', 'historic'];
const trusted = new WeakSet();
const coverageCache = new WeakMap();
export const validTransferDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
const plusDays = (date, days) => new Date(Date.parse(`${date}T12:00:00Z`) + days * DAY).toISOString().slice(0, 10);
const compare = (a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end);
const refsValid = (ids, snapshot) => Array.isArray(ids) && ids.length > 0 && ids.every(id => snapshot.sources[id]);
function validWindow(item, snapshot) {
  return item && supportedSlots.includes(item.slot) && validTransferDate(item.start) && validTransferDate(item.end)
    && item.start <= item.end && Date.parse(item.end) - Date.parse(item.start) <= 370 * DAY
    && ['confirmed', 'estimated'].includes(item.precision) && refsValid(item.sourceIds, snapshot)
    && (!item.eligibility || ['domestic', 'english-efl', 'english-efl-loan'].includes(item.eligibility));
}

/** Validate an imported archive without silently replacing it with today's data. */
export function validateTransferWindowSnapshot(snapshot) {
  if (!snapshot || snapshot.schemaVersion !== 1 || typeof snapshot.revision !== 'string' || snapshot.revision.length > 120
    || !snapshot.sources || !snapshot.profiles || !snapshot.competitions || !Array.isArray(snapshot.records)
    || snapshot.records.length > 3000 || !Array.isArray(snapshot.exceptional) || snapshot.exceptional.length > 500) return false;
  if (Object.entries(snapshot.sources).some(([id, source]) => id.length > 120 || typeof source?.url !== 'string'
    || !/^https:\/\//.test(source.url) || source.url.length > 2000)) return false;
  if (Object.keys(snapshot.profiles).length > 220 || Object.entries(snapshot.profiles).some(([country, profile]) => !/^[A-Z]{3}$/.test(country)
    || !['annual', 'split'].includes(profile.calendar) || !['fixed-date', 'next-weekday'].includes(profile.deadlinePolicy)
    || !refsValid(profile.sourceIds, snapshot) || !Number.isInteger(profile.baselineYear)
    || !Array.isArray(profile.windows) || !profile.windows.length || profile.windows.length > 4
    || profile.windows.some(item => !supportedSlots.includes(item.slot)
      || !validTransferDate(`2000-${item.startMonthDay}`) || !validTransferDate(`2000-${item.endMonthDay}`)
      || !Number.isInteger(item.startYearOffset) || Math.abs(item.startYearOffset) > 2
      || !Number.isInteger(item.endYearOffset) || Math.abs(item.endYearOffset) > 2))) return false;
  if (Object.entries(snapshot.competitions).some(([id, country]) => id.length > 150 || !snapshot.profiles[country])) return false;
  if (snapshot.records.some(record => !snapshot.profiles[record?.country] || !Number.isInteger(record.year)
    || record.year < 1850 || record.year > 2300 || typeof record.season !== 'string' || record.season.length > 30
    || (record.competitionIds && (!Array.isArray(record.competitionIds) || record.competitionIds.some(id => snapshot.competitions[id] !== record.country)))
    || !Array.isArray(record.windows) || !record.windows.length || record.windows.length > 8
    || record.windows.some(item => !validWindow(item, snapshot)))) return false;
  return snapshot.exceptional.every(item => snapshot.profiles[item?.country] && Number.isInteger(item.year) && validWindow(item, snapshot));
}

/** Small serializable rules/data snapshot, retained for the entire save. */
export function createTransferWindowSnapshot(_world) {
  // Keep all catalog associations: external clubs and future promotions can
  // become destinations, even if that country's league was unavailable at start.
  return clone(archive);
}
function calendarFor(state) {
  const snapshot = state.transferWindowCalendar || archive;
  if (!trusted.has(snapshot)) {
    if (!validateTransferWindowSnapshot(snapshot)) throw new Error('El calendario de fichajes guardado no es válido.');
    trusted.add(snapshot);
  }
  return snapshot;
}
function context(state, options = {}) {
  const data = calendarFor(state), date = options.date ?? state.date;
  if (!validTransferDate(date)) throw new Error('La fecha del mercado no es válida.');
  const clubId = options.clubId ?? state.clubId;
  const club = state.world?.clubs?.find(item => item.id === clubId);
  if (!club) throw new Error('El club de destino no existe.');
  const competition = state.world.competitions.find(item => item.id === club.competitionId);
  const competitionId = club.competitionId.startsWith('external:') ? club.catalogCompetitionId || club.competitionId : club.competitionId;
  const country = competition?.country_fifa_code || data.competitions[competitionId] || club.competitionId.split(':')[1];
  const profile = data.profiles[country];
  if (!profile) throw new Error(`No hay un calendario de inscripción configurado para ${country || clubId}.`);
  const origin = options.fromClubId ? state.world.clubs.find(item => item.id === options.fromClubId) : null;
  const originCompetition = origin && state.world.competitions.find(item => item.id === origin.competitionId);
  const originId = origin?.competitionId?.startsWith('external:') ? origin.catalogCompetitionId || origin.competitionId : origin?.competitionId;
  const originCountry = originCompetition?.country_fifa_code || data.competitions[originId];
  return { data, date, clubId, competitionId, country, profile, originId, originCountry, transactionType: options.transactionType ?? 'permanent' };
}
const eligible = (window, ctx) => !window.eligibility || (window.eligibility === 'english-efl-loan'
  ? ctx.transactionType === 'loan' && ctx.country === 'ENG' && ['championship', 'england-league-one', 'england-league-two'].includes(ctx.competitionId)
  : window.eligibility === 'domestic'
  ? ctx.originCountry === ctx.country
  : ctx.country === 'ENG' && ctx.originCountry === 'ENG'
    && ['championship', 'england-league-one', 'england-league-two'].some(id => [ctx.competitionId, ctx.originId].includes(id)));
function estimatedDate(year, monthDay) {
  let value = `${year}-${monthDay}`;
  if (monthDay === '02-29' && !validTransferDate(value)) value = `${year}-02-28`;
  return value;
}
function weekdayDeadline(date) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return weekday === 6 ? plusDays(date, 2) : weekday === 0 ? plusDays(date, 1) : date;
}
function estimateSeason(ctx, year) {
  const { profile, country } = ctx;
  if (country === 'ENG' && year < 2002 && ctx.data.sources['pl-history']) {
    return [{ slot: 'historic', start: `${year}-07-01`, end: `${year + 1}-03-31`, precision: 'estimated', sourceIds: ['pl-history'],
      note: 'Antes de 2002/03 se permiten fichajes durante la temporada hasta marzo. La reapertura del 1 de julio es una aproximación del simulador; no una fecha histórica acreditada.' }];
  }
  if (country === 'GER' && year >= 2002 && year < 2023 && ctx.data.sources['dfb-professional-rule']) {
    return [
      { slot: 'primary', start: `${year}-07-01`, end: weekdayDeadline(`${year}-08-31`) },
      { slot: 'secondary', start: `${year + 1}-01-01`, end: weekdayDeadline(`${year + 1}-01-31`) },
    ].map(window => ({ ...window, precision: 'estimated', sourceIds: ['dfb-professional-rule'],
      note: 'Proyección estimada de los periodos ordinarios DFB, con cierre en el siguiente día laborable; no acredita excepciones de esta temporada ni festivos.' }));
  }
  return profile.windows.map(window => ({ slot: window.slot,
    start: estimatedDate(year + window.startYearOffset, window.startMonthDay),
    end: profile.deadlinePolicy === 'next-weekday' ? weekdayDeadline(estimatedDate(year + window.endYearOffset, window.endMonthDay))
      : estimatedDate(year + window.endYearOffset, window.endMonthDay),
    precision: 'estimated', sourceIds: profile.sourceIds,
    note: `Sin archivo exacto para esta temporada: proyección del patrón de ${profile.association} ${profile.baselineSeason}.`
      + (profile.deadlinePolicy === 'next-weekday' ? ' Cierre estimado trasladado al lunes si cae en fin de semana; festivos no modelados.' : '')
      + (year < 2002 ? ' No reproduce todos los regímenes de inscripción anteriores a 2002.' : ''),
  }));
}
function decorate(item, ctx, year, season) {
  const kind = item.slot === 'exceptional' ? 'exceptional' : item.slot === 'historic' ? 'historic'
    : ctx.profile.calendar === 'annual' ? item.slot === 'secondary' ? 'secondary' : 'primary'
      : item.slot === 'secondary' ? 'winter' : 'summer';
  const label = { exceptional: 'Ventana extraordinaria', historic: 'Inscripción de temporada', primary: 'Primera ventana', secondary: 'Segunda ventana', winter: 'Mercado de invierno', summer: 'Mercado de verano' }[kind];
  const sources = item.sourceIds.map(id => ({ id, evidenceLevel: 'primary-publication', ...ctx.data.sources[id] }));
  return { ...item, year, season, country: ctx.country, competitionId: ctx.competitionId, kind, label,
    evidenceLevels: [...new Set(sources.map(source => source.evidenceLevel))],
    verified: item.precision === 'confirmed', sources, sourceUrls: [...new Set(sources.map(source => source.url))], revision: ctx.data.revision };
}
function nearbyWindows(ctx) {
  const currentYear = Number(ctx.date.slice(0, 4)), all = [];
  for (let year = currentYear - 2; year <= currentYear + 3; year++) {
    let windows = estimateSeason(ctx, year);
    let season = ctx.profile.calendar === 'annual' ? String(year) : `${year}/${String(year + 1).slice(-2)}`;
    const records = ctx.data.records.filter(record => record.country === ctx.country && record.year === year
      && (!record.competitionIds || record.competitionIds.includes(ctx.competitionId)))
      .sort((a, b) => Number(Boolean(a.competitionIds)) - Number(Boolean(b.competitionIds)));
    for (const record of records) {
      const slots = new Set(record.windows.map(item => item.slot));
      windows = [...windows.filter(item => !slots.has(item.slot)), ...record.windows];
      season = record.season;
    }
    all.push(...windows.filter(item => eligible(item, ctx)).map(item => decorate(item, ctx, year, season)));
  }
  all.push(...ctx.data.exceptional.filter(item => item.country === ctx.country && eligible(item, ctx)).map(item => decorate(item, ctx, item.year, item.season)));
  return all.sort(compare);
}

export function getClubTransferWindows(state, options = {}) {
  return nearbyWindows(context(state, options));
}

/** The buying/borrowing club determines registration; seller windows do not. */
export function getTransferWindow(state, options = {}) {
  const ctx = context(state, options), windows = nearbyWindows(ctx);
  const active = windows.filter(window => ctx.date >= window.start && ctx.date <= window.end)
    .sort((a, b) => Number(b.verified) - Number(a.verified) || Number(b.slot === 'exceptional') - Number(a.slot === 'exceptional'))[0] || null;
  const next = windows.find(window => window.start > (active?.end || ctx.date)) || null;
  const displayed = active || next;
  const precision = displayed?.precision || 'estimated';
  return { open: Boolean(active), kind: active?.kind || 'closed', label: active?.label || 'Mercado cerrado',
    start: active?.start || null, end: active?.end || null,
    daysRemaining: active ? Math.max(0, Math.round((Date.parse(active.end) - Date.parse(ctx.date)) / DAY)) : 0,
    nextOpenDate: next?.start || null, nextWindow: next, currentWindow: active, windows,
    initialSetup: false, clubId: ctx.clubId, country: ctx.country, association: ctx.profile.association,
    competitionId: ctx.competitionId, calendar: ctx.profile.calendar, season: displayed?.season,
    precision, accuracy: precision, verified: precision === 'confirmed', revision: ctx.data.revision,
    evidenceLevels: displayed?.evidenceLevels || [], note: displayed?.note || null,
    sourceUrls: displayed?.sourceUrls || [], sources: displayed?.sources || [],
    rules: precision === 'confirmed'
      ? `Fechas documentadas para ${ctx.profile.association}, ${displayed.season}. Inscripción masculina profesional; resolución diaria, sin horas límite ni excepciones individuales.`
      : `Calendario estimado de ${ctx.profile.association}. ${displayed?.note || 'No hay fechas verificadas para este periodo.'}` };
}

export function getNextTransferDate(state, options = {}) {
  const date = options.date ?? state.date;
  const window = getTransferWindow(state, options);
  return options.includeCurrent !== false && window.open ? date : window.nextOpenDate;
}

export function getNextSeasonTransferDate(state, options = {}) {
  const ctx = context(state, options), monthDay = ctx.profile.calendar === 'annual' ? '01-01' : '07-01';
  let year = Math.max(Number(state.year) + 1, Number(ctx.date.slice(0, 4)));
  if (`${year}-${monthDay}` <= ctx.date) year++;
  return getNextTransferDate(state, { ...options, date: `${year}-${monthDay}`, includeCurrent: true });
}

export function getTransferWindowCoverage(snapshot = archive) {
  if (coverageCache.has(snapshot)) return coverageCache.get(snapshot);
  const documentedSeasons = snapshot.records.map(record => ({ country: record.country, year: record.year, season: record.season,
    competitionIds: record.competitionIds || Object.keys(snapshot.competitions).filter(id => snapshot.competitions[id] === record.country),
    windows: record.windows.map(({ start, end, precision, sourceIds }) => ({ start, end, precision, sourceIds })) }));
  const competitionSeasons = [];
  for (const [competitionId, country] of Object.entries(snapshot.competitions)) for (let year = 1990; year <= 2025; year++) {
    const slots = {};
    for (const record of snapshot.records.filter(item => item.country === country && item.year === year
      && (!item.competitionIds || item.competitionIds.includes(competitionId)))
      .sort((a, b) => Number(Boolean(a.competitionIds)) - Number(Boolean(b.competitionIds)))) {
      for (const window of record.windows) if (['primary', 'secondary'].includes(window.slot)) slots[window.slot] = window;
    }
    const regular = ['primary', 'secondary'].map(slot => slots[slot]);
    const documented = regular.filter(item => item?.precision === 'confirmed').length;
    const partialBoundaries = regular.filter(item => item?.precision !== 'confirmed' && item?.endPrecision === 'confirmed').length;
    competitionSeasons.push({ competitionId, country, year, documented, estimated: 2 - documented, partialBoundaries,
      regularWindows: regular.filter(Boolean).map(window => ({ slot: window.slot, start: window.start, end: window.end,
        precision: window.precision, endPrecision: window.endPrecision ?? window.precision,
        sourceUrls: [...new Set(window.sourceIds.map(id => snapshot.sources[id].url))] })),
      coverage: documented === 2 ? 'complete-regular-windows' : documented || partialBoundaries ? 'partial' : 'estimated' });
  }
  const allWindows = [...snapshot.records.flatMap(record => record.windows), ...snapshot.exceptional];
  const result = { revision: snapshot.revision, countries: Object.keys(snapshot.profiles).length, competitions: Object.keys(snapshot.competitions).length,
    sourceRecords: snapshot.records.length, associationSeasonsWithEvidence: new Set(snapshot.records.map(item => `${item.country}:${item.year}`)).size,
    documentedSeasons, documentedWindows: allWindows.filter(item => item.precision === 'confirmed').length,
    partialBoundaryWindows: allWindows.filter(item => item.precision !== 'confirmed' && item.endPrecision === 'confirmed').length,
    competitionSeasons, totalCompetitionSeasons: competitionSeasons.length,
    fullyDocumentedCompetitionSeasons: competitionSeasons.filter(item => item.coverage === 'complete-regular-windows').length,
    partlyDocumentedCompetitionSeasons: competitionSeasons.filter(item => item.coverage === 'partial').length,
    estimatedCompetitionSeasons: competitionSeasons.filter(item => item.coverage === 'estimated').length,
    documentedRegularWindows: competitionSeasons.reduce((sum, item) => sum + item.documented, 0),
    estimatedRegularWindows: competitionSeasons.reduce((sum, item) => sum + item.estimated, 0),
    historicalRange: [1990, 2025], completeHistoricalCoverage: false, futureIsEstimatedUnlessPublished: true };
  coverageCache.set(snapshot, result);
  return result;
}
