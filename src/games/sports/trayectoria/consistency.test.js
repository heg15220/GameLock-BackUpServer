/**
 * The picture and the sentence beside it, checked against each other.
 *
 * Every other test file here asks whether the model is right. This one asks whether the two
 * halves of the screen are saying the same thing, which is a different question and the one
 * the player actually notices: the feed announced a goal he had not scored, the verdict said
 * SAVED over a keeper drawn diving into the opposite corner, and the season table named a
 * placement nothing had gone anywhere near. None of it was wrong arithmetic. All of it was
 * two truthful components disagreeing about the same event.
 *
 * Three rules, and they are the three groups below:
 *
 *  1. WHAT COMING THROUGH DID TO THE BOARD depends on what coming through WAS. A save is
 *     not a goal - see PRODUCE_BEATS in narration.js.
 *  2. THE KEEPER IS DRAWN WHERE THE MODEL PUT HIM, in every one of the four ways a chance
 *     can end - see `stageShot` in scene.jsx.
 *  3. A PLAYED CHANCE NAMES ITSELF, so the drawing, the verdict and the table are quoting
 *     the same placement - see `playedPlacement` in career.js.
 */

import { describe, expect, it } from "vitest";

import { PRODUCES, SHOT_PRODUCES, SHOT_TYPES, resolveShot } from "./bigmatch.js";
import { beatLines, getCopy } from "./copy.js";
import { FULL_TIME, narrateFinish, narrateMatch, withStandings } from "./narration.js";
import { PLACEMENTS, SITUATIONS, stageShot } from "./scene.jsx";
import { at } from "./pitch.jsx";
import { KEEPER, saveOdds } from "./keeper.js";

const build = (produces, seed = "consistency") =>
  narrateMatch({
    seed,
    season: 3,
    fixtureId: "f",
    kind: "final_copa",
    chances: 1,
    ourName: "Nos",
    theirName: "Ellos",
    produces,
  });

