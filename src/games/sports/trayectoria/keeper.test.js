/**
 * The man in the other goal.
 *
 * There was not one. `shotFor` drew the gap flat, once per fixture, and that was the whole
 * of the opposition - so a keeper never learned, a night worth three chances had one
 * answer, and a World Cup final was the same coin as a Sunday in November. These are the
 * three things that had to stop being true.
 */

import { describe, expect, it } from "vitest";

import {
  BLIND_CONVERSION,
  KEEPER,
  ZONES,
  keeperDifficulty,
  keeperDive,
  keeperMemory,
  offTargetOdds,
  rememberShot,
  saveOdds,
} from "./keeper.js";
import { resolveShot, shotFor } from "./bigmatch.js";

describe("how hard the keeper's night is", () => {
  it("rises with what is at stake", () => {
    const sunday = keeperDifficulty({ decides: "derby" });
    const league = keeperDifficulty({ decides: "league" });
    const world = keeperDifficulty({ decides: "world_cup" });
    expect(world).toBeGreaterThan(league);
    expect(league).toBeGreaterThan(sunday);
  });

  it("rises with the side he plays for", () => {
    const minnow = keeperDifficulty({ decides: "cup", reputation: 0 });
    const giant = keeperDifficulty({ decides: "cup", reputation: 5 });
    expect(giant).toBeGreaterThan(minnow);
  });

  /**
   * The part that makes the opposition respond to a career rather than to a rating. Two
   * players with the same OVR, one of whom has scored his last six, do not face the same
   * night: somebody has watched the video.
   */
  it("rises with what the player has actually been converting", () => {
    const cold = keeperDifficulty({ decides: "cup", form: 0.2 });
    const level = keeperDifficulty({ decides: "cup", form: KEEPER.formBaseline });
    const hot = keeperDifficulty({ decides: "cup", form: 0.8 });
    expect(hot).toBeGreaterThan(level);
    // Below a blind guess there is nothing to prepare for, so it does not go the other way.
    expect(cold).toBe(level);
  });

  it("stays inside its own bounds however extreme the night", () => {
    for (const decides of [null, "derby", "world_cup"]) {
      for (const reputation of [-4, 0, 5, 40]) {
        for (const form of [0, 0.5, 1, 9]) {
          const odds = keeperDifficulty({ decides, reputation, form });
          expect(odds).toBeGreaterThanOrEqual(KEEPER.min);
          expect(odds).toBeLessThanOrEqual(KEEPER.max);
        }
      }
    }
  });
});

describe("what the keeper is allowed to have watched", () => {
  it("keeps only the last few, most recent last - a keeper is not a database", () => {
    const ancient = Array.from({ length: 30 }, () => "centro");
    expect(keeperMemory(ancient, ["arriba-derecha"]).length).toBe(KEEPER.recall);
    expect(keeperMemory(ancient, ["arriba-derecha"]).at(-1)).toBe("arriba-derecha");
    expect(rememberShot(ancient, "abajo-izquierda").length).toBe(KEEPER.recall);
  });

  it("takes the night's own attempts after whatever the career carried in", () => {
    expect(keeperMemory(["a", "b"], ["c"])).toEqual(["a", "b", "c"]);
    expect(keeperMemory([], [])).toEqual([]);
    expect(keeperMemory(null, null)).toEqual([]);
  });
});

