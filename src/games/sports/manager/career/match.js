/**
 * Match engine.
 *
 * Minute by minute: who has the ball, whether the attack turns into a shot, a
 * corner, a foul or an offside, and who is involved. Every random draw comes
 * from a stream keyed by the match, the clock and the number of decisions the
 * manager has taken, so a match is reproducible and a substitution changes
 * only what happens after it.
 *
 * Calibrated against typical top-flight averages: about 2.7 goals, 24 shots,
 * 8-9 on target, 10 corners, 22 fouls, 4 yellow cards, 0.15 red cards and 0.3
 * penalties per match (see engine tests for the measured figures).
 */
import { createStream, clamp, mean, weighted } from './util.js';
import { FORMATIONS, positionFit, POSITION_LINE } from './positions.js';

export const MENTALITIES = ['very-defensive', 'defensive', 'balanced', 'attacking', 'very-attacking'];
export const TACTIC_DEFAULTS = { mentality: 'balanced', pressing: 'medium', tempo: 'normal', width: 'normal', line: 'normal' };
const MENTALITY_SHIFT = { 'very-defensive': [-6, 5.5], defensive: [-3, 3], balanced: [0, 0], attacking: [3, -2.5], 'very-attacking': [6, -5.5] };

const PERIODS = [
  { start: 0, length: 45, key: 'first' },
  { start: 45, length: 45, key: 'second' },
  { start: 90, length: 15, key: 'et1' },
  { start: 105, length: 15, key: 'et2' },
];

const other = (side) => (side === 'home' ? 'away' : 'home');

function emptyStats() {
  return { shots: 0, sot: 0, xg: 0, poss: 0, corners: 0, fouls: 0, offsides: 0, yc: 0, rc: 0, saves: 0, passes: 0, passOk: 0, tackles: 0, bigChances: 0 };
}

/**
 * side: { id, name, short, color, formation, lineup: [ids in slot order], bench: [ids], tactics, players: {id: snapshot} }
 * Player snapshot: { id, name, number, pos, alt, ovr (dynamic at kickoff), attrs, energy, age }
 */
export function createMatch({ id, seed, date, comp, home, away, userSide = null, maxSubs = 5, neutral = false, knockout = false, aggregate = null, allowExtraTime = true }) {
  const players = {};
  const sides = {};
  for (const [key, team] of [['home', home], ['away', away]]) {
    const slots = (FORMATIONS[team.formation] || FORMATIONS['4-3-3']).map(([pos]) => pos);
    for (const pid of [...team.lineup, ...team.bench]) {
      const base = team.players[pid];
      if (!base) continue;
      players[pid] = {
        ...base, side: key, slot: null, energy: base.energy ?? 100, rating: 6.2, goals: 0, assists: 0, shots: 0, sot: 0,
        keyPasses: 0, tackles: 0, saves: 0, conceded: 0, yc: 0, rc: 0, fouls: 0, injured: null, minutes: 0, on: null, off: null, passes: 0,
      };
    }
    team.lineup.forEach((pid, i) => { if (players[pid]) { players[pid].slot = slots[i]; players[pid].on = 0; } });
    sides[key] = {
      id: team.id, name: team.name, short: team.short || team.name, color: team.color, crest: team.crest || null, kit: team.kit || null,
      formation: team.formation, lineup: team.lineup.filter((pid) => players[pid]), bench: team.bench.filter((pid) => players[pid]),
      used: team.lineup.slice(), subs: 0, tactics: { ...TACTIC_DEFAULTS, ...(team.tactics || {}) }, national: Boolean(team.national),
    };
  }
  return {
    id, seed, date, comp, neutral, knockout, aggregate, allowExtraTime, userSide, maxSubs,
    period: 0, tick: 0, stoppage: [0, 0, 0, 0], clock: 0, phase: 'pre', pausedFor: null, complete: false,
    score: { home: 0, away: 0 }, pens: null, winner: null, actions: 0, autoSubs: true,
    sides, players, stats: { home: emptyStats(), away: emptyStats() }, events: [], timeline: [], lastPossession: 'home',
  };
}

export function displayMinute(match) {
  const period = PERIODS[Math.min(match.period, 3)];
  if (match.tick <= period.length) return { minute: period.start + match.tick, added: 0 };
  return { minute: period.start + period.length, added: match.tick - period.length };
}

function onPitch(match, side) {
  return match.sides[side].lineup.map((id) => match.players[id]).filter((p) => p && !p.injured && !p.rc);
}

function effective(player) {
  const fit = positionFit(player, player.slot);
  const fatigue = 0.8 + 0.2 * clamp(player.energy / 100, 0, 1);
  return player.ovr * fit * fatigue;
}

