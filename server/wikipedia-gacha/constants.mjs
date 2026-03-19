export const PACK_SIZE = 5;
export const DEFAULT_MAX_PACKS = 10;
export const DEFAULT_STARTING_PACKS = 10;
export const PACK_REGEN_INTERVAL_MS = 60 * 1000;
export const PITY_THRESHOLD = 10;
export const MAX_STAT_VALUE = 15000;
export const STORAGE_VERSION = 1;

export const RARITY_ORDER = ["C", "UC", "R", "SR", "SSR", "UR", "LR"];
export const RARITY_MULTIPLIERS = {
  C: 0.8,
  UC: 0.9,
  R: 1,
  SR: 1.15,
  SSR: 1.3,
  UR: 1.5,
  LR: 1.8,
};

export const STANDARD_RARITY_WEIGHTS = [
  { rarity: "C", weight: 32 },
  { rarity: "UC", weight: 23 },
  { rarity: "R", weight: 20 },
  { rarity: "SR", weight: 13 },
  { rarity: "SSR", weight: 7 },
  { rarity: "UR", weight: 4 },
  { rarity: "LR", weight: 1 },
];

export const GUARANTEED_SR_PLUS_WEIGHTS = [
  { rarity: "SR", weight: 58 },
  { rarity: "SSR", weight: 25 },
  { rarity: "UR", weight: 13 },
  { rarity: "LR", weight: 4 },
];

export const DUPLICATE_SHARDS_BY_RARITY = {
  C: 5,
  UC: 8,
  R: 12,
  SR: 20,
  SSR: 32,
  UR: 50,
  LR: 80,
};

export const RECOVERY_CODE_PREFIX = "WKVLT";

export function getRarityFromQScore(score) {
  if (score >= 100) return "LR";
  if (score >= 90) return "UR";
  if (score >= 80) return "SSR";
  if (score >= 60) return "SR";
  if (score >= 35) return "R";
  if (score >= 20) return "UC";
  return "C";
}

export function compareRarity(left, right) {
  return RARITY_ORDER.indexOf(left) - RARITY_ORDER.indexOf(right);
}

function capStat(value) {
  return Math.min(MAX_STAT_VALUE, Math.max(0, Math.round(value)));
}

function computeAtk(pageviews30d, rarityCode) {
  const multiplier = RARITY_MULTIPLIERS[rarityCode] ?? 1;
  return capStat((pageviews30d / 45) * multiplier);
}

function computeDef(contentLength, sectionCount, referenceCount, rarityCode) {
  const multiplier = RARITY_MULTIPLIERS[rarityCode] ?? 1;
  const base =
    contentLength * 0.45 + sectionCount * 55 + referenceCount * 22;
  return capStat(base * multiplier);
}

