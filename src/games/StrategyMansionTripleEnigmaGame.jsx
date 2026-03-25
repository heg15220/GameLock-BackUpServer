import React, { useCallback, useEffect, useMemo, useState } from "react";
import useGameRuntimeBridge from "../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../utils/resolveBrowserLanguage";
import weaponCandlestickAsset from "../assets/strategy-mansion/weapons/candlestick.svg";
import weaponRopeAsset from "../assets/strategy-mansion/weapons/rope.svg";
import weaponWrenchAsset from "../assets/strategy-mansion/weapons/wrench.svg";
import weaponRevolverAsset from "../assets/strategy-mansion/weapons/revolver.svg";
import weaponDaggerAsset from "../assets/strategy-mansion/weapons/dagger.svg";
import weaponLeadPipeAsset from "../assets/strategy-mansion/weapons/lead-pipe.svg";
import roomKitchenAsset from "../assets/strategy-mansion/rooms/kitchen.svg";
import roomBallroomAsset from "../assets/strategy-mansion/rooms/ballroom.svg";
import roomConservatoryAsset from "../assets/strategy-mansion/rooms/conservatory.svg";
import roomDiningRoomAsset from "../assets/strategy-mansion/rooms/dining-room.svg";
import roomBilliardRoomAsset from "../assets/strategy-mansion/rooms/billiard-room.svg";
import roomLibraryAsset from "../assets/strategy-mansion/rooms/library.svg";
import roomLoungeAsset from "../assets/strategy-mansion/rooms/lounge.svg";
import roomHallAsset from "../assets/strategy-mansion/rooms/hall.svg";
import roomStudyAsset from "../assets/strategy-mansion/rooms/study.svg";

const AI_ANALYZE_DELAY_MS = 1350;
const AI_ACTION_DELAY_MS = 1650;
const LOG_LIMIT = 72;
const HINT_LIMIT = 18;

const SUSPECTS = [
  { id: "scarlet", label: { es: "Srta. Escarlata", en: "Miss Scarlet" } },
  { id: "mustard", label: { es: "Coronel Mostaza", en: "Colonel Mustard" } },
  { id: "peacock", label: { es: "Sra. Peacock", en: "Mrs. Peacock" } },
  { id: "green", label: { es: "Reverendo Green", en: "Reverend Green" } },
  { id: "plum", label: { es: "Profesor Plum", en: "Professor Plum" } },
  { id: "white", label: { es: "Dra. White", en: "Dr. White" } },
];

const WEAPONS = [
  { id: "candlestick", label: { es: "Candelabro", en: "Candlestick" } },
  { id: "rope", label: { es: "Cuerda", en: "Rope" } },
  { id: "wrench", label: { es: "Llave inglesa", en: "Wrench" } },
  { id: "revolver", label: { es: "Revolver", en: "Revolver" } },
  { id: "dagger", label: { es: "Daga", en: "Dagger" } },
  { id: "lead_pipe", label: { es: "Tuberia", en: "Lead Pipe" } },
];

const ROOMS = [
  {
    id: "kitchen",
    x: 0,
    y: 0,
    neighbors: ["ballroom", "dining_room"],
    secret: "study",
    label: { es: "Cocina", en: "Kitchen" },
  },
  {
    id: "ballroom",
    x: 1,
    y: 0,
    neighbors: ["kitchen", "conservatory", "billiard_room"],
    secret: null,
    label: { es: "Salon de baile", en: "Ballroom" },
  },
  {
    id: "conservatory",
    x: 2,
    y: 0,
    neighbors: ["ballroom", "library"],
    secret: "lounge",
    label: { es: "Invernadero", en: "Conservatory" },
  },
  {
    id: "dining_room",
    x: 0,
    y: 1,
    neighbors: ["kitchen", "billiard_room", "lounge"],
    secret: null,
    label: { es: "Comedor", en: "Dining Room" },
  },
  {
    id: "billiard_room",
    x: 1,
    y: 1,
    neighbors: ["dining_room", "ballroom", "library", "hall"],
    secret: null,
    label: { es: "Sala de billar", en: "Billiard Room" },
  },
  {
    id: "library",
    x: 2,
    y: 1,
    neighbors: ["billiard_room", "conservatory", "study"],
    secret: null,
    label: { es: "Biblioteca", en: "Library" },
  },
  {
    id: "lounge",
    x: 0,
    y: 2,
    neighbors: ["dining_room", "hall"],
    secret: "conservatory",
    label: { es: "Sala", en: "Lounge" },
  },
  {
    id: "hall",
    x: 1,
    y: 2,
    neighbors: ["lounge", "billiard_room", "study"],
    secret: null,
    label: { es: "Vestibulo", en: "Hall" },
  },
  {
    id: "study",
    x: 2,
    y: 2,
    neighbors: ["hall", "library"],
    secret: "kitchen",
    label: { es: "Estudio", en: "Study" },
  },
];

const PLAYER_SPECS = [
  {
    id: "human",
    type: "human",
    startRoom: "hall",
    profileId: null,
    name: { es: "Tu detective", en: "You" },
    badge: "YOU",
  },
  {
    id: "ai-amber",
    type: "ai",
    startRoom: "kitchen",
    profileId: "bluffer",
    name: { es: "IA Ambar", en: "AI Amber" },
    badge: "A",
  },
  {
    id: "ai-cobalt",
    type: "ai",
    startRoom: "conservatory",
    profileId: "analyst",
    name: { es: "IA Cobalto", en: "AI Cobalt" },
    badge: "C",
  },
  {
    id: "ai-ivory",
    type: "ai",
    startRoom: "lounge",
    profileId: "opportunist",
    name: { es: "IA Marfil", en: "AI Ivory" },
    badge: "I",
  },
];

const AI_PROFILES = {
  bluffer: {
    id: "bluffer",
    bluffBase: 0.23,
    hintLieBase: 0.28,
    accuseBase: 0.83,
    infoGreed: 0.44,
    risk: 0.72,
  },
  analyst: {
    id: "analyst",
    bluffBase: 0.08,
    hintLieBase: 0.12,
    accuseBase: 0.91,
    infoGreed: 0.68,
    risk: 0.34,
  },
  opportunist: {
    id: "opportunist",
    bluffBase: 0.15,
    hintLieBase: 0.2,
    accuseBase: 0.87,
    infoGreed: 0.57,
    risk: 0.54,
  },
};

const WEAPON_ASSET_BY_ID = {
  candlestick: weaponCandlestickAsset,
  rope: weaponRopeAsset,
  wrench: weaponWrenchAsset,
  revolver: weaponRevolverAsset,
  dagger: weaponDaggerAsset,
  lead_pipe: weaponLeadPipeAsset,
};

const ROOM_ASSET_BY_ID = {
  kitchen: roomKitchenAsset,
  ballroom: roomBallroomAsset,
  conservatory: roomConservatoryAsset,
  dining_room: roomDiningRoomAsset,
  billiard_room: roomBilliardRoomAsset,
  library: roomLibraryAsset,
  lounge: roomLoungeAsset,
  hall: roomHallAsset,
  study: roomStudyAsset,
};

const SUSPECT_STYLE_BY_ID = {
  scarlet: { swatch: "#dc2626", code: "S" },
  mustard: { swatch: "#d97706", code: "M" },
  peacock: { swatch: "#0369a1", code: "P" },
  green: { swatch: "#15803d", code: "G" },
  plum: { swatch: "#7e22ce", code: "L" },
  white: { swatch: "#6b7280", code: "W" },
};

const PLAYER_TOKEN_BY_ID = {
  human: { color: "#0ea5e9", code: "YOU" },
  "ai-amber": { color: "#f59e0b", code: "A" },
  "ai-cobalt": { color: "#2563eb", code: "C" },
  "ai-ivory": { color: "#f8fafc", code: "I" },
};

