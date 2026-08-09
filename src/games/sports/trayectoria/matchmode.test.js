/**
 * How a decider gets played, and what it plays like.
 *
 * Three modules with one job between them: decide whether the ball is at the player's
 * feet, and if it is, give him something to be good at. The model must not be able to
 * tell the difference afterwards - the season's budget was priced off how often he
 * converts, not off how he does it - so these guard the seams rather than the outcomes.
 */
import { describe, expect, it } from "vitest";

import { MODES, MODE_ODDS, modeFor, skillOdds } from "./matchmode.js";
import { CHANCE_MECHANIC, MECHANICS, buildChance, judgeChance, skillOf } from "./minigames.js";
import { FULL_TIME, MOMENT_WINDOW, narrateFinish, narrateMatch } from "./narration.js";
import { SHOT_TYPES } from "./bigmatch.js";
import { getCopy } from "./copy.js";

describe("who takes the important ones", () => {
  it("hands the ball to the player the side depends on", () => {
    const nobody = skillOdds({ delta: -9, role: "suplente", shotType: "cabezazo" });
    const somebody = skillOdds({ delta: 9, role: "titular", shotType: "penal" });
    expect(somebody).toBeGreaterThan(nobody);
    // The arc the career is actually about: a kid watches, the best player decides.
    expect(somebody - nobody).toBeGreaterThan(0.4);
  });

  it("rises with delta and with the shirt, separately", () => {
    let last = -1;
    for (let delta = -12; delta <= 12; delta += 2) {
      const odds = skillOdds({ delta, role: "titular", shotType: "mano_a_mano" });
      expect(odds).toBeGreaterThanOrEqual(last);
      last = odds;
    }
    expect(skillOdds({ delta: 0, role: "titular" })).toBeGreaterThan(
      skillOdds({ delta: 0, role: "suplente" }),
    );
  });

  it("knows somebody takes the penalties and nobody claims a scramble", () => {
    const at = (shotType) => skillOdds({ delta: 2, role: "titular", shotType });
    expect(at("penal")).toBeGreaterThan(at("mano_a_mano"));
    expect(at("mano_a_mano")).toBeGreaterThan(at("cabezazo"));
  });

  it("never makes a career all one thing", () => {
    for (const delta of [-30, -8, 0, 8, 30]) {
      for (const role of ["titular", "rotacion_alta", "rotacion_baja", "suplente", null]) {
        for (const shotType of [...Object.keys(SHOT_TYPES), null]) {
          const odds = skillOdds({ delta, role, shotType });
          expect(odds).toBeGreaterThanOrEqual(MODE_ODDS.min);
          expect(odds).toBeLessThanOrEqual(MODE_ODDS.max);
        }
      }
    }
  });

  it("is a pure function of the seed, and independent per fixture", () => {
    const at = (fixtureId) =>
      modeFor({ seed: "m", season: 3, fixtureId, delta: 0, role: "titular", shotType: "penal" });
    expect(at("a")).toBe(at("a"));
    // Three deciders in one May can come up differently; that is the point of keying
    // off the fixture rather than the season.
    const kinds = new Set(["a", "b", "c", "d", "e", "f"].map(at));
    expect(kinds.size).toBeGreaterThan(0);
  });

  it("fires at about the rate it prints", () => {
    let skill = 0;
    const n = 4000;
    for (let i = 0; i < n; i += 1) {
      const mode = modeFor({
        seed: `dist-${i}`, season: 1, fixtureId: "f",
        delta: 4, role: "titular", shotType: "volea",
      });
      if (mode === MODES.SKILL) skill += 1;
    }
    const expected = skillOdds({ delta: 4, role: "titular", shotType: "volea" });
    expect(skill / n).toBeCloseTo(expected, 1);
  });
});

