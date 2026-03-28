export const STAGE_WIDTH = 960;
export const STAGE_HEIGHT = 540;

const TEMPLATE_COUNT = 12;
const CONTROL_POINT_COUNT = 13;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1_000_000) / 1_000_000;
  };
}

function range(random, min, max) {
  return min + random() * (max - min);
}

function local(label, locale) {
  return label?.[locale] ?? label?.en ?? "";
}

const SURFACE_PRESETS = {
  rough: { friction: 0.935, bounce: 0.27, tint: "#6ea145" },
  sand: { friction: 0.89, bounce: 0.16, tint: "#c9b573" },
  mud: { friction: 0.855, bounce: 0.14, tint: "#7a5e42" },
  ice: { friction: 0.992, bounce: 0.36, tint: "#9ed7f2" },
};

const HAZARD_PRESETS = {
  water: { tint: "#3a88cf", edge: "#79c2ff" },
  lava: { tint: "#b73b19", edge: "#ff9a42" },
  acid: { tint: "#4d8c2f", edge: "#c5ff73" },
  void: { tint: "#2c2f4f", edge: "#8e95da" },
  sludge: { tint: "#4f6a44", edge: "#90b17f" },
};

export const ENVIRONMENT_THEMES = [
  {
    id: "verdant-links",
    name: { es: "Links Esmeralda", en: "Verdant Links" },
    subtitle: {
      es: "Pradera clasica de dia con colinas tecnicas.",
      en: "Classic daytime meadow with technical hills.",
    },
    atmosphere: "day",
    skyTop: "#7dcfff",
    skyBottom: "#53a9df",
    haze: "rgba(244,255,255,0.26)",
    cloud: "rgba(255,255,255,0.18)",
    topGrass: "#9acb4a",
    midGrass: "#88bd3e",
    deepSoil: "#713518",
    mountainA: "#9eaeb2",
    mountainB: "#5f7481",
    tree: "#4f9e3f",
    flag: "#ff6f2f",
    windBase: 0,
    hazardType: "water",
  },
  {
    id: "dune-sunset",
    name: { es: "Dunas Ocaso", en: "Dune Sunset" },
    subtitle: {
      es: "Atardecer arido con viento lateral y arena blanda.",
      en: "Arid sunset with crosswind and soft sand.",
    },
    atmosphere: "sunset",
    skyTop: "#ffbc79",
    skyBottom: "#c66f59",
    haze: "rgba(255,220,170,0.2)",
    cloud: "rgba(255,226,194,0.16)",
    topGrass: "#c4bf67",
    midGrass: "#aea852",
    deepSoil: "#7d4521",
    mountainA: "#b79f81",
    mountainB: "#846d58",
    tree: "#8ca451",
    flag: "#ff8c3d",
    windBase: 14,
    hazardType: "sludge",
  },
  {
    id: "frostline-moon",
    name: { es: "Frostline Lunar", en: "Frostline Moon" },
    subtitle: {
      es: "Noche fria, suelo rapido y hielo inestable.",
      en: "Cold night, fast ground, unstable ice.",
    },
    atmosphere: "night",
    skyTop: "#20345c",
    skyBottom: "#456e9e",
    haze: "rgba(168,208,255,0.14)",
    cloud: "rgba(215,232,255,0.12)",
    topGrass: "#b6d986",
    midGrass: "#9cc56e",
    deepSoil: "#58708a",
    mountainA: "#d8e5ef",
    mountainB: "#8ea3b8",
    tree: "#6d9b8a",
    flag: "#ff5f72",
    windBase: 22,
    hazardType: "water",
  },
  {
    id: "volcanic-rift",
    name: { es: "Rift Volcanico", en: "Volcanic Rift" },
    subtitle: {
      es: "Terreno nocturno con calor, lava y saltos agresivos.",
      en: "Night terrain with heat, lava, and aggressive jumps.",
    },
    atmosphere: "volcanic-night",
    skyTop: "#2b2442",
    skyBottom: "#62353c",
    haze: "rgba(255,138,84,0.14)",
    cloud: "rgba(209,117,91,0.1)",
    topGrass: "#93b54a",
    midGrass: "#799d37",
    deepSoil: "#552617",
    mountainA: "#9f8f84",
    mountainB: "#6f6259",
    tree: "#5f7f3c",
    flag: "#ff8b26",
    windBase: 8,
    hazardType: "lava",
  },
  {
    id: "neon-circuit",
    name: { es: "Circuito Neon", en: "Neon Circuit" },
    subtitle: {
      es: "Escenario urbano nocturno con corrientes magneticas.",
      en: "Urban night scene with magnetic streams.",
    },
    atmosphere: "neon",
    skyTop: "#132749",
    skyBottom: "#1f345f",
    haze: "rgba(106,161,255,0.14)",
    cloud: "rgba(149,186,255,0.1)",
    topGrass: "#8ac35a",
    midGrass: "#70a844",
    deepSoil: "#4f2f1d",
    mountainA: "#8f9db6",
    mountainB: "#63708e",
    tree: "#4b8e6e",
    flag: "#ff4fb3",
    windBase: 18,
    hazardType: "acid",
  },
  {
    id: "storm-coast",
    name: { es: "Costa Tormenta", en: "Storm Coast" },
    subtitle: {
      es: "Nubes densas, rafagas y visibilidad cambiante.",
      en: "Dense clouds, gusts, and shifting visibility.",
    },
    atmosphere: "storm",
    skyTop: "#3f5877",
    skyBottom: "#667d98",
    haze: "rgba(178,205,227,0.14)",
    cloud: "rgba(189,212,231,0.13)",
    topGrass: "#9bc764",
    midGrass: "#7fb251",
    deepSoil: "#68442b",
    mountainA: "#b4bcc8",
    mountainB: "#7b879c",
    tree: "#5e8f58",
    flag: "#ff7645",
    windBase: 28,
    hazardType: "void",
  },
];

