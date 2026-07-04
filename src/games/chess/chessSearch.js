// Motor de busqueda de ajedrez: negamax con poda alfa-beta y las tecnicas
// clasicas que multiplican su fuerza dentro de un presupuesto de tiempo:
//
//   - Tabla de transposicion + Zobrist hashing (reutiliza posiciones y aporta
//     el "hash move", el mayor acelerador de la ordenacion).
//   - Principal Variation Search (ventanas nulas para los moves no principales).
//   - Null-move pruning y Late Move Reductions.
//   - Killer moves + history heuristic para ordenar las jugadas tranquilas.
//   - Quiescence search con delta pruning (estabiliza la evaluacion en tacticas).
//   - Iterative deepening con aspiration windows y corte por tiempo/nodos.
//
// El motor es puro: no toca el DOM y se ejecuta igual en el hilo principal, en
// un Web Worker o en los tests de Node.

import {
  COLORS,
  PIECES,
  makeMoveForSearch,
  makeNullMoveForSearch,
  moveToUci,
  toCol
} from "./chessEngine";
import { evaluate, PIECE_VALUE } from "./chessEvaluation";
import {
  TranspositionTable,
  TT_FLAG,
  createSeededRng,
  zobristKeyString
} from "../shared/transpositionTable";

const WHITE = COLORS.WHITE;
const BLACK = COLORS.BLACK;

export const MATE_SCORE = 1000000;
const MATE_THRESHOLD = MATE_SCORE - 1000;
const INFINITY = 2000000;
const MAX_QUIESCENCE_DEPTH = 6;

// ─── Zobrist hashing ────────────────────────────────────────────────────────

const PIECE_ORDER = [
  PIECES.PAWN, PIECES.KNIGHT, PIECES.BISHOP,
  PIECES.ROOK, PIECES.QUEEN, PIECES.KING
];
const pieceSlot = (type, color) => (
  PIECE_ORDER.indexOf(type) + (color === WHITE ? 0 : 6)
);

const buildZobrist = () => {
  const rng = createSeededRng(0x1a2b3c4d);
  const rand32 = () => Math.floor(rng() * 4294967296);
  const pieces = [];
  for (let square = 0; square < 64; square += 1) {
    const slots = [];
    for (let slot = 0; slot < 12; slot += 1) {
      slots.push({ hi: rand32(), lo: rand32() });
    }
    pieces.push(slots);
  }
  return {
    pieces,
    blackToMove: { hi: rand32(), lo: rand32() },
    castling: Array.from({ length: 4 }, () => ({ hi: rand32(), lo: rand32() })),
    enPassantFile: Array.from({ length: 8 }, () => ({ hi: rand32(), lo: rand32() }))
  };
};

const ZOB = buildZobrist();

const CASTLE_ORDER = ["wK", "wQ", "bK", "bQ"];

// Clave Zobrist completa de una posicion (recalculada por nodo: O(piezas),
// del mismo orden de coste que el clonado del tablero).
export const zobristKey = (state) => {
  let hi = 0;
  let lo = 0;
  const board = state.board;
  for (let square = 0; square < 64; square += 1) {
    const piece = board[square];
    if (!piece) continue;
    const entry = ZOB.pieces[square][pieceSlot(piece.type, piece.color)];
    hi ^= entry.hi;
    lo ^= entry.lo;
  }
  if (state.turn === BLACK) {
    hi ^= ZOB.blackToMove.hi;
    lo ^= ZOB.blackToMove.lo;
  }
  if (state.castling) {
    for (let i = 0; i < 4; i += 1) {
      if (state.castling[CASTLE_ORDER[i]]) {
        hi ^= ZOB.castling[i].hi;
        lo ^= ZOB.castling[i].lo;
      }
    }
  }
  if (state.enPassant != null) {
    const file = toCol(state.enPassant);
    hi ^= ZOB.enPassantFile[file].hi;
    lo ^= ZOB.enPassantFile[file].lo;
  }
  return zobristKeyString(hi, lo);
};

// ─── Utilidades ─────────────────────────────────────────────────────────────

const terminalScore = (state, ply) => {
  if (!state.result) return null;
  if (state.result.type === "draw") return 0;
  // Solo puede ser mate: el bando al turno no tiene jugadas y esta en jaque.
  return state.result.winner === state.turn ? MATE_SCORE - ply : -(MATE_SCORE - ply);
};

const isCapture = (move) => Boolean(move.capture || move.isEnPassant || move.promotion);

const hasNonPawnMaterial = (state, color) => {
  const board = state.board;
  for (let i = 0; i < 64; i += 1) {
    const piece = board[i];
    if (piece && piece.color === color && piece.type !== PIECES.PAWN && piece.type !== PIECES.KING) {
      return true;
    }
  }
  return false;
};

