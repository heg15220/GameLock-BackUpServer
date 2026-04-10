import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";

const ROWS = 8;
const COLS = 9;
const BASE_TIME_MS = 180000;
const MAX_MOVES = 32;
const DEFAULT_TARGET_SCORE = 14800;
const DEFAULT_TARGET_SCORE_OPTION_ID = "orchard";
const TARGET_SCORE_OPTIONS = [
  {
    id: "sprout",
    score: 12000,
    timeMs: BASE_TIME_MS,
    accent: "#34d399",
    label: { es: "Basica", en: "Basic" },
  },
  {
    id: "orchard",
    score: DEFAULT_TARGET_SCORE,
    timeMs: BASE_TIME_MS + 60000,
    accent: "#60a5fa",
    label: { es: "Clasica", en: "Standard" },
  },
  {
    id: "harvest",
    score: 18000,
    timeMs: BASE_TIME_MS + 120000,
    accent: "#f59e0b",
    label: { es: "Avanzada", en: "Advanced" },
  },
  {
    id: "legend",
    score: 22000,
    timeMs: BASE_TIME_MS + 180000,
    accent: "#f472b6",
    label: { es: "Extrema", en: "Extreme" },
  },
];
const TARGET_HARVEST = 120;
const TARGET_SPECIALS = 7;

const SPECIAL_NONE = "none";
const SPECIAL_LINE_H = "lineH";
const SPECIAL_LINE_V = "lineV";
const SPECIAL_BOMB = "bomb";

const FLOW_WINDOW_MS = 2700;
const FLOW_STEP = 0.18;
const FLOW_MAX = 6;
const BONUS_CHAIN_FOR_MOVE = 3;

const BLOOM_CHARGE_MAX = 100;
const BLOOM_CHARGE_COST = 100;
const BLOOM_GAIN_PER_CLEAR = 5;
const BLOOM_GAIN_PER_SPECIAL = 13;

const FX_CLEAR_MS = 260;
const FX_FALL_MS = 380;
const FX_PARTICLE_MS = 980;
const FX_SHAKE_MS = 280;
const FX_FLASH_MS = 260;
const FX_RING_MS = 520;
const FX_BANNER_MS = 980;
const FX_TOTAL_MS = 1180;

const HS_KEY = "arcade_orchard_match_blast_high_score_v2";

const BLOCK_TYPES = [
  { key: "red", main: "#ef4444", shade: "#991b1b", glow: "#fecaca" },
  { key: "yellow", main: "#facc15", shade: "#a16207", glow: "#fef08a" },
  { key: "blue", main: "#2563eb", shade: "#1e3a8a", glow: "#bfdbfe" },
  { key: "purple", main: "#7c3aed", shade: "#4c1d95", glow: "#ddd6fe" },
  { key: "green", main: "#10b981", shade: "#065f46", glow: "#a7f3d0" },
  { key: "orange", main: "#fb923c", shade: "#9a3412", glow: "#fed7aa" },
];

const DIRS = [
  { row: 0, col: 1 },
  { row: 1, col: 0 },
];

const COPY = {
  es: {
    title: "Orchard Match Blast",
    subtitle: "Motor match-3 nuevo con cascadas fisicas y ritmo competitivo.",
    start: "Iniciar run",
    restart: "Nueva run",
    hint: "Pista",
    shuffle: "Mezclar",
    bloom: "Bloom",
    fullscreen: "Pantalla completa",
    targetScoreLabel: "Meta de puntos",
    targetScoreShort: "Meta",
    targetPresetHint: "Elige la meta antes de iniciar la run. Cada nivel sube +1:00.",
    modeMenu: "Pulsa Iniciar run para comenzar.",
    modePlay: "Combina, encadena cascadas y controla el ritmo.",
    modeWon: "Meta de puntos completada. Victoria.",
    modeLost: "Run terminada. Reintenta.",
    score: "Puntos",
    best: "Record",
    moves: "Movs",
    time: "Tiempo",
    combo: "Combo",
    flow: "Ritmo",
    harvest: "Cosecha",
    specials: "Especiales",
    bloomCharge: "Carga",
    goalScore: "Puntuacion",
    goalHarvest: "Cosecha",
    goalSpecials: "Especiales",
    invalid: "Ese intercambio no crea match.",
    good: "Buen intercambio.",
    comboMsg: "Combo x",
    comboBanner: "COMBO x",
    chainBanner: "CADENA x",
    specialBanner: "ESPECIAL",
    bloomBanner: "BLOOM BLAST",
    specialMsg: "Intercambio especial activado.",
    bloomMsg: "Bloom Blast ejecutado.",
    bloomNeed: "Carga Bloom al 100% para usarla.",
    noHint: "Sin jugadas disponibles. Usa mezclar.",
    reshuffle: "Tablero mezclado: no quedaban jugadas.",
    won: "Meta de puntos alcanzada antes de tiempo. Run completada.",
    lost: "No completaste todos los objetivos.",
    moveBonus: "mov extra",
    controls:
      "Raton/touch: selecciona 2 bloques de color adyacentes. Elige meta de puntos antes de iniciar. Teclado: flechas, Enter/Espacio, H pista, S mezclar, B Bloom, R reinicia, F fullscreen.",
  },
  en: {
    title: "Orchard Match Blast",
    subtitle: "New match-3 engine with physics cascades and tempo play.",
    start: "Start run",
    restart: "New run",
    hint: "Hint",
    shuffle: "Shuffle",
    bloom: "Bloom",
    fullscreen: "Fullscreen",
    targetScoreLabel: "Score goal",
    targetScoreShort: "Goal",
    targetPresetHint: "Pick the score goal before starting a run. Each level adds +1:00.",
    modeMenu: "Press Start run to begin.",
    modePlay: "Match, chain cascades, and control your tempo.",
    modeWon: "Score goal completed. Victory.",
    modeLost: "Run ended. Retry.",
    score: "Score",
    best: "Best",
    moves: "Moves",
    time: "Time",
    combo: "Combo",
    flow: "Flow",
    harvest: "Harvest",
    specials: "Specials",
    bloomCharge: "Charge",
    goalScore: "Score",
    goalHarvest: "Harvest",
    goalSpecials: "Specials",
    invalid: "That swap does not create a match.",
    good: "Good swap.",
    comboMsg: "Combo x",
    comboBanner: "COMBO x",
    chainBanner: "CHAIN x",
    specialBanner: "SPECIAL",
    bloomBanner: "BLOOM BLAST",
    specialMsg: "Special swap activated.",
    bloomMsg: "Bloom Blast fired.",
    bloomNeed: "Fill Bloom Charge to 100% before using it.",
    noHint: "No moves available. Use shuffle.",
    reshuffle: "Board reshuffled: no moves left.",
    won: "Score goal reached before time. Run complete.",
    lost: "Not all objectives were completed.",
    moveBonus: "extra move",
    controls:
      "Mouse/touch: pick 2 adjacent color blocks. Choose the score goal before starting. Keyboard: arrows, Enter/Space, H hint, S shuffle, B Bloom, R restart, F fullscreen.",
  },
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const safeInt = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.floor(numeric) : fallback;
};
const key = (row, col) => `${row}:${col}`;
const parseKey = (raw) => {
  const [r, c] = String(raw).split(":");
  return { row: safeInt(r), col: safeInt(c) };
};
const inBounds = (row, col) => row >= 0 && row < ROWS && col >= 0 && col < COLS;
const adjacent = (a, b) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const getTargetScoreOptionById = (optionId) =>
  TARGET_SCORE_OPTIONS.find((option) => option.id === optionId) ??
  TARGET_SCORE_OPTIONS.find((option) => option.id === DEFAULT_TARGET_SCORE_OPTION_ID) ??
  TARGET_SCORE_OPTIONS[0];

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let n = state;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

const randomType = (rng) => Math.floor(rng() * BLOCK_TYPES.length);
const makeCell = (type, special = SPECIAL_NONE) => ({ type, special });
const cloneCell = (cell) => (cell ? { ...cell } : null);
const cloneBoard = (board) => board.map((row) => row.map((cell) => cloneCell(cell)));

function hasLocalMatch(board, row, col) {
  const cell = board[row]?.[col];
  if (!cell) return false;
  const t = cell.type;
  let run = 1;
  for (let c = col - 1; c >= 0 && board[row][c]?.type === t; c -= 1) run += 1;
  for (let c = col + 1; c < COLS && board[row][c]?.type === t; c += 1) run += 1;
  if (run >= 3) return true;
  run = 1;
  for (let r = row - 1; r >= 0 && board[r][col]?.type === t; r -= 1) run += 1;
  for (let r = row + 1; r < ROWS && board[r][col]?.type === t; r += 1) run += 1;
  return run >= 3;
}