const TEMPLATE_PROFILES = [
  { baseY: 372, amp: 44, freq: 1.05, waveMix: 0.38, teeSlope: -0.12, holeSlope: 0.14, par: 2 },
  { baseY: 366, amp: 50, freq: 1.3, waveMix: 0.48, teeSlope: -0.14, holeSlope: 0.18, par: 2 },
  { baseY: 360, amp: 56, freq: 1.52, waveMix: 0.56, teeSlope: -0.16, holeSlope: 0.2, par: 3 },
  { baseY: 355, amp: 62, freq: 1.72, waveMix: 0.62, teeSlope: -0.2, holeSlope: 0.22, par: 3 },
  { baseY: 350, amp: 68, freq: 1.95, waveMix: 0.66, teeSlope: -0.22, holeSlope: 0.24, par: 3 },
  { baseY: 344, amp: 74, freq: 2.12, waveMix: 0.72, teeSlope: -0.26, holeSlope: 0.27, par: 3 },
  { baseY: 338, amp: 80, freq: 2.26, waveMix: 0.76, teeSlope: -0.3, holeSlope: 0.3, par: 4 },
  { baseY: 332, amp: 86, freq: 2.38, waveMix: 0.8, teeSlope: -0.34, holeSlope: 0.32, par: 4 },
  { baseY: 326, amp: 92, freq: 2.5, waveMix: 0.84, teeSlope: -0.37, holeSlope: 0.35, par: 4 },
  { baseY: 321, amp: 98, freq: 2.62, waveMix: 0.88, teeSlope: -0.41, holeSlope: 0.38, par: 4 },
  { baseY: 316, amp: 102, freq: 2.78, waveMix: 0.9, teeSlope: -0.45, holeSlope: 0.4, par: 5 },
  { baseY: 312, amp: 108, freq: 2.94, waveMix: 0.94, teeSlope: -0.48, holeSlope: 0.43, par: 5 },
];

function normalizeVector(x, y) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function smooth(points, passes = 2) {
  let output = points.map((point) => ({ ...point }));
  for (let pass = 0; pass < passes; pass += 1) {
    const next = output.map((point, index) => {
      if (index === 0 || index === output.length - 1) {
        return { ...point };
      }
      const previous = output[index - 1];
      const following = output[index + 1];
      return {
        x: point.x,
        y: point.y * 0.45 + previous.y * 0.275 + following.y * 0.275,
      };
    });
    output = next;
  }
  return output;
}

export function getTerrainY(terrain, x) {
  const clampedX = clamp(x, 0, STAGE_WIDTH);
  for (let i = 0; i < terrain.length - 1; i += 1) {
    const a = terrain[i];
    const b = terrain[i + 1];
    if (clampedX >= a.x && clampedX <= b.x) {
      const t = (clampedX - a.x) / (b.x - a.x || 1);
      return a.y + (b.y - a.y) * t;
    }
  }
  return terrain[terrain.length - 1].y;
}

export function getTerrainNormal(terrain, x) {
  const sample = 3.4;
  const y0 = getTerrainY(terrain, x - sample);
  const y1 = getTerrainY(terrain, x + sample);
  const tangent = normalizeVector(2 * sample, y1 - y0);
  return { x: -tangent.y, y: tangent.x };
}

function minTerrainYBetween(terrain, x1, x2) {
  const start = Math.min(x1, x2);
  const end = Math.max(x1, x2);
  let minY = Number.POSITIVE_INFINITY;
  for (let x = start; x <= end; x += 8) {
    minY = Math.min(minY, getTerrainY(terrain, x));
  }
  return minY;
}

function reserveSegment(used, x1, x2, padding = 28) {
  const start = x1 - padding;
  const end = x2 + padding;
  const overlaps = used.some((segment) => start <= segment.end && end >= segment.start);
  if (overlaps) {
    return false;
  }
  used.push({ start, end });
  return true;
}

function pickSegment(random, used, minX, maxX, width, padding = 28) {
  const startMax = maxX - width;
  if (startMax <= minX) {
    return null;
  }
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const x1 = range(random, minX, startMax);
    const x2 = x1 + width;
    if (reserveSegment(used, x1, x2, padding)) {
      return { x1, x2 };
    }
  }
  return null;
}

function buildTerrain(themeIndex, templateIndex, seed) {
  const random = seededRandom(seed);
  const profile = TEMPLATE_PROFILES[templateIndex];
  const xStep = STAGE_WIDTH / (CONTROL_POINT_COUNT - 1);
  const phase = range(random, 0, Math.PI * 2);
  const jitter = 10 + templateIndex * 1.7 + themeIndex * 1.8;
  const points = [];

  for (let i = 0; i < CONTROL_POINT_COUNT; i += 1) {
    const x = i * xStep;
    const t = i / (CONTROL_POINT_COUNT - 1);
    const primary = Math.sin(t * Math.PI * profile.freq + phase) * profile.amp;
    const secondary =
      Math.sin(t * Math.PI * (profile.freq * 0.54 + profile.waveMix) + phase * 0.57) *
      profile.amp *
      0.37;
    const shape = Math.sin((t - 0.5) * Math.PI * (1.4 + profile.waveMix)) * profile.amp * 0.2;
    const noise = range(random, -jitter, jitter);
    const y = clamp(profile.baseY + primary + secondary + shape + noise, 216, 454);
    points.push({ x, y });
  }

  const teeIndex = 1;
  const holeIndex = CONTROL_POINT_COUNT - 2;
  const teeBase = clamp(points[teeIndex].y + profile.teeSlope * 52, 246, 420);
  const holeBase = clamp(points[holeIndex].y + profile.holeSlope * 56, 228, 402);
  points[teeIndex].y = teeBase;
  points[holeIndex].y = holeBase;
  points[holeIndex - 1].y = holeBase + range(random, -12, 12);
  points[holeIndex + 1].y = holeBase + range(random, -14, 14);

  const smoothed = smooth(points, 3);
  const teeX = smoothed[teeIndex].x + xStep * 0.26;
  const holeX = smoothed[holeIndex].x + xStep * 0.18;
  const teeY = getTerrainY(smoothed, teeX);
  const holeY = getTerrainY(smoothed, holeX);

  const coinCount = 1 + (templateIndex % 3);
  const coins = [];
  for (let i = 0; i < coinCount; i += 1) {
    const coinX = range(random, STAGE_WIDTH * 0.34, STAGE_WIDTH * 0.74);
    const coinY = getTerrainY(smoothed, coinX) - range(random, 58, 96);
    coins.push({ x: coinX, y: coinY, radius: 12 });
  }

  return {
    terrain: smoothed,
    tee: { x: teeX, y: teeY },
    hole: {
      x: holeX,
      y: holeY,
      rimRadius: 16,
      cupWidth: 28,
      cupDepth: 118,
    },
    coins,
    basePar: profile.par,
    timeLimitMs: 56_000 + templateIndex * 3_900 + themeIndex * 5_700,
    windBase: ENVIRONMENT_THEMES[themeIndex].windBase + templateIndex * 0.9,
  };
}

