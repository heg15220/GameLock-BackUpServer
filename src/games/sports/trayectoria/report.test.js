import { describe, expect, it } from "vitest";

import {
  careerToDate,
  gridLines,
  ovrSeries,
  peakSeason,
  projectPoint,
  seasonReport,
  seriesBounds,
  seriesPath,
} from "./report.js";

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
