import { describe, it, expect } from "vitest";
import { createAiConfig, chooseTargetHole, stepToward } from "./ai.js";
import { createHoles, createMole, stepMole, makeRng, RISE_MS } from "./moles.js";

// Build a holes array and pop a mole of `type` in a given hole so it is whackable.
function holesWith(popped) {
  const holes = createHoles();
  for (const { index, type } of popped) {
    let m = createMole(type, 2000);
    m = stepMole(m, RISE_MS / 1000); // finish rising → whackable
    holes[index].mole = m;
  }
  return holes;
}

describe("createAiConfig", () => {
  it("returns knobs per difficulty and falls back to medium", () => {
    expect(createAiConfig("hard").id).toBe("hard");
    expect(createAiConfig("nope").id).toBe("medium");
  });
});

describe("chooseTargetHole", () => {
  it("prefers the higher-value mole", () => {
    const holes = holesWith([
      { index: 0, type: "brown" },
      { index: 15, type: "gold" },
    ]);
    // Mascot centred; gold is worth chasing even if a touch farther.
    const target = chooseTargetHole({ x: 0, z: 250 }, holes, createAiConfig("hard"), makeRng(1));
    expect(holes[target].mole.type).toBe("gold");
  });

  it("avoids the bomb on a competent difficulty", () => {
    const holes = holesWith([
      { index: 5, type: "bomb" },
      { index: 9, type: "brown" },
    ]);
    let bombPicks = 0;
    for (let s = 0; s < 40; s += 1) {
      const t = chooseTargetHole({ x: 0, z: 250 }, holes, createAiConfig("hard"), makeRng(s + 1));
      if (holes[t]?.mole?.type === "bomb") bombPicks += 1;
    }
    expect(bombPicks).toBe(0);
  });

  it("returns -1 when nothing is whackable", () => {
    const holes = createHoles();
    expect(chooseTargetHole({ x: 0, z: 250 }, holes, createAiConfig("medium"), makeRng(1))).toBe(-1);
  });
});

describe("stepToward", () => {
  it("advances toward the target without overshooting", () => {
    const next = stepToward({ x: 0, z: 0 }, { x: 100, z: 0 }, 158, 1 / 60);
    expect(next.x).toBeGreaterThan(0);
    expect(next.x).toBeLessThan(100);
  });

  it("snaps to the target when within reach", () => {
    expect(stepToward({ x: 99.9, z: 0 }, { x: 100, z: 0 }, 158, 1 / 60)).toEqual({ x: 100, z: 0 });
  });
});
