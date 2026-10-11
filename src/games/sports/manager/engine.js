import { getManagerWorld } from './data.js';
import { getManagerWorld as getLegacyWorld } from './legacy-v1/data.js';
import { createStream, pickWeighted } from '../trayectoria/rng.js';
import { TRAINING_INTENSITIES, addDays, daysBetween, getPlayerHealth, effectiveRating, injuryProbability, recoverHealth, matchHealth, sampleInjury } from './health.js';
import { createDivisionPlayoffs, getDivisionPlayoffFixtures, advanceDivisionPlayoffs, applyDivisionMovements } from './divisions.js';
import { packSnapshot, unpackSnapshot } from './save-codec.js';
import { getPlayerAge } from './player-age.js';
import { orderDefendersForFormation } from './lineup-roles.js';
import { createLiveMatch, advanceLiveMatch, changeLiveTactics, substituteLivePlayer, setLiveAutoSubstitutions, liveMatchReport, importLegacyMatchPrefix } from './live-match.js';
import { TACTICAL_KEYS, TACTICAL_DEFAULTS, normalizeTacticalInstructions, validateTacticalInstructions } from './tactical-model.js';
import { getTransferWindow, getRecruitmentFinances, openNegotiation, offerClub, offerContract, cancelNegotiation, completeTransfer,
  listForTransfer, unlistTransfer, respondTransferOffer, progressTransferMarket, validateRecruitmentState, triggerContractClause } from './transfer-market.js';
import { SCOUT_LEVELS, startScouting, progressScouting, cancelScouting, toggleShortlist, validateScoutingState } from './scouting.js';
import { createTransferWindowSnapshot, validateTransferWindowSnapshot } from './transfer-windows.js';
import { activeLoan, clubWageBill, getContractOverview, permanentTransfer, registrationProblem, settleObligations } from './contract-economy.js';
import { openLoanNegotiation, offerLoanTerms, cancelLoanNegotiation, completeLoan, exerciseLoanOption, progressLoans } from './loans.js';
import { openContractRenewal, offerRenewal, completeRenewal, progressContractRights, validateContractState } from './contracts.js';
export { getTransferWindow, getRecruitmentFinances, getContractOverview, SCOUT_LEVELS };

export const MANAGER_SAVE_VERSION = 2;
export const FORMATIONS = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2'];
const MENTALITIES = ['balanced', 'attacking', 'defensive'];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const roundMoney = (value) => Math.round(value / 1000) * 1000;
const indexes = new WeakMap();
const snapshotCache = new WeakMap();
const emptyStats = () => ({ appearances: 0, minutes: 0, goals: 0, assists: 0, cleanSheets: 0, leagueGoals: 0, leagueCleanSheets: 0, ratingTotal: 0 });

function indexWorld(world) {
  if (indexes.has(world)) return indexes.get(world);
  const clubs = Object.fromEntries(world.clubs.map((club) => [club.id, club]));
  const players = Object.fromEntries(world.players.map((player) => [player.id, player]));
  const competitions = Object.fromEntries(world.competitions.map((competition) => [competition.id, competition]));
  const squads = {};
  const countries = {};
  world.players.forEach((player) => {
    if (player.retired) return;
    (squads[player.clubId] ||= []).push(player);
    (countries[player.nationality] ||= []).push(player);
  });
  const result = { clubs, players, competitions, squads, countries };
  indexes.set(world, result);
  return result;
}

/** player.clubId is authoritative; club.playerIds is a maintained active-roster index. */
function synchronizeRosters(world) {
  const byClub = new Map(world.clubs.map((club) => [club.id, []]));
  for (const player of world.players) if (!player.retired) byClub.get(player.clubId)?.push(player.id);
  let changed = false;
  const clubs = world.clubs.map((club) => {
    const playerIds = byClub.get(club.id);
    if (Array.isArray(club.playerIds) && club.playerIds.length === playerIds.length && club.playerIds.every((id, i) => id === playerIds[i])) return club;
    changed = true;
    return { ...club, playerIds };
  });
  return changed ? { ...world, clubs } : world;
}

function initialSnapshotDate(world, year) {
  const date = world.coverage?.snapshotDate;
  return typeof date === 'string' && date.startsWith(`${year}-`) && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date))
    ? date : `${year}-09-01`;
}

/** Circle scheduling: each pair meets once at each ground; odd leagues have a bye. */
export function createRoundRobin(clubIds, competitionId = 'league') {
  if (clubIds.length < 2) return [];
  const teams = clubIds.slice();
  if (teams.length % 2) teams.push(null);
  const rounds = [];
  for (let round = 0; round < teams.length - 1; round += 1) {
    const fixtures = [];
    for (let i = 0; i < teams.length / 2; i += 1) {
      let homeId = teams[i];
      let awayId = teams[teams.length - 1 - i];
      if ((round + i) % 2) [homeId, awayId] = [awayId, homeId];
      if (homeId && awayId) fixtures.push({ id: `${competitionId}:${round}:${i}`, homeId, awayId, round, competitionId });
    }
    rounds.push(fixtures);
    teams.splice(1, 0, teams.pop());
  }
  return [...rounds, ...rounds.map((fixtures, i) => fixtures.map((fixture, j) => ({
    ...fixture, homeId: fixture.awayId, awayId: fixture.homeId,
    round: rounds.length + i, id: `${competitionId}:${rounds.length + i}:${j}`,
  })))];
}

function makeLeagues(world, seasonStartDate = `${world.year}-08-17`) {
  return Object.fromEntries(world.competitions.filter((competition) => competition.simulated !== false).map((competition) => {
    const clubIds = world.clubs.filter((club) => club.competitionId === competition.id).map((club) => club.id);
    const schedule = createRoundRobin(clubIds, competition.id);
    const rounds = schedule.map((fixtures, round) => fixtures.map((fixture) => ({ ...fixture,
      date: addDays(seasonStartDate, Math.round((round + 1) * 266 / schedule.length)),
    })));
    return [competition.id, {
      clubIds, rounds, round: 0,
      table: clubIds.map((clubId) => ({ clubId, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 })),
    }];
  }));
}

function pickLineup(players, formation = '4-3-3', state = {}) {
  const available = players.filter((player) => getPlayerHealth(state, player).available).slice()
    .sort((a, b) => effectiveRating(b, getPlayerHealth(state, b)) - effectiveRating(a, getPlayerHealth(state, a)) || a.id.localeCompare(b.id));
  const shape = formation === '4-2-3-1' ? [4, 5, 1] : formation.split('-').map(Number);
  const selected = [];
  [['GK', 1], ['DF', shape[0]], ['MF', shape[1]], ['FW', shape[2]]].forEach(([position, count]) => {
    const positional = available.filter((player) => player.position === position);
    selected.push(...(position === 'DF' ? orderDefendersForFormation(positional, formation) : positional).slice(0, count));
  });
  const ids = new Set(selected.map((player) => player.id));
  for (const player of available) {
    if (selected.length >= 11) break;
    if (!ids.has(player.id) && player.position !== 'GK') { selected.push(player); ids.add(player.id); }
  }
  return selected.slice(0, 11);
}

function wageBill(state) {
  return clubWageBill(state);
}

export function createManagerCareer({ year = 2012, clubId = 'barcelona', managerName = 'Mánager', seed = 'football-manager', world: suppliedWorld } = {}) {
  const world = synchronizeRosters(suppliedWorld || getManagerWorld(Number(year)));
  const club = world.clubs.find((entry) => entry.id === clubId);
  if (!club) throw new Error('El club seleccionado no está disponible.');
  if (club.selectable === false || world.competitions.find((entry) => entry.id === club.competitionId)?.simulated === false) throw new Error('Ese club no tiene una liga documentada seleccionable para esta época.');
  const date = initialSnapshotDate(world, Number(year));
  const leagues = makeLeagues(world, date);
  if (!leagues[club.competitionId]?.rounds.length) throw new Error('Esta liga necesita al menos dos clubes.');
  const squad = world.players.filter((player) => player.clubId === club.id && !player.retired);
  const bill = squad.reduce((sum, player) => sum + player.wage, 0);
  const wageBudget = Math.ceil(bill * 1.4);
  return {
    version: MANAGER_SAVE_VERSION, year: Number(year), startYear: Number(year), season: 1, seed: String(seed),
    date, seasonStartDate: date, trainingIntensity: 'balanced', playerHealth: {}, divisionPlan: null, divisionChanges: [],
    managerName: String(managerName).trim().slice(0, 40) || 'Mánager', clubId: club.id, world, leagues,
    round: 0, phase: 'season', lineup: pickLineup(squad).map((player) => player.id), autoLineup: true,
    tactics: { formation: '4-3-3', mentality: 'balanced', pressing: 'balanced', ...TACTICAL_DEFAULTS }, morale: 70,
    finances: { budget: Math.round(club.budget), openingBudget: Math.round(club.budget), wageBudget, spent: 0, income: 0, wagesPaid: 0, operatingReserve: wageBudget * 52 },
    playerStats: {}, activeMatch: null, lastMatch: null, lastResults: [], scoutReports: [], negotiation: null,
    pendingTransfers: [], marketCooldowns: {}, clubTransferBalances: {}, clubRelationships: {}, transferListings: [], transferOffers: [],
    loans: [], contractRights: [], financialObligations: [], loanNegotiation: null, renewalNegotiation: null,
    transferWindowCalendar: createTransferWindowSnapshot(world),
    scoutMissions: [], shortlist: [], scoutingSerial: 0, calendarNextDate: null,
    tournaments: [], awards: [], history: [], transfers: [], pressRound: null, lastError: null,
    news: [{ id: 'welcome', text: `Bienvenido a ${club.name}. La carrera empieza en ${year}; el futuro se simula a partir de esta plantilla.`, type: 'club' }],
  };
}

export function getCareerRefreshEligibility(state) {
  if (!state || state.version !== 2 || state.migratedFromVersion === 1) return { eligible: false, reason: 'Solo se pueden actualizar carreras v2 nuevas; las partidas heredadas conservan su catálogo original.' };
  if (state.season !== 1 || state.year !== state.startYear || state.round !== 0 || state.phase !== 'season'
    || state.activeMatch || state.matchPrepared || state.lastMatch || state.date !== state.seasonStartDate
    || Object.keys(state.playerStats || {}).length || (state.history || []).length || (state.transfers || []).length
    || Object.values(state.leagues || {}).some((league) => league.round !== 0 || league.table.some((row) => row.played !== 0)))
    return { eligible: false, reason: 'La carrera ya tiene partidos, fichajes o progreso. Su mundo guardado se conserva para no reescribir la historia.' };
  if (state.negotiation || state.pressRound != null || (state.scoutReports || []).length || (state.scoutMissions || []).length
    || (state.pendingTransfers || []).length || (state.transferListings || []).length || (state.loans || []).length || state.loanNegotiation || state.renewalNegotiation
    || ['spent', 'income', 'wagesPaid'].some((key) => state.finances?.[key] !== 0))
    return { eligible: false, reason: 'Ya hay negociaciones, prensa, informes o movimientos económicos. La actualización inicial no borra ese trabajo.' };
  return { eligible: true, reason: 'Se sustituirá el catálogo inicial y se recalcularán fecha y presupuestos; se conservarán entrenador, semilla y preferencias.' };
}

/** Explicit user action only. Never invoked by restore or by normal season progression. */
export function refreshInitialManagerCareer(state) {
  const eligibility = getCareerRefreshEligibility(state);
  if (!eligibility.eligible) return fail(state, eligibility.reason);
  let next;
  try {
    next = createManagerCareer({ year: state.startYear, clubId: state.clubId, managerName: state.managerName, seed: state.seed });
  } catch {
    return fail(state, 'El catálogo actualizado no permite reconstruir este club; se conserva la partida original.');
  }
  next.tactics = { ...state.tactics };
  next.trainingIntensity = state.trainingIntensity;
  next.autoLineup = state.autoLineup;
  const candidates = pickLineup(indexWorld(next.world).squads[next.clubId], next.tactics.formation, next).map((player) => player.id);
  const retained = state.lineup.filter((id) => indexWorld(next.world).players[id]?.clubId === next.clubId && !indexWorld(next.world).players[id].retired);
  next.lineup = next.autoLineup ? candidates : retained;
  if (!next.autoLineup && state.lineup.length === 11) {
    if (!retained.some((id) => indexWorld(next.world).players[id].position === 'GK')) {
      const keeper = candidates.find((id) => indexWorld(next.world).players[id].position === 'GK');
      if (keeper) next.lineup.unshift(keeper);
    }
    for (const id of candidates) if (next.lineup.length < 11 && !next.lineup.includes(id) && indexWorld(next.world).players[id].position !== 'GK') next.lineup.push(id);
  }
  next.initialDataRefresh = { fromSnapshotDate: state.world.coverage?.snapshotDate || null, toSnapshotDate: next.world.coverage?.snapshotDate || next.date };
  addNews(next, 'Catálogo inicial actualizado por petición expresa: plantilla, fecha y presupuesto se han reconstruido antes de empezar la carrera.', 'club');
  return next;
}

