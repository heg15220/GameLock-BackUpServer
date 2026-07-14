import { brotliCompressSync, brotliDecompressSync, constants as zlibConstants } from "node:zlib";
import { STORAGE_VERSION } from "./constants.mjs";

const DEFAULT_NEXT_IDS = {
  profile: 1,
  collection: 1,
  packOpening: 1,
  browserMission: 1,
  browserTrophy: 1,
  rewardEvent: 1,
  dailyStat: 1,
};

const PERSISTENCE_FORMAT = "compact-v1";
const RECOVERY_FORMAT = "compact-v1";
const COMPRESSED_PAYLOAD_HEADER = Buffer.from("WGCB1");
const MIN_COMPRESSION_BYTES = 1024;
const MIN_COMPRESSION_DELTA_BYTES = 64;
const CACHE_TTL_MS = 10 * 60 * 1000;
const FLUSH_DEBOUNCE_MS = 40;
const WORKER_COUNT = Math.max(1, Number(process.env.WIKIPEDIA_GACHA_WORKERS || 1) || 1);
const MULTI_WORKER_MODE = WORKER_COUNT > 1;
const STATE_CACHE_ENABLED = !MULTI_WORKER_MODE;
const DEFERRED_PERSISTENCE_ENABLED =
  !MULTI_WORKER_MODE && process.env.WIKIPEDIA_GACHA_DEFERRED_PERSISTENCE !== "0";
const TOPIC_GROUP_ORDER = [
  "Science",
  "Mathematics",
  "History",
  "Geography",
  "Technology",
  "Art",
  "Culture",
  "Society",
];

function stripTransientKeys(value) {
  if (Array.isArray(value)) return value.map(stripTransientKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !key.startsWith("__"))
        .map(([key, nested]) => [key, stripTransientKeys(nested)])
    );
  }
  return value;
}

function normalizeTopicCounts(topicCounts = {}) {
  return Object.fromEntries(
    TOPIC_GROUP_ORDER.map((topic) => [topic, Number(topicCounts?.[topic]) || 0])
  );
}

function encodeTopicCounts(topicCounts = {}) {
  return TOPIC_GROUP_ORDER.map((topic) => Number(topicCounts?.[topic]) || 0);
}

function decodeTopicCounts(topicCounts = []) {
  if (Array.isArray(topicCounts)) {
    return Object.fromEntries(
      TOPIC_GROUP_ORDER.map((topic, index) => [topic, Number(topicCounts[index]) || 0])
    );
  }
  return normalizeTopicCounts(topicCounts);
}

function compactPackCard(card = {}) {
  return [
    Number(card.articleId) || 0,
    card.title ?? null,
    card.rarity ?? null,
    Number(card.qualityScore) || 0,
    Number(card.atk) || 0,
    Number(card.def ?? card.defStat) || 0,
    card.imageUrl ?? null,
    card.extractText ?? "",
    card.longExtractText ?? card.extractText ?? "",
    card.flavorText ?? null,
    card.wasNew ? 1 : 0,
    Number(card.copiesAfterPull) || 0,
    Number(card.shardsEarned) || 0,
    card.sourceUrl ?? null,
    card.topicGroup ?? null,
  ];
}

function expandPackCard(card = []) {
  return {
    articleId: Number(card[0]) || 0,
    title: card[1] ?? null,
    rarity: card[2] ?? null,
    qualityScore: Number(card[3]) || 0,
    atk: Number(card[4]) || 0,
    def: Number(card[5]) || 0,
    imageUrl: card[6] ?? null,
    extractText: card[7] ?? "",
    longExtractText: card[8] ?? card[7] ?? "",
    flavorText: card[9] ?? null,
    wasNew: Boolean(card[10]),
    copiesAfterPull: Number(card[11]) || 0,
    shardsEarned: Number(card[12]) || 0,
    sourceUrl: card[13] ?? null,
    topicGroup: card[14] ?? null,
  };
}

function compactState(state = {}) {
  return {
    version: STORAGE_VERSION,
    format: PERSISTENCE_FORMAT,
    n: state.nextIds ?? { ...DEFAULT_NEXT_IDS },
    p: (state.browserProfiles ?? []).map((profile) => ([
      profile.id ?? null,
      profile.browserToken ?? null,
      profile.displayName ?? null,
      profile.preferredLanguage ?? null,
      Number(profile.packsAvailable) || 0,
      Number(profile.maxPacks) || 0,
      profile.lastPackRegenAt ?? null,
      Number(profile.gems) || 0,
      Number(profile.shards) || 0,
      Number(profile.trophiesPoints) || 0,
      Number(profile.totalPackOpens) || 0,
      Number(profile.pityCounter) || 0,
      profile.createdAt ?? null,
      profile.updatedAt ?? null,
      profile.lastSeenAt ?? null,
      profile.lastPackOpenedAt ?? null,
    ])),
    c: (state.browserCollection ?? []).map((entry) => ([
      entry.id ?? null,
      entry.browserProfileId ?? null,
      Number(entry.articleId) || 0,
      Number(entry.copies) || 0,
      entry.firstObtainedAt ?? null,
      entry.lastObtainedAt ?? null,
      entry.favorite ? 1 : 0,
      entry.bestRarityCode ?? null,
      entry.topicGroup ?? null,
    ])),
    o: (state.packOpenings ?? []).map((opening) => ([
      opening.id ?? null,
      opening.browserProfileId ?? null,
      opening.openedAt ?? null,
      opening.guaranteedSrPlus ? 1 : 0,
      opening.packType ?? null,
      opening.resultSummary ?? null,
      (opening.cards ?? []).map(compactPackCard),
    ])),
    m: (state.browserMissions ?? []).map((entry) => ([
      entry.id ?? null,
      entry.browserProfileId ?? null,
      entry.missionId ?? null,
      Number(entry.progressValue) || 0,
      entry.completed ? 1 : 0,
      entry.claimed ? 1 : 0,
      entry.resetDate ?? null,
      entry.createdAt ?? null,
      entry.updatedAt ?? null,
    ])),
    t: (state.browserTrophies ?? []).map((entry) => ([
      entry.id ?? null,
      entry.browserProfileId ?? null,
      entry.trophyId ?? null,
      entry.unlockedAt ?? null,
    ])),
    r: (state.rewardEvents ?? []).map((entry) => ([
      entry.id ?? null,
      entry.browserProfileId ?? null,
      entry.rewardSource ?? null,
      entry.rewardType ?? null,
      Number(entry.rewardAmount) || 0,
      entry.createdAt ?? null,
      entry.metadataJson ?? null,
    ])),
    d: (state.dailyBrowserStats ?? []).map((entry) => ([
      entry.id ?? null,
      entry.browserProfileId ?? null,
      entry.statDate ?? null,
      Number(entry.packsOpened) || 0,
      Number(entry.cardsObtained) || 0,
      Number(entry.newCardsObtained) || 0,
      Number(entry.duplicateCardsObtained) || 0,
      Number(entry.srOrHigherCount) || 0,
      Number(entry.ssrOrHigherCount) || 0,
      Number(entry.urOrHigherCount) || 0,
      Number(entry.wikipediaClicks) || 0,
      Number(entry.shardsEarned) || 0,
      encodeTopicCounts(entry.topicCardsObtained),
    ])),
  };
}

