// Backend concurrency tests — 500 virtual users hitting each backend through
// open / play / gameplay phases. Targets the avg latency budget of <=500 ms.
//
// Pre-reqs: the three backends must already be running. Use scripts/start-backends.mjs
// or `npm run backend:cosmic-vanguard`, `backend:penalty-shootout`, `backend:wikipedia-gacha`.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { request, destroyAllAgents, waitForHealth } from "./lib/http-client.mjs";
import { runScenario } from "./lib/load-runner.mjs";
import { summarize, classify, formatTable } from "./lib/stats.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, "results");

const VU_COUNT = Number(process.env.CONCURRENCY_VUS || 500);
const THRESHOLD_MS = Number(process.env.CONCURRENCY_THRESHOLD_MS || 500);
const COSMIC_BASE = process.env.COSMIC_BASE || "http://127.0.0.1:8787";
const PENALTY_BASE = process.env.PENALTY_BASE || "http://127.0.0.1:8788";
const GACHA_BASE = process.env.GACHA_BASE || "http://127.0.0.1:8791";

// ───────────────────────────────────────────────────────────────────────────
// Scenarios
// ───────────────────────────────────────────────────────────────────────────

function cosmicVanguardScenario() {
  return async () => [
    {
      phase: "open",
      fn: () => request({ url: `${COSMIC_BASE}/api/cosmic-vanguard/config` }),
    },
    {
      phase: "play",
      fn: () => request({ url: `${COSMIC_BASE}/api/cosmic-vanguard/leaderboard` }),
    },
    {
      phase: "gameplay",
      fn: () =>
        request({
          url: `${COSMIC_BASE}/api/cosmic-vanguard/runs`,
          method: "POST",
          body: {
            pilot: `VU${Math.floor(Math.random() * 9999)}`,
            score: 12000 + Math.floor(Math.random() * 5000),
            wave: 6,
            sector: 3,
            accuracy: 78,
            enemiesDestroyed: 42,
            asteroidsCleared: 18,
            createdAt: new Date().toISOString(),
            source: "concurrency-test",
          },
        }),
    },
  ];
}

function penaltyShootoutScenario(rivalTeamIds) {
  return async (vuId) => {
    const rivalTeamId = rivalTeamIds[vuId % rivalTeamIds.length];
    let matchId = null;
    let matchPhase = null;
    return [
      {
        phase: "open",
        fn: () => request({ url: `${PENALTY_BASE}/api/penalty-shootout/teams` }),
      },
      {
        phase: "play",
        fn: async () => {
          const result = await request({
            url: `${PENALTY_BASE}/api/penalty-shootout/matches`,
            method: "POST",
            body: { rivalTeamId },
          });
          if (result.ok) {
            matchId = result.body?.matchId ?? result.body?.id ?? null;
            matchPhase = result.body?.phase ?? null;
          }
          return result;
        },
      },
      {
        phase: "gameplay",
        fn: async () => {
          if (!matchId) return { ok: false, status: 0, error: "no_match_id" };
          // The first turn alternates between attacker and goalkeeper based
          // on `match.phase`. We pick the matching actionType so the
          // submission is always valid — exercises the AI keeper / shot
          // resolution code paths.
          const zones = ["down-left", "down-right", "top-left", "top-right", "center"];
          const actionType = matchPhase === "awaiting_player_save" ? "SAVE" : "ATTACK";
          return request({
            url: `${PENALTY_BASE}/api/penalty-shootout/matches/${matchId}/shots`,
            method: "POST",
            body: {
              actionType,
              selectedZone: zones[Math.floor(Math.random() * zones.length)],
            },
          });
        },
      },
    ];
  };
}

