/**
 * catalog.mjs — live-Wikipedia edition
 *
 * Replaces the NDJSON file catalog with a hot in-memory pool of articles
 * fetched from the Wikipedia API.
 *
 * ─── concurrency model ───────────────────────────────────────────────────────
 *
 * Node.js is single-threaded: all Map/Array mutations are atomic from the
 * perspective of concurrent async tasks.  The pool therefore needs no locks.
 *
 * ─── hot path (pack opening) ─────────────────────────────────────────────────
 *
 * pickArticleIdForRarity / getRarityForArticleId / getTopicGroupForArticleId
 * are all synchronous O(1) Map/Array lookups.  getArticleById is declared
 * async for interface compatibility but resolves immediately from RAM.
 * Wikipedia API calls NEVER happen inside a request handler.
 *
 * ─── pool lifecycle ──────────────────────────────────────────────────────────
 *
 *  1. Startup  — pool is seeded with the 31 hardcoded static articles so the
 *                server is usable immediately (zero network wait).
 *  2. Warm-up  — _refill() starts fetching random Wikipedia articles in the
 *                background.  ready() resolves once every rarity has at least
 *                POOL_MIN_PER_RARITY articles.
 *  3. Refresh  — a setInterval() fires every 5 minutes and tops up any rarity
 *                bucket that has dipped below POOL_REFILL_TRIGGER.
 *  4. Eviction — once a bucket exceeds POOL_MAX_PER_RARITY the oldest entry
 *                is evicted, keeping memory bounded.
 *
 * This means pack openings are O(1) in-RAM lookups regardless of how many
 * users are online, while article variety grows continuously in the background.
 */

import {
  ARTICLES,
  RARITY_ORDER,
  buildArticleFromSeed,
  getRarityFromQScore,
} from "./constants.mjs";
import { fetchRandomArticles, fetchArticlesByTitles } from "./wikipedia-api.mjs";

// ── pool sizing ───────────────────────────────────────────────────────────────

/** Articles per rarity to aim for during background fill. */
const POOL_TARGET_PER_RARITY = 35;
/** Minimum articles per rarity before ready() resolves. */
const POOL_MIN_PER_RARITY = 3;
/** Trigger a background refill when any rarity drops below this. */
const POOL_REFILL_TRIGGER = 12;
/** Evict the oldest article in a bucket once it exceeds this cap. */
const POOL_MAX_PER_RARITY = 150;
/** Milliseconds to wait at startup before giving up on Wikipedia. */
const WARM_UP_TIMEOUT_MS = 15_000;
/** Milliseconds between periodic pool-top-up checks. */
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// ── helpers ───────────────────────────────────────────────────────────────────

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function toSearchItem(article) {
  return {
    articleId:    article.id,
    title:        article.wikipediaTitle,
    rarity:       article.rarityCode,
    qualityScore: article.qualityScore,
    topicGroup:   article.topicGroup,
    sourceUrl:    article.sourceUrl,
  };
}

function pickWeightedId(bucket, randomFn, ownedSet, newCardWeightBoost) {
  if (!bucket.length) return null;
  if (bucket.length === 1) return bucket[0];

  // Fast path — no ownership weighting needed
  if (!ownedSet.size) {
    return bucket[Math.floor(randomFn() * bucket.length) % bucket.length];
  }

  let total = 0;
  for (const id of bucket) total += ownedSet.has(id) ? 1 : newCardWeightBoost;

  let cursor = randomFn() * total;
  for (const id of bucket) {
    cursor -= ownedSet.has(id) ? 1 : newCardWeightBoost;
    if (cursor <= 0) return id;
  }
  return bucket[bucket.length - 1];
}

// ── quality scoring ───────────────────────────────────────────────────────────

/**
 * Compute a quality score (1-100) that maps to rarity tiers.
 *
 * Calibrated to the typical Wikipedia pageview distribution:
 *   ~100 views/month   → score  ≈  2  → C
 *   ~5 000 views/month → score  ≈ 27  → UC
 *   ~50 000/month      → score  ≈ 44  → R
 *   ~500 000/month     → score  ≈ 61  → SR
 *   ~3 000 000/month   → score  ≈ 80  → SSR
 *   ~10 000 000/month  → score  ≈ 93  → UR
 *   10M+ with full art → score → 100  → LR
 */
function computeQualityScore(pageviews30d, contentLength, hasImage) {
  // log-scale: 100 views → 0 pts, 10 M views → 70 pts
  const pvPts  = Math.min(70, Math.max(0,
    (Math.log10(Math.max(1, pageviews30d)) - 2) * 17.5,
  ));
  // 1 KB = 1 pt, capped at 20 pts
  const lenPts = Math.min(20, Math.round(contentLength / 1000));
  // developed articles tend to have thumbnail images
  const imgPts = hasImage ? 10 : 0;
  return Math.max(1, Math.min(100, Math.round(pvPts + lenPts + imgPts)));
}

