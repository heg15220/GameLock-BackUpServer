import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const WIDTH = 960;
const HEIGHT = 520;
const DT = 1 / 60;
const DT_MS = 1000 / 60;
const TURN_MS = 30000;
const MOVE_BUDGET = 260;
const MOVE_SPEED = 128;
const AIR_CONTROL = 58;
const JUMP_SPEED = 350;
const GRAVITY = 840;
const THROW_BASE = 200;
const THROW_SCALE = 400;
const BLAST_RADIUS = 108;
const BLAST_DAMAGE = 90;
const MAX_JUMP_UP = 76;
const MAX_JUMP_GAP_UP = 210;
const MAX_JUMP_GAP_FLAT = 250;
const MAX_JUMP_GAP_DOWN = 340;

const TEAM = {
  red: { color: "#dc2626", dark: "#7f1d1d", light: "#fca5a5", cpu: false, label: "Kings" },
  blue: { color: "#1d4ed8", dark: "#1e3a8a", light: "#93c5fd", cpu: true, label: "CPU" },
};

const NAMES = {
  red: ["Carl", "Ozzy", "Dfox", "Mila", "Rook", "Nora"],
  blue: ["Bob", "Joe", "Vex", "Iris", "Zed", "Luna"],
};

// Physics reference (for map design):
//   JUMP_SPEED=350, GRAVITY=840 → max jump height ≈ 73px
//   Max reachable step-up per jump: ~65px (safe margin)
//   Horizontal distance during full jump arc: ~106px at MOVE_SPEED
//   Rule: vertical gaps ≤ 62px, horizontal gaps ≤ 190px between consecutive platforms
//   Spawns: units must land ON a platform surface (y = platform.y)

const MAPS = [
  // ─── MAP 1: WASTELAND ───────────────────────────────────────────────────────
  // Concept: Two large ground bases connected by a rising staircase of logs in the middle.
  // Both teams start at ground level and must climb through 3 log steps to reach the peak.
  // The centre log is the highest point and provides clear line-of-sight across the field.
  //
  //  RED BASE     step1    step2    step3   BLUE BASE
  //  y=420 ────   y=355    y=290    y=230   y=420 ────
  //               log      log      log
  {
    id: "wasteland",
    name: "Wasteland",
    water: false,
    skyColors: ["#6ab0ff", "#b8d8ff"],
    mountainColor: "#8fa8c4",
    groundColor: "#2d7a3a",
    dirtColor: "#6b4226",
    platforms: [
      // Red base: wide left ground, top surface y=420
      { x: -40, y: 420, w: 310, h: 160, type: "ground" },
      // Step 1: log, reachable from red base ground (Δy=65, horizontal gap ≈ 20px from base edge)
      { x: 240, y: 355, w: 160, h: 20, type: "log" },
      // Step 2: log, reachable from step 1 (Δy=65, gap ≈ 30px)
      { x: 375, y: 290, w: 160, h: 20, type: "log" },
      // Step 3 (peak): log, reachable from step 2 (Δy=60, gap ≈ 30px)
      { x: 510, y: 230, w: 160, h: 20, type: "log" },
      // Step 4: descending log toward blue, reachable from peak (Δy=55, gap ≈ 30px)
      { x: 645, y: 285, w: 160, h: 20, type: "log" },
      // Blue base: wide right ground, top surface y=420
      { x: 680, y: 420, w: 320, h: 160, type: "ground" },
      // Stone block on blue base giving mid-height cover (Δy=62 from base top)
      { x: 760, y: 358, w: 80, h: 62, type: "stone" },
      // Tall stone block against right wall (step up from shorter stone, Δy=58)
      { x: 848, y: 300, w: 80, h: 120, type: "stone" },
    ],
    // Spawn y = platform.y (surface), units stand on surface
    red: [
      { x: 50,  y: 420 }, { x: 100, y: 420 }, { x: 150, y: 420 },
      { x: 200, y: 420 }, { x: 250, y: 420 }, { x: 270, y: 355 },
    ],
    blue: [
      { x: 730, y: 420 }, { x: 780, y: 420 }, { x: 820, y: 420 },
      { x: 870, y: 420 }, { x: 790, y: 358 }, { x: 868, y: 300 },
    ],
    clouds: [
      { x: 110, y: 108, w: 175, h: 56 },
      { x: 380, y: 140, w: 205, h: 65 },
      { x: 700, y: 100, w: 162, h: 52 },
    ],
  },

  // ─── MAP 2: ARCHIPELAGO ─────────────────────────────────────────────────────
  // Concept: Water map. Two island bases separated by three floating log islands.
  // Movement forces risky jumps over water. Middle island is neutral high ground.
  // Vertical layout is relatively flat — tactical interest comes from the gaps over water.
  //
  //  ISLAND L   float1   CENTRE   float2  ISLAND R
  //  y=400 ──   y=370    y=340    y=370   y=400 ──
  {
    id: "archipelago",
    name: "Archipelago",
    water: true,
    skyColors: ["#4a9fe0", "#b8e0ff"],
    mountainColor: "#5a8ab0",
    groundColor: "#16a34a",
    dirtColor: "#5f4020",
    platforms: [
      // Left island base, surface y=400
      { x: -30, y: 400, w: 260, h: 160, type: "ground" },
      // Left mid-float log, y=370, reachable by jump from left island (Δy=30, gap≈30px)
      { x: 200, y: 370, w: 140, h: 20, type: "log" },
      // Left stone platform on left island, gives height option (Δy=62 from y=400)
      { x: 60,  y: 338, w: 100, h: 62, type: "stone" },
      // Centre island log, y=340, reachable from left float (Δy=30, gap≈30px)
      { x: 370, y: 340, w: 220, h: 20, type: "log" },
      // Right mid-float log, y=370, reachable from centre (Δy=30, gap≈30px, other side)
      { x: 620, y: 370, w: 140, h: 20, type: "log" },
      // Right island base, surface y=400
      { x: 700, y: 400, w: 300, h: 160, type: "ground" },
      // Right stone on right island (Δy=62 from y=400)
      { x: 800, y: 338, w: 100, h: 62, type: "stone" },
      // Tall stone on right wall (Δy=58 from shorter stone, total Δy=120 from base — two jumps)
      { x: 858, y: 280, w: 82, h: 120, type: "stone" },
    ],
    red: [
      { x: 40,  y: 400 }, { x: 85,  y: 400 }, { x: 130, y: 400 },
      { x: 175, y: 400 }, { x: 100, y: 338 }, { x: 215, y: 370 },
    ],
    blue: [
      { x: 750, y: 400 }, { x: 795, y: 400 }, { x: 840, y: 400 },
      { x: 885, y: 400 }, { x: 820, y: 338 }, { x: 643, y: 370 },
    ],
    clouds: [
      { x: 80,  y: 95,  w: 160, h: 50 },
      { x: 360, y: 115, w: 230, h: 72 },
      { x: 720, y: 90,  w: 170, h: 54 },
    ],
  },

  // ─── MAP 3: MESA ────────────────────────────────────────────────────────────
  // Concept: Both teams start on tall plateau bases at the same height.
  // The ground between them is a lower pit. Teams must go DOWN into the pit
  // or hold the high ground advantage. Three floating logs in the pit connect laterally.
  //
  //  RED MESA     pit-log1  pit-log2  pit-log3   BLUE MESA
  //  y=260 ─────  y=390     y=360     y=390      y=260 ─────
  //  (tall cliff)  (low)    (mid)     (low)      (tall cliff)
  //                         pit floor y=490
  {
    id: "mesa",
    name: "Mesa",
    water: false,
    skyColors: ["#e8b86d", "#ffe8b0"],
    mountainColor: "#c08840",
    groundColor: "#b45309",
    dirtColor: "#92400e",
    platforms: [
      // Red mesa: tall plateau, surface y=260, height 300
      { x: -40, y: 260, w: 290, h: 300, type: "ground" },
      // Ledge on red mesa (step down from mesa top, Δy=60 — one jump down & land)
      { x: 210, y: 320, w: 100, h: 60, type: "stone" },
      // Pit floor left section, y=460
      { x: 270, y: 460, w: 140, h: 100, type: "ground" },
      // Pit log left, y=390 — reachable from pit floor (Δy=70, at limit) or drop from ledge
      { x: 305, y: 390, w: 130, h: 20, type: "log" },
      // Pit log centre (highest in pit), y=330 — reachable from pit-log-left (Δy=60)
      { x: 415, y: 340, w: 130, h: 20, type: "log" },
      // Pit log right, y=390 — reachable from pit-log-centre (Δy=50, going down)
      { x: 525, y: 390, w: 130, h: 20, type: "log" },
      // Pit floor right section, y=460
      { x: 550, y: 460, w: 140, h: 100, type: "ground" },
      // Ledge on blue mesa (step down from mesa top, Δy=60)
      { x: 650, y: 320, w: 100, h: 60, type: "stone" },
      // Blue mesa: tall plateau, surface y=260
      { x: 710, y: 260, w: 290, h: 300, type: "ground" },
    ],
    red: [
      { x: 40,  y: 260 }, { x: 90,  y: 260 }, { x: 140, y: 260 },
      { x: 190, y: 260 }, { x: 240, y: 260 }, { x: 225, y: 320 },
    ],
    blue: [
      { x: 760, y: 260 }, { x: 810, y: 260 }, { x: 860, y: 260 },
      { x: 910, y: 260 }, { x: 718, y: 260 }, { x: 670, y: 320 },
    ],
    clouds: [
      { x: 150, y: 120, w: 160, h: 50 },
      { x: 390, y: 100, w: 200, h: 60 },
      { x: 680, y: 130, w: 155, h: 48 },
    ],
  },

  // ─── MAP 4: GRAVEYARD ───────────────────────────────────────────────────────
  // Concept: Spooky flat-ish map with stepped stone platforms on each side rising toward
  // the centre. The centre is a narrow stone peak. Steps are 60px apart vertically,
  // each ≤180px apart horizontally — all reachable with one jump.
  //
  //  RED BASE  stone1  stone2  PEAK  stone3  stone4  BLUE BASE
  //  y=430──   y=370   y=310   y=255  y=310   y=370   y=430──
  {
    id: "graveyard",
    name: "Graveyard",
    water: false,
    skyColors: ["#6b7280", "#a8b4c0"],
    mountainColor: "#7a8090",
    groundColor: "#374151",
    dirtColor: "#2d2420",
    platforms: [
      // Red base, surface y=430
      { x: -40, y: 430, w: 270, h: 130, type: "ground" },
      // Red stone step 1, y=370 (Δy=60 from base, starts at x=200 — 20px horizontal gap from base edge)
      { x: 200, y: 370, w: 120, h: 60, type: "stone" },
      // Red stone step 2, y=310 (Δy=60 from step1, gap ≈ 30px)
      { x: 295, y: 310, w: 120, h: 60, type: "stone" },
      // Centre peak stone, y=255 (Δy=55 from step2, gap ≈ 25px)
      { x: 390, y: 255, w: 180, h: 215, type: "stone" },
      // Blue stone step 2 (mirror), y=310
      { x: 545, y: 310, w: 120, h: 60, type: "stone" },
      // Blue stone step 1 (mirror), y=370
      { x: 640, y: 370, w: 120, h: 60, type: "stone" },
      // Blue base, surface y=430
      { x: 690, y: 430, w: 310, h: 130, type: "ground" },
    ],
    red: [
      { x: 40,  y: 430 }, { x: 85,  y: 430 }, { x: 130, y: 430 },
      { x: 175, y: 430 }, { x: 215, y: 370 }, { x: 308, y: 310 },
    ],
    blue: [
      { x: 740, y: 430 }, { x: 790, y: 430 }, { x: 840, y: 430 },
      { x: 890, y: 430 }, { x: 652, y: 370 }, { x: 558, y: 310 },
    ],
    clouds: [
      { x: 90,  y: 100, w: 150, h: 45 },
      { x: 340, y: 125, w: 190, h: 58 },
      { x: 680, y: 95,  w: 168, h: 52 },
    ],
  },

  // ─── MAP 5: CANYON ──────────────────────────────────────────────────────────
  // Concept: Both sides start on high cliffs. Canyon floor is far below.
  // Floating log bridges at two heights allow passage across — but exposure is high.
  // Sniper's paradise: high ground advantage is maximum here.
  //
  //  L CLIFF      upper-bridge   R CLIFF
  //  y=220 ─────  y=280          y=220 ─────
  //               lower-bridge
  //  ledge y=340  y=360          ledge y=340
      //               canyon floor
      //               y=420
  {
    id: "canyon",
    name: "Canyon",
    water: false,
    skyColors: ["#87ceeb", "#d4eeff"],
    mountainColor: "#a09070",
    groundColor: "#8B6914",
    dirtColor: "#6b4a10",
    platforms: [
      // Left cliff, surface y=220
      { x: -40, y: 220, w: 280, h: 360, type: "ground" },
      // Left ledge (lower wall outcrop), y=340 — reachable by jump from cliff top going right, or drop from top
      // It's 120px below cliff top — reachable by walking off edge and landing
      { x: 200, y: 340, w: 110, h: 40, type: "stone" },
      // Upper bridge log, y=280 — reachable from left cliff top (Δy=60, gap ≈ 40px)
      { x: 270, y: 280, w: 180, h: 20, type: "log" },
      // Lower bridge log, y=360 — reachable from upper bridge (Δy=80, direct drop) or from left ledge (Δy=20, gap≈30px)
      { x: 390, y: 360, w: 180, h: 20, type: "log" },
      // Canyon floor, y=420 (raised so recovery jump to bridges is always possible)
      { x: 260, y: 420, w: 440, h: 140, type: "ground" },
      // Right ledge (mirror), y=340
      { x: 650, y: 340, w: 110, h: 40, type: "stone" },
      // Right cliff, surface y=220
      { x: 720, y: 220, w: 280, h: 360, type: "ground" },
    ],
    red: [
      { x: 40,  y: 220 }, { x: 90,  y: 220 }, { x: 140, y: 220 },
      { x: 190, y: 220 }, { x: 240, y: 220 }, { x: 215, y: 340 },
    ],
    blue: [
      { x: 770, y: 220 }, { x: 820, y: 220 }, { x: 870, y: 220 },
      { x: 920, y: 220 }, { x: 730, y: 220 }, { x: 665, y: 340 },
    ],
    clouds: [
      { x: 100, y: 85,  w: 160, h: 48 },
      { x: 380, y: 105, w: 200, h: 62 },
      { x: 700, y: 80,  w: 158, h: 50 },
    ],
  },
];

