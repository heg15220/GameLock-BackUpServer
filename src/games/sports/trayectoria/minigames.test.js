/**
 * The moments that are yours, guarded.
 *
 * Two things have to be true of a roster of minigames, and they pull against each other:
 *
 *  1. A CAREER HAS TO SEE SEVERAL. The repertoire is filtered by position, so a goalkeeper
 *     used to play two of these and nothing else - twelve sweeps and twelve windows across
 *     fifteen seasons. Variety that only exists across careers is not variety.
 *  2. NONE OF THEM CAN BE THE EASY ONE. `conversionRate` re-prices the season off what the
 *     player actually converts, so a mechanic that is a third easier than the rest is not a
 *     nicer screen, it is a centre-back with a striker's career. Which one you get is
 *     decided by your position, and your position must not decide your luck.
 *
 * The second is measured rather than argued: blind inputs, Monte Carlo, and every mechanic
 * that asks for the same number of calls has to convert at the same rate.
 */
import { describe, expect, it } from "vitest";

import {
  CHANCE_MECHANIC,
  MECHANICS,
  TUNING,
  buildChance,
  judgeChance,
  skillOf,
  spotAt,
  targetsOf,
} from "./minigames.js";
import { REPERTOIRE, SHOT_TYPES } from "./bigmatch.js";

const build = (shotType, ovr = 80, seed = "c") =>
  buildChance({ seed, season: 1, fixtureId: "f", shotType, ovr });

/** One call or two: what a mechanic asks the player for. */
const callsOf = (chance) => targetsOf(chance).length;

/** The worst answer available to every call this chance makes. */
const onTheFarSide = (chance) =>
  targetsOf(chance).map((target) => {
    if (typeof target === "number") return target > 0.5 ? 0 : 1;
    const at = spotAt(target, 1);
    return { x: at.x > 0.5 ? 0 : 1, y: at.y > 0.5 ? 0 : 1, t: 1 };
  });

/**
 * A blind player: inputs drawn uniformly at random from whatever the mechanic accepts.
 * Nobody plays like this, which is the point - it measures the geometry of the target and
 * nothing else, so it cannot be talked out of by an argument about feel.
 */
function blindRate(chance, runs = 40000) {
  const flat = { ...chance, nailed: false };
  let scored = 0;
  for (let i = 0; i < runs; i += 1) {
    const calls = chance.gates ?? [chance.spot ?? chance.target];
    const inputs = calls.map((target) =>
      typeof target === "number" ? Math.random() : { x: Math.random(), y: Math.random() },
    );
    if (judgeChance(flat, inputs.length > 1 ? inputs : inputs[0]).scored) scored += 1;
  }
  return scored / runs;
}

describe("the roster", () => {
  /**
   * NOT EVERY CHANCE HAS A GAME, and that is deliberate now.
   *
   * The four that are a shot at a goal ask one question - which of the goal's five zones -
   * and they ask it with a flick or a button rather than with four different bars. What is
   * left here is the keeper's four, where the act genuinely is something else, and the two
   * that are not a duel with a keeper at all. See CHANCE_MECHANIC and aim.jsx.
   */
  it("gives every mechanic it names a game that exists", () => {
    for (const [shotType, mechanic] of Object.entries(CHANCE_MECHANIC)) {
      expect(SHOT_TYPES[shotType], `${shotType} is not a chance the game deals`).toBeTruthy();
      expect(Object.values(MECHANICS)).toContain(mechanic);
    }
    for (const shotType of ["penal", "falta", "mano_a_mano", "cabezazo"]) {
      expect(CHANCE_MECHANIC[shotType], `${shotType} still has a minigame`).toBeUndefined();
    }
  });

  it("uses every one of them", () => {
    const used = new Set(Object.values(CHANCE_MECHANIC));
    expect(used.size).toBe(Object.keys(MECHANICS).length);
  });

  /**
   * The one that started this. A career is one position, so the roster that matters is the
   * roster your position can be handed - and a keeper seeing two games in fifteen seasons
   * is the whole complaint.
   */
  it("never asks a position to play the same game twice", () => {
    for (const [group, types] of Object.entries(REPERTOIRE)) {
      const mechanics = new Set(
        types.map((type) => CHANCE_MECHANIC[type]).filter(Boolean),
      );
      /*
       * As many different games as the position has chances - which used to be a flat
       * "at least four" and is now the honest version of the same rule. A centre-back's
       * repertoire is two moments, the tackle and the clearance (see REPERTOIRE), so four
       * was a number he could not reach; what must never happen is two of his chances
       * being the same thing with a different label on it.
       */
      /*
       * Counted over the chances that HAVE a game. A striker's four are all zones now, so
       * he plays none of these - and the rule that matters is still that no position is
       * handed the same game twice under two different names.
       */
      const played = types.filter((type) => CHANCE_MECHANIC[type]);
      expect(
        mechanics.size,
        `${group} plays ${played.length} games with only ${mechanics.size} of them distinct`,
      ).toBe(played.length);
    }
  });
});

