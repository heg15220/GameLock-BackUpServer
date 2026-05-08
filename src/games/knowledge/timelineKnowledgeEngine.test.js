import { describe, expect, it } from "vitest";
import {
  TIMELINE_MISSION_CONFIG,
  buildTimelineMission,
  evaluateTimelineRound,
  fillTimelineOrder,
  formatTimelineYear,
  getTimelineEventText,
  summarizeTimelineMission,
} from "./timelineKnowledgeEngine";
import { TIMELINE_EVENT_BANK, loadTimelineEventLocale } from "./timelineEventBank";

const normalizeText = (value) => String(value || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

describe("timelineKnowledgeEngine", () => {
  it("generates deterministic missions for the same seed", () => {
    const missionA = buildTimelineMission(42);
    const missionB = buildTimelineMission(42);

    expect(missionA.rounds.length).toBe(missionB.rounds.length);
    expect(missionA.rounds[0].expectedOrderIds).toEqual(missionB.rounds[0].expectedOrderIds);
    expect(missionA.rounds[0].shuffledOrderIds).toEqual(missionB.rounds[0].shuffledOrderIds);
  });

  it("keeps mission configuration aligned with the fixed config", () => {
    const mission = buildTimelineMission(7);
    expect(mission.totalRounds).toBe(TIMELINE_MISSION_CONFIG.rounds);
    expect(mission.cardsPerRound).toBe(TIMELINE_MISSION_CONFIG.cardsPerRound);
    expect(mission.secondsPerRound).toBe(TIMELINE_MISSION_CONFIG.secondsPerRound);
    expect(mission.startIntel).toBe(TIMELINE_MISSION_CONFIG.startIntel);
    mission.rounds.forEach((round) => {
      expect(round.events.length).toBe(TIMELINE_MISSION_CONFIG.cardsPerRound);
      expect(round.expectedOrderIds.length).toBe(TIMELINE_MISSION_CONFIG.cardsPerRound);
      expect(round.shuffledOrderIds.length).toBe(TIMELINE_MISSION_CONFIG.cardsPerRound);
    });
  });

  it("produces different missions for different seeds", () => {
    const missionA = buildTimelineMission(1);
    const missionB = buildTimelineMission(999);
    const idsA = missionA.rounds.flatMap((round) => round.expectedOrderIds).join("|");
    const idsB = missionB.rounds.flatMap((round) => round.expectedOrderIds).join("|");
    expect(idsA).not.toBe(idsB);
  });

  it("fills incomplete order using round shuffled order", () => {
    const mission = buildTimelineMission(11);
    const round = mission.rounds[0];
    const partial = [round.shuffledOrderIds[2], round.shuffledOrderIds[0]];
    const completed = fillTimelineOrder(round, partial);

    expect(completed.length).toBe(round.events.length);
    expect(new Set(completed).size).toBe(round.events.length);
    expect(completed[0]).toBe(round.shuffledOrderIds[2]);
    expect(completed[1]).toBe(round.shuffledOrderIds[0]);
  });

  it("scores exact order better than reversed order", () => {
    const mission = buildTimelineMission(15);
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

  it("summarizes mission stats and rank", () => {
    const mission = buildTimelineMission(9);
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

  it("keeps timeline event content localized in es/en", async () => {
    await Promise.all([
      loadTimelineEventLocale("es"),
      loadTimelineEventLocale("en"),
    ]);
    expect(TIMELINE_EVENT_BANK.length).toBeGreaterThan(0);
    TIMELINE_EVENT_BANK.forEach((event) => {
      const titleEs = getTimelineEventText(event, "es", "title");
      const titleEn = getTimelineEventText(event, "en", "title");
      const summaryEs = getTimelineEventText(event, "es", "summary");
      const summaryEn = getTimelineEventText(event, "en", "summary");

      expect(titleEs.trim().length).toBeGreaterThan(0);
      expect(titleEn.trim().length).toBeGreaterThan(0);
      expect(summaryEs.trim().length).toBeGreaterThan(0);
      expect(summaryEn.trim().length).toBeGreaterThan(0);
      expect(normalizeText(titleEs)).not.toBe(normalizeText(titleEn));
      expect(normalizeText(summaryEs)).not.toBe(normalizeText(summaryEn));
    });
  });
});
