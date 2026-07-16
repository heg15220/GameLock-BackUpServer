// Opponent AI ported from the reference implementation
// (shresthalucky/PingPong: game.js opponentMovement() and players/opponent.js).
//
// The reference reads the ball by extrapolating its per-frame drift in a
// straight line to the far baseline, then glides the bat there on an eased
// 1.5s tween. It ignores gravity and the bounce entirely, and returns every ball
// with the same constants — that flat, gliding movement is the feel we want.
//
// Two departures, both additive:
//   * The tween is driven by elapsed time passed in from the engine rather than
//     its own requestAnimationFrame loop, so it steps with our fixed timestep
//     and can be tested headless.
//   * The reference has no difficulty setting at all, but our menu offers three.
//     Rather than drop them, they modulate the reference's own knobs: how fast
//     the glide is, how much the read is off by, and how often the return is
//     mishit. `medium` is the reference's own behaviour.

import {
  BOARD_END,
  BOARD_HALF_WIDTH,
  BOARD_HALF_LENGTH,
  NET_Z,
  PLAYER_Z,
  OPPONENT_Z,
  TIME,
  VELOCITY,
  UP_ANGLE,
  SIDE_ANGLE,
  hitBall,
  stepBall,
  clamp,
} from "./physics.js";

// Difficulty knobs fall into two groups. The first three (easeMs, aimError,
// faultChance, velocityJitter) are *defensive*: how well the CPU covers and how
// often it misses. On their own they made `hard` mean "errs 2% of the time"
// rather than "plays well", because the reference's opponent cannot place the
// ball at all — every return came straight back down the line and the human was
// never moved.
//
// The rest are *offensive*, and are ours: they decide how hard the CPU works the
// human across the table. `easy` sets them to zero, which is exactly the
// reference's flat, down-the-line return.
export const DIFFICULTIES = {
  easy: {
    id: "easy",
    easeMs: 2400, // slower glide — arrives late on wide balls
    aimError: 150, // px of error on the read
    faultChance: 0.18,
    velocityJitter: 12,
    placement: 0, // 0 = returns down the line, as the reference does
    aimDepth: 0.5, // fraction of the half-width it aims at
    placeError: 140, // px of scatter on the placement
    wrongFootChance: 0,
    recovery: 0, // stays parked where it hit
  },
  medium: {
    id: "medium",
    easeMs: 1500, // the reference's own tween duration
    aimError: 60,
    faultChance: 0.07,
    velocityJitter: 6,
    placement: 0.45,
    aimDepth: 0.7,
    placeError: 70,
    wrongFootChance: 0.15,
    recovery: 0.5,
  },
  hard: {
    id: "hard",
    easeMs: 900,
    aimError: 15,
    faultChance: 0.02,
    velocityJitter: 3,
    placement: 0.92,
    aimDepth: 0.85,
    placeError: 22,
    wrongFootChance: 0.45,
    recovery: 1, // recovers to the middle to cover the next ball
  },
};

// Above this bat speed the human is committed to a direction and can be wrong-footed.
const WRONG_FOOT_VX = 260;

// Within this much of the middle, the human covers both corners equally.
const CENTRE_BAND = 80;

// The human's own hits cap out at |vx| = 1 (cos of the side angle), so the CPU
// gets the same ceiling rather than a drift it could never face itself.
const MAX_DRIFT = 1;

export function createOpponent(difficulty = "medium") {
  return { ...(DIFFICULTIES[difficulty] ?? DIFFICULTIES.medium) };
}

// Small seedable PRNG (mulberry32) so a match can be replayed exactly.
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