describe("no mechanic is the easy one", () => {
  /**
   * Same number of calls, same odds. Two-call mechanics are harder than one-call ones and
   * always were - `bend` has asked for two touches since the first version and the season
   * model was measured with it in - so they are held to each other rather than to the rest.
   */
  it("converts at the same rate for the same number of calls, blind", () => {
    for (const ovr of [62, 80, 95]) {
      const rates = { 1: [], 2: [] };
      for (const shotType of Object.keys(SHOT_TYPES)) {
        const chance = build(shotType, ovr);
        rates[callsOf(chance)].push({ shotType, rate: blindRate(chance) });
      }
      for (const calls of [1, 2]) {
        const measured = rates[calls];
        expect(measured.length, `nothing asks for ${calls} call(s)`).toBeGreaterThan(0);
        const low = Math.min(...measured.map((m) => m.rate));
        const high = Math.max(...measured.map((m) => m.rate));
        const report = measured.map((m) => `${m.shotType} ${(m.rate * 100).toFixed(1)}%`).join(", ");
        expect(high / low, `at ${ovr} OVR: ${report}`).toBeLessThan(1.4);
      }
    }
  });

  it("pays a better player in every one of them", () => {
    for (const shotType of Object.keys(SHOT_TYPES)) {
      const poor = build(shotType, 62);
      const great = build(shotType, 95);
      expect(great.tolerance, `${shotType} does not reward OVR`).toBeGreaterThan(poor.tolerance);
      expect(blindRate(great, 20000)).toBeGreaterThan(blindRate(poor, 20000));
    }
    expect(skillOf(50)).toBe(0);
    expect(skillOf(99)).toBe(1);
  });

  /** The pass disc is derived from the flat band, so the two cannot drift apart by hand. */
  it("matches the through-ball target to the flat ones by area", () => {
    for (const at of ["at60", "at95"]) {
      expect(Math.PI * TUNING.pass[at] ** 2).toBeCloseTo(2 * TUNING.sweep[at], 6);
    }
  });
});

describe("each one is playable", () => {
  it("never hides the target where it cannot be reached", () => {
    for (let i = 0; i < 200; i += 1) {
      for (const shotType of Object.keys(SHOT_TYPES)) {
        const chance = build(shotType, 75, `reach-${i}`);
        for (const target of targetsOf(chance)) {
          if (typeof target === "number") {
            expect(target).toBeGreaterThan(0.1);
            expect(target).toBeLessThan(0.92);
          } else {
            // A travelling disc has to be WHOLLY inside the field for the whole run: half
            // of it hanging off an edge is a smaller target, so where the model happened to
            // put it would quietly decide how hard the chance was.
            for (const t of [0, 0.25, 0.5, 0.75, 1]) {
              const at = spotAt(target, t);
              expect(Math.min(at.x, at.y) - chance.tolerance).toBeGreaterThanOrEqual(-1e-9);
              expect(Math.max(at.x, at.y) + chance.tolerance).toBeLessThanOrEqual(1 + 1e-9);
            }
          }
        }
      }
    }
  });

  /** A hold you cannot complete and a beat you cannot hit are the same bug. */
  it("gives every timed mechanic a window a human can land", () => {
    for (const shotType of Object.keys(SHOT_TYPES)) {
      const chance = build(shotType, 62);
      if (chance.period === undefined) continue;
      expect(chance.period, `${shotType} runs too fast to play`).toBeGreaterThan(0.5);
      expect(chance.period, `${shotType} takes too long`).toBeLessThan(3);
    }
  });

  it("answers the target with a goal and the far side with nothing", () => {
    for (const shotType of Object.keys(SHOT_TYPES)) {
      const chance = { ...build(shotType, 80), nailed: false };
      // A travelling target has to be met where it will BE, so the honest answer to it is
      // a point plus the moment - see `spotAt`. Half the run in, and on it.
      const on = targetsOf(chance).map((t) =>
        typeof t === "number" ? t : { ...spotAt(t, 0.5), t: 0.5 },
      );
      expect(judgeChance(chance, on.length > 1 ? on : on[0]).scored, `${shotType} on target`).toBe(true);

      const off = onTheFarSide(chance);
      expect(judgeChance(chance, off.length > 1 ? off : off[0]).scored, `${shotType} off target`).toBe(false);
    }
  });

  it("keeps the bail-out a great player always had, whichever game it is", () => {
    for (const shotType of Object.keys(SHOT_TYPES)) {
      const chance = { ...build(shotType, 95), nailed: true };
      // Deliberately the far side of every call: this has to be a rescued goal, not a
      // clean one that happened to land inside a great player's wide target.
      const off = onTheFarSide(chance);
      const result = judgeChance(chance, off.length > 1 ? off : off[0]);
      expect(result.scored, `${shotType} forgets the bail-out`).toBe(true);
      expect(result.clean).toBe(false);
      expect(result.nailedIt).toBe(true);
    }
  });

  it("is the same chance every time it is built", () => {
    for (const shotType of Object.keys(SHOT_TYPES)) {
      expect(build(shotType, 80)).toEqual(build(shotType, 80));
    }
  });

  it("grades every finish between nothing and dead centre", () => {
    for (const shotType of Object.keys(SHOT_TYPES)) {
      const chance = { ...build(shotType, 80), nailed: false };
      for (const input of [0, 0.5, 1, undefined, { x: 0.5, y: 0.5 }, [0.1, 0.9]]) {
        const { accuracy } = judgeChance(chance, input);
        expect(accuracy).toBeGreaterThanOrEqual(0);
        expect(accuracy).toBeLessThanOrEqual(1);
      }
    }
  });
});
