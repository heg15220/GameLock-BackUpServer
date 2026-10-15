/**
 * A manager career: creation, the day-by-day calendar behind "Continue", and
 * the turn of every season.
 *
 * The career is one mutable object (the world alone holds ~18,000 players);
 * the interface keeps it in a ref and re-renders on a version counter.
 */
import { createStream, clamp, addDays, weekday, dayOf, monthOf, roundMoney, iso, daysBetween } from './util.js';
import { buildWorld, clubSquad, pickLineup, pickBench, expectedRank, squadStrength, isInjured, assignNumbers } from './world.js';
import { FORMATIONS } from './positions.js';
import { stageOf, windowOpen, STAGES } from './calendar.js';
import {
  createSeason, buildLeagues, buildCups, buildContinental, buildQualifiers, buildTournaments, progressCompetitions,
  sortTable, nationId, isNation, tournamentsIn, TOURNAMENTS, stageReached,
} from './competitions.js';
import { cupName } from './world.js';
import { nationsByConf, nationRating, ensureNationalFillers, autoCallUp, nationStrength } from './national.js';
import { simulateQuick, simulateUserInstant, createFixtureMatch, applyLiveMatch } from './simulate.js';
import {
  progressNegotiations, generateIncomingOffers, processPending, aiTransferActivity, updateValues, wageBill, ledger, contractYearsLeft,
} from './transfers.js';
import { progressScouting, progressAcademy, scoutCandidates, youthScoutCandidates } from './scouting.js';
import { monthlyDevelopment, seasonTurnover, generateYouth } from './development.js';
import { setObjectives, boardAfterMatch, boardMonthly, seasonReview, nextBudgets, generateJobOffers, nationalReview, relegationSpots } from './board.js';
import { pressAfterMatch, weeklyDressingRoom, checkPromises, addEvent } from './events.js';
import { addInbox, addNews } from './inbox.js';
import { seasonIncome, ticketPrice, moneyScale } from './economy.js';
import { TACTIC_DEFAULTS } from './match.js';

export const CAREER_VERSION = 3;

const nationStrengthOf = (world, date) => (id) => nationRating(world, id.slice(2), date);

/* ── Creation ── */

export function defaultDeepLeagues(world, clubId) {
  const own = world.clubs[clubId].leagueId;
  const country = world.leagues[own].country;
  const leagues = Object.values(world.leagues).filter((l) => l.clubIds.length >= 2);
  const sameCountry = leagues.filter((l) => l.country === country).map((l) => l.id);
  const top = leagues.filter((l) => !sameCountry.includes(l.id)).sort((a, b) => b.strength - a.strength || a.tier - b.tier || b.clubIds.length - a.clubIds.length).map((l) => l.id);
  return [...new Set([own, ...sameCountry, ...top])].slice(0, 10);
}

export function createCareer({ year = 2025, clubId, managerName = 'Mánager', seed = null, nationFifa = null, deepLeagues = null, avatar = 0 }) {
  const careerSeed = seed || `C${year}-${clubId}-${Date.now().toString(36)}`;
  const world = buildWorld(year, careerSeed);
  const club = world.clubs[clubId];
  if (!club || club.external || !club.leagueId) throw new Error('club-unavailable');
  const career = {
    v: CAREER_VERSION, seed: careerSeed, created: new Date().toISOString(), managerName: String(managerName || 'Mánager').slice(0, 32), avatar,
    startYear: year, year, date: iso(year, 7, 1), clubId, world,
    deepLeagues: deepLeagues?.length ? deepLeagues.filter((id) => world.leagues[id]).slice(0, 10) : defaultDeepLeagues(world, clubId),
    reputation: clamp(22 + club.rep * 11 + (club.rating - 60) * 0.4, 5, 85), fans: 66,
    training: 'balanced', tactics: { formation: club.formation, ...TACTIC_DEFAULTS }, lineup: [], bench: [], autoLineup: true, captain: null,
    national: null, inbox: [], news: [], events: [], promises: [], recentResults: [],
    transfers: { negotiations: [], offers: [], pending: [], listed: {}, shortlist: [], cooldowns: {}, log: [], serial: 0, listedByAi: {} },
    scouting: { scouts: [], missions: [], reports: {}, hired: 0 },
    academy: { players: [], prospects: [], scouts: [], hired: 0 },
    board: { objectives: [], confidence: 62, warned: false, expected: null },
    finances: { balance: club.balance, transferBudget: club.budget, wageBudget: Math.max(club.wageBudget, 1000), reinvest: 0.75, ledger: [], schedule: [] },
    trophies: [], history: [], lastStandings: null, jobOffers: [], sacked: null, live: null,
    serial: { inbox: 0, news: 0, events: 0, missions: 0, jobs: 0 }, flags: { stops: [] }, stage: 'summer-window', version: 0,
  };
  career.finances.wageBudget = Math.max(career.finances.wageBudget, Math.round(wageBill(career) * 1.08));
  // A starting staff: two scouts and one youth scout, a handful of academy kids.
  const scouts = scoutCandidates(career, 4).sort((a, b) => b.exp - a.exp);
  career.scouting.scouts = scouts.slice(0, 2).map((s) => ({ ...s, missionId: null }));
  career.scouting.hired = 1;
  const youthScout = youthScoutCandidates(career, 3)[0];
  career.academy.scouts = [{ ...youthScout, country: club.country, next: addDays(career.date, 30) }];
  career.academy.hired = 1;
  for (let i = 0; i < 5; i += 1) {
    const league = world.leagues[club.leagueId];
    career.academy.players.push(generateYouth(career, { clubId: null, country: club.country, conf: league.conf, age: 15 + (i % 3), quality: club.rating - 10, key: `academy-start-${i}` }));
  }
  buildSeasonFor(career);
  setObjectives(career);
  if (nationFifa) takeNationalJob(career, nationFifa, { silent: true });
  refreshLineup(career);
  addInbox(career, { kind: 'welcome', club: clubId, year });
  addInbox(career, { kind: 'board-objectives' });
  addNews(career, { kind: 'new-manager', club: clubId, manager: career.managerName });
  career.stage = stageOf(career.date, career.season.dates);
  return career;
}

