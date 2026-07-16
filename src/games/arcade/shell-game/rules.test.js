import { describe, expect, it } from "vitest";
import { STARTING_LIVES, createGameState, pointsFor, registerGuess } from "./rules.js";

const hit = (s, cups = 4) => registerGuess(s, { correct: true, cups });
const miss = (s, cups = 4) => registerGuess(s, { correct: false, cups });

describe("shell game rules — streak and lives", () => {
  it("starts at level one with a full set of lives", () => {
    const s = createGameState();
    expect(s.level).toBe(1);
    expect(s.lives).toBe(STARTING_LIVES);
    expect(s.over).toBe(false);
  });

  it("climbs a level and extends the streak on a hit", () => {
    const s = hit(hit(createGameState()));
    expect(s.level).toBe(3);
    expect(s.streak).toBe(2);
    expect(s.score).toBeGreaterThan(0);
  });

  it("costs a life and resets the streak on a miss, but holds the level", () => {
    // Dropping the level too would only drag out a game already lost.
    const s = miss(hit(hit(createGameState())));
    expect(s.lives).toBe(STARTING_LIVES - 1);
    expect(s.streak).toBe(0);
    expect(s.level).toBe(3);
    expect(s.over).toBe(false);
  });

  it("ends the game on the third miss and not before", () => {
    let s = createGameState();
    s = miss(s);
    expect(s.over).toBe(false);
    s = miss(s);
    expect(s.over).toBe(false);
    s = miss(s);
    expect(s.over).toBe(true);
    expect(s.lives).toBe(0);
  });

  it("is inert once the game is over", () => {
    const dead = miss(miss(miss(createGameState())));
    expect(hit(dead)).toBe(dead);
    expect(miss(dead)).toBe(dead);
  });

  it("remembers the best streak across a run, including after it breaks", () => {
    const s = miss(hit(hit(hit(createGameState()))));
    expect(s.streak).toBe(0);
    expect(s.bestStreak).toBe(3);
  });

  it("carries the best streak into a new game", () => {
    const prev = hit(hit(createGameState()));
    expect(createGameState(prev.bestStreak).bestStreak).toBe(2);
  });

  it("never mutates the state it is handed", () => {
    const s = createGameState();
    const frozen = { ...s };
    hit(s);
    miss(s);
    expect(s).toEqual(frozen);
  });
});

describe("shell game rules — scoring", () => {
  it("pays more for a harder round", () => {
    // Surviving level 18 has to beat farming level 2, and picking right out of
    // five is a different act from picking right out of three.
    expect(pointsFor(18, 5, 0)).toBeGreaterThan(pointsFor(2, 3, 0));
    expect(pointsFor(5, 5, 0)).toBeGreaterThan(pointsFor(5, 3, 0));
    expect(pointsFor(9, 4, 0)).toBeGreaterThan(pointsFor(3, 4, 0));
  });

  it("pays a streak bonus that cannot run away", () => {
    expect(pointsFor(5, 4, 3)).toBeGreaterThan(pointsFor(5, 4, 0));
    // Capped, so a long run scales linearly rather than exploding.
    expect(pointsFor(5, 4, 400)).toBe(pointsFor(5, 4, 10));
  });

  it("always awards a whole, positive number of points", () => {
    for (let level = 1; level <= 40; level++) {
      for (const cups of [3, 4, 5]) {
        const p = pointsFor(level, cups, level % 12);
        expect(Number.isInteger(p)).toBe(true);
        expect(p).toBeGreaterThan(0);
      }
    }
  });
});
