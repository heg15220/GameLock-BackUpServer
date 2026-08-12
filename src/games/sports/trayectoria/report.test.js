import { describe, expect, it } from "vitest";

import {
  careerToDate,
  formBand,
  gridLines,
  growthReport,
  ovrSeries,
  peakSeason,
  projectPoint,
  seasonMark,
  seasonReport,
  seriesBounds,
  seriesPath,
} from "./report.js";
import { GROWTH } from "./tables.js";

const season = (overrides = {}) => ({
  season: 0,
  age: 20,
  clubId: "club-a",
  competitionId: "league-a",
  ovr: 70,
  delta: 2,
  role: "titular",
  matches: 40,
  goals: 12,
  assists: 5,
  titles: [],
  awards: [],
  national: null,
  promoted: false,
  relegated: false,
  suspended: false,
  value: 1_200_000,
  development: { range: [0, 0], applied: 0, doubled: false },
  ...overrides,
});

describe("season movement", () => {
  it("reports change against the previous season", () => {
    const report = seasonReport(season({ goals: 18, ovr: 74 }), season({ goals: 12, ovr: 70 }));
    expect(report.changes.goals).toBe(6);
    expect(report.changes.ovr).toBe(4);
  });

  it("reports a drop as a negative, not an absolute", () => {
    const report = seasonReport(season({ goals: 4 }), season({ goals: 12 }));
    expect(report.changes.goals).toBe(-8);
  });

  it("says nothing where nothing moved", () => {
    const report = seasonReport(season(), season());
    expect(report.changes.goals).toBeNull();
    expect(report.changes.ovr).toBeNull();
  });

  it("has no movement to report on a first season", () => {
    const report = seasonReport(season(), null);
    expect(report.changes.goals).toBeNull();
    expect(report.movedClub).toBe(false);
  });

  it("notices a change of club", () => {
    const report = seasonReport(season({ clubId: "club-b" }), season({ clubId: "club-a" }));
    expect(report.movedClub).toBe(true);
  });

  it("computes goals per match and survives a season with no matches", () => {
    expect(seasonReport(season({ goals: 20, matches: 40 })).perMatch).toBe(0.5);
    expect(seasonReport(season({ matches: 0, goals: 0 })).perMatch).toBe(0);
  });
});

describe("honours and side panels", () => {
  it("flattens club titles, national titles and awards into one list", () => {
    const report = seasonReport(
      season({
        titles: [{ trophy: "league", earned: true }, { trophy: "cup", earned: false }],
        awards: [{ award: "ballon_dor" }],
        national: { calledUp: true, caps: 8, titles: [{ trophy: "world_cup" }] },
      }),
    );
    expect(report.honours.map((honour) => honour.id)).toEqual([
      "league", "cup", "world_cup", "ballon_dor",
    ]);
    expect(report.honours.find((honour) => honour.id === "cup").earned).toBe(false);
  });

  it("keeps a call-up that won nothing", () => {
    const report = seasonReport(season({ national: { calledUp: true, caps: 6, titles: [] } }));
    expect(report.national.caps).toBe(6);
  });

  it("drops the national panel when there was no call-up", () => {
    expect(seasonReport(season({ national: null })).national).toBeNull();
  });

  it("shows a development cycle that declines, not only one that grows", () => {
    const report = seasonReport(
      season({ development: { range: [-5, -1], applied: -1.5, doubled: false, age: 34 } }),
    );
    expect(report.development.range).toEqual([-5, -1]);
    expect(report.development.applied).toBe(-1.5);
  });

  it("drops the development panel outside a cycle", () => {
    expect(seasonReport(season({ development: { range: [0, 0] } })).development).toBeNull();
  });
});

