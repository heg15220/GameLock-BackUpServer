import { describe, expect, it } from "vitest";

import {
  FIXTURE_KINDS,
  HINT_FROM_OVR,
  MATCHES_PER_SEASON,
  NAILED_FROM_OVR,
  SHOT_TYPES,
  derbyRivals,
  matchEffects,
  resolveShot,
  seasonFixtures,
  shotFor,
  shotScoringRate,
  splitSeason,
} from "./bigmatch.js";
import { effectiveReputation, simulateSeason } from "./engine.js";
import { createStream } from "./rng.js";
import { world } from "./world.js";

const clubWhere = (predicate) => Object.values(world.clubs).find(predicate);

const giant = clubWhere((club) => club.international_reputation === 5);
const minnow = clubWhere(
  (club) =>
    club.international_reputation === 0 &&
    world.competitions[club.competitionId]?.tier === 1 &&
    (club.domestic_reputation ?? 0) === 0,
);
const secondTier = clubWhere((club) => world.competitions[club.competitionId]?.tier === 2);

/** The shape `seasonFixtures` expects, built from a real club so the odds are the real odds. */
const context = (club, overrides = {}) => ({
  seed: "fixtures",
  season: 4,
  club,
  competition: world.competitions[club.competitionId] ?? null,
  country: world.countries.ESP ?? null,
  ovr: 78,
  age: 26,
  effectiveReputation: (key) => effectiveReputation(club, overrides.ovr ?? 78, key),
  calledUp: false,
  rivals: derbyRivals(world, club.id),
  ...overrides,
});

describe("the world has derbies even though the data does not", () => {
  it("finds rivals in the same competition, never the club itself", () => {
    const rivals = derbyRivals(world, giant.id);
    expect(rivals.length).toBeGreaterThan(0);
    for (const id of rivals) {
      expect(id).not.toBe(giant.id);
      expect(world.clubs[id].competitionId).toBe(giant.competitionId);
    }
  });

  it("gives a club the same rivals in every career, because a derby is not rolled", () => {
    expect(derbyRivals(world, giant.id)).toEqual(derbyRivals(world, giant.id));
  });

  it("picks opponents of comparable stature", () => {
    const reputation = giant.international_reputation;
    for (const id of derbyRivals(world, giant.id)) {
      expect(Math.abs(world.clubs[id].international_reputation - reputation)).toBeLessThanOrEqual(1);
    }
  });

  it("returns nothing for a club that is not in the world", () => {
    expect(derbyRivals(world, "no-such-club")).toEqual([]);
  });
});

describe("splitting a season between the player and the model", () => {
  const rate = shotScoringRate(78);

  it("gives back exactly what it took, at every level of club", () => {
    for (const budget of [0.005, 0.03, 0.1, 0.25, 0.45, 0.7]) {
      const { reach, residual } = splitSeason(budget, [rate]);
      // reach * rate is what the shot is worth; the rest is rolled at `residual`.
      expect(reach[0] * rate + (1 - reach[0]) * residual).toBeCloseTo(budget, 10);
    }
  });

  it("balances a two-stage cup the same way", () => {
    const budget = 0.2;
    const stages = [rate, rate * rate];
    const { reach, residual } = splitSeason(budget, stages);
    const viaFinal = reach[0] * stages[0];
    const viaSemi = (1 - reach[0]) * reach[1] * stages[1];
    const viaRoll = (1 - reach[0]) * (1 - reach[1]) * residual;
    expect(viaFinal + viaSemi + viaRoll).toBeCloseTo(budget, 10);
  });

  it("rations drama, so no career is one shoot-out after another", () => {
    // A club that wins the league seven years in ten still only plays for it in 45%.
    expect(splitSeason(0.7, [rate]).reach[0]).toBeLessThanOrEqual(0.45);
    expect(splitSeason(0.7, [rate]).residual).toBeGreaterThan(0.7);
  });

  it("does not stage a decider for something that was never going to happen", () => {
    expect(splitSeason(0, [rate])).toEqual({ reach: [0], residual: 0 });
  });

  it("scores better shots for better players, which is what the split then pays out", () => {
    expect(shotScoringRate(90)).toBeGreaterThan(shotScoringRate(60));
    expect(shotScoringRate(50)).toBeCloseTo(1 / 3 + (2 / 3) * NAILED_FROM_OVR(50), 10);
  });
});

