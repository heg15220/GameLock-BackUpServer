import fs from "node:fs";
import path from "node:path";
import { once } from "node:events";
import {
  CROSSWORD_REPO_STYLE_META,
  loadCrosswordRepoStyleLocale
} from "../src/games/knowledge/crosswordRepoStyleBank.generated.js";

const OUTPUT_ROOT = path.join(
  process.cwd(),
  "src",
  "games",
  "knowledge"
);

const OUTPUT_FILE = path.join(OUTPUT_ROOT, "crosswordMatchCache.generated.js");
const OUTPUT_SHARD_DIR = path.join(OUTPUT_ROOT, "crosswordMatchCacheShards");

const MATCH_COUNT = 12000;
const SHARD_SIZE = 500;
const BOARD_ROWS = 15;
const BOARD_COLS = 15;
const MIN_WORD_LENGTH = 3;
const MAX_WORD_LENGTH = 10;
const WORD_RE = /^[A-Z]{3,10}$/;
const MIN_ACROSS_WORDS = 4;
const MIN_DOWN_WORDS = 4;
const TARGET_WORDS_MIN = 10;
const TARGET_WORDS_MAX = 16;
const MAX_BUILD_RETRIES = 10;
const MAX_PLACEMENT_PASSES = 220;
const CANDIDATE_SAMPLE_SIZE = 96;
const PLACEMENT_SEARCH_LIMIT = 48;
const PROGRESS_STEP = 250;

const LOCALES = Object.freeze(["es", "en"]);

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

const LENGTH_PROFILES = Object.freeze([
  [3, 5, 8, 10],
  [3, 6, 8, 9],
  [4, 5, 7, 10],
  [3, 4, 8, 10],
  [5, 6, 8, 10],
  [3, 5, 6, 9],
  [4, 6, 8, 10],
  [3, 5, 7, 9]
]);

const STOPWORDS_ES = new Set([
  "ante", "bajo", "cabe", "como", "con", "contra", "cual", "cuales", "de", "del",
  "desde", "donde", "el", "ella", "ellas", "ellos", "en", "entre", "era", "es",
  "esta", "este", "esto", "fue", "ha", "hasta", "la", "las", "lo", "los", "mas",
  "muy", "para", "pero", "por", "que", "se", "sin", "sobre", "son", "su", "sus",
  "un", "una", "uno", "y"
]);

const STOPWORDS_EN = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have", "in",
  "into", "is", "it", "its", "of", "on", "or", "that", "the", "their", "this", "to",
  "was", "with"
]);

const GENERIC_TOKENS = new Set([
  "accion", "effect", "efecto", "entry", "entrada", "forma", "general", "meaning",
  "palabra", "persona", "perteneciente", "relativo", "term", "termino", "thing", "uso"
]);

const normalizeAscii = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "");

const normalizeText = (value) => normalizeAscii(value)
  .replace(/\s+/g, " ")
  .trim();

const escapeRegExp = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const redactAnswer = (text, word) => {
  const safeText = normalizeText(text);
  const safeWord = String(word || "").toLowerCase();
  if (!safeText || !safeWord) return safeText;
  const pattern = new RegExp(`\\b${escapeRegExp(safeWord)}\\b`, "ig");
  return safeText.replace(pattern, "____");
};

const sanitizeEntryClue = (clue, word, locale) => {
  const fallback = locale === "es"
    ? "Definicion breve del termino."
    : "Short definition of the term.";
  const redacted = redactAnswer(clue, word);
  return redacted || fallback;
};

const tokenizeMeaning = (text, locale) => {
  const stopwords = locale === "es" ? STOPWORDS_ES : STOPWORDS_EN;
  return normalizeText(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4)
    .filter((token) => !stopwords.has(token))
    .filter((token) => !GENERIC_TOKENS.has(token));
};

const scoreClueQuality = (clue, locale) => {
  const safe = normalizeText(clue);
  if (!safe) return -100;

  let score = Math.min(120, safe.length);
  if (safe.length < 18) score -= 18;
  if (safe.length > 180) score -= 18;
  if (/^(?:u|v|morf)\./i.test(safe)) score -= 45;
  if (/\bu\.\b/i.test(safe)) score -= 20;
  if (locale === "es" && /\bdesus\./i.test(safe)) score -= 25;
  return score;
};

