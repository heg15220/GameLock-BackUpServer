import React, { useCallback, useEffect, useMemo, useState } from "react";
import useGameRuntimeBridge from "../utils/useGameRuntimeBridge";

const TARGET_STONES = 40;
const HAND_SIZE = 4;
const RESOLVE_MS = 3600;
const DEAL_MS = 280;
const LANCE_AI_MS = 4200;
const BACK_IMAGE = "/assets/cards/spanish/reverso.png";
const PLAYER_OPTIONS = [2, 4, 6];

const VARIANTS = {
  mus_classic: {
    id: "mus_classic",
    deckId: "spanish",
    label: { es: "Mus clasico (espanola)", en: "Classic Mus (Spanish deck)" },
    juegoOrder: [31, 32, 40, 37, 36, 35, 34, 33],
  },
  mus_english: {
    id: "mus_english",
    deckId: "english",
    label: { es: "Mus adaptado (inglesa)", en: "Adapted Mus (English deck)" },
    juegoOrder: [31, 32, 40, 39, 38, 37, 36, 35, 34, 33],
  },
};

const DIFF = {
  easy: {
    id: "easy",
    label: { es: "Facil", en: "Easy" },
    musThreshold: 3.4,
    maxDiscard: 3,
    noise: 0.7,
    betStart: 0.84,
    accept: 0.76,
    raise: 0.92,
    ordago: 0.99,
    ordagoAccept: 0.93,
    stakeFear: 0.85,
    bluff: 0.03,
  },
  medium: {
    id: "medium",
    label: { es: "Media", en: "Medium" },
    musThreshold: 2.8,
    maxDiscard: 2,
    noise: 0.45,
    betStart: 0.74,
    accept: 0.66,
    raise: 0.82,
    ordago: 0.93,
    ordagoAccept: 0.82,
    stakeFear: 0.72,
    bluff: 0.05,
  },
  hard: {
    id: "hard",
    label: { es: "Dificil", en: "Hard" },
    musThreshold: 2.3,
    maxDiscard: 2,
    noise: 0.25,
    betStart: 0.64,
    accept: 0.58,
    raise: 0.73,
    ordago: 0.88,
    ordagoAccept: 0.74,
    stakeFear: 0.6,
    bluff: 0.08,
  },
  expert: {
    id: "expert",
    label: { es: "Experto", en: "Expert" },
    musThreshold: 1.95,
    maxDiscard: 1,
    noise: 0.15,
    betStart: 0.58,
    accept: 0.52,
    raise: 0.68,
    ordago: 0.83,
    ordagoAccept: 0.67,
    stakeFear: 0.5,
    bluff: 0.11,
  },
};

const T = {
  es: {
    title: "Mus IA",
    subtitle: "Nueva modalidad en el juego de baraja. Brisca/Tute siguen disponibles. IA con envites y ordagos.",
    variant: "Version Mus",
    diff: "Dificultad IA",
    players: "Jugadores",
    apply: "Aplicar y reiniciar",
    newMatch: "Nueva partida",
    nextRound: "Siguiente mano",
    askMus: "Elige Mus o No hay Mus.",
    allMus: "Todos dijeron Mus. Selecciona descarte.",
    noMus: "No hay Mus",
    mus: "Mus",
    clear: "Limpiar descarte",
    confirm: "Confirmar descarte",
    controls: "M/A Mus, X/B No Mus, 1-4 o flechas descarte. Lances: P paso, E envido, Q/Enter quiero, X no quiero, R reenvido, O ordago.",
    phase: "Fase",
    dealing: "Repartiendo cartas...",
    pDealing: "Reparto",
    pMus: "Decision Mus",
    pDiscard: "Descarte",
    pResolve: "Resolviendo lances",
    pLance: "Lances",
    pRound: "Mano cerrada",
    pMatch: "Partida terminada",
    deck: "Baraja",
    deckSpanish: "Espanola (40)",
    deckEnglish: "Inglesa adaptada (52)",
    round: "Mano",
    mano: "Mano",
    stones: "Piedras",
    amarrakos: "Amarrakos",
    teamUser: "Tu pareja",
    teamRival: "Rivales",
    human: "Tu",
    partner: "Companero IA",
    ai: "IA",
    hidden: "ocultas",
    winner: "Ganador",
    end: "Partida de Mus terminada",
    votes: "Votos Mus",
    yes: "Mus",
    no: "No Mus",
    selected: "Descartes seleccionados",
    aiDiscarding: "Descarta",
    adaptation: "Nota: la baraja inglesa es una adaptacion no tradicional del Mus.",
    rulesTitle: "Reglamento aplicado",
    rulesClassic:
      "Objetivo: 40 piedras. Lances en orden: Grande, Chica, Pares y Juego/Punto. Equivalencias 3~Rey y 2~As. Empates por cercania a mano. IA aplica paso, envido, quiero/no quiero, reenvido, ordago, dejes y premios de Pares/Juego/Punto.",
    rulesEnglish:
      "Adaptacion sobre baraja inglesa. Se mantienen 40 piedras y lances de Mus, con equivalencias K~3 y A~2. La IA aplica paso, envido, quiero/no quiero, reenvido, ordago, dejes y premios de Pares/Juego/Punto. No es Mus tradicional.",
    pass: "Paso",
    envido: "Envido",
    quiero: "Quiero",
    noQuiero: "No quiero",
    reenvido: "Reenvido",
    ordago: "Ordago",
    deje: "Deje",
    summary: "Resumen lances",
    currentLance: "Lance actual",
    speaking: "Habla",
    stake: "Envite",
    lancePot: "Apuesta",
    openLance: "Abre lance",
    answerBet: "Responde al envite",
    answerOrdago: "Responde al ordago",
    humanLanceHint: "Elige accion para hablar por tu pareja.",
    boardScore: "Marcador acumulado",
    showHandInfo: "Ver mi jugada",
    hideHandInfo: "Ocultar jugada",
    handInfoTitle: "Lectura de tu mano",
    handGrande: "Grande",
    handChica: "Chica",
    handPares: "Pares",
    handJuego: "Juego",
    handPunto: "Punto",
    pairNone: "Sin pares",
    pairPar: "Par",
    pairMedias: "Medias",
    pairDuples: "Duples",
    roundEnd: "Ronda terminada",
    roundWinner: "Ganador de la ronda",
    roundTie: "Ronda empatada",
    roundWhy: "Motivo",
    reasonPass: "al paso",
    reasonDeje: "por deje",
    reasonAccepted: "envite aceptado",
    reasonOrdago: "ordago aceptado",
    reasonSkipped: "no se disputa",
    noPares: "Nadie tiene pares",
    bestBy: "Mejor jugada",
    premium: "premios",
  },
  en: {
    title: "AI Mus",
    subtitle: "New card-table mode. Brisca/Tute modes remain available. AI now plays bets and ordagos.",
    variant: "Mus version",
    diff: "AI difficulty",
    players: "Players",
    apply: "Apply & reset",
    newMatch: "New match",
    nextRound: "Next hand",
    askMus: "Choose Mus or No Mus.",
    allMus: "Everyone called Mus. Select discards.",
    noMus: "No Mus",
    mus: "Mus",
    clear: "Clear discard",
    confirm: "Confirm discard",
    controls: "M/A Mus, X/B No Mus, 1-4 or arrows discard. Lances: P pass, E bet, Q/Enter accept, X decline, R raise, O ordago.",
    phase: "Phase",
    dealing: "Dealing cards...",
    pDealing: "Dealing",
    pMus: "Mus decision",
    pDiscard: "Discard",
    pResolve: "Resolving lances",
    pLance: "Lances",
    pRound: "Hand over",
    pMatch: "Match over",
    deck: "Deck",
    deckSpanish: "Spanish (40)",
    deckEnglish: "English adapted (52)",
    round: "Hand",
    mano: "Mano",
    stones: "Stones",
    amarrakos: "Amarrakos",
    teamUser: "Your pair",
    teamRival: "Opponents",
    human: "You",
    partner: "Partner AI",
    ai: "AI",
    hidden: "hidden",
    winner: "Winner",
    end: "Mus match finished",
    votes: "Mus votes",
    yes: "Mus",
    no: "No Mus",
    selected: "Selected discards",
    aiDiscarding: "Discards",
    adaptation: "Note: English deck mode is a non-traditional Mus adaptation.",
    rulesTitle: "Applied rules",
    rulesClassic:
      "Target: 40 stones. Lances in order: Grande, Chica, Pairs and Juego/Point. Equivalences 3~King and 2~Ace. Ties are settled by closeness to mano. AI applies pass, envido, want/no-want, re-raise, ordago, leaves and Pairs/Juego/Point awards.",
    rulesEnglish:
      "Adapted to English deck. Keeps 40-stone target and Mus lances with K~3 and A~2 equivalences. AI applies pass, envido, want/no-want, re-raise, ordago, leaves and Pairs/Juego/Point awards. Not traditional Mus.",
    pass: "Pass",
    envido: "Bet +2",
    quiero: "Accept",
    noQuiero: "Decline",
    reenvido: "Raise +2",
    ordago: "Ordago",
    deje: "Leave",
    summary: "Lance summary",
    currentLance: "Current lance",
    speaking: "Speaking",
    stake: "Bet",
    lancePot: "Stake",
    openLance: "Open lance",
    answerBet: "Answer bet",
    answerOrdago: "Answer ordago",
    humanLanceHint: "Choose an action for your pair.",
    boardScore: "Accumulated score",
    showHandInfo: "Show my hand read",
    hideHandInfo: "Hide hand read",
    handInfoTitle: "Your hand readout",
    handGrande: "High",
    handChica: "Low",
    handPares: "Pairs",
    handJuego: "Juego",
    handPunto: "Point",
    pairNone: "No pairs",
    pairPar: "Pair",
    pairMedias: "Trips",
    pairDuples: "Two pairs",
    roundEnd: "Hand ended",
    roundWinner: "Hand winner",
    roundTie: "Hand tied",
    roundWhy: "Why",
    reasonPass: "by pass",
    reasonDeje: "by leave",
    reasonAccepted: "accepted bet",
    reasonOrdago: "accepted ordago",
    reasonSkipped: "not played",
    noPares: "No player has pairs",
    bestBy: "Best hand",
    premium: "awards",
  },
};

