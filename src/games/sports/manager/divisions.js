import { createStream } from '../trayectoria/rng.js';

/** Sporting rules are separate from catalogue membership and never rewrite history. */
export const DIVISION_RULES_VERSION = 1;
const SOURCES = {
  ENG: 'https://www.efl.com/competitions/sky-bet-play-offs/about-the-play-offs/',
  ESP: 'https://www.laliga.com/noticias/ascensos-primera-division-24-25',
  GER: 'https://www.bundesliga.com/en/faq/what-are-the-rules-and-regulations-of-soccer/how-does-promotion-and-relegation-work-in-the-bundesliga-10645',
  ITA: 'https://www.legab.it/news/regolamento-e-accoppiamenti-playoff-e-playout',
  ITA2012: 'https://www.figc.it/FigcLegacyAssets/Assets/contentresources_2/ContenutoGenerico/212/C_2_ContenutoGenerico_33174_StrilloComunicatoUfficiale_lstAllegati_Allegato_0_upfAllegato.pdf',
  FRA: 'https://www.lfp.fr/assets/25_26_Reglement_Competitions_29_07_2024_5055b664e4.pdf',
  BRA: 'https://www.cbf.com.br/futebol-brasileiro/noticias/campeonato-brasileiro/serie-b/cbf-divulga-documentos-da-serie-b',
};
const RESERVE_PARENTS = {
  'barcelona-b': 'barcelona', 'barcelona-atletic': 'barcelona', 'fc-barcelona-b': 'barcelona',
  'real-madrid-castilla': 'real-madrid', 'real-madrid-b': 'real-madrid',
  'real-sociedad-b': 'real-sociedad', 'bayern-munchen-ii': 'bayern-munchen',
  'borussia-dortmund-ii': 'borussia-dortmund', 'vfb-stuttgart-ii': 'vfb-stuttgart',
};
const values = (collection) => Array.isArray(collection) ? collection : Object.values(collection || {});
const sortTable = (table) => table.slice().sort((a, b) => b.points - a.points
  || ((b.gf || 0) - (b.ga || 0)) - ((a.gf || 0) - (a.ga || 0))
  || (b.gf || 0) - (a.gf || 0) || a.clubId.localeCompare(b.clubId));

