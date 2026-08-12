/**
 * Season and career read-outs.
 *
 * The engine records a season; this works out what is worth saying about it. Two things
 * live here that the raw record does not carry:
 *
 *  1. Movement. A season only means something next to the one before it - 18 goals is a
 *     breakout or a collapse depending on last year - so every headline number comes with
 *     its change.
 *  2. Shape. A career is a curve, not a list, and `ovrSeries` + `seriesPath` turn the
 *     history into one so the retirement screen can draw it against the shadow's.
 *
 * All pure and all view-agnostic: no labels, no locale, no DOM. Numbers only.
 */

import { GROWTH } from "./tables.js";

/** Change between two seasons, or null when there is nothing to compare against. */
function movement(current, previous, key) {
  if (!previous) return null;
  const change = current[key] - previous[key];
  return change === 0 ? null : change;
}

/**
 * The season's form, as a band rather than a number.
 *
 * WHAT THIS MEASURES, AND WHAT IT USED TO. The band was `fortune.form`: the multiplier the
 * goals were counted around, drawn before a ball was kicked. That made the stamp a peek at
 * the dice, and it had one consequence nobody could defend - what the PLAYER did could not
 * move it. He could convert all three deciders by hand in the minigames and still be told
 * he never got going, because the verdict predated the season.
 *
 * So it is marked after the fact, out of two ratios the record already carries:
 *
 *   PERFORMANCE  what he did over what was asked of him. The denominator is `expected` -
 *                his role, his club, his matches, before form and before the dice - and the
 *                numerator includes the big-match goals, which are the ones he put in
 *                himself. That asymmetry is the point: a converted final is a season above
 *                what the model asked for, and now it reads as one.
 *   PROGRESS     `growth.factor`, where 1 is having collected exactly what the development
 *                tables promised for his age.
 *
 * Weighted towards performance, because performance is the season and development is the
 * cycle it sits in.
 *
 * `fortune.form` is untouched and still drives the goals. All that changed is that the
 * stamp stopped reporting the cause and started marking the result.
 */
export const FORM_WEIGHTS = { performance: 0.7, progress: 0.3 };

/**
 * The cuts, re-measured against the new quantity.
 *
 * They cannot be the old ones. Form was a lognormal with sd 0.2; a realised ratio carries
 * that spread PLUS the Poisson noise of the count itself, which for a striker asked for 18
 * is another 0.23 - so the old 1.22 would have printed "inspirado" about one year in three,
 * and a stamp that common says nothing. Chosen so the two extremes stay about as rare as
 * they have always been, and held there by `report.test.js`.
 */
export const FORM_BANDS = [
  { min: 1.147, key: "inspirado" },
  { min: 1.044, key: "fino" },
  { min: 0.937, key: "normal" },
  { min: 0.835, key: "espeso" },
  { min: 0, key: "gris" },
];

export const formBand = (form) =>
  (FORM_BANDS.find((band) => form >= band.min) ?? FORM_BANDS[FORM_BANDS.length - 1]).key;

/**
 * How much evidence a season has to produce before the verdict believes it, in the units of
 * whatever is being counted.
 *
 * WITHOUT THIS THE STAMP MEASURES NOISE, and it does it unevenly, which is worse. A striker
 * asked for 18 goals carries Poisson noise of about ±23%; a centre-back asked for 2 carries
 * ±71%, and a goalkeeper's year is one to three deciders, where 0 of 1 is zero and 1 of 1 is
 * more than double. Marked raw, a striker's ratio is a season and a defender's is a coin -
 * measured, the extremes came up 16% of the time for a striker and 48% for a keeper. Which
 * position you picked would decide how often the game called your year inspired.
 *
 * So the ratio is shrunk towards 1 by a prior, exactly as `conversionRate` in bigmatch.js
 * already shrinks a player's decisive record towards what the model expected of him. Small
 * evidence moves the verdict a little, a whole striker's season moves it a lot, and neither
 * gets a louder headline than it earned. The two numbers are in different units - goals plus
 * assists, and deciders - so there are two of them.
 */
