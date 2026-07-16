// Fixed-step simulation, and the rollout the AI thinks with.
//
// The simulation runs at a fixed rate that has nothing to do with the display's
// refresh rate.  Two things follow, and both of them are the difference between a
// toy and a game that feels professional:
//
//   1. The physics is deterministic.  The same point played on a 60 Hz laptop and
//      a 144 Hz monitor is the *same point*.  Nothing about the ball's flight
//      depends on how fast the browser happened to be painting.
//   2. Rendering interpolates between the last two simulated states rather than
//      drawing the raw one, so the ball moves smoothly at any refresh rate
//      instead of stepping.
//
// `rollout` runs the identical integrator and the identical world.  That is why
// the AI needs no tuning of its own when the surface, the net height or the ball
// changes: it predicts the future by *playing* it.

import { integrate, cloneBall, copyBall, createBall } from "./aero";

export const SIM_HZ = 600;
export const SIM_DT = 1 / SIM_HZ;
const MAX_CATCHUP = 0.1; // never simulate more than 100 ms in one frame

// Advances `state` in fixed increments, calling `step(dt)` for each one, and
// reports how far into the next step the renderer should interpolate.
export function createFixedStepper({ dt = SIM_DT, maxCatchup = MAX_CATCHUP } = {}) {
  let accumulator = 0;
  return {
    dt,
    // Returns alpha in [0, 1): how far between the last two simulated states the
    // renderer should draw.
    advance(frameSeconds, step) {
      accumulator += Math.min(frameSeconds, maxCatchup);
      let steps = 0;
      while (accumulator >= dt) {
        step(dt);
        accumulator -= dt;
        steps += 1;
        if (steps > 600) {
          accumulator = 0; // the tab was asleep; do not try to catch up on minutes
          break;
        }
      }
      return accumulator / dt;
    },
    reset() {
      accumulator = 0;
    },
  };
}

// One simulated step of the ball: fly it, then let the world decide what it ran
// into.  The world's `resolve(ball, prev, dt)` performs the continuous test, moves
// the ball back to the moment of contact if there was one, and returns an event
// name.
export function stepBall(ball, dt, env, world, prev = cloneBall(ball)) {
  copyBall(prev, ball);
  integrate(ball, dt, env);
  return world.resolve(ball, prev, dt);
}

// Fly a candidate ball through the real world and report everything that happens
// to it.  Used by the shot solver and, above all, by the AI: this is how it knows
// whether the shot it is considering would go in.
export function rollout(initial, env, world, { dt = 1 / 480, maxTime = 4, stopOn = null } = {}) {
  const ball = createBall(initial);
  const prev = cloneBall(ball);
  const events = [];
  let t = 0;

  while (t < maxTime) {
    const event = stepBall(ball, dt, env, world, prev);
    t += dt;
    if (event) {
      events.push({ event, t, x: ball.x, y: ball.y, z: ball.z });
      if (stopOn && stopOn.includes(event)) break;
    }
  }

  return { ball, events, time: t };
}

// Linear interpolation between two ball states, for the renderer.
export function lerpBall(a, b, alpha, out = {}) {
  out.x = a.x + (b.x - a.x) * alpha;
  out.y = a.y + (b.y - a.y) * alpha;
  out.z = a.z + (b.z - a.z) * alpha;
  out.wx = b.wx;
  out.wy = b.wy;
  out.wz = b.wz;
  out.vx = b.vx;
  out.vy = b.vy;
  out.vz = b.vz;
  return out;
}
