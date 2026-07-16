// Ping Pong Arena — physics ported from the reference implementation
// (github.com/shresthalucky/PingPong, ISC). The motion model, constants and
// projection are kept faithful to that project because its ball, bat and
// opponent movement feel better than a more "physical" model: no spin, no drag,
// just a parametric projectile that is re-launched from its contact point on
// every bounce.
//
// World frame (reference pixel units):
//   x — lateral, 0 at table centre (the reference anchors x to the canvas width
//       via HALF_CANVAS_WIDTH; recentring on 0 is a pure translation, so every
//       distance, velocity and angle below is unchanged, and the world stops
//       depending on the canvas size).
//   y — height above the floor, positive up. Table surface at TABLE_TOP_Y.
//       This is already the frame the reference's ball maths uses internally
//       (it starts the ball at 400 = 100 above a 300-high table); the reference
//       only flips the sign when drawing, which project3D does here too.
//   z — depth. Near edge of the table at BOARD_Z, far edge at BOARD_END.
//
// Time is the reference's fictional scale: every step advances `t` by TIME,
// not by real seconds. Keeping it means keeping the feel.

// ─── Environment ─────────────────────────────────────────────────────────────
export const GRAVITY = 9.82;
export const TIME = 0.25; // time advanced per step (reference's fixed increment)

export const toRadian = (deg) => (deg * Math.PI) / 180;
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// ─── Table / world constants ─────────────────────────────────────────────────
export const BOARD_WIDTH = 800;
export const BOARD_HALF_WIDTH = BOARD_WIDTH / 2;
export const BOARD_LENGTH = (BOARD_WIDTH * 6) / 5; // 960
export const BOARD_HALF_LENGTH = BOARD_LENGTH / 2;
export const BOARD_Z = 160;
export const BOARD_END = BOARD_LENGTH + BOARD_Z; // 1120
export const BOARD_THICKNESS = 20;
export const TABLE_TOP_Y = 300; // reference's -BOARD_Y: table surface height
export const FLOOR_Y = 0;

export const NET_Z = BOARD_Z + BOARD_HALF_LENGTH; // 640
export const NET_HEIGHT = 90;
export const NET_OFFSET = 50;

// ─── Ball constants ──────────────────────────────────────────────────────────
export const BALL_START_HEIGHT = 100; // above the table surface
export const BALL_MAX_RADIUS = 14;
export const BALL_MIN_RADIUS = 6;
export const BALL_ANGLE = toRadian(30);
export const BALL_INITIAL_VEL = 100;
export const BALL_RADIUS_SLOPE = (BALL_MIN_RADIUS - BALL_MAX_RADIUS) / (BOARD_LENGTH - BOARD_Z);
export const BOUNCE_BACK_VELOCITY = 40;

// ─── Bat / player constants ──────────────────────────────────────────────────
export const BAT_LENGTH = 207;
export const BAT_WIDTH = 124;
export const BAT_HALF_WIDTH = BAT_WIDTH / 2;
export const BAT_HALF_LENGTH = BAT_LENGTH / 2;
export const BAT_THICKNESS = 50;

export const PLAYER_Z = BOARD_Z - 100; // 60
export const OPPONENT_Z = BOARD_END; // 1120
export const BOUNDARY_PADDING = 100;
export const BAT_REST_Y = TABLE_TOP_Y + BALL_START_HEIGHT; // 400

// ─── Gameplay constants ──────────────────────────────────────────────────────
export const SERVE_ANGLE = toRadian(-50);
export const VELOCITY = 85;
export const UP_ANGLE = 30;
export const SIDE_ANGLE = 0;
export const MAX_MOVE_VELOCITY = 1200;

// Arena bounds — a point ends once the ball leaves this volume.
export const LEFT_WALL = -BOARD_WIDTH * 2;
export const RIGHT_WALL = BOARD_WIDTH * 2;
export const END_WALL = BOARD_END + BOARD_WIDTH * 2;

