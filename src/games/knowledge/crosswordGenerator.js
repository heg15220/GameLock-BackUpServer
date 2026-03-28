import {
  CROSSWORD_REPO_STYLE_BANK,
  CROSSWORD_REPO_STYLE_META
} from "./crosswordRepoStyleBank.generated";
import {
  CROSSWORD_MATCH_CACHE,
  CROSSWORD_MATCH_CACHE_META
} from "./crosswordMatchCache.generated";

const DEFAULT_CROSSWORD_MATCH_COUNT = 12000;

const CACHE_MATCH_COUNT = Number(
  CROSSWORD_MATCH_CACHE_META?.constraints?.matchCount
  ?? CROSSWORD_MATCH_CACHE_META?.matchCount
  ?? 0
);

const CACHE_INFERRED_COUNT = Math.max(
  Array.isArray(CROSSWORD_MATCH_CACHE?.es) ? CROSSWORD_MATCH_CACHE.es.length : 0,
  Array.isArray(CROSSWORD_MATCH_CACHE?.en) ? CROSSWORD_MATCH_CACHE.en.length : 0
);

export const CROSSWORD_MATCH_COUNT = (
  CACHE_MATCH_COUNT > 0
    ? CACHE_MATCH_COUNT
    : (CACHE_INFERRED_COUNT > 0 ? CACHE_INFERRED_COUNT : DEFAULT_CROSSWORD_MATCH_COUNT)
);

const CROSSWORD_MIN_WORD_LENGTH = 3;
const CROSSWORD_BOARD_ROWS = 15;
const CROSSWORD_BOARD_COLS = 15;

const FEEDBACK_PRIORITY = {
  correct: 1,
  wrong: 2
};

const STYLE_POOL = Object.freeze([
  "usage",
  "definition",
  "translation",
  "context",
  "classic",
  "semantic",
  "quick-hint",
  "cross-link"
]);

const DIFFICULTY_POOL = Object.freeze(["easy", "medium", "hard"]);

const normalizeLocaleKey = (locale) => (String(locale || "es").toLowerCase().startsWith("es")
  ? "es"
  : "en");

const localeHash = (locale) => (locale === "es" ? 0x9e3779b1 : 0x85ebca6b);

const normalizeMatchId = (value) => {
  const safe = Math.abs(Number(value) || 0);
  return safe % CROSSWORD_MATCH_COUNT;
};

const tokenizeAscii = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

const STOPWORDS_ES = new Set([
  "ante", "bajo", "cabe", "como", "con", "contra", "cual", "cuales", "cualquier", "de", "del",
  "desde", "donde", "el", "ella", "ellas", "ellos", "en", "entre", "era", "es", "esta", "este",
  "esto", "fue", "ha", "hasta", "la", "las", "lo", "los", "mas", "muy", "para", "pero", "por",
  "que", "se", "sin", "sobre", "son", "su", "sus", "un", "una", "uno", "y"
]);

const STOPWORDS_EN = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have", "in", "into",
  "is", "it", "its", "of", "on", "or", "that", "the", "their", "this", "to", "was", "with"
]);

const GENERIC_THEME_TOKENS = new Set([
  "accion", "effect", "efecto", "entry", "entrada", "forma", "general", "meaning", "palabra",
  "persona", "perteneciente", "relativo", "term", "termino", "thing", "uso"
]);

const extractMeaningTokens = (clue, locale) => {
  const stopwords = locale === "es" ? STOPWORDS_ES : STOPWORDS_EN;
  const tokens = tokenizeAscii(clue)
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4)
    .filter((token) => !stopwords.has(token))
    .filter((token) => !GENERIC_THEME_TOKENS.has(token));

  return [...new Set(tokens)].slice(0, 14);
};

const scoreClueQuality = (clue, locale) => {
  const safe = String(clue || "").trim();
  if (!safe) return -100;

  let score = Math.min(120, safe.length);
  const lower = tokenizeAscii(safe);
  if (safe.length < 20) score -= 15;
  if (safe.length > 170) score -= 20;
  if (/^(?:u|v|morf)\./i.test(lower)) score -= 45;
  if (/\bu\.\b/i.test(safe)) score -= 20;
  if (locale === "es" && /\bdesus\./i.test(safe)) score -= 25;
  if (safe.includes(":")) score -= 8;
  return score;
};

export const getRandomCrosswordMatchId = () =>
  Math.floor(Math.random() * CROSSWORD_MATCH_COUNT);

export const getRandomCrosswordMatchIdExcept = (matchId) => {
  if (CROSSWORD_MATCH_COUNT <= 1) return 0;
  const current = normalizeMatchId(matchId);
  const candidate = getRandomCrosswordMatchId();
  if (candidate !== current) return candidate;
  return (candidate + 1 + Math.floor(Math.random() * (CROSSWORD_MATCH_COUNT - 1)))
    % CROSSWORD_MATCH_COUNT;
};