export function getStandings(state, competitionId) {
  const id = competitionId || indexWorld(state.world).clubs[state.clubId].competitionId;
  return (state.leagues[id]?.table || []).map((row) => ({ ...row, gd: row.gf - row.ga }))
    .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.clubId.localeCompare(b.clubId));
}

export function getSquad(state) {
  return (indexWorld(state.world).squads[state.clubId] || []).map((player) => ({
    ...player, ...getPlayerHealth(state, player), age: getPlayerAge(player, state.date, state.year), selected: state.lineup.includes(player.id), stats: state.playerStats[player.id] || emptyStats(),
  })).sort((a, b) => ['GK', 'DF', 'MF', 'FW'].indexOf(a.position) - ['GK', 'DF', 'MF', 'FW'].indexOf(b.position) || b.rating - a.rating);
}

export function getMarketPlayers(state, { country, maxAge, position, limit = 200 } = {}) {
  return state.world.players.filter((player) => !player.retired && !player.emergency && player.clubId !== state.clubId
    && (!country || player.nationality === country) && (!maxAge || getPlayerAge(player, state.date, state.year) <= maxAge)
    && (!position || player.position === position))
    .sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id)).slice(0, limit)
    .map((player) => ({ ...player, ...getPlayerHealth(state, player), age: getPlayerAge(player, state.date, state.year), stats: state.playerStats[player.id] || emptyStats() }));
}

function tournamentPairing(tournament) {
  const count = tournament.remaining.length;
  if (tournament.balancedByes) {
    const power = 2 ** Math.ceil(Math.log2(count));
    const byeCount = power - count;
    return { paired: tournament.remaining.slice(byeCount), byes: tournament.remaining.slice(0, byeCount) };
  }
  // Retain the exact bracket of older saved careers.
  return { paired: count % 2 ? tournament.remaining.slice(0, -1) : tournament.remaining,
    byes: count % 2 ? tournament.remaining.slice(-1) : [] };
}

function tournamentFixtures(tournament) {
  if (tournament.winnerId) return [];
  const fixtures = [];
  const { paired } = tournamentPairing(tournament);
  for (let i = 0; i + 1 < paired.length; i += 2) {
    fixtures.push({ id: `${tournament.id}:${tournament.round}:${i / 2}`, homeId: paired[i], awayId: paired[i + 1],
      competitionId: tournament.id, round: tournament.round, knockout: true, national: tournament.type === 'national' });
  }
  return fixtures;
}

function scheduledTournaments(state) {
  const active = state.tournaments.filter((tournament) => !tournament.winnerId);
  const type = active.some((tournament) => tournament.type === 'club') ? 'club' : 'national';
  const used = new Set();
  return active.filter((tournament) => {
    if (tournament.type !== type || tournament.remaining.some((id) => used.has(id))) return false;
    tournament.remaining.forEach((id) => used.add(id));
    return true;
  });
}

export function getNextFixture(state) {
  if (state.activeMatch) return state.activeMatch.fixture;
  if (state.phase === 'season') {
    const competitionId = indexWorld(state.world).clubs[state.clubId].competitionId;
    return state.leagues[competitionId]?.rounds[state.round]?.find((fixture) => fixture.homeId === state.clubId || fixture.awayId === state.clubId) || null;
  }
  if (state.phase === 'tournaments') {
    return scheduledTournaments(state).flatMap(tournamentFixtures).find((fixture) => fixture.homeId === state.clubId || fixture.awayId === state.clubId) || null;
  }
  if (state.phase === 'playoffs') return getDivisionPlayoffFixtures(state.divisionPlan).find((fixture) => fixture.homeId === state.clubId || fixture.awayId === state.clubId) || null;
  return null;
}

export function getManagerSummary(state) {
  const index = indexWorld(state.world);
  const club = index.clubs[state.clubId];
  const competition = index.competitions[club.competitionId];
  const table = getStandings(state);
  const bill = wageBill(state);
  const squad = getSquad(state);
  const recruitment = getRecruitmentFinances(state);
  const nextFixture = getNextFixture(state);
  const nextRoundDate = state.phase === 'complete' ? null : state.matchPrepared ? state.date : addDays(state.date, restInterval(state));
  return { club, competition, position: table.some((entry) => entry.clubId === club.id && entry.played > 0) ? table.findIndex((entry) => entry.clubId === club.id) + 1 : null,
    played: table.find((entry) => entry.clubId === club.id)?.played || 0,
    totalRounds: state.leagues[club.competitionId].rounds.length, nextFixture: getNextFixture(state),
    wageBill: bill, budget: state.finances.budget, wageBudget: state.finances.wageBudget,
    remainingWages: state.finances.wageBudget - bill, seasonLabel: `${state.year}/${String(state.year + 1).slice(-2)}`,
    date: state.date, nextRoundDate, nextMatchDate: nextFixture ? nextRoundDate : null, restDays: nextFixture && !state.matchPrepared ? restInterval(state) : 0,
    injuredCount: squad.filter((player) => player.injury).length, averageCondition: Math.round(squad.reduce((sum, player) => sum + player.condition, 0) / Math.max(1, squad.length)),
    transferWindowOpen: isTransferWindowOpen(state),
    transferWindow: getTransferWindow(state), recruitment,
    availableTransferBudget: recruitment.availableBudget, reservedFees: recruitment.reservedFees, availableWages: recruitment.availableWages,
  };
}

export function isTransferWindowOpen(state) {
  if (state.phase === 'complete') return true;
  if (state.phase === 'season' && state.round === 0 && !state.matchPrepared && !Object.keys(state.playerStats || {}).length) return true;
  const month = Number(state.date?.slice(5, 7) || 8);
  // A shared European-style registration window is a declared simulation rule.
  return [7, 8, 1].includes(month);
}

function restInterval(state) {
  if (state.calendarNextDate) return Math.max(0, daysBetween(state.date, state.calendarNextDate));
  if (state.phase !== 'season') return 3;
  const club = indexWorld(state.world).clubs[state.clubId];
  const rounds = state.leagues[club.competitionId].rounds.length;
  // Every division spans the same approximate 38-week campaign. Its exact
  // fixture dates are independent of which club the human chooses to manage.
  return Math.max(1, Math.round((state.round + 1) * 266 / rounds) - Math.round(state.round * 266 / rounds));
}

function settleCpuFixturesBefore(state, date) {
  if (state.phase !== 'season') return state;
  const ownCompetition = indexWorld(state.world).clubs[state.clubId].competitionId;
  let next = state;
  for (const [id, league] of Object.entries(state.leagues)) {
    if (id === ownCompetition) continue;
    const target = Math.max(league.round, league.rounds.filter((fixtures) => fixtures[0]?.date < date).length);
    if (target === league.round) continue;
    if (next === state) next = { ...state, leagues: { ...state.leagues }, playerStats: { ...state.playerStats }, playerHealth: { ...state.playerHealth } };
    let table = league.table;
    for (let round = league.round; round < target; round += 1) for (const fixture of league.rounds[round]) {
      const result = simulateManagerMatch(next, fixture);
      applyStats(next, result); table = updateTable(table, result);
    }
    next.leagues[id] = { ...league, table, round: target };
  }
  return next;
}

function progressRecruitmentToDate(state, date) {
  let next = state;
  const visited = new Set();
  for (let guard = 0; guard < 1000; guard += 1) {
    const dates = [...(next.pendingTransfers || []).map((deal) => deal.joinDate),
      ...(next.loans || []).flatMap((loan) => loan.status === 'pending' ? [loan.startDate, loan.endDate, loan.purchaseDate] : loan.status === 'active' ? [loan.endDate, loan.purchaseDate] : loan.status === 'awaiting-purchase' ? [loan.purchaseDate] : []),
      ...(next.financialObligations || []).filter((item) => item.status === 'pending').map((item) => item.dueDate)]
      .filter((value) => value && value <= date && !visited.has(value)).sort();
    if (!dates.length) break;
    const eventDate = dates[0]; visited.add(eventDate);
    next = settleCpuFixturesBefore(next, eventDate);
    next = settleObligations(progressLoans(progressTransferMarket({ ...next, date: eventDate })));
  }
  if ((next.contractRights || []).some((right) => right.status === 'active') || next.world.players.some((player) => player.clubId === next.clubId && player.contract?.releaseClause)) next = settleCpuFixturesBefore(next, date);
  return progressScouting(progressContractRights(settleObligations(progressLoans(progressTransferMarket({ ...next, date })))));
}

function advanceCalendar(state, action) {
  const days = Number(action.days ?? 1);
  if (!Number.isInteger(days) || days < 1 || days > 31) return fail(state, 'El calendario permite avanzar entre 1 y 31 días cada vez.');
  if (state.matchPrepared) return fail(state, 'Juega el encuentro preparado antes de avanzar el calendario.');
  const fixtureDate = state.phase === 'complete' ? null : state.calendarNextDate || addDays(state.date, restInterval(state));
  const requested = addDays(state.date, days);
  const date = fixtureDate && requested > fixtureDate ? fixtureDate : requested;
  if (date <= state.date) return fail(state, 'Has llegado al día del próximo encuentro. Debes jugarlo antes de seguir avanzando.');
  return { ...progressRecruitmentToDate(state, date), calendarNextDate: fixtureDate, lastError: null };
}

function prepareMatchday(state) {
  if (state.matchPrepared) return state;
  const days = restInterval(state);
  const date = addDays(state.date, days);
  let next = { ...progressRecruitmentToDate(state, date), previousDate: state.date, matchPrepared: true };
  const index = indexWorld(next.world);
  // Promote explicitly fictional emergency reserves only where availability prevents a match.
  const additions = [];
  for (const club of state.world.clubs) {
    if (index.competitions[club.competitionId]?.simulated === false) continue;
    const earliestState = { ...next, date: state.calendarNextDate ? next.date : addDays(state.date, 1) };
    const healthy = (index.squads[club.id] || []).filter((player) => getPlayerHealth(earliestState, player).available);
    const needsKeeper = !healthy.some((player) => player.position === 'GK');
    const count = Math.max(11 - healthy.length, needsKeeper ? 1 : 0);
    for (let i = 0; i < count; i += 1) {
      const position = needsKeeper && i === 0 ? 'GK' : ['DF', 'MF', 'FW'][i % 3];
      additions.push({ id: `emergency-${club.id}-${date}-${i}`, name: `Reserva de emergencia · ${club.shortName || club.name} ${i + 1}`,
        clubId: club.id, position, rating: Math.max(25, club.rating - 29), potential: Math.max(40, club.rating - 15),
        birthYear: state.year - 18, age: 18, nationality: club.country || index.competitions[club.competitionId]?.country_fifa_code,
        value: 20000, wage: 0, real: false, emergency: true, source: 'Reserva ficticia de emergencia: falta de jugadores disponibles' });
    }
  }
  if (additions.length) next.world = synchronizeRosters({ ...next.world, players: [...next.world.players, ...additions] });
  const own = indexWorld(next.world).squads[state.clubId] || [];
  const selected = state.lineup.map((id) => indexWorld(next.world).players[id]).filter(Boolean);
  // Preserve a deliberate manual omission, but repair a full eleven with unavailable starters.
  if (state.autoLineup) next.lineup = pickLineup(own, state.tactics.formation, next).map((player) => player.id);
  else if (selected.length === 11 && selected.some((player) => !getPlayerHealth(next, player).available)) {
    const viable = selected.filter((player) => getPlayerHealth(next, player).available);
    const replacement = pickLineup(own, state.tactics.formation, next);
    if (!viable.some((player) => player.position === 'GK')) viable.unshift(replacement.find((player) => player.position === 'GK'));
    for (const player of replacement) if (viable.length < 11 && player.position !== 'GK' && !viable.some((entry) => entry?.id === player.id)) viable.push(player);
    next.lineup = viable.filter(Boolean).map((player) => player.id);
  }
  if (additions.some((player) => player.clubId === state.clubId)) addNews(next, 'El filial aporta una reserva ficticia de emergencia para poder completar la convocatoria.', 'health');
  return next;
}

