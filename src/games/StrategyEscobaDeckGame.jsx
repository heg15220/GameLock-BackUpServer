
import React, { useCallback, useEffect, useMemo, useState } from "react";
import useGameRuntimeBridge from "../utils/useGameRuntimeBridge";

const HAND_SIZE = 3;
const TARGET_OPTIONS = [11, 15, 21];
const PLAYER_OPTIONS = [2, 3, 4];
const AI_DELAY_MS = 2300;
const TURN_SETTLE_DELAY_MS = 900;
const CAPTURE_FX_MS = 4800;
const CAPTURE_FX_GAP_MS = 900;
const DEAL_TO_HAND_FX_CARD_MS = 1200;
const DEAL_TO_HAND_FX_STAGGER_MS = 220;
const BACK_IMAGE = "/assets/cards/spanish/reverso.png";

const DIFF = {
  easy: { id: "easy", label: { es: "Facil", en: "Easy" }, noise: 55 },
  medium: { id: "medium", label: { es: "Media", en: "Medium" }, noise: 30 },
  hard: { id: "hard", label: { es: "Dificil", en: "Hard" }, noise: 14 },
  expert: { id: "expert", label: { es: "Experto", en: "Expert" }, noise: 6 },
};

const DECKS = {
  spanish: {
    id: "spanish",
    name: { es: "Espanola (40)", en: "Spanish (40)" },
    suits: [
      { id: "oros", symbol: "\u2666", colorClass: "suit-red", map: { es: "Oros", en: "Oros" } },
      { id: "copas", symbol: "\u2665", colorClass: "suit-red", map: { es: "Copas", en: "Copas" } },
      { id: "espadas", symbol: "\u2660", colorClass: "suit-black", map: { es: "Espadas", en: "Espadas" } },
      { id: "bastos", symbol: "\u2663", colorClass: "suit-black", map: { es: "Bastos", en: "Bastos" } },
    ],
    ranks: [
      { rank: 1, label: "A", value: 1 },
      { rank: 2, label: "2", value: 2 },
      { rank: 3, label: "3", value: 3 },
      { rank: 4, label: "4", value: 4 },
      { rank: 5, label: "5", value: 5 },
      { rank: 6, label: "6", value: 6 },
      { rank: 7, label: "7", value: 7 },
      { rank: 10, label: "S", value: 8 },
      { rank: 11, label: "C", value: 9 },
      { rank: 12, label: "R", value: 10 },
    ],
  },
  english_adapted: {
    id: "english_adapted",
    name: { es: "Inglesa adaptada (40)", en: "Adapted English (40)" },
    suits: [
      {
        id: "oros",
        symbol: "\u2666",
        colorClass: "suit-red",
        map: { es: "Diamantes (Oros)", en: "Diamonds (Oros)" },
      },
      {
        id: "copas",
        symbol: "\u2665",
        colorClass: "suit-red",
        map: { es: "Corazones (Copas)", en: "Hearts (Copas)" },
      },
      {
        id: "bastos",
        symbol: "\u2663",
        colorClass: "suit-black",
        map: { es: "Treboles (Bastos)", en: "Clubs (Bastos)" },
      },
      {
        id: "espadas",
        symbol: "\u2660",
        colorClass: "suit-black",
        map: { es: "Picas (Espadas)", en: "Spades (Espadas)" },
      },
    ],
    ranks: [
      { rank: 1, label: "A", value: 1 },
      { rank: 2, label: "2", value: 2 },
      { rank: 3, label: "3", value: 3 },
      { rank: 4, label: "4", value: 4 },
      { rank: 5, label: "5", value: 5 },
      { rank: 6, label: "6", value: 6 },
      { rank: 7, label: "7", value: 7 },
      { rank: 11, label: "J", value: 8 },
      { rank: 12, label: "Q", value: 9 },
      { rank: 13, label: "K", value: 10 },
    ],
  },
};

const SEAT_LAYOUTS = {
  2: [
    { slot: "bottom", x: 50, y: 86 },
    { slot: "top", x: 50, y: 12 },
  ],
  3: [
    { slot: "bottom", x: 50, y: 86 },
    { slot: "left", x: 12, y: 44 },
    { slot: "right", x: 88, y: 44 },
  ],
  4: [
    { slot: "bottom", x: 50, y: 87 },
    { slot: "left", x: 11, y: 44 },
    { slot: "top", x: 50, y: 12 },
    { slot: "right", x: 89, y: 44 },
  ],
};

