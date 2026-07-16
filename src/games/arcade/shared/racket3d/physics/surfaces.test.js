// A surface is a restitution/friction pair, and the whole character of a court is
// supposed to fall out of just those two numbers.  These tests assert exactly
// that: nobody writes "on clay, bounce higher" anywhere — clay bounces higher
// because it is bouncier, and it plays slower because it grips.
import { describe, expect, it } from "vitest";
import { SURFACES, SURFACE_IDS, TABLE_WOOD, getSurface } from "./surfaces";
import { createEnv, createBall } from "./aero";
import { reflectOffNormal } from "./sweep";

const TENNIS = createEnv({
  mass: 0.057,
  radius: 0.0335,
  cd0: 0.55,
  spinDecay: 0.10,
});

// One bounce off a horizontal court, with the ball arriving as a groundstroke
// does: driving forward and downward.
//
// The default ball is flat, and that is deliberate.  A heavily spun ball grips
// the court completely — its contact patch stops slipping partway through the
// bounce — and once it is rolling, how sticky the court is stops mattering: the
// impulse is capped by the slip, not by the friction.  So the ball that measures
// a court's *grip* is the one that skids across it.
function bounce(surface, { vz = 22, vy = -7, wx = 0 } = {}) {
  const ball = createBall({ y: TENNIS.radius, vz, vy, wx });
  reflectOffNormal(ball, 0, 1, 0, surface, TENNIS);
  return ball;
}

// Height a ball with this upward speed will reach, ignoring drag — good enough to
// compare two bounces with.
const apex = (ball) => (ball.vy * ball.vy) / (2 * TENNIS.gravity);

describe("the surfaces", () => {
  it("bounces higher off clay than off grass", () => {
    expect(apex(bounce(SURFACES.clay))).toBeGreaterThan(apex(bounce(SURFACES.grass)));
  });

  it("keeps less pace off clay than off grass — the slow court and the fast one", () => {
    expect(bounce(SURFACES.clay).vz).toBeLessThan(bounce(SURFACES.grass).vz);
  });

  it("puts hard court between the two, on both counts", () => {
    const clay = bounce(SURFACES.clay);
    const hard = bounce(SURFACES.hard);
    const grass = bounce(SURFACES.grass);

    expect(apex(hard)).toBeLessThan(apex(clay));
    expect(apex(hard)).toBeGreaterThan(apex(grass));
    expect(hard.vz).toBeGreaterThan(clay.vz);
    expect(hard.vz).toBeLessThan(grass.vz);
  });

  // The grip is what converts spin into a kick: a heavy topspin ball must come off
  // a gripping court faster than a dead one, because the surface bites the spin
  // and pays it back as forward speed.
  it("lets a gripping court convert topspin into a kick", () => {
    const spun = bounce(SURFACES.clay, { wx: 500 });
    const flat = bounce(SURFACES.clay, { wx: 0 });
    expect(spun.vz).toBeGreaterThan(flat.vz);
  });

  it("never returns more energy than the ball arrived with", () => {
    for (const id of SURFACE_IDS) {
      const before = createBall({ y: TENNIS.radius, vz: 22, vy: -7, wx: 250 });
      const after = bounce(SURFACES[id]);
      const ke = (b) => b.vx * b.vx + b.vy * b.vy + b.vz * b.vz;
      expect(ke(after)).toBeLessThanOrEqual(ke(before));
    }
  });

  it("falls back to hard court for a surface nobody has heard of", () => {
    expect(getSurface("astroturf")).toBe(SURFACES.hard);
    expect(getSurface("clay")).toBe(SURFACES.clay);
  });

  // A legal table is *defined* by its drop test: 30 cm down, ~23 cm back up.
  it("gives the table the rebound the ITTF drop test demands", () => {
    const h0 = 0.30;
    const impact = Math.sqrt(2 * TENNIS.gravity * h0);
    const rebound = impact * TABLE_WOOD.restitution;
    const h1 = (rebound * rebound) / (2 * TENNIS.gravity);
    expect(h1).toBeGreaterThan(0.22);
    expect(h1).toBeLessThan(0.25);
  });
});
