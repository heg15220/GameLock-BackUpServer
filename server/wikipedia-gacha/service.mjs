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
import { createEmptyState } from "./storage.mjs";
import {
  createWikipediaGachaPersistence,
  DEFAULT_SQLITE_DB_PATH,
} from "./persistence.mjs";
import { createCache } from "./cache.mjs";

const MISSION_BY_ID = new Map(MISSIONS.map((mission) => [mission.id, mission]));
const TROPHY_BY_ID = new Map(TROPHIES.map((trophy) => [trophy.id, trophy]));
const TRACKED_TOPIC_GROUPS = [
  "Science",
  "Mathematics",
  "History",
  "Geography",
  "Technology",
  "Art",
  "Culture",
  "Society",
];
const TOKEN_ID_NAMESPACE_SIZE = 1_000_000;
const DAILY_MISSION_GROUP_SLOTS = [
  { group: "starter", count: 1 },
  { group: "packs", count: 2 },
  { group: "collection", count: 2 },
  { group: "rarity", count: 1 },
  { group: "explore", count: 1 },
  { group: "curation", count: 1 },
  { group: "topic", count: 1 },
];
const LAST_SEEN_TOUCH_INTERVAL_MS = 5 * 60 * 1000;
const MAX_DASHBOARD_PACK_HISTORY = 4;
const MAX_PERSISTED_PACK_HISTORY = 24;
const STATELESS_TOKEN_PREFIX = "wg1";
const TOKEN_SECRET = process.env.WIKIPEDIA_GACHA_TOKEN_SECRET ?? "wikipedia-gacha-dev-secret";

function buildEmptyCollectionSummary() {
  return {
    uniqueCards: 0,
    totalCopies: 0,
    favorites: 0,
    rarityBreakdown: RARITY_ORDER.reduce((accumulator, rarity) => {
      accumulator[rarity] = 0;
      return accumulator;
    }, {}),
  };
}

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

function normalizeStatCount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.floor(numeric));
}

function normalizeTopicCounts(topicCounts) {
  const normalized = {};
  for (const topicGroup of TRACKED_TOPIC_GROUPS) {
    normalized[topicGroup] = normalizeStatCount(topicCounts?.[topicGroup]);
  }
  return normalized;
}