const COPY = {
  es: {
    title: "Mansion Triple Enigma",
    subtitle:
      "Juego detectivesco independiente: deduce sospechoso, arma y sala antes que tres IAs con farol adaptativo.",
    restart: "Reiniciar caso",
    controls:
      "Turno humano: elige sala conectada, sospechoso y arma para lanzar sospecha. Puedes abrir acusacion final cuando creas tener la solucion.",
    instructions: [
      "Objetivo: descubrir culpable, arma y sala antes que las IAs.",
      "En tu turno te mueves, planteas sospecha y observas quien puede refutar.",
      "Acusar demasiado pronto te elimina de la partida.",
    ],
    deskTitle: "Mesa del detective",
    tabPlay: "Jugar",
    tabNotebook: "Libreta",
    tabIntel: "Intel",
    turn: "Turno",
    hand: "Cartas",
    statusOut: "Fuera por acusacion fallida",
    statusPlaying: "Activo",
    statusThinking: "Pensando",
    aiQueue: "Las IAs estan resolviendo su turno...",
    aiAnalyzing: (name) => `${name} esta analizando las pistas...`,
    aiPreparing: (name) => `${name} prepara su jugada...`,
    aiActionLine: (name, suspect, weapon, room) =>
      `${name} ejecuta su sospecha: ${suspect} con ${weapon} en ${room}.`,
    boardTitle: "Mansion",
    boardHint: "Cada turno te mueves a una sala conectada (incluye pasadizos secretos en las esquinas).",
    boardLegendLegal: "Conectada",
    boardLegendSelected: "Elegida",
    boardLegendSecret: "Pasadizo",
    yourTurn: "Tu turno",
    stepMove: "Paso 1 · Mover a sala",
    stepSuspect: "Paso 2 · Elegir sospechoso",
    stepWeapon: "Paso 3 · Elegir arma",
    moveTo: "Mover a",
    suspect: "Sospechoso",
    weapon: "Arma",
    room: "Sala",
    submitSuspicion: "Lanzar sospecha",
    accusationTitle: "Acusacion final",
    openAccuse: "Abrir acusacion",
    closeAccuse: "Cerrar acusacion",
    submitAccuse: "Confirmar acusacion",
    cancelAccuse: "Cancelar",
    revealCard: "Carta mostrada en privado",
    noReveal: "Nadie te ha mostrado carta en tu ultima sospecha.",
    noRevealShort: "Aun no hay carta privada visible.",
    hintsTitle: "Pistas publicas de IA",
    logTitle: "Bitacora de mesa",
    noHintsYet: "Sin pistas todavia.",
    noLogsYet: "Sin eventos recientes.",
    notebook: "Libreta de detective",
    handTitle: "Tus cartas confirmadas",
    notesTitle: "Mapa de sospechas",
    confidence: "Confianza",
    recommended: "Hipotesis recomendada",
    trustTitle: "Fiabilidad estimada de IA",
    trust: "Fiabilidad",
    own: "propia",
    seen: "vista",
    hot: "caliente",
    cold: "fria",
    unknown: "desconocida",
    waitingEliminated:
      "Tu detective esta fuera por acusacion fallida. Puedes observar y seguir viendo la resolucion.",
    gameOver: "Caso cerrado",
    winner: "Ganador",
    noWinner: "Sin ganador",
    hiddenCase: "Solucion del caso",
    actionHint: "N nueva partida | Enter confirmar sospecha | A abrir/cerrar acusacion",
    aiTurnLabel: "Turno IA",
    aiHistoryTitle: "Historial de jugadas IA",
    aiHistoryEmpty: "Aun no hay jugadas de IA registradas.",
    accuseCorrect: (name) => `${name} acierta la acusacion y resuelve el caso.`,
    accuseWrong: (name) => `${name} falla la acusacion y queda fuera de la resolucion final.`,
    noRefute: "Nadie pudo refutar la sospecha.",
    refutedBy: (who, asker) => `${who} refuta la sospecha de ${asker}.`,
    seenPrivate: (who) => `Has visto una carta privada de ${who}.`,
    suspicionLine: (asker, suspect, weapon, room) =>
      `${asker} sospecha: ${suspect} con ${weapon} en ${room}.`,
    hintDeny: (name, card) => `${name} declara: "${card} no puede estar en el sobre."`,
    hintSuspect: (name, card) => `${name} declara: "${card} encaja con el caso."`,
    turnIntro: "Caso abierto. Cruza pistas, observa respuestas y acusa en el momento justo.",
    stalled: "Todos los detectives quedaron fuera sin resolver el caso.",
    bestGuessLine: (suspect, weapon, room) => `${suspect} / ${weapon} / ${room}`,
    statusChip: {
      own: "PROPIA",
      seen: "VISTA",
      hot: "ALTA",
      cold: "BAJA",
      unknown: "?",
    },
  },
  en: {
    title: "Mansion Triple Enigma",
    subtitle:
      "Independent detective mode: deduce suspect, weapon, and room before three AIs with adaptive bluff logic.",
    restart: "Restart case",
    controls:
      "Human turn: pick a connected room, suspect, and weapon to launch a suggestion. Open a final accusation once you trust your deduction.",
    instructions: [
      "Goal: identify suspect, weapon, and room before the AIs.",
      "On your turn, move, suggest, and watch who can refute.",
      "A premature accusation eliminates you from winning.",
    ],
    deskTitle: "Detective desk",
    tabPlay: "Play",
    tabNotebook: "Notebook",
    tabIntel: "Intel",
    turn: "Turn",
    hand: "Cards",
    statusOut: "Out after failed accusation",
    statusPlaying: "Active",
    statusThinking: "Thinking",
    aiQueue: "AIs are resolving their turns...",
    aiAnalyzing: (name) => `${name} is analyzing clues...`,
    aiPreparing: (name) => `${name} is preparing the move...`,
    aiActionLine: (name, suspect, weapon, room) =>
      `${name} executes a suggestion: ${suspect} with ${weapon} in ${room}.`,
    boardTitle: "Mansion",
    boardHint: "Each turn you move to a connected room (corner rooms include secret passages).",
    boardLegendLegal: "Connected",
    boardLegendSelected: "Selected",
    boardLegendSecret: "Secret path",
    yourTurn: "Your turn",
    stepMove: "Step 1 · Move to room",
    stepSuspect: "Step 2 · Pick suspect",
    stepWeapon: "Step 3 · Pick weapon",
    moveTo: "Move to",
    suspect: "Suspect",
    weapon: "Weapon",
    room: "Room",
    submitSuspicion: "Submit suggestion",
    accusationTitle: "Final accusation",
    openAccuse: "Open accusation",
    closeAccuse: "Close accusation",
    submitAccuse: "Confirm accusation",
    cancelAccuse: "Cancel",
    revealCard: "Private card shown",
    noReveal: "No card was shown to you in your last suggestion.",
    noRevealShort: "No private card shown yet.",
    hintsTitle: "Public AI hints",
    logTitle: "Table log",
    noHintsYet: "No hints yet.",
    noLogsYet: "No recent events.",
    notebook: "Detective notebook",
    handTitle: "Your confirmed cards",
    notesTitle: "Suspicion map",
    confidence: "Confidence",
    recommended: "Recommended hypothesis",
    trustTitle: "Estimated AI reliability",
    trust: "Reliability",
    own: "owned",
    seen: "seen",
    hot: "hot",
    cold: "cold",
    unknown: "unknown",
    waitingEliminated:
      "You are out after a failed accusation. You can still observe the remaining resolution.",
    gameOver: "Case closed",
    winner: "Winner",
    noWinner: "No winner",
    hiddenCase: "Case solution",
    actionHint: "N new game | Enter submit suggestion | A toggle accusation",
    aiTurnLabel: "AI turn",
    aiHistoryTitle: "AI move history",
    aiHistoryEmpty: "No AI moves have been logged yet.",
    accuseCorrect: (name) => `${name} makes a correct accusation and solves the case.`,
    accuseWrong: (name) => `${name} misses the accusation and is out of the final resolution.`,
    noRefute: "Nobody could refute the suggestion.",
    refutedBy: (who, asker) => `${who} refutes ${asker}'s suggestion.`,
    seenPrivate: (who) => `You saw a private card from ${who}.`,
    suspicionLine: (asker, suspect, weapon, room) =>
      `${asker} suggests: ${suspect} with ${weapon} in ${room}.`,
    hintDeny: (name, card) => `${name} claims: "${card} cannot be in the envelope."`,
    hintSuspect: (name, card) => `${name} claims: "${card} fits the case."`,
    turnIntro: "Case open. Cross clues, watch responses, and accuse at the right moment.",
    stalled: "All detectives were eliminated without solving the case.",
    bestGuessLine: (suspect, weapon, room) => `${suspect} / ${weapon} / ${room}`,
    statusChip: {
      own: "OWN",
      seen: "SEEN",
      hot: "HIGH",
      cold: "LOW",
      unknown: "?",
    },
  },
};

const ROOM_BY_ID = Object.fromEntries(ROOMS.map((room) => [room.id, room]));
const CARD_POOL = {
  suspect: SUSPECTS,
  weapon: WEAPONS,
  room: ROOMS,
};

const cardKey = (kind, id) => `${kind}:${id}`;
const parseCardKey = (value) => {
  const [kind, id] = String(value || "").split(":");
  return { kind, id };
};

const CARD_IDS_BY_KIND = Object.fromEntries(
  Object.entries(CARD_POOL).map(([kind, items]) => [
    kind,
    items.map((item) => cardKey(kind, item.id)),
  ])
);

const ALL_CARD_KEYS = [
  ...CARD_IDS_BY_KIND.suspect,
  ...CARD_IDS_BY_KIND.weapon,
  ...CARD_IDS_BY_KIND.room,
];

const AI_IDS = PLAYER_SPECS.filter((entry) => entry.type === "ai").map((entry) => entry.id);
const HUMAN_ID = "human";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const randomItem = (items) => {
  if (!items?.length) return null;
  return items[Math.floor(Math.random() * items.length)] ?? null;
};

const shuffle = (items) => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
};

