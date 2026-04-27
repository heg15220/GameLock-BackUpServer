// Frontend concurrency test — 500 concurrent fetches against the static
// preview server, exercising:
//   1. App-open: index.html + main bundle (cold cache)
//   2. Game-open: each game's lazy chunk (one fetch per game-id, 500x concurrent)
//
// Note: "play" and "active gameplay" for frontend-only games run entirely in
// the user's browser, so concurrency does not affect their latency. The
// per-client cost of those phases is covered by tests/bench/bench.spec.js.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { request, destroyAllAgents, waitForHealth } from "./lib/http-client.mjs";
import { runScenario } from "./lib/load-runner.mjs";
import { summarize, classify, formatTable } from "./lib/stats.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const RESULTS_DIR = path.join(__dirname, "results");

const VU_COUNT = Number(process.env.CONCURRENCY_VUS || 500);
const THRESHOLD_MS = Number(process.env.CONCURRENCY_THRESHOLD_MS || 500);
const PREVIEW_BASE = process.env.PREVIEW_BASE || "http://127.0.0.1:4173";

// Map registry game ID → expected dist asset prefix. Some games share a host
// component (KnowledgeArcadeGame variants, RetroClassicsGame variants), so
// they all resolve to the same chunk and are deduped before fetching.
// Some chunks named index-{hash}.js (one per nested-folder game) cannot be
// matched by name. For those we grep dist/assets/index-*.js for a
// well-chosen unique string. (inlined-in-main) means the game's code is
// small enough that Vite folded it into the entry bundle — its open-time
// cost equals the main-bundle measurement.
const GAME_CONTENT_MARKERS = {
  "knowledge-wikipedia-gacha":   "wikipedia_gacha_browser_token",
  "arcade-reactor-toss":         "FluxBasinRuntime",
  "arcade-territory-war":        "Tactical stickman combat",
  "arcade-orchard-match-blast":  "arcade_orchard_match_blast_rebuild_v3",
  "arcade-billar-pool-club":     "Carambola Libre",
  "arcade-bowling-pro-tour":     "Bowling Pro Tour",
  "arcade-penalty-neural-keeper": "Abajo izquierda",
  "arcade-cosmic-vanguard":      "cosmic-vanguard-game",
  "arcade-archery-horizon":      "arcade_archery_horizon_save_v1",
  "arcade-pinball-wizard":       "mini-game pinball-game",
  "arcade-ice-strike-pro":       "Aim to button",
  "arcade-stick-brawl-showdown": "stick-brawl-showdown-frame-wrap",
  "arcade-neon-crypt":           "neon_crypt_hi",
  "arcade-neon-rush":            "arcade-neon-rush-stage-fit",
  "arcade-kitchen-rush-2d":      "Llevar plato a Entrega",
  "arcade-dig-hole-treasure":    "arcade-dig-hole-treasure-shell",
  "arcade-valle-tranquilo":      "arcade-valle-tranquilo-shell",
  "sports-basketball-court":     "sports_basketball_court_v1",
  "arcade-retro-snake-classic":  "Breakout 1986 Remix",
  "arcade-retro-breakout-1986":  "Breakout 1986 Remix",
  "arcade-retro-space-invaders": "Breakout 1986 Remix",
  "arcade-retro-tetris-blockfall": "Breakout 1986 Remix",
  "arcade-retro-frogger-crossing": "Breakout 1986 Remix",
  "arcade-retro-bomber-grid":    "Breakout 1986 Remix",
  "arcade-retro-galaga-quantum": "Breakout 1986 Remix",
  "arcade-retro-qbert-prism":    "Breakout 1986 Remix",
  "arcade-retro-lunar-lander-orbit": "Breakout 1986 Remix",
  "arcade-retro-centipede-circuit": "Breakout 1986 Remix",
  "arcade-retro-river-raid-neon": "Breakout 1986 Remix",
  "arcade-retro-tron-lightcycles": "Breakout 1986 Remix",
  "arcade-retro-road-fighter-synth": "Breakout 1986 Remix",
};