function addNews(state, text, type = 'club') {
  state.news = [{ id: `${state.year}:${state.round}:${state.transfers.length}:${text.slice(0, 40)}`, text, type }, ...state.news].slice(0, 30);
}

function fail(state, message) { return { ...state, lastError: message }; }

function squadForFixture(state, id, national) {
  const index = indexWorld(state.world);
  const players = national ? index.countries[id.slice(7)] || [] : index.squads[id] || [];
  if (!national && id === state.clubId) return state.lineup.map((playerId) => index.players[playerId]).filter((player) => player && getPlayerHealth(state, player).available);
  return pickLineup(players, '4-3-3', state);
}

function teamStrength(state, lineup, clubId, minutes = null) {
  const mean = (position) => {
    const players = lineup.filter((player) => player.position === position);
    const weight = (player) => minutes ? minutes[player.id] || 0 : 1;
    const total = players.reduce((sum, player) => sum + weight(player), 0);
    return total ? players.reduce((sum, player) => sum + effectiveRating(player, getPlayerHealth(state, player)) * weight(player), 0) / total : 25;
  };
  const own = clubId === state.clubId;
  const motivation = own ? (state.morale - 65) / 12 : 0;
  let attack = mean('FW') * 0.53 + mean('MF') * 0.32 + mean('DF') * 0.15 + motivation;
  let defense = mean('GK') * 0.28 + mean('DF') * 0.52 + mean('MF') * 0.2 + motivation;
  if (own) {
    const mentality = state.tactics.mentality;
    if (mentality === 'attacking') { attack += 5; defense -= 4; }
    if (mentality === 'defensive') { attack -= 4; defense += 5; }
    const ideal = state.tactics.formation === '4-2-3-1' ? [4, 5, 1] : state.tactics.formation.split('-').map(Number);
    const mismatch = ['DF', 'MF', 'FW'].reduce((sum, position, i) => sum + Math.abs(lineup.filter((player) => player.position === position).reduce((count, player) => count + (minutes ? (minutes[player.id] || 0) / 90 : 1), 0) - ideal[i]), 0);
    attack -= mismatch * 1.5; defense -= mismatch * 1.5;
    if (ideal[0] === 3) { attack += 2; defense -= 2; }
    if (ideal[0] === 5) { attack -= 2; defense += 2; }
  }
  const missing = minutes ? Math.max(0, 11 - Object.values(minutes).reduce((sum, value) => sum + value, 0) / 90) : Math.max(0, 11 - lineup.length);
  return { attack: attack - missing * 4, defense: defense - missing * 4 };
}

function poisson(random, expectation) {
  const threshold = Math.exp(-expectation);
  let product = 1;
  let k = 0;
  do { k += 1; product *= random(); } while (product > threshold && k < 13);
  return k - 1;
}

function beginLiveMatch(state, fixture, legacy = false, modelVersion = 3) {
  fixture = { ...fixture, date: fixture.date || state.date };
  state = { ...state, date: fixture.date };
  const index = indexWorld(state.world);
  const teams = {};
  const players = {};
  const ownSide = fixture.homeId === state.clubId ? 'home' : 'away';
  for (const side of ['home', 'away']) {
    const id = fixture[`${side}Id`];
    const lineup = squadForFixture(state, id, fixture.national);
    const pool = (fixture.national ? index.countries[id.slice(7)] : index.squads[id]) || [];
    const available = pool.filter((player) => getPlayerHealth(state, player).available);
    for (const player of available) players[player.id] = { id: player.id, name: player.name, position: player.position, rating: player.rating,
      birthYear: player.birthYear, birthDate: player.birthDate, age: getPlayerAge(player, state.date, state.year), health: getPlayerHealth(state, player) };
    const bench = available.filter((player) => !lineup.some((entry) => entry.id === player.id))
      .sort((a, b) => effectiveRating(b, getPlayerHealth(state, b)) - effectiveRating(a, getPlayerHealth(state, a)) || a.id.localeCompare(b.id));
    const reserveKeeper = bench.find((player) => player.position === 'GK');
    const selectedBench = legacy ? bench : [...(reserveKeeper ? [reserveKeeper] : []), ...bench.filter((player) => player.position !== 'GK')].slice(0, state.year >= 2020 ? 9 : 7);
    teams[side] = { lineup: lineup.map((player) => player.id), bench: selectedBench.map((player) => player.id),
      tactics: side === ownSide ? state.tactics : { formation: '4-3-3', mentality: 'balanced' } };
  }
  return createLiveMatch({ fixture, seed: state.seed, year: state.year, ownSide, morale: state.morale, teams, players, modelVersion });
}

/** The user's quick and directed matches share the same incremental model. */
export function simulateManagerMatch(state, fixture) {
  if (!fixture.national && [fixture.homeId, fixture.awayId].includes(state.clubId)) {
    return liveMatchReport(advanceLiveMatch(beginLiveMatch(state, fixture), 120, true));
  }
  return simulateAggregateMatch(state, fixture);
}

/** CPU-only fixtures use the cheaper aggregate model; also retained for old saved match prefixes. */
function simulateAggregateMatch(state, fixture) {
  fixture = { ...fixture, date: fixture.date || state.date };
  state = { ...state, date: fixture.date };
  const random = createStream(state.seed, state.year, 'match', fixture.id);
  const home = squadForFixture(state, fixture.homeId, fixture.national);
  const away = squadForFixture(state, fixture.awayId, fixture.national);
  const events = [{ minute: 0, type: 'kickoff', text: 'Comienza el partido.' }];
  const appearances = {};
  function planSide(side, lineup, teamId) {
    const healthRandom = createStream(state.seed, state.year, fixture.id, side, 'health');
    const pool = fixture.national ? indexWorld(state.world).countries[teamId.slice(7)] || [] : indexWorld(state.world).squads[teamId] || [];
    const bench = pool.filter((player) => !lineup.some((entry) => entry.id === player.id) && getPlayerHealth(state, player).available)
      .sort((a, b) => effectiveRating(b, getPlayerHealth(state, b)) - effectiveRating(a, getPlayerHealth(state, a)) || a.id.localeCompare(b.id));
    let substitutions = 0;
    const maxSubs = state.year >= 2020 ? 5 : 3;
    const planned = lineup.map((player) => {
      appearances[player.id] = { side, start: 0, end: 120 };
      const health = getPlayerHealth(state, player);
      return healthRandom() < injuryProbability({ ...player, age: getPlayerAge(player, state.date, state.year) }, health)
        ? { player, minute: 8 + Math.floor(healthRandom() * 79), injury: sampleInjury(healthRandom) } : null;
    }).filter(Boolean).sort((a, b) => a.minute - b.minute);
    // Automated coaches rest tired outfield players, also in quick simulation.
    const tired = lineup.filter((player) => player.position !== 'GK' && !planned.some((entry) => entry.player.id === player.id))
      .sort((a, b) => getPlayerHealth(state, a).condition - getPlayerHealth(state, b).condition || a.rating - b.rating).slice(0, 2);
    tired.forEach((player, i) => planned.push({ player, minute: 64 + i * 12 }));
    planned.sort((a, b) => a.minute - b.minute);
    const participants = lineup.slice();
    for (const entry of planned) {
      const replacement = substitutions < maxSubs ? bench.find((player) => player.position === entry.player.position)
        || (entry.player.position !== 'GK' ? bench.find((player) => player.position !== 'GK') : null) : null;
      if (!replacement && !entry.injury) continue;
      appearances[entry.player.id].end = entry.minute;
      if (entry.injury) events.push({ minute: entry.minute, type: 'injury', side, playerId: entry.player.id, injury: entry.injury,
        text: `${entry.player.name} abandona por ${entry.injury.name.toLowerCase()}. Baja estimada: ${entry.injury.daysRemaining} días.` });
      if (replacement) {
        substitutions += 1;
        bench.splice(bench.indexOf(replacement), 1);
        participants.push(replacement);
        appearances[replacement.id] = { side, start: entry.minute, end: 120 };
        events.push({ minute: entry.minute, type: 'substitution', side, playerOutId: entry.player.id, playerInId: replacement.id,
          text: `Cambio: entra ${replacement.name} por ${entry.player.name}.` });
      }
    }
    return participants;
  }
  const homeParticipants = planSide('home', home, fixture.homeId);
  const awayParticipants = planSide('away', away, fixture.awayId);
  const projectedMinutes = (players) => Object.fromEntries(players.map((player) => [player.id, Math.max(0, Math.min(90, appearances[player.id].end) - appearances[player.id].start)]));
  const homePower = teamStrength(state, homeParticipants, fixture.homeId, projectedMinutes(homeParticipants));
  const awayPower = teamStrength(state, awayParticipants, fixture.awayId, projectedMinutes(awayParticipants));
  const xgHome = clamp((fixture.national || fixture.neutral ? 1.3 : 1.48) * Math.exp((homePower.attack - awayPower.defense) / 30), 0.15, 5.5);
  const xgAway = clamp((fixture.neutral ? 1.3 : 1.14) * Math.exp((awayPower.attack - homePower.defense) / 30), 0.12, 5);
  let homeGoals = poisson(random, xgHome);
  let awayGoals = poisson(random, xgAway);
  function goal(side, minute) {
    const squad = (side === 'home' ? homeParticipants : awayParticipants).filter((player) => appearances[player.id].start <= minute && appearances[player.id].end > minute);
    const player = pickWeighted(random, squad, (entry) => ({ GK: 0.01, DF: 0.55, MF: 1.9, FW: 4.8 }[entry.position]) * (entry.rating / 60) ** 2);
    const assistant = random() < 0.74 ? pickWeighted(random, squad.filter((entry) => entry.id !== player?.id), (entry) => ({ GK: 0.02, DF: 0.6, MF: 3, FW: 2 }[entry.position])) : null;
    events.push({ minute, type: 'goal', side, playerId: player?.id || null, assistId: assistant?.id || null, text: `¡Gol de ${player?.name || 'su equipo'}!${assistant ? ` Asistencia de ${assistant.name}.` : ''}` });
  }
  for (let i = 0; i < homeGoals; i += 1) goal('home', 2 + Math.floor(random() * 88));
  for (let i = 0; i < awayGoals; i += 1) goal('away', 2 + Math.floor(random() * 88));
  let penalties = null;
  let duration = 90;
  function tied() {
    const homeAggregate = homeGoals + (fixture.aggregateHome || 0);
    const awayAggregate = awayGoals + (fixture.aggregateAway || 0);
    if (homeAggregate !== awayAggregate) return false;
    return !fixture.awayGoalsRule || (duration > 90 && fixture.awayGoalsExtraTime === false)
      || (fixture.awayGoalsHome || 0) === (fixture.awayGoalsAway || 0) + awayGoals;
  }
  if (fixture.knockout && tied() && !fixture.noExtraTime) {
    duration = 120;
    events.push({ minute: 90, type: 'extra-time', text: 'Empate: se juega la prórroga.' });
    const extraHome = poisson(random, xgHome / 3);
    const extraAway = poisson(random, xgAway / 3);
    homeGoals += extraHome; awayGoals += extraAway;
    for (let i = 0; i < extraHome; i += 1) goal('home', 91 + Math.floor(random() * 29));
    for (let i = 0; i < extraAway; i += 1) goal('away', 91 + Math.floor(random() * 29));
  }
  if (fixture.knockout && tied() && fixture.tieBreak !== 'higher-seed') {
      const homeWins = random() < clamp(0.5 + (homePower.attack - awayPower.attack) / 140, 0.3, 0.7);
      const losingScore = 2 + Math.floor(random() * 3);
      penalties = { home: losingScore + (homeWins ? 1 : 0), away: losingScore + (homeWins ? 0 : 1) };
      events.push({ minute: duration, type: 'penalties', text: `Tanda de penaltis: ${penalties.home}–${penalties.away}.` });
  }
  const shotsHome = Math.max(homeGoals, Math.round(xgHome * 5 + random() * 5));
  const shotsAway = Math.max(awayGoals, Math.round(xgAway * 5 + random() * 5));
  for (let minute = 10; minute < duration; minute += 13) {
    events.push({ minute, type: 'chance', side: random() < 0.55 ? 'home' : 'away', text: ['Disparo que detiene el portero.', 'El centro al área lo despeja la defensa.', 'Buena circulación en el centro del campo.', 'La ocasión termina fuera.'][Math.floor(random() * 4)] });
  }
  events.push({ minute: duration, type: 'full-time', text: `Final: ${homeGoals}–${awayGoals}.` });
  events.sort((a, b) => a.minute - b.minute);
  let homeScore = homeGoals + (fixture.aggregateHome || 0);
  let awayScore = awayGoals + (fixture.aggregateAway || 0);
  if (homeScore === awayScore && fixture.awayGoalsRule && (duration <= 90 || fixture.awayGoalsExtraTime !== false)) { homeScore = fixture.awayGoalsHome || 0; awayScore = (fixture.awayGoalsAway || 0) + awayGoals; }
  const winnerId = homeScore > awayScore || (penalties && penalties.home > penalties.away) ? fixture.homeId
    : awayScore > homeScore || penalties ? fixture.awayId : fixture.knockout && fixture.tieBreak === 'higher-seed' ? fixture.tieWinnerId : null;
  const minutes = Object.fromEntries(Object.entries(appearances).map(([id, entry]) => [id, Math.max(0, Math.min(duration, entry.end) - entry.start)]));
  return { fixture, homeGoals, awayGoals, winnerId, penalties, duration, xgHome: +xgHome.toFixed(2), xgAway: +xgAway.toFixed(2),
    shotsHome, shotsAway, possessionHome: Math.round(clamp(50 + (homePower.attack - awayPower.attack) * 0.6 + random() * 10 - 5, 27, 73)),
    events, minutes, homeLineup: home.map((player) => player.id), awayLineup: away.map((player) => player.id),
    homeParticipants: homeParticipants.map((player) => player.id), awayParticipants: awayParticipants.map((player) => player.id) };
}

