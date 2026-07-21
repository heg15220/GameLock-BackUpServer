import { describe, it, expect } from "vitest";
import {
  createHoles,
  createMole,
  stepMole,
  isWhackable,
  moleValue,
  pickMoleType,
  makeRng,
  GRID_COLS,
  GRID_ROWS,
  POP_HEIGHT,
  RISE_MS,
} from "./moles.js";

describe("createHoles", () => {
  it("builds a full grid of holes with world positions", () => {
    const holes = createHoles();
    expect(holes.length).toBe(GRID_COLS * GRID_ROWS);
    for (const h of holes) {
      expect(typeof h.x).toBe("number");
      expect(typeof h.z).toBe("number");
      expect(h.mole).toBeNull();
    }
    // Holes span both sides of the centre line.
    expect(Math.min(...holes.map((h) => h.x))).toBeLessThan(0);
    expect(Math.max(...holes.map((h) => h.x))).toBeGreaterThan(0);
  });
});

describe("moleValue", () => {
  it("scores brown 1, gold 3 and bomb negative", () => {
    expect(moleValue("brown")).toBe(1);
    expect(moleValue("gold")).toBe(3);
    expect(moleValue("bomb")).toBeLessThan(0);
  });
});

describe("mole lifecycle", () => {
  it("rises, stays up, then falls and disappears", () => {
    let m = createMole("brown", 300);
    expect(m.phase).toBe("rising");
    m = stepMole(m, RISE_MS / 1000); // finish rising
    expect(m.phase).toBe("up");
    expect(m.y).toBeCloseTo(POP_HEIGHT, 0);
    // Advance well past up + fall → gone.
    let gone = m;
    for (let i = 0; i < 120 && gone; i += 1) gone = stepMole(gone, 1 / 60);
    expect(gone).toBeNull();
  });

  it("is whackable only when sufficiently popped and not already hit", () => {
    let m = createMole("brown", 500);
    expect(isWhackable(m)).toBe(false); // just started rising
    m = stepMole(m, RISE_MS / 1000);
    expect(isWhackable(m)).toBe(true);
    expect(isWhackable({ ...m, whacked: true })).toBe(false);
    expect(isWhackable(null)).toBe(false);
  });
});

describe("pickMoleType", () => {
  it("returns valid types and is deterministic for a seed", () => {
    const a = Array.from({ length: 20 }, (_v, i) => pickMoleType(makeRng(i + 1)));
    const b = Array.from({ length: 20 }, (_v, i) => pickMoleType(makeRng(i + 1)));
    expect(a).toEqual(b);
    for (const t of a) expect(["brown", "gold", "bomb"]).toContain(t);
  });

  it("produces mostly brown moles over many samples", () => {
    const rng = makeRng(7);
    const counts = { brown: 0, gold: 0, bomb: 0 };
    for (let i = 0; i < 400; i += 1) counts[pickMoleType(rng)] += 1;
    expect(counts.brown).toBeGreaterThan(counts.gold);
    expect(counts.brown).toBeGreaterThan(counts.bomb);
  });
});
