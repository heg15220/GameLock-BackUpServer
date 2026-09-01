import { describe, expect, it } from "vitest";
import {
  CaidaLibreRuntime,
  CHOOSE_MS,
  OPEN_MS,
  PLATFORMS,
  PLAYER_COUNT,
  SETTLE_MS,
  STRIKES_OUT,
  survivalOdds,
} from "./runtime.js";

const PLATFORM_MS = CHOOSE_MS + OPEN_MS + SETTLE_MS + 20;

function fresh(difficulty = "normal", seed = 21) {
  const rt = new CaidaLibreRuntime({ seed });
  rt.startRun(difficulty);
  return rt;
}

describe("CaidaLibreRuntime", () => {
  it("starts on the menu with nobody marked", () => {
    const rt = new CaidaLibreRuntime({ seed: 1 });
    const snap = rt.snapshot();
    expect(snap.screen).toBe("menu");
    expect(snap.players).toHaveLength(PLAYER_COUNT);
    expect(snap.players.every((p) => p.strikes === 0 && !p.out)).toBe(true);
  });

  it("gives the reference's five seconds and then opens the doors", () => {
    const rt = fresh();
    expect(rt.snapshot().screen).toBe("choosing");
    expect(rt.snapshot().secondsLeft).toBe(5);
    rt.advanceTime(CHOOSE_MS - 200);
    expect(rt.snapshot().screen).toBe("choosing");
    rt.advanceTime(300);
    expect(rt.snapshot().screen).toBe("opening");
  });

  it("never says which door is the cloud while anyone can still move", () => {
    const rt = fresh();
    expect(rt.snapshot().badSide).toBeNull();
    rt.advanceTime(CHOOSE_MS - 1);
    expect(rt.snapshot().badSide).toBeNull();
    rt.advanceTime(10);
    expect(["left", "right"]).toContain(rt.snapshot().badSide);
  });

  it("lets the player switch sides right up to the buzzer", () => {
    const rt = fresh();
    rt.choose("right");
    expect(rt.snapshot().players[0].side).toBe("right");
    rt.advanceTime(CHOOSE_MS - 50);
    rt.choose("left");
    expect(rt.snapshot().players[0].side).toBe("left");
    rt.advanceTime(100);
    rt.choose("right");
    // Too late: the doors are open.
    expect(rt.snapshot().players[0].side).toBe("left");
  });

  it("moves between doors with acceleration instead of teleporting", () => {
    const rt = fresh();
    const startX = rt.snapshot().players[0].x;
    rt.choose("right");
    expect(rt.snapshot().players[0].side).toBe("right");
    expect(rt.snapshot().players[0].x).toBe(startX);
    rt.advanceTime(180);
    expect(rt.snapshot().players[0].x).toBeGreaterThan(startX);
    expect(rt.snapshot().players[0].vx).toBeGreaterThan(0);
    rt.advanceTime(1200);
    expect(rt.snapshot().players[0].x).toBeCloseTo(0.48, 1);
  });

  it("applies gravity to a falling runner and a bounce to a safe one", () => {
    const falling = fresh("normal", 80);
    falling.badSide = "left";
    falling.players[0].side = "left";
    falling.lockIn();
    falling.advanceTime(420);
    expect(falling.snapshot().players[0].y).toBeGreaterThan(0);
    expect(falling.snapshot().players[0].vy).toBeGreaterThan(0);

    const safe = fresh("normal", 81);
    safe.badSide = "right";
    safe.players[0].side = "left";
    safe.lockIn();
    safe.advanceTime(90);
    expect(safe.snapshot().players[0].y).toBeLessThan(0);
  });

  it("rewards an early lock without changing the hidden coin", () => {
    const early = fresh("normal", 33);
    early.lockIn();
    const late = fresh("normal", 33);
    late.advanceTime(CHOOSE_MS - 500);
    late.lockIn();
    expect(early.snapshot().lockedEarly).toBe(true);
    expect(early.snapshot().decisionScore).toBeGreaterThan(late.snapshot().decisionScore);
    expect(early.snapshot().badSide).toBe(late.snapshot().badSide);
  });

  it("publishes a concise crowd split and physical coordinates for QA", () => {
    const rt = fresh();
    const snap = rt.snapshot();
    expect(snap.crowd.left + snap.crowd.right).toBe(PLAYER_COUNT);
    expect(snap.coordinateSystem).toContain("positive downward");
    expect(snap.players.every((player) => Number.isFinite(player.x) && Number.isFinite(player.vx))).toBe(true);
  });

  it("marks exactly the players standing on the cloud", () => {
    const rt = fresh();
    rt.badSide = "left";
    rt.players[0].side = "left";
    rt.players[1].side = "right";
    rt.players[2].side = "left";
    rt.players[3].side = "right";
    rt.lockIn();
    const snap = rt.snapshot();
    expect(snap.players[0].strikes).toBe(1);
    expect(snap.players[1].strikes).toBe(0);
    expect(snap.players[2].strikes).toBe(1);
    expect(snap.players[3].strikes).toBe(0);
  });

  it("puts a player out on the second fall, exactly as the rules say", () => {
    const rt = fresh();
    rt.badSide = "left";
    rt.players[0].side = "left";
    rt.lockIn();
    expect(rt.snapshot().players[0].strikes).toBe(1);
    expect(rt.snapshot().players[0].out).toBe(false);
    rt.advanceTime(OPEN_MS + SETTLE_MS + 20);
    rt.badSide = "right";
    rt.players[0].side = "right";
    rt.lockIn();
    expect(rt.snapshot().players[0].strikes).toBe(STRIKES_OUT);
    expect(rt.snapshot().players[0].out).toBe(true);
  });

  it("wins by crossing all three platforms with one fall at most", () => {
    const rt = fresh();
    for (let i = 0; i < PLATFORMS; i += 1) {
      // Always step onto the safe door.
      rt.players[0].side = rt.badSide === "left" ? "right" : "left";
      rt.advanceTime(PLATFORM_MS);
    }
    const snap = rt.snapshot();
    expect(snap.screen).toBe("won");
    expect(snap.players[0].strikes).toBe(0);
  });

  it("ends the run the moment the second fall lands", () => {
    const rt = fresh();
    for (let i = 0; i < PLATFORMS; i += 1) {
      rt.players[0].side = rt.badSide;
      rt.advanceTime(PLATFORM_MS);
      if (rt.snapshot().screen === "lost") break;
    }
    expect(rt.snapshot().screen).toBe("lost");
    expect(rt.snapshot().players[0].strikes).toBe(STRIKES_OUT);
  });

  it("is an honest coin: half the blind runs come through", () => {
    // The guide says it is luck and nothing here weights it, so a player who
    // always picks the left door should land within a hair of the stated odds.
    let wins = 0;
    const N = 3000;
    for (let seed = 0; seed < N; seed += 1) {
      const rt = new CaidaLibreRuntime({ seed });
      rt.startRun("normal");
      for (let i = 0; i < PLATFORMS + 1; i += 1) {
        if (rt.snapshot().screen !== "choosing") break;
        rt.choose("left");
        rt.advanceTime(PLATFORM_MS);
      }
      if (rt.snapshot().screen === "won") wins += 1;
    }
    expect(wins / N).toBeGreaterThan(survivalOdds() - 0.05);
    expect(wins / N).toBeLessThan(survivalOdds() + 0.05);
  });

  it("gives the same odds to a player who copies the crowd", () => {
    // Following the pack is the guide's advice; it shares fate, it does not
    // improve it. This pins that so nobody 'fixes' it into an edge later.
    let wins = 0;
    const N = 3000;
    for (let seed = 0; seed < N; seed += 1) {
      const rt = new CaidaLibreRuntime({ seed });
      rt.startRun("facil");
      for (let i = 0; i < PLATFORMS + 1; i += 1) {
        if (rt.snapshot().screen !== "choosing") break;
        rt.advanceTime(CHOOSE_MS - 300);
        const counts = { left: 0, right: 0 };
        for (const p of rt.snapshot().players) {
          if (!p.isHuman && !p.out) counts[p.side] += 1;
        }
        rt.choose(counts.left >= counts.right ? "left" : "right");
        rt.advanceTime(OPEN_MS + SETTLE_MS + 320);
      }
      if (rt.snapshot().screen === "won") wins += 1;
    }
    expect(wins / N).toBeGreaterThan(survivalOdds() - 0.05);
    expect(wins / N).toBeLessThan(survivalOdds() + 0.05);
  });

  it("has the rivals actually commit during the window", () => {
    const rt = fresh("facil");
    expect(rt.snapshot().players.slice(1).every((p) => !p.committed)).toBe(true);
    rt.advanceTime(CHOOSE_MS - 100);
    expect(rt.snapshot().players.slice(1).every((p) => p.committed)).toBe(true);
  });

  it("holds everything while paused", () => {
    const rt = fresh();
    rt.advanceTime(1000);
    const before = rt.snapshot().secondsLeft;
    rt.togglePause();
    rt.advanceTime(30000);
    expect(rt.snapshot().screen).toBe("choosing");
    expect(rt.snapshot().secondsLeft).toBe(before);
  });

  it("restarts cleanly from a paused run", () => {
    const rt = fresh();
    rt.advanceTime(900);
    rt.togglePause();
    rt.restart();
    expect(rt.snapshot().paused).toBe(false);
    expect(rt.snapshot().screen).toBe("choosing");
    expect(rt.snapshot().chooseProgress).toBe(0);
    expect(rt.snapshot().score).toBe(0);
  });

  it("is reproducible from a seed", () => {
    const run = () => {
      const rt = new CaidaLibreRuntime({ seed: 909 });
      rt.startRun("normal");
      const trail = [];
      for (let i = 0; i < PLATFORMS + 1; i += 1) {
        if (rt.snapshot().screen !== "choosing") break;
        rt.choose(i % 2 ? "left" : "right");
        rt.advanceTime(PLATFORM_MS);
        trail.push(`${rt.snapshot().badSide}:${rt.snapshot().players[0].strikes}`);
      }
      return trail.join("|");
    };
    expect(run()).toBe(run());
  });
});