function buildScenery(theme, random, atmosphere) {
  const mountains = Array.from({ length: 3 }, (_, index) => ({
    x: 120 + index * 300 + range(random, -34, 34),
    baseY: 392 + range(random, -24, 18),
    width: 152 + range(random, -16, 34),
    height: 112 + range(random, -14, 26),
    tint: index % 2 === 0 ? theme.mountainA : theme.mountainB,
  }));

  const treeCount = atmosphere === "neon" ? 2 : atmosphere === "storm" ? 3 : 4;
  const trees = Array.from({ length: treeCount }, (_, index) => ({
    x: 110 + index * 215 + range(random, -54, 58),
    size: 34 + range(random, -8, 16),
  }));

  const props = Array.from({ length: 3 }, (_, index) => ({
    x: 140 + index * 280 + range(random, -70, 70),
    height: 20 + range(random, -6, 18),
    width: 12 + range(random, -3, 7),
  }));

  return { mountains, trees, props };
}

function buildSurfacePatches(terrain, random, laneStart, laneEnd, templateIndex) {
  const patches = [];
  const used = [];
  const count = 2 + Math.floor(templateIndex / 3);
  const kindCycle = ["sand", "rough", "mud", "ice"];

  for (let i = 0; i < count; i += 1) {
    const width = range(random, 64, 134);
    const slot = pickSegment(random, used, laneStart, laneEnd, width, 24);
    if (!slot) {
      continue;
    }
    const kind = kindCycle[(templateIndex + i) % kindCycle.length];
    const preset = SURFACE_PRESETS[kind];
    patches.push({
      id: `patch-${i}`,
      x1: slot.x1,
      x2: slot.x2,
      kind,
      friction: preset.friction,
      bounce: preset.bounce,
      tint: preset.tint,
      y: minTerrainYBetween(terrain, slot.x1, slot.x2),
    });
  }

  return patches;
}

function buildHazardPits(terrain, theme, random, laneStart, laneEnd, templateIndex) {
  const pits = [];
  if (templateIndex < 2) {
    return pits;
  }
  const used = [];
  const count = 1 + Math.floor((templateIndex - 2) / 4);

  for (let i = 0; i < count; i += 1) {
    const width = range(random, 76, 142);
    const slot = pickSegment(random, used, laneStart + 30, laneEnd - 20, width, 46);
    if (!slot) {
      continue;
    }
    const preset = HAZARD_PRESETS[theme.hazardType] ?? HAZARD_PRESETS.water;
    const top = minTerrainYBetween(terrain, slot.x1, slot.x2) + 8;
    pits.push({
      id: `hazard-${i}`,
      x1: slot.x1,
      x2: slot.x2,
      top,
      type: theme.hazardType,
      tint: preset.tint,
      edge: preset.edge,
      penalty: 1,
    });
  }

  return pits;
}

function buildBumpers(terrain, random, laneStart, laneEnd, templateIndex) {
  const bumpers = [];
  if (templateIndex < 3) {
    return bumpers;
  }
  const used = [];
  const count = 1 + Math.floor((templateIndex - 3) / 3);
  for (let i = 0; i < count; i += 1) {
    const width = range(random, 18, 30);
    const slot = pickSegment(random, used, laneStart, laneEnd, width, 68);
    if (!slot) {
      continue;
    }
    const x = (slot.x1 + slot.x2) * 0.5;
    const radius = range(random, 12, 19);
    bumpers.push({
      id: `bumper-${i}`,
      x,
      y: getTerrainY(terrain, x) - range(random, 34, 66),
      radius,
      restitution: range(random, 0.7, 1.06),
      tint: i % 2 === 0 ? "#ffd86a" : "#ff9f52",
      moving: false,
    });
  }
  return bumpers;
}

function buildMovingBumpers(terrain, random, laneStart, laneEnd, templateIndex) {
  const moving = [];
  if (templateIndex < 6) {
    return moving;
  }
  const used = [];
  const count = 1 + Math.floor((templateIndex - 6) / 4);
  for (let i = 0; i < count; i += 1) {
    const width = range(random, 20, 32);
    const slot = pickSegment(random, used, laneStart + 24, laneEnd - 24, width, 86);
    if (!slot) {
      continue;
    }
    const baseX = (slot.x1 + slot.x2) * 0.5;
    moving.push({
      id: `mover-${i}`,
      baseX,
      baseY: getTerrainY(terrain, baseX) - range(random, 40, 84),
      axis: random() > 0.5 ? "x" : "y",
      range: range(random, 34, 82),
      speed: range(random, 0.8, 1.45),
      phase: range(random, 0, Math.PI * 2),
      radius: range(random, 12, 18),
      restitution: range(random, 0.82, 1.1),
      tint: "#79d8ff",
      moving: true,
    });
  }
  return moving;
}

function buildWalls(terrain, random, laneStart, laneEnd, templateIndex) {
  const walls = [];
  if (templateIndex < 4) {
    return walls;
  }
  const used = [];
  const count = 1 + Math.floor((templateIndex - 4) / 4);
  for (let i = 0; i < count; i += 1) {
    const width = range(random, 12, 18);
    const slot = pickSegment(random, used, laneStart + 20, laneEnd - 20, width, 72);
    if (!slot) {
      continue;
    }
    const x = slot.x1;
    const top = getTerrainY(terrain, x + width * 0.5) - range(random, 72, 152);
    walls.push({
      id: `wall-${i}`,
      x,
      width,
      top,
      height: range(random, 72, 152),
      bounce: range(random, 0.28, 0.52),
      tint: i % 2 === 0 ? "#4d5f78" : "#6d7f99",
    });
  }
  return walls;
}

function buildWindZones(terrain, random, laneStart, laneEnd, templateIndex) {
  const zones = [];
  if (templateIndex < 5) {
    return zones;
  }
  const used = [];
  const count = 1 + Math.floor((templateIndex - 5) / 3);
  for (let i = 0; i < count; i += 1) {
    const width = range(random, 92, 170);
    const slot = pickSegment(random, used, laneStart, laneEnd, width, 26);
    if (!slot) {
      continue;
    }
    const x = slot.x1;
    const center = x + width * 0.5;
    const terrainY = getTerrainY(terrain, center);
    const height = range(random, 130, 220);
    zones.push({
      id: `wind-${i}`,
      x,
      y: terrainY - height,
      width,
      height,
      force: (random() > 0.5 ? 1 : -1) * range(random, 90, 210),
      lift: -range(random, 0, 65),
      oscAmp: range(random, 30, 110),
      oscFreq: range(random, 0.4, 1.2),
      phase: range(random, 0, Math.PI * 2),
    });
  }
  return zones;
}

function difficultyBandForTemplate(templateIndex) {
  if (templateIndex <= 2) {
    return "rookie";
  }
  if (templateIndex <= 5) {
    return "pro";
  }
  if (templateIndex <= 8) {
    return "elite";
  }
  return "master";
}

