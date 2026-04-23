import { KNOWLEDGE_ARCADE_MATCH_COUNT } from "./knowledgeArcadeUtils";
import { HANGMAN_WORD_BANK } from "./hangmanWordBank.generated";

export const HANGMAN_REQUIRED_WORDS_PER_LOCALE = KNOWLEDGE_ARCADE_MATCH_COUNT;

const normalizeLocale = (locale) => (locale === "es" ? "es" : "en");

const countOverlap = (leftWords, rightWords) => {
  const left = leftWords instanceof Set ? leftWords : new Set(leftWords);
  const right = rightWords instanceof Set ? rightWords : new Set(rightWords);
  return [...left].reduce((count, word) => count + (right.has(word) ? 1 : 0), 0);
};

const createHangmanWordPool = () => {
  const esEntries = Object.freeze(HANGMAN_WORD_BANK.es || []);
  const esWords = new Set(esEntries.map((entry) => entry.word));
  const enEntries = Object.freeze(HANGMAN_WORD_BANK.en || []);
  const enWords = new Set(enEntries.map((entry) => entry.word));
  const overlapCount = countOverlap(esWords, enWords);

  const esCount = esEntries.length;
  const enCount = enEntries.length;

  if (esCount !== HANGMAN_REQUIRED_WORDS_PER_LOCALE || enCount !== HANGMAN_REQUIRED_WORDS_PER_LOCALE) {
    throw new Error(
      `Hangman requires ${HANGMAN_REQUIRED_WORDS_PER_LOCALE} words per locale. Received es=${esCount}, en=${enCount}.`
    );
  }
  if (overlapCount !== 0) {
    throw new Error(`Hangman requires disjoint locale banks and received overlap=${overlapCount}.`);
  }
  if (![...esEntries, ...enEntries].every((entry) => /^[A-Z]{3,10}$/.test(entry.word) && String(entry.clue || "").trim().length > 0)) {
    throw new Error("Hangman word bank contains invalid entries.");
  }

  return Object.freeze({
    es: Object.freeze(esEntries),
    en: Object.freeze(enEntries),
    overlapCount
  });
};

const HANGMAN_WORD_POOL = createHangmanWordPool();

export const HANGMAN_WORD_POOL_META = Object.freeze({
  source: HANGMAN_WORD_BANK.meta?.source || "crosswordRepoStyleBank",
  requiredWordsPerLocale: HANGMAN_REQUIRED_WORDS_PER_LOCALE,
  counts: Object.freeze({
    es: HANGMAN_WORD_POOL.es.length,
    en: HANGMAN_WORD_POOL.en.length
  }),
  overlapCount: HANGMAN_WORD_POOL.overlapCount
});

export const getHangmanEntry = (matchId, locale) => {
  const safeLocale = normalizeLocale(locale);
  const safeMatchId = Math.abs(Number(matchId) || 0) % HANGMAN_REQUIRED_WORDS_PER_LOCALE;
  const entry = HANGMAN_WORD_POOL[safeLocale][safeMatchId];
  const clue = String(entry?.clue || "").trim();
  if (!clue) {
    throw new Error(`Hangman entry ${safeLocale}:${safeMatchId} has no associated meaning.`);
  }

  return {
    word: entry.word,
    clue
  };
};