// Where the bat should go. Mirrors game.js opponentMovement(): project the
// ball's per-frame x drift forward in a straight line to the far baseline.
// Returns { x, z }.
export function predictDestination(ball) {
  // slope = dz per frame / dx per frame. With vx = 0 this is +/-Infinity and the
  // division below collapses to 0, leaving the bat on the ball's current x —
  // which is the reference's behaviour for a ball with no lateral drift.
  const slope = (ball.vz * TIME) / (10 * ball.vx);

  let x = ball.x + (BOARD_END - ball.z) / slope;
  let z = BOARD_END + 10;

  // Guard the degenerate read (a stationary ball makes slope NaN). The reference
  // has no such guard because it only calls this on a live ball.
  if (!Number.isFinite(x)) x = ball.x;

  const minZ = NET_Z + BOARD_HALF_LENGTH / 2;
  if (x < -BOARD_HALF_WIDTH) {
    x = -BOARD_HALF_WIDTH;
    const zc = slope * (-BOARD_HALF_WIDTH - ball.x) + ball.z;
    if (Number.isFinite(zc) && zc > minZ) z = zc;
  } else if (x > BOARD_HALF_WIDTH) {
    x = BOARD_HALF_WIDTH;
    const zc = slope * (BOARD_HALF_WIDTH - ball.x) + ball.z;
    if (Number.isFinite(zc) && zc > minZ) z = zc;
  }

  return { x, z };
}

// The reference's eased glide, as pure state the engine advances with dt.
// easeOutQuint, exactly as in opponent.js animate().
const easeOut = (p) => Math.pow(p - 1, 5) + 1;

export function createGlide(fromX, fromZ, toX, toZ, durationMs) {
  return {
    fromX,
    fromZ,
    dx: toX - fromX,
    dz: toZ - fromZ,
    total: Math.max(1, durationMs),
    elapsed: 0,
  };
}

// Advance a glide by dt (seconds). Returns { x, z, done }.
export function stepGlide(glide, dt) {
  const elapsed = glide.elapsed + dt * 1000;
  const progress = Math.min(elapsed / glide.total, 1);
  const e = easeOut(progress);
  return {
    x: glide.fromX + glide.dx * e,
    z: glide.fromZ + glide.dz * e,
    done: progress >= 1,
    elapsed,
  };
}

// Where the CPU wants to land the ball, in x, at the human's end. Two ideas,
// both scaled by difficulty:
//   * open side — hit away from where the human is standing;
//   * wrong-foot — if they are already committed to a direction, hit behind them.
// `placement` then blends that target back toward the down-the-line return, so
// `easy` (placement 0) keeps the reference's behaviour exactly.
export function aimTarget(opp, rng, { fromX, playerX = 0, playerVx = 0 }) {
  const r = rng ?? makeRng();

  // With the human within a bat of the middle, neither corner is more open than
  // the other, so pick one. Reading `playerX >= 0` there would make the CPU
  // answer every centred ball to the same side — a tell you could just camp on.
  const openSide =
    Math.abs(playerX) < CENTRE_BAND ? (r() < 0.5 ? -1 : 1) : playerX >= 0 ? -1 : 1;
  const committed = Math.abs(playerVx) > WRONG_FOOT_VX ? -Math.sign(playerVx) : 0;
  const side = committed !== 0 && r() < opp.wrongFootChance ? committed : openSide;

  const attacked = side * BOARD_HALF_WIDTH * opp.aimDepth;
  const target = fromX + (attacked - fromX) * opp.placement;
  const scattered = target + (r() * 2 - 1) * opp.placeError;

  // Stay inside the table: a target off the edge is a point handed over, and the
  // drift is monotonic, so an in-bounds target keeps the whole flight in bounds.
  return clamp(scattered, -BOARD_HALF_WIDTH * 0.95, BOARD_HALF_WIDTH * 0.95);
}