const buildLocaleEntries = (entries = [], locale) => {
  const unique = new Map();
  entries.forEach((entry) => {
    const word = String(entry?.word || "").trim().toUpperCase();
    const clue = String(entry?.clue || "").trim();
    if (!/^[A-Z]{3,10}$/.test(word) || !clue) return;
    if (!unique.has(word)) {
      unique.set(word, {
        word,
        clue,
        tokens: extractMeaningTokens(clue, locale),
        clueQuality: scoreClueQuality(clue, locale)
      });
    }
  });

  const ordered = [...unique.values()].sort((left, right) => {
    if (left.word.length !== right.word.length) {
      return left.word.length - right.word.length;
    }
    return left.word.localeCompare(right.word);
  });

  const byLength = new Map();
  const byLetter = new Map();
  const byWord = new Map();
  const prefixByLength = new Map();
  ordered.forEach((entry) => {
    byWord.set(entry.word, entry);

    const currentByLength = byLength.get(entry.word.length) || [];
    currentByLength.push(entry);
    byLength.set(entry.word.length, currentByLength);

    const seen = new Set();
    entry.word.split("").forEach((letter) => {
      if (seen.has(letter)) return;
      seen.add(letter);
      const currentByLetter = byLetter.get(letter) || [];
      currentByLetter.push(entry);
      byLetter.set(letter, currentByLetter);
    });
  });

  [...byLength.entries()].forEach(([length, bucket]) => {
    const prefixMap = new Map();
    bucket.forEach((entry) => {
      for (let size = 0; size <= length; size += 1) {
        const prefix = entry.word.slice(0, size);
        const current = prefixMap.get(prefix) || [];
        current.push(entry);
        prefixMap.set(prefix, current);
      }
    });
    prefixByLength.set(length, prefixMap);
  });

  return {
    entries: ordered,
    byLength,
    byLetter,
    byWord,
    prefixByLength
  };
};

const CROSSWORD_LEXICON = Object.freeze({
  es: buildLocaleEntries(CROSSWORD_REPO_STYLE_BANK.es, "es"),
  en: buildLocaleEntries(CROSSWORD_REPO_STYLE_BANK.en, "en")
});

export const CROSSWORD_LEXICON_META = Object.freeze({
  source: CROSSWORD_REPO_STYLE_META?.source || {},
  generatedAt: CROSSWORD_REPO_STYLE_META?.generatedAt || null,
  counts: CROSSWORD_REPO_STYLE_META?.counts || {
    es: { total: CROSSWORD_LEXICON.es.entries.length },
    en: { total: CROSSWORD_LEXICON.en.entries.length }
  },
  matchCount: CROSSWORD_MATCH_COUNT
});

const listAvailableLengths = (localeLexicon) => (
  [...localeLexicon.byLength.keys()]
    .filter(
      (length) =>
        length >= CROSSWORD_MIN_WORD_LENGTH &&
        (localeLexicon.byLength.get(length)?.length || 0) > 0
    )
    .sort((left, right) => left - right)
);

const safeModulo = (value, base) => {
  if (!base) return 0;
  const safe = value % base;
  return safe < 0 ? safe + base : safe;
};

const mixSeed = (seed, salt) => (
  (Math.imul(seed ^ salt, 1664525) + 1013904223 + salt) >>> 0
);

const allIndicesForLetter = (word, letter) => {
  const indices = [];
  for (let index = 0; index < word.length; index += 1) {
    if (word[index] === letter) {
      indices.push(index);
    }
  }
  return indices;
};

const normalizeAscii = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ")
  .trim();

const escapeRegExp = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sanitizeClue = (clue, answer, locale) => {
  const fallback = locale === "es"
    ? "Pista contextual del termino."
    : "Context clue for the term.";
  const normalizedClue = normalizeAscii(clue);
  let safe = normalizedClue || fallback;
  const normalizedAnswer = normalizeAscii(answer).toLowerCase();

  if (normalizedAnswer.length >= 3) {
    const pattern = new RegExp(escapeRegExp(normalizedAnswer), "ig");
    safe = safe.replace(pattern, "____");
  }

  if (!/[a-z0-9]/i.test(safe)) {
    return fallback;
  }
  return safe;
};

const countTokenOverlap = (entryTokens, themeTokens) => {
  if (!entryTokens?.length || !themeTokens?.size) return 0;
  let score = 0;
  entryTokens.forEach((token) => {
    if (themeTokens.has(token)) score += 1;
  });
  return score;
};

const growThemeTokens = (themeTokens, entryTokens) => {
  if (!entryTokens?.length) return;
  entryTokens.forEach((token) => {
    if (themeTokens.size >= 12) return;
    themeTokens.add(token);
  });
};