function analyzeMatches(board) {
  const matched = new Set();
  const runs = [];

  for (let row = 0; row < ROWS; row += 1) {
    let runType = board[row][0]?.type ?? null;
    let runStart = 0;
    for (let col = 1; col <= COLS; col += 1) {
      const current = col < COLS ? board[row][col]?.type ?? null : null;
      if (current === runType) continue;
      const len = col - runStart;
      if (runType != null && len >= 3) {
        const cells = [];
        for (let c = runStart; c < col; c += 1) {
          matched.add(key(row, c));
          cells.push({ row, col: c });
        }
        runs.push({ orientation: "h", length: len, type: runType, cells });
      }
      runType = current;
      runStart = col;
    }
  }

  for (let col = 0; col < COLS; col += 1) {
    let runType = board[0][col]?.type ?? null;
    let runStart = 0;
    for (let row = 1; row <= ROWS; row += 1) {
      const current = row < ROWS ? board[row][col]?.type ?? null : null;
      if (current === runType) continue;
      const len = row - runStart;
      if (runType != null && len >= 3) {
        const cells = [];
        for (let r = runStart; r < row; r += 1) {
          matched.add(key(r, col));
          cells.push({ row: r, col });
        }
        runs.push({ orientation: "v", length: len, type: runType, cells });
      }
      runType = current;
      runStart = row;
    }
  }

  return { matched, runs };
}

function swapCells(board, a, b) {
  const next = cloneBoard(board);
  const temp = next[a.row][a.col];
  next[a.row][a.col] = next[b.row][b.col];
  next[b.row][b.col] = temp;
  return next;
}

function findPossibleSwap(board) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const from = { row, col };
      for (const dir of DIRS) {
        const to = { row: row + dir.row, col: col + dir.col };
        if (!inBounds(to.row, to.col)) continue;
        const swapped = swapCells(board, from, to);
        const specialMove =
          swapped[from.row][from.col].special !== SPECIAL_NONE ||
          swapped[to.row][to.col].special !== SPECIAL_NONE;
        if (
          specialMove ||
          hasLocalMatch(swapped, from.row, from.col) ||
          hasLocalMatch(swapped, to.row, to.col)
        ) {
          return [from, to];
        }
      }
    }
  }
  return null;
}

function buildFreshBoard(rng) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        let t = randomType(rng);
        for (let tries = 0; tries < 12; tries += 1) {
          const blockedH =
            col >= 2 &&
            board[row][col - 1]?.type === t &&
            board[row][col - 2]?.type === t;
          const blockedV =
            row >= 2 &&
            board[row - 1][col]?.type === t &&
            board[row - 2][col]?.type === t;
          if (!blockedH && !blockedV) break;
          t = (t + 1 + Math.floor(rng() * 4)) % BLOCK_TYPES.length;
        }
        board[row][col] = makeCell(t);
      }
    }
    if (findPossibleSwap(board)) return board;
  }
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => makeCell(randomType(rng)))
  );
}

function expandBySpecial(clearSet, queue, row, col, special) {
  if (special === SPECIAL_LINE_H || special === SPECIAL_BOMB) {
    for (let c = 0; c < COLS; c += 1) {
      const k = key(row, c);
      if (!clearSet.has(k)) {
        clearSet.add(k);
        queue.push(k);
      }
    }
  }
  if (special === SPECIAL_LINE_V || special === SPECIAL_BOMB) {
    for (let r = 0; r < ROWS; r += 1) {
      const k = key(r, col);
      if (!clearSet.has(k)) {
        clearSet.add(k);
        queue.push(k);
      }
    }
  }
  if (special === SPECIAL_BOMB) {
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        const rr = row + dr;
        const cc = col + dc;
        if (!inBounds(rr, cc)) continue;
        const k = key(rr, cc);
        if (!clearSet.has(k)) {
          clearSet.add(k);
          queue.push(k);
        }
      }
    }
  }
}

function collapseBoard(board, rng) {
  const next = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const falls = [];
  for (let col = 0; col < COLS; col += 1) {
    let write = ROWS - 1;
    for (let row = ROWS - 1; row >= 0; row -= 1) {
      const cell = board[row][col];
      if (!cell) continue;
      const moved = cloneCell(cell);
      next[write][col] = moved;
      if (write !== row) {
        falls.push({ row: write, col, fromRow: row, type: moved.type, special: moved.special });
      }
      write -= 1;
    }
    while (write >= 0) {
      const spawned = makeCell(randomType(rng), SPECIAL_NONE);
      next[write][col] = spawned;
      falls.push({
        row: write,
        col,
        fromRow: -1 - (write % 3),
        type: spawned.type,
        special: spawned.special,
      });
      write -= 1;
    }
  }
  return { board: next, falls };
}

function resolveCascades(board, rng, preferred = null) {
  let nextBoard = cloneBoard(board);
  let cascades = 0;
  let score = 0;
  let lastClear = 0;
  let created = 0;
  let triggered = 0;
  let harvest = 0;
  const clearKeys = new Set();
  const fallMoves = [];

  while (cascades < 24) {
    const data = analyzeMatches(nextBoard);
    if (!data.matched.size) break;
    cascades += 1;

    const spawn = new Map();
    for (const run of data.runs) {
      if (run.length < 4) continue;
      const anchor =
        preferred && run.cells.some((cell) => cell.row === preferred.row && cell.col === preferred.col)
          ? preferred
          : run.cells[Math.floor(run.cells.length / 2)];
      const anchorKey = key(anchor.row, anchor.col);
      const special =
        run.length >= 5
          ? SPECIAL_BOMB
          : run.orientation === "h"
            ? SPECIAL_LINE_H
            : SPECIAL_LINE_V;
      const prev = spawn.get(anchorKey);
      if (!prev) spawn.set(anchorKey, { type: run.type, special });
      else {
        spawn.set(anchorKey, {
          type: prev.type,
          special: prev.special === special ? special : SPECIAL_BOMB,
        });
      }
    }

    const clearSet = new Set(data.matched);
    const queue = [...clearSet];
    const seen = new Set();
    let loopTriggered = 0;
    while (queue.length) {
      const current = queue.pop();
      if (!current || seen.has(current)) continue;
      seen.add(current);
      const { row, col } = parseKey(current);
      const cell = nextBoard[row][col];
      if (!cell || cell.special === SPECIAL_NONE) continue;
      loopTriggered += 1;
      expandBySpecial(clearSet, queue, row, col, cell.special);
    }

    for (const spawnKey of spawn.keys()) clearSet.delete(spawnKey);
    for (const clearKey of clearSet) clearKeys.add(clearKey);
    lastClear = clearSet.size;
    harvest += lastClear;
    created += spawn.size;
    triggered += loopTriggered;
    const mult = 1 + (cascades - 1) * 0.56;
    score += Math.round((lastClear * 86 + loopTriggered * 190 + spawn.size * 124) * mult);

    for (const clearKey of clearSet) {
      const { row, col } = parseKey(clearKey);
      nextBoard[row][col] = null;
    }
    for (const [spawnKey, spawnValue] of spawn) {
      const { row, col } = parseKey(spawnKey);
      nextBoard[row][col] = makeCell(spawnValue.type, spawnValue.special);
    }

    const collapsed = collapseBoard(nextBoard, rng);
    nextBoard = collapsed.board;
    fallMoves.push(...collapsed.falls);
    preferred = null;
  }

  return {
    board: nextBoard,
    cascades,
    score,
    lastClear,
    created,
    triggered,
    harvest,
    clears: [...clearKeys].map(parseKey),
    falls: fallMoves,
  };
}