// ─── Ball ────────────────────────────────────────────────────────────────────
// The ball keeps the launch state it was last struck from (`x0/y0/z0`, `angle`,
// `initialVel`) and evaluates its parabola at `t`. A bounce re-launches it.
export function createBall(overrides = {}) {
  const x = overrides.x ?? 0;
  const y = overrides.y ?? BAT_REST_Y;
  const z = overrides.z ?? BOARD_Z;
  return {
    x,
    y,
    z,
    x0: x,
    y0: y,
    z0: z,
    lastX: x,
    lastY: y,
    lastZ: z,
    vx: 0,
    vy: 0,
    vz: BALL_INITIAL_VEL * Math.cos(BALL_ANGLE),
    angle: BALL_ANGLE,
    initialVel: BALL_INITIAL_VEL,
    t: 0,
    rebound: false,
    bounceCount: 0,
    bounceLevel: TABLE_TOP_Y,
    ...overrides,
  };
}

// Is the ball over the table? Also selects the surface it will bounce off.
export function isBallInside(ball) {
  return (
    ball.x <= BOARD_HALF_WIDTH + BALL_MAX_RADIUS &&
    ball.x >= -BOARD_HALF_WIDTH - BALL_MAX_RADIUS &&
    ball.z <= BOARD_END + BALL_MAX_RADIUS &&
    ball.z >= BOARD_Z - BALL_MAX_RADIUS
  );
}

export function bounceLevelFor(ball) {
  return isBallInside(ball) ? TABLE_TOP_Y : FLOOR_Y;
}

// Has the ball left the arena? Ends the point.
export function ballOut(ball) {
  return (
    ball.x >= RIGHT_WALL || ball.x <= LEFT_WALL || ball.z <= 0 || ball.z >= END_WALL
  );
}

// Angle of incidence used to re-launch the ball after a bounce.
//
// Mirrors the reference exactly, and the exact reproduction matters: the
// reference overwrites `current3dPos.y` with `-bounceLevel` *before* calling
// getBounceAngle(), so the contact height enters the maths as a negative
// render-space value (-300) while `lastPosition.y` is still a positive
// world-space one (~291). That mismatch inflates `d` to ~591 instead of ~24 and
// is what produces the steep (~63 deg) kick off the table. Computing the angle
// from consistent coordinates instead gives ~4 deg and the ball dies on the
// table, so the sign discrepancy is reproduced deliberately, not cleaned up.
export function getBounceAngle(ball) {
  const yAtContact = -ball.bounceLevel; // the reference's render-space value
  const d = dist3(ball.lastX, ball.lastY, ball.lastZ, ball.x, yAtContact, ball.z);
  const dx = dist3(ball.x, yAtContact, ball.z, ball.lastX, FLOOR_Y, ball.lastZ);
  if (dx === 0) return 0;
  return Math.atan(d / dx);
}