/** Line strengths of one side right now. */
export function sideStrength(match, side) {
  const team = onPitch(match, side);
  const lines = { GK: [], DF: [], MF: [], FW: [] };
  for (const p of team) lines[POSITION_LINE[p.slot] || 'MF'].push(p);
  const att = mean([...lines.FW, ...lines.MF.filter((p) => p.slot === 'CAM')], effective) || 45;
  const mid = mean(lines.MF, effective) || 45;
  const def = mean([...lines.DF, ...lines.MF.filter((p) => p.slot === 'CDM')], effective) || 45;
  const gk = lines.GK[0] ? effective(lines.GK[0]) : 30;
  const missing = Math.max(0, 11 - team.length);
  const tactics = match.sides[side].tactics;
  const [attShift, defShift] = MENTALITY_SHIFT[tactics.mentality] || [0, 0];
  const press = tactics.pressing === 'high' ? 1.5 : tactics.pressing === 'low' ? -1 : 0;
  const home = !match.neutral && side === 'home' ? 2.8 : 0;
  return {
    att: att + attShift + home - missing * 5,
    mid: mid + press + home * 0.6 - missing * 5,
    def: def + defShift + press * 0.4 + home * 0.5 - missing * 5,
    gk, count: team.length,
  };
}

const SHOOTER_WEIGHT = { GK: 0, CB: 0.32, RB: 0.4, LB: 0.4, RWB: 0.6, LWB: 0.6, CDM: 0.55, CM: 1.15, CAM: 2.5, RM: 1.7, LM: 1.7, RW: 3.2, LW: 3.2, ST: 5.2 };
const HEADER_WEIGHT = { GK: 0, CB: 1.9, RB: 0.5, LB: 0.5, RWB: 0.6, LWB: 0.6, CDM: 0.9, CM: 0.8, CAM: 0.9, RM: 0.8, LM: 0.8, RW: 1.2, LW: 1.2, ST: 4.2 };
const CREATOR_WEIGHT = { GK: 0.03, CB: 0.25, RB: 1.1, LB: 1.1, RWB: 1.5, LWB: 1.5, CDM: 0.8, CM: 1.9, CAM: 3, RM: 2.2, LM: 2.2, RW: 2.4, LW: 2.4, ST: 1.4 };
const DEFENDER_WEIGHT = { GK: 0.02, CB: 3, RB: 2, LB: 2, RWB: 1.6, LWB: 1.6, CDM: 2.6, CM: 1.3, CAM: 0.5, RM: 0.8, LM: 0.8, RW: 0.4, LW: 0.4, ST: 0.3 };

const attr = (p, key, fallback = p.ovr) => p.attrs?.[key] ?? fallback;
const keeperOf = (team) => team.find((p) => p.slot === 'GK') || null;

function chooseShooter(random, team, kind) {
  const outfield = team.filter((p) => p.slot !== 'GK');
  if (!outfield.length) return team[0];
  const weights = kind === 'header' ? HEADER_WEIGHT : SHOOTER_WEIGHT;
  return weighted(random, outfield, (p) => weights[p.slot] * Math.pow(attr(p, kind === 'header' ? 'phy' : 'sho') / 70, 2));
}

function chooseCreator(random, team, exclude) {
  const pool = team.filter((p) => p !== exclude);
  return weighted(random, pool, (p) => CREATOR_WEIGHT[p.slot] * Math.pow(attr(p, 'pas') / 70, 2.5));
}

function chooseDefender(random, team) {
  return weighted(random, team, (p) => DEFENDER_WEIGHT[p.slot] * Math.pow(attr(p, 'def', 50) / 60, 2));
}

function addEvent(match, event) {
  const { minute, added } = displayMinute(match);
  match.events.push({ minute, added, period: match.period, ...event });
}

function adjust(player, value) {
  player.rating = clamp(player.rating + value, 3, 10);
}

/** Shot location for the shot map and the animation, in attacking coordinates. */
function shotLocation(random, kind) {
  if (kind === 'penalty') return { x: 50, y: 88.5 };
  if (kind === 'long') return { x: 30 + random() * 40, y: 66 + random() * 9 };
  if (kind === 'freekick') return { x: 28 + random() * 44, y: 70 + random() * 8 };
  if (kind === 'header' || kind === 'corner-header') return { x: 40 + random() * 20, y: 88 + random() * 6 };
  if (kind === 'one-on-one') return { x: 38 + random() * 24, y: 84 + random() * 7 };
  return { x: 28 + random() * 44, y: 78 + random() * 14 };
}

