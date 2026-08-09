import { describe, expect, it } from "vitest";

import {
  IDOLATRY,
  applyIdolatry,
  ceilingFor,
  exitCost,
  exitPreview,
  idolatryAt,
  levelOf,
  patienceFor,
  peakIdolatry,
  seasonIdolatry,
} from "./idolatry.js";

const season = (overrides = {}) => ({
  goals: 0,
  assists: 0,
  titles: [],
  awards: [],
  national: null,
  promoted: false,
  suspended: false,
  ...overrides,
});

describe("levels", () => {
  it("maps values to the five rungs at the documented thresholds", () => {
    expect(levelOf(100).key).toBe("leyenda");
    expect(levelOf(95).key).toBe("leyenda");
    expect(levelOf(94).key).toBe("idolo");
    expect(levelOf(75).key).toBe("idolo");
    expect(levelOf(50).key).toBe("referente");
    expect(levelOf(25).key).toBe("querido");
    expect(levelOf(0).key).toBe("recien_llegado");
  });

  it("finds the club that loved you most", () => {
    expect(peakIdolatry({ a: 30, b: 82, c: 12 })).toEqual({ clubId: "b", value: 82 });
    expect(peakIdolatry({})).toBeNull();
  });

  it("treats an unknown club as zero", () => {
    expect(idolatryAt({ a: 10 }, "b")).toBe(0);
    expect(idolatryAt(undefined, "a")).toBe(0);
  });
});

describe("a season's worth", () => {
  it("pays for simply being there", () => {
    expect(seasonIdolatry({ record: season(), seasonsAtClub: 0 })).toBe(IDOLATRY.perSeason);
  });

  it("pays a veteran less, because the crowd takes you for granted", () => {
    const young = seasonIdolatry({ record: season(), seasonsAtClub: 1 });
    const old = seasonIdolatry({ record: season(), seasonsAtClub: IDOLATRY.veteranFrom });
    expect(old).toBeLessThan(young);
    expect(old).toBe(IDOLATRY.perSeasonVeteran);
  });

  it("values a trophy you played for far above one you attended", () => {
    const earned = seasonIdolatry({ record: season({ titles: [{ earned: true }] }) });
    const attended = seasonIdolatry({ record: season({ titles: [{ earned: false }] }) });
    expect(earned - attended).toBeCloseTo(IDOLATRY.titleEarned - IDOLATRY.titleAttended, 5);
    expect(attended).toBeLessThan(earned);
  });

  it("counts goals, promotion, awards and national titles", () => {
    const value = seasonIdolatry({
      record: season({
        goals: 20,
        assists: 10,
        promoted: true,
        awards: [{ award: "ballon_dor" }],
        national: { titles: [{ trophy: "world_cup" }] },
      }),
    });
    const expected =
      IDOLATRY.perSeason +
      20 * IDOLATRY.perGoal +
      10 * IDOLATRY.perAssist +
      IDOLATRY.promotion +
      IDOLATRY.award +
      IDOLATRY.nationalTitle;
    expect(value).toBeCloseTo(expected, 5);
  });

  it("gives a suspended season nothing: you were not there", () => {
    expect(seasonIdolatry({ record: season({ suspended: true, goals: 20 }) })).toBe(0);
  });

  it("discounts a season played abroad", () => {
    const home = seasonIdolatry({ record: season({ goals: 20 }) });
    const away = seasonIdolatry({ record: season({ goals: 20 }), abroad: true });
    expect(away).toBeCloseTo(home * IDOLATRY.foreignFactor, 5);
  });
});

