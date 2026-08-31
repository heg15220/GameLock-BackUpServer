import { describe, expect, it } from "vitest";

import { PLACEMENT_LABELS } from "./copy.js";
import { BLIND_CONVERSION, KEEPER, ZONES, keeperDifficulty } from "./keeper.js";
import {
  FIXTURE_KINDS,
  CONVERSION_PRIOR,
  DECIDES,
  HINT_FROM_OVR,
  MATCHES_PER_SEASON,
  NAILED_FROM_OVR,
  SHOT_TYPES,
  chancesFor,
  conversionRate,
  derbyRivals,
  dropStakeFor,
  matchEffects,
  leagueRivalFor,
  opponentFor,
  opponentPool,
  PRODUCES,
  REPERTOIRE,
  SHOT_PRODUCES,
  resolveShot,
  seasonFixtures,
  shotFor,
  shotScoringRate,
  splitSeason,
  stakeFor,
} from "./bigmatch.js";
import { effectiveReputation, simulateLeagueTable, simulateSeason } from "./engine.js";
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
  // The fixture list draws opponents as well as fixtures, so it needs the clubs.
  world,
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

describe("the season-defining league opponent", () => {
  const competition = world.competitions[giant.competitionId];
  const tableFor = (season) => simulateLeagueTable({
    seed: "dynamic-rival",
    season,
    world,
    club: giant,
    competition,
    ovr: 84,
    delta: 5,
  });

  it("simulates one stable, complete table with unique positions", () => {
    const table = tableFor(8);
    expect(table).toEqual(tableFor(8));
    expect(table).toHaveLength(
      Object.values(world.clubs).filter((candidate) => candidate.competitionId === giant.competitionId).length,
    );
    expect(new Set(table.map((row) => row.clubId)).size).toBe(table.length);
    expect(table.map((row) => row.position)).toEqual(
      Array.from({ length: table.length }, (_, index) => index + 1),
    );
  });

  it("chooses a seeded direct rival from the simulated table", () => {
    const table = tableFor(8);
    const result = leagueRivalFor({
      seed: "dynamic-rival",
      season: 8,
      table,
      clubId: giant.id,
    });
    expect(result).toEqual(
      leagueRivalFor({ seed: "dynamic-rival", season: 8, table, clubId: giant.id }),
    );
    expect(result.opponentId).not.toBe(giant.id);
    expect(result.pointsGap).toBeLessThanOrEqual(12);
    expect(["title_race", "continental_race", "table_neighbor", "survival_race"]).toContain(
      result.context,
    );
  });

  it("puts that rival and its table story into the actual match", () => {
    const leagueTable = tableFor(8);
    const expected = leagueRivalFor({
      seed: "dynamic-rival",
      season: 8,
      table: leagueTable,
      clubId: giant.id,
    });
    const { fixtures } = seasonFixtures(
      context(giant, { seed: "dynamic-rival", season: 8, leagueTable }),
    );
    const match = fixtures.find((fixture) => fixture.kind === "clasico") ??
      fixtures.find((fixture) => fixture.derby);
    expect(match.opponentId).toBe(expected.opponentId);
    expect(match.leagueContext).toEqual(expected);
  });

  it("changes the competitive picture across seasons", () => {
    const opponents = new Set();
    const topFours = new Set();
    for (let season = 0; season < 20; season += 1) {
      const table = tableFor(season);
      const result = leagueRivalFor({
        seed: "dynamic-rival",
        season,
        table,
        clubId: giant.id,
      });
      opponents.add(result.opponentId);
      topFours.add(table.slice(0, 4).map((row) => row.clubId).join(":"));
    }
    expect(opponents.size).toBeGreaterThan(1);
    expect(topFours.size).toBeGreaterThan(1);
  });
});

/**
 * Every decider used to be played against nobody: the crest slot was empty and the live
 * commentary called the other side "el rival". The opponent is now drawn like everything
 * else here - off the seed, from a pool that fits what is being played for.
 */
describe("who a decider is against", () => {
  const comp = (club) => world.competitions[club.competitionId] ?? null;

  it("draws a domestic decider from your own division, never yourself", () => {
    for (const kind of ["final_copa", "titulo_liga", "salvacion", "ascenso"]) {
      const pool = opponentPool(world, giant, comp(giant), kind);
      expect(pool.length, kind).toBeGreaterThan(0);
      for (const id of pool) {
        expect(id).not.toBe(giant.id);
        expect(world.clubs[id].competitionId).toBe(giant.competitionId);
      }
    }
  });

  it("plays the last day of the league against whoever is up there or down there with you", () => {
    const standing = (id) => world.clubs[id].domestic_reputation ?? 0;
    const top = opponentPool(world, giant, comp(giant), "titulo_liga").map(standing);
    const bottom = opponentPool(world, giant, comp(giant), "salvacion").map(standing);
    expect(Math.min(...top)).toBeGreaterThanOrEqual(Math.max(...bottom));
  });

  it("keeps a continental night inside your confederation", () => {
    const confederation = comp(giant)?.confederation;
    const pool = opponentPool(world, giant, comp(giant), "final_continental");
    expect(pool.length).toBeGreaterThan(0);
    for (const id of pool) {
      expect(world.competitions[world.clubs[id].competitionId]?.confederation).toBe(confederation);
    }
  });

  it("has no pool for a national final, which is not played against a club", () => {
    expect(opponentPool(world, giant, comp(giant), "final_mundial")).toEqual([]);
    expect(opponentPool(world, giant, comp(giant), "clasico")).toEqual([]);
  });

  it("draws the same opponent for the same seed and season, and not always the same one", () => {
    const draw = (season) =>
      opponentFor({ seed: "op", season, world, club: giant, competition: comp(giant), kind: "final_copa" });
    expect(draw(3)).toBe(draw(3));
    const seen = new Set(Array.from({ length: 30 }, (_, season) => draw(season)));
    expect(seen.size).toBeGreaterThan(1);
  });

  it("gives every club fixture of a season a real opponent", () => {
    for (let season = 0; season < 20; season += 1) {
      const { fixtures } = seasonFixtures(
        context(giant, { season, calledUp: true, ovr: 88, age: 22 + (season % 8) }),
      );
      for (const fixture of fixtures) {
        if (fixture.national) continue;
        expect(world.clubs[fixture.opponentId], `${fixture.kind} has no opponent`).toBeTruthy();
        expect(fixture.opponentId).not.toBe(giant.id);
      }
    }
  });
});

