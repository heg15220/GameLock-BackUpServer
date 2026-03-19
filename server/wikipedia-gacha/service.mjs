import crypto from "node:crypto";
import path from "node:path";
import {
  ARTICLES,
  DEFAULT_MAX_PACKS,
  DEFAULT_STARTING_PACKS,
  DUPLICATE_SHARDS_BY_RARITY,
  GUARANTEED_SR_PLUS_WEIGHTS,
  MISSIONS,
  PACK_REGEN_INTERVAL_MS,
  PACK_SIZE,
  PITY_THRESHOLD,
  RARITY_ORDER,
  RECOVERY_CODE_PREFIX,
  STANDARD_RARITY_WEIGHTS,
  TROPHIES,
  compareRarity,
} from "./constants.mjs";
import { createJsonStore } from "./storage.mjs";

const DEFAULT_STORE_FILE = path.join(
  process.cwd(),
  "server",
  "data",
  "wikipedia-gacha",
  "store.json"
);

const ARTICLE_BY_ID = new Map(ARTICLES.map((article) => [article.id, article]));
const ARTICLES_BY_RARITY = ARTICLES.reduce((accumulator, article) => {
  accumulator[article.rarityCode] ??= [];
  accumulator[article.rarityCode].push(article);
  return accumulator;
}, {});
const MISSION_BY_ID = new Map(MISSIONS.map((mission) => [mission.id, mission]));
const TROPHY_BY_ID = new Map(TROPHIES.map((trophy) => [trophy.id, trophy]));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

function pickArticleForRarity(rarityCode, randomFn) {
  const bucket = ARTICLES_BY_RARITY[rarityCode] ?? ARTICLES;
  const index = Math.floor(randomFn() * bucket.length) % bucket.length;
  return bucket[index];
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
  return {
    displayName: profile.displayName,
    packsAvailable: profile.packsAvailable,
    maxPacks: profile.maxPacks,
    gems: profile.gems,
    shards: profile.shards,
    trophiesPoints: profile.trophiesPoints,
    totalPackOpens: profile.totalPackOpens,
    pityCounter: profile.pityCounter,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    lastSeenAt: profile.lastSeenAt,
  };
}

function serializePackStatus(profile, now) {
  return {
    packsAvailable: profile.packsAvailable,
    maxPacks: profile.maxPacks,
    pityCounter: profile.pityCounter,
    nextPackGuaranteedSrPlus: profile.pityCounter >= PITY_THRESHOLD,
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
    flavorText: article.flavorText,
    wasNew: packCard.wasNew,
    copiesAfterPull: collectionEntry.copies,
    shardsEarned: packCard.shardsEarned,
    sourceUrl: article.sourceUrl,
    topicGroup: article.topicGroup,
  };
}

function serializePackHistoryEntry(opening) {
  return {
    packOpeningId: opening.id,
    openedAt: opening.openedAt,
    guaranteedSrPlus: opening.guaranteedSrPlus,
    packType: opening.packType,
    resultSummary: opening.resultSummary,
    cards: opening.cards,
  };
}

