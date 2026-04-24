import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(
  process.cwd(),
  "tmp",
  "crossword-bank-build"
);

const INPUT_FILES = Object.freeze({
  en: path.join(DATA_DIR, "simple_english_merged.json"),
  es: path.join(DATA_DIR, "rae_corpus.json")
});

const OUTPUT_FILE = path.join(
  process.cwd(),
  "src",
  "games",
  "knowledge",
  "crosswordRepoStyleBank.generated.js"
);
const OUTPUT_LOCALE_DIR = path.join(
  process.cwd(),
  "src",
  "games",
  "knowledge",
  "crosswordRepoStyleBankLocales"
);

const TARGET_PER_LOCALE = 16000;
const MIN_WORD_LENGTH = 3;
const MAX_WORD_LENGTH = 10;
const WORD_RE = /^[A-Z]{3,10}$/;
const MAX_CLUE_LENGTH = 180;
const WORD_LENGTHS = Object.freeze([3, 4, 5, 6, 7, 8, 9, 10]);

const SOURCE_INFO = {
  generator: "scripts/build_crossword_repo_style_bank.mjs",
  datasets: {
    en: {
      repo: "https://github.com/nightblade9/simple-english-dictionary",
      raw: "https://raw.githubusercontent.com/nightblade9/simple-english-dictionary/main/processed/merged.json"
    },
    es: {
      repo: "https://github.com/eneko98/RAE-Corpus",
      raw: "https://raw.githubusercontent.com/eneko98/RAE-Corpus/main/rae_corpus.json"
    }
  }
};

const GENERATED_BANK_MIGRATION_SOURCE = {
  generator: "existing crosswordRepoStyleBank.generated.js",
  datasets: "re-emitted from previously generated bank because raw datasets were unavailable"
};

const normalizeAscii = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "");

const normalizeWord = (value) => normalizeAscii(value)
  .replace(/[^A-Za-z]/g, "")
  .toUpperCase();

const normalizeSpaces = (value) => String(value || "")
  .replace(/\s+/g, " ")
  .replace(/\s+([,.;:!?])/g, "$1")
  .trim();

const capitalizeFirst = (value) => {
  const safe = normalizeSpaces(value);
  if (!safe) return "";
  return `${safe[0].toUpperCase()}${safe.slice(1)}`;
};

const ensureSentence = (value, fallback) => {
  const safe = normalizeSpaces(value) || fallback;
  const sentence = capitalizeFirst(safe);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
};

const escapeRegExp = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const redactAnswer = (text, normalizedWord) => {
  const source = normalizeSpaces(text);
  const answer = String(normalizedWord || "").toLowerCase();
  if (!source || !answer) {
    return source;
  }
  const pattern = new RegExp(`\\b${escapeRegExp(answer)}\\b`, "ig");
  return source.replace(pattern, "____");
};

const trimToMaxLength = (value, maxLength) => {
  const safe = normalizeSpaces(value);
  if (safe.length <= maxLength) {
    return safe;
  }
  const sliced = safe.slice(0, maxLength - 1);
  const boundary = Math.max(sliced.lastIndexOf(" "), sliced.lastIndexOf(","));
  const compact = boundary > 40 ? sliced.slice(0, boundary) : sliced;
  return compact.replace(/[,:; ]+$/g, "").trim();
};

