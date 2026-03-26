import {
  createSeededRandom,
  shuffleWithRandom,
} from "./knowledgeArcadeUtils";
import { TIMELINE_EVENT_BANK } from "./timelineEventBank";

const sortEvents = (left, right) => {
  if (left.year !== right.year) return left.year - right.year;
  return left.id.localeCompare(right.id);
};

export const TIMELINE_MODE_CONFIG = Object.freeze([
  {
    id: "mix",
    tags: null,
  },
  {
    id: "science",
    tags: ["science", "technology", "space", "medicine"],
  },
  {
    id: "geopolitics",
    tags: ["geopolitics", "war", "rights", "economy", "exploration"],
  },
  {
    id: "culture",
    tags: ["culture", "art", "sports", "media"],
  },
]);

export const TIMELINE_DIFFICULTY_CONFIG = Object.freeze([
  {
    id: "analyst",
    rounds: 6,
    cardsPerRound: 4,
    secondsPerRound: 95,
    startIntel: 8,
    minSpanYears: 180,
  },
  {
    id: "expert",
    rounds: 7,
    cardsPerRound: 5,
    secondsPerRound: 80,
    startIntel: 7,
    minSpanYears: 260,
  },
  {
    id: "master",
    rounds: 8,
    cardsPerRound: 5,
    secondsPerRound: 70,
    startIntel: 6,
    minSpanYears: 340,
  },
]);

const hashValue = (value) => {
  let hash = 2166136261;
  const text = String(value ?? "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const uniqueIds = (items) => {
  const seen = new Set();
  const out = [];
  items.forEach((item) => {
    if (!item || seen.has(item.id)) return;
    seen.add(item.id);
    out.push(item);
  });
  return out;
};

export const resolveTimelineMode = (modeId) =>
  TIMELINE_MODE_CONFIG.find((mode) => mode.id === modeId) ?? TIMELINE_MODE_CONFIG[0];

export const resolveTimelineDifficulty = (difficultyId) =>
  TIMELINE_DIFFICULTY_CONFIG.find((difficulty) => difficulty.id === difficultyId)
  ?? TIMELINE_DIFFICULTY_CONFIG[1];

export const resolveTimelineLocale = (locale) => (locale === "es" ? "es" : "en");

export const formatTimelineYear = (year, locale = "es") => {
  const value = Number(year) || 0;
  if (value < 0) {
    return `${Math.abs(value)} ${locale === "es" ? "a. C." : "BCE"}`;
  }
  return `${value}`;
};

export const getTimelineEventText = (event, locale, field = "title") =>
  event?.[field]?.[locale] ?? event?.[field]?.en ?? event?.[field]?.es ?? event?.id ?? "";

const sampleEvents = (random, pool, count, avoidIds) => {
  const preferred = pool.filter((event) => !avoidIds.has(event.id));
  const source = preferred.length >= count ? preferred : pool;
  const chosen = [];
  const selectedIds = new Set();
  let guard = 0;
  const maxGuard = Math.max(40, source.length * 6);

  while (chosen.length < count && guard < maxGuard) {
    guard += 1;
    const candidate = source[Math.floor(random() * source.length)];
    if (!candidate || selectedIds.has(candidate.id)) continue;
    chosen.push(candidate);
    selectedIds.add(candidate.id);
  }

  if (chosen.length < count) {
    source.forEach((candidate) => {
      if (chosen.length >= count) return;
      if (selectedIds.has(candidate.id)) return;
      chosen.push(candidate);
      selectedIds.add(candidate.id);
    });
  }

  return chosen;
};

const hasRoundDiversity = (events, minSpanYears) => {
  if (events.length <= 1) return true;
  const years = events.map((event) => event.year);
  const uniqueYearCount = new Set(years).size;
  if (uniqueYearCount < events.length) return false;
  const span = Math.max(...years) - Math.min(...years);
  if (span < minSpanYears) return false;

  const centuries = new Set(years.map((year) => Math.floor(year / 100)));
  const minCenturies = events.length >= 5 ? 3 : 2;
  return centuries.size >= minCenturies;
};

const buildRound = ({
  random,
  pool,
  cardsPerRound,
  minSpanYears,
  avoidIds,
  roundIndex,
}) => {
  let selected = sampleEvents(random, pool, cardsPerRound, avoidIds);
  let adaptiveSpan = minSpanYears;

  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (hasRoundDiversity(selected, adaptiveSpan)) break;
    if (attempt === 30) adaptiveSpan = Math.floor(minSpanYears * 0.75);
    if (attempt === 60) adaptiveSpan = Math.floor(minSpanYears * 0.55);
    selected = sampleEvents(random, pool, cardsPerRound, avoidIds);
  }

  const events = uniqueIds(selected).sort(sortEvents);
  const expectedOrderIds = events.map((event) => event.id);
  let shuffledOrderIds = shuffleWithRandom(expectedOrderIds, random);

  if (shuffledOrderIds.join("|") === expectedOrderIds.join("|")) {
    shuffledOrderIds = [...shuffledOrderIds].reverse();
  }

  const anchorId = expectedOrderIds[Math.floor((expectedOrderIds.length - 1) / 2)] ?? null;
  const yearValues = events.map((event) => event.year);

  return {
    id: `timeline-round-${roundIndex + 1}`,
    events,
    expectedOrderIds,
    shuffledOrderIds,
    anchorId,
    yearMin: Math.min(...yearValues),
    yearMax: Math.max(...yearValues),
  };
};