function expandState(state = {}) {
  if (state?.format !== PERSISTENCE_FORMAT) {
    return state;
  }
  return {
    version: state.version ?? STORAGE_VERSION,
    nextIds: { ...DEFAULT_NEXT_IDS, ...(state.n ?? {}) },
    browserProfiles: (state.p ?? []).map((profile) => ({
      id: profile[0] ?? null,
      browserToken: profile[1] ?? null,
      displayName: profile[2] ?? null,
      preferredLanguage: profile[3] ?? null,
      packsAvailable: Number(profile[4]) || 0,
      maxPacks: Number(profile[5]) || 0,
      lastPackRegenAt: profile[6] ?? null,
      gems: Number(profile[7]) || 0,
      shards: Number(profile[8]) || 0,
      trophiesPoints: Number(profile[9]) || 0,
      totalPackOpens: Number(profile[10]) || 0,
      pityCounter: Number(profile[11]) || 0,
      createdAt: profile[12] ?? null,
      updatedAt: profile[13] ?? null,
      lastSeenAt: profile[14] ?? null,
      lastPackOpenedAt: profile[15] ?? null,
    })),
    browserCollection: (state.c ?? []).map((entry) => ({
      id: entry[0] ?? null,
      browserProfileId: entry[1] ?? null,
      articleId: Number(entry[2]) || 0,
      copies: Number(entry[3]) || 0,
      firstObtainedAt: entry[4] ?? null,
      lastObtainedAt: entry[5] ?? null,
      favorite: Boolean(entry[6]),
      bestRarityCode: entry[7] ?? null,
      topicGroup: entry[8] ?? null,
    })),
    packOpenings: (state.o ?? []).map((opening) => ({
      id: opening[0] ?? null,
      browserProfileId: opening[1] ?? null,
      openedAt: opening[2] ?? null,
      guaranteedSrPlus: Boolean(opening[3]),
      packType: opening[4] ?? null,
      resultSummary: opening[5] ?? null,
      cards: (opening[6] ?? []).map(expandPackCard),
    })),
    browserMissions: (state.m ?? []).map((entry) => ({
      id: entry[0] ?? null,
      browserProfileId: entry[1] ?? null,
      missionId: entry[2] ?? null,
      progressValue: Number(entry[3]) || 0,
      completed: Boolean(entry[4]),
      claimed: Boolean(entry[5]),
      resetDate: entry[6] ?? null,
      createdAt: entry[7] ?? null,
      updatedAt: entry[8] ?? null,
    })),
    browserTrophies: (state.t ?? []).map((entry) => ({
      id: entry[0] ?? null,
      browserProfileId: entry[1] ?? null,
      trophyId: entry[2] ?? null,
      unlockedAt: entry[3] ?? null,
    })),
    rewardEvents: (state.r ?? []).map((entry) => ({
      id: entry[0] ?? null,
      browserProfileId: entry[1] ?? null,
      rewardSource: entry[2] ?? null,
      rewardType: entry[3] ?? null,
      rewardAmount: Number(entry[4]) || 0,
      createdAt: entry[5] ?? null,
      metadataJson: entry[6] ?? null,
    })),
    dailyBrowserStats: (state.d ?? []).map((entry) => ({
      id: entry[0] ?? null,
      browserProfileId: entry[1] ?? null,
      statDate: entry[2] ?? null,
      packsOpened: Number(entry[3]) || 0,
      cardsObtained: Number(entry[4]) || 0,
      newCardsObtained: Number(entry[5]) || 0,
      duplicateCardsObtained: Number(entry[6]) || 0,
      srOrHigherCount: Number(entry[7]) || 0,
      ssrOrHigherCount: Number(entry[8]) || 0,
      urOrHigherCount: Number(entry[9]) || 0,
      wikipediaClicks: Number(entry[10]) || 0,
      shardsEarned: Number(entry[11]) || 0,
      topicCardsObtained: decodeTopicCounts(entry[12]),
    })),
    recoveries: [],
  };
}

function compactRecoverySnapshot(snapshot = {}) {
  return {
    format: RECOVERY_FORMAT,
    p: [
      snapshot.profile?.displayName ?? null,
      snapshot.profile?.preferredLanguage ?? null,
      Number(snapshot.profile?.packsAvailable) || 0,
      Number(snapshot.profile?.maxPacks) || 0,
      snapshot.profile?.lastPackRegenAt ?? null,
      Number(snapshot.profile?.gems) || 0,
      Number(snapshot.profile?.shards) || 0,
      Number(snapshot.profile?.trophiesPoints) || 0,
      Number(snapshot.profile?.totalPackOpens) || 0,
      Number(snapshot.profile?.pityCounter) || 0,
    ],
    c: (snapshot.collection ?? []).map((entry) => ([
      Number(entry.articleId) || 0,
      Number(entry.copies) || 0,
      entry.favorite ? 1 : 0,
      entry.bestRarityCode ?? null,
      entry.topicGroup ?? null,
      entry.firstObtainedAt ?? null,
      entry.lastObtainedAt ?? null,
    ])),
    h: (snapshot.packHistory ?? []).map((entry) => ([
      entry.openedAt ?? null,
      entry.guaranteedSrPlus ? 1 : 0,
      entry.packType ?? null,
      entry.resultSummary ?? null,
      (entry.cards ?? []).map(compactPackCard),
    ])),
    t: (snapshot.trophies ?? []).map((entry) => ([
      entry.trophyId ?? null,
      entry.unlockedAt ?? null,
    ])),
    m: (snapshot.missions ?? []).map((entry) => ([
      entry.missionId ?? null,
      Number(entry.progressValue) || 0,
      entry.completed ? 1 : 0,
      entry.claimed ? 1 : 0,
      entry.resetDate ?? null,
      entry.createdAt ?? null,
      entry.updatedAt ?? null,
    ])),
  };
}

