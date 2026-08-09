import { describe, expect, it } from "vitest";

import {
  buildOffers,
  careerSummary,
  clubStanding,
  createCareer,
  declineFactor,
  developmentFor,
  developmentOutlook,
  effectiveReputation,
  growthFactor,
  marketRadius,
  marketValue,
  outputFor,
  roleFor,
  roleLadder,
  shiftDivision,
  shiftRole,
  simulateSeason,
  squadLevelFor,
  titleOddsFor,
  youthOffers,
} from "./engine.js";
import { formFactor, standardNormal } from "./fortune.js";
import { createStream, hashSeed } from "./rng.js";
import {
  CLUB_OUTPUT_MULTIPLIER,
  DEVELOPMENT,
  ELITE_OVR,
  FORM_SIGMA,
  GOAL_RATE,
  GROWTH,
  RETIREMENT_AGE,
  SEASON_COHESION,
  SQUAD_LEVEL,
  START_AGE,
  deltaBand,
  qualityMultiplier,
} from "./tables.js";
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

/**
 * OUR CALL #6. These are the tests that would have caught the thing that was wrong: the
 * old model let a career spent on the bench end up as good as one spent playing.
 */
describe("the season you played is the coaching you got", () => {
  const at = (overrides) => growthFactor({ matches: 34, delta: 0, reputation: 3, ...overrides }).factor;

  it("pays a season of football more than a season of watching it", () => {
    expect(at({ matches: 44 })).toBeGreaterThan(at({ matches: 9 }));
  });

  it("has diminishing returns on minutes", () => {
    const early = at({ matches: 14 }) - at({ matches: 4 });
    const late = at({ matches: 44 }) - at({ matches: 34 });
    expect(late).toBeLessThan(early);
    expect(early).toBeGreaterThan(0);
  });

  it("peaks just above the player's head, and falls away on both sides", () => {
    const peak = at({ delta: GROWTH.challengeAt });
    for (const delta of [-14, -8, 4, 10, 16]) {
      expect(at({ delta })).toBeLessThan(peak);
    }
    // The delta-farmer's whole strategy, priced: being the best player in the room by a
    // street costs you the ceiling you might have had. This is the counterweight that is
    // about football rather than about the crowd.
    expect(at({ delta: 14 })).toBeLessThan(at({ delta: 0 }));
  });

  it("lets the club matter, but far less than playing does", () => {
    const clubSwing = at({ reputation: 5 }) - at({ reputation: 0 });
    const minutesSwing = at({ matches: 44 }) - at({ matches: 6 });
    expect(clubSwing).toBeGreaterThan(0);
    expect(clubSwing * 3).toBeLessThan(minutesSwing);
  });

  it("stays inside its bounds however extreme the season", () => {
    for (const matches of [0, 5, 20, 60]) {
      for (const delta of [-30, -8, 0, 9, 30]) {
        for (const reputation of [0, 3, 5]) {
          const { factor } = growthFactor({ matches, delta, reputation });
          expect(factor).toBeGreaterThanOrEqual(GROWTH.min);
          expect(factor).toBeLessThanOrEqual(GROWTH.max);
        }
      }
    }
  });

  it("reads backwards for decline: minutes slow the fall, and their absence speeds it", () => {
    expect(declineFactor(1.2)).toBeLessThan(1);
    expect(declineFactor(0.75)).toBeGreaterThan(1);
    expect(declineFactor(1)).toBe(1);
    expect(declineFactor(9)).toBe(GROWTH.declineMin);
    expect(declineFactor(-9)).toBe(GROWTH.declineMax);
  });

  it("scales what lands without touching the range the panel prints", () => {
    const full = developmentFor("grow", "normal", 18, "titular", 17, 1);
    const starved = developmentFor("grow", "normal", 18, "titular", 17, 0.7);
    // Same draw, same published honesty - only the share collected differs.
    expect(starved.total).toBe(full.total);
    expect(starved.range).toEqual(full.range);
    expect(starved.perSeason).toBeLessThan(full.perSeason);
    expect(starved.perSeason).toBeCloseTo(full.perSeason * 0.7, 10);
  });

  it("records the factor that actually scaled the draw, which is not the growth factor", () => {
    const rising = developmentFor("scale", "normal", 18, "titular", 17, 1.2);
    expect(rising.total).toBeGreaterThan(0);
    expect(rising.scale).toBe(1.2);

    // In a year that goes down, the draw is scaled by the decline factor. The panel reads
    // `scale`, so it can never report a rate of 120% in a season the rating fell.
    const falling = developmentFor("scale", "normal", 36, "titular", 35, 1.2);
    expect(falling.total).toBeLessThan(0);
    expect(falling.scale).toBe(declineFactor(1.2));
    expect(falling.scale).toBeLessThan(1);
    expect(falling.perSeason).toBeCloseTo((falling.total / 2) * falling.scale, 10);
  });

  it("turns a good environment into a slower decline rather than a late improvement", () => {
    const thriving = developmentFor("fade", "normal", 36, "titular", 35, 1.2);
    const fading = developmentFor("fade", "normal", 36, "titular", 35, 0.75);
    expect(thriving.total).toBeLessThan(0);
    // Both still go down - a gym does not make a 36-year-old better - but not equally.
    expect(thriving.perSeason).toBeLessThan(0);
    expect(thriving.perSeason).toBeGreaterThan(fading.perSeason);
  });

  it("puts the factor on the record so the report can say why", () => {
    let state = createCareer({ seed: "growth-record", country: "ESP", position: "DC" });
    state = { ...state, clubId: youthOffers("growth-record", state, world, 3)[0].clubId, age: 17 };
    const { record } = simulateSeason(state, world, { season: 0 });
    expect(record.growth.factor).toBeGreaterThan(0);
    expect(record.growth).toHaveProperty("minutes");
    expect(record.growth).toHaveProperty("challenge");
    expect(record.growth).toHaveProperty("environment");
    expect(record.development.growth).toBe(record.growth.factor);
  });

  it("shows the player the range at the rate he is actually collecting it", () => {
    const state = { ...createCareer({ seed: "outlook", country: "ESP" }), age: 17, lastRole: "titular" };
    const plain = developmentOutlook(state);
    const scaled = developmentOutlook(state, 0.75);
    expect(plain.effective).toEqual(plain.range);
    expect(scaled.effective[1]).toBeCloseTo(plain.range[1] * 0.75, 10);
    expect(scaled.growth).toBe(0.75);
  });
});