const MAP_DESC = {
  wasteland:   "Staircase of logs connects two ground bases. Climb to the peak for line-of-sight advantage.",
  archipelago: "Island bases separated by water. Float-hop across — or hold your island fortress.",
  mesa:        "Both teams start on tall plateaus. Fight for the pit bridges or hold the high cliffs.",
  graveyard:   "Mirrored stone steps rise to a central peak. Control the top, control the match.",
  canyon:      "Deep ravine separates two cliffs. Cross via log bridges — or snipe from the heights.",
};


function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createInput() {
  const down = new Set(), pressed = new Set();
  return {
    press(c) { if (!down.has(c)) pressed.add(c); down.add(c); },
    release(c) { down.delete(c); },
    down(c) { return down.has(c); },
    pressed(c) { return pressed.has(c); },
    clearPressed() { pressed.clear(); },
    clearAll() { down.clear(); pressed.clear(); },
  };
}

function createRng(seed = Date.now()) {
  let v = seed >>> 0;
  return () => { v = (Math.imul(v, 1664525) + 1013904223) >>> 0; return v / 4294967296; };
}

function findMap(id) { return MAPS.find(m => m.id === id) ?? MAPS[0]; }

function createUnits(teamSize, map) {
  const units = [];
  for (let i = 0; i < teamSize; i++) {
    units.push({ id: `red-${i}`, team: "red", slot: i, name: NAMES.red[i], x: map.red[i].x, y: map.red[i].y, vx: 0, vy: 0, onGround: true, facing: 1, health: 100, alive: true, flashMs: 0, deathMs: 0 });
    units.push({ id: `blue-${i}`, team: "blue", slot: i, name: NAMES.blue[i], x: map.blue[i].x, y: map.blue[i].y, vx: 0, vy: 0, onGround: true, facing: -1, health: 100, alive: true, flashMs: 0, deathMs: 0 });
  }
  return units;
}

function getAlive(state, team) { return state.units.filter(u => u.team === team && u.alive); }
function getUnit(state, id) { return state.units.find(u => u.id === id) ?? null; }
function getActiveUnit(state) { return getUnit(state, state.turn.unitId); }
function defaultAim(team) { return team === "red" ? 38 : 142; }

function createState({ mapId = "wasteland", teamSize = 3, mode = "menu" }) {
  const map = findMap(mapId);
  const units = createUnits(clamp(teamSize, 1, 6), map);
  return {
    mode, phase: mode === "menu" ? "menu" : "playing",
    mapId: map.id, map, teamSize: clamp(teamSize, 1, 6), units,
    rng: createRng(),
    turn: {
      number: 1, team: "red", unitId: units.find(u => u.team === "red")?.id ?? null,
      remainingMs: TURN_MS, movementLeft: MOVE_BUDGET,
      aimDeg: defaultAim("red"), charge: 0, charging: false,
      acted: false, settleMs: 0, state: "ready",
      cursor: { red: -1, blue: -1 },
    },
    wind: 0, projectile: null, explosions: [], particles: [],
    ai: {
      stage: "idle",
      timerMs: 0,
      desiredAim: defaultAim("blue"),
      desiredCharge: 0.64,
      targetId: null,
      plan: null,
      repathMs: 0,
    },
    pointer: { x: WIDTH * 0.5, y: HEIGHT * 0.5, inside: false, down: false },
    virtual: { left: false, right: false, jump: false, aimUp: false, aimDown: false, fire: false },
    cameraShake: 0, winner: null, frame: 0,
  };
}

function selectNextUnit(state, teamId) {
  const units = state.units.filter(u => u.team === teamId).sort((a, b) => a.slot - b.slot);
  if (!units.length) return null;
  const alive = units.filter(u => u.alive);
  if (!alive.length) return null;
  const start = state.turn.cursor[teamId] ?? -1;
  for (let off = 1; off <= units.length; off++) {
    const idx = (start + off) % units.length;
    if (units[idx].alive) { state.turn.cursor[teamId] = idx; return units[idx]; }
  }
  return alive[0];
}

function startTurn(state, teamId) {
  const unit = selectNextUnit(state, teamId);
  if (!unit) return false;
  Object.assign(state.turn, {
    team: teamId, unitId: unit.id, remainingMs: TURN_MS, movementLeft: MOVE_BUDGET,
    aimDeg: defaultAim(teamId), charge: 0, charging: false,
    acted: false, settleMs: 0, state: "ready",
  });
  state.wind = (state.rng() - 0.5) * 80;
  if (TEAM[teamId].cpu) {
    state.ai.stage = "planning";
    state.ai.timerMs = 260 + state.rng() * 260;
    state.ai.desiredAim = defaultAim(teamId);
    state.ai.desiredCharge = 0.62;
    state.ai.targetId = null;
    state.ai.plan = null;
    state.ai.repathMs = 0;
    state.turn.state = "planning";
  } else {
    state.ai.stage = "idle";
    state.ai.timerMs = 0;
    state.ai.plan = null;
    state.ai.repathMs = 0;
    state.ai.targetId = null;
  }
  return true;
}

function battleFromMenu(state) {
  const fresh = createState({ mapId: state.mapId, teamSize: state.teamSize, mode: "battle" });
  startTurn(fresh, "red");
  return fresh;
}

function restartFromAny(state) {
  const fresh = createState({ mapId: state.mapId, teamSize: state.teamSize, mode: state.mode === "menu" ? "menu" : "battle" });
  if (fresh.mode === "battle") startTurn(fresh, "red");
  return fresh;
}

const TOPOLOGY_CACHE = new Map();

function platformBounds(platform) {
  return {
    left: platform.x + 16,
    right: platform.x + platform.w - 16,
    y: platform.y,
  };
}

function platformCenter(platform) {
  return platform.x + platform.w * 0.5;
}

function intervalGap(aLeft, aRight, bLeft, bRight) {
  if (aRight < bLeft) return bLeft - aRight;
  if (bRight < aLeft) return aLeft - bRight;
  return 0;
}

function bestJumpLink(fromPlatform, toPlatform) {
  if (fromPlatform === toPlatform) return null;
  const a = platformBounds(fromPlatform);
  const b = platformBounds(toPlatform);
  if (a.left >= a.right || b.left >= b.right) return null;

  let fromX = a.left;
  let toX = b.left;
  if (a.right < b.left) {
    fromX = a.right;
    toX = b.left;
  } else if (b.right < a.left) {
    fromX = a.left;
    toX = b.right;
  } else {
    const overlapLeft = Math.max(a.left, b.left);
    const overlapRight = Math.min(a.right, b.right);
    fromX = (overlapLeft + overlapRight) * 0.5;
    toX = fromX;
  }

  const gap = intervalGap(a.left, a.right, b.left, b.right);
  const stepUp = a.y - b.y;
  if (stepUp > MAX_JUMP_UP) return null;
  const stepDown = Math.max(0, b.y - a.y);
  const maxGap = stepUp > 0
    ? MAX_JUMP_GAP_UP
    : stepDown > 0
      ? MAX_JUMP_GAP_DOWN
      : MAX_JUMP_GAP_FLAT;
  if (gap > maxGap) return null;

  const verticalPenalty = stepUp > 0 ? stepUp * 1.7 : stepDown * 0.35;
  const cost = Math.abs(fromX - toX) + 85 + verticalPenalty;
  return { fromX, toX, cost };
}

function findPlatformForPosition(map, x, y) {
  let bestIndex = -1;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let idx = 0; idx < map.platforms.length; idx += 1) {
    const platform = map.platforms[idx];
    if (x < platform.x - 6 || x > platform.x + platform.w + 6) continue;
    const score = Math.abs(y - platform.y);
    if (score < bestScore) {
      bestScore = score;
      bestIndex = idx;
    }
  }
  return bestScore <= 26 ? bestIndex : -1;
}

