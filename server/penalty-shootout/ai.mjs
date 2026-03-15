import { SHOT_ZONES, ZONE_BY_ID, ZONE_IDS } from "./constants.mjs";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createZoneMap(seedValue = 0) {
  return ZONE_IDS.reduce((accumulator, zoneId) => {
    accumulator[zoneId] = seedValue;
    return accumulator;
  }, {});
}

function normalizeMap(values) {
  const sum = Object.values(values).reduce((accumulator, value) => accumulator + value, 0);
  if (sum <= 0) {
    const equal = 1 / ZONE_IDS.length;
    return createZoneMap(equal);
  }
  return ZONE_IDS.reduce((accumulator, zoneId) => {
    accumulator[zoneId] = values[zoneId] / sum;
    return accumulator;
  }, {});
}

function countScores(history) {
  const counts = createZoneMap(0);
  for (const shot of history) {
    counts[shot.zoneId] += 1;
  }
  return counts;
}

function recencyDecayForProfile(difficultyProfile) {
  return clamp(0.58 + Number(difficultyProfile?.recencyWeight ?? 0.28) * 0.8, 0.6, 0.9);
}

function computeFrequencyScores(history) {
  return normalizeMap(countScores(history));
}

function computeRecencyScores(history, difficultyProfile) {
  const weighted = createZoneMap(0.35);
  const decay = recencyDecayForProfile(difficultyProfile);
  for (let index = 0; index < history.length; index += 1) {
    const shot = history[index];
    const age = history.length - 1 - index;
    weighted[shot.zoneId] += 1.08 * decay ** age;
  }
  return normalizeMap(weighted);
}

function computeTransitionScores(history, previousZoneId) {
  if (!previousZoneId) {
    return normalizeMap(createZoneMap(1));
  }
  const weighted = createZoneMap(0.4);
  for (let index = 1; index < history.length; index += 1) {
    if (history[index - 1].zoneId !== previousZoneId) {
      continue;
    }
    const age = history.length - 1 - index;
    weighted[history[index].zoneId] += 1.04 * 0.82 ** age;
  }
  return normalizeMap(weighted);
}

function computePredictability(history) {
  if (history.length <= 1) {
    return 0.16;
  }
  const counts = countScores(history);
  const maxCount = Math.max(...Object.values(counts));
  const frequencyScore = maxCount / history.length;
  let repeatTransitions = 0;
  let alternatingTransitions = 0;
  for (let index = 1; index < history.length; index += 1) {
    if (history[index].zoneId === history[index - 1].zoneId) {
      repeatTransitions += 1;
    }
    if (index >= 2 && history[index].zoneId === history[index - 2].zoneId) {
      alternatingTransitions += 1;
    }
  }
  const repeatScore = repeatTransitions / Math.max(1, history.length - 1);
  const alternatingScore = alternatingTransitions / Math.max(1, history.length - 2);
  return clamp(frequencyScore * 0.5 + repeatScore * 0.3 + alternatingScore * 0.2, 0, 1);
}

function findTendencyZone(history) {
  if (!history.length) {
    return null;
  }
  const weighted = createZoneMap(0.35);
  const decay = 0.84;
  for (let index = 0; index < history.length; index += 1) {
    const shot = history[index];
    const age = history.length - 1 - index;
    weighted[shot.zoneId] += 1.12 * decay ** age;
  }
  return ZONE_IDS.reduce((best, zoneId) => (weighted[zoneId] > weighted[best] ? zoneId : best), ZONE_IDS[0]);
}

function patternBonus(history, zoneId) {
  if (history.length < 2) {
    return 0;
  }
  const last = history[history.length - 1]?.zoneId;
  const previous = history[history.length - 2]?.zoneId;
  const currentZone = ZONE_BY_ID[zoneId];
  const lastZone = ZONE_BY_ID[last];
  if (!currentZone || !lastZone) {
    return 0;
  }
  let bonus = 0;
  if (last === previous && last === zoneId) {
    bonus += 0.24;
  }
  if (lastZone.side === currentZone.side && currentZone.side !== "center") {
    bonus += 0.08;
  }
  if (lastZone.row === currentZone.row) {
    bonus += 0.05;
  }
  return bonus;
}

function sampleWeighted(probabilities, randomFn) {
  const threshold = randomFn();
  let cumulative = 0;
  for (const zone of SHOT_ZONES) {
    cumulative += probabilities[zone.id];
    if (threshold <= cumulative) {
      return zone.id;
    }
  }
  return SHOT_ZONES[SHOT_ZONES.length - 1].id;
}