function applyStats(state, match) {
  const matchDate = match.fixture.date || state.date;
  const healthView = { ...state, date: matchDate };
  for (const side of ['home', 'away']) {
    const ids = side === 'home' ? match.homeParticipants || match.homeLineup : match.awayParticipants || match.awayLineup;
    const conceded = side === 'home' ? match.awayGoals : match.homeGoals;
    const scored = side === 'home' ? match.homeGoals : match.awayGoals;
    ids.forEach((id) => {
      const previous = state.playerStats[id] || emptyStats();
      const goals = match.events.filter((event) => event.type === 'goal' && event.playerId === id).length;
      const assists = match.events.filter((event) => event.type === 'goal' && event.assistId === id).length;
      const isKeeper = indexWorld(state.world).players[id]?.position === 'GK';
      const minutes = match.minutes?.[id] ?? match.duration;
      const starters = side === 'home' ? match.homeLineup : match.awayLineup;
      const start = starters.includes(id) ? 0 : match.events.find((event) => event.type === 'substitution' && event.playerInId === id)?.minute || 0;
      const concededOnPitch = match.events.some((event) => event.type === 'goal' && event.side !== side && event.minute >= start && event.minute < start + minutes);
      const cleanSheet = Number(isKeeper && !(match.goalsAgainstWhileOnPitch ? match.goalsAgainstWhileOnPitch[id] : concededOnPitch) && minutes >= 60);
      state.playerStats[id] = { ...previous, appearances: previous.appearances + 1, goals: previous.goals + goals,
        minutes: (previous.minutes || 0) + minutes,
        assists: previous.assists + assists, cleanSheets: previous.cleanSheets + cleanSheet,
        leagueGoals: previous.leagueGoals + (match.fixture.knockout || match.fixture.divisionPlayoff ? 0 : goals),
        leagueCleanSheets: previous.leagueCleanSheets + (match.fixture.knockout || match.fixture.divisionPlayoff ? 0 : cleanSheet),
        ratingTotal: +(previous.ratingTotal + clamp(6.25 + goals * 0.8 + assists * 0.5 + cleanSheet * 0.45 + (scored > conceded ? 0.35 : -0.1), 3, 10)).toFixed(2) };
    });
  }
  for (const [id, minutes] of Object.entries(match.minutes || {})) {
    const player = indexWorld(state.world).players[id];
    const injury = match.events.find((event) => event.type === 'injury' && event.playerId === id)?.injury;
    state.playerHealth[id] = matchHealth(player, getPlayerHealth(healthView, player), minutes, matchDate, injury);
    if (Number.isFinite(match.conditionAfter?.[id])) state.playerHealth[id].condition = match.conditionAfter[id];
    if (injury && player.clubId === state.clubId) addNews(state, `${player.name}: ${injury.name}, ${injury.daysRemaining} días de baja estimada.`, 'health');
  }
}

function updateTable(table, match) {
  return table.map((previous) => {
    if (previous.clubId !== match.fixture.homeId && previous.clubId !== match.fixture.awayId) return previous;
    const home = previous.clubId === match.fixture.homeId;
    const gf = home ? match.homeGoals : match.awayGoals;
    const ga = home ? match.awayGoals : match.homeGoals;
    return { ...previous, played: previous.played + 1, won: previous.won + Number(gf > ga), drawn: previous.drawn + Number(gf === ga),
      lost: previous.lost + Number(gf < ga), gf: previous.gf + gf, ga: previous.ga + ga,
      gd: previous.gf + gf - previous.ga - ga, points: previous.points + (gf > ga ? 3 : gf === ga ? 1 : 0) };
  });
}

function applyOwnMatch(state, match) {
  if (match.fixture.homeId !== state.clubId && match.fixture.awayId !== state.clubId) return;
  state.lastMatch = match;
  const home = match.fixture.homeId === state.clubId;
  const difference = (home ? 1 : -1) * (match.homeGoals - match.awayGoals);
  state.morale = clamp(state.morale + (difference > 0 ? 4 : difference < 0 ? -4 : 0), 25, 95);
  if (home) {
    const club = indexWorld(state.world).clubs[state.clubId];
    const income = roundMoney(club.rating ** 2 * 38);
    state.finances.budget += income; state.finances.income += income;
  }
  const clubs = indexWorld(state.world).clubs;
  addNews(state, `${clubs[match.fixture.homeId]?.shortName || match.fixture.homeId} ${match.homeGoals}–${match.awayGoals} ${clubs[match.fixture.awayId]?.shortName || match.fixture.awayId}${match.penalties ? ` (pen. ${match.penalties.home}–${match.penalties.away})` : ''}.`, 'match');
}

function choosePowerOfTwo(ids, maximum = 32) {
  const n = 2 ** Math.floor(Math.log2(Math.min(ids.length, maximum)));
  return Number.isFinite(n) && n >= 2 ? ids.slice(0, n) : [];
}

function buildTournaments(state) {
  const index = indexWorld(state.world);
  const competition = index.competitions[index.clubs[state.clubId].competitionId];
  const positionByClub = Object.fromEntries(Object.keys(state.leagues).flatMap((id) => getStandings(state, id).map((row, i) => [row.clubId, i])));
  const sortClubs = (clubs) => clubs.slice().sort((a, b) => positionByClub[a.id] - positionByClub[b.id]
    || (index.competitions[a.competitionId]?.tier || 1) - (index.competitions[b.competitionId]?.tier || 1)
    || b.rating - a.rating || a.id.localeCompare(b.id)).map((club) => club.id);
  const countryClubs = sortClubs(state.world.clubs.filter((club) => index.competitions[club.competitionId]?.simulated !== false
    && index.competitions[club.competitionId]?.country_fifa_code === competition.country_fifa_code));
  const drawRandom = createStream(state.seed, state.year, 'domestic-draw', competition.country_fifa_code);
  for (let i = countryClubs.length - 1; i > 0; i -= 1) {
    const j = Math.floor(drawRandom() * (i + 1));
    [countryClubs[i], countryClubs[j]] = [countryClubs[j], countryClubs[i]];
  }
  const countryIndex = Object.fromEntries((state.world.countries || []).map((country) => [country.fifa, country]));
  const countries = Object.entries(index.countries).filter(([, players]) => players.length >= 11 && players.some((player) => player.position === 'GK'))
    .map(([code, players]) => ({ code, score: pickLineup(players).reduce((sum, player) => sum + player.rating, 0) }))
    .sort((a, b) => b.score - a.score).map(({ code }) => `nation:${code}`);
  const domestic = { id: 'manager-domestic-cup', name: 'Copa nacional', type: 'club', trophyId: 'cup', trophy: competition.cupTrophy,
    remaining: countryClubs, balancedByes: true };
  const confederations = [...new Set(state.world.competitions.map((league) => league.confederation))].filter(Boolean);
  const continental = confederations.map((confederation) => ({
    id: `manager-continental-${confederation}`, name: `Copa continental · ${confederation}`, confederation,
    type: 'club', continental: true, trophyId: 'continental_a',
    remaining: choosePowerOfTwo(sortClubs(state.world.clubs.filter((club) => {
      const league = index.competitions[club.competitionId];
      return league?.confederation === confederation && (league.tier || 1) === 1 && positionByClub[club.id] < 4;
    })), 32),
  }));
  const calendarYear = state.year + 1;
  // Broad cycles are modelled; exceptions, historical qualifying and group formats are not.
  const nationalContinental = confederations.filter((confederation) => {
    if (confederation === 'CAF' || confederation === 'CONCACAF') return calendarYear % 2 === 1;
    if (confederation === 'AFC') return calendarYear % 4 === 3;
    return calendarYear % 4 === 0;
  }).map((confederation) => ({ id: `manager-nations-${confederation}`, name: `Copa de selecciones · ${confederation}`,
    type: 'national', confederation, trophyId: 'continental_nt', remaining: choosePowerOfTwo(countries.filter((id) => countryIndex[id.slice(7)]?.confederation === confederation), 16) }));
  const worldCup = calendarYear % 4 === 2 ? [{ id: 'manager-world-cup', name: 'Mundial de selecciones', type: 'national', trophyId: 'world_cup', remaining: choosePowerOfTwo(countries, 32) }] : [];
  return [domestic, ...continental, ...nationalContinental, ...worldCup]
    .filter((entry) => entry.remaining.length >= 2).map((entry) => ({ ...entry, balancedByes: true, round: 0, winnerId: null, results: [],
      formatNote: 'Eliminatorias simplificadas; clasificación continental por puestos de liga, ciclos generales de selecciones y sin excepciones históricas oficiales.' }));
}

function mutableMatchState(state) {
  return { ...state, leagues: { ...state.leagues }, playerStats: { ...state.playerStats }, finances: { ...state.finances },
    playerHealth: { ...state.playerHealth }, matchPrepared: false, lastMatchDate: state.date,
    activeMatch: null, calendarNextDate: null, lastResults: [], lastError: null, news: state.news.slice() };
}

function finishLeagueRound(state) {
  const next = mutableMatchState(state);
  const activeCompetitionId = indexWorld(state.world).clubs[state.clubId].competitionId;
  const totalRounds = state.leagues[activeCompetitionId].rounds.length;
  for (const [id, previous] of Object.entries(state.leagues)) {
    const targetRound = Math.max(previous.round, previous.rounds.filter((fixtures) => fixtures[0]?.date <= state.date).length);
    let table = previous.table;
    for (let round = previous.round; round < targetRound; round += 1) {
      for (const fixture of previous.rounds[round] || []) {
        const match = state.activeMatch?.fixture.id === fixture.id ? state.activeMatch.report : simulateManagerMatch(next, fixture);
        applyStats(next, match);
        table = updateTable(table, match);
        if (id === activeCompetitionId) next.lastResults.push(match);
        applyOwnMatch(next, match);
      }
    }
    next.leagues[id] = { ...previous, table, round: targetRound };
  }
  const wages = Math.round(wageBill(state) * 52 / totalRounds);
  next.finances.wagesPaid += wages;
  next.finances.operatingReserve -= wages;
  next.round += 1;
  if (next.negotiation?.version !== 2) next.negotiation = null;
  if (next.round >= totalRounds) {
    next.divisionPlan = createDivisionPlayoffs(next);
    next.divisionChanges = next.divisionPlan.movements;
    next.phase = next.divisionPlan.complete ? 'tournaments' : 'playoffs';
    next.tournaments = next.divisionPlan.complete ? buildTournaments(next) : [];
    const position = getStandings(next).findIndex((row) => row.clubId === next.clubId) + 1;
    const prize = roundMoney(indexWorld(next.world).clubs[next.clubId].budget * (0.12 + 0.3 / position));
    next.finances.budget += prize; next.finances.income += prize;
    addNews(next, `Liga terminada en ${position}.º puesto. Premio: ${prize.toLocaleString('es-ES')} €. Comienzan las copas de la simulación.`, 'competition');
    if (next.phase === 'tournaments' && !next.tournaments.length) finishSeason(next);
  }
  return next;
}

