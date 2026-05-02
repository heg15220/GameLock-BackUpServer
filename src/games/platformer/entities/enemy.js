import { BOSS_SETTINGS, ENEMY_SETTINGS } from "../config";
import { getTileType, isSupportTile, spawnToWorldPosition } from "../levels/levelLoader";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const randomRange = (min, max) => min + Math.random() * Math.max(0, max - min);

const isBossType = (spawn) => String(spawn.type || "walker").toLowerCase() === "boss";
const isJumperType = (spawn) => String(spawn.type || "walker").toLowerCase() === "jumper";

const BOSS_VARIANTS = {
  juggernaut: {
    speedMul: 1,
    chargeMul: 1,
    jumpMul: 1,
    gravityMul: 1,
    decisionMin: 1.1,
    decisionMax: 2.1,
    chargeMin: 0.35,
    chargeMax: 0.86,
    jumpCooldown: 2.2,
    jumpRangeTiles: 8,
    weaveAmplitude: 0,
    glideLift: 0
  },
  sentinel: {
    speedMul: 0.88,
    chargeMul: 1.12,
    jumpMul: 1.04,
    gravityMul: 1,
    decisionMin: 0.8,
    decisionMax: 1.45,
    chargeMin: 0.22,
    chargeMax: 0.55,
    jumpCooldown: 1.7,
    jumpRangeTiles: 6,
    weaveAmplitude: 0,
    glideLift: 0
  },
  tempest: {
    speedMul: 1.22,
    chargeMul: 1.08,
    jumpMul: 0.94,
    gravityMul: 0.96,
    decisionMin: 0.55,
    decisionMax: 1.05,
    chargeMin: 0.2,
    chargeMax: 0.5,
    jumpCooldown: 1.25,
    jumpRangeTiles: 9,
    weaveAmplitude: 26,
    glideLift: 0
  },
  forge: {
    speedMul: 0.95,
    chargeMul: 1.34,
    jumpMul: 1.12,
    gravityMul: 1.04,
    decisionMin: 0.9,
    decisionMax: 1.55,
    chargeMin: 0.36,
    chargeMax: 0.92,
    jumpCooldown: 1.55,
    jumpRangeTiles: 7,
    weaveAmplitude: 0,
    glideLift: 0
  },
  phantom: {
    speedMul: 1.12,
    chargeMul: 1.18,
    jumpMul: 0.98,
    gravityMul: 0.88,
    decisionMin: 0.6,
    decisionMax: 1.18,
    chargeMin: 0.26,
    chargeMax: 0.66,
    jumpCooldown: 1.35,
    jumpRangeTiles: 8,
    weaveAmplitude: 14,
    glideLift: 70
  },
  mirage: {
    speedMul: 1.18,
    chargeMul: 0.92,
    jumpMul: 1.02,
    gravityMul: 0.92,
    decisionMin: 0.48,
    decisionMax: 0.94,
    chargeMin: 0.18,
    chargeMax: 0.42,
    jumpCooldown: 1.12,
    jumpRangeTiles: 10,
    weaveAmplitude: 34,
    glideLift: 58
  },
  crystal: {
    speedMul: 0.82,
    chargeMul: 1.26,
    jumpMul: 1.18,
    gravityMul: 1.02,
    decisionMin: 0.72,
    decisionMax: 1.36,
    chargeMin: 0.28,
    chargeMax: 0.72,
    jumpCooldown: 1.5,
    jumpRangeTiles: 7,
    weaveAmplitude: 8,
    glideLift: 0
  },
  overclock: {
    speedMul: 1.34,
    chargeMul: 1.42,
    jumpMul: 0.94,
    gravityMul: 1,
    decisionMin: 0.38,
    decisionMax: 0.78,
    chargeMin: 0.16,
    chargeMax: 0.4,
    jumpCooldown: 0.95,
    jumpRangeTiles: 9,
    weaveAmplitude: 20,
    glideLift: 20
  }
};

const resolveBossVariant = (variant) => BOSS_VARIANTS[variant] || BOSS_VARIANTS.juggernaut;

