import { describe, expect, it } from "vitest";
import {
  DIFFICULTIES,
  aimTarget,
  createOpponent,
  createGlide,
  driftForTarget,
  stepGlide,
  makeRng,
  planReturn,
  predictDestination,
  recoveryTarget,
  serveX,
} from "./ai.js";
import {
  BOARD_END,
  BOARD_HALF_WIDTH,
  BOARD_Z,
  NET_Z,
  OPPONENT_Z,
  PLAYER_Z,
  TIME,
  createBall,
  hitBall,
  stepBall,
} from "./physics.js";

describe("ping-pong AI — read matches the reference's extrapolation", () => {
  it("projects the ball's lateral drift straight to the far baseline", () => {
    const ball = createBall({ x: 0, z: BOARD_Z, vx: 0.5, vz: 50 });
    // The reference's own formula, transcribed from game.js opponentMovement().
    const slope = (ball.vz * TIME) / (10 * ball.vx);
    const expected = ball.x + (BOARD_END - ball.z) / slope;

    expect(predictDestination(ball).x).toBeCloseTo(expected, 9);
  });

  it("holds the ball's x when there is no lateral drift", () => {
    const ball = createBall({ x: 120, z: BOARD_Z, vx: 0, vz: 50 });
    expect(predictDestination(ball).x).toBeCloseTo(120, 9);
  });

  it("clamps the read to the table and never returns a non-finite x", () => {
    const wide = createBall({ x: 0, z: BOARD_Z, vx: 5, vz: 10 });
    const d = predictDestination(wide);
    expect(d.x).toBeLessThanOrEqual(BOARD_HALF_WIDTH);
    expect(d.x).toBeGreaterThanOrEqual(-BOARD_HALF_WIDTH);
    expect(Number.isFinite(d.x)).toBe(true);

    // A dead ball makes the reference's slope NaN; we must not propagate that.
    const dead = createBall({ x: 40, z: BOARD_Z, vx: 0, vz: 0 });
    expect(Number.isFinite(predictDestination(dead).x)).toBe(true);
  });

  it("keeps the bat behind the far half of the table", () => {
    const ball = createBall({ x: 0, z: NET_Z, vx: 1, vz: 40 });
    expect(predictDestination(ball).z).toBeGreaterThan(NET_Z);
  });
});

describe("ping-pong AI — eased glide", () => {
  it("starts at the origin and lands exactly on the destination", () => {
    const g = createGlide(-200, BOARD_END, 300, BOARD_END + 10, 1500);
    expect(stepGlide(g, 0).x).toBeCloseTo(-200, 6);

    const s = stepGlide(g, 1.5);
    expect(s.x).toBeCloseTo(300, 6);
    expect(s.z).toBeCloseTo(BOARD_END + 10, 6);
    expect(s.done).toBe(true);
  });

  it("eases out — most of the distance is covered early", () => {
    const g = createGlide(0, 0, 100, 0, 1000);
    const quarter = stepGlide(g, 0.25).x;
    // easeOutQuint: ~76% of the way by a quarter of the duration.
    expect(quarter).toBeGreaterThan(70);
    expect(quarter).toBeLessThan(100);
  });

  it("never overshoots past the destination", () => {
    const g = createGlide(0, 0, 100, 0, 1000);
    expect(stepGlide(g, 5).x).toBeCloseTo(100, 6);
  });
});