function buildObstacles(layout, theme, templateIndex, seed) {
  const random = seededRandom(seed + 7_919);
  const laneStart = Math.min(layout.tee.x, layout.hole.x) + 66;
  const laneEnd = Math.max(layout.tee.x, layout.hole.x) - 66;

  const surfacePatches = buildSurfacePatches(layout.terrain, random, laneStart, laneEnd, templateIndex);
  const hazardPits = buildHazardPits(layout.terrain, theme, random, laneStart, laneEnd, templateIndex);
  const bumpers = buildBumpers(layout.terrain, random, laneStart, laneEnd, templateIndex);
  const movingBumpers = buildMovingBumpers(layout.terrain, random, laneStart, laneEnd, templateIndex);
  const walls = buildWalls(layout.terrain, random, laneStart, laneEnd, templateIndex);
  const windZones = buildWindZones(layout.terrain, random, laneStart, laneEnd, templateIndex);

  return {
    surfacePatches,
    hazardPits,
    bumpers,
    movingBumpers,
    walls,
    windZones,
  };
}

function buildSituationTags(theme, obstacles) {
  const tags = [theme.id, theme.atmosphere];
  if (obstacles.surfacePatches.length > 0) {
    tags.push("surface");
  }
  if (obstacles.hazardPits.length > 0) {
    tags.push("hazard");
  }
  if (obstacles.bumpers.length > 0) {
    tags.push("bumper");
  }
  if (obstacles.movingBumpers.length > 0) {
    tags.push("moving");
  }
  if (obstacles.walls.length > 0) {
    tags.push("walls");
  }
  if (obstacles.windZones.length > 0) {
    tags.push("wind");
  }
  return tags;
}

function buildLevel(themeIndex, templateIndex) {
  const environment = ENVIRONMENT_THEMES[themeIndex];
  const seed = (themeIndex + 1) * 10_000 + templateIndex * 1_337 + 404;
  const random = seededRandom(seed);
  const layout = buildTerrain(themeIndex, templateIndex, seed);
  const scenery = buildScenery(environment, random, environment.atmosphere);
  const obstacles = buildObstacles(layout, environment, templateIndex, seed);

  const worldLevel = templateIndex + 1;
  const globalIndex = themeIndex * TEMPLATE_COUNT + templateIndex;
  const difficultyBand = difficultyBandForTemplate(templateIndex);

  const hazardWeight = obstacles.hazardPits.length * 0.4;
  const motionWeight = obstacles.movingBumpers.length * 0.5 + obstacles.windZones.length * 0.2;
  const par = clamp(Math.round(layout.basePar + hazardWeight + motionWeight), 2, 6);
  const timeLimitMs = clamp(
    layout.timeLimitMs +
      obstacles.hazardPits.length * 2_600 +
      obstacles.movingBumpers.length * 3_100 +
      obstacles.walls.length * 1_500,
    52_000,
    124_000
  );

  return {
    id: `${environment.id}-${String(worldLevel).padStart(2, "0")}`,
    index: globalIndex,
    worldIndex: themeIndex + 1,
    worldLevel,
    worldName: environment.name,
    worldSubtitle: environment.subtitle,
    environmentId: environment.id,
    environment,
    name: {
      es: `${environment.name.es} - Nivel ${String(worldLevel).padStart(2, "0")}`,
      en: `${environment.name.en} - Level ${String(worldLevel).padStart(2, "0")}`,
    },
    terrain: layout.terrain,
    tee: layout.tee,
    hole: layout.hole,
    coins: layout.coins,
    obstacles,
    situationTags: buildSituationTags(environment, obstacles),
    par,
    timeLimitMs,
    windBase: layout.windBase,
    difficultyBand,
    scenery,
    starTargets: {
      three: par,
      two: par + 1,
      one: par + 2,
    },
  };
}

const MOBILE_EXPANSION_START_LEVEL = 73;
const MOBILE_EXPANSION_COUNT = 28;

const MOBILE_EXPANSION_CHAPTERS = [
  {
    name: { es: "Mobile Academy", en: "Mobile Academy" },
    subtitle: {
      es: "Disenos amplios para pulgar, lectura clara y ritmo de aprendizaje.",
      en: "Thumb-friendly wide layouts with clear readability and onboarding rhythm.",
    },
  },
  {
    name: { es: "Precision Labs", en: "Precision Labs" },
    subtitle: {
      es: "Trayectorias mas tecnicas, angulos cerrados y control fino de potencia.",
      en: "More technical trajectories, tighter angles, and fine power control.",
    },
  },
  {
    name: { es: "Flow Gauntlet", en: "Flow Gauntlet" },
    subtitle: {
      es: "Combinaciones de obstaculos y rutas alternativas en pantallas compactas.",
      en: "Obstacle combos and alternate paths in compact screen flows.",
    },
  },
  {
    name: { es: "Master Pocket Tour", en: "Master Pocket Tour" },
    subtitle: {
      es: "Retos expertos para sesiones cortas con alta exigencia tactica.",
      en: "Expert challenges for short sessions with high tactical demand.",
    },
  },
];

function expansionBandForLevel(levelNumber) {
  if (levelNumber <= 79) {
    return "rookie";
  }
  if (levelNumber <= 87) {
    return "pro";
  }
  if (levelNumber <= 94) {
    return "elite";
  }
  return "master";
}

function trimObstaclesForBand(obstacles, band) {
  const limits = {
    rookie: { surface: 2, hazard: 0, bumper: 1, moving: 0, wall: 0, wind: 1 },
    pro: { surface: 3, hazard: 1, bumper: 2, moving: 1, wall: 1, wind: 1 },
    elite: { surface: 4, hazard: 2, bumper: 3, moving: 2, wall: 2, wind: 2 },
    master: { surface: 5, hazard: 3, bumper: 4, moving: 3, wall: 3, wind: 3 },
  }[band];

  return {
    surfacePatches: obstacles.surfacePatches.slice(0, limits.surface),
    hazardPits: obstacles.hazardPits.slice(0, limits.hazard),
    bumpers: obstacles.bumpers.slice(0, limits.bumper),
    movingBumpers: obstacles.movingBumpers.slice(0, limits.moving),
    walls: obstacles.walls.slice(0, limits.wall),
    windZones: obstacles.windZones.slice(0, limits.wind),
  };
}

