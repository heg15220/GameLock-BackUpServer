// The frame loop: the one place the display's clock meets the simulation's.
//
// These must not be the same clock, and keeping them apart is most of what makes
// the game feel professional rather than homemade:
//
//   * The simulation advances in fixed increments (600 Hz), so a point played on
//     a 60 Hz laptop is the *same point* on a 144 Hz monitor.  Nothing about
//     where the ball lands depends on how fast the browser happened to be
//     painting.
//   * The renderer draws *between* the last two simulated states, so the ball
//     moves smoothly at any refresh rate instead of stepping.
//   * Frames the machine could not deliver are measured, not ignored: the frame
//     time is what demotes the quality tier, because it is the only measurement
//     that is ever right about how fast the device really is.
//
// The clock and the scheduler are injected so the whole thing can be driven by a
// fake clock in a test — a loop you can only observe at 60 Hz in a browser is a
// loop you cannot assert anything about.

import { createFixedStepper, SIM_DT } from "../physics/stepper";

// A frame longer than this did not happen: the tab was in the background, or the
// machine hitched.  Simulating it would fast-forward the point through the net
// while nobody was looking, so we throw the time away instead.
const MAX_FRAME_SECONDS = 0.25;

export function createLoop({
  step,
  render,
  dt = SIM_DT,
  governor = null,
  // Global slow-motion.  1.0 everywhere on the desktop; the mobile presets are
  // allowed to dial it back rather than falsify the physics constants.
  timeScale = 1,
  now,
  raf,
  cancelRaf,
}) {
  const clock = now ?? (() => performance.now());
  const schedule = raf ?? ((cb) => requestAnimationFrame(cb));
  const unschedule = cancelRaf ?? ((h) => cancelAnimationFrame(h));

  const stepper = createFixedStepper({ dt });

  let handle = null;
  let running = false;
  let last = 0;
  let scale = timeScale;

  const frame = () => {
    if (!running) return;

    const t = clock();
    const frameMs = t - last;
    last = t;

    governor?.sample(frameMs);

    const seconds = Math.min(frameMs / 1000, MAX_FRAME_SECONDS) * scale;
    // `advance` runs as many fixed steps as this frame paid for, and hands back
    // how far into the next one we stopped.  That fraction is what the renderer
    // interpolates with.
    const alpha = stepper.advance(seconds, step);
    render(alpha);

    handle = schedule(frame);
  };

  return {
    get running() {
      return running;
    },
    get timeScale() {
      return scale;
    },
    setTimeScale(value) {
      scale = Math.max(0, value);
    },
    start() {
      if (running) return;
      running = true;
      last = clock();
      stepper.reset();
      handle = schedule(frame);
    },
    stop() {
      running = false;
      if (handle != null) unschedule(handle);
      handle = null;
    },
  };
}
