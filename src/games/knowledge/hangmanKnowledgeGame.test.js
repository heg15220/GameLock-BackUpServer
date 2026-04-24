import { describe, expect, it } from "vitest";
import {
  HANGMAN_WORD_POOL_META,
  getHangmanEntry,
  validateHangmanLocaleOverlap,
} from "./hangmanWordBank";
import { KNOWLEDGE_ARCADE_MATCH_COUNT } from "./knowledgeArcadeUtils";

describe("HangmanKnowledgeGame lexicon", () => {
  it("expone 10.000 palabras unicas por idioma para generar partidas", async () => {
    expect(HANGMAN_WORD_POOL_META.source).toBe("crosswordRepoStyleBank");
    expect(HANGMAN_WORD_POOL_META.overlapCount).toBe(0);

    for (const locale of ["es", "en"]) {
      const seenWords = new Set();

      for (let matchId = 0; matchId < KNOWLEDGE_ARCADE_MATCH_COUNT; matchId += 1) {
        const entry = await getHangmanEntry(matchId, locale);
        expect(entry.word).toMatch(/^[A-Z]{3,10}$/);
        expect(typeof entry.clue).toBe("string");
        expect(entry.clue.length).toBeGreaterThan(0);
        seenWords.add(entry.word);
      }

      expect(seenWords.size).toBe(KNOWLEDGE_ARCADE_MATCH_COUNT);
    }
  });

  it("mantiene bancos es/en sin solapes", async () => {
    const overlap = await validateHangmanLocaleOverlap();
    expect(overlap).toBe(0);
  });
});
