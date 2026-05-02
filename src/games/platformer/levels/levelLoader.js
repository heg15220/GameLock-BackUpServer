import { TILE_SIZE } from "../config";
import { LEVELS } from "./index";

export const TILE_TYPES = {
  EMPTY: "empty",
  GROUND: "ground",
  BRICK: "brick",
  PIPE: "pipe",
  QUESTION: "question",
  PLATFORM: "platform",
  SPRING: "spring"
};

const CHAR_TILE_MAP = {
  ".": TILE_TYPES.EMPTY,
  "#": TILE_TYPES.GROUND,
  B: TILE_TYPES.BRICK,
  T: TILE_TYPES.PIPE,
  "?": TILE_TYPES.QUESTION,
  "=": TILE_TYPES.PLATFORM,
  "^": TILE_TYPES.SPRING
};

const SOLID_TILES = new Set([
  TILE_TYPES.GROUND,
  TILE_TYPES.BRICK,
  TILE_TYPES.PIPE,
  TILE_TYPES.QUESTION
]);

const ONEWAY_TILES = new Set([TILE_TYPES.PLATFORM, TILE_TYPES.SPRING]);

const isSolidTileInternal = (tileType) => SOLID_TILES.has(tileType);
const isOneWayTileInternal = (tileType) => ONEWAY_TILES.has(tileType);
const isSupportTileInternal = (tileType) => isSolidTileInternal(tileType) || isOneWayTileInternal(tileType);

const MAX_STEP_X = 4;
const MAX_STEP_UP = 3;
const MAX_STEP_DOWN = 6;

const DEFAULT_BIOME_BY_STYLE = {
  classic: "Frontier Plains",
  ice: "Cryo Ridge",
  lava: "Molten Frontier",
  fortress: "Iron Bastion",
  boss_arena: "Citadel Core",
  forest: "Verdant Canopy",
  sunset: "Amber Causeway",
  storm: "Tempest Reach",
  toxic: "Toxic Rift",
  celestial: "Astral Span",
  aurora: "Aurora Relay",
  clockwork: "Gearworks",
  reef: "Sky Reef",
  void: "Null Expanse",
  ember: "Emberline"
};

const DEFAULT_MECHANICS_BY_STYLE = {
  classic: ["precision jumps", "coin routes"],
  ice: ["vertical ascent", "cooldown pressure"],
  lava: ["hazards", "pressure pacing"],
  fortress: ["enemy density", "hybrid traversal"],
  boss_arena: ["boss fight", "arena control"],
  forest: ["springs", "hidden lanes"],
  sunset: ["long bridges", "tempo jumps"],
  storm: ["wind", "vertical recovery"],
  toxic: ["hazards", "checkpoint routing"],
  celestial: ["sky islands", "precision climb"],
  aurora: ["wind gates", "time shards"],
  clockwork: ["switchback routes", "shield routing"],
  reef: ["spring chains", "gem routes"],
  void: ["low-gravity flow", "boss pressure"],
  ember: ["hazard lanes", "tempo jumps"]
};

const VISUAL_STYLES = new Set([
  "classic",
  "ice",
  "lava",
  "fortress",
  "boss_arena",
  "forest",
  "sunset",
  "storm",
  "toxic",
  "celestial",
  "aurora",
  "clockwork",
  "reef",
  "void",
  "ember"
]);

export const tileKey = (tx, ty) => `${tx},${ty}`;

const numberOrFallback = (value, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return numeric;
};

const clampInt = (value, min, max) => Math.max(min, Math.min(max, Math.floor(value)));

const rectContainsPoint = (rect, x, y) =>
  x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;

const toTileRect = (zone) => ({
  x: zone.x,
  y: zone.y,
  w: zone.w,
  h: zone.h
});

const getTileFromTiles = (tiles, width, height, x, y) => {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return TILE_TYPES.EMPTY;
  }
  return tiles[y]?.[x] || TILE_TYPES.EMPTY;
};

const standNodeBlockedByHazard = (node, hazardZones) => {
  if (!Array.isArray(hazardZones) || !hazardZones.length) {
    return false;
  }
  return hazardZones.some((zone) => {
    const rect = toTileRect(zone);
    return rectContainsPoint(rect, node.x, node.y - 1) || rectContainsPoint(rect, node.x, node.y);
  });
};