function resolveSpecialSwap(board, from, to, rng) {
  const nextBoard = cloneBoard(board);
  const clearSet = new Set([key(from.row, from.col), key(to.row, to.col)]);
  const queue = [...clearSet];
  const seen = new Set();
  let manualTriggered = 0;
  while (queue.length) {
    const current = queue.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    const { row, col } = parseKey(current);
    const cell = nextBoard[row][col];
    if (!cell || cell.special === SPECIAL_NONE) continue;
    manualTriggered += 1;
    expandBySpecial(clearSet, queue, row, col, cell.special);
  }

  for (const clearKey of clearSet) {
    const { row, col } = parseKey(clearKey);
    nextBoard[row][col] = null;
  }

  const baseScore = Math.round(260 + clearSet.size * 106 + manualTriggered * 210);
  const collapsed = collapseBoard(nextBoard, rng);
  const cascaded = resolveCascades(collapsed.board, rng, to);
  const merged = new Set([...clearSet, ...cascaded.clears.map((cell) => key(cell.row, cell.col))]);

  return {
    board: cascaded.board,
    cascades: Math.max(1, cascaded.cascades),
    score: baseScore + cascaded.score,
    lastClear: cascaded.lastClear || clearSet.size,
    created: cascaded.created,
    triggered: manualTriggered + cascaded.triggered,
    harvest: clearSet.size + cascaded.harvest,
    clears: [...merged].map(parseKey),
    falls: [...collapsed.falls, ...cascaded.falls],
    manual: true,
  };
}

function resolveBloomBlast(board, center, rng) {
  const nextBoard = cloneBoard(board);
  const clearSet = new Set();
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      const row = center.row + dr;
      const col = center.col + dc;
      if (inBounds(row, col)) clearSet.add(key(row, col));
    }
  }

  const queue = [...clearSet];
  const seen = new Set();
  let manualTriggered = 0;
  while (queue.length) {
    const current = queue.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    const { row, col } = parseKey(current);
    const cell = nextBoard[row][col];
    if (!cell || cell.special === SPECIAL_NONE) continue;
    manualTriggered += 1;
    expandBySpecial(clearSet, queue, row, col, cell.special);
  }

  for (const clearKey of clearSet) {
    const { row, col } = parseKey(clearKey);
    nextBoard[row][col] = null;
  }

  const baseScore = Math.round(380 + clearSet.size * 112 + manualTriggered * 220);
  const collapsed = collapseBoard(nextBoard, rng);
  const cascaded = resolveCascades(collapsed.board, rng, center);
  const merged = new Set([...clearSet, ...cascaded.clears.map((cell) => key(cell.row, cell.col))]);

  return {
    board: cascaded.board,
    cascades: Math.max(1, cascaded.cascades),
    score: baseScore + cascaded.score,
    lastClear: cascaded.lastClear || clearSet.size,
    created: cascaded.created,
    triggered: manualTriggered + cascaded.triggered,
    harvest: clearSet.size + cascaded.harvest,
    clears: [...merged].map(parseKey),
    falls: [...collapsed.falls, ...cascaded.falls],
    manual: true,
  };
}

function layoutFromSize(width, height) {
  const w = clamp(safeInt(width, 980), 360, 2400);
  const h = clamp(safeInt(height, 760), 420, 1080);
  const compactHud = w <= 520;
  const pad = clamp(Math.round(w * 0.02), 8, 24);
  const hudTop = clamp(Math.round(h * 0.015), 4, 12);
  const hudHeight = clamp(
    Math.round(h * (compactHud ? 0.145 : 0.12)),
    compactHud ? 92 : 78,
    compactHud ? 144 : 122
  );
  const footerHeight = clamp(
    Math.round(h * (compactHud ? 0.09 : 0.082)),
    compactHud ? 42 : 36,
    compactHud ? 82 : 72
  );
  const availH = h - hudTop - hudHeight - footerHeight - 12;
  const availW = w - pad * 2;
  const tile = clamp(Math.floor(Math.min(availW / COLS, availH / ROWS)), 28, 98);
  const boardW = tile * COLS;
  const boardH = tile * ROWS;
  const left = Math.round((w - boardW) / 2);
  const top = hudTop + hudHeight + 6;
  const footerY = top + boardH + 6;
  return { w, h, pad, hudTop, hudHeight, tile, boardW, boardH, left, top, footerY };
}

const fmtTime = (ms) => {
  const total = Math.floor(Math.max(0, safeInt(ms)) / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
};

function resolveTouchDevice() {
  if (typeof window === "undefined") {
    return false;
  }
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
  return Boolean(coarse || (navigator.maxTouchPoints ?? 0) > 0);
}

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function buildFxParticles(clears, cascades, triggered, bloom = false) {
  const particles = [];
  const cells = Array.isArray(clears) ? clears.slice(0, 28) : [];
  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    const cell = cells[cellIndex];
    const burst = clamp(5 + cascades + (bloom ? 2 : 0), 6, 12);
    for (let i = 0; i < burst; i += 1) {
      if (particles.length >= 260) break;
      const seed = cell.row * 53 + cell.col * 97 + i * 29 + cellIndex * 17;
      const angle = ((seed % 360) / 180) * Math.PI;
      const life = 0.46 + (i % 5) * 0.11;
      const speed = 0.9 + (i % 4) * 0.3 + cascades * 0.12 + (bloom ? 0.38 : 0);
      const size = 1.9 + (i % 4) * 0.72 + Math.min(2.8, cascades * 0.3);
      const lift = 0.12 + (i % 3) * 0.09 + (triggered > 0 ? 0.08 : 0);
      const hueBase = bloom ? 42 : cascades >= 3 ? 196 : 150;
      const hue = (hueBase + seed) % 360;
      particles.push({
        row: cell.row,
        col: cell.col,
        angle,
        life,
        speed,
        size,
        lift,
        hue,
        alpha: 0.72 + (i % 3) * 0.14,
      });
    }
  }
  return particles;
}

function makeFxEvent({ now, result, focus, scored, copy, bloom = false }) {
  const combo = Math.max(1, result.cascades || 1);
  const triggered = result.triggered || 0;
  const clears = Array.isArray(result.clears) ? result.clears : [];
  const particles = buildFxParticles(clears, combo, triggered, bloom);

  let bannerText = null;
  if (bloom) bannerText = copy.bloomBanner;
  else if (combo >= 3) bannerText = `${copy.comboBanner}${combo}`;
  else if (result.manual) bannerText = copy.specialBanner;
  else if (combo >= 2) bannerText = `${copy.chainBanner}${combo}`;

  const shake = clamp(1.6 + combo * 0.95 + triggered * 0.45 + (bloom ? 2.3 : 0), 1.4, 9.5);
  const flash = clamp(0.18 + combo * 0.07 + (bloom ? 0.16 : 0), 0.14, 0.8);
  const ring =
    bloom || combo >= 2 || triggered > 0
      ? {
          row: focus.row,
          col: focus.col,
          strength: clamp(0.7 + combo * 0.18 + triggered * 0.1 + (bloom ? 0.32 : 0), 0.6, 2.2),
        }
      : null;

  return {
    startedAt: now,
    clears,
    falls: result.falls,
    particles,
    bannerText,
    bannerColor: bloom ? "#fbbf24" : combo >= 3 ? "#22d3ee" : "#a7f3d0",
    combo,
    bloom,
    shake,
    flash,
    ring,
    gain: scored,
  };
}