const scoreAcrossCandidate = ({
  candidate,
  themeTokens,
  usedLengthFrequency,
  seed,
  index
}) => {
  const overlap = countTokenOverlap(candidate.tokens, themeTokens);
  const usedLengthCount = usedLengthFrequency.get(candidate.word.length) || 0;
  const randomBump = safeModulo(mixSeed(seed, index * 31 + candidate.word.length), 9);

  let score = candidate.clueQuality + randomBump;
  score += Math.min(4, overlap) * 18;
  score -= usedLengthCount * 4;
  if (themeTokens.size > 0 && overlap === 0) score -= 8;
  if (!candidate.tokens?.length) score -= 6;

  return score;
};

const selectVerticalEntry = ({ entries, seed }) => {
  if (!entries?.length) return null;

  const start = safeModulo(seed, entries.length);
  const windowSize = Math.min(entries.length, 320);
  let best = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let offset = 0; offset < windowSize; offset += 1) {
    const candidate = entries[(start + offset) % entries.length];
    const randomBump = safeModulo(mixSeed(seed, offset * 29 + candidate.word.length), 7);
    const score = candidate.clueQuality + Math.min(candidate.tokens?.length || 0, 6) * 9 + randomBump;
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best || entries[start];
};

const findBestAcrossCandidate = ({
  localeLexicon,
  letter,
  usedWords,
  usedLengthFrequency,
  themeTokens,
  seed
}) => {
  const source = localeLexicon.byLetter.get(letter) || [];
  const candidates = [];
  const reusedCandidates = [];
  const start = safeModulo(seed, source.length);

  if (!source.length) return null;

  for (let offset = 0; offset < source.length; offset += 1) {
    const candidate = source[(start + offset) % source.length];
    if (!usedWords.has(candidate.word)) {
      candidates.push(candidate);
    } else {
      reusedCandidates.push(candidate);
    }
  }

  const pool = candidates.length ? candidates : reusedCandidates;
  let best = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < pool.length; index += 1) {
    const candidate = pool[index];
    const score = scoreAcrossCandidate({
      candidate,
      themeTokens,
      usedLengthFrequency,
      seed,
      index
    });
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
};

const chooseStyle = (seed) => STYLE_POOL[safeModulo(seed, STYLE_POOL.length)];
const chooseDifficulty = (seed) => DIFFICULTY_POOL[safeModulo(seed, DIFFICULTY_POOL.length)];
const chooseQualityScore = (seed) => 56 + safeModulo(seed, 42);

const buildSolutionFromCachedRows = (rows) => {
  if (!Array.isArray(rows) || rows.length !== CROSSWORD_BOARD_ROWS) return null;

  const solution = rows.map((row) => {
    const safe = String(row || "");
    if (safe.length !== CROSSWORD_BOARD_COLS) return null;
    const letters = safe.split("");
    if (letters.some((cell) => cell !== "#" && !/[A-Z]/.test(cell))) return null;
    return letters;
  });

  if (solution.some((row) => !row)) return null;
  return solution;
};

const decodeCachedDirectionEntries = ({
  rawEntries,
  direction,
  solution,
  localeKey,
  seed
}) => {
  const entries = [];
  if (!Array.isArray(rawEntries)) return entries;

  const stepRow = direction === "down" ? 1 : 0;
  const stepCol = direction === "across" ? 1 : 0;

  for (let index = 0; index < rawEntries.length; index += 1) {
    const raw = rawEntries[index];
    if (!Array.isArray(raw) || raw.length < 4) continue;

    const row = Number(raw[0]);
    const col = Number(raw[1]);
    const word = String(raw[2] || "").trim().toUpperCase();
    const clue = sanitizeClue(String(raw[3] || ""), word, localeKey);
    const styleSeed = mixSeed(seed, index * 53 + word.length * 19);

    if (!Number.isInteger(row) || !Number.isInteger(col)) continue;
    if (!/^[A-Z]{3,10}$/.test(word)) continue;
    if (row < 0 || col < 0 || row >= CROSSWORD_BOARD_ROWS || col >= CROSSWORD_BOARD_COLS) continue;

    let valid = true;
    for (let letterIndex = 0; letterIndex < word.length; letterIndex += 1) {
      const letterRow = row + stepRow * letterIndex;
      const letterCol = col + stepCol * letterIndex;
      if (letterRow < 0 || letterCol < 0 || letterRow >= CROSSWORD_BOARD_ROWS || letterCol >= CROSSWORD_BOARD_COLS) {
        valid = false;
        break;
      }
      if (solution[letterRow][letterCol] !== word[letterIndex]) {
        valid = false;
        break;
      }
    }
    if (!valid) continue;

    const rawStyle = String(raw[4] || "").trim();
    const rawDifficulty = String(raw[5] || "").trim();
    const parsedQualityScore = Number(raw[6]);

    entries.push({
      start: { row, col },
      word,
      clue,
      style: STYLE_POOL.includes(rawStyle) ? rawStyle : chooseStyle(styleSeed),
      difficulty: DIFFICULTY_POOL.includes(rawDifficulty)
        ? rawDifficulty
        : chooseDifficulty(mixSeed(styleSeed, 0x41)),
      qualityScore: Number.isFinite(parsedQualityScore)
        ? parsedQualityScore
        : chooseQualityScore(mixSeed(styleSeed, 0x97))
    });
  }

  return entries;
};

