import { describe, expect, it } from "vitest";
import * as P from "./physics.js";

// ─── Reference oracle ────────────────────────────────────────────────────────
// A literal transcription of the reference project's Ball (shresthalucky/PingPong,
// src/scripts/components/ball.js), kept in its own coordinate convention. The
// port in physics.js must reproduce it step for step; these tests are the lock.
// Do not "fix" anything in here — its quirks are the behaviour we ported.

const HALF = 640; // stands in for the reference's HALF_CANVAS_WIDTH
const ENV = { gravity: 9.82, toRadian: (d) => (d * Math.PI) / 180 };
const C = {
  BOARD_LEFT_X: HALF - 400,
  BOARD_RIGHT_X: HALF + 400,
  BOARD_Y: -300,
  BOARD_Z: 160,
  BOARD_END: 1120,
  BALL_MAX_RADIUS: 14,
  BALL_ANGLE: ENV.toRadian(30),
  BALL_INITAL_VEL: 100,
  TIME: 0.25,
  SERVE_ANGLE: ENV.toRadian(-50),
};

class Pos {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  get3dDistance(p) {
    const x = this.x - p.x;
    const y = this.y - p.y;
    const z = this.z - p.z;
    return Math.sqrt(x * x + y * y + z * z);
  }
}

class RefBall {
  constructor(startPos) {
    this.initial3dPos = new Pos(startPos.x, startPos.y, startPos.z);
    this.current3dPos = new Pos(startPos.x, startPos.y, startPos.z);
    this.angle = C.BALL_ANGLE;
    this.initialVel = C.BALL_INITAL_VEL;
    this.velocity = { z: this.initialVel * Math.cos(this.angle), y: 0, x: 0 };
    this.time = 0;
    this.rebound = false;
    this.lastPosition = new Pos(startPos.x, startPos.y, startPos.z);
    this.bounceCount = 0;
    this.bounceLevel = -C.BOARD_Y;
  }
  isBallInside() {
    if (
      this.current3dPos.x <= C.BOARD_RIGHT_X + C.BALL_MAX_RADIUS &&
      this.current3dPos.x >= C.BOARD_LEFT_X - C.BALL_MAX_RADIUS &&
      this.current3dPos.z <= C.BOARD_END + C.BALL_MAX_RADIUS &&
      this.current3dPos.z >= C.BOARD_Z - C.BALL_MAX_RADIUS
    ) {
      this.bounceLevel = -C.BOARD_Y;
      return true;
    }
    this.bounceLevel = 0;
    return false;
  }
  getBounceAngle() {
    const d = this.lastPosition.get3dDistance(this.current3dPos);
    const dx = this.current3dPos.get3dDistance(
      new Pos(this.lastPosition.x, 0, this.lastPosition.z),
    );
    return Math.atan(d / dx);
  }
  bounce() {
    this.isBallInside(); // the reference resolves this in draw(), each frame
    if (!this.rebound) {
      this.lastPosition = new Pos(this.current3dPos.x, this.current3dPos.y, this.current3dPos.z);
      this.current3dPos.z = this.initial3dPos.z + this.velocity.z * this.time;
      if (this.velocity.x !== 0) this.current3dPos.x += this.velocity.x * 10;
      const vy = this.initialVel * Math.sin(this.angle);
      this.velocity.y = vy - ENV.gravity * this.time;
      this.current3dPos.y =
        -this.initial3dPos.y + vy * this.time - ENV.gravity * this.time * this.time * 0.5;
      if (this.current3dPos.y < this.bounceLevel) this.rebound = true;
      this.time += C.TIME;
    } else {
      this.initialVel = -this.velocity.y;
      this.initial3dPos.z = this.current3dPos.z;
      this.current3dPos.y = -this.bounceLevel;
      this.initial3dPos.y = -this.bounceLevel;
      this.rebound = false;
      this.time = 0;
      this.angle = this.getBounceAngle();
      this.bounceCount++;
    }
  }
  serve(velocity, sideAngle) {
    this.initialVel = Math.abs(velocity);
    this.velocity.x = sideAngle ? (sideAngle > 0 ? Math.cos(sideAngle) : -Math.cos(sideAngle)) : 0;
    this.angle = C.SERVE_ANGLE;
    this.velocity.z = velocity * Math.cos(C.SERVE_ANGLE);
  }
  hit(isUser, velocity, sideAngle, upAngle, fromZ) {
    this.angle = ENV.toRadian(upAngle);
    this.initialVel = velocity;
    let offsetZ;
    let v;
    if (isUser) {
      offsetZ = fromZ + 10;
      v = this.initialVel;
      this.velocity.x = sideAngle > 0 ? Math.cos(sideAngle) : -Math.cos(sideAngle);
    } else {
      offsetZ = fromZ - 10;
      v = -this.initialVel;
      this.velocity.x = 0;
    }
    this.initial3dPos = new Pos(this.current3dPos.x, -this.current3dPos.y, offsetZ);
    this.current3dPos = new Pos(this.current3dPos.x, -this.current3dPos.y, offsetZ);
    this.velocity.z = v * Math.cos(this.angle);
    this.time = 0;
    this.bounceCount = 0;
  }
}

