/**
 * Transfers, the FC 27 way: enquire first, then talk to the club, then to the
 * player's agent. Each step can take days, a rival can gate-crash, and
 * pushing too hard raises the tension until the other side hangs up.
 *
 * The log of every negotiation is a list of {who, key, params}; texts.js turns
 * them into plain-language sentences in the interface language.
 */
import { createStream, clamp, addDays, roundMoney, weighted, ageOn, daysBetween } from './util.js';
import { expectedWage, marketValue } from './economy.js';
import { clubSquad, dynamicOvr, assignNumbers, pickLineup } from './world.js';
import { windowOpen, nextWindowDate } from './calendar.js';
import { generateName } from './names.js';
import { addNews, addInbox } from './inbox.js';
import { POSITION_LINE } from './positions.js';

export const ROLES = ['star', 'important', 'rotation', 'backup', 'prospect'];

/* ── People on the other end of the phone ── */

export function directorOf(career, clubId) {
  const club = career.world.clubs[clubId];
  const random = createStream(career.seed, 'director', clubId);
  return { name: generateName(random, club?.country, career.world.leagues[club?.leagueId]?.conf), role: 'director' };
}

export function agentOf(career, playerId) {
  const p = career.world.players[playerId];
  const random = createStream(career.seed, 'agent', playerId);
  return { name: generateName(random, p?.nat, null), role: 'agent' };
}

/* ── Valuations ── */

export function contractYearsLeft(career, player) {
  return Math.max(0, (player.contractEnd || career.year + 1) - (career.year + 1));
}

/** Where a player ranks in his club's squad by quality (1 = best). */
function squadRank(career, player) {
  const squad = clubSquad(career.world, player.clubId).sort((a, b) => b.ovr - a.ovr);
  return squad.findIndex((p) => p.id === player.id) + 1 || squad.length;
}

export function askingPrice(career, player) {
  if (!player.clubId) return 0;
  const club = career.world.clubs[player.clubId];
  const value = player.value;
  const rank = squadRank(career, player);
  const importance = rank <= 2 ? 1.65 : rank <= 5 ? 1.4 : rank <= 11 ? 1.2 : rank <= 16 ? 1 : 0.85;
  const years = contractYearsLeft(career, player);
  const contract = years <= 0 ? 0.55 : years === 1 ? 0.8 : 1;
  const listed = career.transfers.listedByAi?.[player.id] ? 0.85 : 1;
  const wealth = club.rep >= 4 ? 1.12 : club.rep <= 1 ? 0.92 : 1;
  const raw = value * importance * contract * listed * wealth;
  if (player.releaseClause) return Math.min(roundMoney(raw), player.releaseClause);
  return roundMoney(raw);
}

/** Would the club even talk? Stars of big clubs are not for sale mid-season. */
export function openToSell(career, player) {
  const club = career.world.clubs[player.clubId];
  if (!club) return true;
  const rank = squadRank(career, player);
  const buyer = career.world.clubs[career.clubId];
  if (rank <= 2 && club.rep >= 4 && buyer.rep < club.rep) return false;
  if (rank <= 1 && club.rep >= 3 && contractYearsLeft(career, player) >= 2 && buyer.rep < club.rep) return false;
  return true;
}

/** How keen a player is on joining the manager's club: 0-100. */
export function playerInterest(career, player) {
  const world = career.world;
  const mine = world.clubs[career.clubId];
  const theirs = world.clubs[player.clubId] || { rep: 0, rating: 40 };
  const myLeague = world.leagues[mine.leagueId];
  const theirLeague = world.leagues[theirs.leagueId];
  let score = 52;
  score += (mine.rep - theirs.rep) * 11;
  score += ((myLeague?.strength ?? 0) - (theirLeague?.strength ?? 0)) * 4;
  const squad = clubSquad(world, career.clubId);
  const better = squad.filter((p) => POSITION_LINE[p.pos] === POSITION_LINE[player.pos] && p.ovr > player.ovr).length;
  score += better === 0 ? 10 : better === 1 ? 4 : better >= 3 ? -14 : -4;
  if (player.age <= 23 && better >= 2) score -= 8;
  if (player.nat === mine.country) score += 6;
  if (!player.clubId) score += 12;
  if (career.season?.comps && Object.values(career.season.comps).some((c) => c.type === 'continental' && c.teams.includes(career.clubId))) score += 5;
  if (player.ovr - mine.rating > 10) score -= (player.ovr - mine.rating - 10) * 2.2;
  score += (createStream(career.seed, 'interest', player.id, career.year)() - 0.5) * 16;
  return Math.round(clamp(score, 0, 100));
}

export const interestLabel = (value) => (value >= 66 ? 'high' : value >= 44 ? 'medium' : value >= 25 ? 'low' : 'none');

export function wageDemand(career, player, role, interest = playerInterest(career, player)) {
  const mine = career.world.clubs[career.clubId];
  const base = expectedWage(player, mine.rep, career.year, role);
  const keen = interest >= 66 ? 0.94 : interest >= 44 ? 1.04 : 1.18;
  return Math.max(base * keen, (player.wage || 0) * (player.clubId ? 1.08 : 0.9));
}