const buildModePool = (modeId) => {
  const mode = resolveTimelineMode(modeId);
  const tagSet = mode.tags ? new Set(mode.tags) : null;
  const pool = TIMELINE_EVENT_BANK
    .filter((event) => (tagSet ? event.tags.some((tag) => tagSet.has(tag)) : true))
    .sort(sortEvents);
  return pool.length ? pool : [...TIMELINE_EVENT_BANK].sort(sortEvents);
};

export const buildTimelineMission = (
  matchId,
  modeId = "mix",
  difficultyId = "expert",
) => {
  const safeMatchId = Math.max(0, Number(matchId) || 0);
  const mode = resolveTimelineMode(modeId);
  const difficulty = resolveTimelineDifficulty(difficultyId);
  const pool = buildModePool(mode.id);
  const random = createSeededRandom(
    safeMatchId
    + hashValue(mode.id)
    + Math.imul(hashValue(difficulty.id), 3),
  );
  const rounds = [];
  const usedIds = new Set();

  for (let roundIndex = 0; roundIndex < difficulty.rounds; roundIndex += 1) {
    if (pool.length - usedIds.size < difficulty.cardsPerRound) {
      usedIds.clear();
    }

    const round = buildRound({
      random,
      pool,
      cardsPerRound: difficulty.cardsPerRound,
      minSpanYears: difficulty.minSpanYears,
      avoidIds: usedIds,
      roundIndex,
    });

    round.events.forEach((event) => usedIds.add(event.id));
    rounds.push(round);
  }

  return {
    matchId: safeMatchId,
    modeId: mode.id,
    difficultyId: difficulty.id,
    rounds,
    totalRounds: rounds.length,
    cardsPerRound: difficulty.cardsPerRound,
    secondsPerRound: difficulty.secondsPerRound,
    startIntel: difficulty.startIntel,
  };
};

export const fillTimelineOrder = (round, placedOrderIds) => {
  const placed = [];
  const seen = new Set();
  const validIds = new Set(round?.events?.map((event) => event.id) ?? []);
  (placedOrderIds ?? []).forEach((eventId) => {
    if (!validIds.has(eventId) || seen.has(eventId)) return;
    placed.push(eventId);
    seen.add(eventId);
  });
  (round?.shuffledOrderIds ?? []).forEach((eventId) => {
    if (!validIds.has(eventId) || seen.has(eventId)) return;
    placed.push(eventId);
    seen.add(eventId);
  });
  return placed.slice(0, round?.events?.length ?? 0);
};

