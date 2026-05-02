const EXTRA_LEVEL_COUNT = 100;
const FIRST_EXTRA_LEVEL = 33;

const ENVIRONMENTS = [
  {
    key: "aurora",
    biome: "Aurora Relay",
    visualStyle: "aurora",
    theme: "dusk",
    mechanics: ["wind gates", "time shards", "checkpoint routing"],
    bossVariant: "mirage",
    hazardType: "plasma",
    hazardLabel: "Aurora Burn"
  },
  {
    key: "clockwork",
    biome: "Gearworks",
    visualStyle: "clockwork",
    theme: "day",
    mechanics: ["switchback routes", "shield routing", "enemy density"],
    bossVariant: "overclock",
    hazardType: "gear",
    hazardLabel: "Gear Teeth"
  },
  {
    key: "reef",
    biome: "Sky Reef",
    visualStyle: "reef",
    theme: "day",
    mechanics: ["spring chains", "gem routes", "hidden lanes"],
    bossVariant: "crystal",
    hazardType: "coral",
    hazardLabel: "Coral Spines"
  },
  {
    key: "void",
    biome: "Null Expanse",
    visualStyle: "void",
    theme: "dusk",
    mechanics: ["low-gravity flow", "wind recovery", "boss pressure"],
    bossVariant: "phantom",
    hazardType: "void",
    hazardLabel: "Null Field"
  },
  {
    key: "ember",
    biome: "Emberline",
    visualStyle: "ember",
    theme: "dusk",
    mechanics: ["hazard lanes", "tempo jumps", "checkpoint routing"],
    bossVariant: "forge",
    hazardType: "lava",
    hazardLabel: "Ember Flow"
  },
  {
    key: "storm",
    biome: "Tempest Reach",
    visualStyle: "storm",
    theme: "dusk",
    mechanics: ["wind", "vertical recovery", "spring chains"],
    bossVariant: "tempest",
    hazardType: "shock",
    hazardLabel: "Static Floor"
  },
  {
    key: "toxic",
    biome: "Toxic Rift",
    visualStyle: "toxic",
    theme: "day",
    mechanics: ["hazards", "all-coin detours", "checkpoint routing"],
    bossVariant: "sentinel",
    hazardType: "toxic",
    hazardLabel: "Toxic Spill"
  },
  {
    key: "celestial",
    biome: "Astral Span",
    visualStyle: "celestial",
    theme: "dusk",
    mechanics: ["sky islands", "precision climb", "time shards"],
    bossVariant: "crystal",
    hazardType: "starfall",
    hazardLabel: "Starfall"
  }
];

const ARCHETYPES = ["horizontal", "hybrid", "vertical", "switchback"];
const BOSS_NAMES = [
  "Mirage Helix",
  "Crystal Regent",
  "Overclock Baron",
  "Null Architect",
  "Ember Admiral",
  "Tempest Viceroy",
  "Toxic Arbiter",
  "Astral Magistrate",
  "Aurora Paragon",
  "Sky Runner Prime"
];
const BOSS_VARIANT_FLOW = [
  "mirage",
  "crystal",
  "overclock",
  "phantom",
  "forge",
  "tempest",
  "sentinel",
  "juggernaut"
];

const makeGrid = (width, height) =>
  Array.from({ length: height }, () => Array.from({ length: width }, () => "."));

const setTile = (grid, x, y, tile) => {
  if (grid[y] && x >= 0 && x < grid[y].length) {
    grid[y][x] = tile;
  }
};

const drawSpan = (grid, x, y, length, tile = "=") => {
  for (let dx = 0; dx < length; dx += 1) {
    setTile(grid, x + dx, y, tile);
  }
};

const drawPillar = (grid, x, yTop, yBottom, tile = "T") => {
  for (let y = yTop; y <= yBottom; y += 1) {
    setTile(grid, x, y, tile);
  }
};

const toRows = (grid) => grid.map((row) => row.join(""));

