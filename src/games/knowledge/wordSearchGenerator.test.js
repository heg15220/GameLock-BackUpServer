import { describe, expect, it } from "vitest";
import { KNOWLEDGE_ARCADE_MATCH_COUNT } from "./knowledgeArcadeUtils";
import { getKnowledgeWordSet } from "./knowledgeWordLexicon";
import {
  WORD_SEARCH_DIRECTIONS,
  WORD_SEARCH_META,
  buildWordSearchPath,
  buildWordSearchPathKey,
  createWordSearchMatch,
  resolveWordSearchDragSelection
} from "./wordSearchGenerator";

const assertWordPlacement = (match, placement) => {
  expect(placement.word).toMatch(/^[A-Z]{4,20}$/);
  expect(placement.cells.length).toBe(placement.word.length);
  expect(placement.pathKey).toBe(buildWordSearchPathKey(placement.cells));

  const start = placement.cells[0];
  const end = placement.cells[placement.cells.length - 1];
  const rebuiltPath = buildWordSearchPath(start, end);
  expect(rebuiltPath).toEqual(placement.cells);

  const deltaRow = end.row - start.row;
  const deltaCol = end.col - start.col;
  const absRow = Math.abs(deltaRow);
  const absCol = Math.abs(deltaCol);
  expect(absRow === 0 || absCol === 0 || absRow === absCol).toBe(true);

  placement.cells.forEach((cell, index) => {
    expect(cell.row).toBeGreaterThanOrEqual(0);
    expect(cell.col).toBeGreaterThanOrEqual(0);
    expect(cell.row).toBeLessThan(match.boardSize);
    expect(cell.col).toBeLessThan(match.boardSize);
    expect(match.board[cell.row][cell.col]).toBe(placement.word[index]);
  });
};

describe("wordSearchGenerator", () => {
  it("mantiene 10.000 partidas y banco bilingue de 10k por idioma", () => {
    expect(KNOWLEDGE_ARCADE_MATCH_COUNT).toBe(10000);
    expect(WORD_SEARCH_META.requiredWordsPerLocale).toBe(10000);
    expect(WORD_SEARCH_META.bankCounts.es).toBe(10000);
    expect(WORD_SEARCH_META.bankCounts.en).toBe(10000);
    expect(WORD_SEARCH_META.uniqueBankCounts.es).toBe(10000);
    expect(WORD_SEARCH_META.uniqueBankCounts.en).toBe(10000);
    expect(WORD_SEARCH_META.overlapCount).toBe(0);
    expect(WORD_SEARCH_META.boardSize).toBeGreaterThanOrEqual(20);
    expect(WORD_SEARCH_META.wordsPerMatch).toBeGreaterThanOrEqual(12);
  });

  it("define direcciones horizontal normal/reversa, vertical y diagonal", () => {
    const labels = new Set(WORD_SEARCH_DIRECTIONS.map((direction) => direction.label));
    const groups = new Set(WORD_SEARCH_DIRECTIONS.map((direction) => direction.group));

    expect(labels.has("horizontal-forward")).toBe(true);
    expect(labels.has("horizontal-reverse")).toBe(true);
    expect(groups).toEqual(new Set(["horizontal", "vertical", "diagonal"]));
  });

  describe("resolveWordSearchDragSelection", () => {
    it("extiende desde el ancla cuando no hay celda candidata (modo inicio-fin)", () => {
      const selectionStart = { row: 2, col: 2 };
      const result = resolveWordSearchDragSelection(selectionStart, { row: 2, col: 5 }, null);
      expect(result.start).toEqual({ row: 2, col: 2 });
      expect(result.previewPath).toEqual([
        { row: 2, col: 2 },
        { row: 2, col: 3 },
        { row: 2, col: 4 },
        { row: 2, col: 5 }
      ]);
    });

    it("re-ancla al pulsar en otra zona y arrastrar hacia una celda distinta", () => {
      // Ancla vieja lejana (letra pulsada antes) en (2,2); el nuevo arrastre empieza en (10,4)
      const oldAnchor = { row: 2, col: 2 };
      const pressedCell = { row: 10, col: 4 };
      const draggedTo = { row: 10, col: 7 };
      const result = resolveWordSearchDragSelection(oldAnchor, draggedTo, pressedCell);
      // El origen debe ser la celda pulsada, no el ancla vieja
      expect(result.start).toEqual({ row: 10, col: 4 });
      expect(result.previewPath).toEqual([
        { row: 10, col: 4 },
        { row: 10, col: 5 },
        { row: 10, col: 6 },
        { row: 10, col: 7 }
      ]);
    });

    it("mantiene el ancla vieja mientras el puntero sigue sobre la celda pulsada", () => {
      const oldAnchor = { row: 2, col: 2 };
      const pressedCell = { row: 2, col: 5 };
      // El puntero todavia esta sobre la celda pulsada (posible tap de cierre inicio-fin)
      const result = resolveWordSearchDragSelection(oldAnchor, { row: 2, col: 5 }, pressedCell);
      expect(result.start).toEqual({ row: 2, col: 2 });
      expect(result.previewPath).toEqual([
        { row: 2, col: 2 },
        { row: 2, col: 3 },
        { row: 2, col: 4 },
        { row: 2, col: 5 }
      ]);
    });

    it("colapsa a la celda de origen cuando el trazo no es una linea recta", () => {
      const result = resolveWordSearchDragSelection({ row: 0, col: 0 }, { row: 3, col: 7 }, null);
      expect(result.previewPath).toEqual([{ row: 0, col: 0 }]);
    });
  });

  it("genera las 10.000 partidas validas por idioma", async () => {
    for (const locale of ["es", "en"]) {
      const seenPuzzleKeys = new Set();
      let minWordsObserved = Infinity;
      const lexiconSet = await getKnowledgeWordSet(locale);

      for (let matchId = 0; matchId < KNOWLEDGE_ARCADE_MATCH_COUNT; matchId += 1) {
        const match = await createWordSearchMatch(matchId, locale);
        seenPuzzleKeys.add(match.puzzleKey);
        minWordsObserved = Math.min(minWordsObserved, match.words.length);

        expect(match.board.length).toBe(match.boardSize);
        expect(match.board[0].length).toBe(match.boardSize);
        expect(match.words.length).toBeGreaterThanOrEqual(WORD_SEARCH_META.minWordsPerMatch);
        expect(match.words.length).toBeLessThanOrEqual(WORD_SEARCH_META.wordsPerMatch);

        match.words.forEach((placement) => {
          assertWordPlacement(match, placement);
          expect(lexiconSet.has(placement.word)).toBe(true);
        });
      }

      expect(seenPuzzleKeys.size).toBe(KNOWLEDGE_ARCADE_MATCH_COUNT);
      expect(minWordsObserved).toBeGreaterThanOrEqual(WORD_SEARCH_META.minWordsPerMatch);
    }
  }, 120000);
});
