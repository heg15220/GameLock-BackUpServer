// Generic concurrency runner: spawns N virtual users, each running a phased
// scenario. Returns per-phase latency arrays (split into success vs error)
// + error counts.
//
// A "scenario" is a function (vuId, sharedCtx) => returning a list of
// { phase: string, fn: async () => result } steps. Each step's wallclock is
// measured (not just HTTP) so we can include client-side prep in the budget.

import { performance } from "node:perf_hooks";

export async function runScenario({
  vuCount,
  scenario,
  sharedCtx = {},
  warmupVus = 0,
}) {
  const successByPhase = new Map();
  const errorByPhase = new Map();
  const errors = [];
  let completedVus = 0;

  function ensure(map, phase) {
    if (!map.has(phase)) map.set(phase, []);
    return map.get(phase);
  }

  async function runVU(vuId) {
    let steps;
    try {
      steps = await scenario(vuId, sharedCtx);
    } catch (err) {
      errors.push({ phase: "scenario_init", vuId, error: String(err) });
      return;
    }
    for (const step of steps) {
      const start = performance.now();
      let ok = false;
      let errorInfo = null;
      try {
        const result = await step.fn();
        ok = result === undefined || result?.ok !== false;
        if (!ok) errorInfo = { vuId, status: result?.status, error: result?.error };
      } catch (err) {
        errorInfo = { vuId, error: String(err) };
      }
      const durationMs = performance.now() - start;
      if (ok) ensure(successByPhase, step.phase).push(durationMs);
      else {
        ensure(errorByPhase, step.phase).push(durationMs);
        errors.push({ phase: step.phase, ...errorInfo });
      }
      if (!ok) return; // stop scenario for this VU; subsequent steps depend on prior state
    }
    completedVus += 1;
  }

  if (warmupVus > 0) {
    const warmupTasks = [];
    for (let index = 0; index < warmupVus; index += 1) warmupTasks.push(runVU(`warmup-${index}`));
    await Promise.all(warmupTasks);
    successByPhase.clear();
    errorByPhase.clear();
    errors.length = 0;
    completedVus = 0;
  }

  const tasks = [];
  for (let index = 0; index < vuCount; index += 1) tasks.push(runVU(index));
  const wallStart = performance.now();
  await Promise.all(tasks);
  const wallDurationMs = performance.now() - wallStart;

  return {
    vuCount,
    completedVus,
    wallDurationMs,
    success: Object.fromEntries(successByPhase),
    failed: Object.fromEntries(errorByPhase),
    errors,
  };
}
