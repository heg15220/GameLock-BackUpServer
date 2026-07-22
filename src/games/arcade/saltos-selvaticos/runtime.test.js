import { describe, expect, it } from "vitest";
import {
  ROPE_LIMIT,
  PLATFORM_ANGLE,
  PLATFORM_H,
  PIVOT_H,
  ROUNDS,
  SWING_TIME_MS,
  SaltosSelvaticosRuntime,
  amplitudeOf,
  angularSpeedAt,
  computeJump,
  gripAt,
  jumpDistance,
  rankJumpers,
} from "./runtime.js";

const deg = (d) => (d * Math.PI) / 180;
const make = (seed = 4242, opts = {}) => new SaltosSelvaticosRuntime({ seed, ...opts });

/**
 * Drive the player's swing the way a competent human would: one pump every
 * time the vine sweeps the bottom of the arc, keep building for `armAfterMs`,
 * then let go on the next pass through `releaseDeg`.
 */
function swingAndJump(rt, { releaseDeg = 42, armAfterMs = 13000, maxMs = SWING_TIME_MS } = {}) {
  rt.skipIntro();
  const target = deg(releaseDeg);
  let elapsed = 0;
  while (elapsed < maxMs && rt.snapshot().screen === "swing") {
    const you = rt.jumpers[0];
    const prev = you.theta;
    rt.advanceTime(16);
    elapsed += 16;
    if (you.released) continue;
    if (Math.abs(you.theta) < 0.08) rt.pump();
    if (elapsed >= armAfterMs && you.omega > 0 && prev < target && you.theta >= target) rt.jump();
  }
  // Let everyone finish their flight so the round resolves.
  rt.advanceTime(6000);
  return rt.jumpers[0].distance;
}

describe("swing and jump physics", () => {
  it("puts the sweet spot within a couple of degrees of the platform cue", () => {
    // The guide's advice: let go roughly at the height of the wooden platform.
    let bestAngle = 0;
    let bestDist = 0;
    for (let d = 5; d <= 85; d += 1) {
      const dist = jumpDistance(deg(d), ROPE_LIMIT);
      if (dist > bestDist) {
        bestDist = dist;
        bestAngle = d;
      }
    }
    const cueDeg = (PLATFORM_ANGLE * 180) / Math.PI;
    expect(Math.abs(bestAngle - cueDeg)).toBeLessThan(8);
    // ...and the cue itself is worth all but ~1% of the very best jump.
    expect(jumpDistance(PLATFORM_ANGLE, ROPE_LIMIT)).toBeGreaterThan(bestDist * 0.985);
  });

  it("rewards momentum: a bigger swing always jumps farther from the cue", () => {
    const dists = [50, 60, 70, 80, 85].map((a) => jumpDistance(PLATFORM_ANGLE, deg(a)));
    for (let i = 1; i < dists.length; i += 1) expect(dists[i]).toBeGreaterThan(dists[i - 1]);
  });

  it("punishes a badly timed release", () => {
    const good = jumpDistance(PLATFORM_ANGLE, ROPE_LIMIT);
    expect(jumpDistance(deg(8), ROPE_LIMIT)).toBeLessThan(good - 2);
    expect(jumpDistance(deg(78), ROPE_LIMIT)).toBeLessThan(good - 2);
  });

  it("places the release cue exactly at the platform's height", () => {
    expect(gripAt(PLATFORM_ANGLE).y).toBeCloseTo(PLATFORM_H, 6);
    expect(PLATFORM_H).toBeLessThan(PIVOT_H);
  });

  it("letting go on the backswing barely travels", () => {
    const back = computeJump(-deg(30), -angularSpeedAt(deg(30), ROPE_LIMIT));
    expect(back.distance).toBeLessThan(jumpDistance(PLATFORM_ANGLE, ROPE_LIMIT) / 3);
  });

  it("keeps amplitude and angular speed mutually consistent", () => {
    const amp = deg(70);
    const w = angularSpeedAt(deg(20), amp);
    expect(amplitudeOf(deg(20), w)).toBeCloseTo(amp, 6);
  });
});