function buildPlatformTopology(map) {
  const nodes = map.platforms.map((platform, index) => ({
    index,
    platform,
    centerX: platformCenter(platform),
  }));
  const edges = nodes.map(() => []);
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = 0; j < nodes.length; j += 1) {
      if (i === j) continue;
      const link = bestJumpLink(nodes[i].platform, nodes[j].platform);
      if (!link) continue;
      edges[i].push({ to: j, ...link });
    }
  }
  return { nodes, edges };
}

function topologyFor(map) {
  const cached = TOPOLOGY_CACHE.get(map.id);
  if (cached) return cached;
  const topology = buildPlatformTopology(map);
  TOPOLOGY_CACHE.set(map.id, topology);
  return topology;
}

function reachablePlatformIndices(topology, startIndex) {
  if (startIndex < 0 || startIndex >= topology.nodes.length) return new Set();
  const seen = new Set([startIndex]);
  const queue = [startIndex];
  while (queue.length > 0) {
    const node = queue.shift();
    for (const edge of topology.edges[node]) {
      if (seen.has(edge.to)) continue;
      seen.add(edge.to);
      queue.push(edge.to);
    }
  }
  return seen;
}

function assertMapConnectivity(map) {
  const topology = topologyFor(map);
  const redZone = new Set();
  const blueZone = new Set();
  for (const spawn of map.red) {
    const idx = findPlatformForPosition(map, spawn.x, spawn.y);
    if (idx >= 0) redZone.add(idx);
  }
  for (const spawn of map.blue) {
    const idx = findPlatformForPosition(map, spawn.x, spawn.y);
    if (idx >= 0) blueZone.add(idx);
  }
  if (redZone.size === 0 || blueZone.size === 0) {
    throw new Error(`[territory-war] Map "${map.id}" has invalid spawn topology (red=${redZone.size}, blue=${blueZone.size}).`);
  }
  const disconnected = [];
  for (let idx = 0; idx < topology.nodes.length; idx += 1) {
    const reach = reachablePlatformIndices(topology, idx);
    let canReachRed = false;
    let canReachBlue = false;
    for (const node of reach) {
      if (redZone.has(node)) canReachRed = true;
      if (blueZone.has(node)) canReachBlue = true;
      if (canReachRed && canReachBlue) break;
    }
    if (!canReachRed || !canReachBlue) disconnected.push(idx);
  }
  if (disconnected.length > 0) {
    throw new Error(`[territory-war] Map "${map.id}" has disconnected traversal zones (platforms: ${disconnected.join(", ")}).`);
  }
}

MAPS.forEach(assertMapConnectivity);

function applyUnitPhysics(state, dt) {
  for (const unit of state.units) {
    if (!unit.alive) continue;
    if (unit.flashMs > 0) unit.flashMs = Math.max(0, unit.flashMs - dt * 1000);
    unit.vy += GRAVITY * dt;
    const px = unit.x, py = unit.y;
    unit.x += unit.vx * dt;
    unit.y += unit.vy * dt;
    unit.x = clamp(unit.x, 12, WIDTH - 12);
    let landed = false;
    for (const plat of state.map.platforms) {
      if (unit.x < plat.x + 5 || unit.x > plat.x + plat.w - 5) continue;
      if (py <= plat.y && unit.y >= plat.y && unit.vy >= 0) {
        unit.y = plat.y; unit.vy = 0; landed = true; break;
      }
    }
    unit.onGround = landed;
    if (landed) {
      unit.vx *= 0.80;
      if (Math.abs(unit.vx) < 2) unit.vx = 0;
    }
    if (unit.y > HEIGHT + 100) {
      unit.alive = false; unit.health = 0; unit.vx = 0; unit.vy = 0;
      unit.y = HEIGHT + 90; unit.x = clamp(px, 12, WIDTH - 12);
    }
  }
}

function chooseSimpleShot(unit, target) {
  if (!unit || !target) return { angle: 136, charge: 0.65 };
  const sx = unit.x, sy = unit.y - 28, tx = target.x, ty = target.y - 24;
  const dx = tx - sx, dy = ty - sy;
  let best = null;
  for (let angle = 18; angle <= 164; angle += 2) {
    const r = angle * Math.PI / 180;
    const cos = Math.cos(r);
    if (Math.abs(cos) < 0.05) continue;
    const denom = 2 * cos * cos * (dx * Math.tan(r) - dy);
    if (Math.abs(denom) < 1e-3) continue;
    const speedSq = GRAVITY * dx * dx / denom;
    if (speedSq <= 0 || !isFinite(speedSq)) continue;
    const speed = Math.sqrt(speedSq);
    const charge = (speed - THROW_BASE) / THROW_SCALE;
    if (charge < 0.1 || charge > 1) continue;
    const score = Math.abs(speed - (THROW_BASE + 0.62 * THROW_SCALE)) + Math.abs(98 - angle) * 1.4;
    if (!best || score < best.score) best = { angle, charge, score };
  }
  if (!best) return { angle: dx >= 0 ? 44 : 136, charge: clamp(0.44 + Math.abs(dx) / WIDTH * 0.34, 0.24, 0.95) };
  return { angle: best.angle, charge: best.charge };
}

function simulateProjectileLanding(state, originX, originY, angleDeg, charge) {
  const rad = angleDeg * Math.PI / 180;
  const speed = THROW_BASE + charge * THROW_SCALE;
  const p = {
    x: originX + Math.cos(rad) * 18,
    y: originY - 30 + Math.sin(rad) * 8,
    vx: Math.cos(rad) * speed,
    vy: Math.sin(rad) * speed,
    radius: 6,
    fuseMs: 1800,
    bounces: 0,
  };

  for (let step = 0; step < 220; step += 1) {
    const px = p.x;
    const py = p.y;
    p.vx += state.wind * DT * 0.4;
    p.vy += GRAVITY * DT;
    p.x += p.vx * DT;
    p.y += p.vy * DT;
    p.fuseMs -= DT_MS;

    if (p.x - p.radius < 0) { p.x = p.radius; p.vx = Math.abs(p.vx) * 0.55; p.bounces += 1; }
    else if (p.x + p.radius > WIDTH) { p.x = WIDTH - p.radius; p.vx = -Math.abs(p.vx) * 0.55; p.bounces += 1; }
    if (p.y - p.radius < 0) { p.y = p.radius; p.vy = Math.abs(p.vy) * 0.55; p.bounces += 1; }

    for (const plat of state.map.platforms) {
      const l = plat.x;
      const r = plat.x + plat.w;
      const top = plat.y;
      const bot = plat.y + plat.h;
      if (p.x < l - p.radius || p.x > r + p.radius || p.y < top - p.radius || p.y > bot + p.radius) continue;
      if (py + p.radius <= top && p.y + p.radius >= top && p.vy > 0) { p.y = top - p.radius; p.vy = -Math.abs(p.vy) * 0.52; p.vx *= 0.9; p.bounces += 1; continue; }
      if (py - p.radius >= bot && p.y - p.radius <= bot && p.vy < 0) { p.y = bot + p.radius; p.vy = Math.abs(p.vy) * 0.5; p.bounces += 1; continue; }
      if (px + p.radius <= l && p.x + p.radius >= l && p.vx > 0) { p.x = l - p.radius; p.vx = -Math.abs(p.vx) * 0.55; p.bounces += 1; continue; }
      if (px - p.radius >= r && p.x - p.radius <= r && p.vx < 0) { p.x = r + p.radius; p.vx = Math.abs(p.vx) * 0.55; p.bounces += 1; }
    }

    if (p.fuseMs <= 0 || p.bounces >= 8 || p.y > HEIGHT + 90) {
      return { x: clamp(p.x, 0, WIDTH), y: clamp(p.y, 0, HEIGHT), bounces: p.bounces };
    }
  }
  return { x: clamp(p.x, 0, WIDTH), y: clamp(p.y, 0, HEIGHT), bounces: p.bounces };
}

function predictedBlastDamage(unit, blastX, blastY) {
  if (!unit.alive) return 0;
  const dx = unit.x - blastX;
  const dy = (unit.y - 24) - blastY;
  const dist = Math.hypot(dx, dy);
  if (dist > BLAST_RADIUS) return 0;
  const ratio = 1 - dist / BLAST_RADIUS;
  return Math.max(6, Math.round(BLAST_DAMAGE * ratio * ratio));
}

function buildCpuCandidates(state, unit) {
  const map = state.map;
  const topology = topologyFor(map);
  const currentPlatform = findPlatformForPosition(map, unit.x, unit.y);
  const budget = state.turn.movementLeft;
  const candidates = [];
  const keySet = new Set();

  const pushCandidate = (candidate) => {
    const key = `${candidate.platform}:${Math.round(candidate.x)}`;
    if (keySet.has(key)) return;
    keySet.add(key);
    candidates.push(candidate);
  };

  if (currentPlatform < 0) {
    pushCandidate({ x: unit.x, y: unit.y, platform: -1, cost: 0, jump: null });
    return candidates;
  }

  const current = map.platforms[currentPlatform];
  const b = platformBounds(current);
  const minX = clamp(unit.x - budget, b.left, b.right);
  const maxX = clamp(unit.x + budget, b.left, b.right);
  const samePlatformPoints = [
    unit.x,
    minX,
    maxX,
    b.left,
    b.right,
    (b.left + b.right) * 0.5,
  ];
  for (const x of samePlatformPoints) {
    pushCandidate({ x: clamp(x, b.left, b.right), y: current.y, platform: currentPlatform, cost: Math.abs(x - unit.x), jump: null });
  }

  for (const edge of topology.edges[currentPlatform]) {
    const approach = Math.abs(unit.x - edge.fromX);
    const baseCost = approach + edge.cost;
    if (baseCost > budget + 24) continue;
    const landingPlatform = map.platforms[edge.to];
    const lb = platformBounds(landingPlatform);
    const points = [edge.toX, (lb.left + lb.right) * 0.5];
    for (const point of points) {
      const x = clamp(point, lb.left, lb.right);
      const cost = baseCost + Math.abs(x - edge.toX);
      if (cost > budget + 28) continue;
      pushCandidate({
        x,
        y: landingPlatform.y,
        platform: edge.to,
        cost,
        jump: { fromX: edge.fromX, toX: edge.toX, done: false },
      });
    }
  }
  return candidates;
}

function scoreCandidateShot(state, candidate, angle, charge, actingTeam) {
  const landing = simulateProjectileLanding(state, candidate.x, candidate.y, angle, charge);
  let enemyDamage = 0;
  let allyDamage = 0;
  let enemyKills = 0;
  let allyKills = 0;

  for (const unit of state.units) {
    if (!unit.alive) continue;
    const damage = predictedBlastDamage(unit, landing.x, landing.y);
    if (damage <= 0) continue;
    if (unit.team === actingTeam) {
      allyDamage += damage;
      if (damage >= unit.health) allyKills += 1;
    } else {
      enemyDamage += damage;
      if (damage >= unit.health) enemyKills += 1;
    }
  }

  const score = enemyDamage * 1.45 + enemyKills * 260 - allyDamage * 2.2 - allyKills * 360;
  return { score, landing, enemyDamage, allyDamage };
}