export function roleExpected(career, player) {
  const squad = clubSquad(career.world, career.clubId).filter((p) => p.id !== player.id).sort((a, b) => b.ovr - a.ovr);
  const sameLine = squad.filter((p) => POSITION_LINE[p.pos] === POSITION_LINE[player.pos]);
  const better = sameLine.filter((p) => p.ovr >= player.ovr).length;
  if (player.age <= 20 && player.pot - player.ovr >= 8) return better >= 2 ? 'prospect' : 'rotation';
  if (better === 0 && player.ovr >= (squad[2]?.ovr ?? 0)) return 'star';
  if (better <= 1) return 'important';
  if (better <= 3) return 'rotation';
  return 'backup';
}

export function contractYearsWanted(player) {
  return player.age <= 23 ? 5 : player.age <= 27 ? 4 : player.age <= 30 ? 3 : player.age <= 32 ? 2 : 1;
}

/* ── Money of the manager's club ── */

export function wageBill(career, clubId = career.clubId) {
  return clubSquad(career.world, clubId).reduce((total, p) => total + (p.wage || 0) * (p.loanWageShare ?? 1), 0);
}

export function wageRoom(career) {
  return career.finances.wageBudget - wageBill(career) - pendingWages(career);
}

function pendingWages(career) {
  return career.transfers.pending.filter((deal) => deal.to === career.clubId).reduce((total, deal) => total + (deal.wage || 0), 0);
}

export function transferRoom(career) {
  return career.finances.transferBudget;
}

/* ── Negotiation lifecycle ── */

function log(neg, who, key, params = {}) {
  neg.log.push({ who, key, params, date: neg.updated });
}

function newNegotiation(career, kind, player, extra = {}) {
  const id = `neg-${career.transfers.serial += 1}`;
  return {
    id, kind, playerId: player.id, clubId: player.clubId, stage: 'enquiry', status: 'waiting', tension: 8, rounds: 0, waitUntil: null,
    created: career.date, updated: career.date, log: [], clubTerms: null, ask: null, playerTerms: null, playerAsk: null,
    interest: playerInterest(career, player), rival: null, ...extra,
  };
}

const activeNegotiation = (career, playerId) => career.transfers.negotiations.find((neg) => neg.playerId === playerId && !['done', 'failed'].includes(neg.status));

export function canApproach(career, player) {
  if (!player || player.clubId === career.clubId || player.retired) return 'invalid';
  if (activeNegotiation(career, player.id)) return 'already';
  const cooldown = career.transfers.cooldowns[player.id];
  if (cooldown && cooldown > career.date) return 'cooldown';
  if (career.transfers.pending.some((deal) => deal.playerId === player.id)) return 'pending';
  if (player.generated === 'national') return 'unavailable';
  return 'ok';
}

/** Step 1: ask the club (or, for free agents, the agent) whether talks are possible. */
export function enquire(career, playerId, kind = 'buy') {
  const player = career.world.players[playerId];
  const check = canApproach(career, player);
  if (check !== 'ok') return { error: check };
  const free = !player.clubId;
  const preContract = !free && contractYearsLeft(career, player) === 0 && career.date >= `${career.year + 1}-01-01`;
  const neg = newNegotiation(career, free ? 'free' : preContract && kind === 'buy' ? 'precontract' : kind, player);
  const random = createStream(career.seed, neg.id, 'wait');
  neg.waitUntil = addDays(career.date, free || neg.kind === 'precontract' ? 1 : 1 + Math.floor(random() * 2));
  log(neg, 'you', kind === 'loan-in' ? 'enquiry-loan' : 'enquiry', { club: player.clubId, player: player.id, days: daysBetween(career.date, neg.waitUntil) });
  career.transfers.negotiations.unshift(neg);
  return { negotiation: neg };
}

/** Responses that arrive with the calendar. */
export function progressNegotiations(career) {
  const updates = [];
  for (const neg of career.transfers.negotiations) {
    if (neg.status !== 'waiting' || !neg.waitUntil || neg.waitUntil > career.date) continue;
    neg.updated = career.date;
    const player = career.world.players[neg.playerId];
    if (!player || player.retired || (neg.clubId && player.clubId !== neg.clubId && neg.kind !== 'sell')) {
      neg.status = 'failed'; log(neg, 'system', 'moved-elsewhere', { player: neg.playerId }); updates.push(neg); continue;
    }
    if (neg.stage === 'enquiry') resolveEnquiry(career, neg, player);
    else if (neg.stage === 'club-agreed') openPlayerStage(career, neg, player);
    updates.push(neg);
  }
  for (const neg of updates) {
    addInbox(career, { kind: 'negotiation', negotiation: neg.id, player: neg.playerId, status: neg.status, stage: neg.stage, stop: neg.status === 'your-turn' });
  }
  return updates;
}