// ── topic-group inference ────────────────────────────────────────────────────

const TOPIC_PATTERNS = [
  [/\b(physics|chemistry|biology|botany|zoology|astronomy|geology|ecology|genetics|neuroscience)\b/, "Science"],
  [/\b(mathematics|algebra|calculus|geometry|statistics|topology|arithmetic|number theory)\b/, "Mathematics"],
  [/\b(history|war|battle|empire|dynasty|ancient|medieval|revolution|civiliz)\b/, "History"],
  [/\b(geograph|country|countries|mountain|river|ocean|continent|city|cities|island)\b/, "Geography"],
  [/\b(technology|computer|software|internet|engineering|electronics|programming|robotics)\b/, "Technology"],
  [/\b(art|painting|sculpture|music|literature|film|cinema|architecture|photography)\b/, "Art"],
  [/\b(sport|sports|game|games|entertainment|food|fashion|culture|television)\b/, "Culture"],
  [/\b(philosophy|religion|politics|economics|sociology|psychology|law)\b/, "Society"],
];

function inferTopicGroup(categories = []) {
  const text = categories.join(" ").toLowerCase();
  for (const [pattern, group] of TOPIC_PATTERNS) {
    if (pattern.test(text)) return group;
  }
  return "General";
}

// ── seed → article conversion ─────────────────────────────────────────────────

/**
 * Convert a raw article seed from wikipedia-api.mjs into a full article
 * object (same shape produced by buildArticleFromSeed in constants.mjs).
 */
function seedToArticle(raw) {
  const qualityScore = computeQualityScore(
    raw.pageviews30d,
    raw.contentLength,
    !!raw.imageUrl,
  );
  const rarityCode  = getRarityFromQScore(qualityScore);
  const topicGroup  = inferTopicGroup(raw.categories ?? []);

  return buildArticleFromSeed(
    {
      wikipediaPageId: raw.pageid,
      title:           raw.title,
      slug:            raw.slug,
      extractText:     raw.extract,
      contentLength:   raw.contentLength,
      // Estimated from byte length — good enough for stat computation
      sectionCount:    Math.max(1, Math.round(raw.contentLength / 2000)),
      referenceCount:  Math.max(0, Math.round(raw.contentLength / 200)),
      pageviews30d:    raw.pageviews30d,
      qualityScore,
      rarityCode,
      topicGroup,
      categories:      raw.categories ?? [],
      imageUrl:        raw.imageUrl,
      flavorText:      null,
    },
    raw.pageid,
  );
}

// ── factory ───────────────────────────────────────────────────────────────────