const placeSafetyPlatform = (tiles, width, height, centerX, y, radius = 1) => {
  const safeY = clampInt(y, 1, height - 2);
  for (let x = centerX - radius; x <= centerX + radius; x += 1) {
    if (x < 0 || x >= width) {
      continue;
    }
    if (tiles[safeY][x] === TILE_TYPES.EMPTY) {
      tiles[safeY][x] = TILE_TYPES.PLATFORM;
    }
    if (safeY > 0 && tiles[safeY - 1][x] !== TILE_TYPES.EMPTY && tiles[safeY - 1][x] !== TILE_TYPES.QUESTION) {
      tiles[safeY - 1][x] = TILE_TYPES.EMPTY;
    }
  }
};

const injectSafetyRoute = (tiles, width, height, playerSpawn, goal) => {
  const maxStepX = 4;
  const maxStepUp = 3;
  const maxStepDown = 4;
  const routeLimit = width + height + 40;

  let currentX = clampInt(playerSpawn.x, 0, width - 1);
  let currentY = clampInt(playerSpawn.y + 1, 1, height - 2);
  const targetX = clampInt(goal.x, 0, width - 1);
  const targetY = clampInt(goal.y + 1, 1, height - 2);

  placeSafetyPlatform(tiles, width, height, currentX, currentY, 2);

  let guard = 0;
  while (guard < routeLimit) {
    guard += 1;
    const deltaX = targetX - currentX;
    const deltaY = targetY - currentY;
    const closeEnough = Math.abs(deltaX) <= maxStepX && deltaY >= 0 && Math.abs(deltaY) <= 1;
    if (closeEnough) {
      break;
    }

    let stepX = Math.abs(deltaX) <= maxStepX
      ? deltaX
      : Math.sign(deltaX) * maxStepX;
    let stepY = 0;
    if (deltaY < -1) {
      const climb = Math.min(maxStepUp, Math.abs(deltaY));
      const remaining = Math.abs(deltaY) - climb;
      stepY = -(remaining === 1 ? Math.max(1, climb - 1) : climb);
    } else if (deltaY > 1) {
      stepY = Math.min(maxStepDown, deltaY);
    }
    if (stepY < -1 && Math.abs(stepX) >= maxStepX) {
      stepX = Math.sign(stepX) * (maxStepX - 1);
    }

    currentX = clampInt(currentX + stepX, 0, width - 1);
    currentY = clampInt(currentY + stepY, 1, height - 2);
    placeSafetyPlatform(tiles, width, height, currentX, currentY, 2);
  }

  placeSafetyPlatform(tiles, width, height, targetX, targetY, 2);
  if (tiles[targetY][targetX] === TILE_TYPES.EMPTY) {
    tiles[targetY][targetX] = TILE_TYPES.PLATFORM;
  }
};

const collectStandNodesFromTiles = (tiles, width, height, hazardZones = []) => {
  const nodes = [];
  for (let y = 1; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const tile = getTileFromTiles(tiles, width, height, x, y);
      const above = getTileFromTiles(tiles, width, height, x, y - 1);
      if (!isSupportTileInternal(tile) || above !== TILE_TYPES.EMPTY) {
        continue;
      }
      const node = { x, y };
      if (!standNodeBlockedByHazard(node, hazardZones)) {
        nodes.push(node);
      }
    }
  }
  return nodes;
};

const makeNodeMap = (nodes) => {
  const map = new Map();
  for (const node of nodes) {
    map.set(tileKey(node.x, node.y), node);
  }
  return map;
};

const closestNodes = (nodes, targetX, targetY, radiusX, radiusY) =>
  nodes.filter((node) => Math.abs(node.x - targetX) <= radiusX && Math.abs(node.y - targetY) <= radiusY);

const findNearestNode = (nodes, targetX, targetY) => {
  if (!nodes.length) {
    return null;
  }
  let bestNode = nodes[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const node of nodes) {
    const dx = node.x - targetX;
    const dy = node.y - targetY;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestNode = node;
    }
  }
  return bestNode;
};