function resolveEnquiry(career, neg, player) {
  const interest = neg.interest;
  if (neg.kind === 'free' || neg.kind === 'precontract') {
    if (interest < 25) { neg.status = 'failed'; log(neg, 'agent', 'player-not-interested', { player: player.id }); return; }
    openPlayerStage(career, neg, player);
    return;
  }
  if (neg.kind === 'loan-in') {
    const rank = squadRank(career, player);
    if (rank <= 11) { neg.status = 'failed'; log(neg, 'club', 'loan-refused-starter', { player: player.id }); return; }
    neg.stage = 'club'; neg.status = 'your-turn';
    neg.ask = { wageShare: rank <= 16 ? 100 : 75, fee: 0, option: roundMoney(askingPrice(career, player) * 1.05) };
    neg.clubTerms = { wageShare: 50, fee: 0, option: 0 };
    log(neg, 'club', 'loan-open', { player: player.id, share: neg.ask.wageShare });
    return;
  }
  if (!openToSell(career, player)) {
    neg.status = 'failed';
    career.transfers.cooldowns[player.id] = addDays(career.date, 45);
    log(neg, 'club', 'not-for-sale', { player: player.id });
    return;
  }
  if (interest < 20) { neg.status = 'failed'; log(neg, 'agent', 'player-not-interested', { player: player.id }); return; }
  const ask = askingPrice(career, player);
  neg.stage = 'club'; neg.status = 'your-turn';
  neg.ask = { fee: ask, instalments: 1, sellOn: 0, bonus: 0 };
  neg.clubTerms = { fee: roundMoney(Math.min(ask, player.value) * 0.9), instalments: 1, sellOn: 0, bonus: 0, start: windowOpen(career.date, career.season.dates) ? 'now' : 'window' };
  log(neg, 'club', player.releaseClause && ask >= player.releaseClause ? 'open-clause' : 'open', { player: player.id, fee: ask, clause: player.releaseClause || null });
}

/** What an offer is worth to the selling club. */
export function offerWorth(offer, value) {
  const instalmentCost = 1 - (Math.max(1, offer.instalments || 1) - 1) * 0.035;
  return (offer.fee + (offer.bonus || 0) * 0.45) * instalmentCost + value * (offer.sellOn || 0) / 100 * 0.55;
}

/** Step 2: your offer to the club. They answer at once - you are on the phone. */
export function offerToClub(career, negId, terms) {
  const neg = career.transfers.negotiations.find((n) => n.id === negId);
  if (!neg || neg.stage !== 'club' || neg.status !== 'your-turn') return { error: 'not-your-turn' };
  const player = career.world.players[neg.playerId];
  neg.updated = career.date;
  neg.rounds += 1;
  neg.clubTerms = { ...neg.clubTerms, ...terms };
  const random = createStream(career.seed, neg.id, 'club', neg.rounds);
  if (neg.kind === 'loan-in') return loanReply(career, neg, player, random);
  const totalNeed = neg.clubTerms.fee;
  if (totalNeed > transferRoom(career)) { log(neg, 'system', 'no-budget', { fee: totalNeed }); return { negotiation: neg }; }
  log(neg, 'you', 'offer', { ...neg.clubTerms });
  const worth = offerWorth(neg.clubTerms, player.value);
  const target = offerWorth(neg.ask, player.value);
  const flex = 0.015 + neg.rounds * 0.012 + random() * 0.025;
  if (worth >= target * (1 - flex)) {
    neg.stage = 'club-agreed'; neg.status = 'waiting';
    neg.waitUntil = addDays(career.date, 1 + Math.floor(random() * 2));
    neg.tension = Math.max(0, neg.tension - 10);
    log(neg, 'club', 'club-accept', { fee: neg.clubTerms.fee });
    maybeRival(career, neg, player, random);
    return { negotiation: neg, accepted: true };
  }
  const ratio = worth / target;
  neg.tension = clamp(neg.tension + (ratio < 0.7 ? 34 : ratio < 0.85 ? 20 : 11) + random() * 6, 0, 100);
  if (neg.tension >= 100 || neg.rounds >= 6) {
    neg.status = 'failed'; neg.stage = 'club';
    career.transfers.cooldowns[player.id] = addDays(career.date, 21);
    log(neg, 'club', 'hang-up', { player: player.id });
    return { negotiation: neg };
  }
  if (ratio < 0.7) {
    log(neg, 'club', 'lowball', { fee: neg.ask.fee });
  } else {
    // They come down a little, more when the offer is close.
    const step = (target - worth) * (ratio > 0.93 ? 0.45 : 0.25);
    neg.ask = { ...neg.ask, fee: roundMoney(Math.max(neg.clubTerms.fee, neg.ask.fee - step)) };
    const wantsSellOn = !neg.ask.sellOn && player.age <= 23 && random() < 0.5;
    if (wantsSellOn) neg.ask.sellOn = 10;
    log(neg, 'club', wantsSellOn ? 'counter-sellon' : ratio > 0.9 ? 'counter' : 'counter-far', { fee: neg.ask.fee, sellOn: neg.ask.sellOn });
  }
  return { negotiation: neg };
}

/** Accept the club's current demand as it stands. */
export function acceptClubAsk(career, negId) {
  const neg = career.transfers.negotiations.find((n) => n.id === negId);
  if (!neg || neg.stage !== 'club' || neg.status !== 'your-turn') return { error: 'not-your-turn' };
  const terms = neg.kind === 'loan-in' ? { ...neg.ask } : { ...neg.clubTerms, fee: neg.ask.fee, sellOn: Math.max(neg.clubTerms.sellOn || 0, neg.ask.sellOn || 0) };
  neg.ask = { ...neg.ask };
  return offerToClub(career, negId, { ...terms, _accept: true });
}

