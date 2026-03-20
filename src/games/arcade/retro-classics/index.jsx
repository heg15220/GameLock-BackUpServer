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

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
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
};

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
  const t = state.elapsedMs * 0.001;
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

function drawHeader(ctx, state, locale) {
  const ui = UI[locale] ?? UI.en;
  const definition = DEFINITIONS[state.variant];
  const theme = themeFor(state.variant);
  drawRoundedRect(ctx, 16, 14, WIDTH - 32, 72, 16);
  ctx.fillStyle = "rgba(2, 6, 23, 0.76)";
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.28)";
  ctx.lineWidth = 1;
  ctx.stroke();

  drawRoundedRect(ctx, 22, 20, 8, 60, 4);
  ctx.fillStyle = theme.accent;
  ctx.fill();

  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 20px 'Bricolage Grotesque', sans-serif";
  ctx.fillText(text(locale, definition.title), 42, 41);
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "500 13px 'JetBrains Mono', monospace";
  ctx.fillText(text(locale, definition.objective), 42, 63);
  ctx.fillStyle = "#f8fafc";
  ctx.textAlign = "right";
  ctx.font = "700 14px 'JetBrains Mono', monospace";
  ctx.fillText(`${ui.score}: ${state.score}`, WIDTH - 30, 34);
  ctx.fillText(`${ui.best}: ${state.best}`, WIDTH - 30, 52);
  ctx.fillText(`${ui.level}: ${state.level} · ${ui.lives}: ${state.lives}`, WIDTH - 30, 70);
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
  const x0 = 306;
  const y0 = 100;
  const cell = 18;
  const boardW = 10 * cell;
  const boardH = 20 * cell;
  drawRoundedRect(ctx, x0 - 20, y0 - 16, boardW + 40, boardH + 34, 18);
  ctx.fillStyle = "rgba(2, 6, 23, 0.82)";
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
  ctx.stroke();

  const boardBg = ctx.createLinearGradient(x0, y0, x0, y0 + boardH);
  boardBg.addColorStop(0, "#051f2d");
  boardBg.addColorStop(1, "#0f172a");
  ctx.fillStyle = boardBg;
  ctx.fillRect(x0, y0, boardW, boardH);

  for (let row = 0; row < 20; row += 1) {
    for (let col = 0; col < 10; col += 1) {
      const x = x0 + col * cell;
      const y = y0 + row * cell;
      ctx.fillStyle = g.board[row][col] || "rgba(15, 23, 42, 0.74)";
      ctx.fillRect(x, y, cell - 1, cell - 1);
      if (g.board[row][col]) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.fillRect(x + 2, y + 2, cell - 6, 3);
      }
    }
  }

  const ghost = { ...g.piece, m: g.piece.m };
  while (!tetrisCollision(g.board, ghost, 0, 1)) ghost.y += 1;
  ctx.save();
  ctx.globalAlpha = 0.25;
  for (let row = 0; row < ghost.m.length; row += 1) {
    for (let col = 0; col < ghost.m[row].length; col += 1) {
      if (!ghost.m[row][col]) continue;
      const x = ghost.x + col;
      const y = ghost.y + row;
      if (y < 0) continue;
      ctx.fillStyle = g.piece.c;
      ctx.fillRect(x0 + x * cell, y0 + y * cell, cell - 1, cell - 1);
    }
  }
  ctx.restore();

  for (let row = 0; row < g.piece.m.length; row += 1) {
    for (let col = 0; col < g.piece.m[row].length; col += 1) {
      if (!g.piece.m[row][col]) continue;
      const x = g.piece.x + col;
      const y = g.piece.y + row;
      if (y < 0) continue;
      drawGlow(ctx, x0 + x * cell + cell * 0.5, y0 + y * cell + cell * 0.5, 16, g.piece.c, 0.12);
      ctx.fillStyle = g.piece.c;
      ctx.fillRect(x0 + x * cell, y0 + y * cell, cell - 1, cell - 1);
      ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
      ctx.fillRect(x0 + x * cell + 2, y0 + y * cell + 2, cell - 6, 3);
    }
  }

  const panelX = x0 + boardW + 24;
  const panelY = y0 + 16;
  drawRoundedRect(ctx, panelX, panelY, 128, 120, 12);
  ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.24)";
  ctx.stroke();
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "600 12px 'JetBrains Mono', monospace";
  ctx.fillText(state.locale === "es" ? "Siguiente" : "Next", panelX + 14, panelY + 22);
  for (let row = 0; row < g.next.m.length; row += 1) {
    for (let col = 0; col < g.next.m[row].length; col += 1) {
      if (!g.next.m[row][col]) continue;
      ctx.fillStyle = g.next.c;
      ctx.fillRect(panelX + 26 + col * 18, panelY + 38 + row * 18, 16, 16);
    }
  }
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

function drawBody(ctx, state) {
  switch (state.variant) {
    case "snake-classic": drawSnake(ctx, state); break;
    case "breakout-1986": drawBreakout(ctx, state); break;
    case "space-invaders": drawInvaders(ctx, state); break;
    case "tetris-blockfall": drawTetris(ctx, state); break;
    case "frogger-crossing": drawFrogger(ctx, state); break;
    case "bomber-grid": drawBomber(ctx, state); break;
    default: drawSnake(ctx, state); break;
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
      : (locale === "es" ? "Lista para jugar" : "Ready to play");
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
  drawBody(ctx, state);
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
      return { lines: g.lines, piece: { x: g.piece.x, y: g.piece.y }, delay: Math.round(g.dropDelay * 1000) };
    case "frogger-crossing":
      return { frog: { x: g.frog.x, y: g.frog.y }, homes: g.homes.size, timeLeftMs: Math.max(0, Math.round(g.limitMs - g.roundMs)) };
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
