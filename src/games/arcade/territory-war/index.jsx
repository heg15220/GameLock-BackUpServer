import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";

const WIDTH = 960;
const HEIGHT = 540;
const DT = 1 / 60;
const DT_MS = 1000 / 60;
const TURN_MS = 24000;
const MOVE_BUDGET = 230;
const MOVE_SPEED = 132;
const AIR_CONTROL = 64;
const JUMP_SPEED = 362;
const GRAVITY = 860;
const THROW_BASE = 220;
const THROW_SCALE = 380;
const BLAST_RADIUS = 104;
const BLAST_DAMAGE = 86;

const TEAM = {
  red: { color: "#ef4444", cpu: false },
  blue: { color: "#2563eb", cpu: true },
};

const NAMES = {
  red: ["Carl", "Ozzy", "Dfox", "Mila", "Rook", "Nora"],
  blue: ["Bob", "Joe", "Vex", "Iris", "Zed", "Luna"],
};

const MAPS = [
  {
    id: "wasteland",
    name: { es: "Wasteland", en: "Wasteland" },
    theme: { skyTop: "#8eb6ff", skyBottom: "#dbeafe", mountain: "#a8bfd8", grass: "#2f9e44", dirt: "#6b4f3a" },
    platforms: [
      { x: -30, y: 430, w: 372, h: 150, type: "ground" },
      { x: 178, y: 276, w: 228, h: 20, type: "log" },
      { x: 420, y: 308, w: 120, h: 20, type: "log" },
      { x: 565, y: 252, w: 224, h: 20, type: "log" },
      { x: 646, y: 404, w: 360, h: 190, type: "ground" },
      { x: 768, y: 360, w: 82, h: 44, type: "stone" },
      { x: 830, y: 326, w: 86, h: 80, type: "stone" },
    ],
    red: [{ x: 72, y: 430 }, { x: 118, y: 430 }, { x: 164, y: 430 }, { x: 210, y: 430 }, { x: 256, y: 430 }, { x: 302, y: 430 }],
    blue: [{ x: 690, y: 404 }, { x: 736, y: 404 }, { x: 782, y: 404 }, { x: 826, y: 360 }, { x: 872, y: 326 }, { x: 918, y: 326 }],
    clouds: [{ x: 130, y: 130, w: 180, h: 58 }, { x: 380, y: 168, w: 220, h: 72 }, { x: 710, y: 126, w: 166, h: 52 }],
  },
  {
    id: "graveyard",
    name: { es: "Graveyard", en: "Graveyard" },
    theme: { skyTop: "#a3a8c7", skyBottom: "#dbe5f1", mountain: "#9ea5c9", grass: "#4b5563", dirt: "#4b3b35" },
    platforms: [
      { x: -20, y: 420, w: 338, h: 150, type: "ground" },
      { x: 136, y: 318, w: 182, h: 22, type: "stone" },
      { x: 352, y: 266, w: 154, h: 20, type: "stone" },
      { x: 544, y: 300, w: 144, h: 20, type: "stone" },
      { x: 684, y: 420, w: 316, h: 150, type: "ground" },
      { x: 784, y: 356, w: 76, h: 64, type: "stone" },
      { x: 846, y: 322, w: 80, h: 98, type: "stone" },
    ],
    red: [{ x: 72, y: 420 }, { x: 114, y: 420 }, { x: 156, y: 420 }, { x: 198, y: 420 }, { x: 240, y: 318 }, { x: 282, y: 318 }],
    blue: [{ x: 726, y: 420 }, { x: 768, y: 420 }, { x: 810, y: 356 }, { x: 852, y: 322 }, { x: 894, y: 322 }, { x: 936, y: 322 }],
    clouds: [{ x: 104, y: 112, w: 150, h: 44 }, { x: 318, y: 142, w: 202, h: 62 }, { x: 688, y: 104, w: 176, h: 56 }],
  },
  {
    id: "island",
    name: { es: "Island", en: "Island" },
    theme: { skyTop: "#7dd3fc", skyBottom: "#dbeafe", mountain: "#8ab6d6", grass: "#22c55e", dirt: "#5f513f" },
    platforms: [
      { x: -30, y: 438, w: 332, h: 150, type: "ground" },
      { x: 176, y: 274, w: 160, h: 20, type: "log" },
      { x: 370, y: 246, w: 214, h: 20, type: "log" },
      { x: 626, y: 276, w: 166, h: 20, type: "log" },
      { x: 650, y: 422, w: 330, h: 160, type: "ground" },
      { x: 742, y: 352, w: 74, h: 70, type: "stone" },
      { x: 806, y: 318, w: 80, h: 104, type: "stone" },
    ],
    red: [{ x: 70, y: 438 }, { x: 116, y: 438 }, { x: 162, y: 438 }, { x: 208, y: 438 }, { x: 254, y: 274 }, { x: 300, y: 274 }],
    blue: [{ x: 694, y: 422 }, { x: 740, y: 422 }, { x: 786, y: 352 }, { x: 832, y: 318 }, { x: 878, y: 318 }, { x: 924, y: 318 }],
    clouds: [{ x: 94, y: 118, w: 182, h: 58 }, { x: 352, y: 102, w: 220, h: 68 }, { x: 714, y: 132, w: 166, h: 50 }],
  },
];

