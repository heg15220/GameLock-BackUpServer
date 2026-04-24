import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const knowledgeDir = path.join(repoRoot, "src", "games", "knowledge");
const knowledgeWordLocalesDir = path.join(knowledgeDir, "knowledgeWordBankLocales");
const hangmanWordLocalesDir = path.join(knowledgeDir, "hangmanWordBankLocales");

const KNOWLEDGE_WORD_TARGET_COUNT = 10000;
const LOCALES = ["es", "en"];

const normalizeWordleWord = (value) => (
  String(value || "")
    .normalize("NFD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase()
);

const normalizeHangmanWord = (value) => String(value || "").trim().toUpperCase();
const normalizeClue = (value) => String(value || "").trim();
const MAX_COMPACT_CLUE_LENGTH = 72;

const compactClue = (value) => {
  const normalized = normalizeClue(value).replace(/\s+/g, " ");
  if (!normalized) return "";

  const sentenceBreakIndex = normalized.search(/[.;:](\s|$)/);
  let compact = sentenceBreakIndex >= 24
    ? normalized.slice(0, sentenceBreakIndex)
    : normalized;

  compact = compact.trim();
  if (compact.length <= MAX_COMPACT_CLUE_LENGTH) {
    return compact;
  }

  return `${compact.slice(0, MAX_COMPACT_CLUE_LENGTH - 3).trimEnd()}...`;
};

const compareWordleEntries = (left, right) => {
  if (left.word.length !== right.word.length) {
    return left.word.length - right.word.length;
  }
  return left.word.localeCompare(right.word);
};

const formatGeneratedModule = (constName, value, comment) => {
  const payload = JSON.stringify(value);
  return `// ${comment}\nexport const ${constName} = Object.freeze(${payload});\n`;
};

const formatLocaleEntriesModule = (entries, comment) => (
  `/* eslint-disable */\n`
  + `// ${comment}\n`
  + `export default Object.freeze(${JSON.stringify(entries)});\n`
);

const formatLocaleLoaderModule = ({
  comment,
  metaConstName,
  meta,
  loaderConstName,
  loaderDir,
  loaderFnName,
}) => (
  `/* eslint-disable */\n`
  + `// ${comment}\n`
  + `export const ${metaConstName} = ${JSON.stringify(meta, null, 2)};\n\n`
  + `export const ${loaderConstName} = {\n`
  + `  "es": () => import("./${loaderDir}/es.generated.js"),\n`
  + `  "en": () => import("./${loaderDir}/en.generated.js")\n`
  + `};\n\n`
  + `const LOCALE_CACHE = new Map();\n`
  + `const LOCALE_PROMISES = new Map();\n\n`
  + `const normalizeLocaleKey = (locale) => (String(locale || "es").toLowerCase().startsWith("es") ? "es" : "en");\n\n`
  + `export const ${loaderFnName} = async (locale) => {\n`
  + `  const localeKey = normalizeLocaleKey(locale);\n`
  + `  const loader = ${loaderConstName}[localeKey];\n`
  + `  if (!loader) return [];\n`
  + `  if (LOCALE_CACHE.has(localeKey)) return LOCALE_CACHE.get(localeKey) ?? [];\n`
  + `  if (!LOCALE_PROMISES.has(localeKey)) {\n`
  + `    LOCALE_PROMISES.set(localeKey, loader().then((module) => {\n`
  + `      const localeEntries = module.default ?? [];\n`
  + `      LOCALE_CACHE.set(localeKey, localeEntries);\n`
  + `      return localeEntries;\n`
  + `    }));\n`
  + `  }\n`
  + `  return LOCALE_PROMISES.get(localeKey) ?? [];\n`
  + `};\n`
);

const countOverlap = (leftValues, rightValues) => {
  const right = rightValues instanceof Set ? rightValues : new Set(rightValues);
  return [...leftValues].reduce((count, value) => count + (right.has(value) ? 1 : 0), 0);
};

const buildWordleLocaleEntries = (entries, forbiddenWords = null) => {
  const byWord = new Map();

  entries.forEach((entry) => {
    const word = normalizeWordleWord(entry?.word);
    if (!/^[A-Z]{5,10}$/.test(word)) return;
    if (forbiddenWords?.has(word)) return;

    const clue = compactClue(entry?.clue);
    if (!clue) return;

    if (!byWord.has(word)) {
      byWord.set(word, { word, clue });
    }
  });

  const ordered = [...byWord.values()].sort(compareWordleEntries);
  if (ordered.length < KNOWLEDGE_WORD_TARGET_COUNT) {
    throw new Error(
      `Wordle bank has ${ordered.length} entries and cannot satisfy ${KNOWLEDGE_WORD_TARGET_COUNT}.`
    );
  }

  return ordered.slice(0, KNOWLEDGE_WORD_TARGET_COUNT);
};

const buildHangmanLocaleEntries = (entries, forbiddenWords = null) => {
  const byWord = new Map();

  entries.forEach((entry) => {
    const word = normalizeHangmanWord(entry?.word);
    const clue = compactClue(entry?.clue);
    if (!/^[A-Z]{3,10}$/.test(word)) return;
    if (!clue) return;
    if (forbiddenWords?.has(word)) return;

    if (!byWord.has(word)) {
      byWord.set(word, { word, clue });
    }
  });

  const ordered = [...byWord.values()];
  if (ordered.length < KNOWLEDGE_WORD_TARGET_COUNT) {
    throw new Error(
      `Hangman bank has ${ordered.length} entries and cannot satisfy ${KNOWLEDGE_WORD_TARGET_COUNT}.`
    );
  }

  return ordered.slice(0, KNOWLEDGE_WORD_TARGET_COUNT);
};

const main = async () => {
  const { loadCrosswordRepoStyleLocale } = await import("../src/games/knowledge/crosswordRepoStyleBank.generated.js");
  const [crosswordEs, crosswordEn] = await Promise.all([
    loadCrosswordRepoStyleLocale("es"),
    loadCrosswordRepoStyleLocale("en")
  ]);

  const wordleEs = buildWordleLocaleEntries(crosswordEs || []);
  const wordleEsWords = new Set(wordleEs.map((entry) => entry.word));
  const wordleEn = buildWordleLocaleEntries(crosswordEn || [], wordleEsWords);
  const wordleEnWords = new Set(wordleEn.map((entry) => entry.word));

  const hangmanEs = buildHangmanLocaleEntries(crosswordEs || []);
  const hangmanEsWords = new Set(hangmanEs.map((entry) => entry.word));
  const hangmanEn = buildHangmanLocaleEntries(crosswordEn || [], hangmanEsWords);
  const hangmanEnWords = new Set(hangmanEn.map((entry) => entry.word));

  const wordlePayload = {
    es: wordleEs,
    en: wordleEn,
    meta: {
      counts: {
        es: wordleEs.length,
        en: wordleEn.length
      },
      overlapCount: countOverlap(wordleEsWords, wordleEnWords),
      source: "crosswordRepoStyleBank"
    }
  };

  const hangmanPayload = {
    es: hangmanEs,
    en: hangmanEn,
    meta: {
      counts: {
        es: hangmanEs.length,
        en: hangmanEn.length
      },
      overlapCount: countOverlap(hangmanEsWords, hangmanEnWords),
      source: "crosswordRepoStyleBank"
    }
  };

  await fs.mkdir(knowledgeWordLocalesDir, { recursive: true });
  await fs.mkdir(hangmanWordLocalesDir, { recursive: true });

  await fs.writeFile(
    path.join(knowledgeDir, "knowledgeWordBank.generated.js"),
    formatLocaleLoaderModule({
      comment: "Auto-generated by scripts/generate-knowledge-word-banks.mjs",
      metaConstName: "KNOWLEDGE_WORD_BANK_META",
      meta: wordlePayload.meta,
      loaderConstName: "KNOWLEDGE_WORD_BANK_LOCALE_LOADERS",
      loaderDir: "knowledgeWordBankLocales",
      loaderFnName: "loadKnowledgeWordBankLocale",
    }),
    "utf8"
  );

  await fs.writeFile(
    path.join(knowledgeWordLocalesDir, "es.generated.js"),
    formatLocaleEntriesModule(
      wordleEs,
      "Generated by scripts/generate-knowledge-word-banks.mjs. Do not edit manually."
    ),
    "utf8"
  );

  await fs.writeFile(
    path.join(knowledgeWordLocalesDir, "en.generated.js"),
    formatLocaleEntriesModule(
      wordleEn,
      "Generated by scripts/generate-knowledge-word-banks.mjs. Do not edit manually."
    ),
    "utf8"
  );

  await fs.writeFile(
    path.join(knowledgeDir, "hangmanWordBank.generated.js"),
    formatLocaleLoaderModule({
      comment: "Auto-generated by scripts/generate-knowledge-word-banks.mjs",
      metaConstName: "HANGMAN_WORD_BANK_META",
      meta: hangmanPayload.meta,
      loaderConstName: "HANGMAN_WORD_BANK_LOCALE_LOADERS",
      loaderDir: "hangmanWordBankLocales",
      loaderFnName: "loadHangmanWordBankLocale",
    }),
    "utf8"
  );

  await fs.writeFile(
    path.join(hangmanWordLocalesDir, "es.generated.js"),
    formatLocaleEntriesModule(
      hangmanEs,
      "Generated by scripts/generate-knowledge-word-banks.mjs. Do not edit manually."
    ),
    "utf8"
  );

  await fs.writeFile(
    path.join(hangmanWordLocalesDir, "en.generated.js"),
    formatLocaleEntriesModule(
      hangmanEn,
      "Generated by scripts/generate-knowledge-word-banks.mjs. Do not edit manually."
    ),
    "utf8"
  );

  console.log(JSON.stringify({
    wordle: wordlePayload.meta,
    hangman: hangmanPayload.meta
  }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
