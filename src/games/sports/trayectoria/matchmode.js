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
 * the whole game already turns on: `delta`, plus the role it buys, plus how much football
 * he is actually playing. The more the side depends on you, the likelier it is that the
 * ball ends up in your hands and the moment is yours to take or miss; the less it depends
 * on you, the more you are one of eleven watching a final happen to you.
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
   * HOW MUCH FOOTBALL HE IS PLAYING, which `delta` does not know.
   *
   * A rating is a claim and matches are the evidence, and the two come apart all the time:
   * a man rated four rungs above his squad who has played six games this season is not the
   * one the side turns to in May. `delta` reads him as if he were, because it is a
   * comparison of ratings and nothing else - so a season spent injured or frozen out cost a
   * player nothing at all when the decisive night came round.
   *
   * Runs 0 (never on the pitch) to 1 (plays everything), weighted towards the season being
   * played - see `matchInertia` in tournaments.js. Worth a little less than the shirt,
   * because being the man who takes them is mostly about being the best player at the club
   * and only partly about being fit.
   */
  inertia: 0.15,
  /**
   * Somebody takes the penalties. A header in a six-yard scramble belongs to whoever it
   * finds, which is the model's business rather than yours.
   */
  shot: {
    penal: 0.26,
    falta: 0.16,
    mano_a_mano: 0.04,
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
export function skillOdds({ delta = 0, role = null, shotType = null, inertia = 0.5 } = {}) {
  const reach = Math.max(-MODE_ODDS.deltaCap, Math.min(MODE_ODDS.deltaCap, delta));
  // Centred on half a season, so a squad player is neither lifted nor dragged and the
  // default keeps every existing caller exactly where it was.
  const played = (Math.max(0, Math.min(1, inertia)) - 0.5) * 2;
  const odds =
    MODE_ODDS.base +
    reach * MODE_ODDS.perDelta +
    (MODE_ODDS.role[role] ?? 0) +
    played * MODE_ODDS.inertia +
    (MODE_ODDS.shot[shotType] ?? 0);
  return Math.max(MODE_ODDS.min, Math.min(MODE_ODDS.max, odds));
}

/**
 * Roll it. Keyed off the fixture rather than the season, so the three deciders of one year
 * are decided independently and a career can have a final it plays and a final it watches
 * in the same May.
 *
 * `chances` is not part of the odds - it is the one case where there are no odds. A
 * decider worth no sight of goal has no moment to hand him, so SKILL there is a mode with
 * nothing in it: no placements, because the night is already settled, and no ninety
 * minutes either, because those are only built for the other mode. What the player got
 * was a screen naming a penalty that never happened and a verdict saying so, with nothing
 * in between. There is no "your moment" in a night the ball never came to you, so those
 * are watched - which is also the only version of that night worth having, since the
 * narration is the entire account of it.
 */
export function modeFor({ seed, season, fixtureId, delta, role, shotType, chances = 1, inertia = 0.5 }) {
  if (chances <= 0) return MODES.MATCH;
  const odds = skillOdds({ delta, role, shotType, inertia });
  const next = createStream(seed, "mode", fixtureId, season);
  return next() < odds ? MODES.SKILL : MODES.MATCH;
}

/**
 * WHETHER HE IS IN THE SIDE FOR A KNOCKOUT TIE.
 *
 * A different question from `skillOdds`, which asks how a decisive night is played once it
 * is his. This one is not about deciding anything: the tie is simulated either way - the
 * bracket is the competition and it plays out whether or not he is on the pitch - and what
 * this settles is whether the eleven that walks out has him in it.
 *
 * It matters because a European run used to be told with the player entirely absent from
 * it. The feed named the two clubs, the shots, the saves and the corners, and the man whose
 * career the whole thing is about did not appear in ninety minutes of his own quarter-final.
 * At ninety-odd, first choice, playing every week, he should be in essentially all of them;
 * a squad player is in almost none, and a season on the treatment table takes them away.
 *
 * Deliberately steeper than the mode roll and with a much higher ceiling. `skillOdds` is
 * capped at 0.84 on purpose - a career that is all one mode is the thing it exists to
 * prevent - but "is the best player in the squad playing in the semi-final" has no reason
 * to stay mixed. At the top it should be nearly always.
 */
export const ROUND_ODDS = {
  base: 0.32,
  perDelta: 0.038,
  deltaCap: 12,
  role: {
    titular: 0.17,
    rotacion_alta: 0.02,
    rotacion_baja: -0.16,
    suplente: -0.3,
  },
  /** How much of it is being on the pitch at all. See `matchInertia`. */
  inertia: 0.2,
  /** The deeper the round, the less a side rotates. Nobody rests anybody in a final. */
  round: { r16: -0.05, quarter: 0, semi: 0.04, final: 0.07 },
  /**
   * Never quite certain in either direction. At the very top this is deliberately close to
   * one - the best player in the squad plays the knockout rounds - but not one: a bracket
   * one footballer is guaranteed to appear in every minute of has no suspension in it, and
   * a knock, a booking or a rested legs before a final are all real.
   */
  min: 0.04,
  max: 0.97,
};

export function roundOdds({ delta = 0, role = null, round = null, inertia = 0.5 } = {}) {
  const reach = Math.max(-ROUND_ODDS.deltaCap, Math.min(ROUND_ODDS.deltaCap, delta));
  const played = (Math.max(0, Math.min(1, inertia)) - 0.5) * 2;
  const odds =
    ROUND_ODDS.base +
    reach * ROUND_ODDS.perDelta +
    (ROUND_ODDS.role[role] ?? 0) +
    played * ROUND_ODDS.inertia +
    (ROUND_ODDS.round[round] ?? 0);
  return Math.max(ROUND_ODDS.min, Math.min(ROUND_ODDS.max, odds));
}

/** Roll it, once per round of one bracket, so the same run reads the same way twice. */
export function playsRound({ seed, season, tournamentId, round, delta, role, inertia }) {
  const next = createStream(seed, "round", tournamentId, round, season);
  return next() < roundOdds({ delta, role, round, inertia });
}