function dist3(ax, ay, az, bx, by, bz) {
  const dx = ax - bx;
  const dy = ay - by;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Advance the ball one step. Pure: returns a new ball. Mirrors Ball.bounce().
export function stepBall(ball) {
  if (!ball.rebound) {
    const next = { ...ball, lastX: ball.x, lastY: ball.y, lastZ: ball.z };

    next.z = ball.z0 + ball.vz * ball.t;
    if (ball.vx !== 0) next.x = ball.x + ball.vx * 10;

    const vy0 = ball.initialVel * Math.sin(ball.angle);
    next.vy = vy0 - GRAVITY * ball.t;
    next.y = ball.y0 + vy0 * ball.t - GRAVITY * ball.t * ball.t * 0.5;

    // The reference tests against the bounce level resolved on the *previous*
    // frame (isBallInside() runs in draw(), after bounce() has moved the ball),
    // then refreshes it for the next step. Keeping that order matters at the
    // table edge, where the surface the ball is falling toward changes.
    if (next.y < ball.bounceLevel) next.rebound = true;
    next.bounceLevel = bounceLevelFor(next);

    next.t = ball.t + TIME;
    return next;
  }

  // Rebound: re-launch from the contact point with the incidence angle.
  const next = { ...ball };
  next.initialVel = -ball.vy;
  next.z0 = ball.z;
  next.y = ball.bounceLevel;
  next.y0 = ball.bounceLevel;
  next.x0 = ball.x;
  next.rebound = false;
  next.t = 0;
  next.angle = getBounceAngle(ball);
  next.bounceCount = ball.bounceCount + 1;
  return next;
}

// Did the ball cross the net plane below its top? The reference tests this
// discretely per frame; keeping a segment test here costs nothing and stops a
// fast ball tunnelling straight through the net.
export function crossesNet(prev, next) {
  const a = prev.z - NET_Z;
  const b = next.z - NET_Z;
  if (a === 0 && b === 0) return false;
  if (a > 0 === b > 0 && a !== 0 && b !== 0) return false;
  const t = a === b ? 0 : a / (a - b);
  const y = prev.y + (next.y - prev.y) * t;
  const x = prev.x + (next.x - prev.x) * t;
  return (
    y >= TABLE_TOP_Y &&
    y <= TABLE_TOP_Y + NET_HEIGHT &&
    x >= -BOARD_HALF_WIDTH &&
    x <= BOARD_HALF_WIDTH
  );
}

// Rebound off the net back onto the hitter's side. Mirrors Ball.bounceBack().
export function bounceBackFromNet(ball, hitter) {
  const offsetZ = hitter === "player" ? NET_Z - NET_OFFSET : NET_Z + NET_OFFSET;
  const v = hitter === "player" ? -BOUNCE_BACK_VELOCITY : BOUNCE_BACK_VELOCITY;
  return {
    ...ball,
    angle: 0,
    initialVel: BOUNCE_BACK_VELOCITY,
    x0: ball.x,
    y0: ball.y,
    z0: offsetZ,
    z: offsetZ,
    vz: v * Math.cos(0),
    t: 0,
    bounceCount: 0,
    rebound: false,
  };
}

// Strike the ball. Mirrors Ball.hit(): `velocity` sets speed, `upAngle` the
// launch elevation (degrees) and `sideAngle` the lateral drift.
//
// `drift` (opponent only) sets the per-frame lateral velocity directly, letting
// the AI place the ball at a chosen x. The reference hardcodes the opponent's
// vx to 0 — every CPU return travels straight back down the line it was hit
// from, so the human is never moved laterally. Defaulting drift to 0 keeps that
// exact behaviour, which is what the parity tests pin; ai.js opts out of it.
//
// The player's side keeps the reference's own sideAngle model untouched. Note it
// has no zero guard (unlike Ball.serve()), so a player hit always carries
// vx = ±cos(sideAngle) and never travels perfectly straight. That is the
// reference's behaviour and the parity tests depend on it.
export function hitBall(ball, { side, velocity, sideAngle = 0, upAngle = UP_ANGLE, fromZ, drift = 0 }) {
  const angle = toRadian(upAngle);
  const offsetZ = side === "player" ? fromZ + 10 : fromZ - 10;
  const v = side === "player" ? velocity : -velocity;
  const vx =
    side === "player"
      ? sideAngle > 0
        ? Math.cos(sideAngle)
        : -Math.cos(sideAngle)
      : drift;
  return {
    ...ball,
    angle,
    initialVel: velocity,
    vx,
    x0: ball.x,
    y0: ball.y,
    z0: offsetZ,
    z: offsetZ,
    vz: v * Math.cos(angle),
    t: 0,
    bounceCount: 0,
    rebound: false,
  };
}

// Serve. Mirrors Ball.serve(): fixed SERVE_ANGLE, sign of `velocity` gives the
// direction. A negative velocity serves toward the human.
export function serveBallShot(ball, velocity, sideAngle = 0) {
  const vx = sideAngle ? (sideAngle > 0 ? Math.cos(sideAngle) : -Math.cos(sideAngle)) : 0;
  return {
    ...ball,
    initialVel: Math.abs(velocity),
    angle: SERVE_ANGLE,
    vx,
    x0: ball.x,
    y0: ball.y,
    z0: ball.z,
    vz: velocity * Math.cos(SERVE_ANGLE),
    t: 0,
    bounceCount: 0,
    rebound: false,
  };
}

// Bat surface hit test. Mirrors Ball.checkCollision(): the bat is an axis-aligned
// rectangle in x/y at a fixed z, with BAT_THICKNESS of depth tolerance.
export function checkBatCollision(ball, bat, side) {
  const withinFace =
    ball.x >= bat.x - BAT_HALF_WIDTH &&
    ball.x <= bat.x + BAT_HALF_WIDTH &&
    ball.y >= bat.y - BAT_HALF_LENGTH &&
    ball.y <= bat.y + BAT_HALF_LENGTH;
  if (!withinFace) return false;
  if (side === "player") return ball.z <= bat.z && ball.z >= bat.z - BAT_THICKNESS;
  return ball.z >= bat.z && ball.z <= bat.z + BAT_THICKNESS;
}

// Screen radius of the ball — the reference shrinks it linearly with depth.
export function ballRadius(ball) {
  return Math.max(BALL_RADIUS_SLOPE * (ball.z - BOARD_Z) + BALL_MAX_RADIUS, 4);
}

// ─── Perspective projection ──────────────────────────────────────────────────
// The reference's pinhole: camera above the table looking straight down +z, no
// pitch rotation. `viewplane.z` is the focal length and `viewplane.y` is 0, so
// screen y is measured from the top of the canvas.
//
// The reference sets focal = 500 and camera height = canvas height, which only
// frames the table on its own fullscreen canvas (~1280x800) — on a 412px-tall
// canvas the table collapses into a sliver at the top. Because viewplane.y is 0
// the ratio near/far is fixed by geometry, so focal and camera height can be
// solved to reproduce the reference's *native proportions* at any size: near
// edge at 67.9% of the height, far edge at 22.0%, table half-width at 34.0% of
// the width. At 1280x800 this yields exactly focal 500 / height 800 — the
// reference's own numbers.
export const CAM_Z = -300;
const FOCAL_PER_WIDTH = 500 / 1280; // reference focal at its native width
// focal * (camHeight - TABLE_TOP_Y) / viewH, taken from the reference's native
// setup: 500 * (800 - 300) / 800. Exact, so 1280x800 reproduces it precisely.
const FRAME_K = (500 * (800 - TABLE_TOP_Y)) / 800;

export function createCamera(viewW, viewH) {
  const focal = FOCAL_PER_WIDTH * viewW;
  const camY = TABLE_TOP_Y + (FRAME_K * viewH) / focal;
  return {
    viewW,
    viewH,
    camX: 0,
    camY,
    camZ: CAM_Z,
    focal,
    cx: viewW * 0.5,
    cy: 0,
  };
}

// Project a world point to screen space. Returns { sx, sy, scale, visible }.
// World y is positive-up; the reference renders with y inverted, hence camY - y.
export function project3D(cam, x, y, z) {
  const dz = z - cam.camZ;
  if (dz <= 1) return { sx: 0, sy: 0, scale: 0, visible: false };
  const scale = cam.focal / dz;
  return {
    sx: cam.cx + (x - cam.camX) * scale,
    sy: cam.cy + (cam.camY - y) * scale,
    scale,
    visible: true,
  };
}

// Screen point -> world position on the bat plane. Mirrors projection.get3dPosition():
// inverts the pinhole at the bat's resting height so the bat tracks the pointer.
export function unproject(cam, sx, sy, planeY = BAT_REST_Y) {
  const dy = cam.camY - planeY;
  const denom = sy - cam.cy;
  if (denom === 0) return { x: 0, z: BOARD_Z };
  const dz = (cam.focal * dy) / denom;
  const dx = ((sx - cam.cx) * dz) / cam.focal;
  return { x: cam.camX + dx, z: cam.camZ + dz };
}
