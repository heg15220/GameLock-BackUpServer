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
 * Form is the multiplicative factor the goals were counted around (fortune.js). It is
 * worth printing even though the player could not act on it, because without it a season
 * of 9 goals after a season of 18 reads as decline when it was very often just a year -
 * and the whole point of a newspaper is to tell you which of the two it was.
 */
export const FORM_BANDS = [
  { min: 1.22, key: "inspirado" },
  { min: 1.07, key: "fino" },
  { min: 0.93, key: "normal" },
  { min: 0.8, key: "espeso" },
  { min: 0, key: "gris" },
];

export const formBand = (form) =>
  (FORM_BANDS.find((band) => form >= band.min) ?? FORM_BANDS[FORM_BANDS.length - 1]).key;

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
    // The year the club had, and the year he had inside it. Both come off the one latent
    // the season was drawn from, which is why they tend to agree.
    form: record.fortune ? formBand(record.fortune.form) : null,
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
