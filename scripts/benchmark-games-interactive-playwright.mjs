import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { chromium } from "playwright";

const ROOT = process.cwd();
const SRC_GAMES_FILE = path.join(ROOT, "src", "data", "games.js");
const OUTPUT_DIR = path.join(ROOT, "output");

const DEFAULT_BASE_URL = process.env.BENCH_BASE_URL || "http://127.0.0.1:4174";
const DEFAULT_TIMEOUT_MS = Number(process.env.BENCH_TIMEOUT_MS || 15000);
const DEFAULT_BRIDGE_WAIT_MS = Number(process.env.BENCH_BRIDGE_WAIT_MS || 2500);
const DEFAULT_POST_CLICK_WAIT_MS = Number(process.env.BENCH_POST_CLICK_WAIT_MS || 2500);
const EXCLUDED_GAME_IDS = new Set([
  "knowledge-wikipedia-gacha",
  "arcade-penalty-neural-keeper",
]);

const START_LABEL_PATTERNS = [
  /open route/i,
  /open battlefield/i,
  /open crossword/i,
  /start battle/i,
  /start route/i,
  /start run/i,
  /start round/i,
  /start series/i,
  /start match/i,
  /start combat/i,
  /start tour/i,
  /start/i,
  /iniciar tour/i,
  /iniciar ronda/i,
  /iniciar combate/i,
  /iniciar partida/i,
  /abrir crucigrama/i,
  /iniciar/i,
  /empezar/i,
];

const PRESTART_TOKENS = new Set([
  "boot",
  "config",
  "configuration",
  "idle",
  "intro",
  "loading",
  "menu",
  "pregame",
  "ready",
  "setup",
  "splash",
  "start",
  "title",
  "warmup",
]);

const INTERACTIVE_TOKENS = new Set([
  "active",
  "aiming",
  "battle",
  "combat",
  "driving",
  "exploring",
  "gameplay",
  "match",
  "play",
  "playing",
  "race",
  "racing",
  "round",
  "running",
  "serving",
  "shift",
  "simulation",
  "tour",
  "turn",
]);

function parseArgs(argv) {
  const args = {
    baseUrl: DEFAULT_BASE_URL,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    bridgeWaitMs: DEFAULT_BRIDGE_WAIT_MS,
    postClickWaitMs: DEFAULT_POST_CLICK_WAIT_MS,
    headless: true,
    only: [],
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--base-url" && next) {
      args.baseUrl = next;
      index += 1;
    } else if (arg === "--timeout-ms" && next) {
      args.timeoutMs = Number(next);
      index += 1;
    } else if (arg === "--bridge-wait-ms" && next) {
      args.bridgeWaitMs = Number(next);
      index += 1;
    } else if (arg === "--post-click-wait-ms" && next) {
      args.postClickWaitMs = Number(next);
      index += 1;
    } else if (arg === "--headless" && next) {
      args.headless = next !== "0" && next !== "false";
      index += 1;
    } else if (arg === "--only" && next) {
      args.only = next.split(",").map((item) => item.trim()).filter(Boolean);
      index += 1;
    }
  }

  return args;
}

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function parseGameIdsFromSource() {
  const text = readFile(SRC_GAMES_FILE);
  const matches = [...text.matchAll(/id:\s*"([^"]+)"/g)];
  return matches.map((match) => match[1]).filter((id) => !EXCLUDED_GAME_IDS.has(id));
}

function tryParseJson(text) {
  if (typeof text !== "string" || !text.trim()) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractStateTokens(payload) {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const values = [
    payload.mode,
    payload.screen,
    payload.status,
    payload.phase,
    payload.playState,
    payload.scene,
    payload.stage,
    payload.state,
  ];

  return values
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim().toLowerCase());
}

function isInteractivePayload(payload) {
  const tokens = extractStateTokens(payload);
  if (!tokens.length) {
    return false;
  }
  if (tokens.some((token) => INTERACTIVE_TOKENS.has(token))) {
    return true;
  }
  return tokens.every((token) => !PRESTART_TOKENS.has(token));
}