const T = {
  es: {
    title: "Escoba del 15 IA",
    subtitleSpanish:
      "Modo Escoba con baraja espanola tradicional de 40 cartas (A..7, S, C, R).",
    subtitleEnglishAdapted:
      "Modo Escoba con baraja inglesa adaptada: sin 8, 9 y 10, y palos mapeados a oros/copas/bastos/espadas.",
    players: "Jugadores",
    diff: "Dificultad IA",
    target: "Puntos objetivo",
    deck: "Baraja",
    mandatory: "Recogida obligatoria",
    mandatoryOn: "Si",
    mandatoryOff: "No",
    teams: "Variante",
    teamsIndividual: "Individual",
    teamsPairs: "Parejas (2v2)",
    apply: "Aplicar y reiniciar",
    newMatch: "Nueva partida",
    nextHand: "Siguiente mano",
    phase: "Fase",
    phasePlaying: "En juego",
    phaseHandOver: "Mano cerrada",
    phaseMatchOver: "Partida cerrada",
    hand: "Mano",
    dealer: "Repartidor",
    turn: "Turno",
    turnLed: "Turno actual",
    stock: "Mazo",
    table: "Mesa",
    scores: "Marcador",
    escobas: "Escobas",
    captures: "Capturas",
    hidden: "ocultas",
    yourHand: "Tu mano",
    selectTable: "Selecciona cartas de la mesa para formar 15 con la carta que juegues.",
    mustCaptureChoice: "Debes recoger: elige una combinacion valida de la mesa.",
    invalidCapture: "Seleccion invalida: las cartas marcadas no forman 15.",
    noCapture: "No hay recogida posible. Carta depositada en mesa.",
    captured: "Recogida completada.",
    escobaMade: "Escoba lograda.",
    handOver: "Mano terminada. Revisa el reparto de puntos.",
    tieBreak:
      "Empate por encima del objetivo. Se juega una mano adicional de desempate.",
    winner: "Ganador",
    roundWinner: "Ganador de ronda",
    roundTie: "Empate de ronda",
    wonRoundLed: "Gana ronda",
    matchEnd: "Partida de Escoba terminada",
    summary: "Resumen de mano",
    categoryEscobas: "Escobas",
    categorySevenOros: "Siete de oros",
    categoryMostSevens: "Mayoria de sietes",
    categoryMostCards: "Mayoria de cartas",
    categoryMostOros: "Mayoria de oros",
    none: "Ninguno",
    controls:
      "Haz click en cartas de mesa para marcarlas y click en tu carta para jugar. Teclas: 1-3 juegan carta, Enter juega la primera, N siguiente mano, R reinicia.",
    rulesTitle: "Reglamento aplicado",
    rulesSpanish:
      "Escoba del 15 con baraja espanola tradicional de 40 cartas. Valores: As=1, 2..7 segun indice, Sota=8, Caballo=9, Rey=10. Se reparte 3 por jugador y 4 a la mesa; cada jugada intenta sumar 15 con carta jugada + mesa. Si limpias mesa haces escoba (+1). Al final: +1 por cada escoba, +1 por siete de oros, +1 por mayoria de sietes, +1 por mayoria de cartas y +1 por mayoria de oros. En empate por categoria, puntuan todos los empatados.",
    rulesEnglishAdapted:
      "Escoba del 15 con baraja inglesa adaptada a 40 cartas: se eliminan 8, 9 y 10. Valores: A=1..7=7, J=8, Q=9, K=10. Palos: Diamantes=Oros, Corazones=Copas, Treboles=Bastos, Picas=Espadas. Se reparte 3 por jugador y 4 a la mesa; cada jugada intenta sumar 15 con carta jugada + mesa. Si limpias mesa haces escoba (+1). Al final: +1 por cada escoba, +1 por siete de oros, +1 por mayoria de sietes, +1 por mayoria de cartas y +1 por mayoria de oros. En empate por categoria, puntuan todos los empatados.",
    suitMap: "Mapa de palos",
    teamUser: "Tu equipo",
    teamRival: "Rivales",
    you: "Tu",
    partner: "Companero IA",
    ai: "IA",
    clearSel: "Limpiar seleccion",
    selected: "Seleccionadas",
    canCapture: "Opciones de recogida",
    lastMove: "Ultima jugada",
    playedCard: "Carta jugada",
    capturedCards: "Cartas recogidas",
    captureFx: (name, count) => `${name} recoge ${count} cartas para sumar 15.`,
    tableAfter: "Mesa tras jugada",
    handAfter: "Cartas en mano",
    lastKnownCard: "Ultima carta vista",
    aiThinking: "La IA esta pensando su jugada...",
    settlePause: "Pausa para revisar la jugada anterior.",
    mandatoryHintOn:
      "Recogida obligatoria activa: no puedes tirar carta si existe combinacion a 15.",
    mandatoryHintOff:
      "Recogida obligatoria desactivada: puedes tirar carta sin recoger.",
    initialEscoba: "Escoba(s) inicial(es) del repartidor",
    redeal: "Nuevo reparto de 3 cartas.",
    newHandStart: "Nueva mano iniciada.",
  },
  en: {
    title: "AI Escoba 15",
    subtitleSpanish:
      "Escoba mode using the traditional 40-card Spanish deck (A..7, S, C, R).",
    subtitleEnglishAdapted:
      "Escoba mode with adapted English deck: 8/9/10 removed and suits mapped to Oros/Copas/Bastos/Espadas.",
    players: "Players",
    diff: "AI difficulty",
    target: "Target points",
    deck: "Deck",
    mandatory: "Mandatory capture",
    mandatoryOn: "Yes",
    mandatoryOff: "No",
    teams: "Variant",
    teamsIndividual: "Individual",
    teamsPairs: "Pairs (2v2)",
    apply: "Apply & reset",
    newMatch: "New match",
    nextHand: "Next hand",
    phase: "Phase",
    phasePlaying: "Playing",
    phaseHandOver: "Hand over",
    phaseMatchOver: "Match over",
    hand: "Hand",
    dealer: "Dealer",
    turn: "Turn",
    turnLed: "Current turn",
    stock: "Stock",
    table: "Table",
    scores: "Scoreboard",
    escobas: "Escobas",
    captures: "Captures",
    hidden: "hidden",
    yourHand: "Your hand",
    selectTable: "Select table cards to make 15 with the card you play.",
    mustCaptureChoice: "Capture is mandatory: pick a valid table combination.",
    invalidCapture: "Invalid selection: selected cards do not make 15.",
    noCapture: "No capture available. Card dropped on table.",
    captured: "Capture completed.",
    escobaMade: "Escoba completed.",
    handOver: "Hand finished. Review scoring breakdown.",
    tieBreak: "Tie above target. An extra tie-break hand will be played.",
    winner: "Winner",
    roundWinner: "Round winner",
    roundTie: "Round tie",
    wonRoundLed: "Won round",
    matchEnd: "Escoba match finished",
    summary: "Hand summary",
    categoryEscobas: "Escobas",
    categorySevenOros: "Seven of Oros",
    categoryMostSevens: "Most sevens",
    categoryMostCards: "Most cards",
    categoryMostOros: "Most Oros",
    none: "None",
    controls:
      "Click table cards to mark them, then click your hand card to play. Keys: 1-3 play card, Enter plays first card, N next hand, R restart.",
    rulesTitle: "Applied rules",
    rulesSpanish:
      "Escoba del 15 on the traditional 40-card Spanish deck. Values: Ace=1, 2..7 by rank, Sota=8, Caballo=9, Rey=10. Deal 3 cards to each player and 4 to the table; each play tries to make 15 with played card + table cards. Clearing table gives an escoba (+1). End-hand scoring: +1 per escoba, +1 seven of Oros, +1 most sevens, +1 most cards, +1 most Oros. Category ties award all tied owners.",
    rulesEnglishAdapted:
      "Escoba del 15 on an adapted English deck (40 cards): 8, 9 and 10 removed. Values: A=1..7=7, J=8, Q=9, K=10. Suit mapping: Diamonds=Oros, Hearts=Copas, Clubs=Bastos, Spades=Espadas. Deal 3 cards each and 4 to table; each play tries to make 15 using played card + table cards. Clearing table gives an escoba (+1). End-hand scoring: +1 each escoba, +1 seven of Oros, +1 most sevens, +1 most cards, +1 most Oros. Category ties award all tied owners.",
    suitMap: "Suit map",
    teamUser: "Your team",
    teamRival: "Opponents",
    you: "You",
    partner: "Partner AI",
    ai: "AI",
    clearSel: "Clear selection",
    selected: "Selected",
    canCapture: "Capture options",
    lastMove: "Last move",
    playedCard: "Played card",
    capturedCards: "Captured cards",
    captureFx: (name, count) => `${name} captures ${count} cards to make 15.`,
    tableAfter: "Table after move",
    handAfter: "Cards in hand",
    lastKnownCard: "Last seen card",
    aiThinking: "AI is thinking about the next move...",
    settlePause: "Pause to review the previous move.",
    mandatoryHintOn:
      "Mandatory capture is ON: you cannot drop a card when a 15 capture exists.",
    mandatoryHintOff:
      "Mandatory capture is OFF: you may drop a card without capturing.",
    initialEscoba: "Dealer initial escoba(s)",
    redeal: "Dealt a new set of 3 cards.",
    newHandStart: "New hand started.",
  },
};

const isEs = () =>
  typeof navigator !== "undefined" &&
  String(navigator.language || "").toLowerCase().startsWith("es");
const localeOf = () => (isEs() ? "es" : "en");
const tt = (loc) => T[loc] || T.en;
const deckIdForLocale = (loc) => (loc === "es" ? "spanish" : "english_adapted");
const normDeckId = (id) => (DECKS[id] ? id : "english_adapted");
const normPlayers = (n) => {
  const parsed = Number(n);
  return PLAYER_OPTIONS.includes(parsed) ? parsed : 4;
};
const normDiff = (id) => (DIFF[id] ? id : "medium");
const normTarget = (n) => {
  const parsed = Number(n);
  return TARGET_OPTIONS.includes(parsed) ? parsed : 15;
};
const normTeamMode = (playerCount, value) =>
  normPlayers(playerCount) === 4 ? Boolean(value) : false;
const nextId = (order, id) => {
  const idx = order.indexOf(id);
  if (idx < 0) return order[0];
  return order[(idx + 1) % order.length];
};
const rotateFromIndex = (items, index) => {
  if (!items.length) return [];
  const start = ((index % items.length) + items.length) % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
};
const shuffle = (items) => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};
const cardText = (card) =>
  card ? `${card.rankLabel}${card.suitSymbol}` : "--";
const sumValues = (cards) =>
  cards.reduce((sum, card) => sum + (card?.captureValue || 0), 0);
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const sameIdSet = (idsA, idsB) => {
  if (idsA.length !== idsB.length) return false;
  const setA = new Set(idsA);
  return idsB.every((id) => setA.has(id));
};

const buildDeck = (deckId) => {
  const deck = DECKS[normDeckId(deckId)];
  const cards = [];
  deck.suits.forEach((suit) => {
    deck.ranks.forEach((rank) => {
      cards.push({
        id: `escoba-${deck.id}-${suit.id}-${rank.rank}`,
        suitId: suit.id,
        suitSymbol: suit.symbol,
        colorClass: suit.colorClass,
        rank: rank.rank,
        rankLabel: rank.label,
        captureValue: rank.value,
        imageUrl:
          deck.id === "spanish"
            ? `/assets/cards/spanish/${String(rank.rank).padStart(2, "0")}-${suit.id}.png`
            : null,
      });
    });
  });
  return cards;
};

const buildPlayers = (playerCount, teamMode, t) => {
  const count = normPlayers(playerCount);
  const seats = SEAT_LAYOUTS[count] || SEAT_LAYOUTS[4];
  const players = [];
  for (let i = 0; i < count; i += 1) {
    const id = i === 0 ? "human" : `ai-${i}`;
    const isHuman = i === 0;
    const side = teamMode
      ? i % 2 === 0
        ? "user"
        : "rival"
      : isHuman
        ? "user"
        : "rival";
    const name = isHuman
      ? t.you
      : teamMode && side === "user"
        ? `${t.partner} ${Math.max(1, Math.floor(i / 2))}`
        : `${t.ai} ${i}`;
    players.push({
      id,
      name,
      human: isHuman,
      ai: !isHuman,
      side,
      seat: seats[i] || seats[0],
    });
  }
  return players;
};

const ownerIdsFrom = (players, teamMode) =>
  teamMode ? ["user", "rival"] : players.map((p) => p.id);

const ownerOfPlayer = (state, playerId) =>
  state.teamMode
    ? state.byId[playerId]?.side === "user"
      ? "user"
      : "rival"
    : playerId;