export function resolveKeeperDecision({
  history,
  attemptsTaken,
  difficultyProfile,
  goalkeeperProfile,
  sample = true,
  randomFn = Math.random,
}) {
  const anticipation = clamp(Number(goalkeeperProfile?.anticipation ?? 0.55), 0.2, 1);
  const reflex = clamp(Number(goalkeeperProfile?.reflex ?? 0.55), 0.2, 1);
  const coverage = clamp(Number(goalkeeperProfile?.coverage ?? 0.55), 0.2, 1);
  const bluffRate = clamp(Number(goalkeeperProfile?.bluffRate ?? 0.08), 0, 0.4);
  const predictability = computePredictability(history);
  const frequencyScores = computeFrequencyScores(history);
  const recencyScores = computeRecencyScores(history, difficultyProfile);
  const previousZoneId = history.length ? history[history.length - 1].zoneId : null;
  const transitionScores = computeTransitionScores(history, previousZoneId);
  const tendencyZone = findTendencyZone(history);

  const adaptation = clamp(
    0.16 +
      attemptsTaken * Number(difficultyProfile?.adaptationRate ?? 0.08) +
      predictability * (0.32 + anticipation * 0.12),
    0.16,
    0.98
  );
  const learningIndex = clamp(adaptation * 0.62 + predictability * 0.38, 0.12, 0.99);
  const rawScores = createZoneMap(0);
  for (const zoneId of ZONE_IDS) {
    let score = 0.2;
    score += frequencyScores[zoneId] * (0.2 + anticipation * 0.12);
    score += recencyScores[zoneId] * Number(difficultyProfile?.recencyWeight ?? 0.28);
    score += transitionScores[zoneId] * Number(difficultyProfile?.transitionWeight ?? 0.14);
    score += patternBonus(history, zoneId) * (0.16 + learningIndex * 0.14);
    if (tendencyZone === zoneId) {
      score += 0.08 * adaptation;
    }
    if (previousZoneId && previousZoneId === zoneId) {
      score += 0.05 * learningIndex;
    }
    rawScores[zoneId] = Math.max(0.02, score);
  }

  const ordered = [...ZONE_IDS].sort((left, right) => rawScores[right] - rawScores[left]);
  const bestZone = ordered[0];
  const topScore = rawScores[bestZone];
  const secondScore = rawScores[ordered[1]] ?? topScore;
  const confidenceGap = (topScore - secondScore) / Math.max(topScore, 0.0001);
  const confidence = clamp(0.18 + confidenceGap * 0.6 + adaptation * 0.22 + anticipation * 0.08, 0.12, 0.99);

  const normalized = normalizeMap(rawScores);
  const noise = clamp(Number(difficultyProfile?.explorationNoise ?? 0.12), 0.01, 0.4);
  const explorationMix = sample ? clamp(noise * (1 - adaptation * 0.45), 0.02, 0.28) : 0;
  const probabilities = createZoneMap(0);
  for (const zoneId of ZONE_IDS) {
    probabilities[zoneId] = normalized[zoneId] * (1 - explorationMix) + 0.2 * explorationMix;
  }
  const finalProbabilities = normalizeMap(probabilities);
  const predictedZoneId = sample ? sampleWeighted(finalProbabilities, randomFn) : bestZone;

  let decisionType = "guess";
  if (predictedZoneId === bestZone && bestZone === tendencyZone && confidence >= 0.52) {
    decisionType = "read-pattern";
  } else if (predictedZoneId === "center" && confidence < 0.42) {
    decisionType = "hold-center";
  } else if (sample && predictedZoneId !== bestZone) {
    decisionType = "wrong-commit";
  } else if (sample && randomFn() < bluffRate * 0.6) {
    decisionType = "guess";
  } else if (confidence < 0.3) {
    decisionType = "late-reaction";
  }

  const reactionMsMax = Number(difficultyProfile?.reactionMsMax ?? 330);
  const reactionMsMin = Number(difficultyProfile?.reactionMsMin ?? 220);
  const reactionMs = Math.round(
    clamp(
      reactionMsMax - (reactionMsMax - reactionMsMin) * (adaptation * 0.45 + confidence * 0.25 + reflex * 0.3),
      reactionMsMin,
      reactionMsMax
    )
  );
  const diveDurationMs = Math.round(clamp(520 - adaptation * 126 - reflex * 84 - confidence * 46, 220, 520));
  const reachPx = clamp(
    Number(difficultyProfile?.coverageRadius ?? 138) * (0.82 + coverage * 0.34),
    84,
    196
  );

  return {
    predictedZoneId,
    tendencyZone,
    adaptation,
    confidence,
    learningIndex,
    predictability,
    probabilities: finalProbabilities,
    rawScores,
    decisionType,
    reactionMs,
    diveDurationMs,
    reachPx,
  };
}
