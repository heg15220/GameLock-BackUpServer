import { describe, it, expect } from "vitest";
import {
  createBall,
  stepBall,
  bounceFloor,
  bounceGlass,
  crossesNet,
  evaluateFault,
  launchToTarget,
  createCamera,
  project3D,
  sideOfZ,
  GRAVITY,
  HALF_W,
  NET_Z,
  NET_HEIGHT,
  FAR_Z,
  BALL_R,
} from "./physics.js";

describe("stepBall", () => {
  it("applies gravity to vertical velocity", () => {
    const b = createBall({ y: 100, vy: 0 });
    const next = stepBall(b, 1 / 60);
    expect(next.vy).toBeLessThan(0);
    expect(next.y).toBeLessThan(100);
  });

  it("advances position along its velocity", () => {
    const b = createBall({ x: 0, z: 100, vx: 60, vz: 120, vy: 0 });
    const next = stepBall(b, 0.5);
    expect(next.x).toBeGreaterThan(0);
    expect(next.z).toBeGreaterThan(100);
  });
});

describe("bounceFloor", () => {
  it("reverses and damps vertical velocity and counts the bounce", () => {
    const b = createBall({ y: 0, vy: -200, floorBounces: 0 });
    const next = bounceFloor(b);
    expect(next.vy).toBeGreaterThan(0);
    expect(next.vy).toBeLessThan(200);
    expect(next.floorBounces).toBe(1);
    expect(next.y).toBe(BALL_R);
  });
});

describe("spin", () => {
  it("topspin bounces lower and kicks forward more than backspin", () => {
    const base = { y: 0, vy: -200, vz: 300, floorBounces: 0 };
    const top = bounceFloor(createBall({ ...base, spin: 0.7 }));
    const back = bounceFloor(createBall({ ...base, spin: -0.7 }));
    expect(top.vy).toBeLessThan(back.vy); // topspin rebota más bajo
    expect(top.vz).toBeGreaterThan(back.vz); // topspin avanza más rápido
  });

  it("heavy backspin checks the ball's forward speed on the bounce", () => {
    const flat = bounceFloor(createBall({ y: 0, vy: -200, vz: 300, spin: 0 }));
    const drop = bounceFloor(createBall({ y: 0, vy: -200, vz: 300, spin: -0.85 }));
    expect(drop.vz).toBeLessThan(flat.vz);
  });

  it("topspin makes the ball dip faster in the air (Magnus)", () => {
    const shot = { x: 0, y: 100, z: 0, vx: 0, vy: 0, vz: 600 };
    let top = createBall({ ...shot, spin: 0.9 });
    let back = createBall({ ...shot, spin: -0.9 });
    for (let i = 0; i < 30; i++) {
      top = stepBall(top, 1 / 60);
      back = stepBall(back, 1 / 60);
    }
    expect(top.y).toBeLessThan(back.y); // el liftado ha caído más
  });

  it("spin decays as the ball flies", () => {
    let b = createBall({ vz: 500, spin: 1 });
    for (let i = 0; i < 30; i++) b = stepBall(b, 1 / 60);
    expect(Math.abs(b.spin)).toBeLessThan(1);
  });
});

describe("bounceGlass", () => {
  it("reflects the x component off a side wall and keeps the point alive", () => {
    const b = createBall({ x: HALF_W, vx: 150, glassHits: 0 });
    const next = bounceGlass(b, "x", HALF_W);
    expect(next.vx).toBeLessThan(0);
    expect(next.glassHits).toBe(1);
    expect(next.x).toBeLessThan(HALF_W);
  });

  it("reflects the z component off a back wall", () => {
    const b = createBall({ z: FAR_Z, vz: 200 });
    const next = bounceGlass(b, "z", FAR_Z);
    expect(next.vz).toBeLessThan(0);
  });
});

describe("crossesNet", () => {
  it("detects a low ball hitting the net", () => {
    const prev = createBall({ z: NET_Z - 5, y: NET_HEIGHT - 5, x: 0 });
    const next = createBall({ z: NET_Z + 5, y: NET_HEIGHT - 5, x: 0 });
    expect(crossesNet(prev, next)).toBe(true);
  });

  it("lets a ball that clears the net through", () => {
    const prev = createBall({ z: NET_Z - 5, y: NET_HEIGHT + 40, x: 0 });
    const next = createBall({ z: NET_Z + 5, y: NET_HEIGHT + 40, x: 0 });
    expect(crossesNet(prev, next)).toBe(false);
  });
});

