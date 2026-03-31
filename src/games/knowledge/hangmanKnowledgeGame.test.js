import { describe, expect, it } from "vitest";
import {
  HANGMAN_WORD_POOL_META,
  getHangmanEntry
} from "./hangmanWordBank";
import { KNOWLEDGE_ARCADE_MATCH_COUNT } from "./knowledgeArcadeUtils";

describe("HangmanKnowledgeGame lexicon", () => {
  it("expone 10.000 palabras unicas por idioma para generar partidas", () => {
    expect(HANGMAN_WORD_POOL_META.source).toBe("crosswordRepoStyleBank");
    expect(HANGMAN_WORD_POOL_META.overlapCount).toBe(0);

    ["es", "en"].forEach((locale) => {
      const seenWords = new Set();

      for (let matchId = 0; matchId < KNOWLEDGE_ARCADE_MATCH_COUNT; matchId += 1) {
        const entry = getHangmanEntry(matchId, locale);
        expect(entry.word).toMatch(/^[A-Z]{3,10}$/);
        expect(typeof entry.clue).toBe("string");
        expect(entry.clue.length).toBeGreaterThan(0);
        seenWords.add(entry.word);
      }

      expect(seenWords.size).toBe(KNOWLEDGE_ARCADE_MATCH_COUNT);
    });
  });

  it("mantiene bancos es/en sin solapes", () => {
    const wordsEs = new Set();
    const wordsEn = new Set();

    for (let matchId = 0; matchId < KNOWLEDGE_ARCADE_MATCH_COUNT; matchId += 1) {
      wordsEs.add(getHangmanEntry(matchId, "es").word);
      wordsEn.add(getHangmanEntry(matchId, "en").word);
    }

    const overlap = [...wordsEs].reduce((count, word) => count + (wordsEn.has(word) ? 1 : 0), 0);
    expect(overlap).toBe(0);
  });
});