const hashText = (text) => {
  let hash = 2166136261 >>> 0;
  const safe = String(text || "");
  for (let index = 0; index < safe.length; index += 1) {
    hash ^= safe.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const mixSeed = (seed, salt) => (
  (Math.imul(seed ^ salt, 1664525) + 1013904223 + salt) >>> 0
);

const makeRng = (seed) => {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
};

const toPositiveIndex = (value, size) => {
  if (!size) return 0;
  const safe = value % size;
  return safe < 0 ? safe + size : safe;
};

const pickStyle = (seed) => STYLE_POOL[toPositiveIndex(seed, STYLE_POOL.length)];
const pickDifficulty = (seed) => DIFFICULTY_POOL[toPositiveIndex(seed, DIFFICULTY_POOL.length)];
const pickQuality = (seed) => 55 + toPositiveIndex(seed, 43);

const countOverlap = (entryTokens, themeTokens) => {
  if (!entryTokens?.length || !themeTokens?.size) return 0;
  let overlap = 0;
  entryTokens.forEach((token) => {
    if (themeTokens.has(token)) overlap += 1;
  });
  return overlap;
};

const buildLocaleContext = (locale, sourceEntries = []) => {
  const source = Array.isArray(sourceEntries)
    ? sourceEntries
    : [];

  const byWord = new Map();
  source.forEach((entry) => {
    const word = String(entry?.word || "").trim().toUpperCase();
    const clue = sanitizeEntryClue(entry?.clue || "", word, locale);
    if (!WORD_RE.test(word)) return;
    if (!clue || clue.length < 8) return;
    if (byWord.has(word)) return;

    const tokens = [...new Set(tokenizeMeaning(clue, locale))].slice(0, 12);
    byWord.set(word, {
      word,
      clue,
      length: word.length,
      tokens,
      clueQuality: scoreClueQuality(clue, locale),
      letters: [...new Set(word.split(""))]
    });
  });

  const entries = [...byWord.values()].sort((left, right) => {
    if (left.length !== right.length) return left.length - right.length;
    return left.word.localeCompare(right.word);
  });

  const byLength = new Map();
  const byLetter = new Map();
  for (let length = MIN_WORD_LENGTH; length <= MAX_WORD_LENGTH; length += 1) {
    byLength.set(length, []);
  }

  entries.forEach((entry) => {
    byLength.get(entry.length)?.push(entry);
    entry.letters.forEach((letter) => {
      const bucket = byLetter.get(letter) || [];
      bucket.push(entry);
      byLetter.set(letter, bucket);
    });
  });

  return {
    locale,
    entries,
    byLength,
    byLetter
  };
};

const createEmptyBoard = () => ({
  cells: Array.from({ length: BOARD_ROWS }, () => Array.from({ length: BOARD_COLS }, () => "")),
  flags: Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, () => ({ across: false, down: false }))),
  letterCells: new Map()
});

const boardHasLetters = (board) => {
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      if (board.cells[row][col]) return true;
    }
  }
  return false;
};

const isInsideBoard = (row, col) =>
  row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS;

const addLetterCell = (letterCells, letter, row, col) => {
  const key = `${row}:${col}`;
  const bucket = letterCells.get(letter) || [];
  if (!bucket.some((cell) => cell.key === key)) {
    bucket.push({ row, col, key });
    letterCells.set(letter, bucket);
  }
};

