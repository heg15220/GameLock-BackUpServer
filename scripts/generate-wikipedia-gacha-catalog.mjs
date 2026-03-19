import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import https from "node:https";
import path from "node:path";

const DEFAULT_OPTIONS = {
  language: "en",
  target: 10000,
  batchSize: 50,
  maxRequests: 0,
  sleepMs: 250,
  extractChars: 260,
  categoryLimit: 8,
  output: path.resolve("server/data/wikipedia-gacha/catalog.ndjson"),
  state: path.resolve("server/data/wikipedia-gacha/catalog.state.json"),
  meta: path.resolve("server/data/wikipedia-gacha/catalog.meta.json"),
  resume: true,
  userAgent:
    "WikipediaGachaCatalogGenerator/1.0 (local build; contact: maintainer@example.com)",
};

const RARITY_ORDER = ["C", "UC", "R", "SR", "SSR", "UR", "LR"];

const TOPIC_RULES = [
  { group: "History", keywords: ["history", "war", "empire", "ancient", "revolution"] },
  { group: "Science", keywords: ["science", "biology", "chemistry", "physics", "astronomy"] },
  { group: "Technology", keywords: ["technology", "computer", "software", "internet", "engineering"] },
  { group: "Geography", keywords: ["geography", "city", "country", "river", "mountain"] },
  { group: "Arts", keywords: ["art", "music", "painting", "film", "literature"] },
  { group: "Sports", keywords: ["sport", "football", "basketball", "olympic", "tennis"] },
  { group: "People", keywords: ["people", "biography", "births", "deaths"] },
];

function printHelp() {
  console.log(`
Usage:
  node scripts/generate-wikipedia-gacha-catalog.mjs [options]

Options:
  --language <code>        Wikipedia language code (default: en)
  --target <n>             Total entries to write (default: 10000)
  --batch-size <n>         Pages per API request, <= 50 recommended (default: 50)
  --max-requests <n>       Stop after N requests; 0 means unlimited (default: 0)
  --sleep-ms <n>           Delay between requests (default: 250)
  --extract-chars <n>      Max intro extract chars (default: 260)
  --category-limit <n>     Max categories stored per page (default: 8)
  --output <path>          NDJSON output file
  --state <path>           Resume state file
  --meta <path>            Build stats file
  --no-resume              Ignore previous state and start fresh
  --user-agent <text>      HTTP user-agent value
  --help                   Show this message

Examples:
  node scripts/generate-wikipedia-gacha-catalog.mjs --target 100000
  node scripts/generate-wikipedia-gacha-catalog.mjs --target 1000000 --sleep-ms 400
`);
}