function resolveShot(match, random, side, kind, { creator = null, counter = false } = {}) {
  const team = onPitch(match, side);
  const rivals = onPitch(match, other(side));
  const shooter = kind === 'penalty' ? penaltyTaker(team) : chooseShooter(random, team, kind === 'corner-header' ? 'header' : kind);
  if (!shooter) return;
  const keeper = keeperOf(rivals);
  const assistant = creator || (kind === 'penalty' || kind === 'freekick' ? null : random() < 0.78 ? chooseCreator(random, team, shooter) : null);
  const base = {
    open: 0.035 + random() ** 2 * 0.22, header: 0.03 + random() ** 2 * 0.13, long: 0.015 + random() * 0.045,
    'one-on-one': 0.24 + random() * 0.22, counter: 0.06 + random() ** 1.6 * 0.28, 'corner-header': 0.025 + random() ** 2 * 0.12,
    freekick: 0.05 + random() * 0.045, penalty: 0.76,
  }[kind] ?? 0.1;
  const xg = Math.min(0.95, kind === 'penalty' ? base : base * 0.9);
  const finishing = attr(shooter, kind === 'corner-header' || kind === 'header' ? 'phy' : 'sho');
  const keeping = keeper ? (keeper.attrs?.ref ?? keeper.ovr) * (0.8 + 0.2 * keeper.energy / 100) * positionFit(keeper, 'GK') : 25;
  const quality = clamp(1 + (finishing - 74) / 105 - (keeping - 74) / 120, 0.6, 1.4);
  const goalChance = clamp(xg * quality, 0.005, 0.97);
  const location = shotLocation(random, kind);
  const stats = match.stats[side];
  stats.shots += 1;
  stats.xg += xg;
  if (xg >= 0.3) stats.bigChances += 1;
  shooter.shots += 1;
  const roll = random();
  let outcome;
  if (roll < goalChance) outcome = 'goal';
  else {
    const onTarget = clamp(0.25 + (finishing - 70) / 220 + (kind === 'penalty' ? 0.5 : 0), 0.18, 0.92);
    const rest = random();
    outcome = rest < onTarget / (1 - goalChance) * 0.92 ? 'saved' : rest < 0.78 ? 'wide' : 'blocked';
    if (kind === 'penalty' && outcome === 'blocked') outcome = 'wide';
  }
  if (outcome === 'goal' && random() < 0.022 && kind !== 'penalty') outcome = 'offside-goal';
  const event = { type: 'shot', side, kind, outcome, player: shooter.id, assist: assistant?.id || null, keeper: keeper?.id || null, xg: +xg.toFixed(2), ...location, counter };
  if (outcome === 'goal') {
    stats.sot += 1;
    shooter.sot += 1;
    shooter.goals += 1;
    match.score[side] += 1;
    adjust(shooter, shooter.slot === 'ST' ? 1.05 : 1.3);
    if (assistant) { assistant.assists += 1; assistant.keyPasses += 1; adjust(assistant, 0.7); }
    if (keeper) { keeper.conceded += 1; adjust(keeper, -0.32); }
    for (const p of rivals) if (POSITION_LINE[p.slot] === 'DF') adjust(p, -0.13);
    event.type = 'goal';
    event.score = { ...match.score };
  } else if (outcome === 'offside-goal') {
    event.type = 'var-offside';
    match.stats[side].offsides += 1;
  } else if (outcome === 'saved') {
    stats.sot += 1;
    shooter.sot += 1;
    adjust(shooter, 0.1);
    if (assistant) { assistant.keyPasses += 1; adjust(assistant, 0.12); }
    if (keeper) { keeper.saves += 1; match.stats[other(side)].saves += 1; adjust(keeper, xg > 0.25 ? 0.45 : 0.22); }
    if (random() < 0.3) event.corner = true;
  } else {
    adjust(shooter, outcome === 'wide' ? -0.06 : -0.02);
    if (assistant) assistant.keyPasses += 1;
    if (outcome === 'blocked') {
      const blocker = chooseDefender(random, rivals);
      if (blocker) { event.blocker = blocker.id; adjust(blocker, 0.12); }
      if (random() < 0.35) event.corner = true;
    }
  }
  addEvent(match, event);
  if (event.corner) corner(match, random, side, true);
}

function penaltyTaker(team) {
  return team.filter((p) => p.slot !== 'GK').sort((a, b) => attr(b, 'sho') - attr(a, 'sho'))[0] || team[0];
}

function corner(match, random, side, fromShot = false) {
  match.stats[side].corners += 1;
  const taker = chooseCreator(random, onPitch(match, side));
  addEvent(match, { type: 'corner', side, player: taker?.id || null, fromShot });
  if (random() < 0.26) resolveShot(match, random, side, 'corner-header', { creator: taker });
}

