/**
 * The board: season objectives, confidence, budgets, the sack and job offers.
 */
import { createStream, clamp, roundMoney, weighted } from './util.js';
import { expectedRank, clubSquad } from './world.js';
import { moneyScale, seasonIncome } from './economy.js';
import { sortTable, stageReached, nationId, isNation } from './competitions.js';
import { addInbox, addNews } from './inbox.js';
import { nationRating } from './national.js';

const STAGE_ORDER = ['entered', 'r256', 'r128', 'r64', 'r32', 'group', 'r16', 'qf', 'sf', 'final', 'winner'];
export const stageIndex = (stage) => STAGE_ORDER.indexOf(stage);

function relegationSpots(career, league) {
  const below = Object.values(career.world.leagues).some((l) => l.country === league.country && l.tier === league.tier + 1);
  if (!below) return 0;
  return league.clubIds.length >= 16 ? 3 : league.clubIds.length >= 10 ? 2 : 1;
}

export function promotionSpots(career, league) {
  const above = Object.values(career.world.leagues).find((l) => l.country === league.country && l.tier === league.tier - 1);
  if (!above) return 0;
  return relegationSpots(career, above);
}

export { relegationSpots };

/** Objectives for the season, set from where the squad should finish. */
export function setObjectives(career) {
  const world = career.world;
  const club = world.clubs[career.clubId];
  const league = world.leagues[club.leagueId];
  const size = league.clubIds.length;
  const expected = expectedRank(world, career.clubId);
  const relegation = relegationSpots(career, league);
  const promotion = promotionSpots(career, league);
  const objectives = [];
  let target;
  let key;
  if (expected === 1) { target = 1; key = 'win-league'; }
  else if (promotion && expected <= promotion + 1) { target = promotion; key = 'promotion'; }
  else if (expected <= 4 && league.tier === 1) { target = 4; key = 'top-four'; }
  else if (expected <= Math.ceil(size / 2)) { target = Math.ceil(size / 2); key = 'top-half'; }
  else if (relegation) { target = size - relegation; key = 'avoid-relegation'; }
  else { target = size - 1; key = 'respectable'; }
  objectives.push({ id: 'league', type: 'league', key, target, importance: 'crucial' });
  const cup = Object.values(career.season.comps).find((comp) => comp.type === 'cup' && comp.teams.includes(club.id));
  if (cup) {
    const rank = cup.teams.indexOf(club.id) / cup.teams.length;
    const stage = rank < 0.05 ? 'winner' : rank < 0.15 ? 'sf' : rank < 0.35 ? 'qf' : 'r16';
    objectives.push({ id: 'cup', type: 'cup', comp: cup.id, stage, importance: rank < 0.15 ? 'high' : 'medium' });
  }
  const continental = Object.values(career.season.comps).find((comp) => comp.type === 'continental' && comp.teams.includes(club.id));
  if (continental) {
    const ranked = continental.teams.slice().sort((a, b) => world.clubs[b].rating - world.clubs[a].rating);
    const position = ranked.indexOf(club.id);
    const stage = position < 2 ? 'sf' : position < 6 ? 'qf' : position < 14 ? 'r16' : 'group';
    objectives.push({ id: 'continental', type: 'continental', comp: continental.id, stage, importance: position < 6 ? 'high' : 'medium' });
  }
  objectives.push({ id: 'wages', type: 'wages', importance: 'medium' });
  if (club.youthFocus) objectives.push({ id: 'youth', type: 'youth', minutes: 1500, importance: 'medium' });
  career.board.objectives = objectives;
  career.board.expected = expected;
  return objectives;
}

