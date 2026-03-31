import {
  KNOWLEDGE_ARCADE_MATCH_COUNT,
  createSeededRandom,
  encodeMatchWord,
  shuffleWithRandom
} from "./knowledgeArcadeUtils";
import {
  KNOWLEDGE_WORD_LEXICON_META,
  getKnowledgeWordLexicon
} from "./knowledgeWordLexicon";

export const WORD_SEARCH_BOARD_SIZE = 20;
export const WORD_SEARCH_WORD_TARGET = 14;
export const WORD_SEARCH_MIN_WORDS = 11;

const WORD_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const FILL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const WORD_SEARCH_REQUIRED_WORDS_PER_LOCALE = 10000;
const WORD_SEARCH_CANDIDATE_POOL_SIZE = 320;

const WORD_BANK_BY_LOCALE = {
  es: [
    "ASTRONOMIA",
    "BIOLOGIA",
    "QUIMICA",
    "FISICA",
    "MATEMATICA",
    "GEOGRAFIA",
    "HISTORIA",
    "LITERATURA",
    "FILOSOFIA",
    "ECONOMIA",
    "ECOLOGIA",
    "GENETICA",
    "NEURONA",
    "CELULA",
    "ATOMO",
    "PLANETA",
    "GALAXIA",
    "COMETA",
    "ORBITA",
    "SATELITE",
    "VOLCAN",
    "TECTONICA",
    "OXIGENO",
    "HIDROGENO",
    "ENERGIA",
    "GRAVEDAD",
    "INERCIA",
    "VECTOR",
    "ECUACION",
    "TEOREMA",
    "ALGORITMO",
    "CODIGO",
    "DATOS",
    "MEMORIA",
    "PROCESADOR",
    "INTERNET",
    "ROBOTICA",
    "CIBERNETICA",
    "MECANICA",
    "TERMODINAMICA",
    "DEMOGRAFIA",
    "ANTROPOLOGIA",
    "ARQUEOLOGIA",
    "CARTOGRAFIA",
    "CLIMATOLOGIA",
    "METEOROLOGIA",
    "BOTANICA",
    "ZOOLOGIA",
    "MICROBIOLOGIA",
    "PALEONTOLOGIA",
    "OCEANOGRAFIA",
    "ESTADISTICA",
    "PROBABILIDAD",
    "GEOMETRIA",
    "TRIGONOMETRIA",
    "CALCULO",
    "ANALISIS",
    "TOPOLOGIA",
    "LOGICA",
    "SILOGISMO",
    "GRAMATICA",
    "SINTAXIS",
    "LEXICO",
    "IDIOMA",
    "VERBO",
    "SUSTANTIVO",
    "ADJETIVO",
    "PRONOMBRE",
    "DICCIONARIO",
    "ENCICLOPEDIA",
    "CRONOLOGIA",
    "CIVILIZACION",
    "IMPERIO",
    "CONSTITUCION",
    "DEMOCRACIA",
    "REPUBLICA",
    "PARLAMENTO",
    "CULTURA",
    "MUSICA",
    "PINTURA",
    "ESCULTURA",
    "TEATRO",
    "NOVELA",
    "POESIA",
    "ORQUESTA",
    "ARMONIA",
    "RITMO",
    "DEPORTE",
    "OLIMPIADA",
    "AJEDREZ",
    "ATLETISMO",
    "NATACION",
    "TENIS",
    "ANATOMIA",
    "FISIOLOGIA",
    "VACUNA",
    "HORMONA",
    "NUTRICION",
    "MEDICINA",
    "CIRUGIA",
    "EPIDEMIA",
    "PANDEMIA",
    "FARMACOLOGIA",
    "PSICOLOGIA",
    "SOCIOLOGIA",
    "ETICA",
    "DERECHO",
    "JURISPRUDENCIA",
    "ARITMETICA",
    "ALGEBRA",
    "NUMERADOR",
    "DENOMINADOR",
    "FRACCION",
    "DECIMAL",
    "PORCENTAJE",
    "RADIAN",
    "MAPA",
    "BRUJULA",
    "RELOJ",
    "CALENDARIO",
    "MERIDIANO",
    "PARALELO",
    "HEMISFERIO",
    "CONTINENTE",
    "OCEANO",
    "DESIERTO",
    "SABANA",
    "BOSQUE",
    "SELVA",
    "GLACIAR",
    "MONZON"
  ],
  en: [
    "ASTRONOMY",
    "BIOLOGY",
    "CHEMISTRY",
    "PHYSICS",
    "MATHEMATICS",
    "GEOGRAPHY",
    "HISTORY",
    "LITERATURE",
    "PHILOSOPHY",
    "ECONOMICS",
    "ECOLOGY",
    "GENETICS",
    "NEURON",
    "CELL",
    "ATOM",
    "PLANET",
    "GALAXY",
    "COMET",
    "ORBIT",
    "SATELLITE",
    "VOLCANO",
    "TECTONICS",
    "OXYGEN",
    "HYDROGEN",
    "ENERGY",
    "GRAVITY",
    "INERTIA",
    "VECTOR",
    "EQUATION",
    "THEOREM",
    "ALGORITHM",
    "CODE",
    "DATA",
    "MEMORY",
    "PROCESSOR",
    "INTERNET",
    "ROBOTICS",
    "CYBERNETICS",
    "MECHANICS",
    "THERMODYNAMICS",
    "DEMOGRAPHY",
    "ANTHROPOLOGY",
    "ARCHAEOLOGY",
    "CARTOGRAPHY",
    "CLIMATOLOGY",
    "METEOROLOGY",
    "BOTANY",
    "ZOOLOGY",
    "MICROBIOLOGY",
    "PALEONTOLOGY",
    "OCEANOGRAPHY",
    "STATISTICS",
    "PROBABILITY",
    "GEOMETRY",
    "TRIGONOMETRY",
    "CALCULUS",
    "ANALYSIS",
    "TOPOLOGY",
    "LOGIC",
    "SYLLOGISM",
    "GRAMMAR",
    "SYNTAX",
    "LEXICON",
    "LANGUAGE",
    "VERB",
    "NOUN",
    "ADJECTIVE",
    "PRONOUN",
    "DICTIONARY",
    "ENCYCLOPEDIA",
    "CHRONOLOGY",
    "CIVILIZATION",
    "EMPIRE",
    "CONSTITUTION",
    "DEMOCRACY",
    "REPUBLIC",
    "PARLIAMENT",
    "CULTURE",
    "MUSIC",
    "PAINTING",
    "SCULPTURE",
    "THEATER",
    "NOVEL",
    "POETRY",
    "ORCHESTRA",
    "HARMONY",
    "RHYTHM",
    "SPORT",
    "OLYMPICS",
    "CHESS",
    "ATHLETICS",
    "SWIMMING",
    "TENNIS",
    "ANATOMY",
    "PHYSIOLOGY",
    "VACCINE",
    "HORMONE",
    "NUTRITION",
    "MEDICINE",
    "SURGERY",
    "EPIDEMIC",
    "PANDEMIC",
    "PHARMACOLOGY",
    "PSYCHOLOGY",
    "SOCIOLOGY",
    "ETHICS",
    "LAW",
    "JURISPRUDENCE",
    "ARITHMETIC",
    "ALGEBRA",
    "NUMERATOR",
    "DENOMINATOR",
    "FRACTION",
    "DECIMAL",
    "PERCENTAGE",
    "RADIAN",
    "MAP",
    "COMPASS",
    "CLOCK",
    "CALENDAR",
    "MERIDIAN",
    "PARALLEL",
    "HEMISPHERE",
    "CONTINENT",
    "OCEAN",
    "DESERT",
    "SAVANNA",
    "FOREST",
    "JUNGLE",
    "GLACIER",
    "MONSOON"
  ]
};

