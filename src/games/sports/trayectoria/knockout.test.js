/**
 * The knockout nights, and who is in them.
 *
 * Three claims are under test here, and they are the three the feature is actually made of:
 *
 *  1. THE FIELD IS REAL. A Champions League draws Real Madrid and Bayern, not Elversberg;
 *     a World Cup draws the forty-eight that qualified, not two hundred and eleven FIFA
 *     members. `qualified.js` is a hard-coded guest list, so the test that matters is that
 *     the list survives contact with the world data - a typo in an id is a club that
 *     silently vanishes from the draw, which is exactly the kind of rot nobody notices.
 *  2. FROM THE LAST SIXTEEN, A TIE IS A NIGHT. `liveTiesOf` turns the bracket into a queue
 *     and the career loop stops on it, whether or not the player had a decider that year.
 *  3. A KNOCKOUT NEVER ENDS LEVEL. Ninety minutes square is a question, and there is only
 *     one answer to it.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  PHASES,
  agreeTerms,
  completeSigning,
  liveTiesOf,
  nextTie,
  resolveEvent,
  signYouthClub,
  startCareer,
} from "./career.js";
import { ROUND_LABELS, TOURNAMENT_LABELS, getCopy } from "./copy.js";
import { SCREENS } from "./index.jsx";
import { narrateTie, withStandings } from "./narration.js";
import { QUALIFIED, entrantsFor, realFieldFor } from "./qualified.js";
import { LIVE_ROUNDS, TOURNAMENTS, simulateTournamentRun } from "./tournaments.js";
import { world } from "./world.js";

/* ── 1. The guest list ────────────────────────────────────────────────────── */

describe("the real field", () => {
  it("names sides this world actually models", () => {
    for (const id of Object.keys(QUALIFIED)) {
      const field = realFieldFor(id, world);
      // Not every listed side survives - nine of the Champions League's thirty-six play in
      // leagues this world has never heard of - but a list where MOST of them vanish is a
      // list of typos rather than a list of clubs.
      expect(field.length, `${id} resolved almost nothing`).toBeGreaterThan(
        QUALIFIED[id].teams.length / 2,
      );
    }
  });

  it("resolves every national team it names, because countries are all modelled", () => {
    for (const id of ["world_cup", "euro", "copa_america"]) {
      expect(realFieldFor(id, world)).toHaveLength(QUALIFIED[id].teams.length);
    }
  });

  it("never lists the same side twice", () => {
    for (const [id, { teams }] of Object.entries(QUALIFIED)) {
      expect(new Set(teams).size, `${id} repeats an entrant`).toBe(teams.length);
    }
  });

  it("fills the format out and keeps the player's own side in it", () => {
    const club = world.clubs["osasuna"];
    const field = entrantsFor("champions", world, { include: [club] });
    expect(field).toHaveLength(TOURNAMENTS.champions.teams);
    expect(field.some((entry) => entry.id === "osasuna")).toBe(true);
    // And the real qualifiers are still in there.
    expect(field.some((entry) => entry.id === "real-madrid")).toBe(true);
  });

  it("draws a continental cup only from its own confederation", () => {
    for (const entry of entrantsFor("libertadores", world)) {
      const competition = world.competitions[entry.competitionId];
      expect(competition?.confederation, `${entry.id} is not CONMEBOL`).toBe("CONMEBOL");
    }
  });

  it("is the same edition every career", () => {
    expect(entrantsFor("champions", world).map((c) => c.id)).toEqual(
      entrantsFor("champions", world).map((c) => c.id),
    );
  });
});

/* ── 2. The bracket, and which of it is watched ───────────────────────────── */

const runFor = (seed, id = "champions", champion = true) =>
  simulateTournamentRun({
    id,
    seed,
    season: 3,
    entrants: entrantsFor(id, world, { include: [world.clubs["real-madrid"]] }),
    player: world.clubs["real-madrid"],
    champion,
    phasePosition: 1,
  });