function chooseAiPlan(state, unit) {
  const actingTeam = unit.team;
  const enemies = getAlive(state, actingTeam === "red" ? "blue" : "red");
  if (enemies.length === 0) return null;

  const candidates = buildCpuCandidates(state, unit);
  const angles = [];
  for (let angle = 18; angle <= 166; angle += 6) angles.push(angle);
  const charges = [];
  for (let charge = 0.16; charge <= 1.001; charge += 0.09) charges.push(Number(charge.toFixed(3)));

  const avgEnemyY = enemies.reduce((sum, enemy) => sum + enemy.y, 0) / enemies.length;
  let best = null;
  for (const candidate of candidates) {
    for (const angle of angles) {
      for (const charge of charges) {
        const shot = scoreCandidateShot(state, candidate, angle, charge, actingTeam);
        if (shot.enemyDamage <= 0 && shot.score < 20) continue;
        const positionBonus = (avgEnemyY - candidate.y) * 0.08;
        const movementPenalty = candidate.cost * 0.16;
        const totalScore = shot.score + positionBonus - movementPenalty;
        if (!best || totalScore > best.totalScore) {
          best = {
            totalScore,
            angle,
            charge,
            moveX: candidate.x,
            moveY: candidate.y,
            platform: candidate.platform,
            jump: candidate.jump ? { ...candidate.jump } : null,
          };
        }
      }
    }
  }

  if (!best) {
    const fallbackTarget = enemies.reduce((selected, enemy) =>
      (!selected || Math.abs(enemy.x - unit.x) < Math.abs(selected.x - unit.x) ? enemy : selected), null);
    const fallback = chooseSimpleShot(unit, fallbackTarget);
    return {
      totalScore: 0,
      angle: fallback.angle,
      charge: fallback.charge,
      moveX: unit.x,
      moveY: unit.y,
      platform: findPlatformForPosition(state.map, unit.x, unit.y),
      jump: null,
    };
  }
  return best;
}

function moveCpuTowardPlan(state, unit, dt) {
  const plan = state.ai.plan;
  if (!plan) return true;
  let direction = 0;

  if (plan.jump && !plan.jump.done) {
    if (Math.abs(unit.x - plan.jump.fromX) > 7) {
      direction = Math.sign(plan.jump.fromX - unit.x);
    } else if (unit.onGround) {
      unit.vy = -JUMP_SPEED;
      unit.onGround = false;
      const jumpDirection = Math.sign(plan.jump.toX - plan.jump.fromX) || 1;
      unit.vx = jumpDirection * MOVE_SPEED;
      plan.jump.done = true;
    }
  } else if (Math.abs(unit.x - plan.moveX) > 8) {
    direction = Math.sign(plan.moveX - unit.x);
  }

  if (direction !== 0 && state.turn.movementLeft > 0) {
    const speed = unit.onGround ? MOVE_SPEED : AIR_CONTROL;
    unit.vx = direction * speed;
    if (unit.onGround) state.turn.movementLeft = Math.max(0, state.turn.movementLeft - Math.abs(unit.vx) * dt);
    unit.facing = direction > 0 ? 1 : -1;
  } else if (unit.onGround) {
    unit.vx *= 0.68;
    if (Math.abs(unit.vx) < 3) unit.vx = 0;
  }

  const arrived = Math.abs(unit.x - plan.moveX) <= 8 && (!plan.jump || plan.jump.done);
  return arrived || state.turn.movementLeft <= 0;
}

function spawnProjectile(state, unit) {
  if (!unit || !unit.alive) return;
  const rad = state.turn.aimDeg * Math.PI / 180;
  const speed = THROW_BASE + state.turn.charge * THROW_SCALE;
  state.projectile = { x: unit.x + Math.cos(rad) * 18, y: unit.y - 30 + Math.sin(rad) * 8, vx: Math.cos(rad) * speed, vy: Math.sin(rad) * speed, radius: 6, fuseMs: 1800, bounces: 0, trail: [] };
  state.turn.charging = false; state.turn.acted = true; state.turn.state = "resolving";
}

function spawnParticles(state, x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const angle = state.rng() * Math.PI * 2;
    const speed = 80 + state.rng() * 200;
    state.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 60, lifeMs: 400 + state.rng() * 400, maxLife: 800, radius: 3 + state.rng() * 4, color });
  }
}

function detonate(state, x, y) {
  state.explosions.push({ x, y, radius: 12, maxRadius: BLAST_RADIUS, lifeMs: 420 });
  state.projectile = null;
  state.cameraShake = Math.max(state.cameraShake, 1);
  spawnParticles(state, x, y, 22, "#f97316");
  spawnParticles(state, x, y, 10, "#fbbf24");
  for (const unit of state.units) {
    if (!unit.alive) continue;
    const dx = unit.x - x, dy = (unit.y - 24) - y;
    const dist = Math.hypot(dx, dy);
    if (dist > BLAST_RADIUS) continue;
    const ratio = 1 - dist / BLAST_RADIUS;
    const damage = Math.max(6, Math.round(BLAST_DAMAGE * ratio * ratio));
    unit.health = Math.max(0, unit.health - damage);
    unit.flashMs = 250;
    const nx = dist > 0 ? dx / dist : 0, ny = dist > 0 ? dy / dist : -1;
    const impulse = 320 * ratio;
    unit.vx += nx * impulse; unit.vy -= Math.abs(ny) * impulse + 130 * ratio;
    unit.onGround = false;
    if (unit.health <= 0) unit.alive = false;
  }
  state.turn.settleMs = 950;
}

function applyProjectilePhysics(state, dt) {
  const p = state.projectile;
  if (!p) return;
  if (p.trail.length > 16) p.trail.shift();
  p.trail.push({ x: p.x, y: p.y });
  const px = p.x, py = p.y;
  p.vx += state.wind * dt * 0.4;
  p.vy += GRAVITY * dt;
  p.x += p.vx * dt; p.y += p.vy * dt;
  p.fuseMs -= dt * 1000;
  if (p.x - p.radius < 0) { p.x = p.radius; p.vx = Math.abs(p.vx) * 0.55; p.bounces++; }
  else if (p.x + p.radius > WIDTH) { p.x = WIDTH - p.radius; p.vx = -Math.abs(p.vx) * 0.55; p.bounces++; }
  if (p.y - p.radius < 0) { p.y = p.radius; p.vy = Math.abs(p.vy) * 0.55; p.bounces++; }
  for (const plat of state.map.platforms) {
    const l = plat.x, r = plat.x + plat.w, top = plat.y, bot = plat.y + plat.h;
    if (p.x < l - p.radius || p.x > r + p.radius || p.y < top - p.radius || p.y > bot + p.radius) continue;
    if (py + p.radius <= top && p.y + p.radius >= top && p.vy > 0) { p.y = top - p.radius; p.vy = -Math.abs(p.vy) * 0.52; p.vx *= 0.90; p.bounces++; continue; }
    if (py - p.radius >= bot && p.y - p.radius <= bot && p.vy < 0) { p.y = bot + p.radius; p.vy = Math.abs(p.vy) * 0.5; p.bounces++; continue; }
    if (px + p.radius <= l && p.x + p.radius >= l && p.vx > 0) { p.x = l - p.radius; p.vx = -Math.abs(p.vx) * 0.55; p.bounces++; continue; }
    if (px - p.radius >= r && p.x - p.radius <= r && p.vx < 0) { p.x = r + p.radius; p.vx = Math.abs(p.vx) * 0.55; p.bounces++; }
  }
  if (p.fuseMs <= 0 || p.bounces >= 8 || p.y > HEIGHT + 90) detonate(state, clamp(p.x, 0, WIDTH), clamp(p.y, 0, HEIGHT));
}

function updateParticles(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.lifeMs -= dt * 1000;
    p.vx *= 0.96; p.vy += GRAVITY * 0.3 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.lifeMs <= 0) state.particles.splice(i, 1);
  }
}

function updateExplosions(state, dt) {
  if (state.cameraShake > 0) state.cameraShake = Math.max(0, state.cameraShake - dt * 2.4);
  for (let i = state.explosions.length - 1; i >= 0; i--) {
    const e = state.explosions[i];
    e.lifeMs -= dt * 1000;
    const t = 1 - clamp(e.lifeMs / 420, 0, 1);
    e.radius = 12 + (e.maxRadius - 12) * t;
    if (e.lifeMs <= 0) state.explosions.splice(i, 1);
  }
}

function checkBattleEnd(state) {
  const red = getAlive(state, "red").length, blue = getAlive(state, "blue").length;
  if (red > 0 && blue > 0) return false;
  state.winner = red <= 0 && blue <= 0 ? "draw" : red > 0 ? "red" : "blue";
  state.phase = "match-over"; state.mode = "battle-over";
  state.turn.charging = false; state.projectile = null;
  state.ai.stage = "idle"; state.ai.plan = null; state.ai.repathMs = 0;
  return true;
}