describe("what coming through put on the scoreboard", () => {
  /**
   * The defect this whole file was written for. A goalkeeper's decisive chance is a SAVE,
   * and `narrateFinish` added one to our score for it: the feed said "you score, no keeper
   * stops that" about a man who is the keeper, the board went 1-0, and the verdict beside
   * it read LA SACAS. Failing one moved nothing at all, so being beaten from the spot in
   * the last minute left the match exactly as it had been.
   */
  it("leaves the board alone when the player saved it, and gives them one when he did not", () => {
    const match = build("stop");
    const saved = narrateFinish(match, [true], { produces: "stop" });
    const beaten = narrateFinish(match, [false], { produces: "stop" });

    expect(saved.final).toEqual(match.standing);
    expect(beaten.final.home).toBe(match.standing.home);
    expect(beaten.final.away).toBe(match.standing.away + 1);

    expect(saved.beats.some((beat) => beat.id === "stopped")).toBe(true);
    expect(saved.beats.some((beat) => beat.id === "scored")).toBe(false);
    expect(beaten.beats.some((beat) => beat.id === "conceded")).toBe(true);
  });

  it("still scores a goal for a chance that is a goal, and one for an assist", () => {
    for (const produces of ["goal", "assist"]) {
      const match = build(produces);
      const came = narrateFinish(match, [true], { produces });
      const went = narrateFinish(match, [false], { produces });
      expect(came.final.home, produces).toBe(match.standing.home + 1);
      expect(came.final.away, produces).toBe(match.standing.away);
      expect(went.final, produces).toEqual(match.standing);
    }
  });

  /**
   * `withStandings` re-walks the merged feed and is the only place the running score is
   * done. If it does not know what the player's own beat did, every line after it carries
   * a scoreline that disagrees with the one the beat itself printed.
   */
  it("agrees with itself once his beats are merged into the build-up", () => {
    for (const produces of ["goal", "assist", "stop"]) {
      for (let i = 0; i < 60; i += 1) {
        const match = narrateMatch({
          seed: `merge-${produces}-${i}`, season: 1, fixtureId: "f", kind: "titulo_liga",
          chances: 2, ourName: "N", theirName: "E", produces,
        });
        const attempts = [i % 2 === 0, i % 3 === 0];
        const finish = narrateFinish(match, attempts, { produces });
        const told = withStandings([...match.beats, ...finish.beats]);

        // Every beat's own score is the score the recount produces at that point, and the
        // last of them is the result the rest of the screen is about to print.
        const last = told[told.length - 1];
        expect(last.home, produces).toBe(finish.final.home);
        expect(last.away, produces).toBe(finish.final.away);
        for (const beat of told) {
          expect(beat.home).toBeGreaterThanOrEqual(0);
          expect(beat.away).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  /**
   * A save defends something. Sent out with the table a striker's night is drawn from, a
   * keeper could be 0-1 down at the moment of the penalty, save it, and be told that he had
   * taken a huge step towards the league over a feed reading 0-1 at full time.
   */
  it("never asks a keeper to win the match by not conceding", () => {
    for (let i = 0; i < 300; i += 1) {
      const match = build("stop", `stop-situation-${i}`);
      const { home, away } = match.standing;
      expect(home, `behind at the moment of the save (${home}-${away})`).toBeGreaterThanOrEqual(away);

      // And coming through holds exactly that, rather than improving on it.
      const saved = narrateFinish(match, [true], { produces: "stop", closed: true });
      expect(saved.final.home).toBeGreaterThanOrEqual(saved.final.away);
    }
  });

  it("only emits beats both languages can say", () => {
    const ids = new Set();
    for (let i = 0; i < 120; i += 1) {
      for (const produces of ["goal", "assist", "stop"]) {
        for (const chances of [0, 1, 2, 3]) {
          const match = narrateMatch({
            seed: `say-${produces}-${i}`, season: 1, fixtureId: "f", kind: "titulo_liga",
            chances, ourName: "N", theirName: "E", produces,
          });
          for (const beat of match.beats) ids.add(beat.id);
          const attempts = Array.from({ length: chances }, (_, k) => (i + k) % 2 === 0);
          for (const beat of narrateFinish(match, attempts, { produces }).beats) ids.add(beat.id);
        }
      }
    }
    // The four ids this change introduced, plus the one the new scoreline table needs.
    for (const id of ["stopped", "conceded", "holding"]) {
      expect(ids, `${id} is never narrated`).toContain(id);
    }
    for (const locale of ["es", "en"]) {
      for (const id of ids) {
        for (const state of ["ahead", "level", "behind"]) {
          const lines = beatLines(getCopy(locale), id, state);
          expect(lines.length, `only ${lines.length} ${locale} lines for "${id}"`).toBeGreaterThan(2);
          for (const line of lines) expect(line.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("still ends at ninety, whatever the chance produced", () => {
    for (const produces of ["goal", "assist", "stop"]) {
      const match = build(produces);
      for (const attempts of [[true], [false]]) {
        const finish = narrateFinish(match, attempts, { produces });
        const last = finish.beats[finish.beats.length - 1];
        expect(last.id, produces).toBe("fullTime");
        expect(last.minute, produces).toBe(FULL_TIME);
      }
    }
  });
});

/* ── The drawing ─────────────────────────────────────────────────────────── */

const shooting = Object.keys(SHOT_TYPES).filter((type) => !SITUATIONS[type].stops);
const stopping = Object.keys(SHOT_TYPES).filter((type) => SITUATIONS[type].stops);

/**
 * A chance built the way `shotFor` builds one.
 *
 * The keeper commits to a zone, the model rolls a coin, and the outcome is the distance
 * between his zone and the ball. `gap` is DERIVED from where he went - the zone he has to
 * travel furthest to - rather than being a free input, which is why these are keyed on
 * `keeperAt` and not on a gap index.
 */
const outcomes = (type, keeperAt, picked) => {
  const options = SHOT_TYPES[type];
  const stops = Boolean(SITUATIONS[type].stops);
  const difficulty = KEEPER.typical;
  const gap = options.reduce(
    (best, option, index) =>
      saveOdds(option, keeperAt, difficulty) < saveOdds(options[best], keeperAt, difficulty)
        ? index
        : best,
    0,
  );
  const base = { type, options, gap, keeperAt, keeper: { difficulty }, nailed: false };
  const save = saveOdds(options[picked], keeperAt, difficulty);
  // A roll under the save is a ball that was stopped; over it is one that went in.
  const stopped = { ...base, roll: Math.max(0, save - 0.02) };
  const beaten = { ...base, roll: Math.min(1, save + 0.02) };

  return {
    // He came through: a goal for a striker, a save for the man on the line.
    came: resolveShot(stops ? stopped : beaten, options[picked]),
    // He did not.
    failed: resolveShot(stops ? beaten : stopped, options[picked]),
    // And the bailout: it came off when the geometry said it would not.
    nailed: resolveShot({ ...(stops ? beaten : stopped), nailed: true }, options[picked]),
  };
};

/** Every zone a keeper can commit to for this chance. */
const divesFor = (type) => SHOT_TYPES[type];

describe("the man in the goal is drawn where the model put him", () => {
  /**
   * THE REPORTED FAULT, and the model that finally settled it.
   *
   * The keeper's position used to be inferred from the outcome - "he scored, so the keeper
   * must have been somewhere else" - which meant the picture was a reconstruction that had
   * to be kept in step with the verdict by hand, and repeatedly was not. The model names
   * the zone he committed to. The drawing puts him there. There is nothing left to keep in
   * step.
   */
  it("puts him on the zone he committed to, whatever the shot then did", () => {
    for (const type of shooting) {
      const options = SHOT_TYPES[type];
      for (const keeperAt of divesFor(type)) {
        for (let picked = 0; picked < options.length; picked += 1) {
          const staged = outcomes(type, keeperAt, picked);
          for (const result of [staged.came, staged.failed, staged.nailed]) {
            const drawn = stageShot({ type, options, gap: result.gap, result });
            expect(drawn.keeperSpot, `${type}: he went to ${keeperAt}`).toEqual(
              PLACEMENTS[keeperAt],
            );
            // And the ball is where the player put it, every time.
            expect(drawn.target).toEqual(at(...PLACEMENTS[options[picked]]));
          }
        }
      }
    }
  });

  /**
   * A keeper who stayed in the middle did not throw himself anywhere. `facing` reads
   * anything from the centre line up as going right, so a penalty saved down the middle was
   * drawn flat out towards the right-hand post with the ball sitting in the centre.
   */
  it("never draws a dive for a zone down the middle", () => {
    for (const type of Object.keys(SHOT_TYPES)) {
      const options = SHOT_TYPES[type];
      for (const keeperAt of divesFor(type)) {
        for (let picked = 0; picked < options.length; picked += 1) {
          const staged = outcomes(type, keeperAt, picked);
          for (const result of [staged.came, staged.failed, staged.nailed]) {
            const drawn = stageShot({ type, options, gap: result.gap, result });
            if (!drawn.shot) continue;
            if (Math.abs(drawn.keeperSpot[0] - 0.5) <= 0.12) {
              expect(drawn.keeperPose, `${type}: dive drawn for a central zone`).not.toBe("dive");
            }
          }
        }
      }
    }
  });

  /**
   * A dive to the top corner used to be drawn lying on the goal line, because the vertical
   * half of a placement moved nothing. It did not matter while the placements were mostly
   * along the ground; it matters now that two of the five are in the roof.
   */
  it("lifts a dive to the roof off the floor, and leaves a low one on it", () => {
    const options = SHOT_TYPES.penal;
    const high = outcomes("penal", "arriba-izquierda", 0).came;
    const low = outcomes("penal", "abajo-izquierda", 0).came;
    const up = stageShot({ type: "penal", options, gap: high.gap, result: high });
    const down = stageShot({ type: "penal", options, gap: low.gap, result: low });
    expect(up.lift).toBeGreaterThan(0);
    expect(down.lift).toBe(0);
  });

  /**
   * The other half of the reported fault, on the side of the goal the player stands in.
   * Coming through when the geometry said he would not means he went one way and got to a
   * ball going the other - so he has to be turned towards it.
   */
  it("turns a keeper who came through the wrong way back towards the ball", () => {
    let reached = 0;
    for (const type of stopping) {
      const options = SHOT_TYPES[type];
      for (const struck of divesFor(type)) {
        for (let picked = 0; picked < options.length; picked += 1) {
          const { nailed } = outcomes(type, struck, picked);
          if (!nailed.nailedIt) continue;
          const drawn = stageShot({ type, options, gap: nailed.gap, result: nailed });
          expect(drawn.target, `${type}: no ball drawn`).toBeTruthy();
          if (drawn.keeperPose !== "dive") continue;
          reached += 1;
          const towards = drawn.target.x >= drawn.keeperAt.x ? 1 : -1;
          expect(drawn.facing, `${type}: struck at ${struck}, went ${options[picked]}`).toBe(
            towards,
          );
        }
      }
    }
    expect(reached, "no keeper ever came through the wrong way").toBeGreaterThan(0);
  });

  /**
   * On a chance he is STOPPING, `keeperAt` is the zone the man in front of him chose. That
   * is where the ball is - and going there himself is the save.
   */
  it("draws a save he read with the keeper and the ball on the same point", () => {
    for (const type of stopping) {
      const options = SHOT_TYPES[type];
      for (const struck of divesFor(type)) {
        const picked = options.indexOf(struck);
        const { came } = outcomes(type, struck, picked);
        const drawn = stageShot({ type, options, gap: came.gap, result: came });
        expect(drawn.keeperAt.x, `${type}: ${struck}`).toBeCloseTo(drawn.target.x, 6);
        // He is the one in the goal, so nothing is ringed as a gap he left.
        expect(drawn.gapPoint).toBeNull();
      }
    }
  });

  it("leaves the situation alone on a night the ball never came to him", () => {
    for (const type of Object.keys(SHOT_TYPES)) {
      const staged = stageShot({
        type,
        options: SHOT_TYPES[type],
        gap: 0,
        result: { absent: true, scored: false },
      });
      expect(staged.shot).toBeNull();
      expect(staged.target).toBeNull();
      expect(staged.gapPoint).toBeNull();
      expect(staged.keeperPose).not.toBe("dive");
    }
  });
});

describe("every chance names itself the same way everywhere", () => {
  it("keeps produces, options and the drawing in step for every shot type", () => {
    for (const type of Object.keys(SHOT_TYPES)) {
      expect(Object.values(PRODUCES)).toContain(SHOT_PRODUCES[type]);
      // A chance the player STOPS is one his own options are a dive in, so the two tables
      // have to agree about which of the thirteen those are.
      expect(
        Boolean(SITUATIONS[type].stops),
        `${type}: ${SHOT_PRODUCES[type]} drawn from the wrong side`,
      ).toBe(SHOT_PRODUCES[type] === PRODUCES.STOP);
    }
  });
});