const timedOut = (ctx) => ctx.nodes >= ctx.maxNodes || Date.now() >= ctx.deadline;

// ─── Ordenacion de jugadas ──────────────────────────────────────────────────

const HASH_BONUS = 3000000;
const CAPTURE_BASE = 1000000;
const PROMO_BASE = 900000;
const KILLER0 = 800000;
const KILLER1 = 790000;

// Clave numerica compacta de una jugada (from,to). Se usa en todo el camino
// caliente de la busqueda para ordenar sin construir cadenas UCI (evitar
// `moveToUci` por nodo multiplica la velocidad). Las promociones del mismo
// from-to comparten clave, lo que es irrelevante para killers/hash/history.
const moveKey = (move) => move.from * 64 + move.to;

const scoreMove = (move, ctx, ply, hashK) => {
  const key = moveKey(move);
  if (hashK >= 0 && key === hashK) return HASH_BONUS;

  if (move.capture || move.isEnPassant) {
    const victim = PIECE_VALUE[move.capture] || PIECE_VALUE[PIECES.PAWN];
    const attacker = PIECE_VALUE[move.piece] || 0;
    return CAPTURE_BASE + victim * 16 - attacker;
  }
  if (move.promotion) {
    return PROMO_BASE + (PIECE_VALUE[move.promotion] || 0);
  }

  const killers = ctx.killers[ply];
  if (killers) {
    if (killers[0] === key) return KILLER0;
    if (killers[1] === key) return KILLER1;
  }
  return ctx.history[key] || 0;
};

const orderMoves = (moves, ctx, ply, hashK) => {
  const scored = moves.map((move) => ({ move, score: scoreMove(move, ctx, ply, hashK) }));
  scored.sort((a, b) => b.score - a.score);
  return scored;
};

const recordKiller = (ctx, ply, move) => {
  if (isCapture(move)) return;
  const key = moveKey(move);
  const killers = ctx.killers[ply] || (ctx.killers[ply] = [-1, -1]);
  if (killers[0] !== key) {
    killers[1] = killers[0];
    killers[0] = key;
  }
};

const recordHistory = (ctx, move, depth) => {
  if (isCapture(move)) return;
  const key = moveKey(move);
  ctx.history[key] = (ctx.history[key] || 0) + depth * depth;
};

// ─── Quiescence ─────────────────────────────────────────────────────────────

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

  const tactical = state.legalMoves.filter(isCapture);
  if (!tactical.length) return alpha;

  const ordered = orderMoves(tactical, ctx, ply, -1);
  for (const { move } of ordered) {
    // Delta pruning: si aun capturando la pieza mas valiosa no alcanzamos
    // alpha, esta rama tactica no puede mejorar el resultado.
    const gain = PIECE_VALUE[move.capture] || PIECE_VALUE[PIECES.QUEEN];
    if (standPat + gain + 200 < alpha) continue;

    const child = makeMoveForSearch(state, move);
    const score = -quiescence(child, -beta, -alpha, ctx, ply + 1, qDepth - 1);
    if (ctx.aborted) return alpha;
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
};

// ─── Negamax ────────────────────────────────────────────────────────────────

const negamax = (state, depth, alpha, beta, ctx, ply, allowNull) => {
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

  // Null-move pruning: si el bando al turno pudiera "pasar" y aun asi la
  // posicion supera beta, es tan buena que podamos. Se evita en jaque y en
  // finales sin piezas mayores/menores (riesgo de zugzwang).
  if (
    allowNull &&
    depth >= 3 &&
    !state.inCheck &&
    beta < MATE_THRESHOLD &&
    hasNonPawnMaterial(state, state.turn)
  ) {
    const R = depth > 6 ? 3 : 2;
    const nullChild = makeNullMoveForSearch(state);
    const score = -negamax(nullChild, depth - 1 - R, -beta, -beta + 1, ctx, ply + 1, false);
    if (ctx.aborted) return alpha;
    if (score >= beta) return beta;
  }

  const moves = state.legalMoves;
  const ordered = orderMoves(moves, ctx, ply, hashK);

  let best = -INFINITY;
  let bestMove = null;

  for (let i = 0; i < ordered.length; i += 1) {
    const move = ordered[i];
    const child = makeMoveForSearch(state, move.move);
    const givesCheck = child.inCheck;

    let score;
    if (i === 0) {
      score = -negamax(child, depth - 1, -beta, -alpha, ctx, ply + 1, true);
    } else {
      // Late Move Reductions: reduce jugadas tranquilas tardias.
      let reduction = 0;
      if (
        depth >= 3 &&
        i >= 3 &&
        !givesCheck &&
        !state.inCheck &&
        !isCapture(move.move) &&
        move.score < KILLER1
      ) {
        reduction = 1;
      }
      // Principal Variation Search con ventana nula.
      score = -negamax(child, depth - 1 - reduction, -alpha - 1, -alpha, ctx, ply + 1, true);
      if (score > alpha && (reduction > 0 || score < beta)) {
        score = -negamax(child, depth - 1, -beta, -alpha, ctx, ply + 1, true);
      }
    }

    if (ctx.aborted) return best > -INFINITY ? best : alpha;

    if (score > best) {
      best = score;
      bestMove = move.move;
    }
    if (score > alpha) alpha = score;
    if (alpha >= beta) {
      recordKiller(ctx, ply, move.move);
      recordHistory(ctx, move.move, depth);
      break;
    }
  }

  // Guardar en la tabla de transposicion con la cota adecuada.
  let flag = TT_FLAG.EXACT;
  if (best <= alphaOrig) flag = TT_FLAG.UPPER;
  else if (best >= beta) flag = TT_FLAG.LOWER;
  ctx.tt.set(key, depth, best, flag, bestMove ? moveKey(bestMove) : -1);

  return best;
};

