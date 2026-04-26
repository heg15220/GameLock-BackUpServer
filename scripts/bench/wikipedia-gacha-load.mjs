#!/usr/bin/env node
// Synthetic load generator for the wikipedia-gacha backend.
//
// Drives N concurrent virtual users, each rotating through the read-heavy
// endpoints (/session/me, /packs/status, /collection) and occasionally
// opening a pack. Reports p50/p95/p99 latency per endpoint after the run.
//
// Usage:
//   node scripts/bench/wikipedia-gacha-load.mjs \
//     --base http://localhost:8791 \
//     --users 1000 \
//     --duration 60 \
//     --pack-rate 0.05
//
// Without a real backend running this script will exit immediately on the
// bootstrap call.

import process from "node:process";
import { performance } from "node:perf_hooks";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

const args = parseArgs(process.argv);
const BASE = String(args.base ?? "http://127.0.0.1:8791").replace(/\/$/, "");
const USERS = Number(args.users ?? 1000);
const DURATION_S = Number(args.duration ?? 60);
const PACK_OPEN_PROBABILITY = Number(args["pack-rate"] ?? 0.05);

const endpoints = ["session/me", "packs/status", "collection", "missions", "trophies", "open"];
const stats = new Map(endpoints.map((name) => [name, []]));

function recordSample(endpoint, ms, status) {
  const bucket = stats.get(endpoint);
  if (!bucket) return;
  bucket.push({ ms, status });
}

async function jsonRequest(method, path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...(options.token ? { "X-Browser-Token": options.token } : {}),
    ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
  };
  const startedAt = performance.now();
  let status = 0;
  try {
    const response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    status = response.status;
    const text = await response.text();
    return { status, ms: performance.now() - startedAt, body: text ? safeJson(text) : null };
  } catch {
    return { status: 0, ms: performance.now() - startedAt, body: null };
  }
}

function safeJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

async function bootstrapUser() {
  const result = await jsonRequest("POST", "/api/wikipedia-gacha/session/bootstrap", {
    body: { displayName: `bench-${Math.random().toString(36).slice(2, 8)}` },
  });
  if (result.status >= 200 && result.status < 300 && result.body?.browserToken) {
    return result.body.browserToken;
  }
  return null;
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function virtualUser(token, deadlineMs) {
  while (performance.now() < deadlineMs) {
    const roll = Math.random();
    if (roll < PACK_OPEN_PROBABILITY) {
      const idem = Math.random().toString(36).slice(2);
      const result = await jsonRequest("POST", "/api/wikipedia-gacha/packs/open", {
        token,
        idempotencyKey: idem,
      });
      recordSample("open", result.ms, result.status);
    } else {
      const endpoint = randomChoice([
        "session/me",
        "packs/status",
        "collection",
        "missions",
        "trophies",
      ]);
      const result = await jsonRequest("GET", `/api/wikipedia-gacha/${endpoint}`, { token });
      recordSample(endpoint, result.ms, result.status);
    }
    // Small jitter so we don't hammer in lock-step
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 150));
  }
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return sorted[idx];
}

function reportStats() {
  const lines = [];
  lines.push(`endpoint            count    avg    p50    p95    p99   errors`);
  let allCount = 0;
  let allSum = 0;
  let allErrors = 0;
  const allSorted = [];
  for (const [name, samples] of stats) {
    if (!samples.length) continue;
    const ms = samples.map((s) => s.ms);
    const sorted = [...ms].sort((a, b) => a - b);
    const sum = ms.reduce((a, b) => a + b, 0);
    const avg = sum / ms.length;
    const errors = samples.filter((s) => s.status === 0 || s.status >= 500).length;
    allCount += ms.length;
    allSum += sum;
    allErrors += errors;
    allSorted.push(...ms);
    lines.push(
      `${name.padEnd(18)} ${String(samples.length).padStart(6)}` +
      ` ${avg.toFixed(0).padStart(6)}` +
      ` ${percentile(sorted, 0.5).toFixed(0).padStart(6)}` +
      ` ${percentile(sorted, 0.95).toFixed(0).padStart(6)}` +
      ` ${percentile(sorted, 0.99).toFixed(0).padStart(6)}` +
      ` ${String(errors).padStart(8)}`
    );
  }
  if (allCount) {
    allSorted.sort((a, b) => a - b);
    const avg = allSum / allCount;
    lines.push(
      `${"TOTAL".padEnd(18)} ${String(allCount).padStart(6)}` +
      ` ${avg.toFixed(0).padStart(6)}` +
      ` ${percentile(allSorted, 0.5).toFixed(0).padStart(6)}` +
      ` ${percentile(allSorted, 0.95).toFixed(0).padStart(6)}` +
      ` ${percentile(allSorted, 0.99).toFixed(0).padStart(6)}` +
      ` ${String(allErrors).padStart(8)}`
    );
  }
  console.log(lines.join("\n"));
}

async function main() {
  console.log(`Bootstrapping ${USERS} virtual users on ${BASE}…`);
  const tokens = [];
  // Bootstrap in batches of 100 to avoid hammering the server cold-start
  for (let i = 0; i < USERS; i += 100) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(100, USERS - i) }, () => bootstrapUser())
    );
    for (const t of batch) if (t) tokens.push(t);
    if ((i + 100) % 500 === 0) {
      console.log(`  ${tokens.length}/${USERS} ready`);
    }
  }
  if (!tokens.length) {
    console.error("Could not bootstrap any user. Is the backend running?");
    process.exit(1);
  }

  console.log(`Driving load for ${DURATION_S}s with ${tokens.length} users (${(PACK_OPEN_PROBABILITY * 100).toFixed(1)}% pack opens)…`);
  const deadline = performance.now() + DURATION_S * 1000;
  await Promise.all(tokens.map((t) => virtualUser(t, deadline)));

  reportStats();
}

main().catch((error) => {
  console.error("[bench] failed:", error);
  process.exit(1);
});