function parseArgs(argv) {
  const options = { ...DEFAULT_OPTIONS };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help") {
      options.help = true;
      continue;
    }
    if (token === "--no-resume") {
      options.resume = false;
      continue;
    }
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected token: ${token}`);
    }

    const key = token.slice(2);
    const rawValue = argv[index + 1];
    if (rawValue === undefined || rawValue.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    index += 1;

    switch (key) {
      case "language":
        options.language = String(rawValue).trim() || DEFAULT_OPTIONS.language;
        break;
      case "target":
        options.target = Number(rawValue);
        break;
      case "batch-size":
        options.batchSize = Number(rawValue);
        break;
      case "max-requests":
        options.maxRequests = Number(rawValue);
        break;
      case "sleep-ms":
        options.sleepMs = Number(rawValue);
        break;
      case "extract-chars":
        options.extractChars = Number(rawValue);
        break;
      case "category-limit":
        options.categoryLimit = Number(rawValue);
        break;
      case "output":
        options.output = path.resolve(rawValue);
        break;
      case "state":
        options.state = path.resolve(rawValue);
        break;
      case "meta":
        options.meta = path.resolve(rawValue);
        break;
      case "user-agent":
        options.userAgent = String(rawValue).trim() || DEFAULT_OPTIONS.userAgent;
        break;
      default:
        throw new Error(`Unknown option: --${key}`);
    }
  }

  validateOptions(options);
  return options;
}

function validateOptions(options) {
  if (!Number.isFinite(options.target) || options.target <= 0) {
    throw new Error("target must be a positive number");
  }
  if (!Number.isFinite(options.batchSize) || options.batchSize <= 0) {
    throw new Error("batch-size must be a positive number");
  }
  if (options.batchSize > 50) {
    throw new Error("batch-size > 50 is not supported for anonymous MediaWiki API usage");
  }
  if (!Number.isFinite(options.maxRequests) || options.maxRequests < 0) {
    throw new Error("max-requests must be >= 0");
  }
  if (!Number.isFinite(options.sleepMs) || options.sleepMs < 0) {
    throw new Error("sleep-ms must be >= 0");
  }
  if (!Number.isFinite(options.extractChars) || options.extractChars < 0) {
    throw new Error("extract-chars must be >= 0");
  }
  if (!Number.isFinite(options.categoryLimit) || options.categoryLimit < 0) {
    throw new Error("category-limit must be >= 0");
  }
}

function createInitialState(language) {
  return {
    version: 1,
    language,
    continueParams: null,
    continueToken: null,
    totalWritten: 0,
    requestCount: 0,
    rarityCounts: Object.fromEntries(RARITY_ORDER.map((rarity) => [rarity, 0])),
    topicCounts: {},
    recentPageIds: [],
    updatedAt: new Date().toISOString(),
  };
}

async function loadState(options) {
  if (!options.resume) {
    return createInitialState(options.language);
  }
  try {
    const raw = await readFile(options.state, "utf8");
    const parsed = JSON.parse(raw);
    const hydrated = {
      ...createInitialState(options.language),
      ...parsed,
      language: options.language,
    };

    // Legacy state files only tracked gapcontinue as a string token.
    if (
      !hydrated.continueParams &&
      typeof hydrated.continueToken === "string" &&
      hydrated.continueToken.trim()
    ) {
      hydrated.continueParams = {
        continue: "gapcontinue||",
        gapcontinue: hydrated.continueToken,
      };
    }

    return hydrated;
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return createInitialState(options.language);
    }
    throw error;
  }
}

async function persistState(state, options) {
  state.updatedAt = new Date().toISOString();
  await mkdir(path.dirname(options.state), { recursive: true });
  await writeFile(options.state, JSON.stringify(state, null, 2), "utf8");
}

async function persistMeta(state, options) {
  const payload = {
    generatedAt: new Date().toISOString(),
    language: state.language,
    totalEntries: state.totalWritten,
    requestCount: state.requestCount,
    continueToken: state.continueToken ?? null,
    rarityCounts: state.rarityCounts,
    topicCounts: state.topicCounts,
  };
  await mkdir(path.dirname(options.meta), { recursive: true });
  await writeFile(options.meta, JSON.stringify(payload, null, 2), "utf8");
}

function normalizeWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function cleanExtract(value) {
  return normalizeWhitespace(
    String(value ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\([^)]*listen[^)]*\)/gi, " ")
      .replace(/\[[^\]]+\]/g, " ")
  );
}

function normalizeCategoryTitle(value) {
  const normalized = normalizeWhitespace(value).replace(/^Category:/i, "");
  return normalized.slice(0, 80);
}

function inferTopicGroup(title, categories) {
  const bag = `${title} ${categories.join(" ")}`.toLowerCase();
  for (const rule of TOPIC_RULES) {
    if (rule.keywords.some((keyword) => bag.includes(keyword))) {
      return rule.group;
    }
  }
  return "General";
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function deterministicNoise(pageId) {
  const value = (Number(pageId) * 2654435761) >>> 0;
  return value / 4294967295;
}

function computeSyntheticStats(page) {
  const contentLength = clampNumber(Number(page.length) || 1800, 300, 2_000_000);
  const baseSections = Math.round(Math.log2(contentLength));
  const sectionCount = clampNumber(baseSections, 3, 40);
  const referenceCount = clampNumber(Math.round(contentLength / 700), 4, 1000);
  const noise = deterministicNoise(page.pageid);
  const pageviews30d = Math.round(
    clampNumber(contentLength * 5 + noise * 220_000, 1200, 3_000_000)
  );
  const qualityScore = clampNumber(
    Math.round(
      Math.log10(contentLength + 1) * 16 +
        Math.min(26, referenceCount / 6) +
        Math.min(22, sectionCount) +
        Math.min(40, pageviews30d / 10_000)
    ),
    5,
    110
  );

  return { contentLength, sectionCount, referenceCount, pageviews30d, qualityScore };
}

function toSlug(title) {
  return String(title ?? "").trim().replace(/\s+/g, "_");
}

function mapPageToSeed(page, language, options) {
  const title = normalizeWhitespace(page.title);
  const slug = toSlug(title);
  const categories = (page.categories ?? [])
    .map((entry) => normalizeCategoryTitle(entry.title))
    .filter(Boolean)
    .slice(0, options.categoryLimit);
  const topicGroup = inferTopicGroup(title, categories);
  const extractText = cleanExtract(page.extract).slice(0, options.extractChars);
  const imageUrl = page.original?.source ?? page.thumbnail?.source ?? null;
  const stats = computeSyntheticStats(page);

  return {
    wikipediaPageId: page.pageid,
    title,
    slug,
    extractText,
    contentLength: stats.contentLength,
    sectionCount: stats.sectionCount,
    referenceCount: stats.referenceCount,
    pageviews30d: stats.pageviews30d,
    qualityScore: stats.qualityScore,
    topicGroup,
    categories,
    imageUrl,
    languageCode: language,
    sourceUrl: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(slug)}`,
  };
}

