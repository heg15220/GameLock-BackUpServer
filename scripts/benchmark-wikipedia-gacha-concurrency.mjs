import fs from "node:fs/promises";
import { availableParallelism } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

function parseArgs(argv) {
  const options = {
    baseUrl: "http://127.0.0.1:8791",
    users: 3000,
    locale: "en",
    timeoutMs: 30000,
    output: "",
    includeOpenPack: true,
    clientWorkers: Math.max(1, Math.min(8, availableParallelism())),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") options.baseUrl = argv[index + 1] ?? options.baseUrl;
    if (arg === "--users") options.users = Math.max(1, Number(argv[index + 1]) || options.users);
    if (arg === "--locale") options.locale = String(argv[index + 1] ?? options.locale);
    if (arg === "--timeout-ms") options.timeoutMs = Math.max(1000, Number(argv[index + 1]) || options.timeoutMs);
    if (arg === "--output") options.output = String(argv[index + 1] ?? "");
    if (arg === "--no-open-pack") options.includeOpenPack = false;
    if (arg === "--client-workers") {
      options.clientWorkers = Math.max(1, Number(argv[index + 1]) || options.clientWorkers);
    }
  }

  return options;
}

function percentile(sortedValues, ratio) {
  if (!sortedValues.length) return 0;
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil(sortedValues.length * ratio) - 1)
  );
  return sortedValues[index];
}

function roundMs(value) {
  return Number(value.toFixed(2));
}

function summarizeScenario(name, results) {
  const ok = results.filter((entry) => entry.ok);
  const failed = results.filter((entry) => !entry.ok);
  const values = ok.map((entry) => entry.ms).sort((left, right) => left - right);
  const avgMs = values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

  return {
    name,
    requests: results.length,
    ok: ok.length,
    failed: failed.length,
    avgMs: roundMs(avgMs),
    medianMs: roundMs(percentile(values, 0.5)),
    p95Ms: roundMs(percentile(values, 0.95)),
    p99Ms: roundMs(percentile(values, 0.99)),
    minMs: roundMs(values[0] ?? 0),
    maxMs: roundMs(values[values.length - 1] ?? 0),
    failures: failed.slice(0, 10).map((entry) => ({
      status: entry.status,
      code: entry.code,
      message: entry.message,
    })),
  };
}

