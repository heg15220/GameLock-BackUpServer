import React, { useCallback, useEffect, useMemo, useState } from "react";
import useGameRuntimeBridge from "../utils/useGameRuntimeBridge";

const HAND_SIZE = 3;
const MATCH_TARGET_ROUNDS = 3;
const RESOLVE_DELAY_MS = 1800;
const NEXT_TURN_DELAY_MS = 1100;
const DRAW_FX_MS = 900;
const AI_THINK_EXTRA_MS = 450;

const SPANISH_CARD_SOURCE = "https://github.com/mcmd/playingcards.io-spanish.playing.cards";
const BACK_IMAGE = "/assets/cards/spanish/reverso.png";

const VARIANTS = {
  brisca_duel: { id: "brisca_duel", team: false, tute: false, aiOptions: [1, 2, 3, 4, 5], label: { es: "Brisca Duelo", en: "Brisca Duel" } },
  brisca_teams: { id: "brisca_teams", team: true, tute: false, aiOptions: [3, 5], label: { es: "Brisca Equipos", en: "Brisca Teams" } },
  tute_teams: { id: "tute_teams", team: true, tute: true, aiOptions: [3, 5], label: { es: "Tute Equipos", en: "Tute Teams" } },
};

const DIFF = {
  easy: { id: "easy", label: { es: "Facil", en: "Easy" }, think: 1700, noise: 6, win: 1, save: 1.2, trump: 1.2, aggr: 0.2, team: 0.4, randomTop: 3 },
  medium: { id: "medium", label: { es: "Media", en: "Medium" }, think: 2100, noise: 3, win: 1.2, save: 1, trump: 1, aggr: 0.5, team: 0.8, randomTop: 2 },
  hard: { id: "hard", label: { es: "Dificil", en: "Hard" }, think: 2500, noise: 1.5, win: 1.5, save: 0.8, trump: 0.8, aggr: 0.8, team: 1.1, randomTop: 1 },
  expert: { id: "expert", label: { es: "Experto", en: "Expert" }, think: 2900, noise: 0.8, win: 1.7, save: 0.7, trump: 0.6, aggr: 1, team: 1.3, randomTop: 1 },
};

const TEXT = {
  es: {
    title: "Mesa IA Brisca/Tute",
    subtitle: "Tapete tactico con IAs configurables, ritmo pausado y lectura de companero.",
    gameType: "Tipo de juego",
    aiCount: "Numero de IAs",
    aiDifficulty: "Dificultad IA",
    apply: "Aplicar y reiniciar",
    newMatch: "Nueva partida",
    nextRound: "Siguiente ronda",
    yourTurn: "Tu turno: juega carta.",
    resolving: "Resolviendo baza...",
    nextTurn: "Iniciando siguiente turno...",
    controls: "1-3 o Q/W/E juegan carta. Enter juega primera legal. R reinicia. N siguiente ronda.",
    statusPlaying: "En juego",
    statusRound: "Ronda cerrada",
    statusMatch: "Partida cerrada",
    matchEndTitle: "Partida terminada",
    winnerIs: "Ganador",
    round: "Ronda",
    trick: "Baza",
    stock: "Mazo",
    trump: "Triunfo",
    deck: "Baraja",
    points: "Puntos",
    lastTrick: "Ultima baza",
    rounds: "Rondas",
    userSide: "Tu equipo",
    rivalSide: "Rivales",
    hintLabel: "Clave companero",
    hintWords: { points: "PUNTOS", cut: "CORTA", risk: "RIESGO", save: "GUARDA", drag: "ARRASTRA" },
    wonTrick: "Se lleva la baza",
    human: "Tu",
    partner: "Companero IA",
    ai: "IA",
    hidden: "ocultas",
    seatHuman: "Humano",
    seatMate: "Companero",
    seatRival: "Rival",
    promptTitle: "Prompt estrategico Brisca/Tute",
    assets: "Assets baraja espanola",
    assetsLink: "Repositorio",
  },
  en: {
    title: "Brisca/Tute AI Table",
    subtitle: "Tactical felt table with configurable AI, slower pacing, and teammate cues.",
    gameType: "Game type",
    aiCount: "AI players",
    aiDifficulty: "AI difficulty",
    apply: "Apply & reset",
    newMatch: "New match",
    nextRound: "Next round",
    yourTurn: "Your turn: play a card.",
    resolving: "Resolving trick...",
    nextTurn: "Starting next turn...",
    controls: "1-3 or Q/W/E play card. Enter plays first legal card. R restarts. N next round.",
    statusPlaying: "Playing",
    statusRound: "Round over",
    statusMatch: "Match over",
    matchEndTitle: "Match finished",
    winnerIs: "Winner",
    round: "Round",
    trick: "Trick",
    stock: "Stock",
    trump: "Triumph",
    deck: "Deck",
    points: "Points",
    lastTrick: "Last trick",
    rounds: "Rounds",
    userSide: "Your team",
    rivalSide: "Opponents",
    hintLabel: "Teammate cue",
    hintWords: { points: "POINTS", cut: "CUT", risk: "RISK", save: "SAVE", drag: "DRAG" },
    wonTrick: "Took the trick",
    human: "You",
    partner: "Partner AI",
    ai: "AI",
    hidden: "hidden",
    seatHuman: "Human",
    seatMate: "Teammate",
    seatRival: "Opponent",
    promptTitle: "Brisca/Tute strategy prompt",
    assets: "Spanish deck assets",
    assetsLink: "Repository",
  },
};

const RULES = {
  es: `Modos: Brisca Duelo, Brisca Equipos, Tute Equipos (asistir/montar/fallar simplificado).
IA: ajusta riesgo por marcador, puntos en mesa, triunfo y fase final.
Equipo: evita romper baza ganadora del companero y usa clave corta (PUNTOS/CORTA/RIESGO/GUARDA/ARRASTRA).`,
  en: `Modes: Brisca Duel, Brisca Teams, Team Tute (simplified forced follow/overtake/triumph).
AI: adapts risk with score pressure, trick value, triumph control, and endgame phase.
Team: avoids breaking teammate-winning tricks and emits short cue words.`,
};

