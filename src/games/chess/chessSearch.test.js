import { describe, it, expect } from "vitest";
import { createChessStateFromFen, moveToUci } from "./chessEngine";
import { search, zobristKey } from "./chessSearch";
import { chooseAIMove } from "./chessAI";
import { getOpeningMove, isInBook } from "./chessOpeningBook";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const MIDGAME = "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3";

describe("busqueda de ajedrez", () => {
  it("captura una dama colgada", () => {
    const state = createChessStateFromFen("q6k/8/8/8/8/8/8/R6K w - - 0 1");
    const result = search(state, { timeMs: 600, maxDepth: 6 });
    expect(moveToUci(result.move)).toBe("a1a8");
  });

  it("encuentra el mate en 1 y lo puntua como mate", () => {
    const state = createChessStateFromFen("6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1");
    const result = search(state, { timeMs: 800, maxDepth: 8 });
    expect(moveToUci(result.move)).toBe("a1a8");
    expect(result.score).toBeGreaterThan(900000);
  });

  it("alcanza una profundidad de club fuerte dentro del presupuesto", () => {
    const state = createChessStateFromFen(MIDGAME);
    const result = search(state, { timeMs: 1600, maxDepth: 64 });
    expect(result.depth).toBeGreaterThanOrEqual(5);
    expect(result.move).toBeTruthy();
  });

  it("la clave Zobrist es estable y distingue posiciones", () => {
    const a = createChessStateFromFen(START);
    const b = createChessStateFromFen(START);
    const c = createChessStateFromFen(MIDGAME);
    expect(zobristKey(a)).toBe(zobristKey(b));
    expect(zobristKey(a)).not.toBe(zobristKey(c));
  });

  it("la busqueda es determinista con tope de nodos", () => {
    const state = createChessStateFromFen(MIDGAME);
    const opts = { timeMs: 100000, maxNodes: 30000, maxDepth: 64 };
    const a = search(state, opts);
    const b = search(state, opts);
    expect(moveToUci(a.move)).toBe(moveToUci(b.move));
  });

  it("chooseAIMove devuelve una jugada legal", () => {
    const state = createChessStateFromFen(MIDGAME);
    const move = chooseAIMove(state, "expert", () => 0.99);
    expect(state.legalMoves.some((m) => m.from === move.from && m.to === move.to)).toBe(true);
  });
});

describe("libro de aperturas de ajedrez", () => {
  it("reconoce la posicion inicial y devuelve una jugada legal", () => {
    const state = createChessStateFromFen(START);
    expect(isInBook(state)).toBe(true);
    const move = getOpeningMove(state, () => 0.1);
    expect(move).toBeTruthy();
    expect(state.legalMoves.some((m) => m.from === move.from && m.to === move.to)).toBe(true);
  });

  it("es determinista con un rng fijo", () => {
    const state = createChessStateFromFen(START);
    const a = getOpeningMove(state, () => 0.42);
    const b = getOpeningMove(state, () => 0.42);
    expect(moveToUci(a)).toBe(moveToUci(b));
  });

  it("devuelve null fuera del libro", () => {
    const state = createChessStateFromFen("8/8/4k3/8/8/4K3/8/8 w - - 0 1");
    expect(getOpeningMove(state, () => 0.1)).toBeNull();
  });
});