const SP = {
  id: "spanish",
  suits: [
    { id: "oros", sym: "\u2666", cls: "suit-red" },
    { id: "copas", sym: "\u2665", cls: "suit-red" },
    { id: "espadas", sym: "\u2660", cls: "suit-black" },
    { id: "bastos", sym: "\u2663", cls: "suit-black" },
  ],
  ranks: [1, 2, 3, 4, 5, 6, 7, 10, 11, 12],
  labels: { 1: "A", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 10: "S", 11: "C", 12: "R" },
  high: { 12: 100, 3: 100, 11: 90, 10: 80, 7: 70, 6: 60, 5: 50, 4: 40, 2: 10, 1: 10 },
  low: { 1: 1, 2: 1, 4: 4, 5: 5, 6: 6, 7: 7, 10: 8, 11: 9, 12: 10, 3: 10 },
};

const EN = {
  id: "english",
  suits: [
    { id: "spades", sym: "\u2660", cls: "suit-black" },
    { id: "hearts", sym: "\u2665", cls: "suit-red" },
    { id: "diamonds", sym: "\u2666", cls: "suit-red" },
    { id: "clubs", sym: "\u2663", cls: "suit-black" },
  ],
  ranks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  labels: { 1: "A", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10", 11: "J", 12: "Q", 13: "K" },
  high: { 13: 100, 3: 100, 12: 90, 11: 80, 10: 70, 9: 65, 8: 60, 7: 55, 6: 50, 5: 45, 4: 40, 2: 10, 1: 10 },
  low: { 1: 1, 2: 1, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 12, 13: 13, 3: 13 },
};

const SEAT_LAYOUTS = {
  2: [
    { slot: "bottom", x: 50, y: 86 },
    { slot: "top", x: 50, y: 10 },
  ],
  4: [
    { slot: "bottom", x: 50, y: 86 },
    { slot: "left", x: 10, y: 47 },
    { slot: "top", x: 50, y: 10 },
    { slot: "right", x: 90, y: 47 },
  ],
  6: [
    { slot: "bottom", x: 50, y: 88 },
    { slot: "left", x: 10, y: 66 },
    { slot: "top", x: 24, y: 20 },
    { slot: "top", x: 76, y: 20 },
    { slot: "right", x: 90, y: 66 },
    { slot: "top", x: 50, y: 12 },
  ],
};

const clockwiseSeatAngle = (seat) => {
  const x = (seat?.x ?? 50) - 50;
  const y = (seat?.y ?? 50) - 50;
  return (Math.atan2(x, -y) + Math.PI * 2) % (Math.PI * 2);
};

const clockwiseOrderFromPlayers = (players) =>
  [...players]
    .map((player, index) => ({ player, index, angle: clockwiseSeatAngle(player.seat) }))
    .sort((a, b) => (a.angle - b.angle) || (a.index - b.index))
    .map(({ player }) => player.id);

const isEs = () => typeof navigator !== "undefined" && String(navigator.language || "").toLowerCase().startsWith("es");
const localeOf = () => (isEs() ? "es" : "en");
const normalizeLocale = (locale) => (locale === "es" || locale === "en" ? locale : null);
const tt = (loc) => T[loc] || T.en;
const defaultVariantForLocale = (locale) => (locale === "es" ? "mus_classic" : "mus_english");
const normVar = (id) => (VARIANTS[id] ? id : "mus_classic");
const normDiff = (id) => (DIFF[id] ? id : "medium");
const normPlayers = (n) => {
  const parsed = Number(n);
  return PLAYER_OPTIONS.includes(parsed) ? parsed : 4;
};
const amarrakos = (stones) => Math.floor((stones || 0) / 5);
const shuffle = (arr) => {
  const o = [...arr];
  for (let i = o.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [o[i], o[j]] = [o[j], o[i]];
  }
  return o;
};
const rotateFrom = (order, id) => {
  const i = order.indexOf(id);
  return i < 0 ? [...order] : [...order.slice(i), ...order.slice(0, i)];
};
const nextId = (order, id) => order[(order.indexOf(id) + 1) % order.length];
const teamLabel = (side, t) => (side === "user" ? t.teamUser : side === "rival" ? t.teamRival : "--");
const gameValue = (rank) => (rank === 1 || rank === 2 ? 1 : rank >= 10 || rank === 3 ? 10 : rank);
const pairKey = (deckId, rank) => {
  if (rank === 1 || rank === 2) return "A";
  if ((deckId === "spanish" && (rank === 3 || rank === 12)) || (deckId === "english" && (rank === 3 || rank === 13))) return "K";
  return `R${rank}`;
};
const pairPower = (deckId, rank) => ((rank === 1 || rank === 2) ? 1 : (((deckId === "spanish" && (rank === 3 || rank === 12)) || (deckId === "english" && (rank === 3 || rank === 13))) ? 14 : rank));

const buildDeck = (deckId) => {
  const d = deckId === "spanish" ? SP : EN;
  const cards = [];
  d.suits.forEach((suit) => d.ranks.forEach((rank) => cards.push({
    id: `${d.id}-${suit.id}-${rank}`,
    suitId: suit.id,
    suitSymbol: suit.sym,
    colorClass: suit.cls,
    rank,
    rankLabel: d.labels[rank],
    high: d.high[rank],
    low: d.low[rank],
    gameValue: gameValue(rank),
    pKey: pairKey(d.id, rank),
    pPower: pairPower(d.id, rank),
    imageUrl: d.id === "spanish" ? `/assets/cards/spanish/${String(rank).padStart(2, "0")}-${suit.id}.png` : null,
  })));
  return cards;
};

const pairInfo = (hand) => {
  const m = new Map();
  hand.forEach((c) => m.set(c.pKey, { count: (m.get(c.pKey)?.count || 0) + 1, power: c.pPower }));
  const g = [...m.values()].sort((a, b) => (b.count - a.count) || (b.power - a.power));
  const p = g.filter((x) => x.count >= 2);
  if (!p.length) return { has: false, cat: 0, stones: 0, tie: [] };
  if (p[0].count >= 4) return { has: true, cat: 3, stones: 3, tie: [p[0].power, p[0].power] };
  if (p[0].count === 3) return { has: true, cat: 2, stones: 2, tie: [p[0].power] };
  if (p.length >= 2) return { has: true, cat: 3, stones: 3, tie: p.slice(0, 2).map((x) => x.power).sort((a, b) => b - a) };
  return { has: true, cat: 1, stones: 1, tie: [p[0].power] };
};
const cmpVecDesc = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d) return d;
  }
  return 0;
};
const cmpVecAsc = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const d = (b[i] || 0) - (a[i] || 0);
    if (d) return d;
  }
  return 0;
};
const cmpPairs = (a, b) => (a.cat - b.cat) || cmpVecDesc(a.tie, b.tie);
const pairLabel = (cat, t) => {
  if (cat >= 3) return t.pairDuples;
  if (cat === 2) return t.pairMedias;
  if (cat === 1) return t.pairPar;
  return t.pairNone;
};
const handReadout = (state, t) => {
  const hand = state?.hands?.human || [];
  if (!hand.length) return null;
  const total = hand.reduce((sum, c) => sum + c.gameValue, 0);
  const order = VARIANTS[state.variantId]?.juegoOrder || [];
  const hasJuego = order.includes(total);
  const pairs = pairInfo(hand);
  return {
    grande: [...hand].sort((a, b) => b.high - a.high).map(cardText).join(" "),
    chica: [...hand].sort((a, b) => a.low - b.low).map(cardText).join(" "),
    pares: pairLabel(pairs.cat, t),
    juego: hasJuego ? `${t.handJuego} ${total}` : `${t.handPunto} ${total}`,
  };
};
const buildDealQueue = (order, manoId) => {
  const passOrder = rotateFrom(order, manoId);
  const queue = [];
  for (let i = 0; i < HAND_SIZE; i += 1) {
    passOrder.forEach((id) => queue.push(id));
  }
  return queue;
};

const makePlayers = (t, playerCount) => {
  const count = normPlayers(playerCount);
  const seats = SEAT_LAYOUTS[count] || SEAT_LAYOUTS[4];
  const players = [{ id: "human", name: t.human, human: true, ai: false, side: "user", seat: seats[0] }];
  for (let i = 1; i < count; i += 1) {
    const isUserTeammate = i % 2 === 0;
    players.push({
      id: `ai-${i}`,
      name: isUserTeammate ? `${t.partner} ${Math.floor(i / 2)}` : `${t.ai} ${Math.ceil(i / 2)}`,
      human: false,
      ai: true,
      side: isUserTeammate ? "user" : "rival",
      seat: seats[i] || SEAT_LAYOUTS[4][i % 4],
    });
  }
  return players;
};

