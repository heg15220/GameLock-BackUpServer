import os from "node:os";
import path from "node:path";
import { access, unlink, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  applyPackRegeneration,
  computeCollectionAggregates,
  createWikipediaGachaService,
  findCollectedArticleSnapshot,
  getSecondsUntilNextPack,
} from "./service.mjs";
import { buildCollectionAggregatesFromSqlRows } from "./storage.postgres.mjs";

// Minimal in-memory article catalog for deterministic tests — mirrors the
// interface of createWikipediaGachaCatalog but never touches the network.
// `forget()` drops an article to simulate a server restart / pool eviction.
function createMockCatalog(articles) {
  const byId = new Map(articles.map((a) => [a.id, a]));
  const buckets = {};
  for (const a of articles) (buckets[a.rarityCode] ??= []).push(a.id);
  const firstId = articles[0]?.id ?? null;
  return {
    ready: async () => {},
    close: async () => {},
    getMode: () => "mock",
    getBucketIdsForRarity: (rarity) => buckets[rarity] ?? [],
    pickArticleIdForRarity: (rarity) => buckets[rarity]?.[0] ?? firstId,
    getRarityForArticleId: (id) => byId.get(id)?.rarityCode ?? null,
    getTopicGroupForArticleId: (id) => byId.get(id)?.topicGroup ?? null,
    getArticleById: async (id) => byId.get(id) ?? null,
    searchArticles: async () => [],
    listCatalog: async () => [...byId.values()],
    forget: (id) => byId.delete(id),
  };
}

