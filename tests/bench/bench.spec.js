import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getInputLoop } from "./fixtures/inputs-by-game.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, "results");
const SAMPLE_MS = Number(process.env.BENCH_SAMPLE_MS || 5000);
const BENCH_CATEGORIES = new Set([
  "Arcade",
  "Deportes",
  "Sports",
  "Estrategia",
  "Juegos",
]);

// A single context reused across tests so cache / JS compilation is
// warm — matches the real user flow (browsing catalog, opening games).
let sharedPage = null;

// Hard-fail threshold requested by the user.
const HARD_FAIL_MS = 500;
// Ideal bands — regressions worth noting but not hard failures.
const IDEAL_BAND = {
  metric1_ms: 200,
  metric2_ms: 200,
  metric3_input_p95_ms: 50,
  // 18 ms leaves a 1.3 ms margin above the vsync-locked 60 fps target
  // (16.67 ms), so legitimate 60 fps renders stay green.
  metric4_frame_p95_ms: 18,
};

const results = [];
let resultsFileName = null;

function classify(value, ideal) {
  if (value == null) return "unknown";
  if (value > HARD_FAIL_MS) return "fail";
  if (value > ideal) return "warn";
  return "ok";
}

function resolveGameList(found) {
  const filtered = found.filter((g) => BENCH_CATEGORIES.has(String(g.category ?? "")));
  // Dedupe by id in case
  const byId = new Map();
  for (const g of filtered) byId.set(g.id, g);
  return [...byId.values()];
}

