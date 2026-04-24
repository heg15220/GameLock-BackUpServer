// Bench-mode instrumentation. Installed ONLY when VITE_BENCH=1.
// Exposes window.__bench for Playwright to control/read.
//
// This file must not be imported in production. The single entry point
// is src/main.jsx behind `if (import.meta.env.VITE_BENCH)`. Vite will
// tree-shake away every reference in a plain `npm run build`.

const percentile = (sorted, p) => {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
};

const aggregate = (samples) => {
  if (samples.length === 0) {
    return { p50: null, p95: null, p99: null, min: null, max: null, count: 0 };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    count: sorted.length,
  };
};

function makeDeferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createBenchApi() {
  let gameId = null;
  let readyDef = makeDeferred();
  let matchStartedDef = makeDeferred();
  const frameTimes = [];
  const inputLatencies = [];
  let lastFrameAt = 0;
  let rafId = 0;
  let collecting = false;

  const rafLoop = (now) => {
    if (!collecting) return;
    if (lastFrameAt !== 0) {
      frameTimes.push(now - lastFrameAt);
    }
    lastFrameAt = now;
    if (api.lastInputAt > 0) {
      const latency = now - api.lastInputAt;
      if (latency >= 0 && latency < 5000) {
        inputLatencies.push(latency);
      }
      api.lastInputAt = 0;
    }
    rafId = requestAnimationFrame(rafLoop);
  };

  const api = {
    gameId: null,
    lastInputAt: 0,
    frameTimes,
    inputLatencies,
    get ready() { return readyDef.promise; },
    get matchStarted() { return matchStartedDef.promise; },

    reset(nextGameId) {
      gameId = nextGameId;
      api.gameId = nextGameId;
      readyDef = makeDeferred();
      matchStartedDef = makeDeferred();
      frameTimes.length = 0;
      inputLatencies.length = 0;
      api.lastInputAt = 0;
      lastFrameAt = 0;
      collecting = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    },

    startCollection() {
      frameTimes.length = 0;
      inputLatencies.length = 0;
      lastFrameAt = 0;
      api.lastInputAt = 0;
      collecting = true;
      rafId = requestAnimationFrame(rafLoop);
    },

    stopCollection() {
      collecting = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      return {
        frame: aggregate(frameTimes),
        input: aggregate(inputLatencies),
      };
    },

    markInput() {
      api.lastInputAt = performance.now();
    },

    _resolveReady() { readyDef.resolve(); },
    _resolveMatchStarted() { matchStartedDef.resolve(); },
    _rejectMatchStarted(reason) { matchStartedDef.reject(reason); },
  };

  return api;
}

export function installBenchInstrumentation() {
  if (typeof window === "undefined") return;
  if (window.__bench) return;
  window.__bench = createBenchApi();
  window.__benchVersion = 1;
}
