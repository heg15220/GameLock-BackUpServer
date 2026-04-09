import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useMobileGameViewport from "../../mobile/useMobileGameViewport";
import useGameRuntimeBridge from "../../utils/useGameRuntimeBridge";
import {
  KNOWLEDGE_ARCADE_MATCH_COUNT,
  getRandomKnowledgeMatchId,
  resolveKnowledgeArcadeLocale,
} from "./knowledgeArcadeUtils";

const STORAGE_KEY = "knowledge.figureline.profile.v2";
const TIMER_TICK_MS = 100;
const NODE_PICK_RADIUS = 6.4;

const COPY = {
  es: {
    title: "Figure Line Protocol",
    subtitle: "Traza figuras en ruta unica: 100 niveles progresivos, de facil a extremo.",
    level: "Nivel",
    progress: "Progreso",
    difficulty: "Dificultad",
    time: "Tiempo",
    mistakes: "Errores",
    best: "Mejor",
    unlocked: "Desbloqueado",
    reset: "Reiniciar nivel",
    undo: "Deshacer",
    hint: "Pista",
    next: "Siguiente nivel",
    reduceMotionOn: "Motion reducido: ON",
    reduceMotionOff: "Motion reducido: OFF",
    controls:
      "Controles: click/tap en nodos para trazar, arrastre continuo opcional. Atajos: R reinicia, Z deshace, H pista, N siguiente nivel.",
    levelLocked: "Nivel bloqueado. Completa los anteriores para desbloquearlo.",
    startPath: "Ruta iniciada.",
    segmentOk: "Segmento correcto.",
    invalidMove: "Movimiento invalido: solo puedes ir a nodos conectados.",
    edgeUsed: "Ese segmento ya se uso. Prueba otra ruta.",
    hintStart: "Pista: empieza en el nodo resaltado.",
    hintNext: "Pista: continua hacia el nodo resaltado.",
    solved: (name) => `Figura completada: ${name}.`,
    solvedPerfect: (name) => `Figura completada sin errores: ${name}.`,
    tierEasy: "Facil",
    tierMedium: "Media",
    tierHard: "Dificil",
    tierExpert: "Extrema",
  },
  en: {
    title: "Figure Line Protocol",
    subtitle: "Trace single-route figures across 100 progressive levels, from easy to extreme.",
    level: "Level",
    progress: "Progress",
    difficulty: "Difficulty",
    time: "Time",
    mistakes: "Mistakes",
    best: "Best",
    unlocked: "Unlocked",
    reset: "Reset level",
    undo: "Undo",
    hint: "Hint",
    next: "Next level",
    reduceMotionOn: "Reduced motion: ON",
    reduceMotionOff: "Reduced motion: OFF",
    controls:
      "Controls: click/tap nodes to trace, continuous drag optional. Shortcuts: R reset, Z undo, H hint, N next level.",
    levelLocked: "Level locked. Complete previous ones first.",
    startPath: "Route started.",
    segmentOk: "Segment accepted.",
    invalidMove: "Invalid move: you can only go to connected nodes.",
    edgeUsed: "That segment was already used. Try another route.",
    hintStart: "Hint: start from the highlighted node.",
    hintNext: "Hint: continue toward the highlighted node.",
    solved: (name) => `Figure completed: ${name}.`,
    solvedPerfect: (name) => `Perfect clear on ${name}.`,
    tierEasy: "Easy",
    tierMedium: "Medium",
    tierHard: "Hard",
    tierExpert: "Expert",
  },
};

const TOTAL_LEVEL_COUNT = 100;
const CARDINAL_STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const DIAGONAL_STEPS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const PROCEDURAL_TITLES_ES = [
  "Orbita",
  "Nexo",
  "Circuito",
  "Prisma",
  "Helice",
  "Trama",
  "Vector",
  "Pulso",
  "Aster",
  "Laberinto",
];
const PROCEDURAL_TITLES_EN = [
  "Orbit",
  "Nexus",
  "Circuit",
  "Prism",
  "Helix",
  "Weave",
  "Vector",
  "Pulse",
  "Aster",
  "Maze",
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const edgeKey = (a, b) => (a < b ? `${a}__${b}` : `${b}__${a}`);
const toElapsedLabel = (ms) => `${(Math.max(0, ms) / 1000).toFixed(1)}s`;
const makeCellKey = (x, y) => `${x},${y}`;
const parseCellKey = (key) => key.split(",").map(Number);

const createSeededRandom = (seed) => {
  let state = seed >>> 0;
  if (!state) state = 0x6d2b79f5;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
};

const pickWeighted = (entries, random) => {
  if (!entries.length) return null;
  const total = entries.reduce((acc, item) => acc + item.weight, 0);
  if (!Number.isFinite(total) || total <= 0) {
    return entries[Math.floor(random() * entries.length)] ?? entries[0];
  }
  let cursor = random() * total;
  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry;
  }
  return entries[entries.length - 1];
};