const computeReachableStandNodeKeysFromTiles = (
  tiles,
  width,
  height,
  playerSpawn,
  hazardZones = []
) => {
  const nodes = collectStandNodesFromTiles(tiles, width, height, hazardZones);
  const visited = new Set();
  if (!nodes.length) {
    return { nodes, visited };
  }

  const spawnSupportY = Math.min(height - 1, playerSpawn.y + 1);
  let starts = closestNodes(nodes, playerSpawn.x, spawnSupportY, 2, 2);
  if (!starts.length) {
    starts = closestNodes(nodes, playerSpawn.x, spawnSupportY, 4, 4);
  }
  if (!starts.length) {
    return { nodes, visited };
  }

  const nodeMap = makeNodeMap(nodes);
  const queue = [...starts];
  while (queue.length) {
    const current = queue.shift();
    const key = tileKey(current.x, current.y);
    if (visited.has(key)) {
      continue;
    }
    visited.add(key);

    for (let nx = current.x - MAX_STEP_X; nx <= current.x + MAX_STEP_X; nx += 1) {
      if (nx < 0 || nx >= width) {
        continue;
      }
      for (let ny = current.y - MAX_STEP_UP; ny <= current.y + MAX_STEP_DOWN; ny += 1) {
        if (ny < 1 || ny >= height) {
          continue;
        }
        const candidateKey = tileKey(nx, ny);
        if (visited.has(candidateKey)) {
          continue;
        }
        const candidate = nodeMap.get(candidateKey);
        if (!candidate) {
          continue;
        }
        const dx = Math.abs(candidate.x - current.x);
        const dyUp = current.y - candidate.y;
        if (dyUp > MAX_STEP_UP || dx > MAX_STEP_X) {
          continue;
        }
        if (dx >= 4 && dyUp > 1) {
          continue;
        }
        queue.push(candidate);
      }
    }
  }

  return { nodes, visited };
};

const ensureStandNode = (tiles, width, height, x, y, hazardZones = []) => {
  const targetX = clampInt(x, 0, width - 1);
  const desiredY = clampInt(y, 1, height - 2);
  for (let offset = 0; offset <= 2; offset += 1) {
    for (const candidateY of [desiredY - offset, desiredY + offset]) {
      if (candidateY < 1 || candidateY >= height - 1) {
        continue;
      }
      const node = { x: targetX, y: candidateY };
      if (standNodeBlockedByHazard(node, hazardZones)) {
        continue;
      }
      if (tiles[candidateY][targetX] === TILE_TYPES.EMPTY) {
        tiles[candidateY][targetX] = TILE_TYPES.PLATFORM;
      }
      if (tiles[candidateY - 1][targetX] === TILE_TYPES.EMPTY) {
        return node;
      }
    }
  }
  placeSafetyPlatform(tiles, width, height, targetX, desiredY, 1);
  return { x: targetX, y: desiredY };
};

const buildReachabilityTargets = (goal, itemSpawns, questionBlocks, checkpoints) => {
  const targets = [{ x: goal.x, y: goal.y + 1 }];
  for (const item of itemSpawns) {
    targets.push({ x: item.x, y: item.y + 1 });
  }
  for (const block of questionBlocks) {
    targets.push({ x: block.tx, y: block.ty + 2 });
  }
  for (const checkpoint of checkpoints) {
    targets.push({ x: checkpoint.x, y: checkpoint.y + 1 });
  }
  return targets;
};