/** Progress of each objective, for the office screen. */
export function objectiveStatus(career) {
  const world = career.world;
  const club = world.clubs[career.clubId];
  const leagueComp = career.season.comps[`L:${club.leagueId}`];
  const table = leagueComp ? sortTable(Object.values(leagueComp.table)) : [];
  const position = table.findIndex((row) => row.team === career.clubId) + 1;
  return career.board.objectives.map((objective) => {
    if (objective.type === 'league') {
      const played = table.find((row) => row.team === career.clubId)?.p || 0;
      const ok = position <= objective.target;
      return { ...objective, current: position, played, state: played === 0 ? 'pending' : ok ? 'on-track' : position <= objective.target + 2 ? 'close' : 'off-track' };
    }
    if (objective.type === 'cup' || objective.type === 'continental') {
      const comp = career.season.comps[objective.comp];
      const reached = comp ? stageReached(career.season, comp, career.clubId) : null;
      const alive = comp && !comp.finished ? comp.type === 'cup' ? comp.alive.includes(career.clubId) || comp.rounds.at(-1)?.fixtures.some((id) => [career.season.fixtures[id].home, career.season.fixtures[id].away].includes(career.clubId)) : true : comp?.winner === career.clubId;
      const done = stageIndex(reached) >= stageIndex(objective.stage);
      return { ...objective, reached, state: done ? 'done' : alive ? 'on-track' : 'failed' };
    }
    if (objective.type === 'wages') {
      const bill = clubSquad(world, career.clubId).reduce((total, p) => total + (p.wage || 0) * (p.loanWageShare ?? 1), 0);
      return { ...objective, current: bill, limit: career.finances.wageBudget, state: bill <= career.finances.wageBudget ? 'on-track' : 'off-track' };
    }
    if (objective.type === 'youth') {
      const minutes = clubSquad(world, career.clubId).filter((p) => p.age <= 21).reduce((total, p) => total + (p.stats?.mins || 0), 0);
      return { ...objective, current: minutes, state: minutes >= objective.minutes ? 'done' : 'on-track' };
    }
    return { ...objective, state: 'pending' };
  });
}

/** After every own match: the board watches results against expectations. */
export function boardAfterMatch(career, fixture) {
  const home = fixture.home === career.clubId;
  const own = home ? fixture.hg : fixture.ag;
  const rival = home ? fixture.ag : fixture.hg;
  const world = career.world;
  const rivalId = home ? fixture.away : fixture.home;
  const gap = (world.clubs[career.clubId].rating - (world.clubs[rivalId]?.rating ?? 60)) / 6;
  const result = own > rival ? 1 : own < rival ? -1 : 0;
  const expectation = clamp(gap, -1.2, 1.2);
  const delta = result === 1 ? 2.2 - expectation * 0.9 : result === 0 ? -expectation * 1.4 : -2.4 - expectation * 1.2;
  career.board.confidence = clamp(career.board.confidence + delta * (fixture.comp.startsWith('F') ? 0.2 : 1), 0, 100);
  career.fans = clamp((career.fans ?? 65) + delta * 1.3, 0, 100);
}

/** Monthly look at the league position against the target. */
export function boardMonthly(career) {
  const status = objectiveStatus(career);
  const league = status.find((o) => o.type === 'league');
  if (league && league.played >= 6) {
    const drift = league.state === 'on-track' ? 2.5 : league.state === 'close' ? -1 : -5;
    career.board.confidence = clamp(career.board.confidence + drift, 0, 100);
  }
  if (career.finances.balance < -seasonIncome(career.world.clubs[career.clubId], career.world.leagues[career.world.clubs[career.clubId].leagueId], career.year).tv) {
    career.board.confidence = clamp(career.board.confidence - 4, 0, 100);
  }
  checkJobSecurity(career);
}

export function checkJobSecurity(career) {
  const confidence = career.board.confidence;
  if (confidence < 22 && !career.board.warned) {
    career.board.warned = true;
    addInbox(career, { kind: 'board-warning', confidence: Math.round(confidence), stop: true });
  } else if (confidence >= 35) {
    career.board.warned = false;
  }
  if (confidence < 9 && career.board.warned && !career.sacked) {
    career.sacked = { date: career.date, clubId: career.clubId };
    addInbox(career, { kind: 'sacked', club: career.clubId, stop: true });
    addNews(career, { kind: 'sacked', club: career.clubId, manager: career.managerName });
    career.jobOffers = generateJobOffers(career, 'sacked');
  }
}