const COPY = {
  es: {
    title: "Territory War: Stick Arena",
    subtitle: "Combate tactico por turnos con stickmen, granadas y posicionamiento de altura.",
    start: "Iniciar batalla",
    restart: "Reiniciar",
    pause: "Pausa",
    resume: "Continuar",
    fullscreen: "Pantalla completa",
    map: "Mapa",
    teamSize: "Tamano por equipo",
    turn: "Turno",
    wind: "Viento",
    movement: "Movimiento",
    timer: "Tiempo",
    controls: "A/D o flechas mover, W/arriba saltar, Q/E ajustar angulo, mantener Espacio o click para potencia y soltar para lanzar. P pausa, R reinicia, F pantalla completa.",
    objective: "Elimina al equipo rival con posicionamiento y tiro paraboloide. El ultimo equipo vivo gana.",
    winner: "Ganador",
    battleOver: "Batalla terminada",
  },
  en: {
    title: "Territory War: Stick Arena",
    subtitle: "Turn-based tactical combat with stickmen, grenades, and high-ground positioning.",
    start: "Start battle",
    restart: "Restart",
    pause: "Pause",
    resume: "Resume",
    fullscreen: "Fullscreen",
    map: "Map",
    teamSize: "Team size",
    turn: "Turn",
    wind: "Wind",
    movement: "Move",
    timer: "Time",
    controls: "A/D or arrows move, W/up jumps, Q/E adjust aim, hold Space or mouse to charge and release to throw. P pause, R restart, F fullscreen.",
    objective: "Eliminate the enemy team with positioning and ballistic throws. Last team alive wins.",
    winner: "Winner",
    battleOver: "Battle over",
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function localeOf(code) {
  return code === "es" ? "es" : "en";
}

function findMap(id) {
  return MAPS.find((map) => map.id === id) ?? MAPS[0];
}

function createInput() {
  const down = new Set();
  const pressed = new Set();
  return {
    press(code) {
      if (!down.has(code)) {
        pressed.add(code);
      }
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

function createRng(seed = Date.now()) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createUnits(teamSize, map) {
  const units = [];
  for (let index = 0; index < teamSize; index += 1) {
    units.push({
      id: `red-${index}`,
      team: "red",
      slot: index,
      name: NAMES.red[index],
      x: map.red[index].x,
      y: map.red[index].y,
      vx: 0,
      vy: 0,
      onGround: true,
      facing: 1,
      health: 100,
      alive: true,
      flashMs: 0,
    });
    units.push({
      id: `blue-${index}`,
      team: "blue",
      slot: index,
      name: NAMES.blue[index],
      x: map.blue[index].x,
      y: map.blue[index].y,
      vx: 0,
      vy: 0,
      onGround: true,
      facing: -1,
      health: 100,
      alive: true,
      flashMs: 0,
    });
  }
  return units;
}

function getAlive(state, teamId) {
  return state.units.filter((unit) => unit.team === teamId && unit.alive);
}

function getUnit(state, unitId) {
  return state.units.find((unit) => unit.id === unitId) ?? null;
}

function getActiveUnit(state) {
  return getUnit(state, state.turn.unitId);
}

function defaultAim(teamId) {
  return teamId === "red" ? 38 : 142;
}

function createState({ locale, mapId = "wasteland", teamSize = 3, mode = "menu" }) {
  const safeLocale = localeOf(locale);
  const safeTeamSize = clamp(Math.round(teamSize), 1, 6);
  const map = findMap(mapId);
  const units = createUnits(safeTeamSize, map);
  return {
    mode,
    phase: mode === "menu" ? "menu" : "playing",
    locale: safeLocale,
    mapId: map.id,
    mapName: map.name[safeLocale] ?? map.name.en,
    map,
    teamSize: safeTeamSize,
    units,
    rng: createRng(),
    turn: {
      number: 1,
      team: "red",
      unitId: units.find((unit) => unit.team === "red")?.id ?? null,
      remainingMs: TURN_MS,
      movementLeft: MOVE_BUDGET,
      aimDeg: defaultAim("red"),
      charge: 0.2,
      charging: false,
      acted: false,
      settleMs: 0,
      state: "ready",
      cursor: { red: -1, blue: -1 },
    },
    wind: 0,
    projectile: null,
    explosions: [],
    ai: {
      stage: "idle",
      timerMs: 0,
      desiredAim: defaultAim("blue"),
      desiredCharge: 0.64,
      targetId: null,
    },
    pointer: { x: WIDTH * 0.5, y: HEIGHT * 0.5, inside: false, down: false },
    virtual: { left: false, right: false, jump: false, aimUp: false, aimDown: false, fire: false },
    cameraShake: 0,
    winner: null,
    isFullscreen: false,
    frame: 0,
  };
}

function selectNextUnit(state, teamId) {
  const units = state.units.filter((unit) => unit.team === teamId).sort((a, b) => a.slot - b.slot);
  if (!units.length) {
    return null;
  }
  const alive = units.filter((unit) => unit.alive);
  if (!alive.length) {
    return null;
  }
  const start = state.turn.cursor[teamId] ?? -1;
  for (let offset = 1; offset <= units.length; offset += 1) {
    const index = (start + offset) % units.length;
    if (units[index].alive) {
      state.turn.cursor[teamId] = index;
      return units[index];
    }
  }
  return alive[0];
}

function startTurn(state, teamId) {
  const unit = selectNextUnit(state, teamId);
  if (!unit) {
    return false;
  }
  state.turn.team = teamId;
  state.turn.unitId = unit.id;
  state.turn.remainingMs = TURN_MS;
  state.turn.movementLeft = MOVE_BUDGET;
  state.turn.aimDeg = defaultAim(teamId);
  state.turn.charge = 0.2;
  state.turn.charging = false;
  state.turn.acted = false;
  state.turn.settleMs = 0;
  state.turn.state = "ready";
  state.wind = (state.rng() - 0.5) * 90;
  if (TEAM[teamId].cpu) {
    state.ai.stage = "thinking";
    state.ai.timerMs = 620 + state.rng() * 620;
  } else {
    state.ai.stage = "idle";
    state.ai.timerMs = 0;
  }
  return true;
}

function battleFromMenu(state) {
  const fresh = createState({ locale: state.locale, mapId: state.mapId, teamSize: state.teamSize, mode: "battle" });
  startTurn(fresh, "red");
  return fresh;
}

function restartFromAny(state) {
  const fresh = createState({
    locale: state.locale,
    mapId: state.mapId,
    teamSize: state.teamSize,
    mode: state.mode === "menu" ? "menu" : "battle",
  });
  if (fresh.mode === "battle") {
    startTurn(fresh, "red");
  }
  return fresh;
}

function applyUnitPhysics(state, dt) {
  for (const unit of state.units) {
    if (!unit.alive) {
      continue;
    }
    if (unit.flashMs > 0) {
      unit.flashMs = Math.max(0, unit.flashMs - dt * 1000);
    }
    unit.vy += GRAVITY * dt;
    const previousX = unit.x;
    const previousY = unit.y;
    unit.x += unit.vx * dt;
    unit.y += unit.vy * dt;
    unit.x = clamp(unit.x, 12, WIDTH - 12);
    let landed = false;
    for (const platform of state.map.platforms) {
      const minX = platform.x + 6;
      const maxX = platform.x + platform.w - 6;
      if (unit.x < minX || unit.x > maxX) {
        continue;
      }
      if (previousY <= platform.y && unit.y >= platform.y && unit.vy >= 0) {
        unit.y = platform.y;
        unit.vy = 0;
        landed = true;
        break;
      }
    }
    unit.onGround = landed;
    if (landed) {
      unit.vx *= 0.82;
      if (Math.abs(unit.vx) < 2) {
        unit.vx = 0;
      }
    }
    if (unit.y > HEIGHT + 96) {
      unit.alive = false;
      unit.health = 0;
      unit.vx = 0;
      unit.vy = 0;
      unit.y = HEIGHT + 90;
      unit.x = clamp(previousX, 12, WIDTH - 12);
    }
  }
}

function chooseAiShot(unit, target, state) {
  if (!unit || !target) {
    return { angle: 136, charge: 0.65 };
  }
  const sx = unit.x;
  const sy = unit.y - 28;
  const tx = target.x;
  const ty = target.y - 24;
  const dx = tx - sx;
  const dy = ty - sy;
  let best = null;
  for (let angle = 18; angle <= 164; angle += 2) {
    const r = (angle * Math.PI) / 180;
    const cos = Math.cos(r);
    if (Math.abs(cos) < 0.05) {
      continue;
    }
    const denom = 2 * cos * cos * (dx * Math.tan(r) - dy);
    if (Math.abs(denom) < 1e-3) {
      continue;
    }
    const speedSq = (GRAVITY * dx * dx) / denom;
    if (speedSq <= 0 || !Number.isFinite(speedSq)) {
      continue;
    }
    const speed = Math.sqrt(speedSq);
    const charge = (speed - THROW_BASE) / THROW_SCALE;
    if (charge < 0.2 || charge > 1) {
      continue;
    }
    const score = Math.abs(speed - (THROW_BASE + 0.62 * THROW_SCALE)) + Math.abs(98 - angle) * 1.4;
    if (!best || score < best.score) {
      best = { angle, charge, score };
    }
  }
  if (!best) {
    return {
      angle: dx >= 0 ? 44 : 136,
      charge: clamp(0.44 + (Math.abs(dx) / WIDTH) * 0.34, 0.24, 0.95),
    };
  }
  return {
    angle: clamp(best.angle + (state.rng() - 0.5) * 6, 14, 166),
    charge: clamp(best.charge + (state.rng() - 0.5) * 0.1, 0.2, 1),
  };
}

function spawnProjectile(state, unit) {
  if (!unit || !unit.alive) {
    return;
  }
  const rad = (state.turn.aimDeg * Math.PI) / 180;
  const speed = THROW_BASE + state.turn.charge * THROW_SCALE;
  state.projectile = {
    x: unit.x + Math.cos(rad) * 18,
    y: unit.y - 30 + Math.sin(rad) * 8,
    vx: Math.cos(rad) * speed,
    vy: Math.sin(rad) * speed,
    radius: 6,
    fuseMs: 1650,
    bounces: 0,
  };
  state.turn.charging = false;
  state.turn.acted = true;
  state.turn.state = "resolving";
}

function detonate(state, x, y) {
  state.explosions.push({ x, y, radius: 14, maxRadius: BLAST_RADIUS, lifeMs: 360 });
  state.projectile = null;
  state.cameraShake = Math.max(state.cameraShake, 1);
  for (const unit of state.units) {
    if (!unit.alive) {
      continue;
    }
    const ux = unit.x;
    const uy = unit.y - 24;
    const dx = ux - x;
    const dy = uy - y;
    const dist = Math.hypot(dx, dy);
    if (dist > BLAST_RADIUS) {
      continue;
    }
    const ratio = 1 - dist / BLAST_RADIUS;
    const damage = Math.max(6, Math.round(BLAST_DAMAGE * ratio * ratio));
    unit.health = Math.max(0, unit.health - damage);
    unit.flashMs = 200;
    const nx = dist > 0 ? dx / dist : 0;
    const ny = dist > 0 ? dy / dist : -1;
    const impulse = 300 * ratio;
    unit.vx += nx * impulse;
    unit.vy -= Math.abs(ny) * impulse + 120 * ratio;
    unit.onGround = false;
    if (unit.health <= 0) {
      unit.alive = false;
    }
  }
  state.turn.settleMs = 900;
}

function applyProjectilePhysics(state, dt) {
  const p = state.projectile;
  if (!p) {
    return;
  }
  const px = p.x;
  const py = p.y;
  p.vx += state.wind * dt * 0.44;
  p.vy += GRAVITY * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.fuseMs -= dt * 1000;
  if (p.x - p.radius < 0) {
    p.x = p.radius;
    p.vx = Math.abs(p.vx) * 0.58;
    p.bounces += 1;
  } else if (p.x + p.radius > WIDTH) {
    p.x = WIDTH - p.radius;
    p.vx = -Math.abs(p.vx) * 0.58;
    p.bounces += 1;
  }
  if (p.y - p.radius < 0) {
    p.y = p.radius;
    p.vy = Math.abs(p.vy) * 0.58;
    p.bounces += 1;
  }
  for (const platform of state.map.platforms) {
    const left = platform.x;
    const right = platform.x + platform.w;
    const top = platform.y;
    const bottom = platform.y + platform.h;
    const hitX = p.x >= left - p.radius && p.x <= right + p.radius;
    const hitY = p.y >= top - p.radius && p.y <= bottom + p.radius;
    if (!hitX || !hitY) {
      continue;
    }
    const topCross = py + p.radius <= top && p.y + p.radius >= top && p.vy > 0;
    const bottomCross = py - p.radius >= bottom && p.y - p.radius <= bottom && p.vy < 0;
    const leftCross = px + p.radius <= left && p.x + p.radius >= left && p.vx > 0;
    const rightCross = px - p.radius >= right && p.x - p.radius <= right && p.vx < 0;
    if (topCross) {
      p.y = top - p.radius;
      p.vy = -Math.abs(p.vy) * 0.54;
      p.vx *= 0.92;
      p.bounces += 1;
      continue;
    }
    if (bottomCross) {
      p.y = bottom + p.radius;
      p.vy = Math.abs(p.vy) * 0.5;
      p.bounces += 1;
      continue;
    }
    if (leftCross) {
      p.x = left - p.radius;
      p.vx = -Math.abs(p.vx) * 0.58;
      p.bounces += 1;
      continue;
    }
    if (rightCross) {
      p.x = right + p.radius;
      p.vx = Math.abs(p.vx) * 0.58;
      p.bounces += 1;
    }
  }
  if (p.fuseMs <= 0 || p.bounces >= 7 || p.y > HEIGHT + 86) {
    detonate(state, clamp(p.x, 0, WIDTH), clamp(p.y, 0, HEIGHT));
  }
}

function updateExplosions(state, dt) {
  if (state.cameraShake > 0) {
    state.cameraShake = Math.max(0, state.cameraShake - dt * 2.6);
  }
  for (let index = state.explosions.length - 1; index >= 0; index -= 1) {
    const e = state.explosions[index];
    e.lifeMs -= dt * 1000;
    const t = 1 - clamp(e.lifeMs / 360, 0, 1);
    e.radius = 14 + (e.maxRadius - 14) * t;
    if (e.lifeMs <= 0) {
      state.explosions.splice(index, 1);
    }
  }
}

function checkBattleEnd(state) {
  const red = getAlive(state, "red").length;
  const blue = getAlive(state, "blue").length;
  if (red > 0 && blue > 0) {
    return false;
  }
  state.winner = red <= 0 && blue <= 0 ? "draw" : red > 0 ? "red" : "blue";
  state.phase = "match-over";
  state.mode = "battle-over";
  state.turn.charging = false;
  state.projectile = null;
  state.ai.stage = "idle";
  return true;
}

function handleHumanTurn(state, input, dt) {
  const unit = getActiveUnit(state);
  if (!unit || !unit.alive) {
    return;
  }
  const controls = state.virtual;
  const pointer = state.pointer;
  const left = input.down("ArrowLeft") || input.down("KeyA") || controls.left;
  const right = input.down("ArrowRight") || input.down("KeyD") || controls.right;
  const jump = input.pressed("ArrowUp") || input.pressed("KeyW") || controls.jump;
  const aimUp = input.down("ArrowUp") || input.down("KeyQ") || controls.aimUp;
  const aimDown = input.down("ArrowDown") || input.down("KeyE") || controls.aimDown;
  const fireHeld = input.down("Space") || controls.fire || pointer.down;
  const cancel = input.pressed("KeyX");

  if (pointer.inside) {
    const dx = pointer.x - unit.x;
    const dy = pointer.y - (unit.y - 28);
    if (Math.hypot(dx, dy) > 14) {
      state.turn.aimDeg = clamp((Math.atan2(dy, dx) * 180) / Math.PI, 14, 166);
    }
  } else if (aimUp || aimDown) {
    state.turn.aimDeg = clamp(state.turn.aimDeg + (aimUp ? -1 : 1) * 84 * dt, 14, 166);
  }
  const aimRad = (state.turn.aimDeg * Math.PI) / 180;
  const horizontal = Math.cos(aimRad);
  if (horizontal > 0.06) {
    unit.facing = 1;
  } else if (horizontal < -0.06) {
    unit.facing = -1;
  }

  if (!state.turn.acted && !state.projectile) {
    const direction = Number(right) - Number(left);
    if (direction !== 0 && state.turn.movementLeft > 0) {
      const speed = unit.onGround ? MOVE_SPEED : AIR_CONTROL;
      unit.vx = direction * speed;
      if (unit.onGround) {
        state.turn.movementLeft = Math.max(0, state.turn.movementLeft - Math.abs(unit.vx) * dt);
      }
      unit.facing = direction > 0 ? 1 : -1;
    } else if (unit.onGround) {
      unit.vx *= 0.7;
      if (Math.abs(unit.vx) < 3) {
        unit.vx = 0;
      }
    }
    if (jump && unit.onGround) {
      unit.vy = -JUMP_SPEED;
      unit.onGround = false;
    }
  }

  if (cancel) {
    state.turn.charging = false;
    state.turn.charge = 0.2;
    state.turn.state = "aiming";
  }
  if (!state.turn.acted && !state.projectile) {
    if (fireHeld) {
      state.turn.charging = true;
      state.turn.charge = clamp(state.turn.charge + dt * 0.8, 0.2, 1);
      state.turn.state = "charging";
    } else if (state.turn.charging) {
      spawnProjectile(state, unit);
    } else {
      state.turn.state = "aiming";
    }
  }
}

function handleCpuTurn(state, dt) {
  const unit = getActiveUnit(state);
  if (!unit || !unit.alive || state.turn.acted || state.projectile) {
    return;
  }
  if (state.ai.stage === "thinking") {
    state.ai.timerMs -= dt * 1000;
    const enemies = getAlive(state, "red");
    if (enemies.length) {
      const target = enemies.reduce((best, enemy) => {
        if (!best) return enemy;
        return Math.abs(enemy.x - unit.x) < Math.abs(best.x - unit.x) ? enemy : best;
      }, null);
      state.ai.targetId = target?.id ?? null;
      if (state.turn.movementLeft > 40 && state.ai.timerMs > 260 && target) {
        const dir = Math.sign(target.x - unit.x);
        unit.vx = dir * 78;
        state.turn.movementLeft = Math.max(0, state.turn.movementLeft - Math.abs(unit.vx) * dt);
      }
    }
    if (state.ai.timerMs <= 0) {
      const target = getUnit(state, state.ai.targetId) ?? getAlive(state, "red")[0] ?? null;
      const shot = chooseAiShot(unit, target, state);
      state.ai.desiredAim = shot.angle;
      state.ai.desiredCharge = shot.charge;
      state.ai.stage = "charging";
      state.turn.state = "aiming";
    }
    return;
  }
  if (state.ai.stage === "charging") {
    state.turn.aimDeg = clamp(state.turn.aimDeg + Math.sign(state.ai.desiredAim - state.turn.aimDeg) * 62 * dt, 14, 166);
    state.turn.charging = true;
    state.turn.charge = clamp(state.turn.charge + dt * 0.72, 0.2, 1);
    state.turn.state = "charging";
    if (state.turn.charge >= state.ai.desiredCharge - 0.01 && Math.abs(state.turn.aimDeg - state.ai.desiredAim) < 2.8) {
      spawnProjectile(state, unit);
      state.ai.stage = "idle";
    }
  }
}

function maybeAdvanceTurn(state, dt) {
  if (state.phase !== "playing" || state.projectile) {
    return;
  }
  if (state.turn.acted) {
    if (state.turn.settleMs > 0) {
      state.turn.settleMs = Math.max(0, state.turn.settleMs - dt * 1000);
      state.turn.state = "resolving";
      return;
    }
    state.turn.number += 1;
    startTurn(state, state.turn.team === "red" ? "blue" : "red");
    return;
  }
  if (state.turn.remainingMs <= 0) {
    state.turn.charging = false;
    state.turn.charge = 0.2;
    state.turn.acted = true;
    state.turn.settleMs = 260;
    state.turn.state = "resolving";
  }
}

function stepState(state, input, dt) {
  if (input.pressed("KeyR")) {
    Object.assign(state, restartFromAny(state));
    return;
  }
  if (input.pressed("KeyP") && state.mode !== "menu") {
    state.phase = state.phase === "paused" ? "playing" : "paused";
  }
  if (state.mode === "menu") {
    state.turn.state = "ready";
    return;
  }
  if (state.phase === "paused" || state.phase === "match-over") {
    updateExplosions(state, dt);
    return;
  }
  const active = getActiveUnit(state);
  if ((!active || !active.alive) && !state.turn.acted && !state.projectile) {
    state.turn.charging = false;
    state.turn.charge = 0.2;
    state.turn.acted = true;
    state.turn.settleMs = Math.max(state.turn.settleMs, 220);
    state.turn.state = "resolving";
  }
  state.turn.remainingMs = Math.max(0, state.turn.remainingMs - dt * 1000);
  if (TEAM[state.turn.team].cpu) {
    handleCpuTurn(state, dt);
  } else {
    handleHumanTurn(state, input, dt);
  }
  applyProjectilePhysics(state, dt);
  applyUnitPhysics(state, dt);
  updateExplosions(state, dt);
  if (checkBattleEnd(state)) {
    return;
  }
  maybeAdvanceTurn(state, dt);
  state.frame += 1;
}

function windText(value, locale) {
  const dir = value < 0 ? (locale === "es" ? "Izq" : "Left") : locale === "es" ? "Der" : "Right";
  return `${dir} ${Math.abs(Math.round(value))}`;
}

function teamLabel(teamId, locale) {
  if (teamId === "red") {
    return locale === "es" ? "Kings" : "Kings";
  }
  return locale === "es" ? "CPU" : "CPU";
}

function drawCloud(ctx, cloud) {
  const { x, y, w, h } = cloud;
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.26, h * 0.44, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.2, y - h * 0.12, w * 0.3, h * 0.5, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.42, y, w * 0.24, h * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlatform(ctx, platform, theme) {
  if (platform.type === "log") {
    ctx.fillStyle = "#a16207";
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
    ctx.strokeStyle = "#713f12";
    ctx.lineWidth = 2;
    ctx.strokeRect(platform.x, platform.y, platform.w, platform.h);
    for (let x = platform.x + 2; x < platform.x + platform.w - 2; x += 24) {
      ctx.beginPath();
      ctx.fillStyle = "#b45309";
      ctx.arc(x + 10, platform.y + platform.h * 0.5, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (platform.type === "stone") {
    ctx.fillStyle = "#9ca3af";
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(platform.x + 3, platform.y + 3, platform.w - 6, 5);
    ctx.strokeStyle = "#4b5563";
    ctx.lineWidth = 2;
    ctx.strokeRect(platform.x, platform.y, platform.w, platform.h);
    return;
  }
  ctx.fillStyle = theme.dirt;
  ctx.fillRect(platform.x, platform.y + 14, platform.w, platform.h - 14);
  ctx.fillStyle = theme.grass;
  ctx.fillRect(platform.x, platform.y, platform.w, 18);
}

function drawUnit(ctx, unit, active) {
  ctx.save();
  ctx.globalAlpha = unit.alive ? 1 : 0.35;
  ctx.strokeStyle = unit.flashMs > 0 ? "#fef08a" : "#0f172a";
  ctx.lineWidth = 2.4;
  const headX = unit.x;
  const headY = unit.y - 34;
  ctx.beginPath();
  ctx.fillStyle = "#0b1222";
  ctx.arc(headX, headY, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(unit.x, unit.y - 27);
  ctx.lineTo(unit.x, unit.y - 10);
  ctx.moveTo(unit.x, unit.y - 22);
  ctx.lineTo(unit.x - 8, unit.y - 16);
  ctx.moveTo(unit.x, unit.y - 22);
  ctx.lineTo(unit.x + 10, unit.y - 16);
  ctx.moveTo(unit.x, unit.y - 10);
  ctx.lineTo(unit.x - 8, unit.y);
  ctx.moveTo(unit.x, unit.y - 10);
  ctx.lineTo(unit.x + 8, unit.y);
  ctx.stroke();
  ctx.fillStyle = TEAM[unit.team].color;
  ctx.fillRect(unit.x - 20, unit.y - 58, 40, 4);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(unit.name, unit.x, unit.y - 62);
  if (unit.alive) {
    ctx.fillStyle = "#111827";
    ctx.fillRect(unit.x - 22, unit.y + 4, 44, 6);
    ctx.fillStyle = TEAM[unit.team].color;
    ctx.fillRect(unit.x - 22, unit.y + 4, 44 * (unit.health / 100), 6);
    ctx.strokeStyle = "rgba(15,23,42,0.85)";
    ctx.strokeRect(unit.x - 22, unit.y + 4, 44, 6);
  }
  if (active && unit.alive) {
    ctx.fillStyle = TEAM[unit.team].color;
    ctx.beginPath();
    ctx.moveTo(unit.x, unit.y - 76);
    ctx.lineTo(unit.x - 12, unit.y - 90);
    ctx.lineTo(unit.x + 12, unit.y - 90);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawProjectile(ctx, projectile) {
  if (!projectile) {
    return;
  }
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(projectile.x, projectile.y, projectile.radius + 2, 0.2, 1.7);
  ctx.stroke();
}

function drawAim(ctx, state, unit) {
  if (!unit || !unit.alive || state.turn.acted || state.projectile) {
    return;
  }
  const angle = (state.turn.aimDeg * Math.PI) / 180;
  const ox = unit.x;
  const oy = unit.y - 28;
  const len = 56 + 54 * state.turn.charge;
  const tx = ox + Math.cos(angle) * len;
  const ty = oy + Math.sin(angle) * len;
  ctx.strokeStyle = "rgba(15,23,42,0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.fillStyle = "#22d3ee";
  for (let i = 1; i <= 5; i += 1) {
    const r = i / 6;
    ctx.beginPath();
    ctx.arc(ox + (tx - ox) * r, oy + (ty - oy) * r, 2.4 - r * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawExplosions(ctx, explosions) {
  for (const e of explosions) {
    const alpha = clamp(e.lifeMs / 360, 0, 1);
    ctx.globalAlpha = alpha * 0.78;
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha * 0.28;
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius * 0.56, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawState(ctx, state, copy) {
  const { theme } = state.map;
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, theme.skyTop);
  gradient.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = theme.mountain;
  ctx.globalAlpha = 0.42;
  ctx.beginPath();
  ctx.moveTo(0, HEIGHT);
  ctx.lineTo(120, 300);
  ctx.lineTo(280, 340);
  ctx.lineTo(450, 286);
  ctx.lineTo(620, 346);
  ctx.lineTo(790, 282);
  ctx.lineTo(960, 332);
  ctx.lineTo(960, HEIGHT);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  state.map.clouds.forEach((cloud) => drawCloud(ctx, cloud));
  state.map.platforms.forEach((platform) => drawPlatform(ctx, platform, theme));
  const active = getActiveUnit(state);
  state.units.forEach((unit) => drawUnit(ctx, unit, state.phase === "playing" && active?.id === unit.id));
  drawProjectile(ctx, state.projectile);
  drawExplosions(ctx, state.explosions);
  drawAim(ctx, state, active);

  ctx.fillStyle = "rgba(2,6,23,0.45)";
  ctx.fillRect(0, 0, WIDTH, 40);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 14px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${teamLabel("red", state.locale)} ${getAlive(state, "red").length}`, 18, 24);
  ctx.textAlign = "right";
  ctx.fillText(`${getAlive(state, "blue").length} ${teamLabel("blue", state.locale)}`, WIDTH - 18, 24);
  ctx.textAlign = "center";
  ctx.fillText(`${copy.turn} ${state.turn.number} - ${windText(state.wind, state.locale)}`, WIDTH * 0.5, 24);
}

function snapshotOf(state) {
  const active = getActiveUnit(state);
  return {
    mode: state.mode,
    phase: state.phase,
    locale: state.locale,
    mapId: state.mapId,
    mapName: state.mapName,
    teamSize: state.teamSize,
    winner: state.winner,
    wind: state.wind,
    turn: {
      number: state.turn.number,
      team: state.turn.team,
      unitId: state.turn.unitId,
      unitName: active?.name ?? null,
      remainingMs: state.turn.remainingMs,
      movementLeft: state.turn.movementLeft,
      aimDeg: state.turn.aimDeg,
      charge: state.turn.charge,
      charging: state.turn.charging,
      acted: state.turn.acted,
      state: state.turn.state,
    },
    teams: {
      red: { alive: getAlive(state, "red").length, total: state.teamSize },
      blue: { alive: getAlive(state, "blue").length, total: state.teamSize },
    },
    projectile: state.projectile
      ? { x: state.projectile.x, y: state.projectile.y, vx: state.projectile.vx, vy: state.projectile.vy, fuseMs: state.projectile.fuseMs }
      : null,
    units: state.units.map((unit) => ({
      id: unit.id,
      name: unit.name,
      team: unit.team,
      alive: unit.alive,
      x: unit.x,
      y: unit.y,
      vx: unit.vx,
      vy: unit.vy,
      health: unit.health,
      onGround: unit.onGround,
    })),
    coordinates: "origin_top_left_x_right_y_down_pixels",
    isFullscreen: state.isFullscreen,
  };
}

function textPayload(state) {
  return {
    mode: "territory-war",
    phase: state.phase,
    map: { id: state.mapId, name: state.mapName },
    turn: state.turn,
    teams: state.teams,
    winner: state.winner,
    wind: state.wind,
    projectile: state.projectile,
    units: state.units,
    coordinates: state.coordinates,
    isFullscreen: state.isFullscreen,
  };
}

function TerritoryWarGame() {
  const locale = useMemo(() => localeOf(resolveBrowserLanguage()), []);
  const copy = useMemo(() => COPY[locale], [locale]);
  const canvasRef = useRef(null);
  const shellRef = useRef(null);
  const stateRef = useRef(createState({ locale, mode: "menu" }));
  const inputRef = useRef(createInput());
  const [snapshot, setSnapshot] = useState(() => snapshotOf(stateRef.current));

  const sync = useCallback(() => {
    setSnapshot(snapshotOf(stateRef.current));
  }, []);

  const requestFullscreen = useCallback(async () => {
    const element = shellRef.current;
    if (!element) {
      return;
    }
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      } else if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      }
    } catch {
      // ignore
    }
  }, []);

  const start = useCallback(() => {
    stateRef.current = battleFromMenu(stateRef.current);
    sync();
  }, [sync]);

  const restart = useCallback(() => {
    stateRef.current = restartFromAny(stateRef.current);
    sync();
  }, [sync]);

  const pause = useCallback(() => {
    const state = stateRef.current;
    if (state.mode === "menu") {
      return;
    }
    state.phase = state.phase === "paused" ? "playing" : "paused";
    sync();
  }, [sync]);

  const setMap = useCallback((mapId) => {
    const state = stateRef.current;
    if (state.mode !== "menu") {
      return;
    }
    const map = findMap(mapId);
    state.mapId = map.id;
    state.mapName = map.name[state.locale] ?? map.name.en;
    state.map = map;
    state.units = createUnits(state.teamSize, map);
    state.turn.unitId = state.units.find((unit) => unit.team === "red")?.id ?? null;
    sync();
  }, [sync]);

  const setTeamSize = useCallback((value) => {
    const state = stateRef.current;
    if (state.mode !== "menu") {
      return;
    }
    state.teamSize = clamp(Number(value), 1, 6);
    state.units = createUnits(state.teamSize, state.map);
    state.turn.unitId = state.units.find((unit) => unit.team === "red")?.id ?? null;
    sync();
  }, [sync]);

  const setVirtual = useCallback((name, value) => {
    stateRef.current.virtual[name] = value;
  }, []);

  const holdProps = (name) => ({
    onMouseDown: () => setVirtual(name, true),
    onMouseUp: () => setVirtual(name, false),
    onMouseLeave: () => setVirtual(name, false),
    onTouchStart: (event) => {
      event.preventDefault();
      setVirtual(name, true);
    },
    onTouchEnd: (event) => {
      event.preventDefault();
      setVirtual(name, false);
    },
    onTouchCancel: () => setVirtual(name, false),
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return undefined;
    }
    let rafId = 0;
    let last = performance.now();
    let acc = 0;
    let snapAcc = 0;
    const frame = (ts) => {
      const delta = Math.min(90, ts - last);
      last = ts;
      acc += delta;
      while (acc >= DT_MS) {
        stepState(stateRef.current, inputRef.current, DT);
        acc -= DT_MS;
      }
      const state = stateRef.current;
      const shake = state.cameraShake * 5;
      const offsetX = shake > 0 ? (state.rng() - 0.5) * shake : 0;
      const offsetY = shake > 0 ? (state.rng() - 0.5) * shake : 0;
      ctx.save();
      ctx.translate(offsetX, offsetY);
      drawState(ctx, state, copy);
      ctx.restore();
      inputRef.current.clearPressed();
      snapAcc += delta;
      if (snapAcc >= 70) {
        setSnapshot(snapshotOf(stateRef.current));
        snapAcc = 0;
      }
      rafId = window.requestAnimationFrame(frame);
    };
    rafId = window.requestAnimationFrame(frame);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [copy]);

  useEffect(() => {
    const activeKeys = new Set([
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space",
      "KeyA", "KeyD", "KeyW", "KeyQ", "KeyE", "KeyX", "KeyR", "KeyP", "KeyF", "Enter",
    ]);
    const onDown = (event) => {
      if (!activeKeys.has(event.code)) {
        return;
      }
      if (event.code === "KeyF") {
        event.preventDefault();
        requestFullscreen();
        return;
      }
      if (event.code === "Enter" && stateRef.current.mode === "menu") {
        event.preventDefault();
        start();
        return;
      }
      event.preventDefault();
      inputRef.current.press(event.code);
    };
    const onUp = (event) => {
      if (!activeKeys.has(event.code)) {
        return;
      }
      event.preventDefault();
      inputRef.current.release(event.code);
    };
    const onFullscreen = () => {
      stateRef.current.isFullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      sync();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("webkitfullscreenchange", onFullscreen);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("webkitfullscreenchange", onFullscreen);
    };
  }, [requestFullscreen, start, sync]);

  const advanceTime = useCallback((ms) => {
    const total = Math.max(0, Number(ms) || 0);
    const steps = Math.max(1, Math.round(total / DT_MS));
    for (let i = 0; i < steps; i += 1) {
      stepState(stateRef.current, inputRef.current, DT);
      inputRef.current.clearPressed();
    }
    sync();
  }, [sync]);

  useGameRuntimeBridge(snapshot, textPayload, advanceTime);

  const isTouch = typeof window !== "undefined"
    && (window.matchMedia?.("(pointer: coarse)")?.matches || (navigator.maxTouchPoints ?? 0) > 0);
  const turnUnit = snapshot.units.find((unit) => unit.id === snapshot.turn.unitId) ?? null;

  return (
    <div className="mini-game territory-war-game">
      <div className="mini-head territory-war-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="territory-war-actions">
          <button type="button" onClick={start}>{copy.start}</button>
          <button type="button" onClick={restart}>{copy.restart}</button>
          <button type="button" onClick={pause}>{snapshot.phase === "paused" ? copy.resume : copy.pause}</button>
          <button type="button" onClick={requestFullscreen}>{copy.fullscreen}</button>
        </div>
      </div>

      <div className="territory-war-config">
        <label>
          <span>{copy.map}</span>
          <select value={snapshot.mapId} onChange={(event) => setMap(event.target.value)} disabled={snapshot.mode !== "menu"}>
            {MAPS.map((map) => <option key={map.id} value={map.id}>{map.name[locale] ?? map.name.en}</option>)}
          </select>
        </label>
        <label>
          <span>{copy.teamSize}</span>
          <select value={snapshot.teamSize} onChange={(event) => setTeamSize(event.target.value)} disabled={snapshot.mode !== "menu"}>
            {[1, 2, 3, 4, 5, 6].map((size) => <option key={size} value={size}>{size}v{size}</option>)}
          </select>
        </label>
      </div>

      <div className="territory-war-shell">
        <div className="territory-war-stage-shell" ref={shellRef}>
          <canvas
            ref={canvasRef}
            className="territory-war-canvas"
            width={WIDTH}
            height={HEIGHT}
            onPointerMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
              const y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
              stateRef.current.pointer.x = clamp(x, 0, WIDTH);
              stateRef.current.pointer.y = clamp(y, 0, HEIGHT);
              stateRef.current.pointer.inside = x >= 0 && x <= WIDTH && y >= 0 && y <= HEIGHT;
            }}
            onPointerDown={() => { stateRef.current.pointer.down = true; }}
            onPointerUp={() => { stateRef.current.pointer.down = false; }}
            onPointerLeave={() => { stateRef.current.pointer.down = false; stateRef.current.pointer.inside = false; }}
            aria-label="Territory War arena"
          />

          {snapshot.mode === "menu" ? (
            <div className="territory-war-overlay">
              <div className="territory-war-overlay-card">
                <h5>{copy.title}</h5>
                <p>{copy.objective}</p>
                <button type="button" onClick={start}>{copy.start}</button>
              </div>
            </div>
          ) : null}

          {snapshot.phase === "paused" ? (
            <div className="territory-war-overlay territory-war-overlay-muted">
              <div className="territory-war-overlay-card compact">
                <h5>{copy.pause}</h5>
                <button type="button" onClick={pause}>{copy.resume}</button>
              </div>
            </div>
          ) : null}

          {snapshot.phase === "match-over" ? (
            <div className="territory-war-overlay territory-war-overlay-muted">
              <div className="territory-war-overlay-card">
                <h5>{copy.battleOver}</h5>
                <p>
                  {copy.winner}:{" "}
                  <strong>
                    {snapshot.winner === "draw"
                      ? "Draw"
                      : teamLabel(snapshot.winner === "red" ? "red" : "blue", locale)}
                  </strong>
                </p>
                <button type="button" onClick={restart}>{copy.restart}</button>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="territory-war-sidebar">
          <section className="territory-war-panel">
            <h5>{copy.turn}</h5>
            <div className="territory-war-grid">
              <div><span>{copy.turn}</span><strong>{snapshot.turn.number}</strong></div>
              <div><span>{copy.timer}</span><strong>{Math.ceil(snapshot.turn.remainingMs / 1000)}s</strong></div>
              <div><span>{copy.movement}</span><strong>{Math.round(snapshot.turn.movementLeft)}</strong></div>
              <div><span>{copy.wind}</span><strong>{windText(snapshot.wind, locale)}</strong></div>
            </div>
            {turnUnit ? <p className="territory-war-turn-meta">{turnUnit.name} - {teamLabel(snapshot.turn.team, locale)} - {snapshot.turn.state}</p> : null}
          </section>
          <section className="territory-war-panel">
            <h5>{teamLabel("red", locale)}</h5>
            <p>{snapshot.teams.red.alive}/{snapshot.teams.red.total} alive</p>
            <div className="territory-war-health-track"><span style={{ width: `${(snapshot.teams.red.alive / Math.max(1, snapshot.teams.red.total)) * 100}%`, background: TEAM.red.color }} /></div>
          </section>
          <section className="territory-war-panel">
            <h5>{teamLabel("blue", locale)}</h5>
            <p>{snapshot.teams.blue.alive}/{snapshot.teams.blue.total} alive</p>
            <div className="territory-war-health-track"><span style={{ width: `${(snapshot.teams.blue.alive / Math.max(1, snapshot.teams.blue.total)) * 100}%`, background: TEAM.blue.color }} /></div>
          </section>
          <section className="territory-war-panel">
            <h5>Controls</h5>
            <p>{copy.controls}</p>
          </section>
        </aside>
      </div>

      {isTouch ? (
        <div className="territory-war-touch-controls">
          <div className="territory-war-touch-group">
            <button type="button" {...holdProps("left")}>Left</button>
            <button type="button" {...holdProps("right")}>Right</button>
            <button type="button" onTouchStart={(event) => { event.preventDefault(); setVirtual("jump", true); }} onTouchEnd={(event) => { event.preventDefault(); setVirtual("jump", false); }}>Jump</button>
          </div>
          <div className="territory-war-touch-group">
            <button type="button" {...holdProps("aimUp")}>Aim +</button>
            <button type="button" {...holdProps("aimDown")}>Aim -</button>
            <button type="button" {...holdProps("fire")}>Throw</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default TerritoryWarGame;