const ownerLabel = (state, ownerId, t) => {
  if (state.teamMode) return ownerId === "user" ? t.teamUser : t.teamRival;
  return state.byId[ownerId]?.name || ownerId;
};

const buildTurnMessage = (state, playerId, playedCard, capturedCards, madeEscoba, t) => {
  const actorName = state.byId[playerId]?.name || playerId;
  const playedText = cardText(playedCard);
  if (!capturedCards.length) {
    return `${actorName}: ${playedText}. ${t.noCapture}`;
  }
  const captureText = capturedCards.map((card) => cardText(card)).join(" + ");
  if (madeEscoba) {
    return `${actorName}: ${playedText} + ${captureText}. ${t.escobaMade}`;
  }
  return `${actorName}: ${playedText} + ${captureText}. ${t.captured}`;
};

const createOwnerMap = (players, teamMode, initialValue = 0) =>
  Object.fromEntries(ownerIdsFrom(players, teamMode).map((id) => [id, initialValue]));

const tableCombosForTarget = (tableCards, target) => {
  const out = [];
  if (target <= 0) return out;
  const walk = (start, running, picked) => {
    if (running === target && picked.length) {
      out.push([...picked]);
      return;
    }
    if (running >= target) return;
    for (let i = start; i < tableCards.length; i += 1) {
      const card = tableCards[i];
      const next = running + card.captureValue;
      if (next > target) continue;
      picked.push(card);
      walk(i + 1, next, picked);
      picked.pop();
    }
  };
  walk(0, 0, []);
  return out;
};

const captureOptionsForCard = (card, tableCards) =>
  tableCombosForTarget(tableCards, 15 - card.captureValue).map((cards) => ({
    ids: cards.map((c) => c.id),
    cards,
  }));

const initialEscobasFromTable = (tableCards) => {
  const total = sumValues(tableCards);
  if (total === 15) return 1;
  if (total !== 30) return 0;
  const combos = tableCombosForTarget(tableCards, 15);
  for (const combo of combos) {
    const set = new Set(combo.map((c) => c.id));
    if (set.size === combo.length && combo.length < tableCards.length) {
      return 2;
    }
  }
  return 0;
};

const dealRoundCards = (hands, stock, order, cardCount) => {
  for (let i = 0; i < cardCount; i += 1) {
    order.forEach((id) => {
      const card = stock.pop();
      if (card) hands[id].push(card);
    });
  }
};

const aiOptionScore = (option, tableSize) => {
  const all = option.cards;
  const sevens = all.filter((c) => c.rank === 7).length;
  const oros = all.filter((c) => c.suitId === "oros").length;
  const sevenOros = all.some((c) => c.rank === 7 && c.suitId === "oros") ? 1 : 0;
  const escoba = all.length === tableSize ? 1 : 0;
  return (
    all.length * 10 +
    sevens * 30 +
    oros * 9 +
    sevenOros * 120 +
    escoba * 160
  );
};

const estimateNoOutDrawRate = (population, outs, draws) => {
  const total = Math.max(0, Math.floor(population));
  const threatOuts = Math.max(0, Math.min(total, Math.floor(outs)));
  const take = Math.max(0, Math.floor(draws));
  if (!take) return 1;
  if (!total) return 0;
  if (!threatOuts) return 1;
  const safeCards = total - threatOuts;
  if (safeCards <= 0) return 0;
  const loops = Math.min(take, total);
  let rate = 1;
  for (let i = 0; i < loops; i += 1) {
    const denominator = total - i;
    const numerator = safeCards - i;
    if (denominator <= 0 || numerator <= 0) return 0;
    rate *= numerator / denominator;
  }
  return clamp01(rate);
};

const buildEscobaUnknownCards = (state, playerId) => {
  const knownIds = new Set();
  (state.hands[playerId] || []).forEach((card) => knownIds.add(card.id));
  (state.tableCards || []).forEach((card) => knownIds.add(card.id));
  Object.values(state.captures || {}).forEach((cards) => {
    (cards || []).forEach((card) => knownIds.add(card.id));
  });
  return buildDeck(state.deckId).filter((card) => !knownIds.has(card.id));
};

const estimateEscobaTableRisk = (tableCards) =>
  (tableCards || []).reduce((risk, card) => {
    let total = risk + 0.45;
    if (card.rank === 7) total += 0.85;
    if (card.suitId === "oros") total += 0.35;
    if (card.rank === 7 && card.suitId === "oros") total += 2.1;
    return total;
  }, 0);

const buildEscobaOutsProfile = (projectedTable, unknownCards, drawsAhead, rewardScore, riskScore) => {
  const outsAgainst = (unknownCards || []).reduce((count, card) => {
    const captureOpts = captureOptionsForCard(card, projectedTable);
    return captureOpts.length ? count + 1 : count;
  }, 0);
  const unseen = unknownCards.length;
  const failRateExact = unseen > 0
    ? 1 - estimateNoOutDrawRate(unseen, outsAgainst, drawsAhead)
    : 0;
  const safeRateExact = 1 - failRateExact;
  const failRateRule2 = clamp01((outsAgainst * 2 * Math.max(1, drawsAhead)) / 100);
  const failRateRule4 = clamp01((outsAgainst * (drawsAhead >= 2 ? 4 : 2)) / 100);
  const safeRateRule2 = 1 - failRateRule2;
  const safeRateRule4 = 1 - failRateRule4;
  const safeOddsRatio = safeRateExact > 0 ? failRateExact / safeRateExact : Infinity;
  const reward = Math.max(1, rewardScore);
  const risk = Math.max(1, riskScore);
  const requiredSafeRate = risk / (reward + risk);
  const priceRatio = reward / risk;
  return {
    unseen,
    outsAgainst,
    safeRateExact,
    safeRateRule2,
    safeRateRule4,
    safeOddsRatio,
    requiredSafeRate,
    priceRatio,
  };
};

const pickAiMove = (state, playerId) => {
  const hand = state.hands[playerId] || [];
  const diff = DIFF[state.difficultyId] || DIFF.medium;
  if (diff.id !== "expert") {
    const moves = hand.map((card, cardIndex) => {
      const options = captureOptionsForCard(card, state.tableCards);
      if (!options.length) {
        return {
          cardIndex,
          option: null,
          score:
            -(card.captureValue * 9) -
            (card.rank >= 11 ? 8 : 0) +
            Math.random() * diff.noise,
        };
      }
      const ranked = options
        .map((opt) => ({
          ...opt,
          score:
            aiOptionScore({ ...opt, cards: [...opt.cards, card] }, state.tableCards.length) +
            Math.random() * diff.noise,
        }))
        .sort((a, b) => b.score - a.score);
      return {
        cardIndex,
        option: ranked[0],
        score: ranked[0].score + card.captureValue,
      };
    });
    const best = moves.sort((a, b) => b.score - a.score)[0];
    return best || { cardIndex: 0, option: null };
  }

  const unknownCards = buildEscobaUnknownCards(state, playerId);
  const playersToActBeforeReturn = state.order.reduce((count, id) => {
    if (id === playerId) return count;
    return count + ((state.hands[id] || []).length > 0 ? 1 : 0);
  }, 0);
  const drawsAhead = Math.max(1, playersToActBeforeReturn);
  const moves = [];
  hand.forEach((card, cardIndex) => {
    const options = captureOptionsForCard(card, state.tableCards);
    const optionPool = options.length ? [...options] : [null];
    if (options.length && !state.mandatoryCapture) optionPool.push(null);
    optionPool.forEach((option) => {
      const optionIds = new Set(option?.ids || []);
      const projectedTable = option?.cards?.length
        ? state.tableCards.filter((tableCard) => !optionIds.has(tableCard.id))
        : [...state.tableCards, card];
      const immediateBase = option?.cards?.length
        ? aiOptionScore({ ...option, cards: [...option.cards, card] }, state.tableCards.length) + card.captureValue
        : -(card.captureValue * 9) - (card.rank >= 11 ? 8 : 0);
      const rewardScore = option?.cards?.length
        ? Math.max(6, immediateBase * 0.18)
        : Math.max(2, 9 - card.captureValue);
      const riskScore = Math.max(1, estimateEscobaTableRisk(projectedTable));
      const oddsOuts = buildEscobaOutsProfile(
        projectedTable,
        unknownCards,
        drawsAhead,
        rewardScore,
        riskScore
      );
      const safeComposite = Math.max(
        oddsOuts.safeRateExact,
        oddsOuts.safeRateRule2 * 0.85,
        oddsOuts.safeRateRule4 * 0.6
      );
      const edge = safeComposite - oddsOuts.requiredSafeRate;
      const oddsBeatPrice =
        safeComposite >= oddsOuts.requiredSafeRate - 0.02 ||
        (Number.isFinite(oddsOuts.safeOddsRatio) &&
          oddsOuts.safeOddsRatio <= oddsOuts.priceRatio * 1.03);
      let score = immediateBase;
      score += edge * 95;
      score += oddsBeatPrice ? 10 : -10;
      score -= oddsOuts.outsAgainst * 0.42;
      if (option?.cards?.length && projectedTable.length === 0) score += 18;
      score += Math.random() * diff.noise;
      moves.push({ cardIndex, option, score });
    });
  });
  const best = moves.sort((a, b) => b.score - a.score)[0];
  return best || { cardIndex: 0, option: null };
};