// How many frames of lateral drift a shot actually gets before it reaches the
// human's end.
//
// The closed-form Δz/vz answer is wrong: on the frame stepBall rebounds a ball it
// re-launches without advancing anything, and the frame after that runs with
// t = 0, so z stalls for two frames per bounce while x stalls for only one. The
// drift therefore gains exactly one extra frame per bounce — a systematic
// overshoot of 10-30px that would push a corner-seeking CPU off the table.
//
// So count them by flying the shot. This is exact rather than approximate: x
// feeds back into the flight only through isBallInside()'s "over the table?"
// test, and callers keep both the origin and the target inside the table, so
// every in-bounds drift bounces on the same schedule as the drift-free flight
// simulated here.
export function flightFrames(shotBall, toZ = PLAYER_Z, maxSteps = 600) {
  let b = shotBall;
  let frames = 0;
  let prevBounces = b.bounceCount;

  for (let i = 0; i < maxSteps; i++) {
    const prev = b;
    b = stepBall(b);

    if (b.bounceCount > prevBounces) {
      prevBounces = b.bounceCount; // rebound frame: neither x nor z moves
      continue;
    }
    if (b.z <= toZ) {
      // Take only the fraction of the final frame up to the crossing.
      const span = prev.z - b.z;
      return frames + (span <= 0 ? 1 : clamp((prev.z - toZ) / span, 0, 1));
    }
    frames += 1;
  }
  return frames;
}

// The per-frame lateral drift that lands `shotBall` on targetX. `shotBall` is the
// shot as it leaves the bat with no drift; x advances by vx * 10 per frame.
export function driftForTarget(shotBall, targetX) {
  const frames = flightFrames(shotBall);
  if (!Number.isFinite(frames) || frames < 1) return 0;
  return clamp((targetX - shotBall.x) / (10 * frames), -MAX_DRIFT, MAX_DRIFT);
}

// The return shot. The reference always plays hit(opponent, VELOCITY, SIDE_ANGLE,
// UP_ANGLE) — identical every time, and with no lateral drift at all. Difficulty
// jitters those constants so the three menu settings mean something, a fault
// occasionally dumps or overcooks the ball, and `context` (when the engine passes
// the rally state) lets the CPU actually aim.
//
// Without context it falls back to the reference's straight return, which keeps
// the function usable — and testable — on its own.
export function planReturn(opp, rng, context = null) {
  const r = rng ?? makeRng();
  let velocity = VELOCITY + (r() * 2 - 1) * opp.velocityJitter;
  let upAngle = UP_ANGLE;
  const sideAngle = SIDE_ANGLE;

  if (r() < opp.faultChance) {
    // Overcook it long, or drop it short into the net.
    if (r() < 0.5) {
      velocity += 22 + r() * 14;
      upAngle += 10 + r() * 8;
    } else {
      velocity -= 24 + r() * 10;
      upAngle -= 12 + r() * 6;
    }
  }

  velocity = clamp(velocity, 30, 130);
  upAngle = clamp(upAngle, 8, 70);

  let drift = 0;
  let targetX = null;
  if (context?.ball && opp.placement > 0) {
    // The flight starts from the ball's own x, not the bat's — the bat only has
    // to overlap the ball to strike it, and hitBall() launches from ball.x.
    targetX = aimTarget(opp, r, {
      fromX: context.ball.x,
      playerX: context.playerX,
      playerVx: context.playerVx,
    });
    const trial = hitBall(context.ball, {
      side: "opponent",
      velocity,
      upAngle,
      drift: 0,
      fromZ: context.fromZ ?? OPPONENT_Z,
    });
    drift = driftForTarget(trial, targetX);
  }

  return { velocity, sideAngle, upAngle, drift, targetX };
}

// Where the bat sits after playing its shot. The reference leaves it parked at
// the contact point until the next read; a real player pushes back to the middle
// to cover the reply, so `recovery` scales between the two.
export function recoveryTarget(opp, fromX) {
  return fromX - fromX * opp.recovery;
}

// Serve placement. Mirrors opponent.js setPosition(): a random x across the
// table's width.
export function serveX(rng) {
  const r = rng ?? makeRng();
  const span = BOARD_HALF_WIDTH * 2 - 28;
  return -BOARD_HALF_WIDTH + 14 + r() * span;
}
