import { KNOWLEDGE_ARCADE_MATCH_COUNT } from "./knowledgeArcadeUtils";
import {
  HANGMAN_WORD_BANK_META,
  loadHangmanWordBankLocale,
} from "./hangmanWordBank.generated";

export const HANGMAN_REQUIRED_WORDS_PER_LOCALE = KNOWLEDGE_ARCADE_MATCH_COUNT;

const LOCALE_CACHE = new Map();
const LOCALE_PROMISES = new Map();

const normalizeLocale = (locale) => (String(locale || "").toLowerCase().startsWith("es") ? "es" : "en");

const countOverlap = (leftWords, rightWords) => {
  const left = leftWords instanceof Set ? leftWords : new Set(leftWords);
  const right = rightWords instanceof Set ? rightWords : new Set(rightWords);
  return [...left].reduce((count, word) => count + (right.has(word) ? 1 : 0), 0);
};

const validateLocaleEntries = (locale, entries) => {
  const expectedCount = HANGMAN_WORD_BANK_META.counts?.[locale] ?? HANGMAN_REQUIRED_WORDS_PER_LOCALE;
  if (entries.length !== expectedCount || expectedCount !== HANGMAN_REQUIRED_WORDS_PER_LOCALE) {
    throw new Error(
      `Hangman requires ${HANGMAN_REQUIRED_WORDS_PER_LOCALE} words per locale. Received ${locale}=${entries.length}.`
    );
  }
  if (!entries.every((entry) => /^[A-Z]{3,10}$/.test(entry.word) && String(entry.clue || "").trim().length > 0)) {
    throw new Error(`Hangman word bank contains invalid ${locale} entries.`);
  }
};

const loadLocalePool = async (locale) => {
  const safeLocale = normalizeLocale(locale);
  if (LOCALE_CACHE.has(safeLocale)) {
    return LOCALE_CACHE.get(safeLocale);
  }
  if (!LOCALE_PROMISES.has(safeLocale)) {
    LOCALE_PROMISES.set(
      safeLocale,
      loadHangmanWordBankLocale(safeLocale).then((entries) => {
        const localeEntries = Object.freeze(entries || []);
        validateLocaleEntries(safeLocale, localeEntries);
        LOCALE_CACHE.set(safeLocale, localeEntries);
        return localeEntries;
      })
    );
  }
  return LOCALE_PROMISES.get(safeLocale);
};

export const HANGMAN_WORD_POOL_META = Object.freeze({
  source: HANGMAN_WORD_BANK_META.source || "crosswordRepoStyleBank",
  requiredWordsPerLocale: HANGMAN_REQUIRED_WORDS_PER_LOCALE,
  counts: Object.freeze({
    es: HANGMAN_WORD_BANK_META.counts?.es ?? HANGMAN_REQUIRED_WORDS_PER_LOCALE,
    en: HANGMAN_WORD_BANK_META.counts?.en ?? HANGMAN_REQUIRED_WORDS_PER_LOCALE,
  }),
  overlapCount: HANGMAN_WORD_BANK_META.overlapCount ?? 0,
});

export const loadHangmanWordPool = loadLocalePool;

export const getHangmanEntry = async (matchId, locale) => {
  const safeLocale = normalizeLocale(locale);
  const safeMatchId = Math.abs(Number(matchId) || 0) % HANGMAN_REQUIRED_WORDS_PER_LOCALE;
  const entries = await loadLocalePool(safeLocale);
  const entry = entries[safeMatchId];
  const clue = String(entry?.clue || "").trim();
  if (!clue) {
    throw new Error(`Hangman entry ${safeLocale}:${safeMatchId} has no associated meaning.`);
  }

  return {
    word: entry.word,
    clue,
  };
};

export const validateHangmanLocaleOverlap = async () => {
  const [esEntries, enEntries] = await Promise.all([
    loadLocalePool("es"),
    loadLocalePool("en"),
  ]);
  return countOverlap(
    new Set(esEntries.map((entry) => entry.word)),
    new Set(enEntries.map((entry) => entry.word))
  );
};

export default loadHangmanWordPool;