function getRarityFromQScore(score) {
  if (score >= 100) return "LR";
  if (score >= 90) return "UR";
  if (score >= 80) return "SSR";
  if (score >= 60) return "SR";
  if (score >= 35) return "R";
  if (score >= 20) return "UC";
  return "C";
}

function buildApiUrl(options, continueToken) {
  const url = new URL(`https://${options.language}.wikipedia.org/w/api.php`);
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("generator", "allpages");
  url.searchParams.set("gapnamespace", "0");
  url.searchParams.set("gapfilterredir", "nonredirects");
  url.searchParams.set("gaplimit", String(options.batchSize));
  url.searchParams.set("prop", "info|extracts|pageimages|categories");
  url.searchParams.set("inprop", "url");
  url.searchParams.set("exintro", "1");
  url.searchParams.set("explaintext", "1");
  url.searchParams.set("exchars", String(options.extractChars));
  url.searchParams.set("piprop", "original|thumbnail");
  url.searchParams.set("pithumbsize", "1200");
  // Ask MediaWiki for the maximum category payload to reduce clcontinue loops.
  url.searchParams.set("cllimit", "max");
  if (continueToken && typeof continueToken === "object") {
    for (const [key, value] of Object.entries(continueToken)) {
      url.searchParams.set(key, String(value));
    }
  } else {
    // Required for modern MediaWiki continuation API.
    url.searchParams.set("continue", "");
  }
  return url.toString();
}

function sleep(ms) {
  if (!ms) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestJson(url, userAgent) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": userAgent,
        },
      },
      (response) => {
        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`HTTP_${response.statusCode}`));
          response.resume();
          return;
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          try {
            const text = Buffer.concat(chunks).toString("utf8");
            resolve(JSON.parse(text));
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    request.setTimeout(12000, () => {
      request.destroy(new Error("request_timeout"));
    });
    request.on("error", reject);
  });
}

async function requestJsonWithRetry(url, options, retries = 4) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await requestJson(url, options.userAgent);
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }
      const backoffMs = 500 * (2 ** attempt);
      console.warn(`request failed (${error.message}), retrying in ${backoffMs}ms`);
      await sleep(backoffMs);
    }
  }
  throw new Error("retry_loop_failed");
}

