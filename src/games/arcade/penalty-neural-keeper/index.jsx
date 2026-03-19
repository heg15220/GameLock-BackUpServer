import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import { createPenaltyMatch, fetchPenaltyTeams, submitPenaltyShot } from "./backendClient";

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 620;
const TOTAL_PENALTIES = 10;
const FIXED_STEP_MS = 1000 / 60;
const MAX_DELTA_MS = 50;
const COORDINATE_SYSTEM = "origin_top_left_x_right_y_down_pixels";

const GOAL_FRAME = {
  x: 286,
  y: 84,
  w: 508,
  h: 212,
};

const PENALTY_SPOT = {
  x: CANVAS_WIDTH / 2,
  y: 515,
};

const GOAL_CENTER_X = GOAL_FRAME.x + GOAL_FRAME.w * 0.5;
const KEEPER_BASE_Y = GOAL_FRAME.y + GOAL_FRAME.h - 22;

const SHOT_ZONES = [
  {
    id: "down-left",
    row: 1,
    col: 0,
    side: "left",
    target: { x: GOAL_FRAME.x + 86, y: GOAL_FRAME.y + GOAL_FRAME.h - 26 },
    label: { es: "Abajo izquierda", en: "Bottom left" },
    short: { es: "AI", en: "BL" },
  },
  {
    id: "down-right",
    row: 1,
    col: 2,
    side: "right",
    target: { x: GOAL_FRAME.x + GOAL_FRAME.w - 86, y: GOAL_FRAME.y + GOAL_FRAME.h - 26 },
    label: { es: "Abajo derecha", en: "Bottom right" },
    short: { es: "AD", en: "BR" },
  },
  {
    id: "top-left",
    row: 0,
    col: 0,
    side: "left",
    target: { x: GOAL_FRAME.x + 80, y: GOAL_FRAME.y + 36 },
    label: { es: "Arriba izquierda", en: "Top left" },
    short: { es: "ArI", en: "TL" },
  },
  {
    id: "top-right",
    row: 0,
    col: 2,
    side: "right",
    target: { x: GOAL_FRAME.x + GOAL_FRAME.w - 80, y: GOAL_FRAME.y + 36 },
    label: { es: "Arriba derecha", en: "Top right" },
    short: { es: "ArD", en: "TR" },
  },
  {
    id: "center",
    row: 1,
    col: 1,
    side: "center",
    target: { x: GOAL_CENTER_X, y: GOAL_FRAME.y + GOAL_FRAME.h * 0.52 },
    label: { es: "Centro", en: "Center" },
    short: { es: "C", en: "C" },
  },
];

const ZONE_BY_ID = Object.fromEntries(SHOT_ZONES.map((zone) => [zone.id, zone]));
const ZONE_IDS = SHOT_ZONES.map((zone) => zone.id);

