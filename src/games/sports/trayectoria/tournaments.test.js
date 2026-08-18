/**
 * The formats, checked against the competitions they claim to be.
 *
 * A bracket that is internally consistent but wrong about reality still draws, still plays
 * and still says "Copa de Europa" at the top - which is exactly why this is worth having.
 * Every number below is one anybody can verify against a real edition in ten seconds, and
 * that is the point: these change, and the World Cup changed last.
 */
import { describe, expect, it } from "vitest";

import {
  ROUNDS,
  TOURNAMENTS,
  legsOf,
  matchesToWin,
  pathFrom,
  qualifiersOf,
  roundsOf,
  tournamentFor,
  continentalQualification,
  matchInertia,
  playerPull,
  simulateTournamentRun,
} from "./tournaments.js";

describe("the five formats", () => {
  it("puts the right number of sides into the first knockout round", () => {
    // The one error a bracket hides: a round that wants sixteen and is handed fourteen.
    for (const id of Object.keys(TOURNAMENTS)) {
      const first = roundsOf(id)[0];
      expect(first, `${id} has no knockout`).toBeTruthy();
      expect(qualifiersOf(id), `${id}: llegan ${qualifiersOf(id)} a ${first.id}`).toBe(first.teams);
    }
  });

  it("halves the field every round, except where the format says otherwise", () => {
    for (const id of Object.keys(TOURNAMENTS)) {
      const rounds = roundsOf(id);
      for (let i = 1; i < rounds.length; i += 1) {
        // The Champions play-off is the one round that does not halve the field: its eight
        // winners are joined by the eight sides that finished in the top eight and skipped
        // it, so sixteen go into the last sixteen. That is the format, not a slip.
        const expected = rounds[i - 1].feeds + (id === "champions" && rounds[i].id === "r16" ? 8 : 0);
        expect(rounds[i].teams, `${id}: ${rounds[i - 1].id} -> ${rounds[i].id}`).toBe(expected);
      }
      expect(rounds[rounds.length - 1].id).toBe("final");
      expect(rounds[rounds.length - 1].teams).toBe(2);
    }
  });

  /** The numbers, one by one, as a real edition prints them. */
  it("is the competition it says it is", () => {
    expect(TOURNAMENTS.champions.teams).toBe(36);
    expect(TOURNAMENTS.champions.phase.matches).toBe(8);
    expect(TOURNAMENTS.champions.phase.direct).toBe(8);

    expect(TOURNAMENTS.libertadores.teams).toBe(32);
    expect(TOURNAMENTS.libertadores.phase.groups).toBe(8);

    expect(TOURNAMENTS.euro.teams).toBe(24);
    expect(TOURNAMENTS.euro.phase.groups).toBe(6);
    expect(TOURNAMENTS.euro.phase.bestThirds).toBe(4);

    expect(TOURNAMENTS.copa_america.teams).toBe(16);
    // Sixteen sides, four groups: no last sixteen, straight into the quarters.
    expect(roundsOf("copa_america")[0].id).toBe("quarter");

    expect(TOURNAMENTS.world_cup.teams).toBe(48);
    expect(TOURNAMENTS.world_cup.phase.groups).toBe(12);
    expect(TOURNAMENTS.world_cup.phase.bestThirds).toBe(8);
    expect(roundsOf("world_cup")[0].id).toBe("r32");
  });

  it("plays club knockouts over two legs and a finals tournament over one", () => {
    expect(legsOf("champions", "quarter")).toBe(2);
    expect(legsOf("libertadores", "semi")).toBe(2);
    // Every final is a single match, club or country.
    for (const id of Object.keys(TOURNAMENTS)) {
      expect(legsOf(id, "final"), `${id}: la final no es a partido único`).toBe(1);
    }
    // A finals tournament in one country is one match throughout.
    for (const id of ["euro", "copa_america", "world_cup"]) {
      for (const round of TOURNAMENTS[id].knockout) expect(legsOf(id, round)).toBe(1);
    }
  });

  it("knows how long a winning run actually is", () => {
    // Forty-eight sides: three in the group and five knockout rounds.
    expect(matchesToWin("world_cup")).toBe(3 + 5);
    // A Copa América is six: three and three.
    expect(matchesToWin("copa_america")).toBe(3 + 3);
    for (const id of Object.keys(TOURNAMENTS)) {
      expect(matchesToWin(id), `${id}`).toBeGreaterThan(0);
    }
  });

  it("says what is still ahead from wherever a side has got to", () => {
    expect(pathFrom("world_cup").map((r) => r.id)).toEqual(["r32", "r16", "quarter", "semi", "final"]);
    expect(pathFrom("world_cup", "semi").map((r) => r.id)).toEqual(["semi", "final"]);
    expect(pathFrom("world_cup", "final").map((r) => r.id)).toEqual(["final"]);
    // An unknown round is not a reason to lose the bracket.
    expect(pathFrom("world_cup", "nonsense").map((r) => r.id)).toHaveLength(5);
    expect(pathFrom("nonsense")).toEqual([]);
  });

  it("hands each confederation the competition it actually plays", () => {
    expect(tournamentFor({ confederation: "UEFA", club: true }).id).toBe("champions");
    expect(tournamentFor({ confederation: "CONMEBOL", club: true }).id).toBe("libertadores");
    expect(tournamentFor({ confederation: "UEFA", club: false }).id).toBe("euro");
    expect(tournamentFor({ confederation: "CONMEBOL", club: false }).id).toBe("copa_america");
    // A confederation with no continental of its own modelled still has the World Cup.
    expect(tournamentFor({ confederation: "AFC", club: false }).id).toBe("world_cup");
  });

  it("names every round it uses", () => {
    for (const id of Object.keys(TOURNAMENTS)) {
      for (const round of TOURNAMENTS[id].knockout) {
        expect(ROUNDS[round], `${id} usa una ronda que no existe: ${round}`).toBeTruthy();
      }
    }
  });
});

