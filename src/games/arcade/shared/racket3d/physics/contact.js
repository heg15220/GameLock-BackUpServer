// Racket/bat contact and surface bounce — one impulse model, used everywhere.
//
// This is the heart of the rework.  Before, choosing "topspin" *assigned* a spin
// vector to the ball: the spin was an input, and the racket was decoration.  Here
// the racket is a moving oriented disc, the impact is a rigid-body collision, and
// spin is what comes *out* of brushing up the back of the ball.  Nobody — human
// or AI — can set the ball's spin directly; they can only swing.
//
// The forward model (`applyContact`) resolves an impact.  The inverse model
// (`solveSwing`) answers the question a player's intent actually poses: "what
// swing would send the ball out like *that*?"  Both are derived from the same two
// equations, so a swing produced by the inverse and fed back through the forward
// model reproduces the intent exactly — unless the rubber cannot grip hard enough
// to do what was asked, in which case the ball comes off with less spin than
// intended.  Which is precisely what happens on a real table.
//
// Per unit ball mass, with c = I/(m r^2) (2/3 for a shell):
//
//   normal impulse      jn  = -(1+e) * (vr . n)
//   slip at contact     s   = (v + w x (-r n) - u)_tangential
//   tangential impulse  Jt  = -s_hat * min(mu*jn, |s| / (1 + 1/c))
//   spin change         dw  = -(n x Jt) / (c r)
//
// The last line is the whole game: dw depends only on the face normal and the
// impulse, so a swing that brushes upward across the ball necessarily loads it
// with topspin.

const EPS = 1e-9;

const dot = (ax, ay, az, bx, by, bz) => ax * bx + ay * by + az * bz;

function norm(x, y, z) {
  return Math.sqrt(x * x + y * y + z * z);
}

// ── Surface bounce ──────────────────────────────────────────────────────────
//
// The same impulse law against a horizontal plane whose top face is at
// `surfaceY`.  Spin shifts the velocity of the contact point, so a topspin ball
// is already rolling forward when it lands: it slips less, keeps more of its
// pace, and comes off flat and fast.  A backspin ball slips hard, gets braked,
// and sits up.  Nothing about that is special-cased; it falls out of the slip.
export function bounceOnPlane(ball, surfaceY, { restitution, friction }, env) {
  const r = env.radius;
  const c = env.inertiaFactor;

  const impactSpeed = Math.abs(ball.vy);

  // Contact point is at -r on Y, so w x (-r ey) adds (wz*r, 0, -wx*r).
  const slipX = ball.vx + ball.wz * r;
  const slipZ = ball.vz - ball.wx * r;
  const slip = Math.sqrt(slipX * slipX + slipZ * slipZ);

  ball.vy = impactSpeed * restitution;
  ball.y = surfaceY + r;

  if (slip < 1e-6) return ball;

  const jn = impactSpeed * (1 + restitution);
  const jt = Math.min(friction * jn, slip / (1 + 1 / c));

  const jx = (-slipX / slip) * jt;
  const jz = (-slipZ / slip) * jt;

  ball.vx += jx;
  ball.vz += jz;

  // dw = -(n x J)/(c r) with n = +Y.
  ball.wx += -jz / (c * r);
  ball.wz += jx / (c * r);

  return ball;
}

// Rebound off the net: kills the pace and scrubs the spin.  A netted ball drops,
// it does not carry on.
export function dampAgainstNet(ball, { restitution = 0.25, scrub = 0.35 } = {}) {
  ball.vz *= -restitution;
  ball.vx *= scrub;
  ball.vy *= scrub;
  ball.wx *= scrub;
  ball.wy *= scrub;
  ball.wz *= scrub;
  return ball;
}

// ── The racket ──────────────────────────────────────────────────────────────
//
// A racket is a disc: a centre, a face normal, a velocity, a face radius, and the
// two material numbers that decide what it does to a ball.
//
//   restitution  how much pace the strings/rubber give back
//   friction     how hard the face grips — this is the spin ceiling
//   faceRadius   the sweet spot's radius
//   sweetFalloff how brutally an off-centre hit is punished (0..1)
//   twist        how much an off-centre hit rotates the face open (rad/metre)
export function createRacket(init = {}) {
  return {
    x: 0, y: 0, z: 0,       // centre of the face
    nx: 0, ny: 0, nz: -1,   // face normal, pointing back at the incoming ball
    vx: 0, vy: 0, vz: 0,    // swing velocity
    restitution: 0.75,
    friction: 0.6,
    faceRadius: 0.14,
    sweetFalloff: 0.45,
    twist: 1.2,
    ...init,
  };
}

// How cleanly the ball met the face: 1 dead centre, 0 on the rim.
export function contactQuality(racket, offCentre) {
  const t = Math.min(1, Math.max(0, offCentre / racket.faceRadius));
  return 1 - t * t;
}

