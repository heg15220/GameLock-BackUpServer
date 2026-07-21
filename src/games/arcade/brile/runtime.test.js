import { describe, expect, it } from "vitest";
import {
  BrileRuntime,
  DIFFICULTY,
  TEAM_SIZE,
  START_PRISONERS,
  START_GRACE_MS,
  CENTER_X,
  CENTER_GAP,
  CEM_W,
  BODY_R,
  ARENA_W,
} from "./runtime.js";

const make = (seed = 777, opts = {}) => new BrileRuntime({ seed, ...opts });

function playToEnd(rt, maxMs = 240000, step = 100) {
  let t = 0;
  while (rt.snapshot().screen === "playing" && t < maxMs) {
    rt.advanceTime(step);
    t += step;
  }
  return rt.snapshot();
}

describe("setup", () => {
  it("fields two teams of six, five in court and one in the graveyard", () => {
    const rt = make();
    rt.startGame("normal");
    const s = rt.snapshot();
    expect(s.screen).toBe("playing");
    expect(rt.players).toHaveLength(TEAM_SIZE * 2);
    for (const team of ["A", "B"]) {
      const roster = rt.players.filter((p) => p.team === team);
      expect(roster).toHaveLength(TEAM_SIZE);
      expect(roster.filter((p) => p.zone === "court")).toHaveLength(TEAM_SIZE - START_PRISONERS);
      expect(roster.filter((p) => p.zone === "prison")).toHaveLength(START_PRISONERS);
    }
    expect(s.aCourt).toBe(TEAM_SIZE - START_PRISONERS);
    expect(s.bCourt).toBe(TEAM_SIZE - START_PRISONERS);
    // You are team A's first court body.
    expect(rt.player.isPlayer).toBe(true);
    expect(rt.player.team).toBe("A");
    expect(rt.player.zone).toBe("court");
  });

  it("starts with two loose balls, one per court", () => {
    const rt = make();
    rt.startGame("normal");
    expect(rt.balls).toHaveLength(2);
    expect(rt.balls.every((b) => b.state === "loose")).toBe(true);
  });

  it("is reproducible from a seed", () => {
    const a = make(4242);
    const b = make(4242);
    a.startGame("normal");
    b.startGame("normal");
    for (let i = 0; i < 200; i += 1) {
      a.advanceTime(50);
      b.advanceTime(50);
    }
    const pa = a.players.map((p) => [p.x.toFixed(4), p.y.toFixed(4), p.zone]);
    const pb = b.players.map((p) => [p.x.toFixed(4), p.y.toFixed(4), p.zone]);
    expect(pa).toEqual(pb);
  });
});

