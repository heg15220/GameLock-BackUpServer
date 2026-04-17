import crypto from "node:crypto";
import {
  DEFAULT_MAX_PACKS,
  DEFAULT_STARTING_PACKS,
  DUPLICATE_SHARDS_BY_RARITY,
  GUARANTEED_SR_PLUS_WEIGHTS,
  MISSIONS,
  NEW_CARD_WEIGHT_BOOST,
  PACK_REGEN_INTERVAL_MS,
  PACK_SIZE,
  PITY_THRESHOLD,
  RARITY_ORDER,
  RECOVERY_CODE_PREFIX,
  STANDARD_RARITY_WEIGHTS,
  TROPHIES,
  compareRarity,
} from "./constants.mjs";
import { createWikipediaGachaCatalog } from "./catalog.mjs";
import { createSqliteStore } from "./storage.mjs";
import { openStateDb, DEFAULT_DB_PATH } from "./db.mjs";

const MISSION_BY_ID = new Map(MISSIONS.map((mission) => [mission.id, mission]));
const TROPHY_BY_ID = new Map(TROPHIES.map((trophy) => [trophy.id, trophy]));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeArticleText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function parsePreferredLanguage(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return String(value).toLowerCase().startsWith("es") ? "es" : "en";
}

function resolvePreferredLanguage(value) {
  return parsePreferredLanguage(value) ?? "en";
}

function syncProfilePreferredLanguage(profile, preferredLanguage, now = null) {
  const normalized = parsePreferredLanguage(preferredLanguage);
  if (!normalized || profile.preferredLanguage === normalized) {
    return profile;
  }
  profile.preferredLanguage = normalized;
  if (now) {
    profile.updatedAt = isoDate(now);
  }
  return profile;
}

function isoDate(now) {
  return now.toISOString();
}

function yyyyMmDd(now) {
  return now.toISOString().slice(0, 10);
}

function createId(state, key) {
  const nextId = state.nextIds[key] ?? 1;
  state.nextIds[key] = nextId + 1;
  return nextId;
}

function pickWeighted(items, randomFn) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = randomFn() * totalWeight;
  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item.rarity;
    }
  }
  return items[items.length - 1]?.rarity ?? "C";
}

function rarityAtLeast(rarityCode, targetCode) {
  return compareRarity(rarityCode, targetCode) >= 0;
}

function summarizePack(cards) {
  const counts = cards.reduce((accumulator, card) => {
    accumulator[card.rarity] = (accumulator[card.rarity] ?? 0) + 1;
    return accumulator;
  }, {});
  return RARITY_ORDER
    .filter((rarity) => counts[rarity])
    .reverse()
    .map((rarity) => `${counts[rarity]} ${rarity}`)
    .join(", ");
}

function createToken(randomBytesFn) {
  return randomBytesFn(32).toString("hex");
}

function createRecoveryCode(randomBytesFn) {
  const raw = randomBytesFn(6).toString("hex").toUpperCase();
  return `${RECOVERY_CODE_PREFIX}-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

function ensureProfile(state, browserToken) {
  const profile = state.browserProfiles.find(
    (entry) => entry.browserToken === browserToken
  );
  if (!profile) {
    const error = new Error("Browser profile not found.");
    error.statusCode = 401;
    error.code = "invalid_browser_token";
    throw error;
  }
  const parsedPityCounter = Number(profile.pityCounter);
  profile.pityCounter = Number.isFinite(parsedPityCounter)
    ? Math.max(0, Math.min(PITY_THRESHOLD, Math.floor(parsedPityCounter)))
    : 0;
  return profile;
}

function applyPackRegeneration(profile, now) {
  const lastPackRegenAtMs = new Date(profile.lastPackRegenAt).getTime();
  const nowMs = now.getTime();
  if (!Number.isFinite(lastPackRegenAtMs) || nowMs <= lastPackRegenAtMs) {
    return profile;
  }

  if (profile.packsAvailable >= profile.maxPacks) {
    return profile;
  }

  const elapsedSlots = Math.floor(
    (nowMs - lastPackRegenAtMs) / PACK_REGEN_INTERVAL_MS
  );
  if (elapsedSlots <= 0) {
    return profile;
  }

  const capacity = Math.max(0, profile.maxPacks - profile.packsAvailable);
  const packsToAdd = Math.min(capacity, elapsedSlots);
  if (packsToAdd <= 0) {
    return profile;
  }

  profile.packsAvailable += packsToAdd;
  profile.lastPackRegenAt = new Date(
    lastPackRegenAtMs + packsToAdd * PACK_REGEN_INTERVAL_MS
  ).toISOString();
  return profile;
}

function getSecondsUntilNextPack(profile, now) {
  if (profile.packsAvailable >= profile.maxPacks) {
    return 0;
  }
  const nextAt =
    new Date(profile.lastPackRegenAt).getTime() + PACK_REGEN_INTERVAL_MS;
  return Math.max(0, Math.ceil((nextAt - now.getTime()) / 1000));
}

function getProfileCollections(state, profileId) {
  return state.browserCollection.filter(
    (entry) => entry.browserProfileId === profileId
  );
}

function getProfilePackHistory(state, profileId) {
  return state.packOpenings
    .filter((opening) => opening.browserProfileId === profileId)
    .sort((left, right) => new Date(right.openedAt) - new Date(left.openedAt));
}

function getTodaysStats(state, profileId, now) {
  const statDate = yyyyMmDd(now);
  let stats = state.dailyBrowserStats.find(
    (entry) =>
      entry.browserProfileId === profileId && entry.statDate === statDate
  );
  if (!stats) {
    stats = {
      id: createId(state, "dailyStat"),
      browserProfileId: profileId,
      statDate,
      packsOpened: 0,
      cardsObtained: 0,
      newCardsObtained: 0,
      srOrHigherCount: 0,
      wikipediaClicks: 0,
    };
    state.dailyBrowserStats.push(stats);
  }
  return stats;
}

function serializeProfile(profile) {
  const pityCounter = Number.isFinite(Number(profile.pityCounter))
    ? Math.max(0, Math.min(PITY_THRESHOLD, Math.floor(Number(profile.pityCounter))))
    : 0;
  return {
    displayName: profile.displayName,
    preferredLanguage: resolvePreferredLanguage(profile.preferredLanguage),
    packsAvailable: profile.packsAvailable,
    maxPacks: profile.maxPacks,
    gems: profile.gems,
    shards: profile.shards,
    trophiesPoints: profile.trophiesPoints,
    totalPackOpens: profile.totalPackOpens,
    pityCounter,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    lastSeenAt: profile.lastSeenAt,
  };
}

function serializePackStatus(profile, now) {
  const pityCounter = Number.isFinite(Number(profile.pityCounter))
    ? Math.max(0, Math.min(PITY_THRESHOLD, Math.floor(Number(profile.pityCounter))))
    : 0;
  return {
    packsAvailable: profile.packsAvailable,
    maxPacks: profile.maxPacks,
    pityCounter,
    nextPackGuaranteedSrPlus: pityCounter >= PITY_THRESHOLD,
    secondsUntilNextPack: getSecondsUntilNextPack(profile, now),
    lastPackRegenAt: profile.lastPackRegenAt,
  };
}

function serializePackCardResult(article, collectionEntry, packCard) {
  return {
    articleId: article.id,
    title: article.wikipediaTitle,
    rarity: article.rarityCode,
    qualityScore: article.qualityScore,
    atk: article.atk,
    def: article.defStat,
    imageUrl: article.imageUrl,
    extractText: article.extractText,
    longExtractText: article.longExtractText ?? article.extractText,
    flavorText: article.flavorText,
    wasNew: packCard.wasNew,
    copiesAfterPull: collectionEntry.copies,
    shardsEarned: packCard.shardsEarned,
    sourceUrl: article.sourceUrl,
    topicGroup: article.topicGroup,
  };
}

function serializePackHistoryEntry(opening) {
  const normalizedCards = (opening.cards ?? []).map((card) => ({
    ...card,
    title: card.title ?? `Article #${card.articleId}`,
    imageUrl: card.imageUrl ?? null,
    extractText: normalizeArticleText(card.extractText) || "",
    longExtractText:
      normalizeArticleText(card.longExtractText) ||
      normalizeArticleText(card.extractText) ||
      "",
    flavorText: card.flavorText ?? null,
    sourceUrl: card.sourceUrl ?? null,
    topicGroup: card.topicGroup ?? "General",
  }));

  return {
    packOpeningId: opening.id,
    openedAt: opening.openedAt,
    guaranteedSrPlus: opening.guaranteedSrPlus,
    packType: opening.packType,
    resultSummary: opening.resultSummary,
    cards: normalizedCards,
  };
}

