export const VIEWPORT_WIDTH = 768;
export const VIEWPORT_HEIGHT = 432;
export const TILE_SIZE = 32;
export const PLATFORMER_ROUTE_LENGTH = 8;

export const FIXED_STEP_SECONDS = 1 / 60;
export const FIXED_STEP_MS = 1000 / 60;
export const MAX_FRAME_MS = 100;
export const SNAPSHOT_INTERVAL_MS = 90;

export const DEFAULT_LIVES = 3;
export const DEFAULT_MESSAGE = "Press Enter or Start to begin the run.";

export const SCREENS = {
  START: "start",
  PLAYING: "playing",
  LEVEL_COMPLETE: "level_complete",
  GAME_OVER: "game_over",
  GAME_COMPLETE: "game_complete"
};

export const PLAYER_SETTINGS = {
  width: 22,
  height: 30,
  accelerationGround: 2700,
  accelerationAir: 1600,
  decelerationGround: 2600,
  decelerationAir: 1100,
  maxSpeedX: 228,
  jumpVelocity: -560,
  jumpBufferSeconds: 0.11,
  coyoteSeconds: 0.1,
  gravity: 1780,
  maxFallSpeed: 760,
  jumpHoldSeconds: 0.16,
  jumpHoldGravityMultiplier: 0.48,
  jumpCutMultiplier: 0.56,
  stompBounceVelocity: -360,
  springBoostVelocity: -760,
  superSpringBoostVelocity: -900,
  invulnerableSeconds: 1.1,
  fireCooldownSeconds: 0.28
};

export const ENEMY_SETTINGS = {
  width: 24,
  height: 24,
  gravity: 1700,
  walkSpeed: 62,
  maxFallSpeed: 680
};

export const BOSS_SETTINGS = {
  width: 44,
  height: 40,
  gravity: 1750,
  walkSpeed: 44,
  chargeSpeed: 118,
  jumpVelocity: -470,
  maxFallSpeed: 730,
  maxHealth: 16,
  hurtCooldownSeconds: 0.18,
  aiDecisionSecondsMin: 1.1,
  aiDecisionSecondsMax: 2.1,
  jumpCooldownSeconds: 2.2
};

export const ITEM_SETTINGS = {
  coinSize: 18,
  mushroomWidth: 24,
  mushroomHeight: 22,
  mushroomSpeed: 72,
  mushroomGravity: 1600,
  mushroomMaxFallSpeed: 640
};

export const PROJECTILE_SETTINGS = {
  width: 10,
  height: 10,
  speed: 340,
  lifespanSeconds: 1.15
};

export const CAMERA_SETTINGS = {
  followLerp: 0.22,
  followLerpY: 0.18,
  airborneFollowLerpY: 0.26,
  leadPixels: 36,
  verticalLeadPixels: 52,
  upwardLookAheadMax: 132,
  upwardVelocityLookAheadFactor: 0.2,
  downwardLookAheadMax: 86,
  downwardVelocityLookAheadFactor: 0.11,
  topSafeZoneRatio: 0.36,
  bottomSafeZoneRatio: 0.74,
  hudReservePixels: 74,
  verticalCatchupLerp: 0.34
};

export const SCORE_VALUES = {
  coin: 100,
  stomp: 220,
  projectileEnemy: 260,
  bossHit: 180,
  bossDefeat: 1400,
  questionCoin: 120,
  questionPower: 180,
  levelClearBase: 450,
  timeBonusMultiplier: 8,
  allCoinsBonus: 350
};