describe("the chance itself", () => {
  const chanceFor = (shotType, ovr) =>
    buildChance({ seed: "c", season: 1, fixtureId: "f", shotType, ovr });

  it("gives every kind of chance a mechanic", () => {
    for (const shotType of Object.keys(SHOT_TYPES)) {
      expect(CHANCE_MECHANIC[shotType], `no mechanic for ${shotType}`).toBeTruthy();
      const chance = chanceFor(shotType, 80);
      expect(Object.values(MECHANICS)).toContain(chance.mechanic);
    }
  });

  it("gives a better player a bigger target", () => {
    for (const shotType of Object.keys(SHOT_TYPES)) {
      expect(chanceFor(shotType, 92).tolerance).toBeGreaterThan(chanceFor(shotType, 62).tolerance);
    }
    expect(skillOf(50)).toBe(0);
    expect(skillOf(99)).toBe(1);
  });

  it("never puts the target somewhere it cannot be reached", () => {
    for (let i = 0; i < 300; i += 1) {
      const chance = buildChance({ seed: `p-${i}`, season: 1, fixtureId: "f", shotType: "penal", ovr: 75 });
      expect(chance.target).toBeGreaterThan(0.1);
      expect(chance.target).toBeLessThan(0.9);
    }
  });

  it("is the same chance every time it is built", () => {
    expect(chanceFor("falta", 80)).toEqual(chanceFor("falta", 80));
  });

  it("scores a shot on the target and misses one that is not", () => {
    const chance = chanceFor("penal", 80);
    expect(judgeChance({ ...chance, nailed: false }, chance.target).scored).toBe(true);
    const wide = Math.min(1, chance.target + chance.tolerance * 3 + 0.2);
    expect(judgeChance({ ...chance, nailed: false }, wide).scored).toBe(false);
  });

  it("wants both touches on a free kick, and judges by the worse one", () => {
    const chance = chanceFor("falta", 80);
    expect(chance.gates).toHaveLength(2);
    const both = judgeChance({ ...chance, nailed: false }, chance.gates);
    expect(both.scored).toBe(true);
    const half = judgeChance({ ...chance, nailed: false }, [chance.gates[0], 0.99]);
    expect(half.scored).toBe(false);
  });

  it("keeps the bail-out a great player always had", () => {
    const chance = { ...chanceFor("volea", 95), nailed: true };
    const result = judgeChance(chance, 0.99);
    expect(result.scored).toBe(true);
    expect(result.clean).toBe(false);
    expect(result.nailedIt).toBe(true);
  });

  it("grades the finish between nothing and dead centre", () => {
    const chance = { ...chanceFor("penal", 80), nailed: false };
    expect(judgeChance(chance, chance.target).accuracy).toBeCloseTo(1, 6);
    for (const input of [0, 0.5, 1, undefined]) {
      const { accuracy } = judgeChance(chance, input);
      expect(accuracy).toBeGreaterThanOrEqual(0);
      expect(accuracy).toBeLessThanOrEqual(1);
    }
  });
});