function getCollectionSummary(state, profileId, getRarityForArticleId) {
  const entries = getProfileCollections(state, profileId);
  const uniqueCards = entries.length;
  const totalCopies = entries.reduce(
    (sum, entry) => sum + entry.copies,
    0
  );
  const favorites = entries.filter((entry) => entry.favorite).length;
  const rarityBreakdown = RARITY_ORDER.reduce((accumulator, rarity) => {
    accumulator[rarity] = 0;
    return accumulator;
  }, {});

  for (const entry of entries) {
    const rarityCode =
      entry.bestRarityCode || getRarityForArticleId(entry.articleId) || "C";
    rarityBreakdown[rarityCode] = (rarityBreakdown[rarityCode] ?? 0) + 1;
  }

  return {
    uniqueCards,
    totalCopies,
    favorites,
    rarityBreakdown,
  };
}

function ensureDailyMissions(state, profile, now) {
  const resetDate = yyyyMmDd(now);
  for (const mission of MISSIONS) {
    if (!mission.isActive || mission.missionScope !== "daily") {
      continue;
    }
    const existing = state.browserMissions.find(
      (entry) =>
        entry.browserProfileId === profile.id &&
        entry.missionId === mission.id &&
        entry.resetDate === resetDate
    );
    if (!existing) {
      state.browserMissions.push({
        id: createId(state, "browserMission"),
        browserProfileId: profile.id,
        missionId: mission.id,
        progressValue: 0,
        completed: false,
        claimed: false,
        resetDate,
        createdAt: isoDate(now),
        updatedAt: isoDate(now),
      });
    }
  }
  return state.browserMissions.filter(
    (entry) =>
      entry.browserProfileId === profile.id && entry.resetDate === resetDate
  );
}

function recomputeMissionProgress(state, profile, now) {
  const todaysStats = getTodaysStats(state, profile.id, now);
  const entries = ensureDailyMissions(state, profile, now);
  const collection = getProfileCollections(state, profile.id);
  const favoritesMarked = collection.filter((entry) => entry.favorite).length;
  const metrics = {
    packs_opened: todaysStats.packsOpened,
    new_cards_obtained: todaysStats.newCardsObtained,
    sr_or_higher_count: todaysStats.srOrHigherCount,
    wikipedia_clicks: todaysStats.wikipediaClicks,
    favorites_marked: favoritesMarked,
  };

  for (const entry of entries) {
    const mission = MISSION_BY_ID.get(entry.missionId);
    if (!mission) {
      continue;
    }
    entry.progressValue = Math.min(
      mission.targetValue,
      metrics[mission.targetType] ?? 0
    );
    entry.completed = entry.progressValue >= mission.targetValue;
    entry.updatedAt = isoDate(now);
  }

  return entries;
}

function getMissionSummary(state, profile, now) {
  const entries = recomputeMissionProgress(state, profile, now);
  return {
    total: entries.length,
    completed: entries.filter((entry) => entry.completed).length,
    claimable: entries.filter((entry) => entry.completed && !entry.claimed)
      .length,
  };
}

function serializeMissionEntry(entry) {
  const mission = MISSION_BY_ID.get(entry.missionId);
  return {
    id: mission.id,
    code: mission.code,
    title: mission.title,
    description: mission.description,
    rewardType: mission.rewardType,
    rewardAmount: mission.rewardAmount,
    missionScope: mission.missionScope,
    targetType: mission.targetType,
    targetValue: mission.targetValue,
    progressValue: entry.progressValue,
    completed: entry.completed,
    claimed: entry.claimed,
    resetDate: entry.resetDate,
  };
}

function parseRewardMetadata(metadataJson) {
  if (!metadataJson) return {};
  if (typeof metadataJson === "object") return metadataJson;
  if (typeof metadataJson === "string") {
    try {
      return JSON.parse(metadataJson);
    } catch (_error) {
      return {};
    }
  }
  return {};
}

function serializeRewardEvent(entry) {
  const metadata = parseRewardMetadata(entry.metadataJson);
  const missionId = Number(metadata.missionId);
  const mission = Number.isFinite(missionId) ? MISSION_BY_ID.get(missionId) : null;
  return {
    id: entry.id,
    rewardSource: entry.rewardSource,
    rewardType: entry.rewardType,
    rewardAmount: entry.rewardAmount,
    createdAt: entry.createdAt,
    missionId: mission?.id ?? null,
    missionTitle: mission?.title ?? null,
    missionCode: metadata.missionCode ?? mission?.code ?? null,
    packOpeningId: metadata.packOpeningId ?? null,
  };
}