const uniquePush = (list, value) => {
  if (list.includes(value)) return list;
  return [...list, value];
};

const labelByLocale = (entry, locale) => entry?.label?.[locale] || entry?.label?.en || entry?.id || "?";

const entityById = (kind, id) => CARD_POOL[kind].find((entry) => entry.id === id) || null;

const cardLabel = (locale, card) => {
  const parsed = parseCardKey(card);
  const entity = entityById(parsed.kind, parsed.id);
  return labelByLocale(entity, locale);
};

const visualForCard = (card) => {
  const parsed = parseCardKey(card);
  if (parsed.kind === "weapon") {
    return {
      type: "image",
      src: WEAPON_ASSET_BY_ID[parsed.id] || null,
      swatch: "#92400e",
      code: "W",
    };
  }
  if (parsed.kind === "room") {
    return {
      type: "image",
      src: ROOM_ASSET_BY_ID[parsed.id] || null,
      swatch: "#0f172a",
      code: "R",
    };
  }
  const suspectStyle = SUSPECT_STYLE_BY_ID[parsed.id] || { swatch: "#475569", code: "S" };
  return {
    type: "badge",
    src: null,
    swatch: suspectStyle.swatch,
    code: suspectStyle.code,
  };
};

const trackerBaseTrust = () => Object.fromEntries(AI_IDS.map((id) => [id, 0.5]));

const createSuspicionMap = () => Object.fromEntries(ALL_CARD_KEYS.map((id) => [id, 0]));

const createTracker = (knownCards = [], profileId = null) => {
  const suspicion = createSuspicionMap();
  knownCards.forEach((card) => {
    suspicion[card] = -6;
  });
  return {
    profileId,
    knownCards: [...knownCards],
    suspicion,
    speakerTrust: trackerBaseTrust(),
    lastHintTurn: -99,
  };
};

const cloneTracker = (tracker) => ({
  ...tracker,
  knownCards: [...tracker.knownCards],
  suspicion: { ...tracker.suspicion },
  speakerTrust: { ...tracker.speakerTrust },
});

const trackerKnowsCard = (tracker, card) => tracker.knownCards.includes(card);

const trackerLearnCard = (tracker, card) => {
  if (!trackerKnowsCard(tracker, card)) {
    tracker.knownCards = [...tracker.knownCards, card];
  }
  tracker.suspicion[card] = -6;
};

const trackerBumpSuspicion = (tracker, card, delta) => {
  if (trackerKnowsCard(tracker, card)) return;
  const current = Number(tracker.suspicion[card] || 0);
  tracker.suspicion[card] = clamp(Number((current + delta).toFixed(3)), -6, 8);
};

const trackerDecay = (tracker, ratio = 0.988) => {
  ALL_CARD_KEYS.forEach((card) => {
    if (trackerKnowsCard(tracker, card)) return;
    tracker.suspicion[card] = Number((tracker.suspicion[card] * ratio).toFixed(3));
  });
};

const rankCardsByTracker = (tracker, kind) => {
  const kindCards = CARD_IDS_BY_KIND[kind] || [];
  const unknown = kindCards.filter((card) => !trackerKnowsCard(tracker, card));
  const baseline = unknown.length ? unknown : kindCards;
  return [...baseline].sort(
    (left, right) => (tracker.suspicion[right] || 0) - (tracker.suspicion[left] || 0)
  );
};

const confidenceForKind = (tracker, kind) => {
  const ranking = rankCardsByTracker(tracker, kind);
  if (!ranking.length) return 0;
  if (ranking.length === 1) return 1;
  const top = tracker.suspicion[ranking[0]] || 0;
  const second = tracker.suspicion[ranking[1]] || 0;
  const gapScore = clamp((top - second + 1.75) / 4.25, 0, 1);
  const scarcity = clamp(
    1 - (ranking.length - 1) / Math.max(1, CARD_IDS_BY_KIND[kind].length - 1),
    0,
    1
  );
  return clamp(gapScore * 0.62 + scarcity * 0.38, 0, 1);
};

const trackerOverallConfidence = (tracker) => {
  const values = ["suspect", "weapon", "room"].map((kind) => confidenceForKind(tracker, kind));
  return values.reduce((acc, value) => acc + value, 0) / values.length;
};

const trackerProgress = (tracker) => {
  const locks = ["suspect", "weapon", "room"].reduce((count, kind) => {
    const confidence = confidenceForKind(tracker, kind);
    return count + (confidence >= 0.66 ? 1 : 0);
  }, 0);
  return locks + trackerOverallConfidence(tracker);
};

const trackerGuess = (tracker) => {
  const pick = (kind) => parseCardKey(rankCardsByTracker(tracker, kind)[0] || "").id;
  return {
    suspectId: pick("suspect"),
    weaponId: pick("weapon"),
    roomId: pick("room"),
  };
};

const roomMoveOptions = (roomId) => {
  const room = ROOM_BY_ID[roomId];
  if (!room) return [];
  const unique = new Set([room.id, ...(room.neighbors || [])]);
  if (room.secret) unique.add(room.secret);
  return [...unique];
};

const copyFor = (locale) => COPY[locale] || COPY.en;

const createPlayers = (locale) =>
  PLAYER_SPECS.map((spec) => ({
    id: spec.id,
    type: spec.type,
    profileId: spec.profileId,
    roomId: spec.startRoom,
    name: spec.name[locale] || spec.name.en,
    badge: spec.badge,
    hand: [],
    eliminated: false,
    accusations: 0,
  }));

const getPlayer = (state, playerId) => state.players.find((player) => player.id === playerId) || null;

const setPlayerPatch = (state, playerId, patch) => ({
  ...state,
  players: state.players.map((player) =>
    player.id === playerId
      ? {
          ...player,
          ...patch,
        }
      : player
  ),
});

const appendLog = (state, text, tone = "info") => {
  const nextId = state.logs.length ? state.logs[state.logs.length - 1].id + 1 : 1;
  const merged = [...state.logs, { id: nextId, tone, text }];
  const logs = merged.length > LOG_LIMIT ? merged.slice(merged.length - LOG_LIMIT) : merged;
  return { ...state, logs };
};

const activeTurnPlayers = (state) => state.players.filter((player) => !player.eliminated);

const nextTurnPlayerId = (state, currentId) => {
  const active = activeTurnPlayers(state).map((player) => player.id);
  if (!active.length) return null;
  if (active.length === 1) return active[0];

  const order = state.players.map((player) => player.id);
  const start = Math.max(0, order.indexOf(currentId));
  for (let step = 1; step <= order.length; step += 1) {
    const candidate = order[(start + step) % order.length];
    if (active.includes(candidate)) return candidate;
  }
  return active[0];
};

const profileForAi = (player) => AI_PROFILES[player?.profileId] || AI_PROFILES.analyst;

const detectPressure = (state, aiId) => {
  const aiTracker = state.aiBrains[aiId];
  if (!aiTracker) return 0;

  const aiMetric = trackerProgress(aiTracker);
  const rivalMetric = state.players
    .filter((player) => !player.eliminated && player.id !== aiId)
    .map((player) => {
      if (player.id === HUMAN_ID) return trackerProgress(state.humanTracker);
      return trackerProgress(state.aiBrains[player.id] || createTracker());
    });

  const rivalBest = rivalMetric.length ? Math.max(...rivalMetric) : 0;
  const trailing = Math.max(0, rivalBest - aiMetric);
  const late = clamp((state.turnNumber - 10) / 20, 0, 1.2);
  return clamp(trailing * 0.6 + late * 0.55, 0, 1.8);
};

const shouldAiBluff = (state, aiPlayer) => {
  const brain = state.aiBrains[aiPlayer.id];
  if (!brain) return false;
  const profile = profileForAi(aiPlayer);
  const confidence = trackerOverallConfidence(brain);
  const pressure = detectPressure(state, aiPlayer.id);
  const earlyPenalty = state.turnNumber < 5 ? 0.08 : 0;
  const chance = clamp(
    profile.bluffBase + pressure * 0.19 - confidence * 0.12 - earlyPenalty,
    0.02,
    0.68
  );
  return Math.random() < chance;
};

const pickAiCardFromKind = (state, aiPlayer, kind, bluffMode = false) => {
  const brain = state.aiBrains[aiPlayer.id];
  if (!brain) return CARD_POOL[kind][0].id;
  const profile = profileForAi(aiPlayer);
  const ranked = rankCardsByTracker(brain, kind);
  const knownKind = brain.knownCards.filter((card) => parseCardKey(card).kind === kind);

  if (bluffMode && knownKind.length && Math.random() < 0.72) {
    return parseCardKey(randomItem(knownKind)).id;
  }

  if (bluffMode && ranked.length > 2 && Math.random() < 0.48) {
    return parseCardKey(ranked[ranked.length - 1]).id;
  }

  if (!bluffMode && ranked.length > 1) {
    const exploratoryChance = clamp(0.16 + profile.infoGreed * 0.25, 0, 0.44);
    if (Math.random() < exploratoryChance) {
      return parseCardKey(ranked[1]).id;
    }
  }

  return parseCardKey(ranked[0] || `${kind}:${CARD_POOL[kind][0].id}`).id;
};