const createRound = (loc, variantId, diffId, playerCount, stones, round, manoId) => {
  const t = tt(loc);
  const players = makePlayers(t, playerCount);
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const order = clockwiseOrderFromPlayers(players);
  const deckId = VARIANTS[variantId].deckId;
  const stock = shuffle(buildDeck(deckId));
  const hands = Object.fromEntries(order.map((id) => [id, []]));
  const dealQueue = buildDealQueue(order, manoId);
  return {
    locale: loc,
    variantId,
    difficultyId: diffId,
    playerCount: normPlayers(playerCount),
    players,
    byId,
    order,
    deckId,
    deckName: deckId === "spanish" ? t.deckSpanish : t.deckEnglish,
    round,
    manoId,
    phase: "dealing",
    hands,
    stock,
    dealQueue,
    dealAnim: null,
    discardPile: [],
    selected: [],
    humanVote: null,
    aiVotes: null,
    aiDiscard: {},
    auto: { type: "deal", ms: DEAL_MS },
    stones: { ...stones },
    lastRound: null,
    message: t.dealing,
  };
};

const createMatch = (loc, opts = {}) => {
  const variantId = normVar(opts.variantId || defaultVariantForLocale(loc));
  const diffId = normDiff(opts.difficultyId || "medium");
  const playerCount = normPlayers(opts.playerCount || 4);
  const order = clockwiseOrderFromPlayers(makePlayers(tt(loc), playerCount));
  const manoId = order[Math.floor(Math.random() * order.length)];
  return createRound(loc, variantId, diffId, playerCount, { user: 0, rival: 0 }, 1, manoId);
};

const dealOneCard = (s) => {
  if (s.phase !== "dealing") return s;
  const t = tt(s.locale);
  if (!s.dealQueue?.length) {
    return { ...s, phase: "mus-decision", auto: null, message: t.askMus, dealAnim: null };
  }
  const [targetId, ...rest] = s.dealQueue;
  const stock = [...s.stock];
  const card = stock.pop();
  if (!card) {
    return { ...s, phase: "mus-decision", auto: null, dealQueue: [], dealAnim: null, message: t.askMus };
  }
  const hands = { ...s.hands, [targetId]: [...(s.hands[targetId] || []), card] };
  const seat = s.byId[targetId]?.seat || { x: 50, y: 50 };
  const finished = rest.length === 0;
  return {
    ...s,
    hands,
    stock,
    dealQueue: rest,
    dealAnim: finished ? null : { to: targetId, toX: seat.x, toY: seat.y, key: `${card.id}-${rest.length}` },
    auto: finished ? null : { type: "deal", ms: DEAL_MS },
    phase: finished ? "mus-decision" : "dealing",
    message: finished ? t.askMus : t.dealing,
  };
};

const aiMus = (state, hand) => {
  const d = DIFF[state.difficultyId] || DIFF.medium;
  const p = pairInfo(hand);
  const total = hand.reduce((s, c) => s + c.gameValue, 0);
  const high = [...hand].map((c) => c.high).sort((a, b) => b - a);
  const strength = (p.has ? p.cat * 1.2 : 0) + (total >= 31 ? (total === 31 ? 2.5 : 1.7) : 0) + (high[0] || 0) * 0.012 + (high[1] || 0) * 0.004 + (Math.random() * 2 - 1) * d.noise;
  return strength < d.musThreshold;
};

const aiDiscard = (state, hand) => {
  const d = DIFF[state.difficultyId] || DIFF.medium;
  const p = pairInfo(hand);
  const total = hand.reduce((s, c) => s + c.gameValue, 0);
  if (p.cat >= 3 || total >= 37) return [];
  const freq = new Map();
  hand.forEach((c) => freq.set(c.pKey, (freq.get(c.pKey) || 0) + 1));
  const scored = hand.map((c, i) => ({ i, score: c.high * 0.55 + c.gameValue * 1.4 + ((freq.get(c.pKey) || 1) > 1 ? 70 : 0) })).sort((a, b) => a.score - b.score);
  return scored.slice(0, d.maxDiscard).map((x) => x.i).sort((a, b) => a - b);
};

const oppositeSide = (side) => (side === "user" ? "rival" : "user");
const sideFromGain = (gain, fallback = null) => (gain.user > 0 ? "user" : gain.rival > 0 ? "rival" : fallback);

const sortByLance = (ids, cmp, manoOrder) => [...ids].sort((a, b) => {
  const diff = cmp(a, b);
  if (diff === 0) return manoOrder.indexOf(a) - manoOrder.indexOf(b);
  return diff > 0 ? -1 : 1;
});

const strengthByOrder = (sorted, byId) => {
  const out = { user: 0, rival: 0 };
  const n = sorted.length;
  sorted.forEach((id, idx) => {
    const side = byId[id]?.side || "rival";
    const strength = n <= 1 ? 1 : 1 - idx / (n - 1);
    out[side] = Math.max(out[side], strength);
  });
  return out;
};

const buildLances = (s) => {
  const t = tt(s.locale);
  const manoOrder = rotateFrom(s.order, s.manoId);
  const lances = [];
  const sideOf = (id) => s.byId[id]?.side || "rival";

  const grandeCmp = (a, b) => cmpVecDesc(
    [...s.hands[a]].map((c) => c.high).sort((x, y) => y - x),
    [...s.hands[b]].map((c) => c.high).sort((x, y) => y - x)
  );
  const grandeSorted = sortByLance(s.order, grandeCmp, manoOrder);
  const grandeWinner = grandeSorted[0];
  const grandeSide = sideOf(grandeWinner);
  lances.push({
    key: "grande",
    name: "Grande",
    participants: [...s.order],
    participantSides: { user: true, rival: true },
    winnerId: grandeWinner,
    winnerSide: grandeSide,
    sideStrength: strengthByOrder(grandeSorted, s.byId),
    passAward: { user: grandeSide === "user" ? 1 : 0, rival: grandeSide === "rival" ? 1 : 0 },
    noWantBonus: { user: 0, rival: 0 },
    showdownBonus: { user: 0, rival: 0 },
  });

  const chicaCmp = (a, b) => cmpVecAsc(
    [...s.hands[a]].map((c) => c.low).sort((x, y) => x - y),
    [...s.hands[b]].map((c) => c.low).sort((x, y) => x - y)
  );
  const chicaSorted = sortByLance(s.order, chicaCmp, manoOrder);
  const chicaWinner = chicaSorted[0];
  const chicaSide = sideOf(chicaWinner);
  lances.push({
    key: "chica",
    name: "Chica",
    participants: [...s.order],
    participantSides: { user: true, rival: true },
    winnerId: chicaWinner,
    winnerSide: chicaSide,
    sideStrength: strengthByOrder(chicaSorted, s.byId),
    passAward: { user: chicaSide === "user" ? 1 : 0, rival: chicaSide === "rival" ? 1 : 0 },
    noWantBonus: { user: 0, rival: 0 },
    showdownBonus: { user: 0, rival: 0 },
  });

  const pairBy = Object.fromEntries(s.order.map((id) => [id, pairInfo(s.hands[id])]));
  const pairIds = s.order.filter((id) => pairBy[id].has);
  if (pairIds.length) {
    const pairSorted = sortByLance(pairIds, (a, b) => cmpPairs(pairBy[a], pairBy[b]), manoOrder);
    const pairWinner = pairSorted[0];
    const pairWinnerSide = sideOf(pairWinner);
    const pairValueBySide = {
      user: s.players.filter((p) => p.side === "user").reduce((sum, p) => sum + (pairBy[p.id].stones || 0), 0),
      rival: s.players.filter((p) => p.side === "rival").reduce((sum, p) => sum + (pairBy[p.id].stones || 0), 0),
    };
    lances.push({
      key: "pares",
      name: "Pares",
      participants: pairIds,
      participantSides: {
        user: pairIds.some((id) => sideOf(id) === "user"),
        rival: pairIds.some((id) => sideOf(id) === "rival"),
      },
      winnerId: pairWinner,
      winnerSide: pairWinnerSide,
      sideStrength: strengthByOrder(pairSorted, s.byId),
      passAward: {
        user: pairWinnerSide === "user" ? Math.max(1, pairValueBySide.user) : 0,
        rival: pairWinnerSide === "rival" ? Math.max(1, pairValueBySide.rival) : 0,
      },
      noWantBonus: pairValueBySide,
      showdownBonus: pairValueBySide,
    });
  } else {
    lances.push({
      key: "pares",
      name: "Pares",
      participants: [],
      participantSides: { user: false, rival: false },
      winnerId: null,
      winnerSide: null,
      sideStrength: { user: 0, rival: 0 },
      passAward: { user: 0, rival: 0 },
      noWantBonus: { user: 0, rival: 0 },
      showdownBonus: { user: 0, rival: 0 },
      playable: false,
      skipReason: t.noPares,
    });
  }

  const totals = Object.fromEntries(s.order.map((id) => [id, s.hands[id].reduce((sum, c) => sum + c.gameValue, 0)]));
  const order = VARIANTS[s.variantId].juegoOrder;
  const hasJuego = s.order.some((id) => order.includes(totals[id]));
  if (hasJuego) {
    const juegoIds = s.order.filter((id) => order.includes(totals[id]));
    const rankScore = (id) => {
      const pos = order.indexOf(totals[id]);
      return pos < 0 ? -1 : 100 - pos;
    };
    const juegoSorted = sortByLance(juegoIds, (a, b) => rankScore(a) - rankScore(b), manoOrder);
    const juegoWinner = juegoSorted[0];
    const juegoWinnerSide = sideOf(juegoWinner);
    const juegoValueBySide = { user: 0, rival: 0 };
    juegoIds.forEach((id) => {
      const side = sideOf(id);
      juegoValueBySide[side] += totals[id] === 31 ? 3 : 2;
    });
    lances.push({
      key: "juego",
      name: "Juego",
      participants: juegoIds,
      participantSides: {
        user: juegoIds.some((id) => sideOf(id) === "user"),
        rival: juegoIds.some((id) => sideOf(id) === "rival"),
      },
      winnerId: juegoWinner,
      winnerSide: juegoWinnerSide,
      sideStrength: strengthByOrder(juegoSorted, s.byId),
      passAward: {
        user: juegoWinnerSide === "user" ? Math.max(2, juegoValueBySide.user) : 0,
        rival: juegoWinnerSide === "rival" ? Math.max(2, juegoValueBySide.rival) : 0,
      },
      noWantBonus: juegoValueBySide,
      showdownBonus: juegoValueBySide,
    });
  } else {
    const puntoSorted = sortByLance(s.order, (a, b) => totals[a] - totals[b], manoOrder);
    const puntoWinner = puntoSorted[0];
    const puntoSide = sideOf(puntoWinner);
    lances.push({
      key: "punto",
      name: "Punto",
      participants: [...s.order],
      participantSides: { user: true, rival: true },
      winnerId: puntoWinner,
      winnerSide: puntoSide,
      sideStrength: strengthByOrder(puntoSorted, s.byId),
      passAward: { user: puntoSide === "user" ? 1 : 0, rival: puntoSide === "rival" ? 1 : 0 },
      noWantBonus: { user: 1, rival: 1 },
      showdownBonus: { user: puntoSide === "user" ? 1 : 0, rival: puntoSide === "rival" ? 1 : 0 },
    });
  }

  return lances;
};