describe("which matches a season is about", () => {
  it("never opens more than three, in order of what is at stake", () => {
    const { fixtures } = seasonFixtures(context(giant, { calledUp: true, ovr: 88 }));
    expect(fixtures.length).toBeLessThanOrEqual(MATCHES_PER_SEASON);
    for (let i = 1; i < fixtures.length; i += 1) {
      expect(FIXTURE_KINDS[fixtures[i - 1].kind].weight).toBeGreaterThanOrEqual(
        FIXTURE_KINDS[fixtures[i].kind].weight,
      );
    }
  });

  it("gives every fixture the trophy it settles and its place in the order", () => {
    const { fixtures } = seasonFixtures(context(giant));
    fixtures.forEach((fixture, index) => {
      expect(fixture.index).toBe(index);
      expect(fixture.decides).toBe(FIXTURE_KINDS[fixture.kind].decides);
      expect(fixture.id).toContain(fixture.kind);
    });
  });

  it("scales back the roll of a trophy whose decider took a real bite out of it", () => {
    const mid = clubWhere((club) => club.international_reputation === 3);
    for (let season = 0; season < 12; season += 1) {
      const { fixtures, modifiers } = seasonFixtures(context(mid, { season }));
      const staged = new Set(fixtures.map((fixture) => fixture.decides));
      for (const trophy of ["league", "cup"]) {
        if (staged.has(trophy)) continue;
        expect(modifiers.titleMultipliers[trophy]).toBeLessThan(1);
      }
    }
  });

  it("scales the roll UP for a giant, whose league one shot could never carry", () => {
    // Winning the league seven years in ten is more than a 40% shot is worth, so the
    // seasons that do not come down to a match have to be likelier than they ever were.
    const scaled = [];
    for (let season = 0; season < 12; season += 1) {
      const { fixtures, modifiers } = seasonFixtures(context(giant, { season, ovr: 86 }));
      if (fixtures.some((fixture) => fixture.decides === "league")) continue;
      scaled.push(modifiers.titleMultipliers.league);
    }
    expect(scaled.length).toBeGreaterThan(0);
    for (const multiplier of scaled) expect(multiplier).toBeGreaterThan(1);
  });

  it("plays for promotion in the second tier and for survival at the bottom of the first", () => {
    const promotion = [];
    const survival = [];
    for (let season = 0; season < 60; season += 1) {
      promotion.push(
        ...seasonFixtures(context(secondTier, { season, ovr: 66 })).fixtures.map((f) => f.kind),
      );
      survival.push(
        ...seasonFixtures(context(minnow, { season, ovr: 62 })).fixtures.map((f) => f.kind),
      );
    }
    expect(promotion).toContain("ascenso");
    expect(survival).toContain("salvacion");
    expect(promotion).not.toContain("salvacion");
    expect(survival).not.toContain("ascenso");
  });

  it("only plays national finals when the player is actually called up", () => {
    const national = [];
    for (let season = 0; season < 24; season += 1) {
      national.push(
        ...seasonFixtures(
          context(giant, { season, ovr: 90, age: 22 + (season % 8), calledUp: false }),
        ).fixtures.map((f) => f.kind),
      );
    }
    expect(national).not.toContain("final_mundial");
    expect(national).not.toContain("final_continental_nt");
  });

  it("is a pure function of the seed", () => {
    expect(seasonFixtures(context(giant))).toEqual(seasonFixtures(context(giant)));
  });

  it("has nothing to play when there is no club", () => {
    expect(seasonFixtures(context(giant, { club: null })).fixtures).toEqual([]);
  });
});