function buildSeasonFor(career) {
  const world = career.world;
  const season = createSeason(career.year);
  career.season = season;
  buildLeagues(season, world);
  buildCups(season, world, (cupId, country) => cupName(cupId, country));
  buildContinental(season, world, career.lastStandings);
  buildQualifiers(season, nationsByConf(world), nationStrengthOf(world, career.date));
  season.tournamentsBuilt = false;
  addPreseasonFriendlies(career);
  if (career.national) addNationalFriendlies(career);
  for (const p of Object.values(world.players)) { p.stats = {}; p.natStats = {}; p.susp = 0; p.yc = 0; }
}

function addFixture(season, fixture) {
  season.fixtures[fixture.id] = { done: false, hg: null, ag: null, ...fixture };
  (season.byDate[fixture.date] ||= []).push(fixture.id);
  if (!season.comps.F) { season.comps.F = { id: 'F', type: 'friendly', name: 'Amistoso', teams: [] }; season.order.push('F'); }
}

function addPreseasonFriendlies(career) {
  const world = career.world;
  const club = world.clubs[career.clubId];
  const random = createStream(career.seed, 'friendlies', career.year);
  const pool = Object.values(world.clubs).filter((c) => !c.external && c.id !== club.id && c.leagueId !== club.leagueId && Math.abs(c.rating - club.rating) <= 8);
  career.season.dates.friendlies.forEach((date, i) => {
    if (!pool.length) return;
    const rival = pool.splice(Math.floor(random() * pool.length), 1)[0];
    const home = i % 2 === 0;
    addFixture(career.season, { id: `F:${career.clubId}:${i}`, comp: 'F', stage: 'friendly', date, home: home ? club.id : rival.id, away: home ? rival.id : club.id, friendly: true });
  });
}

function addNationalFriendlies(career) {
  const season = career.season;
  const team = nationId(career.national.fifa);
  const taken = new Set(Object.values(season.fixtures).filter((f) => f.home === team || f.away === team).map((f) => f.date));
  const conf = career.world.countries[career.national.fifa]?.confederation;
  const own = nationRating(career.world, career.national.fifa, career.date);
  const all = Object.values(nationsByConf(career.world)).flat().filter((fifa) => fifa !== career.national.fifa);
  const random = createStream(career.seed, 'nat-friendly', career.year, career.national.fifa);
  const dates = [...season.dates.breakMatches];
  const tournamentKeys = tournamentsIn(career.year + 1).filter((key) => key === 'world' || TOURNAMENTS[key].conf === conf || (key === 'copa' && conf === 'CONCACAF'));
  const inTournament = Object.values(season.comps).some((comp) => comp.type === 'tournament' && comp.teams.includes(team));
  if (!tournamentKeys.length || (season.tournamentsBuilt && !inTournament)) dates.push(...season.dates.juneFriendlies);
  for (const date of dates) {
    if (taken.has(date) || date < career.date) continue;
    const near = all.filter((fifa) => Math.abs(nationRating(career.world, fifa, career.date) - own) <= 6);
    const choice = (near.length ? near : all)[Math.floor(random() * (near.length || all.length))];
    if (!choice) continue;
    const home = random() < 0.5;
    addFixture(season, { id: `F:${team}:${date}`, comp: 'F', stage: 'friendly', date, home: home ? team : nationId(choice), away: home ? nationId(choice) : team, friendly: true, national: true });
  }
}

