import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import {
  ARTICLES,
  RARITY_ORDER,
  buildArticleFromSeed,
  getRarityFromQScore,
} from "./constants.mjs";

const INDEX_VERSION = 1;
const RARITY_TO_INDEX = Object.fromEntries(
  RARITY_ORDER.map((rarity, index) => [rarity, index])
);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeSpaces(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function toSlug(title) {
  return normalizeSpaces(title).replace(/\s+/g, "_");
}

function normalizeCategoryList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeSpaces(item))
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeSeed(seed, fallbackId = 0) {
  const title = normalizeSpaces(seed?.title ?? seed?.wikipediaTitle ?? `Article ${fallbackId}`);
  const slug = normalizeSpaces(seed?.slug ?? seed?.wikipediaSlug ?? toSlug(title));
  const qualityScore = Number(seed?.qualityScore);
  const safeQualityScore = Number.isFinite(qualityScore)
    ? qualityScore
    : Math.max(5, Math.min(100, Math.round(Math.log10(title.length + 10) * 22)));
  const pageviews30d = Number(seed?.pageviews30d);
  const contentLength = Number(seed?.contentLength);
  const sectionCount = Number(seed?.sectionCount);
  const referenceCount = Number(seed?.referenceCount);

  return {
    wikipediaPageId: Number(seed?.wikipediaPageId) || fallbackId,
    title,
    slug,
    extractText: normalizeSpaces(seed?.extractText ?? "Wikipedia article."),
    contentLength: Number.isFinite(contentLength)
      ? Math.max(250, Math.round(contentLength))
      : 2200,
    sectionCount: Number.isFinite(sectionCount)
      ? Math.max(1, Math.round(sectionCount))
      : 5,
    referenceCount: Number.isFinite(referenceCount)
      ? Math.max(0, Math.round(referenceCount))
      : 12,
    pageviews30d: Number.isFinite(pageviews30d)
      ? Math.max(0, Math.round(pageviews30d))
      : 5000,
    qualityScore: safeQualityScore,
    topicGroup: normalizeSpaces(seed?.topicGroup ?? "General"),
    categories: normalizeCategoryList(seed?.categories),
    imageUrl: seed?.imageUrl ?? null,
    rarityCode:
      seed?.rarityCode && RARITY_TO_INDEX[seed.rarityCode] !== undefined
        ? seed.rarityCode
        : getRarityFromQScore(safeQualityScore),
    flavorText: seed?.flavorText ?? null,
  };
}

function createLruCache(maxSize) {
  const safeMaxSize = Math.max(100, Number(maxSize) || 5000);
  const cache = new Map();

  return {
    get(key) {
      if (!cache.has(key)) return null;
      const value = cache.get(key);
      cache.delete(key);
      cache.set(key, value);
      return value;
    },
    set(key, value) {
      if (cache.has(key)) {
        cache.delete(key);
      }
      cache.set(key, value);
      if (cache.size > safeMaxSize) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
      }
    },
  };
}

function toSearchItem(article) {
  return {
    articleId: article.id,
    title: article.wikipediaTitle,
    rarity: article.rarityCode,
    qualityScore: article.qualityScore,
    topicGroup: article.topicGroup,
    sourceUrl: article.sourceUrl,
  };
}

function createRarityBuckets(baseBuckets) {
  return Object.fromEntries(
    RARITY_ORDER.map((rarity) => [rarity, [...(baseBuckets[rarity] ?? [])]])
  );
}

function buildRarityBucketsFromRarityIndices(baseBuckets, baseCount, rarityIndices) {
  const rarityBuckets = createRarityBuckets(baseBuckets);
  for (let extIndex = 0; extIndex < rarityIndices.length; extIndex += 1) {
    const rarityCode = RARITY_ORDER[rarityIndices[extIndex]] ?? "C";
    const articleId = baseCount + extIndex + 1;
    rarityBuckets[rarityCode] ??= [];
    rarityBuckets[rarityCode].push(articleId);
  }
  return rarityBuckets;
}

function getDefaultIndexFilePath(catalogPath) {
  return `${catalogPath}.idx.json`;
}

