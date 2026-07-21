import { describe, expect, it } from "vitest";
import {
  TerrorZombiRuntime,
  DIFFICULTY,
  MAPS,
  getMap,
  ARENA_W,
  ARENA_H,
  WALL_MARGIN,
  CONTACT_R,
  START_GRACE_MS,
} from "./runtime.js";

const make = (seed = 777, opts = {}) => new TerrorZombiRuntime({ seed, ...opts });

// Step the round in small frames so contacts land naturally, up to a cap.
function playToEnd(rt, maxMs = 120000, step = 100) {
  let t = 0;
  while (rt.snapshot().screen === "playing" && t < maxMs) {
    rt.advanceTime(step);
    t += step;
  }
  return rt.snapshot();
}

describe("setup", () => {
  it("spawns four humans and the difficulty's zombie count", () => {
    for (const [level, cfg] of Object.entries(DIFFICULTY)) {
      const rt = make();
      rt.startGame(level);
      const s = rt.snapshot();
      expect(s.screen).toBe("playing");
      expect(s.totalHumans).toBe(4);
      expect(s.humansLeft).toBe(4);
      expect(s.zombies).toBe(cfg.zombies);
    }
  });

  it("is reproducible from a seed (same tombstones and outcome)", () => {
    const a = make(4242);
    const b = make(4242);
    a.startGame("normal");
    b.startGame("normal");
    expect(a.tombstones).toEqual(b.tombstones);
    const ra = playToEnd(a);
    const rb = playToEnd(b);
    expect(ra.result).toEqual(rb.result);
  });
});

describe("maps", () => {
  it("ships three cemeteries, each strictly larger than the last", () => {
    expect(MAPS).toHaveLength(3);
    for (let i = 1; i < MAPS.length; i += 1) {
      expect(MAPS[i].w).toBeGreaterThan(MAPS[i - 1].w);
      expect(MAPS[i].h).toBeGreaterThan(MAPS[i - 1].h);
      expect(MAPS[i].w * MAPS[i].h).toBeGreaterThan(MAPS[i - 1].w * MAPS[i - 1].h);
    }
  });

  it("adapts survivors, horde and headstones to each map's size", () => {
    for (const map of MAPS) {
      const rt = make();
      rt.startGame("normal", map.id);
      const s = rt.snapshot();
      expect(s.mapId).toBe(map.id);
      expect(s.totalHumans).toBe(map.humans);
      expect(s.humansLeft).toBe(map.humans);
      // Zombie count is the tier's base plus this map's bonus.
      expect(s.zombies).toBe(DIFFICULTY.normal.zombies + map.zombieBonus);
      // Bigger fields carry more survivors and more headstones.
      expect(rt.entities.filter((e) => e.kind === "human").length).toBe(map.humans);
      expect(rt.tombstones.length).toBeGreaterThan(0);
      expect(rt.arenaW).toBe(map.w);
      expect(rt.arenaH).toBe(map.h);
    }
  });

  it("keeps every entity inside the fence on the largest map", () => {
    const rt = make(123);
    const big = MAPS[MAPS.length - 1];
    rt.startGame("dificil", big.id);
    rt.advanceTime(4000);
    for (const e of rt.entities) {
      expect(e.x).toBeGreaterThanOrEqual(WALL_MARGIN - 0.5);
      expect(e.y).toBeGreaterThanOrEqual(WALL_MARGIN - 0.5);
      expect(e.x).toBeLessThanOrEqual(big.w - WALL_MARGIN + 0.5);
      expect(e.y).toBeLessThanOrEqual(big.h - WALL_MARGIN + 0.5);
    }
  });

  it("resolves a round to a single survivor on a bigger map", () => {
    const rt = make(77);
    rt.startGame("dificil", "necropolis");
    const s = playToEnd(rt, 180000);
    expect(s.screen).toBe("over");
    expect(s.result.ranking).toHaveLength(getMap("necropolis").humans);
    expect(s.humansLeft).toBeLessThanOrEqual(1);
  });
});

describe("infection", () => {
  it("does not infect during the start grace window", () => {
    const rt = make();
    rt.startGame("facil");
    const human = rt.entities.find((e) => e.id === "ai1");
    const zombie = rt.entities.find((e) => e.kind === "zombie");
    zombie.x = human.x;
    zombie.y = human.y;
    rt.elapsedMs = 0;
    rt.advanceTime(16); // still inside the grace window
    expect(human.kind).toBe("human");
  });

  it("turns a touched human into a zombie once grace has passed", () => {
    const rt = make();
    rt.startGame("facil");
    const human = rt.entities.find((e) => e.id === "ai1");
    const zombie = rt.entities.find((e) => e.kind === "zombie");
    rt.elapsedMs = START_GRACE_MS + 100;
    zombie.x = human.x;
    zombie.y = human.y;
    expect(Math.hypot(human.x - zombie.x, human.y - zombie.y)).toBeLessThan(CONTACT_R);
    rt.advanceTime(16);
    expect(human.kind).toBe("zombie");
    expect(rt.snapshot().humansLeft).toBe(3);
  });
});

describe("round resolution", () => {
  it("ends with a single human standing and records a result", () => {
    const rt = make(99);
    rt.startGame("dificil");
    const s = playToEnd(rt);
    expect(s.screen).toBe("over");
    expect(s.result).not.toBeNull();
    expect(s.result.ranking).toHaveLength(4);
    // Exactly one survivor (or none, if the last two turn on the same frame).
    expect(s.humansLeft).toBeLessThanOrEqual(1);
  });

  it("ranks the player and persists a best survival time", () => {
    const rt = make(5);
    rt.startGame("normal");
    const s = playToEnd(rt);
    const player = s.result.ranking.find((r) => r.isPlayer);
    expect(player).toBeTruthy();
    expect(player.rank).toBeGreaterThanOrEqual(1);
    expect(player.rank).toBeLessThanOrEqual(4);
    expect(s.result.survivedSeconds).toBeGreaterThan(0);
  });
});

describe("movement", () => {
  it("walks the player under setMove and stays inside the fence", () => {
    const rt = make();
    rt.startGame("normal");
    const p = rt.entities[0];
    const x0 = p.x;
    rt.setMove(1, 0);
    rt.advanceTime(500);
    expect(p.x).toBeGreaterThan(x0);

    // Long push into a corner never leaves the arena.
    rt.setMove(-1, -1);
    rt.advanceTime(8000);
    expect(p.x).toBeGreaterThanOrEqual(WALL_MARGIN - 0.5);
    expect(p.y).toBeGreaterThanOrEqual(WALL_MARGIN - 0.5);
    expect(p.x).toBeLessThanOrEqual(ARENA_W - WALL_MARGIN + 0.5);
    expect(p.y).toBeLessThanOrEqual(ARENA_H - WALL_MARGIN + 0.5);
  });
});

describe("flow", () => {
  it("threads the primary action from menu into a round", () => {
    const rt = make();
    expect(rt.snapshot().screen).toBe("menu");
    rt.pressVirtualKey("Enter");
    expect(rt.snapshot().screen).toBe("playing");
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
});
