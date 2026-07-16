// Ball flight: gravity, drag and lift, with coefficients that depend on spin.
//
// The old model treated Magnus as a constant times (w x v).  That is wrong in the
// way that matters most for a racket sport: the lift a spinning ball generates
// does not grow without bound with spin, it saturates — and drag *rises* with
// spin at the same time.  Both effects are governed by the same dimensionless
// number, the spin ratio
//
//     S = |w_perp| * r / |v|
//
// (surface speed of the ball divided by its flight speed).  Wind-tunnel data for
// both a tennis ball and a celluloid table-tennis ball collapse onto
//
//     Cl(S) = clMax * S / (clHalf + S)      saturating, ~0.25-0.30 at high S
//     Cd(S) = cd0 + cdSpin * S              drag penalty for spinning
//
// Getting this right is what makes a heavy topspin ball genuinely dive instead of
// merely sagging, and what makes a floated chop hang.  Everything downstream —
// the shot solver, the AI's rollouts — inherits the correction for free.
//
// Axes: +X right, +Y up, +Z toward the opponent.
// Spin sign convention for a ball travelling toward +Z:
//   wx > 0  -> topspin  (lift points down; the ball dives, then kicks off the bounce)
//   wx < 0  -> backspin (lift points up; the ball floats, then checks off the bounce)
//   wy      -> sidespin (curves left/right)

export const GRAVITY = 9.81;
export const AIR_DENSITY = 1.225;

// A hollow sphere: I = c*m*r^2 with c = 2/3.  Both balls are shells.
export const SHELL_INERTIA = 2 / 3;

export function createEnv({
  mass,
  radius,
  cd0,
  cdSpin = 0.28,
  clMax = 0.29,
  clHalf = 0.34,
  spinDecay,
  airDensity = AIR_DENSITY,
  inertiaFactor = SHELL_INERTIA,
  gravity = GRAVITY,
}) {
  const area = Math.PI * radius * radius;
  return {
    mass,
    radius,
    gravity,
    inertiaFactor,
    cd0,
    cdSpin,
    clMax,
    clHalf,
    spinDecay,
    // Common factor of both aerodynamic forces, divided through by mass:
    //   a = kAero * C * |v|^2 * direction
    kAero: (0.5 * airDensity * area) / mass,
  };
}

export function createBall(init = {}) {
  return {
    x: 0, y: 0, z: 0,
    vx: 0, vy: 0, vz: 0,
    wx: 0, wy: 0, wz: 0,
    ...init,
  };
}

export function cloneBall(ball) {
  return { ...ball };
}

export function copyBall(target, source) {
  target.x = source.x; target.y = source.y; target.z = source.z;
  target.vx = source.vx; target.vy = source.vy; target.vz = source.vz;
  target.wx = source.wx; target.wy = source.wy; target.wz = source.wz;
  return target;
}

export function speed(ball) {
  return Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy + ball.vz * ball.vz);
}

export function spinRate(ball) {
  return Math.sqrt(ball.wx * ball.wx + ball.wy * ball.wy + ball.wz * ball.wz);
}

// Revolutions per minute — the unit tennis and table tennis actually talk in.
export function spinRpm(ball) {
  return (spinRate(ball) * 60) / (2 * Math.PI);
}

// Spin ratio S, using only the spin component perpendicular to the velocity: a
// ball spinning about its own direction of travel (pure "rifle" spin) generates
// no lift, and this is where that falls out.
export function spinRatio(ball, env) {
  const v = speed(ball);
  if (v < 1e-6) return 0;
  const vx = ball.vx / v;
  const vy = ball.vy / v;
  const vz = ball.vz / v;
  const along = ball.wx * vx + ball.wy * vy + ball.wz * vz;
  const px = ball.wx - along * vx;
  const py = ball.wy - along * vy;
  const pz = ball.wz - along * vz;
  return (Math.sqrt(px * px + py * py + pz * pz) * env.radius) / v;
}

export function liftCoefficient(S, env) {
  return (env.clMax * S) / (env.clHalf + S);
}

export function dragCoefficient(S, env) {
  return env.cd0 + env.cdSpin * S;
}

// Acceleration in free flight, written into `out`.
export function accel(ball, env, out = { ax: 0, ay: 0, az: 0 }) {
  const v = speed(ball);
  out.ax = 0;
  out.ay = -env.gravity;
  out.az = 0;
  if (v < 1e-6) return out;

  const S = spinRatio(ball, env);
  const cd = dragCoefficient(S, env);
  const cl = liftCoefficient(S, env);

  // Drag: opposes velocity, magnitude kAero * Cd * v^2.
  const kDrag = env.kAero * cd * v; // times v again below, via the components
  out.ax -= kDrag * ball.vx;
  out.ay -= kDrag * ball.vy;
  out.az -= kDrag * ball.vz;

  // Lift: perpendicular to velocity, along (w_hat x v_hat), magnitude
  // kAero * Cl * v^2.
  const w = spinRate(ball);
  if (w > 1e-6 && cl > 1e-9) {
    const wx = ball.wx / w;
    const wy = ball.wy / w;
    const wz = ball.wz / w;
    const vx = ball.vx / v;
    const vy = ball.vy / v;
    const vz = ball.vz / v;
    // w_hat x v_hat
    let cx = wy * vz - wz * vy;
    let cy = wz * vx - wx * vz;
    let cz = wx * vy - wy * vx;
    const cn = Math.sqrt(cx * cx + cy * cy + cz * cz);
    if (cn > 1e-9) {
      cx /= cn; cy /= cn; cz /= cn;
      const kLift = env.kAero * cl * v * v;
      out.ax += kLift * cx;
      out.ay += kLift * cy;
      out.az += kLift * cz;
    }
  }

  return out;
}

const A1 = { ax: 0, ay: 0, az: 0 };
const A2 = { ax: 0, ay: 0, az: 0 };
const MID = createBall();

// One free-flight substep, midpoint (RK2).
//
// Explicit Euler bleeds energy on the curved, drag-dominated arcs a ping-pong
// ball flies, and the error shows up exactly where it is least acceptable: in
// where the ball lands.  RK2 costs one extra force evaluation and removes it.
export function integrate(ball, dt, env) {
  accel(ball, env, A1);

  MID.x = ball.x + ball.vx * dt * 0.5;
  MID.y = ball.y + ball.vy * dt * 0.5;
  MID.z = ball.z + ball.vz * dt * 0.5;
  MID.vx = ball.vx + A1.ax * dt * 0.5;
  MID.vy = ball.vy + A1.ay * dt * 0.5;
  MID.vz = ball.vz + A1.az * dt * 0.5;
  MID.wx = ball.wx;
  MID.wy = ball.wy;
  MID.wz = ball.wz;

  accel(MID, env, A2);

  ball.x += MID.vx * dt;
  ball.y += MID.vy * dt;
  ball.z += MID.vz * dt;
  ball.vx += A2.ax * dt;
  ball.vy += A2.ay * dt;
  ball.vz += A2.az * dt;

  // Spin bleeds off slowly through air friction.
  const decay = Math.exp(-env.spinDecay * dt);
  ball.wx *= decay;
  ball.wy *= decay;
  ball.wz *= decay;

  return ball;
}
