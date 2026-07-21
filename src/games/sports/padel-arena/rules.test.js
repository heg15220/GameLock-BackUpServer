import { describe, it, expect } from "vitest";
import {
  createMatchState,
  registerPoint,
  pointLabels,
  serveCourt,
  setsToWin,
} from "./rules.js";

const play = (state, seq) => seq.reduce((s, scorer) => registerPoint(s, scorer), state);
const win = (n, who) => Array.from({ length: n }, () => who);

describe("setsToWin", () => {
  it("maps best-of to sets needed", () => {
    expect(setsToWin(1)).toBe(1);
    expect(setsToWin(3)).toBe(2);
  });
});

describe("point scoring", () => {
  it("labels points 0/15/30/40", () => {
    let s = createMatchState(1);
    expect(pointLabels(s)).toEqual({ home: "0", away: "0" });
    s = play(s, ["home", "home", "home"]);
    expect(pointLabels(s)).toEqual({ home: "40", away: "0" });
  });

  it("shows deuce and advantage at 40-40", () => {
    let s = createMatchState(1);
    s = play(s, ["home", "home", "home", "away", "away", "away"]);
    expect(pointLabels(s)).toEqual({ home: "40", away: "40" });
    s = registerPoint(s, "home");
    expect(pointLabels(s)).toEqual({ home: "Ad", away: "40" });
    s = registerPoint(s, "away"); // back to deuce
    expect(pointLabels(s)).toEqual({ home: "40", away: "40" });
  });

  it("wins a game from 40 with two clear points and resets points", () => {
    let s = createMatchState(1);
    s = play(s, win(4, "home"));
    expect(s.homeGames).toBe(1);
    expect(s.homePoints).toBe(0);
    expect(s.lastGameWinner).toBe("home");
  });

  it("requires advantage then a point to close a deuce game", () => {
    let s = createMatchState(1);
    s = play(s, ["home", "home", "home", "away", "away", "away"]); // deuce
    s = play(s, ["home", "home"]); // Ad then game
    expect(s.homeGames).toBe(1);
  });
});

describe("serve", () => {
  it("alternates the serving team each game", () => {
    let s = createMatchState(3, "home");
    expect(s.server).toBe("home");
    s = play(s, win(4, "home"));
    expect(s.server).toBe("away");
  });

  it("alternates serve court by point parity", () => {
    let s = createMatchState(1);
    expect(serveCourt(s)).toBe("right");
    s = registerPoint(s, "home");
    expect(serveCourt(s)).toBe("left");
  });
});

describe("sets", () => {
  it("wins a set at 6 games by two", () => {
    let s = createMatchState(1);
    for (let g = 0; g < 6; g++) s = play(s, win(4, "home"));
    expect(s.homeSets).toBe(1);
    expect(s.matchWinner).toBe("home");
    expect(s.over).toBe(true);
  });

  it("enters a tie-break at 6-6 and does not award the set yet", () => {
    let s = createMatchState(3);
    // Alternate games to reach 6-6.
    for (let g = 0; g < 6; g++) {
      s = play(s, win(4, "home"));
      s = play(s, win(4, "away"));
    }
    expect(s.homeGames).toBe(6);
    expect(s.awayGames).toBe(6);
    expect(s.tieBreak).toBe(true);
    expect(s.homeSets).toBe(0);
  });

  it("wins the set through the tie-break to 7 by two", () => {
    let s = createMatchState(3);
    for (let g = 0; g < 6; g++) {
      s = play(s, win(4, "home"));
      s = play(s, win(4, "away"));
    }
    s = play(s, win(7, "home"));
    expect(s.homeSets).toBe(1);
    expect(s.tieBreak).toBe(false);
    expect(s.setNumber).toBe(2);
  });
});

describe("match", () => {
  it("takes a best-of-3 match after two sets", () => {
    let s = createMatchState(3, "home");
    const takeSet = (who) => {
      for (let g = 0; g < 6; g++) s = play(s, win(4, who));
    };
    takeSet("home");
    expect(s.matchWinner).toBeNull();
    takeSet("home");
    expect(s.homeSets).toBe(2);
    expect(s.matchWinner).toBe("home");
    expect(s.over).toBe(true);
  });

  it("ignores points once the match is over", () => {
    let s = createMatchState(1);
    for (let g = 0; g < 6; g++) s = play(s, win(4, "home"));
    const frozen = registerPoint(s, "away");
    expect(frozen).toEqual(s);
  });
});
