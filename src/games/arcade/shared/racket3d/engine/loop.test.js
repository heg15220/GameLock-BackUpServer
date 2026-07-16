// The loop's whole promise is that the display's clock cannot reach the physics.
// So it is driven here by a fake clock at several refresh rates, and asserted to
// simulate the same thing every time.
import { describe, expect, it, vi } from "vitest";
import { createLoop } from "./loop";
import { SIM_DT } from "../physics/stepper";

// Drives `frames` frames of `frameMs` each, through a clock we control.
function run(loop, clock, frames, frameMs) {
  for (let i = 0; i < frames; i += 1) {
    clock.t += frameMs;
    clock.pump();
  }
}

function harness({ frameMs = 1000 / 60, ...options } = {}) {
  const clock = { t: 0, pending: null, pump: null };
  const steps = [];
  const alphas = [];

  const loop = createLoop({
    step: (dt) => steps.push(dt),
    render: (alpha) => alphas.push(alpha),
    now: () => clock.t,
    raf: (cb) => {
      clock.pending = cb;
      return 1;
    },
    cancelRaf: () => {
      clock.pending = null;
    },
    ...options,
  });

  clock.pump = () => {
    const cb = clock.pending;
    clock.pending = null;
    cb?.();
  };

  return { loop, clock, steps, alphas, frameMs };
}

describe("the frame loop", () => {
  it("simulates the same amount of time at 60 Hz and at 144 Hz", () => {
    const slow = harness();
    slow.loop.start();
    run(slow.loop, slow.clock, 60, 1000 / 60); // one second of 60 fps

    const fast = harness();
    fast.loop.start();
    run(fast.loop, fast.clock, 144, 1000 / 144); // one second of 144 fps

    const simulated = (h) => h.steps.length * SIM_DT;
    // Both simulated one second, give or take the step they were part way into.
    expect(simulated(slow)).toBeCloseTo(1, 1);
    expect(simulated(fast)).toBeCloseTo(1, 1);
    expect(Math.abs(simulated(slow) - simulated(fast))).toBeLessThan(SIM_DT * 2);
  });

  it("always steps by exactly the fixed dt, whatever the frame took", () => {
    const h = harness();
    h.loop.start();
    // A deliberately horrible, uneven frame pattern.
    for (const ms of [16.7, 3.2, 41.0, 8.9, 22.4, 16.7]) {
      h.clock.t += ms;
      h.clock.pump();
    }
    expect(h.steps.length).toBeGreaterThan(0);
    for (const dt of h.steps) expect(dt).toBe(SIM_DT);
  });

  it("hands the renderer an interpolation fraction, never a whole step", () => {
    const h = harness();
    h.loop.start();
    run(h.loop, h.clock, 30, 1000 / 60);

    expect(h.alphas.length).toBe(30);
    for (const alpha of h.alphas) {
      expect(alpha).toBeGreaterThanOrEqual(0);
      expect(alpha).toBeLessThan(1);
    }
  });

  // A backgrounded tab hands back a frame worth of minutes.  Simulating it would
  // fast-forward the whole point while nobody was looking.
  it("throws away the time a backgrounded tab was asleep for", () => {
    const h = harness();
    h.loop.start();

    h.clock.t += 5 * 60 * 1000; // five minutes in one frame
    h.clock.pump();

    // At most the clamp (250 ms), not five minutes.
    expect(h.steps.length * SIM_DT).toBeLessThanOrEqual(0.25 + SIM_DT);
  });

  it("feeds the frame time to the quality governor, which is what demotes the tier", () => {
    const sample = vi.fn();
    const h = harness({ governor: { sample } });
    h.loop.start();
    run(h.loop, h.clock, 3, 20);

    expect(sample).toHaveBeenCalledTimes(3);
    expect(sample).toHaveBeenLastCalledWith(20);
  });

  it("slows the world down with timeScale without touching the step size", () => {
    const full = harness();
    full.loop.start();
    run(full.loop, full.clock, 20, 1000 / 60);

    const half = harness({ timeScale: 0.5 });
    half.loop.start();
    run(half.loop, half.clock, 20, 1000 / 60);

    // Half the simulated time...
    expect(half.steps.length).toBeCloseTo(full.steps.length / 2, -1);
    // ...but the physics still advances in the same indivisible increments.
    for (const dt of half.steps) expect(dt).toBe(SIM_DT);
  });

  it("stops, and stays stopped", () => {
    const h = harness();
    h.loop.start();
    run(h.loop, h.clock, 5, 1000 / 60);
    const before = h.steps.length;

    h.loop.stop();
    expect(h.loop.running).toBe(false);

    h.clock.t += 500;
    h.clock.pump();
    expect(h.steps.length).toBe(before);
  });
});
