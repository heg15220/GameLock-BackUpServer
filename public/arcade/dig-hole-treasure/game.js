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
  const DIG_SWING_TIME = 0.18;
  const STORAGE_KEY = "dig-hole-html-progress-v4";
  const LANG_OVERRIDE = new URLSearchParams(window.location.search).get("lang");
  const USER_LANGUAGE = String(LANG_OVERRIDE || (navigator.languages && navigator.languages[0]) || navigator.language || "").toLowerCase();
  const IS_ES = USER_LANGUAGE.startsWith("es");
  const t = (esText, enText) => (IS_ES ? esText : enText);

  const SHOVEL_NAMES = ["Manual", t("Hierro", "Iron"), t("Acero", "Steel"), t("Titanio", "Titanium")];
  const SHOVEL_COSTS = [0, 105, 245, 500];
  const DIG_RADII = [22, 28, 36, 44];
  const DIG_COOLDOWNS = [0.22, 0.18, 0.14, 0.1];
  const CAPACITY_VALUES = [12, 20, 30, 44];
  const CAPACITY_COSTS = [0, 95, 210, 380];
  const STAMINA_VALUES = [100, 150, 220, 300];
  const STAMINA_UPGRADE_COSTS = [0, 130, 290, 560];
  const STAMINA_DIG_COSTS = [1.2, 1.5, 1.9, 2.3];
  const STAMINA_MOVE_DRAIN_BASE = 0.26;
  const STAMINA_MOVE_DRAIN_DEPTH = 0.34;
  const STAMINA_LOW_RATIO = 0.24;
  const STAMINA_WARNING_COOLDOWN = 8;
  const STAMINA_CRITICAL_SECONDS = 16;
  const JETPACK_COST = 40;
  const JETPACK_DEPTH_REQUIREMENT = 120;
  const TORCH_PACK_COST = 20;
  const TORCH_PACK_SIZE = 4;
  const DEPTH_BALANCE_BASE_METERS = 3200;
  const GUIDANCE_MARKER_COUNT = 4;
  const TREASURE_MIN_DEPTH_RATIO = 0.86;
  const TREASURE_MAX_DEPTH_RATIO = 0.95;
  const DARKNESS_START_RATIO = 0.22;
  const DARKNESS_FULL_RATIO = 0.7;
  const TORCH_NEAR_DISTANCE = 116;
  const ENTRY_ASSIST_RADIUS = 18;
  const SURFACE_ENTRY_ALIGN_SPEED = 240;
  const SURFACE_ENTRY_PULL_SPEED = 176;

  // --- Terrain rendering uses a full-resolution offscreen canvas ---
  // Each cell is drawn as a filled rect at CELL×CELL pixels, so the
  // terrain canvas is GRID_COLS*CELL wide and gridRows*CELL tall.
  // This eliminates all pixelation from scaling up a tiny texture.

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
    manualStepping: false,
  };

  const WORLDS = {
    jungle: {
      id: "jungle",
      title: "Selva Enterrada",
      subtitle: "Tierra húmeda continua, raíces suaves y minerales verdes incrustados.",
      treasureName: "Corazón de la Selva",
      shopName: "Puesto de la Selva",
      maxDepthMeters: 9600,
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
        "La piedra puede aparecer a cualquier profundidad como material base.",
        "Las vetas aparecen incrustadas a medida que abres huecos en la pared.",
      ],
      materials: [
        { id: "stone", name: "Piedra", rarity: 1, value: 3, color: "#7d7367", accent: "#cfc5ba", weights: [52, 38, 28, 18] },
        { id: "clay", name: "Arcilla roja", rarity: 1, value: 6, color: "#b4774e", accent: "#ddb089", weights: [24, 14, 8, 4] },
        { id: "amber", name: "Ámbar", rarity: 2, value: 12, color: "#d59232", accent: "#ffd78e", weights: [8, 12, 8, 3] },
        { id: "jade", name: "Jade", rarity: 3, value: 24, color: "#2a9f63", accent: "#abf0c7", weights: [2, 8, 16, 8] },
        { id: "emerald", name: "Esmeralda", rarity: 4, value: 44, color: "#0d8b49", accent: "#9ef7bf", weights: [1, 3, 8, 14] },
      ],
    },
    desert: {
      id: "desert",
      title: "Desierto Hundido",
      subtitle: "Arena en la superficie y cerca de ella, con vetas minerales atrapadas en la duna compacta.",
      treasureName: "Corona del Sol",
      shopName: "Puesto del Oasis",
      maxDepthMeters: 9200,
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
        "La piedra sigue apareciendo incluso en las capas profundas.",
        "La arena se compacta en profundidad, pero sigue sin verse cuadriculada.",
        "Sal, cobre, turquesa y ópalo aparecen incrustados en la pared.",
      ],
      materials: [
        { id: "stone", name: "Piedra", rarity: 1, value: 3, color: "#8c816f", accent: "#d7ccb7", weights: [48, 34, 22, 16] },
        { id: "salt", name: "Sal", rarity: 1, value: 6, color: "#f1f3ef", accent: "#ffffff", weights: [26, 12, 6, 2] },
        { id: "copper", name: "Cobre", rarity: 2, value: 11, color: "#b86d37", accent: "#f6c8a5", weights: [12, 20, 12, 5] },
        { id: "turquoise", name: "Turquesa", rarity: 3, value: 23, color: "#1aaeb4", accent: "#bbfdff", weights: [2, 8, 16, 8] },
        { id: "sunopal", name: "Ópalo solar", rarity: 4, value: 42, color: "#f39f45", accent: "#fff2ac", weights: [1, 3, 8, 14] },
      ],
    },
    urban: {
      id: "urban",
      title: "Patio Urbano",
      subtitle: "Bajo la urbanización solo hay tierra removida, con restos y minerales mezclados en la pared.",
      treasureName: "Cápsula del Barrio",
      shopName: "Puesto del Patio",
      maxDepthMeters: 9400,
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
        "La urbanización se abre sobre una masa de tierra uniforme.",
        "La piedra también aparece aquí como material más frecuente.",
        "La tierra se va vaciando a mano y deja restos y vetas incrustadas visibles.",
      ],
      materials: [
        { id: "stone", name: "Piedra", rarity: 1, value: 3, color: "#77746e", accent: "#cdcbc4", weights: [50, 34, 24, 18] },
        { id: "ceramic", name: "Cerámica", rarity: 1, value: 6, color: "#d3c2b1", accent: "#f3e4d4", weights: [24, 14, 8, 3] },
        { id: "copper", name: "Cobre", rarity: 2, value: 12, color: "#b77542", accent: "#f5c9a1", weights: [12, 18, 12, 5] },
        { id: "silver", name: "Plata", rarity: 3, value: 24, color: "#bac5d8", accent: "#ffffff", weights: [2, 8, 15, 8] },
        { id: "crystal", name: "Cristal", rarity: 4, value: 44, color: "#73d9f7", accent: "#ffffff", weights: [1, 3, 8, 14] },
      ],
    },
  };

  function localizeWorldCatalog() {
    if (IS_ES) return;
    const setMaterialName = (world, id, name) => {
      const material = world.materials.find((m) => m.id === id);
      if (material) material.name = name;
    };

    const jungle = WORLDS.jungle;
    jungle.title = "Buried Jungle";
    jungle.subtitle = "Continuous damp soil, soft roots, and green minerals embedded in the wall.";
    jungle.treasureName = "Heart of the Jungle";
    jungle.shopName = "Jungle Outpost";
    jungle.cardFacts = [
      "The underground is continuous jungle soil, with no visible blocks.",
      "Stone can appear at any depth as a base material.",
      "Veins appear embedded as you open passages in the wall.",
    ];
    setMaterialName(jungle, "stone", "Stone");
    setMaterialName(jungle, "clay", "Red Clay");
    setMaterialName(jungle, "amber", "Amber");
    setMaterialName(jungle, "jade", "Jade");
    setMaterialName(jungle, "emerald", "Emerald");

    const desert = WORLDS.desert;
    desert.title = "Sunken Desert";
    desert.subtitle = "Sand near the surface, with mineral veins trapped in compact dunes.";
    desert.treasureName = "Sun Crown";
    desert.shopName = "Oasis Outpost";
    desert.cardFacts = [
      "The upper layer near the surface is almost pure sand.",
      "Stone still appears even in deeper layers.",
      "Sand compacts with depth but keeps the smooth look.",
      "Salt, copper, turquoise and sun opal are embedded in the wall.",
    ];
    setMaterialName(desert, "stone", "Stone");
    setMaterialName(desert, "salt", "Salt");
    setMaterialName(desert, "copper", "Copper");
    setMaterialName(desert, "turquoise", "Turquoise");
    setMaterialName(desert, "sunopal", "Sun Opal");

    const urban = WORLDS.urban;
    urban.title = "Urban Yard";
    urban.subtitle = "Below the neighborhood there is loose soil with mixed remains and minerals.";
    urban.treasureName = "Neighborhood Capsule";
    urban.shopName = "Yard Outpost";
    urban.cardFacts = [
      "The neighborhood opens on top of a continuous soil mass.",
      "Stone also appears here as the most common material.",
      "Manual digging reveals embedded remains and mineral veins.",
    ];
    setMaterialName(urban, "stone", "Stone");
    setMaterialName(urban, "ceramic", "Ceramic");
    setMaterialName(urban, "copper", "Copper");
    setMaterialName(urban, "silver", "Silver");
    setMaterialName(urban, "crystal", "Crystal");
  }

  localizeWorldCatalog();

  // ─── Persistence ──────────────────────────────────────────────────────────

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
    } catch { }
  }

  // ─── Math helpers ─────────────────────────────────────────────────────────

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function approach(cur, target, delta) {
    if (cur < target) return Math.min(target, cur + delta);
    if (cur > target) return Math.max(target, cur - delta);
    return target;
  }
  function round(v, d) { const f = 10 ** (d || 0); return Math.round(v * f) / f; }

  function hashString(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function createRunSeed(worldId) {
    return hashString(`${worldId}:${Date.now()}:${Math.random()}`);
  }

  function hashUnit(seed, x, y) {
    let v = seed ^ Math.imul(x + 17, 374761393) ^ Math.imul(y + 23, 668265263);
    v = Math.imul(v ^ (v >>> 13), 1274126177);
    v ^= v >>> 16;
    return ((v >>> 0) % 100000) / 100000;
  }

  function parseHex(hex) {
    const c = hex.replace("#", "");
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  }

  function mixRgb(a, b, t) {
    return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))];
  }

  function rgbStr(rgb) { return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`; }

  // ─── UI helpers ───────────────────────────────────────────────────────────

  function markUiDirty() { state.uiDirty = true; }

  function setMessage(text, duration) {
    state.message = text;
    state.messageTimer = duration || 2;
    markUiDirty();
  }

  function formatDepth(m) {
    if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
    return `${Math.round(m)} m`;
  }

  function getRarityLabel(r) {
    return IS_ES
      ? (["Comun", "Comun", "Poco comun", "Raro", "Muy raro"][r] || "Comun")
      : (["Common", "Common", "Uncommon", "Rare", "Very rare"][r] || "Common");
  }

  const MATERIAL_ICONS = Object.freeze({
    stone: "🪨",
    clay: "🧱",
    amber: "🟠",
    jade: "🟢",
    emerald: "💎",
    salt: "🧂",
    copper: "🟤",
    turquoise: "🔹",
    sunopal: "🔸",
    ceramic: "🏺",
    silver: "⚪",
    crystal: "🔷",
  });

  function materialIcon(materialId) {
    return MATERIAL_ICONS[materialId] || "◆";
  }

  function worldById(id) { return WORLDS[id] || WORLDS.jungle; }
  function currentWorld() { return worldById(state.selectedWorldId); }

  function materialMap(world) {
    if (!world._materialMap) {
      world._materialMap = Object.fromEntries(world.materials.map(m => [m.id, m]));
    }
    return world._materialMap;
  }

  function applyWorldTheme(world) {
    const r = document.documentElement.style;
    r.setProperty("--sky-top", world.theme.skyTop);
    r.setProperty("--sky-bottom", world.theme.skyBottom);
    r.setProperty("--accent", world.theme.accent);
    r.setProperty("--accent-strong", world.theme.accentStrong);
    r.setProperty("--panel-wood", world.theme.outpost);
    r.setProperty("--panel-trim", world.theme.outpostTrim);
  }

  function localizeStaticDom() {
    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    document.documentElement.lang = IS_ES ? "es" : "en";
    document.title = t("Cavar el Hoyo", "Dig the Hole");
    const gameCanvas = document.getElementById("game");
    if (gameCanvas) {
      gameCanvas.setAttribute("aria-label", t("Juego de cavar el hoyo", "Dig the hole game"));
    }

    setText("gameTitle", t("Cavar el Hoyo", "Dig the Hole"));
    setText("surfaceBtn", t("Puesto", "Outpost"));
    setText("inventoryBtn", t("Inventario", "Inventory"));
    setText("startButton", t("Iniciar excavacion", "Start excavation"));
    setText("coinsLabel", t("Monedas", "Coins"));
    setText("depthLabel", t("Profundidad", "Depth"));
    setText("cargoLabel", t("Carga", "Load"));
    setText("toolLabel", t("Herramienta", "Tool"));
    setText("groundLabel", t("Suelo", "Ground"));
    setText("targetLabel", t("Hallazgo", "Discovery"));
    setText("bestLabel", t("MEJOR", "BEST"));
    setText("guideLabel", t("Guia", "Guide"));
    setText("staminaLabel", t("Estamina", "Stamina"));
    setText("worldSelectEyebrow", t("Excavaciones", "Excavations"));
    setText("worldSelectTitle", t("Elige donde cavar", "Choose where to dig"));
    setText(
      "worldSelectLead",
      t(
        "El terreno no se representa por bloques. Cada mundo usa una masa uniforme con materiales unicos y flechas intermedias que te acercan a la puerta del tesoro.",
        "The terrain is not block-based. Each world uses a continuous mass with unique materials and intermediate arrows guiding you to the treasure door."
      )
    );
    setText("closePanelBtn", t("Volver", "Back"));
    setText("panelEyebrow", t("Puesto", "Outpost"));
    setText("panelTitle", t("Puesto de superficie", "Surface outpost"));
    setText("panelLead", t("Vende hallazgos y mejora la pala o la mochila.", "Sell discoveries and upgrade shovel or backpack."));
    setText("inventoryHeading", t("🎒 Inventario", "🎒 Inventory"));
    setText("upgradesHeading", t("⚙ Mejoras", "⚙ Upgrades"));
    setText("treasureRoomEyebrow", t("Camara final", "Final chamber"));
    setText("treasureRoomTitle", t("Sala del cofre", "Chest room"));
    setText("treasureRoomLead", t("La puerta esta abierta. Solo queda abrir el cofre.", "The door is open. Only the chest remains."));
    setText("treasureRoomHint", t("Pulsa Enter/E o el boton para abrir el cofre.", "Press Enter/E or the button to open the chest."));
    setText("openChestButton", t("Abrir cofre", "Open chest"));
    setText("endingEyebrow", t("Hallazgo asegurado", "Discovery secured"));
    setText("endingTitle", t("La excavacion termina con exito", "The excavation ends successfully"));
    setText("endingLead", t("Has recuperado el objetivo final tras cavar una masa uniforme de suelo.", "You recovered the final objective after digging through continuous terrain."));
    setText("fullscreenBtn", t("Pantalla completa", "Fullscreen"));
    setText("restartButton", t("Reintentar mundo", "Retry world"));
    setText("returnWorldsButton", t("Volver a mundos", "Back to worlds"));
    setText(
      "controlsHelp",
      t(
        "1-3 cambia mundo | Enter/E interactuar | A/D o flechas mover | W/Arriba/Espacio subir | Abajo bajar | I/J/K/L o clic cavar | M puesto/venta | T jetpack | B linterna | P pausa | R reinicia | F pantalla completa",
        "1-3 switch world | Enter/E interact | A/D or arrows move | W/Up/Space climb | Down descend | I/J/K/L or click dig | M outpost/sell | T jetpack | B torch | P pause | R restart | F fullscreen"
      )
    );
  }

  // ─── Soil color ───────────────────────────────────────────────────────────

  function soilRgbAt(world, depthRatio, noise) {
    const stops = world.soilStops;
    let lo = stops[0], hi = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (depthRatio >= stops[i].at && depthRatio <= stops[i + 1].at) {
        lo = stops[i]; hi = stops[i + 1]; break;
      }
    }
    const span = Math.max(0.0001, hi.at - lo.at);
    const t = clamp((depthRatio - lo.at) / span, 0, 1);
    const mixed = mixRgb(parseHex(lo.color), parseHex(hi.color), t);
    const v = 0.86 + noise * 0.26;
    return [clamp(Math.round(mixed[0] * v), 0, 255), clamp(Math.round(mixed[1] * v), 0, 255), clamp(Math.round(mixed[2] * v), 0, 255)];
  }

  // Precompute per-column noise strips for smooth terrain rendering
  function buildNoiseLookup(run) {
    // noise[col][row] = 0..1 float; precomputed once per run
    const lookup = new Float32Array(run.gridCols * run.gridRows);
    for (let row = 0; row < run.gridRows; row++) {
      for (let col = 0; col < run.gridCols; col++) {
        lookup[row * run.gridCols + col] = hashUnit(run.seed, col, row);
      }
    }
    run.noiseLookup = lookup;
  }

  // ─── Grid helpers ─────────────────────────────────────────────────────────

  function gridIndex(run, col, row) { return row * run.gridCols + col; }

  function isCellSolid(run, col, row) {
    if (col < 0 || row < 0 || col >= run.gridCols || row >= run.gridRows) return false;
    return run.solid[gridIndex(run, col, row)] === 1;
  }

  function setCell(run, col, row, solid) {
    if (col < 0 || row < 0 || col >= run.gridCols || row >= run.gridRows) return;
    run.solid[gridIndex(run, col, row)] = solid ? 1 : 0;
  }

  function worldToCell(run, x, y) {
    return { col: Math.floor(x / CELL), row: Math.floor((y - run.surfaceY) / CELL) };
  }

  function clearCircle(run, cx, cy, radius) {
    const minCol = Math.floor((cx - radius) / CELL);
    const maxCol = Math.ceil((cx + radius) / CELL);
    const minRow = Math.floor((cy - radius - run.surfaceY) / CELL);
    const maxRow = Math.ceil((cy + radius - run.surfaceY) / CELL);
    let removed = 0;
    for (let row = minRow; row <= maxRow; row++) {
      if (row < 0 || row >= run.gridRows) continue;
      for (let col = minCol; col <= maxCol; col++) {
        if (col < 0 || col >= run.gridCols) continue;
        if (!isCellSolid(run, col, row)) continue;
        const ccx = col * CELL + CELL * 0.5;
        const ccy = run.surfaceY + row * CELL + CELL * 0.5;
        if (Math.hypot(ccx - cx, ccy - cy) <= radius) {
          setCell(run, col, row, 0);
          removed++;
        }
      }
    }
    if (removed > 0) markTerrainDirty(run, minCol, minRow, maxCol, maxRow);
    return removed;
  }

  function markTerrainDirty(run, minCol, minRow, maxCol, maxRow) {
    run.terrainDirty = true;
    if (run.terrainDirtyAll) return;
    if (![minCol, minRow, maxCol, maxRow].every(Number.isFinite)) {
      run.terrainDirtyAll = true;
      run.terrainDirtyBounds = null;
      return;
    }
    const next = {
      minCol: clamp(Math.floor(minCol), 0, run.gridCols - 1),
      minRow: clamp(Math.floor(minRow), 0, run.gridRows - 1),
      maxCol: clamp(Math.floor(maxCol), 0, run.gridCols - 1),
      maxRow: clamp(Math.floor(maxRow), 0, run.gridRows - 1),
    };
    if (next.maxCol < next.minCol || next.maxRow < next.minRow) return;
    if (!run.terrainDirtyBounds) {
      run.terrainDirtyBounds = next;
      return;
    }
    run.terrainDirtyBounds.minCol = Math.min(run.terrainDirtyBounds.minCol, next.minCol);
    run.terrainDirtyBounds.minRow = Math.min(run.terrainDirtyBounds.minRow, next.minRow);
    run.terrainDirtyBounds.maxCol = Math.max(run.terrainDirtyBounds.maxCol, next.maxCol);
    run.terrainDirtyBounds.maxRow = Math.max(run.terrainDirtyBounds.maxRow, next.maxRow);
  }

  // ─── Terrain texture (HIGH-RESOLUTION) ────────────────────────────────────
  // The terrain canvas is now CELL pixels per grid cell (1792 × ~N px).
  // Each cell is rendered as a rounded rect with per-cell color variation
  // and a 1px gap, giving a natural stone/earth look at any scale.

  function rebuildTerrainTexture(run) {
    const tc = run.terrainCanvas;
    const tctx = run.terrainCtx;
    const w = run.gridCols * CELL;
    const h = run.gridRows * CELL;
    const bounds = run.terrainDirtyAll
      ? { minCol: 0, minRow: 0, maxCol: run.gridCols - 1, maxRow: run.gridRows - 1 }
      : run.terrainDirtyBounds;

    if (!bounds) {
      run.terrainDirty = false;
      return;
    }

    if (run.terrainDirtyAll) {
      tctx.clearRect(0, 0, w, h);
    } else {
      tctx.clearRect(
        bounds.minCol * CELL,
        bounds.minRow * CELL,
        (bounds.maxCol - bounds.minCol + 1) * CELL,
        (bounds.maxRow - bounds.minRow + 1) * CELL
      );
    }

    const noise = run.noiseLookup;

    for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
      const depthRatio = row / Math.max(1, run.gridRows - 1);
      for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
        if (!isCellSolid(run, col, row)) continue;

        const n = noise[row * run.gridCols + col];
        const rgb = soilRgbAt(run.world, depthRatio, n);

        // Cell pixel position with 1px gap for a crisp natural look
        const px = col * CELL + 1;
        const py = row * CELL + 1;
        const pw = CELL - 1;
        const ph = CELL - 1;

        // Base soil color
        tctx.fillStyle = rgbStr(rgb);
        tctx.fillRect(px, py, pw, ph);

        // Top-left highlight for micro-relief
        const hlAlpha = 0.12 + n * 0.1;
        tctx.fillStyle = `rgba(255,255,255,${hlAlpha.toFixed(2)})`;
        tctx.fillRect(px, py, pw, 1);
        tctx.fillRect(px, py, 1, ph);

        // Bottom-right shadow
        const shAlpha = 0.08 + (1 - n) * 0.1;
        tctx.fillStyle = `rgba(0,0,0,${shAlpha.toFixed(2)})`;
        tctx.fillRect(px, py + ph - 1, pw, 1);
        tctx.fillRect(px + pw - 1, py, 1, ph);
      }
    }

    run.terrainDirty = false;
    run.terrainDirtyAll = false;
    run.terrainDirtyBounds = null;
  }

  // ─── Materials & deposits ─────────────────────────────────────────────────

  function sampleMaterial(world, seed, depthRatio, xSeed, ySeed) {
    const band = Math.min(3, Math.floor(depthRatio * 4));
    let total = 0;
    for (const m of world.materials) total += m.weights[band];
    let cursor = hashUnit(seed, xSeed, ySeed) * total;
    for (const m of world.materials) { cursor -= m.weights[band]; if (cursor <= 0) return m; }
    return world.materials[world.materials.length - 1];
  }

  function depthMetersAtY(run, y) {
    const row = clamp(Math.floor((y - run.surfaceY) / CELL), 0, run.gridRows);
    return Math.round(row * run.metersPerRow);
  }

  function createGuidanceMarkers(run) {
    const markers = [];
    const startX = run.shaftX;
    const startY = run.surfaceY + 180;
    for (let i = 0; i < GUIDANCE_MARKER_COUNT; i++) {
      const t = (i + 1) / (GUIDANCE_MARKER_COUNT + 1);
      const wobble = (hashUnit(run.seed, 1400 + i, 1700 + i) - 0.5) * (140 + i * 46);
      const x = clamp(lerp(startX, run.treasure.x, t) + wobble, CELL * 10, run.worldWidth - CELL * 10);
      const y = lerp(startY, run.treasure.y - 96, t);
      markers.push({ id: `marker-${i}`, x, y, radius: 20, exposure: 0, discovered: false, arrow: "v" });
    }
    markers.forEach((m, i) => {
      const next = markers[i + 1] || run.treasure;
      m.arrow = arrowFromVector(next.x - m.x, next.y - m.y);
    });
    run.guidanceMarkers = markers;
  }

  function generateDeposits(run) {
    run.materialById = materialMap(run.world);
    const rowsUsable = run.gridRows - 12;
    const deposits = [];
    const depthScale = Math.max(1, run.world.maxDepthMeters / DEPTH_BALANCE_BASE_METERS);
    const depositTarget = Math.max(run.world.depositCount, Math.round(run.world.depositCount * depthScale));
    for (let i = 0; i < depositTarget; i++) {
      const depthRatio = hashUnit(run.seed, 111 + i, 813 + i);
      const row = 8 + Math.floor(depthRatio * rowsUsable);
      const x = CELL * (8 + Math.floor(hashUnit(run.seed, 391 + i, 277 + i) * (run.gridCols - 16)));
      const y = run.surfaceY + row * CELL + CELL * 0.5;
      const material = sampleMaterial(run.world, run.seed, depthRatio, 200 + i, 500 + i);
      deposits.push({
        id: `${material.id}-${i}`, materialId: material.id, x, y,
        radius: 7 + material.rarity * 2 + Math.floor(hashUnit(run.seed, 701 + i, 919 + i) * 4),
        exposed: 0, discovered: false, collected: false,
      });
    }
    run.deposits = deposits;

    const treasureDepthRatio = TREASURE_MIN_DEPTH_RATIO +
      hashUnit(run.seed, 911, 1733) * (TREASURE_MAX_DEPTH_RATIO - TREASURE_MIN_DEPTH_RATIO);
    const treasureRow = clamp(Math.floor(run.gridRows * treasureDepthRatio), 14, run.gridRows - 10);
    run.treasure = {
      x: CELL * (18 + Math.floor(hashUnit(run.seed, 99, 14) * (run.gridCols - 36))),
      y: run.surfaceY + treasureRow * CELL,
      radius: 28,
      exposure: 0,
      claimed: false,
      promptReady: false,
      bonusCoins: Math.round(180 * Math.sqrt(depthScale)),
      doorOpened: false,
      chestOpened: false,
    };
    createGuidanceMarkers(run);
  }

  // ─── Run builder ──────────────────────────────────────────────────────────

  function buildRun(worldId, seedOverride) {
    const world = worldById(worldId);
    const seed = Number.isFinite(seedOverride) ? seedOverride : createRunSeed(worldId);
    const gridRows = Math.ceil(world.maxDepthMeters / 18) + 18;
    const metersPerRow = world.maxDepthMeters / Math.max(1, gridRows - 12);
    const worldWidth = GRID_COLS * CELL;

    const run = {
      worldId, world, seed,
      gridCols: GRID_COLS, gridRows,
      solid: new Uint8Array(GRID_COLS * gridRows),
      // Terrain canvas is now CELL pixels per cell (full resolution)
      terrainCanvas: document.createElement("canvas"),
      terrainCtx: null,
      terrainDirty: true,
      terrainDirtyAll: true,
      terrainDirtyBounds: null,
      noiseLookup: null,
      worldWidth,
      worldHeight: SURFACE_Y + gridRows * CELL,
      surfaceY: SURFACE_Y,
      metersPerRow,
      player: {
        x: worldWidth * 0.5 - PLAYER_W * 0.5,
        y: SURFACE_Y - PLAYER_H,
        w: PLAYER_W, h: PLAYER_H,
        vx: 0, vy: 0, facing: 1,
        digCooldown: 0, digFlash: 0, walkCycle: 0,
        digAimX: 1, digAimY: 0.18,
      },
      camera: { x: 0, y: 0 },
      outpost: { x: worldWidth * 0.5 + 154, y: SURFACE_Y - 6 },
      shaftX: worldWidth * 0.5,
      coins: 0,
      inventory: Object.create(null),
      inventoryCount: 0,
      collectedTotal: 0,
      shovelLevel: 0,
      capacityLevel: 0,
      staminaLevel: 0,
      stamina: STAMINA_VALUES[0],
      staminaCriticalTimer: 0,
      staminaWarningCooldown: 0,
      failedReason: "",
      jetpackOwned: false,
      torches: 0,
      placedTorches: [],
      deposits: [],
      guidanceMarkers: [],
      treasure: null,
      particles: [],
      celebration: [],
      bestDepthMeters: state.progress.bestDepthByWorld[worldId] || 0,
      guidanceArrow: "v",
      guidanceTitle: t("Excava hacia abajo", "Dig downward"),
      guidanceCopy: t("La tierra se abre de forma continua y los materiales asoman en la pared.", "The ground opens continuously and materials appear in the wall."),
      guidanceSignalActive: false,
      digTarget: null,
      materialScanCooldown: 0,
      inventoryWarningCooldown: 0,
    };

    // Full-resolution terrain canvas
    run.terrainCanvas.width = run.gridCols * CELL;
    run.terrainCanvas.height = run.gridRows * CELL;
    run.terrainCtx = run.terrainCanvas.getContext("2d", { willReadFrequently: false });

    run.solid.fill(1);
    for (let step = 0; step < 10; step++) {
      clearCircle(run, run.shaftX + Math.sin(step * 0.45) * 8, SURFACE_Y + 26 + step * 28, 30 + (step % 2) * 3);
    }
    clearCircle(run, run.shaftX, SURFACE_Y + 320, 44);

    buildNoiseLookup(run);
    generateDeposits(run);
    rebuildTerrainTexture(run);
    return run;
  }

  // ─── Inventory / capacity ─────────────────────────────────────────────────

  function currentCapacity(run) { return CAPACITY_VALUES[run.capacityLevel]; }
  function currentMaxStamina(run) { return STAMINA_VALUES[run.staminaLevel]; }

  function failRun(reason) {
    const run = state.run;
    if (!run || state.screen === "ending" || state.screen === "failed") return;
    run.failedReason = reason || "fallo";
    state.screen = "failed";
    clearInputState();
    setMessage(
      t("Te has quedado sin estamina antes de volver al puesto.", "You ran out of stamina before reaching the outpost."),
      1.8
    );
    markUiDirty();
  }

  function consumeStamina(run, amount) {
    if (!run || state.screen !== "running" || amount <= 0 || run.treasure.claimed) return;
    const max = currentMaxStamina(run);
    if (max <= 0 || run.stamina <= 0) return;
    const prev = run.stamina;
    run.stamina = clamp(run.stamina - amount, 0, max);
    if (run.stamina <= 0 && prev > 0) {
      run.staminaCriticalTimer = STAMINA_CRITICAL_SECONDS;
      setMessage(
        t("Sin estamina. Vuelve al puesto y recarga o perderas la expedicion.", "No stamina left. Return to the outpost and recharge or lose the run."),
        1.8
      );
      markUiDirty();
      return;
    }
    const ratio = run.stamina / Math.max(1, max);
    if (ratio <= STAMINA_LOW_RATIO && run.staminaWarningCooldown <= 0) {
      run.staminaWarningCooldown = STAMINA_WARNING_COOLDOWN;
      setMessage(t("Estamina baja. Regresa al puesto para recargar.", "Low stamina. Return to the outpost to recharge."), 1.4);
    }
  }

  function updateStamina(run, dt) {
    if (!run) return;
    run.staminaWarningCooldown = Math.max(0, run.staminaWarningCooldown - dt);
    if (run.stamina > 0) return;
    if (canAccessOutpost(run)) return;
    run.staminaCriticalTimer = Math.max(0, run.staminaCriticalTimer - dt);
    if (run.staminaCriticalTimer <= 0) {
      failRun("stamina");
    }
    markUiDirty();
  }

  function inventoryEntries(run) {
    return Object.keys(run.inventory)
      .map(id => ({ id, qty: run.inventory[id], material: run.materialById[id] }))
      .sort((a, b) => b.material.value - a.material.value);
  }

  function currentDepthMeters(run) {
    const row = clamp(Math.floor((run.player.y + run.player.h - run.surfaceY) / CELL), 0, run.gridRows);
    return Math.round(row * run.metersPerRow);
  }

  function currentDepthRatio(run) { return clamp(currentDepthMeters(run) / run.world.maxDepthMeters, 0, 1); }
  function currentDarkness(run) {
    return clamp((currentDepthRatio(run) - DARKNESS_START_RATIO) / (DARKNESS_FULL_RATIO - DARKNESS_START_RATIO), 0, 1);
  }

  function hasNearbyTorch(run, x, y, radius) {
    return run.placedTorches.some(t => Math.hypot(t.x - x, t.y - y) <= radius);
  }

  function currentBreadcrumbTarget(run) {
    return run.guidanceMarkers.find(m => !m.discovered) || run.treasure;
  }

  function currentSoilLabel(run) {
    const d = currentDepthRatio(run);
    if (run.worldId === "desert" && d < 0.26) return t("Arena", "Sand");
    return t("Tierra", "Soil");
  }

  function isNearSurface(run) {
    return currentDepthMeters(run) < 26;
  }

  function canAccessOutpost(run) {
    return isNearSurface(run);
  }

  function canSellMaterials(run) {
    return Boolean(run);
  }

  // ─── Collision ────────────────────────────────────────────────────────────

  function isSolidAt(run, x, y) {
    if (x < 0 || x >= run.worldWidth) return true;
    if (y < run.surfaceY) return false;
    const cell = worldToCell(run, x, y);
    if (cell.row < 0) return false;
    if (cell.row >= run.gridRows || cell.col < 0 || cell.col >= run.gridCols) return true;
    return run.solid[gridIndex(run, cell.col, cell.row)] === 1;
  }

  function canOccupy(run, x, y) {
    const pts = [
      [x + PLAYER_W * 0.5, y + 4],
      [x + 4, y + 12], [x + PLAYER_W - 4, y + 12],
      [x + 4, y + PLAYER_H - 6], [x + PLAYER_W - 4, y + PLAYER_H - 6],
      [x + PLAYER_W * 0.5, y + PLAYER_H * 0.55],
    ];
    for (const p of pts) if (isSolidAt(run, p[0], p[1])) return false;
    return true;
  }

  function movePlayerAxis(run, axis, amount) {
    if (!amount) return;
    const player = run.player;
    const steps = Math.max(1, Math.ceil(Math.abs(amount) / 4));
    const delta = amount / steps;
    for (let i = 0; i < steps; i++) {
      const nx = axis === "x" ? player.x + delta : player.x;
      const ny = axis === "y" ? player.y + delta : player.y;
      if (canOccupy(run, nx, ny)) {
        player.x = nx; player.y = ny;
      } else if (axis === "x") {
        player.vx = 0; break;
      } else {
        player.vy = 0; break;
      }
    }
  }

  function centerOfPlayer(run) {
    return { x: run.player.x + run.player.w * 0.5, y: run.player.y + run.player.h * 0.46 };
  }

  function nudgePlayer(run, dx, dy, steps) {
    const moveX = dx === 0 ? 0 : Math.sign(dx);
    const moveY = dy === 0 ? 0 : Math.sign(dy);
    for (let i = 0; i < steps; i++) {
      let moved = false;
      if (moveX && canOccupy(run, run.player.x + moveX, run.player.y)) {
        run.player.x += moveX;
        moved = true;
      }
      if (moveY && canOccupy(run, run.player.x, run.player.y + moveY)) {
        run.player.y += moveY;
        moved = true;
      }
      if (!moved) break;
    }
  }

  function assistHoleEntry(run) {
    const center = centerOfPlayer(run);
    const carveY = run.player.y + run.player.h + 10;
    clearCircle(run, center.x, carveY, ENTRY_ASSIST_RADIUS + run.shovelLevel);
    nudgePlayer(run, 0, 1, 14);
  }

  function assistLateralEntry(run, direction) {
    const center = centerOfPlayer(run);
    const radius = ENTRY_ASSIST_RADIUS + 3 + run.shovelLevel;
    const carveX = center.x + direction * (run.player.w * 0.65 + 10);
    const carveY = run.player.y + run.player.h * 0.6;
    clearCircle(run, carveX, carveY, radius);
    clearCircle(run, carveX + direction * 8, carveY - 6, Math.max(ENTRY_ASSIST_RADIUS - 3, radius * 0.68));
    nudgePlayer(run, direction, 0, 9);
    nudgePlayer(run, 0, 1, 3);
  }

  function assistSurfaceReentry(run, dt) {
    const player = run.player;
    const centerX = player.x + player.w * 0.5;
    const feetY = player.y + player.h;
    if (feetY < run.surfaceY - 8 || feetY > run.surfaceY + 52) return false;
    if (Math.abs(centerX - run.shaftX) > 38) return false;

    clearCircle(run, run.shaftX, run.surfaceY + 18, ENTRY_ASSIST_RADIUS + 10 + run.shovelLevel * 2);
    const desiredX = run.shaftX - player.w * 0.5;
    player.x = approach(player.x, desiredX, SURFACE_ENTRY_ALIGN_SPEED * dt);
    player.x = clamp(player.x, 0, run.worldWidth - player.w);
    nudgePlayer(run, desiredX - player.x, 0, 6);

    if (canOccupy(run, player.x, player.y + 1)) {
      movePlayerAxis(run, "y", SURFACE_ENTRY_PULL_SPEED * dt);
      return true;
    }
    return false;
  }

  // ─── Digging ──────────────────────────────────────────────────────────────

  function resolveDigDirection() {
    if (state.keys.KeyJ) return "left";
    if (state.keys.KeyL) return "right";
    if (state.keys.KeyI) return "up";
    if (state.keys.KeyK) {
      const moveLeft = Boolean(state.keys.KeyA || state.keys.ArrowLeft);
      const moveRight = Boolean(state.keys.KeyD || state.keys.ArrowRight);
      const moveUp = Boolean(state.keys.KeyW || state.keys.ArrowUp || state.keys.Space);
      const moveDown = Boolean(state.keys.ArrowDown);

      if (moveLeft && !moveRight) return "left";
      if (moveRight && !moveLeft) return "right";
      if (moveUp && !moveDown) return "up";
      if (moveDown && !moveUp) return "down";
      return "down";
    }

    return null;
  }

  function resolveDigTarget(run) {
    const center = centerOfPlayer(run);
    let tx = null, ty = null;
    const digDirection = resolveDigDirection();
    if (digDirection === "left") { tx = center.x - 54; ty = center.y + 2; }
    else if (digDirection === "right") { tx = center.x + 54; ty = center.y + 2; }
    else if (digDirection === "down") { tx = center.x; ty = center.y + 54; }
    else if (digDirection === "up") { tx = center.x; ty = center.y - 54; }
    else if (state.pointer.down && state.pointer.inside) {
      tx = state.pointer.x + run.camera.x;
      ty = state.pointer.y + run.camera.y;
    }
    if (tx == null || ty == null) { run.digTarget = null; return null; }
    if (ty < run.surfaceY + 6) { run.digTarget = null; return null; }
    if (Math.hypot(tx - center.x, ty - center.y) > DIG_RANGE) { run.digTarget = null; return null; }
    const aimLen = Math.hypot(tx - center.x, ty - center.y) || 1;
    run.player.digAimX = (tx - center.x) / aimLen;
    run.player.digAimY = (ty - center.y) / aimLen;
    run.digTarget = { x: tx, y: ty };
    run.player.facing = tx >= center.x ? 1 : -1;
    return run.digTarget;
  }

  function spawnParticles(run, x, y, count, colorA, colorB) {
    for (let i = 0; i < count; i++) {
      run.particles.push({
        x, y,
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
    const center = centerOfPlayer(run);
    const dx = target.x - center.x;
    const dy = target.y - center.y;
    const len = Math.hypot(dx, dy) || 1;
    const aimX = dx / len;
    const aimY = dy / len;
    let removed = clearCircle(run, target.x, target.y, radius);
    removed += clearCircle(
      run,
      target.x - aimX * (radius * 0.55),
      target.y - aimY * (radius * 0.35),
      Math.max(12, radius * 0.58)
    );
    if (dy > 18 && Math.abs(dx) < 22) {
      removed += clearCircle(run, center.x, run.player.y + run.player.h + radius * 0.28, Math.max(ENTRY_ASSIST_RADIUS - 2, radius * 0.42));
      assistHoleEntry(run);
    } else if (Math.abs(dx) > 22 && Math.abs(dy) < radius * 0.8) {
      assistLateralEntry(run, Math.sign(dx));
    }
    if (removed <= 0) return;
    run.player.digCooldown = DIG_COOLDOWNS[run.shovelLevel];
    run.player.digFlash = DIG_SWING_TIME;
    run.materialScanCooldown = 0;
    const digLoad = STAMINA_DIG_COSTS[run.shovelLevel] * (0.88 + currentDepthRatio(run) * 0.52);
    consumeStamina(run, digLoad);
    spawnParticles(run, target.x, target.y, 10, "#d5a473", "#8f653f");
    updateProgressDepth(run);
    markUiDirty();
  }

  function updateDigging(run, dt) {
    run.player.digCooldown = Math.max(0, run.player.digCooldown - dt);
    run.player.digFlash = Math.max(0, run.player.digFlash - dt);
    const target = resolveDigTarget(run);
    if (!target || run.player.digCooldown > 0) return;
    if (!state.pointer.down && !state.keys.KeyI && !state.keys.KeyJ && !state.keys.KeyK && !state.keys.KeyL) return;
    digAt(run, target);
  }

  // ─── Deposits ─────────────────────────────────────────────────────────────

  function depositExposure(run, deposit) {
    const samples = [[1,0],[-1,0],[0,1],[0,-1],[0.72,0.72],[-0.72,0.72],[0.72,-0.72],[-0.72,-0.72]];
    let open = 0;
    const radius = deposit.radius + 5;
    for (const s of samples) {
      if (!isSolidAt(run, deposit.x + s[0] * radius, deposit.y + s[1] * radius)) open++;
    }
    return open / samples.length;
  }

  function collectDeposit(run, deposit) {
    const staminaRatio = run.stamina / Math.max(1, currentMaxStamina(run));
    if (run.stamina <= 0) {
      run.guidanceArrow = "â†‘";
      run.guidanceTitle = t("Sin estamina", "No stamina");
      run.guidanceCopy = canAccessOutpost(run)
        ? t("Estas en superficie. Abre el puesto y recarga estamina.", "You are at the surface. Open the outpost and recharge stamina.")
        : t(`Llega al puesto o perderas la expedicion (${Math.max(0, run.staminaCriticalTimer).toFixed(1)} s).`, `Reach the outpost or lose the run (${Math.max(0, run.staminaCriticalTimer).toFixed(1)} s).`);
      run.guidanceSignalActive = true;
      return;
    }

    if (staminaRatio <= STAMINA_LOW_RATIO) {
      run.guidanceArrow = "â†‘";
      run.guidanceTitle = t("Estamina baja", "Low stamina");
      run.guidanceCopy = canAccessOutpost(run)
        ? t("Recarga estamina en el puesto antes de seguir cavando.", "Recharge stamina at the outpost before digging more.")
        : t("Te queda poca estamina. Vuelve al puesto cuanto antes.", "You have little stamina left. Return to the outpost now.");
      run.guidanceSignalActive = true;
      return;
    }

    if (run.inventoryCount >= currentCapacity(run)) {
      if (run.inventoryWarningCooldown <= 0) {
        setMessage(t("Mochila llena. Sube al puesto para vender.", "Backpack full. Return to the outpost to sell."), 1.4);
        run.inventoryWarningCooldown = 1;
      }
      return;
    }
    const material = run.materialById[deposit.materialId];
    deposit.collected = true;
    run.inventory[deposit.materialId] = (run.inventory[deposit.materialId] || 0) + 1;
    run.inventoryCount++;
    run.collectedTotal++;
    spawnParticles(run, deposit.x, deposit.y, 12, material.accent, material.color);
    setMessage(t(`${material.name} encontrado.`, `${material.name} found.`), 0.9);
    markUiDirty();
  }

  function updateDeposits(run, dt) {
    run.inventoryWarningCooldown = Math.max(0, run.inventoryWarningCooldown - dt);
    run.materialScanCooldown -= dt;
    if (run.materialScanCooldown <= 0) {
      for (const d of run.deposits) {
        if (d.collected) continue;
        d.exposed = depositExposure(run, d);
        if (d.exposed > 0.06) d.discovered = true;
      }
      for (const m of run.guidanceMarkers) {
        m.exposure = depositExposure(run, m);
        if (!m.discovered && m.exposure > 0.18) {
          m.discovered = true;
          setMessage(
            t(`Flecha hallada: sigue ${describeDirection(m.arrow)}.`, `Arrow found: follow ${describeDirection(m.arrow)}.`),
            1.2
          );
        }
      }
      const center = centerOfPlayer(run);
      run.treasure.exposure = depositExposure(run, run.treasure);
      run.treasure.promptReady = run.treasure.exposure > 0.34 &&
        Math.hypot(center.x - run.treasure.x, center.y - run.treasure.y) < 64;
      run.materialScanCooldown = 0.08;
    }
    const center = centerOfPlayer(run);
    for (const d of run.deposits) {
      if (d.collected || d.exposed < 0.42) continue;
      if (Math.hypot(center.x - d.x, center.y - d.y) <= d.radius + 22) collectDeposit(run, d);
    }
  }

  // ─── Particles ────────────────────────────────────────────────────────────

  function updateParticles(run, dt) {
    const remaining = [];
    for (const p of run.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy += 160 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      remaining.push(p);
    }
    run.particles = remaining;

    const confetti = [];
    for (const p of run.celebration) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt; p.rotation += p.spin * dt;
      confetti.push(p);
    }
    run.celebration = confetti;
  }

  // ─── Player movement ──────────────────────────────────────────────────────

  function updatePlayer(run, dt) {
    const player = run.player;
    const left = state.keys.KeyA || state.keys.ArrowLeft;
    const right = state.keys.KeyD || state.keys.ArrowRight;
    const up = state.keys.KeyW || state.keys.ArrowUp || state.keys.Space;
    const down = state.keys.ArrowDown;
    const axisX = (right ? 1 : 0) - (left ? 1 : 0);
    const axisY = (down ? 1 : 0) - (up ? 1 : 0);
    const len = Math.hypot(axisX, axisY) || 1;
    const targetVX = axisX ? (axisX / len) * MOVE_SPEED : 0;
    const targetVY = axisY ? (axisY / len) * MOVE_SPEED : 0;
    const accel = (axisX || axisY) ? MOVE_ACCEL : MOVE_FRICTION;
    player.vx = approach(player.vx, targetVX, accel * dt);
    player.vy = approach(player.vy, targetVY, accel * dt);
    movePlayerAxis(run, "x", player.vx * dt);
    movePlayerAxis(run, "y", player.vy * dt);
    if (down && currentDepthMeters(run) < 32) assistSurfaceReentry(run, dt);
    player.x = clamp(player.x, 0, run.worldWidth - player.w);
    player.y = clamp(player.y, run.surfaceY - player.h, run.worldHeight - player.h - 4);
    const moveIntensity = clamp(Math.hypot(player.vx, player.vy) / MOVE_SPEED, 0, 1);
    if (moveIntensity > 0.12) {
      const depthLoad = STAMINA_MOVE_DRAIN_BASE + currentDepthRatio(run) * STAMINA_MOVE_DRAIN_DEPTH;
      const carryLoad = 1 + (run.inventoryCount / Math.max(1, currentCapacity(run))) * 0.22;
      consumeStamina(run, dt * depthLoad * moveIntensity * carryLoad);
    }
    if (Math.abs(player.vx) > 8) player.facing = player.vx >= 0 ? 1 : -1;
    player.walkCycle += Math.hypot(player.vx, player.vy) * dt * 0.028;
  }

  function updateCamera(run) {
    const tx = clamp(run.player.x + run.player.w * 0.5 - state.viewportWidth * 0.5, 0, Math.max(0, run.worldWidth - state.viewportWidth));
    const ty = clamp(run.player.y + run.player.h * 0.5 - state.viewportHeight * 0.52, 0, Math.max(0, run.worldHeight - state.viewportHeight));
    run.camera.x = lerp(run.camera.x, tx, 0.12);
    run.camera.y = lerp(run.camera.y, ty, 0.12);
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

  // ─── Guidance ─────────────────────────────────────────────────────────────

  function arrowFromVector(dx, dy) {
    if (Math.abs(dx) < 28 && Math.abs(dy) < 28) return "o";
    if (Math.abs(dx) > Math.abs(dy) * 1.25) return dx > 0 ? "→" : "←";
    if (Math.abs(dy) > Math.abs(dx) * 1.25) return dy > 0 ? "↓" : "↑";
    if (dx > 0 && dy > 0) return "↘";
    if (dx < 0 && dy > 0) return "↙";
    if (dx > 0 && dy < 0) return "↗";
    return "↖";
  }

  function describeDirection(arrow) {
    if (arrow === "→") return t("a la derecha", "to the right");
    if (arrow === "←") return t("a la izquierda", "to the left");
    if (arrow === "↑") return t("hacia arriba", "upward");
    if (arrow === "↓") return t("hacia abajo", "downward");
    return t("en diagonal", "diagonally");
  }

  function updateGuidance(run) {
    const center = centerOfPlayer(run);
    const target = currentBreadcrumbTarget(run);
    const targetDepth = target ? formatDepth(depthMetersAtY(run, target.y)) : "0 m";
    const torchMissing = currentDarkness(run) > 0.18 && !hasNearbyTorch(run, center.x, center.y, TORCH_NEAR_DISTANCE);
    run.guidanceSignalActive = false;

    if (canClaimTreasure(run)) {
      run.guidanceArrow = "o";
      run.guidanceTitle = t("Puerta del tesoro", "Treasure door");
      run.guidanceCopy = t("Acércate a la puerta visible y pulsa Enter para entrar en la cámara final.", "Move to the visible door and press Enter to enter the final chamber.");
      return;
    }

    if (run.inventoryCount >= currentCapacity(run)) {
      run.guidanceArrow = "↑";
      run.guidanceTitle = t("Mochila llena", "Backpack full");
      run.guidanceCopy = run.jetpackOwned
        ? t("Pulsa M para abrir el puesto o T para volver al mostrador con el jetpack.", "Press M to open the outpost or T to return to the counter with the jetpack.")
        : t("Pulsa M o Inventario para vender desde aqui. Vuelve al puesto para mejorar equipo.", "Press M or Inventory to sell here. Return to the outpost for upgrades.");
      return;
    }

    if (!target) {
      run.guidanceArrow = "↓";
      run.guidanceTitle = t("Excava", "Dig");
      run.guidanceCopy = t("Abre una ruta limpia y sigue profundizando.", "Open a clean route and keep digging deeper.");
      return;
    }

    const dx = target.x - center.x;
    const dy = target.y - center.y;
    run.guidanceArrow = arrowFromVector(dx, dy);

    if (target === run.treasure) {
      run.guidanceTitle = run.treasure.exposure > 0.18 ? t("Puerta del tesoro", "Treasure door") : run.world.treasureName;
      run.guidanceCopy = run.treasure.exposure > 0.18
        ? t("La puerta final ya asoma entre la tierra. Sigue cavando hasta abrir el acceso.", "The final door is now visible. Keep digging to open access.")
        : t(`Las últimas flechas apuntan a ${targetDepth}.`, `The last arrows point toward ${targetDepth}.`);
      run.guidanceSignalActive = run.treasure.exposure < 0.18;
      return;
    }

    if (target.discovered) {
      run.guidanceTitle = t("Flecha encontrada", "Arrow found");
      run.guidanceCopy = t(
        `La señal indica ${describeDirection(target.arrow)}. La siguiente referencia queda cerca de ${targetDepth}.`,
        `The signal points ${describeDirection(target.arrow)}. The next marker is near ${targetDepth}.`
      );
      return;
    }

    run.guidanceTitle = torchMissing ? t("Oscuridad profunda", "Deep darkness") : t("Rastro del tesoro", "Treasure trail");
    run.guidanceCopy = torchMissing
      ? t(`Pulsa B para colocar una linterna y sigue la señal luminosa hacia ${targetDepth}.`, `Press B to place a torch and follow the light signal toward ${targetDepth}.`)
      : t(`Busca la siguiente flecha cerca de ${targetDepth}. Si te desvías, la luz intermitente te recoloca.`, `Find the next arrow near ${targetDepth}. If you drift away, the blinking light will redirect you.`);
    run.guidanceSignalActive = true;
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  function isAtOutpost(run) {
    const center = centerOfPlayer(run);
    return currentDepthMeters(run) < 26 && Math.abs(center.x - run.outpost.x) < 92;
  }

  function snapPlayerToOutpost(run) {
    run.player.x = clamp(run.outpost.x - run.player.w * 0.5, 0, run.worldWidth - run.player.w);
    run.player.y = run.surfaceY - run.player.h;
    run.player.vx = 0;
    run.player.vy = 0;
    run.camera.x = clamp(run.outpost.x - state.viewportWidth * 0.5, 0, Math.max(0, run.worldWidth - state.viewportWidth));
    run.camera.y = 0;
  }

  function canClaimTreasure(run) {
    return run.treasure.promptReady && !run.treasure.doorOpened && !run.treasure.claimed;
  }

  function enterTreasureRoom() {
    const run = state.run;
    if (!run || !canClaimTreasure(run)) return;
    run.treasure.doorOpened = true;
    spawnParticles(run, run.treasure.x, run.treasure.y, 24, "#ffe39e", "#ffaf6e");
    setMessage(t("La puerta se abre. Entras en la camara del tesoro.", "The door opens. You enter the treasure chamber."), 1.8);
    state.screen = "treasure_room";
    clearInputState();
    markUiDirty();
  }

  function useJetpack() {
    const run = state.run;
    if (!run || state.screen !== "running") return;
    if (!run.jetpackOwned) { setMessage(t("Necesitas comprar el jetpack en el puesto.", "You need to buy the jetpack at the outpost."), 1.3); return; }
    snapPlayerToOutpost(run);
    spawnParticles(run, run.player.x + run.player.w * 0.5, run.player.y + run.player.h * 0.5, 22, "#ffe291", "#ff9e54");
    setMessage(t("Jetpack activado. Regresas directamente al puesto.", "Jetpack activated. Returning directly to the outpost."), 1.5);
    updateGuidance(run); markUiDirty();
  }

  function placeTorch() {
    const run = state.run;
    if (!run || state.screen !== "running") return;
    if (currentDarkness(run) < 0.08) { setMessage(t("Todavía hay luz suficiente aquí.", "There is still enough light here."), 1.1); return; }
    if (run.torches <= 0) { setMessage(t("No te quedan linternas. Compra más en el puesto.", "You have no torches left. Buy more at the outpost."), 1.3); return; }
    const center = centerOfPlayer(run);
    if (hasNearbyTorch(run, center.x, center.y, TORCH_NEAR_DISTANCE)) {
      setMessage(t("Ya hay una linterna iluminando esta zona.", "A torch is already lighting this area."), 1.2); return;
    }
    run.placedTorches.push({ x: center.x + run.player.facing * 26, y: center.y });
    run.torches--;
    spawnParticles(run, center.x, center.y, 8, "#ffe8a0", "#ffc45d");
    setMessage(t("Linterna colocada en la pared.", "Torch placed on the wall."), 1.1);
    updateGuidance(run); markUiDirty();
  }

  function spawnCelebration(run) {
    for (let i = 0; i < 96; i++) {
      run.celebration.push({
        x: Math.random() * state.viewportWidth,
        y: -20 - Math.random() * 80,
        vx: (Math.random() - 0.5) * 240,
        vy: 50 + Math.random() * 170,
        size: 5 + Math.random() * 10,
        life: 2 + Math.random() * 2,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 6,
        color: ["#f0c36e", "#8fd6ba", "#f5efe3", "#f39d7b"][i % 4],
      });
    }
  }

  function claimTreasure() {
    const run = state.run;
    if (!run || !run.treasure.doorOpened || run.treasure.claimed) return;
    run.treasure.chestOpened = true;
    run.treasure.claimed = true;
    run.coins += run.treasure.bonusCoins;
    state.progress.completedWorlds[run.worldId] = true;
    state.progress.bestDepthByWorld[run.worldId] = Math.max(state.progress.bestDepthByWorld[run.worldId] || 0, run.bestDepthMeters);
    saveProgress();
    spawnCelebration(run);
    setMessage(t(`Cofre canjeado: ${run.world.treasureName} asegurado.`, `Chest redeemed: ${run.world.treasureName} secured.`), 1.9);
    state.screen = "ending";
    markUiDirty();
  }

  function sellMaterial(materialId, qty) {
    const run = state.run;
    if (!run || !canSellMaterials(run)) return;
    const available = run.inventory[materialId] || 0;
    const amount = clamp(qty, 0, available);
    if (!amount) return;
    const material = run.materialById[materialId];
    run.inventory[materialId] -= amount;
    if (run.inventory[materialId] <= 0) delete run.inventory[materialId];
    run.inventoryCount -= amount;
    run.coins += amount * material.value;
    setMessage(t(`${material.name} vendido ×${amount}.`, `${material.name} sold ×${amount}.`), 1);
    updateGuidance(run); markUiDirty();
  }

  function sellAll() {
    const run = state.run;
    if (!run || !canSellMaterials(run)) return;
    let total = 0;
    for (const e of inventoryEntries(run)) total += e.qty * e.material.value;
    if (!total) { setMessage(t("No tienes materiales para vender.", "You have no materials to sell."), 1.2); return; }
    run.coins += total;
    run.inventory = Object.create(null);
    run.inventoryCount = 0;
    setMessage(t(`Venta completa: ${total} monedas.`, `Sale complete: ${total} coins.`), 1.2);
    updateGuidance(run); markUiDirty();
  }

  function buyShovel() {
    const run = state.run;
    if (!run || !canAccessOutpost(run)) return;
    const next = run.shovelLevel + 1;
    if (next >= SHOVEL_NAMES.length) return;
    const cost = SHOVEL_COSTS[next];
    if (run.coins < cost) { setMessage(t("Necesitas más monedas para mejorar la herramienta.", "You need more coins to upgrade the tool."), 1.3); return; }
    run.coins -= cost; run.shovelLevel = next;
    setMessage(t(`Herramienta mejorada a ${SHOVEL_NAMES[next]}.`, `Tool upgraded to ${SHOVEL_NAMES[next]}.`), 1.4); markUiDirty();
  }

  function buyCapacity() {
    const run = state.run;
    if (!run || !canAccessOutpost(run)) return;
    const next = run.capacityLevel + 1;
    if (next >= CAPACITY_VALUES.length) return;
    const cost = CAPACITY_COSTS[next];
    if (run.coins < cost) { setMessage(t("Necesitas más monedas para ampliar la mochila.", "You need more coins to expand the backpack."), 1.3); return; }
    run.coins -= cost; run.capacityLevel = next;
    setMessage(t(`Capacidad ampliada a ${CAPACITY_VALUES[next]}.`, `Capacity expanded to ${CAPACITY_VALUES[next]}.`), 1.4);
    updateGuidance(run); markUiDirty();
  }

  function refillStamina() {
    const run = state.run;
    if (!run || !canAccessOutpost(run)) return;
    const max = currentMaxStamina(run);
    if (run.stamina >= max) return;
    run.stamina = max;
    run.staminaCriticalTimer = 0;
    run.failedReason = "";
    setMessage(t("Estamina recargada. Puedes seguir excavando.", "Stamina recharged. You can keep digging."), 1.2);
    updateGuidance(run); markUiDirty();
  }

  function buyStaminaUpgrade() {
    const run = state.run;
    if (!run || !canAccessOutpost(run)) return;
    const next = run.staminaLevel + 1;
    if (next >= STAMINA_VALUES.length) return;
    const cost = STAMINA_UPGRADE_COSTS[next];
    if (run.coins < cost) { setMessage(t("Necesitas mas monedas para mejorar la estamina.", "You need more coins to improve stamina."), 1.3); return; }
    run.coins -= cost;
    run.staminaLevel = next;
    run.stamina = currentMaxStamina(run);
    run.staminaCriticalTimer = 0;
    setMessage(t(`Estamina mejorada a ${STAMINA_VALUES[next]}.`, `Stamina upgraded to ${STAMINA_VALUES[next]}.`), 1.4);
    updateGuidance(run); markUiDirty();
  }

  function buyJetpack() {
    const run = state.run;
    if (!run || !canAccessOutpost(run) || run.jetpackOwned) return;
    if (run.bestDepthMeters < JETPACK_DEPTH_REQUIREMENT) {
      setMessage(
        t(
          `Cava al menos ${formatDepth(JETPACK_DEPTH_REQUIREMENT)} para desbloquear el jetpack.`,
          `Dig at least ${formatDepth(JETPACK_DEPTH_REQUIREMENT)} to unlock the jetpack.`
        ),
        1.6
      );
      return;
    }
    if (run.coins < JETPACK_COST) { setMessage(t("Necesitas más monedas para comprar el jetpack.", "You need more coins to buy the jetpack."), 1.3); return; }
    run.coins -= JETPACK_COST; run.jetpackOwned = true; run.torches += 2;
    setMessage(t("Jetpack listo. Incluye dos linternas de pared para zonas oscuras.", "Jetpack ready. Includes two wall torches for dark zones."), 1.8);
    updateGuidance(run); markUiDirty();
  }

  function buyTorchPack() {
    const run = state.run;
    if (!run || !canAccessOutpost(run)) return;
    if (run.coins < TORCH_PACK_COST) { setMessage(t("Necesitas más monedas para comprar linternas.", "You need more coins to buy torches."), 1.3); return; }
    run.coins -= TORCH_PACK_COST; run.torches += TORCH_PACK_SIZE;
    setMessage(t(`Has comprado ${TORCH_PACK_SIZE} linternas.`, `You bought ${TORCH_PACK_SIZE} torches.`), 1.2);
    updateGuidance(run); markUiDirty();
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
    state.run = buildRun(state.selectedWorldId, createRunSeed(state.selectedWorldId));
    state.screen = "running";
    state.panelMode = "inventory";
    clearInputState();
    updateGuidance(state.run);
    markUiDirty();
  }

  function restartRun() {
    if (!state.run) return;
    state.run = buildRun(state.run.worldId, createRunSeed(state.run.worldId));
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
    clearInputState(); markUiDirty();
  }

  function closePanel() {
    if (state.screen === "market" || state.screen === "inventory") {
      state.screen = "running"; clearInputState(); markUiDirty();
    }
  }

  function togglePause() {
    if (state.screen === "running") { state.screen = "paused"; clearInputState(); markUiDirty(); }
    else if (state.screen === "paused") { state.screen = "running"; markUiDirty(); }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.();
  }

  function handleSurfaceAction() {
    const run = state.run;
    if (!run) return;
    if (canAccessOutpost(run)) {
      snapPlayerToOutpost(run);
      openPanel("market");
      return;
    }
    if (run.stamina <= 0) {
      setMessage(t("Sin estamina no puedes usar el retorno rapido. Llega al puesto por tus medios.", "Without stamina you cannot use fast return. Reach the outpost on your own."), 1.5);
      return;
    }
    snapPlayerToOutpost(run);
    if (run.jetpackOwned) {
      setMessage(t("Jetpack activado. Regresas directamente al puesto.", "Jetpack activated. Returning directly to the outpost."), 1.4);
    } else {
      setMessage(t("Ascensor de servicio activado. Ya puedes vender en el puesto.", "Service lift activated. You can now sell at the outpost."), 1.6);
    }
    updateGuidance(run);
    openPanel("market");
  }

  function interact() {
    const run = state.run;
    if (!run) { if (state.screen === "world_select") startRun(state.selectedWorldId); return; }
    if (state.screen === "market" || state.screen === "inventory") { closePanel(); return; }
    if (state.screen === "treasure_room") { claimTreasure(); return; }
    if (state.screen === "failed") { restartRun(); return; }
    if (state.screen === "ending") { restartRun(); return; }
    if (canAccessOutpost(run)) {
      snapPlayerToOutpost(run);
      openPanel("market");
      return;
    }
    if (canClaimTreasure(run)) enterTreasureRoom();
  }

  function handlePanelAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.getAttribute("data-action");
    if (action === "sell-all") sellAll();
    if (action === "buy-shovel") buyShovel();
    if (action === "buy-capacity") buyCapacity();
    if (action === "buy-stamina") buyStaminaUpgrade();
    if (action === "refill-stamina") refillStamina();
    if (action === "buy-jetpack") buyJetpack();
    if (action === "buy-torches") buyTorchPack();
    if (action === "sell") sellMaterial(button.getAttribute("data-material"), Number(button.getAttribute("data-qty") || 0));
  }

  // ─── Drawing ──────────────────────────────────────────────────────────────

  function drawBackdrop(world, surfaceScreenY) {
    const ctx = state.ctx;
    const { viewportWidth: w, viewportHeight: h } = state;
    const sky = ctx.createLinearGradient(0, 0, 0, Math.max(1, surfaceScreenY));
    sky.addColorStop(0, world.theme.skyTop);
    sky.addColorStop(1, world.theme.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = world.theme.sun;
    ctx.beginPath(); ctx.arc(w * 0.82, surfaceScreenY * 0.22, 38, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = world.theme.haze;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.ellipse(w * 0.23, surfaceScreenY * 0.34, 160, 54, 0, 0, Math.PI * 2);
    ctx.ellipse(w * 0.56, surfaceScreenY * 0.28, 190, 44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = world.theme.undergroundBack;
    ctx.fillRect(0, surfaceScreenY, w, h - surfaceScreenY);
  }

  function drawSurfaceWorld(world, surfaceScreenY, cameraX, showcaseOnly) {
    const ctx = state.ctx;
    ctx.save();
    ctx.translate(-cameraX * 0.15, 0);
    if (world.id === "jungle") {
      ctx.fillStyle = "#426739";
      for (let i = -2; i < 9; i++) {
        const x = i * 180 + 50;
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
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#5f7b3c";
      for (let i = -1; i < 8; i++) {
        const x = i * 220 + 90;
        ctx.fillRect(x, surfaceScreenY - 54, 10, 54);
        ctx.fillRect(x - 18, surfaceScreenY - 32, 18, 8);
        ctx.fillRect(x + 10, surfaceScreenY - 26, 18, 8);
      }
    } else {
      for (let i = -1; i < 7; i++) {
        const x = i * 220 + 32;
        ctx.fillStyle = "#d7e5f3"; ctx.fillRect(x, surfaceScreenY - 86, 110, 86);
        ctx.fillStyle = i % 2 === 0 ? "#b66d53" : "#6f8db2"; ctx.fillRect(x, surfaceScreenY - 112, 110, 30);
        ctx.fillStyle = "#d7e5f3";
        ctx.fillRect(x + 18, surfaceScreenY - 56, 18, 22);
        ctx.fillRect(x + 62, surfaceScreenY - 56, 18, 22);
      }
      ctx.fillStyle = "#9c856e"; ctx.fillRect(-80, surfaceScreenY - 12, state.viewportWidth + 160, 14);
      ctx.fillStyle = "#f0e2ca";
      for (let i = -1; i < 20; i++) ctx.fillRect(i * 70 + 12, surfaceScreenY - 48, 8, 36);
    }
    ctx.restore();

    ctx.fillStyle = world.id === "desert" ? "#d8b47a" : "#765032";
    ctx.fillRect(0, surfaceScreenY - 6, state.viewportWidth, 10);
    if (showcaseOnly) return;

    const shaftX = state.run.shaftX - state.run.camera.x;
    ctx.fillStyle = "rgba(24,17,11,0.5)";
    ctx.fillRect(shaftX - 22, surfaceScreenY - 4, 44, 84);
  }

  function drawTerrain(run) {
    if (run.terrainDirty) rebuildTerrainTexture(run);
    const ctx = state.ctx;
    // Draw the full-resolution terrain canvas directly — 1:1 mapping, no scaling artifacts
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      run.terrainCanvas,
      Math.round(-run.camera.x),
      Math.round(run.surfaceY - run.camera.y)
    );
    // Subtle depth gradient overlay
    const shade = ctx.createLinearGradient(0, run.surfaceY - run.camera.y, 0, run.worldHeight - run.camera.y);
    shade.addColorStop(0, "rgba(255,255,255,0.02)");
    shade.addColorStop(1, "rgba(0,0,0,0.26)");
    ctx.fillStyle = shade;
    ctx.fillRect(Math.round(-run.camera.x), Math.round(run.surfaceY - run.camera.y), run.worldWidth, run.worldHeight - run.surfaceY);
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
    for (const d of run.deposits) {
      if (d.collected || (!d.discovered && d.exposed < 0.05)) continue;
      const sx = d.x - run.camera.x, sy = d.y - run.camera.y;
      if (sx < -80 || sx > state.viewportWidth + 80 || sy < -80 || sy > state.viewportHeight + 80) continue;
      drawMaterialBlob(run.materialById[d.materialId], sx, sy, d.radius, d.exposed);
    }
  }

  function drawGuidanceMarkers(run) {
    const ctx = state.ctx;
    const activeMarker = currentBreadcrumbTarget(run);
    for (const m of run.guidanceMarkers) {
      const visible = m.discovered || m.exposure > 0.08 || m === activeMarker;
      if (!visible) continue;
      const x = m.x - run.camera.x, y = m.y - run.camera.y;
      if (x < -80 || x > state.viewportWidth + 80 || y < -80 || y > state.viewportHeight + 80) continue;
      const pulse = m === activeMarker ? 0.12 + Math.sin(state.showcaseTime * 7) * 0.03 : 0.08;
      ctx.save();
      ctx.globalAlpha = m.discovered ? 0.72 : clamp(m.exposure * 0.75, 0.1, 0.34);
      const glow = ctx.createRadialGradient(x, y, 1, x, y, 10);
      glow.addColorStop(0, `rgba(255,208,138,${pulse})`);
      glow.addColorStop(1, "rgba(255,208,138,0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#dfc796"; ctx.fillRect(x - 9, y - 9, 18, 18);
      ctx.strokeStyle = "#6b4d31"; ctx.lineWidth = 1.15; ctx.strokeRect(x - 9, y - 9, 18, 18);
      ctx.fillStyle = "#3a291a"; ctx.font = "700 12px Georgia,serif";
      ctx.textAlign = "center"; ctx.fillText(m.arrow, x, y + 4);
      ctx.restore();
    }
  }

  function drawTreasureDoor(run) {
    if (run.treasure.claimed || run.treasure.exposure <= 0.05) return;
    const ctx = state.ctx;
    const x = run.treasure.x - run.camera.x, y = run.treasure.y - run.camera.y;
    ctx.save();
    ctx.globalAlpha = clamp(run.treasure.exposure * 1.5, 0.18, 1);
    if (run.treasure.doorOpened) {
      const openGlow = ctx.createRadialGradient(x, y + 10, 8, x, y + 10, 74);
      openGlow.addColorStop(0, "rgba(255,231,174,0.44)");
      openGlow.addColorStop(1, "rgba(255,231,174,0)");
      ctx.fillStyle = openGlow;
      ctx.beginPath();
      ctx.arc(x, y + 10, 74, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2b1c14";
      ctx.fillRect(x - 18, y - 4, 36, 42);
      ctx.beginPath();
      ctx.arc(x, y - 4, 18, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = "#f7d27b";
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 18, y - 4, 36, 42);
      ctx.beginPath();
      ctx.arc(x, y - 4, 18, Math.PI, 0);
      ctx.stroke();
      ctx.restore();
      return;
    }
    const glow = ctx.createRadialGradient(x, y + 4, 4, x, y + 4, 56);
    glow.addColorStop(0, "rgba(255,233,170,0.68)"); glow.addColorStop(1, "rgba(255,233,170,0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y + 4, 56, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#5a3921"; ctx.fillRect(x - 18, y - 4, 36, 42);
    ctx.beginPath(); ctx.arc(x, y - 4, 18, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = "#f7d27b"; ctx.lineWidth = 3;
    ctx.strokeRect(x - 18, y - 4, 36, 42);
    ctx.beginPath(); ctx.arc(x, y - 4, 18, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = run.treasure.promptReady ? "#fff5c9" : "#d0a650";
    ctx.fillRect(x - 2, y + 11, 4, 12);
    ctx.beginPath(); ctx.arc(x + 8, y + 13, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawTorches(run) {
    const ctx = state.ctx;
    for (const torch of run.placedTorches) {
      const x = torch.x - run.camera.x, y = torch.y - run.camera.y;
      if (x < -90 || x > state.viewportWidth + 90 || y < -90 || y > state.viewportHeight + 90) continue;
      const glow = ctx.createRadialGradient(x, y, 1, x, y, 14);
      glow.addColorStop(0, "rgba(255,196,116,0.08)");
      glow.addColorStop(1, "rgba(255,196,116,0)");
      ctx.save();
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#6a4c35"; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x, y - 2); ctx.stroke();
      ctx.fillStyle = "#ffc96f"; ctx.beginPath(); ctx.ellipse(x, y - 8, 4.8, 6.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ff8a42"; ctx.beginPath(); ctx.ellipse(x, y - 6, 2.7, 3.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  function drawDarkness(run) {
    const darkness = currentDarkness(run);
    if (darkness <= 0.01) return;

    const ctx = state.ctx;
    const vw = state.viewportWidth;
    const vh = state.viewportHeight;
    const center = centerOfPlayer(run);
    const px = center.x - run.camera.x;
    const py = center.y - run.camera.y;

    // --- Offscreen mask canvas (reuse or create) ---
    if (!state._darkCanvas || state._darkCanvas.width !== vw || state._darkCanvas.height !== vh) {
      state._darkCanvas = document.createElement("canvas");
      state._darkCanvas.width = vw;
      state._darkCanvas.height = vh;
      state._darkCtx = state._darkCanvas.getContext("2d");
    }
    const dc = state._darkCtx;
    dc.clearRect(0, 0, vw, vh);

    // Fill with darkness
    const darkAlpha = 0.32 + darkness * 0.58;
    dc.fillStyle = `rgba(8,7,6,${darkAlpha.toFixed(2)})`;
    dc.fillRect(0, 0, vw, vh);

    // Cut out player light — larger radius, strong center punch
    dc.globalCompositeOperation = "destination-out";
    const playerRadius = 110 + (1 - darkness) * 80;
    const playerGlow = dc.createRadialGradient(px, py, 0, px, py, playerRadius);
    playerGlow.addColorStop(0,    "rgba(255,255,255,1)");
    playerGlow.addColorStop(0.30, "rgba(255,255,255,0.92)");
    playerGlow.addColorStop(0.60, "rgba(255,255,255,0.55)");
    playerGlow.addColorStop(0.85, "rgba(255,255,255,0.18)");
    playerGlow.addColorStop(1,    "rgba(255,255,255,0)");
    dc.fillStyle = playerGlow;
    dc.beginPath(); dc.arc(px, py, playerRadius, 0, Math.PI * 2); dc.fill();

    // Cut out torch light
    for (const torch of run.placedTorches) {
      const tx = torch.x - run.camera.x;
      const ty = torch.y - run.camera.y;
      if (tx < -400 || tx > vw + 400 || ty < -400 || ty > vh + 400) continue;
      // Inner full cutout
      const innerGlow = dc.createRadialGradient(tx, ty, 0, tx, ty, 260);
      innerGlow.addColorStop(0,    "rgba(255,255,255,1)");
      innerGlow.addColorStop(0.45, "rgba(255,255,255,0.95)");
      innerGlow.addColorStop(0.72, "rgba(255,255,255,0.55)");
      innerGlow.addColorStop(0.90, "rgba(255,255,255,0.18)");
      innerGlow.addColorStop(1,    "rgba(255,255,255,0)");
      dc.fillStyle = innerGlow;
      dc.beginPath(); dc.arc(tx, ty, 260, 0, Math.PI * 2); dc.fill();
      // Soft outer halo
      const outerGlow = dc.createRadialGradient(tx, ty, 0, tx, ty, 420);
      outerGlow.addColorStop(0,    "rgba(255,255,255,0.55)");
      outerGlow.addColorStop(0.55, "rgba(255,255,255,0.22)");
      outerGlow.addColorStop(1,    "rgba(255,255,255,0)");
      dc.fillStyle = outerGlow;
      dc.beginPath(); dc.arc(tx, ty, 420, 0, Math.PI * 2); dc.fill();
    }

    dc.globalCompositeOperation = "source-over";

    // Blit the darkness mask onto the main canvas
    ctx.save();
    ctx.drawImage(state._darkCanvas, 0, 0);

    // Warm torch tint on top (source-over, so it adds color inside the lit zones)
    for (const torch of run.placedTorches) {
      const tx = torch.x - run.camera.x;
      const ty = torch.y - run.camera.y;
      if (tx < -400 || tx > vw + 400 || ty < -400 || ty > vh + 400) continue;
      const tint = ctx.createRadialGradient(tx, ty, 0, tx, ty, 220);
      tint.addColorStop(0,    "rgba(255,156,76,0.13)");
      tint.addColorStop(0.40, "rgba(255,138,62,0.07)");
      tint.addColorStop(1,    "rgba(255,138,62,0)");
      ctx.fillStyle = tint;
      ctx.beginPath(); ctx.arc(tx, ty, 220, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawGuidanceSignal(run) {
    const target = currentBreadcrumbTarget(run);
    if (!run.guidanceSignalActive || !target) return;
    const ctx = state.ctx;
    const center = centerOfPlayer(run);
    const sx = center.x - run.camera.x, sy = center.y - run.camera.y;
    const dx = target.x - center.x, dy = target.y - center.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const x = clamp(sx + (dx / dist) * 88, 52, state.viewportWidth - 52);
    const y = clamp(sy + (dy / dist) * 88, 72, state.viewportHeight - 72);
    const pulse = 0.09 + Math.sin(state.showcaseTime * 8) * 0.03;
    ctx.save();
    const glow = ctx.createRadialGradient(x, y, 1, x, y, 14);
    glow.addColorStop(0, `rgba(255,212,142,${pulse})`); glow.addColorStop(1, "rgba(255,212,142,0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ddc590"; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3b2816"; ctx.font = "700 13px Georgia,serif";
    ctx.textAlign = "center"; ctx.fillText(arrowFromVector(dx, dy), x, y + 7);
    ctx.restore();
  }

  function drawOutpost(run) {
    const ctx = state.ctx;
    const x = run.outpost.x - run.camera.x, y = run.surfaceY - run.camera.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = run.world.theme.outpost; ctx.fillRect(-42, -72, 84, 62);
    ctx.fillStyle = run.world.theme.outpostTrim;
    ctx.fillRect(-48, -82, 96, 14);
    ctx.fillRect(-18, -36, 36, 26);
    ctx.fillStyle = "#2e241b"; ctx.fillRect(-10, -30, 20, 20);
    ctx.fillStyle = "#f7ebcf"; ctx.font = "700 11px Georgia,serif";
    ctx.textAlign = "center"; ctx.fillText(t("Puesto", "Outpost"), 0, -88);
    ctx.restore();
  }

  function drawPlayer(run) {
    const ctx = state.ctx;
    const player = run.player;
    const x = player.x - run.camera.x, y = player.y - run.camera.y;
    const moving = Math.hypot(player.vx, player.vy) > 8;
    const walkWave = Math.sin(player.walkCycle);
    const legSwing = walkWave * 5;
    const digPhase = player.digFlash > 0 ? 1 - clamp(player.digFlash / DIG_SWING_TIME, 0, 1) : 0;
    const digSwing = player.digFlash > 0 ? Math.sin(digPhase * Math.PI) * 0.72 : 0;
    const digging = Boolean(run.digTarget) || player.digFlash > 0;
    const aimX = player.digAimX || player.facing;
    const aimY = player.digAimY || 0.18;
    const bodyLean = digging ? aimX * 1.8 : player.vx * 0.008;
    const torsoY = 10 - (moving ? Math.abs(walkWave) * 0.5 : 0);
    const hipY = 26 + (moving ? Math.abs(walkWave) * 0.6 : 0);
    const activeHandX = digging ? clamp(aimX * (9 + digSwing * 4), -16, 16) : 8;
    const activeHandY = digging ? clamp(15 + aimY * 14 - digSwing * 4.8, 7, 28) : 18 - legSwing * 0.18;
    const supportHandX = digging ? clamp(aimX * 4 - player.facing * 3, -12, 12) : -8;
    const supportHandY = digging ? 18 + digSwing * 1.2 : 18 + legSwing * 0.18;

    ctx.save();
    ctx.translate(x + player.w * 0.5, y + player.h * 0.18);
    ctx.lineCap = "round"; ctx.lineWidth = 4;

    // Head
    ctx.strokeStyle = "#18110b"; ctx.fillStyle = "#eed4b4";
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // Body
    ctx.beginPath(); ctx.moveTo(0, torsoY); ctx.lineTo(bodyLean, hipY); ctx.stroke();

    // Arms
    ctx.beginPath();
    ctx.moveTo(-1, 14); ctx.lineTo(supportHandX, supportHandY);
    ctx.moveTo(1, 14); ctx.lineTo(activeHandX, activeHandY);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    ctx.moveTo(bodyLean, hipY); ctx.lineTo(-6, 38 + legSwing * 0.3);
    ctx.moveTo(bodyLean, hipY); ctx.lineTo(6, 38 - legSwing * 0.3);
    ctx.stroke();

    // Shovel if digging
    if (digging) {
      const handleAngle = Math.atan2(aimY, aimX);
      const handleStartX = activeHandX;
      const handleStartY = activeHandY;
      const handleLength = 14 + digSwing * 4;
      const handleEndX = handleStartX + Math.cos(handleAngle) * handleLength;
      const handleEndY = handleStartY + Math.sin(handleAngle) * handleLength;

      ctx.strokeStyle = "#5a4737";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(handleStartX, handleStartY);
      ctx.lineTo(handleEndX, handleEndY);
      ctx.stroke();

      ctx.save();
      ctx.translate(handleEndX, handleEndY);
      ctx.rotate(handleAngle + Math.PI * 0.5);
      ctx.fillStyle = "#d6b48b";
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(7, -1);
      ctx.lineTo(5, 8);
      ctx.lineTo(-5, 8);
      ctx.lineTo(-7, -1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#6d543d";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Jetpack indicator
    if (run.jetpackOwned) {
      ctx.fillStyle = "#4a9eff";
      ctx.fillRect(-12, 12, 6, 10);
      ctx.fillStyle = "#90d4ff";
      ctx.fillRect(-11, 13, 4, 4);
    }

    ctx.restore();
  }

  function drawDigTarget(run) {
    if (!run.digTarget) return;
    const ctx = state.ctx;
    const radius = DIG_RADII[run.shovelLevel];
    ctx.save();
    ctx.strokeStyle = "rgba(255,245,206,0.75)"; ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(run.digTarget.x - run.camera.x, run.digTarget.y - run.camera.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawParticles(run) {
    const ctx = state.ctx;
    for (const p of run.particles) {
      ctx.globalAlpha = clamp(p.life / 0.7, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x - run.camera.x, p.y - run.camera.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawCelebration(run) {
    const ctx = state.ctx;
    for (const p of run.celebration) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size * 0.5, -p.size * 0.2, p.size, p.size * 0.4);
      ctx.restore();
    }
  }

  function drawPausedOverlay() {
    const ctx = state.ctx;
    ctx.fillStyle = "rgba(24,17,11,0.42)"; ctx.fillRect(0, 0, state.viewportWidth, state.viewportHeight);
    ctx.fillStyle = "#f8f0dc"; ctx.font = "700 42px Georgia,serif";
    ctx.textAlign = "center"; ctx.fillText(t("Pausa", "Paused"), state.viewportWidth * 0.5, state.viewportHeight * 0.5);
  }

  function drawRunningWorld(run) {
    const surfaceScreenY = run.surfaceY - run.camera.y;
    drawBackdrop(run.world, surfaceScreenY);
    drawSurfaceWorld(run.world, surfaceScreenY, run.camera.x, false);
    drawTerrain(run);
    drawDeposits(run);
    drawGuidanceMarkers(run);
    drawTreasureDoor(run);
    drawTorches(run);
    drawOutpost(run);
    drawPlayer(run);
    drawDigTarget(run);
    drawParticles(run);
    drawDarkness(run);
    drawGuidanceSignal(run);
    if (state.screen === "paused") drawPausedOverlay();
    if (state.screen === "ending") drawCelebration(run);
  }

  function drawShowcase(world) {
    const { viewportWidth: w, viewportHeight: h } = state;
    const surfaceScreenY = h * 0.44;
    drawBackdrop(world, surfaceScreenY);
    drawSurfaceWorld(world, surfaceScreenY, 0, true);
    const ctx = state.ctx;
    const soil = ctx.createLinearGradient(0, surfaceScreenY, 0, h);
    soil.addColorStop(0, world.soilStops[0].color);
    soil.addColorStop(1, world.soilStops[world.soilStops.length - 1].color);
    ctx.fillStyle = soil; ctx.fillRect(0, surfaceScreenY, w, h - surfaceScreenY);
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    for (let step = 0; step < 6; step++) {
      ctx.beginPath();
      ctx.arc(w * 0.5 + Math.sin(step * 0.4) * 10, surfaceScreenY + 34 + step * 36, 28 + (step % 2) * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    drawMaterialBlob(world.materials[0], w * 0.38, surfaceScreenY + 150, 14, 1);
    drawMaterialBlob(world.materials[Math.min(1, world.materials.length - 1)], w * 0.63, surfaceScreenY + 248, 16, 1);
    drawMaterialBlob(world.materials[world.materials.length - 1], w * 0.52, surfaceScreenY + 350, 18, 1);
    const previewRun = {
      player: {
        x: w * 0.5 - PLAYER_W * 0.5,
        y: surfaceScreenY - PLAYER_H + 6,
        w: PLAYER_W,
        h: PLAYER_H,
        vx: 0,
        walkCycle: state.showcaseTime * 4,
        facing: 1,
        digFlash: DIG_SWING_TIME * (0.45 + 0.45 * Math.sin(state.showcaseTime * 5)),
        digAimX: 0.78,
        digAimY: 0.62,
      },
      camera: { x: 0, y: 0 },
      digTarget: { x: w * 0.5 + 48, y: surfaceScreenY + 74 },
      shovelLevel: 0, jetpackOwned: false,
    };
    drawPlayer(previewRun);
    drawDigTarget(previewRun);
  }

  // ─── UI rendering ─────────────────────────────────────────────────────────

  function renderWorldCards() {
    const current = currentWorld();
    state.hud.worldGrid.innerHTML = Object.values(WORLDS).map((world, i) => {
      const selected = world.id === state.selectedWorldId;
      const completed = state.progress.completedWorlds[world.id];
      const bestDepth = state.progress.bestDepthByWorld[world.id] || 0;
      return `
        <button type="button" class="world-card${selected ? " selected" : ""}" data-world="${world.id}">
          <span class="eyebrow">${t("Mundo", "World")} ${i + 1}</span>
          <strong>${world.title}</strong>
          <p>${world.subtitle}</p>
          <ul>${world.cardFacts.map(f => `<li>${f}</li>`).join("")}</ul>
          <div class="world-meta">
            <span>${formatDepth(bestDepth)} ${t("mejor descenso", "best descent")}</span>
            <span>${completed ? t("✓ Hallazgo logrado", "✓ Discovery completed") : t("Hallazgo pendiente", "Discovery pending")}</span>
          </div>
        </button>`;
    }).join("");
    state.hud.worldGrid.querySelectorAll("[data-world]").forEach(btn => {
      btn.addEventListener("click", () => selectWorld(btn.getAttribute("data-world")));
    });
    state.hud.startButton.textContent = t(`Iniciar en ${current.title}`, `Start in ${current.title}`);
  }

  function renderPanel() {
    const run = state.run;
    if (!run) return;
    const atOutpost = isAtOutpost(run);
    const outpostAccess = canAccessOutpost(run);
    const sellAccess = canSellMaterials(run);
    state.hud.panelEyebrow.textContent = state.screen === "market" ? t("Puesto", "Outpost") : t("Inventario", "Inventory");
    state.hud.panelTitle.textContent = outpostAccess ? run.world.shopName : t("Inventario rapido", "Quick inventory");
    state.hud.panelLead.textContent = outpostAccess
      ? t("Vende y mejora con un toque.", "Sell and upgrade in one tap.")
      : t("Vende al instante. Para mejorar, vuelve al puesto.", "Sell instantly. Return to the outpost for upgrades.");
    state.hud.panelNotice.innerHTML = [
      `<span class="notice-chip notice-chip-coins">${t("Monedas", "Coins")} ${run.coins}</span>`,
      `<span class="notice-chip">${t("Estamina", "Stamina")} ${Math.ceil(run.stamina)}/${currentMaxStamina(run)}</span>`,
      `<span class="notice-chip">Jetpack ${run.jetpackOwned ? t("Operativo", "Online") : t("Sin jetpack", "No jetpack")}</span>`,
      `<span class="notice-chip">${t("Linternas", "Torches")} ${run.torches}</span>`,
      `<span class="notice-chip">${outpostAccess ? (atOutpost ? t("Mostrador", "Counter") : t("Superficie", "Surface")) : t("Venta remota", "Remote sell")}</span>`,
    ].join("");
    const items = inventoryEntries(run);
    state.hud.inventoryList.innerHTML = items.length
      ? items.map(e => `
          <article class="item-card item-card-compact">
            <header class="item-row">
              <div class="item-main">
                <span class="item-icon">${materialIcon(e.id)}</span>
                <div>
                  <strong>${e.material.name}</strong>
                  <div class="mini-pill">${getRarityLabel(e.material.rarity)} · ×${e.qty}</div>
                </div>
              </div>
              <strong class="item-value">🪙 ${e.material.value}</strong>
            </header>
            <div class="item-actions">
              <button type="button" data-action="sell" data-material="${e.id}" data-qty="1" ${sellAccess ? "" : "disabled"}>-1</button>
              <button type="button" data-action="sell" data-material="${e.id}" data-qty="${e.qty}" ${sellAccess ? "" : "disabled"}>${t("Todo", "All")}</button>
            </div>
          </article>`).join("")
      : `<article class="item-card item-card-compact item-empty"><strong>🧺 ${t("Vacio", "Empty")}</strong></article>`;

    const nextShovel = run.shovelLevel + 1;
    const nextCapacity = run.capacityLevel + 1;
    const nextStamina = run.staminaLevel + 1;
    const maxStamina = currentMaxStamina(run);
    const canRefillStamina = outpostAccess && run.stamina < maxStamina;
    const canBuyStamina = outpostAccess && nextStamina < STAMINA_VALUES.length && run.coins >= STAMINA_UPGRADE_COSTS[nextStamina];
    const canBuyJetpack = outpostAccess && !run.jetpackOwned && run.bestDepthMeters >= JETPACK_DEPTH_REQUIREMENT && run.coins >= JETPACK_COST;
    const canBuyTorchPack = outpostAccess && run.coins >= TORCH_PACK_COST;
    state.hud.upgradeList.innerHTML = `
      <article class="upgrade-card upgrade-card-compact">
        <header><strong>⛏ ${t("Pala", "Shovel")} ${SHOVEL_NAMES[run.shovelLevel]}</strong><span class="mini-pill">${t("Nv", "Lv")} ${run.shovelLevel + 1}/${SHOVEL_NAMES.length}</span></header>
        <p>${nextShovel < SHOVEL_NAMES.length ? `${t("Coste", "Cost")}: 🪙 ${SHOVEL_COSTS[nextShovel]}` : "MAX"}</p>
        <div class="upgrade-actions"><button type="button" data-action="buy-shovel" ${outpostAccess && nextShovel < SHOVEL_NAMES.length && run.coins >= SHOVEL_COSTS[nextShovel] ? "" : "disabled"}>${t("Mejorar", "Upgrade")}</button></div>
      </article>
      <article class="upgrade-card upgrade-card-compact">
        <header><strong>🎒 ${t("Mochila", "Backpack")}</strong><span class="mini-pill">${run.inventoryCount}/${currentCapacity(run)}</span></header>
        <p>${nextCapacity < CAPACITY_VALUES.length ? `${t("Coste", "Cost")}: 🪙 ${CAPACITY_COSTS[nextCapacity]} · ${t("Sig", "Next")}: ${CAPACITY_VALUES[nextCapacity]}` : "MAX"}</p>
        <div class="upgrade-actions"><button type="button" data-action="buy-capacity" ${outpostAccess && nextCapacity < CAPACITY_VALUES.length && run.coins >= CAPACITY_COSTS[nextCapacity] ? "" : "disabled"}>${t("Ampliar", "Expand")}</button></div>
      </article>
      <article class="upgrade-card upgrade-card-compact">
        <header><strong>🚀 Jetpack</strong><span class="mini-pill">${run.jetpackOwned ? t("Listo", "Ready") : "Off"}</span></header>
        <p>${run.jetpackOwned ? t("Usa T para volver", "Use T to return") : `Req: ${formatDepth(JETPACK_DEPTH_REQUIREMENT)} · 🪙 ${JETPACK_COST}`}</p>
        <div class="upgrade-actions"><button type="button" data-action="buy-jetpack" ${canBuyJetpack ? "" : "disabled"}>${run.jetpackOwned ? "OK" : t("Comprar", "Buy")}</button></div>
      </article>
      <article class="upgrade-card upgrade-card-compact">
        <header><strong>🕯 ${t("Linternas", "Torches")}</strong><span class="mini-pill">${run.torches}</span></header>
        <p>Pack ${TORCH_PACK_SIZE} · 🪙 ${TORCH_PACK_COST}</p>
        <div class="upgrade-actions"><button type="button" data-action="buy-torches" ${canBuyTorchPack ? "" : "disabled"}>${t("Comprar", "Buy")}</button></div>
      </article>
      <article class="upgrade-card upgrade-card-compact">
        <header><strong>💱 ${t("Venta rapida", "Quick sell")}</strong><span class="mini-pill">${items.length}</span></header>
        <p>${t("Todo el inventario en 1 clic.", "Sell the full inventory in one click.")}</p>
        <div class="upgrade-actions"><button type="button" data-action="sell-all" ${sellAccess && items.length ? "" : "disabled"}>${t("Vender todo", "Sell all")}</button></div>
      </article>`;
    state.hud.upgradeList.insertAdjacentHTML("afterbegin", `
      <article class="upgrade-card upgrade-card-compact">
        <header><strong>${t("Estamina", "Stamina")}</strong><span class="mini-pill">${Math.ceil(run.stamina)}/${maxStamina}</span></header>
        <p>${nextStamina < STAMINA_VALUES.length ? `${t("Mejora", "Upgrade")}: ${STAMINA_UPGRADE_COSTS[nextStamina]} ${t("monedas", "coins")} · ${t("Sig", "Next")}: ${STAMINA_VALUES[nextStamina]}` : "MAX"}</p>
        <div class="upgrade-actions">
          <button type="button" data-action="refill-stamina" ${canRefillStamina ? "" : "disabled"}>${t("Recargar", "Recharge")}</button>
          <button type="button" data-action="buy-stamina" ${canBuyStamina ? "" : "disabled"}>${t("Mejorar", "Upgrade")}</button>
        </div>
      </article>
    `);
  }

  function renderEnding() {
    const run = state.run;
    if (!run) return;
    state.hud.endingTitle.textContent = t(`${run.world.treasureName} asegurado`, `${run.world.treasureName} secured`);
    state.hud.endingLead.textContent = t(
      `Atravesaste la puerta final, entraste en la cámara del tesoro y cerraste la expedición de ${run.world.title}.`,
      `You crossed the final door, entered the treasure chamber, and completed the ${run.world.title} expedition.`
    );
    state.hud.endingStats.innerHTML = `
      <article><span>${t("Profundidad maxima", "Max depth")}</span><strong>${formatDepth(run.bestDepthMeters)}</strong></article>
      <article><span>${t("Materiales recogidos", "Collected materials")}</span><strong>${run.collectedTotal}</strong></article>
      <article><span>${t("Monedas finales", "Final coins")}</span><strong>${run.coins}</strong></article>`;
  }

  function renderFailed() {
    const run = state.run;
    if (!run) return;
    state.hud.endingTitle.textContent = t("Expedicion fallida", "Expedition failed");
    state.hud.endingLead.textContent = t(
      "Te quedaste sin estamina antes de volver al puesto. Reintenta con mejor ruta y mejoras.",
      "You ran out of stamina before returning to the outpost. Try again with a better route and upgrades."
    );
    state.hud.endingStats.innerHTML = `
      <article><span>${t("Profundidad maxima", "Max depth")}</span><strong>${formatDepth(run.bestDepthMeters)}</strong></article>
      <article><span>${t("Materiales recogidos", "Collected materials")}</span><strong>${run.collectedTotal}</strong></article>
      <article><span>${t("Monedas al caer", "Coins at failure")}</span><strong>${run.coins}</strong></article>`;
  }

  function renderTreasureRoom() {
    const run = state.run;
    if (!run) return;
    state.hud.treasureRoomTitle.textContent = t(`Camara de ${run.world.treasureName}`, `Chamber of ${run.world.treasureName}`);
    state.hud.treasureRoomLead.textContent = t("La puerta se ha abierto. Abre el cofre para completar la expedicion.", "The door is open. Open the chest to complete the expedition.");
    state.hud.treasureRoomHint.textContent = t(
      `Pulsa Enter/E o el boton para abrir el cofre (+${run.treasure.bonusCoins} monedas).`,
      `Press Enter/E or the button to open the chest (+${run.treasure.bonusCoins} coins).`
    );
    state.hud.openChestButton.disabled = run.treasure.claimed;
    state.hud.openChestButton.textContent = run.treasure.claimed ? t("Cofre abierto", "Chest opened") : t("Abrir cofre", "Open chest");
  }

  function syncInterface() {
    const world = state.run ? state.run.world : currentWorld();
    state.hud.worldLabel.textContent = world.title;
    state.hud.objectiveLabel.textContent = state.run
      ? (state.screen === "treasure_room"
        ? t("Abre el cofre en la camara para cerrar la partida con exito.", "Open the chest in the chamber to finish the run successfully.")
        : t(`Excava, sigue las flechas del subsuelo y encuentra la puerta de ${world.treasureName}.`, `Dig, follow the underground arrows, and find the door to ${world.treasureName}.`))
      : world.subtitle;

    if (state.run) {
      const run = state.run;
      const maxStamina = currentMaxStamina(run);
      const staminaRatio = maxStamina > 0 ? clamp(run.stamina / maxStamina, 0, 1) : 0;
      state.hud.coinsValue.textContent = String(run.coins);
      state.hud.depthValue.textContent = formatDepth(currentDepthMeters(run));
      state.hud.cargoValue.textContent = `${run.inventoryCount}/${currentCapacity(run)}`;
      state.hud.shovelValue.textContent = SHOVEL_NAMES[run.shovelLevel];
      state.hud.groundValue.textContent = currentSoilLabel(run);
      state.hud.targetValue.textContent = state.screen === "treasure_room"
        ? t("Cofre", "Chest")
        : (canClaimTreasure(run) ? t("Puerta!", "Door!") : (run.treasure.exposure > 0.18 ? t("Visible", "Visible") : t("Buscando", "Searching")));
      state.hud.bestDepthValue.textContent = formatDepth(run.bestDepthMeters);
      state.hud.depthFill.style.height = `${currentDepthRatio(run) * 100}%`;
      state.hud.beaconCard.style.display = state.screen === "running" || state.screen === "paused" ? "flex" : "none";
      state.hud.beaconCard.classList.toggle("signal-active", run.guidanceSignalActive);
      state.hud.beaconTitle.textContent = run.guidanceTitle;
      state.hud.beaconCopy.textContent = run.guidanceCopy;
      state.hud.beaconArrow.textContent = run.guidanceArrow;
      state.hud.surfaceBtn.textContent = isAtOutpost(run) ? t("Puesto", "Outpost") : (run.jetpackOwned ? "Jetpack ↑" : t("Puesto", "Outpost"));
      state.hud.inventoryBtn.textContent = t(`Inventario (${run.inventoryCount})`, `Inventory (${run.inventoryCount})`);
      state.hud.staminaHud.classList.remove("hidden");
      state.hud.staminaFill.style.width = `${Math.round(staminaRatio * 100)}%`;
      state.hud.staminaFill.classList.toggle("low", staminaRatio <= STAMINA_LOW_RATIO);
      if (run.stamina <= 0 && !canAccessOutpost(run) && state.screen !== "failed") {
        state.hud.staminaValue.textContent = `0/${maxStamina} · ${Math.max(0, run.staminaCriticalTimer).toFixed(1)}s`;
      } else {
        state.hud.staminaValue.textContent = `${Math.ceil(run.stamina)}/${maxStamina}`;
      }
    } else {
      const best = state.progress.bestDepthByWorld[state.selectedWorldId] || 0;
      state.hud.coinsValue.textContent = "0";
      state.hud.depthValue.textContent = "0 m";
      state.hud.cargoValue.textContent = `0/${CAPACITY_VALUES[0]}`;
      state.hud.shovelValue.textContent = SHOVEL_NAMES[0];
      state.hud.groundValue.textContent = state.selectedWorldId === "desert" ? t("Arena", "Sand") : t("Tierra", "Soil");
      state.hud.targetValue.textContent = t("Pendiente", "Pending");
      state.hud.bestDepthValue.textContent = formatDepth(best);
      state.hud.depthFill.style.height = `${clamp(best / world.maxDepthMeters, 0, 1) * 100}%`;
      state.hud.beaconCard.style.display = "flex";
      state.hud.beaconCard.classList.remove("signal-active");
      state.hud.beaconTitle.textContent = t("Terreno continuo", "Continuous terrain");
      state.hud.beaconCopy.textContent = t("La piedra aparece en cualquier profundidad y las flechas intermedias te acercan a la puerta final.", "Stone appears at any depth and intermediate arrows guide you to the final door.");
      state.hud.beaconArrow.textContent = "↓";
      state.hud.surfaceBtn.textContent = t("Puesto", "Outpost");
      state.hud.inventoryBtn.textContent = t("Inventario", "Inventory");
      state.hud.staminaFill.style.width = "100%";
      state.hud.staminaFill.classList.remove("low");
      state.hud.staminaValue.textContent = `${STAMINA_VALUES[0]}/${STAMINA_VALUES[0]}`;
      state.hud.staminaHud.classList.add("hidden");
    }

    state.hud.messageBox.textContent = state.message;
    state.hud.messageBox.classList.toggle("hidden", !state.message);
    state.hud.worldSelect.classList.toggle("hidden", state.screen !== "world_select");
    state.hud.panelOverlay.classList.toggle("hidden", !(state.screen === "market" || state.screen === "inventory"));
    state.hud.treasureRoomOverlay.classList.toggle("hidden", state.screen !== "treasure_room");
    state.hud.endingOverlay.classList.toggle("hidden", !(state.screen === "ending" || state.screen === "failed"));

    if (state.screen === "world_select" && state.uiDirty) {
      renderWorldCards();
    }
    if (state.run && state.uiDirty) {
      if (state.screen === "market" || state.screen === "inventory") {
        renderPanel();
      }
      if (state.screen === "ending") {
        renderEnding();
      } else if (state.screen === "failed") {
        renderFailed();
      }
      if (state.screen === "treasure_room") {
        renderTreasureRoom();
      }
    }
    refreshHudLayout();
  }

  // ─── Game loop ────────────────────────────────────────────────────────────

  function update(dt) {
    state.showcaseTime += dt;
    if (state.messageTimer > 0) {
      state.messageTimer -= dt;
      if (state.messageTimer <= 0) { state.message = ""; markUiDirty(); }
    }
    const run = state.run;
    if (run) {
      if (state.screen === "running") {
        updateDigging(run, dt);
        updatePlayer(run, dt);
        updateDeposits(run, dt);
        updateParticles(run, dt);
        updateCamera(run);
        updateProgressDepth(run);
        updateStamina(run, dt);
        updateGuidance(run);
      } else if (state.screen === "paused" || state.screen === "market" || state.screen === "inventory" || state.screen === "treasure_room") {
        updateDeposits(run, dt);
        updateParticles(run, dt);
        updateCamera(run);
        updateStamina(run, dt);
        updateGuidance(run);
      } else if (state.screen === "ending" || state.screen === "failed") {
        updateParticles(run, dt);
        if (run.celebration.length > 0) {
          const remaining = [];
          for (const p of run.celebration) {
            p.life -= dt;
            if (p.life <= 0) continue;
            p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt; p.rotation += p.spin * dt;
            remaining.push(p);
          }
          run.celebration = remaining;
        }
      }
    }
    state.uiTick -= dt;
    if (state.uiDirty || state.uiTick <= 0) { syncInterface(); state.uiDirty = false; state.uiTick = 0.1; }
  }

  function render() {
    state.ctx.clearRect(0, 0, state.viewportWidth, state.viewportHeight);
    if (state.run) drawRunningWorld(state.run);
    else drawShowcase(currentWorld());
  }

  function loop(timestamp) {
    if (!state.lastTime) state.lastTime = timestamp;
    if (state.manualStepping) {
      state.lastTime = timestamp;
      render();
      state.rafId = window.requestAnimationFrame(loop);
      return;
    }
    const delta = Math.min(0.05, (timestamp - state.lastTime) / 1000);
    state.lastTime = timestamp;
    state.accumulator += delta;
    while (state.accumulator >= FIXED_DT) { update(FIXED_DT); state.accumulator -= FIXED_DT; }
    render();
    state.rafId = window.requestAnimationFrame(loop);
  }

  // ─── DOM setup ────────────────────────────────────────────────────────────

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
    refreshHudLayout();
    markUiDirty();
  }

  function updatePointerPosition(event) {
    const rect = state.canvas.getBoundingClientRect();
    state.pointer.x = clamp(event.clientX - rect.left, 0, rect.width);
    state.pointer.y = clamp(event.clientY - rect.top, 0, rect.height);
    state.pointer.inside = true;
  }

  function onKeyDown(event) {
    if (event.repeat && ["Enter","KeyE","KeyM","KeyP","KeyR","KeyF","KeyT","KeyB"].includes(event.code)) return;
    state.keys[event.code] = true;
    if (event.code === "Digit1") selectWorld("jungle");
    if (event.code === "Digit2") selectWorld("desert");
    if (event.code === "Digit3") selectWorld("urban");
    if (event.code === "Enter" || event.code === "KeyE") { event.preventDefault(); interact(); return; }
    if (event.code === "KeyM") { event.preventDefault(); if (state.run && state.screen === "running") handleSurfaceAction(); return; }
    if (event.code === "KeyT") { event.preventDefault(); if (state.run && state.screen === "running") useJetpack(); return; }
    if (event.code === "KeyB") { event.preventDefault(); if (state.run && state.screen === "running") placeTorch(); return; }
    if (event.code === "KeyP") { event.preventDefault(); togglePause(); return; }
    if (event.code === "KeyR") { event.preventDefault(); if (state.screen === "world_select") startRun(state.selectedWorldId); else restartRun(); return; }
    if (event.code === "KeyF") { event.preventDefault(); toggleFullscreen(); return; }
    if (event.code === "Escape" && document.fullscreenElement) { document.exitFullscreen?.(); return; }
    if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Space","KeyI"].includes(event.code)) event.preventDefault();
  }

  function onKeyUp(event) { state.keys[event.code] = false; }

  function buildTextPayload() {
    const run = state.run;
    if (!run) {
      return {
        mode: "arcade-dig-hole-treasure",
        screen: state.screen,
        worldId: state.selectedWorldId,
        worldName: currentWorld().title,
        coordinates: t(
          "x aumenta hacia la derecha; y aumenta hacia abajo; los valores son pixeles del mundo.",
          "x increases to the right; y increases downward; values are world pixels."
        ),
        message: state.message,
      };
    }
    const nextBreadcrumb = currentBreadcrumbTarget(run);
    const center = centerOfPlayer(run);
    const nearbyMaterials = run.deposits
      .filter(d => !d.collected && d.exposed > 0.14 && Math.hypot(d.x - center.x, d.y - center.y) <= 168)
      .sort((a, b) => Math.hypot(a.x - center.x, a.y - center.y) - Math.hypot(b.x - center.x, b.y - center.y))
      .slice(0, 5)
      .map(d => ({
        id: d.id,
        name: run.materialById[d.materialId].name,
        x: round(d.x, 1),
        y: round(d.y, 1),
        exposure: round(d.exposed, 2),
      }));

    return {
      mode: "arcade-dig-hole-treasure",
      screen: state.screen,
      worldId: run.worldId,
      worldName: run.world.title,
      coordinates: t(
        "x aumenta hacia la derecha; y aumenta hacia abajo; los valores son pixeles del mundo.",
        "x increases to the right; y increases downward; values are world pixels."
      ),
      message: state.message,
      bestDepthMeters: run.bestDepthMeters,
      coins: run.coins,
      inventoryCount: run.inventoryCount,
      collectedTotal: run.collectedTotal,
      capacity: currentCapacity(run),
      stamina: round(run.stamina, 1),
      maxStamina: currentMaxStamina(run),
      staminaLevel: run.staminaLevel,
      staminaCriticalTimer: round(run.staminaCriticalTimer, 1),
      shovelLevel: run.shovelLevel,
      jetpackOwned: run.jetpackOwned,
      torches: run.torches,
      darkness: round(currentDarkness(run), 2),
      soilType: currentSoilLabel(run),
      canUseMarket: canAccessOutpost(run),
      treasureVisible: run.treasure.exposure > 0.18,
      treasureReady: canClaimTreasure(run),
      treasureDoorOpened: run.treasure.doorOpened,
      treasureChestOpened: run.treasure.chestOpened,
      guidanceArrow: run.guidanceArrow,
      guidanceSignalActive: run.guidanceSignalActive,
      inventory: inventoryEntries(run).map(entry => ({
        id: entry.id,
        name: entry.material.name,
        qty: entry.qty,
        value: entry.material.value,
        rarity: entry.material.rarity,
      })),
      depthMeters: currentDepthMeters(run),
      player: {
        x: round(run.player.x, 1),
        y: round(run.player.y, 1),
        vx: round(run.player.vx, 1),
        vy: round(run.player.vy, 1),
        facing: run.player.facing,
      },
      digTarget: run.digTarget ? { x: round(run.digTarget.x, 1), y: round(run.digTarget.y, 1) } : null,
      nextBreadcrumb: nextBreadcrumb ? {
        x: round(nextBreadcrumb.x, 1),
        y: round(nextBreadcrumb.y, 1),
        depthMeters: depthMetersAtY(run, nextBreadcrumb.y),
      } : null,
      placedTorches: run.placedTorches.map(t => ({ x: round(t.x, 1), y: round(t.y, 1) })),
      nearbyMaterials,
    };
  }

  function renderGameToText() {
    return JSON.stringify(buildTextPayload());
  }

  function advanceTime(ms) {
    state.manualStepping = true;
    state.lastTime = performance.now();
    const frameMs = FIXED_DT * 1000;
    const totalMs = Math.max(frameMs, Number.isFinite(ms) ? ms : frameMs);
    const steps = Math.max(1, Math.round(totalMs / frameMs));
    for (let i = 0; i < steps; i++) update(FIXED_DT);
    render();
    return renderGameToText();
  }

  function refreshHudLayout() {
    if (!state.shell || !state.hud.hudTop) return;
    const shellRect = state.shell.getBoundingClientRect();
    const hudTopRect = state.hud.hudTop.getBoundingClientRect();
    const stackTop = Math.max(92, Math.round(hudTopRect.bottom - shellRect.top + 10));
    state.shell.style.setProperty("--hud-stack-top", `${stackTop}px`);
    state.shell.style.setProperty("--hud-depth-top", `${Math.max(96, stackTop + 4)}px`);
  }

  function initDom() {
    state.shell = document.getElementById("shell");
    state.canvas = document.getElementById("game");
    state.ctx = state.canvas.getContext("2d");
    state.hud = {
      hudTop: document.querySelector(".hud-top"),
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
      staminaHud: document.getElementById("staminaHud"),
      staminaFill: document.getElementById("staminaFill"),
      staminaValue: document.getElementById("staminaValue"),
      worldSelect: document.getElementById("worldSelect"),
      worldGrid: document.getElementById("worldGrid"),
      panelOverlay: document.getElementById("panelOverlay"),
      panelEyebrow: document.getElementById("panelEyebrow"),
      panelTitle: document.getElementById("panelTitle"),
      panelLead: document.getElementById("panelLead"),
      panelNotice: document.getElementById("panelNotice"),
      inventoryList: document.getElementById("inventoryList"),
      upgradeList: document.getElementById("upgradeList"),
      treasureRoomOverlay: document.getElementById("treasureRoomOverlay"),
      treasureRoomTitle: document.getElementById("treasureRoomTitle"),
      treasureRoomLead: document.getElementById("treasureRoomLead"),
      treasureRoomHint: document.getElementById("treasureRoomHint"),
      openChestButton: document.getElementById("openChestButton"),
      endingOverlay: document.getElementById("endingOverlay"),
      endingTitle: document.getElementById("endingTitle"),
      endingLead: document.getElementById("endingLead"),
      endingStats: document.getElementById("endingStats"),
      startButton: document.getElementById("startButton"),
      closePanelBtn: document.getElementById("closePanelBtn"),
      restartButton: document.getElementById("restartButton"),
      returnWorldsButton: document.getElementById("returnWorldsButton"),
      surfaceBtn: document.getElementById("surfaceBtn"),
      inventoryBtn: document.getElementById("inventoryBtn"),
    };

    state.hud.surfaceBtn.addEventListener("click", () => { if (state.run && state.screen === "running") handleSurfaceAction(); });
    state.hud.inventoryBtn.addEventListener("click", () => { if (state.run && state.screen === "running") openPanel("inventory"); });
    document.getElementById("fullscreenBtn").addEventListener("click", toggleFullscreen);
    state.hud.startButton.addEventListener("click", () => startRun(state.selectedWorldId));
    state.hud.closePanelBtn.addEventListener("click", closePanel);
    state.hud.openChestButton.addEventListener("click", claimTreasure);
    state.hud.restartButton.addEventListener("click", restartRun);
    state.hud.returnWorldsButton.addEventListener("click", () => {
      state.run = null; state.screen = "world_select";
      applyWorldTheme(currentWorld()); markUiDirty();
    });
    state.hud.panelOverlay.addEventListener("click", handlePanelAction);

    state.canvas.addEventListener("pointermove", updatePointerPosition);
    state.canvas.addEventListener("pointerdown", e => {
      updatePointerPosition(e);
      state.pointer.down = true;
    });
    state.canvas.addEventListener("pointerup", e => {
      updatePointerPosition(e);
      state.pointer.down = false;
    });
    state.canvas.addEventListener("pointercancel", () => {
      state.pointer.down = false;
    });
    state.canvas.addEventListener("pointerleave", () => { state.pointer.down = false; state.pointer.inside = false; });
    window.addEventListener("pointerup", () => {
      state.pointer.down = false;
    });

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", resize);
  }

  function boot() {
    initDom();
    localizeStaticDom();
    applyWorldTheme(currentWorld());
    resize();
    syncInterface();
    state.rafId = window.requestAnimationFrame(loop);
    window.render_game_to_text = renderGameToText;
    window.advanceTime = advanceTime;
    window.__digHoleApi = {
      selectWorld,
      startRun,
      restartRun,
      openPanel,
      closePanel,
      interact,
      useJetpack,
      placeTorch,
      renderGameToText,
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