const buildMatchSkeletonFromCache = (matchId, locale) => {
  const localeKey = normalizeLocaleKey(locale);
  const cacheByLocale = CROSSWORD_MATCH_CACHE?.[localeKey];
  if (!Array.isArray(cacheByLocale) || cacheByLocale.length === 0) {
    return null;
  }

  const safeMatchId = normalizeMatchId(matchId);
  const rawEntry = cacheByLocale[safeMatchId % cacheByLocale.length];
  if (!rawEntry || typeof rawEntry !== "object") return null;

  const solution = buildSolutionFromCachedRows(rawEntry.s);
  if (!solution) return null;

  const seed = mixSeed(safeMatchId ^ localeHash(localeKey), 0x27d4eb2f);
  const acrossMatches = decodeCachedDirectionEntries({
    rawEntries: rawEntry.a,
    direction: "across",
    solution,
    localeKey,
    seed
  });
  const downMatches = decodeCachedDirectionEntries({
    rawEntries: rawEntry.d,
    direction: "down",
    solution,
    localeKey,
    seed: mixSeed(seed, 0x51)
  });

  if (!acrossMatches.length || !downMatches.length) {
    return null;
  }

  return {
    localeKey,
    matchId: safeMatchId,
    solution,
    acrossMatches,
    downMatches
  };
};

const scoreRectangleCandidate = ({ entry, themeTokens, seed, index }) => {
  const overlap = countTokenOverlap(entry.tokens, themeTokens);
  const randomBump = safeModulo(mixSeed(seed, index * 17 + entry.word.length), 11);
  return entry.clueQuality + overlap * 14 + randomBump;
};

const buildDimensionCandidates = (availableLengths, seed) => (
  availableLengths
    .flatMap((rowCount, rowIndex) => availableLengths.map((colCount, colIndex) => ({
      rowCount,
      colCount,
      rowIndex,
      colIndex
    })))
    .filter(({ rowCount, colCount }) => Math.abs(rowCount - colCount) <= 2)
    .map(({ rowCount, colCount, rowIndex, colIndex }) => {
      const area = rowCount * colCount;
      const randomBump = safeModulo(
        mixSeed(seed, rowCount * 149 + colCount * 113 + rowIndex * 17 + colIndex * 19),
        13
      );
      const score = area * 8 - Math.abs(rowCount - colCount) * 9 + randomBump;
      return { rowCount, colCount, score };
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.rowCount !== left.rowCount) return right.rowCount - left.rowCount;
      return right.colCount - left.colCount;
    })
);

const canExtendWordRectangle = ({ localeLexicon, rowCount, rows, candidate }) => {
  const prefixMap = localeLexicon.prefixByLength.get(rowCount);
  if (!prefixMap) return false;

  for (let col = 0; col < candidate.word.length; col += 1) {
    let prefix = "";
    for (let row = 0; row < rows.length; row += 1) {
      prefix += rows[row].word[col];
    }
    prefix += candidate.word[col];
    if (!prefixMap.has(prefix)) {
      return false;
    }
  }
  return true;
};

const deriveDownWords = (rows, colCount) => (
  Array.from({ length: colCount }, (_, col) => rows.map((entry) => entry.word[col]).join(""))
);