describe("the bracket", () => {
  it("marks the last sixteen onwards as live and nothing before it", () => {
    const run = runFor("bracket");
    for (const round of run.rounds) {
      expect(round.live).toBe(LIVE_ROUNDS.includes(round.round));
    }
  });

  it("gives a two-legged tie two legs that add up to the aggregate", () => {
    for (let i = 0; i < 40; i += 1) {
      for (const round of runFor(`legs-${i}`).rounds) {
        expect(round.legScores).toHaveLength(round.legs);
        const us = round.legScores.reduce((sum, leg) => sum + leg.us, 0);
        const them = round.legScores.reduce((sum, leg) => sum + leg.them, 0);
        expect({ us, them }).toEqual(round.score);
      }
    }
  });

  it("sends a tie that finished level to penalties, and only that kind", () => {
    let levels = 0;
    for (let i = 0; i < 120; i += 1) {
      for (const round of runFor(`pens-${i}`).rounds) {
        const level = round.score.us === round.score.them;
        expect(round.penalties).toBe(level);
        if (level) levels += 1;
      }
    }
    // Not a theoretical branch: a career really does see shootouts.
    expect(levels).toBeGreaterThan(0);
  });

  /**
   * Third in the group is a coin flip in a 48-team World Cup and was certain death here:
   * the format table has always named `bestThirds` and the simulation never read it.
   */
  it("lets a third place through as one of the best thirds, sometimes", () => {
    const through = [];
    for (let i = 0; i < 200; i += 1) {
      const run = simulateTournamentRun({
        id: "world_cup",
        seed: `third-${i}`,
        season: 2,
        entrants: entrantsFor("world_cup", world),
        player: world.countries.ESP,
        champion: false,
        phasePosition: 3,
      });
      through.push(run.phase.qualified);
    }
    const rate = through.filter(Boolean).length / through.length;
    // Eight of twelve groups' thirds go through, so roughly two in three - never all,
    // never none.
    expect(rate).toBeGreaterThan(0.4);
    expect(rate).toBeLessThan(0.9);
  });

  it("still sends a fourth place home", () => {
    for (let i = 0; i < 40; i += 1) {
      const run = simulateTournamentRun({
        id: "world_cup",
        seed: `fourth-${i}`,
        season: 2,
        entrants: entrantsFor("world_cup", world),
        player: world.countries.ESP,
        champion: false,
        phasePosition: 4,
      });
      expect(run.phase.qualified).toBe(false);
      expect(run.rounds).toEqual([]);
    }
  });

  it("draws bigger names the deeper the run goes", () => {
    const strength = (round) =>
      world.clubs[round.opponentId]?.continental_reputation ?? 0;
    let early = 0;
    let late = 0;
    for (let i = 0; i < 200; i += 1) {
      const run = runFor(`depth-${i}`);
      const first = run.rounds[0];
      const final = run.rounds[run.rounds.length - 1];
      if (first) early += strength(first);
      if (final) late += strength(final);
    }
    expect(late).toBeGreaterThan(early);
  });
});

/* ── 3. The night itself ──────────────────────────────────────────────────── */

describe("a tie, narrated", () => {
  const tieOf = (over = {}) =>
    narrateTie({
      seed: "tie",
      round: "quarter",
      legs: 2,
      ourName: "Real Madrid",
      theirName: "Bayern",
      score: { us: 2, them: 1 },
      aggregate: { us: 3, them: 2 },
      firstLeg: { us: 1, them: 1 },
      won: true,
      ...over,
    });

  it("ends on the score the bracket handed it", () => {
    const tie = tieOf();
    expect(tie.standing).toEqual({ home: 2, away: 1 });
    expect(tie.finish.final).toEqual({ home: 2, away: 1 });
  });

  it("never shows a goal the tie did not have", () => {
    const beats = withStandings([...tieOf().beats, ...tieOf().finish.beats]);
    for (const beat of beats) {
      expect(beat.home).toBeLessThanOrEqual(2);
      expect(beat.away).toBeLessThanOrEqual(1);
    }
    expect(beats[beats.length - 1].home).toBe(2);
  });

  it("hands nothing to the player: there is no chance to take", () => {
    const tie = tieOf();
    expect(tie.chances).toBe(0);
    expect(tie.moments).toEqual([]);
    expect(tie.beats.some((beat) => beat.id === "chance")).toBe(false);
    expect(tie.finish.closed).toBe(true);
  });

  it("plays the shootout when the tie finished level, whichever way it went", () => {
    for (const won of [true, false]) {
      const tie = tieOf({ penalties: true, extraTime: true, score: { us: 1, them: 1 }, aggregate: { us: 2, them: 2 }, won });
      const ids = tie.finish.beats.map((beat) => beat.id);
      expect(ids).toContain("extraTime");
      expect(ids).toContain("shootout");
      expect(ids).toContain(won ? "shootoutWon" : "shootoutLost");
      expect(ids).toContain(won ? "tieWon" : "tieLost");
      expect(tie.finish.shootout.score.us > tie.finish.shootout.score.them).toBe(won);
    }
  });

  it("says who went through even when the leg on screen was lost", () => {
    // Beaten 0-1 on the night and through 2-1 on aggregate. This is why the tie's verdict
    // cannot be read off the scoreline the feed ends on.
    const tie = tieOf({ score: { us: 0, them: 1 }, aggregate: { us: 2, them: 1 }, firstLeg: { us: 2, them: 0 }, won: true });
    expect(tie.finish.beats.map((beat) => beat.id)).toContain("tieWon");
    expect(tie.finish.won).toBe(true);
  });

  it("replays identically from the same seed", () => {
    expect(tieOf()).toEqual(tieOf());
  });
});