const repairLevelReachability = ({
  tiles,
  width,
  height,
  playerSpawn,
  goal,
  itemSpawns,
  questionBlocks,
  checkpoints,
  hazardZones
}) => {
  const targets = buildReachabilityTargets(goal, itemSpawns, questionBlocks, checkpoints);
  const connectTarget = (targetX, targetY) => {
    let guard = 0;
    while (guard < 6) {
      guard += 1;
      const { nodes, visited } = computeReachableStandNodeKeysFromTiles(
        tiles,
        width,
        height,
        playerSpawn,
        hazardZones
      );
      const targetNode = ensureStandNode(tiles, width, height, targetX, targetY, hazardZones);
      const resolvedTarget = closestNodes(nodes, targetNode.x, targetNode.y, 2, 2)[0] || targetNode;
      if (visited.has(tileKey(resolvedTarget.x, resolvedTarget.y))) {
        return;
      }
      const reachableNodes = nodes.filter((node) => visited.has(tileKey(node.x, node.y)));
      if (!reachableNodes.length) {
        break;
      }
      const startNode = findNearestNode(reachableNodes, resolvedTarget.x, resolvedTarget.y);
      if (!startNode) {
        break;
      }
      injectSafetyRoute(
        tiles,
        width,
        height,
        { x: startNode.x, y: startNode.y - 1 },
        { x: resolvedTarget.x, y: resolvedTarget.y - 1 }
      );
    }
  };

  for (const target of targets) {
    connectTarget(target.x, target.y);
  }

  let islandGuard = 0;
  while (islandGuard < 40) {
    islandGuard += 1;
    const { nodes, visited } = computeReachableStandNodeKeysFromTiles(
      tiles,
      width,
      height,
      playerSpawn,
      hazardZones
    );
    const unreachable = nodes.filter((node) => !visited.has(tileKey(node.x, node.y)));
    if (!unreachable.length) {
      break;
    }
    const reachableNodes = nodes.filter((node) => visited.has(tileKey(node.x, node.y)));
    if (!reachableNodes.length) {
      break;
    }

    const targetNode = findNearestNode(unreachable, playerSpawn.x, playerSpawn.y + 1);
    const startNode = findNearestNode(reachableNodes, targetNode.x, targetNode.y);
    if (!targetNode || !startNode) {
      break;
    }

    injectSafetyRoute(
      tiles,
      width,
      height,
      { x: startNode.x, y: startNode.y - 1 },
      { x: targetNode.x, y: targetNode.y - 1 }
    );
  }
};

const normalizeSpawnList = (list, fallbackType) => {
  if (!Array.isArray(list)) {
    return [];
  }
  return list.map((entry) => {
    const normalized = {
      type: String(entry.type || fallbackType),
      x: Math.max(0, Math.floor(numberOrFallback(entry.x, 0))),
      y: Math.max(0, Math.floor(numberOrFallback(entry.y, 0))),
      patrol: Math.max(1, Math.floor(numberOrFallback(entry.patrol, 4))),
      variant: entry.variant ? String(entry.variant) : null
    };

    if (fallbackType === "walker") {
      normalized.health = Math.max(1, Math.floor(numberOrFallback(entry.health, 1)));
      const speed = numberOrFallback(entry.speed, 0);
      if (speed > 0) {
        normalized.speed = Math.max(20, speed);
      }
      const chargeSpeed = numberOrFallback(entry.chargeSpeed, 0);
      if (chargeSpeed > 0) {
        normalized.chargeSpeed = Math.max(24, chargeSpeed);
      }
      const contactDamage = numberOrFallback(entry.contactDamage, 0);
      if (contactDamage > 0) {
        normalized.contactDamage = Math.max(1, Math.floor(contactDamage));
      }
      normalized.name = String(entry.name || "");
    }

    return normalized;
  });
};

const normalizeCheckpointList = (list, width, height) => {
  if (!Array.isArray(list)) {
    return [];
  }
  return list.map((entry, index) => ({
    id: String(entry.id || `checkpoint-${index + 1}`),
    label: String(entry.label || `Checkpoint ${index + 1}`),
    x: clampInt(numberOrFallback(entry.x, 0), 0, width - 1),
    y: clampInt(numberOrFallback(entry.y, Math.max(0, height - 3)), 0, height - 1),
    active: false
  }));
};

const normalizeWindZones = (list, width, height) => {
  if (!Array.isArray(list)) {
    return [];
  }
  return list.map((entry, index) => ({
    id: String(entry.id || `wind-${index + 1}`),
    label: String(entry.label || "Gust"),
    x: clampInt(numberOrFallback(entry.x, 0), 0, width - 1),
    y: clampInt(numberOrFallback(entry.y, 0), 0, height - 1),
    w: Math.max(1, Math.floor(numberOrFallback(entry.w, 1))),
    h: Math.max(1, Math.floor(numberOrFallback(entry.h, 1))),
    forceX: numberOrFallback(entry.forceX, 0),
    forceY: numberOrFallback(entry.forceY, 0)
  }));
};