function loanReply(career, neg, player, random) {
  log(neg, 'you', 'offer-loan', { ...neg.clubTerms });
  const share = neg.clubTerms.wageShare;
  if (share >= neg.ask.wageShare - (neg.rounds > 1 ? 10 : 0) || neg.clubTerms._accept) {
    neg.stage = 'club-agreed'; neg.status = 'waiting'; neg.waitUntil = addDays(career.date, 1);
    log(neg, 'club', 'loan-accept', { share });
    return { negotiation: neg, accepted: true };
  }
  neg.tension = clamp(neg.tension + 18 + random() * 8, 0, 100);
  if (neg.tension >= 100) { neg.status = 'failed'; log(neg, 'club', 'hang-up', { player: player.id }); return { negotiation: neg }; }
  neg.ask = { ...neg.ask, wageShare: Math.max(share, neg.ask.wageShare - 10) };
  log(neg, 'club', 'loan-counter', { share: neg.ask.wageShare });
  return { negotiation: neg };
}

/** A rival bid can arrive while the player thinks about it. */
function maybeRival(career, neg, player, random) {
  if (player.ovr < 74 || random() > 0.22) return;
  const rivals = Object.values(career.world.clubs).filter((club) => !club.external && club.id !== career.clubId && club.id !== player.clubId
    && club.rep >= career.world.clubs[career.clubId].rep - 1 && club.budget > neg.clubTerms.fee * 1.1);
  if (!rivals.length) return;
  const rival = rivals[Math.floor(random() * rivals.length)];
  neg.rival = { clubId: rival.id, fee: roundMoney(neg.clubTerms.fee * (1.08 + random() * 0.12)) };
}

function openPlayerStage(career, neg, player) {
  if (neg.rival && neg.stage === 'club-agreed') {
    // The selling club reopens talks: match the rival or lose him.
    neg.stage = 'club'; neg.status = 'your-turn';
    neg.ask = { ...neg.ask, fee: neg.rival.fee };
    neg.tension = clamp(neg.tension + 10, 0, 100);
    log(neg, 'club', 'rival-bid', { rival: neg.rival.clubId, fee: neg.rival.fee });
    neg.rival = { ...neg.rival, announced: true };
    neg.rivalHandled = true;
    return;
  }
  neg.stage = 'player'; neg.status = 'your-turn';
  const role = roleExpected(career, player);
  const years = contractYearsWanted(player);
  const wage = roundMoney(wageDemand(career, player, role, neg.interest));
  const bonus = neg.kind === 'loan-in' ? 0 : roundMoney(wage * (neg.kind === 'free' || neg.kind === 'precontract' ? 26 : 8));
  neg.playerAsk = { wage: neg.kind === 'loan-in' ? player.wage : wage, years: neg.kind === 'loan-in' ? 1 : years, role, signingBonus: bonus, releaseClause: 0 };
  neg.playerTerms = neg.kind === 'loan-in' ? { ...neg.playerAsk } : { wage: roundMoney(wage * 0.9), years, role, signingBonus: roundMoney(bonus * 0.6), releaseClause: 0 };
  neg.tension = Math.max(10, neg.tension - 15);
  log(neg, 'agent', neg.kind === 'loan-in' ? 'agent-loan-open' : 'agent-open', { player: player.id, wage, role, years });
}

const ROLE_RANK = { star: 4, important: 3, rotation: 2, backup: 1, prospect: 1.5 };

/** Step 3: personal terms with the agent. */
export function offerToPlayer(career, negId, terms) {
  const neg = career.transfers.negotiations.find((n) => n.id === negId);
  if (!neg || neg.stage !== 'player' || neg.status !== 'your-turn') return { error: 'not-your-turn' };
  const player = career.world.players[neg.playerId];
  neg.updated = career.date;
  neg.rounds += 1;
  neg.playerTerms = { ...neg.playerTerms, ...terms };
  const t = neg.playerTerms;
  const random = createStream(career.seed, neg.id, 'agent', neg.rounds);
  const effectiveWage = neg.kind === 'loan-in' ? player.wage * (neg.clubTerms?.wageShare ?? 50) / 100 : t.wage;
  if (effectiveWage - (player.clubId === career.clubId ? player.wage : 0) > wageRoom(career)) {
    log(neg, 'system', 'no-wage-room', { wage: t.wage });
    return { negotiation: neg };
  }
  if (neg.kind !== 'loan-in' && t.signingBonus > transferRoom(career) - (neg.clubTerms?.fee || 0)) {
    log(neg, 'system', 'no-budget', { fee: t.signingBonus });
    return { negotiation: neg };
  }
  log(neg, 'you', 'offer-contract', { ...t });
  const ask = neg.playerAsk;
  const roleGap = (ROLE_RANK[ask.role] || 2) - (ROLE_RANK[t.role] || 2);
  if (roleGap >= 1.5 && !t._accept) {
    neg.tension = clamp(neg.tension + 20, 0, 100);
    log(neg, 'agent', 'role-too-low', { role: ask.role });
    if (neg.tension >= 100) return collapsePlayer(career, neg);
    return { negotiation: neg };
  }
  const roleBonus = roleGap < 0 ? 1 + Math.abs(roleGap) * 0.04 : 1 - roleGap * 0.05;
  const yearsFit = 1 - Math.abs((t.years || ask.years) - ask.years) * 0.02;
  const worth = (t.wage * roleBonus * yearsFit) + t.signingBonus / 40 - (t.releaseClause && t.releaseClause < player.value * 2 ? t.wage * 0.04 : 0);
  const target = ask.wage + ask.signingBonus / 40;
  const flex = 0.02 + neg.rounds * 0.01 + random() * 0.02;
  if (worth >= target * (1 - flex) || t._accept) {
    neg.status = 'agreed'; neg.stage = 'final';
    log(neg, 'agent', 'agent-accept', { player: player.id });
    completeDeal(career, neg);
    return { negotiation: neg, accepted: true };
  }
  const ratio = worth / target;
  neg.tension = clamp(neg.tension + (ratio < 0.8 ? 28 : 13) + random() * 6, 0, 100);
  if (neg.tension >= 100 || neg.rounds >= 9) return collapsePlayer(career, neg);
  neg.playerAsk = { ...ask, wage: roundMoney(Math.max(t.wage, ask.wage - (ask.wage - t.wage) * 0.2)) };
  log(neg, 'agent', ratio < 0.8 ? 'agent-insulted' : 'agent-counter', { wage: neg.playerAsk.wage, bonus: neg.playerAsk.signingBonus });
  return { negotiation: neg };
}

