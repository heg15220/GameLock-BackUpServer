// The broadcast camera.
//
// A camera bolted rigidly behind the player is the single fastest way to make a
// sports game feel amateur: it snaps, it jitters with every step, and it makes the
// ball hard to read.  A television camera does none of those things.  It sits
// high and still behind the baseline, it *drifts* laterally to keep the play
// framed rather than chasing it, and it lets the ball move across the frame.
//
// So: critically-damped springs on the eye and the target (no overshoot, no
// snapping), a lateral bias that follows the ball at a fraction of its travel, and
// an impact shake with an exponential decay.  All frame-rate independent — the
// damping is expressed as "fraction of the remaining error left after one second",
// which is the only formulation that survives a variable frame rate.

import * as THREE from "three";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Frame-rate independent exponential smoothing.
function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export function createCameraRig({
  camera,
  // Where the camera sits when nothing is happening: behind the player's baseline.
  home = { x: 0, y: 3.4, z: -16.5 },
  lookAt = { x: 0, y: 0.9, z: 0 },
  // How much of the ball's lateral position the camera mirrors (0 = static).
  sway = 0.16,
  swayY = 0.05,
  eyeLambda = 3.6,
  targetLambda = 6.0,
  shakeEnabled = true,
}) {
  const eye = new THREE.Vector3(home.x, home.y, home.z);
  const focus = new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z);
  const shake = { amount: 0, seed: Math.random() * 1000 };
  let side = -1; // which end of the court we are shooting from
  let time = 0;

  camera.position.copy(eye);
  camera.lookAt(focus);

  return {
    // Called when the players change ends: the camera swings round rather than
    // cutting, because a cut mid-match is disorienting.
    setSide(next) {
      side = next;
    },

    // A hit, a bounce or a winner nudges the camera.  Scaled by how hard the ball
    // was struck, so a drop shot does not shake the arena.
    impulse(strength) {
      if (!shakeEnabled) return;
      shake.amount = clamp(shake.amount + strength, 0, 1);
    },

    update(dt, { ball, player }) {
      time += dt;

      const bx = ball ? ball.x : 0;
      const by = ball ? ball.y : 1;
      const bz = ball ? ball.z : 0;
      const px = player ? player.x : 0;

      // The eye drifts with the play, but only a fraction of it — the frame moves
      // less than the ball does, which is what makes it readable.
      const targetEyeX = (bx * 0.55 + px * 0.45) * sway;
      const targetEyeY = home.y + clamp(by * swayY, 0, 0.5);
      const targetEyeZ = home.z * (side < 0 ? 1 : -1);

      eye.x = damp(eye.x, targetEyeX, eyeLambda, dt);
      eye.y = damp(eye.y, targetEyeY, eyeLambda, dt);
      eye.z = damp(eye.z, targetEyeZ, eyeLambda * 0.6, dt);

      // The focus leads the ball toward the far court, so the player is looking
      // where the rally is going rather than at their own feet.
      focus.x = damp(focus.x, bx * 0.42, targetLambda, dt);
      focus.y = damp(focus.y, clamp(lookAt.y + by * 0.22, 0.5, 2.2), targetLambda, dt);
      focus.z = damp(focus.z, lookAt.z + bz * 0.18, targetLambda, dt);

      camera.position.copy(eye);

      if (shake.amount > 1e-3) {
        // Decaying noise, not a sine: a sine reads as a wobble, noise reads as an
        // impact.
        const a = shake.amount * shake.amount * 0.09;
        const t = time * 38 + shake.seed;
        camera.position.x += Math.sin(t * 1.7) * a;
        camera.position.y += Math.sin(t * 2.3 + 1.1) * a * 0.7;
        shake.amount *= Math.exp(-6.5 * dt);
      }

      camera.lookAt(focus);
    },

    get focus() {
      return focus;
    },
  };
}