/* ── 4. The queue, in a real career ───────────────────────────────────────── */

function careerAt(seed) {
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
  return run;
}

describe("the queue", () => {
  const record = (over = {}) => ({
    season: 4,
    clubId: "real-madrid",
    tournamentRuns: [runFor("queue")],
    ...over,
  });

  it("queues one night per live round and nothing else", () => {
    const run = careerAt("queue");
    const ties = liveTiesOf(run, record());
    expect(ties.length).toBeGreaterThan(0);
    for (const tie of ties) expect(LIVE_ROUNDS).toContain(tie.round);
    // A champion plays every round; only four of them are watched.
    expect(ties.map((tie) => tie.round)).toEqual(["r16", "quarter", "semi", "final"]);
  });

  it("names both sides rather than printing an id", () => {
    const run = careerAt("names");
    for (const tie of liveTiesOf(run, record())) {
      expect(tie.ourName).toBeTruthy();
      expect(tie.theirName).toBeTruthy();
      expect(tie.theirName).not.toBe(tie.opponentId);
    }
  });

  it("has nothing to queue for a side that never got there", () => {
    const run = careerAt("nothing");
    expect(liveTiesOf(run, record({ tournamentRuns: [] }))).toEqual([]);
  });

  it("draws the night with both sides named and the round on it", () => {
    const base = careerAt("draw");
    const ties = liveTiesOf(base, record(), "es");
    const tie = ties.find((entry) => entry.round === "quarter");
    const run = {
      ...base,
      phase: PHASES.TOURNAMENT,
      matchday: null,
      tournament: {
        season: 4,
        ties,
        index: ties.indexOf(tie),
        broadcast: nextTie({
          ...base,
          phase: PHASES.TOURNAMENT,
          tournament: { season: 4, ties, index: ties.indexOf(tie) - 1, broadcast: null },
        }).tournament.broadcast,
      },
    };
    const html = renderToStaticMarkup(
      React.createElement(SCREENS.tournament, { run, locale: "es", onNext: () => {} }),
    );
    expect(html).toContain(ROUND_LABELS.es.quarter);
    expect(html).toContain(TOURNAMENT_LABELS.es.champions);
    expect(html).toContain("Real Madrid");
    expect(html).toContain(tie.theirName);
    // A two-legged tie says which leg you are watching and what you carry into it.
    expect(html).toContain(getCopy("es").tournament.secondLeg);
  });

  it("walks the whole queue and then hands the step back", () => {
    const base = careerAt("walk");
    const ties = liveTiesOf(base, record());
    let run = {
      ...base,
      phase: PHASES.TOURNAMENT,
      matchday: null,
      tournament: { season: 4, ties, index: 0, broadcast: null },
    };
    for (let i = 0; i < ties.length - 1; i += 1) {
      run = nextTie(run);
      expect(run.phase).toBe(PHASES.TOURNAMENT);
      expect(run.tournament.index).toBe(i + 1);
      expect(run.tournament.broadcast.beats.length).toBeGreaterThan(3);
    }
    // The last one leaves the phase entirely.
    run = nextTie(run);
    expect(run.phase).not.toBe(PHASES.TOURNAMENT);
    expect(run.tournament).toBeNull();
  });
});