function OrchardMatchBlastGame() {
  const locale = useMemo(() => (resolveBrowserLanguage() === "es" ? "es" : "en"), []);
  const copy = COPY[locale] ?? COPY.en;
  const shellRef = useRef(null);
  const canvasRef = useRef(null);
  const rngRef = useRef(createRng(0x7a2e57c9));
  const [highScore, setHighScore] = useState(0);
  const [targetScorePresetId, setTargetScorePresetId] = useState(
    DEFAULT_TARGET_SCORE_OPTION_ID
  );
  const targetScorePreset = useMemo(
    () => getTargetScoreOptionById(targetScorePresetId),
    [targetScorePresetId]
  );
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US"),
    [locale]
  );
  const formatScore = useCallback(
    (value) => numberFormatter.format(Math.max(0, Math.round(Number(value) || 0))),
    [numberFormatter]
  );
  const [size, setSize] = useState({ width: 980, height: 760, dpr: 1 });
  const [isTouchDevice, setIsTouchDevice] = useState(resolveTouchDevice);
  const layout = useMemo(() => layoutFromSize(size.width, size.height), [size.width, size.height]);

  const createInitial = useCallback(() => {
    const board = buildFreshBoard(rngRef.current);
    return {
      variant: "arcade_orchard_match_blast_rebuild_v3",
      coordinates: "origin_top_left_x_right_y_down_board_grid",
      mode: "menu",
      board,
      selected: null,
      cursor: { row: 0, col: 0 },
      hintCells: findPossibleSwap(board),
      hintTimerMs: 0,
      flashCells: null,
      flashTimerMs: 0,
      fx: null,
      score: 0,
      harvest: 0,
      bestCombo: 0,
      comboNow: 0,
      flowChain: 0,
      bestFlow: 0,
      flowTimerMs: 0,
      lastClear: 0,
      lastGain: 0,
      moves: MAX_MOVES,
      timeMs: targetScorePreset.timeMs,
      targetTimeMs: targetScorePreset.timeMs,
      targetScore: targetScorePreset.score,
      targetScorePresetId: targetScorePreset.id,
      targetHarvest: TARGET_HARVEST,
      targetSpecials: TARGET_SPECIALS,
      specialsTriggered: 0,
      specialsCreated: 0,
      bloomCharge: 0,
      bloomBlasts: 0,
      bonusMoves: 0,
      shuffles: 0,
      message: copy.modeMenu,
      fullscreen: false,
    };
  }, [copy.modeMenu, targetScorePreset.id, targetScorePreset.score, targetScorePreset.timeMs]);

  const [game, setGame] = useState(createInitial);

  useEffect(() => {
    try {
      const raw = Number(window.localStorage.getItem(HS_KEY));
      if (Number.isFinite(raw) && raw > 0) setHighScore(Math.floor(raw));
    } catch {
      setHighScore(0);
    }
  }, []);

  useEffect(() => {
    const node = shellRef.current;
    if (!node) return undefined;

    const resize = () => {
      const rect = node.getBoundingClientRect();
      const width = clamp(Math.floor(rect.width || 980), 360, 2400);
      const viewportSpace = Math.max(420, Math.floor(window.innerHeight - rect.top - 14));
      const preferredHeight = Math.floor(width * 0.78);
      const height = clamp(Math.min(Math.max(preferredHeight, 460), viewportSpace), 420, 1080);
      const dpr = clamp(window.devicePixelRatio || 1, 1, 3);
      setSize((prev) =>
        prev.width === width && prev.height === height && prev.dpr === dpr
          ? prev
          : { width, height, dpr }
      );
    };

    resize();
    window.addEventListener("resize", resize);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    observer?.observe(node);
    return () => {
      window.removeEventListener("resize", resize);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia?.("(pointer: coarse)");
    const update = () => setIsTouchDevice(resolveTouchDevice());
    update();
    window.addEventListener("resize", update);
    media?.addEventListener?.("change", update);
    return () => {
      window.removeEventListener("resize", update);
      media?.removeEventListener?.("change", update);
    };
  }, []);

  const saveHighScore = useCallback((value) => {
    setHighScore((prev) => {
      if (value <= prev) return prev;
      try {
        window.localStorage.setItem(HS_KEY, String(value));
      } catch {
        // ignore
      }
      return value;
    });
  }, []);

  const isScoreGoalDone = useCallback(
    (state) => state.score >= state.targetScore,
    []
  );

  const finalizeState = useCallback(
    (state) => {
      if (isScoreGoalDone(state)) return { ...state, mode: "won", message: copy.won };
      if (state.moves <= 0) return { ...state, mode: "lost", message: copy.lost };
      return state;
    },
    [copy.lost, copy.won, isScoreGoalDone]
  );

  const stepMove = useCallback(
    (state, from, to) => {
      if (!inBounds(from.row, from.col) || !inBounds(to.row, to.col)) return state;
      if (!adjacent(from, to)) return { ...state, selected: to, cursor: { ...to } };

      const swapped = swapCells(state.board, from, to);
      const hasMatch = analyzeMatches(swapped).matched.size > 0;
      const hasSpecial =
        swapped[from.row][from.col].special !== SPECIAL_NONE ||
        swapped[to.row][to.col].special !== SPECIAL_NONE;

      if (!hasMatch && !hasSpecial) {
        return {
          ...state,
          selected: to,
          cursor: { ...to },
          flashCells: [from, to],
          flashTimerMs: 260,
          message: copy.invalid,
          comboNow: 0,
          flowChain: 0,
          flowTimerMs: 0,
          lastGain: 0,
          lastClear: 0,
        };
      }

      const result = hasMatch
        ? resolveCascades(swapped, rngRef.current, to)
        : resolveSpecialSwap(swapped, from, to, rngRef.current);

      let board = result.board;
      let hint = findPossibleSwap(board);
      let shuffles = state.shuffles;
      let message = result.manual
        ? copy.specialMsg
        : result.cascades > 1
          ? `${copy.comboMsg}${result.cascades}`
          : copy.good;

      if (!hint) {
        board = buildFreshBoard(rngRef.current);
        hint = findPossibleSwap(board);
        shuffles += 1;
        message = copy.reshuffle;
      }

      const bonus = result.cascades >= BONUS_CHAIN_FOR_MOVE ? 1 : 0;
      if (bonus) message = `${message} +1 ${copy.moveBonus}`;

      const nextFlow = state.flowTimerMs > 0 ? Math.min(FLOW_MAX, state.flowChain + 1) : 1;
      const flowMult = 1 + (nextFlow - 1) * FLOW_STEP;
      const scored = Math.max(0, Math.round(result.score * flowMult));
      const chargeGain =
        result.harvest * BLOOM_GAIN_PER_CLEAR +
        result.triggered * BLOOM_GAIN_PER_SPECIAL +
        (result.cascades > 1 ? result.cascades * 4 : 0);
      const bloomCharge = clamp(state.bloomCharge + chargeGain, 0, BLOOM_CHARGE_MAX);
      const now = performance.now();

      const next = finalizeState({
        ...state,
        board,
        selected: null,
        cursor: { ...to },
        hintCells: hint,
        hintTimerMs: 0,
        flashCells: null,
        flashTimerMs: 0,
        fx: makeFxEvent({ now, result, focus: to, scored, copy }),
        moves: Math.max(0, state.moves - 1 + bonus),
        score: state.score + scored,
        harvest: state.harvest + result.harvest,
        comboNow: result.cascades,
        bestCombo: Math.max(state.bestCombo, result.cascades),
        flowChain: nextFlow,
        bestFlow: Math.max(state.bestFlow, nextFlow),
        flowTimerMs: FLOW_WINDOW_MS,
        lastGain: scored,
        lastClear: result.lastClear,
        specialsTriggered: state.specialsTriggered + result.triggered,
        specialsCreated: state.specialsCreated + result.created,
        bloomCharge,
        bonusMoves: state.bonusMoves + bonus,
        shuffles,
        message,
      });
      saveHighScore(next.score);
      return next;
    },
    [
      copy,
      copy.comboMsg,
      copy.good,
      copy.invalid,
      copy.moveBonus,
      copy.reshuffle,
      copy.specialMsg,
      finalizeState,
      saveHighScore,
    ]
  );

  const startRun = useCallback(() => {
    setGame(() => ({ ...createInitial(), mode: "playing", message: copy.modePlay }));
  }, [copy.modePlay, createInitial]);

  const selectTargetScorePreset = useCallback(
    (nextPresetId) => {
      const resolved = getTargetScoreOptionById(nextPresetId);
      setTargetScorePresetId(resolved.id);
      setGame((prev) => {
        if (prev.mode === "playing") return prev;
        const message =
          prev.mode === "won" ? copy.modeWon : prev.mode === "lost" ? copy.modeLost : copy.modeMenu;
        return {
          ...prev,
          timeMs: resolved.timeMs,
          targetTimeMs: resolved.timeMs,
          targetScore: resolved.score,
          targetScorePresetId: resolved.id,
          message,
        };
      });
    },
    [copy.modeLost, copy.modeMenu, copy.modeWon]
  );

  const showHint = useCallback(() => {
    setGame((prev) => {
      if (prev.mode !== "playing") return prev;
      const hint = prev.hintCells ?? findPossibleSwap(prev.board);
      if (!hint) return { ...prev, message: copy.noHint };
      return { ...prev, hintCells: hint, hintTimerMs: 1800 };
    });
  }, [copy.noHint]);

  const shuffle = useCallback(() => {
    setGame((prev) => {
      if (prev.mode !== "playing") return prev;
      const board = buildFreshBoard(rngRef.current);
      return finalizeState({
        ...prev,
        board,
        selected: null,
        hintCells: findPossibleSwap(board),
        hintTimerMs: 0,
        flashCells: null,
        flashTimerMs: 0,
        fx: null,
        message: copy.reshuffle,
        moves: Math.max(0, prev.moves - 1),
        comboNow: 0,
        flowChain: 0,
        flowTimerMs: 0,
        shuffles: prev.shuffles + 1,
      });
    });
  }, [copy.reshuffle, finalizeState]);

  const triggerBloom = useCallback(() => {
    setGame((prev) => {
      if (prev.mode !== "playing") return prev;
      if (prev.bloomCharge < BLOOM_CHARGE_COST) return { ...prev, message: copy.bloomNeed };
      const target = prev.selected ?? prev.cursor;
      if (!target || !inBounds(target.row, target.col)) return prev;

      const result = resolveBloomBlast(prev.board, target, rngRef.current);
      let board = result.board;
      let hint = findPossibleSwap(board);
      let shuffles = prev.shuffles;
      let message = copy.bloomMsg;

      if (!hint) {
        board = buildFreshBoard(rngRef.current);
        hint = findPossibleSwap(board);
        shuffles += 1;
        message = copy.reshuffle;
      }

      const nextFlow = prev.flowTimerMs > 0 ? Math.min(FLOW_MAX, prev.flowChain + 1) : 1;
      const flowMult = 1 + (nextFlow - 1) * FLOW_STEP;
      const scored = Math.max(0, Math.round(result.score * flowMult));
      const chargeGain =
        result.harvest * BLOOM_GAIN_PER_CLEAR +
        result.triggered * BLOOM_GAIN_PER_SPECIAL +
        (result.cascades > 1 ? result.cascades * 4 : 0);
      const bloomCharge = clamp(
        prev.bloomCharge - BLOOM_CHARGE_COST + chargeGain,
        0,
        BLOOM_CHARGE_MAX
      );
      const now = performance.now();

      const next = finalizeState({
        ...prev,
        board,
        selected: null,
        hintCells: hint,
        hintTimerMs: 0,
        flashCells: null,
        flashTimerMs: 0,
        fx: makeFxEvent({ now, result, focus: target, scored, copy, bloom: true }),
        score: prev.score + scored,
        harvest: prev.harvest + result.harvest,
        comboNow: result.cascades,
        bestCombo: Math.max(prev.bestCombo, result.cascades),
        flowChain: nextFlow,
        bestFlow: Math.max(prev.bestFlow, nextFlow),
        flowTimerMs: FLOW_WINDOW_MS,
        lastGain: scored,
        lastClear: result.lastClear,
        specialsTriggered: prev.specialsTriggered + result.triggered,
        specialsCreated: prev.specialsCreated + result.created,
        bloomCharge,
        bloomBlasts: prev.bloomBlasts + 1,
        shuffles,
        message,
      });
      saveHighScore(next.score);
      return next;
    });
  }, [copy, copy.bloomMsg, copy.bloomNeed, copy.reshuffle, finalizeState, saveHighScore]);

  const fullscreen = useCallback(async () => {
    const node = shellRef.current;
    if (!node) return;
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } else if (node.requestFullscreen) await node.requestFullscreen();
      else if (node.webkitRequestFullscreen) node.webkitRequestFullscreen();
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      const active = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      setGame((prev) => (prev.fullscreen === active ? prev : { ...prev, fullscreen: active }));
    };
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
    };
  }, []);

  const onPointer = useCallback(
    (event) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (event.clientX - rect.left) * (layout.w / rect.width);
      const y = (event.clientY - rect.top) * (layout.h / rect.height);
      const col = Math.floor((x - layout.left) / layout.tile);
      const row = Math.floor((y - layout.top) / layout.tile);
      if (!inBounds(row, col)) return;
      const cell = { row, col };
      setGame((prev) => {
        if (prev.mode !== "playing") return prev;
        if (!prev.selected) return { ...prev, selected: cell, cursor: cell };
        if (prev.selected.row === row && prev.selected.col === col) {
          return { ...prev, selected: null, cursor: cell };
        }
        return stepMove(prev, prev.selected, cell);
      });
    },
    [layout.left, layout.tile, layout.top, stepMove]
  );

  useEffect(() => {
    const onKey = (event) => {
      const target = event.target;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const keyName = event.key.toLowerCase();
      if (keyName === "f") {
        event.preventDefault();
        fullscreen();
        return;
      }
      if (keyName === "r") {
        event.preventDefault();
        startRun();
        return;
      }
      if (keyName === "h") {
        event.preventDefault();
        showHint();
        return;
      }
      if (keyName === "s") {
        event.preventDefault();
        shuffle();
        return;
      }
      if (keyName === "b") {
        event.preventDefault();
        triggerBloom();
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setGame((prev) => {
          if (prev.mode === "menu" || prev.mode === "won" || prev.mode === "lost") {
            return { ...createInitial(), mode: "playing", message: copy.modePlay };
          }
          if (prev.mode !== "playing") return prev;
          if (!prev.selected) return { ...prev, selected: { ...prev.cursor } };
          return stepMove(prev, prev.selected, prev.cursor);
        });
        return;
      }

      if (!["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(keyName)) return;
      event.preventDefault();
      setGame((prev) => {
        if (prev.mode !== "playing") return prev;
        const cursor = { ...prev.cursor };
        if (keyName === "arrowup") cursor.row = Math.max(0, cursor.row - 1);
        if (keyName === "arrowdown") cursor.row = Math.min(ROWS - 1, cursor.row + 1);
        if (keyName === "arrowleft") cursor.col = Math.max(0, cursor.col - 1);
        if (keyName === "arrowright") cursor.col = Math.min(COLS - 1, cursor.col + 1);
        return { ...prev, cursor };
      });
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [copy.modePlay, createInitial, fullscreen, layout.h, layout.left, layout.tile, layout.top, layout.w, showHint, shuffle, startRun, stepMove, triggerBloom]);

  const advanceState = useCallback(
    (prev, deltaMs, nowMs) => {
      const hintTimerMs = Math.max(0, prev.hintTimerMs - deltaMs);
      const flashTimerMs = Math.max(0, prev.flashTimerMs - deltaMs);
      const flowTimerMs = Math.max(0, prev.flowTimerMs - deltaMs);
      const flowChain = flowTimerMs > 0 ? prev.flowChain : 0;
      const fx = prev.fx && nowMs - prev.fx.startedAt > FX_TOTAL_MS ? null : prev.fx;

      if (prev.mode !== "playing") {
        if (
          hintTimerMs === prev.hintTimerMs &&
          flashTimerMs === prev.flashTimerMs &&
          flowTimerMs === prev.flowTimerMs &&
          flowChain === prev.flowChain &&
          fx === prev.fx
        ) {
          return prev;
        }
        return { ...prev, hintTimerMs, flashTimerMs, flowTimerMs, flowChain, fx };
      }

      const timeMs = Math.max(0, prev.timeMs - deltaMs);
      if (timeMs > 0) {
        return { ...prev, timeMs, hintTimerMs, flashTimerMs, flowTimerMs, flowChain, fx };
      }

      if (isScoreGoalDone(prev)) {
        return {
          ...prev,
          mode: "won",
          timeMs: 0,
          hintTimerMs,
          flashTimerMs,
          flowTimerMs,
          flowChain,
          fx,
          message: copy.won,
        };
      }
      return {
        ...prev,
        mode: "lost",
        timeMs: 0,
        hintTimerMs,
        flashTimerMs,
        flowTimerMs,
        flowChain,
        fx,
        message: copy.lost,
      };
    },
    [copy.lost, copy.won, isScoreGoalDone]
  );

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now) => {
      const delta = Math.min(64, now - last);
      last = now;
      setGame((prev) => advanceState(prev, delta, now));
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [advanceState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);

    const now = performance.now();
    const pulse = 0.55 + 0.45 * Math.sin(now / 180);
    const rhythmPulse = 0.56 + 0.44 * Math.sin(now / 132);
    const fxAge = game.fx ? now - game.fx.startedAt : Number.POSITIVE_INFINITY;
    const shakeDecay = game.fx ? 1 - clamp(fxAge / FX_SHAKE_MS, 0, 1) : 0;
    const shakePower = (game.fx?.shake ?? 0) * shakeDecay;
    const shakeX = shakePower > 0 ? Math.sin(now * 0.17) * shakePower : 0;
    const shakeY = shakePower > 0 ? Math.cos(now * 0.21 + 1.4) * shakePower * 0.75 : 0;

    const boardX = layout.left + shakeX;
    const boardY = layout.top + shakeY;
    const boardW = layout.boardW;
    const boardH = layout.boardH;
    const hudX = layout.pad + shakeX * 0.45;
    const hudY = layout.hudTop + shakeY * 0.45;
    const hudW = layout.w - layout.pad * 2;
    const hudH = layout.hudHeight;
    const footerX = layout.pad + shakeX * 0.35;
    const footerY = layout.footerY + shakeY * 0.35;
    const footerW = layout.w - layout.pad * 2;
    const footerH = Math.max(30, layout.h - layout.footerY - 8);
    const clearAlpha = game.fx ? 1 - clamp(fxAge / FX_CLEAR_MS, 0, 1) : 0;
    const fallProgress = game.fx ? clamp(fxAge / FX_FALL_MS, 0, 1) : 1;
    const particleProgress = game.fx ? clamp(fxAge / FX_PARTICLE_MS, 0, 1) : 1;
    const clearSet = new Set((game.fx?.clears ?? []).map((cell) => key(cell.row, cell.col)));
    const fallMap = new Map();
    if (game.fx && fxAge < FX_FALL_MS) {
      for (const move of game.fx.falls) fallMap.set(key(move.row, move.col), move);
    }

    ctx.clearRect(0, 0, layout.w, layout.h);
    const sky = ctx.createLinearGradient(0, 0, layout.w, layout.h);
    sky.addColorStop(0, "#0b1225");
    sky.addColorStop(0.42, "#103a53");
    sky.addColorStop(1, "#1b4d34");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, layout.w, layout.h);

    ctx.globalAlpha = 0.28;
    const orbA = ctx.createRadialGradient(
      layout.w * 0.22,
      layout.h * 0.15,
      10,
      layout.w * 0.22,
      layout.h * 0.15,
      layout.w * 0.38
    );
    orbA.addColorStop(0, "#67e8f9");
    orbA.addColorStop(1, "rgba(103,232,249,0)");
    ctx.fillStyle = orbA;
    ctx.fillRect(0, 0, layout.w, layout.h);
    const orbB = ctx.createRadialGradient(
      layout.w * 0.8,
      layout.h * 0.2,
      10,
      layout.w * 0.8,
      layout.h * 0.2,
      layout.w * 0.34
    );
    orbB.addColorStop(0, "#86efac");
    orbB.addColorStop(1, "rgba(134,239,172,0)");
    ctx.fillStyle = orbB;
    ctx.fillRect(0, 0, layout.w, layout.h);
    ctx.globalAlpha = 1;

    roundRectPath(ctx, hudX, hudY, hudW, hudH, 18);
    const hudGrad = ctx.createLinearGradient(hudX, hudY, hudX, hudY + hudH);
    hudGrad.addColorStop(0, "rgba(2,6,23,0.9)");
    hudGrad.addColorStop(1, "rgba(15,23,42,0.68)");
    ctx.fillStyle = hudGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(125,211,252,0.26)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const pillPad = 10;
    const pillGapX = 8;
    const pillGapY = 6;
    const pillCols = hudW >= 920 ? 4 : 2;
    const pillRows = Math.ceil(4 / pillCols);
    const pillW = (hudW - pillPad * 2 - pillGapX * (pillCols - 1)) / pillCols;
    const pillH = (hudH - 14 - pillGapY * (pillRows - 1)) / pillRows;
    const hudPills = [
      {
        label: `${copy.score} / ${copy.targetScoreShort}`,
        value: `${formatScore(game.score)} / ${formatScore(game.targetScore)}`,
        accent: "rgba(96,165,250,0.48)",
      },
      {
        label: `${copy.moves} / ${copy.time}`,
        value: `${game.moves} / ${fmtTime(game.timeMs)}`,
        accent: "rgba(52,211,153,0.42)",
      },
      {
        label: `${copy.combo} / ${copy.flow}`,
        value: `x${Math.max(1, game.comboNow)} / x${Math.max(1, game.flowChain)}`,
        accent: "rgba(251,191,36,0.46)",
      },
      {
        label: `${copy.harvest} / ${copy.specials}`,
        value: `${game.harvest}/${game.targetHarvest} / ${game.specialsTriggered}/${game.targetSpecials}`,
        accent: "rgba(244,114,182,0.44)",
      },
    ];

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    hudPills.forEach((pill, index) => {
      const col = index % pillCols;
      const row = Math.floor(index / pillCols);
      const x = hudX + pillPad + col * (pillW + pillGapX);
      const y = hudY + 7 + row * (pillH + pillGapY);
      roundRectPath(ctx, x, y, pillW, pillH, 10);
      const cardGrad = ctx.createLinearGradient(x, y, x, y + pillH);
      cardGrad.addColorStop(0, "rgba(15,23,42,0.84)");
      cardGrad.addColorStop(1, "rgba(30,41,59,0.54)");
      ctx.fillStyle = cardGrad;
      ctx.fill();
      ctx.strokeStyle = pill.accent;
      ctx.lineWidth = 1;
      ctx.stroke();

      const labelFont = clamp(Math.round(pillH * 0.2), 9, 13);
      const valueFont = clamp(Math.round(pillH * 0.28), 12, 18);
      ctx.font = `700 ${labelFont}px system-ui, -apple-system, Segoe UI, sans-serif`;
      ctx.fillStyle = "rgba(191,219,254,0.92)";
      ctx.fillText(pill.label, x + 8, y + 6);

      ctx.font = `800 ${valueFont}px system-ui, -apple-system, Segoe UI, sans-serif`;
      ctx.fillStyle = "#f8fafc";
      ctx.fillText(pill.value, x + 8, y + 20);
    });
    ctx.textAlign = "left";

    roundRectPath(
      ctx,
      boardX - 4,
      boardY - 4,
      boardW + 8,
      boardH + 8,
      Math.max(12, layout.tile * 0.24)
    );
    const boardGrad = ctx.createLinearGradient(boardX, boardY, boardX, boardY + boardH);
    boardGrad.addColorStop(0, "rgba(3,7,19,0.78)");
    boardGrad.addColorStop(1, "rgba(15,23,42,0.93)");
    ctx.fillStyle = boardGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(148,163,184,0.28)";
    ctx.lineWidth = 1;
    ctx.stroke();

    if (game.fx?.ring && fxAge < FX_RING_MS) {
      const ringProgress = clamp(fxAge / FX_RING_MS, 0, 1);
      const ringFade = 1 - ringProgress;
      const ringRadius =
        layout.tile * (0.34 + ringProgress * (2.6 + (game.fx.ring.strength ?? 1) * 0.42));
      const cx = boardX + (game.fx.ring.col + 0.5) * layout.tile;
      const cy = boardY + (game.fx.ring.row + 0.5) * layout.tile;
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(125,211,252,${0.62 * ringFade})`;
      ctx.lineWidth = Math.max(1.4, layout.tile * (0.08 * ringFade + 0.02));
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius * 0.7, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(251,191,36,${0.48 * ringFade})`;
      ctx.lineWidth = Math.max(1.1, layout.tile * (0.05 * ringFade + 0.015));
      ctx.stroke();
    }

    const hintSet = new Set(
      game.hintTimerMs > 0 && Array.isArray(game.hintCells)
        ? game.hintCells.map((cell) => key(cell.row, cell.col))
        : []
    );
    const flashSet = new Set(
      game.flashTimerMs > 0 && Array.isArray(game.flashCells)
        ? game.flashCells.map((cell) => key(cell.row, cell.col))
        : []
    );
    const selectedKey = game.selected ? key(game.selected.row, game.selected.col) : "";
    const cursorKey = key(game.cursor.row, game.cursor.col);

    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const boardCell = game.board[row][col];
        if (!boardCell) continue;
        const tileX = boardX + col * layout.tile;
        const tileY = boardY + row * layout.tile;
        const id = key(row, col);
        const fall = fallMap.get(id);
        const bob = Math.sin(now / 340 + row * 0.72 + col * 0.44) * 0.7;
        let drawY = tileY + bob;
        if (fall && fxAge < FX_FALL_MS) {
          const p = easeOutCubic(fallProgress);
          const startY = boardY + fall.fromRow * layout.tile;
          drawY = startY + (tileY - startY) * p;
        }

        const blockType = BLOCK_TYPES[boardCell.type];
        const pad = Math.max(2, layout.tile * 0.08);

        roundRectPath(
          ctx,
          tileX + 1,
          drawY + 1,
          layout.tile - 2,
          layout.tile - 2,
          Math.max(7, layout.tile * 0.18)
        );
        ctx.fillStyle = "rgba(15,23,42,0.44)";
        ctx.fill();

        const tileGrad = ctx.createLinearGradient(
          tileX,
          drawY,
          tileX + layout.tile,
          drawY + layout.tile
        );
        tileGrad.addColorStop(0, `${blockType.glow}eb`);
        tileGrad.addColorStop(0.6, blockType.main);
        tileGrad.addColorStop(1, blockType.shade);
        roundRectPath(
          ctx,
          tileX + pad,
          drawY + pad,
          layout.tile - pad * 2,
          layout.tile - pad * 2,
          Math.max(6, layout.tile * 0.22)
        );
        ctx.fillStyle = tileGrad;
        ctx.fill();

        const cx = tileX + layout.tile * 0.5;
        const cy = drawY + layout.tile * 0.52;
        const radius = layout.tile * 0.2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx - radius * 0.3, cy - radius * 0.34, radius * 0.34, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.fill();

        if (boardCell.special !== SPECIAL_NONE) {
          ctx.strokeStyle = "rgba(255,255,255,0.92)";
          ctx.lineWidth = Math.max(2, layout.tile * 0.075);
          if (boardCell.special === SPECIAL_LINE_H || boardCell.special === SPECIAL_BOMB) {
            ctx.beginPath();
            ctx.moveTo(tileX + layout.tile * 0.2, drawY + layout.tile * 0.5);
            ctx.lineTo(tileX + layout.tile * 0.8, drawY + layout.tile * 0.5);
            ctx.stroke();
          }
          if (boardCell.special === SPECIAL_LINE_V || boardCell.special === SPECIAL_BOMB) {
            ctx.beginPath();
            ctx.moveTo(tileX + layout.tile * 0.5, drawY + layout.tile * 0.2);
            ctx.lineTo(tileX + layout.tile * 0.5, drawY + layout.tile * 0.8);
            ctx.stroke();
          }
          if (boardCell.special === SPECIAL_BOMB) {
            ctx.beginPath();
            ctx.arc(
              tileX + layout.tile * 0.5,
              drawY + layout.tile * 0.5,
              layout.tile * 0.12,
              0,
              Math.PI * 2
            );
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.fill();
          }
        }

        if (clearSet.has(id) && clearAlpha > 0) {
          const flare = ctx.createRadialGradient(cx, cy, 2, cx, cy, layout.tile * 0.6);
          flare.addColorStop(0, `rgba(255,255,255,${0.78 * clearAlpha})`);
          flare.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = flare;
          ctx.fillRect(tileX - 2, drawY - 2, layout.tile + 4, layout.tile + 4);
        }

        if (id === selectedKey) {
          ctx.strokeStyle = "rgba(253,224,71,0.96)";
          ctx.lineWidth = Math.max(2, layout.tile * 0.068);
          roundRectPath(
            ctx,
            tileX + 2,
            drawY + 2,
            layout.tile - 4,
            layout.tile - 4,
            Math.max(6, layout.tile * 0.2)
          );
          ctx.stroke();
        } else if (flashSet.has(id)) {
          ctx.strokeStyle = `rgba(248,113,113,${0.64 + 0.3 * pulse})`;
          ctx.lineWidth = Math.max(2, layout.tile * 0.068);
          roundRectPath(
            ctx,
            tileX + 2,
            drawY + 2,
            layout.tile - 4,
            layout.tile - 4,
            Math.max(6, layout.tile * 0.2)
          );
          ctx.stroke();
        } else if (hintSet.has(id)) {
          ctx.strokeStyle = `rgba(74,222,128,${0.58 + 0.3 * pulse})`;
          ctx.lineWidth = Math.max(2, layout.tile * 0.06);
          roundRectPath(
            ctx,
            tileX + 3,
            drawY + 3,
            layout.tile - 6,
            layout.tile - 6,
            Math.max(6, layout.tile * 0.2)
          );
          ctx.stroke();
        } else if (id === cursorKey && !game.selected) {
          ctx.strokeStyle = "rgba(125,211,252,0.72)";
          ctx.lineWidth = Math.max(1, layout.tile * 0.035);
          roundRectPath(
            ctx,
            tileX + 3,
            drawY + 3,
            layout.tile - 6,
            layout.tile - 6,
            Math.max(6, layout.tile * 0.2)
          );
          ctx.stroke();
        }
      }
    }

    if (Array.isArray(game.fx?.particles) && game.fx.particles.length > 0 && particleProgress < 1) {
      const previousComposite = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      for (const particle of game.fx.particles) {
        const localT = clamp(particleProgress / particle.life, 0, 1);
        if (localT >= 1) continue;
        const eased = easeOutCubic(localT);
        const prevT = Math.max(0, localT - 0.08);
        const easedPrev = easeOutCubic(prevT);
        const dist = layout.tile * particle.speed * eased;
        const prevDist = layout.tile * particle.speed * easedPrev;
        const lift = layout.tile * particle.lift * eased;
        const prevLift = layout.tile * particle.lift * easedPrev;
        const cx = boardX + (particle.col + 0.5) * layout.tile;
        const cy = boardY + (particle.row + 0.5) * layout.tile;
        const px = cx + Math.cos(particle.angle) * dist;
        const py = cy + Math.sin(particle.angle) * dist - lift;
        const tx = cx + Math.cos(particle.angle) * prevDist;
        const ty = cy + Math.sin(particle.angle) * prevDist - prevLift;
        const alpha = (1 - localT) * particle.alpha;

        ctx.strokeStyle = `hsla(${particle.hue}, 96%, 72%, ${alpha * 0.9})`;
        ctx.lineWidth = Math.max(1.2, particle.size * 0.74);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(px, py);
        ctx.stroke();

        const glow = ctx.createRadialGradient(px, py, 0, px, py, particle.size * 1.9);
        glow.addColorStop(0, `hsla(${particle.hue}, 99%, 78%, ${alpha})`);
        glow.addColorStop(1, `hsla(${particle.hue}, 99%, 74%, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, particle.size * 1.9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `hsla(${particle.hue}, 99%, 78%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, particle.size * (0.56 + (1 - localT) * 0.68), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = previousComposite;
    }

    roundRectPath(ctx, footerX, footerY, footerW, footerH, 12);
    ctx.fillStyle = "rgba(15,23,42,0.58)";
    ctx.fill();
    ctx.strokeStyle = "rgba(148,163,184,0.26)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "700 13px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText(game.message, footerX + 10, footerY + 15);
    ctx.font = "700 11px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillStyle = `rgba(251,191,36,${0.66 + 0.28 * rhythmPulse})`;
    ctx.fillText(`${copy.bloomCharge}: ${Math.round(game.bloomCharge)}%`, footerX + 10, footerY + 31);
    ctx.fillStyle = `rgba(125,211,252,${0.64 + 0.24 * rhythmPulse})`;
    ctx.fillText(`${copy.flow}: x${Math.max(1, game.flowChain)}`, footerX + 144, footerY + 31);
    ctx.fillStyle = "rgba(244,114,182,0.85)";
    ctx.fillText(`${copy.specials}: ${game.specialsTriggered}/${game.targetSpecials}`, footerX + 240, footerY + 31);

    if (game.mode !== "playing") {
      roundRectPath(
        ctx,
        boardX + boardW * 0.14,
        boardY + boardH * 0.32,
        boardW * 0.72,
        boardH * 0.32,
        16
      );
      ctx.fillStyle = "rgba(2,6,23,0.82)";
      ctx.fill();
      ctx.strokeStyle = "rgba(148,163,184,0.42)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = "#f8fafc";
      ctx.font = `700 ${Math.max(17, layout.tile * 0.34)}px system-ui, -apple-system, Segoe UI, sans-serif`;
      const banner =
        game.mode === "menu" ? copy.start : game.mode === "won" ? copy.modeWon : copy.modeLost;
      ctx.fillText(banner, boardX + boardW / 2, boardY + boardH * 0.45);
      ctx.font = "600 12px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.fillStyle = "#bfdbfe";
      ctx.fillText(copy.modePlay, boardX + boardW / 2, boardY + boardH * 0.535);
      ctx.textAlign = "left";
    }

    if (game.fx?.bannerText && fxAge < FX_BANNER_MS) {
      const t = clamp(fxAge / FX_BANNER_MS, 0, 1);
      const rise = (1 - easeOutCubic(t)) * Math.max(20, layout.tile * 0.95);
      const pop = Math.sin(Math.min(1, t) * Math.PI) * 0.35;
      const fadeIn = clamp(t / 0.14, 0, 1);
      const fadeOut = 1 - clamp((t - 0.68) / 0.32, 0, 1);
      const alpha = fadeIn * fadeOut;
      const scale = 0.98 + pop;
      const label = game.fx.bannerText;

      ctx.save();
      ctx.translate(
        layout.w / 2 + shakeX * 0.3,
        boardY + Math.max(layout.tile * 1.35, 64) - rise
      );
      ctx.scale(scale, scale);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `900 ${Math.max(18, layout.tile * 0.42)}px system-ui, -apple-system, Segoe UI, sans-serif`;
      const textWidth = ctx.measureText(label).width;
      const badgeW = textWidth + Math.max(48, layout.tile * 1.2);
      const badgeH = Math.max(36, layout.tile * 0.84);

      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, badgeW * 0.58);
      glow.addColorStop(0, `rgba(34,211,238,${0.3 * alpha})`);
      glow.addColorStop(1, "rgba(34,211,238,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(-badgeW * 0.62, -badgeH * 1.1, badgeW * 1.24, badgeH * 2.2);

      roundRectPath(ctx, -badgeW / 2, -badgeH / 2, badgeW, badgeH, badgeH * 0.42);
      const badgeGrad = ctx.createLinearGradient(0, -badgeH / 2, 0, badgeH / 2);
      badgeGrad.addColorStop(0, `rgba(2, 6, 23, ${0.86 * alpha})`);
      badgeGrad.addColorStop(1, `rgba(15, 23, 42, ${0.72 * alpha})`);
      ctx.fillStyle = badgeGrad;
      ctx.fill();
      ctx.strokeStyle = `rgba(148, 163, 184, ${0.7 * alpha})`;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = game.fx.bannerColor
        ? `${game.fx.bannerColor}${Math.round(255 * alpha).toString(16).padStart(2, "0")}`
        : `rgba(248, 250, 252, ${0.96 * alpha})`;
      ctx.fillText(label, 0, 0);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.62 * alpha})`;
      ctx.fillRect(-badgeW * 0.36, -badgeH * 0.18, badgeW * 0.72, 1.4);
      ctx.restore();
    }

    if (game.fx && fxAge < FX_FLASH_MS) {
      const flashAlpha = (game.fx.flash ?? 0.2) * (1 - fxAge / FX_FLASH_MS);
      if (flashAlpha > 0.005) {
        ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
        ctx.fillRect(0, 0, layout.w, layout.h);
      }
    }
  }, [copy, formatScore, game, highScore, layout, size.dpr]);

  const payloadBuilder = useCallback(
    (state) => ({
      mode: "arcade_match3",
      variant: state.variant,
      coordinates: state.coordinates,
      status: state.mode,
      score: state.score,
      highScore,
      targetScore: state.targetScore,
      targetScorePresetId: state.targetScorePresetId,
      targetScoreOptions: TARGET_SCORE_OPTIONS.map((option) => ({
        id: option.id,
        score: option.score,
        timeMs: option.timeMs,
      })),
      harvest: state.harvest,
      targetHarvest: state.targetHarvest,
      targetSpecials: state.targetSpecials,
      specialsTriggered: state.specialsTriggered,
      specialsCreated: state.specialsCreated,
      bloomCharge: state.bloomCharge,
      bloomBlasts: state.bloomBlasts,
      movesLeft: state.moves,
      timeRemainingMs: state.timeMs,
      targetTimeMs: state.targetTimeMs,
      timeLabel: fmtTime(state.timeMs),
      bestCombo: state.bestCombo,
      comboNow: state.comboNow,
      flowChain: state.flowChain,
      bestFlow: state.bestFlow,
      flowTimerMs: state.flowTimerMs,
      lastGain: state.lastGain,
      lastClearCount: state.lastClear,
      bonusMovesAwarded: state.bonusMoves,
      selected: state.selected,
      cursor: state.cursor,
      hintCells: state.hintCells,
      board: state.board.map((row) =>
        row.map((cell) =>
          cell.special !== SPECIAL_NONE
            ? `${BLOCK_TYPES[cell.type].key}:${cell.special}`
            : BLOCK_TYPES[cell.type].key
        )
      ),
      message: state.message,
      objectives: {
        scoreProgress: clamp(state.score / state.targetScore, 0, 1),
        harvestProgress: clamp(state.harvest / state.targetHarvest, 0, 1),
        specialProgress: clamp(state.specialsTriggered / state.targetSpecials, 0, 1),
        bloomProgress: clamp(state.bloomCharge / BLOOM_CHARGE_MAX, 0, 1),
      },
      controls: {
        keyboard:
          "Arrows move, Enter/Space select, H hint, S shuffle, B bloom, R restart, F fullscreen",
        pointer: "Select two adjacent color blocks to swap",
      },
    }),
    [highScore]
  );

  const advanceTime = useCallback(
    (ms) => {
      const safe = Math.max(0, Number(ms) || 0);
      const steps = Math.max(1, Math.round(safe / (1000 / 60)));
      const dt = safe / steps;
      setGame((prev) => {
        let next = prev;
        let now = performance.now();
        for (let i = 0; i < steps; i += 1) {
          now += dt;
          next = advanceState(next, dt, now);
        }
        return next;
      });
    },
    [advanceState]
  );

  useGameRuntimeBridge(game, payloadBuilder, advanceTime);
  const showTouchStartOverlay =
    isTouchDevice && (game.mode === "menu" || game.mode === "won" || game.mode === "lost");

  return (
    <div className="mini-game orchard-match-game">
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="orchard-target-controls">
          <span>{copy.targetScoreLabel}</span>
          <div className="orchard-target-options" role="group" aria-label={copy.targetScoreLabel}>
            {TARGET_SCORE_OPTIONS.map((option) => {
              const active = option.id === targetScorePreset.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={active ? "is-active" : ""}
                  onClick={() => selectTargetScorePreset(option.id)}
                  disabled={game.mode === "playing"}
                  aria-pressed={active}
                  style={{ "--orchard-target-accent": option.accent }}
                >
                  <strong>{option.label[locale]}</strong>
                  <span>{`${formatScore(option.score)} / ${fmtTime(option.timeMs)}`}</span>
                </button>
              );
            })}
          </div>
          <p>{copy.targetPresetHint}</p>
        </div>
        <div className="orchard-actions">
          <button type="button" onClick={startRun}>
            {game.mode === "menu" ? copy.start : copy.restart}
          </button>
          <button type="button" onClick={showHint}>
            {copy.hint}
          </button>
          <button type="button" onClick={shuffle}>
            {copy.shuffle}
          </button>
          <button
            type="button"
            onClick={triggerBloom}
            disabled={game.mode !== "playing" || game.bloomCharge < BLOOM_CHARGE_COST}
          >
            {copy.bloom}
          </button>
          <button type="button" onClick={fullscreen}>
            {copy.fullscreen}
          </button>
        </div>
      </div>

      <div className="orchard-shell phaser-canvas-shell" ref={shellRef}>
        <canvas
          ref={canvasRef}
          className="orchard-canvas"
          width={Math.round(layout.w * size.dpr)}
          height={Math.round(layout.h * size.dpr)}
          style={{ width: `${layout.w}px`, height: `${layout.h}px` }}
          onPointerDown={onPointer}
          aria-label={copy.title}
        />
        {showTouchStartOverlay ? (
          <div className="orchard-mobile-start-overlay">
            <div className="orchard-mobile-start-card">
              <strong>{game.mode === "menu" ? copy.targetScoreLabel : copy.title}</strong>
              <p>
                {game.mode === "menu"
                  ? `${targetScorePreset.label[locale]} · ${formatScore(targetScorePreset.score)} · ${fmtTime(targetScorePreset.timeMs)}`
                  : game.message}
              </p>
              <button type="button" onClick={startRun}>
                {game.mode === "menu" ? copy.start : copy.restart}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="orchard-info-strip">
        <span>
          {copy.score}: <strong>{formatScore(game.score)}</strong>
        </span>
        <span>
          {copy.targetScoreShort}: <strong>{formatScore(game.targetScore)}</strong>
        </span>
        <span>
          {copy.harvest}: <strong>{game.harvest}/{game.targetHarvest}</strong>
        </span>
        <span>
          {copy.specials}: <strong>{game.specialsTriggered}/{game.targetSpecials}</strong>
        </span>
        <span>
          {copy.best}: <strong>{formatScore(highScore)}</strong>
        </span>
        <span>
          {copy.moves}: <strong>{game.moves}</strong>
        </span>
        <span>
          {copy.time}: <strong>{fmtTime(game.timeMs)}</strong>
        </span>
        <span>
          {copy.combo}: <strong>x{Math.max(1, game.comboNow)}</strong>
        </span>
        <span>
          {copy.flow}: <strong>x{Math.max(1, game.flowChain)}</strong>
        </span>
        <span>
          {copy.bloomCharge}: <strong>{Math.round(game.bloomCharge)}%</strong>
        </span>
      </div>

      <p className="orchard-controls">{copy.controls}</p>
    </div>
  );
}

export default OrchardMatchBlastGame;