const addBaseFloor = (grid, floorY) => {
  drawSpan(grid, 0, floorY, grid[0].length, "#");
  drawSpan(grid, 0, floorY + 1, grid[0].length, "#");
};

const addRoute = (grid, archetype, ordinal, difficulty) => {
  const width = grid[0].length;
  const floorY = grid.length - 2;
  const step = archetype === "vertical" ? 7 : 9;
  for (let x = 7, index = 0; x < width - 8; x += step, index += 1) {
    const lane = index % 4;
    const y =
      archetype === "vertical"
        ? floorY - 4 - Math.min(10, index * 2)
        : archetype === "hybrid"
          ? floorY - 3 - ((lane + ordinal) % 4) * 2
          : archetype === "switchback"
            ? floorY - 4 - (index % 5) * 2
            : floorY - 3 - ((lane + difficulty) % 3) * 2;
    drawSpan(grid, x, Math.max(3, y), 5 + ((ordinal + index) % 3), "=");
    if ((index + ordinal) % 3 === 0) {
      setTile(grid, x + 2, Math.max(2, y - 2), "?");
    }
    if ((index + difficulty) % 4 === 0) {
      drawSpan(grid, x + 1, Math.max(2, y - 4), 3, "B");
    }
  }

  for (let x = 14; x < width - 12; x += 18) {
    setTile(grid, x, floorY - 1, "^");
  }
  for (let x = 21; x < width - 8; x += 24) {
    drawPillar(grid, x, floorY - 3, floorY - 1, "T");
  }
};

const collectCoins = (width, floorY, ordinal, archetype) => {
  const items = [];
  for (let x = 9; x < width - 9; x += 10) {
    const y = archetype === "vertical"
      ? Math.max(3, floorY - 5 - ((x + ordinal) % 12))
      : Math.max(4, floorY - 5 - ((x + ordinal) % 5));
    items.push({ type: "coin", x, y }, { type: "coin", x: x + 1, y });
  }
  return items;
};

const addSpecialItems = (items, width, floorY, ordinal) => {
  const slots = [
    { type: "gem", x: Math.max(10, Math.floor(width * 0.28)), y: floorY - 7 - (ordinal % 3) },
    { type: "time", x: Math.max(14, Math.floor(width * 0.48)), y: floorY - 8 + (ordinal % 2) },
    { type: "shield", x: Math.max(18, Math.floor(width * 0.66)), y: floorY - 6 - (ordinal % 4) }
  ];
  slots.forEach((item, index) => {
    if ((ordinal + index) % 2 === 0) {
      items.push(item);
    }
  });
  if (ordinal % 5 === 0) {
    items.push({ type: "mushroom", x: Math.max(12, Math.floor(width * 0.42)), y: floorY - 4 });
  }
};

const createHazards = (env, width, floorY, ordinal, bossLevel) => {
  const count = bossLevel ? 3 : 2 + (ordinal % 2);
  return Array.from({ length: count }, (_, index) => {
    const runway = bossLevel ? 18 : 20;
    const x = runway + index * Math.floor((width - runway - 12) / Math.max(1, count));
    return {
      id: `${env.key}-hazard-${ordinal}-${index + 1}`,
      type: env.hazardType,
      label: env.hazardLabel,
      x,
      y: floorY,
      w: bossLevel ? 4 : 3 + ((ordinal + index) % 2),
      h: 1,
      message: `${env.hazardLabel}.`
    };
  });
};

const createWindZones = (env, width, floorY, ordinal, difficulty) => {
  if (!["aurora", "storm", "void", "celestial"].includes(env.key) && ordinal % 3 !== 0) {
    return [];
  }
  return [
    {
      id: `${env.key}-lift-${ordinal}`,
      label: env.key === "void" ? "Null Drift" : "Sky Lift",
      x: Math.floor(width * 0.28),
      y: Math.max(2, floorY - 11),
      w: 8,
      h: 8,
      forceX: ordinal % 2 === 0 ? 54 : -54,
      forceY: -70 - difficulty * 10
    },
    {
      id: `${env.key}-gate-${ordinal}`,
      label: "Crosswind Gate",
      x: Math.floor(width * 0.58),
      y: Math.max(2, floorY - 9),
      w: 10,
      h: 6,
      forceX: ordinal % 2 === 0 ? -86 : 86,
      forceY: -22
    }
  ];
};

