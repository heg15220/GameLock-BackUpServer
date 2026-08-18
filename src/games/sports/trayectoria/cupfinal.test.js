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
import { narrateFinish, narrateMatch, shootoutFor } from "./narration.js";
import { world } from "./world.js";

/**
 * A run parked on a cup final and nothing else.
 *
 * The season's own draw is replaced rather than searched for: what is under test is what
 * happens when a final is played, not how often one comes up. `settle` carries the same
 * multipliers `contest()` would have written, so the trophy is rolled exactly as it would
 * be on a real one.
 */
function careerAtMatch(seed) {
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
  return run;
}

/** The forced cup final itself, as `contest()` would have stored it. */
const cupFinalFixture = (base, chances) => ({
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
});

function atCupFinal(seed = "cupfinal", chances = 1) {
  const run = careerAtMatch(seed);
  const { fixtures, index, shot } = run.matchday;
  const base = fixtures[index];
  const only = cupFinalFixture(base, chances);

  return watchMatch(
    {
      ...run,
      matchday: {
        ...run.matchday,
        fixtures: [only],
        // The season's calendar, with this as its only night. See `showNight`.
        queue: [{ when: 0, kind: "fixture", at: 0 }],
        cursor: 0,
        runs: [],
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
 * The final the ball never came to.
 *
 * A decider is worth however many sights of goal the draw gave it, and sometimes that is
 * none: the player is on the pitch for the biggest night of the year and the game simply
 * goes past him. There is nothing to press, so the fixture settles itself the moment it
 * opens - and that is the ORDER this exists to pin down. `nextFixture` settles it first and
 * only then does the screen ask for a broadcast, so by the time `watchMatch` runs the trophy
 * has already been decided and the feed has to be told the answer rather than invent one.
 *
 * It was not being told. Measured over 180 careers, twenty-four narrated finals ended in a
 * defeat on screen - or level, with no shootout - and were lifted in the ceremony seconds
 * later, all of them nights he never got a touch in. The cases above cannot see it, because
 * they hand `watchMatch` a fixture that has not settled yet and so take the other path.
 */
describe("a final he never got a touch in", () => {
  /**
   * Two fixtures: one to play, and then the final that owes him nothing. Going through
   * `nextFixture` is the whole point - it is what settles the trophy before the screen ever
   * opens the broadcast, which is the order the real game runs in.
   */
  const atUntouchedFinal = (seed) => {
    const run = careerAtMatch(seed);
    const { fixtures, index, shot } = run.matchday;
    const first = { ...fixtures[index], id: "opener", index: 0, chances: 1, decides: null };
    const final = { ...cupFinalFixture(fixtures[index], 0), index: 1 };

    let staged = {
      ...run,
      matchday: {
        ...run.matchday,
        fixtures: [first, final],
        queue: [
          { when: 0, kind: "fixture", at: 0 },
          { when: 1, kind: "fixture", at: 1 },
        ],
        cursor: 0,
        runs: [],
        index: 0,
        shot: { ...shot, fixtureId: first.id, mode: "skill", chance: null },
        attempts: [],
        results: [],
        last: null,
        broadcast: null,
      },
    };
    // Play the opener however it goes, then step onto the final.
    staged = takeShot(
      { ...staged, matchday: { ...staged.matchday, shot: { ...staged.matchday.shot, mode: "match" } } },
      shot.options[0],
    );
    const onFinal = nextFixture(staged);
    expect(onFinal.matchday.index).toBe(1);
    // The fixture arrives already decided, with no broadcast yet: exactly the state the
    // screen finds it in.
    expect(onFinal.matchday.last, "a night with no chances must settle itself").toBeTruthy();
    expect(onFinal.matchday.broadcast).toBeNull();
    return watchMatch({ ...onFinal, matchday: { ...onFinal.matchday, shot: { ...onFinal.matchday.shot, mode: "match" } } }, "es");
  };

  it("reaches full time, settled, and agrees with the cabinet", () => {
    let played = 0;
    for (let i = 0; i < 30; i += 1) {
      const run = atUntouchedFinal(`untouched-${i}`);
      const finish = run.matchday.broadcast?.finish ?? null;
      expect(finish, "the feed was never written").toBeTruthy();
      expect(finish.closed, "the feed never reached full time").toBe(true);
      played += 1;

      // A knockout is settled in ninety minutes, late, or from twelve yards - never drawn.
      const score = `${finish.final.home}-${finish.final.away}`;
      const decided =
        finish.final.home !== finish.final.away ||
        finish.beats.some((beat) => beat.id === "shootoutWon" || beat.id === "shootoutLost");
      expect(decided, `final sin resolver: ${score}`).toBe(true);

      // And the verdict is the one the trophy was actually given, not one read off a
      // scoreline the narration made up.
      const settled = run.matchday.last?.settledTitle ?? null;
      expect(settled, "an untouched final still settles its trophy").toBeTruthy();
      expect(finish.won, `narrado ${score} y copa=${settled.won}`).toBe(settled.won);
    }
    expect(played).toBe(30);
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

  /**
   * THE RULES, KICK BY KICK.
   *
   * Two of them were being counted wrong, and both came from measuring "kicks remaining" as
   * one shared number when the two sides do not have the same number left at every point.
   *
   *  1. After OUR kick in round three we have taken three and they have taken two - so they
   *     have three left, not two. Read as two, a 3-0 was declared over at a point where the
   *     other side could still make it 3-3.
   *  2. Past five each the shared count says "nobody has any left", which the same test read
   *     as "whoever is ahead has won" - so the tie ended the instant we scored our sixth,
   *     with the opponent never invited to answer it. Sudden death is a PAIR.
   */
  const replay = (kicks) => {
    const order = [];
    for (let i = 0; i < Math.max(kicks.us.length, kicks.them.length); i += 1) {
      if (i < kicks.us.length) order.push({ side: "us", scored: kicks.us[i] });
      if (i < kicks.them.length) order.push({ side: "them", scored: kicks.them[i] });
    }
    return order;
  };

  it("never stops while the trailing side can still catch up", () => {
    for (let i = 0; i < 200; i += 1) {
      const kicks = shootoutFor(`rules-${i}`, i % 2 === 0);
      const order = replay(kicks);
      let us = 0;
      let them = 0;
      let usTaken = 0;
      let themTaken = 0;
      order.forEach((kick, index) => {
        if (kick.side === "us") {
          usTaken += 1;
          if (kick.scored) us += 1;
        } else {
          themTaken += 1;
          if (kick.scored) them += 1;
        }
        const last = index === order.length - 1;
        const usLeft = Math.max(0, 5 - usTaken);
        const themLeft = Math.max(0, 5 - themTaken);
        // In sudden death a tie is only settled by a COMPLETED pair - being one goal up
        // with the other side still to take theirs is not a win.
        const sudden = usTaken > 5 || themTaken > 5;
        const over = sudden
          ? usTaken === themTaken && us !== them
          : us > them + themLeft || them > us + usLeft;
        /*
         * Both directions, and the second one is the one that matters. A tie that stops too
         * LATE is easy to see; a tie that stops too EARLY simply ends, and every assertion
         * that only walks the kicks it was given walks right past it. The last kick has to
         * be the kick that settled it, and no kick before it can have.
         */
        const sequence = `${kicks.us.map(Number).join("")}/${kicks.them.map(Number).join("")}`;
        expect(over, `${sequence}: ${last ? "stopped at" : "kicked on after"} ${us}-${them}`).toBe(
          last,
        );
      });
    }
  });

  it("gives both sides the same number of kicks once it goes to sudden death", () => {
    let suddenDeaths = 0;
    for (let i = 0; i < 400; i += 1) {
      const kicks = shootoutFor(`sudden-${i}`, i % 2 === 0);
      if (kicks.us.length <= 5 && kicks.them.length <= 5) continue;
      suddenDeaths += 1;
      // Nobody wins sudden death with an extra kick in hand.
      expect(
        kicks.us.length,
        `${kicks.us.length} v ${kicks.them.length} kicks in sudden death`,
      ).toBe(kicks.them.length);
      // Level after five each is the only way to get there.
      expect(kicks.us.slice(0, 5).filter(Boolean).length).toBe(
        kicks.them.slice(0, 5).filter(Boolean).length,
      );
      // And every sudden-death pair before the last one was level.
      for (let pair = 5; pair < kicks.us.length - 1; pair += 1) {
        expect(kicks.us[pair]).toBe(kicks.them[pair]);
      }
      // The last pair is the one that differs.
      const last = kicks.us.length - 1;
      expect(kicks.us[last]).not.toBe(kicks.them[last]);
    }
    expect(suddenDeaths, "no shootout ever reached sudden death").toBeGreaterThan(5);
  });

  it("never takes more than five each before sudden death, or fewer than three", () => {
    for (let i = 0; i < 200; i += 1) {
      const kicks = shootoutFor(`bounds-${i}`, i % 3 === 0);
      expect(kicks.us.length).toBeGreaterThanOrEqual(3);
      // The regulation five, and then only complete pairs.
      if (kicks.us.length > 5) expect(kicks.us.length).toBe(kicks.them.length);
      else expect(Math.abs(kicks.us.length - kicks.them.length)).toBeLessThanOrEqual(1);
    }
  });
});

/**
 * "Si se empata una final de copa nacional se deben SIEMPRE disputar los penaltis."
 *
 * The tests above stage one real career each and check the finals they happen to produce.
 * This checks the rule itself, exhaustively, on the function that owns it - every number of
 * chances, every way they can go, both results - because "always" is a claim about the whole
 * space and a career only ever samples it.
 *
 * It also covers the two holes found while auditing that claim, neither of which a career
 * test would have failed on:
 *
 *  - A LATE GOAL THAT WAS NOT A GOAL. The guard on the "somebody settles it late" beat was
 *    `final.home !== final.away`, which is true of every match that is not level - so a
 *    final we were winning 2-1 and DID win pushed a "they score" line carrying the same
 *    2-1 it already had. The scoreboard never moved and the feed had told a small lie.
 *  - A SHOOTOUT NOBODY HAD DECIDED. `won` is null on anything that is not a final, and
 *    `shootoutFor` read null as false: every level semi-final in the game's history was
 *    lost from twelve yards.
 */
describe("a knockout that finishes level", () => {
  const build = (seed, chances) =>
    narrateMatch({
      seed,
      season: 4,
      fixtureId: `f-${seed}`,
      kind: "final_copa",
      chances,
      ourName: "Nos",
      theirName: "Ellos",
    });

  const decided = (finish) =>
    finish.final.home !== finish.final.away ||
    finish.beats.some((beat) => beat.id === "shootoutWon" || beat.id === "shootoutLost");

  it("always goes to penalties in a cup final, whatever he did with his chances", () => {
    let shootouts = 0;
    for (let i = 0; i < 400; i += 1) {
      const chances = i % 4;
      const built = build(`pens-${i}`, chances);
      // Every way the night can go: none in, all in, and the mixtures between.
      const attempts = Array.from({ length: chances }, (_, k) => (i + k) % 3 === 0);
      const won = i % 2 === 0;
      const finish = narrateFinish(built, attempts, { closed: true, won, shootout: true });
      expect(decided(finish), `final sin resolver: ${finish.final.home}-${finish.final.away}`).toBe(true);
      if (finish.final.home === finish.final.away) {
        shootouts += 1;
        // And the tie goes the way the cup already went, never the other way.
        expect(finish.won).toBe(won);
      }
    }
    // Not a branch nobody reaches: a level final is an ordinary night.
    expect(shootouts).toBeGreaterThan(20);
  });

  it("never announces a late goal that leaves the scoreboard where it was", () => {
    for (let i = 0; i < 400; i += 1) {
      const chances = i % 4;
      const built = build(`late-${i}`, chances);
      const attempts = Array.from({ length: chances }, (_, k) => (i + k) % 2 === 0);
      const finish = narrateFinish(built, attempts, { closed: true, won: i % 2 === 0, shootout: true });
      const late = finish.beats.find((beat) => beat.late);
      if (!late) continue;
      // A goal beat has to have moved the board it is printed on.
      const before = built.standing;
      const scoredByUs = attempts.filter(Boolean).length;
      const moved =
        late.id === "goalUs"
          ? late.home > before.home + scoredByUs
          : late.away > before.away;
      expect(moved, `gol fantasma en el ${late.minute}'`).toBe(true);
    }
  });

  it("does not hand every undecided shootout to the other side", () => {
    // A semi-final has no trophy attached, so `won` arrives null. Over many ties it has to
    // come out roughly even rather than always lost.
    let ours = 0;
    let total = 0;
    for (let i = 0; i < 300; i += 1) {
      const built = build(`semi-${i}`, 0);
      const finish = narrateFinish(built, [], { closed: true, won: null, shootout: true });
      if (finish.final.home !== finish.final.away) continue;
      total += 1;
      if (finish.won) ours += 1;
    }
    expect(total).toBeGreaterThan(20);
    expect(ours).toBeGreaterThan(0);
    expect(ours).toBeLessThan(total);
  });
});