function getCollectionSummary(state, profileId) {
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
    const article = ARTICLE_BY_ID.get(entry.articleId);
    if (article) {
      rarityBreakdown[article.rarityCode] =
        (rarityBreakdown[article.rarityCode] ?? 0) + 1;
    }
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

function getTrophyConditions(state, profile) {
  const collection = getProfileCollections(state, profile.id);
  const uniqueCount = collection.length;
  const duplicateCopies = collection.reduce(
    (sum, entry) => sum + Math.max(0, entry.copies - 1),
    0
  );
  const scienceCount = collection.filter((entry) => {
    const article = ARTICLE_BY_ID.get(entry.articleId);
    return article?.topicGroup === "Science";
  }).length;
  const historyCount = collection.filter((entry) => {
    const article = ARTICLE_BY_ID.get(entry.articleId);
    return article?.topicGroup === "History";
  }).length;
  const highestRarity = collection.reduce((best, entry) => {
    const article = ARTICLE_BY_ID.get(entry.articleId);
    if (!article) return best;
    if (!best || compareRarity(article.rarityCode, best) > 0) {
      return article.rarityCode;
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

function ensureTrophiesUnlocked(state, profile, now) {
  const unlocked = state.browserTrophies.filter(
    (entry) => entry.browserProfileId === profile.id
  );
  const unlockedCodes = new Set(
    unlocked.map((entry) => TROPHY_BY_ID.get(entry.trophyId)?.code).filter(Boolean)
  );
  const conditions = getTrophyConditions(state, profile);

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

function getTrophySummary(state, profile, now) {
  const unlocked = ensureTrophiesUnlocked(state, profile, now);
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

function serializeCollectionEntry(entry) {
  const article = ARTICLE_BY_ID.get(entry.articleId);
  return {
    articleId: article.id,
    title: article.wikipediaTitle,
    rarity: article.rarityCode,
    qualityScore: article.qualityScore,
    atk: article.atk,
    def: article.defStat,
    imageUrl: article.imageUrl,
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

function createPackCards(state, profile, now, randomFn) {
  const guaranteedSrPlus = profile.pityCounter >= PITY_THRESHOLD;
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
    const article = pickArticleForRarity(rarity, randomFn);
    containsSrOrHigher ||= rarityAtLeast(article.rarityCode, "SR");

    let collectionEntry = state.browserCollection.find(
      (entry) =>
        entry.browserProfileId === profile.id && entry.articleId === article.id
    );
    const duplicateCountBefore = collectionEntry?.copies ?? 0;
    const wasNew = !collectionEntry;
    const shardsEarned = wasNew
      ? 0
      : DUPLICATE_SHARDS_BY_RARITY[article.rarityCode] ?? 0;

    if (!collectionEntry) {
      collectionEntry = {
        id: createId(state, "collection"),
        browserProfileId: profile.id,
        articleId: article.id,
        copies: 1,
        firstObtainedAt: isoDate(now),
        lastObtainedAt: isoDate(now),
        favorite: false,
        bestRarityCode: article.rarityCode,
      };
      state.browserCollection.push(collectionEntry);
      newCardsCount += 1;
    } else {
      collectionEntry.copies += 1;
      collectionEntry.lastObtainedAt = isoDate(now);
    }

    profile.shards += shardsEarned;
    totalShards += shardsEarned;

    packCards.push({
      articleId: article.id,
      slotNumber: slotIndex + 1,
      rarity: article.rarityCode,
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

function buildDashboard(state, profile, now) {
  return {
    browserToken: profile.browserToken,
    profile: serializeProfile(profile),
    packStatus: serializePackStatus(profile, now),
    collectionSummary: getCollectionSummary(state, profile.id),
    missionSummary: getMissionSummary(state, profile, now),
    trophySummary: getTrophySummary(state, profile, now),
    recentPackHistory: getProfilePackHistory(state, profile.id)
      .slice(0, 4)
      .map(serializePackHistoryEntry),
    recentCollection: sortCollectionItems(
      getProfileCollections(state, profile.id).map(serializeCollectionEntry),
      "recent"
    ).slice(0, 8),
  };
}

export function createWikipediaGachaService({
  storeFile = DEFAULT_STORE_FILE,
  randomFn = Math.random,
  nowFn = () => new Date(),
  randomBytesFn = crypto.randomBytes,
} = {}) {
  const store = createJsonStore({ storeFile });

  async function bootstrapSession(payload = {}) {
    const now = nowFn();
    const browserToken = createToken(randomBytesFn);
    const profile = {
      id: null,
      browserToken,
      displayName: payload.displayName
        ? String(payload.displayName).slice(0, 80)
        : "Anonymous Archivist",
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

    const state = await store.update((draft) => {
      profile.id = createId(draft, "profile");
      draft.browserProfiles.push(profile);
      ensureDailyMissions(draft, profile, now);
      ensureTrophiesUnlocked(draft, profile, now);
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

  async function getSessionMe(browserToken) {
    const now = nowFn();
    const state = await store.update((draft) => {
      const profile = ensureProfile(draft, browserToken);
      applyPackRegeneration(profile, now);
      profile.lastSeenAt = isoDate(now);
      profile.updatedAt = isoDate(now);
      recomputeMissionProgress(draft, profile, now);
      ensureTrophiesUnlocked(draft, profile, now);
      return draft;
    });
    const profile = state.browserProfiles.find(
      (entry) => entry.browserToken === browserToken
    );
    return buildDashboard(state, profile, now);
  }

  async function getPackStatus(browserToken) {
    const now = nowFn();
    const state = await store.update((draft) => {
      const profile = ensureProfile(draft, browserToken);
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

  async function openPack(browserToken) {
    const now = nowFn();
    const state = await store.update((draft) => {
      const profile = ensureProfile(draft, browserToken);
      applyPackRegeneration(profile, now);

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
      const packResult = createPackCards(draft, profile, now, randomFn);
      const openingCards = packResult.packCards.map((packCard) => {
        const article = ARTICLE_BY_ID.get(packCard.articleId);
        const collectionEntry = draft.browserCollection.find(
          (entry) =>
            entry.browserProfileId === profile.id &&
            entry.articleId === packCard.articleId
        );
        return serializePackCardResult(article, collectionEntry, packCard);
      });

      profile.packsAvailable -= 1;
      profile.totalPackOpens += 1;
      profile.lastPackOpenedAt = isoDate(now);
      profile.lastSeenAt = isoDate(now);
      profile.updatedAt = isoDate(now);
      if (wasAtCap) {
        profile.lastPackRegenAt = isoDate(now);
      }
      profile.pityCounter = packResult.containsSrOrHigher
        ? 0
        : Math.min(PITY_THRESHOLD, profile.pityCounter + 1);

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
      ensureTrophiesUnlocked(draft, profile, now);
      draft.__lastOpenPackResponse = {
        packOpeningId: opening.id,
        guaranteedSrPlus: packResult.guaranteedSrPlus,
        packsRemaining: profile.packsAvailable,
        pityCounter: profile.pityCounter,
        shardsEarned: packResult.totalShards,
        newCardsCount: packResult.newCardsCount,
        cards: openingCards,
      };
      return draft;
    });

    return state.__lastOpenPackResponse;
  }

  async function getPackHistory(browserToken) {
    const now = nowFn();
    const state = await store.update((draft) => {
      const profile = ensureProfile(draft, browserToken);
      applyPackRegeneration(profile, now);
      return draft;
    });
    const profile = state.browserProfiles.find(
      (entry) => entry.browserToken === browserToken
    );
    return {
      packHistory: getProfilePackHistory(state, profile.id).map(
        serializePackHistoryEntry
      ),
    };
  }

  async function getCollection(browserToken, filters = {}) {
    const now = nowFn();
    const state = await store.update((draft) => {
      const profile = ensureProfile(draft, browserToken);
      applyPackRegeneration(profile, now);
      return draft;
    });
    const profile = state.browserProfiles.find(
      (entry) => entry.browserToken === browserToken
    );
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(60, Math.max(1, Number(filters.pageSize) || 24));

    const serialized = getProfileCollections(state, profile.id).map(
      serializeCollectionEntry
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

    return {
      page,
      pageSize,
      total: sorted.length,
      items,
      summary: getCollectionSummary(state, profile.id),
      availableTopics: Array.from(
        new Set(serialized.map((item) => item.topicGroup).filter(Boolean))
      ).sort((left, right) => left.localeCompare(right)),
    };
  }

  async function getCollectionItem(browserToken, articleId) {
    const now = nowFn();
    const state = await store.update((draft) => {
      const profile = ensureProfile(draft, browserToken);
      applyPackRegeneration(profile, now);
      return draft;
    });
    const profile = state.browserProfiles.find(
      (entry) => entry.browserToken === browserToken
    );
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
    return serializeCollectionEntry(collectionEntry);
  }

  async function toggleFavorite(browserToken, articleId, favorite) {
    const now = nowFn();
    const state = await store.update((draft) => {
      const profile = ensureProfile(draft, browserToken);
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
    const collectionEntry = state.browserCollection.find(
      (entry) =>
        entry.browserProfileId === profile.id && entry.articleId === articleId
    );
    return serializeCollectionEntry(collectionEntry);
  }

  async function getArticle(articleId, browserToken = null) {
    const article = ARTICLE_BY_ID.get(articleId);
    if (!article) {
      const error = new Error("Article not found.");
      error.statusCode = 404;
      error.code = "article_not_found";
      throw error;
    }

    if (!browserToken) {
      return clone(article);
    }

    const state = await store.read();
    const profile = state.browserProfiles.find(
      (entry) => entry.browserToken === browserToken
    );
    const collectionEntry = profile
      ? state.browserCollection.find(
          (entry) =>
            entry.browserProfileId === profile.id && entry.articleId === articleId
        )
      : null;

    return {
      ...clone(article),
      inCollection: Boolean(collectionEntry),
      copies: collectionEntry?.copies ?? 0,
      favorite: collectionEntry?.favorite ?? false,
    };
  }

  async function searchArticles(query) {
    const term = String(query ?? "").trim().toLowerCase();
    const items = ARTICLES.filter((article) => {
      if (!term) return true;
      return article.wikipediaTitle.toLowerCase().includes(term);
    })
      .slice(0, 20)
      .map((article) => ({
        articleId: article.id,
        title: article.wikipediaTitle,
        rarity: article.rarityCode,
        qualityScore: article.qualityScore,
        topicGroup: article.topicGroup,
        sourceUrl: article.sourceUrl,
      }));
    return { items };
  }

  async function registerArticleClick(browserToken, articleId) {
    const now = nowFn();
    const article = ARTICLE_BY_ID.get(articleId);
    if (!article) {
      const error = new Error("Article not found.");
      error.statusCode = 404;
      error.code = "article_not_found";
      throw error;
    }
    await store.update((draft) => {
      const profile = ensureProfile(draft, browserToken);
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

  async function getMissions(browserToken) {
    const now = nowFn();
    const state = await store.update((draft) => {
      const profile = ensureProfile(draft, browserToken);
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

  async function claimMission(browserToken, missionId) {
    const now = nowFn();
    const state = await store.update((draft) => {
      const profile = ensureProfile(draft, browserToken);
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

  async function getTrophies(browserToken, { unlockedOnly = false } = {}) {
    const now = nowFn();
    const state = await store.update((draft) => {
      const profile = ensureProfile(draft, browserToken);
      ensureTrophiesUnlocked(draft, profile, now);
      return draft;
    });
    const profile = state.browserProfiles.find(
      (entry) => entry.browserToken === browserToken
    );
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
      summary: getTrophySummary(state, profile, now),
    };
  }

  async function exportRecoveryCode(browserToken) {
    const now = nowFn();
    const state = await store.update((draft) => {
      const profile = ensureProfile(draft, browserToken);
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

  async function importRecoveryCode(browserToken, recoveryCode) {
    const now = nowFn();
    const state = await store.update((draft) => {
      const profile = ensureProfile(draft, browserToken);
      const recovery = draft.recoveries.find(
        (entry) => entry.code === recoveryCode
      );
      if (!recovery) {
        const error = new Error("Recovery code not found.");
        error.statusCode = 404;
        error.code = "recovery_code_not_found";
        throw error;
      }

      const snapshot = recovery.snapshot;
      Object.assign(profile, {
        displayName: snapshot.profile.displayName,
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
      ensureTrophiesUnlocked(draft, profile, now);
      draft.__importResponse = buildDashboard(draft, profile, now);
      return draft;
    });

    return state.__importResponse;
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
    getCatalog() {
      return ARTICLES.map((article) => clone(article));
    },
  };
}

export const wikipediaGachaService = createWikipediaGachaService({
  storeFile:
    process.env.WIKIPEDIA_GACHA_STORE_FILE ?? DEFAULT_STORE_FILE,
});

export {
  applyPackRegeneration,
  getSecondsUntilNextPack,
};