function handleHumanTurn(state, input, dt) {
  const unit = getActiveUnit(state);
  if (!unit || !unit.alive) return;
  const v = state.virtual, ptr = state.pointer;
  const left = input.down("ArrowLeft") || input.down("KeyA") || v.left;
  const right = input.down("ArrowRight") || input.down("KeyD") || v.right;
  const jump = input.pressed("ArrowUp") || input.pressed("KeyW") || v.jump;
  const aimUp = input.down("KeyQ") || v.aimUp;
  const aimDown = input.down("KeyE") || v.aimDown;
  const fireHeld = input.down("Space") || v.fire || ptr.down;
  const cancel = input.pressed("KeyX");

  if (ptr.inside) {
    const dx = ptr.x - unit.x, dy = ptr.y - (unit.y - 28);
    if (Math.hypot(dx, dy) > 14) state.turn.aimDeg = clamp(Math.atan2(dy, dx) * 180 / Math.PI, 14, 166);
  } else if (aimUp || aimDown) {
    state.turn.aimDeg = clamp(state.turn.aimDeg + (aimUp ? -1 : 1) * 80 * dt, 14, 166);
  }
  const aimRad = state.turn.aimDeg * Math.PI / 180;
  const hcos = Math.cos(aimRad);
  if (hcos > 0.06) unit.facing = 1; else if (hcos < -0.06) unit.facing = -1;

  if (!state.turn.acted && !state.projectile) {
    const dir = Number(right) - Number(left);
    if (dir !== 0 && state.turn.movementLeft > 0) {
      const speed = unit.onGround ? MOVE_SPEED : AIR_CONTROL;
      unit.vx = dir * speed;
      if (unit.onGround) state.turn.movementLeft = Math.max(0, state.turn.movementLeft - Math.abs(unit.vx) * dt);
      unit.facing = dir > 0 ? 1 : -1;
    } else if (unit.onGround) {
      unit.vx *= 0.68;
      if (Math.abs(unit.vx) < 3) unit.vx = 0;
    }
    if (jump && unit.onGround) { unit.vy = -JUMP_SPEED; unit.onGround = false; }
  }
  if (cancel) { state.turn.charging = false; state.turn.charge = 0; state.turn.state = "aiming"; }
  if (!state.turn.acted && !state.projectile) {
    if (fireHeld) {
      state.turn.charging = true;
      state.turn.charge = clamp(state.turn.charge + dt * 0.9, 0, 1);
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
  if (!unit || !unit.alive || state.turn.acted || state.projectile) return;
  const aimFace = () => {
    const aimRad = state.turn.aimDeg * Math.PI / 180;
    const hcos = Math.cos(aimRad);
    if (hcos > 0.06) unit.facing = 1;
    else if (hcos < -0.06) unit.facing = -1;
  };

  if (state.ai.stage === "planning") {
    state.turn.state = "planning";
    state.turn.charging = false;
    state.turn.charge = 0;
    state.ai.timerMs -= dt * 1000;
    if (!state.ai.plan || state.ai.timerMs <= 0) {
      state.ai.plan = chooseAiPlan(state, unit);
      if (state.ai.plan) {
        state.ai.desiredAim = state.ai.plan.angle;
        state.ai.desiredCharge = state.ai.plan.charge;
      } else {
        state.ai.desiredAim = defaultAim(unit.team);
        state.ai.desiredCharge = 0.58;
      }
      state.ai.stage = "moving";
      state.ai.timerMs = 0;
      state.ai.repathMs = 0;
    }
    return;
  }

  if (state.ai.stage === "moving") {
    state.turn.state = "moving";
    state.turn.charging = false;
    const arrived = moveCpuTowardPlan(state, unit, dt);
    state.ai.repathMs += dt * 1000;
    if (!arrived && state.ai.repathMs >= 900) {
      const refreshedPlan = chooseAiPlan(state, unit);
      if (refreshedPlan) {
        state.ai.plan = refreshedPlan;
        state.ai.desiredAim = refreshedPlan.angle;
        state.ai.desiredCharge = refreshedPlan.charge;
      }
      state.ai.repathMs = 0;
    }
    if (arrived) {
      state.ai.stage = "aiming";
      state.ai.timerMs = 80 + state.rng() * 140;
      state.ai.repathMs = 0;
      unit.vx *= 0.65;
      if (Math.abs(unit.vx) < 3) unit.vx = 0;
    }
    return;
  }

  if (state.ai.stage === "aiming") {
    state.turn.state = "aiming";
    state.turn.charging = false;
    state.ai.repathMs += dt * 1000;
    if (state.ai.repathMs >= 260) {
      const refreshedPlan = chooseAiPlan(state, unit);
      if (refreshedPlan) {
        state.ai.plan = refreshedPlan;
        state.ai.desiredAim = refreshedPlan.angle;
        state.ai.desiredCharge = refreshedPlan.charge;
      }
      state.ai.repathMs = 0;
    }
    const diff = state.ai.desiredAim - state.turn.aimDeg;
    const aimStep = Math.sign(diff) * Math.min(Math.abs(diff), 72 * dt);
    state.turn.aimDeg = clamp(state.turn.aimDeg + aimStep, 14, 166);
    aimFace();
    state.ai.timerMs = Math.max(0, state.ai.timerMs - dt * 1000);
    if (Math.abs(diff) <= 1.8 && state.ai.timerMs <= 0) {
      state.ai.stage = "charging";
      state.turn.charging = true;
      state.turn.charge = 0;
    }
    return;
  }

  if (state.ai.stage === "charging") {
    state.turn.state = "charging";
    const desiredAim = clamp(state.ai.desiredAim, 14, 166);
    const desiredCharge = clamp(state.ai.desiredCharge, 0.14, 1);
    const diff = desiredAim - state.turn.aimDeg;
    const aimStep = Math.sign(diff) * Math.min(Math.abs(diff), 56 * dt);
    state.turn.aimDeg = clamp(state.turn.aimDeg + aimStep, 14, 166);
    aimFace();
    state.turn.charging = true;
    state.turn.charge = clamp(state.turn.charge + dt * 0.76, 0, 1);
    if (state.turn.charge >= desiredCharge - 0.006 && Math.abs(state.turn.aimDeg - desiredAim) < 2.2) {
      spawnProjectile(state, unit);
      state.ai.stage = "idle";
      state.ai.plan = null;
      state.ai.timerMs = 0;
      state.ai.repathMs = 0;
    }
    return;
  }

  state.ai.stage = "planning";
  state.ai.timerMs = 120;
  state.ai.plan = null;
  state.ai.repathMs = 0;
  state.turn.state = "planning";
}

function maybeAdvanceTurn(state, dt) {
  if (state.phase !== "playing" || state.projectile) return;
  if (state.turn.acted) {
    if (state.turn.settleMs > 0) { state.turn.settleMs = Math.max(0, state.turn.settleMs - dt * 1000); state.turn.state = "resolving"; return; }
    state.turn.number += 1;
    startTurn(state, state.turn.team === "red" ? "blue" : "red");
    return;
  }
  if (state.turn.remainingMs <= 0) { state.turn.charging = false; state.turn.charge = 0; state.turn.acted = true; state.turn.settleMs = 280; state.turn.state = "resolving"; }
}

function stepState(state, input, dt) {
  if (input.pressed("KeyR")) { Object.assign(state, restartFromAny(state)); return; }
  if (input.pressed("KeyP") && state.mode !== "menu") state.phase = state.phase === "paused" ? "playing" : "paused";
  if (state.mode === "menu") { state.turn.state = "ready"; return; }
  if (state.phase === "paused" || state.phase === "match-over") { updateExplosions(state, dt); updateParticles(state, dt); return; }
  const active = getActiveUnit(state);
  if ((!active || !active.alive) && !state.turn.acted && !state.projectile) {
    state.turn.charging = false; state.turn.charge = 0; state.turn.acted = true; state.turn.settleMs = Math.max(state.turn.settleMs, 220); state.turn.state = "resolving";
  }
  state.turn.remainingMs = Math.max(0, state.turn.remainingMs - dt * 1000);
  if (TEAM[state.turn.team].cpu) handleCpuTurn(state, dt); else handleHumanTurn(state, input, dt);
  applyProjectilePhysics(state, dt);
  applyUnitPhysics(state, dt);
  updateExplosions(state, dt);
  updateParticles(state, dt);
  if (checkBattleEnd(state)) return;
  maybeAdvanceTurn(state, dt);
  state.frame++;
}

// ─── Drawing ─────────────────────────────────────────────────────────────────

function drawCloud(ctx, c) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  for (const [ox, oy, rx, ry] of [[-c.w * 0.26, 0, c.w * 0.27, c.h * 0.45], [0, -c.h * 0.12, c.w * 0.31, c.h * 0.52], [c.w * 0.26, 0, c.w * 0.24, c.h * 0.42]]) {
    ctx.beginPath();
    ctx.ellipse(c.x + ox, c.y + oy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlatform(ctx, p, map) {
  if (p.type === "log") {
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(p.x + 4, p.y + 4, p.w, p.h);
    // Body
    const logGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    logGrad.addColorStop(0, "#b45309");
    logGrad.addColorStop(0.4, "#92400e");
    logGrad.addColorStop(1, "#78350f");
    ctx.fillStyle = logGrad;
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, 4);
    ctx.fill();
    // Log segments
    for (let x = p.x + 6; x < p.x + p.w - 10; x += 26) {
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 20, p.y + 2);
      ctx.lineTo(x + 20, p.y + p.h - 2);
      ctx.stroke();
      // Knot circle
      ctx.fillStyle = "#a16207";
      ctx.beginPath();
      ctx.arc(x + 12, p.y + p.h * 0.5, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // Top highlight
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(p.x + 2, p.y + 2, p.w - 4, 4);
    return;
  }
  if (p.type === "stone") {
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(p.x + 4, p.y + 4, p.w, p.h);
    const stoneGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    stoneGrad.addColorStop(0, "#9ca3af");
    stoneGrad.addColorStop(0.5, "#6b7280");
    stoneGrad.addColorStop(1, "#4b5563");
    ctx.fillStyle = stoneGrad;
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, 2);
    ctx.fill();
    // Crack lines
    ctx.strokeStyle = "rgba(75,85,99,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x + p.w * 0.3, p.y + 4);
    ctx.lineTo(p.x + p.w * 0.38, p.y + p.h * 0.5);
    ctx.moveTo(p.x + p.w * 0.65, p.y + p.h * 0.4);
    ctx.lineTo(p.x + p.w * 0.72, p.y + p.h - 4);
    ctx.stroke();
    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(p.x + 3, p.y + 3, p.w - 6, 6);
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
    return;
  }
  // Ground
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(p.x + 3, p.y + 3, p.w, p.h);
  const dirtGrad = ctx.createLinearGradient(p.x, p.y + 18, p.x, p.y + p.h);
  dirtGrad.addColorStop(0, map.dirtColor);
  dirtGrad.addColorStop(1, "#2a1a0e");
  ctx.fillStyle = dirtGrad;
  ctx.fillRect(p.x, p.y + 18, p.w, p.h - 18);
  const grassGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + 22);
  grassGrad.addColorStop(0, adjustColor(map.groundColor, 30));
  grassGrad.addColorStop(1, map.groundColor);
  ctx.fillStyle = grassGrad;
  ctx.fillRect(p.x, p.y, p.w, 22);
  // Grass tuft accents
  ctx.strokeStyle = adjustColor(map.groundColor, 50);
  ctx.lineWidth = 1.5;
  for (let x = p.x + 10; x < p.x + p.w - 10; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, p.y + 4);
    ctx.lineTo(x - 3, p.y - 3);
    ctx.moveTo(x + 4, p.y + 3);
    ctx.lineTo(x + 6, p.y - 4);
    ctx.stroke();
  }
}

function adjustColor(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amount, 0, 255);
  const g = clamp(((n >> 8) & 0xff) + amount, 0, 255);
  const b = clamp((n & 0xff) + amount, 0, 255);
  return `rgb(${r},${g},${b})`;
}

