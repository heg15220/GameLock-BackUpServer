import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../utils/useGameRuntimeBridge";

const MAX_PIP = 6;
const DEFAULT_TARGET_SCORE = 100;
const MAX_LOG_LINES = 14;
const TARGET_SCORE_OPTIONS = [50, 100, 150, 200];
const DEFAULT_MODE_ID = "pairs";

const CHAIN_COLUMNS = 8;
const CHAIN_CELL_WIDTH = 94;
const CHAIN_CELL_HEIGHT = 60;

const ALL_SEATS = ["player", "right", "partner", "left"];

const detectLocale = () => {
  if (typeof navigator === "undefined") return "en";
  const browserLang = String(navigator.language || navigator.userLanguage || "").toLowerCase();
  return browserLang.startsWith("es") ? "es" : "en";
};

const LOCALE = detectLocale();

const I18N = {
  es: {
    gameTitle: "Domino Clasico Arena",
    subtitle: "Modo configurable con 1, 2 o 3 IAs, tranca, apertura reglada y marcador a puntos.",
    seatMeta: {
      player: { id: "player", name: "Usuario", label: "Tu mano", isAi: false },
      right: { id: "right", name: "IA 1", label: "Rival derecho", isAi: true },
      partner: { id: "partner", name: "Compa\u00f1ero", label: "Pareja IA", isAi: true },
      left: { id: "left", name: "IA 2", label: "Rival izquierdo", isAi: true }
    },
    modeConfigs: {
      pairs: {
        label: "Usuario + Compa\u00f1ero vs 2 IAs",
        rulesLabel: "4 jugadores por parejas",
        teams: {
          blue: { id: "blue", label: "Usuario + Compa\u00f1ero", shortLabel: "Tu equipo" },
          gold: { id: "gold", label: "IAs rivales", shortLabel: "Rivales" }
        }
      },
      duel: {
        label: "Usuario vs 1 IA",
        rulesLabel: "1 contra 1",
        teams: {
          player: { id: "player", label: "Usuario", shortLabel: "Usuario" },
          right: { id: "right", label: "IA 1", shortLabel: "IA 1" }
        }
      },
      triad: {
        label: "Usuario vs 2 IAs",
        rulesLabel: "1 contra 2 IAs",
        teams: {
          player: { id: "player", label: "Usuario", shortLabel: "Usuario" },
          right: { id: "right", label: "IA 1", shortLabel: "IA 1" },
          left: { id: "left", label: "IA 2", shortLabel: "IA 2" }
        }
      }
    },
    aiLevels: { easy: "Facil", medium: "Media", hard: "Dificil" },
    sides: { left: "izquierda", right: "derecha" },
    phase: { playing: "En juego", roundOver: "Ronda cerrada", matchOver: "Partida cerrada" },
    ui: {
      newMatch: "Nueva partida",
      nextRound: "Siguiente ronda",
      rematch: "Revancha",
      mobileBoard: "Mesa",
      mobileMeta: "Estado",
      mode: "Modo de partida",
      aiDifficulty: "Dificultad IA",
      targetScore: "Puntuacion objetivo",
      controlsNote: "Controles: flechas izq/der eligen ficha, arriba/abajo eligen extremo, Enter juega, P pasa, N avanza ronda, R reinicia. Cambiar modo reinicia la partida.",
      round: "Ronda",
      turn: "Turno",
      modeTag: "Modo",
      difficulty: "Dificultad",
      passes: "Pases seguidos",
      nextStarter: "Salida sig.",
      closed: "cerrado",
      target: "Meta",
      hand: "Mano",
      chain: "Cadena",
      tableNote: "Apertura 6|6 + salida derecha + tranca por pase/cierre",
      leftEdge: "Extremo izq",
      rightEdge: "Extremo der",
      tilesOnTable: "Fichas en mesa",
      chainAria: "Cadena de domino en mesa",
      playerHandAria: "Fichas del jugador",
      selected: "Seleccionada",
      lastPlayerBadge: "Tu jugada",
      lastPartnerBadge: "Companero",
      tiles: "fichas",
      activeSide: "Lado activo",
      left: "Izquierda",
      right: "Derecha",
      playTile: "Jugar ficha",
      passTurn: "Pasar turno",
      playableNow: "Fichas jugables ahora",
      noPlayableNow: "Sin jugadas disponibles: usa Pasar turno.",
      selectionPrefix: "Seleccion",
      fitsOn: "Encaja en",
      noneEdge: "ningun extremo",
      yourLastMove: "Ultima jugada tuya en mesa",
      partnerLastMove: "Ultima jugada de companero",
      notApplicable: "no aplica en este modo",
      roundSummary: "Resumen de ronda",
      resultTitleWonRound: "Ronda ganada",
      resultTitleLostRound: "Ronda perdida",
      resultTitleDrawRound: "Ronda empatada",
      resultTitleWonMatch: "Partida ganada",
      resultTitleLostMatch: "Partida perdida",
      resultTitleDrawMatch: "Partida empatada",
      resultLeadWon: "Tu equipo cierra la mano.",
      resultLeadLost: "La mano se cierra a favor del rival.",
      resultLeadDraw: "La ronda termina sin vencedor.",
      resultOneTileAway: "Te quedaste a una ficha.",
      resultFewTilesAway: "Te quedaste a pocas fichas.",
      winner: "Ganador",
      reason: "Motivo",
      points: "Puntos",
      rulesSummary: "Reglas del domino (prompt completo)",
      reasonDomino: "domino",
      reasonClosed: "tranca cerrada",
      reasonPasses: "tranca por pases",
      thinking: "Pensando...",
      draw: "Empate"
    },
    runtime: {
      pressNextRound: "Pulsa \"Siguiente ronda\".",
      globalDraw: "La partida termina en empate global.",
      matchWins: "gana la partida.",
      noInit: "No se pudo iniciar la ronda.",
      roundOpenDouble: "Ronda {round}: abre {seat} con 6|6.",
      roundOpenAny: "Ronda {round}: salida para {seat} con {tile}.",
      selectTile: "Selecciona una ficha para jugar.",
      tileNoFit: "La ficha {tile} no encaja. Pulsa Pasar.",
      tileOtherEdge: "Esa ficha solo encaja en el otro extremo.",
      noPassWithMoves: "Tienes jugadas legales. No puedes pasar.",
      moveMsg: "{actor} juega {tile} por {side}. Turno de {next}.",
      moveLog: "{actor}: {tile} -> {side}",
      passMsg: "{actor} pasa. Turno de {next}.",
      passLog: "{actor} pasa turno.",
      blockDraw: "Tranca con empate ({label}). Sin puntos.",
      dominoWin: "{seat} domino la ronda. {team} suma {points} puntos.",
      closedWin: "{team} gana por tranca cerrada ({label}) y suma {points} puntos.",
      blockWin: "{team} gana por tranca ({label}) y suma {points} puntos."
    },
    rulesPrompt: `REGLAS IMPLEMENTADAS (DOMINO CLASICO MULTIMODO)

- Set doble-seis completo (28 fichas, del 0 al 6).
- Modo seleccionable: 1 vs 1 IA, 1 vs 2 IAs, o 4 jugadores por parejas.
- Reparto: se reparten todas las fichas entre jugadores activos.
- Asientos segun modo: Usuario (siempre), IA 1, IA 2, Companero.
- En modo parejas: Usuario + Companero contra 2 IAs.
- Ronda 1: abre quien tenga 6|6.
- Rondas siguientes: abre el jugador a la derecha de la salida anterior.
- En cada turno se juega en los extremos que coincidan; si no hay jugada, se pasa.
- Los dobles se dibujan perpendiculares.
- Fin de ronda:
  1) Domino: un jugador queda sin fichas.
  2) Tranca: todos pasan seguidos, o cierre por mismo numero en ambos extremos con las 7 fichas de ese numero en mesa.
- Puntuacion:
  - El ganador suma los puntos que quedan en mano de sus rivales.
  - En tranca gana quien tenga menos puntos en mano (empate: 0 puntos).
- Gana la partida quien alcance primero la meta de puntos.`
  },
  en: {
    gameTitle: "Classic Domino Arena",
    subtitle: "Configurable mode with 1, 2 or 3 AIs, blocking rules, regulated opening and score tracking.",
    seatMeta: {
      player: { id: "player", name: "User", label: "Your hand", isAi: false },
      right: { id: "right", name: "AI 1", label: "Right rival", isAi: true },
      partner: { id: "partner", name: "Partner", label: "Partner AI", isAi: true },
      left: { id: "left", name: "AI 2", label: "Left rival", isAi: true }
    },
    modeConfigs: {
      pairs: {
        label: "User + Partner vs 2 AIs",
        rulesLabel: "4 players in teams",
        teams: {
          blue: { id: "blue", label: "User + Partner", shortLabel: "Your team" },
          gold: { id: "gold", label: "Rival AIs", shortLabel: "Rivals" }
        }
      },
      duel: {
        label: "User vs 1 AI",
        rulesLabel: "1 vs 1",
        teams: {
          player: { id: "player", label: "User", shortLabel: "User" },
          right: { id: "right", label: "AI 1", shortLabel: "AI 1" }
        }
      },
      triad: {
        label: "User vs 2 AIs",
        rulesLabel: "1 vs 2 AIs",
        teams: {
          player: { id: "player", label: "User", shortLabel: "User" },
          right: { id: "right", label: "AI 1", shortLabel: "AI 1" },
          left: { id: "left", label: "AI 2", shortLabel: "AI 2" }
        }
      }
    },
    aiLevels: { easy: "Easy", medium: "Medium", hard: "Hard" },
    sides: { left: "left", right: "right" },
    phase: { playing: "Playing", roundOver: "Round over", matchOver: "Match over" },
    ui: {
      newMatch: "New match",
      nextRound: "Next round",
      rematch: "Rematch",
      mobileBoard: "Table",
      mobileMeta: "Status",
      mode: "Game mode",
      aiDifficulty: "AI difficulty",
      targetScore: "Target score",
      controlsNote: "Controls: left/right arrows select tile, up/down choose edge, Enter plays, P passes, N advances round, R restarts. Changing mode restarts the match.",
      round: "Round",
      turn: "Turn",
      modeTag: "Mode",
      difficulty: "Difficulty",
      passes: "Consecutive passes",
      nextStarter: "Next opener",
      closed: "closed",
      target: "Target",
      hand: "Hand",
      chain: "Chain",
      tableNote: "Opening 6|6 + right-hand order + block by pass/closure",
      leftEdge: "Left edge",
      rightEdge: "Right edge",
      tilesOnTable: "Tiles on table",
      chainAria: "Domino chain on table",
      playerHandAria: "Player tiles",
      selected: "Selected",
      lastPlayerBadge: "Your move",
      lastPartnerBadge: "Partner",
      tiles: "tiles",
      activeSide: "Active side",
      left: "Left",
      right: "Right",
      playTile: "Play tile",
      passTurn: "Pass turn",
      playableNow: "Playable tiles now",
      noPlayableNow: "No legal moves available: use Pass turn.",
      selectionPrefix: "Selection",
      fitsOn: "Fits on",
      noneEdge: "no edge",
      yourLastMove: "Your last move on board",
      partnerLastMove: "Partner last move",
      notApplicable: "not applicable in this mode",
      roundSummary: "Round summary",
      resultTitleWonRound: "Round won",
      resultTitleLostRound: "Round lost",
      resultTitleDrawRound: "Round tied",
      resultTitleWonMatch: "Match won",
      resultTitleLostMatch: "Match lost",
      resultTitleDrawMatch: "Match tied",
      resultLeadWon: "Your team closes the hand.",
      resultLeadLost: "The hand closes in the rivals' favor.",
      resultLeadDraw: "The round ends without a winner.",
      resultOneTileAway: "You were one tile away.",
      resultFewTilesAway: "You were only a few tiles away.",
      winner: "Winner",
      reason: "Reason",
      points: "Points",
      rulesSummary: "Domino rules (full prompt)",
      reasonDomino: "domino",
      reasonClosed: "closed block",
      reasonPasses: "pass block",
      thinking: "Thinking...",
      draw: "Draw"
    },
    runtime: {
      pressNextRound: "Press \"Next round\".",
      globalDraw: "The match ends in a global draw.",
      matchWins: "wins the match.",
      noInit: "Could not start the round.",
      roundOpenDouble: "Round {round}: {seat} opens with 6|6.",
      roundOpenAny: "Round {round}: {seat} starts with {tile}.",
      selectTile: "Select a tile to play.",
      tileNoFit: "Tile {tile} does not fit. Press Pass.",
      tileOtherEdge: "That tile only fits on the other edge.",
      noPassWithMoves: "You have legal moves. You cannot pass.",
      moveMsg: "{actor} plays {tile} on the {side}. Turn for {next}.",
      moveLog: "{actor}: {tile} -> {side}",
      passMsg: "{actor} passes. Turn for {next}.",
      passLog: "{actor} passes turn.",
      blockDraw: "Blocked draw ({label}). No points.",
      dominoWin: "{seat} dominoed the round. {team} gains {points} points.",
      closedWin: "{team} wins by closed block ({label}) and gains {points} points.",
      blockWin: "{team} wins by block ({label}) and gains {points} points."
    },
    rulesPrompt: `IMPLEMENTED RULES (CLASSIC DOMINO MULTIMODE)

- Full double-six set (28 tiles, from 0 to 6).
- Selectable mode: 1 vs 1 AI, 1 vs 2 AIs, or 4 players in teams.
- Deal: all tiles are distributed among active players.
- Seats by mode: User (always), AI 1, AI 2, Partner.
- Team mode: User + Partner vs 2 AIs.
- Round 1: opens whoever has 6|6.
- Following rounds: opens the player to the right of previous opener.
- On each turn, a tile must match one of the chain edges; otherwise the player passes.
- Doubles are drawn perpendicularly.
- Round end:
  1) Domino: a player runs out of tiles.
  2) Block: all players pass consecutively, or closed block with same pip on both edges and all 7 tiles of that pip already played.
- Scoring:
  - Winner gains the points remaining in rivals' hands.
  - In block, lower hand points wins (tie: 0 points).
- Match winner is the first to reach target score.`
  }
};