const GAME_TO_CHUNK_PREFIX = {
  "adventure-echoes":            "AdventureGame",
  "action-core-strike":          "ActionGame",
  "racing-neon-lanes":           "RacingGame",
  "knowledge-quiz-nexus":        "KnowledgeGame",
  "knowledge-logic-vault":       "KnowledgeGame",
  "knowledge-iq-masters-protocol": "IQMastersKnowledgeGame",
  "knowledge-refranes-clasicos": "KnowledgeArcadeGame",
  "knowledge-wikipedia-gacha":   "wikipedia-gacha",
  "knowledge-sudoku-sprint":     "KnowledgeArcadeGame",
  "knowledge-domino-chain":      "DominoStrategyGame",
  "knowledge-ahorcado-flash":    "KnowledgeArcadeGame",
  "knowledge-paciencia-lite":    "KnowledgeArcadeGame",
  "knowledge-puzle-deslizante":  "KnowledgeArcadeGame",
  "knowledge-crucigrama-mini":   "KnowledgeArcadeGame",
  "knowledge-sopa-letras-mega":  "KnowledgeArcadeGame",
  "knowledge-wordle-pro":        "KnowledgeArcadeGame",
  "knowledge-anagramas-pro":     "KnowledgeArcadeGame",
  "knowledge-calculo-mental-flash10": "KnowledgeArcadeGame",
  "knowledge-tabla-periodica-total": "KnowledgeArcadeGame",
  "knowledge-mapas-atlas":       "KnowledgeArcadeGame",
  "knowledge-mapas-camino-corto": "KnowledgeArcadeGame",
  "knowledge-adivina-pais-silueta": "KnowledgeArcadeGame",
  "knowledge-tangram-pro":       "KnowledgeArcadeGame",
  "knowledge-cronologia-maestra": "KnowledgeArcadeGame",
  "strategy-chess-grandmaster":  "ChessGame",
  "strategy-damas-clasicas":     "CheckersGame",
  "strategy-sudoku-tecnicas":    "StrategySudokuGame",
  "strategy-hundir-flota-pro":   "StrategyBattleshipGame",
  "strategy-poker-holdem-no-bet": "PokerTexasHoldemGame",
  "strategy-parchis-ludoteka":   "ParchisStrategyGame",
  "strategy-baraja-ia-arena":    "StrategyBarajaModesGame",
  "strategy-mansion-triple-enigma": "StrategyMansionTripleEnigmaGame",
  "rpg-emberfall":               "RpgGame",
  "platformer-sky-runner":       "PlatformerGame",
  "fighter-neon-dojo":           "FighterGame",
  "sports-head-soccer-arena":    "HeadSoccerGame",
  "arcade-pacman-maze-protocol": "PacmanGame",
  "arcade-reactor-toss":         "reactor-toss",
  "arcade-territory-war":        "territory-war",
  "arcade-orchard-match-blast":  "orchard-match-blast",
  "arcade-billar-pool-club":     "billiards-club",
  "arcade-bowling-pro-tour":     "bowling-pro",
  "arcade-penalty-neural-keeper": "penalty-neural-keeper",
  "arcade-cosmic-vanguard":      "cosmic-vanguard",
  "arcade-golf-tour-2d":         "golf-tour-2d",
  "arcade-archery-horizon":      "archery-horizon",
  "arcade-pinball-wizard":       "pinball-wizard",
  "arcade-bubble-storm":         "bubble-storm",
  "arcade-ice-strike-pro":       "ice-strike-pro",
  "arcade-stick-brawl-showdown": "stick-brawl-showdown",
  "arcade-neon-crypt":           "neon-crypt",
  "arcade-neon-rush":            "neon-rush",
  "arcade-kitchen-rush-2d":      "kitchen-rush-2d",
  "arcade-dig-hole-treasure":    "dig-hole-treasure",
  "arcade-valle-tranquilo":      "valle-tranquilo",
  "sports-basketball-court":     "basketball-court",
  "arcade-pong-neon-arena":      "PongGame",
  "arcade-buscaminas-classic":   "MinesweeperGame",
  "arcade-retro-snake-classic":  "retro-classics",
  "arcade-retro-breakout-1986":  "retro-classics",
  "arcade-retro-space-invaders": "retro-classics",
  "arcade-retro-tetris-blockfall": "retro-classics",
  "arcade-retro-frogger-crossing": "retro-classics",
  "arcade-retro-bomber-grid":    "retro-classics",
  "arcade-retro-galaga-quantum": "retro-classics",
  "arcade-retro-qbert-prism":    "retro-classics",
  "arcade-retro-lunar-lander-orbit": "retro-classics",
  "arcade-retro-centipede-circuit": "retro-classics",
  "arcade-retro-river-raid-neon": "retro-classics",
  "arcade-retro-tron-lightcycles": "retro-classics",
  "arcade-retro-road-fighter-synth": "retro-classics",
  "racing-race2dpro":            "RaceGame2DPro",
  "racing-sunset-slipstream":    "midnight-traffic",
};