const evaluatePlacement = ({
  board,
  word,
  row,
  col,
  direction,
  requireCrossing
}) => {
  const deltaRow = direction === "down" ? 1 : 0;
  const deltaCol = direction === "across" ? 1 : 0;

  const beforeRow = row - deltaRow;
  const beforeCol = col - deltaCol;
  const afterRow = row + deltaRow * word.length;
  const afterCol = col + deltaCol * word.length;

  if (isInsideBoard(beforeRow, beforeCol) && board.cells[beforeRow][beforeCol]) return null;
  if (isInsideBoard(afterRow, afterCol) && board.cells[afterRow][afterCol]) return null;

  let intersections = 0;
  let newCells = 0;

  for (let index = 0; index < word.length; index += 1) {
    const currentRow = row + deltaRow * index;
    const currentCol = col + deltaCol * index;
    if (!isInsideBoard(currentRow, currentCol)) return null;

    const letter = word[index];
    const existing = board.cells[currentRow][currentCol];
    const flags = board.flags[currentRow][currentCol];

    if (existing && existing !== letter) return null;
    if (existing && flags[direction]) return null;

    if (existing) {
      intersections += 1;
    } else {
      newCells += 1;
      if (direction === "across") {
        if (isInsideBoard(currentRow - 1, currentCol) && board.cells[currentRow - 1][currentCol]) return null;
        if (isInsideBoard(currentRow + 1, currentCol) && board.cells[currentRow + 1][currentCol]) return null;
      } else {
        if (isInsideBoard(currentRow, currentCol - 1) && board.cells[currentRow][currentCol - 1]) return null;
        if (isInsideBoard(currentRow, currentCol + 1) && board.cells[currentRow][currentCol + 1]) return null;
      }
    }
  }

  if (requireCrossing && intersections <= 0) return null;
  if (!requireCrossing && boardHasLetters(board) && intersections <= 0) return null;
  if (newCells <= 0) return null;

  return { row, col, intersections, newCells };
};

const applyPlacement = ({
  board,
  placement,
  direction,
  word
}) => {
  const deltaRow = direction === "down" ? 1 : 0;
  const deltaCol = direction === "across" ? 1 : 0;

  for (let index = 0; index < word.length; index += 1) {
    const row = placement.row + deltaRow * index;
    const col = placement.col + deltaCol * index;
    board.cells[row][col] = word[index];
    board.flags[row][col][direction] = true;
    addLetterCell(board.letterCells, word[index], row, col);
  }
};

const collectOccupiedCells = (board) => {
  const cells = [];
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      if (board.cells[row][col]) {
        cells.push({ row, col, letter: board.cells[row][col] });
      }
    }
  }
  return cells;
};

const scoreLengthFit = ({ length, preferredLengths, usedLengths }) => {
  let score = 0;
  if (preferredLengths.includes(length)) score += 24;
  if (!usedLengths.has(length)) score += 20;
  if (length === 3 || length === 10) score += 6;
  return score;
};

const pickSeedCandidate = ({
  localeContext,
  preferredLengths,
  usedWords,
  seed
}) => {
  const lengthCandidates = [
    ...preferredLengths,
    10, 9, 8, 7, 6, 5, 4, 3
  ];

  const uniqueLengths = [...new Set(lengthCandidates)]
    .filter((length) => length >= MIN_WORD_LENGTH && length <= MAX_WORD_LENGTH);

  for (let index = 0; index < uniqueLengths.length; index += 1) {
    const length = uniqueLengths[index];
    const bucket = localeContext.byLength.get(length) || [];
    if (!bucket.length) continue;

    const start = toPositiveIndex(mixSeed(seed, length * 131), bucket.length);
    const windowSize = Math.min(bucket.length, 80);
    for (let offset = 0; offset < windowSize; offset += 1) {
      const candidate = bucket[(start + offset) % bucket.length];
      if (!usedWords.has(candidate.word)) {
        return candidate;
      }
    }
  }

  return null;
};

const scorePlacementChoice = ({
  candidate,
  placement,
  themeTokens,
  preferredLengths,
  usedLengths,
  seed
}) => {
  const overlap = countOverlap(candidate.tokens, themeTokens);
  const randomBump = toPositiveIndex(mixSeed(seed, candidate.word.length * 43), 11);
  let score = candidate.clueQuality + randomBump;
  score += overlap * 22;
  score += placement.intersections * 95;
  score += placement.newCells * 7;
  score += scoreLengthFit({
    length: candidate.length,
    preferredLengths,
    usedLengths
  });
  return score;
};

const findBestPlacementForCandidate = ({
  board,
  candidate,
  direction,
  rng,
  requireCrossing
}) => {
  const letters = candidate.word.split("");
  let best = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < letters.length; index += 1) {
    const letter = letters[index];
    const anchors = board.letterCells.get(letter) || [];
    if (!anchors.length) continue;

    const start = toPositiveIndex(Math.floor(rng() * anchors.length), anchors.length);
    const limit = Math.min(anchors.length, PLACEMENT_SEARCH_LIMIT);
    for (let offset = 0; offset < limit; offset += 1) {
      const anchor = anchors[(start + offset) % anchors.length];
      const row = direction === "down" ? anchor.row - index : anchor.row;
      const col = direction === "across" ? anchor.col - index : anchor.col;

      const placement = evaluatePlacement({
        board,
        word: candidate.word,
        row,
        col,
        direction,
        requireCrossing
      });
      if (!placement) continue;

      const score = placement.intersections * 100 + placement.newCells * 8;
      if (score > bestScore) {
        best = placement;
        bestScore = score;
      }
    }
  }

  return best;
};