const getDifficultyTier = (score) => {
  if (score < 28) return "easy";
  if (score < 46) return "medium";
  if (score < 64) return "hard";
  return "expert";
};

const getTierByRank = (index, total) => {
  if (total <= 1) return "easy";
  const progress = index / (total - 1);
  if (progress < 0.2) return "easy";
  if (progress < 0.55) return "medium";
  if (progress < 0.82) return "hard";
  return "expert";
};

const getLevelLabel = (level, locale, index) => {
  if (String(level.id).startsWith("procedural-")) {
    const serial = String(index + 1).padStart(3, "0");
    return locale === "es" ? `Figura ${serial}` : `Figure ${serial}`;
  }
  if (locale === "es" && level.nameEs) return level.nameEs;
  if (locale === "en" && level.nameEn) return level.nameEn;
  return locale === "es" ? `Figura ${index + 1}` : `Figure ${index + 1}`;
};

const getTierLabel = (tier, copy) => {
  if (tier === "easy") return copy.tierEasy;
  if (tier === "medium") return copy.tierMedium;
  if (tier === "hard") return copy.tierHard;
  return copy.tierExpert;
};

const HANDCRAFTED_LEVELS = [
  {
    id: "sailboat",
    nameEs: "Velero",
    nameEn: "Sailboat",
    nodes: {
      s1: [50, 12],
      s2: [50, 46],
      s3: [72, 46],
      s4: [82, 57],
      s5: [50, 82],
      s6: [18, 57],
      s7: [30, 46],
      s8: [72, 32],
      s9: [50, 32],
    },
    solution: ["s2", "s1", "s8", "s9", "s2", "s3", "s4", "s5", "s6", "s7", "s2"],
  },
  {
    id: "pine",
    nameEs: "Pino",
    nameEn: "Pine",
    nodes: {
      t1: [50, 12],
      t2: [70, 26],
      t3: [50, 30],
      t4: [30, 26],
      t5: [76, 46],
      t6: [50, 50],
      t7: [24, 46],
      t8: [70, 64],
      t9: [30, 64],
      t10: [56, 80],
      t11: [56, 92],
      t12: [44, 92],
      t13: [44, 80],
    },
    solution: [
      "t1",
      "t2",
      "t3",
      "t4",
      "t1",
      "t3",
      "t5",
      "t6",
      "t7",
      "t3",
      "t6",
      "t8",
      "t9",
      "t6",
      "t10",
      "t11",
      "t12",
      "t13",
      "t6",
    ],
  },
  {
    id: "kite",
    nameEs: "Cometa",
    nameEn: "Kite",
    nodes: {
      d1: [50, 15],
      d2: [78, 44],
      d3: [50, 44],
      d4: [22, 44],
      d5: [78, 72],
      d6: [22, 72],
      d7: [50, 90],
    },
    solution: ["d4", "d1", "d2", "d3", "d4", "d6", "d7", "d5", "d3", "d6"],
  },
  {
    id: "arrow",
    nameEs: "Flecha",
    nameEn: "Arrow",
    nodes: {
      a1: [18, 50],
      a2: [44, 24],
      a3: [44, 40],
      a4: [82, 40],
      a5: [82, 60],
      a6: [44, 60],
      a7: [44, 76],
    },
    solution: ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a1", "a6"],
  },
  {
    id: "infinity",
    nameEs: "Infinito",
    nameEn: "Infinity",
    nodes: {
      i1: [22, 50],
      i2: [38, 30],
      i3: [50, 50],
      i4: [38, 70],
      i5: [78, 50],
      i6: [62, 30],
      i7: [62, 70],
    },
    solution: ["i1", "i2", "i3", "i4", "i1", "i3", "i6", "i5", "i7", "i3"],
  },
  {
    id: "constellation",
    nameEs: "Constelacion",
    nameEn: "Constellation",
    nodes: {
      c1: [20, 20],
      c2: [40, 30],
      c3: [60, 18],
      c4: [78, 34],
      c5: [66, 56],
      c6: [80, 78],
      c7: [52, 76],
      c8: [30, 88],
      c9: [16, 66],
      c10: [34, 52],
      c11: [52, 44],
    },
    solution: ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10", "c11", "c5", "c7", "c10", "c2"],
  },
];