function finishTournamentRound(state) {
  const next = mutableMatchState(state);
  const primaryFixture = getNextFixture(state);
  const scheduled = new Set(scheduledTournaments(state).map((tournament) => tournament.id));
  next.tournaments = state.tournaments.map((tournament) => {
    if (tournament.winnerId || !scheduled.has(tournament.id)) return tournament;
    const results = tournamentFixtures(tournament).map((fixture) => {
      const match = state.activeMatch?.fixture.id === fixture.id ? state.activeMatch.report : simulateManagerMatch(next, fixture);
      applyStats(next, match); applyOwnMatch(next, match);
      next.lastResults.push(match);
      return match;
    });
    const { byes } = tournamentPairing(tournament);
    const remaining = tournament.balancedByes ? [...byes, ...results.map((result) => result.winnerId)]
      : [...results.map((result) => result.winnerId), ...byes];
    const winnerId = remaining.length === 1 ? remaining[0] : null;
    if (winnerId === state.clubId) {
      const prize = roundMoney(indexWorld(state.world).clubs[state.clubId].budget * 0.18);
      next.finances.budget += prize; next.finances.income += prize;
      addNews(next, `¡Campeones de ${tournament.name}!`, 'trophy');
    }
    return { ...tournament, round: tournament.round + 1, remaining, winnerId, results: [...tournament.results, ...results.map(({ fixture, homeGoals, awayGoals, winnerId: winner, penalties }) => ({ fixture, homeGoals, awayGoals, winnerId: winner, penalties }))] };
  });
  if (primaryFixture) next.lastMatch = next.lastResults.find((match) => match.fixture.id === primaryFixture.id) || next.lastMatch;
  const continental = next.tournaments.filter((tournament) => tournament.continental);
  if (continental.length && continental.every((tournament) => tournament.winnerId)
    && !next.tournaments.some((tournament) => tournament.id === 'manager-club-world-cup')) {
    const champions = continental.map((tournament) => tournament.winnerId);
    const finalists = continental.flatMap((tournament) => {
      const final = tournament.results[tournament.results.length - 1];
      return [final.fixture.homeId, final.fixture.awayId];
    });
    const participants = [...new Set([...champions, ...finalists])];
    if (participants.length >= 2) {
      // Keep every confederation champion. Byes make the bracket fit without dropping winners.
      next.tournaments.push({ id: 'manager-club-world-cup', name: 'Mundial de clubes', type: 'club', trophyId: 'club_world_cup',
        remaining: participants.slice(0, Math.max(champions.length, 8)), balancedByes: true, round: 0, winnerId: null, results: [],
        formatNote: 'Formato simplificado con campeones continentales y finalistas; no reproduce la ampliación oficial de 2025.' });
      addNews(next, 'Los campeones continentales y finalistas se reúnen en el Mundial de clubes de la simulación.', 'competition');
    }
  }
  if (next.negotiation?.version !== 2) next.negotiation = null;
  if (next.tournaments.every((tournament) => tournament.winnerId)) finishSeason(next);
  return next;
}

function finishPlayoffRound(state) {
  const next = mutableMatchState(state);
  const results = getDivisionPlayoffFixtures(state.divisionPlan).map((fixture) => {
    const match = state.activeMatch?.fixture.id === fixture.id ? state.activeMatch.report : simulateManagerMatch(next, fixture);
    applyStats(next, match); applyOwnMatch(next, match);
    return match;
  });
  next.lastResults = results;
  next.divisionPlan = advanceDivisionPlayoffs(state.divisionPlan, results);
  next.divisionChanges = next.divisionPlan.movements;
  if (next.divisionPlan.complete) {
    next.phase = 'tournaments'; next.tournaments = buildTournaments(next);
    addNews(next, 'Terminada la promoción. Los ascensos y descensos se aplicarán al comenzar la siguiente temporada.', 'competition');
    if (!next.tournaments.length) finishSeason(next);
  }
  return next;
}

function finishMatchday(state) {
  return state.phase === 'season' ? finishLeagueRound(state) : state.phase === 'playoffs' ? finishPlayoffRound(state) : finishTournamentRound(state);
}

function finishSeason(state) {
  state.phase = 'complete';
  const index = indexWorld(state.world);
  const candidates = state.world.players.filter((player) => (state.playerStats[player.id]?.appearances || 0) > 0);
  const positionByClub = Object.fromEntries(Object.keys(state.leagues).flatMap((id) => getStandings(state, id).map((row, i) => [row.clubId, i])));
  const score = (player, kind) => {
    const stats = state.playerStats[player.id];
    if (kind === 'golden-boot') return stats.leagueGoals;
    if (kind === 'golden-glove') return player.position === 'GK' ? stats.leagueCleanSheets : -1;
    const club = index.clubs[player.clubId];
    const strength = index.competitions[club?.competitionId]?.strength || 1;
    const position = positionByClub[player.clubId];
    return (stats.goals * 3 + stats.assists * 2 + stats.cleanSheets * 1.7 + stats.ratingTotal * 0.32) * (0.8 + strength * 0.12) + (position === 0 ? 15 : 0);
  };
  state.awards = [
    ['ballon-dor', 'Balón de Oro', 'season-mvp'], ['golden-boot', 'Bota de Oro', 'golden-boot'], ['golden-glove', 'Guante de Oro', 'golden-glove'],
  ].map(([id, name, trophyKey]) => {
    const winner = candidates.slice().sort((a, b) => score(b, id) - score(a, id) || a.id.localeCompare(b.id))[0];
    return { id, name, trophyKey, playerId: winner?.id || null, clubId: winner?.clubId || null, value: winner ? +score(winner, id).toFixed(1) : 0 };
  });
  const championId = getStandings(state)[0]?.clubId;
  state.history = [...state.history, { year: state.year, leagueId: index.clubs[state.clubId].competitionId, championId,
    position: getStandings(state).findIndex((entry) => entry.clubId === state.clubId) + 1,
    awards: state.awards.map((award) => ({ ...award, playerName: index.players[award.playerId]?.name })),
    titles: [...(championId === state.clubId ? ['Liga'] : []), ...state.tournaments.filter((tournament) => tournament.winnerId === state.clubId).map((tournament) => tournament.name)] }];
  addNews(state, 'Temporada completada. Ya se han entregado los premios y puedes comenzar el siguiente curso.', 'trophy');
}

function advanceSeason(state) {
  const year = state.year + 1;
  const preseasonDate = `${year}-08-17` > addDays(state.date, 14) ? `${year}-08-17` : addDays(state.date, 14);
  const players = state.world.players.map((player) => {
    if (player.retired) return player;
    const random = createStream(state.seed, year, 'development', player.id);
    const age = getPlayerAge(player, preseasonDate, year);
    const peak = player.position === 'GK' ? 32 : 28;
    const development = age < peak ? Math.min(player.potential - player.rating, (player.potential - player.rating) * (0.09 + random() * 0.17))
      : age > peak + 1 ? -(0.5 + random() * (age > 34 ? 3.5 : 1.8)) : random() - 0.5;
    const rating = Math.round(clamp(player.rating + development, 25, 97));
    const retired = Boolean(player.emergency) || age >= 41 || (age >= (player.position === 'GK' ? 38 : 35) && random() < (age - 33) * 0.11);
    return { ...player, age, rating, retired, value: roundMoney(Math.max(50000, player.value * (rating / player.rating) ** 2 * (age > 29 ? 0.86 : 1.08))) };
  });
  for (const club of state.world.clubs) {
    if (indexWorld(state.world).competitions[club.competitionId]?.simulated === false) continue;
    const roster = players.filter((player) => player.clubId === club.id && !player.retired);
    const missing = Math.max(0, 22 - roster.length, 2 - roster.filter((player) => player.position === 'GK').length);
    for (let i = 0; i < missing; i += 1) {
      const random = createStream(state.seed, year, club.id, 'academy', i);
      const position = roster.filter((player) => player.position === 'GK').length < 2 ? 'GK'
        : ['DF', 'DF', 'MF', 'MF', 'FW'][i % 5];
      const rating = Math.round(clamp(club.rating - 25 + random() * 13, 30, 72));
      const player = { id: `academy-${club.id}-${year}-${i}`, clubId: club.id, name: `Canterano ${year}-${i + 1} · ${club.shortName || club.name}`,
        birthYear: year - 17, age: 17, nationality: club.country || indexWorld(state.world).competitions[club.competitionId].country_fifa_code,
        position, rating, potential: Math.round(clamp(rating + 8 + random() * 17, rating, 92)), value: roundMoney(rating * rating * 90),
        wage: Math.round(rating * 35), real: false, source: 'Cantera ficticia generada por la simulación', retired: false };
      players.push(player); roster.push(player);
    }
  }
  let world = applyDivisionMovements({ ...state.world, players, year }, state.divisionPlan?.movements || []);
  const movements = new Map((state.divisionPlan?.movements || []).map((entry) => [entry.clubId, entry]));
  world = synchronizeRosters({ ...world, clubs: world.clubs.map((club) => {
    const change = movements.get(club.id);
    if (!change) return club;
    const promoted = indexWorld(state.world).competitions[change.toId].tier < indexWorld(state.world).competitions[change.fromId].tier;
    return { ...club, budget: roundMoney(club.budget * (promoted ? 1.4 : 0.75)) };
  }) });
  const squad = players.filter((player) => player.clubId === state.clubId && !player.retired);
  const bill = clubWageBill({ ...state, world });
  const movement = (state.divisionPlan?.movements || []).find((entry) => entry.clubId === state.clubId);
  const oldTier = indexWorld(state.world).competitions[indexWorld(state.world).clubs[state.clubId].competitionId]?.tier || 1;
  const newTier = indexWorld(world).competitions[indexWorld(world).clubs[state.clubId].competitionId]?.tier || 1;
  const wageBudget = Math.max(bill + getRecruitmentFinances(state).reservedWages, Math.round(state.finances.wageBudget * (newTier < oldTier ? 1.3 : newTier > oldTier ? 0.8 : 1)), Math.round(bill * (newTier > oldTier ? 1.05 : 1.3)));
  const grant = Math.round(indexWorld(world).clubs[state.clubId].budget * 0.55);
  const offseasonDays = daysBetween(state.date, preseasonDate);
  const next = { ...state, year, season: state.season + 1, world, leagues: makeLeagues(world, preseasonDate), round: 0, phase: 'season',
    date: preseasonDate, seasonStartDate: preseasonDate, previousDate: null, matchPrepared: false, lastMatchDate: null, calendarNextDate: null,
    playerHealth: Object.fromEntries(Object.keys(state.playerHealth || {}).map((id) => [id, {
      ...recoverHealth(getPlayerHealth(state, indexWorld(state.world).players[id]), offseasonDays, 'recovery'), lastUpdatedDate: preseasonDate,
    }])),
    divisionPlan: null, divisionChanges: state.divisionPlan?.movements || [],
    lineup: [], autoLineup: true, playerStats: {}, activeMatch: null,
    lastMatch: null, lastResults: [], tournaments: [], awards: [], scoutReports: state.scoutReports, negotiation: state.negotiation?.version === 2 ? state.negotiation : null,
    finances: { ...state.finances, budget: state.finances.budget + grant, openingBudget: state.finances.budget, wageBudget, income: grant, spent: 0, wagesPaid: 0, operatingReserve: wageBudget * 52 },
    morale: clamp(state.morale + 5, 45, 85), pressRound: null, lastError: null };
  next.lineup = pickLineup(squad, state.tactics.formation, next).map((player) => player.id);
  if (movement) addNews(next, `${newTier < oldTier ? 'Ascenso' : 'Descenso'}: jugarás en ${indexWorld(world).competitions[indexWorld(world).clubs[state.clubId].competitionId].name}. Se revisan los ingresos previstos y el margen salarial.`, 'competition');
  addNews(next, `Comienza ${year}/${year + 1}. Los jugadores evolucionan y se incorporan canteranos ficticios; los fichajes reales futuros no se importan.`, 'season');
  return progressRecruitmentToDate(next, next.date);
}