// Resolve an impact.  Returns null if the ball is not actually running into the
// face (moving away from it, or outside the face radius), otherwise a report of
// what the contact did.
//
// `offCentre` is measured in the plane of the face, from the ball's centre to the
// racket's.  An off-centre hit does two things, both of them real: the effective
// restitution drops (the frame flexes and eats the energy) and the face twists
// open about the contact point, so the ball sprays.  Standing in the right place
// is therefore worth pace *and* accuracy, with no arbitrary penalty anywhere.
export function applyContact(ball, racket, env) {
  const c = env.inertiaFactor;
  const r = env.radius;

  // Face basis.
  let nx = racket.nx;
  let ny = racket.ny;
  let nz = racket.nz;
  const nl = norm(nx, ny, nz);
  if (nl < EPS) return null;
  nx /= nl; ny /= nl; nz /= nl;

  // Ball centre relative to the face centre, split into normal and in-plane.
  const dx = ball.x - racket.x;
  const dy = ball.y - racket.y;
  const dz = ball.z - racket.z;
  const alongN = dot(dx, dy, dz, nx, ny, nz);
  const px = dx - alongN * nx;
  const py = dy - alongN * ny;
  const pz = dz - alongN * nz;
  const offCentre = norm(px, py, pz);
  if (offCentre > racket.faceRadius + r) return null;

  // Relative approach speed along the normal.  Positive normal means "away from
  // the face", so an approaching ball has vr.n < 0.
  let vrx = ball.vx - racket.vx;
  let vry = ball.vy - racket.vy;
  let vrz = ball.vz - racket.vz;
  const vn = dot(vrx, vry, vrz, nx, ny, nz);
  if (vn >= -EPS) return null; // separating: no impact

  // Off-centre: the face twists open about the contact point.  The rotation axis
  // is the in-plane offset direction crossed with the normal.
  if (offCentre > 1e-4) {
    const ux = px / offCentre;
    const uy = py / offCentre;
    const uz = pz / offCentre;
    // axis = n x u  (rotating n toward u)
    const angle = racket.twist * offCentre;
    const s = Math.sin(angle);
    const co = Math.cos(angle);
    // Rodrigues about `axis`, but rotating n toward u is just a lerp on the
    // (n, u) plane — cheaper and numerically kinder.
    const tx = co * nx + s * ux;
    const ty = co * ny + s * uy;
    const tz = co * nz + s * uz;
    const tl = norm(tx, ty, tz) || 1;
    nx = tx / tl; ny = ty / tl; nz = tz / tl;
  }

  const quality = contactQuality(racket, offCentre);
  const e = racket.restitution * (1 - racket.sweetFalloff * (1 - quality));
  const mu = racket.friction;

  // Recompute the normal component against the twisted face.
  const vnEff = dot(vrx, vry, vrz, nx, ny, nz);
  if (vnEff >= -EPS) return null;

  const jn = -(1 + e) * vnEff;

  // Slip velocity of the contact point, in the face plane.
  const cpx = ball.wy * -r * nz - ball.wz * -r * ny;
  const cpy = ball.wz * -r * nx - ball.wx * -r * nz;
  const cpz = ball.wx * -r * ny - ball.wy * -r * nx;

  let sx = vrx + cpx;
  let sy = vry + cpy;
  let sz = vrz + cpz;
  const sAlongN = dot(sx, sy, sz, nx, ny, nz);
  sx -= sAlongN * nx;
  sy -= sAlongN * ny;
  sz -= sAlongN * nz;
  const slip = norm(sx, sy, sz);

  let jtx = 0;
  let jty = 0;
  let jtz = 0;
  let gripped = true;
  if (slip > 1e-6) {
    const stick = slip / (1 + 1 / c);
    const limit = mu * jn;
    const jt = Math.min(limit, stick);
    gripped = stick <= limit;
    jtx = (-sx / slip) * jt;
    jty = (-sy / slip) * jt;
    jtz = (-sz / slip) * jt;
  }

  ball.vx += jn * nx + jtx;
  ball.vy += jn * ny + jty;
  ball.vz += jn * nz + jtz;

  // dw = -(n x Jt) / (c r)
  const k = -1 / (c * r);
  ball.wx += k * (ny * jtz - nz * jty);
  ball.wy += k * (nz * jtx - nx * jtz);
  ball.wz += k * (nx * jty - ny * jtx);

  return { offCentre, quality, gripped, jn, normal: { x: nx, y: ny, z: nz } };
}