async function loadDistAssets() {
  const assetsDir = path.join(REPO_ROOT, "dist", "assets");
  const indexHtmlPath = path.join(REPO_ROOT, "dist", "index.html");
  const indexHtml = await fs.readFile(indexHtmlPath, "utf8");
  const mainJs = indexHtml.match(/src="(\/assets\/index-[a-f0-9]+\.js)"/)?.[1] ?? null;
  const mainCss = indexHtml.match(/href="(\/assets\/index-[a-f0-9]+\.css)"/)?.[1] ?? null;
  const files = await fs.readdir(assetsDir);
  const jsFiles = files.filter((file) => file.endsWith(".js"));
  return { mainJs, mainCss, jsFiles, assetsDir };
}

async function findChunkByMarker(assetsDir, jsFiles, marker, mainJs) {
  // Scan all index-*.js files except the main entry; first one that contains
  // the marker wins. Limit reads to avoid loading 100+ MB of bundles.
  const mainBasename = mainJs ? mainJs.replace("/assets/", "") : null;
  const candidates = jsFiles.filter((file) => /^index-[a-f0-9]+\.js$/.test(file) && file !== mainBasename);
  for (const file of candidates) {
    const buf = await fs.readFile(path.join(assetsDir, file), "utf8");
    if (buf.includes(marker)) return `/assets/${file}`;
  }
  return null;
}

function resolveChunkUrl(prefix, jsFiles) {
  // Match a chunk filename starting with the prefix. Vite emits names like
  // {name}-{hash}.js. Some prefixes (e.g. "retro-classics") match a file
  // ending in -{hash}.js with no `Game` suffix, so be permissive.
  const escaped = prefix.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const re = new RegExp(`^${escaped}(-[a-z0-9]+)?-[a-f0-9]+\\.js$`, "i");
  const fallbackRe = new RegExp(`^${escaped}.*\\.js$`, "i");
  const exact = jsFiles.find((file) => re.test(file));
  if (exact) return `/assets/${exact}`;
  const fuzzy = jsFiles.find((file) => fallbackRe.test(file));
  return fuzzy ? `/assets/${fuzzy}` : null;
}

async function runConcurrentFetches({ phase, urlBuilder, vuCount }) {
  const scenario = async (vuId) => [
    {
      phase,
      fn: () => request({ url: `${PREVIEW_BASE}${urlBuilder(vuId)}`, timeoutMs: 15_000 }),
    },
  ];
  return runScenario({ vuCount, scenario });
}