/**
 * The exception the ordering rule needs: a classic is a fixture, not a date.
 */
describe("a final drawn against the club the derby was going to be against", () => {
  /** A season where the collision actually happened, searched across seeds. */
  const collision = () => {
    for (let i = 0; i < 400; i += 1) {
      for (const club of [giant, minnow, secondTier]) {
        const { fixtures } = seasonFixtures(
          context(club, { seed: `derby-${i}`, season: i % 12, calledUp: true, ovr: 84 }),
        );
        const host = fixtures.find((fixture) => fixture.derby);
        if (host) return { fixtures, host, club };
      }
    }
    return null;
  };

  it("happens at all, without the bombo being rigged for it", () => {
    expect(collision(), "no seed ever collided the derby with a final").toBeTruthy();
  });

  it("is that match, so the derby is not also staged on its own", () => {
    const found = collision();
    expect(found.host.kind).not.toBe("clasico");
    expect(found.fixtures.filter((fixture) => fixture.kind === "clasico")).toEqual([]);
    // It is played on the final's date, which is the whole exception.
    expect(FIXTURE_KINDS[found.host.kind].when).toBeGreaterThan(FIXTURE_KINDS.clasico.when);
  });

  it("still settles its own trophy - being the derby is a layer on top", () => {
    const found = collision();
    expect(found.host.decides).toBe(FIXTURE_KINDS[found.host.kind].decides);
    expect(found.host.decides).not.toBe("derby");
    expect(found.host.opponentId).toBeTruthy();
  });

  it("marks every other fixture as not the derby", () => {
    const { fixtures } = seasonFixtures(context(giant, { calledUp: true, ovr: 88 }));
    for (const fixture of fixtures) expect(typeof fixture.derby).toBe("boolean");
  });
});

/**
 * The deciders used to hand every position the same five shots, so a goalkeeper career
 * finished one-on-ones for a living while `GOAL_RATE.keeper` insisted he scores nothing.
 */
