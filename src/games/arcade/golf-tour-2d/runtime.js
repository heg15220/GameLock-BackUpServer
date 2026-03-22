import {
  GOLF_LEVELS,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  describeLevelForHud,
  getLevelByIndex,
  getTerrainNormal,
  getTerrainY,
  localizeLabel,
} from "./levels";
import { drawGolfScene } from "./render";

const FIXED_DT_MS = 1000 / 60;
const SAVE_KEY = "arcade-golf-tour-2d-save-v2";
const AIR_DRAG = 0.996;
const GRAVITY = 1580;
const BASE_RESTITUTION = 0.33;
const BASE_ROLL_FRICTION = 0.985;
const SLOPE_ACCELERATION = 910;
const STOP_SPEED = 26;

const TOUCH_CONTROLS = { aimLeft: false, aimRight: false, powerUp: false, powerDown: false };

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
function magnitude(x, y) {
  return Math.hypot(x, y);
}
function round(value, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function createSave() {
  return { unlockedLevelIndex: 0, starsByLevel: {}, bestStrokesByLevel: {}, bestTimeByLevel: {} };
}

function sanitizeSave(candidate) {
  if (!candidate || typeof candidate !== "object") {
    return createSave();
  }
  return {
    unlockedLevelIndex: clamp(Number(candidate.unlockedLevelIndex) || 0, 0, GOLF_LEVELS.length - 1),
    starsByLevel:
      candidate.starsByLevel && typeof candidate.starsByLevel === "object"
        ? { ...candidate.starsByLevel }
        : {},
    bestStrokesByLevel:
      candidate.bestStrokesByLevel && typeof candidate.bestStrokesByLevel === "object"
        ? { ...candidate.bestStrokesByLevel }
        : {},
    bestTimeByLevel:
      candidate.bestTimeByLevel && typeof candidate.bestTimeByLevel === "object"
        ? { ...candidate.bestTimeByLevel }
        : {},
  };
}

function loadSave() {
  if (typeof window === "undefined") {
    return createSave();
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SAVE_KEY) ?? "null");
    return sanitizeSave(parsed);
  } catch {
    return createSave();
  }
}

function persistSave(save) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // ignore storage failures
  }
}

function computeStars(level, strokes, elapsedMs, coinsCollected, coinTotal) {
  const targets = level.starTargets;
  const coinBonus = coinTotal > 0 && coinsCollected >= coinTotal ? -1 : 0;
  const effective = strokes + coinBonus;
  if (effective <= targets.three && elapsedMs <= level.timeLimitMs * 1.02) {
    return 3;
  }
  if (effective <= targets.two && elapsedMs <= level.timeLimitMs * 1.18) {
    return 2;
  }
  return 1;
}

function computeQuality(strokes, stars) {
  if (stars >= 3 && strokes <= 3) {
    return "perfect";
  }
  if (stars >= 2) {
    return "clean";
  }
  if (strokes <= 5) {
    return "standard";
  }
  return "recovery";
}

function sumStars(save) {
  return Object.values(save.starsByLevel).reduce((sum, stars) => sum + clamp(Number(stars) || 0, 0, 3), 0);
}

function createBall(level) {
  const terrainY = getTerrainY(level.terrain, level.tee.x);
  return {
    x: level.tee.x,
    y: terrainY - 9.4,
    vx: 0,
    vy: 0,
    radius: 9.4,
    moving: false,
    onGround: true,
    stillMs: 0,
    inCup: false,
    cupDwellMs: 0,
    lastSafeX: level.tee.x,
    lastSafeY: terrainY - 9.4,
  };
}

function makeCoinState(level) {
  return level.coins.map((coin, index) => ({
    id: `${level.id}-coin-${index}`,
    x: coin.x,
    y: coin.y,
    radius: coin.radius,
    collected: false,
  }));
}

function cloneObstacles(level) {
  const src = level.obstacles ?? {};
  return {
    surfacePatches: (src.surfacePatches ?? []).map((patch) => ({ ...patch })),
    hazardPits: (src.hazardPits ?? []).map((pit) => ({ ...pit })),
    bumpers: (src.bumpers ?? []).map((bumper) => ({ ...bumper })),
    movingBumpers: (src.movingBumpers ?? []).map((mover) => ({ ...mover, x: mover.baseX, y: mover.baseY, time: 0 })),
    walls: (src.walls ?? []).map((wall) => ({ ...wall })),
    windZones: (src.windZones ?? []).map((zone) => ({ ...zone, currentForce: zone.force, currentLift: zone.lift })),
  };
}