// ─── Raiz e iterative deepening ─────────────────────────────────────────────

const searchRoot = (state, depth, ctx, prevBestKey) => {
  const moves = state.legalMoves;
  const ordered = orderMoves(moves, ctx, 0, prevBestKey);

  let alpha = -INFINITY;
  const beta = INFINITY;
  let bestMove = null;
  let bestScore = -INFINITY;
  const scores = new Map();

  for (let i = 0; i < ordered.length; i += 1) {
    const move = ordered[i].move;
    const child = makeMoveForSearch(state, move);
    let score;
    if (i === 0) {
      score = -negamax(child, depth - 1, -beta, -alpha, ctx, 1, true);
    } else {
      score = -negamax(child, depth - 1, -alpha - 1, -alpha, ctx, 1, true);
      if (score > alpha) {
        score = -negamax(child, depth - 1, -beta, -alpha, ctx, 1, true);
      }
    }

    if (ctx.aborted && i > 0) break;

    scores.set(moveToUci(move), score);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    if (score > alpha) alpha = score;
  }

  return { bestMove, bestScore, scores, completed: !ctx.aborted };
};

// Busca la mejor jugada de `state`. Devuelve la jugada, su score, la
// profundidad alcanzada, los nodos explorados y el mapa uci->score de la ultima
// iteracion completa (util para que el orquestador aplique aleatoriedad por
// nivel sin repetir la busqueda).
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
    return { move: legal[0], score: 0, depth: 0, nodes: 0, scores: new Map([[moveToUci(legal[0]), 0]]) };
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
  let prevScore = 0;

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    // Aspiration windows: a partir de cierta profundidad buscamos en una
    // ventana estrecha alrededor del score previo y la ensanchamos si falla.
    let result;
    if (depth >= 4 && Math.abs(prevScore) < MATE_THRESHOLD) {
      let window = 40;
      for (;;) {
        const alpha = prevScore - window;
        const beta = prevScore + window;
        result = searchRootWindowed(state, depth, ctx, best.move ? moveKey(best.move) : -1, alpha, beta);
        if (ctx.aborted) break;
        if (result.bestScore <= alpha || result.bestScore >= beta) {
          window *= 3;
          if (window > 2000) {
            result = searchRoot(state, depth, ctx, best.move ? moveKey(best.move) : -1);
            break;
          }
          continue;
        }
        break;
      }
    } else {
      result = searchRoot(state, depth, ctx, best.move ? moveKey(best.move) : -1);
    }

    if (result.bestMove && (result.completed || best.depth === 0)) {
      best = {
        move: result.bestMove,
        score: result.bestScore,
        depth,
        scores: result.scores
      };
      prevScore = result.bestScore;
    }

    if (ctx.aborted || timedOut(ctx)) break;
    if (Math.abs(best.score) >= MATE_THRESHOLD) break; // mate encontrado
  }

  return { ...best, nodes: ctx.nodes };
};

// Variante de searchRoot con ventana de aspiracion [alpha0, beta0].
const searchRootWindowed = (state, depth, ctx, prevBestKey, alpha0, beta0) => {
  const moves = state.legalMoves;
  const ordered = orderMoves(moves, ctx, 0, prevBestKey);

  let alpha = alpha0;
  const beta = beta0;
  let bestMove = null;
  let bestScore = -INFINITY;
  const scores = new Map();

  for (let i = 0; i < ordered.length; i += 1) {
    const move = ordered[i].move;
    const child = makeMoveForSearch(state, move);
    const score = -negamax(child, depth - 1, -beta, -alpha, ctx, 1, true);
    if (ctx.aborted && i > 0) break;

    scores.set(moveToUci(move), score);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    if (score > alpha) alpha = score;
    if (alpha >= beta) break; // fallo alto: hay que reabrir la ventana
  }

  return { bestMove, bestScore, scores, completed: !ctx.aborted };
};