function addMasterFailsafes(obstacles, terrain, tee, hole, random) {
  const laneCenter = (tee.x + hole.x) * 0.5;

  if (obstacles.hazardPits.length < 2) {
    const width = 96;
    const x1 = clamp(laneCenter - width * 0.5, tee.x + 110, hole.x - 160);
    const x2 = x1 + width;
    obstacles.hazardPits.push({
      id: "hazard-master",
      x1,
      x2,
      top: minTerrainYBetween(terrain, x1, x2) + 10,
      type: "void",
      tint: HAZARD_PRESETS.void.tint,
      edge: HAZARD_PRESETS.void.edge,
      penalty: 1,
    });
  }

  if (obstacles.walls.length < 2) {
    const wallX = clamp(laneCenter - 120 + range(random, -30, 30), tee.x + 90, hole.x - 130);
    obstacles.walls.push({
      id: "wall-master",
      x: wallX,
      width: 16,
      top: getTerrainY(terrain, wallX + 8) - 128,
      height: 128,
      bounce: 0.42,
      tint: "#5c6f8b",
    });
  }

  if (obstacles.movingBumpers.length < 2) {
    const baseX = clamp(laneCenter + 80 + range(random, -35, 35), tee.x + 120, hole.x - 90);
    obstacles.movingBumpers.push({
      id: "mover-master",
      baseX,
      baseY: getTerrainY(terrain, baseX) - 64,
      axis: "y",
      range: 58,
      speed: 1.3,
      phase: range(random, 0, Math.PI * 2),
      radius: 16,
      restitution: 0.98,
      tint: "#79d8ff",
      moving: true,
    });
  }
}

function retagObstacleIds(obstacles, prefix) {
  return {
    surfacePatches: obstacles.surfacePatches.map((patch, index) => ({ ...patch, id: `${prefix}-surface-${index}` })),
    hazardPits: obstacles.hazardPits.map((pit, index) => ({ ...pit, id: `${prefix}-hazard-${index}` })),
    bumpers: obstacles.bumpers.map((bumper, index) => ({ ...bumper, id: `${prefix}-bumper-${index}` })),
    movingBumpers: obstacles.movingBumpers.map((mover, index) => ({ ...mover, id: `${prefix}-moving-${index}` })),
    walls: obstacles.walls.map((wall, index) => ({ ...wall, id: `${prefix}-wall-${index}` })),
    windZones: obstacles.windZones.map((zone, index) => ({ ...zone, id: `${prefix}-wind-${index}` })),
  };
}

function buildMobileExpansionLevel(extraIndex) {
  const levelNumber = MOBILE_EXPANSION_START_LEVEL + extraIndex;
  const difficultyBand = expansionBandForLevel(levelNumber);
  const chapterIndex = Math.floor(extraIndex / 7);
  const chapter = MOBILE_EXPANSION_CHAPTERS[chapterIndex];
  const themeIndex = (extraIndex * 2 + chapterIndex) % ENVIRONMENT_THEMES.length;
  const environment = ENVIRONMENT_THEMES[themeIndex];

  const templateIndex = (extraIndex * 5 + chapterIndex * 3) % TEMPLATE_COUNT;
  const seed = 80_000 + levelNumber * 1_889 + themeIndex * 73;
  const random = seededRandom(seed);
  const layout = buildTerrain(themeIndex, templateIndex, seed);

  const teeX = clamp(108 + chapterIndex * 8 + range(random, -16, 20), 84, 210);
  const targetDistance = {
    rookie: range(random, 430, 520),
    pro: range(random, 520, 620),
    elite: range(random, 610, 700),
    master: range(random, 700, 790),
  }[difficultyBand];
  const holeX = clamp(teeX + targetDistance, 620, 910);
  layout.tee.x = teeX;
  layout.tee.y = getTerrainY(layout.terrain, teeX);
  layout.hole.x = holeX;
  layout.hole.y = getTerrainY(layout.terrain, holeX);

  const cupPreset = {
    rookie: { width: 34, rim: 18 },
    pro: { width: 30, rim: 17 },
    elite: { width: 27, rim: 16 },
    master: { width: 24, rim: 15 },
  }[difficultyBand];
  layout.hole.cupWidth = cupPreset.width;
  layout.hole.rimRadius = cupPreset.rim;

  const coinCount = {
    rookie: 2,
    pro: 2 + (extraIndex % 2),
    elite: 3,
    master: 4,
  }[difficultyBand];
  layout.coins = Array.from({ length: coinCount }, (_, coinIndex) => {
    const t = (coinIndex + 1) / (coinCount + 1);
    const x = clamp(layout.tee.x + (layout.hole.x - layout.tee.x) * t + range(random, -24, 24), 90, STAGE_WIDTH - 70);
    const y = getTerrainY(layout.terrain, x) - range(random, 54, 88);
    return { x, y, radius: 12 };
  });

  const templateForBand = {
    rookie: Math.min(4, templateIndex),
    pro: clamp(templateIndex, 4, 7),
    elite: clamp(templateIndex, 7, 10),
    master: 11,
  }[difficultyBand];

  let obstacles = buildObstacles(layout, environment, templateForBand, seed + 222);
  obstacles = trimObstaclesForBand(obstacles, difficultyBand);
  if (difficultyBand === "master") {
    addMasterFailsafes(obstacles, layout.terrain, layout.tee, layout.hole, random);
  }

  const windScale = {
    rookie: 0.58,
    pro: 0.9,
    elite: 1.15,
    master: 1.36,
  }[difficultyBand];
  obstacles.windZones = obstacles.windZones.map((zone) => ({
    ...zone,
    force: zone.force * windScale,
    lift: zone.lift * windScale,
    width: zone.width + (difficultyBand === "rookie" ? 34 : 0),
  }));

  obstacles = retagObstacleIds(obstacles, `mobile-${levelNumber}`);
  const situationTags = [
    ...buildSituationTags(environment, obstacles),
    "mobile-first",
    `chapter-${chapterIndex + 1}`,
    `band-${difficultyBand}`,
  ];

  const obstacleWeight =
    obstacles.hazardPits.length * 0.45 +
    obstacles.movingBumpers.length * 0.65 +
    obstacles.walls.length * 0.5 +
    obstacles.windZones.length * 0.32;
  const basePar = { rookie: 2, pro: 3, elite: 4, master: 5 }[difficultyBand];
  const par = clamp(Math.round(basePar + obstacleWeight * 0.35), 2, 6);
  const baseTime = { rookie: 72_000, pro: 68_000, elite: 62_000, master: 58_000 }[difficultyBand];
  const timeLimitMs = clamp(Math.round(baseTime + (4 - chapterIndex) * 1_200 + obstacleWeight * 2_600), 52_000, 120_000);

  return {
    id: `mobile-first-${String(levelNumber).padStart(3, "0")}`,
    index: 72 + extraIndex,
    worldIndex: 7 + chapterIndex,
    worldLevel: levelNumber,
    worldName: chapter.name,
    worldSubtitle: chapter.subtitle,
    environmentId: environment.id,
    environment,
    name: {
      es: `${chapter.name.es} - Nivel ${levelNumber}`,
      en: `${chapter.name.en} - Level ${levelNumber}`,
    },
    terrain: layout.terrain,
    tee: layout.tee,
    hole: layout.hole,
    coins: layout.coins,
    obstacles,
    situationTags,
    par,
    timeLimitMs,
    windBase: layout.windBase * windScale + chapterIndex * 2.4,
    difficultyBand,
    scenery: buildScenery(environment, random, environment.atmosphere),
    starTargets: {
      three: par,
      two: par + 1,
      one: par + 2,
    },
  };
}