function scout(state, action) {
  const maxAge = clamp(Number(action.maxAge) || (action.focus === 'first-team' ? 34 : 21), 16, 45);
  const country = action.country && action.country !== 'all' ? String(action.country) : null;
  const cost = country ? 60000 : 110000;
  if (getRecruitmentFinances(state).availableBudget < cost) return fail(state, 'No hay presupuesto suficiente para esta misión de ojeo.');
  const seen = new Set(state.scoutReports.map((report) => report.playerId));
  const candidates = state.world.players.filter((player) => !player.retired && !player.emergency && player.clubId !== state.clubId
    && getPlayerAge(player, state.date, state.year) >= 16 && getPlayerAge(player, state.date, state.year) <= maxAge
    && (!country || player.nationality === country) && !seen.has(player.id));
  const random = createStream(state.seed, state.year, 'scouting', state.scoutReports.length, country, maxAge);
  const shortlist = candidates.map((player) => ({ player, rank: player.potential * 0.6 + player.rating * 0.4 + random() * 18 }))
    .sort((a, b) => b.rank - a.rank).slice(0, 3).map(({ player }) => player);
  if (!shortlist.length) return fail(state, 'No quedan jugadores que cumplan esos filtros. Prueba otra región o edad.');
  const reports = shortlist.map((player, i) => ({ id: `${state.year}:${player.id}`, playerId: player.id, scoutedYear: state.year,
    cost: i === 0 ? cost : 0, confidence: player.real ? 'Media · datos de época' : 'Estimación de simulación',
    potentialMin: Math.max(player.rating, player.potential - 6), potentialMax: Math.min(99, player.potential + 5),
    recommendation: player.rating > indexWorld(state.world).clubs[state.clubId].rating - 5 ? 'Puede ayudar al primer equipo' : 'Proyecto para desarrollar',
    real: player.real, age: getPlayerAge(player, state.date, state.year) }));
  const next = { ...state, lastError: null, scoutReports: [...reports, ...state.scoutReports].slice(0, 90),
    finances: { ...state.finances, budget: state.finances.budget - cost, spent: state.finances.spent + cost } };
  addNews(next, `El ojeador presenta ${reports.length} informes. Coste de la misión: ${cost.toLocaleString('es-ES')} €.`, 'scout');
  return next;
}

function negotiate(state, action) {
  if (!isTransferWindowOpen(state)) return fail(state, 'El mercado está cerrado. La simulación admite fichajes en julio, agosto, enero y al finalizar la temporada.');
  const player = indexWorld(state.world).players[action.playerId];
  if (!player || player.retired || player.emergency || player.clubId === state.clubId) return fail(state, 'Ese jugador no está disponible para fichar; las reservas de emergencia no son transferibles.');
  if (activeLoan(state, player.id)) return fail(state, 'No se puede comprar un cedido por el flujo heredado.');
  const registrationError = transferRegistrationError(state, player);
  if (registrationError) return fail(state, registrationError);
  const fee = Number(action.fee);
  const wage = Number(action.wage);
  if (!Number.isFinite(fee) || !Number.isFinite(wage) || fee < 0 || wage <= 0) return fail(state, 'Introduce una oferta y un salario válidos.');
  if (fee > getRecruitmentFinances(state).availableBudget || wage > getRecruitmentFinances(state).availableWages) return fail(state, 'La oferta supera tu presupuesto de fichajes o tu límite salarial semanal.');
  const random = createStream(state.seed, state.year, 'negotiation', player.id);
  const askingFee = roundMoney(player.value * (1.02 + random() * 0.23));
  const askingWage = Math.round(player.wage * (1.08 + random() * 0.2));
  const previous = state.negotiation?.playerId === player.id ? state.negotiation : null;
  const attempts = (previous?.attempts || 0) + 1;
  const acceptable = fee >= askingFee * 0.92 && wage >= askingWage;
  const rejected = !acceptable && (attempts >= 3 || fee < askingFee * 0.48 || wage < askingWage * 0.55);
  const status = acceptable ? 'accepted' : rejected ? 'rejected' : 'counter';
  const message = acceptable ? 'Club y jugador aceptan. Confirma la contratación para cerrar el acuerdo.'
    : rejected ? 'La negociación se ha roto. La propuesta está demasiado lejos de lo solicitado.'
      : 'El club y el agente presentan una contraoferta. Puedes aceptarla o mejorar tu propuesta.';
  return { ...state, lastError: null, negotiation: { playerId: player.id, fee: acceptable ? Math.round(fee) : askingFee,
    wage: acceptable ? Math.round(wage) : askingWage, offeredFee: fee, offeredWage: wage, status, attempts,
    injury: getPlayerHealth(state, player).injury, message: message + (getPlayerHealth(state, player).injury ? ` Informe médico: ${getPlayerHealth(state, player).injury.daysRemaining} días de baja.` : '') } };
}

function acceptTransfer(state) {
  if (!isTransferWindowOpen(state)) return fail(state, 'El mercado de fichajes está cerrado.');
  const negotiation = state.negotiation;
  if (!negotiation || !['accepted', 'counter'].includes(negotiation.status)) return fail(state, 'Necesitas una oferta aceptada o una contraoferta del club.');
  const player = indexWorld(state.world).players[negotiation.playerId];
  if (!player || player.retired || player.emergency || player.clubId === state.clubId) return fail(state, 'El jugador ya no está disponible.');
  if (activeLoan(state, player.id)) return fail(state, 'No se puede comprar un cedido por el flujo heredado.');
  if (!Number.isFinite(negotiation.fee) || negotiation.fee < 0 || !Number.isFinite(negotiation.wage) || negotiation.wage <= 0) return fail(state, 'Las condiciones económicas de la negociación no son válidas.');
  const registrationError = transferRegistrationError(state, player);
  if (registrationError) return fail(state, registrationError);
  if (negotiation.fee > getRecruitmentFinances(state).availableBudget || negotiation.wage > getRecruitmentFinances(state).availableWages) return fail(state, 'No puedes financiar esa contraoferta con el presupuesto actual.');
  if ((state.contractRights || []).some((right) => right.playerId === player.id && right.status === 'active')) {
    const next = permanentTransfer(state, { id: `legacy-buy:${player.id}:${state.date}`, playerId: player.id, fromClubId: player.clubId,
      toClubId: state.clubId, fee: negotiation.fee, wage: negotiation.wage, signingBonus: 0, joinDate: state.date });
    return { ...next, negotiation: null, lastError: null };
  }
  const world = synchronizeRosters({ ...state.world, players: state.world.players.map((entry) => entry.id === player.id ? { ...entry, clubId: state.clubId, wage: negotiation.wage } : entry) });
  const transfer = { playerId: player.id, fromClubId: player.clubId, toClubId: state.clubId, fee: negotiation.fee, wage: negotiation.wage, year: state.year, date: state.date };
  const next = { ...state, world, negotiation: null, lastError: null, transfers: [...state.transfers, transfer],
    playerHealth: { ...state.playerHealth, [player.id]: getPlayerHealth(state, player) },
    finances: { ...state.finances, budget: state.finances.budget - negotiation.fee, spent: state.finances.spent + negotiation.fee } };
  addNews(next, `${player.name} ficha por ${negotiation.fee.toLocaleString('es-ES')} € y ${negotiation.wage.toLocaleString('es-ES')} €/semana.`, 'transfer');
  return next;
}

function transferRegistrationError(state, player) {
  const reserved = registrationProblem(state, player, state.clubId);
  if (reserved) return reserved;
  const squad = indexWorld(state.world).squads[state.clubId] || [];
  if (squad.length >= 80) return 'La plantilla alcanza el máximo de 80 jugadores de la simulación.';
  if (getPlayerAge(player, state.date, state.year) >= 21 && squad.filter((entry) => getPlayerAge(entry, state.date, state.year) >= 21).length >= 30)
    return 'La simulación admite 30 jugadores de 21 años o más; los sub-21 no ocupan esas plazas. Vende un sénior antes de incorporar otro.';
  return null;
}

function sellPlayer(state, action) {
  if (!isTransferWindowOpen(state)) return fail(state, 'El mercado de fichajes está cerrado.');
  const index = indexWorld(state.world);
  const player = index.players[action.playerId];
  const squad = getSquad(state);
  if (!player || player.clubId !== state.clubId || player.retired) return fail(state, 'El jugador no pertenece a tu plantilla.');
  if (player.emergency) return fail(state, 'Las reservas de emergencia son temporales y no se pueden vender.');
  if (activeLoan(state, player.id)) return fail(state, 'No puedes vender un jugador con una cesión vigente.');
  if (squad.length <= 16 || (player.position === 'GK' && squad.filter((entry) => entry.position === 'GK').length <= 2)) return fail(state, 'Necesitas mantener al menos 16 jugadores y dos porteros.');
  const buyer = state.world.clubs.filter((club) => club.id !== state.clubId && club.budget >= player.value * 0.8 && Math.abs(club.rating - player.rating) < 12)
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  if (!buyer) return fail(state, 'Por ahora no hay un club comprador para este jugador.');
  const fee = roundMoney(player.value * 0.8);
  if ((state.contractRights || []).some((right) => right.playerId === player.id && right.status === 'active')) {
    return { ...permanentTransfer(state, { id: `legacy-sale:${player.id}:${state.date}`, playerId: player.id, fromClubId: state.clubId,
      toClubId: buyer.id, fee, signingBonus: 0, joinDate: state.date }), lastError: null };
  }
  const world = synchronizeRosters({ ...state.world, players: state.world.players.map((entry) => entry.id === player.id ? { ...entry, clubId: buyer.id } : entry) });
  const next = { ...state, world, lastError: null, lineup: pickLineup(indexWorld(world).squads[state.clubId], state.tactics.formation, state).map((entry) => entry.id),
    playerHealth: { ...state.playerHealth, [player.id]: getPlayerHealth(state, player) },
    finances: { ...state.finances, budget: state.finances.budget + fee, income: state.finances.income + fee },
    transfers: [...state.transfers, { playerId: player.id, fromClubId: state.clubId, toClubId: buyer.id, fee, year: state.year, date: state.date }] };
  addNews(next, `${player.name} se marcha a ${buyer.name} por ${fee.toLocaleString('es-ES')} €.`, 'transfer');
  return next;
}