const buildFallbackProcedural = (index) => {
  const source = HANDCRAFTED_LEVELS[index % HANDCRAFTED_LEVELS.length];
  const angle = ((index * 37) % 360) * (Math.PI / 180);
  const scale = 0.8 + (index % 5) * 0.05;
  const shiftX = ((index * 11) % 9) - 4;
  const shiftY = ((index * 7) % 9) - 4;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const nodes = {};
  Object.entries(source.nodes).forEach(([id, point]) => {
    const dx = (point[0] - 50) * scale;
    const dy = (point[1] - 50) * scale;
    const rotatedX = dx * cos - dy * sin;
    const rotatedY = dx * sin + dy * cos;
    nodes[id] = [
      Number(clamp(50 + rotatedX + shiftX, 8, 92).toFixed(2)),
      Number(clamp(50 + rotatedY + shiftY, 8, 92).toFixed(2)),
    ];
  });
  return {
    nodes,
    solution: [...source.solution],
  };
};

const generateTrailLevel = ({
  seed,
  targetEdges,
  width,
  height,
  diagonalBias,
  revisitBias,
  maxDegree,
  minNodes,
  jitter,
}) => {
  const random = createSeededRandom(seed);
  for (let attempt = 0; attempt < 240; attempt += 1) {
    const startX = Math.floor(random() * width);
    const startY = Math.floor(random() * height);
    const startKey = makeCellKey(startX, startY);
    const trail = [startKey];
    const seenNodes = new Set([startKey]);
    const degree = { [startKey]: 0 };
    const usedEdges = new Set();

    let guard = 0;
    while (usedEdges.size < targetEdges && guard < targetEdges * 26) {
      guard += 1;
      const current = trail[trail.length - 1];
      const [cx, cy] = parseCellKey(current);
      const candidates = [];

      for (const [dx, dy] of [...CARDINAL_STEPS, ...DIAGONAL_STEPS]) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const next = makeCellKey(nx, ny);
        const key = edgeKey(current, next);
        if (usedEdges.has(key)) continue;
        if ((degree[current] ?? 0) >= maxDegree) continue;
        if ((degree[next] ?? 0) >= maxDegree) continue;

        const diagonal = Math.abs(dx) + Math.abs(dy) === 2;
        let weight = diagonal ? 0.56 + diagonalBias * 1.7 : 1.28;
        const isNewNode = !seenNodes.has(next);
        weight *= isNewNode ? 1.26 : 0.88 + revisitBias;

        const centerX = (width - 1) / 2;
        const centerY = (height - 1) / 2;
        const distanceFromCenter =
          (Math.abs(nx - centerX) + Math.abs(ny - centerY)) / Math.max(1, width + height);
        weight *= 1.18 - distanceFromCenter * 0.22;

        if (diagonal && random() > diagonalBias + 0.08) {
          weight *= 0.64;
        }
        candidates.push({ next, key, weight });
      }

      if (!candidates.length) break;
      const pick = pickWeighted(candidates, random);
      usedEdges.add(pick.key);
      degree[current] = (degree[current] ?? 0) + 1;
      degree[pick.next] = (degree[pick.next] ?? 0) + 1;
      trail.push(pick.next);
      seenNodes.add(pick.next);
    }

    if (usedEdges.size !== targetEdges) continue;
    if (seenNodes.size < minNodes) continue;
    if (Object.values(degree).some((value) => value > maxDegree)) continue;

    const cellToNodeId = {};
    const nodes = {};
    let nodeIndex = 1;
    seenNodes.forEach((cellKey) => {
      const [gridX, gridY] = parseCellKey(cellKey);
      const baseX = 9 + (82 * gridX) / Math.max(1, width - 1);
      const baseY = 9 + (82 * gridY) / Math.max(1, height - 1);
      const jitterX = (random() - 0.5) * jitter;
      const jitterY = (random() - 0.5) * jitter;
      const nodeId = `g${nodeIndex}`;
      nodeIndex += 1;
      cellToNodeId[cellKey] = nodeId;
      nodes[nodeId] = [
        Number(clamp(baseX + jitterX, 6, 94).toFixed(2)),
        Number(clamp(baseY + jitterY, 6, 94).toFixed(2)),
      ];
    });

    const solution = trail.map((cellKey) => cellToNodeId[cellKey]);
    return { nodes, solution };
  }
  return null;
};

