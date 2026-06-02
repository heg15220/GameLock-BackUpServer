import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";

const WIDTH = 960;
const HEIGHT = 540;
const DT = 1 / 60;
const DT_MS = 1000 / 60;
const BODY_TOP = 68;
const BODY_BOTTOM = HEIGHT - 56;
const LANDER_FOOT_LOCAL_Y = 15;
const LANDER_LEG_SPAN = 11;

const UI = {
  es: {
    start: "Iniciar",
    restart: "Reiniciar",
    pause: "Pausa",
    resume: "Continuar",
    fullscreen: "Pantalla completa",
    changePiece: "Cambiar pieza",
    score: "Puntuacion",
    best: "Record",
    level: "Nivel",
    lives: "Vidas",
    hint: "Enter/Espacio inicia · P pausa · R reinicia · F fullscreen",
    objective: "Objetivo",
    controls: "Controles",
    phaseMenu: "menu",
    phasePlaying: "activa",
    phasePaused: "pausa",
    phaseGameOver: "terminada",
  },
  en: {
    start: "Start",
    restart: "Restart",
    pause: "Pause",
    resume: "Resume",
    fullscreen: "Fullscreen",
    changePiece: "Change piece",
    score: "Score",
    best: "Best",
    level: "Level",
    lives: "Lives",
    hint: "Enter/Space starts · P pauses · R restarts · F fullscreen",
    objective: "Objective",
    controls: "Controls",
    phaseMenu: "menu",
    phasePlaying: "playing",
    phasePaused: "paused",
    phaseGameOver: "game_over",
  },
};

const DEFINITIONS = {
  "snake-classic": {
    title: { es: "Snake Classico 1977", en: "Classic Snake 1977" },
    objective: { es: "Come frutos y crece sin chocar.", en: "Eat fruits and grow without crashing." },
    controls: { es: "Flechas o WASD.", en: "Arrows or WASD." },
    accent: "#22d3ee",
    lives: 3,
  },
  "breakout-1986": {
    title: { es: "Breakout 1986 Remix", en: "Breakout 1986 Remix" },
    objective: { es: "Limpia todos los bloques.", en: "Clear all bricks." },
    controls: { es: "A/D o flechas, Espacio lanza.", en: "A/D or arrows, Space launches." },
    accent: "#f59e0b",
    lives: 3,
  },
  "space-invaders": {
    title: { es: "Space Invaders Core", en: "Space Invaders Core" },
    objective: { es: "Elimina la formacion invasora.", en: "Destroy the invader formation." },
    controls: { es: "A/D mover, Espacio disparar.", en: "A/D move, Space shoot." },
    accent: "#a3e635",
    lives: 3,
  },
  "tetris-blockfall": {
    title: { es: "Mosaic Grid", en: "Mosaic Grid" },
    objective: { es: "Rellena todo el tablero con las piezas entrantes.", en: "Fill the whole board with the incoming pieces." },
    controls: { es: "Flechas/WASD mueven la pieza activa, Espacio/Enter la coloca y C cambia la pieza.", en: "Arrows/WASD move the active piece, Space/Enter places it, and C changes the piece." },
    accent: "#34d399",
    lives: 1,
  },
  "frogger-crossing": {
    title: { es: "Frogger Crossing DX", en: "Frogger Crossing DX" },
    objective: { es: "Cruza carretera y rio hasta las guaridas.", en: "Cross road and river to reach home slots." },
    controls: { es: "Flechas o WASD.", en: "Arrows or WASD." },
    accent: "#22c55e",
    lives: 3,
  },
  "bomber-grid": {
    title: { es: "Bomber Grid 1989", en: "Bomber Grid 1989" },
    objective: { es: "Elimina enemigos con bombas.", en: "Eliminate enemies with bombs." },
    controls: { es: "Flechas/WASD mover, Espacio bomba.", en: "Arrows/WASD move, Space bomb." },
    accent: "#f43f5e",
    lives: 3,
  },
  "galaga-quantum": {
    title: { es: "Galaga Quantum", en: "Galaga Quantum" },
    objective: { es: "Limpia la oleada y evita los impactos.", en: "Clear the wave and avoid impacts." },
    controls: { es: "A/D mover, Espacio dispara.", en: "A/D move, Space shoot." },
    accent: "#fb7185",
    lives: 3,
  },
  "qbert-prism": {
    title: { es: "Qbert Prism Jump", en: "Qbert Prism Jump" },
    objective: { es: "Convierte toda la piramide de color.", en: "Convert the full pyramid colors." },
    controls: { es: "Flechas/WASD en diagonales de salto.", en: "Arrows/WASD for diagonal hops." },
    accent: "#f97316",
    lives: 3,
  },
  "lunar-lander-orbit": {
    title: { es: "Lunar Lander Orbit", en: "Lunar Lander Orbit" },
    objective: { es: "Aterriza suave sobre la plataforma.", en: "Land softly on the target platform." },
    controls: { es: "A/D rota con inercia, W/Espacio activa el motor principal.", en: "A/D rotate with inertia, W/Space fires the main thruster." },
    accent: "#a78bfa",
    lives: 3,
  },
  "centipede-circuit": {
    title: { es: "Centipede Circuit", en: "Centipede Circuit" },
    objective: { es: "Elimina todos los segmentos centipede.", en: "Eliminate every centipede segment." },
    controls: { es: "Flechas/WASD mover, Espacio disparar.", en: "Arrows/WASD move, Space fire." },
    accent: "#84cc16",
    lives: 3,
  },
  "river-raid-neon": {
    title: { es: "River Raid Neon", en: "River Raid Neon" },
    objective: { es: "Sobrevive al cañon y gestiona combustible.", en: "Survive the canyon and manage fuel." },
    controls: { es: "A/D mover, W acelera, S frena, Espacio dispara.", en: "A/D steer, W throttle, S brake, Space fire." },
    accent: "#06b6d4",
    lives: 3,
  },
  "tron-lightcycles": {
    title: { es: "Tron Lightcycles", en: "Tron Lightcycles" },
    objective: { es: "Encierra a la IA sin tocar estelas.", en: "Trap the AI without touching trails." },
    controls: { es: "Flechas/WASD para cambiar direccion.", en: "Arrows/WASD to change direction." },
    accent: "#0ea5e9",
    lives: 3,
  },
  "road-fighter-synth": {
    title: { es: "Road Fighter Synth", en: "Road Fighter Synth" },
    objective: { es: "Completa distancia evitando trafico.", en: "Clear the distance while dodging traffic." },
    controls: { es: "A/D cambia carril, W acelera, S frena.", en: "A/D lane swap, W accelerate, S brake." },
    accent: "#f43f5e",
    lives: 3,
  },
};

const ORDER = Object.keys(DEFINITIONS);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function angNorm(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function text(locale, pair) {
  return locale === "es" ? pair.es : pair.en;
}

function hash(value) {
  let h = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    h ^= value.charCodeAt(index);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRng(seedValue) {
  let seed = (seedValue >>> 0) || 1;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function randInt(rng, min, max) {
  return Math.floor(min + rng() * (max - min));
}

function loadBest(variant) {
  if (typeof window === "undefined") return 0;
  try {
    const value = Number(window.localStorage.getItem(`retro.best.${variant}`));
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  } catch {
    return 0;
  }
}

function saveBest(variant, score) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`retro.best.${variant}`, String(Math.max(0, Math.floor(score))));
  } catch {
    // ignore
  }
}

function createInput() {
  const down = new Set();
  const pressed = new Set();
  return {
    press(code) {
      if (!down.has(code)) pressed.add(code);
      down.add(code);
    },
    release(code) {
      down.delete(code);
    },
    down(code) {
      return down.has(code);
    },
    pressed(code) {
      return pressed.has(code);
    },
    clearPressed() {
      pressed.clear();
    },
    clearAll() {
      down.clear();
      pressed.clear();
    },
  };
}

function baseState(variant, locale) {
  const key = ORDER.includes(variant) ? variant : "snake-classic";
  const definition = DEFINITIONS[key];
  return {
    variant: key,
    locale,
    phase: "menu",
    level: 1,
    lives: definition.lives,
    score: 0,
    best: loadBest(key),
    elapsedMs: 0,
    message: text(locale, definition.objective),
    isFullscreen: false,
    run: 1,
    game: null,
  };
}

function createSnake(level, seed) {
  const rng = createRng(seed);
  const snake = [{ x: 14, y: 9 }, { x: 13, y: 9 }, { x: 12, y: 9 }];
  const food = { x: randInt(rng, 0, 30), y: randInt(rng, 0, 18) };
  return {
    cols: 30,
    rows: 18,
    snake,
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    food,
    moveAcc: 0,
    foods: 0,
    targetFoods: 7 + level * 2,
    rng,
  };
}

function createPong(level, seed) {
  const rng = createRng(seed);
  return {
    playerY: HEIGHT * 0.5 - 52,
    aiY: HEIGHT * 0.5 - 52,
    paddleH: 104,
    scoreA: 0,
    scoreB: 0,
    ball: {
      x: WIDTH * 0.5,
      y: HEIGHT * 0.5,
      vx: (rng() > 0.5 ? 1 : -1) * (250 + level * 12),
      vy: (rng() * 2 - 1) * 170,
    },
    serve: 0.8,
  };
}

function createBreakout(level, seed) {
  const rng = createRng(seed);
  const bricks = [];
  const rows = 5 + Math.min(4, Math.floor((level - 1) / 2));
  const startX = Math.floor((WIDTH - (12 * 62 + 11 * 4)) / 2);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < 12; col += 1) {
      bricks.push({
        x: startX + col * 66,
        y: 92 + row * 26,
        w: 62,
        h: 20,
        hp: row < 2 ? 2 : 1,
        boost: rng() < 0.09,
      });
    }
  }
  return {
    paddleX: WIDTH * 0.5 - 72,
    paddleW: 144,
    boostTimer: 0,
    ball: { x: WIDTH * 0.5, y: HEIGHT - 90, vx: 0, vy: 0, r: 9, stuck: true },
    bricks,
  };
}

function createInvaders(level) {
  const enemies = [];
  const rows = 4 + Math.min(2, Math.floor((level - 1) / 2));
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < 10; col += 1) {
      enemies.push({ x: 132 + col * 62, y: 92 + row * 46, w: 38, h: 26 });
    }
  }
  return {
    playerX: WIDTH * 0.5,
    bullets: [],
    enemyBullets: [],
    enemies,
    dir: 1,
    speed: 34 + level * 8,
    fireCd: 1.2,
    shotCd: 0,
  };
}

function createAsteroids(level, seed) {
  const rng = createRng(seed);
  const rocks = [];
  for (let i = 0; i < 4 + level; i += 1) {
    rocks.push({
      x: randInt(rng, 50, WIDTH - 50),
      y: randInt(rng, 50, HEIGHT - 50),
      vx: (rng() * 2 - 1) * 90,
      vy: (rng() * 2 - 1) * 90,
      r: randInt(rng, 22, 40),
      size: 3,
    });
  }
  return {
    ship: { x: WIDTH * 0.5, y: HEIGHT * 0.5, vx: 0, vy: 0, a: -Math.PI * 0.5 },
    bullets: [],
    shotCd: 0,
    rocks,
    rng,
  };
}

const BLOCK_BOARD_SIZE = 15;
const BLOCK_INCOMING_X = WIDTH + 90;
const BLOCK_READY_X = 695;

const BLOCK_COLORS = [
  "#22d3ee",
  "#facc15",
  "#fb923c",
  "#60a5fa",
  "#a78bfa",
  "#34d399",
  "#f87171",
  "#c084fc",
  "#2dd4bf",
  "#f472b6",
];

const BLOCK_TILE_PACKS = [
  [
    [[1, 1], [1, 1]],
    [[1], [1]],
    [[1, 1, 1]],
  ],
  [
    [[1, 1, 1], [0, 1, 0]],
    [[1, 0], [1, 1]],
    [[1], [1]],
  ],
  [
    [[1, 0], [1, 0], [1, 1]],
    [[1, 1], [1, 1], [0, 1]],
  ],
  [
    [[1], [1], [1]],
    [[1], [1], [1]],
    [[1], [1], [1]],
  ],
  [
    [[1, 1, 1]],
    [[1, 1, 1]],
    [[1, 1, 1]],
  ],
  [
    [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
    [[1]],
    [[1]],
    [[1]],
    [[1]],
  ],
  [
    [[1, 1], [1, 0], [1, 1]],
    [[0, 1], [1, 1], [0, 1]],
  ],
  [
    [[1, 1, 1], [1, 1, 1]],
    [[1, 1, 1]],
  ],
  [
    [[1, 0], [1, 1]],
    [[1, 1], [0, 1]],
    [[1, 1, 1]],
  ],
  [
    [[1, 1, 0], [0, 1, 1]],
    [[1, 0], [1, 1], [0, 1]],
    [[1]],
  ],
];

function createBlockPiece(matrix, color) {
  return { c: color, m: matrix.map((row) => [...row]) };
}

function blockPieceCellCount(piece) {
  if (!piece) return 0;
  return piece.m.flat().filter(Boolean).length;
}

function createBlockPieceQueue(rng) {
  const pieces = [];
  let colorIndex = 0;
  for (let row = 0; row < BLOCK_BOARD_SIZE; row += 3) {
    for (let col = 0; col < BLOCK_BOARD_SIZE; col += 3) {
      const pack = BLOCK_TILE_PACKS[Math.floor(rng() * BLOCK_TILE_PACKS.length)];
      for (const matrix of pack) {
        pieces.push(createBlockPiece(matrix, BLOCK_COLORS[colorIndex % BLOCK_COLORS.length]));
        colorIndex += 1;
      }
    }
  }
  for (let i = pieces.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  return pieces;
}

function spawnNextBlockPiece(g) {
  g.active = g.queue.shift() ?? null;
  if (!g.active && !blockBoardIsFull(g)) {
    const piece = createFittingBlockPiece(g);
    if (piece) {
      g.active = piece;
      g.totalPieces += 1;
    }
  }
  g.incomingX = BLOCK_INCOMING_X;
  g.ready = false;
  blockClampCursor(g, g.active);
}

function createTetris(level, seed) {
  const rng = createRng(seed);
  const queue = createBlockPieceQueue(rng);
  const game = {
    board: Array.from({ length: BLOCK_BOARD_SIZE }, () =>
      Array.from({ length: BLOCK_BOARD_SIZE }, () => 0)
    ),
    active: null,
    incomingX: BLOCK_INCOMING_X,
    ready: false,
    cursor: { col: Math.floor(BLOCK_BOARD_SIZE / 2) - 1, row: Math.floor(BLOCK_BOARD_SIZE / 2) - 1 },
    placedCells: 0,
    won: false,
    queue,
    totalPieces: queue.length,
    placedPieces: 0,
    swaps: 0,
    rng,
  };
  spawnNextBlockPiece(game);
  return {
    ...game,
  };
}

function createFrogger(level, seed) {
  const rng = createRng(seed);
  const lanes = [];
  const road = [11, 10, 9, 8];
  const water = [6, 5, 4, 3, 2];
  for (const row of road) {
    const speed = (rng() > 0.5 ? 1 : -1) * (90 + rng() * 55) * (1 + (level - 1) * 0.08);
    const items = [];
    for (let i = 0; i < 3 + randInt(rng, 0, 2); i += 1) {
      items.push({ x: randInt(rng, 20, WIDTH - 100), w: 70 + rng() * 35 });
    }
    lanes.push({ row, kind: "road", speed, items });
  }
  for (const row of water) {
    const speed = (rng() > 0.5 ? 1 : -1) * (70 + rng() * 45) * (1 + (level - 1) * 0.08);
    const items = [];
    for (let i = 0; i < 2 + randInt(rng, 0, 2); i += 1) {
      items.push({ x: randInt(rng, 20, WIDTH - 160), w: 110 + rng() * 55 });
    }
    lanes.push({ row, kind: "water", speed, items });
  }
  return {
    frog: { x: 8, y: 12 },
    moveCd: 0,
    lanes,
    homes: new Set(),
    roundMs: 0,
    limitMs: 62000,
  };
}

function createGalaga(level, seed) {
  const rng = createRng(seed);
  const enemies = [];
  const total = 10 + level * 2;
  for (let i = 0; i < total; i += 1) {
    const lane = i % 8;
    const row = Math.floor(i / 8);
    const boss = i === total - 1 && level > 1;
    enemies.push({
      x: 112 + lane * 92,
      y: -row * 70 - randInt(rng, 24, 90),
      baseX: 112 + lane * 92,
      t: rng() * Math.PI * 2,
      boss,
      hp: boss ? 6 + level : 1,
      maxHp: boss ? 6 + level : 1,
    });
  }
  return {
    playerX: WIDTH * 0.5,
    bullets: [],
    enemyBullets: [],
    enemies,
    shotCd: 0,
    fireCd: 1,
    combo: 0,
    comboCd: 0,
    rng,
  };
}

function createQbert(level, seed) {
  const rng = createRng(seed);
  const tiles = [];
  for (let row = 0; row < 7; row += 1) {
    tiles.push(Array.from({ length: row + 1 }, () => 0));
  }
  return {
    size: 7,
    tiles,
    target: 1 + Math.min(2, Math.floor((level - 1) / 3)),
    player: { row: 0, col: 0 },
    enemy: { row: 0, col: 0, active: false, cd: 0 },
    moveCd: 0,
    rng,
  };
}

function createMissile(level, seed) {
  const rng = createRng(seed);
  return {
    cities: [120, 220, 340, 620, 740, 840].map((x) => ({ x, alive: true })),
    silos: [180, 480, 780],
    cross: { x: WIDTH * 0.5, y: 210 },
    enemies: [],
    players: [],
    blasts: [],
    spawnCd: 0.55,
    spawned: 0,
    quota: 16 + level * 3,
    shotCd: 0,
    rng,
  };
}

function ridgeYAt(ridge, x) {
  for (let i = 0; i < ridge.length - 1; i += 1) {
    const a = ridge[i];
    const b = ridge[i + 1];
    if (x >= a.x && x <= b.x) {
      const span = b.x - a.x;
      const t = span <= 0 ? 0 : (x - a.x) / span;
      return a.y + (b.y - a.y) * t;
    }
  }
  return BODY_BOTTOM;
}

function terrainYAtLander(g, x) {
  const padHalf = g.pad.w * 0.5;
  if (x >= g.pad.x - padHalf && x <= g.pad.x + padHalf) return g.pad.y;
  return ridgeYAt(g.ridge, x);
}

function landerLocalToWorld(ship, localX, localY) {
  const rotation = ship.a + Math.PI * 0.5;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    x: ship.x + localX * cos - localY * sin,
    y: ship.y + localX * sin + localY * cos,
  };
}

function getLanderContactPoints(ship) {
  return {
    nose: landerLocalToWorld(ship, 0, -14),
    leftFoot: landerLocalToWorld(ship, -LANDER_LEG_SPAN, LANDER_FOOT_LOCAL_Y),
    rightFoot: landerLocalToWorld(ship, LANDER_LEG_SPAN, LANDER_FOOT_LOCAL_Y),
    leftHull: landerLocalToWorld(ship, -9, 7),
    rightHull: landerLocalToWorld(ship, 9, 7),
  };
}

function createLander(level, seed) {
  const rng = createRng(seed);
  const padWidth = Math.max(76, 146 - level * 4);
  const padX = randInt(rng, 170, WIDTH - 170);
  const padLeft = padX - padWidth * 0.5;
  const padRight = padX + padWidth * 0.5;
  const padY = HEIGHT - 78;
  const terrainPoints = [];
  for (let i = 0; i < 14; i += 1) {
    const x = (i / 13) * WIDTH;
    const naturalY = clamp(HEIGHT - 56 - rng() * 36, BODY_TOP + 110, BODY_BOTTOM - 4);
    if (x < padLeft - 24 || x > padRight + 24) {
      terrainPoints.push({ x, y: naturalY });
    }
  }
  const ridge = [
    ...terrainPoints,
    { x: padLeft - 30, y: padY + 20 },
    { x: padLeft - 12, y: padY },
    { x: padLeft, y: padY },
    { x: padRight, y: padY },
    { x: padRight + 12, y: padY },
    { x: padRight + 30, y: padY + 20 },
  ].sort((a, b) => a.x - b.x);
  const startSide = rng() > 0.5 ? 1 : -1;
  const startX = clamp(padX - startSide * randInt(rng, 210, 310), 90, WIDTH - 90);
  const startVx = startSide * (34 + level * 2.5);
  return {
    ship: {
      x: startX,
      y: 118,
      vx: startVx,
      vy: -8,
      a: -Math.PI * 0.5,
      av: 0,
      fuel: 100,
      thrust: false,
      landed: false,
    },
    pad: { x: padX, y: padY, w: padWidth },
    gravity: 76 + level * 4.5,
    thrustAccel: 235 + level * 4,
    rotationAccel: 5.4,
    angularDamping: 0.985,
    fuelBurn: 16 + level * 0.7,
    safeVx: Math.max(22, 52 - level * 1.8),
    safeVy: Math.max(42, 82 - level * 2.6),
    safeAngle: 0.24,
    stars: Array.from({ length: 58 }, () => ({
      x: rng() * WIDTH,
      y: rng() * (HEIGHT - 130),
      r: 1 + rng() * 2,
    })),
    ridge,
  };
}

function createCentipede(level, seed) {
  const rng = createRng(seed);
  const cols = 28;
  const rows = 20;
  const mushrooms = new Set();
  const target = 26 + level * 3;
  while (mushrooms.size < target) {
    const x = randInt(rng, 0, cols);
    const y = randInt(rng, 3, rows - 4);
    mushrooms.add(cellKey(x, y));
  }
  const segments = [];
  const total = 8 + Math.min(10, level * 2);
  for (let i = 0; i < total; i += 1) {
    segments.push({ x: i, y: 1 });
  }
  return {
    cols,
    rows,
    cell: 24,
    player: { x: Math.floor(cols * 0.5), y: rows - 2, shotCd: 0, moveCd: 0 },
    segments,
    dir: 1,
    stepAcc: 0,
    stepDelay: Math.max(0.18 - level * 0.01, 0.07),
    bullets: [],
    mushrooms,
    flea: { active: false, x: 0, y: 0, vy: 0, cd: 1.7 },
    rng,
  };
}

function createRiverRaid(level, seed) {
  const rng = createRng(seed);
  return {
    playerX: WIDTH * 0.5,
    playerY: HEIGHT - 92,
    fuel: 100,
    distance: 0,
    targetDistance: 2800 + level * 650,
    baseSpeed: 210 + level * 18,
    shotCd: 0,
    spawnCd: 0.4,
    bullets: [],
    obstacles: [],
    rng,
  };
}

function createTron(level, seed) {
  const rng = createRng(seed);
  const cols = 34;
  const rows = 20;
  const player = { x: 6, y: Math.floor(rows * 0.5), dir: { x: 1, y: 0 }, next: { x: 1, y: 0 } };
  const ai = { x: cols - 7, y: Math.floor(rows * 0.5), dir: { x: -1, y: 0 }, next: { x: -1, y: 0 }, think: 0.1 };
  return {
    cols,
    rows,
    trails: new Set([cellKey(player.x, player.y), cellKey(ai.x, ai.y)]),
    player,
    ai,
    stepAcc: 0,
    stepDelay: Math.max(0.14 - level * 0.005, 0.06),
    roundMs: 0,
    limitMs: 68000,
    rng,
  };
}

function createRoadFighter(level, seed) {
  return {
    lanes: 5,
    playerLane: 2,
    playerY: HEIGHT - 102,
    laneCd: 0,
    cars: [],
    spawnCd: 0.34,
    distance: 0,
    targetDistance: 2500 + level * 560,
    baseSpeed: 220 + level * 18,
    rng: createRng(seed),
  };
}

function createBomber(level, seed) {
  const rng = createRng(seed);
  const cols = 15;
  const rows = 11;
  const map = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => {
      if (row === 0 || row === rows - 1 || col === 0 || col === cols - 1) return 1;
      if (row % 2 === 0 && col % 2 === 0) return 1;
      if (row <= 2 && col <= 2) return 0;
      return rng() < 0.44 ? 2 : 0;
    })
  );
  const enemies = [];
  const count = 3 + Math.min(5, level);
  while (enemies.length < count) {
    const x = randInt(rng, 1, cols - 1);
    const y = randInt(rng, 1, rows - 1);
    if (map[y][x] === 0 && (x > 3 || y > 3)) {
      enemies.push({ x, y, cd: rng() * 0.4 });
    }
  }
  return {
    cols,
    rows,
    map,
    player: { x: 1, y: 1, cd: 0, cap: 1, range: 2 },
    bombs: [],
    flames: [],
    enemies,
    power: [],
    roundMs: 0,
    limitMs: Math.max(65000, 105000 - level * 5000),
    rng,
  };
}

