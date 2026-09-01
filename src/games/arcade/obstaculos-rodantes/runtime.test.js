import { describe, expect, it } from "vitest";
import {
  ObstaculosRuntime,
  BASE_SPEED,
  START_SPEED,
  JUMP_V,
  MAX_HEIGHT,
  GRAVITY,
  MAX_HOVERS,
  OBSTACLE,
  RUNNER_COUNT,
  STUMBLE_MS,
  TRACK_M,
  buildTrack,
  clears,
} from "./runtime.js";

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fresh(difficulty = "normal", seed = 12) {
  const rt = new ObstaculosRuntime({ seed });
  rt.startRace(difficulty);
  return rt;
}

/** Advance in realistic frames rather than one giant step. */
function run(rt, ms) {
  let left = ms;
  while (left > 0) {
    const step = Math.min(16, left);
    rt.advanceTime(step);
    left -= step;
  }
}

describe("buildTrack", () => {
  it("keeps the obstacles on the bridge and in order", () => {
    for (const difficulty of ["facil", "normal", "dificil"]) {
      const track = buildTrack(mulberry32(9), difficulty);
      expect(track.length).toBeGreaterThan(5);
      for (const [i, o] of track.entries()) {
        expect(o.pos).toBeGreaterThan(0);
        expect(o.pos).toBeLessThan(TRACK_M);
        if (i > 0) expect(o.pos).toBeGreaterThan(track[i - 1].pos);
      }
    }
  });

  it("packs them tighter on every step up in difficulty", () => {
    const gapOf = (difficulty) => {
      const track = buildTrack(mulberry32(5), difficulty);
      const gaps = track.slice(1).map((o, i) => o.pos - track[i].pos);
      return gaps.reduce((a, b) => a + b, 0) / gaps.length;
    };
    expect(gapOf("dificil")).toBeLessThan(gapOf("normal"));
    expect(gapOf("normal")).toBeLessThan(gapOf("facil"));
  });
});

describe("clears", () => {
  it("lets a low skim beat a log but never a barrel", () => {
    const justOverLog = OBSTACLE.log.height + 0.01;
    expect(clears(OBSTACLE.log, justOverLog)).toBe(true);
    expect(clears(OBSTACLE.barrel, justOverLog)).toBe(false);
    expect(clears(OBSTACLE.barrel, OBSTACLE.barrel.height + 0.01)).toBe(true);
  });
});

