/**
 * The moments that are yours.
 *
 * When `matchmode.js` says the ball is at your feet, the simulation stops and something
 * you can actually be good at starts. This is the model half of that - the geometry, the
 * tolerances and the verdict - with no React in it, so the whole thing is testable and the
 * screen only has to animate a number.
 *
 * SEVEN MECHANICS. This file used to argue for three, on the grounds that one vocabulary is
 * what makes the game readable and nobody should have to learn a second marker because the
 * ball arrived from a corner instead of the spot. That was right about the vocabulary and
 * wrong about the count, and the arithmetic is what settles it: the repertoire is filtered
 * by position (see REPERTOIRE in bigmatch.js), so a career is four or five kinds of chance,
 * not thirteen. Under three mechanics a goalkeeper played TWO games - a dozen sweeps and a
 * dozen windows across fifteen seasons - and so did a centre-back. Seven puts four or five
 * in front of every position, which is still three or four sightings of each per career:
 * enough to learn one, which was the real point all along.
 *
 * Each of them is one verb, and no two share it:
 *
 *   SWEEP  ONE TOUCH. A marker runs across the goalmouth; stop it inside the gap the keeper
 *          left. The gap is drawn before you look, so it is a read and not just a reflex.
 *   WINDOW ONE TOUCH. A chance that closes - the keeper advancing, the defender arriving.
 *          Late is worth more; too late is gone.
 *   CHARGE HOLD AND RELEASE. A bar climbs while you hold it and does not come back. Let go
 *          inside the band; hold past it and it is over the bar.
 *   AIM    DRAG AND RELEASE, on something that is MOVING. The only one in two dimensions:
 *          the ball is going somewhere and so is the man, and you have to be where it ends
 *          up rather than where it is.
 *   DIVE   ONE COMMITTED GESTURE, judged twice - which way you went and when you went. You
 *          cannot take it back, because that is what diving is.
 *          Sell it, then go.
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

export const MECHANICS = {
  SWEEP: "sweep",
  WINDOW: "window",
  CHARGE: "charge",
  AIM: "aim",
  DIVE: "dive",
};

/**
 * Which mechanic each kind of chance is played with.
 *
 * Assigned so that no position's repertoire repeats itself: every group in REPERTOIRE
 * comes out with four or five different games rather than the two it used to have.
 * `minigames.test.js` holds that, so this table cannot quietly collapse again.
 *
 * The pairings are not arbitrary - each chance is given the verb it actually is. You do not
 * time a header, you place it. You do not place a clearance, you hit it. A dive is the one
 * thing on a football pitch you genuinely cannot take back.
 */
/**
 * Which chances are a game of their own, and which are simply AIMED.
 *
 * THE FOUR THAT ARE A SHOT AT A GOAL ARE NOT HERE, and that is the point. A penalty, a free
 * kick, a one-on-one and a header all ask the same question - which of the goal's five
 * zones - and there is no reason for them to ask it four different ways. They were a
 * sweeping marker, a two-gate bend, a feint and a held bar: four skills, none of which was
 * the skill the moment is actually about, and each of which asked a phone for a gesture it
 * had no business asking. You flick the ball where you want it, or you press the button
 * for it. See aim.jsx, and `keeperDive` for the half that answers back.
 *
 * What is left is the four a goalkeeper plays, where the act really is different - he is
 * not choosing a corner, he is choosing whether to leave his line and when - and the two
 * that are not a duel with a keeper at all: the through ball, where WHERE is the whole
 * question, and the tackle, where WHEN is.
 */
export const CHANCE_MECHANIC = {
  // Keeper. The penalty is the dive; coming for a cross is how far you are willing to go.
  parada_penal: MECHANICS.DIVE,
  salida_mano_a_mano: MECHANICS.WINDOW,
  tiro_lejano: MECHANICS.SWEEP,
  centro_lateral: MECHANICS.CHARGE,
  // Defender. A tackle is timed.
  entrada: MECHANICS.WINDOW,
  // Midfield. The through ball is the one pass where WHERE is the whole question.
  pase_gol: MECHANICS.AIM,
};

/**
 * A disc that is as easy to hit blind as a band of half-width `t` is on a line.
 *
 * The flat mechanics convert on `2t` of a unit line; a disc covers `pi r^2` of a unit
 * square. Derived rather than typed so the two-dimensional game cannot drift into being the
 * generous one the day somebody nudges a number - see the second guard in the test file.
 */
const discFor = (t) => Math.sqrt((2 * t) / Math.PI);

