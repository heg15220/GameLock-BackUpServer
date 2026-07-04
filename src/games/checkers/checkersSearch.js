// Motor de busqueda de damas: negamax con poda alfa-beta, tabla de
// transposicion (Zobrist), ordenacion de jugadas (hash move, capturas, killers,
// history) y quiescence sobre capturas.
//
// Particularidad de las damas: el turno NO siempre alterna. Una cadena de
// captura o un movimiento extra dejan al mismo bando moviendo de nuevo. Por eso
// la busqueda decide si invertir la perspectiva comparando el turno del hijo
// con el del nodo actual, en lugar de asumir alternancia.

import {
  COLORS,
  makeMoveForSearch,
  toRow,
  toCol
} from "./checkersEngine";
import { evaluate } from "./checkersEvaluation";
import {
  TranspositionTable,
  TT_FLAG,
  createSeededRng,
  zobristKeyString
} from "../shared/transpositionTable";

const WHITE = COLORS.WHITE;

export const MATE_SCORE = 1000000;
const MATE_THRESHOLD = MATE_SCORE - 1000;
const INFINITY = 2000000;
const MAX_QUIESCENCE_DEPTH = 8;

// ─── Zobrist ────────────────────────────────────────────────────────────────

const buildZobrist = () => {
  const rng = createSeededRng(0x7c9e6a2f);
  const rand32 = () => Math.floor(rng() * 4294967296);
  const pieces = [];
  for (let square = 0; square < 64; square += 1) {
    const slots = [];
    for (let slot = 0; slot < 4; slot += 1) {
      slots.push({ hi: rand32(), lo: rand32() });
    }
    pieces.push(slots);
  }
  return {
    pieces,
    blackToMove: { hi: rand32(), lo: rand32() },
    forced: Array.from({ length: 64 }, () => ({ hi: rand32(), lo: rand32() }))
  };
};

const ZOB = buildZobrist();

// slot: man-w=0, king-w=1, man-b=2, king-b=3
const pieceSlot = (piece) => (piece.color === WHITE ? 0 : 2) + (piece.king ? 1 : 0);

export const zobristKey = (state) => {
  let hi = 0;
  let lo = 0;
  const board = state.board;
  for (let square = 0; square < 64; square += 1) {
    const piece = board[square];
    if (!piece) continue;
    const entry = ZOB.pieces[square][pieceSlot(piece)];
    hi ^= entry.hi;
    lo ^= entry.lo;
  }
  if (state.turn !== WHITE) {
    hi ^= ZOB.blackToMove.hi;
    lo ^= ZOB.blackToMove.lo;
  }
  if (state.forcedPiece != null) {
    hi ^= ZOB.forced[state.forcedPiece].hi;
    lo ^= ZOB.forced[state.forcedPiece].lo;
  }
  return zobristKeyString(hi, lo);
};

// ─── Utilidades ─────────────────────────────────────────────────────────────

const terminalScore = (state, ply) => {
  if (!state.result) return null;
  if (state.result.type === "draw") return 0;
  return state.result.winner === state.turn ? MATE_SCORE - ply : -(MATE_SCORE - ply);
};

const timedOut = (ctx) => ctx.nodes >= ctx.maxNodes || Date.now() >= ctx.deadline;

// ─── Ordenacion ─────────────────────────────────────────────────────────────

const HASH_BONUS = 3000000;
const CAPTURE_BASE = 1000000;
const PROMO_BONUS = 500000;
const KILLER0 = 400000;
const KILLER1 = 390000;

const moveKey = (move) => move.from * 64 + move.to;

const isPromotion = (state, move) => {
  const piece = state.board[move.from];
  if (!piece || piece.king) return false;
  const targetRow = toRow(move.to);
  return (piece.color === WHITE && targetRow === 0) || (piece.color !== WHITE && targetRow === 7);
};

const scoreMove = (state, move, ctx, ply, hashK) => {
  const key = moveKey(move);
  if (hashK >= 0 && key === hashK) return HASH_BONUS;
  if (move.captureIndex != null) return CAPTURE_BASE + (move.pieceKing ? 40 : 0);
  if (isPromotion(state, move)) return PROMO_BONUS;

  const killers = ctx.killers[ply];
  if (killers) {
    if (killers[0] === key) return KILLER0;
    if (killers[1] === key) return KILLER1;
  }
  return ctx.history[key] || 0;
};

const orderMoves = (state, moves, ctx, ply, hashK) => {
  const scored = moves.map((move) => ({ move, score: scoreMove(state, move, ctx, ply, hashK) }));
  scored.sort((a, b) => b.score - a.score);
  return scored;
};

const recordKiller = (ctx, ply, move) => {
  if (move.captureIndex != null) return;
  const key = moveKey(move);
  const killers = ctx.killers[ply] || (ctx.killers[ply] = [-1, -1]);
  if (killers[0] !== key) {
    killers[1] = killers[0];
    killers[0] = key;
  }
};

const recordHistory = (ctx, move, depth) => {
  if (move.captureIndex != null) return;
  const key = moveKey(move);
  ctx.history[key] = (ctx.history[key] || 0) + depth * depth;
};

// ─── Quiescence (solo capturas) ─────────────────────────────────────────────