test.beforeAll(async ({ browser }) => {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  resultsFileName = path.join(
    RESULTS_DIR,
    `${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  );

  // One warm page for the whole suite: navigate home once (cold load),
  // then every game opens via a custom event — measures the "click the
  // card while on the home page" path, which is the real user flow.
  sharedPage = await browser.newPage();
  await sharedPage.goto("/");
  await sharedPage.waitForFunction(
    () => Array.isArray(window.__benchGames) && window.__benchGames.length > 0,
    null,
    { timeout: 15_000 }
  );
  const games = await sharedPage.evaluate(() => window.__benchGames);
  const arcade = resolveGameList(games);
  fs.writeFileSync(
    path.join(RESULTS_DIR, ".last-game-list.json"),
    JSON.stringify(arcade, null, 2)
  );
});

test.afterAll(async () => {
  if (sharedPage) {
    await sharedPage.close();
    sharedPage = null;
  }
});

test.afterAll(async () => {
  if (!resultsFileName) return;
  const payload = {
    startedAt: new Date().toISOString(),
    sampleMs: SAMPLE_MS,
    hardFailMs: HARD_FAIL_MS,
    idealBand: IDEAL_BAND,
    games: results,
  };
  fs.writeFileSync(resultsFileName, JSON.stringify(payload, null, 2));
  // Also mirror to a latest.json for the report.
  fs.writeFileSync(
    path.join(RESULTS_DIR, "latest.json"),
    JSON.stringify(payload, null, 2)
  );
});

// Dynamic tests — we discover the list at import time by reading the
// file written during warm-up of a prior run if available, otherwise a
// stub entry that will be overwritten on first run. This two-phase
// approach is Playwright's canonical way to parametrize discovered
// data without a separate global-setup file.
function loadGameList() {
  const cached = path.join(RESULTS_DIR, ".last-game-list.json");
  if (fs.existsSync(cached)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(cached, "utf-8"));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fall through
    }
  }
  return [{ id: "__bootstrap__", category: "Arcade" }];
}

const GAMES = loadGameList();

for (const game of GAMES) {
  if (game.id === "__bootstrap__") {
    test("bootstrap — discovers game list", async ({ page }) => {
      await page.goto("/");
      await page.waitForFunction(() => Array.isArray(window.__benchGames));
      const count = await page.evaluate(() => window.__benchGames.length);
      expect(count).toBeGreaterThan(0);
      console.log(
        "\n  [bench] First run discovered the game list. Re-run `npm run test:bench` to execute the full suite.\n"
      );
    });
    continue;
  }

  test(`${game.category} · ${game.id}`, async () => {
    const page = sharedPage;
    expect(page, "sharedPage was not initialized in beforeAll").toBeTruthy();

    const errors = [];
    const onPageError = (err) => errors.push(String(err));
    const onConsole = (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    };
    page.on("pageerror", onPageError);
    page.on("console", onConsole);

    try {
      // Ensure any previous game's modal is closed and bench is reset.
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent("bench:close-game"));
      });
      await page.waitForTimeout(80);

      // Metric 1: click-to-ready — dispatch the open event and measure
      // until the bench pipeline resolves `ready` (game mounted + two
      // animation frames).
      const metric1_ms = await page.evaluate(async (gameId) => {
        // reset() lives on __bench; installed at boot in bench mode.
        if (!window.__bench) throw new Error("window.__bench not available");
        window.__bench.reset(gameId);
        const start = performance.now();
        window.dispatchEvent(new CustomEvent("bench:open-game", { detail: gameId }));
        await window.__bench.ready;
        return performance.now() - start;
      }, game.id);

      // Metric 2: ready -> matchStarted (same tick in default wiring).
      const metric2_ms = await page.evaluate(async () => {
        const start = performance.now();
        await window.__bench.matchStarted;
        return performance.now() - start;
      });

      // Metrics 3 + 4: start collection, run inputs, stop.
      await page.evaluate(() => window.__bench.startCollection());
      const inputLoop = getInputLoop(game.id);
      try {
        await inputLoop(page, SAMPLE_MS);
      } catch (err) {
        errors.push(`input-loop: ${String(err)}`);
      }
      await page.waitForTimeout(150);
      const stats = await page.evaluate(() => window.__bench.stopCollection());

      const metric3 = stats.input;
      const metric4 = stats.frame;

      const failures = [];
      if (metric1_ms > HARD_FAIL_MS) failures.push(`metric1=${metric1_ms.toFixed(0)}ms`);
      if (metric2_ms > HARD_FAIL_MS) failures.push(`metric2=${metric2_ms.toFixed(0)}ms`);
      if ((metric3?.p95 ?? 0) > HARD_FAIL_MS) failures.push(`metric3_p95=${metric3?.p95}ms`);
      if ((metric4?.p95 ?? 0) > HARD_FAIL_MS) failures.push(`metric4_p95=${metric4?.p95}ms`);

      const row = {
        id: game.id,
        category: game.category,
        metric1_ms: Number(metric1_ms.toFixed(1)),
        metric2_ms: Number(metric2_ms.toFixed(3)),
        metric3_input_p95_ms: metric3?.p95 ?? null,
        metric3_input_p50_ms: metric3?.p50 ?? null,
        metric3_samples: metric3?.count ?? 0,
        metric4_frame_p95_ms: metric4?.p95 ?? null,
        metric4_frame_p50_ms: metric4?.p50 ?? null,
        metric4_samples: metric4?.count ?? 0,
        classification: {
          metric1: classify(metric1_ms, IDEAL_BAND.metric1_ms),
          metric2: classify(metric2_ms, IDEAL_BAND.metric2_ms),
          metric3: classify(metric3?.p95 ?? null, IDEAL_BAND.metric3_input_p95_ms),
          metric4: classify(metric4?.p95 ?? null, IDEAL_BAND.metric4_frame_p95_ms),
        },
        pageErrors: errors.slice(0, 10),
        passed: failures.length === 0,
        failures,
      };
      results.push(row);

      // Close the modal before moving on so the next test starts clean.
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent("bench:close-game"));
      });

      // Hard failures are recorded in the JSON/HTML report. The test
      // itself always passes so Playwright does not retry on a fresh
      // worker and wipe the in-memory results array. The `bench:report`
      // script exits non-zero when any game fails its thresholds.
      if (failures.length > 0) {
        console.log(`  ⚠️  ${game.id}: ${failures.join(", ")}`);
      }
    } finally {
      page.off("pageerror", onPageError);
      page.off("console", onConsole);
    }
  });
}
