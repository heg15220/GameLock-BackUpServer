import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GOAL_CENTER_X,
  GOAL_FRAME,
  INITIAL_SHOTS,
  KEEPER_BASE_Y,
  PENALTY_SPOT,
  PLAYER_TEAM,
  ZONE_BY_ID,
  ZONE_IDS,
} from "./constants.mjs";
import { resolveKeeperDecision } from "./ai.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_ROOT = path.join(__dirname, "..", "data", "penalty-shootout");

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(randomFn, min, max) {
  return min + randomFn() * (max - min);
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

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function quadraticPoint(start, control, end, t) {
  const clamped = clamp(t, 0, 1);
  const oneMinusT = 1 - clamped;
  return {
    x: oneMinusT * oneMinusT * start.x + 2 * oneMinusT * clamped * control.x + clamped * clamped * end.x,
    y: oneMinusT * oneMinusT * start.y + 2 * oneMinusT * clamped * control.y + clamped * clamped * end.y,
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

function keeperDiveX(randomFn, zoneId) {
  const zone = ZONE_BY_ID[zoneId];
  if (!zone) {
    return GOAL_CENTER_X;
  }
  const jitter = zone.side === "center" ? 0 : randomBetween(randomFn, -10, 10);
  return clamp(zone.target.x + jitter, GOAL_FRAME.x + 44, GOAL_FRAME.x + GOAL_FRAME.w - 44);
}

function saveCapForDifficulty(difficultyId) {
  switch (difficultyId) {
    case "amateur":
      return 0.58;
    case "professional":
      return 0.7;
    case "elite":
      return 0.76;
    case "competitive":
    default:
      return 0.64;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function createError(statusCode, code, message) {
  const error = new Error(message ?? code);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function createScoreboard(match) {
  const completedInitialPairs = Math.min(INITIAL_SHOTS, Math.max(match.playerShotsTaken, match.rivalShotsTaken));
  return {
    playerGoals: match.playerGoals,
    rivalGoals: match.rivalGoals,
    playerShotsTaken: match.playerShotsTaken,
    rivalShotsTaken: match.rivalShotsTaken,
    round: Math.max(match.playerShotsTaken, match.rivalShotsTaken) + 1,
    remainingInitialShots: Math.max(0, INITIAL_SHOTS - completedInitialPairs),
    suddenDeath: match.playerShotsTaken >= INITIAL_SHOTS && match.rivalShotsTaken >= INITIAL_SHOTS && match.playerGoals === match.rivalGoals,
    maxInitialShots: INITIAL_SHOTS,
  };
}

function deriveTurnMode(phase) {
  return phase === "awaiting_player_save" ? "save" : "attack";
}

function canStillCatch(goals, opponentGoals, shotsRemaining) {
  return goals + shotsRemaining >= opponentGoals;
}

export function determineWinner(match) {
  const withinInitialSeries =
    match.playerShotsTaken < INITIAL_SHOTS || match.rivalShotsTaken < INITIAL_SHOTS;

  if (withinInitialSeries) {
    const playerShotsRemaining = Math.max(0, INITIAL_SHOTS - match.playerShotsTaken);
    const rivalShotsRemaining = Math.max(0, INITIAL_SHOTS - match.rivalShotsTaken);
    if (!canStillCatch(match.playerGoals, match.rivalGoals, playerShotsRemaining)) {
      return "RIVAL";
    }
    if (!canStillCatch(match.rivalGoals, match.playerGoals, rivalShotsRemaining)) {
      return "PLAYER";
    }
    if (
      match.playerShotsTaken === INITIAL_SHOTS &&
      match.rivalShotsTaken === INITIAL_SHOTS &&
      match.playerGoals !== match.rivalGoals
    ) {
      return match.playerGoals > match.rivalGoals ? "PLAYER" : "RIVAL";
    }
    return null;
  }

  if (match.playerShotsTaken !== match.rivalShotsTaken) {
    return null;
  }
  if (match.playerGoals === match.rivalGoals) {
    return null;
  }
  return match.playerGoals > match.rivalGoals ? "PLAYER" : "RIVAL";
}

function buildPlayerHistoryEntry(match, playerShot) {
  const outcomeType = outcomeTypeFromOutcome(playerShot.outcome) ?? "GOAL";
  return {
    actor: "PLAYER",
    sequence: match.history.length + 1,
    round: Math.max(match.playerShotsTaken + 1, match.rivalShotsTaken),
    attempt: match.playerShotsTaken + 1,
    zoneId: playerShot.zoneId,
    keeperZoneId: playerShot.keeper.predictedZoneId,
    result: outcomeType,
    saveProbability: playerShot.outcome.saveProbability,
    confidence: playerShot.keeper.confidence,
    adaptation: playerShot.keeper.adaptation,
  };
}

function createRivalTarget(randomFn, difficultyProfile) {
  const eliteBias = clamp(Number(difficultyProfile?.rivalShotSkill ?? 0.64), 0.35, 0.92);
  const weights = {
    "down-left": 0.2 - eliteBias * 0.03,
    "down-right": 0.2 - eliteBias * 0.03,
    "top-left": 0.18 + eliteBias * 0.06,
    "top-right": 0.18 + eliteBias * 0.06,
    center: 0.24 - eliteBias * 0.06,
  };
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let threshold = randomFn() * total;
  for (const [zoneId, weight] of entries) {
    threshold -= weight;
    if (threshold <= 0) {
      return zoneId;
    }
  }
  return "center";
}

function saveProbabilityForShot(randomFn, zoneId, prediction, history, difficultyProfile, goalkeeperProfile) {
  const zone = ZONE_BY_ID[zoneId];
  const distance = zoneDistance(zoneId, prediction.predictedZoneId);
  const baseByDistance = distance === 0 ? 0.31 : distance === 1 ? 0.22 : distance === 2 ? 0.13 : 0.07;
  const heightModifier = zone?.row === 0 ? -0.07 : zoneId === "center" ? 0.05 : -0.01;
  const repeatedZone = history.length > 0 && history[history.length - 1].zoneId === zoneId;
  const repetitionBonus = repeatedZone ? 0.08 * prediction.learningIndex : 0;
  const tendencyBonus = prediction.tendencyZone === zoneId ? 0.06 * prediction.adaptation : 0;
  const coverageBonus = clamp(Number(goalkeeperProfile?.coverage ?? 0.55), 0.2, 1) * 0.08;
  const reflexBonus = clamp(Number(goalkeeperProfile?.reflex ?? 0.55), 0.2, 1) * 0.06;
  const trackingBonus = prediction.learningIndex * 0.18 + prediction.confidence * 0.15 + prediction.adaptation * 0.12;
  const ownErrorPenalty = clamp(Number(difficultyProfile?.keeperOwnErrorRate ?? 0.12), 0, 0.3) * 0.2;
  const variance = randomBetween(randomFn, -0.05, 0.05);
  return clamp(
    baseByDistance +
      heightModifier +
      repetitionBonus +
      tendencyBonus +
      coverageBonus +
      reflexBonus +
      trackingBonus +
      Number(difficultyProfile?.saveBias ?? 0) -
      ownErrorPenalty +
      variance,
    0.05,
    saveCapForDifficulty(String(difficultyProfile?.id ?? "competitive"))
  );
}

function createPlayerShotPayload(randomFn, match, zoneId, prediction) {
  const zone = ZONE_BY_ID[zoneId];
  // Deterministic resolution: if the AI keeper reads the exact zone, it's a save.
  const isSave = prediction.predictedZoneId === zoneId;
  const saveProbability = isSave ? 1 : 0;
  const shotPower =
    zone.row === 0
      ? randomBetween(randomFn, 0.8, 1)
      : zoneId === "center"
        ? randomBetween(randomFn, 0.62, 0.84)
        : randomBetween(randomFn, 0.69, 0.92);
  const targetX = zone.target.x + randomBetween(randomFn, -16, 16);
  const targetY = zone.target.y + randomBetween(randomFn, zone.row === 0 ? -8 : -6, zone.row === 0 ? 10 : 14);
  const curveDirection = zone.side === "left" ? -1 : zone.side === "right" ? 1 : 0;
  const controlX =
    lerp(PENALTY_SPOT.x, targetX, 0.5) + curveDirection * randomBetween(randomFn, 24, 54) + randomBetween(randomFn, -10, 10);
  const arcLift = zone.row === 0 ? randomBetween(randomFn, -206, -154) : randomBetween(randomFn, -138, -94);
  const controlY = Math.min(PENALTY_SPOT.y - 40, lerp(PENALTY_SPOT.y, targetY, 0.48) + arcLift);
  const durationMs = Math.round(clamp(990 - shotPower * 410 + randomBetween(randomFn, -36, 54), 480, 960));
  const interceptT = clamp(0.68 + prediction.confidence * 0.13 + prediction.learningIndex * 0.08, 0.66, 0.9);
  const interceptPoint = quadraticPoint(
    PENALTY_SPOT,
    { x: controlX, y: controlY },
    { x: targetX, y: targetY },
    interceptT
  );
  const reboundDistance = randomBetween(randomFn, 136, 232);
  const reboundAngle =
    zone.side === "left"
      ? randomBetween(randomFn, -0.58, -0.18)
      : zone.side === "right"
        ? randomBetween(randomFn, 0.18, 0.58)
        : randomBetween(randomFn, -0.22, 0.22);
  const reboundPoint = {
    x: clamp(
      interceptPoint.x + Math.sin(reboundAngle) * reboundDistance,
      GOAL_FRAME.x - 32,
      GOAL_FRAME.x + GOAL_FRAME.w + 32
    ),
    y: clamp(
      interceptPoint.y + randomBetween(randomFn, 78, 170),
      GOAL_FRAME.y + GOAL_FRAME.h - 12,
      PENALTY_SPOT.y - 24
    ),
  };

  return {
    actor: "PLAYER",
    shotNumber: match.playerShotsTaken + 1,
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
      decisionType: prediction.decisionType,
      reactionMs: prediction.reactionMs,
      diveDurationMs: prediction.diveDurationMs,
      reachPx: prediction.reachPx,
      targetX: keeperDiveX(randomFn, prediction.predictedZoneId),
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

function buildRivalHistoryEntry(match, rivalShot) {
  const outcomeType = outcomeTypeFromOutcome(rivalShot.outcome) ?? "MISS";
  return {
    actor: "RIVAL",
    sequence: match.history.length + 1,
    round: Math.max(match.playerShotsTaken, match.rivalShotsTaken + 1),
    attempt: match.rivalShotsTaken + 1,
    zoneId: rivalShot.zoneId,
    keeperZoneId: rivalShot.keeper.predictedZoneId,
    result: outcomeType,
    saveProbability: rivalShot.outcome.saveProbability,
  };
}

function planRivalTurn(randomFn, match) {
  const targetZoneId = createRivalTarget(randomFn, match.difficultyProfile);
  const shotSkill = clamp(Number(match.difficultyProfile?.rivalShotSkill ?? 0.64), 0.35, 0.92);
  // Deterministic rival resolution by zone-vs-zone match only.
  const offTargetType = null;
  return {
    targetZoneId,
    shotSkill,
    offTargetType,
  };
}

function playerSaveProbability(randomFn, targetZoneId, keeperDiveZoneId, rivalPlan) {
  const targetZone = ZONE_BY_ID[targetZoneId];
  const distance = zoneDistance(targetZoneId, keeperDiveZoneId);
  const baseByDistance = distance === 0 ? 0.56 : distance === 1 ? 0.28 : distance === 2 ? 0.12 : 0.04;
  const heightModifier = targetZone?.row === 0 ? -0.12 : targetZoneId === "center" ? 0.08 : 0.02;
  const rivalSkillPenalty = rivalPlan.shotSkill * 0.24;
  const commitmentBonus = keeperDiveZoneId === targetZoneId ? 0.08 : 0;
  const variance = randomBetween(randomFn, -0.04, 0.04);
  return clamp(baseByDistance + heightModifier + commitmentBonus - rivalSkillPenalty + variance, 0.02, 0.76);
}

function createRivalShotPayload(randomFn, match, keeperDiveZoneId, rivalPlan) {
  const zone = ZONE_BY_ID[rivalPlan.targetZoneId];
  const shotPower =
    zone.row === 0
      ? randomBetween(randomFn, 0.82, 1)
      : zone.id === "center"
        ? randomBetween(randomFn, 0.68, 0.86)
        : randomBetween(randomFn, 0.72, 0.94);
  let targetX = zone.target.x + randomBetween(randomFn, -14, 14);
  let targetY = zone.target.y + randomBetween(randomFn, zone.row === 0 ? -8 : -4, zone.row === 0 ? 10 : 12);
  const curveDirection = zone.side === "left" ? -1 : zone.side === "right" ? 1 : 0;
  const controlX =
    lerp(PENALTY_SPOT.x, targetX, 0.5) + curveDirection * randomBetween(randomFn, 18, 48) + randomBetween(randomFn, -8, 8);
  const arcLift = zone.row === 0 ? randomBetween(randomFn, -194, -146) : randomBetween(randomFn, -126, -88);
  const controlY = Math.min(PENALTY_SPOT.y - 42, lerp(PENALTY_SPOT.y, targetY, 0.48) + arcLift);
  const durationMs = Math.round(clamp(980 - shotPower * 400 + randomBetween(randomFn, -24, 42), 490, 940));
  // Deterministic resolution for user keeper: exact read equals save.
  const isSave = keeperDiveZoneId === rivalPlan.targetZoneId;
  const saveProbability = isSave ? 1 : 0;
  const interceptT = clamp(0.68 + (1 - rivalPlan.shotSkill) * 0.04 + saveProbability * 0.1, 0.66, 0.9);
  const interceptPoint = quadraticPoint(
    PENALTY_SPOT,
    { x: controlX, y: controlY },
    { x: targetX, y: targetY },
    interceptT
  );
  const reboundPoint = {
    x: clamp(
      interceptPoint.x + (zone.side === "left" ? 1 : -1) * randomBetween(randomFn, 120, 210),
      GOAL_FRAME.x - 32,
      GOAL_FRAME.x + GOAL_FRAME.w + 32
    ),
    y: clamp(interceptPoint.y + randomBetween(randomFn, 74, 158), GOAL_FRAME.y + GOAL_FRAME.h - 8, PENALTY_SPOT.y - 18),
  };
  const outcomeType = isSave ? "SAVE" : "GOAL";

  return {
    actor: "RIVAL",
    shotNumber: match.rivalShotsTaken + 1,
    zoneId: rivalPlan.targetZoneId,
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
      predictedZoneId: keeperDiveZoneId,
      tendencyZone: null,
      confidence: 0,
      adaptation: 0,
      learningIndex: 0,
      decisionType: "player-save",
      reactionMs: 120,
      diveDurationMs: 360,
      reachPx: 164,
      targetX: keeperDiveX(randomFn, keeperDiveZoneId),
      stretch: 1,
      lift: 0,
    },
    outcome: {
      type: outcomeType,
      isSave,
      saveProbability,
      settled: false,
    },
    impactTriggered: false,
  };
}

export function createPenaltyShootoutService({
  randomFn = Math.random,
  teamFile = path.join(DEFAULT_DATA_ROOT, "teams.sample.json"),
  difficultyFile = path.join(DEFAULT_DATA_ROOT, "difficulty-profiles.sample.json"),
  statsFile = path.join(DEFAULT_DATA_ROOT, "stats", "summary.json"),
} = {}) {
  const activeMatches = new Map();
  let teamsCache = null;
  let difficultiesCache = null;

  async function ensureStatsStore() {
    await mkdir(path.dirname(statsFile), { recursive: true });
    try {
      const raw = await readFile(statsFile, "utf8");
      return JSON.parse(raw);
    } catch {
      const initial = {
        updatedAt: nowIso(),
        matchesPlayed: 0,
        matchesWon: 0,
        byDifficulty: {},
        byRival: {},
        favoriteZones: {},
        conversionByZone: {},
      };
      await writeFile(statsFile, JSON.stringify(initial, null, 2));
      return initial;
    }
  }

  async function writeStats(store) {
    const next = { ...store, updatedAt: nowIso() };
    await mkdir(path.dirname(statsFile), { recursive: true });
    await writeFile(statsFile, JSON.stringify(next, null, 2));
    return next;
  }

  async function loadTeams() {
    if (teamsCache) {
      return teamsCache;
    }
    const raw = await readFile(teamFile, "utf8");
    const parsed = JSON.parse(raw);
    teamsCache = Array.isArray(parsed.teams) ? parsed.teams.filter((team) => team.enabled !== false) : [];
    return teamsCache;
  }

  async function loadDifficulties() {
    if (difficultiesCache) {
      return difficultiesCache;
    }
    const raw = await readFile(difficultyFile, "utf8");
    const parsed = JSON.parse(raw);
    const profiles = Array.isArray(parsed.profiles) ? parsed.profiles : [];
    difficultiesCache = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));
    return difficultiesCache;
  }

  async function getPublicTeams() {
    const teams = await loadTeams();
    return teams.map((team) => ({
      id: team.id,
      displayName: team.displayName,
      shortName: team.shortName,
      crestAsset: team.crestAsset,
      colors: team.colors,
      stadiumThemeId: team.stadiumThemeId,
      difficultyProfileId: team.difficultyProfileId,
      goalkeeperStyle: team.goalkeeperProfile?.styleId ?? "balanced-reader",
      goalkeeperProfile: team.goalkeeperProfile,
    }));
  }

  function buildGoalkeeperRead(match, sample = false) {
    const playerHistory = match.history.filter((entry) => entry.actor === "PLAYER");
    const read = resolveKeeperDecision({
      history: playerHistory,
      attemptsTaken: match.playerShotsTaken,
      difficultyProfile: match.difficultyProfile,
      goalkeeperProfile: match.rivalTeam.goalkeeperProfile,
      sample,
      randomFn,
    });
    return {
      adaptation: read.adaptation,
      confidence: read.confidence,
      learningIndex: read.learningIndex,
      tendencyZone: read.tendencyZone,
      predictedZoneId: read.predictedZoneId,
      decisionType: read.decisionType,
      probabilities: read.probabilities,
      saveProbability: 0,
    };
  }

  function buildMatchState(match) {
    return {
      matchId: match.id,
      status: match.status,
      phase: match.phase,
      turnMode: deriveTurnMode(match.phase),
      playerTeam: match.playerTeam,
      rivalTeam: match.rivalTeam,
      difficultyId: match.difficultyProfile.id,
      scoreboard: createScoreboard(match),
      history: match.history.slice(-16),
      goalkeeperRead: match.goalkeeperRead,
      finished: match.status === "FINISHED",
      winner: match.winner,
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
    };
  }

  async function createMatch({
    playerTeamId = PLAYER_TEAM.id,
    rivalTeamId,
    difficultyId,
  } = {}) {
    const teams = await loadTeams();
    const difficulties = await loadDifficulties();
    const rivalTeam = teams.find((team) => team.id === rivalTeamId);
    if (!rivalTeam) {
      throw createError(400, "invalid_rival_team", "Unknown rival team.");
    }
    const difficultyProfile = difficulties[difficultyId || rivalTeam.difficultyProfileId];
    if (!difficultyProfile) {
      throw createError(400, "invalid_difficulty", "Unknown difficulty profile.");
    }

    const rivalStarts = randomFn() < 0.5;
    const match = {
      id: `ps_${randomUUID().replace(/-/g, "").slice(0, 14)}`,
      status: "ACTIVE",
      phase: rivalStarts ? "awaiting_player_save" : "awaiting_player_shot",
      playerTeam: { ...PLAYER_TEAM, id: playerTeamId },
      rivalTeam,
      difficultyProfile,
      playerGoals: 0,
      rivalGoals: 0,
      playerShotsTaken: 0,
      rivalShotsTaken: 0,
      history: [],
      pendingRivalTurn: null,
      winner: null,
      idempotency: new Map(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    if (rivalStarts) {
      match.pendingRivalTurn = planRivalTurn(randomFn, match);
    }
    match.goalkeeperRead = buildGoalkeeperRead(match, false);
    activeMatches.set(match.id, match);
    return buildMatchState(match);
  }

  async function getMatchState(matchId) {
    const match = activeMatches.get(matchId);
    if (!match) {
      throw createError(404, "match_not_found", "Match not found.");
    }
    return buildMatchState(match);
  }

  async function finalizeStats(match) {
    const store = await ensureStatsStore();
    store.matchesPlayed += 1;
    if (match.winner === "PLAYER") {
      store.matchesWon += 1;
    }
    const difficultyKey = match.difficultyProfile.id;
    store.byDifficulty[difficultyKey] = store.byDifficulty[difficultyKey] ?? { played: 0, won: 0 };
    store.byDifficulty[difficultyKey].played += 1;
    if (match.winner === "PLAYER") {
      store.byDifficulty[difficultyKey].won += 1;
    }
    const rivalKey = match.rivalTeam.id;
    store.byRival[rivalKey] = store.byRival[rivalKey] ?? { played: 0, won: 0, goalsFor: 0, goalsAgainst: 0 };
    store.byRival[rivalKey].played += 1;
    if (match.winner === "PLAYER") {
      store.byRival[rivalKey].won += 1;
    }
    store.byRival[rivalKey].goalsFor += match.playerGoals;
    store.byRival[rivalKey].goalsAgainst += match.rivalGoals;

    for (const entry of match.history) {
      if (entry.actor !== "PLAYER") {
        continue;
      }
      store.favoriteZones[entry.zoneId] = (store.favoriteZones[entry.zoneId] ?? 0) + 1;
      const zoneStats = store.conversionByZone[entry.zoneId] ?? { attempts: 0, goals: 0 };
      zoneStats.attempts += 1;
      if (normalizeResultCode(entry.result) === "GOAL") {
        zoneStats.goals += 1;
      }
      store.conversionByZone[entry.zoneId] = zoneStats;
    }

    await writeStats(store);
  }

  async function submitShot(matchId, { selectedZone, actionType }, { idempotencyKey } = {}) {
    const match = activeMatches.get(matchId);
    if (!match) {
      throw createError(404, "match_not_found", "Match not found.");
    }
    if (match.status === "FINISHED") {
      throw createError(409, "match_finished", "Match already finished.");
    }
    if (!ZONE_BY_ID[selectedZone]) {
      throw createError(400, "invalid_selected_zone", "Invalid shot zone.");
    }
    if (idempotencyKey && match.idempotency.has(idempotencyKey)) {
      return match.idempotency.get(idempotencyKey);
    }

    const effectiveActionType =
      actionType ?? (match.phase === "awaiting_player_save" ? "SAVE" : "ATTACK");
    if (match.phase === "awaiting_player_shot" && effectiveActionType !== "ATTACK") {
      throw createError(409, "invalid_match_phase", "Match is awaiting a player shot.");
    }
    if (match.phase === "awaiting_player_save" && effectiveActionType !== "SAVE") {
      throw createError(409, "invalid_match_phase", "Match is awaiting a goalkeeper save.");
    }
    if (!["ATTACK", "SAVE"].includes(effectiveActionType)) {
      throw createError(400, "invalid_action_type", "Invalid action type.");
    }

    match.updatedAt = nowIso();
    let response;

    if (effectiveActionType === "ATTACK") {
      match.phase = "resolving_player_shot";
      const playerHistory = match.history.filter((entry) => entry.actor === "PLAYER");
      const prediction = resolveKeeperDecision({
        history: playerHistory,
        attemptsTaken: match.playerShotsTaken,
        difficultyProfile: match.difficultyProfile,
        goalkeeperProfile: match.rivalTeam.goalkeeperProfile,
        sample: true,
        randomFn,
      });
      const playerShot = createPlayerShotPayload(randomFn, match, selectedZone, prediction);
      const playerHistoryEntry = buildPlayerHistoryEntry(match, playerShot);
      const playerOutcomeType = outcomeTypeFromOutcome(playerShot.outcome) ?? "GOAL";
      match.playerShotsTaken += 1;
      if (playerOutcomeType === "GOAL") {
        match.playerGoals += 1;
      }
      match.history.push(playerHistoryEntry);

      const winner = determineWinner(match);
      if (winner) {
        match.status = "FINISHED";
        match.phase = "finished";
        match.pendingRivalTurn = null;
        match.winner = winner;
        match.updatedAt = nowIso();
        match.goalkeeperRead = buildGoalkeeperRead(match, false);
        await finalizeStats(match);
      } else {
        match.status = "ACTIVE";
        match.pendingRivalTurn = planRivalTurn(randomFn, match);
        match.phase = "awaiting_player_save";
        match.updatedAt = nowIso();
        match.goalkeeperRead = buildGoalkeeperRead(match, false);
      }

      response = {
        ...buildMatchState(match),
        playerShot,
        rivalShot: null,
        nextTurn: deriveTurnMode(match.phase),
        goalkeeperRead: {
          ...match.goalkeeperRead,
          saveProbability: playerShot.outcome.saveProbability,
        },
        finished: match.status === "FINISHED",
        summary: {
          playerOutcome: playerOutcomeType,
          rivalOutcome: null,
          winner: match.winner,
        },
      };
    } else {
      if (!match.pendingRivalTurn) {
        throw createError(409, "missing_rival_turn", "There is no rival shot pending resolution.");
      }
      match.phase = "resolving_rival_shot";
      const rivalShot = createRivalShotPayload(randomFn, match, selectedZone, match.pendingRivalTurn);
      const rivalHistoryEntry = buildRivalHistoryEntry(match, rivalShot);
      const rivalOutcomeType = outcomeTypeFromOutcome(rivalShot.outcome) ?? "MISS";
      match.rivalShotsTaken += 1;
      if (rivalOutcomeType === "GOAL") {
        match.rivalGoals += 1;
      }
      match.history.push(rivalHistoryEntry);
      match.pendingRivalTurn = null;

      const winner = determineWinner(match);
      if (winner) {
        match.status = "FINISHED";
        match.phase = "finished";
        match.winner = winner;
        match.updatedAt = nowIso();
        match.goalkeeperRead = buildGoalkeeperRead(match, false);
        await finalizeStats(match);
      } else {
        match.status = "ACTIVE";
        match.phase = "awaiting_player_shot";
        match.updatedAt = nowIso();
        match.goalkeeperRead = buildGoalkeeperRead(match, false);
      }

      response = {
        ...buildMatchState(match),
        playerShot: null,
        rivalShot,
        nextTurn: deriveTurnMode(match.phase),
        goalkeeperRead: match.goalkeeperRead,
        finished: match.status === "FINISHED",
        summary: {
          playerOutcome: null,
          rivalOutcome: rivalOutcomeType,
          winner: match.winner,
        },
      };
    }

    if (idempotencyKey) {
      match.idempotency.set(idempotencyKey, response);
    }
    return response;
  }

  async function getStats() {
    const store = await ensureStatsStore();
    const matchesPlayed = Number(store.matchesPlayed ?? 0);
    const matchesWon = Number(store.matchesWon ?? 0);
    const totalShots = Math.max(
      1,
      Object.values(store.favoriteZones ?? {}).reduce((sum, value) => sum + Number(value || 0), 0)
    );
    const favoriteZones = Object.entries(store.favoriteZones ?? {})
      .map(([zone, count]) => ({ zone, share: Number(count || 0) / totalShots }))
      .sort((left, right) => right.share - left.share)
      .slice(0, 5);
    const conversionByZone = Object.entries(store.conversionByZone ?? {})
      .map(([zone, values]) => ({
        zone,
        rate: Number(values?.goals ?? 0) / Math.max(1, Number(values?.attempts ?? 0)),
      }))
      .sort((left, right) => right.rate - left.rate);
    const byRival = Object.entries(store.byRival ?? {}).map(([rivalTeamId, values]) => ({
      rivalTeamId,
      played: Number(values?.played ?? 0),
      won: Number(values?.won ?? 0),
      goalsFor: Number(values?.goalsFor ?? 0),
      goalsAgainst: Number(values?.goalsAgainst ?? 0),
    }));

    return {
      userId: os.userInfo().username || "local-user",
      matchesPlayed,
      matchesWon,
      winRate: matchesWon / Math.max(1, matchesPlayed),
      favoriteZones,
      conversionByZone,
      byRival,
      updatedAt: store.updatedAt,
    };
  }

  return {
    getPublicTeams,
    createMatch,
    getMatchState,
    submitShot,
    getStats,
  };
}

export const penaltyShootoutService = createPenaltyShootoutService();