describe("ping-pong AI — difficulty ladder", () => {
  it("glides faster and reads more accurately as difficulty rises", () => {
    expect(DIFFICULTIES.easy.easeMs).toBeGreaterThan(DIFFICULTIES.medium.easeMs);
    expect(DIFFICULTIES.medium.easeMs).toBeGreaterThan(DIFFICULTIES.hard.easeMs);
    expect(DIFFICULTIES.easy.aimError).toBeGreaterThan(DIFFICULTIES.hard.aimError);
    expect(DIFFICULTIES.easy.faultChance).toBeGreaterThan(DIFFICULTIES.hard.faultChance);
  });

  it("keeps medium on the reference's own 1.5s tween", () => {
    expect(DIFFICULTIES.medium.easeMs).toBe(1500);
  });

  it("attacks the table harder as difficulty rises", () => {
    expect(DIFFICULTIES.easy.placement).toBeLessThan(DIFFICULTIES.medium.placement);
    expect(DIFFICULTIES.medium.placement).toBeLessThan(DIFFICULTIES.hard.placement);
    expect(DIFFICULTIES.easy.placeError).toBeGreaterThan(DIFFICULTIES.hard.placeError);
    expect(DIFFICULTIES.easy.wrongFootChance).toBeLessThan(DIFFICULTIES.hard.wrongFootChance);
    expect(DIFFICULTIES.easy.recovery).toBeLessThan(DIFFICULTIES.hard.recovery);
  });

  it("keeps easy on the reference's flat, placement-free return", () => {
    expect(DIFFICULTIES.easy.placement).toBe(0);
    expect(DIFFICULTIES.easy.recovery).toBe(0);
  });

  it("defaults to medium for an unknown id", () => {
    expect(createOpponent("nonsense").id).toBe("medium");
  });

  it("faults more often on easy than on hard over many returns", () => {
    const count = (id) => {
      const opp = createOpponent(id);
      const rng = makeRng(12345);
      let odd = 0;
      for (let i = 0; i < 400; i++) {
        const shot = planReturn(opp, rng);
        // A fault shows up as a velocity well away from the nominal 85.
        if (Math.abs(shot.velocity - 85) > 20) odd += 1;
      }
      return odd;
    };
    expect(count("easy")).toBeGreaterThan(count("hard"));
  });

  it("always returns a physically usable shot", () => {
    for (const id of ["easy", "medium", "hard"]) {
      const opp = createOpponent(id);
      const rng = makeRng(7);
      for (let i = 0; i < 200; i++) {
        const shot = planReturn(opp, rng);
        expect(Number.isFinite(shot.velocity)).toBe(true);
        expect(shot.velocity).toBeGreaterThan(0);
        expect(shot.upAngle).toBeGreaterThan(0);
        expect(shot.upAngle).toBeLessThan(90);
      }
    }
  });

  it("is deterministic for a given seed", () => {
    const a = planReturn(createOpponent("medium"), makeRng(99));
    const b = planReturn(createOpponent("medium"), makeRng(99));
    expect(a).toEqual(b);
  });
});