const buildPackedMatch = ({
  localeContext,
  locale,
  matchId
}) => {
  const baseSeed = mixSeed(
    matchId + 1,
    locale === "es" ? 0x9e3779b1 : 0x85ebca6b
  );

  const profile = LENGTH_PROFILES[toPositiveIndex(matchId, LENGTH_PROFILES.length)];

  for (let retry = 0; retry < MAX_BUILD_RETRIES; retry += 1) {
    const seed = mixSeed(baseSeed, retry * 193 + 17);
    const rng = makeRng(seed);
    const targetWords = TARGET_WORDS_MIN
      + toPositiveIndex(mixSeed(seed, 0x1337), TARGET_WORDS_MAX - TARGET_WORDS_MIN + 1);

    const board = createEmptyBoard();
    const usedWords = new Set();
    const usedLengths = new Set();
    const themeTokens = new Set();
    const placements = [];

    const seedCandidate = pickSeedCandidate({
      localeContext,
      preferredLengths: profile,
      usedWords,
      seed
    });
    if (!seedCandidate) continue;

    const seedRow = Math.floor(BOARD_ROWS / 2);
    const maxSeedCol = BOARD_COLS - seedCandidate.length;
    const seedCol = Math.max(
      0,
      Math.min(
        maxSeedCol,
        Math.floor((BOARD_COLS - seedCandidate.length) / 2)
          + toPositiveIndex(mixSeed(seed, seedCandidate.length * 71), 3) - 1
      )
    );

    const firstPlacement = evaluatePlacement({
      board,
      word: seedCandidate.word,
      row: seedRow,
      col: seedCol,
      direction: "across",
      requireCrossing: false
    });
    if (!firstPlacement) continue;

    applyPlacement({
      board,
      placement: firstPlacement,
      direction: "across",
      word: seedCandidate.word
    });

    usedWords.add(seedCandidate.word);
    usedLengths.add(seedCandidate.length);
    seedCandidate.tokens.forEach((token) => {
      if (themeTokens.size < 14) themeTokens.add(token);
    });

    placements.push({
      row: firstPlacement.row,
      col: firstPlacement.col,
      direction: "across",
      word: seedCandidate.word,
      clue: seedCandidate.clue,
      style: pickStyle(mixSeed(seed, hashText(seedCandidate.word))),
      difficulty: pickDifficulty(mixSeed(seed, hashText(seedCandidate.word) ^ 0x51)),
      qualityScore: pickQuality(mixSeed(seed, hashText(seedCandidate.word) ^ 0x9b))
    });

    let stalledPasses = 0;
    for (let pass = 0; pass < MAX_PLACEMENT_PASSES; pass += 1) {
      if (placements.length >= targetWords) break;

      const occupied = collectOccupiedCells(board);
      if (!occupied.length) break;

      const acrossCount = placements.filter((entry) => entry.direction === "across").length;
      const downCount = placements.length - acrossCount;
      const preferredDirection = acrossCount <= downCount ? "across" : "down";
      const direction = stalledPasses > 2
        ? (preferredDirection === "across" ? "down" : "across")
        : preferredDirection;

      const anchor = occupied[toPositiveIndex(Math.floor(rng() * occupied.length), occupied.length)];
      const letterPool = localeContext.byLetter.get(anchor.letter) || [];
      if (!letterPool.length) {
        stalledPasses += 1;
        continue;
      }

      const candidateStart = toPositiveIndex(
        Math.floor(rng() * letterPool.length),
        letterPool.length
      );
      const sampledCandidates = [];

      for (let step = 0; step < CANDIDATE_SAMPLE_SIZE; step += 1) {
        const candidate = letterPool[(candidateStart + step) % letterPool.length];
        if (usedWords.has(candidate.word)) continue;
        if (candidate.length < MIN_WORD_LENGTH || candidate.length > MAX_WORD_LENGTH) continue;

        const overlap = countOverlap(candidate.tokens, themeTokens);
        const preScore = candidate.clueQuality
          + overlap * 18
          + scoreLengthFit({
            length: candidate.length,
            preferredLengths: profile,
            usedLengths
          });

        sampledCandidates.push({ candidate, preScore });
      }

      if (!sampledCandidates.length) {
        stalledPasses += 1;
        continue;
      }

      sampledCandidates.sort((left, right) => right.preScore - left.preScore);
      const topCandidates = sampledCandidates.slice(0, 24);

      let bestChoice = null;
      let bestScore = Number.NEGATIVE_INFINITY;
      for (let index = 0; index < topCandidates.length; index += 1) {
        const candidate = topCandidates[index].candidate;
        const placement = findBestPlacementForCandidate({
          board,
          candidate,
          direction,
          rng,
          requireCrossing: true
        });
        if (!placement) continue;

        const score = scorePlacementChoice({
          candidate,
          placement,
          themeTokens,
          preferredLengths: profile,
          usedLengths,
          seed: mixSeed(seed, pass * 31 + index * 17)
        });
        if (score > bestScore) {
          bestChoice = { candidate, placement, direction };
          bestScore = score;
        }
      }

      if (!bestChoice) {
        stalledPasses += 1;
        if (stalledPasses > 8) break;
        continue;
      }

      applyPlacement({
        board,
        placement: bestChoice.placement,
        direction: bestChoice.direction,
        word: bestChoice.candidate.word
      });

      usedWords.add(bestChoice.candidate.word);
      usedLengths.add(bestChoice.candidate.length);
      bestChoice.candidate.tokens.forEach((token) => {
        if (themeTokens.size < 14) themeTokens.add(token);
      });

      const matchSeed = mixSeed(seed, hashText(bestChoice.candidate.word) + pass * 13);
      placements.push({
        row: bestChoice.placement.row,
        col: bestChoice.placement.col,
        direction: bestChoice.direction,
        word: bestChoice.candidate.word,
        clue: bestChoice.candidate.clue,
        style: pickStyle(matchSeed),
        difficulty: pickDifficulty(mixSeed(matchSeed, 0x41)),
        qualityScore: pickQuality(mixSeed(matchSeed, 0x97))
      });
      stalledPasses = 0;
    }

    const across = placements
      .filter((entry) => entry.direction === "across")
      .sort((left, right) => (left.row === right.row ? left.col - right.col : left.row - right.row))
      .map((entry) => [
        entry.row,
        entry.col,
        entry.word,
        entry.clue,
        entry.style,
        entry.difficulty,
        entry.qualityScore
      ]);

    const down = placements
      .filter((entry) => entry.direction === "down")
      .sort((left, right) => (left.row === right.row ? left.col - right.col : left.row - right.row))
      .map((entry) => [
        entry.row,
        entry.col,
        entry.word,
        entry.clue,
        entry.style,
        entry.difficulty,
        entry.qualityScore
      ]);

    const lengthSet = new Set(placements.map((entry) => entry.word.length));
    const hasMandatoryLengths = profile.some((length) => lengthSet.has(length));

    if (across.length < MIN_ACROSS_WORDS) continue;
    if (down.length < MIN_DOWN_WORDS) continue;
    if (placements.length < TARGET_WORDS_MIN) continue;
    if (lengthSet.size < 3) continue;
    if (!hasMandatoryLengths) continue;

    const rowStrings = board.cells.map((row) => row.map((cell) => cell || "#").join(""));

    return {
      s: rowStrings,
      a: across,
      d: down
    };
  }

  throw new Error(
    `Unable to build cached crossword for locale=${locale} matchId=${matchId}`
  );
};

