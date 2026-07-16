// The assets are procedural, which means a typo in a geometry argument is not a
// wrong pixel — it is a thrown constructor, or a silently empty mesh.  These tests
// build every asset on every tier, drive it the way the scene drives it, and throw
// it away again, so that class of mistake dies here instead of on a black canvas.

import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { TIERS } from "../engine/quality";
import { createTennisBall, createPingPongBall } from "./ball";
import { createRacket } from "./racket";
import { createPaddle } from "./paddle";
import { disposeTextures } from "./textures";

// The texture atlas draws into a <canvas>; under `environment: "node"` there is no
// DOM, so we hand it one.  three only ever holds the canvas as an image reference —
// it never reads the pixels back — so a stub is enough to exercise all of this.
beforeAll(() => {
  const ctx = new Proxy({}, {
    get(target, key) {
      if (key === "createImageData") {
        return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      }
      if (key === "createLinearGradient") return () => ({ addColorStop() {} });
      if (key in target) return target[key];
      return () => {};
    },
    set() { return true; },
  });

  globalThis.document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => ctx }),
  };
});

afterAll(() => {
  disposeTextures();
  delete globalThis.document;
});

const tiers = [TIERS.high, TIERS.medium, TIERS.low];

function vertexCount(root) {
  let total = 0;
  root.traverse((object) => {
    total += object.geometry?.attributes?.position?.count ?? 0;
  });
  return total;
}

const flying = { x: 1, y: 1.2, z: -3, vx: 30, vy: 2, vz: -25, wx: 0, wy: 40, wz: 220 };

describe.each(tiers)("assets on the $id tier", (tier) => {
  it("builds a tennis ball with felt, a seam and a shadow it can be judged by", () => {
    const ball = createTennisBall(tier);

    expect(vertexCount(ball.object3D)).toBeGreaterThan(0);
    // Low tier has no shadow map, so the ball must bring its own blob or it floats.
    expect(Boolean(ball.blob)).toBe(tier.shadows === "blob");
    expect(Boolean(ball.trail)).toBe(tier.ballTrail > 0);

    ball.dispose();
  });

  it("spins the ball at its real angular velocity", () => {
    const ball = createTennisBall(tier);
    const spinner = ball.object3D.children[0];

    expect(spinner.quaternion.w).toBeCloseTo(1, 6); // starts unrotated
    ball.update(flying, 1 / 60);
    // 220 rad/s over a 60th of a second is a big fraction of a turn: w must move a lot.
    expect(spinner.quaternion.w).toBeLessThan(0.999);

    ball.reset();
    expect(ball.object3D.children[0].quaternion.w).toBeCloseTo(1, 6);

    ball.dispose();
  });

  it("builds a ping pong ball", () => {
    const ball = createPingPongBall(tier);
    expect(vertexCount(ball.object3D)).toBeGreaterThan(0);
    ball.dispose();
  });

  it("builds a racket whose string bed follows the tier", () => {
    const racket = createRacket(tier);

    expect(vertexCount(racket.object3D)).toBeGreaterThan(0);

    const instanced = racket.object3D.children.find((child) => child.isInstancedMesh);
    if (tier.stringBed) {
      // 16 mains + 19 crosses, minus any the ellipse cuts down to nothing.
      expect(instanced).toBeDefined();
      expect(instanced.count).toBeGreaterThan(20);
      expect(instanced.count).toBeLessThanOrEqual(35);
    } else {
      expect(instanced).toBeUndefined();
    }

    racket.dispose();
  });

  it("flexes the string bed on impact and lets it settle back", () => {
    const racket = createRacket(tier);
    const bed = racket.object3D.children.find((child) => child.isInstancedMesh);

    racket.strike({ x: 0.0, y: 0.0, speed: 45, offCentre: 0 });
    racket.update(1 / 60);

    if (tier.stringBed) {
      // The strings nearest the impact must have travelled *into* the frame (-Z).
      const depths = [];
      for (let i = 0; i < bed.count; i += 1) {
        const matrix = bed.instanceMatrix.array;
        depths.push(matrix[i * 16 + 14]); // the Z translation of instance i
      }
      expect(Math.min(...depths)).toBeLessThan(0);

      // And it settles: a hundred frames later the bed is flat again.
      for (let i = 0; i < 100; i += 1) racket.update(1 / 60);
      const settled = [];
      for (let i = 0; i < bed.count; i += 1) {
        settled.push(bed.instanceMatrix.array[i * 16 + 14]);
      }
      expect(Math.min(...settled)).toBeCloseTo(0, 4);
    }

    racket.dispose();
  });

  it("builds a paddle and compresses its sponge on impact", () => {
    const paddle = createPaddle(tier);
    expect(vertexCount(paddle.object3D)).toBeGreaterThan(0);

    const front = paddle.object3D.children[2];
    const rest = front.position.z;

    paddle.strike({ speed: 28, offCentre: 0 });
    paddle.update(1 / 60);
    expect(front.position.z).toBeLessThan(rest); // the sheet dishes inward

    for (let i = 0; i < 100; i += 1) paddle.update(1 / 60);
    expect(front.position.z).toBeCloseTo(rest, 4);

    paddle.dispose();
  });
});

describe("off-centre contact", () => {
  it("flexes the strings less than a clean one, because less energy arrives", () => {
    const clean = createRacket(TIERS.high);
    const shanked = createRacket(TIERS.high);

    clean.strike({ x: 0, y: 0, speed: 45, offCentre: 0 });
    shanked.strike({ x: 0, y: 0, speed: 45, offCentre: 0.09 });
    clean.update(1 / 60);
    shanked.update(1 / 60);

    const depthOf = (racket) => {
      const bed = racket.object3D.children.find((child) => child.isInstancedMesh);
      let min = 0;
      for (let i = 0; i < bed.count; i += 1) {
        min = Math.min(min, bed.instanceMatrix.array[i * 16 + 14]);
      }
      return min;
    };

    expect(depthOf(shanked)).toBeGreaterThan(depthOf(clean));

    clean.dispose();
    shanked.dispose();
  });
});