export function takeNationalJob(career, fifa, { silent = false } = {}) {
  const country = career.world.countries[fifa];
  if (!country) return { error: 'invalid' };
  ensureNationalFillers(career.world, fifa, career.seed, career.year);
  career.national = {
    fifa, since: career.date, confidence: 62, autoLineup: true, lineup: [],
    tactics: { formation: '4-3-3', ...TACTIC_DEFAULTS }, squad: autoCallUp(career.world, fifa, career.date, 23), autoSquad: true, history: [],
  };
  addNationalFriendlies(career);
  if (!silent) addNews(career, { kind: 'national-job', fifa, manager: career.managerName });
  return { ok: true };
}

export function leaveNationalJob(career) {
  if (!career.national) return;
  const team = nationId(career.national.fifa);
  for (const f of Object.values(career.season.fixtures)) {
    if (f.comp === 'F' && !f.done && (f.home === team || f.away === team)) f.cancelled = true;
  }
  career.national = null;
}

/* ── Line-ups ── */

export function refreshLineup(career) {
  const squad = clubSquad(career.world, career.clubId);
  const lineup = pickLineup(squad, career.tactics.formation, career.date, career.training);
  career.lineup = lineup.map((p) => p?.id || null);
  career.bench = pickBench(squad, career.lineup.filter(Boolean), career.date, career.year >= 2020 ? 9 : 7, career.training);
}

export function setFormation(career, formation) {
  if (!FORMATIONS[formation]) return;
  career.tactics.formation = formation;
  if (career.autoLineup) refreshLineup(career);
  else {
    // Keep the same eleven, reassigned to the new shape by fit.
    const squad = career.lineup.map((id) => career.world.players[id]).filter(Boolean);
    const placed = pickLineup(squad, formation, null);
    career.lineup = placed.map((p) => p?.id || null);
  }
}

/* ── The calendar ── */

export function userTeams(career) {
  const teams = [career.clubId];
  if (career.national) teams.push(nationId(career.national.fifa));
  return teams;
}

export function fixturesOn(career, date) {
  return (career.season.byDate[date] || []).map((id) => career.season.fixtures[id]).filter((f) => f && !f.cancelled);
}

export function userFixtureToday(career) {
  const teams = userTeams(career);
  return fixturesOn(career, career.date).find((f) => !f.done && (teams.includes(f.home) || teams.includes(f.away))) || null;
}

export function nextUserFixtures(career, count = 5) {
  const teams = userTeams(career);
  return Object.values(career.season.fixtures).filter((f) => !f.done && !f.cancelled && f.date >= career.date && (teams.includes(f.home) || teams.includes(f.away)))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).slice(0, count);
}

function simulateOthers(career, date) {
  const teams = userTeams(career);
  const fixtures = fixturesOn(career, date).filter((f) => !f.done && !teams.includes(f.home) && !teams.includes(f.away));
  for (const fixture of fixtures) simulateQuick(career, fixture);
  return fixtures.length;
}

function handleCompetitionEvents(career, events) {
  for (const event of events) {
    const comp = career.season.comps[event.comp];
    if (event.type === 'trophy') {
      const mine = event.winner === career.clubId || (career.national && event.winner === nationId(career.national.fifa));
      addNews(career, { kind: 'trophy', comp: event.comp, winner: event.winner, mine });
      if (mine) {
        career.trophies.push({ year: career.year, comp: event.comp, name: comp.name, type: comp.type, conf: comp.conf || null, leagueId: comp.leagueId || comp.trophyLeagueId || null, national: isNation(event.winner) });
        career.flags.celebration = { comp: event.comp, winner: event.winner };
        career.flags.stops.push({ kind: 'trophy' });
        if (!isNation(event.winner)) {
          const prize = roundMoney((comp.type === 'continental' ? 18e6 / comp.level : comp.type === 'league' ? 10e6 : 3e6) * moneyScale(career.year));
          career.finances.transferBudget += roundMoney(prize * 0.5);
          ledger(career, prize, 'prize', { comp: event.comp });
        }
        pressTrophy(career, comp);
      }
    } else if (event.type === 'qualifiers-done' && career.national) {
      const team = nationId(career.national.fifa);
      if (comp.teams.includes(team)) addInbox(career, { kind: comp.qualified.includes(team) ? 'qualified' : 'not-qualified', comp: event.comp, stop: true });
    } else if (event.type === 'groups-done') {
      const team = comp.teams.includes(career.clubId) ? career.clubId : career.national && comp.teams.includes(nationId(career.national.fifa)) ? nationId(career.national.fifa) : null;
      if (team) {
        const through = comp.ko[0]?.ties.some((tie) => tie.a === team || tie.b === team);
        addNews(career, { kind: through ? 'through-groups' : 'out-groups', comp: event.comp, team });
      }
    }
  }
  // Eliminations of the manager's teams.
  for (const comp of Object.values(career.season.comps)) {
    if (!['cup', 'continental', 'tournament'].includes(comp.type)) continue;
    for (const team of userTeams(career)) {
      if (!comp.teams?.includes(team) || comp.eliminatedNoticed?.includes(team)) continue;
      const out = isEliminated(career, comp, team);
      if (out) {
        comp.eliminatedNoticed = [...(comp.eliminatedNoticed || []), team];
        addNews(career, { kind: 'eliminated', comp: comp.id, team, stage: stageReached(career.season, comp, team) });
        if (team === career.clubId) addEvent(career, 'press-elimination', { comp: comp.id });
      }
    }
  }
}