const simulateLanceEnvite = (s, lance, t) => {
  const profile = DIFF[s.difficultyId] || DIFF.medium;
  const bothSides = lance.participantSides.user && lance.participantSides.rival;
  const events = [];
  const gain = { user: 0, rival: 0 };
  if (lance.playable === false) {
    return {
      key: lance.key,
      name: lance.name,
      gain,
      winnerId: null,
      winnerSide: null,
      outcome: "skipped",
      stake: 0,
      bonus: { user: 0, rival: 0 },
      events: [lance.skipReason || t.reasonSkipped],
      ordagoAccepted: false,
    };
  }
  if (!bothSides) {
    gain.user += lance.passAward.user || 0;
    gain.rival += lance.passAward.rival || 0;
    return {
      key: lance.key,
      name: lance.name,
      gain,
      winnerId: lance.winnerId,
      winnerSide: sideFromGain(gain, lance.winnerSide),
      outcome: "pass",
      stake: 0,
      bonus: { user: 0, rival: 0 },
      events: [`${t.pass} / ${t.pass}`],
      ordagoAccepted: false,
    };
  }

  const confidence = (side) => lance.sideStrength[side] || 0;
  const pressure = (side) => ((s.stones[oppositeSide(side)] || 0) - (s.stones[side] || 0)) / TARGET_STONES;
  const jitter = () => (Math.random() * 2 - 1) * profile.noise;
  const nearEnd = s.stones.user >= 35 || s.stones.rival >= 35;
  const starterId = rotateFrom(s.order, s.manoId).find((id) => lance.participants.includes(id)) || lance.participants[0];

  const decideOpen = (side) => {
    const conf = confidence(side);
    const ordagoScore = conf + pressure(side) * 0.45 + (nearEnd ? 0.12 : 0) + jitter() * 0.35;
    const canOpenOrdago = nearEnd || pressure(side) > 0.22;
    if (canOpenOrdago && ordagoScore >= profile.ordago) return "ordago";
    const betScore = conf + pressure(side) * 0.24 + jitter();
    if (betScore >= profile.betStart || Math.random() < profile.bluff * Math.max(0.2, 1 - conf)) return "envido";
    return "pass";
  };

  const decideBetResponse = (side, stake) => {
    const conf = confidence(side);
    const risk = Math.min(1, stake / 10);
    const acceptScore = conf + pressure(side) * 0.32 - risk * profile.stakeFear + jitter();
    if (acceptScore < profile.accept) return "no";
    const ordagoScore = conf + pressure(side) * 0.44 + (nearEnd || stake >= 6 ? 0.14 : 0) + jitter() * 0.3;
    const canRaiseToOrdago = nearEnd || stake >= 8 || pressure(side) > 0.28;
    if (canRaiseToOrdago && ordagoScore >= profile.ordago && stake >= 4) return "ordago";
    const raiseScore = conf + pressure(side) * 0.2 - risk * 0.35 + jitter() * 0.6;
    if (raiseScore >= profile.raise && stake < 10) return "raise";
    return "want";
  };

  const decideOrdagoResponse = (side) => {
    const conf = confidence(side);
    const losePressure = (s.stones[oppositeSide(side)] || 0) >= 35 ? 0.2 : 0;
    const acceptScore = conf + pressure(side) * 0.55 + losePressure + jitter();
    return acceptScore >= profile.ordagoAccept ? "want" : "no";
  };

  const settleNoWant = (bettor, stake, wasOrdago) => {
    const deje = wasOrdago ? Math.max(1, stake || 0) : Math.max(1, stake - 2);
    const bonus = lance.noWantBonus?.[bettor] || 0;
    gain[bettor] += deje;
    if (lance.key === "pares" || lance.key === "juego" || lance.key === "punto") {
      gain[bettor] += bonus;
    }
    return {
      key: lance.key,
      name: lance.name,
      gain: { ...gain },
      winnerId: null,
      winnerSide: bettor,
      outcome: "deje",
      stake,
      deje,
      bonus: { user: bettor === "user" ? bonus : 0, rival: bettor === "rival" ? bonus : 0 },
      events: [...events, wasOrdago ? `${t.noQuiero} (${t.ordago})` : t.noQuiero],
      ordagoAccepted: false,
    };
  };

  const settleAccepted = (stake) => {
    const bonus = lance.showdownBonus?.[lance.winnerSide] || 0;
    gain[lance.winnerSide] += stake + bonus;
    return {
      key: lance.key,
      name: lance.name,
      gain: { ...gain },
      winnerId: lance.winnerId,
      winnerSide: lance.winnerSide,
      outcome: "accepted-envite",
      stake,
      bonus: { user: lance.winnerSide === "user" ? bonus : 0, rival: lance.winnerSide === "rival" ? bonus : 0 },
      events: [...events, t.quiero],
      ordagoAccepted: false,
    };
  };

  const settlePass = () => {
    gain.user += lance.passAward.user || 0;
    gain.rival += lance.passAward.rival || 0;
    return {
      key: lance.key,
      name: lance.name,
      gain: { ...gain },
      winnerId: lance.winnerId,
      winnerSide: sideFromGain(gain, lance.winnerSide),
      outcome: "pass",
      stake: 0,
      bonus: { user: 0, rival: 0 },
      events: [...events],
      ordagoAccepted: false,
    };
  };

  let current = s.byId[starterId]?.side || "user";
  let bettor = null;
  let pending = null;
  let stake = 0;
  let passes = 0;

  for (let i = 0; i < 16; i += 1) {
    if (!pending) {
      const action = decideOpen(current);
      if (action === "pass") {
        events.push(`${teamLabel(current, t)}: ${t.pass}`);
        passes += 1;
        if (passes >= 2) return settlePass();
        current = oppositeSide(current);
        continue;
      }
      if (action === "envido") {
        stake += 2;
        bettor = current;
        pending = "bet";
        passes = 0;
        events.push(`${teamLabel(current, t)}: ${t.envido} (+2)`);
        current = oppositeSide(current);
        continue;
      }
      bettor = current;
      pending = "ordago";
      passes = 0;
      events.push(`${teamLabel(current, t)}: ${t.ordago}`);
      current = oppositeSide(current);
      continue;
    }

    if (pending === "bet") {
      const response = decideBetResponse(current, stake);
      if (response === "no") return settleNoWant(bettor, stake, false);
      if (response === "want") return settleAccepted(stake);
      if (response === "raise") {
        stake += 2;
        bettor = current;
        events.push(`${teamLabel(current, t)}: ${t.reenvido} (+2)`);
        current = oppositeSide(current);
        continue;
      }
      pending = "ordago";
      bettor = current;
      events.push(`${teamLabel(current, t)}: ${t.ordago}`);
      current = oppositeSide(current);
      continue;
    }

    const ordagoResponse = decideOrdagoResponse(current);
    if (ordagoResponse === "no") return settleNoWant(bettor, stake, true);
    return {
      key: lance.key,
      name: lance.name,
      gain: { user: 0, rival: 0 },
      winnerId: lance.winnerId,
      winnerSide: lance.winnerSide,
      outcome: "ordago-accepted",
      stake: TARGET_STONES,
      bonus: { user: 0, rival: 0 },
      events: [...events, t.quiero],
      ordagoAccepted: true,
    };
  }

  return settlePass();
};

const resolveLances = (s) => {
  const t = tt(s.locale);
  const lances = buildLances(s);
  const gain = { user: 0, rival: 0 };
  const stones = { ...s.stones };
  const resolved = [];
  let ordagoWinner = null;
  let match = null;
  for (const lance of lances) {
    const res = simulateLanceEnvite(s, lance, t);
    resolved.push(res);
    if (res.ordagoAccepted) {
      ordagoWinner = res.winnerSide;
      stones[ordagoWinner] = TARGET_STONES;
      match = ordagoWinner;
      break;
    }
    const incUser = res.gain.user || 0;
    const incRival = res.gain.rival || 0;
    gain.user += incUser;
    gain.rival += incRival;
    stones.user += incUser;
    stones.rival += incRival;
    if (stones.user >= TARGET_STONES || stones.rival >= TARGET_STONES) {
      match = stones.user >= TARGET_STONES ? "user" : "rival";
      break;
    }
  }

  const roundWinner = gain.user > gain.rival ? "user" : gain.rival > gain.user ? "rival" : null;

  return {
    ...s,
    auto: null,
    phase: match ? "match-over" : "round-over",
    stones,
    lastRound: { gain, lances: resolved, ordagoAccepted: Boolean(ordagoWinner), winnerSide: roundWinner },
    message: match
      ? `${teamLabel(match, t)} ${t.winner.toLowerCase()}${ordagoWinner ? ` (${t.ordago})` : ""} (${stones.user}-${stones.rival})`
      : `${t.pRound}: ${stones.user}-${stones.rival}`,
  };
};