export function acceptPlayerAsk(career, negId) {
  const neg = career.transfers.negotiations.find((n) => n.id === negId);
  if (!neg || neg.stage !== 'player') return { error: 'not-your-turn' };
  return offerToPlayer(career, negId, { ...neg.playerAsk, _accept: true });
}

function collapsePlayer(career, neg) {
  neg.status = 'failed';
  career.transfers.cooldowns[neg.playerId] = addDays(career.date, 30);
  log(neg, 'agent', 'agent-walks', { player: neg.playerId });
  return { negotiation: neg };
}

export function walkAway(career, negId) {
  const neg = career.transfers.negotiations.find((n) => n.id === negId);
  if (!neg || ['done', 'failed'].includes(neg.status)) return { error: 'closed' };
  neg.status = 'failed';
  neg.updated = career.date;
  log(neg, 'you', 'walk-away', {});
  return { negotiation: neg };
}

/** Everything agreed: pay, schedule instalments and move the player. */
function completeDeal(career, neg) {
  const player = career.world.players[neg.playerId];
  if (neg.kind === 'renew') {
    const terms = neg.playerTerms;
    player.wage = terms.wage;
    player.contractEnd = career.year + terms.years + (career.date >= `${career.year + 1}-01-01` ? 1 : 0);
    player.role = terms.role;
    player.releaseClause = terms.releaseClause || 0;
    player.morale = clamp((player.morale ?? 65) + 10, 0, 100);
    if (terms.signingBonus) { career.finances.transferBudget -= terms.signingBonus; ledger(career, -terms.signingBonus, 'signing-bonus', { player: player.id }); }
    neg.status = 'done';
    addNews(career, { kind: 'renewal', player: player.id, until: player.contractEnd });
    return;
  }
  const from = player.clubId;
  const fee = neg.kind === 'buy' ? neg.clubTerms.fee : 0;
  const terms = neg.playerTerms;
  const instalments = Math.max(1, neg.clubTerms?.instalments || 1);
  const upfront = roundMoney(fee / instalments);
  const deal = {
    id: neg.id, playerId: player.id, from, to: career.clubId, fee, kind: neg.kind, wage: terms.wage, years: terms.years, role: terms.role,
    signingBonus: terms.signingBonus, releaseClause: terms.releaseClause || 0, sellOn: neg.clubTerms?.sellOn || 0, bonus: neg.clubTerms?.bonus || 0,
    wageShare: neg.kind === 'loan-in' ? (neg.clubTerms.wageShare || 50) / 100 : 1, option: neg.kind === 'loan-in' ? neg.ask.option : 0,
    joinDate: neg.kind === 'precontract' ? career.season.dates.nextStart : windowOpen(career.date, career.season.dates) ? career.date : nextWindowDate(career.date, career.season.dates),
  };
  if (fee) {
    career.finances.transferBudget -= fee;
    for (let i = 1; i < instalments; i += 1) career.finances.schedule.push({ date: addDays(career.date, 365 * i), amount: -upfront, kind: 'instalment', player: player.id, club: from });
    ledger(career, -upfront, 'transfer-out', { player: player.id, club: from });
    if (from && career.world.clubs[from]) career.world.clubs[from].budget += fee * 0.6;
  }
  if (terms.signingBonus) { career.finances.transferBudget -= terms.signingBonus; ledger(career, -terms.signingBonus, 'signing-bonus', { player: player.id }); }
  neg.status = 'done';
  neg.deal = deal;
  if (deal.joinDate <= career.date) executeArrival(career, deal);
  else career.transfers.pending.push(deal);
  const big = fee >= career.world.players[player.id].value * 0.8 && player.ovr >= career.world.clubs[career.clubId].rating;
  career.flags.reveal = { playerId: player.id, fee, kind: neg.kind, big, joinDate: deal.joinDate };
}