describe("a night worth more than one chance", () => {
  const fixture = { id: "3-final_copa", kind: "final_copa", decides: "cup", chances: 3 };
  const build = (attempt, memory) =>
    shotFor({
      seed: "many",
      season: 3,
      fixture,
      ovr: 80,
      group: "forward",
      attempt,
      keeper: { difficulty: 0.7, memory },
    });

  /**
   * The gap used to be drawn ONCE PER FIXTURE, so three penalties in one night were three
   * askings of the same question. Find it once and the rest were free.
   */
  it("moves the gap between attempts instead of asking the same question three times", () => {
    let moved = 0;
    for (let i = 0; i < 60; i += 1) {
      const first = shotFor({ seed: `night-${i}`, season: 1, fixture, ovr: 80, attempt: 0 });
      const second = shotFor({ seed: `night-${i}`, season: 1, fixture, ovr: 80, attempt: 1 });
      if (first.gap !== second.gap) moved += 1;
      expect(first.type).toBe(second.type);
    }
    // Two thirds of the time a fresh draw lands somewhere else, and it never used to.
    expect(moved).toBeGreaterThan(25);
  });

  it("is the same night twice from the same seed and the same memory", () => {
    expect(build(1, ["centro"])).toEqual(build(1, ["centro"]));
  });

  it("carries the keeper it was built against, so the next attempt can rebuild him", () => {
    const shot = build(0, []);
    expect(shot.keeper.difficulty).toBeCloseTo(0.7, 6);
    expect(shot.keeper.attempt).toBe(0);
  });

  it("never rules out the gap, whatever the keeper has read", () => {
    for (let i = 0; i < 200; i += 1) {
      const shot = shotFor({
        seed: `hint-${i}`,
        season: 2,
        fixture,
        ovr: 95,
        attempt: i % 3,
        keeper: { difficulty: 0.9, memory: ["izquierda", "izquierda"] },
      });
      if (shot.ruledOut != null) expect(shot.ruledOut).not.toBe(shot.gap);
    }
  });
});

/**
 * THE FIVE ZONES, AND A KEEPER WHO CAN REACH ALL OF THEM.
 *
 * The old model was binary: he "covered" every placement but one, so a chance was a
 * one-in-three guess and going the wrong way cost him nothing, because there was no wrong
 * way to go. He commits to one of five now and his chances of stopping it fall away from
 * there - steeply, and never to zero.
 */
describe("reaching all of it, and not from everywhere", () => {
  /**
   * THE WHOLE OF IT. A keeper who dives to the top left does not save the bottom right.
   *
   * Softened for a while into a reach that fell away with distance, which meant he stopped
   * about a seventh of the shots into the opposite angle - and every one of those put SAVED
   * on a screen showing him going the other way. He commits, and the zone he commits to is
   * the only one he can do anything about.
   */
  it("stops nothing at all outside the zone he went to", () => {
    for (const from of ZONES) {
      for (const to of ZONES) {
        if (to === from) continue;
        for (const difficulty of [0.1, 0.5, 0.92]) {
          expect(saveOdds(to, from, difficulty), `${from} -> ${to}`).toBe(0);
        }
      }
      // And where he did go he is very good, and never certain.
      expect(saveOdds(from, from)).toBeGreaterThan(0.6);
      expect(saveOdds(from, from)).toBeLessThan(1);
    }
  });

  /**
   * Which leaves the night itself with almost nothing to do - he is in your zone one time
   * in five whatever kind of night it is - so a hard one has to bite somewhere else. It
   * bites on the shot: over the bar, wide of the post. See `offTargetOdds`.
   */
  it("makes a big night hard through the shot rather than through his arms", () => {
    const quiet = offTargetOdds(0.4, 75);
    const big = offTargetOdds(0.92, 75);
    expect(big).toBeGreaterThan(quiet);
    // And a rating is what holds up against it.
    expect(offTargetOdds(0.92, 95)).toBeLessThan(offTargetOdds(0.92, 62));
    // Never all of them, and never none.
    expect(offTargetOdds(1, 1)).toBeLessThanOrEqual(KEEPER.wildest);
    expect(offTargetOdds(0, 99)).toBe(0);
  });

  it("saves more on a big night and less on a quiet one, without ever being certain", () => {
    for (const zone of ZONES) {
      const quiet = saveOdds(zone, "centro", 0.4);
      const big = saveOdds(zone, "centro", 0.92);
      expect(big).toBeGreaterThanOrEqual(quiet);
      expect(big).toBeLessThanOrEqual(KEEPER.ceiling);
    }
  });

  /**
   * The prior the whole season budget is priced off. It used to be a flat third asserted
   * beside a keeper who happened to agree; deriving it means the two cannot drift apart.
   */
  it("prices a blind shot at what the keeper actually concedes", () => {
    /*
     * Four zones in five are a goal, less whatever the night takes off target - which lands
     * near where a real penalty does, and a long way above the one-in-three this game used
     * to assume. The season budget reads this rather than an assumption: see
     * `shotScoringRate`.
     */
    expect(BLIND_CONVERSION).toBeGreaterThan(0.5);
    expect(BLIND_CONVERSION).toBeLessThan(0.78);
  });
});