export const evaluateTimelineRound = ({
  round,
  placedOrderIds,
  secondsLeft = 0,
  hintsUsed = 0,
  streakBefore = 0,
}) => {
  const fallback = {
    expectedOrderIds: [],
    finalOrderIds: [],
    slotBreakdown: [],
    correctSlots: 0,
    totalError: 0,
    maxError: 0,
    accuracy: 0,
    chronologyRatio: 0,
    inversionCount: 0,
    exactOrder: false,
    scoreDelta: 0,
    speedBonus: 0,
    hintPenalty: 0,
    streakBonus: 0,
    grade: "chaotic",
  };
  if (!round?.events?.length) return fallback;

  const byId = new Map(round.events.map((event) => [event.id, event]));
  const expectedOrderIds = [...round.expectedOrderIds];
  const expectedIndexById = new Map(expectedOrderIds.map((eventId, index) => [eventId, index]));
  const finalOrderIds = fillTimelineOrder(round, placedOrderIds);
  const cardCount = finalOrderIds.length;
  const maxSlotError = Math.max(1, cardCount - 1);

  let correctSlots = 0;
  let totalError = 0;
  const slotBreakdown = finalOrderIds.map((eventId, placedIndex) => {
    const expectedIndex = expectedIndexById.get(eventId) ?? placedIndex;
    const error = Math.abs(expectedIndex - placedIndex);
    if (error === 0) correctSlots += 1;
    totalError += error;
    return {
      eventId,
      expectedIndex,
      placedIndex,
      error,
      year: byId.get(eventId)?.year ?? null,
    };
  });

  const maxError = cardCount * maxSlotError;
  const accuracy = clamp(1 - totalError / Math.max(1, maxError), 0, 1);
  const pairTotal = (cardCount * (cardCount - 1)) / 2;
  let orderedPairs = 0;

  for (let leftIndex = 0; leftIndex < finalOrderIds.length; leftIndex += 1) {
    const leftYear = byId.get(finalOrderIds[leftIndex])?.year ?? 0;
    for (let rightIndex = leftIndex + 1; rightIndex < finalOrderIds.length; rightIndex += 1) {
      const rightYear = byId.get(finalOrderIds[rightIndex])?.year ?? 0;
      if (leftYear <= rightYear) {
        orderedPairs += 1;
      }
    }
  }

  const chronologyRatio = pairTotal > 0 ? orderedPairs / pairTotal : 1;
  const inversionCount = pairTotal - orderedPairs;
  const exactOrder = totalError === 0;
  const positionScore = Math.round((correctSlots / cardCount) * 620 + accuracy * 430);
  const chronologyScore = Math.round(chronologyRatio * 300);
  const speedBonus = Math.max(0, Math.round((Number(secondsLeft) || 0) * 6));
  const hintPenalty = Math.max(0, Math.round((Number(hintsUsed) || 0) * 110));
  const streakBonus = exactOrder ? 180 + Math.max(0, Number(streakBefore) || 0) * 70 : 0;
  const scoreDelta = Math.max(
    80,
    positionScore + chronologyScore + speedBonus + streakBonus - hintPenalty,
  );

  let grade = "chaotic";
  if (exactOrder) {
    grade = "perfect";
  } else if (accuracy >= 0.76 && chronologyRatio >= 0.84) {
    grade = "strong";
  } else if (accuracy >= 0.56) {
    grade = "stable";
  }

  return {
    expectedOrderIds,
    finalOrderIds,
    slotBreakdown,
    correctSlots,
    totalError,
    maxError,
    accuracy,
    chronologyRatio,
    inversionCount,
    exactOrder,
    scoreDelta,
    speedBonus,
    hintPenalty,
    streakBonus,
    grade,
  };
};

export const summarizeTimelineMission = (mission, history, totalScore) => {
  const rounds = mission?.totalRounds ?? 0;
  if (!history?.length || rounds <= 0) {
    return {
      roundsPlayed: 0,
      roundsTarget: rounds,
      averageAccuracy: 0,
      averageChronology: 0,
      perfectRounds: 0,
      totalScore: Math.max(0, Number(totalScore) || 0),
      rank: "D",
      ratio: 0,
    };
  }

  const averageAccuracy = history.reduce((sum, item) => sum + (item.accuracy ?? 0), 0) / history.length;
  const averageChronology = history.reduce((sum, item) => sum + (item.chronologyRatio ?? 0), 0) / history.length;
  const perfectRounds = history.filter((item) => item.exactOrder).length;
  const score = Math.max(0, Number(totalScore) || 0);
  const expectedPerRound = 1650;
  const ratio = clamp(score / Math.max(1, rounds * expectedPerRound), 0, 1);

  let rank = "D";
  if (ratio >= 0.86) rank = "S";
  else if (ratio >= 0.72) rank = "A";
  else if (ratio >= 0.58) rank = "B";
  else if (ratio >= 0.44) rank = "C";

  return {
    roundsPlayed: history.length,
    roundsTarget: rounds,
    averageAccuracy,
    averageChronology,
    perfectRounds,
    totalScore: score,
    rank,
    ratio,
  };
};