describe("qualification and full runs", () => {
  it("uses the table, cup and holder rules rather than club reputation", () => {
    expect(continentalQualification({ position: 4, confederation: "UEFA" }).level).toBe("main");
    expect(continentalQualification({ position: 5, confederation: "UEFA" }).level).toBe("secondary");
    expect(continentalQualification({ position: 12, confederation: "UEFA", reputation: 5 }).level).toBe("none");
    expect(continentalQualification({ position: 12, confederation: "UEFA", wonCup: true }).level).toBe("secondary");
    expect(continentalQualification({ position: 12, confederation: "UEFA", wonMain: true }).level).toBe("main");
    expect(continentalQualification({ position: 6, confederation: "CONMEBOL" }).level).toBe("main");
  });

  it("simulates every round and makes a champion come through all of them", () => {
    const player = { id: "us", name: "Nos", continental_reputation: 4 };
    const entrants = Array.from({ length: 48 }, (_, index) => ({
      id: `team-${index}`,
      name: `Team ${index}`,
      continental_reputation: index % 6,
    }));
    const run = simulateTournamentRun({
      id: "world_cup", seed: "complete", season: 8, entrants, player, champion: true,
    });
    expect(run.phase.qualified).toBe(true);
    expect(run.rounds.map((round) => round.round)).toEqual(["r32", "r16", "quarter", "semi", "final"]);
    /*
     * Won every round - but NOT necessarily on the scoreline. A tie can finish level and be
     * settled from twelve yards, which is the one thing this simulation used never to be
     * able to do: `settleTie` draws a margin of zero and the shootout answers it. So the
     * guard is that a champion is never eliminated, and that a level tie is always a
     * shootout rather than an unresolved draw.
     */
    expect(run.rounds.every((round) => round.won)).toBe(true);
    for (const round of run.rounds) {
      const level = round.score.us === round.score.them;
      expect(round.penalties).toBe(level);
      if (!level) expect(round.score.us).toBeGreaterThan(round.score.them);
    }
    expect(run.champion).toBe(true);
    expect(run.eliminatedAt).toBeNull();
  });

  it("is deterministic and stops a losing run at its exit round", () => {
    const args = {
      id: "champions", seed: "exit", season: 3,
      player: { id: "us", name: "Nos", continental_reputation: 2 },
      entrants: Array.from({ length: 36 }, (_, index) => ({ id: `c-${index}`, name: `C ${index}`, continental_reputation: index % 6 })),
    };
    const first = simulateTournamentRun(args);
    expect(first).toEqual(simulateTournamentRun(args));
    expect(first.champion).toBe(false);
    expect(first.rounds[first.rounds.length - 1].won).toBe(false);
    expect(first.eliminatedAt).toBe(first.rounds[first.rounds.length - 1].round);
  });
});