function createGame(variant, level, run) {
  const seed = hash(`${variant}:${run}:level:${level}`);
  switch (variant) {
    case "snake-classic": return createSnake(level, seed);
    case "breakout-1986": return createBreakout(level, seed);
    case "space-invaders": return createInvaders(level);
    case "tetris-blockfall": return createTetris(level, seed);
    case "frogger-crossing": return createFrogger(level, seed);
    case "bomber-grid": return createBomber(level, seed);
    case "galaga-quantum": return createGalaga(level, seed);
    case "qbert-prism": return createQbert(level, seed);
    case "lunar-lander-orbit": return createLander(level, seed);
    case "centipede-circuit": return createCentipede(level, seed);
    case "river-raid-neon": return createRiverRaid(level, seed);
    case "tron-lightcycles": return createTron(level, seed);
    case "road-fighter-synth": return createRoadFighter(level, seed);
    default: return createSnake(level, seed);
  }
}

function addScore(state, points) {
  if (!Number.isFinite(points) || points <= 0) return;
  state.score += Math.floor(points);
  if (state.score > state.best) {
    state.best = state.score;
    saveBest(state.variant, state.best);
  }
}

function resetRun(state) {
  const definition = DEFINITIONS[state.variant];
  state.phase = "playing";
  state.level = 1;
  state.lives = definition.lives;
  state.score = 0;
  state.elapsedMs = 0;
  state.run += 1;
  state.game = createGame(state.variant, 1, state.run);
}

function levelUp(state, es, en, bonus = 0) {
  state.level += 1;
  addScore(state, bonus);
  state.game = createGame(state.variant, state.level, state.run);
  state.message = state.locale === "es" ? es : en;
}

function loseLife(state, es, en) {
  state.lives -= 1;
  if (state.lives <= 0) {
    state.phase = "gameover";
    state.message = state.locale === "es" ? es : en;
    return;
  }
  state.game = createGame(state.variant, state.level, state.run);
  state.message = state.locale === "es" ? `${es} · vidas ${state.lives}` : `${en} · lives ${state.lives}`;
}