function foul(match, random, foulingSide) {
  const fouling = onPitch(match, foulingSide);
  const offender = chooseDefender(random, fouling);
  if (!offender) return;
  const victimSide = other(foulingSide);
  const victims = onPitch(match, victimSide).filter((p) => p.slot !== 'GK');
  const victim = victims.length ? weighted(random, victims, (p) => attr(p, 'dri') ** 2) : null;
  match.stats[foulingSide].fouls += 1;
  offender.fouls += 1;
  adjust(offender, -0.05);
  const late = displayMinute(match).minute > 70;
  const pressing = match.sides[foulingSide].tactics.pressing === 'high' ? 1.25 : 1;
  const inBox = random() < 0.013 * (victim && ['ST', 'RW', 'LW', 'CAM'].includes(victim.slot) ? 1.6 : 1);
  const dangerous = !inBox && random() < 0.11;
  let card = null;
  const cardRoll = random();
  if (cardRoll < 0.0026) card = 'red';
  else if (cardRoll < 0.15 * pressing * (late ? 1.18 : 1) * (inBox ? 1.6 : 1)) card = offender.yc ? 'second-yellow' : 'yellow';
  addEvent(match, { type: 'foul', side: foulingSide, player: offender.id, victim: victim?.id || null, inBox, dangerous });
  if (card) {
    if (card === 'yellow') { offender.yc += 1; match.stats[foulingSide].yc += 1; adjust(offender, -0.38); }
    else {
      if (card === 'second-yellow') { offender.yc += 1; match.stats[foulingSide].yc += 1; }
      offender.rc = 1; offender.off = displayMinute(match).minute; match.stats[foulingSide].rc += 1; adjust(offender, -1.8);
    }
    addEvent(match, { type: 'card', side: foulingSide, player: offender.id, card });
    if (offender.rc) {
      match.sides[foulingSide].lineup = match.sides[foulingSide].lineup.filter((id) => id !== offender.id);
      if (offender.slot === 'GK') emergencyKeeper(match, foulingSide);
    }
  }
  if (inBox) {
    match.stats[victimSide].penaltiesWon = (match.stats[victimSide].penaltiesWon || 0) + 1;
    addEvent(match, { type: 'penalty-awarded', side: victimSide, player: victim?.id || null });
    resolveShot(match, random, victimSide, 'penalty');
  } else if (dangerous) {
    if (random() < 0.42) resolveShot(match, random, victimSide, 'freekick');
    else if (random() < 0.5) resolveShot(match, random, victimSide, 'header', { creator: chooseCreator(random, onPitch(match, victimSide)) });
  }
}

/** A keeper sent off with no keeper on the bench: an outfielder goes in goal. */
function emergencyKeeper(match, side) {
  const team = onPitch(match, side);
  if (team.some((p) => p.slot === 'GK')) return;
  const bench = match.sides[side].bench.map((id) => match.players[id]).filter((p) => p && p.pos === 'GK' && !p.injured);
  const canSub = match.sides[side].subs < match.maxSubs;
  if (bench.length && canSub && team.length) {
    const out = team.slice().sort((a, b) => effective(a) - effective(b))[0];
    substitute(match, side, out.id, bench[0].id, { automatic: true, slot: 'GK' });
  } else if (team.length) {
    const stand = team.slice().sort((a, b) => b.attrs?.phy - a.attrs?.phy)[0];
    stand.slot = 'GK';
  }
}

function substitute(match, side, outId, inId, { automatic = false, slot = null, reason = null } = {}) {
  const team = match.sides[side];
  const out = match.players[outId];
  const incoming = match.players[inId];
  const { minute } = displayMinute(match);
  incoming.slot = slot || out.slot;
  incoming.on = minute;
  out.off = minute;
  team.lineup = team.lineup.map((id) => (id === outId ? inId : id));
  if (!team.lineup.includes(inId)) team.lineup.push(inId);
  team.bench = team.bench.filter((id) => id !== inId);
  team.used.push(inId);
  team.subs += 1;
  addEvent(match, { type: 'sub', side, player: inId, out: outId, automatic, reason });
}

function injuryCheck(match, random, side) {
  for (const p of onPitch(match, side)) {
    const risk = 0.000105 * (p.energy < 55 ? 2.2 : p.energy < 70 ? 1.4 : 1) * (p.age > 31 ? 1.25 : 1);
    if (random() >= risk) continue;
    const severity = random() < 0.62 ? 'light' : random() < 0.8 ? 'medium' : 'severe';
    p.injured = severity;
    p.off = displayMinute(match).minute;
    addEvent(match, { type: 'injury', side, player: p.id, severity });
    const team = match.sides[side];
    team.lineup = team.lineup.filter((id) => id !== p.id);
    const userControlled = side === match.userSide && !match.autoSubs;
    if (userControlled) match.pausedFor = 'injury';
    else autoReplace(match, side, p, 'injury');
  }
}

function autoReplace(match, side, out, reason) {
  const team = match.sides[side];
  if (team.subs >= match.maxSubs) return false;
  const bench = team.bench.map((id) => match.players[id]).filter((p) => p && !p.injured);
  if (!bench.length) return false;
  const slot = out.slot;
  const best = bench.filter((p) => (slot === 'GK') === (p.pos === 'GK'))
    .sort((a, b) => b.ovr * positionFit(b, slot) - a.ovr * positionFit(a, slot))[0];
  if (!best) return false;
  const outId = out.id;
  if (!team.lineup.includes(outId)) team.lineup.push(outId);
  out.replaced = true;
  substitute(match, side, outId, best.id, { automatic: true, reason });
  return true;
}

