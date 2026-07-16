// Tennis court geometry, surfaces, and the shot solver.
//
// The solver is deliberately shared by the human and the AI: both say "hit it
// from here to there with this much pace and this much spin", and both get back
// a launch velocity found by rolling out the real integrator.  That is why the
// AI needs no separate tuning when the surface or the ball changes.
import {
  createEnv,
  createBall,
  cloneBall,
  integrate,
} from "../shared/racket3d/physics/aero";
import {
  sweepHorizontalPlane,
  sweepVerticalPlaneZ,
  positionAt,
  reflectOffNormal,
} from "../shared/racket3d/physics/sweep";
import { SURFACES as COURT_SURFACES, getSurface } from "../shared/racket3d/physics/surfaces";

// ── Regulation geometry (metres) ────────────────────────────────────────────
export const COURT_HALF_LENGTH = 11.885; // baseline to net
export const COURT_HALF_WIDTH = 4.115;   // singles sideline
export const SERVICE_LINE_Z = 6.40;      // service line distance from net
export const NET_CENTER_HEIGHT = 0.914;
export const NET_POST_HEIGHT = 1.07;
export const NET_POST_X = 5.03;

export const BALL_RADIUS = 0.0335;

export const TENNIS_ENV = createEnv({
  mass: 0.057,
  radius: BALL_RADIUS,
  cd0: 0.55,
  spinDecay: 0.10,
});

// The surfaces live in one shared place now — see physics/surfaces.js.  A surface
// is still nothing but a restitution/friction pair, and every downstream
// behaviour — including how the AI plays — still follows from those two numbers.
export const SURFACES = COURT_SURFACES;

export function netHeightAt(x) {
  const t = Math.min(1, Math.abs(x) / NET_POST_X);
  return NET_CENTER_HEIGHT + (NET_POST_HEIGHT - NET_CENTER_HEIGHT) * t * t;
}

// Side +1 = the far half (+Z), side -1 = the near half (-Z).
export function isInCourt(x, z) {
  return Math.abs(x) <= COURT_HALF_WIDTH && Math.abs(z) <= COURT_HALF_LENGTH;
}

// Service box for a serve struck by `server` (-1 near, +1 far) into the
// deuce (right) or ad (left) court.  The receiver's box is diagonal.
export function serviceBox(server, court) {
  const targetSide = -server; // ball lands on the opponent's half
  // "deuce" is the receiver's right-hand box.
  const xSign = court === "deuce" ? targetSide : -targetSide;
  const zMin = targetSide > 0 ? 0 : -SERVICE_LINE_Z;
  const zMax = targetSide > 0 ? SERVICE_LINE_Z : 0;
  const xMin = xSign > 0 ? 0 : -COURT_HALF_WIDTH;
  const xMax = xSign > 0 ? COURT_HALF_WIDTH : 0;
  return { xMin, xMax, zMin, zMax };
}

export function inServiceBox(x, z, server, court) {
  const box = serviceBox(server, court);
  return x >= box.xMin && x <= box.xMax && z >= box.zMin && z <= box.zMax;
}

// ── World collision ─────────────────────────────────────────────────────────