const teamLabel = (side, t) => (side === "user" ? t.teamUser : t.teamRival);
const hasPendingCaptureFx = (state) =>
  Boolean(state.captureFx || (state.captureFxQueue?.length || 0) > 0);

const scoreHand = (state, t) => {
  const owners = ownerIdsFrom(state.players, state.teamMode);
  const pointsByOwner = Object.fromEntries(owners.map((owner) => [owner, 0]));
  const byOwnerEscobas = Object.fromEntries(owners.map((owner) => [owner, 0]));
  const byOwnerCards = Object.fromEntries(owners.map((owner) => [owner, 0]));
  const byOwnerSevens = Object.fromEntries(owners.map((owner) => [owner, 0]));
  const byOwnerOros = Object.fromEntries(owners.map((owner) => [owner, 0]));
  let sevenOrosOwner = null;

  state.order.forEach((playerId) => {
    const owner = ownerOfPlayer(state, playerId);
    const cards = state.captures[playerId] || [];
    byOwnerEscobas[owner] += state.escobas[playerId] || 0;
    byOwnerCards[owner] += cards.length;
    cards.forEach((card) => {
      if (card.rank === 7) byOwnerSevens[owner] += 1;
      if (card.suitId === "oros") byOwnerOros[owner] += 1;
      if (card.rank === 7 && card.suitId === "oros") sevenOrosOwner = owner;
    });
  });

  const breakdown = [];

  owners.forEach((owner) => {
    const esc = byOwnerEscobas[owner];
    if (esc > 0) {
      pointsByOwner[owner] += esc;
      breakdown.push({
        key: "escobas",
        label: t.categoryEscobas,
        owner,
        points: esc,
        detail: String(esc),
      });
    }
  });

  if (sevenOrosOwner) {
    pointsByOwner[sevenOrosOwner] += 1;
    breakdown.push({
      key: "seven-oros",
      label: t.categorySevenOros,
      owner: sevenOrosOwner,
      points: 1,
      detail: "7\u2666",
    });
  }

  const maxSevens = Math.max(...owners.map((owner) => byOwnerSevens[owner] || 0));
  if (maxSevens > 0) {
    owners
      .filter((owner) => byOwnerSevens[owner] === maxSevens)
      .forEach((owner) => {
        pointsByOwner[owner] += 1;
        breakdown.push({
          key: "most-sevens",
          label: t.categoryMostSevens,
          owner,
          points: 1,
          detail: String(maxSevens),
        });
      });
  }

  const maxCards = Math.max(...owners.map((owner) => byOwnerCards[owner] || 0));
  if (maxCards > 0) {
    owners
      .filter((owner) => byOwnerCards[owner] === maxCards)
      .forEach((owner) => {
        pointsByOwner[owner] += 1;
        breakdown.push({
          key: "most-cards",
          label: t.categoryMostCards,
          owner,
          points: 1,
          detail: String(maxCards),
        });
      });
  }

  const maxOros = Math.max(...owners.map((owner) => byOwnerOros[owner] || 0));
  if (maxOros > 0) {
    owners
      .filter((owner) => byOwnerOros[owner] === maxOros)
      .forEach((owner) => {
        pointsByOwner[owner] += 1;
        breakdown.push({
          key: "most-oros",
          label: t.categoryMostOros,
          owner,
          points: 1,
          detail: String(maxOros),
        });
      });
  }

  return {
    pointsByOwner,
    breakdown,
    byOwnerEscobas,
    byOwnerCards,
    byOwnerSevens,
    byOwnerOros,
  };
};

const withAutoTurn = (state) => {
  if (hasPendingCaptureFx(state)) {
    if (!state.auto) return state;
    return { ...state, auto: null };
  }
  if (state.phase === "playing" && state.byId[state.turnId]?.ai) {
    const current = state.auto;
    const targetMs = AI_DELAY_MS;
    if (current?.type === "ai-turn" && current.ms === targetMs) return state;
    return { ...state, auto: { type: "ai-turn", ms: targetMs } };
  }
  if (!state.auto) return state;
  return { ...state, auto: null };
};

const withTurnSettlePause = (state) => {
  if (state.phase !== "playing") return { ...state, auto: null };
  if (hasPendingCaptureFx(state)) return { ...state, auto: null };
  const current = state.auto;
  const targetMs = TURN_SETTLE_DELAY_MS;
  if (current?.type === "turn-settle" && current.ms === targetMs) return state;
  return { ...state, auto: { type: "turn-settle", ms: targetMs } };
};

const runAutoStep = (state) => {
  if (hasPendingCaptureFx(state)) return { ...state, auto: null };
  if (!state.auto) return state;
  if (state.auto.type === "turn-settle") {
    return withAutoTurn({ ...state, auto: null });
  }
  if (state.auto.type === "ai-turn") {
    return runAiTurn({ ...state, auto: null });
  }
  return { ...state, auto: null };
};

const makeHandState = (base, handNumber, dealerIndex, scores, initialMessage = null) => {
  const t = tt(base.locale);
  const stock = shuffle(buildDeck(base.deckId));
  const hands = Object.fromEntries(base.order.map((id) => [id, []]));
  const captures = Object.fromEntries(base.order.map((id) => [id, []]));
  const escobas = Object.fromEntries(base.order.map((id) => [id, 0]));
  const manoIndex = (dealerIndex - 1 + base.order.length) % base.order.length;
  const dealOrder = rotateFromIndex(base.order, manoIndex);

  dealRoundCards(hands, stock, dealOrder, HAND_SIZE);
  const tableCards = [];
  for (let i = 0; i < 4; i += 1) {
    const card = stock.pop();
    if (card) tableCards.push(card);
  }

  let message = initialMessage || t.newHandStart;
  let lastCapturerId = null;
  const dealerId = base.order[dealerIndex];
  const initEscobas = initialEscobasFromTable(tableCards);
  if (initEscobas > 0) {
    captures[dealerId].push(...tableCards.splice(0));
    escobas[dealerId] += initEscobas;
    lastCapturerId = dealerId;
    message = `${base.byId[dealerId]?.name || dealerId}: ${t.initialEscoba} +${initEscobas}`;
  }

  return withAutoTurn({
    ...base,
    phase: "playing",
    handNumber,
    dealerIndex,
    manoId: base.order[manoIndex],
    turnId: base.order[manoIndex],
    stock,
    hands,
    tableCards,
    captures,
    escobas,
    lastCapturerId,
    lastMove: null,
    revealedCards: {},
    captureFx: null,
    captureFxQueue: [],
    captureFxSeq: 0,
    dealFx: null,
    dealFxSeq: 0,
    selectedTableIds: [],
    lastHand: null,
    matchWinner: null,
    scores: { ...scores },
    message,
    auto: null,
  });
};

const createMatch = (locale, opts = {}) => {
  const t = tt(locale);
  const playerCount = normPlayers(opts.playerCount || 4);
  const teamMode = normTeamMode(playerCount, opts.teamMode);
  const difficultyId = normDiff(opts.difficultyId || "medium");
  const targetPoints = normTarget(opts.targetPoints || 15);
  const mandatoryCapture = opts.mandatoryCapture !== false;
  const deckId = deckIdForLocale(locale);
  const deck = DECKS[deckId];
  const players = buildPlayers(playerCount, teamMode, t);
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const order = players.map((p) => p.id);
  const base = {
    locale,
    deckId,
    deckName: deck.name[locale] || deck.name.en,
    players,
    byId,
    order,
    playerCount,
    teamMode,
    difficultyId,
    targetPoints,
    mandatoryCapture,
  };
  const scores = createOwnerMap(players, teamMode, 0);
  const dealerIndex = Math.floor(Math.random() * order.length);
  return makeHandState(base, 1, dealerIndex, scores, t.newHandStart);
};

