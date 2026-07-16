// Swept-sphere tests: continuous collision detection for a fast, small ball.
//
// Discrete collision detection asks "is the ball inside something *now*?", once
// per substep.  At table-tennis speeds that question has the wrong answer far too
// often: a 40 mm ball at 28 m/s moves 117 mm per step at 240 Hz, and the net is
// only 152 mm tall — so the ball routinely teleports straight through it, and the
// bug is invisible until someone's winner passes through the tape.
//
// These helpers instead ask "*when*, between the previous position and this one,
// did the ball first touch something?", and return that fraction of the step.  The
// caller advances the ball to exactly that point, resolves the impact, and carries
// on with what is left of the step.  Nothing is ever missed, at any speed.
//
// Every function returns the entry time as a fraction in (0, 1], or -1 for a miss.

const MISS = -1;

// Smallest positive root of a t^2 + b t + c = 0 within (0, 1].
function smallestRootInRange(a, b, c) {
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) < 1e-12) return MISS;
    const t = -c / b;
    return t > 0 && t <= 1 ? t : MISS;
  }
  const disc = b * b - 4 * a * c;
  if (disc < 0) return MISS;
  const sq = Math.sqrt(disc);
  const t1 = (-b - sq) / (2 * a);
  const t2 = (-b + sq) / (2 * a);
  if (t1 > 0 && t1 <= 1) return t1;
  if (t2 > 0 && t2 <= 1) return t2;
  return MISS;
}

// Sphere of radius `radius` falling onto a horizontal plane at height `planeY`.
// Only catches downward crossings — a ball coming up through a table has already
// gone wrong somewhere else.
export function sweepHorizontalPlane(prev, next, planeY, radius) {
  const y0 = prev.y - radius;
  const y1 = next.y - radius;
  if (y0 > planeY && y1 <= planeY) {
    const span = y0 - y1;
    return span > 1e-12 ? (y0 - planeY) / span : 1;
  }
  return MISS;
}

// Crossing of the vertical plane z = planeZ, in either direction.
export function sweepVerticalPlaneZ(prev, next, planeZ) {
  const d0 = prev.z - planeZ;
  const d1 = next.z - planeZ;
  if (d0 === d1) return MISS;
  if (d0 * d1 > 0) return MISS;
  const t = d0 / (d0 - d1);
  return t > 0 && t <= 1 ? t : (t === 0 ? 1e-6 : MISS);
}

// Swept sphere against an infinite horizontal cylinder running along X — the net
// cord and the table's edges are both exactly this.  The axis sits at
// (y = axisY, z = axisZ) and the test collapses to a circle sweep in the (y, z)
// plane.
export function sweepCylinderAlongX(prev, next, axisY, axisZ, cylinderRadius, ballRadius) {
  const R = cylinderRadius + ballRadius;
  const py = prev.y - axisY;
  const pz = prev.z - axisZ;
  const dy = next.y - prev.y;
  const dz = next.z - prev.z;

  const a = dy * dy + dz * dz;
  const b = 2 * (py * dy + pz * dz);
  const c = py * py + pz * pz - R * R;

  if (c <= 0) return 1e-6; // already touching at the start of the step
  return smallestRootInRange(a, b, c);
}

// The same, for a cylinder running along Z (the table's long side edges).
export function sweepCylinderAlongZ(prev, next, axisY, axisX, cylinderRadius, ballRadius) {
  const R = cylinderRadius + ballRadius;
  const px = prev.x - axisX;
  const py = prev.y - axisY;
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;

  const a = dx * dx + dy * dy;
  const b = 2 * (px * dx + py * dy);
  const c = px * px + py * py - R * R;

  if (c <= 0) return 1e-6;
  return smallestRootInRange(a, b, c);
}

// Swept sphere against a vertical cylinder (a net post).
export function sweepVerticalCylinder(prev, next, axisX, axisZ, cylinderRadius, ballRadius) {
  const R = cylinderRadius + ballRadius;
  const px = prev.x - axisX;
  const pz = prev.z - axisZ;
  const dx = next.x - prev.x;
  const dz = next.z - prev.z;

  const a = dx * dx + dz * dz;
  const b = 2 * (px * dx + pz * dz);
  const c = px * px + pz * pz - R * R;

  if (c <= 0) return 1e-6;
  return smallestRootInRange(a, b, c);
}

// Linear interpolation of the ball's *position* to a fraction of the step.  The
// velocity is left alone: the impact is resolved against the velocity the ball
// actually had when it arrived.
export function positionAt(prev, next, t, out) {
  out.x = prev.x + (next.x - prev.x) * t;
  out.y = prev.y + (next.y - prev.y) * t;
  out.z = prev.z + (next.z - prev.z) * t;
  return out;
}

// Reflect the ball off a general plane with a normal, restitution and friction.
// Used for the parts of the world that are not horizontal: the net tape, the
// table's edges, the posts.
export function reflectOffNormal(ball, nx, ny, nz, { restitution, friction }, env) {
  const c = env.inertiaFactor;
  const r = env.radius;

  const vn = ball.vx * nx + ball.vy * ny + ball.vz * nz;
  if (vn >= 0) return ball; // already leaving

  const jn = -(1 + restitution) * vn;

  // Slip of the contact point, tangential to the plane.
  const cx = ball.wy * -r * nz - ball.wz * -r * ny;
  const cy = ball.wz * -r * nx - ball.wx * -r * nz;
  const cz = ball.wx * -r * ny - ball.wy * -r * nx;

  let sx = ball.vx + cx;
  let sy = ball.vy + cy;
  let sz = ball.vz + cz;
  const sn = sx * nx + sy * ny + sz * nz;
  sx -= sn * nx;
  sy -= sn * ny;
  sz -= sn * nz;
  const slip = Math.sqrt(sx * sx + sy * sy + sz * sz);

  ball.vx += jn * nx;
  ball.vy += jn * ny;
  ball.vz += jn * nz;

  if (slip > 1e-6) {
    const jt = Math.min(friction * jn, slip / (1 + 1 / c));
    const jx = (-sx / slip) * jt;
    const jy = (-sy / slip) * jt;
    const jz = (-sz / slip) * jt;
    ball.vx += jx;
    ball.vy += jy;
    ball.vz += jz;
    const k = -1 / (c * r);
    ball.wx += k * (ny * jz - nz * jy);
    ball.wy += k * (nz * jx - nx * jz);
    ball.wz += k * (nx * jy - ny * jx);
  }

  return ball;
}

export { MISS };
