import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../utils/resolveBrowserLanguage";
import LudoBoard from "./parchis/LudoBoard";
import { PARCHIS_BOARD_MODEL } from "./parchis/boardModel";

const TRACK_LENGTH = 68;
const FINAL_LANE_STEPS = 8;
const GOAL_PROGRESS = TRACK_LENGTH + FINAL_LANE_STEPS;
const PIECES_PER_PLAYER = 4;
const INITIAL_TRACK_PIECES = 0;
const MAX_LOG_LINES = 14;
const HUMAN_PLAYER_ID = "human";
const HUMAN_DICE_ROLL_DURATION_MS = 980;
const HUMAN_DICE_ROLL_PULSE_MS = 110;
const AI_DICE_ROLL_DURATION_MS = 2280;
const AI_DICE_ROLL_PULSE_MS = 170;
const AI_THINK_JITTER_MS = 260;
const PLAYER_COLOR_ORDER = ["red", "blue", "yellow", "green"];

const START_INDEX_BY_COLOR = {
  red: 0,
  blue: 17,
  yellow: 34,
  green: 51
};

const SHORT_BY_COLOR = {
  red: "R",
  blue: "B",
  yellow: "Y",
  green: "G"
};

const SAFE_TRACK_INDEXES = new Set([0, 5, 12, 17, 22, 29, 34, 39, 46, 51, 56, 63]);

const TURN_ORDER = [HUMAN_PLAYER_ID, "ai-blue", "ai-yellow", "ai-green"];
const NEXT_PLAYER_BY_ID = Object.fromEntries(
  TURN_ORDER.map((playerId, index) => [playerId, TURN_ORDER[(index + 1) % TURN_ORDER.length]])
);
const AI_PLAYER_IDS = TURN_ORDER.filter((playerId) => playerId !== HUMAN_PLAYER_ID);
const isAiPlayer = (playerId) => AI_PLAYER_IDS.includes(playerId);
const getDiceRollProfile = (ownerId) => (
  isAiPlayer(ownerId)
    ? { durationMs: AI_DICE_ROLL_DURATION_MS, pulseMs: AI_DICE_ROLL_PULSE_MS }
    : { durationMs: HUMAN_DICE_ROLL_DURATION_MS, pulseMs: HUMAN_DICE_ROLL_PULSE_MS }
);
const getOpponentIds = (ownerId) => TURN_ORDER.filter((playerId) => playerId !== ownerId);
const getNextTurnId = (ownerId) => NEXT_PLAYER_BY_ID[ownerId] || TURN_ORDER[0];
const normalizeHumanColor = (color) => (PLAYER_COLOR_ORDER.includes(color) ? color : "red");
const getOwnerColor = (ownerId) => PLAYER_BY_ID[ownerId]?.color || "red";
const createPlayerSetup = (humanColor = "red") => {
  const selected = normalizeHumanColor(humanColor);
  const remainingColors = PLAYER_COLOR_ORDER.filter((color) => color !== selected);
  const colorsById = {
    [HUMAN_PLAYER_ID]: selected,
    "ai-blue": remainingColors[0],
    "ai-yellow": remainingColors[1],
    "ai-green": remainingColors[2]
  };
  return TURN_ORDER.map((id) => {
    const color = colorsById[id] || "red";
    return {
      id,
      short: SHORT_BY_COLOR[color] || "?",
      color,
      startIndex: START_INDEX_BY_COLOR[color] ?? 0
    };
  });
};
let PLAYERS = createPlayerSetup("red");
let PLAYER_BY_ID = Object.fromEntries(PLAYERS.map((player) => [player.id, player]));
const applyPlayerSetup = (humanColor = "red") => {
  PLAYERS = createPlayerSetup(humanColor);
  PLAYER_BY_ID = Object.fromEntries(PLAYERS.map((player) => [player.id, player]));
  return PLAYERS;
};
const createLastRollByOwner = () => Object.fromEntries(TURN_ORDER.map((playerId) => [playerId, [null, null]]));

const AI_LEVELS = {
  easy: {
    id: "easy",
    thinkMs: 680,
    captureWeight: 65,
    goalWeight: 85,
    enterWeight: 26,
    safeWeight: 10,
    barrierWeight: 12,
    positionWeight: 0.18,
    threatWeight: 3,
    exposureWeight: 0.2
  },
  medium: {
    id: "medium",
    thinkMs: 1020,
    captureWeight: 145,
    goalWeight: 165,
    enterWeight: 58,
    safeWeight: 22,
    barrierWeight: 36,
    positionWeight: 0.36,
    threatWeight: 8,
    exposureWeight: 0.42
  },
  hard: {
    id: "hard",
    thinkMs: 1360,
    captureWeight: 210,
    goalWeight: 240,
    enterWeight: 64,
    safeWeight: 32,
    barrierWeight: 54,
    positionWeight: 0.62,
    threatWeight: 14,
    exposureWeight: 0.7
  }
};