describe("career to date", () => {
  const history = [
    season({ season: 0, matches: 30, goals: 8, titles: [{ trophy: "cup" }] }),
    season({ season: 1, matches: 40, goals: 15, national: { calledUp: true, caps: 6, titles: [] } }),
    season({ season: 2, matches: 44, goals: 21, awards: [{ award: "golden_boot" }] }),
  ];

  it("accumulates only up to the season asked for", () => {
    expect(careerToDate(history, 1)).toEqual({
      seasons: 2, matches: 70, goals: 23, assists: 10, titles: 1, awards: 0, caps: 6,
    });
  });

  it("accumulates the whole history when asked for the last season", () => {
    expect(careerToDate(history, 2).goals).toBe(44);
    expect(careerToDate(history, 2).awards).toBe(1);
  });

  it("returns zeroes for an empty career", () => {
    expect(careerToDate([], 0).seasons).toBe(0);
  });
});

describe("the career curve", () => {
  const history = [
    season({ age: 18, ovr: 60, clubId: "a" }),
    season({ age: 19, ovr: 68, clubId: "a" }),
    season({ age: 20, ovr: 74, clubId: "b" }),
  ];

  it("flags the seasons where the club changed", () => {
    expect(ovrSeries(history).map((point) => point.changedClub)).toEqual([false, false, true]);
  });

  it("fits bounds around every series with padding", () => {
    const bounds = seriesBounds([ovrSeries(history)], { padOvr: 4 });
    expect(bounds.minAge).toBe(18);
    expect(bounds.maxAge).toBe(20);
    expect(bounds.minOvr).toBe(56);
    expect(bounds.maxOvr).toBe(78);
  });

  it("fits bounds around two series at once, so both curves are in frame", () => {
    const mine = ovrSeries(history);
    const theirs = ovrSeries([season({ age: 24, ovr: 88 })]);
    const bounds = seriesBounds([mine, theirs]);
    expect(bounds.maxAge).toBe(24);
    expect(bounds.maxOvr).toBe(92);
  });

  it("clamps bounds to the rating scale", () => {
    const bounds = seriesBounds([[{ age: 20, ovr: 98 }, { age: 21, ovr: 2 }]], { padOvr: 6 });
    expect(bounds.maxOvr).toBe(99);
    expect(bounds.minOvr).toBe(0);
  });

  it("returns no bounds when there is nothing to plot", () => {
    expect(seriesBounds([[]])).toBeNull();
    expect(seriesPath([], null, {})).toBe("");
  });

  const box = { width: 300, height: 120, padX: 10, padY: 10 };

  it("puts a higher rating higher on the screen", () => {
    const bounds = { minAge: 18, maxAge: 22, minOvr: 60, maxOvr: 80 };
    const low = projectPoint({ age: 20, ovr: 62 }, bounds, box);
    const high = projectPoint({ age: 20, ovr: 78 }, bounds, box);
    expect(high.y).toBeLessThan(low.y);
  });

  it("pins the series to the edges of the plotting box", () => {
    const bounds = { minAge: 18, maxAge: 22, minOvr: 60, maxOvr: 80 };
    expect(projectPoint({ age: 18, ovr: 80 }, bounds, box)).toEqual({ x: 10, y: 10 });
    expect(projectPoint({ age: 22, ovr: 60 }, bounds, box)).toEqual({ x: 290, y: 110 });
  });

  it("survives a single-season career without dividing by zero", () => {
    const bounds = { minAge: 20, maxAge: 20, minOvr: 70, maxOvr: 70 };
    const point = projectPoint({ age: 20, ovr: 70 }, bounds, box);
    expect(Number.isFinite(point.x)).toBe(true);
    expect(Number.isFinite(point.y)).toBe(true);
  });

  it("draws a move-to then line-tos", () => {
    const bounds = seriesBounds([ovrSeries(history)]);
    const path = seriesPath(ovrSeries(history), bounds, box);
    expect(path.startsWith("M")).toBe(true);
    expect(path.match(/L/g).length).toBe(2);
  });

  it("puts gridlines on round ratings inside the bounds", () => {
    const lines = gridLines({ minAge: 18, maxAge: 22, minOvr: 56, maxOvr: 78 }, box, 10);
    expect(lines.map((line) => line.ovr)).toEqual([60, 70]);
  });

  it("finds the peak season", () => {
    expect(peakSeason(history).ovr).toBe(74);
    expect(peakSeason([])).toBeNull();
  });
});