/** Only adjacent, populated, domestic divisions are linked. Closed leagues stay closed. */
export function getDivisionRules(world, year = world.year) {
  const competitions = values(world.competitions).filter((competition) => competition.simulated !== false);
  const clubs = values(world.clubs);
  const rules = [];
  for (const upper of competitions) {
    if (upper.closedLeague || ['USA', 'AUS', 'CAN'].includes(upper.country_fifa_code)) continue;
    const candidates = competitions.filter((c) => c.country_fifa_code === upper.country_fifa_code
      && c.tier === upper.tier + 1 && !c.closedLeague && clubs.filter((club) => club.competitionId === c.id).length >= 2);
    // Regional groups need their own qualifying competition, not arbitrary links.
    if (candidates.length !== 1 || clubs.filter((club) => club.competitionId === upper.id).length < 2) continue;
    const lower = candidates[0];
    const country = upper.country_fifa_code;
    let automaticPromotion = 2; let automaticRelegation = 2; let playoff = null;
    let coverage = 'modeled'; let expectedSizes = null; let sources = [];
    let note = 'Intercambio simplificado de dos plazas; no reproduce grupos, promedios ni decisiones administrativas.';
    if (country === 'ENG' && upper.tier <= 3) {
      automaticPromotion = upper.tier === 3 ? 3 : 2;
      automaticRelegation = automaticPromotion + 1;
      playoff = { format: 'english', entrants: 4, semifinalLegs: 2, finalLegs: 1, tieBreak: 'penalties', neutralFinal: true };
      expectedSizes = [upper.tier === 1 ? (year < 1995 ? 22 : 20) : 24, 24];
      sources = [SOURCES.ENG]; coverage = year >= 1995 && year <= 2025 ? 'documented-format' : 'modeled-era';
      note = 'Dos ascensos directos y promoción 3.º–6.º; League Two: tres directos y promoción 4.º–7.º. Final en sede neutral.';
    } else if (country === 'ESP' && upper.tier === 1) {
      automaticPromotion = year >= 2010 ? 2 : 3; automaticRelegation = 3;
      playoff = year >= 2010 ? { format: 'spanish', entrants: 4, semifinalLegs: 2, finalLegs: 2, tieBreak: 'higher-seed',
        awayGoalsRule: year <= 2020, awayGoalsExtraTime: false } : null;
      expectedSizes = [20, 22]; sources = [SOURCES.ESP,
        'https://rfef.es/sites/default/files/images19/001_primera_y_segunda_division.pdf',
        ...(year <= 2020 ? ['https://www.laliga.com/noticias/uli-davila-firma-el-ascenso-del-cordoba'] : [])];
      coverage = year >= 2010 && year <= 2025 ? 'documented-format' : 'modeled-era';
      note = 'Dos directos; semifinales y final a ida y vuelta. Gol visitante antes de 2021/22 (no en prórroga); después de prórroga empatada pasa el mejor clasificado. Filiales no ascienden a Primera.';
    } else if (country === 'GER' && upper.tier <= 2) {
      const relegationPlayoff = year >= 2008;
      automaticPromotion = relegationPlayoff ? 2 : 3; automaticRelegation = automaticPromotion;
      playoff = relegationPlayoff ? { format: 'relegation', entrants: 1, finalLegs: 2, tieBreak: 'penalties', awayGoalsRule: year <= 2020,
        firstHome: upper.tier === 1 ? 'higher' : 'lower' } : null;
      expectedSizes = [18, upper.tier === 1 ? 18 : 20]; sources = [SOURCES.GER];
      coverage = year >= 2008 && year <= 2025 ? 'documented-format' : 'modeled-era';
      note = 'Dos intercambios directos; el antepenúltimo juega ida y vuelta contra el tercer elegible. Gol visitante hasta 2020/21.';
    } else if (country === 'ITA' && upper.tier === 1) {
      automaticPromotion = 2; automaticRelegation = 3;
      playoff = { format: year <= 2012 ? 'italian-four' : 'italian-six', entrants: year <= 2012 ? 4 : 6,
        semifinalLegs: 2, finalLegs: 2, tieBreak: 'higher-seed', noExtraTime: true,
        directGap: year <= 2012 ? 9 : year >= 2017 ? 14 : null };
      expectedSizes = [year < 2004 ? 18 : 20, year <= 2017 ? 22 : 20];
      sources = [year === 2012 ? SOURCES.ITA2012 : SOURCES.ITA];
      coverage = [2012, 2025].includes(year) ? 'documented-format' : 'modeled-era';
      note = 'Dos directos; tercer ascenso por promoción. 2012: 3.º–6.º; 2025: 3.º–8.º con ronda previa. Mejor puesto desempata el global; el margen reglamentario puede dar ascenso directo al tercero.';
    } else if (country === 'FRA' && upper.tier === 1) {
      automaticPromotion = year < 2016 ? 3 : 2; automaticRelegation = automaticPromotion;
      playoff = year >= 2017 ? { format: 'french', entrants: 3, finalLegs: 2, tieBreak: 'penalties' }
        : year === 2016 ? { format: 'relegation', entrants: 1, finalLegs: 2, tieBreak: 'penalties', awayGoalsRule: true } : null;
      expectedSizes = [year >= 2023 ? 18 : 20, year >= 2024 ? 18 : 20]; sources = [SOURCES.FRA];
      coverage = [2012, 2025].includes(year) ? 'documented-format' : 'modeled-era';
      note = year < 2016 ? 'Tres ascensos y descensos directos.' : 'Dos directos; 4.º contra 5.º, ganador contra 3.º y barrage a ida/vuelta contra el antepenúltimo de Ligue 1.';
    } else if (country === 'BRA' && upper.tier === 1) {
      automaticPromotion = 4; automaticRelegation = 4; expectedSizes = [20, 20]; sources = [SOURCES.BRA];
      coverage = year >= 2006 && year <= 2025 ? 'documented-format' : 'modeled-era'; note = 'Cuatro ascensos y descensos directos (formato hasta 2025).';
    } else if (country === 'AUT' && upper.tier === 1) {
      automaticPromotion = 1; automaticRelegation = 1; expectedSizes = [year >= 2018 ? 12 : 10, year >= 2018 ? 16 : 10];
      note = 'Un intercambio deportivo; clasificación por tabla única. Licencias y fases de descenso austríacas no modeladas.';
    }
    const actualSizes = [upper.id, lower.id].map((id) => clubs.filter((club) => club.competitionId === id).length);
    const notes = [note, 'Solo se intercambia con divisiones cargadas; no se eliminan clubes ni se aplican sanciones o reestructuraciones administrativas.'];
    if (clubs.some((club) => club.competitionId === lower.id && (club.reserveParentId || RESERVE_PARENTS[club.id]))
      && !competitions.some((competition) => competition.country_fifa_code === country && competition.tier === lower.tier + 1)) {
      notes.push('El descenso forzoso de un filial si desciende su primer equipo requiere una tercera categoría no cargada; en ese caso se conserva el catálogo y se informa de la excepción.');
    }
    if (expectedSizes && expectedSizes.some((count, i) => count !== actualSizes[i])) notes.push(`Catálogo parcial: ${actualSizes.join('/')} equipos; tamaño reglamentario de referencia ${expectedSizes.join('/')}.`);
    if (coverage !== 'documented-format') notes.push('Reglamento de esta temporada aproximado; no es una reconstrucción oficial completa.');
    rules.push({ id: `division:${upper.id}:${lower.id}`, version: DIVISION_RULES_VERSION, year, country,
      upperId: upper.id, lowerId: lower.id, automaticPromotion, automaticRelegation, playoff, coverage,
      expectedSizes, actualSizes, sources, notes });
  }
  return rules.sort((a, b) => a.country.localeCompare(b.country)
    || competitions.find((c) => c.id === a.upperId).tier - competitions.find((c) => c.id === b.upperId).tier);
}