const PARCHIS_COPY = {
  es: {
    players: {
      human: "Tu",
      "ai-blue": "IA A",
      "ai-yellow": "IA B",
      "ai-green": "IA C"
    },
    colors: {
      red: "Rojo",
      blue: "Azul",
      yellow: "Amarillo",
      green: "Verde"
    },
    aiLevels: {
      easy: "Facil",
      medium: "Media",
      hard: "Dificil"
    },
    rulesPrompt: `PARCHIS LUDOTEKA (ADAPTACION EN ESTA IMPLEMENTACION)
- Modalidad activa: Individual a 4 (tu color es seleccionable antes de iniciar).
- Salida inicial: las 4 fichas comienzan en casa (circulos de color).
- Objetivo: completar el recorrido con las 4 fichas antes que cualquier rival.

REGLAS IMPLEMENTADAS
- Si sale 5 en cualquiera de los dos dados mostrados y tienes fichas en casa, debes sacar una obligatoriamente.
- Si sale 5 y otro valor (ej. 5 y 3), primero sale ficha obligatoria y luego se aplica el otro dado.
- Si la salida obligatoria con 5 no se puede ejecutar porque la salida esta bloqueada por una pared propia, se juega con el otro dado (o con el principal si procede) en lugar de perder el turno.
- Cuando salen dobles y no aplica salida obligatoria ni suma por ficha unica activa, se juega dos veces ese mismo valor (una por cada dado) y despues hay turno extra por dobles.
- Si no hay salida obligatoria y solo tienes una ficha activa en tablero, se aplica la suma de ambos dados en un unico movimiento (ej. 6 + 4 = 10). Si la suma no tiene jugada legal, se usa el dado principal.
- Las fichas avanzan por recorrido comun y luego entran al pasillo final de su color.
- Si sale 6 y todas tus fichas estan fuera de casa, ese 6 avanza 7 casillas.
- Cualquier doble (mismo numero en ambos dados) concede turno extra.
- Maximo 2 fichas por casilla.
- No puedes atravesar barreras (2 fichas del mismo color en la misma casilla).
- Para llegar a meta necesitas numero exacto.
- Al coronar una ficha, obtienes bono de +10 con otra ficha.
- Al comer ficha rival, obtienes bono de +20 con otra ficha.
- Casillas seguras: no permiten captura normal.
- En casilla de salida, al sacar ficha puedes capturar rival aunque sea segura.
- Tres dobles 6 consecutivos: el tercer movimiento se cancela y la ficha movida con el segundo doble 6 vuelve a casa (salvo si ya estaba en pasillo final).
- Si no hay jugadas legales, no se mueve.

IA POR DIFICULTAD
- Facil: decisiones mas aleatorias y menos proteccion defensiva.
- Media: heuristica tactica (capturas, progreso, seguridad y barreras).
- Dificil: heuristica avanzada + estimacion de amenaza futura de todos los rivales.

FUERA DE ALCANCE EN ESTE COMPONENTE
- Modalidades por parejas, 1 contra 1 con dos colores, parchis de 6 fichas y tablero 3 contra 3 de 6 colores.
- Vista previa del dado y lobbies avanzados externos.`,
    ui: {
      ready: "Partida lista. Pulsa Iniciar partida.",
      startMatch: "Iniciar partida",
      restartMatch: "Reiniciar partida",
      gameTitle: "Parchis Ludoteka Arena",
      gameSubtitle: "Implementacion individual a 4 (Tu + 3 IAs), con eleccion de color y reglas clave de Ludoteka.",
      aiDifficulty: "Dificultad IA",
      playerColor: "Color de tus fichas",
      controls:
        "Controles: S/Enter inicia, R/Enter/Space tira dado, 1..9 para jugada, Enter confirma la seleccion, X continuar sin jugada y N reiniciar.",
      statusRolling: "Tirada en curso",
      statusAwaitStart: "Pendiente de inicio",
      statusAwaitRoll: "Esperando tirada",
      statusAwaitAction: "Esperando jugada",
      statusClosed: "Partida cerrada",
      turn: "Turno",
      dice: "Dados",
      move: "Movimiento",
      sixStreak: "Racha doble 6",
      aiLevel: "Nivel IA",
      pendingBonus: "Bono pendiente",
      aiThinking: "IA pensando...",
      rollingFor: "Tirando",
      redStart: "Salida roja",
      blueStart: "Salida azul",
      yellowStart: "Salida amarilla",
      greenStart: "Salida verde",
      safeCells: "Seguros",
      safeCellsValue: "casillas resaltadas",
      interaction: "Interaccion",
      interactionValue: "casillas y fichas soportan clic + Enter/Espacio",
      currentRoll: "Tirada actual",
      rollResolved: "Tirada resuelta",
      rollingNow: (player) => `Lanzando ${player}...`,
      latestRolls: "Ultimas tiradas",
      home: "Casa",
      active: "En juego",
      goal: "Meta",
      rematch: "Revancha",
      youWon: "Ganaste la partida.",
      pressStart: "Pulsa Iniciar partida para comenzar. (Atajo: S o Enter)",
      rollDice: "Tirar dado",
      selectedPiece: (pieceRef) => `Ficha seleccionada: ${pieceRef}. Elige una accion para previsualizar su destino.`,
      selectedAction: (actionText) => `Accion preseleccionada: ${actionText}. Pulsa de nuevo la accion, la ficha o Enter para confirmarla.`,
      selectPieceFirst: "Selecciona una accion de la lista o una ficha del tablero para previsualizar su destino.",
      moveSelected: "Confirmar accion seleccionada",
      continueNoMove: "Continuar (sin jugada legal)",
      aiTurnWait: (player, thinking) => `Turno de ${player}. ${thinking ? "Analizando jugada..." : "Resolviendo..."}`,
      rulesSummary: "Reglas activas de parchis (prompt base)"
    },
    msg: {
      startTurn: (player) => `Partida iniciada. Turno para ${player}.`,
      noBonusMove: (bonus) => `No hay jugada legal para el bono de +${bonus}.`,
      noEntryMove: "No puedes sacar ficha con 5 porque la salida esta bloqueada.",
      noMove: (steps) => `No hay movimiento legal con ${steps}.`,
      noValidPenaltyPiece: "No hay ficha valida para penalizar.",
      returnsHomePenalty: (pieceRef) => `${pieceRef} vuelve a casa por tercer 6 consecutivo.`,
      laneSafePenalty: (pieceRef) => `${pieceRef} se salva de la penalizacion por estar en pasillo final.`,
      tripleSixSummary: (detail) => `Tercer doble 6 consecutivo: se cancela el movimiento. ${detail}`,
      queuedDie: (dieValue, steps) => `Se aplica el dado pendiente (${dieValue})${steps !== dieValue ? ` como ${steps}` : ""}.`,
      winner: (player) => `${player} completa sus 4 fichas y gana la partida.`,
      bonusCapture: (player) => `${player} obtiene bono +20 por captura.`,
      bonusGoal: (player) => `${player} obtiene bono +10 por coronar.`,
      blockedExitQueued: (dieValue, steps) =>
        `Salida bloqueada por pared en la salida. Se aplica el otro dado (${dieValue})${steps !== dieValue ? ` como ${steps}` : ""}.`,
      blockedExitPrimary: (steps) => `Salida bloqueada por pared en la salida. Se juega con ${steps}.`,
      rollText: (die, auxDie, isDouble, notes) =>
        `Dados ${die} y ${auxDie}${isDouble ? " (dobles)" : ""}${notes.length ? `. ${notes.join(". ")}` : "."}`,
      rollNoteSingleActive: (primary, secondary, steps) => `ficha unica activa: ${primary} + ${secondary} = ${steps}`,
      rollNoteSixAsSeven: "se aplica avance de 7",
      rollNoteSumFallback: (steps) => `sin jugada legal para la suma, se aplica ${steps}`,
      rollLog: (player, rollText) => `${player} tira: ${rollText}`,
      actionLog: (player, actionText) => `${player}: ${actionText}.`,
      configChanged: (label) => `Dificultad IA cambiada a ${label}.`,
      configLog: (label) => `Configuracion: IA ${label}.`
    },
    action: {
      goal: "meta",
      lane: (step) => `pasillo ${step}`,
      track: (index) => `C${index}`,
      opponent: "rival",
      enter: (pieceRef, targetText) => `Sacar ${pieceRef} a salida (${targetText})`,
      enterCapture: (pieceRef, targetText, capturedRef) => `Sacar ${pieceRef} a salida (${targetText}) y comer ${capturedRef}`,
      move: (pieceRef, steps, targetText) => `Mover ${pieceRef} +${steps} a ${targetText}`,
      moveCapture: (pieceRef, steps, targetText, capturedRef) => `Mover ${pieceRef} +${steps} a ${targetText} y comer ${capturedRef}`,
      moveGoal: (pieceRef, steps, targetText) => `Mover ${pieceRef} +${steps} a ${targetText} (corona)`
    }
  },
  en: {
    players: {
      human: "You",
      "ai-blue": "AI A",
      "ai-yellow": "AI B",
      "ai-green": "AI C"
    },
    colors: {
      red: "Red",
      blue: "Blue",
      yellow: "Yellow",
      green: "Green"
    },
    aiLevels: {
      easy: "Easy",
      medium: "Medium",
      hard: "Hard"
    },
    rulesPrompt: `PARCHIS LUDOTEKA (IMPLEMENTED VARIANT)
- Active mode: 4-player solo (your color is selectable before match start).
- Initial setup: all 4 tokens start at home.
- Objective: complete the route with all 4 tokens before any rival.

IMPLEMENTED RULES
- If either die shows 5 and you still have home tokens, you must bring one out.
- If a 5 appears with another value (for example 5 and 3), mandatory exit is resolved first, then the other die is applied.
- If mandatory exit with 5 cannot be performed because your own barrier blocks the start square, the turn continues with the other die (or primary die when needed) instead of losing the turn.
- On doubles, when mandatory exit and single-active-token sum are not applied, the same value is played twice (once per die), then the extra turn for doubles is still granted.
- If there is no mandatory exit and you have exactly one active token, both dice are summed into one move (for example 6 + 4 = 10). If the sum has no legal move, primary die value is used.
- Tokens move through the shared track and then into their own final lane.
- If die shows 6 and all your tokens are already out of home, that 6 is played as 7.
- Any doubles grant an extra turn.
- Max 2 tokens per square.
- Barriers (2 same-color tokens in one square) cannot be crossed.
- Exact value is required to reach goal.
- Reaching goal grants a +10 bonus move with another token.
- Capturing an opponent grants a +20 bonus move with another token.
- Safe squares cannot be captured normally.
- On a start square, bringing a token out may capture an opponent even on a safe square.
- Three consecutive double 6s: third move is canceled and the token moved on the second double 6 goes back home (unless it is already in final lane).
- If no legal move exists, nothing moves.

AI DIFFICULTY
- Easy: more random decisions and weaker defense.
- Medium: tactical heuristics (captures, progress, safety, barriers).
- Hard: advanced heuristics plus future-threat estimation across rivals.

OUT OF SCOPE
- Team modes, 1v1 with two colors, 6-token parchis, and 3v3 six-color boards.
- Advanced lobby features and pre-roll previews.`,
    ui: {
      ready: "Match ready. Press Start match.",
      startMatch: "Start match",
      restartMatch: "Restart match",
      gameTitle: "Parchis Ludoteka Arena",
      gameSubtitle: "4-player solo implementation (You + 3 AIs), with color selection and key Ludoteka-inspired rules.",
      aiDifficulty: "AI difficulty",
      playerColor: "Your token color",
      controls:
        "Controls: S/Enter starts, R/Enter/Space rolls, 1..9 picks move, Enter confirms selection, X continues without move, N restarts.",
      statusRolling: "Rolling",
      statusAwaitStart: "Awaiting start",
      statusAwaitRoll: "Awaiting roll",
      statusAwaitAction: "Awaiting move",
      statusClosed: "Match closed",
      turn: "Turn",
      dice: "Dice",
      move: "Move",
      sixStreak: "Double-6 streak",
      aiLevel: "AI level",
      pendingBonus: "Pending bonus",
      aiThinking: "AI thinking...",
      rollingFor: "Rolling for",
      redStart: "Red start",
      blueStart: "Blue start",
      yellowStart: "Yellow start",
      greenStart: "Green start",
      safeCells: "Safe cells",
      safeCellsValue: "highlighted squares",
      interaction: "Interaction",
      interactionValue: "squares and tokens support click + Enter/Space",
      currentRoll: "Current roll",
      rollResolved: "Roll resolved",
      rollingNow: (player) => `Rolling ${player}...`,
      latestRolls: "Latest rolls",
      home: "Home",
      active: "Active",
      goal: "Goal",
      rematch: "Rematch",
      youWon: "You won the match.",
      pressStart: "Press Start match to begin. (Shortcut: S or Enter)",
      rollDice: "Roll dice",
      selectedPiece: (pieceRef) => `Selected token: ${pieceRef}. Choose an action to preview its destination.`,
      selectedAction: (actionText) => `Action preselected: ${actionText}. Press the action again, the token, or Enter to confirm it.`,
      selectPieceFirst: "Select an action from the list or a token on the board to preview its destination.",
      moveSelected: "Confirm selected action",
      continueNoMove: "Continue (no legal move)",
      aiTurnWait: (player, thinking) => `${player}'s turn. ${thinking ? "Analyzing move..." : "Resolving..."}`,
      rulesSummary: "Active parchis rules (base prompt)"
    },
    msg: {
      startTurn: (player) => `Match started. Turn for ${player}.`,
      noBonusMove: (bonus) => `No legal move for +${bonus} bonus.`,
      noEntryMove: "You cannot bring a token out with 5 because start square is blocked.",
      noMove: (steps) => `No legal move with ${steps}.`,
      noValidPenaltyPiece: "No valid token available for penalty.",
      returnsHomePenalty: (pieceRef) => `${pieceRef} returns home on third consecutive double 6.`,
      laneSafePenalty: (pieceRef) => `${pieceRef} avoids penalty because it is in final lane.`,
      tripleSixSummary: (detail) => `Third consecutive double 6: move is canceled. ${detail}`,
      queuedDie: (dieValue, steps) => `Applying pending die (${dieValue})${steps !== dieValue ? ` as ${steps}` : ""}.`,
      winner: (player) => `${player} completes all 4 tokens and wins the match.`,
      bonusCapture: (player) => `${player} gets +20 bonus for a capture.`,
      bonusGoal: (player) => `${player} gets +10 bonus for reaching goal.`,
      blockedExitQueued: (dieValue, steps) =>
        `Mandatory exit blocked by own barrier at start. Applying the other die (${dieValue})${steps !== dieValue ? ` as ${steps}` : ""}.`,
      blockedExitPrimary: (steps) => `Mandatory exit blocked by own barrier at start. Playing ${steps}.`,
      rollText: (die, auxDie, isDouble, notes) =>
        `Dice ${die} and ${auxDie}${isDouble ? " (doubles)" : ""}${notes.length ? `. ${notes.join(". ")}` : "."}`,
      rollNoteSingleActive: (primary, secondary, steps) => `single active token: ${primary} + ${secondary} = ${steps}`,
      rollNoteSixAsSeven: "7-step advance applies",
      rollNoteSumFallback: (steps) => `sum has no legal move, using ${steps}`,
      rollLog: (player, rollText) => `${player} rolls: ${rollText}`,
      actionLog: (player, actionText) => `${player}: ${actionText}.`,
      configChanged: (label) => `AI difficulty changed to ${label}.`,
      configLog: (label) => `Settings: AI ${label}.`
    },
    action: {
      goal: "goal",
      lane: (step) => `lane ${step}`,
      track: (index) => `C${index}`,
      opponent: "opponent",
      enter: (pieceRef, targetText) => `Bring ${pieceRef} out to start (${targetText})`,
      enterCapture: (pieceRef, targetText, capturedRef) => `Bring ${pieceRef} out to start (${targetText}) and capture ${capturedRef}`,
      move: (pieceRef, steps, targetText) => `Move ${pieceRef} +${steps} to ${targetText}`,
      moveCapture: (pieceRef, steps, targetText, capturedRef) => `Move ${pieceRef} +${steps} to ${targetText} and capture ${capturedRef}`,
      moveGoal: (pieceRef, steps, targetText) => `Move ${pieceRef} +${steps} to ${targetText} (goal)`
    }
  }
};

const normalizeLocale = (locale) => (locale === "es" ? "es" : "en");
const getCopy = (locale) => PARCHIS_COPY[normalizeLocale(locale)] || PARCHIS_COPY.en;

const clampMs = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const randomInt = (maxExclusive) => (maxExclusive > 0 ? Math.floor(Math.random() * maxExclusive) : 0);
const rollDie = () => Math.floor(Math.random() * 6) + 1;

const appendLog = (logs, line) => [line, ...logs].slice(0, MAX_LOG_LINES);

