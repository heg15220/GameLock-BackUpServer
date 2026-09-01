import { describe, expect, it } from "vitest";
import {
  LaCombaRuntime,
  MISSES_TO_TRIP,
  ROUND_MS,
  TRIP_RECOVER_MS,
  TUNING,
  beatDurationFor,
  judge,
} from "./runtime.js";

function fresh(difficulty = "normal") {
  const rt = new LaCombaRuntime({});
  rt.startRound(difficulty);
  return rt;
}

/** Turn the rope exactly on the beat, `n` times. */
function turnOnBeat(rt, n) {
  for (let i = 0; i < n; i += 1) {
    // Land right at the start of the next turn.
    rt.advanceTime(rt.beatMs - rt.phaseMs);
    rt.turn();
  }
}

describe("beatDurationFor", () => {
  it("speeds the rope up as the jumps pile on, then holds", () => {
    const start = beatDurationFor("normal", 0);
    const mid = beatDurationFor("normal", 15);
    const end = beatDurationFor("normal", TUNING.normal.rampJumps);
    expect(start).toBe(TUNING.normal.startMs);
    expect(mid).toBeLessThan(start);
    expect(end).toBe(TUNING.normal.endMs);
    // Past the ramp it must not keep accelerating into the impossible.
    expect(beatDurationFor("normal", 500)).toBe(TUNING.normal.endMs);
  });

  it("is harder on every step of the difficulty ladder", () => {
    expect(beatDurationFor("dificil", 0)).toBeLessThan(beatDurationFor("normal", 0));
    expect(beatDurationFor("normal", 0)).toBeLessThan(beatDurationFor("facil", 0));
  });
});

describe("judge", () => {
  it("grades by how far off the beat you were, either side", () => {
    expect(judge("normal", 0)).toBe("perfect");
    expect(judge("normal", -TUNING.normal.perfectMs + 1)).toBe("perfect");
    expect(judge("normal", TUNING.normal.perfectMs + 10)).toBe("good");
    expect(judge("normal", -TUNING.normal.goodMs - 10)).toBe("miss");
  });

  it("gives the easy tier a wider window than the hard one", () => {
    const off = TUNING.dificil.goodMs + 5;
    expect(judge("dificil", off)).toBe("miss");
    expect(judge("facil", off)).not.toBe("miss");
  });
});