export function isPromotionEligible(club, upper, world) {
  if (!club || club.promotionEligible === false) return false;
  const parentId = club.reserveParentId || RESERVE_PARENTS[club.id];
  const isReserve = !!parentId || club.isReserve === true;
  if (isReserve && ((upper.country_fifa_code === 'ESP' && upper.tier === 1)
    || (upper.country_fifa_code === 'GER' && upper.tier <= 2))) return false;
  if (parentId) {
    const parent = values(world.clubs).find((c) => c.id === parentId);
    const parentLeague = values(world.competitions).find((c) => c.id === parent?.competitionId);
    if (parentLeague && parentLeague.tier >= upper.tier) return false;
  }
  return true;
}

function movementPair(rule, promotedId, relegatedId, reason) {
  return [{ clubId: promotedId, fromId: rule.lowerId, toId: rule.upperId, reason: `promotion-${reason}`, ruleId: rule.id },
    { clubId: relegatedId, fromId: rule.upperId, toId: rule.lowerId, reason: `relegation-${reason}`, ruleId: rule.id }];
}

function makeTie(tournament, id, stage, a, b, legs, options = {}) {
  return { id: `${tournament.id}:${id}`, stage, a, b, legs, firstHome: 'lower', tieBreak: tournament.rule.playoff.tieBreak,
    noExtraTime: !!tournament.rule.playoff.noExtraTime, awayGoalsRule: !!tournament.rule.playoff.awayGoalsRule,
    awayGoalsExtraTime: tournament.rule.playoff.awayGoalsExtraTime !== false,
    neutral: false, results: [], winnerId: null, ...options };
}