describe("where the keeper goes", () => {
  const dive = (memory, difficulty, runs = 4000) => {
    const counts = Object.fromEntries(ZONES.map((zone) => [zone, 0]));
    for (let i = 0; i < runs; i += 1) {
      counts[
        keeperDive({ seed: `d-${i}`, season: 1, fixtureId: "f", memory, difficulty })
      ] += 1;
    }
    return Object.fromEntries(Object.entries(counts).map(([k, n]) => [k, n / runs]));
  };

  /**
   * Even across the four corners, and MORE than that in the middle. Every corner costs him
   * a dive; the middle is the one place he holds by standing still, so he is there rather
   * more than a fifth of the time - which is what makes putting it down the middle the
   * gamble it is supposed to be instead of the safest thing on the board. See KEEPER.middle.
   */
  it("spreads himself evenly across the corners and holds the middle more", () => {
    const flat = dive([], KEEPER.typical);
    const corners = ZONES.filter((zone) => zone !== "centro");
    for (const zone of corners) expect(Math.abs(flat[zone] - 0.18), zone).toBeLessThan(0.03);
    expect(flat.centro).toBeGreaterThan(0.25);
    expect(flat.centro).toBeLessThan(0.4);
  });

  /** "Si hay más de una ocasión, el portero almacena hacia dónde tiró antes el jugador." */
  it("goes where the player has been going", () => {
    const fresh = dive([], 0.85)["abajo-derecha"];
    const habit = dive(["abajo-derecha", "abajo-derecha", "abajo-derecha"], 0.85);
    expect(habit["abajo-derecha"]).toBeGreaterThan(fresh * 1.5);
    // And everywhere he has not been sent opens up, the middle included.
    for (const zone of ZONES) {
      if (zone !== "abajo-derecha") expect(habit[zone], zone).toBeLessThan(dive([], 0.85)[zone]);
    }
  });

  it("reads harder the better his night is", () => {
    const memory = ["centro", "centro", "centro"];
    expect(dive(memory, 0.9).centro).toBeGreaterThan(dive(memory, 0.1).centro);
  });
});

/**
 * "Si chuto abajo izquierda y el portero no se tira ahí, debe ser gol."
 *
 * The rule the whole model was rebuilt around, checked end to end rather than a table at a
 * time: the only two ways a shot does not go in are the keeper being in that zone, and the
 * shot never reaching the goal. There is no third.
 */
describe("shooting where he is not", () => {
  const fixture = { id: "5-penal", kind: "final_copa", decides: "cup", chances: 1 };

  it("goes in every time, unless the ball missed the goal", () => {
    for (let i = 0; i < 400; i += 1) {
      const shot = shotFor({ seed: `open-${i}`, season: 1, fixture, ovr: 80, group: "forward" });
      for (const zone of shot.options) {
        if (zone === shot.keeperAt) continue;
        const result = resolveShot(shot, zone);
        expect(result.save, `${zone} against a keeper at ${shot.keeperAt}`).toBe(0);
        // The only thing between it and the net is whether it was a shot at all.
        expect(result.scored, `${zone}: not a goal and not off target`).toBe(!result.offTarget);
      }
    }
  });

  it("is the keeper's zone or nothing: there is no third way to be stopped", () => {
    let saves = 0;
    let wide = 0;
    let goals = 0;
    for (let i = 0; i < 600; i += 1) {
      const shot = shotFor({ seed: `all-${i}`, season: 2, fixture, ovr: 78, group: "forward" });
      const zone = shot.options[i % shot.options.length];
      const result = resolveShot(shot, zone);
      if (result.scored) goals += 1;
      else if (result.offTarget) wide += 1;
      else {
        saves += 1;
        // Every single save is the keeper standing in the zone the ball went to.
        expect(zone, "a save from a keeper who went somewhere else").toBe(shot.keeperAt);
      }
    }
    expect(goals).toBeGreaterThan(0);
    expect(saves).toBeGreaterThan(0);
    expect(wide).toBeGreaterThan(0);
  });

  it("still punishes a player who keeps going back to the same corner", () => {
    const run = (memory) => {
      let scored = 0;
      for (let i = 0; i < 800; i += 1) {
        const shot = shotFor({
          seed: `habit-${i}`,
          season: 3,
          fixture,
          ovr: 80,
          group: "forward",
          keeper: { difficulty: 0.85, memory },
        });
        if (resolveShot(shot, ZONES[0]).scored) scored += 1;
      }
      return scored / 800;
    };
    const fresh = run([]);
    const known = run([ZONES[0], ZONES[0], ZONES[0], ZONES[0]]);
    expect(known).toBeLessThan(fresh);
    // Not a rounding difference: a keeper who has your number is worth real goals.
    expect(fresh - known).toBeGreaterThan(0.08);
  });
});

