import PongAudio from "./PongAudio";
import {
  AI_PERSONALITIES,
  BALL_CONFIG,
  DIFFICULTY_ORDER,
  DIFFICULTY_PRESETS,
  FIXED_DT,
  MATCH_CONFIG,
  MAX_FRAME_DELTA,
  PADDLE_CONFIG,
  PONG_HEIGHT,
  PONG_WIDTH,
  STORAGE_KEYS
} from "./constants";

const CENTER_X = PONG_WIDTH * 0.5;
const CENTER_Y = PONG_HEIGHT * 0.5;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const approach = (value, target, maxDelta) => {
  if (value < target) {
    return Math.min(target, value + maxDelta);
  }
  if (value > target) {
    return Math.max(target, value - maxDelta);
  }
  return target;
};
const lerp = (a, b, t) => a + (b - a) * t;

const normalizeVector = (vx, vy) => {
  const length = Math.hypot(vx, vy);
  if (length <= 0.0001) {
    return { vx: 1, vy: 0 };
  }
  return { vx: vx / length, vy: vy / length };
};

const randomRange = (min, max) => min + Math.random() * (max - min);

const readStoredNumber = (key, fallback = 0) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
};

const writeStoredNumber = (key, value) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(key, String(Math.trunc(value)));
  } catch {
    // Ignore quota/storage errors.
  }
};