describe("ceilings and the soft cap", () => {
  it("stops a club you never won anything with below the statue", () => {
    let value = 0;
    for (let i = 0; i < 200; i += 1) value = applyIdolatry(value, 5, { wonTitleHere: false });
    expect(value).toBe(IDOLATRY.ceilingWithoutTitle);
    expect(levelOf(value).key).toBe("idolo");
  });

  it("lets a club you won something with reach the statue", () => {
    let value = 0;
    for (let i = 0; i < 400; i += 1) value = applyIdolatry(value, 5, { wonTitleHere: true });
    expect(value).toBe(IDOLATRY.max);
    expect(levelOf(value).key).toBe("leyenda");
  });

  it("damps gains past the soft cap without stopping them", () => {
    const below = applyIdolatry(50, 10, { wonTitleHere: true });
    const above = applyIdolatry(90, 10, { wonTitleHere: true });
    expect(below - 50).toBe(10);
    expect(above - 90).toBeCloseTo(10 * IDOLATRY.softCapFactor, 5);
    expect(above).toBeGreaterThan(90);
  });

  it("splits a gain that straddles the soft cap", () => {
    const value = applyIdolatry(IDOLATRY.softCapFrom - 4, 10, { wonTitleHere: true });
    expect(value).toBeCloseTo(IDOLATRY.softCapFrom + 6 * IDOLATRY.softCapFactor, 5);
  });

  it("never damps a loss", () => {
    expect(applyIdolatry(90, -10, { wonTitleHere: true })).toBe(80);
  });

  it("never goes below zero", () => {
    expect(applyIdolatry(3, -40, {})).toBe(0);
  });

  it("caps a betrayal at the rival ceiling", () => {
    expect(ceilingFor({ betrayed: true, wonTitleHere: true })).toBe(IDOLATRY.rivalCeiling);
    expect(applyIdolatry(90, 5, { betrayed: true })).toBe(IDOLATRY.rivalCeiling);
  });
});

describe("the price of leaving", () => {
  it("costs more to walk out soon after signing", () => {
    const early = exitCost({ seasonsAtClub: 1 });
    const settled = exitCost({ seasonsAtClub: 6 });
    expect(early.change).toBe(IDOLATRY.leavingEarly);
    expect(settled.change).toBe(IDOLATRY.leaving);
    expect(early.change).toBeLessThan(settled.change);
  });

  it("only calls it betrayal when the crowd had already adopted you", () => {
    const adored = exitCost({ seasonsAtClub: 6, sameCompetition: true, idolatryHere: 88 });
    expect(adored.change).toBe(IDOLATRY.leavingToRival);
    expect(adored.betrayal).toBe(true);

    // A squad player moving between two mid-table sides is an ordinary transfer.
    const ordinary = exitCost({ seasonsAtClub: 6, sameCompetition: true, idolatryHere: 20 });
    expect(ordinary.change).toBe(IDOLATRY.leaving);
    expect(ordinary.betrayal).toBe(false);
  });

  it("publishes the cost and the rung you would drop to", () => {
    const preview = exitPreview({
      idolatry: { betis: 78 },
      clubId: "betis",
      seasonsAtClub: 6,
      sameCompetition: false,
    });
    expect(preview.current).toBe(78);
    expect(preview.change).toBe(IDOLATRY.leaving);
    expect(preview.after).toBe(68);
    expect(preview.from).toBe("idolo");
    expect(preview.to).toBe("referente");
    expect(preview.demotes).toBe(true);
  });

  it("says nothing when there is nothing to lose", () => {
    expect(exitPreview({ idolatry: {}, clubId: "betis", seasonsAtClub: 1 })).toBeNull();
    expect(exitPreview({ idolatry: { a: 30 }, clubId: null })).toBeNull();
  });

  it("does not report a demotion when the rung holds", () => {
    const preview = exitPreview({ idolatry: { a: 95 }, clubId: "a", seasonsAtClub: 9 });
    expect(preview.demotes).toBe(true);
    const shallow = exitPreview({ idolatry: { a: 70 }, clubId: "a", seasonsAtClub: 9 });
    expect(shallow.from).toBe("referente");
    expect(shallow.to).toBe("referente");
    expect(shallow.demotes).toBe(false);
  });
});

/**
 * Job security, after OUR CALL #8 took it out of the paperwork.
 *
 * While deals ran four years the contract was what stopped a club moving you on after one
 * quiet season. Year-to-year, that shield is gone, so it moves to the stand - where it has
 * to be earned rather than signed for.
 */
describe("what the crowd's regard buys you in patience", () => {
  it("gives a newcomer none and a favourite more", () => {
    expect(patienceFor(0)).toBe(0);
    expect(patienceFor(39)).toBe(0);
    expect(patienceFor(IDOLATRY.patienceStep)).toBe(1);
    expect(patienceFor(79)).toBe(1);
    expect(patienceFor(80)).toBe(2);
  });

  it("is capped, so no crowd keeps a player forever", () => {
    expect(patienceFor(100)).toBe(IDOLATRY.maxPatience);
    expect(patienceFor(1000)).toBe(IDOLATRY.maxPatience);
  });

  it("never goes backwards or negative", () => {
    expect(patienceFor(-50)).toBe(0);
    let last = -1;
    for (let value = 0; value <= 100; value += 1) {
      expect(patienceFor(value)).toBeGreaterThanOrEqual(last);
      last = patienceFor(value);
    }
  });
});
