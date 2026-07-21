import { describe, expect, it } from "vitest";
import {
  PulsoExactoRuntime,
  scoreForError,
  ratingKeyForTotal,
  ROUNDS,
  GUIDE_MS,
  MIN_TARGET_MS,
  MAX_TARGET_MS,
} from "./runtime.js";

function makeRuntime(seed = 12345) {
  return new PulsoExactoRuntime({ seed });
}

// Drive a single round to a chosen stop time (ms) from a `ready` runtime.
function playRound(rt, stopAtMs) {
  const target = rt.snapshot().targetSeconds * 1000;
  rt.beginRoundClock();
  rt.advanceTime(stopAtMs);
  if (rt.snapshot().screen === "running") rt.stopClock();
  return target;
}

describe("scoreForError", () => {
  it("gives a perfect score within 0.10s either side", () => {
    expect(scoreForError(0)).toBe(1000);
    expect(scoreForError(100)).toBe(1000);
    expect(scoreForError(-100)).toBe(1000);
  });

  it("scales linearly across the 3s window", () => {
    expect(scoreForError(1500)).toBe(500);
    expect(scoreForError(-1500)).toBe(500);
    expect(scoreForError(600)).toBe(800);
  });

  it("scores nothing beyond 3s", () => {
    expect(scoreForError(3000)).toBe(0);
    expect(scoreForError(9999)).toBe(0);
  });
});

describe("ratingKeyForTotal", () => {
  it("maps totals to tiers", () => {
    expect(ratingKeyForTotal(5000)).toBe("swiss");
    expect(ratingKeyForTotal(4500)).toBe("swiss");
    expect(ratingKeyForTotal(3600)).toBe("master");
    expect(ratingKeyForTotal(2600)).toBe("steady");
    expect(ratingKeyForTotal(1600)).toBe("warming");
    expect(ratingKeyForTotal(0)).toBe("practice");
  });
});

describe("target generation", () => {
  it("always sits inside the 5s–60s band, quantised to 0.1s", () => {
    const rt = makeRuntime(999);
    rt.startGame();
    for (let i = 0; i < 40; i += 1) {
      const target = rt.snapshot().targetSeconds * 1000;
      expect(target).toBeGreaterThanOrEqual(MIN_TARGET_MS);
      expect(target).toBeLessThanOrEqual(MAX_TARGET_MS);
      expect(Math.round(target) % 100).toBe(0);
      // advance to the next round without scoring specifics
      rt.beginRoundClock();
      rt.advanceTime(target);
      rt.stopClock();
      rt.nextRound();
      if (rt.snapshot().screen === "gameover") rt.startGame();
    }
  });

  it("is reproducible from a seed", () => {
    const a = makeRuntime(42);
    const b = makeRuntime(42);
    a.startGame();
    b.startGame();
    expect(a.snapshot().targetSeconds).toBe(b.snapshot().targetSeconds);
  });
});

describe("round flow", () => {
  it("awards a perfect stop landing exactly on target", () => {
    const rt = makeRuntime();
    rt.startGame();
    playRound(rt, rt.snapshot().targetSeconds * 1000);
    const snap = rt.snapshot();
    expect(snap.screen).toBe("result");
    expect(snap.lastResult.perfect).toBe(true);
    expect(snap.lastResult.points).toBe(1000);
    expect(snap.totalScore).toBe(1000);
  });

  it("scores partial credit for being 1.5s late", () => {
    const rt = makeRuntime();
    rt.startGame();
    const target = playRound(rt, rt.snapshot().targetSeconds * 1000 + 1500);
    const snap = rt.snapshot();
    expect(snap.lastResult.points).toBe(500);
    expect(snap.lastResult.errorSeconds).toBeCloseTo(1.5, 5);
    expect(target).toBeGreaterThan(0);
  });

  it("hides the clock after the 2s guide window", () => {
    const rt = makeRuntime();
    rt.startGame();
    rt.beginRoundClock();
    rt.advanceTime(GUIDE_MS - 500);
    expect(rt.snapshot().clockVisible).toBe(true);
    rt.advanceTime(1000);
    expect(rt.snapshot().clockVisible).toBe(false);
  });

  it("ends after the fixed number of rounds and accumulates score", () => {
    const rt = makeRuntime();
    rt.startGame();
    for (let i = 0; i < ROUNDS; i += 1) {
      expect(rt.snapshot().screen).toBe("ready");
      playRound(rt, rt.snapshot().targetSeconds * 1000); // perfect each time
      rt.nextRound();
    }
    const snap = rt.snapshot();
    expect(snap.screen).toBe("gameover");
    expect(snap.totalScore).toBe(ROUNDS * 1000);
    expect(snap.ratingKey).toBe("swiss");
  });

  it("auto-resolves a round left running well past the target", () => {
    const rt = makeRuntime();
    rt.startGame();
    const target = rt.snapshot().targetSeconds * 1000;
    rt.beginRoundClock();
    rt.advanceTime(target + 60000); // never stopped by the player
    const snap = rt.snapshot();
    expect(snap.screen).toBe("result");
    expect(snap.lastResult.points).toBe(0);
  });
});

describe("input routing", () => {
  it("routes Space through the state machine", () => {
    const rt = makeRuntime();
    expect(rt.snapshot().screen).toBe("menu");
    rt.pressVirtualKey("Space"); // menu -> ready
    expect(rt.snapshot().screen).toBe("ready");
    rt.pressVirtualKey("Space"); // ready -> running
    expect(rt.snapshot().screen).toBe("running");
    rt.advanceTime(rt.snapshot().targetSeconds * 1000);
    rt.pressVirtualKey("Space"); // running -> result
    expect(rt.snapshot().screen).toBe("result");
  });
});