function articleUrl(slug) {
  return `https://en.wikipedia.org/wiki/${slug}`;
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function buildExtendedExtract(seed) {
  return normalizeText(seed.extractText || seed.flavorText || "Wikipedia article.");
}

function buildArticle(seed, index) {
  const rarityCode = seed.rarityCode ?? getRarityFromQScore(seed.qualityScore);
  return {
    id: index + 1,
    wikipediaPageId: seed.wikipediaPageId,
    wikipediaTitle: seed.title,
    wikipediaSlug: seed.slug,
    languageCode: "en",
    sourceUrl: articleUrl(seed.slug),
    imageUrl: seed.imageUrl ?? null,
    extractText: buildExtendedExtract(seed),
    contentLength: seed.contentLength,
    sectionCount: seed.sectionCount,
    referenceCount: seed.referenceCount,
    pageviews30d: seed.pageviews30d,
    qualityScore: seed.qualityScore,
    rarityCode,
    atk: computeAtk(seed.pageviews30d, rarityCode),
    defStat: computeDef(
      seed.contentLength,
      seed.sectionCount,
      seed.referenceCount,
      rarityCode
    ),
    flavorText: seed.flavorText ?? null,
    topicGroup: seed.topicGroup,
    categories: seed.categories,
    isActive: true,
  };
}

const ARTICLE_SEEDS = [
  {
    wikipediaPageId: 1001,
    title: "Abacus",
    slug: "Abacus",
    extractText: "Manual counting frame used for arithmetic operations.",
    contentLength: 3800,
    sectionCount: 6,
    referenceCount: 28,
    pageviews30d: 76000,
    qualityScore: 12,
    topicGroup: "Mathematics",
    categories: ["Computation", "Ancient tools"],
  },
  {
    wikipediaPageId: 1002,
    title: "Papyrus",
    slug: "Papyrus",
    extractText: "Writing material used in the ancient Mediterranean world.",
    contentLength: 4200,
    sectionCount: 5,
    referenceCount: 31,
    pageviews30d: 84000,
    qualityScore: 15,
    topicGroup: "History",
    categories: ["Ancient Egypt", "Writing"],
  },
  {
    wikipediaPageId: 1003,
    title: "Ink",
    slug: "Ink",
    extractText: "Pigmented fluid used for writing, drawing, and printing.",
    contentLength: 3600,
    sectionCount: 5,
    referenceCount: 26,
    pageviews30d: 65000,
    qualityScore: 10,
    topicGroup: "Materials",
    categories: ["Design", "Writing"],
  },
  {
    wikipediaPageId: 1004,
    title: "Lantern",
    slug: "Lantern",
    extractText: "Portable light source enclosed in a protective frame.",
    contentLength: 3300,
    sectionCount: 4,
    referenceCount: 24,
    pageviews30d: 58000,
    qualityScore: 8,
    topicGroup: "Design",
    categories: ["Lighting", "Craft"],
  },
  {
    wikipediaPageId: 1005,
    title: "Compass",
    slug: "Compass",
    extractText: "Navigation instrument that shows direction relative to north.",
    contentLength: 6200,
    sectionCount: 8,
    referenceCount: 44,
    pageviews30d: 145000,
    qualityScore: 22,
    topicGroup: "Geography",
    categories: ["Navigation", "Exploration"],
  },
  {
    wikipediaPageId: 1006,
    title: "Morse code",
    slug: "Morse_code",
    extractText: "Encoding system that transmits text using dots and dashes.",
    contentLength: 5900,
    sectionCount: 7,
    referenceCount: 39,
    pageviews30d: 138000,
    qualityScore: 24,
    topicGroup: "Technology",
    categories: ["Communication", "Signals"],
  },
  {
    wikipediaPageId: 1007,
    title: "Sundial",
    slug: "Sundial",
    extractText: "Timekeeping device that tells time by the position of the sun.",
    contentLength: 5200,
    sectionCount: 6,
    referenceCount: 37,
    pageviews30d: 112000,
    qualityScore: 26,
    topicGroup: "Astronomy",
    categories: ["Timekeeping", "History of science"],
  },
  {
    wikipediaPageId: 1008,
    title: "Lighthouse",
    slug: "Lighthouse",
    extractText: "Coastal tower that guides ships with visible signals.",
    contentLength: 7000,
    sectionCount: 9,
    referenceCount: 54,
    pageviews30d: 172000,
    qualityScore: 31,
    topicGroup: "Architecture",
    categories: ["Navigation", "Coasts"],
  },
  {
    wikipediaPageId: 1009,
    title: "Atlas",
    slug: "Atlas",
    extractText: "Collection of maps assembled into a reference volume.",
    contentLength: 7600,
    sectionCount: 10,
    referenceCount: 49,
    pageviews30d: 183000,
    qualityScore: 37,
    topicGroup: "Geography",
    categories: ["Cartography", "Reference"],
  },
  {
    wikipediaPageId: 1010,
    title: "Fibonacci number",
    slug: "Fibonacci_number",
    extractText: "Integer sequence where each number sums the previous two.",
    contentLength: 8100,
    sectionCount: 8,
    referenceCount: 58,
    pageviews30d: 196000,
    qualityScore: 39,
    topicGroup: "Mathematics",
    categories: ["Sequences", "Number theory"],
  },
  {
    wikipediaPageId: 1011,
    title: "Volcano",
    slug: "Volcano",
    extractText: "Geological rupture where magma reaches the surface.",
    contentLength: 9300,
    sectionCount: 12,
    referenceCount: 67,
    pageviews30d: 242000,
    qualityScore: 42,
    topicGroup: "Science",
    categories: ["Geology", "Natural hazards"],
  },
  {
    wikipediaPageId: 1012,
    title: "Steam engine",
    slug: "Steam_engine",
    extractText: "Heat engine that performs mechanical work using steam.",
    contentLength: 8800,
    sectionCount: 10,
    referenceCount: 61,
    pageviews30d: 221000,
    qualityScore: 47,
    topicGroup: "Engineering",
    categories: ["Industrial Revolution", "Machines"],
  },
  {
    wikipediaPageId: 1013,
    title: "Antarctica",
    slug: "Antarctica",
    extractText: "Earth's southernmost continent surrounding the South Pole.",
    contentLength: 11800,
    sectionCount: 14,
    referenceCount: 96,
    pageviews30d: 312000,
    qualityScore: 54,
    topicGroup: "Geography",
    categories: ["Climate", "Polar regions"],
  },
  {
    wikipediaPageId: 1014,
    title: "Chess",
    slug: "Chess",
    extractText: "Two-player strategy board game played on a checkered board.",
    contentLength: 12700,
    sectionCount: 16,
    referenceCount: 103,
    pageviews30d: 405000,
    qualityScore: 67,
    topicGroup: "Games",
    categories: ["Strategy", "Board games"],
  },
  {
    wikipediaPageId: 1015,
    title: "Pacific Ocean",
    slug: "Pacific_Ocean",
    extractText: "Largest and deepest of Earth's oceanic divisions.",
    contentLength: 11400,
    sectionCount: 15,
    referenceCount: 88,
    pageviews30d: 358000,
    qualityScore: 63,
    topicGroup: "Geography",
    categories: ["Oceans", "Earth science"],
  },
  {
    wikipediaPageId: 1016,
    title: "Photosynthesis",
    slug: "Photosynthesis",
    extractText: "Process by which plants and algae convert light into energy.",
    contentLength: 12100,
    sectionCount: 14,
    referenceCount: 105,
    pageviews30d: 347000,
    qualityScore: 62,
    topicGroup: "Science",
    categories: ["Biology", "Plants"],
  },
  {
    wikipediaPageId: 1017,
    title: "Apollo 11",
    slug: "Apollo_11",
    extractText: "Spaceflight that first landed humans on the Moon.",
    contentLength: 14800,
    sectionCount: 17,
    referenceCount: 130,
    pageviews30d: 492000,
    qualityScore: 71,
    topicGroup: "History",
    categories: ["NASA", "Spaceflight"],
  },
  {
    wikipediaPageId: 1018,
    title: "Ancient Rome",
    slug: "Ancient_Rome",
    extractText: "Civilization centered on the city of Rome in antiquity.",
    contentLength: 15400,
    sectionCount: 19,
    referenceCount: 124,
    pageviews30d: 438000,
    qualityScore: 75,
    topicGroup: "History",
    categories: ["Empire", "Classical antiquity"],
  },
  {
    wikipediaPageId: 1019,
    title: "Machine learning",
    slug: "Machine_learning",
    extractText: "Field of study that gives computers the ability to learn from data.",
    contentLength: 14100,
    sectionCount: 18,
    referenceCount: 141,
    pageviews30d: 512000,
    qualityScore: 78,
    topicGroup: "Technology",
    categories: ["Artificial intelligence", "Computer science"],
  },
  {
    wikipediaPageId: 1020,
    title: "Ada Lovelace",
    slug: "Ada_Lovelace",
    extractText: "English mathematician known for early work on computation.",
    contentLength: 13600,
    sectionCount: 16,
    referenceCount: 134,
    pageviews30d: 468000,
    qualityScore: 84,
    topicGroup: "Science",
    categories: ["Computing", "Biography"],
    flavorText:
      "She saw an engine of numbers and imagined a machine of ideas.",
  },
  {
    wikipediaPageId: 1021,
    title: "Marie Curie",
    slug: "Marie_Curie",
    extractText: "Physicist and chemist who pioneered research on radioactivity.",
    contentLength: 15100,
    sectionCount: 17,
    referenceCount: 148,
    pageviews30d: 544000,
    qualityScore: 87,
    topicGroup: "Science",
    categories: ["Chemistry", "Physics"],
    flavorText:
      "Few names glow brighter where science and resolve meet.",
  },
  {
    wikipediaPageId: 1022,
    title: "Mona Lisa",
    slug: "Mona_Lisa",
    extractText: "Portrait painting by Leonardo da Vinci housed in the Louvre.",
    contentLength: 13200,
    sectionCount: 15,
    referenceCount: 118,
    pageviews30d: 618000,
    qualityScore: 83,
    topicGroup: "Art",
    categories: ["Painting", "Renaissance"],
    flavorText:
      "A single smile that turned an entire museum into its frame.",
  },
  {
    wikipediaPageId: 1023,
    title: "Black hole",
    slug: "Black_hole",
    extractText: "Region of spacetime where gravity is so strong that nothing escapes.",
    contentLength: 15800,
    sectionCount: 20,
    referenceCount: 156,
    pageviews30d: 671000,
    qualityScore: 88,
    topicGroup: "Science",
    categories: ["Astrophysics", "Relativity"],
    flavorText:
      "The card does not consume the page. It bends the room around it.",
  },
  {
    wikipediaPageId: 1024,
    title: "Internet",
    slug: "Internet",
    extractText: "Global system of interconnected computer networks.",
    contentLength: 16400,
    sectionCount: 18,
    referenceCount: 163,
    pageviews30d: 733000,
    qualityScore: 82,
    topicGroup: "Technology",
    categories: ["Networking", "Infrastructure"],
    flavorText:
      "Invisible roads, impossible scale, and the whole planet on the wire.",
  },
  {
    wikipediaPageId: 1025,
    title: "DNA",
    slug: "DNA",
    extractText: "Molecule that carries hereditary information in living organisms.",
    contentLength: 14900,
    sectionCount: 18,
    referenceCount: 159,
    pageviews30d: 566000,
    qualityScore: 81,
    topicGroup: "Science",
    categories: ["Genetics", "Biochemistry"],
    flavorText:
      "A helix of instructions, folded small enough to fit inside wonder.",
  },
  {
    wikipediaPageId: 1026,
    title: "Leonardo da Vinci",
    slug: "Leonardo_da_Vinci",
    extractText: "Italian polymath of the High Renaissance.",
    contentLength: 17600,
    sectionCount: 21,
    referenceCount: 171,
    pageviews30d: 748000,
    qualityScore: 94,
    topicGroup: "Art",
    categories: ["Biography", "Renaissance"],
    flavorText:
      "Every discipline in the deck feels like one of his unfinished sketches.",
  },
  {
    wikipediaPageId: 1027,
    title: "Solar System",
    slug: "Solar_System",
    extractText: "Gravitationally bound system of the Sun and objects that orbit it.",
    contentLength: 18200,
    sectionCount: 22,
    referenceCount: 184,
    pageviews30d: 829000,
    qualityScore: 93,
    topicGroup: "Science",
    categories: ["Astronomy", "Planets"],
    flavorText:
      "Not a card, a map of every path light takes to come back home.",
  },
  {
    wikipediaPageId: 1028,
    title: "The Beatles",
    slug: "The_Beatles",
    extractText: "English rock band that shaped popular music worldwide.",
    contentLength: 17100,
    sectionCount: 19,
    referenceCount: 168,
    pageviews30d: 807000,
    qualityScore: 91,
    topicGroup: "Culture",
    categories: ["Music", "Pop culture"],
    flavorText:
      "Four names, one signal. The whole century still hums the chorus.",
  },
  {
    wikipediaPageId: 1029,
    title: "United States",
    slug: "United_States",
    extractText: "Federal republic of fifty states in North America.",
    contentLength: 19400,
    sectionCount: 24,
    referenceCount: 201,
    pageviews30d: 905000,
    qualityScore: 92,
    topicGroup: "Geography",
    categories: ["Politics", "Countries"],
    flavorText:
      "An article so broad it plays like a continent-sized event banner.",
  },
  {
    wikipediaPageId: 1030,
    title: "Albert Einstein",
    slug: "Albert_Einstein",
    extractText: "Theoretical physicist who developed the theory of relativity.",
    contentLength: 20500,
    sectionCount: 25,
    referenceCount: 228,
    pageviews30d: 1014000,
    qualityScore: 100,
    topicGroup: "Science",
    categories: ["Physics", "Biography"],
    flavorText:
      "The room tilts. Time stretches. Even the pack odds feel relative now.",
  },
  {
    wikipediaPageId: 1031,
    title: "World War II",
    slug: "World_War_II",
    extractText: "Global conflict fought between 1939 and 1945.",
    contentLength: 22600,
    sectionCount: 27,
    referenceCount: 246,
    pageviews30d: 1085000,
    qualityScore: 100,
    topicGroup: "History",
    categories: ["Conflict", "20th century"],
    flavorText:
      "Its scale is so vast the whole collection feels smaller around it.",
  },
];

export const ARTICLES = ARTICLE_SEEDS.map(buildArticle);

export const MISSIONS = [
  {
    id: 1,
    code: "open-1-pack",
    title: "Archivist Warm-up",
    description: "Open 1 pack.",
    rewardType: "gems",
    rewardAmount: 50,
    missionScope: "daily",
    targetType: "packs_opened",
    targetValue: 1,
    isActive: true,
  },
  {
    id: 2,
    code: "open-3-packs",
    title: "Deep Pull Session",
    description: "Open 3 packs in a single day.",
    rewardType: "shards",
    rewardAmount: 120,
    missionScope: "daily",
    targetType: "packs_opened",
    targetValue: 3,
    isActive: true,
  },
  {
    id: 3,
    code: "collect-2-new",
    title: "Fresh Discoveries",
    description: "Get 2 new cards today.",
    rewardType: "gems",
    rewardAmount: 90,
    missionScope: "daily",
    targetType: "new_cards_obtained",
    targetValue: 2,
    isActive: true,
  },
  {
    id: 4,
    code: "pull-sr-plus",
    title: "Quality Spike",
    description: "Obtain 1 SR or higher card.",
    rewardType: "shards",
    rewardAmount: 160,
    missionScope: "daily",
    targetType: "sr_or_higher_count",
    targetValue: 1,
    isActive: true,
  },
  {
    id: 5,
    code: "click-wikipedia",
    title: "Open The Source",
    description: "Visit 1 article on Wikipedia.",
    rewardType: "gems",
    rewardAmount: 40,
    missionScope: "daily",
    targetType: "wikipedia_clicks",
    targetValue: 1,
    isActive: true,
  },
  {
    id: 6,
    code: "favorite-1-card",
    title: "Curator's Pick",
    description: "Mark 1 favorite card.",
    rewardType: "shards",
    rewardAmount: 70,
    missionScope: "daily",
    targetType: "favorites_marked",
    targetValue: 1,
    isActive: true,
  },
];

export const TROPHIES = [
  {
    id: 1,
    code: "first-card",
    name: "First Pull",
    description: "Obtain your first card.",
    iconKey: "spark",
    points: 10,
  },
  {
    id: 2,
    code: "first-sr",
    name: "Signal Flare",
    description: "Obtain your first SR or higher card.",
    iconKey: "flare",
    points: 20,
  },
  {
    id: 3,
    code: "first-ssr",
    name: "Golden Abstract",
    description: "Obtain your first SSR or higher card.",
    iconKey: "gold-frame",
    points: 35,
  },
  {
    id: 4,
    code: "unique-15",
    name: "Mini Library",
    description: "Collect 15 unique cards.",
    iconKey: "shelf",
    points: 40,
  },
  {
    id: 5,
    code: "duplicates-10",
    name: "Archive Echo",
    description: "Accumulate 10 duplicate copies.",
    iconKey: "echo",
    points: 25,
  },
  {
    id: 6,
    code: "science-collector",
    name: "Science Curator",
    description: "Collect 6 Science cards.",
    iconKey: "atom",
    points: 30,
  },
  {
    id: 7,
    code: "history-collector",
    name: "History Curator",
    description: "Collect 5 History cards.",
    iconKey: "laurel",
    points: 30,
  },
];
