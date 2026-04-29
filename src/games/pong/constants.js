export const PONG_WIDTH = 960;
export const PONG_HEIGHT = 540;

export const FIXED_DT = 1 / 120;
export const MAX_FRAME_DELTA = 0.05;

export const PADDLE_CONFIG = {
  width: 16,
  height: 116,
  margin: 40,
  keyboardMaxSpeed: 680,
  keyboardAcceleration: 5200,
  keyboardDrag: 3900,
  mouseFollowGain: 14,
  mouseMaxSpeed: 920,
  aiAcceleration: 4200,
  aiDrag: 2800,
  aiCenterPull: 0.16,
  keyboardHMaxSpeed: 380,
  keyboardHAcceleration: 3200,
  keyboardHDrag: 2600,
  aiHMaxSpeed: 260,
  aiHAcceleration: 1800,
  aiHDrag: 1400
};

export const BALL_CONFIG = {
  radius: 9,
  serveSpeed: 370,
  minSpeed: 330,
  maxSpeed: 1060,
  hitSpeedGain: 28,
  englishSpeedGain: 110,
  maxBounceAngle: Math.PI * 0.39,
  wallSpeedDamp: 0.995,
  trailLength: 18
};

export const MATCH_CONFIG = {
  targetScore: 9,
  matchSeconds: 120,
  serveDelay: 1.2,
  roundBreakSeconds: 0.95,
  startCountdown: 2.4,
  maxComboWindow: 2.2,
  maxParticles: 90,
  goalOpeningRatio: 0.44,
  goalOpeningMinHeight: 170
};

export const DIFFICULTY_PRESETS = {
  rookie: {
    key: "rookie",
    label: "Rookie",
    aiBaseSpeed: 232,
    maxBallSpeed: 620,
    aiPrecisionError: 152,
    aiReaction: 0.32,
    aiPredictionWeight: 0.32,
    aiJitter: 104,
    aiErrorDrift: 0.42,
    aiAdvanceFactor: 0.22,
    aiWhiffChance: 1.2,
    aiWhiffDurationMin: 0.34,
    aiWhiffDurationMax: 0.82,
    aiWhiffOffsetMin: 86,
    aiWhiffOffsetMax: 216,
    aiWhiffCooldownMin: 0.75,
    aiWhiffCooldownMax: 1.45,
    aiForcedMistakes: true,
    aiPauseMistakeChance: 0.34,
    aiWrongWayMistakeChance: 0.42
  },
  arcade: {
    key: "arcade",
    label: "Arcade",
    aiBaseSpeed: 430,
    maxBallSpeed: 1060,
    aiPrecisionError: 64,
    aiReaction: 0.16,
    aiPredictionWeight: 0.68,
    aiJitter: 34,
    aiErrorDrift: 0.22,
    aiAdvanceFactor: 0.32,
    aiWhiffChance: 0.55,
    aiWhiffDurationMin: 0.28,
    aiWhiffDurationMax: 0.62,
    aiWhiffOffsetMin: 72,
    aiWhiffOffsetMax: 158,
    aiWhiffCooldownMin: 0.95,
    aiWhiffCooldownMax: 1.9
  },
  pro: {
    key: "pro",
    label: "Pro",
    aiBaseSpeed: 540,
    maxBallSpeed: 1280,
    aiPrecisionError: 38,
    aiReaction: 0.1,
    aiPredictionWeight: 0.84,
    aiJitter: 22,
    aiErrorDrift: 0.14,
    aiAdvanceFactor: 0.38,
    aiWhiffChance: 0.26,
    aiWhiffDurationMin: 0.22,
    aiWhiffDurationMax: 0.46,
    aiWhiffOffsetMin: 58,
    aiWhiffOffsetMax: 118,
    aiWhiffCooldownMin: 1.6,
    aiWhiffCooldownMax: 3.0
  }
};

export const DIFFICULTY_ORDER = ["rookie", "arcade", "pro"];

export const AI_PERSONALITIES = {
  calm: {
    key: "calm",
    label: "CALM",
    centerBias: 0.32,
    aggression: 0.7,
    precisionFactor: 1.05
  },
  balanced: {
    key: "balanced",
    label: "BAL",
    centerBias: 0.2,
    aggression: 1,
    precisionFactor: 1
  },
  hunter: {
    key: "hunter",
    label: "HUNT",
    centerBias: 0.08,
    aggression: 1.18,
    precisionFactor: 0.86
  }
};

export const STORAGE_KEYS = {
  wins: "pong_arcade_wins",
  bestRally: "pong_arcade_best_rally"
};