const normalizeHazardZones = (list, width, height) => {
  if (!Array.isArray(list)) {
    return [];
  }
  return list.map((entry, index) => ({
    id: String(entry.id || `hazard-${index + 1}`),
    label: String(entry.label || entry.type || "Hazard"),
    type: String(entry.type || "hazard"),
    x: clampInt(numberOrFallback(entry.x, 0), 0, width - 1),
    y: clampInt(numberOrFallback(entry.y, 0), 0, height - 1),
    w: Math.max(1, Math.floor(numberOrFallback(entry.w, 1))),
    h: Math.max(1, Math.floor(numberOrFallback(entry.h, 1))),
    message: String(entry.message || "Environmental hazard.")
  }));
};

const normalizeLevel = (rawLevel, levelIndex = 0) => {
  const mapRows = Array.isArray(rawLevel.map) ? rawLevel.map.map((row) => String(row)) : [];
  const height = Math.max(1, mapRows.length);
  const width = Math.max(1, ...mapRows.map((row) => row.length));
  const tileSize = Math.max(8, Math.floor(numberOrFallback(rawLevel.tileSize, TILE_SIZE)));

  const tiles = Array.from({ length: height }, (_, y) => {
    const row = mapRows[y] || "";
    return Array.from({ length: width }, (_, x) => CHAR_TILE_MAP[row[x]] || TILE_TYPES.EMPTY);
  });

  const rewardMap = new Map();
  const rewards = Array.isArray(rawLevel.questionRewards) ? rawLevel.questionRewards : [];
  for (const reward of rewards) {
    const tx = Math.max(0, Math.floor(numberOrFallback(reward.x, -1)));
    const ty = Math.max(0, Math.floor(numberOrFallback(reward.y, -1)));
    if (tx < 0 || ty < 0) {
      continue;
    }
    const rewardType = reward.type === "mushroom" ? "mushroom" : "coin";
    rewardMap.set(tileKey(tx, ty), rewardType);
  }

  const playerSpawn = {
    x: Math.max(0, Math.floor(numberOrFallback(rawLevel.playerSpawn?.x, 2))),
    y: Math.max(0, Math.floor(numberOrFallback(rawLevel.playerSpawn?.y, Math.max(0, height - 3))))
  };

  const goal = {
    x: Math.max(0, Math.floor(numberOrFallback(rawLevel.goal?.x, Math.max(0, width - 3)))),
    y: Math.max(0, Math.floor(numberOrFallback(rawLevel.goal?.y, Math.max(0, height - 4))))
  };

  const questionBlocks = [];
  for (let ty = 0; ty < height; ty += 1) {
    for (let tx = 0; tx < width; tx += 1) {
      if (tiles[ty][tx] !== TILE_TYPES.QUESTION) {
        continue;
      }
      questionBlocks.push({
        tx,
        ty,
        used: false,
        reward: rewardMap.get(tileKey(tx, ty)) || "coin"
      });
    }
  }

  const itemSpawns = normalizeSpawnList(rawLevel.itemSpawns, "coin");
  const enemySpawns = normalizeSpawnList(rawLevel.enemySpawns, "walker");
  const checkpoints = normalizeCheckpointList(rawLevel.checkpoints, width, height);
  const windZones = normalizeWindZones(rawLevel.windZones, width, height);
  const hazardZones = normalizeHazardZones(rawLevel.hazardZones, width, height);

  const layoutType = ["horizontal", "vertical", "hybrid"].includes(rawLevel.layoutType)
    ? rawLevel.layoutType
    : "horizontal";
  const visualStyle = VISUAL_STYLES.has(rawLevel.visualStyle)
    ? rawLevel.visualStyle
    : "classic";

  const rawBoss = rawLevel.boss && typeof rawLevel.boss === "object" ? rawLevel.boss : null;
  const boss = rawBoss
    ? {
      enabled: true,
      name: String(rawBoss.name || "Arena Warden"),
      variant: String(rawBoss.variant || "juggernaut"),
      maxHealth: Math.max(4, Math.floor(numberOrFallback(rawBoss.maxHealth, 16))),
      contactDamage: Math.max(1, Math.floor(numberOrFallback(rawBoss.contactDamage, 1))),
      projectileDamage: Math.max(1, Math.floor(numberOrFallback(rawBoss.projectileDamage, 1))),
      stompDamage: Math.max(1, Math.floor(numberOrFallback(rawBoss.stompDamage, 2))),
      finalBoss: Boolean(rawBoss.finalBoss)
    }
    : null;

  const coinFromItems = itemSpawns.filter((item) => item.type === "coin").length;
  const coinFromQuestionBlocks = questionBlocks.filter((block) => block.reward === "coin").length;
  const biome = String(rawLevel.biome || DEFAULT_BIOME_BY_STYLE[visualStyle] || "Frontier Plains");
  const subtitle = String(rawLevel.subtitle || "");
  const difficulty = clampInt(numberOrFallback(rawLevel.difficulty, 1 + Math.floor(levelIndex / 4)), 1, 5);
  const mechanics = Array.isArray(rawLevel.mechanics) && rawLevel.mechanics.length
    ? rawLevel.mechanics.map((mechanic) => String(mechanic))
    : [...(DEFAULT_MECHANICS_BY_STYLE[visualStyle] || DEFAULT_MECHANICS_BY_STYLE.classic)];

  injectSafetyRoute(tiles, width, height, playerSpawn, goal);
  repairLevelReachability({
    tiles,
    width,
    height,
    playerSpawn,
    goal,
    itemSpawns,
    questionBlocks,
    checkpoints,
    hazardZones
  });

  return {
    id: String(rawLevel.id || "platformer-level"),
    name: String(rawLevel.name || "Arcade Level"),
    biome,
    subtitle,
    difficulty,
    mechanics,
    theme: rawLevel.theme === "dusk" ? "dusk" : "day",
    visualStyle,
    layoutType,
    isBossLevel: Boolean(boss),
    isFinalBossLevel: Boolean(boss?.finalBoss),
    boss,
    timeLimit: Math.max(30, Math.floor(numberOrFallback(rawLevel.timeLimit, 120))),
    goalRequiresAllCoins: Boolean(rawLevel.goalRequiresAllCoins),
    tileSize,
    width,
    height,
    tiles,
    playerSpawn,
    goal,
    checkpoints,
    windZones,
    hazardZones,
    itemSpawns,
    enemySpawns,
    questionBlocks,
    coinTarget: coinFromItems + coinFromQuestionBlocks
  };
};

