import { describe, expect, it } from "vitest";

import {
  buildOffers,
  careerSummary,
  createCareer,
  developmentFor,
  effectiveReputation,
  marketRadius,
  marketValue,
  roleFor,
  roleLadder,
  shiftRole,
  simulateSeason,
  squadLevelFor,
  titleOddsFor,
  youthOffers,
} from "./engine.js";
import { createStream, hashSeed } from "./rng.js";
import { DEVELOPMENT, ELITE_OVR, RETIREMENT_AGE, SQUAD_LEVEL, START_AGE } from "./tables.js";
import { world } from "./world.js";

const club = (reputation) => ({
  id: `test-${reputation}`,
  name: "Test",
  competitionId: "test-league",
  domestic_reputation: reputation,
  continental_reputation: reputation,
  international_reputation: reputation,
});

describe("rng", () => {
  it("is deterministic for a given seed", () => {
    const a = createStream("seed", "development", 22);
    const b = createStream("seed", "development", 22);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("keeps independent keys independent", () => {
    const injury = createStream("seed", "injury", 4);
    const title = createStream("seed", "title", 4);
    expect(injury()).not.toEqual(title());
  });

  it("hashes seeds stably and within uint32", () => {
    expect(hashSeed("boca")).toBe(hashSeed("boca"));
    expect(hashSeed("boca")).not.toBe(hashSeed("river"));
    expect(hashSeed("boca")).toBeGreaterThanOrEqual(0);
    expect(hashSeed("boca")).toBeLessThan(2 ** 32);
  });

  it("stays inside [0,1)", () => {
    const next = createStream("range-check");
    for (let i = 0; i < 5000; i += 1) {
      const value = next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("squad level and role", () => {
  it("indexes squad level by club reputation", () => {
    expect(squadLevelFor(club(0), 60)).toBe(SQUAD_LEVEL[0]);
    expect(squadLevelFor(club(5), 60)).toBe(SQUAD_LEVEL[5]);
  });

  it("lifts a small club one rung for an elite player", () => {
    expect(effectiveReputation(club(0), 70, "domestic")).toBe(0);
    expect(effectiveReputation(club(0), ELITE_OVR, "domestic")).toBe(1);
    // Already at the top, so nothing to lift.
    expect(effectiveReputation(club(5), 99, "domestic")).toBe(5);
  });

  it("maps delta to role at the documented thresholds", () => {
    expect(roleFor(0).role).toBe("titular");
    expect(roleFor(-1).role).toBe("rotacion_alta");
    expect(roleFor(-4).role).toBe("rotacion_alta");
    expect(roleFor(-5).role).toBe("rotacion_baja");
    expect(roleFor(-8).role).toBe("rotacion_baja");
    expect(roleFor(-9).role).toBe("suplente");
  });

  it("shifts roles down and clamps at the ends", () => {
    expect(shiftRole("titular", -1).role).toBe("rotacion_alta");
    expect(shiftRole("suplente", -1).role).toBe("suplente");
    expect(shiftRole("titular", 1).role).toBe("titular");
  });

  it("tiles the role ladder across the window without gaps or overlaps", () => {
    for (const keeper of [false, true]) {
      const ladder = roleLadder({ keeper, min: -16, max: 12 });
      expect(ladder.map((step) => step.role)).toEqual([
        "suplente", "rotacion_baja", "rotacion_alta", "titular",
      ]);
      expect(ladder[0].from).toBe(-16);
      expect(ladder[ladder.length - 1].to).toBe(12);
      for (const step of ladder) {
        expect(Number.isFinite(step.from)).toBe(true);
        expect(step.to).toBeGreaterThan(step.from);
      }
      for (let i = 1; i < ladder.length; i += 1) {
        expect(ladder[i].from).toBe(ladder[i - 1].to);
      }
    }
  });

  it("puts every delta in the band the lookup would pick", () => {
    for (const keeper of [false, true]) {
      const ladder = roleLadder({ keeper, min: -16, max: 12 });
      for (let delta = -16; delta <= 12; delta += 1) {
        const drawn = ladder.find((step) => delta >= step.from && delta < step.to);
        expect(drawn?.role ?? "titular").toBe(roleFor(delta, keeper).role);
      }
    }
  });
});

describe("development", () => {
  it("stays inside the published range for the cycle", () => {
    const [min, max] = DEVELOPMENT.normal[18];
    for (let i = 0; i < 200; i += 1) {
      const result = developmentFor(`seed-${i}`, "normal", 18, "titular", 17);
      expect(result.total).toBeGreaterThanOrEqual(min);
      expect(result.total).toBeLessThanOrEqual(max);
    }
  });

  it("keeps keepers improving at 28 where outfielders decline", () => {
    expect(DEVELOPMENT.keeper[28][1]).toBeGreaterThan(0);
    expect(DEVELOPMENT.normal[28][1]).toBeLessThanOrEqual(0);
  });

  it("rolls twice and keeps the worse for a benched player from 24", () => {
    let doubledWorse = 0;
    for (let i = 0; i < 200; i += 1) {
      const playing = developmentFor(`seed-${i}`, "normal", 24, "titular", 23);
      const benched = developmentFor(`seed-${i}`, "normal", 24, "suplente", 23);
      expect(playing.doubled).toBe(false);
      expect(benched.doubled).toBe(true);
      expect(benched.total).toBeLessThanOrEqual(playing.total);
      if (benched.total < playing.total) doubledWorse += 1;
    }
    // Two draws from the same stream: the second is lower half the time, so this is a
    // coin flip over 200 samples. Assert a bound far outside the binomial noise (mean
    // 100, sigma ~7) instead of the mean itself, which would fail half the runs.
    expect(doubledWorse).toBeGreaterThan(70);
  });

  it("does not double-roll before 24", () => {
    expect(developmentFor("seed", "normal", 22, "suplente", 21).doubled).toBe(false);
  });
});

describe("availability", () => {
  const seasonWith = (modifiers) => {
    const state = {
      ...createCareer({ seed: "avail", country: "ESP", position: "DC" }),
      clubId: Object.keys(world.clubs)[0],
      ovr: 74,
      modifiers: { titleMultipliers: {}, ...modifiers },
    };
    return simulateSeason(state, world, { season: 0 }).record;
  };

  it("takes matches off the season for an injury without touching the role", () => {
    const healthy = seasonWith({});
    const injured = seasonWith({ matchesDelta: -20 });
    expect(injured.role).toBe(healthy.role);
    expect(injured.matches).toBe(Math.max(0, healthy.matches - 20));
  });

  it("never returns a negative match count", () => {
    expect(seasonWith({ matchesDelta: -500 }).matches).toBe(0);
  });

  it("still plays nothing when suspended, whatever the injury said", () => {
    expect(seasonWith({ suspended: true, matchesDelta: -4 }).matches).toBe(0);
  });
});

describe("titles", () => {
  const odds = (reputation, delta) =>
    titleOddsFor({ trophy: "league", club: club(reputation), ovr: 70, delta });

  it("keys league odds off club reputation", () => {
    expect(odds(0, 0)).toBe(0);
    expect(odds(3, 0)).toBeCloseTo(0.25, 5);
    expect(odds(5, 0)).toBeCloseTo(0.7, 5);
  });

  it("rewards being far better than the squad", () => {
    expect(odds(3, 10)).toBeCloseTo(0.25 * 1.6, 5);
    expect(odds(3, 6)).toBeCloseTo(0.25 * 1.3, 5);
  });

  // OUR CALL #2: the multiplier is symmetric, unlike the model we started from.
  it("penalises being far worse than the squad", () => {
    expect(odds(3, -9)).toBeCloseTo(0.25 * 0.75, 5);
    expect(odds(3, -6)).toBeCloseTo(0.25 * 0.9, 5);
    expect(odds(3, -9)).toBeLessThan(odds(3, 0));
  });

  it("peaks the secondary continental cup at mid reputation", () => {
    const secondary = (reputation) =>
      titleOddsFor({ trophy: "continental_b", club: club(reputation), ovr: 70, delta: 0 });
    expect(secondary(2)).toBeGreaterThan(secondary(4));
    expect(secondary(5)).toBe(0);
  });

  it("applies event multipliers on top", () => {
    const boosted = titleOddsFor({
      trophy: "league",
      club: club(3),
      ovr: 70,
      delta: 0,
      modifiers: { titleMultipliers: { all: 2 } },
    });
    expect(boosted).toBeCloseTo(0.5, 5);
  });
});

describe("market", () => {
  it("opens the radius as OVR rises", () => {
    expect(marketRadius(45).sameCountry).toBe(0);
    expect(marketRadius(60).sameCountry).toBe(100);
    expect(marketRadius(75).sameConfederation).toBe(100);
    expect(marketRadius(80).global).toBe(50);
    expect(marketRadius(90).global).toBe(100);
  });

  it("collapses value at 35 even at the same OVR", () => {
    expect(marketValue(75, 34)).toBeGreaterThan(marketValue(75, 35) * 2);
  });
});

describe("season simulation", () => {
  const anyCountryWithLeague = () => {
    const leagues = Object.values(world.competitions);
    return leagues[0].country_fifa_code;
  };

  it("produces a coherent season record", () => {
    const country = anyCountryWithLeague();
    let state = createCareer({ seed: "test-career", country, position: "DC" });
    const offers = youthOffers("test-career", state, world, 3);
    expect(offers.length).toBeGreaterThan(0);
    state = { ...state, clubId: offers[0].clubId };

    const { record, state: next } = simulateSeason(state, world, { season: 0 });
    expect(record.age).toBe(START_AGE);
    expect(record.matches).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(record.goals)).toBe(true);
    expect(Number.isFinite(record.delta)).toBe(true);
    expect(next.age).toBe(START_AGE + 1);
    expect(next.history).toHaveLength(1);
  });

  it("runs a full career to forced retirement", () => {
    const country = anyCountryWithLeague();
    let state = createCareer({ seed: "full-run", country, position: "DC" });
    state = { ...state, clubId: youthOffers("full-run", state, world, 3)[0].clubId };

    let season = 0;
    while (!state.retired && season < 40) {
      ({ state } = simulateSeason(state, world, { season }));
      season += 1;
      if (!state.retired && state.clubWantsOut) {
        const offers = buildOffers("full-run", season, state, world, 3);
        if (offers.length) state = { ...state, clubId: offers[0].clubId, clubWantsOut: false };
      }
    }

    expect(state.retired).toBe(true);
    expect(state.age).toBe(RETIREMENT_AGE);
    expect(state.history).toHaveLength(RETIREMENT_AGE - START_AGE);

    const summary = careerSummary(state);
    expect(summary.seasons).toBe(RETIREMENT_AGE - START_AGE);
    expect(Number.isFinite(summary.goals)).toBe(true);
    expect(summary.titles).toBe(summary.titlesEarned + summary.titlesFromBench);
  });

  it("replays identically from the same seed", () => {
    const country = anyCountryWithLeague();
    const run = () => {
      let state = createCareer({ seed: "repeat", country, position: "DC" });
      state = { ...state, clubId: youthOffers("repeat", state, world, 3)[0].clubId };
      for (let season = 0; season < 10; season += 1) {
        ({ state } = simulateSeason(state, world, { season }));
      }
      return careerSummary(state);
    };
    expect(run()).toEqual(run());
  });

  it("gives a suspended season no matches and no titles", () => {
    const country = anyCountryWithLeague();
    let state = createCareer({ seed: "banned", country, position: "DC" });
    state = {
      ...state,
      clubId: youthOffers("banned", state, world, 3)[0].clubId,
      modifiers: { titleMultipliers: {}, suspended: true },
    };
    const { record } = simulateSeason(state, world, { season: 0 });
    expect(record.matches).toBe(0);
    expect(record.goals).toBe(0);
    expect(record.titles).toHaveLength(0);
  });
});

describe("world data", () => {
  it("ships the full world", () => {
    expect(Object.keys(world.competitions).length).toBe(35);
    expect(Object.keys(world.clubs).length).toBe(574);
    expect(Object.keys(world.countries).length).toBe(211);
  });

  it("gives every club a competition that exists", () => {
    for (const c of Object.values(world.clubs)) {
      expect(world.competitions[c.competitionId]).toBeTruthy();
    }
  });
});
