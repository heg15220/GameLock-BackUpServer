/**
 * Where the twenty-two players stand, shared by the match engine and the
 * animated pitch.
 *
 * Coordinates are "attacking frame" percentages of the side in question:
 * `p` (progress) runs from the own goal line (0) to the rival goal line (100),
 * `a` (across) from the own left touchline (0) to the right one (100). The
 * engine decides passes and duels with these positions and the pitch draws
 * the players exactly there, so a pass on screen goes where the engine sent it.
 *
 * The side with the ball spreads out: its lines climb with the ball, full
 * backs and wingers give width or tuck in by role (an inverted wingback steps
 * into midfield, a centre-half drops between the centre backs, a false 9
 * comes short, a box crasher arrives late), forwards play on the shoulder of
 * the last defender and never beyond it (offside).
 *
 * The side without it defends as a block: a flat back line whose height is
 * set by the line of engagement and the defensive line, about 25-35 m from
 * back to front, sliding across towards the ball so the far winger tucks in.
 * Near its own goal the block turns man-oriented (each defender goal-side of
 * the attacker in his zone). The nearest player presses the ball at a
 * distance set by the pressing intensity and the pressing triggers, and the
 * second nearest covers him (pressure, cover, balance).
 */
import { FORMATIONS } from './positions.js';
import { roleParams } from './tactics.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
/** A CPU positioning slider of a side (see cpu.js), as an offset from neutral in [-1, 1]. */
const cpuSlider = (match, side, key) => ((match.sides[side].ai?.sliders?.[key] ?? 50) - 50) / 50;
/** A CPU intelligence trait of a side as an offset from the neutral level. */
const cpuTrait = (match, side, key) => (match.sides[side].ai?.traits?.[key] ?? 0.6) - 0.6;
const lerp = (a, b, t) => a + (b - a) * t;

/** Formation entry of a player: the slot index in the lineup if it matches, else the first slot of his position. */
export function slotEntry(formation, lineup, id, slot) {
  const shape = FORMATIONS[formation] || FORMATIONS['4-3-3'];
  const index = lineup.indexOf(id);
  if (shape[index] && shape[index][0] === slot) return shape[index];
  const same = shape.filter(([pos]) => pos === slot);
  if (same.length) return same[Math.min(same.length - 1, Math.max(0, index) % same.length)];
  return shape[clamp(index, 0, shape.length - 1)] || shape[0];
}

const LINE_ADJ = { deep: -5, normal: 0, high: 5 };
const WIDTH = { narrow: 0.84, normal: 1, wide: 1.14 };
const MENT = { 'very-defensive': -2, defensive: -1, balanced: 0, attacking: 1, 'very-attacking': 2 };
/** Highest point (% from own goal) of the back line for each line of engagement. */
const BLOCK_MAX = { low: 21, mid: 33, high: 45 };
/** Back line to front line, % of the pitch length. */
const BLOCK_LENGTH = { low: 23, mid: 28, high: 33 };
/** The team engages the ball once it is closer than this to its own goal (%). */
const ENGAGE = { low: 44, mid: 64, high: 101 };
/** Distance in metres the first defender keeps from the ball carrier. */
const PRESS_GAP = { low: 4.4, medium: 2.9, high: 1.9 };
const BLOCK_WIDTH = { low: 0.6, mid: 0.68, high: 0.75 };

export const DEFENDERS = new Set(['CB', 'RB', 'LB', 'RWB', 'LWB']);
export const WIDE = new Set(['RB', 'LB', 'RWB', 'LWB', 'RM', 'LM', 'RW', 'LW']);

/** In-possession role shift for the ball's progress, blended between the three phases. */
function phaseShift(ip, ballP) {
  const x = clamp(ballP, 17, 83);
  const k = x <= 50 ? 0 : 1;
  const t = x <= 50 ? (x - 17) / 33 : (x - 50) / 33;
  return [lerp(ip[k][0], ip[k + 1][0], t), lerp(ip[k][1], ip[k + 1][1], t)];
}

function onPitch(match, side, ids) {
  const list = ids?.[side] || match.sides[side].lineup;
  return list.map((id) => match.players[id]).filter((p) => p && !p.rc && (ids?.[side] ? true : !p.injured));
}

/**
 * Where a player lines up for a kick-off (progress % of his own frame): back
 * line about 27 m out, midfield 10-15 m behind the halfway line, forwards on
 * it. Shared by the engine (the kick-off pass goes there) and the pitch.
 */