const normalizeCatalogEntry = (rawLevel, index) => {
  const visualStyle = VISUAL_STYLES.has(rawLevel.visualStyle)
    ? rawLevel.visualStyle
    : "classic";
  const layoutType = ["horizontal", "vertical", "hybrid"].includes(rawLevel.layoutType)
    ? rawLevel.layoutType
    : "horizontal";
  const rawBoss = rawLevel.boss && typeof rawLevel.boss === "object" ? rawLevel.boss : null;
  const mechanics = Array.isArray(rawLevel.mechanics) && rawLevel.mechanics.length
    ? rawLevel.mechanics.map((mechanic) => String(mechanic))
    : [...(DEFAULT_MECHANICS_BY_STYLE[visualStyle] || DEFAULT_MECHANICS_BY_STYLE.classic)];

  return {
    index,
    id: String(rawLevel.id || "platformer-level"),
    name: String(rawLevel.name || "Arcade Level"),
    biome: String(rawLevel.biome || DEFAULT_BIOME_BY_STYLE[visualStyle] || "Frontier Plains"),
    difficulty: clampInt(numberOrFallback(rawLevel.difficulty, 1 + Math.floor(index / 4)), 1, 5),
    mechanics,
    visualStyle,
    layoutType,
    isBossLevel: Boolean(rawBoss),
    isFinalBossLevel: Boolean(rawBoss?.finalBoss)
  };
};

const LEVEL_CATALOG = LEVELS.map((level, index) => normalizeCatalogEntry(level, index));
const LEVEL_TEMPLATE_CACHE = new Map();

export const getLevelCount = () => LEVELS.length;

