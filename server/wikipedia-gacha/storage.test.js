import { describe, expect, it } from "vitest";
import {
  compactRecoverySnapshot,
  compactState,
  createEmptyState,
  deserializePersistedValue,
  expandRecoverySnapshot,
  expandState,
  serializePersistedValue,
} from "./storage.mjs";

function buildSampleState() {
  const state = createEmptyState();
  state.nextIds = {
    profile: 2,
    collection: 3,
    packOpening: 2,
    browserMission: 2,
    browserTrophy: 2,
    rewardEvent: 2,
    dailyStat: 2,
  };
  state.browserProfiles.push({
    id: 1,
    browserToken: "token-1",
    displayName: "Archivist",
    preferredLanguage: "en",
    packsAvailable: 0,
    maxPacks: 10,
    lastPackRegenAt: "2026-04-19T10:00:00.000Z",
    gems: 20,
    shards: 45,
    trophiesPoints: 5,
    totalPackOpens: 11,
    pityCounter: 0,
    createdAt: "2026-04-19T09:00:00.000Z",
    updatedAt: "2026-04-19T10:01:00.000Z",
    lastSeenAt: "2026-04-19T10:01:00.000Z",
    lastPackOpenedAt: "2026-04-19T10:01:00.000Z",
  });
  state.browserCollection.push({
    id: 1,
    browserProfileId: 1,
    articleId: 101,
    copies: 2,
    firstObtainedAt: "2026-04-19T09:30:00.000Z",
    lastObtainedAt: "2026-04-19T10:01:00.000Z",
    favorite: true,
    bestRarityCode: "SR",
    topicGroup: "Science",
  });
  state.browserCollection.push({
    id: 2,
    browserProfileId: 1,
    articleId: 202,
    copies: 1,
    firstObtainedAt: "2026-04-19T10:01:00.000Z",
    lastObtainedAt: "2026-04-19T10:01:00.000Z",
    favorite: false,
    bestRarityCode: "SSR",
    topicGroup: "History",
  });
  state.packOpenings.push({
    id: 1,
    browserProfileId: 1,
    openedAt: "2026-04-19T10:01:00.000Z",
    guaranteedSrPlus: true,
    packType: "standard",
    resultSummary: "1 SSR, 1 SR, 3 C",
    cards: [
      {
        articleId: 101,
        title: "Marie Curie",
        rarity: "SR",
        qualityScore: 61,
        atk: 610,
        def: 280,
        imageUrl: "https://img.example/marie.png",
        extractText: "Physicist and chemist who pioneered research on radioactivity.",
        longExtractText:
          "Physicist and chemist who pioneered research on radioactivity. She became the first woman to win a Nobel Prize and remains one of the most iconic scientists in modern history.",
        flavorText: "Radiance through research.",
        wasNew: false,
        copiesAfterPull: 2,
        shardsEarned: 20,
        sourceUrl: "https://en.wikipedia.org/wiki/Marie_Curie",
        topicGroup: "Science",
      },
      {
        articleId: 202,
        title: "Moon landing",
        rarity: "SSR",
        qualityScore: 82,
        atk: 810,
        def: 330,
        imageUrl: "https://img.example/moon.png",
        extractText: "Landing humans on the Moon was a defining moment.",
        longExtractText:
          "Landing humans on the Moon was a defining moment in twentieth-century history and space exploration.",
        flavorText: "A giant leap archived.",
        wasNew: true,
        copiesAfterPull: 1,
        shardsEarned: 0,
        sourceUrl: "https://en.wikipedia.org/wiki/Moon_landing",
        topicGroup: "History",
      },
    ],
  });
  state.browserMissions.push({
    id: 1,
    browserProfileId: 1,
    missionId: 7,
    progressValue: 3,
    completed: true,
    claimed: false,
    resetDate: "2026-04-19",
    createdAt: "2026-04-19T09:00:00.000Z",
    updatedAt: "2026-04-19T10:01:00.000Z",
  });
  state.browserTrophies.push({
    id: 1,
    browserProfileId: 1,
    trophyId: 4,
    unlockedAt: "2026-04-19T10:01:00.000Z",
  });
  state.rewardEvents.push({
    id: 1,
    browserProfileId: 1,
    rewardSource: "duplicate_cards",
    rewardType: "shards",
    rewardAmount: 20,
    createdAt: "2026-04-19T10:01:00.000Z",
    metadataJson: { reason: "duplicate" },
  });
  state.dailyBrowserStats.push({
    id: 1,
    browserProfileId: 1,
    statDate: "2026-04-19",
    packsOpened: 11,
    cardsObtained: 55,
    newCardsObtained: 18,
    duplicateCardsObtained: 37,
    srOrHigherCount: 6,
    ssrOrHigherCount: 2,
    urOrHigherCount: 0,
    wikipediaClicks: 4,
    shardsEarned: 120,
    topicCardsObtained: {
      Science: 5,
      Mathematics: 0,
      History: 4,
      Geography: 0,
      Technology: 1,
      Art: 0,
      Culture: 0,
      Society: 0,
    },
  });
  return state;
}