const endHandIfNeeded = (state) => {
  const t = tt(state.locale);
  const noCardsInHands = state.order.every((id) => (state.hands[id] || []).length === 0);
  if (!noCardsInHands) return state;

  if (state.stock.length > 0) {
    const hands = Object.fromEntries(
      state.order.map((id) => [id, [...(state.hands[id] || [])]])
    );
    const stock = [...state.stock];
    const manoIndex = state.order.indexOf(state.manoId);
    const dealOrder = rotateFromIndex(state.order, manoIndex);
    dealRoundCards(hands, stock, dealOrder, HAND_SIZE);
    const dealtToHuman = Math.max(
      0,
      (hands.human || []).length - ((state.hands.human || []).length)
    );
    const nextDealFxSeq = dealtToHuman > 0
      ? (state.dealFxSeq || 0) + 1
      : state.dealFxSeq || 0;
    const dealFx = dealtToHuman > 0
      ? { id: nextDealFxSeq, count: dealtToHuman }
      : null;
    return withAutoTurn({
      ...state,
      hands,
      stock,
      turnId: state.manoId,
      selectedTableIds: [],
      message: t.redeal,
      captureFx: null,
      captureFxQueue: [],
      dealFx,
      dealFxSeq: nextDealFxSeq,
      auto: null,
    });
  }

  let captures = state.captures;
  let tableCards = state.tableCards;
  if (state.lastCapturerId && state.tableCards.length) {
    captures = {
      ...state.captures,
      [state.lastCapturerId]: [
        ...(state.captures[state.lastCapturerId] || []),
        ...state.tableCards,
      ],
    };
    tableCards = [];
  }

  const scored = scoreHand({ ...state, captures, tableCards }, t);
  const owners = ownerIdsFrom(state.players, state.teamMode);
  const scores = { ...state.scores };
  owners.forEach((owner) => {
    scores[owner] = (scores[owner] || 0) + (scored.pointsByOwner[owner] || 0);
  });

  const roundMax = Math.max(...owners.map((owner) => scored.pointsByOwner[owner] || 0));
  const roundWinners =
    roundMax > 0
      ? owners.filter((owner) => (scored.pointsByOwner[owner] || 0) === roundMax)
      : [];
  const roundWinnerLabel = roundWinners.length
    ? roundWinners.map((owner) => ownerLabel(state, owner, t)).join(", ")
    : t.none;

  const maxPoints = Math.max(...owners.map((owner) => scores[owner] || 0));
  const leaders = owners.filter((owner) => (scores[owner] || 0) === maxPoints);
  const targetReached = maxPoints >= state.targetPoints;
  const uniqueWinner = targetReached && leaders.length === 1 ? leaders[0] : null;

  return {
    ...state,
    phase: uniqueWinner ? "match-over" : "hand-over",
    captures,
    tableCards,
    captureFx: null,
    captureFxQueue: [],
    dealFx: null,
    auto: null,
    matchWinner: uniqueWinner,
    scores,
    message: uniqueWinner
      ? `${ownerLabel(state, uniqueWinner, t)} ${t.winner.toLowerCase()}.`
      : targetReached && leaders.length > 1
        ? t.tieBreak
        : t.handOver,
    lastHand: {
      pointsByOwner: scored.pointsByOwner,
      breakdown: scored.breakdown,
      byOwnerEscobas: scored.byOwnerEscobas,
      byOwnerCards: scored.byOwnerCards,
      byOwnerSevens: scored.byOwnerSevens,
      byOwnerOros: scored.byOwnerOros,
      scoresAfter: scores,
      winnerOwners: roundWinners,
      winnerLabel: roundWinnerLabel,
    },
  };
};

const resolvePlay = (state, playerId, cardIndex, chosenOption) => {
  if (
    state.phase !== "playing" ||
    state.turnId !== playerId ||
    state.auto ||
    hasPendingCaptureFx(state)
  ) {
    return state;
  }
  const t = tt(state.locale);
  const hand = [...(state.hands[playerId] || [])];
  const card = hand[cardIndex];
  if (!card) return state;

  hand.splice(cardIndex, 1);
  const hands = { ...state.hands, [playerId]: hand };
  const tableCards = [...state.tableCards];
  const captures = { ...state.captures, [playerId]: [...(state.captures[playerId] || [])] };
  const escobas = { ...state.escobas };
  const actorName = state.byId[playerId]?.name || playerId;
  let lastCapturerId = state.lastCapturerId;
  let pickedCards = [];
  let madeEscoba = false;

  if (chosenOption?.cards?.length) {
    const takeIds = new Set(chosenOption.cards.map((c) => c.id));
    const picked = tableCards.filter((c) => takeIds.has(c.id));
    const remaining = tableCards.filter((c) => !takeIds.has(c.id));
    pickedCards = picked;
    captures[playerId].push(...pickedCards, card);
    lastCapturerId = playerId;
    if (remaining.length === 0) {
      escobas[playerId] = (escobas[playerId] || 0) + 1;
      madeEscoba = true;
    }
    tableCards.splice(0, tableCards.length, ...remaining);
  } else {
    tableCards.push(card);
  }

  const message = buildTurnMessage(state, playerId, card, pickedCards, madeEscoba, t);
  const nextCaptureFxSeq = pickedCards.length ? (state.captureFxSeq || 0) + 1 : state.captureFxSeq || 0;
  const captureFxCards = pickedCards.length ? [card, ...pickedCards].map((item) => ({ ...item })) : [];
  const captureFx = pickedCards.length
    ? {
        id: nextCaptureFxSeq,
        actorId: playerId,
        text: t.captureFx(actorName, pickedCards.length + 1),
        cards: captureFxCards,
      }
    : null;
  const captureFxQueue = [...(state.captureFxQueue || [])];
  let activeCaptureFx = state.captureFx || null;
  if (captureFx) {
    if (activeCaptureFx || captureFxQueue.length) {
      captureFxQueue.push(captureFx);
    } else {
      activeCaptureFx = captureFx;
    }
  }
  const playedCardText = cardText(card);
  const nextTurnId = nextId(state.order, playerId);
  const updated = {
    ...state,
    hands,
    tableCards,
    captures,
    escobas,
    lastCapturerId,
    turnId: nextTurnId,
    selectedTableIds: [],
    revealedCards: {
      ...(state.revealedCards || {}),
      [playerId]: playedCardText,
    },
    lastMove: {
      actorId: playerId,
      actorName,
      card: playedCardText,
      cardId: card.id,
      captured: pickedCards.map((pickedCard) => cardText(pickedCard)),
      madeEscoba,
      tableCountAfter: tableCards.length,
      handCountAfter: hand.length,
    },
    captureFx: activeCaptureFx,
    captureFxQueue,
    captureFxSeq: nextCaptureFxSeq,
    message,
    auto: null,
  };
  const afterPlay = endHandIfNeeded(updated);
  if (afterPlay.phase !== "playing") {
    return { ...afterPlay, auto: null };
  }
  return withTurnSettlePause(afterPlay);
};

const applyHumanCard = (state, cardIndex) => {
  if (
    state.phase !== "playing" ||
    state.turnId !== "human" ||
    state.auto ||
    hasPendingCaptureFx(state)
  ) {
    return state;
  }
  const t = tt(state.locale);
  const hand = state.hands.human || [];
  const card = hand[cardIndex];
  if (!card) return state;

  const options = captureOptionsForCard(card, state.tableCards);
  const selectedIds = [...state.selectedTableIds];
  const selectedOption = options.find((opt) => sameIdSet(opt.ids, selectedIds));

  if (options.length && state.mandatoryCapture) {
    if (selectedOption) return resolvePlay(state, "human", cardIndex, selectedOption);
    if (!selectedIds.length && options.length === 1) {
      return resolvePlay(state, "human", cardIndex, options[0]);
    }
    return { ...state, message: t.mustCaptureChoice };
  }

  if (selectedIds.length) {
    if (!selectedOption) return { ...state, message: t.invalidCapture };
    return resolvePlay(state, "human", cardIndex, selectedOption);
  }

  return resolvePlay(state, "human", cardIndex, null);
};

const runAiTurn = (state) => {
  if (state.phase !== "playing") return { ...state, auto: null };
  const player = state.byId[state.turnId];
  if (!player?.ai) return { ...state, auto: null };
  const move = pickAiMove(state, player.id);
  return resolvePlay({ ...state, auto: null }, player.id, move.cardIndex, move.option);
};