describe("the shot", () => {
  const fixture = { id: "4-final_continental", kind: "final_continental", decides: "continental_a" };
  const shot = (overrides = {}) =>
    shotFor({ seed: "shot", season: 4, fixture, ovr: 70, ...overrides });

  it("offers the placements of its own shot type and hides where the keeper is not", () => {
    const drawn = shot();
    expect(SHOT_TYPES[drawn.type]).toEqual(drawn.options);
    expect(drawn.gap).toBeGreaterThanOrEqual(0);
    expect(drawn.gap).toBeLessThan(drawn.options.length);
  });

  it("is the same shot for the same seed, so a career replays identically", () => {
    expect(shot()).toEqual(shot());
    expect(shot({ seed: "other" }).gap === shot().gap && shot({ seed: "other" }).type === shot().type)
      .toBeDefined();
  });

  it("never rules out the option that would have scored", () => {
    for (let season = 0; season < 200; season += 1) {
      const drawn = shotFor({ seed: `hint-${season}`, season, fixture, ovr: 92 });
      if (drawn.ruledOut !== null) expect(drawn.ruledOut).not.toBe(drawn.gap);
    }
  });

  it("gives a better player the read more often", () => {
    const reads = (ovr) => {
      let count = 0;
      for (let season = 0; season < 300; season += 1) {
        if (shotFor({ seed: `read-${season}`, season, fixture, ovr }).ruledOut !== null) count += 1;
      }
      return count;
    };
    expect(reads(90)).toBeGreaterThan(reads(60));
    // And it is a read, not a gift: at 62 OVR there is nothing to read with.
    expect(HINT_FROM_OVR(62)).toBe(0);
    expect(HINT_FROM_OVR(99)).toBeLessThanOrEqual(0.6);
  });

  it("keeps the bailout small at every level", () => {
    expect(NAILED_FROM_OVR(50)).toBeLessThanOrEqual(0.14);
    expect(NAILED_FROM_OVR(99)).toBeLessThanOrEqual(0.14);
    expect(NAILED_FROM_OVR(99)).toBeGreaterThan(NAILED_FROM_OVR(60));
  });
});

describe("resolving a shot", () => {
  const base = { options: ["izquierda", "centro", "derecha"], gap: 1, nailed: false, ruledOut: null };

  it("scores when it finds the gap", () => {
    const result = resolveShot(base, "centro");
    expect(result.foundGap).toBe(true);
    expect(result.scored).toBe(true);
    expect(result.nailedIt).toBe(false);
  });

  it("is saved when it does not, unless the player was good enough anyway", () => {
    expect(resolveShot(base, "izquierda").scored).toBe(false);
    const nailed = resolveShot({ ...base, nailed: true }, "izquierda");
    expect(nailed.scored).toBe(true);
    expect(nailed.foundGap).toBe(false);
    expect(nailed.nailedIt).toBe(true);
  });

  it("records what was chosen, so the report can print it", () => {
    expect(resolveShot(base, "derecha").choice).toBe("derecha");
    expect(resolveShot(base, "derecha").picked).toBe(2);
  });
});

describe("what the shots do to the season", () => {
  const shotOn = (decides, scored) => ({ decides, scored });

  it("hands over a trophy that was scored and denies one that was not", () => {
    const won = matchEffects([shotOn("league", true)]);
    expect(won.guaranteedTitles).toContain("league");
    expect(won.deniedTitles).toEqual([]);

    const lost = matchEffects([shotOn("continental_a", false)]);
    expect(lost.deniedTitles).toContain("continental_a");
    expect(lost.guaranteedTitles).toEqual([]);
  });

  it("counts every goal, and the derby's twice over so the press can tell them apart", () => {
    const effects = matchEffects([shotOn("derby", true), shotOn("cup", true), shotOn("cup", false)]);
    expect(effects.bonusGoals).toBe(2);
    expect(effects.derbyGoals).toBe(1);
  });

  it("puts a semi-final into the odds rather than into the cabinet", () => {
    const multipliers = { scored: { continental_a: 4 }, missed: { continental_a: 0 } };
    const through = matchEffects([{ ...shotOn("semifinal", true), multipliers }]);
    expect(through.guaranteedTitles).toEqual([]);
    expect(through.titleMultipliers.continental_a).toBe(4);

    const out = matchEffects([{ ...shotOn("semifinal", false), multipliers }]);
    expect(out.titleMultipliers.continental_a).toBe(0);
  });

  it("settles a national final in both directions, so a miss is not a free reroll", () => {
    expect(matchEffects([shotOn("world_cup", true)]).guaranteedNationalTitles).toContain("world_cup");
    expect(matchEffects([shotOn("world_cup", false)]).deniedNationalTitles).toContain("world_cup");
  });

  it("settles promotion and relegation outright", () => {
    expect(matchEffects([shotOn("promotion", true)]).forcePromotion).toBe(true);
    expect(matchEffects([shotOn("promotion", false)]).forcePromotion).toBe(false);
    expect(matchEffects([shotOn("survival", true)]).forceRelegation).toBe(false);
    expect(matchEffects([shotOn("survival", false)]).forceRelegation).toBe(true);
  });

  it("leaves a season with no big matches exactly as it was", () => {
    const effects = matchEffects([]);
    expect(effects.guaranteedTitles).toEqual([]);
    expect(effects.deniedTitles).toEqual([]);
    expect(effects.forcePromotion).toBeNull();
    expect(effects.forceRelegation).toBeNull();
    expect(effects.bonusGoals).toBe(0);
  });
});