const baseEnemy = (level, spawn, dimensions, id) => {
  const worldSpawn = spawnToWorldPosition(level, spawn, dimensions.w, dimensions.h);
  const patrolTiles = Math.max(2, Number(spawn.patrol) || 5);
  return {
    id: id || `enemy-${spawn.x}-${spawn.y}`,
    x: worldSpawn.x,
    y: worldSpawn.y,
    w: dimensions.w,
    h: dimensions.h,
    vx: 0,
    vy: 0,
    direction: 1,
    patrolMinX: Math.max(0, (spawn.x - patrolTiles) * level.tileSize),
    patrolMaxX: (spawn.x + patrolTiles + 1) * level.tileSize,
    onGround: false,
    active: true,
    animationFrame: 0,
    animationTimer: 0,
    variant: spawn.variant || null
  };
};

export const createEnemyFromSpawn = (level, spawn, id) => {
  if (isBossType(spawn)) {
    const boss = baseEnemy(
      level,
      spawn,
      { w: BOSS_SETTINGS.width, h: BOSS_SETTINGS.height },
      id
    );
    const tuning = resolveBossVariant(spawn.variant || "juggernaut");
    boss.type = "boss";
    boss.variant = spawn.variant || "juggernaut";
    boss.name = spawn.name || "Arena Warden";
    boss.speed = Math.max(24, Number(spawn.speed) || BOSS_SETTINGS.walkSpeed * tuning.speedMul);
    boss.chargeSpeed = Math.max(
      boss.speed + 28,
      Number(spawn.chargeSpeed) || BOSS_SETTINGS.chargeSpeed * tuning.chargeMul
    );
    boss.gravity = BOSS_SETTINGS.gravity * tuning.gravityMul;
    boss.maxFallSpeed = BOSS_SETTINGS.maxFallSpeed;
    boss.jumpVelocity = BOSS_SETTINGS.jumpVelocity * tuning.jumpMul;
    boss.maxHealth = Math.max(4, Number(spawn.health) || BOSS_SETTINGS.maxHealth);
    boss.health = boss.maxHealth;
    boss.contactDamage = Math.max(1, Number(spawn.contactDamage) || 1);
    boss.damageCooldownTimer = 0;
    boss.hurtCooldown = BOSS_SETTINGS.hurtCooldownSeconds;
    boss.flashTimer = 0;
    boss.aiDecisionTimer = randomRange(tuning.decisionMin, tuning.decisionMax);
    boss.chargeTimer = 0;
    boss.jumpCooldownTimer = randomRange(0.3, tuning.jumpCooldown);
    boss.weaveTimer = Math.random() * Math.PI * 2;
    return boss;
  }

  if (isJumperType(spawn)) {
    const jumper = baseEnemy(
      level,
      spawn,
      { w: ENEMY_SETTINGS.width, h: ENEMY_SETTINGS.height },
      id
    );
    jumper.type = "jumper";
    jumper.speed = Math.max(28, Number(spawn.speed) || ENEMY_SETTINGS.walkSpeed * 0.92);
    jumper.vx = jumper.speed;
    jumper.maxFallSpeed = ENEMY_SETTINGS.maxFallSpeed;
    jumper.jumpCooldownTimer = randomRange(0.35, 1.1);
    jumper.jumpVelocity = -390;
    return jumper;
  }

  const walker = baseEnemy(
    level,
    spawn,
    { w: ENEMY_SETTINGS.width, h: ENEMY_SETTINGS.height },
    id
  );
  walker.type = "walker";
  walker.speed = Math.max(24, Number(spawn.speed) || ENEMY_SETTINGS.walkSpeed);
  walker.vx = walker.speed;
  walker.maxFallSpeed = ENEMY_SETTINGS.maxFallSpeed;
  return walker;
};

const hasGroundAhead = (enemy, level) => {
  const lookAheadX = enemy.direction > 0 ? enemy.x + enemy.w + 1 : enemy.x - 1;
  const lookAheadY = enemy.y + enemy.h + 2;
  const tx = Math.floor(lookAheadX / level.tileSize);
  const ty = Math.floor(lookAheadY / level.tileSize);
  const tileType = getTileType(level, tx, ty);
  return isSupportTile(tileType);
};

const clampEnemyPatrol = (enemy) => {
  if (enemy.x < enemy.patrolMinX) {
    enemy.x = enemy.patrolMinX;
    enemy.direction = 1;
  }
  if (enemy.x + enemy.w > enemy.patrolMaxX) {
    enemy.x = enemy.patrolMaxX - enemy.w;
    enemy.direction = -1;
  }
};

