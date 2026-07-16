import { describe, expect, it } from "vitest";
import {
  createTournament,
  seedOrder,
  findHumanMatch,
  humanOpponent,
  reportHumanResult,
  champion,
  simulateScoreline,
  makeRng,
  ROUND_KEYS,
  HUMAN_ID,
} from "./tournament";
import { PLAYERS, tierForPlayer, effectiveRating } from "./players";
import { TIER_IDS } from "../shared/racket3d/adaptiveAi";

describe("the draw", () => {
  it("is a 32-player bracket over the five Grand Slam rounds we ship", () => {
    const t = createTournament({ seed: 7 });
    expect(t.bracket).toHaveLength(ROUND_KEYS.length);
    expect(t.bracket[0]).toHaveLength(16); // 32 players
    expect(t.bracket[1]).toHaveLength(8);
    expect(t.bracket[2]).toHaveLength(4);
    expect(t.bracket[3]).toHaveLength(2);
    expect(t.bracket[4]).toHaveLength(1);
  });

  it("keeps the favourites apart: seed 1 meets seed 32 first", () => {
    const order = seedOrder(32);
    expect(order).toHaveLength(32);
    expect(order[0]).toBe(1);
    expect(order[1]).toBe(32);
    // Every seed appears exactly once.
    expect(new Set(order).size).toBe(32);
  });

  it("puts the human in the draw exactly once", () => {
    const t = createTournament({ seed: 11 });
    const humans = t.bracket[0].flatMap((m) => [m.a, m.b]).filter((p) => p?.human);
    expect(humans).toHaveLength(1);
    expect(humans[0].id).toBe(HUMAN_ID);
  });

  it("fills all 32 slots with distinct entrants", () => {
    const t = createTournament({ seed: 3 });
    const ids = t.bracket[0].flatMap((m) => [m.a.id, m.b.id]);
    expect(ids).toHaveLength(32);
    expect(new Set(ids).size).toBe(32);
  });

  it("gives the human an escalating path: their first opponent is the weakest", () => {
    const t = createTournament({ seed: 5, surface: "hard" });
    const first = humanOpponent(t);
    // As the top seed, the human draws the bottom seed in round one.
    expect(first.seed).toBe(32);
  });
});

describe("playing through the draw", () => {
  const runThrough = (results, seed = 99) => {
    let t = createTournament({ seed });
    for (const won of results) {
      t = reportHumanResult(t, won, "6-4 6-4");
      if (t.status !== "playing") break;
    }
    return t;
  };

  it("advances the human and simulates the rest of the round", () => {
    const t = createTournament({ seed: 21 });
    const opponent = humanOpponent(t);
    reportHumanResult(t, true, "6-3 6-4");

    expect(t.round).toBe(1);
    // Every first-round match now has a winner.
    expect(t.bracket[0].every((m) => m.winner)).toBe(true);
    // The human moved on, their victim did not.
    const stillIn = t.bracket[1].flatMap((m) => [m.a, m.b]);
    expect(stillIn.some((p) => p?.human)).toBe(true);
    expect(stillIn.some((p) => p?.id === opponent.id)).toBe(false);
  });

  it("crowns the human champion after five wins", () => {
    const t = runThrough([true, true, true, true, true]);
    expect(t.status).toBe("champion");
    expect(champion(t).human).toBe(true);
  });

  it("knocks the human out and still plays the draw to a champion", () => {
    const t = runThrough([true, false]);
    expect(t.status).toBe("eliminated");
    const champ = champion(t);
    expect(champ).toBeTruthy();
    expect(champ.human).toBe(false);
  });

  it("has no human left in the bracket after elimination", () => {
    const t = runThrough([false]);
    const later = t.bracket.slice(1).flat().flatMap((m) => [m.a, m.b]);
    expect(later.some((p) => p?.human)).toBe(false);
  });

  it("replays identically from the same seed", () => {
    const a = runThrough([true, false], 4242);
    const b = runThrough([true, false], 4242);
    expect(champion(a).id).toBe(champion(b).id);
  });
});

describe("simulated scorelines", () => {
  it("stops as soon as someone has enough sets", () => {
    const rng = makeRng(1);
    for (let i = 0; i < 50; i += 1) {
      const { sets } = simulateScoreline(0.5, 2, rng);
      expect(sets.length).toBeGreaterThanOrEqual(2);
      expect(sets.length).toBeLessThanOrEqual(3);
    }
  });

  it("makes the favourite win most of the time, but not always", () => {
    const rng = makeRng(77);
    let wins = 0;
    const N = 400;
    for (let i = 0; i < N; i += 1) {
      if (simulateScoreline(0.75, 2, rng).winnerIndex === 0) wins += 1;
    }
    // A 75% per-set favourite should take most matches — and still lose some.
    expect(wins / N).toBeGreaterThan(0.75);
    expect(wins / N).toBeLessThan(1);
  });
});

describe("difficulty scaling of the field", () => {
  it("puts the strongest player at the ceiling tier you chose", () => {
    const best = PLAYERS[0];
    for (const ceiling of TIER_IDS) {
      expect(tierForPlayer(best, ceiling)).toBe(ceiling);
    }
  });

  it("steps the weakest player down from the ceiling, never below the floor", () => {
    const worst = PLAYERS[PLAYERS.length - 1];
    expect(tierForPlayer(worst, "legend")).toBe("pro");
    expect(tierForPlayer(worst, "pro")).toBe("rookie");
    expect(tierForPlayer(worst, "rookie")).toBe("rookie");
  });

  it("never has a lower-rated player outrank a higher-rated one", () => {
    const ranks = PLAYERS.map((p) => TIER_IDS.indexOf(tierForPlayer(p, "legend")));
    for (let i = 1; i < ranks.length; i += 1) {
      expect(ranks[i]).toBeLessThanOrEqual(ranks[i - 1]);
    }
  });
});

describe("surface fit", () => {
  it("flatters a clay specialist on clay and hurts them on grass", () => {
    const clayCourter = PLAYERS.find((p) => p.surface === "clay");
    expect(effectiveRating(clayCourter, "clay")).toBeGreaterThan(
      effectiveRating(clayCourter, "grass")
    );
  });

  it("reorders the field between surfaces", () => {
    const onClay = createTournament({ seed: 8, surface: "clay" });
    const onGrass = createTournament({ seed: 8, surface: "grass" });
    const seed2 = (t) => t.bracket[0].flatMap((m) => [m.a, m.b]).find((p) => p.seed === 2);
    // The top-seeded AI is not the same player on clay as it is on grass.
    expect(seed2(onClay).id).not.toBe(seed2(onGrass).id);
  });
});
