import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, "dist");
const SRC_GAMES_FILE = path.join(ROOT, "src", "data", "games.js");
const REGISTRY_FILE = path.join(ROOT, "src", "games", "registry.jsx");
const MAIN_HTML_FILE = path.join(DIST_DIR, "index.html");
const OUTPUT_DIR = path.join(ROOT, "output");

const DEFAULT_BASE_URL = process.env.BENCH_BASE_URL || "http://127.0.0.1:4173";
const DEFAULT_CONCURRENCY = Number(process.env.BENCH_CONCURRENCY || 3000);
const DEFAULT_SCENARIO = process.env.BENCH_SCENARIO || "warm-game-entry";
const DEFAULT_READ_BODIES = process.env.BENCH_READ_BODIES === "true";
const DEFAULT_REQUEST_TIMEOUT_MS = Number(process.env.BENCH_REQUEST_TIMEOUT_MS || 5000);
const EXCLUDED_GAME_IDS = new Set([
  "knowledge-wikipedia-gacha",
  "arcade-penalty-neural-keeper",
]);

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function normalizeUrlPath(value) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return null;
  if (value.startsWith("data:")) return null;
  if (value.startsWith("#")) return null;
  if (value.startsWith("//")) return null;
  if (value.startsWith("/")) return value;
  return `/${value.replace(/^\.\//, "")}`;
}

function extractHtmlAssetPaths(htmlText) {
  const matches = [
    ...htmlText.matchAll(/(?:src|href)=["']([^"']+)["']/g),
  ];
  const result = new Set();
  for (const match of matches) {
    const normalized = normalizeUrlPath(match[1]);
    if (normalized) result.add(normalized);
  }
  return [...result];
}

function resolveDistPathFromUrlPath(urlPath) {
  return path.join(DIST_DIR, urlPath.replace(/^\//, "").replaceAll("/", path.sep));
}

function collectLocalHtmlDependencies(entryUrlPath, seen = new Set()) {
  const collected = new Set();
  const queue = [entryUrlPath];

  while (queue.length) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    collected.add(current);

    const currentFile = resolveDistPathFromUrlPath(current);
    if (!fileExists(currentFile)) continue;
    if (!currentFile.endsWith(".html")) continue;

    const htmlText = readFile(currentFile);
    for (const assetPath of extractHtmlAssetPaths(htmlText)) {
      if (!seen.has(assetPath)) {
        queue.push(assetPath);
      }
    }
  }

  return [...collected];
}

function parseIndexBaseResources() {
  const htmlText = readFile(MAIN_HTML_FILE);
  const assetPaths = extractHtmlAssetPaths(htmlText);
  return ["/", ...assetPaths];
}

function parseGameIdsFromSource() {
  const text = readFile(SRC_GAMES_FILE);
  const matches = [...text.matchAll(/id:\s*"([^"]+)"/g)];
  return matches.map((match) => match[1]).filter((id) => !EXCLUDED_GAME_IDS.has(id));
}

function parseVariantByGameIdFromRegistry() {
  const text = readFile(REGISTRY_FILE);
  const variantByComponent = new Map();
  const componentByGameId = new Map();

  for (const match of text.matchAll(
    /const\s+([A-Za-z$_][A-Za-z0-9$_]*)\s*=\s*\(\)\s*=>\s*<([A-Za-z$_][A-Za-z0-9$_]*)\s+variant="([^"]+)"\s*\/>;/g,
  )) {
    variantByComponent.set(match[1], match[3]);
  }

  for (const match of text.matchAll(/"([^"]+)":\s*([A-Za-z$_][A-Za-z0-9$_]*)/g)) {
    componentByGameId.set(match[1], match[2]);
  }

  const variantByGameId = new Map();
  for (const [gameId, componentName] of componentByGameId) {
    if (!variantByComponent.has(componentName)) continue;
    variantByGameId.set(gameId, variantByComponent.get(componentName));
  }

  return variantByGameId;
}

