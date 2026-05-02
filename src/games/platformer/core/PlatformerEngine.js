import {
  CAMERA_SETTINGS,
  DEFAULT_LIVES,
  DEFAULT_MESSAGE,
  FIXED_STEP_MS,
  FIXED_STEP_SECONDS,
  ITEM_SETTINGS,
  MAX_FRAME_MS,
  PLATFORMER_ROUTE_LENGTH,
  PLAYER_SETTINGS,
  SCORE_VALUES,
  SCREENS,
  SNAPSHOT_INTERVAL_MS,
  VIEWPORT_HEIGHT,
  VIEWPORT_WIDTH
} from "../config";
import ArcadeAudio from "../audio/ArcadeAudio";
import {
  applyEnemyDamage,
  createEnemyFromSpawn,
  defeatEnemy,
  isBossEnemy,
  updateEnemy
} from "../entities/enemy";
import { createItemFromSpawn, createQuestionReward, updateItem } from "../entities/item";
import {
  applyHorizontalInput,
  applyVerticalForces,
  canShootProjectile,
  createPlayer,
  markProjectileFired,
  queueJump,
  resetPlayer,
  setPlayerAnimation,
  setPlayerGrounded,
  tickPlayerTimers,
  tryStartJump
} from "../entities/player";
import { createProjectile, updateProjectile } from "../entities/projectile";
import InputController from "../input/InputController";
import {
  checkpointToWorldRect,
  TILE_TYPES,
  createLevelRuntime,
  getLevelCatalog,
  getLevelTemplate,
  getTileType,
  getWorldHeight,
  getWorldWidth,
  goalToWorldRect,
  spawnToWorldPosition,
  tileKey,
  zoneToWorldRect
} from "../levels/levelLoader";
import { aabbIntersects, clamp, moveEntityWithWorldCollisions } from "../physics/collision";
import Renderer from "../render/Renderer";
import { buildHudSnapshot, createInitialSnapshot } from "../ui/hudModel";

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return numeric;
};

const RUN_LEVEL_COUNT = PLATFORMER_ROUTE_LENGTH;

export const shouldGrantBossEntryPower = (level, player) =>
  Boolean(level?.isBossLevel && (player?.powerLevel || 0) <= 0);

const pickRandom = (list) => {
  if (!Array.isArray(list) || !list.length) {
    return null;
  }
  return list[Math.floor(Math.random() * list.length)];
};