function getTopicMetricKey(topicGroup) {
  return `${String(topicGroup ?? "").toLowerCase()}_cards_obtained`;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickDailyMissionTemplates(profile, now) {
  const resetDate = yyyyMmDd(now);
  const selected = [];
  const selectedIds = new Set();
  const activeDailyMissions = MISSIONS.filter(
    (mission) => mission.isActive && mission.missionScope === "daily"
  );

  const rankCandidates = (group) =>
    activeDailyMissions
      .filter((mission) => mission.missionGroup === group && !selectedIds.has(mission.id))
      .map((mission) => ({
        mission,
        score: hashString(
          `${profile.browserToken}:${resetDate}:${group}:${mission.code}:${mission.id}`
        ),
      }))
      .sort((left, right) => left.score - right.score || left.mission.id - right.mission.id)
      .map((entry) => entry.mission);

  for (const slot of DAILY_MISSION_GROUP_SLOTS) {
    const candidates = rankCandidates(slot.group);
    for (const mission of candidates.slice(0, slot.count)) {
      selected.push(mission);
      selectedIds.add(mission.id);
    }
  }

  const desiredCount = DAILY_MISSION_GROUP_SLOTS.reduce(
    (sum, slot) => sum + slot.count,
    0
  );
  if (selected.length < desiredCount) {
    const overflow = activeDailyMissions
      .filter((mission) => !selectedIds.has(mission.id))
      .map((mission) => ({
        mission,
        score: hashString(
          `${profile.browserToken}:${resetDate}:overflow:${mission.code}:${mission.id}`
        ),
      }))
      .sort((left, right) => left.score - right.score || left.mission.id - right.mission.id)
      .map((entry) => entry.mission);
    for (const mission of overflow.slice(0, desiredCount - selected.length)) {
      selected.push(mission);
      selectedIds.add(mission.id);
    }
  }

  return selected;
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

function signStatelessTokenPayload(encodedPayload) {
  return crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(encodedPayload)
    .digest("base64url");
}

function parseStatelessToken(browserToken) {
  const [prefix, encodedPayload, signature] = String(browserToken ?? "").split(".");
  if (!prefix || !encodedPayload || !signature || prefix !== STATELESS_TOKEN_PREFIX) {
    return null;
  }
  const expectedSignature = signStatelessTokenPayload(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");
  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    return payload?.v === 1 ? payload : null;
  } catch {
    return null;
  }
}

function isExplicitTransientTokenPayload(tokenPayload) {
  return tokenPayload?.p === 0;
}

function isPersistedTokenPayload(tokenPayload) {
  return tokenPayload?.p === 1;
}

function createToken(randomBytesFn, payload = {}) {
  const encodedPayload = Buffer.from(
    JSON.stringify({
      v: 1,
      j: randomBytesFn(8).toString("base64url"),
      n: payload.displayName ?? "Anonymous Archivist",
      l: resolvePreferredLanguage(payload.preferredLanguage),
      t: payload.createdAt ?? new Date().toISOString(),
      p: payload.persisted ? 1 : 0,
    }),
    "utf8"
  ).toString("base64url");
  return `${STATELESS_TOKEN_PREFIX}.${encodedPayload}.${signStatelessTokenPayload(encodedPayload)}`;
}

function createRecoveryCode(randomBytesFn) {
  const raw = randomBytesFn(6).toString("hex").toUpperCase();
  return `${RECOVERY_CODE_PREFIX}-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

function createTokenScopedIdBase(browserToken) {
  const hash = crypto
    .createHash("sha256")
    .update(String(browserToken ?? ""))
    .digest();
  return hash.readUInt32BE(0) * TOKEN_ID_NAMESPACE_SIZE;
}

function primeStateIdsFromToken(state, browserToken) {
  const baseId = createTokenScopedIdBase(browserToken) + 1;
  state.nextIds = {
    profile: baseId,
    collection: baseId,
    packOpening: baseId,
    browserMission: baseId,
    browserTrophy: baseId,
    rewardEvent: baseId,
    dailyStat: baseId,
  };
}

function materializeProfileFromToken(state, browserToken) {
  const tokenPayload = parseStatelessToken(browserToken);
  if (!tokenPayload) {
    return null;
  }
  primeStateIdsFromToken(state, browserToken);
  const createdAt = new Date(tokenPayload.t).toString() === "Invalid Date"
    ? new Date().toISOString()
    : new Date(tokenPayload.t).toISOString();
  const profile = {
    id: createId(state, "profile"),
    browserToken,
    displayName: tokenPayload.n
      ? String(tokenPayload.n).slice(0, 80)
      : "Anonymous Archivist",
    preferredLanguage: resolvePreferredLanguage(tokenPayload.l),
    packsAvailable: DEFAULT_STARTING_PACKS,
    maxPacks: DEFAULT_MAX_PACKS,
    lastPackRegenAt: createdAt,
    gems: 0,
    shards: 0,
    trophiesPoints: 0,
    totalPackOpens: 0,
    pityCounter: 0,
    createdAt,
    updatedAt: createdAt,
    lastSeenAt: createdAt,
    lastPackOpenedAt: null,
  };
  state.browserProfiles.push(profile);
  return profile;
}

function ensureProfile(state, browserToken) {
  const profile = state.browserProfiles.find(
    (entry) => entry.browserToken === browserToken
  ) ?? materializeProfileFromToken(state, browserToken);
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

function promoteProfileTokenForPersistence(state, profile, randomBytesFn) {
  const tokenPayload = parseStatelessToken(profile.browserToken);
  if (!isExplicitTransientTokenPayload(tokenPayload)) {
    return profile.browserToken;
  }
  const promotedToken = createToken(randomBytesFn, {
    displayName: profile.displayName,
    preferredLanguage: profile.preferredLanguage,
    createdAt: profile.createdAt,
    persisted: true,
  });
  profile.browserToken = promotedToken;
  state.__promotedBrowserToken = promotedToken;
  return promotedToken;
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

function hasProfileCollection(state, profileId) {
  return state.browserCollection.some((entry) => entry.browserProfileId === profileId);
}

function hasProfilePackOpenings(state, profileId) {
  return state.packOpenings.some((entry) => entry.browserProfileId === profileId);
}

function hasProfileRewardEvents(state, profileId) {
  return state.rewardEvents.some((entry) => entry.browserProfileId === profileId);
}

function hasProfileDailyStats(state, profileId) {
  return state.dailyBrowserStats.some((entry) => entry.browserProfileId === profileId);
}

function hasProfileTrophies(state, profileId) {
  return state.browserTrophies.some((entry) => entry.browserProfileId === profileId);
}

function shouldSkipExpensiveTrophyRecompute(state, profile) {
  return (
    profile.totalPackOpens <= 0 &&
    profile.gems <= 0 &&
    profile.shards <= 0 &&
    !hasProfileCollection(state, profile.id) &&
    !hasProfileRewardEvents(state, profile.id) &&
    !hasProfileDailyStats(state, profile.id) &&
    !hasProfileTrophies(state, profile.id)
  );
}

function hasPersistedProgress(state, profile) {
  return (
    profile.totalPackOpens > 0 ||
    profile.gems > 0 ||
    profile.shards > 0 ||
    profile.trophiesPoints > 0 ||
    hasProfileCollection(state, profile.id) ||
    hasProfilePackOpenings(state, profile.id) ||
    hasProfileRewardEvents(state, profile.id) ||
    hasProfileDailyStats(state, profile.id) ||
    hasProfileTrophies(state, profile.id)
  );
}

function trimProfilePackHistory(state, profileId, maxEntries = MAX_PERSISTED_PACK_HISTORY) {
  const sorted = getProfilePackHistory(state, profileId);
  if (sorted.length <= maxEntries) {
    return;
  }
  const keepIds = new Set(sorted.slice(0, maxEntries).map((entry) => entry.id));
  state.packOpenings = state.packOpenings.filter(
    (entry) => entry.browserProfileId !== profileId || keepIds.has(entry.id)
  );
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
      duplicateCardsObtained: 0,
      srOrHigherCount: 0,
      ssrOrHigherCount: 0,
      urOrHigherCount: 0,
      wikipediaClicks: 0,
      shardsEarned: 0,
      topicCardsObtained: normalizeTopicCounts(),
    };
    state.dailyBrowserStats.push(stats);
  }
  stats.packsOpened = normalizeStatCount(stats.packsOpened);
  stats.cardsObtained = normalizeStatCount(stats.cardsObtained);
  stats.newCardsObtained = normalizeStatCount(stats.newCardsObtained);
  stats.duplicateCardsObtained = normalizeStatCount(stats.duplicateCardsObtained);
  stats.srOrHigherCount = normalizeStatCount(stats.srOrHigherCount);
  stats.ssrOrHigherCount = normalizeStatCount(stats.ssrOrHigherCount);
  stats.urOrHigherCount = normalizeStatCount(stats.urOrHigherCount);
  stats.wikipediaClicks = normalizeStatCount(stats.wikipediaClicks);
  stats.shardsEarned = normalizeStatCount(stats.shardsEarned);
  stats.topicCardsObtained = normalizeTopicCounts(stats.topicCardsObtained);
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

function awardPackReward(state, profile, now, amount, rewardSource, metadataJson = {}) {
  const rewardAmount = Math.max(
    0,
    Math.min(profile.maxPacks - profile.packsAvailable, Math.floor(Number(amount) || 0))
  );
  if (rewardAmount <= 0) {
    return 0;
  }

  profile.packsAvailable += rewardAmount;
  profile.updatedAt = isoDate(now);
  profile.lastSeenAt = isoDate(now);
  state.rewardEvents.push({
    id: createId(state, "rewardEvent"),
    browserProfileId: profile.id,
    rewardSource,
    rewardType: "packs",
    rewardAmount,
    createdAt: isoDate(now),
    metadataJson,
  });
  return rewardAmount;
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

function serializeStoredPackCardResult(article, collectionEntry, packCard, language) {
  return {
    articleId: article.id,
    language: language ?? "en",
    wasNew: packCard.wasNew,
    copiesAfterPull: collectionEntry.copies,
    shardsEarned: packCard.shardsEarned,
    rarity: article.rarityCode,
  };
}

function buildArticleSnapshot(article, language) {
  return {
    articleId: article.id,
    language: language ?? "en",
    title: article.wikipediaTitle ?? "",
    rarityCode: article.rarityCode ?? null,
    qualityScore: Number(article.qualityScore) || 0,
    atk: Number(article.atk) || 0,
    defStat: Number(article.defStat) || 0,
    imageUrl: article.imageUrl ?? null,
    extractText: article.extractText ?? null,
    longExtractText: article.longExtractText ?? article.extractText ?? null,
    flavorText: article.flavorText ?? null,
    sourceUrl: article.sourceUrl ?? null,
    topicGroup: article.topicGroup ?? null,
  };
}

function pushPendingArticle(state, article, language) {
  if (!article || !language) return;
  if (!state.__articlesPending) {
    state.__articlesPending = new Map();
  }
  const key = `${article.id}|${language}`;
  if (!state.__articlesPending.has(key)) {
    state.__articlesPending.set(key, buildArticleSnapshot(article, language));
  }
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
  const activeMissions = pickDailyMissionTemplates(profile, now);
  const activeMissionIds = new Set(activeMissions.map((mission) => mission.id));
  for (const mission of activeMissions) {
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
      entry.browserProfileId === profile.id &&
      entry.resetDate === resetDate &&
      activeMissionIds.has(entry.missionId)
  );
}

function recomputeMissionProgress(state, profile, now) {
  const todaysStats = getTodaysStats(state, profile.id, now);
  const entries = ensureDailyMissions(state, profile, now);
  let changed = false;
  const collection = getProfileCollections(state, profile.id);
  const favoritesMarked = collection.filter((entry) => entry.favorite).length;
  const metrics = {
    packs_opened: todaysStats.packsOpened,
    cards_obtained: todaysStats.cardsObtained,
    new_cards_obtained: todaysStats.newCardsObtained,
    duplicate_cards_obtained: todaysStats.duplicateCardsObtained,
    shards_earned: todaysStats.shardsEarned,
    sr_or_higher_count: todaysStats.srOrHigherCount,
    ssr_or_higher_count: todaysStats.ssrOrHigherCount,
    ur_or_higher_count: todaysStats.urOrHigherCount,
    wikipedia_clicks: todaysStats.wikipediaClicks,
    favorites_marked: favoritesMarked,
  };
  for (const topicGroup of TRACKED_TOPIC_GROUPS) {
    metrics[getTopicMetricKey(topicGroup)] =
      normalizeStatCount(todaysStats.topicCardsObtained?.[topicGroup]);
  }

  for (const entry of entries) {
    const mission = MISSION_BY_ID.get(entry.missionId);
    if (!mission) {
      continue;
    }
    const nextProgressValue = Math.min(
      mission.targetValue,
      metrics[mission.targetType] ?? 0
    );
    const nextCompleted = nextProgressValue >= mission.targetValue;
    if (entry.progressValue !== nextProgressValue || entry.completed !== nextCompleted) {
      entry.progressValue = nextProgressValue;
      entry.completed = nextCompleted;
      entry.updatedAt = isoDate(now);
      changed = true;
    }
  }

  state.__missionProgressChanged = changed;

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

function getRecentRewardEvents(state, profileId, limit = 14) {
  return state.rewardEvents
    .filter((entry) => entry.browserProfileId === profileId)
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )
    .slice(0, limit)
    .map(serializeRewardEvent);
}

function getTrophyConditions(
  state,
  profile,
  getTopicGroupForArticleId,
  getRarityForArticleId
) {
  const collection = getProfileCollections(state, profile.id);
  const uniqueCount = collection.length;
  const totalCopies = collection.reduce((sum, entry) => sum + entry.copies, 0);
  const duplicateCopies = collection.reduce(
    (sum, entry) => sum + Math.max(0, entry.copies - 1),
    0
  );
  const favoritesCount = collection.filter((entry) => entry.favorite).length;
  const topicCounts = TRACKED_TOPIC_GROUPS.reduce((accumulator, topicGroup) => {
    accumulator[topicGroup] = collection.filter((entry) => {
      const topic = entry.topicGroup || getTopicGroupForArticleId(entry.articleId);
      return topic === topicGroup;
    }).length;
    return accumulator;
  }, {});
  const discoveredTopicVariety = Object.values(topicCounts).filter(
    (count) => count > 0
  ).length;
  const highestRarity = collection.reduce((best, entry) => {
    const rarityCode =
      entry.bestRarityCode || getRarityForArticleId(entry.articleId);
    if (!rarityCode) return best;
    if (!best || compareRarity(rarityCode, best) > 0) {
      return rarityCode;
    }
    return best;
  }, null);
  const srPlusCount = collection.filter((entry) =>
    rarityAtLeast(entry.bestRarityCode || getRarityForArticleId(entry.articleId), "SR")
  ).length;
  const ssrPlusCount = collection.filter((entry) =>
    rarityAtLeast(entry.bestRarityCode || getRarityForArticleId(entry.articleId), "SSR")
  ).length;
  const totalWikipediaClicks = state.dailyBrowserStats
    .filter((entry) => entry.browserProfileId === profile.id)
    .reduce((sum, entry) => sum + normalizeStatCount(entry.wikipediaClicks), 0);
  const missionClaims = state.rewardEvents.filter(
    (entry) =>
      entry.browserProfileId === profile.id &&
      entry.rewardSource === "mission_claim"
  ).length;

  return {
    "first-card": uniqueCount >= 1,
    "first-sr-plus-set": srPlusCount >= 3,
    "first-sr": highestRarity ? rarityAtLeast(highestRarity, "SR") : false,
    "first-ssr": highestRarity ? rarityAtLeast(highestRarity, "SSR") : false,
    "first-ur": highestRarity ? rarityAtLeast(highestRarity, "UR") : false,
    "first-lr": highestRarity ? rarityAtLeast(highestRarity, "LR") : false,
    "unique-15": uniqueCount >= 15,
    "unique-40": uniqueCount >= 40,
    "unique-80": uniqueCount >= 80,
    "unique-150": uniqueCount >= 150,
    "duplicates-10": duplicateCopies >= 10,
    "duplicates-30": duplicateCopies >= 30,
    "duplicates-75": duplicateCopies >= 75,
    "copies-120": totalCopies >= 120,
    "packs-10": profile.totalPackOpens >= 10,
    "packs-25": profile.totalPackOpens >= 25,
    "packs-50": profile.totalPackOpens >= 50,
    "packs-100": profile.totalPackOpens >= 100,
    "favorites-3": favoritesCount >= 3,
    "favorites-10": favoritesCount >= 10,
    "science-collector": topicCounts.Science >= 6,
    "history-collector": topicCounts.History >= 5,
    "geography-collector": topicCounts.Geography >= 6,
    "technology-collector": topicCounts.Technology >= 6,
    "art-collector": topicCounts.Art >= 6,
    "culture-collector": topicCounts.Culture >= 6,
    "society-collector": topicCounts.Society >= 6,
    "mathematics-collector": topicCounts.Mathematics >= 4,
    "topic-variety-4": discoveredTopicVariety >= 4,
    "topic-variety-7": discoveredTopicVariety >= 7,
    "wikipedia-clicks-5": totalWikipediaClicks >= 5,
    "wikipedia-clicks-25": totalWikipediaClicks >= 25,
    "mission-claims-5": missionClaims >= 5,
    "mission-claims-20": missionClaims >= 20,
    "shards-250": profile.shards >= 250,
    "shards-1000": profile.shards >= 1000,
    "gems-250": profile.gems >= 250,
    "gems-750": profile.gems >= 750,
    "ssr-set-5": ssrPlusCount >= 5,
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

  let changed = false;
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
    changed = true;
  }

  state.__trophiesUnlockedChanged = changed;

  return state.browserTrophies.filter(
    (entry) => entry.browserProfileId === profile.id
  );
}

function shouldTouchLastSeen(profile, now) {
  const lastSeenAtMs = profile?.lastSeenAt ? new Date(profile.lastSeenAt).getTime() : 0;
  return !Number.isFinite(lastSeenAtMs) || (now.getTime() - lastSeenAtMs) >= LAST_SEEN_TOUCH_INTERVAL_MS;
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

async function buildDashboard(state, profile, now, articleCatalog, summaries = {}) {
  return {
    browserToken: profile.browserToken,
    profile: serializeProfile(profile),
    packStatus: serializePackStatus(profile, now),
    collectionSummary: summaries.collectionSummary ?? getCollectionSummary(
      state,
      profile.id,
      articleCatalog.getRarityForArticleId
    ),
    missionSummary: summaries.missionSummary ?? getMissionSummary(state, profile, now),
    trophySummary: summaries.trophySummary ?? getTrophySummary(
      state,
      profile,
      now,
      articleCatalog.getTopicGroupForArticleId,
      articleCatalog.getRarityForArticleId
    ),
    recentPackHistory: getProfilePackHistory(state, profile.id)
      .slice(0, MAX_DASHBOARD_PACK_HISTORY)
      .map(serializePackHistoryEntry),
    recentRewardEvents: getRecentRewardEvents(state, profile.id),
  };
}

export function createWikipediaGachaService({
  dbPath = DEFAULT_SQLITE_DB_PATH,
  storageDriver = null,
  postgresUrl = null,
  randomFn = Math.random,
  nowFn = () => new Date(),
  randomBytesFn = crypto.randomBytes,
  cache: cacheOverride = null,
} = {}) {
  // SQLite-backed store — per-user write queues, no global serial bottleneck.
  const { db, store } = createWikipediaGachaPersistence({
    storageDriver,
    postgresUrl,
    dbPath,
  });
  const cache = cacheOverride ?? createCache();
  const PACK_OPEN_RATE_LIMIT = Math.max(
    1,
    Number(process.env.WIKIPEDIA_GACHA_RATE_LIMIT_PER_MIN || 60) || 60
  );

  // In-memory rate-limit fallback for when Redis is unavailable. Each entry
  // is {count, resetAt}. Cleared lazily on access.
  const localRateBuckets = new Map();
  function incrLocalRate(token, windowMs = 60_000) {
    if (!token) return 0;
    const now = Date.now();
    const bucket = localRateBuckets.get(token);
    if (!bucket || bucket.resetAt <= now) {
      localRateBuckets.set(token, { count: 1, resetAt: now + windowMs });
      return 1;
    }
    bucket.count += 1;
    return bucket.count;
  }
  // Periodic eviction so the map cannot grow unbounded under churn.
  const localRateSweep = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of localRateBuckets) {
      if (v.resetAt <= now) localRateBuckets.delete(k);
    }
  }, 60_000);
  if (typeof localRateSweep.unref === "function") localRateSweep.unref();

  function hashQuery(value) {
    if (value == null) return "_";
    if (typeof value !== "object") return String(value);
    const keys = Object.keys(value).sort();
    const pairs = keys
      .filter((k) => value[k] !== undefined && value[k] !== null && value[k] !== "")
      .map((k) => `${k}=${value[k]}`);
    return pairs.length ? pairs.join("&") : "_";
  }

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

  async function buildTransientStateForUnpersistedToken(
    browserToken,
    preferredLanguage,
    now
  ) {
    const tokenPayload = parseStatelessToken(browserToken);
    if (!tokenPayload) {
      return null;
    }
    if (isPersistedTokenPayload(tokenPayload)) {
      return null;
    }
    if (!isExplicitTransientTokenPayload(tokenPayload) && await store.hasPersistedState(browserToken)) {
      return null;
    }
    const state = createEmptyState();
    const profile = materializeProfileFromToken(state, browserToken);
    if (!profile) {
      return null;
    }
    syncProfilePreferredLanguage(profile, preferredLanguage, now);
    applyPackRegeneration(profile, now);
    return { state, profile };
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
      title: cardLike.title ?? article.wikipediaTitle ?? `Article #${article.id}`,
      rarity: cardLike.rarity ?? article.rarityCode ?? "C",
      qualityScore: Number(cardLike.qualityScore ?? article.qualityScore) || 0,
      atk: Number(cardLike.atk ?? article.atk) || 0,
      def: Number(cardLike.def ?? cardLike.defStat ?? article.defStat) || 0,
      extractText:
        normalizeArticleText(cardLike.extractText) ||
        normalizeArticleText(article.extractText),
      longExtractText:
        normalizeArticleText(cardLike.longExtractText) ||
        normalizeArticleText(article.longExtractText) ||
        normalizeArticleText(article.extractText),
      imageUrl: cardLike.imageUrl ?? article.imageUrl ?? null,
      flavorText: cardLike.flavorText ?? article.flavorText ?? null,
      sourceUrl: cardLike.sourceUrl ?? article.sourceUrl ?? null,
      topicGroup: cardLike.topicGroup ?? article.topicGroup ?? "General",
    };
  }

  async function hydrateCards(cards, articleCatalog) {
    return Promise.all((cards ?? []).map((card) => hydrateCardLike(card, articleCatalog)));
  }

  async function performOpenPackMutation(draft, profile, now, articleCatalog) {
    const hasSpecialPackReady = Number(profile.pityCounter) >= PITY_THRESHOLD;

    if (profile.packsAvailable <= 0 && !hasSpecialPackReady) {
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
    const packLanguage = profile.preferredLanguage ?? "en";
    const storedOpeningCards = await Promise.all(
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
        pushPendingArticle(draft, article, packLanguage);
        return serializeStoredPackCardResult(article, collectionEntry, packCard, packLanguage);
      })
    );

    if (!hasSpecialPackReady) {
      profile.packsAvailable -= 1;
    }
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
    profile.pityCounter = packResult.guaranteedSrPlus
      ? 0
      : Math.min(PITY_THRESHOLD, safePityCounter + 1);

    const todaysStats = getTodaysStats(draft, profile.id, now);
    todaysStats.packsOpened += 1;
    todaysStats.cardsObtained += openingCards.length;
    todaysStats.newCardsObtained += packResult.newCardsCount;
    todaysStats.duplicateCardsObtained += openingCards.filter(
      (card) => !card.wasNew
    ).length;
    todaysStats.srOrHigherCount += openingCards.filter((card) =>
      rarityAtLeast(card.rarity, "SR")
    ).length;
    todaysStats.ssrOrHigherCount += openingCards.filter((card) =>
      rarityAtLeast(card.rarity, "SSR")
    ).length;
    todaysStats.urOrHigherCount += openingCards.filter((card) =>
      rarityAtLeast(card.rarity, "UR")
    ).length;
    todaysStats.shardsEarned += packResult.totalShards;
    for (const card of openingCards) {
      if (TRACKED_TOPIC_GROUPS.includes(card.topicGroup)) {
        todaysStats.topicCardsObtained[card.topicGroup] += 1;
      }
    }

    const opening = {
      id: createId(draft, "packOpening"),
      browserProfileId: profile.id,
      openedAt: isoDate(now),
      guaranteedSrPlus: packResult.guaranteedSrPlus,
      packType: "standard",
      resultSummary: summarizePack(openingCards),
      cards: storedOpeningCards,
    };
    draft.packOpenings.push(opening);
    trimProfilePackHistory(draft, profile.id);

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
      browserToken: profile.browserToken,
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
  }

  async function hydrateDashboard(dashboard, articleCatalog) {
    const recentPackHistory = await Promise.all(
      (dashboard.recentPackHistory ?? []).map(async (entry) => ({
        ...entry,
        cards: await hydrateCards(entry.cards ?? [], articleCatalog),
      }))
    );

    return {
      ...dashboard,
      recentPackHistory,
    };
  }

  async function bootstrapSession(payload = {}) {
    const preferredLanguage = resolvePreferredLanguage(
      payload.preferredLanguage ?? payload.language ?? payload.locale
    );
    const now = nowFn();
    const displayName = payload.displayName
      ? String(payload.displayName).slice(0, 80)
      : "Anonymous Archivist";
    const browserToken = createToken(randomBytesFn, {
      displayName,
      preferredLanguage,
      createdAt: isoDate(now),
      persisted: false,
    });
    store.registerTransientToken(browserToken);
    const profile = {
      displayName,
      preferredLanguage,
      packsAvailable: DEFAULT_STARTING_PACKS,
      maxPacks: DEFAULT_MAX_PACKS,
      gems: 0,
      shards: 0,
      trophiesPoints: 0,
      totalPackOpens: 0,
      pityCounter: 0,
      createdAt: isoDate(now),
      updatedAt: isoDate(now),
      lastSeenAt: isoDate(now),
    };
    return {
      browserToken,
      profile: serializeProfile(profile),
      packStatus: serializePackStatus({
        ...profile,
        lastPackRegenAt: isoDate(now),
      }, now),
    };
  }

  async function getSessionMe(browserToken, preferredLanguage = null) {
    const now = nowFn();
    const transient = await buildTransientStateForUnpersistedToken(
      browserToken,
      preferredLanguage,
      now
    );
    if (transient) {
      const missionEntries = ensureDailyMissions(transient.state, transient.profile, now);
      return {
        browserToken: transient.profile.browserToken,
        profile: serializeProfile(transient.profile),
        packStatus: serializePackStatus(transient.profile, now),
        collectionSummary: buildEmptyCollectionSummary(),
        missionSummary: {
          total: missionEntries.length,
          completed: missionEntries.filter((entry) => entry.completed).length,
          claimable: missionEntries.filter((entry) => entry.completed && !entry.claimed).length,
        },
        trophySummary: {
          total: TROPHIES.length,
          unlocked: 0,
          points: transient.profile.trophiesPoints,
        },
        recentPackHistory: [],
        recentRewardEvents: [],
      };
    }
    let collectionSummary = null;
    let missionSummary = null;
    let trophySummary = null;
    let hasCollection = false;
    let hasPackHistory = false;
    let shouldHydrateDashboardResponse = false;
    const state = await store.forToken(browserToken).update(async (draft) => {
      const profile = ensureProfile(draft, browserToken);
      let changed = false;
      const previousLanguage = profile.preferredLanguage;
      const previousPacksAvailable = profile.packsAvailable;
      const previousLastPackRegenAt = profile.lastPackRegenAt;

      syncProfilePreferredLanguage(profile, preferredLanguage, now);
      changed ||= profile.preferredLanguage !== previousLanguage;
      applyPackRegeneration(profile, now);
      changed ||= profile.packsAvailable !== previousPacksAvailable;
      changed ||= profile.lastPackRegenAt !== previousLastPackRegenAt;
      if (shouldTouchLastSeen(profile, now)) {
        profile.lastSeenAt = isoDate(now);
        changed = true;
      }
      recomputeMissionProgress(draft, profile, now);
      changed ||= Boolean(draft.__missionProgressChanged);
      hasCollection = hasProfileCollection(draft, profile.id);
      hasPackHistory = hasProfilePackOpenings(draft, profile.id);
      shouldHydrateDashboardResponse = hasCollection || hasPackHistory;
      if (shouldSkipExpensiveTrophyRecompute(draft, profile)) {
        collectionSummary = buildEmptyCollectionSummary();
      } else {
        const articleCatalog = getArticleCatalog(profile.preferredLanguage);
        await articleCatalog.ready();
        ensureTrophiesUnlocked(
          draft,
          profile,
          now,
          articleCatalog.getTopicGroupForArticleId,
          articleCatalog.getRarityForArticleId
        );
        changed ||= Boolean(draft.__trophiesUnlockedChanged);
        collectionSummary = hasCollection
          ? getCollectionSummary(
              draft,
              profile.id,
              articleCatalog.getRarityForArticleId
            )
          : buildEmptyCollectionSummary();
      }
      const missionEntries = ensureDailyMissions(draft, profile, now);
      missionSummary = {
        total: missionEntries.length,
        completed: missionEntries.filter((entry) => entry.completed).length,
        claimable: missionEntries.filter((entry) => entry.completed && !entry.claimed).length,
      };
      trophySummary = {
        total: TROPHIES.length,
        unlocked: draft.browserTrophies.filter((entry) => entry.browserProfileId === profile.id).length,
        points: profile.trophiesPoints,
      };
      if (changed) {
        profile.updatedAt = isoDate(now);
      }
      return {
        state: draft,
        persist: changed && hasPersistedProgress(draft, profile),
      };
    });
    const profile = state.browserProfiles.find(
      (entry) => entry.browserToken === browserToken
    );
    if (!shouldHydrateDashboardResponse) {
      return {
        browserToken: profile.browserToken,
        profile: serializeProfile(profile),
        packStatus: serializePackStatus(profile, now),
        collectionSummary: collectionSummary ?? buildEmptyCollectionSummary(),
        missionSummary: missionSummary ?? { total: 0, completed: 0, claimable: 0 },
        trophySummary: trophySummary ?? {
          total: TROPHIES.length,
          unlocked: 0,
          points: profile.trophiesPoints,
        },
        recentPackHistory: [],
        recentRewardEvents: getRecentRewardEvents(state, profile.id),
      };
    }
    const preferredCatalog = await ensureCatalogReady(profile?.preferredLanguage);
    return hydrateDashboard(
      await buildDashboard(state, profile, now, preferredCatalog, {
        collectionSummary,
        missionSummary,
        trophySummary,
      }),
      preferredCatalog
    );
  }

  async function getPackStatus(browserToken, preferredLanguage = null) {
    const now = nowFn();
    const transient = await buildTransientStateForUnpersistedToken(
      browserToken,
      preferredLanguage,
      now
    );
    if (transient) {
      return serializePackStatus(transient.profile, now);
    }
    // Lean read: a single SELECT on browser_profiles, no enqueue, no full
    // state hydration. Pack regeneration is computed ephemerally on a clone
    // — the next write path (openPack, claim, etc.) will recompute and
    // persist it correctly. Same idempotent math, no wasted I/O on reads.
    const persisted = await store.readProfileOnly(browserToken);
    if (!persisted) {
      const error = new Error("Browser profile not found.");
      error.statusCode = 401;
      error.code = "invalid_browser_token";
      throw error;
    }
    const profile = { ...persisted };
    applyPackRegeneration(profile, now);
    return serializePackStatus(profile, now);
  }

  async function openPack(browserToken, preferredLanguage = null) {
    const now = nowFn();
    const transient = await buildTransientStateForUnpersistedToken(
      browserToken,
      preferredLanguage,
      now
    );
    if (transient) {
      const articleCatalog = await ensureCatalogReady(transient.profile.preferredLanguage);
      await performOpenPackMutation(transient.state, transient.profile, now, articleCatalog);
      promoteProfileTokenForPersistence(transient.state, transient.profile, randomBytesFn);
      transient.state.__lastOpenPackResponse.browserToken = transient.profile.browserToken;
      await store.forToken(browserToken).write(transient.state, { immediate: true });
      const response = transient.state.__lastOpenPackResponse;
      return {
        ...response,
        cards: await hydrateCards(response.cards ?? [], articleCatalog),
      };
    }
    const state = await store.forToken(browserToken).update(async (draft) => {
      const profile = ensureProfile(draft, browserToken);
      syncProfilePreferredLanguage(profile, preferredLanguage, now);
      applyPackRegeneration(profile, now);
      promoteProfileTokenForPersistence(draft, profile, randomBytesFn);
      const articleCatalog = await ensureCatalogReady(profile.preferredLanguage);
      return performOpenPackMutation(draft, profile, now, articleCatalog);
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
    const transient = await buildTransientStateForUnpersistedToken(
      browserToken,
      preferredLanguage,
      now
    );
    if (transient) {
      return { packHistory: [] };
    }
    const state = await store.forToken(browserToken).update((draft) => {
      const profile = ensureProfile(draft, browserToken);
      let changed = false;
      const previousLanguage = profile.preferredLanguage;
      const previousPacksAvailable = profile.packsAvailable;
      const previousLastPackRegenAt = profile.lastPackRegenAt;
      syncProfilePreferredLanguage(profile, preferredLanguage, now);
      changed ||= profile.preferredLanguage !== previousLanguage;
      applyPackRegeneration(profile, now);
      changed ||= profile.packsAvailable !== previousPacksAvailable;
      changed ||= profile.lastPackRegenAt !== previousLastPackRegenAt;
      if (changed) {
        profile.updatedAt = isoDate(now);
      }
      return {
        state: draft,
        persist: changed && hasPersistedProgress(draft, profile),
      };
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
    const transient = await buildTransientStateForUnpersistedToken(
      browserToken,
      preferredLanguage,
      now
    );
    if (transient) {
      const page = Math.max(1, Number(filters.page) || 1);
      const pageSize = Math.min(60, Math.max(1, Number(filters.pageSize) || 24));
      return {
        page,
        pageSize,
        total: 0,
        items: [],
        summary: buildEmptyCollectionSummary(),
        availableTopics: [],
      };
    }
    const state = await store.forToken(browserToken).update((draft) => {
      const profile = ensureProfile(draft, browserToken);
      let changed = false;
      const previousLanguage = profile.preferredLanguage;
      const previousPacksAvailable = profile.packsAvailable;
      const previousLastPackRegenAt = profile.lastPackRegenAt;
      syncProfilePreferredLanguage(profile, preferredLanguage, now);
      changed ||= profile.preferredLanguage !== previousLanguage;
      applyPackRegeneration(profile, now);
      changed ||= profile.packsAvailable !== previousPacksAvailable;
      changed ||= profile.lastPackRegenAt !== previousLastPackRegenAt;
      if (changed) {
        profile.updatedAt = isoDate(now);
      }
      return {
        state: draft,
        persist: changed && hasPersistedProgress(draft, profile),
      };
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
      let changed = false;
      const previousLanguage = profile.preferredLanguage;
      const previousPacksAvailable = profile.packsAvailable;
      const previousLastPackRegenAt = profile.lastPackRegenAt;
      syncProfilePreferredLanguage(profile, preferredLanguage, now);
      changed ||= profile.preferredLanguage !== previousLanguage;
      applyPackRegeneration(profile, now);
      changed ||= profile.packsAvailable !== previousPacksAvailable;
      changed ||= profile.lastPackRegenAt !== previousLastPackRegenAt;
      if (changed) {
        profile.updatedAt = isoDate(now);
      }
      return {
        state: draft,
        persist: changed && hasPersistedProgress(draft, profile),
      };
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
      promoteProfileTokenForPersistence(draft, profile, randomBytesFn);
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
    return {
      browserToken: profile.browserToken,
      ...(await hydrateCardLike(
        await serializeCollectionEntry(collectionEntry, articleCatalog.getArticleById),
        articleCatalog
      )),
    };
  }

  async function getArticle(articleId, browserToken = null, preferredLanguage = null) {
    let articleCatalog = await ensureCatalogReady(preferredLanguage);
    let profile = null;

    if (browserToken) {
      const now = nowFn();
      const state = await store.forToken(browserToken).update((draft) => {
        const currentProfile = ensureProfile(draft, browserToken);
        const previousLanguage = currentProfile.preferredLanguage;
        syncProfilePreferredLanguage(currentProfile, preferredLanguage, now);
        const changed = currentProfile.preferredLanguage !== previousLanguage;
        if (changed) {
          currentProfile.updatedAt = isoDate(now);
        }
        return {
          state: draft,
          persist: changed && hasPersistedProgress(draft, currentProfile),
        };
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
    const state = await store.forToken(browserToken).update((draft) => {
      const profile = ensureProfile(draft, browserToken);
      syncProfilePreferredLanguage(profile, preferredLanguage, now);
      promoteProfileTokenForPersistence(draft, profile, randomBytesFn);
      const stats = getTodaysStats(draft, profile.id, now);
      stats.wikipediaClicks += 1;
      profile.updatedAt = isoDate(now);
      recomputeMissionProgress(draft, profile, now);
      draft.__articleClickResponse = {
        browserToken: profile.browserToken,
        articleId,
        sourceUrl: article.sourceUrl,
        ok: true,
      };
      return draft;
    });
    return state.__articleClickResponse;
  }

  async function getMissions(browserToken, preferredLanguage = null) {
    const now = nowFn();
    const transient = await buildTransientStateForUnpersistedToken(
      browserToken,
      preferredLanguage,
      now
    );
    if (transient) {
      const missions = ensureDailyMissions(transient.state, transient.profile, now);
      return {
        missions: missions.map(serializeMissionEntry),
        summary: getMissionSummary(transient.state, transient.profile, now),
      };
    }
    const state = await store.forToken(browserToken).update((draft) => {
      const profile = ensureProfile(draft, browserToken);
      syncProfilePreferredLanguage(profile, preferredLanguage, now);
      recomputeMissionProgress(draft, profile, now);
      return {
        state: draft,
        persist:
          (draft.__missionProgressChanged || false) &&
          hasPersistedProgress(draft, profile),
      };
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
      promoteProfileTokenForPersistence(draft, profile, randomBytesFn);
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
        browserToken: profile.browserToken,
        mission: serializeMissionEntry(entry),
        profile: serializeProfile(profile),
      };
      return draft;
    });

    return state.__claimMissionResponse;
  }

  async function claimRewardedAdPacks(browserToken, preferredLanguage = null) {
    const now = nowFn();
    const state = await store.forToken(browserToken).update((draft) => {
      const profile = ensureProfile(draft, browserToken);
      syncProfilePreferredLanguage(profile, preferredLanguage, now);
      promoteProfileTokenForPersistence(draft, profile, randomBytesFn);
      applyPackRegeneration(profile, now);

      const targetPackCount = Math.min(profile.maxPacks, 3);
      if (profile.packsAvailable >= targetPackCount || profile.pityCounter >= PITY_THRESHOLD) {
        const error = new Error("Rewarded ad is only available when no packs remain.");
        error.statusCode = 409;
        error.code = "rewarded_ad_not_available";
        throw error;
      }

      const rewardedPacks = awardPackReward(
        draft,
        profile,
        now,
        targetPackCount - profile.packsAvailable,
        "rewarded_ad",
        { rewardedPacks: 3 }
      );
      draft.__rewardedAdResponse = {
        browserToken: profile.browserToken,
        rewardedPacks,
        profile: serializeProfile(profile),
        packStatus: serializePackStatus(profile, now),
      };
      recomputeMissionProgress(draft, profile, now);
      return draft;
    });

    return state.__rewardedAdResponse;
  }

  async function getTrophies(browserToken, { unlockedOnly = false, preferredLanguage = null } = {}) {
    const now = nowFn();
    const transient = await buildTransientStateForUnpersistedToken(
      browserToken,
      preferredLanguage,
      now
    );
    if (transient) {
      return {
        trophies: TROPHIES.filter(
          (trophy) => !unlockedOnly
        ).map((trophy) => ({
          id: trophy.id,
          code: trophy.code,
          name: trophy.name,
          description: trophy.description,
          iconKey: trophy.iconKey,
          points: trophy.points,
          unlockedAt: null,
          unlocked: false,
        })),
        summary: {
          total: TROPHIES.length,
          unlocked: 0,
          points: transient.profile.trophiesPoints,
        },
      };
    }
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
      return {
        state: draft,
        persist:
          (draft.__trophiesUnlockedChanged || false) &&
          hasPersistedProgress(draft, profile),
      };
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
      promoteProfileTokenForPersistence(draft, profile, randomBytesFn);
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
        browserToken: profile.browserToken,
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
      promoteProfileTokenForPersistence(draft, profile, randomBytesFn);
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
      const articleCatalog = await ensureCatalogReady(profile.preferredLanguage);
      ensureTrophiesUnlocked(
        draft,
        profile,
        now,
        articleCatalog.getTopicGroupForArticleId,
        articleCatalog.getRarityForArticleId
      );
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
    bootstrapSession: async (payload) => {
      const result = await bootstrapSession(payload);
      if (cache.enabled && result?.browserToken) {
        cache.invalidateUser(result.browserToken).catch(() => {});
      }
      return result;
    },

    getSessionMe: (token, lang) => {
      if (!cache.enabled) return getSessionMe(token, lang);
      return cache.getOrSet(`me:${token}`, cache.ttls.sessionMe, () =>
        getSessionMe(token, lang)
      );
    },

    getPackStatus: (token, lang) => {
      if (!cache.enabled) return getPackStatus(token, lang);
      return cache.getOrSet(`packs:${token}`, cache.ttls.packStatus, () =>
        getPackStatus(token, lang)
      );
    },

    openPack: async (token, lang, idempotencyKey = null) => {
      if (cache.enabled && idempotencyKey) {
        const replay = await cache.takeIdempotency(token, idempotencyKey);
        if (replay) return replay;
      }
      const rateCount = cache.enabled
        ? await cache.incrRateLimit("open", token, 60)
        : incrLocalRate(token);
      if (token && rateCount > PACK_OPEN_RATE_LIMIT) {
        const error = new Error("Rate limit exceeded for pack opens.");
        error.statusCode = 429;
        error.code = "rate_limited";
        throw error;
      }
      const result = await openPack(token, lang);
      if (cache.enabled) {
        await cache.invalidateUser(token);
        if (idempotencyKey) {
          await cache.storeIdempotency(token, idempotencyKey, result);
        }
      }
      return result;
    },

    getPackHistory: (token, lang) => {
      if (!cache.enabled) return getPackHistory(token, lang);
      return cache.getOrSet(`hist:${token}`, cache.ttls.collection, () =>
        getPackHistory(token, lang)
      );
    },

    getCollection: (token, query, lang) => {
      if (!cache.enabled) return getCollection(token, query, lang);
      return cache.getOrSet(
        `col:${token}:${hashQuery(query)}`,
        cache.ttls.collection,
        () => getCollection(token, query, lang)
      );
    },

    getCollectionItem: (token, articleId, lang) => {
      if (!cache.enabled) return getCollectionItem(token, articleId, lang);
      return cache.getOrSet(
        `colitem:${token}:${articleId}`,
        cache.ttls.collection,
        () => getCollectionItem(token, articleId, lang)
      );
    },

    toggleFavorite: async (token, articleId, favorite, lang) => {
      const result = await toggleFavorite(token, articleId, favorite, lang);
      if (cache.enabled) {
        await Promise.all([
          cache.del(`me:${token}`, `colitem:${token}:${articleId}`),
          cache.invalidateUserScoped(token, "col"),
        ]);
      }
      return result;
    },

    getArticle: (articleId, token, lang) => {
      if (!cache.enabled) return getArticle(articleId, token, lang);
      const normalizedLang = lang === "es" ? "es" : "en";
      return cache.getOrSet(
        `art:${normalizedLang}:${articleId}`,
        cache.ttls.article,
        () => getArticle(articleId, token, lang)
      );
    },

    searchArticles: (query, lang) => {
      if (!cache.enabled) return searchArticles(query, lang);
      const normalizedLang = lang === "es" ? "es" : "en";
      const normalizedQuery = String(query ?? "").trim().toLowerCase().slice(0, 80);
      if (!normalizedQuery) return searchArticles(query, lang);
      return cache.getOrSet(
        `search:${normalizedLang}:${normalizedQuery}`,
        cache.ttls.search,
        () => searchArticles(query, lang)
      );
    },

    registerArticleClick: async (token, articleId, lang) => {
      const result = await registerArticleClick(token, articleId, lang);
      if (cache.enabled) {
        await Promise.all([
          cache.del(`me:${token}`),
          cache.invalidateUserScoped(token, "miss"),
        ]);
      }
      return result;
    },

    getMissions: (token, lang) => {
      if (!cache.enabled) return getMissions(token, lang);
      const today = new Date().toISOString().slice(0, 10);
      return cache.getOrSet(
        `miss:${token}:${today}`,
        cache.ttls.missions,
        () => getMissions(token, lang)
      );
    },

    claimMission: async (token, missionId, lang) => {
      const result = await claimMission(token, missionId, lang);
      if (cache.enabled) await cache.invalidateUser(token);
      return result;
    },

    claimRewardedAdPacks: async (token, lang) => {
      const result = await claimRewardedAdPacks(token, lang);
      if (cache.enabled) await cache.invalidateUser(token);
      return result;
    },

    getTrophies: (token, options) => {
      if (!cache.enabled) return getTrophies(token, options);
      const scope = options?.unlockedOnly ? "unlocked" : "all";
      return cache.getOrSet(
        `troph:${token}:${scope}`,
        cache.ttls.trophies,
        () => getTrophies(token, options)
      );
    },

    exportRecoveryCode: async (token, lang) => {
      const result = await exportRecoveryCode(token, lang);
      if (cache.enabled) await cache.del(`me:${token}`);
      return result;
    },

    importRecoveryCode: async (token, recoveryCode, lang) => {
      const result = await importRecoveryCode(token, recoveryCode, lang);
      if (cache.enabled) {
        await cache.invalidateUser(token);
        if (result?.browserToken && result.browserToken !== token) {
          await cache.invalidateUser(result.browserToken);
        }
      }
      return result;
    },

    async checkHealth() {
      const dbHealthy = await db.get("SELECT 1 AS ok").then(() => true).catch(() => false);
      const redisHealthy = cache.enabled ? await cache.ping() : null;
      return {
        ok: dbHealthy,
        db: dbHealthy ? "ok" : "down",
        redis: cache.enabled ? (redisHealthy ? "ok" : "degraded") : "disabled",
      };
    },

    async getCatalog(limit = 500) {
      const articleCatalog = await ensureCatalogReady();
      return articleCatalog.listCatalog(limit);
    },

    async close() {
      if (typeof store.flush === "function") {
        await store.flush();
      }
      await Promise.all(
        Array.from(articleCatalogs.values()).map((catalog) => catalog.close())
      );
      try { await cache.close(); } catch { /* ignore */ }
      clearInterval(localRateSweep);
      await db.close();
    },
  };
}

export const wikipediaGachaService = createWikipediaGachaService({
  storageDriver: process.env.WIKIPEDIA_GACHA_STORAGE_DRIVER ?? null,
  postgresUrl:
    process.env.WIKIPEDIA_GACHA_POSTGRES_URL ??
    process.env.DATABASE_URL ??
    null,
  dbPath: process.env.WIKIPEDIA_GACHA_DB_PATH ?? DEFAULT_SQLITE_DB_PATH,
});

export {
  applyPackRegeneration,
  getSecondsUntilNextPack,
};