const pickAiRoom = (state, aiPlayer) => {
  const brain = state.aiBrains[aiPlayer.id];
  const currentRoom = aiPlayer.roomId;
  const options = roomMoveOptions(currentRoom);
  if (!options.length) return currentRoom;
  if (!brain) return randomItem(options) || currentRoom;

  const scored = options.map((roomId) => {
    const key = cardKey("room", roomId);
    const score =
      (brain.suspicion[key] || 0) +
      (roomId === currentRoom ? -0.08 : 0) +
      (ROOM_BY_ID[currentRoom]?.secret === roomId ? 0.14 : 0) +
      Math.random() * 0.18;
    return { roomId, score };
  });

  scored.sort((left, right) => right.score - left.score);
  return scored[0]?.roomId || currentRoom;
};

const shouldAiAccuse = (state, aiPlayer) => {
  const brain = state.aiBrains[aiPlayer.id];
  if (!brain) return false;
  const profile = profileForAi(aiPlayer);
  const pressure = detectPressure(state, aiPlayer.id);
  const confidence = trackerOverallConfidence(brain);
  const minKindConfidence = Math.min(
    confidenceForKind(brain, "suspect"),
    confidenceForKind(brain, "weapon"),
    confidenceForKind(brain, "room")
  );

  const threshold = clamp(
    profile.accuseBase - pressure * 0.16 - (state.turnNumber > 24 ? 0.04 : 0),
    0.54,
    0.97
  );

  if (confidence >= threshold && minKindConfidence >= 0.42) return true;

  const desperation = state.turnNumber > 40 && confidence > 0.46 && minKindConfidence > 0.28;
  if (!desperation) return false;

  const chance = clamp(0.25 + pressure * 0.24 + profile.risk * 0.16, 0.2, 0.78);
  return Math.random() < chance;
};
const createInitialState = (locale) => {
  const copy = copyFor(locale);
  const players = createPlayers(locale);

  const solution = {
    suspectId: randomItem(SUSPECTS).id,
    weaponId: randomItem(WEAPONS).id,
    roomId: randomItem(ROOMS).id,
  };

  const hidden = new Set([
    cardKey("suspect", solution.suspectId),
    cardKey("weapon", solution.weaponId),
    cardKey("room", solution.roomId),
  ]);

  const deck = shuffle(ALL_CARD_KEYS.filter((card) => !hidden.has(card)));
  const dealtPlayers = players.map((player) => ({ ...player, hand: [] }));

  deck.forEach((card, index) => {
    const owner = dealtPlayers[index % dealtPlayers.length];
    owner.hand = [...owner.hand, card];
  });

  const aiBrains = Object.fromEntries(
    dealtPlayers
      .filter((player) => player.type === "ai")
      .map((player) => [player.id, createTracker(player.hand, player.profileId)])
  );

  const humanPlayer = dealtPlayers.find((player) => player.id === HUMAN_ID);
  const humanTracker = createTracker(humanPlayer?.hand || []);

  return {
    locale,
    mode: "playing",
    turnNumber: 1,
    players: dealtPlayers,
    aiBrains,
    humanTracker,
    humanSeenCards: [],
    activePlayerId: HUMAN_ID,
    controls: {
      moveRoomId: humanPlayer?.roomId || ROOMS[0].id,
      suspectId: SUSPECTS[0].id,
      weaponId: WEAPONS[0].id,
      accusationOpen: false,
      accuseSuspectId: SUSPECTS[0].id,
      accuseWeaponId: WEAPONS[0].id,
      accuseRoomId: ROOMS[0].id,
    },
    auto: null,
    aiActivity: null,
    lastAiAction: null,
    aiActionHistory: [],
    solution,
    hints: [],
    logs: [{ id: 1, tone: "system", text: copy.turnIntro }],
    winnerId: null,
    lastReveal: null,
    tableMessage: copy.turnIntro,
  };
};

const applySuggestionToTracker = (tracker, event, shownCard = null) => {
  const next = cloneTracker(tracker);
  trackerDecay(next);

  if (!event.responderId) {
    event.cards.forEach((card) => trackerBumpSuspicion(next, card, 1.24));
  } else {
    event.cards.forEach((card) => trackerBumpSuspicion(next, card, -0.18));
    const passBonus = clamp(event.passers.length * 0.08, 0, 0.44);
    event.cards.forEach((card) => trackerBumpSuspicion(next, card, passBonus));
  }

  if (shownCard) {
    trackerLearnCard(next, shownCard);
    event.cards.forEach((card) => {
      if (card !== shownCard) trackerBumpSuspicion(next, card, 0.52);
    });
  }

  return next;
};

const updateTrackerTrust = (tracker, aiId, truth) => {
  const current = tracker.speakerTrust[aiId] ?? 0.5;
  const delta = truth ? 0.07 : -0.11;
  tracker.speakerTrust[aiId] = clamp(Number((current + delta).toFixed(3)), 0.05, 0.95);
};

const applyHintToTracker = (tracker, hint) => {
  const next = cloneTracker(tracker);
  const knownTruth = trackerKnowsCard(next, hint.cardKey)
    ? hint.kind === "deny"
    : null;

  if (knownTruth != null) {
    updateTrackerTrust(next, hint.aiId, knownTruth);
  }

  const trust = next.speakerTrust[hint.aiId] ?? 0.5;
  const baseDelta = hint.kind === "suspect" ? 0.46 : -0.46;
  const scaledDelta = baseDelta * (0.52 + trust * 0.9);
  trackerBumpSuspicion(next, hint.cardKey, scaledDelta);
  return next;
};

const applySuggestionKnowledge = (state, event) => {
  const nextAiBrains = Object.fromEntries(
    Object.entries(state.aiBrains).map(([aiId, brain]) => {
      const shown = aiId === event.askerId ? event.shownCardId : null;
      return [aiId, applySuggestionToTracker(brain, event, shown)];
    })
  );

  const humanShown = event.askerId === HUMAN_ID ? event.shownCardId : null;
  const nextHumanTracker = applySuggestionToTracker(state.humanTracker, event, humanShown);

  return {
    ...state,
    aiBrains: nextAiBrains,
    humanTracker: nextHumanTracker,
  };
};

const applyHintKnowledge = (state, hint) => {
  const nextAiBrains = Object.fromEntries(
    Object.entries(state.aiBrains).map(([aiId, brain]) => {
      if (aiId === hint.aiId) return [aiId, brain];
      return [aiId, applyHintToTracker(brain, hint)];
    })
  );

  const speakerBrain = cloneTracker(nextAiBrains[hint.aiId] || state.aiBrains[hint.aiId]);
  speakerBrain.lastHintTurn = state.turnNumber;
  nextAiBrains[hint.aiId] = speakerBrain;

  const humanTracker = applyHintToTracker(state.humanTracker, hint);

  return {
    ...state,
    aiBrains: nextAiBrains,
    humanTracker,
  };
};

const guessFromCards = (suspectId, weaponId, roomId) => ({ suspectId, weaponId, roomId });

const isGuessCorrect = (solution, guess) =>
  solution.suspectId === guess.suspectId &&
  solution.weaponId === guess.weaponId &&
  solution.roomId === guess.roomId;

const evaluateAccusation = (state, playerId, guess) => {
  const locale = state.locale;
  const copy = copyFor(locale);
  const player = getPlayer(state, playerId);
  if (!player) return state;

  if (isGuessCorrect(state.solution, guess)) {
    let next = {
      ...state,
      mode: "finished",
      winnerId: playerId,
      auto: null,
      aiActivity: null,
      tableMessage: copy.accuseCorrect(player.name),
      controls: {
        ...state.controls,
        accusationOpen: false,
      },
    };
    next = appendLog(next, copy.accuseCorrect(player.name), "success");
    return next;
  }

  let next = setPlayerPatch(state, playerId, {
    eliminated: true,
    accusations: player.accusations + 1,
  });
  next = {
    ...next,
    tableMessage: copy.accuseWrong(player.name),
    controls: {
      ...next.controls,
      accusationOpen: false,
    },
  };
  next = appendLog(next, copy.accuseWrong(player.name), "warning");

  const alive = activeTurnPlayers(next);
  if (!alive.length) {
    next = {
      ...next,
      mode: "finished",
      winnerId: null,
      auto: null,
      aiActivity: null,
      tableMessage: copy.stalled,
    };
    next = appendLog(next, copy.stalled, "warning");
  }

  return next;
};