/** CPU (and delegated) substitutions: tired or poor players around the hour. */
function managerDecisions(match, random, side) {
  if (side === match.userSide && !match.autoSubs) return;
  const { minute } = displayMinute(match);
  const team = match.sides[side];
  const windows = match.period >= 2 ? [100, 106] : [58, 67, 74, 81, 86];
  if (!windows.includes(minute) || match.tick > PERIODS[match.period].length) return;
  if (team.subs >= match.maxSubs) return;
  const players = onPitch(match, side).filter((p) => p.slot !== 'GK');
  const tired = players.filter((p) => p.energy < 62 || p.rating < 5.9).sort((a, b) => (a.energy + a.rating * 8) - (b.energy + b.rating * 8));
  const count = minute === 58 ? (random() < 0.5 ? 1 : 0) : minute >= 81 ? 1 : random() < 0.75 ? 2 : 1;
  for (const out of tired.slice(0, count)) autoReplace(match, side, out, 'tactical');
  // Chasing the game: a losing side pushes late on.
  if (side !== match.userSide && minute >= 70) {
    const diff = match.score[side] - match.score[other(side)];
    if (diff < 0) team.tactics = { ...team.tactics, mentality: diff <= -2 ? 'attacking' : 'very-attacking' };
    else if (diff > 0 && minute >= 80) team.tactics = { ...team.tactics, mentality: 'defensive' };
  }
}

function stepMinute(match) {
  const random = createStream(match.seed, match.id, 'm', match.period, match.tick, match.actions);
  const home = sideStrength(match, 'home');
  const away = sideStrength(match, 'away');
  const tempo = (side) => (match.sides[side].tactics.tempo === 'fast' ? 1.08 : match.sides[side].tactics.tempo === 'slow' ? 0.93 : 1);
  const possHome = clamp(0.5 + (home.mid - away.mid) / 55 + (match.sides.home.tactics.tempo === 'slow' ? 0.02 : 0) - (match.sides.away.tactics.tempo === 'slow' ? 0.02 : 0), 0.26, 0.74);
  const side = random() < possHome ? 'home' : 'away';
  match.lastPossession = side;
  match.stats[side].poss += 1;
  const passesNow = Math.round(7 + random() * 6);
  match.stats[side].passes += passesNow;
  const passQuality = clamp(0.7 + ((side === 'home' ? home.mid : away.mid) - 55) / 120, 0.6, 0.93);
  match.stats[side].passOk += Math.round(passesNow * passQuality);
  for (const p of onPitch(match, side)) p.passes += random() < 0.6 ? 1 : 0;

  let pressure = 0;
  for (const s of ['home', 'away']) {
    const own = s === 'home' ? home : away;
    const rival = s === 'home' ? away : home;
    const hasBall = s === side;
    const share = hasBall ? 0.6 : 0.4;
    const diff = own.att * 0.55 + own.mid * 0.45 - (rival.def * 0.62 + rival.mid * 0.25 + rival.gk * 0.13);
    const shotChance = 0.104 * Math.exp(diff / 27) * Math.pow(share / 0.5, 0.5) * tempo(s);
    const counter = !hasBall && random() < 0.18;
    if (random() < shotChance) {
      const roll = random();
      const kind = counter ? 'counter' : roll < 0.53 ? 'open' : roll < 0.68 ? 'header' : roll < 0.9 ? 'long' : 'one-on-one';
      resolveShot(match, random, s, kind, { counter });
      pressure += s === 'home' ? 1 : -1;
    } else if (random() < 0.041 * Math.exp(diff / 34)) {
      corner(match, random, s);
      pressure += s === 'home' ? 0.6 : -0.6;
    } else if (hasBall && random() < 0.042) {
      match.stats[s].offsides += 1;
      const runners = onPitch(match, s).filter((p) => ['ST', 'RW', 'LW', 'CAM'].includes(p.slot));
      addEvent(match, { type: 'offside', side: s, player: runners.length ? runners[Math.floor(random() * runners.length)].id : null });
    }
    if (random() < 0.123 * (match.sides[s].tactics.pressing === 'high' ? 1.12 : 1)) foul(match, random, s);
    if (!hasBall && random() < 0.35) {
      const defender = chooseDefender(random, onPitch(match, s));
      if (defender) { defender.tackles += 1; match.stats[s].tackles += 1; if (random() < 0.4) adjust(defender, 0.04); }
    }
  }
  const zone = clamp(50 + (side === 'home' ? 1 : -1) * (12 + random() * 30), 4, 96);
  match.timeline.push({ m: displayMinute(match).minute, a: displayMinute(match).added, p: side === 'home' ? 1 : -1, z: Math.round(zone), x: pressure });

  for (const s of ['home', 'away']) {
    const press = match.sides[s].tactics.pressing === 'high' ? 1.3 : match.sides[s].tactics.pressing === 'low' ? 0.82 : 1;
    const pace = match.sides[s].tactics.tempo === 'fast' ? 1.1 : 1;
    for (const p of onPitch(match, s)) {
      const loss = p.slot === 'GK' ? 0.12 : (0.3 + Math.max(0, p.age - 29) * 0.012) * press * pace * (1.15 - (p.attrs?.phy ?? 70) / 400);
      p.energy = Math.max(5, p.energy - loss);
      p.minutes += 1;
    }
    injuryCheck(match, random, s);
    managerDecisions(match, random, s);
  }
}