const pieceCode = (piece) => `${PLAYER_BY_ID[piece.owner]?.short || "?"}${piece.slot}`;
const playerLabel = (playerId, locale = "es") => {
  const copy = getCopy(locale);
  const base = copy.players[playerId] || playerId;
  const color = PLAYER_BY_ID[playerId]?.color;
  const colorLabel = copy.colors?.[color];
  return colorLabel ? `${base} (${colorLabel})` : base;
};
const aiLevelLabel = (difficultyId, locale = "es") => getCopy(locale).aiLevels[difficultyId] || difficultyId;
const isSafeTrackIndex = (index) => SAFE_TRACK_INDEXES.has(index);

const progressToTrackIndex = (ownerId, progress) => {
  const player = PLAYER_BY_ID[ownerId];
  if (!player) return null;
  return ((player.startIndex - progress) % TRACK_LENGTH + TRACK_LENGTH) % TRACK_LENGTH;
};

const isPieceHome = (piece) => piece.progress == null && !piece.finished;
const isPieceInTrack = (piece) => piece.progress != null && !piece.finished && piece.progress < TRACK_LENGTH;
const isPieceInLane = (piece) =>
  piece.progress != null && !piece.finished && piece.progress >= TRACK_LENGTH && piece.progress < GOAL_PROGRESS;
const isPieceFinished = (piece) => Boolean(piece.finished);

const getLaneStep = (piece) => (isPieceInLane(piece) ? piece.progress - TRACK_LENGTH + 1 : null);

const getTrackOccupants = (state, trackIndex, excludePieceId = null) => {
  const occupants = [];
  for (const piece of state.pieces) {
    if (excludePieceId && piece.id === excludePieceId) continue;
    if (!isPieceInTrack(piece)) continue;
    const index = progressToTrackIndex(piece.owner, piece.progress);
    if (index === trackIndex) occupants.push(piece);
  }
  return occupants;
};

const getLaneOccupants = (state, ownerId, laneProgress, excludePieceId = null) => {
  const occupants = [];
  for (const piece of state.pieces) {
    if (excludePieceId && piece.id === excludePieceId) continue;
    if (piece.owner !== ownerId) continue;
    if (!isPieceInLane(piece)) continue;
    if (piece.progress === laneProgress) occupants.push(piece);
  }
  return occupants;
};

const isBarrier = (pieces) => pieces.length >= 2 && pieces.every((piece) => piece.owner === pieces[0].owner);
const isTrackBarrier = (state, trackIndex, excludePieceId = null) => isBarrier(getTrackOccupants(state, trackIndex, excludePieceId));
const isLaneBarrier = (state, ownerId, laneProgress, excludePieceId = null) =>
  isBarrier(getLaneOccupants(state, ownerId, laneProgress, excludePieceId));

const countPieces = (state, ownerId) => state.pieces.filter((piece) => piece.owner === ownerId);
const countHomePieces = (state, ownerId) => countPieces(state, ownerId).filter(isPieceHome).length;
const countFinishedPieces = (state, ownerId) => countPieces(state, ownerId).filter(isPieceFinished).length;
const countActivePieces = (state, ownerId) =>
  countPieces(state, ownerId).filter((piece) => !isPieceHome(piece) && !isPieceFinished(piece)).length;
const allPiecesOutOfHome = (state, ownerId) => countHomePieces(state, ownerId) === 0;
const moveStepsFromDie = (state, ownerId, die) => (die === 6 && allPiecesOutOfHome(state, ownerId) ? 7 : die);

const resolveRollSetup = (state, ownerId, die, auxDie) => {
  const mandatoryEntry = (die === 5 || auxDie === 5) && countHomePieces(state, ownerId) > 0;
  const primarySteps = moveStepsFromDie(state, ownerId, die);
  const secondarySteps = moveStepsFromDie(state, ownerId, auxDie);

  if (mandatoryEntry) {
    let queuedDiceValues = [];
    if (die === 5 && auxDie === 5) queuedDiceValues = [5];
    else if (die === 5) queuedDiceValues = [auxDie];
    else queuedDiceValues = [die];

    return {
      mandatoryEntry: true,
      steps: 5,
      queuedDiceValues,
      combinedMove: false,
      primarySteps,
      secondarySteps
    };
  }

  const combinedMove = countActivePieces(state, ownerId) === 1;
  const splitDoubleMove = !combinedMove && die === auxDie;
  return {
    mandatoryEntry: false,
    steps: combinedMove ? primarySteps + secondarySteps : primarySteps,
    queuedDiceValues: splitDoubleMove ? [auxDie] : [],
    combinedMove,
    primarySteps,
    secondarySteps
  };
};

const clonePieces = (pieces) => pieces.map((piece) => ({ ...piece }));

const createInitialState = (difficultyId = "medium", locale = "es", humanColor = "red") => {
  const normalizedLocale = normalizeLocale(locale);
  const normalizedColor = normalizeHumanColor(humanColor);
  const players = applyPlayerSetup(normalizedColor);
  const copy = getCopy(normalizedLocale);
  const pieces = [];
  let stamp = 0;
  for (const player of players) {
    for (let slot = 1; slot <= PIECES_PER_PLAYER; slot += 1) {
      const startsOnTrack = slot <= INITIAL_TRACK_PIECES;
      pieces.push({
        id: `${player.id}-${slot}`,
        owner: player.id,
        slot,
        progress: startsOnTrack ? 0 : null,
        finished: false,
        stamp: startsOnTrack ? (stamp += 1) : 0
      });
    }
  }

  return {
    locale: normalizedLocale,
    humanColor: normalizedColor,
    phase: "await-start",
    turn: HUMAN_PLAYER_ID,
    turnCount: 1,
    pieces,
    moveCounter: stamp,
    difficultyId,
    dice: null,
    diceAux: null,
    steps: null,
    rollWasSix: false,
    sixStreak: 0,
    sixMovedPieceIds: [],
    queuedDiceValues: [],
    mandatoryEntry: false,
    pendingBonus: null,
    pendingBonusSource: null,
    winner: null,
    lastMovePieceId: null,
    slowMoveTransitionPieceId: null,
    message: copy.ui.ready,
    logs: [copy.ui.ready]
  };
};

const pieceById = (state, pieceId) => state.pieces.find((piece) => piece.id === pieceId) || null;

const describeTarget = (action, locale = "es") => {
  const copy = getCopy(locale);
  if (action.destinationType === "goal") return copy.action.goal;
  if (action.destinationType === "lane") return copy.action.lane(action.targetLaneStep);
  if (action.destinationType === "track") return copy.action.track(action.targetTrackIndex);
  return copy.action.goal;
};

const describeAction = (state, action) => {
  const locale = state?.locale || "es";
  const copy = getCopy(locale);
  const piece = pieceById(state, action.pieceId);
  const ref = piece ? pieceCode(piece) : action.pieceId;
  if (action.type === "enter") {
    if (action.capturePieceId) {
      const captured = pieceById(state, action.capturePieceId);
      return copy.action.enterCapture(ref, describeTarget(action, locale), captured ? pieceCode(captured) : "opponent");
    }
    return copy.action.enter(ref, describeTarget(action, locale));
  }
  const base = copy.action.move(ref, action.steps, describeTarget(action, locale));
  if (action.capturePieceId) {
    const captured = pieceById(state, action.capturePieceId);
    return copy.action.moveCapture(ref, action.steps, describeTarget(action, locale), captured ? pieceCode(captured) : "opponent");
  }
  if (action.reachesGoal) return copy.action.moveGoal(ref, action.steps, describeTarget(action, locale));
  return base;
};

const evaluateEnterAction = (state, ownerId, piece) => {
  if (!piece || piece.owner !== ownerId || !isPieceHome(piece)) return null;
  const startIndex = PLAYER_BY_ID[ownerId].startIndex;
  const occupants = getTrackOccupants(state, startIndex, piece.id);

  if (occupants.length >= 2) {
    const enemies = occupants.filter((entry) => entry.owner !== ownerId);
    if (!enemies.length) return null;
    const captureTarget = enemies.reduce((latest, current) => (current.stamp > latest.stamp ? current : latest), enemies[0]);
    return {
      id: `enter-${piece.id}`,
      type: "enter",
      pieceId: piece.id,
      ownerId,
      steps: 5,
      destinationType: "track",
      targetProgress: 0,
      targetTrackIndex: startIndex,
      targetLaneStep: null,
      capturePieceId: captureTarget.id,
      reachesGoal: false,
      createsBarrier: occupants.some((entry) => entry.owner === ownerId),
      landingSafe: true
    };
  }

  const enemy = occupants.find((entry) => entry.owner !== ownerId);
  return {
    id: `enter-${piece.id}`,
    type: "enter",
    pieceId: piece.id,
    ownerId,
    steps: 5,
    destinationType: "track",
    targetProgress: 0,
    targetTrackIndex: startIndex,
    targetLaneStep: null,
    capturePieceId: enemy?.id || null,
    reachesGoal: false,
    createsBarrier: occupants.some((entry) => entry.owner === ownerId),
    landingSafe: true
  };
};

const evaluateMoveAction = (state, ownerId, piece, steps) => {
  if (!piece || piece.owner !== ownerId || isPieceHome(piece) || isPieceFinished(piece)) return null;
  const startProgress = piece.progress;
  const destination = startProgress + steps;
  if (destination > GOAL_PROGRESS) return null;

  for (let offset = 1; offset <= steps; offset += 1) {
    const progress = startProgress + offset;
    if (progress <= TRACK_LENGTH - 1) {
      const trackIndex = progressToTrackIndex(ownerId, progress);
      if (offset < steps && isTrackBarrier(state, trackIndex, piece.id)) return null;
    } else if (progress < GOAL_PROGRESS) {
      if (offset < steps && isLaneBarrier(state, ownerId, progress, piece.id)) return null;
    }
  }

  if (destination <= TRACK_LENGTH - 1) {
    const trackIndex = progressToTrackIndex(ownerId, destination);
    const occupants = getTrackOccupants(state, trackIndex, piece.id);
    if (occupants.length >= 2) return null;

    let capturePieceId = null;
    if (occupants.length === 1 && occupants[0].owner !== ownerId && !isSafeTrackIndex(trackIndex)) {
      capturePieceId = occupants[0].id;
    }

    return {
      id: `move-${piece.id}-${destination}`,
      type: "move",
      pieceId: piece.id,
      ownerId,
      steps,
      destinationType: "track",
      targetProgress: destination,
      targetTrackIndex: trackIndex,
      targetLaneStep: null,
      capturePieceId,
      reachesGoal: false,
      createsBarrier: occupants.length === 1 && occupants[0].owner === ownerId,
      landingSafe: isSafeTrackIndex(trackIndex)
    };
  }

  if (destination < GOAL_PROGRESS) {
    const occupants = getLaneOccupants(state, ownerId, destination, piece.id);
    if (occupants.length >= 2) return null;
    return {
      id: `move-${piece.id}-${destination}`,
      type: "move",
      pieceId: piece.id,
      ownerId,
      steps,
      destinationType: "lane",
      targetProgress: destination,
      targetTrackIndex: null,
      targetLaneStep: destination - TRACK_LENGTH + 1,
      capturePieceId: null,
      reachesGoal: false,
      createsBarrier: occupants.length === 1,
      landingSafe: true
    };
  }

  return {
    id: `move-${piece.id}-goal`,
    type: "move",
    pieceId: piece.id,
    ownerId,
    steps,
    destinationType: "goal",
    targetProgress: GOAL_PROGRESS,
    targetTrackIndex: null,
    targetLaneStep: null,
    capturePieceId: null,
    reachesGoal: true,
    createsBarrier: false,
    landingSafe: true
  };
};

