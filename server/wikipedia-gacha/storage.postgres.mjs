import {
  __storageInternals,
  createEmptyState,
} from "./storage.mjs";

const {
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
} = __storageInternals;

function toPersistedBuffer(value) {
  const persisted = serializePersistedValue(value);
  return Buffer.isBuffer(persisted) ? persisted : Buffer.from(String(persisted), "utf8");
}

function deleteByIds(tx, tableName, ids) {
  if (!ids.length) {
    return Promise.resolve();
  }
  return tx.run(`DELETE FROM ${tableName} WHERE id = ANY(?::bigint[])`, [ids]);
}

function deleteByForeignIds(tx, tableName, columnName, ids) {
  if (!ids.length) {
    return Promise.resolve();
  }
  return tx.run(
    `DELETE FROM ${tableName} WHERE ${columnName} = ANY(?::bigint[])`,
    [ids]
  );
}

function buildBulkInsertSql(tableName, columns, rowCount, conflictClause = "") {
  const tupleSql = `(${columns.map(() => "?").join(", ")})`;
  return [
    `INSERT INTO ${tableName} (${columns.join(", ")})`,
    `VALUES ${Array.from({ length: rowCount }, () => tupleSql).join(", ")}`,
    conflictClause.trim(),
  ]
    .filter(Boolean)
    .join(" ");
}

function bulkInsertRows(tx, tableName, columns, rows, conflictClause = "") {
  if (!rows.length) {
    return Promise.resolve();
  }
  return tx.run(
    buildBulkInsertSql(tableName, columns, rows.length, conflictClause),
    rows.flat()
  );
}

// Reads `state.__articlesPending` (a Map<`${id}|${lang}`, snapshot> or array
// of {articleId, language, ...} entries) and clears it. Populated by
// service.mjs whenever a pack is opened so the storage layer can UPSERT the
// canonical article rows in a single batch.
function drainPendingArticles(state) {
  const pending = state?.__articlesPending;
  if (!pending) return [];
  const list = pending instanceof Map ? Array.from(pending.values()) : Array.from(pending);
  // Clear so a second write of the same state does not double-upsert.
  if (pending instanceof Map) {
    pending.clear();
  } else if (Array.isArray(pending)) {
    pending.length = 0;
  }
  return list.filter(
    (entry) => entry && Number(entry.articleId) > 0 && typeof entry.language === "string" && entry.language.length > 0
  );
}

function articleSnapshotToRow(snapshot) {
  return [
    Number(snapshot.articleId) || 0,
    String(snapshot.language || "en"),
    String(snapshot.title ?? ""),
    snapshot.rarityCode ?? snapshot.rarity ?? null,
    Number(snapshot.qualityScore) || 0,
    Number(snapshot.atk) || 0,
    Number(snapshot.defStat ?? snapshot.def) || 0,
    snapshot.imageUrl ?? null,
    snapshot.extractText ?? null,
    snapshot.longExtractText ?? null,
    snapshot.flavorText ?? null,
    snapshot.sourceUrl ?? null,
    snapshot.topicGroup ?? null,
  ];
}