function Card({
  card,
  deckId = "english_adapted",
  hidden = false,
  compact = false,
  onClick,
  disabled,
  selected,
  led = false,
}) {
  const cls = [
    "brisca-card",
    compact ? "compact" : "",
    hidden ? "hidden" : "",
    card?.imageUrl ? "image-card" : "",
    card?.colorClass || "",
    onClick ? "playable" : "",
    selected ? "selected-for-discard" : "",
    led ? "led-marked" : "",
  ]
    .filter(Boolean)
    .join(" ");
  if (hidden) {
    return (
      <div className={cls}>
        {deckId === "spanish" ? (
          <img src={BACK_IMAGE} alt="hidden" className="back-image" />
        ) : (
          <span className="back-mark">IA</span>
        )}
      </div>
    );
  }
  if (!card) return <div className={`${cls} slot`}><span>--</span></div>;
  const face = card.imageUrl ? (
    <img src={card.imageUrl} alt={cardText(card)} className="face-image" />
  ) : (
    <>
      <span className="rank">{card.rankLabel}</span>
      <span className="suit">{card.suitSymbol}</span>
      <span className="points">{card.captureValue}</span>
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick} disabled={disabled}>
        {face}
      </button>
    );
  }
  return <div className={cls}>{face}</div>;
}