describe("ObstaculosRuntime", () => {
  it("starts on the menu with everybody on the line", () => {
    const rt = new ObstaculosRuntime({ seed: 1 });
    const snap = rt.snapshot();
    expect(snap.screen).toBe("menu");
    expect(snap.runners).toHaveLength(RUNNER_COUNT);
    expect(snap.runners.every((r) => r.dist === 0)).toBe(true);
  });

  it("a jump rises and comes back down on its own", () => {
    const rt = fresh();
    rt.jump();
    expect(rt.snapshot().you.airborne).toBe(true);
    run(rt, 100);
    const peakish = rt.snapshot().you.y;
    expect(peakish).toBeGreaterThan(0);
    run(rt, 1200);
    expect(rt.snapshot().you.y).toBe(0);
    expect(rt.snapshot().you.airborne).toBe(false);
  });

  it("spends enough track above barrel height to clear one but not two", () => {
    // The window is what makes a lone obstacle fair and a tight pair a decision.
    // y(t) = v.t - (g/2)t^2 sits above H between the roots of (g/2)t^2 - v.t + H,
    // so the time spent up there is 2*sqrt(v^2 - 2gH)/g.
    const g = GRAVITY;
    const H = OBSTACLE.barrel.height;
    const spanSeconds = (2 * Math.sqrt(JUMP_V * JUMP_V - 2 * g * H)) / g;
    const spanMetres = spanSeconds * BASE_SPEED;
    expect(spanMetres).toBeGreaterThan(2.4);
    expect(spanMetres).toBeLessThan(3.8);
  });

  it("clears a lone barrel with a single well-timed jump", () => {
    const rt = fresh();
    // One barrel dead ahead and nothing else on the bridge.
    rt.obstacles = [{ pos: 12, kind: "barrel", ...OBSTACLE.barrel }];
    for (const runner of rt.runners) runner.nextObstacle = 0;
    // The obstacle rolls toward the field, so time the jump from live closing
    // distance rather than assuming a static marker and constant run speed.
    while (rt.obstacles[0].pos - rt.runners[0].dist > 2.8) run(rt, 16);
    rt.jump();
    run(rt, 900);
    expect(rt.snapshot().hits).toBe(0);
  });

  it("hits the barrel when you never jump", () => {
    const rt = fresh();
    rt.obstacles = [{ pos: 12, kind: "barrel", ...OBSTACLE.barrel }];
    for (const runner of rt.runners) runner.nextObstacle = 0;
    while (rt.snapshot().hits === 0) run(rt, 16);
    expect(rt.snapshot().hits).toBe(1);
    expect(rt.snapshot().you.stumbling).toBe(true);
  });

  it("mid-air presses buy hang time, and only a limited number of them", () => {
    const rt = fresh();
    rt.jump();
    expect(rt.snapshot().you.hoversLeft).toBe(MAX_HOVERS);
    run(rt, 200);
    const withoutHover = rt.snapshot().you.y;

    const rt2 = fresh();
    rt2.jump();
    run(rt2, 200);
    rt2.jump();
    run(rt2, 60);
    expect(rt2.snapshot().you.y).toBeGreaterThan(withoutHover);

    // Each hover is a separate physical impulse with a short cooldown; rapid
    // auto-repeat cannot spend the whole allowance in one simulation instant.
    expect(rt2.snapshot().you.hoversLeft).toBe(MAX_HOVERS - 1);
    for (let i = 0; i < 40 && rt2.snapshot().you.airborne; i += 1) {
      run(rt2, 50);
      if (rt2.snapshot().you.hoverCooldownMs <= 0 && rt2.snapshot().you.y < MAX_HEIGHT) rt2.jump();
    }
    expect(rt2.snapshot().you.hoversLeft).toBe(0);
    expect(rt2.snapshot().you.y).toBeLessThanOrEqual(MAX_HEIGHT);
  });

  it("never lets mashing fly above the ceiling", () => {
    const rt = fresh();
    rt.jump();
    for (let i = 0; i < 100; i += 1) {
      rt.jump();
      run(rt, 16);
    }
    expect(rt.snapshot().you.y).toBeLessThanOrEqual(MAX_HEIGHT);
  });

  it("a stumble costs speed for the advertised time", () => {
    const rt = fresh();
    rt.obstacles = [{ pos: 5, kind: "barrel", ...OBSTACLE.barrel }];
    for (const runner of rt.runners) runner.nextObstacle = 0;
    run(rt, 700);
    expect(rt.snapshot().you.stumbling).toBe(true);
    const hitDist = rt.snapshot().you.dist;
    run(rt, STUMBLE_MS + 40);
    expect(rt.snapshot().you.stumbling).toBe(false);
    // It moved, but far less than a clean run would have.
    const moved = rt.snapshot().you.dist - hitDist;
    expect(moved).toBeLessThan(BASE_SPEED * (STUMBLE_MS / 1000));
  });

  it("accelerates continuously and loses momentum on impact", () => {
    const rt = fresh();
    rt.obstacles = [{ pos: 9, kind: "barrel", ...OBSTACLE.barrel }];
    for (const runner of rt.runners) runner.nextObstacle = 0;
    expect(rt.snapshot().you.speed).toBe(START_SPEED);
    run(rt, 300);
    expect(rt.snapshot().you.speed).toBeGreaterThan(START_SPEED);
    while (rt.snapshot().hits === 0) run(rt, 16);
    expect(rt.snapshot().you.speed).toBeLessThan(BASE_SPEED * 0.5);
  });

  it("rolls obstacles toward the runners while preserving their order", () => {
    const rt = fresh();
    const before = rt.obstacles.map((obstacle) => obstacle.pos);
    run(rt, 500);
    rt.obstacles.forEach((obstacle, index) => {
      expect(obstacle.pos).toBeLessThan(before[index]);
      if (index > 0) expect(obstacle.pos).toBeGreaterThan(rt.obstacles[index - 1].pos);
    });
  });

  it("cannot jump before the race or after finishing", () => {
    const rt = new ObstaculosRuntime({ seed: 3 });
    rt.jump();
    expect(rt.snapshot().you.airborne).toBe(false);
    rt.startRace("facil");
    rt.runners[0].dist = TRACK_M;
    run(rt, 40);
    expect(["won", "lost"]).toContain(rt.snapshot().screen);
    const before = rt.snapshot().you.y;
    rt.jump();
    expect(rt.snapshot().you.y).toBe(before);
  });

  it("finishes the race and hands out a placement", () => {
    const rt = fresh("facil");
    run(rt, 30000);
    const snap = rt.snapshot();
    expect(["won", "lost"]).toContain(snap.screen);
    expect(snap.placement).toBeGreaterThanOrEqual(1);
    expect(snap.placement).toBeLessThanOrEqual(RUNNER_COUNT);
    for (const runner of snap.runners) expect(runner.dist).toBeLessThanOrEqual(TRACK_M);
  });

  it("holds the race while paused", () => {
    const rt = fresh();
    run(rt, 500);
    const before = rt.snapshot().you.dist;
    rt.togglePause();
    run(rt, 5000);
    expect(rt.snapshot().you.dist).toBe(before);
    rt.togglePause();
    run(rt, 500);
    expect(rt.snapshot().you.dist).toBeGreaterThan(before);
  });

  it("runs the same race twice from the same seed", () => {
    const play = () => {
      const rt = new ObstaculosRuntime({ seed: 404 });
      rt.startRace("normal");
      for (let i = 0; i < 600; i += 1) {
        if (i % 17 === 0) rt.jump();
        rt.advanceTime(16);
      }
      const s = rt.snapshot();
      return `${s.screen}:${s.hits}:${Math.round(s.you.dist * 100)}`;
    };
    expect(play()).toBe(play());
  });

  it("is winnable on normal by a player who jumps well and not by one who never does", () => {
    // A perfect player jumps at the right distance before every obstacle; a
    // passive one never presses. The gap between them is the game.
    const simulate = (perfect) => {
      let wins = 0;
      for (let seed = 0; seed < 30; seed += 1) {
        const rt = new ObstaculosRuntime({ seed });
        rt.startRace("normal");
        for (let i = 0; i < 1500 && rt.snapshot().screen === "racing"; i += 1) {
          if (perfect) {
            const you = rt.runners[0];
            const next = rt.obstacles[you.nextObstacle];
            if (next && !you.airborne && next.pos - you.dist < 2.7) rt.jump();
            else if (next && you.airborne && next.pos - you.dist < 1.6) rt.jump();
          }
          rt.advanceTime(16);
        }
        if (rt.snapshot().screen === "won") wins += 1;
      }
      return wins;
    };
    const good = simulate(true);
    const passive = simulate(false);
    expect(good).toBeGreaterThan(passive);
    expect(good).toBeGreaterThan(15);
  });
});