function buildBracket(tournament, entrants) {
  const format = tournament.format;
  const win = (id) => `winner:${tournament.id}:${id}`;
  const tie = (...args) => makeTie(tournament, ...args);
  if (format === 'relegation') return [tie('barrage', 0, tournament.incumbentId, entrants[0], 2,
    { firstHome: tournament.rule.playoff.firstHome || 'lower' })];
  if (format === 'french') return [
    tie('preliminary', 0, entrants[1], entrants[2], 1, { noExtraTime: true }),
    tie('qualifier', 1, entrants[0], win('preliminary'), 1, { noExtraTime: true }),
    tie('barrage', 2, tournament.incumbentId, win('qualifier'), 2, { firstHome: 'lower', noExtraTime: false }),
  ];
  if (format === 'italian-six') return [
    tie('preliminary-a', 0, entrants[2], entrants[5], 1, { noExtraTime: false }),
    tie('preliminary-b', 0, entrants[3], entrants[4], 1, { noExtraTime: false }),
    tie('semi-a', 1, entrants[0], win('preliminary-b'), 2),
    tie('semi-b', 1, entrants[1], win('preliminary-a'), 2),
    tie('final', 2, win('semi-a'), win('semi-b'), 2),
  ];
  return [tie('semi-a', 0, entrants[0], entrants[3], 2), tie('semi-b', 0, entrants[1], entrants[2], 2),
    tie('final', 1, win('semi-a'), win('semi-b'), format === 'english' ? 1 : 2, { neutral: format === 'english' })];
}

/** Called once after all domestic tables have finished; this plan is safe to save as JSON. */
export function createDivisionPlayoffs(state) {
  const rules = getDivisionRules(state.world, state.year);
  const plan = { version: DIVISION_RULES_VERSION, year: state.year, seed: state.seed, rules, movements: [], playoffs: [], complete: true, notes: [], reserveDependencies: [] };
  const clubs = Object.fromEntries(values(state.world.clubs).map((club) => [club.id, club]));
  const competitions = Object.fromEntries(values(state.world.competitions).map((competition) => [competition.id, competition]));
  for (const club of Object.values(clubs)) {
    const parentId = club.reserveParentId || RESERVE_PARENTS[club.id];
    if (!parentId || !clubs[parentId]) continue;
    const league = competitions[club.competitionId];
    const lowerLeagues = Object.values(competitions).filter((entry) => entry.country_fifa_code === league?.country_fifa_code && entry.tier === league.tier + 1);
    const lower = lowerLeagues.length === 1 ? lowerLeagues[0] : null;
    plan.reserveDependencies.push({ clubId: club.id, parentId, clubName: club.name || club.id, competitionId: club.competitionId,
      parentCompetitionId: clubs[parentId].competitionId, lowerId: lower?.id || null,
      replacementCandidates: lower ? sortTable(state.leagues[lower.id]?.table || []).filter((row) =>
        isPromotionEligible(clubs[row.clubId], league, state.world)).map((row) => row.clubId) : [] });
  }
  const reserved = new Set();
  for (const rule of rules) {
    const upperLeague = state.leagues[rule.upperId]; const lowerLeague = state.leagues[rule.lowerId];
    if (!upperLeague || !lowerLeague) continue;
    if ((upperLeague.rounds?.length && upperLeague.round < upperLeague.rounds.length)
      || (lowerLeague.rounds?.length && lowerLeague.round < lowerLeague.rounds.length)) {
      plan.notes.push(`${rule.id}: liga sin terminar; no se resuelven movimientos.`); continue;
    }
    const upper = sortTable(upperLeague.table).filter((row) => clubs[row.clubId]?.competitionId === rule.upperId && !reserved.has(row.clubId));
    const lower = sortTable(lowerLeague.table).filter((row) => clubs[row.clubId]?.competitionId === rule.lowerId
      && !reserved.has(row.clubId) && isPromotionEligible(clubs[row.clubId], competitions[rule.upperId], state.world));
    let direct = Math.min(rule.automaticPromotion, lower.length, Math.max(0, upper.length - 1));
    let hasPlayoff = !!rule.playoff;
    if (hasPlayoff && rule.playoff.directGap != null && lower[direct] && lower[direct + 1]
      && lower[direct].points - lower[direct + 1].points > rule.playoff.directGap) { direct += 1; hasPlayoff = false; }
    if (hasPlayoff && (lower.length < direct + rule.playoff.entrants || upper.length <= direct + 1)) {
      if (lower.length > direct && upper.length > direct + 1) direct += 1;
      hasPlayoff = false; plan.notes.push(`${rule.id}: participantes insuficientes para la promoción; plazas disponibles resueltas por clasificación.`);
    }
    for (let i = 0; i < direct; i += 1) {
      const promotedId = lower[i].clubId; const relegatedId = upper[upper.length - 1 - i].clubId;
      plan.movements.push(...movementPair(rule, promotedId, relegatedId, 'automatic'));
      reserved.add(promotedId); reserved.add(relegatedId);
    }
    if (!hasPlayoff) continue;
    const entrants = lower.slice(direct, direct + rule.playoff.entrants).map((row) => row.clubId);
    const incumbentId = upper[upper.length - direct - 1]?.clubId;
    if (!incumbentId) continue;
    const ranking = Object.fromEntries(lower.map((row, i) => [row.clubId, i])); ranking[incumbentId] = -1;
    const tournament = { id: `${rule.id}:${state.year}`, name: `Promoción · ${competitions[rule.upperId].name || rule.upperId}`,
      rule, format: rule.playoff.format, upperId: rule.upperId, lowerId: rule.lowerId, incumbentId,
      entrantIds: entrants, ranking, ties: [], results: [], winnerId: null, complete: false };
    tournament.ties = buildBracket(tournament, entrants);
    plan.playoffs.push(tournament);
    // Avoid a club contesting another boundary in a tiny/partial catalogue.
    entrants.forEach((id) => reserved.add(id)); reserved.add(incumbentId);
  }
  plan.complete = plan.playoffs.length === 0;
  return plan.complete ? enforceReserveDependencies(plan) : plan;
}