const getActionSteps = (state) => state.pendingBonus ?? state.steps ?? 0;

const getLegalActions = (state, ownerId) => {
  if (state.phase !== "await-action" || state.turn !== ownerId) return [];
  const steps = getActionSteps(state);
  if (steps <= 0) return [];

  const ownerPieces = state.pieces.filter((piece) => piece.owner === ownerId);
  const homePieces = ownerPieces.filter(isPieceHome);
  const mandatoryEntry = state.pendingBonus == null && state.mandatoryEntry && homePieces.length > 0;
  const actions = [];

  if (mandatoryEntry) {
    for (const piece of homePieces) {
      const action = evaluateEnterAction(state, ownerId, piece);
      if (action) actions.push(action);
    }
    return actions;
  }

  for (const piece of ownerPieces) {
    if (isPieceHome(piece)) continue;
    if (isPieceFinished(piece)) continue;
    const action = evaluateMoveAction(state, ownerId, piece, steps);
    if (action) actions.push(action);
  }

  return actions;
};

const resolveBlockedMandatoryEntryState = (state, ownerId) => {
  if (state.pendingBonus != null || !state.mandatoryEntry) return { nextState: state, note: null };

  const forcedEntryActions = getLegalActions(state, ownerId);
  if (forcedEntryActions.length > 0) return { nextState: state, note: null };

  const queue = Array.isArray(state.queuedDiceValues) ? state.queuedDiceValues : [];
  const candidates = [];

  if (queue.length > 0) {
    const dieValue = queue[0];
    candidates.push({
      source: "queued",
      dieValue,
      steps: moveStepsFromDie(state, ownerId, dieValue)
    });
  }

  if (Number.isFinite(state.steps) && state.steps > 0) {
    candidates.push({
      source: "primary",
      dieValue: null,
      steps: state.steps
    });
  }

  for (const candidate of candidates) {
    const trial = {
      ...state,
      mandatoryEntry: false,
      queuedDiceValues: [],
      steps: candidate.steps
    };
    const actions = getLegalActions(trial, ownerId);
    if (actions.length > 0) {
      return {
        nextState: trial,
        note: candidate
      };
    }
  }

  const fallback = candidates[0];
  if (!fallback) {
    return {
      nextState: {
        ...state,
        mandatoryEntry: false,
        queuedDiceValues: []
      },
      note: null
    };
  }

  return {
    nextState: {
      ...state,
      mandatoryEntry: false,
      queuedDiceValues: [],
      steps: fallback.steps
    },
    note: fallback
  };
};

const getTrackDistance = (fromIndex, toIndex) => ((fromIndex - toIndex + TRACK_LENGTH) % TRACK_LENGTH);

const countThreatenedTrackPieces = (state, ownerId) => {
  const opponents = state.pieces.filter((piece) => piece.owner !== ownerId && isPieceInTrack(piece));
  const ownTargets = state.pieces.filter(
    (piece) => piece.owner === ownerId && isPieceInTrack(piece) && !isSafeTrackIndex(progressToTrackIndex(piece.owner, piece.progress))
  );
  let threatened = 0;

  for (const target of ownTargets) {
    const targetIndex = progressToTrackIndex(target.owner, target.progress);
    const isThreatened = opponents.some((enemy) => {
      const enemyIndex = progressToTrackIndex(enemy.owner, enemy.progress);
      const distance = getTrackDistance(enemyIndex, targetIndex);
      return distance >= 1 && distance <= 7;
    });
    if (isThreatened) threatened += 1;
  }
  return threatened;
};

const estimatePieceExposure = (state, ownerId, pieceId) => {
  const piece = pieceById(state, pieceId);
  if (!piece || piece.owner !== ownerId || !isPieceInTrack(piece)) return 0;

  const targetIndex = progressToTrackIndex(ownerId, piece.progress);
  if (targetIndex == null || isSafeTrackIndex(targetIndex)) return 0;

  const opponents = state.pieces.filter((entry) => entry.owner !== ownerId && isPieceInTrack(entry));
  let risk = 0;

  for (const enemy of opponents) {
    const enemyIndex = progressToTrackIndex(enemy.owner, enemy.progress);
    const distance = getTrackDistance(enemyIndex, targetIndex);
    if (distance >= 1 && distance <= 6) {
      risk += (7 - distance) * 1.85;
    } else if (distance === 7) {
      risk += 0.5;
    }
  }

  for (const opponentId of getOpponentIds(ownerId)) {
    if (countHomePieces(state, opponentId) <= 0) continue;
    const enemyStartIndex = PLAYER_BY_ID[opponentId]?.startIndex;
    if (enemyStartIndex == null) continue;
    const entryDistance = getTrackDistance(enemyStartIndex, targetIndex);
    if (entryDistance === 5) risk += 5.5;
  }

  const alliedOnCell = getTrackOccupants(state, targetIndex, piece.id).some((entry) => entry.owner === ownerId);
  if (alliedOnCell) risk *= 0.55;

  return risk;
};

const evaluatePosition = (state, ownerId) => {
  const scoreFor = (playerId) => {
    let total = 0;
    for (const piece of state.pieces) {
      if (piece.owner !== playerId) continue;
      if (isPieceFinished(piece)) {
        total += 420;
      } else if (isPieceHome(piece)) {
        total -= 28;
      } else if (isPieceInLane(piece)) {
        total += 165 + (piece.progress - TRACK_LENGTH + 1) * 14;
      } else {
        total += piece.progress * 4.4;
        const trackIndex = progressToTrackIndex(piece.owner, piece.progress);
        if (isSafeTrackIndex(trackIndex)) total += 10;
      }
    }
    total -= countThreatenedTrackPieces(state, playerId) * 12;
    return total;
  };

  const ownerScore = scoreFor(ownerId);
  const opponentIds = getOpponentIds(ownerId);
  if (!opponentIds.length) return ownerScore;
  const averageOpponentScore = opponentIds.reduce((sum, opponentId) => sum + scoreFor(opponentId), 0) / opponentIds.length;
  return ownerScore - averageOpponentScore;
};

const makeHypotheticalRollState = (state, ownerId, die, auxDie) => {
  const isDouble = die === auxDie;
  const sixLike = isDouble && die === 6;
  const rollSetup = resolveRollSetup(state, ownerId, die, auxDie);

  const baseState = {
    ...state,
    turn: ownerId,
    phase: "await-action",
    dice: die,
    diceAux: auxDie,
    steps: rollSetup.steps,
    rollWasSix: isDouble,
    sixStreak: sixLike ? state.sixStreak + 1 : 0,
    queuedDiceValues: rollSetup.queuedDiceValues,
    mandatoryEntry: rollSetup.mandatoryEntry,
    pendingBonus: null,
    pendingBonusSource: null
  };

  if (rollSetup.mandatoryEntry) {
    return resolveBlockedMandatoryEntryState(baseState, ownerId).nextState;
  }

  if (!rollSetup.combinedMove) return baseState;
  if (getLegalActions(baseState, ownerId).length > 0) return baseState;

  return {
    ...baseState,
    steps: rollSetup.primarySteps
  };
};

const estimateOpponentRollPressure = (state, ownerId) => {
  let totalPressure = 0;
  for (let die = 1; die <= 6; die += 1) {
    for (let auxDie = 1; auxDie <= 6; auxDie += 1) {
      const hypothetical = makeHypotheticalRollState(state, ownerId, die, auxDie);
      const actions = getLegalActions(hypothetical, ownerId);
      if (!actions.length) continue;
      let best = -Infinity;
      for (const action of actions) {
        let score = 0;
        if (action.capturePieceId) score += 90;
        if (action.reachesGoal) score += 120;
        if (action.type === "enter") score += 32;
        if (action.createsBarrier) score += 20;
        best = Math.max(best, score);
      }
      totalPressure += best / 36;
    }
  }
  return totalPressure;
};

const estimateCombinedOpponentPressure = (state, ownerId) => {
  const opponentIds = getOpponentIds(ownerId);
  if (!opponentIds.length) return 0;
  const total = opponentIds.reduce((sum, opponentId) => sum + estimateOpponentRollPressure(state, opponentId), 0);
  return total / opponentIds.length;
};

const scoreAction = (state, action, ownerId, profile) => {
  let score = 0;
  if (action.capturePieceId) score += profile.captureWeight;
  if (action.reachesGoal) score += profile.goalWeight;
  if (action.type === "enter") score += profile.enterWeight;
  if (action.landingSafe) score += profile.safeWeight;
  if (action.createsBarrier) score += profile.barrierWeight;
  return score;
};

const passTurn = (state, reason) => ({
  ...state,
  turn: getNextTurnId(state.turn),
  turnCount: state.turnCount + 1,
  phase: "await-roll",
  dice: null,
  diceAux: null,
  steps: null,
  rollWasSix: false,
  sixStreak: 0,
  sixMovedPieceIds: [],
  queuedDiceValues: [],
  mandatoryEntry: false,
  pendingBonus: null,
  pendingBonusSource: null,
  message: reason
});

const continueExtraTurn = (state, reason) => ({
  ...state,
  phase: "await-roll",
  dice: null,
  diceAux: null,
  steps: null,
  rollWasSix: false,
  queuedDiceValues: [],
  mandatoryEntry: false,
  pendingBonus: null,
  pendingBonusSource: null,
  message: reason
});

const finishAfterResolvedMove = (state, actorId, reason) => {
  if (state.rollWasSix) {
    const suffix = normalizeLocale(state.locale) === "es" ? " Turno extra por dobles." : " Extra turn for doubles.";
    return continueExtraTurn(state, `${reason}${suffix}`);
  }
  return passTurn(state, reason);
};

const resolveNoLegalActions = (state, actorId) => {
  if (state.phase !== "await-action" || state.turn !== actorId) return state;
  const copy = getCopy(state.locale);

  const reason = state.pendingBonus != null
    ? copy.msg.noBonusMove(state.pendingBonus)
    : state.mandatoryEntry
      ? copy.msg.noEntryMove
      : copy.msg.noMove(getActionSteps(state));

  const withLog = {
    ...state,
    mandatoryEntry: false,
    queuedDiceValues: [],
    pendingBonus: state.pendingBonus != null ? null : state.pendingBonus,
    pendingBonusSource: state.pendingBonus != null ? null : state.pendingBonusSource,
    logs: appendLog(state.logs, `${playerLabel(actorId, state.locale)}: ${reason}`),
    message: reason
  };

  return finishAfterResolvedMove(withLog, actorId, reason);
};

