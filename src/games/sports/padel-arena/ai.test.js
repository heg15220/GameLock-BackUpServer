import { describe, it, expect } from "vitest";
import {
  createAiConfig,
  makeRng,
  predictAtZ,
  predictLanding,
  desiredPosition,
  stepToward,
  chooseShot,
  readFormation,
} from "./ai.js";
import { createBall, launchToTarget, HALF_W, NET_Z, FAR_Z } from "./physics.js";

describe("createAiConfig", () => {
  it("returns knobs per difficulty and falls back to medium", () => {
    expect(createAiConfig("hard").id).toBe("hard");
    expect(createAiConfig("nope").id).toBe("medium");
  });
});

describe("predictAtZ / predictLanding", () => {
  it("predicts where a struck ball crosses a target z-plane", () => {
    let b = createBall({ x: 0, y: 40, z: 60 });
    b = launchToTarget(b, { targetX: 60, targetZ: 620, flight: 0.8, team: "home" });
    const at = predictAtZ(b, 600);
    expect(at.reachable).toBe(true);
    expect(at.x).toBeGreaterThan(20); // drifting toward +x
  });

  it("predicts a landing spot inside the far court", () => {
    let b = createBall({ x: 0, y: 40, z: 60 });
    b = launchToTarget(b, { targetX: -50, targetZ: 600, flight: 0.8, team: "home" });
    const land = predictLanding(b);
    expect(land.z).toBeGreaterThan(NET_Z);
    expect(land.z).toBeLessThanOrEqual(FAR_Z + 5);
  });
});

describe("desiredPosition", () => {
  it("moves an away player to intercept a ball landing in its column", () => {
    let b = createBall({ x: 80, y: 40, z: 60 });
    b = launchToTarget(b, { targetX: 90, targetZ: 620, flight: 0.8, team: "home" });
    const player = { x: 100, z: FAR_Z - 40, column: 1, team: "away" };
    const target = desiredPosition(player, b, createAiConfig("hard"));
    expect(target.x).toBeGreaterThan(0); // toward the +x column
    expect(target.z).toBeGreaterThan(NET_Z);
  });

  it("holds a resting column position when the ball is dead", () => {
    const b = createBall({ live: false, vz: 0 });
    const player = { x: 0, z: FAR_Z - 40, column: -1, team: "away" };
    const target = desiredPosition(player, b, createAiConfig("medium"));
    expect(target.x).toBeLessThan(0); // rests in its (-1) column
  });
});

describe("stepToward", () => {
  it("advances toward the target without overshooting", () => {
    const next = stepToward({ x: 0, z: 0 }, { x: 100, z: 0 }, 250, 1 / 60);
    expect(next.x).toBeGreaterThan(0);
    expect(next.x).toBeLessThan(100);
  });

  it("snaps to the target when within reach", () => {
    const next = stepToward({ x: 99.9, z: 0 }, { x: 100, z: 0 }, 250, 1 / 60);
    expect(next).toEqual({ x: 100, z: 0 });
  });
});

describe("chooseShot", () => {
  it("aims into the opponent court within bounds", () => {
    const rng = makeRng(42);
    const shot = chooseShot(createAiConfig("hard"), rng, {
      hitter: { x: 0, z: 60 },
      ballY: 60,
      hitterTeam: "home",
      opponents: [
        { x: -60, z: FAR_Z - 40 },
        { x: 60, z: FAR_Z - 40 },
      ],
    });
    expect(shot.targetZ).toBeGreaterThan(NET_Z);
    expect(Math.abs(shot.targetX)).toBeLessThanOrEqual(HALF_W);
    expect(["drive", "lob", "smash", "vibora", "bandeja", "volea", "dejada", "defensive"]).toContain(shot.kind);
    expect(typeof shot.spin).toBe("number");
  });

  it("is deterministic for a seeded rng", () => {
    const ctx = {
      hitter: { x: 0, z: 60 },
      ballY: 60,
      hitterTeam: "home",
      opponents: [
        { x: -60, z: FAR_Z - 40 },
        { x: 60, z: FAR_Z - 40 },
      ],
    };
    const a = chooseShot(createAiConfig("medium"), makeRng(7), ctx);
    const b = chooseShot(createAiConfig("medium"), makeRng(7), ctx);
    expect(a).toEqual(b);
  });

  it("attaches spin matching the chosen shot", () => {
    const shot = chooseShot(createAiConfig("hard"), makeRng(3), {
      hitter: { x: 0, z: 60 },
      ballY: 40,
      hitterTeam: "home",
      opponents: [
        { x: -60, z: FAR_Z - 40 },
        { x: 60, z: FAR_Z - 40 },
      ],
    });
    expect(typeof shot.spin).toBe("number");
    expect(shot.spin).not.toBeNaN();
  });

  it("lobs over rivals who are both at the net (at least sometimes)", () => {
    // Both opponents crowding the far net; a back-court hitter should lob over them.
    const ctx = {
      hitter: { x: 0, z: 80 },
      ballY: 45,
      nearNet: false,
      hitterTeam: "home",
      opponents: [
        { x: -70, z: NET_Z + 60 },
        { x: 70, z: NET_Z + 60 },
      ],
    };
    let lobs = 0;
    for (let s = 0; s < 40; s++) {
      if (chooseShot(createAiConfig("hard"), makeRng(s + 1), ctx).kind === "lob") lobs++;
    }
    expect(lobs).toBeGreaterThan(0);
  });
});

describe("readFormation", () => {
  it("classifies both-at-net, both-back and split formations", () => {
    const bothNet = readFormation([{ z: NET_Z + 40 }, { z: NET_Z + 70 }], true);
    expect(bothNet.bothNet).toBe(true);
    const bothBack = readFormation([{ z: FAR_Z - 30 }, { z: FAR_Z - 60 }], true);
    expect(bothBack.bothBack).toBe(true);
    const split = readFormation([{ z: NET_Z + 40 }, { z: FAR_Z - 40 }], true);
    expect(split.split).toBe(true);
  });
});
