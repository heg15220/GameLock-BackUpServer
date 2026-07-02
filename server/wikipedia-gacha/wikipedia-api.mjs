/**
 * wikipedia-api.mjs
 *
 * Thin client for the MediaWiki Action API.
 *
 * Single exported function — fetchRandomArticles(count) — batches up to 50
 * random mainspace articles per request, pulling extracts, thumbnail images,
 * 30-day pageview counts, and category names in one round-trip.
 *
 * Rate-limited to ~5 requests/second (200 ms minimum gap) to stay well below
 * Wikipedia's published limits while still allowing fast pool warm-up.
 *
 * Uses node:https directly for compatibility with Node.js 16+.
 */

import https from "node:https";
import process from "node:process";

const WIKIPEDIA_API_PATH = "/w/api.php";

// Wikimedia's User-Agent policy (https://meta.wikimedia.org/wiki/User-Agent_policy)
// REQUIRES a contact URL or email. A generic agent without one gets rate-limited
// (HTTP 429) aggressively. Override via WIKIPEDIA_GACHA_USER_AGENT to set a real
// contact for this deployment.
const USER_AGENT =
  process.env.WIKIPEDIA_GACHA_USER_AGENT ||
  "WikipediaGachaGame/1.0 (https://www.game-lock.com; contact: wikipedia-gacha@game-lock.com)";

/** Minimum milliseconds between consecutive Wikipedia API requests. */
const REQUEST_INTERVAL_MS = 200;
/** Fallback cool-off when a 429/503 arrives without a usable Retry-After. */
const DEFAULT_BACKOFF_MS = 60_000;
/** Never honor a Retry-After longer than this (guards against absurd values). */
const MAX_BACKOFF_MS = 10 * 60 * 1000;

let _lastRequestAt = 0;
/** Epoch ms until which all requests must pause after a rate-limit response. */
let _cooldownUntil = 0;

async function _throttle() {
  const now = Date.now();
  // Respect an active rate-limit cool-off before the normal inter-request gap.
  const cooldownWait = Math.max(0, _cooldownUntil - now);
  const gapWait = Math.max(0, _lastRequestAt + REQUEST_INTERVAL_MS - now);
  const wait = Math.max(cooldownWait, gapWait);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  _lastRequestAt = Date.now();
}

/** Parse a Retry-After header (seconds or HTTP-date) into milliseconds. */
function parseRetryAfterMs(headerValue) {
  if (!headerValue) return null;
  const seconds = Number(headerValue);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const dateMs = Date.parse(headerValue);
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
  return null;
}

function normalizeLanguage(value) {
  return String(value ?? "").toLowerCase().startsWith("es") ? "es" : "en";
}

function resolveApiHost(languageCode) {
  return `${normalizeLanguage(languageCode)}.wikipedia.org`;
}

/**
 * Perform an HTTPS GET request and return the parsed JSON body.
 * @param {string} path  Full path + query string
 * @param {number} timeoutMs
 */
