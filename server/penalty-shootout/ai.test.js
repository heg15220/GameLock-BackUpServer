import { describe, expect, it } from "vitest";
import { resolveKeeperDecision } from "./ai.mjs";

const difficultyProfile = {
  id: "competitive",
  adaptationRate: 0.08,
  recencyWeight: 0.28,
  transitionWeight: 0.14,
  explorationNoise: 0.12,
  reactionMsMin: 220,
  reactionMsMax: 330,
  coverageRadius: 138,
};

const goalkeeperProfile = {
  anticipation: 0.72,
  reflex: 0.68,
  coverage: 0.7,
  bluffRate: 0.08,
};

describe("resolveKeeperDecision", () => {
  it("increases read probability on repeated zones", () => {
    const repeatedHistory = [
      { zoneId: "top-left" },
      { zoneId: "top-left" },
      { zoneId: "top-left" },
      { zoneId: "top-left" },
    ];
    const balancedHistory = [
      { zoneId: "top-left" },
      { zoneId: "top-right" },
      { zoneId: "down-left" },
      { zoneId: "down-right" },
    ];

    const repeated = resolveKeeperDecision({
      history: repeatedHistory,
      attemptsTaken: repeatedHistory.length,
      difficultyProfile,
      goalkeeperProfile,
      sample: false,
      randomFn: () => 0.5,
    });
    const balanced = resolveKeeperDecision({
      history: balancedHistory,
      attemptsTaken: balancedHistory.length,
      difficultyProfile,
      goalkeeperProfile,
      sample: false,
      randomFn: () => 0.5,
    });

    expect(repeated.predictedZoneId).toBe("top-left");
    expect(repeated.probabilities["top-left"]).toBeGreaterThan(balanced.probabilities["top-left"]);
    expect(repeated.confidence).toBeGreaterThan(balanced.confidence);
  });
});