describe("pumping", () => {
  it("pays most at the bottom, least at the ends, and never punishes placement", () => {
    // Where in the arc you shake is a bonus, not a cliff. Making it a penalty
    // meant only frame-perfect timing could grow the swing at all, and any human
    // rhythm shrank it — the whole thing was unplayable.
    const gainFrom = (thetaFraction) => {
      const rt = make();
      rt.startGame("normal");
      rt.skipIntro();
      const you = rt.jumpers[0];
      const amp = amplitudeOf(0, 1);
      you.theta = amp * thetaFraction;
      you.omega = angularSpeedAt(you.theta, amp);
      you.lastPumpMs = -Infinity;
      you.pumpArmedDir = 0;
      rt.pump(1);
      return amplitudeOf(you.theta, you.omega) - amp;
    };
    const atBottom = gainFrom(0);
    const nearEnd = gainFrom(0.95);
    expect(atBottom).toBeGreaterThan(nearEnd);
    expect(nearEnd).toBeGreaterThan(0);
  });

  it("only feeds the swing when thrown the way you're travelling", () => {
    const rt = make();
    rt.startGame("normal");
    rt.skipIntro();
    const you = rt.jumpers[0];

    // Sweeping the bottom forwards: ▶ feeds it, ◀ fights it.
    you.theta = 0;
    you.omega = 1;
    const before = amplitudeOf(you.theta, you.omega);
    expect(rt.pump(1)).toBeGreaterThan(0);
    expect(amplitudeOf(you.theta, you.omega)).toBeGreaterThan(before);

    you.theta = 0;
    you.omega = 1;
    you.lastPumpMs = -Infinity;
    you.pumpArmedDir = 0;
    const before2 = amplitudeOf(you.theta, you.omega);
    expect(rt.pump(-1)).toBeLessThan(0);
    expect(amplitudeOf(you.theta, you.omega)).toBeLessThan(before2);
  });

  it("scores only one shake per half-swing, so mashing cannot beat alternating", () => {
    const mash = make(9);
    const alternate = make(9);
    [mash, alternate].forEach((rt) => {
      rt.startGame("normal");
      rt.skipIntro();
    });
    for (let t = 0; t < 14000; t += 16) {
      mash.advanceTime(16);
      alternate.advanceTime(16);
      // One presses ▶ over and over; the other alternates with the arc.
      if (t % 304 === 0) mash.pump(1);
      const a = alternate.jumpers[0];
      if (Math.abs(a.theta) < 0.08) alternate.pump(a.omega >= 0 ? 1 : -1);
    }
    const ampOf = (rt) => amplitudeOf(rt.jumpers[0].theta, rt.jumpers[0].omega);
    expect(ampOf(alternate)).toBeGreaterThan(ampOf(mash) * 1.3);
  });

  it("makes pressing the same button twice a wasted pump", () => {
    const rt = make();
    rt.startGame("normal");
    rt.skipIntro();
    const you = rt.jumpers[0];
    // Forward through the bottom, then backward through it a half-swing later:
    // repeating ▶ necessarily fights the second pass.
    you.theta = 0;
    you.omega = 1;
    rt.pump(1);
    const afterFirst = amplitudeOf(you.theta, you.omega);
    you.theta = 0;
    you.omega = -Math.abs(you.omega);
    you.lastPumpMs = -Infinity;
    rt.pump(1);
    expect(amplitudeOf(you.theta, you.omega)).toBeLessThan(afterFirst);
  });

  it("ignores mashing inside the cooldown", () => {
    const rt = make();
    rt.startGame("normal");
    rt.skipIntro();
    const you = rt.jumpers[0];
    you.theta = 0;
    you.omega = 1;
    expect(rt.pump()).toBeGreaterThan(0);
    expect(rt.pump()).toBe(0);
  });

  it("puts no ceiling on the swing: keep pumping and it keeps growing", () => {
    const rt = make();
    rt.startGame("normal");
    rt.skipIntro();
    const you = rt.jumpers[0];
    // Well past the old artificial 85° cap, purely by pumping.
    const amps = [];
    for (let i = 0; i < 10; i += 1) {
      you.theta = 0;
      you.omega = Math.max(0.1, you.omega);
      you.lastPumpMs = -Infinity;
      you.pumpArmedDir = 0;
      rt.pump();
      amps.push(amplitudeOf(you.theta, you.omega));
    }
    for (let i = 1; i < amps.length; i += 1) expect(amps[i]).toBeGreaterThan(amps[i - 1]);
    expect(amps[amps.length - 1]).toBeGreaterThan(ROPE_LIMIT);
  });

  it("goes slack past horizontal instead of being clamped, and ruins the jump", () => {
    const rt = make();
    rt.startGame("normal");
    rt.skipIntro();
    const you = rt.jumpers[0];
    // Enough energy for a 100° swing: the rope cannot hold that.
    you.theta = 0;
    you.omega = angularSpeedAt(0, deg(100));
    rt.advanceTime(2000);
    expect(you.released).toBe(true);
    expect(you.slack).toBe(true);
    // A slack vine throws you up and back, nowhere near a real jump.
    expect(you.distance).toBeLessThan(jumpDistance(PLATFORM_ANGLE, ROPE_LIMIT) / 2);
  });

  it("keeps a swing at or under horizontal taut all the way round", () => {
    const rt = make();
    rt.startGame("normal");
    rt.skipIntro();
    const you = rt.jumpers[0];
    you.theta = 0;
    you.omega = angularSpeedAt(0, deg(88));
    rt.advanceTime(9000); // two full swings' worth
    expect(you.slack).toBe(false);
  });
});