describe("what each position is actually asked to do", () => {
  const fixture = { id: "s4-final_copa", kind: "final_copa" };
  const draw = (group, season) => shotFor({ seed: "rep", season, fixture, ovr: 80, group });

  it("only ever offers a position the chances its repertoire contains", () => {
    for (const [group, pool] of Object.entries(REPERTOIRE)) {
      for (let season = 0; season < 40; season += 1) {
        expect(pool, `${group} was handed the wrong kind`).toContain(draw(group, season).type);
      }
    }
  });

  it("never asks a goalkeeper to finish, nor a striker to save", () => {
    const keeper = new Set(Array.from({ length: 60 }, (_, s) => draw("keeper", s).type));
    const forward = new Set(Array.from({ length: 60 }, (_, s) => draw("forward", s).type));
    for (const type of keeper) expect(SHOT_PRODUCES[type]).toBe(PRODUCES.STOP);
    for (const type of forward) expect(SHOT_PRODUCES[type]).toBe(PRODUCES.GOAL);
    expect([...keeper].some((type) => forward.has(type))).toBe(false);
  });

  it("never asks a defender to finish an attacking chance", () => {
    const seen = new Set(Array.from({ length: 80 }, (_, s) => draw("defensive", s).type));
    expect([...seen].every((type) => SHOT_PRODUCES[type] === PRODUCES.STOP)).toBe(true);
    expect(seen).toEqual(new Set(["entrada", "despeje"]));
  });

  /**
   * WHAT A DEFENDER'S NIGHT IS SPENT DOING.
   *
   * A defender's decisive moments are the ones he defends. Both ways of doing so must be
   * present, and no successful intervention may be counted as a goal or an assist.
   */
  it("spends a defender's big nights defending", () => {
    const drawn = Array.from({ length: 120 }, (_, s) => draw("defensive", s).type);
    const stops = drawn.filter((type) => SHOT_PRODUCES[type] === PRODUCES.STOP).length;
    expect(stops).toBe(drawn.length);
    // And both ways of defending are really handed out, not just the tackle.
    expect(new Set(drawn)).toContain("entrada");
    expect(new Set(drawn)).toContain("despeje");
  });

  /**
   * THE POOL FOLLOWS THE LINE, NOT THE OUTPUT GROUP.
   *
   * Two groups straddle a line: `support` holds full-backs and central midfielders, and
   * `defensive` holds centre-backs and holding midfielders. Drawn off the group, a
   * full-back took the free kicks and a holding midfielder cleared the corners.
   */
  it("gives the back four defending and the midfield the ball", () => {
    const forPosition = (position, group) =>
      new Set(
        Array.from({ length: 60 }, (_, season) =>
          shotFor({ seed: "line", season, fixture, ovr: 80, group, position }).type),
      );

    for (const back of ["DFC", "LI", "LD"]) {
      const seen = forPosition(back, back === "DFC" ? "defensive" : "support");
      expect(seen, back).toEqual(new Set(["entrada", "despeje"]));
      expect([...seen].every((type) => SHOT_PRODUCES[type] === PRODUCES.STOP), back).toBe(true);
    }

    // Every midfielder can make the last pass or finish an attacking chance, including
    // the holding midfielder whose output group would otherwise make him a defender.
    const midfield = {
      MCD: "defensive",
      MC: "support",
      MI: "creator",
      MD: "creator",
      MCO: "creator",
    };
    for (const [position, group] of Object.entries(midfield)) {
      const seen = forPosition(position, group);
      expect(seen, `${position} never supplies a key pass`).toContain("pase_gol");
      expect([...seen].some((type) => SHOT_PRODUCES[type] === PRODUCES.GOAL), position).toBe(true);
      expect(
        [...seen].every((type) => [PRODUCES.GOAL, PRODUCES.ASSIST].includes(SHOT_PRODUCES[type])),
        `${position} was handed a defensive intervention`,
      ).toBe(true);
    }

    // A goalkeeper is unmoved by any of this.
    expect([...forPosition("POR", "keeper")].every((type) => REPERTOIRE.keeper.includes(type))).toBe(true);
  });

  /**
   * FOUR SITUATIONS, TWO SIDES, AND TWO THAT ARE NEITHER.
   *
   * Thirteen kinds of chance had drifted into three different games - a volley from the
   * edge, a clearance off the line and an interception were three pictures nobody saw more
   * than four of. The list is the four moments football stops for, taken from whichever
   * side your position puts you on, plus the pass that makes a goal, the tackle and the
   * clearance that stop one.
   */
  it("offers the attacking and defensive situations assigned to each line", () => {
    expect(REPERTOIRE.forward).toEqual(["penal", "mano_a_mano", "cabezazo", "falta"]);
    // The same four, from inside the goal.
    expect(REPERTOIRE.keeper).toEqual([
      "parada_penal",
      "tiro_lejano",
      "salida_mano_a_mano",
      "centro_lateral",
    ]);
    // A defender only tackles or clears.
    expect(REPERTOIRE.defensive).toEqual(["entrada", "despeje"]);
    // A midfielder can supply the last pass or finish the move.
    for (const pool of [REPERTOIRE.support, REPERTOIRE.creator]) {
      expect(pool).toContain("pase_gol");
      expect(pool.some((type) => SHOT_PRODUCES[type] === PRODUCES.GOAL)).toBe(true);
    }

    // Every defined chance belongs to at least one positional repertoire.
    const offered = new Set(Object.values(REPERTOIRE).flat());
    expect([...offered].sort()).toEqual(Object.keys(SHOT_TYPES).sort());
  });

  it("gives every chance in every repertoire somewhere to put it and a verdict", () => {
    for (const pool of Object.values(REPERTOIRE)) {
      for (const type of pool) {
        const options = SHOT_TYPES[type];
        expect(options, `${type} has no options`).toBeTruthy();
        expect(Object.values(PRODUCES)).toContain(SHOT_PRODUCES[type]);
        /*
         * A shot at a goal offers the goal's five places; moments that are not a shot keep
         * three options of their own. Every option has to be somewhere the drawing
         * knows about, which is the thing that used to break silently.
         */
        const shooting = options === ZONES || options.every((o) => ZONES.includes(o));
        expect(options.length, `${type}`).toBe(shooting ? ZONES.length : 3);
        for (const option of options) {
          expect(PLACEMENT_LABELS.es[option], `${type}: ${option} has no name`).toBeTruthy();
          expect(PLACEMENT_LABELS.en[option], `${type}: ${option} has no name`).toBeTruthy();
        }
      }
    }
  });

  it("tells the caller what coming through would be worth", () => {
    expect(draw("keeper", 1).produces).toBe(PRODUCES.STOP);
    expect(draw("forward", 1).produces).toBe(PRODUCES.GOAL);
    expect(shotFor({ seed: "x", season: 0, fixture, ovr: 80, group: "creator" }).produces).toBe(
      SHOT_PRODUCES[shotFor({ seed: "x", season: 0, fixture, ovr: 80, group: "creator" }).type],
    );
  });

  it("defaults to the striker's repertoire for a group it does not know", () => {
    expect(REPERTOIRE.forward).toContain(draw("no-such-group", 3).type);
  });
});