const nextLanceActor = (activePlayers, actorId, byId, requiredSide = null) => {
  if (!activePlayers.length) return null;
  const start = Math.max(0, activePlayers.indexOf(actorId));
  for (let step = 1; step <= activePlayers.length; step += 1) {
    const id = activePlayers[(start + step) % activePlayers.length];
    if (!requiredSide || byId[id]?.side === requiredSide) return id;
  }
  return activePlayers[(start + 1) % activePlayers.length] || null;
};

const lanceActionContext = (s, lance, side) => {
  const profile = DIFF[s.difficultyId] || DIFF.medium;
  const confidence = lance.sideStrength?.[side] || 0;
  const pressure = ((s.stones[oppositeSide(side)] || 0) - (s.stones[side] || 0)) / TARGET_STONES;
  const nearEnd = s.stones.user >= 35 || s.stones.rival >= 35;
  const jitter = () => (Math.random() * 2 - 1) * profile.noise;
  return { profile, confidence, pressure, nearEnd, jitter };
};

const decideLanceAiAction = (s) => {
  const betting = s.betting;
  const lance = s.lances?.[betting?.lanceIndex];
  const actor = s.byId[betting?.actorId];
  if (!betting || !lance || !actor) return "pass";
  const { profile, confidence, pressure, nearEnd, jitter } = lanceActionContext(s, lance, actor.side);
  if (!betting.pending) {
    const ordagoScore = confidence + pressure * 0.45 + (nearEnd ? 0.12 : 0) + jitter() * 0.35;
    const canOpenOrdago = nearEnd || pressure > 0.22;
    if (canOpenOrdago && ordagoScore >= profile.ordago) return "ordago";
    const betScore = confidence + pressure * 0.24 + jitter();
    if (betScore >= profile.betStart || Math.random() < profile.bluff * Math.max(0.2, 1 - confidence)) return "envido";
    return "pass";
  }
  if (betting.pending === "ordago") {
    const losePressure = (s.stones[oppositeSide(actor.side)] || 0) >= 35 ? 0.2 : 0;
    const acceptScore = confidence + pressure * 0.55 + losePressure + jitter();
    return acceptScore >= profile.ordagoAccept ? "quiero" : "no-quiero";
  }
  const stake = betting.stake || 2;
  const risk = Math.min(1, stake / 10);
  const acceptScore = confidence + pressure * 0.32 - risk * profile.stakeFear + jitter();
  if (acceptScore < profile.accept) return "no-quiero";
  const ordagoScore = confidence + pressure * 0.44 + (nearEnd || stake >= 6 ? 0.14 : 0) + jitter() * 0.3;
  const canRaiseToOrdago = nearEnd || stake >= 8 || pressure > 0.28;
  if (canRaiseToOrdago && ordagoScore >= profile.ordago && stake >= 4) return "ordago";
  const raiseScore = confidence + pressure * 0.2 - risk * 0.35 + jitter() * 0.6;
  if (raiseScore >= profile.raise && stake < 10) return "reenvido";
  return "quiero";
};

const settleInteractivePass = (lance, events) => ({
  key: lance.key,
  name: lance.name,
  gain: { user: lance.passAward.user || 0, rival: lance.passAward.rival || 0 },
  winnerId: lance.winnerId,
  winnerSide: sideFromGain(lance.passAward || { user: 0, rival: 0 }, lance.winnerSide),
  outcome: "pass",
  stake: 0,
  bonus: { user: 0, rival: 0 },
  events: [...events],
  ordagoAccepted: false,
});

const settleInteractiveNoWant = (lance, betting, t, wasOrdago) => {
  const bettor = betting.lastAggressorSide || lance.winnerSide || "user";
  const stake = betting.stake || 0;
  const deje = wasOrdago ? Math.max(1, stake || 0) : Math.max(1, stake - 2);
  const bonus = (lance.key === "pares" || lance.key === "juego" || lance.key === "punto")
    ? lance.noWantBonus?.[bettor] || 0
    : 0;
  return {
    key: lance.key,
    name: lance.name,
    gain: { user: bettor === "user" ? deje + bonus : 0, rival: bettor === "rival" ? deje + bonus : 0 },
    winnerId: null,
    winnerSide: bettor,
    outcome: "deje",
    stake,
    deje,
    bonus: { user: bettor === "user" ? bonus : 0, rival: bettor === "rival" ? bonus : 0 },
    events: [...(betting.events || []), wasOrdago ? `${t.noQuiero} (${t.ordago})` : t.noQuiero],
    ordagoAccepted: false,
  };
};

const settleInteractiveAccepted = (lance, betting, t) => {
  const bonus = lance.showdownBonus?.[lance.winnerSide] || 0;
  const stake = betting.stake || 0;
  return {
    key: lance.key,
    name: lance.name,
    gain: {
      user: lance.winnerSide === "user" ? stake + bonus : 0,
      rival: lance.winnerSide === "rival" ? stake + bonus : 0,
    },
    winnerId: lance.winnerId,
    winnerSide: lance.winnerSide,
    outcome: "accepted-envite",
    stake,
    bonus: { user: lance.winnerSide === "user" ? bonus : 0, rival: lance.winnerSide === "rival" ? bonus : 0 },
    events: [...(betting.events || []), t.quiero],
    ordagoAccepted: false,
  };
};

const settleInteractiveOrdago = (lance, betting, t) => ({
  key: lance.key,
  name: lance.name,
  gain: { user: 0, rival: 0 },
  winnerId: lance.winnerId,
  winnerSide: lance.winnerSide,
  outcome: "ordago-accepted",
  stake: TARGET_STONES,
  bonus: { user: 0, rival: 0 },
  events: [...(betting.events || []), t.quiero],
  ordagoAccepted: true,
});

const finishInteractiveRound = (state) => {
  const t = tt(state.locale);
  const gain = state.lanceGain || { user: 0, rival: 0 };
  const roundWinner = gain.user > gain.rival ? "user" : gain.rival > gain.user ? "rival" : null;
  return {
    ...state,
    auto: null,
    betting: null,
    phase: "round-over",
    lastRound: {
      gain,
      lances: state.lanceResults || [],
      ordagoAccepted: false,
      winnerSide: roundWinner,
    },
    message: `${t.pRound}: ${state.stones.user}-${state.stones.rival}`,
  };
};

const applyInteractiveLanceResult = (state, result) => {
  const t = tt(state.locale);
  const gain = {
    user: (state.lanceGain?.user || 0) + (result.gain?.user || 0),
    rival: (state.lanceGain?.rival || 0) + (result.gain?.rival || 0),
  };
  const stones = {
    user: (state.stones.user || 0) + (result.gain?.user || 0),
    rival: (state.stones.rival || 0) + (result.gain?.rival || 0),
  };
  const results = [...(state.lanceResults || []), result];
  if (result.ordagoAccepted) {
    const winner = result.winnerSide || "rival";
    return {
      ...state,
      auto: null,
      betting: null,
      stones: { ...stones, [winner]: TARGET_STONES },
      lanceGain: gain,
      lanceResults: results,
      phase: "match-over",
      lastRound: { gain, lances: results, ordagoAccepted: true, winnerSide: winner },
      message: `${teamLabel(winner, t)} ${t.winner.toLowerCase()} (${t.ordago})`,
    };
  }
  const match = stones.user >= TARGET_STONES ? "user" : stones.rival >= TARGET_STONES ? "rival" : null;
  if (match) {
    return {
      ...state,
      auto: null,
      betting: null,
      stones,
      lanceGain: gain,
      lanceResults: results,
      phase: "match-over",
      lastRound: { gain, lances: results, ordagoAccepted: false, winnerSide: match },
      message: `${teamLabel(match, t)} ${t.winner.toLowerCase()} (${stones.user}-${stones.rival})`,
    };
  }
  return {
    ...state,
    stones,
    lanceGain: gain,
    lanceResults: results,
    betting: null,
    auto: null,
  };
};

const beginLanceAt = (state, index) => {
  if (state.phase === "match-over") return state;
  const t = tt(state.locale);
  let next = { ...state, auto: null, betting: null, lanceIndex: index };
  for (let i = index; i < (next.lances || []).length; i += 1) {
    const lance = next.lances[i];
    if (lance.playable === false) {
      const skipped = {
        key: lance.key,
        name: lance.name,
        gain: { user: 0, rival: 0 },
        winnerId: null,
        winnerSide: null,
        outcome: "skipped",
        stake: 0,
        bonus: { user: 0, rival: 0 },
        events: [lance.skipReason || t.reasonSkipped],
        ordagoAccepted: false,
      };
      next = applyInteractiveLanceResult(next, skipped);
      if (next.phase === "match-over") return next;
      continue;
    }
    const bothSides = lance.participantSides.user && lance.participantSides.rival;
    if (!bothSides) {
      next = applyInteractiveLanceResult(next, settleInteractivePass(lance, [`${t.pass} / ${t.pass}`]));
      if (next.phase === "match-over") return next;
      continue;
    }
    const manoOrder = rotateFrom(next.order, next.manoId);
    const activePlayers = manoOrder.filter((id) => lance.participants.includes(id));
    const actorId = activePlayers[0] || lance.participants[0];
    const betting = {
      lanceIndex: i,
      activePlayers,
      actorId,
      pending: null,
      stake: 0,
      lastAggressorSide: null,
      passes: 0,
      events: [],
    };
    return {
      ...next,
      phase: "lance-action",
      lanceIndex: i,
      betting,
      auto: next.byId[actorId]?.ai ? { type: "lance-ai", ms: LANCE_AI_MS } : null,
      message: `${lance.name}: ${next.byId[actorId]?.name || actorId}`,
    };
  }
  return finishInteractiveRound(next);
};