const buildProceduralLevels = (count) => {
  const levels = [];
  for (let index = 0; index < count; index += 1) {
    const progress = count <= 1 ? 1 : index / (count - 1);
    const baselineEdges = 8 + progress * 19;
    const wave = Math.sin((index + 2.25) * 0.67) * (0.7 + progress * 1.8);
    const targetEdges = clamp(Math.round(baselineEdges + wave), 8, 24);

    const width = progress < 0.34 ? 6 : progress < 0.68 ? 7 : 8;
    const height = progress < 0.34 ? 7 : progress < 0.68 ? 8 : 9;
    const diagonalBias = clamp(progress * 0.68 - 0.05, 0.04, 0.62);
    const revisitBias = 0.16 + progress * 0.94;
    const maxDegree = progress < 0.36 ? 3 : 4;
    const minNodes = Math.max(5, Math.round(targetEdges * (0.87 - progress * 0.3)));
    const jitter = 0.35 + progress * 1.15;

    let generated = null;
    const baseSeed = ((index + 1) * 2654435761) >>> 0;
    for (let salt = 0; salt < 9 && !generated; salt += 1) {
      const seed = (baseSeed ^ (((salt + 11) * 2246822519) >>> 0)) >>> 0;
      generated = generateTrailLevel({
        seed,
        targetEdges,
        width,
        height,
        diagonalBias,
        revisitBias,
        maxDegree,
        minNodes,
        jitter,
      });
    }
    if (!generated) {
      generated = buildFallbackProcedural(index);
    }

    const serial = String(index + 1).padStart(3, "0");
    const titleSlot = index % PROCEDURAL_TITLES_ES.length;
    levels.push({
      id: `procedural-${serial}`,
      nameEs: `${PROCEDURAL_TITLES_ES[titleSlot]} ${serial}`,
      nameEn: `${PROCEDURAL_TITLES_EN[titleSlot]} ${serial}`,
      nodes: generated.nodes,
      solution: generated.solution,
    });
  }
  return levels;
};

const RAW_LEVELS = [
  ...HANDCRAFTED_LEVELS,
  ...buildProceduralLevels(Math.max(0, TOTAL_LEVEL_COUNT - HANDCRAFTED_LEVELS.length)),
];

const defaultProfile = {
  unlocked: 1,
  bestByLevel: {},
  reduceMotion: false,
};

const buildLevelGraph = (raw) => {
  const edges = [];
  const adjacency = {};
  const seen = new Set();
  for (let index = 0; index < raw.solution.length - 1; index += 1) {
    const a = raw.solution[index];
    const b = raw.solution[index + 1];
    const key = edgeKey(a, b);
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({ id: key, a, b });
    adjacency[a] = adjacency[a] ?? {};
    adjacency[b] = adjacency[b] ?? {};
    adjacency[a][b] = key;
    adjacency[b][a] = key;
  }

  const nodeIds = Object.keys(raw.nodes);
  const degreeValues = nodeIds.map((id) => Object.keys(adjacency[id] ?? {}).length);
  const branchLoad = degreeValues.reduce((acc, value) => acc + Math.max(0, value - 2), 0);
  const maxDegree = degreeValues.length ? Math.max(...degreeValues) : 0;
  const revisitCount = Math.max(0, raw.solution.length - nodeIds.length);
  const difficultyScore = Number(
    (
      edges.length * 2.4 +
      revisitCount * 1.65 +
      branchLoad * 4.4 +
      Math.max(0, maxDegree - 3) * 3.2
    ).toFixed(2)
  );

  return {
    ...raw,
    edges,
    adjacency,
    metrics: {
      branchLoad,
      maxDegree,
      revisitCount,
      nodeCount: nodeIds.length,
    },
    difficultyScore,
    difficultyTier: getDifficultyTier(difficultyScore),
  };
};

const LEVELS = RAW_LEVELS.map(buildLevelGraph)
  .sort(
    (a, b) =>
      a.difficultyScore - b.difficultyScore ||
      a.edges.length - b.edges.length ||
      a.id.localeCompare(b.id)
  )
  .slice(0, TOTAL_LEVEL_COUNT)
  .map((entry, index, list) => ({
    ...entry,
    sequence: index + 1,
    difficultyTier: getTierByRank(index, list.length),
  }));