// Events: "net" | "netcord" | "bounce".  The caller decides what a bounce *means*
// (in, out, double bounce) — this only does the physics.
//
// Both tests are continuous: they ask *when*, between the ball's last position and
// this one, it first touched something.  A serve at 225 km/h covers half a metre
// per step at 120 Hz, so asking instead whether the ball happens to be inside the
// net right now is a question with the wrong answer far too often.
export function createWorld(surfaceId) {
  const surface = getSurface(surfaceId);

  // Scratch: where the ball *would* be at a candidate contact.  The ball itself is
  // not touched until we know the contact is real.
  const at = { x: 0, y: 0, z: 0 };

  return {
    surface,
    resolve(ball, prev) {
      const tNet = sweepVerticalPlaneZ(prev, ball, 0);
      const tGround = sweepHorizontalPlane(prev, ball, 0, BALL_RADIUS);

      // Whichever it reached first is what it hit.
      const netFirst = tNet > 0 && (tGround < 0 || tNet <= tGround);

      if (netFirst) {
        positionAt(prev, ball, tNet, at);
        const h = netHeightAt(at.x);

        // Round the post is legal in real tennis, so outside the net's span there
        // is simply nothing there: let the bounce judge it.
        if (Math.abs(at.x) <= NET_POST_X && at.y - BALL_RADIUS < h) {
          ball.x = at.x;
          ball.y = at.y;
          ball.z = at.z;

          if (at.y + BALL_RADIUS > h) {
            // Clipped the tape: it may still tumble over, but with the pace taken
            // off it.
            ball.vy *= 0.55;
            ball.vz *= 0.45;
            ball.vx *= 0.6;
            ball.wx *= 0.4;
            ball.wy *= 0.4;
            return "netcord";
          }

          // Into the net.  It dies there.
          const nz = ball.vz > 0 ? -1 : 1;
          reflectOffNormal(ball, 0, 0, nz, { restitution: 0.12, friction: 0.35 }, TENNIS_ENV);
          return "net";
        }
      }

      if (tGround > 0) {
        positionAt(prev, ball, tGround, at);
        ball.x = at.x;
        ball.y = at.y;
        ball.z = at.z;
        reflectOffNormal(ball, 0, 1, 0, surface, TENNIS_ENV);
        ball.y = BALL_RADIUS;
        return "bounce";
      }

      return null;
    },
  };
}

// ── Shot solver ─────────────────────────────────────────────────────────────

const SOLVE_DT = 1 / 120;

// Flies a ball with no net and no court, purely to find where it first lands.
function landingDistance(from, dirX, dirZ, elevation, speed, spinVec) {
  const cosE = Math.cos(elevation);
  const ball = createBall({
    x: from.x,
    y: from.y,
    z: from.z,
    vx: dirX * speed * cosE,
    vy: speed * Math.sin(elevation),
    vz: dirZ * speed * cosE,
    wx: spinVec.wx,
    wy: spinVec.wy,
    wz: spinVec.wz,
  });

  for (let i = 0; i < 700; i += 1) {
    const py = ball.y;
    integrate(ball, SOLVE_DT, TENNIS_ENV);
    if (ball.y - BALL_RADIUS <= 0 && ball.vy < 0) {
      // Linear interpolation back to the ground plane for a cleaner distance.
      const span = py - ball.y || 1e-9;
      const t = (py - BALL_RADIUS) / span;
      const x = ball.x - ball.vx * SOLVE_DT * (1 - t);
      const z = ball.z - ball.vz * SOLVE_DT * (1 - t);
      const dx = x - from.x;
      const dz = z - from.z;
      return { distance: Math.sqrt(dx * dx + dz * dz), x, z, time: i * SOLVE_DT };
    }
    if (ball.y > 30) break;
  }
  return null;
}

// Finds the launch elevation that drops the ball on `target`, for the pace and
// spin asked for.
//
// Range-versus-elevation is unimodal, not monotonic, so we scan coarsely for the
// peak and then bisect on the branch we want: "low" for drives (the flattest
// trajectory that reaches the target) and "high" for lobs.  If the target is out
// of reach at this pace, we return the peak — the ball falls short, which is
// exactly what an underpowered shot should do.
export function solveShot({
  from,
  target,
  speed,
  spin = { wx: 0, wy: 0, wz: 0 },
  branch = "low",
}) {
  const dx = target.x - from.x;
  const dz = target.z - from.z;
  const horiz = Math.sqrt(dx * dx + dz * dz);
  if (horiz < 1e-4) return null;

  const dirX = dx / horiz;
  const dirZ = dz / horiz;

  const LO = -0.35; // -20°
  const HI = 1.15;  //  66°
  const STEPS = 16;

  let best = null;
  const samples = [];
  for (let i = 0; i <= STEPS; i += 1) {
    const e = LO + ((HI - LO) * i) / STEPS;
    const r = landingDistance(from, dirX, dirZ, e, speed, spin);
    const distance = r ? r.distance : 0;
    samples.push({ e, distance });
    if (!best || distance > best.distance) best = { e, distance };
  }

  const build = (elevation) => {
    const cosE = Math.cos(elevation);
    return {
      elevation,
      vx: dirX * speed * cosE,
      vy: speed * Math.sin(elevation),
      vz: dirZ * speed * cosE,
      wx: spin.wx,
      wy: spin.wy,
      wz: spin.wz,
    };
  };

  // Out of range at this pace: hit the furthest we can and let it land short.
  if (best.distance < horiz) return build(best.e);

  let lo;
  let hi;
  if (branch === "low") {
    lo = LO;
    hi = best.e;
  } else {
    lo = best.e;
    hi = HI;
  }

  for (let i = 0; i < 20; i += 1) {
    const mid = (lo + hi) / 2;
    const r = landingDistance(from, dirX, dirZ, mid, speed, spin);
    const d = r ? r.distance : 0;
    const tooShort = branch === "low" ? d < horiz : d > horiz;
    if (tooShort) lo = mid;
    else hi = mid;
  }

  return build((lo + hi) / 2);
}