export const TUNING = {
  /**
   * Half-width of the target, as a fraction of the track, at 60 and at 95 OVR. A poor
   * player is aiming at a sixth of the goal; a great one at nearly a third.
   */
  sweep: { at60: 0.085, at95: 0.155, speedAt60: 1.35, speedAt95: 0.95 },
  /** The window's width in the same units, and how fast it closes. */
  window: { at60: 0.1, at95: 0.19, closeAt60: 1.4, closeAt95: 1.0 },
  /** Two gates, wider each because both of them have to land. */
  /**
   * The band on a climbing bar, and the seconds it takes to fill. Better players get a
   * SLOWER bar: a charge cannot be waited out like a sweep can, so composure here is time
   * to think rather than a second pass.
   */
  charge: { at60: 0.085, at95: 0.155, fillAt60: 1.15, fillAt95: 1.7 },
  /** The radius of the disc, area-matched to the sweep band, and the seconds of the run. */
  aim: { at60: discFor(0.085), at95: discFor(0.155), runAt60: 1.6, runAt95: 2.2 },
  /** Two calls out of one gesture, so it is priced like the other two-call game. */
  dive: { at60: 0.11, at95: 0.2, runAt60: 1.5, runAt95: 1.9 },
  /** The beat between two touches, and the length of the bar that beat is measured on. */
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

  if (mechanic === MECHANICS.CHARGE) {
    return {
      ...base,
      // Never in the first third: a band you hit by letting go immediately is not a hold.
      target: 0.34 + next() * 0.5,
      tolerance: lerp(TUNING.charge.at60, TUNING.charge.at95, skill),
      // Seconds to fill the bar once, and there is no second pass.
      period: lerp(TUNING.charge.fillAt60, TUNING.charge.fillAt95, skill),
    };
  }

  if (mechanic === MECHANICS.AIM) {
    const radius = lerp(TUNING.aim.at60, TUNING.aim.at95, skill);
    /*
     * The whole run stays inside the field. Two reasons, and the second is the important
     * one: a disc hanging half off the edge is a smaller target than the same disc in the
     * middle, so where the model happened to put it would decide how hard the chance was -
     * and the parity this file promises is measured on the area of that disc.
     */
    const inside = () => radius + next() * (1 - 2 * radius);
    const from = { x: inside(), y: inside() };
    const to = { x: inside(), y: inside() };

    return {
      ...base,
      // A point that TRAVELS - the run being made, the cross coming across - rather than a
      // coordinate sitting still. `spotAt` says where it is at a given moment, and the only
      // place in this file where the error is not one-dimensional measures against that.
      spot: { x: from.x, y: from.y, travel: { x: to.x - from.x, y: to.y - from.y } },
      tolerance: radius,
      // Seconds for the run. It happens once: miss it and the ball has gone.
      period: lerp(TUNING.aim.runAt60, TUNING.aim.runAt95, skill),
    };
  }

  if (mechanic === MECHANICS.DIVE) {
    return {
      ...base,
      // One gesture, two questions: which way, and when. The second gate sits late because
      // a keeper who goes early has told the taker everything.
      gates: [place(), 0.45 + next() * 0.4],
      tolerance: lerp(TUNING.dive.at60, TUNING.dive.at95, skill),
      period: lerp(TUNING.dive.runAt60, TUNING.dive.runAt95, skill),
    };
  }

  /*
   * Anything the table does not name. Two gates on one travelling marker, which is the
   * most general shape a chance can have - and unreachable in practice, because every
   * mechanic in CHANCE_MECHANIC has a branch above.
   */
  return {
    ...base,
    gates: [place(), place()],
    tolerance: lerp(TUNING.sweep.at60, TUNING.sweep.at95, skill),
    period: lerp(TUNING.sweep.speedAt60, TUNING.sweep.speedAt95, skill),
  };
}

/**
 * What this chance is asking for: one number, two numbers, or one point. Every mechanic
 * reduces to this, which is what keeps a single judge below and a single verdict above.
 */
export const targetsOf = (chance) => chance.gates ?? [chance.spot ?? chance.target];

/**
 * Where a travelling target is at `t` - 0 when the run starts, 1 when it is over. A target
 * that does not travel is wherever it always was, so this is safe to ask of any of them.
 */
export function spotAt(target, t = 1) {
  const travel = target?.travel;
  if (!travel) return target;
  const at = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 1));
  return { x: target.x + travel.x * at, y: target.y + travel.y * at };
}

/**
 * How far off one call was. A missing input is the worst answer available, not a free pass.
 *
 * A two-dimensional input carries WHEN it was committed as well as where, because the thing
 * it is measured against has moved by then. That is one call, not two: you do not choose
 * the moment and the place separately when you are trying to meet a ball.
 */
function missBy(target, value) {
  if (typeof target === "number") {
    return Math.abs((typeof value === "number" ? value : 1) - target);
  }
  const at = spotAt(target, value?.t);
  return Math.hypot((value?.x ?? 1) - at.x, (value?.y ?? 1) - at.y);
}

/**
 * Judge it.
 *
 * `inputs` is what the player committed - where the marker stopped, how long the bar was
 * held, the beat between two touches, or the point a drag was released at. One value for
 * the single-call mechanics, two for a dive, a `{x, y}` for an aim. All of it is
 * in the same 0..1 units, so one comparison covers all seven.
 *
 * Returns the same shape `resolveShot` does, because the rest of the game already knows
 * how to read that and a decider must not care which way it was played.
 */
export function judgeChance(chance, inputs) {
  const values = Array.isArray(inputs) ? inputs : [inputs];
  const targets = targetsOf(chance);

  const errors = targets.map((target, index) => missBy(target, values[index]));
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