async function loadIndexFromDisk({
  indexFilePath,
  catalogFilePath,
  catalogStats,
  baseCount,
  baseBuckets,
}) {
  try {
    const raw = await fsp.readFile(indexFilePath, "utf8");
    const parsed = JSON.parse(raw);

    if (parsed?.version !== INDEX_VERSION) {
      return null;
    }
    if (!Array.isArray(parsed.externalOffsets)) {
      return null;
    }
    if (!Array.isArray(parsed.externalRarityIndices)) {
      return null;
    }
    if (!Array.isArray(parsed.externalTopicCodes)) {
      return null;
    }
    if (!Array.isArray(parsed.topicValues) || !parsed.topicValues.length) {
      return null;
    }
    if (
      parsed.externalOffsets.length !== parsed.externalRarityIndices.length ||
      parsed.externalOffsets.length !== parsed.externalTopicCodes.length
    ) {
      return null;
    }

    const sameSourceFile = String(parsed.catalogFilePath || "") === catalogFilePath;
    const sameSize = Number(parsed.catalogSize || 0) === Number(catalogStats.size || 0);
    const sameMtime =
      Math.abs(Number(parsed.catalogMtimeMs || 0) - Number(catalogStats.mtimeMs || 0)) < 1;
    if (!sameSourceFile || !sameSize || !sameMtime) {
      return null;
    }

    const externalOffsets = parsed.externalOffsets.map((value) => Number(value));
    const externalRarityIndices = parsed.externalRarityIndices.map((value) =>
      Math.max(0, Math.min(RARITY_ORDER.length - 1, Number(value) || 0))
    );
    const externalTopicCodes = parsed.externalTopicCodes.map((value) =>
      Math.max(0, Number(value) || 0)
    );
    if (
      externalOffsets.length !== externalRarityIndices.length ||
      externalOffsets.length !== externalTopicCodes.length
    ) {
      return null;
    }

    return {
      filePath: catalogFilePath,
      fileSize: catalogStats.size,
      externalOffsets,
      externalRarityIndices,
      externalTopicCodes,
      topicValues: parsed.topicValues.map((value) => normalizeSpaces(value) || "General"),
      rarityBuckets: buildRarityBucketsFromRarityIndices(
        baseBuckets,
        baseCount,
        externalRarityIndices
      ),
      externalCount: externalOffsets.length,
      indexFilePath,
      indexSource: "disk",
    };
  } catch (error) {
    return null;
  }
}

async function saveIndexToDisk({
  indexFilePath,
  catalogFilePath,
  catalogStats,
  externalOffsets,
  externalRarityIndices,
  externalTopicCodes,
  topicValues,
}) {
  const payload = {
    version: INDEX_VERSION,
    catalogFilePath,
    catalogSize: Number(catalogStats.size || 0),
    catalogMtimeMs: Number(catalogStats.mtimeMs || 0),
    externalOffsets,
    externalRarityIndices,
    externalTopicCodes,
    topicValues,
    writtenAt: new Date().toISOString(),
  };

  await fsp.mkdir(path.dirname(indexFilePath), { recursive: true });
  await fsp.writeFile(indexFilePath, JSON.stringify(payload), "utf8");
}