function getTrophyConditions(
  state,
  profile,
  getTopicGroupForArticleId,
  getRarityForArticleId
) {
  const collection = getProfileCollections(state, profile.id);
  const uniqueCount = collection.length;
  const duplicateCopies = collection.reduce(
    (sum, entry) => sum + Math.max(0, entry.copies - 1),
    0
  );
  const scienceCount = collection.filter((entry) => {
    const topic = entry.topicGroup || getTopicGroupForArticleId(entry.articleId);
    return topic === "Science";
  }).length;
  const historyCount = collection.filter((entry) => {
    const topic = entry.topicGroup || getTopicGroupForArticleId(entry.articleId);
    return topic === "History";
  }).length;
  const highestRarity = collection.reduce((best, entry) => {
    const rarityCode =
      entry.bestRarityCode || getRarityForArticleId(entry.articleId);
    if (!rarityCode) return best;
    if (!best || compareRarity(rarityCode, best) > 0) {
      return rarityCode;
    }
    return best;
  }, null);

  return {
    "first-card": uniqueCount >= 1,
    "first-sr": highestRarity ? rarityAtLeast(highestRarity, "SR") : false,
    "first-ssr": highestRarity ? rarityAtLeast(highestRarity, "SSR") : false,
    "unique-15": uniqueCount >= 15,
    "duplicates-10": duplicateCopies >= 10,
    "science-collector": scienceCount >= 6,
    "history-collector": historyCount >= 5,
  };
}

function ensureTrophiesUnlocked(
  state,
  profile,
  now,
  getTopicGroupForArticleId,
  getRarityForArticleId
) {
  const unlocked = state.browserTrophies.filter(
    (entry) => entry.browserProfileId === profile.id
  );
  const unlockedCodes = new Set(
    unlocked.map((entry) => TROPHY_BY_ID.get(entry.trophyId)?.code).filter(Boolean)
  );
  const conditions = getTrophyConditions(
    state,
    profile,
    getTopicGroupForArticleId,
    getRarityForArticleId
  );

  for (const trophy of TROPHIES) {
    if (unlockedCodes.has(trophy.code) || !conditions[trophy.code]) {
      continue;
    }
    state.browserTrophies.push({
      id: createId(state, "browserTrophy"),
      browserProfileId: profile.id,
      trophyId: trophy.id,
      unlockedAt: isoDate(now),
    });
    profile.trophiesPoints += trophy.points;
    unlockedCodes.add(trophy.code);
  }

  return state.browserTrophies.filter(
    (entry) => entry.browserProfileId === profile.id
  );
}

function getTrophySummary(
  state,
  profile,
  now,
  getTopicGroupForArticleId,
  getRarityForArticleId
) {
  const unlocked = ensureTrophiesUnlocked(
    state,
    profile,
    now,
    getTopicGroupForArticleId,
    getRarityForArticleId
  );
  return {
    total: TROPHIES.length,
    unlocked: unlocked.length,
    points: profile.trophiesPoints,
  };
}

function serializeTrophyEntry(entry) {
  const trophy = TROPHY_BY_ID.get(entry.trophyId);
  return {
    id: trophy.id,
    code: trophy.code,
    name: trophy.name,
    description: trophy.description,
    iconKey: trophy.iconKey,
    points: trophy.points,
    unlockedAt: entry.unlockedAt,
    unlocked: true,
  };
}

async function serializeCollectionEntry(entry, getArticleById) {
  const article = await getArticleById(entry.articleId);
  if (!article) {
    return {
      articleId: entry.articleId,
      title: `Article #${entry.articleId}`,
      rarity: entry.bestRarityCode ?? "C",
      qualityScore: 0,
      atk: 0,
      def: 0,
      imageUrl: null,
      extractText: "",
      longExtractText: "",
      flavorText: null,
      topicGroup: entry.topicGroup ?? "General",
      sourceUrl: null,
      categories: [],
      copies: entry.copies,
      favorite: entry.favorite,
      bestRarityCode: entry.bestRarityCode,
      firstObtainedAt: entry.firstObtainedAt,
      lastObtainedAt: entry.lastObtainedAt,
    };
  }

  return {
    articleId: article.id,
    title: article.wikipediaTitle,
    rarity: article.rarityCode,
    qualityScore: article.qualityScore,
    atk: article.atk,
    def: article.defStat,
    imageUrl: article.imageUrl,
    extractText: article.extractText,
    longExtractText: article.longExtractText ?? article.extractText,
    flavorText: article.flavorText,
    topicGroup: article.topicGroup,
    sourceUrl: article.sourceUrl,
    categories: article.categories,
    copies: entry.copies,
    favorite: entry.favorite,
    bestRarityCode: entry.bestRarityCode,
    firstObtainedAt: entry.firstObtainedAt,
    lastObtainedAt: entry.lastObtainedAt,
  };
}

function sortCollectionItems(items, sortBy) {
  const cloned = [...items];
  switch (sortBy) {
    case "atk_desc":
      cloned.sort((left, right) => right.atk - left.atk);
      break;
    case "def_desc":
      cloned.sort((left, right) => right.def - left.def);
      break;
    case "title_asc":
      cloned.sort((left, right) => left.title.localeCompare(right.title));
      break;
    case "rarity_desc":
      cloned.sort(
        (left, right) =>
          compareRarity(right.rarity, left.rarity) ||
          right.qualityScore - left.qualityScore
      );
      break;
    case "recent":
    default:
      cloned.sort(
        (left, right) =>
          new Date(right.lastObtainedAt) - new Date(left.lastObtainedAt)
      );
      break;
  }
  return cloned;
}

function applyCollectionFilters(items, filters) {
  const query = String(filters.query ?? "").trim().toLowerCase();
  return items.filter((item) => {
    if (query && !item.title.toLowerCase().includes(query)) {
      return false;
    }
    if (filters.rarity && item.rarity !== filters.rarity) {
      return false;
    }
    if (filters.favorite === true && !item.favorite) {
      return false;
    }
    if (filters.duplicatesOnly === true && item.copies < 2) {
      return false;
    }
    if (filters.newOnly === true && item.copies !== 1) {
      return false;
    }
    if (filters.topicGroup && item.topicGroup !== filters.topicGroup) {
      return false;
    }
    return true;
  });
}