export function createWikipediaGachaCatalog() {
  /** All pooled articles keyed by article ID. */
  const articleById = new Map();

  /** Per-rarity arrays of article IDs — drawn from during pack opening. */
  const rarityBuckets = Object.fromEntries(RARITY_ORDER.map((r) => [r, []]));

  /** True while a background refill is in progress. */
  let _refilling = false;

  /** Resolves when the pool has at least POOL_MIN_PER_RARITY per rarity. */
  let _readyResolve = null;
  const _readyPromise = new Promise((res) => { _readyResolve = res; });

  // ── pool mutations ─────────────────────────────────────────────────────────

  function _add(article) {
    if (articleById.has(article.id)) return;
    articleById.set(article.id, article);
    const bucket = rarityBuckets[article.rarityCode] ??= [];
    bucket.push(article.id);
    if (bucket.length > POOL_MAX_PER_RARITY) {
      articleById.delete(bucket.shift());
    }
  }

  function _seedStatic() {
    for (const article of ARTICLES) _add(clone(article));
  }

  function _isReady() {
    return RARITY_ORDER.every((r) => (rarityBuckets[r]?.length ?? 0) >= POOL_MIN_PER_RARITY);
  }

  function _needsRefill() {
    return RARITY_ORDER.some((r) => (rarityBuckets[r]?.length ?? 0) < POOL_REFILL_TRIGGER);
  }

  // ── background refill ──────────────────────────────────────────────────────

  async function _refill(maxBatches = 20) {
    if (_refilling) return;
    _refilling = true;
    try {
      for (let i = 0; i < maxBatches && _needsRefill(); i++) {
        const seeds = await fetchRandomArticles(50);
        for (const raw of seeds) _add(seedToArticle(raw));

        if (_isReady() && _readyResolve) {
          _readyResolve();
          _readyResolve = null;
        }
      }
    } catch (err) {
      console.warn(`[wikipedia-gacha] pool refill error: ${err.message}`);
    } finally {
      _refilling = false;
    }
  }

  // ── initialization ─────────────────────────────────────────────────────────

  // 1. Static seed — immediate availability, no network.
  _seedStatic();
  if (_isReady() && _readyResolve) {
    _readyResolve();
    _readyResolve = null;
  }

  // 2. Enrich static articles with live imageUrl / pageviews (one batch call).
  //    Static seeds were hardcoded without images; this patches them in-place.
  (async () => {
    try {
      const titles = ARTICLES.map((a) => a.wikipediaTitle);
      const live = await fetchArticlesByTitles(titles);
      const liveByTitle = new Map(live.map((s) => [s.title, s]));
      for (const article of ARTICLES) {
        const seed = liveByTitle.get(article.wikipediaTitle);
        if (!seed) continue;
        const stored = articleById.get(article.id);
        if (!stored) continue;
        if (!stored.imageUrl && seed.imageUrl) stored.imageUrl = seed.imageUrl;
        if (!stored.pageviews30d && seed.pageviews30d) stored.pageviews30d = seed.pageviews30d;
      }
    } catch (err) {
      console.warn(`[wikipedia-gacha] static enrichment error: ${err.message}`);
    }
  })().catch(() => {});

  // 3. Background fill with live Wikipedia articles.
  _refill().catch(() => {});

  // 3. Periodic top-up every 5 minutes.
  setInterval(() => {
    if (!_refilling && _needsRefill()) _refill().catch(() => {});
  }, REFRESH_INTERVAL_MS).unref();

  // 4. Safety valve — resolve after timeout even if Wikipedia is unreachable.
  setTimeout(() => {
    if (_readyResolve) {
      console.warn("[wikipedia-gacha] warm-up timeout — serving from static seed");
      _readyResolve();
      _readyResolve = null;
    }
  }, WARM_UP_TIMEOUT_MS).unref();

  console.log(
    `[wikipedia-gacha] pool seeded with ${articleById.size} static articles;` +
    ` Wikipedia background fill starting…`,
  );

  // ── public interface (unchanged from file-based catalog) ───────────────────

  async function ready() {
    return _readyPromise;
  }

  async function close() {
    // Nothing to close — pool is in-memory only.
  }

  function getMode() {
    return "live-wikipedia";
  }

  function getBucketIdsForRarity(rarityCode) {
    return rarityBuckets[rarityCode] ?? [];
  }

  function pickArticleIdForRarity(
    rarityCode,
    randomFn,
    ownedArticleIds = null,
    newCardWeightBoost = 1,
  ) {
    const ownedSet = ownedArticleIds instanceof Set ? ownedArticleIds : new Set();
    const bucket   = getBucketIdsForRarity(rarityCode);

    if (bucket.length) {
      return pickWeightedId(bucket, randomFn, ownedSet, newCardWeightBoost);
    }

    // Fallback: pick from the nearest non-empty bucket
    for (const r of RARITY_ORDER) {
      if (rarityBuckets[r]?.length) {
        return pickWeightedId(rarityBuckets[r], randomFn, ownedSet, newCardWeightBoost);
      }
    }
    return null;
  }

  function getRarityForArticleId(articleId) {
    return articleById.get(articleId)?.rarityCode ?? null;
  }

  function getTopicGroupForArticleId(articleId) {
    return articleById.get(articleId)?.topicGroup ?? null;
  }

  // Declared async for interface compatibility; resolves immediately from RAM.
  async function getArticleById(articleId) {
    return articleById.get(articleId) ?? null;
  }

  async function searchArticles(query, limit = 20) {
    const term      = String(query ?? "").trim().toLowerCase();
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    const results   = [];

    for (const article of articleById.values()) {
      if (!term || article.wikipediaTitle.toLowerCase().includes(term)) {
        results.push(toSearchItem(article));
        if (results.length >= safeLimit) break;
      }
    }
    return results;
  }

  async function listCatalog(limit = 500) {
    const safeLimit = Math.max(1, Math.min(5000, Number(limit) || 500));
    const result    = [];

    for (const article of articleById.values()) {
      result.push(clone(article));
      if (result.length >= safeLimit) break;
    }
    return result;
  }

  return {
    ready,
    close,
    getMode,
    getBucketIdsForRarity,
    pickArticleIdForRarity,
    getRarityForArticleId,
    getTopicGroupForArticleId,
    getArticleById,
    searchArticles,
    listCatalog,
  };
}
