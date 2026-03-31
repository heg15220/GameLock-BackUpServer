import { describe, expect, it } from "vitest";
import { KNOWLEDGE_ARCADE_MATCH_COUNT } from "./knowledgeArcadeUtils";
import { getKnowledgeWordSet } from "./knowledgeWordLexicon";
import {
  WORD_SEARCH_DIRECTIONS,
  WORD_SEARCH_META,
  buildWordSearchPath,
  buildWordSearchPathKey,
  createWordSearchMatch
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

  it("genera las 10.000 partidas validas por idioma", () => {
    ["es", "en"].forEach((locale) => {
      const seenPuzzleKeys = new Set();
      let minWordsObserved = Infinity;
      const lexiconSet = getKnowledgeWordSet(locale);

      for (let matchId = 0; matchId < KNOWLEDGE_ARCADE_MATCH_COUNT; matchId += 1) {
        const match = createWordSearchMatch(matchId, locale);
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
    });
  });
});