function pressTrophy(career, comp) {
  if (comp.type !== 'friendly') addEvent(career, 'press-trophy', { comp: comp.id });
}

function isEliminated(career, comp, team) {
  const season = career.season;
  if (comp.finished) return comp.winner !== team;
  if (comp.type === 'cup') {
    const latest = comp.rounds.at(-1);
    const inLatest = latest?.fixtures.some((id) => [season.fixtures[id].home, season.fixtures[id].away].includes(team));
    return !comp.alive.includes(team) && !inLatest;
  }
  if (comp.phase === 'groups') return false;
  if (comp.phase === 'ko') {
    const inKo = comp.ko.some((round) => round.ties.some((tie) => tie.a === team || tie.b === team));
    if (!inKo) return true;
    for (const round of comp.ko) {
      const tie = round.ties.find((t) => t.a === team || t.b === team);
      if (tie && tie.winner && tie.winner !== team) return true;
    }
  }
  return false;
}

/** Morning routine of a new day. */
function morning(career) {
  const date = career.date;
  const dates = career.season.dates;
  const previousStage = career.stage;
  career.stage = stageOf(date, dates, { tournamentRunning: isTournamentRunning(career) });
  if (career.stage !== previousStage) {
    addInbox(career, { kind: 'stage', stage: career.stage, stop: ['winter-window', 'first-half', 'second-half', 'international'].includes(career.stage) });
  }
  if (date === dates.summerClose || date === dates.winterClose) addInbox(career, { kind: 'deadline-day', stop: true });
  if (date === dates.winterOpen) {
    const expiring = clubSquad(career.world, career.clubId).filter((p) => contractYearsLeft(career, p) === 0 && !p.loan);
    if (expiring.length) addInbox(career, { kind: 'expiring-contracts', players: expiring.map((p) => p.id), stop: false });
  }
  processPending(career);
  progressNegotiations(career);
  generateIncomingOffers(career);
  aiTransferActivity(career);
  progressScouting(career);
  // Offers expire after a few days without an answer.
  for (const offer of career.transfers.offers) if (offer.status === 'open' && offer.expires < date) offer.status = 'expired';
  // Finances: wages on Mondays, TV and commercial money on the 1st.
  if (weekday(date) === 1) {
    const wages = wageBill(career) + career.scouting.scouts.reduce((t, s) => t + s.wage, 0) + career.academy.scouts.reduce((t, s) => t + s.wage, 0);
    ledger(career, -Math.round(wages), 'wages');
    weeklyDressingRoom(career);
  }
  if (dayOf(date) === 1) {
    const club = career.world.clubs[career.clubId];
    const income = seasonIncome(club, career.world.leagues[club.leagueId], career.year);
    const month = monthOf(date);
    if (month >= 9 || month <= 5) ledger(career, roundMoney(income.tv / 9), 'tv');
    ledger(career, roundMoney(income.commercial / 12), 'commercial');
    monthlyDevelopment(career);
    updateValues(career);
    progressAcademy(career);
    if (month !== 7 && month !== 8) boardMonthly(career);
    checkPromises(career);
    for (const youth of career.academy.players) youth.age = Math.floor(daysBetween(youth.born, date) / 365.25);
  }
  for (const item of career.finances.schedule) {
    if (!item.paid && item.date <= date) { item.paid = true; ledger(career, item.amount, item.kind, { player: item.player, club: item.club }); }
  }
  // Tournaments are drawn once the autumn qualifiers are over.
  if (!career.season.tournamentsBuilt && date >= iso(career.year, 12, 1)) {
    buildTournaments(career.season, nationsByConf(career.world), nationStrengthOf(career.world, date), career.national?.fifa);
    career.season.tournamentsBuilt = true;
    if (career.national) {
      addNationalFriendlies(career);
      const comp = Object.values(career.season.comps).find((c) => c.type === 'tournament' && c.teams.includes(nationId(career.national.fifa)));
      if (comp) addInbox(career, { kind: 'tournament-draw', comp: comp.id, stop: true });
    }
  }
  // National squad deadline: a few days before each international match.
  if (career.national) {
    const team = nationId(career.national.fifa);
    const mine = (d) => fixturesOn(career, d).some((f) => f.home === team || f.away === team);
    const soon = fixturesOn(career, addDays(date, 4)).find((f) => !f.done && (f.home === team || f.away === team));
    const before = [-3, -2, -1, 0, 1, 2, 3].some((offset) => mine(addDays(date, offset)));
    if (soon && !before) {
      if (career.national.autoSquad) career.national.squad = autoCallUp(career.world, career.national.fifa, date, soon.comp.startsWith('T:') ? 26 : 23);
      addInbox(career, { kind: 'call-up', fixture: soon.id, stop: true });
    }
  }
}