async function requestJson(baseUrl, pathName, { method = "GET", headers = {}, body, timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error("request_timeout")), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${pathName}`, {
      method,
      headers,
      body,
      signal: controller.signal,
    });
    const text = await response.text();
    let payload = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text };
    }
    if (!response.ok) {
      const error = new Error(payload.message || `http_${response.status}`);
      error.status = response.status;
      error.code = payload.error || `http_${response.status}`;
      throw error;
    }
    return payload;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function timed(label, fn) {
  const start = performance.now();
  try {
    const payload = await fn();
    return {
      ok: true,
      label,
      ms: performance.now() - start,
      payload,
    };
  } catch (error) {
    return {
      ok: false,
      label,
      ms: performance.now() - start,
      status: error?.status ?? 0,
      code: error?.code ?? error?.name ?? "error",
      message: error?.message ?? "Unknown error",
    };
  }
}

async function waitForHealth(baseUrl, timeoutMs) {
  const startedAt = Date.now();
  while ((Date.now() - startedAt) < timeoutMs) {
    try {
      await requestJson(baseUrl, "/health", { timeoutMs: 2000 });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error(`health_check_timeout after ${timeoutMs}ms`);
}

function chunkItems(items, chunkCount) {
  const chunks = Array.from({ length: Math.max(1, chunkCount) }, () => []);
  items.forEach((item, index) => {
    chunks[index % chunks.length].push(item);
  });
  return chunks.filter((chunk) => chunk.length > 0);
}

async function runScenarioBatch({ scenario, items, options }) {
  const workerCount = Math.min(options.clientWorkers, Math.max(1, items.length));
  const chunks = chunkItems(items, workerCount);
  const workerResults = await Promise.all(
    chunks.map(
      (chunk) =>
        new Promise((resolve, reject) => {
          const worker = new Worker(new URL(import.meta.url), {
            workerData: {
              scenario,
              items: chunk,
              options,
            },
          });
          worker.once("message", resolve);
          worker.once("error", reject);
          worker.once("exit", (code) => {
            if (code !== 0) {
              reject(new Error(`worker_exit_${code}`));
            }
          });
        })
    )
  );
  return workerResults.flat();
}

async function executeScenario(scenario, items, options) {
  if (!items.length) return [];

  if (scenario === "bootstrap") {
    return Promise.all(
      items.map((index) =>
        timed(`bootstrap-${index}`, () =>
          requestJson(options.baseUrl, "/api/wikipedia-gacha/session/bootstrap", {
            method: "POST",
            timeoutMs: options.timeoutMs,
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "X-Wikipedia-Language": options.locale,
            },
            body: JSON.stringify({
              displayName: `Bench User ${index}`,
              preferredLanguage: options.locale,
            }),
          })
        )
      )
    );
  }

  if (scenario === "session") {
    return Promise.all(
      items.map((browserToken, index) =>
        timed(`session-me-${index}`, () =>
          requestJson(options.baseUrl, "/api/wikipedia-gacha/session/me", {
            timeoutMs: options.timeoutMs,
            headers: {
              Accept: "application/json",
              "X-Browser-Token": browserToken,
              "X-Wikipedia-Language": options.locale,
            },
          })
        )
      )
    );
  }

  if (scenario === "openPack") {
    return Promise.all(
      items.map((browserToken, index) =>
        timed(`open-pack-${index}`, () =>
          requestJson(options.baseUrl, "/api/wikipedia-gacha/packs/open", {
            method: "POST",
            timeoutMs: options.timeoutMs,
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "X-Browser-Token": browserToken,
              "X-Wikipedia-Language": options.locale,
            },
            body: JSON.stringify({ browserToken }),
          })
        )
      )
    );
  }

  throw new Error(`unknown_scenario_${scenario}`);
}

async function runWorker() {
  const results = await executeScenario(
    workerData.scenario,
    workerData.items,
    workerData.options
  );
  parentPort.postMessage(results);
}

async function runMain() {
  const options = parseArgs(process.argv.slice(2));

  await waitForHealth(options.baseUrl, options.timeoutMs);

  const warmup = await timed("warmup-bootstrap", () =>
    requestJson(options.baseUrl, "/api/wikipedia-gacha/session/bootstrap", {
      method: "POST",
      timeoutMs: Math.max(options.timeoutMs, 45000),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Wikipedia-Language": options.locale,
      },
      body: JSON.stringify({
        displayName: "Warmup User",
        preferredLanguage: options.locale,
      }),
    })
  );

  if (!warmup.ok) {
    throw new Error(`Warm-up failed: ${warmup.code} ${warmup.message}`);
  }

  const bootstrapResults = await runScenarioBatch({
    scenario: "bootstrap",
    items: Array.from({ length: options.users }, (_, index) => index),
    options,
  });
  const bootstrapSummary = summarizeScenario("bootstrapSession", bootstrapResults);
  const tokens = bootstrapResults
    .filter((entry) => entry.ok && entry.payload?.browserToken)
    .map((entry) => entry.payload.browserToken);

  const sessionResults = await runScenarioBatch({
    scenario: "session",
    items: tokens,
    options,
  });
  const sessionSummary = summarizeScenario("getSessionMe", sessionResults);

  let openPackSummary = null;
  if (options.includeOpenPack) {
    const openPackResults = await runScenarioBatch({
      scenario: "openPack",
      items: tokens,
      options,
    });
    openPackSummary = summarizeScenario("openPack", openPackResults);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: options.baseUrl,
    users: options.users,
    locale: options.locale,
    timeoutMs: options.timeoutMs,
    clientWorkers: options.clientWorkers,
    warmupMs: roundMs(warmup.ms),
    scenarios: [
      bootstrapSummary,
      sessionSummary,
      ...(openPackSummary ? [openPackSummary] : []),
    ],
  };

  const output = JSON.stringify(report, null, 2);
  if (options.output) {
    const outputPath = path.resolve(options.output);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, output, "utf8");
  }

  console.log(output);
}

if (isMainThread) {
  runMain().catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else {
  runWorker().catch((error) => {
    throw error;
  });
}