function wikipediaGachaScenario() {
  return async (vuId) => {
    let browserToken = null;
    return [
      {
        phase: "open",
        fn: async () => {
          const result = await request({
            url: `${GACHA_BASE}/api/wikipedia-gacha/session/bootstrap`,
            method: "POST",
            body: { displayName: `VU-${vuId}`, preferredLanguage: "es" },
          });
          if (result.ok) browserToken = result.body?.browserToken;
          return result;
        },
      },
      {
        phase: "play",
        fn: () =>
          request({
            url: `${GACHA_BASE}/api/wikipedia-gacha/packs/status`,
            method: "GET",
            headers: { "X-Browser-Token": browserToken ?? "" },
          }),
      },
      {
        phase: "gameplay",
        fn: () =>
          request({
            url: `${GACHA_BASE}/api/wikipedia-gacha/packs/open`,
            method: "POST",
            headers: { "X-Browser-Token": browserToken ?? "" },
            body: {},
          }),
      },
    ];
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Driver
// ───────────────────────────────────────────────────────────────────────────

async function runBackend({ name, baseUrl, makeScenario }) {
  console.log(`\n▶ ${name} — health-check ${baseUrl}/health`);
  await waitForHealth(`${baseUrl}/health`);

  const scenario = await makeScenario();
  const result = await runScenario({ vuCount: VU_COUNT, scenario, warmupVus: 5 });

  const phaseSummaries = {};
  for (const phase of ["open", "play", "gameplay"]) {
    phaseSummaries[phase] = {
      success: summarize(result.success[phase] ?? []),
      failed: summarize(result.failed[phase] ?? []),
    };
  }

  const rows = ["open", "play", "gameplay"].map((phase) => {
    const { success, failed } = phaseSummaries[phase];
    const ok = success.count;
    const ko = failed.count;
    const total = ok + ko;
    // Verdict: avg latency over successes must clear threshold AND error
    // rate must be <2 % (otherwise the avg is meaningless).
    const errorRate = total > 0 ? ko / total : 0;
    const latencyOk = success.avg != null && success.avg <= THRESHOLD_MS;
    const verdict = total === 0 ? "unknown" : (latencyOk && errorRate < 0.02 ? "ok" : "fail");
    return {
      backend: name,
      phase,
      ok,
      err: ko,
      "avg(ms)": success.avg ?? "-",
      "p50(ms)": success.p50 ?? "-",
      "p95(ms)": success.p95 ?? "-",
      "p99(ms)": success.p99 ?? "-",
      "max(ms)": success.max ?? "-",
      verdict,
    };
  });

  return {
    name,
    baseUrl,
    vuCount: result.vuCount,
    completedVus: result.completedVus,
    wallDurationMs: Math.round(result.wallDurationMs),
    errors: result.errors.slice(0, 25),
    errorCount: result.errors.length,
    phases: phaseSummaries,
    rows,
  };
}

async function main() {
  await fs.mkdir(RESULTS_DIR, { recursive: true });
  console.log(`Backend concurrency test — VUs=${VU_COUNT}, avg threshold=${THRESHOLD_MS} ms`);

  // Pre-fetch penalty-shootout team list once so we can pick a rival id per VU
  // without each VU paying the catalog cost.
  let rivalTeamIds = [];
  try {
    await waitForHealth(`${PENALTY_BASE}/health`);
    const teamsResult = await request({ url: `${PENALTY_BASE}/api/penalty-shootout/teams` });
    rivalTeamIds = (teamsResult.body?.teams ?? []).map((team) => team.id).filter(Boolean);
    if (rivalTeamIds.length === 0) rivalTeamIds = ["fallback"];
  } catch (err) {
    console.warn(`! penalty-shootout team prefetch failed: ${err.message}`);
    rivalTeamIds = ["fallback"];
  }

  const backends = [];

  backends.push(
    await runBackend({
      name: "cosmic-vanguard",
      baseUrl: COSMIC_BASE,
      makeScenario: () => cosmicVanguardScenario(),
    })
  );

  backends.push(
    await runBackend({
      name: "penalty-shootout",
      baseUrl: PENALTY_BASE,
      makeScenario: () => penaltyShootoutScenario(rivalTeamIds),
    })
  );

  backends.push(
    await runBackend({
      name: "wikipedia-gacha",
      baseUrl: GACHA_BASE,
      makeScenario: () => wikipediaGachaScenario(),
    })
  );

  const allRows = backends.flatMap((backend) => backend.rows);

  console.log("\n=== BACKEND CONCURRENCY RESULTS ===");
  console.log(formatTable(allRows));

  const failing = allRows.filter((row) => row.verdict === "fail");
  if (failing.length > 0) {
    console.log(`\n❌ ${failing.length} phase(s) above ${THRESHOLD_MS} ms avg`);
  } else {
    console.log(`\n✅ All backend phases within ${THRESHOLD_MS} ms avg`);
  }

  for (const backend of backends) {
    if (backend.errorCount > 0) {
      console.log(`! ${backend.name}: ${backend.errorCount} errors (showing up to 25)`);
      console.log(JSON.stringify(backend.errors, null, 2));
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const out = path.join(RESULTS_DIR, `backend-${stamp}.json`);
  await fs.writeFile(out, JSON.stringify({
    startedAt: new Date().toISOString(),
    vuCount: VU_COUNT,
    thresholdMs: THRESHOLD_MS,
    backends,
  }, null, 2));
  await fs.writeFile(path.join(RESULTS_DIR, "backend-latest.json"), JSON.stringify({
    startedAt: new Date().toISOString(),
    vuCount: VU_COUNT,
    thresholdMs: THRESHOLD_MS,
    backends,
  }, null, 2));
  console.log(`\nReport: ${out}`);

  destroyAllAgents();
  if (failing.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  destroyAllAgents();
  process.exit(2);
});