export function isTournamentRunning(career) {
  if (!career.national) return false;
  const team = nationId(career.national.fifa);
  return Object.values(career.season.comps).some((comp) => comp.type === 'tournament' && comp.teams.includes(team) && !comp.finished
    && !comp.eliminatedNoticed?.includes(team));
}

/** Finish the current day (simulate everything but the user's match). */
function closeDay(career) {
  simulateOthers(career, career.date);
  handleCompetitionEvents(career, progressCompetitions(career.season, career.world));
}

/**
 * The "Continue" button: move through the calendar until something needs the
 * manager - a match, an answer, a deadline, the end of the season.
 */
export function continueCareer(career, { maxDays = 400, single = false } = {}) {
  career.flags = { stops: [] };
  if (career.sacked) return { stop: 'sacked' };
  for (let i = 0; i < maxDays; i += 1) {
    const fixture = userFixtureToday(career);
    if (fixture) return { stop: 'match', fixture };
    closeDay(career);
    if (career.flags.stops.length && i > 0) return { stop: 'attention', stops: career.flags.stops };
    const turn = seasonTurns(career);
    if (turn) return turn;
    career.date = addDays(career.date, 1);
    morning(career);
    career.version += 1;
    if (userFixtureToday(career)) return { stop: 'match', fixture: userFixtureToday(career) };
    if (career.flags.stops.length) return { stop: 'attention', stops: career.flags.stops };
    if (single) return { stop: 'day' };
  }
  return { stop: 'limit' };
}

/** Season end on the last day of May; new season on 1 July. */
function seasonTurns(career) {
  const dates = career.season.dates;
  if (career.date === dates.seasonEnd && !career.season.reviewed) {
    career.season.reviewed = true;
    endOfClubSeason(career);
    return { stop: 'season-review' };
  }
  if (addDays(career.date, 1) === dates.nextStart) {
    const pending = Object.values(career.season.fixtures).some((f) => !f.done && !f.cancelled && f.date <= career.date);
    if (!pending) {
      rollover(career);
      return { stop: 'new-season' };
    }
  }
  return null;
}

function finalStandings(career) {
  const result = {};
  for (const comp of Object.values(career.season.comps)) {
    if (comp.type === 'league') result[comp.leagueId] = sortTable(Object.values(comp.table)).map((row) => row.team);
  }
  return result;
}

/** Awards and the board's verdict. */
function endOfClubSeason(career) {
  const world = career.world;
  const club = world.clubs[career.clubId];
  const league = career.season.comps[`L:${club.leagueId}`];
  const table = sortTable(Object.values(league.table));
  const position = table.findIndex((row) => row.team === career.clubId) + 1;
  const prize = roundMoney(Math.max(0, (table.length - position + 1) / table.length) * seasonIncome(club, world.leagues[club.leagueId], career.year).tv * 0.4);
  if (prize) ledger(career, prize, 'prize', { comp: league.id });
  const awards = computeAwards(career);
  const review = seasonReview(career);
  const budgets = nextBudgets(career, review);
  const userComps = Object.values(career.season.comps).filter((comp) => comp.teams?.includes(career.clubId) && comp.type !== 'friendly' && comp.type !== 'league')
    .map((comp) => ({ comp: comp.id, name: comp.name, reached: stageReached(career.season, comp, career.clubId) }));
  const squad = clubSquad(world, career.clubId);
  const topScorer = squad.slice().sort((a, b) => (b.stats?.g || 0) - (a.stats?.g || 0))[0];
  const best = squad.filter((p) => (p.stats?.apps || 0) >= 8).sort((a, b) => (b.stats.rs / b.stats.apps) - (a.stats.rs / a.stats.apps))[0];
  const entry = {
    year: career.year, clubId: career.clubId, leagueId: club.leagueId, position, points: table[position - 1]?.pts || 0, of: table.length,
    record: table[position - 1] ? { w: table[position - 1].w, d: table[position - 1].d, l: table[position - 1].l, gf: table[position - 1].gf, ga: table[position - 1].ga } : null,
    comps: userComps, trophies: career.trophies.filter((t) => t.year === career.year).map((t) => t.name), awards,
    topScorer: topScorer ? { id: topScorer.id, name: topScorer.name, goals: topScorer.stats?.g || 0 } : null,
    best: best ? { id: best.id, name: best.name, rating: +(best.stats.rs / best.stats.apps).toFixed(2) } : null,
    grade: review.grade, budgets,
  };
  career.history.push(entry);
  career.review = { ...entry, status: review.status, confidenceDelta: review.confidenceDelta, reputationDelta: review.reputationDelta };
  career.lastStandings = finalStandings(career);
  addInbox(career, { kind: 'season-review', year: career.year, stop: true });
  addNews(career, { kind: 'season-end', club: career.clubId, position, league: club.leagueId });
  if (review.grade < 0.25 && career.board.confidence < 25 && !career.sacked) {
    career.sacked = { date: career.date, clubId: career.clubId };
    addInbox(career, { kind: 'sacked', club: career.clubId, stop: true });
    career.jobOffers = generateJobOffers(career, 'sacked');
  } else {
    career.jobOffers = generateJobOffers(career, 'season');
  }
}