/** OUR CALL #7: going up and going down have to leave a mark, or they are not events. */
describe("where a career leaves a club", () => {
  const secondTier = Object.values(world.clubs).find(
    (c) => world.competitions[c.competitionId]?.tier === 2,
  );
  const topFlight = Object.values(world.clubs).find(
    (c) => world.competitions[c.competitionId]?.tier === 1,
  );

  it("leaves an untouched club exactly as the data has it", () => {
    const standing = clubStanding(world, secondTier, {});
    expect(standing.club).toBe(secondTier);
    expect(standing.shift).toBe(0);
    expect(standing.tier).toBe(2);
  });

  it("moves a promoted club into the real top flight of its own country", () => {
    const standing = clubStanding(world, secondTier, { [secondTier.id]: 1 });
    expect(standing.tier).toBe(1);
    expect(standing.competition.tier).toBe(1);
    expect(standing.competition.country_fifa_code).toBe(
      world.competitions[secondTier.competitionId].country_fifa_code,
    );
    expect(standing.moved).toBe(true);
    // A promoted side is a better side, not just a side in a better league.
    expect(standing.club.domestic_reputation).toBe((secondTier.domestic_reputation ?? 0) + 1);
  });

  it("sends a relegated club down, and says so when there is no league to name", () => {
    const standing = clubStanding(world, topFlight, { [topFlight.id]: -1 });
    expect(standing.tier).toBe(2);
    expect(standing.demoted).toBe(true);
    expect(standing.competition.tier).toBe(2);
  });

  it("never moves a club more than one rung either way", () => {
    let divisions = {};
    for (let i = 0; i < 5; i += 1) {
      divisions = shiftDivision(divisions, "c", { promoted: true });
    }
    expect(divisions.c).toBe(1);
    for (let i = 0; i < 5; i += 1) {
      divisions = shiftDivision(divisions, "c", { relegated: true });
    }
    expect(divisions.c).toBe(-1);
  });

  it("is a no-op for a season where nothing moved", () => {
    const divisions = { c: 1 };
    expect(shiftDivision(divisions, "c", {})).toBe(divisions);
    expect(shiftDivision(divisions, "c", { promoted: true })).toBe(divisions);
  });

  it("stops the same club being promoted twice without going down in between", () => {
    // The defect this replaced: over 600 careers one club was promoted four times and
    // another relegated six, because the world never moved and the roll came round again.
    let state = {
      ...createCareer({ seed: "promo-loop", country: "ESP", position: "DC" }),
      clubId: secondTier.id,
      ovr: 88,
      age: 24,
    };
    let promotions = 0;
    for (let season = 0; season < 8; season += 1) {
      const result = simulateSeason(
        { ...state, modifiers: { titleMultipliers: {}, forcePromotion: true } },
        world,
        { season },
      );
      if (result.record.promoted) promotions += 1;
      state = { ...result.state, age: 24, ovr: 88 };
    }
    // Forced every single season, and it can still only happen once: after the first the
    // club is top-flight and the promotion branch is not even reached.
    expect(promotions).toBe(1);
    expect(state.divisions[secondTier.id]).toBe(1);
  });

  it("plays the season in the division the career put the club in", () => {
    const state = {
      ...createCareer({ seed: "division-record", country: "ESP", position: "DC" }),
      clubId: secondTier.id,
      divisions: { [secondTier.id]: 1 },
      ovr: 80,
      age: 25,
    };
    const { record } = simulateSeason(state, world, { season: 0 });
    expect(record.division.tier).toBe(1);
    expect(record.division.shift).toBe(1);
    expect(record.promoted).toBe(false);
  });
});