function collideCircleRect(cx, cy, r, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

function pointRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

function rectOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function cellKey(x, y) {
  return `${x}:${y}`;
}

function riverBounds(distance, level) {
  const sway = Math.sin(distance * 0.0017) * (112 + Math.min(76, level * 5));
  const center = WIDTH * 0.5 + sway;
  const width = Math.max(308, 432 - level * 7 + Math.sin(distance * 0.0022) * 36);
  return {
    left: center - width * 0.5,
    right: center + width * 0.5,
  };
}

function updateSnake(state, input, dt) {
  const g = state.game;
  if ((input.pressed("ArrowLeft") || input.pressed("KeyA")) && g.dir.x !== 1) g.nextDir = { x: -1, y: 0 };
  if ((input.pressed("ArrowRight") || input.pressed("KeyD")) && g.dir.x !== -1) g.nextDir = { x: 1, y: 0 };
  if ((input.pressed("ArrowUp") || input.pressed("KeyW")) && g.dir.y !== 1) g.nextDir = { x: 0, y: -1 };
  if ((input.pressed("ArrowDown") || input.pressed("KeyS")) && g.dir.y !== -1) g.nextDir = { x: 0, y: 1 };
  const delay = Math.max(0.16 - (state.level - 1) * 0.01 - Math.floor(g.foods / 5) * 0.004, 0.055);
  g.moveAcc += dt;
  while (g.moveAcc >= delay) {
    g.moveAcc -= delay;
    g.dir = { ...g.nextDir };
    const head = g.snake[0];
    const next = { x: head.x + g.dir.x, y: head.y + g.dir.y };
    if (next.x < 0 || next.x >= g.cols || next.y < 0 || next.y >= g.rows) {
      loseLife(state, "Colision con muro", "Wall collision");
      return;
    }
    if (g.snake.some((segment) => segment.x === next.x && segment.y === next.y)) {
      loseLife(state, "Colision con cola", "Tail collision");
      return;
    }
    g.snake.unshift(next);
    if (next.x === g.food.x && next.y === g.food.y) {
      addScore(state, 90 + state.level * 18);
      g.foods += 1;
      g.food = { x: randInt(g.rng, 0, g.cols), y: randInt(g.rng, 0, g.rows) };
    } else {
      g.snake.pop();
    }
    if (g.foods >= g.targetFoods) {
      levelUp(state, "Nivel superado en Snake", "Snake level cleared", 260 + state.level * 40);
      return;
    }
  }
}

function updatePong(state, input, dt) {
  const g = state.game;
  if (input.down("ArrowUp") || input.down("KeyW")) g.playerY -= (390 + state.level * 15) * dt;
  if (input.down("ArrowDown") || input.down("KeyS")) g.playerY += (390 + state.level * 15) * dt;
  g.playerY = clamp(g.playerY, 20, HEIGHT - g.paddleH - 20);

  const aiCenter = g.aiY + g.paddleH * 0.5;
  const target = g.ball.y + g.ball.vy * 0.08;
  const aiSpeed = 290 + state.level * 18;
  if (aiCenter < target - 6) g.aiY += aiSpeed * dt;
  if (aiCenter > target + 6) g.aiY -= aiSpeed * dt;
  g.aiY = clamp(g.aiY, 20, HEIGHT - g.paddleH - 20);

  if (g.serve > 0) {
    g.serve -= dt;
    return;
  }

  g.ball.x += g.ball.vx * dt;
  g.ball.y += g.ball.vy * dt;
  if (g.ball.y < 16 || g.ball.y > HEIGHT - 16) g.ball.vy *= -1;
  if (collideCircleRect(g.ball.x, g.ball.y, 10, 28, g.playerY, 14, g.paddleH)) {
    const off = (g.ball.y - (g.playerY + g.paddleH * 0.5)) / (g.paddleH * 0.5);
    g.ball.vx = Math.abs(g.ball.vx) + 10;
    g.ball.vy = off * 300;
    addScore(state, 8);
  }
  if (collideCircleRect(g.ball.x, g.ball.y, 10, WIDTH - 42, g.aiY, 14, g.paddleH)) {
    const off = (g.ball.y - (g.aiY + g.paddleH * 0.5)) / (g.paddleH * 0.5);
    g.ball.vx = -Math.abs(g.ball.vx) - 10;
    g.ball.vy = off * 280;
  }
  if (g.ball.x < -16) {
    g.scoreB += 1;
    g.ball = { x: WIDTH * 0.5, y: HEIGHT * 0.5, vx: -(250 + state.level * 10), vy: 120 };
    g.serve = 0.7;
  }
  if (g.ball.x > WIDTH + 16) {
    g.scoreA += 1;
    addScore(state, 140 + state.level * 10);
    g.ball = { x: WIDTH * 0.5, y: HEIGHT * 0.5, vx: 250 + state.level * 10, vy: -120 };
    g.serve = 0.7;
  }
  if (g.scoreA >= 7) {
    levelUp(state, "Set ganado", "Set won", 360 + state.level * 40);
    return;
  }
  if (g.scoreB >= 7) loseLife(state, "La CPU gano el set", "CPU won the set");
}

function updateBreakout(state, input, dt) {
  const g = state.game;
  if (input.down("ArrowLeft") || input.down("KeyA")) g.paddleX -= 520 * dt;
  if (input.down("ArrowRight") || input.down("KeyD")) g.paddleX += 520 * dt;
  g.paddleX = clamp(g.paddleX, 24, WIDTH - g.paddleW - 24);
  if (g.boostTimer > 0) {
    g.boostTimer -= dt;
    if (g.boostTimer <= 0) g.paddleW = clamp(g.paddleW - 40, 110, 180);
  }
  if (g.ball.stuck) {
    g.ball.x = g.paddleX + g.paddleW * 0.5;
    g.ball.y = HEIGHT - 90;
    if (input.pressed("Space") || input.pressed("Enter")) {
      g.ball.stuck = false;
      g.ball.vx = 180 + state.level * 16;
      g.ball.vy = -260 - state.level * 22;
    }
    return;
  }
  g.ball.x += g.ball.vx * dt;
  g.ball.y += g.ball.vy * dt;
  if (g.ball.x < g.ball.r + 12 || g.ball.x > WIDTH - g.ball.r - 12) g.ball.vx *= -1;
  if (g.ball.y < g.ball.r + 28) g.ball.vy *= -1;
  if (collideCircleRect(g.ball.x, g.ball.y, g.ball.r, g.paddleX, HEIGHT - 64, g.paddleW, 16)) {
    const off = (g.ball.x - (g.paddleX + g.paddleW * 0.5)) / (g.paddleW * 0.5);
    g.ball.vx = off * 320;
    g.ball.vy = -Math.abs(g.ball.vy) - 8;
  }
  for (const brick of g.bricks) {
    if (brick.hp <= 0) continue;
    if (!collideCircleRect(g.ball.x, g.ball.y, g.ball.r, brick.x, brick.y, brick.w, brick.h)) continue;
    brick.hp -= 1;
    g.ball.vy *= -1;
    addScore(state, brick.hp <= 0 ? 25 : 10);
    if (brick.hp <= 0 && brick.boost) {
      g.paddleW = clamp(g.paddleW + 40, 110, 220);
      g.boostTimer = 9;
    }
    break;
  }
  if (g.bricks.filter((brick) => brick.hp > 0).length === 0) {
    levelUp(state, "Muro despejado", "Wall cleared", 420 + state.level * 50);
    return;
  }
  if (g.ball.y > HEIGHT + 20) loseLife(state, "Bola perdida", "Ball lost");
}

function updateInvaders(state, input, dt) {
  const g = state.game;
  if (input.down("ArrowLeft") || input.down("KeyA")) g.playerX -= 340 * dt;
  if (input.down("ArrowRight") || input.down("KeyD")) g.playerX += 340 * dt;
  g.playerX = clamp(g.playerX, 30, WIDTH - 30);
  g.shotCd = Math.max(0, g.shotCd - dt);
  if ((input.pressed("Space") || input.pressed("Enter")) && g.shotCd <= 0) {
    g.bullets.push({ x: g.playerX, y: HEIGHT - 78, vy: -520 });
    g.shotCd = 0.22;
  }
  let edge = false;
  for (const enemy of g.enemies) {
    enemy.x += g.dir * g.speed * dt;
    if (enemy.x <= 20 || enemy.x + enemy.w >= WIDTH - 20) edge = true;
  }
  if (edge) {
    g.dir *= -1;
    for (const enemy of g.enemies) enemy.y += 18;
  }
  g.fireCd -= dt;
  if (g.fireCd <= 0 && g.enemies.length > 0) {
    const shooter = g.enemies[randInt(Math.random, 0, g.enemies.length)];
    if (shooter) g.enemyBullets.push({ x: shooter.x + shooter.w * 0.5, y: shooter.y + shooter.h, vy: 250 + state.level * 20 });
    g.fireCd = Math.max(0.3, 1.2 - state.level * 0.05);
  }
  for (const bullet of g.bullets) bullet.y += bullet.vy * dt;
  for (const bullet of g.enemyBullets) bullet.y += bullet.vy * dt;
  g.bullets = g.bullets.filter((bullet) => bullet.y > -30);
  g.enemyBullets = g.enemyBullets.filter((bullet) => bullet.y < HEIGHT + 30);
  const survivors = [];
  for (const enemy of g.enemies) {
    let hit = false;
    for (const bullet of g.bullets) {
      if (pointRect(bullet.x, bullet.y, enemy.x, enemy.y, enemy.w, enemy.h)) {
        hit = true;
        bullet.y = -999;
        addScore(state, 55 + state.level * 6);
        break;
      }
    }
    if (!hit) survivors.push(enemy);
  }
  g.enemies = survivors;
  g.bullets = g.bullets.filter((bullet) => bullet.y > -100);
  const dead = g.enemyBullets.some((bullet) => dist2(bullet.x, bullet.y, g.playerX, HEIGHT - 64) <= 18 * 18);
  if (dead) {
    loseLife(state, "Impacto enemigo", "Enemy hit");
    return;
  }
  if (g.enemies.some((enemy) => enemy.y + enemy.h > HEIGHT - 84)) {
    loseLife(state, "Invasion completa", "Invasion reached base");
    return;
  }
  if (g.enemies.length === 0) levelUp(state, "Oleada neutralizada", "Wave neutralized", 520 + state.level * 40);
}

function blockCanPlace(board, piece, col, row) {
  if (!piece) return false;
  for (let r = 0; r < piece.m.length; r += 1) {
    for (let c = 0; c < piece.m[r].length; c += 1) {
      if (!piece.m[r][c]) continue;
      const x = col + c;
      const y = row + r;
      if (x < 0 || x >= BLOCK_BOARD_SIZE || y < 0 || y >= BLOCK_BOARD_SIZE) return false;
      if (board[y][x]) return false;
    }
  }
  return true;
}

function blockHasAnyFit(board, piece) {
  if (!piece) return false;
  for (let r = 0; r < BLOCK_BOARD_SIZE; r += 1) {
    for (let c = 0; c < BLOCK_BOARD_SIZE; c += 1) {
      if (blockCanPlace(board, piece, c, r)) return true;
    }
  }
  return false;
}

function blockBoardIsFull(g) {
  return g.placedCells >= BLOCK_BOARD_SIZE * BLOCK_BOARD_SIZE;
}

function blockAnyQueuedPieceFits(g) {
  if (blockHasAnyFit(g.board, g.active)) return true;
  return g.queue.some((piece) => blockHasAnyFit(g.board, piece));
}

function createFittingBlockPiece(g) {
  const candidates = BLOCK_TILE_PACKS.flat().map((matrix) => matrix.map((row) => [...row]));
  candidates.push([[1, 1]], [[1], [1]], [[1]]);
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(g.rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  candidates.sort((a, b) =>
    b.flat().filter(Boolean).length - a.flat().filter(Boolean).length
  );
  for (const matrix of candidates) {
    const color = BLOCK_COLORS[Math.floor(g.rng() * BLOCK_COLORS.length)];
    const piece = createBlockPiece(matrix, color);
    if (blockHasAnyFit(g.board, piece)) return piece;
  }
  return null;
}

function ensureBlockCanContinue(g) {
  if (blockBoardIsFull(g) || blockAnyQueuedPieceFits(g)) return;
  const piece = createFittingBlockPiece(g);
  if (!piece) return;
  g.queue.push(piece);
  g.totalPieces += 1;
}

function changeActiveBlockPiece(g) {
  if (!g.active || blockBoardIsFull(g)) return false;
  ensureBlockCanContinue(g);
  if (g.queue.length === 0) {
    const piece = createFittingBlockPiece(g);
    if (!piece) return false;
    g.queue.push(piece);
    g.totalPieces += 1;
  }
  g.queue.push(g.active);
  spawnNextBlockPiece(g);
  g.swaps = (g.swaps ?? 0) + 1;
  return true;
}

function blockClampCursor(g, piece) {
  if (!piece) return;
  const maxCol = Math.max(0, BLOCK_BOARD_SIZE - piece.m[0].length);
  const maxRow = Math.max(0, BLOCK_BOARD_SIZE - piece.m.length);
  g.cursor.col = clamp(g.cursor.col, 0, maxCol);
  g.cursor.row = clamp(g.cursor.row, 0, maxRow);
}

function updateAsteroids(state, input, dt) {
  const g = state.game;
  const ship = g.ship;
  if (input.down("ArrowLeft") || input.down("KeyA")) ship.a -= 2.9 * dt;
  if (input.down("ArrowRight") || input.down("KeyD")) ship.a += 2.9 * dt;
  if (input.down("ArrowUp") || input.down("KeyW")) {
    ship.vx += Math.cos(ship.a) * 190 * dt;
    ship.vy += Math.sin(ship.a) * 190 * dt;
  }
  ship.vx *= 0.994;
  ship.vy *= 0.994;
  ship.x = (ship.x + ship.vx * dt + WIDTH) % WIDTH;
  ship.y = (ship.y + ship.vy * dt + HEIGHT) % HEIGHT;
  g.shotCd = Math.max(0, g.shotCd - dt);
  if ((input.pressed("Space") || input.pressed("Enter")) && g.shotCd <= 0) {
    g.bullets.push({
      x: ship.x + Math.cos(ship.a) * 12,
      y: ship.y + Math.sin(ship.a) * 12,
      vx: Math.cos(ship.a) * 360 + ship.vx,
      vy: Math.sin(ship.a) * 360 + ship.vy,
      ttl: 1.25,
    });
    g.shotCd = 0.17;
  }
  for (const bullet of g.bullets) {
    bullet.x = (bullet.x + bullet.vx * dt + WIDTH) % WIDTH;
    bullet.y = (bullet.y + bullet.vy * dt + HEIGHT) % HEIGHT;
    bullet.ttl -= dt;
  }
  g.bullets = g.bullets.filter((bullet) => bullet.ttl > 0);
  for (const rock of g.rocks) {
    rock.x = (rock.x + rock.vx * dt + WIDTH) % WIDTH;
    rock.y = (rock.y + rock.vy * dt + HEIGHT) % HEIGHT;
  }
  const next = [];
  for (const rock of g.rocks) {
    let hit = false;
    for (const bullet of g.bullets) {
      if (dist2(rock.x, rock.y, bullet.x, bullet.y) <= rock.r * rock.r) {
        hit = true;
        bullet.ttl = -1;
        addScore(state, rock.size === 3 ? 70 : rock.size === 2 ? 120 : 180);
        if (rock.size > 1) {
          for (let i = 0; i < 2; i += 1) {
            next.push({
              x: rock.x,
              y: rock.y,
              vx: rock.vx + (g.rng() * 2 - 1) * 80,
              vy: rock.vy + (g.rng() * 2 - 1) * 80,
              r: rock.size === 3 ? 20 + g.rng() * 8 : 12 + g.rng() * 5,
              size: rock.size - 1,
            });
          }
        }
        break;
      }
    }
    if (!hit) next.push(rock);
  }
  g.rocks = next;
  g.bullets = g.bullets.filter((bullet) => bullet.ttl > 0);
  if (g.rocks.some((rock) => dist2(ship.x, ship.y, rock.x, rock.y) <= (rock.r + 12) ** 2)) {
    loseLife(state, "Impacto con asteroide", "Asteroid collision");
    return;
  }
  if (g.rocks.length === 0) levelUp(state, "Sector despejado", "Sector cleared", 620 + state.level * 70);
}

function updateTetris(state, input, dt) {
  const g = state.game;

  ensureBlockCanContinue(g);
  if (!g.active && (g.queue.length > 0 || !blockBoardIsFull(g))) spawnNextBlockPiece(g);
  if (g.active) {
    g.incomingX = Math.max(BLOCK_READY_X, g.incomingX - dt * 430);
    g.ready = g.incomingX <= BLOCK_READY_X + 0.5;
  }

  let piece = g.active;

  if (piece) {
    if (input.pressed("ArrowLeft") || input.pressed("KeyA")) g.cursor.col -= 1;
    if (input.pressed("ArrowRight") || input.pressed("KeyD")) g.cursor.col += 1;
    if (input.pressed("ArrowUp") || input.pressed("KeyW")) g.cursor.row -= 1;
    if (input.pressed("ArrowDown") || input.pressed("KeyS")) g.cursor.row += 1;
    blockClampCursor(g, piece);
  }

  if (piece && (input.pressed("KeyC") || input.pressed("KeyX"))) {
    if (changeActiveBlockPiece(g)) {
      state.message = state.locale === "es" ? "Pieza cambiada" : "Piece changed";
      piece = g.active;
    }
  }

  if (piece && g.ready && (input.pressed("Space") || input.pressed("Enter"))) {
    if (blockCanPlace(g.board, piece, g.cursor.col, g.cursor.row)) {
      let cells = 0;
      for (let r = 0; r < piece.m.length; r += 1) {
        for (let c = 0; c < piece.m[r].length; c += 1) {
          if (!piece.m[r][c]) continue;
          g.board[g.cursor.row + r][g.cursor.col + c] = piece.c;
          cells += 1;
        }
      }
      addScore(state, cells * 5);
      g.placedCells += cells;
      g.placedPieces += 1;
      spawnNextBlockPiece(g);

      const fillSize = BLOCK_BOARD_SIZE * BLOCK_BOARD_SIZE;
      if (g.placedCells >= fillSize) {
        addScore(state, 1200);
        g.won = true;
        state.phase = "gameover";
        state.message = state.locale === "es" ? "Tablero completo" : "Board complete";
        return;
      }
      ensureBlockCanContinue(g);
    } else {
      state.message = state.locale === "es"
        ? "No encaja aqui: mueve o cambia pieza"
        : "No fit here: move or change piece";
    }
  }
}

function rowY(row) {
  return 64 + row * 34;
}

function frogX(col) {
  return 52 + col * 56;
}

function updateFrogger(state, input, dt) {
  const g = state.game;
  g.roundMs += dt * 1000;
  if (g.roundMs >= g.limitMs) {
    loseLife(state, "Tiempo agotado", "Time out");
    return;
  }
  g.moveCd = Math.max(0, g.moveCd - dt);
  if (g.moveCd <= 0) {
    if (input.pressed("ArrowLeft") || input.pressed("KeyA")) { g.frog.x -= 1; g.moveCd = 0.08; }
    else if (input.pressed("ArrowRight") || input.pressed("KeyD")) { g.frog.x += 1; g.moveCd = 0.08; }
    else if (input.pressed("ArrowUp") || input.pressed("KeyW")) { g.frog.y -= 1; g.moveCd = 0.08; }
    else if (input.pressed("ArrowDown") || input.pressed("KeyS")) { g.frog.y += 1; g.moveCd = 0.08; }
  }
  g.frog.x = clamp(g.frog.x, 0, 16);
  g.frog.y = clamp(g.frog.y, 1, 12);
  for (const lane of g.lanes) {
    for (const item of lane.items) {
      item.x += lane.speed * dt;
      if (lane.speed > 0 && item.x > WIDTH + 180) item.x = -item.w - 40;
      if (lane.speed < 0 && item.x + item.w < -180) item.x = WIDTH + 40;
    }
  }
  if (g.frog.y === 1) {
    const homes = [2, 5, 8, 11, 14];
    const slot = homes.reduce((best, current) =>
      Math.abs(current - g.frog.x) < Math.abs(best - g.frog.x) ? current : best
    , homes[0]);
    if (!g.homes.has(slot)) {
      g.homes.add(slot);
      addScore(state, 220 + state.level * 30);
      g.frog = { x: 8, y: 12 };
      if (g.homes.size === homes.length) levelUp(state, "Cruce completado", "Crossing completed", 680 + state.level * 60);
    } else {
      loseLife(state, "Guarida ocupada", "Slot occupied");
    }
    return;
  }
  const lane = g.lanes.find((entry) => entry.row === g.frog.y);
  if (!lane) return;
  const fx = frogX(g.frog.x);
  if (lane.kind === "road") {
    if (lane.items.some((item) => pointRect(fx, rowY(g.frog.y) + 17, item.x, rowY(g.frog.y) + 4, item.w, 26))) {
      loseLife(state, "Choque en carretera", "Road collision");
    }
    return;
  }
  const log = lane.items.find((item) => fx >= item.x + 8 && fx <= item.x + item.w - 8);
  if (!log) {
    loseLife(state, "Caida al agua", "Fell into water");
    return;
  }
  g.frog.x += lane.speed * dt / 56;
  if (g.frog.x < 0 || g.frog.x > 16) loseLife(state, "Arrastrado por la corriente", "Dragged by current");
}

function updateGalaga(state, input, dt) {
  const g = state.game;
  if (input.down("ArrowLeft") || input.down("KeyA")) g.playerX -= 360 * dt;
  if (input.down("ArrowRight") || input.down("KeyD")) g.playerX += 360 * dt;
  g.playerX = clamp(g.playerX, 26, WIDTH - 26);
  g.shotCd = Math.max(0, g.shotCd - dt);
  if ((input.pressed("Space") || input.pressed("Enter")) && g.shotCd <= 0) {
    g.bullets.push({ x: g.playerX, y: HEIGHT - 74, vy: -560 });
    g.shotCd = 0.14;
  }
  g.fireCd -= dt;
  if (g.fireCd <= 0 && g.enemies.length > 0) {
    const shooter = g.enemies[randInt(g.rng, 0, g.enemies.length)];
    if (shooter) g.enemyBullets.push({ x: shooter.x, y: shooter.y + 16, vy: 220 + state.level * 20 });
    g.fireCd = Math.max(0.25, 0.95 - state.level * 0.05);
  }
  for (const enemy of g.enemies) {
    enemy.t += dt;
    enemy.x = enemy.baseX + Math.sin(enemy.t * 2.2 + enemy.baseX * 0.02) * 28;
    enemy.y += (enemy.boss ? 48 : 62) * dt;
  }
  for (const bullet of g.bullets) bullet.y += bullet.vy * dt;
  for (const bullet of g.enemyBullets) bullet.y += bullet.vy * dt;
  g.bullets = g.bullets.filter((bullet) => bullet.y > -30);
  g.enemyBullets = g.enemyBullets.filter((bullet) => bullet.y < HEIGHT + 30);
  const survivors = [];
  for (const enemy of g.enemies) {
    let destroyed = false;
    for (const bullet of g.bullets) {
      if (dist2(enemy.x, enemy.y, bullet.x, bullet.y) <= (enemy.boss ? 24 : 16) ** 2) {
        enemy.hp -= 1;
        bullet.y = -999;
        if (enemy.hp <= 0) {
          destroyed = true;
          g.combo += 1;
          g.comboCd = 1.6;
          addScore(state, (enemy.boss ? 280 : 90) + g.combo * 10);
        }
        break;
      }
    }
    if (!destroyed) survivors.push(enemy);
  }
  g.enemies = survivors;
  g.bullets = g.bullets.filter((bullet) => bullet.y > -100);
  if (g.comboCd > 0) g.comboCd -= dt;
  else g.combo = 0;
  if (g.enemyBullets.some((bullet) => dist2(bullet.x, bullet.y, g.playerX, HEIGHT - 58) <= 16 ** 2)) {
    loseLife(state, "Impacto en nave", "Ship hit");
    return;
  }
  if (g.enemies.some((enemy) => enemy.y > HEIGHT + 30)) {
    loseLife(state, "Oleada atraveso defensa", "Wave breached defense");
    return;
  }
  if (g.enemies.length === 0) levelUp(state, "Sector galactico asegurado", "Galactic sector secured", 700 + state.level * 80);
}

function qbertValid(size, row, col) {
  return row >= 0 && row < size && col >= 0 && col <= row;
}

function updateQbert(state, input, dt) {
  const g = state.game;
  g.moveCd = Math.max(0, g.moveCd - dt);
  if (g.moveCd <= 0) {
    let row = g.player.row;
    let col = g.player.col;
    if (input.pressed("ArrowLeft") || input.pressed("KeyA")) row += 1;
    else if (input.pressed("ArrowRight") || input.pressed("KeyD")) { row += 1; col += 1; }
    else if (input.pressed("ArrowUp") || input.pressed("KeyW")) { row -= 1; col -= 1; }
    else if (input.pressed("ArrowDown") || input.pressed("KeyS")) row -= 1;
    if (row !== g.player.row || col !== g.player.col) {
      if (!qbertValid(g.size, row, col)) {
        loseLife(state, "Caida de la piramide", "Fell from pyramid");
        return;
      }
      g.player = { row, col };
      g.moveCd = 0.11;
      g.tiles[row][col] = clamp(g.tiles[row][col] + 1, 0, g.target);
      addScore(state, 35 + state.level * 6);
    }
  }
  g.enemy.cd += dt;
  if (!g.enemy.active && g.enemy.cd > 1.4) {
    g.enemy = { row: 0, col: 0, active: true, cd: 0 };
  }
  if (g.enemy.active && g.enemy.cd > 0.55) {
    g.enemy.cd = 0;
    g.enemy.row += 1;
    g.enemy.col += g.rng() > 0.5 ? 1 : 0;
    if (!qbertValid(g.size, g.enemy.row, g.enemy.col)) g.enemy = { row: 0, col: 0, active: false, cd: 0 };
    else g.tiles[g.enemy.row][g.enemy.col] = Math.max(0, g.tiles[g.enemy.row][g.enemy.col] - 1);
  }
  if (g.enemy.active && g.enemy.row === g.player.row && g.enemy.col === g.player.col) {
    loseLife(state, "Impacto con enemigo", "Enemy collision");
    return;
  }
  if (g.tiles.every((row) => row.every((tile) => tile >= g.target))) levelUp(state, "Piramide convertida", "Pyramid converted", 760 + state.level * 90);
}

function updateMissile(state, input, dt) {
  const g = state.game;
  if (input.down("ArrowLeft") || input.down("KeyA")) g.cross.x -= 340 * dt;
  if (input.down("ArrowRight") || input.down("KeyD")) g.cross.x += 340 * dt;
  if (input.down("ArrowUp") || input.down("KeyW")) g.cross.y -= 340 * dt;
  if (input.down("ArrowDown") || input.down("KeyS")) g.cross.y += 340 * dt;
  g.cross.x = clamp(g.cross.x, 20, WIDTH - 20);
  g.cross.y = clamp(g.cross.y, 40, HEIGHT - 120);
  g.shotCd = Math.max(0, g.shotCd - dt);
  if ((input.pressed("Space") || input.pressed("Enter")) && g.shotCd <= 0) {
    const launch = g.silos.reduce((best, x) =>
      Math.abs(x - g.cross.x) < Math.abs(best - g.cross.x) ? x : best
    , g.silos[0]);
    const dx = g.cross.x - launch;
    const dy = g.cross.y - (HEIGHT - 36);
    const len = Math.hypot(dx, dy) || 1;
    g.players.push({
      x: launch,
      y: HEIGHT - 36,
      vx: (dx / len) * 420,
      vy: (dy / len) * 420,
      tx: g.cross.x,
      ty: g.cross.y,
    });
    g.shotCd = 0.16;
  }
  g.spawnCd -= dt;
  if (g.spawned < g.quota && g.spawnCd <= 0) {
    const living = g.cities.filter((city) => city.alive);
    const target = living.length > 0 ? living[randInt(g.rng, 0, living.length)] : g.cities[randInt(g.rng, 0, g.cities.length)];
    const sx = 24 + g.rng() * (WIDTH - 48);
    const sy = -120 + g.rng() * 100;
    const dx = target.x - sx;
    const dy = HEIGHT - 44 - sy;
    const len = Math.hypot(dx, dy) || 1;
    const speed = (85 + g.rng() * 60) * (1 + (state.level - 1) * 0.12);
    g.enemies.push({ x: sx, y: sy, vx: (dx / len) * speed, vy: (dy / len) * speed, tx: target.x });
    g.spawned += 1;
    g.spawnCd = Math.max(0.15, 0.62 - state.level * 0.03);
  }
  for (const missile of g.players) {
    missile.x += missile.vx * dt;
    missile.y += missile.vy * dt;
    if (dist2(missile.x, missile.y, missile.tx, missile.ty) <= 12 * 12) {
      missile.done = true;
      g.blasts.push({ x: missile.x, y: missile.y, r: 2, max: 44, grow: true });
    }
  }
  g.players = g.players.filter((missile) => !missile.done);
  for (const missile of g.enemies) {
    missile.x += missile.vx * dt;
    missile.y += missile.vy * dt;
    if (missile.y >= HEIGHT - 44) {
      missile.done = true;
      const city = g.cities.reduce((best, candidate) =>
        Math.abs(candidate.x - missile.tx) < Math.abs(best.x - missile.tx) ? candidate : best
      , g.cities[0]);
      if (city) city.alive = false;
    }
  }
  g.enemies = g.enemies.filter((missile) => !missile.done);
  for (const blast of g.blasts) {
    if (blast.grow) {
      blast.r += 180 * dt;
      if (blast.r >= blast.max) blast.grow = false;
    } else {
      blast.r -= 110 * dt;
    }
  }
  g.blasts = g.blasts.filter((blast) => blast.r > 4);
  const survivors = [];
  for (const missile of g.enemies) {
    const hit = g.blasts.some((blast) => dist2(missile.x, missile.y, blast.x, blast.y) <= blast.r * blast.r);
    if (hit) addScore(state, 80 + state.level * 8);
    else survivors.push(missile);
  }
  g.enemies = survivors;
  if (g.cities.every((city) => !city.alive)) {
    state.phase = "gameover";
    state.message = state.locale === "es" ? "Todas las ciudades cayeron" : "All cities destroyed";
    return;
  }
  if (g.spawned >= g.quota && g.enemies.length === 0) levelUp(state, "Oleada detenida", "Wave stopped", 720 + state.level * 90);
}

function updateLander(state, input, dt) {
  const g = state.game;
  const ship = g.ship;
  if (input.down("ArrowLeft") || input.down("KeyA")) ship.a -= 2.4 * dt;
  if (input.down("ArrowRight") || input.down("KeyD")) ship.a += 2.4 * dt;
  const thrusting = (input.down("ArrowUp") || input.down("KeyW")) && ship.fuel > 0;
  ship.thrust = thrusting;
  if (thrusting) {
    const thrust = 210 + state.level * 10;
    ship.vx += Math.cos(ship.a) * thrust * dt;
    ship.vy += Math.sin(ship.a) * thrust * dt;
    ship.fuel = Math.max(0, ship.fuel - dt * 23);
  }
  ship.vy += g.gravity * dt;
  ship.vx *= 0.996;
  ship.vy *= 0.998;
  const proposedX = ship.x + ship.vx * dt;
  if (proposedX <= 14 || proposedX >= WIDTH - 14) ship.vx = 0;
  ship.x = clamp(proposedX, 14, WIDTH - 14);
  ship.y += ship.vy * dt;
  if (ship.y < BODY_TOP + 16) {
    ship.y = BODY_TOP + 16;
    ship.vy = Math.max(0, ship.vy);
  }
  const padHalf = g.pad.w * 0.5;
  const onPad = ship.x >= g.pad.x - padHalf && ship.x <= g.pad.x + padHalf;
  const padTop = g.pad.y;
  const terrainTop = onPad ? padTop : ridgeYAt(g.ridge, ship.x);
  if (ship.y + 10 >= terrainTop) {
    const angle = Math.abs(Math.atan2(Math.sin(ship.a + Math.PI * 0.5), Math.cos(ship.a + Math.PI * 0.5)));
    if (onPad && Math.abs(ship.vx) <= g.safeVx && Math.abs(ship.vy) <= g.safeVy && angle <= g.safeAngle) {
      ship.y = padTop - 10;
      ship.vx = 0;
      ship.vy = 0;
      ship.thrust = false;
      addScore(state, Math.round(320 + ship.fuel * 4));
      levelUp(state, "Aterrizaje limpio", "Clean landing", 520 + state.level * 65);
      return;
    }
    loseLife(state, "Aterrizaje fallido", "Crash landing");
    return;
  }
  const fuelInfo = Math.round(ship.fuel);
  state.message = state.locale === "es"
    ? `Fuel ${fuelInfo}% · VX ${Math.round(ship.vx)} · VY ${Math.round(ship.vy)}`
    : `Fuel ${fuelInfo}% · VX ${Math.round(ship.vx)} · VY ${Math.round(ship.vy)}`;
}

function updateLanderImproved(state, input, dt) {
  const g = state.game;
  const ship = g.ship;
  const turn = (input.down("ArrowRight") || input.down("KeyD") ? 1 : 0)
    - (input.down("ArrowLeft") || input.down("KeyA") ? 1 : 0);
  ship.av += turn * g.rotationAccel * dt;
  ship.av *= Math.pow(g.angularDamping, dt * 60);
  ship.av = clamp(ship.av, -2.8, 2.8);
  ship.a += ship.av * dt;

  const thrusting = (input.down("ArrowUp") || input.down("KeyW") || input.down("Space")) && ship.fuel > 0;
  ship.thrust = thrusting;
  if (thrusting) {
    ship.vx += Math.cos(ship.a) * g.thrustAccel * dt;
    ship.vy += Math.sin(ship.a) * g.thrustAccel * dt;
    ship.fuel = Math.max(0, ship.fuel - dt * g.fuelBurn);
  }
  ship.vy += g.gravity * dt;
  ship.vx = clamp(ship.vx, -260, 260);
  ship.vy = clamp(ship.vy, -240, 290);

  const proposedX = ship.x + ship.vx * dt;
  if (proposedX <= 18 || proposedX >= WIDTH - 18) {
    ship.vx *= -0.18;
    ship.av *= 0.45;
  }
  ship.x = clamp(proposedX, 18, WIDTH - 18);
  ship.y += ship.vy * dt;
  if (ship.y < BODY_TOP + 20) {
    ship.y = BODY_TOP + 20;
    ship.vy = Math.max(0, ship.vy);
  }

  const padHalf = g.pad.w * 0.5;
  const padLeft = g.pad.x - padHalf + 2;
  const padRight = g.pad.x + padHalf - 2;
  const points = getLanderContactPoints(ship);
  const contactEntries = Object.entries(points).map(([name, point]) => ({
    name,
    point,
    terrainY: terrainYAtLander(g, point.x),
  }));
  const firstContact = contactEntries.find(({ point, terrainY }) => point.y >= terrainY);

  if (firstContact) {
    const angle = Math.abs(angNorm(ship.a + Math.PI * 0.5));
    const feetOnPad = points.leftFoot.x >= padLeft
      && points.leftFoot.x <= padRight
      && points.rightFoot.x >= padLeft
      && points.rightFoot.x <= padRight
      && points.leftFoot.y >= g.pad.y - 14
      && points.rightFoot.y >= g.pad.y - 14
      && points.leftFoot.y <= g.pad.y + 18
      && points.rightFoot.y <= g.pad.y + 18;
    const upright = angle <= g.safeAngle && Math.abs(ship.av) < 0.72;
    const soft = Math.abs(ship.vx) <= g.safeVx && ship.vy >= -8 && ship.vy <= g.safeVy;

    if (feetOnPad && soft && upright) {
      ship.y += g.pad.y - Math.max(points.leftFoot.y, points.rightFoot.y);
      ship.vx = 0;
      ship.vy = 0;
      ship.av = 0;
      ship.thrust = false;
      ship.landed = true;
      addScore(state, Math.round(320 + ship.fuel * 4));
      levelUp(state, "Aterrizaje limpio", "Clean landing", 520 + state.level * 65);
      return;
    }

    const reason = !feetOnPad
      ? ["Fuera de plataforma", "Off landing pad"]
      : !upright
        ? ["Angulo inestable", "Unstable attitude"]
        : ["Velocidad excesiva", "Excessive velocity"];
    loseLife(state, reason[0], reason[1]);
    return;
  }

  const footAltitude = Math.max(0, Math.round(Math.min(
    terrainYAtLander(g, points.leftFoot.x) - points.leftFoot.y,
    terrainYAtLander(g, points.rightFoot.x) - points.rightFoot.y
  )));
  const fuelInfo = Math.round(ship.fuel);
  state.message = state.locale === "es"
    ? `Fuel ${fuelInfo}% - ALT ${footAltitude} - VX ${Math.round(ship.vx)} - VY ${Math.round(ship.vy)}`
    : `Fuel ${fuelInfo}% - ALT ${footAltitude} - VX ${Math.round(ship.vx)} - VY ${Math.round(ship.vy)}`;
}

function updateCentipede(state, input, dt) {
  const g = state.game;
  const player = g.player;
  player.moveCd = Math.max(0, player.moveCd - dt);
  if (player.moveCd <= 0) {
    let nx = player.x;
    let ny = player.y;
    if (input.pressed("ArrowLeft") || input.pressed("KeyA")) nx -= 1;
    else if (input.pressed("ArrowRight") || input.pressed("KeyD")) nx += 1;
    else if (input.pressed("ArrowUp") || input.pressed("KeyW")) ny -= 1;
    else if (input.pressed("ArrowDown") || input.pressed("KeyS")) ny += 1;
    nx = clamp(nx, 0, g.cols - 1);
    ny = clamp(ny, g.rows - 6, g.rows - 1);
    if (nx !== player.x || ny !== player.y) {
      player.x = nx;
      player.y = ny;
      player.moveCd = 0.06;
    }
  }
  player.shotCd = Math.max(0, player.shotCd - dt);
  if ((input.pressed("Space") || input.pressed("Enter")) && player.shotCd <= 0) {
    g.bullets.push({ x: player.x + 0.5, y: player.y - 0.25, vy: -22 });
    player.shotCd = 0.14;
  }
  for (const bullet of g.bullets) bullet.y += bullet.vy * dt;
  g.bullets = g.bullets.filter((bullet) => bullet.y > -2);

  g.stepAcc += dt;
  while (g.stepAcc >= g.stepDelay) {
    g.stepAcc -= g.stepDelay;
    if (g.segments.length === 0) break;
    const previous = g.segments.map((segment) => ({ ...segment }));
    const head = previous[0];
    let nx = head.x + g.dir;
    let ny = head.y;
    if (nx < 0 || nx >= g.cols || g.mushrooms.has(cellKey(nx, ny))) {
      g.dir *= -1;
      nx = clamp(head.x + g.dir, 0, g.cols - 1);
      ny += 1;
    }
    g.segments[0] = { x: nx, y: ny };
    for (let index = 1; index < g.segments.length; index += 1) {
      g.segments[index] = previous[index - 1];
    }
    if (g.segments[0].y >= g.rows - 1) {
      loseLife(state, "Centipede invadio la base", "Centipede breached the base");
      return;
    }
  }

  g.flea.cd -= dt;
  if (!g.flea.active && g.flea.cd <= 0) {
    g.flea.active = true;
    g.flea.x = randInt(g.rng, 0, g.cols);
    g.flea.y = -1;
    g.flea.vy = 7 + state.level * 0.45;
    g.flea.cd = Math.max(1.1, 2.8 - state.level * 0.08);
  }
  if (g.flea.active) {
    g.flea.y += g.flea.vy * dt;
    if (g.flea.y > g.rows + 1) g.flea.active = false;
  }

  const nextBullets = [];
  for (const bullet of g.bullets) {
    let consumed = false;
    for (let index = g.segments.length - 1; index >= 0; index -= 1) {
      const segment = g.segments[index];
      if (Math.abs(segment.x + 0.5 - bullet.x) < 0.5 && Math.abs(segment.y + 0.5 - bullet.y) < 0.62) {
        g.mushrooms.add(cellKey(segment.x, segment.y));
        g.segments.splice(index, 1);
        addScore(state, 85 + state.level * 8);
        consumed = true;
        break;
      }
    }
    if (!consumed && g.flea.active && Math.abs(g.flea.x + 0.5 - bullet.x) < 0.55 && Math.abs(g.flea.y + 0.5 - bullet.y) < 0.72) {
      g.flea.active = false;
      const y = clamp(Math.round(g.flea.y), 2, g.rows - 4);
      g.mushrooms.add(cellKey(g.flea.x, y));
      addScore(state, 130 + state.level * 10);
      consumed = true;
    }
    if (!consumed) nextBullets.push(bullet);
  }
  g.bullets = nextBullets;

  if (g.segments.some((segment) => segment.x === player.x && segment.y === player.y)) {
    loseLife(state, "Colision con centipede", "Centipede collision");
    return;
  }
  if (g.flea.active && Math.round(g.flea.x) === player.x && Math.round(g.flea.y) === player.y) {
    loseLife(state, "Contacto con flea", "Flea collision");
    return;
  }
  if (g.segments.length === 0) {
    levelUp(state, "Oleada centipede neutralizada", "Centipede wave neutralized", 760 + state.level * 85);
    return;
  }
  state.message = state.locale === "es"
    ? `Segmentos ${g.segments.length} · Hongos ${g.mushrooms.size}`
    : `Segments ${g.segments.length} · Mushrooms ${g.mushrooms.size}`;
}

function updateRiverRaid(state, input, dt) {
  const g = state.game;
  const throttle = input.down("ArrowUp") || input.down("KeyW")
    ? 1.24
    : (input.down("ArrowDown") || input.down("KeyS") ? 0.72 : 1);
  const runSpeed = g.baseSpeed * throttle;
  if (input.down("ArrowLeft") || input.down("KeyA")) g.playerX -= 320 * dt;
  if (input.down("ArrowRight") || input.down("KeyD")) g.playerX += 320 * dt;
  g.playerX = clamp(g.playerX, 24, WIDTH - 24);

  g.shotCd = Math.max(0, g.shotCd - dt);
  if ((input.pressed("Space") || input.pressed("Enter")) && g.shotCd <= 0) {
    g.bullets.push({ x: g.playerX, y: g.playerY - 24, vy: -540 });
    g.shotCd = 0.13;
  }
  for (const bullet of g.bullets) bullet.y += bullet.vy * dt;
  g.bullets = g.bullets.filter((bullet) => bullet.y > -40 && !bullet.dead);

  g.spawnCd -= dt;
  if (g.spawnCd <= 0) {
    const future = riverBounds(g.distance + 520, state.level);
    const roll = g.rng();
    const type = roll < 0.22 ? "fuel" : roll < 0.66 ? "drone" : "frigate";
    const w = type === "fuel" ? 34 : type === "frigate" ? 74 : 48;
    const h = type === "fuel" ? 34 : type === "frigate" ? 38 : 26;
    const minX = future.left + 24;
    const maxX = future.right - w - 24;
    const x = minX >= maxX ? minX : minX + g.rng() * (maxX - minX);
    g.obstacles.push({
      x,
      y: -90,
      w,
      h,
      type,
      hp: type === "frigate" ? 2 : 1,
      vy: 96 + g.rng() * 120 + state.level * 8,
    });
    g.spawnCd = Math.max(0.16, 0.42 - state.level * 0.012);
  }

  const activeObstacles = [];
  for (const obstacle of g.obstacles) {
    obstacle.y += (runSpeed * 0.56 + obstacle.vy) * dt;
    if (obstacle.y > HEIGHT + 90) {
      if (obstacle.type !== "fuel") addScore(state, 12);
      continue;
    }
    for (const bullet of g.bullets) {
      if (bullet.dead || obstacle.type === "fuel") continue;
      if (rectOverlap(bullet.x - 2, bullet.y - 8, 4, 14, obstacle.x, obstacle.y, obstacle.w, obstacle.h)) {
        bullet.dead = true;
        obstacle.hp -= 1;
        if (obstacle.hp <= 0) addScore(state, obstacle.type === "frigate" ? 130 : 85);
      }
    }
    if (obstacle.hp > 0) activeObstacles.push(obstacle);
  }
  g.obstacles = activeObstacles;
  g.bullets = g.bullets.filter((bullet) => !bullet.dead && bullet.y > -40);

  const playerW = 32;
  const playerH = 42;
  const px = g.playerX - playerW * 0.5;
  const py = g.playerY - playerH * 0.5;
  const bounds = riverBounds(g.distance, state.level);
  if (px < bounds.left + 6 || px + playerW > bounds.right - 6) {
    loseLife(state, "Impacto contra barranco", "Canyon wall impact");
    return;
  }
  for (const obstacle of g.obstacles) {
    if (!rectOverlap(px, py, playerW, playerH, obstacle.x, obstacle.y, obstacle.w, obstacle.h)) continue;
    if (obstacle.type === "fuel") {
      g.fuel = clamp(g.fuel + 34, 0, 100);
      obstacle.collected = true;
      addScore(state, 90);
    } else {
      loseLife(state, "Colision con objetivo", "Target collision");
      return;
    }
  }
  g.obstacles = g.obstacles.filter((obstacle) => !obstacle.collected);

  g.distance += runSpeed * dt;
  g.fuel -= dt * (3.4 + state.level * 0.22) * throttle;
  if (g.fuel <= 0) {
    loseLife(state, "Sin combustible", "Out of fuel");
    return;
  }
  if (g.distance >= g.targetDistance) {
    levelUp(state, "Canon superado", "Canyon sector cleared", 840 + state.level * 90);
    return;
  }
  state.message = state.locale === "es"
    ? `Fuel ${Math.round(g.fuel)}% · Dist ${Math.round(g.distance)}/${g.targetDistance}`
    : `Fuel ${Math.round(g.fuel)}% · Dist ${Math.round(g.distance)}/${g.targetDistance}`;
}

function tronInBounds(g, x, y) {
  return x >= 0 && y >= 0 && x < g.cols && y < g.rows;
}

function tronSafe(g, x, y) {
  return tronInBounds(g, x, y) && !g.trails.has(cellKey(x, y));
}

function isReverseDirection(current, next) {
  return current.x + next.x === 0 && current.y + next.y === 0;
}

function updateTron(state, input, dt) {
  const g = state.game;
  const player = g.player;
  const ai = g.ai;
  const dirs = [
    { code: ["ArrowLeft", "KeyA"], dir: { x: -1, y: 0 } },
    { code: ["ArrowRight", "KeyD"], dir: { x: 1, y: 0 } },
    { code: ["ArrowUp", "KeyW"], dir: { x: 0, y: -1 } },
    { code: ["ArrowDown", "KeyS"], dir: { x: 0, y: 1 } },
  ];
  for (const entry of dirs) {
    if (entry.code.some((code) => input.pressed(code)) && !isReverseDirection(player.dir, entry.dir)) {
      player.next = entry.dir;
      break;
    }
  }

  ai.think -= dt;
  if (ai.think <= 0) {
    const left = { x: -ai.dir.y, y: ai.dir.x };
    const right = { x: ai.dir.y, y: -ai.dir.x };
    const candidates = [ai.dir, left, right].filter((dir) => {
      if (isReverseDirection(ai.dir, dir)) return false;
      return tronSafe(g, ai.x + dir.x, ai.y + dir.y);
    });
    ai.next = candidates.length > 0 ? candidates[randInt(g.rng, 0, candidates.length)] : ai.dir;
    ai.think = 0.08 + g.rng() * 0.16;
  }

  g.roundMs += dt * 1000;
  if (g.roundMs >= g.limitMs) {
    loseLife(state, "Tiempo agotado en duelo", "Duel timeout");
    return;
  }

  g.stepAcc += dt;
  while (g.stepAcc >= g.stepDelay) {
    g.stepAcc -= g.stepDelay;
    player.dir = player.next;
    ai.dir = ai.next;
    const pNext = { x: player.x + player.dir.x, y: player.y + player.dir.y };
    const aNext = { x: ai.x + ai.dir.x, y: ai.y + ai.dir.y };
    const headOn = pNext.x === aNext.x && pNext.y === aNext.y;
    const swap = pNext.x === ai.x && pNext.y === ai.y && aNext.x === player.x && aNext.y === player.y;
    const playerCrash = headOn || swap || !tronSafe(g, pNext.x, pNext.y);
    const aiCrash = headOn || swap || !tronSafe(g, aNext.x, aNext.y);
    if (playerCrash && aiCrash) {
      loseLife(state, "Choque simultaneo", "Simultaneous crash");
      return;
    }
    if (playerCrash) {
      loseLife(state, "Tu ciclo impacto", "Your cycle crashed");
      return;
    }
    if (aiCrash) {
      addScore(state, 220 + state.level * 30);
      levelUp(state, "Duelo ganado", "Duel won", 640 + state.level * 70);
      return;
    }
    player.x = pNext.x;
    player.y = pNext.y;
    ai.x = aNext.x;
    ai.y = aNext.y;
    g.trails.add(cellKey(player.x, player.y));
    g.trails.add(cellKey(ai.x, ai.y));
  }
  state.message = state.locale === "es"
    ? `Trails ${g.trails.size} · Tiempo ${Math.max(0, Math.round((g.limitMs - g.roundMs) / 1000))}s`
    : `Trails ${g.trails.size} · Time ${Math.max(0, Math.round((g.limitMs - g.roundMs) / 1000))}s`;
}

function roadLaneCenter(lanes, lane) {
  const roadWidth = 360;
  const left = (WIDTH - roadWidth) * 0.5;
  const laneWidth = roadWidth / lanes;
  return left + laneWidth * (lane + 0.5);
}

function updateRoadFighter(state, input, dt) {
  const g = state.game;
  g.laneCd = Math.max(0, g.laneCd - dt);
  if (g.laneCd <= 0) {
    if (input.pressed("ArrowLeft") || input.pressed("KeyA")) {
      g.playerLane = clamp(g.playerLane - 1, 0, g.lanes - 1);
      g.laneCd = 0.09;
    } else if (input.pressed("ArrowRight") || input.pressed("KeyD")) {
      g.playerLane = clamp(g.playerLane + 1, 0, g.lanes - 1);
      g.laneCd = 0.09;
    }
  }
  const throttle = input.down("ArrowUp") || input.down("KeyW")
    ? 1.2
    : (input.down("ArrowDown") || input.down("KeyS") ? 0.74 : 1);
  const runSpeed = g.baseSpeed * throttle;

  g.spawnCd -= dt;
  if (g.spawnCd <= 0) {
    const lane = randInt(g.rng, 0, g.lanes);
    const heavy = g.rng() < 0.26;
    g.cars.push({
      lane,
      y: -140,
      w: heavy ? 56 : 44,
      h: heavy ? 108 : 82,
      speed: 120 + g.rng() * 170 + state.level * 10,
      color: heavy ? "#ef4444" : g.rng() < 0.5 ? "#facc15" : "#38bdf8",
    });
    g.spawnCd = Math.max(0.16, 0.45 - state.level * 0.012);
  }

  const survivors = [];
  for (const car of g.cars) {
    car.y += (runSpeed * 0.55 + car.speed) * dt;
    if (car.y > HEIGHT + 150) {
      addScore(state, 18);
      continue;
    }
    survivors.push(car);
  }
  g.cars = survivors;

  const playerW = 46;
  const playerH = 78;
  const playerX = roadLaneCenter(g.lanes, g.playerLane) - playerW * 0.5;
  const playerY = g.playerY - playerH * 0.5;
  for (const car of g.cars) {
    const carX = roadLaneCenter(g.lanes, car.lane) - car.w * 0.5;
    if (rectOverlap(playerX, playerY, playerW, playerH, carX, car.y, car.w, car.h)) {
      loseLife(state, "Impacto de trafico", "Traffic collision");
      return;
    }
  }

  g.distance += runSpeed * dt;
  if (g.distance >= g.targetDistance) {
    levelUp(state, "Tramo superado", "Road segment cleared", 760 + state.level * 80);
    return;
  }
  state.message = state.locale === "es"
    ? `Dist ${Math.round(g.distance)}/${g.targetDistance} · Carril ${g.playerLane + 1}`
    : `Dist ${Math.round(g.distance)}/${g.targetDistance} · Lane ${g.playerLane + 1}`;
}

function bomberBlocked(g, x, y) {
  if (x < 0 || y < 0 || x >= g.cols || y >= g.rows) return true;
  if (g.map[y][x] === 1 || g.map[y][x] === 2) return true;
  return g.bombs.some((bomb) => bomb.x === x && bomb.y === y && !bomb.exploded);
}

function updateBomber(state, input, dt) {
  const g = state.game;
  const player = g.player;
  g.roundMs += dt * 1000;
  if (g.roundMs >= g.limitMs) {
    loseLife(state, "Tiempo agotado en laberinto", "Maze timeout");
    return;
  }
  player.cd = Math.max(0, player.cd - dt);
  let nx = player.x;
  let ny = player.y;
  if (player.cd <= 0) {
    if (input.pressed("ArrowLeft") || input.pressed("KeyA")) nx -= 1;
    else if (input.pressed("ArrowRight") || input.pressed("KeyD")) nx += 1;
    else if (input.pressed("ArrowUp") || input.pressed("KeyW")) ny -= 1;
    else if (input.pressed("ArrowDown") || input.pressed("KeyS")) ny += 1;
    if (nx !== player.x || ny !== player.y) {
      if (!bomberBlocked(g, nx, ny)) { player.x = nx; player.y = ny; }
      player.cd = 0.1;
    }
  }
  if ((input.pressed("Space") || input.pressed("Enter")) && g.bombs.length < player.cap) {
    const exists = g.bombs.some((bomb) => bomb.x === player.x && bomb.y === player.y && !bomb.exploded);
    if (!exists) g.bombs.push({ x: player.x, y: player.y, ttl: 2, range: player.range, exploded: false });
  }
  for (const bomb of g.bombs) {
    bomb.ttl -= dt;
    if (!bomb.exploded && bomb.ttl <= 0) {
      bomb.exploded = true;
      const cells = [{ x: bomb.x, y: bomb.y }];
      const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
      for (const dir of dirs) {
        for (let i = 1; i <= bomb.range; i += 1) {
          const x = bomb.x + dir.x * i;
          const y = bomb.y + dir.y * i;
          const tile = g.map[y]?.[x];
          if (tile === 1) break;
          cells.push({ x, y });
          if (tile === 2) {
            g.map[y][x] = 0;
            if (g.rng() < 0.24) g.power.push({ x, y, type: g.rng() < 0.5 ? "range" : "cap" });
            break;
          }
        }
      }
      for (const cell of cells) g.flames.push({ x: cell.x, y: cell.y, ttl: 0.62 });
    }
  }
  g.bombs = g.bombs.filter((bomb) => !bomb.exploded);
  for (const flame of g.flames) flame.ttl -= dt;
  g.flames = g.flames.filter((flame) => flame.ttl > 0);
  for (const enemy of g.enemies) {
    enemy.cd -= dt;
    if (enemy.cd <= 0) {
      enemy.cd = 0.2 + g.rng() * 0.25;
      const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
      const move = dirs[randInt(g.rng, 0, dirs.length)];
      const tx = enemy.x + move.x;
      const ty = enemy.y + move.y;
      if (!bomberBlocked(g, tx, ty)) { enemy.x = tx; enemy.y = ty; }
    }
  }
  if (g.flames.some((flame) => flame.x === player.x && flame.y === player.y)) {
    loseLife(state, "Autoexplosion detectada", "Self explosion");
    return;
  }
  const alive = [];
  for (const enemy of g.enemies) {
    if (g.flames.some((flame) => flame.x === enemy.x && flame.y === enemy.y)) addScore(state, 120 + state.level * 8);
    else alive.push(enemy);
  }
  g.enemies = alive;
  if (g.enemies.some((enemy) => enemy.x === player.x && enemy.y === player.y)) {
    loseLife(state, "Contacto con patrulla", "Enemy contact");
    return;
  }
  g.power = g.power.filter((item) => {
    if (item.x === player.x && item.y === player.y) {
      if (item.type === "range") player.range = clamp(player.range + 1, 2, 5);
      else player.cap = clamp(player.cap + 1, 1, 4);
      addScore(state, 70);
      return false;
    }
    return true;
  });
  if (g.enemies.length === 0) levelUp(state, "Sector de bombas asegurado", "Bomb sector secured", 780 + state.level * 90);
}

function updateGame(state, input, dt) {
  switch (state.variant) {
    case "snake-classic": updateSnake(state, input, dt); break;
    case "breakout-1986": updateBreakout(state, input, dt); break;
    case "space-invaders": updateInvaders(state, input, dt); break;
    case "tetris-blockfall": updateTetris(state, input, dt); break;
    case "frogger-crossing": updateFrogger(state, input, dt); break;
    case "galaga-quantum": updateGalaga(state, input, dt); break;
    case "qbert-prism": updateQbert(state, input, dt); break;
    case "lunar-lander-orbit": updateLanderImproved(state, input, dt); break;
    case "centipede-circuit": updateCentipede(state, input, dt); break;
    case "river-raid-neon": updateRiverRaid(state, input, dt); break;
    case "tron-lightcycles": updateTron(state, input, dt); break;
    case "road-fighter-synth": updateRoadFighter(state, input, dt); break;
    case "bomber-grid": updateBomber(state, input, dt); break;
    default: updateSnake(state, input, dt); break;
  }
}

const VISUAL_THEME = {
  "snake-classic": { accent: "#2dd4bf", accentSoft: "#22d3ee", panel: "#083344" },
  "breakout-1986": { accent: "#f59e0b", accentSoft: "#fb7185", panel: "#451a03" },
  "space-invaders": { accent: "#a3e635", accentSoft: "#38bdf8", panel: "#365314" },
  "tetris-blockfall": { accent: "#34d399", accentSoft: "#a78bfa", panel: "#052e2b" },
  "frogger-crossing": { accent: "#22c55e", accentSoft: "#06b6d4", panel: "#14532d" },
  "bomber-grid": { accent: "#f97316", accentSoft: "#f43f5e", panel: "#431407" },
  "galaga-quantum": { accent: "#fb7185", accentSoft: "#67e8f9", panel: "#3f1023" },
  "qbert-prism": { accent: "#f97316", accentSoft: "#fbbf24", panel: "#431407" },
  "lunar-lander-orbit": { accent: "#a78bfa", accentSoft: "#93c5fd", panel: "#2e1065" },
  "centipede-circuit": { accent: "#84cc16", accentSoft: "#22d3ee", panel: "#1a2e05" },
  "river-raid-neon": { accent: "#06b6d4", accentSoft: "#38bdf8", panel: "#0b2f3a" },
  "tron-lightcycles": { accent: "#0ea5e9", accentSoft: "#67e8f9", panel: "#0b1d3a" },
  "road-fighter-synth": { accent: "#f43f5e", accentSoft: "#f59e0b", panel: "#3f0f1b" },
};

const STATIC_BACKGROUND_VARIANTS = new Set([
  "snake-classic",
  "breakout-1986",
  "space-invaders",
  "tetris-blockfall",
]);

function themeFor(variant) {
  return VISUAL_THEME[variant] ?? VISUAL_THEME["snake-classic"];
}

function drawRoundedRect(ctx, x, y, w, h, radius) {
  const r = Math.max(2, Math.min(radius, w * 0.5, h * 0.5));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawGlow(ctx, x, y, radius, color, alpha = 0.36) {
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, `rgba(255,255,255,${alpha})`);
  glow.addColorStop(0.24, color);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawBackground(ctx, state) {
  const theme = themeFor(state.variant);
  const t = STATIC_BACKGROUND_VARIANTS.has(state.variant) ? 0 : state.elapsedMs * 0.001;
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#020617");
  gradient.addColorStop(0.45, "#0b1324");
  gradient.addColorStop(1, "#111827");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawGlow(ctx, WIDTH * 0.2, 98 + Math.sin(t * 0.8) * 28, 280, theme.accentSoft, 0.24);
  drawGlow(ctx, WIDTH * 0.86, 142 + Math.cos(t * 0.65) * 26, 250, theme.accent, 0.2);

  ctx.save();
  ctx.globalAlpha = 0.22;
  for (let index = 0; index < 48; index += 1) {
    const px = (index * 191 + Math.sin(index * 2.4 + t) * 32 + t * 14) % WIDTH;
    const py = (index * 97 + Math.cos(index * 1.8 + t * 0.6) * 16 + t * 6) % HEIGHT;
    const size = 1 + (index % 3);
    ctx.fillStyle = index % 2 === 0 ? "#e2e8f0" : theme.accent;
    ctx.fillRect(px, py, size, size);
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = theme.accentSoft;
  const shift = (t * 44) % 22;
  for (let y = 88 + shift; y < HEIGHT; y += 22) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  for (let x = (t * 38) % 42; x < WIDTH; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, 78);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  ctx.restore();

  const vignette = ctx.createRadialGradient(WIDTH * 0.5, HEIGHT * 0.48, 120, WIDTH * 0.5, HEIGHT * 0.5, 620);
  vignette.addColorStop(0, "rgba(2,6,23,0)");
  vignette.addColorStop(1, "rgba(2,6,23,0.68)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function headerKpi(state, locale) {
  const g = state.game;
  if (!g) return "";
  switch (state.variant) {
    case "snake-classic":
      return locale === "es" ? `Meta ${g.foods}/${g.targetFoods}` : `Goal ${g.foods}/${g.targetFoods}`;
    case "breakout-1986":
      return locale === "es"
        ? `Bloques ${g.bricks.filter((brick) => brick.hp > 0).length}`
        : `Bricks ${g.bricks.filter((brick) => brick.hp > 0).length}`;
    case "space-invaders":
      return locale === "es" ? `Invasores ${g.enemies.length}` : `Invaders ${g.enemies.length}`;
    case "tetris-blockfall":
      return locale === "es"
        ? `Tablero ${g.placedCells}/${BLOCK_BOARD_SIZE * BLOCK_BOARD_SIZE}`
        : `Board ${g.placedCells}/${BLOCK_BOARD_SIZE * BLOCK_BOARD_SIZE}`;
    case "frogger-crossing":
      return locale === "es" ? `Guaridas ${g.homes.size}/5` : `Homes ${g.homes.size}/5`;
    case "galaga-quantum":
      return locale === "es" ? `Combo x${Math.max(1, g.combo)}` : `Combo x${Math.max(1, g.combo)}`;
    case "qbert-prism": {
      const total = (g.size * (g.size + 1)) / 2;
      const colored = g.tiles.flat().filter((tile) => tile >= g.target).length;
      return locale === "es" ? `Piramide ${colored}/${total}` : `Pyramid ${colored}/${total}`;
    }
    case "lunar-lander-orbit":
      return locale === "es" ? `Fuel ${Math.round(g.ship.fuel)}%` : `Fuel ${Math.round(g.ship.fuel)}%`;
    case "centipede-circuit":
      return locale === "es" ? `Segmentos ${g.segments.length}` : `Segments ${g.segments.length}`;
    case "river-raid-neon":
      return locale === "es" ? `Fuel ${Math.round(g.fuel)}%` : `Fuel ${Math.round(g.fuel)}%`;
    case "tron-lightcycles":
      return locale === "es" ? `Rastro ${g.trails.size}` : `Trails ${g.trails.size}`;
    case "road-fighter-synth":
      return locale === "es" ? `Dist ${Math.round(g.distance)}/${g.targetDistance}` : `Dist ${Math.round(g.distance)}/${g.targetDistance}`;
    case "bomber-grid":
      return locale === "es" ? `Enemigos ${g.enemies.length}` : `Enemies ${g.enemies.length}`;
    default:
      return "";
  }
}

function drawHeader(ctx, state, locale) {
  const ui = UI[locale] ?? UI.en;
  const definition = DEFINITIONS[state.variant];
  const theme = themeFor(state.variant);
  const kpi = headerKpi(state, locale);

  drawRoundedRect(ctx, 16, 12, WIDTH - 32, 50, 12);
  ctx.fillStyle = "rgba(2, 6, 23, 0.78)";
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.28)";
  ctx.lineWidth = 1;
  ctx.stroke();

  drawRoundedRect(ctx, 22, 18, 6, 38, 3);
  ctx.fillStyle = theme.accent;
  ctx.fill();

  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 16px 'Bricolage Grotesque', sans-serif";
  ctx.fillText(text(locale, definition.title), 40, 33);

  ctx.fillStyle = "#f8fafc";
  ctx.textAlign = "right";
  ctx.font = "600 12px 'JetBrains Mono', monospace";
  const compact = `${ui.score} ${state.score} | ${ui.best} ${state.best} | ${ui.level} ${state.level} | ${ui.lives} ${state.lives}`;
  ctx.fillText(compact, WIDTH - 28, 31);
  if (kpi) ctx.fillText(kpi, WIDTH - 28, 47);
  ctx.textAlign = "left";
}
function drawSnake(ctx, state) {
  const g = state.game;
  const x0 = 150;
  const y0 = 106;
  const cell = 21;
  const boardW = g.cols * cell;
  const boardH = g.rows * cell;
  const pulse = 0.5 + 0.5 * Math.sin(state.elapsedMs * 0.01);

  drawRoundedRect(ctx, x0 - 14, y0 - 14, boardW + 28, boardH + 28, 20);
  ctx.fillStyle = "rgba(2, 6, 23, 0.84)";
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
  ctx.stroke();

  const field = ctx.createLinearGradient(x0, y0, x0, y0 + boardH);
  field.addColorStop(0, "#052a34");
  field.addColorStop(1, "#0f172a");
  ctx.fillStyle = field;
  ctx.fillRect(x0, y0, boardW, boardH);

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "#38bdf8";
  for (let row = 0; row <= g.rows; row += 1) {
    const y = y0 + row * cell + 0.5;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + boardW, y);
    ctx.stroke();
  }
  for (let col = 0; col <= g.cols; col += 1) {
    const x = x0 + col * cell + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y0 + boardH);
    ctx.stroke();
  }
  ctx.restore();

  const foodX = x0 + g.food.x * cell + cell * 0.5;
  const foodY = y0 + g.food.y * cell + cell * 0.5;
  drawGlow(ctx, foodX, foodY, 28 + pulse * 8, "#fb7185", 0.42);
  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  ctx.arc(foodX, foodY, 6 + pulse * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(251, 146, 60, 0.58)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(foodX, foodY, 10 + pulse * 4, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < g.snake.length; i += 1) {
    const segment = g.snake[i];
    const sx = x0 + segment.x * cell + 2;
    const sy = y0 + segment.y * cell + 2;
    const tint = i === 0 ? "#2dd4bf" : "#67e8f9";
    const body = ctx.createLinearGradient(sx, sy, sx + cell, sy + cell);
    body.addColorStop(0, tint);
    body.addColorStop(1, i === 0 ? "#0ea5e9" : "#0891b2");
    drawRoundedRect(ctx, sx, sy, cell - 4, cell - 4, 5);
    ctx.fillStyle = body;
    ctx.fill();
    if (i === 0) {
      const eyeDX = g.dir.x === 0 ? 5 : g.dir.x > 0 ? 8 : 3;
      const eyeDY = g.dir.y === 0 ? 5 : g.dir.y > 0 ? 8 : 3;
      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.arc(sx + eyeDX, sy + eyeDY, 1.8, 0, Math.PI * 2);
      ctx.arc(sx + cell - 6 - (g.dir.x < 0 ? 5 : 0), sy + cell - 6 - (g.dir.y < 0 ? 5 : 0), 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPong(ctx, state) {
  const g = state.game;
  ctx.setLineDash([8, 10]);
  ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
  ctx.beginPath();
  ctx.moveTo(WIDTH * 0.5, 98);
  ctx.lineTo(WIDTH * 0.5, HEIGHT - 30);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#67e8f9";
  ctx.fillRect(28, g.playerY, 14, g.paddleH);
  ctx.fillStyle = "#fda4af";
  ctx.fillRect(WIDTH - 42, g.aiY, 14, g.paddleH);
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.arc(g.ball.x, g.ball.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "700 42px 'JetBrains Mono', monospace";
  ctx.fillText(String(g.scoreA), WIDTH * 0.5 - 90, 145);
  ctx.fillText(String(g.scoreB), WIDTH * 0.5 + 60, 145);
}

function drawBreakout(ctx, state) {
  const g = state.game;
  const playX = 82;
  const playY = 88;
  const playW = WIDTH - 164;
  const playH = HEIGHT - 132;
  drawRoundedRect(ctx, playX, playY, playW, playH, 18);
  const bg = ctx.createLinearGradient(playX, playY, playX, playY + playH);
  bg.addColorStop(0, "#1a0f24");
  bg.addColorStop(1, "#0f172a");
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = "rgba(248, 250, 252, 0.2)";
  ctx.stroke();

  const paddleY = HEIGHT - 64;
  drawGlow(ctx, g.paddleX + g.paddleW * 0.5, paddleY + 8, 58, "#f59e0b", 0.34);
  const paddleGrad = ctx.createLinearGradient(g.paddleX, paddleY, g.paddleX, paddleY + 16);
  paddleGrad.addColorStop(0, "#fde68a");
  paddleGrad.addColorStop(1, "#f59e0b");
  drawRoundedRect(ctx, g.paddleX, paddleY, g.paddleW, 16, 6);
  ctx.fillStyle = paddleGrad;
  ctx.fill();

  const trailX = g.ball.x - g.ball.vx * 0.018;
  const trailY = g.ball.y - g.ball.vy * 0.018;
  ctx.strokeStyle = "rgba(251, 191, 36, 0.32)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(g.ball.x, g.ball.y);
  ctx.lineTo(trailX, trailY);
  ctx.stroke();
  drawGlow(ctx, g.ball.x, g.ball.y, 24, "#fde68a", 0.44);
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.arc(g.ball.x, g.ball.y, g.ball.r, 0, Math.PI * 2);
  ctx.fill();

  for (const brick of g.bricks) {
    if (brick.hp <= 0) continue;
    const hue = brick.boost ? 318 : brick.hp === 2 ? 140 : 36;
    const brickGrad = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.h);
    brickGrad.addColorStop(0, `hsl(${hue} 94% 72%)`);
    brickGrad.addColorStop(1, `hsl(${hue} 78% 48%)`);
    drawRoundedRect(ctx, brick.x, brick.y, brick.w, brick.h, 5);
    ctx.fillStyle = brickGrad;
    ctx.fill();
    if (brick.hp > 1) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.26)";
      ctx.fillRect(brick.x + 5, brick.y + brick.h * 0.5, brick.w - 10, 3);
    }
    ctx.strokeStyle = "rgba(15, 23, 42, 0.5)";
    ctx.stroke();
  }
}

function drawInvaders(ctx, state) {
  const g = state.game;
  const floorY = HEIGHT - 72;
  const floorGrad = ctx.createLinearGradient(0, floorY - 10, 0, HEIGHT);
  floorGrad.addColorStop(0, "rgba(15, 23, 42, 0.2)");
  floorGrad.addColorStop(1, "rgba(2, 6, 23, 0.9)");
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, floorY, WIDTH, HEIGHT - floorY);

  drawGlow(ctx, g.playerX, HEIGHT - 58, 52, "#38bdf8", 0.26);
  const hull = ctx.createLinearGradient(g.playerX - 22, HEIGHT - 86, g.playerX + 22, HEIGHT - 42);
  hull.addColorStop(0, "#22d3ee");
  hull.addColorStop(1, "#0ea5e9");
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(g.playerX, HEIGHT - 88);
  ctx.lineTo(g.playerX - 24, HEIGHT - 52);
  ctx.lineTo(g.playerX - 8, HEIGHT - 44);
  ctx.lineTo(g.playerX + 8, HEIGHT - 44);
  ctx.lineTo(g.playerX + 24, HEIGHT - 52);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(14, 165, 233, 0.62)";
  ctx.fillRect(g.playerX - 4, HEIGHT - 44, 8, 9);

  for (const enemy of g.enemies) {
    drawGlow(ctx, enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.5, 22, "#a3e635", 0.16);
    const shell = ctx.createLinearGradient(enemy.x, enemy.y, enemy.x, enemy.y + enemy.h);
    shell.addColorStop(0, "#d9f99d");
    shell.addColorStop(1, "#65a30d");
    drawRoundedRect(ctx, enemy.x, enemy.y, enemy.w, enemy.h, 6);
    ctx.fillStyle = shell;
    ctx.fill();
    ctx.fillStyle = "#14532d";
    ctx.fillRect(enemy.x + 8, enemy.y + 8, 5, 4);
    ctx.fillRect(enemy.x + enemy.w - 13, enemy.y + 8, 5, 4);
    ctx.fillRect(enemy.x + 7, enemy.y + enemy.h - 6, enemy.w - 14, 3);
  }
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 2.3;
  for (const bullet of g.bullets) {
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y - 10);
    ctx.lineTo(bullet.x, bullet.y + 8);
    ctx.stroke();
  }
  ctx.strokeStyle = "#fb7185";
  ctx.lineWidth = 2;
  for (const bullet of g.enemyBullets) {
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y - 7);
    ctx.lineTo(bullet.x, bullet.y + 9);
    ctx.stroke();
  }
}

function drawAsteroids(ctx, state) {
  const g = state.game;
  const ship = g.ship;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.a + Math.PI * 0.5);
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(-10, 10);
  ctx.lineTo(0, 6);
  ctx.lineTo(10, 10);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  for (const rock of g.rocks) {
    ctx.strokeStyle = "#fcd34d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#38bdf8";
  for (const bullet of g.bullets) ctx.fillRect(bullet.x - 2, bullet.y - 2, 4, 4);
}

function drawTetris(ctx, state) {
  const g = state.game;
  const cell = 25;
  const boardSize = BLOCK_BOARD_SIZE * cell;
  const x0 = 70;
  const y0 = 88;

  drawRoundedRect(ctx, x0 - 18, y0 - 18, boardSize + 36, boardSize + 36, 18);
  ctx.fillStyle = "rgba(2, 6, 23, 0.84)";
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
  ctx.stroke();

  const boardBg = ctx.createLinearGradient(x0, y0, x0, y0 + boardSize);
  boardBg.addColorStop(0, "#051f2d");
  boardBg.addColorStop(1, "#0f172a");
  ctx.fillStyle = boardBg;
  ctx.fillRect(x0, y0, boardSize, boardSize);

  for (let row = 0; row < BLOCK_BOARD_SIZE; row += 1) {
    for (let col = 0; col < BLOCK_BOARD_SIZE; col += 1) {
      const x = x0 + col * cell;
      const y = y0 + row * cell;
      const v = g.board[row][col];
      ctx.fillStyle = v || "rgba(15, 23, 42, 0.7)";
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      if (v) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.fillRect(x + 4, y + 4, cell - 10, 4);
      }
    }
  }

  ctx.strokeStyle = "rgba(56, 189, 248, 0.2)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= BLOCK_BOARD_SIZE; i += 3) {
    ctx.beginPath();
    ctx.moveTo(x0 + i * cell + 0.5, y0);
    ctx.lineTo(x0 + i * cell + 0.5, y0 + boardSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x0, y0 + i * cell + 0.5);
    ctx.lineTo(x0 + boardSize, y0 + i * cell + 0.5);
    ctx.stroke();
  }

  const piece = g.active;
  if (piece) {
    const valid = blockCanPlace(g.board, piece, g.cursor.col, g.cursor.row);
    ctx.save();
    ctx.globalAlpha = g.ready ? (valid ? 0.55 : 0.4) : 0.18;
    for (let r = 0; r < piece.m.length; r += 1) {
      for (let c = 0; c < piece.m[r].length; c += 1) {
        if (!piece.m[r][c]) continue;
        const cx = g.cursor.col + c;
        const cy = g.cursor.row + r;
        if (cx < 0 || cx >= BLOCK_BOARD_SIZE || cy < 0 || cy >= BLOCK_BOARD_SIZE) continue;
        ctx.fillStyle = valid ? piece.c : "#f87171";
        ctx.fillRect(x0 + cx * cell + 2, y0 + cy * cell + 2, cell - 4, cell - 4);
      }
    }
    ctx.restore();
    ctx.strokeStyle = valid ? "#22d3ee" : "#ef4444";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      x0 + g.cursor.col * cell + 1.5,
      y0 + g.cursor.row * cell + 1.5,
      piece.m[0].length * cell - 3,
      piece.m.length * cell - 3
    );
  }

  const trayX = x0 + boardSize + 34;
  const trayY = y0;
  const trayW = WIDTH - trayX - 42;
  const trayH = boardSize;
  drawRoundedRect(ctx, trayX, trayY, trayW, trayH, 14);
  ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.32)";
  ctx.stroke();

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "600 13px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillText(state.locale === "es" ? "Pieza entrante" : "Incoming piece", trayX + 16, trayY + 24);
  ctx.fillStyle = "rgba(148, 163, 184, 0.76)";
  ctx.font = "500 12px 'JetBrains Mono', monospace";
  ctx.fillText(state.locale === "es" ? "Llega desde la derecha" : "Slides in from the right", trayX + 16, trayY + 44);

  drawRoundedRect(ctx, trayX + 16, trayY + 68, trayW - 32, 138, 14);
  ctx.fillStyle = "rgba(2, 6, 23, 0.58)";
  ctx.fill();
  ctx.strokeStyle = g.ready ? "rgba(52, 211, 153, 0.55)" : "rgba(148, 163, 184, 0.28)";
  ctx.stroke();

  if (piece) {
    const cols = piece.m[0].length;
    const rows = piece.m.length;
    const slotCell = 24;
    const pw = cols * slotCell;
    const ph = rows * slotCell;
    const startX = g.incomingX - pw * 0.5;
    const startY = trayY + 137 - ph * 0.5;
    ctx.save();
    ctx.beginPath();
    ctx.rect(trayX + 16, trayY + 68, trayW - 32, 138);
    ctx.clip();
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (!piece.m[r][c]) continue;
        ctx.fillStyle = piece.c;
        ctx.fillRect(startX + c * slotCell + 1, startY + r * slotCell + 1, slotCell - 2, slotCell - 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
        ctx.fillRect(startX + c * slotCell + 4, startY + r * slotCell + 4, slotCell - 8, 3);
      }
    }
    ctx.restore();
  }

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "700 28px 'JetBrains Mono', monospace";
  ctx.fillText(`${g.queue.length}`, trayX + 18, trayY + 260);
  ctx.fillStyle = "rgba(148, 163, 184, 0.82)";
  ctx.font = "600 12px 'JetBrains Mono', monospace";
  ctx.fillText(state.locale === "es" ? "en cola" : "queued", trayX + 72, trayY + 260);
  ctx.fillText(
    state.locale === "es" ? "Espacio coloca - C cambia pieza" : "Space places - C changes piece",
    trayX + 18,
    trayY + 298
  );

  ctx.fillStyle = "#34d399";
  ctx.font = "700 24px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillText(state.locale === "es" ? "Sin limite" : "No time limit", x0, y0 - 18);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "600 14px 'JetBrains Mono', monospace";
  ctx.fillText(
    `${g.placedCells} / ${BLOCK_BOARD_SIZE * BLOCK_BOARD_SIZE}`,
    x0 + 150,
    y0 - 18
  );
  ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
  ctx.font = "500 12px 'JetBrains Mono', monospace";
  ctx.fillText(
    state.locale === "es"
      ? `Piezas ${g.placedPieces}/${g.totalPieces}`
      : `Pieces ${g.placedPieces}/${g.totalPieces}`,
    x0 + 270,
    y0 - 20
  );
}