const T = I18N[LOCALE];

const SEAT_META = T.seatMeta;

const buildSeatToNext = (seats) => seats.reduce((map, seat, index) => {
  map[seat] = seats[(index + 1) % seats.length];
  return map;
}, {});

const buildTeamSeats = (seats, seatToTeam) => seats.reduce((map, seat) => {
  const teamId = seatToTeam[seat];
  if (!map[teamId]) map[teamId] = [];
  map[teamId].push(seat);
  return map;
}, {});

const createModeConfig = ({
  id,
  label,
  variant,
  rulesLabel,
  seats,
  seatToTeam,
  teams
}) => ({
  id,
  label,
  variant,
  rulesLabel,
  seats,
  seatToTeam,
  teams,
  teamIds: Object.keys(teams),
  seatToNext: buildSeatToNext(seats),
  teamSeats: buildTeamSeats(seats, seatToTeam)
});

const GAME_MODES = {
  pairs: createModeConfig({
    id: "pairs",
    label: T.modeConfigs.pairs.label,
    variant: "domino-classic-4p-pairs",
    rulesLabel: T.modeConfigs.pairs.rulesLabel,
    seats: ["player", "right", "partner", "left"],
    seatToTeam: { player: "blue", partner: "blue", right: "gold", left: "gold" },
    teams: T.modeConfigs.pairs.teams
  }),
  duel: createModeConfig({
    id: "duel",
    label: T.modeConfigs.duel.label,
    variant: "domino-duel-2p",
    rulesLabel: T.modeConfigs.duel.rulesLabel,
    seats: ["player", "right"],
    seatToTeam: { player: "player", right: "right" },
    teams: T.modeConfigs.duel.teams
  }),
  triad: createModeConfig({
    id: "triad",
    label: T.modeConfigs.triad.label,
    variant: "domino-classic-3p",
    rulesLabel: T.modeConfigs.triad.rulesLabel,
    seats: ["player", "right", "left"],
    seatToTeam: { player: "player", right: "right", left: "left" },
    teams: T.modeConfigs.triad.teams
  })
};

const getModeConfig = (modeId) => GAME_MODES[modeId] ?? GAME_MODES[DEFAULT_MODE_ID];
const createHandsRecord = () => ALL_SEATS.reduce((map, seat) => ({ ...map, [seat]: [] }), {});
const buildScoresForMode = (modeConfig, previousScores = {}) => modeConfig.teamIds.reduce((scores, teamId) => ({
  ...scores,
  [teamId]: Number(previousScores[teamId] ?? 0)
}), {});

const AI_LEVELS = {
  easy: { id: "easy", label: T.aiLevels.easy, thinkMs: 1100 },
  medium: { id: "medium", label: T.aiLevels.medium, thinkMs: 1650 },
  hard: { id: "hard", label: T.aiLevels.hard, thinkMs: 2300 }
};

const RULES_PROMPT = T.rulesPrompt;
const PIP_LAYOUTS = {
  0: [],
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]]
};

function DominoPips({ value }) {
  const layout = PIP_LAYOUTS[value] ?? [];
  return (
    <span className="domino-pips" aria-hidden="true">
      {layout.map(([x, y], index) => (
        <span
          key={`${value}-${index}`}
          className="domino-pip"
          style={{ "--x": `${x}%`, "--y": `${y}%` }}
        />
      ))}
    </span>
  );
}

function HiddenSeatHand({ count }) {
  const previewCount = Math.max(1, Math.min(count, 7));
  return (
    <div className="domino-ai-hand-preview" aria-hidden="true">
      {Array.from({ length: previewCount }).map((_, index) => (
        <span key={`${count}-${index}`} className="domino-mini-back" />
      ))}
    </div>
  );
}

const cloneTiles = (tiles) => tiles.map((tile) => ({ ...tile }));
const cloneHands = (hands) => ALL_SEATS.reduce((next, seat) => ({ ...next, [seat]: cloneTiles(hands[seat] ?? []) }), {});
const safeNumber = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return numeric;
};
const fillTemplate = (template, values) => String(template).replace(
  /\{(\w+)\}/g,
  (_, key) => String(values?.[key] ?? "")
);
const formatTile = (tile) => `${tile?.a ?? tile?.left}|${tile?.b ?? tile?.right}`;
const appendLog = (logs, text) => [text, ...logs].slice(0, MAX_LOG_LINES);
const sumHand = (hand) => hand.reduce((total, tile) => total + tile.a + tile.b, 0);
const seatActor = (seat) => SEAT_META[seat]?.name ?? seat;
const sideLabel = (side) => (side === "left" ? T.sides.left : T.sides.right);
const formatMoveMessage = ({ actor, tile, side, next }) => fillTemplate(T.runtime.moveMsg, {
  actor,
  tile: formatTile(tile),
  side: sideLabel(side),
  next
});
const formatMoveLog = ({ actor, tile, side }) => fillTemplate(T.runtime.moveLog, {
  actor,
  tile: formatTile(tile),
  side: sideLabel(side)
});
const formatPassMessage = ({ actor, next }) => fillTemplate(T.runtime.passMsg, { actor, next });
const formatPassLog = ({ actor }) => fillTemplate(T.runtime.passLog, { actor });

const getEdges = (chain) => ({
  left: chain[0]?.left ?? null,
  right: chain[chain.length - 1]?.right ?? null
});