const handleEnemyTileBounce = (enemy, collision) => {
  if (collision.hitLeft) {
    enemy.direction = 1;
  } else if (collision.hitRight) {
    enemy.direction = -1;
  }
};

const applyWindToEnemy = (enemy, wind, dt, modifier = 0.36) => {
  if (!wind) {
    return;
  }
  enemy.vx += wind.forceX * dt * modifier;
  enemy.vy += wind.forceY * dt * modifier;
};

const finalizeEnemyUpdate = (enemy, collision) => {
  handleEnemyTileBounce(enemy, collision);
  clampEnemyPatrol(enemy);

  if (enemy.onGround && !hasGroundAhead(enemy, enemy.levelRef || collision.level || {})) {
    enemy.direction *= -1;
  }

  enemy.animationTimer += collision.dt || 0;
  if (collision.fellOut) {
    enemy.active = false;
  }
};

const updateWalkerEnemy = (enemy, dt, level, moveEntityWithCollisions, context = {}) => {
  enemy.levelRef = level;
  enemy.vx = enemy.direction * enemy.speed;
  enemy.vy += ENEMY_SETTINGS.gravity * dt;
  applyWindToEnemy(enemy, context.wind, dt, 0.3);
  enemy.vy = clamp(enemy.vy, -9999, enemy.maxFallSpeed || ENEMY_SETTINGS.maxFallSpeed);

  const collision = moveEntityWithCollisions(enemy, level, dt, { allowOneWay: true });
  collision.dt = dt;
  enemy.onGround = collision.landed;

  handleEnemyTileBounce(enemy, collision);
  clampEnemyPatrol(enemy);
  if (enemy.onGround && !hasGroundAhead(enemy, level)) {
    enemy.direction *= -1;
  }

  enemy.animationTimer += dt;
  enemy.animationFrame = Math.floor(enemy.animationTimer * 10) % 2;
  if (collision.fellOut) {
    enemy.active = false;
  }
  return collision;
};

const updateJumperEnemy = (enemy, dt, level, moveEntityWithCollisions, context = {}) => {
  enemy.levelRef = level;
  enemy.jumpCooldownTimer = Math.max(0, enemy.jumpCooldownTimer - dt);
  enemy.vx = enemy.direction * enemy.speed;

  if (enemy.onGround && enemy.jumpCooldownTimer <= 0) {
    enemy.vy = enemy.jumpVelocity;
    enemy.jumpCooldownTimer = randomRange(0.65, 1.15);
    if (context.player) {
      const playerCenter = context.player.x + context.player.w * 0.5;
      const enemyCenter = enemy.x + enemy.w * 0.5;
      enemy.direction = playerCenter >= enemyCenter ? 1 : -1;
    }
  }

  enemy.vy += ENEMY_SETTINGS.gravity * dt;
  applyWindToEnemy(enemy, context.wind, dt, 0.35);
  enemy.vy = clamp(enemy.vy, -9999, enemy.maxFallSpeed || ENEMY_SETTINGS.maxFallSpeed);

  const collision = moveEntityWithCollisions(enemy, level, dt, { allowOneWay: true });
  enemy.onGround = collision.landed;
  handleEnemyTileBounce(enemy, collision);
  clampEnemyPatrol(enemy);
  if (enemy.onGround && !hasGroundAhead(enemy, level)) {
    enemy.direction *= -1;
  }

  enemy.animationTimer += dt;
  enemy.animationFrame = Math.floor(enemy.animationTimer * 8) % 2;
  if (collision.fellOut) {
    enemy.active = false;
  }
  return collision;
};

