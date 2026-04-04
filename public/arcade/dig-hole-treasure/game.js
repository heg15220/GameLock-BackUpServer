(function () {
  const FIXED_DT = 1 / 60;
  const CELL = 14;
  const GRID_COLS = 128;
  const SURFACE_Y = 220;
  const PLAYER_W = 20;
  const PLAYER_H = 42;
  const MOVE_SPEED = 170;
  const MOVE_ACCEL = 1320;
  const MOVE_FRICTION = 1480;
  const DIG_RANGE = 112;
  const STORAGE_KEY = "dig-hole-html-progress-v3";

  const SHOVEL_NAMES = ["Manual", "Hierro", "Acero", "Titanio"];
  const SHOVEL_COSTS = [0, 90, 210, 420];
  const DIG_RADII = [28, 36, 46, 56];
  const DIG_COOLDOWNS = [0.22, 0.18, 0.14, 0.1];
  const CAPACITY_VALUES = [12, 20, 30, 44];
  const CAPACITY_COSTS = [0, 80, 180, 320];

  const state = {
    canvas: null,
    ctx: null,
    shell: null,
    hud: {},
    viewportWidth: 0,
    viewportHeight: 0,
    dpr: 1,
    keys: Object.create(null),
    pointer: { x: 0, y: 0, down: false, inside: false },
    progress: loadProgress(),
    selectedWorldId: "jungle",
    screen: "world_select",
    panelMode: "inventory",
    run: null,
    message: "",
    messageTimer: 0,
    showcaseTime: 0,
    uiTick: 0,
    uiDirty: true,
    rafId: 0,
    accumulator: 0,
    lastTime: 0,
  };

  const WORLDS = {
    jungle: {
      id: "jungle",
      title: "Selva Enterrada",
      subtitle: "Tierra humeda continua, raices suaves y minerales verdes incrustados.",
      treasureName: "Corazon de la Selva",
      shopName: "Puesto de la Selva",
      maxDepthMeters: 3200,
      depositCount: 130,
      theme: {
        skyTop: "#7bc89f",
        skyBottom: "#ebf8cf",
        sun: "#fff0b8",
        haze: "#d7f1cf",
        undergroundBack: "#2b2018",
        accent: "#9ee2b7",
        accentStrong: "#f3d37a",
        outpost: "#8d5a36",
        outpostTrim: "#ecd49e",
      },
      soilStops: [
        { at: 0, color: "#7d5634" },
        { at: 0.45, color: "#664126" },
        { at: 1, color: "#3f2618" },
      ],
      cardFacts: [
        "El subsuelo es tierra continua de selva, sin bloques visibles.",
        "Las vetas aparecen incrustadas a medida que abres huecos en la pared.",
        "Arcilla, ambar, jade y esmeraldas se mezclan segun la profundidad.",
      ],
      materials: [
        { id: "clay", name: "Arcilla", rarity: 1, value: 4, color: "#b4774e", accent: "#ddb089", weights: [46, 24, 8, 2] },
        { id: "amber", name: "Ambar", rarity: 2, value: 11, color: "#d59232", accent: "#ffd78e", weights: [24, 20, 8, 2] },
        { id: "jade", name: "Jade", rarity: 3, value: 22, color: "#2a9f63", accent: "#abf0c7", weights: [4, 18, 18, 6] },
        { id: "emerald", name: "Esmeralda", rarity: 4, value: 40, color: "#0d8b49", accent: "#9ef7bf", weights: [1, 6, 12, 14] },
      ],
    },
    desert: {
      id: "desert",
      title: "Desierto Hundido",
      subtitle: "Arena en la superficie y cerca de ella, con vetas minerales atrapadas en la duna compacta.",
      treasureName: "Corona del Sol",
      shopName: "Puesto del Oasis",
      maxDepthMeters: 3000,
      depositCount: 124,
      theme: {
        skyTop: "#ffd290",
        skyBottom: "#fff2d1",
        sun: "#fff2bb",
        haze: "#ffe4bc",
        undergroundBack: "#332416",
        accent: "#ffd79b",
        accentStrong: "#ffbf64",
        outpost: "#a96535",
        outpostTrim: "#ffe1ad",
      },
      soilStops: [
        { at: 0, color: "#d8b47a" },
        { at: 0.18, color: "#cfab6c" },
        { at: 0.44, color: "#aa7440" },
        { at: 1, color: "#6f4724" },
      ],
      cardFacts: [
        "La capa alta y cercana a la superficie es arena casi completa.",
        "La arena se compacta en profundidad, pero sigue sin verse cuadriculada.",
        "Sal, turquesa, cobre y opalo aparecen incrustados en la pared.",
      ],
      materials: [
        { id: "salt", name: "Sal", rarity: 1, value: 4, color: "#f1f3ef", accent: "#ffffff", weights: [30, 12, 4, 1] },
        { id: "copper", name: "Cobre", rarity: 2, value: 10, color: "#b86d37", accent: "#f6c8a5", weights: [24, 18, 8, 2] },
        { id: "turquoise", name: "Turquesa", rarity: 3, value: 21, color: "#1aaeb4", accent: "#bbfdff", weights: [4, 16, 16, 6] },
        { id: "sunopal", name: "Opalo solar", rarity: 4, value: 38, color: "#f39f45", accent: "#fff2ac", weights: [1, 6, 12, 13] },
      ],
    },
    urban: {
      id: "urban",
      title: "Patio Urbano",
      subtitle: "Bajo la urbanizacion solo hay tierra removida, con restos y minerales mezclados en la pared.",
      treasureName: "Capsula del Barrio",
      shopName: "Puesto del Patio",
      maxDepthMeters: 3100,
      depositCount: 128,
      theme: {
        skyTop: "#a7d4ff",
        skyBottom: "#eef7ff",
        sun: "#fff0bc",
        haze: "#dbeeff",
        undergroundBack: "#25211f",
        accent: "#a9d6ff",
        accentStrong: "#ffd68f",
        outpost: "#7c5543",
        outpostTrim: "#f1d1a5",
      },
      soilStops: [
        { at: 0, color: "#7f5d3d" },
        { at: 0.48, color: "#65482f" },
        { at: 1, color: "#3b2a20" },
      ],
      cardFacts: [
        "La urbanizacion se abre sobre una masa de tierra uniforme.",
        "La tierra se va vaciando a mano y deja restos incrustados visibles.",
        "Ceramica, cobre, plata y cristal aparecen al avanzar.",
      ],
      materials: [
        { id: "ceramic", name: "Ceramica", rarity: 1, value: 5, color: "#d3c2b1", accent: "#f3e4d4", weights: [34, 16, 6, 1] },
        { id: "pipe", name: "Tuberia", rarity: 2, value: 11, color: "#b77542", accent: "#f5c9a1", weights: [22, 18, 8, 2] },
        { id: "silver", name: "Plata", rarity: 3, value: 22, color: "#bac5d8", accent: "#ffffff", weights: [4, 14, 16, 6] },
        { id: "crystal", name: "Cristal", rarity: 4, value: 40, color: "#73d9f7", accent: "#ffffff", weights: [1, 6, 12, 14] },
      ],
    },
  };

  function loadProgress() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { bestDepthByWorld: {}, completedWorlds: {} };
      const parsed = JSON.parse(raw);
      return {
        bestDepthByWorld: parsed.bestDepthByWorld || {},
        completedWorlds: parsed.completedWorlds || {},
      };
    } catch {
      return { bestDepthByWorld: {}, completedWorlds: {} };
    }
  }

  function saveProgress() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
    } catch {
      // Ignore storage failures.
    }
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function approach(current, target, delta) {
    if (current < target) return Math.min(target, current + delta);
    if (current > target) return Math.max(target, current - delta);
    return target;
  }

  function round(value, digits) {
    const factor = 10 ** (digits || 0);
    return Math.round(value * factor) / factor;
  }

  function hashString(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function hashUnit(seed, x, y) {
    let value = seed ^ Math.imul(x + 17, 374761393) ^ Math.imul(y + 23, 668265263);
    value = Math.imul(value ^ (value >>> 13), 1274126177);
    value ^= value >>> 16;
    return ((value >>> 0) % 100000) / 100000;
  }

  function parseHex(hex) {
    const clean = hex.replace("#", "");
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }

  function mixRgb(a, b, t) {
    return [
      Math.round(lerp(a[0], b[0], t)),
      Math.round(lerp(a[1], b[1], t)),
      Math.round(lerp(a[2], b[2], t)),
    ];
  }

  function markUiDirty() {
    state.uiDirty = true;
  }

  function setMessage(text, duration) {
    state.message = text;
    state.messageTimer = duration || 2;
    markUiDirty();
  }

  function formatDepth(meters) {
    if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
    return `${Math.round(meters)} m`;
  }

  function getRarityLabel(rarity) {
    return ["Comun", "Comun", "Poco comun", "Raro", "Muy raro"][rarity] || "Comun";
  }

  function worldById(id) {
    return WORLDS[id] || WORLDS.jungle;
  }

  function currentWorld() {
    return worldById(state.selectedWorldId);
  }

  function materialMap(world) {
    if (!world._materialMap) {
      world._materialMap = Object.fromEntries(world.materials.map((material) => [material.id, material]));
    }
    return world._materialMap;
  }

  function applyWorldTheme(world) {
    const root = document.documentElement.style;
    root.setProperty("--sky-top", world.theme.skyTop);
    root.setProperty("--sky-bottom", world.theme.skyBottom);
    root.setProperty("--accent", world.theme.accent);
    root.setProperty("--accent-strong", world.theme.accentStrong);
    root.setProperty("--panel-wood", world.theme.outpost);
    root.setProperty("--panel-trim", world.theme.outpostTrim);
  }

  function soilRgbAt(world, depthRatio, noise) {
    const stops = world.soilStops;
    let lower = stops[0];
    let upper = stops[stops.length - 1];
    for (let index = 0; index < stops.length - 1; index += 1) {
      const current = stops[index];
      const next = stops[index + 1];
      if (depthRatio >= current.at && depthRatio <= next.at) {
        lower = current;
        upper = next;
        break;
      }
    }
    const span = Math.max(0.0001, upper.at - lower.at);
    const t = clamp((depthRatio - lower.at) / span, 0, 1);
    const mixed = mixRgb(parseHex(lower.color), parseHex(upper.color), t);
    const variation = 0.86 + noise * 0.26;
    return [
      clamp(Math.round(mixed[0] * variation), 0, 255),
      clamp(Math.round(mixed[1] * variation), 0, 255),
      clamp(Math.round(mixed[2] * variation), 0, 255),
    ];
  }

  function gridIndex(run, col, row) {
    return row * run.gridCols + col;
  }

  function isCellSolid(run, col, row) {
    if (col < 0 || row < 0 || col >= run.gridCols || row >= run.gridRows) return false;
    return run.solid[gridIndex(run, col, row)] === 1;
  }

  function setCell(run, col, row, solid) {
    if (col < 0 || row < 0 || col >= run.gridCols || row >= run.gridRows) return;
    run.solid[gridIndex(run, col, row)] = solid ? 1 : 0;
  }

  function worldToCell(run, x, y) {
    return {
      col: Math.floor(x / CELL),
      row: Math.floor((y - run.surfaceY) / CELL),
    };
  }

  function clearCircle(run, centerX, centerY, radius) {
    const minCol = Math.floor((centerX - radius) / CELL);
    const maxCol = Math.ceil((centerX + radius) / CELL);
    const minRow = Math.floor((centerY - radius - run.surfaceY) / CELL);
    const maxRow = Math.ceil((centerY + radius - run.surfaceY) / CELL);
    let removed = 0;
    for (let row = minRow; row <= maxRow; row += 1) {
      if (row < 0 || row >= run.gridRows) continue;
      for (let col = minCol; col <= maxCol; col += 1) {
        if (col < 0 || col >= run.gridCols) continue;
        if (!isCellSolid(run, col, row)) continue;
        const cellCenterX = col * CELL + CELL * 0.5;
        const cellCenterY = run.surfaceY + row * CELL + CELL * 0.5;
        if (Math.hypot(cellCenterX - centerX, cellCenterY - centerY) <= radius) {
          setCell(run, col, row, 0);
          removed += 1;
        }
      }
    }
    if (removed > 0) run.terrainDirty = true;
    return removed;
  }

  function rebuildTerrainTexture(run) {
    const imageData = run.terrainCtx.createImageData(run.gridCols, run.gridRows);
    const data = imageData.data;
    for (let row = 0; row < run.gridRows; row += 1) {
      const depthRatio = row / Math.max(1, run.gridRows - 1);
      for (let col = 0; col < run.gridCols; col += 1) {
        const offset = (row * run.gridCols + col) * 4;
        if (run.solid[gridIndex(run, col, row)] === 1) {
          const rgb = soilRgbAt(run.world, depthRatio, hashUnit(run.seed, col, row));
          data[offset] = rgb[0];
          data[offset + 1] = rgb[1];
          data[offset + 2] = rgb[2];
          data[offset + 3] = 255;
        } else {
          data[offset] = 0;
          data[offset + 1] = 0;
          data[offset + 2] = 0;
          data[offset + 3] = 0;
        }
      }
    }
    run.terrainCtx.putImageData(imageData, 0, 0);
    run.terrainDirty = false;
  }

  function sampleMaterial(world, seed, depthRatio, xSeed, ySeed) {
    const band = Math.min(3, Math.floor(depthRatio * 4));
    let totalWeight = 0;
    for (const material of world.materials) totalWeight += material.weights[band];
    let cursor = hashUnit(seed, xSeed, ySeed) * totalWeight;
    for (const material of world.materials) {
      cursor -= material.weights[band];
      if (cursor <= 0) return material;
    }
    return world.materials[world.materials.length - 1];
  }

  function generateDeposits(run) {
    const deposits = [];
    run.materialById = materialMap(run.world);
    const rowsUsable = run.gridRows - 12;
    for (let index = 0; index < run.world.depositCount; index += 1) {
      const depthRatio = hashUnit(run.seed, 111 + index, 813 + index);
      const row = 8 + Math.floor(depthRatio * rowsUsable);
      const x = CELL * (8 + Math.floor(hashUnit(run.seed, 391 + index, 277 + index) * (run.gridCols - 16)));
      const y = run.surfaceY + row * CELL + CELL * 0.5;
      const material = sampleMaterial(run.world, run.seed, depthRatio, 200 + index, 500 + index);
      deposits.push({
        id: `${material.id}-${index}`,
        materialId: material.id,
        x,
        y,
        radius: 7 + material.rarity * 2 + Math.floor(hashUnit(run.seed, 701 + index, 919 + index) * 4),
        exposed: 0,
        discovered: false,
        collected: false,
      });
    }
    run.deposits = deposits;
    const treasureRow = Math.floor(run.gridRows * 0.84);
    run.treasure = {
      x: CELL * (18 + Math.floor(hashUnit(run.seed, 99, 14) * (run.gridCols - 36))),
      y: run.surfaceY + treasureRow * CELL,
      radius: 28,
      exposure: 0,
      claimed: false,
      promptReady: false,
      bonusCoins: 180,
    };
  }

  function buildRun(worldId) {
    const world = worldById(worldId);
    const seed = hashString(`${worldId}:continuous-earth-run`);
    const gridRows = Math.ceil(world.maxDepthMeters / 18) + 18;
    const metersPerRow = world.maxDepthMeters / Math.max(1, gridRows - 12);
    const worldWidth = GRID_COLS * CELL;
    const run = {
      worldId,
      world,
      seed,
      gridCols: GRID_COLS,
      gridRows,
      solid: new Uint8Array(GRID_COLS * gridRows),
      terrainCanvas: document.createElement("canvas"),
      terrainCtx: null,
      terrainDirty: true,
      worldWidth,
      worldHeight: SURFACE_Y + gridRows * CELL,
      surfaceY: SURFACE_Y,
      metersPerRow,
      player: {
        x: worldWidth * 0.5 - PLAYER_W * 0.5,
        y: SURFACE_Y - PLAYER_H,
        w: PLAYER_W,
        h: PLAYER_H,
        vx: 0,
        vy: 0,
        facing: 1,
        digCooldown: 0,
        digFlash: 0,
        walkCycle: 0,
      },
      camera: { x: 0, y: 0 },
      outpost: { x: worldWidth * 0.5 + 154, y: SURFACE_Y - 6 },
      shaftX: worldWidth * 0.5,
      coins: 0,
      inventory: Object.create(null),
      inventoryCount: 0,
      shovelLevel: 0,
      capacityLevel: 0,
      deposits: [],
      treasure: null,
      particles: [],
      celebration: [],
      bestDepthMeters: state.progress.bestDepthByWorld[worldId] || 0,
      guidanceArrow: "v",
      guidanceTitle: "Excava hacia abajo",
      guidanceCopy: "La tierra se abre de forma continua y los materiales asoman en la pared.",
      digTarget: null,
      materialScanCooldown: 0,
      inventoryWarningCooldown: 0,
    };

    run.terrainCanvas.width = run.gridCols;
    run.terrainCanvas.height = run.gridRows;
    run.terrainCtx = run.terrainCanvas.getContext("2d", { willReadFrequently: true });

    run.solid.fill(1);
    for (let step = 0; step < 10; step += 1) {
      clearCircle(run, run.shaftX + Math.sin(step * 0.45) * 8, SURFACE_Y + 26 + step * 28, 30 + (step % 2) * 3);
    }
    clearCircle(run, run.shaftX, SURFACE_Y + 320, 44);
    generateDeposits(run);
    rebuildTerrainTexture(run);
    return run;
  }

  function currentCapacity(run) {
    return CAPACITY_VALUES[run.capacityLevel];
  }

  function inventoryEntries(run) {
    return Object.keys(run.inventory)
      .map((materialId) => ({
        id: materialId,
        qty: run.inventory[materialId],
        material: run.materialById[materialId],
      }))
      .sort((a, b) => b.material.value - a.material.value);
  }

  function currentDepthMeters(run) {
    const row = clamp(Math.floor((run.player.y + run.player.h - run.surfaceY) / CELL), 0, run.gridRows);
    return Math.round(row * run.metersPerRow);
  }

  function currentDepthRatio(run) {
    return clamp(currentDepthMeters(run) / run.world.maxDepthMeters, 0, 1);
  }

  function currentSoilLabel(run) {
    const depthRatio = currentDepthRatio(run);
    if (run.worldId === "desert" && depthRatio < 0.26) return "Arena";
    return "Tierra";
  }

  function isSolidAt(run, x, y) {
    if (x < 0 || x >= run.worldWidth) return true;
    if (y < run.surfaceY) return false;
    const cell = worldToCell(run, x, y);
    if (cell.row < 0) return false;
    if (cell.row >= run.gridRows || cell.col < 0 || cell.col >= run.gridCols) return true;
    return run.solid[gridIndex(run, cell.col, cell.row)] === 1;
  }

  function canOccupy(run, x, y) {
    const points = [
      [x + PLAYER_W * 0.5, y + 4],
      [x + 4, y + 12],
      [x + PLAYER_W - 4, y + 12],
      [x + 4, y + PLAYER_H - 6],
      [x + PLAYER_W - 4, y + PLAYER_H - 6],
      [x + PLAYER_W * 0.5, y + PLAYER_H * 0.55],
    ];
    for (const point of points) {
      if (isSolidAt(run, point[0], point[1])) return false;
    }
    return true;
  }

  function movePlayerAxis(run, axis, amount) {
    if (!amount) return;
    const player = run.player;
    const steps = Math.max(1, Math.ceil(Math.abs(amount) / 4));
    const delta = amount / steps;
    for (let index = 0; index < steps; index += 1) {
      const nextX = axis === "x" ? player.x + delta : player.x;
      const nextY = axis === "y" ? player.y + delta : player.y;
      if (canOccupy(run, nextX, nextY)) {
        player.x = nextX;
        player.y = nextY;
      } else if (axis === "x") {
        player.vx = 0;
        break;
      } else {
        player.vy = 0;
        break;
      }
    }
  }

  function centerOfPlayer(run) {
    return {
      x: run.player.x + run.player.w * 0.5,
      y: run.player.y + run.player.h * 0.46,
    };
  }

  function resolveDigTarget(run) {
    const center = centerOfPlayer(run);
    let targetX = null;
    let targetY = null;
    if (state.keys.KeyJ) {
      targetX = center.x - 54;
      targetY = center.y + 2;
    } else if (state.keys.KeyL) {
      targetX = center.x + 54;
      targetY = center.y + 2;
    } else if (state.keys.KeyK) {
      targetX = center.x;
      targetY = center.y + 54;
    } else if (state.pointer.down && state.pointer.inside) {
      targetX = state.pointer.x + run.camera.x;
      targetY = state.pointer.y + run.camera.y;
    }

    if (targetX == null || targetY == null) {
      run.digTarget = null;
      return null;
    }
    if (targetY < run.surfaceY + 6) {
      run.digTarget = null;
      return null;
    }
    if (Math.hypot(targetX - center.x, targetY - center.y) > DIG_RANGE) {
      run.digTarget = null;
      return null;
    }
    run.digTarget = { x: targetX, y: targetY };
    run.player.facing = targetX >= center.x ? 1 : -1;
    return run.digTarget;
  }

  function spawnParticles(run, x, y, count, colorA, colorB) {
    for (let index = 0; index < count; index += 1) {
      run.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 180,
        vy: -40 - Math.random() * 120,
        life: 0.3 + Math.random() * 0.4,
        size: 2 + Math.random() * 4,
        color: Math.random() > 0.55 ? colorA : colorB,
      });
    }
  }

  function digAt(run, target) {
    const radius = DIG_RADII[run.shovelLevel];
    const removed = clearCircle(run, target.x, target.y, radius);
    if (removed <= 0) return;
    run.player.digCooldown = DIG_COOLDOWNS[run.shovelLevel];
    run.player.digFlash = 0.18;
    run.materialScanCooldown = 0;
    spawnParticles(run, target.x, target.y, 14, "#d5a473", "#8f653f");
    updateProgressDepth(run);
    markUiDirty();
  }

  function updateDigging(run, dt) {
    run.player.digCooldown = Math.max(0, run.player.digCooldown - dt);
    run.player.digFlash = Math.max(0, run.player.digFlash - dt);
    const target = resolveDigTarget(run);
    if (!target || run.player.digCooldown > 0) return;
    if (!state.pointer.down && !state.keys.KeyJ && !state.keys.KeyK && !state.keys.KeyL) return;
    digAt(run, target);
  }

  function depositExposure(run, deposit) {
    const samples = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [0.72, 0.72],
      [-0.72, 0.72],
      [0.72, -0.72],
      [-0.72, -0.72],
    ];
    let open = 0;
    const radius = deposit.radius + 5;
    for (const sample of samples) {
      const sampleX = deposit.x + sample[0] * radius;
      const sampleY = deposit.y + sample[1] * radius;
      if (!isSolidAt(run, sampleX, sampleY)) open += 1;
    }
    return open / samples.length;
  }

  function collectDeposit(run, deposit) {
    if (run.inventoryCount >= currentCapacity(run)) {
      if (run.inventoryWarningCooldown <= 0) {
        setMessage("Mochila llena. Sube al puesto para vender.", 1.4);
        run.inventoryWarningCooldown = 1;
      }
      return;
    }
    const material = run.materialById[deposit.materialId];
    deposit.collected = true;
    run.inventory[deposit.materialId] = (run.inventory[deposit.materialId] || 0) + 1;
    run.inventoryCount += 1;
    spawnParticles(run, deposit.x, deposit.y, 12, material.accent, material.color);
    setMessage(`${material.name} encontrado.`, 0.9);
    markUiDirty();
  }

  function updateDeposits(run, dt) {
    run.inventoryWarningCooldown = Math.max(0, run.inventoryWarningCooldown - dt);
    run.materialScanCooldown -= dt;
    if (run.materialScanCooldown <= 0) {
      for (const deposit of run.deposits) {
        if (deposit.collected) continue;
        deposit.exposed = depositExposure(run, deposit);
        if (deposit.exposed > 0.06) deposit.discovered = true;
      }
      const center = centerOfPlayer(run);
      run.treasure.exposure = depositExposure(run, run.treasure);
      run.treasure.promptReady = run.treasure.exposure > 0.34 && Math.hypot(center.x - run.treasure.x, center.y - run.treasure.y) < 64;
      run.materialScanCooldown = 0.08;
      markUiDirty();
    }

    const center = centerOfPlayer(run);
    for (const deposit of run.deposits) {
      if (deposit.collected || deposit.exposed < 0.42) continue;
      if (Math.hypot(center.x - deposit.x, center.y - deposit.y) <= deposit.radius + 22) {
        collectDeposit(run, deposit);
      }
    }
  }

  function updateParticles(run, dt) {
    const remaining = [];
    for (const particle of run.particles) {
      particle.life -= dt;
      if (particle.life <= 0) continue;
      particle.vy += 160 * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      remaining.push(particle);
    }
    run.particles = remaining;

    const confetti = [];
    for (const piece of run.celebration) {
      piece.life -= dt;
      if (piece.life <= 0) continue;
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      piece.vy += 90 * dt;
      piece.rotation += piece.spin * dt;
      confetti.push(piece);
    }
    run.celebration = confetti;
  }

  function updatePlayer(run, dt) {
    const player = run.player;
    const left = state.keys.KeyA || state.keys.ArrowLeft;
    const right = state.keys.KeyD || state.keys.ArrowRight;
    const up = state.keys.KeyW || state.keys.ArrowUp || state.keys.Space;
    const down = state.keys.ArrowDown;
    const axisX = (right ? 1 : 0) - (left ? 1 : 0);
    const axisY = (down ? 1 : 0) - (up ? 1 : 0);
    const length = Math.hypot(axisX, axisY) || 1;
    const targetVX = axisX ? (axisX / length) * MOVE_SPEED : 0;
    const targetVY = axisY ? (axisY / length) * MOVE_SPEED : 0;
    const accel = (axisX || axisY) ? MOVE_ACCEL : MOVE_FRICTION;

    player.vx = approach(player.vx, targetVX, accel * dt);
    player.vy = approach(player.vy, targetVY, accel * dt);
    movePlayerAxis(run, "x", player.vx * dt);
    movePlayerAxis(run, "y", player.vy * dt);

    player.x = clamp(player.x, 0, run.worldWidth - player.w);
    player.y = clamp(player.y, run.surfaceY - player.h, run.worldHeight - player.h - 4);
    if (Math.abs(player.vx) > 8) player.facing = player.vx >= 0 ? 1 : -1;
    player.walkCycle += Math.hypot(player.vx, player.vy) * dt * 0.028;
  }

  function updateCamera(run) {
    const targetX = clamp(run.player.x + run.player.w * 0.5 - state.viewportWidth * 0.5, 0, Math.max(0, run.worldWidth - state.viewportWidth));
    const targetY = clamp(run.player.y + run.player.h * 0.5 - state.viewportHeight * 0.52, 0, Math.max(0, run.worldHeight - state.viewportHeight));
    run.camera.x = lerp(run.camera.x, targetX, 0.12);
    run.camera.y = lerp(run.camera.y, targetY, 0.12);
  }

  function updateProgressDepth(run) {
    const depth = currentDepthMeters(run);
    if (depth > run.bestDepthMeters) {
      run.bestDepthMeters = depth;
      state.progress.bestDepthByWorld[run.worldId] = depth;
      saveProgress();
      markUiDirty();
    }
  }

  function arrowFromVector(dx, dy) {
    if (Math.abs(dx) < 28 && Math.abs(dy) < 28) return "o";
    if (Math.abs(dx) > Math.abs(dy) * 1.25) return dx > 0 ? ">" : "<";
    if (Math.abs(dy) > Math.abs(dx) * 1.25) return dy > 0 ? "v" : "^";
    if (dx > 0 && dy > 0) return "/";
    if (dx < 0 && dy > 0) return "\\";
    if (dx > 0 && dy < 0) return "\\";
    return "/";
  }

  function updateGuidance(run) {
    const center = centerOfPlayer(run);
    if (run.inventoryCount >= currentCapacity(run)) {
      run.guidanceArrow = "^";
      run.guidanceTitle = "Mochila llena";
      run.guidanceCopy = "Vuelve al puesto de la superficie para vender lo recogido.";
      return;
    }
    const dx = run.treasure.x - center.x;
    const dy = run.treasure.y - center.y;
    run.guidanceArrow = arrowFromVector(dx, dy);
    run.guidanceTitle = run.treasure.exposure > 0.18 ? run.world.treasureName : "Hallazgo principal";
    run.guidanceCopy = run.treasure.exposure > 0.18
      ? "El hallazgo final ya asoma entre la tierra."
      : "Sigue excavando y observa como los materiales quedan incrustados en la pared.";
  }

  function isAtOutpost(run) {
    const center = centerOfPlayer(run);
    return currentDepthMeters(run) < 26 && Math.abs(center.x - run.outpost.x) < 92;
  }

  function canClaimTreasure(run) {
    return run.treasure.promptReady && !run.treasure.claimed;
  }

  function spawnCelebration(run) {
    for (let index = 0; index < 96; index += 1) {
      run.celebration.push({
        x: Math.random() * state.viewportWidth,
        y: -20 - Math.random() * 80,
        vx: (Math.random() - 0.5) * 240,
        vy: 50 + Math.random() * 170,
        size: 5 + Math.random() * 10,
        life: 2 + Math.random() * 2,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 6,
        color: ["#f0c36e", "#8fd6ba", "#f5efe3", "#f39d7b"][index % 4],
      });
    }
  }

  function claimTreasure() {
    const run = state.run;
    if (!run || run.treasure.claimed) return;
    run.treasure.claimed = true;
    run.coins += run.treasure.bonusCoins;
    state.progress.completedWorlds[run.worldId] = true;
    state.progress.bestDepthByWorld[run.worldId] = Math.max(state.progress.bestDepthByWorld[run.worldId] || 0, run.bestDepthMeters);
    saveProgress();
    spawnCelebration(run);
    setMessage(`${run.world.treasureName} asegurado.`, 1.8);
    state.screen = "ending";
    markUiDirty();
  }

  function sellMaterial(materialId, qty) {
    const run = state.run;
    if (!run || !isAtOutpost(run)) return;
    const available = run.inventory[materialId] || 0;
    const amount = clamp(qty, 0, available);
    if (!amount) return;
    const material = run.materialById[materialId];
    run.inventory[materialId] -= amount;
    if (run.inventory[materialId] <= 0) delete run.inventory[materialId];
    run.inventoryCount -= amount;
    run.coins += amount * material.value;
    setMessage(`${material.name} vendido x${amount}.`, 1);
    updateGuidance(run);
    markUiDirty();
  }

  function sellAll() {
    const run = state.run;
    if (!run || !isAtOutpost(run)) return;
    let total = 0;
    for (const entry of inventoryEntries(run)) total += entry.qty * entry.material.value;
    if (!total) {
      setMessage("No tienes materiales para vender.", 1.2);
      return;
    }
    run.coins += total;
    run.inventory = Object.create(null);
    run.inventoryCount = 0;
    setMessage(`Venta completa: ${total} monedas.`, 1.2);
    updateGuidance(run);
    markUiDirty();
  }

  function buyShovel() {
    const run = state.run;
    if (!run || !isAtOutpost(run)) return;
    const next = run.shovelLevel + 1;
    if (next >= SHOVEL_NAMES.length) return;
    const cost = SHOVEL_COSTS[next];
    if (run.coins < cost) {
      setMessage("Necesitas mas monedas para mejorar la herramienta.", 1.3);
      return;
    }
    run.coins -= cost;
    run.shovelLevel = next;
    setMessage(`Herramienta mejorada a ${SHOVEL_NAMES[next]}.`, 1.4);
    markUiDirty();
  }

  function buyCapacity() {
    const run = state.run;
    if (!run || !isAtOutpost(run)) return;
    const next = run.capacityLevel + 1;
    if (next >= CAPACITY_VALUES.length) return;
    const cost = CAPACITY_COSTS[next];
    if (run.coins < cost) {
      setMessage("Necesitas mas monedas para ampliar la mochila.", 1.3);
      return;
    }
    run.coins -= cost;
    run.capacityLevel = next;
    setMessage(`Capacidad ampliada a ${CAPACITY_VALUES[next]}.`, 1.4);
    updateGuidance(run);
    markUiDirty();
  }

  function selectWorld(worldId) {
    state.selectedWorldId = worldId;
    applyWorldTheme(currentWorld());
    markUiDirty();
  }

  function clearInputState() {
    state.keys = Object.create(null);
    state.pointer.down = false;
  }

  function startRun(worldId) {
    state.selectedWorldId = worldId || state.selectedWorldId;
    state.run = buildRun(state.selectedWorldId);
    state.screen = "running";
    state.panelMode = "inventory";
    clearInputState();
    updateGuidance(state.run);
    markUiDirty();
  }

  function restartRun() {
    if (!state.run) return;
    state.run = buildRun(state.run.worldId);
    state.screen = "running";
    state.panelMode = "inventory";
    clearInputState();
    updateGuidance(state.run);
    markUiDirty();
  }

  function openPanel(mode) {
    if (!state.run) return;
    state.panelMode = mode || "inventory";
    state.screen = mode === "market" ? "market" : "inventory";
    clearInputState();
    markUiDirty();
  }

  function closePanel() {
    if (state.screen === "market" || state.screen === "inventory") {
      state.screen = "running";
      clearInputState();
      markUiDirty();
    }
  }

  function togglePause() {
    if (state.screen === "running") {
      state.screen = "paused";
      clearInputState();
      markUiDirty();
    } else if (state.screen === "paused") {
      state.screen = "running";
      markUiDirty();
    }
  }

  function toggleFullscreen() {
    const element = document.documentElement;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      element.requestFullscreen?.();
    }
  }

  function interact() {
    const run = state.run;
    if (!run) {
      if (state.screen === "world_select") startRun(state.selectedWorldId);
      return;
    }
    if (state.screen === "market" || state.screen === "inventory") {
      closePanel();
      return;
    }
    if (state.screen === "ending") {
      restartRun();
      return;
    }
    if (isAtOutpost(run)) {
      openPanel("market");
      return;
    }
    if (canClaimTreasure(run)) claimTreasure();
  }

  function handlePanelAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.getAttribute("data-action");
    if (action === "sell-all") sellAll();
    if (action === "buy-shovel") buyShovel();
    if (action === "buy-capacity") buyCapacity();
    if (action === "sell") {
      sellMaterial(button.getAttribute("data-material"), Number(button.getAttribute("data-qty") || 0));
    }
  }

  function drawBackdrop(world, surfaceScreenY) {
    const ctx = state.ctx;
    const width = state.viewportWidth;
    const height = state.viewportHeight;
    const sky = ctx.createLinearGradient(0, 0, 0, Math.max(1, surfaceScreenY));
    sky.addColorStop(0, world.theme.skyTop);
    sky.addColorStop(1, world.theme.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = world.theme.sun;
    ctx.beginPath();
    ctx.arc(width * 0.82, surfaceScreenY * 0.22, 38, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = world.theme.haze;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.ellipse(width * 0.23, surfaceScreenY * 0.34, 160, 54, 0, 0, Math.PI * 2);
    ctx.ellipse(width * 0.56, surfaceScreenY * 0.28, 190, 44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = world.theme.undergroundBack;
    ctx.fillRect(0, surfaceScreenY, width, height - surfaceScreenY);
  }

  function drawSurfaceWorld(world, surfaceScreenY, cameraX, showcaseOnly) {
    const ctx = state.ctx;
    ctx.save();
    ctx.translate(-cameraX * 0.15, 0);
    if (world.id === "jungle") {
      ctx.fillStyle = "#426739";
      for (let index = -2; index < 9; index += 1) {
        const x = index * 180 + 50;
        ctx.fillRect(x + 22, surfaceScreenY - 120, 16, 120);
        ctx.beginPath();
        ctx.arc(x + 30, surfaceScreenY - 136, 46, 0, Math.PI * 2);
        ctx.arc(x + 2, surfaceScreenY - 106, 38, 0, Math.PI * 2);
        ctx.arc(x + 60, surfaceScreenY - 98, 42, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (world.id === "desert") {
      ctx.fillStyle = "#dbb16a";
      ctx.beginPath();
      ctx.moveTo(-120, surfaceScreenY + 8);
      for (let x = -120; x <= state.viewportWidth + 180; x += 90) {
        ctx.quadraticCurveTo(x + 45, surfaceScreenY - 20 - (x % 180 === 0 ? 14 : 0), x + 90, surfaceScreenY + 10);
      }
      ctx.lineTo(state.viewportWidth + 240, state.viewportHeight);
      ctx.lineTo(-120, state.viewportHeight);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#5f7b3c";
      for (let index = -1; index < 8; index += 1) {
        const x = index * 220 + 90;
        ctx.fillRect(x, surfaceScreenY - 54, 10, 54);
        ctx.fillRect(x - 18, surfaceScreenY - 32, 18, 8);
        ctx.fillRect(x + 10, surfaceScreenY - 26, 18, 8);
      }
    } else {
      for (let index = -1; index < 7; index += 1) {
        const x = index * 220 + 32;
        ctx.fillStyle = "#d7e5f3";
        ctx.fillRect(x, surfaceScreenY - 86, 110, 86);
        ctx.fillStyle = index % 2 === 0 ? "#b66d53" : "#6f8db2";
        ctx.fillRect(x, surfaceScreenY - 112, 110, 30);
        ctx.fillStyle = "#d7e5f3";
        ctx.fillRect(x + 18, surfaceScreenY - 56, 18, 22);
        ctx.fillRect(x + 62, surfaceScreenY - 56, 18, 22);
      }
      ctx.fillStyle = "#9c856e";
      ctx.fillRect(-80, surfaceScreenY - 12, state.viewportWidth + 160, 14);
      ctx.fillStyle = "#f0e2ca";
      for (let index = -1; index < 20; index += 1) {
        ctx.fillRect(index * 70 + 12, surfaceScreenY - 48, 8, 36);
      }
    }
    ctx.restore();

    ctx.fillStyle = world.id === "desert" ? "#d8b47a" : "#765032";
    ctx.fillRect(0, surfaceScreenY - 6, state.viewportWidth, 10);
    if (showcaseOnly) return;

    const shaftX = state.run.shaftX - state.run.camera.x;
    ctx.fillStyle = "rgba(24, 17, 11, 0.5)";
    ctx.fillRect(shaftX - 22, surfaceScreenY - 4, 44, 84);
  }

  function drawTerrain(run) {
    if (run.terrainDirty) rebuildTerrainTexture(run);
    const ctx = state.ctx;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(
      run.terrainCanvas,
      0,
      0,
      run.gridCols,
      run.gridRows,
      -run.camera.x,
      run.surfaceY - run.camera.y,
      run.gridCols * CELL,
      run.gridRows * CELL
    );
    const shade = ctx.createLinearGradient(0, run.surfaceY - run.camera.y, 0, run.worldHeight - run.camera.y);
    shade.addColorStop(0, "rgba(255,255,255,0.02)");
    shade.addColorStop(1, "rgba(0,0,0,0.26)");
    ctx.fillStyle = shade;
    ctx.fillRect(-run.camera.x, run.surfaceY - run.camera.y, run.worldWidth, run.worldHeight - run.surfaceY);
    ctx.restore();
  }

  function drawMaterialBlob(material, x, y, radius, exposure) {
    const ctx = state.ctx;
    const alpha = clamp(exposure * 1.7, 0.12, 1);
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = material.color;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.arc(radius * 0.62, -radius * 0.18, radius * 0.45, 0, Math.PI * 2);
    ctx.arc(-radius * 0.58, radius * 0.16, radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = material.accent;
    ctx.beginPath();
    ctx.arc(-radius * 0.24, -radius * 0.2, radius * 0.22, 0, Math.PI * 2);
    ctx.arc(radius * 0.32, radius * 0.12, radius * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawDeposits(run) {
    const ctx = state.ctx;
    for (const deposit of run.deposits) {
      if (deposit.collected || (!deposit.discovered && deposit.exposed < 0.05)) continue;
      const screenX = deposit.x - run.camera.x;
      const screenY = deposit.y - run.camera.y;
      if (screenX < -80 || screenX > state.viewportWidth + 80 || screenY < -80 || screenY > state.viewportHeight + 80) continue;
      drawMaterialBlob(run.materialById[deposit.materialId], screenX, screenY, deposit.radius, deposit.exposed);
    }
    if (!run.treasure.claimed && run.treasure.exposure > 0.05) {
      const tx = run.treasure.x - run.camera.x;
      const ty = run.treasure.y - run.camera.y;
      drawMaterialBlob({ color: "#d1a24c", accent: "#fff2ba" }, tx, ty, run.treasure.radius, run.treasure.exposure);
      ctx.save();
      ctx.globalAlpha = clamp(run.treasure.exposure * 1.4, 0.18, 1);
      ctx.strokeStyle = "#fff3c4";
      ctx.lineWidth = 2;
      ctx.strokeRect(tx - 10, ty - 10, 20, 20);
      ctx.restore();
    }
  }

  function drawOutpost(run) {
    const ctx = state.ctx;
    const x = run.outpost.x - run.camera.x;
    const y = run.surfaceY - run.camera.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = run.world.theme.outpost;
    ctx.fillRect(-42, -72, 84, 62);
    ctx.fillStyle = run.world.theme.outpostTrim;
    ctx.fillRect(-48, -82, 96, 14);
    ctx.fillRect(-18, -36, 36, 26);
    ctx.fillStyle = "#2e241b";
    ctx.fillRect(-10, -30, 20, 20);
    ctx.fillStyle = "#f7ebcf";
    ctx.font = "700 11px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("Puesto", 0, -88);
    ctx.restore();
  }

  function drawPlayer(run) {
    const ctx = state.ctx;
    const player = run.player;
    const x = player.x - run.camera.x;
    const y = player.y - run.camera.y;
    const bodyLean = player.vx * 0.008;
    const legSwing = Math.sin(player.walkCycle) * 5;
    const armSwing = run.digTarget ? 12 : legSwing * 0.7;

    ctx.save();
    ctx.translate(x + player.w * 0.5, y + player.h * 0.18);
    ctx.lineCap = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#18110b";
    ctx.fillStyle = "#eed4b4";
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(bodyLean, 26);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(-8, 18 + armSwing * 0.18);
    ctx.moveTo(0, 14);
    ctx.lineTo(8, 18 - armSwing * 0.18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bodyLean, 26);
    ctx.lineTo(-6, 38 + legSwing * 0.3);
    ctx.moveTo(bodyLean, 26);
    ctx.lineTo(6, 38 - legSwing * 0.3);
    ctx.stroke();

    if (run.digTarget) {
      ctx.strokeStyle = "#5a4737";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(8, 18 - armSwing * 0.18);
      ctx.lineTo(18 * player.facing, 26);
      ctx.stroke();
      ctx.fillStyle = "#9e7b55";
      ctx.fillRect(18 * player.facing - 4, 23, 8 * player.facing, 8);
    }
    ctx.restore();
  }

  function drawDigTarget(run) {
    if (!run.digTarget) return;
    const ctx = state.ctx;
    const radius = DIG_RADII[run.shovelLevel];
    ctx.save();
    ctx.strokeStyle = "rgba(255, 245, 206, 0.75)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(run.digTarget.x - run.camera.x, run.digTarget.y - run.camera.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawParticles(run) {
    const ctx = state.ctx;
    for (const particle of run.particles) {
      ctx.globalAlpha = clamp(particle.life / 0.7, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x - run.camera.x, particle.y - run.camera.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawCelebration(run) {
    const ctx = state.ctx;
    for (const piece of run.celebration) {
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rotation);
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.size * 0.5, -piece.size * 0.2, piece.size, piece.size * 0.4);
      ctx.restore();
    }
  }

  function drawPausedOverlay() {
    const ctx = state.ctx;
    ctx.fillStyle = "rgba(24, 17, 11, 0.42)";
    ctx.fillRect(0, 0, state.viewportWidth, state.viewportHeight);
    ctx.fillStyle = "#f8f0dc";
    ctx.font = "700 42px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("Pausa", state.viewportWidth * 0.5, state.viewportHeight * 0.5);
  }

  function drawRunningWorld(run) {
    const surfaceScreenY = run.surfaceY - run.camera.y;
    drawBackdrop(run.world, surfaceScreenY);
    drawSurfaceWorld(run.world, surfaceScreenY, run.camera.x, false);
    drawTerrain(run);
    drawDeposits(run);
    drawOutpost(run);
    drawPlayer(run);
    drawDigTarget(run);
    drawParticles(run);
    if (state.screen === "paused") drawPausedOverlay();
    if (state.screen === "ending") drawCelebration(run);
  }

  function drawShowcase(world) {
    const width = state.viewportWidth;
    const height = state.viewportHeight;
    const surfaceScreenY = height * 0.44;
    drawBackdrop(world, surfaceScreenY);
    drawSurfaceWorld(world, surfaceScreenY, 0, true);

    const ctx = state.ctx;
    const soil = ctx.createLinearGradient(0, surfaceScreenY, 0, height);
    soil.addColorStop(0, world.soilStops[0].color);
    soil.addColorStop(1, world.soilStops[world.soilStops.length - 1].color);
    ctx.fillStyle = soil;
    ctx.fillRect(0, surfaceScreenY, width, height - surfaceScreenY);

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    for (let step = 0; step < 6; step += 1) {
      ctx.beginPath();
      ctx.arc(width * 0.5 + Math.sin(step * 0.4) * 10, surfaceScreenY + 34 + step * 36, 28 + (step % 2) * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    drawMaterialBlob(world.materials[0], width * 0.38, surfaceScreenY + 150, 14, 1);
    drawMaterialBlob(world.materials[Math.min(1, world.materials.length - 1)], width * 0.63, surfaceScreenY + 248, 16, 1);
    drawMaterialBlob(world.materials[world.materials.length - 1], width * 0.52, surfaceScreenY + 350, 18, 1);

    const previewRun = {
      player: {
        x: width * 0.5 - PLAYER_W * 0.5,
        y: surfaceScreenY - PLAYER_H + 6,
        w: PLAYER_W,
        h: PLAYER_H,
        vx: 0,
        walkCycle: state.showcaseTime * 4,
        facing: 1,
      },
      camera: { x: 0, y: 0 },
      digTarget: { x: width * 0.5 + 48, y: surfaceScreenY + 74 },
      shovelLevel: 0,
    };
    drawPlayer(previewRun);
    drawDigTarget(previewRun);
  }

  function renderWorldCards() {
    const current = currentWorld();
    state.hud.worldGrid.innerHTML = Object.values(WORLDS).map((world, index) => {
      const selected = world.id === state.selectedWorldId;
      const completed = state.progress.completedWorlds[world.id];
      const bestDepth = state.progress.bestDepthByWorld[world.id] || 0;
      return `
        <button type="button" class="world-card ${selected ? "selected" : ""}" data-world="${world.id}">
          <span class="eyebrow">Mundo ${index + 1}</span>
          <strong>${world.title}</strong>
          <p>${world.subtitle}</p>
          <ul>${world.cardFacts.map((fact) => `<li>${fact}</li>`).join("")}</ul>
          <div class="world-meta">
            <span>${formatDepth(bestDepth)} mejor descenso</span>
            <span>${completed ? "Hallazgo logrado" : "Hallazgo pendiente"}</span>
          </div>
        </button>
      `;
    }).join("");
    state.hud.worldGrid.querySelectorAll("[data-world]").forEach((button) => {
      button.addEventListener("click", () => selectWorld(button.getAttribute("data-world")));
    });
    state.hud.startButton.textContent = `Iniciar en ${current.title}`;
  }

  function renderPanel() {
    const run = state.run;
    if (!run) return;
    const atOutpost = isAtOutpost(run);
    state.hud.panelEyebrow.textContent = state.screen === "market" ? "Puesto" : "Inventario";
    state.hud.panelTitle.textContent = atOutpost ? run.world.shopName : "Mochila y mejoras";
    state.hud.panelLead.textContent = atOutpost
      ? "Vende materiales y mejora pala o capacidad sin cambiar el estilo continuo del subsuelo."
      : "Puedes revisar lo encontrado, pero las ventas y mejoras solo se hacen en la superficie.";
    state.hud.panelNotice.textContent = atOutpost
      ? `Monedas disponibles: ${run.coins}`
      : "Acciones comerciales bloqueadas fuera del puesto.";

    const items = inventoryEntries(run);
    state.hud.inventoryList.innerHTML = items.length
      ? items.map((entry) => `
          <article class="item-card">
            <header>
              <div>
                <strong>${entry.material.name}</strong>
                <div class="mini-pill">${getRarityLabel(entry.material.rarity)} · x${entry.qty}</div>
              </div>
              <strong>${entry.qty * entry.material.value} mon</strong>
            </header>
            <p>Valor unitario ${entry.material.value}. Material incrustado recogido a mano.</p>
            <div class="item-actions">
              <button type="button" data-action="sell" data-material="${entry.id}" data-qty="1" ${atOutpost ? "" : "disabled"}>Vender 1</button>
              <button type="button" data-action="sell" data-material="${entry.id}" data-qty="${entry.qty}" ${atOutpost ? "" : "disabled"}>Vender todo</button>
            </div>
          </article>
        `).join("")
      : `<article class="item-card"><strong>Sin hallazgos</strong><p>Excava la pared y recoge lo que vaya quedando al descubierto.</p></article>`;

    const nextShovel = run.shovelLevel + 1;
    const nextCapacity = run.capacityLevel + 1;
    state.hud.upgradeList.innerHTML = `
      <article class="upgrade-card">
        <header><strong>Herramienta ${SHOVEL_NAMES[run.shovelLevel]}</strong><span class="mini-pill">Nivel ${run.shovelLevel + 1}/${SHOVEL_NAMES.length}</span></header>
        <p>${nextShovel < SHOVEL_NAMES.length ? `Siguiente nivel por ${SHOVEL_COSTS[nextShovel]} monedas.` : "Herramienta al maximo."}</p>
        <div class="upgrade-actions"><button type="button" data-action="buy-shovel" ${atOutpost && nextShovel < SHOVEL_NAMES.length && run.coins >= SHOVEL_COSTS[nextShovel] ? "" : "disabled"}>Mejorar pala</button></div>
      </article>
      <article class="upgrade-card">
        <header><strong>Mochila</strong><span class="mini-pill">${run.inventoryCount}/${currentCapacity(run)}</span></header>
        <p>${nextCapacity < CAPACITY_VALUES.length ? `Capacidad siguiente: ${CAPACITY_VALUES[nextCapacity]} por ${CAPACITY_COSTS[nextCapacity]} monedas.` : "Capacidad maxima alcanzada."}</p>
        <div class="upgrade-actions"><button type="button" data-action="buy-capacity" ${atOutpost && nextCapacity < CAPACITY_VALUES.length && run.coins >= CAPACITY_COSTS[nextCapacity] ? "" : "disabled"}>Ampliar mochila</button></div>
      </article>
      <article class="upgrade-card">
        <header><strong>Venta rapida</strong><span class="mini-pill">${items.length} tipos</span></header>
        <p>Convierte todo el inventario actual en monedas desde el puesto.</p>
        <div class="upgrade-actions"><button type="button" data-action="sell-all" ${atOutpost && items.length ? "" : "disabled"}>Vender todo</button></div>
      </article>
    `;
  }

  function renderEnding() {
    const run = state.run;
    if (!run) return;
    state.hud.endingTitle.textContent = `${run.world.treasureName} asegurado`;
    state.hud.endingLead.textContent = `Has sustituido el viejo hoyo por una excavacion continua en ${run.world.title} y has recuperado el hallazgo principal.`;
    state.hud.endingStats.innerHTML = `
      <article><span>Profundidad maxima</span><strong>${formatDepth(run.bestDepthMeters)}</strong></article>
      <article><span>Materiales recogidos</span><strong>${run.inventoryCount}</strong></article>
      <article><span>Monedas finales</span><strong>${run.coins}</strong></article>
    `;
  }

  function syncInterface() {
    const world = state.run ? state.run.world : currentWorld();
    state.hud.worldLabel.textContent = world.title;
    state.hud.objectiveLabel.textContent = state.run
      ? `Excava tierra continua y encuentra ${world.treasureName}.`
      : world.subtitle;

    if (state.run) {
      const run = state.run;
      state.hud.coinsValue.textContent = String(run.coins);
      state.hud.depthValue.textContent = formatDepth(currentDepthMeters(run));
      state.hud.cargoValue.textContent = `${run.inventoryCount}/${currentCapacity(run)}`;
      state.hud.shovelValue.textContent = SHOVEL_NAMES[run.shovelLevel];
      state.hud.groundValue.textContent = currentSoilLabel(run);
      state.hud.targetValue.textContent = run.treasure.exposure > 0.18 ? "Visible" : "Buscando";
      state.hud.bestDepthValue.textContent = formatDepth(run.bestDepthMeters);
      state.hud.depthFill.style.height = `${currentDepthRatio(run) * 100}%`;
      state.hud.beaconCard.style.display = state.screen === "running" || state.screen === "paused" ? "flex" : "none";
      state.hud.beaconTitle.textContent = run.guidanceTitle;
      state.hud.beaconCopy.textContent = run.guidanceCopy;
      state.hud.beaconArrow.textContent = run.guidanceArrow;
    } else {
      const best = state.progress.bestDepthByWorld[state.selectedWorldId] || 0;
      state.hud.coinsValue.textContent = "0";
      state.hud.depthValue.textContent = "0 m";
      state.hud.cargoValue.textContent = `0/${CAPACITY_VALUES[0]}`;
      state.hud.shovelValue.textContent = SHOVEL_NAMES[0];
      state.hud.groundValue.textContent = state.selectedWorldId === "desert" ? "Arena" : "Tierra";
      state.hud.targetValue.textContent = "Pendiente";
      state.hud.bestDepthValue.textContent = formatDepth(best);
      state.hud.depthFill.style.height = `${clamp(best / world.maxDepthMeters, 0, 1) * 100}%`;
      state.hud.beaconCard.style.display = "flex";
      state.hud.beaconTitle.textContent = "Terreno continuo";
      state.hud.beaconCopy.textContent = "El subsuelo ya no se ve por bloques: excavas una masa uniforme y descubres materiales incrustados.";
      state.hud.beaconArrow.textContent = "v";
    }

    state.hud.messageBox.textContent = state.message;
    state.hud.messageBox.classList.toggle("hidden", !state.message);
    state.hud.worldSelect.classList.toggle("hidden", state.screen !== "world_select");
    state.hud.panelOverlay.classList.toggle("hidden", !(state.screen === "market" || state.screen === "inventory"));
    state.hud.endingOverlay.classList.toggle("hidden", state.screen !== "ending");

    renderWorldCards();
    if (state.run) {
      renderPanel();
      renderEnding();
    }
  }

  function renderGameToText() {
    const run = state.run;
    const payload = {
      mode: "arcade-dig-hole-treasure",
      screen: state.screen,
      worldId: state.selectedWorldId,
      worldName: currentWorld().title,
      coordinates: "x increases to the right; y increases downward; values are world pixels.",
      message: state.message,
      bestDepthMeters: run ? run.bestDepthMeters : state.progress.bestDepthByWorld[state.selectedWorldId] || 0,
      coins: run ? run.coins : 0,
      inventoryCount: run ? run.inventoryCount : 0,
      capacity: run ? currentCapacity(run) : CAPACITY_VALUES[0],
      shovelLevel: run ? run.shovelLevel : 0,
      soilType: run ? currentSoilLabel(run) : (state.selectedWorldId === "desert" ? "Arena" : "Tierra"),
      canUseMarket: run ? isAtOutpost(run) : false,
      treasureVisible: run ? run.treasure.exposure > 0.18 : false,
      treasureReady: run ? run.treasure.promptReady : false,
      guidanceArrow: run ? run.guidanceArrow : "v",
      inventory: run ? inventoryEntries(run).map((entry) => ({
        id: entry.id,
        name: entry.material.name,
        qty: entry.qty,
        value: entry.material.value,
        rarity: entry.material.rarity,
      })) : [],
    };

    if (run) {
      payload.depthMeters = currentDepthMeters(run);
      payload.player = {
        x: round(run.player.x, 1),
        y: round(run.player.y, 1),
        vx: round(run.player.vx, 1),
        vy: round(run.player.vy, 1),
      };
      payload.digTarget = run.digTarget ? { x: round(run.digTarget.x, 1), y: round(run.digTarget.y, 1) } : null;
      payload.nearbyMaterials = run.deposits
        .filter((deposit) => !deposit.collected && deposit.exposed > 0.12)
        .map((deposit) => ({
          id: deposit.id,
          material: run.materialById[deposit.materialId].name,
          exposure: round(deposit.exposed, 2),
          x: round(deposit.x, 1),
          y: round(deposit.y, 1),
        }))
        .sort((a, b) => Math.abs(a.y - payload.player.y) - Math.abs(b.y - payload.player.y))
        .slice(0, 6);
    }
    return JSON.stringify(payload);
  }

  function advanceTime(ms) {
    const steps = Math.max(1, Math.round((ms || 0) / (FIXED_DT * 1000)));
    for (let index = 0; index < steps; index += 1) update(FIXED_DT);
    render();
  }

  function update(dt) {
    state.showcaseTime += dt;
    if (state.messageTimer > 0) {
      state.messageTimer -= dt;
      if (state.messageTimer <= 0) {
        state.message = "";
        markUiDirty();
      }
    }

    const run = state.run;
    if (run) {
      if (state.screen === "running") {
        updatePlayer(run, dt);
        updateDigging(run, dt);
        updateDeposits(run, dt);
        updateParticles(run, dt);
        updateCamera(run);
        updateProgressDepth(run);
        updateGuidance(run);
      } else if (state.screen === "paused" || state.screen === "market" || state.screen === "inventory") {
        updateDeposits(run, dt);
        updateParticles(run, dt);
        updateCamera(run);
        updateGuidance(run);
      } else if (state.screen === "ending") {
        updateParticles(run, dt);
      }
    }

    state.uiTick -= dt;
    if (state.uiDirty || state.uiTick <= 0) {
      syncInterface();
      state.uiDirty = false;
      state.uiTick = 0.1;
    }
  }

  function render() {
    state.ctx.clearRect(0, 0, state.viewportWidth, state.viewportHeight);
    if (state.run) drawRunningWorld(state.run);
    else drawShowcase(currentWorld());
  }

  function loop(timestamp) {
    if (!state.lastTime) state.lastTime = timestamp;
    const delta = Math.min(0.05, (timestamp - state.lastTime) / 1000);
    state.lastTime = timestamp;
    state.accumulator += delta;
    while (state.accumulator >= FIXED_DT) {
      update(FIXED_DT);
      state.accumulator -= FIXED_DT;
    }
    render();
    state.rafId = window.requestAnimationFrame(loop);
  }

  function resize() {
    const rect = state.shell.getBoundingClientRect();
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.viewportWidth = rect.width;
    state.viewportHeight = rect.height;
    state.canvas.width = Math.round(rect.width * state.dpr);
    state.canvas.height = Math.round(rect.height * state.dpr);
    state.canvas.style.width = `${rect.width}px`;
    state.canvas.style.height = `${rect.height}px`;
    state.ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    markUiDirty();
  }

  function updatePointerPosition(event) {
    const rect = state.canvas.getBoundingClientRect();
    state.pointer.x = clamp(event.clientX - rect.left, 0, rect.width);
    state.pointer.y = clamp(event.clientY - rect.top, 0, rect.height);
    state.pointer.inside = true;
  }

  function onKeyDown(event) {
    if (event.repeat && ["Enter", "KeyE", "KeyM", "KeyP", "KeyR", "KeyF"].includes(event.code)) return;
    state.keys[event.code] = true;
    if (event.code === "Digit1") selectWorld("jungle");
    if (event.code === "Digit2") selectWorld("desert");
    if (event.code === "Digit3") selectWorld("urban");
    if (event.code === "Enter" || event.code === "KeyE") {
      event.preventDefault();
      interact();
      return;
    }
    if (event.code === "KeyM") {
      event.preventDefault();
      if (state.run) openPanel("market");
      return;
    }
    if (event.code === "KeyP") {
      event.preventDefault();
      togglePause();
      return;
    }
    if (event.code === "KeyR") {
      event.preventDefault();
      if (state.screen === "world_select") startRun(state.selectedWorldId);
      else restartRun();
      return;
    }
    if (event.code === "KeyF") {
      event.preventDefault();
      toggleFullscreen();
      return;
    }
    if (event.code === "Escape" && document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) {
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    state.keys[event.code] = false;
  }

  function initDom() {
    state.shell = document.getElementById("shell");
    state.canvas = document.getElementById("game");
    state.ctx = state.canvas.getContext("2d");
    state.hud = {
      worldLabel: document.getElementById("worldLabel"),
      objectiveLabel: document.getElementById("objectiveLabel"),
      coinsValue: document.getElementById("coinsValue"),
      depthValue: document.getElementById("depthValue"),
      cargoValue: document.getElementById("cargoValue"),
      shovelValue: document.getElementById("shovelValue"),
      groundValue: document.getElementById("groundValue"),
      targetValue: document.getElementById("targetValue"),
      bestDepthValue: document.getElementById("bestDepthValue"),
      depthFill: document.getElementById("depthFill"),
      beaconCard: document.getElementById("beaconCard"),
      beaconTitle: document.getElementById("beaconTitle"),
      beaconCopy: document.getElementById("beaconCopy"),
      beaconArrow: document.getElementById("beaconArrow"),
      messageBox: document.getElementById("messageBox"),
      worldSelect: document.getElementById("worldSelect"),
      worldGrid: document.getElementById("worldGrid"),
      panelOverlay: document.getElementById("panelOverlay"),
      panelEyebrow: document.getElementById("panelEyebrow"),
      panelTitle: document.getElementById("panelTitle"),
      panelLead: document.getElementById("panelLead"),
      panelNotice: document.getElementById("panelNotice"),
      inventoryList: document.getElementById("inventoryList"),
      upgradeList: document.getElementById("upgradeList"),
      endingOverlay: document.getElementById("endingOverlay"),
      endingTitle: document.getElementById("endingTitle"),
      endingLead: document.getElementById("endingLead"),
      endingStats: document.getElementById("endingStats"),
      startButton: document.getElementById("startButton"),
      closePanelBtn: document.getElementById("closePanelBtn"),
      restartButton: document.getElementById("restartButton"),
      returnWorldsButton: document.getElementById("returnWorldsButton"),
    };

    document.getElementById("surfaceBtn").addEventListener("click", () => {
      if (state.run) openPanel("market");
    });
    document.getElementById("inventoryBtn").addEventListener("click", () => {
      if (state.run) openPanel("inventory");
    });
    document.getElementById("fullscreenBtn").addEventListener("click", () => toggleFullscreen());
    state.hud.startButton.addEventListener("click", () => startRun(state.selectedWorldId));
    state.hud.closePanelBtn.addEventListener("click", () => closePanel());
    state.hud.restartButton.addEventListener("click", () => restartRun());
    state.hud.returnWorldsButton.addEventListener("click", () => {
      state.run = null;
      state.screen = "world_select";
      applyWorldTheme(currentWorld());
      markUiDirty();
    });
    state.hud.panelOverlay.addEventListener("click", handlePanelAction);

    state.canvas.addEventListener("pointermove", (event) => updatePointerPosition(event));
    state.canvas.addEventListener("pointerdown", (event) => {
      updatePointerPosition(event);
      state.pointer.down = true;
      state.canvas.setPointerCapture?.(event.pointerId);
    });
    state.canvas.addEventListener("pointerup", (event) => {
      updatePointerPosition(event);
      state.pointer.down = false;
      state.canvas.releasePointerCapture?.(event.pointerId);
    });
    state.canvas.addEventListener("pointerleave", () => {
      state.pointer.down = false;
      state.pointer.inside = false;
    });

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", resize);
  }

  function boot() {
    initDom();
    applyWorldTheme(currentWorld());
    resize();
    syncInterface();
    state.rafId = window.requestAnimationFrame(loop);
    window.render_game_to_text = renderGameToText;
    window.advanceTime = advanceTime;
    window.__digHoleApi = { selectWorld, startRun, restartRun, openPanel, closePanel };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