const createDeck = () => {
  const deck = [];
  let sequence = 0;
  for (let left = 0; left <= MAX_PIP; left += 1) {
    for (let right = left; right <= MAX_PIP; right += 1) {
      deck.push({ id: `d-${sequence}`, a: left, b: right });
      sequence += 1;
    }
  }
  return deck;
};

const shuffleDeck = (source) => {
  const deck = cloneTiles(source);
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  return deck;
};

const dealHands = (deck, seats) => {
  const hands = createHandsRecord();
  deck.forEach((tile, index) => {
    const seat = seats[index % seats.length];
    hands[seat].push(tile);
  });
  return hands;
};

const openingPriority = (tile) => {
  const isDouble = tile.a === tile.b ? 100 : 0;
  return isDouble + tile.a + tile.b + Math.max(tile.a, tile.b) * 0.01;
};

const pickHighestTileIndex = (hand) => {
  if (!hand.length) return -1;
  let bestIndex = 0;
  let bestPriority = openingPriority(hand[0]);
  for (let index = 1; index < hand.length; index += 1) {
    const priority = openingPriority(hand[index]);
    if (priority > bestPriority) {
      bestPriority = priority;
      bestIndex = index;
    }
  }
  return bestIndex;
};

const pickOpeningForRound = ({ hands, roundNumber, starterSeat, seatOrder }) => {
  if (roundNumber <= 1) {
    for (const seat of seatOrder) {
      const index = hands[seat].findIndex((tile) => tile.a === 6 && tile.b === 6);
      if (index >= 0) {
        return { seat, index, tile: hands[seat][index], forcedDoubleSix: true };
      }
    }
  }

  const preferredSeat = seatOrder.includes(starterSeat) ? starterSeat : "player";
  const openerOrder = [preferredSeat, ...seatOrder.filter((seat) => seat !== preferredSeat)];
  for (const seat of openerOrder) {
    const hand = hands[seat];
    const index = pickHighestTileIndex(hand);
    if (index >= 0) {
      return { seat, index, tile: hand[index], forcedDoubleSix: false };
    }
  }
  return null;
};

const removeHandIndex = (hand, index) => hand.filter((_, handIndex) => handIndex !== index);

const clampSelectedIndex = (index, handLength) => {
  if (!handLength) return 0;
  if (index < 0) return 0;
  if (index >= handLength) return handLength - 1;
  return index;
};

const getPlacementsForTile = (tile, chain) => {
  if (!tile) return [];
  if (!chain.length) {
    return [{ index: -1, side: "right", tile, oriented: { id: tile.id, left: tile.a, right: tile.b, playedBy: null } }];
  }
  const edges = getEdges(chain);
  const placements = [];

  if (tile.a === edges.left) {
    placements.push({ index: -1, side: "left", tile, oriented: { id: tile.id, left: tile.b, right: tile.a, playedBy: null } });
  }
  if (tile.b === edges.left && tile.b !== tile.a) {
    placements.push({ index: -1, side: "left", tile, oriented: { id: tile.id, left: tile.a, right: tile.b, playedBy: null } });
  }
  if (tile.a === edges.right) {
    placements.push({ index: -1, side: "right", tile, oriented: { id: tile.id, left: tile.a, right: tile.b, playedBy: null } });
  }
  if (tile.b === edges.right && tile.b !== tile.a) {
    placements.push({ index: -1, side: "right", tile, oriented: { id: tile.id, left: tile.b, right: tile.a, playedBy: null } });
  }

  return placements;
};

const collectLegalMoves = (hand, chain) => {
  const moves = [];
  hand.forEach((tile, index) => {
    const placements = getPlacementsForTile(tile, chain);
    placements.forEach((placement) => moves.push({ ...placement, index }));
  });
  return moves;
};

const applyMoveToChain = (chain, move, seat) => {
  const oriented = { ...move.oriented, playedBy: seat };
  return move.side === "left"
    ? [oriented, ...chain]
    : [...chain, oriented];
};

const incrementPipUsage = (usage, tile) => {
  const next = [...usage];
  next[tile.left] += 1;
  if (tile.right !== tile.left) {
    next[tile.right] += 1;
  }
  return next;
};

const isClosedByExhaustedPip = (chain, pipUsage) => {
  if (!chain.length) return false;
  const edges = getEdges(chain);
  if (edges.left == null || edges.right == null) return false;
  if (edges.left !== edges.right) return false;
  return pipUsage[edges.left] >= 7;
};

const getTeamPips = (hands, teamSeats) => Object.entries(teamSeats).reduce((map, [teamId, seats]) => {
  map[teamId] = seats.reduce((total, seat) => total + sumHand(hands[seat]), 0);
  return map;
}, {});

const getTeamPipsLabel = (teamPips, modeConfig) => modeConfig.teamIds
  .map((teamId) => `${modeConfig.teams[teamId]?.shortLabel ?? teamId}:${teamPips[teamId] ?? 0}`)
  .join(" | ");

const resolveBlockedOutcome = (hands, modeConfig, reason = "block-pass-cycle") => {
  const teamPips = getTeamPips(hands, modeConfig.teamSeats);
  let bestTeam = modeConfig.teamIds[0];
  modeConfig.teamIds.forEach((teamId) => {
    if ((teamPips[teamId] ?? Infinity) < (teamPips[bestTeam] ?? Infinity)) {
      bestTeam = teamId;
    }
  });
  const bestPips = teamPips[bestTeam] ?? 0;
  const tied = modeConfig.teamIds.filter((teamId) => (teamPips[teamId] ?? 0) === bestPips);
  if (tied.length > 1) {
    return { winnerTeam: "draw", reason, teamPips };
  }
  return { winnerTeam: bestTeam, reason, teamPips };
};

const describeOutcome = (outcome, pointsAwarded, modeConfig) => {
  if (outcome.winnerTeam === "draw") {
    return fillTemplate(T.runtime.blockDraw, { label: getTeamPipsLabel(outcome.teamPips, modeConfig) });
  }
  const winnerTeamCopy = modeConfig.teams[outcome.winnerTeam]?.shortLabel ?? T.ui.winner;
  if (outcome.reason === "domino") {
    const winnerSeat = outcome.winnerSeat ? SEAT_META[outcome.winnerSeat]?.name : T.ui.winner;
    return fillTemplate(T.runtime.dominoWin, { seat: winnerSeat, team: winnerTeamCopy, points: pointsAwarded });
  }
  if (outcome.reason === "block-closed") {
    return fillTemplate(T.runtime.closedWin, {
      team: winnerTeamCopy,
      label: getTeamPipsLabel(outcome.teamPips, modeConfig),
      points: pointsAwarded
    });
  }
  return fillTemplate(T.runtime.blockWin, {
    team: winnerTeamCopy,
    label: getTeamPipsLabel(outcome.teamPips, modeConfig),
    points: pointsAwarded
  });
};

const finishRound = (state, outcome) => {
  const modeConfig = getModeConfig(state.modeId);
  const nextScores = { ...state.scores };
  let pointsAwarded = 0;
  if (outcome.winnerTeam !== "draw" && nextScores[outcome.winnerTeam] != null) {
    pointsAwarded = modeConfig.teamIds.reduce(
      (total, teamId) => teamId === outcome.winnerTeam ? total : total + (outcome.teamPips[teamId] ?? 0),
      0
    );
    nextScores[outcome.winnerTeam] += pointsAwarded;
  }

  let matchWinnerTeam = null;
  const reachedTarget = modeConfig.teamIds.some((teamId) => (nextScores[teamId] ?? 0) >= state.targetScore);
  if (reachedTarget) {
    let bestScore = -Infinity;
    modeConfig.teamIds.forEach((teamId) => {
      bestScore = Math.max(bestScore, nextScores[teamId] ?? 0);
    });
    const leaders = modeConfig.teamIds.filter((teamId) => (nextScores[teamId] ?? 0) === bestScore);
    matchWinnerTeam = leaders.length > 1 ? "draw" : leaders[0];
  }

  const summary = describeOutcome(outcome, pointsAwarded, modeConfig);
  const message =
    matchWinnerTeam == null
      ? `${summary} ${T.runtime.pressNextRound}`
      : matchWinnerTeam === "draw"
        ? `${summary} ${T.runtime.globalDraw}`
        : `${summary} ${modeConfig.teams[matchWinnerTeam]?.label ?? T.ui.winner} ${T.runtime.matchWins}`;

  return {
    ...state,
    phase: matchWinnerTeam == null ? "round-over" : "match-over",
    turn: null,
    scores: nextScores,
    roundResult: { ...outcome, pointsAwarded, matchWinnerTeam },
    message,
    logs: appendLog(state.logs, summary)
  };
};

const commitSeatMove = (state, seat, move) => {
  const modeConfig = getModeConfig(state.modeId);
  const hand = state.hands[seat];
  const tile = hand[move.index];
  if (!tile) return state;

  const nextHands = cloneHands(state.hands);
  nextHands[seat] = removeHandIndex(hand, move.index);
  const nextChain = applyMoveToChain(state.chain, move, seat);
  const nextPipUsage = incrementPipUsage(state.pipUsage, move.oriented);
  const nextTurn = modeConfig.seatToNext[seat];
  const actor = seatActor(seat);

  const baseState = {
    ...state,
    hands: nextHands,
    chain: nextChain,
    pipUsage: nextPipUsage,
    turn: nextTurn,
    selectedIndex: clampSelectedIndex(state.selectedIndex, nextHands.player.length),
    lastPlayerMoveTileId: seat === "player" ? tile.id : state.lastPlayerMoveTileId,
    lastPlayerMoveSide: seat === "player" ? move.side : state.lastPlayerMoveSide,
    lastPartnerMoveTileId: seat === "partner" ? tile.id : state.lastPartnerMoveTileId,
    lastPartnerMoveSide: seat === "partner" ? move.side : state.lastPartnerMoveSide,
    consecutivePasses: 0,
    turnCount: state.turnCount + 1,
    message: formatMoveMessage({
      actor,
      tile,
      side: move.side,
      next: SEAT_META[nextTurn].name
    }),
    logs: appendLog(state.logs, formatMoveLog({ actor, tile, side: move.side }))
  };

  if (!nextHands[seat].length) {
    return finishRound(baseState, {
      winnerTeam: modeConfig.seatToTeam[seat],
      winnerSeat: seat,
      reason: "domino",
      teamPips: getTeamPips(nextHands, modeConfig.teamSeats)
    });
  }

  if (isClosedByExhaustedPip(nextChain, nextPipUsage)) {
    const edges = getEdges(nextChain);
    const blocked = resolveBlockedOutcome(nextHands, modeConfig, "block-closed");
    return finishRound(baseState, { ...blocked, closingPip: edges.left });
  }

  return baseState;
};

