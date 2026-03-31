import { CROSSWORD_TERM_BANK } from "./crosswordTermBank";
import {
  KNOWLEDGE_ARCADE_MATCH_COUNT,
  createSeededRandom,
  shuffleWithRandom
} from "./knowledgeArcadeUtils";

export const KNOWLEDGE_WORD_TARGET_COUNT = 10000;
export const KNOWLEDGE_WORD_MIN_LENGTH = 5;
export const KNOWLEDGE_WORD_MAX_LENGTH = 10;

const LOCALE_FALLBACK = "en";
const FEEDBACK_PRIORITY = {
  absent: 0,
  present: 1,
  correct: 2
};

const normalizeLocale = (locale) => (locale === "es" ? "es" : LOCALE_FALLBACK);

const normalizeWord = (value) => (
  String(value || "")
    .normalize("NFD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase()
);

const normalizeClue = (value) => String(value || "").trim();

const compareLexiconEntries = (left, right) => {
  if (left.length !== right.length) {
    return left.length - right.length;
  }
  return left.word.localeCompare(right.word);
};

const buildLocaleLexicon = (locale, { forbiddenWords = null } = {}) => {
  const safeLocale = normalizeLocale(locale);
  const buckets = CROSSWORD_TERM_BANK[safeLocale] || {};
  const byWord = new Map();
  const lengths = Object.keys(buckets)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value))
    .sort((left, right) => left - right);

  lengths.forEach((lengthKey) => {
    const entries = buckets[lengthKey] || [];
    entries.forEach((entry) => {
      const word = normalizeWord(entry?.word);
      if (!/^[A-Z]{5,10}$/.test(word)) {
        return;
      }
      if (forbiddenWords?.has(word)) {
        return;
      }
      const clue = normalizeClue(entry?.clue);
      if (!clue) {
        return;
      }
      if (!byWord.has(word)) {
        byWord.set(word, {
          word,
          length: word.length,
          clue
        });
      }
    });
  });

  const ordered = [...byWord.values()].sort(compareLexiconEntries);
  if (ordered.length < KNOWLEDGE_WORD_TARGET_COUNT) {
    throw new Error(
      `Lexicon ${safeLocale} has ${ordered.length} words and cannot satisfy ${KNOWLEDGE_WORD_TARGET_COUNT}.`
    );
  }

  return Object.freeze(ordered.slice(0, KNOWLEDGE_WORD_TARGET_COUNT));
};

const buildIndexByLength = (entries) => {
  const byLength = new Map();
  entries.forEach((entry) => {
    const current = byLength.get(entry.length) || [];
    current.push(entry.word);
    byLength.set(entry.length, current);
  });

  return byLength;
};

const createLexicon = () => {
  const es = buildLocaleLexicon("es");
  const esWordSet = new Set(es.map((entry) => entry.word));
  const en = buildLocaleLexicon("en", { forbiddenWords: esWordSet });
  const overlapCount = en.reduce(
    (count, entry) => (esWordSet.has(entry.word) ? count + 1 : count),
    0
  );

  if (KNOWLEDGE_ARCADE_MATCH_COUNT !== KNOWLEDGE_WORD_TARGET_COUNT) {
    throw new Error(
      `Knowledge match count (${KNOWLEDGE_ARCADE_MATCH_COUNT}) must equal lexicon target (${KNOWLEDGE_WORD_TARGET_COUNT}).`
    );
  }
  if (overlapCount > 0) {
    throw new Error(`Knowledge lexicon overlap must be 0 and received ${overlapCount}.`);
  }

  return Object.freeze({
    es,
    en
  });
};

const KNOWLEDGE_WORD_LEXICON = createLexicon();

const WORD_SET_BY_LOCALE = Object.freeze({
  es: new Set(KNOWLEDGE_WORD_LEXICON.es.map((entry) => entry.word)),
  en: new Set(KNOWLEDGE_WORD_LEXICON.en.map((entry) => entry.word))
});

const WORD_SET_BY_LENGTH = Object.freeze({
  es: buildIndexByLength(KNOWLEDGE_WORD_LEXICON.es),
  en: buildIndexByLength(KNOWLEDGE_WORD_LEXICON.en)
});

const CROSS_LOCALE_OVERLAP_COUNT = [...WORD_SET_BY_LOCALE.es].reduce(
  (count, word) => count + (WORD_SET_BY_LOCALE.en.has(word) ? 1 : 0),
  0
);

export const KNOWLEDGE_WORD_LEXICON_META = Object.freeze({
  counts: Object.freeze({
    es: KNOWLEDGE_WORD_LEXICON.es.length,
    en: KNOWLEDGE_WORD_LEXICON.en.length
  }),
  overlapCount: CROSS_LOCALE_OVERLAP_COUNT,
  minLength: KNOWLEDGE_WORD_MIN_LENGTH,
  maxLength: KNOWLEDGE_WORD_MAX_LENGTH,
  source: "crosswordTermBank",
  targetCount: KNOWLEDGE_WORD_TARGET_COUNT
});

export const getKnowledgeWordLexicon = (locale) => {
  const safeLocale = normalizeLocale(locale);
  return KNOWLEDGE_WORD_LEXICON[safeLocale] || KNOWLEDGE_WORD_LEXICON[LOCALE_FALLBACK];
};

export const getKnowledgeWordEntry = (locale, matchId) => {
  const lexicon = getKnowledgeWordLexicon(locale);
  const safeIndex = ((Number(matchId) || 0) + KNOWLEDGE_WORD_TARGET_COUNT) % KNOWLEDGE_WORD_TARGET_COUNT;
  return lexicon[safeIndex];
};

export const getKnowledgeWordSet = (locale) => {
  const safeLocale = normalizeLocale(locale);
  return WORD_SET_BY_LOCALE[safeLocale] || WORD_SET_BY_LOCALE[LOCALE_FALLBACK];
};

export const getKnowledgeWordsByLength = (locale, length) => {
  const safeLocale = normalizeLocale(locale);
  const size = Number(length) || 0;
  const values = WORD_SET_BY_LENGTH[safeLocale]?.get(size) || [];
  return values;
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
    ...(previousState || {})
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

export default KNOWLEDGE_WORD_LEXICON;
