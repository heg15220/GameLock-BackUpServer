import fs from "node:fs";
import path from "node:path";
import { once } from "node:events";
import {
  CROSSWORD_REPO_STYLE_META,
  loadCrosswordRepoStyleLocale
} from "../src/games/knowledge/crosswordRepoStyleBank.generated.js";

const OUTPUT_ROOT = path.join(process.cwd(), "src", "games", "knowledge");
const WORD_BANK_FILE = path.join(OUTPUT_ROOT, "pasapalabraWordBank.generated.js");
const WORD_BANK_LOCALE_DIR = path.join(OUTPUT_ROOT, "pasapalabraWordBankLocales");
const MATCH_CACHE_FILE = path.join(OUTPUT_ROOT, "pasapalabraMatchCache.generated.js");
const MATCH_CACHE_SHARD_DIR = path.join(OUTPUT_ROOT, "pasapalabraMatchCacheShards");

const LOCALES = Object.freeze(["es", "en"]);
const TARGET_WORDS_PER_LOCALE = 10000;
const MATCH_COUNT_PER_LOCALE = 10000;
const SHARD_SIZE = 500;
const MIN_WORD_LENGTH = 3;
const MAX_WORD_LENGTH = 10;
const WORD_RE = /^[A-Z]{3,10}$/;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const normalizeAscii = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "");

const normalizeText = (value) => normalizeAscii(value)
  .replace(/\s+/g, " ")
  .trim();

const normalizeWord = (value) => normalizeAscii(value)
  .replace(/[^A-Za-z]/g, "")
  .toUpperCase();

const escapeRegExp = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const redactAnswer = (text, word) => {
  const safeText = normalizeText(text);
  const safeWord = String(word || "").toLowerCase();
  if (!safeText || !safeWord) return safeText;
  return safeText.replace(new RegExp(`\\b${escapeRegExp(safeWord)}\\b`, "ig"), "____");
};

const trimClue = (value, maxLength = 190) => {
  const safe = normalizeText(value);
  if (safe.length <= maxLength) return safe;
  const sliced = safe.slice(0, maxLength - 1);
  const boundary = Math.max(sliced.lastIndexOf(" "), sliced.lastIndexOf(","));
  return `${(boundary > 60 ? sliced.slice(0, boundary) : sliced).replace(/[,:; ]+$/g, "").trim()}...`;
};