describe("evaluateFault", () => {
  it("awards the point to the last hitter on a double bounce", () => {
    const b = createBall({ owner: "home", floorBounces: 2 });
    expect(evaluateFault(b)).toEqual({ scorer: "home", reason: "double-bounce" });
  });

  it("returns null while the ball is still in play", () => {
    const b = createBall({ owner: "home", floorBounces: 1 });
    expect(evaluateFault(b)).toBeNull();
  });
});

describe("launchToTarget", () => {
  it("lands the ball on the target after the flight time", () => {
    let b = createBall({ x: 0, y: NET_HEIGHT, z: 60 });
    b = launchToTarget(b, { targetX: 80, targetZ: 600, flight: 0.8, team: "home" });
    // Simulate the flight and check it reaches near the target on the floor.
    let minDist = Infinity;
    for (let i = 0; i < 200; i++) {
      b = stepBall(b, 1 / 60);
      if (b.y <= BALL_R && b.vy < 0) {
        minDist = Math.hypot(b.x - 80, b.z - 600);
        break;
      }
    }
    expect(minDist).toBeLessThan(40);
  });

  it("clears the net on a low, long, flat shot (AI return from the back)", () => {
    // Away hitter deep in the far court, ball near the ground, driving flat toward
    // the near court. A naive parabola landing on target would dip below the net;
    // launchToTarget must raise the arc so it clears the tape.
    let b = createBall({ x: 0, y: 8, z: FAR_Z - 40 });
    b = launchToTarget(b, { targetX: 0, targetZ: 60, flight: 0.6, team: "away" });
    let clearedAt = null;
    let prev = b;
    for (let i = 0; i < 300; i++) {
      const next = stepBall(b, 1 / 60);
      if ((prev.z - NET_Z) * (next.z - NET_Z) <= 0 && clearedAt === null) {
        const f = (NET_Z - prev.z) / (next.z - prev.z || 1);
        clearedAt = prev.y + (next.y - prev.y) * f;
      }
      prev = next;
      b = next;
    }
    expect(clearedAt).not.toBeNull();
    expect(clearedAt).toBeGreaterThan(NET_HEIGHT);
  });

  it("tags the ball with the hitting team and resets bounce counters", () => {
    const b = launchToTarget(createBall({ floorBounces: 1 }), {
      targetX: 0,
      targetZ: 500,
      flight: 0.6,
      team: "away",
    });
    expect(b.owner).toBe("away");
    expect(b.floorBounces).toBe(0);
    expect(b.live).toBe(true);
  });
});

describe("projection", () => {
  it("projects farther points smaller than nearer ones", () => {
    const cam = createCamera(960, 540);
    const near = project3D(cam, 0, 0, 0);
    const far = project3D(cam, 0, 0, FAR_Z);
    expect(near.scale).toBeGreaterThan(far.scale);
    expect(far.sy).toBeLessThan(near.sy); // farther appears higher on screen
  });

  it("keeps the court centred horizontally", () => {
    const cam = createCamera(960, 540);
    const p = project3D(cam, 0, 0, NET_Z);
    expect(p.sx).toBeCloseTo(480, 0);
  });

  it("zooms in on a narrow (mobile) viewport so the court is larger", () => {
    const desktop = createCamera(960, 540);
    const mobile = createCamera(360, 202); // ~16:9 phone canvas
    // The net line spans wider on screen relative to the viewport on mobile (zoomed).
    const dLeft = project3D(desktop, -HALF_W, 0, NET_Z).sx / desktop.viewW;
    const dRight = project3D(desktop, HALF_W, 0, NET_Z).sx / desktop.viewW;
    const mLeft = project3D(mobile, -HALF_W, 0, NET_Z).sx / mobile.viewW;
    const mRight = project3D(mobile, HALF_W, 0, NET_Z).sx / mobile.viewW;
    expect(mRight - mLeft).toBeGreaterThan(dRight - dLeft);
    // The near baseline stays anchored near the bottom (players not cropped).
    const nearY = project3D(mobile, 0, 0, 0).sy;
    expect(nearY).toBeGreaterThan(202 * 0.8);
    expect(nearY).toBeLessThan(202);
  });
});

describe("sideOfZ", () => {
  it("splits the court at the net", () => {
    expect(sideOfZ(NET_Z - 10)).toBe("near");
    expect(sideOfZ(NET_Z + 10)).toBe("far");
  });
});