const buildWordRectangleRecursive = ({
  localeLexicon,
  rowCount,
  colCount,
  rows,
  usedWords,
  themeTokens,
  seed
}) => {
  if (rows.length === rowCount) {
    return rows;
  }

  const entries = localeLexicon.byLength.get(colCount) || [];
  if (!entries.length) return null;

  const start = safeModulo(mixSeed(seed, rows.length * 97 + colCount * 41), entries.length);
  const windowSize = Math.min(entries.length, 560);
  const options = [];

  for (let offset = 0; offset < windowSize; offset += 1) {
    const candidate = entries[(start + offset) % entries.length];
    if (usedWords.has(candidate.word)) continue;
    if (!canExtendWordRectangle({ localeLexicon, rowCount, rows, candidate })) continue;
    options.push(candidate);
    if (options.length >= 260) break;
  }

  if (!options.length) return null;

  const ranked = options
    .map((candidate, index) => ({
      candidate,
      score: scoreRectangleCandidate({ entry: candidate, themeTokens, seed, index })
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.candidate.word.localeCompare(right.candidate.word);
    })
    .slice(0, 90);

  for (let index = 0; index < ranked.length; index += 1) {
    const candidate = ranked[index].candidate;

    const nextTheme = new Set(themeTokens);
    growThemeTokens(nextTheme, candidate.tokens);

    const nextRows = [...rows, candidate];
    const nextUsedWords = new Set(usedWords);
    nextUsedWords.add(candidate.word);
    const result = buildWordRectangleRecursive({
      localeLexicon,
      rowCount,
      colCount,
      rows: nextRows,
      usedWords: nextUsedWords,
      themeTokens: nextTheme,
      seed: mixSeed(seed, index + 29)
    });

    if (result) return result;
  }

  return null;
};

const tryBuildWordRectangle = ({
  localeLexicon,
  rowCount,
  colCount,
  seed,
  enforceDirectionDiversity = true,
  allowRepeatedDownWords = false
}) => {
  const rowEntries = localeLexicon.byLength.get(colCount) || [];
  const downEntries = localeLexicon.byLength.get(rowCount) || [];
  if (rowEntries.length < rowCount * 8) return null;
  if (downEntries.length < colCount * 8) return null;

  const start = safeModulo(seed, rowEntries.length);
  const maxAttempts = Math.min(rowEntries.length, 80);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const first = rowEntries[(start + attempt * 41) % rowEntries.length];
    if (!canExtendWordRectangle({ localeLexicon, rowCount, rows: [], candidate: first })) {
      continue;
    }
    const themeTokens = new Set((first.tokens || []).slice(0, 8));
    const rows = buildWordRectangleRecursive({
      localeLexicon,
      rowCount,
      colCount,
      rows: [first],
      usedWords: new Set([first.word]),
      themeTokens,
      seed: mixSeed(seed, attempt + 17)
    });
    if (!rows) continue;

    const downWords = deriveDownWords(rows, colCount);
    const rowWords = rows.map((entry) => entry.word);
    if (!allowRepeatedDownWords && new Set(downWords).size !== downWords.length) continue;
    if (!downWords.every((word) => localeLexicon.byWord.has(word))) continue;
    if (new Set(rowWords).size !== rowWords.length) continue;

    if (rowCount === colCount) {
      const overlapCount = rowWords.filter((word) => downWords.includes(word)).length;
      const sameIndexCount = downWords.reduce(
        (total, word, index) => total + (word === rowWords[index] ? 1 : 0),
        0
      );
      if (enforceDirectionDiversity) {
        if (overlapCount > Math.floor(rowCount / 2)) continue;
        if (sameIndexCount > Math.floor(rowCount / 3)) continue;
      } else {
        if (overlapCount >= rowCount) continue;
        if (sameIndexCount >= rowCount) continue;
      }
    }

    return { rows, downWords };
  }

  return null;
};

const buildClassicWordSquareRecursive = ({
  localeLexicon,
  length,
  rows,
  usedWords,
  themeTokens,
  seed
}) => {
  if (rows.length === length) {
    return rows;
  }

  const nextRowIndex = rows.length;
  let requiredPrefix = "";
  for (let row = 0; row < nextRowIndex; row += 1) {
    requiredPrefix += rows[row].word[nextRowIndex];
  }

  const candidates = localeLexicon.prefixByLength.get(length)?.get(requiredPrefix) || [];
  if (!candidates.length) return null;

  const ranked = candidates
    .filter((candidate) => !usedWords.has(candidate.word))
    .map((candidate, index) => ({
      candidate,
      score: scoreRectangleCandidate({ entry: candidate, themeTokens, seed, index })
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.candidate.word.localeCompare(right.candidate.word);
    })
    .slice(0, 120);

  for (let index = 0; index < ranked.length; index += 1) {
    const candidate = ranked[index].candidate;
    const nextTheme = new Set(themeTokens);
    growThemeTokens(nextTheme, candidate.tokens);

    const nextRows = [...rows, candidate];
    const nextUsedWords = new Set(usedWords);
    nextUsedWords.add(candidate.word);

    const result = buildClassicWordSquareRecursive({
      localeLexicon,
      length,
      rows: nextRows,
      usedWords: nextUsedWords,
      themeTokens: nextTheme,
      seed: mixSeed(seed, index + 1)
    });

    if (result) return result;
  }

  return null;
};

const tryBuildClassicWordSquare = ({ localeLexicon, length, seed }) => {
  const entries = localeLexicon.byLength.get(length) || [];
  if (entries.length < length * 4) return null;

  const start = safeModulo(seed, entries.length);
  const maxAttempts = Math.min(entries.length, 70);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const first = entries[(start + attempt * 37) % entries.length];
    const themeTokens = new Set((first.tokens || []).slice(0, 8));
    const rows = buildClassicWordSquareRecursive({
      localeLexicon,
      length,
      rows: [first],
      usedWords: new Set([first.word]),
      themeTokens,
      seed: mixSeed(seed, attempt + 17)
    });
    if (rows) return rows;
  }

  return null;
};

const collectWordCells = (solution, start, direction) => {
  const cells = [];
  const stepRow = direction === "down" ? 1 : 0;
  const stepCol = direction === "across" ? 1 : 0;
  let row = start.row;
  let col = start.col;

  while (inBounds(solution, row, col) && !isBlocked(solution, row, col)) {
    cells.push({ row, col });
    row += stepRow;
    col += stepCol;
  }

  return cells;
};