async function indexCatalogFile(filePath, baseCount, baseBuckets) {
  const topicValues = ["General"];
  const topicToCode = new Map([["General", 0]]);
  const externalOffsets = [];
  const externalRarityIndices = [];
  const externalTopicCodes = [];
  const rarityBuckets = createRarityBuckets(baseBuckets);

  let carry = Buffer.alloc(0);
  let carryOffset = 0;
  let indexed = 0;

  const stream = fs.createReadStream(filePath);
  for await (const chunk of stream) {
    const combined = carry.length ? Buffer.concat([carry, chunk]) : chunk;
    let lineStart = 0;

    for (let cursor = 0; cursor < combined.length; cursor += 1) {
      if (combined[cursor] !== 0x0a) {
        continue;
      }
      let lineEnd = cursor;
      if (lineEnd > lineStart && combined[lineEnd - 1] === 0x0d) {
        lineEnd -= 1;
      }
      if (lineEnd > lineStart) {
        const lineBuffer = combined.subarray(lineStart, lineEnd);
        const lineOffset = carryOffset + lineStart;
        const rawLine = lineBuffer.toString("utf8").trim();
        if (rawLine) {
          const parsed = JSON.parse(rawLine);
          const seed = normalizeSeed(parsed, baseCount + indexed + 1);
          const rarityCode = seed.rarityCode;
          const rarityIndex = RARITY_TO_INDEX[rarityCode] ?? 0;
          const topicGroup = seed.topicGroup || "General";
          let topicCode = topicToCode.get(topicGroup);
          if (topicCode === undefined) {
            topicCode = topicValues.length;
            topicValues.push(topicGroup);
            topicToCode.set(topicGroup, topicCode);
          }

          externalOffsets.push(lineOffset);
          externalRarityIndices.push(rarityIndex);
          externalTopicCodes.push(topicCode);

          const articleId = baseCount + indexed + 1;
          rarityBuckets[rarityCode] ??= [];
          rarityBuckets[rarityCode].push(articleId);
          indexed += 1;
        }
      }
      lineStart = cursor + 1;
    }

    carryOffset += lineStart;
    carry = combined.subarray(lineStart);
  }

  if (carry.length) {
    const rawLine = carry.toString("utf8").trim();
    if (rawLine) {
      const parsed = JSON.parse(rawLine);
      const seed = normalizeSeed(parsed, baseCount + indexed + 1);
      const rarityCode = seed.rarityCode;
      const rarityIndex = RARITY_TO_INDEX[rarityCode] ?? 0;
      const topicGroup = seed.topicGroup || "General";
      let topicCode = topicToCode.get(topicGroup);
      if (topicCode === undefined) {
        topicCode = topicValues.length;
        topicValues.push(topicGroup);
        topicToCode.set(topicGroup, topicCode);
      }

      externalOffsets.push(carryOffset);
      externalRarityIndices.push(rarityIndex);
      externalTopicCodes.push(topicCode);

      const articleId = baseCount + indexed + 1;
      rarityBuckets[rarityCode] ??= [];
      rarityBuckets[rarityCode].push(articleId);
      indexed += 1;
    }
  }

  const stats = await fsp.stat(filePath);

  return {
    filePath,
    fileSize: stats.size,
    externalOffsets,
    externalRarityIndices,
    externalTopicCodes,
    topicValues,
    rarityBuckets,
    externalCount: indexed,
    indexSource: "scan",
  };
}

async function readRawExternalLine(indexData, extIndex) {
  if (extIndex < 0 || extIndex >= indexData.externalCount) {
    return null;
  }
  const start = indexData.externalOffsets[extIndex];
  const end =
    extIndex + 1 < indexData.externalOffsets.length
      ? indexData.externalOffsets[extIndex + 1]
      : indexData.fileSize;
  const length = Math.max(0, end - start);
  if (length <= 0) return null;

  const buffer = Buffer.alloc(length);
  await indexData.handle.read(buffer, 0, length, start);
  return buffer.toString("utf8").trim();
}

function pickWeightedId(bucket, randomFn, ownedArticleIds, newCardWeightBoost) {
  if (!Array.isArray(bucket) || bucket.length <= 0) return null;
  if (bucket.length === 1) return bucket[0];

  if (!(ownedArticleIds instanceof Set) || ownedArticleIds.size <= 0) {
    const index = Math.floor(randomFn() * bucket.length) % bucket.length;
    return bucket[index];
  }

  let totalWeight = 0;
  for (const articleId of bucket) {
    totalWeight += ownedArticleIds.has(articleId) ? 1 : newCardWeightBoost;
  }

  let cursor = randomFn() * totalWeight;
  for (const articleId of bucket) {
    cursor -= ownedArticleIds.has(articleId) ? 1 : newCardWeightBoost;
    if (cursor <= 0) {
      return articleId;
    }
  }
  return bucket[bucket.length - 1];
}

