import os from "node:os";
import path from "node:path";
import { access, unlink, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  applyPackRegeneration,
  createWikipediaGachaService,
  getSecondsUntilNextPack,
} from "./service.mjs";

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
    const result = await service.openPack(session.browserToken);

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
      now = new Date(now.getTime() + 61 * 1000);
      const result = await service.openPack(session.browserToken);
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
        now = new Date(now.getTime() + 61 * 1000);
        const result2 = await secondService.openPack(session2.browserToken);
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
    for (let attempt = 0; attempt < 10; attempt += 1) {
      now = new Date(now.getTime() + 61 * 1000);
      const result = await service.openPack(session.browserToken);
      expect(result.guaranteedSrPlus).toBe(false);
      expect(
        result.cards.some((card) =>
          ["SR", "SSR", "UR", "LR"].includes(card.rarity)
        )
      ).toBe(false);
    }

    now = new Date(now.getTime() + 61 * 1000);
    const guaranteed = await service.openPack(session.browserToken);
    expect(guaranteed.guaranteedSrPlus).toBe(true);
    expect(
      guaranteed.cards.some((card) =>
        ["SR", "SSR", "UR", "LR"].includes(card.rarity)
      )
    ).toBe(true);

    const dashboard = await service.getSessionMe(session.browserToken);
    expect(dashboard.packStatus.pityCounter).toBe(0);
  });
});
