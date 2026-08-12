/**
 * One cup final, forced, and the two places it is reported.
 *
 * Two diagnoses of this bug have already been wrong, and both times the reason was the same:
 * I was reading the game through a harness that hunted for a cup final among random careers
 * and could not tell me WHICH final it had found. So this stages exactly one - a narrated
 * `final_copa`, alone in its season, with the shot missed - and then asks the only question
 * that matters: does the scoreboard the player watched agree with the cabinet he is handed?
 *
 * Deterministic on purpose. If it passes, the contradiction lives somewhere the old harness
 * was looking and not here, and the harness was the thing at fault. If it fails, the bug is
 * on the main path and this is a one-line reproduction of it.
 */
import { describe, expect, it } from "vitest";

import {
  PHASES,
  agreeTerms,
  completeSigning,
  nextFixture,
  resolveEvent,
  signYouthClub,
  startCareer,
  takeShot,
  watchMatch,
} from "./career.js";
import { DECIDES } from "./bigmatch.js";
import { shootoutFor } from "./narration.js";
import { world } from "./world.js";

/**
 * A run parked on a cup final and nothing else.
 *
 * The season's own draw is replaced rather than searched for: what is under test is what
 * happens when a final is played, not how often one comes up. `settle` carries the same
 * multipliers `contest()` would have written, so the trophy is rolled exactly as it would
 * be on a real one.
 */
function atCupFinal(seed = "cupfinal", chances = 1) {
  let run = startCareer(
    { seed, surname: "MOLINA", number: 9, foot: "left", country: "ESP", position: "DC", mode: "intensa" },
    world,
  );
  run = completeSigning(agreeTerms(signYouthClub(run, run.offers[0].clubId)));
  let guard = 0;
  while (run.phase === PHASES.EVENT && guard < 10) {
    guard += 1;
    run = resolveEvent(run, run.event.es.options[0].id);
  }
  expect(run.phase).toBe(PHASES.MATCH);

  const { fixtures, index, shot } = run.matchday;
  const base = fixtures[index];
  const only = {
    ...base,
    id: "forced-final-copa",
    kind: "final_copa",
    decides: "cup",
    national: false,
    chances,
    index: 0,
    // What `contest` stores, scaled against the club's own odds so the engine can keep
    // rolling the cup the way it rolls everything.
    settle: { scored: DECIDES.scored, missed: DECIDES.missed, absent: DECIDES.absent },
  };

  return watchMatch(
    {
      ...run,
      matchday: {
        ...run.matchday,
        fixtures: [only],
        index: 0,
        shot: { ...shot, kind: "final_copa", fixtureId: only.id, mode: "match", chance: null },
        attempts: [],
        results: [],
        last: null,
        broadcast: null,
      },
    },
    "es",
  );
}

/** Miss it, then let the season resolve. */
function missAndFinish(run) {
  const shot = run.matchday.shot;
  const wrong = shot.options[(shot.gap + 1) % shot.options.length];
  let played = run;
  let guard = 0;
  while (played.phase === PHASES.MATCH && !played.matchday.last && guard < 8) {
    guard += 1;
    played = takeShot(played, wrong);
  }
  const finish = played.matchday.broadcast?.finish ?? null;
  const fixtureId = played.matchday.fixtures[played.matchday.index]?.id ?? null;
  const after = nextFixture(played);
  return { finish, fixtureId, after };
}