describe("ping-pong AI — placement", () => {
  const shotFrom = (fromX, drift, velocity = 85, upAngle = 30) =>
    hitBall(createBall({ x: fromX, y: 420, z: OPPONENT_Z }), {
      side: "opponent",
      velocity,
      upAngle,
      drift,
      fromZ: OPPONENT_Z,
    });

  // Fly an opponent return and report the ball's x at the exact PLAYER_Z
  // crossing, interpolating between the straddling frames so the measurement
  // itself contributes no overshoot.
  const xAtPlayerEnd = (fromX, drift, velocity = 85, upAngle = 30) => {
    let b = shotFrom(fromX, drift, velocity, upAngle);
    for (let i = 0; i < 600; i++) {
      const prev = b;
      b = stepBall(b);
      if (b.z <= PLAYER_Z) {
        const span = prev.z - b.z;
        return span <= 0 ? b.x : prev.x + (b.x - prev.x) * ((prev.z - PLAYER_Z) / span);
      }
    }
    return b.x;
  };

  // Targets here are all within reach of their shot — see the clamp test below
  // for what happens when they are not.
  it("lands the ball on the x it aimed at, across shot shapes", () => {
    for (const [fromX, targetX, velocity, upAngle] of [
      [-250, 300, 85, 30],
      [0, 200, 85, 30],
      [120, 120, 85, 30],
      [-100, 340, 60, 45], // loopy: 100 frames of flight, so plenty of drift
      [200, -100, 110, 20], // flat drive: only 41 frames, the tightest budget
      [0, -380, 50, 12], // slow and low, bounces twice
    ]) {
      const drift = driftForTarget(shotFrom(fromX, 0, velocity, upAngle), targetX);
      const landed = xAtPlayerEnd(fromX, drift, velocity, upAngle);
      // Sub-pixel: counting the real frames (rather than Δz/vz) makes this exact.
      expect(Math.abs(landed - targetX)).toBeLessThan(1);
    }
  });

  it("gives up honestly when the target is out of reach rather than teleporting", () => {
    // Corner to opposite corner on the flattest, fastest shot: the drift caps at
    // the human's own ceiling, so the ball lands short — it must not overshoot.
    const drift = driftForTarget(shotFrom(380, 0, 130, 8), -380);
    expect(Math.abs(drift)).toBeLessThanOrEqual(1);
    expect(xAtPlayerEnd(380, drift, 130, 8)).toBeGreaterThan(-380);
  });

  it("hard works the human across the table; easy returns down the line", () => {
    // How far from the human's bat the ball arrives, averaged over many returns.
    const spread = (id) => {
      const opp = createOpponent(id);
      const rng = makeRng(2024);
      let total = 0;
      for (let i = 0; i < 300; i++) {
        // Human parked wide right; a good CPU should go the other way.
        const shot = planReturn(opp, rng, {
          ball: createBall({ x: 0, y: 420, z: OPPONENT_Z }),
          fromZ: OPPONENT_Z,
          playerX: 320,
          playerVx: 0,
        });
        total += Math.abs(xAtPlayerEnd(0, shot.drift, shot.velocity, shot.upAngle) - 320);
      }
      return total / 300;
    };

    const easy = spread("easy");
    const hard = spread("hard");
    // Easy is the reference: no drift at all, so the ball arrives on the line it
    // was hit from (x = 0), a fixed 320 away from the human by pure geometry.
    expect(easy).toBeCloseTo(320, 0);
    expect(hard).toBeGreaterThan(easy + 150);
  });

  it("does not hand the human free points by drifting off the table", () => {
    // The whole flight of every hard return must stay over the table in x,
    // otherwise it bounces on the floor and the CPU loses the point it just won.
    const opp = createOpponent("hard");
    const rng = makeRng(404);
    for (let i = 0; i < 200; i++) {
      const fromX = (rng() * 2 - 1) * BOARD_HALF_WIDTH * 0.9;
      const shot = planReturn(opp, rng, {
        ball: createBall({ x: fromX, y: 420, z: OPPONENT_Z }),
        fromZ: OPPONENT_Z,
        playerX: (rng() * 2 - 1) * BOARD_HALF_WIDTH,
        playerVx: (rng() * 2 - 1) * 1200,
      });
      let b = shotFrom(fromX, shot.drift, shot.velocity, shot.upAngle);
      for (let s = 0; s < 600 && b.z > PLAYER_Z; s++) {
        b = stepBall(b);
        expect(Math.abs(b.x)).toBeLessThanOrEqual(BOARD_HALF_WIDTH);
      }
    }
  });

  it("aims away from the human rather than at them", () => {
    const opp = createOpponent("hard");
    const rng = makeRng(11);
    for (let i = 0; i < 200; i++) {
      // Human on the right: the target should sit left of centre.
      expect(aimTarget(opp, rng, { fromX: 0, playerX: 350, playerVx: 0 })).toBeLessThan(0);
      // Human on the left: the target should sit right of centre.
      expect(aimTarget(opp, rng, { fromX: 0, playerX: -350, playerVx: 0 })).toBeGreaterThan(0);
    }
  });

  it("does not tell its hand against a human camped in the middle", () => {
    // Both corners are equally open from the centre, so the side must not be a
    // fixed read the human could just stand on.
    const opp = createOpponent("hard");
    const rng = makeRng(17);
    let left = 0;
    for (let i = 0; i < 400; i++) {
      if (aimTarget(opp, rng, { fromX: 0, playerX: 0, playerVx: 0 }) < 0) left += 1;
    }
    expect(left).toBeGreaterThan(120);
    expect(left).toBeLessThan(280);
  });

  it("wrong-foots a human who is already committed to a direction", () => {
    const opp = createOpponent("hard");
    const rng = makeRng(5);
    let behind = 0;
    for (let i = 0; i < 400; i++) {
      // Human at centre but sprinting right: the ball should sometimes go left,
      // behind them, which the open-side read alone would never do.
      if (aimTarget(opp, rng, { fromX: 0, playerX: 0, playerVx: 900 }) < 0) behind += 1;
    }
    expect(behind).toBeGreaterThan(0);
  });

  it("never aims off the table", () => {
    for (const id of ["easy", "medium", "hard"]) {
      const opp = createOpponent(id);
      const rng = makeRng(88);
      for (let i = 0; i < 300; i++) {
        const x = aimTarget(opp, rng, {
          fromX: (rng() * 2 - 1) * BOARD_HALF_WIDTH,
          playerX: (rng() * 2 - 1) * BOARD_HALF_WIDTH,
          playerVx: (rng() * 2 - 1) * 1200,
        });
        expect(Math.abs(x)).toBeLessThanOrEqual(BOARD_HALF_WIDTH);
      }
    }
  });

  it("keeps the reference's straight return when given no rally context", () => {
    for (const id of ["easy", "medium", "hard"]) {
      const shot = planReturn(createOpponent(id), makeRng(1));
      expect(shot.drift).toBe(0);
      expect(shot.targetX).toBe(null);
    }
  });

});

describe("ping-pong AI — recovery", () => {
  it("hard pushes back to the middle, easy parks where it hit", () => {
    expect(recoveryTarget(createOpponent("hard"), 380)).toBeCloseTo(0, 6);
    expect(recoveryTarget(createOpponent("easy"), 380)).toBeCloseTo(380, 6);
    expect(recoveryTarget(createOpponent("medium"), 380)).toBeCloseTo(190, 6);
  });
});

describe("ping-pong AI — serve", () => {
  it("places the serve somewhere across the table width", () => {
    const rng = makeRng(4);
    for (let i = 0; i < 100; i++) {
      const x = serveX(rng);
      expect(x).toBeGreaterThanOrEqual(-BOARD_HALF_WIDTH);
      expect(x).toBeLessThanOrEqual(BOARD_HALF_WIDTH);
    }
  });
});