const countOverlap = (leftWords, rightWords) => {
  const left = leftWords instanceof Set ? leftWords : new Set(leftWords);
  const right = rightWords instanceof Set ? rightWords : new Set(rightWords);
  return [...left].reduce((count, word) => count + (right.has(word) ? 1 : 0), 0);
};

const createWordSearchWordBank = () => {
  const esWords = getKnowledgeWordLexicon("es").map((entry) => entry.word);
  const enWords = getKnowledgeWordLexicon("en").map((entry) => entry.word);

  const esUniqueCount = new Set(esWords).size;
  const enUniqueCount = new Set(enWords).size;
  const overlapCount = countOverlap(esWords, enWords);
  const esCount = esWords.length;
  const enCount = enWords.length;

  if (
    esCount !== WORD_SEARCH_REQUIRED_WORDS_PER_LOCALE ||
    enCount !== WORD_SEARCH_REQUIRED_WORDS_PER_LOCALE
  ) {
    throw new Error(
      `Word Search requires ${WORD_SEARCH_REQUIRED_WORDS_PER_LOCALE} words per locale. Received es=${esCount}, en=${enCount}.`
    );
  }
  if (esUniqueCount !== esCount || enUniqueCount !== enCount) {
    throw new Error(
      `Word Search requires unique locale banks. Received unique counts es=${esUniqueCount}, en=${enUniqueCount}.`
    );
  }
  if (overlapCount !== 0 || KNOWLEDGE_WORD_LEXICON_META.overlapCount !== 0) {
    throw new Error(`Word Search requires disjoint locale banks and received overlap=${overlapCount}.`);
  }

  return Object.freeze({
    es: Object.freeze(esWords),
    en: Object.freeze(enWords),
    overlapCount,
    uniqueCounts: Object.freeze({
      es: esUniqueCount,
      en: enUniqueCount
    })
  });
};