const PRO_TOUR_EXPANSION_START_LEVEL = MOBILE_EXPANSION_START_LEVEL + MOBILE_EXPANSION_COUNT;
const PRO_TOUR_EXPANSION_COUNT = 100;
const PRO_TOUR_CHAPTER_SIZE = 10;

const PRO_TOUR_CHAPTERS = [
  {
    id: "qualifier-links",
    name: { es: "Qualifier Links", en: "Qualifier Links" },
    subtitle: {
      es: "Inicio tecnico con calles amplias, viento moderado y hazards legibles.",
      en: "Technical opening with wider lanes, moderate wind, and readable hazards.",
    },
    themeCycle: [0, 5],
    windScale: 0.9,
    hazardType: "water",
    distanceBoost: -24,
    obstacleBias: 0,
  },
  {
    id: "sunset-corners",
    name: { es: "Sunset Corners", en: "Sunset Corners" },
    subtitle: {
      es: "Dunas y desfiladeros con rebotes en angulo y control de ritmo.",
      en: "Dunes and canyon corners with angular rebounds and rhythm control.",
    },
    themeCycle: [1, 3],
    windScale: 1.02,
    hazardType: "sludge",
    distanceBoost: 10,
    obstacleBias: 1,
  },
  {
    id: "polar-bounce",
    name: { es: "Polar Bounce", en: "Polar Bounce" },
    subtitle: {
      es: "Superficies frias y rutas de precision con menor tolerancia de cup.",
      en: "Cold surfaces and precision routes with tighter cup tolerance.",
    },
    themeCycle: [2, 0],
    windScale: 1.08,
    hazardType: "water",
    distanceBoost: 18,
    obstacleBias: 1,
  },
  {
    id: "neon-pressure",
    name: { es: "Neon Pressure", en: "Neon Pressure" },
    subtitle: {
      es: "Entorno urbano nocturno con muros tecnicos y corrientes inestables.",
      en: "Urban night environment with technical walls and unstable currents.",
    },
    themeCycle: [4, 5],
    windScale: 1.14,
    hazardType: "acid",
    distanceBoost: 36,
    obstacleBias: 2,
  },
  {
    id: "rift-velocity",
    name: { es: "Rift Velocity", en: "Rift Velocity" },
    subtitle: {
      es: "Serie volcanica de riesgo alto con penalizacion por lectura tardia.",
      en: "Volcanic high-risk run with strong punishment for late reads.",
    },
    themeCycle: [3, 1],
    windScale: 1.2,
    hazardType: "lava",
    distanceBoost: 52,
    obstacleBias: 2,
  },
  {
    id: "storm-breakers",
    name: { es: "Storm Breakers", en: "Storm Breakers" },
    subtitle: {
      es: "Rafagas fuertes, ventanas cortas y control de potencia quirurgico.",
      en: "Heavy gusts, short windows, and surgical power control.",
    },
    themeCycle: [5, 2],
    windScale: 1.27,
    hazardType: "void",
    distanceBoost: 66,
    obstacleBias: 3,
  },
  {
    id: "master-lowlands",
    name: { es: "Master Lowlands", en: "Master Lowlands" },
    subtitle: {
      es: "Master class de slopes enlazados, muros dobles y calles rotas.",
      en: "Master-class linked slopes, double walls, and broken fairways.",
    },
    themeCycle: [0, 1, 4],
    windScale: 1.18,
    hazardType: "sludge",
    distanceBoost: 72,
    obstacleBias: 3,
  },
  {
    id: "void-operator",
    name: { es: "Void Operator", en: "Void Operator" },
    subtitle: {
      es: "Trayectorias extensas con pits oscuros y movilidad de alto castigo.",
      en: "Long trajectories with dark pits and punishing moving obstacles.",
    },
    themeCycle: [5, 3, 2],
    windScale: 1.3,
    hazardType: "void",
    distanceBoost: 84,
    obstacleBias: 4,
  },
  {
    id: "fusion-finals",
    name: { es: "Fusion Finals", en: "Fusion Finals" },
    subtitle: {
      es: "Combinaciones mixtas de biomas con rutas alternativas y precision extrema.",
      en: "Mixed-biome combinations with alternate routes and extreme precision.",
    },
    themeCycle: [4, 2, 0, 3],
    windScale: 1.34,
    hazardType: "acid",
    distanceBoost: 98,
    obstacleBias: 4,
  },
  {
    id: "world-tour-finale",
    name: { es: "World Tour Finale", en: "World Tour Finale" },
    subtitle: {
      es: "Cierre del tour con trazados largos, hazards densos y lectura tactica total.",
      en: "Tour finale with long layouts, dense hazards, and full tactical reads.",
    },
    themeCycle: [0, 1, 2, 3, 4, 5],
    windScale: 1.38,
    hazardType: "void",
    distanceBoost: 114,
    obstacleBias: 5,
  },
];

function proTourBandForLevel(levelNumber) {
  const relative = levelNumber - PRO_TOUR_EXPANSION_START_LEVEL + 1;
  if (relative <= 20) {
    return "rookie";
  }
  if (relative <= 45) {
    return "pro";
  }
  if (relative <= 75) {
    return "elite";
  }
  return "master";
}

function trimObstaclesForProTourBand(obstacles, band) {
  const limits = {
    rookie: { surface: 3, hazard: 1, bumper: 2, moving: 1, wall: 1, wind: 2 },
    pro: { surface: 4, hazard: 2, bumper: 3, moving: 2, wall: 2, wind: 2 },
    elite: { surface: 5, hazard: 3, bumper: 4, moving: 3, wall: 3, wind: 3 },
    master: { surface: 6, hazard: 4, bumper: 5, moving: 4, wall: 4, wind: 4 },
  }[band];

  return {
    surfacePatches: obstacles.surfacePatches.slice(0, limits.surface),
    hazardPits: obstacles.hazardPits.slice(0, limits.hazard),
    bumpers: obstacles.bumpers.slice(0, limits.bumper),
    movingBumpers: obstacles.movingBumpers.slice(0, limits.moving),
    walls: obstacles.walls.slice(0, limits.wall),
    windZones: obstacles.windZones.slice(0, limits.wind),
  };
}