const collectMatchStats = ({ packed, localeStats }) => {
  packed.a.forEach((entry) => {
    const length = String(entry[2].length);
    localeStats.across[length] = (localeStats.across[length] || 0) + 1;
  });
  packed.d.forEach((entry) => {
    const length = String(entry[2].length);
    localeStats.down[length] = (localeStats.down[length] || 0) + 1;
  });

  localeStats.totalAcross += packed.a.length;
  localeStats.totalDown += packed.d.length;
};

const writeChunk = async (stream, chunk) => {
  if (stream.write(chunk)) return;
  await once(stream, "drain");
};

const shardFileName = (locale, shardIndex) => `${locale}-${String(shardIndex).padStart(2, "0")}.generated.js`;

const writeShardFile = async ({ locale, shardIndex, matches }) => {
  const filePath = path.join(OUTPUT_SHARD_DIR, shardFileName(locale, shardIndex));
  const output = fs.createWriteStream(filePath, { encoding: "utf8" });
  await writeChunk(output, "/* eslint-disable */\n");
  await writeChunk(output, "// Auto-generated by scripts/build_crossword_match_cache.mjs\n");
  await writeChunk(output, "const CROSSWORD_MATCH_CACHE_SHARD = [\n");

  for (let matchIndex = 0; matchIndex < matches.length; matchIndex += 1) {
    const serialized = JSON.stringify(matches[matchIndex]);
    const suffix = matchIndex === matches.length - 1 ? "" : ",";
    await writeChunk(output, `  ${serialized}${suffix}\n`);
  }

  await writeChunk(output, "];\n\nexport default CROSSWORD_MATCH_CACHE_SHARD;\n");
  output.end();
  await once(output, "finish");
};