export function createWikipediaGachaCatalog({
  externalCatalogFile = null,
  externalCatalogIndexFile = null,
  cacheSize = 5000,
} = {}) {
  const staticArticles = ARTICLES.map((article) => clone(article));
  const staticArticleById = new Map(staticArticles.map((article) => [article.id, article]));
  const staticBuckets = Object.fromEntries(
    RARITY_ORDER.map((rarity) => [rarity, []])
  );
  for (const article of staticArticles) {
    staticBuckets[article.rarityCode] ??= [];
    staticBuckets[article.rarityCode].push(article.id);
  }
  const baseCount = staticArticles.length;
  const articleCache = createLruCache(cacheSize);

  let mode = "static";
  let indexData = null;

  const initPromise = (async () => {
    if (!externalCatalogFile) return;
    const resolvedPath = path.resolve(externalCatalogFile);
    const resolvedIndexPath = path.resolve(
      externalCatalogIndexFile || getDefaultIndexFilePath(resolvedPath)
    );
    let catalogStats = null;
    try {
      await fsp.access(resolvedPath, fs.constants.R_OK);
      catalogStats = await fsp.stat(resolvedPath);
    } catch (_error) {
      return;
    }

    try {
      indexData =
        (await loadIndexFromDisk({
          indexFilePath: resolvedIndexPath,
          catalogFilePath: resolvedPath,
          catalogStats,
          baseCount,
          baseBuckets: staticBuckets,
        })) ??
        (await indexCatalogFile(resolvedPath, baseCount, staticBuckets));

      if (indexData.indexSource === "scan") {
        try {
          await saveIndexToDisk({
            indexFilePath: resolvedIndexPath,
            catalogFilePath: resolvedPath,
            catalogStats,
            externalOffsets: indexData.externalOffsets,
            externalRarityIndices: indexData.externalRarityIndices,
            externalTopicCodes: indexData.externalTopicCodes,
            topicValues: indexData.topicValues,
          });
        } catch (error) {
          console.warn(
            `[wikipedia-gacha] failed to persist catalog index at ${resolvedIndexPath}: ${error.message}`
          );
        }
      }

      indexData.handle = await fsp.open(resolvedPath, "r");
      indexData.filePath = resolvedPath;
      indexData.fileSize = catalogStats.size;
      indexData.indexFilePath = resolvedIndexPath;
      mode = "hybrid";
      console.log(
        `[wikipedia-gacha] external catalog ready (${indexData.externalCount} rows, source=${indexData.indexSource}) from ${resolvedPath}`
      );
    } catch (error) {
      mode = "static";
      indexData = null;
      console.warn(
        `[wikipedia-gacha] failed to index external catalog at ${resolvedPath}: ${error.message}`
      );
    }
  })();

  async function ready() {
    await initPromise;
  }

  async function close() {
    await ready();
    if (indexData?.handle) {
      await indexData.handle.close();
      indexData.handle = null;
    }
  }

  function getMode() {
    return mode;
  }

  function getBucketIdsForRarity(rarityCode) {
    if (indexData) {
      return indexData.rarityBuckets[rarityCode] ?? [];
    }
    return staticBuckets[rarityCode] ?? [];
  }

  function pickArticleIdForRarity(
    rarityCode,
    randomFn,
    ownedArticleIds = null,
    newCardWeightBoost = 1
  ) {
    const bucket = getBucketIdsForRarity(rarityCode);
    if (!bucket.length) {
      const fallback = RARITY_ORDER
        .map((rarity) => getBucketIdsForRarity(rarity))
        .find((items) => items.length > 0);
      return pickWeightedId(
        fallback ?? [],
        randomFn,
        ownedArticleIds,
        newCardWeightBoost
      );
    }
    return pickWeightedId(bucket, randomFn, ownedArticleIds, newCardWeightBoost);
  }

  function getRarityForArticleId(articleId) {
    const staticArticle = staticArticleById.get(articleId);
    if (staticArticle) {
      return staticArticle.rarityCode;
    }
    if (!indexData) return null;
    const extIndex = articleId - baseCount - 1;
    if (extIndex < 0 || extIndex >= indexData.externalCount) {
      return null;
    }
    return RARITY_ORDER[indexData.externalRarityIndices[extIndex]] ?? "C";
  }

  function getTopicGroupForArticleId(articleId) {
    const staticArticle = staticArticleById.get(articleId);
    if (staticArticle) {
      return staticArticle.topicGroup;
    }
    if (!indexData) return null;
    const extIndex = articleId - baseCount - 1;
    if (extIndex < 0 || extIndex >= indexData.externalCount) {
      return null;
    }
    return indexData.topicValues[indexData.externalTopicCodes[extIndex]] ?? "General";
  }

  async function getArticleById(articleId) {
    const staticArticle = staticArticleById.get(articleId);
    if (staticArticle) {
      return staticArticle;
    }
    if (!indexData) {
      return null;
    }

    const extIndex = articleId - baseCount - 1;
    if (extIndex < 0 || extIndex >= indexData.externalCount) {
      return null;
    }

    const cached = articleCache.get(articleId);
    if (cached) {
      return cached;
    }

    const rawLine = await readRawExternalLine(indexData, extIndex);
    if (!rawLine) {
      return null;
    }
    const parsed = JSON.parse(rawLine);
    const seed = normalizeSeed(parsed, articleId);
    const article = buildArticleFromSeed(seed, articleId);
    articleCache.set(articleId, article);
    return article;
  }

  async function searchArticles(query, limit = 20) {
    const term = normalizeSpaces(query).toLowerCase();
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    const results = [];

    for (const article of staticArticles) {
      if (!term || article.wikipediaTitle.toLowerCase().includes(term)) {
        results.push(toSearchItem(article));
      }
      if (results.length >= safeLimit) {
        return results;
      }
    }

    if (!indexData) {
      return results;
    }

    const stream = fs.createReadStream(indexData.filePath, { encoding: "utf8" });
    let carry = "";
    let extIndex = 0;

    for await (const chunk of stream) {
      const combined = carry + chunk;
      const lines = combined.split(/\r?\n/);
      carry = lines.pop() ?? "";

      for (const line of lines) {
        if (results.length >= safeLimit) {
          stream.destroy();
          break;
        }
        const trimmed = line.trim();
        if (!trimmed) {
          extIndex += 1;
          continue;
        }
        const parsed = JSON.parse(trimmed);
        const articleId = baseCount + extIndex + 1;
        const seed = normalizeSeed(parsed, articleId);
        if (!term || seed.title.toLowerCase().includes(term)) {
          const article = buildArticleFromSeed(seed, articleId);
          articleCache.set(articleId, article);
          results.push(toSearchItem(article));
        }
        extIndex += 1;
      }
      if (results.length >= safeLimit) {
        break;
      }
    }

    if (carry.trim() && results.length < safeLimit) {
      const parsed = JSON.parse(carry.trim());
      const articleId = baseCount + extIndex + 1;
      const seed = normalizeSeed(parsed, articleId);
      if (!term || seed.title.toLowerCase().includes(term)) {
        const article = buildArticleFromSeed(seed, articleId);
        articleCache.set(articleId, article);
        results.push(toSearchItem(article));
      }
    }

    return results.slice(0, safeLimit);
  }

  async function listCatalog(limit = 500) {
    const safeLimit = Math.max(1, Math.min(5000, Number(limit) || 500));
    const all = [];

    for (const article of staticArticles) {
      all.push(article);
      if (all.length >= safeLimit) {
        return all.map((item) => clone(item));
      }
    }

    if (!indexData) {
      return all.map((item) => clone(item));
    }

    const totalExternalToRead = Math.min(
      indexData.externalCount,
      safeLimit - all.length
    );
    for (let extIndex = 0; extIndex < totalExternalToRead; extIndex += 1) {
      const articleId = baseCount + extIndex + 1;
      const article = await getArticleById(articleId);
      if (article) {
        all.push(article);
      }
      if (all.length >= safeLimit) {
        break;
      }
    }

    return all.map((item) => clone(item));
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
