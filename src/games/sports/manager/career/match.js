/**
 * Match engine.
 *
 * The ball is always somewhere and always belongs to someone. Each match
 * minute is about a minute of football: possessions made of real actions by
 * real players, decided from where everybody stands (shape.js) and what each
 * player's role and the team instructions ask of him (tactics.js).
 *
 * The player on the ball reads the situation: how close the first defender
 * is, whether he received facing goal or with his back to it, the space in
 * front of him, the space behind the defensive line and whether a teammate is
 * on the shoulder to run into it, how many teammates are in the box, how
 * crowded the ball side is. Passes go along real lanes: a defender near the
 * line of the pass can cut it out, a lofted ball becomes an aerial duel and
 * often a second ball, a through ball is a race between the runner and the
 * covering defender (or the sweeping keeper), and a pass to a runner who
 * timed it badly is offside. The receiver can miscontrol it, which is what a
 * pressing side waits for.
 *
 * Crosses are delivered to zones (near post, six-yard box, far post, penalty
 * spot, edge of the box) that runners attack according to their role, each
 * one marked by a defender (zonal, man or mixed at corners); the keeper may
 * come and claim it, a near-post header can be flicked on, a clearance falls
 * to the edge of the box for a second ball. Shots are valued by where they are
 * taken from and blocked by the bodies actually in the way; keepers hold,
 * parry wide or parry into danger, and somebody follows up the rebound.
 *
 * Out of possession the block engages, presses and covers as the tactics say;
 * after a turnover the team that lost the ball counter-presses or regroups,
 * and the team that won it counter-attacks into the space the other left.
 *
 * Every random draw comes from a stream keyed by the match, the clock and the
 * number of decisions the manager has taken: a match is reproducible and a
 * substitution changes only what happens after it. Each minute leaves its
 * action chain in `match.lastChain` so the pitch can stage exactly what the
 * engine decided.
 *
 * Calibrated against typical top-flight averages (see match.test.js): about
 * 2.7 goals, 24-26 shots with a third on target and a quarter blocked, 9-11
 * corners, 22-25 fouls, ~4 yellow cards, 0.3 penalties, 850-1050 passes at
 * ~82%, crosses completed about one time in four.
 */
import { createStream, clamp, mean, weighted } from './util.js';
import { FORMATIONS, positionFit, POSITION_LINE } from './positions.js';
import { layoutTeams, metres, WIDE, DEFENDERS, kickoffSpot, slotEntry } from './shape.js';
import { MENTALITIES, TACTIC_DEFAULTS, normalizeTactics, roleParams, autoRoles, rolesFor, applyPreset } from './tactics.js';
import { cpuProfile, neutralProfile, freshMemory, factor, channelOf, dynamicReview, situationalPlan, NEUTRAL_TRAITS } from './cpu.js';

export { MENTALITIES, TACTIC_DEFAULTS };
/** How much faster than the play the clock runs in the manager's matches: a match is watched in about twenty minutes at 1x. */
export const MATCH_CLOCK_RATE = 2.35;
const MENTALITY_SHIFT = { 'very-defensive': [-6, 5.5], defensive: [-3, 3], balanced: [0, 0], attacking: [3, -2.5], 'very-attacking': [6, -5.5] };
const MENTALITY_RISK = { 'very-defensive': -0.3, defensive: -0.15, balanced: 0, attacking: 0.15, 'very-attacking': 0.3 };

const PERIODS = [
  { start: 0, length: 45, key: 'first' },
  { start: 45, length: 45, key: 'second' },
  { start: 90, length: 15, key: 'et1' },
  { start: 105, length: 15, key: 'et2' },
];

const other = (side) => (side === 'home' ? 'away' : 'home');

function emptyStats() {
  return {
    shots: 0, sot: 0, xg: 0, poss: 0, corners: 0, fouls: 0, offsides: 0, yc: 0, rc: 0, saves: 0, passes: 0, passOk: 0, tackles: 0, bigChances: 0,
    interceptions: 0, clearances: 0, crosses: 0, crossOk: 0, dribbles: 0, dribblesOk: 0, keyPasses: 0, woodwork: 0, throwIns: 0, goalKicks: 0,
    freeKicks: 0, boxTouches: 0, finalThird: 0, shotsInBox: 0, aerialsWon: 0, blocked: 0, recoveries: 0, highTurnovers: 0, counters: 0,
    secondBalls: 0, throughOk: 0, longOk: 0, longBalls: 0, breakaways: 0,
  };
}

const PLAYER_STATS = {
  rating: 6.2, goals: 0, assists: 0, shots: 0, sot: 0, keyPasses: 0, tackles: 0, interceptions: 0, clearances: 0, saves: 0, conceded: 0,
  yc: 0, rc: 0, fouls: 0, fouled: 0, passes: 0, passOk: 0, dribbles: 0, dribblesOk: 0, crosses: 0, xg: 0, xa: 0, touches: 0, minutes: 0,
  aerials: 0, recoveries: 0,
};

const roleId = (key) => String(key || '').split(':')[0];
const validRole = (key, slot) => Boolean(key) && rolesFor(slot).includes(roleId(key));

/**
 * side: { id, name, short, color, formation, lineup: [ids in slot order], bench: [ids], tactics, style, players: {id: snapshot} }
 * Player snapshot: { id, name, number, pos, alt, ovr (dynamic at kickoff), attrs, energy, age }
 */