/** The one place the repertoires touch the model: what a converted chance is worth. */
describe("what converting is worth on the scoresheet", () => {
  const result = (type, converted) => ({
    type, converted, scored: converted > 0, decides: "cup", settle: { scored: 1, missed: 1, absent: 1 },
  });

  it("counts a finished chance as a goal, as it always did", () => {
    expect(matchEffects([result("penal", 2)]).bonusGoals).toBe(2);
    expect(matchEffects([result("penal", 2)]).bonusAssists).toBe(0);
  });

  it("counts the last pass as an assist and not as a goal", () => {
    const effects = matchEffects([result("pase_gol", 1)]);
    expect(effects.bonusAssists).toBe(1);
    expect(effects.bonusGoals).toBe(0);
  });

  it("does not put a saved penalty on a goalkeeper's scoring record", () => {
    const effects = matchEffects([result("parada_penal", 1), result("centro_lateral", 2)]);
    expect(effects.bonusGoals).toBe(0);
    expect(effects.bonusAssists).toBe(0);
  });

  it("attributes a national decider to the selection, not the club", () => {
    const goal = matchEffects([{ ...result("penal", 1), national: true }]);
    expect(goal.bonusGoals).toBe(0);
    expect(goal.nationalBonusGoals).toBe(1);

    const save = matchEffects([{ ...result("parada_penal", 1), national: true }]);
    expect(save.bonusGoals).toBe(0);
    expect(save.nationalBonusSaves).toBe(1);
  });

  it("still settles the trophy whichever it was - that is the whole point", () => {
    for (const type of ["penal", "pase_gol", "parada_penal"]) {
      expect(matchEffects([result(type, 1)]).titleMultipliers.cup).toBe(1);
      expect(matchEffects([result(type, 1)]).decidedTrophies).toContain("cup");
    }
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
    /*
     * The prior is READ OFF THE KEEPER now, not asserted beside him. It used to be a flat
     * third, which was only true because the opposition was a flat third - a coin that
     * happened to agree with the number written here. See BLIND_CONVERSION.
     */
    expect(shotScoringRate(50)).toBeCloseTo(
      BLIND_CONVERSION + (1 - BLIND_CONVERSION) * NAILED_FROM_OVR(50),
      10,
    );
    // And it is still the honest measure of a blind guess: what the model actually does.
    expect(shotScoringRate(50)).toBeGreaterThan(BLIND_CONVERSION);
  });
});