function enforceReserveDependencies(plan) {
  for (const dependency of plan.reserveDependencies || []) {
    const changes = new Map(plan.movements.map((movement) => [movement.clubId, movement]));
    const parentDivision = changes.get(dependency.parentId)?.toId || dependency.parentCompetitionId;
    const reserveDivision = changes.get(dependency.clubId)?.toId || dependency.competitionId;
    if (parentDivision !== reserveDivision) continue;
    const replacementId = dependency.replacementCandidates.find((id) => !changes.has(id));
    if (dependency.lowerId && replacementId && !changes.has(dependency.clubId)) {
      const rule = { id: `reserve:${dependency.clubId}`, upperId: dependency.competitionId, lowerId: dependency.lowerId };
      plan.movements.push(...movementPair(rule, replacementId, dependency.clubId, 'reserve-rule'));
      plan.notes.push(`${dependency.clubName}: descenso forzoso por descenso de su primer equipo; plaza repuesta por clasificación.`);
    } else {
      plan.notes.push(`${dependency.clubName}: no se aplica el descenso forzoso del filial porque no está cargada una categoría inferior compatible. Se mantiene su división como excepción de cobertura.`);
    }
  }
  return plan;
}

function resolveSlot(tournament, slot) {
  return slot?.startsWith('winner:') ? tournament.ties.find((tie) => tie.id === slot.slice(7))?.winnerId : slot;
}