// ── The inverse: what swing produces this shot? ─────────────────────────────
//
// Given the incoming ball and the launch we want out of it, recover the face
// normal and the swing velocity that would produce it.  Both the human's stroke
// and the AI's decision go through here, so both of them play the ball with a
// racket instead of teleporting a velocity onto it.
//
// The derivation is short.  The total impulse is J = vOut - vIn (per unit mass),
// so the spin it imparts is dw = -(n x J)/(c r) — which means the face normal
// alone decides the spin, once the trajectory is fixed.  Invert that for n, and
// the swing velocity follows from the restitution and friction laws.
//
// Returns `{ normal, velocity, spinScale }`.  `spinScale` < 1 means the requested
// spin was more than this trajectory (or this rubber) can deliver and was scaled
// back — an honest "you cannot hit that shot".
export function solveSwing({ ball, vOut, wOut, racket, env }) {
  const c = env.inertiaFactor;
  const r = env.radius;
  const e = racket.restitution;
  const mu = racket.friction;

  const Jx = vOut.x - ball.vx;
  const Jy = vOut.y - ball.vy;
  const Jz = vOut.z - ball.vz;
  const Jm = norm(Jx, Jy, Jz);
  if (Jm < 1e-6) return null;
  const jhx = Jx / Jm;
  const jhy = Jy / Jm;
  const jhz = Jz / Jm;

  const dwx = wOut.x - ball.wx;
  const dwy = wOut.y - ball.wy;
  const dwz = wOut.z - ball.wz;

  // Only the component of the spin change perpendicular to the impulse is
  // reachable: no face normal can spin the ball about the axis it is being
  // pushed along.
  const along = dot(dwx, dwy, dwz, jhx, jhy, jhz);
  const ax = dwx - along * jhx;
  const ay = dwy - along * jhy;
  const az = dwz - along * jhz;

  const solveFor = (scale) => {
    // K = -c r dw_perp, and we need n x J = K.
    const kx = -c * r * ax * scale;
    const ky = -c * r * ay * scale;
    const kz = -c * r * az * scale;

    // n0 = (J x K) / |J|^2 is the in-plane part; the rest is along J.
    const inv = 1 / (Jm * Jm);
    const n0x = (Jy * kz - Jz * ky) * inv;
    const n0y = (Jz * kx - Jx * kz) * inv;
    const n0z = (Jx * ky - Jy * kx) * inv;
    const n0m = norm(n0x, n0y, n0z);
    if (n0m > 1) return null; // this much spin is impossible on this trajectory

    // lambda > 0 keeps the impulse pushing *out* of the face, as it must.
    const lambda = Math.sqrt(Math.max(0, 1 - n0m * n0m));
    const nx = n0x + lambda * jhx;
    const ny = n0y + lambda * jhy;
    const nz = n0z + lambda * jhz;

    const jn = dot(Jx, Jy, Jz, nx, ny, nz);
    if (jn <= EPS) return null;

    const jtx = Jx - jn * nx;
    const jty = Jy - jn * ny;
    const jtz = Jz - jn * nz;
    const jt = norm(jtx, jty, jtz);

    // The rubber has to be able to grip this hard.
    if (jt > mu * jn + 1e-6) return null;

    return { nx, ny, nz, jn, jtx, jty, jtz, jt };
  };

  // Ask for the full spin; if the trajectory or the rubber cannot deliver it,
  // bisect down to the most spin that they can.
  let solved = solveFor(1);
  let spinScale = 1;
  if (!solved) {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 12; i += 1) {
      const mid = (lo + hi) / 2;
      const attempt = solveFor(mid);
      if (attempt) {
        solved = attempt;
        spinScale = mid;
        lo = mid;
      } else {
        hi = mid;
      }
    }
    if (!solved) solved = solveFor(0);
    if (!solved) return null;
  }

  const { nx, ny, nz, jn, jtx, jty, jtz, jt } = solved;

  // Normal swing speed, straight from the restitution law:
  //   jn = -(1+e) * (vIn - u).n   ->   u.n = vIn.n + jn/(1+e)
  const un = dot(ball.vx, ball.vy, ball.vz, nx, ny, nz) + jn / (1 + e);

  // Tangential swing speed: the slip we need is the one whose friction impulse is
  // exactly Jt, i.e. |slip| = |Jt| * (1 + 1/c) directed against Jt.  The racket
  // has to be moving fast enough across the ball to produce it.
  const cpx = ball.wy * -r * nz - ball.wz * -r * ny;
  const cpy = ball.wz * -r * nx - ball.wx * -r * nz;
  const cpz = ball.wx * -r * ny - ball.wy * -r * nx;

  let vcx = ball.vx + cpx;
  let vcy = ball.vy + cpy;
  let vcz = ball.vz + cpz;
  const vcN = dot(vcx, vcy, vcz, nx, ny, nz);
  vcx -= vcN * nx;
  vcy -= vcN * ny;
  vcz -= vcN * nz;

  let utx = vcx;
  let uty = vcy;
  let utz = vcz;
  if (jt > 1e-9) {
    const need = (1 + 1 / c);
    utx += (jtx / jt) * jt * need;
    uty += (jty / jt) * jt * need;
    utz += (jtz / jt) * jt * need;
  }

  return {
    normal: { x: nx, y: ny, z: nz },
    velocity: {
      x: utx + un * nx,
      y: uty + un * ny,
      z: utz + un * nz,
    },
    spinScale,
  };
}