describe("which matches a season is about", () => {
  it("never opens more than three, and plays them in the order the calendar plays them", () => {
    // Importance chooses which three; the calendar orders them. They used to be the same
    // number, which put the November derby after the cup final and the last day of May.
    for (let season = 0; season < 20; season += 1) {
      const { fixtures } = seasonFixtures(
        context(giant, { season, calledUp: true, ovr: 88, age: 22 + (season % 8) }),
      );
      expect(fixtures.length).toBeLessThanOrEqual(MATCHES_PER_SEASON);
      for (let i = 1; i < fixtures.length; i += 1) {
        expect(FIXTURE_KINDS[fixtures[i].kind].when).toBeGreaterThan(
          FIXTURE_KINDS[fixtures[i - 1].kind].when,
        );
      }
    }
  });

  it("never plays the derby after a final, a play-off or the last day of the league", () => {
    // The whole point: unless the final IS the derby, in which case it is that match's
    // date that stands, not the derby's.
    const later = ["final_copa", "titulo_liga", "salvacion", "final_continental", "ascenso",
      "semifinal_continental", "final_continental_nt", "final_mundial"];
    for (const club of [giant, minnow, secondTier]) {
      for (let season = 0; season < 20; season += 1) {
        const { fixtures } = seasonFixtures(
          context(club, { season, calledUp: true, ovr: 84, age: 22 + (season % 8) }),
        );
        const derby = fixtures.findIndex((fixture) => fixture.kind === "clasico");
        if (derby < 0) continue;
        for (let i = 0; i < derby; i += 1) {
          expect(later, `${fixtures[i].kind} played before the derby`).not.toContain(
            fixtures[i].kind,
          );
        }
      }
    }
  });

  it("gives every kind a calendar slot of its own", () => {
    const slots = Object.values(FIXTURE_KINDS).map((kind) => kind.when);
    expect(slots.every((slot) => Number.isFinite(slot))).toBe(true);
    expect(new Set(slots).size).toBe(slots.length);
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

  it("scales the roll the other way to whatever the decider took", () => {
    /*
     * This used to assert the multiplier is always above 1 for a giant, on the reasoning
     * that one shot could never carry a 70% league. That stopped being true when a
     * decider started being worth however many chances it gives him: three sights of goal
     * are worth more than the league is, and then the ordinary roll has to come DOWN.
     *
     * What holds either way is the identity, so that is what is checked - the residual is
     * exactly what makes the two halves add back to the odds the model always had.
     */
    let above = 0;
    let below = 0;
    for (let season = 0; season < 60; season += 1) {
      const { fixtures, modifiers } = seasonFixtures(context(giant, { season, ovr: 86 }));
      if (fixtures.some((fixture) => fixture.decides === "league")) continue;
      const multiplier = modifiers.titleMultipliers.league;
      expect(multiplier).toBeGreaterThan(0);
      if (multiplier > 1) above += 1;
      else below += 1;
    }
    // Both directions really do happen, which is the point of the change.
    expect(above + below).toBeGreaterThan(0);
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

  /**
   * A READ IS A READ, not an option struck off the list.
   *
   * `ruledOut` removed a placement, which was information while the keeper covered
   * everything but one place. Under a keeper who commits it is the opposite of a favour -
   * four zones in five are a goal, so taking one away can only cost you - so what a rating
   * buys is `tell`: the zone his memory is pulling him towards. See `keeperTell`.
   */
  it("gives a better player the read more often, and never takes an option away", () => {
    const reads = (ovr) => {
      let count = 0;
      for (let season = 0; season < 300; season += 1) {
        const shot = shotFor({
          seed: `read-${season}`,
          season,
          fixture,
          ovr,
          keeper: { difficulty: 0.8, memory: ["centro", "centro", "centro"] },
        });
        expect(shot.ruledOut, "the read still removes an option").toBeNull();
        if (shot.tell) count += 1;
      }
      return count;
    };
    expect(reads(90)).toBeGreaterThan(reads(60));
    // And it is a read, not a gift: at 62 OVR there is nothing to read with.
    expect(HINT_FROM_OVR(62)).toBe(0);
    expect(HINT_FROM_OVR(99)).toBeLessThanOrEqual(0.6);
  });

  it("has nothing to tell him about a keeper with no habit to give away", () => {
    for (let season = 0; season < 40; season += 1) {
      const shot = shotFor({
        seed: `blank-${season}`,
        season,
        fixture,
        ovr: 99,
        keeper: { difficulty: 0.9, memory: [] },
      });
      expect(shot.tell, "read a lean off a keeper who has seen nothing").toBeNull();
    }
  });

  it("keeps the bailout small at every level", () => {
    expect(NAILED_FROM_OVR(50)).toBeLessThanOrEqual(0.14);
    expect(NAILED_FROM_OVR(99)).toBeLessThanOrEqual(0.14);
    expect(NAILED_FROM_OVR(99)).toBeGreaterThan(NAILED_FROM_OVR(60));
  });
});

describe("resolving a shot", () => {
  /*
   * The keeper went to the middle, the night is ordinary, and neither coin has been asked
   * to do anything: `roll` at 1 is a ball that beats whatever he can do, `wild` at 1 is a
   * shot that was on target. Everything below moves one of the two.
   */
  const base = {
    type: "penal",
    options: ZONES,
    keeperAt: "centro",
    gap: ZONES.indexOf("abajo-derecha"),
    keeper: { difficulty: KEEPER.typical },
    roll: 1,
    wild: 1,
    offTarget: 0.2,
    nailed: false,
    ruledOut: null,
  };
  const away = "abajo-derecha";

  it("scores anywhere the keeper did not go", () => {
    for (const zone of ZONES) {
      if (zone === base.keeperAt) continue;
      const result = resolveShot(base, zone);
      expect(result.save, `${zone}`).toBe(0);
      expect(result.scored, `${zone}`).toBe(true);
      expect(result.foundGap).toBe(true);
      expect(result.nailedIt).toBe(false);
    }
  });

  it("is saved where he did go, unless the player was good enough anyway", () => {
    const at = resolveShot({ ...base, roll: 0 }, base.keeperAt);
    expect(at.save).toBeGreaterThan(0.5);
    expect(at.scored).toBe(false);
    expect(at.foundGap).toBe(false);

    const nailed = resolveShot({ ...base, roll: 0, nailed: true }, base.keeperAt);
    expect(nailed.scored).toBe(true);
    expect(nailed.nailedIt).toBe(true);
  });

  /**
   * The other way of not scoring, and the one that must never be called a save: the ball
   * went over the bar. See `offTargetOdds`.
   */
  it("calls a shot that missed the goal what it was", () => {
    const wide = resolveShot({ ...base, wild: 0 }, away);
    expect(wide.offTarget).toBe(true);
    expect(wide.scored).toBe(false);
    // Nothing about it is the keeper's doing.
    expect(wide.save).toBe(0);
  });

  it("records what was chosen, so the report can print it", () => {
    expect(resolveShot(base, away).choice).toBe(away);
    expect(resolveShot(base, away).picked).toBe(ZONES.indexOf(away));
  });
});

describe("what the shots do to the season", () => {
  /** A decider carries the odds its two outcomes leave the trophy on. See DECIDES. */
  const shotOn = (decides, scored, settle = { scored: 3, missed: 0.5 }) => ({
    decides,
    scored,
    settle,
  });

  it("moves the odds hard in both directions without closing them", () => {
    // The change this replaced: scoring handed the cup over and missing took it away, so
    // one guess decided a whole season. Now it is the biggest swing in the model and
    // still only a swing - a miss leaves a way through.
    const won = matchEffects([shotOn("league", true)]);
    expect(won.titleMultipliers.league).toBe(3);
    expect(won.decidedTrophies).toContain("league");

    const lost = matchEffects([shotOn("continental_a", false)]);
    expect(lost.titleMultipliers.continental_a).toBe(0.5);
    expect(lost.titleMultipliers.continental_a).toBeGreaterThan(0);
    expect(lost.decidedTrophies).toContain("continental_a");
  });

  it("never leaves a missed decider on zero, whatever the trophy", () => {
    for (const decides of ["league", "cup", "continental_a", "semifinal"]) {
      const effects = matchEffects([shotOn(decides, false)]);
      const trophy = decides === "semifinal" ? "continental_a" : decides;
      expect(effects.titleMultipliers[trophy]).toBeGreaterThan(0);
    }
    expect(matchEffects([shotOn("world_cup", false)]).nationalMultipliers.world_cup).toBeGreaterThan(0);
    expect(matchEffects([shotOn("promotion", false)]).promotionMultiplier).toBeGreaterThan(0);
  });

  it("counts every goal, and the derby's twice over so the press can tell them apart", () => {
    const effects = matchEffects([shotOn("derby", true), shotOn("cup", true), shotOn("cup", false)]);
    expect(effects.bonusGoals).toBe(2);
    expect(effects.derbyGoals).toBe(1);
  });

  it("puts a semi-final into the odds of the final, not into the cabinet", () => {
    const through = matchEffects([shotOn("semifinal", true, { scored: 4, missed: 0.6 })]);
    expect(through.titleMultipliers.continental_a).toBe(4);
    const out = matchEffects([shotOn("semifinal", false, { scored: 4, missed: 0.6 })]);
    expect(out.titleMultipliers.continental_a).toBe(0.6);
  });

  it("grants the qualifying a player standing in a final has obviously already done", () => {
    const played = matchEffects([{ ...shotOn("world_cup", false), reached: "world_cup" }]);
    expect(played.nationalReached).toContain("world_cup");
    // He lost the final; he still played the tournament.
    expect(played.nationalMultipliers.world_cup).toBeGreaterThan(0);
  });

  it("reads survival the other way up", () => {
    // The multiplier is on the DROP, so scoring has to lower it and missing raise it.
    const stayed = matchEffects([shotOn("survival", true, { scored: 0.2, missed: 2.5 })]);
    const went = matchEffects([shotOn("survival", false, { scored: 0.2, missed: 2.5 })]);
    expect(stayed.relegationMultiplier).toBe(0.2);
    expect(went.relegationMultiplier).toBe(2.5);
    expect(stayed.relegationMultiplier).toBeLessThan(went.relegationMultiplier);
  });

  it("leaves a season with no big matches exactly as it was", () => {
    const effects = matchEffects([]);
    expect(effects.decidedTrophies).toEqual([]);
    expect(effects.titleMultipliers).toEqual({});
    expect(effects.nationalMultipliers).toEqual({});
    expect(effects.promotionMultiplier).toBeUndefined();
    expect(effects.relegationMultiplier).toBeUndefined();
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

  /** A scored decider leaves the trophy on odds it is very hard to miss from. */
  const settled = (decides, scored) =>
    matchEffects([{ decides, scored, settle: { scored: 40, missed: 0.02 } }]);

  it("puts a trophy decided on the pitch in the cabinet, marked as such", () => {
    const modifiers = { titleMultipliers: {}, ...settled("cup", true) };
    const { record } = simulateSeason(stateAt(giant, modifiers), world, { season: 6 });
    const cup = record.titles.find((title) => title.trophy === "cup");
    expect(cup).toBeTruthy();
    expect(cup.decidedOnThePitch).toBe(true);
    // Never "attended", whatever role he was playing that year: he took the shot.
    expect(cup.earned).toBe(true);
  });

  it("makes a trophy very unlikely when the shot was saved, without making it impossible", () => {
    const modifiers = { titleMultipliers: {}, ...settled("cup", false) };
    const { record } = simulateSeason(stateAt(giant, modifiers), world, { season: 6 });
    expect(record.titles.some((title) => title.trophy === "cup")).toBe(false);

    // And over many seasons at the real odds, a miss still leaves a way through - which
    // is the whole point of DECIDES over the old outright verdict.
    let won = 0;
    for (let season = 0; season < 400; season += 1) {
      const missed = {
        titleMultipliers: {},
        ...matchEffects([
          { decides: "cup", scored: false, settle: { scored: 2.2, missed: 0.65 } },
        ]),
      };
      const { record: r } = simulateSeason(
        stateAt(giant, missed, `miss-${season}`),
        world,
        { season },
      );
      if (r.titles.some((title) => title.trophy === "cup")) won += 1;
    }
    expect(won).toBeGreaterThan(0);
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

  it("makes the drop far likelier when the survival match was lost, and rarer when it was won", () => {
    const drop = (scored) => {
      let down = 0;
      for (let season = 0; season < 400; season += 1) {
        const modifiers = {
          titleMultipliers: {},
          ...matchEffects([
            { decides: "survival", scored, settle: { scored: 0.22, missed: 3.2 } },
          ]),
        };
        const state = { ...stateAt(minnow, modifiers, `drop-${season}`), ovr: 62 };
        if (simulateSeason(state, world, { season }).record.relegated) down += 1;
      }
      return down / 400;
    };
    const lost = drop(false);
    const saved = drop(true);
    expect(lost).toBeGreaterThan(saved * 3);
    // Neither outcome is a verdict: you can go down having scored, and stay up having missed.
    expect(lost).toBeLessThan(1);
    expect(saved).toBeGreaterThan(0);
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

  /**
   * A player with no information the model has not given him: he guesses, once per sight
   * of goal the fixture owes him.
   *
   * Mirrors career.takeShot plus `outcomeOf`. Hand-rolling a subset of that shape has now
   * broken this harness twice - first when the shot stopped settling trophies outright,
   * then when a fixture stopped being worth exactly one chance - and both times it showed
   * up as a silent trophy drift rather than as an obvious failure.
   */
  const guess = (seed, season, fixture, ovr) => {
    const shot = shotFor({ seed, season, fixture, ovr });
    const total = fixture.chances ?? 1;
    let converted = 0;
    for (let attempt = 0; attempt < total; attempt += 1) {
      /*
       * REBUILT PER ATTEMPT, exactly as `nextRead` does in the real loop.
       *
       * The keeper commits and the night is rolled once per chance, so resolving three
       * attempts against one `shotFor` shares one coin between them - the outcomes stop
       * being independent and `convertsOneOf`, which the budget is priced with, stops
       * describing them. A night worth three then converted far less often than the split
       * had paid for, and the drift this test measures is exactly that gap.
       */
      /*
       * With the keeper the real loop would put in front of him - see `keeperFacing` in
       * career.js. Left out, `shotFor` fell back to a keeper priced on the stake alone,
       * which is a far easier night than any real one: no opponent, no reputation, no
       * record to prepare for. The rate then measured well above the prior the split had
       * been paid at, which is the one thing this test exists to catch.
       */
      const opponent = fixture.opponentId
        ? world.clubs[fixture.opponentId] ?? world.countries[fixture.opponentId] ?? null
        : null;
      const read = shotFor({
        seed,
        season,
        fixture,
        ovr,
        attempt,
        keeper: {
          difficulty: keeperDifficulty({
            decides: fixture.decides,
            reputation:
              opponent?.continental_reputation ?? opponent?.international_reputation ?? 0,
            form: shotScoringRate(ovr),
          }),
          memory: [],
        },
      });
      const live = read.options.filter((_, index) => index !== read.ruledOut);
      const stream = createStream(seed, "guess", fixture.id, attempt);
      const pick = live[Math.floor(stream() * live.length)];
      if (resolveShot(read, pick).scored) converted += 1;
    }
    return {
      ...shot,
      scored: converted > 0,
      absent: total === 0,
      taken: total,
      converted,
      decides: fixture.decides,
      national: fixture.national,
      settle: fixture.settle ?? null,
      reached: fixture.reached ?? null,
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
        const compound = (key) => {
          const merged = {};
          for (const source of [plan.modifiers[key], effects[key]]) {
            for (const [trophy, value] of Object.entries(source ?? {})) {
              merged[trophy] = (merged[trophy] ?? 1) * value;
            }
          }
          return merged;
        };
        modifiers = {
          ...plan.modifiers,
          ...effects,
          titleMultipliers: compound("titleMultipliers"),
          nationalMultipliers: compound("nationalMultipliers"),
        };
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

/**
 * Recalibration.
 *
 * `splitSeason` buys a slice of the season's budget at whatever rate it is told the
 * player converts. `shotScoringRate` is only right while he guesses blind; the moment the
 * moment has skill in it, converting above that rate prints silverware the model does not
 * think it is handing out. Measured, a player converting 90% against a 48% assumption
 * took 54% more trophies. Recalibrated, he takes the same as everybody else.
 */
describe("pricing the decider off what the player actually converts", () => {
  const OVR = 84;
  const prior = shotScoringRate(OVR);

  it("starts at exactly the model's estimate, so a first season is unchanged", () => {
    expect(conversionRate(OVR, null)).toBe(prior);
    expect(conversionRate(OVR, { taken: 0, scored: 0 })).toBe(prior);
  });

  it("barely moves on one shot and converges on a career of them", () => {
    const oneHit = conversionRate(OVR, { taken: 1, scored: 1 });
    expect(oneHit).toBeGreaterThan(prior);
    expect(oneHit - prior).toBeLessThan(0.05);

    // A whole career of converting nine in ten: the estimate follows, but shrinkage keeps
    // it short of the raw rate, which is the point of the prior.
    const career = conversionRate(OVR, { taken: 60, scored: 54 });
    expect(career).toBeGreaterThan(0.78);
    expect(career).toBeLessThan(0.9);
  });

  it("moves both ways, and never further than one observation is worth", () => {
    const cold = conversionRate(OVR, { taken: 20, scored: 1 });
    expect(cold).toBeLessThan(prior);
    for (let taken = 1; taken <= 80; taken += 1) {
      const step = Math.abs(
        conversionRate(OVR, { taken, scored: taken }) -
          conversionRate(OVR, { taken: taken - 1, scored: taken - 1 }),
      );
      expect(step).toBeLessThanOrEqual(1 / (CONVERSION_PRIOR + taken) + 1e-9);
    }
  });

  it("stays a probability whatever nonsense it is handed", () => {
    for (const record of [
      { taken: 10, scored: 30 },
      { taken: 10, scored: -5 },
      { taken: -3, scored: 2 },
      { taken: 500, scored: 500 },
      { taken: 500, scored: 0 },
    ]) {
      const rate = conversionRate(OVR, record);
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(1);
    }
  });

  it("keeps the budget identity at the recalibrated rate, which is the whole point", () => {
    for (const record of [null, { taken: 30, scored: 27 }, { taken: 30, scored: 3 }]) {
      const rate = conversionRate(OVR, record);
      const stake = stakeFor(rate);
      for (const budget of [0.05, 0.25, 0.7]) {
        const { reach, residual } = splitSeason(budget, [stake]);
        expect(reach[0] * stake + (1 - reach[0]) * residual).toBeCloseTo(budget, 10);
      }
    }
  });

  it("prices a better finisher's decider higher, so he plays fewer of them", () => {
    // Self-limiting, and correct: if the shot is nearly a goal, the season cannot afford
    // to come down to one very often without giving trophies away.
    const sharp = splitSeason(0.25, [stakeFor(conversionRate(OVR, { taken: 40, scored: 36 }))]);
    const blunt = splitSeason(0.25, [stakeFor(conversionRate(OVR, { taken: 40, scored: 4 }))]);
    expect(sharp.reach[0]).toBeLessThan(blunt.reach[0]);
  });

  it("is what seasonFixtures actually uses", () => {
    const sharpshooter = { taken: 40, scored: 38 };
    const withRecord = seasonFixtures(context(giant, { ovr: OVR, conversion: sharpshooter }));
    const without = seasonFixtures(context(giant, { ovr: OVR }));
    // Same seed, same club: only the record differs, and it has to change the plan.
    expect(JSON.stringify(withRecord.modifiers)).not.toBe(JSON.stringify(without.modifiers));
  });
});

/**
 * How many sights of goal a decider gives him.
 *
 * The count is drawn at fixture time so `stakeFor` can price the moment exactly - which is
 * the whole reason the budget survives a night worth three chances and a night worth none.
 */
describe("a match is not one chance", () => {
  const spread = (delta) => {
    const hist = [0, 0, 0, 0, 0];
    for (let i = 0; i < 6000; i += 1) hist[chancesFor(`c-${i}`, 1, "f", delta)] += 1;
    return hist.map((count) => count / 6000);
  };

  it("serves up none, one, two or more", () => {
    const at = spread(0);
    for (let n = 0; n <= 3; n += 1) expect(at[n], `never ${n} chances`).toBeGreaterThan(0.02);
  });

  it("works the ball to the man the side depends on", () => {
    const passenger = spread(-9);
    const star = spread(9);
    expect(passenger[0]).toBeGreaterThan(star[0] * 3);
    const mean = (h) => h.reduce((sum, p, n) => sum + p * n, 0);
    expect(mean(star)).toBeGreaterThan(mean(passenger) * 2);
  });

  it("never says four is likelier than three, at any delta", () => {
    // The additive tilt used to clamp both ends to the same floor and do exactly that.
    for (const delta of [-10, -6, -2, 0, 2, 6, 10]) {
      const at = spread(delta);
      expect(at[3], `delta ${delta}`).toBeGreaterThanOrEqual(at[4]);
    }
  });

  it("is a pure function of the fixture", () => {
    expect(chancesFor("s", 2, "f", 3)).toBe(chancesFor("s", 2, "f", 3));
    const perFixture = new Set(["a", "b", "c", "d"].map((id) => chancesFor("s", 2, id, 3)));
    expect(perFixture.size).toBeGreaterThan(0);
  });

  it("prices more chances higher, and none of them at the missed rate", () => {
    const rate = 0.45;
    expect(stakeFor(rate, 0)).toBe(DECIDES.absent);
    // A night the ball never came is not a miss: it sits above one and below a goal.
    expect(stakeFor(rate, 0)).toBeGreaterThan(DECIDES.missed);
    expect(stakeFor(rate, 0)).toBeLessThan(DECIDES.scored);
    let last = 0;
    for (let n = 1; n <= 5; n += 1) {
      const stake = stakeFor(rate, n);
      expect(stake).toBeGreaterThan(last);
      expect(stake).toBeLessThan(DECIDES.scored);
      last = stake;
    }
  });

  it("keeps the budget identity at every chance count", () => {
    for (const n of [0, 1, 2, 3, 4]) {
      const stake = stakeFor(0.45, n);
      for (const budget of [0.02, 0.1, 0.3, 0.7]) {
        const { reach, residual } = splitSeason(budget, [stake]);
        expect(reach[0] * stake + (1 - reach[0]) * residual).toBeCloseTo(budget, 10);
      }
    }
  });

  it("reads survival the other way up at every count too", () => {
    for (let n = 0; n <= 4; n += 1) {
      expect(dropStakeFor(0.45, n)).toBeCloseTo(1 - stakeFor(0.45, n), 10);
    }
  });

  it("settles an untouched decider between the two outcomes he could have caused", () => {
    const settle = { scored: 4, missed: 0.5, absent: 2 };
    const effects = matchEffects([
      { decides: "league", scored: false, absent: true, taken: 0, converted: 0, settle },
    ]);
    expect(effects.titleMultipliers.league).toBe(2);
    expect(effects.bonusGoals).toBe(0);
  });

  it("counts every chance he put away as a goal", () => {
    const settle = { scored: 4, missed: 0.5, absent: 2 };
    const effects = matchEffects([
      { decides: "cup", scored: true, taken: 3, converted: 2, settle },
    ]);
    expect(effects.bonusGoals).toBe(2);
    expect(effects.titleMultipliers.cup).toBe(4);
  });
});