const buildRectangleSolution = (rowEntries) => rowEntries.map((entry) => entry.word.split(""));

const embedSquareInBoard = (squareSolution, boardRows, boardCols) => {
  const squareRows = squareSolution.length;
  const squareCols = squareSolution[0]?.length ?? 0;

  if (!squareRows || !squareCols) {
    throw new Error("Cannot embed an empty crossword square.");
  }

  if (squareRows > boardRows || squareCols > boardCols) {
    throw new Error(
      `Crossword square ${squareRows}x${squareCols} does not fit in board ${boardRows}x${boardCols}.`
    );
  }

  const rowOffset = Math.floor((boardRows - squareRows) / 2);
  const colOffset = Math.floor((boardCols - squareCols) / 2);
  const board = Array.from({ length: boardRows }, () => Array.from({ length: boardCols }, () => "#"));

  for (let row = 0; row < squareRows; row += 1) {
    for (let col = 0; col < squareCols; col += 1) {
      board[rowOffset + row][colOffset + col] = squareSolution[row][col];
    }
  }

  return {
    solution: board,
    rowOffset,
    colOffset
  };
};

export const keyForCell = (row, col) => `${row}-${col}`;

export const inBounds = (solution, row, col) =>
  row >= 0 && row < solution.length && col >= 0 && col < solution[0].length;

export const isBlocked = (solution, row, col) => solution[row][col] === "#";

export const buildCellNumbers = (solution, clueStarts = []) => {
  const numberedStarts = new Map();

  if (Array.isArray(clueStarts) && clueStarts.length > 0) {
    clueStarts.forEach((entry) => {
      const start = entry?.start || entry;
      const row = Number(start?.row);
      const col = Number(start?.col);
      if (!Number.isInteger(row) || !Number.isInteger(col)) return;
      if (!inBounds(solution, row, col) || isBlocked(solution, row, col)) return;
      numberedStarts.set(keyForCell(row, col), { row, col });
    });

    const sortedStarts = [...numberedStarts.values()].sort((left, right) => {
      if (left.row !== right.row) return left.row - right.row;
      return left.col - right.col;
    });

    const map = {};
    sortedStarts.forEach((start, index) => {
      map[keyForCell(start.row, start.col)] = index + 1;
    });
    return map;
  }

  let number = 1;
  const map = {};
  for (let row = 0; row < solution.length; row += 1) {
    for (let col = 0; col < solution[row].length; col += 1) {
      if (isBlocked(solution, row, col)) continue;
      const startsAcross = col === 0 || isBlocked(solution, row, col - 1);
      const startsDown = row === 0 || isBlocked(solution, row - 1, col);
      if (startsAcross || startsDown) {
        map[keyForCell(row, col)] = number;
        number += 1;
      }
    }
  }
  return map;
};

const countPlayableCells = (solution) => {
  let total = 0;
  for (let row = 0; row < solution.length; row += 1) {
    for (let col = 0; col < solution[row].length; col += 1) {
      if (solution[row][col] !== "#") {
        total += 1;
      }
    }
  }
  return total;
};

const clueBody = (copy, direction, meta) => {
  const hintFactory = direction === "across" ? copy?.acrossHint : copy?.downHint;
  if (typeof hintFactory === "function") {
    const custom = hintFactory(meta);
    if (typeof custom === "string" && custom.trim()) {
      return custom;
    }
  }
  return meta.clue;
};

const resolveCopy = (copy = {}) => ({
  acrossClue: typeof copy.acrossClue === "function"
    ? copy.acrossClue
    : (id, text) => `${id}. ${text}`,
  downClue: typeof copy.downClue === "function"
    ? copy.downClue
    : (id, text) => `${id}. ${text}`,
  acrossHint: copy.acrossHint,
  downHint: copy.downHint
});

const makeClueBody = (body, locale) => {
  const base = String(body || "").trim();
  const fallback = locale === "es" ? "Pista contextual del termino." : "Context clue for the term.";
  return base || fallback;
};