/** One fixture per tie per call; no team can play both legs on the same day. */
export function getDivisionPlayoffFixtures(plan) {
  if (!plan || plan.complete) return [];
  return plan.playoffs.flatMap((tournament) => {
    if (tournament.complete) return [];
    const pending = tournament.ties.filter((tie) => !tie.winnerId);
    const stage = Math.min(...pending.map((tie) => tie.stage));
    return pending.filter((tie) => tie.stage === stage).flatMap((tie) => {
      const a = resolveSlot(tournament, tie.a); const b = resolveSlot(tournament, tie.b);
      if (!a || !b) return [];
      const [higher, lower] = tournament.ranking[a] <= tournament.ranking[b] ? [a, b] : [b, a];
      const leg = tie.results.length + 1;
      const higherHome = tie.legs === 1 || (leg === 1 ? tie.firstHome === 'higher' : tie.firstHome !== 'higher');
      const homeId = higherHome ? higher : lower; const awayId = higherHome ? lower : higher;
      const goals = (id) => tie.results.reduce((sum, result) => sum + (result.fixture.homeId === id ? result.homeGoals : result.awayGoals), 0);
      const awayGoals = (id) => tie.results.reduce((sum, result) => sum + (result.fixture.awayId === id ? result.awayGoals : 0), 0);
      return [{ id: `${tie.id}:leg-${leg}`, competitionId: tournament.id, divisionRuleId: tournament.rule.id,
        tieId: tie.id, divisionPlayoff: true, homeId, awayId, round: tie.stage, leg, legs: tie.legs,
        knockout: leg === tie.legs, neutral: tie.neutral, aggregateHome: goals(homeId), aggregateAway: goals(awayId),
        awayGoalsHome: awayGoals(homeId), awayGoalsAway: awayGoals(awayId), awayGoalsRule: tie.awayGoalsRule,
        awayGoalsExtraTime: tie.awayGoalsExtraTime,
        tieBreak: tie.tieBreak, tieWinnerId: higher, noExtraTime: tie.noExtraTime }];
    });
  });
}

function decidingWinner(result, fixture) {
  const home = result.homeGoals + fixture.aggregateHome; const away = result.awayGoals + fixture.aggregateAway;
  if (home !== away) return home > away ? fixture.homeId : fixture.awayId;
  if (fixture.awayGoalsRule && (fixture.awayGoalsExtraTime !== false || (result.duration || 90) <= 90)) {
    const homeAway = fixture.awayGoalsHome; const awayAway = fixture.awayGoalsAway + result.awayGoals;
    if (homeAway !== awayAway) return homeAway > awayAway ? fixture.homeId : fixture.awayId;
  }
  if (fixture.tieBreak === 'higher-seed') return fixture.tieWinnerId;
  if (result.penalties && result.penalties.home !== result.penalties.away) return result.penalties.home > result.penalties.away ? fixture.homeId : fixture.awayId;
  if ([fixture.homeId, fixture.awayId].includes(result.winnerId)) return result.winnerId;
  throw new Error(`La eliminatoria ${fixture.tieId} necesita un ganador tras el desempate.`);
}

/** Validates results against pending fixtures, preventing replayed legs or forged movements. */
export function advanceDivisionPlayoffs(plan, results) {
  if (!plan || plan.complete) return plan;
  const expected = new Map(getDivisionPlayoffFixtures(plan).map((fixture) => [fixture.id, fixture]));
  const seen = new Set();
  for (const result of results) {
    const fixture = expected.get(result.fixture?.id);
    if (!fixture || seen.has(fixture.id) || result.fixture.homeId !== fixture.homeId || result.fixture.awayId !== fixture.awayId
      || !Number.isInteger(result.homeGoals) || result.homeGoals < 0 || !Number.isInteger(result.awayGoals) || result.awayGoals < 0) {
      throw new Error('Resultado de promoción inválido o repetido.');
    }
    seen.add(fixture.id);
  }
  const next = { ...plan, movements: plan.movements.slice(), notes: plan.notes.slice(), playoffs: plan.playoffs.map((tournament) => ({
    ...tournament, results: tournament.results.slice(), ties: tournament.ties.map((tie) => ({ ...tie, results: tie.results.slice() })),
  })) };
  for (const result of results) {
    const fixture = expected.get(result.fixture.id);
    const tournament = next.playoffs.find((entry) => entry.id === fixture.competitionId);
    const tie = tournament.ties.find((entry) => entry.id === fixture.tieId);
    const record = { fixture, homeGoals: result.homeGoals, awayGoals: result.awayGoals,
      penalties: result.penalties || null, duration: result.duration || 90,
      winnerId: fixture.knockout ? decidingWinner(result, fixture) : null };
    tie.results.push(record); tournament.results.push(record);
    if (fixture.knockout) tie.winnerId = record.winnerId;
  }
  for (const tournament of next.playoffs) {
    if (tournament.complete || !tournament.ties.every((tie) => tie.winnerId)) continue;
    tournament.complete = true; tournament.winnerId = tournament.ties[tournament.ties.length - 1].winnerId;
    if (tournament.winnerId !== tournament.incumbentId) next.movements.push(...movementPair(tournament.rule,
      tournament.winnerId, tournament.incumbentId, 'playoff'));
  }
  next.complete = next.playoffs.every((tournament) => tournament.complete);
  return next.complete ? enforceReserveDependencies(next) : next;
}