const WORD_SEARCH_WORD_BANK = createWordSearchWordBank();
WORD_BANK_BY_LOCALE.es = WORD_SEARCH_WORD_BANK.es;
WORD_BANK_BY_LOCALE.en = WORD_SEARCH_WORD_BANK.en;

export const WORD_SEARCH_DIRECTIONS = [
  {
    key: "E",
    rowStep: 0,
    colStep: 1,
    label: "horizontal-forward",
    group: "horizontal",
    reversed: false
  },
  {
    key: "W",
    rowStep: 0,
    colStep: -1,
    label: "horizontal-reverse",
    group: "horizontal",
    reversed: true
  },
  {
    key: "S",
    rowStep: 1,
    colStep: 0,
    label: "vertical-down",
    group: "vertical",
    reversed: false
  },
  {
    key: "N",
    rowStep: -1,
    colStep: 0,
    label: "vertical-up",
    group: "vertical",
    reversed: true
  },
  {
    key: "SE",
    rowStep: 1,
    colStep: 1,
    label: "diagonal-down-right",
    group: "diagonal",
    reversed: false
  },
  {
    key: "NW",
    rowStep: -1,
    colStep: -1,
    label: "diagonal-up-left",
    group: "diagonal",
    reversed: true
  },
  {
    key: "SW",
    rowStep: 1,
    colStep: -1,
    label: "diagonal-down-left",
    group: "diagonal",
    reversed: true
  },
  {
    key: "NE",
    rowStep: -1,
    colStep: 1,
    label: "diagonal-up-right",
    group: "diagonal",
    reversed: false
  }
];

const REQUIRED_DIRECTION_KEYS = ["E", "W", "S", "SE"];
const DIRECTION_BY_KEY = Object.fromEntries(
  WORD_SEARCH_DIRECTIONS.map((direction) => [direction.key, direction])
);

const normalizeLocale = (locale) =>
  String(locale || "es").toLowerCase().startsWith("es") ? "es" : "en";

const normalizeMatchId = (matchId) => {
  const safe = Math.abs(Number(matchId) || 0);
  return safe % KNOWLEDGE_ARCADE_MATCH_COUNT;
};

const createBoard = (size) =>
  Array.from({ length: size }, () => Array.from({ length: size }, () => ""));

const randomInt = (random, min, max) => {
  if (max < min) return min;
  return min + Math.floor(random() * (max - min + 1));
};

const coordinateKey = (row, col) => `${row},${col}`;

export const buildWordSearchPath = (start, end) => {
  if (!start || !end) return [];
  const startRow = Number(start.row);
  const startCol = Number(start.col);
  const endRow = Number(end.row);
  const endCol = Number(end.col);

  if (
    !Number.isInteger(startRow) ||
    !Number.isInteger(startCol) ||
    !Number.isInteger(endRow) ||
    !Number.isInteger(endCol)
  ) {
    return [];
  }

  const deltaRow = endRow - startRow;
  const deltaCol = endCol - startCol;
  const absRow = Math.abs(deltaRow);
  const absCol = Math.abs(deltaCol);
  const isStraight = absRow === 0 || absCol === 0 || absRow === absCol;
  if (!isStraight) return [];

  const stepRow = deltaRow === 0 ? 0 : deltaRow > 0 ? 1 : -1;
  const stepCol = deltaCol === 0 ? 0 : deltaCol > 0 ? 1 : -1;
  const distance = Math.max(absRow, absCol);
  const cells = [];

  for (let offset = 0; offset <= distance; offset += 1) {
    cells.push({
      row: startRow + stepRow * offset,
      col: startCol + stepCol * offset
    });
  }
  return cells;
};

