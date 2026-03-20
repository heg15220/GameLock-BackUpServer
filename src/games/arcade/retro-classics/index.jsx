import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";

const WIDTH = 960;
const HEIGHT = 540;
const DT = 1 / 60;
const DT_MS = 1000 / 60;

const UI = {
  es: {
    start: "Iniciar",
    restart: "Reiniciar",
    pause: "Pausa",
    resume: "Continuar",
    fullscreen: "Pantalla completa",
    score: "Puntuacion",
    best: "Record",
    level: "Nivel",
    lives: "Vidas",
    hint: "Enter/Espacio inicia · P pausa · R reinicia · F fullscreen",
    objective: "Objetivo",
    controls: "Controles",
    phaseMenu: "menu",
    phasePlaying: "jugando",
    phasePaused: "pausa",
    phaseGameOver: "fin",
  },
  en: {
    start: "Start",
    restart: "Restart",
    pause: "Pause",
    resume: "Resume",
    fullscreen: "Fullscreen",
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
    title: { es: "Tetris Blockfall", en: "Tetris Blockfall" },
    objective: { es: "Completa lineas sin bloquear el pozo.", en: "Complete lines without topping out." },
    controls: { es: "A/D mover, arriba rotar, abajo soft drop, Espacio hard drop.", en: "A/D move, up rotate, down soft drop, Space hard drop." },
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
    controls: { es: "A/D rota, W impulso principal.", en: "A/D rotate, W main thruster." },
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

const SHAPES = [
  { c: "#22d3ee", m: [[1, 1, 1, 1]] },
  { c: "#facc15", m: [[1, 1], [1, 1]] },
  { c: "#c084fc", m: [[0, 1, 0], [1, 1, 1]] },
  { c: "#fb923c", m: [[1, 0, 0], [1, 1, 1]] },
  { c: "#60a5fa", m: [[0, 0, 1], [1, 1, 1]] },
  { c: "#34d399", m: [[0, 1, 1], [1, 1, 0]] },
  { c: "#f87171", m: [[1, 1, 0], [0, 1, 1]] },
];

function createPiece(rng) {
  const picked = SHAPES[randInt(rng, 0, SHAPES.length)];
  return { c: picked.c, m: picked.m.map((row) => [...row]), x: 3, y: 0 };
}

function createTetris(level, seed) {
  const rng = createRng(seed);
  return {
    board: Array.from({ length: 20 }, () => Array.from({ length: 10 }, () => 0)),
    piece: createPiece(rng),
    next: createPiece(rng),
    dropAcc: 0,
    dropDelay: Math.max(0.72 - (level - 1) * 0.05, 0.12),
    lines: 0,
    rng,
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

function createLander(level, seed) {
  const rng = createRng(seed);
  const padWidth = Math.max(76, 146 - level * 4);
  const padX = randInt(rng, 170, WIDTH - 170);
  return {
    ship: { x: WIDTH * 0.5, y: 120, vx: 0, vy: 0, a: -Math.PI * 0.5, fuel: 100 },
    pad: { x: padX, y: HEIGHT - 78, w: padWidth },
    gravity: 94 + level * 8,
    safeVx: Math.max(32, 64 - level * 2),
    safeVy: Math.max(70, 120 - level * 3),
    safeAngle: 0.32,
    stars: Array.from({ length: 58 }, () => ({
      x: rng() * WIDTH,
      y: rng() * (HEIGHT - 130),
      r: 1 + rng() * 2,
    })),
    ridge: Array.from({ length: 14 }, (_, idx) => ({
      x: (idx / 13) * WIDTH,
      y: HEIGHT - 54 - rng() * 38,
    })),
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

function rotateCW(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const out = Array.from({ length: cols }, () => Array.from({ length: rows }, () => 0));
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      out[col][rows - row - 1] = matrix[row][col];
    }
  }
  return out;
}

function tetrisCollision(board, piece, ox = 0, oy = 0, matrix = null) {
  const m = matrix || piece.m;
  for (let row = 0; row < m.length; row += 1) {
    for (let col = 0; col < m[row].length; col += 1) {
      if (!m[row][col]) continue;
      const x = piece.x + col + ox;
      const y = piece.y + row + oy;
      if (x < 0 || x >= 10 || y >= 20) return true;
      if (y >= 0 && board[y][x]) return true;
    }
  }
  return false;
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
  const piece = g.piece;
  if ((input.pressed("ArrowLeft") || input.pressed("KeyA")) && !tetrisCollision(g.board, piece, -1, 0)) piece.x -= 1;
  if ((input.pressed("ArrowRight") || input.pressed("KeyD")) && !tetrisCollision(g.board, piece, 1, 0)) piece.x += 1;
  if (input.pressed("ArrowUp") || input.pressed("KeyW") || input.pressed("KeyX")) {
    const rotated = rotateCW(piece.m);
    if (!tetrisCollision(g.board, piece, 0, 0, rotated)) piece.m = rotated;
  }
  if (input.pressed("Space")) {
    while (!tetrisCollision(g.board, piece, 0, 1)) {
      piece.y += 1;
      addScore(state, 1);
    }
    g.dropAcc = g.dropDelay;
  }
  g.dropAcc += dt * ((input.down("ArrowDown") || input.down("KeyS")) ? 7 : 1);
  if (g.dropAcc < g.dropDelay) return;
  g.dropAcc -= g.dropDelay;
  if (!tetrisCollision(g.board, piece, 0, 1)) {
    piece.y += 1;
    return;
  }
  for (let row = 0; row < piece.m.length; row += 1) {
    for (let col = 0; col < piece.m[row].length; col += 1) {
      if (!piece.m[row][col]) continue;
      const x = piece.x + col;
      const y = piece.y + row;
      if (y >= 0 && y < 20 && x >= 0 && x < 10) g.board[y][x] = piece.c;
    }
  }
  let cleared = 0;
  for (let row = 19; row >= 0; row -= 1) {
    if (g.board[row].every(Boolean)) {
      g.board.splice(row, 1);
      g.board.unshift(Array.from({ length: 10 }, () => 0));
      cleared += 1;
      row += 1;
    }
  }
  if (cleared > 0) {
    addScore(state, [0, 100, 280, 520, 900][cleared] * Math.max(1, state.level));
    g.lines += cleared;
    const targetLevel = 1 + Math.floor(g.lines / 10);
    if (targetLevel > state.level) {
      state.level = targetLevel;
      g.dropDelay = Math.max(0.08, g.dropDelay * 0.94);
    }
  }
  g.piece = g.next;
  g.piece.x = 3;
  g.piece.y = 0;
  g.next = createPiece(g.rng);
  if (tetrisCollision(g.board, g.piece, 0, 0)) {
    state.phase = "gameover";
    state.message = state.locale === "es" ? "Stack completo" : "Stack overflow";
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
  if ((input.down("ArrowUp") || input.down("KeyW")) && ship.fuel > 0) {
    const thrust = 210 + state.level * 10;
    ship.vx += Math.cos(ship.a) * thrust * dt;
    ship.vy += Math.sin(ship.a) * thrust * dt;
    ship.fuel = Math.max(0, ship.fuel - dt * 23);
  }
  ship.vy += g.gravity * dt;
  ship.vx *= 0.996;
  ship.vy *= 0.998;
  ship.x = clamp(ship.x + ship.vx * dt, 10, WIDTH - 10);
  ship.y += ship.vy * dt;
  if (ship.y < 30) {
    ship.y = 30;
    ship.vy = Math.max(0, ship.vy);
  }
  if (ship.y >= g.pad.y - 11) {
    const onPad = ship.x >= g.pad.x - g.pad.w * 0.5 && ship.x <= g.pad.x + g.pad.w * 0.5;
    const angle = Math.abs(Math.atan2(Math.sin(ship.a + Math.PI * 0.5), Math.cos(ship.a + Math.PI * 0.5)));
    if (onPad && Math.abs(ship.vx) <= g.safeVx && Math.abs(ship.vy) <= g.safeVy && angle <= g.safeAngle) {
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
    case "lunar-lander-orbit": updateLander(state, input, dt); break;
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
  "space-invaders": { accent: "#a3e635", accentSoft: "#38bdf8", panel: "#365314" }, []);

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
          <button type="button" {...holdProps("ArrowLeft")}>◀</button>
          <button type="button" {...holdProps("ArrowUp")}>▲</button>
          <button type="button" {...holdProps("ArrowDown")}>▼</button>
          <button type="button" {...holdProps("ArrowRight")}>▶</button>
          <button type="button" {...holdProps("Space")}>A</button>
          <button type="button" {...holdProps("Enter")}>B</button>
          <button type="button" {...holdProps("KeyP")}>P</button>
        </div>
      ) : null}

      <p className="retro-arcade-footnote">{ui.hint}</p>
    </div>
  );
}

export default RetroClassicsGame;