/** End-of-season verdict: objectives, reputation, next budget. */
export function seasonReview(career) {
  const status = objectiveStatus(career);
  const weights = { crucial: 3, high: 2, medium: 1 };
  let score = 0;
  let total = 0;
  for (const objective of status) {
    const w = weights[objective.importance] || 1;
    total += w;
    const met = objective.state === 'done' || objective.state === 'on-track';
    const exceeded = objective.type === 'league' && objective.current < objective.target;
    score += w * (met ? (exceeded ? 1.25 : 1) : objective.state === 'close' ? 0.4 : 0);
  }
  const grade = total ? score / total : 0.5;
  const confidenceDelta = Math.round((grade - 0.6) * 45);
  career.board.confidence = clamp(career.board.confidence + confidenceDelta, 0, 100);
  const trophies = (career.trophies || []).filter((t) => t.year === career.year).length;
  const before = career.reputation;
  career.reputation = clamp(career.reputation + (grade - 0.55) * 14 + trophies * 4, 1, 100);
  return { status, grade, confidenceDelta, reputationDelta: Math.round((career.reputation - before) * 10) / 10, trophies };
}

/** Budgets for the coming season. */
export function nextBudgets(career, review) {
  const club = career.world.clubs[career.clubId];
  const league = career.world.leagues[club.leagueId];
  const income = seasonIncome(club, league, career.year + 1);
  const base = (income.tv + income.commercial) * 0.32;
  const surplus = Math.max(0, career.finances.balance) * 0.12;
  const bonus = review ? (review.grade - 0.5) * base * 0.5 : 0;
  const transferBudget = roundMoney(Math.max(base * 0.25, base + surplus + bonus + Math.max(0, career.finances.transferBudget) * 0.5));
  const bill = clubSquad(career.world, career.clubId).reduce((total, p) => total + (p.wage || 0), 0);
  const wageBudget = roundMoney(Math.max(bill * 1.06, (income.tv + income.commercial) * 0.62 / 52));
  return { transferBudget, wageBudget };
}

/** Clubs (and nations) interested in the manager. */
export function generateJobOffers(career, reason = 'season') {
  const world = career.world;
  const random = createStream(career.seed, 'jobs', career.date, reason);
  const reputation = career.reputation;
  const level = reputation / 20; // 0-5 like club reputation
  const current = world.clubs[career.clubId];
  const pool = Object.values(world.clubs).filter((club) => !club.external && club.selectable && club.id !== career.clubId
    && (reason === 'sacked' ? club.rep <= Math.max(1, current.rep - 1) : club.rep >= current.rep && club.rep <= level + 0.7));
  const offers = [];
  for (let i = 0; i < 3 && pool.length; i += 1) {
    const club = weighted(random, pool, (c) => Math.pow(c.rating, 2) * (c.rep + 1));
    pool.splice(pool.indexOf(club), 1);
    if (reason !== 'sacked' && random() < 0.45) continue;
    offers.push({ id: `job-${career.serial.jobs += 1}`, type: 'club', clubId: club.id, expires: career.date, date: career.date });
  }
  if (!career.national && reputation >= 42 && random() < 0.6) {
    const nations = Object.values(world.countries).filter((c) => c.confederation && c.confederation !== 'OFC'
      && (c.international_reputation ?? 0) <= level + 0.5 && (c.international_reputation ?? 0) >= Math.max(0, level - 2.2));
    if (nations.length) {
      const nation = nations[Math.floor(random() * nations.length)];
      offers.push({ id: `job-${career.serial.jobs += 1}`, type: 'nation', fifa: nation.fifa, date: career.date });
    }
  }
  for (const offer of offers) addInbox(career, { kind: 'job-offer', offer: offer.id, club: offer.clubId, fifa: offer.fifa, stop: reason !== 'season' });
  return offers;
}

/** National team performance against what the federation expected. */
export function nationalReview(career, comp) {
  if (!career.national || !comp) return null;
  const team = nationId(career.national.fifa);
  const reached = stageReached(career.season, comp, team);
  const ranked = comp.teams.slice().sort((a, b) => (comp.seed?.[b] ?? 0) - (comp.seed?.[a] ?? 0));
  const seedRank = ranked.indexOf(team);
  const expected = seedRank < 2 ? 'sf' : seedRank < 6 ? 'qf' : seedRank < 12 ? 'r16' : 'group';
  const ok = stageIndex(reached) >= stageIndex(expected);
  career.national.confidence = clamp((career.national.confidence ?? 60) + (ok ? 15 : -25), 0, 100);
  career.reputation = clamp(career.reputation + (reached === 'winner' ? 10 : ok ? 3 : -2), 1, 100);
  return { reached, expected, ok };
}

export const isNationTeam = isNation;
export { nationRating, moneyScale };