const resolveTripleSixPenalty = (state, actorId) => {
  const copy = getCopy(state.locale);
  const pieces = clonePieces(state.pieces);
  const secondMovedPieceId = state.sixMovedPieceIds[1] || null;
  let movedBackText = copy.msg.noValidPenaltyPiece;

  if (secondMovedPieceId) {
    const piece = pieces.find((entry) => entry.id === secondMovedPieceId && entry.owner === actorId);
    if (piece && !piece.finished) {
      if (isPieceInTrack(piece)) {
        piece.progress = null;
        piece.finished = false;
        movedBackText = copy.msg.returnsHomePenalty(pieceCode(piece));
      } else if (isPieceInLane(piece)) {
        movedBackText = copy.msg.laneSafePenalty(pieceCode(piece));
      }
    }
  }

  const summary = copy.msg.tripleSixSummary(movedBackText);
  const nextState = {
    ...state,
    pieces,
    logs: appendLog(state.logs, `${playerLabel(actorId, state.locale)}: ${summary}`),
    message: summary
  };
  return passTurn(nextState, summary);
};

const activateQueuedDieMove = (state, actorId, simulate = false) => {
  const copy = getCopy(state.locale);
  const queue = Array.isArray(state.queuedDiceValues) ? state.queuedDiceValues : [];
  if (!queue.length) return null;

  const [dieValue, ...rest] = queue;
  const steps = moveStepsFromDie(state, actorId, dieValue);
  const text = copy.msg.queuedDie(dieValue, steps);

  const nextState = {
    ...state,
    phase: "await-action",
    steps,
    mandatoryEntry: false,
    queuedDiceValues: rest,
    message: text,
    logs: simulate ? state.logs : appendLog(state.logs, `${playerLabel(actorId, state.locale)}: ${text}`)
  };

  const actions = getLegalActions(nextState, actorId);
  if (!actions.length) {
    return resolveNoLegalActions(nextState, actorId);
  }

  return nextState;
};

const applyActionAndAdvance = (state, action, actorId, options = {}) => {
  const { simulate = false, slowMoveTransition = false } = options;
  const copy = getCopy(state.locale);
  if (state.phase !== "await-action" || state.turn !== actorId) return state;
  if (!action || action.ownerId !== actorId) return state;

  const pieces = clonePieces(state.pieces);
  const mover = pieces.find((piece) => piece.id === action.pieceId && piece.owner === actorId);
  if (!mover) return state;

  const wasDiceMove = state.pendingBonus == null;
  let moveCounter = state.moveCounter;
  const bumpStamp = (piece) => {
    moveCounter += 1;
    piece.stamp = moveCounter;
  };

  if (action.type === "enter") {
    mover.progress = 0;
    mover.finished = false;
    bumpStamp(mover);
  } else if (action.type === "move") {
    mover.progress = action.targetProgress;
    mover.finished = action.reachesGoal;
    bumpStamp(mover);
  } else {
    return state;
  }

  if (action.capturePieceId) {
    const captured = pieces.find((piece) => piece.id === action.capturePieceId);
    if (captured) {
      captured.progress = null;
      captured.finished = false;
    }
  }

  let sixMovedPieceIds = [...state.sixMovedPieceIds];
  if (wasDiceMove && state.dice === 6 && state.rollWasSix) {
    sixMovedPieceIds = [...sixMovedPieceIds, mover.id].slice(-2);
  }

  let logs = state.logs;
  let message = state.message;

  if (!simulate) {
    const actionText = describeAction(state, action);
    const line = copy.msg.actionLog(playerLabel(actorId, state.locale), actionText);
    logs = appendLog(state.logs, line);
    message = line;
  }

  const nextBase = {
    ...state,
    pieces,
    moveCounter,
    sixMovedPieceIds,
    lastMovePieceId: mover.id,
    slowMoveTransitionPieceId: slowMoveTransition ? mover.id : null,
    logs,
    message
  };

  if (countFinishedPieces(nextBase, actorId) >= PIECES_PER_PLAYER) {
    const winnerText = copy.msg.winner(playerLabel(actorId, state.locale));
    return {
      ...nextBase,
      winner: actorId,
      phase: "game-over",
      dice: null,
      diceAux: null,
      steps: null,
      rollWasSix: false,
      pendingBonus: null,
      pendingBonusSource: null,
      queuedDiceValues: [],
      mandatoryEntry: false,
      message: winnerText,
      logs: simulate ? nextBase.logs : appendLog(nextBase.logs, winnerText)
    };
  }

  let producedBonus = null;
  let producedSource = null;
  if (action.capturePieceId) {
    producedBonus = 20;
    producedSource = "capture";
  } else if (action.reachesGoal) {
    producedBonus = 10;
    producedSource = "goal";
  }

  if (producedBonus != null) {
    const text = producedSource === "capture"
      ? copy.msg.bonusCapture(playerLabel(actorId, state.locale))
      : copy.msg.bonusGoal(playerLabel(actorId, state.locale));
    return {
      ...nextBase,
      phase: "await-action",
      pendingBonus: producedBonus,
      pendingBonusSource: producedSource,
      mandatoryEntry: false,
      message: text,
      logs: simulate ? nextBase.logs : appendLog(nextBase.logs, text)
    };
  }

  const afterBonusClear = {
    ...nextBase,
    pendingBonus: null,
    pendingBonusSource: null,
    mandatoryEntry: false
  };

  const queuedState = activateQueuedDieMove(afterBonusClear, actorId, simulate);
  if (queuedState) return queuedState;

  return finishAfterResolvedMove(afterBonusClear, actorId, message);
};

const rollForPlayer = (state, actorId, forcedRoll = null) => {
  if (state.phase !== "await-roll" || state.turn !== actorId || state.winner) return state;
  const copy = getCopy(state.locale);
  let die = null;
  let auxDie = null;

  if (forcedRoll && typeof forcedRoll === "object") {
    const main = Number.isInteger(forcedRoll.main) && forcedRoll.main >= 1 && forcedRoll.main <= 6 ? forcedRoll.main : null;
    const aux = Number.isInteger(forcedRoll.aux) && forcedRoll.aux >= 1 && forcedRoll.aux <= 6 ? forcedRoll.aux : null;
    die = main ?? rollDie();
    auxDie = aux ?? rollDie();
  } else {
    die = Number.isInteger(forcedRoll) && forcedRoll >= 1 && forcedRoll <= 6 ? forcedRoll : rollDie();
    auxDie = rollDie();
  }

  const isDouble = die === auxDie;
  const isDoubleSix = isDouble && die === 6;

  if (isDoubleSix && state.sixStreak >= 2) {
    return resolveTripleSixPenalty(state, actorId);
  }

  const rollSetup = resolveRollSetup(state, actorId, die, auxDie);
  const sixStreak = isDoubleSix ? state.sixStreak + 1 : 0;
  const buildRollText = ({ steps, combinedMove, fallbackFromCombined = false }) => {
    const notes = [];
    if (combinedMove) {
      notes.push(copy.msg.rollNoteSingleActive(rollSetup.primarySteps, rollSetup.secondarySteps, steps));
    } else if (die === 6 && !rollSetup.mandatoryEntry && steps === 7) {
      notes.push(copy.msg.rollNoteSixAsSeven);
    }
    if (fallbackFromCombined) {
      notes.push(copy.msg.rollNoteSumFallback(steps));
    }
    return copy.msg.rollText(die, auxDie, isDouble, notes);
  };

  const rollText = buildRollText({
    steps: rollSetup.steps,
    combinedMove: rollSetup.combinedMove
  });
  let rolledState = {
    ...state,
    phase: "await-action",
    dice: die,
    diceAux: auxDie,
    steps: rollSetup.steps,
    rollWasSix: isDouble,
    sixStreak,
    queuedDiceValues: rollSetup.queuedDiceValues,
    mandatoryEntry: rollSetup.mandatoryEntry,
    pendingBonus: null,
    pendingBonusSource: null,
    message: rollText,
    logs: appendLog(state.logs, copy.msg.rollLog(playerLabel(actorId, state.locale), rollText))
  };

  let actions = getLegalActions(rolledState, actorId);
  if (!actions.length && rollSetup.mandatoryEntry) {
    const resolvedMandatory = resolveBlockedMandatoryEntryState(rolledState, actorId);
    rolledState = resolvedMandatory.nextState;
    actions = getLegalActions(rolledState, actorId);

    if (actions.length && resolvedMandatory.note) {
      const fallbackText = resolvedMandatory.note.source === "queued"
        ? copy.msg.blockedExitQueued(resolvedMandatory.note.dieValue, resolvedMandatory.note.steps)
        : copy.msg.blockedExitPrimary(resolvedMandatory.note.steps);
      rolledState = {
        ...rolledState,
        message: fallbackText,
        logs: appendLog(rolledState.logs, `${playerLabel(actorId, state.locale)}: ${fallbackText}`)
      };
    }
  }

  if (!actions.length && rollSetup.combinedMove) {
    const fallbackSteps = rollSetup.primarySteps;
    const fallbackText = buildRollText({
      steps: fallbackSteps,
      combinedMove: false,
      fallbackFromCombined: true
    });
    rolledState = {
      ...rolledState,
      steps: fallbackSteps,
      message: fallbackText,
      logs: appendLog(state.logs, copy.msg.rollLog(playerLabel(actorId, state.locale), fallbackText))
    };
    actions = getLegalActions(rolledState, actorId);
  }

  if (!actions.length) {
    return resolveNoLegalActions(rolledState, actorId);
  }
  return rolledState;
};

const pickAiAction = (state, actions, difficultyId, ownerId) => {
  if (!actions.length) return null;
  const level = AI_LEVELS[difficultyId] || AI_LEVELS.medium;

  if (level.id === "easy") {
    if (actions.length === 1) return actions[0];
    const soft = actions.filter((action) => !action.capturePieceId && !action.reachesGoal);
    if (soft.length && Math.random() < 0.58) {
      return soft[randomInt(soft.length)];
    }
    return actions[randomInt(actions.length)];
  }

  let bestAction = actions[0];
  let bestScore = -Infinity;

  for (const action of actions) {
    const immediate = scoreAction(state, action, ownerId, level);
    const nextState = applyActionAndAdvance(state, action, ownerId, { simulate: true });
    const positionScore = evaluatePosition(nextState, ownerId) * level.positionWeight;
    const threatPenalty = countThreatenedTrackPieces(nextState, ownerId) * level.threatWeight;
    const exposurePenalty = estimatePieceExposure(nextState, ownerId, action.pieceId) * level.exposureWeight;
    let score = immediate + positionScore - threatPenalty - exposurePenalty;

    if (level.id === "hard") {
      const pressure = estimateCombinedOpponentPressure(nextState, ownerId);
      score -= pressure;
      if (nextState.turn === ownerId) {
        score += 22;
      }
    }

    score += Math.random() * (level.id === "hard" ? 0.2 : 0.8);
    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  }

  return bestAction;
};

const DIE_PIPS = {
  1: [[28, 28]],
  2: [[14, 14], [42, 42]],
  3: [[14, 14], [28, 28], [42, 42]],
  4: [[14, 14], [42, 14], [14, 42], [42, 42]],
  5: [[14, 14], [42, 14], [28, 28], [14, 42], [42, 42]],
  6: [[14, 12], [42, 12], [14, 28], [42, 28], [14, 44], [42, 44]]
};