const beginInteractiveLances = (state) => beginLanceAt({
  ...state,
  phase: "lance-action",
  lances: buildLances(state),
  lanceIndex: 0,
  lanceGain: { user: 0, rival: 0 },
  lanceResults: [],
  betting: null,
  lastRound: null,
  auto: null,
}, 0);

const withLanceAuto = (state) => {
  const actor = state.byId[state.betting?.actorId];
  if (state.phase === "lance-action" && actor?.ai) {
    return { ...state, auto: { type: "lance-ai", ms: LANCE_AI_MS } };
  }
  return { ...state, auto: null };
};

const applyLanceAction = (state, action) => {
  if (state.phase !== "lance-action" || !state.betting) return state;
  const t = tt(state.locale);
  const lance = state.lances?.[state.betting.lanceIndex];
  const actor = state.byId[state.betting.actorId];
  if (!lance || !actor) return state;
  const betting = {
    ...state.betting,
    events: [...(state.betting.events || [])],
  };
  const actorSide = actor.side || "rival";
  const actorLabel = `${actor.name}: `;
  const nextOpponent = () => nextLanceActor(betting.activePlayers, actor.id, state.byId, oppositeSide(actorSide));
  const nextClockwise = () => nextLanceActor(betting.activePlayers, actor.id, state.byId);

  if (!betting.pending) {
    if (action === "pass") {
      betting.events.push(`${actorLabel}${t.pass}`);
      betting.passes += 1;
      if (betting.passes >= betting.activePlayers.length) {
        return beginLanceAt(applyInteractiveLanceResult(state, settleInteractivePass(lance, betting.events)), betting.lanceIndex + 1);
      }
      betting.actorId = nextClockwise();
      return withLanceAuto({ ...state, betting, message: `${lance.name}: ${state.byId[betting.actorId]?.name || betting.actorId}` });
    }
    if (action === "ordago") {
      betting.events.push(`${actorLabel}${t.ordago}`);
      betting.pending = "ordago";
      betting.lastAggressorSide = actorSide;
      betting.passes = 0;
      betting.actorId = nextOpponent();
      return withLanceAuto({ ...state, betting, message: `${lance.name}: ${t.answerOrdago}` });
    }
    betting.events.push(`${actorLabel}${t.envido} (+2)`);
    betting.pending = "bet";
    betting.stake += 2;
    betting.lastAggressorSide = actorSide;
    betting.passes = 0;
    betting.actorId = nextOpponent();
    return withLanceAuto({ ...state, betting, message: `${lance.name}: ${t.answerBet}` });
  }

  if (betting.pending === "ordago") {
    if (action === "quiero") {
      return applyInteractiveLanceResult(state, settleInteractiveOrdago(lance, betting, t));
    }
    return beginLanceAt(applyInteractiveLanceResult(state, settleInteractiveNoWant(lance, betting, t, true)), betting.lanceIndex + 1);
  }

  if (action === "quiero") {
    return beginLanceAt(applyInteractiveLanceResult(state, settleInteractiveAccepted(lance, betting, t)), betting.lanceIndex + 1);
  }
  if (action === "no-quiero") {
    return beginLanceAt(applyInteractiveLanceResult(state, settleInteractiveNoWant(lance, betting, t, false)), betting.lanceIndex + 1);
  }
  if (action === "ordago") {
    betting.events.push(`${actorLabel}${t.ordago}`);
    betting.pending = "ordago";
    betting.lastAggressorSide = actorSide;
    betting.actorId = nextOpponent();
    return withLanceAuto({ ...state, betting, message: `${lance.name}: ${t.answerOrdago}` });
  }
  betting.events.push(`${actorLabel}${t.reenvido} (+2)`);
  betting.stake += 2;
  betting.lastAggressorSide = actorSide;
  betting.actorId = nextOpponent();
  return withLanceAuto({ ...state, betting, message: `${lance.name}: ${t.answerBet}` });
};

const cardText = (c) => (c ? `${c.rankLabel}${c.suitSymbol}` : "--");
function Card({ card, deckId, hidden = false, compact = false, onClick, disabled, selected }) {
  const img = !hidden && card?.imageUrl;
  const back = hidden && deckId === "spanish";
  const cls = ["brisca-card", compact ? "compact" : "", hidden ? "hidden" : "", img || back ? "image-card" : "", card?.colorClass || "", onClick ? "playable" : "", selected ? "selected-for-discard" : ""].filter(Boolean).join(" ");
  if (hidden) return <div className={cls}>{back ? <img src={BACK_IMAGE} alt="hidden" className="back-image" /> : <span className="back-mark">IA</span>}</div>;
  if (!card) return <div className={`${cls} slot`}><span>--</span></div>;
  const face = img ? <img src={card.imageUrl} alt={cardText(card)} className="face-image" /> : <><span className="rank">{card.rankLabel}</span><span className="suit">{card.suitSymbol}</span><span className="points">{card.gameValue}</span></>;
  return onClick ? <button type="button" className={cls} onClick={onClick} disabled={disabled}>{face}</button> : <div className={cls}>{face}</div>;
}