/** Golden Boot per league, Ballon d'Or, Golden Glove, best young player. */
function computeAwards(career) {
  const world = career.world;
  const players = Object.values(world.players).filter((p) => !p.retired && (p.stats?.apps || 0) >= 10);
  const deep = new Set(career.deepLeagues);
  const inDeep = players.filter((p) => deep.has(world.clubs[p.clubId]?.leagueId));
  const avg = (p) => (p.stats.rs || 0) / Math.max(1, p.stats.apps);
  const titles = (p) => career.season ? Object.values(career.season.comps).filter((c) => c.winner === p.clubId && c.type !== 'friendly').length : 0;
  const ballon = inDeep.slice().sort((a, b) => {
    const score = (p) => avg(p) * 10 + (p.stats.g || 0) * 0.9 + (p.stats.a || 0) * 0.5 + titles(p) * 4 + (world.leagues[world.clubs[p.clubId]?.leagueId]?.strength || 0) * 3 + p.ovr * 0.3;
    return score(b) - score(a);
  })[0];
  const boot = inDeep.slice().sort((a, b) => (b.stats.lg || 0) - (a.stats.lg || 0) || (b.stats.g || 0) - (a.stats.g || 0))[0];
  const glove = inDeep.filter((p) => p.pos === 'GK').sort((a, b) => (b.stats.lcs || 0) - (a.stats.lcs || 0) || avg(b) - avg(a))[0];
  const young = inDeep.filter((p) => p.age <= 21).sort((a, b) => avg(b) * 10 + (b.stats.g || 0) - avg(a) * 10 - (a.stats.g || 0))[0];
  const pick = (p, value) => (p ? { player: p.id, name: p.name, club: p.clubId, value } : null);
  const awards = {
    ballon: pick(ballon, ballon ? +avg(ballon).toFixed(2) : 0), boot: pick(boot, boot?.stats.lg || 0),
    glove: pick(glove, glove?.stats.lcs || 0), young: pick(young, young ? +avg(young).toFixed(2) : 0),
    leagues: {},
  };
  const ownLeague = world.clubs[career.clubId].leagueId;
  for (const leagueId of career.deepLeagues) {
    const scorers = inDeep.filter((p) => world.clubs[p.clubId]?.leagueId === leagueId).sort((a, b) => (b.stats.lg || 0) - (a.stats.lg || 0));
    if (scorers[0]) awards.leagues[leagueId] = pick(scorers[0], scorers[0].stats.lg || 0);
  }
  for (const [key, award] of Object.entries(awards)) {
    if (key === 'leagues' || !award) continue;
    if (world.players[award.player]?.clubId === career.clubId) addNews(career, { kind: 'award', award: key, player: award.player });
  }
  if (awards.leagues[ownLeague]) addNews(career, { kind: 'top-scorer', player: awards.leagues[ownLeague].player, goals: awards.leagues[ownLeague].value, league: ownLeague });
  return awards;
}