function SvgDie({ value, rolling, size = 56, idSuffix, slotIndex = 0, aiActive = false }) {
  const pips = DIE_PIPS[value] || DIE_PIPS[1];
  const gradientId = `die-grad-${idSuffix}`;
  const shadowId = `die-shadow-${idSuffix}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      className={`parchis-svg-die die-slot-${slotIndex}${rolling ? " rolling" : ""}${aiActive ? " ai-active" : ""}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8e8e8" />
        </linearGradient>
        <filter id={shadowId}>
          <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.3" />
        </filter>
      </defs>
      <rect
        className="die-face"
        x="3"
        y="3"
        width="50"
        height="50"
        rx="9"
        ry="9"
        fill={`url(#${gradientId})`}
        filter={`url(#${shadowId})`}
        stroke="#ccc"
        strokeWidth="1"
      />
      {pips.map(([cx, cy], index) => (
        <circle className="die-pip" key={`${idSuffix}-pip-${index}`} cx={cx} cy={cy} r="5" fill="#1a1a2e" />
      ))}
    </svg>
  );
}

function ParchisStrategyGame() {
  const locale = useMemo(resolveBrowserLanguage, []);
  const [state, setState] = useState(() => createInitialState("medium", locale));
  const [aiThinking, setAiThinking] = useState(false);
  const [selectedPieceId, setSelectedPieceId] = useState(null);
  const [selectedActionId, setSelectedActionId] = useState(null);
  const [diceUi, setDiceUi] = useState(() => ({
    rolling: false,
    activeOwner: null,
    faces: [1, 1],
    lastByOwner: createLastRollByOwner()
  }));

  const aiPendingRef = useRef(false);
  const aiDelayRef = useRef(0);
  const rollPendingRef = useRef(false);
  const rollOwnerRef = useRef(null);
  const rollDelayRef = useRef(0);
  const rollPulseRef = useRef(0);
  const rollPulseStepRef = useRef(HUMAN_DICE_ROLL_PULSE_MS);
  const autoMovePendingRef = useRef(false);
  const autoMoveMsRef = useRef(0);
  const autoMoveActionIdRef = useRef(null);
  const frameRef = useRef(0);
  const lastFrameRef = useRef(0);

  const stopAiThinking = useCallback(() => {
    aiPendingRef.current = false;
    aiDelayRef.current = 0;
    setAiThinking(false);
  }, []);

  const stopAutoMove = useCallback(() => {
    autoMovePendingRef.current = false;
    autoMoveMsRef.current = 0;
    autoMoveActionIdRef.current = null;
  }, []);

  const resetDiceAnimation = useCallback(() => {
    rollPendingRef.current = false;
    rollOwnerRef.current = null;
    rollDelayRef.current = 0;
    rollPulseRef.current = 0;
    rollPulseStepRef.current = HUMAN_DICE_ROLL_PULSE_MS;
    setDiceUi((previous) => ({
      ...previous,
      rolling: false,
      activeOwner: null
    }));
  }, []);

  const startDiceRoll = useCallback((ownerId) => {
    if (rollPendingRef.current) return;
    const profile = getDiceRollProfile(ownerId);
    rollPendingRef.current = true;
    rollOwnerRef.current = ownerId;
    rollDelayRef.current = profile.durationMs;
    rollPulseRef.current = 0;
    rollPulseStepRef.current = profile.pulseMs;
    setDiceUi((previous) => ({
      ...previous,
      rolling: true,
      activeOwner: ownerId,
      faces: [rollDie(), rollDie()]
    }));
  }, []);

  const startMatch = useCallback(() => {
    if (rollPendingRef.current) return;
    setSelectedPieceId(null);
    setSelectedActionId(null);
    stopAiThinking();
    stopAutoMove();
    resetDiceAnimation();
    setState((previous) => {
      if (previous.phase !== "await-start") return previous;
      const copy = getCopy(previous.locale);
      const text = copy.msg.startTurn(playerLabel(HUMAN_PLAYER_ID, previous.locale));
      return {
        ...previous,
        phase: "await-roll",
        turn: HUMAN_PLAYER_ID,
        turnCount: 1,
        message: text,
        logs: appendLog(previous.logs, text)
      };
    });
  }, [resetDiceAnimation, stopAiThinking, stopAutoMove]);

  const restartMatch = useCallback(() => {
    setState((previous) => createInitialState(
      previous.difficultyId,
      previous.locale || locale,
      previous.humanColor || "red"
    ));
    setSelectedPieceId(null);
    setSelectedActionId(null);
    stopAiThinking();
    stopAutoMove();
    resetDiceAnimation();
    setDiceUi({
      rolling: false,
      activeOwner: null,
      faces: [1, 1],
      lastByOwner: createLastRollByOwner()
    });
  }, [locale, resetDiceAnimation, stopAiThinking, stopAutoMove]);

  const changeHumanColor = useCallback((nextColor) => {
    if (!PLAYER_COLOR_ORDER.includes(nextColor)) return;
    setState((previous) => {
      if (previous.phase !== "await-start") return previous;
      return createInitialState(previous.difficultyId, previous.locale || locale, nextColor);
    });
    setSelectedPieceId(null);
    setSelectedActionId(null);
    stopAiThinking();
    stopAutoMove();
    resetDiceAnimation();
    setDiceUi({
      rolling: false,
      activeOwner: null,
      faces: [1, 1],
      lastByOwner: createLastRollByOwner()
    });
  }, [locale, resetDiceAnimation, stopAiThinking, stopAutoMove]);

  const rollHuman = useCallback(() => {
    if (state.winner || state.turn !== HUMAN_PLAYER_ID || state.phase !== "await-roll") return;
    if (rollPendingRef.current) return;
    setSelectedPieceId(null);
    setSelectedActionId(null);
    startDiceRoll(HUMAN_PLAYER_ID);
  }, [startDiceRoll, state.phase, state.turn, state.winner]);

  const humanActions = useMemo(() => getLegalActions(state, HUMAN_PLAYER_ID), [state]);
  const orderedHumanActions = useMemo(() => {
    const selected = [];
    const prioritized = [];
    const other = [];
    for (const action of humanActions) {
      if (selectedActionId && action.id === selectedActionId) selected.push(action);
      else if (selectedPieceId && action.pieceId === selectedPieceId) prioritized.push(action);
      else other.push(action);
    }
    return [...selected, ...prioritized, ...other];
  }, [humanActions, selectedActionId, selectedPieceId]);
  const selectedHumanAction = useMemo(
    () => (selectedActionId ? humanActions.find((action) => action.id === selectedActionId) || null : null),
    [humanActions, selectedActionId]
  );
  const selectablePieceIds = useMemo(() => new Set(humanActions.map((action) => action.pieceId)), [humanActions]);
  const preselectHumanAction = useCallback((action) => {
    if (!action) return;
    setSelectedPieceId(action.pieceId);
    setSelectedActionId(action.id);
    stopAutoMove();
  }, [stopAutoMove]);

  const playHumanAction = useCallback(
    (action) => {
      if (!action) return;
      const shouldSlowTransition =
        state.turn === HUMAN_PLAYER_ID &&
        state.phase === "await-action" &&
        selectablePieceIds.size === 1 &&
        selectablePieceIds.has(action.pieceId);
      setSelectedPieceId(null);
      setSelectedActionId(null);
      setState((previous) =>
        applyActionAndAdvance(previous, action, HUMAN_PLAYER_ID, { slowMoveTransition: shouldSlowTransition })
      );
    },
    [selectablePieceIds, state.phase, state.turn]
  );

  const resolveHumanNoMoves = useCallback(() => {
    setSelectedPieceId(null);
    setSelectedActionId(null);
    setState((previous) => resolveNoLegalActions(previous, HUMAN_PLAYER_ID));
  }, []);

  const handlePieceClick = useCallback(
    (pieceId) => {
      if (state.winner || state.turn !== HUMAN_PLAYER_ID || state.phase !== "await-action" || diceUi.rolling) return;
      const pieceActions = humanActions.filter((action) => action.pieceId === pieceId);
      if (!pieceActions.length) return;
      if (selectedHumanAction?.pieceId === pieceId) {
        playHumanAction(selectedHumanAction);
        return;
      }
      preselectHumanAction(pieceActions[0]);
    },
    [diceUi.rolling, humanActions, playHumanAction, preselectHumanAction, selectedHumanAction, state.phase, state.turn, state.winner]
  );

  const actionToSquareId = useCallback((action) => {
    if (!action) return null;
    const color = getOwnerColor(action.ownerId);
    if (action.destinationType === "track" && action.targetTrackIndex != null) {
      return `track-${action.targetTrackIndex}`;
    }
    if (action.destinationType === "lane" && action.targetLaneStep != null) {
      return `home-${color}-${action.targetLaneStep - 1}`;
    }
    if (action.destinationType === "goal") {
      return "goal-center";
    }
    return null;
  }, []);

  const handleSquareClick = useCallback(
    (squareId) => {
      if (state.winner || state.turn !== HUMAN_PLAYER_ID || state.phase !== "await-action" || diceUi.rolling) return;
      const candidates = humanActions.filter((action) => actionToSquareId(action) === squareId);
      if (!candidates.length) return;

      const selectedCandidate = selectedActionId
        ? candidates.find((action) => action.id === selectedActionId) || null
        : null;
      if (selectedCandidate) {
        playHumanAction(selectedCandidate);
        return;
      }

      const preferredCandidate = selectedPieceId
        ? candidates.find((action) => action.pieceId === selectedPieceId) || candidates[0]
        : candidates[0];
      preselectHumanAction(preferredCandidate);
    },
    [
      actionToSquareId,
      diceUi.rolling,
      humanActions,
      playHumanAction,
      preselectHumanAction,
      selectedActionId,
      selectedPieceId,
      state.phase,
      state.turn,
      state.winner
    ]
  );

  const runAiStep = useCallback(() => {
    setState((previous) => {
      if (previous.winner || !isAiPlayer(previous.turn)) return previous;
      const actorId = previous.turn;
      if (previous.phase === "await-roll") {
        startDiceRoll(actorId);
        return previous;
      }
      if (previous.phase === "await-action") {
        const actions = getLegalActions(previous, actorId);
        if (!actions.length) return resolveNoLegalActions(previous, actorId);
        const selected = pickAiAction(previous, actions, previous.difficultyId, actorId);
        if (!selected) return resolveNoLegalActions(previous, actorId);
        return applyActionAndAdvance(previous, selected, actorId);
      }
      return previous;
    });
  }, [startDiceRoll]);

  const tickAi = useCallback(
    (ms) => {
      if (!aiPendingRef.current) return;
      aiDelayRef.current -= ms;
      if (aiDelayRef.current <= 0) {
        aiPendingRef.current = false;
        aiDelayRef.current = 0;
        setAiThinking(false);
        runAiStep();
      }
    },
    [runAiStep]
  );

  const tickRollAnimation = useCallback((ms) => {
    if (!rollPendingRef.current) return;
    rollDelayRef.current -= ms;
    rollPulseRef.current += ms;
    const pulseMs = Math.max(40, rollPulseStepRef.current || HUMAN_DICE_ROLL_PULSE_MS);

    while (rollPulseRef.current >= pulseMs && rollPendingRef.current) {
      rollPulseRef.current -= pulseMs;
      setDiceUi((previous) => ({
        ...previous,
        faces: [rollDie(), rollDie()]
      }));
    }

    if (rollDelayRef.current > 0) return;

    const ownerId = rollOwnerRef.current;
    rollPendingRef.current = false;
    rollOwnerRef.current = null;
    rollDelayRef.current = 0;
    rollPulseRef.current = 0;
    rollPulseStepRef.current = HUMAN_DICE_ROLL_PULSE_MS;
    if (!ownerId) return;

    const finalDie = rollDie();
    const secondDie = rollDie();

    setDiceUi((previous) => ({
      ...previous,
      rolling: false,
      activeOwner: null,
      faces: [finalDie, secondDie],
      lastByOwner: {
        ...previous.lastByOwner,
        [ownerId]: [finalDie, secondDie]
      }
    }));

    setState((previous) => rollForPlayer(previous, ownerId, { main: finalDie, aux: secondDie }));
  }, []);

  const tickAutoMove = useCallback((ms) => {
    if (!autoMovePendingRef.current) return;
    autoMoveMsRef.current -= ms;
    if (autoMoveMsRef.current > 0) return;
    autoMovePendingRef.current = false;

    const actionId = autoMoveActionIdRef.current;
    autoMoveActionIdRef.current = null;
    if (!actionId) return;

    setState((previous) => {
      if (previous.winner || previous.turn !== HUMAN_PLAYER_ID || previous.phase !== "await-action") return previous;
      const actions = getLegalActions(previous, HUMAN_PLAYER_ID);
      const targetAction = actions.find((entry) => entry.id === actionId) || (actions.length === 1 ? actions[0] : null);
      if (!targetAction) return previous;
      return applyActionAndAdvance(previous, targetAction, HUMAN_PLAYER_ID);
    });
  }, []);

  const tickRuntime = useCallback((ms) => {
    tickRollAnimation(ms);
    tickAutoMove(ms);
    tickAi(ms);
  }, [tickAi, tickAutoMove, tickRollAnimation]);

  const advanceTime = useCallback(
    (ms) => {
      let remaining = clampMs(ms);
      while (remaining > 0 && (aiPendingRef.current || rollPendingRef.current || autoMovePendingRef.current)) {
        const step = Math.min(80, remaining);
        tickRuntime(step);
        remaining -= step;
      }
    },
    [tickRuntime]
  );

  useEffect(() => {
    if (
      state.winner ||
      !isAiPlayer(state.turn) ||
      (state.phase !== "await-roll" && state.phase !== "await-action") ||
      diceUi.rolling
    ) {
      stopAiThinking();
      return;
    }

    // Keep current countdown; only schedule when there is no pending AI action.
    if (aiPendingRef.current) return;

    const profile = AI_LEVELS[state.difficultyId] || AI_LEVELS.medium;
    aiPendingRef.current = true;
    aiDelayRef.current = profile.thinkMs + randomInt(AI_THINK_JITTER_MS);
    setAiThinking(true);
  }, [
    diceUi.rolling,
    state.winner,
    state.turn,
    state.phase,
    state.difficultyId,
    state.dice,
    state.diceAux,
    state.steps,
    state.pendingBonus,
    state.pendingBonusSource,
    state.mandatoryEntry,
    state.queuedDiceValues,
    stopAiThinking
  ]);

  useEffect(() => {
    stopAutoMove();
  }, [diceUi.rolling, selectedActionId, selectedPieceId, state, stopAutoMove]);

  useEffect(() => {
    if (state.winner || state.turn !== HUMAN_PLAYER_ID || state.phase !== "await-action" || diceUi.rolling) {
      if (selectedPieceId) setSelectedPieceId(null);
      if (selectedActionId) setSelectedActionId(null);
      return;
    }

    if (selectedActionId && !humanActions.some((action) => action.id === selectedActionId)) {
      setSelectedActionId(null);
    }
    if (selectedPieceId && !selectablePieceIds.has(selectedPieceId)) {
      setSelectedPieceId(null);
    }
  }, [diceUi.rolling, humanActions, selectablePieceIds, selectedActionId, selectedPieceId, state.phase, state.turn, state.winner]);

  useEffect(() => {
    const animate = (timestamp) => {
      if (!lastFrameRef.current) lastFrameRef.current = timestamp;
      const delta = Math.min(120, timestamp - lastFrameRef.current);
      lastFrameRef.current = timestamp;
      tickRuntime(delta);
      frameRef.current = window.requestAnimationFrame(animate);
    };
    frameRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, [tickRuntime]);

  const changeDifficulty = useCallback((difficultyId) => {
    if (!AI_LEVELS[difficultyId]) return;
    setState((previous) => ({
      ...previous,
      difficultyId,
      message: getCopy(previous.locale).msg.configChanged(aiLevelLabel(difficultyId, previous.locale)),
      logs: appendLog(previous.logs, getCopy(previous.locale).msg.configLog(aiLevelLabel(difficultyId, previous.locale)))
    }));
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      const key = event.key.toLowerCase();

      if (key === "n") {
        event.preventDefault();
        restartMatch();
        return;
      }

      if (state.phase === "await-start" && (key === "s" || event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        startMatch();
        return;
      }

      if (state.turn !== HUMAN_PLAYER_ID || state.winner) return;
      if (diceUi.rolling) return;

      if (state.phase === "await-roll" && (key === "r" || event.key === " " || key === "enter")) {
        event.preventDefault();
        rollHuman();
        return;
      }

      if (state.phase === "await-action") {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (selectedHumanAction) playHumanAction(selectedHumanAction);
          else if (orderedHumanActions[0]) preselectHumanAction(orderedHumanActions[0]);
          else resolveHumanNoMoves();
          return;
        }

        if (key === "x") {
          event.preventDefault();
          resolveHumanNoMoves();
          return;
        }

        if (/[1-9]/.test(key)) {
          const index = Number(key) - 1;
          const targetAction = orderedHumanActions[index];
          if (targetAction) {
            event.preventDefault();
            if (selectedActionId === targetAction.id) playHumanAction(targetAction);
            else preselectHumanAction(targetAction);
          }
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    diceUi.rolling,
    orderedHumanActions,
    playHumanAction,
    preselectHumanAction,
    resolveHumanNoMoves,
    restartMatch,
    rollHuman,
    selectedActionId,
    selectedHumanAction,
    startMatch,
    state.phase,
    state.turn,
    state.winner
  ]);

  const pieceStats = useMemo(() => {
    const result = {};
    for (const player of PLAYERS) {
      const own = state.pieces.filter((piece) => piece.owner === player.id);
      result[player.id] = {
        home: own.filter(isPieceHome).length,
        active: own.filter((piece) => !isPieceHome(piece) && !isPieceFinished(piece)).length,
        goal: own.filter(isPieceFinished).length
      };
    }
    return result;
  }, [state.pieces]);

  const highlightedSquares = useMemo(() => {
    if (state.turn !== HUMAN_PLAYER_ID || state.phase !== "await-action" || state.winner) return [];
    const visibleActions = selectedHumanAction
      ? [selectedHumanAction]
      : selectedPieceId
        ? humanActions.filter((action) => action.pieceId === selectedPieceId)
        : humanActions;
    const seen = new Set();
    const ids = [];
    for (const action of visibleActions) {
      const squareId = actionToSquareId(action);
      if (!squareId || seen.has(squareId)) continue;
      seen.add(squareId);
      ids.push(squareId);
    }
    return ids;
  }, [actionToSquareId, humanActions, selectedHumanAction, selectedPieceId, state.phase, state.turn, state.winner]);

  const boardPositions = useMemo(() => {
    const tokens = [];

    for (const piece of state.pieces) {
      const color = getOwnerColor(piece.owner);
      let squareId = null;

      if (isPieceHome(piece)) {
        squareId = `home-${color}-slot-${Math.max(0, piece.slot - 1)}`;
      } else if (isPieceFinished(piece)) {
        squareId = `goal-${color}-slot-${Math.max(0, piece.slot - 1)}`;
      } else if (isPieceInLane(piece)) {
        const laneStep = getLaneStep(piece);
        if (laneStep != null) squareId = `home-${color}-${laneStep - 1}`;
      } else if (isPieceInTrack(piece)) {
        const trackIndex = progressToTrackIndex(piece.owner, piece.progress);
        if (trackIndex != null) squareId = `track-${trackIndex}`;
      }

      if (!squareId) continue;
      tokens.push({
        tokenId: piece.id,
        color,
        squareId,
        label: String(piece.slot),
        movable: selectablePieceIds.has(piece.id),
        selected: selectedPieceId === piece.id,
        slowTransition: state.slowMoveTransitionPieceId === piece.id
      });
    }

    return { tokens };
  }, [selectablePieceIds, selectedPieceId, state.pieces, state.slowMoveTransitionPieceId]);

  const bridgeState = useMemo(() => ({ ...state, aiThinking, diceUi }), [state, aiThinking, diceUi]);
  const payloadBuilder = useCallback((snapshot) => {
    const copy = getCopy(snapshot.locale);
    const legal = snapshot.turn === HUMAN_PLAYER_ID ? getLegalActions(snapshot, HUMAN_PLAYER_ID) : [];
    return {
      mode: "strategy-parchis-ludoteka",
      variant: "parchis-4p-human-vs-3ai",
      coordinates: "track_index_0_to_67_clockwise_from_red_start_forward_decrements_index",
      locale: snapshot.locale,
      phase: snapshot.phase,
      turn: snapshot.turn,
      turnCount: snapshot.turnCount,
      difficulty: snapshot.difficultyId,
      dice: snapshot.dice,
      diceAux: snapshot.diceAux,
      steps: snapshot.pendingBonus ?? snapshot.steps ?? null,
      pendingBonus: snapshot.pendingBonus,
      pendingBonusSource: snapshot.pendingBonusSource,
      queuedDiceValues: snapshot.queuedDiceValues,
      mandatoryEntry: snapshot.mandatoryEntry,
      sixStreak: snapshot.sixStreak,
      aiThinking: snapshot.aiThinking,
      diceUi: snapshot.diceUi,
      winner: snapshot.winner,
      players: PLAYERS.map((player) => ({
        id: player.id,
        label: playerLabel(player.id, snapshot.locale),
        startIndex: player.startIndex,
        home: snapshot.pieces.filter((piece) => piece.owner === player.id && isPieceHome(piece)).length,
        active: snapshot.pieces.filter((piece) => piece.owner === player.id && !isPieceHome(piece) && !isPieceFinished(piece)).length,
        goal: snapshot.pieces.filter((piece) => piece.owner === player.id && isPieceFinished(piece)).length
      })),
      pieces: snapshot.pieces.map((piece) => {
        const trackIndex = isPieceInTrack(piece) ? progressToTrackIndex(piece.owner, piece.progress) : null;
        const laneStep = isPieceInLane(piece) ? getLaneStep(piece) : null;
        return {
          id: piece.id,
          owner: piece.owner,
          slot: piece.slot,
          home: isPieceHome(piece),
          finished: isPieceFinished(piece),
          progress: piece.progress,
          trackIndex,
          laneStep
        };
      }),
      legalActionsHuman: legal.map((action, index) => ({
        index: index + 1,
        type: action.type,
        pieceId: action.pieceId,
        steps: action.steps,
        destinationType: action.destinationType,
        targetTrackIndex: action.targetTrackIndex,
        targetLaneStep: action.targetLaneStep,
        capturePieceId: action.capturePieceId,
        reachesGoal: action.reachesGoal
      })),
      message: snapshot.message,
      logs: snapshot.logs.slice(0, 8),
      rulesPrompt: copy.rulesPrompt
    };
  }, []);

  useGameRuntimeBridge(bridgeState, payloadBuilder, advanceTime);
  const copy = getCopy(state.locale);

  const statusLabel = diceUi.rolling
    ? copy.ui.statusRolling
    : state.phase === "await-start"
    ? copy.ui.statusAwaitStart
    : state.phase === "await-roll"
    ? copy.ui.statusAwaitRoll
    : state.phase === "await-action"
      ? copy.ui.statusAwaitAction
      : copy.ui.statusClosed;

  const currentSteps = state.pendingBonus ?? state.steps ?? null;
  const currentPlayer = playerLabel(state.turn, state.locale);
  const currentDifficulty = AI_LEVELS[state.difficultyId] || AI_LEVELS.medium;
  const selectedPiece = selectedPieceId ? pieceById(state, selectedPieceId) : null;
  const selectedPieceRef = selectedPiece ? pieceCode(selectedPiece) : null;
  const selectedActionText = selectedHumanAction ? describeAction(state, selectedHumanAction) : "";
  const canRollHuman = state.turn === HUMAN_PLAYER_ID && state.phase === "await-roll" && !diceUi.rolling && !state.winner;
  const aiRolling = diceUi.rolling && isAiPlayer(diceUi.activeOwner);
  const rollingOwnerLabel = playerLabel(diceUi.activeOwner || "", state.locale);
  const selectionHelpText = selectedHumanAction
    ? copy.ui.selectedAction(selectedActionText)
    : selectedPieceRef
      ? copy.ui.selectedPiece(selectedPieceRef)
      : copy.ui.selectPieceFirst;

  return (
    <div className="mini-game parchis-strategy-game">
      <div className="mini-head">
        <div>
          <h4>{copy.ui.gameTitle}</h4>
          <p>{copy.ui.gameSubtitle}</p>
        </div>
        <div className="parchis-head-actions">
          <button type="button" onClick={startMatch} disabled={state.phase !== "await-start"}>{copy.ui.startMatch}</button>
          <button type="button" onClick={restartMatch}>{copy.ui.restartMatch}</button>
        </div>
      </div>

      <div className="parchis-config">
        <label htmlFor="parchis-human-color">
          {copy.ui.playerColor}
          <select
            id="parchis-human-color"
            value={state.humanColor || "red"}
            onChange={(event) => changeHumanColor(event.target.value)}
            disabled={state.phase !== "await-start"}
          >
            {PLAYER_COLOR_ORDER.map((color) => (
              <option key={color} value={color}>{copy.colors[color] || color}</option>
            ))}
          </select>
        </label>

        <label htmlFor="parchis-ai-level">
          {copy.ui.aiDifficulty}
          <select
            id="parchis-ai-level"
            value={state.difficultyId}
            onChange={(event) => changeDifficulty(event.target.value)}
          >
            {Object.values(AI_LEVELS).map((level) => (
              <option key={level.id} value={level.id}>{aiLevelLabel(level.id, state.locale)}</option>
            ))}
          </select>
        </label>

        <article className="dice-history-card parchis-config-history">
          <p>{copy.ui.latestRolls}</p>
          {PLAYERS.map((player) => (
            <div key={`dice-history-${player.id}`} className="dice-history-row">
              <span>{playerLabel(player.id, state.locale)}</span>
              <strong>
                {diceUi.lastByOwner[player.id]?.[0] ?? "--"} / {diceUi.lastByOwner[player.id]?.[1] ?? "--"}
              </strong>
            </div>
          ))}
        </article>

        <p className="parchis-config-note">
          {copy.ui.controls}
        </p>
      </div>

      <div className="status-row parchis-status-row">
        <span className={`status-pill ${state.phase === "game-over" ? "finished" : "playing"}`}>{statusLabel}</span>
        <span>{copy.ui.turn}: {currentPlayer}</span>
        <span>{copy.ui.dice}: {state.dice ?? (diceUi.rolling ? "..." : "--")} / {state.diceAux ?? (diceUi.rolling ? "..." : "--")}</span>
        <span>{copy.ui.move}: {currentSteps ?? "--"}</span>
        <span>{copy.ui.sixStreak}: {state.sixStreak}</span>
        <span>{copy.ui.aiLevel}: {aiLevelLabel(currentDifficulty.id, state.locale)}</span>
        <span>{copy.ui.playerColor}: {copy.colors[state.humanColor || "red"] || (state.humanColor || "red")}</span>
        {state.pendingBonus != null ? <span>{copy.ui.pendingBonus}: +{state.pendingBonus}</span> : null}
        {aiThinking ? <span>{copy.ui.aiThinking}</span> : null}
        {diceUi.rolling ? <span>{copy.ui.rollingFor}: {rollingOwnerLabel}</span> : null}
      </div>

      <div className="parchis-game-layout">
        <div className="parchis-board-wrap">
          <LudoBoard
            model={PARCHIS_BOARD_MODEL}
            positions={boardPositions}
            highlightedSquares={highlightedSquares}
            onSquareClick={handleSquareClick}
            onTokenClick={handlePieceClick}
            theme={{
              boardBg: "#efede6",
              frameOuter: "#8f8161",
              frameInner: "#cdc1a7",
              line: "#2c2c2c",
              crossBg: "#f8f5eb",
              squareBg: "#fbfbfb",
              safeBg: "#e7ecef",
              highlight: "#1f69b8",
              glow: "rgba(31, 105, 184, 0.36)",
              colors: {
                red: "#e12020",
                blue: "#1690d9",
                yellow: "#e8d215",
                green: "#109541"
              }
            }}
          />

          <div className="parchis-board-legend">
            <span><strong>{copy.ui.redStart}:</strong> C0</span>
            <span><strong>{copy.ui.blueStart}:</strong> C17</span>
            <span><strong>{copy.ui.yellowStart}:</strong> C34</span>
            <span><strong>{copy.ui.greenStart}:</strong> C51</span>
            <span><strong>{copy.ui.safeCells}:</strong> {copy.ui.safeCellsValue}</span>
            <span><strong>{copy.ui.interaction}:</strong> {copy.ui.interactionValue}</span>
          </div>
        </div>

        <aside className="parchis-panel">
          <div className="parchis-scoreboard">
            {PLAYERS.map((player) => (
              <article key={player.id} className={`parchis-score-card ${player.id === state.turn ? "is-turn" : ""}`}>
                <p>{playerLabel(player.id, state.locale)}</p>
                <strong>{pieceStats[player.id].goal} / {PIECES_PER_PLAYER}</strong>
                <span>{copy.ui.home}: {pieceStats[player.id].home}</span>
                <span>{copy.ui.active}: {pieceStats[player.id].active}</span>
              </article>
            ))}
          </div>

          <div className="parchis-panel-roll">
            <article className={`dice-roll-card parchis-config-roll-card${aiRolling ? " is-ai-rolling" : ""}`}>
              <p>{copy.ui.currentRoll}</p>
              {aiRolling ? (
                <div className="parchis-roll-owner-badge" aria-live="polite">
                  {copy.ui.rollingFor}: {rollingOwnerLabel}
                </div>
              ) : null}
              <div className={`dice-pair${aiRolling ? " is-ai-rolling" : ""}`}>
                {diceUi.faces.map((face, index) => (
                  <SvgDie
                    key={`die-face-${index}`}
                    value={face}
                    rolling={diceUi.rolling}
                    aiActive={aiRolling}
                    idSuffix={`${diceUi.activeOwner || "idle"}-${index}`}
                    slotIndex={index}
                  />
                ))}
              </div>
              <small>
                {diceUi.rolling
                  ? copy.ui.rollingNow(rollingOwnerLabel)
                  : copy.ui.rollResolved}
              </small>
            </article>

            <button type="button" className="parchis-roll-inline" onClick={rollHuman} disabled={!canRollHuman}>
              {copy.ui.rollDice}
            </button>
          </div>

          <div className="parchis-actions">
            {state.winner ? (
              <div className="parchis-end-panel">
                <strong>
                  {state.winner === HUMAN_PLAYER_ID ? copy.ui.youWon : getCopy(state.locale).msg.winner(playerLabel(state.winner, state.locale))}
                </strong>
                <button type="button" onClick={restartMatch}>{copy.ui.rematch}</button>
              </div>
            ) : state.phase === "await-start" ? (
              <p className="parchis-ai-wait">{copy.ui.pressStart}</p>
            ) : state.turn === HUMAN_PLAYER_ID ? (
              <>
                {state.phase === "await-action" ? (
                  <>
                    {orderedHumanActions.length ? (
                      <>
                        <p className="parchis-selection-note">{selectionHelpText}</p>
                        {selectedHumanAction ? (
                          <button
                            type="button"
                            className="primary"
                            onClick={() => playHumanAction(selectedHumanAction)}
                            disabled={diceUi.rolling}
                          >
                            {copy.ui.moveSelected}
                          </button>
                        ) : null}
                        <div className="parchis-action-list">
                          {orderedHumanActions.map((action, index) => (
                            <button
                              key={action.id}
                              type="button"
                              className={action.id === selectedActionId ? "is-focused" : action.pieceId === selectedPieceId ? "is-piece-focused" : ""}
                              onClick={() => {
                                if (selectedActionId === action.id) playHumanAction(action);
                                else preselectHumanAction(action);
                              }}
                              disabled={diceUi.rolling}
                            >
                              <span className="action-index">{index + 1}.</span> {describeAction(state, action)}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <button type="button" className="ghost" onClick={resolveHumanNoMoves} disabled={diceUi.rolling}>
                        {copy.ui.continueNoMove}
                      </button>
                    )}
                  </>
                ) : null}
              </>
            ) : (
              <p className="parchis-ai-wait">
                {copy.ui.aiTurnWait(currentPlayer, aiThinking)}
              </p>
            )}
          </div>
        </aside>
      </div>

      <details className="parchis-rules">
        <summary>{copy.ui.rulesSummary}</summary>
        <pre>{copy.rulesPrompt}</pre>
      </details>

      <p className="game-message">{state.message}</p>

      <ul className="game-log">
        {state.logs.map((entry, index) => (
          <li key={`parchis-log-${index}`}>{entry}</li>
        ))}
      </ul>
    </div>
  );
}

export default ParchisStrategyGame;