export function managerReducer(state, action) {
  if (!state || !action || typeof action.type !== 'string') return state;
  if (state.activeMatch && !['ADVANCE_MATCH', 'FINISH_MATCH', 'SET_MATCH_TACTICS', 'SUBSTITUTE_PLAYER', 'SET_MATCH_AUTOSUBS'].includes(action.type)) return fail(state, 'Termina el partido en curso antes de cambiar la carrera.');
  switch (action.type) {
    case 'ADVANCE_CALENDAR': return advanceCalendar(state, action);
    case 'OPEN_NEGOTIATION': return openNegotiation(state, action);
    case 'OFFER_CLUB': return offerClub(state, action);
    case 'ACCEPT_CLUB_COUNTER': return offerClub(state, action, true);
    case 'OFFER_CONTRACT': return offerContract(state, action);
    case 'ACCEPT_CONTRACT_COUNTER': return offerContract(state, action, true);
    case 'COMPLETE_TRANSFER': return completeTransfer(settleCpuFixturesBefore(state, state.date), action);
    case 'CANCEL_NEGOTIATION': return cancelNegotiation(state);
    case 'TRIGGER_RELEASE_CLAUSE':
    case 'TRIGGER_BUYBACK': return triggerContractClause(state, action);
    case 'OPEN_LOAN_NEGOTIATION': return openLoanNegotiation(state, action);
    case 'OFFER_LOAN_TERMS': return offerLoanTerms(state, action);
    case 'ACCEPT_LOAN_COUNTER': return offerLoanTerms(state, action, true);
    case 'COMPLETE_LOAN': return completeLoan(settleCpuFixturesBefore(state, state.date), action);
    case 'CANCEL_LOAN_NEGOTIATION': return cancelLoanNegotiation(state);
    case 'EXERCISE_LOAN_OPTION': return exerciseLoanOption(settleCpuFixturesBefore(state, state.date), action);
    case 'OPEN_CONTRACT_RENEWAL': return openContractRenewal(state, action);
    case 'OFFER_RENEWAL': return offerRenewal(state, action);
    case 'ACCEPT_RENEWAL_COUNTER': return offerRenewal(state, action, true);
    case 'COMPLETE_RENEWAL': return completeRenewal(state);
    case 'CANCEL_RENEWAL': return { ...state, renewalNegotiation: null, lastError: null };
    case 'LIST_FOR_TRANSFER': return listForTransfer(state, action);
    case 'UNLIST_TRANSFER': return unlistTransfer(state, action);
    case 'RESPOND_TRANSFER_OFFER': return respondTransferOffer(action.decision === 'accept' ? settleCpuFixturesBefore(state, state.date) : state, action);
    case 'START_SCOUTING': return startScouting(state, action);
    case 'CANCEL_SCOUTING': return cancelScouting(state, action);
    case 'TOGGLE_SHORTLIST': return toggleShortlist(state, action);
    case 'REFRESH_INITIAL_DATA': return refreshInitialManagerCareer(state);
    case 'SET_TRAINING': {
      if (!TRAINING_INTENSITIES.includes(action.intensity)) return fail(state, 'Selecciona recuperación, equilibrado o intensivo.');
      if (action.intensity === state.trainingIntensity) return { ...state, lastError: null };
      const playerHealth = { ...state.playerHealth };
      // Materialize recovery under the old plan before changing it, so switching
      // training never retroactively changes a substitute's previous rest days.
      for (const player of indexWorld(state.world).squads[state.clubId] || []) playerHealth[player.id] = getPlayerHealth(state, player);
      return { ...state, trainingIntensity: action.intensity, playerHealth, lastError: null };
    }
    case 'SET_TACTICS': {
      const changes = action.tactics || action;
      const formation = changes.formation || state.tactics.formation;
      const mentality = changes.mentality || state.tactics.mentality;
      const pressing = changes.pressing ?? state.tactics.pressing ?? 'balanced';
      const instructions = { ...normalizeTacticalInstructions(state.tactics), ...Object.fromEntries(TACTICAL_KEYS.filter((key) => changes[key] !== undefined).map((key) => [key, changes[key]])) };
      if (!FORMATIONS.includes(formation) || !MENTALITIES.includes(mentality) || !['low', 'balanced', 'high'].includes(pressing)
        || !validateTacticalInstructions(instructions)) return fail(state, 'Esa táctica no está disponible.');
      const lineup = formation !== state.tactics.formation ? pickLineup(getSquad(state), formation, state).map((player) => player.id) : state.lineup;
      return { ...state, tactics: { formation, mentality, pressing, ...instructions }, lineup, autoLineup: formation !== state.tactics.formation ? true : state.autoLineup, lastError: null };
    }
    case 'AUTO_LINEUP': return { ...state, lineup: pickLineup(getSquad(state), state.tactics.formation, state).map((player) => player.id), autoLineup: true, lastError: null };
    case 'TOGGLE_STARTER': {
      if (!getSquad(state).some((player) => player.id === action.playerId)) return fail(state, 'Ese jugador no pertenece a tu plantilla.');
      const selected = state.lineup.includes(action.playerId);
      if (!selected && !getPlayerHealth(state, indexWorld(state.world).players[action.playerId]).available) return fail(state, 'Un jugador lesionado no puede entrar en el once.');
      if (!selected && state.lineup.length >= 11) return fail(state, 'Quita un titular antes de añadir otro.');
      return { ...state, lineup: selected ? state.lineup.filter((id) => id !== action.playerId) : [...state.lineup, action.playerId], autoLineup: false, lastError: null };
    }
    case 'PLAY_MATCH':
    case 'NEXT_TOURNAMENT_ROUND': {
      if (state.phase === 'complete') return fail(state, 'La temporada ha terminado. Inicia la siguiente.');
      const prepared = prepareMatchday(state);
      const fixture = getNextFixture(prepared);
      if (fixture) {
        const selected = getSquad(prepared).filter((player) => player.selected && player.available);
        if (selected.length !== 11 || selected.filter((player) => player.position === 'GK').length !== 1) return fail(state, 'La alineación debe incluir once jugadores y exactamente un portero.');
      }
      if (action.mode === 'deep' && fixture) {
        return { ...prepared, lastError: null, activeMatch: beginLiveMatch(prepared, fixture) };
      }
      return finishMatchday(prepared);
    }
    case 'ADVANCE_MATCH':
    case 'FINISH_MATCH': {
      if (!state.activeMatch) return state;
      const finishing = action.type === 'FINISH_MATCH';
      const minutes = finishing ? 120 : clamp(Number.isFinite(action.minutes) ? Math.floor(action.minutes) : 15, 1, 15);
      const activeMatch = advanceLiveMatch(state.activeMatch, minutes, finishing);
      if (activeMatch.complete) return finishMatchday({ ...state, activeMatch: { ...activeMatch, report: liveMatchReport(activeMatch) } });
      return { ...state, lastError: null, activeMatch };
    }
    case 'SET_MATCH_TACTICS':
    case 'SUBSTITUTE_PLAYER':
    case 'SET_MATCH_AUTOSUBS': {
      if (!state.activeMatch) return fail(state, 'No hay un partido en curso.');
      try {
        const activeMatch = action.type === 'SET_MATCH_TACTICS' ? changeLiveTactics(state.activeMatch, action)
          : action.type === 'SET_MATCH_AUTOSUBS' ? setLiveAutoSubstitutions(state.activeMatch, action.enabled)
          : substituteLivePlayer(state.activeMatch, action.outId, action.inId);
        return { ...state, activeMatch, lastError: null };
      } catch (error) { return fail(state, error.message); }
    }
    case 'SCOUT': return scout(state, action);
    case 'NEGOTIATE': return negotiate(state, action);
    case 'ACCEPT_TRANSFER': return state.negotiation?.version === 2 ? completeTransfer(settleCpuFixturesBefore(state, state.date), action) : acceptTransfer(state);
    case 'REJECT_TRANSFER': return cancelNegotiation(state);
    case 'SELL_PLAYER': return sellPlayer(state, action);
    case 'PRESS': {
      const key = `${state.date}:${state.phase}:${state.round}:${state.tournaments[0]?.round || 0}`;
      if (state.pressRound === key) return fail(state, 'Ya has atendido a la prensa antes de esta jornada.');
      if (!['calm', 'ambitious', 'critical'].includes(action.tone)) return fail(state, 'Elige una respuesta para la prensa.');
      const position = getManagerSummary(state).position;
      const change = action.tone === 'calm' ? 2 : action.tone === 'ambitious' ? (position === null ? 2 : position <= 4 ? 5 : -2) : (state.morale > 78 ? -2 : -5);
      const next = { ...state, morale: clamp(state.morale + change, 25, 95), pressRound: key, lastError: null };
      addNews(next, `${action.tone === 'calm' ? '«Confiamos en el trabajo diario del equipo».' : action.tone === 'ambitious' ? '«Vamos a luchar por los títulos».' : '«El equipo debe rendir mucho más».'} Moral ${change > 0 ? '+' : ''}${change}.`, 'press');
      return next;
    }
    case 'NEXT_SEASON': return state.phase === 'complete' ? advanceSeason(state) : fail(state, 'Completa la liga y las copas antes de avanzar de temporada.');
    default: return state;
  }
}

/** Version 2 freezes the career's world: future data releases cannot rewrite it. */
export function serializeManagerCareer(state) {
  const { world, leagues, activeMatch, lastResults, playerHealth, playerStats, ...career } = state;
  const savedLeagues = Object.fromEntries(Object.entries(leagues).map(([id, league]) => [id, { round: league.round, table: league.table }]));
  return JSON.stringify({ ...career, version: MANAGER_SAVE_VERSION, playerChanges: [], leagues: savedLeagues,
    packedWorld: cachedSnapshot(world), packedHealth: cachedSnapshot(playerHealth), packedStats: cachedSnapshot(playerStats),
    activeMatch: activeMatch ? { fixture: activeMatch.fixture, minute: activeMatch.minute, modelVersion: activeMatch.modelVersion,
      actions: activeMatch.actions, legacyMinute: activeMatch.legacyMinute } : null });
}

function cachedSnapshot(value) {
  if (!snapshotCache.has(value)) snapshotCache.set(value, packSnapshot(value));
  return snapshotCache.get(value);
}

