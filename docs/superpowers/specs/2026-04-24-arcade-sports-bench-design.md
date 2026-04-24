# Arcade + Deportes performance benchmark harness

**Status:** approved design, pending implementation plan
**Date:** 2026-04-24
**Scope:** client-side performance benchmark for the ~37 games under
categories `Arcade` and `Deportes` in `src/data/games.js`.

## Goal

Verify that for every game in the Arcade and Deportes sections:

1. Navigating to the game and reaching a playable state is fast enough.
2. Input-to-frame latency is acceptable once the game is running.
3. The per-game semantic "match starts" moment arrives quickly after
   `ready` (countdown, plunger charge, aim phase).
4. Sustained frame time stays below a hard threshold during 30 s of
   automated play.

The user-requested hard threshold for every metric is **≤ 500 ms**. In
practice a 60 fps game should be two orders of magnitude under that for
metrics 3 and 4, so the harness also tracks a realistic "ideal" band and
reports both.

## Non-goals

- Load testing the Node backends (`server/cosmic-vanguard-backend.mjs`,
  `server/penalty-shootout/`, `server/wikipedia-gacha/`). That is a
  separate future project (option A from brainstorming).
- Measuring 1000 *real* concurrent browsers. The request as originally
  phrased ("1000 usuarios concurrentes, cada uno en su navegador") is
  not physically realizable on a single workstation, and for pure
  client-side games concurrency does not stress anything shared — each
  browser runs in its own sandbox. The harness runs games serially and
  collects clean per-game numbers.
- Instrumenting categories other than Arcade and Deportes.

## Architecture

```
tests/
  bench/
    playwright.bench.config.js   # standalone PW config
    bench.spec.js                # parametrized spec, one test per game
    fixtures/
      inputs-by-game.js          # per-game input scripts
    report.mjs                   # JSON -> HTML summary
    results/                     # gitignored, generated
src/
  bench/
    instrumentation.js           # window.__bench, RAF sampler
    useBenchHook.js              # React hook games call on mount
```

### Dev server mode

A new npm script:

```
"dev:bench": "cross-env VITE_BENCH=1 vite"
```

`VITE_BENCH=1` is the sole switch that activates instrumentation. Vite
dead-code-eliminates `src/bench/*` in production builds because every
import site is guarded by `if (import.meta.env.VITE_BENCH)`.

### Browser launch

Playwright launches a single Chromium instance, headful, with:

- `--enable-precise-memory-info`
- `--disable-background-timer-throttling`
- `--disable-renderer-backgrounding`

Tests run serially (`workers: 1`, `fullyParallel: false`). The goal is
clean measurements, not throughput.

## The `window.__bench` contract

When `VITE_BENCH=1`, `src/bench/instrumentation.js` is imported at app
bootstrap and installs:

```js
window.__bench = {
  gameId: null,
  ready: Promise<void>,          // resolves on first paint + RAF tick after mount
  matchStarted: Promise<void>,   // resolves when the game is truly "playing"
  frameTimes: number[],          // ms between RAF callbacks during collection
  inputLatencies: number[],      // ms from synthetic input to next RAF
  lastInputAt: 0,
  startCollection(): void,       // resets buffers, begins RAF sampling
  stopCollection(): {            // returns aggregated stats
    frame:  { p50, p95, p99, min, max, count },
    input:  { p50, p95, p99, count },
  },
  reset(gameId: string): void,   // called by GameLaunchModal on open
  _resolveReady(): void,         // internal, called by useBenchHook
  _resolveMatchStarted(): void,  // internal, called by games with prep phases
};
```

Each modal open resets `window.__bench` and sets `gameId` from
`GameLaunchModal`.

## React-side hook

`src/bench/useBenchHook.js` exports:

```js
const bench = useBenchHook(gameId, { hasPrepPhase: false });
// Games with a prep phase declare it up front and call
// bench.markMatchStarted() when "actually playing" arrives.
```

Rules:

- `hasPrepPhase: false` (default) — `matchStarted` resolves together
  with `ready`, on the first animation frame after mount.
- `hasPrepPhase: true` — `matchStarted` stays pending until the game
  calls `bench.markMatchStarted()`. If the component unmounts without
  calling it, `matchStarted` rejects so the Playwright spec fails fast
  rather than hanging.

If `window.__bench` is absent (prod build) the hook returns a frozen
no-op object and neither branch does anything.