function buildPreview(level, ball, angleDeg, power) {
  const points = [];
  let x = ball.x;
  let y = ball.y;
  let vx = Math.cos((angleDeg * Math.PI) / 180) * (380 + 760 * power);
  let vy = Math.sin((angleDeg * Math.PI) / 180) * (380 + 760 * power);
  const dt = 1 / 30;

  for (let i = 0; i < 22; i += 1) {
    vy += GRAVITY * dt;
    vx *= 0.995;
    vy *= 0.995;
    x += vx * dt;
    y += vy * dt;
    x = clamp(x, 6, STAGE_WIDTH - 6);
    if (y > STAGE_HEIGHT + 130) {
      break;
    }
    const terrainY = getTerrainY(level.terrain, x);
    if (y + ball.radius > terrainY) {
      y = terrainY - ball.radius;
      const normal = getTerrainNormal(level.terrain, x);
      const tangent = { x: normal.y, y: -normal.x };
      const vn = vx * normal.x + vy * normal.y;
      const vt = vx * tangent.x + vy * tangent.y;
      vx = tangent.x * vt * 0.93 - normal.x * vn * 0.22;
      vy = tangent.y * vt * 0.93 - normal.y * vn * 0.22;
    }
    points.push({ x, y });
  }
  return points;
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

export default class GolfTourRuntime {
  constructor({ canvas, locale = "en", ui, onSnapshot, onFullscreenRequest, deviceProfile = "desktop" }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.locale = locale === "es" ? "es" : "en";
    this.ui = ui;
    this.onSnapshot = onSnapshot;
    this.onFullscreenRequest = onFullscreenRequest;
    this.deviceProfile = deviceProfile === "touch" ? "touch" : "desktop";

    this.levels = GOLF_LEVELS;
    this.save = loadSave();
    this.mode = "menu";
    this.playState = "idle";
    this.fullscreen = false;

    this.levelIndex = this.save.unlockedLevelIndex;
    this.level = getLevelByIndex(this.levelIndex);
    this.ball = createBall(this.level);
    this.coins = makeCoinState(this.level);
    this.obstacles = cloneObstacles(this.level);
    this.windForce = this.level.windBase;
    this.currentWind = { x: this.windForce, y: 0 };

    this.levelTimeMs = 0;
    this.levelStrokes = 0;
    this.totalStrokesSession = 0;
    this.shotQuality = "standard";
    this.starsAwarded = 0;
    this.statusLabel = ui.status.ready;
    this.message = ui.overlays.continueHint;
    this.surfaceTag = "fairway";

    this.aim = {
      angleDeg: -25,
      power: 0.52,
      dragging: false,
      pointerId: null,
      swipeMode: false,
      swipeStartX: this.ball.x,
      swipeStartY: this.ball.y,
      preview: [],
    };
    this.aim.preview = buildPreview(this.level, this.ball, this.aim.angleDeg, this.aim.power);

    this.trail = [];
    this.touchControls = { ...TOUCH_CONTROLS };
    this.keys = Object.create(null);
    this.running = false;
    this.rafId = 0;
    this.lastFrameTime = 0;
    this.accumulatorMs = 0;

    this.metrics = { cssWidth: 0, cssHeight: 0, pixelWidth: 0, pixelHeight: 0, dpr: 1 };

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.loop = this.loop.bind(this);
  }

  start() {
    if (this.running) {
      return;
    }
    this.running = true;
    this.canvas.style.touchAction = "none";
    this.syncCanvasResolution(true);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointercancel", this.handlePointerUp);
    this.canvas.addEventListener("pointerleave", this.handlePointerUp);
    this.lastFrameTime = performance.now();
    this.render();
    this.emit();
    this.rafId = window.requestAnimationFrame(this.loop);
  }

  destroy() {
    this.running = false;
    window.cancelAnimationFrame(this.rafId);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("pointercancel", this.handlePointerUp);
    this.canvas.removeEventListener("pointerleave", this.handlePointerUp);
  }

  loop(now) {
    if (!this.running) {
      return;
    }
    const deltaMs = Math.min(64, now - this.lastFrameTime);
    this.lastFrameTime = now;
    this.advanceInternal(deltaMs);
    this.rafId = window.requestAnimationFrame(this.loop);
  }

  advanceInternal(ms) {
    this.accumulatorMs += ms;
    while (this.accumulatorMs >= FIXED_DT_MS) {
      this.update(FIXED_DT_MS);
      this.accumulatorMs -= FIXED_DT_MS;
    }
    this.render();
    this.emit();
  }

  advanceTime(ms = 0) {
    const safe = clamp(Number(ms) || 0, 0, 4000);
    if (safe <= 0) {
      return;
    }
    this.accumulatorMs += safe;
    while (this.accumulatorMs >= FIXED_DT_MS) {
      this.update(FIXED_DT_MS);
      this.accumulatorMs -= FIXED_DT_MS;
    }
    this.render();
    this.emit();
  }

  syncCanvasResolution(force = false) {
    const rect = this.canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, rect.width || STAGE_WIDTH);
    const cssHeight = Math.max(1, rect.height || STAGE_HEIGHT);
    const dprCap = this.fullscreen || this.deviceProfile === "touch" ? 3 : 2;
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, dprCap));
    const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
    const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));

    if (!force && this.metrics.pixelWidth === pixelWidth && this.metrics.pixelHeight === pixelHeight && this.metrics.dpr === dpr) {
      return;
    }

    this.metrics = { cssWidth, cssHeight, pixelWidth, pixelHeight, dpr };
    this.canvas.width = pixelWidth;
    this.canvas.height = pixelHeight;
    this.ctx.setTransform(pixelWidth / STAGE_WIDTH, 0, 0, pixelHeight / STAGE_HEIGHT, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
  }

  setDeviceProfile(profile) {
    const next = profile === "touch" ? "touch" : "desktop";
    if (next === this.deviceProfile) {
      return;
    }
    this.deviceProfile = next;
    this.syncCanvasResolution(true);
    this.emit();
  }

  setFullscreenState(fullscreen) {
    this.fullscreen = Boolean(fullscreen);
    this.syncCanvasResolution(true);
    this.emit();
  }

  setVirtualControl(name, active) {
    if (!(name in this.touchControls)) {
      return;
    }
    this.touchControls[name] = Boolean(active);
  }

  prepareLevel(index) {
    this.levelIndex = clamp(index, 0, this.levels.length - 1);
    this.level = this.levels[this.levelIndex];
    this.ball = createBall(this.level);
    this.coins = makeCoinState(this.level);
    this.obstacles = cloneObstacles(this.level);
    this.windForce = this.level.windBase;
    this.currentWind = { x: this.windForce, y: 0 };
    this.levelTimeMs = 0;
    this.levelStrokes = 0;
    this.starsAwarded = 0;
    this.shotQuality = "standard";
    this.surfaceTag = "fairway";
    this.trail = [];
    this.statusLabel = this.ui.status.ready;
    this.message = this.ui.status.ready;

    const angle = (Math.atan2(this.level.hole.y - this.level.tee.y, this.level.hole.x - this.level.tee.x) * 180) / Math.PI;
    this.aim.angleDeg = clamp(angle, -175, -8);
    this.aim.power = 0.52;
    this.aim.dragging = false;
    this.aim.swipeMode = false;
    this.aim.preview = buildPreview(this.level, this.ball, this.aim.angleDeg, this.aim.power);
  }

  startCampaign() {
    this.mode = "playing";
    this.playState = "aiming";
    this.message = this.ui.status.ready;
    this.emit();
  }

  restartLevel() {
    this.prepareLevel(this.levelIndex);
    this.mode = "playing";
    this.playState = "aiming";
    this.emit();
  }

  playLevel(index) {
    const safe = clamp(index, 0, this.save.unlockedLevelIndex);
    this.prepareLevel(safe);
    this.mode = "playing";
    this.playState = "aiming";
    this.emit();
  }

  nextLevel() {
    if (this.levelIndex + 1 >= this.levels.length) {
      this.mode = "campaignComplete";
      this.playState = "idle";
      this.message = this.ui.overlays.campaignHint;
      this.emit();
      return;
    }
    this.playLevel(this.levelIndex + 1);
  }

  openLevelSelect() {
    this.mode = "levelSelect";
    this.playState = "idle";
    this.emit();
  }

  openMenu() {
    this.mode = "menu";
    this.playState = "idle";
    this.message = this.ui.overlays.continueHint;
    this.emit();
  }

  togglePause() {
    if (this.mode === "playing") {
      this.mode = "paused";
      this.playState = "paused";
      this.statusLabel = this.ui.status.paused;
      this.emit();
      return;
    }
    if (this.mode === "paused") {
      this.mode = "playing";
      this.playState = this.ball.moving ? "flying" : "aiming";
      this.statusLabel = this.ball.moving ? this.ui.status.moving : this.ui.status.ready;
      this.emit();
    }
  }

  launchBall() {
    if (this.mode !== "playing" || this.ball.moving) {
      return false;
    }
    const launchSpeed = 380 + this.aim.power * 760;
    const angle = (this.aim.angleDeg * Math.PI) / 180;
    this.ball.vx = Math.cos(angle) * launchSpeed;
    this.ball.vy = Math.sin(angle) * launchSpeed;
    this.ball.moving = true;
    this.ball.onGround = false;
    this.ball.stillMs = 0;
    this.ball.inCup = false;
    this.ball.cupDwellMs = 0;
    this.levelStrokes += 1;
    this.totalStrokesSession += 1;
    this.playState = "flying";
    this.statusLabel = this.ui.status.moving;
    this.message = this.ui.status.moving;
    return true;
  }

  applyPenalty(reason) {
    this.levelStrokes += 1;
    this.totalStrokesSession += 1;
    this.ball.x = this.ball.lastSafeX;
    this.ball.y = this.ball.lastSafeY;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.moving = false;
    this.ball.onGround = true;
    this.ball.inCup = false;
    this.playState = "aiming";
    this.shotQuality = "recovery";
    this.statusLabel = reason === "out" ? this.ui.status.out : this.ui.status.hazard;
    this.message = this.statusLabel;
    this.aim.preview = buildPreview(this.level, this.ball, this.aim.angleDeg, this.aim.power);
  }

  finishLevel() {
    const collected = this.coins.filter((coin) => coin.collected).length;
    const stars = computeStars(this.level, this.levelStrokes, this.levelTimeMs, collected, this.coins.length);
    this.starsAwarded = stars;
    this.shotQuality = computeQuality(this.levelStrokes, stars);
    this.mode = this.levelIndex === this.levels.length - 1 ? "campaignComplete" : "levelComplete";
    this.playState = "idle";
    this.statusLabel = this.ui.status.sunk;
    this.message = this.ui.overlays.completeHint;
    this.ball.moving = false;

    const levelId = this.level.id;
    this.save.starsByLevel[levelId] = Math.max(Number(this.save.starsByLevel[levelId]) || 0, stars);
    const bestStrokes = Number(this.save.bestStrokesByLevel[levelId]) || 0;
    if (!bestStrokes || this.levelStrokes < bestStrokes) {
      this.save.bestStrokesByLevel[levelId] = this.levelStrokes;
    }
    const bestTime = Number(this.save.bestTimeByLevel[levelId]) || 0;
    if (!bestTime || this.levelTimeMs < bestTime) {
      this.save.bestTimeByLevel[levelId] = this.levelTimeMs;
    }
    this.save.unlockedLevelIndex = Math.max(this.save.unlockedLevelIndex, clamp(this.levelIndex + 1, 0, this.levels.length - 1));
    persistSave(this.save);
  }

  handleKeyDown(event) {
    const target = event.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) {
      return;
    }
    this.keys[event.code] = true;

    if (event.code === "Space" || event.code === "Enter") {
      event.preventDefault();
      if (this.mode === "menu" || this.mode === "campaignComplete") {
        this.startCampaign();
      } else if (this.mode === "levelSelect") {
        this.playLevel(this.levelIndex);
      } else if (this.mode === "levelComplete") {
        this.nextLevel();
      } else if (this.mode === "playing") {
        this.launchBall();
      }
      return;
    }
    if (event.code === "KeyP" || event.code === "Escape") {
      event.preventDefault();
      this.togglePause();
      return;
    }
    if (event.code === "KeyR") {
      event.preventDefault();
      this.restartLevel();
      return;
    }
    if (event.code === "KeyL") {
      event.preventDefault();
      this.openLevelSelect();
      return;
    }
    if (event.code === "KeyF") {
      event.preventDefault();
      this.onFullscreenRequest?.();
    }
  }

  handleKeyUp(event) {
    this.keys[event.code] = false;
  }

  getCanvasPoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * STAGE_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * STAGE_HEIGHT,
    };
  }

  updateAimFromBallDrag(point) {
    const dx = this.ball.x - point.x;
    const dy = this.ball.y - point.y;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    this.aim.angleDeg = clamp(angle, -175, -8);
    this.aim.power = clamp(magnitude(dx, dy) / 220, 0.18, 1);
    this.aim.preview = buildPreview(this.level, this.ball, this.aim.angleDeg, this.aim.power);
  }

  updateAimFromSwipe(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    this.aim.angleDeg = clamp(angle, -175, -8);
    this.aim.power = clamp(magnitude(dx, dy) / 240, 0.16, 1);
    this.aim.preview = buildPreview(this.level, this.ball, this.aim.angleDeg, this.aim.power);
  }

  handlePointerDown(event) {
    if (this.mode !== "playing" || this.ball.moving) {
      return;
    }
    const point = this.getCanvasPoint(event);
    const nearBall = magnitude(point.x - this.ball.x, point.y - this.ball.y) <= this.ball.radius + 32;
    const isTouch = event.pointerType === "touch" || this.deviceProfile === "touch";
    if (!nearBall && !isTouch) {
      return;
    }
    this.canvas.setPointerCapture?.(event.pointerId);
    this.aim.dragging = true;
    this.aim.pointerId = event.pointerId;

    if (isTouch && !nearBall) {
      this.aim.swipeMode = true;
      this.aim.swipeStartX = point.x;
      this.aim.swipeStartY = point.y;
      this.updateAimFromSwipe(point, point);
      return;
    }
    this.aim.swipeMode = false;
    this.updateAimFromBallDrag(point);
  }

  handlePointerMove(event) {
    if (!this.aim.dragging || event.pointerId !== this.aim.pointerId) {
      return;
    }
    const point = this.getCanvasPoint(event);
    if (this.aim.swipeMode) {
      this.updateAimFromSwipe({ x: this.aim.swipeStartX, y: this.aim.swipeStartY }, point);
      return;
    }
    this.updateAimFromBallDrag(point);
  }

  handlePointerUp(event) {
    if (!this.aim.dragging || event.pointerId !== this.aim.pointerId) {
      return;
    }
    this.canvas.releasePointerCapture?.(event.pointerId);
    this.aim.dragging = false;
    this.aim.pointerId = null;

    const point = this.getCanvasPoint(event);
    if (this.aim.swipeMode) {
      const start = { x: this.aim.swipeStartX, y: this.aim.swipeStartY };
      this.updateAimFromSwipe(start, point);
      this.aim.swipeMode = false;
      if (magnitude(point.x - start.x, point.y - start.y) > 22) {
        this.launchBall();
      }
      return;
    }

    this.updateAimFromBallDrag(point);
    if (magnitude(this.ball.x - point.x, this.ball.y - point.y) > 24) {
      this.launchBall();
    }
  }

  updateAimByKeyboard(dtMs) {
    if (this.mode !== "playing" || this.ball.moving || this.aim.dragging) {
      return;
    }
    const angleStep = 112 * (dtMs / 1000);
    const powerStep = 0.62 * (dtMs / 1000);
    if (this.keys.ArrowLeft || this.keys.KeyA || this.touchControls.aimLeft) {
      this.aim.angleDeg = clamp(this.aim.angleDeg - angleStep, -175, -8);
    }
    if (this.keys.ArrowRight || this.keys.KeyD || this.touchControls.aimRight) {
      this.aim.angleDeg = clamp(this.aim.angleDeg + angleStep, -175, -8);
    }
    if (this.keys.ArrowUp || this.keys.KeyW || this.touchControls.powerUp) {
      this.aim.power = clamp(this.aim.power + powerStep, 0.18, 1);
    }
    if (this.keys.ArrowDown || this.keys.KeyS || this.touchControls.powerDown) {
      this.aim.power = clamp(this.aim.power - powerStep, 0.18, 1);
    }
    this.aim.preview = buildPreview(this.level, this.ball, this.aim.angleDeg, this.aim.power);
  }

  updateDynamicObstacles(dtMs) {
    const dt = dtMs / 1000;
    const globalT = this.levelTimeMs / 1000;
    this.obstacles.movingBumpers.forEach((mover) => {
      mover.time += dt;
      const phase = mover.phase + mover.time * mover.speed;
      if (mover.axis === "x") {
        mover.x = mover.baseX + Math.sin(phase) * mover.range;
        mover.y = mover.baseY;
      } else {
        mover.x = mover.baseX;
        mover.y = mover.baseY + Math.sin(phase) * mover.range;
      }
    });
    this.obstacles.windZones.forEach((zone) => {
      const wave = Math.sin(globalT * zone.oscFreq + zone.phase);
      zone.currentForce = zone.force + wave * zone.oscAmp;
      zone.currentLift = zone.lift + wave * zone.oscAmp * 0.24;
    });
  }

  getSurfacePatchAtX(x) {
    return this.obstacles.surfacePatches.find((patch) => x >= patch.x1 && x <= patch.x2) ?? null;
  }

  getWindForces(x, y) {
    let windX = 0;
    let windY = 0;
    this.obstacles.windZones.forEach((zone) => {
      if (pointInRect(x, y, zone)) {
        windX += zone.currentForce;
        windY += zone.currentLift;
      }
    });
    return { windX, windY };
  }

  resolveBumperCollision(bumper) {
    const dx = this.ball.x - bumper.x;
    const dy = this.ball.y - bumper.y;
    const minDistance = this.ball.radius + bumper.radius;
    const distSq = dx * dx + dy * dy;
    if (distSq >= minDistance * minDistance) {
      return;
    }
    let nx = 0;
    let ny = 0;
    let dist = Math.sqrt(distSq);
    if (dist > 0.0001) {
      nx = dx / dist;
      ny = dy / dist;
    } else {
      const left = Math.abs(this.ball.x - rx1);
      const right = Math.abs(rx2 - this.ball.x);
      const top = Math.abs(this.ball.y - ry1);
      const bottom = Math.abs(ry2 - this.ball.y);
      const side = Math.min(left, right, top, bottom);
      if (side === left) {
        nx = -1;
      } else if (side === right) {
        nx = 1;
      } else if (side === top) {
        ny = -1;
      } else {
        ny = 1;
      }
      dist = 0.0001;
    }
    const penetration = minDistance - dist;
    this.ball.x += nx * penetration;
    this.ball.y += ny * penetration;
    const vn = this.ball.vx * nx + this.ball.vy * ny;
    if (vn < 0) {
      const restitution = bumper.restitution ?? 0.9;
      this.ball.vx -= (1 + restitution) * vn * nx;
      this.ball.vy -= (1 + restitution) * vn * ny;
    }
    this.ball.onGround = false;
    this.surfaceTag = bumper.moving ? "moving-bumper" : "bumper";
  }

  resolveWallCollision(wall) {
    const rx1 = wall.x;
    const rx2 = wall.x + wall.width;
    const ry1 = wall.top;
    const ry2 = wall.top + wall.height;

    const closestX = clamp(this.ball.x, rx1, rx2);
    const closestY = clamp(this.ball.y, ry1, ry2);
    const dx = this.ball.x - closestX;
    const dy = this.ball.y - closestY;
    const distSq = dx * dx + dy * dy;
    if (distSq >= this.ball.radius * this.ball.radius) {
      return;
    }

    const dist = Math.sqrt(distSq) || 0.0001;
    const nx = dx / dist;
    const ny = dy / dist;
    const penetration = this.ball.radius - dist;
    this.ball.x += nx * penetration;
    this.ball.y += ny * penetration;

    const vn = this.ball.vx * nx + this.ball.vy * ny;
    if (vn < 0) {
      const restitution = wall.bounce ?? 0.38;
      this.ball.vx -= (1 + restitution) * vn * nx;
      this.ball.vy -= (1 + restitution) * vn * ny;
    }
    this.surfaceTag = "wall";
  }

  updateCupCapture(dtMs) {
    if (this.ball.inCup) {
      return;
    }
    const dt = dtMs / 1000;
    const hole = this.level.hole;
    const cupHalf = hole.cupWidth * 0.5;
    const dx = this.ball.x - hole.x;
    const absDx = Math.abs(dx);
    const speed = magnitude(this.ball.vx, this.ball.vy);
    const touchingLip = this.ball.y + this.ball.radius >= hole.y - 2;

    if (!touchingLip || absDx > cupHalf + this.ball.radius + 6) {
      return;
    }

    const captureTolerance = cupHalf + clamp(14 - speed * 0.022, 1.2, 14);
    const gentleApproach = this.ball.vy >= -120 || this.ball.onGround || speed < 250;
    if (absDx <= captureTolerance && gentleApproach) {
      this.ball.inCup = true;
      this.ball.cupDwellMs = 0;
      this.ball.vx *= 0.44;
      this.ball.vy = Math.max(this.ball.vy, 48);
      this.surfaceTag = "cup";
      return;
    }

    const pullStrength = clamp((cupHalf + this.ball.radius + 4 - absDx) * 24, 0, 340);
    if (pullStrength > 0) {
      const dir = dx === 0 ? 0 : -Math.sign(dx);
      this.ball.vx += dir * pullStrength * dt;
      this.ball.vx *= 0.94;
      this.ball.vy *= this.ball.onGround ? 0.76 : 0.9;
      this.surfaceTag = "rim";
    }
  }

  updateBall(dtMs) {
    if (!this.ball.moving) {
      return;
    }

    const dt = dtMs / 1000;
    this.updateDynamicObstacles(dtMs);

    const oscillation = Math.sin(this.levelTimeMs * 0.0013 + this.level.index * 0.4);
    const baseWind = this.level.windBase + oscillation * 10;
    const zoneWind = this.getWindForces(this.ball.x, this.ball.y);
    this.windForce = baseWind;
    this.currentWind = { x: baseWind + zoneWind.windX, y: zoneWind.windY };

    if (!this.ball.inCup) {
      this.ball.vx += this.currentWind.x * dt;
      this.ball.vy += (GRAVITY + this.currentWind.y) * dt;
      this.ball.vx *= AIR_DRAG;
      this.ball.vy *= AIR_DRAG;
      this.ball.x += this.ball.vx * dt;
      this.ball.y += this.ball.vy * dt;
    }

    if (this.ball.x < -50 || this.ball.x > STAGE_WIDTH + 50 || this.ball.y > STAGE_HEIGHT + 180) {
      this.applyPenalty("out");
      return;
    }

    this.obstacles.walls.forEach((wall) => this.resolveWallCollision(wall));
    this.obstacles.bumpers.forEach((bumper) => this.resolveBumperCollision(bumper));
    this.obstacles.movingBumpers.forEach((mover) => this.resolveBumperCollision(mover));

    const terrainY = getTerrainY(this.level.terrain, this.ball.x);
    const normal = getTerrainNormal(this.level.terrain, this.ball.x);
    const tangent = { x: normal.y, y: -normal.x };
    if (this.ball.y + this.ball.radius >= terrainY) {
      this.ball.y = terrainY - this.ball.radius;
      const patch = this.getSurfacePatchAtX(this.ball.x);
      const rollFriction = patch?.friction ?? BASE_ROLL_FRICTION;
      const restitution = patch?.bounce ?? BASE_RESTITUTION;

      const vn = this.ball.vx * normal.x + this.ball.vy * normal.y;
      const vt = this.ball.vx * tangent.x + this.ball.vy * tangent.y;
      const nextVn = vn > 0 ? -vn * restitution : vn;
      const slopePush = -normal.x * SLOPE_ACCELERATION * dt;
      const nextVt = vt * rollFriction + slopePush;
      this.ball.vx = tangent.x * nextVt + normal.x * nextVn;
      this.ball.vy = tangent.y * nextVt + normal.y * nextVn;
      this.ball.onGround = true;
      this.surfaceTag = patch?.kind ?? (Math.abs(normal.x) > 0.45 ? "rough" : "fairway");
      this.ball.lastSafeX = this.ball.x;
      this.ball.lastSafeY = this.ball.y;
    } else {
      this.ball.onGround = false;
      this.surfaceTag = "fairway";
    }

    this.coins.forEach((coin) => {
      if (coin.collected) {
        return;
      }
      const dx = this.ball.x - coin.x;
      const dy = this.ball.y - coin.y;
      if (dx * dx + dy * dy <= (coin.radius + this.ball.radius) ** 2) {
        coin.collected = true;
      }
    });

    const hazard = this.obstacles.hazardPits.find((pit) => this.ball.x >= pit.x1 && this.ball.x <= pit.x2 && this.ball.y + this.ball.radius >= pit.top);
    if (hazard) {
      this.applyPenalty("hazard");
      return;
    }

    this.updateCupCapture(dtMs);
    if (this.ball.inCup) {
      const hole = this.level.hole;
      this.ball.cupDwellMs += dtMs;
      this.ball.x += (hole.x - this.ball.x) * 0.14;
      this.ball.y += (hole.y + hole.cupDepth * 0.33 - this.ball.y) * 0.16;
      this.ball.vx *= 0.72;
      this.ball.vy *= 0.72;
      if (this.ball.cupDwellMs >= 420) {
        this.finishLevel();
        return;
      }
    }

    const velocity = magnitude(this.ball.vx, this.ball.vy);
    if (velocity <= STOP_SPEED && this.ball.onGround && !this.ball.inCup) {
      this.ball.stillMs += dtMs;
      if (this.ball.stillMs > 240) {
        this.ball.vx = 0;
        this.ball.vy = 0;
        this.ball.moving = false;
        this.playState = "aiming";
        this.statusLabel = this.ui.status.ready;
        this.message = this.ui.status.ready;
      }
    } else {
      this.ball.stillMs = 0;
    }

    this.trail.push({ x: this.ball.x, y: this.ball.y, lifeMs: 320, maxLifeMs: 320 });
    if (this.trail.length > 26) {
      this.trail.shift();
    }
  }

  update(dtMs) {
    this.syncCanvasResolution();
    this.trail = this.trail
      .map((dot) => ({ ...dot, lifeMs: dot.lifeMs - dtMs }))
      .filter((dot) => dot.lifeMs > 0);

    if (this.mode !== "playing") {
      return;
    }
    this.levelTimeMs += dtMs;
    this.updateAimByKeyboard(dtMs);
    this.updateBall(dtMs);
  }

  buildLevelSummary() {
    return this.levels.map((level) => ({
      id: level.id,
      index: level.index,
      name: localizeLabel(level.name, this.locale),
      par: level.par,
      stars: Number(this.save.starsByLevel[level.id]) || 0,
      unlocked: level.index <= this.save.unlockedLevelIndex,
      bestStrokes: Number(this.save.bestStrokesByLevel[level.id]) || null,
      bestTimeMs: Number(this.save.bestTimeByLevel[level.id]) || null,
    }));
  }

  buildObstacleSnapshot() {
    const zones = [
      ...this.obstacles.surfacePatches.map((patch) => ({ id: patch.id, type: "surface", kind: patch.kind, x1: round(patch.x1), x2: round(patch.x2) })),
      ...this.obstacles.hazardPits.map((pit) => ({ id: pit.id, type: "hazard", kind: pit.type, x1: round(pit.x1), x2: round(pit.x2), top: round(pit.top) })),
      ...this.obstacles.windZones.map((zone) => ({
        id: zone.id,
        type: "wind",
        x: round(zone.x),
        y: round(zone.y),
        width: round(zone.width),
        height: round(zone.height),
        force: round(zone.currentForce, 1),
        lift: round(zone.currentLift, 1),
      })),
    ];

    const walls = this.obstacles.walls.map((wall) => ({ id: wall.id, x: round(wall.x), top: round(wall.top), width: round(wall.width), height: round(wall.height) }));
    const movers = this.obstacles.movingBumpers.map((mover) => ({ id: mover.id, x: round(mover.x), y: round(mover.y), radius: round(mover.radius), axis: mover.axis, range: round(mover.range) }));
    const bumpers = [
      ...this.obstacles.bumpers.map((bumper) => ({ id: bumper.id, x: round(bumper.x), y: round(bumper.y), radius: round(bumper.radius), moving: false })),
      ...this.obstacles.movingBumpers.map((mover) => ({ id: mover.id, x: round(mover.x), y: round(mover.y), radius: round(mover.radius), moving: true })),
    ];
    return { zones, walls, movers, bumpers };
  }

  getSnapshot() {
    const levelInfo = describeLevelForHud(this.level, this.locale);
    const collectedCoins = this.coins.filter((coin) => coin.collected).length;
    const bestStars = Number(this.save.starsByLevel[this.level.id]) || 0;
    const bestStrokes = Number(this.save.bestStrokesByLevel[this.level.id]) || null;
    const bestTimeMs = Number(this.save.bestTimeByLevel[this.level.id]) || null;
    const obstacleSnapshot = this.buildObstacleSnapshot();

    return {
      mode: this.mode,
      playState: this.playState,
      locale: this.locale,
      coordinates: "origin_top_left_x_right_y_down_pixels",
      level: {
        id: this.level.id,
        index: this.level.index + 1,
        total: this.levels.length,
        worldIndex: this.level.worldIndex,
        worldLevel: this.level.worldLevel,
        worldName: levelInfo.worldName,
        worldSubtitle: levelInfo.worldSubtitle,
        name: levelInfo.name,
        par: this.level.par,
        difficulty: this.ui.difficulty[this.level.difficultyBand] ?? this.level.difficultyBand,
      },
      score: {
        strokes: this.levelStrokes,
        totalStrokesSession: this.totalStrokesSession,
        starsAwarded: this.starsAwarded,
        totalStars: sumStars(this.save),
        coinsCollected: collectedCoins,
        coinTotal: this.coins.length,
      },
      best: { stars: bestStars, strokes: bestStrokes, timeMs: bestTimeMs },
      timing: { elapsedMs: this.levelTimeMs, timeLimitMs: this.level.timeLimitMs },
      ball: {
        x: round(this.ball.x),
        y: round(this.ball.y),
        vx: round(this.ball.vx),
        vy: round(this.ball.vy),
        radius: this.ball.radius,
        moving: this.ball.moving,
        onGround: this.ball.onGround,
        inCup: this.ball.inCup,
      },
      aim: {
        angleDeg: round(this.aim.angleDeg),
        power: round(this.aim.power, 3),
        dragging: this.aim.dragging,
        swipeMode: this.aim.swipeMode,
        preview: this.aim.preview.map((point) => ({ x: round(point.x), y: round(point.y) })),
      },
      physics: {
        surface: this.surfaceTag,
        friction: BASE_ROLL_FRICTION,
        bounce: BASE_RESTITUTION,
        speed: round(magnitude(this.ball.vx, this.ball.vy), 1),
        wind: { x: round(this.currentWind.x, 1), y: round(GRAVITY + this.currentWind.y, 1) },
      },
      statusLabel: this.statusLabel,
      message: this.message,
      shotQuality: this.shotQuality,
      levelSummary: this.buildLevelSummary(),
      hole: this.level.hole,
      terrain: this.level.terrain,
      coins: this.coins,
      trail: this.trail.map((dot) => ({ x: round(dot.x), y: round(dot.y), life: round(dot.lifeMs / dot.maxLifeMs, 3) })),
      zones: obstacleSnapshot.zones,
      walls: obstacleSnapshot.walls,
      movers: obstacleSnapshot.movers,
      bumpers: obstacleSnapshot.bumpers,
      portals: [],
      fullscreen: this.fullscreen,
      deviceProfile: this.deviceProfile,
    };
  }

  render() {
    this.syncCanvasResolution();
    drawGolfScene(this.ctx, this);
  }

  emit() {
    this.onSnapshot?.(this.getSnapshot());
  }
}