function drawStickman(ctx, unit, isActive) {
  const { x, y, team, health, alive, flashMs, facing } = unit;
  ctx.save();
  ctx.globalAlpha = alive ? 1 : 0.32;

  const teamColor = TEAM[team].color;
  const isFlash = flashMs > 0;

  // Shadow
  if (alive) {
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Body stroke
  ctx.strokeStyle = isFlash ? "#fef08a" : "#0f172a";
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";

  // Head
  ctx.beginPath();
  ctx.arc(x, y - 34, 8, 0, Math.PI * 2);
  ctx.fillStyle = isFlash ? "#fef9c3" : "#0f172a";
  ctx.fill();
  ctx.strokeStyle = isFlash ? "#fef08a" : "#334155";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Eyes
  if (alive) {
    ctx.fillStyle = isFlash ? "#0f172a" : "#f8fafc";
    ctx.beginPath();
    ctx.arc(x + facing * 3, y - 35, 2, 0, Math.PI * 2);
    ctx.fill();
    // Angry brow
    ctx.strokeStyle = isFlash ? "#0f172a" : "#dc2626";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + facing * 1, y - 39);
    ctx.lineTo(x + facing * 6, y - 37);
    ctx.stroke();
  }

  // Body
  ctx.strokeStyle = isFlash ? "#fef08a" : "#0f172a";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x, y - 26);
  ctx.lineTo(x, y - 10);
  ctx.stroke();

  // Arms
  ctx.beginPath();
  ctx.moveTo(x, y - 22);
  ctx.lineTo(x - 9 * facing, y - 15);
  ctx.moveTo(x, y - 22);
  ctx.lineTo(x + 11 * facing, y - 15);
  ctx.stroke();

  // Legs
  ctx.beginPath();
  ctx.moveTo(x, y - 10);
  ctx.lineTo(x - 8, y);
  ctx.moveTo(x, y - 10);
  ctx.lineTo(x + 8, y);
  ctx.stroke();

  // Name label
  ctx.fillStyle = isFlash ? "#fef08a" : "#f8fafc";
  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Name bg
  const nameW = ctx.measureText(unit.name).width + 10;
  ctx.fillStyle = team === "red" ? "rgba(127,29,29,0.75)" : "rgba(30,58,138,0.75)";
  ctx.fillRect(x - nameW / 2, y - 60, nameW, 14);
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(unit.name, x, y - 53);

  // Health bar
  if (alive) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x - 22, y + 5, 44, 6);
    const hpColor = health > 60 ? "#22c55e" : health > 30 ? "#f59e0b" : "#ef4444";
    ctx.fillStyle = hpColor;
    ctx.fillRect(x - 22, y + 5, 44 * (health / 100), 6);
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x - 22, y + 5, 44, 6);
  }

  // Active arrow
  if (isActive && alive) {
    const bounce = Math.sin(Date.now() / 200) * 3;
    ctx.fillStyle = teamColor;
    ctx.beginPath();
    ctx.moveTo(x, y - 72 - bounce);
    ctx.lineTo(x - 10, y - 86 - bounce);
    ctx.lineTo(x + 10, y - 86 - bounce);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.restore();
}