function buildRecoverySnapshot() {
  return {
    profile: {
      displayName: "Archivist",
      preferredLanguage: "en",
      packsAvailable: 0,
      maxPacks: 10,
      lastPackRegenAt: "2026-04-19T10:00:00.000Z",
      gems: 20,
      shards: 45,
      trophiesPoints: 5,
      totalPackOpens: 11,
      pityCounter: 0,
    },
    collection: [
      {
        articleId: 101,
        copies: 2,
        favorite: true,
        bestRarityCode: "SR",
        topicGroup: "Science",
        firstObtainedAt: "2026-04-19T09:30:00.000Z",
        lastObtainedAt: "2026-04-19T10:01:00.000Z",
      },
    ],
    packHistory: [
      {
        openedAt: "2026-04-19T10:01:00.000Z",
        guaranteedSrPlus: true,
        packType: "standard",
        resultSummary: "1 SSR, 1 SR, 3 C",
        cards: [
          {
            articleId: 101,
            title: "Marie Curie",
            rarity: "SR",
            qualityScore: 61,
            atk: 610,
            def: 280,
            imageUrl: "https://img.example/marie.png",
            extractText: "Physicist and chemist who pioneered research on radioactivity.",
            longExtractText:
              "Physicist and chemist who pioneered research on radioactivity. She became the first woman to win a Nobel Prize.",
            flavorText: "Radiance through research.",
            wasNew: false,
            copiesAfterPull: 2,
            shardsEarned: 20,
            sourceUrl: "https://en.wikipedia.org/wiki/Marie_Curie",
            topicGroup: "Science",
          },
        ],
      },
    ],
    trophies: [{ trophyId: 4, unlockedAt: "2026-04-19T10:01:00.000Z" }],
    missions: [
      {
        missionId: 7,
        progressValue: 3,
        completed: true,
        claimed: false,
        resetDate: "2026-04-19",
        createdAt: "2026-04-19T09:00:00.000Z",
        updatedAt: "2026-04-19T10:01:00.000Z",
      },
    ],
  };
}

describe("wikipedia gacha storage compaction", () => {
  it("round-trips compact persisted state without changing the service-facing shape", () => {
    const state = buildSampleState();

    const compact = compactState(state);
    const expanded = expandState(compact);

    expect(expanded).toEqual({
      ...state,
      recoveries: [],
    });
  });

  it("keeps backward compatibility with legacy uncompressed state payloads", () => {
    const legacy = buildSampleState();

    expect(expandState(legacy)).toEqual(legacy);
  });

  it("shrinks large persisted state payloads", () => {
    const state = buildSampleState();
    const legacyBytes = Buffer.byteLength(JSON.stringify(state), "utf8");
    const compactBytes = Buffer.byteLength(JSON.stringify(compactState(state)), "utf8");

    expect(compactBytes).toBeLessThan(legacyBytes);
    expect(compactBytes).toBeLessThan(Math.round(legacyBytes * 0.8));
  });

  it("compresses large persisted payloads transparently", () => {
    const state = buildSampleState();
    state.packOpenings[0].cards = Array.from({ length: 20 }, (_, index) => ({
      ...state.packOpenings[0].cards[index % state.packOpenings[0].cards.length],
      articleId: 1000 + index,
      title: `Archive entry ${index}`,
    }));

    const compact = compactState(state);
    const serialized = serializePersistedValue(compact);
    const roundTrip = deserializePersistedValue(serialized);

    expect(Buffer.isBuffer(serialized)).toBe(true);
    expect(roundTrip).toEqual(compact);
  });

  it("round-trips compact recovery snapshots", () => {
    const snapshot = buildRecoverySnapshot();

    const compact = compactRecoverySnapshot(snapshot);
    const expanded = expandRecoverySnapshot(compact);

    expect(expanded).toEqual(snapshot);
  });
});