async function main() {
  await fs.mkdir(RESULTS_DIR, { recursive: true });
  console.log(`Frontend concurrency test — VUs=${VU_COUNT}, threshold=${THRESHOLD_MS} ms`);
  console.log(`Preview base: ${PREVIEW_BASE}`);

  const { mainJs, mainCss, jsFiles, assetsDir } = await loadDistAssets();
  if (!mainJs) throw new Error("Could not extract main bundle URL from dist/index.html — run `npm run build` first.");
  console.log(`Main bundle: ${mainJs}`);
  await waitForHealth(`${PREVIEW_BASE}/`, { timeoutMs: 15_000 });

  // ─── App open ────────────────────────────────────────────────────────────
  const appOpenIndex = await runConcurrentFetches({
    phase: "open_index_html",
    urlBuilder: () => "/",
    vuCount: VU_COUNT,
  });
  const appOpenBundle = await runConcurrentFetches({
    phase: "open_main_bundle",
    urlBuilder: () => mainJs,
    vuCount: VU_COUNT,
  });

  const indexStats = summarize(appOpenIndex.success.open_index_html ?? []);
  const bundleStats = summarize(appOpenBundle.success.open_main_bundle ?? []);
  const appRows = [
    {
      phase: "app · index.html",
      ok: indexStats.count,
      err: appOpenIndex.errors.length,
      "avg(ms)": indexStats.avg ?? "-",
      "p95(ms)": indexStats.p95 ?? "-",
      "p99(ms)": indexStats.p99 ?? "-",
      "max(ms)": indexStats.max ?? "-",
      verdict: classify(indexStats.avg, THRESHOLD_MS),
    },
    {
      phase: "app · main bundle",
      ok: bundleStats.count,
      err: appOpenBundle.errors.length,
      "avg(ms)": bundleStats.avg ?? "-",
      "p95(ms)": bundleStats.p95 ?? "-",
      "p99(ms)": bundleStats.p99 ?? "-",
      "max(ms)": bundleStats.max ?? "-",
      verdict: classify(bundleStats.avg, THRESHOLD_MS),
    },
  ];

  console.log("\n=== APP OPEN (500 concurrent) ===");
  console.log(formatTable(appRows));

  // ─── Per-game lazy chunk fetch ───────────────────────────────────────────
  const gameRows = [];
  const gameDetails = [];
  const gameIds = Object.keys(GAME_TO_CHUNK_PREFIX);

  // Dedupe by chunk URL so we only stress each unique chunk once. Multiple
  // game IDs that share the same component (e.g. KnowledgeArcade variants)
  // are reported under each ID with the same numbers.
  const chunkByGameId = {};
  const uniqueChunks = new Map(); // chunkUrl -> stats
  for (const id of gameIds) {
    let url = resolveChunkUrl(GAME_TO_CHUNK_PREFIX[id], jsFiles);
    if (!url && GAME_CONTENT_MARKERS[id]) {
      url = await findChunkByMarker(assetsDir, jsFiles, GAME_CONTENT_MARKERS[id], mainJs);
    }
    chunkByGameId[id] = url;
  }

  const distinct = [...new Set(Object.values(chunkByGameId).filter(Boolean))];
  console.log(`\nFound ${distinct.length} distinct game chunks for ${gameIds.length} game IDs.`);

  let processed = 0;
  for (const url of distinct) {
    processed += 1;
    process.stdout.write(`\r  [${String(processed).padStart(2)}/${distinct.length}] ${url}    `);
    const result = await runConcurrentFetches({
      phase: "open_game_chunk",
      urlBuilder: () => url,
      vuCount: VU_COUNT,
    });
    uniqueChunks.set(url, {
      stats: summarize(result.success.open_game_chunk ?? []),
      errors: result.errors.length,
    });
  }
  process.stdout.write("\n");

  for (const id of gameIds) {
    const url = chunkByGameId[id];
    if (!url) {
      gameRows.push({ id, chunk: "(not found)", ok: 0, err: 0, "avg(ms)": "-", "p95(ms)": "-", "p99(ms)": "-", "max(ms)": "-", verdict: "unknown" });
      gameDetails.push({ id, chunk: null, stats: null });
      continue;
    }
    const entry = uniqueChunks.get(url);
    gameRows.push({
      id,
      chunk: url.replace("/assets/", ""),
      ok: entry.stats.count,
      err: entry.errors,
      "avg(ms)": entry.stats.avg ?? "-",
      "p95(ms)": entry.stats.p95 ?? "-",
      "p99(ms)": entry.stats.p99 ?? "-",
      "max(ms)": entry.stats.max ?? "-",
      verdict: classify(entry.stats.avg, THRESHOLD_MS),
    });
    gameDetails.push({ id, chunk: url, stats: entry.stats, errors: entry.errors });
  }

  console.log("\n=== GAME OPEN — lazy chunk fetch (500 concurrent) ===");
  console.log(formatTable(gameRows));

  const failingGames = gameRows.filter((row) => row.verdict === "fail");
  const unknownGames = gameRows.filter((row) => row.verdict === "unknown");
  const failingApp = appRows.filter((row) => row.verdict === "fail");

  if (failingApp.length === 0 && failingGames.length === 0) {
    console.log(`\n✅ All frontend phases within ${THRESHOLD_MS} ms avg`);
  } else {
    if (failingApp.length > 0) console.log(`\n❌ ${failingApp.length} app-open phase(s) above ${THRESHOLD_MS} ms avg`);
    if (failingGames.length > 0) console.log(`❌ ${failingGames.length}/${gameIds.length} games above ${THRESHOLD_MS} ms avg`);
  }
  if (unknownGames.length > 0) {
    console.log(`! ${unknownGames.length} games could not be matched to a chunk: ${unknownGames.map((row) => row.id).join(", ")}`);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const payload = {
    startedAt: new Date().toISOString(),
    vuCount: VU_COUNT,
    thresholdMs: THRESHOLD_MS,
    previewBase: PREVIEW_BASE,
    appOpen: {
      indexHtml: { stats: indexStats, errors: appOpenIndex.errors.length },
      mainBundle: { url: mainJs, stats: bundleStats, errors: appOpenBundle.errors.length },
    },
    perGame: gameDetails,
  };
  const out = path.join(RESULTS_DIR, `frontend-${stamp}.json`);
  await fs.writeFile(out, JSON.stringify(payload, null, 2));
  await fs.writeFile(path.join(RESULTS_DIR, "frontend-latest.json"), JSON.stringify(payload, null, 2));
  console.log(`\nReport: ${out}`);

  destroyAllAgents();
  if (failingApp.length > 0 || failingGames.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  destroyAllAgents();
  process.exit(2);
});