function expandRecoverySnapshot(snapshot = {}) {
  if (snapshot?.format !== RECOVERY_FORMAT) {
    return snapshot;
  }
  return {
    profile: {
      displayName: snapshot.p?.[0] ?? null,
      preferredLanguage: snapshot.p?.[1] ?? null,
      packsAvailable: Number(snapshot.p?.[2]) || 0,
      maxPacks: Number(snapshot.p?.[3]) || 0,
      lastPackRegenAt: snapshot.p?.[4] ?? null,
      gems: Number(snapshot.p?.[5]) || 0,
      shards: Number(snapshot.p?.[6]) || 0,
      trophiesPoints: Number(snapshot.p?.[7]) || 0,
      totalPackOpens: Number(snapshot.p?.[8]) || 0,
      pityCounter: Number(snapshot.p?.[9]) || 0,
    },
    collection: (snapshot.c ?? []).map((entry) => ({
      articleId: Number(entry[0]) || 0,
      copies: Number(entry[1]) || 0,
      favorite: Boolean(entry[2]),
      bestRarityCode: entry[3] ?? null,
      topicGroup: entry[4] ?? null,
      firstObtainedAt: entry[5] ?? null,
      lastObtainedAt: entry[6] ?? null,
    })),
    packHistory: (snapshot.h ?? []).map((entry) => ({
      openedAt: entry[0] ?? null,
      guaranteedSrPlus: Boolean(entry[1]),
      packType: entry[2] ?? null,
      resultSummary: entry[3] ?? null,
      cards: (entry[4] ?? []).map(expandPackCard),
    })),
    trophies: (snapshot.t ?? []).map((entry) => ({
      trophyId: entry[0] ?? null,
      unlockedAt: entry[1] ?? null,
    })),
    missions: (snapshot.m ?? []).map((entry) => ({
      missionId: entry[0] ?? null,
      progressValue: Number(entry[1]) || 0,
      completed: Boolean(entry[2]),
      claimed: Boolean(entry[3]),
      resetDate: entry[4] ?? null,
      createdAt: entry[5] ?? null,
      updatedAt: entry[6] ?? null,
    })),
  };
}