const shuffle = (list) => {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

export default class PlatformerEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.onSnapshot = typeof options.onSnapshot === "function" ? options.onSnapshot : () => {};
    this.renderer = new Renderer(canvas);
    this.input = new InputController();
    this.audio = new ArcadeAudio();
    this.levelCatalog = getLevelCatalog();
    this.runCounter = 0;

    const initialRun = this.buildRunPlan();

    this.state = {
      ...createInitialSnapshot(),
      level: null,
      catalogLevelCount: this.levelCatalog.length,
      levelCount: Math.max(1, initialRun.length),
      goalRect: { x: 0, y: 0, w: 26, h: 66 },
      player: createPlayer({ x: 0, y: 0 }),
      enemies: [],
      items: [],
      projectiles: [],
      effects: [],
      camera: { x: 0, y: 0 },
      runLevelIndices: initialRun,
      runLevelIds: initialRun.map((levelIndex) => this.levelCatalog[levelIndex]?.id || `level-${levelIndex}`),
      runStages: initialRun.map((levelIndex) => ({
        id: this.levelCatalog[levelIndex]?.id || `level-${levelIndex}`,
        name: this.levelCatalog[levelIndex]?.name || `Stage ${levelIndex + 1}`,
        biome: this.levelCatalog[levelIndex]?.biome || "Frontier Plains",
        difficulty: this.levelCatalog[levelIndex]?.difficulty || 1,
        isBossLevel: Boolean(this.levelCatalog[levelIndex]?.isBossLevel)
      })),
      runBossLevelCount: initialRun.filter((levelIndex) => this.levelCatalog[levelIndex]?.isBossLevel).length,
      levelTemplateIndex: initialRun[0] ?? 0,
      levelLayout: "horizontal",
      isBossLevel: false,
      bossEntryPowerGranted: false,
      activeBoss: null,
      activeCheckpointId: null,
      activeWind: null,
      respawnPoint: { x: 0, y: 0 },
      transitionTimer: 0,
      elapsedMs: 0
    };

    this.input.attach(window);
    this.lastFrameMs = 0;
    this.accumulatorMs = 0;
    this.lastSnapshotAtMs = 0;
    this.running = true;
    this.rafId = null;

    this.loop = this.loop.bind(this);

    this.loadLevel(0, { resetRun: true, keepPower: false, preserveLives: false });
    this.state.screen = SCREENS.START;
    this.state.message = DEFAULT_MESSAGE;
    this.publishSnapshot(true);
    this.render();
    this.scheduleLevelPrewarm(initialRun.slice(1));
    this.rafId = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.input.destroy();
    this.audio.destroy();
  }

  setVirtualAxis(axis) {
    this.input.setVirtualAxis(axis);
  }

  setVirtualJumpHeld(value) {
    this.input.setVirtualJumpHeld(value);
  }

  setVirtualDownHeld(value) {
    this.input.setVirtualDownHeld(value);
  }

  jump() {
    this.input.queueJump();
  }

  action() {
    this.input.queueAction();
  }

  start() {
    this.input.queueStart();
  }

  restart() {
    this.input.queueRestart();
  }

  advanceTime(ms) {
    const totalMs = Math.max(0, toNumber(ms, 0));
    const steps = Math.max(1, Math.round(totalMs / FIXED_STEP_MS));
    for (let i = 0; i < steps; i += 1) {
      this.step(FIXED_STEP_SECONDS);
    }
    this.render();
    this.publishSnapshot(true);
    return Promise.resolve();
  }

  loop(timestampMs) {
    if (!this.running) {
      return;
    }

    if (!this.lastFrameMs) {
      this.lastFrameMs = timestampMs;
    }
    const deltaMs = clamp(timestampMs - this.lastFrameMs, 0, MAX_FRAME_MS);
    this.lastFrameMs = timestampMs;
    this.accumulatorMs += deltaMs;

    while (this.accumulatorMs >= FIXED_STEP_MS) {
      this.step(FIXED_STEP_SECONDS);
      this.accumulatorMs -= FIXED_STEP_MS;
    }

    this.render();
    this.publishSnapshot(false);
    this.rafId = requestAnimationFrame(this.loop);
  }

  buildRunPlan() {
    const catalog = Array.isArray(this.levelCatalog) ? this.levelCatalog : [];
    if (!catalog.length) {
      return [0];
    }

    const finalBossLevel = catalog.find((level) => level.isFinalBossLevel) ||
      catalog.find((level) => level.isBossLevel) ||
      catalog[catalog.length - 1];

    const nonFinalLevels = catalog.filter((level) => level.index !== finalBossLevel.index);
    const earlyBossCandidates = nonFinalLevels.filter((level) => level.isBossLevel);
    const pureVerticalCandidates = nonFinalLevels.filter((level) => level.layoutType === "vertical");
    const verticalCandidates = pureVerticalCandidates.length
      ? pureVerticalCandidates
      : nonFinalLevels.filter((level) => level.layoutType === "vertical" || level.layoutType === "hybrid");
    const windyCandidates = nonFinalLevels.filter((level) => (level.mechanics || []).some((mechanic) => /wind/i.test(mechanic)));
    const springCandidates = nonFinalLevels.filter((level) => (level.mechanics || []).some((mechanic) => /spring/i.test(mechanic)));
    const toxicCandidates = nonFinalLevels.filter((level) => (level.mechanics || []).some((mechanic) => /hazard|checkpoint/i.test(mechanic)));

    const prefixTarget = Math.max(1, RUN_LEVEL_COUNT - 1);
    const selected = [];

    const earlyBosses = shuffle(earlyBossCandidates).slice(0, Math.min(2, earlyBossCandidates.length));
    for (const earlyBoss of earlyBosses) {
      selected.push(earlyBoss.index);
    }

    const verticalLevel = pickRandom(
      verticalCandidates.filter((level) => !selected.includes(level.index))
    );
    if (verticalLevel) {
      selected.push(verticalLevel.index);
    }

    const curatedCandidates = [windyCandidates, springCandidates, toxicCandidates];
    for (const candidateList of curatedCandidates) {
      const selectedLevel = pickRandom(
        candidateList.filter((level) => !selected.includes(level.index))
      );
      if (selectedLevel) {
        selected.push(selectedLevel.index);
      }
    }

    const fallbackOrder = shuffle(nonFinalLevels).map((level) => level.index);
    for (const index of fallbackOrder) {
      if (selected.length >= prefixTarget) {
        break;
      }
      if (!selected.includes(index)) {
        selected.push(index);
      }
    }

    if (!selected.length) {
      selected.push(finalBossLevel.index);
    }

    const prefix = shuffle(selected).slice(0, prefixTarget);
    while (prefix.length < prefixTarget) {
      prefix.push(prefix[prefix.length - 1] ?? finalBossLevel.index);
    }

    return [...prefix, finalBossLevel.index].slice(0, RUN_LEVEL_COUNT);
  }

  applyRunPlan(runLevelIndices) {
    const normalized = Array.isArray(runLevelIndices) && runLevelIndices.length
      ? [...runLevelIndices]
      : [0];

    this.state.runLevelIndices = normalized;
    this.state.levelCount = normalized.length;
    this.state.runLevelIds = normalized.map(
      (levelIndex) => this.levelCatalog[levelIndex]?.id || `level-${levelIndex}`
    );
    this.state.runStages = normalized.map((levelIndex) => ({
      id: this.levelCatalog[levelIndex]?.id || `level-${levelIndex}`,
      name: this.levelCatalog[levelIndex]?.name || `Stage ${levelIndex + 1}`,
      biome: this.levelCatalog[levelIndex]?.biome || "Frontier Plains",
      difficulty: this.levelCatalog[levelIndex]?.difficulty || 1,
      isBossLevel: Boolean(this.levelCatalog[levelIndex]?.isBossLevel)
    }));
    this.state.runBossLevelCount = normalized.filter(
      (levelIndex) => this.levelCatalog[levelIndex]?.isBossLevel
    ).length;
  }

  resolveTemplateIndex(runLevelIndex) {
    const safeRunIndex = (
      (Math.floor(runLevelIndex) % this.state.levelCount) + this.state.levelCount
    ) % this.state.levelCount;
    return this.state.runLevelIndices[safeRunIndex] ?? safeRunIndex;
  }

  scheduleLevelPrewarm(levelIndices) {
    const queue = [...new Set(Array.isArray(levelIndices) ? levelIndices : [])]
      .filter((index) => Number.isFinite(index));
    if (!queue.length || typeof window === "undefined") {
      return;
    }

    const schedule = typeof window.requestIdleCallback === "function"
      ? (callback) => window.requestIdleCallback(callback, { timeout: 700 })
      : (callback) => window.setTimeout(callback, 16);

    const prewarmNext = () => {
      if (!this.running || !queue.length) {
        return;
      }
      getLevelTemplate(queue.shift());
      if (queue.length) {
        schedule(prewarmNext);
      }
    };

    schedule(prewarmNext);
  }

  refreshActiveBoss() {
    const activeBoss = this.state.enemies.find((enemy) => isBossEnemy(enemy)) || null;
    this.state.activeBoss = activeBoss
      ? {
        id: activeBoss.id,
        name: activeBoss.name || "Boss",
        variant: activeBoss.variant || "juggernaut",
        health: Math.max(0, Math.floor(activeBoss.health || 0)),
        maxHealth: Math.max(1, Math.floor(activeBoss.maxHealth || 1))
      }
      : null;
  }

  beginNewRun() {
    this.runCounter += 1;
    this.applyRunPlan(this.buildRunPlan());
    this.loadLevel(0, { resetRun: true, keepPower: false, preserveLives: false });
    this.scheduleLevelPrewarm(this.state.runLevelIndices.slice(1));
    this.state.screen = SCREENS.PLAYING;
    const bossHint = this.state.bossEntryPowerGranted
      ? " Auto fire power granted for this boss stage."
      : "";
    this.state.message = `Run started. Clear ${this.state.levelCount} engineered sectors and defeat every boss.${bossHint}`;
  }

  loadLevel(index, options = {}) {
    const levelIndex = ((Math.floor(index) % this.state.levelCount) + this.state.levelCount) % this.state.levelCount;
    const templateIndex = this.resolveTemplateIndex(levelIndex);
    const level = createLevelRuntime(templateIndex);
    const shouldResetRun = Boolean(options.resetRun);
    const shouldPreserveLives = Boolean(options.preserveLives);

    if (shouldResetRun) {
      this.state.score = 0;
      this.state.lives = DEFAULT_LIVES;
    } else if (!shouldPreserveLives) {
      this.state.lives = Math.max(1, this.state.lives || DEFAULT_LIVES);
    }

    this.state.level = level;
    this.state.levelIndex = levelIndex;
    this.state.levelTemplateIndex = templateIndex;
    this.state.levelName = level.name;
    this.state.levelLayout = level.layoutType || "horizontal";
    this.state.catalogLevelCount = this.levelCatalog.length;
    this.state.isBossLevel = Boolean(level.isBossLevel);
    this.state.timeLeft = level.timeLimit;
    this.state.timeLimit = level.timeLimit;
    this.state.coinsCollected = 0;
    this.state.coinsTotal = Math.max(0, level.coinTarget);
    this.state.goalRect = goalToWorldRect(level);
    this.state.camera = { x: 0, y: 0 };
    this.state.transitionTimer = 0;
    this.state.activeCheckpointId = null;
    this.state.activeWind = null;

    const spawn = spawnToWorldPosition(level, level.playerSpawn, this.state.player.w, this.state.player.h);
    this.state.respawnPoint = { ...spawn };
    resetPlayer(this.state.player, spawn, {
      keepPower: Boolean(options.keepPower),
      invulnerable: false
    });
    this.state.bossEntryPowerGranted = false;
    if (shouldGrantBossEntryPower(level, this.state.player)) {
      this.state.player.powerLevel = 1;
      this.state.bossEntryPowerGranted = true;
    }

    this.state.enemies = level.enemySpawns.map((spawnData, enemyIndex) =>
      createEnemyFromSpawn(level, spawnData, `enemy-${level.id}-${enemyIndex}`)
    );
    this.state.items = level.itemSpawns.map((spawnData, itemIndex) =>
      createItemFromSpawn(level, spawnData, `item-${level.id}-${itemIndex}`)
    );

    if (level.isBossLevel && !this.state.enemies.some((enemy) => enemy.type === "boss")) {
      const fallbackSpawn = {
        type: "boss",
        x: Math.max(3, level.goal.x - 6),
        y: Math.max(2, level.goal.y),
        patrol: 6,
        health: level.boss?.maxHealth,
        name: level.boss?.name || "Arena Warden",
        variant: level.boss?.variant || "juggernaut"
      };
      this.state.enemies.push(
        createEnemyFromSpawn(level, fallbackSpawn, `enemy-${level.id}-boss-fallback`)
      );
    }

    this.state.projectiles = [];
    this.state.effects = [];
    this.refreshActiveBoss();
  }

  restartCurrentLevel() {
    if (this.state.screen === SCREENS.GAME_OVER || this.state.screen === SCREENS.GAME_COMPLETE) {
      this.beginNewRun();
      return;
    }
    if (this.state.screen === SCREENS.START) {
      this.beginNewRun();
      return;
    }

    const keepPower = this.state.player.powerLevel > 0;
    this.loadLevel(this.state.levelIndex, {
      resetRun: false,
      keepPower,
      preserveLives: true
    });
    this.state.screen = SCREENS.PLAYING;
    const bossHint = this.state.bossEntryPowerGranted
      ? " Auto fire power granted for this boss stage."
      : "";
    this.state.message = `Restarted ${this.state.level.name}.${bossHint}`;
  }

  spawnBurst(x, y, options = {}) {
    const count = Math.max(1, Math.floor(toNumber(options.count, 6)));
    const size = Math.max(1, Math.floor(toNumber(options.size, 3)));
    const speedMin = toNumber(options.speedMin, 70);
    const speedMax = toNumber(options.speedMax, 180);
    const lifeMin = toNumber(options.lifeMin, 0.18);
    const lifeMax = toNumber(options.lifeMax, 0.46);
    const gravity = toNumber(options.gravity, 520);
    const color = options.color || "rgba(255,255,255,__ALPHA__)";
    const upwardBias = toNumber(options.upwardBias, 0.4);

    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = speedMin + Math.random() * Math.max(0, speedMax - speedMin);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - speed * upwardBias;
      const maxLife = lifeMin + Math.random() * Math.max(0, lifeMax - lifeMin);
      this.state.effects.push({
        x,
        y,
        vx,
        vy,
        gravity,
        size: size + (Math.random() > 0.66 ? 1 : 0),
        life: maxLife,
        maxLife,
        color
      });
    }
  }

  updateEffects(dt) {
    if (!this.state.effects.length) {
      return;
    }

    for (const effect of this.state.effects) {
      effect.life -= dt;
      if (effect.life <= 0) {
        continue;
      }
      effect.vx *= 0.985;
      effect.vy += effect.gravity * dt;
      effect.x += effect.vx * dt;
      effect.y += effect.vy * dt;
    }

    this.state.effects = this.state.effects.filter((effect) => effect.life > 0);
  }

  sampleWindForEntity(entity) {
    if (!this.state.level || !entity) {
      return null;
    }
    const zones = Array.isArray(this.state.level.windZones) ? this.state.level.windZones : [];
    if (!zones.length) {
      return null;
    }

    let totalForceX = 0;
    let totalForceY = 0;
    let dominantZone = null;
    for (const zone of zones) {
      const rect = zoneToWorldRect(this.state.level, zone);
      if (!aabbIntersects(entity, rect)) {
        continue;
      }
      totalForceX += zone.forceX || 0;
      totalForceY += zone.forceY || 0;
      if (!dominantZone || Math.abs(zone.forceX || 0) + Math.abs(zone.forceY || 0) >
        Math.abs(dominantZone.forceX || 0) + Math.abs(dominantZone.forceY || 0)) {
        dominantZone = zone;
      }
    }

    if (!dominantZone) {
      return null;
    }
    return {
      label: dominantZone.label || "Gust",
      forceX: totalForceX,
      forceY: totalForceY
    };
  }

  applyWindToEntity(entity, dt, modifier = 1) {
    const wind = this.sampleWindForEntity(entity);
    if (!wind || !entity) {
      return null;
    }
    entity.vx += wind.forceX * dt * modifier;
    entity.vy += wind.forceY * dt * modifier;
    return wind;
  }

  handleSpringTile(collision, controls) {
    if (!collision?.landed || !this.state.level) {
      return;
    }
    const footX = this.state.player.x + this.state.player.w * 0.5;
    const footY = this.state.player.y + this.state.player.h + 2;
    const tx = Math.floor(footX / this.state.level.tileSize);
    const ty = Math.floor(footY / this.state.level.tileSize);
    const tileType = getTileType(this.state.level, tx, ty);
    if (tileType !== TILE_TYPES.SPRING) {
      return;
    }

    const boostVelocity = controls.jumpHeld
      ? PLAYER_SETTINGS.superSpringBoostVelocity
      : PLAYER_SETTINGS.springBoostVelocity;
    this.state.player.vy = boostVelocity;
    this.state.player.onGround = false;
    this.state.message = `Spring boost engaged in ${this.state.level.biome}.`;
    this.audio.play("jump");
    this.spawnBurst(this.state.player.x + this.state.player.w * 0.5, this.state.player.y + this.state.player.h, {
      count: 12,
      color: "rgba(132,255,240,__ALPHA__)",
      speedMin: 70,
      speedMax: 180,
      lifeMin: 0.16,
      lifeMax: 0.36,
      gravity: 380
    });
  }

  updateCheckpoints() {
    if (!this.state.level || !Array.isArray(this.state.level.checkpoints)) {
      return;
    }
    for (const checkpoint of this.state.level.checkpoints) {
      const rect = checkpointToWorldRect(this.state.level, checkpoint);
      if (!aabbIntersects(this.state.player, rect)) {
        continue;
      }
      if (checkpoint.active) {
        continue;
      }
      checkpoint.active = true;
      this.state.activeCheckpointId = checkpoint.id;
      this.state.respawnPoint = spawnToWorldPosition(
        this.state.level,
        { x: checkpoint.x, y: checkpoint.y },
        this.state.player.w,
        this.state.player.h
      );
      this.state.message = `${checkpoint.label} secured.`;
      this.audio.play("coin");
      this.spawnBurst(rect.x + rect.w * 0.5, rect.y + rect.h * 0.35, {
        count: 16,
        color: "rgba(130,225,255,__ALPHA__)",
        speedMin: 80,
        speedMax: 190,
        lifeMin: 0.18,
        lifeMax: 0.44
      });
    }
  }

  handleHazards() {
    if (!this.state.level || !Array.isArray(this.state.level.hazardZones)) {
      return;
    }
    for (const hazard of this.state.level.hazardZones) {
      const rect = zoneToWorldRect(this.state.level, hazard);
      if (aabbIntersects(this.state.player, rect)) {
        this.loseLife(hazard.message || `${hazard.label || "Hazard"} hit.`);
        return;
      }
      for (const enemy of this.state.enemies) {
        if (!enemy.active || enemy.type === "boss") {
          continue;
        }
        if (aabbIntersects(enemy, rect)) {
          defeatEnemy(enemy);
        }
      }
      for (const projectile of this.state.projectiles) {
        if (projectile.active && aabbIntersects(projectile, rect)) {
          projectile.active = false;
        }
      }
    }
  }

  handleQuestionBlockHit(tx, ty) {
    const level = this.state.level;
    if (!level) {
      return;
    }

    const block = level.questionBlocks.get(tileKey(tx, ty));
    if (!block || block.used) {
      return;
    }
    block.used = true;
    const burstX = tx * level.tileSize + level.tileSize * 0.5;
    const burstY = ty * level.tileSize + level.tileSize * 0.4;

    if (block.reward === "mushroom") {
      const reward = createQuestionReward(level, tx, ty, block.reward);
      if (reward) {
        this.state.items.push(reward);
      }
      this.state.score += SCORE_VALUES.questionPower;
      this.state.message = "Power-up released.";
      this.audio.play("powerup");
      this.spawnBurst(burstX, burstY, {
        count: 15,
        color: "rgba(126,255,174,__ALPHA__)",
        speedMin: 70,
        speedMax: 180,
        lifeMin: 0.2,
        lifeMax: 0.52
      });
      return;
    }

    this.state.coinsCollected += 1;
    this.state.score += SCORE_VALUES.questionCoin;
    this.state.message = `Hidden coin found (${this.state.coinsCollected}/${this.state.coinsTotal}).`;
    this.audio.play("coin");
    this.spawnBurst(burstX, burstY, {
      count: 11,
      color: "rgba(255,224,120,__ALPHA__)",
      speedMin: 65,
      speedMax: 160,
      lifeMin: 0.16,
      lifeMax: 0.42
    });
  }

  collectItem(item) {
    if (!item.active) {
      return;
    }

    item.active = false;
    if (item.type === "mushroom") {
      this.state.player.powerLevel = 1;
      this.state.score += SCORE_VALUES.questionPower;
      this.state.message = "Power-up active. Fireballs enabled.";
      this.audio.play("powerup");
      this.spawnBurst(item.x + item.w * 0.5, item.y + item.h * 0.4, {
        count: 18,
        color: "rgba(128,255,186,__ALPHA__)",
        speedMin: 80,
        speedMax: 210,
        lifeMin: 0.2,
        lifeMax: 0.54
      });
      return;
    }

    if (item.type === "gem") {
      this.state.score += SCORE_VALUES.gem;
      this.state.message = `Gem cache secured (+${SCORE_VALUES.gem}).`;
      this.audio.play("coin");
      this.spawnBurst(item.x + item.w * 0.5, item.y + item.h * 0.5, {
        count: 16,
        color: "rgba(130,230,255,__ALPHA__)",
        speedMin: 75,
        speedMax: 180,
        lifeMin: 0.18,
        lifeMax: 0.44
      });
      return;
    }

    if (item.type === "time") {
      this.state.timeLeft = Math.min(
        this.state.timeLimit,
        this.state.timeLeft + ITEM_SETTINGS.timeShardSeconds
      );
      this.state.score += SCORE_VALUES.timeShard;
      this.state.message = `Time shard recovered (+${ITEM_SETTINGS.timeShardSeconds}s).`;
      this.audio.play("coin");
      this.spawnBurst(item.x + item.w * 0.5, item.y + item.h * 0.5, {
        count: 15,
        color: "rgba(190,160,255,__ALPHA__)",
        speedMin: 70,
        speedMax: 170,
        lifeMin: 0.18,
        lifeMax: 0.46
      });
      return;
    }

    if (item.type === "shield") {
      this.state.player.invulnerableTimer = Math.max(
        this.state.player.invulnerableTimer,
        ITEM_SETTINGS.shieldSeconds
      );
      this.state.score += SCORE_VALUES.shield;
      this.state.message = `Shield active (${ITEM_SETTINGS.shieldSeconds}s).`;
      this.audio.play("powerup");
      this.spawnBurst(item.x + item.w * 0.5, item.y + item.h * 0.5, {
        count: 20,
        color: "rgba(120,255,210,__ALPHA__)",
        speedMin: 80,
        speedMax: 210,
        lifeMin: 0.2,
        lifeMax: 0.54
      });
      return;
    }

    this.state.coinsCollected += 1;
    this.state.score += SCORE_VALUES.coin;
    this.state.message = `Coin collected (${this.state.coinsCollected}/${this.state.coinsTotal}).`;
    this.audio.play("coin");
    this.spawnBurst(item.x + item.w * 0.5, item.y + item.h * 0.5, {
      count: 10,
      color: "rgba(255,227,122,__ALPHA__)",
      speedMin: 60,
      speedMax: 150,
      lifeMin: 0.16,
      lifeMax: 0.38
    });
  }

  tryShootProjectile() {
    if (!canShootProjectile(this.state.player)) {
      return;
    }
    this.state.projectiles.push(createProjectile(this.state.player));
    markProjectileFired(this.state.player);
    this.state.message = "Fireball launched.";
    this.audio.play("fire");
    this.spawnBurst(
      this.state.player.x + this.state.player.w * (this.state.player.facing === "right" ? 0.95 : 0.05),
      this.state.player.y + this.state.player.h * 0.54,
      {
        count: 9,
        color: "rgba(255,138,84,__ALPHA__)",
        speedMin: 70,
        speedMax: 170,
        lifeMin: 0.14,
        lifeMax: 0.3,
        gravity: 380
      }
    );
  }

  loseLife(reason) {
    if (this.state.screen !== SCREENS.PLAYING) {
      return;
    }
    if (this.state.player.invulnerableTimer > 0) {
      return;
    }

    this.state.lives -= 1;
    this.audio.play("hurt");
    this.spawnBurst(
      this.state.player.x + this.state.player.w * 0.5,
      this.state.player.y + this.state.player.h * 0.5,
      {
        count: 22,
        color: "rgba(255,106,106,__ALPHA__)",
        speedMin: 80,
        speedMax: 220,
        lifeMin: 0.18,
        lifeMax: 0.45
      }
    );
    if (this.state.lives <= 0) {
      this.state.screen = SCREENS.GAME_OVER;
      this.state.message = `${reason} No lives left.`;
      this.audio.play("lose");
      return;
    }

    const spawn = this.state.respawnPoint
      ? { ...this.state.respawnPoint }
      : spawnToWorldPosition(
        this.state.level,
        this.state.level.playerSpawn,
        this.state.player.w,
        this.state.player.h
      );
    resetPlayer(this.state.player, spawn, {
      keepPower: this.state.player.powerLevel > 0,
      invulnerable: true
    });
    this.state.projectiles = [];
    this.state.camera.x = clamp(
      spawn.x - VIEWPORT_WIDTH * 0.5,
      0,
      Math.max(0, getWorldWidth(this.state.level) - VIEWPORT_WIDTH)
    );
    this.state.camera.y = clamp(
      spawn.y - VIEWPORT_HEIGHT * 0.5,
      0,
      Math.max(0, getWorldHeight(this.state.level) - VIEWPORT_HEIGHT)
    );
    this.state.message = `${reason} Lives left: ${this.state.lives}.`;
  }

  completeLevel() {
    if (this.state.screen !== SCREENS.PLAYING) {
      return;
    }

    const timeBonus = Math.max(0, Math.floor(this.state.timeLeft)) * SCORE_VALUES.timeBonusMultiplier;
    const fullCoinBonus =
      this.state.coinsTotal > 0 && this.state.coinsCollected >= this.state.coinsTotal
        ? SCORE_VALUES.allCoinsBonus
        : 0;
    const stageBonus = SCORE_VALUES.levelClearBase + timeBonus + fullCoinBonus;
    this.state.score += stageBonus;

    if (this.state.levelIndex >= this.state.levelCount - 1) {
      this.state.screen = SCREENS.GAME_COMPLETE;
      this.state.message = `Run complete (${this.state.levelCount}/${this.state.levelCount}). Bonus +${stageBonus}. Press Enter for a new random route.`;
      this.audio.play("win");
      this.spawnBurst(this.state.goalRect.x + this.state.goalRect.w * 0.5, this.state.goalRect.y + 20, {
        count: 46,
        color: "rgba(132,245,201,__ALPHA__)",
        speedMin: 120,
        speedMax: 260,
        lifeMin: 0.28,
        lifeMax: 0.7,
        gravity: 360,
        upwardBias: 0.62
      });
      return;
    }

    this.state.screen = SCREENS.LEVEL_COMPLETE;
    this.state.transitionTimer = 2.1;
    this.state.message = `Map clear! Bonus +${stageBonus}. Loading next random stage...`;
    this.audio.play("win");
    this.spawnBurst(this.state.goalRect.x + this.state.goalRect.w * 0.5, this.state.goalRect.y + 20, {
      count: 28,
      color: "rgba(120,224,255,__ALPHA__)",
      speedMin: 100,
      speedMax: 220,
      lifeMin: 0.22,
      lifeMax: 0.58,
      gravity: 380
    });
  }

  updatePlayer(controls, dt) {
    const level = this.state.level;
    if (!level) {
      return;
    }
    const wasGrounded = this.state.player.onGround;

    if (controls.jumpPressed) {
      queueJump(this.state.player);
    }

    tickPlayerTimers(this.state.player, dt);
    applyHorizontalInput(this.state.player, controls.axis, dt);
    const didJump = tryStartJump(this.state.player);
    if (didJump) {
      this.audio.play("jump");
      this.spawnBurst(this.state.player.x + this.state.player.w * 0.5, this.state.player.y + this.state.player.h, {
        count: 7,
        color: "rgba(158,220,255,__ALPHA__)",
        speedMin: 45,
        speedMax: 135,
        lifeMin: 0.14,
        lifeMax: 0.3,
        gravity: 420
      });
    }

    const preVerticalSpeed = this.state.player.vy;
    this.state.activeWind = this.applyWindToEntity(
      this.state.player,
      dt,
      this.state.player.onGround ? 0.4 : 0.9
    );
    applyVerticalForces(this.state.player, controls.jumpHeld, dt);
    const collision = moveEntityWithWorldCollisions(this.state.player, level, dt, { allowOneWay: true });
    setPlayerGrounded(this.state.player, collision.landed);
    if (!collision.landed) {
      this.state.player.onGround = false;
    }
    if (!wasGrounded && collision.landed && preVerticalSpeed > 170) {
      this.spawnBurst(this.state.player.x + this.state.player.w * 0.5, this.state.player.y + this.state.player.h, {
        count: 8,
        color: "rgba(210,240,255,__ALPHA__)",
        speedMin: 35,
        speedMax: 110,
        lifeMin: 0.12,
        lifeMax: 0.26,
        gravity: 420
      });
    }
    this.handleSpringTile(collision, controls);

    if (collision.hitCeiling && collision.ceilingTile?.type === TILE_TYPES.QUESTION) {
      this.handleQuestionBlockHit(collision.ceilingTile.tx, collision.ceilingTile.ty);
    }

    setPlayerAnimation(this.state.player);

    if (collision.fellOut) {
      this.loseLife("You fell into the void.");
    }
  }

  updateEnemies(dt) {
    for (const enemy of this.state.enemies) {
      const wind = this.sampleWindForEntity(enemy);
      updateEnemy(enemy, dt, this.state.level, moveEntityWithWorldCollisions, {
        player: this.state.player,
        wind
      });
    }
  }

  updateItems(dt) {
    for (const item of this.state.items) {
      this.applyWindToEntity(item, dt, item.type === "coin" ? 0.08 : 0.28);
      updateItem(item, dt, this.state.level, moveEntityWithWorldCollisions);
    }
  }

  updateProjectiles(dt) {
    for (const projectile of this.state.projectiles) {
      this.applyWindToEntity(projectile, dt, 0.7);
      updateProjectile(projectile, dt, this.state.level, moveEntityWithWorldCollisions);
    }
  }

  handleCombatAndPickups() {
    const player = this.state.player;
    if (this.state.screen !== SCREENS.PLAYING) {
      return;
    }

    for (const item of this.state.items) {
      if (!item.active) {
        continue;
      }
      if (aabbIntersects(player, item)) {
        this.collectItem(item);
      }
    }

    for (const projectile of this.state.projectiles) {
      if (!projectile.active) {
        continue;
      }
      for (const enemy of this.state.enemies) {
        if (!enemy.active) {
          continue;
        }
        if (!aabbIntersects(projectile, enemy)) {
          continue;
        }
        projectile.active = false;

        if (enemy.type === "boss") {
          const bossDamage = this.state.level?.boss?.projectileDamage ?? 1;
          const hit = applyEnemyDamage(enemy, bossDamage);
          if (!hit.applied) {
            this.state.message = "Boss armor absorbed the hit.";
            break;
          }

          if (hit.defeated) {
            this.state.score += SCORE_VALUES.bossDefeat;
            this.state.message = `${enemy.name || "Boss"} defeated. Reach the cube beacon.`;
            this.audio.play("win");
            this.spawnBurst(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.5, {
              count: 34,
              color: "rgba(255,114,126,__ALPHA__)",
              speedMin: 110,
              speedMax: 260,
              lifeMin: 0.24,
              lifeMax: 0.62
            });
          } else {
            this.state.score += SCORE_VALUES.bossHit;
            this.state.message = `${enemy.name || "Boss"} hit (${hit.remainingHealth}/${enemy.maxHealth}).`;
            this.audio.play("hurt");
            this.spawnBurst(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.5, {
              count: 12,
              color: "rgba(255,164,136,__ALPHA__)",
              speedMin: 70,
              speedMax: 180,
              lifeMin: 0.16,
              lifeMax: 0.35
            });
          }
        } else {
          defeatEnemy(enemy);
          this.state.score += SCORE_VALUES.projectileEnemy;
          this.state.message = "Enemy eliminated with power shot.";
          this.audio.play("stomp");
          this.spawnBurst(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.5, {
            count: 16,
            color: "rgba(255,143,117,__ALPHA__)",
            speedMin: 80,
            speedMax: 220,
            lifeMin: 0.18,
            lifeMax: 0.42
          });
        }

        break;
      }
    }

    for (const enemy of this.state.enemies) {
      if (!enemy.active) {
        continue;
      }
      if (!aabbIntersects(player, enemy)) {
        continue;
      }

      const playerBottom = player.y + player.h;
      const stomp =
        player.vy > 120 &&
        playerBottom - enemy.y < enemy.h * 0.55 &&
        player.y + player.h * 0.3 < enemy.y;

      if (stomp) {
        player.vy = PLAYER_SETTINGS.stompBounceVelocity;

        if (enemy.type === "boss") {
          const stompDamage = this.state.level?.boss?.stompDamage ?? 2;
          const hit = applyEnemyDamage(enemy, stompDamage);
          if (hit.applied && hit.defeated) {
            this.state.score += SCORE_VALUES.bossDefeat;
            this.state.message = `${enemy.name || "Boss"} defeated. Reach the cube beacon.`;
            this.audio.play("win");
            this.spawnBurst(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.5, {
              count: 32,
              color: "rgba(255,135,113,__ALPHA__)",
              speedMin: 100,
              speedMax: 235,
              lifeMin: 0.2,
              lifeMax: 0.55
            });
          } else if (hit.applied) {
            this.state.score += SCORE_VALUES.bossHit;
            this.state.message = `${enemy.name || "Boss"} staggered (${hit.remainingHealth}/${enemy.maxHealth}).`;
            this.audio.play("stomp");
            this.spawnBurst(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.5, {
              count: 14,
              color: "rgba(255,224,171,__ALPHA__)",
              speedMin: 70,
              speedMax: 180,
              lifeMin: 0.16,
              lifeMax: 0.36
            });
          } else {
            this.state.message = "Boss armor resisted the stomp.";
          }
        } else {
          defeatEnemy(enemy);
          this.state.score += SCORE_VALUES.stomp;
          this.state.message = "Stomped enemy.";
          this.audio.play("stomp");
          this.spawnBurst(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.5, {
            count: 14,
            color: "rgba(255,241,176,__ALPHA__)",
            speedMin: 70,
            speedMax: 190,
            lifeMin: 0.16,
            lifeMax: 0.36
          });
        }
        continue;
      }

      this.loseLife(enemy.type === "boss" ? `${enemy.name || "Boss"} collision.` : "Enemy collision.");
      break;
    }

    this.refreshActiveBoss();
  }

  cleanupEntities() {
    this.state.items = this.state.items.filter((item) => item.active);
    this.state.enemies = this.state.enemies.filter((enemy) => enemy.active);
    this.state.projectiles = this.state.projectiles.filter((projectile) => projectile.active);
    this.refreshActiveBoss();
  }

  updateCamera() {
    const worldWidth = getWorldWidth(this.state.level);
    const worldHeight = getWorldHeight(this.state.level);
    const maxCameraX = Math.max(0, worldWidth - VIEWPORT_WIDTH);
    const maxCameraY = Math.max(0, worldHeight - VIEWPORT_HEIGHT);
    const lead = this.state.player.facing === "right" ? CAMERA_SETTINGS.leadPixels : -CAMERA_SETTINGS.leadPixels;
    const targetX = this.state.player.x + this.state.player.w * 0.5 - VIEWPORT_WIDTH * 0.5 + lead;
    const clampedTarget = clamp(targetX, 0, maxCameraX);
    this.state.camera.x += (clampedTarget - this.state.camera.x) * CAMERA_SETTINGS.followLerp;
    this.state.camera.x = clamp(this.state.camera.x, 0, maxCameraX);

    const upwardVelocity = Math.max(0, -(this.state.player.vy || 0));
    const downwardVelocity = Math.max(0, this.state.player.vy || 0);
    const upwardLookAhead = Math.min(
      CAMERA_SETTINGS.upwardLookAheadMax ?? 0,
      upwardVelocity * (CAMERA_SETTINGS.upwardVelocityLookAheadFactor ?? 0)
    );
    const downwardLookAhead = Math.min(
      CAMERA_SETTINGS.downwardLookAheadMax ?? 0,
      downwardVelocity * (CAMERA_SETTINGS.downwardVelocityLookAheadFactor ?? 0)
    );
    let targetY = this.state.player.y + this.state.player.h * 0.5
      - VIEWPORT_HEIGHT * 0.5
      - CAMERA_SETTINGS.verticalLeadPixels
      - upwardLookAhead
      + downwardLookAhead;

    const hudReservePixels = CAMERA_SETTINGS.hudReservePixels ?? 0;
    const topSafeZone = Math.max(
      VIEWPORT_HEIGHT * (CAMERA_SETTINGS.topSafeZoneRatio ?? 0.28),
      hudReservePixels + 14
    );
    const bottomSafeZone = VIEWPORT_HEIGHT * (CAMERA_SETTINGS.bottomSafeZoneRatio ?? 0.74);
    let playerTopInView = this.state.player.y - this.state.camera.y;
    let playerBottomInView = this.state.player.y + this.state.player.h - this.state.camera.y;

    if (playerTopInView < topSafeZone) {
      const overshoot = topSafeZone - playerTopInView;
      targetY -= overshoot * (CAMERA_SETTINGS.topSafePull ?? 0.65);
    }
    if (playerBottomInView > bottomSafeZone) {
      const overshoot = playerBottomInView - bottomSafeZone;
      targetY += overshoot * (CAMERA_SETTINGS.bottomSafePull ?? 0.55);
    }

    const clampedY = clamp(targetY, 0, maxCameraY);
    let followLerpY = this.state.player.onGround
      ? CAMERA_SETTINGS.followLerpY
      : Math.max(CAMERA_SETTINGS.followLerpY, CAMERA_SETTINGS.airborneFollowLerpY ?? CAMERA_SETTINGS.followLerpY);
    if (
      upwardVelocity > 180 ||
      downwardVelocity > 260 ||
      playerTopInView < topSafeZone * 0.88 ||
      playerBottomInView > bottomSafeZone * 1.04
    ) {
      followLerpY = Math.max(followLerpY, CAMERA_SETTINGS.verticalCatchupLerp ?? followLerpY);
    }

    this.state.camera.y += (clampedY - this.state.camera.y) * followLerpY;
    this.state.camera.y = clamp(this.state.camera.y, 0, maxCameraY);
  }

  step(dt) {
    this.state.elapsedMs += dt * 1000;
    const controls = this.input.consume();
    this.updateEffects(dt);

    if (controls.restartPressed) {
      this.restartCurrentLevel();
      return;
    }

    if (this.state.screen === SCREENS.START) {
      if (controls.startPressed || controls.jumpPressed || controls.actionPressed) {
        this.beginNewRun();
      }
      return;
    }

    if (this.state.screen === SCREENS.GAME_OVER || this.state.screen === SCREENS.GAME_COMPLETE) {
      if (controls.startPressed || controls.jumpPressed || controls.actionPressed) {
        this.beginNewRun();
      }
      return;
    }

    if (this.state.screen === SCREENS.LEVEL_COMPLETE) {
      this.state.transitionTimer = Math.max(0, this.state.transitionTimer - dt);
      if (this.state.transitionTimer <= 0) {
        this.loadLevel(this.state.levelIndex + 1, {
          resetRun: false,
          keepPower: this.state.player.powerLevel > 0,
          preserveLives: true
        });
        this.state.screen = SCREENS.PLAYING;
        const bossHint = this.state.bossEntryPowerGranted
          ? " Auto fire power granted for this boss stage."
          : "";
        this.state.message = `Stage ${this.state.levelIndex + 1}/${this.state.levelCount}: ${this.state.level.name}.${bossHint}`;
      }
      return;
    }

    if (this.state.screen !== SCREENS.PLAYING) {
      return;
    }

    if (controls.actionPressed) {
      this.tryShootProjectile();
    }

    this.state.timeLeft = Math.max(0, this.state.timeLeft - dt);
    if (this.state.timeLeft <= 0) {
      this.loseLife("Time up.");
      return;
    }

    this.updatePlayer(controls, dt);
    if (this.state.screen !== SCREENS.PLAYING) {
      return;
    }

    this.updateEnemies(dt);
    this.updateItems(dt);
    this.updateProjectiles(dt);

    this.handleCombatAndPickups();
    if (this.state.screen !== SCREENS.PLAYING) {
      return;
    }

    this.updateCheckpoints();
    this.handleHazards();
    if (this.state.screen !== SCREENS.PLAYING) {
      return;
    }

    if (aabbIntersects(this.state.player, this.state.goalRect)) {
      const requiresAllCoins = Boolean(this.state.level.goalRequiresAllCoins);
      if (this.state.level.isBossLevel && this.state.activeBoss) {
        this.state.message = `Defeat ${this.state.activeBoss.name} before taking the cube beacon.`;
      } else if (requiresAllCoins && this.state.coinsCollected < this.state.coinsTotal) {
        this.state.message = `Find all coins first (${this.state.coinsCollected}/${this.state.coinsTotal}).`;
      } else {
        this.completeLevel();
      }
    }

    this.cleanupEntities();
    this.updateCamera();
  }

  render() {
    this.renderer.render({
      ...this.state,
      score: this.state.score,
      lives: this.state.lives,
      levelIndex: this.state.levelIndex,
      levelCount: this.state.levelCount,
      coinsCollected: this.state.coinsCollected,
      coinsTotal: this.state.coinsTotal,
      timeLeft: this.state.timeLeft
    });
  }

  publishSnapshot(force = false) {
    if (!force && this.state.elapsedMs - this.lastSnapshotAtMs < SNAPSHOT_INTERVAL_MS) {
      return;
    }
    this.lastSnapshotAtMs = this.state.elapsedMs;
    this.onSnapshot(buildHudSnapshot(this.state));
  }
}