// physics.js keeps y positive-up at all times; the reference stores -bounceLevel
// on the frame it rebounds. Map ours onto theirs to compare like for like.
const asRefY = (ball, justBounced) => (justBounced ? -ball.bounceLevel : ball.y);

function runParity(refBall, myBall, steps) {
  let maxDiff = 0;
  for (let i = 0; i < steps; i++) {
    refBall.bounce();
    const before = myBall.bounceCount;
    myBall = P.stepBall(myBall);
    const justBounced = myBall.bounceCount > before;
    maxDiff = Math.max(
      maxDiff,
      Math.abs(refBall.current3dPos.x - HALF - myBall.x),
      Math.abs(refBall.current3dPos.y - asRefY(myBall, justBounced)),
      Math.abs(refBall.current3dPos.z - myBall.z),
    );
  }
  return { maxDiff, refBounces: refBall.bounceCount, myBounces: myBall.bounceCount };
}

describe("ping-pong physics — parity with the reference implementation", () => {
  it("matches the reference on a serve, step for step", () => {
    const ref = new RefBall(new Pos(HALF, -P.BAT_REST_Y, P.BOARD_Z));
    ref.serve(P.VELOCITY, 0);
    let mine = P.createBall({ x: 0, y: P.BAT_REST_Y, z: P.BOARD_Z });
    mine = P.serveBallShot(mine, P.VELOCITY, 0);

    const { maxDiff, refBounces, myBounces } = runParity(ref, mine, 150);
    expect(maxDiff).toBeLessThan(1e-9);
    expect(myBounces).toBe(refBounces);
    expect(refBounces).toBeGreaterThan(0);
  });

  it("matches the reference on an opponent drive", () => {
    const ref = new RefBall(new Pos(HALF, 0, P.OPPONENT_Z));
    ref.current3dPos.y = 420;
    ref.initial3dPos.y = 420;
    ref.hit(false, P.VELOCITY, 0, P.UP_ANGLE, P.OPPONENT_Z);
    let mine = P.createBall({ x: 0, y: 420, z: P.OPPONENT_Z });
    mine = P.hitBall(mine, {
      side: "opponent",
      velocity: P.VELOCITY,
      sideAngle: 0,
      upAngle: P.UP_ANGLE,
      fromZ: P.OPPONENT_Z,
    });

    const { maxDiff, refBounces, myBounces } = runParity(ref, mine, 150);
    expect(maxDiff).toBeLessThan(1e-9);
    expect(myBounces).toBe(refBounces);
  });

  it("matches the reference on a player drive with lateral drift", () => {
    const ref = new RefBall(new Pos(HALF, 0, P.BOARD_Z));
    ref.current3dPos.y = 420;
    ref.initial3dPos.y = 420;
    ref.hit(true, 70, 0.5, 45, P.BOARD_Z);
    let mine = P.createBall({ x: 0, y: 420, z: P.BOARD_Z });
    mine = P.hitBall(mine, {
      side: "player",
      velocity: 70,
      sideAngle: 0.5,
      upAngle: 45,
      fromZ: P.BOARD_Z,
    });

    const { maxDiff, refBounces, myBounces } = runParity(ref, mine, 150);
    expect(maxDiff).toBeLessThan(1e-9);
    expect(myBounces).toBe(refBounces);
  });
});