function parseLazyChunkMap(mainBundleText, gameIds) {
  const lazyVarByGameId = new Map();
  const chunkByVar = new Map();
  const variantByGameId = parseVariantByGameIdFromRegistry();
  const chunkByVariant = new Map();

  for (const gameId of gameIds) {
    const escaped = gameId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const idMatch = mainBundleText.match(new RegExp(`"${escaped}":([A-Za-z$_][A-Za-z0-9$_]*)`));
    if (idMatch) {
      lazyVarByGameId.set(gameId, idMatch[1]);
    }
  }

  const lazyMatches = [
    ...mainBundleText.matchAll(
      /([A-Za-z$_][A-Za-z0-9$_]*)=[A-Za-z$_][A-Za-z0-9$_]*\.lazy\(\(\)=>[A-Za-z$_][A-Za-z0-9$_]*\(\(\)=>import\("\.\/([^"]+)"\),\[(.*?)\]\)\)/g,
    ),
  ];
  for (const match of lazyMatches) {
    const varName = match[1];
    const importFile = match[2];
    const preloadRaw = match[3];
    const preloadPaths = [...preloadRaw.matchAll(/"([^"]+)"/g)].map((item) => normalizeUrlPath(item[1])).filter(Boolean);
    chunkByVar.set(varName, {
      importUrlPath: normalizeUrlPath(`/assets/${importFile}`),
      preloadUrlPaths: preloadPaths,
    });
  }

  const variantMatches = [
    ...mainBundleText.matchAll(
      /([a-z0-9-]+):[A-Za-z$_][A-Za-z0-9$_]*\.lazy\(\(\)=>[A-Za-z$_][A-Za-z0-9$_]*\(\(\)=>import\("\.\/([^"]+)"\),\[(.*?)\]\)\)/g,
    ),
  ];
  for (const match of variantMatches) {
    const variant = match[1];
    const importFile = match[2];
    const preloadRaw = match[3];
    const preloadPaths = [...preloadRaw.matchAll(/"([^"]+)"/g)].map((item) => normalizeUrlPath(item[1])).filter(Boolean);
    chunkByVariant.set(variant, {
      importUrlPath: normalizeUrlPath(`/assets/${importFile}`),
      preloadUrlPaths: preloadPaths,
    });
  }

  const mapping = new Map();
  for (const [gameId, varName] of lazyVarByGameId) {
    if (chunkByVar.has(varName)) {
      mapping.set(gameId, chunkByVar.get(varName));
      continue;
    }

    const variant = variantByGameId.get(gameId);
    if (variant && chunkByVariant.has(variant)) {
      mapping.set(gameId, chunkByVariant.get(variant));
    }
  }
  return mapping;
}

function parseIframeResourcesFromChunk(chunkFilePath) {
  if (!fileExists(chunkFilePath)) return [];
  const text = readFile(chunkFilePath);
  const iframeMatches = [...text.matchAll(/src:"(\/[^"]+)"/g)];
  const resources = new Set();

  for (const match of iframeMatches) {
    const iframeUrlPath = normalizeUrlPath(match[1]);
    if (!iframeUrlPath) continue;
    for (const dependency of collectLocalHtmlDependencies(iframeUrlPath)) {
      resources.add(dependency);
    }
  }

  return [...resources];
}

function dedupe(items) {
  return [...new Set(items.filter(Boolean))];
}

function quantile(sortedValues, q) {
  if (!sortedValues.length) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  const index = (sortedValues.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  const weight = index - lower;
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * weight;
}

function roundMetric(value) {
  return Number(value.toFixed(2));
}

function formatMetric(value) {
  return Number.isFinite(value) ? String(value) : "n/a";
}

function formatMetricLabel(value) {
  return Number.isFinite(value) ? `${value}ms` : "n/a";
}

async function fetchPath(baseUrl, urlPath) {
  const startedAt = performance.now();
  const response = await fetch(new URL(urlPath, baseUrl), {
    signal: AbortSignal.timeout(DEFAULT_REQUEST_TIMEOUT_MS),
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  if (DEFAULT_READ_BODIES) {
    await response.arrayBuffer();
  } else {
    await response.body?.cancel();
  }

  return {
    ok: response.ok,
    status: response.status,
    elapsedMs: performance.now() - startedAt,
    urlPath,
  };
}

async function fetchStage(baseUrl, urlPaths) {
  if (!urlPaths.length) {
    return { maxElapsedMs: 0, errors: [] };
  }

  const responses = await Promise.all(
    urlPaths.map(async (urlPath) => {
      const startedAt = performance.now();
      try {
        return await fetchPath(baseUrl, urlPath);
      } catch (error) {
        return {
          ok: false,
          status: 0,
          elapsedMs: performance.now() - startedAt,
          urlPath,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }),
  );

  const maxElapsedMs = responses.reduce(
    (max, response) => Math.max(max, response.elapsedMs || 0),
    0,
  );
  const errors = responses.filter((response) => !response.ok);
  return { maxElapsedMs, errors };
}

async function runSession(baseUrl, profile) {
  let totalElapsedMs = 0;
  const errors = [];
  let startStageElapsedMs = 0;

  if (DEFAULT_SCENARIO === "full-load") {
    const firstStage = await fetchStage(baseUrl, ["/"]);
    startStageElapsedMs += firstStage.maxElapsedMs;
    totalElapsedMs += firstStage.maxElapsedMs;
    errors.push(...firstStage.errors);

    const secondStage = await fetchStage(baseUrl, profile.baseResourcePaths.filter((item) => item !== "/"));
    startStageElapsedMs += secondStage.maxElapsedMs;
    totalElapsedMs += secondStage.maxElapsedMs;
    errors.push(...secondStage.errors);
  }

  const thirdStagePaths = dedupe([
    ...profile.lazyResourcePaths,
  ]);
  const thirdStage = await fetchStage(baseUrl, thirdStagePaths);
  startStageElapsedMs += thirdStage.maxElapsedMs;
  totalElapsedMs += thirdStage.maxElapsedMs;
  errors.push(...thirdStage.errors);

  const fourthStage = await fetchStage(baseUrl, profile.iframeResourcePaths);
  totalElapsedMs += fourthStage.maxElapsedMs;
  errors.push(...fourthStage.errors);

  return {
    elapsedMs: totalElapsedMs,
    startStageElapsedMs,
    gameplayStageElapsedMs: fourthStage.maxElapsedMs,
    readyToPlayElapsedMs: startStageElapsedMs + fourthStage.maxElapsedMs,
    errors,
  };
}

async function warmBaseResources(baseUrl, baseResourcePaths) {
  const warmPaths = dedupe(baseResourcePaths);
  const warmStage = await fetchStage(baseUrl, warmPaths);
  if (warmStage.errors.length > 0) {
    console.warn(`Warmup base resources errors=${warmStage.errors.length}`);
  }
}

function buildProfiles({ gameIds, baseResourcePaths, lazyChunkMap }) {
  const profiles = [];

  for (const gameId of gameIds) {
    const lazyChunk = lazyChunkMap.get(gameId);
    const lazyResourcePaths = [];
    const iframeResourcePaths = [];

    if (lazyChunk) {
      if (lazyChunk.importUrlPath) lazyResourcePaths.push(lazyChunk.importUrlPath);
      lazyResourcePaths.push(...lazyChunk.preloadUrlPaths);

      const chunkFilePath = resolveDistPathFromUrlPath(lazyChunk.importUrlPath);
      iframeResourcePaths.push(...parseIframeResourcesFromChunk(chunkFilePath));
    }

    const dedupedLazyResourcePaths = dedupe(lazyResourcePaths);
    const dedupedIframeResourcePaths = dedupe(iframeResourcePaths);
    const measurementMode = dedupedLazyResourcePaths.length || dedupedIframeResourcePaths.length
      ? "game_specific"
      : "shared_base_bundle";

    profiles.push({
      gameId,
      baseResourcePaths,
      lazyResourcePaths: dedupedLazyResourcePaths,
      iframeResourcePaths: dedupedIframeResourcePaths,
      measurementMode,
      resourceProfile: {
        baseCount: baseResourcePaths.length,
        lazyCount: dedupedLazyResourcePaths.length,
        iframeCount: dedupedIframeResourcePaths.length,
      },
    });
  }

  return profiles;
}

function buildMetricSummary(durations) {
  if (!durations.length) {
    return {
      min: null,
      avg: null,
      p50: null,
      p95: null,
      p99: null,
      max: null,
    };
  }

  const sortedDurations = [...durations].sort((a, b) => a - b);
  return {
    min: roundMetric(sortedDurations[0] || 0),
    avg: roundMetric(sortedDurations.reduce((sum, value) => sum + value, 0) / sortedDurations.length),
    p50: roundMetric(quantile(sortedDurations, 0.5)),
    p95: roundMetric(quantile(sortedDurations, 0.95)),
    p99: roundMetric(quantile(sortedDurations, 0.99)),
    max: roundMetric(sortedDurations[sortedDurations.length - 1] || 0),
  };
}

async function benchmarkProfile(baseUrl, profile, concurrency) {
  if (profile.measurementMode !== "game_specific" && DEFAULT_SCENARIO !== "full-load") {
    return {
      gameId: profile.gameId,
      concurrency,
      measurementMode: profile.measurementMode,
      totalWallTimeMs: null,
      throughputSessionsPerSecond: null,
      responseTimeMs: {
        min: null,
        avg: null,
        p50: null,
        p95: null,
        p99: null,
        max: null,
      },
      startStageMs: {
        min: null,
        avg: null,
        p50: null,
        p95: null,
        p99: null,
        max: null,
      },
      gameplayStageMs: {
        min: null,
        avg: null,
        p50: null,
        p95: null,
        p99: null,
        max: null,
      },
      readyToPlayMs: {
        min: null,
        avg: null,
        p50: null,
        p95: null,
        p99: null,
        max: null,
      },
      errors: {
        sessionErrorCount: 0,
        requestErrorCount: 0,
        uniqueFailures: [],
      },
      resources: {
        ...profile.resourceProfile,
        lazyResourcePaths: profile.lazyResourcePaths,
        iframeResourcePaths: profile.iframeResourcePaths,
      },
    };
  }

  const startedAt = performance.now();
  const sessions = await Promise.all(
    Array.from({ length: concurrency }, () => runSession(baseUrl, profile)),
  );
  const totalElapsedMs = performance.now() - startedAt;
  const totalDurations = sessions.map((session) => session.elapsedMs);
  const startDurations = sessions.map((session) => session.startStageElapsedMs);
  const gameplayDurations = sessions.map((session) => session.gameplayStageElapsedMs);
  const readyToPlayDurations = sessions.map((session) => session.readyToPlayElapsedMs);
  const errors = sessions.flatMap((session) => session.errors);
  const sessionErrorCount = sessions.filter((session) => session.errors.length > 0).length;

  return {
    gameId: profile.gameId,
    concurrency,
    measurementMode: profile.measurementMode,
    totalWallTimeMs: roundMetric(totalElapsedMs),
    throughputSessionsPerSecond: roundMetric((concurrency / totalElapsedMs) * 1000),
    responseTimeMs: buildMetricSummary(totalDurations),
    startStageMs: buildMetricSummary(startDurations),
    gameplayStageMs: buildMetricSummary(gameplayDurations),
    readyToPlayMs: buildMetricSummary(readyToPlayDurations),
    errors: {
      sessionErrorCount,
      requestErrorCount: errors.length,
      uniqueFailures: dedupe(
        errors.map((error) => `${error.urlPath}:${error.status || error.error || "unknown"}`),
      ).sort(),
    },
    resources: {
      ...profile.resourceProfile,
      lazyResourcePaths: profile.lazyResourcePaths,
      iframeResourcePaths: profile.iframeResourcePaths,
    },
  };
}

function buildSummary(results) {
  const measuredResults = results.filter((item) => Number.isFinite(item.responseTimeMs?.p95));
  const sharedBaseBundleGames = results
    .filter((item) => item.measurementMode === "shared_base_bundle")
    .map((item) => item.gameId)
    .sort();
  const sortedByP95 = [...measuredResults].sort((a, b) => b.responseTimeMs.p95 - a.responseTimeMs.p95);
  const sortedByStartP95 = [...measuredResults].sort((a, b) => b.startStageMs.p95 - a.startStageMs.p95);
  const sortedByReadyP95 = [...measuredResults].sort((a, b) => b.readyToPlayMs.p95 - a.readyToPlayMs.p95);
  const sortedByP99 = [...measuredResults].sort((a, b) => b.responseTimeMs.p99 - a.responseTimeMs.p99);
  const sortedByAvg = [...measuredResults].sort((a, b) => b.responseTimeMs.avg - a.responseTimeMs.avg);
  const totalRequestErrors = results.reduce((sum, item) => sum + item.errors.requestErrorCount, 0);
  const totalSessionErrors = results.reduce((sum, item) => sum + item.errors.sessionErrorCount, 0);
  const slaThresholdMs = 500;
  const startStagePassGames = measuredResults
    .filter((item) => Number.isFinite(item.startStageMs.p95) && item.startStageMs.p95 <= slaThresholdMs)
    .map((item) => item.gameId)
    .sort();
  const readyToPlayPassGames = measuredResults
    .filter((item) => Number.isFinite(item.readyToPlayMs.p95) && item.readyToPlayMs.p95 <= slaThresholdMs)
    .map((item) => item.gameId)
    .sort();
  const startStageFailGames = measuredResults
    .filter((item) => !Number.isFinite(item.startStageMs.p95) || item.startStageMs.p95 > slaThresholdMs)
    .map((item) => ({ gameId: item.gameId, p95: item.startStageMs.p95 }))
    .sort((a, b) => (b.p95 || Number.POSITIVE_INFINITY) - (a.p95 || Number.POSITIVE_INFINITY));
  const readyToPlayFailGames = measuredResults
    .filter((item) => !Number.isFinite(item.readyToPlayMs.p95) || item.readyToPlayMs.p95 > slaThresholdMs)
    .map((item) => ({ gameId: item.gameId, p95: item.readyToPlayMs.p95 }))
    .sort((a, b) => (b.p95 || Number.POSITIVE_INFINITY) - (a.p95 || Number.POSITIVE_INFINITY));

  return {
    totalGames: results.length,
    measuredGames: measuredResults.length,
    sharedBaseBundleGames,
    slaThresholdMs,
    startStagePassGames,
    readyToPlayPassGames,
    startStageFailGames,
    readyToPlayFailGames,
    totalRequestErrors,
    totalSessionErrors,
    slowestByP95: sortedByP95.slice(0, 10).map((item) => ({
      gameId: item.gameId,
      p95: item.responseTimeMs.p95,
      p99: item.responseTimeMs.p99,
      avg: item.responseTimeMs.avg,
    })),
    slowestStartByP95: sortedByStartP95.slice(0, 10).map((item) => ({
      gameId: item.gameId,
      p95: item.startStageMs.p95,
      avg: item.startStageMs.avg,
    })),
    slowestReadyByP95: sortedByReadyP95.slice(0, 10).map((item) => ({
      gameId: item.gameId,
      p95: item.readyToPlayMs.p95,
      avg: item.readyToPlayMs.avg,
    })),
    slowestByP99: sortedByP99.slice(0, 10).map((item) => ({
      gameId: item.gameId,
      p99: item.responseTimeMs.p99,
      max: item.responseTimeMs.max,
      avg: item.responseTimeMs.avg,
    })),
    slowestByAvg: sortedByAvg.slice(0, 10).map((item) => ({
      gameId: item.gameId,
      avg: item.responseTimeMs.avg,
      p95: item.responseTimeMs.p95,
      p99: item.responseTimeMs.p99,
    })),
  };
}

function buildMarkdownReport({ meta, summary, results }) {
  const lines = [];
  lines.push("# Benchmark de concurrencia");
  lines.push("");
  lines.push(`- Fecha: ${meta.generatedAt}`);
  lines.push(`- Base URL: ${meta.baseUrl}`);
  lines.push(`- Usuarios concurrentes por juego: ${meta.concurrency}`);
  lines.push(`- Juegos medidos: ${summary.totalGames}`);
  lines.push(`- Juegos con medida especifica: ${summary.measuredGames}`);
  lines.push(`- Juegos en bundle base compartido: ${summary.sharedBaseBundleGames.length}`);
  lines.push(`- Errores de sesión: ${summary.totalSessionErrors}`);
  lines.push(`- Errores de petición: ${summary.totalRequestErrors}`);
  lines.push("");
  lines.push("## Peor P95");
  lines.push("");
  lines.push("| Juego | Avg ms | P95 ms | P99 ms |");
  lines.push("| --- | ---: | ---: | ---: |");
  for (const item of summary.slowestByP95) {
    lines.push(`| ${item.gameId} | ${item.avg} | ${item.p95} | ${item.p99} |`);
  }
  lines.push("");
  lines.push("## Resultados completos");
  lines.push("");
  lines.push("| Juego | Modo | Avg ms | P50 ms | P95 ms | P99 ms | Max ms | Errores |");
  lines.push("| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |");
  for (const item of results) {
    lines.push(
      `| ${item.gameId} | ${item.measurementMode} | ${formatMetric(item.responseTimeMs.avg)} | ${formatMetric(item.responseTimeMs.p50)} | ${formatMetric(item.responseTimeMs.p95)} | ${formatMetric(item.responseTimeMs.p99)} | ${formatMetric(item.responseTimeMs.max)} | ${item.errors.requestErrorCount} |`,
    );
  }
  lines.push("");
  if (summary.sharedBaseBundleGames.length) {
    lines.push("## Sin atribucion por juego");
    lines.push("");
    lines.push("- Estos juegos estan dentro del bundle base compartido en el escenario `warm-game-entry`.");
    lines.push("- El benchmark calienta `index.html` y recursos base antes de medir, asi que no puede asignarles una latencia por juego sin otro modelo de medicion.");
    lines.push(`- Juegos: ${summary.sharedBaseBundleGames.join(", ")}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function buildSlaMarkdownReport({ meta, summary, results }) {
  const lines = [];
  lines.push("# Benchmark de concurrencia");
  lines.push("");
  lines.push(`- Fecha: ${meta.generatedAt}`);
  lines.push(`- Base URL: ${meta.baseUrl}`);
  lines.push(`- Usuarios concurrentes por juego: ${meta.concurrency}`);
  lines.push(`- Juegos medidos: ${summary.totalGames}`);
  lines.push(`- Juegos con medida especifica: ${summary.measuredGames}`);
  lines.push(`- Juegos en bundle base compartido: ${summary.sharedBaseBundleGames.length}`);
  lines.push(`- SLA objetivo por fase: <= ${summary.slaThresholdMs} ms (P95)`);
  lines.push(`- Errores de sesión: ${summary.totalSessionErrors}`);
  lines.push(`- Errores de petición: ${summary.totalRequestErrors}`);
  lines.push("");
  lines.push("## SLA");
  lines.push("");
  lines.push(`- Start stage OK: ${summary.startStagePassGames.length}/${summary.measuredGames}`);
  lines.push(`- Ready to play OK: ${summary.readyToPlayPassGames.length}/${summary.measuredGames}`);
  if (summary.startStageFailGames.length) {
    lines.push(`- Fallan start stage: ${summary.startStageFailGames.map((item) => `${item.gameId} (${item.p95} ms)`).join(", ")}`);
  }
  if (summary.readyToPlayFailGames.length) {
    lines.push(`- Fallan ready to play: ${summary.readyToPlayFailGames.map((item) => `${item.gameId} (${item.p95} ms)`).join(", ")}`);
  }
  lines.push("");
  lines.push("## Peor P95 por inicio");
  lines.push("");
  lines.push("| Juego | Start Avg ms | Start P95 ms |");
  lines.push("| --- | ---: | ---: |");
  for (const item of summary.slowestStartByP95) {
    lines.push(`| ${item.gameId} | ${item.avg} | ${item.p95} |`);
  }
  lines.push("");
  lines.push("## Peor P95 listo para jugar");
  lines.push("");
  lines.push("| Juego | Ready Avg ms | Ready P95 ms |");
  lines.push("| --- | ---: | ---: |");
  for (const item of summary.slowestReadyByP95) {
    lines.push(`| ${item.gameId} | ${item.avg} | ${item.p95} |`);
  }
  lines.push("");
  lines.push("## Resultados completos");
  lines.push("");
  lines.push("| Juego | Modo | Start P95 ms | Gameplay P95 ms | Ready P95 ms | Total P95 ms | Errores |");
  lines.push("| --- | --- | ---: | ---: | ---: | ---: | ---: |");
  for (const item of results) {
    lines.push(
      `| ${item.gameId} | ${item.measurementMode} | ${formatMetric(item.startStageMs.p95)} | ${formatMetric(item.gameplayStageMs.p95)} | ${formatMetric(item.readyToPlayMs.p95)} | ${formatMetric(item.responseTimeMs.p95)} | ${item.errors.requestErrorCount} |`,
    );
  }
  lines.push("");
  if (summary.sharedBaseBundleGames.length) {
    lines.push("## Sin atribución por juego");
    lines.push("");
    lines.push("- Estos juegos están dentro del bundle base compartido en el escenario `warm-game-entry`.");
    lines.push("- El benchmark calienta `index.html` y recursos base antes de medir, así que no puede asignarles una latencia por juego sin otro modelo de medición.");
    lines.push(`- Juegos: ${summary.sharedBaseBundleGames.join(", ")}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  if (!fileExists(DIST_DIR) || !fileExists(MAIN_HTML_FILE)) {
    throw new Error("No existe dist/index.html. Ejecuta primero el build de producción.");
  }

  const mainHtmlText = readFile(MAIN_HTML_FILE);
  const mainBundleMatch = mainHtmlText.match(/<script[^>]+src="([^"]+)"/);
  if (!mainBundleMatch) {
    throw new Error("No se pudo localizar el bundle principal en dist/index.html.");
  }

  const mainBundleUrlPath = normalizeUrlPath(mainBundleMatch[1]);
  const mainBundleFilePath = resolveDistPathFromUrlPath(mainBundleUrlPath);
  const mainBundleText = readFile(mainBundleFilePath);

  const baseResourcePaths = dedupe(parseIndexBaseResources());
  const gameIds = parseGameIdsFromSource();
  const lazyChunkMap = parseLazyChunkMap(mainBundleText, gameIds);
  const profiles = buildProfiles({
    gameIds,
    baseResourcePaths,
    lazyChunkMap,
  });

  if (DEFAULT_SCENARIO === "warm-game-entry") {
    await warmBaseResources(DEFAULT_BASE_URL, baseResourcePaths);
  }

  const results = [];
  for (const profile of profiles) {
    // Keep execution sequential across games so the 3000-user load applies to one game at a time.
    /* eslint-disable no-await-in-loop */
    const result = await benchmarkProfile(DEFAULT_BASE_URL, profile, DEFAULT_CONCURRENCY);
    results.push(result);
    console.log(
      `${profile.gameId}: mode=${result.measurementMode} start_p95=${formatMetricLabel(result.startStageMs.p95)} ready_p95=${formatMetricLabel(result.readyToPlayMs.p95)} total_p95=${formatMetricLabel(result.responseTimeMs.p95)} errors=${result.errors.requestErrorCount}`,
    );
  }

  const summary = buildSummary(results);
  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      baseUrl: DEFAULT_BASE_URL,
      concurrency: DEFAULT_CONCURRENCY,
      scenario: DEFAULT_SCENARIO,
      readBodies: DEFAULT_READ_BODIES,
      requestTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
      excludedGameIds: [...EXCLUDED_GAME_IDS],
    },
    summary,
    results,
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(OUTPUT_DIR, `concurrency-benchmark-${timestamp}.json`);
  const markdownPath = path.join(OUTPUT_DIR, `concurrency-benchmark-${timestamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(markdownPath, buildSlaMarkdownReport(payload));

  console.log(`JSON: ${jsonPath}`);
  console.log(`MD: ${markdownPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