const cleanDefinition = (value) => normalizeAscii(value)
  .replace(/[*_`~]/g, " ")
  .replace(/[¶§]+/g, ". ")
  .replace(/\s+/g, " ")
  .trim();

const trimTrailingSeparator = (value) => String(value || "")
  .replace(/[,:; ]+$/g, "")
  .trim();

const SPANISH_LEADING_TAG_RE = /^(?:(?:adj|adv|ant|coloq|desus|f|fig|intr|loc|m|prnl|tr|vulg|fam|poet|zool|bot|gram|mat|fis|quim|med|mar|arq|biol|arg|bol|chile|col|cuba|ecu|esp|guat|hond|mex|nic|pan|par|peru|ur|ven|el\s+salv|r\.\s*dom)\.\s*)+/iu;

const splitSentences = (value) => normalizeSpaces(value)
  .split(/(?<=[.!?])\s+/)
  .map((item) => item.trim())
  .filter(Boolean);

const stripLeadingSpanishTags = (value) => {
  let safe = normalizeSpaces(value);
  let previous = "";

  while (safe && safe !== previous) {
    previous = safe;
    safe = safe.replace(SPANISH_LEADING_TAG_RE, "").trim();
    safe = safe.replace(/^(?:y|e)\s+/i, "").trim();
  }

  return safe;
};

const isSpanishUsageSentence = (value) => {
  const safe = normalizeSpaces(value).toLowerCase();
  if (!safe) return true;
  return (
    /^(?:u\.|morf\.|v\.)/.test(safe)
    || /,\s*u\.?$/.test(safe)
    || /\bu\.?\s*(?:t\.?\s*)?c\.?\b/.test(safe)
    || /\bc\.\s*rur\./.test(safe)
    || /^en [^,.]{2,80},\s*u\.?/.test(safe)
  );
};

const normalizeSpanishSentence = (value) => {
  let safe = cleanDefinition(value);
  safe = safe.replace(/\(\|\|[^)]*\)/g, " ");
  safe = safe.replace(/\|\|/g, ", ");
  safe = safe.replace(/^\([^)]{2,180}\)\s*/g, "");
  safe = stripLeadingSpanishTags(safe);
  safe = safe.replace(/^Dicho d(?:e|el)\s+[^:]{3,220}:\s*/i, "");
  safe = safe.replace(/\b(?:era|es|fue)\s+u\.?\s*(?:t\.?\s*)?c\.?\s*prnl\.?/ig, "");
  safe = safe.replace(/\bu\.?\s*(?:t\.?\s*)?c\.?\s*(?:prnl|s|adj|loc|rur)?\.?/ig, "");
  safe = safe.replace(/\bu\.?\s*(?:m\.?|t\.?)\s*en\s*pl\.?/ig, "");
  safe = safe.replace(/(?:^|[.;])\s*u\.[^.]*\.?/ig, " ");
  safe = safe.replace(/,\s*u\.[^.]*\.?/ig, " ");
  safe = safe.replace(/\bu\.\s*$/i, "");
  safe = safe.replace(/\bmorf\.?\s*(?:conjug\.[^.]*\.?)?/ig, "");
  safe = safe.replace(/\bv\.\s+[a-z0-9\u00c0-\u017f .-]+\.?$/iu, "");
  safe = safe.replace(/(?:\.\s*){2,}/g, ". ");
  safe = safe.replace(/\s+\./g, ".");
  safe = safe.replace(/(?:^|[ ,;:])s\.\s*$/i, "");
  safe = trimTrailingSeparator(normalizeSpaces(safe));
  return safe;
};

const scoreSpanishSentence = (value) => {
  const safe = normalizeSpanishSentence(value);
  if (safe.length < 8) return -1000;

  let score = Math.min(160, safe.length * 2);
  const lower = safe.toLowerCase();

  if (isSpanishUsageSentence(safe)) score -= 220;
  if (/^[a-z]{1,4}\./i.test(safe)) score -= 80;
  if (lower.includes("desus")) score -= 40;
  if (lower.includes("p. us")) score -= 40;
  if (safe.includes(":")) score -= 15;
  if (safe.split(" ").length < 3) score -= 25;

  return score;
};

const humanizeSpanishDefinition = (raw) => {
  const safeRaw = cleanDefinition(raw);
  if (!safeRaw) return "";

  const sentences = splitSentences(safeRaw);
  const candidates = sentences.length ? sentences : [safeRaw];

  let best = "";
  let bestScore = -1000;
  candidates.forEach((candidate) => {
    const normalized = normalizeSpanishSentence(candidate);
    const score = scoreSpanishSentence(candidate);
    if (normalized && score > bestScore) {
      best = normalized;
      bestScore = score;
    }
  });

  if (best) return best;
  return normalizeSpanishSentence(safeRaw);
};

const scoreSpanishDefinition = (raw) => {
  const humanized = humanizeSpanishDefinition(raw);
  if (humanized.length < 8) return -1000;

  const rawLower = cleanDefinition(raw).toLowerCase();

  let score = scoreSpanishSentence(humanized);
  score += Math.min(40, humanized.split(" ").length * 3);

  if (/^\s*(?:[a-záéíóúüñ]{1,12}\.\s*){2,}/i.test(rawLower)) score -= 50;
  if (rawLower.startsWith("u. ")) score -= 100;
  if (rawLower.startsWith("p. us.") || rawLower.startsWith("desus.")) score -= 40;
  if (rawLower.startsWith("loc.") || rawLower.startsWith("intr.") || rawLower.startsWith("adj.")) score -= 20;
  if (rawLower.includes("||")) score -= 20;

  const abbreviations = (humanized.toLowerCase().match(/\b(?:u\.|desus\.|p\. us\.|morf\.|conjug\.|loc\.|coloq\.|intr\.|prnl\.)/g) || []).length;
  score -= abbreviations * 30;

  if (humanized.length < 12) score -= 20;

  return score;
};

const isPlayableSpanishClue = (value) => {
  const safe = normalizeSpaces(value);
  if (!safe || safe.length < 8) return false;

  const lower = safe.toLowerCase();
  if (/\bu\./i.test(safe)) return false;
  if (/\ba pers\./i.test(lower)) return false;
  if (/\bapl\.\s*a\s+pers\./i.test(lower)) return false;
  if (/\bera u\./i.test(lower)) return false;
  if (/,\s*era\.\s*$/i.test(lower)) return false;
  if (/\ben pl\./i.test(lower)) return false;
  if (/^solo las formas /i.test(lower)) return false;

  return true;
};

const pickSpanishDefinition = (entry) => {
  const definitions = Array.isArray(entry?.definitions) ? entry.definitions : [];
  let best = "";
  let bestScore = -1000;

  for (let index = 0; index < definitions.length; index += 1) {
    const raw = definitions[index];
    const candidate = humanizeSpanishDefinition(raw);
    const score = scoreSpanishDefinition(raw);
    if (candidate.length >= 8 && score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
};

const pickEnglishDefinition = (entry) => {
  const meanings = Array.isArray(entry?.MEANINGS) ? entry.MEANINGS : [];
  for (let index = 0; index < meanings.length; index += 1) {
    const meaning = meanings[index];
    if (!Array.isArray(meaning)) continue;
    const candidate = cleanDefinition(meaning[1]);
    if (candidate.length >= 16) {
      return candidate;
    }
  }
  return "";
};

const makeClueFromDefinition = ({ definition, normalizedWord, locale }) => {
  const fallback = locale === "es"
    ? "Definicion de diccionario del termino."
    : "Dictionary definition for the term.";

  if (!definition) {
    return fallback;
  }

  const redacted = redactAnswer(definition, normalizedWord);
  const trimmed = trimToMaxLength(redacted, MAX_CLUE_LENGTH);
  const safe = ensureSentence(trimmed, fallback);

  if (safe.length < 8) {
    return fallback;
  }

  return safe;
};

const addLengthCounts = (entries) => {
  const counts = {
    total: entries.length
  };
  entries.forEach((entry) => {
    const key = String(entry.word.length);
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
};

const compareEntries = (left, right) => {
  if (left.word.length !== right.word.length) {
    return left.word.length - right.word.length;
  }
  return left.word.localeCompare(right.word);
};

const selectBalancedEntries = (entries, target) => {
  const byLength = new Map();
  WORD_LENGTHS.forEach((length) => byLength.set(length, []));

  entries.forEach((entry) => {
    const bucket = byLength.get(entry.word.length);
    if (bucket) {
      bucket.push(entry);
    }
  });

  WORD_LENGTHS.forEach((length) => {
    byLength.get(length).sort((left, right) => left.word.localeCompare(right.word));
  });

  const cursors = new Map(WORD_LENGTHS.map((length) => [length, 0]));
  const active = WORD_LENGTHS.filter((length) => byLength.get(length).length > 0);
  const selected = [];

  while (selected.length < target && active.length > 0) {
    for (let index = 0; index < active.length; index += 1) {
      if (selected.length >= target) break;
      const length = active[index];
      const bucket = byLength.get(length);
      const cursor = cursors.get(length) || 0;
      if (cursor < bucket.length) {
        selected.push(bucket[cursor]);
        cursors.set(length, cursor + 1);
      }
    }

    for (let index = active.length - 1; index >= 0; index -= 1) {
      const length = active[index];
      const bucket = byLength.get(length);
      const cursor = cursors.get(length) || 0;
      if (cursor >= bucket.length) {
        active.splice(index, 1);
      }
    }
  }

  return selected;
};

const buildSpanishBank = (rows) => {
  const byWord = new Map();

  rows.forEach((entry) => {
    const word = normalizeWord(entry?.word);
    if (!WORD_RE.test(word) || byWord.has(word)) return;

    const definition = pickSpanishDefinition(entry);
    if (!definition) return;
    if (!isPlayableSpanishClue(definition)) return;

    byWord.set(word, {
      word,
      clue: makeClueFromDefinition({
        definition,
        normalizedWord: word,
        locale: "es"
      })
    });
  });

  const allEntries = [...byWord.values()].sort(compareEntries);
  return selectBalancedEntries(allEntries, TARGET_PER_LOCALE);
};

const buildEnglishBank = (records) => {
  const byWord = new Map();

  Object.entries(records).forEach(([rawWord, entry]) => {
    const word = normalizeWord(rawWord);
    if (!WORD_RE.test(word) || byWord.has(word)) return;

    const definition = pickEnglishDefinition(entry);
    if (!definition) return;

    byWord.set(word, {
      word,
      clue: makeClueFromDefinition({
        definition,
        normalizedWord: word,
        locale: "en"
      })
    });
  });

  const allEntries = [...byWord.values()].sort(compareEntries);
  return selectBalancedEntries(allEntries, TARGET_PER_LOCALE);
};

const findMissingInputFiles = () => (
  Object.values(INPUT_FILES).filter((filePath) => !fs.existsSync(filePath))
);

const buildBank = ({ spanishRows, englishRecords }) => {
  const es = buildSpanishBank(spanishRows);
  const en = buildEnglishBank(englishRecords);

  if (es.length < 12000 || en.length < 12000) {
    throw new Error(`Dataset too small after cleanup. es=${es.length} en=${en.length}`);
  }

  return { es, en };
};

const loadBankFromExistingGeneratedFile = async () => {
  if (!fs.existsSync(OUTPUT_FILE)) {
    return null;
  }

  const module = await import(`file://${OUTPUT_FILE.replace(/\\/g, "/")}`);
  const bank = module.CROSSWORD_REPO_STYLE_BANK;
  if (!bank?.es || !bank?.en) {
    return null;
  }

  const meta = module.CROSSWORD_REPO_STYLE_META || null;
  return { bank, meta };
};

const build = async () => {
  const missing = findMissingInputFiles();
  let bank;
  let meta;

  if (missing.length === 0) {
    const spanishRows = JSON.parse(fs.readFileSync(INPUT_FILES.es, "utf8"));
    if (!Array.isArray(spanishRows) || spanishRows.length === 0) {
      throw new Error("Spanish dataset is empty or invalid.");
    }

    const englishRecords = JSON.parse(fs.readFileSync(INPUT_FILES.en, "utf8"));
    if (!englishRecords || Array.isArray(englishRecords) || typeof englishRecords !== "object") {
      throw new Error("English dataset is empty or invalid.");
    }

    bank = buildBank({
      spanishRows,
      englishRecords
    });

    meta = {
      generatedAt: new Date().toISOString(),
      source: SOURCE_INFO,
      constraints: {
        targetPerLocale: TARGET_PER_LOCALE,
        minWordLength: MIN_WORD_LENGTH,
        maxWordLength: MAX_WORD_LENGTH,
        maxClueLength: MAX_CLUE_LENGTH
      },
      counts: {
        es: addLengthCounts(bank.es),
        en: addLengthCounts(bank.en)
      }
    };
  } else {
    const existing = await loadBankFromExistingGeneratedFile();
    if (!existing) {
      throw new Error(
        `Missing input datasets:\n${missing.join("\n")}\n\n` +
        "Download the files into tmp/crossword-bank-build before running this script."
      );
    }

    bank = existing.bank;
    meta = {
      generatedAt: new Date().toISOString(),
      source: existing.meta?.source || GENERATED_BANK_MIGRATION_SOURCE,
      constraints: existing.meta?.constraints || {
        targetPerLocale: TARGET_PER_LOCALE,
        minWordLength: MIN_WORD_LENGTH,
        maxWordLength: MAX_WORD_LENGTH,
        maxClueLength: MAX_CLUE_LENGTH
      },
      counts: existing.meta?.counts || {
        es: addLengthCounts(bank.es),
        en: addLengthCounts(bank.en)
      }
    };
  }

  fs.rmSync(OUTPUT_LOCALE_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_LOCALE_DIR, { recursive: true });

  Object.entries(bank).forEach(([locale, entries]) => {
    const localeFile = path.join(OUTPUT_LOCALE_DIR, `${locale}.generated.js`);
    const localeContent =
      "/* eslint-disable */\n" +
      "// Auto-generated by scripts/build_crossword_repo_style_bank.mjs\n" +
      `const CROSSWORD_REPO_STYLE_LOCALE_BANK = ${JSON.stringify(entries, null, 2)};\n\n` +
      "export default CROSSWORD_REPO_STYLE_LOCALE_BANK;\n";
    fs.writeFileSync(localeFile, localeContent, "utf8");
  });

  const fileContent =
    "/* eslint-disable */\n" +
    "// Auto-generated by scripts/build_crossword_repo_style_bank.mjs\n" +
    `export const CROSSWORD_REPO_STYLE_META = ${JSON.stringify(meta, null, 2)};\n\n` +
    "export const CROSSWORD_REPO_STYLE_LOCALE_LOADERS = {\n" +
    '  "es": () => import("./crosswordRepoStyleBankLocales/es.generated.js"),\n' +
    '  "en": () => import("./crosswordRepoStyleBankLocales/en.generated.js")\n' +
    "};\n\n" +
    "const LOCALE_CACHE = new Map();\n" +
    "const LOCALE_PROMISES = new Map();\n\n" +
    "const normalizeLocaleKey = (locale) => (String(locale || \"es\").toLowerCase().startsWith(\"es\") ? \"es\" : \"en\");\n\n" +
    "export const loadCrosswordRepoStyleLocale = async (locale) => {\n" +
    "  const localeKey = normalizeLocaleKey(locale);\n" +
    "  const loader = CROSSWORD_REPO_STYLE_LOCALE_LOADERS[localeKey];\n" +
    "  if (!loader) return [];\n" +
    "  if (LOCALE_CACHE.has(localeKey)) return LOCALE_CACHE.get(localeKey) ?? [];\n" +
    "  if (!LOCALE_PROMISES.has(localeKey)) {\n" +
    "    LOCALE_PROMISES.set(localeKey, loader().then((module) => {\n" +
    "      const localeEntries = module.default ?? [];\n" +
    "      LOCALE_CACHE.set(localeKey, localeEntries);\n" +
    "      return localeEntries;\n" +
    "    }));\n" +
    "  }\n" +
    "  return LOCALE_PROMISES.get(localeKey) ?? [];\n" +
    "};\n";

  fs.writeFileSync(OUTPUT_FILE, fileContent, "utf8");
  console.log(`Generated ${OUTPUT_FILE}`);
  console.log(`Generated locale files in ${OUTPUT_LOCALE_DIR}`);
  console.log(meta.counts);
};

await build();