function keepRecentPageIds(ids, max = 5000) {
  if (ids.length <= max) return ids;
  return ids.slice(ids.length - max);
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    printHelp();
    return;
  }

  const state = await loadState(options);
  const knownRecent = new Set(state.recentPageIds ?? []);

  await mkdir(path.dirname(options.output), { recursive: true });
  const outputStream = createWriteStream(options.output, {
    flags: options.resume ? "a" : "w",
    encoding: "utf8",
  });

  console.log(
    `Starting catalog generation: target=${options.target}, written=${state.totalWritten}, language=${options.language}`
  );

  try {
    while (state.totalWritten < options.target) {
      if (options.maxRequests > 0 && state.requestCount >= options.maxRequests) {
        console.log("Reached max-requests limit.");
        break;
      }

      const requestUrl = buildApiUrl(options, state.continueParams);
      const payload = await requestJsonWithRetry(requestUrl, options);
      state.requestCount += 1;

      const pages = Array.isArray(payload?.query?.pages) ? payload.query.pages : [];
      const nextContinue =
        payload?.continue && typeof payload.continue === "object"
          ? payload.continue
          : null;
      const nextToken = nextContinue?.gapcontinue ?? null;
      const hasContinuation = Boolean(nextContinue && Object.keys(nextContinue).length > 0);

      if (!pages.length) {
        if (!hasContinuation) {
          console.log("No pages returned and no continuation token. Stopping.");
          break;
        }

        state.continueParams = nextContinue;
        state.continueToken = nextToken;
        await persistState(state, options);
        await persistMeta(state, options);
        console.log(
          `request=${state.requestCount} batch=0 total=${state.totalWritten} next=${
            nextToken ?? nextContinue?.clcontinue ?? "none"
          } (empty batch, continuing)`
        );
        await sleep(options.sleepMs);
        continue;
      }

      let writtenInBatch = 0;
      for (const page of pages) {
        if (state.totalWritten >= options.target) {
          break;
        }
        if (!Number.isFinite(Number(page?.pageid)) || !page?.title) {
          continue;
        }
        const pageId = Number(page.pageid);
        if (knownRecent.has(pageId)) {
          continue;
        }

        const seed = mapPageToSeed(page, options.language, options);
        outputStream.write(`${JSON.stringify(seed)}\n`);
        writtenInBatch += 1;
        state.totalWritten += 1;

        const rarity = getRarityFromQScore(seed.qualityScore);
        state.rarityCounts[rarity] = (state.rarityCounts[rarity] ?? 0) + 1;
        state.topicCounts[seed.topicGroup] = (state.topicCounts[seed.topicGroup] ?? 0) + 1;

        knownRecent.add(pageId);
        state.recentPageIds.push(pageId);
      }

      state.recentPageIds = keepRecentPageIds(state.recentPageIds, 5000);
      knownRecent.clear();
      for (const value of state.recentPageIds) {
        knownRecent.add(value);
      }

      state.continueParams = nextContinue;
      state.continueToken = nextToken;

      await persistState(state, options);
      await persistMeta(state, options);

      console.log(
        `request=${state.requestCount} batch=${writtenInBatch} total=${state.totalWritten} next=${
          nextToken ?? nextContinue?.clcontinue ?? "none"
        }`
      );

      if (!hasContinuation) {
        console.log("Reached end of allpages stream. Resetting continuation token.");
        state.continueParams = null;
        state.continueToken = null;
      }

      await sleep(options.sleepMs);
    }
  } finally {
    outputStream.end();
  }

  await persistState(state, options);
  await persistMeta(state, options);
  console.log("Done.");
  console.log(
    `Output: ${options.output}\nState: ${options.state}\nMeta: ${options.meta}\nTotal entries: ${state.totalWritten}`
  );
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
