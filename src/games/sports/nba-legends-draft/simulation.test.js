import { describe, it, expect } from "vitest";
import { simulateGame, quickResult } from "./simulation.js";
import { team } from "./testUtils.js";

describe("simulateGame", () => {
  it("box score points add up to the team score", () => {
    const a = team(1, "A", 82);
    const b = team(2, "B", 80);
    const r = simulateGame(a, b, { seed: 123 });
    const sumA = r.box.A.reduce((s, p) => s + p.pts, 0);
    const sumB = r.box.B.reduce((s, p) => s + p.pts, 0);
    expect(sumA).toBe(r.scoreA);
    expect(sumB).toBe(r.scoreB);
  });

  it("never ends in a tie (plays overtime)", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const r = simulateGame(team(1, "A", 78), team(2, "B", 78), { seed });
      expect(r.scoreA).not.toBe(r.scoreB);
      expect(r.winner).toBe(r.scoreA > r.scoreB ? "A" : "B");
    }
  });

  it("is deterministic for a given seed", () => {
    const a = team(1, "A", 85);
    const b = team(2, "B", 79);
    const r1 = simulateGame(a, b, { seed: 999 });
    const r2 = simulateGame(a, b, { seed: 999 });
    expect(r1.scoreA).toBe(r2.scoreA);
    expect(r1.scoreB).toBe(r2.scoreB);
    expect(r1.events.length).toBe(r2.events.length);
  });

  it("produces realistic NBA-ish scores", () => {
    const r = simulateGame(team(1, "A", 82), team(2, "B", 82), { seed: 7 });
    for (const s of [r.scoreA, r.scoreB]) {
      expect(s).toBeGreaterThan(70);
      expect(s).toBeLessThan(160);
    }
  });

  it("emits a play-by-play with running score", () => {
    const r = simulateGame(team(1, "A", 82), team(2, "B", 80), { seed: 5 });
    expect(r.events.length).toBeGreaterThan(20);
    const last = r.events[r.events.length - 1];
    expect(last.sa).toBe(r.scoreA);
    expect(last.sb).toBe(r.scoreB);
  });

  it("the much stronger team wins the clear majority of games", () => {
    let strongWins = 0;
    const N = 60;
    for (let seed = 1; seed <= N; seed++) {
      const r = quickResult(team(1, "Strong", 95), team(2, "Weak", 62), seed);
      if (r.winner === "A") strongWins += 1;
    }
    expect(strongWins).toBeGreaterThan(N * 0.8);
  });

  it("box score totals are internally consistent (made <= attempts)", () => {
    const r = simulateGame(team(1, "A", 84), team(2, "B", 80), { seed: 42 });
    for (const p of [...r.box.A, ...r.box.B]) {
      expect(p.fgm).toBeLessThanOrEqual(p.fga);
      expect(p.tpm).toBeLessThanOrEqual(p.tpa);
      expect(p.ftm).toBeLessThanOrEqual(p.fta);
      expect(p.tpm).toBeLessThanOrEqual(p.fgm);
      expect(p.min).toBeGreaterThanOrEqual(0);
    }
  });
});