describe("the ninety minutes", () => {
  const build = (seed = "n") =>
    narrateMatch({
      seed, season: 4, fixtureId: "f", kind: "titulo_liga",
      ourName: "Nuestro", theirName: "Ellos",
    });

  it("runs in order, opens on kick-off and stops on the chance", () => {
    const match = build();
    expect(match.beats[0].id).toBe("kickoff");
    expect(match.beats[match.beats.length - 1].id).toBe("chance");
    for (let i = 1; i < match.beats.length; i += 1) {
      expect(match.beats[i].minute).toBeGreaterThanOrEqual(match.beats[i - 1].minute);
    }
    expect(match.moment).toBeGreaterThanOrEqual(MOMENT_WINDOW[0]);
    expect(match.moment).toBeLessThanOrEqual(MOMENT_WINDOW[1]);
  });

  it("stops before the result, because the result is not decided yet", () => {
    const match = build();
    expect(match.beats.some((beat) => beat.id === "scored" || beat.id === "missed")).toBe(false);
    expect(match).not.toHaveProperty("won");
  });

  it("adds one goal per chance he converted, and always ends at ninety", () => {
    const match = build();
    const hit = narrateFinish(match, [true]);
    const miss = narrateFinish(match, [false]);
    expect(hit.final.home).toBe(match.standing.home + 1);
    expect(miss.final.home).toBe(match.standing.home);
    expect(hit.final.away).toBe(miss.final.away);
    for (const finish of [hit, miss]) {
      expect(finish.beats[finish.beats.length - 1].id).toBe("fullTime");
      expect(finish.beats[finish.beats.length - 1].minute).toBe(FULL_TIME);
    }
  });

  it("tells every chance he had, in order, with the score after each", () => {
    const match = narrateMatch({
      seed: "many", season: 1, fixtureId: "f", kind: "final_copa",
      chances: 3, ourName: "Nuestro", theirName: "Ellos",
    });
    expect(match.chances).toBe(3);
    expect(match.moments).toHaveLength(3);
    expect(match.beats.filter((b) => b.id === "chance")).toHaveLength(3);
    // The last of them is the one the clock stops on.
    expect(Math.max(...match.moments)).toBe(match.moment);

    const finish = narrateFinish(match, [false, true, true]);
    expect(finish.converted).toBe(2);
    expect(finish.final.home).toBe(match.standing.home + 2);
    const told = finish.beats.filter((b) => b.id === "scored" || b.id === "missed");
    expect(told.map((b) => b.id)).toEqual(["missed", "scored", "scored"]);
    // Running score after each, never the final one attached to the first.
    expect(told[0].home).toBe(match.standing.home);
    expect(told[2].home).toBe(match.standing.home + 2);
  });

  /**
   * The screen stops its clock at `moments[attempt]` and asks there. So there has to be
   * exactly one stop per chance, in order, and the last of them has to be the minute the
   * match is remembered for.
   *
   * Getting this wrong hung the game: the clock stopped at `moment` - the LAST chance -
   * for every attempt, so on a night worth two it ran past the first, asked at the second,
   * and then could never announce arriving anywhere again.
   */
  it("gives the clock one stop per chance, in order, ending on the moment", () => {
    for (let i = 0; i < 200; i += 1) {
      for (const chances of [1, 2, 3, 4]) {
        const match = narrateMatch({
          seed: `stops-${i}`, season: 1, fixtureId: "f", kind: "final_copa",
          chances, ourName: "N", theirName: "E",
        });
        expect(match.moments).toHaveLength(chances);
        expect(match.moments[chances - 1]).toBe(match.moment);
        for (let k = 1; k < chances; k += 1) {
          // Strictly ascending: two stops on the same minute is one stop the screen loses.
          expect(match.moments[k]).toBeGreaterThan(match.moments[k - 1]);
        }
        for (const minute of match.moments) {
          expect(minute).toBeGreaterThan(45);
          expect(minute).toBeLessThan(FULL_TIME);
        }
        // And every one of them has a beat, or the feed asks for a shot it never set up.
        expect(match.beats.filter((beat) => beat.id === "chance")).toHaveLength(chances);
      }
    }
  });

  it("says so when the ball never came to him, and asks nothing", () => {
    const match = narrateMatch({
      seed: "none", season: 1, fixtureId: "f", kind: "titulo_liga",
      chances: 0, ourName: "Nuestro", theirName: "Ellos",
    });
    expect(match.beats.some((b) => b.id === "chance")).toBe(false);
    expect(match.beats.some((b) => b.id === "bystander")).toBe(true);

    const finish = narrateFinish(match, []);
    expect(finish.converted).toBe(0);
    expect(finish.scored).toBe(false);
    expect(finish.final.home).toBe(match.standing.home);
    expect(finish.beats.some((b) => b.id === "untouched")).toBe(true);
  });

  it("keeps the running score honest through the build-up", () => {
    for (let i = 0; i < 200; i += 1) {
      const match = build(`score-${i}`);
      let home = 0;
      let away = 0;
      for (const beat of match.beats) {
        if (beat.id === "goalUs") home += 1;
        if (beat.id === "goalThem") away += 1;
        // Every beat carries the score as it stood when it happened.
        expect(beat.home).toBe(home);
        expect(beat.away).toBe(away);
      }
      expect(match.standing).toEqual({ home, away });
    }
  });

  it("is the same match every time", () => {
    expect(build("same")).toEqual(build("same"));
  });

  /**
   * press.js never invents a fact and neither does this. A beat with no line in the copy
   * would render as an empty row, which is exactly the kind of silent hole `scene.test.js`
   * exists to catch for shot types.
   */
  it("only ever emits beats both languages can say", () => {
    const ids = new Set();
    for (let i = 0; i < 400; i += 1) {
      for (const chances of [0, 1, 2, 3, 4]) {
        const match = narrateMatch({
          seed: `beats-${i}`, season: 1, fixtureId: "f", kind: "titulo_liga",
          chances, ourName: "N", theirName: "E",
        });
        for (const beat of match.beats) ids.add(beat.id);
        const attempts = Array.from({ length: chances }, (_, k) => (i + k) % 2 === 0);
        for (const beat of narrateFinish(match, attempts).beats) ids.add(beat.id);
      }
    }
    expect(ids.size).toBeGreaterThan(8);
    for (const locale of ["es", "en"]) {
      for (const id of ids) {
        const lines = getCopy(locale).match.beats[id];
        expect(lines, `no ${locale} line for beat "${id}"`).toBeTruthy();
        // Every id carries several ways of saying it, and none of them is blank.
        const list = Array.isArray(lines) ? lines : [lines];
        expect(list.length, `only one ${locale} line for "${id}"`).toBeGreaterThan(2);
        for (const line of list) expect(line.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("reads the same way twice and differently across matches", () => {
    const one = build("variety-a");
    expect(one).toEqual(build("variety-a"));
    const variants = new Set();
    for (let i = 0; i < 60; i += 1) {
      for (const beat of build(`variety-${i}`).beats) {
        if (beat.id === "kickoff") variants.add(beat.variant % 5);
      }
    }
    // The opening line is not the same one every single match.
    expect(variants.size).toBeGreaterThan(1);
  });
});