const loadProfile = () => {
  if (typeof window === "undefined") return defaultProfile;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile;
    const parsed = JSON.parse(raw);
    return {
      unlocked: Number.isFinite(parsed?.unlocked) ? clamp(Math.round(parsed.unlocked), 1, LEVELS.length) : 1,
      bestByLevel: parsed?.bestByLevel && typeof parsed.bestByLevel === "object" ? parsed.bestByLevel : {},
      reduceMotion: Boolean(parsed?.reduceMotion),
    };
  } catch {
    return defaultProfile;
  }
};

const persistProfile = (profile) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage errors.
  }
};

const createRuntime = () => ({
  currentNodeId: null,
  pathNodeIds: [],
  visitedOrder: [],
  visitedMap: {},
  elapsedMs: 0,
  mistakes: 0,
  started: false,
  completed: false,
  invalidPulse: 0,
  hintEdgeKey: null,
});

const getNodeLabel = (nodeId) => String(nodeId).toUpperCase();

const pickHintEdge = (level, runtime) => {
  if (!runtime.currentNodeId) {
    const start = level.solution[0];
    const next = level.solution[1];
    if (!start || !next) return null;
    return edgeKey(start, next);
  }
  for (let index = 0; index < level.solution.length - 1; index += 1) {
    const a = level.solution[index];
    const b = level.solution[index + 1];
    const key = edgeKey(a, b);
    if (runtime.visitedMap[key]) continue;
    if (a === runtime.currentNodeId || b === runtime.currentNodeId) return key;
  }
  return null;
};