export function executeArrival(career, deal) {
  const world = career.world;
  const player = world.players[deal.playerId];
  const fromClub = world.clubs[player.clubId];
  if (fromClub) fromClub.playerIds = fromClub.playerIds.filter((id) => id !== player.id);
  if (deal.kind === 'loan-in') player.loan = { from: player.clubId, until: career.season.dates.seasonEnd, option: deal.option, wageShare: deal.wageShare };
  player.loanWageShare = deal.kind === 'loan-in' ? deal.wageShare : undefined;
  player.clubId = deal.to;
  world.clubs[deal.to].playerIds.push(player.id);
  if (deal.to === career.clubId) {
    if (deal.kind !== 'loan-in') {
      player.wage = deal.wage;
      player.contractEnd = career.year + (deal.kind === 'precontract' ? 1 : 0) + (deal.years || 3);
      player.releaseClause = deal.releaseClause || 0;
      player.role = deal.role;
      if (deal.sellOn) player.sellOn = { club: deal.from, pct: deal.sellOn };
    }
    player.joined = career.date;
    player.number = 0;
    player.morale = clamp((player.morale ?? 70) + 8, 0, 100);
    assignNumbers(world.clubs[deal.to], world.players);
    if (!career.autoLineup) career.bench = [...(career.bench || [])];
  }
  if (fromClub) assignNumbers(fromClub, world.players);
  logTransfer(career, { date: career.date, playerId: player.id, from: deal.from, to: deal.to, fee: deal.fee, kind: deal.kind });
  addNews(career, { kind: deal.to === career.clubId ? 'signing' : 'sale', player: player.id, from: deal.from, to: deal.to, fee: deal.fee, loan: deal.kind === 'loan-in' || deal.kind === 'loan-out' });
}

export function logTransfer(career, entry) {
  career.transfers.log.unshift(entry);
  if (career.transfers.log.length > 600) career.transfers.log.length = 600;
}

function ledger(career, amount, kind, params = {}) {
  career.finances.ledger.unshift({ date: career.date, amount, kind, ...params });
  if (career.finances.ledger.length > 400) career.finances.ledger.length = 400;
  career.finances.balance += amount;
}
export { ledger };

/* ── Selling: offers that arrive for your players ── */

export function listPlayer(career, playerId, type = 'sale', asking = null) {
  const player = career.world.players[playerId];
  if (!player || player.clubId !== career.clubId) return { error: 'invalid' };
  career.transfers.listed[playerId] = { type, asking: asking ?? roundMoney(player.value * (type === 'sale' ? 1.1 : 0)), since: career.date };
  return { ok: true };
}

export function unlistPlayer(career, playerId) {
  delete career.transfers.listed[playerId];
  return { ok: true };
}

/** Bids from AI clubs for the manager's players, mostly during windows. */
export function generateIncomingOffers(career) {
  const dates = career.season.dates;
  const open = windowOpen(career.date, dates);
  const deadline = career.date === dates.summerClose || career.date === dates.winterClose;
  const random = createStream(career.seed, 'offers', career.date);
  const chance = open ? (deadline ? 0.55 : 0.16) : 0.025;
  if (random() > chance) return;
  const squad = clubSquad(career.world, career.clubId).filter((p) => !p.loan && !career.transfers.offers.some((o) => o.playerId === p.id && o.status === 'open'));
  if (!squad.length) return;
  const target = weighted(random, squad, (p) => (career.transfers.listed[p.id] ? 6 : 1) * Math.pow(Math.max(1, p.ovr - 55), 1.6) * (p.age <= 25 ? 1.4 : 1));
  const loan = career.transfers.listed[target.id]?.type === 'loan';
  const buyers = Object.values(career.world.clubs).filter((club) => !club.external && club.id !== career.clubId
    && (loan ? club.rating <= target.ovr + 3 : club.budget >= target.value * 0.75 && club.rating >= target.ovr - 6));
  if (!buyers.length) return;
  const buyer = weighted(random, buyers, (club) => Math.pow(club.rep + 1, 2));
  const listed = career.transfers.listed[target.id];
  const fee = loan ? 0 : roundMoney(target.value * (0.82 + random() * 0.38) * (listed ? 0.95 : 1.05));
  const offer = {
    id: `off-${career.transfers.serial += 1}`, playerId: target.id, clubId: buyer.id, fee, loan, wageShare: loan ? 50 + Math.floor(random() * 6) * 10 : 0,
    instalments: fee > 30e6 && random() < 0.4 ? 2 : 1, status: 'open', date: career.date, expires: addDays(career.date, 5), rounds: 0, max: roundMoney(fee * (1.1 + random() * 0.15)),
  };
  career.transfers.offers.unshift(offer);
  addInbox(career, { kind: 'offer', offer: offer.id, player: target.id, club: buyer.id, fee, loan, stop: true });
}

export function respondOffer(career, offerId, decision, counterFee = null) {
  const offer = career.transfers.offers.find((o) => o.id === offerId);
  if (!offer || offer.status !== 'open') return { error: 'closed' };
  const player = career.world.players[offer.playerId];
  if (decision === 'reject') { offer.status = 'rejected'; return { offer }; }
  if (decision === 'counter') {
    offer.rounds += 1;
    const random = createStream(career.seed, offer.id, 'counter', offer.rounds);
    if (counterFee <= offer.max) { offer.fee = counterFee; offer.reply = 'accept-counter'; }
    else if (offer.rounds >= 2 || counterFee > offer.max * 1.35) { offer.status = 'withdrawn'; offer.reply = 'withdraw'; return { offer }; }
    else { offer.fee = roundMoney(Math.min(offer.max, offer.fee + (counterFee - offer.fee) * (0.4 + random() * 0.3))); offer.reply = 'improve'; return { offer }; }
  }
  // Accepted.
  offer.status = 'accepted';
  const dates = career.season.dates;
  const joinDate = windowOpen(career.date, dates) ? career.date : nextWindowDate(career.date, dates);
  const deal = { id: offer.id, playerId: player.id, from: career.clubId, to: offer.clubId, fee: offer.fee, kind: offer.loan ? 'loan-out' : 'sell', wage: player.wage, wageShare: offer.wageShare / 100, joinDate };
  if (joinDate <= career.date) executeDeparture(career, deal);
  else career.transfers.pending.push(deal);
  delete career.transfers.listed[player.id];
  return { offer, deal };
}