function StrategyMusDeckGame({ locale: localeOverride }) {
  const locale = useMemo(() => normalizeLocale(localeOverride) ?? localeOf(), [localeOverride]);
  const t = useMemo(() => tt(locale), [locale]);
  const [s, setS] = useState(() => createMatch(locale));
  const [pVar, setPVar] = useState(() => defaultVariantForLocale(locale));
  const [pDiff, setPDiff] = useState("medium");
  const [pPlayers, setPPlayers] = useState(4);
  const [showHandInfo, setShowHandInfo] = useState(false);

  useEffect(() => {
    setPVar(s.variantId);
    setPDiff(s.difficultyId);
    setPPlayers(s.playerCount || 4);
  }, [s.variantId, s.difficultyId, s.playerCount]);
  useEffect(() => {
    if (s.phase === "dealing" || s.phase === "round-over" || s.phase === "match-over") {
      setShowHandInfo(false);
    }
  }, [s.phase, s.round]);

  const restart = useCallback(() => setS((prev) => createMatch(locale, {
    variantId: prev.variantId,
    difficultyId: prev.difficultyId,
    playerCount: prev.playerCount,
  })), [locale]);
  const apply = useCallback(() => setS(createMatch(locale, { variantId: pVar, difficultyId: pDiff, playerCount: pPlayers })), [locale, pDiff, pPlayers, pVar]);
  const nextRound = useCallback(() => setS((prev) => (prev.phase === "round-over"
    ? createRound(prev.locale, prev.variantId, prev.difficultyId, prev.playerCount, prev.stones, prev.round + 1, nextId(prev.order, prev.manoId))
    : prev)), []);
  const askMus = useCallback((want) => setS((prev) => {
    if (prev.phase !== "mus-decision") return prev;
    const aiIds = prev.players.filter((p) => p.ai).map((p) => p.id);
    const votes = Object.fromEntries(aiIds.map((id) => [id, aiMus(prev, prev.hands[id])]));
    if (want && aiIds.every((id) => votes[id])) {
      const disc = Object.fromEntries(aiIds.map((id) => [id, aiDiscard(prev, prev.hands[id])]));
      return { ...prev, phase: "discard-select", humanVote: true, aiVotes: votes, aiDiscard: disc, selected: [], message: t.allMus };
    }
    return beginInteractiveLances({ ...prev, humanVote: Boolean(want), aiVotes: votes, message: `${want ? (prev.byId[aiIds.find((id) => !votes[id]) || "human"]?.name || "IA") : t.human} ${t.noMus}` });
  }), [t]);
  const toggle = useCallback((idx) => setS((prev) => prev.phase !== "discard-select" ? prev : { ...prev, selected: prev.selected.includes(idx) ? prev.selected.filter((x) => x !== idx) : [...prev.selected, idx].sort((a, b) => a - b) }), []);
  const clear = useCallback(() => setS((prev) => prev.phase === "discard-select" ? { ...prev, selected: [] } : prev), []);
  const confirm = useCallback(() => setS((prev) => {
    if (prev.phase !== "discard-select") return prev;
    const hands = Object.fromEntries(Object.entries(prev.hands).map(([id, h]) => [id, [...h]]));
    let stock = [...prev.stock];
    let pile = [...prev.discardPile];
    const drawBack = (id, picks) => {
      [...new Set(picks)].sort((a, b) => b - a).forEach((i) => {
        const [c] = hands[id].splice(i, 1);
        if (c) pile.push(c);
      });
      for (let i = 0; i < picks.length; i += 1) {
        if (!stock.length && pile.length) { stock = shuffle(pile); pile = []; }
        const c = stock.pop();
        if (c) hands[id].push(c);
      }
    };
    prev.order.forEach((id) => drawBack(id, id === "human" ? prev.selected : (prev.aiDiscard[id] || [])));
    return {
      ...prev,
      hands,
      stock,
      discardPile: pile,
      selected: [],
      humanVote: null,
      aiVotes: null,
      aiDiscard: {},
      phase: "mus-decision",
      auto: null,
      message: t.askMus,
    };
  }), [t]);
  const lanceAction = useCallback((action) => setS((prev) => applyLanceAction(prev, action)), []);

  useEffect(() => {
    if (!s.auto) return undefined;
    const tm = setTimeout(() => setS((prev) => {
      if (!prev.auto) return prev;
      if (prev.auto.type === "resolve") return resolveLances(prev);
      if (prev.auto.type === "deal") return dealOneCard(prev);
      if (prev.auto.type === "lance-ai") return applyLanceAction(prev, decideLanceAiAction(prev));
      return prev;
    }), s.auto.ms || 0);
    return () => clearTimeout(tm);
  }, [s.auto]);

  useEffect(() => {
    const onKey = (e) => {
      const k = String(e.key || "").toLowerCase();
      if (["input", "textarea", "select"].includes(String(e.target?.tagName || "").toLowerCase())) return;
      if (k === "r" && s.phase !== "lance-action") { e.preventDefault(); restart(); return; }
      if (k === "n") { e.preventDefault(); nextRound(); return; }
      if (s.phase === "mus-decision" && (k === "m" || k === "a" || e.key === "Enter" || e.key === " ")) { e.preventDefault(); askMus(true); return; }
      if (s.phase === "mus-decision" && (k === "x" || k === "b")) { e.preventDefault(); askMus(false); return; }
      if (s.phase === "discard-select" && ["1", "2", "3", "4"].includes(k)) { e.preventDefault(); toggle(Number(k) - 1); return; }
      if (s.phase === "discard-select" && ["arrowleft", "arrowup", "arrowright", "arrowdown"].includes(k)) {
        e.preventDefault();
        const map = { arrowleft: 0, arrowup: 1, arrowright: 2, arrowdown: 3 };
        toggle(map[k]);
        return;
      }
      if (s.phase === "discard-select" && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); confirm(); return; }
      if (s.phase === "lance-action" && s.betting?.actorId === "human") {
        if (k === "p") { e.preventDefault(); lanceAction("pass"); return; }
        if (k === "e") { e.preventDefault(); lanceAction("envido"); return; }
        if (k === "q" || e.key === "Enter") { e.preventDefault(); lanceAction("quiero"); return; }
        if (k === "x") { e.preventDefault(); lanceAction("no-quiero"); return; }
        if (k === "r") { e.preventDefault(); lanceAction("reenvido"); return; }
        if (k === "o") { e.preventDefault(); lanceAction("ordago"); return; }
      }
      if (s.phase === "round-over" && e.key === "Enter") { e.preventDefault(); nextRound(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [askMus, confirm, lanceAction, nextRound, restart, s.betting?.actorId, s.phase, toggle]);

  const bridgePayload = useCallback((snap) => ({
    mode: "strategy-mus-ai",
    variant: snap.variantId,
    deck: snap.deckId,
    difficultyId: snap.difficultyId,
    playerCount: snap.playerCount,
    status: snap.phase,
    phase: snap.phase,
    round: snap.round,
    mano: snap.manoId,
    stones: snap.stones,
    amarrakos: { user: amarrakos(snap.stones.user), rival: amarrakos(snap.stones.rival) },
    players: snap.players.map((p) => ({ id: p.id, side: p.side, isHuman: p.human, handCount: (snap.hands[p.id] || []).length })),
    hands: { human: (snap.hands.human || []).map(cardText), aiVisible: snap.phase === "round-over" || snap.phase === "match-over" },
    votes: snap.aiVotes,
    discardSelected: (snap.selected || []).map((i) => i + 1),
    dealingRemaining: snap.dealQueue?.length || 0,
    currentLance: snap.phase === "lance-action" && snap.betting ? {
      index: snap.betting.lanceIndex,
      key: snap.lances?.[snap.betting.lanceIndex]?.key,
      name: snap.lances?.[snap.betting.lanceIndex]?.name,
      actorId: snap.betting.actorId,
      pending: snap.betting.pending,
      stake: snap.betting.stake,
      events: snap.betting.events,
    } : null,
    lastRound: snap.lastRound ? {
      gain: snap.lastRound.gain,
      ordagoAccepted: Boolean(snap.lastRound.ordagoAccepted),
      winnerSide: snap.lastRound.winnerSide || null,
      lances: (snap.lastRound.lances || []).map((l) => ({
        key: l.key,
        name: l.name,
        outcome: l.outcome,
        winnerSide: l.winnerSide,
        gain: l.gain,
        stake: l.stake,
        events: l.events,
      })),
    } : null,
    actions: {
      canAskMus: snap.phase === "mus-decision",
      canDiscard: snap.phase === "discard-select",
      canLanceAction: snap.phase === "lance-action" && snap.betting?.actorId === "human",
      canNextRound: snap.phase === "round-over",
      canRestart: true,
    },
    message: snap.message,
  }), []);
  const advanceTime = useCallback((ms) => setS((prev) => {
    if (!prev.auto) return prev;
    if ((ms || 0) >= (prev.auto.ms || 0)) {
      if (prev.auto.type === "resolve") return resolveLances(prev);
      if (prev.auto.type === "deal") return dealOneCard(prev);
      if (prev.auto.type === "lance-ai") return applyLanceAction(prev, decideLanceAiAction(prev));
      return prev;
    }
    return { ...prev, auto: { ...prev.auto, ms: (prev.auto.ms || 0) - ms } };
  }), []);
  useGameRuntimeBridge(s, bridgePayload, advanceTime);

  const phaseText = s.phase === "dealing"
    ? t.pDealing
    : s.phase === "mus-decision"
      ? t.pMus
      : s.phase === "discard-select"
        ? t.pDiscard
        : s.phase === "lance-action"
          ? t.pLance
          : s.phase === "lance-resolving"
          ? t.pResolve
          : s.phase === "round-over"
            ? t.pRound
            : t.pMatch;
  const showAI = s.phase === "round-over" || s.phase === "match-over";
  const aiCount = Math.max(1, (s.players?.length || 1) - 1);
  const winnerSide = s.stones.user >= TARGET_STONES ? "user" : s.stones.rival >= TARGET_STONES ? "rival" : null;
  const roundWinner = s.lastRound?.winnerSide || null;
  const readout = handReadout(s, t);
  const activeLance = s.phase === "lance-action" ? s.lances?.[s.betting?.lanceIndex] : null;
  const activeActor = s.phase === "lance-action" ? s.byId[s.betting?.actorId] : null;
  const humanLanceTurn = s.phase === "lance-action" && s.betting?.actorId === "human";
  const lancePrompt = s.betting?.pending === "ordago"
    ? t.answerOrdago
    : s.betting?.pending === "bet"
      ? t.answerBet
      : t.openLance;
  const roundReasonLines = (s.lastRound?.lances || [])
    .map((l) => {
      const side = sideFromGain(l.gain || { user: 0, rival: 0 }, l.winnerSide);
      const stonesWon = l.gain?.[side] || 0;
      if (!stonesWon) return null;
      const reason = l.outcome === "pass"
        ? t.reasonPass
        : l.outcome === "deje"
          ? t.reasonDeje
          : l.outcome === "accepted-envite"
            ? t.reasonAccepted
            : l.outcome === "ordago-accepted"
              ? t.reasonOrdago
              : "";
      return `${l.name}: ${teamLabel(side, t)} +${stonesWon}${reason ? ` (${reason})` : ""}`;
    })
    .filter(Boolean);

  return (
    <div className="mini-game strategy-brisca-game brisca-arena strategy-mus-game">
      <div className="mini-head"><div><h4>{t.title}</h4><p>{t.subtitle}</p></div><div className="brisca-actions-head"><button type="button" onClick={restart}>{t.newMatch}</button>{s.phase === "round-over" ? <button type="button" onClick={nextRound}>{t.nextRound}</button> : null}</div></div>
      <div className="brisca-config mus-config">
        <label htmlFor="mus-variant"><span>{t.variant}</span><select id="mus-variant" value={pVar} onChange={(e) => setPVar(normVar(e.target.value))}>{Object.values(VARIANTS).map((v) => <option key={v.id} value={v.id}>{v.label[locale] || v.label.en}</option>)}</select></label>
        <label htmlFor="mus-diff"><span>{t.diff}</span><select id="mus-diff" value={pDiff} onChange={(e) => setPDiff(normDiff(e.target.value))}>{Object.values(DIFF).map((d) => <option key={d.id} value={d.id}>{d.label[locale] || d.label.en}</option>)}</select></label>
        <label htmlFor="mus-players"><span>{t.players}</span><select id="mus-players" value={pPlayers} onChange={(e) => setPPlayers(normPlayers(e.target.value))}>{PLAYER_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
        <button type="button" className="brisca-apply" onClick={apply}>{t.apply}</button>
      </div>
      <div className="status-row brisca-status-row mus-status-row"><span className={`status-pill ${s.phase === "match-over" ? "finished" : "playing"}`}>{phaseText}</span><span>{t.round}: {s.round}</span><span>{t.deck}: {s.deckName}</span><span>{t.mano}: {s.byId[s.manoId]?.name || s.manoId}</span><span>{t.stones}: {s.stones.user} - {s.stones.rival}</span><span>{t.amarrakos}: {amarrakos(s.stones.user)} - {amarrakos(s.stones.rival)}</span><span>{t.phase}: {phaseText}</span></div>
      <div className="brisca-table-shell"><div className={`brisca-table-felt ai-count-${aiCount} mus-table-felt`}>
        <div className="brisca-seat-ring">
          {s.players.filter((p) => !p.human).map((p) => (
            <article
              key={p.id}
              className={["brisca-seat", "seat-ai", p.side === "user" ? "seat-friendly" : "seat-rival", `seat-slot-${p.seat.slot}`].join(" ")}
              style={{ "--seat-x": `${p.seat.x}%`, "--seat-y": `${p.seat.y}%` }}
            >
              <header>
                <h5>{p.name}</h5>
                <span className="seat-tag">{p.side === "user" ? t.partner : t.ai}</span>
              </header>
              <p className="seat-side">{teamLabel(p.side, t)}</p>
              {showAI ? (
                <div className="seat-hidden-hand seat-open-hand">
                  {(s.hands[p.id] || []).map((c) => <Card key={c.id} card={c} deckId={s.deckId} compact />)}
                </div>
              ) : (
                <div className="seat-hidden-hand" aria-label={`${(s.hands[p.id] || []).length} ${t.hidden}`}>
                  {(s.hands[p.id] || []).map((c) => <Card key={c.id} card={c} deckId={s.deckId} hidden compact />)}
                </div>
              )}
              {s.aiVotes ? <p className="seat-hint-bubble">{t.votes}: <strong>{s.aiVotes[p.id] ? t.yes : t.no}</strong></p> : null}
              {s.phase === "discard-select" && s.aiDiscard[p.id] ? (
                <p className="seat-hint-bubble">{t.aiDiscarding}: <strong>{s.aiDiscard[p.id].length}</strong></p>
              ) : null}
            </article>
          ))}
        </div>
        <section className="brisca-center-zone mus-center-zone">
          <div className="mus-board-score" aria-label={t.boardScore}>
            <h6>{t.boardScore}</h6>
            <p>{teamLabel("user", t)}: <strong>{s.stones.user}</strong> ({amarrakos(s.stones.user)})</p>
            <p>{teamLabel("rival", t)}: <strong>{s.stones.rival}</strong> ({amarrakos(s.stones.rival)})</p>
          </div>
          <div className="mus-center-deck" aria-label={`${s.stock.length} ${t.hidden}`}>
            <Card deckId={s.deckId} hidden compact />
            <span>{s.stock.length}</span>
          </div>
          {s.dealAnim ? (
            <div
              className="mus-deal-fx"
              key={s.dealAnim.key}
              style={{ "--to-x": `${s.dealAnim.toX}%`, "--to-y": `${s.dealAnim.toY}%` }}
            >
              <Card deckId={s.deckId} hidden compact />
            </div>
          ) : null}
          {s.phase === "dealing" ? <p className="mus-dealing-message">{t.dealing}</p> : null}
          {s.phase === "mus-decision" ? <div className="mus-action-group"><button type="button" onClick={() => askMus(true)}>{t.mus}</button><button type="button" onClick={() => askMus(false)}>{t.noMus}</button></div> : null}
          {s.phase === "discard-select" ? <div className="mus-action-group"><button type="button" onClick={confirm}>{t.confirm}</button><button type="button" onClick={clear}>{t.clear}</button></div> : null}
          {s.phase === "discard-select" ? (
            <div className="mus-discard-grid">
              {[0, 1, 2, 3].map((idx) => (
                <button
                  key={`pick-${idx + 1}`}
                  type="button"
                  className={s.selected.includes(idx) ? "active" : ""}
                  onClick={() => toggle(idx)}
                >
                  {idx + 1}
                </button>
              ))}
              <button type="button" className={s.selected.includes(0) ? "active" : ""} onClick={() => toggle(0)}>&larr;</button>
              <button type="button" className={s.selected.includes(1) ? "active" : ""} onClick={() => toggle(1)}>&uarr;</button>
              <button type="button" className={s.selected.includes(2) ? "active" : ""} onClick={() => toggle(2)}>&rarr;</button>
              <button type="button" className={s.selected.includes(3) ? "active" : ""} onClick={() => toggle(3)}>&darr;</button>
            </div>
          ) : null}
          {s.phase === "lance-action" && activeLance && s.betting ? (
            <div className="mus-lance-panel">
              <h6>{t.currentLance}: {activeLance.name}</h6>
              <p>{t.speaking}: <strong>{activeActor?.name || s.betting.actorId}</strong> ({teamLabel(activeActor?.side, t)})</p>
              <p>{lancePrompt} · {t.lancePot}: <strong>{s.betting.stake || 0}</strong></p>
              {s.betting.events?.length ? (
                <ol>
                  {s.betting.events.slice(-4).map((event, idx) => <li key={`${event}-${idx}`}>{event}</li>)}
                </ol>
              ) : null}
              {humanLanceTurn ? (
                <div className="mus-action-group mus-lance-actions">
                  {!s.betting.pending ? <button type="button" onClick={() => lanceAction("pass")}>{t.pass}</button> : null}
                  {!s.betting.pending ? <button type="button" onClick={() => lanceAction("envido")}>{t.envido}</button> : null}
                  {s.betting.pending ? <button type="button" onClick={() => lanceAction("quiero")}>{t.quiero}</button> : null}
                  {s.betting.pending ? <button type="button" onClick={() => lanceAction("no-quiero")}>{t.noQuiero}</button> : null}
                  {s.betting.pending === "bet" ? <button type="button" onClick={() => lanceAction("reenvido")}>{t.reenvido}</button> : null}
                  <button type="button" onClick={() => lanceAction("ordago")}>{t.ordago}</button>
                </div>
              ) : <p className="mus-discard-counter">{activeActor?.ai ? `${activeActor.name}...` : t.humanLanceHint}</p>}
            </div>
          ) : null}
          {s.humanVote != null ? (
            <div className="mus-info-toggle">
              <button type="button" onClick={() => setShowHandInfo((prev) => !prev)}>
                {showHandInfo ? t.hideHandInfo : t.showHandInfo}
              </button>
            </div>
          ) : null}
          {showHandInfo && readout ? (
            <div className="mus-hand-readout">
              <h6>{t.handInfoTitle}</h6>
              <p>{t.handGrande}: {readout.grande}</p>
              <p>{t.handChica}: {readout.chica}</p>
              <p>{t.handPares}: {readout.pares}</p>
              <p>{readout.juego}</p>
            </div>
          ) : null}
          {(s.phase === "round-over" || s.phase === "match-over") && s.lastRound ? (
            <div className="mus-round-summary">
              <h6>{t.summary}: {s.lastRound.gain.user} - {s.lastRound.gain.rival}</h6>
              <ul>
                {s.lastRound.lances.map((l, i) => {
                  if (l.outcome === "skipped") {
                    return <li key={`${l.name}-${i}`}>{l.name}: {(l.events || [t.reasonSkipped])[0]}</li>;
                  }
                  const side = sideFromGain(l.gain || { user: 0, rival: 0 }, l.winnerSide);
                  const stones = (l.gain?.[side] || 0);
                  const detail = (l.events || []).join(" > ");
                  const winnerName = l.winnerId ? (s.byId[l.winnerId]?.name || l.winnerId) : null;
                  const bonus = l.bonus?.[side] || 0;
                  return (
                    <li key={`${l.name}-${i}`}>
                      {l.name}: {teamLabel(side, t)} +{stones}
                      {winnerName ? ` - ${t.bestBy}: ${winnerName}` : ""}
                      {bonus ? ` - ${t.premium} +${bonus}` : ""}
                      {detail ? ` (${detail})` : ""}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          <div className="mus-shortcuts">
            {s.phase === "round-over" ? <button type="button" onClick={nextRound}>{t.nextRound} (N)</button> : null}
            <button type="button" onClick={restart}>{t.newMatch} (R)</button>
          </div>
          <p className="brisca-message">{s.message}</p><p className="brisca-help">{t.controls}</p>{s.variantId === "mus_english" ? <p className="mus-adaptation-note">{t.adaptation}</p> : null}
        </section>
        <section className="brisca-human-zone mus-human-zone"><header><h5>{t.human}</h5><span>{teamLabel("user", t)}</span></header>{s.humanVote != null ? <p className="seat-hint-bubble">{t.votes}: <strong>{s.humanVote ? t.yes : t.no}</strong></p> : null}<div className="brisca-player-hand mus-player-hand">{(s.hands.human || []).map((c, i) => <Card key={c.id} card={c} deckId={s.deckId} onClick={s.phase === "discard-select" ? () => toggle(i) : undefined} selected={s.selected.includes(i)} disabled={s.phase !== "discard-select"} />)}</div>{s.phase === "discard-select" ? <p className="mus-discard-counter">{t.selected}: {s.selected.length}</p> : null}</section>
        {s.phase === "round-over" ? (
          <div className="brisca-match-modal-wrap mus-round-modal-wrap" role="dialog" aria-live="polite" aria-label={t.roundEnd}>
            <article className="brisca-match-modal mus-round-modal">
              <h5>{t.roundEnd}</h5>
              <p>
                {t.roundWinner}:{" "}
                <strong>{roundWinner ? teamLabel(roundWinner, t) : t.roundTie}</strong>
              </p>
              <p>{t.roundWhy}:</p>
              <ul>
                {roundReasonLines.map((line, idx) => <li key={`${line}-${idx}`}>{line}</li>)}
              </ul>
              <button type="button" onClick={nextRound}>{t.nextRound}</button>
            </article>
          </div>
        ) : null}
        {s.phase === "match-over" ? <div className="brisca-match-modal-wrap" role="dialog" aria-live="polite" aria-label={t.pMatch}><article className="brisca-match-modal"><h5>{t.end}</h5><p>{t.winner}: <strong>{winnerSide ? teamLabel(winnerSide, t) : "--"}</strong></p><button type="button" onClick={restart}>{t.newMatch}</button></article></div> : null}
      </div></div>
      <details className="brisca-rules"><summary>{t.rulesTitle}</summary><pre>{s.variantId === "mus_english" ? t.rulesEnglish : t.rulesClassic}</pre></details>
    </div>
  );
}

export default StrategyMusDeckGame;