function createPackCards(state, profile, now, randomFn, articleCatalog) {
  const guaranteedSrPlus = profile.pityCounter >= PITY_THRESHOLD;
  const ownedArticleIds = new Set(
    state.browserCollection
      .filter((entry) => entry.browserProfileId === profile.id)
      .map((entry) => entry.articleId)
  );
  const packCards = [];
  let containsSrOrHigher = false;
  let newCardsCount = 0;
  let totalShards = 0;

  for (let slotIndex = 0; slotIndex < PACK_SIZE; slotIndex += 1) {
    const forceGuaranteedSlot = guaranteedSrPlus && slotIndex === PACK_SIZE - 1;
    const rarity = pickWeighted(
      forceGuaranteedSlot ? GUARANTEED_SR_PLUS_WEIGHTS : STANDARD_RARITY_WEIGHTS,
      randomFn
    );
    const articleId = articleCatalog.pickArticleIdForRarity(
      rarity,
      randomFn,
      ownedArticleIds,
      NEW_CARD_WEIGHT_BOOST
    );
    if (!articleId) {
      continue;
    }
    const articleRarity = articleCatalog.getRarityForArticleId(articleId) ?? rarity;
    const articleTopicGroup =
      articleCatalog.getTopicGroupForArticleId(articleId) ?? "General";
    containsSrOrHigher ||= rarityAtLeast(articleRarity, "SR");

    let collectionEntry = state.browserCollection.find(
      (entry) =>
        entry.browserProfileId === profile.id && entry.articleId === articleId
    );
    const duplicateCountBefore = collectionEntry?.copies ?? 0;
    const wasNew = !collectionEntry;
    const shardsEarned = wasNew
      ? 0
      : DUPLICATE_SHARDS_BY_RARITY[articleRarity] ?? 0;

    if (!collectionEntry) {
      collectionEntry = {
        id: createId(state, "collection"),
        browserProfileId: profile.id,
        articleId,
        copies: 1,
        firstObtainedAt: isoDate(now),
        lastObtainedAt: isoDate(now),
        favorite: false,
        bestRarityCode: articleRarity,
        topicGroup: articleTopicGroup,
      };
      state.browserCollection.push(collectionEntry);
      ownedArticleIds.add(articleId);
      newCardsCount += 1;
    } else {
      collectionEntry.copies += 1;
      collectionEntry.lastObtainedAt = isoDate(now);
      collectionEntry.bestRarityCode = collectionEntry.bestRarityCode ?? articleRarity;
      collectionEntry.topicGroup = collectionEntry.topicGroup ?? articleTopicGroup;
    }

    profile.shards += shardsEarned;
    totalShards += shardsEarned;

    packCards.push({
      articleId,
      slotNumber: slotIndex + 1,
      rarity: articleRarity,
      wasNew,
      duplicateCountBefore,
      shardsEarned,
      copiesAfterPull: collectionEntry.copies,
    });
  }

  return {
    guaranteedSrPlus,
    containsSrOrHigher,
    newCardsCount,
    totalShards,
    packCards,
  };
}

async function buildDashboard(state, profile, now, articleCatalog) {
  const recentCollection = await Promise.all(
    sortCollectionItems(
      await Promise.all(
        getProfileCollections(state, profile.id).map((entry) =>
          serializeCollectionEntry(entry, articleCatalog.getArticleById)
        )
      ),
      "recent"
    ).slice(0, 8)
  );
  const recentRewardEvents = state.rewardEvents
    .filter((entry) => entry.browserProfileId === profile.id)
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )
    .slice(0, 14)
    .map(serializeRewardEvent);

  return {
    browserToken: profile.browserToken,
    profile: serializeProfile(profile),
    packStatus: serializePackStatus(profile, now),
    collectionSummary: getCollectionSummary(
      state,
      profile.id,
      articleCatalog.getRarityForArticleId
    ),
    missionSummary: getMissionSummary(state, profile, now),
    trophySummary: getTrophySummary(
      state,
      profile,
      now,
      articleCatalog.getTopicGroupForArticleId,
      articleCatalog.getRarityForArticleId
    ),
    recentPackHistory: getProfilePackHistory(state, profile.id)
      .slice(0, 4)
      .map(serializePackHistoryEntry),
    recentCollection,
    recentRewardEvents,
  };
}