function pickTemplateForProTourBand(random, band, chapterIndex, chapterStep) {
  const pools = {
    rookie: [3, 4, 5, 6],
    pro: [5, 6, 7, 8],
    elite: [7, 8, 9, 10],
    master: [9, 10, 11],
  };
  const pool = pools[band] ?? pools.pro;
  const jitter = Math.floor(random() * pool.length);
  const cursor = (chapterIndex * 3 + chapterStep + jitter) % pool.length;
  return pool[cursor];
}

function ensureProTourMasterDensity(obstacles, terrain, tee, hole, random, hazardType) {
  const laneStart = Math.min(tee.x, hole.x) + 70;
  const laneEnd = Math.max(tee.x, hole.x) - 70;
  const hazardPreset = HAZARD_PRESETS[hazardType] ?? HAZARD_PRESETS.void;

  const hazardUsed = obstacles.hazardPits.map((pit) => ({ start: pit.x1, end: pit.x2 }));
  while (obstacles.hazardPits.length < 3) {
    const width = range(random, 86, 132);
    const slot = pickSegment(random, hazardUsed, laneStart + 12, laneEnd - 12, width, 54);
    if (!slot) {
      break;
    }
    obstacles.hazardPits.push({
      id: `tour-master-hazard-${obstacles.hazardPits.length}`,
      x1: slot.x1,
      x2: slot.x2,
      top: minTerrainYBetween(terrain, slot.x1, slot.x2) + 9,
      type: hazardType,
      tint: hazardPreset.tint,
      edge: hazardPreset.edge,
      penalty: 1,
    });
  }

  const wallUsed = obstacles.walls.map((wall) => ({ start: wall.x - 8, end: wall.x + wall.width + 8 }));
  while (obstacles.walls.length < 3) {
    const width = range(random, 14, 20);
    const slot = pickSegment(random, wallUsed, laneStart + 18, laneEnd - 18, width, 82);
    if (!slot) {
      break;
    }
    const x = slot.x1;
    obstacles.walls.push({
      id: `tour-master-wall-${obstacles.walls.length}`,
      x,
      width,
      top: getTerrainY(terrain, x + width * 0.5) - range(random, 96, 166),
      height: range(random, 96, 166),
      bounce: range(random, 0.34, 0.56),
      tint: "#5c6f8b",
    });
  }

  const moverUsed = obstacles.movingBumpers.map((mover) => ({ start: mover.baseX - 46, end: mover.baseX + 46 }));
  while (obstacles.movingBumpers.length < 3) {
    const slot = pickSegment(random, moverUsed, laneStart + 28, laneEnd - 28, 28, 92);
    if (!slot) {
      break;
    }
    const baseX = (slot.x1 + slot.x2) * 0.5;
    obstacles.movingBumpers.push({
      id: `tour-master-moving-${obstacles.movingBumpers.length}`,
      baseX,
      baseY: getTerrainY(terrain, baseX) - range(random, 48, 86),
      axis: random() > 0.5 ? "x" : "y",
      range: range(random, 44, 86),
      speed: range(random, 1.15, 1.58),
      phase: range(random, 0, Math.PI * 2),
      radius: range(random, 13, 18),
      restitution: range(random, 0.9, 1.1),
      tint: "#79d8ff",
      moving: true,
    });
  }

  const windUsed = obstacles.windZones.map((zone) => ({ start: zone.x, end: zone.x + zone.width }));
  while (obstacles.windZones.length < 3) {
    const width = range(random, 104, 174);
    const slot = pickSegment(random, windUsed, laneStart + 14, laneEnd - 14, width, 32);
    if (!slot) {
      break;
    }
    const center = slot.x1 + width * 0.5;
    const terrainY = getTerrainY(terrain, center);
    const height = range(random, 150, 238);
    obstacles.windZones.push({
      id: `tour-master-wind-${obstacles.windZones.length}`,
      x: slot.x1,
      y: terrainY - height,
      width,
      height,
      force: (random() > 0.5 ? 1 : -1) * range(random, 120, 248),
      lift: -range(random, 12, 78),
      oscAmp: range(random, 44, 128),
      oscFreq: range(random, 0.56, 1.34),
      phase: range(random, 0, Math.PI * 2),
    });
  }
}