export function executeDeparture(career, deal) {
  const world = career.world;
  const player = world.players[deal.playerId];
  const from = world.clubs[deal.from];
  const to = world.clubs[deal.to];
  if (!player || player.clubId !== deal.from) return;
  from.playerIds = from.playerIds.filter((id) => id !== player.id);
  player.clubId = deal.to;
  to.playerIds.push(player.id);
  if (deal.kind === 'loan-out') {
    player.loan = { from: deal.from, until: career.season.dates.seasonEnd, wageShare: deal.wageShare };
  } else {
    player.loan = null;
    player.joined = career.date;
    player.wage = roundMoney(player.wage * 1.15);
    player.contractEnd = career.year + contractYearsWanted(player);
  }
  if (deal.fee) {
    let income = deal.fee;
    if (player.sellOn && deal.from === career.clubId) {
      const share = roundMoney(deal.fee * player.sellOn.pct / 100);
      income -= share;
      player.sellOn = null;
    }
    if (deal.from === career.clubId) {
      career.finances.transferBudget += roundMoney(income * career.finances.reinvest);
      ledger(career, income, 'transfer-in', { player: player.id, club: deal.to });
    }
    to.budget -= deal.fee;
  }
  if (career.lineup) career.lineup = career.lineup.filter((id) => id !== player.id);
  if (career.bench) career.bench = career.bench.filter((id) => id !== player.id);
  assignNumbers(to, world.players);
  logTransfer(career, { date: career.date, playerId: player.id, from: deal.from, to: deal.to, fee: deal.fee, kind: deal.kind });
  addNews(career, { kind: deal.kind === 'loan-out' ? 'loan-out' : 'departure', player: player.id, from: deal.from, to: deal.to, fee: deal.fee });
}

export function releasePlayer(career, playerId) {
  const player = career.world.players[playerId];
  if (!player || player.clubId !== career.clubId || player.loan) return { error: 'invalid' };
  const years = contractYearsLeft(career, player) + 0.5;
  const cost = roundMoney(player.wage * 52 * years * 0.5);
  if (cost > career.finances.transferBudget) return { error: 'no-budget', cost };
  career.finances.transferBudget -= cost;
  ledger(career, -cost, 'release', { player: player.id });
  const club = career.world.clubs[career.clubId];
  club.playerIds = club.playerIds.filter((id) => id !== player.id);
  player.clubId = null;
  career.lineup = (career.lineup || []).filter((id) => id !== player.id);
  career.bench = (career.bench || []).filter((id) => id !== player.id);
  logTransfer(career, { date: career.date, playerId: player.id, from: career.clubId, to: null, fee: 0, kind: 'release' });
  return { ok: true, cost };
}

/* ── Renewals ── */

export function openRenewal(career, playerId) {
  const player = career.world.players[playerId];
  if (!player || player.clubId !== career.clubId || player.loan) return { error: 'invalid' };
  if (activeNegotiation(career, playerId)) return { error: 'already' };
  const role = player.role || roleExpected(career, player);
  const neg = newNegotiation(career, 'renew', player, { stage: 'player', status: 'your-turn', interest: clamp(55 + ((player.morale ?? 65) - 60), 10, 95) });
  const happy = (player.morale ?? 65) >= 55;
  const wage = roundMoney(Math.max(player.wage * (happy ? 1.08 : 1.25), expectedWage(player, career.world.clubs[career.clubId].rep, career.year, role) * 0.95));
  neg.playerAsk = { wage, years: contractYearsWanted(player), role, signingBonus: roundMoney(wage * 6), releaseClause: 0 };
  neg.playerTerms = { wage: roundMoney(player.wage * 1.03), years: contractYearsWanted(player), role, signingBonus: roundMoney(wage * 3), releaseClause: player.releaseClause || 0 };
  log(neg, 'agent', happy ? 'renew-open' : 'renew-open-unhappy', { player: player.id, wage });
  career.transfers.negotiations.unshift(neg);
  return { negotiation: neg };
}

/* ── Arrivals and departures that wait for a window ── */

export function processPending(career) {
  const due = career.transfers.pending.filter((deal) => deal.joinDate <= career.date);
  if (!due.length) return;
  career.transfers.pending = career.transfers.pending.filter((deal) => deal.joinDate > career.date);
  for (const deal of due) {
    if (deal.to === career.clubId) executeArrival(career, deal);
    else executeDeparture(career, deal);
  }
}

/* ── The rest of the world buys and sells too ── */

/**
 * AI clubs fill their weakest starting position with someone better they can
 * afford, mostly from clubs below them. A few deals a day during windows.
 */