describe("LaCombaRuntime", () => {
  it("starts on the menu and only counts jumps once running", () => {
    const rt = new LaCombaRuntime({});
    expect(rt.snapshot().screen).toBe("menu");
    rt.turn();
    expect(rt.snapshot().jumps).toBe(0);
  });

  it("scores a jump for a turn landed on the beat", () => {
    const rt = fresh();
    turnOnBeat(rt, 1);
    const snap = rt.snapshot();
    expect(snap.jumps).toBe(1);
    expect(snap.combo).toBe(1);
    expect(snap.lastJudge.kind).toBe("perfect");
  });

  it("refuses to count two turns on the same swing of the rope", () => {
    const rt = fresh();
    turnOnBeat(rt, 1);
    rt.turn();
    rt.turn();
    expect(rt.snapshot().jumps).toBe(1);
  });

  it("gives the opening turn of the rope for free", () => {
    const rt = fresh();
    rt.advanceTime(rt.beatMs * 1.02);
    expect(rt.snapshot().lastJudge).toBeNull();
    expect(rt.snapshot().sync).toBe(1);
  });

  it("does not score a turn taken well off the beat", () => {
    const rt = fresh();
    // Land in the dead middle of the turn, as far from either beat as possible.
    rt.advanceTime(rt.beatMs / 2);
    rt.turn();
    expect(rt.snapshot().jumps).toBe(0);
    expect(rt.snapshot().lastJudge.kind).toBe("miss");
  });

  it("counts a turn of the rope that nobody marked as a miss", () => {
    const rt = fresh();
    // Past the free opening turn, an unmarked swing is a miss.
    rt.advanceTime(rt.beatMs * 1.05);
    rt.advanceTime(rt.beatMs);
    const snap = rt.snapshot();
    expect(snap.jumps).toBe(0);
    expect(snap.combo).toBe(0);
    expect(snap.lastJudge.kind).toBe("miss");
  });

  it("trips somebody after three misses in a row and stops the rope", () => {
    const rt = fresh();
    for (let i = 0; i < MISSES_TO_TRIP; i += 1) {
      rt.advanceTime(rt.beatMs / 2);
      rt.turn();
      rt.advanceTime(rt.beatMs / 2 + 1);
    }
    const snap = rt.snapshot();
    expect(snap.trips).toBeGreaterThanOrEqual(1);
    expect(snap.recovering).toBe(true);
    expect(snap.sync).toBe(0);
  });

  it("ignores turns while the rope is being picked back up, then resumes", () => {
    const rt = fresh();
    for (let i = 0; i < MISSES_TO_TRIP; i += 1) {
      rt.advanceTime(rt.beatMs / 2);
      rt.turn();
      rt.advanceTime(rt.beatMs / 2 + 1);
    }
    expect(rt.snapshot().recovering).toBe(true);
    const before = rt.snapshot().jumps;
    rt.turn();
    expect(rt.snapshot().jumps).toBe(before);
    rt.advanceTime(TRIP_RECOVER_MS + 10);
    expect(rt.snapshot().recovering).toBe(false);
    turnOnBeat(rt, 1);
    expect(rt.snapshot().jumps).toBe(before + 1);
  });

  it("a trip still costs clock time — that is what makes it hurt", () => {
    const rt = fresh();
    const before = rt.snapshot().secondsLeft;
    for (let i = 0; i < MISSES_TO_TRIP; i += 1) {
      rt.advanceTime(rt.beatMs / 2);
      rt.turn();
      rt.advanceTime(rt.beatMs / 2 + 1);
    }
    rt.advanceTime(TRIP_RECOVER_MS);
    expect(rt.snapshot().secondsLeft).toBeLessThan(before);
  });

  it("rebuilds sync with good turns and loses it with misses", () => {
    const rt = fresh();
    rt.advanceTime(rt.beatMs / 2);
    rt.turn();
    const low = rt.snapshot().sync;
    expect(low).toBeLessThan(1);
    rt.advanceTime(rt.beatMs / 2 + 1);
    turnOnBeat(rt, 4);
    expect(rt.snapshot().sync).toBeGreaterThan(low);
  });

  it("wins on reaching the target and records the run", () => {
    const rt = fresh("facil");
    turnOnBeat(rt, TUNING.facil.target);
    const snap = rt.snapshot();
    expect(snap.screen).toBe("won");
    expect(snap.jumps).toBe(TUNING.facil.target);
    expect(snap.bestJumps).toBeGreaterThanOrEqual(TUNING.facil.target);
  });

  it("loses when the clock runs out short of the target", () => {
    const rt = fresh();
    rt.advanceTime(ROUND_MS + 10);
    expect(rt.snapshot().screen).toBe("lost");
    expect(rt.snapshot().jumps).toBeLessThan(TUNING.normal.target);
  });

  it("holds the beat and the clock while paused", () => {
    const rt = fresh();
    turnOnBeat(rt, 2);
    const before = rt.snapshot();
    rt.togglePause();
    rt.advanceTime(30000);
    const during = rt.snapshot();
    expect(during.screen).toBe("playing");
    expect(during.secondsLeft).toBe(before.secondsLeft);
    expect(during.jumps).toBe(before.jumps);
  });

  it("keeps the rope phase inside one turn no matter how big the step", () => {
    const rt = fresh();
    rt.advanceTime(9999);
    const phase = rt.snapshot().ropePhase;
    expect(phase).toBeGreaterThanOrEqual(0);
    expect(phase).toBeLessThan(1);
  });
});