describe("wikipedia gacha service", () => {
  it("regenerates packs minute by minute up to the cap", () => {
    const baseTime = new Date("2026-03-18T10:00:00.000Z");
    const profile = {
      packsAvailable: 3,
      maxPacks: 10,
      lastPackRegenAt: new Date(baseTime.getTime() - 4 * 60 * 1000).toISOString(),
    };

    applyPackRegeneration(profile, baseTime);

    expect(profile.packsAvailable).toBe(7);
    expect(profile.lastPackRegenAt).toBe(
      new Date(baseTime.getTime()).toISOString()
    );
    expect(getSecondsUntilNextPack(profile, baseTime)).toBe(60);
  });

  it("boosts unowned cards inside the selected rarity bucket", async () => {
    let now = new Date("2026-03-18T11:00:00.000Z");
    const storeFile = path.join(
      os.tmpdir(),
      `wiki-gacha-test-${Date.now()}-${Math.round(Math.random() * 9999)}.json`
    );
    const sequence = [0.1, 0.6];
    let cursor = 0;
    const service = createWikipediaGachaService({
      storeFile,
      nowFn: () => now,
      randomFn: () => {
        const value = sequence[cursor % sequence.length];
        cursor += 1;
        return value;
      },
    });

    const session = await service.bootstrapSession();
    let currentToken = session.browserToken;
    const result = await service.openPack(currentToken);
    currentToken = result.browserToken ?? currentToken;

    expect(result.cards.every((card) => card.rarity === "C")).toBe(true);
    expect(result.newCardsCount).toBeGreaterThan(1);
  });

  it("supports loading extra cards from external ndjson catalog", async () => {
    let now = new Date("2026-03-18T11:30:00.000Z");
    const storeFile = path.join(
      os.tmpdir(),
      `wiki-gacha-test-${Date.now()}-${Math.round(Math.random() * 9999)}.json`
    );
    const catalogFile = path.join(
      os.tmpdir(),
      `wiki-gacha-catalog-${Date.now()}-${Math.round(Math.random() * 9999)}.ndjson`
    );
    const indexFile = `${catalogFile}.idx.json`;
    await writeFile(
      catalogFile,
      `${JSON.stringify({
        wikipediaPageId: 9999991,
        title: "External Test Entry",
        slug: "External_Test_Entry",
        extractText: "External catalog card for deterministic testing.",
        contentLength: 1800,
        sectionCount: 4,
        referenceCount: 8,
        pageviews30d: 5400,
        qualityScore: 8,
        topicGroup: "General",
        categories: ["Testing"],
        rarityCode: "C",
      })}\n`,
      "utf8"
    );

    let service = null;
    try {
      const sequence = [0.01, 0.999];
      let cursor = 0;
      service = createWikipediaGachaService({
        storeFile,
        externalCatalogFile: catalogFile,
        nowFn: () => now,
        randomFn: () => {
          const value = sequence[cursor % sequence.length];
          cursor += 1;
          return value;
        },
        enableRemoteArticleEnrichment: false,
      });

      const session = await service.bootstrapSession();
      let currentToken = session.browserToken;
      now = new Date(now.getTime() + 61 * 1000);
      const result = await service.openPack(currentToken);
      currentToken = result.browserToken ?? currentToken;
      expect(result.cards.some((card) => card.title === "External Test Entry")).toBe(
        true
      );

      await service.close();
      service = null;
      await access(indexFile);

      const logs = [];
      const originalLog = console.log;
      console.log = (...args) => {
        logs.push(args.map(String).join(" "));
        originalLog(...args);
      };

      try {
        const secondService = createWikipediaGachaService({
          storeFile,
          externalCatalogFile: catalogFile,
          externalCatalogIndexFile: indexFile,
          nowFn: () => now,
          randomFn: () => 0.01,
          enableRemoteArticleEnrichment: false,
        });
        service = secondService;
        const session2 = await secondService.bootstrapSession();
        let currentToken2 = session2.browserToken;
        now = new Date(now.getTime() + 61 * 1000);
        const result2 = await secondService.openPack(currentToken2);
        currentToken2 = result2.browserToken ?? currentToken2;
        expect(result2.cards.length).toBe(5);
      } finally {
        console.log = originalLog;
      }

      expect(logs.some((line) => line.includes("source=disk"))).toBe(true);
    } finally {
      if (service?.close) {
        await service.close();
      }
      await unlink(catalogFile).catch(() => {});
      await unlink(indexFile).catch(() => {});
    }
  });

  it("guarantees the next pack after ten misses without SR+", async () => {
    let now = new Date("2026-03-18T12:00:00.000Z");
    const storeFile = path.join(
      os.tmpdir(),
      `wiki-gacha-test-${Date.now()}-${Math.round(Math.random() * 9999)}.json`
    );
    const service = createWikipediaGachaService({
      storeFile,
      nowFn: () => now,
      randomFn: () => 0.01,
    });

    const session = await service.bootstrapSession();
    let currentToken = session.browserToken;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      now = new Date(now.getTime() + 61 * 1000);
      const result = await service.openPack(currentToken);
      currentToken = result.browserToken ?? currentToken;
      expect(result.guaranteedSrPlus).toBe(false);
      expect(
        result.cards.some((card) =>
          ["SR", "SSR", "UR", "LR"].includes(card.rarity)
        )
      ).toBe(false);
    }

    now = new Date(now.getTime() + 61 * 1000);
    const guaranteed = await service.openPack(currentToken);
    currentToken = guaranteed.browserToken ?? currentToken;
    expect(guaranteed.guaranteedSrPlus).toBe(true);
    expect(
      guaranteed.cards.some((card) => ["UR", "LR"].includes(card.rarity))
    ).toBe(true);

    const dashboard = await service.getSessionMe(currentToken);
    expect(dashboard.packStatus.pityCounter).toBe(0);
  });

  it("grants three packs after a rewarded ad when the user is empty", async () => {
    let now = new Date("2026-03-18T13:00:00.000Z");
    const storeFile = path.join(
      os.tmpdir(),
      `wiki-gacha-test-${Date.now()}-${Math.round(Math.random() * 9999)}.json`
    );
    const service = createWikipediaGachaService({
      storeFile,
      nowFn: () => now,
      randomFn: () => 0.01,
    });

    const session = await service.bootstrapSession();
    let currentToken = session.browserToken;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      now = new Date(now.getTime() + 901);
      const result = await service.openPack(currentToken);
      currentToken = result.browserToken ?? currentToken;
    }

    now = new Date(now.getTime() + 901);
    const specialPack = await service.openPack(currentToken);
    currentToken = specialPack.browserToken ?? currentToken;
    expect(specialPack.guaranteedSrPlus).toBe(true);

    const beforeReward = await service.getSessionMe(currentToken);
    expect(beforeReward.packStatus.packsAvailable).toBe(0);
    expect(beforeReward.packStatus.nextPackGuaranteedSrPlus).toBe(false);

    const reward = await service.claimRewardedAdPacks(currentToken);
    currentToken = reward.browserToken ?? currentToken;
    expect(reward.rewardedPacks).toBe(3);
    expect(reward.packStatus.packsAvailable).toBe(3);

    const afterReward = await service.getSessionMe(currentToken);
    expect(afterReward.packStatus.packsAvailable).toBe(3);
    expect(
      afterReward.recentRewardEvents.some(
        (entry) => entry.rewardSource === "rewarded_ad" && entry.rewardAmount === 3
      )
    ).toBe(true);
  });

  it("does not allow a rewarded ad while the special guaranteed pack is waiting", async () => {
    let now = new Date("2026-03-18T14:00:00.000Z");
    const storeFile = path.join(
      os.tmpdir(),
      `wiki-gacha-test-${Date.now()}-${Math.round(Math.random() * 9999)}.json`
    );
    const service = createWikipediaGachaService({
      storeFile,
      nowFn: () => now,
      randomFn: () => 0.01,
    });

    const session = await service.bootstrapSession();
    let currentToken = session.browserToken;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      now = new Date(now.getTime() + 901);
      const result = await service.openPack(currentToken);
      currentToken = result.browserToken ?? currentToken;
    }

    await expect(
      service.claimRewardedAdPacks(currentToken)
    ).rejects.toMatchObject({
      code: "rewarded_ad_not_available",
    });
  });

  it("opens the special guaranteed pack even when normal packs are empty", async () => {
    let now = new Date("2026-03-18T15:00:00.000Z");
    const storeFile = path.join(
      os.tmpdir(),
      `wiki-gacha-test-${Date.now()}-${Math.round(Math.random() * 9999)}.json`
    );
    const service = createWikipediaGachaService({
      storeFile,
      nowFn: () => now,
      randomFn: () => 0.01,
    });

    const session = await service.bootstrapSession();
    let currentToken = session.browserToken;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      now = new Date(now.getTime() + 901);
      const result = await service.openPack(currentToken);
      currentToken = result.browserToken ?? currentToken;
    }

    const beforeSpecial = await service.getSessionMe(currentToken);
    expect(beforeSpecial.packStatus.packsAvailable).toBe(0);
    expect(beforeSpecial.packStatus.nextPackGuaranteedSrPlus).toBe(true);

    now = new Date(now.getTime() + 901);
    const specialPack = await service.openPack(currentToken);
    currentToken = specialPack.browserToken ?? currentToken;
    expect(specialPack.guaranteedSrPlus).toBe(true);
    expect(specialPack.packsRemaining).toBe(0);

    const afterSpecial = await service.getSessionMe(currentToken);
    expect(afterSpecial.packStatus.packsAvailable).toBe(0);
    expect(afterSpecial.packStatus.nextPackGuaranteedSrPlus).toBe(false);
  });

  it("serves collected-card detail from persisted pack history when the pool no longer has the article", async () => {
    const now = new Date("2026-05-01T10:00:00.000Z");
    const dbPath = path.join(
      os.tmpdir(),
      `wiki-gacha-restart-${Date.now()}-${Math.round(Math.random() * 9999)}.db`
    );

    const testArticle = {
      id: 770001,
      wikipediaTitle: "Restart Test Article",
      slug: "Restart_Test_Article",
      rarityCode: "C",
      qualityScore: 12,
      atk: 340,
      defStat: 210,
      imageUrl: "https://example.org/restart.png",
      extractText: "Short extract for the restart test.",
      longExtractText: "Longer extract body for the restart test article.",
      flavorText: null,
      sourceUrl: "https://en.wikipedia.org/wiki/Restart_Test_Article",
      topicGroup: "Science",
      categories: ["Testing"],
      languageCode: "en",
    };
    // Instance 1 — the live pool has the article; open a pack and persist it.
    const service = createWikipediaGachaService({
      dbPath,
      nowFn: () => now,
      randomFn: () => 0,
      createArticleCatalog: () => createMockCatalog([testArticle]),
    });
    let token;
    try {
      const session = await service.bootstrapSession();
      token = session.browserToken;
      const opened = await service.openPack(token);
      token = opened.browserToken ?? token;
      expect(opened.cards.some((card) => card.articleId === testArticle.id)).toBe(true);

      const before = await service.getArticle(testArticle.id, token, "en");
      expect(before.title).toBe("Restart Test Article");
    } finally {
      await service.close();
    }

    // Instance 2 — simulate a server restart: a fresh in-memory pool that does
    // NOT contain the previously collected article. Detail must still resolve
    // from persisted state instead of throwing 404 "Article not found."
    const restarted = createWikipediaGachaService({
      dbPath,
      nowFn: () => now,
      randomFn: () => 0,
      createArticleCatalog: () => createMockCatalog([]),
    });
    try {
      const after = await restarted.getArticle(testArticle.id, token, "en");
      expect(after.articleId ?? after.id).toBe(testArticle.id);
      expect(after.title).toBe("Restart Test Article");
      expect(after.extractText).toContain("restart test");
      expect(after.imageUrl).toBe("https://example.org/restart.png");
      expect(after.copies).toBeGreaterThanOrEqual(1);
      expect(after.inCollection).toBe(true);
    } finally {
      await restarted.close();
    }
  });

  it("computeCollectionAggregates matches a hand-computed collection", () => {
    const state = {
      browserCollection: [
        { browserProfileId: 1, articleId: 1, copies: 3, favorite: true, bestRarityCode: "C", topicGroup: "Science" },
        { browserProfileId: 1, articleId: 2, copies: 1, favorite: false, bestRarityCode: "SR", topicGroup: "History" },
        { browserProfileId: 1, articleId: 3, copies: 2, favorite: true, bestRarityCode: "SSR", topicGroup: "Science" },
        // Different profile — must be ignored.
        { browserProfileId: 2, articleId: 9, copies: 5, favorite: true, bestRarityCode: "UR", topicGroup: "Art" },
      ],
    };
    const agg = computeCollectionAggregates(state, 1, () => null, () => null);
    expect(agg.uniqueCards).toBe(3);
    expect(agg.totalCopies).toBe(6);
    expect(agg.duplicateCopies).toBe(3);
    expect(agg.favorites).toBe(2);
    expect(agg.rarityBreakdown.C).toBe(1);
    expect(agg.rarityBreakdown.SR).toBe(1);
    expect(agg.rarityBreakdown.SSR).toBe(1);
    expect(agg.rarityBreakdown.UR).toBe(0);
    expect(agg.topicBreakdown.Science).toBe(2);
    expect(agg.topicBreakdown.History).toBe(1);
    expect(agg.highestRarity).toBe("SSR");
    expect(agg.srPlusCount).toBe(2);
    expect(agg.ssrPlusCount).toBe(1);
  });

  it("Postgres SQL aggregation matches the monolithic computeCollectionAggregates", () => {
    // Guarantees the optimized (Postgres GROUP BY) path and the monolithic path
    // produce identical numbers for the dashboard summary / trophies / missions.
    const state = {
      browserCollection: [
        { browserProfileId: 1, articleId: 1, copies: 3, favorite: true, bestRarityCode: "C", topicGroup: "Science" },
        { browserProfileId: 1, articleId: 2, copies: 1, favorite: false, bestRarityCode: "SR", topicGroup: "History" },
        { browserProfileId: 1, articleId: 3, copies: 2, favorite: true, bestRarityCode: "SSR", topicGroup: "Science" },
      ],
    };
    const monolithic = computeCollectionAggregates(state, 1, () => null, () => null);
    // The exact shape the SQL GROUP BY queries return.
    const summaryRows = [
      { rarity: "C", count: 1, copies: 3, favorites: 1 },
      { rarity: "SR", count: 1, copies: 1, favorites: 0 },
      { rarity: "SSR", count: 1, copies: 2, favorites: 1 },
    ];
    const topicRows = [
      { topic: "Science", count: 2 },
      { topic: "History", count: 1 },
    ];
    const sqlDerived = buildCollectionAggregatesFromSqlRows(summaryRows, topicRows);
    expect(sqlDerived).toEqual(monolithic);
  });

  it("computeCollectionAggregates falls back to the article catalog for missing rarity/topic", () => {
    const state = {
      browserCollection: [
        { browserProfileId: 1, articleId: 1, copies: 1, favorite: false, bestRarityCode: null, topicGroup: null },
      ],
    };
    const agg = computeCollectionAggregates(
      state,
      1,
      (id) => (id === 1 ? "SR" : null),
      (id) => (id === 1 ? "Science" : null)
    );
    expect(agg.rarityBreakdown.SR).toBe(1);
    expect(agg.srPlusCount).toBe(1);
    expect(agg.highestRarity).toBe("SR");
    expect(agg.topicBreakdown.Science).toBe(1);
  });

  it("findCollectedArticleSnapshot reconstructs an article from pack history", () => {
    const state = {
      packOpenings: [
        {
          browserProfileId: 1,
          openedAt: "2026-05-01T10:00:00.000Z",
          cards: [
            {
              articleId: 555,
              title: "History Card",
              rarity: "SR",
              qualityScore: 61,
              atk: 900,
              def: 640,
              imageUrl: "https://example.org/h.png",
              extractText: "Body text.",
              longExtractText: "Longer body text.",
              sourceUrl: "https://en.wikipedia.org/wiki/History_Card",
              topicGroup: "History",
            },
          ],
        },
      ],
    };

    const snapshot = findCollectedArticleSnapshot(state, 1, 555);
    expect(snapshot).not.toBeNull();
    expect(snapshot.title).toBe("History Card");
    expect(snapshot.rarity).toBe("SR");
    expect(snapshot.def).toBe(640);
    expect(findCollectedArticleSnapshot(state, 1, 999)).toBeNull();
    expect(findCollectedArticleSnapshot(state, 2, 555)).toBeNull();
  });
});