const toTimerString = (seconds) => {
  const safe = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const createParticle = (x, y, color, speed = 180) => {
  const angle = randomRange(0, Math.PI * 2);
  return {
    x,
    y,
    vx: Math.cos(angle) * randomRange(speed * 0.35, speed),
    vy: Math.sin(angle) * randomRange(speed * 0.35, speed),
    life: randomRange(0.25, 0.56),
    radius: randomRange(1.4, 3.8),
    color,
    gravity: randomRange(50, 120)
  };
};

const getPersonalityByState = (playerScore, aiScore, secondsRemaining) => {
  const lead = playerScore - aiScore;
  if (lead >= 2 || (lead >= 1 && secondsRemaining < 45)) {
    return AI_PERSONALITIES.hunter;
  }
  if (lead <= -2 || (lead <= -1 && secondsRemaining < 45)) {
    return AI_PERSONALITIES.calm;
  }
  return AI_PERSONALITIES.balanced;
};

export default class PongRuntime {
  constructor({ canvas, onSnapshot, initialDifficulty = "arcade", onFullscreenRequest }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.onSnapshot = onSnapshot;
    this.onFullscreenRequest = onFullscreenRequest;

    this.audio = new PongAudio();

    this.width = PONG_WIDTH;
    this.height = PONG_HEIGHT;
    const goalHeight = clamp(
      this.height * MATCH_CONFIG.goalOpeningRatio,
      MATCH_CONFIG.goalOpeningMinHeight,
      this.height - 80
    );
    const goalTop = (this.height - goalHeight) * 0.5;
    this.goalArea = {
      top: goalTop,
      bottom: goalTop + goalHeight
    };

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.running = false;
    this.rafId = null;
    this.lastTimestamp = 0;
    this.accumulator = 0;
    this.snapshotAccumulator = 0;

    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      virtualAxis: 0,
      mouseY: null,
      lastMouseAt: -999,
      pointerInside: false
    };

    this.difficultyKey = DIFFICULTY_PRESETS[initialDifficulty] ? initialDifficulty : "arcade";
    this.soundEnabled = true;

    this.statusFlash = 0;
    this.wallPulse = 0;
    this.elapsed = 0;
    this.prevModeBeforePause = "countdown";

    this.bestRally = readStoredNumber(STORAGE_KEYS.bestRally, 0);
    this.totalWins = readStoredNumber(STORAGE_KEYS.wins, 0);

    const halfPadW = PADDLE_CONFIG.width * 0.5;

    this.playerPaddle = {
      x: PADDLE_CONFIG.margin,
      y: CENTER_Y,
      width: PADDLE_CONFIG.width,
      halfHeight: PADDLE_CONFIG.height * 0.5,
      vx: 0,
      vy: 0,
      targetY: CENTER_Y,
      xMin: halfPadW,
      xMax: CENTER_X - halfPadW
    };

    this.aiPaddle = {
      x: this.width - PADDLE_CONFIG.margin,
      y: CENTER_Y,
      width: PADDLE_CONFIG.width,
      halfHeight: PADDLE_CONFIG.height * 0.5,
      vx: 0,
      vy: 0,
      targetY: CENTER_Y,
      xMin: CENTER_X + halfPadW,
      xMax: this.width - halfPadW,
      speedCap: DIFFICULTY_PRESETS[this.difficultyKey].aiBaseSpeed,
      personality: AI_PERSONALITIES.balanced
    };

    this.ball = {
      x: CENTER_X,
      y: CENTER_Y,
      vx: 1,
      vy: 0,
      speed: BALL_CONFIG.serveSpeed,
      spin: 0,
      radius: BALL_CONFIG.radius,
      lastTouchedBy: "none",
      trail: []
    };

    this.aiMistake = {
      active: false,
      until: 0,
      offset: 0,
      mode: "offset",
      cooldownUntil: 0
    };

    this.particles = [];

    this.state = {
      variant: "pong",
      coordinates: "origin_top_left_x_right_y_down_pixels",
      mode: "menu",
      message: "Pulsa START para jugar.",
      playerScore: 0,
      aiScore: 0,
      targetScore: MATCH_CONFIG.targetScore,
      round: 1,
      serveDirection: 1,
      serveCountdown: MATCH_CONFIG.startCountdown,
      roundBreak: 0,
      secondsRemaining: MATCH_CONFIG.matchSeconds,
      elapsedSeconds: 0,
      rallyHits: 0,
      longestRally: 0,
      comboWindow: 0,
      lastEnglish: 0,
      aiProfile: AI_PERSONALITIES.balanced.label,
      aiSpeedCap: DIFFICULTY_PRESETS[this.difficultyKey].aiBaseSpeed,
      playerControlMode: "mouse",
      soundEnabled: this.soundEnabled,
      difficultyKey: this.difficultyKey,
      difficultyLabel: DIFFICULTY_PRESETS[this.difficultyKey].label,
      ballMaxSpeed: this.getBallMaxSpeed(),
      playerWins: this.totalWins,
      bestRally: this.bestRally,
      timerLabel: toTimerString(MATCH_CONFIG.matchSeconds),
      winner: null,
      fps: 60,
      frameTime: 16.67,
      fullscreen: false,
      goalTop: Math.round(this.goalArea.top),
      goalBottom: Math.round(this.goalArea.bottom)
    };

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerLeave = this.handlePointerLeave.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.loop = this.loop.bind(this);

    this.attachListeners();
    this.resetForMenu();
    this.publishSnapshot(true);
    this.render();
  }

  attachListeners() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    this.canvas.addEventListener("mousemove", this.handlePointerMove);
    this.canvas.addEventListener("mouseleave", this.handlePointerLeave);
    this.canvas.addEventListener("mousedown", this.handlePointerDown);
    this.canvas.addEventListener("touchstart", this.handlePointerDown, { passive: false });
    this.canvas.addEventListener("touchmove", this.handlePointerMove, { passive: false });
    this.canvas.addEventListener("touchend", this.handlePointerLeave, { passive: false });
    this.canvas.addEventListener("touchcancel", this.handlePointerLeave, { passive: false });
  }

  detachListeners() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);

    this.canvas.removeEventListener("mousemove", this.handlePointerMove);
    this.canvas.removeEventListener("mouseleave", this.handlePointerLeave);
    this.canvas.removeEventListener("mousedown", this.handlePointerDown);
    this.canvas.removeEventListener("touchstart", this.handlePointerDown);
    this.canvas.removeEventListener("touchmove", this.handlePointerMove);
    this.canvas.removeEventListener("touchend", this.handlePointerLeave);
    this.canvas.removeEventListener("touchcancel", this.handlePointerLeave);
  }

  start() {
    if (this.running) {
      return;
    }
    this.running = true;
    this.lastTimestamp = 0;
    this.accumulator = 0;
    this.rafId = window.requestAnimationFrame(this.loop);
  }
  stop() {
    this.running = false;
    if (this.rafId) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  destroy() {
    this.stop();
    this.detachListeners();
    this.audio.dispose();
  }

  handleVisibilityChange() {
    if (document.visibilityState !== "hidden") {
      return;
    }
    if (this.state.mode === "playing" || this.state.mode === "countdown" || this.state.mode === "roundBreak") {
      this.togglePause(true);
    }
  }

  handleKeyDown(event) {
    const { code } = event;

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(code)) {
      event.preventDefault();
    }

    if (code === "ArrowUp" || code === "KeyW") {
      this.input.up = true;
      return;
    }

    if (code === "ArrowDown" || code === "KeyS") {
      this.input.down = true;
      return;
    }

    if (code === "ArrowLeft" || code === "KeyA") {
      this.input.left = true;
      return;
    }

    if (code === "ArrowRight" || code === "KeyD") {
      this.input.right = true;
      return;
    }

    if (code === "Enter" || code === "Space") {
      this.triggerPrimaryAction();
      return;
    }

    if (code === "KeyP") {
      this.togglePause();
      return;
    }

    if (code === "Escape") {
      if (this.state.mode === "paused") {
        this.togglePause();
      } else if (this.state.mode === "playing" || this.state.mode === "countdown" || this.state.mode === "roundBreak") {
        this.togglePause(true);
      }
      return;
    }

    if (code === "KeyR") {
      this.restartMatch();
      return;
    }

    if (code === "KeyM") {
      this.toggleSound();
      return;
    }

    if (code === "KeyF") {
      this.onFullscreenRequest?.();
      return;
    }

    if (code === "Digit1") {
      this.setDifficulty("rookie");
      return;
    }

    if (code === "Digit2") {
      this.setDifficulty("arcade");
      return;
    }

    if (code === "Digit3") {
      this.setDifficulty("pro");
    }
  }

  handleKeyUp(event) {
    const { code } = event;

    if (code === "ArrowUp" || code === "KeyW") {
      this.input.up = false;
      return;
    }

    if (code === "ArrowDown" || code === "KeyS") {
      this.input.down = false;
      return;
    }

    if (code === "ArrowLeft" || code === "KeyA") {
      this.input.left = false;
      return;
    }

    if (code === "ArrowRight" || code === "KeyD") {
      this.input.right = false;
    }
  }

  getPointerFromEvent(event) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return null;
    }

    let clientX = null;
    let clientY = null;

    if (event.touches && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if (event.changedTouches && event.changedTouches.length > 0) {
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    } else if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      return null;
    }

    const x = ((clientX - rect.left) / rect.width) * this.width;
    const y = ((clientY - rect.top) / rect.height) * this.height;

    return { x, y };
  }

  handlePointerMove(event) {
    if (event.cancelable) {
      event.preventDefault();
    }
    const pointer = this.getPointerFromEvent(event);
    if (!pointer) {
      return;
    }

    this.input.pointerInside = true;
    this.input.mouseY = clamp(pointer.y, this.playerPaddle.halfHeight, this.height - this.playerPaddle.halfHeight);
    this.input.lastMouseAt = this.elapsed;
  }

  handlePointerLeave(event) {
    if (event.cancelable) {
      event.preventDefault();
    }
    this.input.pointerInside = false;
    this.input.mouseY = null;
    this.input.lastMouseAt = this.elapsed - 10;
  }

  handlePointerDown(event) {
    if (event.cancelable) {
      event.preventDefault();
    }

    const pointer = this.getPointerFromEvent(event);
    if (pointer) {
      this.input.pointerInside = true;
      this.input.mouseY = clamp(pointer.y, this.playerPaddle.halfHeight, this.height - this.playerPaddle.halfHeight);
      this.input.lastMouseAt = this.elapsed;
    }

    this.triggerPrimaryAction();
    this.audio.ensureContext();
  }

  triggerPrimaryAction() {
    if (this.state.mode === "menu" || this.state.mode === "finished") {
      this.startMatch();
      return;
    }

    if (this.state.mode === "paused") {
      this.togglePause(false);
    }
  }

  setVirtualAxis(value) {
    const safe = clamp(Number(value) || 0, -1, 1);
    this.input.virtualAxis = safe;
    if (safe !== 0) {
      this.input.mouseY = null;
      this.input.lastMouseAt = this.elapsed - 10;
    }
  }

  setFullscreenState(enabled) {
    this.state.fullscreen = Boolean(enabled);
    this.publishSnapshot(true);
  }

  getBallMaxSpeed() {
    const preset = DIFFICULTY_PRESETS[this.difficultyKey] || DIFFICULTY_PRESETS.arcade;
    return Number.isFinite(preset?.maxBallSpeed) ? preset.maxBallSpeed : BALL_CONFIG.maxSpeed;
  }

  clampBallSpeed() {
    this.ball.speed = clamp(this.ball.speed, BALL_CONFIG.minSpeed, this.getBallMaxSpeed());
    return this.ball.speed;
  }

  setDifficulty(key) {
    if (!DIFFICULTY_PRESETS[key]) {
      return;
    }

    this.difficultyKey = key;
    this.state.difficultyKey = key;
    this.state.difficultyLabel = DIFFICULTY_PRESETS[key].label;
    this.state.ballMaxSpeed = this.getBallMaxSpeed();
    this.clampBallSpeed();
    this.state.message = `Dificultad ${DIFFICULTY_PRESETS[key].label}`;
    this.statusFlash = 0.42;
    this.publishSnapshot(true);
  }

  cycleDifficulty() {
    const index = DIFFICULTY_ORDER.indexOf(this.difficultyKey);
    const safeIndex = index === -1 ? 0 : index;
    const nextKey = DIFFICULTY_ORDER[(safeIndex + 1) % DIFFICULTY_ORDER.length];
    this.setDifficulty(nextKey);
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.audio.setEnabled(this.soundEnabled);
    this.state.soundEnabled = this.soundEnabled;
    this.state.message = this.soundEnabled ? "Audio activado" : "Audio silenciado";
    this.statusFlash = 0.35;
    this.publishSnapshot(true);
  }

  togglePause(forcePause = null) {
    const isGameActive = this.state.mode === "playing" || this.state.mode === "countdown" || this.state.mode === "roundBreak";

    if (this.state.mode === "paused") {
      if (forcePause === true) {
        return;
      }
      this.state.mode = this.prevModeBeforePause || "playing";
      this.state.message = "Partida reanudada";
      this.audio.playPauseCue(false);
      this.statusFlash = 0.28;
      this.publishSnapshot(true);
      return;
    }

    if (!isGameActive) {
      return;
    }

    if (forcePause === false || forcePause === true || isGameActive) {
      this.prevModeBeforePause = this.state.mode;
      this.state.mode = "paused";
      this.state.message = "Partida en pausa";
      this.audio.playPauseCue(true);
      this.statusFlash = 0.28;
      this.publishSnapshot(true);
    }
  }

  restartMatch() {
    this.prepareMatchState();
    this.state.message = "Reinicio rapido";
    this.state.mode = "countdown";
    this.state.serveCountdown = MATCH_CONFIG.startCountdown;
    this.state.serveDirection = Math.random() < 0.5 ? -1 : 1;
    this.placeBallForServe(this.state.serveDirection);
    this.statusFlash = 0.6;
    this.publishSnapshot(true);
  }

  resetForMenu() {
    this.prepareMatchState();
    this.state.mode = "menu";
    this.state.message = "Pulsa START para jugar";
    this.state.serveCountdown = MATCH_CONFIG.startCountdown;
    this.state.winner = null;
    this.state.playerWins = this.totalWins;
    this.state.bestRally = this.bestRally;
    this.placeBallForServe(1);
  }

  prepareMatchState() {
    this.state.playerScore = 0;
    this.state.aiScore = 0;
    this.state.round = 1;
    this.state.secondsRemaining = MATCH_CONFIG.matchSeconds;
    this.state.elapsedSeconds = 0;
    this.state.timerLabel = toTimerString(MATCH_CONFIG.matchSeconds);
    this.state.rallyHits = 0;
    this.state.longestRally = 0;
    this.state.comboWindow = 0;
    this.state.lastEnglish = 0;
    this.state.roundBreak = 0;
    this.state.winner = null;

    this.playerPaddle.x = PADDLE_CONFIG.margin;
    this.playerPaddle.y = CENTER_Y;
    this.playerPaddle.vx = 0;
    this.playerPaddle.vy = 0;

    this.aiPaddle.x = this.width - PADDLE_CONFIG.margin;
    this.aiPaddle.y = CENTER_Y;
    this.aiPaddle.vx = 0;
    this.aiPaddle.vy = 0;

    this.ball.trail.length = 0;
    this.ball.speed = BALL_CONFIG.serveSpeed;
    this.ball.spin = 0;
    this.ball.lastTouchedBy = "none";

    this.aiMistake.active = false;
    this.aiMistake.until = 0;
    this.aiMistake.offset = 0;
    this.aiMistake.mode = "offset";
    this.aiMistake.cooldownUntil = 0;
  }

  startMatch() {
    this.prepareMatchState();
    this.state.mode = "countdown";
    this.state.serveCountdown = MATCH_CONFIG.startCountdown;
    this.state.serveDirection = Math.random() < 0.5 ? -1 : 1;
    this.state.message = "START!";
    this.statusFlash = 0.65;
    this.placeBallForServe(this.state.serveDirection);
    this.publishSnapshot(true);
  }

  finishMatch() {
    const playerWon = this.state.playerScore >= this.state.aiScore;
    this.state.mode = "finished";
    this.state.winner = playerWon ? "player" : "ai";
    this.state.message = playerWon ? "Victoria del jugador" : "COM gana la partida";

    if (playerWon) {
      this.totalWins += 1;
      writeStoredNumber(STORAGE_KEYS.wins, this.totalWins);
      this.state.playerWins = this.totalWins;
    }

    this.audio.playRoundEndCue(playerWon);
    this.statusFlash = 0.85;
    this.publishSnapshot(true);
  }

  placeBallForServe(direction = 1) {
    this.ball.x = CENTER_X;
    this.ball.y = CENTER_Y;
    this.ball.vx = direction;
    this.ball.vy = 0;
    this.ball.speed = BALL_CONFIG.serveSpeed;
    this.clampBallSpeed();
    this.ball.spin = 0;
    this.ball.trail.length = 0;
    this.ball.lastTouchedBy = "none";
  }

  serveBall() {
    const direction = this.state.serveDirection || 1;
    const angle = randomRange(-0.34, 0.34);
    const vector = normalizeVector(Math.cos(angle) * direction, Math.sin(angle));

    this.ball.vx = vector.vx;
    this.ball.vy = vector.vy;
    this.ball.speed = clamp(
      BALL_CONFIG.serveSpeed + (this.state.playerScore + this.state.aiScore) * 8,
      BALL_CONFIG.minSpeed,
      this.getBallMaxSpeed()
    );
    this.clampBallSpeed();
    this.ball.spin = 0;
    this.ball.lastTouchedBy = "none";

    this.state.mode = "playing";
    this.state.message = direction > 0 ? "Saque para 1P" : "Saque para COM";
    this.audio.playServeCue();
    this.statusFlash = 0.18;
  }

  isBallInsideGoalLane() {
    const minY = this.goalArea.top + this.ball.radius;
    const maxY = this.goalArea.bottom - this.ball.radius;
    return this.ball.y >= minY && this.ball.y <= maxY;
  }

  bounceFromSideWall(side) {
    if (side === "left") {
      this.ball.x = this.ball.radius;
      this.ball.vx = Math.abs(this.ball.vx);
    } else {
      this.ball.x = this.width - this.ball.radius;
      this.ball.vx = -Math.abs(this.ball.vx);
    }
    this.ball.speed *= BALL_CONFIG.wallSpeedDamp;
    this.clampBallSpeed();
    this.wallPulse = 0.55;
    this.audio.playWallCue();
  }

  registerGoal(scoredBy) {
    const playerScored = scoredBy === "player";

    if (playerScored) {
      this.state.playerScore += 1;
    } else {
      this.state.aiScore += 1;
    }

    this.state.longestRally = Math.max(this.state.longestRally, this.state.rallyHits);
    this.bestRally = Math.max(this.bestRally, this.state.longestRally);
    writeStoredNumber(STORAGE_KEYS.bestRally, this.bestRally);
    this.state.bestRally = this.bestRally;

    this.state.rallyHits = 0;
    this.state.comboWindow = 0;
    this.state.lastEnglish = 0;
    this.state.round += 1;

    this.audio.playGoalCue(playerScored);

    const burstColor = playerScored ? "#22d3ee" : "#f97316";
    for (let index = 0; index < 18; index += 1) {
      this.particles.push(createParticle(CENTER_X, CENTER_Y, burstColor, 220));
    }

    if (
      this.state.playerScore >= this.state.targetScore ||
      this.state.aiScore >= this.state.targetScore ||
      this.state.secondsRemaining <= 0
    ) {
      this.finishMatch();
      return;
    }

    this.state.mode = "roundBreak";
    this.state.roundBreak = MATCH_CONFIG.roundBreakSeconds;
    this.state.serveDirection = playerScored ? -1 : 1;
    this.state.message = playerScored ? "Punto para 1P" : "Punto para COM";
    this.placeBallForServe(this.state.serveDirection);
    this.statusFlash = 0.4;
  }

  getAdaptiveAiParams() {
    const preset = DIFFICULTY_PRESETS[this.difficultyKey] || DIFFICULTY_PRESETS.arcade;
    const personality = getPersonalityByState(
      this.state.playerScore,
      this.state.aiScore,
      this.state.secondsRemaining
    );

    const leadPressure = clamp((this.state.playerScore - this.state.aiScore) * 0.16, -0.35, 0.55);
    const timePressure = clamp(1 - this.state.secondsRemaining / MATCH_CONFIG.matchSeconds, 0, 1);
    const rallyPressure = clamp(this.state.rallyHits / 18, 0, 0.8);

    const pressure = clamp(leadPressure * 0.85 + timePressure * 0.62 + rallyPressure * 0.54, -0.28, 1);

    const speedCap = clamp(
      preset.aiBaseSpeed + pressure * 210 * personality.aggression,
      preset.aiBaseSpeed * 0.8,
      this.getBallMaxSpeed() * 0.92
    );

    const reaction = clamp(preset.aiReaction - pressure * 0.04, 0.06, 0.28);
    const errorCap = Math.max(90, preset.aiPrecisionError * 1.35);

    const error = clamp(
      preset.aiPrecisionError * personality.precisionFactor * (1 - pressure * 0.22),
      7,
      errorCap
    );

    return {
      speedCap,
      reaction,
      error,
      jitter: preset.aiJitter,
      predictionWeight: clamp(preset.aiPredictionWeight + pressure * 0.05, 0.45, 0.96),
      errorDrift: Number.isFinite(preset.aiErrorDrift) ? preset.aiErrorDrift : 0.12,
      advanceFactor: Number.isFinite(preset.aiAdvanceFactor) ? preset.aiAdvanceFactor : 0.38,
      whiffChance: Number.isFinite(preset.aiWhiffChance) ? preset.aiWhiffChance : 0,
      whiffDurationMin: Number.isFinite(preset.aiWhiffDurationMin) ? preset.aiWhiffDurationMin : 0.2,
      whiffDurationMax: Number.isFinite(preset.aiWhiffDurationMax) ? preset.aiWhiffDurationMax : 0.48,
      whiffOffsetMin: Number.isFinite(preset.aiWhiffOffsetMin) ? preset.aiWhiffOffsetMin : 40,
      whiffOffsetMax: Number.isFinite(preset.aiWhiffOffsetMax) ? preset.aiWhiffOffsetMax : 112,
      whiffCooldownMin: Number.isFinite(preset.aiWhiffCooldownMin) ? preset.aiWhiffCooldownMin : 0.95,
      whiffCooldownMax: Number.isFinite(preset.aiWhiffCooldownMax) ? preset.aiWhiffCooldownMax : 1.8,
      forcedMistakes: Boolean(preset.aiForcedMistakes),
      pauseMistakeChance: Number.isFinite(preset.aiPauseMistakeChance) ? preset.aiPauseMistakeChance : 0,
      wrongWayMistakeChance: Number.isFinite(preset.aiWrongWayMistakeChance) ? preset.aiWrongWayMistakeChance : 0,
      personality
    };
  }

  predictBallYAtX(targetX) {
    if (this.ball.vx <= 0.01) {
      return CENTER_Y;
    }

    const travelTime = (targetX - this.ball.x - this.ball.radius) / (this.ball.vx * this.ball.speed);
    if (!Number.isFinite(travelTime) || travelTime <= 0) {
      return CENTER_Y;
    }

    let projectedY = this.ball.y + this.ball.vy * this.ball.speed * travelTime;

    const minY = this.ball.radius;
    const maxY = this.height - this.ball.radius;

    while (projectedY < minY || projectedY > maxY) {
      if (projectedY < minY) {
        projectedY = minY + (minY - projectedY);
      } else if (projectedY > maxY) {
        projectedY = maxY - (projectedY - maxY);
      }
    }

    return projectedY;
  }

  updatePlayerPaddle(dt) {
    const paddle = this.playerPaddle;
    const keyboardAxis = (this.input.down ? 1 : 0) - (this.input.up ? 1 : 0) + this.input.virtualAxis;

    const mouseRecentlyMoved =
      this.input.mouseY !== null &&
      this.input.pointerInside &&
      this.elapsed - this.input.lastMouseAt < 0.45 &&
      Math.abs(keyboardAxis) < 0.1;

    let desiredVy = 0;

    if (mouseRecentlyMoved) {
      const targetY = clamp(this.input.mouseY, paddle.halfHeight, this.height - paddle.halfHeight);
      paddle.targetY = targetY;
      desiredVy = clamp(
        (targetY - paddle.y) * PADDLE_CONFIG.mouseFollowGain,
        -PADDLE_CONFIG.mouseMaxSpeed,
        PADDLE_CONFIG.mouseMaxSpeed
      );
      this.state.playerControlMode = "mouse";
    } else if (keyboardAxis !== 0) {
      desiredVy = clamp(
        keyboardAxis * PADDLE_CONFIG.keyboardMaxSpeed,
        -PADDLE_CONFIG.keyboardMaxSpeed,
        PADDLE_CONFIG.keyboardMaxSpeed
      );
      this.state.playerControlMode = "keyboard";
    }

    paddle.vy = approach(paddle.vy, desiredVy, PADDLE_CONFIG.keyboardAcceleration * dt);

    if (keyboardAxis === 0 && !mouseRecentlyMoved) {
      paddle.vy = approach(paddle.vy, 0, PADDLE_CONFIG.keyboardDrag * dt);
    }

    paddle.y += paddle.vy * dt;

    if (paddle.y - paddle.halfHeight < 0) {
      paddle.y = paddle.halfHeight;
      paddle.vy = Math.max(0, paddle.vy);
    }

    if (paddle.y + paddle.halfHeight > this.height) {
      paddle.y = this.height - paddle.halfHeight;
      paddle.vy = Math.min(0, paddle.vy);
    }

    // Horizontal movement (A/D or ArrowLeft/ArrowRight), constrained to left half
    const hAxis = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    const desiredVx = hAxis !== 0
      ? clamp(hAxis * PADDLE_CONFIG.keyboardHMaxSpeed, -PADDLE_CONFIG.keyboardHMaxSpeed, PADDLE_CONFIG.keyboardHMaxSpeed)
      : 0;
    paddle.vx = approach(paddle.vx, desiredVx, PADDLE_CONFIG.keyboardHAcceleration * dt);
    if (hAxis === 0) {
      paddle.vx = approach(paddle.vx, 0, PADDLE_CONFIG.keyboardHDrag * dt);
    }
    paddle.x = clamp(paddle.x + paddle.vx * dt, paddle.xMin, paddle.xMax);
  }

  updateAiPaddle(dt) {
    const paddle = this.aiPaddle;
    const aiParams = this.getAdaptiveAiParams();

    paddle.speedCap = aiParams.speedCap;
    paddle.personality = aiParams.personality;

    this.state.aiSpeedCap = Math.round(aiParams.speedCap);
    this.state.aiProfile = aiParams.personality.label;

    let targetY = CENTER_Y;

    const ballIncoming = this.ball.vx > 0;
    if (this.state.mode === "playing" && ballIncoming) {
      const predicted = this.predictBallYAtX(paddle.x - paddle.width * 0.6);
      const jitterScale = 1 - clamp(this.state.rallyHits / 22, 0, 0.62);
      const jitter =
        Math.sin(this.elapsed * 8.5 + this.state.round * 0.65) *
        aiParams.jitter *
        jitterScale;
      let noisyPrediction = predicted + jitter + randomRange(-aiParams.error, aiParams.error) * aiParams.errorDrift;

      if (aiParams.whiffChance > 0) {
        if (this.aiMistake.active && this.elapsed >= this.aiMistake.until) {
          this.aiMistake.active = false;
          this.aiMistake.offset = 0;
          this.aiMistake.mode = "offset";
        }

        if (!this.aiMistake.active && this.elapsed >= this.aiMistake.cooldownUntil) {
          const dangerWindow = clamp((this.ball.x - CENTER_X) / CENTER_X, 0, 1);
          const triggerRate = aiParams.whiffChance * (0.35 + dangerWindow * 0.95);
          const shouldForceMistake = aiParams.forcedMistakes && (dangerWindow > 0.18 || Math.random() < 0.12);
          if (shouldForceMistake || Math.random() < triggerRate * dt) {
            const direction = Math.random() < 0.5 ? -1 : 1;
            const mistakeRoll = Math.random();
            this.aiMistake.active = true;
            this.aiMistake.offset =
              direction * randomRange(aiParams.whiffOffsetMin, aiParams.whiffOffsetMax);
            this.aiMistake.mode = mistakeRoll < aiParams.pauseMistakeChance
              ? "pause"
              : mistakeRoll < aiParams.pauseMistakeChance + aiParams.wrongWayMistakeChance
                ? "wrongWay"
                : "offset";
            this.aiMistake.until =
              this.elapsed + randomRange(aiParams.whiffDurationMin, aiParams.whiffDurationMax);
            this.aiMistake.cooldownUntil =
              this.elapsed + randomRange(aiParams.whiffCooldownMin, aiParams.whiffCooldownMax);
          }
        }

        if (this.aiMistake.active) {
          if (this.aiMistake.mode === "pause") {
            noisyPrediction = paddle.y;
          } else if (this.aiMistake.mode === "wrongWay") {
            const awayDirection = predicted >= paddle.y ? -1 : 1;
            noisyPrediction = paddle.y + awayDirection * Math.abs(this.aiMistake.offset);
          } else {
            noisyPrediction += this.aiMistake.offset;
          }
        }
      } else if (this.aiMistake.active) {
        this.aiMistake.active = false;
        this.aiMistake.offset = 0;
        this.aiMistake.mode = "offset";
      }

      targetY = lerp(paddle.y, noisyPrediction, aiParams.predictionWeight);
    } else {
      if (this.aiMistake.active) {
        this.aiMistake.active = false;
        this.aiMistake.offset = 0;
        this.aiMistake.mode = "offset";
      }
      const centerOffset = Math.sin(this.elapsed * 1.2 + this.state.round * 0.3) * aiParams.jitter * 0.12;
      targetY = lerp(paddle.y, CENTER_Y + centerOffset, PADDLE_CONFIG.aiCenterPull + aiParams.personality.centerBias * 0.25);
    }

    paddle.targetY = clamp(targetY, paddle.halfHeight, this.height - paddle.halfHeight);

    const desiredVy = clamp((paddle.targetY - paddle.y) * (11 - aiParams.reaction * 20), -aiParams.speedCap, aiParams.speedCap);
    paddle.vy = approach(paddle.vy, desiredVy, PADDLE_CONFIG.aiAcceleration * dt);

    if (Math.abs(desiredVy) < 0.8) {
      paddle.vy = approach(paddle.vy, 0, PADDLE_CONFIG.aiDrag * dt);
    }

    paddle.y += paddle.vy * dt;

    if (paddle.y - paddle.halfHeight < 0) {
      paddle.y = paddle.halfHeight;
      paddle.vy = Math.max(0, paddle.vy);
    }

    if (paddle.y + paddle.halfHeight > this.height) {
      paddle.y = this.height - paddle.halfHeight;
      paddle.vy = Math.min(0, paddle.vy);
    }

    // Horizontal movement — AI advances when ball is incoming, retreats otherwise
    const defaultAiX = this.width - PADDLE_CONFIG.margin;
    let targetAiX = defaultAiX;
    if (this.state.mode === "playing" && this.ball.vx > 0) {
      const maxAdvance = (defaultAiX - paddle.xMin) * aiParams.advanceFactor * aiParams.personality.aggression;
      targetAiX = clamp(defaultAiX - maxAdvance, paddle.xMin, defaultAiX);
    }
    const desiredVx = clamp((targetAiX - paddle.x) * 5, -PADDLE_CONFIG.aiHMaxSpeed, PADDLE_CONFIG.aiHMaxSpeed);
    paddle.vx = approach(paddle.vx, desiredVx, PADDLE_CONFIG.aiHAcceleration * dt);
    if (Math.abs(desiredVx) < 0.8) {
      paddle.vx = approach(paddle.vx, 0, PADDLE_CONFIG.aiHDrag * dt);
    }
    paddle.x = clamp(paddle.x + paddle.vx * dt, paddle.xMin, paddle.xMax);
  }

  updatePaddles(dt) {
    this.updatePlayerPaddle(dt);
    this.updateAiPaddle(dt);
  }

  detectPaddleCollision(paddle, side) {
    const halfWidth = paddle.width * 0.5;
    const withinX = Math.abs(this.ball.x - paddle.x) <= halfWidth + this.ball.radius;
    const withinY = Math.abs(this.ball.y - paddle.y) <= paddle.halfHeight + this.ball.radius;

    if (!withinX || !withinY) {
      return false;
    }

    // Use relative horizontal velocity instead of only ball.vx:
    // if the paddle moves into the ball, the hit should still be valid.
    const ballVxPx = this.ball.vx * this.ball.speed;
    const relativeVx = ballVxPx - paddle.vx;
    const epsilon = 0.5;

    if (side === "player" && relativeVx >= -epsilon) {
      return false;
    }

    if (side === "ai" && relativeVx <= epsilon) {
      return false;
    }

    return true;
  }

  applyPaddleBounce(paddle, side) {
    const direction = side === "player" ? 1 : -1;
    const paddleVelocityMax = side === "player" ? PADDLE_CONFIG.keyboardMaxSpeed : this.aiPaddle.speedCap;

    const relativeContact = clamp((this.ball.y - paddle.y) / paddle.halfHeight, -1.15, 1.15);
    const velocityContact = clamp(paddle.vy / Math.max(180, paddleVelocityMax), -1.2, 1.2);
    const english = clamp(relativeContact * 0.9 + velocityContact * 0.42, -1.25, 1.25);

    const bounceAngle = english * BALL_CONFIG.maxBounceAngle;
    const velocity = normalizeVector(direction * Math.cos(bounceAngle), Math.sin(bounceAngle) + randomRange(-0.04, 0.04));

    this.ball.x = paddle.x + direction * (paddle.width * 0.5 + this.ball.radius + 0.2);
    this.ball.vx = velocity.vx;
    this.ball.vy = velocity.vy;
    this.ball.speed = clamp(
      this.ball.speed + BALL_CONFIG.hitSpeedGain + Math.abs(english) * BALL_CONFIG.englishSpeedGain,
      BALL_CONFIG.minSpeed,
      this.getBallMaxSpeed()
    );
    this.clampBallSpeed();
    this.ball.spin = english;
    this.ball.lastTouchedBy = side;

    this.state.rallyHits += 1;
    this.state.comboWindow = MATCH_CONFIG.maxComboWindow;
    this.state.lastEnglish = Number(english.toFixed(3));

    const glowColor = side === "player" ? "#22d3ee" : "#f59e0b";
    for (let index = 0; index < 6; index += 1) {
      this.particles.push(createParticle(this.ball.x, this.ball.y, glowColor, 180));
    }

    this.audio.playPaddleHitCue(english);
    this.statusFlash = 0.08;
  }

  updateBallTrail() {
    this.ball.trail.unshift({ x: this.ball.x, y: this.ball.y, alpha: 1 });
    if (this.ball.trail.length > BALL_CONFIG.trailLength) {
      this.ball.trail.length = BALL_CONFIG.trailLength;
    }
  }

  updateBall(dt) {
    this.clampBallSpeed();

    this.ball.x += this.ball.vx * this.ball.speed * dt;
    this.ball.y += this.ball.vy * this.ball.speed * dt;

    this.updateBallTrail();

    if (this.ball.y - this.ball.radius <= 0) {
      this.ball.y = this.ball.radius;
      this.ball.vy = Math.abs(this.ball.vy);
      this.ball.speed *= BALL_CONFIG.wallSpeedDamp;
      this.clampBallSpeed();
      this.wallPulse = 0.55;
      this.audio.playWallCue();
    }

    if (this.ball.y + this.ball.radius >= this.height) {
      this.ball.y = this.height - this.ball.radius;
      this.ball.vy = -Math.abs(this.ball.vy);
      this.ball.speed *= BALL_CONFIG.wallSpeedDamp;
      this.clampBallSpeed();
      this.wallPulse = 0.55;
      this.audio.playWallCue();
    }

    if (this.detectPaddleCollision(this.playerPaddle, "player")) {
      this.applyPaddleBounce(this.playerPaddle, "player");
    } else if (this.detectPaddleCollision(this.aiPaddle, "ai")) {
      this.applyPaddleBounce(this.aiPaddle, "ai");
    }

    if (this.ball.x + this.ball.radius < 0) {
      if (this.isBallInsideGoalLane()) {
        this.registerGoal("ai");
        return;
      }
      this.bounceFromSideWall("left");
    }

    if (this.ball.x - this.ball.radius > this.width) {
      if (this.isBallInsideGoalLane()) {
        this.registerGoal("player");
        return;
      }
      this.bounceFromSideWall("right");
    }
  }

  updateParticles(dt) {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.life -= dt;
      if (particle.life <= 0) {
        this.particles.splice(index, 1);
        continue;
      }

      particle.vy += particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.992;
    }

    if (this.particles.length > MATCH_CONFIG.maxParticles) {
      this.particles.splice(MATCH_CONFIG.maxParticles);
    }
  }

  updateMode(dt) {
    if (this.state.mode === "countdown") {
      this.state.serveCountdown = Math.max(0, this.state.serveCountdown - dt);

      const pulse = 0.9 + Math.sin(this.elapsed * 8.5) * 0.05;
      this.ball.x = CENTER_X + Math.cos(this.elapsed * 2) * 3;
      this.ball.y = CENTER_Y + Math.sin(this.elapsed * 3.2) * 4;
      this.ball.speed = BALL_CONFIG.serveSpeed * pulse;
      this.clampBallSpeed();

      if (this.state.serveCountdown <= 0) {
        this.serveBall();
      }
      return;
    }

    if (this.state.mode === "roundBreak") {
      this.state.roundBreak = Math.max(0, this.state.roundBreak - dt);
      if (this.state.roundBreak <= 0) {
        this.state.mode = "countdown";
        this.state.serveCountdown = MATCH_CONFIG.serveDelay;
      }
    }
  }

  update(dt) {
    this.elapsed += dt;
    this.wallPulse = Math.max(0, this.wallPulse - dt * 1.8);
    this.statusFlash = Math.max(0, this.statusFlash - dt * 1.25);

    this.state.frameTime = dt * 1000;
    this.state.fps = dt > 0 ? 1 / dt : 0;

    if (this.state.mode !== "menu" && this.state.mode !== "finished") {
      this.state.elapsedSeconds += dt;
    }

    if (this.state.mode === "playing" || this.state.mode === "countdown" || this.state.mode === "roundBreak") {
      this.state.secondsRemaining = Math.max(0, this.state.secondsRemaining - dt);
      this.state.timerLabel = toTimerString(this.state.secondsRemaining);

      if (this.state.mode === "playing" && this.state.secondsRemaining <= 0) {
        this.finishMatch();
        return;
      }
    }

    if (this.state.comboWindow > 0) {
      this.state.comboWindow = Math.max(0, this.state.comboWindow - dt);
    }

    this.updatePaddles(dt);
    this.updateParticles(dt);
    this.updateMode(dt);

    if (this.state.mode === "playing") {
      this.updateBall(dt);
    } else if (this.state.mode === "menu") {
      this.ball.y = CENTER_Y + Math.sin(this.elapsed * 2) * 32;
      this.ball.x = CENTER_X + Math.cos(this.elapsed * 1.2) * 90;
      this.ball.spin = Math.sin(this.elapsed * 3.5) * 0.35;
      this.updateBallTrail();
    } else if (this.state.mode === "finished") {
      this.ball.x = CENTER_X + Math.cos(this.elapsed * 2.8) * 30;
      this.ball.y = CENTER_Y + Math.sin(this.elapsed * 2.1) * 30;
      this.updateBallTrail();
    }

    this.state.longestRally = Math.max(this.state.longestRally, this.state.rallyHits);
  }

  loop(timestamp) {
    if (!this.running) {
      return;
    }

    if (!this.lastTimestamp) {
      this.lastTimestamp = timestamp;
    }

    let delta = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    if (!Number.isFinite(delta) || delta <= 0) {
      delta = FIXED_DT;
    }

    delta = Math.min(delta, MAX_FRAME_DELTA);
    this.accumulator += delta;

    while (this.accumulator >= FIXED_DT) {
      if (this.state.mode !== "paused") {
        this.update(FIXED_DT);
      }
      this.accumulator -= FIXED_DT;
      this.snapshotAccumulator += FIXED_DT;
    }

    this.render();

    if (this.snapshotAccumulator >= 1 / 30) {
      this.snapshotAccumulator = 0;
      this.publishSnapshot(false);
    }

    this.rafId = window.requestAnimationFrame(this.loop);
  }

  // ─── Snapshot ────────────────────────────────────────────────────────────

  publishSnapshot(force = false) {
    if (!this.onSnapshot) {
      return;
    }

    this.onSnapshot({
      variant:          this.state.variant,
      mode:             this.state.mode,
      message:          this.state.message,
      playerScore:      this.state.playerScore,
      aiScore:          this.state.aiScore,
      targetScore:      this.state.targetScore,
      secondsRemaining: this.state.secondsRemaining,
      timerLabel:       this.state.timerLabel,
      rallyHits:        this.state.rallyHits,
      longestRally:     this.state.longestRally,
      bestRally:        this.state.bestRally,
      playerWins:       this.state.playerWins,
      winner:           this.state.winner,
      difficultyKey:    this.state.difficultyKey,
      difficultyLabel:  this.state.difficultyLabel,
      ballMaxSpeed:     this.state.ballMaxSpeed,
      aiProfile:        this.state.aiProfile,
      soundEnabled:     this.state.soundEnabled,
      playerControlMode: this.state.playerControlMode,
      fullscreen:       this.state.fullscreen,
      fps:              Math.round(this.state.fps),
      goalTop:          this.state.goalTop,
      goalBottom:       this.state.goalBottom
    });
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  render() {
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;

    ctx.fillStyle = "#070b12";
    ctx.fillRect(0, 0, W, H);

    if (this.wallPulse > 0) {
      const alpha = this.wallPulse * 0.35;
      ctx.fillStyle = `rgba(34,211,238,${alpha})`;
      ctx.fillRect(0, 0, W, 4);
      ctx.fillRect(0, H - 4, W, 4);
    }

    this._drawGoalWalls(ctx, W, H);

    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = "rgba(51,65,85,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W * 0.5, 0);
    ctx.lineTo(W * 0.5, H);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = "rgba(30,58,74,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W * 0.5, H * 0.5, 56, 0, Math.PI * 2);
    ctx.stroke();

    const trail = this.ball.trail;
    for (let i = trail.length - 1; i >= 1; i -= 1) {
      const t = i / trail.length;
      const trailAlpha = (1 - t) * 0.42;
      const trailR = this.ball.radius * (1 - t * 0.55);
      ctx.beginPath();
      ctx.arc(trail[i].x, trail[i].y, Math.max(1, trailR), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(248,250,252,${trailAlpha})`;
      ctx.fill();
    }

    const gGlow = ctx.createRadialGradient(
      this.ball.x, this.ball.y, 0,
      this.ball.x, this.ball.y, this.ball.radius * 2.2
    );
    gGlow.addColorStop(0, "rgba(248,250,252,0.22)");
    gGlow.addColorStop(1, "rgba(248,250,252,0)");
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.radius * 2.2, 0, Math.PI * 2);
    ctx.fillStyle = gGlow;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#f8fafc";
    ctx.fill();

    this._drawPaddle(ctx, this.playerPaddle, "#22d3ee");
    this._drawPaddle(ctx, this.aiPaddle, "#f59e0b");

    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      const pAlpha = Math.max(0, p.life / 0.56);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `${p.color}${Math.round(pAlpha * 255).toString(16).padStart(2, "0")}`;
      ctx.fill();
    }

    if (this.statusFlash > 0 && this.state.message) {
      const flashAlpha = Math.min(1, this.statusFlash * 2.4);
      ctx.save();
      ctx.globalAlpha = flashAlpha;
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#f8fafc";
      ctx.fillText(this.state.message, W * 0.5, H - 26);
      ctx.restore();
    }

    if (this.state.mode === "menu") {
      this._drawOverlay(ctx, W, H, "PONG NEON ARENA", "Pulsa START para jugar", "#22d3ee");
    } else if (this.state.mode === "paused") {
      this._drawOverlay(ctx, W, H, "PAUSA", "Pulsa P o CONTINUAR para reanudar", "#94a3b8");
    } else if (this.state.mode === "finished") {
      const won = this.state.winner === "player";
      this._drawOverlay(
        ctx, W, H,
        won ? "VICTORIA" : "DERROTA",
        won ? "Ganaste la partida!" : "COM gana. Vuelve a intentarlo!",
        won ? "#22d3ee" : "#f59e0b"
      );
    } else if (this.state.mode === "countdown") {
      const secs = Math.ceil(this.state.serveCountdown);
      if (secs > 0) {
        ctx.save();
        ctx.font = "bold 64px monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(248,250,252,${0.55 + Math.sin(this.elapsed * 9) * 0.12})`;
        ctx.fillText(String(secs), W * 0.5, H * 0.5 + 22);
        ctx.restore();
      }
    }
  }

  _drawGoalWalls(ctx, W, H) {
    const { top, bottom } = this.goalArea;
    const inset = 2;
    const markerWidth = 46;

    ctx.save();
    ctx.strokeStyle = "rgba(34,211,238,0.45)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(inset, 0);
    ctx.lineTo(inset, top);
    ctx.moveTo(inset, bottom);
    ctx.lineTo(inset, H);
    ctx.moveTo(W - inset, 0);
    ctx.lineTo(W - inset, top);
    ctx.moveTo(W - inset, bottom);
    ctx.lineTo(W - inset, H);
    ctx.stroke();

    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(148,163,184,0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, top);
    ctx.lineTo(markerWidth, top);
    ctx.moveTo(0, bottom);
    ctx.lineTo(markerWidth, bottom);
    ctx.moveTo(W - markerWidth, top);
    ctx.lineTo(W, top);
    ctx.moveTo(W - markerWidth, bottom);
    ctx.lineTo(W, bottom);
    ctx.stroke();
    ctx.restore();
  }

  _drawPaddle(ctx, paddle, color) {
    const hw = paddle.width * 0.5;
    const hh = paddle.halfHeight;
    const x = paddle.x - hw;
    const y = paddle.y - hh;
    const w = paddle.width;
    const h = hh * 2;

    const gGlow = ctx.createRadialGradient(paddle.x, paddle.y, 0, paddle.x, paddle.y, hh * 1.1);
    gGlow.addColorStop(0, `${color}44`);
    gGlow.addColorStop(1, `${color}00`);
    ctx.beginPath();
    ctx.roundRect(x - 6, y - 6, w + 12, h + 12, 10);
    ctx.fillStyle = gGlow;
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 7);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.92;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  _drawOverlay(ctx, W, H, title, subtitle, accentColor) {
    const panelW = 320;
    const panelH = 90;
    const px = (W - panelW) * 0.5;
    const py = (H - panelH) * 0.5;

    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = "#0f1a2a";
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 12);
    ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.55;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 28px monospace";
    ctx.fillStyle = accentColor;
    ctx.fillText(title, W * 0.5, py + 38);
    ctx.font = "13px sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(subtitle, W * 0.5, py + 62);
    ctx.restore();
  }
}
