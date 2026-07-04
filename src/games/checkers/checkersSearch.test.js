import { describe, it, expect } from "vitest";
import { createInitialCheckersState, makeMove } from "./checkersEngine";
import { search, zobristKey } from "./checkersSearch";
import { chooseAIMove } from "./checkersAI";

const sameMove = (a, b) => a && b && a.from === b.from && a.to === b.to && (a.captureIndex ?? -1) === (b.captureIndex ?? -1);

describe("busqueda de damas", () => {
  it("desde la posicion inicial devuelve una jugada legal", () => {
    const state = createInitialCheckersState();
    const result = search(state, { timeMs: 500, maxDepth: 64 });
    expect(result.move).toBeTruthy();
    expect(state.legalMoves.some((m) => sameMove(m, result.move))).toBe(true);
  });

  it("alcanza buena profundidad dentro del presupuesto (arbol estrecho)", () => {
    const state = createInitialCheckersState();
    const result = search(state, { timeMs: 1600, maxDepth: 64 });
    expect(result.depth).toBeGreaterThanOrEqual(6);
  });

  it("la clave Zobrist es estable y distingue posiciones", () => {
    const a = createInitialCheckersState();
    const b = createInitialCheckersState();
    expect(zobristKey(a)).toBe(zobristKey(b));
    const moved = makeMove(a, a.legalMoves[0]);
    expect(zobristKey(moved)).not.toBe(zobristKey(a));
  });

  it("la busqueda es determinista con tope de nodos", () => {
    const state = createInitialCheckersState();
    const opts = { timeMs: 100000, maxNodes: 40000, maxDepth: 64 };
    const a = search(state, opts);
    const b = search(state, opts);
    expect(sameMove(a.move, b.move)).toBe(true);
  });

  it("chooseAIMove devuelve una jugada legal en nivel experto", () => {
    const state = createInitialCheckersState();
    const move = chooseAIMove(state, "expert", () => 0.99);
    expect(state.legalMoves.some((m) => sameMove(m, move))).toBe(true);
  });
});