const updateBossEnemy = (enemy, dt, level, moveEntityWithCollisions, context = {}) => {
  const player = context.player || null;
  const tuning = resolveBossVariant(enemy.variant);

  enemy.damageCooldownTimer = Math.max(0, enemy.damageCooldownTimer - dt);
  enemy.flashTimer = Math.max(0, enemy.flashTimer - dt);
  enemy.aiDecisionTimer = Math.max(0, enemy.aiDecisionTimer - dt);
  enemy.chargeTimer = Math.max(0, enemy.chargeTimer - dt);
  enemy.jumpCooldownTimer = Math.max(0, enemy.jumpCooldownTimer - dt);
  enemy.weaveTimer += dt;

  if (enemy.aiDecisionTimer <= 0) {
    if (player) {
      const bossCenter = enemy.x + enemy.w * 0.5;
      const playerCenter = player.x + player.w * 0.5;
      enemy.direction = playerCenter >= bossCenter ? 1 : -1;
    } else {
      enemy.direction *= -1;
    }
    enemy.aiDecisionTimer = randomRange(tuning.decisionMin, tuning.decisionMax);
    enemy.chargeTimer = randomRange(tuning.chargeMin, tuning.chargeMax);
  }

  if (
    enemy.onGround &&
    enemy.jumpCooldownTimer <= 0 &&
    player &&
    Math.abs((player.x + player.w * 0.5) - (enemy.x + enemy.w * 0.5)) < level.tileSize * tuning.jumpRangeTiles
  ) {
    enemy.vy = enemy.jumpVelocity;
    enemy.jumpCooldownTimer = tuning.jumpCooldown;
  }

  let moveSpeed = enemy.chargeTimer > 0 ? enemy.chargeSpeed : enemy.speed;
  if (enemy.variant === "sentinel" && player) {
    const distance = Math.abs((player.x + player.w * 0.5) - (enemy.x + enemy.w * 0.5));
    if (distance > level.tileSize * 8) {
      moveSpeed *= 0.82;
    } else if (distance < level.tileSize * 3) {
      moveSpeed *= 1.15;
    }
  }

  enemy.vx = enemy.direction * moveSpeed;
  if (tuning.weaveAmplitude > 0) {
    enemy.vx += Math.sin(enemy.weaveTimer * 7) * tuning.weaveAmplitude;
  }

  enemy.vy += enemy.gravity * dt;
  if (tuning.glideLift > 0 && !enemy.onGround && enemy.vy > 120) {
    enemy.vy -= tuning.glideLift * dt;
  }
  applyWindToEnemy(enemy, context.wind, dt, 0.24);
  enemy.vy = clamp(enemy.vy, -9999, enemy.maxFallSpeed);

  const collision = moveEntityWithCollisions(enemy, level, dt, { allowOneWay: true });
  enemy.onGround = collision.landed;

  handleEnemyTileBounce(enemy, collision);
  clampEnemyPatrol(enemy);
  if (enemy.onGround && !hasGroundAhead(enemy, level)) {
    enemy.direction *= -1;
  }

  enemy.animationTimer += dt;
  enemy.animationFrame = Math.floor(enemy.animationTimer * (enemy.variant === "tempest" ? 10 : 7)) % 2;
  if (collision.fellOut) {
    enemy.active = false;
    enemy.health = 0;
  }
  return collision;
};

export const updateEnemy = (enemy, dt, level, moveEntityWithCollisions, context = {}) => {
  if (!enemy.active) {
    return null;
  }
  if (enemy.type === "boss") {
    return updateBossEnemy(enemy, dt, level, moveEntityWithCollisions, context);
  }
  if (enemy.type === "jumper") {
    return updateJumperEnemy(enemy, dt, level, moveEntityWithCollisions, context);
  }
  return updateWalkerEnemy(enemy, dt, level, moveEntityWithCollisions, context);
};

export const isBossEnemy = (enemy) => Boolean(enemy?.active && enemy.type === "boss");

export const applyEnemyDamage = (enemy, damage = 1) => {
  if (!enemy?.active) {
    return { applied: false, defeated: false, remainingHealth: 0 };
  }

  if (enemy.type !== "boss") {
    defeatEnemy(enemy);
    return { applied: true, defeated: true, remainingHealth: 0 };
  }

  if (enemy.damageCooldownTimer > 0) {
    return { applied: false, defeated: false, remainingHealth: enemy.health };
  }

  const safeDamage = Math.max(1, Math.floor(Number(damage) || 1));
  enemy.health = Math.max(0, enemy.health - safeDamage);
  enemy.damageCooldownTimer = enemy.hurtCooldown || BOSS_SETTINGS.hurtCooldownSeconds;
  enemy.flashTimer = 0.22;

  if (enemy.health <= 0) {
    defeatEnemy(enemy);
    return { applied: true, defeated: true, remainingHealth: 0 };
  }

  return { applied: true, defeated: false, remainingHealth: enemy.health };
};

export const defeatEnemy = (enemy) => {
  enemy.active = false;
  enemy.vx = 0;
  enemy.vy = 0;
  if (enemy.type === "boss") {
    enemy.health = 0;
    enemy.flashTimer = 0;
  }
};