/** 1 July: contracts, retirements, promotions, budgets, a new calendar. */
function rollover(career) {
  const world = career.world;
  // National tournament verdict before the season object goes.
  if (career.national) {
    const team = nationId(career.national.fifa);
    const comp = Object.values(career.season.comps).find((c) => c.type === 'tournament' && c.teams.includes(team));
    if (comp) {
      const verdict = nationalReview(career, comp);
      career.national.history.push({ year: career.year + 1, comp: comp.id, name: comp.name, reached: verdict.reached });
    }
  }
  const previousLeague = world.clubs[career.clubId].leagueId;
  const turnover = seasonTurnover(career);
  const movements = applyPromotions(career);
  const userContractEnd = turnover.freed.filter((id) => world.players[id]?.clubId === null);
  career.year += 1;
  world.year = career.year;
  career.date = iso(career.year, 7, 1);
  for (const club of Object.values(world.clubs)) {
    if (club.external) continue;
    const squad = clubSquad(world, club.id);
    club.rating = Math.round(squadStrength(squad, club.formation) || club.rating);
    const league = world.leagues[club.leagueId];
    if (club.id !== career.clubId) {
      const income = seasonIncome(club, league, career.year);
      club.budget = roundMoney(Math.max(club.budget * 0.5, (income.tv + income.commercial) * 0.3));
    }
  }
  const review = career.review;
  const budgets = review?.budgets || nextBudgets(career, null);
  career.finances.transferBudget = budgets.transferBudget;
  career.finances.wageBudget = budgets.wageBudget;
  career.finances.ledger = career.finances.ledger.slice(0, 120);
  career.transfers.negotiations = career.transfers.negotiations.filter((n) => !['done', 'failed'].includes(n.status));
  career.transfers.offers = career.transfers.offers.filter((o) => o.status === 'open');
  career.transfers.log = [];
  career.recentResults = [];
  career.review = null;
  career.board.warned = false;
  for (const p of clubSquad(world, career.clubId)) p.morale = clamp((p.morale ?? 65) * 0.6 + 70 * 0.4, 30, 95);
  buildSeasonFor(career);
  setObjectives(career);
  if (career.autoLineup) refreshLineup(career);
  else career.lineup = career.lineup.filter((id) => world.players[id]?.clubId === career.clubId);
  career.stage = 'summer-window';
  const myMove = movements.find((m) => m.club === career.clubId);
  addInbox(career, { kind: 'new-season', year: career.year, move: myMove || null, freed: userContractEnd, stop: true });
  if (previousLeague !== world.clubs[career.clubId].leagueId) addNews(career, { kind: myMove?.up ? 'promoted' : 'relegated', club: career.clubId, league: world.clubs[career.clubId].leagueId });
  addNews(career, { kind: 'window-open', season: career.year });
}

/** Promotions and relegations between connected divisions. */
function applyPromotions(career) {
  const world = career.world;
  const moves = [];
  const leagues = Object.values(world.leagues);
  for (const upper of leagues) {
    const lower = leagues.find((l) => l.country === upper.country && l.tier === upper.tier + 1 && l.clubIds.length >= 2);
    if (!lower) continue;
    const spots = relegationSpots(career, upper);
    if (!spots) continue;
    const upperTable = career.lastStandings?.[upper.id];
    const lowerTable = career.lastStandings?.[lower.id];
    if (!upperTable || !lowerTable) continue;
    const down = upperTable.slice(-spots);
    const up = lowerTable.slice(0, spots);
    for (const id of down) moves.push({ club: id, from: upper.id, to: lower.id, up: false });
    for (const id of up) moves.push({ club: id, from: lower.id, to: upper.id, up: true });
  }
  for (const move of moves) {
    const club = world.clubs[move.club];
    world.leagues[move.from].clubIds = world.leagues[move.from].clubIds.filter((id) => id !== move.club);
    world.leagues[move.to].clubIds.push(move.club);
    club.leagueId = move.to;
    club.budget = roundMoney(club.budget * (move.up ? 1.5 : 0.7));
    if (move.club === career.clubId) {
      career.finances.transferBudget = roundMoney(career.finances.transferBudget * (move.up ? 1.4 : 0.7));
    }
  }
  return moves;
}

/* ── The manager's matches ── */

export function startUserMatch(career, fixtureId) {
  const fixture = career.season.fixtures[fixtureId];
  if (!fixture || fixture.done) return null;
  const teams = userTeams(career);
  const side = teams.includes(fixture.home) ? 'home' : 'away';
  const match = createFixtureMatch(career, fixture, side);
  career.live = match;
  return match;
}

export function finishUserMatch(career, match) {
  const fixture = career.season.fixtures[match.id];
  if (!fixture || fixture.done) { career.live = null; return fixture; }
  applyLiveMatch(career, fixture, match);
  afterUserMatch(career, fixture, match);
  career.live = null;
  career.lastMatch = { id: fixture.id, date: fixture.date };
  career.version += 1;
  return fixture;
}

export function simulateUserMatch(career, fixtureId) {
  const fixture = career.season.fixtures[fixtureId];
  if (!fixture || fixture.done) return null;
  const teams = userTeams(career);
  const side = teams.includes(fixture.home) ? 'home' : 'away';
  const match = simulateUserInstant(career, fixture, side);
  afterUserMatch(career, fixture, match);
  career.lastMatch = { id: fixture.id, date: fixture.date };
  career.version += 1;
  return match;
}