const createQuestionRewards = (grid) => {
  const rewards = [];
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid[y].length; x += 1) {
      if (grid[y][x] === "?") {
        rewards.push({ x, y, type: (x + y) % 4 === 0 ? "mushroom" : "coin" });
      }
    }
  }
  return rewards;
};

const createStandardLevel = (number, ordinal, env, archetype) => {
  const vertical = archetype === "vertical";
  const width = vertical ? 56 : 82;
  const height = vertical ? 25 : 19;
  const floorY = height - 2;
  const difficulty = Math.min(5, 1 + Math.floor(ordinal / 20));
  const grid = makeGrid(width, height);

  addBaseFloor(grid, floorY);
  addRoute(grid, archetype, ordinal, difficulty);

  const itemSpawns = collectCoins(width, floorY, ordinal, archetype);
  addSpecialItems(itemSpawns, width, floorY, ordinal);

  const enemySpawns = [];
  for (let x = 16; x < width - 12; x += 18) {
    enemySpawns.push({
      type: (x + ordinal) % 3 === 0 ? "jumper" : "walker",
      x,
      y: floorY - 1,
      patrol: 3 + ((x + difficulty) % 4),
      speed: 42 + difficulty * 5
    });
  }

  const goalY = vertical ? Math.max(4, floorY - 14) : floorY - 1;
  if (vertical) {
    drawSpan(grid, width - 12, goalY + 1, 8, "=");
  }

  return {
    id: `sky-runner-extra-${number}`,
    name: `${env.biome} ${String(number).padStart(3, "0")}`,
    biome: env.biome,
    subtitle: `${archetype} route with ${env.mechanics[0]}`,
    difficulty,
    mechanics: [...env.mechanics, archetype === "vertical" ? "vertical ascent" : "route flow"],
    theme: env.theme,
    visualStyle: env.visualStyle,
    layoutType: archetype === "switchback" ? "hybrid" : archetype,
    timeLimit: 150 + difficulty * 12 + (vertical ? 24 : 0),
    goalRequiresAllCoins: ordinal % 15 === 6,
    map: toRows(grid),
    playerSpawn: { x: 2, y: floorY - 1 },
    goal: { x: width - 6, y: goalY },
    checkpoints: [
      { id: `cp-${number}-a`, label: "Flow Gate", x: Math.floor(width * 0.34), y: floorY - 1 },
      { id: `cp-${number}-b`, label: "Sky Lock", x: Math.floor(width * 0.68), y: vertical ? Math.max(5, floorY - 10) : floorY - 1 }
    ],
    windZones: createWindZones(env, width, floorY, ordinal, difficulty),
    hazardZones: createHazards(env, width, floorY, ordinal, false),
    enemySpawns,
    itemSpawns,
    questionRewards: createQuestionRewards(grid)
  };
};

