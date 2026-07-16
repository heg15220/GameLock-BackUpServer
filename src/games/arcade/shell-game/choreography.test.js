import { describe, expect, it } from "vitest";
import {
  cupSlotAt,
  makeRng,
  overlappingPairs,
  planShuffle,
  replay,
} from "./choreography.js";
import { MOVES, levelConfig } from "./levels.js";

// Every band, plus the open-ended top, exercised over many seeds.
const LEVELS = [1, 2, 3, 4, 6, 8, 9, 12, 14, 15, 18, 22, 25, 30, 60];
const plansFor = (level, count = 40) =>
  Array.from({ length: count }, (_, i) => planShuffle(level, makeRng(level * 1000 + i)));
const allPlans = () => LEVELS.flatMap((l) => plansFor(l));

describe("shell game choreography — the fairness contract", () => {
  it("ends the ball where it says it does, on every level and seed", () => {
    // The one bug that would actually break the game: scoring a slot the ball
    // never arrived at. Replaying the plan independently of the bookkeeping that
    // built it is what catches it.
    for (const plan of allPlans()) {
      expect(replay(plan).indexOf(plan.ballCup)).toBe(plan.finalBallSlot);
    }
  });

  it("puts the ball's cup on the answer at the end of the shuffle", () => {
    // Same claim, but through the path the scene actually renders from — so the
    // ball the player watches and the slot the game scores cannot drift apart.
    for (const plan of allPlans()) {
      const end = cupSlotAt(plan, plan.ballCup, plan.totalDuration);
      expect(end.slot).toBe(plan.finalBallSlot);
      expect(end.swap).toBe(null);
    }
  });

  it("starts the ball's cup on the slot it was shown under", () => {
    for (const plan of allPlans()) {
      expect(cupSlotAt(plan, plan.ballCup, 0).slot).toBe(plan.ballSlot);
    }
  });

  it("always moves the ball at least once — a round where it sits still is not a shuffle", () => {
    for (const plan of allPlans()) {
      expect(plan.swaps.some((s) => s.cups.includes(plan.ballCup))).toBe(true);
    }
  });
});

describe("shell game choreography — the legibility contract", () => {
  it("never lets two crosses that overlap in time share a cup", () => {
    // This is what stops a cup being in two places at once, and it is also why
    // the final slot is well defined: disjoint overlaps commute.
    for (const plan of allPlans()) {
      for (const [a, b] of overlappingPairs(plan)) {
        expect(a.slots.filter((s) => b.slots.includes(s))).toEqual([]);
      }
    }
  });

  it("moves every cup continuously — nothing teleports", () => {
    for (const plan of plansFor(18, 12)) {
      for (let cup = 0; cup < plan.cups; cup++) {
        const step = 1 / 120;
        let prev = cupSlotAt(plan, cup, 0).slot;
        for (let t = step; t <= plan.totalDuration + step; t += step) {
          const now = cupSlotAt(plan, cup, t).slot;
          // A cup crosses at most one slot-width per frame at these durations;
          // anything larger is a jump the eye cannot follow.
          expect(Math.abs(now - prev)).toBeLessThan(0.5);
          prev = now;
        }
      }
    }
  });

  it("keeps the table a valid permutation — one cup per slot, always", () => {
    for (const plan of allPlans()) {
      const cupAt = replay(plan);
      expect([...cupAt].sort((a, b) => a - b)).toEqual(
        Array.from({ length: plan.cups }, (_, i) => i),
      );
    }
  });

  it("never overlaps a cross with itself or runs one before time zero", () => {
    for (const plan of allPlans()) {
      for (const s of plan.swaps) {
        expect(s.at).toBeGreaterThanOrEqual(0);
        expect(s.duration).toBeGreaterThan(0);
      }
    }
  });
});

describe("shell game choreography — shape of a round", () => {
  it("stages the number of crosses the level asks for", () => {
    for (const level of LEVELS) {
      const cfg = levelConfig(level);
      for (const plan of plansFor(level, 10)) {
        expect(plan.swaps.length).toBe(cfg.swapCount);
        expect(plan.cups).toBe(cfg.cups);
      }
    }
  });

  it("only uses moves the level has unlocked", () => {
    for (const level of LEVELS) {
      const cfg = levelConfig(level);
      for (const plan of plansFor(level, 10)) {
        for (const s of plan.swaps) {
          // A double is staged as two simultaneous slides.
          const type = s.double ? MOVES.DOUBLE : s.type;
          expect(cfg.moves).toContain(type === MOVES.DOUBLE ? MOVES.DOUBLE : s.type);
        }
      }
    }
  });

  it("keeps the early levels to plain slides", () => {
    for (const plan of plansFor(1, 20)) {
      for (const s of plan.swaps) {
        expect(s.type).toBe(MOVES.SLIDE);
        expect(s.double).toBe(false);
      }
    }
  });

  it("stages true simultaneous doubles once they unlock", () => {
    const doubles = plansFor(20, 30).flatMap((p) => p.swaps.filter((s) => s.double));
    expect(doubles.length).toBeGreaterThan(0);
    // Both halves of a double share a start time — that is the whole point.
    for (const plan of plansFor(20, 30)) {
      const pairs = plan.swaps.filter((s) => s.double);
      for (const s of pairs) {
        expect(plan.swaps.some((o) => o !== s && o.double && o.at === s.at)).toBe(true);
      }
    }
  });

  it("is deterministic for a given seed", () => {
    expect(planShuffle(12, makeRng(42))).toEqual(planShuffle(12, makeRng(42)));
  });

  it("is not the same round twice for different seeds", () => {
    const a = planShuffle(12, makeRng(1));
    const b = planShuffle(12, makeRng(2));
    expect(a).not.toEqual(b);
  });
});