/** The two read-outs the new season model added. See fortune.js and OUR CALL #6. */
describe("what the front page can now say about a season", () => {
  /** A season that asked for `asked` between goals and assists, and got `got`. */
  const marked = (asked, got, extra = {}) =>
    season({
      goals: got,
      assists: 0,
      expected: { goals: asked, assists: 0 },
      growth: { factor: 1 },
      ...extra,
    });

  it("marks the season against what was asked of him, not against the dice", () => {
    // The same tally is a different year depending on what the year wanted.
    expect(seasonReport(marked(18, 30)).form).toBe("inspirado");
    expect(seasonReport(marked(18, 18)).form).toBe("normal");
    expect(seasonReport(marked(18, 6)).form).toBe("gris");
    // Nine goals after eighteen is not a collapse if nine is what the season asked for.
    expect(seasonReport(marked(9, 9)).form).toBe("normal");
  });

  it("ignores the form the season was drawn at", () => {
    // The old read-out was exactly this number. It must no longer be able to move the band.
    const inspired = marked(18, 18, { fortune: { latent: 0, form: 1.6 } });
    const flat = marked(18, 18, { fortune: { latent: 0, form: 0.5 } });
    expect(seasonReport(inspired).form).toBe(seasonReport(flat).form);
  });

  /**
   * The point of the change. Deciders are converted by hand in the minigames and land in the
   * tally without landing in the expectation, so coming through them is a season above what
   * was asked - which the old read-out could not express, because it was drawn first.
   */
  it("lets what he did in the deciders move the verdict", () => {
    const quiet = seasonMark(marked(12, 12));
    const delivered = seasonMark(marked(12, 15));
    expect(delivered).toBeGreaterThan(quiet);
  });

  it("marks a keeper on the big nights, since the sheet records nothing else for him", () => {
    const keeper = (taken, converted) =>
      season({
        goals: 0, assists: 0,
        expected: { goals: 0, assists: 0 },
        deciders: { taken, converted, expected: taken * 0.45 },
        growth: { factor: 1 },
      });
    expect(seasonMark(keeper(3, 3))).toBeGreaterThan(seasonMark(keeper(3, 0)));
    expect(seasonReport(keeper(3, 3)).form).toBe("inspirado");
  });

  it("falls back to what he grew when the season asked nothing at all", () => {
    // Injured, suspended, or never off the bench: no tally, no deciders, still a year.
    const idle = season({
      goals: 0, assists: 0,
      expected: { goals: 0, assists: 0 },
      deciders: { taken: 0, converted: 0, expected: 0 },
      growth: { factor: 1.4 },
    });
    expect(seasonMark(idle)).toBe(1.4);
    expect(seasonReport(idle).form).toBe("inspirado");
    // And a record from before any of this existed says nothing rather than guessing.
    expect(seasonReport(season()).form).toBeNull();
  });

  /**
   * WITHOUT THE PRIOR THIS IS A NOISE METER. A striker asked for 18 goals and a centre-back
   * asked for 2 have wildly different Poisson spread, so marked raw the defender's verdict is
   * a coin: measured, the extremes came up three times as often for him. The shrinkage in
   * `FORM_PRIOR` is what stops the position you picked deciding how often the game calls
   * your year inspired.
   */
  it("does not hand a louder verdict to whoever was asked for less", () => {
    const spread = (asked) => {
      // Same relative overperformance, very different amounts of evidence for it.
      const high = seasonMark(marked(asked, asked * 1.5));
      const low = seasonMark(marked(asked, asked * 0.5));
      return high - low;
    };
    // A season worth two goals cannot swing the verdict as far as a season worth twenty.
    expect(spread(2)).toBeLessThan(spread(20));
    expect(spread(2)).toBeGreaterThan(0);
  });

  it("bands the whole range without leaving a gap", () => {
    for (let form = 0.3; form <= 2; form += 0.01) {
      expect(typeof formBand(form)).toBe("string");
    }
  });

  it("says how much of the development cycle the season actually collected", () => {
    const report = seasonReport(
      season({
        development: { range: [2, 10], applied: 2.4, doubled: false },
        growth: { factor: 0.8, minutes: 0.72, challenge: 1.1, environment: 1.0 },
      }),
    );
    expect(report.development.growth.factor).toBe(0.8);
    expect(report.development.growth.stalled).toBe(true);
    expect(report.development.growth.thriving).toBe(false);
  });

  it("names the term that decided it, largest departure from neutral first", () => {
    const starved = growthReport({ factor: 0.75, minutes: 0.6, challenge: 1.05, environment: 1.0 });
    expect(starved.drivers[0].key).toBe("minutes");

    // The delta-farmer: playing every week, learning nothing, and the panel says which.
    const unchallenged = growthReport({
      factor: 0.82, minutes: 1.02, challenge: 0.74, environment: 0.94,
    });
    expect(unchallenged.drivers[0].key).toBe("challenge");
  });

  it("stays quiet about growth for a record that has none", () => {
    expect(growthReport(null)).toBeNull();
    expect(seasonReport(season()).development).toBeNull();
  });

  it("carries the division the season was really played in", () => {
    const report = seasonReport(season({ division: { tier: 2, shift: -1, demoted: true } }));
    expect(report.division.demoted).toBe(true);
    expect(seasonReport(season()).division).toBeNull();
  });

  it("agrees with the thresholds the offer cards are drawn from", () => {
    expect(growthReport({ factor: GROWTH.stallBelow, minutes: 1, challenge: 1, environment: 1 }).stalled).toBe(true);
    expect(growthReport({ factor: GROWTH.thrivingFrom, minutes: 1, challenge: 1, environment: 1 }).thriving).toBe(true);
  });
});

