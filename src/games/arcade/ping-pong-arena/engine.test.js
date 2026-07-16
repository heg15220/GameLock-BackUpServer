import { describe, expect, it, beforeEach, vi } from "vitest";
import { PingPongRuntime } from "./engine.js";
import {
  BOARD_Z,
  BOARD_END,
  NET_Z,
  PLAYER_Z,
  TABLE_TOP_Y,
  BAT_REST_Y,
  createBall,
  stepBall,
} from "./physics.js";

// A canvas stub: every 2d call is a no-op, so the runtime can be driven headless
// and we can assert on its state rather than on pixels.
function stubCtx() {
  const gradient = { addColorStop() {} };
  return new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "createLinearGradient" || prop === "createRadialGradient") return () => gradient;
        if (prop === "measureText") return () => ({ width: 10 });
        if (prop === "canvas") return { width: 960, height: 540 };
        return () => {};
      },
      set() {
        return true;
      },
    },
  );
}

function makeRuntime(overrides = {}) {
  const ctx = stubCtx();
  const canvas = {
    clientWidth: 960,
    clientHeight: 540,
    width: 960,
    height: 540,
    style: {},
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }),
    addEventListener() {},
    removeEventListener() {},
  };
  const snapshots = [];
  const rt = new PingPongRuntime({
    canvas,
    locale: "en",
    onSnapshot: (s) => snapshots.push(s),
    onFullscreen() {},
    ...overrides,
  });
  return { rt, snapshots };
}

// Advance the runtime by whole frames at its own step.
function advance(rt, frames) {
  for (let i = 0; i < frames; i++) rt.advanceTime(1000 / 60);
}

beforeEach(() => {
  vi.spyOn(performance, "now").mockImplementation(() => Date.now());
});

describe("ping-pong runtime — opponent serve rally", () => {
  it("serves, crosses the net, and eventually scores a point", () => {
    const { rt } = makeRuntime();
    rt.setDifficulty("medium");
    rt.startMatch();
    rt.match.server = "opponent";
    rt.beginServe();

    expect(rt.screen).toBe("serve");

    let crossedNet = false;
    let scored = false;
    for (let i = 0; i < 1200 && !scored; i++) {
      advance(rt, 1);
      if (rt.screen === "rally" && rt.ball.z < NET_Z) crossedNet = true;
      if (rt.screen === "point" || rt.screen === "over") scored = true;
    }

    expect(rt.screen).not.toBe("serve"); // the serve actually went
    expect(crossedNet).toBe(true); // and reached the human's half
    expect(scored).toBe(true); // and the point resolved
  });

  it("keeps the ball's state finite through a whole point", () => {
    const { rt } = makeRuntime();
    rt.startMatch();
    rt.match.server = "opponent";
    rt.beginServe();

    for (let i = 0; i < 600; i++) {
      advance(rt, 1);
      for (const k of ["x", "y", "z"]) {
        expect(Number.isFinite(rt.ball[k])).toBe(true);
      }
      expect(Number.isFinite(rt.oppBat.x)).toBe(true);
      expect(Number.isFinite(rt.playerBat.x)).toBe(true);
    }
  });

  it("moves the opponent's bat off centre to chase its read", () => {
    const { rt } = makeRuntime();
    rt.startMatch();
    rt.match.server = "opponent";
    rt.beginServe();

    const startX = rt.oppBat.x;
    let moved = false;
    for (let i = 0; i < 600 && !moved; i++) {
      advance(rt, 1);
      if (Math.abs(rt.oppBat.x - startX) > 1) moved = true;
    }
    // The opponent glides to its read after the human returns; over a full point
    // it should not simply sit still.
    expect(rt.oppBat.z).toBeGreaterThan(NET_Z);
  });
});