export function createWikipediaGachaService({
  dbPath = DEFAULT_DB_PATH,
  randomFn = Math.random,
  nowFn = () => new Date(),
  randomBytesFn = crypto.randomBytes,
} = {}) {
  // SQLite-backed store — per-user write queues, no global serial bottleneck.
  const db    = openStateDb(dbPath);
  const store = createSqliteStore({ db });

  // Live-Wikipedia pool: articles are fetched from the Wikipedia API and held
  // in RAM.  Pack openings are O(1) synchronous lookups — no disk or network
  // I/O in the critical path.
  const articleCatalogs = new Map();

  function getArticleCatalog(language = "en") {
    const normalizedLanguage = resolvePreferredLanguage(language);
    let catalog = articleCatalogs.get(normalizedLanguage);
    if (!catalog) {
      catalog = createWikipediaGachaCatalog({ language: normalizedLanguage });
      articleCatalogs.set(normalizedLanguage, catalog);
    }
    return catalog;
  }

  async function ensureCatalogReady(language = "en") {
    await db.ready;
    const articleCatalog = getArticleCatalog(language);
    await articleCatalog.ready();
    return articleCatalog;
  }

  async function resolveArticleFromCardLike(cardLike, articleCatalog) {
    const rawId = cardLike?.articleId ?? cardLike?.id;
    const articleId = Number(rawId);
    if (!Number.isFinite(articleId)) return null;
    return articleCatalog.getArticleById(articleId);
  }

  /**
   * Fills in missing extractText / longExtractText / imageUrl from the in-memory pool article.
   * Pool articles are already fully hydrated from the Wikipedia API, so this
   * is an O(1) RAM lookup with no network I/O.
   */
  async function hydrateCardLike(cardLike, articleCatalog) {
    if (!cardLike || typeof cardLike !== "object") return cardLike;

    const article = await resolveArticleFromCardLike(cardLike, articleCatalog);
    if (!article) return cardLike;

    return {
      ...cardLike,
      extractText:
        normalizeArticleText(cardLike.extractText) ||
        normalizeArticleText(article.extractText),
      longExtractText:
        normalizeArticleText(cardLike.longExtractText) ||
        normalizeArticleText(article.longExtractText) ||
        normalizeArticleText(article.extractText),
      imageUrl: cardLike.imageUrl ?? article.imageUrl ?? null,
    };
  }

  async function hydrateCards(cards, articleCatalog) {
    return Promise.all((cards ?? []).map((card) => hydrateCardLike(card, articleCatalog)));
  }

  async function hydrateDashboard(dashboard, articleCatalog) {
    const recentPackHistory = await Promise.all(
      (dashboard.recentPackHistory ?? []).map(async (entry) => ({
        ...entry,
        cards: await hydrateCards(entry.cards ?? [], articleCatalog),
      }))
    );
    const recentCollection = await hydrateCards(dashboard.recentCollection ?? [], articleCatalog);

    return {
      ...dashboard,
      recentPackHistory,
      recentCollection,
    };
  }

  async function bootstrapSession(payload = {}) {
    const preferredLanguage = resolvePreferredLanguage(
      payload.preferredLanguage ?? payload.language ?? payload.locale
    );
    const articleCatalog = await ensureCatalogReady(preferredLanguage);
    const now = nowFn();
    const browserToken = createToken(randomBytesFn);
    const profile = {
      id: null,
      browserToken,
      displayName: payload.displayName
        ? String(payload.displayName).slice(0, 80)
        : "Anonymous Archivist",
      preferredLanguage,
      packsAvailable: DEFAULT_STARTING_PACKS,
      maxPacks: DEFAULT_MAX_PACKS,
      lastPackRegenAt: isoDate(now),
      gems: 0,
      shards: 0,
      trophiesPoints: 0,
      totalPackOpens: 0,
      pityCounter: 0,
      createdAt: isoDate(now),
      updatedAt: isoDate(now),
      lastSeenAt: isoDate(now),
      lastPackOpenedAt: null,
    };

    const state = await store.forToken(browserToken).update(async (draft) => {
      profile.id = createId(draft, "profile");
      draft.browserProfiles.push(profile);
      ensureDailyMissions(draft, profile, now);
      ensureTrophiesUnlocked(
        draft,
        profile,
        now,
        articleCatalog.getTopicGroupForArticleId,
        articleCatalog.getRarityForArticleId
      );
      return draft;
    });

    const createdProfile = state.browserProfiles.find(
      (entry) => entry.browserToken === browserToken
    );
    return {
      browserToken,
      profile: serializeProfile(createdProfile),
      packStatus: serializePackStatus(createdProfile, now),
    };
  }

  async function getSessionMe(browserToken, preferredLanguage = null) {
    const now = nowFn();
    const state = await store.forToken(browserToken).update(async (draft) => {
      const profile = ensureProfile(draft, browserToken);
      syncProfilePreferredLanguage(profile, preferredLanguage, now);
      applyPackRegeneration(profile, now);
      profile.lastSeenAt = isoDate(now);
      profile.updatedAt = isoDate(now);
      recomputeMissionProgress(draft, profile, now);
      const articleCatalog = getArticleCatalog(profile.preferredLanguage);
      await articleCatalog.ready();
      ensureTrophiesUnlocked(
        draft,
        profile,
        now,
        articleCatalog.getTopicGroupForArticleId,
        articleCatalog.getRarityForArticleId
      );
      return draft;
    });
    const profile = state.browserProfiles.find(
      (entry) => entry.browserToken === browserToken
    );
    const preferredCatalog = await ensureCatalogReady(profile?.preferredLanguage);
    return hydrateDashboard(
      await buildDashboard(state, profile, now, preferredCatalog),
      preferredCatalog
    );
  }

  async function getPackStatus(browserToken, preferredLanguage = null) {
    const now = nowFn();
    const state = await store.forToken(browserToken).update(async (draft) => {
      const profile = ensureProfile(draft, browserToken);
      syncProfilePreferredLanguage(profile, preferredLanguage, now);
      applyPackRegeneration(profile, now);
      profile.lastSeenAt = isoDate(now);
      profile.updatedAt = isoDate(now);
      return draft;
    });
    const profile = state.browserProfiles.find(
      (entry) => entry.browserToken === browserToken
    );
    return serializePackStatus(profile, now);
  }

  async function openPack(browserToken, preferredLanguage = null) {
    const now = nowFn();
    const state = await store.forToken(browserToken).update(async (draft) => {
      const profile = ensureProfile(draft, browserToken);
      syncProfilePreferredLanguage(profile, preferredLanguage, now);
      applyPackRegeneration(profile, now);
      const articleCatalog = await ensureCatalogReady(profile.preferredLanguage);

      if (profile.packsAvailable <= 0) {
        const error = new Error("No packs available.");
        error.statusCode = 409;
        error.code = "no_packs_available";
        throw error;
      }

      const lastOpenAtMs = profile.lastPackOpenedAt
        ? new Date(profile.lastPackOpenedAt).getTime()
        : 0;
      if (now.getTime() - lastOpenAtMs < 900) {
        const error = new Error("Pack open rate limit exceeded.");
        error.statusCode = 429;
        error.code = "pack_open_rate_limited";
        throw error;
      }

      const wasAtCap = profile.packsAvailable >= profile.maxPacks;
      const packResult = createPackCards(
        draft,
        profile,
        now,
        randomFn,
        articleCatalog
      );
      const openingCards = await Promise.all(
        packResult.packCards.map(async (packCard) => {
          const article = await articleCatalog.getArticleById(packCard.articleId);
          if (!article) {
            const error = new Error(`Article ${packCard.articleId} not found.`);
            error.statusCode = 500;
            error.code = "catalog_article_not_found";
            throw error;
          }
          const collectionEntry = draft.browserCollection.find(
            (entry) =>
              entry.browserProfileId === profile.id &&
              entry.articleId === packCard.articleId
          );
          return serializePackCardResult(article, collectionEntry, packCard);
        })
      );

      profile.packsAvailable -= 1;
      profile.totalPackOpens += 1;
      profile.lastPackOpenedAt = isoDate(now);
      profile.lastSeenAt = isoDate(now);
      profile.updatedAt = isoDate(now);
      if (wasAtCap) {
        profile.lastPackRegenAt = isoDate(now);
      }
      const safePityCounter = Number.isFinite(Number(profile.pityCounter))
        ? Math.max(
            0,
            Math.min(PITY_THRESHOLD, Math.floor(Number(profile.pityCounter)))
          )
        : 0;
      // Special pack cadence: every 10 opened packs, regardless of rarity results.
      // Once consumed, the counter restarts.
      profile.pityCounter = packResult.guaranteedSrPlus
        ? 0
        : Math.min(PITY_THRESHOLD, safePityCounter + 1);

      const todaysStats = getTodaysStats(draft, profile.id, now);
      todaysStats.packsOpened += 1;
      todaysStats.cardsObtained += openingCards.length;
      todaysStats.newCardsObtained += packResult.newCardsCount;
      todaysStats.srOrHigherCount += openingCards.filter((card) =>
        rarityAtLeast(card.rarity, "SR")
      ).length;

      const opening = {
        id: createId(draft, "packOpening"),
        browserProfileId: profile.id,
        openedAt: isoDate(now),
        guaranteedSrPlus: packResult.guaranteedSrPlus,
        packType: "standard",
        resultSummary: summarizePack(openingCards),
        cards: openingCards,
      };
      draft.packOpenings.push(opening);

      if (packResult.totalShards > 0) {
        draft.rewardEvents.push({
          id: createId(draft, "rewardEvent"),
          browserProfileId: profile.id,
          rewardSource: "duplicate_cards",
          rewardType: "shards",
          rewardAmount: packResult.totalShards,
          createdAt: isoDate(now),
          metadataJson: {
            packOpeningId: opening.id,
          },
        });
      }

      recomputeMissionProgress(draft, profile, now);
      ensureTrophiesUnlocked(
        draft,
        profile,
        now,
        articleCatalog.getTopicGroupForArticleId,
        articleCatalog.getRarityForArticleId
      );
      const nextPackStatus = serializePackStatus(profile, now);
      draft.__lastOpenPackResponse = {
        packOpeningId: opening.id,
        guaranteedSrPlus: packResult.guaranteedSrPlus,
        packsRemaining: profile.packsAvailable,
        pityCounter: profile.pityCounter,
        totalPackOpens: profile.totalPackOpens,
        packStatus: nextPackStatus,
        shardsEarned: packResult.totalShards,
        newCardsCount: packResult.newCardsCount,
        cards: openingCards,
      };
      return draft;
    });

    const response = state.__lastOpenPackResponse;
    const profile = state.browserProfiles.find(
      (entry) => entry.browserToken === browserToken
    );
    const articleCatalog = await ensureCatalogReady(profile?.preferredLanguage);
    return {
      ...response,
      cards: await hydrateCards(response.cards ?? [], articleCatalog),
    };
  }

  async function getPackHistory(browserToken, preferredLanguage = null) {
    const now = nowFn();
    const state = await store.forToken(browserToken).update((draft) => {
      const profile = ensureProfile(draft, browserToken);
      syncProfilePreferredLanguage(profile, preferredLanguage, now);
      applyPackRegeneration(profile, now);
      return draft;
    });
    const profile = state.browserProfiles.find(
      (entry) => entry.browserToken === browserToken
    );
    const articleCatalog = await ensureCatalogReady(profile?.preferredLanguage);
    const packHistory = await Promise.all(
      getProfilePackHistory(state, profile.id).map(async (entry) => {
        const serialized = serializePackHistoryEntry(entry);
        return {
          ...serialized,
          cards: await hydrateCards(serialized.cards ?? [], articleCatalog),
        };
      })
    );

    return { packHistory };
  }

  async function getCollection(browserToken, filters = {}, preferredLanguage = null) {
    const now = nowFn();
    const state = await store.forToken(browserToken).update((draft) => {
      const profile = ensureProfile(draft, browserToken);
      syncProfilePreferredLanguage(profile, preferredLanguage, now);
      applyPackRegeneration(profile, now);
      return draft;
    });
    const profile = state.browserProfiles.find(
      (entry) => entry.browserToken === browserToken
    );
    const articleCatalog = await ensureCatalogReady(profile?.preferredLanguage);
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(60, Math.max(1, Number(filters.pageSize) || 24));

    const serialized = await Promise.all(
      getProfileCollections(state, profile.id).map((entry) =>
        serializeCollectionEntry(entry, articleCatalog.getArticleById)
      )
    );
    const filtered = applyCollectionFilters(serialized, {
      query: filters.query,
      rarity: filters.rarity,
      favorite: filters.favorite,
      duplicatesOnly: filters.duplicatesOnly,
      newOnly: filters.newOnly,
      topicGroup: filters.topicGroup,
    });
    const sorted = sortCollectionItems(filtered, filters.sortBy);
    const startIndex = (page - 1) * pageSize;
    const items = sorted.slice(startIndex, startIndex + pageSize);
    const hydratedItems = await hydrateCards(items, articleCatalog);

    return {
      page,
      pageSize,
      total: sorted.length,
      items: hydratedItems,
      summary: getCollectionSummary(
        state,
        profile.id,
        articleCatalog.getRarityForArticleId
      ),
      availableTopics: Array.from(
        new Set(serialized.map((item) => item.topicGroup).filter(Boolean))
      ).sort((left, right) => left.localeCompare(right)),
    };
  }

  async function getCollectionItem(browserToken, articleId, preferredLanguage = null) {
    const now = nowFn();
    const state = await store.forToken(browserToken).update((draft) => {
      const profile = ensureProfile(draft, browserToken);
      syncProfilePreferredLanguage(profile, preferredLanguage, now);
      applyPackRegeneration(profile, now);
      return draft;
    });
    const profile = state.browserProfiles.find(
      (entry) => entry.browserToken === browserToken
    );
    const articleCatalog = await ensureCatalogReady(profile?.preferredLanguage);
    const collectionEntry = state.browserCollection.find(
      (entry) =>
        entry.browserProfileId === profile.id && entry.articleId === articleId
    );
    if (!collectionEntry) {
      const error = new Error("Collection card not found.");
      error.statusCode = 404;
      error.code = "collection_item_not_found";
      throw error;
    }
    return hydrateCardLike(
      await serializeCollectionEntry(collectionEntry, articleCatalog.getArticleById),
      articleCatalog
    );
  }

  async function toggleFavorite(browserToken, articleId, favorite, preferredLanguage = null) {
    const now = nowFn();
    const state = await store.forToken(browserToken).update((draft) => {
      const profile = ensureProfile(draft, browserToken);
      syncProfilePreferredLanguage(profile, preferredLanguage, now);
      const collectionEntry = draft.browserCollection.find(
        (entry) =>
          entry.browserProfileId === profile.id && entry.articleId === articleId
      );
      if (!collectionEntry) {
        const error = new Error("Collection card not found.");
        error.statusCode = 404;
        error.code = "collection_item_not_found";
        throw error;
      }
      collectionEntry.favorite =
        typeof favorite === "boolean" ? favorite : !collectionEntry.favorite;
      profile.updatedAt = isoDate(now);
      recomputeMissionProgress(draft, profile, now);
      return draft;
    });

    const profile = state.browserProfiles.find(
      (entry) => entry.browserToken === browserToken
    );
    const articleCatalog = await ensureCatalogReady(profile?.preferredLanguage);
    const collectionEntry = state.browserCollection.find(
      (entry) =>
        entry.browserProfileId === profile.id && entry.articleId === articleId
    );
    return hydrateCardLike(
      await serializeCollectionEntry(collectionEntry, articleCatalog.getArticleById),
      articleCatalog
    );
  }

  async function getArticle(articleId, browserToken = null, preferredLanguage = null) {
    let articleCatalog = await ensureCatalogReady(preferredLanguage);
    let profile = null;

    if (browserToken) {
      const now = nowFn();
      const state = await store.forToken(browserToken).update((draft) => {
        const currentProfile = ensureProfile(draft, browserToken);
        syncProfilePreferredLanguage(currentProfile, preferredLanguage, now);
        return draft;
      });
      profile = state.browserProfiles.find(
        (entry) => entry.browserToken === browserToken
      ) ?? null;
      articleCatalog = await ensureCatalogReady(profile?.preferredLanguage);
    }

    const article = await articleCatalog.getArticleById(articleId);
    if (!article) {
      const error = new Error("Article not found.");
      error.statusCode = 404;
      error.code = "article_not_found";
      throw error;
    }

    if (!browserToken) {
      return hydrateCardLike(clone(article), articleCatalog);
    }

    const state = await store.forToken(browserToken).read();
    const collectionEntry = profile
      ? state.browserCollection.find(
          (entry) =>
            entry.browserProfileId === profile.id && entry.articleId === articleId
        )
      : null;

    return hydrateCardLike({
      ...clone(article),
      inCollection: Boolean(collectionEntry),
      copies: collectionEntry?.copies ?? 0,
      favorite: collectionEntry?.favorite ?? false,
    }, articleCatalog);
  }

  async function searchArticles(query, preferredLanguage = null) {
    const articleCatalog = await ensureCatalogReady(preferredLanguage);
    const items = await articleCatalog.searchArticles(query, 20);
    return { items };
  }

  async function registerArticleClick(browserToken, articleId, preferredLanguage = null) {
    const now = nowFn();
    const articleCatalog = await ensureCatalogReady(preferredLanguage);
    const article = await articleCatalog.getArticleById(articleId);
    if (!article) {
      const error = new Error("Article not found.");
      error.statusCode = 404;
      error.code = "article_not_found";
      throw error;
    }
    await store.forToken(browserToken).update((draft) => {
      const profile = ensureProfile(draft, browserToken);
      syncProfilePreferredLanguage(profile, preferredLanguage, now);
      const stats = getTodaysStats(draft, profile.id, now);
      stats.wikipediaClicks += 1;
      profile.updatedAt = isoDate(now);
      recomputeMissionProgress(draft, profile, now);
      return draft;
    });
    return {
      articleId,
      sourceUrl: article.sourceUrl,
      ok: true,
    };
  }

  async function getMissions(browserToken, preferredLanguage = null) {
    const now = nowFn();
    const state = await store.forToken(browserToken).update((draft) => {
      const profile = ensureProfile(draft, browserToken);
      syncProfilePreferredLanguage(profile, preferredLanguage, now);
      recomputeMissionProgress(draft, profile, now);
      return draft;
    });
    const profile = state.browserProfiles.find(
      (entry) => entry.browserToken === browserToken
    );
    return {
      missions: ensureDailyMissions(state, profile, now).map(serializeMissionEntry),
      summary: getMissionSummary(state, profile, now),
    };
  }

  async function claimMission(browserToken, missionId, preferredLanguage = null) {
    const now = nowFn();
    const state = await store.forToken(browserToken).update((draft) => {
      const profile = ensureProfile(draft, browserToken);
      syncProfilePreferredLanguage(profile, preferredLanguage, now);
      const entries = recomputeMissionProgress(draft, profile, now);
      const entry = entries.find((candidate) => candidate.missionId === missionId);
      if (!entry) {
        const error = new Error("Mission not found.");
        error.statusCode = 404;
        error.code = "mission_not_found";
        throw error;
      }
      if (!entry.completed) {
        const error = new Error("Mission not completed.");
        error.statusCode = 409;
        error.code = "mission_not_completed";
        throw error;
      }
      if (entry.claimed) {
        const error = new Error("Mission already claimed.");
        error.statusCode = 409;
        error.code = "mission_already_claimed";
        throw error;
      }

      const mission = MISSION_BY_ID.get(missionId);
      if (mission.rewardType === "gems") {
        profile.gems += mission.rewardAmount;
      }
      if (mission.rewardType === "shards") {
        profile.shards += mission.rewardAmount;
      }
      if (mission.rewardType === "packs") {
        profile.packsAvailable = Math.min(
          profile.maxPacks,
          profile.packsAvailable + mission.rewardAmount
        );
      }

      entry.claimed = true;
      entry.updatedAt = isoDate(now);
      profile.updatedAt = isoDate(now);
      draft.rewardEvents.push({
        id: createId(draft, "rewardEvent"),
        browserProfileId: profile.id,
        rewardSource: "mission_claim",
        rewardType: mission.rewardType,
        rewardAmount: mission.rewardAmount,
        createdAt: isoDate(now),
        metadataJson: {
          missionId,
          missionCode: mission.code,
        },
      });
      draft.__claimMissionResponse = {
        mission: serializeMissionEntry(entry),
        profile: serializeProfile(profile),
      };
      return draft;
    });

    return state.__claimMissionResponse;
  }

  async function getTrophies(browserToken, { unlockedOnly = false, preferredLanguage = null } = {}) {
    const now = nowFn();
    const state = await store.forToken(browserToken).update((draft) => {
      const profile = ensureProfile(draft, browserToken);
      syncProfilePreferredLanguage(profile, preferredLanguage, now);
      const profileLanguage = profile.preferredLanguage;
      const articleCatalog = getArticleCatalog(profileLanguage);
      ensureTrophiesUnlocked(
        draft,
        profile,
        now,
        articleCatalog.getTopicGroupForArticleId,
        articleCatalog.getRarityForArticleId
      );
      return draft;
    });
    const profile = state.browserProfiles.find(
      (entry) => entry.browserToken === browserToken
    );
    const articleCatalog = await ensureCatalogReady(profile?.preferredLanguage);
    const unlockedEntries = state.browserTrophies.filter(
      (entry) => entry.browserProfileId === profile.id
    );
    const unlockedById = new Map(
      unlockedEntries.map((entry) => [entry.trophyId, entry])
    );

    const trophies = TROPHIES.filter(
      (trophy) => !unlockedOnly || unlockedById.has(trophy.id)
    ).map((trophy) => {
      const unlockedEntry = unlockedById.get(trophy.id);
      return unlockedEntry
        ? serializeTrophyEntry(unlockedEntry)
        : {
            id: trophy.id,
            code: trophy.code,
            name: trophy.name,
            description: trophy.description,
            iconKey: trophy.iconKey,
            points: trophy.points,
            unlockedAt: null,
            unlocked: false,
          };
    });

    return {
      trophies,
      summary: getTrophySummary(
        state,
        profile,
        now,
        articleCatalog.getTopicGroupForArticleId,
        articleCatalog.getRarityForArticleId
      ),
    };
  }

  async function exportRecoveryCode(browserToken, preferredLanguage = null) {
    const now = nowFn();
    const state = await store.forToken(browserToken).update(async (draft) => {
      const profile = ensureProfile(draft, browserToken);
      syncProfilePreferredLanguage(profile, preferredLanguage, now);
      const code = createRecoveryCode(randomBytesFn);
      const collection = getProfileCollections(draft, profile.id);
      const packHistory = getProfilePackHistory(draft, profile.id);
      const trophies = draft.browserTrophies.filter(
        (entry) => entry.browserProfileId === profile.id
      );
      const missionRows = ensureDailyMissions(draft, profile, now);

      draft.recoveries.push({
        code,
        createdAt: isoDate(now),
        snapshot: {
          profile: {
            displayName: profile.displayName,
            preferredLanguage: resolvePreferredLanguage(profile.preferredLanguage),
            packsAvailable: profile.packsAvailable,
            maxPacks: profile.maxPacks,
            lastPackRegenAt: profile.lastPackRegenAt,
            gems: profile.gems,
            shards: profile.shards,
            trophiesPoints: profile.trophiesPoints,
            totalPackOpens: profile.totalPackOpens,
            pityCounter: profile.pityCounter,
          },
          collection: collection.map((entry) => ({
            articleId: entry.articleId,
            copies: entry.copies,
            favorite: entry.favorite,
            bestRarityCode: entry.bestRarityCode,
            topicGroup: entry.topicGroup,
            firstObtainedAt: entry.firstObtainedAt,
            lastObtainedAt: entry.lastObtainedAt,
          })),
          packHistory: packHistory.slice(0, 20).map((entry) => ({
            openedAt: entry.openedAt,
            guaranteedSrPlus: entry.guaranteedSrPlus,
            packType: entry.packType,
            resultSummary: entry.resultSummary,
            cards: entry.cards,
          })),
          trophies: trophies.map((entry) => ({
            trophyId: entry.trophyId,
            unlockedAt: entry.unlockedAt,
          })),
          missions: missionRows.map((entry) => ({
            missionId: entry.missionId,
            progressValue: entry.progressValue,
            completed: entry.completed,
            claimed: entry.claimed,
            resetDate: entry.resetDate,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
          })),
        },
      });

      draft.__recoveryResponse = {
        recoveryCode: code,
        createdAt: isoDate(now),
      };
      return draft;
    });

    return state.__recoveryResponse;
  }

  async function importRecoveryCode(browserToken, recoveryCode, preferredLanguage = null) {
    const now = nowFn();

    // Recovery codes are stored in a separate indexed table, not inside the
    // per-user state blob.  Pre-fetch the snapshot before entering the
    // serialised per-user update so we can still throw a 404 quickly.
    const recoverySnapshot = await store.findRecovery(recoveryCode);
    if (!recoverySnapshot) {
      const error = new Error("Recovery code not found.");
      error.statusCode = 404;
      error.code = "recovery_code_not_found";
      throw error;
    }

    const state = await store.forToken(browserToken).update(async (draft) => {
      const profile = ensureProfile(draft, browserToken);
      const snapshot = recoverySnapshot;
      Object.assign(profile, {
        displayName: snapshot.profile.displayName,
        preferredLanguage: resolvePreferredLanguage(
          preferredLanguage ?? snapshot.profile.preferredLanguage
        ),
        packsAvailable: snapshot.profile.packsAvailable,
        maxPacks: snapshot.profile.maxPacks,
        lastPackRegenAt: snapshot.profile.lastPackRegenAt,
        gems: snapshot.profile.gems,
        shards: snapshot.profile.shards,
        trophiesPoints: snapshot.profile.trophiesPoints,
        totalPackOpens: snapshot.profile.totalPackOpens,
        pityCounter: snapshot.profile.pityCounter,
        updatedAt: isoDate(now),
      });

      draft.browserCollection = draft.browserCollection.filter(
        (entry) => entry.browserProfileId !== profile.id
      );
      for (const collectionEntry of snapshot.collection) {
        draft.browserCollection.push({
          id: createId(draft, "collection"),
          browserProfileId: profile.id,
          ...collectionEntry,
        });
      }

      draft.packOpenings = draft.packOpenings.filter(
        (entry) => entry.browserProfileId !== profile.id
      );
      for (const opening of snapshot.packHistory) {
        draft.packOpenings.push({
          id: createId(draft, "packOpening"),
          browserProfileId: profile.id,
          ...opening,
        });
      }

      draft.browserTrophies = draft.browserTrophies.filter(
        (entry) => entry.browserProfileId !== profile.id
      );
      for (const trophyEntry of snapshot.trophies) {
        draft.browserTrophies.push({
          id: createId(draft, "browserTrophy"),
          browserProfileId: profile.id,
          trophyId: trophyEntry.trophyId,
          unlockedAt: trophyEntry.unlockedAt,
        });
      }

      draft.browserMissions = draft.browserMissions.filter(
        (entry) => entry.browserProfileId !== profile.id
      );
      for (const missionEntry of snapshot.missions) {
        draft.browserMissions.push({
          id: createId(draft, "browserMission"),
          browserProfileId: profile.id,
          missionId: missionEntry.missionId,
          progressValue: missionEntry.progressValue,
          completed: missionEntry.completed,
          claimed: missionEntry.claimed,
          resetDate: missionEntry.resetDate,
          createdAt: missionEntry.createdAt,
          updatedAt: missionEntry.updatedAt,
        });
      }

      recomputeMissionProgress(draft, profile, now);
      ensureTrophiesUnlocked(
        draft,
        profile,
        now,
        articleCatalog.getTopicGroupForArticleId,
        articleCatalog.getRarityForArticleId
      );
      const articleCatalog = await ensureCatalogReady(profile.preferredLanguage);
      draft.__importResponse = await buildDashboard(
        draft,
        profile,
        now,
        articleCatalog
      );
      return draft;
    });

    const profile = state.browserProfiles.find(
      (entry) => entry.browserToken === browserToken
    );
    const articleCatalog = await ensureCatalogReady(profile?.preferredLanguage);
    return hydrateDashboard(state.__importResponse, articleCatalog);
  }

  return {
    bootstrapSession,
    getSessionMe,
    getPackStatus,
    openPack,
    getPackHistory,
    getCollection,
    getCollectionItem,
    toggleFavorite,
    getArticle,
    searchArticles,
    registerArticleClick,
    getMissions,
    claimMission,
    getTrophies,
    exportRecoveryCode,
    importRecoveryCode,
    async getCatalog(limit = 500) {
      const articleCatalog = await ensureCatalogReady();
      return articleCatalog.listCatalog(limit);
    },
    async close() {
      await Promise.all(
        Array.from(articleCatalogs.values()).map((catalog) => catalog.close())
      );
      await db.close();
    },
  };
}

export const wikipediaGachaService = createWikipediaGachaService({
  dbPath: process.env.WIKIPEDIA_GACHA_DB_PATH ?? DEFAULT_DB_PATH,
});

export {
  applyPackRegeneration,
  getSecondsUntilNextPack,
};