function periodEnded(match) {
  const period = PERIODS[match.period];
  return match.tick >= period.length + match.stoppage[match.period];
}

function drawStoppage(match) {
  const random = createStream(match.seed, match.id, 'stoppage', match.period);
  const goals = match.events.filter((e) => e.type === 'goal' && e.period === match.period).length;
  const subs = match.events.filter((e) => e.type === 'sub' && e.period === match.period).length;
  const base = match.period === 0 ? 1 + Math.floor(random() * 3) : match.period === 1 ? 3 + Math.floor(random() * 4) : Math.floor(random() * 2);
  match.stoppage[match.period] = Math.min(match.period === 1 ? 10 : 5, base + Math.floor(goals * 0.5 + subs * 0.25));
}

function tied(match) {
  if (match.aggregate) return match.aggregate.home + match.score.home === match.aggregate.away + match.score.away;
  return match.score.home === match.score.away;
}

function finish(match) {
  match.phase = 'ft';
  match.complete = true;
  match.pausedFor = null;
  const total = match.stats.home.poss + match.stats.away.poss || 1;
  match.possession = { home: Math.round(match.stats.home.poss / total * 100), away: 100 - Math.round(match.stats.home.poss / total * 100) };
  const homeTotal = match.score.home + (match.aggregate?.home || 0) + (match.pens?.home || 0) * 0.01;
  const awayTotal = match.score.away + (match.aggregate?.away || 0) + (match.pens?.away || 0) * 0.01;
  match.winner = homeTotal > awayTotal ? 'home' : awayTotal > homeTotal ? 'away' : null;
  const random = createStream(match.seed, match.id, 'ratings');
  for (const p of Object.values(match.players)) {
    if (p.minutes <= 0) continue;
    const side = p.side;
    const conceded = match.score[other(side)];
    if (conceded === 0 && p.minutes >= 60) adjust(p, p.slot === 'GK' ? 0.65 : POSITION_LINE[p.slot] === 'DF' ? 0.45 : 0.15);
    const result = match.score[side] - conceded;
    adjust(p, result > 0 ? 0.25 : result < 0 ? -0.22 : 0);
    adjust(p, (random() - 0.5) * 0.6 + (p.ovr - 72) / 100);
    if (p.minutes < 25) p.rating = clamp(6 + (p.rating - 6) * 0.6, 3, 10);
    p.rating = Math.round(clamp(6.3 + (p.rating - 6.2) * 0.74, 3, 10) * 10) / 10;
  }
  const rated = Object.values(match.players).filter((p) => p.minutes >= 20);
  const best = rated.sort((a, b) => b.rating - a.rating || b.goals - a.goals)[0];
  match.motm = best?.id || null;
  addEvent(match, { type: 'full-time', score: { ...match.score }, pens: match.pens ? { home: match.pens.home, away: match.pens.away } : null });
}

function shootout(match) {
  const random = createStream(match.seed, match.id, 'pens');
  const order = (side) => onPitch(match, side).filter((p) => p.slot !== 'GK').sort((a, b) => attr(b, 'sho') - attr(a, 'sho'))
    .concat(onPitch(match, side).filter((p) => p.slot === 'GK'));
  const takers = { home: order('home'), away: order('away') };
  const keepers = { home: keeperOf(onPitch(match, 'home')), away: keeperOf(onPitch(match, 'away')) };
  const pens = { home: 0, away: 0, kicks: [] };
  for (let round = 0; round < 30; round += 1) {
    for (const side of ['home', 'away']) {
      const list = takers[side];
      const taker = list[round % Math.max(1, list.length)];
      const keeper = keepers[other(side)];
      const chance = clamp(0.76 + (attr(taker, 'sho') - 75) / 240 - ((keeper?.attrs?.ref ?? 70) - 75) / 300 - (round >= 5 ? 0.02 : 0), 0.5, 0.92);
      const scored = random() < chance;
      if (scored) pens[side] += 1;
      pens.kicks.push({ side, player: taker?.id, scored, saved: !scored && random() < 0.7 });
      if (round < 5) {
        const homeLeft = 5 - (round + 1);
        const awayLeft = 5 - (round + (side === 'away' ? 1 : 0));
        if (pens.home > pens.away + awayLeft || pens.away > pens.home + homeLeft) { match.pens = pens; return; }
      }
    }
    if (round >= 4 && pens.home !== pens.away) break;
  }
  match.pens = pens;
}