function IQMastersKnowledgeGame() {
  const locale = useMemo(() => (resolveKnowledgeArcadeLocale() === "es" ? "es" : "en"), []);
  const copy = useMemo(() => COPY[locale] ?? COPY.en, [locale]);
  const viewport = useMobileGameViewport();
  const svgRef = useRef(null);
  const [matchId] = useState(() => getRandomKnowledgeMatchId());
  const [state, setState] = useState(() => ({
    profile: loadProfile(),
    levelIndex: 0,
    runtime: createRuntime(),
    dragging: false,
    message: copy.startPath,
  }));

  const level = LEVELS[state.levelIndex];
  const unlocked = state.profile.unlocked;
  const canGoNext = state.levelIndex + 1 < Math.min(unlocked, LEVELS.length);
  const progressCount = state.runtime.visitedOrder.length;
  const totalEdges = level.edges.length;

  const bestLabel = useMemo(() => {
    const ms = Number(state.profile.bestByLevel?.[level.id]);
    if (!Number.isFinite(ms) || ms <= 0) return "-";
    return toElapsedLabel(ms);
  }, [level.id, state.profile.bestByLevel]);

  const levelTitle = getLevelLabel(level, locale, state.levelIndex);
  const difficultyLabel = getTierLabel(level.difficultyTier, copy);

  const setLevel = useCallback(
    (nextIndex) => {
      setState((previous) => {
        if (nextIndex < 0 || nextIndex >= LEVELS.length) return previous;
        if (nextIndex + 1 > previous.profile.unlocked) {
          return { ...previous, message: copy.levelLocked };
        }
        return {
          ...previous,
          levelIndex: nextIndex,
          runtime: createRuntime(),
          dragging: false,
            message: `${copy.level} ${nextIndex + 1}: ${getLevelLabel(LEVELS[nextIndex], locale, nextIndex)}`,
          };
        });
      },
    [copy, locale]
  );

  const resetLevel = useCallback(() => {
    setState((previous) => ({
      ...previous,
      runtime: createRuntime(),
      dragging: false,
      message: copy.startPath,
    }));
  }, [copy]);

  const toggleReduceMotion = useCallback(() => {
    setState((previous) => {
      const profile = {
        ...previous.profile,
        reduceMotion: !previous.profile.reduceMotion,
      };
      persistProfile(profile);
      return { ...previous, profile };
    });
  }, []);

  const applyCompletion = useCallback(
    (snapshot, elapsedMs, mistakes) => {
      const nextProfile = { ...snapshot.profile };
      const bestByLevel = { ...nextProfile.bestByLevel };
      const previousBest = Number(bestByLevel[level.id]);
      if (!Number.isFinite(previousBest) || elapsedMs < previousBest) {
        bestByLevel[level.id] = Math.round(elapsedMs);
      }
      nextProfile.bestByLevel = bestByLevel;
      nextProfile.unlocked = Math.min(
        LEVELS.length,
        Math.max(nextProfile.unlocked, snapshot.levelIndex + 2)
      );
      persistProfile(nextProfile);
      return {
        ...snapshot,
        profile: nextProfile,
        message:
          mistakes === 0
            ? copy.solvedPerfect(levelTitle)
            : copy.solved(levelTitle),
      };
    },
    [copy, level.id, levelTitle]
  );

  const attemptNode = useCallback(
    (nodeId) => {
      setState((previous) => {
        const currentLevel = LEVELS[previous.levelIndex];
        const runtime = previous.runtime;
        if (runtime.completed) return previous;

        if (!runtime.currentNodeId) {
          return {
            ...previous,
            runtime: {
              ...runtime,
              currentNodeId: nodeId,
              pathNodeIds: [nodeId],
              started: true,
              hintEdgeKey: null,
            },
            message: `${copy.startPath} (${getNodeLabel(nodeId)})`,
          };
        }

        if (runtime.currentNodeId === nodeId) return previous;
        const key = currentLevel.adjacency[runtime.currentNodeId]?.[nodeId];
        if (!key) {
          return {
            ...previous,
            runtime: {
              ...runtime,
              mistakes: runtime.mistakes + 1,
              invalidPulse: runtime.invalidPulse + 1,
            },
            message: copy.invalidMove,
          };
        }
        if (runtime.visitedMap[key]) {
          return {
            ...previous,
            runtime: {
              ...runtime,
              mistakes: runtime.mistakes + 1,
              invalidPulse: runtime.invalidPulse + 1,
            },
            message: copy.edgeUsed,
          };
        }

        const visitedOrder = [...runtime.visitedOrder, key];
        const visitedMap = { ...runtime.visitedMap, [key]: true };
        const completed = visitedOrder.length === currentLevel.edges.length;
        let nextState = {
          ...previous,
          runtime: {
            ...runtime,
            currentNodeId: nodeId,
            pathNodeIds: [...runtime.pathNodeIds, nodeId],
            visitedOrder,
            visitedMap,
            completed,
            hintEdgeKey: null,
          },
          message: copy.segmentOk,
        };
        if (completed) {
          nextState = applyCompletion(nextState, runtime.elapsedMs, runtime.mistakes);
        }
        return nextState;
      });
    },
    [applyCompletion, copy]
  );

  const undoMove = useCallback(() => {
    setState((previous) => {
      const runtime = previous.runtime;
      if (!runtime.pathNodeIds.length) return previous;
      if (!runtime.visitedOrder.length) {
        return {
          ...previous,
          runtime: createRuntime(),
          message: copy.startPath,
        };
      }
      const visitedOrder = runtime.visitedOrder.slice(0, -1);
      const popped = runtime.visitedOrder[runtime.visitedOrder.length - 1];
      const visitedMap = { ...runtime.visitedMap };
      delete visitedMap[popped];
      const pathNodeIds = runtime.pathNodeIds.slice(0, -1);
      return {
        ...previous,
        runtime: {
          ...runtime,
          visitedOrder,
          visitedMap,
          pathNodeIds,
          currentNodeId: pathNodeIds[pathNodeIds.length - 1] ?? null,
          completed: false,
          hintEdgeKey: null,
        },
        message: copy.segmentOk,
      };
    });
  }, [copy]);

  const requestHint = useCallback(() => {
    setState((previous) => {
      const currentLevel = LEVELS[previous.levelIndex];
      const hintEdgeKey = pickHintEdge(currentLevel, previous.runtime);
      if (!hintEdgeKey) return previous;
      return {
        ...previous,
        runtime: {
          ...previous.runtime,
          hintEdgeKey,
        },
        message: previous.runtime.currentNodeId ? copy.hintNext : copy.hintStart,
      };
    });
  }, [copy]);

  const getNodeFromPointer = useCallback((event) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    let bestId = null;
    let bestDistance = NODE_PICK_RADIUS * NODE_PICK_RADIUS;
    Object.entries(level.nodes).forEach(([id, point]) => {
      const dx = x - point[0];
      const dy = y - point[1];
      const distance = dx * dx + dy * dy;
      if (distance <= bestDistance) {
        bestDistance = distance;
        bestId = id;
      }
    });
    return bestId;
  }, [level.nodes]);

  const onPointerDown = useCallback((event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const nodeId = getNodeFromPointer(event);
    if (!nodeId) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setState((previous) => ({ ...previous, dragging: true }));
    attemptNode(nodeId);
  }, [attemptNode, getNodeFromPointer]);

  const onPointerMove = useCallback((event) => {
    if (!state.dragging) return;
    const nodeId = getNodeFromPointer(event);
    if (!nodeId) return;
    attemptNode(nodeId);
  }, [attemptNode, getNodeFromPointer, state.dragging]);

  const onPointerUp = useCallback((event) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setState((previous) => ({ ...previous, dragging: false }));
  }, []);

  useEffect(() => {
    if (!state.runtime.started || state.runtime.completed) return undefined;
    const timerId = window.setInterval(() => {
      setState((previous) => {
        if (!previous.runtime.started || previous.runtime.completed) return previous;
        return {
          ...previous,
          runtime: {
            ...previous.runtime,
            elapsedMs: previous.runtime.elapsedMs + TIMER_TICK_MS,
          },
        };
      });
    }, TIMER_TICK_MS);
    return () => window.clearInterval(timerId);
  }, [state.runtime.completed, state.runtime.started]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target?.tagName?.toLowerCase?.();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      const key = event.key.toLowerCase();
      if (key === "r") {
        event.preventDefault();
        resetLevel();
      } else if (key === "z") {
        event.preventDefault();
        undoMove();
      } else if (key === "h") {
        event.preventDefault();
        requestHint();
      } else if (key === "n" && state.runtime.completed) {
        event.preventDefault();
        setLevel(Math.min(state.levelIndex + 1, LEVELS.length - 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [requestHint, resetLevel, setLevel, state.levelIndex, state.runtime.completed, undoMove]);

  const payloadBuilder = useCallback(
    (snapshot) => {
      const activeLevel = LEVELS[snapshot.levelIndex];
      return {
        mode: "knowledge-arcade",
        variant: "iq-masters-figures",
        locale,
        coordinates: "svg_viewbox_0_0_100_100",
        match: {
          current: matchId + 1,
          total: KNOWLEDGE_ARCADE_MATCH_COUNT,
        },
        level: {
          index: snapshot.levelIndex + 1,
          id: activeLevel.id,
          edgesTotal: activeLevel.edges.length,
          edgesDone: snapshot.runtime.visitedOrder.length,
          completed: snapshot.runtime.completed,
          difficultyTier: activeLevel.difficultyTier,
          difficultyScore: activeLevel.difficultyScore,
          metrics: activeLevel.metrics,
        },
        runtime: {
          currentNodeId: snapshot.runtime.currentNodeId,
          pathNodeIds: snapshot.runtime.pathNodeIds,
          visitedOrder: snapshot.runtime.visitedOrder,
          elapsedMs: snapshot.runtime.elapsedMs,
          mistakes: snapshot.runtime.mistakes,
          hintEdgeKey: snapshot.runtime.hintEdgeKey,
        },
        profile: {
          unlocked: snapshot.profile.unlocked,
          reduceMotion: snapshot.profile.reduceMotion,
          bestByLevel: snapshot.profile.bestByLevel,
        },
        message: snapshot.message,
      };
    },
    [locale, matchId]
  );

  const advanceTime = useCallback((ms) => {
    const safe = Number.isFinite(ms) ? Math.max(0, ms) : 0;
    if (!safe) return;
    setState((previous) => {
      if (!previous.runtime.started || previous.runtime.completed) return previous;
      return {
        ...previous,
        runtime: {
          ...previous.runtime,
          elapsedMs: previous.runtime.elapsedMs + safe,
        },
      };
    });
  }, []);

  useGameRuntimeBridge(state, payloadBuilder, advanceTime);

  return (
    <div
      className={[
        "mini-game",
        "knowledge-game",
        "knowledge-arcade-game",
        "knowledge-iq-masters",
        state.profile.reduceMotion ? "iqm-reduced-motion" : "",
        viewport.isMobile ? "is-mobile" : "",
        viewport.isMobile ? `is-mobile-${viewport.orientation}` : ""
      ].filter(Boolean).join(" ")}
    >
      <div className="mini-head iqm-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="iqm-head-actions">
          <button type="button" className="knowledge-ui-btn knowledge-ui-btn-secondary" onClick={toggleReduceMotion}>
            {state.profile.reduceMotion ? copy.reduceMotionOn : copy.reduceMotionOff}
          </button>
          <button type="button" className="knowledge-ui-btn knowledge-ui-btn-primary" onClick={resetLevel}>
            {copy.reset}
          </button>
        </div>
      </div>

      <section
        className={[
          "knowledge-mode-shell",
          "iqm-shell",
          "iqm-figures-shell",
          viewport.isMobile ? "knowledge-mobile-shell" : ""
        ].filter(Boolean).join(" ")}
      >
        <div className="iqm-status-row">
          <span>{copy.level}: {state.levelIndex + 1}/{LEVELS.length} - {levelTitle}</span>
          <span>{copy.progress}: {progressCount}/{totalEdges}</span>
          <span>{copy.difficulty}: {difficultyLabel} ({Math.round(level.difficultyScore)})</span>
          <span>{copy.time}: {toElapsedLabel(state.runtime.elapsedMs)}</span>
          <span>{copy.mistakes}: {state.runtime.mistakes}</span>
          <span>{copy.best}: {bestLabel}</span>
          <span>{copy.unlocked}: {unlocked}/{LEVELS.length}</span>
        </div>

        <div className="iqm-figure-layout">
          <div className={`iqm-figure-board${state.runtime.invalidPulse % 2 === 1 ? " is-invalid" : ""}`}>
            <svg
              ref={svgRef}
              viewBox="0 0 100 100"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              role="img"
              aria-label={`${copy.level} ${state.levelIndex + 1}`}
            >
              {level.edges.map((edge) => {
                const a = level.nodes[edge.a];
                const b = level.nodes[edge.b];
                const visited = Boolean(state.runtime.visitedMap[edge.id]);
                const hinted = state.runtime.hintEdgeKey === edge.id;
                return (
                  <line
                    key={`edge-${edge.id}`}
                    x1={a[0]}
                    y1={a[1]}
                    x2={b[0]}
                    y2={b[1]}
                    className={`iqm-edge${visited ? " visited" : ""}${hinted ? " hinted" : ""}`}
                  />
                );
              })}
              {state.runtime.pathNodeIds.length > 1 ? (
                <polyline
                  points={state.runtime.pathNodeIds
                    .map((nodeId) => {
                      const point = level.nodes[nodeId];
                      return `${point[0]},${point[1]}`;
                    })
                    .join(" ")}
                  className="iqm-trace"
                />
              ) : null}
              {Object.entries(level.nodes).map(([id, point]) => {
                const current = state.runtime.currentNodeId === id;
                const hinted =
                  state.runtime.hintEdgeKey &&
                  level.edges.some((edge) => edge.id === state.runtime.hintEdgeKey && (edge.a === id || edge.b === id));
                return (
                  <circle
                    key={`node-${id}`}
                    cx={point[0]}
                    cy={point[1]}
                    r={current ? 2.55 : 2.05}
                    className={`iqm-node${current ? " current" : ""}${hinted ? " hinted" : ""}`}
                  />
                );
              })}
            </svg>
          </div>

          <aside className="iqm-figure-sidebar">
            <div className="iqm-figure-actions">
              <button type="button" className="knowledge-ui-btn knowledge-ui-btn-secondary" onClick={undoMove}>
                {copy.undo}
              </button>
              <button type="button" className="knowledge-ui-btn knowledge-ui-btn-secondary" onClick={requestHint}>
                {copy.hint}
              </button>
              <button
                type="button"
                className="knowledge-ui-btn knowledge-ui-btn-accent"
                onClick={() => setLevel(Math.min(state.levelIndex + 1, LEVELS.length - 1))}
                disabled={!state.runtime.completed || !canGoNext}
              >
                {copy.next}
              </button>
            </div>

            <div className="iqm-level-strip">
              {LEVELS.map((entry, index) => {
                const isLocked = index + 1 > unlocked;
                const active = index === state.levelIndex;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    className={`iqm-level-chip${active ? " active" : ""}${isLocked ? " locked" : ""}`}
                    onClick={() => setLevel(index)}
                    disabled={isLocked}
                  >
                    <span>{index + 1}</span>
                    <strong>{getLevelLabel(entry, locale, index)}</strong>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>

        <p className="iqm-controls">{copy.controls}</p>
      </section>

      <p className="game-message iqm-message">{state.message}</p>
    </div>
  );
}

export default IQMastersKnowledgeGame;
