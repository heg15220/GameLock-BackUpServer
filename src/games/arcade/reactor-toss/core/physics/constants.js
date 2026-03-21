export const STAGE_WIDTH = 960;
export const STAGE_HEIGHT = 540;
export const FIXED_DT_MS = 1000 / 60;

export const BALL_RADIUS = 18;
export const MIN_DRAG_DISTANCE = 14;
export const MAX_DRAG_DISTANCE = 168;
export const MIN_POWER = 0.18;
export const MAX_POWER = 1;
export const MIN_LAUNCH_SPEED = 320;
export const MAX_LAUNCH_SPEED = 1160;
export const MAX_BALL_SPEED = 1480;
export const MAX_AIM_DOTS = 30;
export const TARGET_DWELL_MS = 180;
export const TARGET_SETTLE_SPEED = 160;
export const STUCK_SPEED_THRESHOLD = 20;
export const STUCK_TIME_MS = 1100;
export const FAIL_RESET_MS = 650;
export const SUCCESS_FREEZE_MS = 420;
export const PORTAL_COOLDOWN_MS = 420;
export const SHAKE_DECAY = 6.2;

export const DEFAULT_PHYSICS = {
  gravity: 900,
  restitution: 0.78,
  friction: 0.016,
  drag: 0.014,
  apparentMass: 1,
  linearDamping: 0.028,
  angularDamping: 0.05,
  timeLimitMs: 300000,
  targetHoldMs: TARGET_DWELL_MS,
  settleSpeed: TARGET_SETTLE_SPEED,
  maxBouncesBeforeClamp: 8,
  edgeForgiveness: 15,
};

export const INPUT_PROFILES = {
  standard: {
    dragMultiplier: 1,
    previewDots: 18,
    keyboardAngleStep: 1.5,
    keyboardPowerStep: 0.015,
  },
  comfort: {
    dragMultiplier: 0.8,
    previewDots: 26,
    keyboardAngleStep: 1.1,
    keyboardPowerStep: 0.01,
  },
};

export const RUN_RESULT = {
  none: "none",
  success: "success",
  out: "out",
  hazard: "hazard",
  timeout: "timeout",
  stuck: "stuck",
};

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const lerp = (a, b, t) => a + (b - a) * t;

export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

export const computeLaunchSpeed = (power, { allowOverflow = false } = {}) => {
  const safePower = allowOverflow ? Math.max(power, MIN_POWER) : clamp(power, MIN_POWER, MAX_POWER);
  return clamp(lerp(MIN_LAUNCH_SPEED, MAX_LAUNCH_SPEED, safePower), MIN_LAUNCH_SPEED, MAX_BALL_SPEED);
};