const commitSeatPass = (state, seat) => {
  const modeConfig = getModeConfig(state.modeId);
  const legalMoves = collectLegalMoves(state.hands[seat], state.chain);
  if (legalMoves.length) {
    if (seat === "player") {
      return { ...state, message: T.runtime.noPassWithMoves };
    }
    return state;
  }

  const actor = seatActor(seat);
  const nextConsecutivePasses = state.consecutivePasses + 1;
  const passState = {
    ...state,
    consecutivePasses: nextConsecutivePasses,
    turnCount: state.turnCount + 1,
    logs: appendLog(state.logs, formatPassLog({ actor }))
  };

  if (nextConsecutivePasses >= modeConfig.seats.length) {
    return finishRound(passState, resolveBlockedOutcome(state.hands, modeConfig, "block-pass-cycle"));
  }

  const nextTurn = modeConfig.seatToNext[seat];
  return {
    ...passState,
    turn: nextTurn,
    message: formatPassMessage({ actor, next: SEAT_META[nextTurn].name })
  };
};

const countPipOccurrencesForTeam = (hands, team, pip, teamSeats) => {
  const seats = teamSeats[team] ?? [];
  return seats.reduce(
    (total, seat) => total + hands[seat].reduce(
      (seatTotal, tile) => seatTotal + Number(tile.a === pip) + Number(tile.b === pip),
      0
    ),
    0
  );
};

const countTeamMoves = (hands, chain, team, teamSeats) => {
  const seats = teamSeats[team] ?? [];
  return seats.reduce(
    (total, seat) => total + collectLegalMoves(hands[seat], chain).length,
    0
  );
};

const createNodeFromState = (state) => ({
  modeId: state.modeId,
  turn: state.turn,
  chain: cloneTiles(state.chain),
  hands: cloneHands(state.hands),
  consecutivePasses: state.consecutivePasses,
  pipUsage: [...state.pipUsage]
});

const detectNodeTerminal = (node) => {
  const modeConfig = getModeConfig(node.modeId);
  for (const seat of modeConfig.seats) {
    if (node.hands[seat].length === 0) {
      return {
        winnerTeam: modeConfig.seatToTeam[seat],
        winnerSeat: seat,
        reason: "domino",
        teamPips: getTeamPips(node.hands, modeConfig.teamSeats)
      };
    }
  }
  if (isClosedByExhaustedPip(node.chain, node.pipUsage)) {
    return resolveBlockedOutcome(node.hands, modeConfig, "block-closed");
  }
  if (node.consecutivePasses >= modeConfig.seats.length) {
    return resolveBlockedOutcome(node.hands, modeConfig, "block-pass-cycle");
  }
  return null;
};

const applyNodeMove = (node, move) => {
  const modeConfig = getModeConfig(node.modeId);
  const seat = node.turn;
  if (!seat) return node;
  const hand = node.hands[seat];
  const tile = hand[move.index];
  if (!tile) return node;

  const nextHands = cloneHands(node.hands);
  nextHands[seat] = removeHandIndex(hand, move.index);
  const nextChain = applyMoveToChain(node.chain, move, seat);
  const nextPipUsage = incrementPipUsage(node.pipUsage, move.oriented);

  return {
    ...node,
    turn: modeConfig.seatToNext[seat],
    hands: nextHands,
    chain: nextChain,
    pipUsage: nextPipUsage,
    consecutivePasses: 0
  };
};

const applyNodePass = (node) => ({
  ...node,
  turn: getModeConfig(node.modeId).seatToNext[node.turn],
  consecutivePasses: node.consecutivePasses + 1
});

const getTeamIdsExcluding = (teamIds, excludedTeam) => teamIds.filter((teamId) => teamId !== excludedTeam);

const evaluateNodeForTeam = (node, perspectiveTeam) => {
  const modeConfig = getModeConfig(node.modeId);
  const terminal = detectNodeTerminal(node);
  if (terminal) {
    if (terminal.winnerTeam === "draw") {
      return -Math.abs((terminal.teamPips[perspectiveTeam] ?? 0) - 14);
    }
    const othersTotal = getTeamIdsExcluding(modeConfig.teamIds, perspectiveTeam)
      .reduce((total, teamId) => total + (terminal.teamPips[teamId] ?? 0), 0);
    return terminal.winnerTeam === perspectiveTeam
      ? 12000 + othersTotal * 12
      : -12000 - (terminal.teamPips[perspectiveTeam] ?? 0) * 12;
  }

  const teamPips = getTeamPips(node.hands, modeConfig.teamSeats);
  const rivals = getTeamIdsExcluding(modeConfig.teamIds, perspectiveTeam);
  const ownTeamPips = teamPips[perspectiveTeam] ?? 0;
  const rivalsPips = rivals.reduce((total, teamId) => total + (teamPips[teamId] ?? 0), 0);
  const ownMoves = countTeamMoves(node.hands, node.chain, perspectiveTeam, modeConfig.teamSeats);
  const rivalsMoves = rivals.reduce(
    (total, teamId) => total + countTeamMoves(node.hands, node.chain, teamId, modeConfig.teamSeats),
    0
  );

  const edges = getEdges(node.chain);
  let edgeBalance = 0;
  if (edges.left != null) {
    const ownLeft = countPipOccurrencesForTeam(node.hands, perspectiveTeam, edges.left, modeConfig.teamSeats);
    const rivalLeft = rivals.reduce(
      (total, teamId) => total + countPipOccurrencesForTeam(node.hands, teamId, edges.left, modeConfig.teamSeats),
      0
    );
    edgeBalance += ownLeft - rivalLeft;
  }
  if (edges.right != null && edges.right !== edges.left) {
    const ownRight = countPipOccurrencesForTeam(node.hands, perspectiveTeam, edges.right, modeConfig.teamSeats);
    const rivalRight = rivals.reduce(
      (total, teamId) => total + countPipOccurrencesForTeam(node.hands, teamId, edges.right, modeConfig.teamSeats),
      0
    );
    edgeBalance += ownRight - rivalRight;
  }

  return (
    (rivalsPips - ownTeamPips * Math.max(1, rivals.length)) * 3.6 +
    (ownMoves - rivalsMoves) * 1.5 +
    edgeBalance * 0.6 -
    node.consecutivePasses * 0.3
  );
};

