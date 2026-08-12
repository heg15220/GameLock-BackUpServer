/**
 * The formats, checked against the competitions they claim to be.
 *
 * A bracket that is internally consistent but wrong about reality still draws, still plays
 * and still says "Champions League" at the top - which is exactly why this is worth having.
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