/** Advance until the clock moves `minutes` match minutes, a pause, or the end. */
export function advanceMatch(source, minutes = 1, { ignorePauses = false } = {}) {
  const match = cloneMatch(source);
  if (match.complete) return match;
  match.pausedFor = null;
  if (match.phase === 'pre') { match.phase = 'live'; addEvent(match, { type: 'kick-off' }); }
  let steps = 0;
  while (!match.complete && steps < minutes) {
    if (match.tick === PERIODS[match.period].length) drawStoppage(match);
    if (periodEnded(match)) {
      const ended = match.period;
      addEvent(match, { type: 'period-end', ended });
      if (ended === 0 || ended === 2) {
        match.period += 1;
        match.tick = 0;
        if (ended === 0) { match.phase = 'ht'; if (!ignorePauses && match.userSide) { match.pausedFor = 'half-time'; break; } }
        continue;
      }
      const needsExtra = ended === 1 && match.knockout && match.allowExtraTime && tied(match);
      if (needsExtra) {
        match.period = 2; match.tick = 0;
        addEvent(match, { type: 'extra-time' });
        if (!ignorePauses && match.userSide) { match.pausedFor = 'extra-time'; break; }
        continue;
      }
      if (ended === 3 && match.knockout && tied(match)) {
        shootout(match);
        addEvent(match, { type: 'shootout', kicks: match.pens.kicks, pens: { home: match.pens.home, away: match.pens.away } });
      } else if (ended === 1 && match.knockout && !match.allowExtraTime && tied(match)) {
        shootout(match);
        addEvent(match, { type: 'shootout', kicks: match.pens.kicks, pens: { home: match.pens.home, away: match.pens.away } });
      }
      finish(match);
      break;
    }
    match.tick += 1;
    match.clock += 1;
    stepMinute(match);
    steps += 1;
    if (!ignorePauses && match.pausedFor) break;
  }
  return match;
}

export function playToEnd(match) {
  return advanceMatch(match, 1000, { ignorePauses: true });
}

export function cloneMatch(match) {
  return {
    ...match,
    score: { ...match.score },
    stoppage: match.stoppage.slice(),
    sides: Object.fromEntries(Object.entries(match.sides).map(([key, side]) => [key, { ...side, lineup: side.lineup.slice(), bench: side.bench.slice(), used: side.used.slice(), tactics: { ...side.tactics } }])),
    players: Object.fromEntries(Object.entries(match.players).map(([key, p]) => [key, { ...p }])),
    stats: { home: { ...match.stats.home }, away: { ...match.stats.away } },
    events: match.events.slice(),
    timeline: match.timeline.slice(),
  };
}

/* ── Manager decisions during the match ── */

export function userSubstitute(source, outId, inId) {
  const side = source.userSide;
  const team = source.sides[side];
  if (source.complete) throw new Error('match-over');
  if (!team.lineup.includes(outId) || !team.bench.includes(inId)) throw new Error('invalid-sub');
  if (team.subs >= source.maxSubs) throw new Error('no-subs-left');
  if (source.players[inId].injured) throw new Error('injured');
  const match = cloneMatch(source);
  substitute(match, side, outId, inId);
  match.actions += 1;
  if (match.pausedFor === 'injury' && !onPitch(match, side).some((p) => p.injured)) match.pausedFor = null;
  return match;
}

/** Replace an injured player who already left: out is not in the lineup any more. */
export function pendingInjuries(match) {
  const side = match.userSide;
  if (!side) return [];
  return Object.values(match.players).filter((p) => p.side === side && p.injured && !p.replaced && !match.sides[side].lineup.includes(p.id) && p.on !== null);
}

export function userReplaceInjured(source, injuredId, inId) {
  const side = source.userSide;
  const team = source.sides[side];
  if (!team.bench.includes(inId) || team.subs >= source.maxSubs) throw new Error('invalid-sub');
  const injured = source.players[injuredId];
  if (!injured?.injured || team.lineup.includes(injuredId)) throw new Error('no-injury');
  const match = cloneMatch(source);
  match.players[injuredId].replaced = true;
  match.sides[side].lineup.push(injuredId);
  substitute(match, side, injuredId, inId);
  match.actions += 1;
  match.pausedFor = null;
  return match;
}

export function userSetTactics(source, changes) {
  const match = cloneMatch(source);
  const side = match.userSide;
  const team = match.sides[side];
  team.tactics = { ...team.tactics, ...Object.fromEntries(Object.entries(changes).filter(([key]) => key !== 'formation')) };
  if (changes.formation && FORMATIONS[changes.formation] && changes.formation !== team.formation) {
    team.formation = changes.formation;
    reassignSlots(match, side);
  }
  match.actions += 1;
  addEvent(match, { type: 'tactics', side, changes });
  return match;
}