export const FORM_PRIOR = { output: 9, deciders: 4.4 };

/**
 * What he did over what was asked of him, or null when the season asked nothing measurable.
 *
 * A goalkeeper is the case the second branch exists for. `GOAL_RATE.keeper` is zero and so
 * are his assists, so there is no tally to mark him against - and he is the one player whose
 * big nights the sheet deliberately does not record, because a save is paid for in the
 * trophy it settled. His deciders are therefore his season, priced off `shotScoringRate`:
 * the model's own estimate of him, taken before this year's went into his record so the
 * measure cannot chase itself.
 *
 * A year with no matches, no deciders and nothing asked - injured, suspended, benched all
 * season - returns null, and the band falls back to what he grew.
 */
export function performanceRatio(record) {
  const asked = (record.expected?.goals ?? 0) + (record.expected?.assists ?? 0);
  if (asked > 0) {
    const prior = FORM_PRIOR.output;
    return (prior + record.goals + record.assists) / (prior + asked);
  }

  const deciders = record.deciders;
  if (deciders?.expected > 0) {
    const prior = FORM_PRIOR.deciders;
    return (prior + deciders.converted) / (prior + deciders.expected);
  }
  return null;
}

/**
 * The season, marked. Returns the number the band is cut from, so a test can measure how
 * often each verdict comes up rather than take this file's word for it.
 */
export function seasonMark(record) {
  const performance = performanceRatio(record);
  const progress = record.growth?.factor ?? null;

  if (performance == null && progress == null) return null;
  // Whichever half exists carries the whole season when the other one cannot speak.
  if (performance == null) return progress;
  if (progress == null) return performance;
  return FORM_WEIGHTS.performance * performance + FORM_WEIGHTS.progress * progress;
}

export function seasonBand(record) {
  const mark = seasonMark(record);
  return mark == null ? null : formBand(mark);
}

/**
 * Whether this was a season that made him better, worse, or neither - the read-out for
 * OUR CALL #6. `factor` is what the development draw was scaled by, so 1 is a season that
 * collected exactly what the tables promised for his age.
 */
export function growthReport(growth) {
  if (!growth) return null;
  return {
    factor: growth.factor,
    stalled: growth.factor <= GROWTH.stallBelow,
    thriving: growth.factor >= GROWTH.thrivingFrom,
    // Which of the three terms is doing the damage, so the panel can say why and not
    // just that. Ranked by distance from neutral, largest first.
    drivers: [
      { key: "minutes", value: growth.minutes },
      { key: "challenge", value: growth.challenge },
      { key: "environment", value: growth.environment },
    ].sort((a, b) => Math.abs(b.value - 1) - Math.abs(a.value - 1)),
  };
}

/**
 * Everything the front page needs beyond the record itself: how the season moved, and the
 * honours flattened into one list so they can be laid out as a single row.
 */
export function seasonReport(record, previous = null) {
  const honours = [
    ...record.titles.map((title) => ({
      kind: "title",
      id: title.trophy,
      earned: Boolean(title.earned),
    })),
    ...(record.national?.titles ?? []).map((title) => ({
      kind: "national",
      id: title.trophy,
      earned: true,
    })),
    ...record.awards.map((award) => ({ kind: "award", id: award.award, earned: true })),
  ];

  // `development.age` on the record is the age the player was, not the age the cycle
  // targets, so it is not carried here - `record.age` already says that.
  const development = record.development?.range?.some((bound) => bound !== 0)
    ? {
        range: record.development.range,
        // The cycle runs two years and half of it lands each season, so the published
        // range is not the range this season was drawn against. Printing the cycle beside
        // a single season's gain invites the reader to compare two different units and
        // conclude the number is wrong.
        seasonRange: record.development.range.map((bound) => bound / 2),
        applied: record.development.applied ?? 0,
        // What the draw was actually multiplied by. A rate, not a share: it runs past 1
        // for a player in the right place, so "collected 118%" was never the right way
        // to say it.
        rate: record.development.scale ?? 1,
        doubled: Boolean(record.development.doubled),
        growth: growthReport(record.growth),
      }
    : null;

  return {
    changes: {
      goals: movement(record, previous, "goals"),
      assists: movement(record, previous, "assists"),
      matches: movement(record, previous, "matches"),
      ovr: movement(record, previous, "ovr"),
      value: movement(record, previous, "value"),
    },
    perMatch: record.matches ? record.goals / record.matches : 0,
    // A season where you were called up but won nothing still belongs on the page.
    national: record.national?.calledUp ? record.national : null,
    development,
    honours,
    // The year he had, marked against what was asked of him and what he grew. Not the dice
    // he was dealt - see the header of `FORM_BANDS`.
    form: seasonBand(record),
    division: record.division ?? null,
    movedClub: Boolean(previous && previous.clubId !== record.clubId),
  };
}

