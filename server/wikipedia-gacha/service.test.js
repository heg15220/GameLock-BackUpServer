import os from "node:os";
import path from "node:path";
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