describe("ping-pong physics — bounce behaviour", () => {
  it("kicks the ball back up off the table instead of letting it die", () => {
    // The reference's bounce angle comes out steep (~63 deg) because it measures
    // the contact height in render space. Guard that: a ball dropped onto the
    // table must leave it with real height, not roll along the surface.
    let b = P.createBall({ x: 0, y: P.BAT_REST_Y, z: P.BOARD_Z + 100 });
    b = P.serveBallShot(b, P.VELOCITY, 0);
    let bounced = false;
    let peakAfterBounce = -Infinity;
    for (let i = 0; i < 40; i++) {
      const before = b.bounceCount;
      b = P.stepBall(b);
      if (b.bounceCount > before) bounced = true;
      else if (bounced) peakAfterBounce = Math.max(peakAfterBounce, b.y - P.TABLE_TOP_Y);
    }
    expect(bounced).toBe(true);
    expect(peakAfterBounce).toBeGreaterThan(20);
  });

  it("bounces off the table over the table and off the floor beyond it", () => {
    expect(P.bounceLevelFor(P.createBall({ x: 0, y: 400, z: P.NET_Z }))).toBe(P.TABLE_TOP_Y);
    expect(P.bounceLevelFor(P.createBall({ x: 2000, y: 400, z: P.NET_Z }))).toBe(P.FLOOR_Y);
  });

  it("ends the point once the ball leaves the arena", () => {
    expect(P.ballOut(P.createBall({ x: 0, y: 400, z: P.NET_Z }))).toBe(false);
    expect(P.ballOut(P.createBall({ x: 0, y: 400, z: P.END_WALL + 1 }))).toBe(true);
    expect(P.ballOut(P.createBall({ x: P.RIGHT_WALL + 1, y: 400, z: P.NET_Z }))).toBe(true);
  });
});

describe("ping-pong physics — net", () => {
  it("catches a ball crossing below the net tape", () => {
    const prev = P.createBall({ x: 0, y: P.TABLE_TOP_Y + 40, z: P.NET_Z - 30 });
    const next = P.createBall({ x: 0, y: P.TABLE_TOP_Y + 38, z: P.NET_Z + 30 });
    expect(P.crossesNet(prev, next)).toBe(true);
  });

  it("lets a ball clear the net tape", () => {
    const prev = P.createBall({ x: 0, y: P.TABLE_TOP_Y + P.NET_HEIGHT + 40, z: P.NET_Z - 30 });
    const next = P.createBall({ x: 0, y: P.TABLE_TOP_Y + P.NET_HEIGHT + 38, z: P.NET_Z + 30 });
    expect(P.crossesNet(prev, next)).toBe(false);
  });

  it("does not fire when the ball stays on one side", () => {
    const prev = P.createBall({ x: 0, y: P.TABLE_TOP_Y + 10, z: P.NET_Z - 60 });
    const next = P.createBall({ x: 0, y: P.TABLE_TOP_Y + 10, z: P.NET_Z - 30 });
    expect(P.crossesNet(prev, next)).toBe(false);
  });
});

describe("ping-pong camera — reproduces the reference's framing", () => {
  it("degenerates to the reference's own focal and height at its native size", () => {
    // The reference runs fullscreen with focal 500 and camera height = canvas
    // height. At 1280x800 the derivation must land back on exactly that.
    const cam = P.createCamera(1280, 800);
    expect(cam.focal).toBeCloseTo(500, 0);
    expect(cam.camY).toBeCloseTo(800, 0);
  });

  const VIEWPORTS = [
    [1280, 800],
    [733, 412],
    [960, 540],
    [1280, 720],
    [360, 320],
  ];

  for (const [vW, vH] of VIEWPORTS) {
    it(`keeps the reference's table proportions at ${vW}x${vH}`, () => {
      const cam = P.createCamera(vW, vH);
      const near = P.project3D(cam, 0, P.TABLE_TOP_Y, P.BOARD_Z);
      const far = P.project3D(cam, 0, P.TABLE_TOP_Y, P.BOARD_END);
      const left = P.project3D(cam, -P.BOARD_HALF_WIDTH, P.TABLE_TOP_Y, P.BOARD_Z);
      const right = P.project3D(cam, P.BOARD_HALF_WIDTH, P.TABLE_TOP_Y, P.BOARD_Z);

      // Native proportions measured off the reference at 1280x800.
      expect(near.sy / vH).toBeCloseTo(0.679, 2);
      expect(far.sy / vH).toBeCloseTo(0.22, 2);
      expect((right.sx - left.sx) / vW).toBeCloseTo(0.68, 2);

      // And it all has to actually be on the canvas.
      for (const q of [near, far, left, right]) {
        expect(q.visible).toBe(true);
        expect(q.sy).toBeGreaterThanOrEqual(0);
        expect(q.sy).toBeLessThanOrEqual(vH);
        expect(q.sx).toBeGreaterThanOrEqual(0);
        expect(q.sx).toBeLessThanOrEqual(vW);
      }
    });
  }

  it("round-trips a screen point back to the bat plane", () => {
    const cam = P.createCamera(1280, 800);
    const world = { x: 120, z: P.PLAYER_Z };
    const q = P.project3D(cam, world.x, P.BAT_REST_Y, world.z);
    const back = P.unproject(cam, q.sx, q.sy, P.BAT_REST_Y);
    expect(back.x).toBeCloseTo(world.x, 4);
    expect(back.z).toBeCloseTo(world.z, 4);
  });
});