export function kickoffSpot(entry, taker = false) {
  const [pos, sx, sy] = entry;
  if (pos === 'GK') return { p: 5, a: 50 };
  return { p: taker ? 49.5 : clamp(26 + (sy - 19) * 0.37, 24, 47.5), a: sx };
}

/** Distance in metres between two points of the same frame. */
export const metres = (x, y) => Math.hypot((x.p - y.p) * 1.05, (x.a - y.a) * 0.68);
/** Convert a point between the two attacking frames. */
export const flip = ({ p, a }) => ({ p: 100 - p, a: 100 - a });

/**
 * Positions of both teams for a ball `{ side, p, a }` (in the frame of the
 * side that has it). Optional ball fields: `carrier` (someone is on the ball,
 * so the defence engages), `counter` (the defending side was caught upfield),
 * `fresh` (actions since the ball changed hands), `trigger` (a pressing cue).
 *
 * Returns { pos, offside, line, first, second, gap }: every position in its
 * own side's frame, the offside line in the frame of the side on the ball, the
 * defending back line in its own frame, and who presses and covers.
 */
export function layoutTeams(match, ball, { ids = null } = {}) {
  const pos = {};
  const owner = ball?.side || 'home';
  const rival = owner === 'home' ? 'away' : 'home';
  const bp = clamp(ball?.p ?? 50, 0, 100);
  const ba = clamp(ball?.a ?? 50, 0, 100);
  const attT = match.sides[owner].tactics || {};
  const defT = match.sides[rival].tactics || {};
  const att = onPitch(match, owner, ids);
  const def = onPitch(match, rival, ids);
  const counter = ball?.counter || 0;

  /* The defending block, in the rival's frame. */
  const own = 100 - bp;
  const across = 100 - ba;
  const block = defT.block || 'mid';
  const dm = MENT[defT.mentality] || 0;
  // CPU positioning sliders: line height, length and width.
  const lineMax = Math.max(9, BLOCK_MAX[block] + (LINE_ADJ[defT.line] || 0) + dm * 2.2 + cpuSlider(match, rival, 'lineHeight') * 5);
  const line = clamp(own * 0.62 - 1, 5.5, lineMax);
  const length = (BLOCK_LENGTH[block] + dm * 1.5) * (1 + cpuSlider(match, rival, 'lineLength') * 0.2);
  const narrow = BLOCK_WIDTH[block] * (1 + cpuSlider(match, rival, 'lineWidth') * 0.12);
  let defKeeper = null;
  for (const pl of def) {
    const [slot, sx, sy] = slotEntry(match.sides[rival].formation, match.sides[rival].lineup, pl.id, pl.slot);
    const r = roleParams(pl.role, pl.slot);
    if (pl.slot === 'GK') { defKeeper = { pl, r }; continue; }
    // A cautious mentality gets everyone behind the ball; an adventurous one leaves forwards up.
    const track = clamp(r.track - dm * 0.15, 0, 1);
    const rel = clamp((sy - 19) / 61, -0.1, 1.05);
    const back = DEFENDERS.has(slot) || DEFENDERS.has(pl.slot);
    let p = back ? line + Math.max(0, sy - 19) * 0.1 : line + 5 + rel * length;
    // Those who do not track back stay upfield; after a turnover everyone is out of shape.
    p += (1 - track) * 11 * Math.max(0.3, rel);
    if (counter) p += counter * (1.2 + 2.6 * (1 - track));
    const a = 50 + (sx - 50) * narrow + (across - 50) * (back ? 0.36 : 0.42);
    pos[pl.id] = { p: clamp(p, 2.5, 92), a: clamp(a, 4, 96) };
  }

  /* The side on the ball, in its own frame. */
  const am = MENT[attT.mentality] || 0;
  const width = WIDTH[attT.width] ?? 1;
  const defLine = clamp(bp * 0.6 + 5 + (LINE_ADJ[attT.line] || 0) * 0.6 + am * 1.5, 12, 60);
  const front = clamp(bp * 0.42 + 54 + am * 1.5, 58, 93);
  const params = att.map((pl) => roleParams(pl.role, pl.slot));
  const pivotDrops = bp < 48 && params.some((r) => r.id === 'centre-half');
  att.forEach((pl, k) => {
    const [slot, sx, sy] = slotEntry(match.sides[owner].formation, match.sides[owner].lineup, pl.id, pl.slot);
    const r = params[k];
    if (pl.slot === 'GK') {
      pos[pl.id] = { p: clamp(4 + Math.max(0, bp - 25) * 0.14 + r.sweep * 9 + (LINE_ADJ[attT.line] || 0) * 0.3, 3, 24), a: 50 + (ba - 50) * 0.1 };
      return;
    }
    const [shift, inward] = phaseShift(r.ip, bp);
    const rel = clamp((sy - 19) / 61, -0.1, 1.05);
    let p = defLine + rel * (front - defLine) + shift + am * 1.5 * rel;
    const dir = sx > 52 ? 1 : sx < 48 ? -1 : 0;
    let a = 50 + (sx - 50) * 1.12 * (WIDE.has(slot) ? width * 1.05 : width);
    a -= dir * inward;
    if (dir === 0 && inward < 0) a += (ba >= 50 ? 1 : -1) * -inward;
    // Everyone leans towards the ball, except the far winger who holds the width for the switch.
    const ballSide = ba - 50;
    const holdsWidth = WIDE.has(slot) && Math.sign(sx - 50) !== Math.sign(ballSide) && Math.abs(ballSide) > 10;
    a += ballSide * (holdsWidth ? 0.04 : 0.2 + r.roam * 0.18);
    if (pivotDrops && slot === 'CB') a = 50 + (sx - 50) * 1.9;
    if (pivotDrops && (slot === 'RB' || slot === 'LB')) p += 7;
    if ((attT.focus === 'left' && sx < 45) || (attT.focus === 'right' && sx > 55)) p += 3;
    if (attT.focus === 'center' && dir !== 0) a -= dir * 4;
    if (counter && r.run > 0.35) p += counter * 3 * r.run;
    // CPU sliders: full backs pushing on, runners looking for the line.
    if (['RB', 'LB', 'RWB', 'LWB'].includes(slot)) p += cpuSlider(match, owner, 'fullbacks') * 6;
    if (r.run > 0.3) p += cpuSlider(match, owner, 'runs') * 3 * r.run;
    pos[pl.id] = { p: clamp(p, 3, 97), a: clamp(a, 3, 97) };
  });

  /* Offside: nobody waits beyond the last defender (or the ball). */
  let deepest = 100;
  for (const pl of def) if (pl.slot !== 'GK' && pos[pl.id]) deepest = Math.min(deepest, pos[pl.id].p);
  const offside = Math.max(50, 100 - deepest, bp);
  for (const pl of att) {
    if (pl.slot === 'GK' || pl.id === ball?.carrier) continue;
    pos[pl.id].p = Math.min(pos[pl.id].p, offside + 0.4);
  }

  /* Near its goal the defence turns man-oriented: goal-side of the attacker in each zone. */
  if (own < 48) {
    const radius = own < 30 ? 11 : 8;
    const taken = new Set();
    const attackers = att.filter((pl) => pl.slot !== 'GK' && pl.id !== ball?.carrier).map((pl) => ({ id: pl.id, q: flip(pos[pl.id]) }));
    const markers = def.filter((pl) => pl.slot !== 'GK').map((pl) => ({ pl, back: DEFENDERS.has(pl.slot) || pl.slot === 'CDM' }))
      .sort((x, y) => Number(y.back) - Number(x.back));
    for (const { pl, back } of markers) {
      const me = pos[pl.id];
      let best = null;
      let bestD = radius;
      for (const at of attackers) {
        if (taken.has(at.id)) continue;
        const d = metres(me, at.q);
        if (d < bestD) { bestD = d; best = at; }
      }
      if (!best) continue;
      taken.add(best.id);
      // Tighter the closer to goal: in the box a defender lives on his man's shoulder.
      const danger = best.q.p < 17;
      // CPU marking slider and "marking & space" trait: how tight the man-orientation is.
      const tight = clamp(1 + cpuSlider(match, rival, 'marking') * 0.25 + cpuTrait(match, rival, 'mark') * 0.6, 0.6, 1.25);
      const weight = Math.min(0.95, (back ? (danger ? 0.85 : own < 30 ? 0.66 : 0.42) : danger ? 0.6 : 0.36) * tight);
      const target = { p: best.q.p - (danger ? 1 : 1.6), a: best.q.a + (50 - best.q.a) * 0.04 };
      pos[pl.id] = { p: clamp(lerp(me.p, target.p, weight), 2.5, 92), a: clamp(lerp(me.a, target.a, weight), 3, 97) };
    }
  }

  /* Pressure and cover on the ball carrier. */
  let first = null;
  let second = null;
  let gap = null;
  if (ball?.carrier) {
    const at = { p: own, a: across };
    const engaged = own <= ENGAGE[block] || (ball.fresh != null && ball.fresh <= 1 && defT.onLoss === 'counter-press');
    const ranked = def.filter((pl) => pl.slot !== 'GK' && pos[pl.id]).map((pl) => {
      const r = roleParams(pl.role, pl.slot);
      // Centre backs leave the line only if their role says so.
      const reluctance = DEFENDERS.has(pl.slot) && own > 30 ? 1.7 - r.step : 1;
      return { pl, r, d: metres(pos[pl.id], at) * reluctance };
    }).sort((x, y) => x.d - y.d);
    if (ranked.length) {
      const fresh = ball.fresh != null && ball.fresh <= 1;
      const r0 = ranked[0].r;
      // Tired legs press from further away.
      const legs = 1 + Math.max(0, 72 - (ranked[0].pl.energy ?? 100)) / 55;
      // CPU defending aggression and marking & space: how close the first man gets.
      const bite = (1 + cpuSlider(match, rival, 'aggression') * 0.3) * (1 + cpuTrait(match, rival, 'mark') * 0.5);
      gap = engaged ? (PRESS_GAP[defT.pressing || 'medium'] * (1.12 - r0.press * 0.3) * legs) / bite : 7.5;
      // Near its own goal every block closes the shooter down.
      if (own < 28) gap = Math.min(gap, 2.6);
      if (engaged && ball.trigger) gap *= 0.62;
      if (fresh && defT.onLoss === 'counter-press') gap = 1.1;
      if (fresh && defT.onLoss === 'regroup') gap = Math.max(gap, 5.5);
      const gx = -own * 1.05;
      const gy = (50 - across) * 0.68;
      const len = Math.hypot(gx, gy) || 1;
      const ux = gx / len;
      const uy = gy / len;
      first = ranked[0].pl.id;
      pos[first] = { p: clamp(own + (ux * gap) / 1.05, 1, 99), a: clamp(across + (uy * gap) / 0.68, 1, 99) };
      if (ranked[1] && engaged && !(fresh && defT.onLoss === 'regroup')) {
        second = ranked[1].pl.id;
        const cover = fresh && defT.onLoss === 'counter-press' ? 2.6 : gap + 6.5;
        const prev = pos[second];
        const spot = { p: clamp(own + (ux * cover) / 1.05, 1, 99), a: clamp(across + (uy * cover) / 0.68 + (prev.a > across ? 4 : -4), 1, 99) };
        pos[second] = { p: lerp(prev.p, spot.p, 0.7), a: lerp(prev.a, spot.a, 0.7) };
      }
    }
  }

  if (defKeeper) {
    const { pl, r } = defKeeper;
    pos[pl.id] = { p: clamp(2 + Math.max(0, line - 12) * (0.2 + r.sweep * 0.35), 1.5, 16), a: 50 + (across - 50) * 0.14 };
  }
  separate(pos, att, def, [ball?.carrier, first, second]);
  return { pos, offside, line, first, second, gap };
}