function drawAimLine(ctx, state, unit) {
  if (!unit || !unit.alive || state.turn.acted || state.projectile) return;
  const angle = state.turn.aimDeg * Math.PI / 180;
  const ox = unit.x, oy = unit.y - 28;
  const len = 48 + 58 * state.turn.charge;
  const tx = ox + Math.cos(angle) * len, ty = oy + Math.sin(angle) * len;

  // Dashed line
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.setLineDash([]);

  // Dot trail
  for (let i = 1; i <= 6; i++) {
    const r = i / 7;
    const alpha = 0.3 + r * 0.7;
    const color = state.turn.team === "red" ? `rgba(239,68,68,${alpha})` : `rgba(59,130,246,${alpha})`;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(ox + (tx - ox) * r, oy + (ty - oy) * r, 2.5 - r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Arrowhead
  ctx.fillStyle = state.turn.team === "red" ? "#ef4444" : "#3b82f6";
  const ah = 7;
  ctx.save();
  ctx.translate(tx, ty);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(ah, 0); ctx.lineTo(-ah, -ah * 0.6); ctx.lineTo(-ah, ah * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawProjectile(ctx, p) {
  if (!p) return;
  // Trail
  if (p.trail.length > 1) {
    for (let i = 1; i < p.trail.length; i++) {
      const alpha = (i / p.trail.length) * 0.5;
      ctx.strokeStyle = `rgba(34,197,94,${alpha})`;
      ctx.lineWidth = 3 * (i / p.trail.length);
      ctx.beginPath();
      ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
      ctx.lineTo(p.trail[i].x, p.trail[i].y);
      ctx.stroke();
    }
  }
  // Grenade body
  ctx.fillStyle = "#1f2937";
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#374151";
  ctx.beginPath();
  ctx.arc(p.x - 1, p.y - 1, p.radius * 0.6, 0, Math.PI * 2);
  ctx.fill();
  // Pin
  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - p.radius);
  ctx.lineTo(p.x, p.y - p.radius - 4);
  ctx.stroke();
  // Fuse blink
  const fuseRatio = p.fuseMs / 1800;
  if (fuseRatio < 0.35 && Math.floor(Date.now() / (fuseRatio < 0.12 ? 80 : 160)) % 2 === 0) {
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawExplosions(ctx, explosions, particles) {
  // Particles first
  for (const pt of particles) {
    const alpha = clamp(pt.lifeMs / pt.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.radius * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const e of explosions) {
    const alpha = clamp(e.lifeMs / 420, 0, 1);
    // Outer ring
    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    // Inner bright
    ctx.globalAlpha = alpha * 0.7;
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    // Shockwave ring
    ctx.globalAlpha = alpha * 0.5;
    ctx.strokeStyle = "#fb923c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius * 1.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawWater(ctx, map) {
  if (!map.water) return;
  // Water fills from below the lowest platforms (platforms float above it)
  const waterY = 420;
  const grad = ctx.createLinearGradient(0, waterY, 0, HEIGHT);
  grad.addColorStop(0, "rgba(14,116,200,0.60)");
  grad.addColorStop(0.4, "rgba(29,78,216,0.80)");
  grad.addColorStop(1, "rgba(15,40,100,0.95)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, waterY, WIDTH, HEIGHT - waterY);

  // Foam/surface sheen
  ctx.fillStyle = "rgba(186,230,253,0.18)";
  ctx.fillRect(0, waterY, WIDTH, 6);

  // Animated wave lines
  const t = Date.now() / 800;
  for (let i = 0; i < 4; i++) {
    const wy = waterY + 10 + i * 14;
    const alpha = 0.25 - i * 0.04;
    ctx.strokeStyle = `rgba(147,197,253,${alpha})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = 0; x <= WIDTH; x += 3) {
      const y = wy + Math.sin(x / 48 + t + i * 1.2) * 3;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Depth shimmer dots
  ctx.fillStyle = "rgba(147,197,253,0.08)";
  for (let i = 0; i < 18; i++) {
    const wx = (i * 57 + Math.sin(Date.now() / 2000 + i) * 20 + WIDTH) % WIDTH;
    const wy2 = waterY + 20 + (i * 31) % 60;
    ctx.beginPath();
    ctx.arc(wx, wy2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMapDecorations(ctx, map) {
  // Map-specific background scenery drawn behind platforms
  if (map.id === "mesa") {
    // Sandy desert floor at bottom
    const sandGrad = ctx.createLinearGradient(0, 440, 0, HEIGHT);
    sandGrad.addColorStop(0, "#c2862a");
    sandGrad.addColorStop(1, "#7a4810");
    ctx.fillStyle = sandGrad;
    ctx.fillRect(0, 440, WIDTH, HEIGHT - 440);
    // Layered canyon wall stripes behind the pit
    const stripes = ["rgba(160,100,40,0.18)", "rgba(180,120,50,0.12)", "rgba(140,80,30,0.22)"];
    stripes.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(260, 300 + i * 40, 440, 36);
    });
    // Cactus left
    ctx.fillStyle = "#4d7c0f";
    ctx.fillRect(80, 370, 10, 55); // trunk
    ctx.fillRect(64, 390, 16, 8);  // left arm
    ctx.fillRect(64, 382, 8, 16);
    ctx.fillRect(94, 395, 16, 8);  // right arm
    ctx.fillRect(102, 388, 8, 16);
    // Cactus right
    ctx.fillRect(840, 365, 10, 60);
    ctx.fillRect(824, 385, 16, 8);
    ctx.fillRect(824, 378, 8, 16);
    ctx.fillRect(854, 390, 16, 8);
    ctx.fillRect(862, 382, 8, 16);
  }

  if (map.id === "graveyard") {
    // Ground fill at bottom
    ctx.fillStyle = "#1c1f26";
    ctx.fillRect(0, 460, WIDTH, HEIGHT - 460);
    // Moon in sky
    ctx.fillStyle = "rgba(220,220,255,0.85)";
    ctx.beginPath();
    ctx.arc(820, 75, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(100,105,130,0.55)";
    ctx.beginPath();
    ctx.arc(834, 65, 28, 0, Math.PI * 2);
    ctx.fill();
    // Tombstones (decorative, behind platforms)
    const tombs = [[60, 415], [105, 410], [185, 415], [740, 415], [800, 410], [860, 415]];
    tombs.forEach(([tx, ty]) => {
      ctx.fillStyle = "#374151";
      ctx.fillRect(tx, ty - 30, 18, 30);
      ctx.beginPath();
      ctx.arc(tx + 9, ty - 30, 9, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = "#4b5563";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx + 9, ty - 24); ctx.lineTo(tx + 9, ty - 8);
      ctx.moveTo(tx + 5, ty - 18); ctx.lineTo(tx + 13, ty - 18);
      ctx.stroke();
    });
    // Bare tree right side
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(480, 430); ctx.lineTo(480, 310);
    ctx.moveTo(480, 340); ctx.lineTo(440, 305);
    ctx.moveTo(480, 355); ctx.lineTo(520, 320);
    ctx.moveTo(480, 370); ctx.lineTo(455, 345);
    ctx.stroke();
  }

  if (map.id === "canyon") {
    // Canyon floor fill
    const floorGrad = ctx.createLinearGradient(0, 460, 0, HEIGHT);
    floorGrad.addColorStop(0, "#8B6010");
    floorGrad.addColorStop(1, "#4a3008");
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, 460, WIDTH, HEIGHT - 460);
    // Canyon wall texture lines
    const wallColors = ["rgba(120,80,20,0.3)", "rgba(100,60,10,0.2)", "rgba(150,100,30,0.25)"];
    // Left wall striping
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = wallColors[i % 3];
      ctx.fillRect(0, 260 + i * 30, 260, 18);
    }
    // Right wall striping
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = wallColors[i % 3];
      ctx.fillRect(720, 260 + i * 30, 240, 18);
    }
    // Rock outlines at canyon floor
    [[300, 470], [420, 465], [540, 472], [660, 468]].forEach(([rx, ry]) => {
      ctx.fillStyle = "rgba(100,70,20,0.4)";
      ctx.beginPath();
      ctx.ellipse(rx, ry, 22, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

function drawBackground(ctx, state) {
  const map = state.map;
  const [sky1, sky2] = map.skyColors;
  const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  grad.addColorStop(0, sky1);
  grad.addColorStop(1, sky2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Stars for graveyard
  if (map.id === "graveyard") {
    ctx.fillStyle = "rgba(220,230,255,0.7)";
    const starPos = [[50,40],[130,25],[200,60],[280,30],[350,50],[440,20],[530,45],[620,28],[700,55],[770,35],[870,42],[920,18]];
    starPos.forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Distant mountains / backdrop — unique per map
  const mountainShapes = {
    wasteland:  [[0,520],[80,285],[200,320],[350,265],[500,310],[660,258],[800,305],[960,280],[960,520]],
    archipelago:[[0,520],[60,310],[180,345],[320,290],[470,330],[600,295],[760,320],[960,300],[960,520]],
    mesa:       [[0,520],[70,240],[160,260],[280,225],[420,255],[540,235],[660,260],[800,240],[960,255],[960,520]],
    graveyard:  [[0,520],[90,320],[210,340],[340,305],[480,340],[600,310],[720,340],[860,315],[960,330],[960,520]],
    canyon:     [[0,520],[50,200],[140,225],[260,195],[400,220],[520,200],[640,215],[780,198],[900,212],[960,205],[960,520]],
  };

  const shape1 = mountainShapes[map.id] ?? mountainShapes.wasteland;
  ctx.fillStyle = map.mountainColor;
  ctx.globalAlpha = 0.32;
  ctx.beginPath();
  shape1.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py));
  ctx.closePath();
  ctx.fill();

  // Second closer layer (slightly shifted, darker)
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = adjustColor(map.mountainColor, -20);
  ctx.beginPath();
  const shape2 = shape1.map(([px, py], i) => [px, i === 0 || i === shape1.length - 1 ? py : py + 38]);
  shape2.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py));
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawHUD(ctx, state) {
  // Top bar
  ctx.fillStyle = "rgba(2,6,23,0.75)";
  ctx.fillRect(0, 0, WIDTH, 38);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(0, 37, WIDTH, 1);

  // Team names
  ctx.font = "bold 16px 'Courier New', monospace";
  ctx.textBaseline = "middle";
  ctx.fillStyle = TEAM.red.color;
  ctx.textAlign = "left";
  ctx.fillText("Kings", 14, 19);
  ctx.fillStyle = TEAM.blue.color;
  ctx.textAlign = "right";
  ctx.fillText("CPU", WIDTH - 14, 19);

  // Turn info center
  ctx.fillStyle = "#f8fafc";
  ctx.textAlign = "center";
  ctx.font = "13px 'Courier New', monospace";
  const wind = state.wind;
  const windDir = wind < 0 ? "◀" : "▶";
  const windStr = `${windDir} Wind: ${Math.abs(Math.round(wind))}`;
  ctx.fillText(`Turn ${state.turn.number}  |  ${windStr}`, WIDTH * 0.5, 19);

  // Timer arc top-right area
  const tr = state.turn.remainingMs / TURN_MS;
  const timerColor = tr > 0.4 ? "#22c55e" : tr > 0.15 ? "#f59e0b" : "#ef4444";
  ctx.strokeStyle = timerColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(WIDTH - 68, 19, 12, -Math.PI / 2, -Math.PI / 2 + tr * Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = timerColor;
  ctx.font = "bold 10px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(Math.ceil(state.turn.remainingMs / 1000), WIDTH - 68, 20);
}

function drawTeamIcons(ctx, state) {
  const redAlive = getAlive(state, "red"), blueAlive = getAlive(state, "blue");

  // Red team icons
  for (let i = 0; i < state.teamSize; i++) {
    const alive = i < redAlive.length;
    const ix = 14 + i * 18, iy = 48;
    ctx.fillStyle = alive ? TEAM.red.color : "rgba(127,29,29,0.35)";
    // Mini stickman
    ctx.beginPath();
    ctx.arc(ix, iy - 5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = alive ? TEAM.red.color : "rgba(127,29,29,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ix, iy - 1); ctx.lineTo(ix, iy + 6);
    ctx.moveTo(ix, iy + 2); ctx.lineTo(ix - 4, iy + 4);
    ctx.moveTo(ix, iy + 2); ctx.lineTo(ix + 4, iy + 4);
    ctx.moveTo(ix, iy + 6); ctx.lineTo(ix - 3, iy + 10);
    ctx.moveTo(ix, iy + 6); ctx.lineTo(ix + 3, iy + 10);
    ctx.stroke();
  }

  // Blue team icons
  for (let i = 0; i < state.teamSize; i++) {
    const alive = i < blueAlive.length;
    const ix = WIDTH - 14 - i * 18, iy = 48;
    ctx.fillStyle = alive ? TEAM.blue.color : "rgba(30,58,138,0.35)";
    ctx.beginPath();
    ctx.arc(ix, iy - 5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = alive ? TEAM.blue.color : "rgba(30,58,138,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ix, iy - 1); ctx.lineTo(ix, iy + 6);
    ctx.moveTo(ix, iy + 2); ctx.lineTo(ix - 4, iy + 4);
    ctx.moveTo(ix, iy + 2); ctx.lineTo(ix + 4, iy + 4);
    ctx.moveTo(ix, iy + 6); ctx.lineTo(ix - 3, iy + 10);
    ctx.moveTo(ix, iy + 6); ctx.lineTo(ix + 3, iy + 10);
    ctx.stroke();
  }

  // Team health bars
  const redTotal = state.units.filter(u => u.team === "red").reduce((s, u) => s + (u.alive ? u.health : 0), 0);
  const blueTotal = state.units.filter(u => u.team === "blue").reduce((s, u) => s + (u.alive ? u.health : 0), 0);
  const maxHP = state.teamSize * 100;

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(10, 62, 160, 8);
  ctx.fillStyle = TEAM.red.color;
  ctx.fillRect(10, 62, 160 * (redTotal / maxHP), 8);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 62, 160, 8);

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(WIDTH - 170, 62, 160, 8);
  ctx.fillStyle = TEAM.blue.color;
  ctx.fillRect(WIDTH - 170 + 160 * (1 - blueTotal / maxHP), 62, 160 * (blueTotal / maxHP), 8);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(WIDTH - 170, 62, 160, 8);
}

function drawScene(ctx, state) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground(ctx, state);
  drawWater(ctx, state.map);
  drawMapDecorations(ctx, state.map);
  state.map.clouds.forEach(c => drawCloud(ctx, c));
  state.map.platforms.forEach(p => drawPlatform(ctx, p, state.map));
  const active = getActiveUnit(state);
  drawExplosions(ctx, state.explosions, state.particles);
  state.units.forEach(u => drawStickman(ctx, u, state.phase === "playing" && active?.id === u.id));
  drawProjectile(ctx, state.projectile);
  drawAimLine(ctx, state, active);
  drawHUD(ctx, state);
  drawTeamIcons(ctx, state);
}

function snapshotOf(state) {
  const active = getActiveUnit(state);
  return {
    mode: state.mode, phase: state.phase, mapId: state.mapId, teamSize: state.teamSize,
    winner: state.winner, wind: state.wind,
    turn: { ...state.turn, unitName: active?.name ?? null },
    teams: { red: { alive: getAlive(state, "red").length, total: state.teamSize }, blue: { alive: getAlive(state, "blue").length, total: state.teamSize } },
    units: state.units.map(u => ({ ...u })),
  };
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@600;800&display=swap');
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  .tw-root {
    background: #06080f;
    color: #e2e8f0;
    font-family: 'Share Tech Mono', monospace;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px;
    gap: 12px;
  }
  
  .tw-header {
    width: 100%;
    max-width: 1040px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  
  .tw-title {
    font-family: 'Orbitron', sans-serif;
    font-size: 20px;
    font-weight: 800;
    background: linear-gradient(135deg, #ef4444, #f97316, #3b82f6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: 1px;
  }
  
  .tw-subtitle {
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
  }
  
  .tw-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  
  .tw-btn {
    font-family: 'Share Tech Mono', monospace;
    font-size: 12px;
    padding: 6px 14px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 3px;
    background: rgba(255,255,255,0.06);
    color: #e2e8f0;
    cursor: pointer;
    transition: all 0.15s;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .tw-btn:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.25); }
  .tw-btn.primary { background: rgba(239,68,68,0.2); border-color: #ef4444; color: #fca5a5; }
  .tw-btn.primary:hover { background: rgba(239,68,68,0.35); }
  
  .tw-config {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
    font-size: 12px;
    color: #94a3b8;
  }
  
  .tw-config label { display: flex; align-items: center; gap: 8px; }
  
  .tw-config select {
    font-family: 'Share Tech Mono', monospace;
    font-size: 12px;
    background: #0f172a;
    color: #e2e8f0;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 3px;
    padding: 4px 8px;
    cursor: pointer;
  }
  
  .tw-stage-wrap {
    position: relative;
    width: 100%;
    max-width: 1040px;
  }
  
  .tw-canvas {
    display: block;
    width: 100%;
    height: auto;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 4px;
    image-rendering: pixelated;
  }
  
  .tw-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(2,6,23,0.78);
    border-radius: 4px;
    backdrop-filter: blur(4px);
  }
  
  .tw-overlay-card {
    background: #0f1929;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 6px;
    padding: 32px 40px;
    text-align: center;
    max-width: 420px;
    width: 90%;
  }
  
  .tw-overlay-card h2 {
    font-family: 'Orbitron', sans-serif;
    font-size: 22px;
    font-weight: 800;
    background: linear-gradient(135deg, #ef4444, #3b82f6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 10px;
  }
  
  .tw-overlay-card p { font-size: 13px; color: #64748b; margin-bottom: 20px; line-height: 1.6; }
  .tw-overlay-card .tw-btn { width: 100%; font-size: 14px; padding: 10px; }
  
  .tw-bottom {
    width: 100%;
    max-width: 1040px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  
  .tw-panel {
    background: #0b1120;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 4px;
    padding: 10px 14px;
    flex: 1;
    min-width: 160px;
  }
  
  .tw-panel-title {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #475569;
    margin-bottom: 8px;
  }
  
  .tw-power-bar {
    height: 14px;
    background: #0f172a;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 2px;
    overflow: hidden;
    position: relative;
  }
  
  .tw-power-fill {
    height: 100%;
    transition: width 0.05s;
    border-radius: 2px;
  }
  
  .tw-stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    margin-bottom: 4px;
    color: #94a3b8;
  }
  
  .tw-stat-row strong { color: #e2e8f0; font-weight: normal; }
  
  .tw-team-badge {
    font-size: 12px;
    font-family: 'Orbitron', sans-serif;
    font-weight: 600;
    margin-bottom: 6px;
  }
  
  .tw-hp-bar {
    height: 8px;
    background: #0f172a;
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 4px;
  }
  
  .tw-controls-text {
    font-size: 11px;
    color: #475569;
    line-height: 1.7;
  }
  
  .tw-winner-name {
    font-family: 'Orbitron', sans-serif;
    font-size: 28px;
    font-weight: 800;
    margin: 12px 0;
  }
  
  .tw-touch-controls {
    display: flex;
    gap: 12px;
    width: 100%;
    max-width: 1040px;
    justify-content: space-between;
  }
  
  .tw-touch-group {
    display: flex;
    gap: 6px;
  }
  
  .tw-touch-group .tw-btn {
    padding: 12px 20px;
    font-size: 14px;
    min-width: 60px;
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function TerritoryWarGame() {
  const canvasRef = useRef(null);
  const stateRef = useRef(createState({ mode: "menu" }));
  const inputRef = useRef(createInput());
  const [snapshot, setSnapshot] = useState(() => snapshotOf(stateRef.current));
  const rafRef = useRef(null);

  const sync = useCallback(() => setSnapshot(snapshotOf(stateRef.current)), []);

  const start = useCallback(() => { stateRef.current = battleFromMenu(stateRef.current); sync(); }, [sync]);
  const restart = useCallback(() => { stateRef.current = restartFromAny(stateRef.current); sync(); }, [sync]);
  const pause = useCallback(() => {
    const s = stateRef.current;
    if (s.mode === "menu") return;
    s.phase = s.phase === "paused" ? "playing" : "paused";
    sync();
  }, [sync]);

  const setMap = useCallback((id) => {
    const s = stateRef.current;
    if (s.mode !== "menu") return;
    const map = findMap(id);
    s.mapId = map.id; s.map = map;
    s.units = createUnits(s.teamSize, map);
    s.turn.unitId = s.units.find(u => u.team === "red")?.id ?? null;
    sync();
  }, [sync]);

  const setTeamSize = useCallback((v) => {
    const s = stateRef.current;
    if (s.mode !== "menu") return;
    s.teamSize = clamp(Number(v), 1, 6);
    s.units = createUnits(s.teamSize, s.map);
    s.turn.unitId = s.units.find(u => u.team === "red")?.id ?? null;
    sync();
  }, [sync]);

  const setVirtual = useCallback((name, value) => { stateRef.current.virtual[name] = value; }, []);
  const holdProps = (name) => ({
    onMouseDown: () => setVirtual(name, true),
    onMouseUp: () => setVirtual(name, false),
    onMouseLeave: () => setVirtual(name, false),
    onTouchStart: (e) => { e.preventDefault(); setVirtual(name, true); },
    onTouchEnd: (e) => { e.preventDefault(); setVirtual(name, false); },
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let last = performance.now(), acc = 0, snapAcc = 0;

    const frame = (ts) => {
      const delta = Math.min(90, ts - last);
      last = ts; acc += delta;
      while (acc >= DT_MS) { stepState(stateRef.current, inputRef.current, DT); acc -= DT_MS; }
      const state = stateRef.current;
      const shake = state.cameraShake * 5;
      const ox = shake > 0 ? (state.rng() - 0.5) * shake : 0;
      const oy = shake > 0 ? (state.rng() - 0.5) * shake : 0;
      ctx.save();
      ctx.translate(ox, oy);
      drawScene(ctx, state);
      ctx.restore();
      inputRef.current.clearPressed();
      snapAcc += delta;
      if (snapAcc >= 70) { setSnapshot(snapshotOf(state)); snapAcc = 0; }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    const keys = new Set(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Space","KeyA","KeyD","KeyW","KeyQ","KeyE","KeyX","KeyR","KeyP"]);
    const onDown = (e) => {
      if (!keys.has(e.code)) return;
      if (e.code === "Enter" && stateRef.current.mode === "menu") { e.preventDefault(); start(); return; }
      e.preventDefault(); inputRef.current.press(e.code);
    };
    const onUp = (e) => { if (keys.has(e.code)) { e.preventDefault(); inputRef.current.release(e.code); } };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, [start]);

  const isTouch = typeof window !== "undefined" && ((window.matchMedia?.("(pointer: coarse)")?.matches) || (navigator.maxTouchPoints ?? 0) > 0);
  const sn = snapshot;
  const activeUnit = sn.units.find(u => u.id === sn.turn.unitId);
  const powerPct = sn.turn.charge * 100;
  const powerColor = powerPct < 40 ? "#22c55e" : powerPct < 75 ? "#f59e0b" : "#ef4444";
  const redHP = sn.units.filter(u => u.team === "red").reduce((s, u) => s + (u.alive ? u.health : 0), 0);
  const blueHP = sn.units.filter(u => u.team === "blue").reduce((s, u) => s + (u.alive ? u.health : 0), 0);
  const maxHP = sn.teamSize * 100;

  return (
    <>
      <style>{CSS}</style>
      <div className="tw-root">
        {/* Header */}
        <div className="tw-header">
          <div>
            <div className="tw-title">Territory War: Stick Arena</div>
            <div className="tw-subtitle">Turn-based tactical combat · stickmen · grenades · high-ground</div>
          </div>
          <div className="tw-actions">
            <button className="tw-btn primary" onClick={start}>▶ Start</button>
            <button className="tw-btn" onClick={restart}>↺ Restart</button>
            <button className="tw-btn" onClick={pause}>{sn.phase === "paused" ? "▶ Resume" : "⏸ Pause"}</button>
          </div>
        </div>

        {/* Config */}
        {sn.mode === "menu" && (
          <div className="tw-config">
            <label>
              <span>Map:</span>
              <select value={sn.mapId} onChange={e => setMap(e.target.value)}>
                {MAPS.map(m => <option key={m.id} value={m.id}>{m.name}{m.water ? " 🌊" : ""}</option>)}
              </select>
            </label>
            <label>
              <span>Team size:</span>
              <select value={sn.teamSize} onChange={e => setTeamSize(e.target.value)}>
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}v{n}</option>)}
              </select>
            </label>
          </div>
        )}

        {/* Canvas */}
        <div className="tw-stage-wrap">
          <canvas
            ref={canvasRef}
            className="tw-canvas"
            width={WIDTH}
            height={HEIGHT}
            onPointerMove={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
              const y = ((e.clientY - rect.top) / rect.height) * HEIGHT;
              stateRef.current.pointer.x = clamp(x, 0, WIDTH);
              stateRef.current.pointer.y = clamp(y, 0, HEIGHT);
              stateRef.current.pointer.inside = x >= 0 && x <= WIDTH && y >= 0 && y <= HEIGHT;
            }}
            onPointerDown={() => { stateRef.current.pointer.down = true; }}
            onPointerUp={() => { stateRef.current.pointer.down = false; }}
            onPointerLeave={() => { stateRef.current.pointer.down = false; stateRef.current.pointer.inside = false; }}
          />

          {sn.mode === "menu" && (
            <div className="tw-overlay">
              <div className="tw-overlay-card">
                <h2>Territory War</h2>
                <p style={{ color: "#94a3b8", marginBottom: 6 }}>
                  {MAP_DESC[sn.mapId] ?? "Tactical stickman combat."}
                </p>
                <p>Eliminate the enemy team with grenades and smart positioning. Last team standing wins.</p>
                <button className="tw-btn primary" onClick={start}>▶ Start Battle</button>
              </div>
            </div>
          )}

          {sn.phase === "paused" && (
            <div className="tw-overlay">
              <div className="tw-overlay-card">
                <h2>Paused</h2>
                <p>Game is paused.</p>
                <button className="tw-btn" onClick={pause}>▶ Resume</button>
              </div>
            </div>
          )}

          {sn.phase === "match-over" && (
            <div className="tw-overlay">
              <div className="tw-overlay-card">
                <h2>Battle Over</h2>
                <div className="tw-winner-name" style={{ color: sn.winner === "red" ? "#ef4444" : sn.winner === "blue" ? "#3b82f6" : "#94a3b8" }}>
                  {sn.winner === "draw" ? "Draw!" : sn.winner === "red" ? "Kings Win!" : "CPU Wins!"}
                </div>
                <button className="tw-btn primary" onClick={restart}>↺ Play Again</button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom panels */}
        {sn.mode !== "menu" && (
          <div className="tw-bottom">
            {/* Turn info */}
            <div className="tw-panel">
              <div className="tw-panel-title">Turn Info</div>
              <div className="tw-stat-row"><span>Turn</span><strong>#{sn.turn.number}</strong></div>
              <div className="tw-stat-row"><span>Active</span><strong>{activeUnit?.name ?? "—"} ({sn.turn.team})</strong></div>
              <div className="tw-stat-row"><span>Timer</span><strong>{Math.ceil(sn.turn.remainingMs / 1000)}s</strong></div>
              <div className="tw-stat-row"><span>Move left</span><strong>{Math.round(sn.turn.movementLeft)}</strong></div>
              <div className="tw-stat-row"><span>Aim angle</span><strong>{Math.round(sn.turn.aimDeg)}°</strong></div>
            </div>

            {/* Power bar */}
            <div className="tw-panel" style={{ minWidth: 200 }}>
              <div className="tw-panel-title">Power</div>
              <div className="tw-power-bar" style={{ marginBottom: 8 }}>
                <div className="tw-power-fill" style={{ width: `${powerPct}%`, background: powerColor }} />
              </div>
              <div className="tw-stat-row"><span>Charge</span><strong>{Math.round(powerPct)}%</strong></div>
              <div className="tw-stat-row"><span>Wind</span><strong>{sn.wind < 0 ? "◀" : "▶"} {Math.abs(Math.round(sn.wind))}</strong></div>
              <div className="tw-stat-row"><span>State</span><strong style={{ color: sn.turn.state === "charging" ? "#f97316" : "#94a3b8" }}>{sn.turn.state}</strong></div>
            </div>

            {/* Red team */}
            <div className="tw-panel">
              <div className="tw-team-badge" style={{ color: TEAM.red.color }}>Kings</div>
              <div className="tw-stat-row"><span>Alive</span><strong>{sn.teams.red.alive}/{sn.teams.red.total}</strong></div>
              <div className="tw-hp-bar">
                <div style={{ height: "100%", width: `${(redHP / maxHP) * 100}%`, background: TEAM.red.color, borderRadius: 2 }} />
              </div>
              {sn.units.filter(u => u.team === "red").map(u => (
                <div key={u.id} className="tw-stat-row" style={{ opacity: u.alive ? 1 : 0.35 }}>
                  <span>{u.name}</span>
                  <strong style={{ color: u.health > 60 ? "#22c55e" : u.health > 30 ? "#f59e0b" : "#ef4444" }}>
                    {u.alive ? `${u.health}HP` : "✖"}
                  </strong>
                </div>
              ))}
            </div>

            {/* Blue team */}
            <div className="tw-panel">
              <div className="tw-team-badge" style={{ color: TEAM.blue.color }}>CPU</div>
              <div className="tw-stat-row"><span>Alive</span><strong>{sn.teams.blue.alive}/{sn.teams.blue.total}</strong></div>
              <div className="tw-hp-bar">
                <div style={{ height: "100%", width: `${(blueHP / maxHP) * 100}%`, background: TEAM.blue.color, borderRadius: 2 }} />
              </div>
              {sn.units.filter(u => u.team === "blue").map(u => (
                <div key={u.id} className="tw-stat-row" style={{ opacity: u.alive ? 1 : 0.35 }}>
                  <span>{u.name}</span>
                  <strong style={{ color: u.health > 60 ? "#22c55e" : u.health > 30 ? "#f59e0b" : "#ef4444" }}>
                    {u.alive ? `${u.health}HP` : "✖"}
                  </strong>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="tw-panel">
              <div className="tw-panel-title">Controls</div>
              <div className="tw-controls-text">
                A/D — Move<br/>
                W — Jump<br/>
                Q/E — Aim angle<br/>
                Mouse — Point to aim<br/>
                Space/Click+Hold — Charge<br/>
                Release — Throw<br/>
                X — Cancel throw<br/>
                P — Pause · R — Restart
              </div>
            </div>
          </div>
        )}

        {/* Touch controls */}
        {isTouch && sn.mode !== "menu" && (
          <div className="tw-touch-controls">
            <div className="tw-touch-group">
              <button className="tw-btn" {...holdProps("left")}>◀</button>
              <button className="tw-btn" {...holdProps("right")}>▶</button>
              <button className="tw-btn" onTouchStart={e => { e.preventDefault(); setVirtual("jump", true); }} onTouchEnd={e => { e.preventDefault(); setVirtual("jump", false); }}>↑ Jump</button>
            </div>
            <div className="tw-touch-group">
              <button className="tw-btn" {...holdProps("aimUp")}>Aim ▲</button>
              <button className="tw-btn" {...holdProps("aimDown")}>Aim ▼</button>
              <button className="tw-btn" {...holdProps("fire")}>🔥 Throw</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