function afterUserMatch(career, fixture, match) {
  const clubSide = fixture.home === career.clubId ? 'home' : fixture.away === career.clubId ? 'away' : null;
  const side = clubSide || (fixture.home.startsWith('N:') && userTeams(career).includes(fixture.home) ? 'home' : 'away');
  const own = side === 'home' ? fixture.hg : fixture.ag;
  const rival = side === 'home' ? fixture.ag : fixture.hg;
  addNews(career, { kind: 'match', fixture: fixture.id, side, comp: fixture.comp, home: fixture.home, away: fixture.away, hg: fixture.hg, ag: fixture.ag, pens: fixture.pens, motm: match.motm });
  if (clubSide) {
    if (!fixture.friendly) {
      career.recentResults.push(own > rival ? 'W' : own < rival ? 'L' : 'D');
      career.recentResults = career.recentResults.slice(-10);
      boardAfterMatch(career, fixture);
      pressAfterMatch(career, fixture, own, rival);
    }
    if (side === 'home' && !fixture.friendly) {
      const club = career.world.clubs[career.clubId];
      const fill = clamp(0.62 + (career.fans ?? 65) / 300 + (fixture.comp.startsWith('K') ? 0.15 : 0) + (match.sides?.away ? 0 : 0), 0.45, 1);
      const attendance = Math.round(club.capacity * fill);
      const gate = attendance * ticketPrice(club, career.year);
      ledger(career, gate, 'gate', { fixture: fixture.id, attendance });
      fixture.attendance = attendance;
    }
    for (const id of career.flags.injuryNews || []) addInbox(career, { kind: 'injury', player: id });
    career.flags.injuryNews = [];
  } else if (career.national) {
    career.national.confidence = clamp((career.national.confidence ?? 60) + (own > rival ? 3 : own < rival ? -4 : 0), 0, 100);
  }
  handleCompetitionEvents(career, progressCompetitions(career.season, career.world));
}

/* ── Jobs ── */

export function acceptJobOffer(career, offerId) {
  const offer = career.jobOffers.find((o) => o.id === offerId);
  if (!offer) return { error: 'missing' };
  career.jobOffers = career.jobOffers.filter((o) => o.id !== offerId);
  if (offer.type === 'nation') return takeNationalJob(career, offer.fifa);
  const world = career.world;
  const club = world.clubs[offer.clubId];
  const previous = career.clubId;
  career.clubId = club.id;
  career.tactics = { formation: club.formation, ...TACTIC_DEFAULTS };
  career.autoLineup = true;
  career.finances = { balance: club.balance, transferBudget: club.budget, wageBudget: Math.max(1000, club.wageBudget), reinvest: 0.75, ledger: [], schedule: [] };
  career.finances.wageBudget = Math.max(career.finances.wageBudget, Math.round(wageBill(career) * 1.08));
  career.board = { objectives: [], confidence: 60, warned: false, expected: null };
  career.transfers.negotiations = [];
  career.transfers.offers = [];
  career.transfers.listed = {};
  career.transfers.pending = career.transfers.pending.filter((deal) => deal.from !== previous && deal.to !== previous);
  career.academy.players = [];
  career.academy.prospects = [];
  career.sacked = null;
  career.recentResults = [];
  career.promises = [];
  // The season's friendlies follow the manager to the new club.
  for (const f of Object.values(career.season.fixtures)) {
    if (f.comp === 'F' && !f.done && !f.national && (f.home === previous || f.away === previous)) f.cancelled = true;
  }
  setObjectives(career);
  refreshLineup(career);
  addNews(career, { kind: 'new-manager', club: club.id, manager: career.managerName, from: previous });
  addInbox(career, { kind: 'welcome', club: club.id, year: career.year });
  return { ok: true };
}

export function declineJobOffer(career, offerId) {
  career.jobOffers = career.jobOffers.filter((o) => o.id !== offerId);
  if (career.sacked && !career.jobOffers.length) career.jobOffers = generateJobOffers(career, 'sacked');
  return { ok: true };
}

/* ── Read models for the interface ── */

export function ownLeagueComp(career) {
  return career.season.comps[`L:${career.world.clubs[career.clubId].leagueId}`];
}

export function leaguePosition(career) {
  const comp = ownLeagueComp(career);
  if (!comp) return null;
  const table = sortTable(Object.values(comp.table));
  return { position: table.findIndex((row) => row.team === career.clubId) + 1, size: table.length, row: table.find((row) => row.team === career.clubId) };
}

export function daysToSeasonEnd(career) {
  return Math.max(0, daysBetween(career.date, career.season.dates.seasonEnd));
}

export function transferWindowInfo(career) {
  const dates = career.season.dates;
  const open = windowOpen(career.date, dates);
  const closes = career.date <= dates.summerClose ? dates.summerClose : dates.winterClose;
  const opens = career.date < dates.winterOpen ? dates.winterOpen : dates.nextStart;
  return { open, closes: open ? closes : null, opens: open ? null : opens, daysLeft: open ? daysBetween(career.date, closes) : daysBetween(career.date, opens) };
}

export { STAGES, nationStrength, expectedRank, isInjured, assignNumbers };