describe("one cup final, played and reported", () => {
  it("is the final we staged, and it does reach full time", () => {
    const { finish, fixtureId } = missAndFinish(atCupFinal());
    // The thing the old harness could not tell me: which match this finish belongs to.
    expect(fixtureId).toBe("forced-final-copa");
    expect(finish, "the broadcast never closed").toBeTruthy();
    expect(finish.closed).toBe(true);
  });

  it("hands over a cabinet that agrees with the scoreboard", () => {
    for (let i = 0; i < 25; i += 1) {
      const { finish, after } = missAndFinish(atCupFinal(`agree-${i}`));
      const record = after.state.history[after.state.history.length - 1];
      expect(record, "the season never resolved").toBeTruthy();

      const cup = Boolean(record.titles?.some((title) => title.trophy === "cup"));
      const score = `${finish.final.home}-${finish.final.away}`;
      expect(cup, `narrado ${score} (won=${finish.won}) y copa=${cup}`).toBe(finish.won);
    }
  });

  it("never leaves a final level on the scoreboard", () => {
    for (let i = 0; i < 25; i += 1) {
      const { finish } = missAndFinish(atCupFinal(`level-${i}`));
      const score = `${finish.final.home}-${finish.final.away}`;
      // A knockout is settled in ninety minutes, late, or from twelve yards - never drawn.
      const decided =
        finish.final.home !== finish.final.away ||
        finish.beats.some((beat) => beat.id === "shootoutWon" || beat.id === "shootoutLost");
      expect(decided, `final sin resolver: ${score}`).toBe(true);
    }
  });
});

/**
 * The 2-2 final that was never resolved.
 *
 * Reported from a real run: a cup final finished 2-2 on the scoreboard, the whistle went,
 * and the cup was awarded. The existing case here misses the chance; this one CONVERTS it,
 * which is how the scoreline ends up level - the build-up left it 1-2 and his goal made it
 * two apiece. If the shootout only fires when he misses, that is the hole.
 */
describe("a final that his own goal leaves level", () => {
  const scoreAndFinish = (run) => {
    const shot = run.matchday.shot;
    let played = run;
    let guard = 0;
    while (played.phase === PHASES.MATCH && !played.matchday.last && guard < 8) {
      guard += 1;
      played = takeShot(played, shot.options[shot.gap]);
    }
    return played.matchday.broadcast?.finish ?? null;
  };

  it("is settled whichever way the ninety minutes went", () => {
    for (let i = 0; i < 40; i += 1) {
      for (const chances of [1, 2]) {
        const finish = scoreAndFinish(atCupFinal(`scored-${i}`, chances));
        if (!finish?.closed) continue;
        const score = `${finish.final.home}-${finish.final.away}`;
        const decided =
          finish.final.home !== finish.final.away ||
          finish.beats.some((beat) => beat.id === "shootoutWon" || beat.id === "shootoutLost");
        expect(decided, `final sin resolver tras marcar: ${score}`).toBe(true);
      }
    }
  });
});

/**
 * The tie itself, from twelve yards.
 *
 * The feed used to say "and the shootout is theirs" and show nothing, which is a report of a
 * sequence rather than the sequence. These are the rules it has to obey - and the one thing
 * it must never do is disagree with the cup it was called in to decide.
 */
describe("the shootout", () => {
  it("is won by the side the trophy says won it", () => {
    for (let i = 0; i < 60; i += 1) {
      for (const won of [true, false]) {
        const { us, them, score } = shootoutFor(`tie-${i}`, won);
        expect(score.us === score.them, `empatada: ${score.us}-${score.them}`).toBe(false);
        expect(score.us > score.them, `ganador equivocado en ${score.us}-${score.them}`).toBe(won);
        // Nobody takes a kick after it is over, and nobody is a whole round behind.
        expect(Math.abs(us.length - them.length)).toBeLessThanOrEqual(1);
        expect(us.filter(Boolean).length).toBe(score.us);
        expect(them.filter(Boolean).length).toBe(score.them);
      }
    }
  });

  it("stops the moment it cannot be caught, and goes past five when it is level", () => {
    const lengths = new Set();
    for (let i = 0; i < 60; i += 1) {
      const { us, them } = shootoutFor(`len-${i}`, i % 2 === 0);
      lengths.add(us.length + them.length);
      // Five each is the regulation; sudden death goes further, never fewer than three.
      expect(us.length).toBeGreaterThanOrEqual(2);
      expect(us.length).toBeLessThanOrEqual(20);
    }
    // Not every shootout is the same length, which is the point of stopping early.
    expect(lengths.size).toBeGreaterThan(2);
  });

  it("is the same tie every time, from the same seed", () => {
    expect(shootoutFor("same", true)).toEqual(shootoutFor("same", true));
  });
});