const minimaxForTeam = (node, perspectiveTeam, depth, alpha, beta) => {
  const terminal = detectNodeTerminal(node);
  if (terminal || depth <= 0) {
    return evaluateNodeForTeam(node, perspectiveTeam);
  }

  const modeConfig = getModeConfig(node.modeId);
  const seat = node.turn;
  const legalMoves = collectLegalMoves(node.hands[seat], node.chain);
  const nextNodes = legalMoves.length
    ? legalMoves.map((move) => applyNodeMove(node, move))
    : [applyNodePass(node)];

  if (modeConfig.seatToTeam[seat] === perspectiveTeam) {
    let best = -Infinity;
    for (const nextNode of nextNodes) {
      const score = minimaxForTeam(nextNode, perspectiveTeam, depth - 1, alpha, beta);
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const nextNode of nextNodes) {
    const score = minimaxForTeam(nextNode, perspectiveTeam, depth - 1, alpha, beta);
    best = Math.min(best, score);
    beta = Math.min(beta, score);
    if (beta <= alpha) break;
  }
  return best;
};

const pickAiMove = (state, seat, legalMoves) => {
  if (!legalMoves.length) return null;
  const difficulty = AI_LEVELS[state.difficultyId] ?? AI_LEVELS.medium;
  const modeConfig = getModeConfig(state.modeId);
  const seatTeam = modeConfig.seatToTeam[seat];
  const baseNode = createNodeFromState(state);

  if (difficulty.id === "easy") {
    const index = (state.turnCount + state.roundNumber + state.chain.length + seat.charCodeAt(0)) % legalMoves.length;
    return legalMoves[index];
  }

  if (difficulty.id === "medium") {
    let bestMove = legalMoves[0];
    let bestScore = -Infinity;
    legalMoves.forEach((move, index) => {
      const node = applyNodeMove(baseNode, move);
      let score = evaluateNodeForTeam(node, seatTeam);
      const nextSeat = node.turn;
      const nextSeatMoves = collectLegalMoves(node.hands[nextSeat], node.chain).length;
      if (modeConfig.seatToTeam[nextSeat] !== seatTeam && nextSeatMoves === 0) score += 8;
      if (modeConfig.seatToTeam[nextSeat] === seatTeam && nextSeatMoves === 0) score -= 3;
      if (move.tile.a === move.tile.b) score += 0.45;
      score += index * 0.0001;
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    });
    return bestMove;
  }

  let bestMove = legalMoves[0];
  let bestScore = -Infinity;
  legalMoves.forEach((move, index) => {
    const node = applyNodeMove(baseNode, move);
    let score = minimaxForTeam(node, seatTeam, 2, -Infinity, Infinity);
    if (move.tile.a === move.tile.b) score += 0.25;
    score += index * 0.0001;
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  });
  return bestMove;
};

const buildSnakeLayout = (chain, density = null) => {
  const columns = density?.columns ?? CHAIN_COLUMNS;
  const cellWidth = density?.cellWidth ?? CHAIN_CELL_WIDTH;
  const cellHeight = density?.cellHeight ?? CHAIN_CELL_HEIGHT;
  const positions = [];
  for (let index = 0; index < chain.length; index += 1) {
    const row = Math.floor(index / columns);
    const offset = index % columns;
    const column = row % 2 === 0 ? offset : columns - 1 - offset;
    const previous = positions[index - 1];
    const axis = previous && previous.row !== row ? "vertical" : "horizontal";
    positions.push({
      index,
      tile: chain[index],
      row,
      column,
      axis,
      leftPx: column * cellWidth + 6,
      topPx: row * cellHeight + 6
    });
  }
  const rows = Math.max(1, Math.floor((chain.length - 1) / columns) + 1);
  return {
    columns,
    rows,
    width: columns * cellWidth + 12,
    height: rows * cellHeight + 12,
    positions
  };
};

const createRoundState = ({ modeId = DEFAULT_MODE_ID, scores, targetScore, difficultyId, roundNumber, starterSeat = null }) => {
  const modeConfig = getModeConfig(modeId);
  const deck = shuffleDeck(createDeck());
  const hands = dealHands(deck, modeConfig.seats);
  const opening = pickOpeningForRound({
    hands,
    roundNumber,
    starterSeat,
    seatOrder: modeConfig.seats
  });
  const normalizedScores = buildScoresForMode(modeConfig, scores);
  if (!opening) {
    return {
      modeId: modeConfig.id,
      phase: "round-over",
      roundNumber,
      targetScore,
      difficultyId,
      scores: normalizedScores,
      starterSeat: modeConfig.seats[0],
      nextStarterSeat: modeConfig.seats[0],
      turn: null,
      chain: [],
      hands: createHandsRecord(),
      pipUsage: Array(MAX_PIP + 1).fill(0),
      selectedIndex: 0,
      selectedSide: "left",
      lastPlayerMoveTileId: null,
      lastPlayerMoveSide: null,
      lastPartnerMoveTileId: null,
      lastPartnerMoveSide: null,
      consecutivePasses: 0,
      turnCount: 0,
      roundResult: null,
      message: T.runtime.noInit,
      logs: [T.runtime.noInit]
    };
  }

  const nextHands = cloneHands(hands);
  const openingTile = { ...opening.tile };
  nextHands[opening.seat] = removeHandIndex(nextHands[opening.seat], opening.index);
  const chain = [{ id: openingTile.id, left: openingTile.a, right: openingTile.b, playedBy: opening.seat }];
  const pipUsage = incrementPipUsage(Array(MAX_PIP + 1).fill(0), chain[0]);
  const nextStarterSeat = modeConfig.seatToNext[opening.seat];
  const firstMessage = roundNumber <= 1
    ? fillTemplate(T.runtime.roundOpenDouble, { round: roundNumber, seat: SEAT_META[opening.seat].name })
    : fillTemplate(T.runtime.roundOpenAny, {
      round: roundNumber,
      seat: SEAT_META[opening.seat].name,
      tile: formatTile(openingTile)
    });

  return {
    modeId: modeConfig.id,
    phase: "playing",
    roundNumber,
    targetScore,
    difficultyId,
    scores: normalizedScores,
    starterSeat: opening.seat,
    nextStarterSeat,
    turn: modeConfig.seatToNext[opening.seat],
    chain,
    hands: nextHands,
    pipUsage,
    selectedIndex: 0,
    selectedSide: "left",
    lastPlayerMoveTileId: null,
    lastPlayerMoveSide: null,
    lastPartnerMoveTileId: null,
    lastPartnerMoveSide: null,
    consecutivePasses: 0,
    turnCount: 1,
    roundResult: null,
    message: firstMessage,
    logs: [firstMessage]
  };
};

function DominoStrategyGame() {
  const [state, setState] = useState(() => createRoundState({
    modeId: DEFAULT_MODE_ID,
    scores: buildScoresForMode(getModeConfig(DEFAULT_MODE_ID)),
    targetScore: DEFAULT_TARGET_SCORE,
    difficultyId: "medium",
    roundNumber: 1,
    starterSeat: null
  }));
  const [aiThinkingSeat, setAiThinkingSeat] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(() => (
    typeof window !== "undefined" ? window.innerWidth : 1280
  ));
  const [viewportHeight, setViewportHeight] = useState(() => (
    typeof window !== "undefined" ? window.innerHeight : 720
  ));
  const aiPendingRef = useRef(false);
  const aiDelayRef = useRef(0);
  const frameRef = useRef(0);
  const lastFrameRef = useRef(0);

  const stopAiThinking = useCallback(() => {
    aiPendingRef.current = false;
    aiDelayRef.current = 0;
    setAiThinkingSeat(null);
  }, []);

  const restartMatch = useCallback(() => {
    setState((previous) => createRoundState({
      modeId: previous.modeId,
      scores: buildScoresForMode(getModeConfig(previous.modeId)),
      targetScore: previous.targetScore,
      difficultyId: previous.difficultyId,
      roundNumber: 1,
      starterSeat: null
    }));
  }, []);

  const startNextRound = useCallback(() => {
    setState((previous) => {
      if (previous.phase !== "round-over") return previous;
      return createRoundState({
        modeId: previous.modeId,
        scores: previous.scores,
        targetScore: previous.targetScore,
        difficultyId: previous.difficultyId,
        roundNumber: previous.roundNumber + 1,
        starterSeat: previous.nextStarterSeat
      });
    });
  }, []);

  const playSelectedTile = useCallback(() => {
    setState((previous) => {
      if (previous.phase !== "playing" || previous.turn !== "player") return previous;
      const selectedTile = previous.hands.player[previous.selectedIndex];
      if (!selectedTile) return { ...previous, message: T.runtime.selectTile };

      const legalPlacements = getPlacementsForTile(selectedTile, previous.chain);
      if (!legalPlacements.length) {
        return { ...previous, message: fillTemplate(T.runtime.tileNoFit, { tile: formatTile(selectedTile) }) };
      }

      const placement =
        legalPlacements.find((candidate) => candidate.side === previous.selectedSide) ??
        (legalPlacements.length === 1 ? legalPlacements[0] : null);
      if (!placement) {
        return { ...previous, message: T.runtime.tileOtherEdge };
      }

      const move = { ...placement, index: previous.selectedIndex };
      return commitSeatMove(previous, "player", move);
    });
  }, []);

  const passTurn = useCallback(() => {
    setState((previous) => {
      if (previous.phase !== "playing" || previous.turn !== "player") return previous;
      return commitSeatPass(previous, "player");
    });
  }, []);

  const runAiTurn = useCallback(() => {
    setState((previous) => {
      if (previous.phase !== "playing" || previous.turn === "player") return previous;
      const seat = previous.turn;
      const legalMoves = collectLegalMoves(previous.hands[seat], previous.chain);
      if (!legalMoves.length) {
        return commitSeatPass(previous, seat);
      }
      const move = pickAiMove(previous, seat, legalMoves);
      if (!move) {
        return commitSeatPass(previous, seat);
      }
      return commitSeatMove(previous, seat, move);
    });
  }, []);

  const shiftSelection = useCallback((delta) => {
    setState((previous) => {
      const hand = previous.hands.player;
      if (!hand.length) return previous;
      const nextIndex = (previous.selectedIndex + delta + hand.length) % hand.length;
      return { ...previous, selectedIndex: nextIndex };
    });
  }, []);

  const tickAi = useCallback((ms) => {
    if (!aiPendingRef.current) return;
    aiDelayRef.current -= ms;
    if (aiDelayRef.current <= 0) {
      aiPendingRef.current = false;
      aiDelayRef.current = 0;
      setAiThinkingSeat(null);
      runAiTurn();
    }
  }, [runAiTurn]);

  const advanceTime = useCallback((ms) => {
    let remaining = safeNumber(ms);
    while (remaining > 0 && aiPendingRef.current) {
      const step = Math.min(80, remaining);
      tickAi(step);
      remaining -= step;
    }
  }, [tickAi]);

  useEffect(() => {
    if (state.phase !== "playing" || state.turn === "player") {
      stopAiThinking();
      return;
    }
    aiPendingRef.current = true;
    const thinkMs = (AI_LEVELS[state.difficultyId] ?? AI_LEVELS.medium).thinkMs;
    aiDelayRef.current = thinkMs;
    setAiThinkingSeat(state.turn);
  }, [state.phase, state.turn, state.difficultyId, state.roundNumber, stopAiThinking]);

  useEffect(() => {
    const animate = (timestamp) => {
      if (!lastFrameRef.current) lastFrameRef.current = timestamp;
      const delta = Math.min(120, timestamp - lastFrameRef.current);
      lastFrameRef.current = timestamp;
      tickAi(delta);
      frameRef.current = window.requestAnimationFrame(animate);
    };
    frameRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, [tickAi]);

  useEffect(() => {
    const onResize = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      const key = event.key;
      const normalized = key.toLowerCase();
      if (key === "ArrowLeft") {
        event.preventDefault();
        shiftSelection(-1);
        return;
      }
      if (key === "ArrowRight") {
        event.preventDefault();
        shiftSelection(1);
        return;
      }
      if (key === "ArrowUp") {
        event.preventDefault();
        setState((previous) => ({ ...previous, selectedSide: "left" }));
        return;
      }
      if (key === "ArrowDown") {
        event.preventDefault();
        setState((previous) => ({ ...previous, selectedSide: "right" }));
        return;
      }
      if (key === "Enter" || key === " ") {
        event.preventDefault();
        playSelectedTile();
        return;
      }
      if (normalized === "p") {
        event.preventDefault();
        passTurn();
        return;
      }
      if (normalized === "n") {
        event.preventDefault();
        if (state.phase === "round-over") startNextRound();
        else if (state.phase === "match-over") restartMatch();
        return;
      }
      if (normalized === "r") {
        event.preventDefault();
        restartMatch();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [passTurn, playSelectedTile, restartMatch, shiftSelection, startNextRound, state.phase]);

  const modeConfig = useMemo(() => getModeConfig(state.modeId), [state.modeId]);
  const playerHand = state.hands.player;
  const selectedTile = useMemo(
    () => playerHand[state.selectedIndex] ?? null,
    [playerHand, state.selectedIndex]
  );
  const selectedPlacements = useMemo(
    () => (selectedTile ? getPlacementsForTile(selectedTile, state.chain) : []),
    [selectedTile, state.chain]
  );
  const playerLegalMoves = useMemo(
    () => collectLegalMoves(playerHand, state.chain),
    [playerHand, state.chain]
  );
  const playableTileChoices = useMemo(() => {
    const choices = [];
    const seen = new Set();
    playerLegalMoves.forEach((move) => {
      const tile = playerHand[move.index];
      if (!tile || seen.has(tile.id)) return;
      seen.add(tile.id);
      choices.push({
        tile,
        index: move.index,
        sides: [...new Set(playerLegalMoves
          .filter((candidate) => candidate.index === move.index)
          .map((candidate) => candidate.side))]
      });
    });
    return choices;
  }, [playerHand, playerLegalMoves]);
  const playableSidesByTileId = useMemo(() => {
    const sideMap = new Map();
    playerHand.forEach((tile) => {
      const sides = [...new Set(getPlacementsForTile(tile, state.chain).map((placement) => placement.side))];
      sideMap.set(tile.id, sides);
    });
    return sideMap;
  }, [playerHand, state.chain]);
  const boardDensity = useMemo(() => {
    const chainLength = state.chain.length;

    if (viewportWidth <= 420) {
      if (chainLength >= 18) {
        return { columns: 7, cellWidth: 44, cellHeight: 30 };
      }
      if (chainLength >= 12) {
        return { columns: 6, cellWidth: 48, cellHeight: 32 };
      }
      return { columns: 5, cellWidth: 54, cellHeight: 36 };
    }
    if (viewportWidth <= 620) {
      if (chainLength >= 18) {
        return { columns: 8, cellWidth: 50, cellHeight: 34 };
      }
      if (chainLength >= 12) {
        return { columns: 7, cellWidth: 56, cellHeight: 38 };
      }
      return { columns: 6, cellWidth: 60, cellHeight: 40 };
    }
    if (viewportWidth <= 920) {
      if (chainLength >= 18) {
        return { columns: 8, cellWidth: 60, cellHeight: 40 };
      }
      if (chainLength >= 12) {
        return { columns: 7, cellWidth: 66, cellHeight: 44 };
      }
      return { columns: 7, cellWidth: 72, cellHeight: 48 };
    }
    return { columns: CHAIN_COLUMNS, cellWidth: CHAIN_CELL_WIDTH, cellHeight: CHAIN_CELL_HEIGHT };
  }, [state.chain.length, viewportWidth]);
  const chainLayout = useMemo(() => buildSnakeLayout(state.chain, boardDensity), [state.chain, boardDensity]);
  const stageCellWidth = boardDensity.cellWidth;
  const stageRowHeight = boardDensity.cellHeight;
  const stageTileWidth = Math.max(42, boardDensity.cellWidth - 8);
  const stageTileHeight = Math.max(34, boardDensity.cellHeight - 4);
  const stageDoubleWidth = Math.max(24, Math.round(stageTileHeight));
  const stageDoubleHeight = Math.max(42, Math.round(stageTileWidth));
  const stageHalfHeight = Math.max(18, Math.round(stageTileHeight - 2));
  const stageDoubleHalfHeight = Math.max(18, Math.round(stageDoubleHeight / 2 - 2));
  const stagePipSize = Math.max(6, Math.round(stageTileHeight * 0.18));
  const teamPips = useMemo(() => getTeamPips(state.hands, modeConfig.teamSeats), [state.hands, modeConfig]);
  const lastPlayerMoveTile = useMemo(
    () => state.chain.find((tile) => tile.id === state.lastPlayerMoveTileId) ?? null,
    [state.chain, state.lastPlayerMoveTileId]
  );
  const lastPartnerMoveTile = useMemo(
    () => state.chain.find((tile) => tile.id === state.lastPartnerMoveTileId) ?? null,
    [state.chain, state.lastPartnerMoveTileId]
  );

  const canPlayerPlay = state.phase === "playing" && state.turn === "player";
  const canPlayerPass = canPlayerPlay && playerLegalMoves.length === 0;
  const canAdjustTarget = modeConfig.teamIds.every((teamId) => (state.scores[teamId] ?? 0) === 0) && state.roundNumber === 1;
  const isMobileViewport = viewportWidth <= 860;
  const isPortraitMobile = isMobileViewport && viewportHeight >= viewportWidth;
  const playerTeamId = modeConfig.seatToTeam.player;
  const playerOutcome = useMemo(() => {
    if (!state.roundResult) {
      return null;
    }

    const decisiveTeam = state.phase === "match-over"
      ? state.roundResult.matchWinnerTeam
      : state.roundResult.winnerTeam;

    if (!decisiveTeam || decisiveTeam === "draw") {
      return "draw";
    }

    return decisiveTeam === playerTeamId ? "won" : "lost";
  }, [playerTeamId, state.phase, state.roundResult]);
  const playerResultTitle = useMemo(() => {
    if (!playerOutcome) {
      return "";
    }

    const isMatchResult = state.phase === "match-over";
    if (playerOutcome === "won") {
      return isMatchResult ? T.ui.resultTitleWonMatch : T.ui.resultTitleWonRound;
    }
    if (playerOutcome === "lost") {
      return isMatchResult ? T.ui.resultTitleLostMatch : T.ui.resultTitleLostRound;
    }
    return isMatchResult ? T.ui.resultTitleDrawMatch : T.ui.resultTitleDrawRound;
  }, [playerOutcome, state.phase]);
  const playerResultLead = useMemo(() => {
    if (!playerOutcome) {
      return "";
    }
    if (playerOutcome === "won") {
      return T.ui.resultLeadWon;
    }
    if (playerOutcome === "lost") {
      return T.ui.resultLeadLost;
    }
    return T.ui.resultLeadDraw;
  }, [playerOutcome]);
  const playerResultDetail = useMemo(() => {
    if (!state.roundResult || playerOutcome !== "lost") {
      return "";
    }

    if (playerHand.length === 1) {
      return T.ui.resultOneTileAway;
    }

    if (playerHand.length > 1 && playerHand.length <= 3) {
      return T.ui.resultFewTilesAway;
    }

    return "";
  }, [playerHand.length, playerOutcome, state.roundResult]);
  const selectPlayableTile = useCallback((index, preferredSide) => {
    setState((previous) => ({
      ...previous,
      selectedIndex: clampSelectedIndex(index, previous.hands.player.length),
      selectedSide: preferredSide || previous.selectedSide
    }));
  }, []);

  const phaseLabel =
    state.phase === "playing"
      ? T.phase.playing
      : state.phase === "round-over"
        ? T.phase.roundOver
        : T.phase.matchOver;
  const shouldDockPlayerControls = viewportWidth <= 1180;
  const rootClasses = [
    "mini-game",
    "domino-strategy-game",
    "domino-strategy-pro",
    `locale-${LOCALE}`,
    `mode-${state.modeId}`,
    isMobileViewport ? "domino-mobile" : "",
    isPortraitMobile ? "domino-mobile-portrait" : "",
    isMobileViewport && !isPortraitMobile ? "domino-mobile-landscape" : ""
  ].filter(Boolean).join(" ");

  const bridgeState = useMemo(() => ({ ...state, aiThinkingSeat }), [state, aiThinkingSeat]);
  const payloadBuilder = useCallback((snapshot) => {
    const modeSnapshotConfig = getModeConfig(snapshot.modeId);
    const layout = buildSnakeLayout(snapshot.chain, boardDensity);
    const counts = modeSnapshotConfig.seats.reduce((map, seat) => ({
      ...map,
      [seat]: snapshot.hands[seat].length
    }), {});
    return {
      mode: "strategy-domino-classic",
      locale: LOCALE,
      modeId: modeSnapshotConfig.id,
      modeLabel: modeSnapshotConfig.label,
      variant: modeSnapshotConfig.variant,
      coordinates: "snake_table_origin_top_left",
      coordinateSystem: "x->right, y->down, chain on serpentine grid",
      phase: snapshot.phase,
      round: snapshot.roundNumber,
      targetScore: snapshot.targetScore,
      difficulty: snapshot.difficultyId,
      turn: snapshot.turn,
      aiThinkingSeat: snapshot.aiThinkingSeat,
      starterSeat: snapshot.starterSeat,
      nextStarterSeat: snapshot.nextStarterSeat,
      scores: snapshot.scores,
      consecutivePasses: snapshot.consecutivePasses,
      edges: getEdges(snapshot.chain),
      chainLength: snapshot.chain.length,
      chain: snapshot.chain.map((tile) => [tile.left, tile.right, tile.playedBy]),
      chainLayout: layout.positions.map((node) => ({
        index: node.index,
        x: node.column,
        y: node.row,
        axis: node.axis,
        tile: [node.tile.left, node.tile.right]
      })),
      teamPips: getTeamPips(snapshot.hands, modeSnapshotConfig.teamSeats),
      hands: {
        counts,
        player: snapshot.hands.player.map((tile) => [tile.a, tile.b])
      },
      selectedIndex: snapshot.selectedIndex,
      selectedSide: snapshot.selectedSide,
      lastPlayerMoveTileId: snapshot.lastPlayerMoveTileId,
      lastPlayerMoveSide: snapshot.lastPlayerMoveSide,
      lastPartnerMoveTileId: snapshot.lastPartnerMoveTileId,
      lastPartnerMoveSide: snapshot.lastPartnerMoveSide,
      legalMovesPlayer: collectLegalMoves(snapshot.hands.player, snapshot.chain).map((move) => ({
        index: move.index,
        side: move.side,
        tile: [move.tile.a, move.tile.b]
      })),
      roundResult: snapshot.roundResult,
      message: snapshot.message,
      logs: snapshot.logs.slice(0, 8)
    };
  }, [boardDensity]);
  useGameRuntimeBridge(bridgeState, payloadBuilder, advanceTime);

  const renderSeat = (seat, seatClassName) => {
    const seatInfo = SEAT_META[seat];
    const isTurn = state.turn === seat;
    const thinking = aiThinkingSeat === seat;
    return (
      <section className={["domino-seat", seatClassName, isTurn ? "active" : ""].filter(Boolean).join(" ")}>
        <header>
          <h5>{seatInfo.name}</h5>
          <span className="seat-meta">{seatInfo.label}</span>
        </header>
        <p className="seat-count">{state.hands[seat].length} {T.ui.tiles}</p>
        <HiddenSeatHand count={state.hands[seat].length} />
        {thinking ? <span className="domino-seat-thinking">{T.ui.thinking}</span> : null}
      </section>
    );
  };

  const playerSeatChip = (
    <section className={["domino-seat domino-seat-player-chip", state.turn === "player" ? "active" : ""].filter(Boolean).join(" ")}>
      <header>
        <h5>{SEAT_META.player.name}</h5>
        <span className="seat-meta">{SEAT_META.player.label}</span>
      </header>
      <p className="seat-count">{playerHand.length} {T.ui.tiles}</p>
    </section>
  );

  const mobileKpisBlock = (
    <div className="domino-mobile-kpis">
      <article><span>{T.ui.round}</span><strong>{state.roundNumber}</strong></article>
      <article><span>{T.ui.turn}</span><strong>{state.turn ? SEAT_META[state.turn].name : T.ui.closed}</strong></article>
      <article><span>{T.ui.chain}</span><strong>{state.chain.length}</strong></article>
      <article><span>{T.ui.target}</span><strong>{state.targetScore}</strong></article>
    </div>
  );

  const configBlock = (
    <div className="domino-strategy-config">
      <label htmlFor="domino-game-mode">
        {T.ui.mode}
        <select
          id="domino-game-mode"
          value={state.modeId}
          onChange={(event) => {
            const nextModeId = event.target.value;
            const nextModeConfig = getModeConfig(nextModeId);
            setState((previous) => createRoundState({
              modeId: nextModeConfig.id,
              scores: buildScoresForMode(nextModeConfig),
              targetScore: previous.targetScore,
              difficultyId: previous.difficultyId,
              roundNumber: 1,
              starterSeat: null
            }));
          }}
        >
          {Object.values(GAME_MODES).map((mode) => (
            <option key={mode.id} value={mode.id}>{mode.label}</option>
          ))}
        </select>
      </label>

      <label htmlFor="domino-ai-level">
        {T.ui.aiDifficulty}
        <select
          id="domino-ai-level"
          value={state.difficultyId}
          onChange={(event) => {
            const value = event.target.value;
            if (!AI_LEVELS[value]) return;
            setState((previous) => ({ ...previous, difficultyId: value }));
          }}
        >
          {Object.values(AI_LEVELS).map((level) => (
            <option key={level.id} value={level.id}>{level.label}</option>
          ))}
        </select>
      </label>

      <label htmlFor="domino-target-score">
        {T.ui.targetScore}
        <select
          id="domino-target-score"
          value={state.targetScore}
          disabled={!canAdjustTarget}
          onChange={(event) => {
            const nextTarget = Number(event.target.value) || DEFAULT_TARGET_SCORE;
            setState((previous) => ({ ...previous, targetScore: nextTarget }));
          }}
        >
          {TARGET_SCORE_OPTIONS.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </label>

      <p className="domino-config-note">
        {T.ui.controlsNote}
      </p>
    </div>
  );

  const statusRowBlock = (
    <div className="status-row">
      <span className={`status-pill ${state.phase === "playing" ? "playing" : "finished"}`}>{phaseLabel}</span>
      <span>{T.ui.round}: {state.roundNumber}</span>
      <span>{T.ui.turn}: {state.turn ? SEAT_META[state.turn].name : T.ui.closed}</span>
      <span>{T.ui.modeTag}: {modeConfig.rulesLabel}</span>
      <span>{T.ui.difficulty}: {AI_LEVELS[state.difficultyId]?.label || AI_LEVELS.medium.label}</span>
      <span>{T.ui.passes}: {state.consecutivePasses}/{modeConfig.seats.length}</span>
      <span>{T.ui.nextStarter}: {SEAT_META[state.nextStarterSeat]?.name}</span>
    </div>
  );

  const scoreboardBlock = (
    <div className="domino-scoreboard domino-team-scoreboard">
      {modeConfig.teamIds.map((teamId) => (
        <article
          key={teamId}
          className={`domino-scorecard ${teamId === playerTeamId ? "team-us" : "team-rivals"}`}
        >
          <p>{modeConfig.teams[teamId]?.label ?? teamId}</p>
          <strong>{state.scores[teamId] ?? 0}</strong>
          <span>{T.ui.hand}: {teamPips[teamId] ?? 0}</span>
        </article>
      ))}
      <article className="domino-scorecard team-target">
        <p>{T.ui.target}</p>
        <strong>{state.targetScore}</strong>
        <span>{T.ui.chain}: {state.chain.length}</span>
      </article>
    </div>
  );

  const tableBlock = (
    <div className="domino-table">
      <div className="domino-table-head">
        <span className="domino-variant-chip">{modeConfig.rulesLabel}</span>
        <span className="domino-table-note">{T.ui.tableNote}</span>
      </div>

      <div className="domino-edge-readout">
        <span className={state.selectedSide === "left" ? "is-active" : ""}>{T.ui.leftEdge}: {state.chain[0]?.left ?? "--"}</span>
        <span className="edge-total">{T.ui.tilesOnTable}: {state.chain.length}/28</span>
        <span className={state.selectedSide === "right" ? "is-active" : ""}>{T.ui.rightEdge}: {state.chain[state.chain.length - 1]?.right ?? "--"}</span>
      </div>

      <div className="domino-arena-shell">
        {modeConfig.seats.includes("partner") ? (
          <div className="domino-seat-slot slot-top">{renderSeat("partner", "domino-seat-top")}</div>
        ) : null}
        {modeConfig.seats.includes("left") ? (
          <div className="domino-seat-slot slot-left">{renderSeat("left", "domino-seat-left")}</div>
        ) : null}
        {modeConfig.seats.includes("right") ? (
          <div className="domino-seat-slot slot-right">{renderSeat("right", "domino-seat-right")}</div>
        ) : null}
        <div className="domino-chain-scroll">
          <div
            className="domino-chain domino-chain-stage"
            role="list"
            aria-label={T.ui.chainAria}
            style={{
              width: `${chainLayout.width}px`,
              height: `${chainLayout.height}px`,
              "--domino-stage-cell-width": `${stageCellWidth}px`,
              "--domino-stage-row-height": `${stageRowHeight}px`,
              "--domino-stage-tile-width": `${stageTileWidth}px`,
              "--domino-stage-tile-height": `${stageTileHeight}px`,
              "--domino-stage-double-width": `${stageDoubleWidth}px`,
              "--domino-stage-double-height": `${stageDoubleHeight}px`,
              "--domino-stage-half-height": `${stageHalfHeight}px`,
              "--domino-stage-double-half-height": `${stageDoubleHalfHeight}px`,
              "--domino-stage-pip-size": `${stagePipSize}px`,
            }}
          >
            {chainLayout.positions.map((node) => {
              const previousNode = chainLayout.positions[node.index - 1] ?? null;
              const nextNode = chainLayout.positions[node.index + 1] ?? null;
              const isRowStart = !previousNode || previousNode.row !== node.row;
              const isTurnNode = Boolean(nextNode && nextNode.row !== node.row);
              const isBoardStart = node.index === 0;
              const isBoardEnd = node.index === state.chain.length - 1;
              const rowDirection = node.row % 2 === 0 ? "forward" : "reverse";

              return (
                <span
                  key={`${node.tile.id}-${node.index}`}
                  className={[
                    "domino-chain-node",
                    node.axis === "vertical" ? "axis-vertical" : "axis-horizontal",
                    isRowStart ? "is-row-start" : "",
                    isTurnNode ? "is-turn-node" : "",
                    isBoardStart ? "node-start" : "",
                    isBoardEnd ? "node-end" : "",
                    rowDirection === "forward" ? "flow-forward" : "flow-reverse",
                  ].filter(Boolean).join(" ")}
                  style={{ left: `${node.leftPx}px`, top: `${node.topPx}px` }}
                >
                  <span
                    role="listitem"
                    className={[
                      "domino-tile",
                      node.tile.left === node.tile.right ? "is-double" : "",
                      node.axis === "vertical" && node.tile.left !== node.tile.right ? "is-vertical" : "",
                      node.tile.id === state.lastPlayerMoveTileId ? "last-player-tile" : "",
                      node.tile.id === state.lastPartnerMoveTileId ? "last-partner-tile" : "",
                      isBoardStart && state.selectedSide === "left" ? "active-edge" : "",
                      isBoardEnd && state.selectedSide === "right" ? "active-edge" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    <span className="domino-board-order">{node.index + 1}</span>
                    {isRowStart && !isBoardStart ? (
                      <span
                        className={`domino-flow-badge row-direction ${rowDirection === "forward" ? "flow-forward" : "flow-reverse"}`}
                      >
                        {rowDirection === "forward" ? ">" : "<"}
                      </span>
                    ) : null}
                    {isTurnNode ? (
                      <span
                        className={`domino-flow-badge turn-down ${rowDirection === "forward" ? "turn-right" : "turn-left"}`}
                      >
                        v
                      </span>
                    ) : null}
                    {isBoardStart ? <span className="domino-board-edge-tag edge-left">{T.ui.left}</span> : null}
                    {isBoardEnd ? <span className="domino-board-edge-tag edge-right">{T.ui.right}</span> : null}
                    {node.tile.id === state.lastPlayerMoveTileId ? (
                      <span className="domino-board-badge badge-player">{T.ui.lastPlayerBadge}</span>
                    ) : null}
                    {node.tile.id === state.lastPartnerMoveTileId ? (
                      <span className="domino-board-badge badge-partner">{T.ui.lastPartnerBadge}</span>
                    ) : null}
                    <span className="domino-half"><DominoPips value={node.tile.left} /><strong>{node.tile.left}</strong></span>
                    <span className="domino-divider" />
                    <span className="domino-half"><DominoPips value={node.tile.right} /><strong>{node.tile.right}</strong></span>
                  </span>
                </span>
              );
            })}
          </div>
        </div>
        <div className="domino-seat-slot slot-bottom">{playerSeatChip}</div>
      </div>

      {state.roundResult && playerOutcome ? (
        <div className={`domino-player-result-banner outcome-${playerOutcome}`} key={`${state.roundNumber}-${state.phase}-${playerOutcome}`}>
          <div className="domino-player-result-banner__halo" aria-hidden="true" />
          <div className="domino-player-result-banner__card">
            <span className="domino-player-result-banner__eyebrow">
              {state.phase === "match-over" ? T.phase.matchOver : T.phase.roundOver}
            </span>
            <strong>{playerResultTitle}</strong>
            <p>{playerResultLead}</p>
            {playerResultDetail ? <span className="domino-player-result-banner__detail">{playerResultDetail}</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  );

  const playableStripBlock = (
    <section className="domino-playable-strip domino-playable-strip-board" aria-label={T.ui.playableNow}>
      <div className="domino-playable-strip-head">
        <strong>{T.ui.playableNow}</strong>
        <span>{playableTileChoices.length ? `${playableTileChoices.length} ${T.ui.tiles}` : T.ui.noneEdge}</span>
      </div>
      {playableTileChoices.length ? (
        <div className="domino-playable-strip-list">
          {playableTileChoices.map(({ tile, index, sides }) => {
            const isSelected = index === state.selectedIndex;
            const sideHint =
              sides.length >= 2 ? "L/R" : sides[0] === "left" ? "L" : sides[0] === "right" ? "R" : "";
            return (
              <button
                key={`playable-${tile.id}`}
                type="button"
                className={[
                  "domino-hand-tile",
                  "domino-playable-chip",
                  tile.a === tile.b ? "is-double" : "",
                  isSelected ? "selected" : ""
                ].filter(Boolean).join(" ")}
                onClick={() => selectPlayableTile(index, sides.includes(state.selectedSide) ? state.selectedSide : sides[0])}
                disabled={!canPlayerPlay}
              >
                {sideHint ? <span className="domino-legal-hint">{sideHint}</span> : null}
                {isSelected ? <span className="domino-selected-badge">{T.ui.selected}</span> : null}
                <span className="domino-half"><DominoPips value={tile.a} /><strong>{tile.a}</strong></span>
                <span className="domino-divider" />
                <span className="domino-half"><DominoPips value={tile.b} /><strong>{tile.b}</strong></span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="domino-playable-empty">{T.ui.noPlayableNow}</p>
      )}
    </section>
  );

  const toolbarBlock = (
    <div className="domino-toolbar">
      <span>{T.ui.activeSide}: {sideLabel(state.selectedSide)}</span>
      <button type="button" onClick={() => setState((previous) => ({ ...previous, selectedSide: "left" }))}>{T.ui.left}</button>
      <button type="button" onClick={() => setState((previous) => ({ ...previous, selectedSide: "right" }))}>{T.ui.right}</button>
      <button type="button" onClick={playSelectedTile} disabled={!canPlayerPlay}>{T.ui.playTile}</button>
      <button type="button" onClick={passTurn} disabled={!canPlayerPass}>{T.ui.passTurn}</button>
    </div>
  );

  const selectedSummaryBlock = (
    <p className="domino-selected">
      {T.ui.selectionPrefix}: {selectedTile ? formatTile(selectedTile) : "--"}.
      {" "}
      {T.ui.fitsOn}:
      {" "}
      {selectedPlacements.length
        ? selectedPlacements.map((placement) => sideLabel(placement.side)).join(" / ")
        : T.ui.noneEdge}
      {" "}
      | {T.ui.yourLastMove}:
      {" "}
      {lastPlayerMoveTile
        ? `${lastPlayerMoveTile.left}|${lastPlayerMoveTile.right} (${sideLabel(state.lastPlayerMoveSide)})`
        : "--"}
      {" "}
      | {T.ui.partnerLastMove}:
      {" "}
      {modeConfig.seats.includes("partner")
        ? (
          lastPartnerMoveTile
            ? `${lastPartnerMoveTile.left}|${lastPartnerMoveTile.right} (${sideLabel(state.lastPartnerMoveSide)})`
            : "--"
        )
        : T.ui.notApplicable}
    </p>
  );

  const playerControlDockBlock = (
    <div className="domino-player-control-dock">
      {toolbarBlock}
      {selectedSummaryBlock}
    </div>
  );

  const playerHandBlock = (
    <div className="domino-player-zones">
      <section className={`domino-zone domino-zone-player ${state.turn === "player" ? "active" : ""}`}>
        <h5>{SEAT_META.player.name} ({playerHand.length} {T.ui.tiles})</h5>
        <div className="domino-hand" aria-label={T.ui.playerHandAria}>
          {playerHand.map((tile, index) => {
            const isSelected = index === state.selectedIndex;
            const playableSides = playableSidesByTileId.get(tile.id) || [];
            const sideHint =
              playableSides.length >= 2
                ? "L/R"
                : playableSides[0] === "left"
                  ? "L"
                  : playableSides[0] === "right"
                    ? "R"
                    : "";
            return (
              <button
                key={tile.id}
                type="button"
                disabled={!canPlayerPlay}
                aria-pressed={isSelected}
                className={[
                  "domino-hand-tile",
                  tile.a === tile.b ? "is-double" : "",
                  playableSides.length ? "playable" : "",
                  isSelected ? "selected" : ""
                ].filter(Boolean).join(" ")}
                onClick={() => setState((previous) => ({
                  ...previous,
                  selectedIndex: clampSelectedIndex(index, previous.hands.player.length)
                }))}
              >
                {canPlayerPlay && sideHint ? <span className="domino-legal-hint">{sideHint}</span> : null}
                {isSelected ? <span className="domino-selected-badge">{T.ui.selected}</span> : null}
                <span className="domino-half"><DominoPips value={tile.a} /><strong>{tile.a}</strong></span>
                <span className="domino-divider" />
                <span className="domino-half"><DominoPips value={tile.b} /><strong>{tile.b}</strong></span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );

  return (
    <div className={rootClasses}>
      <div className="mini-head">
        <div>
          <h4>{T.gameTitle}</h4>
          <p>{T.subtitle}</p>
        </div>
        <div className="domino-strategy-actions">
          <button type="button" onClick={restartMatch}>{T.ui.newMatch}</button>
          {state.phase === "round-over" ? <button type="button" onClick={startNextRound}>{T.ui.nextRound}</button> : null}
          {state.phase === "match-over" ? <button type="button" onClick={restartMatch}>{T.ui.rematch}</button> : null}
        </div>
      </div>

      {isPortraitMobile ? (
        <div className="domino-mobile-dual-layout">
          <section className="domino-mobile-stage-screen">
            {tableBlock}
            {playerHandBlock}
            {playerControlDockBlock}
          </section>
          <section className="domino-mobile-control-screen">
            {mobileKpisBlock}
            {scoreboardBlock}
            {configBlock}
          </section>
        </div>
      ) : (
        <>
          {configBlock}
          {statusRowBlock}
          {scoreboardBlock}
          {tableBlock}
          {playableStripBlock}
          {shouldDockPlayerControls ? (
            <>
              {playerHandBlock}
              {playerControlDockBlock}
            </>
          ) : (
            <>
              {toolbarBlock}
              {selectedSummaryBlock}
              {playerHandBlock}
            </>
          )}
        </>
      )}

      {state.roundResult ? (
        <div className="domino-round-summary">
          <strong>{T.ui.roundSummary}</strong>
          <p>
            {T.ui.winner}: {state.roundResult.winnerTeam === "draw" ? T.ui.draw : modeConfig.teams[state.roundResult.winnerTeam]?.label}
            {" "}
            | {T.ui.reason}:
            {" "}
            {state.roundResult.reason === "domino"
              ? T.ui.reasonDomino
              : state.roundResult.reason === "block-closed"
                ? T.ui.reasonClosed
                : T.ui.reasonPasses}
            {" "}
            | {T.ui.points}: {state.roundResult.pointsAwarded}
            {" "}
            | {T.ui.hand}: {getTeamPipsLabel(state.roundResult.teamPips ?? {}, modeConfig)}
          </p>
        </div>
      ) : null}

      <details className="domino-rules">
        <summary>{T.ui.rulesSummary}</summary>
        <pre>{RULES_PROMPT}</pre>
      </details>

      <p className="game-message">{state.message}</p>

      <ul className="game-log">
        {state.logs.map((entry, index) => (
          <li key={`${entry}-${index}`}>{entry}</li>
        ))}
      </ul>
    </div>
  );
}

export default DominoStrategyGame;

