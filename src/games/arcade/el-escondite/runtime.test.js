import { describe, expect, it } from "vitest";
import {
  ElEscondideRuntime,
  HIDER_COUNT,
  MAX_SEARCHES,
  ROUND_MS,
  SPOT_COUNT,
  placeHiders,
  scoreFor,
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

function fresh(options = {}) {
  const rt = new ElEscondideRuntime({ seed: 4242, ...options });
  rt.startRound(options.difficulty ?? "normal");
  return rt;
}

describe("placeHiders", () => {
  it("always places every hider in a real spot", () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const spots = placeHiders(mulberry32(seed), 0.5);
      expect(spots).toHaveLength(HIDER_COUNT);
      for (const s of spots) {
        expect(Number.isInteger(s)).toBe(true);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThan(SPOT_COUNT);
      }
    }
  });

  it("always splits them up at full spread and lets them share at none", () => {
    let sharedAtZero = 0;
    for (let seed = 0; seed < 120; seed += 1) {
      expect(new Set(placeHiders(mulberry32(seed), 1)).size).toBe(HIDER_COUNT);
      if (new Set(placeHiders(mulberry32(seed), 0)).size < HIDER_COUNT) sharedAtZero += 1;
    }
    // With 3 hiders over 7 places a collision is common; the point is only that
    // zero spread never forces them apart.
    expect(sharedAtZero).toBeGreaterThan(0);
  });
});

describe("scoreFor", () => {
  it("pays for time and for unused searches", () => {
    expect(scoreFor(0, 0)).toBe(0);
    expect(scoreFor(10000, 0)).toBeGreaterThan(scoreFor(5000, 0));
    expect(scoreFor(5000, 3)).toBeGreaterThan(scoreFor(5000, 1));
  });
});

describe("ElEscondideRuntime", () => {
  it("starts on the menu with nothing searched", () => {
    const rt = new ElEscondideRuntime({ seed: 1 });
    const snap = rt.snapshot();
    expect(snap.screen).toBe("menu");
    expect(snap.spots).toHaveLength(SPOT_COUNT);
    expect(snap.spots.every((s) => !s.searched)).toBe(true);
  });

  it("gives the reference's five searches and thirty seconds", () => {
    const rt = fresh();
    expect(rt.snapshot().screen).toBe("seeking");
    expect(rt.snapshot().searchesLeft).toBe(MAX_SEARCHES);
    expect(rt.snapshot().secondsLeft).toBe(30);
    rt.advanceTime(ROUND_MS - 500);
    expect(rt.snapshot().screen).toBe("seeking");
    rt.advanceTime(600);
    expect(rt.snapshot().screen).toBe("lost");
  });

  it("never says where the hiders are until the round is decided", () => {
    const rt = fresh();
    expect(rt.snapshot().spots.every((s) => s.occupied === null)).toBe(true);
    rt.advanceTime(ROUND_MS + 10);
    expect(rt.snapshot().spots.every((s) => s.occupied !== null)).toBe(true);
  });

  it("finds everyone in a place with one search and spends one attempt", () => {
    const rt = fresh({ difficulty: "facil" });
    // Put all three in the same place so one search must catch all of them.
    rt.hiderSpots = [2, 2, 2];
    rt.search(2);
    const snap = rt.snapshot();
    expect(snap.spots[2].hits).toBe(3);
    expect(snap.foundCount).toBe(3);
    expect(snap.searchesLeft).toBe(MAX_SEARCHES - 1);
    expect(snap.screen).toBe("won");
  });

  it("refuses to spend a second search on the same place", () => {
    const rt = fresh();
    rt.hiderSpots = [0, 1, 2];
    rt.search(6);
    const after = rt.snapshot().searchesLeft;
    rt.search(6);
    expect(rt.snapshot().searchesLeft).toBe(after);
  });

  it("loses when the five searches are gone with somebody still hidden", () => {
    const rt = fresh();
    rt.hiderSpots = [0, 1, 2];
    for (const id of [3, 4, 5, 6, 0]) rt.search(id);
    const snap = rt.snapshot();
    expect(snap.searchesLeft).toBe(0);
    expect(snap.screen).toBe("lost");
    expect(snap.foundCount).toBe(1);
  });

  it("wins the moment the third hider is found", () => {
    const rt = fresh();
    rt.hiderSpots = [0, 3, 5];
    rt.search(0);
    expect(rt.snapshot().screen).toBe("seeking");
    rt.search(3);
    expect(rt.snapshot().screen).toBe("seeking");
    rt.search(5);
    expect(rt.snapshot().screen).toBe("won");
    expect(rt.snapshot().lastScore).toBeGreaterThan(0);
  });

  it("only ever gives a tell from a place that is occupied and unsearched", () => {
    const rt = fresh({ difficulty: "facil" });
    rt.hiderSpots = [1, 1, 4];
    for (let i = 0; i < 40; i += 1) {
      rt.advanceTime(200);
      for (const spot of rt.snapshot().spots) {
        if (spot.tell > 0) {
          expect([1, 4]).toContain(spot.id);
          expect(spot.searched).toBe(false);
        }
      }
    }
  });

  it("stops tells from a place once it has been searched", () => {
    const rt = fresh({ difficulty: "facil" });
    rt.hiderSpots = [1, 4, 6];
    rt.search(1);
    for (let i = 0; i < 40; i += 1) {
      rt.advanceTime(200);
      expect(rt.snapshot().spots[1].tell).toBe(0);
    }
  });

  it("holds the clock while paused", () => {
    const rt = fresh();
    rt.advanceTime(2000);
    rt.togglePause();
    rt.advanceTime(60000);
    expect(rt.snapshot().screen).toBe("seeking");
    rt.togglePause();
    rt.advanceTime(ROUND_MS);
    expect(rt.snapshot().screen).toBe("lost");
  });

  it("ignores searches once the round is over", () => {
    const rt = fresh();
    rt.hiderSpots = [0, 0, 0];
    rt.search(0);
    expect(rt.snapshot().screen).toBe("won");
    const left = rt.snapshot().searchesLeft;
    rt.search(3);
    expect(rt.snapshot().searchesLeft).toBe(left);
  });

  it("is reproducible from a seed", () => {
    const run = () => {
      const rt = new ElEscondideRuntime({ seed: 77 });
      rt.startRound("dificil");
      const trail = [];
      for (const id of [0, 1, 2, 3, 4]) {
        rt.advanceTime(1500);
        rt.search(id);
        trail.push(`${id}:${rt.snapshot().foundCount}`);
      }
      return trail.join("|");
    };
    expect(run()).toBe(run());
  });

  it("keeps hard rounds winnable but not easy", () => {
    // A seeker who reads the tells perfectly should still be able to win on
    // hard; a seeker who ignores them and searches 1-5 blindly should mostly
    // lose. This checks the blind baseline is genuinely poor, which is what
    // makes the tells worth watching.
    let blindWins = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      const rt = new ElEscondideRuntime({ seed });
      rt.startRound("dificil");
      for (const id of [0, 1, 2, 3, 4]) {
        if (rt.snapshot().screen !== "seeking") break;
        rt.search(id);
      }
      if (rt.snapshot().screen === "won") blindWins += 1;
    }
    expect(blindWins).toBeGreaterThan(0);
    expect(blindWins).toBeLessThan(100);
  });
});