const SPANISH_DECK = {
  id: "spanish",
  suits: [
    { id: "oros", symbol: "\u2666", colorClass: "suit-red" },
    { id: "copas", symbol: "\u2665", colorClass: "suit-red" },
    { id: "espadas", symbol: "\u2660", colorClass: "suit-black" },
    { id: "bastos", symbol: "\u2663", colorClass: "suit-black" },
  ],
  ranks: [1, 2, 3, 4, 5, 6, 7, 10, 11, 12],
  rankLabel: { 1: "A", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 10: "S", 11: "C", 12: "R" },
  points: { 1: 11, 3: 10, 12: 4, 11: 3, 10: 2 },
  power: { 1: 100, 3: 90, 12: 80, 11: 70, 10: 60, 7: 50, 6: 40, 5: 30, 4: 20, 2: 10 },
};

const EN_DECK = {
  id: "english",
  suits: [
    { id: "spades", symbol: "\u2660", colorClass: "suit-black" },
    { id: "hearts", symbol: "\u2665", colorClass: "suit-red" },
    { id: "diamonds", symbol: "\u2666", colorClass: "suit-red" },
    { id: "clubs", symbol: "\u2663", colorClass: "suit-black" },
  ],
  ranks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  rankLabel: { 1: "A", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10", 11: "J", 12: "Q", 13: "K" },
  points: { 1: 11, 3: 10, 13: 4, 12: 3, 11: 2 },
  power: { 1: 100, 3: 90, 13: 80, 12: 70, 11: 60, 10: 50, 9: 45, 8: 40, 7: 35, 6: 30, 5: 25, 4: 20, 2: 10 },
};

const isEs = () => (typeof navigator !== "undefined" && String(navigator.language || "").toLowerCase().startsWith("es"));
const localeOf = () => (isEs() ? "es" : "en");
const deckFor = (locale) => (locale === "es" ? SPANISH_DECK : EN_DECK);
const textOf = (locale) => TEXT[locale] || TEXT.en;
const normVariant = (id) => (VARIANTS[id] ? id : "brisca_duel");
const normDiff = (id) => (DIFF[id] ? id : "medium");
const rank2 = (n) => String(n).padStart(2, "0");
const cardText = (card) => (card ? `${card.rankLabel}${card.suitSymbol}` : "--");
const points = (cards) => cards.reduce((sum, c) => sum + (c?.points || 0), 0);
const clamp01 = (value) => Math.max(0, Math.min(1, value));

const clampAi = (variantId, value) => {
  const options = VARIANTS[normVariant(variantId)].aiOptions;
  const n = Number(value);
  if (options.includes(n)) return n;
  return options[0];
};

const shuffle = (items) => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const buildDeck = (deck) => {
  const cards = [];
  deck.suits.forEach((suit) => {
    deck.ranks.forEach((rank) => {
      cards.push({
        id: `${deck.id}-${suit.id}-${rank}`,
        rank,
        rankLabel: deck.rankLabel[rank] || String(rank),
        suitId: suit.id,
        suitSymbol: suit.symbol,
        colorClass: suit.colorClass,
        points: deck.points[rank] || 0,
        power: deck.power[rank] || rank,
        imageUrl: deck.id === "spanish" ? `/assets/cards/spanish/${rank2(rank)}-${suit.id}.png` : null,
      });
    });
  });
  return cards;
};

const withSeatVector = (slot, x, y) => ({ slot, x, y, fx: (x - 50) * 0.95, fy: (y - 52) * 0.95 });
const HUMAN_SEAT = withSeatVector("bottom", 50, 86);

const aiSeatPattern = (aiCount) => {
  const top = withSeatVector("top", 50, 10);
  const left = withSeatVector("left", 10, 47);
  const right = withSeatVector("right", 90, 47);
  const upperLeft = withSeatVector("upper-left", 24, 18);
  const upperRight = withSeatVector("upper-right", 76, 18);
  if (aiCount <= 1) return [top];
  if (aiCount === 2) return [left, right];
  if (aiCount === 3) return [top, left, right];
  if (aiCount === 4) return [upperLeft, upperRight, left, right];
  return [top, upperLeft, upperRight, left, right];
};

const makePlayers = (variantId, aiOpponents, t) => {
  const v = VARIANTS[variantId];
  const total = Math.min(6, Math.max(2, aiOpponents + 1));
  const aiSeats = aiSeatPattern(total - 1);
  const players = [{ id: "human", name: t.human, human: true, ai: false, side: "user", seat: HUMAN_SEAT }];
  let mateId = null;
  for (let i = 1; i < total; i += 1) {
    const id = `ai-${i}`;
    const side = v.team ? (i % 2 === 0 ? "user" : "rival") : "rival";
    const mate = v.team && side === "user" && !mateId;
    if (mate) mateId = id;
    players.push({ id, name: mate ? t.partner : `${t.ai} ${i}`, human: false, ai: true, side, seat: aiSeats[i - 1] || aiSeats[0] || withSeatVector("top", 50, 14) });
  }
  return { players, mateId };
};

const beats = (cand, cur, leadSuit, trumpSuit) => {
  if (cand.suitId === cur.suitId) return cand.power > cur.power;
  if (cand.suitId === trumpSuit && cur.suitId !== trumpSuit) return true;
  if (cur.suitId === trumpSuit && cand.suitId !== trumpSuit) return false;
  if (cand.suitId === leadSuit && cur.suitId !== leadSuit) return true;
  return false;
};

const winnerEntry = (table, trumpSuit) => {
  if (!table.length) return null;
  const leadSuit = table[0].card.suitId;
  let win = table[0];
  for (const e of table.slice(1)) if (beats(e.card, win.card, leadSuit, trumpSuit)) win = e;
  return win;
};

const legalIdx = (hand, table, trumpSuit, variant) => {
  const all = hand.map((_, i) => i);
  if (!table.length || !variant.tute) return all;
  const leadSuit = table[0].card.suitId;
  const same = all.filter((i) => hand[i].suitId === leadSuit);
  const win = winnerEntry(table, trumpSuit);
  if (same.length) {
    const target = win?.card?.suitId === leadSuit ? win.card.power : table[0].card.power;
    const over = same.filter((i) => hand[i].power > target);
    return over.length ? over : same;
  }
  const trumps = all.filter((i) => hand[i].suitId === trumpSuit);
  if (trumps.length) {
    if (win?.card?.suitId === trumpSuit) {
      const over = trumps.filter((i) => hand[i].power > win.card.power);
      return over.length ? over : trumps;
    }
    return trumps;
  }
  return all;
};

const pByPlayer = (won, players) => Object.fromEntries(players.map((p) => [p.id, points(won[p.id] || [])]));
const pBySide = (pp, players) => players.reduce((acc, p) => {
  acc[p.side] = (acc[p.side] || 0) + (pp[p.id] || 0);
  return acc;
}, { user: 0, rival: 0 });

const nextId = (order, id) => order[(order.indexOf(id) + 1) % order.length];
const rotateFrom = (order, id) => {
  const i = order.indexOf(id);
  return [...order.slice(i), ...order.slice(0, i)];
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

const buildBriscaUnknownCards = (state, playerId) => {
  const deckCards = buildDeck(deckFor(state.locale));
  const knownIds = new Set();
  (state.hands[playerId] || []).forEach((card) => knownIds.add(card.id));
  (state.table || []).forEach((entry) => {
    if (entry?.card?.id) knownIds.add(entry.card.id);
  });
  Object.values(state.won || {}).forEach((cards) => {
    (cards || []).forEach((card) => {
      if (card?.id) knownIds.add(card.id);
    });
  });
  if (state.trumpCard?.id) knownIds.add(state.trumpCard.id);
  return deckCards.filter((card) => !knownIds.has(card.id));
};

const buildBriscaOutsProfile = (state, card, candidateTable, unknownCards, drawsAhead, pendingPoints) => {
  const outsAgainst = unknownCards.reduce((count, maybeOut) => {
    const trial = winnerEntry(
      [...candidateTable, { playerId: "__outs__", card: maybeOut }],
      state.trumpSuit
    );
    return trial?.playerId === "__outs__" ? count + 1 : count;
  }, 0);
  const unseen = unknownCards.length;
  const beatenRateExact = unseen > 0
    ? 1 - estimateNoOutDrawRate(unseen, outsAgainst, drawsAhead)
    : 0;
  const holdRateExact = 1 - beatenRateExact;
  const beatenRateRule2 = clamp01((outsAgainst * 2 * Math.max(1, drawsAhead)) / 100);
  const beatenRateRule4 = clamp01((outsAgainst * (drawsAhead >= 2 ? 4 : 2)) / 100);
  const holdRateRule2 = 1 - beatenRateRule2;
  const holdRateRule4 = 1 - beatenRateRule4;
  const holdOddsRatio = holdRateExact > 0 ? beatenRateExact / holdRateExact : Infinity;
  const reward = Math.max(
    1,
    pendingPoints +
      (card?.points || 0) +
      (card?.suitId === state.trumpSuit ? 2 : 1)
  );
  const risk = Math.max(
    1,
    (card?.points || 0) * 1.4 +
      (card?.power || 0) * 0.08 +
      (card?.suitId === state.trumpSuit ? 3.5 : 1.5)
  );
  const requiredHoldRate = risk / (reward + risk);
  const priceRatio = reward / risk;
  return {
    unseen,
    outsAgainst,
    holdRateExact,
    holdRateRule2,
    holdRateRule4,
    holdOddsRatio,
    requiredHoldRate,
    priceRatio,
  };
};

const teammateHint = (s, t) => {
  if (!s.variant.team || !s.mateId) return null;
  const hand = s.hands[s.mateId] || [];
  if (!hand.length || s.status !== "playing") return null;
  const pending = s.table.reduce((sum, e) => sum + (e.card?.points || 0), 0);
  const hasHighTrump = hand.some((c) => c.suitId === s.trumpSuit && c.power >= 90);
  const pp = pByPlayer(s.won, s.players);
  const ps = pBySide(pp, s.players);
  let word = t.hintWords.save;
  if (pending >= 16) word = t.hintWords.points;
  else if (hasHighTrump && pending >= 8) word = t.hintWords.cut;
  else if (ps.user < ps.rival) word = t.hintWords.risk;
  else if (hand.every((c) => (c.points || 0) === 0)) word = t.hintWords.drag;
  return { playerId: s.mateId, text: word };
};

const withDerived = (s, t, msg = null) => {
  let message = msg;
  if (message == null) {
    if (s.status === "playing") {
      if (s.resolving) message = t.resolving;
      else if (s.turnTransitioning) message = t.nextTurn;
      else message = s.current === "human" ? t.yourTurn : `${s.byId[s.current]?.name || t.ai}...`;
    } else if (s.status === "round-over") message = t.nextRound;
    else message = "";
  }
  return { ...s, message, hint: teammateHint(s, t) };
};

const createConfig = (locale, variantId, aiOpponents, difficultyId) => {
  const t = textOf(locale);
  const vId = normVariant(variantId);
  const dId = normDiff(difficultyId);
  const ai = clampAi(vId, aiOpponents);
  const { players, mateId } = makePlayers(vId, ai, t);
  return {
    locale,
    variantId: vId,
    variant: VARIANTS[vId],
    difficultyId: dId,
    aiOpponents: ai,
    players,
    mateId,
    order: players.map((p) => p.id),
    byId: Object.fromEntries(players.map((p) => [p.id, p])),
  };
};

const createRound = (cfg, round, roundWins, leadId) => {
  const t = textOf(cfg.locale);
  const deck = deckFor(cfg.locale);
  const stock = shuffle(buildDeck(deck));
  const hands = Object.fromEntries(cfg.order.map((id) => [id, []]));
  for (let i = 0; i < HAND_SIZE; i += 1) cfg.order.forEach((id) => {
    const card = stock.pop();
    if (card) hands[id].push(card);
  });
  const trumpCard = stock.pop() || null;
  const s = {
    ...cfg,
    deckId: deck.id,
    deckName: deck.id === "spanish" ? "Espanola (40)" : "English (52)",
    deckCount: deck.ranks.length * deck.suits.length,
    status: "playing",
    round,
    trick: 1,
    roundWins: { ...roundWins },
    matchWinner: null,
    roundResult: null,
    lead: leadId,
    current: leadId,
    resolving: false,
    turnTransitioning: false,
    table: [],
    playSeq: 0,
    trumpCard,
    trumpSuit: trumpCard?.suitId || null,
    stock,
    hands,
    won: Object.fromEntries(cfg.order.map((id) => [id, []])),
    lastTrick: null,
    drawAnim: null,
    hint: null,
    message: "",
  };
  return withDerived(s, t);
};

const createMatch = (locale, opts = {}) => {
  const cfg = createConfig(locale, opts.variantId || "brisca_duel", opts.aiOpponents ?? 1, opts.difficultyId || "medium");
  const lead = cfg.order[Math.floor(Math.random() * cfg.order.length)] || "human";
  return createRound(cfg, 1, { user: 0, rival: 0 }, lead);
};

const aiPick = (s, player) => {
  const profile = DIFF[s.difficultyId] || DIFF.medium;
  const hand = s.hands[player.id] || [];
  const legal = legalIdx(hand, s.table, s.trumpSuit, s.variant);
  if (!legal.length) return -1;
  const pp = pByPlayer(s.won, s.players);
  const ps = pBySide(pp, s.players);
  const deficit = (ps.rival || 0) - (ps.user || 0);
  const aggr = profile.aggr + Math.max(-2, Math.min(2, deficit / 18)) * 0.2;
  const currentWin = winnerEntry(s.table, s.trumpSuit);
  const mateWinning = s.variant.team && currentWin && s.byId[currentWin.playerId]?.side === player.side;
  const pending = s.table.reduce((sum, e) => sum + (e.card?.points || 0), 0);
  const remaining = s.stock.length + (s.trumpCard ? 1 : 0);
  const expertMode = profile.id === "expert";
  const unknownCards = expertMode ? buildBriscaUnknownCards(s, player.id) : [];
  const drawsAhead = Math.max(0, s.players.length - (s.table.length + 1));
  const scored = legal.map((idx) => {
    const c = hand[idx];
    const candidateTable = [...s.table, { playerId: player.id, card: c }];
    const winNow = winnerEntry(candidateTable, s.trumpSuit)?.playerId === player.id;
    const isTrump = c.suitId === s.trumpSuit;
    let score = 0;
    score += winNow ? profile.win * (pending + c.points + c.power * 0.06) : -pending * 0.35;
    score -= profile.save * (c.power * 0.09 + c.points * 1.1);
    if (isTrump) score -= profile.trump * (c.power * 0.08);
    if (aggr > 0) score += aggr * (pending + c.points) * 0.55;
    if (mateWinning) {
      if (winNow && s.table.length === s.players.length - 1) score -= profile.team * 8;
      if (!winNow) score += profile.team * c.points * 1.6;
    }
    if (remaining < s.players.length) score += winNow ? c.power * 0.06 : -c.power * 0.03;
    if (expertMode && winNow) {
      const oddsOuts = buildBriscaOutsProfile(
        s,
        c,
        candidateTable,
        unknownCards,
        drawsAhead,
        pending
      );
      const holdComposite = Math.max(
        oddsOuts.holdRateExact,
        oddsOuts.holdRateRule2,
        oddsOuts.holdRateRule4 * 0.65
      );
      const edge = holdComposite - oddsOuts.requiredHoldRate;
      const oddsBeatPrice =
        holdComposite >= oddsOuts.requiredHoldRate - 0.015 ||
        (Number.isFinite(oddsOuts.holdOddsRatio) &&
          oddsOuts.holdOddsRatio <= oddsOuts.priceRatio * 1.03);
      score += edge * 28;
      score += oddsBeatPrice ? 4.2 : -6.4;
      score -= oddsOuts.outsAgainst * 0.08;
    }
    score += (Math.random() * 2 - 1) * profile.noise;
    return { idx, score };
  }).sort((a, b) => b.score - a.score);
  const top = Math.min(profile.randomTop || 1, scored.length);
  return (scored[Math.floor(Math.random() * top)] || scored[0]).idx;
};

const play = (s, playerId, reqIdx, t) => {
  if (s.status !== "playing" || s.resolving || s.turnTransitioning || s.current !== playerId) return s;
  const hand = [...(s.hands[playerId] || [])];
  if (!hand.length) return s;
  const legal = legalIdx(hand, s.table, s.trumpSuit, s.variant);
  let idx = reqIdx;
  if (!legal.includes(idx)) {
    if (playerId === "human") return withDerived({ ...s }, t, t.yourTurn);
    idx = legal[0] ?? 0;
  }
  const [card] = hand.splice(idx, 1);
  const p = s.byId[playerId];
  const table = [...s.table, { playerId, card, playId: s.playSeq + 1, from: { x: p.seat.fx, y: p.seat.fy } }];
  const hands = { ...s.hands, [playerId]: hand };
  if (table.length === s.players.length) return withDerived({ ...s, hands, table, playSeq: s.playSeq + 1, current: null, resolving: true, turnTransitioning: false }, t, t.resolving);
  const nx = nextId(s.order, playerId);
  return withDerived({ ...s, hands, table, playSeq: s.playSeq + 1, current: nx, resolving: false, turnTransitioning: false }, t, nx === "human" ? t.yourTurn : `${s.byId[nx]?.name || t.ai}...`);
};

const resolveTrick = (s, t) => {
  if (s.status !== "playing" || !s.resolving || s.table.length < s.players.length) return s;
  const win = winnerEntry(s.table, s.trumpSuit);
  if (!win) return withDerived({ ...s, resolving: false }, t);
  const winId = win.playerId;
  const won = Object.fromEntries(Object.entries(s.won).map(([id, cards]) => [id, [...cards]]));
  won[winId].push(...s.table.map((e) => e.card));
  const hands = Object.fromEntries(Object.entries(s.hands).map(([id, cards]) => [id, [...cards]]));
  let stock = [...s.stock];
  let trumpCard = s.trumpCard;
  let drewHuman = false;
  rotateFrom(s.order, winId).forEach((id) => {
    if (stock.length) {
      hands[id].push(stock.pop());
      if (id === "human") drewHuman = true;
    }
    else if (trumpCard) {
      hands[id].push(trumpCard);
      if (id === "human") drewHuman = true;
      trumpCard = null;
    }
  });
  const endRound = s.order.every((id) => (hands[id] || []).length === 0) && stock.length === 0 && !trumpCard;
  const base = {
    ...s,
    lead: winId,
    current: winId,
    resolving: false,
    turnTransitioning: !endRound,
    table: [],
    trick: s.trick + 1,
    hands,
    won,
    stock,
    trumpCard,
    drawAnim: drewHuman ? { id: s.playSeq + s.trick } : null,
    lastTrick: { winnerId: winId, points: s.table.reduce((sum, e) => sum + (e.card?.points || 0), 0) },
  };
  if (!endRound) {
    return withDerived(base, t, `${s.byId[winId]?.name || winId} gana baza. ${t.nextTurn}`);
  }
  const pp = pByPlayer(won, s.players);
  const ps = pBySide(pp, s.players);
  const user = ps.user || 0;
  const rival = ps.rival || 0;
  const roundWins = { ...s.roundWins };
  let winnerSide = null;
  if (user > rival) { winnerSide = "user"; roundWins.user += 1; }
  else if (rival > user) { winnerSide = "rival"; roundWins.rival += 1; }
  const matchWinner = roundWins.user >= MATCH_TARGET_ROUNDS ? "user" : roundWins.rival >= MATCH_TARGET_ROUNDS ? "rival" : null;
  let msg = winnerSide ? `${winnerSide === "user" ? t.userSide : t.rivalSide} gana ronda (${user}-${rival}).` : `Ronda empatada (${user}-${rival}).`;
  msg = matchWinner ? `${msg} ${(matchWinner === "user" ? t.userSide : t.rivalSide)} gana partida.` : `${msg} ${t.nextRound}`;
  return withDerived({ ...base, status: matchWinner ? "match-over" : "round-over", current: null, turnTransitioning: false, roundWins, matchWinner, roundResult: { pp, ps, winnerSide } }, t, msg);
};

const aiTurn = (s, t) => {
  if (s.status !== "playing" || s.resolving || s.turnTransitioning || !s.current) return s;
  const p = s.byId[s.current];
  if (!p?.ai) return s;
  const idx = aiPick(s, p);
  if (idx < 0) return s;
  return play(s, p.id, idx, t);
};

const stepTime = (s, t, ms) => {
  let n = s;
  const loops = Math.max(1, Math.round((ms || 0) / 260));
  for (let i = 0; i < loops; i += 1) {
    if (n.status !== "playing") break;
    if (n.turnTransitioning) {
      n = withDerived({ ...n, turnTransitioning: false }, t);
      continue;
    }
    if (n.resolving) n = resolveTrick(n, t);
    else if (n.byId[n.current]?.ai) n = aiTurn(n, t);
    else break;
  }
  return n;
};

function Card({ card, deckId = "english", hidden = false, compact = false, onPlay = null, disabled = false }) {
  const image = !hidden && card?.imageUrl;
  const back = hidden && deckId === "spanish";
  const cls = ["brisca-card", compact ? "compact" : "", hidden ? "hidden" : "", image || back ? "image-card" : "", card?.colorClass || "", onPlay ? "playable" : ""].filter(Boolean).join(" ");
  if (hidden) return <div className={cls}>{back ? <img src={BACK_IMAGE} alt="Hidden" className="back-image" loading="lazy" draggable={false} /> : <span className="back-mark">IA</span>}</div>;
  if (!card) return <div className={`${cls} slot`}><span>--</span></div>;
  const face = image ? <img src={card.imageUrl} alt={`${card.rankLabel}${card.suitSymbol}`} className="face-image" loading="lazy" draggable={false} /> : (<><span className="rank">{card.rankLabel}</span><span className="suit">{card.suitSymbol}</span><span className="points">+{card.points}</span></>);
  return onPlay ? <button type="button" className={cls} onClick={onPlay} disabled={disabled}>{face}</button> : <div className={cls}>{face}</div>;
}

function shouldUseCompactMobileLayout() {
  if (typeof window === "undefined") {
    return false;
  }

  const width = window.innerWidth || 0;
  const height = window.innerHeight || 0;
  const shortestSide = Math.min(width, height);
  const longestSide = Math.max(width, height);
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const hasTouch = (navigator.maxTouchPoints ?? 0) > 0;

  return (coarsePointer || hasTouch) && shortestSide <= 480 && longestSide <= 920;
}

function StrategyBriscaDeckGame() {
  const locale = useMemo(localeOf, []);
  const t = useMemo(() => textOf(locale), [locale]);
  const [s, setS] = useState(() => createMatch(locale));
  const [pVar, setPVar] = useState("brisca_duel");
  const [pAi, setPAi] = useState(1);
  const [pDiff, setPDiff] = useState("medium");
  const [compactMobileLayout, setCompactMobileLayout] = useState(() => shouldUseCompactMobileLayout());

  useEffect(() => { setPVar(s.variantId); setPAi(s.aiOpponents); setPDiff(s.difficultyId); }, [s.variantId, s.aiOpponents, s.difficultyId]);
  useEffect(() => { const opts = VARIANTS[pVar]?.aiOptions || [1]; if (!opts.includes(pAi)) setPAi(opts[0]); }, [pAi, pVar]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const syncLayout = () => setCompactMobileLayout(shouldUseCompactMobileLayout());
    syncLayout();

    window.addEventListener("resize", syncLayout);
    window.addEventListener("orientationchange", syncLayout);
    return () => {
      window.removeEventListener("resize", syncLayout);
      window.removeEventListener("orientationchange", syncLayout);
    };
  }, []);

  const restart = useCallback(() => setS((prev) => createMatch(locale, { variantId: prev.variantId, aiOpponents: prev.aiOpponents, difficultyId: prev.difficultyId })), [locale]);
  const applyCfg = useCallback(() => setS(createMatch(locale, { variantId: pVar, aiOpponents: clampAi(pVar, pAi), difficultyId: pDiff })), [locale, pAi, pDiff, pVar]);
  const nextRound = useCallback(() => setS((prev) => {
    if (prev.status !== "round-over") return prev;
    const cfg = createConfig(prev.locale, prev.variantId, prev.aiOpponents, prev.difficultyId);
    const lead = prev.lastTrick?.winnerId || cfg.order[Math.floor(Math.random() * cfg.order.length)] || "human";
    return createRound(cfg, prev.round + 1, prev.roundWins, lead);
  }), []);
  const playHuman = useCallback((idx) => setS((prev) => play(prev, "human", idx, t)), [t]);

  useEffect(() => {
    if (s.status !== "playing" || !s.resolving) return;
    const tm = setTimeout(() => setS((prev) => resolveTrick(prev, t)), RESOLVE_DELAY_MS);
    return () => clearTimeout(tm);
  }, [s.resolving, s.status, s.playSeq, t]);

  useEffect(() => {
    if (s.status !== "playing" || s.resolving || !s.current || !s.byId[s.current]?.ai) return;
    if (s.turnTransitioning) return;
    const d = (DIFF[s.difficultyId] || DIFF.medium).think + AI_THINK_EXTRA_MS + Math.floor(Math.random() * 260);
    const tm = setTimeout(() => setS((prev) => aiTurn(prev, t)), d);
    return () => clearTimeout(tm);
  }, [s.current, s.difficultyId, s.playSeq, s.resolving, s.status, s.turnTransitioning, s.byId, t]);

  useEffect(() => {
    if (s.status !== "playing" || !s.turnTransitioning) return;
    const tm = setTimeout(() => setS((prev) => {
      if (prev.status !== "playing" || !prev.turnTransitioning) return prev;
      return withDerived({ ...prev, turnTransitioning: false }, t);
    }), NEXT_TURN_DELAY_MS);
    return () => clearTimeout(tm);
  }, [s.status, s.turnTransitioning, t]);

  useEffect(() => {
    if (!s.drawAnim) return;
    const tm = setTimeout(() => setS((prev) => (prev.drawAnim ? { ...prev, drawAnim: null } : prev)), DRAW_FX_MS);
    return () => clearTimeout(tm);
  }, [s.drawAnim]);

  const canHuman = s.status === "playing" && !s.resolving && !s.turnTransitioning && s.current === "human";
  const humanHand = s.hands.human || [];
  const legalHuman = useMemo(() => (canHuman ? legalIdx(humanHand, s.table, s.trumpSuit, s.variant) : []), [canHuman, humanHand, s.table, s.trumpSuit, s.variant]);
  const aiPlayers = useMemo(() => s.players.filter((p) => !p.human), [s.players]);
  const compactSeatMap = useMemo(() => ({
    top: aiPlayers.find((player) => player.seat?.slot === "top") || null,
    upperLeft: aiPlayers.find((player) => player.seat?.slot === "upper-left") || null,
    upperRight: aiPlayers.find((player) => player.seat?.slot === "upper-right") || null,
    left: aiPlayers.find((player) => player.seat?.slot === "left") || null,
    right: aiPlayers.find((player) => player.seat?.slot === "right") || null,
  }), [aiPlayers]);
  const compactTopPlayers = useMemo(
    () => [compactSeatMap.upperLeft, compactSeatMap.top, compactSeatMap.upperRight].filter(Boolean),
    [compactSeatMap]
  );
  const compactLeftPlayer = useMemo(
    () => compactSeatMap.left,
    [compactSeatMap]
  );
  const compactRightPlayer = useMemo(
    () => compactSeatMap.right,
    [compactSeatMap]
  );

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const k = e.key.toLowerCase();
      if (k === "r") { e.preventDefault(); restart(); return; }
      if (k === "n") { e.preventDefault(); nextRound(); return; }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (s.status === "round-over") nextRound();
        else if (canHuman && legalHuman.length) playHuman(legalHuman[0]);
        return;
      }
      if (["1", "2", "3"].includes(k)) { e.preventDefault(); playHuman(Number(k) - 1); return; }
      if (["q", "w", "e"].includes(k)) { e.preventDefault(); playHuman({ q: 0, w: 1, e: 2 }[k]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canHuman, legalHuman, nextRound, playHuman, restart, s.status]);

  const pp = useMemo(() => pByPlayer(s.won, s.players), [s.players, s.won]);
  const ps = useMemo(() => pBySide(pp, s.players), [pp, s.players]);
  const statusText = s.status === "match-over" ? t.statusMatch : s.status === "round-over" ? t.statusRound : t.statusPlaying;
  const vLabel = VARIANTS[s.variantId]?.label?.[locale] || VARIANTS[s.variantId]?.label?.en || s.variantId;
  const lastWinnerId = s.lastTrick?.winnerId || null;
  const lastWinnerName = lastWinnerId ? (s.byId[lastWinnerId]?.name || lastWinnerId) : null;
  const matchWinnerLabel = s.matchWinner ? (s.matchWinner === "user" ? t.userSide : t.rivalSide) : "--";

  const bridgePayload = useCallback((snap) => {
    const ppSnap = pByPlayer(snap.won, snap.players);
    const psSnap = pBySide(ppSnap, snap.players);
    const can = snap.status === "playing" && !snap.resolving && !snap.turnTransitioning && snap.current === "human";
    const legal = can ? legalIdx(snap.hands.human || [], snap.table, snap.trumpSuit, snap.variant) : [];
    return {
      mode: "strategy-brisca-ai",
      variant: snap.variantId,
      locale: snap.locale,
      difficultyId: snap.difficultyId,
      status: snap.status,
      resolvingTrick: snap.resolving,
      turnTransitioning: Boolean(snap.turnTransitioning),
      drawAnimating: Boolean(snap.drawAnim),
      round: snap.round,
      trick: snap.trick,
      current: snap.current,
      stockCount: snap.stock.length,
      trumpSuit: snap.trumpSuit,
      players: snap.players.map((p) => ({ id: p.id, name: p.name, side: p.side, isHuman: p.human, handCount: (snap.hands[p.id] || []).length, points: ppSnap[p.id] || 0 })),
      score: { rounds: snap.roundWins, sidePoints: psSnap },
      tableCards: snap.table.map((e) => ({ playerId: e.playerId, card: cardText(e.card) })),
      hands: { human: (snap.hands.human || []).map(cardText) },
      teammateHint: snap.hint?.text || null,
      actions: { playableIndexes: legal.map((i) => i + 1), canNextRound: snap.status === "round-over", canRestart: true },
      message: snap.message,
    };
  }, []);

  const advanceTime = useCallback((ms) => setS((prev) => stepTime(prev, t, ms)), [t]);
  useGameRuntimeBridge(s, bridgePayload, advanceTime);

  const renderCompactSeat = useCallback((player) => {
    const active = s.current === player.id;
    const isMate = s.variant.team && player.side === "user";
    const handCount = (s.hands[player.id] || []).length;
    const wonLast = lastWinnerId === player.id;

    return (
      <article
        key={`compact-${player.id}`}
        className={[
          "brisca-mobile-seat",
          player.seat?.slot ? `seat-slot-${player.seat.slot}` : "",
          player.side === "user" ? "seat-friendly" : "seat-rival",
          active ? "seat-active" : "",
          wonLast ? "seat-won-trick" : "",
        ].filter(Boolean).join(" ")}
      >
        <header>
          <h5 className="seat-name-badge">{player.name}</h5>
          <span className="seat-tag">{isMate ? t.seatMate : t.seatRival}</span>
        </header>
        <span className="seat-points-chip" aria-label={`${t.points}: ${pp[player.id] || 0}`}>Pts {pp[player.id] || 0}</span>
        {wonLast ? <span className="seat-turn-led" aria-label={`${player.name}: ${t.wonTrick}`}>{t.wonTrick}</span> : null}
        <div className="seat-hidden-hand" aria-label={`${player.name} ${handCount} ${t.hidden}`}>
          {Array.from({ length: handCount }).map((_, index) => (
            <Card key={`${player.id}-compact-${index}`} hidden compact deckId={s.deckId} />
          ))}
        </div>
        {s.hint?.playerId === player.id ? <p className="seat-hint-bubble">{t.hintLabel}: <strong>{s.hint.text}</strong></p> : null}
      </article>
    );
  }, [lastWinnerId, pp, s.current, s.deckId, s.hands, s.hint?.playerId, s.hint?.text, s.variant.team, t]);

  return (
    <div className="mini-game strategy-brisca-game brisca-arena">
      <div className="mini-head">
        <div><h4>{t.title}</h4><p>{t.subtitle}</p></div>
        <div className="brisca-actions-head">
          <button type="button" onClick={restart}>{t.newMatch}</button>
          {s.status === "round-over" ? <button type="button" onClick={nextRound}>{t.nextRound}</button> : null}
        </div>
      </div>

      <div className="brisca-config">
        <label htmlFor="brisca-variant"><span>{t.gameType}</span>
          <select id="brisca-variant" value={pVar} onChange={(e) => setPVar(normVariant(e.target.value))}>
            {Object.keys(VARIANTS).map((id) => <option key={id} value={id}>{VARIANTS[id].label[locale] || VARIANTS[id].label.en}</option>)}
          </select>
        </label>
        <label htmlFor="brisca-ai"><span>{t.aiCount}</span>
          <select id="brisca-ai" value={pAi} onChange={(e) => setPAi(Number(e.target.value) || 1)}>
            {(VARIANTS[pVar]?.aiOptions || [1]).map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label htmlFor="brisca-diff"><span>{t.aiDifficulty}</span>
          <select id="brisca-diff" value={pDiff} onChange={(e) => setPDiff(normDiff(e.target.value))}>
            {Object.keys(DIFF).map((id) => <option key={id} value={id}>{DIFF[id].label[locale] || DIFF[id].label.en}</option>)}
          </select>
        </label>
        <button type="button" className="brisca-apply" onClick={applyCfg}>{t.apply}</button>
      </div>

      <div className="status-row brisca-status-row">
        <span className={`status-pill ${s.status === "playing" ? "playing" : "finished"}`}>{statusText}</span>
        <span>{t.gameType}: {vLabel}</span>
        <span>{t.round}: {s.round}</span>
        <span>{t.trick}: {Math.max(1, s.trick - (s.status === "playing" ? 0 : 1))}</span>
        <span>{t.deck}: {s.deckName}</span>
        <span>{t.stock}: {s.stock.length}</span>
        <span>{t.trump}: {s.trumpSuit || "--"}</span>
        <span>{t.points}: {ps.user || 0} - {ps.rival || 0}</span>
        <span>{t.rounds}: {s.roundWins.user} - {s.roundWins.rival}</span>
        {lastWinnerName ? <span>{t.lastTrick}: {lastWinnerName}</span> : null}
      </div>

      <div className="brisca-table-shell">
        <div className={`brisca-table-felt ai-count-${s.aiOpponents} ${compactMobileLayout ? "is-mobile-stack" : ""}`}>
          {compactMobileLayout ? (
            <>
              {compactTopPlayers.length ? (
                <section className={`brisca-mobile-opponents ai-count-${s.aiOpponents} top-row-count-${compactTopPlayers.length}`}>
                  {compactTopPlayers.map((player) => renderCompactSeat(player))}
                </section>
              ) : null}

              <div className={`brisca-mobile-middle has-left-${compactLeftPlayer ? "yes" : "no"} has-right-${compactRightPlayer ? "yes" : "no"}`}>
                <div className="brisca-mobile-side brisca-mobile-side--left">
                  {compactLeftPlayer ? renderCompactSeat(compactLeftPlayer) : null}
                </div>

                <section className="brisca-mobile-center">
                  <div className="brisca-center-meta">
                    <article className="brisca-pile brisca-pile-trump"><h6>{t.trump}</h6><Card card={s.trumpCard} deckId={s.deckId} compact /></article>
                    <article className="brisca-pile brisca-pile-stock">
                      <h6>{t.stock}</h6>
                      <div className="brisca-stock-stack" aria-label={`${t.stock}: ${s.stock.length + (s.trumpCard ? 1 : 0)}`}>
                        <div className="brisca-stock-layer layer-back"><Card hidden compact deckId={s.deckId} /></div>
                        <div className="brisca-stock-layer layer-mid"><Card hidden compact deckId={s.deckId} /></div>
                        <div className="brisca-stock-layer layer-front"><Card hidden compact deckId={s.deckId} /></div>
                        <strong>{s.stock.length + (s.trumpCard ? 1 : 0)}</strong>
                      </div>
                    </article>
                  </div>
                  <div className="brisca-center-trick">
                    {s.table.length ? s.table.map((entry, index) => (
                      <div key={entry.playId} className="brisca-center-card" style={{ "--card-rot": `${(index - (s.table.length - 1) / 2) * 5}deg` }}>
                        <Card card={entry.card} deckId={s.deckId} compact />
                        <small>{s.byId[entry.playerId]?.name || entry.playerId}</small>
                      </div>
                    )) : <p className="brisca-center-empty">{t.yourTurn}</p>}
                  </div>
                  <p className="brisca-message">{s.message}</p>
                </section>

                <div className="brisca-mobile-side brisca-mobile-side--right">
                  {compactRightPlayer ? renderCompactSeat(compactRightPlayer) : null}
                </div>
              </div>

              {s.drawAnim ? <div key={`mobile-${s.drawAnim.id}`} className="brisca-draw-fx brisca-draw-fx--mobile"><Card hidden compact deckId={s.deckId} /></div> : null}

              <section className={["brisca-mobile-human", lastWinnerId === "human" ? "human-won-trick" : ""].join(" ")}>
                <span className="seat-points-chip seat-points-chip--human" aria-label={`${t.points}: ${pp.human || 0}`}>Pts {pp.human || 0}</span>
                <header><h5>{t.human}</h5></header>
                {lastWinnerId === "human" ? <span className="seat-turn-led human-turn-led" aria-label={t.wonTrick}>{t.wonTrick}</span> : null}
                <div className="brisca-player-hand">
                  {humanHand.map((card, index) => (
                    <Card
                      key={card.id}
                      card={card}
                      deckId={s.deckId}
                      compact
                      onPlay={() => playHuman(index)}
                      disabled={!canHuman || !legalHuman.includes(index)}
                    />
                  ))}
                </div>
              </section>
            </>
          ) : (
            <>
              <div className="brisca-seat-ring">
                {aiPlayers.map((p) => {
                  const active = s.current === p.id;
                  const isMate = s.variant.team && !p.human && p.side === "user";
                  const handCount = (s.hands[p.id] || []).length;
                  const wonLast = lastWinnerId === p.id;
                  return (
                    <article key={p.id} className={["brisca-seat", p.human ? "seat-human" : "seat-ai", p.side === "user" ? "seat-friendly" : "seat-rival", p.seat?.slot ? `seat-slot-${p.seat.slot}` : "", active ? "seat-active" : "", wonLast ? "seat-won-trick" : ""].filter(Boolean).join(" ")} style={{ "--seat-x": `${p.seat.x}%`, "--seat-y": `${p.seat.y}%` }}>
                      <header><h5>{p.name}</h5><span className="seat-tag">{p.human ? t.seatHuman : isMate ? t.seatMate : t.seatRival}</span></header>
                      <p className="seat-side">{p.side === "user" ? t.userSide : t.rivalSide}</p>
                      <p className="seat-kpi">{t.points}: {pp[p.id] || 0}</p>
                      {wonLast ? <span className="seat-turn-led" aria-label={`${p.name}: ${t.wonTrick}`}>{t.wonTrick}</span> : null}
                      {!p.human ? <div className="seat-hidden-hand" aria-label={`${p.name} ${handCount} ${t.hidden}`}>{Array.from({ length: handCount }).map((_, i) => <Card key={`${p.id}-h-${i}`} hidden compact deckId={s.deckId} />)}</div> : null}
                      {s.hint?.playerId === p.id ? <p className="seat-hint-bubble">{t.hintLabel}: <strong>{s.hint.text}</strong></p> : null}
                    </article>
                  );
                })}
              </div>

              <section className="brisca-center-zone">
                <div className="brisca-center-meta">
                  <article className="brisca-pile brisca-pile-trump"><h6>{t.trump}</h6><Card card={s.trumpCard} deckId={s.deckId} compact /></article>
                  <article className="brisca-pile brisca-pile-stock">
                    <h6>{t.stock}</h6>
                    <div className="brisca-stock-stack" aria-label={`${t.stock}: ${s.stock.length + (s.trumpCard ? 1 : 0)}`}>
                      <div className="brisca-stock-layer layer-back"><Card hidden compact deckId={s.deckId} /></div>
                      <div className="brisca-stock-layer layer-mid"><Card hidden compact deckId={s.deckId} /></div>
                      <div className="brisca-stock-layer layer-front"><Card hidden compact deckId={s.deckId} /></div>
                      <strong>{s.stock.length + (s.trumpCard ? 1 : 0)}</strong>
                    </div>
                  </article>
                </div>
                <div className="brisca-center-trick">
                  {s.table.length ? s.table.map((e, i) => (
                    <div key={e.playId} className="brisca-center-card" style={{ "--from-x": `${e.from.x}%`, "--from-y": `${e.from.y}%`, "--card-rot": `${(i - (s.table.length - 1) / 2) * 7}deg` }}>
                      <Card card={e.card} deckId={s.deckId} />
                      <small>{s.byId[e.playerId]?.name || e.playerId}</small>
                    </div>
                  )) : <p className="brisca-center-empty">{t.yourTurn}</p>}
                </div>
                <p className="brisca-message">{s.message}</p>
                <p className="brisca-help">{t.controls}</p>
              </section>

              {s.drawAnim ? <div key={s.drawAnim.id} className="brisca-draw-fx"><Card hidden compact deckId={s.deckId} /></div> : null}

              <section className={["brisca-human-zone", lastWinnerId === "human" ? "human-won-trick" : ""].join(" ")}>
                <header><h5>{t.human}</h5><span>{t.points}: {pp.human || 0}</span></header>
                {lastWinnerId === "human" ? <span className="seat-turn-led human-turn-led" aria-label={t.wonTrick}>{t.wonTrick}</span> : null}
                <div className="brisca-player-hand">
                  {humanHand.map((card, i) => <Card key={card.id} card={card} deckId={s.deckId} onPlay={() => playHuman(i)} disabled={!canHuman || !legalHuman.includes(i)} />)}
                </div>
              </section>
            </>
          )}

          {s.status === "match-over" ? (
            <div className="brisca-match-modal-wrap" role="dialog" aria-live="polite" aria-label={t.statusMatch}>
              <article className="brisca-match-modal">
                <h5>{t.matchEndTitle}</h5>
                <p>{t.winnerIs}: <strong>{matchWinnerLabel}</strong></p>
                <button type="button" onClick={restart}>{t.newMatch}</button>
              </article>
            </div>
          ) : null}
        </div>
      </div>

      <details className="brisca-rules"><summary>{t.promptTitle}</summary><pre>{RULES[locale] || RULES.en}</pre></details>
      {s.deckId === "spanish" ? <p className="brisca-source">{t.assets}: <a href={SPANISH_CARD_SOURCE} target="_blank" rel="noreferrer">{t.assetsLink}</a></p> : null}
    </div>
  );
}

export default StrategyBriscaDeckGame;