function StrategyEscobaDeckGame() {
  const locale = useMemo(localeOf, []);
  const t = useMemo(() => tt(locale), [locale]);
  const [s, setS] = useState(() => createMatch(locale));
  const [pPlayers, setPPlayers] = useState(4);
  const [pDiff, setPDiff] = useState("medium");
  const [pTarget, setPTarget] = useState(15);
  const [pMandatory, setPMandatory] = useState(true);
  const [pTeamMode, setPTeamMode] = useState(false);

  useEffect(() => {
    setPPlayers(s.playerCount);
    setPDiff(s.difficultyId);
    setPTarget(s.targetPoints);
    setPMandatory(Boolean(s.mandatoryCapture));
    setPTeamMode(Boolean(s.teamMode));
  }, [s.playerCount, s.difficultyId, s.targetPoints, s.mandatoryCapture, s.teamMode]);

  const apply = useCallback(() => {
    setS(
      createMatch(locale, {
        playerCount: pPlayers,
        difficultyId: pDiff,
        targetPoints: pTarget,
        mandatoryCapture: pMandatory,
        teamMode: pTeamMode,
      })
    );
  }, [locale, pPlayers, pDiff, pTarget, pMandatory, pTeamMode]);

  const restart = useCallback(() => {
    setS((prev) =>
      createMatch(prev.locale, {
        playerCount: prev.playerCount,
        difficultyId: prev.difficultyId,
        targetPoints: prev.targetPoints,
        mandatoryCapture: prev.mandatoryCapture,
        teamMode: prev.teamMode,
      })
    );
  }, []);

  const nextHand = useCallback(() => {
    setS((prev) => {
      if (prev.phase !== "hand-over") return prev;
      const nextDealer = (prev.dealerIndex + 1) % prev.order.length;
      const base = {
        locale: prev.locale,
        deckId: prev.deckId,
        deckName: prev.deckName,
        players: prev.players,
        byId: prev.byId,
        order: prev.order,
        playerCount: prev.playerCount,
        teamMode: prev.teamMode,
        difficultyId: prev.difficultyId,
        targetPoints: prev.targetPoints,
        mandatoryCapture: prev.mandatoryCapture,
      };
      return makeHandState(base, prev.handNumber + 1, nextDealer, prev.scores);
    });
  }, []);

  const toggleTableCard = useCallback((cardId) => {
    setS((prev) => {
      if (
        prev.phase !== "playing" ||
        prev.turnId !== "human" ||
        prev.auto ||
        hasPendingCaptureFx(prev)
      ) {
        return prev;
      }
      return {
        ...prev,
        selectedTableIds: prev.selectedTableIds.includes(cardId)
          ? prev.selectedTableIds.filter((id) => id !== cardId)
          : [...prev.selectedTableIds, cardId],
      };
    });
  }, []);

  const clearSelection = useCallback(() => {
    setS((prev) =>
      prev.phase === "playing" &&
      prev.turnId === "human" &&
      !prev.auto &&
      !hasPendingCaptureFx(prev)
        ? { ...prev, selectedTableIds: [], message: t.selectTable }
        : prev
    );
  }, [t]);

  const playHumanCard = useCallback((index) => {
    setS((prev) => applyHumanCard(prev, index));
  }, []);

  useEffect(() => {
    if (!s.auto) return undefined;
    const tm = setTimeout(() => {
      setS((prev) => {
        if (!prev.auto) return prev;
        return runAutoStep(prev);
      });
    }, s.auto.ms || 0);
    return () => clearTimeout(tm);
  }, [s.auto]);

  useEffect(() => {
    if (!s.captureFx?.id) return undefined;
    const activeFxId = s.captureFx.id;
    const tm = setTimeout(() => {
      setS((prev) => {
        if (!prev.captureFx || prev.captureFx.id !== activeFxId) return prev;
        return { ...prev, captureFx: null };
      });
    }, CAPTURE_FX_MS);
    return () => clearTimeout(tm);
  }, [s.captureFx]);

  useEffect(() => {
    if (s.captureFx || !s.captureFxQueue?.length) return undefined;
    const tm = setTimeout(() => {
      setS((prev) => {
        if (prev.captureFx || !prev.captureFxQueue?.length) return prev;
        const [nextFx, ...restQueue] = prev.captureFxQueue;
        return {
          ...prev,
          captureFx: nextFx,
          captureFxQueue: restQueue,
        };
      });
    }, CAPTURE_FX_GAP_MS);
    return () => clearTimeout(tm);
  }, [s.captureFx, s.captureFxQueue]);

  useEffect(() => {
    if (s.phase !== "playing" || s.auto || hasPendingCaptureFx(s)) return undefined;
    if (!s.byId[s.turnId]?.ai) return undefined;
    setS((prev) => {
      if (prev.phase !== "playing" || prev.auto || hasPendingCaptureFx(prev)) return prev;
      return withAutoTurn(prev);
    });
    return undefined;
  }, [s.phase, s.turnId, s.auto, s.captureFx, s.captureFxQueue, s.byId]);

  useEffect(() => {
    if (!s.dealFx?.id) return undefined;
    const activeDealFxId = s.dealFx.id;
    const clearMs =
      DEAL_TO_HAND_FX_CARD_MS +
      Math.max(0, (s.dealFx.count || 1) - 1) * DEAL_TO_HAND_FX_STAGGER_MS;
    const tm = setTimeout(() => {
      setS((prev) => {
        if (!prev.dealFx || prev.dealFx.id !== activeDealFxId) return prev;
        return { ...prev, dealFx: null };
      });
    }, clearMs);
    return () => clearTimeout(tm);
  }, [s.dealFx]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = String(e.target?.tagName || "").toLowerCase();
      if (["input", "textarea", "select"].includes(tag)) return;
      const k = String(e.key || "").toLowerCase();
      if (k === "r") {
        e.preventDefault();
        restart();
        return;
      }
      if (k === "n") {
        e.preventDefault();
        nextHand();
        return;
      }
      if (
        s.phase === "playing" &&
        s.turnId === "human" &&
        !s.auto &&
        !hasPendingCaptureFx(s)
      ) {
        if (["1", "2", "3"].includes(k)) {
          e.preventDefault();
          playHumanCard(Number(k) - 1);
          return;
        }
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          playHumanCard(0);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s.phase, s.turnId, s.auto, s.captureFx, s.captureFxQueue, restart, nextHand, playHumanCard]);

  const bridgePayload = useCallback(
    (snap) => {
      const owners = ownerIdsFrom(snap.players, snap.teamMode);
      return {
        mode: "strategy-escoba-15",
        deck: snap.deckId,
        deckName: snap.deckName,
        phase: snap.phase,
        hand: snap.handNumber,
        dealer: snap.order[snap.dealerIndex] || null,
        mano: snap.manoId,
        turn: snap.turnId,
        playerCount: snap.playerCount,
        teamMode: snap.teamMode,
        targetPoints: snap.targetPoints,
        mandatoryCapture: snap.mandatoryCapture,
        difficulty: snap.difficultyId,
        coordinates:
          "Seat coordinates are percentages on table felt (origin top-left, +x right, +y down).",
        stockCount: snap.stock.length,
        table: snap.tableCards.map((card) => ({
          id: card.id,
          card: cardText(card),
          value: card.captureValue,
          suit: card.suitId,
        })),
        selectedTable: [...snap.selectedTableIds],
        hands: {
          human: (snap.hands.human || []).map((card) => ({
            id: card.id,
            card: cardText(card),
            value: card.captureValue,
          })),
          counts: Object.fromEntries(
            snap.order.map((id) => [id, (snap.hands[id] || []).length])
          ),
        },
        captures: {
          counts: Object.fromEntries(
            snap.order.map((id) => [id, (snap.captures[id] || []).length])
          ),
          escobas: { ...snap.escobas },
        },
        owners: owners.map((owner) => ({
          id: owner,
          score: snap.scores[owner] || 0,
        })),
        lastCapturerId: snap.lastCapturerId || null,
        auto: snap.auto
          ? {
              type: snap.auto.type,
              ms: snap.auto.ms || 0,
            }
          : null,
        lastMove: snap.lastMove
          ? {
              actorId: snap.lastMove.actorId,
              actorName: snap.lastMove.actorName,
              card: snap.lastMove.card,
              cardId: snap.lastMove.cardId || null,
              captured: snap.lastMove.captured || [],
              madeEscoba: Boolean(snap.lastMove.madeEscoba),
              tableCountAfter: snap.lastMove.tableCountAfter,
              handCountAfter: snap.lastMove.handCountAfter,
            }
          : null,
        captureFx: snap.captureFx
          ? {
              actorId: snap.captureFx.actorId,
              text: snap.captureFx.text,
              cards: (snap.captureFx.cards || []).map((card) => cardText(card)),
            }
          : null,
        captureFxQueued: snap.captureFxQueue?.length || 0,
        dealFx: snap.dealFx
          ? {
              count: snap.dealFx.count || 0,
            }
          : null,
        revealedCards: { ...(snap.revealedCards || {}) },
        lastHand: snap.lastHand
          ? {
              pointsByOwner: snap.lastHand.pointsByOwner,
              breakdown: snap.lastHand.breakdown,
              scoresAfter: snap.lastHand.scoresAfter,
              winnerOwners: snap.lastHand.winnerOwners || [],
              winnerLabel: snap.lastHand.winnerLabel || null,
            }
          : null,
        actions: {
          canPlayHuman:
            snap.phase === "playing" &&
            snap.turnId === "human" &&
            !snap.auto &&
            !hasPendingCaptureFx(snap),
          canNextHand: snap.phase === "hand-over",
          canRestart: true,
          canToggleTable:
            snap.phase === "playing" &&
            snap.turnId === "human" &&
            !snap.auto &&
            !hasPendingCaptureFx(snap),
        },
        message: snap.message,
      };
    },
    []
  );

  const advanceTime = useCallback((ms) => {
    setS((prev) => {
      if (!prev.auto) return prev;
      if ((ms || 0) >= (prev.auto.ms || 0)) {
        return runAutoStep(prev);
      }
      return {
        ...prev,
        auto: { ...prev.auto, ms: (prev.auto.ms || 0) - (ms || 0) },
      };
    });
  }, []);
  useGameRuntimeBridge(s, bridgePayload, advanceTime);

  const phaseText =
    s.phase === "playing"
      ? t.phasePlaying
      : s.phase === "hand-over"
        ? t.phaseHandOver
        : t.phaseMatchOver;
  const deckMeta = DECKS[normDeckId(s.deckId)];
  const subtitleText =
    s.deckId === "spanish" ? t.subtitleSpanish : t.subtitleEnglishAdapted;
  const rulesText =
    s.deckId === "spanish" ? t.rulesSpanish : t.rulesEnglishAdapted;
  const isHumanTurn =
    s.phase === "playing" &&
    s.turnId === "human" &&
    !s.auto &&
    !hasPendingCaptureFx(s);
  const isHumanCurrentTurn = s.phase === "playing" && s.turnId === "human";
  const scoreOwners = ownerIdsFrom(s.players, s.teamMode);
  const dealerId = s.order[s.dealerIndex];
  const selectedSet = new Set(s.selectedTableIds);
  const mapLine = deckMeta.suits.map((suit) =>
    `${suit.symbol} ${suit.map[locale] || suit.map.en}`
  ).join(" | ");
  const handGainRows = scoreOwners.map((owner) => ({
    owner,
    score: s.scores[owner] || 0,
    gain: s.lastHand?.pointsByOwner?.[owner] || 0,
  }));
  const roundWinnerOwners = s.lastHand?.winnerOwners || [];
  const roundWinnerLabel = s.lastHand?.winnerLabel || null;
  const humanWonRound = roundWinnerOwners.includes(ownerOfPlayer(s, "human"));
  const autoStatusText =
    s.auto?.type === "ai-turn"
      ? t.aiThinking
      : s.auto?.type === "turn-settle"
        ? t.settlePause
        : null;
  const lastPlayedCardOnTableId =
    s.lastMove && !s.lastMove.captured?.length ? s.lastMove.cardId : null;

  return (
    <div className="mini-game strategy-brisca-game brisca-arena strategy-escoba-game">
      <div className="mini-head">
        <div>
          <h4>{t.title}</h4>
          <p>{subtitleText}</p>
        </div>
        <div className="brisca-actions-head">
          <button type="button" onClick={restart}>
            {t.newMatch}
          </button>
          {s.phase === "hand-over" ? (
            <button type="button" onClick={nextHand}>
              {t.nextHand}
            </button>
          ) : null}
        </div>
      </div>

      <div className="brisca-config escoba-config">
        <label htmlFor="escoba-players">
          <span>{t.players}</span>
          <select
            id="escoba-players"
            value={pPlayers}
            onChange={(e) => {
              const count = normPlayers(e.target.value);
              setPPlayers(count);
              if (count !== 4) setPTeamMode(false);
            }}
          >
            {PLAYER_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="escoba-diff">
          <span>{t.diff}</span>
          <select
            id="escoba-diff"
            value={pDiff}
            onChange={(e) => setPDiff(normDiff(e.target.value))}
          >
            {Object.values(DIFF).map((diff) => (
              <option key={diff.id} value={diff.id}>
                {diff.label[locale] || diff.label.en}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="escoba-target">
          <span>{t.target}</span>
          <select
            id="escoba-target"
            value={pTarget}
            onChange={(e) => setPTarget(normTarget(e.target.value))}
          >
            {TARGET_OPTIONS.map((target) => (
              <option key={target} value={target}>
                {target}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="escoba-mandatory">
          <span>{t.mandatory}</span>
          <select
            id="escoba-mandatory"
            value={pMandatory ? "yes" : "no"}
            onChange={(e) => setPMandatory(e.target.value === "yes")}
          >
            <option value="yes">{t.mandatoryOn}</option>
            <option value="no">{t.mandatoryOff}</option>
          </select>
        </label>
        <label htmlFor="escoba-team-mode">
          <span>{t.teams}</span>
          <select
            id="escoba-team-mode"
            value={pTeamMode ? "pairs" : "solo"}
            onChange={(e) => setPTeamMode(e.target.value === "pairs")}
            disabled={pPlayers !== 4}
          >
            <option value="solo">{t.teamsIndividual}</option>
            <option value="pairs">{t.teamsPairs}</option>
          </select>
        </label>
        <button type="button" className="brisca-apply" onClick={apply}>
          {t.apply}
        </button>
      </div>

      <div className="status-row brisca-status-row escoba-status-row">
        <span className={`status-pill ${s.phase === "match-over" ? "finished" : "playing"}`}>
          {phaseText}
        </span>
        <span>
          {t.hand}: {s.handNumber}
        </span>
        <span>
          {t.dealer}: {s.byId[dealerId]?.name || dealerId}
        </span>
        <span>
          {t.turn}: {s.byId[s.turnId]?.name || s.turnId}
        </span>
        {autoStatusText ? <span>{autoStatusText}</span> : null}
        <span>
          {t.stock}: {s.stock.length}
        </span>
        <span>
          {t.table}: {s.tableCards.length}
        </span>
        <span>
          {t.target}: {s.targetPoints}
        </span>
        <span>
          {t.deck}: {s.deckName}
        </span>
        {roundWinnerLabel ? (
          <span>
            {roundWinnerOwners.length > 1 ? t.roundTie : t.roundWinner}: {roundWinnerLabel}
          </span>
        ) : null}
      </div>

      <div className="brisca-table-shell">
        <div className={`brisca-table-felt ai-count-${Math.max(1, s.players.length - 1)}`}>
          <div className="brisca-seat-ring">
            {s.players
              .filter((player) => !player.human)
              .map((player) => {
                const wonRound = roundWinnerOwners.includes(ownerOfPlayer(s, player.id));
                const isCurrentTurn = s.phase === "playing" && s.turnId === player.id;
                const hasCaptureFx = s.captureFx?.actorId === player.id;
                return (
                  <article
                    key={player.id}
                    className={[
                      "brisca-seat",
                      "seat-ai",
                      player.side === "user" ? "seat-friendly" : "seat-rival",
                      `seat-slot-${player.seat.slot}`,
                      isCurrentTurn ? "seat-active seat-active-turn" : "",
                      hasCaptureFx ? "capture-fx-seat" : "",
                      wonRound ? "seat-won-trick" : "",
                    ].join(" ")}
                    style={{
                      "--seat-x": `${player.seat.x}%`,
                      "--seat-y": `${player.seat.y}%`,
                    }}
                  >
                    <header>
                      <h5>{player.name}</h5>
                      <span className="seat-tag">
                        {s.teamMode ? teamLabel(player.side, t) : t.ai}
                      </span>
                    </header>
                    <p className="seat-side">
                      {t.captures}: <strong>{(s.captures[player.id] || []).length}</strong>
                    </p>
                    <p className="seat-kpi">
                      {t.escobas}: <strong>{s.escobas[player.id] || 0}</strong>
                    </p>
                    {isCurrentTurn ? (
                      <span className="seat-turn-led current-turn-led" aria-label={`${player.name}: ${t.turnLed}`}>
                        {t.turnLed}
                      </span>
                    ) : null}
                    {wonRound ? (
                      <span className="seat-turn-led" aria-label={`${player.name}: ${t.wonRoundLed}`}>
                        {t.wonRoundLed}
                      </span>
                    ) : null}
                    <div
                      className="seat-hidden-hand"
                      aria-label={`${(s.hands[player.id] || []).length} ${t.hidden}`}
                    >
                      {(s.hands[player.id] || []).map((card) => (
                        <Card key={card.id} deckId={s.deckId} hidden compact />
                      ))}
                    </div>
                  </article>
                );
              })}
          </div>
          {s.captureFx ? (
            <div className="escoba-capture-fx" role="status" aria-live="polite">
              <div className="escoba-capture-fx-head">
                <span className="escoba-led-dot" aria-hidden="true" />
                <strong>{s.captureFx.text}</strong>
              </div>
              {s.captureFx.cards?.length ? (
                <div className="escoba-capture-fx-cards" aria-hidden="true">
                  {s.captureFx.cards.map((fxCard, index) => (
                    <React.Fragment key={`${s.captureFx.id}-${fxCard.id}-${index}`}>
                      {index > 0 ? <span className="fx-plus">+</span> : null}
                      <div
                        className="escoba-capture-fx-card-wrap"
                        style={{ "--fx-index": index }}
                      >
                        <Card deckId={s.deckId} card={fxCard} compact led />
                      </div>
                    </React.Fragment>
                  ))}
                  <span className="fx-equals">= 15</span>
                </div>
              ) : null}
            </div>
          ) : null}
          {s.dealFx ? (
            <div className="escoba-deal-fx" aria-hidden="true">
              {Array.from({ length: s.dealFx.count || 0 }).map((_, index) => {
                const spread = (index - ((s.dealFx.count || 1) - 1) / 2) * 22;
                return (
                  <div
                    key={`escoba-deal-fx-${s.dealFx.id}-${index}`}
                    className="escoba-deal-fx-card"
                    style={{
                      "--deal-index": index,
                      "--deal-spread": `${spread}px`,
                    }}
                  >
                    <Card deckId={s.deckId} hidden compact />
                  </div>
                );
              })}
            </div>
          ) : null}

          <section className="brisca-center-zone escoba-center-zone">
            <div className="escoba-board-score">
              <h6>{t.scores}</h6>
              {scoreOwners.map((owner) => (
                <p key={owner}>
                  {ownerLabel(s, owner, t)}: <strong>{s.scores[owner] || 0}</strong>
                </p>
              ))}
            </div>

            <p className="escoba-map-line">
              <strong>{t.suitMap}:</strong> {mapLine}
            </p>

            <div className="mus-center-deck" aria-label={`${s.stock.length} ${t.hidden}`}>
              <Card deckId={s.deckId} hidden compact />
              <span>{s.stock.length}</span>
            </div>

            <div className="escoba-table-cards" aria-label={t.table}>
              {s.tableCards.length ? (
                s.tableCards.map((card) => (
                  <Card
                    key={card.id}
                    deckId={s.deckId}
                    card={card}
                    compact
                    led={lastPlayedCardOnTableId === card.id}
                    selected={selectedSet.has(card.id)}
                    onClick={isHumanTurn ? () => toggleTableCard(card.id) : undefined}
                  />
                ))
              ) : (
                <p className="escoba-table-empty">--</p>
              )}
            </div>

            {isHumanTurn ? (
              <div className="escoba-human-actions">
                <p>{t.selectTable}</p>
                <p>
                  {t.selected}: <strong>{s.selectedTableIds.length}</strong>
                </p>
                <button type="button" onClick={clearSelection}>
                  {t.clearSel}
                </button>
              </div>
            ) : null}

          </section>

          <section
            className={[
              "brisca-human-zone",
              "escoba-human-zone",
              isHumanCurrentTurn ? "seat-active seat-active-turn human-active-turn" : "",
              s.captureFx?.actorId === "human" ? "capture-fx-seat" : "",
              humanWonRound ? "human-won-trick" : "",
            ].join(" ")}
          >
            <header>
              <h5>{t.yourHand}</h5>
              <span>
                {t.captures}: {(s.captures.human || []).length} | {t.escobas}: {s.escobas.human || 0}
              </span>
            </header>
            {isHumanCurrentTurn ? (
              <span className="seat-turn-led human-turn-led current-turn-led" aria-label={t.turnLed}>
                {t.turnLed}
              </span>
            ) : null}
            {humanWonRound ? (
              <span className="seat-turn-led human-turn-led" aria-label={t.wonRoundLed}>
                {t.wonRoundLed}
              </span>
            ) : null}
            <div className="brisca-player-hand escoba-player-hand">
              {(s.hands.human || []).map((card, index) => (
                <Card
                  key={card.id}
                  deckId={s.deckId}
                  card={card}
                  onClick={isHumanTurn ? () => playHumanCard(index) : undefined}
                  disabled={!isHumanTurn}
                />
              ))}
            </div>
          </section>

          {s.phase === "hand-over" && s.lastHand ? (
            <div
              className="brisca-match-modal-wrap escoba-hand-modal-wrap"
              role="dialog"
              aria-live="polite"
              aria-label={t.summary}
            >
              <article className="brisca-match-modal escoba-hand-modal">
                <h5>{t.summary}</h5>
                <p>{t.handOver}</p>
                <p>
                  {roundWinnerOwners.length > 1 ? t.roundTie : t.roundWinner}:{" "}
                  <strong>{roundWinnerLabel || t.none}</strong>
                </p>
                <ul className="escoba-score-lines">
                  {handGainRows.map((row) => (
                    <li key={row.owner}>
                      {ownerLabel(s, row.owner, t)}: <strong>+{row.gain}</strong> ({row.score})
                    </li>
                  ))}
                </ul>
                <ul className="escoba-breakdown-lines">
                  {s.lastHand.breakdown.length ? (
                    s.lastHand.breakdown.map((line, idx) => (
                      <li key={`${line.key}-${line.owner}-${idx}`}>
                        {line.label}: {ownerLabel(s, line.owner, t)} +{line.points}
                        {line.detail ? ` (${line.detail})` : ""}
                      </li>
                    ))
                  ) : (
                    <li>{t.none}</li>
                  )}
                </ul>
                <button type="button" onClick={nextHand}>
                  {t.nextHand}
                </button>
              </article>
            </div>
          ) : null}

          {s.phase === "match-over" ? (
            <div className="brisca-match-modal-wrap" role="dialog" aria-live="polite">
              <article className="brisca-match-modal">
                <h5>{t.matchEnd}</h5>
                <p>
                  {t.winner}: <strong>{s.matchWinner ? ownerLabel(s, s.matchWinner, t) : t.none}</strong>
                </p>
                <button type="button" onClick={restart}>
                  {t.newMatch}
                </button>
              </article>
            </div>
          ) : null}
        </div>
      </div>

      <div className="escoba-layout-notes">
        <p className="escoba-mandatory-note">
          {s.mandatoryCapture ? t.mandatoryHintOn : t.mandatoryHintOff}
        </p>
        <p className="brisca-help escoba-help">{t.controls}</p>
      </div>

      <details className="brisca-rules">
        <summary>{t.rulesTitle}</summary>
        <pre>{rulesText}</pre>
      </details>
    </div>
  );
}

export default StrategyEscobaDeckGame;