export function createPostgresStore({ db }) {
  const queues = new Map();
  const stateCache = new Map();
  const dirtyStates = new Map();
  const recoveryCache = new Map();
  const persistedStatePresenceCache = new Map();
  let flushTimer = null;
  let flushPromise = Promise.resolve();

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
        await Promise.all(
          batch.map(([browserToken, payload]) =>
            writeRaw(browserToken, payload.nextState, payload.previousState)
          )
        );
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
      await Promise.all(
        batch.map(([browserToken, payload]) =>
          writeRaw(browserToken, payload.nextState, payload.previousState)
        )
      );
    });
    await flushPromise;
  }

  async function resolvePersistedToken(browserToken) {
    const row = await db.get(
      "SELECT current_token AS currentToken FROM token_aliases WHERE legacy_token = ?",
      [browserToken]
    );
    return row?.currentToken ?? browserToken;
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
      cachePersistedStatePresence(browserToken, false);
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
           card.pack_opening_id AS "packOpeningId",
           card.slot_number    AS "slotNumber",
           card.article_id     AS "articleId",
           card.language       AS "language",
           card.was_new        AS "wasNew",
           card.copies_after_pull AS "copiesAfterPull",
           card.shards_earned  AS "shardsEarned",
           a.title             AS "title",
           a.rarity_code       AS "rarity",
           a.quality_score     AS "qualityScore",
           a.atk               AS "atk",
           a.def_stat          AS "defStat",
           a.image_url         AS "imageUrl",
           a.extract_text      AS "extractText",
           a.long_extract_text AS "longExtractText",
           a.flavor_text       AS "flavorText",
           a.source_url        AS "sourceUrl",
           a.topic_group       AS "topicGroup"
         FROM pack_opening_cards card
         JOIN pack_openings opening ON opening.id = card.pack_opening_id
         LEFT JOIN articles a
           ON a.article_id = card.article_id AND a.language = card.language
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
        language: row.language ?? null,
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
      ...createEmptyState(),
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
    return (await readNormalizedRaw(browserToken)) ?? touchState(browserToken, createEmptyState());
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
       LIMIT 1`,
      [browserToken, browserToken]
    );
    const exists = Boolean(row?.ok);
    cachePersistedStatePresence(browserToken, exists);
    return exists;
  }

  function registerTransientToken(browserToken) {
    cachePersistedStatePresence(browserToken, false);
  }

  async function writeRaw(browserToken, state, previousState = null) {
    // Drain transient article snapshots BEFORE stripping transient keys.
    // These are populated by service.mjs at pack-open time and consumed here
    // to UPSERT canonical article data into the `articles` table, keeping
    // `pack_opening_cards` lean.
    const pendingArticles = drainPendingArticles(state);

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

    await db.transaction(async (tx) => {
      await tx.run(
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
      const nextCollectionIds = new Set(collectionRows.map((entry) => Number(entry.id) || 0));
      const deletedCollectionIds = previousCollectionRows
        .map((entry) => Number(entry.id) || 0)
        .filter((entryId) => !nextCollectionIds.has(entryId));
      await deleteByIds(tx, "browser_collection", deletedCollectionIds);

      const changedCollectionRows = [];
      for (const entry of collectionRows) {
        const entryId = Number(entry.id) || 0;
        if (
          previousCollectionById.has(entryId) &&
          !rowHasChanged(previousCollectionById.get(entryId), entry)
        ) {
          continue;
        }
        changedCollectionRows.push([
          entryId,
          profileId,
          Number(entry.articleId) || 0,
          Number(entry.copies) || 0,
          entry.firstObtainedAt ?? null,
          entry.lastObtainedAt ?? null,
          Boolean(entry.favorite),
          entry.bestRarityCode ?? null,
          entry.topicGroup ?? null,
        ]);
      }
      await bulkInsertRows(
        tx,
        "browser_collection",
        [
          "id",
          "browser_profile_id",
          "article_id",
          "copies",
          "first_obtained_at",
          "last_obtained_at",
          "favorite",
          "best_rarity_code",
          "topic_group",
        ],
        changedCollectionRows,
        `ON CONFLICT(id) DO UPDATE SET
          browser_profile_id = excluded.browser_profile_id,
          article_id = excluded.article_id,
          copies = excluded.copies,
          first_obtained_at = excluded.first_obtained_at,
          last_obtained_at = excluded.last_obtained_at,
          favorite = excluded.favorite,
          best_rarity_code = excluded.best_rarity_code,
          topic_group = excluded.topic_group`
      );

      const previousOpeningById = new Map(
        previousOpeningRows.map((entry) => [Number(entry.id) || 0, entry])
      );
      const nextOpeningIds = new Set(openingRows.map((entry) => Number(entry.id) || 0));
      const deletedOpeningIds = previousOpeningRows
        .map((entry) => Number(entry.id) || 0)
        .filter((openingId) => !nextOpeningIds.has(openingId));
      await deleteByIds(tx, "pack_openings", deletedOpeningIds);

      const changedOpeningRows = [];
      const changedOpeningIds = [];
      const changedOpeningCardRows = [];
      // Aggregate article snapshots from both transient pending list and any
      // card object that still carries denormalized fields (covers writes that
      // bypass the service-level pending aggregator).
      const articleSnapshotMap = new Map();
      const profileLanguage = profile.preferredLanguage || "en";
      for (const article of pendingArticles) {
        const lang = article.language || profileLanguage;
        articleSnapshotMap.set(`${article.articleId}|${lang}`, { ...article, language: lang });
      }

      for (const opening of openingRows) {
        const openingId = Number(opening.id) || 0;
        const previousOpening = previousOpeningById.get(openingId);
        const openingChanged = !previousOpening || rowHasChanged(previousOpening, opening);
        if (previousOpening && !openingChanged) {
          continue;
        }
        changedOpeningIds.push(openingId);
        changedOpeningRows.push([
          openingId,
          profileId,
          opening.openedAt ?? null,
          Boolean(opening.guaranteedSrPlus),
          opening.packType ?? null,
          opening.resultSummary ?? null,
        ]);
        for (const [index, card] of (opening.cards ?? []).entries()) {
          const articleId = Number(card.articleId) || 0;
          const language = String(card.language || profileLanguage || "en");
          const key = `${articleId}|${language}`;
          if (!articleSnapshotMap.has(key) && articleId > 0) {
            articleSnapshotMap.set(key, {
              articleId,
              language,
              title: card.title ?? "",
              rarityCode: card.rarityCode ?? card.rarity ?? null,
              qualityScore: card.qualityScore,
              atk: card.atk,
              defStat: card.defStat ?? card.def,
              imageUrl: card.imageUrl ?? null,
              extractText: card.extractText ?? null,
              longExtractText: card.longExtractText ?? null,
              flavorText: card.flavorText ?? null,
              sourceUrl: card.sourceUrl ?? null,
              topicGroup: card.topicGroup ?? null,
            });
          }
          changedOpeningCardRows.push([
            openingId,
            index + 1,
            articleId,
            language,
            Boolean(card.wasNew),
            Number(card.copiesAfterPull) || 0,
            Number(card.shardsEarned) || 0,
          ]);
        }
      }

      // UPSERT the canonical articles row first so the FK on pack_opening_cards
      // never violates. Use COALESCE so we preserve fields previously populated
      // by another user opening the same article — i.e. never overwrite good
      // data with NULL.
      const articleRows = Array.from(articleSnapshotMap.values()).map(articleSnapshotToRow);
      await bulkInsertRows(
        tx,
        "articles",
        [
          "article_id",
          "language",
          "title",
          "rarity_code",
          "quality_score",
          "atk",
          "def_stat",
          "image_url",
          "extract_text",
          "long_extract_text",
          "flavor_text",
          "source_url",
          "topic_group",
        ],
        articleRows,
        `ON CONFLICT(article_id, language) DO UPDATE SET
          title = COALESCE(NULLIF(excluded.title, ''), articles.title),
          rarity_code = COALESCE(excluded.rarity_code, articles.rarity_code),
          quality_score = GREATEST(excluded.quality_score, articles.quality_score),
          atk = GREATEST(excluded.atk, articles.atk),
          def_stat = GREATEST(excluded.def_stat, articles.def_stat),
          image_url = COALESCE(excluded.image_url, articles.image_url),
          extract_text = COALESCE(NULLIF(excluded.extract_text, ''), articles.extract_text),
          long_extract_text = COALESCE(NULLIF(excluded.long_extract_text, ''), articles.long_extract_text),
          flavor_text = COALESCE(excluded.flavor_text, articles.flavor_text),
          source_url = COALESCE(excluded.source_url, articles.source_url),
          topic_group = COALESCE(excluded.topic_group, articles.topic_group),
          last_seen_at = NOW()`
      );

      await bulkInsertRows(
        tx,
        "pack_openings",
        [
          "id",
          "browser_profile_id",
          "opened_at",
          "guaranteed_sr_plus",
          "pack_type",
          "result_summary",
        ],
        changedOpeningRows,
        `ON CONFLICT(id) DO UPDATE SET
          browser_profile_id = excluded.browser_profile_id,
          opened_at = excluded.opened_at,
          guaranteed_sr_plus = excluded.guaranteed_sr_plus,
          pack_type = excluded.pack_type,
          result_summary = excluded.result_summary`
      );
      await deleteByForeignIds(tx, "pack_opening_cards", "pack_opening_id", changedOpeningIds);
      await bulkInsertRows(
        tx,
        "pack_opening_cards",
        [
          "pack_opening_id",
          "slot_number",
          "article_id",
          "language",
          "was_new",
          "copies_after_pull",
          "shards_earned",
        ],
        changedOpeningCardRows
      );

      const previousMissionById = new Map(
        previousMissionRows.map((entry) => [Number(entry.id) || 0, entry])
      );
      const nextMissionIds = new Set(missionRows.map((entry) => Number(entry.id) || 0));
      const deletedMissionIds = previousMissionRows
        .map((entry) => Number(entry.id) || 0)
        .filter((entryId) => !nextMissionIds.has(entryId));
      await deleteByIds(tx, "browser_missions", deletedMissionIds);

      const changedMissionRows = [];
      for (const entry of missionRows) {
        const entryId = Number(entry.id) || 0;
        if (
          previousMissionById.has(entryId) &&
          !rowHasChanged(previousMissionById.get(entryId), entry)
        ) {
          continue;
        }
        changedMissionRows.push([
          entryId,
          profileId,
          Number(entry.missionId) || 0,
          Number(entry.progressValue) || 0,
          Boolean(entry.completed),
          Boolean(entry.claimed),
          entry.resetDate ?? null,
          entry.createdAt ?? null,
          entry.updatedAt ?? null,
        ]);
      }
      await bulkInsertRows(
        tx,
        "browser_missions",
        [
          "id",
          "browser_profile_id",
          "mission_id",
          "progress_value",
          "completed",
          "claimed",
          "reset_date",
          "created_at",
          "updated_at",
        ],
        changedMissionRows,
        `ON CONFLICT(id) DO UPDATE SET
          browser_profile_id = excluded.browser_profile_id,
          mission_id = excluded.mission_id,
          progress_value = excluded.progress_value,
          completed = excluded.completed,
          claimed = excluded.claimed,
          reset_date = excluded.reset_date,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at`
      );

      const previousTrophyById = new Map(
        previousTrophyRows.map((entry) => [Number(entry.id) || 0, entry])
      );
      const nextTrophyIds = new Set(trophyRows.map((entry) => Number(entry.id) || 0));
      const deletedTrophyIds = previousTrophyRows
        .map((entry) => Number(entry.id) || 0)
        .filter((entryId) => !nextTrophyIds.has(entryId));
      await deleteByIds(tx, "browser_trophies", deletedTrophyIds);

      const changedTrophyRows = [];
      for (const entry of trophyRows) {
        const entryId = Number(entry.id) || 0;
        if (
          previousTrophyById.has(entryId) &&
          !rowHasChanged(previousTrophyById.get(entryId), entry)
        ) {
          continue;
        }
        changedTrophyRows.push([
          entryId,
          profileId,
          Number(entry.trophyId) || 0,
          entry.unlockedAt ?? null,
        ]);
      }
      await bulkInsertRows(
        tx,
        "browser_trophies",
        ["id", "browser_profile_id", "trophy_id", "unlocked_at"],
        changedTrophyRows,
        `ON CONFLICT(id) DO UPDATE SET
          browser_profile_id = excluded.browser_profile_id,
          trophy_id = excluded.trophy_id,
          unlocked_at = excluded.unlocked_at`
      );

      const previousRewardById = new Map(
        previousRewardRows.map((entry) => [Number(entry.id) || 0, entry])
      );
      const nextRewardIds = new Set(rewardRows.map((entry) => Number(entry.id) || 0));
      const deletedRewardIds = previousRewardRows
        .map((entry) => Number(entry.id) || 0)
        .filter((entryId) => !nextRewardIds.has(entryId));
      await deleteByIds(tx, "reward_events", deletedRewardIds);

      const changedRewardRows = [];
      for (const entry of rewardRows) {
        const entryId = Number(entry.id) || 0;
        if (
          previousRewardById.has(entryId) &&
          !rowHasChanged(previousRewardById.get(entryId), entry)
        ) {
          continue;
        }
        changedRewardRows.push([
          entryId,
          profileId,
          entry.rewardSource ?? null,
          entry.rewardType ?? null,
          Number(entry.rewardAmount) || 0,
          entry.createdAt ?? null,
          entry.metadataJson == null ? null : JSON.stringify(entry.metadataJson),
        ]);
      }
      await bulkInsertRows(
        tx,
        "reward_events",
        [
          "id",
          "browser_profile_id",
          "reward_source",
          "reward_type",
          "reward_amount",
          "created_at",
          "metadata_json",
        ],
        changedRewardRows,
        `ON CONFLICT(id) DO UPDATE SET
          browser_profile_id = excluded.browser_profile_id,
          reward_source = excluded.reward_source,
          reward_type = excluded.reward_type,
          reward_amount = excluded.reward_amount,
          created_at = excluded.created_at,
          metadata_json = excluded.metadata_json`
      );

      const previousDailyById = new Map(
        previousDailyRows.map((entry) => [Number(entry.id) || 0, entry])
      );
      const nextDailyIds = new Set(dailyRows.map((entry) => Number(entry.id) || 0));
      const deletedDailyIds = previousDailyRows
        .map((entry) => Number(entry.id) || 0)
        .filter((entryId) => !nextDailyIds.has(entryId));
      await deleteByIds(tx, "daily_browser_stats", deletedDailyIds);

      const changedDailyRows = [];
      for (const entry of dailyRows) {
        const entryId = Number(entry.id) || 0;
        if (
          previousDailyById.has(entryId) &&
          !rowHasChanged(previousDailyById.get(entryId), entry)
        ) {
          continue;
        }
        changedDailyRows.push([
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
        ]);
      }
      await bulkInsertRows(
        tx,
        "daily_browser_stats",
        [
          "id",
          "browser_profile_id",
          "stat_date",
          "packs_opened",
          "cards_obtained",
          "new_cards_obtained",
          "duplicate_cards_obtained",
          "sr_or_higher_count",
          "ssr_or_higher_count",
          "ur_or_higher_count",
          "wikipedia_clicks",
          "shards_earned",
          "topic_counts_json",
        ],
        changedDailyRows,
        `ON CONFLICT(id) DO UPDATE SET
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
          topic_counts_json = excluded.topic_counts_json`
      );

      await tx.run("DELETE FROM user_state WHERE browser_token = ?", [browserToken]);
      await tx.run("DELETE FROM user_state WHERE browser_token = ?", [storageToken]);
      if (storageToken !== browserToken) {
        await tx.run(
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

      const recoveryRows = [];
      for (const recovery of state.recoveries ?? []) {
        recoveryCache.set(recovery.code, recovery.snapshot ?? {});
        recoveryRows.push([
          recovery.code,
          storageToken,
          toPersistedBuffer(compactRecoverySnapshot(recovery.snapshot ?? {})),
          recovery.createdAt ?? new Date().toISOString(),
        ]);
      }
      await bulkInsertRows(
        tx,
        "recovery_codes",
        ["code", "browser_token", "snapshot_payload", "created_at"],
        recoveryRows,
        "ON CONFLICT(code) DO NOTHING"
      );
    });
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

  // Lean profile read: a single SELECT on browser_profiles, used by read-only
  // endpoints that do not need the full state (collection, missions, pack
  // history, etc). Bypasses the per-token write queue so concurrent readers
  // do not serialize behind in-flight writes.
  async function readProfileOnly(browserToken) {
    const cachedState = getCachedState(browserToken);
    if (cachedState) {
      const cachedProfile = cachedState.browserProfiles?.find(
        (entry) => entry.browserToken === browserToken
      );
      if (cachedProfile) return cachedProfile;
    }
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
      cachePersistedStatePresence(browserToken, false);
      return null;
    }
    cachePersistedStatePresence(browserToken, true);
    cachePersistedStatePresence(resolvedToken, true);
    return profile;
  }

  function forToken(browserToken) {
    async function read() {
      return readRaw(browserToken);
    }

    function write(state, options = {}) {
      return enqueue(browserToken, async () => {
        touchState(browserToken, state);
        if (options.immediate || !DEFERRED_PERSISTENCE_ENABLED) {
          await writeRaw(browserToken, state, null);
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
            await writeRaw(browserToken, next, previousSnapshot);
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
    const row = await db.get(
      "SELECT snapshot_payload FROM recovery_codes WHERE code = ?",
      [recoveryCode]
    );
    if (!row) return null;
    try {
      return expandRecoverySnapshot(deserializePersistedValue(row.snapshot_payload));
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

  return {
    forToken,
    readProfileOnly,
    findRecovery,
    flush,
    hasPersistedState,
    registerTransientToken,
  };
}
