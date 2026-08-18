/**
 * The other final: the one his country plays.
 *
 * `cupfinal.test.js` staged a club final and asked the only question worth asking - does the
 * scoreboard the player watched agree with the cabinet he is handed? It passed, and the bug
 * survived, because a World Cup final is not a club final anywhere in this model: its odds
 * come off the country's reputation and not off `TITLE_ODDS`, and its trophy is awarded by
 * `rollNationalTeam` and not by `rollTitles`. Neither half of the fix that settled a cup on
 * the night reached either of them.
 *
 * So this is the same staging, pointed at `final_mundial` and `final_continental_nt`.
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
import { world } from "./world.js";

/** Ages that put each competition on this season, per the four-year cycles. */
const AGE_FOR = { world_cup: 27, continental_nt: 25 };

/**
 * A run parked on one national final and nothing else.
 *
 * The rating and the age are forced rather than played up to: what is under test is what
 * happens on the night, not how long it takes to be called up. Both are exactly what a
 * career that reached this fixture would have - above every call-up threshold, and on the
 * cycle that stages the tournament.
 */
function atNationalFinal(seed, trophy, chances = 1) {
  const kind = trophy === "world_cup" ? "final_mundial" : "final_continental_nt";
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
  // A first season can have no decider at all to hang this on. Nothing to stage, so the
  // seed is skipped rather than asserted over.
  if (run.phase !== PHASES.MATCH) return null;

  const { fixtures, index, shot } = run.matchday;
  const only = {
    ...fixtures[index],
    id: `forced-${kind}`,
    kind,
    decides: trophy,
    national: true,
    chances,
    index: 0,
    // Standing in the final is the qualifying, which is what the fixture list records.
    ...(trophy === "world_cup" ? { reached: "world_cup" } : {}),
    settle: { scored: DECIDES.scored, missed: DECIDES.missed, absent: DECIDES.absent },
  };

  return watchMatch(
    {
      ...run,
      state: { ...run.state, ovr: 88, age: AGE_FOR[trophy] },
      matchday: {
        ...run.matchday,
        fixtures: [only],
        // The season's calendar, with this as its only night. See `showNight`.
        queue: [{ when: 0, kind: "fixture", at: 0 }],
        cursor: 0,
        runs: [],
        index: 0,
        shot: { ...shot, kind, fixtureId: only.id, mode: "match", chance: null },
        attempts: [],
        results: [],
        last: null,
        broadcast: null,
      },
    },
    "es",
  );
}

/** Play it out, one way or the other, and let the season resolve behind it. */
function playAndFinish(run, convert) {
  if (!run) return null;
  const shot = run.matchday.shot;
  const choice = shot.options[convert ? shot.gap : (shot.gap + 1) % shot.options.length];
  const season = run.season;
  let played = run;
  let guard = 0;
  while (played.phase === PHASES.MATCH && !played.matchday.last && guard < 8) {
    guard += 1;
    played = takeShot(played, choice);
  }
  const finish = played.matchday.broadcast?.finish ?? null;
  const after = nextFixture(played);
  const record = after.state.history.find((entry) => entry.season === season) ?? null;
  return { finish, record };
}

describe.each(["world_cup", "continental_nt"])("one %s final, played and reported", (trophy) => {
  it("hands over a cabinet that agrees with the scoreboard", () => {
    let played = 0;
    for (let i = 0; i < 25; i += 1) {
      for (const convert of [true, false]) {
        const staged = playAndFinish(atNationalFinal(`${trophy}-agree-${i}`, trophy), convert);
        if (!staged) continue;
        played += 1;
        const { finish, record } = staged;
        expect(finish?.closed, "the broadcast never closed").toBe(true);
        expect(record, "the season never resolved").toBeTruthy();

        // A national trophy is filed on `record.national`, not among the club titles -
        // which is the list the ceremony reads. See `seasonReport().honours`.
        const lifted = Boolean(record.national?.titles?.some((title) => title.trophy === trophy));
        const score = `${finish.final.home}-${finish.final.away}`;
        expect(lifted, `narrado ${score} (won=${finish.won}) y ${trophy}=${lifted}`).toBe(finish.won);
      }
    }
    expect(played, "no se llegó a jugar ninguna final").toBeGreaterThan(10);
  });

  /**
   * The half of the contradiction that has no scoreboard to catch it: a final rolled through
   * the club table has no odds at all, so it is lost every single time. That is not a
   * scoreline anyone can argue with - it is the tournament quietly becoming unwinnable on
   * the one night the player is actually in it.
   */
  it("is not lost every time", () => {
    const won = [];
    for (let i = 0; i < 40; i += 1) {
      const staged = playAndFinish(atNationalFinal(`${trophy}-won-${i}`, trophy), true);
      if (staged) won.push(staged.finish?.won);
    }
    expect(won.length, "no se llegó a jugar ninguna final").toBeGreaterThan(20);
    expect(won.some(Boolean), `40 finales de ${trophy} y ninguna ganada`).toBe(true);
  });
});