function serializePersistedValue(value) {
  const json = JSON.stringify(value);
  const utf8 = Buffer.from(json, "utf8");
  if (utf8.length < MIN_COMPRESSION_BYTES) {
    return json;
  }

  const compressed = brotliCompressSync(utf8, {
    params: {
      [zlibConstants.BROTLI_PARAM_QUALITY]: 4,
      [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
    },
  });

  if ((compressed.length + COMPRESSED_PAYLOAD_HEADER.length) >= (utf8.length - MIN_COMPRESSION_DELTA_BYTES)) {
    return json;
  }

  return Buffer.concat([COMPRESSED_PAYLOAD_HEADER, compressed]);
}

function deserializePersistedValue(rawValue) {
  if (Buffer.isBuffer(rawValue)) {
    const header = rawValue.subarray(0, COMPRESSED_PAYLOAD_HEADER.length);
    if (header.equals(COMPRESSED_PAYLOAD_HEADER)) {
      return JSON.parse(
        brotliDecompressSync(rawValue.subarray(COMPRESSED_PAYLOAD_HEADER.length)).toString("utf8")
      );
    }
    return JSON.parse(rawValue.toString("utf8"));
  }

  if (typeof rawValue === "string") {
    return JSON.parse(rawValue);
  }

  if (rawValue == null) {
    return {};
  }

  return JSON.parse(String(rawValue));
}

function nowMs() {
  return Date.now();
}

function buildEmptyState() {
  return {
    version: STORAGE_VERSION,
    nextIds: { ...DEFAULT_NEXT_IDS },
    browserProfiles: [],
    browserCollection: [],
    packOpenings: [],
    browserMissions: [],
    browserTrophies: [],
    rewardEvents: [],
    dailyBrowserStats: [],
    recoveries: [],
  };
}

function buildNextIds(state) {
  // Ids are namespaced per browser token: each profile owns a 1M-wide id range
  // starting at its own `id` (== createTokenScopedIdBase in service.mjs, and
  // == what openPackIncremental seeds from). Seed every per-table counter from
  // that base so a table that is currently EMPTY for this profile resumes
  // inside the token namespace instead of restarting at 1. Restarting at 1 is
  // what produced colliding primary keys across tokens on reload — and the
  // resulting divergent ids then tripped the UNIQUE(profile, ...) indexes.
  const profileBase = Math.max(0, ...state.browserProfiles.map((entry) => Number(entry.id) || 0));
  const nextFrom = (ids) => Math.max(profileBase, 0, ...ids) + 1;
  return {
    profile: profileBase + 1,
    collection: nextFrom(state.browserCollection.map((entry) => Number(entry.id) || 0)),
    packOpening: nextFrom(state.packOpenings.map((entry) => Number(entry.id) || 0)),
    browserMission: nextFrom(state.browserMissions.map((entry) => Number(entry.id) || 0)),
    browserTrophy: nextFrom(state.browserTrophies.map((entry) => Number(entry.id) || 0)),
    rewardEvent: nextFrom(state.rewardEvents.map((entry) => Number(entry.id) || 0)),
    dailyStat: nextFrom(state.dailyBrowserStats.map((entry) => Number(entry.id) || 0)),
  };
}

function cloneStateSnapshot(state) {
  return JSON.parse(JSON.stringify(stripTransientKeys({ ...state, recoveries: [] })));
}

function rowHasChanged(previousRow, nextRow) {
  return JSON.stringify(previousRow) !== JSON.stringify(nextRow);
}

/**
 * @param {{ db: ReturnType<import('./db.mjs').openStateDb> }} options
 */
export function createSqliteStore({ db }) {
  const queues = new Map();
  const stateCache = new Map();
  const dirtyStates = new Map();
  const recoveryCache = new Map();
  const persistedStatePresenceCache = new Map();
  let flushTimer = null;
  let flushPromise = Promise.resolve();
  let persistPromise = Promise.resolve();

  function touchState(browserToken, state) {
    if (!STATE_CACHE_ENABLED) {
      return state;
    }
    stateCache.set(browserToken, { state, lastAccessAt: nowMs() });
    return state;
  }

  function getCachedState(browserToken) {
    if (!STATE_CACHE_ENABLED) {
      return null;
    }
    const entry = stateCache.get(browserToken);
    if (!entry) return null;
    entry.lastAccessAt = nowMs();
    return entry.state;
  }

  function getCachedPersistedStatePresence(browserToken) {
    const entry = persistedStatePresenceCache.get(browserToken);
    if (!entry) return null;
    if (entry.expiresAt <= nowMs()) {
      persistedStatePresenceCache.delete(browserToken);
      return null;
    }
    return entry.value;
  }

  function cachePersistedStatePresence(browserToken, value) {
    if (!value && MULTI_WORKER_MODE) {
      return;
    }
    persistedStatePresenceCache.set(browserToken, {
      value: Boolean(value),
      expiresAt: nowMs() + CACHE_TTL_MS,
    });
  }

  function pruneCache() {
    const currentTime = nowMs();
    if (STATE_CACHE_ENABLED) {
      for (const [browserToken, entry] of stateCache.entries()) {
        if (dirtyStates.has(browserToken)) continue;
        if ((currentTime - entry.lastAccessAt) > CACHE_TTL_MS) {
          stateCache.delete(browserToken);
        }
      }
    }
    for (const [browserToken, entry] of persistedStatePresenceCache.entries()) {
      if (entry.expiresAt <= currentTime) {
        persistedStatePresenceCache.delete(browserToken);
      }
    }
  }

  function scheduleFlush() {
    if (!DEFERRED_PERSISTENCE_ENABLED) {
      return;
    }
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushPromise = flushPromise.then(async () => {
        if (!dirtyStates.size) return;
        const batch = Array.from(dirtyStates.entries());
        dirtyStates.clear();
        for (const [browserToken, payload] of batch) {
          await writeRaw(browserToken, payload.nextState, payload.previousState);
        }
      }).catch(() => {});
    }, FLUSH_DEBOUNCE_MS);
    if (typeof flushTimer.unref === "function") {
      flushTimer.unref();
    }
  }

  async function flush() {
    if (!DEFERRED_PERSISTENCE_ENABLED) {
      return;
    }
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flushPromise = flushPromise.then(async () => {
      if (!dirtyStates.size) return;
      const batch = Array.from(dirtyStates.entries());
      dirtyStates.clear();
      for (const [browserToken, payload] of batch) {
        await writeRaw(browserToken, payload.nextState, payload.previousState);
      }
    });
    await flushPromise;
  }

  function enqueuePersist(task) {
    const next = persistPromise.then(task);
    persistPromise = next.catch(() => {});
    return next;
  }

  async function resolvePersistedToken(browserToken) {
    const row = await db.get(
      "SELECT current_token AS currentToken FROM token_aliases WHERE legacy_token = ?",
      [browserToken]
    );
    return row?.currentToken ?? browserToken;
  }

  async function readLegacyRaw(browserToken) {
    const row = await db.get("SELECT data_json FROM user_state WHERE browser_token = ?", [browserToken]);
    if (!row) {
      cachePersistedStatePresence(browserToken, false);
      return touchState(browserToken, buildEmptyState());
    }
    cachePersistedStatePresence(browserToken, true);
    try {
      const state = {
        ...buildEmptyState(),
        ...expandState(deserializePersistedValue(row.data_json)),
      };
      state.nextIds = buildNextIds(state);
      return touchState(browserToken, state);
    } catch {
      return touchState(browserToken, buildEmptyState());
    }
  }

  async function readNormalizedRaw(browserToken) {
    const resolvedToken = await resolvePersistedToken(browserToken);
    const profile = await db.get(
      `SELECT
         id,
         browser_token AS browserToken,
         display_name AS displayName,
         preferred_language AS preferredLanguage,
         packs_available AS packsAvailable,
         max_packs AS maxPacks,
         last_pack_regen_at AS lastPackRegenAt,
         gems,
         shards,
         trophies_points AS trophiesPoints,
         total_pack_opens AS totalPackOpens,
         pity_counter AS pityCounter,
         created_at AS createdAt,
         updated_at AS updatedAt,
         last_seen_at AS lastSeenAt,
         last_pack_opened_at AS lastPackOpenedAt
       FROM browser_profiles
       WHERE browser_token = ?`,
      [resolvedToken]
    );

    if (!profile) {
      return null;
    }
    cachePersistedStatePresence(browserToken, true);
    cachePersistedStatePresence(resolvedToken, true);

    const [
      collectionRows,
      openingRows,
      openingCardRows,
      missionRows,
      trophyRows,
      rewardRows,
      dailyRows,
    ] = await Promise.all([
      db.all(
        `SELECT
           id,
           browser_profile_id AS browserProfileId,
           article_id AS articleId,
           copies,
           first_obtained_at AS firstObtainedAt,
           last_obtained_at AS lastObtainedAt,
           favorite,
           best_rarity_code AS bestRarityCode,
           topic_group AS topicGroup
         FROM browser_collection
         WHERE browser_profile_id = ?
         ORDER BY id ASC`,
        [profile.id]
      ),
      db.all(
        `SELECT
           id,
           browser_profile_id AS browserProfileId,
           opened_at AS openedAt,
           guaranteed_sr_plus AS guaranteedSrPlus,
           pack_type AS packType,
           result_summary AS resultSummary
         FROM pack_openings
         WHERE browser_profile_id = ?
         ORDER BY id ASC`,
        [profile.id]
      ),
      db.all(
        `SELECT
           card.pack_opening_id AS packOpeningId,
           card.article_id AS articleId,
           card.title,
           card.rarity,
           card.quality_score AS qualityScore,
           card.atk,
           card.def_stat AS defStat,
           card.image_url AS imageUrl,
           card.extract_text AS extractText,
           card.long_extract_text AS longExtractText,
           card.flavor_text AS flavorText,
           card.was_new AS wasNew,
           card.copies_after_pull AS copiesAfterPull,
           card.shards_earned AS shardsEarned,
           card.source_url AS sourceUrl,
           card.topic_group AS topicGroup
         FROM pack_opening_cards card
         JOIN pack_openings opening ON opening.id = card.pack_opening_id
         WHERE opening.browser_profile_id = ?
         ORDER BY card.pack_opening_id ASC, card.slot_number ASC`,
        [profile.id]
      ),
      db.all(
        `SELECT
           id,
           browser_profile_id AS browserProfileId,
           mission_id AS missionId,
           progress_value AS progressValue,
           completed,
           claimed,
           reset_date AS resetDate,
           created_at AS createdAt,
           updated_at AS updatedAt
         FROM browser_missions
         WHERE browser_profile_id = ?
         ORDER BY id ASC`,
        [profile.id]
      ),
      db.all(
        `SELECT
           id,
           browser_profile_id AS browserProfileId,
           trophy_id AS trophyId,
           unlocked_at AS unlockedAt
         FROM browser_trophies
         WHERE browser_profile_id = ?
         ORDER BY id ASC`,
        [profile.id]
      ),
      db.all(
        `SELECT
           id,
           browser_profile_id AS browserProfileId,
           reward_source AS rewardSource,
           reward_type AS rewardType,
           reward_amount AS rewardAmount,
           created_at AS createdAt,
           metadata_json AS metadataJson
         FROM reward_events
         WHERE browser_profile_id = ?
         ORDER BY id ASC`,
        [profile.id]
      ),
      db.all(
        `SELECT
           id,
           browser_profile_id AS browserProfileId,
           stat_date AS statDate,
           packs_opened AS packsOpened,
           cards_obtained AS cardsObtained,
           new_cards_obtained AS newCardsObtained,
           duplicate_cards_obtained AS duplicateCardsObtained,
           sr_or_higher_count AS srOrHigherCount,
           ssr_or_higher_count AS ssrOrHigherCount,
           ur_or_higher_count AS urOrHigherCount,
           wikipedia_clicks AS wikipediaClicks,
           shards_earned AS shardsEarned,
           topic_counts_json AS topicCountsJson
         FROM daily_browser_stats
         WHERE browser_profile_id = ?
         ORDER BY id ASC`,
        [profile.id]
      ),
    ]);

    const cardsByOpeningId = new Map();
    for (const row of openingCardRows) {
      const list = cardsByOpeningId.get(row.packOpeningId) ?? [];
      list.push({
        articleId: Number(row.articleId) || 0,
        title: row.title ?? null,
        rarity: row.rarity ?? null,
        qualityScore: Number(row.qualityScore) || 0,
        atk: Number(row.atk) || 0,
        def: Number(row.defStat) || 0,
        imageUrl: row.imageUrl ?? null,
        extractText: row.extractText ?? "",
        longExtractText: row.longExtractText ?? row.extractText ?? "",
        flavorText: row.flavorText ?? null,
        wasNew: Boolean(row.wasNew),
        copiesAfterPull: Number(row.copiesAfterPull) || 0,
        shardsEarned: Number(row.shardsEarned) || 0,
        sourceUrl: row.sourceUrl ?? null,
        topicGroup: row.topicGroup ?? null,
      });
      cardsByOpeningId.set(row.packOpeningId, list);
    }

    const state = {
      version: STORAGE_VERSION,
      nextIds: { ...DEFAULT_NEXT_IDS },
      browserProfiles: [{
        ...profile,
        packsAvailable: Number(profile.packsAvailable) || 0,
        maxPacks: Number(profile.maxPacks) || 0,
        gems: Number(profile.gems) || 0,
        shards: Number(profile.shards) || 0,
        trophiesPoints: Number(profile.trophiesPoints) || 0,
        totalPackOpens: Number(profile.totalPackOpens) || 0,
        pityCounter: Number(profile.pityCounter) || 0,
      }],
      browserCollection: collectionRows.map((row) => ({
        ...row,
        articleId: Number(row.articleId) || 0,
        copies: Number(row.copies) || 0,
        favorite: Boolean(row.favorite),
      })),
      packOpenings: openingRows.map((row) => ({
        ...row,
        guaranteedSrPlus: Boolean(row.guaranteedSrPlus),
        cards: cardsByOpeningId.get(row.id) ?? [],
      })),
      browserMissions: missionRows.map((row) => ({
        ...row,
        progressValue: Number(row.progressValue) || 0,
        completed: Boolean(row.completed),
        claimed: Boolean(row.claimed),
      })),
      browserTrophies: trophyRows.map((row) => ({ ...row })),
      rewardEvents: rewardRows.map((row) => ({
        ...row,
        rewardAmount: Number(row.rewardAmount) || 0,
        metadataJson: (() => {
          if (!row.metadataJson) return null;
          try {
            return JSON.parse(row.metadataJson);
          } catch {
            return row.metadataJson;
          }
        })(),
      })),
      dailyBrowserStats: dailyRows.map((row) => ({
        ...row,
        packsOpened: Number(row.packsOpened) || 0,
        cardsObtained: Number(row.cardsObtained) || 0,
        newCardsObtained: Number(row.newCardsObtained) || 0,
        duplicateCardsObtained: Number(row.duplicateCardsObtained) || 0,
        srOrHigherCount: Number(row.srOrHigherCount) || 0,
        ssrOrHigherCount: Number(row.ssrOrHigherCount) || 0,
        urOrHigherCount: Number(row.urOrHigherCount) || 0,
        wikipediaClicks: Number(row.wikipediaClicks) || 0,
        shardsEarned: Number(row.shardsEarned) || 0,
        topicCardsObtained: (() => {
          if (!row.topicCountsJson) return normalizeTopicCounts();
          try {
            return normalizeTopicCounts(JSON.parse(row.topicCountsJson));
          } catch {
            return normalizeTopicCounts();
          }
        })(),
      })),
      recoveries: [],
    };

    state.nextIds = buildNextIds(state);
    touchState(resolvedToken, state);
    return touchState(browserToken, state);
  }

  async function readRaw(browserToken) {
    const cachedState = getCachedState(browserToken);
    if (cachedState) {
      return cachedState;
    }
    return (await readNormalizedRaw(browserToken)) ?? readLegacyRaw(browserToken);
  }

  async function hasPersistedState(browserToken) {
    const cached = getCachedPersistedStatePresence(browserToken);
    if (cached != null) {
      return cached;
    }
    const row = await db.get(
      `SELECT 1 AS ok FROM browser_profiles WHERE browser_token = ?
       UNION ALL
       SELECT 1 AS ok FROM token_aliases WHERE legacy_token = ?
       UNION ALL
       SELECT 1 AS ok FROM user_state WHERE browser_token = ?
       LIMIT 1`,
      [browserToken, browserToken, browserToken]
    );
    const exists = Boolean(row?.ok);
    cachePersistedStatePresence(browserToken, exists);
    return exists;
  }

  function registerTransientToken(browserToken) {
    cachePersistedStatePresence(browserToken, false);
  }

  async function writeRaw(browserToken, state, previousState = null) {
    const clean = stripTransientKeys({ ...state, recoveries: [] });
    const previousClean = previousState
      ? stripTransientKeys({ ...previousState, recoveries: [] })
      : null;
    const profile = (clean.browserProfiles ?? []).find(
      (entry) => entry.browserToken === browserToken
    ) ?? ((clean.browserProfiles ?? []).length === 1 ? clean.browserProfiles[0] : null);
    if (!profile) {
      return;
    }
    const storageToken = profile.browserToken ?? browserToken;

    const profileId = Number(profile.id) || 0;
    const collectionRows = (clean.browserCollection ?? []).filter(
      (entry) => Number(entry.browserProfileId) === profileId
    );
    const openingRows = (clean.packOpenings ?? []).filter(
      (entry) => Number(entry.browserProfileId) === profileId
    );
    const missionRows = (clean.browserMissions ?? []).filter(
      (entry) => Number(entry.browserProfileId) === profileId
    );
    const trophyRows = (clean.browserTrophies ?? []).filter(
      (entry) => Number(entry.browserProfileId) === profileId
    );
    const rewardRows = (clean.rewardEvents ?? []).filter(
      (entry) => Number(entry.browserProfileId) === profileId
    );
    const dailyRows = (clean.dailyBrowserStats ?? []).filter(
      (entry) => Number(entry.browserProfileId) === profileId
    );
    const previousCollectionRows = (previousClean?.browserCollection ?? []).filter(
      (entry) => Number(entry.browserProfileId) === profileId
    );
    const previousOpeningRows = (previousClean?.packOpenings ?? []).filter(
      (entry) => Number(entry.browserProfileId) === profileId
    );
    const previousMissionRows = (previousClean?.browserMissions ?? []).filter(
      (entry) => Number(entry.browserProfileId) === profileId
    );
    const previousTrophyRows = (previousClean?.browserTrophies ?? []).filter(
      (entry) => Number(entry.browserProfileId) === profileId
    );
    const previousRewardRows = (previousClean?.rewardEvents ?? []).filter(
      (entry) => Number(entry.browserProfileId) === profileId
    );
    const previousDailyRows = (previousClean?.dailyBrowserStats ?? []).filter(
      (entry) => Number(entry.browserProfileId) === profileId
    );

    await db.exec("BEGIN IMMEDIATE TRANSACTION");
    try {
      await db.run(
        `INSERT INTO browser_profiles (
           id, browser_token, display_name, preferred_language, packs_available,
           max_packs, last_pack_regen_at, gems, shards, trophies_points,
           total_pack_opens, pity_counter, created_at, updated_at, last_seen_at,
           last_pack_opened_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           browser_token = excluded.browser_token,
           display_name = excluded.display_name,
           preferred_language = excluded.preferred_language,
           packs_available = excluded.packs_available,
           max_packs = excluded.max_packs,
           last_pack_regen_at = excluded.last_pack_regen_at,
           gems = excluded.gems,
           shards = excluded.shards,
           trophies_points = excluded.trophies_points,
           total_pack_opens = excluded.total_pack_opens,
           pity_counter = excluded.pity_counter,
           created_at = excluded.created_at,
           updated_at = excluded.updated_at,
           last_seen_at = excluded.last_seen_at,
           last_pack_opened_at = excluded.last_pack_opened_at`,
        [
          profileId,
          storageToken,
          profile.displayName ?? null,
          profile.preferredLanguage ?? null,
          Number(profile.packsAvailable) || 0,
          Number(profile.maxPacks) || 0,
          profile.lastPackRegenAt ?? null,
          Number(profile.gems) || 0,
          Number(profile.shards) || 0,
          Number(profile.trophiesPoints) || 0,
          Number(profile.totalPackOpens) || 0,
          Number(profile.pityCounter) || 0,
          profile.createdAt ?? null,
          profile.updatedAt ?? null,
          profile.lastSeenAt ?? null,
          profile.lastPackOpenedAt ?? null,
        ]
      );

      const previousCollectionById = new Map(
        previousCollectionRows.map((entry) => [Number(entry.id) || 0, entry])
      );
      const nextCollectionIds = new Set(
        collectionRows.map((entry) => Number(entry.id) || 0)
      );
      for (const entry of previousCollectionRows) {
        const entryId = Number(entry.id) || 0;
        if (!nextCollectionIds.has(entryId)) {
          await db.run("DELETE FROM browser_collection WHERE id = ?", [entryId]);
        }
      }
      for (const entry of collectionRows) {
        const entryId = Number(entry.id) || 0;
        if (
          previousCollectionById.has(entryId) &&
          !rowHasChanged(previousCollectionById.get(entryId), entry)
        ) {
          continue;
        }
        await db.run(
          `INSERT INTO browser_collection (
             id, browser_profile_id, article_id, copies, first_obtained_at,
             last_obtained_at, favorite, best_rarity_code, topic_group
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             browser_profile_id = excluded.browser_profile_id,
             article_id = excluded.article_id,
             copies = excluded.copies,
             first_obtained_at = excluded.first_obtained_at,
             last_obtained_at = excluded.last_obtained_at,
             favorite = excluded.favorite,
             best_rarity_code = excluded.best_rarity_code,
             topic_group = excluded.topic_group`,
          [
            entryId,
            profileId,
            Number(entry.articleId) || 0,
            Number(entry.copies) || 0,
            entry.firstObtainedAt ?? null,
            entry.lastObtainedAt ?? null,
            entry.favorite ? 1 : 0,
            entry.bestRarityCode ?? null,
            entry.topicGroup ?? null,
          ]
        );
      }

      const previousOpeningById = new Map(
        previousOpeningRows.map((entry) => [Number(entry.id) || 0, entry])
      );
      const nextOpeningIds = new Set(
        openingRows.map((entry) => Number(entry.id) || 0)
      );
      for (const opening of previousOpeningRows) {
        const openingId = Number(opening.id) || 0;
        if (!nextOpeningIds.has(openingId)) {
          await db.run("DELETE FROM pack_opening_cards WHERE pack_opening_id = ?", [openingId]);
          await db.run("DELETE FROM pack_openings WHERE id = ?", [openingId]);
        }
      }
      for (const opening of openingRows) {
        const openingId = Number(opening.id) || 0;
        const previousOpening = previousOpeningById.get(openingId);
        const openingChanged = !previousOpening || rowHasChanged(previousOpening, opening);
        await db.run(
          `INSERT INTO pack_openings (
             id, browser_profile_id, opened_at, guaranteed_sr_plus, pack_type, result_summary
           ) VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             browser_profile_id = excluded.browser_profile_id,
             opened_at = excluded.opened_at,
             guaranteed_sr_plus = excluded.guaranteed_sr_plus,
             pack_type = excluded.pack_type,
             result_summary = excluded.result_summary`,
          [
            openingId,
            profileId,
            opening.openedAt ?? null,
            opening.guaranteedSrPlus ? 1 : 0,
            opening.packType ?? null,
            opening.resultSummary ?? null,
          ]
        );
        if (previousOpening && !openingChanged) {
          continue;
        }
        await db.run("DELETE FROM pack_opening_cards WHERE pack_opening_id = ?", [openingId]);
        for (const [index, card] of (opening.cards ?? []).entries()) {
          await db.run(
            `INSERT INTO pack_opening_cards (
               pack_opening_id, slot_number, article_id, title, rarity, quality_score,
               atk, def_stat, image_url, extract_text, long_extract_text,
               flavor_text, was_new, copies_after_pull, shards_earned,
               source_url, topic_group
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              openingId,
              index + 1,
              Number(card.articleId) || 0,
              card.title ?? null,
              card.rarity ?? null,
              Number(card.qualityScore) || 0,
              Number(card.atk) || 0,
              Number(card.def ?? card.defStat) || 0,
              card.imageUrl ?? null,
              card.extractText ?? null,
              card.longExtractText ?? null,
              card.flavorText ?? null,
              card.wasNew ? 1 : 0,
              Number(card.copiesAfterPull) || 0,
              Number(card.shardsEarned) || 0,
              card.sourceUrl ?? null,
              card.topicGroup ?? null,
            ]
          );
        }
      }

      const previousMissionById = new Map(
        previousMissionRows.map((entry) => [Number(entry.id) || 0, entry])
      );
      const nextMissionIds = new Set(missionRows.map((entry) => Number(entry.id) || 0));
      for (const entry of previousMissionRows) {
        const entryId = Number(entry.id) || 0;
        if (!nextMissionIds.has(entryId)) {
          await db.run("DELETE FROM browser_missions WHERE id = ?", [entryId]);
        }
      }
      for (const entry of missionRows) {
        const entryId = Number(entry.id) || 0;
        if (
          previousMissionById.has(entryId) &&
          !rowHasChanged(previousMissionById.get(entryId), entry)
        ) {
          continue;
        }
        await db.run(
          `INSERT INTO browser_missions (
             id, browser_profile_id, mission_id, progress_value, completed,
             claimed, reset_date, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             browser_profile_id = excluded.browser_profile_id,
             mission_id = excluded.mission_id,
             progress_value = excluded.progress_value,
             completed = excluded.completed,
             claimed = excluded.claimed,
             reset_date = excluded.reset_date,
             created_at = excluded.created_at,
             updated_at = excluded.updated_at`,
          [
            entryId,
            profileId,
            Number(entry.missionId) || 0,
            Number(entry.progressValue) || 0,
            entry.completed ? 1 : 0,
            entry.claimed ? 1 : 0,
            entry.resetDate ?? null,
            entry.createdAt ?? null,
            entry.updatedAt ?? null,
          ]
        );
      }

      const previousTrophyById = new Map(
        previousTrophyRows.map((entry) => [Number(entry.id) || 0, entry])
      );
      const nextTrophyIds = new Set(trophyRows.map((entry) => Number(entry.id) || 0));
      for (const entry of previousTrophyRows) {
        const entryId = Number(entry.id) || 0;
        if (!nextTrophyIds.has(entryId)) {
          await db.run("DELETE FROM browser_trophies WHERE id = ?", [entryId]);
        }
      }
      for (const entry of trophyRows) {
        const entryId = Number(entry.id) || 0;
        if (
          previousTrophyById.has(entryId) &&
          !rowHasChanged(previousTrophyById.get(entryId), entry)
        ) {
          continue;
        }
        await db.run(
          `INSERT INTO browser_trophies (
             id, browser_profile_id, trophy_id, unlocked_at
           ) VALUES (?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             browser_profile_id = excluded.browser_profile_id,
             trophy_id = excluded.trophy_id,
             unlocked_at = excluded.unlocked_at`,
          [
            entryId,
            profileId,
            Number(entry.trophyId) || 0,
            entry.unlockedAt ?? null,
          ]
        );
      }

      const previousRewardById = new Map(
        previousRewardRows.map((entry) => [Number(entry.id) || 0, entry])
      );
      const nextRewardIds = new Set(rewardRows.map((entry) => Number(entry.id) || 0));
      for (const entry of previousRewardRows) {
        const entryId = Number(entry.id) || 0;
        if (!nextRewardIds.has(entryId)) {
          await db.run("DELETE FROM reward_events WHERE id = ?", [entryId]);
        }
      }
      for (const entry of rewardRows) {
        const entryId = Number(entry.id) || 0;
        if (
          previousRewardById.has(entryId) &&
          !rowHasChanged(previousRewardById.get(entryId), entry)
        ) {
          continue;
        }
        await db.run(
          `INSERT INTO reward_events (
             id, browser_profile_id, reward_source, reward_type, reward_amount,
             created_at, metadata_json
           ) VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             browser_profile_id = excluded.browser_profile_id,
             reward_source = excluded.reward_source,
             reward_type = excluded.reward_type,
             reward_amount = excluded.reward_amount,
             created_at = excluded.created_at,
             metadata_json = excluded.metadata_json`,
          [
            entryId,
            profileId,
            entry.rewardSource ?? null,
            entry.rewardType ?? null,
            Number(entry.rewardAmount) || 0,
            entry.createdAt ?? null,
            entry.metadataJson == null ? null : JSON.stringify(entry.metadataJson),
          ]
        );
      }

      const previousDailyById = new Map(
        previousDailyRows.map((entry) => [Number(entry.id) || 0, entry])
      );
      const nextDailyIds = new Set(dailyRows.map((entry) => Number(entry.id) || 0));
      for (const entry of previousDailyRows) {
        const entryId = Number(entry.id) || 0;
        if (!nextDailyIds.has(entryId)) {
          await db.run("DELETE FROM daily_browser_stats WHERE id = ?", [entryId]);
        }
      }
      for (const entry of dailyRows) {
        const entryId = Number(entry.id) || 0;
        if (
          previousDailyById.has(entryId) &&
          !rowHasChanged(previousDailyById.get(entryId), entry)
        ) {
          continue;
        }
        await db.run(
          `INSERT INTO daily_browser_stats (
             id, browser_profile_id, stat_date, packs_opened, cards_obtained,
             new_cards_obtained, duplicate_cards_obtained, sr_or_higher_count,
             ssr_or_higher_count, ur_or_higher_count, wikipedia_clicks,
             shards_earned, topic_counts_json
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             browser_profile_id = excluded.browser_profile_id,
             stat_date = excluded.stat_date,
             packs_opened = excluded.packs_opened,
             cards_obtained = excluded.cards_obtained,
             new_cards_obtained = excluded.new_cards_obtained,
             duplicate_cards_obtained = excluded.duplicate_cards_obtained,
             sr_or_higher_count = excluded.sr_or_higher_count,
             ssr_or_higher_count = excluded.ssr_or_higher_count,
             ur_or_higher_count = excluded.ur_or_higher_count,
             wikipedia_clicks = excluded.wikipedia_clicks,
             shards_earned = excluded.shards_earned,
             topic_counts_json = excluded.topic_counts_json`,
          [
            entryId,
            profileId,
            entry.statDate ?? null,
            Number(entry.packsOpened) || 0,
            Number(entry.cardsObtained) || 0,
            Number(entry.newCardsObtained) || 0,
            Number(entry.duplicateCardsObtained) || 0,
            Number(entry.srOrHigherCount) || 0,
            Number(entry.ssrOrHigherCount) || 0,
            Number(entry.urOrHigherCount) || 0,
            Number(entry.wikipediaClicks) || 0,
            Number(entry.shardsEarned) || 0,
            JSON.stringify(normalizeTopicCounts(entry.topicCardsObtained)),
          ]
        );
      }

      await db.run("DELETE FROM user_state WHERE browser_token = ?", [browserToken]);
      await db.run("DELETE FROM user_state WHERE browser_token = ?", [storageToken]);
      if (storageToken !== browserToken) {
        await db.run(
          `INSERT INTO token_aliases (legacy_token, current_token, created_at)
           VALUES (?, ?, ?)
           ON CONFLICT(legacy_token) DO UPDATE SET
             current_token = excluded.current_token,
             created_at = excluded.created_at`,
          [browserToken, storageToken, new Date().toISOString()]
        );
      }
      cachePersistedStatePresence(browserToken, true);
      cachePersistedStatePresence(storageToken, true);

      for (const recovery of state.recoveries ?? []) {
        recoveryCache.set(recovery.code, recovery.snapshot ?? {});
        await db.run(
          `INSERT OR IGNORE INTO recovery_codes
             (code, browser_token, snapshot_json, created_at)
           VALUES (?, ?, ?, ?)`,
          [
            recovery.code,
            storageToken,
            serializePersistedValue(compactRecoverySnapshot(recovery.snapshot ?? {})),
            recovery.createdAt ?? new Date().toISOString(),
          ]
        );
      }

      await db.exec("COMMIT");
    } catch (error) {
      try {
        await db.exec("ROLLBACK");
      } catch {
        // ignore rollback failure
      }
      throw error;
    }
  }

  function enqueue(browserToken, task) {
    const prev = queues.get(browserToken) ?? Promise.resolve();
    const next = prev.then(task);
    const tail = next.catch(() => {}).finally(() => {
      if (queues.get(browserToken) === tail) queues.delete(browserToken);
    });
    queues.set(browserToken, tail);
    return next;
  }

  function forToken(browserToken) {
    async function read() {
      return readRaw(browserToken);
    }

    function write(state, options = {}) {
      return enqueue(browserToken, async () => {
        touchState(browserToken, state);
        if (options.immediate || !DEFERRED_PERSISTENCE_ENABLED) {
          await enqueuePersist(() => writeRaw(browserToken, state, null));
        } else {
          const existing = dirtyStates.get(browserToken);
          dirtyStates.set(browserToken, {
            previousState: existing?.previousState ?? null,
            nextState: state,
          });
          scheduleFlush();
        }
        return state;
      });
    }

    function update(mutator) {
      return enqueue(browserToken, async () => {
        const current = await readRaw(browserToken);
        const previousSnapshot = cloneStateSnapshot(current);
        const result = await mutator(current);
        let next = current;
        let persist = true;
        let persistMode = "deferred";

        if (
          result &&
          typeof result === "object" &&
          Object.prototype.hasOwnProperty.call(result, "state") &&
          Object.prototype.hasOwnProperty.call(result, "persist")
        ) {
          next = result.state ?? current;
          persist = result.persist !== false;
          persistMode = result.persistMode === "immediate" ? "immediate" : "deferred";
        } else if (result !== undefined) {
          next = result;
        }

        if (persist) {
          touchState(browserToken, next);
          if (persistMode === "immediate" || !DEFERRED_PERSISTENCE_ENABLED) {
            await enqueuePersist(() => writeRaw(browserToken, next, previousSnapshot));
          } else {
            const existing = dirtyStates.get(browserToken);
            dirtyStates.set(browserToken, {
              previousState: existing?.previousState ?? previousSnapshot,
              nextState: next,
            });
            scheduleFlush();
          }
        }
        return next;
      });
    }

    return { read, write, update };
  }

  async function findRecovery(recoveryCode) {
    if (recoveryCache.has(recoveryCode)) {
      return expandRecoverySnapshot(recoveryCache.get(recoveryCode));
    }
    const row = await db.get("SELECT snapshot_json FROM recovery_codes WHERE code = ?", [recoveryCode]);
    if (!row) return null;
    try {
      return expandRecoverySnapshot(deserializePersistedValue(row.snapshot_json));
    } catch {
      return null;
    }
  }

  let pruneTimer = null;
  if (STATE_CACHE_ENABLED) {
    pruneTimer = setInterval(pruneCache, 60_000);
    if (typeof pruneTimer.unref === "function") {
      pruneTimer.unref();
    }
  }

  // SQLite parity: the postgres store exposes a lean readProfileOnly() that
  // skips the per-token queue. SQLite does not have that bottleneck (single
  // file), so we just delegate to the full readRaw and pluck the profile.
  async function readProfileOnly(browserToken) {
    const state = await readRaw(browserToken);
    return state?.browserProfiles?.find(
      (entry) => entry.browserToken === browserToken
    ) ?? null;
  }
  return {
    forToken,
    readProfileOnly,
    findRecovery,
    flush,
    hasPersistedState,
    registerTransientToken,
  };
}

export { createSqliteStore as createJsonStore };
export { buildEmptyState as createEmptyState };
export const __storageInternals = {
  stripTransientKeys,
  normalizeTopicCounts,
  buildNextIds,
  cloneStateSnapshot,
  rowHasChanged,
  nowMs,
  CACHE_TTL_MS,
  FLUSH_DEBOUNCE_MS,
  MULTI_WORKER_MODE,
  STATE_CACHE_ENABLED,
  DEFERRED_PERSISTENCE_ENABLED,
  compactRecoverySnapshot,
  expandRecoverySnapshot,
  serializePersistedValue,
  deserializePersistedValue,
};
export {
  compactState,
  expandState,
  compactRecoverySnapshot,
  expandRecoverySnapshot,
  serializePersistedValue,
  deserializePersistedValue,
};