const handoffTurn = (state, currentId) => {
  if (state.mode !== "playing") return { ...state, auto: null };
  const nextId = nextTurnPlayerId(state, currentId);
  if (!nextId) {
    return {
      ...state,
      mode: "finished",
      auto: null,
      aiActivity: null,
      winnerId: null,
      tableMessage: copyFor(state.locale).stalled,
    };
  }

  const locale = state.locale;
  const copy = copyFor(locale);
  const nextTurn = state.turnNumber + 1;
  if (nextId !== HUMAN_ID) {
    const aiPlayer = getPlayer(state, nextId);
    const plan = createAiTurnPlan(state, aiPlayer);
    return {
      ...state,
      turnNumber: nextTurn,
      activePlayerId: nextId,
      auto: {
        ms: AI_ANALYZE_DELAY_MS,
        step: "ai_focus",
        aiId: nextId,
        plan,
      },
      aiActivity: {
        aiId: nextId,
        stage: "analyzing",
        plan,
      },
      tableMessage: copy.aiAnalyzing(aiPlayer?.name || nextId),
    };
  }

  const nextState = {
    ...state,
    turnNumber: nextTurn,
    activePlayerId: nextId,
    auto: null,
    aiActivity: null,
  };

  const human = getPlayer(nextState, HUMAN_ID);
  const moveRoomId = human?.roomId || nextState.controls.moveRoomId;
  return {
    ...nextState,
    controls: {
      ...nextState.controls,
      moveRoomId,
    },
  };
};

const resolveSuggestion = (state, askerId, suggestion) => {
  const locale = state.locale;
  const copy = copyFor(locale);

  const askedCards = [
    cardKey("suspect", suggestion.suspectId),
    cardKey("weapon", suggestion.weaponId),
    cardKey("room", suggestion.roomId),
  ];

  const order = state.players.map((player) => player.id);
  const start = Math.max(0, order.indexOf(askerId));

  let responderId = null;
  let shownCardId = null;

  for (let offset = 1; offset < order.length; offset += 1) {
    const candidateId = order[(start + offset) % order.length];
    const candidate = getPlayer(state, candidateId);
    if (!candidate) continue;
    const match = candidate.hand.filter((card) => askedCards.includes(card));
    if (!match.length) continue;
    responderId = candidateId;
    shownCardId = randomItem(match);
    break;
  }

  const passers = [];
  for (let offset = 1; offset < order.length; offset += 1) {
    const candidateId = order[(start + offset) % order.length];
    if (!responderId) {
      passers.push(candidateId);
      continue;
    }
    if (candidateId === responderId) break;
    passers.push(candidateId);
  }

  const asker = getPlayer(state, askerId);
  const responder = responderId ? getPlayer(state, responderId) : null;
  const suspectText = labelByLocale(entityById("suspect", suggestion.suspectId), locale);
  const weaponText = labelByLocale(entityById("weapon", suggestion.weaponId), locale);
  const roomText = labelByLocale(entityById("room", suggestion.roomId), locale);

  let next = appendLog(
    state,
    copy.suspicionLine(asker?.name || askerId, suspectText, weaponText, roomText),
    "info"
  );

  if (!responderId) {
    next = appendLog(next, copy.noRefute, "warning");
  } else {
    next = appendLog(
      next,
      copy.refutedBy(responder?.name || responderId, asker?.name || askerId),
      "info"
    );
  }

  if (askerId === HUMAN_ID && shownCardId && responder) {
    next = {
      ...next,
      humanSeenCards: uniquePush(next.humanSeenCards, shownCardId),
      lastReveal: {
        cardId: shownCardId,
        responderId,
      },
      tableMessage: copy.seenPrivate(responder.name),
    };
    next = appendLog(next, copy.seenPrivate(responder.name), "success");
  } else if (askerId === HUMAN_ID) {
    next = {
      ...next,
      lastReveal: null,
      tableMessage: copy.noReveal,
    };
  }

  const event = {
    askerId,
    responderId,
    cards: askedCards,
    passers,
    shownCardId,
  };

  next = applySuggestionKnowledge(next, event);
  return next;
};

const createAiHint = (state, aiPlayer, bluffUsed) => {
  const locale = state.locale;
  const copy = copyFor(locale);
  const brain = state.aiBrains[aiPlayer.id];
  if (!brain) return null;

  const turnsSinceLastHint = state.turnNumber - (brain.lastHintTurn ?? -99);
  const cooldownPenalty = turnsSinceLastHint < 2 ? 0.42 : 0;
  const speakingChance = clamp(0.7 - cooldownPenalty, 0.2, 0.85);
  if (Math.random() > speakingChance) return null;

  const profile = profileForAi(aiPlayer);
  const confidence = trackerOverallConfidence(brain);
  const pressure = detectPressure(state, aiPlayer.id);
  const lieChance = clamp(
    profile.hintLieBase + pressure * 0.16 - confidence * 0.08 + (bluffUsed ? 0.1 : 0),
    0.03,
    0.72
  );

  const lie = Math.random() < lieChance;
  const knownCards = brain.knownCards;
  const knownForDeny = knownCards.length ? randomItem(knownCards) : null;

  const bestUnknown = ["suspect", "weapon", "room"]
    .map((kind) => rankCardsByTracker(brain, kind)[0])
    .filter(Boolean)
    .sort((left, right) => (brain.suspicion[right] || 0) - (brain.suspicion[left] || 0));

  let kind = "deny";
  let hintedCard = knownForDeny;

  if (!lie) {
    if (!hintedCard || Math.random() < 0.38) {
      hintedCard = bestUnknown[0] || hintedCard || CARD_IDS_BY_KIND.suspect[0];
      kind = "suspect";
    }
  } else {
    if (knownForDeny && Math.random() < 0.74) {
      hintedCard = knownForDeny;
      kind = "suspect";
    } else {
      hintedCard = bestUnknown[0] || knownForDeny || CARD_IDS_BY_KIND.weapon[0];
      kind = "deny";
    }
  }

  if (!hintedCard) return null;

  const text =
    kind === "deny"
      ? copy.hintDeny(aiPlayer.name, cardLabel(locale, hintedCard))
      : copy.hintSuspect(aiPlayer.name, cardLabel(locale, hintedCard));

  return {
    id: `${state.turnNumber}-${aiPlayer.id}-${Math.floor(Math.random() * 1e6)}`,
    aiId: aiPlayer.id,
    turnNumber: state.turnNumber,
    kind,
    cardKey: hintedCard,
    truthful: !lie,
    text,
  };
};

const createAiTurnPlan = (state, aiPlayer) => {
  if (!aiPlayer || aiPlayer.type !== "ai" || aiPlayer.eliminated) return null;
  const shouldAccuseNow = shouldAiAccuse(state, aiPlayer);
  const brain = state.aiBrains[aiPlayer.id];
  const guess = brain ? trackerGuess(brain) : null;
  const bluffUsed = shouldAiBluff(state, aiPlayer);
  const targetRoom = pickAiRoom(state, aiPlayer);
  const suspectId = pickAiCardFromKind(state, aiPlayer, "suspect", bluffUsed);
  const weaponId = pickAiCardFromKind(state, aiPlayer, "weapon", bluffUsed);

  return {
    aiId: aiPlayer.id,
    shouldAccuse: shouldAccuseNow,
    accusationGuess: guess
      ? guessFromCards(guess.suspectId, guess.weaponId, guess.roomId)
      : guessFromCards(SUSPECTS[0].id, WEAPONS[0].id, ROOMS[0].id),
    bluffUsed,
    targetRoom,
    suspectId,
    weaponId,
  };
};

const runAiTurn = (state, plannedTurn = null) => {
  if (state.mode !== "playing") return { ...state, auto: null, aiActivity: null };

  const aiPlayer = getPlayer(state, state.activePlayerId);
  if (!aiPlayer || aiPlayer.type !== "ai" || aiPlayer.eliminated) {
    return handoffTurn({ ...state, auto: null }, state.activePlayerId);
  }

  const plan =
    plannedTurn && plannedTurn.aiId === aiPlayer.id ? plannedTurn : createAiTurnPlan(state, aiPlayer);
  let next = { ...state, auto: null };

  if (plan?.shouldAccuse) {
    next = evaluateAccusation(next, aiPlayer.id, plan.accusationGuess);
    if (next.mode !== "playing") return next;
    const aiAfter = getPlayer(next, aiPlayer.id);
    if (!aiAfter || aiAfter.eliminated) {
      return handoffTurn(next, aiPlayer.id);
    }
  }

  const bluffUsed = plan?.bluffUsed ?? shouldAiBluff(next, aiPlayer);
  const targetRoom = plan?.targetRoom || pickAiRoom(next, aiPlayer);
  next = setPlayerPatch(next, aiPlayer.id, { roomId: targetRoom });

  const suspectId = plan?.suspectId || pickAiCardFromKind(next, aiPlayer, "suspect", bluffUsed);
  const weaponId = plan?.weaponId || pickAiCardFromKind(next, aiPlayer, "weapon", bluffUsed);

  next = resolveSuggestion(next, aiPlayer.id, {
    suspectId,
    weaponId,
    roomId: targetRoom,
  });

  const locale = next.locale;
  const copy = copyFor(locale);
  const suspectText = labelByLocale(entityById("suspect", suspectId), locale);
  const weaponText = labelByLocale(entityById("weapon", weaponId), locale);
  const roomText = labelByLocale(entityById("room", targetRoom), locale);

  const hint = createAiHint(next, aiPlayer, bluffUsed);
  if (hint) {
    next = {
      ...next,
      hints: [hint, ...next.hints].slice(0, HINT_LIMIT),
    };
    next = appendLog(next, hint.text, hint.truthful ? "hint" : "warning");
    next = applyHintKnowledge(next, hint);
  }

  next = {
    ...next,
    tableMessage: copy.aiActionLine(aiPlayer.name, suspectText, weaponText, roomText),
    aiActivity: {
      aiId: aiPlayer.id,
      stage: "resolved",
      plan: {
        targetRoom,
        suspectId,
        weaponId,
      },
    },
    lastAiAction: {
      aiId: aiPlayer.id,
      roomId: targetRoom,
      suspectId,
      weaponId,
      bluffUsed,
      hintKind: hint?.kind || null,
      turnNumber: next.turnNumber,
    },
    aiActionHistory: [
      ...(next.aiActionHistory || []),
      {
        id: `${next.turnNumber}-${aiPlayer.id}-${targetRoom}-${suspectId}-${weaponId}`,
        aiId: aiPlayer.id,
        roomId: targetRoom,
        suspectId,
        weaponId,
        turnNumber: next.turnNumber,
      },
    ],
  };

  next = handoffTurn(next, aiPlayer.id);
  return next;
};