function drawFrogger(ctx, state) {
  const g = state.game;
  const t = state.elapsedMs * 0.001;
  const bankX = 44;
  const bankW = WIDTH - 88;
  ctx.fillStyle = "#166534";
  ctx.fillRect(bankX, rowY(1), bankW, 34);
  for (const slot of [2, 5, 8, 11, 14]) {
    const sx = frogX(slot) - 18;
    const sy = rowY(1) + 6;
    drawRoundedRect(ctx, sx, sy, 36, 22, 7);
    ctx.fillStyle = g.homes.has(slot) ? "#22c55e" : "rgba(248, 250, 252, 0.22)";
    ctx.fill();
    if (g.homes.has(slot)) drawGlow(ctx, sx + 18, sy + 11, 16, "#22c55e", 0.2);
  }

  for (const lane of g.lanes) {
    const laneY = rowY(lane.row);
    const isRoad = lane.kind === "road";
    const laneGrad = ctx.createLinearGradient(bankX, laneY, bankX, laneY + 34);
    laneGrad.addColorStop(0, isRoad ? "#334155" : "#1d4ed8");
    laneGrad.addColorStop(1, isRoad ? "#1e293b" : "#1e3a8a");
    ctx.fillStyle = laneGrad;
    ctx.fillRect(bankX, laneY, bankW, 34);
    if (!isRoad) {
      ctx.strokeStyle = "rgba(125, 211, 252, 0.3)";
      ctx.lineWidth = 1;
      for (let x = bankX - 30; x < WIDTH; x += 48) {
        const wave = Math.sin(t * 3 + x * 0.05 + lane.row) * 3;
        ctx.beginPath();
        ctx.moveTo(x, laneY + 10 + wave);
        ctx.lineTo(x + 22, laneY + 12 + wave);
        ctx.stroke();
      }
    }
    for (const item of lane.items) {
      if (isRoad) {
        drawRoundedRect(ctx, item.x, laneY + 5, item.w, 24, 8);
        const carGrad = ctx.createLinearGradient(item.x, laneY + 5, item.x, laneY + 29);
        carGrad.addColorStop(0, "#fb923c");
        carGrad.addColorStop(1, "#ea580c");
        ctx.fillStyle = carGrad;
        ctx.fill();
        ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
        ctx.fillRect(item.x + 10, laneY + 11, Math.max(18, item.w - 20), 6);
      } else {
        drawRoundedRect(ctx, item.x, laneY + 4, item.w, 26, 7);
        const logGrad = ctx.createLinearGradient(item.x, laneY + 4, item.x, laneY + 30);
        logGrad.addColorStop(0, "#a16207");
        logGrad.addColorStop(1, "#78350f");
        ctx.fillStyle = logGrad;
        ctx.fill();
        ctx.fillStyle = "rgba(217, 119, 6, 0.42)";
        ctx.fillRect(item.x + 7, laneY + 11, Math.max(8, item.w - 14), 2);
      }
    }
  }

  const frogPx = frogX(g.frog.x);
  const frogPy = rowY(g.frog.y) + 17;
  drawGlow(ctx, frogPx, frogPy, 24, "#84cc16", 0.32);
  ctx.fillStyle = "#84cc16";
  ctx.beginPath();
  ctx.arc(frogPx, frogPy, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.arc(frogPx - 4, frogPy - 3, 1.8, 0, Math.PI * 2);
  ctx.arc(frogPx + 4, frogPy - 3, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

function drawGalaga(ctx, state) {
  const g = state.game;
  ctx.fillStyle = "#60a5fa";
  ctx.beginPath();
  ctx.moveTo(g.playerX, HEIGHT - 84);
  ctx.lineTo(g.playerX - 22, HEIGHT - 44);
  ctx.lineTo(g.playerX + 22, HEIGHT - 44);
  ctx.closePath();
  ctx.fill();
  for (const enemy of g.enemies) {
    ctx.fillStyle = enemy.boss ? "#ef4444" : "#f97316";
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y, enemy.boss ? 24 : 16, enemy.boss ? 18 : 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#f8fafc";
  for (const bullet of g.bullets) ctx.fillRect(bullet.x - 2, bullet.y - 8, 4, 12);
  ctx.fillStyle = "#fb7185";
  for (const bullet of g.enemyBullets) ctx.fillRect(bullet.x - 2, bullet.y - 8, 4, 12);
}

function qbertPos(row, col) {
  return { x: WIDTH * 0.5 + (col - row * 0.5) * 72, y: 144 + row * 40 };
}

function drawQbert(ctx, state) {
  const g = state.game;
  for (let row = 0; row < g.size; row += 1) {
    for (let col = 0; col <= row; col += 1) {
      const p = qbertPos(row, col);
      const ratio = g.tiles[row][col] / Math.max(1, g.target);
      const hue = 45 + ratio * 270;
      ctx.fillStyle = `hsl(${hue} 88% 58%)`;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + 30, p.y + 16);
      ctx.lineTo(p.x, p.y + 32);
      ctx.lineTo(p.x - 30, p.y + 16);
      ctx.closePath();
      ctx.fill();
    }
  }
  const player = qbertPos(g.player.row, g.player.col);
  ctx.fillStyle = "#fb923c";
  ctx.beginPath();
  ctx.arc(player.x, player.y + 11, 12, 0, Math.PI * 2);
  ctx.fill();
  if (g.enemy.active) {
    const enemy = qbertPos(g.enemy.row, g.enemy.col);
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y + 12, 10, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMissile(ctx, state) {
  const g = state.game;
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, HEIGHT - 70, WIDTH, 70);
  for (const city of g.cities) {
    ctx.fillStyle = city.alive ? "#22c55e" : "#4b5563";
    ctx.fillRect(city.x - 22, HEIGHT - 58, 44, 22);
  }
  ctx.strokeStyle = "#60a5fa";
  for (const missile of g.players) {
    ctx.beginPath();
    ctx.moveTo(missile.x, missile.y);
    ctx.lineTo(missile.tx, missile.ty);
    ctx.stroke();
  }
  ctx.strokeStyle = "#fb7185";
  for (const missile of g.enemies) {
    ctx.beginPath();
    ctx.moveTo(missile.x, missile.y);
    ctx.lineTo(missile.tx, HEIGHT - 44);
    ctx.stroke();
  }
  for (const blast of g.blasts) {
    ctx.fillStyle = "rgba(250, 204, 21, 0.35)";
    ctx.beginPath();
    ctx.arc(blast.x, blast.y, blast.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.arc(g.cross.x, g.cross.y, 14, 0, Math.PI * 2);
  ctx.stroke();
}

function drawBomber(ctx, state) {
  const g = state.game;
  const cell = 34;
  const x0 = Math.floor((WIDTH - g.cols * cell) / 2);
  const y0 = 110;
  drawRoundedRect(ctx, x0 - 14, y0 - 14, g.cols * cell + 28, g.rows * cell + 28, 16);
  ctx.fillStyle = "rgba(2, 6, 23, 0.82)";
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.32)";
  ctx.stroke();

  for (let row = 0; row < g.rows; row += 1) {
    for (let col = 0; col < g.cols; col += 1) {
      const tile = g.map[row][col];
      const x = x0 + col * cell;
      const y = y0 + row * cell;
      if (tile === 1) {
        const wall = ctx.createLinearGradient(x, y, x, y + cell);
        wall.addColorStop(0, "#64748b");
        wall.addColorStop(1, "#334155");
        ctx.fillStyle = wall;
      } else if (tile === 2) {
        const crate = ctx.createLinearGradient(x, y, x, y + cell);
        crate.addColorStop(0, "#b45309");
        crate.addColorStop(1, "#7c2d12");
        ctx.fillStyle = crate;
      } else {
        ctx.fillStyle = "#0f172a";
      }
      ctx.fillRect(x, y, cell - 1, cell - 1);
      if (tile === 2) {
        ctx.fillStyle = "rgba(251, 191, 36, 0.24)";
        ctx.fillRect(x + 6, y + 6, cell - 14, 2);
      }
    }
  }
  for (const item of g.power) {
    const px = x0 + item.x * cell + 17;
    const py = y0 + item.y * cell + 17;
    drawGlow(ctx, px, py, 22, item.type === "range" ? "#22d3ee" : "#facc15", 0.2);
    ctx.fillStyle = item.type === "range" ? "#22d3ee" : "#facc15";
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const bomb of g.bombs) {
    const bx = x0 + bomb.x * cell + 17;
    const by = y0 + bomb.y * cell + 17;
    drawGlow(ctx, bx, by, 26, "#f97316", 0.22);
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.arc(bx, by, 10, 0, Math.PI * 2);
    ctx.fill();
    const spark = (state.elapsedMs * 0.018) % (Math.PI * 2);
    ctx.strokeStyle = "#fb7185";
    ctx.beginPath();
    ctx.moveTo(bx, by - 11);
    ctx.lineTo(bx + Math.cos(spark) * 7, by - 17 + Math.sin(spark) * 2);
    ctx.stroke();
  }
  for (const flame of g.flames) {
    const fx = x0 + flame.x * cell + 17;
    const fy = y0 + flame.y * cell + 17;
    drawGlow(ctx, fx, fy, 28, "#fb923c", 0.28);
    const flameGrad = ctx.createRadialGradient(fx, fy, 1, fx, fy, 14);
    flameGrad.addColorStop(0, "rgba(254, 215, 170, 0.95)");
    flameGrad.addColorStop(0.38, "rgba(251, 146, 60, 0.9)");
    flameGrad.addColorStop(1, "rgba(239, 68, 68, 0.18)");
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.arc(fx, fy, 13, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const enemy of g.enemies) {
    const ex = x0 + enemy.x * cell + 7;
    const ey = y0 + enemy.y * cell + 7;
    drawRoundedRect(ctx, ex, ey, 20, 20, 6);
    ctx.fillStyle = "#fb7185";
    ctx.fill();
    ctx.fillStyle = "#7f1d1d";
    ctx.fillRect(ex + 4, ey + 5, 4, 4);
    ctx.fillRect(ex + 12, ey + 5, 4, 4);
  }
  const px = x0 + g.player.x * cell + 7;
  const py = y0 + g.player.y * cell + 7;
  drawGlow(ctx, px + 10, py + 10, 24, "#22c55e", 0.26);
  drawRoundedRect(ctx, px, py, 20, 20, 6);
  ctx.fillStyle = "#4ade80";
  ctx.fill();
  ctx.fillStyle = "#14532d";
  ctx.fillRect(px + 4, py + 4, 12, 3);
}

function drawLander(ctx, state) {
  const g = state.game;
  const ship = g.ship;
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, BODY_TOP, WIDTH, BODY_BOTTOM - BODY_TOP);
  ctx.fillStyle = "rgba(226, 232, 240, 0.7)";
  for (const star of g.stars) {
    if (star.y < BODY_TOP || star.y > BODY_BOTTOM) continue;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(0, BODY_BOTTOM);
  for (const point of g.ridge) ctx.lineTo(point.x, point.y);
  ctx.lineTo(WIDTH, BODY_BOTTOM);
  ctx.closePath();
  ctx.fillStyle = "#334155";
  ctx.fill();

  const padX = g.pad.x - g.pad.w * 0.5;
  drawRoundedRect(ctx, padX, g.pad.y - 6, g.pad.w, 12, 4);
  ctx.fillStyle = "#22c55e";
  ctx.fill();
  ctx.fillStyle = "#bbf7d0";
  ctx.fillRect(padX + 4, g.pad.y - 11, 4, 5);
  ctx.fillRect(padX + g.pad.w - 8, g.pad.y - 11, 4, 5);

  const offHorizontal = ship.x - g.pad.x;
  if (Math.abs(offHorizontal) > 220) {
    const dir = offHorizontal > 0 ? -1 : 1;
    const arrowX = dir > 0 ? WIDTH - 30 : 30;
    const arrowY = clamp(ship.y, BODY_TOP + 20, BODY_BOTTOM - 20);
    ctx.fillStyle = "rgba(34, 197, 94, 0.75)";
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY - 9);
    ctx.lineTo(arrowX + dir * 16, arrowY);
    ctx.lineTo(arrowX, arrowY + 9);
    ctx.closePath();
    ctx.fill();
  }

  if (ship.thrust) {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.a + Math.PI * 0.5);
    const flicker = 5 + Math.random() * 7;
    ctx.beginPath();
    ctx.moveTo(-5, 10);
    ctx.lineTo(5, 10);
    ctx.lineTo(0, 18 + flicker);
    ctx.closePath();
    ctx.fillStyle = "#fb923c";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-3, 10);
    ctx.lineTo(3, 10);
    ctx.lineTo(0, 14 + flicker * 0.55);
    ctx.closePath();
    ctx.fillStyle = "#fde68a";
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.a + Math.PI * 0.5);
  drawGlow(ctx, 0, 0, 24, "#a78bfa", 0.26);
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(9, 10);
  ctx.lineTo(-9, 10);
  ctx.closePath();
  ctx.fillStyle = "#e2e8f0";
  ctx.fill();
  ctx.strokeStyle = "#a78bfa";
  ctx.stroke();
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-7, 9);
  ctx.lineTo(-11, 14);
  ctx.moveTo(7, 9);
  ctx.lineTo(11, 14);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.restore();

  drawLanderHUD(ctx, state);
}

function drawLanderHUD(ctx, state) {
  const g = state.game;
  const ship = g.ship;
  const x0 = 22;
  const y0 = BODY_TOP + 8;
  const w = 184;
  const h = 84;
  drawRoundedRect(ctx, x0, y0, w, h, 9);
  ctx.fillStyle = "rgba(2, 6, 23, 0.82)";
  ctx.fill();
  ctx.strokeStyle = "rgba(167, 139, 250, 0.45)";
  ctx.stroke();

  ctx.font = "600 11px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";

  const fuelPct = Math.max(0, Math.min(1, ship.fuel / 100));
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText("FUEL", x0 + 10, y0 + 17);
  drawRoundedRect(ctx, x0 + 50, y0 + 9, 120, 9, 3);
  ctx.fillStyle = "rgba(148, 163, 184, 0.22)";
  ctx.fill();
  drawRoundedRect(ctx, x0 + 50, y0 + 9, Math.max(0, 120 * fuelPct), 9, 3);
  ctx.fillStyle = fuelPct > 0.5 ? "#22c55e" : fuelPct > 0.2 ? "#fde68a" : "#f87171";
  ctx.fill();

  const vxAbs = Math.abs(ship.vx);
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("VX", x0 + 10, y0 + 36);
  ctx.fillStyle = vxAbs <= g.safeVx ? "#86efac" : "#f87171";
  ctx.textAlign = "right";
  ctx.fillText(`${Math.round(ship.vx)}`, x0 + 80, y0 + 36);

  const vyAbs = Math.abs(ship.vy);
  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "left";
  ctx.fillText("VY", x0 + 100, y0 + 36);
  ctx.fillStyle = vyAbs <= g.safeVy ? "#86efac" : "#f87171";
  ctx.textAlign = "right";
  ctx.fillText(`${Math.round(ship.vy)}`, x0 + 170, y0 + 36);

  const angle = Math.abs(Math.atan2(Math.sin(ship.a + Math.PI * 0.5), Math.cos(ship.a + Math.PI * 0.5)));
  const angleDeg = Math.round((angle * 180) / Math.PI);
  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "left";
  ctx.fillText("ANG", x0 + 10, y0 + 54);
  ctx.fillStyle = angle <= g.safeAngle ? "#86efac" : "#f87171";
  ctx.textAlign = "right";
  ctx.fillText(`${angleDeg}°`, x0 + 80, y0 + 54);

  const points = getLanderContactPoints(ship);
  const alt = Math.max(0, Math.round(Math.min(
    terrainYAtLander(g, points.leftFoot.x) - points.leftFoot.y,
    terrainYAtLander(g, points.rightFoot.x) - points.rightFoot.y
  )));
  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "left";
  ctx.fillText("ALT", x0 + 100, y0 + 54);
  ctx.fillStyle = "#cbd5e1";
  ctx.textAlign = "right";
  ctx.fillText(`${alt}`, x0 + 170, y0 + 54);

  ctx.font = "500 9px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(167, 139, 250, 0.78)";
  ctx.textAlign = "left";
  ctx.fillText(`MAX VX ${g.safeVx} · VY ${g.safeVy} · ANG ${Math.round((g.safeAngle * 180) / Math.PI)}°`, x0 + 10, y0 + 74);
  ctx.textAlign = "left";
}

function drawCentipede(ctx, state) {
  const g = state.game;
  const cell = g.cell;
  const x0 = Math.floor((WIDTH - g.cols * cell) * 0.5);
  const y0 = 96;
  drawRoundedRect(ctx, x0 - 12, y0 - 12, g.cols * cell + 24, g.rows * cell + 24, 14);
  ctx.fillStyle = "rgba(2, 6, 23, 0.8)";
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
  ctx.stroke();

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x0, y0, g.cols * cell, g.rows * cell);

  ctx.fillStyle = "#a3e635";
  for (const key of g.mushrooms) {
    const [sx, sy] = key.split(":").map(Number);
    const mx = x0 + sx * cell + cell * 0.5;
    const my = y0 + sy * cell + cell * 0.5;
    ctx.beginPath();
    ctx.arc(mx, my, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < g.segments.length; i += 1) {
    const segment = g.segments[i];
    const cx = x0 + segment.x * cell + cell * 0.5;
    const cy = y0 + segment.y * cell + cell * 0.5;
    ctx.fillStyle = i === 0 ? "#f97316" : "#84cc16";
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "#38bdf8";
  for (const bullet of g.bullets) {
    const bx = x0 + bullet.x * cell;
    const by = y0 + bullet.y * cell;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx, by - 10);
    ctx.stroke();
  }

  if (g.flea.active) {
    const fx = x0 + (g.flea.x + 0.5) * cell;
    const fy = y0 + (g.flea.y + 0.5) * cell;
    drawGlow(ctx, fx, fy, 20, "#f43f5e", 0.25);
    ctx.fillStyle = "#fb7185";
    ctx.beginPath();
    ctx.arc(fx, fy, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  const px = x0 + (g.player.x + 0.5) * cell;
  const py = y0 + (g.player.y + 0.5) * cell;
  drawGlow(ctx, px, py, 22, "#22d3ee", 0.24);
  drawRoundedRect(ctx, px - 10, py - 8, 20, 16, 6);
  ctx.fillStyle = "#22d3ee";
  ctx.fill();
}

function drawRiverRaid(ctx, state) {
  const g = state.game;
  const step = 10;
  const leftPoints = [];
  const rightPoints = [];
  for (let y = BODY_TOP; y <= BODY_BOTTOM; y += step) {
    const distance = g.distance + (BODY_BOTTOM - y) * 3.8;
    const bounds = riverBounds(distance, state.level);
    leftPoints.push({ x: bounds.left, y });
    rightPoints.push({ x: bounds.right, y });
  }
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, BODY_TOP, WIDTH, BODY_BOTTOM - BODY_TOP);

  ctx.beginPath();
  ctx.moveTo(leftPoints[0].x, leftPoints[0].y);
  for (const point of leftPoints) ctx.lineTo(point.x, point.y);
  for (let i = rightPoints.length - 1; i >= 0; i -= 1) {
    const point = rightPoints[i];
    ctx.lineTo(point.x, point.y);
  }
  ctx.closePath();
  const riverGrad = ctx.createLinearGradient(0, BODY_TOP, 0, BODY_BOTTOM);
  riverGrad.addColorStop(0, "#0ea5e9");
  riverGrad.addColorStop(1, "#0369a1");
  ctx.fillStyle = riverGrad;
  ctx.fill();

  ctx.strokeStyle = "rgba(226, 232, 240, 0.3)";
  for (let i = 0; i < leftPoints.length; i += 1) {
    ctx.beginPath();
    ctx.moveTo(leftPoints[i].x, leftPoints[i].y);
    ctx.lineTo(rightPoints[i].x, rightPoints[i].y);
    ctx.stroke();
  }

  for (const obstacle of g.obstacles) {
    if (obstacle.y + obstacle.h < BODY_TOP || obstacle.y > BODY_BOTTOM) continue;
    if (obstacle.type === "fuel") ctx.fillStyle = "#22c55e";
    else if (obstacle.type === "frigate") ctx.fillStyle = "#f97316";
    else ctx.fillStyle = "#f43f5e";
    drawRoundedRect(ctx, obstacle.x, obstacle.y, obstacle.w, obstacle.h, 5);
    ctx.fill();
  }

  ctx.strokeStyle = "#e2e8f0";
  for (const bullet of g.bullets) {
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y);
    ctx.lineTo(bullet.x, bullet.y - 10);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(g.playerX, g.playerY);
  drawGlow(ctx, 0, 0, 22, "#38bdf8", 0.25);
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(11, 14);
  ctx.lineTo(0, 8);
  ctx.lineTo(-11, 14);
  ctx.closePath();
  ctx.fillStyle = "#e2e8f0";
  ctx.fill();
  ctx.restore();
}

function drawTron(ctx, state) {
  const g = state.game;
  const cell = 20;
  const x0 = Math.floor((WIDTH - g.cols * cell) * 0.5);
  const y0 = 102;
  drawRoundedRect(ctx, x0 - 10, y0 - 10, g.cols * cell + 20, g.rows * cell + 20, 14);
  ctx.fillStyle = "rgba(2, 6, 23, 0.82)";
  ctx.fill();
  ctx.strokeStyle = "rgba(56, 189, 248, 0.3)";
  ctx.stroke();

  ctx.fillStyle = "#030712";
  ctx.fillRect(x0, y0, g.cols * cell, g.rows * cell);

  for (const key of g.trails) {
    const [sx, sy] = key.split(":").map(Number);
    const tx = x0 + sx * cell + 2;
    const ty = y0 + sy * cell + 2;
    const playerHit = sx === g.player.x && sy === g.player.y;
    const aiHit = sx === g.ai.x && sy === g.ai.y;
    if (playerHit) ctx.fillStyle = "#22d3ee";
    else if (aiHit) ctx.fillStyle = "#f43f5e";
    else ctx.fillStyle = "rgba(148, 163, 184, 0.35)";
    ctx.fillRect(tx, ty, cell - 4, cell - 4);
  }
}

function drawRoadFighter(ctx, state) {
  const g = state.game;
  const roadWidth = 360;
  const left = (WIDTH - roadWidth) * 0.5;
  const laneWidth = roadWidth / g.lanes;
  const y0 = BODY_TOP;
  const h = BODY_BOTTOM - BODY_TOP;

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, y0, WIDTH, h);
  drawRoundedRect(ctx, left - 16, y0, roadWidth + 32, h, 20);
  ctx.fillStyle = "#111827";
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.28)";
  ctx.stroke();

  const dashOffset = (state.elapsedMs * 0.35) % 46;
  ctx.strokeStyle = "rgba(226, 232, 240, 0.45)";
  ctx.setLineDash([18, 18]);
  for (let lane = 1; lane < g.lanes; lane += 1) {
    const x = left + lane * laneWidth;
    ctx.beginPath();
    ctx.moveTo(x, y0 + dashOffset);
    ctx.lineTo(x, BODY_BOTTOM);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  for (const car of g.cars) {
    const x = roadLaneCenter(g.lanes, car.lane) - car.w * 0.5;
    drawRoundedRect(ctx, x, car.y, car.w, car.h, 8);
    ctx.fillStyle = car.color;
    ctx.fill();
    ctx.fillStyle = "rgba(2, 6, 23, 0.45)";
    ctx.fillRect(x + 8, car.y + 10, car.w - 16, 14);
  }

  const playerW = 46;
  const playerH = 78;
  const playerX = roadLaneCenter(g.lanes, g.playerLane) - playerW * 0.5;
  const playerY = g.playerY - playerH * 0.5;
  drawGlow(ctx, playerX + playerW * 0.5, playerY + playerH * 0.5, 32, "#f43f5e", 0.22);
  drawRoundedRect(ctx, playerX, playerY, playerW, playerH, 10);
  ctx.fillStyle = "#e11d48";
  ctx.fill();
  ctx.fillStyle = "rgba(248, 250, 252, 0.85)";
  ctx.fillRect(playerX + 10, playerY + 14, playerW - 20, 16);
}

function drawUnsupported(ctx, state) {
  drawRoundedRect(ctx, 156, 120, WIDTH - 312, HEIGHT - 206, 20);
  ctx.fillStyle = "rgba(2, 6, 23, 0.82)";
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
  ctx.stroke();
  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 24px 'Bricolage Grotesque', sans-serif";
  ctx.fillText(
    state.locale === "es" ? "Render retro en progreso" : "Retro render in progress",
    184,
    HEIGHT * 0.5 - 12
  );
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "500 15px 'JetBrains Mono', monospace";
  ctx.fillText(state.variant, 184, HEIGHT * 0.5 + 22);
}
function drawBody(ctx, state) {
  switch (state.variant) {
    case "snake-classic": drawSnake(ctx, state); break;
    case "breakout-1986": drawBreakout(ctx, state); break;
    case "space-invaders": drawInvaders(ctx, state); break;
    case "tetris-blockfall": drawTetris(ctx, state); break;
    case "frogger-crossing": drawFrogger(ctx, state); break;
    case "galaga-quantum": drawGalaga(ctx, state); break;
    case "qbert-prism": drawQbert(ctx, state); break;
    case "pong-duel": drawPong(ctx, state); break;
    case "asteroids-vector": drawAsteroids(ctx, state); break;
    case "missile-command": drawMissile(ctx, state); break;
    case "bomber-grid": drawBomber(ctx, state); break;
    case "lunar-lander-orbit": drawLander(ctx, state); break;
    case "centipede-circuit": drawCentipede(ctx, state); break;
    case "river-raid-neon": drawRiverRaid(ctx, state); break;
    case "tron-lightcycles": drawTron(ctx, state); break;
    case "road-fighter-synth": drawRoadFighter(ctx, state); break;
    default:
      drawUnsupported(ctx, state);
      break;
  }
}
function drawOverlay(ctx, state, locale) {
  if (state.phase === "playing") return;
  const ui = UI[locale] ?? UI.en;
  const definition = DEFINITIONS[state.variant];
  drawRoundedRect(ctx, 116, 156, WIDTH - 232, HEIGHT - 236, 20);
  ctx.fillStyle = "rgba(2, 6, 23, 0.72)";
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.34)";
  ctx.stroke();
  const title = state.phase === "gameover"
    ? (locale === "es" ? "Partida terminada" : "Game over")
    : state.phase === "paused"
      ? (locale === "es" ? "Pausa" : "Paused")
      : (locale === "es" ? "Lista para iniciar" : "Ready");
  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 30px 'Bricolage Grotesque', sans-serif";
  ctx.fillText(title, 144, 204);
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "500 16px 'Bricolage Grotesque', sans-serif";
  ctx.fillText(text(locale, definition.objective), 144, 242);
  ctx.fillText(text(locale, definition.controls), 144, 278);
  ctx.fillStyle = "#93c5fd";
  ctx.font = "600 14px 'JetBrains Mono', monospace";
  ctx.fillText(locale === "es" ? "Pulsa Enter o Iniciar para comenzar" : "Press Enter or Start to begin", 144, HEIGHT - 136);
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText(ui.hint, 144, HEIGHT - 106);
}

function renderCanvas(ctx, state, locale) {
  drawBackground(ctx, state);
  drawHeader(ctx, state, locale);
  ctx.save();
  ctx.beginPath();
  ctx.rect(10, BODY_TOP, WIDTH - 20, BODY_BOTTOM - BODY_TOP);
  ctx.clip();
  drawBody(ctx, state);
  ctx.restore();
  drawRoundedRect(ctx, 16, HEIGHT - 52, WIDTH - 32, 34, 11);
  ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.26)";
  ctx.stroke();
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "500 12px 'JetBrains Mono', monospace";
  ctx.fillText(state.message, 28, HEIGHT - 30);
  drawOverlay(ctx, state, locale);
}
function summary(state) {
  const g = state.game;
  switch (state.variant) {
    case "snake-classic":
      return { snakeLength: g.snake.length, head: g.snake[0], food: g.food, progress: `${g.foods}/${g.targetFoods}` };
    case "breakout-1986":
      return { bricks: g.bricks.filter((brick) => brick.hp > 0).length, ball: { x: Math.round(g.ball.x), y: Math.round(g.ball.y), stuck: g.ball.stuck } };
    case "space-invaders":
      return { enemies: g.enemies.length, bullets: g.bullets.length, enemyBullets: g.enemyBullets.length };
    case "tetris-blockfall":
      return {
        placedCells: g.placedCells,
        boardSize: BLOCK_BOARD_SIZE * BLOCK_BOARD_SIZE,
        timeLimit: null,
        activeReady: g.ready,
        incomingX: Math.round(g.incomingX),
        cursor: { col: g.cursor.col, row: g.cursor.row },
        piecesPlaced: g.placedPieces,
        piecesTotal: g.totalPieces,
        piecesQueued: g.queue.length,
        swaps: g.swaps,
        activeCanFitAnywhere: blockHasAnyFit(g.board, g.active),
        anyQueuedPieceFits: blockAnyQueuedPieceFits(g),
        activePiece: g.active ? { c: g.active.c, w: g.active.m[0].length, h: g.active.m.length, cells: blockPieceCellCount(g.active) } : null,
        boardRows: g.board.map((row) => row.map((cell) => (cell ? 1 : 0)).join("")),
      };
    case "frogger-crossing":
      return { frog: { x: g.frog.x, y: g.frog.y }, homes: g.homes.size, timeLeftMs: Math.max(0, Math.round(g.limitMs - g.roundMs)) };
    case "galaga-quantum":
      return { enemies: g.enemies.length, bullets: g.bullets.length, enemyBullets: g.enemyBullets.length, combo: g.combo };
    case "qbert-prism":
      return { row: g.player.row, col: g.player.col, target: g.target, colored: g.tiles.flat().filter((tile) => tile >= g.target).length };
    case "lunar-lander-orbit":
      {
        const points = getLanderContactPoints(g.ship);
        const altitude = Math.max(0, Math.round(Math.min(
          terrainYAtLander(g, points.leftFoot.x) - points.leftFoot.y,
          terrainYAtLander(g, points.rightFoot.x) - points.rightFoot.y
        )));
        const angle = Math.abs(angNorm(g.ship.a + Math.PI * 0.5));
        return {
          fuel: Math.round(g.ship.fuel),
          x: Math.round(g.ship.x),
          y: Math.round(g.ship.y),
          vx: Math.round(g.ship.vx),
          vy: Math.round(g.ship.vy),
          angularVelocity: Number(g.ship.av.toFixed(2)),
          angleDeg: Math.round((angle * 180) / Math.PI),
          altitude,
          pad: { x: Math.round(g.pad.x), y: g.pad.y, width: Math.round(g.pad.w) },
          limits: { safeVx: g.safeVx, safeVy: g.safeVy, safeAngleDeg: Math.round((g.safeAngle * 180) / Math.PI) },
        };
      }
    case "centipede-circuit":
      return { segments: g.segments.length, mushrooms: g.mushrooms.size, bullets: g.bullets.length, flea: g.flea.active };
    case "river-raid-neon":
      return { fuel: Math.round(g.fuel), distance: Math.round(g.distance), targetDistance: g.targetDistance, obstacles: g.obstacles.length };
    case "tron-lightcycles":
      return { player: { x: g.player.x, y: g.player.y }, ai: { x: g.ai.x, y: g.ai.y }, trails: g.trails.size };
    case "road-fighter-synth":
      return { lane: g.playerLane + 1, distance: Math.round(g.distance), targetDistance: g.targetDistance, traffic: g.cars.length };
    case "bomber-grid":
      return { player: { x: g.player.x, y: g.player.y, range: g.player.range, cap: g.player.cap }, enemies: g.enemies.length, bombs: g.bombs.length, flames: g.flames.length };
    default:
      return {};
  }
}
function snapshot(state, locale) {
  const ui = UI[locale] ?? UI.en;
  return {
    mode: "retro-classics",
    variant: state.variant,
    phase: state.phase,
    phaseLabel: state.phase === "playing" ? ui.phasePlaying : state.phase === "paused" ? ui.phasePaused : state.phase === "gameover" ? ui.phaseGameOver : ui.phaseMenu,
    score: state.score,
    highScore: state.best,
    level: state.level,
    lives: state.lives,
    elapsedMs: Math.round(state.elapsedMs),
    message: state.message,
    locale: state.locale,
    summary: summary(state),
    fullscreen: state.isFullscreen,
    coordinates: "origin_top_left_x_right_y_down_pixels",
  };
}