function buildProTourExpansionLevel(extraIndex) {
  const levelNumber = PRO_TOUR_EXPANSION_START_LEVEL + extraIndex;
  const chapterIndex = Math.floor(extraIndex / PRO_TOUR_CHAPTER_SIZE);
  const chapterStep = extraIndex % PRO_TOUR_CHAPTER_SIZE;
  const chapter = PRO_TOUR_CHAPTERS[chapterIndex];
  const difficultyBand = proTourBandForLevel(levelNumber);

  const themePointer = (chapterStep + chapterIndex) % chapter.themeCycle.length;
  const themeIndex = chapter.themeCycle[themePointer];
  const environment = ENVIRONMENT_THEMES[themeIndex];

  const seed = 140_000 + levelNumber * 2_173 + chapterIndex * 389 + chapterStep * 41;
  const random = seededRandom(seed);
  const templateIndex = pickTemplateForProTourBand(random, difficultyBand, chapterIndex, chapterStep);
  const layout = buildTerrain(themeIndex, templateIndex, seed);

  const teeX = clamp(96 + chapterIndex * 5 + chapterStep * 1.8 + range(random, -18, 20), 78, 228);
  const [distanceMin, distanceMax] = {
    rookie: [470, 610],
    pro: [570, 700],
    elite: [650, 790],
    master: [730, 840],
  }[difficultyBand];
  const targetDistance = range(random, distanceMin + chapter.distanceBoost, distanceMax + chapter.distanceBoost);
  const holeX = clamp(teeX + targetDistance, 620, 924);
  layout.tee.x = teeX;
  layout.tee.y = getTerrainY(layout.terrain, teeX);
  layout.hole.x = holeX;
  layout.hole.y = getTerrainY(layout.terrain, holeX);

  const cupPreset = {
    rookie: { width: 32, rim: 17, depth: 118 },
    pro: { width: 29, rim: 16, depth: 122 },
    elite: { width: 26, rim: 15, depth: 126 },
    master: { width: 23, rim: 14, depth: 132 },
  }[difficultyBand];
  layout.hole.cupWidth = cupPreset.width;
  layout.hole.rimRadius = cupPreset.rim;
  layout.hole.cupDepth = cupPreset.depth;

  const coinCount = {
    rookie: 2,
    pro: 3,
    elite: 3 + (chapterStep % 2),
    master: 4 + (chapterStep % 2),
  }[difficultyBand];
  layout.coins = Array.from({ length: coinCount }, (_, coinIndex) => {
    const t = (coinIndex + 1) / (coinCount + 1);
    const x = clamp(layout.tee.x + (layout.hole.x - layout.tee.x) * t + range(random, -28, 30), 84, STAGE_WIDTH - 64);
    const yLift = {
      rookie: range(random, 52, 82),
      pro: range(random, 56, 90),
      elite: range(random, 62, 96),
      master: range(random, 66, 104),
    }[difficultyBand];
    return { x, y: getTerrainY(layout.terrain, x) - yLift, radius: 12 };
  });

  const obstacleTemplate = clamp(templateIndex + chapter.obstacleBias, 4, TEMPLATE_COUNT - 1);
  let obstacles = buildObstacles(layout, environment, obstacleTemplate, seed + 503);
  obstacles = trimObstaclesForProTourBand(obstacles, difficultyBand);

  if (difficultyBand === "master") {
    addMasterFailsafes(obstacles, layout.terrain, layout.tee, layout.hole, random);
    ensureProTourMasterDensity(obstacles, layout.terrain, layout.tee, layout.hole, random, chapter.hazardType);
  }

  const hazardPreset = HAZARD_PRESETS[chapter.hazardType] ?? HAZARD_PRESETS[environment.hazardType] ?? HAZARD_PRESETS.water;
  obstacles.hazardPits = obstacles.hazardPits.map((pit) => ({
    ...pit,
    type: chapter.hazardType,
    tint: hazardPreset.tint,
    edge: hazardPreset.edge,
  }));

  const bandScale = { rookie: 0.78, pro: 1, elite: 1.18, master: 1.34 }[difficultyBand];
  const windScale = bandScale * chapter.windScale;
  obstacles.windZones = obstacles.windZones.map((zone) => ({
    ...zone,
    force: zone.force * windScale,
    lift: zone.lift * windScale,
    oscAmp: zone.oscAmp * (0.82 + chapter.windScale * 0.24),
    width: Math.max(76, zone.width - (difficultyBand === "master" ? 12 : 0)),
  }));
  obstacles.movingBumpers = obstacles.movingBumpers.map((mover) => ({
    ...mover,
    speed: mover.speed * (0.88 + bandScale * 0.28),
    range: mover.range * (difficultyBand === "master" ? 1.24 : difficultyBand === "elite" ? 1.14 : 1.04),
    restitution: clamp(mover.restitution + (difficultyBand === "master" ? 0.06 : difficultyBand === "elite" ? 0.03 : 0), 0.72, 1.2),
  }));
  obstacles.walls = obstacles.walls.map((wall, index) => ({
    ...wall,
    height: clamp(wall.height + (difficultyBand === "master" ? 18 : difficultyBand === "elite" ? 10 : 0), 72, 184),
    bounce: clamp(wall.bounce + (index % 2 === 0 ? 0.03 : 0), 0.24, 0.62),
  }));

  obstacles = retagObstacleIds(obstacles, `pro-tour-${levelNumber}`);

  const situationTags = [
    ...buildSituationTags(environment, obstacles),
    "extended-tour",
    "pro-tour-expansion",
    `chapter-${chapter.id}`,
    `band-${difficultyBand}`,
  ];

  const obstacleWeight =
    obstacles.hazardPits.length * 0.5 +
    obstacles.movingBumpers.length * 0.72 +
    obstacles.walls.length * 0.55 +
    obstacles.windZones.length * 0.36 +
    obstacles.bumpers.length * 0.22;
  const basePar = { rookie: 3, pro: 3, elite: 4, master: 5 }[difficultyBand];
  const par = clamp(Math.round(basePar + obstacleWeight * 0.33), 2, 6);
  const baseTime = { rookie: 70_000, pro: 64_000, elite: 59_000, master: 54_000 }[difficultyBand];
  const timeLimitMs = clamp(
    Math.round(baseTime + (PRO_TOUR_CHAPTERS.length - chapterIndex) * 850 + obstacleWeight * 2_450),
    48_000,
    118_000
  );

  return {
    id: `pro-tour-${String(levelNumber).padStart(3, "0")}`,
    index: BASE_GOLF_LEVELS.length + MOBILE_EXPANSION_COUNT + extraIndex,
    worldIndex: 11 + chapterIndex,
    worldLevel: levelNumber,
    worldName: chapter.name,
    worldSubtitle: chapter.subtitle,
    environmentId: environment.id,
    environment,
    name: {
      es: `${chapter.name.es} - Nivel ${levelNumber}`,
      en: `${chapter.name.en} - Level ${levelNumber}`,
    },
    terrain: layout.terrain,
    tee: layout.tee,
    hole: layout.hole,
    coins: layout.coins,
    obstacles,
    situationTags,
    par,
    timeLimitMs,
    windBase: layout.windBase * windScale + chapterIndex * 3.1 + (difficultyBand === "master" ? 6 : 0),
    difficultyBand,
    scenery: buildScenery(environment, random, environment.atmosphere),
    starTargets: {
      three: par,
      two: par + 1,
      one: par + 2,
    },
  };
}

const BASE_GOLF_LEVELS = ENVIRONMENT_THEMES.flatMap((_, themeIndex) =>
  Array.from({ length: TEMPLATE_COUNT }, (_, templateIndex) => buildLevel(themeIndex, templateIndex))
);
const MOBILE_EXPANSION_LEVELS = Array.from({ length: MOBILE_EXPANSION_COUNT }, (_, index) =>
  buildMobileExpansionLevel(index)
);
const PRO_TOUR_EXPANSION_LEVELS = Array.from({ length: PRO_TOUR_EXPANSION_COUNT }, (_, index) =>
  buildProTourExpansionLevel(index)
);

export const GOLF_LEVELS = [...BASE_GOLF_LEVELS, ...MOBILE_EXPANSION_LEVELS, ...PRO_TOUR_EXPANSION_LEVELS];

export const LEVEL_COUNT = GOLF_LEVELS.length;

export function localizeLabel(label, locale) {
  return local(label, locale);
}

export function getLevelById(levelId) {
  return GOLF_LEVELS.find((level) => level.id === levelId) ?? GOLF_LEVELS[0];
}

export function getLevelByIndex(index) {
  const safe = clamp(Number(index) || 0, 0, GOLF_LEVELS.length - 1);
  return GOLF_LEVELS[safe];
}

export function describeLevelForHud(level, locale) {
  return {
    id: level.id,
    name: localizeLabel(level.name, locale),
    worldName: localizeLabel(level.worldName, locale),
    worldSubtitle: localizeLabel(level.worldSubtitle, locale),
    par: level.par,
    worldIndex: level.worldIndex,
    worldLevel: level.worldLevel,
    difficultyBand: level.difficultyBand,
    timeLimitMs: level.timeLimitMs,
    situationTags: level.situationTags,
  };
}