const scoreClue = (clue, locale) => {
  const safe = normalizeText(clue);
  if (!safe) return -1000;
  let score = Math.min(160, safe.length);
  if (safe.length < 18) score -= 60;
  if (safe.length > 190) score -= 25;
  if (/^(?:u|v|morf)\./i.test(safe)) score -= 70;
  if (/\bu\.\b/i.test(safe)) score -= 35;
  if (locale === "es" && /\b(?:desus|p\. us|coloq)\./i.test(safe)) score -= 25;
  if (safe.split(" ").length < 4) score -= 35;
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

const pickFromBucket = (bucket, seed, usedWords) => {
  if (!bucket?.length) return null;
  const start = Math.abs(seed) % bucket.length;
  for (let offset = 0; offset < bucket.length; offset += 1) {
    const candidate = bucket[(start + offset) % bucket.length];
    if (!usedWords.has(candidate.word)) return candidate;
  }
  return null;
};

const buildWordBank = (locale, sourceEntries) => {
  const byWord = new Map();
  sourceEntries.forEach((entry) => {
    const word = normalizeWord(entry?.word);
    const clue = trimClue(redactAnswer(entry?.clue || "", word));
    if (!WORD_RE.test(word)) return;
    if (!clue || clue.length < 8) return;
    if (byWord.has(word)) return;
    byWord.set(word, {
      word,
      clue,
      first: word[0],
      letters: [...new Set(word.split(""))],
      length: word.length,
      quality: scoreClue(clue, locale)
    });
  });

  const entries = [...byWord.values()].sort((left, right) => {
    if (right.quality !== left.quality) return right.quality - left.quality;
    if (left.length !== right.length) return left.length - right.length;
    return left.word.localeCompare(right.word);
  });

  const byInitial = new Map(LETTERS.map((letter) => [letter, []]));
  entries.forEach((entry) => byInitial.get(entry.first)?.push(entry));

  const selected = [];
  const selectedWords = new Set();
  const cursors = new Map(LETTERS.map((letter) => [letter, 0]));
  while (selected.length < TARGET_WORDS_PER_LOCALE) {
    let addedInPass = false;
    for (const letter of LETTERS) {
      if (selected.length >= TARGET_WORDS_PER_LOCALE) break;
      const bucket = byInitial.get(letter) || [];
      let cursor = cursors.get(letter) || 0;
      while (cursor < bucket.length && selectedWords.has(bucket[cursor].word)) cursor += 1;
      if (cursor < bucket.length) {
        selected.push(bucket[cursor]);
        selectedWords.add(bucket[cursor].word);
        cursors.set(letter, cursor + 1);
        addedInPass = true;
      }
    }

    if (!addedInPass) break;
  }

  for (const entry of entries) {
    if (selected.length >= TARGET_WORDS_PER_LOCALE) break;
    if (!selectedWords.has(entry.word)) {
      selected.push(entry);
      selectedWords.add(entry.word);
    }
  }

  if (selected.length < TARGET_WORDS_PER_LOCALE) {
    throw new Error(`Not enough ${locale} entries for Pasapalabra bank: ${selected.length}`);
  }

  return selected
    .slice(0, TARGET_WORDS_PER_LOCALE)
    .sort((left, right) => left.word.localeCompare(right.word))
    .map((entry) => ({
      word: entry.word,
      clue: entry.clue
    }));
};

const buildLocaleContext = (entries) => {
  const normalized = entries.map((entry, index) => ({
    index,
    word: entry.word,
    clue: entry.clue,
    first: entry.word[0],
    letters: new Set(entry.word.split(""))
  }));
  const startsWith = new Map(LETTERS.map((letter) => [letter, []]));
  const contains = new Map(LETTERS.map((letter) => [letter, []]));

  normalized.forEach((entry) => {
    startsWith.get(entry.first)?.push(entry);
    entry.letters.forEach((letter) => {
      contains.get(letter)?.push(entry);
    });
  });

  return { entries: normalized, startsWith, contains };
};

const packQuestion = ({ letter, mode, entry, locale }) => {
  void locale;
  return [letter, mode === "starts" ? "S" : "C", entry.index];
};

const buildPackedMatch = ({ locale, context, matchId }) => {
  const usedWords = new Set();
  const rng = makeRng(mixSeed(hashText(`${locale}:pasapalabra`), matchId));
  const questions = LETTERS.map((letter, letterIndex) => {
    const baseSeed = mixSeed(matchId + 1, letter.charCodeAt(0) * 131 + letterIndex * 17);
    const preferStarts = rng() > 0.18;
    const startBucket = context.startsWith.get(letter) || [];
    const containsBucket = context.contains.get(letter) || [];
    const preferred = preferStarts
      ? pickFromBucket(startBucket, baseSeed, usedWords)
      : null;
    const fallback = preferred || pickFromBucket(containsBucket, mixSeed(baseSeed, 97), usedWords);
    const finalEntry = fallback || pickFromBucket(context.entries, mixSeed(baseSeed, 193), usedWords);
    if (!finalEntry) {
      throw new Error(`Unable to pick ${locale} question for letter ${letter} in match ${matchId}`);
    }
    usedWords.add(finalEntry.word);
    return packQuestion({
      letter,
      mode: finalEntry.first === letter ? "starts" : "contains",
      entry: finalEntry,
      locale
    });
  });

  return { q: questions };
};

const writeChunk = async (stream, chunk) => {
  if (stream.write(chunk)) return;
  await once(stream, "drain");
};

const shardFileName = (locale, shardIndex) => `${locale}-${String(shardIndex).padStart(2, "0")}.generated.js`;

const writeShardFile = async ({ locale, shardIndex, matches }) => {
  const filePath = path.join(MATCH_CACHE_SHARD_DIR, shardFileName(locale, shardIndex));
  const output = fs.createWriteStream(filePath, { encoding: "utf8" });
  await writeChunk(output, "/* eslint-disable */\n");
  await writeChunk(output, "// Auto-generated by scripts/build_pasapalabra_cache.mjs\n");
  await writeChunk(output, "const PASAPALABRA_MATCH_CACHE_SHARD = [\n");
  for (let index = 0; index < matches.length; index += 1) {
    await writeChunk(output, `  ${JSON.stringify(matches[index])}${index === matches.length - 1 ? "" : ","}\n`);
  }
  await writeChunk(output, "];\n\nexport default PASAPALABRA_MATCH_CACHE_SHARD;\n");
  output.end();
  await once(output, "finish");
};

const buildWordBankLoaderSource = (meta) => [
  "/* eslint-disable */\n",
  "// Auto-generated by scripts/build_pasapalabra_cache.mjs\n",
  `export const PASAPALABRA_WORD_BANK_META = ${JSON.stringify(meta, null, 2)};\n\n`,
  "export const PASAPALABRA_WORD_BANK_LOCALE_LOADERS = {\n",
  '  "es": () => import("./pasapalabraWordBankLocales/es.generated.js"),\n',
  '  "en": () => import("./pasapalabraWordBankLocales/en.generated.js")\n',
  "};\n\n",
  "const LOCALE_CACHE = new Map();\n",
  "const LOCALE_PROMISES = new Map();\n",
  "const normalizeLocaleKey = (locale) => (String(locale || \"es\").toLowerCase().startsWith(\"es\") ? \"es\" : \"en\");\n\n",
  "export const loadPasapalabraWordBankLocale = async (locale) => {\n",
  "  const localeKey = normalizeLocaleKey(locale);\n",
  "  const loader = PASAPALABRA_WORD_BANK_LOCALE_LOADERS[localeKey];\n",
  "  if (!loader) return [];\n",
  "  if (LOCALE_CACHE.has(localeKey)) return LOCALE_CACHE.get(localeKey) ?? [];\n",
  "  if (!LOCALE_PROMISES.has(localeKey)) {\n",
  "    LOCALE_PROMISES.set(localeKey, loader().then((module) => {\n",
  "      const entries = module.default ?? [];\n",
  "      LOCALE_CACHE.set(localeKey, entries);\n",
  "      return entries;\n",
  "    }));\n",
  "  }\n",
  "  return LOCALE_PROMISES.get(localeKey) ?? [];\n",
  "};\n"
].join("");

const buildMatchCacheLoaderSource = (meta) => {
  const shardCounts = Object.fromEntries(
    LOCALES.map((locale) => [locale, Math.ceil(MATCH_COUNT_PER_LOCALE / SHARD_SIZE)])
  );
  const localeLoaderBlocks = LOCALES.map((locale) => {
    const entries = Array.from({ length: shardCounts[locale] }, (_, shardIndex) => (
      `    ${shardIndex}: () => import("./pasapalabraMatchCacheShards/${shardFileName(locale, shardIndex)}")`
    )).join(",\n");
    return `  "${locale}": {\n${entries}\n  }`;
  }).join(",\n");

  return [
    "/* eslint-disable */\n",
    "// Auto-generated by scripts/build_pasapalabra_cache.mjs\n",
    `export const PASAPALABRA_MATCH_CACHE_META = ${JSON.stringify(meta, null, 2)};\n\n`,
    "export const PASAPALABRA_MATCH_CACHE_SHARD_LOADERS = {\n",
    localeLoaderBlocks,
    "\n};\n\n",
    "const SHARD_CACHE = new Map();\n",
    "const SHARD_PROMISES = new Map();\n",
    "const normalizeLocaleKey = (locale) => (String(locale || \"es\").toLowerCase().startsWith(\"es\") ? \"es\" : \"en\");\n",
    "const normalizeMatchId = (matchId) => {\n",
    "  const safe = Math.abs(Number(matchId) || 0);\n",
    "  const total = Number(PASAPALABRA_MATCH_CACHE_META?.constraints?.matchCountPerLocale || 0);\n",
    "  if (!total) return 0;\n",
    "  return safe % total;\n",
    "};\n",
    "const resolveShardIndex = (matchId) => Math.floor(normalizeMatchId(matchId) / Number(PASAPALABRA_MATCH_CACHE_META?.constraints?.shardSize || 1));\n",
    "const cacheKeyFor = (localeKey, shardIndex) => `${localeKey}:${shardIndex}`;\n\n",
    "export const loadPasapalabraMatchCacheShard = async (locale, matchId) => {\n",
    "  const localeKey = normalizeLocaleKey(locale);\n",
    "  const shardIndex = resolveShardIndex(matchId);\n",
    "  const loader = PASAPALABRA_MATCH_CACHE_SHARD_LOADERS[localeKey]?.[shardIndex];\n",
    "  if (!loader) return [];\n",
    "  const cacheKey = cacheKeyFor(localeKey, shardIndex);\n",
    "  if (SHARD_CACHE.has(cacheKey)) return SHARD_CACHE.get(cacheKey) ?? [];\n",
    "  if (!SHARD_PROMISES.has(cacheKey)) {\n",
    "    SHARD_PROMISES.set(cacheKey, loader().then((module) => {\n",
    "      const shard = module.default ?? [];\n",
    "      SHARD_CACHE.set(cacheKey, shard);\n",
    "      return shard;\n",
    "    }));\n",
    "  }\n",
    "  return SHARD_PROMISES.get(cacheKey) ?? [];\n",
    "};\n\n",
    "export const loadPasapalabraMatchCacheEntry = async (locale, matchId) => {\n",
    "  const safeMatchId = normalizeMatchId(matchId);\n",
    "  const shard = await loadPasapalabraMatchCacheShard(locale, safeMatchId);\n",
    "  if (!Array.isArray(shard) || shard.length === 0) return null;\n",
    "  const shardSize = Number(PASAPALABRA_MATCH_CACHE_META?.constraints?.shardSize || shard.length || 1);\n",
    "  return shard[safeMatchId % shardSize] ?? null;\n",
    "};\n"
  ].join("");
};

const addInitialCounts = (entries) => {
  const counts = Object.fromEntries(LETTERS.map((letter) => [letter, 0]));
  entries.forEach((entry) => {
    counts[entry.word[0]] = (counts[entry.word[0]] || 0) + 1;
  });
  return counts;
};

const build = async () => {
  const source = {
    es: await loadCrosswordRepoStyleLocale("es"),
    en: await loadCrosswordRepoStyleLocale("en")
  };
  const wordBank = {
    es: buildWordBank("es", source.es),
    en: buildWordBank("en", source.en)
  };

  fs.rmSync(WORD_BANK_LOCALE_DIR, { recursive: true, force: true });
  fs.mkdirSync(WORD_BANK_LOCALE_DIR, { recursive: true });
  for (const locale of LOCALES) {
    fs.writeFileSync(
      path.join(WORD_BANK_LOCALE_DIR, `${locale}.generated.js`),
      "/* eslint-disable */\n" +
        "// Auto-generated by scripts/build_pasapalabra_cache.mjs\n" +
        `const PASAPALABRA_WORD_BANK_LOCALE = ${JSON.stringify(wordBank[locale])};\n\n` +
        "export default PASAPALABRA_WORD_BANK_LOCALE;\n",
      "utf8"
    );
  }

  const wordMeta = {
    generatedAt: new Date().toISOString(),
    source: {
      script: "scripts/build_pasapalabra_cache.mjs",
      sourceBank: "src/games/knowledge/crosswordRepoStyleBank.generated.js",
      sourceBankGeneratedAt: CROSSWORD_REPO_STYLE_META?.generatedAt || null,
      sourceBankDatasets: CROSSWORD_REPO_STYLE_META?.source?.datasets || null
    },
    constraints: {
      targetWordsPerLocale: TARGET_WORDS_PER_LOCALE,
      minWordLength: MIN_WORD_LENGTH,
      maxWordLength: MAX_WORD_LENGTH,
      letters: LETTERS.join("")
    },
    counts: {
      es: { total: wordBank.es.length, byInitial: addInitialCounts(wordBank.es) },
      en: { total: wordBank.en.length, byInitial: addInitialCounts(wordBank.en) }
    }
  };
  fs.writeFileSync(WORD_BANK_FILE, buildWordBankLoaderSource(wordMeta), "utf8");

  const contexts = {
    es: buildLocaleContext(wordBank.es),
    en: buildLocaleContext(wordBank.en)
  };
  const stats = {
    es: { starts: 0, contains: 0, questions: 0 },
    en: { starts: 0, contains: 0, questions: 0 }
  };

  fs.rmSync(MATCH_CACHE_SHARD_DIR, { recursive: true, force: true });
  fs.mkdirSync(MATCH_CACHE_SHARD_DIR, { recursive: true });
  for (const locale of LOCALES) {
    const shardMatches = [];
    for (let matchId = 0; matchId < MATCH_COUNT_PER_LOCALE; matchId += 1) {
      const packed = buildPackedMatch({ locale, context: contexts[locale], matchId });
      packed.q.forEach((question) => {
        if (question[1] === "S") stats[locale].starts += 1;
        else stats[locale].contains += 1;
        stats[locale].questions += 1;
      });
      shardMatches.push(packed);
      if (shardMatches.length === SHARD_SIZE || matchId === MATCH_COUNT_PER_LOCALE - 1) {
        await writeShardFile({
          locale,
          shardIndex: Math.floor(matchId / SHARD_SIZE),
          matches: shardMatches
        });
        shardMatches.length = 0;
      }
      if ((matchId + 1) % 1000 === 0) {
        console.log(`[${locale}] generated ${matchId + 1}/${MATCH_COUNT_PER_LOCALE} Pasapalabra matches`);
      }
    }
  }

  const matchMeta = {
    generatedAt: new Date().toISOString(),
    source: {
      script: "scripts/build_pasapalabra_cache.mjs",
      wordBankGeneratedAt: wordMeta.generatedAt
    },
    constraints: {
      matchCountPerLocale: MATCH_COUNT_PER_LOCALE,
      shardSize: SHARD_SIZE,
      letters: LETTERS.join(""),
      questionsPerMatch: LETTERS.length
    },
    shards: Object.fromEntries(
      LOCALES.map((locale) => [locale, Math.ceil(MATCH_COUNT_PER_LOCALE / SHARD_SIZE)])
    ),
    format: {
      matchShape: "{ q: questions }",
      questionShape: "[letter, mode, wordBankIndex]",
      modeValues: { S: "starts with", C: "contains" }
    },
    stats
  };
  fs.writeFileSync(MATCH_CACHE_FILE, buildMatchCacheLoaderSource(matchMeta), "utf8");

  console.log(`Generated ${WORD_BANK_FILE}`);
  console.log(`Generated word bank locales in ${WORD_BANK_LOCALE_DIR}`);
  console.log(`Generated ${MATCH_CACHE_FILE}`);
  console.log(`Generated match cache shards in ${MATCH_CACHE_SHARD_DIR}`);
  console.log(JSON.stringify({
    words: { es: wordBank.es.length, en: wordBank.en.length },
    matches: { es: MATCH_COUNT_PER_LOCALE, en: MATCH_COUNT_PER_LOCALE },
    questions: { es: stats.es.questions, en: stats.en.questions }
  }, null, 2));
};

await build();