/** Convenience for headless seasons; game engine should provide its full match simulator. */
export function resolveDivisionMovements(state, { simulateMatch, simulateKnockout } = {}) {
  let plan = state.divisionPlan || state.divisionPlayoffs || createDivisionPlayoffs(state);
  const simulate = simulateMatch || simulateKnockout;
  if (!plan.complete && typeof simulate !== 'function') throw new TypeError('Se necesita simulateMatch(state, fixture) para resolver las promociones.');
  let rounds = 0;
  while (!plan.complete && rounds++ < 10) {
    const fixtures = getDivisionPlayoffFixtures(plan);
    if (!fixtures.length) throw new Error('La promoción no puede continuar: cuadro incompleto.');
    plan = advanceDivisionPlayoffs(plan, fixtures.map((fixture) => simulate(state, fixture)));
  }
  if (!plan.complete) throw new Error('La promoción no terminó dentro del calendario previsto.');
  return plan;
}

/** Apply atomically at NEXT_SEASON, preserving every club and each division's size. */
export function applyDivisionMovements(world, movements = []) {
  const competitions = new Map(values(world.competitions).map((competition) => [competition.id, competition]));
  const clubs = new Map(values(world.clubs).map((club) => [club.id, club]));
  const changes = new Map(); const balance = new Map();
  for (const movement of movements) {
    const club = clubs.get(movement.clubId); const from = competitions.get(movement.fromId); const to = competitions.get(movement.toId);
    if (!club || club.competitionId !== movement.fromId || !from || !to || from.simulated === false || to.simulated === false || from.id === to.id || changes.has(club.id)
      || from.country_fifa_code !== to.country_fifa_code || Math.abs(from.tier - to.tier) !== 1) {
      throw new Error('Movimiento de división inválido, duplicado o incompatible con la partida.');
    }
    if (to.tier < from.tier && !isPromotionEligible(club, to, world)) throw new Error('Un filial no puede ascender a esa división.');
    changes.set(club.id, movement);
    balance.set(from.id, (balance.get(from.id) || 0) - 1); balance.set(to.id, (balance.get(to.id) || 0) + 1);
  }
  if ([...balance.values()].some((count) => count !== 0)) throw new Error('Los ascensos y descensos deben conservar el número de clubes de cada división.');
  return { ...world, clubs: values(world.clubs).map((club) => changes.has(club.id) ? {
    ...club, competitionId: changes.get(club.id).toId, previousCompetitionId: club.competitionId,
    membershipSource: 'career-simulation', lastDivisionMovement: changes.get(club.id).reason,
  } : club) };
}

/** Deterministic penalty decider for headless tools which only supply regulation scores. */
export function divisionPenaltyWinner(seed, fixture) {
  return createStream(seed, fixture.id, 'division-penalties')() < 0.5 ? fixture.homeId : fixture.awayId;
}