### `GameLaunchModal` changes

Add a `useEffect` guarded by `import.meta.env.VITE_BENCH` that on open
calls `window.__bench.reset(gameId)`. No other modal behavior changes.

## Per-game instrumentation

Default case — every game calls `useBenchHook(gameId)` once (no
options) in its top `useEffect`. That resolves both `ready` and
`matchStarted` at the first frame.

Known exceptions that pass `{ hasPrepPhase: true }` and call
`bench.markMatchStarted()` when appropriate:

- **`racing-race2dpro`** — mark when the internal state transitions to
  `"racing"` (after the 3-light red → GO! countdown).
- **`arcade-pinball-wizard`** — mark when the plunger releases and the
  ball has `vy < 0` in the physics runtime.
- **`arcade-reactor-toss`** (TigerBall) — mark on the first
  `updateSwipeAim` call.

Any other game that turns out to have a prep phase is a follow-up
adjustment; the default covers >90% of the 37 games.

## Metrics

| # | Metric | Definition | Hard fail | Ideal band |
|---|--------|-----------|-----------|-----------|
| 1 | Arrancar partida | `performance.now()` from card click to `ready` resolved | > 500 ms | < 200 ms |
| 2 | Time-to-match | `matchStarted − ready` | > 500 ms | < 200 ms |
| 3 | Input latency p95 | 10 synthetic inputs, measure each `t(next RAF) − t(input)`, report p95 | > 500 ms | < 50 ms |
| 4 | Frame time p95 (30 s) | RAF delta samples during 30 s of scripted play, report p95 | > 500 ms | < 16.7 ms |

Both the hard fail and the ideal band are reported in the output. The
user's acceptance criterion is the hard-fail column; the ideal band
exists so we catch real regressions before they reach 500 ms.

## Per-game input fixtures

Every registered game exposes an optional `benchInputs(page)` function
in `tests/bench/fixtures/inputs-by-game.js`:

```js
export const INPUTS_BY_GAME = {
  "arcade-pinball-wizard": async (page) => {
    await page.keyboard.down("Space");
    await page.waitForTimeout(300);
    await page.keyboard.up("Space");
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press(i % 2 ? "z" : "x");
      await page.waitForTimeout(100);
    }
  },
  // default fallback for games keyed off arrow keys
  "__default": async (page) => {
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(100);
    }
  },
};
```

Three games are expected to need custom scripts up front:
`arcade-pinball-wizard`, `arcade-reactor-toss`, `racing-race2dpro`.
Everyone else starts on `__default` and is upgraded if the measurement
reveals the default input is a no-op for that game.

## Output

Each run writes `tests/bench/results/<ISO-timestamp>.json`:

```json
{
  "startedAt": "2026-04-24T...",
  "chromiumVersion": "...",
  "games": [
    {
      "id": "arcade-pinball-wizard",
      "category": "Arcade",
      "metric1_ms": 312,
      "metric2_ms": 86,
      "metric3_input_p95_ms": 18,
      "metric4_frame_p95_ms": 19,
      "passed": true,
      "failures": []
    }
  ]
}
```

`report.mjs` consumes that JSON and emits an HTML table of N games × 4
metrics, colored green (ideal), amber (ideal < x ≤ hard), red (> hard).
The CLI exit code equals the number of red cells. CI green ⇔ zero red.

## Production safety

- `import.meta.env.VITE_BENCH` is statically `false` in every
  `npm run build`, so Vite tree-shakes `src/bench/*` and every
  `useBenchHook` callsite becomes a no-op and then dead code.
- `useBenchHook` never throws and never retains references if
  `window.__bench` is absent.
- `GameLaunchModal`'s bench effect is also guarded, so no listeners are
  attached in production.

## Testing strategy for the harness itself

- A smoke test running the harness against a single game
  (`arcade-pinball-wizard`) in CI, with generous thresholds, to catch
  regressions in the harness code.
- The full 37-game run is a manual / nightly task, not per-PR, because
  it takes ~20 minutes and needs a stable workstation to be meaningful.

## Open questions for implementation

- Exact selector for "click card" — depends on the home view's DOM.
  Implementation plan needs to pin this down.
- Whether any of the currently-"default" games actually needs a custom
  `benchInputs` — discovered empirically on first run.

## Decomposition

This is one cohesive piece of work, not a platform. No sub-project
split needed. Proceeds directly to a single implementation plan.