export function createMatch({ id, seed, date, comp, home, away, userSide = null, maxSubs = 5, neutral = false, knockout = false, aggregate = null, allowExtraTime = true, cpu = {}, clockRate = 1 }) {
  const players = {};
  const sides = {};
  for (const [key, team] of [['home', home], ['away', away]]) {
    const slots = (FORMATIONS[team.formation] || FORMATIONS['4-3-3']).map(([pos]) => pos);
    const tactics = normalizeTactics(team.tactics || {});
    for (const pid of [...team.lineup, ...team.bench]) {
      const base = team.players[pid];
      if (!base) continue;
      players[pid] = { ...base, ...PLAYER_STATS, side: key, slot: null, role: null, energy: base.energy ?? 100, injured: null, on: null, off: null };
    }
    const auto = autoRoles(team.lineup.map((pid) => team.players[pid]), slots, team.style || 'balanced');
    team.lineup.forEach((pid, i) => {
      if (!players[pid]) return;
      players[pid].slot = slots[i];
      players[pid].on = 0;
      players[pid].role = validRole(tactics.roles[i], slots[i]) ? tactics.roles[i] : auto[i];
    });
    sides[key] = {
      id: team.id, name: team.name, short: team.short || team.name, color: team.color, crest: team.crest || null, kit: team.kit || null,
      formation: team.formation, lineup: team.lineup.filter((pid) => players[pid]), bench: team.bench.filter((pid) => players[pid]),
      used: team.lineup.slice(), subs: 0, pendingSubs: [], tactics, style: team.style || 'balanced', national: Boolean(team.national),
      // The CPU's brain for the side it runs; the manager's side plays with the neutral one.
      ai: key === userSide ? neutralProfile() : cpuProfile(team.id, team.style || 'balanced', cpu),
    };
  }
  const refRandom = createStream(seed, id, 'referee');
  // Every side has its day: a small, hidden swing in sharpness for the whole match.
  const formRandom = createStream(seed, id, 'form');
  for (const key of ['home', 'away']) sides[key].form = +((formRandom() - 0.5) * 6).toFixed(2);
  return {
    id, seed, date, comp, neutral, knockout, aggregate, allowExtraTime, userSide, maxSubs,
    period: 0, tick: 0, stoppage: [0, 0, 0, 0], clock: 0, phase: 'pre', pausedFor: null, complete: false,
    score: { home: 0, away: 0 }, pens: null, winner: null, actions: 0, autoSubs: true,
    referee: { strict: +(0.8 + refRandom() * 0.45).toFixed(2) },
    sides, players, stats: { home: emptyStats(), away: emptyStats() }, events: [], timeline: [], lastPossession: 'home',
    ball: null, lastChain: [], clockRate,
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

/* ── Player qualities in the moment ── */

const attr = (p, key, fallback = p.ovr) => p.attrs?.[key] ?? fallback;
/** An attribute as it plays right now: fatigue and position fit wear it down. */
function now(p, key, spread = 0.6) {
  const base = key === 'keeping' ? (p.attrs?.ref != null ? (p.attrs.ref * 0.45 + (p.attrs.div ?? p.attrs.ref) * 0.35 + (p.attrs.gkp ?? p.attrs.ref) * 0.2) : p.ovr) : attr(p, key);
  const fit = p.slot === 'GK' ? positionFit(p, 'GK') : 0.75 + 0.25 * positionFit(p, p.slot);
  const value = base * fit * (0.8 + 0.2 * clamp(p.energy / 100, 0, 1)) + (p.boost || 0);
  // Many duels add up over a match: each one weighs the gap between players a little less than face value.
  return 72 + (value - 72) * spread;
}
const role = (p) => roleParams(p.role, p.slot);
/** Winning the ball in the air: spring and strength, plus heading technique (finishing for forwards, defending for defenders). */
function aerial(p) {
  if (p.slot === 'GK') return now(p, 'keeping');
  return (now(p, 'phy') * 0.58 + Math.max(now(p, 'sho'), now(p, 'def')) * 0.42) * (0.82 + role(p).aerial * 0.18);
}
const control = (p) => now(p, 'dri') * 0.6 + now(p, 'pas') * 0.4;
/** Keeper coming for crosses: handling and positioning. */
const claiming = (k) => (k.attrs?.han != null ? k.attrs.han * 0.55 + (k.attrs.gkp ?? k.attrs.han) * 0.45 : k.ovr);
const keeperOf = (team) => team.find((p) => p.slot === 'GK') || null;
/** How many bodies a side keeps between the ball and its goal: a deep, cautious block is hard to finish against. */
function compactness(t) {
  return ({ low: 0.12, mid: 0.04, high: 0 }[t.block] ?? 0.04) + ({ 'very-defensive': 0.09, defensive: 0.045, balanced: 0, attacking: -0.03, 'very-attacking': -0.06 }[t.mentality] ?? 0);
}

function adjust(player, value) {
  if (player) player.rating = clamp(player.rating + value, 3, 10);
}

function addEvent(match, event) {
  const { minute, added } = displayMinute(match);
  match.events.push({ minute, added, period: match.period, ...event });
  return match.events.length - 1;
}

const inBox = (pt) => pt.p >= 84 && pt.a > 20 && pt.a < 80;
/** A point of one side's frame seen from the other side. */
const mirror = (pt) => ({ p: 100 - pt.p, a: 100 - pt.a });

/* ── The CPU (see cpu.js) ── */

/** CPU slider of a side (50 when the side has none). */
const slider = (match, side, key) => match.sides[side].ai?.sliders?.[key] ?? 50;
/** CPU intelligence trait of a side, relative to the neutral level (0 = neutral). */
const trait = (match, side, key) => (match.sides[side].ai?.traits?.[key] ?? NEUTRAL_TRAITS[key]) - NEUTRAL_TRAITS[key];
const memoryOf = (match, side) => match.sides[side].ai?.memory;

/* ── Positions ── */

/** Positions of everyone (each in his side's frame) for the current ball, with press and offside line. */
function layout(match) {
  return layoutTeams(match, match.ball);
}

function nearestRival(match, pos, side, point, exclude = null) {
  let best = null;
  let bestD = Infinity;
  for (const p of onPitch(match, other(side))) {
    if (p.id === exclude || !pos[p.id]) continue;
    const q = mirror(pos[p.id]);
    const d = metres(q, point) * (p.slot === 'GK' && point.p < 82 ? 3 : 1);
    if (d < bestD) { bestD = d; best = p; }
  }
  return { player: best, dist: bestD };
}

/** Nearest player of `side` to a point of `side`'s frame (keepers only for their own box). */
function nearestOwn(match, pos, side, point, exclude = []) {
  let best = null;
  let bestD = Infinity;
  for (const p of onPitch(match, side)) {
    if (exclude.includes(p.id) || !pos[p.id]) continue;
    const d = metres(pos[p.id], point) * (p.slot === 'GK' ? 4 : 1);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

/**
 * How exposed a ground pass is: every rival close to the line of the pass
 * could step in, more so further along a long pass (more time to react).
 */
function laneRisk(match, pos, side, from, to) {
  const fx = from.p * 1.05; const fy = from.a * 0.68;
  const dx = to.p * 1.05 - fx; const dy = to.a * 0.68 - fy;
  const len2 = dx * dx + dy * dy || 1;
  const len = Math.sqrt(len2);
  let keep = 1;
  let worst = 0;
  let cutter = null;
  let at = null;
  for (const r of onPitch(match, other(side))) {
    const q = pos[r.id];
    if (!q || (r.slot === 'GK' && to.p < 84)) continue;
    const rx = (100 - q.p) * 1.05; const ry = (100 - q.a) * 0.68;
    const t = ((rx - fx) * dx + (ry - fy) * dy) / len2;
    if (t < 0.06 || t > 1.02) continue;
    const px = fx + dx * t; const py = fy + dy * t;
    const dist = Math.hypot(rx - px, ry - py);
    const reach = (0.9 + (now(r, 'def') - 60) / 48 + t * len * 0.13) * (1 + trait(match, r.side, 'defend') * 0.5);
    const risk = clamp(1 - dist / Math.max(0.6, reach), 0, 1) * (t > 0.9 ? 0.5 : 1);
    if (risk <= 0) continue;
    keep *= 1 - risk * 0.55;
    if (risk > worst) { worst = risk; cutter = r; at = { p: px / 1.05, a: py / 0.68 }; }
  }
  return { risk: 1 - keep, cutter, at };
}

/** Defenders between the shooter and the goal, and how much of the target they cover. */
function shotBlock(match, pos, side, point) {
  const sx = point.p * 1.05; const sy = point.a * 0.68;
  const a1 = Math.atan2(34 - 3.66 - sy, 105 - sx);
  const a2 = Math.atan2(34 + 3.66 - sy, 105 - sx);
  const lo = Math.min(a1, a2); const hi = Math.max(a1, a2);
  const toGoal = Math.hypot(105 - sx, 34 - sy);
  let keep = 1;
  let best = 0;
  let blocker = null;
  for (const r of onPitch(match, other(side))) {
    if (r.slot === 'GK') continue;
    const q = pos[r.id];
    if (!q) continue;
    const rx = (100 - q.p) * 1.05; const ry = (100 - q.a) * 0.68;
    const d = Math.hypot(rx - sx, ry - sy);
    if (d > toGoal || rx < sx - 0.3) continue;
    const angle = Math.atan2(ry - sy, rx - sx);
    const body = Math.atan2(0.75, Math.max(0.8, d));
    if (angle < lo - body || angle > hi + body) continue;
    const cover = clamp((2 * body) / Math.max(0.05, hi - lo), 0.1, 1);
    const b = clamp(cover * (d < 2.5 ? 0.55 : 0.36), 0.04, 0.5);
    keep *= 1 - b;
    if (b > best) { best = b; blocker = r; }
  }
  return { block: 1 - keep, blocker };
}

/** Expected threat of having the ball at a point: flat in midfield, steep towards the box. */
export function threat(p, a) {
  const central = Math.exp(-((a - 50) ** 2) / (2 * 17 ** 2));
  const box = Math.exp(-((100 - p) ** 2) / (2 * 13 ** 2));
  return 0.004 + 0.022 * (p / 100) ** 2 + 0.2 * box * (0.35 + 0.65 * central);
}

/* ── xG ── */

/** Expected goals from the shot location (attacking frame) and its type. */
export function shotXg(p, a, kind) {
  if (kind === 'penalty') return 0.76;
  const dx = Math.max(0.5, (100 - p) * 1.05);
  const dy = (a - 50) * 0.68;
  const d = Math.hypot(dx, dy);
  const angle = Math.atan2(7.32 * dx, dx * dx + dy * dy - 3.66 * 3.66);
  let xg = 1 / (1 + Math.exp(-(-1.38 + 1.7 * (angle < 0 ? angle + Math.PI : angle) - 0.12 * d)));
  if (kind === 'header') xg *= 0.5;
  if (kind === 'corner-header') xg *= 0.42;
  if (kind === 'volley') xg *= 0.75;
  if (kind === 'one-on-one') xg = Math.max(xg * 1.7, 0.3);
  if (kind === 'cutback') xg *= 1.25;
  if (kind === 'rebound') xg *= 1.3;
  if (kind === 'tap-in') xg = Math.max(xg * 1.25, 0.35);
  if (kind === 'freekick') xg = clamp(0.11 - d * 0.0022, 0.03, 0.09);
  return clamp(xg, 0.01, 0.82);
}

/* ── Selection helpers ── */

const DEFENDER_WEIGHT = { GK: 0.02, CB: 3, RB: 2, LB: 2, RWB: 1.6, LWB: 1.6, CDM: 2.6, CM: 1.3, CAM: 0.5, RM: 0.8, LM: 0.8, RW: 0.4, LW: 0.4, ST: 0.3 };
const ATTACKERS = new Set(['ST', 'RW', 'LW', 'CAM']);

function setPieceTaker(team, kind) {
  const pool = team.filter((p) => p.slot !== 'GK');
  if (!pool.length) return team[0];
  const score = kind === 'penalty' ? (p) => attr(p, 'sho') * 1.2 + (p.slot === 'ST' ? 4 : 0)
    : kind === 'freekick' ? (p) => attr(p, 'sho') * 0.55 + attr(p, 'pas') * 0.45
      : (p) => attr(p, 'pas') + (WIDE.has(p.slot) || p.slot === 'CAM' ? 3 : 0);
  return pool.slice().sort((a, b) => score(b) - score(a))[0];
}

/* ── The chain of play ── */

function push(match, chain, action) {
  chain.push(action);
  return action.dur || 0;
}

/** Hand the ball to `side` at a point of its own frame. */
function giveBall(match, side, point, carrier, extra = {}) {
  match.ball = {
    side, p: clamp(point.p, 0.5, 99.5), a: clamp(point.a, 0.5, 99.5), carrier: carrier?.id || null, restart: null, seq: 0, start: point.p,
    counter: 0, last: null, fresh: 0, facing: 'goal', trigger: null, ...extra,
  };
  match.lastPossession = side;
}

function restart(match, side, kind, point, extra = {}) {
  giveBall(match, side, point, null, { restart: kind, ...extra });
}

/**
 * Spots for the pitch to stage: [[id, p, a]], every point given in the
 * attacking frame of the action's side (rival players included).
 */
function placeOf(entries) {
  return entries.filter((e) => e && e.player).map(({ player, at }) => [player.id, +clamp(at.p, 0.5, 99.5).toFixed(1), +clamp(at.a, 0.5, 99.5).toFixed(1)]);
}

/**
 * The ball changes hands. `point` is in the frame of the side that lost it.
 * Whether it becomes a counter-attack depends on how many of the losing side
 * were behind the ball, where it was won and the instructions of both sides.
 */
function turnover(match, chain, winner, point, how, loser, { L = null, setPiece = false } = {}) {
  const side = winner.side;
  const own = mirror(point);
  const s = match.stats[side];
  if (how === 'tackle') { s.tackles += 1; winner.tackles += 1; adjust(winner, 0.08); }
  else if (how === 'interception') {
    // Only the clean reads count as interceptions; the rest are recoveries of a loose pass.
    if (match.random() < 0.3) { s.interceptions += 1; winner.interceptions += 1; } else { s.recoveries += 1; winner.recoveries += 1; }
    adjust(winner, 0.06);
  }
  else if (how === 'clearance') { s.clearances += 1; winner.clearances += 1; adjust(winner, 0.04); }
  else if (how === 'recovery') { s.recoveries += 1; winner.recoveries += 1; adjust(winner, 0.04); }
  if (loser) adjust(loser, how === 'tackle' ? -0.05 : -0.03);
  const before = match.ball;
  const loserSide = other(side);
  const winT = match.sides[side].tactics;
  const loseT = match.sides[loserSide].tactics;
  // Rest defence: outfield players of the losing side still goal-side of the ball.
  const pos = (L || layoutTeams(match, { side: loserSide, p: point.p, a: point.a })).pos;
  const outfield = onPitch(match, loserSide).filter((p) => p.slot !== 'GK' && pos[p.id]);
  const rest = setPiece ? (loseT.setPieceOverload ? 1 : 3) : outfield.filter((p) => pos[p.id].p < point.p - 3).length;
  // The space behind the losing side's last line: a high line is a long way from its own goal.
  const lastLine = outfield.reduce((m, p) => Math.min(m, pos[p.id].p), 100);
  let counter = 0;
  if (own.p < 64 && winT.onWin !== 'patient' && rest <= 5) {
    counter = rest <= 2 ? 3 : rest <= 3 ? 2 : rest <= 4 ? 1 : 0;
    if (winT.onWin === 'counter' || winT.buildUp === 'counter') counter += 1;
    if (loseT.onLoss === 'regroup') counter -= 1;
    if (before && before.p < 40) counter -= 1;
    if (lastLine > 45 && rest <= 3 && own.p < 55) counter += 1;
    counter = clamp(counter, 0, 4);
  }
  if (own.p >= 60) s.highTurnovers += 1;
  if (point.p < 33 && memoryOf(match, loserSide)) memoryOf(match, loserSide).ownThirdLosses += 1;
  if (counter >= 2) s.counters += 1;
  giveBall(match, side, own, winner, { counter, won: how });
  if (counter >= 2) {
    // A tactical foul is the professional answer to a counter.
    const options = onPitch(match, loserSide).filter((p) => ['CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'ST'].includes(p.slot));
    const stopper = options.length ? weighted(match.random, options, (p) => (p.yc ? 0.15 : 1) * (p.slot === 'CDM' ? 2 : 1) * (1 / (0.5 + metres(pos[p.id] || point, point) / 10))) : null;
    const tackling = loseT.tackling === 'aggressive' ? 1.35 : loseT.tackling === 'ease' ? 0.6 : 1;
    if (stopper && match.random() < 0.022 * counter * tackling * factor(slider(match, loserSide, 'proFoul'), 0.8)) return foul(match, chain, stopper, winner, own, { tactical: true });
  }
  return 0;
}

/**
 * A ball nobody controls: the nearest players of both sides race for it.
 * `point` is in `side`'s frame; `side` is the team that last had the ball.
 */
function secondBall(match, chain, side, point, { bias = 0, from = null } = {}) {
  const random = match.random;
  const { pos } = layoutTeams(match, { side, p: point.p, a: point.a });
  const contest = (team, frame) => {
    let best = null;
    let bestT = Infinity;
    for (const p of onPitch(match, team)) {
      if (p.slot === 'GK' && !(frame === team ? point.p < 14 : point.p > 86)) continue;
      const q = pos[p.id];
      if (!q) continue;
      const at = team === frame ? q : mirror(q);
      const r = role(p);
      const reads = (p.slot === 'CDM' ? 0.35 : 0) + (r.id === 'box-crasher' ? 0.3 : 0) + (r.id === 'holding' ? 0.25 : 0);
      const time = metres(at, point) / (5.5 + (now(p, 'pac') - 60) / 18) - reads - (from && p.id === from ? 0.4 : 0) - trait(match, team, 'react') * 0.7;
      if (time < bestT) { bestT = time; best = p; }
    }
    return { player: best, time: bestT };
  };
  const mine = contest(side, side);
  const theirs = contest(other(side), side);
  if (!mine.player && !theirs.player) return 1;
  const pMine = !theirs.player ? 1 : !mine.player ? 0 : clamp(0.5 + (theirs.time - mine.time) * 0.3 + bias, 0.12, 0.88);
  const mineWins = random() < pMine;
  const winner = mineWins ? mine.player : theirs.player;
  const loserP = mineWins ? theirs.player : mine.player;
  match.stats[winner.side].secondBalls += 1;
  const start = { p: match.ball?.side === side ? match.ball.p : point.p, a: match.ball?.side === side ? match.ball.a : point.a };
  push(match, chain, { t: 'loose', side, to: winner.id, vs: loserP?.id || null, p0: +start.p.toFixed(1), a0: +start.a.toFixed(1), p1: +point.p.toFixed(1), a1: +point.a.toFixed(1), dur: 1.1 });
  if (mineWins) {
    giveBall(match, side, point, winner, { facing: 'side', last: 'loose' });
    winner.touches += 1;
    return 1.6;
  }
  return 1.6 + turnover(match, chain, winner, point, 'recovery', loserP);
}

/* Shots */

function resolveShot(match, chain, shooter, kind, point, { creator = null, counter = false, pressure = 0, L = null } = {}) {
  const random = match.random;
  const side = shooter.side;
  const rivals = onPitch(match, other(side));
  const keeper = keeperOf(rivals);
  const pos = (L || layoutTeams(match, { side, p: point.p, a: point.a, carrier: shooter.id })).pos;
  const { block, blocker } = kind === 'penalty' || kind === 'freekick' ? { block: 0, blocker: null } : shotBlock(match, pos, side, point);
  // The chance itself: where it is taken from, how much pressure, how many bodies in the way, how packed the box.
  const packed = kind === 'penalty' || kind === 'one-on-one' ? 0 : compactness(match.sides[other(side)].tactics);
  const setting = kind === 'penalty' ? 1 : kind === 'freekick' ? 1.1 : 1.5 * (1 - packed * 0.8) * clamp((1 - block) / 0.74, 0.3, 1.12);
  // Even a clean chance has a keeper in front of it: the best chances are converted four times in ten, not six.
  const clean = shotXg(point.p, point.a, kind) * (1 - pressure * 0.3) * (counter ? 1.12 : 1) * setting;
  const xgRaw = kind === 'penalty' ? clean : clean * (1 - 0.62 * clamp(clean, 0, 1));
  const xg = +clamp(xgRaw, 0.01, 0.95).toFixed(3);
  const finishing = kind === 'header' || kind === 'corner-header' ? now(shooter, 'phy') * 0.5 + now(shooter, 'sho') * 0.5 : now(shooter, 'sho');
  // The keeper is one man against one shot: his quality counts at face value, more the cleaner the chance.
  const keeping = keeper ? now(keeper, 'keeping', 1) : 25;
  const quality = clamp(1 + (finishing - match.ctx.level - 2) / 110 - ((keeping - match.ctx.keepers) / 34) * (0.7 + xg) + (!match.neutral && side === 'home' ? 0.03 : 0), 0.5, 1.45);
  const goalChance = clamp(xg * quality, 0.004, 0.96);
  const stats = match.stats[side];
  stats.shots += 1;
  stats.xg += xg;
  if (inBox(point)) stats.shotsInBox += 1;
  // What each CPU remembers: where its chances come from, and how it is being hurt.
  const mine = memoryOf(match, side);
  if (mine) mine.xgFor[channelOf(point.a)] += xg;
  const theirs = memoryOf(match, other(side));
  if (theirs) {
    const how = kind === 'one-on-one' || match.ball?.last === 'through' ? 'through' : ['header', 'corner-header', 'volley', 'tap-in'].includes(kind) ? 'cross' : 'other';
    theirs.xgAgainst[how] += xg;
  }
  if (xg >= 0.3) stats.bigChances += 1;
  shooter.shots += 1;
  shooter.xg = +(shooter.xg + xg).toFixed(3);
  if (creator) { creator.keyPasses += 1; creator.xa = +(creator.xa + xg).toFixed(3); stats.keyPasses += 1; adjust(creator, 0.08 + xg * 0.3); }
  let outcome;
  if (random() < goalChance) outcome = 'goal';
  else {
    const r = random();
    const onTarget = clamp(0.39 + (finishing - 70) / 220 + xg * 0.35 + (kind === 'penalty' ? 0.45 : 0), 0.18, 0.88);
    if (r < block * 0.97) outcome = 'blocked';
    else if (random() < 0.026 + xg * 0.025) outcome = 'post';
    else outcome = random() < onTarget ? 'saved' : 'wide';
  }
  if (outcome === 'goal' && kind !== 'penalty' && random() < 0.025) outcome = 'offside-goal';
  const aimA = outcome === 'wide' ? (random() < 0.5 ? 40 + random() * 4 : 56 + random() * 4) : 45.5 + random() * 9;
  const aimZ = outcome === 'wide' ? (random() < 0.45 ? 2.6 + random() * 1.5 : random() * 1.4) : random() * 2.2;
  const event = { type: 'shot', side, kind, outcome, player: shooter.id, assist: creator?.id || null, keeper: keeper?.id || null, xg, x: +point.a.toFixed(1), y: +point.p.toFixed(1), counter };
  let dur = 3;
  if (outcome === 'goal') {
    stats.sot += 1;
    shooter.sot += 1;
    shooter.goals += 1;
    match.score[side] += 1;
    adjust(shooter, shooter.slot === 'ST' ? 1.05 : 1.25);
    if (creator) { creator.assists += 1; adjust(creator, 0.6); }
    if (keeper) { keeper.conceded += 1; adjust(keeper, -0.3 + xg * 0.25); }
    for (const p of rivals) if (POSITION_LINE[p.slot] === 'DF') adjust(p, -0.12);
    event.type = 'goal';
    event.score = { ...match.score };
  } else if (outcome === 'offside-goal') {
    event.type = 'var-offside';
    stats.offsides += 1;
  } else if (outcome === 'saved') {
    stats.sot += 1;
    shooter.sot += 1;
    adjust(shooter, 0.06);
    if (keeper) { keeper.saves += 1; match.stats[other(side)].saves += 1; adjust(keeper, 0.18 + xg * 0.9); }
  } else if (outcome === 'post') {
    stats.woodwork += 1;
    adjust(shooter, 0.05);
  } else {
    adjust(shooter, outcome === 'wide' ? -0.05 - xg * 0.25 : -0.02);
    if (outcome === 'blocked') {
      stats.blocked += 1;
      const by = blocker || nearestRival(match, pos, side, point).player || weighted(random, rivals, (p) => DEFENDER_WEIGHT[p.slot]);
      if (by) { event.blocker = by.id; adjust(by, 0.1); }
    }
  }
  const ev = addEvent(match, event);
  const shotAction = { t: 'shot', side, from: shooter.id, p: +point.p.toFixed(1), a: +point.a.toFixed(1), outcome, kind, ev, aimA, aimZ, keeper: keeper?.id || null, blocker: event.blocker || null, dur: 2.2 };
  dur += push(match, chain, shotAction);

  // What happens to the ball next.
  if (outcome === 'goal') {
    restart(match, other(side), 'kickoff', { p: 50, a: 50 });
    return dur + 50;
  }
  if (outcome === 'offside-goal') {
    restart(match, other(side), 'free-kick', mirror({ p: Math.min(point.p, 90), a: point.a }));
    return dur + 70;
  }
  if (outcome === 'wide') { restart(match, other(side), 'goal-kick', { p: 5, a: 35 + random() * 30 }); return dur + 6; }
  if (outcome === 'saved') {
    const distance = (100 - point.p) * 1.05;
    const hold = clamp(0.5 + (keeper ? (attr(keeper, 'han', keeper.ovr) - 70) / 120 : 0) - xg * 0.45 + (distance > 20 ? 0.12 : 0), 0.22, 0.86);
    const r = random();
    // He holds it where he caught it, on his line.
    if (r < hold && keeper) { shotAction.held = true; giveBall(match, keeper.side, { p: 1.5, a: 100 - aimA }, keeper); return dur + 4; }
    const parry = (r - hold) / (1 - hold);
    if (parry < 0.42) { corner(match, chain, side); return dur; }
    if (parry < 0.66) return dur + rebound(match, chain, side, point, keeper);
    // Parried wide of the post: a loose ball out by the byline.
    return dur + secondBall(match, chain, side, { p: 90 + random() * 5, a: point.a < 50 ? 14 + random() * 12 : 74 + random() * 12 });
  }
  if (outcome === 'post') {
    const r = random();
    if (r < 0.36) return dur + rebound(match, chain, side, point, null);
    if (r < 0.64) { restart(match, other(side), 'goal-kick', { p: 5, a: 50 }); return dur + 5; }
    return dur + secondBall(match, chain, side, { p: 86 + random() * 6, a: 30 + random() * 40 });
  }
  if (outcome === 'blocked') {
    const r = random();
    if (r < 0.27) { corner(match, chain, side); return dur; }
    // Deflected back towards the edge of the box: whoever reacts first.
    return dur + secondBall(match, chain, side, { p: clamp(point.p - 6 - random() * 9, 58, 86), a: clamp(point.a + (random() - 0.5) * 30, 12, 88) });
  }
  return dur;
}

/** A rebound in front of goal: the striker following in against the defender turning. */
function rebound(match, chain, side, point, keeper) {
  const random = match.random;
  const spot = { p: clamp(93 + random() * 4, 88, 97), a: clamp(50 + (point.a - 50) * 0.3 + (random() - 0.5) * 20, 34, 66) };
  const { pos } = layoutTeams(match, { side, p: spot.p, a: spot.a });
  const chasers = onPitch(match, side).filter((p) => p.slot !== 'GK' && pos[p.id] && pos[p.id].p > 76);
  const defenders = onPitch(match, other(side)).filter((p) => p.slot !== 'GK' && pos[p.id]);
  const time = (p, at) => metres(at, spot) / (5.5 + (now(p, 'pac') - 60) / 18);
  let att = null; let attT = Infinity;
  for (const p of chasers) { const t = time(p, pos[p.id]) - role(p).box * 0.5 - (p.slot === 'ST' ? 0.25 : 0); if (t < attT) { attT = t; att = p; } }
  let def = null; let defT = Infinity;
  for (const p of defenders) { const t = time(p, mirror(pos[p.id])); if (t < defT) { defT = t; def = p; } }
  push(match, chain, { t: 'loose', side, to: (att && attT < defT + 0.35 ? att : def)?.id || null, vs: null, p0: +point.p.toFixed(1), a0: +point.a.toFixed(1), p1: +spot.p.toFixed(1), a1: +spot.a.toFixed(1), dur: 0.8, rebound: true, keeper: keeper?.id || null });
  if (att && random() < clamp(0.4 + (defT - attT) * 0.35, 0.18, 0.72)) {
    match.ball = { ...match.ball, side, p: spot.p, a: spot.a, carrier: att.id };
    return 1 + resolveShot(match, chain, att, 'rebound', spot, { pressure: clamp((3 - Math.max(0, defT - attT) * 5) / 6, 0.15, 0.7) });
  }
  if (!def) return 1;
  return 1 + turnover(match, chain, def, spot, 'clearance', att, { L: null });
}

/* Set pieces */

function corner(match, chain, side) {
  const random = match.random;
  match.stats[side].corners += 1;
  const flagA = random() < 0.5 ? 0.5 : 99.5;
  const ev = addEvent(match, { type: 'corner', side, player: setPieceTaker(onPitch(match, side), 'corner')?.id || null });
  restart(match, side, 'corner', { p: 99.5, a: flagA }, { ev });
}

/* Crosses */

/** The five zones a cross is aimed at, for a crosser on the low (left) or high (right) side. */
function crossZones(from) {
  const s = from.a < 50 ? -1 : 1;
  return {
    near: { p: 95.6, a: 50 + s * 4.6 },
    six: { p: 96.2, a: 50 - s * 0.6 },
    far: { p: 94, a: 50 - s * 7.2 },
    spot: { p: 89.4, a: 50 - s * 1.8 },
    edge: { p: 80.5, a: 50 - s * 6 },
  };
}

/** How well suited a player is to attack each zone. */
function zoneFit(p, zone, farSide, setPiece) {
  const r = role(p);
  const slot = p.slot;
  const air = (aerial(p) / 70) ** 2;
  if (setPiece && (slot === 'CB' || r.id === 'target-forward')) return { near: 0.9, six: 1.3, far: 1.1, spot: 1.5, edge: 0.05 }[zone] * air * 1.4;
  switch (zone) {
    case 'near': return ((slot === 'ST' ? 1.6 : 0.35) * (r.id === 'advanced-forward' ? 1.25 : 1) + (!farSide && WIDE.has(slot) ? 0.35 : 0)) * air;
    case 'six': return (slot === 'ST' ? 1.4 : 0.3) * (r.id === 'poacher' ? 1.7 : 1) * (0.6 + air * 0.4);
    case 'far': return ((farSide && WIDE.has(slot) ? 1.5 : 0.3) + (r.id === 'target-forward' ? 1.2 : 0) + (r.id === 'inside-forward' && farSide ? 0.5 : 0)) * (0.5 + air * 0.5);
    case 'spot': return (r.box * 1.5 + (['CAM', 'CM', 'CDM'].includes(slot) ? 0.4 : 0) + (r.id === 'target-forward' ? 0.8 : 0)) * (0.5 + air * 0.5);
    default: return (['CM', 'CDM', 'CAM'].includes(slot) ? 1 : 0.2) * r.create * Math.max(0.2, 1.3 - r.box);
  }
}

/**
 * Who goes where when a cross is coming: runners to zones (by role) and the
 * defenders picking them up (by the marking scheme at corners, by proximity
 * in open play). Returns { runs: [{player, zone, at}], marks: {id: defender} }.
 */
function boxSetup(match, side, taker, from, { setPiece = false, L = null } = {}) {
  const random = match.random;
  const zones = crossZones(from);
  const t = match.sides[side].tactics;
  const pos = L?.pos || layoutTeams(match, { side, p: from.p, a: from.a }).pos;
  const farSide = (p) => pos[p.id] && Math.sign(pos[p.id].a - 50) !== Math.sign(from.a - 50);
  let pool = onPitch(match, side).filter((p) => p !== taker && p.slot !== 'GK');
  if (setPiece) {
    // Rest defence: the least dangerous in the air stay back (one if overloading).
    const stay = t.setPieceOverload ? 1 : 2;
    const back = pool.slice().sort((x, y) => aerial(x) * (DEFENDERS.has(x.slot) && x.slot !== 'CB' ? 0.6 : 1) - aerial(y) * (DEFENDERS.has(y.slot) && y.slot !== 'CB' ? 0.6 : 1)).slice(0, stay);
    pool = pool.filter((p) => !back.includes(p));
  } else {
    const ment = MENTALITY_RISK[t.mentality] || 0;
    pool = pool.filter((p) => {
      const q = pos[p.id];
      if (!q) return false;
      const r = role(p);
      // Only those who can get there while the ball is in the air.
      if (metres(q, { p: 90, a: 50 }) > 30) return false;
      if (q.p >= 74) return true;
      return q.p >= 52 && random() < (r.box * 0.85 + ment * 0.5 + (t.finalThird === 'work-box' ? 0.1 : 0)) * factor(slider(match, side, 'runs'), 0.4);
    });
  }
  const runs = [];
  const used = new Set();
  const order = setPiece ? ['six', 'near', 'far', 'spot', 'spot', 'six', 'edge'] : ['near', 'far', 'six', 'spot', 'edge'];
  order.forEach((zone, k) => {
    let best = null;
    let bestW = 0;
    for (const p of pool) {
      if (used.has(p.id)) continue;
      const w = zoneFit(p, zone, farSide(p), setPiece) * (0.8 + random() * 0.4);
      if (w > bestW) { bestW = w; best = p; }
    }
    if (!best || bestW < 0.12) return;
    used.add(best.id);
    const z = zones[zone];
    const spread = k >= 4 ? (random() - 0.5) * 6 : (random() - 0.5) * 2.4;
    runs.push({ player: best, zone, at: { p: z.p - (zone === 'spot' && k >= 4 ? 2.5 : 0), a: clamp(z.a + spread, 30, 70) } });
  });
  // Markers.
  const defenders = onPitch(match, other(side)).filter((p) => p.slot !== 'GK');
  const scheme = setPiece ? match.sides[other(side)].tactics.cornerDefence : 'open';
  const marks = {};
  const taken = new Set();
  const byAir = defenders.slice().sort((x, y) => aerial(y) - aerial(x));
  const zonal = scheme === 'zonal' ? ['six', 'near', 'far', 'spot'] : scheme === 'mixed' ? ['six', 'near'] : [];
  const zoneMen = {};
  for (const zone of zonal) { const d = byAir.find((p) => !taken.has(p.id)); if (d) { taken.add(d.id); zoneMen[zone] = d; } }
  const ranked = runs.slice().sort((x, y) => aerial(y.player) - aerial(x.player));
  for (const run of ranked) {
    if (zoneMen[run.zone]) { marks[run.player.id] = zoneMen[run.zone]; continue; }
    let pick = null;
    if (scheme === 'man' || scheme === 'mixed') pick = byAir.find((p) => !taken.has(p.id));
    else {
      let bestD = Infinity;
      for (const d of defenders) {
        if (taken.has(d.id) || !pos[d.id]) continue;
        const dist = metres(mirror(pos[d.id]), run.at) * (DEFENDERS.has(d.slot) || d.slot === 'CDM' ? 1 : 1.6);
        if (dist < bestD) { bestD = dist; pick = d; }
      }
    }
    if (pick) { taken.add(pick.id); marks[run.player.id] = pick; }
  }
  return { runs, marks, zones, zoneMen, scheme };
}

const DELIVERY = {
  early: { six: 1.1, far: 1.3, spot: 1.1, near: 0.5 },
  high: { far: 1.5, spot: 1.2, six: 0.8, near: 0.5 },
  low: { near: 1.6, six: 1.4, spot: 0.6 },
  throw: { near: 1.7, six: 1.2, spot: 0.5 },
  freekick: { six: 0.9, far: 1.3, spot: 1.3, near: 0.6 },
  'corner-near': { near: 2.4, six: 0.7, far: 0.3, spot: 0.5, edge: 0.2 },
  'corner-far': { far: 2.4, spot: 0.9, six: 0.5, near: 0.3, edge: 0.2 },
  'corner-mixed': { near: 1, six: 1.1, far: 1, spot: 0.9, edge: 0.3 },
};

/**
 * A ball into the box: delivered to a zone, attacked by a runner, defended
 * by his marker or claimed by the keeper. `type`: early | high | low | throw |
 * freekick | corner-*.
 */
function deliverCross(match, chain, side, taker, from, { setPiece = false, type = null, L = null } = {}) {
  const random = match.random;
  const t = match.sides[side].tactics;
  const rivalSide = other(side);
  const rivals = onPitch(match, rivalSide);
  const keeper = keeperOf(rivals);
  if (!type) {
    if (from.p < 85) type = 'early';
    else type = random() < ({ low: 0.62, mixed: 0.34, high: 0.12 }[t.crosses] ?? 0.34) ? 'low' : 'high';
  }
  const lofted = type !== 'low';
  const setup = boxSetup(match, side, taker, from, { setPiece, L });
  // Where the defenders are when the ball comes in: their marks, or their place in the block.
  const boxPos = { ...(L?.pos || layoutTeams(match, { side, p: from.p, a: from.a }).pos) };
  for (const run of setup.runs) { const m = setup.marks[run.player.id]; if (m) boxPos[m.id] = mirror({ p: Math.min(99, run.at.p + 0.9), a: run.at.a }); }
  const { runs, marks, zones, scheme } = setup;
  match.stats[side].crosses += 1;
  if (memoryOf(match, side) && !setPiece) memoryOf(match, side).crosses += 1;
  taker.crosses += 1;
  const place = placeOf([...runs.map((r) => ({ player: r.player, at: r.at })), ...runs.map((r) => (marks[r.player.id] ? { player: marks[r.player.id], at: { p: Math.min(99, r.at.p + 0.9), a: r.at.a + (50 - r.at.a) * 0.08 } } : null))]);
  // Aim: zones with a runner, shaded by the delivery type.
  const weights = DELIVERY[type] || DELIVERY.early;
  const zoneList = Object.keys(weights);
  const runFor = (zone) => runs.find((r) => r.zone === zone);
  const zone = weighted(random, zoneList, (z) => weights[z] * (runFor(z) ? 1.6 : 0.25));
  const target = { ...zones[zone], a: zones[zone].a + (random() - 0.5) * 3 };
  const delivery = now(taker, 'pas') * 0.8 + now(taker, 'dri') * 0.2;
  const pressureOnCrosser = L ? nearestRival(match, L.pos, side, from).dist : 4;
  const base = { t: 'pass', kind: 'cross', side, from: taker.id, p0: +from.p.toFixed(1), a0: +from.a.toFixed(1), lofted, cross: type, zone, place, dur: lofted ? 1.7 : 1.2 };
  // A poor delivery: hits the first man, sails over everyone or drops for the keeper.
  const error = clamp(0.29 - (delivery - 70) / 140 + (pressureOnCrosser < 2 ? 0.08 : 0) - (setPiece ? 0.06 : 0), 0.1, 0.5);
  if (random() < error) {
    const r = random();
    if (r < 0.48) {
      const block = { p: from.p + (target.p - from.p) * 0.25, a: from.a + (target.a - from.a) * 0.25 };
      const first = nearestRival(match, boxPos, side, block).player;
      push(match, chain, { ...base, to: null, by: first?.id || null, p1: +block.p.toFixed(1), a1: +block.a.toFixed(1), ok: false, dur: 0.9 });
      if (random() < 0.38) { corner(match, chain, side); return 2; }
      match.stats[rivalSide].clearances += 1;
      return 2 + secondBall(match, chain, side, { p: clamp(block.p - 14 - random() * 16, 40, 82), a: clamp(block.a + (50 - block.a) * 0.5, 15, 85) });
    }
    if (r < 0.78 || !keeper) {
      const over = { p: lofted ? 99 + random() * 3 : 92, a: 50 - (from.a < 50 ? -1 : 1) * (22 + random() * 14) };
      push(match, chain, { ...base, to: null, p1: +over.p.toFixed(1), a1: +clamp(over.a, -2, 102).toFixed(1), ok: false });
      if (over.p >= 99) { restart(match, rivalSide, 'goal-kick', { p: 5, a: 50 }); return 6; }
      return 2 + secondBall(match, chain, side, { p: 88, a: clamp(over.a, 8, 92) });
    }
    push(match, chain, { ...base, to: null, by: keeper.id, p1: +target.p.toFixed(1), a1: +target.a.toFixed(1), ok: false, claim: true });
    giveBall(match, rivalSide, mirror(target), keeper);
    adjust(keeper, 0.05);
    return 4;
  }
  const run = runFor(zone);
  // The keeper comes for lofted balls into his area.
  if (lofted && keeper) {
    const crowd = runs.filter((r) => r.zone === 'six' || r.zone === 'near').length;
    const reach = { six: 0.3, near: 0.13, far: 0.16, spot: 0.06, edge: 0 }[zone] ?? 0.05;
    const claimChance = reach * (claiming(keeper) / 72) ** 2 * (crowd >= 2 ? 0.75 : 1) * (scheme === 'zonal' ? 1.15 : 1) * (1 + role(keeper).sweep * 0.4);
    if (random() < claimChance) {
      const punch = random() < 0.3;
      push(match, chain, { ...base, to: run?.player.id || null, by: keeper.id, p1: +target.p.toFixed(1), a1: +target.a.toFixed(1), ok: false, claim: true, punch });
      adjust(keeper, 0.07);
      if (punch) return 2 + secondBall(match, chain, side, { p: 76 + random() * 8, a: 30 + random() * 40 });
      giveBall(match, rivalSide, mirror(target), keeper);
      return 4;
    }
  }
  const attacker = run?.player || null;
  const marker = attacker ? marks[attacker.id] : null;
  if (!attacker) {
    // Nobody attacked that space: a defender clears it.
    const clearer = nearestRival(match, boxPos, side, target).player;
    push(match, chain, { ...base, to: null, by: clearer?.id || null, p1: +target.p.toFixed(1), a1: +target.a.toFixed(1), ok: false });
    return 2 + clearHeader(match, chain, side, clearer, target);
  }
  let win;
  if (lofted) {
    // Defenders attack the ball facing it; at set pieces the box is packed.
    let edge = (aerial(attacker) - (marker ? aerial(marker) : 35)) / 85 + (delivery - 70) / 260 - (setPiece ? 0.03 : 0);
    if (scheme === 'zonal') edge += zone === 'six' || zone === 'near' ? -0.07 : zone === 'spot' || zone === 'edge' ? 0.05 : 0;
    if (scheme === 'man') edge += zone === 'far' ? 0.04 : -0.02;
    if (!marker) edge += 0.3;
    win = clamp(0.38 + edge - compactness(match.sides[rivalSide].tactics) * 0.5, 0.1, 0.82);
  } else {
    // Driven low: the near-post defender in the lane first, then the race to the ball.
    const lane = L ? laneRisk(match, L.pos, side, from, target).risk : 0.3;
    win = clamp(0.42 + (delivery - 70) / 200 - lane * 0.45 + (marker ? (now(attacker, 'pac') - now(marker, 'pac')) / 160 : 0.25), 0.1, 0.75);
  }
  // A shove at the back post.
  if (marker && random() < 0.03) {
    const attackerFoul = random() < 0.86;
    push(match, chain, { ...base, to: attacker.id, by: marker.id, p1: +target.p.toFixed(1), a1: +target.a.toFixed(1), ok: false });
    if (attackerFoul) return 2 + foul(match, chain, attacker, marker, mirror(target));
    return 2 + foul(match, chain, marker, attacker, target, { inBox: true });
  }
  if (random() < win) {
    match.stats[side].crossOk += 1;
    if (memoryOf(match, side) && !setPiece) memoryOf(match, side).crossesWon += 1;
    if (lofted) { match.stats[side].aerialsWon += 1; attacker.aerials += 1; }
    attacker.touches += 1;
    push(match, chain, { ...base, to: attacker.id, by: marker?.id || null, p1: +target.p.toFixed(1), a1: +target.a.toFixed(1), ok: true });
    match.ball = { ...match.ball, side, p: target.p, a: target.a, carrier: attacker.id, last: 'cross', lastFrom: taker.id };
    const pressure = marker ? clamp(0.55 - (win - 0.35), 0.2, 0.75) : 0.15;
    const r = random();
    // Near-post flick-on to the far post.
    const far = runFor('far');
    if (lofted && zone === 'near' && far && far.player !== attacker && r < 0.22) {
      push(match, chain, { t: 'pass', kind: 'flick', side, from: attacker.id, to: far.player.id, p0: +target.p.toFixed(1), a0: +target.a.toFixed(1), p1: +far.at.p.toFixed(1), a1: +far.at.a.toFixed(1), ok: true, lofted: true, dur: 0.8 });
      match.ball = { ...match.ball, p: far.at.p, a: far.at.a, carrier: far.player.id };
      return 2.4 + resolveShot(match, chain, far.player, 'header', far.at, { creator: attacker, pressure: 0.3 });
    }
    // Knock-down to a teammate arriving at the edge.
    const edgeRun = runFor('edge') || runFor('spot');
    if (lofted && edgeRun && edgeRun.player !== attacker && r > 0.86) {
      const at = edgeRun.at;
      push(match, chain, { t: 'pass', kind: 'flick', side, from: attacker.id, to: edgeRun.player.id, p0: +target.p.toFixed(1), a0: +target.a.toFixed(1), p1: +at.p.toFixed(1), a1: +at.a.toFixed(1), ok: true, lofted: true, dur: 0.8 });
      match.ball = { ...match.ball, p: at.p, a: at.a, carrier: edgeRun.player.id };
      return 2.4 + resolveShot(match, chain, edgeRun.player, 'volley', at, { creator: attacker, pressure: 0.35 });
    }
    const kind = lofted ? (r < 0.8 ? (setPiece ? 'corner-header' : 'header') : 'volley') : (zone === 'six' || zone === 'near' ? 'tap-in' : 'open');
    return 1.8 + resolveShot(match, chain, attacker, kind, target, { creator: taker, pressure });
  }
  if (marker) { match.stats[rivalSide].aerialsWon += lofted ? 1 : 0; marker.aerials += lofted ? 1 : 0; adjust(marker, 0.05); }
  push(match, chain, { ...base, to: attacker.id, by: marker?.id || null, p1: +target.p.toFixed(1), a1: +target.a.toFixed(1), ok: false });
  return 2 + clearHeader(match, chain, side, marker || nearestRival(match, boxPos, side, target).player, target);
}

/** A cross won by the defence: headed or hooked away, often to the edge of the box. */
function clearHeader(match, chain, side, clearer, target) {
  const random = match.random;
  const rivalSide = other(side);
  if (clearer) { match.stats[rivalSide].clearances += 1; clearer.clearances += 1; adjust(clearer, 0.04); }
  const r = random();
  if (r < 0.27) { corner(match, chain, side); return 1; }
  if (r < 0.66) {
    // Short clearance: a second ball around the edge of the area.
    const drop = { p: clamp(74 + random() * 10, 66, 84), a: clamp(target.a + (random() - 0.5) * 34, 18, 82) };
    if (clearer) push(match, chain, { t: 'clear', side: rivalSide, from: clearer.id, p0: +(100 - target.p).toFixed(1), a0: +(100 - target.a).toFixed(1), p1: +(100 - drop.p).toFixed(1), a1: +(100 - drop.a).toFixed(1), header: true, dur: 1 });
    match.ball = { ...match.ball, side, p: drop.p, a: drop.a, carrier: null };
    return 1 + secondBall(match, chain, side, drop);
  }
  // A big clearance into midfield.
  const far = { p: clamp(38 + random() * 22, 30, 62), a: clamp(20 + random() * 60, 8, 92) };
  if (clearer) push(match, chain, { t: 'clear', side: rivalSide, from: clearer.id, p0: +(100 - target.p).toFixed(1), a0: +(100 - target.a).toFixed(1), p1: +(100 - far.p).toFixed(1), a1: +(100 - far.a).toFixed(1), header: true, dur: 1.6 });
  if (random() < 0.14) { restart(match, side, 'throw-in', { p: far.p, a: random() < 0.5 ? 0.5 : 99.5 }); return 5; }
  match.ball = { ...match.ball, side, p: far.p, a: far.a, carrier: null };
  return 1.5 + secondBall(match, chain, side, far, { bias: -0.06 });
}

/* Set-ups for restarts: who stands where before the ball is played */

/**
 * A direct free kick: the wall 9.15 m from the ball covering the near post
 * (bigger the closer and more central the kick), the keeper a step towards
 * the far post, an attacker on the end of the wall, others waiting for the
 * rebound, the rest of the defence marking them. Points in the attacking frame.
 */
function directFreeKickSetup(match, side, taker, at) {
  const rivals = onPitch(match, other(side));
  const team = onPitch(match, side);
  const bx = at.p * 1.05; const by = at.a * 0.68;
  const dist = Math.hypot(105 - bx, 34 - by);
  const offAngle = Math.abs(by - 34) / Math.max(1, 105 - bx);
  let n = offAngle < 0.35 ? (dist < 22 ? 5 : dist < 30 ? 4 : 3) : offAngle < 0.8 ? 3 : 2;
  if (dist > 34) n = Math.min(n, 2);
  const farSign = by < 34 ? 1 : -1;
  const aimY = (by < 34 ? 34 - 3.66 : 34 + 3.66) - farSign * 0.5;
  const len = Math.hypot(105 - bx, aimY - by) || 1;
  const ux = (105 - bx) / len; const uy = (aimY - by) / len;
  let px = -uy; let py = ux;
  if (py * farSign < 0) { px = -px; py = -py; }
  const spot = (k, back = 0) => ({ p: (bx + ux * (9.15 + back) + px * k * 0.62) / 1.05, a: (by + uy * (9.15 + back) + py * k * 0.62) / 0.68 });
  const keeper = keeperOf(rivals);
  const outfield = rivals.filter((p) => p !== keeper);
  const markers = outfield.slice().sort((x, y) => aerial(y) - aerial(x));
  const wall = outfield.slice().sort((x, y) => aerial(x) - aerial(y)).filter((p) => !markers.slice(0, 3).includes(p)).slice(0, n);
  const entries = wall.map((p, k) => ({ player: p, at: spot(k) }));
  if (keeper) entries.push({ player: keeper, at: { p: 99.4, a: (34 + farSign * 1.3) / 0.68 } });
  const attackers = team.filter((p) => p !== taker && p.slot !== 'GK').sort((x, y) => role(y).shoot - role(x).shoot);
  const second = attackers.find((p) => now(p, 'sho') >= now(taker, 'sho') - 6) || attackers[0];
  const back = { p: (bx - ux * 2) / 1.05, a: (by - uy * 2) / 0.68 };
  entries.push({ player: taker, at: back });
  if (second) entries.push({ player: second, at: { p: back.p - 0.5, a: back.a + farSign * 1.6 } });
  const lurkers = attackers.filter((p) => p !== second).slice(0, 4);
  const lurkSpots = [spot(n + 1.6), { p: 90, a: 50 + farSign * 6 }, { p: 89, a: 50 - farSign * 3 }, { p: Math.max(at.p + 3, 80), a: 50 + farSign * 9 }];
  const freeMarkers = markers.filter((d) => !wall.includes(d));
  lurkers.forEach((p, k) => {
    entries.push({ player: p, at: lurkSpots[k] });
    const m = freeMarkers[k];
    if (m && k > 0) entries.push({ player: m, at: { p: Math.min(99, lurkSpots[k].p + 1), a: lurkSpots[k].a + (50 - lurkSpots[k].a) * 0.1 } });
  });
  return { place: placeOf(entries), wall: wall.map((p) => p.id) };
}

/**
 * A free kick to be swung into the box: the defence holds a line around the
 * edge of the area (dropping only when the ball is struck), one man blocks
 * the kick, the keeper a few metres off his line; the attackers line up level
 * with the defenders so as not to be offside, and attack the ball from there.
 */
function crossedFreeKickSetup(match, side, taker, at, L) {
  const setup = boxSetup(match, side, taker, at, { setPiece: true, L });
  const rivals = onPitch(match, other(side));
  const keeper = keeperOf(rivals);
  const line = clamp(Math.max(at.p + 4, 83.5), 83.5, 90);
  const entries = [];
  const runners = setup.runs.map((r) => r.player);
  runners.forEach((p, k) => {
    const a = 34 + (k / Math.max(1, runners.length - 1)) * 32;
    entries.push({ player: p, at: { p: line - 0.5, a } });
    const m = setup.marks[p.id];
    if (m) entries.push({ player: m, at: { p: line + 0.4, a: a + 1.2 } });
  });
  const used = new Set([...runners.map((p) => p.id), ...Object.values(setup.marks).map((p) => p.id)]);
  const blocker = rivals.find((p) => p !== keeper && !used.has(p.id));
  if (blocker) {
    const bx = at.p * 1.05; const by = at.a * 0.68;
    const len = Math.hypot(105 - bx, 34 - by) || 1;
    entries.push({ player: blocker, at: { p: (bx + ((105 - bx) / len) * 9.15) / 1.05, a: (by + ((34 - by) / len) * 9.15) / 0.68 } });
    used.add(blocker.id);
  }
  const sweeper = rivals.find((p) => p !== keeper && !used.has(p.id));
  if (sweeper) entries.push({ player: sweeper, at: { p: 79, a: 50 } });
  if (keeper) entries.push({ player: keeper, at: { p: 95.5, a: 50 + (at.a < 50 ? 2 : -2) } });
  entries.push({ player: taker, at: { p: at.p - 1.5, a: at.a + (at.a < 50 ? -1 : 1) } });
  return placeOf(entries);
}

/** Goal kick played short: centre backs split to the corners of the box, full backs high and wide, the pivot in front. */
function goalKickSetup(match, side, keeper, short) {
  const team = onPitch(match, side);
  const entries = [{ player: keeper, at: { p: 4.5, a: 50 } }];
  if (!short) return placeOf(entries);
  const cbs = team.filter((p) => p.slot === 'CB').sort((x, y) => slotX(match, x) - slotX(match, y));
  const spots = cbs.length >= 3 ? [{ p: 9, a: 20 }, { p: 5.5, a: 62 }, { p: 9, a: 80 }] : [{ p: 9, a: 22 }, { p: 9, a: 78 }];
  cbs.slice(0, spots.length).forEach((p, k) => entries.push({ player: p, at: spots[k] }));
  for (const p of team) {
    if (['RB', 'RWB'].includes(p.slot)) entries.push({ player: p, at: { p: 21, a: 93 } });
    if (['LB', 'LWB'].includes(p.slot)) entries.push({ player: p, at: { p: 21, a: 7 } });
  }
  const pivot = team.find((p) => p.slot === 'CDM') || team.find((p) => p.slot === 'CM');
  if (pivot) entries.push({ player: pivot, at: { p: 20, a: 46 } });
  return placeOf(entries);
}

function slotX(match, p) {
  const shape = FORMATIONS[match.sides[p.side].formation] || FORMATIONS['4-3-3'];
  const entry = shape[match.sides[p.side].lineup.indexOf(p.id)];
  return entry ? entry[1] : 50;
}

function executeRestart(match, chain) {
  const random = match.random;
  const ball = match.ball;
  const side = ball.side;
  const team = onPitch(match, side);
  if (!team.length) return 60;
  const t = match.sides[side].tactics;
  const L = layoutTeams(match, { ...ball, carrier: null });
  const pos = L.pos;
  const at = { p: ball.p, a: ball.a };
  const kind = ball.restart;
  const ev = ball.ev;
  ball.restart = null;
  ball.ev = undefined;
  const diff = match.score[side] - match.score[other(side)];
  // Time wasting when ahead late on: slow restarts, and the referee notices.
  const wasting = t.timeWasting && diff > 0 && displayMinute(match).minute >= 70 ? 7 : 0;
  if (kind === 'kickoff') {
    const taker = team.find((p) => p.slot === 'ST') || team.find((p) => p.slot === 'CAM') || team[team.length - 1];
    const mate = team.filter((p) => ['CM', 'CDM', 'CAM'].includes(p.slot))[0] || team.find((p) => p !== taker) || taker;
    push(match, chain, { t: 'restart', kind: 'kickoff', side, by: taker.id, p: 50, a: 50, dur: 1.2 });
    // The kick-off goes back to a midfielder where he lined up for it, in his own half.
    const spot = kickoffSpot(slotEntry(match.sides[side].formation, match.sides[side].lineup, mate.id, mate.slot));
    const to = { p: spot.p + 1, a: spot.a };
    push(match, chain, { t: 'pass', kind: 'back', side, from: taker.id, to: mate.id, p0: 50, a0: 50, p1: to.p, a1: to.a, ok: true, dur: 1.4 });
    match.stats[side].passes += 1; match.stats[side].passOk += 1; taker.passes += 1; taker.passOk += 1;
    ball.p = to.p; ball.a = to.a; ball.carrier = mate.id;
    return 4;
  }
  if (kind === 'goal-kick') {
    match.stats[side].goalKicks += 1;
    const keeper = keeperOf(team) || team[0];
    const rivalT = match.sides[other(side)].tactics;
    let short = { short: 0.86, mixed: 0.5, long: 0.12 }[t.goalKicks] * (0.75 + role(keeper).short * 0.5);
    // A high press on goal kicks makes "mixed" sides go long.
    if (rivalT.block === 'high' && t.goalKicks === 'mixed') short *= 0.65;
    const playShort = random() < clamp(short, 0.05, 0.95);
    const place = goalKickSetup(match, side, keeper, playShort);
    // The ball goes down anywhere in the six-yard box; the kick is taken from exactly there.
    const spotA = clamp(at.a, 42, 58);
    push(match, chain, { t: 'restart', kind: 'goal-kick', side, by: keeper.id, p: 4.5, a: spotA, short: playShort, place, dur: 2.2 });
    ball.p = 4.5; ball.a = spotA; ball.carrier = keeper.id;
    if (playShort) {
      // The centre backs have split: the pass goes to where they stand now.
      const kickLayout = { ...L, pos: { ...L.pos } };
      for (const [id, p, a] of place) kickLayout.pos[id] = { p, a };
      return 8 + wasting + pass(match, chain, keeper, 'short', kickLayout);
    }
    return 8 + wasting + pass(match, chain, keeper, 'long', L);
  }
  if (kind === 'throw-in') {
    match.stats[side].throwIns += 1;
    const thrower = nearestOwn(match, pos, side, at) || team[0];
    push(match, chain, { t: 'restart', kind: 'throw-in', side, by: thrower.id, p: at.p, a: at.a, dur: 1.6 });
    ball.carrier = thrower.id;
    const longThrow = at.p >= 78 && (attr(thrower, 'phy') >= 80 || t.buildUp === 'direct') && random() < 0.55;
    if (longThrow) return 7 + wasting + deliverCross(match, chain, side, thrower, at, { setPiece: true, type: 'throw', L });
    return 5 + wasting + pass(match, chain, thrower, 'short', L, { throwIn: true });
  }
  if (kind === 'corner') {
    const taker = setPieceTaker(team, 'corner');
    const from = { p: 99.5, a: at.a };
    const routine = t.corners === 'short' ? (random() < 0.7 ? 'short' : 'mixed') : t.corners;
    const setup = boxSetup(match, side, taker, from, { setPiece: true, L });
    // Players take their marks before the kick: attackers on the edge of the six-yard box and the spot, markers goal-side.
    const ready = setup.runs.map((r, i) => ({ player: r.player, at: { p: 88 + (i % 3) * 1.6, a: 40 + ((i * 7) % 20) } }));
    const guards = setup.runs.map((r, i) => (setup.marks[r.player.id] ? { player: setup.marks[r.player.id], at: { p: 90 + (i % 3) * 1.6, a: 41 + ((i * 7) % 20) } } : null));
    const zonalGuards = Object.entries(setup.zoneMen || {}).map(([z, d]) => ({ player: d, at: { p: setup.zones[z].p - 1, a: setup.zones[z].a } }));
    push(match, chain, { t: 'restart', kind: 'corner', side, by: taker.id, p: 99.5, a: at.a, ev, place: placeOf([...ready, ...guards, ...zonalGuards]), dur: 2.5 });
    ball.carrier = taker.id;
    if (routine === 'short' || random() < 0.06) {
      const mate = team.filter((p) => p !== taker && p.slot !== 'GK').sort((x, y) => metres(pos[x.id] || at, at) - metres(pos[y.id] || at, at))[0];
      if (mate) {
        const spot = { p: 93, a: at.a < 50 ? 8 : 92 };
        push(match, chain, { t: 'pass', kind: 'short', side, from: taker.id, to: mate.id, p0: 99.5, a0: at.a, p1: spot.p, a1: spot.a, ok: true, dur: 1 });
        match.stats[side].passes += 1; match.stats[side].passOk += 1; taker.passes += 1; taker.passOk += 1;
        ball.p = spot.p; ball.a = spot.a; ball.carrier = mate.id; ball.last = 'short';
        if (random() < 0.55) return 16 + deliverCross(match, chain, side, mate, spot, { setPiece: true, type: 'high', L });
        return 16;
      }
    }
    return 18 + wasting + deliverCross(match, chain, side, taker, from, { setPiece: true, type: `corner-${routine === 'short' ? 'mixed' : routine}`, L });
  }
  if (kind === 'penalty') {
    const taker = setPieceTaker(team, 'penalty');
    push(match, chain, { t: 'restart', kind: 'penalty', side, by: taker.id, p: 89.5, a: 50, ev, dur: 3 });
    return 45 + resolveShot(match, chain, taker, 'penalty', { p: 89.5, a: 50 });
  }
  if (kind === 'free-kick') {
    match.stats[side].freeKicks += 1;
    const danger = at.p >= 70 && at.a > 22 && at.a < 78;
    const wideDanger = at.p >= 68 && !danger;
    if (danger) {
      const taker = setPieceTaker(team, 'freekick');
      ball.carrier = taker.id;
      if (random() < 0.36 && at.p < 84) {
        const setup = directFreeKickSetup(match, side, taker, at);
        push(match, chain, { t: 'restart', kind: 'free-kick', side, by: taker.id, p: at.p, a: at.a, direct: true, place: setup.place, wall: setup.wall, dur: 3 });
        return 22 + wasting + resolveShot(match, chain, taker, 'freekick', at);
      }
      push(match, chain, { t: 'restart', kind: 'free-kick', side, by: taker.id, p: at.p, a: at.a, place: crossedFreeKickSetup(match, side, taker, at, L), dur: 3 });
      return 22 + wasting + deliverCross(match, chain, side, taker, at, { setPiece: true, type: 'freekick', L });
    }
    if (wideDanger) {
      const taker = setPieceTaker(team, 'corner');
      push(match, chain, { t: 'restart', kind: 'free-kick', side, by: taker.id, p: at.p, a: at.a, place: crossedFreeKickSetup(match, side, taker, at, L), dur: 2.5 });
      ball.carrier = taker.id;
      return 16 + wasting + deliverCross(match, chain, side, taker, at, { setPiece: true, type: 'freekick', L });
    }
    const taker = nearestOwn(match, pos, side, at) || team[0];
    push(match, chain, { t: 'restart', kind: 'free-kick', side, by: taker.id, p: at.p, a: at.a, dur: 1.5 });
    ball.carrier = taker.id;
    return 7 + wasting + pass(match, chain, taker, at.p < 40 && (t.buildUp === 'direct' || random() < 0.3) ? 'long' : 'short', L);
  }
  return 1;
}

/* Fouls and cards */

function foul(match, chain, offender, victim, point, { tactical = false, reckless = false, inBox: inArea = false, dogso = false } = {}) {
  const random = match.random;
  // A foul by the defending side inside its own penalty area is a penalty, wherever it comes from
  // (the point is in the frame of the fouled side, so that is its attacking box).
  const inBox = inArea || (point.p >= 84 && point.a > 20 && point.a < 80);
  const foulingSide = offender.side;
  const victimSide = victim.side;
  match.stats[foulingSide].fouls += 1;
  offender.fouls += 1;
  victim.fouled += 1;
  adjust(offender, -0.05);
  adjust(victim, 0.03);
  const late = displayMinute(match).minute > 70;
  const strict = match.referee?.strict ?? 1;
  const tackling = match.sides[foulingSide].tactics.tackling;
  const harsh = tackling === 'aggressive' ? 1.25 : tackling === 'ease' ? 0.75 : 1;
  const lastMan = inBox && victim && ATTACKERS.has(victim.slot) && random() < 0.1;
  let card = null;
  const red = (lastMan ? 0.12 : 0.0026) * strict * harsh;
  const yellow = clamp(0.165 * strict * harsh * (offender.yc && !inBox ? 0.35 : 1) * (tactical ? 3.6 : 1) * (reckless ? 1.7 : 1) * (late ? 1.15 : 1) * (inBox ? 1.4 : 1), 0, 0.85);
  const roll = random();
  if (roll < red) card = 'red';
  else if (roll < red + yellow) card = offender.yc ? 'second-yellow' : 'yellow';
  // Denying an obvious goal-scoring opportunity: red outside the box, usually yellow with the penalty.
  if (dogso) card = random() < (inBox ? 0.22 : 0.78) ? 'red' : offender.yc ? 'second-yellow' : 'yellow';
  const ev = addEvent(match, { type: 'foul', side: foulingSide, player: offender.id, victim: victim.id, inBox, dangerous: !inBox && point.p >= 70 && point.a > 20 && point.a < 80, tactical, dogso });
  let dur = push(match, chain, { t: 'foul', side: foulingSide, by: offender.id, victim: victim.id, p: +point.p.toFixed(1), a: +point.a.toFixed(1), ev, inBox, dur: 1.4 }) + 10;
  if (card) {
    if (card === 'yellow') { offender.yc += 1; match.stats[foulingSide].yc += 1; adjust(offender, -0.35); }
    else {
      if (card === 'second-yellow') { offender.yc += 1; match.stats[foulingSide].yc += 1; }
      offender.rc = 1; offender.off = displayMinute(match).minute; match.stats[foulingSide].rc += 1; adjust(offender, -1.8);
    }
    const cardEv = addEvent(match, { type: 'card', side: foulingSide, player: offender.id, card });
    dur += push(match, chain, { t: 'card', side: foulingSide, by: offender.id, card, ev: cardEv, p: +point.p.toFixed(1), a: +point.a.toFixed(1), dur: 2.5 }) + 18;
    if (offender.rc) {
      match.sides[foulingSide].lineup = match.sides[foulingSide].lineup.filter((id) => id !== offender.id);
      if (offender.slot === 'GK') emergencyKeeper(match, foulingSide);
    }
  }
  if (inBox) {
    match.stats[victimSide].penaltiesWon = (match.stats[victimSide].penaltiesWon || 0) + 1;
    const awarded = addEvent(match, { type: 'penalty-awarded', side: victimSide, player: victim.id });
    restart(match, victimSide, 'penalty', { p: 89.5, a: 50 }, { ev: awarded });
    return dur + 30;
  }
  restart(match, victimSide, 'free-kick', point);
  return dur;
}

/* Open play: reading the situation */

function zoneOf(ball) {
  if (ball.p >= 84 && ball.a > 20 && ball.a < 80) return 'box';
  if (ball.p >= 84) return 'byline';
  if (ball.p >= 66) return 'final';
  if (ball.p >= 33) return 'middle';
  return 'build';
}

const KIND_BASE = {
  build: { short: 54, back: 9, long: 6.5, switch: 5, carry: 17, dribble: 1.1, through: 2, cross: 0, cutback: 0, shot: 0 },
  middle: { short: 46, back: 10, long: 4.5, switch: 4.5, carry: 16, dribble: 2.2, through: 4.6, cross: 0.3, cutback: 0, shot: 0.35 },
  final: { short: 36, back: 15, long: 1, switch: 4.5, carry: 8, dribble: 3.2, through: 5, cross: 3.6, cutback: 0, shot: 1.6 },
  box: { short: 24, back: 18, long: 0, switch: 0, carry: 4, dribble: 3.4, through: 2, cross: 0, cutback: 7, shot: 6.4 },
  byline: { short: 18, back: 18, long: 0, switch: 0, carry: 3, dribble: 4.4, through: 0, cross: 18, cutback: 14, shot: 1.2 },
};

/** What the player on the ball sees. */
function situation(match, carrier, L) {
  const side = carrier.side;
  const ball = match.ball;
  const here = { p: ball.p, a: ball.a };
  const pos = L.pos;
  let space = 40;
  let crowd = 0;
  for (const r of onPitch(match, other(side))) {
    if (!pos[r.id]) continue;
    const q = mirror(pos[r.id]);
    const d = metres(q, here);
    if (d < 15) crowd += 1;
    const ahead = (q.p - here.p) * 1.05;
    if (ahead > 0 && Math.abs(q.a - here.a) * 0.68 < ahead + 3) space = Math.min(space, d);
  }
  let box = 0;
  let edge = false;
  let runner = false;
  let target = false;
  for (const p of onPitch(match, side)) {
    if (p === carrier || p.slot === 'GK' || !pos[p.id]) continue;
    const q = pos[p.id];
    const r = role(p);
    if (q.p >= 82 && q.a > 18 && q.a < 82) box += 1;
    else if (q.p >= 62 && r.box >= 0.4) box += r.box * 0.7;
    if (q.p >= 72 && q.p < 87 && q.a > 28 && q.a < 72) edge = true;
    if (r.run >= 0.3 && q.p > here.p + 3 && L.offside - q.p < 7) runner = true;
    if (r.hold >= 0.8) target = true;
  }
  const behind = (100 - L.offside) * 1.05;
  const xg = here.p >= 60 ? shotXg(here.p, here.a, here.p < 80 ? 'long' : 'open') : 0;
  const block = here.p >= 60 ? shotBlock(match, pos, side, here).block : 0;
  return { space, crowd, box, edge, runner, target, behind, xg, block, facing: ball.facing || 'goal' };
}

function chooseKind(match, carrier, ball, pressure, sit) {
  const random = match.random;
  const zone = zoneOf(ball);
  const team = match.sides[carrier.side];
  const t = team.tactics;
  const r = role(carrier);
  const w = { ...KIND_BASE[zone] };
  const wide = ball.a < 24 || ball.a > 76;
  if (zone === 'final' && wide) { w.cross += 4.6; w.dribble += 1; w.shot *= 0.5; }
  if (zone === 'final' && !wide) { w.cross = 0; w.through += 2; }
  if (t.tempo === 'fast') { w.through *= 1.3; w.long *= 1.5; w.short *= 0.85; w.back *= 0.7; w.carry *= 1.15; }
  if (t.tempo === 'slow') { w.short *= 1.15; w.back *= 1.45; w.long *= 0.55; w.through *= 0.8; }
  const risk = MENTALITY_RISK[t.mentality] || 0;
  w.through *= 1 + risk; w.shot *= 1 + risk * 0.6; w.back *= 1 - risk * 0.4; w.cross *= 1 + risk * 0.5;
  // A cautious side takes no risks at the back: clear it or go long rather than play out under pressure.
  if (risk < 0 && zone === 'build' && pressure < 4) { w.clear = (w.clear || 0) - risk * 22; w.long *= 1 - risk * 1.5; w.short *= 1 + risk * 0.6; }
  if (t.width === 'wide') { w.cross *= 1.35; w.switch *= 1.4; }
  if (t.width === 'narrow') { w.cross *= 0.65; w.through *= 1.1; w.short *= 1.05; }
  // Build-up style.
  if (t.buildUp === 'short') { w.short *= 1.12; w.back *= 1.15; w.long *= 0.42; }
  if (t.buildUp === 'direct') { w.long *= 1.6; w.short *= 0.86; w.back *= 0.72; w.through *= 1.12; }
  if (t.buildUp === 'counter') { w.through *= 1.22; w.long *= 1.3; w.back *= 0.82; w.carry *= 1.12; }
  // Final third instructions.
  if (zone === 'final' || zone === 'box' || zone === 'byline') {
    if (t.finalThird === 'work-box') { w.shot *= sit.xg < 0.07 ? 0.55 : 1.05; w.cross *= 0.55; w.short *= 1.1; w.cutback *= 1.25; w.through *= 1.1; }
    if (t.finalThird === 'early-cross') { w.cross *= 1.65; w.cutback *= 0.85; }
    if (t.finalThird === 'shoot') w.shot *= 1.5;
  }
  if (zone === 'final' && wide && ball.p < 80 && t.finalThird === 'early-cross') w.cross += 2.5;
  w.dribble *= { reduced: 0.55, balanced: 1, encouraged: 1.45 }[t.dribbling] ?? 1;
  if (ball.counter > 0) { w.through *= 1.7; w.carry *= 1.5; w.back *= 0.25; w.short *= 0.75; w.long *= 1.3; }
  const slot = carrier.slot;
  if (slot === 'GK') {
    const press = match.sides[other(carrier.side)].tactics.block === 'high' ? 0.15 : 0;
    const long = { short: 0.12, balanced: 0.3, counter: 0.42, direct: 0.62 }[t.buildUp] + press - (r.short - 0.5) * 0.5;
    return random() < clamp(long, 0.05, 0.85) ? 'long' : 'short';
  }
  if (slot === 'CB') { w.dribble *= 0.25; w.long *= 1.3; w.through *= 0.6; w.shot *= 0.3; }
  if (['RW', 'LW', 'RM', 'LM'].includes(slot)) { w.dribble *= 1.6; w.cross *= 1.3; }
  if (slot === 'ST') { w.shot *= 1.45; w.back *= 1.2; w.cross *= 0.4; }
  if (slot === 'CAM') { w.through *= 1.5; w.shot *= 1.2; }
  if (['RB', 'LB', 'RWB', 'LWB'].includes(slot)) { w.cross *= 1.2; w.dribble *= 0.7; }
  // The role: an inside forward shoots, a winger crosses, a playmaker slips the pass.
  w.dribble *= r.dribble; w.shot *= r.shoot; w.cross *= r.cross; w.through *= 0.65 + r.create * 0.35; w.switch *= 0.75 + r.create * 0.25;
  if (r.hold >= 0.8 && sit.facing === 'back') { w.short *= 1.3; w.back *= 1.2; }
  // Home crowd: a little more ambition, a little more belief in front of goal.
  if (!match.neutral && carrier.side === 'home') { w.shot *= 1.07; w.through *= 1.05; w.back *= 0.96; }
  // Tendencies relative to the level of this match: a good dribbler dribbles more than those around him, in any league.
  const level = match.ctx.level;
  w.dribble *= (now(carrier, 'dri') / level) ** 2;
  w.shot *= (now(carrier, 'sho') / level) ** 2;
  w.through *= (now(carrier, 'pas') / level) ** 2;
  // The CPU's sliders (FC 27): how fast it builds, how often it shoots, crosses, dribbles, plays first time.
  const side = carrier.side;
  const build = factor(slider(match, side, 'buildUp'), 0.5);
  w.back /= build; w.short /= Math.sqrt(build); w.through *= build * factor(slider(match, side, 'runs'), 0.35); w.long *= build;
  w.carry /= factor(slider(match, side, 'firstTouch'), 0.4);
  w.dribble *= factor(slider(match, side, 'dribble'), 0.6);
  w.cross *= factor(slider(match, side, 'cross'), 0.5) * (zone === 'final' && ball.p < 84 ? factor(slider(match, side, 'earlyCross'), 0.5) : 1);
  w.shot *= zone === 'final' ? factor(slider(match, side, 'longShot'), 0.6) : factor(slider(match, side, 'shot'), 0.5);
  // Attacking intelligence: a sharp CPU passes up the hopeless shot and takes the good one.
  const smart = trait(match, side, 'attack');
  if (smart && zone !== 'build' && zone !== 'middle') w.shot *= sit.xg < 0.05 ? 1 - smart * 1.2 : 1 + smart * 1.2;
  // What is actually on.
  w.through *= sit.runner ? clamp(sit.behind / 18, 0.15, 1.6) : 0.06;
  w.cross *= clamp(sit.box / 2.2, 0.2, 1.7);
  w.cutback *= sit.edge ? 1.3 : 0.5;
  if (zone !== 'build' && zone !== 'middle') w.shot *= clamp(sit.xg / 0.06, 0.45, 2.8) ** 0.7 * (1 - sit.block * 0.4);
  if (sit.crowd >= 4) w.switch *= 1.8;
  if (sit.target && (zone === 'build' || zone === 'middle')) w.long *= 1.25;
  if (sit.facing === 'back' && pressure < 3.2) { w.through *= 0.25; w.shot *= 0.35; w.carry *= 0.35; w.dribble *= 0.6; w.back *= 1.8; w.short *= 1.12; }
  if (sit.space > 12 && zone !== 'box' && zone !== 'byline') w.carry *= 1.55;
  // In front of a packed block: no room to run, so shoot from distance or move it.
  if (sit.space < 5) { w.carry *= 0.45; w.dribble *= 0.8; if (zone === 'final' && !wide) w.shot *= 1.7; }
  // Pressed high with space behind the rival line: go over the press.
  if (pressure < 3 && (zone === 'build' || zone === 'middle') && sit.behind > 30) { w.long *= 1.4 + sit.behind / 60; if (sit.runner) w.through *= 1.3; }
  if (pressure < 2.5) { w.dribble *= 1.4; w.back *= 1.3; w.carry *= 0.6; if (zone === 'build') w.clear = 8 * (1 - (now(carrier, 'pas') - 50) / 60) * (t.buildUp === 'short' ? 0.6 : 1); }
  else if (pressure > 8) { w.carry *= 1.5; w.dribble *= 0.6; }
  // Late and chasing: more directness.
  const minute = displayMinute(match).minute;
  const diff = match.score[carrier.side] - match.score[other(carrier.side)];
  if (minute > 75 && diff < 0) { w.long *= 1.5; w.cross *= 1.3; w.shot *= 1.15; w.back *= 0.6; }
  if (minute > 80 && diff > 0) { w.back *= 1.4; w.short *= 1.1; w.through *= 0.7; w.shot *= 0.85; }
  return weighted(random, Object.keys(w), (key) => w[key]);
}

/**
 * The best option for a pass of this kind: forward progress (expected
 * threat), space around the receiver, how clean the lane is, the receiver's
 * role and the side the instructions want to attack through.
 */
function pickReceiver(match, carrier, kind, L) {
  const random = match.random;
  const side = carrier.side;
  const ball = match.ball;
  const pos = L.pos;
  const here = { p: ball.p, a: ball.a };
  const t = match.sides[side].tactics;
  const xtHere = threat(here.p, here.a);
  const ground = kind === 'short' || kind === 'back' || kind === 'through' || kind === 'cutback';
  const mates = onPitch(match, side).filter((p) => p !== carrier && pos[p.id] && (p.slot !== 'GK' || (kind === 'back' && ball.p < 40)));
  if (!mates.length) return null;
  const scored = mates.map((p) => {
    const q = pos[p.id];
    const r = role(p);
    const ahead = q.p - here.p;
    const d = metres(q, here);
    const open = nearestRival(match, pos, side, q).dist;
    let w = 0;
    if (kind === 'short') w = d > 4 && d < 32 && ahead > -6 ? (1 + Math.max(0, ahead) / 12) * (0.75 + r.drop * 0.5) : 0;
    else if (kind === 'back') w = ahead < 2 && d < 32 ? 1 + r.drop * 0.4 : 0;
    else if (kind === 'long') w = ahead > 18 ? (ATTACKERS.has(p.slot) ? 2.2 : WIDE.has(p.slot) ? 1.3 : 0.4) * (1 + r.hold * 0.8 + r.run * 0.3) : 0;
    else if (kind === 'switch') w = Math.abs(q.a - here.a) > 32 && ahead > -12 ? 1.3 * (WIDE.has(p.slot) ? 1.3 : 0.8) : 0;
    else if (kind === 'through') w = ahead > 3 && r.run >= 0.25 ? (1.4 + ahead / 12) * r.run * (L.offside - q.p < 8 ? 1.4 : 0.7) : 0;
    else if (kind === 'cutback') w = q.p > 70 && q.a > 26 && q.a < 74 && p.slot !== 'CB' ? 1 + r.box + r.shoot * 0.4 : 0;
    if (w <= 0) return null;
    const lane = ground && kind !== 'through' ? laneRisk(match, pos, side, here, q).risk : 0;
    const gain = threat(q.p, q.a) - xtHere;
    w *= (0.2 + Math.min(1.6, open / 5)) ** 1.3 * (1 - lane) ** 2 * Math.exp(clamp(gain, -0.05, 0.25) * 9);
    if ((t.focus === 'left' && q.a < 40) || (t.focus === 'right' && q.a > 60) || (t.focus === 'center' && q.a > 30 && q.a < 70)) w *= 1.35;
    if (t.width === 'wide' && WIDE.has(p.slot)) w *= 1.15;
    return { p, w: w * (0.7 + r.create * 0.2) };
  }).filter(Boolean);
  if (!scored.length) return null;
  // Attacking intelligence: a sharper side finds the best option more often.
  const sharp = 1 + trait(match, side, 'attack') * 2.5;
  return weighted(random, scored, (x) => x.w ** sharp).p;
}

function pass(match, chain, carrier, kind, L, { throwIn = false } = {}) {
  const random = match.random;
  const side = carrier.side;
  const ball = match.ball;
  const pos = L.pos;
  const from = { p: ball.p, a: ball.a };
  let receiver = null;
  for (const option of [kind, 'short', 'back']) {
    receiver = pickReceiver(match, carrier, option, L);
    if (receiver) { kind = option; break; }
  }
  if (!receiver) return carry(match, chain, carrier, L);
  const rr = role(receiver);
  const q = pos[receiver.id];
  let to = { p: q.p, a: q.a };
  if (kind === 'through') to = { p: clamp(Math.max(q.p, L.offside) + 5 + random() * 9, q.p, 95), a: clamp(q.a + (50 - q.a) * 0.22, 14, 86) };
  // A ball over the top: into the space behind a high line for a runner.
  const overTop = kind === 'long' && rr.run >= 0.45 && (100 - L.offside) * 1.05 > 22 && random() < 0.4;
  if (kind === 'long') to = overTop ? { p: clamp(L.offside + 6 + random() * 10, q.p, 93), a: clamp(q.a + (50 - q.a) * 0.15, 10, 90) } : { p: clamp(q.p + (random() - 0.3) * 6, 10, 94), a: q.a };
  const distance = metres(from, to);
  const rivalSide = other(side);
  const defT = match.sides[rivalSide].tactics;
  const ground = kind === 'short' || kind === 'back' || kind === 'through' || kind === 'cutback';
  const lofted = !ground;
  const lane = ground ? laneRisk(match, pos, side, from, to) : { risk: 0, cutter: null, at: null };
  const { player: closer, dist: space } = nearestRival(match, pos, side, to);
  const passerPressure = nearestRival(match, pos, side, from).dist;
  // Bodies around the reception point: a packed area swallows passes.
  let crowdTo = 0;
  for (const r of onPitch(match, rivalSide)) if (r.slot !== 'GK' && pos[r.id] && metres(mirror(pos[r.id]), to) < 4.5) crowdTo += 1;
  const passing = now(carrier, 'pas');
  const receiving = lofted ? now(receiver, 'phy') * 0.4 + control(receiver) * 0.6 : control(receiver);
  const marker = closer ? now(closer, 'def') : 50;
  const sideMid = match.ctx[side].mid;
  const rivalMid = match.ctx[rivalSide].mid;
  const base = { short: 0.95, back: 0.97, long: 0.43, switch: 0.73, through: 0.5, cutback: 0.73 }[kind] ?? 0.85;
  const lengthPenalty = (ground && kind !== 'through' ? Math.max(0, distance - 20) * 0.006 : 0) + (lofted ? Math.max(0, distance - 38) * 0.003 : 0) + Math.max(0, to.p - 66) * 0.004;
  let success = base + (passing - 72) / 250 + (receiving - 70) / 700 - (marker - 70) / 560 + (sideMid - rivalMid) / 600
    - lane.risk * 0.33 + Math.min(0.05, (space - 4) * 0.012) - lengthPenalty - (passerPressure < 1.6 ? 0.05 : passerPressure < 3 ? 0.02 : 0)
    - (match.ctx[side].missing - match.ctx[rivalSide].missing) * 0.02
    // A receiver with a defender tight on his back, worst of all in the box, has to fight for it.
    - (ground && space < 2.6 ? (2.6 - space) * (inBox(to) ? 0.2 : 0.06) : 0)
    - (ground ? Math.max(0, crowdTo - 1) * (to.p > 78 ? 0.07 : 0.04) : 0);
  // A lofted ball to a marked man is an aerial duel.
  let duel = null;
  let raceLead = 0;
  if (lofted && closer && space < 5) {
    duel = closer;
    // The defender faces the ball; the forward has his back to goal.
    success += ((aerial(receiver) * (0.85 + rr.aerial * 0.15)) - aerial(closer)) / 160 + rr.hold * 0.06 - 0.05 - (to.p > 70 ? 0.04 : 0);
  }
  if (kind === 'through' || overTop) {
    // The race: runner from his position to the ball against the nearest defender.
    const chaser = nearestRival(match, pos, side, to);
    const runT = metres(q, to) / (6 + (now(receiver, 'pac') - 60) / 14);
    const defT2 = chaser.player ? chaser.dist / (6 + (now(chaser.player, 'pac') - 60) / 14) : 9;
    // How often a ball in behind leaves him clean through: pace against the chaser, room behind the line, a broken shape.
    const chasePace = chaser.player ? now(chaser.player, 'pac') : 50;
    raceLead = clamp(0.018 + (now(receiver, 'pac') - chasePace) / 260 + Math.max(0, (100 - L.offside) * 1.05 - 25) / 900 + (ball.counter ? 0.05 : 0) + (defT.offsideTrap ? 0.03 : 0), 0.008, 0.2);
    success += clamp((defT2 - runT) * 0.09, -0.2, 0.18) + clamp((L.offside - 50) / 260, 0, 0.12);
    if (ball.counter > 0 && kind === 'through') success += 0.08;
    if (overTop) success += 0.04;
    // An offside trap that fails leaves the runner clean through.
    if (defT.offsideTrap) success += 0.05;
  }
  if (throwIn) success += 0.04;
  // Short build-up: teammates come short to support the ball; slow circulation picks the safe option.
  const own = match.sides[side].tactics;
  if (kind === 'short' || kind === 'back') success += (own.buildUp === 'short' ? 0.03 : own.buildUp === 'direct' ? -0.015 : 0) + (own.tempo === 'slow' ? 0.015 : own.tempo === 'fast' ? -0.01 : 0);
  success = clamp(success, 0.06, 0.985);
  // Offside: a runner timing a through ball or a long ball against the line.
  if ((kind === 'through' || kind === 'long') && (ATTACKERS.has(receiver.slot) || rr.run >= 0.45)) {
    const lineFactor = (defT.line === 'high' ? 1.45 : defT.line === 'deep' ? 0.6 : 1) * (defT.offsideTrap ? 1.8 : 1);
    if (random() < 0.034 * lineFactor * (ball.counter ? 0.6 : 1) * (kind === 'long' ? 0.7 : 1)) {
      match.stats[side].offsides += 1;
      const ev = addEvent(match, { type: 'offside', side, player: receiver.id });
      push(match, chain, { t: 'pass', kind, side, from: carrier.id, to: receiver.id, p0: from.p, a0: from.a, p1: +to.p.toFixed(1), a1: +to.a.toFixed(1), ok: false, offside: true, ev, dur: 1.6 });
      restart(match, rivalSide, 'free-kick', mirror({ p: Math.min(to.p, 92), a: to.a }));
      return 9;
    }
  }
  const stats = match.stats[side];
  stats.passes += 1; carrier.passes += 1; carrier.touches += 1;
  if (kind === 'long' || kind === 'switch') stats.longBalls += 1;
  const dur = clamp(0.7 + distance / (lofted ? 15 : 17), 0.8, 3.4);
  const action = { t: 'pass', kind, side, from: carrier.id, to: receiver.id, p0: +from.p.toFixed(1), a0: +from.a.toFixed(1), p1: +to.p.toFixed(1), a1: +to.a.toFixed(1), lofted, dur };
  if ((kind === 'through' || overTop) && memoryOf(match, side)) memoryOf(match, side).through += 1;
  if (kind === 'through' || overTop) action.place = placeOf([{ player: receiver, at: to }]);
  if (throwIn) action.throw = true;
  if (overTop) action.overTop = true;
  if (random() < success) {
    stats.passOk += 1; carrier.passOk += 1; receiver.touches += 1;
    if (kind === 'through') stats.throughOk += 1;
    if ((kind === 'through' || overTop) && memoryOf(match, side)) memoryOf(match, side).throughOk += 1;
    if (kind === 'long' || kind === 'switch') stats.longOk += 1;
    if (duel) { stats.aerialsWon += 1; receiver.aerials += 1; }
    adjust(carrier, kind === 'through' ? 0.07 : kind === 'long' || kind === 'switch' ? 0.03 : 0.006);
    if (from.p < 66 && to.p >= 66) stats.finalThird += 1;
    if (inBox(to)) stats.boxTouches += 1;
    push(match, chain, { ...action, ok: true, by: duel?.id || null });
    // How he receives it: facing play, half-turned, or with a man on his back.
    let facing = 'goal';
    if (to.p > from.p + 2 && space < 2.6 && kind !== 'through') facing = random() < 0.62 - rr.drop * 0.2 ? 'back' : 'side';
    else if (space < 4) facing = 'side';
    if (duel || (lofted && rr.hold >= 0.8)) facing = 'back';
    if ((kind === 'through' || overTop) && !duel && random() < raceLead) {
      // Nobody left between him and the goal: he is clean through.
      const covered = onPitch(match, rivalSide).some((r) => r.slot !== 'GK' && pos[r.id] && mirror(pos[r.id]).p > to.p + 0.5 && Math.abs(mirror(pos[r.id]).a - to.a) * 0.68 < 14);
      if (!covered) { ball.breakaway = 1.2 + random() * 2.5; ball.counter = Math.max(ball.counter || 0, 3); stats.breakaways += 1; }
    }
    ball.p = to.p; ball.a = to.a; ball.carrier = receiver.id; ball.last = overTop ? 'through' : kind; ball.lastFrom = carrier.id; ball.seq += 1; ball.facing = facing;
    ball.trigger = facing === 'back' || ball.a < 9 || ball.a > 91 || (kind === 'back' && to.p < 30) ? 'cue' : null;
    if (ball.counter > 0) ball.counter -= 1;
    // Playing through a high press leaves the pressers behind the ball.
    if (passerPressure < 2.6 && to.p > from.p + 12 && defT.block === 'high' && !ball.counter && random() < 0.45) ball.counter = 1;
    // A heavy first touch: what a pressing side waits for.
    const heavy = clamp(0.028 + ({ long: 0.07, switch: 0.05, through: 0.045 }[kind] || 0) + (space < 1.6 ? 0.04 : 0) - (control(receiver) - 70) / 700, 0.006, 0.17);
    if (closer && random() < heavy) {
      const loose = { p: clamp(to.p + (random() - 0.4) * 3, 1, 99), a: clamp(to.a + (random() - 0.5) * 4, 1, 99) };
      const rivalWins = random() < clamp(0.52 + (now(closer, 'def') - control(receiver)) / 160 + (defT.pressing === 'high' ? 0.06 : 0), 0.3, 0.8);
      push(match, chain, { t: 'loose', side, to: rivalWins ? closer.id : receiver.id, vs: rivalWins ? receiver.id : closer.id, p0: +to.p.toFixed(1), a0: +to.a.toFixed(1), p1: +loose.p.toFixed(1), a1: +loose.a.toFixed(1), touch: true, dur: 0.8 });
      adjust(receiver, -0.03);
      if (rivalWins) return dur + 1 + turnover(match, chain, closer, loose, 'recovery', receiver, { L });
      ball.p = loose.p; ball.a = loose.a; ball.facing = 'side';
    }
    // Receiving with a marker tight: sometimes he is fouled. In his own box a defender
    // rarely risks it - and when he does, it is a penalty.
    const boxFoul = inBox(to);
    if (closer && space < 3.5 && random() < 0.092 * (boxFoul ? 0.03 : 1) * (closer.yc ? 0.5 : 1) * (defT.pressing === 'high' ? 1.25 : 1) * (defT.tackling === 'aggressive' ? 1.3 : defT.tackling === 'ease' ? 0.7 : 1)) {
      return dur + 1 + foul(match, chain, closer, receiver, to, { inBox: boxFoul });
    }
    // Give and go: a first-time return into the passer's run.
    if (kind === 'short' && !throwIn && ball.carrier === receiver.id && from.p > 30 && from.p < 86 && carrier.slot !== 'GK' && receiver.slot !== 'GK'
      && random() < (0.04 + role(carrier).run * 0.08 + (facing !== 'goal' ? 0.03 : 0) + (match.sides[side].tactics.buildUp === 'short' ? 0.03 : 0)) * factor(slider(match, side, 'firstTouch'), 0.6)) {
      return dur + oneTwo(match, chain, carrier, receiver, L, from);
    }
    return dur + 2.2;
  }
  // The pass does not arrive.
  adjust(carrier, -0.04);
  const r = random();
  const outChance = ground ? (kind === 'through' ? 0.2 : 0.16 * (1 - lane.risk)) : 0.3;
  if (r < outChance) {
    if (kind === 'through' || to.p > 92) {
      push(match, chain, { ...action, ok: false, p1: 101 });
      restart(match, rivalSide, 'goal-kick', { p: 5, a: 50 });
      return dur + 7;
    }
    const end = { p: clamp(to.p + (random() - 0.4) * 10, 1, 99), a: to.a < 50 ? -1 : 101 };
    push(match, chain, { ...action, ok: false, p1: +end.p.toFixed(1), a1: end.a });
    restart(match, rivalSide, 'throw-in', mirror({ p: end.p, a: end.a < 0 ? 0.5 : 99.5 }));
    return dur + 5;
  }
  const keeper = keeperOf(onPitch(match, rivalSide));
  if ((kind === 'through' || kind === 'long') && to.p > 80 && keeper && random() < 0.28 + role(keeper).sweep * 0.4) {
    push(match, chain, { ...action, ok: false, by: keeper.id, claim: true });
    adjust(keeper, 0.05);
    // The keeper has it where he came out to take it.
    giveBall(match, rivalSide, mirror(to), keeper);
    return dur + 3;
  }
  if (duel) {
    // He loses the header: a second ball.
    match.stats[rivalSide].aerialsWon += 1; duel.aerials += 1;
    push(match, chain, { ...action, ok: false, by: duel.id, p1: +to.p.toFixed(1), a1: +to.a.toFixed(1) });
    const drop = { p: clamp(to.p - 4 - random() * 10, 3, 96), a: clamp(to.a + (random() - 0.5) * 16, 4, 96) };
    if (random() < 0.12) return dur + foul(match, chain, receiver, duel, mirror(to));
    return dur + 0.5 + secondBall(match, chain, side, drop, { bias: 0.04 });
  }
  // Intercepted in the lane, or the marker steps in front of the receiver.
  let winner = null;
  let mid = null;
  if (lane.cutter && random() < 0.35 + lane.risk) { winner = lane.cutter; mid = lane.at; }
  if (!winner) {
    mid = { p: from.p + (to.p - from.p) * (0.7 + random() * 0.28), a: from.a + (to.a - from.a) * (0.7 + random() * 0.28) };
    winner = closer || nearestRival(match, pos, side, mid).player;
  }
  if (!winner) return dur;
  if (inBox(mid) && random() < 0.08) {
    push(match, chain, { ...action, ok: false, by: winner.id, p1: +mid.p.toFixed(1), a1: +mid.a.toFixed(1), dur: dur * 0.8 });
    corner(match, chain, side);
    return dur + 2;
  }
  push(match, chain, { ...action, ok: false, by: winner.id, p1: +mid.p.toFixed(1), a1: +mid.a.toFixed(1), dur: dur * 0.8 });
  if (lofted && random() < 0.4) return dur + 0.5 + secondBall(match, chain, side, { p: clamp(mid.p - 6, 3, 96), a: mid.a });
  return dur + 1 + turnover(match, chain, winner, mid, 'interception', receiver, { L });
}

/**
 * The return pass of a one-two: the first passer has kept running beyond his
 * marker and the layoff goes first time into his path.
 */
function oneTwo(match, chain, runner, layoff, L, origin) {
  const random = match.random;
  const ball = match.ball;
  const side = runner.side;
  const run = { p: clamp(origin.p + 9 + random() * 6, origin.p, Math.min(95, Math.max(L.offside + 2, origin.p + 4))), a: clamp(origin.a + (50 - origin.a) * 0.25 + (random() - 0.5) * 8, 8, 92) };
  const from = { p: ball.p, a: ball.a };
  const first = chain[chain.length - 1];
  first.wall = true;
  first.place = placeOf([{ player: runner, at: run }]);
  const lane = laneRisk(match, L.pos, side, from, run);
  const success = clamp(0.8 + (now(layoff, 'pas') - 72) / 250 + (now(runner, 'pac') - 70) / 400 - lane.risk * 0.45 - (inBox(run) ? 0.12 : 0), 0.35, 0.92);
  const stats = match.stats[side];
  stats.passes += 1; layoff.passes += 1; layoff.touches += 1;
  const distance = metres(from, run);
  const dur = clamp(0.6 + distance / 17, 0.7, 2.5);
  const action = { t: 'pass', kind: 'short', side, from: layoff.id, to: runner.id, p0: +from.p.toFixed(1), a0: +from.a.toFixed(1), p1: +run.p.toFixed(1), a1: +run.a.toFixed(1), oneTwo: true, place: placeOf([{ player: runner, at: run }]), dur };
  if (random() < success) {
    stats.passOk += 1; layoff.passOk += 1; runner.touches += 1;
    adjust(layoff, 0.03); adjust(runner, 0.03);
    if (from.p < 66 && run.p >= 66) stats.finalThird += 1;
    if (inBox(run)) stats.boxTouches += 1;
    push(match, chain, { ...action, ok: true });
    ball.p = run.p; ball.a = run.a; ball.carrier = runner.id; ball.last = 'short'; ball.lastFrom = layoff.id; ball.facing = 'goal'; ball.trigger = null;
    return dur + 1.4;
  }
  const cutter = lane.cutter || nearestRival(match, L.pos, side, run).player;
  const at = lane.at || run;
  push(match, chain, { ...action, ok: false, by: cutter?.id || null, p1: +at.p.toFixed(1), a1: +at.a.toFixed(1) });
  return dur + (cutter ? turnover(match, chain, cutter, at, 'interception', runner, { L }) : 0);
}

function carry(match, chain, carrier, L) {
  const random = match.random;
  const ball = match.ball;
  const pos = L.pos;
  const from = { p: ball.p, a: ball.a };
  const pace = now(carrier, 'pac');
  const r = role(carrier);
  // Inside forwards and wide playmakers drive inside, wingers along the line.
  const inside = (r.id === 'inside-forward' || r.id === 'wide-playmaker') && ball.p > 55 ? 0.32 : r.id === 'winger' ? 0.02 : 0.15;
  let to = { p: clamp(from.p + 4 + random() * 6 + (pace - 70) / 15 + (ball.counter ? 5 : 0), 1, Math.max(from.p, 91)), a: clamp(from.a + (50 - from.a) * inside + (random() - 0.5) * 8, 3, 97) };
  // Nobody runs through a wall: the carry stops short of the man in front, and a packed zone is a tackle waiting to happen.
  let crowd = 0;
  let blockAt = Infinity;
  for (const r of onPitch(match, other(carrier.side))) {
    if (r.slot === 'GK' || !pos[r.id]) continue;
    const q = mirror(pos[r.id]);
    if (metres(q, to) < 5) crowd += 1;
    if (q.p > from.p && q.p < to.p + 2 && Math.abs(q.a - (from.a + to.a) / 2) * 0.68 < 2.2) blockAt = Math.min(blockAt, q.p);
  }
  if (blockAt < to.p) to = { p: Math.max(from.p + 1.5, blockAt - 1.8), a: to.a };
  const { player: closer, dist } = nearestRival(match, pos, carrier.side, to);
  const defT = match.sides[other(carrier.side)].tactics;
  const tackleFreq = factor(slider(match, other(carrier.side), 'tackle'), 0.4);
  const risk = clamp((0.045 + (dist < 3 ? 0.05 : 0) + Math.max(0, crowd - 1) * 0.045 + (blockAt < Infinity ? 0.04 : 0) + (defT.pressing === 'high' ? 0.022 : 0) + (defT.tackling === 'aggressive' ? 0.012 : 0)) * tackleFreq, 0.02, 0.3);
  carrier.touches += 2;
  if (closer && random() < risk) {
    push(match, chain, { t: 'carry', side: carrier.side, from: carrier.id, vs: closer.id, p0: from.p, a0: from.a, p1: +((from.p + to.p) / 2).toFixed(1), a1: +((from.a + to.a) / 2).toFixed(1), dur: 1.4 });
    // Where the challenge happens; in his own box the defender goes in cleanly far more often,
    // and a foul there is always a penalty.
    const at = { p: (from.p + to.p) / 2, a: (from.a + to.a) / 2 };
    const boxFoul = inBox(at);
    const foulShare = (defT.tackling === 'aggressive' ? 0.5 : defT.tackling === 'ease' ? 0.28 : 0.4) * (boxFoul ? 0.06 : 1);
    if (random() < foulShare) return 2 + foul(match, chain, closer, carrier, at, { inBox: boxFoul });
    return 2 + turnover(match, chain, closer, to, 'tackle', carrier, { L });
  }
  push(match, chain, { t: 'carry', side: carrier.side, from: carrier.id, p0: from.p, a0: from.a, p1: +to.p.toFixed(1), a1: +to.a.toFixed(1), dur: clamp(metres(from, to) / 6.5, 1, 3) });
  if (from.p < 66 && to.p >= 66) match.stats[carrier.side].finalThird += 1;
  if (inBox(to)) match.stats[carrier.side].boxTouches += 1;
  ball.p = to.p; ball.a = to.a; ball.last = 'carry'; ball.facing = 'goal'; ball.trigger = null;
  if (ball.counter > 0) ball.counter -= 1;
  return clamp(metres(from, to) / 6.5, 1, 3) + 0.8;
}

function dribble(match, chain, carrier, L) {
  const random = match.random;
  const ball = match.ball;
  const side = carrier.side;
  const pos = L.pos;
  const from = { p: ball.p, a: ball.a };
  const opponent = (L.first && match.players[L.first]) || nearestRival(match, pos, side, from).player;
  const stats = match.stats[side];
  stats.dribbles += 1; carrier.dribbles += 1; carrier.touches += 1;
  if (!opponent) return carry(match, chain, carrier, L);
  const defT = match.sides[opponent.side].tactics;
  // The covering defender closes the door behind the first one.
  const cover = L.second && match.players[L.second] && pos[L.second] && metres(mirror(pos[L.second]), from) < 7 ? match.players[L.second] : null;
  const skill = now(carrier, 'dri') * 0.75 + now(carrier, 'pac') * 0.25;
  const defence = now(opponent, 'def') * 0.75 + now(opponent, 'pac') * 0.25;
  const success = clamp(0.42 + (skill - defence) / 175 + (ball.counter ? 0.05 : 0) - (cover ? 0.08 : 0) + (defT.tackling === 'aggressive' ? 0.03 : defT.tackling === 'ease' ? -0.03 : 0), 0.15, 0.8);
  const inside = role(carrier).id === 'inside-forward' ? 0.3 : 0.18;
  const to = { p: clamp(from.p + 5 + random() * 8, 1, Math.max(from.p, 92)), a: clamp(from.a + (random() - 0.5) * 16 + (50 - from.a) * inside, 3, 97) };
  if (random() < success) {
    stats.dribblesOk += 1; carrier.dribblesOk += 1;
    adjust(carrier, 0.07); adjust(opponent, -0.05);
    push(match, chain, { t: 'dribble', side, from: carrier.id, vs: opponent.id, cover: cover?.id || null, ok: true, p0: from.p, a0: from.a, p1: +to.p.toFixed(1), a1: +to.a.toFixed(1), dur: 1.6 });
    if (from.p < 66 && to.p >= 66) stats.finalThird += 1;
    if (inBox(to)) stats.boxTouches += 1;
    ball.p = to.p; ball.a = to.a; ball.last = 'dribble'; ball.facing = 'goal'; ball.trigger = null;
    return 2.2;
  }
  push(match, chain, { t: 'dribble', side, from: carrier.id, vs: opponent.id, cover: cover?.id || null, ok: false, p0: from.p, a0: from.a, p1: +((from.p + to.p) / 2).toFixed(1), a1: +((from.a + to.a) / 2).toFixed(1), dur: 1.3 });
  adjust(carrier, -0.05);
  const r = random();
  const tired = opponent.energy < 55 ? 1.3 : 1;
  const pressing = defT.pressing === 'high' ? 1.15 : 1;
  const tackling = defT.tackling === 'aggressive' ? 1.3 : defT.tackling === 'ease' ? 0.65 : 1;
  const box = inBox(from);
  const foulChance = clamp((0.32 + (skill - defence) / 220) * tired * pressing * tackling * (box ? 0.068 : 1) * factor(slider(match, opponent.side, 'tackle'), 0.3), 0.03, 0.65);
  if (r < foulChance) return 2 + foul(match, chain, opponent, carrier, from, { reckless: tired > 1 || random() < 0.22 * tackling, inBox: box });
  if (r < foulChance + 0.22) {
    const out = from.a < 50 ? 0.5 : 99.5;
    if (from.p > 90) { corner(match, chain, side); return 4; }
    restart(match, side, 'throw-in', { p: from.p, a: out });
    return 5;
  }
  if (random() < 0.3) {
    match.stats[opponent.side].tackles += 1; opponent.tackles += 1; adjust(opponent, 0.05);
    restart(match, side, 'throw-in', { p: from.p, a: from.a < 50 ? 0.5 : 99.5 });
    return 4;
  }
  // The ball breaks loose from the challenge.
  if (random() < 0.3) return 2 + secondBall(match, chain, side, { p: clamp(from.p + (random() - 0.5) * 8, 2, 97), a: clamp(from.a + (random() - 0.5) * 10, 3, 97) });
  return 2 + turnover(match, chain, opponent, from, 'tackle', carrier, { L });
}

/** Hoof it clear under pressure in the own third. */
function clearBall(match, chain, carrier) {
  const random = match.random;
  const ball = match.ball;
  const to = { p: 45 + random() * 25, a: 20 + random() * 60 };
  match.stats[carrier.side].clearances += 1;
  carrier.clearances += 1;
  push(match, chain, { t: 'clear', side: carrier.side, from: carrier.id, p0: +ball.p.toFixed(1), a0: +ball.a.toFixed(1), p1: +to.p.toFixed(1), a1: +to.a.toFixed(1), dur: 1.8 });
  ball.p = to.p; ball.a = to.a; ball.carrier = null; ball.last = 'loose';
  if (random() < 0.18) { restart(match, other(carrier.side), 'throw-in', mirror({ p: to.p, a: random() < 0.5 ? 0.5 : 99.5 })); return 6; }
  return 2 + secondBall(match, chain, carrier.side, to, { bias: -0.04 });
}

function shoot(match, chain, carrier, L) {
  const ball = match.ball;
  const point = { p: ball.p, a: ball.a };
  const { dist } = nearestRival(match, L.pos, carrier.side, point);
  const previous = ball.last;
  const creator = ['short', 'through', 'cutback', 'cross', 'switch', 'long', 'flick'].includes(previous) && ball.lastFrom ? match.players[ball.lastFrom] : null;
  let kind = point.p < 80 ? 'long' : 'open';
  if (previous === 'cutback') kind = 'cutback';
  else if (ball.counter > 0 && point.p >= 78) kind = 'counter';
  const pressure = clamp((6 - dist) / 6, 0, 1);
  return resolveShot(match, chain, carrier, kind, point, { creator, counter: ball.counter > 0, pressure, L });
}

/**
 * Clean through on goal: the runner drives at the keeper while the nearest
 * defender chases him down. He gets the shot away, the defender catches him
 * (a tackle, or a foul that denies an obvious goal-scoring opportunity), or
 * the keeper rushes out to smother it. `ball.breakaway` is his lead in metres.
 */
function breakaway(match, chain, carrier, L) {
  const random = match.random;
  const ball = match.ball;
  const side = carrier.side;
  const pos = L.pos;
  const from = { p: ball.p, a: ball.a };
  const rivals = onPitch(match, other(side));
  const keeper = keeperOf(rivals);
  const shootNow = () => {
    ball.breakaway = 0;
    return resolveShot(match, chain, carrier, 'one-on-one', { p: ball.p, a: ball.a }, { creator: ball.lastFrom ? match.players[ball.lastFrom] : null, counter: true, pressure: 0.1, L });
  };
  if (from.p >= 84) {
    // The keeper comes out to meet him.
    if (keeper && random() < clamp(0.12 + role(keeper).sweep * 0.22 + (now(keeper, 'keeping') - now(carrier, 'dri')) / 300, 0.06, 0.4)) {
      push(match, chain, { t: 'dribble', side, from: carrier.id, vs: keeper.id, ok: false, p0: from.p, a0: from.a, p1: from.p + 3, a1: from.a, dur: 1 });
      ball.breakaway = 0;
      adjust(keeper, 0.3);
      if (random() < 0.12) return 1.5 + foul(match, chain, keeper, carrier, { p: from.p + 3, a: from.a }, { inBox: true, dogso: true });
      giveBall(match, keeper.side, mirror({ p: Math.min(99, from.p + 3), a: from.a }), keeper);
      return 2;
    }
    return shootNow();
  }
  let chaser = null;
  let gap = Infinity;
  for (const r of rivals) {
    if (r.slot === 'GK' || !pos[r.id]) continue;
    const d = metres(mirror(pos[r.id]), from);
    if (d < gap) { gap = d; chaser = r; }
  }
  // With the ball at his feet he is a little slower than the man chasing him.
  const lead = (ball.breakaway || 1) + (chaser ? (now(carrier, 'pac') * 0.93 - now(chaser, 'pac')) / 7 : 3);
  const to = { p: clamp(from.p + 10 + random() * 4, from.p, 88), a: clamp(from.a + (50 - from.a) * 0.3, 20, 80) };
  carrier.touches += 2;
  if (chaser && lead < 0.6) {
    // Caught.
    const at = { p: (from.p + to.p) / 2, a: (from.a + to.a) / 2 };
    push(match, chain, { t: 'carry', side, from: carrier.id, vs: chaser.id, chase: true, p0: from.p, a0: from.a, p1: +at.p.toFixed(1), a1: +at.a.toFixed(1), dur: 1.5 });
    ball.breakaway = 0;
    const r = random();
    const tackling = match.sides[chaser.side].tactics.tackling;
    if (r < (tackling === 'aggressive' ? 0.34 : tackling === 'ease' ? 0.16 : 0.26)) return 2 + foul(match, chain, chaser, carrier, at, { inBox: inBox(at), dogso: true });
    if (r < 0.72) return 2 + turnover(match, chain, chaser, at, 'tackle', carrier, { L });
    ball.p = at.p; ball.a = at.a;
    return 2 + resolveShot(match, chain, carrier, 'open', at, { pressure: 0.6, L });
  }
  push(match, chain, { t: 'carry', side, from: carrier.id, vs: chaser?.id || null, chase: true, lead: +lead.toFixed(1), p0: from.p, a0: from.a, p1: +to.p.toFixed(1), a1: +to.a.toFixed(1), dur: clamp(metres(from, to) / 7.5, 1, 2.4) });
  if (from.p < 66 && to.p >= 66) match.stats[side].finalThird += 1;
  ball.p = to.p; ball.a = to.a; ball.breakaway = Math.max(0.1, lead); ball.last = 'through';
  return clamp(metres(from, to) / 7.5, 1, 2.4);
}

/** One decision of the player on the ball (or a restart). Returns match seconds spent. */
function act(match, chain) {
  const ball = match.ball;
  if (ball.restart) return executeRestart(match, chain);
  let carrier = match.players[ball.carrier];
  if (!carrier || carrier.injured || carrier.rc || carrier.side !== ball.side) {
    const { pos } = layoutTeams(match, { ...ball, carrier: null });
    carrier = nearestOwn(match, pos, ball.side, ball);
    if (!carrier) return 60;
    ball.carrier = carrier.id;
  }
  const L = layout(match);
  // The carrier is where the ball is.
  L.pos[carrier.id] = { p: ball.p, a: ball.a };
  const pressure = nearestRival(match, L.pos, ball.side, ball).dist;
  if (ball.breakaway > 0) { ball.fresh = (ball.fresh ?? 9) + 1; return breakaway(match, chain, carrier, L); }
  const fresh = ball.fresh ?? 9;
  ball.fresh = fresh + 1;
  // Counter-pressing: in the first seconds after losing it, the nearest men swarm the ball.
  const defSide = other(ball.side);
  const defT = match.sides[defSide].tactics;
  if (fresh <= 1 && defT.onLoss === 'counter-press' && L.first && carrier.slot !== 'GK') {
    const presser = match.players[L.first];
    const regain = clamp(0.07 + (now(presser, 'def') - control(carrier)) / 340 + (ball.p < 40 ? 0.02 : 0), 0.03, 0.13);
    if (presser && match.random() < regain) {
      push(match, chain, { t: 'carry', side: ball.side, from: carrier.id, vs: presser.id, p0: ball.p, a0: ball.a, p1: ball.p, a1: ball.a, dur: 0.9 });
      presser.energy = Math.max(5, presser.energy - 0.4);
      if (match.random() < 0.24) return 1.5 + foul(match, chain, presser, carrier, { p: ball.p, a: ball.a });
      return 1.5 + turnover(match, chain, presser, { p: ball.p, a: ball.a }, 'tackle', carrier, { L });
    }
  }
  const sit = situation(match, carrier, L);
  const kind = chooseKind(match, carrier, ball, pressure, sit);
  if (kind === 'shot') return shoot(match, chain, carrier, L);
  if (kind === 'carry') return carry(match, chain, carrier, L);
  if (kind === 'dribble') return dribble(match, chain, carrier, L);
  if (kind === 'clear') return clearBall(match, chain, carrier);
  if (kind === 'cross') return deliverCross(match, chain, ball.side, carrier, { p: ball.p, a: ball.a }, { L });
  return pass(match, chain, carrier, kind, L);
}

/* ── Substitutions, injuries, manager AI ── */

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
    stand.role = 'goalkeeper:defend';
  }
}

function substitute(match, side, outId, inId, { automatic = false, slot = null, reason = null } = {}) {
  const team = match.sides[side];
  const out = match.players[outId];
  const incoming = match.players[inId];
  const { minute } = displayMinute(match);
  incoming.slot = slot || out.slot;
  // The manager's instruction for the position stays; the assistant picks what suits the new man.
  incoming.role = side === match.userSide && validRole(out.role, incoming.slot) && !slot ? out.role
    : autoRoles([incoming], [incoming.slot], team.style)[0];
  incoming.on = minute;
  out.off = minute;
  team.lineup = team.lineup.map((id) => (id === outId ? inId : id));
  if (!team.lineup.includes(inId)) team.lineup.push(inId);
  team.bench = team.bench.filter((id) => id !== inId);
  team.used.push(inId);
  team.subs += 1;
  if (match.ball?.carrier === outId) match.ball.carrier = null;
  const ev = addEvent(match, { type: 'sub', side, player: inId, out: outId, automatic, reason });
  if (match.phase === 'live' && Array.isArray(match.lastChain)) match.lastChain.push({ t: 'sub', side, by: inId, out: outId, ev, dur: 2 });
}

function injuryCheck(match, random, side) {
  for (const p of onPitch(match, side)) {
    const risk = 0.000105 * (p.energy < 55 ? 2.2 : p.energy < 70 ? 1.4 : 1) * (p.age > 31 ? 1.25 : 1);
    if (random() >= risk) continue;
    const severity = random() < 0.62 ? 'light' : random() < 0.8 ? 'medium' : 'severe';
    p.injured = severity;
    p.off = displayMinute(match).minute;
    const ev = addEvent(match, { type: 'injury', side, player: p.id, severity });
    match.lastChain.push({ t: 'injury', side, by: p.id, ev, dur: 3 });
    const team = match.sides[side];
    team.lineup = team.lineup.filter((id) => id !== p.id);
    if (match.ball?.carrier === p.id) match.ball.carrier = null;
    const userControlled = side === match.userSide && !match.autoSubs;
    if (userControlled) match.pausedFor = 'injury';
    else autoReplace(match, side, p, 'injury');
  }
}

function autoReplace(match, side, out, reason, preferLine = null) {
  const team = match.sides[side];
  if (team.subs >= match.maxSubs) return false;
  const bench = team.bench.map((id) => match.players[id]).filter((p) => p && !p.injured);
  if (!bench.length) return false;
  const slot = out.slot;
  const pool = bench.filter((p) => (slot === 'GK') === (p.pos === 'GK'));
  const best = pool.sort((a, b) => {
    const fit = (p) => p.ovr * positionFit(p, slot) + (preferLine && POSITION_LINE[p.pos] === preferLine ? 6 : 0);
    return fit(b) - fit(a);
  })[0];
  if (!best) return false;
  const outId = out.id;
  const newSlot = preferLine && POSITION_LINE[best.pos] === preferLine && POSITION_LINE[slot] !== preferLine ? best.pos : null;
  if (reason !== 'injury') {
    // A tactical change waits for the ball to go dead, like any other.
    if (team.pendingSubs.some((x) => x.out === outId || x.in === best.id) || team.subs + team.pendingSubs.length >= match.maxSubs) return false;
    team.pendingSubs.push({ out: outId, in: best.id, automatic: true, reason, slot: newSlot });
    return true;
  }
  if (!team.lineup.includes(outId)) team.lineup.push(outId);
  out.replaced = true;
  substitute(match, side, outId, best.id, { automatic: true, reason });
  if (newSlot) {
    best.slot = newSlot;
    best.role = autoRoles([best], [best.slot], team.style)[0];
  }
  return true;
}

/**
 * Carry out every substitution waiting on the touchline (both sides), at a
 * stoppage. A change that no longer makes sense (the man going off was sent
 * off or injured, the man coming on is no longer on the bench) is dropped.
 */
function applyPendingSubs(match) {
  for (const side of ['home', 'away']) {
    const team = match.sides[side];
    const queue = team.pendingSubs || [];
    if (!queue.length) continue;
    team.pendingSubs = [];
    for (const change of queue) {
      const out = match.players[change.out];
      const incoming = match.players[change.in];
      if (!out || !incoming || !team.lineup.includes(out.id) || out.rc || out.injured || !team.bench.includes(incoming.id) || incoming.injured) continue;
      if (team.subs >= match.maxSubs) break;
      substitute(match, side, out.id, incoming.id, { automatic: Boolean(change.automatic), reason: change.reason || null });
      if (change.slot) { incoming.slot = change.slot; incoming.role = autoRoles([incoming], [incoming.slot], team.style)[0]; }
    }
  }
}

/** CPU (and delegated) substitutions and tactical reactions to the score. */
/**
 * A Dynamic CPU side reviews its game every ten minutes (FC 27 "Dynamic" AI
 * behaviour): it leans into what is working and closes what is hurting it,
 * and follows the tactical suggestion the situation calls for. A Tactical
 * side keeps its style and only reacts to the score late on (managerDecisions).
 */
function cpuReview(match, side) {
  const team = match.sides[side];
  const ai = team.ai;
  if (!ai || ai.behaviour !== 'dynamic' || side === match.userSide) return;
  const { minute } = displayMinute(match);
  if (match.tick > PERIODS[match.period].length || minute % 10 !== 0 || minute < 20) return;
  const rival = other(side);
  const diff = match.score[side] - match.score[rival];
  const total = match.stats.home.poss + match.stats.away.poss || 1;
  const context = {
    minute, diff, men: onPitch(match, side).length, rivalMen: onPitch(match, rival).length,
    xgFor: match.stats[side].xg, xgAgainst: match.stats[rival].xg, possession: match.stats[side].poss / total,
    possessionAgainst: match.stats[rival].poss / total, knockout: match.knockout,
    aggregateDiff: match.aggregate ? (side === 'home' ? match.aggregate.home - match.aggregate.away : match.aggregate.away - match.aggregate.home) : 0,
  };
  const before = team.tactics;
  let tactics = before;
  const reasons = [];
  const plan = situationalPlan(context);
  if (plan && plan.preset !== ai.plan) {
    tactics = applyPreset(tactics, plan.preset);
    const ladder = ['very-defensive', 'defensive', 'balanced', 'attacking', 'very-attacking'];
    tactics.mentality = ladder[clamp(ladder.indexOf(tactics.mentality) + plan.focus, 0, 4)];
    ai.plan = plan.preset;
    reasons.push(`plan-${plan.preset}`);
  }
  const review = dynamicReview(tactics, ai.memory, context);
  if (review) { tactics = normalizeTactics({ ...tactics, ...review.changes }); reasons.push(review.reason); }
  ai.memory = freshMemory();
  if (!reasons.length) return;
  team.tactics = normalizeTactics({ ...tactics, formation: before.formation, roles: before.roles });
  const changes = Object.fromEntries(Object.entries(team.tactics).filter(([k, v]) => k !== 'roles' && before[k] !== v));
  if (!Object.keys(changes).length) return;
  ai.log.push({ minute, reason: reasons.join(',') });
  addEvent(match, { type: 'tactics', side, changes, cpu: true, reason: reasons.join(',') });
}

function managerDecisions(match, random, side) {
  cpuReview(match, side);
  if (side === match.userSide && !match.autoSubs) return;
  const { minute } = displayMinute(match);
  const team = match.sides[side];
  const windows = match.period >= 2 ? [100, 106] : [46, 58, 64, 70, 76, 82, 87];
  if (!windows.includes(minute) || match.tick > PERIODS[match.period].length) return;
  const diff = match.score[side] - match.score[other(side)];
  if (team.subs < match.maxSubs && !(minute === 46 && random() < 0.8)) {
    const players = onPitch(match, side).filter((p) => p.slot !== 'GK');
    // Tired legs, a poor afternoon, or a booked defender on thin ice.
    const candidates = players.filter((p) => p.energy < 64 || p.rating < 5.9 || (p.yc && POSITION_LINE[p.slot] === 'DF' && minute < 75 && random() < 0.35))
      .sort((a, b) => (a.energy + a.rating * 8 - (a.yc ? 12 : 0)) - (b.energy + b.rating * 8 - (b.yc ? 12 : 0)));
    const count = minute === 58 ? (random() < 0.5 ? 1 : 0) : minute >= 82 ? 1 : random() < 0.6 ? 2 : 1;
    for (const out of candidates.slice(0, count)) {
      // Chasing the game: an attacker for a defender; protecting it: the opposite.
      const prefer = diff < 0 && minute >= 60 && POSITION_LINE[out.slot] !== 'FW' ? 'FW' : diff > 0 && minute >= 75 ? 'DF' : null;
      autoReplace(match, side, out, 'tactical', prefer);
    }
  }
  if (side !== match.userSide && team.ai?.behaviour === 'dynamic') return;
  if (side !== match.userSide && minute >= 65) {
    const down = onPitch(match, side).length < onPitch(match, other(side)).length;
    if (diff < 0) {
      // Plan B: push up, press, and get the ball into the box.
      // In stages: more men forward first, then the press and the crosses.
      const late = minute >= 80;
      team.tactics = { ...team.tactics, mentality: late && diff === -1 ? 'very-attacking' : 'attacking', tempo: 'fast', timeWasting: false,
        block: late ? 'high' : team.tactics.block, pressing: late ? 'high' : team.tactics.pressing, finalThird: late ? 'early-cross' : team.tactics.finalThird };
    } else if (diff > 0 && minute >= 78) {
      const hold = diff === 1 && minute >= 82;
      team.tactics = { ...team.tactics, mentality: diff >= 2 ? 'balanced' : 'defensive', tempo: 'slow', block: hold ? 'low' : team.tactics.block, line: hold ? 'deep' : team.tactics.line, onLoss: 'regroup', timeWasting: minute >= 84 };
    } else if (diff === 0 && down) {
      team.tactics = { ...team.tactics, mentality: 'defensive', block: 'low', pressing: 'medium' };
    }
  }
}

/* ── The minute ── */

function context(match) {
  const ctx = {};
  const everyone = [...onPitch(match, 'home'), ...onPitch(match, 'away')].filter((p) => p.slot !== 'GK');
  // The level of this match as the attributes play (see now()), and the reference for finishing duels.
  ctx.level = 72 + ((mean(everyone, (p) => p.ovr) || 72) - 72) * 0.6 - 2;
  // The reference keeper of this match: a keeper is good or bad compared with the one at the other end.
  const keepers = ['home', 'away'].map((s) => keeperOf(onPitch(match, s))).filter(Boolean);
  ctx.keepers = keepers.length ? mean(keepers, (k) => now(k, 'keeping', 1)) : 72;
  for (const side of ['home', 'away']) {
    const s = sideStrength(match, side);
    ctx[side] = { ...s, missing: Math.max(0, 11 - s.count) };
  }
  return ctx;
}

function stepMinute(match) {
  const random = createStream(match.seed, match.id, 'm', match.period, match.tick, match.actions);
  // Non-enumerable helpers keep the match object serialisable.
  Object.defineProperty(match, 'random', { value: random, configurable: true, enumerable: false, writable: true });
  Object.defineProperty(match, 'ctx', { value: context(match), configurable: true, enumerable: false, writable: true });
  const chain = [];
  match.lastChain = chain;
  if (!match.ball) {
    const side = match.period % 2 === 0 ? 'home' : 'away';
    restart(match, side, 'kickoff', { p: 50, a: 50 });
  }
  const seconds = { home: 0, away: 0 };
  const zones = [];
  let threatSum = 0;
  // A faster clock: each minute on the scoreboard holds fewer seconds of play (EA FC style match length).
  let budget = 60 / (match.clockRate || 1);
  let guard = 0;
  // Home advantage is a nudge in every duel, not a separate dice roll.
  for (const side of ['home', 'away']) for (const p of onPitch(match, side)) p.boost = (!match.neutral && side === 'home' ? 2 : 0) + (match.sides[side].form || 0);
  while (budget > 0 && guard < 80 && !match.pausedFor) {
    guard += 1;
    const side = match.ball.side;
    const goalsBefore = match.score.home + match.score.away;
    // The ball is dead: any substitution waiting on the touchline happens now.
    const subsBefore = match.sides.home.subs + match.sides.away.subs;
    if (match.ball.restart) applyPendingSubs(match);
    const subTime = (match.sides.home.subs + match.sides.away.subs - subsBefore) > 0 ? 25 : 0;
    const spent = Math.max(0.5, act(match, chain)) + subTime;
    seconds[side] += spent;
    budget -= spent;
    zones.push(side === 'home' ? match.ball.p : 100 - match.ball.p);
    if (match.ball.side === side && match.ball.p >= 66) threatSum += side === 'home' ? spent : -spent;
    if (match.score.home + match.score.away !== goalsBefore) break;
  }
  match.stats.home.poss += seconds.home;
  match.stats.away.poss += seconds.away;
  const total = seconds.home + seconds.away || 1;
  const xgShift = chain.filter((a) => a.t === 'shot').reduce((sum, a) => sum + (a.side === 'home' ? 1 : -1) * (match.events[a.ev]?.xg || 0) * 30, 0);
  const pressure = clamp((threatSum + xgShift) / 30, -1, 1);
  match.timeline.push({ m: displayMinute(match).minute, a: displayMinute(match).added, p: +((seconds.home - seconds.away) / total).toFixed(2), z: Math.round(mean(zones) || 50), x: +pressure.toFixed(2) });

  for (const s of ['home', 'away']) {
    const t = match.sides[s].tactics;
    const press = (t.pressing === 'high' ? 1.3 : t.pressing === 'low' ? 0.85 : 1) * (t.block === 'high' ? 1.08 : t.block === 'low' ? 0.94 : 1) * (t.onLoss === 'counter-press' ? 1.07 : 1);
    const pace = t.tempo === 'fast' ? 1.1 : t.tempo === 'slow' ? 0.96 : 1;
    for (const p of onPitch(match, s)) {
      const work = p.slot === 'GK' ? 1 : role(p).stamina;
      const loss = p.slot === 'GK' ? 0.12 : (0.3 + Math.max(0, p.age - 29) * 0.012) * press * pace * work * (1.15 - (p.attrs?.phy ?? 70) / 400);
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
  const cards = match.events.filter((e) => e.type === 'card' && e.period === match.period).length;
  const injuries = match.events.filter((e) => e.type === 'injury' && e.period === match.period).length;
  const base = match.period === 0 ? 1 + Math.floor(random() * 2) : match.period === 1 ? 2 + Math.floor(random() * 3) : Math.floor(random() * 2);
  const wasted = match.period === 1 && (match.sides.home.tactics.timeWasting || match.sides.away.tactics.timeWasting) ? 1 : 0;
  match.stoppage[match.period] = Math.min(match.period === 1 ? 10 : 6, base + wasted + Math.floor(goals * 0.6 + subs * 0.3 + cards * 0.25 + injuries * 1.2));
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
    if (conceded === 0 && p.minutes >= 60) adjust(p, p.slot === 'GK' ? 0.6 : POSITION_LINE[p.slot] === 'DF' ? 0.4 : 0.12);
    if (p.slot === 'GK' || POSITION_LINE[p.slot] === 'DF') adjust(p, -Math.max(0, conceded - 1) * 0.12);
    const result = match.score[side] - conceded;
    adjust(p, result > 0 ? 0.22 : result < 0 ? -0.2 : 0);
    // Volume of good work: completed passes and duels add up over 90 minutes.
    adjust(p, Math.min(0.5, p.passOk * 0.004) + (p.passes ? (p.passOk / p.passes - 0.8) * 0.6 : 0) + Math.min(0.25, (p.aerials || 0) * 0.025 + (p.recoveries || 0) * 0.02));
    adjust(p, (random() - 0.5) * 0.35 + (p.ovr - 72) / 120);
    if (p.minutes < 25) p.rating = clamp(6 + (p.rating - 6) * 0.6, 3, 10);
    p.rating = Math.round(clamp(6.3 + (p.rating - 6.2) * 0.78, 3, 10) * 10) / 10;
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
  match.lastChain = [];
  if (match.phase === 'pre') { match.phase = 'live'; addEvent(match, { type: 'kick-off' }); }
  let steps = 0;
  while (!match.complete && steps < minutes) {
    if (match.tick === PERIODS[match.period].length) drawStoppage(match);
    if (periodEnded(match)) {
      const ended = match.period;
      addEvent(match, { type: 'period-end', ended });
      match.lastChain.push({ t: 'period', ended, ev: match.events.length - 1, dur: 2 });
      match.ball = null;
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
  const sides = Object.fromEntries(Object.entries(match.sides).map(([key, side]) => [key, {
    ...side, lineup: side.lineup.slice(), bench: side.bench.slice(), used: side.used.slice(), pendingSubs: (side.pendingSubs || []).map((x) => ({ ...x })),
    tactics: normalizeTactics(side.tactics), style: side.style || 'balanced',
    ai: side.ai ? { ...side.ai, memory: { ...(side.ai.memory || freshMemory()), xgFor: { ...(side.ai.memory?.xgFor || freshMemory().xgFor) }, xgAgainst: { ...(side.ai.memory?.xgAgainst || freshMemory().xgAgainst) } }, log: (side.ai.log || []).slice() } : neutralProfile(),
  }]));
  const players = Object.fromEntries(Object.entries(match.players).map(([key, p]) => [key, { ...PLAYER_STATS, ...p }]));
  // Matches saved before roles existed: give everyone on the pitch the role a coach would.
  for (const side of Object.values(sides)) {
    const missing = side.lineup.filter((id) => players[id] && players[id].slot && !players[id].role);
    if (!missing.length) continue;
    const roles = autoRoles(missing.map((id) => players[id]), missing.map((id) => players[id].slot), side.style);
    missing.forEach((id, i) => { players[id].role = roles[i]; });
  }
  return {
    ...match,
    score: { ...match.score },
    stoppage: match.stoppage.slice(),
    sides,
    players,
    stats: { home: { ...emptyStats(), ...match.stats.home }, away: { ...emptyStats(), ...match.stats.away } },
    events: match.events.slice(),
    timeline: match.timeline.slice(),
    ball: match.ball ? { ...match.ball } : null,
    lastChain: (match.lastChain || []).slice(),
    referee: match.referee || { strict: 1 },
  };
}

/* ── Manager decisions during the match ── */

/**
 * The manager asks for a substitution: the player warms up by the fourth
 * official and goes on at the next stoppage. Several can be queued and they
 * all happen together.
 */
export function userRequestSubstitution(source, outId, inId) {
  const side = source.userSide;
  const team = source.sides[side];
  if (source.complete) throw new Error('match-over');
  const pending = team.pendingSubs || [];
  if (!team.lineup.includes(outId) || !team.bench.includes(inId)) throw new Error('invalid-sub');
  if (pending.some((x) => x.out === outId || x.in === inId)) throw new Error('already-pending');
  if (team.subs + pending.length >= source.maxSubs) throw new Error('no-subs-left');
  if (source.players[inId].injured) throw new Error('injured');
  const match = cloneMatch(source);
  match.sides[side].pendingSubs.push({ out: outId, in: inId });
  match.actions += 1;
  return match;
}

/** Withdraw a substitution that has not happened yet. */
export function userCancelSubstitution(source, index) {
  const match = cloneMatch(source);
  const team = match.sides[match.userSide];
  team.pendingSubs = team.pendingSubs.filter((_, i) => i !== index);
  match.actions += 1;
  return match;
}

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

/**
 * Change the user's tactics mid-match. `changes` may hold any instruction,
 * a new formation, or `roles` keyed by lineup index ("role:focus").
 */
export function userSetTactics(source, changes) {
  const match = cloneMatch(source);
  const side = match.userSide;
  const team = match.sides[side];
  const plain = Object.fromEntries(Object.entries(changes).filter(([key]) => key !== 'formation' && key !== 'roles'));
  team.tactics = normalizeTactics({ ...team.tactics, ...plain });
  if (changes.formation && FORMATIONS[changes.formation] && changes.formation !== team.formation) {
    team.formation = changes.formation;
    team.tactics = { ...team.tactics, roles: {} };
    reassignSlots(match, side);
  }
  if (changes.roles) {
    const roles = { ...team.tactics.roles };
    for (const [index, key] of Object.entries(changes.roles)) {
      const p = match.players[team.lineup[Number(index)]];
      if (p && validRole(key, p.slot)) { p.role = key; roles[index] = key; }
    }
    team.tactics = { ...team.tactics, roles };
  }
  match.actions += 1;
  addEvent(match, { type: 'tactics', side, changes: Object.fromEntries(Object.entries(changes).filter(([key]) => key !== 'roles')) });
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
  const roles = autoRoles(ordered.map((id) => match.players[id]), slots.slice(0, ordered.length), match.sides[side].style);
  ordered.forEach((id, i) => { match.players[id].role = roles[i]; });
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