export function userSetAutoSubs(source, enabled) {
  const match = cloneMatch(source);
  match.autoSubs = Boolean(enabled);
  match.actions += 1;
  return match;
}

function reassignSlots(match, side) {
  const team = onPitch(match, side);
  const slots = FORMATIONS[match.sides[side].formation].map(([pos]) => pos);
  const free = team.slice();
  const ordered = [];
  for (const slot of slots) {
    if (!free.length) break;
    free.sort((a, b) => b.ovr * positionFit(b, slot) - a.ovr * positionFit(a, slot));
    const keeperSlot = slot === 'GK';
    const choice = free.find((p) => (p.pos === 'GK') === keeperSlot) || free[0];
    choice.slot = slot;
    ordered.push(choice.id);
    free.splice(free.indexOf(choice), 1);
  }
  match.sides[side].lineup = ordered;
}

/* ── Quick result for matches nobody watches ── */

/**
 * The same strengths and rates, aggregated over 90 minutes instead of stepped.
 * Fast enough for every fixture of every simulated league.
 */
export function quickResult({ seed, id, home, away, neutral = false, knockout = false, aggregate = null, detail = true }) {
  const random = createStream(seed, id, 'quick');
  const homeAdv = neutral ? 0 : 2.8;
  const diffHome = home.att * 0.55 + home.mid * 0.45 + homeAdv - (away.def * 0.62 + away.mid * 0.25 + away.gk * 0.13);
  const diffAway = away.att * 0.55 + away.mid * 0.45 - (home.def * 0.62 + home.mid * 0.25 + home.gk * 0.13 + homeAdv * 0.5);
  const lambdaHome = clamp(1.25 * Math.exp(diffHome / 27), 0.15, 4.5);
  const lambdaAway = clamp(1.25 * Math.exp(diffAway / 27), 0.15, 4.5);
  const sample = (lambda) => {
    const limit = Math.exp(-lambda);
    let k = 0; let p = random();
    while (p > limit && k < 11) { k += 1; p *= random(); }
    return k;
  };
  let hg = sample(lambdaHome);
  let ag = sample(lambdaAway);
  let pens = null;
  let extraTime = false;
  const level = () => (aggregate ? aggregate.home + hg === aggregate.away + ag : hg === ag);
  if (knockout && level()) {
    extraTime = true;
    if (random() < lambdaHome / 6.5) hg += 1;
    if (random() < lambdaAway / 6.5) ag += 1;
    if (level()) {
      let ph = 0; let pa = 0;
      for (let i = 0; i < 5; i += 1) { if (random() < 0.76) ph += 1; if (random() < 0.76) pa += 1; }
      while (ph === pa) { if (random() < 0.76) ph += 1; if (random() < 0.76) pa += 1; }
      pens = { home: ph, away: pa };
    }
  }
  const result = { hg, ag, pens, extraTime, xgHome: +(lambdaHome * (0.85 + random() * 0.3)).toFixed(2), xgAway: +(lambdaAway * (0.85 + random() * 0.3)).toFixed(2) };
  if (!detail) return result;
  result.random = random;
  return result;
}

export function strengthFromLineup(players, formation, { mentality = 'balanced', missing = 0 } = {}) {
  const slots = (FORMATIONS[formation] || FORMATIONS['4-3-3']).map(([pos]) => pos);
  const lines = { GK: [], DF: [], MF: [], FW: [] };
  players.forEach((p, i) => {
    if (!p) return;
    const slot = slots[i];
    const value = p.ovrNow * positionFit(p, slot);
    if (slot === 'CAM') { lines.FW.push(value); lines.MF.push(value); }
    else if (slot === 'CDM') { lines.DF.push(value); lines.MF.push(value); }
    else lines[POSITION_LINE[slot]].push(value);
  });
  const [attShift, defShift] = MENTALITY_SHIFT[mentality] || [0, 0];
  const avg = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 45);
  return {
    att: avg(lines.FW) + attShift - missing * 5, mid: avg(lines.MF) - missing * 5,
    def: avg(lines.DF) + defShift - missing * 5, gk: lines.GK[0] ?? 30,
  };
}

/**
 * Half-time team talk. The right words for the scoreline lift the side a
 * little for the rest of the match; the wrong ones cost a little.
 */
export function teamTalk(source, tone) {
  const match = cloneMatch(source);
  const side = match.userSide;
  if (!side || match.talked?.[match.period]) return source;
  const diff = match.score[side] - match.score[other(side)];
  const fits = { calm: diff > 0, demand: diff < 0, encourage: diff === 0 || diff < 0 }[tone] ?? false;
  const delta = fits ? 1.5 : tone === 'encourage' ? 0.5 : -1;
  for (const p of Object.values(match.players)) if (p.side === side) p.ovr = clamp(p.ovr + delta, 20, 99);
  match.talked = { ...(match.talked || {}), [match.period]: { tone, delta } };
  match.actions += 1;
  return match;
}