const quiescence = (state, alpha, beta, ctx, ply, qDepth) => {
  if (ctx.aborted) return evaluate(state, state.turn);
  if ((ctx.nodes & 2047) === 0 && timedOut(ctx)) {
    ctx.aborted = true;
    return evaluate(state, state.turn);
  }
  ctx.nodes += 1;

  const terminal = terminalScore(state, ply);
  if (terminal != null) return terminal;

  const standPat = evaluate(state, state.turn);
  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;
  if (qDepth <= 0) return alpha;

  const captures = state.legalMoves.filter((move) => move.captureIndex != null);
  if (!captures.length) return alpha;

  const ordered = orderMoves(state, captures, ctx, ply, -1);
  for (const { move } of ordered) {
    const child = makeMoveForSearch(state, move);
    const sameMover = child.turn === state.turn && !child.result;
    const score = sameMover
      ? quiescence(child, alpha, beta, ctx, ply + 1, qDepth - 1)
      : -quiescence(child, -beta, -alpha, ctx, ply + 1, qDepth - 1);
    if (ctx.aborted) return alpha;
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
};

// ─── Negamax ────────────────────────────────────────────────────────────────

const negamax = (state, depth, alpha, beta, ctx, ply) => {
  if (ctx.aborted) return evaluate(state, state.turn);
  if ((ctx.nodes & 2047) === 0 && timedOut(ctx)) {
    ctx.aborted = true;
    return evaluate(state, state.turn);
  }
  ctx.nodes += 1;

  const terminal = terminalScore(state, ply);
  if (terminal != null) return terminal;

  if (depth <= 0) {
    return quiescence(state, alpha, beta, ctx, ply, MAX_QUIESCENCE_DEPTH);
  }

  const alphaOrig = alpha;
  const key = zobristKey(state);
  const ttEntry = ctx.tt.get(key);
  let hashK = -1;
  if (ttEntry) {
    hashK = ttEntry.bestMove;
    if (ttEntry.depth >= depth) {
      if (ttEntry.flag === TT_FLAG.EXACT) return ttEntry.score;
      if (ttEntry.flag === TT_FLAG.LOWER && ttEntry.score > alpha) alpha = ttEntry.score;
      else if (ttEntry.flag === TT_FLAG.UPPER && ttEntry.score < beta) beta = ttEntry.score;
      if (alpha >= beta) return ttEntry.score;
    }
  }

  const ordered = orderMoves(state, state.legalMoves, ctx, ply, hashK);
  let best = -INFINITY;
  let bestMove = null;

  for (let i = 0; i < ordered.length; i += 1) {
    const move = ordered[i].move;
    const child = makeMoveForSearch(state, move);
    // Si el mismo bando vuelve a mover (cadena de captura o movimiento extra),
    // no se invierte la perspectiva ni la ventana.
    const sameMover = child.turn === state.turn && !child.result;
    const score = sameMover
      ? negamax(child, depth - 1, alpha, beta, ctx, ply + 1)
      : -negamax(child, depth - 1, -beta, -alpha, ctx, ply + 1);

    if (ctx.aborted) return best > -INFINITY ? best : alpha;

    if (score > best) {
      best = score;
      bestMove = move;
    }
    if (score > alpha) alpha = score;
    if (alpha >= beta) {
      recordKiller(ctx, ply, move);
      recordHistory(ctx, move, depth);
      break;
    }
  }

  let flag = TT_FLAG.EXACT;
  if (best <= alphaOrig) flag = TT_FLAG.UPPER;
  else if (best >= beta) flag = TT_FLAG.LOWER;
  ctx.tt.set(key, depth, best, flag, bestMove ? moveKey(bestMove) : -1);

  return best;
};

// ─── Raiz e iterative deepening ─────────────────────────────────────────────

const searchRoot = (state, depth, ctx, prevBestKey) => {
  const ordered = orderMoves(state, state.legalMoves, ctx, 0, prevBestKey);

  let alpha = -INFINITY;
  const beta = INFINITY;
  let bestMove = null;
  let bestScore = -INFINITY;
  const scores = new Map();

  for (let i = 0; i < ordered.length; i += 1) {
    const move = ordered[i].move;
    const child = makeMoveForSearch(state, move);
    const sameMover = child.turn === state.turn && !child.result;
    const score = sameMover
      ? negamax(child, depth - 1, alpha, beta, ctx, 1)
      : -negamax(child, depth - 1, -beta, -alpha, ctx, 1);

    if (ctx.aborted && i > 0) break;

    scores.set(moveKey(move), score);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    if (score > alpha) alpha = score;
  }

  return { bestMove, bestScore, scores, completed: !ctx.aborted };
};

// Busca la mejor jugada. Devuelve la jugada, su score, la profundidad, los
// nodos y un mapa clave->score de la ultima iteracion completa (para que el
// orquestador aplique la aleatoriedad de cada nivel).
export const search = (state, options = {}) => {
  const {
    maxDepth = 64,
    timeMs = 1800,
    maxNodes = 4000000,
    tt = new TranspositionTable()
  } = options;

  const legal = state.legalMoves || [];
  if (!legal.length) return { move: null, score: 0, depth: 0, nodes: 0, scores: new Map() };
  if (legal.length === 1) {
    return { move: legal[0], score: 0, depth: 0, nodes: 0, scores: new Map([[moveKey(legal[0]), 0]]) };
  }

  const ctx = {
    deadline: Date.now() + timeMs,
    maxNodes,
    nodes: 0,
    aborted: false,
    tt,
    killers: [],
    history: {}
  };

  let best = { move: legal[0], score: 0, depth: 0, scores: new Map() };

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    const result = searchRoot(state, depth, ctx, best.move ? moveKey(best.move) : -1);
    if (result.bestMove && (result.completed || best.depth === 0)) {
      best = { move: result.bestMove, score: result.bestScore, depth, scores: result.scores };
    }
    if (ctx.aborted || timedOut(ctx)) break;
    if (Math.abs(best.score) >= MATE_THRESHOLD) break;
  }

  return { ...best, nodes: ctx.nodes, moveKeyOf: moveKey };
};

export { moveKey };