/**
 * Two players never stand on the same spot: teammates keep a few metres
 * apart, a marker stays a step off his man. Positions are nudged apart along
 * the line between them (the carrier, the presser and the cover hold theirs).
 */
function separate(pos, att, def, fixed) {
  const items = [...att.map((pl) => ({ id: pl.id, own: true })), ...def.map((pl) => ({ id: pl.id, own: false }))].filter((x) => pos[x.id]);
  const keep = new Set(fixed.filter(Boolean));
  const world = (x) => (x.own ? pos[x.id] : flip(pos[x.id]));
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const A = items[i]; const B = items[j];
        const min = A.own === B.own ? 3.2 : 1.1;
        const pa = world(A); const pb = world(B);
        let dx = (pb.p - pa.p) * 1.05; let dy = (pb.a - pa.a) * 0.68;
        let dist = Math.hypot(dx, dy);
        if (dist >= min) continue;
        if (dist < 0.01) { dx = 0.3; dy = (i % 2 ? 1 : -1) * 0.5; dist = Math.hypot(dx, dy); }
        const push = (min - dist) / 2;
        const ux = dx / dist; const uy = dy / dist;
        const move = (item, sign, share) => {
          if (keep.has(item.id)) return;
          const w = world(item);
          const moved = { p: clamp(w.p + (sign * ux * push * share) / 1.05, 1, 99), a: clamp(w.a + (sign * uy * push * share) / 0.68, 2, 98) };
          pos[item.id] = item.own ? moved : flip(moved);
        };
        const fa = keep.has(A.id) ? 0 : keep.has(B.id) ? 2 : 1;
        const fb = keep.has(B.id) ? 0 : keep.has(A.id) ? 2 : 1;
        move(A, -1, fa);
        move(B, 1, fb);
      }
    }
  }
}
