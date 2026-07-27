import { describe, it, expect } from "vitest";
import {
  createDraft,
  rollForCandidates,
  choosePick,
  defaultStarterIds,
  splitLineup,
  isValidLineup,
  ROSTER_SIZE,
  STARTERS,
  CANDIDATES_PER_ROLL,
} from "./draft.js";
import { makeRng } from "./rng.js";

// Estos tests usan el catálogo real generado (cards.generated.json).
describe("draft flow", () => {
  it("completes 8 rounds picking one of seven each time, no duplicates", () => {
    const rng = makeRng(2024);
    let d = createDraft();
    while (d.phase !== "done") {
      d = rollForCandidates(d, rng);
      expect(d.phase).toBe("choose");
      expect(d.candidates.length).toBe(CANDIDATES_PER_ROLL);
      expect(d.decade).toBeTypeOf("number");
      d = choosePick(d, d.candidates[0]);
    }
    expect(d.picks.length).toBe(ROSTER_SIZE);
    const ids = new Set(d.picks.map((p) => p.id));
    expect(ids.size).toBe(ROSTER_SIZE);
  });

  it("ignores a pick that is not among the current candidates", () => {
    const rng = makeRng(7);
    let d = rollForCandidates(createDraft(), rng);
    const bogus = { id: -1, overall: 99 };
    const same = choosePick(d, bogus);
    expect(same).toBe(d);
  });

  it("defaultStarterIds selects the five highest overalls", () => {
    const roster = [90, 70, 85, 60, 88, 95, 72, 80].map((ov, i) => ({
      id: i,
      overall: ov,
    }));
    const starters = defaultStarterIds(roster);
    expect(starters.size).toBe(STARTERS);
    const chosen = [...starters].map((id) => roster[id].overall).sort((a, b) => b - a);
    expect(chosen).toEqual([95, 90, 88, 85, 80]);
  });

  it("splitLineup and isValidLineup agree", () => {
    const roster = Array.from({ length: 8 }, (_, i) => ({ id: i, overall: 60 + i }));
    const starterIds = defaultStarterIds(roster);
    const { starters, bench } = splitLineup(roster, starterIds);
    expect(starters.length).toBe(5);
    expect(bench.length).toBe(3);
    expect(isValidLineup(roster, starterIds)).toBe(true);
    expect(isValidLineup(roster, new Set([0, 1, 2]))).toBe(false);
  });
});
