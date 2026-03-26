import { describe, expect, it } from "vitest";
import {
  TIMELINE_DIFFICULTY_CONFIG,
  TIMELINE_MODE_CONFIG,
  buildTimelineMission,
  evaluateTimelineRound,
  fillTimelineOrder,
  formatTimelineYear,
  summarizeTimelineMission,
} from "./timelineKnowledgeEngine";
import { TIMELINE_EVENT_BANK } from "./timelineEventBank";

const normalizeText = (value) => String(value || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const MIX_THEME_IDS = new Set([
  "video-games",
  "gastronomy",
  "music",
  "cinema",
  "civic-science",
  "mix-fallback",
]);

const CIVIC_SCIENCE_TAG_SET = new Set([
  "science",
  "technology",
  "space",
  "medicine",
  "programming",
  "geopolitics",
  "war",
  "rights",
  "economy",
  "exploration",
  "politics",
]);

const extractGeneratedCategoryId = (eventId) => {
  if (typeof eventId !== "string" || !eventId.startsWith("wd-")) return null;
  const qMarker = eventId.lastIndexOf("-q");
  if (qMarker <= 3) return null;
  return eventId.slice(3, qMarker);
};

const GEOPOLITICS_ALLOWED_GENERATED_CATEGORY_SET = new Set([
  "historical-event",
  "election",
  "military-conflict",
  "war",
  "treaty",
  "political-party",
]);

const GEOPOLITICS_ALLOWED_TAG_SET = new Set([
  "geopolitics",
  "politics",
]);

const isEventValidForGeopoliticsMode = (event) => {
  const categoryId = extractGeneratedCategoryId(event?.id);
  if (categoryId) return GEOPOLITICS_ALLOWED_GENERATED_CATEGORY_SET.has(categoryId);
  const tags = event?.tags ?? [];
  return tags.some((tag) => GEOPOLITICS_ALLOWED_TAG_SET.has(tag));
};

const isEventValidForTheme = (event, themeId) => {
  const tags = event.tags ?? [];
  const categoryId = extractGeneratedCategoryId(event.id);
  if (themeId === "video-games") {
    return categoryId === "video-game" || tags.includes("gaming");
  }
  if (themeId === "gastronomy") {
    return categoryId === "restaurant" || categoryId === "food-company" || tags.includes("gastronomy");
  }
  if (themeId === "music") {
    return categoryId === "music-album" || categoryId === "song" || tags.includes("music");
  }
  if (themeId === "cinema") {
    return categoryId === "film" || tags.includes("cinema");
  }
  if (themeId === "civic-science") {
    const isolatedCategoryIds = new Set([
      "video-game",
      "restaurant",
      "food-company",
      "music-album",
      "song",
      "film",
    ]);
    if (categoryId && isolatedCategoryIds.has(categoryId)) return false;
    return tags.some((tag) => CIVIC_SCIENCE_TAG_SET.has(tag));
  }
  return true;
};

describe("timelineKnowledgeEngine", () => {
  it("generates deterministic missions for the same seed", () => {
    const missionA = buildTimelineMission(42, "science", "expert");
    const missionB = buildTimelineMission(42, "science", "expert");

    expect(missionA.rounds.length).toBe(missionB.rounds.length);
    expect(missionA.rounds[0].expectedOrderIds).toEqual(missionB.rounds[0].expectedOrderIds);
    expect(missionA.rounds[0].shuffledOrderIds).toEqual(missionB.rounds[0].shuffledOrderIds);
  });

  it("keeps mission configuration aligned with difficulty settings", () => {
    TIMELINE_DIFFICULTY_CONFIG.forEach((difficulty) => {
      const mission = buildTimelineMission(7, "mix", difficulty.id);
      expect(mission.totalRounds).toBe(difficulty.rounds);
      expect(mission.cardsPerRound).toBe(difficulty.cardsPerRound);
      expect(mission.secondsPerRound).toBe(difficulty.secondsPerRound);
      expect(mission.startIntel).toBe(difficulty.startIntel);
      mission.rounds.forEach((round) => {
        expect(round.events.length).toBe(difficulty.cardsPerRound);
        expect(round.expectedOrderIds.length).toBe(difficulty.cardsPerRound);
        expect(round.shuffledOrderIds.length).toBe(difficulty.cardsPerRound);
      });
    });
  });

  it("builds valid pools for every mode", () => {
    TIMELINE_MODE_CONFIG.forEach((mode) => {
      const mission = buildTimelineMission(3, mode.id, "analyst");
      expect(mission.rounds.length).toBeGreaterThan(0);
      expect(mission.rounds[0].events.length).toBeGreaterThan(0);
    });
  });

  it("keeps one thematic family per random mix mission", () => {
    for (let seed = 1; seed <= 32; seed += 1) {
      const mission = buildTimelineMission(seed, "mix", "analyst");
      expect(MIX_THEME_IDS.has(mission.themeGroupId)).toBe(true);
      mission.rounds.forEach((round) => {
        round.events.forEach((event) => {
          expect(isEventValidForTheme(event, mission.themeGroupId)).toBe(true);
        });
      });
    }
  });

  it("fills incomplete order using round shuffled order", () => {
    const mission = buildTimelineMission(11, "mix", "analyst");
    const round = mission.rounds[0];
    const partial = [round.shuffledOrderIds[2], round.shuffledOrderIds[0]];
    const completed = fillTimelineOrder(round, partial);

    expect(completed.length).toBe(round.events.length);
    expect(new Set(completed).size).toBe(round.events.length);
    expect(completed[0]).toBe(round.shuffledOrderIds[2]);
    expect(completed[1]).toBe(round.shuffledOrderIds[0]);
  });

  it("scores exact order better than reversed order", () => {
    const mission = buildTimelineMission(15, "geopolitics", "expert");
    const round = mission.rounds[0];
    const exact = evaluateTimelineRound({
      round,
      placedOrderIds: round.expectedOrderIds,
      secondsLeft: 35,
      hintsUsed: 0,
      streakBefore: 2,
    });
    const reversed = evaluateTimelineRound({
      round,
      placedOrderIds: [...round.expectedOrderIds].reverse(),
      secondsLeft: 35,
      hintsUsed: 0,
      streakBefore: 2,
    });

    expect(exact.exactOrder).toBe(true);
    expect(exact.scoreDelta).toBeGreaterThan(reversed.scoreDelta);
    expect(exact.accuracy).toBeGreaterThan(reversed.accuracy);
    expect(exact.chronologyRatio).toBeGreaterThan(reversed.chronologyRatio);
  });

  it("keeps geopolitics mode limited to historical, political, and geopolitical events", () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const mission = buildTimelineMission(seed, "geopolitics", "master");
      mission.rounds.forEach((round) => {
        round.events.forEach((event) => {
          expect(isEventValidForGeopoliticsMode(event)).toBe(true);
        });
      });
    }
  });

  it("summarizes mission stats and rank", () => {
    const mission = buildTimelineMission(9, "culture", "analyst");
    const history = [
      { accuracy: 1, chronologyRatio: 1, exactOrder: true },
      { accuracy: 0.8, chronologyRatio: 0.9, exactOrder: false },
      { accuracy: 0.7, chronologyRatio: 0.8, exactOrder: false },
    ];
    const summary = summarizeTimelineMission(mission, history, 7200);
    expect(summary.roundsPlayed).toBe(3);
    expect(summary.roundsTarget).toBe(mission.totalRounds);
    expect(summary.averageAccuracy).toBeGreaterThan(0.8 - 0.001);
    expect(summary.averageChronology).toBeGreaterThan(0.89 - 0.001);
    expect(["S", "A", "B", "C", "D"]).toContain(summary.rank);
  });

  it("formats years in BCE/CE mode", () => {
    expect(formatTimelineYear(-44, "en")).toContain("BCE");
    expect(formatTimelineYear(-44, "es")).toContain("a. C.");
    expect(formatTimelineYear(1969, "en")).toBe("1969");
  });

  it("keeps timeline event content localized in es/en", () => {
    expect(TIMELINE_EVENT_BANK.length).toBeGreaterThan(0);
    TIMELINE_EVENT_BANK.forEach((event) => {
      const titleEs = event.title?.es ?? "";
      const titleEn = event.title?.en ?? "";
      const summaryEs = event.summary?.es ?? "";
      const summaryEn = event.summary?.en ?? "";

      expect(titleEs.trim().length).toBeGreaterThan(0);
      expect(titleEn.trim().length).toBeGreaterThan(0);
      expect(normalizeText(titleEs)).not.toBe(normalizeText(titleEn));

      const generatedEvent = event.id.startsWith("wd-");
      if (generatedEvent) {
        expect(summaryEs).toBe("");
        expect(summaryEn).toBe("");
      } else {
        expect(summaryEs.trim().length).toBeGreaterThan(0);
        expect(summaryEn.trim().length).toBeGreaterThan(0);
        expect(normalizeText(summaryEs)).not.toBe(normalizeText(summaryEn));
      }
    });
  });
});