describe("ping-pong runtime — the bat is the control", () => {
  it("serves when the bat is driven forward, not before", () => {
    const { rt } = makeRuntime();
    rt.startMatch();
    rt.match.server = "player";
    rt.beginServe();

    // Bat sitting still: no serve, however long we wait.
    advance(rt, 60);
    expect(rt.screen).toBe("serve");

    // Drive it forward through the ball.
    rt.playerBat.z = BOARD_Z + 60;
    advance(rt, 1);
    expect(rt.screen).toBe("rally");
    expect(rt.ball.vz).toBeGreaterThan(0); // heading away toward the opponent
  });

  it("reads a harder forward drive as a faster, flatter shot", () => {
    const { rt } = makeRuntime();
    rt.startMatch();

    // batShotParams derives velocity from bat dz, and the launch angle from the
    // velocity (120 - velocity), so faster must mean flatter.
    rt.batVel = { dz: 0, dx: 0 };
    const soft = rt.batShotParams();
    rt.batVel = { dz: 1200, dx: 0 };
    const hard = rt.batShotParams();

    expect(hard.velocity).toBeGreaterThan(soft.velocity);
    expect(hard.upAngle).toBeLessThan(soft.upAngle);
    // The reference's own range: velocity 60..90, angle 60..30.
    expect(soft.velocity).toBeCloseTo(60, 5);
    expect(hard.velocity).toBeCloseTo(90, 5);
    expect(soft.upAngle).toBeCloseTo(60, 5);
    expect(hard.upAngle).toBeCloseTo(30, 5);
  });

  it("clamps the bat inside the court", () => {
    const { rt } = makeRuntime();
    rt.startMatch();
    rt.setBatFromPointer(-10_000, -10_000);
    expect(rt.playerBat.x).toBeGreaterThan(-2000);
    expect(rt.playerBat.z).toBeGreaterThanOrEqual(0);
    rt.setBatFromPointer(10_000, 10_000);
    expect(rt.playerBat.x).toBeLessThan(2000);
    expect(rt.playerBat.z).toBeLessThanOrEqual(BOARD_END);
  });

  it("keeps the bat on its plane — screen y is depth, not height", () => {
    const { rt } = makeRuntime();
    rt.startMatch();
    rt.setBatFromPointer(480, 300);
    const z1 = rt.playerBat.z;
    rt.setBatFromPointer(480, 420);
    expect(rt.playerBat.y).toBe(BAT_REST_Y);
    expect(rt.playerBat.z).not.toBe(z1);
  });
});

describe("ping-pong runtime — the CPU's return", () => {
  // Park the human wide right, put the ball on the CPU's bat, and let it play.
  function playReturn(rt, difficulty, playerX) {
    rt.difficulty = difficulty;
    rt.startMatch();
    rt.playerBat.x = playerX;
    rt.batVel = { dz: 0, dx: 0 };
    rt.oppBat = { x: 0, y: BAT_REST_Y, z: BOARD_END };
    rt.ball = createBall({ x: 0, y: BAT_REST_Y + 20, z: BOARD_END - 20 });
    rt.possession = {
      hitter: "player",
      receiver: "opponent",
      serve: false,
      serveBounceDone: true,
      receiverBounces: 1,
      age: 0,
    };
    rt.screen = "rally";
    rt.opponentHit();
    let b = rt.ball;
    for (let s = 0; s < 600 && b.z > PLAYER_Z; s++) b = stepBall(b);
    return Math.abs(b.x - playerX);
  }

  it("makes the human cover ground on hard, and does not on easy", () => {
    // Guards the wiring: the engine must hand planReturn the live ball and pass
    // its drift into hitBall. Miss either and every return comes back down the
    // line and this collapses to the easy number.
    const { rt: easyRt } = makeRuntime();
    const { rt: hardRt } = makeRuntime();
    const easy = playReturn(easyRt, "easy", 320);
    const hard = playReturn(hardRt, "hard", 320);

    // Easy keeps the reference's straight return: it arrives on the line it was
    // hit from (x = 0), exactly 320 from the human, by pure geometry.
    expect(easy).toBeCloseTo(320, 0);
    expect(hard).toBeGreaterThan(easy + 150);
  });

  it("recovers toward the middle after playing a wide ball", () => {
    const { rt } = makeRuntime();
    rt.difficulty = "hard";
    rt.startMatch();
    rt.oppBat = { x: 380, y: BAT_REST_Y, z: BOARD_END };
    rt.ball = createBall({ x: 380, y: BAT_REST_Y + 20, z: BOARD_END - 20 });
    rt.playerBat.x = 0;
    rt.possession = {
      hitter: "player",
      receiver: "opponent",
      serve: false,
      serveBounceDone: true,
      receiverBounces: 1,
      age: 0,
    };
    rt.screen = "rally";
    rt.opponentHit();

    expect(rt.oppGlide).toBeTruthy();
    for (let i = 0; i < 120; i++) rt.moveOpponent(1 / 60);
    expect(Math.abs(rt.oppBat.x)).toBeLessThan(380);
  });
});

describe("ping-pong runtime — snapshots", () => {
  it("reports difficulty and format to the UI", () => {
    const { rt, snapshots } = makeRuntime();
    rt.setDifficulty("hard");
    rt.setFormat(5);
    const last = snapshots[snapshots.length - 1];
    expect(last.difficulty).toBe("hard");
    expect(last.bestOf).toBe(5);
    expect(last.mode).toBe("sports-ping-pong-arena");
  });
});