export const buildWordSearchPathKey = (cells) => {
  const list = Array.isArray(cells) ? cells : [];
  if (!list.length) return "";
  const forward = list.map((cell) => coordinateKey(cell.row, cell.col)).join("|");
  const backward = [...list]
    .reverse()
    .map((cell) => coordinateKey(cell.row, cell.col))
    .join("|");
  return forward < backward ? forward : backward;
};

const resolveStartBounds = (size, wordLength, step) => {
  const offset = wordLength - 1;
  if (step === 1) {
    return { min: 0, max: size - 1 - offset };
  }
  if (step === -1) {
    return { min: offset, max: size - 1 };
  }
  return { min: 0, max: size - 1 };
};

const canWriteWord = (board, cells, word) => {
  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index];
    const existing = board[cell.row][cell.col];
    const target = word[index];
    if (existing && existing !== target) {
      return false;
    }
  }
  return true;
};

const writeWord = (board, cells, word) => {
  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index];
    board[cell.row][cell.col] = word[index];
  }
};

const buildPlacement = (word, direction, cells) => ({
  id: `${word}-${buildWordSearchPathKey(cells)}`,
  word,
  start: cells[0],
  end: cells[cells.length - 1],
  direction: direction.label,
  directionGroup: direction.group,
  reversed: direction.reversed,
  cells,
  pathKey: buildWordSearchPathKey(cells)
});

const tryPlaceWord = ({
  board,
  size,
  word,
  direction,
  random,
  usedPathKeys,
  maxAttempts = 48
}) => {
  const rowBounds = resolveStartBounds(size, word.length, direction.rowStep);
  const colBounds = resolveStartBounds(size, word.length, direction.colStep);
  if (rowBounds.max < rowBounds.min || colBounds.max < colBounds.min) {
    return null;
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const startRow = randomInt(random, rowBounds.min, rowBounds.max);
    const startCol = randomInt(random, colBounds.min, colBounds.max);
    const endRow = startRow + direction.rowStep * (word.length - 1);
    const endCol = startCol + direction.colStep * (word.length - 1);
    const cells = buildWordSearchPath(
      { row: startRow, col: startCol },
      { row: endRow, col: endCol }
    );
    if (cells.length !== word.length) {
      continue;
    }

    const pathKey = buildWordSearchPathKey(cells);
    if (usedPathKeys.has(pathKey)) {
      continue;
    }
    if (!canWriteWord(board, cells, word)) {
      continue;
    }

    writeWord(board, cells, word);
    usedPathKeys.add(pathKey);
    return buildPlacement(word, direction, cells);
  }

  return null;
};

const tryPlaceWordWithPriority = ({
  board,
  size,
  word,
  random,
  preferredDirection,
  usedPathKeys
}) => {
  const randomDirections = shuffleWithRandom(WORD_SEARCH_DIRECTIONS, random);
  const directions = preferredDirection
    ? [preferredDirection, ...randomDirections.filter((item) => item.key !== preferredDirection.key)]
    : randomDirections;

  for (let index = 0; index < directions.length; index += 1) {
    const placement = tryPlaceWord({
      board,
      size,
      word,
      direction: directions[index],
      random,
      usedPathKeys
    });
    if (placement) {
      return placement;
    }
  }

  return null;
};

const fillBoardGaps = (board, random, localeKey) => {
  const alphabet = localeKey === "es" ? FILL_ALPHABET : FILL_ALPHABET;
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      if (board[row][col]) continue;
      const index = Math.floor(random() * alphabet.length);
      board[row][col] = alphabet[index];
    }
  }
};

const placeRequiredDirections = ({
  board,
  size,
  words,
  random,
  usedWords,
  usedPathKeys,
  placements
}) => {
  REQUIRED_DIRECTION_KEYS.forEach((directionKey) => {
    const direction = DIRECTION_BY_KEY[directionKey];
    if (!direction) return;

    for (let index = 0; index < words.length; index += 1) {
      const word = words[index];
      if (usedWords.has(word)) continue;

      const placement = tryPlaceWord({
        board,
        size,
        word,
        direction,
        random,
        usedPathKeys
      });
      if (!placement) {
        continue;
      }

      placements.push(placement);
      usedWords.add(word);
      break;
    }
  });
};

