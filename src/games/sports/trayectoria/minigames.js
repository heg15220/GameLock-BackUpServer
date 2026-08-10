/**
 * The moments that are yours.
 *
 * When `matchmode.js` says the ball is at your feet, the simulation stops and something
 * you can actually be good at starts. This is the model half of that - the geometry, the
 * tolerances and the verdict - with no React in it, so the whole thing is testable and the
 * screen only has to animate a number.
 *
 * THREE MECHANICS, FIVE CHANCES. Not five minigames: the icon set, the delta meter and the
 * verdict chips all work because the game keeps re-using one vocabulary, and a player who
 * has learned to read a sweeping marker should not have to learn a second one because the
 * ball arrived from a corner instead of the spot.
 *
 *   SWEEP  a marker runs across the goalmouth; stop it inside the gap the keeper left.
 *          The keeper's position is still drawn before you look, so it is a read and not
 *          just a reflex. Penalty and volley.
 *   WINDOW a chance that closes - the keeper advancing, the defender arriving. Hit it late
 *          and it is worth more, hit it too late and it is gone. One-on-one and header.
 *   BEND   two calls in sequence: how hard, then how much curl. Free kick.
 *
 * ── The one thing that had to be got right ────────────────────────────────────
 *
 * Tolerances scale with OVR, and they have to, or the career is a reflex test and the
 * rating means nothing. But they must not scale so far that the model's estimate of what
 * this player converts becomes meaningless - `conversionRate` measures what actually
 * happens and re-prices the season off it, so skill is honest either way. What the OVR
 * buys here is the same thing it buys in the blind shot: a bigger target and, at the very
 * top, the occasional goal you had no right to.
 */

import { createStream, randInt } from "./rng.js";
import { NAILED_FROM_OVR } from "./bigmatch.js";

export const MECHANICS = { SWEEP: "sweep", WINDOW: "window", BEND: "bend" };

/**
 * Which mechanic each kind of chance is played with, and how it is dressed.
 *
 * The defensive and goalkeeping chances reuse the same three without adding a fourth,
 * which is the whole thesis above: stopping a marker inside the gap the keeper left and
 * stopping it on the corner the striker picked are the same act of reading and timing,
 * and a player who has learned one has learned the other.
 */
export const CHANCE_MECHANIC = {
  penal: MECHANICS.SWEEP,
  volea: MECHANICS.SWEEP,
  mano_a_mano: MECHANICS.WINDOW,
  cabezazo: MECHANICS.WINDOW,
  falta: MECHANICS.BEND,
  // Keeper: a penalty and a shot from distance are read, a one-on-one and a cross are timed.
  parada_penal: MECHANICS.SWEEP,
  tiro_lejano: MECHANICS.SWEEP,
  salida_mano_a_mano: MECHANICS.WINDOW,
  centro_lateral: MECHANICS.WINDOW,
  // Defender: the clearance is a read, the tackle and the interception are timing.
  despeje: MECHANICS.SWEEP,
  entrada: MECHANICS.WINDOW,
  anticipo: MECHANICS.WINDOW,
  // Midfield: the weight of the pass is the same two calls a free kick is.
  pase_gol: MECHANICS.BEND,
};

export const TUNING = {
  /**
   * Half-width of the target, as a fraction of the track, at 60 and at 95 OVR. A poor
   * player is aiming at a sixth of the goal; a great one at nearly a third.
   */
  sweep: { at60: 0.085, at95: 0.155, speedAt60: 1.35, speedAt95: 0.95 },
  /** The window's width in the same units, and how fast it closes. */
  window: { at60: 0.1, at95: 0.19, closeAt60: 1.4, closeAt95: 1.0 },
  /** Two gates, each narrower than a sweep because there are two of them. */
  bend: { at60: 0.11, at95: 0.2 },
  /** Below this the chance is simply harder than the player is good. */
  floorOvr: 60,
  ceilOvr: 95,
};

const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));

/** Where this player sits between the floor and the ceiling of the tuning. */
export const skillOf = (ovr) =>
  (Math.max(TUNING.floorOvr, Math.min(TUNING.ceilOvr, ovr)) - TUNING.floorOvr) /
  (TUNING.ceilOvr - TUNING.floorOvr);

/**
 * Lay out one chance: where the target is, how wide, how fast, and the bail-out.
 *
 * The target is drawn from the seed before the player sees anything, exactly as the
 * keeper's gap always was - so a minigame is a read plus an execution, never a lottery
 * the screen resolves after the fact.
 */
export function buildChance({ seed, season, fixtureId, shotType, ovr }) {
  const mechanic = CHANCE_MECHANIC[shotType] ?? MECHANICS.SWEEP;
  const next = createStream(seed, "chance", fixtureId, season);
  const skill = skillOf(ovr);

  // Never dead centre and never flush against the post: a target you cannot reach is not
  // a test of anything.
  const place = () => 0.16 + next() * 0.68;

  const base = {
    mechanic,
    shotType,
    // The goal the player was always allowed to see coming.
    nailed: next() < NAILED_FROM_OVR(ovr),
    skill,
  };

  if (mechanic === MECHANICS.SWEEP) {
    return {
      ...base,
      target: place(),
      tolerance: lerp(TUNING.sweep.at60, TUNING.sweep.at95, skill),
      // Seconds for one pass of the marker. Slower for better players: composure.
      period: lerp(TUNING.sweep.speedAt60, TUNING.sweep.speedAt95, skill),
    };
  }

  if (mechanic === MECHANICS.WINDOW) {
    return {
      ...base,
      // The window sits late in the run: waiting is what makes it hard.
      target: 0.55 + next() * 0.3,
      tolerance: lerp(TUNING.window.at60, TUNING.window.at95, skill),
      period: lerp(TUNING.window.closeAt60, TUNING.window.closeAt95, skill),
    };
  }

  return {
    ...base,
    gates: [place(), place()],
    tolerance: lerp(TUNING.bend.at60, TUNING.bend.at95, skill),
    period: lerp(TUNING.sweep.speedAt60, TUNING.sweep.speedAt95, skill),
  };
}

/**
 * Judge it.
 *
 * `inputs` is where the player stopped the marker - one value for a sweep or a window,
 * two for a bend. Everything is in the same 0..1 track units, so one comparison covers
 * all three mechanics.
 *
 * Returns the same shape `resolveShot` does, because the rest of the game already knows
 * how to read that and a decider must not care which way it was played.
 */
export function judgeChance(chance, inputs) {
  const values = Array.isArray(inputs) ? inputs : [inputs];
  const targets = chance.gates ?? [chance.target];

  const errors = targets.map((target, index) => Math.abs((values[index] ?? 1) - target));
  const worst = errors.length ? Math.max(...errors) : 1;
  const clean = errors.every((error) => error <= chance.tolerance);

  // Beating a keeper who had you read: the same bail-out the blind shot always had, so a
  // great player is never entirely at the mercy of one twitch.
  const scored = clean || chance.nailed;

  return {
    scored,
    clean,
    nailedIt: scored && !clean,
    // 1 at dead centre, 0 at the edge of the tolerance. The screen grades the finish off
    // this - a goal off the post reads differently from one in the corner.
    accuracy: Math.max(0, 1 - worst / Math.max(chance.tolerance, 1e-6)),
    errors,
    inputs: values,
  };
}
