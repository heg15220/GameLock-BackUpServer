import {
  KNOWLEDGE_WORD_BANK_META,
  loadKnowledgeWordBankLocale,
} from "./knowledgeWordBank.generated";
import {
  KNOWLEDGE_ARCADE_MATCH_COUNT,
  createSeededRandom,
  shuffleWithRandom,
} from "./knowledgeArcadeUtils";

export const KNOWLEDGE_WORD_TARGET_COUNT = 10000;
export const KNOWLEDGE_WORD_MIN_LENGTH = 5;
export const KNOWLEDGE_WORD_MAX_LENGTH = 10;

const LOCALE_FALLBACK = "en";
const FEEDBACK_PRIORITY = {
  absent: 0,
  present: 1,
  correct: 2,
};

const LEXICON_CACHE = new Map();
const LEXICON_PROMISES = new Map();

const normalizeLocale = (locale) => (String(locale || "").toLowerCase().startsWith("es") ? "es" : LOCALE_FALLBACK);

const normalizeWord = (value) => (
  String(value || "")
    .normalize("NFD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase()
);

const buildIndexByLength = (entries) => {
  const byLength = new Map();
  entries.forEach((entry) => {
    const current = byLength.get(entry.length) || [];
    current.push(entry.word);
    byLength.set(entry.length, current);
  });

  return byLength;
};

const validateLocaleEntries = (locale, entries) => {
  const expectedCount = KNOWLEDGE_WORD_BANK_META.counts?.[locale] ?? KNOWLEDGE_WORD_TARGET_COUNT;
  if (KNOWLEDGE_ARCADE_MATCH_COUNT !== KNOWLEDGE_WORD_TARGET_COUNT) {
    throw new Error(
      `Knowledge match count (${KNOWLEDGE_ARCADE_MATCH_COUNT}) must equal lexicon target (${KNOWLEDGE_WORD_TARGET_COUNT}).`
    );
  }
  if (entries.length !== expectedCount || expectedCount !== KNOWLEDGE_WORD_TARGET_COUNT) {
    throw new Error(
      `Knowledge word bank must expose ${KNOWLEDGE_WORD_TARGET_COUNT} entries for ${locale}. Received ${entries.length}.`
    );
  }
  if (!entries.every((entry) => /^[A-Z]{5,10}$/.test(entry.word) && entry.clue.length > 0)) {
    throw new Error(`Knowledge word bank contains invalid ${locale} entries.`);
  }
};

const buildLexicon = (locale, entries) => {
  const lexicon = Object.freeze(
    entries.map((entry) => {
      const word = normalizeWord(entry?.word);
      return {
        word,
        length: word.length,
        clue: String(entry?.clue || "").trim(),
      };
    })
  );

  validateLocaleEntries(locale, lexicon);
  return Object.freeze({
    entries: lexicon,
    wordSet: new Set(lexicon.map((entry) => entry.word)),
    byLength: buildIndexByLength(lexicon),
  });
};

const loadLocaleLexicon = async (locale) => {
  const safeLocale = normalizeLocale(locale);
  if (LEXICON_CACHE.has(safeLocale)) {
    return LEXICON_CACHE.get(safeLocale);
  }
  if (!LEXICON_PROMISES.has(safeLocale)) {
    LEXICON_PROMISES.set(
      safeLocale,
      loadKnowledgeWordBankLocale(safeLocale).then((entries) => {
        const lexicon = buildLexicon(safeLocale, entries || []);
        LEXICON_CACHE.set(safeLocale, lexicon);
        return lexicon;
      })
    );
  }
  return LEXICON_PROMISES.get(safeLocale);
};

export const KNOWLEDGE_WORD_LEXICON_META = Object.freeze({
  counts: Object.freeze({
    es: KNOWLEDGE_WORD_BANK_META.counts?.es ?? KNOWLEDGE_WORD_TARGET_COUNT,
    en: KNOWLEDGE_WORD_BANK_META.counts?.en ?? KNOWLEDGE_WORD_TARGET_COUNT,
  }),
  overlapCount: KNOWLEDGE_WORD_BANK_META.overlapCount ?? 0,
  minLength: KNOWLEDGE_WORD_MIN_LENGTH,
  maxLength: KNOWLEDGE_WORD_MAX_LENGTH,
  source: KNOWLEDGE_WORD_BANK_META.source || "crosswordRepoStyleBank",
  targetCount: KNOWLEDGE_WORD_TARGET_COUNT,
});

export const loadKnowledgeWordLexicon = async (locale) => {
  const lexicon = await loadLocaleLexicon(locale);
  return lexicon?.entries ?? [];
};

export const getKnowledgeWordLexicon = loadKnowledgeWordLexicon;

export const getKnowledgeWordEntry = async (locale, matchId) => {
  const lexicon = await loadKnowledgeWordLexicon(locale);
  const safeIndex = ((Number(matchId) || 0) + KNOWLEDGE_WORD_TARGET_COUNT) % KNOWLEDGE_WORD_TARGET_COUNT;
  return lexicon[safeIndex];
};

export const getKnowledgeWordSet = async (locale) => {
  const lexicon = await loadLocaleLexicon(locale);
  return lexicon?.wordSet ?? new Set();
};

export const getKnowledgeWordsByLength = async (locale, length) => {
  const lexicon = await loadLocaleLexicon(locale);
  const size = Number(length) || 0;
  return lexicon?.byLength?.get(size) || [];
};

export const normalizeKnowledgeGuess = (value) => normalizeWord(value);

export const computeWordleFeedback = (guessValue, targetValue) => {
  const guess = normalizeWord(guessValue);
  const target = normalizeWord(targetValue);
  if (!guess || !target || guess.length !== target.length) {
    return [];
  }

  const feedback = new Array(guess.length).fill("absent");
  const remaining = {};

  for (let index = 0; index < guess.length; index += 1) {
    const letter = guess[index];
    if (letter === target[index]) {
      feedback[index] = "correct";
    } else {
      remaining[target[index]] = (remaining[target[index]] || 0) + 1;
    }
  }

  for (let index = 0; index < guess.length; index += 1) {
    if (feedback[index] === "correct") continue;
    const letter = guess[index];
    if ((remaining[letter] || 0) > 0) {
      feedback[index] = "present";
      remaining[letter] -= 1;
    }
  }

  return feedback;
};

export const mergeWordleKeyboardState = (previousState, guess, feedback) => {
  const next = {
    ...(previousState || {}),
  };

  const safeGuess = normalizeWord(guess);
  safeGuess.split("").forEach((letter, index) => {
    const nextState = feedback[index] || "absent";
    const currentState = next[letter] || "absent";
    if (FEEDBACK_PRIORITY[nextState] > FEEDBACK_PRIORITY[currentState]) {
      next[letter] = nextState;
    }
  });

  return next;
};

export const createDeterministicAnagram = (wordValue, seedValue) => {
  const word = normalizeWord(wordValue);
  if (word.length <= 1) {
    return word;
  }

  const random = createSeededRandom((Number(seedValue) || 0) + word.length * 4099 + 17);
  const letters = word.split("");

  let scrambled = shuffleWithRandom(letters, random).join("");
  if (scrambled === word) {
    const rotated = `${word.slice(1)}${word[0]}`;
    if (rotated !== word) {
      scrambled = rotated;
    }
  }

  return scrambled;
};

const toLetterHistogram = (value) => {
  const histogram = {};
  normalizeWord(value)
    .split("")
    .forEach((letter) => {
      histogram[letter] = (histogram[letter] || 0) + 1;
    });
  return histogram;
};

export const hasSameLetters = (leftValue, rightValue) => {
  const left = normalizeWord(leftValue);
  const right = normalizeWord(rightValue);
  if (!left || !right || left.length !== right.length) {
    return false;
  }

  const leftHistogram = toLetterHistogram(left);
  const rightHistogram = toLetterHistogram(right);

  const leftKeys = Object.keys(leftHistogram);
  const rightKeys = Object.keys(rightHistogram);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((letter) => leftHistogram[letter] === rightHistogram[letter]);
};

export default loadKnowledgeWordLexicon;