export function aiTransferActivity(career) {
  const dates = career.season.dates;
  if (!windowOpen(career.date, dates)) return;
  const world = career.world;
  const random = createStream(career.seed, 'ai-market', career.date);
  const deadline = career.date === dates.summerClose || career.date === dates.winterClose;
  const summer = career.date <= dates.summerClose;
  const deals = Math.floor((summer ? 4 : 2) * (deadline ? 3 : 1) * (0.5 + random()));
  const clubs = Object.values(world.clubs).filter((club) => !club.external && club.id !== career.clubId && career.deepLeagues.includes(club.leagueId));
  const pool = Object.values(world.players).filter((p) => p.clubId && p.clubId !== career.clubId && !p.loan && !p.retired && !p.generated && p.age <= 33);
  for (let i = 0; i < deals; i += 1) {
    const buyer = clubs[Math.floor(random() * clubs.length)];
    if (!buyer) break;
    const squad = clubSquad(world, buyer.id);
    if (squad.length >= 30) continue;
    const lineup = pickLineup(squad, buyer.formation);
    const weakest = lineup.filter(Boolean).sort((a, b) => a.ovr - b.ovr)[0];
    if (!weakest) continue;
    const line = POSITION_LINE[weakest.pos];
    const budget = buyer.budget * (buyer.youthFocus ? 0.5 : 0.75);
    const candidates = [];
    for (let k = 0; k < 60 && pool.length; k += 1) {
      const p = pool[Math.floor(random() * pool.length)];
      if (POSITION_LINE[p.pos] !== line || p.clubId === buyer.id || p.ovr < weakest.ovr + 2 || p.ovr > buyer.rating + 9) continue;
      const seller = world.clubs[p.clubId];
      if (seller && seller.rep > buyer.rep + 1) continue;
      if (p.joined && daysBetween(p.joined, career.date) < 120) continue;
      const price = roundMoney(p.value * (1 + random() * 0.35));
      if (price > budget) continue;
      if (buyer.youthFocus && p.age > 26) continue;
      candidates.push({ p, price });
    }
    if (!candidates.length) continue;
    const { p, price } = candidates.sort((a, b) => b.p.ovr - a.p.ovr)[0];
    const seller = world.clubs[p.clubId];
    if (seller.playerIds.length <= 19) continue;
    seller.playerIds = seller.playerIds.filter((id) => id !== p.id);
    seller.budget += price;
    buyer.budget -= price;
    buyer.playerIds.push(p.id);
    const fromId = p.clubId;
    p.clubId = buyer.id;
    p.joined = career.date;
    p.wage = roundMoney(Math.max(p.wage * 1.12, expectedWage(p, buyer.rep, career.year, 'important') * 0.9));
    p.contractEnd = career.year + contractYearsWanted(p);
    if (p.sellOn) p.sellOn = null;
    assignNumbers(buyer, world.players);
    logTransfer(career, { date: career.date, playerId: p.id, from: fromId, to: buyer.id, fee: price, kind: 'ai' });
    const notable = p.ovr >= 80 || price >= 30e6 * Math.max(0.2, Math.pow(1.047, career.year - 2025)) || career.transfers.shortlist.includes(p.id)
      || world.clubs[fromId]?.leagueId === world.clubs[career.clubId].leagueId;
    if (notable) addNews(career, { kind: 'ai-transfer', player: p.id, from: fromId, to: buyer.id, fee: price, shortlisted: career.transfers.shortlist.includes(p.id) });
    // The selling club's own replacement may follow on a later day.
  }
}

export function toggleShortlist(career, playerId) {
  const list = career.transfers.shortlist;
  const index = list.indexOf(playerId);
  if (index >= 0) list.splice(index, 1); else list.unshift(playerId);
  return list.includes(playerId);
}

export function searchPlayers(career, filters = {}) {
  const { text = '', line = null, pos = null, minOvr = 0, maxOvr = 99, maxAge = 45, minAge = 15, maxValue = Infinity, nat = null, league = null, freeOnly = false, limit = 120, sort = 'ovr' } = filters;
  const query = text.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const world = career.world;
  const result = [];
  for (const p of Object.values(world.players)) {
    if (p.retired || p.clubId === career.clubId || p.generated === 'national') continue;
    if (freeOnly && p.clubId) continue;
    if (p.ovr < minOvr || p.ovr > maxOvr || p.age > maxAge || p.age < minAge) continue;
    if (line && POSITION_LINE[p.pos] !== line) continue;
    if (pos && p.pos !== pos && !p.alt?.includes(pos)) continue;
    if (nat && p.nat !== nat) continue;
    if (league && world.clubs[p.clubId]?.leagueId !== league) continue;
    if (p.value > maxValue) continue;
    if (query) {
      const name = p.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const club = (world.clubs[p.clubId]?.name || '').toLowerCase();
      if (!name.includes(query) && !club.includes(query)) continue;
    }
    result.push(p);
  }
  const sorters = {
    ovr: (a, b) => b.ovr - a.ovr || b.pot - a.pot,
    pot: (a, b) => b.pot - a.pot || b.ovr - a.ovr,
    value: (a, b) => b.value - a.value,
    age: (a, b) => a.age - b.age || b.pot - a.pot,
    cheap: (a, b) => (a.value / Math.max(1, a.ovr - 40)) - (b.value / Math.max(1, b.ovr - 40)),
  };
  return result.sort(sorters[sort] || sorters.ovr).slice(0, limit);
}

export function updateValues(career) {
  for (const p of Object.values(career.world.players)) {
    if (p.retired) continue;
    p.age = ageOn(p, career.date);
    p.value = marketValue({ ovr: p.ovr, pot: p.pot, age: p.age, contractYears: contractYearsLeft(career, p) + 1, form: p.form || 0 }, career.year);
  }
}

export { dynamicOvr };