export function restoreManagerCareer(raw) {
  const input = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!input || ![1, MANAGER_SAVE_VERSION].includes(input.version)) throw new Error('La partida pertenece a otra versión.');
  const legacy = input.version === 1;
  const snapshot = legacy ? null : unpackSnapshot(input.packedWorld);
  const saved = { ...input, playerHealth: legacy ? {} : unpackSnapshot(input.packedHealth),
    playerStats: legacy ? Object.fromEntries(Object.entries(input.playerStats || {}).map(([id, stats]) => [id, { ...stats, minutes: stats.appearances * 90 }])) : unpackSnapshot(input.packedStats) };
  if (!saved || !Number.isInteger(saved.startYear)
    || !Number.isInteger(saved.year) || saved.year < saved.startYear || saved.year > saved.startYear + 150
    || saved.season !== saved.year - saved.startYear + 1 || typeof saved.seed !== 'string' || typeof saved.managerName !== 'string'
    || !Number.isInteger(saved.round) || saved.round < 0 || !Array.isArray(saved.playerChanges)
    || !['season', 'playoffs', 'tournaments', 'complete'].includes(saved.phase) || typeof saved.clubId !== 'string'
    || !saved.finances || !Number.isFinite(saved.finances.budget) || saved.finances.budget < 0
    || !Number.isFinite(saved.finances.wageBudget) || saved.finances.wageBudget < 0
    || !Array.isArray(saved.lineup) || saved.lineup.length > 11 || new Set(saved.lineup).size !== saved.lineup.length
    || !FORMATIONS.includes(saved.tactics?.formation) || !MENTALITIES.includes(saved.tactics?.mentality)
    || !validateTacticalInstructions(saved.tactics) || (saved.tactics.pressing !== undefined && !['low', 'balanced', 'high'].includes(saved.tactics.pressing))
    || !saved.leagues || !saved.playerStats || !Array.isArray(saved.scoutReports) || !Array.isArray(saved.history)
    || !Array.isArray(saved.transfers) || !Array.isArray(saved.news) || !Array.isArray(saved.tournaments) || !Array.isArray(saved.awards)
    || ['spent', 'income', 'wagesPaid', 'operatingReserve'].some((key) => !Number.isFinite(saved.finances[key]) || saved.finances[key] < -100)) {
    throw new Error('La partida no tiene un formato válido o pertenece a otra versión.');
  }
  const baseWorld = legacy ? getLegacyWorld(saved.startYear) : snapshot;
  if (!baseWorld || !Array.isArray(baseWorld.clubs) || !Array.isArray(baseWorld.players) || !Array.isArray(baseWorld.competitions)
    || !baseWorld.clubs.length || baseWorld.clubs.length > 10000 || baseWorld.players.length > 250000
    || new Set(baseWorld.clubs.map((club) => club.id)).size !== baseWorld.clubs.length
    || new Set(baseWorld.players.map((player) => player.id)).size !== baseWorld.players.length
    || baseWorld.clubs.some((club) => !baseWorld.competitions.some((entry) => entry.id === club.competitionId))) throw new Error('El catálogo guardado no es válido.');
  const base = createManagerCareer({ year: saved.startYear, clubId: saved.clubId, managerName: saved.managerName, seed: saved.seed, world: baseWorld });
  const allowedClubs = new Set(base.world.clubs.map((club) => club.id));
  const originalPlayers = Object.fromEntries(base.world.players.map((player) => [player.id, player]));
  const changes = new Map();
  for (const patch of (legacy ? saved.playerChanges : baseWorld.players)) {
    const player = patch && { ...originalPlayers[patch.id], ...patch };
    if (!player || typeof player.id !== 'string' || changes.has(player.id) || !allowedClubs.has(player.clubId)
      || !['GK', 'DF', 'MF', 'FW'].includes(player.position) || typeof player.name !== 'string'
      || !Number.isFinite(player.rating) || player.rating < 1 || player.rating > 99
      || !Number.isFinite(player.potential) || player.potential < 1 || player.potential > 99 || !Number.isFinite(player.value) || player.value < 0
      || !Number.isFinite(player.wage) || player.wage < 0 || !Number.isInteger(player.birthYear) || player.birthYear > saved.year) {
      throw new Error('La plantilla guardada contiene datos inválidos.');
    }
    changes.set(player.id, player);
  }
  const players = base.world.players.map((player) => { const updated = changes.get(player.id) || player; changes.delete(player.id); return updated; });
  players.push(...changes.values());
  const world = synchronizeRosters({ ...base.world, year: saved.year, players });
  const leagues = makeLeagues(world, saved.seasonStartDate || `${saved.year}-08-17`);
  for (const [id, league] of Object.entries(leagues)) {
    const prior = saved.leagues[id];
    const expectedAppearances = new Map(league.clubIds.map((clubId) => [clubId, 0]));
    if (Number.isInteger(prior?.round)) for (const fixture of league.rounds.slice(0, prior.round).flat()) {
      expectedAppearances.set(fixture.homeId, expectedAppearances.get(fixture.homeId) + 1);
      expectedAppearances.set(fixture.awayId, expectedAppearances.get(fixture.awayId) + 1);
    }
    if (!prior || !Number.isInteger(prior.round) || prior.round < 0 || prior.round > league.rounds.length
      || !Array.isArray(prior.table) || prior.table.length !== league.clubIds.length
      || new Set(prior.table.map((row) => row.clubId)).size !== league.clubIds.length
      || prior.table.some((row) => !league.clubIds.includes(row.clubId)
        || ['played', 'won', 'drawn', 'lost', 'gf', 'ga', 'points'].some((key) => !Number.isInteger(row[key]) || row[key] < 0)
        || row.played !== row.won + row.drawn + row.lost || row.points !== row.won * 3 + row.drawn
        || row.played !== expectedAppearances.get(row.clubId))
      || prior.table.reduce((sum, row) => sum + row.gf - row.ga, 0) !== 0
      || prior.table.reduce((sum, row) => sum + row.won - row.lost, 0) !== 0) {
      throw new Error('La clasificación guardada contiene datos inválidos.');
    }
    leagues[id] = { ...league, round: prior.round, table: prior.table };
  }
  const { playerChanges, activeMatch, packedWorld, packedHealth, packedStats, ...career } = saved;
  const restored = { ...base, ...career, version: MANAGER_SAVE_VERSION, world, leagues, activeMatch: null, lastResults: [] };
  restored.finances = { ...restored.finances, openingBudget: saved.finances.openingBudget === undefined
    ? saved.finances.budget - saved.finances.income + saved.finances.spent : saved.finances.openingBudget };
  if (!Number.isFinite(restored.finances.openingBudget) || restored.finances.openingBudget < 0
    || Math.abs(restored.finances.budget - restored.finances.openingBudget - restored.finances.income + restored.finances.spent) > 1)
    throw new Error('El saldo guardado no cuadra con los ingresos y gastos.');
  restored.seasonStartDate = saved.seasonStartDate || `${saved.year}-08-17`;
  if (legacy) {
    restored.migratedFromVersion = 1;
    const total = leagues[indexWorld(world).clubs[saved.clubId].competitionId].rounds.length;
    restored.date = addDays(`${saved.year}-08-17`, Math.round((saved.round + Number(Boolean(activeMatch))) * 266 / total));
    restored.previousDate = activeMatch ? addDays(`${saved.year}-08-17`, Math.round(saved.round * 266 / total)) : null;
    restored.matchPrepared = Boolean(activeMatch);
    restored.lastMatchDate = saved.round ? restored.date : null;
    restored.divisionPlan = null;
    restored.divisionChanges = [];
    addNews(restored, 'Partida v1 recuperada con su catálogo original. Se activa la preparación física; las divisiones añadidas se incorporan solo a carreras nuevas.', 'club');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(restored.date) || !Number.isFinite(Date.parse(restored.date))
    || !TRAINING_INTENSITIES.includes(restored.trainingIntensity) || !restored.playerHealth || typeof restored.playerHealth !== 'object') throw new Error('El calendario o la preparación guardada no son válidos.');
  const index = indexWorld(world);
  if (restored.divisionPlan) {
    const plan = restored.divisionPlan;
    const validPlan = plan.version === 1 && plan.year === restored.year && typeof plan.complete === 'boolean'
      && Array.isArray(plan.rules) && Array.isArray(plan.movements) && Array.isArray(plan.playoffs)
      && Array.isArray(plan.notes) && plan.rules.every((rule) => index.competitions[rule.upperId] && index.competitions[rule.lowerId])
      && plan.playoffs.every((tournament) => tournament && typeof tournament.id === 'string' && typeof tournament.complete === 'boolean'
        && tournament.rule && tournament.ranking && Array.isArray(tournament.entrantIds) && Array.isArray(tournament.results)
        && index.clubs[tournament.incumbentId] && tournament.entrantIds.every((id) => index.clubs[id])
        && Array.isArray(tournament.ties) && tournament.ties.length > 0 && tournament.ties.length <= 20
        && tournament.ties.every((tie) => tie && typeof tie.id === 'string' && Number.isInteger(tie.stage)
          && [1, 2].includes(tie.legs) && Array.isArray(tie.results) && tie.results.length <= tie.legs
          && [tie.a, tie.b].every((slot) => typeof slot === 'string' && (index.clubs[slot] || slot.startsWith('winner:')))
          && (!tie.winnerId || index.clubs[tie.winnerId])
          && tie.results.every((result) => result?.fixture && index.clubs[result.fixture.homeId] && index.clubs[result.fixture.awayId]
            && Number.isInteger(result.homeGoals) && result.homeGoals >= 0 && Number.isInteger(result.awayGoals) && result.awayGoals >= 0)))
      && plan.complete === plan.playoffs.every((tournament) => tournament.complete);
    if (!validPlan) throw new Error('La promoción guardada no es válida.');
    applyDivisionMovements(world, plan.movements);
    if (saved.phase === 'playoffs' && (plan.complete || !getDivisionPlayoffFixtures(plan).length)) throw new Error('No hay una promoción pendiente válida.');
    if (['tournaments', 'complete'].includes(saved.phase) && !plan.complete) throw new Error('La promoción guardada todavía está pendiente.');
  } else if (saved.phase === 'playoffs') throw new Error('Falta el cuadro de promoción guardado.');
  for (const [id, health] of Object.entries(restored.playerHealth)) {
    if (!index.players[id] || !health || !Number.isFinite(health.condition) || health.condition < 0 || health.condition > 100
      || !Number.isFinite(health.sharpness) || health.sharpness < 0 || health.sharpness > 100
      || !Number.isFinite(health.minutesLast7Days) || health.minutesLast7Days < 0
      || (health.lastUpdatedDate && (!/^\d{4}-\d{2}-\d{2}$/.test(health.lastUpdatedDate) || !Number.isFinite(Date.parse(health.lastUpdatedDate))))
      || (health.injury && (typeof health.injury.name !== 'string' || !Number.isInteger(health.injury.daysRemaining) || health.injury.daysRemaining <= 0 || health.injury.daysRemaining > 1000))) throw new Error('El estado físico guardado no es válido.');
  }
  const activeLeague = leagues[index.clubs[saved.clubId].competitionId];
  if (restored.lineup.some((id) => index.players[id]?.clubId !== restored.clubId || index.players[id]?.retired)
    || saved.round > activeLeague.rounds.length || saved.round !== activeLeague.round
    || (saved.phase === 'season' ? saved.round >= activeLeague.rounds.length : saved.round !== activeLeague.rounds.length)
    || !Number.isFinite(saved.morale) || saved.morale < 0 || saved.morale > 100) throw new Error('La alineación o la jornada guardada no son válidas.');
  const validSide = (id, national) => typeof id === 'string' && (national ? id.startsWith('nation:') && Boolean(index.countries[id.slice(7)]) : Boolean(index.clubs[id]));
  for (const tournament of saved.tournaments) {
    if (!tournament || typeof tournament.id !== 'string' || !['club', 'national'].includes(tournament.type)
      || !Number.isInteger(tournament.round) || tournament.round < 0 || tournament.round > 10
      || !Array.isArray(tournament.remaining) || !tournament.remaining.length || tournament.remaining.length > 256
      || (tournament.remaining.length === 1 && !tournament.winnerId)
      || (tournament.balancedByes !== undefined && typeof tournament.balancedByes !== 'boolean')
      || new Set(tournament.remaining).size !== tournament.remaining.length
      || tournament.remaining.some((id) => !validSide(id, tournament.type === 'national'))
      || (tournament.winnerId && (tournament.remaining.length !== 1 || tournament.remaining[0] !== tournament.winnerId))
      || !Array.isArray(tournament.results) || tournament.results.length > 255
      || tournament.results.some((result) => !result?.fixture || !validSide(result.fixture.homeId, tournament.type === 'national')
        || !validSide(result.fixture.awayId, tournament.type === 'national') || !Number.isInteger(result.homeGoals) || result.homeGoals < 0
        || !Number.isInteger(result.awayGoals) || result.awayGoals < 0 || ![result.fixture.homeId, result.fixture.awayId].includes(result.winnerId))) {
      throw new Error('Las eliminatorias guardadas contienen datos inválidos.');
    }
  }
  if (saved.phase === 'complete' && saved.tournaments.some((tournament) => !tournament.winnerId)) throw new Error('La temporada guardada todavía tiene eliminatorias pendientes.');
  for (const [id, stats] of Object.entries(saved.playerStats)) {
    if (!index.players[id] || !stats || Object.keys(emptyStats()).some((key) => !Number.isFinite(stats[key]) || stats[key] < 0)
      || Object.keys(emptyStats()).filter((key) => key !== 'ratingTotal').some((key) => !Number.isInteger(stats[key]))
      || stats.minutes > stats.appearances * 120
      || stats.leagueGoals > stats.goals || stats.cleanSheets > stats.appearances || stats.leagueCleanSheets > stats.cleanSheets) {
      throw new Error('Las estadísticas guardadas contienen datos inválidos.');
    }
  }
  if (saved.negotiation && saved.negotiation.version !== 2 && (!index.players[saved.negotiation.playerId] || !['counter', 'accepted', 'rejected'].includes(saved.negotiation.status)
    || !Number.isFinite(saved.negotiation.fee) || saved.negotiation.fee < 0 || !Number.isFinite(saved.negotiation.wage) || saved.negotiation.wage <= 0))
    throw new Error('La negociación guardada contiene condiciones inválidas.');
  if (saved.scoutReports.some((report) => !report || !index.players[report.playerId] || typeof report.id !== 'string'
    || !Number.isFinite(report.potentialMin) || !Number.isFinite(report.potentialMax))) throw new Error('Los informes guardados no son válidos.');
  if (saved.lastMatch && (!saved.lastMatch.fixture || !Number.isInteger(saved.lastMatch.homeGoals) || !Number.isInteger(saved.lastMatch.awayGoals)
    || !Array.isArray(saved.lastMatch.events))) throw new Error('El último resultado guardado no es válido.');
  validateRecruitmentState(restored);
  validateScoutingState(restored);
  validateContractState(restored);
  if (!validateTransferWindowSnapshot(restored.transferWindowCalendar)) throw new Error('El calendario de fichajes guardado no es válido.');
  if (restored.calendarNextDate && (!/^\d{4}-\d{2}-\d{2}$/.test(restored.calendarNextDate) || !Number.isFinite(Date.parse(restored.calendarNextDate)) || restored.calendarNextDate < restored.date)) throw new Error('La siguiente fecha de calendario no es válida.');
  if (restored.calendarNextDate && restored.phase === 'season' && restored.calendarNextDate !== activeLeague.rounds[restored.round]?.[0]?.date) throw new Error('El calendario no coincide con la siguiente jornada.');
  if (activeMatch) {
    const fixture = getNextFixture(restored);
    if (!fixture || fixture.id !== activeMatch.fixture?.id || !Number.isInteger(activeMatch.minute) || activeMatch.minute < 0 || activeMatch.minute >= 120) throw new Error('El partido guardado no es válido.');
    const legacyMinute = activeMatch.modelVersion === undefined ? activeMatch.minute : activeMatch.legacyMinute;
    let match = beginLiveMatch(restored, fixture, legacyMinute !== undefined, activeMatch.modelVersion || 1);
    if (legacyMinute !== undefined) {
      if (!Number.isInteger(legacyMinute) || legacyMinute < 0 || legacyMinute > activeMatch.minute) throw new Error('El tramo antiguo del partido no es válido.');
      const report = simulateAggregateMatch(restored, fixture);
      match = importLegacyMatchPrefix(match, report, Math.min(legacyMinute, report.duration - 1));
    }
    if (activeMatch.modelVersion !== undefined) {
      if (![1, 2, 3].includes(activeMatch.modelVersion) || !Array.isArray(activeMatch.actions) || activeMatch.actions.length > 256) throw new Error('Las decisiones guardadas no son válidas.');
      for (const decision of activeMatch.actions) {
        if (!decision || !Number.isInteger(decision.minute) || decision.minute < match.minute || decision.minute > activeMatch.minute) throw new Error('Una decisión modifica minutos ya jugados.');
        if (decision.minute > match.minute) match = advanceLiveMatch(match, decision.minute - match.minute, true);
        if (match.complete) throw new Error('Hay decisiones después del final del partido.');
        if (decision.type === 'SET_MATCH_TACTICS') match = changeLiveTactics(match, decision);
        else if (decision.type === 'SUBSTITUTE_PLAYER') match = substituteLivePlayer(match, decision.outId, decision.inId);
        else if (decision.type === 'SET_MATCH_AUTOSUBS') match = setLiveAutoSubstitutions(match, decision.enabled);
        else throw new Error('La decisión guardada no está reconocida.');
      }
    }
    if (activeMatch.minute > match.minute) match = advanceLiveMatch(match, activeMatch.minute - match.minute, true);
    if (match.complete) throw new Error('El partido guardado ya ha terminado.');
    restored.activeMatch = match;
  }
  return restored;
}

export const serializeCareer = serializeManagerCareer;
export const restoreCareer = restoreManagerCareer;