const buildWordEntries = ({
  solution,
  cellNumbers,
  acrossMatches,
  downMatches,
  copy,
  locale
}) => {
  const acrossEntries = acrossMatches.map((match, index) => {
    const start = { ...match.start };
    const id = cellNumbers[keyForCell(start.row, start.col)] ?? index + 1;
    const rawBody = clueBody(copy, "across", {
      wordId: index,
      locale,
      direction: "across",
      word: match.word,
      clue: match.clue,
      style: match.style,
      difficulty: match.difficulty,
      qualityScore: match.qualityScore
    });
    const body = makeClueBody(rawBody, locale);

    return {
      key: `across-${id}-${index}`,
      id,
      start,
      cells: collectWordCells(solution, start, "across"),
      word: match.word,
      style: match.style,
      difficulty: match.difficulty,
      qualityScore: match.qualityScore,
      text: copy.acrossClue(id, body, start)
    };
  });

  const downEntries = downMatches.map((match, index) => {
    const start = { ...match.start };
    const id = cellNumbers[keyForCell(start.row, start.col)] ?? acrossEntries.length + index + 1;
    const rawBody = clueBody(copy, "down", {
      wordId: 100000 + index,
      locale,
      direction: "down",
      word: match.word,
      clue: match.clue,
      style: match.style,
      difficulty: match.difficulty,
      qualityScore: match.qualityScore
    });
    const body = makeClueBody(rawBody, locale);

    return {
      key: `down-${id}-${index}`,
      id,
      start,
      cells: collectWordCells(solution, start, "down"),
      word: match.word,
      style: match.style,
      difficulty: match.difficulty,
      qualityScore: match.qualityScore,
      text: copy.downClue(id, body, start)
    };
  });

  return { across: acrossEntries, down: downEntries };
};

const buildMatchSkeleton = (matchId, locale) => {
  const localeKey = normalizeLocaleKey(locale);
  const localeLexicon = CROSSWORD_LEXICON[localeKey] || CROSSWORD_LEXICON.en;
  const safeMatchId = normalizeMatchId(matchId);
  const availableLengths = listAvailableLengths(localeLexicon);

  if (!availableLengths.length) {
    throw new Error(
      `No crossword words available for locale=${localeKey}`
    );
  }

  let seed = safeMatchId ^ localeHash(localeKey);
  seed = mixSeed(seed, 0x27d4eb2f);
  const dimensionCandidates = buildDimensionCandidates(availableLengths, seed);
  let rectangle = null;
  let selectedDimensions = null;

  for (let pass = 0; pass < 3 && !rectangle; pass += 1) {
    const enforceDirectionDiversity = pass === 0;
    const allowRepeatedDownWords = pass === 2;
    for (let index = 0; index < dimensionCandidates.length; index += 1) {
      const dimensions = dimensionCandidates[index];
      rectangle = tryBuildWordRectangle({
        localeLexicon,
        rowCount: dimensions.rowCount,
        colCount: dimensions.colCount,
        seed: mixSeed(seed, dimensions.rowCount * 131 + dimensions.colCount * 89 + index * 17),
        enforceDirectionDiversity,
        allowRepeatedDownWords
      });
      if (rectangle) {
        selectedDimensions = dimensions;
        break;
      }
    }
  }

  if (!rectangle) {
    const fallbackLengths = [...availableLengths].sort((left, right) => right - left);
    for (let index = 0; index < fallbackLengths.length; index += 1) {
      const length = fallbackLengths[index];
      const fallbackRows = tryBuildClassicWordSquare({
        localeLexicon,
        length,
        seed: mixSeed(seed, length * 173 + index * 29)
      });
      if (!fallbackRows) continue;

      rectangle = {
        rows: fallbackRows,
        downWords: fallbackRows.map((entry) => entry.word)
      };
      selectedDimensions = { rowCount: length, colCount: length };
      break;
    }
  }

  if (!rectangle || !selectedDimensions) {
    throw new Error(`Failed to build a valid crossword board for locale=${localeKey}.`);
  }

  const rectangleRows = rectangle.rows;
  const downWords = rectangle.downWords;
  const rectangleSolution = buildRectangleSolution(rectangleRows);
  const {
    solution,
    rowOffset,
    colOffset
  } = embedSquareInBoard(rectangleSolution, CROSSWORD_BOARD_ROWS, CROSSWORD_BOARD_COLS);

  const acrossMatches = rectangleRows.map((entry, rowIndex) => {
    const styleSeed = mixSeed(seed, rowIndex * 43 + entry.word.length);
    return {
      start: { row: rowOffset + rowIndex, col: colOffset },
      word: entry.word,
      clue: sanitizeClue(entry.clue, entry.word, localeKey),
      style: chooseStyle(styleSeed),
      difficulty: chooseDifficulty(mixSeed(styleSeed, 0x41)),
      qualityScore: chooseQualityScore(mixSeed(styleSeed, 0x97))
    };
  });

  const downMatches = downWords.map((word, colIndex) => {
    const lexicalEntry = localeLexicon.byWord.get(word);
    const safeClue = sanitizeClue(
      lexicalEntry?.clue || (localeKey === "es"
        ? `Palabra vertical de ${word.length} letras.`
        : `Vertical word with ${word.length} letters.`),
      word,
      localeKey
    );
    const styleSeed = mixSeed(seed, colIndex * 59 + word.length);
    return {
      start: { row: rowOffset, col: colOffset + colIndex },
      word,
      clue: safeClue,
      style: chooseStyle(styleSeed),
      difficulty: chooseDifficulty(mixSeed(styleSeed, 0x53)),
      qualityScore: chooseQualityScore(mixSeed(styleSeed, 0xb1))
    };
  });

  return {
    localeKey,
    matchId: safeMatchId,
    solution,
    acrossMatches,
    downMatches
  };
};

