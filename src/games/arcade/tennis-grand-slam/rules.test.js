import { describe, expect, it } from "vitest";
import {
  createMatch,
  awardPoint,
  scoreLabels,
  isDeuce,
  pointContext,
  matchSummary,
} from "./rules";

const win = (match, player, times = 1) => {
  let m = match;
  for (let i = 0; i < times; i += 1) m = awardPoint(m, player);
  return m;
};

// Plays whole games without caring who is serving.
const winGames = (match, player, games) => {
  let m = match;
  for (let g = 0; g < games; g += 1) m = win(m, player, 4);
  return m;
};

describe("point scoring", () => {
  it("counts 15, 30, 40", () => {
    let m = createMatch();
    expect(scoreLabels(m)).toEqual(["0", "0"]);
    m = win(m, 0);
    expect(scoreLabels(m)[0]).toBe("15");
    m = win(m, 0);
    expect(scoreLabels(m)[0]).toBe("30");
    m = win(m, 0);
    expect(scoreLabels(m)[0]).toBe("40");
  });

  it("goes to deuce and advantage", () => {
    let m = createMatch();
    m = win(m, 0, 3);
    m = win(m, 1, 3);
    expect(isDeuce(m)).toBe(true);
    expect(scoreLabels(m)).toEqual(["40", "40"]);

    m = win(m, 0);
    expect(scoreLabels(m)).toEqual(["Ad", "-"]);

    // Back to deuce.
    m = win(m, 1);
    expect(isDeuce(m)).toBe(true);
  });

  it("needs two clear points from deuce to take the game", () => {
    let m = createMatch();
    m = win(m, 0, 3);
    m = win(m, 1, 3);
    m = win(m, 0); // advantage
    m = win(m, 0); // game
    expect(m.games[0]).toBe(1);
    expect(m.points).toEqual([0, 0]);
  });

  it("switches server after each game", () => {
    let m = createMatch({ server: 0 });
    m = win(m, 0, 4);
    expect(m.server).toBe(1);
    m = win(m, 1, 4);
    expect(m.server).toBe(0);
  });
});

describe("sets", () => {
  it("takes a set at 6 games with two clear", () => {
    let m = createMatch();
    m = winGames(m, 0, 6);
    expect(m.sets[0]).toBe(1);
    expect(m.games).toEqual([0, 0]);
  });

  it("does not take a set at 6-5", () => {
    let m = createMatch();
    m = winGames(m, 1, 5);
    m = winGames(m, 0, 6);
    // 6-5 is not enough — the set is still live.
    expect(m.sets[0]).toBe(0);
    expect(m.games).toEqual([6, 5]);
  });

  it("starts a tiebreak at 6-6", () => {
    let m = createMatch();
    for (let i = 0; i < 6; i += 1) {
      m = win(m, 0, 4);
      m = win(m, 1, 4);
    }
    expect(m.games).toEqual([6, 6]);
    expect(m.tiebreak).toBe(true);
    expect(scoreLabels(m)).toEqual(["0", "0"]);
  });
});

describe("tiebreak", () => {
  const toTiebreak = () => {
    let m = createMatch();
    for (let i = 0; i < 6; i += 1) {
      m = win(m, 0, 4);
      m = win(m, 1, 4);
    }
    return m;
  };

  it("is won at 7 with two clear", () => {
    let m = toTiebreak();
    m = win(m, 0, 7);
    expect(m.sets[0]).toBe(1);
    expect(m.completedSets[0].games).toEqual([7, 6]);
  });

  it("keeps going past 7 when it is only one point apart", () => {
    let m = toTiebreak();
    m = win(m, 0, 6);
    m = win(m, 1, 6);
    m = win(m, 0); // 7-6, not enough
    expect(m.sets[0]).toBe(0);
    expect(m.tiebreak).toBe(true);
    m = win(m, 0); // 8-6, set
    expect(m.sets[0]).toBe(1);
  });

  it("changes serve after the first point, then every two", () => {
    let m = toTiebreak();
    const first = m.server;
    expect(m.server).toBe(first);
    m = win(m, 0); // 1 point played
    expect(m.server).toBe(1 - first);
    m = win(m, 0); // 2
    expect(m.server).toBe(1 - first);
    m = win(m, 0); // 3
    expect(m.server).toBe(first);
  });
});

describe("match", () => {
  it("ends at two sets in a best-of-three", () => {
    let m = createMatch({ setsToWin: 2 });
    m = winGames(m, 0, 6);
    m = winGames(m, 0, 6);
    expect(m.winner).toBe(0);
    expect(m.lastEvent).toBe("match");
  });

  it("ignores points once it is over", () => {
    let m = createMatch({ setsToWin: 2 });
    m = winGames(m, 0, 6);
    m = winGames(m, 0, 6);
    const after = awardPoint(m, 1);
    expect(after).toBe(m);
  });

  it("summarises the sets played", () => {
    let m = createMatch({ setsToWin: 2 });
    m = winGames(m, 0, 6);
    m = winGames(m, 1, 6);
    expect(matchSummary(m)).toEqual(["6-0", "0-6"]);
  });
});

describe("situational context (what the AI reads)", () => {
  it("flags a break point for the returner", () => {
    let m = createMatch({ server: 0 });
    m = win(m, 1, 3); // returner is at 40-0 on the server's game
    const forReturner = pointContext(m, 1);
    expect(forReturner.breakPoint).toBe(true);

    const forServer = pointContext(m, 0);
    // The same point is a break point from both sides of the net...
    expect(forServer.breakPoint).toBe(true);
    // ...but only the server is the one who stands to lose it.
    expect(forServer.facingPressure).toBe(true);
    expect(forReturner.facingPressure).toBe(false);
  });

  it("does not call it a break point when the server is ahead", () => {
    let m = createMatch({ server: 0 });
    m = win(m, 0, 3); // server at 40-0
    expect(pointContext(m, 1).breakPoint).toBe(false);
  });

  it("flags match point in the deciding set", () => {
    let m = createMatch({ setsToWin: 2 });
    m = winGames(m, 0, 6); // one set up
    m = winGames(m, 0, 5); // 5-0 in the second
    m = win(m, 0, 3);      // 40-0, serving for the match
    const ctx = pointContext(m, 0);
    expect(ctx.setPoint).toBe(true);
    expect(ctx.matchPoint).toBe(true);
  });
});