// Rolls a candidate shot through the *real* world (net included) and reports
// what actually happens to it.  This is the function the AI scores its options
// with, and it is the same code that runs the point.
export function predictShot(launch, from, world, { maxTime = 3.5 } = {}) {
  const ball = createBall({
    x: from.x, y: from.y, z: from.z,
    vx: launch.vx, vy: launch.vy, vz: launch.vz,
    wx: launch.wx, wy: launch.wy, wz: launch.wz,
  });

  const prev = cloneBall(ball);
  let t = 0;
  // How much air the ball had over the tape.  Negative means it was always
  // going to be a net cord or worse.  The AI turns this into a probability.
  let netClearance = null;

  while (t < maxTime) {
    prev.x = ball.x; prev.y = ball.y; prev.z = ball.z;
    integrate(ball, SOLVE_DT, TENNIS_ENV);
    t += SOLVE_DT;

    if (netClearance == null && (prev.z - 0) * (ball.z - 0) <= 0 && prev.z !== ball.z) {
      const f = Math.abs(prev.z) / Math.abs(ball.z - prev.z || 1e-9);
      const xAt = prev.x + (ball.x - prev.x) * f;
      const yAt = prev.y + (ball.y - prev.y) * f;
      netClearance = yAt - BALL_RADIUS - netHeightAt(xAt);
    }

    const event = world.resolve(ball, prev);
    if (event === "net") {
      return { outcome: "net", x: ball.x, z: ball.z, time: t, netClearance: netClearance ?? -0.2 };
    }
    if (event === "netcord") continue;
    if (event === "bounce") {
      const inPlay = isInCourt(ball.x, ball.z);
      return {
        outcome: inPlay ? "in" : "out",
        x: ball.x,
        z: ball.z,
        time: t,
        netClearance: netClearance ?? 0,
        speed: Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy + ball.vz * ball.vz),
      };
    }
  }

  return { outcome: "long", x: ball.x, z: ball.z, time: t, netClearance: netClearance ?? 0 };
}

// Spin vectors for the stroke vocabulary.  `dirZ` is the direction of travel
// (+1 hitting toward +Z, -1 toward -Z) so topspin always means topspin.
export function spinFor(kind, magnitude, dirZ, sideways = 0) {
  const m = magnitude * 180; // rad/s at full magnitude ~ 180 (≈1700 rpm)
  switch (kind) {
    case "topspin":
      return { wx: dirZ * m, wy: sideways * m * 0.35, wz: 0 };
    case "slice":
      return { wx: -dirZ * m * 0.85, wy: sideways * m * 0.45, wz: 0 };
    case "flat":
      return { wx: dirZ * m * 0.20, wy: sideways * m * 0.25, wz: 0 };
    case "lob":
      return { wx: dirZ * m * 0.75, wy: 0, wz: 0 };
    case "drop":
      return { wx: -dirZ * m * 1.05, wy: 0, wz: 0 };
    case "kick": // kick serve
      return { wx: dirZ * m * 0.9, wy: sideways * m * 0.8, wz: 0 };
    default:
      return { wx: 0, wy: 0, wz: 0 };
  }
}
