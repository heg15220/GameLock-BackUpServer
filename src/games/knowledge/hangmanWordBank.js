import { KNOWLEDGE_ARCADE_MATCH_COUNT } from "./knowledgeArcadeUtils";
import { CROSSWORD_REPO_STYLE_BANK } from "./crosswordRepoStyleBank.generated";

export const HANGMAN_REQUIRED_WORDS_PER_LOCALE = KNOWLEDGE_ARCADE_MATCH_COUNT;

const normalizeLocale = (locale) => (locale === "es" ? "es" : "en");

const normalizeWord = (value) => String(value || "").trim().toUpperCase();

const isValidEntry = (word, clue) => (
  /^[A-Z]{3,10}$/.test(word) &&
  String(clue || "").trim().length > 0
);

const countOverlap = (leftWords, rightWords) => {
  const left = leftWords instanceof Set ? leftWords : new Set(leftWords);
  const right = rightWords instanceof Set ? rightWords : new Set(rightWords);
  return [...left].reduce((count, word) => count + (right.has(word) ? 1 : 0), 0);
};

const buildLocaleEntries = (locale, { forbiddenWords = null } = {}) => {
  const safeLocale = normalizeLocale(locale);
  const source = CROSSWORD_REPO_STYLE_BANK[safeLocale] || [];
  const byWord = new Map();

  source.forEach((entry) => {
    const word = normalizeWord(entry?.word);
    const clue = String(entry?.clue || "").trim();
    if (!isValidEntry(word, clue)) return;
    if (forbiddenWords?.has(word)) return;
    if (!byWord.has(word)) {
      byWord.set(word, {
        word,
        clue
      });
    }
  });

  return [...byWord.values()];
};

const createHangmanWordPool = () => {
  const esEntries = buildLocaleEntries("es").slice(0, HANGMAN_REQUIRED_WORDS_PER_LOCALE);
  const esWords = new Set(esEntries.map((entry) => entry.word));
  const enEntries = buildLocaleEntries("en", { forbiddenWords: esWords })
    .slice(0, HANGMAN_REQUIRED_WORDS_PER_LOCALE);
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

  return Object.freeze({
    es: Object.freeze(esEntries),
    en: Object.freeze(enEntries),
    overlapCount
  });
};

const HANGMAN_WORD_POOL = createHangmanWordPool();

export const HANGMAN_WORD_POOL_META = Object.freeze({
  source: "crosswordRepoStyleBank",
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