async function waitFor(condition, timeoutMs, intervalMs = 50) {
  const startedAt = performance.now();
  while (performance.now() - startedAt <= timeoutMs) {
    const value = await condition();
    if (value) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}

async function readBridgeState(page) {
  const result = await page.evaluate(() => {
    const raw = typeof window.render_game_to_text === "function"
      ? window.render_game_to_text()
      : null;

    return {
      hasBridge: typeof window.render_game_to_text === "function",
      raw,
      hasCanvas: Boolean(document.querySelector("canvas")),
      hasIframe: Boolean(document.querySelector("iframe")),
    };
  });

  return {
    ...result,
    payload: tryParseJson(result.raw),
  };
}

async function clickStartButtonIfPresent(page) {
  return page.evaluate(() => {
    const patterns = [
      /open route/i,
      /open battlefield/i,
      /open crossword/i,
      /start battle/i,
      /start route/i,
      /start run/i,
      /start round/i,
      /start series/i,
      /start match/i,
      /start combat/i,
      /start tour/i,
      /start/i,
      /iniciar tour/i,
      /iniciar ronda/i,
      /iniciar combate/i,
      /iniciar partida/i,
      /abrir crucigrama/i,
      /iniciar/i,
      /empezar/i,
    ];
    const buttons = [...document.querySelectorAll("button")];
    for (const button of buttons) {
      if (button.disabled) continue;
      const text = (button.textContent || "").trim();
      if (!text) continue;
      if (!patterns.some((pattern) => pattern.test(text))) continue;
      button.click();
      return text;
    }
    return null;
  });
}

async function waitForBridgeOrInteractive(page, timeoutMs) {
  return waitFor(async () => {
    const current = await readBridgeState(page);
    return current.hasBridge || (current.payload && isInteractivePayload(current.payload))
      ? current
      : null;
  }, timeoutMs);
}

async function benchmarkGame(page, baseUrl, gameId, timeoutMs, bridgeWaitMs, postClickWaitMs) {
  const consoleErrors = [];
  const pageErrors = [];

  const onConsole = (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  };
  const onPageError = (error) => {
    pageErrors.push(error instanceof Error ? error.message : String(error));
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  try {
    await page.addInitScript(() => {
      window.localStorage.setItem("playforge.adPreviewEnabled", "false");
    });

    const navigationStartedAt = performance.now();
    await page.goto(`${baseUrl}/games/${encodeURIComponent(gameId)}`, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });

    const bridgeState = await waitForBridgeOrInteractive(page, Math.min(timeoutMs, bridgeWaitMs));
    let bridgeReadyMs = bridgeState?.hasBridge ? performance.now() - navigationStartedAt : null;
    let clickedLabels = [];
    let state = bridgeState;
    let interactiveState = state?.payload && isInteractivePayload(state.payload) ? state : null;

    while (!interactiveState) {
      const clickedLabel = await clickStartButtonIfPresent(page);
      if (!clickedLabel) {
        break;
      }
      clickedLabels.push(clickedLabel);

      const updatedState = await waitForBridgeOrInteractive(page, Math.min(timeoutMs, postClickWaitMs));
      if (updatedState) {
        state = updatedState;
        if (bridgeReadyMs == null && updatedState.hasBridge) {
          bridgeReadyMs = performance.now() - navigationStartedAt;
        }
        if (updatedState.payload && isInteractivePayload(updatedState.payload)) {
          interactiveState = updatedState;
        }
      }

      if (!interactiveState) {
        state = await readBridgeState(page);
        if (bridgeReadyMs == null && state.hasBridge) {
          bridgeReadyMs = performance.now() - navigationStartedAt;
        }
        if (state.payload && isInteractivePayload(state.payload)) {
          interactiveState = state;
        }
      }
    }

    if (!interactiveState) {
      state = state || await readBridgeState(page);
      if (bridgeReadyMs == null && state.hasBridge) {
        bridgeReadyMs = performance.now() - navigationStartedAt;
      }
      if (state.payload && isInteractivePayload(state.payload)) {
        interactiveState = state;
      }
    }

    const interactiveReadyMs = interactiveState
      ? performance.now() - navigationStartedAt
      : null;

    const finalState = interactiveState || state || await readBridgeState(page);

    return {
      gameId,
      bridgeReadyMs,
      interactiveReadyMs,
      clickedLabels,
      interactiveDetected: Boolean(interactiveState),
      stateTokens: extractStateTokens(finalState.payload),
      hasCanvas: finalState.hasCanvas,
      hasIframe: finalState.hasIframe,
      consoleErrors,
      pageErrors,
      timedOut: !interactiveState,
      rawState: finalState.raw,
    };
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return Number(sorted[index].toFixed(2));
}

function summarize(results) {
  const interactiveValues = results
    .map((item) => item.interactiveReadyMs)
    .filter((value) => Number.isFinite(value));

  const bridgeValues = results
    .map((item) => item.bridgeReadyMs)
    .filter((value) => Number.isFinite(value));

  return {
    totalGames: results.length,
    interactiveDetectedCount: results.filter((item) => item.interactiveDetected).length,
    timeoutCount: results.filter((item) => item.timedOut).length,
    consoleErrorGames: results.filter((item) => item.consoleErrors.length > 0 || item.pageErrors.length > 0).length,
    bridgeReadyMs: {
      p50: percentile(bridgeValues, 0.5),
      p95: percentile(bridgeValues, 0.95),
      max: bridgeValues.length ? Number(Math.max(...bridgeValues).toFixed(2)) : 0,
    },
    interactiveReadyMs: {
      p50: percentile(interactiveValues, 0.5),
      p95: percentile(interactiveValues, 0.95),
      max: interactiveValues.length ? Number(Math.max(...interactiveValues).toFixed(2)) : 0,
    },
    slowestInteractive: results
      .filter((item) => Number.isFinite(item.interactiveReadyMs))
      .sort((a, b) => b.interactiveReadyMs - a.interactiveReadyMs)
      .slice(0, 10)
      .map((item) => ({
        gameId: item.gameId,
        interactiveReadyMs: Number(item.interactiveReadyMs.toFixed(2)),
        bridgeReadyMs: item.bridgeReadyMs == null ? null : Number(item.bridgeReadyMs.toFixed(2)),
        stateTokens: item.stateTokens,
      })),
    timedOutGames: results
      .filter((item) => item.timedOut)
      .map((item) => ({
        gameId: item.gameId,
        clickedLabels: item.clickedLabels,
        stateTokens: item.stateTokens,
      })),
  };
}

function buildMarkdown(payload) {
  const lines = [];
  lines.push(`# Interactive Playwright Benchmark`);
  lines.push("");
  lines.push(`- Base URL: \`${payload.meta.baseUrl}\``);
  lines.push(`- Timeout per game: \`${payload.meta.timeoutMs} ms\``);
  lines.push(`- Bridge wait budget: \`${payload.meta.bridgeWaitMs} ms\``);
  lines.push(`- Post-click wait budget: \`${payload.meta.postClickWaitMs} ms\``);
  lines.push(`- Total games: \`${payload.summary.totalGames}\``);
  lines.push(`- Interactive detected: \`${payload.summary.interactiveDetectedCount}\``);
  lines.push(`- Timeouts: \`${payload.summary.timeoutCount}\``);
  lines.push("");
  lines.push(`## Summary`);
  lines.push("");
  lines.push(`- Bridge p50: \`${payload.summary.bridgeReadyMs.p50} ms\``);
  lines.push(`- Bridge p95: \`${payload.summary.bridgeReadyMs.p95} ms\``);
  lines.push(`- Interactive p50: \`${payload.summary.interactiveReadyMs.p50} ms\``);
  lines.push(`- Interactive p95: \`${payload.summary.interactiveReadyMs.p95} ms\``);
  lines.push("");
  lines.push(`## Slowest`);
  lines.push("");
  lines.push(`| Game | Interactive ms | Bridge ms | State |`);
  lines.push(`| --- | ---: | ---: | --- |`);
  for (const item of payload.summary.slowestInteractive) {
    lines.push(`| ${item.gameId} | ${item.interactiveReadyMs} | ${item.bridgeReadyMs ?? "-"} | ${item.stateTokens.join(", ") || "-"} |`);
  }
  if (payload.summary.timedOutGames.length) {
    lines.push("");
    lines.push(`## Timed Out`);
    lines.push("");
    for (const item of payload.summary.timedOutGames) {
      lines.push(`- \`${item.gameId}\` clicked=${item.clickedLabels.join(" -> ") || "none"} state=${item.stateTokens.join(", ") || "-"}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv);
  const allGameIds = parseGameIdsFromSource();
  const gameIds = args.only.length
    ? allGameIds.filter((gameId) => args.only.includes(gameId))
    : allGameIds;

  const browser = await chromium.launch({ headless: args.headless });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1024 },
  });

  try {
    const results = [];

    for (const gameId of gameIds) {
      const page = await context.newPage();
      /* eslint-disable no-await-in-loop */
      const result = await benchmarkGame(
        page,
        args.baseUrl,
        gameId,
        args.timeoutMs,
        args.bridgeWaitMs,
        args.postClickWaitMs
      );
      results.push(result);
      console.log(
        `${gameId}: bridge=${result.bridgeReadyMs == null ? "timeout" : `${result.bridgeReadyMs.toFixed(2)}ms`} interactive=${result.interactiveReadyMs == null ? "timeout" : `${result.interactiveReadyMs.toFixed(2)}ms`} tokens=${result.stateTokens.join(",") || "-"}`
      );
      await page.close();
    }

    const payload = {
      meta: {
        generatedAt: new Date().toISOString(),
        baseUrl: args.baseUrl,
        timeoutMs: args.timeoutMs,
        bridgeWaitMs: args.bridgeWaitMs,
        postClickWaitMs: args.postClickWaitMs,
        excludedGameIds: [...EXCLUDED_GAME_IDS],
      },
      summary: summarize(results),
      results,
    };

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const jsonPath = path.join(OUTPUT_DIR, `interactive-playwright-benchmark-${timestamp}.json`);
    const mdPath = path.join(OUTPUT_DIR, `interactive-playwright-benchmark-${timestamp}.md`);
    fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
    fs.writeFileSync(mdPath, buildMarkdown(payload));

    console.log(`JSON: ${jsonPath}`);
    console.log(`MD: ${mdPath}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