export const getLevelTemplate = (index) => {
  if (!LEVELS.length) {
    throw new Error("No level definitions found.");
  }
  const safeIndex = ((Math.floor(index) % LEVELS.length) + LEVELS.length) % LEVELS.length;
  if (!LEVEL_TEMPLATE_CACHE.has(safeIndex)) {
    LEVEL_TEMPLATE_CACHE.set(safeIndex, normalizeLevel(LEVELS[safeIndex], safeIndex));
  }
  return LEVEL_TEMPLATE_CACHE.get(safeIndex);
};

export const createLevelRuntime = (index) => {
  const template = getLevelTemplate(index);
  return {
    index,
    id: template.id,
    name: template.name,
    biome: template.biome,
    subtitle: template.subtitle,
    difficulty: template.difficulty,
    mechanics: [...template.mechanics],
    theme: template.theme,
    visualStyle: template.visualStyle,
    layoutType: template.layoutType,
    isBossLevel: template.isBossLevel,
    isFinalBossLevel: template.isFinalBossLevel,
    boss: template.boss ? { ...template.boss } : null,
    timeLimit: template.timeLimit,
    goalRequiresAllCoins: template.goalRequiresAllCoins,
    tileSize: template.tileSize,
    width: template.width,
    height: template.height,
    tiles: template.tiles,
    playerSpawn: { ...template.playerSpawn },
    goal: { ...template.goal },
    checkpoints: template.checkpoints.map((checkpoint) => ({ ...checkpoint })),
    windZones: template.windZones.map((zone) => ({ ...zone })),
    hazardZones: template.hazardZones.map((zone) => ({ ...zone })),
    enemySpawns: template.enemySpawns.map((spawn) => ({ ...spawn })),
    itemSpawns: template.itemSpawns.map((spawn) => ({ ...spawn })),
    questionBlocks: new Map(template.questionBlocks.map((block) => [tileKey(block.tx, block.ty), { ...block }])),
    coinTarget: template.coinTarget
  };
};

export const getLevelCatalog = () =>
  LEVEL_CATALOG.map((entry) => ({
    ...entry,
    mechanics: [...entry.mechanics]
  }));

export const getTileType = (level, tx, ty) => {
  if (!level || tx < 0 || ty < 0 || tx >= level.width || ty >= level.height) {
    return TILE_TYPES.EMPTY;
  }
  return level.tiles[ty][tx] || TILE_TYPES.EMPTY;
};

export const isSolidTile = isSolidTileInternal;
export const isOneWayTile = isOneWayTileInternal;
export const isSupportTile = isSupportTileInternal;

export const getWorldWidth = (level) => level.width * level.tileSize;
export const getWorldHeight = (level) => level.height * level.tileSize;

export const spawnToWorldPosition = (level, spawn, width, height) => ({
  x: spawn.x * level.tileSize + (level.tileSize - width) / 2,
  y: spawn.y * level.tileSize + (level.tileSize - height)
});

export const checkpointToWorldRect = (level, checkpoint) => {
  const width = 20;
  const height = 56;
  const baseX = checkpoint.x * level.tileSize + level.tileSize * 0.5 - width * 0.5;
  const supportTop = (checkpoint.y + 1) * level.tileSize;
  return {
    x: baseX,
    y: supportTop - height,
    w: width,
    h: height
  };
};

export const zoneToWorldRect = (level, zone) => ({
  x: zone.x * level.tileSize,
  y: zone.y * level.tileSize,
  w: zone.w * level.tileSize,
  h: zone.h * level.tileSize
});

export const goalToWorldRect = (level) => {
  const width = 26;
  const height = 66;
  return {
    x: level.goal.x * level.tileSize + (level.tileSize - width) / 2,
    y: level.goal.y * level.tileSize + (level.tileSize - height),
    w: width,
    h: height
  };
};

export const analyzeLevelReachability = (level) => {
  const { nodes, visited } = computeReachableStandNodeKeysFromTiles(
    level.tiles,
    level.width,
    level.height,
    level.playerSpawn,
    level.hazardZones || []
  );
  const questionBlocks = Array.from(level.questionBlocks?.values?.() || []);
  return {
    nodes,
    reachableKeys: visited,
    unreachableNodes: nodes.filter((node) => !visited.has(tileKey(node.x, node.y))),
    targets: buildReachabilityTargets(
      level.goal,
      level.itemSpawns || [],
      questionBlocks,
      level.checkpoints || []
    )
  };
};