describe("the engine honours what happened on the pitch", () => {
  const stateAt = (club, modifiers, seed = "engine-bigmatch") => ({
    seed,
    surname: "MOLINA",
    number: 9,
    foot: "left",
    country: "ESP",
    position: "DC",
    group: "attack",
    mode: "intensa",
    profile: "normal",
    age: 27,
    ovr: 82,
    value: 0,
    clubId: club.id,
    lastRole: "titular",
    idolatry: {},
    betrayed: {},
    titleClubs: {},
    benchStreak: 0,
    lowRotationStreak: 0,
    clubWantsOut: false,
    seasonsAtClub: 3,
    wonContinentalALastSeason: false,
    modifiers,
    pendingOvr: 0,
    history: [],
    trophies: [],
    awards: [],
    nationalCaps: 0,
    retired: false,
  });

  it("puts a trophy decided on the pitch in the cabinet, marked as such", () => {
    const modifiers = { titleMultipliers: {}, ...matchEffects([{ decides: "cup", scored: true }]) };
    const { record } = simulateSeason(stateAt(giant, modifiers), world, { season: 6 });
    const cup = record.titles.find((title) => title.trophy === "cup");
    expect(cup).toBeTruthy();
    expect(cup.decidedOnThePitch).toBe(true);
    expect(cup.earned).toBe(true);
  });

  it("keeps a trophy off the shelf when the shot was saved", () => {
    const modifiers = { titleMultipliers: {}, ...matchEffects([{ decides: "cup", scored: false }]) };
    const { record } = simulateSeason(stateAt(giant, modifiers), world, { season: 6 });
    expect(record.titles.some((title) => title.trophy === "cup")).toBe(false);
  });

  it("adds the goals from the big matches to the season", () => {
    const quiet = simulateSeason(stateAt(giant, { titleMultipliers: {} }), world, { season: 6 });
    const scored = simulateSeason(
      stateAt(giant, {
        titleMultipliers: {},
        ...matchEffects([
          { decides: "derby", scored: true },
          { decides: "league", scored: true },
        ]),
      }),
      world,
      { season: 6 },
    );
    expect(scored.record.goals).toBe(quiet.record.goals + 2);
    expect(scored.record.bigMatchGoals).toBe(2);
  });

  it("does not credit goals to a season the player spent suspended", () => {
    const { record } = simulateSeason(
      stateAt(giant, {
        titleMultipliers: {},
        suspended: true,
        ...matchEffects([{ decides: "league", scored: true }]),
      }),
      world,
      { season: 6 },
    );
    expect(record.matches).toBe(0);
    expect(record.goals).toBe(0);
    expect(record.titles).toEqual([]);
  });

  it("sends a club down when the survival match was lost", () => {
    const modifiers = {
      titleMultipliers: {},
      ...matchEffects([{ decides: "survival", scored: false }]),
    };
    const state = { ...stateAt(minnow, modifiers), ovr: 62 };
    expect(simulateSeason(state, world, { season: 6 }).record.relegated).toBe(true);
  });
});

/**
 * The load-bearing claim of the whole module: shots change WHO decides a season, not how
 * many seasons go your way. Both arms below share a seed per season, so the ordinary title
 * rolls line up and what is being measured is the deciders, not sampling noise.
 */