/** Running totals through a given season, for the "career so far" strip. */
export function careerToDate(history, throughSeason) {
  const upTo = history.filter((season) => season.season <= throughSeason);
  return upTo.reduce(
    (totals, season) => ({
      seasons: totals.seasons + 1,
      matches: totals.matches + season.matches,
      goals: totals.goals + season.goals,
      assists: totals.assists + season.assists,
      titles: totals.titles + season.titles.length,
      awards: totals.awards + season.awards.length,
      caps: totals.caps + (season.national?.caps ?? 0),
    }),
    { seasons: 0, matches: 0, goals: 0, assists: 0, titles: 0, awards: 0, caps: 0 },
  );
}

/** The career as a curve: one point per season, flagged where the club changed. */
export function ovrSeries(history = []) {
  return history.map((season, index) => ({
    age: season.age,
    ovr: season.ovr,
    clubId: season.clubId,
    changedClub: index > 0 && history[index - 1].clubId !== season.clubId,
  }));
}

/**
 * Bounds that fit every series passed in, padded so the curves never graze the frame.
 * Returns null when there is nothing to plot.
 */
export function seriesBounds(series = [], { padOvr = 4 } = {}) {
  const points = series.flat();
  if (!points.length) return null;
  const ages = points.map((point) => point.age);
  const ovrs = points.map((point) => point.ovr);
  return {
    minAge: Math.min(...ages),
    maxAge: Math.max(...ages),
    minOvr: Math.max(0, Math.min(...ovrs) - padOvr),
    maxOvr: Math.min(99, Math.max(...ovrs) + padOvr),
  };
}

/** Project a point into the SVG box. Exported so markers can sit on the line exactly. */
export function projectPoint(point, bounds, box) {
  const ageSpan = bounds.maxAge - bounds.minAge || 1;
  const ovrSpan = bounds.maxOvr - bounds.minOvr || 1;
  return {
    x: box.padX + ((point.age - bounds.minAge) / ageSpan) * (box.width - box.padX * 2),
    // SVG y grows downward, so a higher OVR has to come out lower.
    y: box.padY + (1 - (point.ovr - bounds.minOvr) / ovrSpan) * (box.height - box.padY * 2),
  };
}

export function seriesPath(points, bounds, box) {
  if (!points?.length || !bounds) return "";
  return points
    .map((point, index) => {
      const { x, y } = projectPoint(point, bounds, box);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

/** Horizontal OVR gridlines at round numbers inside the bounds. */
export function gridLines(bounds, box, step = 10) {
  if (!bounds) return [];
  const lines = [];
  const first = Math.ceil(bounds.minOvr / step) * step;
  for (let ovr = first; ovr <= bounds.maxOvr; ovr += step) {
    lines.push({ ovr, y: projectPoint({ age: bounds.minAge, ovr }, bounds, box).y });
  }
  return lines;
}

/** The single season a career is remembered for, used to label the curve's high point. */
export function peakSeason(history = []) {
  if (!history.length) return null;
  return history.reduce((best, season) => (season.ovr > best.ovr ? season : best), history[0]);
}
