import { describe, expect, it } from "vitest";
import { MOVES, blindOdds, levelConfig } from "./levels.js";

const RANGE = Array.from({ length: 40 }, (_, i) => i + 1);

describe("shell game levels — the curve only ever climbs", () => {
  it("never gets easier as the level rises", () => {
    let prev = levelConfig(1);
    for (const level of RANGE.slice(1)) {
      const cur = levelConfig(level);
      expect(cur.cups).toBeGreaterThanOrEqual(prev.cups);
      expect(cur.swapCount).toBeGreaterThanOrEqual(prev.swapCount);
      // Shorter duration = faster cross.
      expect(cur.swapDuration).toBeLessThanOrEqual(prev.swapDuration + 1e-9);
      expect(cur.moves.length).toBeGreaterThanOrEqual(prev.moves.length);
      prev = cur;
    }
  });

  it("phases the moves in one at a time rather than all at once", () => {
    // The whole point of the bands: a round that gains speed, length, a cup and
    // a new move together stops being readable.
    expect(levelConfig(1).moves).toEqual([MOVES.SLIDE]);
    expect(levelConfig(6).moves).toContain(MOVES.ARC);
    expect(levelConfig(6).moves).not.toContain(MOVES.CIRCLE);
    expect(levelConfig(12).moves).toContain(MOVES.CIRCLE);
    expect(levelConfig(12).moves).not.toContain(MOVES.DOUBLE);
    expect(levelConfig(18).moves).toContain(MOVES.DOUBLE);
  });

  it("opens with three cups and tops out at five", () => {
    expect(levelConfig(1).cups).toBe(3);
    expect(levelConfig(5).cups).toBe(4);
    expect(levelConfig(20).cups).toBe(5);
    expect(levelConfig(500).cups).toBe(5);
  });

  it("puts five cups within reach of a real game", () => {
    // With three lives, a fifth cup that only appears at level 15 is content
    // almost nobody ever sees. It arrives at 10, still after the full four-cup
    // curve has been played through.
    expect(levelConfig(9).cups).toBe(4);
    expect(levelConfig(10).cups).toBe(5);
  });

  it("adds the fifth cup on its own, changing nothing else with it", () => {
    // The band rule: one new thing at a time. The cup is the new thing, so the
    // round it debuts in runs at the speed and length of the one before it.
    const last4 = levelConfig(9);
    const first5 = levelConfig(10);
    expect(first5.cups).toBe(last4.cups + 1);
    expect(first5.swapCount).toBe(last4.swapCount);
    expect(first5.swapDuration).toBeCloseTo(last4.swapDuration, 6);
    expect(first5.moves).toEqual(last4.moves);
  });

  it("settles instead of drifting into the impossible", () => {
    // Past the top the numbers hold, so level 60 is hard, not a blur.
    expect(levelConfig(200)).toEqual({ ...levelConfig(25), level: 200 });
    expect(levelConfig(500).swapDuration).toBeGreaterThan(0.1);
  });

  it("is total — any junk level still yields a playable round", () => {
    for (const bad of [0, -5, 1.7, NaN, undefined]) {
      const cfg = levelConfig(bad);
      expect(cfg.cups).toBeGreaterThanOrEqual(3);
      expect(cfg.swapCount).toBeGreaterThan(0);
      expect(cfg.swapDuration).toBeGreaterThan(0);
      expect(cfg.moves.length).toBeGreaterThan(0);
    }
  });

  it("reports the blind odds the player is actually facing", () => {
    expect(blindOdds(1)).toBeCloseTo(1 / 3, 6);
    expect(blindOdds(6)).toBeCloseTo(1 / 4, 6);
    expect(blindOdds(20)).toBeCloseTo(1 / 5, 6);
  });

  it("keeps the overlap short enough to stay inside a cross", () => {
    // Overlap buys pace, but a cross that starts before the previous one is
    // halfway would read as a scramble even with the disjointness rule.
    for (const level of RANGE) {
      const cfg = levelConfig(level);
      expect(cfg.overlap).toBeGreaterThanOrEqual(0);
      expect(cfg.overlap).toBeLessThan(cfg.swapDuration * 0.6);
    }
  });
});
