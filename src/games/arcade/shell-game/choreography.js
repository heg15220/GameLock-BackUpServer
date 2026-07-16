// The shuffle, generated up front as pure data.
//
// The whole round is planned before a single frame is drawn: a list of crosses,
// each with a start time, a duration and the slots it exchanges. The engine then
// only plays it back. That split is what makes the game's two promises testable
// without a canvas:
//
//   Fair    — the ball rides a cup and nothing else. finalBallSlot is derived by
//             applying the crosses, so "follow the right cup" is the answer by
//             construction, not by a rule someone has to remember to honour.
//   Legible — crosses that overlap in time never share a cup. No cup is ever in
//             two places at once, which is what keeps a fast shuffle followable
//             and makes the simultaneous doubles safe.
//
// The second property is also why the first one is well defined: because
// overlapping crosses are disjoint, applying them in start order gives the same
// result as any other order, so "the" final slot is unambiguous.

import { MOVES, levelConfig } from "./levels.js";

// Small seedable PRNG (mulberry32), so a round can be replayed exactly — the
// same generator the ping-pong AI uses.
export function makeRng(seed = 0x9e3779b9) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length) % arr.length];

// Draw `count` distinct slots out of `n`, unbiased (partial Fisher-Yates).
function drawSlots(n, count, rng, forced = -1) {
  const pool = [];
  for (let i = 0; i < n; i++) if (i !== forced) pool.push(i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const out = forced >= 0 ? [forced] : [];
  while (out.length < count) out.push(pool.pop());
  return out;
}

const shares = (a, b) => a.some((s) => b.includes(s));

// The earliest time a cross over `slots` can start without ever putting a cup in
// two places at once. Walks forward past any cross still running that touches the
// same slots. Terminates: each push strictly increases `start`, and only finitely
// many crosses are already placed.
function earliestStart(placed, slots, desired) {
  let start = Math.max(0, desired);
  for (let guard = 0; guard < placed.length + 1; guard++) {
    let pushed = false;
    for (const s of placed) {
      const end = s.at + s.duration;
      if (end > start && shares(s.slots, slots)) {
        start = end;
        pushed = true;
      }
    }
    if (!pushed) break;
  }
  return start;
}

// Apply one cross to a slot-indexed array in place. A slide/arc exchanges two
// slots; a circle rotates three (a→b→c→a).
function applyTo(cupAt, swap) {
  const [a, b, c] = swap.slots;
  if (swap.type === MOVES.CIRCLE) {
    const tmp = cupAt[c];
    cupAt[c] = cupAt[b];
    cupAt[b] = cupAt[a];
    cupAt[a] = tmp;
  } else {
    const tmp = cupAt[a];
    cupAt[a] = cupAt[b];
    cupAt[b] = tmp;
  }
}

// Which move types this level can actually stage with the cups it has.
function usableMoves(cfg) {
  return cfg.moves.filter((m) => {
    if (m === MOVES.CIRCLE) return cfg.cups >= 3;
    if (m === MOVES.DOUBLE) return cfg.cups >= 4;
    return cfg.cups >= 2;
  });
}

const slotsNeeded = (type) =>
  type === MOVES.CIRCLE ? 3 : type === MOVES.DOUBLE ? 4 : 2;

export function planShuffle(level, rng = makeRng()) {
  const cfg = levelConfig(level);
  const n = cfg.cups;
  const moves = usableMoves(cfg);

  // Cups are identical and opaque, so a cup is just an id; cupAt[slot] tracks
  // which one is standing where.
  const cupAt = [];
  for (let i = 0; i < n; i++) cupAt.push(i);

  const ballSlot = Math.floor(rng() * n) % n;
  const ballCup = cupAt[ballSlot];

  const swaps = [];
  let lastEnd = 0;
  let ballTouched = false;

  while (swaps.length < cfg.swapCount) {
    const remaining = cfg.swapCount - swaps.length;
    let type = pick(moves, rng);
    // A double is two crosses at once; don't let it overshoot the round's count.
    if (type === MOVES.DOUBLE && remaining < 2) type = MOVES.SLIDE;

    // If this is the last chance and the ball has never moved, route the cross
    // through it. A round where the ball simply sits still isn't a shuffle — and
    // it is not a tell, since a touched ball can still come back home.
    const ballHome = cupAt.indexOf(ballCup);
    const mustTouchBall =
      !ballTouched && remaining <= (type === MOVES.DOUBLE ? 2 : 1);
    const forced = mustTouchBall ? ballHome : -1;

    const slots = drawSlots(n, slotsNeeded(type), rng, forced);
    const duration = cfg.swapDuration;

    if (type === MOVES.DOUBLE) {
      // Two disjoint pairs, deliberately simultaneous. Disjoint by construction:
      // all four slots came from one draw without replacement.
      const pairs = [slots.slice(0, 2), slots.slice(2, 4)];
      const at = earliestStart(swaps, slots, lastEnd - cfg.overlap);
      for (const pairSlots of pairs) {
        const swap = {
          id: swaps.length,
          type: MOVES.SLIDE,
          double: true,
          at,
          duration,
          slots: pairSlots,
          cups: pairSlots.map((s) => cupAt[s]),
          front: rng() < 0.5 ? 0 : 1,
        };
        applyTo(cupAt, swap);
        swaps.push(swap);
      }
      lastEnd = at + duration;
    } else {
      const at = earliestStart(swaps, slots, lastEnd - cfg.overlap);
      const swap = {
        id: swaps.length,
        type,
        double: false,
        at,
        duration,
        slots,
        cups: slots.map((s) => cupAt[s]),
        front: rng() < 0.5 ? 0 : 1,
      };
      applyTo(cupAt, swap);
      swaps.push(swap);
      lastEnd = at + duration;
    }

    if (!ballTouched) {
      const last = swaps[swaps.length - 1];
      const involved = swaps.filter((s) => s.at === last.at);
      ballTouched = involved.some((s) => s.cups.includes(ballCup));
    }
  }

  swaps.sort((a, b) => a.at - b.at || a.id - b.id);

  return {
    level: cfg.level,
    cups: n,
    moves: cfg.moves,
    ballCup,
    ballSlot,
    swaps,
    totalDuration: swaps.reduce((m, s) => Math.max(m, s.at + s.duration), 0),
    finalBallSlot: cupAt.indexOf(ballCup),
  };
}

// Replay a plan from scratch, independently of how it was built. Returns
// cupAt — which cup ends up in each slot. The generator tracks this as it goes;
// replaying it separately is what lets a test catch the one bug that actually
// matters: the game scoring a slot the ball never arrived at.
export function replay(plan) {
  const cupAt = [];
  for (let i = 0; i < plan.cups; i++) cupAt.push(i);
  for (const swap of [...plan.swaps].sort((a, b) => a.at - b.at || a.id - b.id)) {
    applyTo(cupAt, swap);
  }
  return cupAt;
}

// Every pair of crosses that overlap in time, for legibility checks.
export function overlappingPairs(plan) {
  const out = [];
  for (let i = 0; i < plan.swaps.length; i++) {
    for (let j = i + 1; j < plan.swaps.length; j++) {
      const a = plan.swaps[i];
      const b = plan.swaps[j];
      if (a.at < b.at + b.duration && b.at < a.at + a.duration) out.push([a, b]);
    }
  }
  return out;
}

// Where a cup sits at time t, in slot space: a whole number while it stands
// still, a fractional path while it is crossing. The scene renders from this and
// so do the tests — which is how "the ball rides its cup" stops being a promise
// and becomes something we check.
//
// Returns { slot, from, to, progress, swap }, where `swap` is the cross in
// flight (null when the cup is at rest).
export function cupSlotAt(plan, cupId, t) {
  const cupAt = [];
  for (let i = 0; i < plan.cups; i++) cupAt.push(i);

  const ordered = [...plan.swaps].sort((a, b) => a.at - b.at || a.id - b.id);

  for (const swap of ordered) {
    const done = t >= swap.at + swap.duration;

    if (!swap.cups.includes(cupId)) {
      // Only settle crosses this cup is not in once they have finished. One
      // still in flight cannot have moved our cup: overlapping crosses are
      // slot-disjoint, so it leaves this cup's slot alone either way.
      if (done) applyTo(cupAt, swap);
      continue;
    }

    const from = cupAt.indexOf(cupId);
    const probe = [...cupAt];
    applyTo(probe, swap);
    const to = probe.indexOf(cupId);

    if (t <= swap.at) return { slot: from, from, to, progress: 0, swap: null };
    if (done) {
      applyTo(cupAt, swap);
      continue;
    }

    const progress = (t - swap.at) / swap.duration;
    return { slot: from + (to - from) * progress, from, to, progress, swap };
  }

  const slot = cupAt.indexOf(cupId);
  return { slot, from: slot, to: slot, progress: 1, swap: null };
}
