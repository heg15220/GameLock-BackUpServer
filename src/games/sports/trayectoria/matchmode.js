/**
 * Which way a decisive match is played.
 *
 * The season's three deciders used to be one thing: three placements, pick one, blind.
 * That is a fine moment and a poor decade - twenty-four years of the same guess is a slot
 * machine with a football on it. There are now two ways a decider can happen, and which
 * one you get is not a setting.
 *
 *  - SKILL. The ball is at your feet and the game stops being a simulation: a timing bar,
 *    a closing window, a wall to bend it over. What happens is what you did.
 *  - MATCH. The ninety minutes play out live around you - the score moves, the clock runs,
 *    the commentary is rule-based like everything else here - and at the minute it comes
 *    down to you, you call it blind. What happens is what the model always did.
 *
 * ── Why the mix moves, and what moves it ──────────────────────────────────────
 *
 * The obvious way to alternate is a coin, and a coin says nothing. This uses the number
 * the whole game already turns on: `delta`, plus the role it buys. The more the side
 * depends on you, the likelier it is that the ball ends up in your hands and the moment
 * is yours to take or miss; the less it depends on you, the more you are one of eleven
 * watching a final happen to you.
 *
 * That produces the arc for free. At seventeen, four rungs below the squad, you almost
 * always watch - the seniors take the penalties and you are on the pitch for the ride. At
 * twenty-nine, the best player at the club, it is your ball nearly every time. Nobody
 * has to explain the progression because it IS the progression: earning the right to be
 * the one who decides is what the career is about.
 *
 * The kind of chance leans on it too, in the way the sport does. Somebody takes penalties
 * and free kicks, and at a certain point that somebody is you. A header in a crowded box
 * is nobody's to claim.
 *
 * Pure and seed-derived: same career, same mix.
 */

import { createStream } from "./rng.js";

export const MODES = { SKILL: "skill", MATCH: "match" };

export const MODE_ODDS = {
  /** An even split for a player exactly at the level of his squad, in an ordinary chance. */
  base: 0.46,
  /** Per point of delta. Ten rungs clear of the squad is worth twenty points of it. */
  perDelta: 0.02,
  deltaCap: 10,
  /** What the shirt is worth on top: the taker is a starter, not a substitute. */
  role: {
    titular: 0.14,
    rotacion_alta: 0.03,
    rotacion_baja: -0.1,
    suplente: -0.22,
  },
  /**
   * Somebody takes the penalties. A header in a six-yard scramble belongs to whoever it
   * finds, which is the model's business rather than yours.
   */
  shot: {
    penal: 0.26,
    falta: 0.16,
    mano_a_mano: 0.04,
    volea: -0.04,
    cabezazo: -0.12,
  },
  /**
   * Neither end is ever certain. A career that is all one mode is the thing this exists to
   * prevent, so even the biggest player in the division watches one in six.
   */
  min: 0.16,
  max: 0.84,
};

/**
 * How likely this particular chance is yours to take. Exported because the match screen
 * prints it - the game shows the odds it is about to roll, here as everywhere else.
 */
export function skillOdds({ delta = 0, role = null, shotType = null } = {}) {
  const reach = Math.max(-MODE_ODDS.deltaCap, Math.min(MODE_ODDS.deltaCap, delta));
  const odds =
    MODE_ODDS.base +
    reach * MODE_ODDS.perDelta +
    (MODE_ODDS.role[role] ?? 0) +
    (MODE_ODDS.shot[shotType] ?? 0);
  return Math.max(MODE_ODDS.min, Math.min(MODE_ODDS.max, odds));
}

/**
 * Roll it. Keyed off the fixture rather than the season, so the three deciders of one year
 * are decided independently and a career can have a final it plays and a final it watches
 * in the same May.
 */
export function modeFor({ seed, season, fixtureId, delta, role, shotType }) {
  const odds = skillOdds({ delta, role, shotType });
  const next = createStream(seed, "mode", fixtureId, season);
  return next() < odds ? MODES.SKILL : MODES.MATCH;
}