const buildLoaderSource = (meta) => {
  const shardCounts = Object.fromEntries(
    LOCALES.map((locale) => [locale, Math.ceil(MATCH_COUNT / SHARD_SIZE)])
  );
  const localeLoaderBlocks = LOCALES.map((locale) => {
    const entries = Array.from({ length: shardCounts[locale] }, (_, shardIndex) => (
      `    ${shardIndex}: () => import("./crosswordMatchCacheShards/${shardFileName(locale, shardIndex)}")`
    )).join(",\n");
    return `  "${locale}": {\n${entries}\n  }`;
  }).join(",\n");

  return [
    "/* eslint-disable */\n",
    "// Auto-generated by scripts/build_crossword_match_cache.mjs\n",
    `export const CROSSWORD_MATCH_CACHE_META = ${JSON.stringify(meta, null, 2)};\n\n`,
    "export const CROSSWORD_MATCH_CACHE_SHARD_LOADERS = {\n",
    localeLoaderBlocks,
    "\n};\n\n",
    "const SHARD_CACHE = new Map();\n",
    "const SHARD_PROMISES = new Map();\n\n",
    "const normalizeLocaleKey = (locale) => (String(locale || \"es\").toLowerCase().startsWith(\"es\") ? \"es\" : \"en\");\n",
    "const normalizeMatchId = (matchId) => {\n",
    "  const safe = Math.abs(Number(matchId) || 0);\n",
    "  const total = Number(CROSSWORD_MATCH_CACHE_META?.constraints?.matchCount || 0);\n",
    "  if (!total) return 0;\n",
    "  return safe % total;\n",
    "};\n",
    "const resolveShardIndex = (matchId) => {\n",
    "  const shardSize = Number(CROSSWORD_MATCH_CACHE_META?.constraints?.shardSize || 1);\n",
    "  return Math.floor(normalizeMatchId(matchId) / shardSize);\n",
    "};\n",
    "const cacheKeyFor = (localeKey, shardIndex) => `${localeKey}:${shardIndex}`;\n\n",
    "export const loadCrosswordMatchCacheShard = async (locale, matchId) => {\n",
    "  const localeKey = normalizeLocaleKey(locale);\n",
    "  const shardIndex = resolveShardIndex(matchId);\n",
    "  const loader = CROSSWORD_MATCH_CACHE_SHARD_LOADERS[localeKey]?.[shardIndex];\n",
    "  if (!loader) return [];\n",
    "  const cacheKey = cacheKeyFor(localeKey, shardIndex);\n",
    "  if (SHARD_CACHE.has(cacheKey)) return SHARD_CACHE.get(cacheKey) ?? [];\n",
    "  if (!SHARD_PROMISES.has(cacheKey)) {\n",
    "    SHARD_PROMISES.set(cacheKey, loader().then((module) => {\n",
    "      const shard = module.default ?? module.CROSSWORD_MATCH_CACHE_SHARD ?? [];\n",
    "      SHARD_CACHE.set(cacheKey, shard);\n",
    "      return shard;\n",
    "    }));\n",
    "  }\n",
    "  return SHARD_PROMISES.get(cacheKey) ?? [];\n",
    "};\n\n",
    "export const loadCrosswordMatchCacheEntry = async (locale, matchId) => {\n",
    "  const localeKey = normalizeLocaleKey(locale);\n",
    "  const safeMatchId = normalizeMatchId(matchId);\n",
    "  const shard = await loadCrosswordMatchCacheShard(localeKey, safeMatchId);\n",
    "  if (!Array.isArray(shard) || shard.length === 0) return null;\n",
    "  const shardSize = Number(CROSSWORD_MATCH_CACHE_META?.constraints?.shardSize || shard.length || 1);\n",
    "  const localIndex = safeMatchId % shardSize;\n",
    "  return shard[localIndex] ?? null;\n",
    "};\n"
  ].join("");
};