function RetroClassicsGame({ variant = "snake-classic" }) {
  const locale = useMemo(() => (resolveBrowserLanguage() === "es" ? "es" : "en"), []);
  const ui = useMemo(() => UI[locale] ?? UI.en, [locale]);
  const definition = useMemo(() => DEFINITIONS[ORDER.includes(variant) ? variant : "snake-classic"], [variant]);
  const touch = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(pointer: coarse)")?.matches || (navigator.maxTouchPoints ?? 0) > 0;
  }, []);

  const canvasRef = useRef(null);
  const shellRef = useRef(null);
  const runtimeRef = useRef(null);
  const inputRef = useRef(createInput());
  const [snap, setSnap] = useState(() => snapshot({ ...baseState(variant, locale), game: createGame(variant, 1, 1) }, locale));

  const toggleFullscreen = useCallback(async () => {
    const element = shellRef.current;
    if (!element) return;
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } else if (element.requestFullscreen) await element.requestFullscreen();
      else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
    } catch {
      // ignore
    }
  }, []);

  const step = useCallback((runtime, dt) => {
    const { state, input } = runtime;
    if (input.pressed("KeyF")) toggleFullscreen();
    if (input.pressed("KeyR")) resetRun(state);
    if (input.pressed("KeyP") || input.pressed("Escape")) {
      if (state.phase === "playing") state.phase = "paused";
      else if (state.phase === "paused") state.phase = "playing";
    }
    if ((state.phase === "menu" || state.phase === "gameover") && (input.pressed("Enter") || input.pressed("Space"))) {
      resetRun(state);
    } else if (state.phase === "paused" && (input.pressed("Enter") || input.pressed("Space"))) {
      state.phase = "playing";
      state.message = state.locale === "es" ? "Partida reanudada" : "Run resumed";
    }
    if (state.phase === "playing") {
      state.elapsedMs += dt * 1000;
      updateGame(state, input, dt);
    }
    input.clearPressed();
  }, [toggleFullscreen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    const state = baseState(variant, locale);
    state.game = createGame(state.variant, state.level, state.run);
    const runtime = { ctx, state, input: inputRef.current, accMs: 0, last: 0, raf: 0 };
    runtimeRef.current = runtime;

    const loop = (ts) => {
      const rt = runtimeRef.current;
      if (!rt) return;
      if (!rt.last) rt.last = ts;
      let delta = ts - rt.last;
      rt.last = ts;
      delta = clamp(delta, 0, 120);
      rt.accMs += delta;
      let guard = 0;
      while (rt.accMs >= DT_MS && guard < 8) {
        step(rt, DT);
        rt.accMs -= DT_MS;
        guard += 1;
      }
      renderCanvas(rt.ctx, rt.state, locale);
      setSnap(snapshot(rt.state, locale));
      rt.raf = window.requestAnimationFrame(loop);
    };

    const onDown = (event) => runtime.input.press(event.code);
    const onUp = (event) => runtime.input.release(event.code);
    const onBlur = () => runtime.input.clearAll();
    const onFullscreen = () => {
      const rt = runtimeRef.current;
      if (!rt) return;
      rt.state.isFullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      setSnap(snapshot(rt.state, locale));
    };

    renderCanvas(runtime.ctx, runtime.state, locale);
    setSnap(snapshot(runtime.state, locale));
    runtime.raf = window.requestAnimationFrame(loop);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("webkitfullscreenchange", onFullscreen);

    return () => {
      window.cancelAnimationFrame(runtime.raf);
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("webkitfullscreenchange", onFullscreen);
      runtimeRef.current = null;
    };
  }, [locale, step, variant]);

  const buildText = useCallback((stateSnapshot) => stateSnapshot, []);
  const advanceTime = useCallback((ms = 0) => {
    const rt = runtimeRef.current;
    if (!rt) return;
    const steps = clamp(Math.round(ms / DT_MS), 1, 900);
    for (let index = 0; index < steps; index += 1) step(rt, DT);
    renderCanvas(rt.ctx, rt.state, locale);
    setSnap(snapshot(rt.state, locale));
  }, [locale, step]);
  useGameRuntimeBridge(snap, buildText, advanceTime);

  const holdProps = (code) => ({
    onMouseDown: () => inputRef.current.press(code),
    onMouseUp: () => inputRef.current.release(code),
    onMouseLeave: () => inputRef.current.release(code),
    onTouchStart: (event) => {
      event.preventDefault();
      inputRef.current.press(code);
    },
    onTouchEnd: (event) => {
      event.preventDefault();
      inputRef.current.release(code);
    },
    onTouchCancel: () => inputRef.current.release(code),
  });

  const startOrResume = () => {
    const rt = runtimeRef.current;
    if (!rt) return;
    if (rt.state.phase === "menu" || rt.state.phase === "gameover") resetRun(rt.state);
    else if (rt.state.phase === "paused") rt.state.phase = "playing";
    setSnap(snapshot(rt.state, locale));
  };
  const restart = () => {
    const rt = runtimeRef.current;
    if (!rt) return;
    resetRun(rt.state);
    setSnap(snapshot(rt.state, locale));
  };
  const pauseToggle = () => {
    const rt = runtimeRef.current;
    if (!rt) return;
    if (rt.state.phase === "playing") rt.state.phase = "paused";
    else if (rt.state.phase === "paused") rt.state.phase = "playing";
    setSnap(snapshot(rt.state, locale));
  };
  const changePiece = () => {
    const input = inputRef.current;
    input.press("KeyC");
    input.release("KeyC");
  };
  const canChangePiece = variant === "tetris-blockfall" && snap.phase === "playing";

  return (
    <div className="mini-game retro-arcade-game">
      <div className="mini-head retro-arcade-head">
        <div>
          <h4>{text(locale, definition.title)}</h4>
          <p>{text(locale, definition.objective)}</p>
        </div>
        <div className="retro-arcade-actions">
          <button type="button" onClick={startOrResume}>{snap.phase === "paused" ? ui.resume : ui.start}</button>
          <button type="button" onClick={restart}>{ui.restart}</button>
          <button type="button" onClick={pauseToggle}>{snap.phase === "paused" ? ui.resume : ui.pause}</button>
          {variant === "tetris-blockfall" ? (
            <button type="button" onClick={changePiece} disabled={!canChangePiece}>{ui.changePiece}</button>
          ) : null}
          <button type="button" onClick={toggleFullscreen}>{ui.fullscreen}</button>
        </div>
      </div>

      <div className="retro-arcade-meta">
        <div><strong>{ui.objective}:</strong> {text(locale, definition.objective)}</div>
        <div><strong>{ui.controls}:</strong> {text(locale, definition.controls)}</div>
      </div>

      <div className="retro-arcade-stage" ref={shellRef}>
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="retro-arcade-canvas" aria-label={text(locale, definition.title)} />
      </div>

      <div className="retro-arcade-hud-strip">
        <span>{ui.score}: <strong>{snap.score}</strong></span>
        <span>{ui.best}: <strong>{snap.highScore}</strong></span>
        <span>{ui.level}: <strong>{snap.level}</strong></span>
        <span>{ui.lives}: <strong>{snap.lives}</strong></span>
        <span>{snap.message}</span>
      </div>

      {touch ? (
        <div className="retro-arcade-touch">
          <button type="button" {...holdProps("ArrowLeft")}>?</button>
          <button type="button" {...holdProps("ArrowUp")}>?</button>
          <button type="button" {...holdProps("ArrowDown")}>?</button>
          <button type="button" {...holdProps("ArrowRight")}>?</button>
          <button type="button" {...holdProps("Space")}>A</button>
          <button type="button" {...holdProps("Enter")}>B</button>
          {variant === "tetris-blockfall" ? <button type="button" {...holdProps("KeyC")}>C</button> : null}
          <button type="button" {...holdProps("KeyP")}>P</button>
        </div>
      ) : null}

      <p className="retro-arcade-footnote">{ui.hint}</p>
    </div>
  );
}

export default RetroClassicsGame;