describe("big matches do not hand out silverware", () => {
  const SEASONS = 1500;

  const stateFor = (club, modifiers, seed, ovr) => ({
    seed,
    surname: "MOLINA",
    number: 9,
    foot: "left",
    country: "ESP",
    position: "DC",
    group: "attack",
    mode: "intensa",
    profile: "normal",
    age: 27,
    ovr,
    value: 0,
    clubId: club.id,
    lastRole: "titular",
    idolatry: {},
    betrayed: {},
    titleClubs: {},
    benchStreak: 0,
    lowRotationStreak: 0,
    clubWantsOut: false,
    seasonsAtClub: 3,
    wonContinentalALastSeason: false,
    modifiers,
    pendingOvr: 0,
    history: [],
    trophies: [],
    awards: [],
    nationalCaps: 0,
    retired: false,
  });

  /** A player with no information the model has not given him: he guesses. */
  const guess = (seed, season, fixture, ovr) => {
    const shot = shotFor({ seed, season, fixture, ovr });
    const live = shot.options.filter((_, index) => index !== shot.ruledOut);
    const stream = createStream(seed, "guess", fixture.id);
    const pick = live[Math.floor(stream() * live.length)];
    return {
      ...resolveShot(shot, pick),
      decides: fixture.decides,
      national: fixture.national,
      multipliers: fixture.multipliers ?? null,
    };
  };

  const measure = (club, ovr, { withMatches }) => {
    const tally = { league: 0, cup: 0, continental_a: 0, relegated: 0, scored: 0, shots: 0 };

    for (let season = 0; season < SEASONS; season += 1) {
      const seed = `montecarlo-${season}`;
      let modifiers = { titleMultipliers: {} };

      if (withMatches) {
        const plan = seasonFixtures({
          seed,
          season,
          club,
          competition: world.competitions[club.competitionId] ?? null,
          country: world.countries.ESP ?? null,
          ovr,
          age: 27,
          effectiveReputation: (key) => effectiveReputation(club, ovr, key),
          calledUp: false,
          rivals: derbyRivals(world, club.id),
        });
        const results = plan.fixtures.map((fixture) => guess(seed, season, fixture, ovr));
        tally.shots += results.length;
        tally.scored += results.filter((result) => result.scored).length;

        const effects = matchEffects(results);
        const multipliers = {};
        for (const source of [plan.modifiers.titleMultipliers, effects.titleMultipliers]) {
          for (const [trophy, value] of Object.entries(source ?? {})) {
            multipliers[trophy] = (multipliers[trophy] ?? 1) * value;
          }
        }
        modifiers = { ...plan.modifiers, ...effects, titleMultipliers: multipliers };
      }

      const { record } = simulateSeason(stateFor(club, modifiers, seed, ovr), world, { season });
      for (const title of record.titles) {
        if (title.trophy in tally) tally[title.trophy] += 1;
      }
      if (record.relegated) tally.relegated += 1;
    }
    return tally;
  };

  it("wins a mid-table side the same trophies it always won", () => {
    const mid = clubWhere((club) => club.international_reputation === 3);
    const before = measure(mid, 80, { withMatches: false });
    const after = measure(mid, 80, { withMatches: true });

    for (const trophy of ["league", "cup", "continental_a"]) {
      const drift = Math.abs(after[trophy] - before[trophy]) / SEASONS;
      expect(drift).toBeLessThan(0.04);
    }
  });

  it("wins a giant the same trophies too, where the odds are too high for one shot", () => {
    const before = measure(giant, 86, { withMatches: false });
    const after = measure(giant, 86, { withMatches: true });

    for (const trophy of ["league", "cup", "continental_a"]) {
      const drift = Math.abs(after[trophy] - before[trophy]) / SEASONS;
      expect(drift).toBeLessThan(0.05);
    }
  });

  it("sends a small club down as often as it ever did", () => {
    const before = measure(minnow, 64, { withMatches: false });
    const after = measure(minnow, 64, { withMatches: true });
    expect(Math.abs(after.relegated - before.relegated) / SEASONS).toBeLessThan(0.03);
  });

  it("scores a guessing player about as often as the split assumed", () => {
    const mid = clubWhere((club) => club.international_reputation === 3);
    const tally = measure(mid, 80, { withMatches: true });
    expect(tally.shots).toBeGreaterThan(SEASONS);
    expect(tally.scored / tally.shots).toBeCloseTo(shotScoringRate(80), 1);
  });
});