const createBossLevel = (number, ordinal, env, finalBoss) => {
  const width = finalBoss ? 76 : 68;
  const height = 20;
  const floorY = height - 2;
  const difficulty = finalBoss ? 5 : Math.min(5, 2 + Math.floor(ordinal / 22));
  const grid = makeGrid(width, height);
  const bossName = finalBoss ? "Sky Runner Prime" : BOSS_NAMES[Math.floor(ordinal / 10) % (BOSS_NAMES.length - 1)];
  const bossVariant = finalBoss
    ? "overclock"
    : BOSS_VARIANT_FLOW[Math.floor(ordinal / 10) % BOSS_VARIANT_FLOW.length] || env.bossVariant;

  addBaseFloor(grid, floorY);
  drawSpan(grid, 8, floorY - 5, 10, "=");
  drawSpan(grid, Math.floor(width * 0.38), floorY - 7, 11, "=");
  drawSpan(grid, Math.floor(width * 0.60), floorY - 5, 10, "=");
  setTile(grid, 14, floorY - 1, "^");
  setTile(grid, Math.floor(width * 0.48), floorY - 1, "^");
  setTile(grid, Math.floor(width * 0.72), floorY - 1, "^");
  drawPillar(grid, 24, floorY - 3, floorY - 1, "T");
  drawPillar(grid, width - 24, floorY - 3, floorY - 1, "T");

  const itemSpawns = collectCoins(width, floorY, ordinal, "hybrid");
  itemSpawns.push(
    { type: "mushroom", x: 9, y: floorY - 6 },
    { type: "shield", x: Math.floor(width * 0.36), y: floorY - 8 },
    { type: "time", x: Math.floor(width * 0.62), y: floorY - 6 },
    { type: "gem", x: width - 12, y: floorY - 6 }
  );

  return {
    id: finalBoss ? "sky-runner-prime-132" : `sky-runner-boss-${number}`,
    name: bossName,
    biome: finalBoss ? "Prime Convergence" : env.biome,
    subtitle: finalBoss ? "final boss route with layered recovery" : `boss arena with ${env.mechanics[0]}`,
    difficulty,
    mechanics: ["boss fight", "arena control", ...env.mechanics],
    theme: "dusk",
    visualStyle: finalBoss ? "void" : env.visualStyle,
    layoutType: "hybrid",
    timeLimit: finalBoss ? 235 : 185 + difficulty * 10,
    boss: {
      name: bossName,
      variant: bossVariant,
      maxHealth: finalBoss ? 24 : 14 + difficulty * 2,
      projectileDamage: finalBoss ? 2 : 1,
      stompDamage: 2,
      finalBoss
    },
    map: toRows(grid),
    playerSpawn: { x: 2, y: floorY - 1 },
    goal: { x: width - 5, y: floorY - 1 },
    checkpoints: [
      { id: `boss-${number}-gate`, label: "Arena Gate", x: Math.floor(width * 0.32), y: floorY - 1 },
      { id: `boss-${number}-seal`, label: "Boss Seal", x: Math.floor(width * 0.64), y: floorY - 1 }
    ],
    windZones: createWindZones(env, width, floorY, ordinal, difficulty),
    hazardZones: createHazards(env, width, floorY, ordinal, true),
    enemySpawns: [
      { type: "walker", x: 12, y: floorY - 1, patrol: 4, speed: 44 + difficulty * 4 },
      { type: "jumper", x: 28, y: floorY - 1, patrol: 4, speed: 42 + difficulty * 4 },
      {
        type: "boss",
        name: bossName,
        variant: bossVariant,
        x: width - 17,
        y: floorY - 1,
        patrol: finalBoss ? 9 : 7,
        health: finalBoss ? 24 : 14 + difficulty * 2,
        speed: finalBoss ? 58 : 46 + difficulty * 3,
        chargeSpeed: finalBoss ? 158 : 126 + difficulty * 5
      }
    ],
    itemSpawns,
    questionRewards: createQuestionRewards(grid)
  };
};

const generatedSkyRunnerLevels = Array.from({ length: EXTRA_LEVEL_COUNT }, (_, ordinal) => {
  const number = FIRST_EXTRA_LEVEL + ordinal;
  const env = ENVIRONMENTS[ordinal % ENVIRONMENTS.length];
  const finalBoss = ordinal === EXTRA_LEVEL_COUNT - 1;
  const bossLevel = finalBoss || ordinal % 10 === 9;
  if (bossLevel) {
    return createBossLevel(number, ordinal, env, finalBoss);
  }
  return createStandardLevel(number, ordinal, env, ARCHETYPES[ordinal % ARCHETYPES.length]);
});

export default generatedSkyRunnerLevels;