export const createCrosswordMatch = (matchId, locale, copy, options = {}) => {
  const safeCopy = resolveCopy(copy);
  const preferCache = options?.preferCache !== false;
  const skeleton = (
    (preferCache ? buildMatchSkeletonFromCache(matchId, locale) : null)
    || buildMatchSkeleton(matchId, locale)
  );
  const cellNumbers = buildCellNumbers(
    skeleton.solution,
    [...skeleton.acrossMatches, ...skeleton.downMatches]
  );
  const clues = buildWordEntries({
    solution: skeleton.solution,
    cellNumbers,
    acrossMatches: skeleton.acrossMatches,
    downMatches: skeleton.downMatches,
    copy: safeCopy,
    locale: skeleton.localeKey
  });

  return {
    solution: skeleton.solution,
    cellNumbers,
    clues,
    grid: {
      rows: skeleton.solution.length,
      cols: skeleton.solution[0]?.length ?? 0,
      openCells: countPlayableCells(skeleton.solution)
    },
    puzzleKey: `repo-crossword-${skeleton.localeKey}-${skeleton.matchId}`
  };
};

export const createEntries = (solution) =>
  solution.map((row) => row.map((cell) => (cell === "#" ? "#" : "")));

export const findFirstCell = (solution) => {
  for (let row = 0; row < solution.length; row += 1) {
    for (let col = 0; col < solution[row].length; col += 1) {
      if (solution[row][col] !== "#") {
        return { row, col };
      }
    }
  }
  return { row: 0, col: 0 };
};

export const moveSelection = (solution, selected, deltaRow, deltaCol) => {
  let row = selected.row + deltaRow;
  let col = selected.col + deltaCol;

  while (inBounds(solution, row, col) && isBlocked(solution, row, col)) {
    row += deltaRow;
    col += deltaCol;
  }

  if (!inBounds(solution, row, col)) {
    return selected;
  }

  return { row, col };
};

export const nextCellInRow = (solution, selected, direction) => {
  let col = selected.col + direction;
  while (inBounds(solution, selected.row, col)) {
    if (!isBlocked(solution, selected.row, col)) {
      return { row: selected.row, col };
    }
    col += direction;
  }
  return selected;
};

export const isComplete = (entries) => {
  for (let row = 0; row < entries.length; row += 1) {
    for (let col = 0; col < entries[row].length; col += 1) {
      if (entries[row][col] === "#") continue;
      if (!entries[row][col]) return false;
    }
  }
  return true;
};

export const isSolved = (entries, solution) => {
  for (let row = 0; row < entries.length; row += 1) {
    for (let col = 0; col < entries[row].length; col += 1) {
      if (entries[row][col] === "#") continue;
      if (entries[row][col] !== solution[row][col]) return false;
    }
  }
  return true;
};

export const buildWordMaps = (clues) => {
  const wordByKey = {};
  const cellWordMap = {};
  ["across", "down"].forEach((direction) => {
    (clues[direction] || []).forEach((word) => {
      wordByKey[word.key] = word;
      word.cells.forEach((cell) => {
        const key = keyForCell(cell.row, cell.col);
        if (!cellWordMap[key]) {
          cellWordMap[key] = [];
        }
        cellWordMap[key].push(word.key);
      });
    });
  });
  return { wordByKey, cellWordMap };
};

export const getWordKeysForCell = (cellWordMap, row, col) =>
  cellWordMap[keyForCell(row, col)] || [];

const evaluateWordStatus = (entries, solution, cells) => {
  let hasEmpty = false;
  let hasWrong = false;

  cells.forEach((cell) => {
    const value = entries[cell.row][cell.col];
    if (!value) {
      hasEmpty = true;
      return;
    }
    if (value !== solution[cell.row][cell.col]) {
      hasWrong = true;
    }
  });

  if (hasEmpty) return "pending";
  return hasWrong ? "wrong" : "correct";
};

export const evaluateWordFeedback = ({ entries, solution, wordByKey, targetWordKeys }) => {
  const uniqueKeys = Array.from(new Set(targetWordKeys || []));
  const wordFeedback = {};
  const cellFeedback = {};
  const summary = { correct: 0, wrong: 0, pending: 0 };

  uniqueKeys.forEach((wordKey) => {
    const word = wordByKey[wordKey];
    if (!word) return;

    const status = evaluateWordStatus(entries, solution, word.cells);
    wordFeedback[wordKey] = status;
    summary[status] += 1;

    if (status === "pending") return;
    word.cells.forEach((cell) => {
      const key = keyForCell(cell.row, cell.col);
      const current = cellFeedback[key];
      if (!current || FEEDBACK_PRIORITY[status] > FEEDBACK_PRIORITY[current]) {
        cellFeedback[key] = status;
      }
    });
  });

  return { wordFeedback, cellFeedback, summary };
};