const UI_COPY = {
  es: {
    title: "Penalty Neural Keeper",
    subtitle:
      "Tanda de 10 penaltis con IA adaptativa: el portero aprende patrones recientes y mejora cada parada.",
    start: "Empezar tanda",
    restart: "Nueva tanda",
    fullscreen: "Pantalla completa",
    continue: "Continuar",
    attempt: "Penalti",
    goals: "Goles",
    saves: "Paradas",
    score: "Marcador",
    aiTitle: "Analitica del portero",
    adaptation: "Adaptacion",
    confidence: "Confianza",
    learningIndex: "Indice de aprendizaje",
    tendency: "Tendencia detectada",
    diveRead: "Lectura probable",
    saveChance: "Prob. de parada estimada",
    controlsTitle: "Seleccion de zona",
    defendTitle: "Control del portero",
    controlsHint:
      "Raton/touch o teclado: 1=abajo izq, 2=abajo der, 3=arriba izq, 4=arriba der, 5=centro. R reinicia, F pantalla completa.",
    defendHint:
      "Cuando ataca el rival, usa 1-5 para decidir la estirada del portero. La IA chutara automaticamente en cuanto elijas.",
    timelineTitle: "Ultimas tiradas",
    timelineEmpty: "Sin historial todavia.",
    menuTitle: "Penalty Neural Keeper",
    menuBody:
      "Define una de cinco zonas por disparo. El portero IA analiza frecuencia, repeticion y transiciones para anticipar la siguiente decision.",
    menuHint:
      "Si repites patrones, la IA aumenta su cobertura lateral, reduce su reaccion y sube su probabilidad de parada.",
    finishedTitle: "Tanda finalizada",
    finishedBody: "Resume y vuelve a lanzar otra serie para medir si puedes romper la lectura del portero.",
    chooseZone: "Elige una zona de disparo para iniciar el siguiente penalti.",
    chooseSave: "El rival va a tirar. Elige la estirada de tu portero.",
    preparing: "Preparando ejecucion...",
    rivalPreparing: "El rival prepara su disparo...",
    shotGoal: "Gol: el balon supera la estirada del portero.",
    shotSave: "Parada: el portero cierra la zona y bloquea el tiro.",
    nextPenalty: "Listo para el siguiente penalti.",
    rivalGoal: "El rival marca.",
    keeperSave: "Paradon: tu portero evita el gol.",
    finalMessage: "Resultado final",
    tendencyUnknown: "Sin patron claro aun",
    controlsAria: "Controles de disparo de penaltis",
    turnAttack: "Tu disparo",
    turnSave: "Rival al tiro",
    roleTitle: "Rol actual",
    roleAttack: "Eres el lanzador. Busca el gol.",
    roleSave: "Eres el portero. Decide donde parar.",
    aiShooterLabel: "IA AL TIRO",
  },
  en: {
    title: "Penalty Neural Keeper",
    subtitle:
      "10-penalty shootout with adaptive AI: the goalkeeper learns recent patterns and improves each save.",
    start: "Start shootout",
    restart: "New shootout",
    fullscreen: "Fullscreen",
    continue: "Continue",
    attempt: "Penalty",
    goals: "Goals",
    saves: "Saves",
    score: "Score",
    aiTitle: "Goalkeeper analytics",
    adaptation: "Adaptation",
    confidence: "Confidence",
    learningIndex: "Learning index",
    tendency: "Detected tendency",
    diveRead: "Likely read",
    saveChance: "Estimated save chance",
    controlsTitle: "Shot target",
    defendTitle: "Goalkeeper control",
    controlsHint:
      "Mouse/touch or keyboard: 1=bottom left, 2=bottom right, 3=top left, 4=top right, 5=center. R restarts, F fullscreen.",
    defendHint:
      "When the rival attacks, use 1-5 to choose your keeper dive. The AI will shoot automatically as soon as you commit.",
    timelineTitle: "Recent shots",
    timelineEmpty: "No history yet.",
    menuTitle: "Penalty Neural Keeper",
    menuBody:
      "Choose one of five target zones each shot. The AI goalkeeper analyzes frequency, repetition, and transitions to anticipate your next decision.",
    menuHint:
      "If you repeat patterns, the AI increases lateral coverage, lowers reaction time, and raises save probability.",
    finishedTitle: "Shootout complete",
    finishedBody: "Review the run and fire a new series to see whether you can break the goalkeeper read.",
    chooseZone: "Pick a target zone to launch the next penalty.",
    chooseSave: "The rival is about to shoot. Pick your goalkeeper dive.",
    preparing: "Preparing shot...",
    rivalPreparing: "Opponent preparing the shot...",
    shotGoal: "Goal: the ball beats the goalkeeper stretch.",
    shotSave: "Save: the goalkeeper closes the lane and blocks the shot.",
    nextPenalty: "Ready for the next penalty.",
    rivalGoal: "The opponent scores.",
    keeperSave: "Big save: your goalkeeper keeps it out.",
    finalMessage: "Final result",
    tendencyUnknown: "No clear pattern yet",
    controlsAria: "Penalty shot controls",
    turnAttack: "Your shot",
    turnSave: "Opponent shooting",
    roleTitle: "Current role",
    roleAttack: "You are the shooter. Go for goal.",
    roleSave: "You are the goalkeeper. Pick where to save.",
    aiShooterLabel: "AI SHOOTING",
  },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function easeOutCubic(t) {
  const clamped = clamp(t, 0, 1);
  return 1 - (1 - clamped) ** 3;
}

function easeInOutSine(t) {
  const clamped = clamp(t, 0, 1);
  return -(Math.cos(Math.PI * clamped) - 1) * 0.5;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function normalizeResultCode(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  return normalized || null;
}

function outcomeTypeFromOutcome(outcome) {
  const explicitType = normalizeResultCode(outcome?.type);
  if (explicitType) {
    return explicitType;
  }
  if (typeof outcome?.isSave === "boolean") {
    return outcome.isSave ? "SAVE" : "GOAL";
  }
  return null;
}

function isSaveOutcome(outcome) {
  return outcomeTypeFromOutcome(outcome) === "SAVE";
}

function normalizeShotOutcome(shot) {
  if (!shot || typeof shot !== "object") {
    return shot;
  }
  const normalizedType = outcomeTypeFromOutcome(shot.outcome);
  if (!normalizedType) {
    return shot;
  }
  return {
    ...shot,
    outcome: {
      ...(shot.outcome ?? {}),
      type: normalizedType,
      isSave: normalizedType === "SAVE",
    },
  };
}

function normalizeHistoryEntries(history) {
  if (!Array.isArray(history)) {
    return [];
  }
  return history.map((entry) => {
    const normalizedResult = normalizeResultCode(entry?.result);
    if (!normalizedResult) {
      return entry;
    }
    return {
      ...entry,
      result: normalizedResult,
    };
  });
}

function buildScoreboardFromCounts({
  playerGoals,
  rivalGoals,
  playerShotsTaken,
  rivalShotsTaken,
  maxInitialShots,
}) {
  const safeMaxInitialShots = Math.max(1, Number(maxInitialShots) || 5);
  const completedInitialPairs = Math.min(
    safeMaxInitialShots,
    Math.max(playerShotsTaken, rivalShotsTaken)
  );
  return {
    playerGoals,
    rivalGoals,
    playerShotsTaken,
    rivalShotsTaken,
    round: Math.max(playerShotsTaken, rivalShotsTaken) + 1,
    remainingInitialShots: Math.max(0, safeMaxInitialShots - completedInitialPairs),
    suddenDeath:
      playerShotsTaken >= safeMaxInitialShots &&
      rivalShotsTaken >= safeMaxInitialShots &&
      playerGoals === rivalGoals,
    maxInitialShots: safeMaxInitialShots,
  };
}

function enforceDeterministicShot(shot) {
  const normalizedShot = normalizeShotOutcome(shot);
  if (!normalizedShot) {
    return normalizedShot;
  }
  const keeperZoneId = normalizedShot.keeper?.predictedZoneId;
  const shotZoneId = normalizedShot.zoneId;
  if (!keeperZoneId || !shotZoneId) {
    return normalizedShot;
  }
  const isSave = keeperZoneId === shotZoneId;
  return {
    ...normalizedShot,
    outcome: {
      ...(normalizedShot.outcome ?? {}),
      type: isSave ? "SAVE" : "GOAL",
      isSave,
      saveProbability: isSave ? 1 : 0,
    },
  };
}

function patchHistoryWithResolvedShot(history, resolvedShot) {
  const normalizedHistory = normalizeHistoryEntries(history);
  if (!resolvedShot || !normalizedHistory.length) {
    return normalizedHistory;
  }
  const lastIndex = normalizedHistory.length - 1;
  const lastEntry = normalizedHistory[lastIndex];
  if (!lastEntry || lastEntry.actor !== resolvedShot.actor) {
    return normalizedHistory;
  }
  const resolvedType = outcomeTypeFromOutcome(resolvedShot.outcome) ?? lastEntry.result;
  const patchedEntry = {
    ...lastEntry,
    result: resolvedType,
    saveProbability: resolvedShot.outcome?.saveProbability ?? lastEntry.saveProbability ?? 0,
  };
  return [...normalizedHistory.slice(0, lastIndex), patchedEntry];
}

function enforceDeterministicPayload(previous, payload) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }
  const playerShot = payload.playerShot ? enforceDeterministicShot(payload.playerShot) : null;
  const rivalShot = payload.rivalShot ? enforceDeterministicShot(payload.rivalShot) : null;
  const resolvedShot = playerShot ?? rivalShot;
  const previousScoreboard = previous.scoreboard ?? createEmptyScoreboard();
  const maxInitialShots =
    Number(payload.scoreboard?.maxInitialShots ?? previousScoreboard.maxInitialShots ?? 5) || 5;

  let playerGoals = Number(previousScoreboard.playerGoals ?? 0);
  let rivalGoals = Number(previousScoreboard.rivalGoals ?? 0);
  let playerShotsTaken = Number(previousScoreboard.playerShotsTaken ?? 0);
  let rivalShotsTaken = Number(previousScoreboard.rivalShotsTaken ?? 0);

  if (playerShot) {
    playerShotsTaken += 1;
    if (outcomeTypeFromOutcome(playerShot.outcome) === "GOAL") {
      playerGoals += 1;
    }
  }
  if (rivalShot) {
    rivalShotsTaken += 1;
    if (outcomeTypeFromOutcome(rivalShot.outcome) === "GOAL") {
      rivalGoals += 1;
    }
  }

  const scoreboard = buildScoreboardFromCounts({
    playerGoals,
    rivalGoals,
    playerShotsTaken,
    rivalShotsTaken,
    maxInitialShots,
  });

  const summary = {
    ...(payload.summary ?? {}),
  };
  if (playerShot) {
    summary.playerOutcome = outcomeTypeFromOutcome(playerShot.outcome);
  }
  if (rivalShot) {
    summary.rivalOutcome = outcomeTypeFromOutcome(rivalShot.outcome);
  }

  return {
    ...payload,
    playerShot,
    rivalShot,
    history: patchHistoryWithResolvedShot(payload.history, resolvedShot),
    scoreboard,
    summary,
  };
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

function localizeZone(zoneId, locale) {
  const zone = ZONE_BY_ID[zoneId];
  if (!zone) {
    return zoneId;
  }
  return zone.label[locale] ?? zone.label.en;
}

function shortZone(zoneId, locale) {
  const zone = ZONE_BY_ID[zoneId];
  if (!zone) {
    return zoneId;
  }
  return zone.short[locale] ?? zone.short.en;
}

function localizeKeeperDive(zoneId, locale) {
  const zoneLabel = localizeZone(zoneId, locale);
  return locale === "es" ? `Parar ${zoneLabel.toLowerCase()}` : `Save ${zoneLabel.toLowerCase()}`;
}

function findTendencyZone(history) {
  if (!history.length) {
    return null;
  }
  const weighted = createZoneMap(0.4);
  for (let index = 0; index < history.length; index += 1) {
    const shot = history[index];
    const age = history.length - 1 - index;
    const decay = 0.82 ** age;
    weighted[shot.zoneId] += 1.15 * decay;
  }
  let bestZone = ZONE_IDS[0];
  let bestScore = -Infinity;
  for (const zoneId of ZONE_IDS) {
    if (weighted[zoneId] > bestScore) {
      bestScore = weighted[zoneId];
      bestZone = zoneId;
    }
  }
  return bestZone;
}

function computePredictability(history) {
  if (history.length <= 1) {
    return 0.16;
  }
  const counts = createZoneMap(0);
  for (const shot of history) {
    counts[shot.zoneId] += 1;
  }
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
  const repeatScore = repeatTransitions / (history.length - 1);
  const alternatingScore = alternatingTransitions / Math.max(1, history.length - 2);
  return clamp(frequencyScore * 0.52 + repeatScore * 0.28 + alternatingScore * 0.2, 0, 1);
}

function computeFrequencyScores(history) {
  const weighted = createZoneMap(0.7);
  for (let index = 0; index < history.length; index += 1) {
    const shot = history[index];
    const age = history.length - 1 - index;
    const decay = 0.84 ** age;
    weighted[shot.zoneId] += 1.2 * decay;
  }
  return normalizeMap(weighted);
}

function computeTransitionScores(history, previousZoneId) {
  if (!previousZoneId) {
    return normalizeMap(createZoneMap(1));
  }
  const weighted = createZoneMap(0.55);
  for (let index = 1; index < history.length; index += 1) {
    if (history[index - 1].zoneId !== previousZoneId) {
      continue;
    }
    const age = history.length - 1 - index;
    const decay = 0.8 ** age;
    weighted[history[index].zoneId] += 1.08 * decay;
  }
  return normalizeMap(weighted);
}

function patternBonus(history, zoneId) {
  if (history.length < 2) {
    return 0;
  }
  const last = history[history.length - 1]?.zoneId;
  const previous = history[history.length - 2]?.zoneId;
  const currentZone = ZONE_BY_ID[zoneId];
  const lastZone = ZONE_BY_ID[last];
  if (!lastZone || !currentZone) {
    return 0;
  }
  let bonus = 0;
  if (last === previous && last === zoneId) {
    bonus += 0.24;
  }
  if (lastZone.side === currentZone.side && lastZone.side !== "center") {
    bonus += 0.08;
  }
  if (lastZone.row === currentZone.row) {
    bonus += 0.05;
  }
  return bonus;
}

function resolveKeeperPrediction(history, attemptsTaken, sample = true) {
  const adaptation = clamp(0.18 + (attemptsTaken / TOTAL_PENALTIES) * 0.74, 0.18, 0.96);
  const frequency = computeFrequencyScores(history);
  const previousZoneId = history.length ? history[history.length - 1].zoneId : null;
  const transitions = computeTransitionScores(history, previousZoneId);
  const tendencyZone = findTendencyZone(history);
  const predictability = computePredictability(history);
  const learningIndex = clamp(adaptation * 0.57 + predictability * 0.43, 0.1, 0.99);
  const scores = createZoneMap(0);
  for (const zoneId of ZONE_IDS) {
    let score = 0.12;
    score += frequency[zoneId] * (0.34 + adaptation * 0.3);
    score += transitions[zoneId] * (0.24 + adaptation * 0.23);
    score += patternBonus(history, zoneId) * (0.36 + adaptation * 0.2);
    if (tendencyZone && tendencyZone === zoneId) {
      score += 0.12 * learningIndex;
    }
    if (previousZoneId && previousZoneId === zoneId) {
      score += 0.06 * adaptation;
    }
    scores[zoneId] = score;
  }

  const ordered = [...ZONE_IDS].sort((left, right) => scores[right] - scores[left]);
  const topScore = scores[ordered[0]];
  const secondScore = scores[ordered[1]] ?? topScore;
  const confidenceGap = (topScore - secondScore) / Math.max(topScore, 0.001);
  const confidence = clamp(0.2 + confidenceGap * 0.68 + adaptation * 0.2, 0.12, 0.99);
  const noiseAmplitude = sample ? lerp(0.24, 0.04, adaptation) : 0;

  let predictedZoneId = ordered[0];
  if (noiseAmplitude > 0) {
    let bestNoisyScore = -Infinity;
    for (const zoneId of ZONE_IDS) {
      const noisyScore = scores[zoneId] + randomBetween(-noiseAmplitude, noiseAmplitude);
      if (noisyScore > bestNoisyScore) {
        bestNoisyScore = noisyScore;
        predictedZoneId = zoneId;
      }
    }
  }

  const reactionMs = Math.round(
    clamp(
      340 - adaptation * 124 - learningIndex * 94 - confidence * 68 + (sample ? randomBetween(-18, 18) : 0),
      96,
      360
    )
  );
  const diveDurationMs = Math.round(clamp(512 - adaptation * 132 - confidence * 74, 210, 520));
  const reachPx = clamp(74 + learningIndex * 64 + adaptation * 46 + confidence * 26, 70, 188);

  return {
    predictedZoneId,
    tendencyZone,
    adaptation,
    confidence,
    learningIndex,
    reactionMs,
    diveDurationMs,
    reachPx,
    scores,
  };
}

function zoneDistance(zoneAId, zoneBId) {
  const zoneA = ZONE_BY_ID[zoneAId];
  const zoneB = ZONE_BY_ID[zoneBId];
  if (!zoneA || !zoneB) {
    return 3;
  }
  return Math.abs(zoneA.col - zoneB.col) + Math.abs(zoneA.row - zoneB.row);
}

function quadraticPoint(start, control, end, t) {
  const clamped = clamp(t, 0, 1);
  const oneMinusT = 1 - clamped;
  const x =
    oneMinusT * oneMinusT * start.x +
    2 * oneMinusT * clamped * control.x +
    clamped * clamped * end.x;
  const y =
    oneMinusT * oneMinusT * start.y +
    2 * oneMinusT * clamped * control.y +
    clamped * clamped * end.y;
  return { x, y };
}

function keeperDiveX(zoneId) {
  const zone = ZONE_BY_ID[zoneId];
  if (!zone) {
    return GOAL_CENTER_X;
  }
  if (zone.side === "center") {
    return GOAL_CENTER_X;
  }
  const direction = zone.side === "left" ? -1 : 1;
  if (zone.row === 0) {
    const topDiveOffset = GOAL_FRAME.w * 0.19;
    return clamp(GOAL_CENTER_X + direction * topDiveOffset, GOAL_FRAME.x + 72, GOAL_FRAME.x + GOAL_FRAME.w - 72);
  }
  // Ground dives stay centered so the stretched body can cover center -> post without clipping.
  return GOAL_CENTER_X;
}

function saveProbabilityForShot(zoneId, prediction, history) {
  const distance = zoneDistance(zoneId, prediction.predictedZoneId);
  const zone = ZONE_BY_ID[zoneId];
  const baseByDistance = distance === 0 ? 0.35 : distance === 1 ? 0.23 : distance === 2 ? 0.14 : 0.08;
  const heightModifier = zone?.row === 0 ? -0.08 : zoneId === "center" ? 0.07 : -0.015;
  const repeatedZone = history.length > 0 && history[history.length - 1].zoneId === zoneId;
  const repetitionBonus = repeatedZone ? 0.1 * prediction.learningIndex : 0;
  const tendencyBonus = prediction.tendencyZone === zoneId ? 0.07 * prediction.adaptation : 0;
  const trackingBonus = prediction.learningIndex * 0.24 + prediction.confidence * 0.16 + prediction.adaptation * 0.14;
  const strikeVariance = randomBetween(-0.085, 0.08);
  return clamp(
    baseByDistance + heightModifier + repetitionBonus + tendencyBonus + trackingBonus - strikeVariance,
    0.05,
    0.9
  );
}

function createShot(state, zoneId) {
  const zone = ZONE_BY_ID[zoneId];
  if (!zone) {
    return null;
  }

  const prediction = resolveKeeperPrediction(state.history, state.attemptsTaken, true);
  // Deterministic local fallback, aligned with backend: exact read means save.
  const isSave = prediction.predictedZoneId === zoneId;
  const saveProbability = isSave ? 1 : 0;
  const shotPower =
    zone.row === 0
      ? randomBetween(0.8, 1)
      : zoneId === "center"
        ? randomBetween(0.62, 0.84)
        : randomBetween(0.69, 0.92);
  const targetX = zone.target.x + randomBetween(-16, 16);
  const targetY = zone.target.y + randomBetween(zone.row === 0 ? -8 : -6, zone.row === 0 ? 10 : 14);
  const curveDirection = zone.side === "left" ? -1 : zone.side === "right" ? 1 : 0;
  const controlX = lerp(PENALTY_SPOT.x, targetX, 0.5) + curveDirection * randomBetween(24, 54) + randomBetween(-10, 10);
  const arcLift = zone.row === 0 ? randomBetween(-206, -154) : randomBetween(-138, -94);
  const controlY = Math.min(PENALTY_SPOT.y - 40, lerp(PENALTY_SPOT.y, targetY, 0.48) + arcLift);
  const durationMs = Math.round(clamp(990 - shotPower * 410 + randomBetween(-36, 54), 480, 960));
  const interceptT = clamp(0.68 + prediction.confidence * 0.13 + prediction.learningIndex * 0.08, 0.66, 0.9);
  const interceptPoint = quadraticPoint(PENALTY_SPOT, { x: controlX, y: controlY }, { x: targetX, y: targetY }, interceptT);
  const reboundDistance = randomBetween(136, 232);
  const reboundAngle =
    zone.side === "left" ? randomBetween(-0.58, -0.18) : zone.side === "right" ? randomBetween(0.18, 0.58) : randomBetween(-0.22, 0.22);
  const reboundPoint = {
    x: clamp(interceptPoint.x + Math.sin(reboundAngle) * reboundDistance, GOAL_FRAME.x - 32, GOAL_FRAME.x + GOAL_FRAME.w + 32),
    y: clamp(interceptPoint.y + randomBetween(78, 170), GOAL_FRAME.y + GOAL_FRAME.h - 12, PENALTY_SPOT.y - 24),
  };

  return {
    shotNumber: state.attemptsTaken + 1,
    zoneId,
    start: { ...PENALTY_SPOT },
    target: { x: targetX, y: targetY },
    control: { x: controlX, y: controlY },
    elapsedMs: 0,
    durationMs,
    totalMs: durationMs + (isSave ? 330 : 260),
    interceptT,
    interceptPoint,
    reboundPoint,
    shotPower,
    ball: {
      x: PENALTY_SPOT.x,
      y: PENALTY_SPOT.y,
      rotation: 0,
      trail: [],
    },
    keeper: {
      x: GOAL_CENTER_X,
      y: KEEPER_BASE_Y,
      predictedZoneId: prediction.predictedZoneId,
      tendencyZone: prediction.tendencyZone,
      confidence: prediction.confidence,
      adaptation: prediction.adaptation,
      learningIndex: prediction.learningIndex,
      reactionMs: prediction.reactionMs,
      diveDurationMs: prediction.diveDurationMs,
      reachPx: prediction.reachPx,
      targetX: keeperDiveX(prediction.predictedZoneId),
      stretch: 1,
      lift: 0,
    },
    outcome: {
      type: isSave ? "SAVE" : "GOAL",
      isSave,
      saveProbability,
      settled: false,
    },
    impactTriggered: false,
  };
}

function baseTelemetry() {
  return {
    adaptation: 0.18,
    confidence: 0.18,
    learningIndex: 0.14,
    tendencyZone: null,
    predictedZoneId: null,
    saveProbability: 0,
  };
}

function createInitialState(locale) {
  return {
    locale,
    phase: "menu",
    attemptsTaken: 0,
    goals: 0,
    saves: 0,
    history: [],
    activeShot: null,
    intermissionMs: 0,
    message: "",
    aiTelemetry: baseTelemetry(),
    netRippleMs: 0,
    cameraShakeMs: 0,
    crowdPulseMs: 0,
  };
}

function beginShootout(state) {
  const next = createInitialState(state.locale);
  const read = resolveKeeperPrediction([], 0, false);
  next.phase = "ready";
  next.aiTelemetry = {
    adaptation: read.adaptation,
    confidence: read.confidence,
    learningIndex: read.learningIndex,
    tendencyZone: read.tendencyZone,
    predictedZoneId: read.predictedZoneId,
    saveProbability: 0,
  };
  return next;
}

function settleShot(state) {
  if (!state.activeShot || state.activeShot.outcome.settled) {
    return state;
  }
  const shot = state.activeShot;
  const isSave = isSaveOutcome(shot.outcome);
  const attemptsTaken = state.attemptsTaken + 1;
  const historyEntry = {
    attempt: shot.shotNumber,
    zoneId: shot.zoneId,
    keeperZoneId: shot.keeper.predictedZoneId,
    result: isSave ? "SAVE" : "GOAL",
    saveProbability: shot.outcome.saveProbability,
    confidence: shot.keeper.confidence,
    adaptation: shot.keeper.adaptation,
  };
  const nextHistory = [...state.history, historyEntry];
  const completed = attemptsTaken >= TOTAL_PENALTIES;

  return {
    ...state,
    phase: completed ? "finished" : "intermission",
    attemptsTaken,
    goals: state.goals + (isSave ? 0 : 1),
    saves: state.saves + (isSave ? 1 : 0),
    history: nextHistory,
    intermissionMs: completed ? 0 : 880,
    activeShot: null,
    aiTelemetry: {
      adaptation: shot.keeper.adaptation,
      confidence: shot.keeper.confidence,
      learningIndex: shot.keeper.learningIndex,
      tendencyZone: shot.keeper.tendencyZone,
      predictedZoneId: shot.keeper.predictedZoneId,
      saveProbability: shot.outcome.saveProbability,
    },
    crowdPulseMs: isSave ? 300 : 420,
    cameraShakeMs: isSave ? 200 : 160,
    netRippleMs: isSave ? state.netRippleMs : 520,
  };
}

function launchShot(state, zoneId) {
  if (state.phase !== "ready") {
    return state;
  }
  const shot = createShot(state, zoneId);
  if (!shot) {
    return state;
  }

  return {
    ...state,
    phase: "shot",
    activeShot: shot,
    aiTelemetry: {
      adaptation: shot.keeper.adaptation,
      confidence: shot.keeper.confidence,
      learningIndex: shot.keeper.learningIndex,
      tendencyZone: shot.keeper.tendencyZone,
      predictedZoneId: shot.keeper.predictedZoneId,
      saveProbability: shot.outcome.saveProbability,
    },
  };
}

function updateActiveShot(shot, deltaMs) {
  const elapsedMs = Math.min(shot.totalMs, shot.elapsedMs + deltaMs);
  const flightRaw = clamp(elapsedMs / shot.durationMs, 0, 1);
  const flightT = easeOutCubic(flightRaw);
  const isSave = isSaveOutcome(shot.outcome);
  let ballX;
  let ballY;

  if (isSave && flightRaw >= shot.interceptT) {
    const localT = clamp((flightRaw - shot.interceptT) / (1 - shot.interceptT), 0, 1);
    ballX = lerp(shot.interceptPoint.x, shot.reboundPoint.x, easeOutCubic(localT));
    ballY = lerp(shot.interceptPoint.y, shot.reboundPoint.y, easeInOutSine(localT));
  } else {
    const point = quadraticPoint(shot.start, shot.control, shot.target, flightT);
    ballX = point.x;
    ballY = point.y;
  }

  const keeperElapsed = Math.max(0, elapsedMs - shot.keeper.reactionMs);
  const keeperT = clamp(keeperElapsed / shot.keeper.diveDurationMs, 0, 1);
  const keeperEase = easeOutCubic(keeperT);
  const keeperX = lerp(GOAL_CENTER_X, shot.keeper.targetX, keeperEase);
  const keeperZone = ZONE_BY_ID[shot.keeper.predictedZoneId] ?? null;
  const liftFactor = Math.sin(Math.PI * keeperT);
  const keeperLiftPeak = keeperZone?.side === "center" ? 16 : keeperZone?.row === 0 ? 52 : 10;
  const keeperLift = liftFactor * keeperLiftPeak;
  const keeperStretch = 1 + keeperEase * 0.46 + shot.keeper.learningIndex * 0.12;
  const rotationStep = (0.045 + shot.shotPower * 0.07) * (deltaMs / 16.67);
  const fadedTrail = shot.ball.trail.map((entry) => ({
    ...entry,
    alpha: Math.max(0, entry.alpha - deltaMs / 290),
  }));
  const compactTrail = [...fadedTrail, { x: ballX, y: ballY, alpha: 1 }].slice(-20);

  return {
    ...shot,
    elapsedMs,
    ball: {
      x: ballX,
      y: ballY,
      rotation: shot.ball.rotation + rotationStep,
      trail: compactTrail,
    },
    keeper: {
      ...shot.keeper,
      x: keeperX,
      y: KEEPER_BASE_Y,
      lift: keeperLift,
      stretch: keeperStretch,
    },
  };
}

function tickGame(state, deltaMs) {
  const safeDeltaMs = clamp(deltaMs, 0, MAX_DELTA_MS);
  if (safeDeltaMs <= 0) {
    return state;
  }

  let next = state;
  let changed = false;

  if (next.netRippleMs > 0) {
    next = { ...next, netRippleMs: Math.max(0, next.netRippleMs - safeDeltaMs * 1.25) };
    changed = true;
  }
  if (next.cameraShakeMs > 0) {
    next = { ...next, cameraShakeMs: Math.max(0, next.cameraShakeMs - safeDeltaMs) };
    changed = true;
  }
  if (next.crowdPulseMs > 0) {
    next = { ...next, crowdPulseMs: Math.max(0, next.crowdPulseMs - safeDeltaMs) };
    changed = true;
  }

  if (next.phase === "shot" && next.activeShot) {
    const updatedShot = updateActiveShot(next.activeShot, safeDeltaMs);
    next = {
      ...next,
      activeShot: updatedShot,
    };
    changed = true;

    const isSave = isSaveOutcome(updatedShot.outcome);
    const triggerPoint = isSave ? updatedShot.durationMs * updatedShot.interceptT : updatedShot.durationMs * 0.95;
    if (!updatedShot.impactTriggered && updatedShot.elapsedMs >= triggerPoint) {
      next = {
        ...next,
        activeShot: { ...updatedShot, impactTriggered: true },
        cameraShakeMs: isSave ? 220 : Math.max(next.cameraShakeMs, 160),
        netRippleMs: isSave ? next.netRippleMs : 540,
        crowdPulseMs: isSave ? 340 : 460,
      };
    }

    if (updatedShot.elapsedMs >= updatedShot.totalMs) {
      next = settleResolvedShot(next);
    }
  } else if (next.phase === "intermission") {
    const remainingMs = next.intermissionMs - safeDeltaMs;
    if (remainingMs > 0) {
      next = {
        ...next,
        intermissionMs: remainingMs,
      };
      changed = true;
    } else {
      next = {
        ...next,
        phase: "ready",
        intermissionMs: 0,
        message: "",
      };
      changed = true;
    }
  }

  return changed ? next : state;
}

function runTime(state, milliseconds) {
  let next = state;
  let remaining = Math.max(0, Number(milliseconds) || 0);
  while (remaining > 0) {
    const step = Math.min(FIXED_STEP_MS, remaining);
    next = tickGame(next, step);
    remaining -= step;
  }
  return next;
}

function hexToRgb(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().replace(/^#/, "");
  if (![3, 6].includes(normalized.length)) {
    return null;
  }
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character + character)
          .join("")
      : normalized;
  const parsed = Number.parseInt(expanded, 16);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

function mixHexColors(colorA, colorB, weight = 0.5) {
  const rgbA = hexToRgb(colorA);
  const rgbB = hexToRgb(colorB);
  if (!rgbA && !rgbB) {
    return "#ffffff";
  }
  if (!rgbA) {
    return colorB;
  }
  if (!rgbB) {
    return colorA;
  }
  const amount = clamp(weight, 0, 1);
  const mix = (channelA, channelB) => Math.round(channelA + (channelB - channelA) * amount);
  return `rgb(${mix(rgbA.r, rgbB.r)}, ${mix(rgbA.g, rgbB.g)}, ${mix(rgbA.b, rgbB.b)})`;
}

function colorWithAlpha(color, alpha) {
  const rgb = hexToRgb(color);
  if (!rgb) {
    return color;
  }
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(alpha, 0, 1)})`;
}

function pathRoundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.max(0, Math.min(radius, width * 0.5, height * 0.5));
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function buildCanvasDots(history) {
  const rows = {
    PLAYER: [],
    RIVAL: [],
  };
  for (const entry of history ?? []) {
    if (entry.actor !== "PLAYER" && entry.actor !== "RIVAL") {
      continue;
    }
    if (rows[entry.actor].length >= 5) {
      continue;
    }
    rows[entry.actor].push(entry.result);
  }
  return rows;
}

function dotColorForResult(result) {
  const normalizedResult = normalizeResultCode(result);
  if (normalizedResult === "GOAL") {
    return "#22c55e";
  }
  if (normalizedResult === "SAVE") {
    return "#ef4444";
  }
  if (normalizedResult === "MISS" || normalizedResult === "POST") {
    return "#ef4444";
  }
  return "#334155";
}

function drawBannerPanel(ctx, { x, y, width, height, title, subtitle, accent, primary }) {
  const background = ctx.createLinearGradient(x, y, x, y + height);
  background.addColorStop(0, mixHexColors(primary, "#0f172a", 0.18));
  background.addColorStop(1, mixHexColors(primary, "#020617", 0.72));
  ctx.fillStyle = background;
  pathRoundedRect(ctx, x, y, width, height, 10);
  ctx.fill();

  ctx.strokeStyle = colorWithAlpha("#f8fafc", 0.2);
  ctx.lineWidth = 1.5;
  pathRoundedRect(ctx, x + 1, y + 1, width - 2, height - 2, 9);
  ctx.stroke();

  ctx.fillStyle = colorWithAlpha(accent, 0.92);
  ctx.font = "900 18px 'Trebuchet MS', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, x + width * 0.5, y + 21);

  ctx.fillStyle = colorWithAlpha("#f8fafc", 0.88);
  ctx.font = "700 11px 'Trebuchet MS', sans-serif";
  ctx.fillText(subtitle, x + width * 0.5, y + 39);
}

function drawPitch(ctx, game) {
  const rivalPrimary = game.rivalTeam?.colors?.primary ?? "#1e3a5f";
  const rivalSecondary = game.rivalTeam?.colors?.secondary ?? "#7dd3fc";
  const rivalAccent = game.rivalTeam?.colors?.accent ?? "#f59e0b";

  const skyGradient = ctx.createLinearGradient(0, 0, 0, 240);
  skyGradient.addColorStop(0, mixHexColors(rivalPrimary, "#dbeafe", 0.82));
  skyGradient.addColorStop(0.52, mixHexColors(rivalSecondary, "#bfdbfe", 0.68));
  skyGradient.addColorStop(1, mixHexColors(rivalPrimary, "#1d3557", 0.42));
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, 220);

  const haze = ctx.createRadialGradient(CANVAS_WIDTH * 0.72, 72, 20, CANVAS_WIDTH * 0.72, 72, 250);
  haze.addColorStop(0, "rgba(255, 232, 158, 0.82)");
  haze.addColorStop(0.38, "rgba(255, 232, 158, 0.26)");
  haze.addColorStop(1, "rgba(255, 232, 158, 0)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, CANVAS_WIDTH, 220);

  ctx.fillStyle = "rgba(14, 31, 57, 0.24)";
  ctx.fillRect(0, 34, CANVAS_WIDTH, 74);
  ctx.strokeStyle = "rgba(214, 233, 255, 0.2)";
  ctx.lineWidth = 1;
  for (let x = -20; x <= CANVAS_WIDTH + 20; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 24);
    ctx.lineTo(x + 12, 144);
    ctx.stroke();
  }
  for (let y = 36; y <= 132; y += 18) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#88402b";
  ctx.fillRect(0, 122, CANVAS_WIDTH, 70);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
  for (let y = 140; y <= 192; y += 18) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
  for (let x = 0; x <= CANVAS_WIDTH; x += 42) {
    const offset = (Math.floor(x / 42) % 2) * 18;
    ctx.beginPath();
    ctx.moveTo(x, 122);
    ctx.lineTo(x, 156 - offset);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 21, 156 - offset);
    ctx.lineTo(x + 21, 192);
    ctx.stroke();
  }

  drawBannerPanel(ctx, {
    x: 32,
    y: 130,
    width: 220,
    height: 50,
    title: "PENALTY LAB",
    subtitle: game.rivalTeam?.displayName ?? "RIVAL CLUB",
    accent: rivalAccent,
    primary: rivalPrimary,
  });
  drawBannerPanel(ctx, {
    x: CANVAS_WIDTH * 0.5 - 144,
    y: 126,
    width: 288,
    height: 58,
    title: game.scoreboard?.suddenDeath ? "SUDDEN DEATH" : "AI KEEPER",
    subtitle: game.scoreboard?.suddenDeath
      ? "ONE SHOT DECIDES IT"
      : `${game.rivalTeam?.shortName ?? "RIV"} READS PATTERNS`,
    accent: "#fbbf24",
    primary: mixHexColors(rivalPrimary, "#172554", 0.4),
  });
  drawBannerPanel(ctx, {
    x: CANVAS_WIDTH - 252,
    y: 130,
    width: 220,
    height: 50,
    title: "ROUND " + String(game.scoreboard?.round ?? 1),
    subtitle: game.selectedDifficultyId?.toUpperCase?.() ?? "COMPETITIVE",
    accent: rivalSecondary,
    primary: rivalPrimary,
  });

  const crowdGradient = ctx.createLinearGradient(0, 188, 0, 224);
  crowdGradient.addColorStop(0, "rgba(7, 18, 35, 0.92)");
  crowdGradient.addColorStop(1, "rgba(14, 31, 57, 0.65)");
  ctx.fillStyle = crowdGradient;
  ctx.fillRect(0, 188, CANVAS_WIDTH, 42);
  for (let index = 0; index < 46; index += 1) {
    const x = 18 + index * 24;
    const height = 8 + (index % 4) * 4;
    ctx.fillStyle = index % 2 === 0 ? "rgba(248, 250, 252, 0.16)" : colorWithAlpha(rivalAccent, 0.2);
    ctx.beginPath();
    ctx.arc(x, 214 - height * 0.4, 7, Math.PI, 0);
    ctx.fill();
  }

  const pitchTop = 220;
  const fieldGradient = ctx.createLinearGradient(0, pitchTop, 0, CANVAS_HEIGHT);
  fieldGradient.addColorStop(0, "#3ba74b");
  fieldGradient.addColorStop(0.55, "#257c39");
  fieldGradient.addColorStop(1, "#174f29");
  ctx.fillStyle = fieldGradient;
  ctx.fillRect(0, pitchTop, CANVAS_WIDTH, CANVAS_HEIGHT - pitchTop);

  const stripeHeight = (CANVAS_HEIGHT - pitchTop) / 10;
  for (let index = 0; index < 10; index += 1) {
    ctx.fillStyle = index % 2 === 0 ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.07)";
    ctx.fillRect(0, pitchTop + index * stripeHeight, CANVAS_WIDTH, stripeHeight);
  }

  const fieldShadow = ctx.createLinearGradient(0, pitchTop, 0, CANVAS_HEIGHT);
  fieldShadow.addColorStop(0, "rgba(0, 0, 0, 0)");
  fieldShadow.addColorStop(1, "rgba(0, 0, 0, 0.18)");
  ctx.fillStyle = fieldShadow;
  ctx.fillRect(0, pitchTop, CANVAS_WIDTH, CANVAS_HEIGHT - pitchTop);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.38)";
  ctx.lineWidth = 4;
  ctx.strokeRect(124, 212, CANVAS_WIDTH - 248, CANVAS_HEIGHT - 248);
  ctx.lineWidth = 3;
  ctx.strokeRect(248, 160, CANVAS_WIDTH - 496, 206);
  ctx.lineWidth = 2;
  ctx.strokeRect(372, 160, CANVAS_WIDTH - 744, 88);

  ctx.beginPath();
  ctx.arc(PENALTY_SPOT.x, PENALTY_SPOT.y, 8, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(PENALTY_SPOT.x, PENALTY_SPOT.y - 76, 84, Math.PI * 0.17, Math.PI * 0.83);
  ctx.stroke();
}

function drawGoal(ctx, game) {
  const rippleStrength = clamp(game.netRippleMs / 540, 0, 1);
  const rippleWave = Math.sin((performance.now() / 1000) * 8.5) * rippleStrength * 6;
  const depth = 38;

  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.beginPath();
  ctx.ellipse(GOAL_CENTER_X, GOAL_FRAME.y + GOAL_FRAME.h + 18, GOAL_FRAME.w * 0.56, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(236, 244, 255, 0.18)";
  ctx.beginPath();
  ctx.moveTo(GOAL_FRAME.x + 8, GOAL_FRAME.y - 12);
  ctx.lineTo(GOAL_FRAME.x - depth, GOAL_FRAME.y + 6);
  ctx.lineTo(GOAL_FRAME.x - depth, GOAL_FRAME.y + GOAL_FRAME.h + 18);
  ctx.lineTo(GOAL_FRAME.x + 8, GOAL_FRAME.y + GOAL_FRAME.h + 4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(GOAL_FRAME.x + GOAL_FRAME.w - 8, GOAL_FRAME.y - 12);
  ctx.lineTo(GOAL_FRAME.x + GOAL_FRAME.w + depth, GOAL_FRAME.y + 6);
  ctx.lineTo(GOAL_FRAME.x + GOAL_FRAME.w + depth, GOAL_FRAME.y + GOAL_FRAME.h + 18);
  ctx.lineTo(GOAL_FRAME.x + GOAL_FRAME.w - 8, GOAL_FRAME.y + GOAL_FRAME.h + 4);
  ctx.closePath();
  ctx.fill();

  const frameGradient = ctx.createLinearGradient(GOAL_FRAME.x, GOAL_FRAME.y, GOAL_FRAME.x + GOAL_FRAME.w, GOAL_FRAME.y);
  frameGradient.addColorStop(0, "#d9e5f2");
  frameGradient.addColorStop(0.5, "#ffffff");
  frameGradient.addColorStop(1, "#c7d3df");
  ctx.fillStyle = frameGradient;
  ctx.fillRect(GOAL_FRAME.x - 10, GOAL_FRAME.y - 16, GOAL_FRAME.w + 20, 14);
  ctx.fillRect(GOAL_FRAME.x - 10, GOAL_FRAME.y - 16, 12, GOAL_FRAME.h + 28);
  ctx.fillRect(GOAL_FRAME.x + GOAL_FRAME.w - 2, GOAL_FRAME.y - 16, 12, GOAL_FRAME.h + 28);

  ctx.save();
  ctx.beginPath();
  ctx.rect(GOAL_FRAME.x + 6, GOAL_FRAME.y + 2, GOAL_FRAME.w - 12, GOAL_FRAME.h - 4);
  ctx.clip();

  const netBackground = ctx.createLinearGradient(0, GOAL_FRAME.y, 0, GOAL_FRAME.y + GOAL_FRAME.h);
  netBackground.addColorStop(0, "#f5f7fb");
  netBackground.addColorStop(1, "#d7e2f0");
  ctx.fillStyle = netBackground;
  ctx.fillRect(GOAL_FRAME.x + 6, GOAL_FRAME.y + 2, GOAL_FRAME.w - 12, GOAL_FRAME.h - 4);

  ctx.strokeStyle = "rgba(79, 104, 138, 0.46)";
  ctx.lineWidth = 1.4;
  for (let x = GOAL_FRAME.x + 8; x <= GOAL_FRAME.x + GOAL_FRAME.w - 8; x += 28) {
    const offset = rippleWave * Math.sin((x - GOAL_FRAME.x) / 46);
    ctx.beginPath();
    ctx.moveTo(x + offset, GOAL_FRAME.y + 2);
    ctx.lineTo(x - offset, GOAL_FRAME.y + GOAL_FRAME.h - 2);
    ctx.stroke();
  }
  for (let y = GOAL_FRAME.y + 8; y <= GOAL_FRAME.y + GOAL_FRAME.h - 8; y += 18) {
    const offset = rippleWave * Math.cos((y - GOAL_FRAME.y) / 42);
    ctx.beginPath();
    ctx.moveTo(GOAL_FRAME.x + 6, y + offset);
    ctx.lineTo(GOAL_FRAME.x + GOAL_FRAME.w - 6, y - offset);
    ctx.stroke();
  }
  ctx.restore();

  const topShade = ctx.createLinearGradient(0, GOAL_FRAME.y - 20, 0, GOAL_FRAME.y + GOAL_FRAME.h + 40);
  topShade.addColorStop(0, "rgba(0, 0, 0, 0.28)");
  topShade.addColorStop(0.4, "rgba(0, 0, 0, 0.08)");
  topShade.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = topShade;
  ctx.fillRect(GOAL_FRAME.x - 32, GOAL_FRAME.y - 20, GOAL_FRAME.w + 64, GOAL_FRAME.h + 68);
}

function drawFigureGlow(ctx, x, y, radiusX, radiusY, color, alpha = 0.22) {
  const glow = ctx.createRadialGradient(x, y, 16, x, y, Math.max(radiusX, radiusY));
  glow.addColorStop(0, colorWithAlpha(color, alpha));
  glow.addColorStop(0.42, colorWithAlpha(color, alpha * 0.35));
  glow.addColorStop(1, colorWithAlpha(color, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawKeeper(ctx, keeper, rivalTeam) {
  const zone = ZONE_BY_ID[keeper.predictedZoneId] ?? null;
  const lateralOffset = keeper.x - GOAL_CENTER_X;
  const diveTilt = lateralOffset / 300;
  const diveProgress = clamp(Math.max(Math.abs(lateralOffset) / 176, keeper.lift / 26), 0, 1);
  const direction = zone?.side === "right" ? 1 : -1;
  const committed = zone && zone.side !== "center" && (Math.abs(lateralOffset) > 6 || keeper.lift > 4);
  const pose = !committed || !zone || zone.side === "center" ? "set" : zone.row === 0 ? "high" : "low";

  const glowColor = rivalTeam?.colors?.accent ?? rivalTeam?.colors?.primary ?? "#0ea5e9";
  const jerseyColor = rivalTeam?.uniform?.shirt ?? rivalTeam?.colors?.primary ?? "#163b71";
  const shortsColor = rivalTeam?.uniform?.shorts ?? "#0b1220";
  const socksColor = rivalTeam?.uniform?.socks ?? "#e2e8f0";
  const trimColor = rivalTeam?.colors?.secondary ?? "#f8fafc";
  const gloveColor = "#f8fafc";
  const skinColor = "#e6bf98";
  const outlineColor = "#05070c";
  const goalClipInset = 6;

  const drawLimb = (x1, y1, x2, y2, width, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  const drawGlove = (x, y, radius = 6) => {
    ctx.fillStyle = gloveColor;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = colorWithAlpha(outlineColor, 0.28);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  };

  const drawHead = (x, y, radius) => {
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = outlineColor;
    pathRoundedRect(ctx, x - radius * 0.7, y - radius - 4, radius * 1.4, 6, 3);
    ctx.fill();
  };

  const drawTorso = (x, y, width, height) => {
    const corner = Math.min(16, height * 0.33);
    ctx.fillStyle = jerseyColor;
    pathRoundedRect(ctx, x, y, width, height, corner);
    ctx.fill();

    ctx.strokeStyle = colorWithAlpha(outlineColor, 0.35);
    ctx.lineWidth = 1.8;
    pathRoundedRect(ctx, x + 0.6, y + 0.6, width - 1.2, height - 1.2, Math.max(3, corner - 1));
    ctx.stroke();

    ctx.strokeStyle = colorWithAlpha(trimColor, 0.5);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x + width * 0.28, y + 5);
    ctx.lineTo(x + width * 0.5, y + height - 7);
    ctx.lineTo(x + width * 0.72, y + 5);
    ctx.stroke();
  };

  ctx.save();
  // Keep the goalkeeper silhouette inside the goal's lateral bounds at all times.
  ctx.beginPath();
  ctx.rect(GOAL_FRAME.x + goalClipInset, 0, GOAL_FRAME.w - goalClipInset * 2, CANVAS_HEIGHT);
  ctx.clip();
  ctx.translate(keeper.x, keeper.y - keeper.lift + 6);
  ctx.rotate(diveTilt * 0.1);

  drawFigureGlow(ctx, 0, -26, pose === "set" ? 88 : 110, 120, glowColor, 0.18);

  const shadowShift = pose === "set" ? 0 : direction * (8 + diveProgress * 14);
  const shadowScale = pose === "set" ? 1 : 1 + diveProgress * 0.24;
  const goalInnerLeft = GOAL_FRAME.x + goalClipInset + 8;
  const goalInnerRight = GOAL_FRAME.x + GOAL_FRAME.w - goalClipInset - 8;
  const availableToPost = direction === 1 ? goalInnerRight - keeper.x : keeper.x - goalInnerLeft;
  const safeReach = clamp(availableToPost, 60, GOAL_FRAME.w * 0.5 - 10);
  ctx.fillStyle = "rgba(1, 6, 16, 0.25)";
  ctx.beginPath();
  ctx.ellipse(shadowShift, 42 + diveProgress * 2, 66 * shadowScale, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  if (pose === "set") {
    drawTorso(-26, -86, 52, 58);

    ctx.fillStyle = shortsColor;
    pathRoundedRect(ctx, -24, -32, 48, 16, 8);
    ctx.fill();

    drawHead(0, -104, 18);

    drawLimb(-16, -58, -62, -20, 12, jerseyColor);
    drawLimb(16, -58, 62, -20, 12, jerseyColor);
    drawLimb(-12, -18, -28, 34, 11, socksColor);
    drawLimb(12, -18, 28, 34, 11, socksColor);

    drawGlove(-62, -20, 6);
    drawGlove(62, -20, 6);

    ctx.fillStyle = outlineColor;
    ctx.beginPath();
    ctx.ellipse(-30, 38, 16, 6, 0.08, 0, Math.PI * 2);
    ctx.ellipse(30, 38, 16, 6, -0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    return;
  }

  const swing = easeOutCubic(diveProgress);
  if (pose === "high") {
    const coreStartX = -direction * lerp(48, 62, swing);
    const coreStartY = lerp(16, 8, swing);
    const highReach = Math.min(safeReach, lerp(126, 152, swing));
    const coreEndX = direction * highReach;
    const coreEndY = lerp(-100, -132, swing);
    const coreDx = coreEndX - coreStartX;
    const coreDy = coreEndY - coreStartY;
    const coreLength = Math.max(1, Math.hypot(coreDx, coreDy));
    const ux = coreDx / coreLength;
    const uy = coreDy / coreLength;
    const px = -uy;
    const py = ux;

    const torsoCenterX = coreStartX + coreDx * 0.52;
    const torsoCenterY = coreStartY + coreDy * 0.52;
    ctx.save();
    ctx.translate(torsoCenterX, torsoCenterY);
    ctx.rotate(Math.atan2(coreDy, coreDx));
    drawTorso(-38, -11, 76, 22);
    ctx.fillStyle = shortsColor;
    pathRoundedRect(ctx, -18, -10, 36, 12, 6);
    ctx.fill();
    ctx.restore();

    const headX = coreStartX + coreDx * 0.72 + px * 8;
    const headY = coreStartY + coreDy * 0.72 + py * 8;
    drawHead(headX, headY, 12);

    const shoulderLeadX = coreStartX + coreDx * 0.62 + px * 6;
    const shoulderLeadY = coreStartY + coreDy * 0.62 + py * 6;
    const shoulderSupportX = coreStartX + coreDx * 0.54 - px * 6;
    const shoulderSupportY = coreStartY + coreDy * 0.54 - py * 6;
    const leadArmX = coreEndX + px * 2;
    const leadArmY = coreEndY + py * 2;
    const supportArmX = coreStartX + coreDx * 0.93 - px * 12;
    const supportArmY = coreStartY + coreDy * 0.93 - py * 12;
    const hipsX = coreStartX + coreDx * 0.36 - px * 2;
    const hipsY = coreStartY + coreDy * 0.36 - py * 2;
    const backLegX = coreStartX + coreDx * 0.14 - px * 14;
    const backLegY = coreStartY + coreDy * 0.14 - py * 14;
    const frontLegX = coreStartX + coreDx * 0.18 + px * 10;
    const frontLegY = coreStartY + coreDy * 0.18 + py * 10;

    drawLimb(shoulderLeadX, shoulderLeadY, leadArmX, leadArmY, 11, jerseyColor);
    drawLimb(shoulderSupportX, shoulderSupportY, supportArmX, supportArmY, 10, jerseyColor);
    drawLimb(hipsX, hipsY, backLegX, backLegY, 10, socksColor);
    drawLimb(hipsX - px * 3, hipsY - py * 3, frontLegX, frontLegY, 10, socksColor);

    drawGlove(leadArmX, leadArmY, 6);
    drawGlove(supportArmX, supportArmY, 5);

    ctx.fillStyle = outlineColor;
    ctx.beginPath();
    ctx.ellipse(backLegX, backLegY + 3, 12, 5, 0.11 * direction, 0, Math.PI * 2);
    ctx.ellipse(frontLegX, frontLegY + 3, 11, 5, -0.08 * direction, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const lowReach = Math.min(safeReach, lerp(146, 224, swing));
    const coreStartX = -direction * 12;
    const coreStartY = lerp(10, 14, swing);
    const coreEndX = direction * lowReach;
    const coreEndY = lerp(14, 20, swing);
    const coreDx = coreEndX - coreStartX;
    const coreDy = coreEndY - coreStartY;
    const coreLength = Math.max(1, Math.hypot(coreDx, coreDy));
    const ux = coreDx / coreLength;
    const uy = coreDy / coreLength;
    const px = -uy;
    const py = ux;

    const torsoCenterX = coreStartX + coreDx * 0.44;
    const torsoCenterY = coreStartY + coreDy * 0.44;
    ctx.save();
    ctx.translate(torsoCenterX, torsoCenterY);
    ctx.rotate(Math.atan2(coreDy, coreDx));
    drawTorso(-46, -10, 92, 20);
    ctx.fillStyle = shortsColor;
    pathRoundedRect(ctx, -20, -9, 40, 12, 6);
    ctx.fill();
    ctx.restore();

    const headX = coreStartX + coreDx * 0.72 + px * 5;
    const headY = coreStartY + coreDy * 0.72 + py * 5;
    drawHead(headX, headY, 12);

    const shoulderLeadX = coreStartX + coreDx * 0.57 + px * 5;
    const shoulderLeadY = coreStartY + coreDy * 0.57 + py * 5;
    const shoulderSupportX = coreStartX + coreDx * 0.51 - px * 5;
    const shoulderSupportY = coreStartY + coreDy * 0.51 - py * 5;
    const leadArmX = coreEndX + px * 2;
    const leadArmY = coreEndY + py * 2;
    const supportArmX = coreStartX + coreDx * 0.88 - px * 11;
    const supportArmY = coreStartY + coreDy * 0.88 - py * 11;
    const hipsX = coreStartX + coreDx * 0.32 - px * 2;
    const hipsY = coreStartY + coreDy * 0.32 - py * 2;
    const backLegX = coreStartX - direction * lerp(16, 24, swing);
    const backLegY = coreStartY + lerp(14, 20, swing);
    const frontLegX = coreStartX + direction * lerp(8, 16, swing);
    const frontLegY = coreStartY + lerp(18, 24, swing);

    drawLimb(shoulderLeadX, shoulderLeadY, leadArmX, leadArmY, 10, jerseyColor);
    drawLimb(shoulderSupportX, shoulderSupportY, supportArmX, supportArmY, 9, jerseyColor);
    drawLimb(hipsX, hipsY, backLegX, backLegY, 10, socksColor);
    drawLimb(hipsX - px * 2, hipsY - py * 2, frontLegX, frontLegY, 10, socksColor);

    drawGlove(leadArmX, leadArmY, 6);
    drawGlove(supportArmX, supportArmY, 5);

    ctx.fillStyle = outlineColor;
    ctx.beginPath();
    ctx.ellipse(backLegX, backLegY + 3, 13, 5, 0.1 * direction, 0, Math.PI * 2);
    ctx.ellipse(frontLegX, frontLegY + 3, 12, 5, -0.08 * direction, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = colorWithAlpha(trimColor, 0.45);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  if (pose === "high") {
    ctx.moveTo(-direction * 32, 10);
    ctx.lineTo(direction * 108, -112);
    ctx.moveTo(-direction * 12, 4);
    ctx.lineTo(direction * 88, -84);
  } else {
    ctx.moveTo(-direction * 6, 6);
    ctx.lineTo(direction * 92, 18);
    ctx.moveTo(-direction * 16, 2);
    ctx.lineTo(direction * 62, 24);
  }
  ctx.stroke();
  ctx.restore();
}

function drawShooter(ctx, game) {
  const shotProgress = game.activeShot
    ? clamp(game.activeShot.elapsedMs / Math.max(game.activeShot.totalMs, 1), 0, 1)
    : 0;
  const kickPhase = game.activeShot ? clamp(shotProgress / 0.22, 0, 1) : 0;
  const fade = game.activeShot ? 1 - clamp((shotProgress - 0.22) / 0.18, 0, 1) : 1;
  if (fade <= 0.02) {
    return;
  }

  const shootingTeam =
    game.activeShot?.actor === "RIVAL" || (!game.activeShot && game.turnMode === "save")
      ? game.rivalTeam
      : game.playerTeam;
  const glowColor = shootingTeam?.colors?.primary ?? "#7f1d1d";
  const silhouette = "#040507";

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(PENALTY_SPOT.x - 76 + kickPhase * 18, PENALTY_SPOT.y + 8);
  ctx.rotate(-0.18 + kickPhase * 0.24);

  drawFigureGlow(ctx, 12, -40, 82, 128, glowColor, 0.16);

  ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
  ctx.beginPath();
  ctx.ellipse(12, 20, 36, 10, -0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = silhouette;
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-2, -8);
  ctx.lineTo(-12, 42);
  ctx.moveTo(10, -6);
  ctx.lineTo(42 + kickPhase * 12, 18 - kickPhase * 4);
  ctx.moveTo(-4, -54);
  ctx.lineTo(-28, -26);
  ctx.moveTo(18, -54);
  ctx.lineTo(34, -34);
  ctx.stroke();

  ctx.fillStyle = silhouette;
  ctx.beginPath();
  ctx.ellipse(-12, 44, 14, 6, 0.06, 0, Math.PI * 2);
  ctx.ellipse(48 + kickPhase * 12, 20 - kickPhase * 4, 14, 6, -0.24, 0, Math.PI * 2);
  ctx.fill();

  pathRoundedRect(ctx, -18, -74, 44, 68, 22);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(4, -92, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = colorWithAlpha(glowColor, 0.12);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-8, -58);
  ctx.lineTo(-20, -18);
  ctx.moveTo(10, -56);
  ctx.lineTo(34, -4);
  ctx.moveTo(-8, -70);
  ctx.lineTo(-22, -40);
  ctx.stroke();

  ctx.restore();
}

function drawShooterRoleBadge(ctx, game, locale) {
  const rivalShooting =
    game.activeShot?.actor === "RIVAL" || (!game.activeShot && game.turnMode === "save");
  if (!rivalShooting) {
    return;
  }

  const ui = UI_COPY[locale] ?? UI_COPY.en;
  const label = ui.aiShooterLabel;
  const badgeWidth = 160;
  const badgeHeight = 28;
  const badgeX = PENALTY_SPOT.x - 164;
  const badgeY = PENALTY_SPOT.y - 172;

  ctx.save();
  ctx.fillStyle = "rgba(7, 14, 25, 0.86)";
  pathRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 14);
  ctx.fill();
  ctx.strokeStyle = "rgba(249, 115, 22, 0.75)";
  ctx.lineWidth = 1.5;
  pathRoundedRect(ctx, badgeX + 1, badgeY + 1, badgeWidth - 2, badgeHeight - 2, 13);
  ctx.stroke();

  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  ctx.arc(badgeX + 18, badgeY + badgeHeight * 0.5, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f8fafc";
  ctx.font = "900 13px 'Trebuchet MS', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, badgeX + 30, badgeY + badgeHeight * 0.5 + 1);
  ctx.restore();
}

function drawBall(ctx, ball) {
  const perspective = clamp((ball.y - GOAL_FRAME.y) / (PENALTY_SPOT.y - GOAL_FRAME.y), 0, 1);
  const radius = lerp(10.5, 15, perspective);

  for (const trailNode of ball.trail) {
    if (trailNode.alpha <= 0) continue;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.34 * trailNode.alpha})`;
    ctx.beginPath();
    ctx.arc(trailNode.x, trailNode.y, 4.8 * trailNode.alpha + 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = `rgba(0, 0, 0, ${0.16 + perspective * 0.16})`;
  ctx.beginPath();
  ctx.ellipse(ball.x + 4, ball.y + radius + 6, radius * 0.9, radius * 0.42, -0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.rotate(ball.rotation);
  const fill = ctx.createRadialGradient(-radius * 0.24, -radius * 0.34, radius * 0.18, 0, 0, radius * 1.05);
  fill.addColorStop(0, "#ffffff");
  fill.addColorStop(0.65, "#d8dee8");
  fill.addColorStop(1, "#8b95a5");
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = Math.max(1.8, radius * 0.14);
  ctx.beginPath();
  ctx.moveTo(-radius * 0.62, -radius * 0.26);
  ctx.lineTo(-radius * 0.16, -radius * 0.72);
  ctx.lineTo(radius * 0.42, -radius * 0.56);
  ctx.lineTo(radius * 0.62, 0);
  ctx.lineTo(radius * 0.12, radius * 0.56);
  ctx.lineTo(-radius * 0.46, radius * 0.54);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.72, 0.25, 2.5);
  ctx.stroke();
  ctx.restore();
}

function drawZoneHints(ctx, locale) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let index = 0; index < SHOT_ZONES.length; index += 1) {
    const zone = SHOT_ZONES[index];
    const pulse = 1 + Math.sin((performance.now() / 1000) * 4 + index) * 0.05;
    const radius = 24 * pulse;
    ctx.fillStyle = "rgba(125, 211, 252, 0.24)";
    ctx.beginPath();
    ctx.arc(zone.target.x, zone.target.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(254, 240, 138, 0.72)";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(zone.target.x - 9, zone.target.y);
    ctx.lineTo(zone.target.x + 9, zone.target.y);
    ctx.moveTo(zone.target.x, zone.target.y - 9);
    ctx.lineTo(zone.target.x, zone.target.y + 9);
    ctx.stroke();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "900 16px 'Trebuchet MS', sans-serif";
    ctx.fillText(String(index + 1), zone.target.x, zone.target.y - 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "700 10px 'Trebuchet MS', sans-serif";
    ctx.fillText(shortZone(zone.id, locale), zone.target.x, zone.target.y + 18);
  }
  ctx.restore();
}

function drawCanvasHud(ctx, game, locale) {
  const dots = buildCanvasDots(game.history);
  const scoreboardX = CANVAS_WIDTH * 0.5 - 146;
  const scoreboardY = 20;
  const playerLabel = game.playerTeam?.shortName ?? (locale === "es" ? "TUS" : "YOU");
  const rivalLabel = game.rivalTeam?.shortName ?? "RIV";

  ctx.save();
  const background = ctx.createLinearGradient(scoreboardX, scoreboardY, scoreboardX, scoreboardY + 70);
  background.addColorStop(0, "rgba(10, 20, 37, 0.94)");
  background.addColorStop(1, "rgba(3, 8, 18, 0.88)");
  ctx.fillStyle = background;
  pathRoundedRect(ctx, scoreboardX, scoreboardY, 292, 70, 16);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1.5;
  pathRoundedRect(ctx, scoreboardX + 1, scoreboardY + 1, 290, 68, 15);
  ctx.stroke();

  ctx.fillStyle = colorWithAlpha(game.playerTeam?.colors?.primary ?? "#1d4ed8", 0.95);
  pathRoundedRect(ctx, scoreboardX + 14, scoreboardY + 12, 54, 20, 8);
  ctx.fill();
  ctx.fillStyle = colorWithAlpha(game.rivalTeam?.colors?.primary ?? "#ef4444", 0.95);
  pathRoundedRect(ctx, scoreboardX + 224, scoreboardY + 12, 54, 20, 8);
  ctx.fill();

  ctx.fillStyle = "#f8fafc";
  ctx.font = "900 13px 'Trebuchet MS', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(playerLabel, scoreboardX + 41, scoreboardY + 26);
  ctx.fillText(rivalLabel, scoreboardX + 251, scoreboardY + 26);

  ctx.font = "900 34px 'Trebuchet MS', sans-serif";
  ctx.fillText(String(game.scoreboard?.playerGoals ?? 0), scoreboardX + 112, scoreboardY + 33);
  ctx.fillText(String(game.scoreboard?.rivalGoals ?? 0), scoreboardX + 180, scoreboardY + 33);
  ctx.fillStyle = "rgba(226, 232, 240, 0.7)";
  ctx.font = "900 28px 'Trebuchet MS', sans-serif";
  ctx.fillText(":", scoreboardX + 146, scoreboardY + 33);

  const drawDotRow = (entries, startX, y) => {
    for (let index = 0; index < 5; index += 1) {
      ctx.fillStyle = dotColorForResult(entries[index]);
      ctx.beginPath();
      ctx.arc(startX + index * 14, y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };
  drawDotRow(dots.PLAYER, scoreboardX + 34, scoreboardY + 52);
  drawDotRow(dots.RIVAL, scoreboardX + 190, scoreboardY + 52);

  const infoX = 24;
  pathRoundedRect(ctx, infoX, 22, 336, 30, 12);
  ctx.fillStyle = "rgba(6, 12, 24, 0.78)";
  ctx.fill();
  ctx.fillStyle = game.backendStatus === "online" ? "#4ade80" : "#f97316";
  ctx.beginPath();
  ctx.arc(infoX + 16, 37, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "800 12px 'Trebuchet MS', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(
    `${game.turnMode === "save" ? "SAVE MODE" : "ATTACK MODE"}  |  ${game.backendStatus === "online" ? "AI ONLINE" : "BACKEND OFF"}  |  ${localizeDifficulty(game.selectedDifficultyId, locale).toUpperCase()}`,
    infoX + 28,
    41
  );
  ctx.restore();
}

function drawStatusRibbon(ctx, game, locale) {
  let label = "";
  const activeOutcomeType = outcomeTypeFromOutcome(game.activeShot?.outcome);
  const activeIsSave = activeOutcomeType === "SAVE";
  if (game.phase === "finished") {
    label = locale === "es" ? "TANDA CERRADA" : "SHOOTOUT COMPLETE";
  } else if (game.phase === "shot") {
    label =
      game.activeShot?.actor === "RIVAL"
        ? activeIsSave
          ? locale === "es"
            ? "TU PORTERO TOCA EL BALON"
            : "YOUR KEEPER GETS A HAND TO IT"
          : locale === "es"
            ? "EL RIVAL REMATA"
            : "OPPONENT STRIKES"
        : activeIsSave
          ? locale === "es"
            ? "EL PORTERO LEE EL TIRO"
            : "KEEPER READING THE SHOT"
          : locale === "es"
            ? "DISPARO EN CURSO"
            : "SHOT IN FLIGHT";
  } else if (game.phase === "intermission") {
    label = (game.message || "").toUpperCase();
  } else if (game.phase === "ready") {
    label =
      game.turnMode === "save"
        ? locale === "es"
          ? "RIVAL AL TIRO: ELIGE TU ESTIRADA"
          : "OPPONENT SHOOTING: PICK YOUR DIVE"
        : locale === "es"
          ? "ELIGE ZONA Y GOLPEA"
          : "PICK A ZONE AND STRIKE";
  } else if (game.phase === "menu") {
    label = locale === "es" ? "SELECCIONA RIVAL Y DIFICULTAD" : "SELECT RIVAL AND DIFFICULTY";
  }
  if (!label) {
    return;
  }

  ctx.save();
  const width = Math.min(560, 180 + label.length * 9);
  const x = CANVAS_WIDTH * 0.5 - width * 0.5;
  const y = CANVAS_HEIGHT - 52;
  ctx.fillStyle = "rgba(4, 10, 20, 0.78)";
  pathRoundedRect(ctx, x, y, width, 28, 14);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.2;
  pathRoundedRect(ctx, x + 1, y + 1, width - 2, 26, 13);
  ctx.stroke();
  ctx.fillStyle = "#f8fafc";
  ctx.font = "900 13px 'Trebuchet MS', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, CANVAS_WIDTH * 0.5, y + 18);
  ctx.restore();
}

function drawCanvasScene(canvas, game, locale) {
  if (!canvas) {
    return;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawPitch(ctx, game);

  ctx.save();
  if (game.cameraShakeMs > 0) {
    const amplitude = 4.2 * clamp(game.cameraShakeMs / 220, 0, 1);
    ctx.translate(randomBetween(-amplitude, amplitude), randomBetween(-amplitude, amplitude));
  }
  drawGoal(ctx, game);

  const defendingTeam =
    game.activeShot?.actor === "RIVAL" || (!game.activeShot && game.turnMode === "save")
      ? game.playerTeam
      : game.rivalTeam;

  const keeper = game.activeShot?.keeper ?? {
    x: GOAL_CENTER_X,
    y: KEEPER_BASE_Y,
    predictedZoneId: "center",
    stretch: 1,
    lift: 0,
  };
  drawKeeper(ctx, keeper, defendingTeam);
  drawShooter(ctx, game);
  drawShooterRoleBadge(ctx, game, locale);

  const ball = game.activeShot?.ball ?? {
    x: PENALTY_SPOT.x,
    y: PENALTY_SPOT.y,
    rotation: 0,
    trail: [],
  };
  drawBall(ctx, ball);
  ctx.restore();

  drawCanvasHud(ctx, game, locale);
  drawStatusRibbon(ctx, game, locale);

  if (game.phase === "menu" || game.phase === "ready") {
    drawZoneHints(ctx, locale);
  }
}

const DIFFICULTY_OPTIONS = [
  { id: "amateur", label: { es: "Amateur", en: "Amateur" } },
  { id: "competitive", label: { es: "Competitivo", en: "Competitive" } },
  { id: "professional", label: { es: "Profesional", en: "Professional" } },
  { id: "elite", label: { es: "Elite", en: "Elite" } },
];

function createEmptyScoreboard() {
  return {
    playerGoals: 0,
    rivalGoals: 0,
    playerShotsTaken: 0,
    rivalShotsTaken: 0,
    round: 1,
    remainingInitialShots: 5,
    suddenDeath: false,
    maxInitialShots: 5,
  };
}

function createRemoteInitialState(locale) {
  return {
    ...createInitialState(locale),
    phase: "booting",
    turnMode: "attack",
    teamsLoading: true,
    teams: [],
    teamsError: "",
    selectedRivalId: null,
    selectedDifficultyId: "competitive",
    matchId: null,
    playerTeam:
      locale === "es"
        ? {
            id: "player-default",
            displayName: "Tu Club",
            shortName: "TUS",
            colors: {
              primary: "#d4a017",
              secondary: "#e2e8f0",
            },
            uniform: {
              shirt: "#d4a017",
              shorts: "#2a4a8a",
              socks: "#e2e8f0",
            },
          }
        : {
            id: "player-default",
            displayName: "Your Club",
            shortName: "YOU",
            colors: {
              primary: "#d4a017",
              secondary: "#e2e8f0",
            },
            uniform: {
              shirt: "#d4a017",
              shorts: "#2a4a8a",
              socks: "#e2e8f0",
            },
          },
    rivalTeam: null,
    scoreboard: createEmptyScoreboard(),
    pendingResolution: null,
    pendingRequestKey: null,
    backendStatus: "loading",
  };
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `shot-${Date.now()}-${Math.round(Math.random() * 99999)}`;
}

function localizeDifficulty(difficultyId, locale) {
  const difficulty = DIFFICULTY_OPTIONS.find((entry) => entry.id === difficultyId);
  return difficulty?.label?.[locale] ?? difficulty?.label?.en ?? difficultyId;
}

function hydrateRemoteMatch(previous, snapshot, phaseOverride) {
  const turnMode =
    snapshot.turnMode ??
    (snapshot.phase === "awaiting_player_save" ? "save" : "attack");
  return {
    ...previous,
    phase: phaseOverride ?? (snapshot.finished ? "finished" : "ready"),
    turnMode,
    matchId: snapshot.matchId ?? previous.matchId,
    playerTeam: snapshot.playerTeam ?? previous.playerTeam,
    rivalTeam: snapshot.rivalTeam ?? previous.rivalTeam,
    selectedRivalId: snapshot.rivalTeam?.id ?? previous.selectedRivalId,
    selectedDifficultyId: snapshot.difficultyId ?? previous.selectedDifficultyId,
    scoreboard: snapshot.scoreboard ?? previous.scoreboard,
    attemptsTaken: snapshot.scoreboard?.playerShotsTaken ?? previous.attemptsTaken,
    goals: snapshot.scoreboard?.playerGoals ?? previous.goals,
    saves: snapshot.scoreboard?.rivalGoals ?? previous.saves,
    history: Array.isArray(snapshot.history) ? normalizeHistoryEntries(snapshot.history) : previous.history,
    aiTelemetry: {
      ...baseTelemetry(),
      ...(snapshot.goalkeeperRead ?? {}),
    },
    intermissionMs: 0,
    activeShot: null,
    pendingResolution: null,
    pendingRequestKey: null,
    teamsLoading: false,
    teamsError: "",
    backendStatus: "online",
  };
}

function buildTurnSummary(payload, locale, rivalTeam) {
  const rivalName = rivalTeam?.displayName ?? (locale === "es" ? "El rival" : "Opponent");
  if (payload?.playerShot) {
    const playerOutcomeType = outcomeTypeFromOutcome(payload.playerShot.outcome);
    const playerText =
      playerOutcomeType === "SAVE"
        ? locale === "es"
          ? "Parada del portero."
          : "Saved by the keeper."
        : locale === "es"
          ? "Gol."
          : "Goal.";
    const followUp =
      payload.finished
        ? ""
        : locale === "es"
          ? `${rivalName} responde. Ponte bajo palos.`
          : `${rivalName} answers next. Get in goal.`;
    return `${playerText} ${followUp}`.trim();
  }
  if (payload?.rivalShot) {
    const rivalOutcomeType = outcomeTypeFromOutcome(payload.rivalShot.outcome);
    if (rivalOutcomeType === "SAVE") {
      return locale === "es"
        ? "Paradon. Recuperas la iniciativa para el siguiente lanzamiento."
        : "Huge save. You get the initiative back for the next kick.";
    }
    if (rivalOutcomeType === "GOAL") {
      return locale === "es"
        ? `${rivalName} marca. Te toca volver a lanzar.`
        : `${rivalName} scores. Your turn to shoot again.`;
    }
    return locale === "es"
      ? `${rivalName} falla su disparo.`
      : `${rivalName} misses the attempt.`;
  }
  return "";
}

function settleResolvedShot(state) {
  if (!state.activeShot || state.activeShot.outcome.settled) {
    return state;
  }
  if (!state.pendingResolution?.payload) {
    return {
      ...state,
      activeShot: null,
      pendingResolution: null,
      pendingRequestKey: null,
      phase: "ready",
    };
  }
  const shot = state.activeShot;
  const payload = state.pendingResolution.payload;
  const outcomeType = outcomeTypeFromOutcome(shot.outcome) ?? "GOAL";
  const isGoal = outcomeType === "GOAL";
  const isSave = outcomeType === "SAVE";
  const isOffTarget = outcomeType === "MISS" || outcomeType === "POST";
  return {
    ...hydrateRemoteMatch(state, payload, payload.finished ? "finished" : "intermission"),
    intermissionMs: payload.finished ? 0 : 980,
    message: state.pendingResolution.summary,
    cameraShakeMs: isSave ? 210 : isOffTarget ? 110 : 160,
    crowdPulseMs: isSave ? 340 : isOffTarget ? 220 : 420,
    netRippleMs: isGoal ? 520 : state.netRippleMs,
    aiTelemetry: {
      ...baseTelemetry(),
      ...(payload.goalkeeperRead ?? {}),
      saveProbability: payload.playerShot?.outcome?.saveProbability ?? payload.rivalShot?.outcome?.saveProbability ?? 0,
    },
  };
}

function buildTextPayload(state) {
  const liveShot = state.activeShot;
  return {
    mode: "arcade-penalty-neural-keeper",
    phase: state.phase,
    turnMode: state.turnMode,
    coordinates: COORDINATE_SYSTEM,
    backendStatus: state.backendStatus,
    matchId: state.matchId,
    rivalTeam: state.rivalTeam?.id ?? null,
    difficultyId: state.selectedDifficultyId,
    scoreboard: state.scoreboard ?? createEmptyScoreboard(),
    ai: {
      adaptation: Number((liveShot?.keeper.adaptation ?? state.aiTelemetry.adaptation ?? 0).toFixed(3)),
      confidence: Number((liveShot?.keeper.confidence ?? state.aiTelemetry.confidence ?? 0).toFixed(3)),
      learningIndex: Number((liveShot?.keeper.learningIndex ?? state.aiTelemetry.learningIndex ?? 0).toFixed(3)),
      tendencyZone: liveShot?.keeper.tendencyZone ?? state.aiTelemetry.tendencyZone ?? null,
      predictedZone: liveShot?.keeper.predictedZoneId ?? state.aiTelemetry.predictedZoneId ?? null,
      saveProbability: Number((liveShot?.outcome?.saveProbability ?? state.aiTelemetry.saveProbability ?? 0).toFixed(3)),
    },
    activeShot: liveShot
      ? {
          actor: liveShot.actor ?? "PLAYER",
          shotNumber: liveShot.shotNumber,
          selectedZone: liveShot.zoneId,
          keeperZone: liveShot.keeper.predictedZoneId,
          progress: Number(clamp(liveShot.elapsedMs / liveShot.durationMs, 0, 1).toFixed(3)),
          ball: {
            x: Number(liveShot.ball.x.toFixed(2)),
            y: Number(liveShot.ball.y.toFixed(2)),
          },
          keeper: {
            x: Number(liveShot.keeper.x.toFixed(2)),
            y: Number((liveShot.keeper.y - liveShot.keeper.lift).toFixed(2)),
          },
          isSaveForecast: isSaveOutcome(liveShot.outcome),
        }
      : null,
    recentShots: state.history.slice(-8).map((entry) => ({
      actor: entry.actor,
      attempt: entry.attempt ?? entry.sequence,
      zone: entry.zoneId,
      keeperZone: entry.keeperZoneId ?? null,
      result: entry.result,
      saveProbability: Number((entry.saveProbability ?? 0).toFixed(3)),
    })),
    selectableZones: ZONE_IDS,
    message: state.message,
  };
}

function PenaltyNeuralKeeperGame() {
  const locale = useMemo(() => (resolveBrowserLanguage() === "es" ? "es" : "en"), []);
  const isEs = locale === "es";
  const ui = useMemo(() => UI_COPY[locale] ?? UI_COPY.en, [locale]);
  const canvasRef = useRef(null);
  const shellRef = useRef(null);
  const [game, setGame] = useState(() => createRemoteInitialState(locale));

  useEffect(() => {
    drawCanvasScene(canvasRef.current, game, locale);
  }, [game, locale]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const payload = await fetchPenaltyTeams();
        if (cancelled) {
          return;
        }
        const teams = Array.isArray(payload.teams) ? payload.teams : [];
        setGame((previous) => ({
          ...previous,
          phase: "menu",
          teamsLoading: false,
          backendStatus: "online",
          teams,
          teamsError: teams.length ? "" : isEs ? "No hay rivales disponibles." : "No rivals available.",
          selectedRivalId: previous.selectedRivalId ?? teams[0]?.id ?? null,
          selectedDifficultyId: previous.selectedDifficultyId || teams[0]?.difficultyProfileId || "competitive",
          rivalTeam: teams.find((team) => team.id === (previous.selectedRivalId ?? teams[0]?.id)) ?? previous.rivalTeam,
        }));
      } catch (error) {
        if (cancelled) {
          return;
        }
        setGame((previous) => ({
          ...previous,
          phase: "menu",
          teamsLoading: false,
          backendStatus: "offline",
          teams: [],
          teamsError: isEs
            ? "Backend no disponible. Ejecuta npm run backend:penalty-shootout."
            : "Backend unavailable. Run npm run backend:penalty-shootout.",
          message: error.message || "",
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEs]);

  useEffect(() => {
    let frameId = 0;
    let previousTimestamp = performance.now();

    const animate = (timestamp) => {
      const deltaMs = Math.min(MAX_DELTA_MS, timestamp - previousTimestamp);
      previousTimestamp = timestamp;
      setGame((previous) => tickGame(previous, deltaMs));
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const startShootout = useCallback(async () => {
    let requestPayload = null;
    setGame((previous) => {
      if (!previous.selectedRivalId || previous.teamsLoading) {
        return previous;
      }
      requestPayload = {
        playerTeamId: previous.playerTeam.id,
        rivalTeamId: previous.selectedRivalId,
        difficultyId: previous.selectedDifficultyId,
      };
      return {
        ...previous,
        phase: "starting",
        message: isEs ? "Preparando duelo..." : "Preparing duel...",
      };
    });
    if (!requestPayload) {
      return;
    }
    try {
      const snapshot = await createPenaltyMatch(requestPayload);
      setGame((previous) => ({
        ...hydrateRemoteMatch(previous, snapshot, snapshot.finished ? "finished" : "ready"),
        message: "",
      }));
    } catch (error) {
      setGame((previous) => ({
        ...previous,
        phase: "menu",
        backendStatus: "offline",
        teamsError:
          error.message ||
          (isEs
            ? "No se pudo iniciar la tanda contra el backend."
            : "Could not start the shootout against the backend."),
      }));
    }
  }, [isEs]);

  const restartShootout = useCallback(() => {
    setGame((previous) => ({
      ...createRemoteInitialState(previous.locale),
      phase: "menu",
      teamsLoading: false,
      backendStatus: previous.backendStatus,
      teams: previous.teams,
      teamsError: previous.teamsError,
      playerTeam: previous.playerTeam,
      selectedRivalId: previous.selectedRivalId ?? previous.teams[0]?.id ?? null,
      selectedDifficultyId: previous.selectedDifficultyId,
      rivalTeam: previous.rivalTeam,
    }));
  }, []);

  const selectRival = useCallback((team) => {
    setGame((previous) => ({
      ...previous,
      selectedRivalId: team.id,
      rivalTeam: team,
    }));
  }, []);

  const selectDifficulty = useCallback((difficultyId) => {
    setGame((previous) => ({
      ...previous,
      selectedDifficultyId: difficultyId,
    }));
  }, []);

  const launchShotForZone = useCallback(async (zoneId) => {
    let matchId = null;
    let requestKey = null;
    let actionType = "ATTACK";
    setGame((previous) => {
      if (previous.phase !== "ready" || !previous.matchId) {
        return previous;
      }
      matchId = previous.matchId;
      requestKey = createIdempotencyKey();
      actionType = previous.turnMode === "save" ? "SAVE" : "ATTACK";
      return {
        ...previous,
        phase: "resolving",
        pendingRequestKey: requestKey,
        message:
          actionType === "SAVE"
            ? isEs
              ? "El rival arma el disparo..."
              : "Opponent winding up..."
            : isEs
              ? "Procesando disparo..."
              : "Resolving shot...",
      };
    });
    if (!matchId || !requestKey) {
      return;
    }
    try {
      const payload = await submitPenaltyShot(matchId, { selectedZone: zoneId, actionType }, requestKey);
      setGame((previous) => {
        const deterministicPayload = enforceDeterministicPayload(previous, payload);
        const resolvedShot = deterministicPayload.playerShot ?? deterministicPayload.rivalShot;
        return {
          ...previous,
          backendStatus: "online",
          phase: "shot",
          activeShot: resolvedShot,
          pendingResolution: {
            payload: deterministicPayload,
            summary: buildTurnSummary(
              deterministicPayload,
              locale,
              deterministicPayload.rivalTeam ?? previous.rivalTeam
            ),
          },
          aiTelemetry: {
            ...baseTelemetry(),
            ...(deterministicPayload.goalkeeperRead ?? {}),
            saveProbability: resolvedShot?.outcome?.saveProbability ?? 0,
          },
        };
      });
    } catch (error) {
      setGame((previous) => ({
        ...previous,
        phase: "ready",
        pendingRequestKey: null,
        message:
          error.message ||
          (isEs ? "El backend rechazo el disparo." : "The backend rejected the shot."),
      }));
    }
  }, [isEs, locale]);

  const requestFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      } else if (shell.requestFullscreen) {
        await shell.requestFullscreen();
      } else if (shell.webkitRequestFullscreen) {
        shell.webkitRequestFullscreen();
      }
    } catch {
      // Ignore fullscreen errors from browser restrictions.
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const keyMap = {
        "1": "down-left",
        "2": "down-right",
        "3": "top-left",
        "4": "top-right",
        "5": "center",
      };

      if (keyMap[key]) {
        event.preventDefault();
        launchShotForZone(keyMap[key]);
        return;
      }
      if (key === "r") {
        event.preventDefault();
        restartShootout();
        return;
      }
      if (key === "f") {
        event.preventDefault();
        requestFullscreen();
        return;
      }
      if ((event.key === "Enter" || event.key === " ") && (game.phase === "menu" || game.phase === "finished")) {
        event.preventDefault();
        startShootout();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [game.phase, launchShotForZone, requestFullscreen, restartShootout, startShootout]);

  const advanceTime = useCallback((milliseconds) => {
    setGame((previous) => runTime(previous, milliseconds));
  }, []);

  useGameRuntimeBridge(game, buildTextPayload, advanceTime);

  const attackAttempt = game.scoreboard.playerShotsTaken + (game.phase === "finished" || game.turnMode === "save" ? 0 : 1);
  const saveAttempt = game.scoreboard.rivalShotsTaken + (game.phase === "finished" || game.turnMode === "attack" ? 0 : 1);
  const attemptDisplay = game.phase === "menu" ? 0 : game.turnMode === "save" ? saveAttempt : attackAttempt;
  const readZoneId = game.activeShot?.keeper.predictedZoneId ?? game.aiTelemetry.predictedZoneId;
  const tendencyZoneId = game.activeShot?.keeper.tendencyZone ?? game.aiTelemetry.tendencyZone;
  const adaptation = game.activeShot?.keeper.adaptation ?? game.aiTelemetry.adaptation ?? 0;
  const confidence = game.activeShot?.keeper.confidence ?? game.aiTelemetry.confidence ?? 0;
  const learningIndex = game.activeShot?.keeper.learningIndex ?? game.aiTelemetry.learningIndex ?? 0;
  const saveProbability = game.activeShot?.outcome.saveProbability ?? game.aiTelemetry.saveProbability ?? 0;
  const actionDisabled = game.phase !== "ready" || !game.matchId;
  const controlsTitle = game.turnMode === "save" ? ui.defendTitle : ui.controlsTitle;
  const controlsHint = game.turnMode === "save" ? ui.defendHint : ui.controlsHint;
  const turnLedLabel = game.turnMode === "save" ? ui.turnSave : ui.turnAttack;
  const turnLedClass = game.turnMode === "save" ? "save" : "attack";
  const trendLabel = tendencyZoneId ? localizeZone(tendencyZoneId, locale) : ui.tendencyUnknown;
  const readLabel = readZoneId ? localizeZone(readZoneId, locale) : ui.tendencyUnknown;
  const historyRows = game.history.slice(-8).reverse();
  const finalSummary =
    game.phase === "finished"
      ? `${ui.finalMessage}: ${game.playerTeam.displayName} ${game.scoreboard.playerGoals} - ${game.scoreboard.rivalGoals} ${game.rivalTeam?.displayName ?? (isEs ? "Rival" : "Rival")}`
      : null;

  let statusMessage = game.message;
  const activeOutcomeType = outcomeTypeFromOutcome(game.activeShot?.outcome);
  const activeIsSave = activeOutcomeType === "SAVE";
  if (!statusMessage) {
    if (game.phase === "booting") statusMessage = isEs ? "Cargando rivales..." : "Loading rivals...";
    if (game.phase === "menu") statusMessage = game.teamsError || (isEs ? "Selecciona rival y dificultad." : "Select rival and difficulty.");
    if (game.phase === "starting") statusMessage = isEs ? "Preparando duelo..." : "Preparing duel...";
    if (game.phase === "resolving") statusMessage = game.turnMode === "save" ? ui.rivalPreparing : (isEs ? "Procesando disparo..." : "Resolving shot...");
    if (game.phase === "ready") statusMessage = game.turnMode === "save" ? ui.chooseSave : ui.chooseZone;
    if (game.phase === "shot") statusMessage = ui.preparing;
    if (game.phase === "intermission") statusMessage = ui.nextPenalty;
    if (game.phase === "finished") statusMessage = finalSummary;
  }
  if (game.phase === "shot" && game.activeShot?.actor === "RIVAL" && activeOutcomeType === "SAVE") {
    statusMessage = ui.keeperSave;
  } else if (game.phase === "shot" && game.activeShot?.actor === "RIVAL" && activeOutcomeType === "GOAL") {
    statusMessage = ui.rivalGoal;
  } else if (game.phase === "shot" && game.activeShot?.actor === "RIVAL" && ["MISS", "POST"].includes(activeOutcomeType)) {
    statusMessage = isEs ? "El rival falla su disparo." : "The opponent misses the shot.";
  } else if (game.phase === "shot" && activeIsSave) {
    statusMessage = ui.shotSave;
  } else if (game.phase === "shot" && game.activeShot) {
    statusMessage = ui.shotGoal;
  }

  return (
    <div className="mini-game penalty-shootout-game">
      <div className="mini-head">
        <div>
          <h4>{ui.title}</h4>
          <p>{ui.subtitle}</p>
        </div>
        <div className="penalty-head-actions">
          {(game.phase === "menu" || game.phase === "finished") ? (
            <button id="penalty-start-btn" type="button" onClick={startShootout} disabled={!game.selectedRivalId || game.teamsLoading}>
              {game.phase === "finished" ? (isEs ? "Revancha" : "Rematch") : (isEs ? "Iniciar duelo" : "Start duel")}
            </button>
          ) : null}
          <button id="penalty-restart-btn" type="button" onClick={restartShootout}>
            {isEs ? "Menu" : "Menu"}
          </button>
          <button id="penalty-fullscreen-btn" type="button" onClick={requestFullscreen}>
            {ui.fullscreen}
          </button>
        </div>
      </div>

      <div className="penalty-shootout-shell">
        <section className="mini-stage penalty-stage phaser-canvas-shell" ref={shellRef}>
          <div className="phaser-canvas-host penalty-canvas-host">
            <canvas
              ref={canvasRef}
              className="penalty-canvas"
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              aria-label="Penalty shootout canvas"
            />
          </div>

          {(["booting", "menu", "starting", "finished"].includes(game.phase)) ? (
            <div className="penalty-overlay penalty-overlay-menu">
              <h5>
                {game.phase === "finished"
                  ? (isEs ? "Resultado final" : "Final result")
                  : game.phase === "booting"
                    ? (isEs ? "Cargando rivales" : "Loading rivals")
                    : (isEs ? "Selecciona rival" : "Select rival")}
              </h5>
              <p>{game.phase === "finished" ? finalSummary : ui.menuBody}</p>
              <p>{game.teamsError || (game.phase === "finished" ? ui.finishedBody : ui.menuHint)}</p>
              {!game.teamsLoading ? (
                <>
                  <div className="penalty-team-grid">
                    {game.teams.map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        className={`penalty-team-card${team.id === game.selectedRivalId ? " selected" : ""}`}
                        style={{ "--penalty-team-accent": team.colors?.primary ?? "#38bdf8" }}
                        onClick={() => selectRival(team)}
                      >
                        <strong>{team.displayName}</strong>
                        <span>{localizeDifficulty(team.difficultyProfileId, locale)}</span>
                      </button>
                    ))}
                  </div>
                  <div className="penalty-difficulty-row">
                    {DIFFICULTY_OPTIONS.map((difficulty) => (
                      <button
                        key={difficulty.id}
                        type="button"
                        className={difficulty.id === game.selectedDifficultyId ? "selected" : ""}
                        onClick={() => selectDifficulty(difficulty.id)}
                      >
                        {difficulty.label[locale] ?? difficulty.label.en}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={startShootout} disabled={!game.selectedRivalId || game.phase === "starting"}>
                    {game.phase === "finished" ? (isEs ? "Jugar otra vez" : "Play again") : (isEs ? "Arrancar tanda" : "Start shootout")}
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </section>

        <aside className="penalty-sidepanel">
          <section className="penalty-panel">
            <header>
              <span>{isEs ? "Enfrentamiento" : "Matchup"}</span>
              <strong>
                {game.scoreboard.suddenDeath ? (isEs ? "Muerte subita" : "Sudden death") : `${isEs ? "Ronda" : "Round"} ${game.scoreboard.round}`}
              </strong>
            </header>
            <div className={`penalty-turn-led ${turnLedClass}`}>
              <span className="penalty-turn-led-dot" />
              <strong>{turnLedLabel}</strong>
            </div>
            <p className={`penalty-role-copy ${game.turnMode === "save" ? "save" : "attack"}`}>
              <strong>{ui.roleTitle}:</strong> {game.turnMode === "save" ? ui.roleSave : ui.roleAttack}
            </p>
            <div className="penalty-score-grid">
              <article>
                <h6>{game.playerTeam.displayName}</h6>
                <p>{game.scoreboard.playerGoals}</p>
              </article>
              <article>
                <h6>{game.rivalTeam?.displayName ?? (isEs ? "Rival" : "Rival")}</h6>
                <p>{game.scoreboard.rivalGoals}</p>
              </article>
            </div>
            <p>{isEs ? "Dificultad" : "Difficulty"}: <strong>{localizeDifficulty(game.selectedDifficultyId, locale)}</strong></p>
            <p>{isEs ? "Restantes" : "Remaining"}: <strong>{game.scoreboard.remainingInitialShots}</strong></p>
          </section>

          <section className="penalty-panel">
            <header>
              <span>{ui.aiTitle}</span>
              <strong>{readLabel}</strong>
            </header>
            <div className="penalty-ai-metric">
              <span>{ui.adaptation}</span>
              <div className="penalty-meter">
                <div className="penalty-meter-fill" style={{ width: `${Math.round(adaptation * 100)}%` }} />
              </div>
              <strong>{Math.round(adaptation * 100)}%</strong>
            </div>
            <div className="penalty-ai-metric">
              <span>{ui.confidence}</span>
              <div className="penalty-meter">
                <div className="penalty-meter-fill confidence" style={{ width: `${Math.round(confidence * 100)}%` }} />
              </div>
              <strong>{Math.round(confidence * 100)}%</strong>
            </div>
            <div className="penalty-ai-metric">
              <span>{ui.learningIndex}</span>
              <div className="penalty-meter">
                <div className="penalty-meter-fill learning" style={{ width: `${Math.round(learningIndex * 100)}%` }} />
              </div>
              <strong>{Math.round(learningIndex * 100)}%</strong>
            </div>
            <p>{ui.tendency}: <strong>{trendLabel}</strong></p>
            <p>{ui.diveRead}: <strong>{readLabel}</strong></p>
            <p>{ui.saveChance}: <strong>{Math.round(saveProbability * 100)}%</strong></p>
          </section>

          <section className="penalty-panel">
            <header>
              <span>{controlsTitle}</span>
              <strong>{ui.attempt} {attemptDisplay}</strong>
            </header>
            <div className={`penalty-zone-grid${game.turnMode === "save" ? " save-mode" : ""}`} role="group" aria-label={ui.controlsAria}>
              {SHOT_ZONES.map((zone, index) => (
                <button
                  id={`penalty-zone-${zone.id}`}
                  key={zone.id}
                  type="button"
                  disabled={actionDisabled}
                  onClick={() => launchShotForZone(zone.id)}
                  className={zone.id === "center" ? "center-zone" : ""}
                >
                  <span>{index + 1}</span>
                  {game.turnMode === "save" ? localizeKeeperDive(zone.id, locale) : localizeZone(zone.id, locale)}
                </button>
              ))}
            </div>
            <p className="penalty-controls-hint">{controlsHint}</p>
          </section>

          <section className="penalty-panel">
            <header>
              <span>{ui.timelineTitle}</span>
              <strong>{historyRows.length}</strong>
            </header>
            {historyRows.length ? (
              <ul className="penalty-history-list">
                {historyRows.map((entry) => (
                  <li key={`shot-${entry.sequence ?? entry.attempt}`}>
                    <span>{entry.actor === "PLAYER" ? game.playerTeam.shortName : (game.rivalTeam?.shortName ?? "RIV")}</span>
                    <span>{entry.zoneId ? shortZone(entry.zoneId, locale) : "--"}</span>
                    <span>{entry.result}</span>
                    <span>{entry.saveProbability ? `${Math.round(entry.saveProbability * 100)}%` : "--"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="penalty-history-empty">{ui.timelineEmpty}</p>
            )}
          </section>
        </aside>
      </div>

      <p className="game-message">{statusMessage}</p>
    </div>
  );
}

export default PenaltyNeuralKeeperGame;