function httpsGetJson(path, languageCode = "en", timeoutMs = 20_000) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      {
        hostname: resolveApiHost(languageCode),
        path,
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          // On a rate-limit / overload response, arm a global cool-off so the
          // background refill stops hammering Wikipedia (which is what earns a
          // longer ban). _throttle() will pause all callers until it clears.
          if (res.statusCode === 429 || res.statusCode === 503) {
            const retryMs = parseRetryAfterMs(res.headers["retry-after"]);
            const backoffMs = Math.min(
              MAX_BACKOFF_MS,
              retryMs ?? DEFAULT_BACKOFF_MS,
            );
            _cooldownUntil = Date.now() + backoffMs;
            reject(
              new Error(
                `Wikipedia API HTTP ${res.statusCode} — backing off ${Math.round(backoffMs / 1000)}s`,
              ),
            );
            return;
          }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`Wikipedia API HTTP ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (err) {
            reject(new Error(`Wikipedia API JSON parse error: ${err.message}`));
          }
        });
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("Wikipedia API request timed out"));
    });
  });
}

/** Sum all daily pageview values from the pvMap returned by the API. */
function _sumPageviews(pvMap) {
  if (!pvMap || typeof pvMap !== "object") return 0;
  return Object.values(pvMap).reduce((s, v) => s + (Number(v) || 0), 0);
}

/** Minimum extract length (chars) for an article to enter the pool. */
const MIN_EXTRACT_LENGTH = 60;
const PREVIEW_EXTRACT_LENGTH = 600;
const DETAIL_EXTRACT_LENGTH = 2400;

/**
 * Convert one raw MediaWiki page object into our article-seed shape.
 * Returns null for redirects, disambiguation pages, stubs with no
 * extractable prose, or missing pages.
 */
export function pageToArticleSeed(page, languageCode = "en") {
  if (!page || !page.pageid || page.missing || page.redirect) return null;

  const locale = normalizeLanguage(languageCode);

  // Disambiguation pages (detected via pageprops set by the API)
  if (page.pageprops?.disambiguation !== undefined) return null;

  const title = String(page.title ?? "").trim();
  if (!title) return null;

  // Skip non-article namespaces that slip through
  if (
    title.startsWith("Wikipedia:") ||
    title.startsWith("Template:") ||
    title.startsWith("Plantilla:") ||
    title.startsWith("Category:") ||
    title.startsWith("Categoría:") ||
    title.startsWith("File:") ||
    title.startsWith("Archivo:") ||
    title.startsWith("Help:") ||
    title.startsWith("Ayuda:") ||
    title.startsWith("Portal:")
  ) {
    return null;
  }

  const normalizedExtract = String(page.extract ?? "").replace(/\s+/g, " ").trim();

  // Drop articles whose extract is empty, too short to be useful, or is a
  // disambiguation list ("X may refer to:").
  if (
    normalizedExtract.length < MIN_EXTRACT_LENGTH ||
    normalizedExtract.includes(" may refer to:") ||
    normalizedExtract.includes(" can refer to:") ||
    (locale === "es" && (
      normalizedExtract.includes(" puede referirse a:") ||
      normalizedExtract.includes(" hace referencia a:")
    ))
  ) {
    return null;
  }

  const trimmedExtract = normalizedExtract.slice(0, PREVIEW_EXTRACT_LENGTH);
  const longExtract = normalizedExtract.slice(0, DETAIL_EXTRACT_LENGTH);

  // page.length is byte count of the wikitext source
  const contentLength = Number(page.length) || Math.max(500, longExtract.length * 4);
  const pageviews30d = _sumPageviews(page.pageviews);
  const imageUrl = page.thumbnail?.source ?? null;

  const categories = (page.categories ?? [])
    .map((c) => String(c.title ?? "").replace(/^Category:/, "").trim())
    .filter(Boolean)
    .slice(0, 8);

  return {
    pageid: page.pageid,
    title,
    slug: title.replace(/\s+/g, "_"),
    extract: trimmedExtract,
    longExtract,
    contentLength,
    pageviews30d,
    imageUrl,
    categories,
    languageCode: locale,
  };
}

/**
 * Fetch metadata for a specific list of article titles (up to 50 per call).
 * Returns the same article-seed shape as fetchRandomArticles.
 * Used to enrich hardcoded static articles with live imageUrl / pageviews.
 *
 * @param {string[]} titles  Wikipedia article titles (spaces, not underscores)
 * @returns {Promise<Array>}
 */
export async function fetchArticlesByTitles(titles, options = {}) {
  if (!titles.length) return [];
  const batch = titles.slice(0, 50);
  const languageCode = normalizeLanguage(options.language);
  await _throttle();

  const params = new URLSearchParams({
    action:        "query",
    format:        "json",
    formatversion: "2",
    titles:        batch.join("|"),
    prop:          "extracts|pageimages|info|pageviews|categories|pageprops",
    exintro:       "1",
    exchars:       String(DETAIL_EXTRACT_LENGTH),
    explaintext:   "1",
    piprop:        "thumbnail",
    pithumbsize:   "400",
    pvipdays:      "30",
    cllimit:       "5",
    clshow:        "!hidden",
    ppprop:        "disambiguation",
  });

  const json = await httpsGetJson(`${WIKIPEDIA_API_PATH}?${params}`, languageCode);
  return Object.values(json?.query?.pages ?? {})
    .map((page) => pageToArticleSeed(page, languageCode))
    .filter(Boolean);
}

/**
 * Fetch up to 50 random mainspace Wikipedia articles with full metadata.
 *
 * Uses generator=random so a single HTTP request returns N pages with
 * their extracts, thumbnails, pageviews, and categories — no follow-up
 * requests needed.
 *
 * @param {number} count  1–50
 * @returns {Promise<Array>}  Array of article-seed objects.
 */
export async function fetchRandomArticles(count = 50, options = {}) {
  const n = Math.min(50, Math.max(1, count));
  const languageCode = normalizeLanguage(options.language);
  await _throttle();

  const params = new URLSearchParams({
    action:        "query",
    format:        "json",
    formatversion: "2",
    generator:     "random",
    grnnamespace:  "0",       // mainspace only
    grnlimit:      String(n),
    prop:          "extracts|pageimages|info|pageviews|categories|pageprops",
    exintro:       "1",       // intro section only (required for exchars to work reliably)
    exchars:       String(DETAIL_EXTRACT_LENGTH),     // character limit — more reliable than exsentences for sparse articles
    explaintext:   "1",       // plain text, no HTML
    ppprop:        "disambiguation", // only fetch the disambiguation flag, not all pageprops
    piprop:        "thumbnail",
    pithumbsize:   "400",
    pvipdays:      "30",      // pageviews over last 30 days
    cllimit:       "5",       // up to 5 categories per page
    clshow:        "!hidden", // skip hidden maintenance categories
  });

  const json = await httpsGetJson(`${WIKIPEDIA_API_PATH}?${params}`, languageCode);
  return Object.values(json?.query?.pages ?? {})
    .map((page) => pageToArticleSeed(page, languageCode))
    .filter(Boolean);
}
