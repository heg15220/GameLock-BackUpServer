import { describe, expect, it } from "vitest";
import { KNOWLEDGE_ARCADE_MATCH_COUNT } from "./knowledgeArcadeUtils";
import {
  KNOWLEDGE_WORD_LEXICON_META,
  createDeterministicAnagram,
  computeWordleFeedback,
  getKnowledgeWordEntry,
  getKnowledgeWordLexicon,
  getKnowledgeWordSet,
  hasSameLetters,
  mergeWordleKeyboardState,
  normalizeKnowledgeGuess
} from "./knowledgeWordLexicon";

describe("knowledgeWordLexicon", () => {
  it("expone 10k palabras por idioma alineadas al total de partidas", async () => {
    expect(KNOWLEDGE_ARCADE_MATCH_COUNT).toBe(10000);
    expect(KNOWLEDGE_WORD_LEXICON_META.counts.es).toBe(10000);
    expect(KNOWLEDGE_WORD_LEXICON_META.counts.en).toBe(10000);
    expect(KNOWLEDGE_WORD_LEXICON_META.overlapCount).toBe(0);
    expect(KNOWLEDGE_WORD_LEXICON_META.source).toBe("crosswordRepoStyleBank");

    for (const locale of ["es", "en"]) {
      const lexicon = await getKnowledgeWordLexicon(locale);
      expect(lexicon.length).toBe(10000);
      lexicon.forEach((entry) => {
        expect(entry.word).toMatch(/^[A-Z]{5,10}$/);
        expect(entry.length).toBe(entry.word.length);
        expect(typeof entry.clue).toBe("string");
        expect(entry.clue.length).toBeGreaterThan(0);
      });
    }
  });

  it("mantiene bancos es/en sin palabras repetidas entre idiomas", async () => {
    const [setEs, setEn] = await Promise.all([
      getKnowledgeWordSet("es"),
      getKnowledgeWordSet("en"),
    ]);
    const overlap = [...setEs].reduce((count, word) => count + (setEn.has(word) ? 1 : 0), 0);

    expect(overlap).toBe(0);
  });

  it("resuelve entrada por matchId de forma determinista", async () => {
    const first = await getKnowledgeWordEntry("es", 0);
    const wrapped = await getKnowledgeWordEntry("es", KNOWLEDGE_ARCADE_MATCH_COUNT);
    expect(first.word).toBe(wrapped.word);

    const offset = await getKnowledgeWordEntry("en", 137);
    const offsetAgain = await getKnowledgeWordEntry("en", 137);
    expect(offset.word).toBe(offsetAgain.word);

    const [setEs, setEn] = await Promise.all([
      getKnowledgeWordSet("es"),
      getKnowledgeWordSet("en"),
    ]);
    expect(setEs.has(first.word)).toBe(true);
    expect(setEn.has(offset.word)).toBe(true);
  });

  it("normaliza guess y calcula feedback tipo wordle con repetidas", () => {
    expect(normalizeKnowledgeGuess("acci\u00f3n")).toBe("ACCION");

    const feedback = computeWordleFeedback("ALALA", "CANAL");
    expect(feedback).toEqual(["present", "present", "present", "absent", "absent"]);

    const wrongLength = computeWordleFeedback("SOL", "SOLAR");
    expect(wrongLength).toEqual([]);
  });

  it("fusiona estado del teclado sin perder prioridad", () => {
    const next = mergeWordleKeyboardState({}, "CASA", ["present", "absent", "correct", "absent"]);
    expect(next.C).toBe("present");
    expect(next.S).toBe("correct");

    const updated = mergeWordleKeyboardState(next, "COCO", ["absent", "absent", "absent", "absent"]);
    expect(updated.C).toBe("present");
    expect(updated.S).toBe("correct");
  });

  it("genera anagramas deterministas y valida composicion de letras", () => {
    const source = "MANGO";
    const anagramA = createDeterministicAnagram(source, 44);
    const anagramB = createDeterministicAnagram(source, 44);
    expect(anagramA).toBe(anagramB);
    expect(hasSameLetters(anagramA, source)).toBe(true);

    const anagramC = createDeterministicAnagram(source, 45);
    expect(hasSameLetters(anagramC, source)).toBe(true);

    expect(hasSameLetters("ROMA", "AMOR")).toBe(true);
    expect(hasSameLetters("ROMA", "MORALES")).toBe(false);
  });
});