/**
 * WHOSE RUN IT IS.
 *
 * A tournament used to be drawn from the badge and nothing else, which made it the one part
 * of a career the career could not reach: the same club went exactly as far in its ninth
 * season as in its first, whoever happened to be playing for it. These lock in the two
 * things that now move it - what he is rated right now, and how much football he is
 * actually playing, with this season weighted above the two behind it.
 */
describe("the player's weight on his own tournament", () => {
  const field = Array.from({ length: 36 }, (_, index) => ({
    id: `c-${index}`,
    name: `C ${index}`,
    continental_reputation: index % 6,
  }));
  const club = { id: "us", name: "Nos", continental_reputation: 2 };

  /** How often a run of this shape reaches the final at all, over a decent sample. */
  const reachesFinal = (pull) => {
    let finals = 0;
    const runs = 600;
    for (let i = 0; i < runs; i += 1) {
      const run = simulateTournamentRun({
        id: "champions", seed: `pull-${i}`, season: 2, entrants: field, player: club, pull,
      });
      if ((run?.rounds ?? []).some((round) => round.round === "final")) finals += 1;
    }
    return finals / runs;
  };

  it("counts the current season above the ones behind it", () => {
    // Same three seasons, different order: the one being played is the one that counts.
    const rising = matchInertia(44, [10, 8]);
    const falling = matchInertia(8, [44, 44]);
    expect(rising).toBeGreaterThan(falling);
    // And the extremes are the extremes.
    expect(matchInertia(0, [0, 0])).toBe(0);
    expect(matchInertia(60, [60, 60])).toBe(1);
    // A first season is measured against itself, not against two it has not had.
    expect(matchInertia(38, [])).toBeCloseTo(1, 6);
  });

  it("rates a player by what he is now, damped by whether he is on the pitch", () => {
    const star = playerPull({ ovr: 90, matches: 44, previous: [42, 40] });
    const squad = playerPull({ ovr: 76, matches: 24, previous: [22, 20] });
    const reserve = playerPull({ ovr: 62, matches: 8, previous: [6, 4] });
    expect(star).toBeGreaterThan(squad);
    expect(squad).toBeGreaterThan(reserve);
    expect(reserve).toBeLessThan(0);

    // The same rating, a season spent injured: he cannot carry a side he is not in.
    const absent = playerPull({ ovr: 90, matches: 4, previous: [42, 40] });
    expect(absent).toBeLessThan(star);
    expect(absent).toBeGreaterThan(reserve);
  });

  it("moves how far the side actually goes", () => {
    const withStar = reachesFinal(playerPull({ ovr: 90, matches: 44, previous: [42, 40] }));
    const withReserve = reachesFinal(playerPull({ ovr: 62, matches: 8, previous: [6, 4] }));
    // Not a rounding difference: the same club is a different side with a great player in
    // it, which is the whole claim.
    expect(withStar).toBeGreaterThan(withReserve * 3);
    // And it is still a tournament, not a coronation.
    expect(withStar).toBeLessThan(0.5);
  });

  it("never lets the pull put a side outside the range the formats are drawn for", () => {
    for (const pull of [-9, -1, 0, 1, 9]) {
      const run = simulateTournamentRun({
        id: "champions", seed: "range", season: 1, entrants: field, player: club, pull,
      });
      expect(run).toBeTruthy();
      expect(run.phase.position).toBeGreaterThanOrEqual(1);
      expect(run.phase.position).toBeLessThanOrEqual(TOURNAMENTS.champions.teams);
    }
  });

  it("changes nothing for a run that is not given one", () => {
    const args = { id: "champions", seed: "neutral", season: 1, entrants: field, player: club };
    expect(simulateTournamentRun({ ...args, pull: 0 })).toEqual(simulateTournamentRun(args));
  });
});