const greatestCommonDivisor = (left, right) => {
  let a = Math.abs(Number(left) || 0);
  let b = Math.abs(Number(right) || 0);
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a || 1;
};

const resolveCoprimeStep = (length, random) => {
  if (length <= 1) return 1;

  let step = randomInt(random, 1, length - 1);
  for (let attempt = 0; attempt < length; attempt += 1) {
    if (greatestCommonDivisor(step, length) === 1) {
      return step;
    }
    step = (step + 1) % length;
    if (step === 0) {
      step = 1;
    }
  }

  return 1;
};

const buildWordCandidates = (localeKey, random, size) => {
  const base = WORD_BANK_BY_LOCALE[localeKey] ?? WORD_BANK_BY_LOCALE.en;
  if (!base.length) {
    return [];
  }

  const maxCandidates = Math.min(
    base.length,
    Math.max(WORD_SEARCH_CANDIDATE_POOL_SIZE, WORD_SEARCH_WORD_TARGET * 10)
  );
  const startIndex = randomInt(random, 0, base.length - 1);
  const step = resolveCoprimeStep(base.length, random);

  const candidates = [];
  let cursor = startIndex;
  for (let seen = 0; seen < base.length && candidates.length < maxCandidates; seen += 1) {
    const word = base[cursor];
    if (word.length >= 4 && word.length <= size) {
      candidates.push(word);
    }
    cursor = (cursor + step) % base.length;
  }
  return candidates;
};

const createPuzzleKey = (matchId, localeKey) => {
  const localeShift = localeKey === "es" ? 0 : KNOWLEDGE_ARCADE_MATCH_COUNT;
  return `${localeKey}-${encodeMatchWord(localeShift + matchId, WORD_ID_ALPHABET, 5)}`;
};

const buildMatchWithSeed = (matchId, localeKey, seed) => {
  const size = WORD_SEARCH_BOARD_SIZE;
  const random = createSeededRandom(seed);
  const words = buildWordCandidates(localeKey, random, size);
  const board = createBoard(size);
  const placements = [];
  const usedWords = new Set();
  const usedPathKeys = new Set();

  placeRequiredDirections({
    board,
    size,
    words,
    random,
    usedWords,
    usedPathKeys,
    placements
  });

  for (let index = 0; index < words.length; index += 1) {
    if (placements.length >= WORD_SEARCH_WORD_TARGET) break;
    const word = words[index];
    if (usedWords.has(word)) continue;

    const placement = tryPlaceWordWithPriority({
      board,
      size,
      word,
      random,
      preferredDirection: null,
      usedPathKeys
    });
    if (!placement) continue;

    placements.push(placement);
    usedWords.add(word);
  }

  fillBoardGaps(board, random, localeKey);
  return {
    board,
    boardSize: size,
    words: placements,
    locale: localeKey,
    puzzleKey: createPuzzleKey(matchId, localeKey)
  };
};

const ensureMinimumWords = (match, localeKey, matchId) => {
  if (match.words.length >= WORD_SEARCH_MIN_WORDS) {
    return match;
  }

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const retry = buildMatchWithSeed(
      matchId,
      localeKey,
      (matchId + 1) * 8191 + (localeKey === "es" ? 31 : 73) + attempt * 1879
    );
    if (retry.words.length >= WORD_SEARCH_MIN_WORDS) {
      return retry;
    }
  }

  return match;
};

export const WORD_SEARCH_META = {
  boardSize: WORD_SEARCH_BOARD_SIZE,
  wordsPerMatch: WORD_SEARCH_WORD_TARGET,
  minWordsPerMatch: WORD_SEARCH_MIN_WORDS,
  requiredWordsPerLocale: WORD_SEARCH_REQUIRED_WORDS_PER_LOCALE,
  bankCounts: {
    es: WORD_BANK_BY_LOCALE.es.length,
    en: WORD_BANK_BY_LOCALE.en.length
  },
  uniqueBankCounts: WORD_SEARCH_WORD_BANK.uniqueCounts,
  overlapCount: WORD_SEARCH_WORD_BANK.overlapCount
};

export const createWordSearchMatch = (matchId, locale) => {
  const localeKey = normalizeLocale(locale);
  const safeMatchId = normalizeMatchId(matchId);
  const seed = (safeMatchId + 1) * 4093 + (localeKey === "es" ? 17 : 59);
  const base = buildMatchWithSeed(safeMatchId, localeKey, seed);
  return ensureMinimumWords(base, localeKey, safeMatchId);
};