const generateCacheFile = async () => {
  const repoStyleLocales = {
    es: await loadCrosswordRepoStyleLocale("es"),
    en: await loadCrosswordRepoStyleLocale("en")
  };
  const localeContexts = {
    es: buildLocaleContext("es", repoStyleLocales.es),
    en: buildLocaleContext("en", repoStyleLocales.en)
  };

  const stats = {
    es: {
      across: {},
      down: {},
      totalAcross: 0,
      totalDown: 0
    },
    en: {
      across: {},
      down: {},
      totalAcross: 0,
      totalDown: 0
    }
  };

  fs.rmSync(OUTPUT_SHARD_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_SHARD_DIR, { recursive: true });

  for (let localeIndex = 0; localeIndex < LOCALES.length; localeIndex += 1) {
    const locale = LOCALES[localeIndex];
    const localeContext = localeContexts[locale];
    const shardMatches = [];

    for (let matchId = 0; matchId < MATCH_COUNT; matchId += 1) {
      const packed = buildPackedMatch({
        localeContext,
        locale,
        matchId
      });
      collectMatchStats({
        packed,
        localeStats: stats[locale]
      });
      shardMatches.push(packed);

      const shouldFlushShard = shardMatches.length === SHARD_SIZE || matchId === MATCH_COUNT - 1;
      if (shouldFlushShard) {
        const shardIndex = Math.floor(matchId / SHARD_SIZE);
        await writeShardFile({
          locale,
          shardIndex,
          matches: shardMatches
        });
        shardMatches.length = 0;
      }

      if ((matchId + 1) % PROGRESS_STEP === 0) {
        console.log(`[${locale}] generated ${matchId + 1}/${MATCH_COUNT}`);
      }
    }
  }

  const meta = {
    generatedAt: new Date().toISOString(),
    source: {
      script: "scripts/build_crossword_match_cache.mjs",
      bankGeneratedAt: CROSSWORD_REPO_STYLE_META?.generatedAt || null
    },
    constraints: {
      matchCount: MATCH_COUNT,
      shardSize: SHARD_SIZE,
      boardRows: BOARD_ROWS,
      boardCols: BOARD_COLS,
      minWordLength: MIN_WORD_LENGTH,
      maxWordLength: MAX_WORD_LENGTH,
      minAcrossWords: MIN_ACROSS_WORDS,
      minDownWords: MIN_DOWN_WORDS
    },
    shards: Object.fromEntries(
      LOCALES.map((locale) => [locale, Math.ceil(MATCH_COUNT / SHARD_SIZE)])
    ),
    format: {
      solutionRows: "s",
      acrossEntries: "a",
      downEntries: "d",
      entryShape: "[row, col, word, clue, style, difficulty, qualityScore]"
    },
    stats
  };

  fs.writeFileSync(OUTPUT_FILE, buildLoaderSource(meta), "utf8");

  console.log(`Generated ${OUTPUT_FILE}`);
  console.log(`Generated shards in ${OUTPUT_SHARD_DIR}`);
  console.log(
    JSON.stringify(
      {
        es: {
          totalAcross: stats.es.totalAcross,
          totalDown: stats.es.totalDown
        },
        en: {
          totalAcross: stats.en.totalAcross,
          totalDown: stats.en.totalDown
        }
      },
      null,
      2
    )
  );
};

await generateCacheFile();
