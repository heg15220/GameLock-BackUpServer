import { describe, expect, it } from "vitest";
import {
  createMatchState,
  registerPoint,
  serverFor,
  setsToWin,
  setWinner,
} from "./rules.js";

const scoreTo = (state, scorer, n) => {
  let s = state;
  for (let i = 0; i < n; i++) s = registerPoint(s, scorer);
  return s;
};

describe("ping-pong rules", () => {
  it("computes sets needed per format", () => {
    expect(setsToWin(1)).toBe(1);
    expect(setsToWin(3)).toBe(2);
    expect(setsToWin(5)).toBe(3);
  });

  it("wins a set at 11 with a two-point margin", () => {
    expect(setWinner(11, 5)).toBe("player");
    expect(setWinner(11, 10)).toBe(null); // no 2-point margin yet
    expect(setWinner(12, 10)).toBe("player");
    expect(setWinner(9, 11)).toBe("opponent");
  });

  it("closes a set and awards it, resetting points", () => {
    let s = createMatchState(3, "player");
    s = scoreTo(s, "player", 11);
    expect(s.playerSets).toBe(1);
    expect(s.playerPoints).toBe(0);
    expect(s.opponentPoints).toBe(0);
    expect(s.over).toBe(false);
  });

  it("requires win-by-two in deuce", () => {
    let s = createMatchState(1, "player");
    s = scoreTo(s, "player", 10);
    s = scoreTo(s, "opponent", 10); // 10-10
    s = registerPoint(s, "player"); // 11-10, not over
    expect(s.over).toBe(false);
    s = registerPoint(s, "player"); // 12-10, set + match over (best of 1)
    expect(s.over).toBe(true);
    expect(s.matchWinner).toBe("player");
  });

  it("rotates serve every two points, then every point from 10-10", () => {
    expect(serverFor(0, 0, "player")).toBe("player");
    expect(serverFor(1, 0, "player")).toBe("player");
    expect(serverFor(2, 0, "player")).toBe("opponent");
    expect(serverFor(0, 2, "player")).toBe("opponent");
    expect(serverFor(3, 0, "player")).toBe("opponent");
    expect(serverFor(2, 2, "player")).toBe("player");
    // Deuce: alternate every single point.
    expect(serverFor(10, 10, "player")).toBe("player");
    expect(serverFor(11, 10, "player")).toBe("opponent");
    expect(serverFor(11, 11, "player")).toBe("player");
  });

  it("alternates the first server each new set", () => {
    let s = createMatchState(3, "player");
    expect(s.firstServerThisSet).toBe("player");
    s = scoreTo(s, "player", 11); // player wins set 1
    expect(s.firstServerThisSet).toBe("opponent");
    expect(s.server).toBe("opponent");
  });

  it("wins the match at the required set count (best of 5)", () => {
    let s = createMatchState(5, "player");
    for (let set = 0; set < 3; set++) {
      s = scoreTo(s, "player", 11);
    }
    expect(s.over).toBe(true);
    expect(s.matchWinner).toBe("player");
    expect(s.playerSets).toBe(3);
  });

  it("does not register points after the match is over", () => {
    let s = createMatchState(1, "player");
    s = scoreTo(s, "player", 11);
    const after = registerPoint(s, "opponent");
    expect(after).toBe(s);
  });
});