describe("hit resolution", () => {
  const flightBall = (rt, team, throwerId) => {
    const ball = rt.balls[0];
    ball.state = "flight";
    ball.team = team;
    ball.thrownBy = throwerId;
    ball.live = true;
    return ball;
  };

  it("brilós a struck rival: they go to the graveyard", () => {
    const rt = make();
    rt.startGame("normal");
    rt.elapsedMs = START_GRACE_MS + 500;
    const target = rt.players.find((p) => p.team === "B" && p.zone === "court");
    const before = rt._courtCount("B");
    rt._resolveContact(flightBall(rt, "A", "A0"), target);
    expect(target.zone).toBe("prison");
    expect(rt._courtCount("B")).toBe(before - 1);
    // The clean thrower stays in the court.
    expect(rt._byId("A0").zone).toBe("court");
  });

  it("a caught ball sends the THROWER down and the catcher keeps the ball", () => {
    const rt = make();
    rt.startGame("normal");
    rt.elapsedMs = START_GRACE_MS + 500;
    const thrower = rt.players.find((p) => p.team === "B" && p.zone === "court");
    const you = rt.player;
    rt.catchArmedUntil = rt.elapsedMs + 1000; // human armed the catch in time
    const ball = flightBall(rt, "B", thrower.id);
    rt._resolveContact(ball, you);
    expect(thrower.zone).toBe("prison");
    expect(you.zone).toBe("court");
    expect(you.holding).toBe(ball.id);
    expect(rt.stats.catches).toBe(1);
  });

  it("an unarmed human just gets hit", () => {
    const rt = make();
    rt.startGame("normal");
    rt.elapsedMs = START_GRACE_MS + 500;
    const thrower = rt.players.find((p) => p.team === "B" && p.zone === "court");
    const you = rt.player;
    rt.catchArmedUntil = -1;
    rt._resolveContact(flightBall(rt, "B", thrower.id), you);
    expect(you.zone).toBe("prison");
    expect(thrower.zone).toBe("court");
  });

  it("a prisoner who lands a hit returns to their court", () => {
    const rt = make();
    rt.startGame("normal");
    rt.elapsedMs = START_GRACE_MS + 500;
    const prisoner = rt.players.find((p) => p.team === "A" && p.zone === "prison");
    expect(prisoner).toBeTruthy();
    const target = rt.players.find((p) => p.team === "B" && p.zone === "court");
    rt._resolveContact(flightBall(rt, "A", prisoner.id), target);
    expect(target.zone).toBe("prison");
    expect(prisoner.zone).toBe("court");
  });
});

describe("movement", () => {
  it("keeps the player inside their own half (never crossing the centre line)", () => {
    const rt = make();
    rt.startGame("normal");
    const you = rt.player;
    rt.setMove(1, 0);
    rt.advanceTime(6000);
    expect(you.x).toBeLessThanOrEqual(CENTER_X - CENTER_GAP + 0.5);
    rt.setMove(-1, 0);
    rt.advanceTime(6000);
    expect(you.x).toBeGreaterThanOrEqual(CEM_W + BODY_R - 0.5);
  });
});

describe("match resolution", () => {
  it("declares a win the instant a team's court is empty", () => {
    const rt = make(3);
    rt.startGame("normal");
    rt.elapsedMs = START_GRACE_MS + 1000;
    for (const p of rt.players.filter((p) => p.team === "B" && p.zone === "court")) {
      rt._sendToPrison(p);
    }
    rt.advanceTime(16);
    const s = rt.snapshot();
    expect(s.screen).toBe("over");
    expect(s.result.win).toBe(true);
    expect(s.bCourt).toBe(0);
  });

  it("plays a full match to a resolved result", () => {
    const rt = make(11);
    rt.startGame("dificil");
    const s = playToEnd(rt);
    expect(s.screen).toBe("over");
    expect(s.result).not.toBeNull();
    expect(typeof s.result.win).toBe("boolean");
    expect(s.aCourt === 0 || s.bCourt === 0).toBe(true);
  });
});

describe("flow", () => {
  it("threads Enter from the menu into a match", () => {
    const rt = make();
    expect(rt.snapshot().screen).toBe("menu");
    rt.pressVirtualKey("Enter");
    expect(rt.snapshot().screen).toBe("playing");
  });

  it("arms a catch window on demand", () => {
    const rt = make();
    rt.startGame("normal");
    rt.pressCatch();
    expect(rt.snapshot().catchArmed).toBe(true);
  });

  it("pauses and resumes without advancing the clock", () => {
    const rt = make();
    rt.startGame("normal");
    rt.togglePause();
    const before = rt.snapshot().elapsedSeconds;
    rt.advanceTime(2000);
    expect(rt.snapshot().elapsedSeconds).toBe(before);
    rt.togglePause();
    rt.advanceTime(1000);
    expect(rt.snapshot().elapsedSeconds).toBeGreaterThan(before);
  });

  it("exposes every difficulty tier", () => {
    expect(Object.keys(DIFFICULTY)).toEqual(["facil", "normal", "dificil"]);
    expect(ARENA_W).toBe(2 * (CEM_W + 128));
  });
});