/**
 * "He lanzado 4 veces en el mismo partido al mismo sitio y siempre acabó en gol."
 *
 * The memory existed and it was far too polite. At the weight it was written with, a player
 * could put four penalties into the same corner in one night and watch the keeper go
 * somewhere else for three of them: having seen the same shot twice he still only went
 * there 27% of the time, which is barely above the 18% a corner gets from a man who has
 * seen nothing at all. That is not somebody watching you.
 *
 * It was being filed twice as well - `state.shots` already holds the night's attempts, and
 * `keeperFacing` handed them in again beside it - so a five-deep dossier held two and a
 * half shots. See `keeperMemory`.
 */
describe("going back to the same corner all night", () => {
  const goesThere = (times, difficulty) => {
    const memory = Array.from({ length: times }, () => "arriba-izquierda");
    let hit = 0;
    const runs = 6000;
    for (let i = 0; i < runs; i += 1) {
      const dive = keeperDive({
        seed: `same-${i}`,
        season: 1,
        fixtureId: "f",
        attempt: times,
        memory,
        difficulty,
      });
      if (dive === "arriba-izquierda") hit += 1;
    }
    return hit / runs;
  };

  it("has him standing there by the second one", () => {
    const cold = goesThere(0, KEEPER.typical);
    const once = goesThere(1, KEEPER.typical);
    // One repeat is enough to more than double how often he is waiting for it.
    expect(once).toBeGreaterThan(cold * 2);
    expect(once).toBeGreaterThan(0.35);
  });

  it("keeps learning, and never quite becomes a certainty", () => {
    const seen = [1, 2, 3, 4].map((times) => goesThere(times, KEEPER.typical));
    for (let i = 1; i < seen.length; i += 1) {
      expect(seen[i], `after ${i + 1}`).toBeGreaterThanOrEqual(seen[i - 1] - 0.02);
    }
    // He has four other places to be, so a favourite corner is never simply closed.
    expect(seen[seen.length - 1]).toBeLessThan(0.7);
  });

  it("makes four goals from four identical shots a rare night, not the usual one", () => {
    const four = (style) => {
      let nights = 0;
      let perfect = 0;
      for (let night = 0; night < 3000; night += 1) {
        let memory = [];
        let goals = 0;
        for (let attempt = 0; attempt < 4; attempt += 1) {
          const zone = style === "same" ? ZONES[0] : ZONES[attempt % ZONES.length];
          const dive = keeperDive({
            seed: `n-${night}-${attempt}`,
            season: 1,
            fixtureId: "f",
            attempt,
            memory,
            difficulty: KEEPER.typical,
          });
          if (saveOdds(zone, dive) === 0) goals += 1;
          memory = [...memory, zone].slice(-KEEPER.recall);
        }
        nights += 1;
        if (goals === 4) perfect += 1;
      }
      return perfect / nights;
    };

    const same = four("same");
    const varied = four("vary");
    // Still possible - he can guess wrong four times - but no longer the likely outcome.
    expect(same, "four identical shots still walk in").toBeLessThan(0.15);
    // And varying it is worth a great deal more than repeating it.
    expect(varied).toBeGreaterThan(same * 2);
  });
});