/**
 * The season panel printed "3 / 14 posible · 118% recogido" beside a gain of +2.3 OVR:
 * a two-year cycle range set against one season's share of it, and a rate above 1
 * described as a portion collected. Both halves of that are checked here.
 */
describe("the development panel says what it means", () => {
  const cycle = (overrides = {}) =>
    season({
      development: { range: [3, 14], applied: 2.3, doubled: false, scale: 1.18, ...overrides },
    });

  it("reports the season's own range, not the two-year cycle's", () => {
    const report = seasonReport(cycle());
    expect(report.development.range).toEqual([3, 14]);
    // Half of the cycle lands each season, so this is the range the gain sits inside.
    expect(report.development.seasonRange).toEqual([1.5, 7]);
    expect(report.development.applied).toBeGreaterThan(report.development.seasonRange[0]);
    expect(report.development.applied).toBeLessThan(report.development.seasonRange[1]);
  });

  it("carries the rate as a rate, which is allowed past 1", () => {
    expect(seasonReport(cycle()).development.rate).toBe(1.18);
    expect(seasonReport(cycle({ scale: 0.74 })).development.rate).toBe(0.74);
  });

  it("reports the factor that actually applied in a year of decline", () => {
    // A well-looked-after veteran declines slower: the draw is scaled by 0.8, and saying
    // "rate 120%" in a season his rating fell would be the wrong number twice over.
    const declining = seasonReport(
      season({ development: { range: [-5, -1], applied: -1.2, doubled: false, scale: 0.8 } }),
    );
    expect(declining.rate).toBeUndefined();
    expect(declining.development.rate).toBe(0.8);
    expect(declining.development.seasonRange).toEqual([-2.5, -0.5]);
  });

  it("falls back to a neutral rate for a record drawn before the factor existed", () => {
    const old = seasonReport(season({ development: { range: [3, 14], applied: 4, doubled: false } }));
    expect(old.development.rate).toBe(1);
  });
});