describe("rankJumpers", () => {
  it("ranks by distance and awards placement points", () => {
    const ranked = rankJumpers([
      { id: "a", distance: 12 },
      { id: "b", distance: 18 },
      { id: "c", distance: 4 },
      { id: "d", distance: 9 },
    ]);
    const byId = Object.fromEntries(ranked.map((r) => [r.id, r]));
    expect(byId.b.rank).toBe(0);
    expect(byId.b.points).toBe(5);
    expect(byId.a.points).toBe(3);
    expect(byId.d.points).toBe(2);
    expect(byId.c.points).toBe(1);
  });

  it("shares the better placement on a tie", () => {
    const ranked = rankJumpers([
      { id: "a", distance: 10 },
      { id: "b", distance: 10 },
    ]);
    expect(ranked.every((r) => r.rank === 0 && r.points === 5)).toBe(true);
  });
});

describe("match flow", () => {
  it("plays three rounds and then shows the standings", () => {
    const rt = make(99);
    rt.startGame("normal");
    for (let r = 1; r <= ROUNDS; r += 1) {
      expect(rt.snapshot().round).toBe(r);
      swingAndJump(rt);
      expect(rt.snapshot().screen).toBe("reveal");
      expect(rt.snapshot().lastRound).toHaveLength(4);
      rt.nextRound();
    }
    const snap = rt.snapshot();
    expect(snap.screen).toBe("gameover");
    expect(snap.standings).toHaveLength(4);
    // 5+3+2+1 per round at minimum; exact ties share the better placement.
    expect(snap.standings.reduce((a, s) => a + s.total, 0)).toBeGreaterThanOrEqual(11 * ROUNDS);
    expect(snap.standings.every((s) => s.total >= ROUNDS)).toBe(true);
  });

  it("forces everyone off the vine when the round clock runs out", () => {
    const rt = make(7);
    rt.startGame("facil");
    rt.skipIntro();
    rt.advanceTime(SWING_TIME_MS + 8000);
    expect(rt.snapshot().screen).toBe("reveal");
    expect(rt.jumpers[0].forced).toBe(true);
  });

  it("is fully reproducible from a seed", () => {
    const a = make(2026);
    const b = make(2026);
    a.startGame("dificil");
    b.startGame("dificil");
    swingAndJump(a);
    swingAndJump(b);
    expect(a.snapshot().lastRound.map((r) => r.distance)).toEqual(
      b.snapshot().lastRound.map((r) => r.distance),
    );
  });

  it("makes the rivals jump farther as the difficulty rises", () => {
    const rivalAverage = (level) => {
      let total = 0;
      let n = 0;
      for (let seed = 1; seed <= 6; seed += 1) {
        const rt = make(seed * 31);
        rt.startGame(level);
        swingAndJump(rt);
        rt.snapshot().lastRound.filter((r) => !r.isPlayer).forEach((r) => {
          total += r.distance;
          n += 1;
        });
      }
      return total / n;
    };
    const easy = rivalAverage("facil");
    const normal = rivalAverage("normal");
    const hard = rivalAverage("dificil");
    expect(normal).toBeGreaterThan(easy);
    expect(hard).toBeGreaterThan(normal);
  });

  it("punishes greed: pumping past the rope's limit throws the round away", () => {
    const patient = make(321);
    patient.startGame("facil");
    const good = swingAndJump(patient, { armAfterMs: 14000 });

    const greedy = make(321);
    greedy.startGame("facil");
    const blown = swingAndJump(greedy, { armAfterMs: 30000 });

    expect(greedy.jumpers[0].slack).toBe(true);
    expect(blown).toBeLessThan(good / 2);
  });

  it("a well-timed human swing beats the easy rivals", () => {
    const rt = make(555);
    rt.startGame("facil");
    const mine = swingAndJump(rt);
    const rivals = rt.snapshot().lastRound.filter((r) => !r.isPlayer);
    expect(mine).toBeGreaterThan(Math.max(...rivals.map((r) => r.distance)));
  });
});