const advanceTimeline = (state, ms) => {
  let next = state;
  let remaining = Math.max(0, Number(ms) || 0);

  while (remaining > 0 && next.auto && next.mode === "playing") {
    const step = Math.min(remaining, next.auto.ms);
    remaining -= step;

    const pending = Math.max(0, next.auto.ms - step);
    next = {
      ...next,
      auto: {
        ...next.auto,
        ms: pending,
      },
    };

    if (pending <= 0) {
      if (next.auto?.step === "ai_focus") {
        const aiId = next.auto.aiId;
        const aiPlayer = getPlayer(next, aiId);
        const planned = next.auto.plan || createAiTurnPlan(next, aiPlayer);
        next = {
          ...next,
          auto: {
            ...next.auto,
            ms: AI_ACTION_DELAY_MS,
            step: "ai_turn",
            plan: planned,
          },
          aiActivity: {
            aiId,
            stage: "executing",
            plan: planned,
          },
          tableMessage: copyFor(next.locale).aiPreparing(aiPlayer?.name || aiId),
        };
      } else if (next.auto?.step === "ai_turn") {
        next = runAiTurn(next, next.auto?.plan || null);
      } else {
        next = { ...next, auto: null };
      }
    }
  }

  return next;
};
function StrategyMansionTripleEnigmaGame() {
  const locale = useMemo(() => (resolveBrowserLanguage() === "es" ? "es" : "en"), []);
  const copy = copyFor(locale);
  const [state, setState] = useState(() => createInitialState(locale));
  const [deskTab, setDeskTab] = useState("play");

  useEffect(() => {
    if (!state.auto || state.mode !== "playing") return undefined;
    const interval = window.setInterval(() => {
      setState((previous) => advanceTimeline(previous, 120));
    }, 120);
    return () => window.clearInterval(interval);
  }, [state.auto, state.mode]);

  const restart = useCallback(() => {
    setState(createInitialState(locale));
    setDeskTab("play");
  }, [locale]);

  const submitHumanSuggestion = useCallback(() => {
    setState((previous) => {
      if (previous.mode !== "playing") return previous;
      if (previous.activePlayerId !== HUMAN_ID) return previous;

      const human = getPlayer(previous, HUMAN_ID);
      if (!human || human.eliminated) return previous;

      const legalMoves = roomMoveOptions(human.roomId);
      const selectedRoom = legalMoves.includes(previous.controls.moveRoomId)
        ? previous.controls.moveRoomId
        : human.roomId;

      let next = setPlayerPatch(previous, HUMAN_ID, { roomId: selectedRoom });
      next = resolveSuggestion(next, HUMAN_ID, {
        suspectId: next.controls.suspectId,
        weaponId: next.controls.weaponId,
        roomId: selectedRoom,
      });
      next = handoffTurn(next, HUMAN_ID);
      return next;
    });
  }, []);

  const submitHumanAccusation = useCallback(() => {
    setState((previous) => {
      if (previous.mode !== "playing") return previous;
      if (previous.activePlayerId !== HUMAN_ID) return previous;
      const human = getPlayer(previous, HUMAN_ID);
      if (!human || human.eliminated) return previous;

      const guess = guessFromCards(
        previous.controls.accuseSuspectId,
        previous.controls.accuseWeaponId,
        previous.controls.accuseRoomId
      );

      let next = evaluateAccusation(previous, HUMAN_ID, guess);
      if (next.mode === "playing") {
        next = handoffTurn(next, HUMAN_ID);
      }
      return next;
    });
  }, []);

  const updateControls = useCallback((patch) => {
    setState((previous) => ({
      ...previous,
      controls: {
        ...previous.controls,
        ...patch,
      },
    }));
  }, []);

  useEffect(() => {
    const handler = (event) => {
      const key = String(event.key || "").toLowerCase();
      if (key === "n") {
        event.preventDefault();
        restart();
        return;
      }
      if (key === "a") {
        event.preventDefault();
        updateControls({ accusationOpen: !state.controls.accusationOpen });
        return;
      }
      if (key === "1") {
        event.preventDefault();
        setDeskTab("play");
        return;
      }
      if (key === "2") {
        event.preventDefault();
        setDeskTab("notebook");
        return;
      }
      if (key === "3") {
        event.preventDefault();
        setDeskTab("intel");
        return;
      }
      if (key === "enter") {
        if (state.mode !== "playing" || state.activePlayerId !== HUMAN_ID) return;
        event.preventDefault();
        if (state.controls.accusationOpen) submitHumanAccusation();
        else submitHumanSuggestion();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    restart,
    state.activePlayerId,
    state.controls.accusationOpen,
    state.mode,
    submitHumanAccusation,
    submitHumanSuggestion,
    updateControls,
  ]);

  const advanceTime = useCallback((ms = 0) => {
    setState((previous) => advanceTimeline(previous, ms));
  }, []);

  const buildPayload = useCallback(
    (snapshot) => {
      const human = getPlayer(snapshot, HUMAN_ID);
      const topGuess = trackerGuess(snapshot.humanTracker);
      const lastLogs = snapshot.logs.slice(-8).map((entry) => entry.text);
      return {
        mode: "strategy-mansion-triple-enigma",
        phase:
          snapshot.mode === "finished"
            ? "finished"
            : snapshot.activePlayerId === HUMAN_ID
            ? "human_turn"
            : "ai_turn",
        turn: snapshot.turnNumber,
        coordinateSystem:
          "Room grid 3x3 with origin at top-left (x grows right, y grows down). Secret passages connect opposite corners.",
        activePlayer: snapshot.activePlayerId,
        players: snapshot.players.map((player) => ({
          id: player.id,
          type: player.type,
          roomId: player.roomId,
          eliminated: player.eliminated,
          handCount: player.hand.length,
        })),
        roomGraph: ROOMS.map((room) => ({
          id: room.id,
          x: room.x,
          y: room.y,
          neighbors: room.neighbors,
          secret: room.secret,
        })),
        human: {
          roomId: human?.roomId || null,
          knownCards: snapshot.humanTracker.knownCards,
          seenCards: snapshot.humanSeenCards,
          recommendedGuess: topGuess,
          confidence: {
            suspect: Number(confidenceForKind(snapshot.humanTracker, "suspect").toFixed(3)),
            weapon: Number(confidenceForKind(snapshot.humanTracker, "weapon").toFixed(3)),
            room: Number(confidenceForKind(snapshot.humanTracker, "room").toFixed(3)),
            overall: Number(trackerOverallConfidence(snapshot.humanTracker).toFixed(3)),
          },
        },
        hints: snapshot.hints.slice(0, 6).map((hint) => ({
          aiId: hint.aiId,
          kind: hint.kind,
          card: hint.cardKey,
          text: hint.text,
        })),
        logs: lastLogs,
        auto: snapshot.auto,
        aiActivity: snapshot.aiActivity,
        lastAiAction: snapshot.lastAiAction,
        aiActionHistory: (snapshot.aiActionHistory || []).slice(-24),
        winnerId: snapshot.winnerId,
        solutionRevealed:
          snapshot.mode === "finished"
            ? snapshot.solution
            : {
                suspectId: null,
                weaponId: null,
                roomId: null,
              },
      };
    },
    []
  );

  useGameRuntimeBridge(state, buildPayload, advanceTime);

  const human = getPlayer(state, HUMAN_ID);
  const humanKnownSet = useMemo(() => new Set(human?.hand || []), [human]);
  const humanSeenSet = useMemo(() => new Set(state.humanSeenCards), [state.humanSeenCards]);
  const humanGuess = useMemo(() => trackerGuess(state.humanTracker), [state.humanTracker]);
  const humanConfidence = useMemo(
    () => Number(trackerOverallConfidence(state.humanTracker).toFixed(3)),
    [state.humanTracker]
  );

  const controlRooms = useMemo(() => {
    if (!human) return [];
    return roomMoveOptions(human.roomId);
  }, [human]);

  const statusForCard = useCallback(
    (card) => {
      if (humanKnownSet.has(card)) return "own";
      if (humanSeenSet.has(card)) return "seen";
      const score = state.humanTracker.suspicion[card] || 0;
      if (score >= 1.35) return "hot";
      if (score <= -1.1) return "cold";
      return "unknown";
    },
    [humanKnownSet, humanSeenSet, state.humanTracker.suspicion]
  );

  const winnerName = state.winnerId ? getPlayer(state, state.winnerId)?.name || state.winnerId : null;
  const activePlayer = getPlayer(state, state.activePlayerId);
  const isHumanTurn =
    state.mode === "playing" && state.activePlayerId === HUMAN_ID && human && !human.eliminated;
  const legalRoomSet = useMemo(() => new Set(controlRooms), [controlRooms]);
  const latestHints = useMemo(() => state.hints.slice(0, 5), [state.hints]);
  const latestLogs = useMemo(() => state.logs.slice(-8).reverse(), [state.logs]);
  const selectedMoveRoom = entityById("room", state.controls.moveRoomId);
  const selectedSuspect = entityById("suspect", state.controls.suspectId);
  const selectedWeapon = entityById("weapon", state.controls.weaponId);
  const revealVisual = state.lastReveal?.cardId ? visualForCard(state.lastReveal.cardId) : null;
  const aiActivityPlayer = state.aiActivity?.aiId ? getPlayer(state, state.aiActivity.aiId) : null;
  const aiActivityText = useMemo(() => {
    if (!state.aiActivity || !aiActivityPlayer) return null;
    if (state.aiActivity.stage === "analyzing") return copy.aiAnalyzing(aiActivityPlayer.name);
    if (state.aiActivity.stage === "executing") return copy.aiPreparing(aiActivityPlayer.name);
    return null;
  }, [aiActivityPlayer, copy, state.aiActivity]);
  const aiActionHistoryLines = useMemo(
    () =>
      [...(state.aiActionHistory || [])].reverse().map((entry) => {
        const ai = getPlayer(state, entry.aiId);
        const suspectText = labelByLocale(entityById("suspect", entry.suspectId), state.locale);
        const weaponText = labelByLocale(entityById("weapon", entry.weaponId), state.locale);
        const roomText = labelByLocale(entityById("room", entry.roomId), state.locale);
        return {
          id: entry.id,
          turnNumber: entry.turnNumber,
          text: copy.aiActionLine(ai?.name || entry.aiId, suspectText, weaponText, roomText),
        };
      }),
    [copy, state.aiActionHistory, state.locale, state.players]
  );

  return (
    <div
      className={[
        "mini-game strategy-mansion-enigma-game",
        state.mode === "playing" && state.activePlayerId !== HUMAN_ID ? "is-ai-turn" : "",
      ].join(" ")}
    >
      <header className="mansion-hero">
        <div className="mansion-hero-copy">
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="mansion-hero-metrics">
          <span>{copy.turn}: <strong>{state.turnNumber}</strong></span>
          <span>{copy.turn}: <strong>{activePlayer?.name || state.activePlayerId}</strong></span>
          <span>{copy.confidence}: <strong>{humanConfidence}</strong></span>
          <span>{copy.hand}: <strong>{human?.hand.length || 0}</strong></span>
          <button type="button" onClick={restart}>{copy.restart}</button>
        </div>
      </header>

      <div className="mansion-layout">
        <section className="mansion-stage" aria-label={copy.boardTitle}>
          <div className="mansion-stage-head">
            <h5>{copy.boardTitle}</h5>
            <p>{copy.boardHint}</p>
          </div>
          <div className="mansion-board-grid">
            {ROOMS.map((room) => {
              const selected = state.controls.moveRoomId === room.id;
              const legalTarget = legalRoomSet.has(room.id);
              const occupants = state.players.filter((player) => player.roomId === room.id);
              return (
                <button
                  key={room.id}
                  type="button"
                  className={[
                    "mansion-room-cell",
                    selected ? "is-selected" : "",
                    legalTarget && isHumanTurn ? "is-legal" : "",
                  ].filter(Boolean).join(" ")}
                  style={{ gridColumn: room.x + 1, gridRow: room.y + 1 }}
                  onClick={() => updateControls({ moveRoomId: room.id })}
                  disabled={!isHumanTurn || !legalTarget}
                >
                  <img
                    className="mansion-room-art"
                    src={ROOM_ASSET_BY_ID[room.id]}
                    alt=""
                    loading="lazy"
                    aria-hidden="true"
                  />
                  <div className="mansion-room-overlay">
                    <span className="room-name">{labelByLocale(room, state.locale)}</span>
                    {room.secret ? <span className="room-secret">{copy.boardLegendSecret}</span> : null}
                  </div>
                  <div className="room-occupants">
                    {occupants.map((player) => {
                      const token = PLAYER_TOKEN_BY_ID[player.id] || { color: "#64748b", code: "?" };
                      return (
                        <strong
                          key={`${room.id}-${player.id}`}
                          style={{ backgroundColor: token.color }}
                          title={player.name}
                        >
                          {token.code}
                        </strong>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mansion-stage-legend">
            <span className="legend legal">{copy.boardLegendLegal}</span>
            <span className="legend selected">{copy.boardLegendSelected}</span>
            <span className="legend secret">{copy.boardLegendSecret}</span>
          </div>
          <p className="game-message">{state.tableMessage}</p>
        </section>

        <aside className="mansion-desk">
          <div className="mansion-desk-head">
            <div>
              <h5>{copy.deskTitle}</h5>
              <p>{copy.controls}</p>
              <ul className="mansion-instructions">
                {copy.instructions.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div className="mansion-tab-row" role="tablist" aria-label={copy.deskTitle}>
              <button
                type="button"
                className={deskTab === "play" ? "is-active" : ""}
                onClick={() => setDeskTab("play")}
              >
                {copy.tabPlay}
              </button>
              <button
                type="button"
                className={deskTab === "notebook" ? "is-active" : ""}
                onClick={() => setDeskTab("notebook")}
              >
                {copy.tabNotebook}
              </button>
              <button
                type="button"
                className={deskTab === "intel" ? "is-active" : ""}
                onClick={() => setDeskTab("intel")}
              >
                {copy.tabIntel}
              </button>
            </div>
          </div>

          {deskTab === "play" ? (
            <div className="mansion-panel">
              {aiActivityText ? (
                <div className={`mansion-ai-activity stage-${state.aiActivity?.stage || "idle"}`}>
                  <div className="mansion-ai-lights" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <p>{aiActivityText}</p>
                  {state.aiActivity?.plan?.targetRoom ? (
                    <small>
                      {copy.room}:{" "}
                      <strong>
                        {labelByLocale(entityById("room", state.aiActivity.plan.targetRoom), state.locale)}
                      </strong>
                    </small>
                  ) : null}
                </div>
              ) : null}

              {state.mode === "finished" ? (
                <div className="mansion-case-closed">
                  <h5>{copy.gameOver}</h5>
                  <p>{copy.winner}: <strong>{winnerName || copy.noWinner}</strong></p>
                  <p>
                    {copy.hiddenCase}:{" "}
                    <strong>
                      {copy.bestGuessLine(
                        labelByLocale(entityById("suspect", state.solution.suspectId), state.locale),
                        labelByLocale(entityById("weapon", state.solution.weaponId), state.locale),
                        labelByLocale(entityById("room", state.solution.roomId), state.locale)
                      )}
                    </strong>
                  </p>
                </div>
              ) : isHumanTurn ? (
                <>
                  <section className="mansion-step">
                    <h6>{copy.stepMove}</h6>
                    <div className="mansion-choice-strip">
                      {controlRooms.map((roomId) => {
                        const room = entityById("room", roomId);
                        return (
                          <button
                            key={roomId}
                            type="button"
                            className={state.controls.moveRoomId === roomId ? "is-picked" : ""}
                            onClick={() => updateControls({ moveRoomId: roomId })}
                          >
                            <img src={ROOM_ASSET_BY_ID[roomId]} alt="" aria-hidden="true" />
                            <span>{labelByLocale(room, state.locale)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="mansion-step">
                    <h6>{copy.stepSuspect}</h6>
                    <div className="mansion-suspect-grid">
                      {SUSPECTS.map((suspect) => {
                        const suspectStyle = SUSPECT_STYLE_BY_ID[suspect.id] || {
                          swatch: "#475569",
                          code: "?",
                        };
                        return (
                          <button
                            key={suspect.id}
                            type="button"
                            className={state.controls.suspectId === suspect.id ? "is-picked" : ""}
                            onClick={() => updateControls({ suspectId: suspect.id })}
                          >
                            <span style={{ backgroundColor: suspectStyle.swatch }}>{suspectStyle.code}</span>
                            <strong>{labelByLocale(suspect, state.locale)}</strong>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="mansion-step">
                    <h6>{copy.stepWeapon}</h6>
                    <div className="mansion-weapon-grid">
                      {WEAPONS.map((weapon) => (
                        <button
                          key={weapon.id}
                          type="button"
                          className={state.controls.weaponId === weapon.id ? "is-picked" : ""}
                          onClick={() => updateControls({ weaponId: weapon.id })}
                        >
                          <img src={WEAPON_ASSET_BY_ID[weapon.id]} alt="" aria-hidden="true" />
                          <span>{labelByLocale(weapon, state.locale)}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <div className="mansion-action-row">
                    <button type="button" onClick={submitHumanSuggestion}>{copy.submitSuspicion}</button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => updateControls({ accusationOpen: !state.controls.accusationOpen })}
                    >
                      {state.controls.accusationOpen ? copy.closeAccuse : copy.openAccuse}
                    </button>
                  </div>

                  <div className="mansion-current-picks">
                    <span>{copy.room}: <strong>{labelByLocale(selectedMoveRoom, state.locale)}</strong></span>
                    <span>{copy.suspect}: <strong>{labelByLocale(selectedSuspect, state.locale)}</strong></span>
                    <span>{copy.weapon}: <strong>{labelByLocale(selectedWeapon, state.locale)}</strong></span>
                  </div>

                  {state.controls.accusationOpen ? (
                    <div className="mansion-accusation-box">
                      <h6>{copy.accusationTitle}</h6>
                      <label>
                        <span>{copy.suspect}</span>
                        <select
                          value={state.controls.accuseSuspectId}
                          onChange={(event) => updateControls({ accuseSuspectId: event.target.value })}
                        >
                          {SUSPECTS.map((suspect) => (
                            <option key={suspect.id} value={suspect.id}>
                              {labelByLocale(suspect, state.locale)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>{copy.weapon}</span>
                        <select
                          value={state.controls.accuseWeaponId}
                          onChange={(event) => updateControls({ accuseWeaponId: event.target.value })}
                        >
                          {WEAPONS.map((weapon) => (
                            <option key={weapon.id} value={weapon.id}>
                              {labelByLocale(weapon, state.locale)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>{copy.room}</span>
                        <select
                          value={state.controls.accuseRoomId}
                          onChange={(event) => updateControls({ accuseRoomId: event.target.value })}
                        >
                          {ROOMS.map((room) => (
                            <option key={room.id} value={room.id}>
                              {labelByLocale(room, state.locale)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="mansion-action-row">
                        <button type="button" onClick={submitHumanAccusation}>{copy.submitAccuse}</button>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => updateControls({ accusationOpen: false })}
                        >
                          {copy.cancelAccuse}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : human?.eliminated ? (
                <p className="mansion-standby">{copy.waitingEliminated}</p>
              ) : (
                <p className="mansion-standby">{copy.aiQueue}</p>
              )}

              <section className="mansion-reveal-box">
                <h6>{copy.revealCard}</h6>
                {state.lastReveal?.cardId ? (
                  <div className="mansion-reveal-content">
                    {revealVisual?.src ? (
                      <img src={revealVisual.src} alt="" aria-hidden="true" />
                    ) : (
                      <span
                        className="mansion-reveal-badge"
                        style={{ backgroundColor: revealVisual?.swatch || "#475569" }}
                      >
                        {revealVisual?.code || "?"}
                      </span>
                    )}
                    <strong>{cardLabel(state.locale, state.lastReveal.cardId)}</strong>
                  </div>
                ) : (
                  <p>{copy.noRevealShort}</p>
                )}
              </section>

              <section className="mansion-ai-last-action">
                <h6>{copy.aiHistoryTitle}</h6>
                <div className="mansion-ai-history-list">
                  {aiActionHistoryLines.length ? (
                    aiActionHistoryLines.map((entry) => (
                      <article key={entry.id} className="mansion-ai-history-item">
                        <small>T{entry.turnNumber}</small>
                        <p>{entry.text}</p>
                      </article>
                    ))
                  ) : (
                    <p className="mansion-ai-history-empty">{copy.aiHistoryEmpty}</p>
                  )}
                </div>
              </section>

              <p className="mansion-key-help">{copy.actionHint}</p>
            </div>
          ) : null}

          {deskTab === "notebook" ? (
            <div className="mansion-panel mansion-panel-notebook">
              <div className="mansion-summary-card">
                <p>{copy.confidence}: <strong>{humanConfidence}</strong></p>
                <p>
                  {copy.recommended}:{" "}
                  <strong>
                    {copy.bestGuessLine(
                      labelByLocale(entityById("suspect", humanGuess.suspectId), state.locale),
                      labelByLocale(entityById("weapon", humanGuess.weaponId), state.locale),
                      labelByLocale(entityById("room", humanGuess.roomId), state.locale)
                    )}
                  </strong>
                </p>
              </div>

              <section className="mansion-known-cards">
                <h6>{copy.handTitle}</h6>
                <div className="mansion-known-grid">
                  {(human?.hand || []).map((card) => {
                    const visual = visualForCard(card);
                    return (
                      <article key={card} className="mansion-known-card">
                        {visual.src ? (
                          <img src={visual.src} alt="" aria-hidden="true" />
                        ) : (
                          <span style={{ backgroundColor: visual.swatch }}>{visual.code}</span>
                        )}
                        <strong>{cardLabel(state.locale, card)}</strong>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="mansion-notes-block">
                <h6>{copy.notesTitle}</h6>
                {Object.entries(CARD_POOL).map(([kind, items]) => (
                  <div key={kind} className="mansion-notes-kind">
                    <h6>{kind === "suspect" ? copy.suspect : kind === "weapon" ? copy.weapon : copy.room}</h6>
                    <ul>
                      {items.map((entry) => {
                        const key = cardKey(kind, entry.id);
                        const status = statusForCard(key);
                        const score = Number((state.humanTracker.suspicion[key] || 0).toFixed(2));
                        const visual = visualForCard(key);
                        return (
                          <li key={key} className={`status-${status}`}>
                            {visual.src ? (
                              <img src={visual.src} alt="" aria-hidden="true" />
                            ) : (
                              <span style={{ backgroundColor: visual.swatch }}>{visual.code}</span>
                            )}
                            <strong>{labelByLocale(entry, state.locale)}</strong>
                            <em>{copy.statusChip[status]}</em>
                            <small>{score}</small>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </section>
            </div>
          ) : null}

          {deskTab === "intel" ? (
            <div className="mansion-panel mansion-panel-intel">
              <section className="mansion-trust-section">
                <h6>{copy.trustTitle}</h6>
                <ul>
                  {AI_IDS.map((aiId) => {
                    const ai = getPlayer(state, aiId);
                    const trust = Number(((state.humanTracker.speakerTrust[aiId] || 0.5) * 100).toFixed(1));
                    return (
                      <li key={aiId}>
                        <span>{ai?.name || aiId}</span>
                        <strong>{trust}%</strong>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="mansion-hints-box">
                <h6>{copy.hintsTitle}</h6>
                <ul>
                  {latestHints.length ? (
                    latestHints.map((hint) => <li key={hint.id}>{hint.text}</li>)
                  ) : (
                    <li className="empty">{copy.noHintsYet}</li>
                  )}
                </ul>
              </section>

              <section className="mansion-log-box">
                <h6>{copy.logTitle}</h6>
                <ul>
                  {latestLogs.length ? (
                    latestLogs.map((entry) => (
                      <li key={entry.id} className={`tone-${entry.tone}`}>{entry.text}</li>
                    ))
                  ) : (
                    <li className="empty">{copy.noLogsYet}</li>
                  )}
                </ul>
              </section>
            </div>
          ) : null}
        </aside>
      </div>

      <div className="mansion-player-strip">
        {state.players.map((player) => {
          const roomName = labelByLocale(entityById("room", player.roomId), state.locale);
          const isActive = player.id === state.activePlayerId && state.mode === "playing";
          const statusLabel = player.eliminated
            ? copy.statusOut
            : isActive
            ? player.type === "ai"
              ? copy.statusThinking
              : copy.statusPlaying
            : copy.statusPlaying;
          const token = PLAYER_TOKEN_BY_ID[player.id] || { color: "#64748b", code: player.badge };

          return (
            <article
              key={player.id}
              className={[
                "mansion-player-chip",
                player.type === "human" ? "is-human" : "is-ai",
                isActive ? "is-active" : "",
                player.eliminated ? "is-eliminated" : "",
              ].filter(Boolean).join(" ")}
            >
              <span className="mansion-player-avatar" style={{ backgroundColor: token.color }}>
                {token.code}
              </span>
              <div>
                <h5>{player.name}</h5>
                <p>{roomName}</p>
                <span>{statusLabel}</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default StrategyMansionTripleEnigmaGame;