/**
 * The calibration, guarded.
 *
 * `GROWTH.normaliser` is a measured constant, not a chosen one: it is set so that a
 * career played competently peaks where it did before development responded to anything.
 * If the growth tables move, this is the test that fails, and the fix is to re-measure
 * the normaliser rather than to widen the band.
 */
describe("what a career is worth, over many of them", () => {
  const CAREERS = 260;

  /** Run a whole career under a club-picking policy. Mirrors the shadow's loop. */
  const runPolicy = (seed, pick) => {
    let state = createCareer({ seed, country: "ESP", position: "DC", mode: "intensa" });
    const first = pick(youthOffers(seed, state, world, 3), state);
    if (!first) return null;
    state = { ...state, clubId: first.clubId };
    let season = 0;
    let benchSeasons = 0;
    while (!state.retired && state.age < RETIREMENT_AGE) {
      const result = simulateSeason(state, world, { season });
      if (result.record.role === "suplente") benchSeasons += 1;
      state = result.state;
      season += 1;
      if (state.retired) break;
      if (state.clubWantsOut || season % 2 === 0) {
        const offers = buildOffers(seed, season, state, world, 4);
        const choice = offers.length ? pick(offers, state) : null;
        state =
          choice && choice.clubId !== state.clubId
            ? { ...state, clubId: choice.clubId, seasonsAtClub: 0, clubWantsOut: false }
            : { ...state, clubWantsOut: false };
      }
    }
    return { summary: careerSummary(state), benchSeasons, seasons: season };
  };

  const byReputation = (order) => (offers) =>
    offers
      .map((offer) => ({ offer, r: world.clubs[offer.clubId]?.international_reputation ?? 0 }))
      .sort((a, b) => (a.r - b.r) * order)[0]?.offer ?? offers[0];

  /** The advice any decent agent would give: the strongest club that will still play you. */
  const competent = (offers, state) =>
    offers
      .map((offer) => {
        const c = world.clubs[offer.clubId];
        if (!c) return null;
        const delta = state.ovr - squadLevelFor(c, state.ovr);
        return {
          offer,
          score:
            (c.international_reputation ?? 0) * 4 +
            (delta < -4 ? (delta + 4) * 3 : 0) -
            (delta > 10 ? (delta - 10) * 1.5 : 0),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)[0]?.offer ?? offers[0];

  const measure = (pick) => {
    const runs = [];
    for (let i = 0; i < CAREERS; i += 1) {
      const run = runPolicy(`mc-${i}`, pick);
      if (run) runs.push(run);
    }
    const mean = (of) => runs.reduce((sum, run) => sum + of(run), 0) / runs.length;
    return {
      peakOvr: mean((run) => run.summary.peakOvr),
      goals: mean((run) => run.summary.goals),
      benchShare: mean((run) => run.benchSeasons / Math.max(1, run.seasons)),
    };
  };

  // Memoised so the sweep runs when the tests do rather than when the file is collected.
  const cache = new Map();
  const once = (key, pick) => {
    if (!cache.has(key)) cache.set(key, measure(pick));
    return cache.get(key);
  };
  const played = () => once("played", competent);
  const watched = () => once("watched", byReputation(-1));
  const farmed = () => once("farmed", byReputation(1));

  it("keeps a competent career peaking where it always did", () => {
    // Measured at 79.8 both before and after this became a real feedback loop. The band
    // is the sampling noise at this many careers, not slack for a balance drift.
    expect(played().peakOvr).toBeGreaterThan(78.6);
    expect(played().peakOvr).toBeLessThan(81);
  });

  it("makes a career of playing beat a career of watching by a real margin", () => {
    expect(watched().benchShare).toBeGreaterThan(0.25);
    expect(played().benchShare).toBeLessThan(0.1);
    // The whole point. Before this, the gap was 0.9 OVR - a fifth of a standard
    // deviation - and the bench career was, if anything, marginally ahead.
    expect(played().peakOvr - watched().peakOvr).toBeGreaterThan(2.5);
  });

  it("charges the delta-farmer his ceiling for all those goals", () => {
    // He still scores far more; he just stops getting better while he does it, which is
    // the trade the game wants him to be able to see and make.
    expect(farmed().goals).toBeGreaterThan(played().goals * 1.4);
    expect(farmed().peakOvr).toBeLessThan(played().peakOvr - 1.5);
  });
});

describe("a season's tally has the spread a real one does", () => {
  const host = Object.values(world.clubs).find((c) => c.international_reputation === 4);

  const tallies = (delta, matches, samples = 3000) => {
    const values = [];
    for (let i = 0; i < samples; i += 1) {
      const latent = standardNormal(createStream("tally", "latent", i));
      const form = formFactor(latent, createStream("tally", "form", i), FORM_SIGMA, SEASON_COHESION.form);
      values.push(
        outputFor(createStream("tally", i), {
          group: "forward", delta, club: host, ovr: 84, matches, kind: "goals", form,
        }),
      );
    }
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
    return { mean, sd, cv: sd / mean, zeros: values.filter((v) => v === 0).length / values.length };
  };

  it("gets less predictable the fewer goals are expected, not equally so at every level", () => {
    const big = tallies(4, 45);
    const small = tallies(-9, 18);
    // The old model had a flat cv of 0.145 at every expectation, which is exactly the
    // wrong shape: sd/mean should fall roughly as 1/sqrt(mean).
    expect(big.cv).toBeLessThan(small.cv / 2);
    expect(big.cv).toBeGreaterThan(0.15);
  });

  it("lets a fringe player blank a season and lets a good one have a career year", () => {
    const fringe = tallies(-9, 18);
    expect(fringe.zeros).toBeGreaterThan(0.05);
    const big = tallies(4, 45);
    // The old model's ceiling was mean x 1.25 and it was reached constantly; the point of
    // the change is a right tail, not a wider box.
    expect(big.sd).toBeGreaterThan(Math.sqrt(big.mean));
  });

  it("still pays out exactly what the rate tables promise", () => {
    // Mean-preserving is the property that let this ship without re-balancing anything.
    for (const [delta, matches] of [[4, 45], [0, 42], [-5, 30], [-9, 18]]) {
      const { mean } = tallies(delta, matches, 6000);
      const rate = GOAL_RATE.forward[deltaBand(delta)];
      const expected =
        rate * matches * CLUB_OUTPUT_MULTIPLIER[host.domestic_reputation] * qualityMultiplier(84);
      expect(mean / expected).toBeGreaterThan(0.94);
      expect(mean / expected).toBeLessThan(1.06);
    }
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
