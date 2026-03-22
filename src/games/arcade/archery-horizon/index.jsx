import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";

const WIDTH = 960;
const HEIGHT = 540;
const DT = 1 / 60;
const DT_MS = 1000 / 60;
const MAX_LEVELS = 100;
const MIN_YAW = -26;
const MAX_YAW = 26;
const MIN_ELEVATION = 14;
const MAX_ELEVATION = 58;
const MIN_INTENSITY = 0.2;
const MAX_INTENSITY = 1;
const STORAGE_KEY = "arcade_archery_horizon_save_v1";

const DEFAULT_STATS = {
  shots: 0,
  hits: 0,
  bullseyes: 0,
  score: 0,
  bestStreak: 0,
  currentStreak: 0,
};

const UI_COPY = {
  es: {
    title: "Archery Horizon 100",
    subtitle:
      "Tiro con arco cinematico con 100 niveles, lectura de horizonte, viento variable y camara de seguimiento de flecha.",
    status: {
      menu: "Preparacion",
      play: "Simulacion",
      paused: "Pausa",
      levelClear: "Nivel superado",
      campaignClear: "Tour completo",
    },
    labels: {
      level: "Nivel",
      unlocked: "Desbloqueado",
      environment: "Entorno",
      distance: "Distancia",
      difficulty: "Dificultad",
      wind: "Viento",
      gravity: "Gravedad",
      drag: "Arrastre",
      objective: "Objetivo",
      objectiveBody: "Acierta en la diana para desbloquear el siguiente nivel.",
      controls: "Controles",
      controlsBody:
        "A/D o J/L ajustan desvio horizontal. Flechas arriba/abajo o I/K ajustan trayectoria. Q/E hacen ajuste grueso de trayectoria. W/S o +/- regulan intensidad, Z/X ajuste fino de intensidad y Shift activa modo fino. Teclas 1-5 cargan presets de tiro, 6 restaura recomendacion del nivel. Enter/Espacio dispara. P pausa, R reinicia, N siguiente y F pantalla completa.",
      trajectory: "Trayectoria",
      yaw: "Desvio horizontal",
      intensity: "Intensidad",
      attempts: "Intentos",
      hits: "Impactos",
      bullseyes: "Bullseyes",
      score: "Puntuacion",
      streak: "Racha",
      bestStreak: "Mejor racha",
      status: "Estado",
      levelSelector: "Seleccion de nivel",
      camera: "Camara",
      cameraAim: "Preparada en el arco",
      cameraFollow: "Siguiendo la flecha",
      cameraImpact: "Bloqueada en impacto",
      trajectoryDepth: "Profundidad estimada",
      roundSummary: "Resumen de ronda",
      roundPoints: "Puntos de ronda",
      zonePoints: "Puntos por zona",
      distanceBonus: "Bonus por distancia",
    },
    buttons: {
      start: "Iniciar tour",
      launch: "Disparar",
      restart: "Reiniciar",
      pause: "Pausar",
      resume: "Reanudar",
      next: "Siguiente nivel",
      fullscreen: "Pantalla completa",
      backToMenu: "Menu",
      retry: "Reintentar",
    },
    overlays: {
      menuTitle: "Archery Horizon 100",
      menuBody:
        "Selecciona trayectoria e intensidad antes de cada tiro. Cuanto mas dificil sea el nivel, mas lejos estara la diana y mas exigente sera la fisica.",
      pausedTitle: "Pausa tactica",
      pausedBody: "Reanuda cuando quieras para mantener la linea del disparo.",
      clearTitle: "Impacto valido",
      clearBody: "Nivel completado. Puedes avanzar al siguiente reto o repetir para mejorar tu precision.",
      campaignTitle: "Tour completado",
      campaignBody: "Has superado los 100 niveles de Archery Horizon.",
    },
    shotMessages: {
      ready: "Ajusta trayectoria e intensidad y lanza.",
      missTarget: "La flecha cruzo la profundidad del objetivo pero fuera de la diana.",
      ground: "La flecha toco suelo antes del objetivo.",
      wall: "La flecha impacto en un obstaculo intermedio.",
      out: "La flecha salio del corredor de tiro.",
      bullseye: "Bullseye perfecto",
      ringInner: "Anillo interno",
      ringMid: "Anillo medio",
      ringOuter: "Anillo exterior",
      levelComplete: "Nivel completado",
      campaignComplete: "Campana completada",
    },
  },
  en: {
    title: "Archery Horizon 100",
    subtitle:
      "Cinematic archery with 100 levels, horizon depth reading, variable wind, and full arrow-follow camera.",
    status: {
      menu: "Setup",
      play: "Simulation",
      paused: "Paused",
      levelClear: "Level clear",
      campaignClear: "Tour complete",
    },
    labels: {
      level: "Level",
      unlocked: "Unlocked",
      environment: "Environment",
      distance: "Distance",
      difficulty: "Difficulty",
      wind: "Wind",
      gravity: "Gravity",
      drag: "Drag",
      objective: "Objective",
      objectiveBody: "Hit the target to unlock the next level.",
      controls: "Controls",
      controlsBody:
        "A/D or J/L adjust horizontal yaw. Up/down arrows or I/K tune trajectory. Q/E apply coarse trajectory changes. W/S or +/- adjust intensity, Z/X does fine intensity trim, and Shift enables fine mode. Keys 1-5 load shot presets, 6 restores level recommendation. Enter/Space shoots. P pause, R restart, N next level, F fullscreen.",
      trajectory: "Trajectory",
      yaw: "Horizontal yaw",
      intensity: "Intensity",
      attempts: "Attempts",
      hits: "Hits",
      bullseyes: "Bullseyes",
      score: "Score",
      streak: "Streak",
      bestStreak: "Best streak",
      status: "Status",
      levelSelector: "Level select",
      camera: "Camera",
      cameraAim: "Bow view",
      cameraFollow: "Arrow follow",
      cameraImpact: "Impact lock",
      trajectoryDepth: "Estimated depth",
      roundSummary: "Round summary",
      roundPoints: "Round points",
      zonePoints: "Zone points",
      distanceBonus: "Distance bonus",
    },
    buttons: {
      start: "Start tour",
      launch: "Shoot",
      restart: "Restart",
      pause: "Pause",
      resume: "Resume",
      next: "Next level",
      fullscreen: "Fullscreen",
      backToMenu: "Menu",
      retry: "Retry",
    },
    overlays: {
      menuTitle: "Archery Horizon 100",
      menuBody:
        "Choose trajectory and intensity before every shot. Harder levels push the target farther and demand cleaner physics control.",
      pausedTitle: "Tactical pause",
      pausedBody: "Resume whenever you are ready to continue the shot plan.",
      clearTitle: "Valid impact",
      clearBody: "Level cleared. Move to the next challenge or replay to improve precision.",
      campaignTitle: "Tour complete",
      campaignBody: "You cleared all 100 Archery Horizon levels.",
    },
    shotMessages: {
      ready: "Adjust trajectory and intensity, then fire.",
      missTarget: "Arrow crossed target depth but missed the board.",
      ground: "Arrow touched ground before reaching target depth.",
      wall: "Arrow hit an intermediate obstacle.",
      out: "Arrow left the shooting corridor.",
      bullseye: "Perfect bullseye",
      ringInner: "Inner ring",
      ringMid: "Mid ring",
      ringOuter: "Outer ring",
      levelComplete: "Level complete",
      campaignComplete: "Campaign complete",
    },
  },
};

const DIFFICULTY_BANDS = [
  { es: "Rookie", en: "Rookie" },
  { es: "Pro", en: "Pro" },
  { es: "Elite", en: "Elite" },
  { es: "Master", en: "Master" },
  { es: "Legend", en: "Legend" },
];

const ENVIRONMENTS = [
  {
    id: "cedar-valley",
    nameEs: "Valle de cedros",
    nameEn: "Cedar valley",
    skyTop: "#2d6ab6",
    skyBottom: "#d9ecff",
    mountainA: "#587aa2",
    mountainB: "#86a5bf",
    groundNear: "#365232",
    groundFar: "#638b55",
    haze: "rgba(225, 241, 255, 0.55)",
    gravity: 9.45,
    drag: 0.0112,
    windScale: 0.9,
  },
  {
    id: "dune-canyon",
    nameEs: "Canon de dunas",
    nameEn: "Dune canyon",
    skyTop: "#f0a55a",
    skyBottom: "#ffe4be",
    mountainA: "#a96836",
    mountainB: "#d08e58",
    groundNear: "#7f521d",
    groundFar: "#bb823f",
    haze: "rgba(255, 226, 186, 0.48)",
    gravity: 9.68,
    drag: 0.0095,
    windScale: 1.18,
  },
  {
    id: "frost-ridge",
    nameEs: "Cordillera helada",
    nameEn: "Frost ridge",
    skyTop: "#558fcb",
    skyBottom: "#ecf7ff",
    mountainA: "#6f89a8",
    mountainB: "#a7bdd2",
    groundNear: "#4f606b",
    groundFar: "#7890a1",
    haze: "rgba(230, 247, 255, 0.62)",
    gravity: 9.52,
    drag: 0.0135,
    windScale: 1.05,
  },
  {
    id: "storm-harbor",
    nameEs: "Puerto de tormenta",
    nameEn: "Storm harbor",
    skyTop: "#2f3e63",
    skyBottom: "#9eafd2",
    mountainA: "#3f4b6d",
    mountainB: "#6176a3",
    groundNear: "#24384b",
    groundFar: "#3f5f78",
    haze: "rgba(197, 213, 244, 0.45)",
    gravity: 9.74,
    drag: 0.0128,
    windScale: 1.3,
  },
  {
    id: "volcanic-dusk",
    nameEs: "Crepusculo volcanico",
    nameEn: "Volcanic dusk",
    skyTop: "#632a24",
    skyBottom: "#f0a07a",
    mountainA: "#5f352f",
    mountainB: "#8e5347",
    groundNear: "#3e1f16",
    groundFar: "#6b3224",
    haze: "rgba(247, 188, 156, 0.42)",
    gravity: 9.83,
    drag: 0.0117,
    windScale: 1.12,
  },
  {
    id: "emerald-plateau",
    nameEs: "Meseta esmeralda",
    nameEn: "Emerald plateau",
    skyTop: "#276f7c",
    skyBottom: "#daf8ed",
    mountainA: "#3d8e78",
    mountainB: "#68b397",
    groundNear: "#25563c",
    groundFar: "#3d7a57",
    haze: "rgba(200, 248, 230, 0.52)",
    gravity: 9.38,
    drag: 0.0109,
    windScale: 0.97,
  },
];

const DEFAULT_SNAPSHOT = {
  mode: "arcade-archery-horizon",
  screen: "menu",
  playState: "idle",
  locale: "en",
  coordinates: "3d_world_origin_at_bow_x_horizontal_y_up_z_depth_positive_towards_horizon",
  level: {
    index: 1,
    total: MAX_LEVELS,
    unlocked: 1,
    environment: "",
    difficulty: "",
    distance: 0,
    gravity: 0,
    drag: 0,
    windX: 0,
    windZ: 0,
  },
  aim: {
    yawDeg: 0,
    elevationDeg: 30,
    intensity: 0.6,
  },
  target: {
    x: 0,
    y: 0,
    z: 0,
    radius: 1,
    moving: false,
    movingAmplitude: 0,
  },
  arrow: {
    inFlight: false,
    x: 0,
    y: 1.55,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    speed: 0,
  },
  camera: {
    mode: "aim",
    x: 0,
    y: 1.75,
    z: 0,
  },
  stats: {
    attempts: 0,
    hits: 0,
    bullseyes: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
  },
  result: {
    hit: false,
    ring: "",
    score: 0,
    zonePoints: 0,
    distanceBonus: 0,
    reason: "",
    impact: null,
    distanceToCenter: null,
  },
  message: "",
  statusLabel: "",
  trajectoryPreview: [],
  trajectoryDepth: 0,
  fullscreen: false,
  paused: false,
  levelClear: false,
  campaignClear: false,
  deviceProfile: "desktop",
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function seededUnit(levelIndex, salt = 0) {
  const seed = Math.sin((levelIndex + 1) * 127.137 + salt * 311.937) * 43758.5453;
  return seed - Math.floor(seed);
}

function seededSigned(levelIndex, salt = 0) {
  return seededUnit(levelIndex, salt) * 2 - 1;
}

function toFixedNumber(value, decimals = 2) {
  return Number(value.toFixed(decimals));
}

function resolveDeviceProfile() {
  if (typeof window === "undefined") {
    return "desktop";
  }
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
  const touchPoints = (navigator.maxTouchPoints ?? 0) > 0;
  return coarse || touchPoints ? "touch" : "desktop";
}

function getDifficultyLabel(index, locale) {
  const bandIndex = clamp(Math.floor(index / 20), 0, DIFFICULTY_BANDS.length - 1);
  const band = DIFFICULTY_BANDS[bandIndex];
  return locale === "es" ? band.es : band.en;
}

function loadProgress() {
  if (typeof localStorage === "undefined") {
    return { unlockedLevel: 1, lastLevel: 1, stats: { ...DEFAULT_STATS } };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { unlockedLevel: 1, lastLevel: 1, stats: { ...DEFAULT_STATS } };
    }
    const parsed = JSON.parse(raw);
    return {
      unlockedLevel: clamp(Number(parsed.unlockedLevel) || 1, 1, MAX_LEVELS),
      lastLevel: clamp(Number(parsed.lastLevel) || 1, 1, MAX_LEVELS),
      stats: {
        shots: Math.max(0, Number(parsed.stats?.shots) || 0),
        hits: Math.max(0, Number(parsed.stats?.hits) || 0),
        bullseyes: Math.max(0, Number(parsed.stats?.bullseyes) || 0),
        score: Math.max(0, Number(parsed.stats?.score) || 0),
        bestStreak: Math.max(0, Number(parsed.stats?.bestStreak) || 0),
        currentStreak: Math.max(0, Number(parsed.stats?.currentStreak) || 0),
      },
    };
  } catch {
    return { unlockedLevel: 1, lastLevel: 1, stats: { ...DEFAULT_STATS } };
  }
}

function saveProgress(progress) {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore write errors.
  }
}

function buildVelocityFromAim(aim) {
  const yaw = (aim.yawDeg * Math.PI) / 180;
  const elevation = (aim.elevationDeg * Math.PI) / 180;
  const speed = 28 + aim.intensity * 36;
  const planar = Math.cos(elevation) * speed;
  return {
    vx: Math.sin(yaw) * planar,
    vy: Math.sin(elevation) * speed,
    vz: Math.cos(yaw) * planar,
  };
}

function computeRecommendedAim(level) {
  const baseIntensity = clamp(0.28 + level.target.z / 360, MIN_INTENSITY, MAX_INTENSITY);
  const baseElevation = clamp(20 + level.target.z * 0.055 + Math.abs(level.wind.baseX) * 2.2, MIN_ELEVATION, MAX_ELEVATION);
  const yawCorrection = clamp((level.target.baseX / Math.max(12, level.target.z * 0.12)) * 22 + level.wind.baseX * 2.8, MIN_YAW, MAX_YAW);
  return {
    yawDeg: toFixedNumber(yawCorrection, 2),
    elevationDeg: toFixedNumber(baseElevation, 2),
    intensity: toFixedNumber(baseIntensity, 3),
  };
}

function createLevel(index) {
  const env = ENVIRONMENTS[index % ENVIRONMENTS.length];
  const tier = Math.floor(index / 20);
  const targetDistance = 68 + index * 2.72 + seededUnit(index, 0.11) * 19;
  const baseTargetX = seededSigned(index, 0.22) * Math.min(8.5, 2 + tier * 1.45);
  const targetHeight = 1.6 + seededUnit(index, 0.35) * 1.25 + tier * 0.16;
  const targetRadius = clamp(2.45 - index * 0.014 - tier * 0.11 + seededUnit(index, 0.48) * 0.24, 0.85, 2.55);
  const movingAmplitude = index >= 18 ? seededUnit(index, 0.57) * (1.1 + tier * 0.85) : 0;
  const movingFrequency = 0.38 + seededUnit(index, 0.62) * 0.75 + tier * 0.06;
  const movingPhase = seededUnit(index, 0.73) * Math.PI * 2;

  const windBaseX = seededSigned(index, 0.81) * (0.45 + tier * 0.32) * env.windScale;
  const windGustX = tier === 0 ? 0 : (0.2 + seededUnit(index, 0.92) * (0.45 + tier * 0.2)) * env.windScale;
  const windFreq = 0.24 + seededUnit(index, 1.07) * 0.52 + tier * 0.04;
  const forwardWind = seededSigned(index, 1.18) * (0.09 + tier * 0.04);

  const gravity = env.gravity + tier * 0.12 + seededSigned(index, 1.29) * 0.06;
  const drag = env.drag + tier * 0.0015 + seededUnit(index, 1.41) * 0.0019;

  const walls = [];
  if (index >= 24) {
    const wallCount = index >= 70 ? 2 : 1;
    for (let wallIndex = 0; wallIndex < wallCount; wallIndex += 1) {
      const distanceFactor = wallCount === 1 ? 0.52 : 0.4 + wallIndex * 0.2;
      const z = targetDistance * (distanceFactor + seededUnit(index, 1.52 + wallIndex) * 0.08);
      const width = clamp(10.5 - tier * 0.55 + seededUnit(index, 1.63 + wallIndex) * 2.2, 5.6, 12.8);
      const gapHeight = clamp(3.1 - tier * 0.23 + seededUnit(index, 1.74 + wallIndex) * 0.9, 1.25, 3.6);
      const gapBottom = 0.8 + seededUnit(index, 1.89 + wallIndex) * 2.9;
      const swayAmp = index >= 50 ? seededUnit(index, 2.01 + wallIndex) * (1 + tier * 0.25) : 0;
      const swayFreq = 0.35 + seededUnit(index, 2.15 + wallIndex) * 0.8;
      const swayPhase = seededUnit(index, 2.3 + wallIndex) * Math.PI * 2;
      walls.push({
        id: `wall-${index + 1}-${wallIndex}`,
        z,
        x: seededSigned(index, 2.44 + wallIndex) * 4.8,
        width,
        gapBottom,
        gapHeight,
        swayAmp,
        swayFreq,
        swayPhase,
      });
    }
  }

  const updraftZones = [];
  if (index >= 36 && seededUnit(index, 2.61) > 0.3) {
    updraftZones.push({
      id: `updraft-${index + 1}-a`,
      startZ: targetDistance * (0.24 + seededUnit(index, 2.73) * 0.14),
      endZ: targetDistance * (0.38 + seededUnit(index, 2.86) * 0.13),
      centerX: seededSigned(index, 2.94) * 3.2,
      halfWidth: 2.3 + seededUnit(index, 3.04) * 2.2,
      lift: 2.6 + tier * 0.8 + seededUnit(index, 3.12) * 2.4,
      pulse: 0.75 + seededUnit(index, 3.27) * 0.8,
    });
  }

  if (index >= 72 && seededUnit(index, 3.4) > 0.55) {
    updraftZones.push({
      id: `updraft-${index + 1}-b`,
      startZ: targetDistance * (0.47 + seededUnit(index, 3.53) * 0.12),
      endZ: targetDistance * (0.63 + seededUnit(index, 3.69) * 0.12),
      centerX: seededSigned(index, 3.8) * 4.8,
      halfWidth: 1.8 + seededUnit(index, 3.95) * 1.9,
      lift: 3.1 + tier * 1.1 + seededUnit(index, 4.1) * 2.9,
      pulse: 0.9 + seededUnit(index, 4.24) * 1.1,
    });
  }

  return {
    id: `archery-horizon-${index + 1}`,
    index,
    environment: env,
    difficultyBand: tier,
    target: {
      z: targetDistance,
      baseX: baseTargetX,
      y: targetHeight,
      radius: targetRadius,
      movingAmplitude,
      movingFrequency,
      movingPhase,
    },
    wind: {
      baseX: windBaseX,
      gustX: windGustX,
      freq: windFreq,
      phase: seededUnit(index, 4.36) * Math.PI * 2,
      forward: forwardWind,
    },
    gravity,
    drag,
    walls,
    updraftZones,
  };
}

const LEVELS = Array.from({ length: MAX_LEVELS }, (_, index) => createLevel(index));

function getTargetAtTime(level, timeSec) {
  const swing = level.target.movingAmplitude > 0
    ? Math.sin(timeSec * level.target.movingFrequency + level.target.movingPhase) * level.target.movingAmplitude
    : 0;
  return {
    x: level.target.baseX + swing,
    y: level.target.y,
    z: level.target.z,
    radius: level.target.radius,
    moving: level.target.movingAmplitude > 0,
  };
}

function getWallX(wall, timeSec) {
  if (!wall.swayAmp) {
    return wall.x;
  }
  return wall.x + Math.sin(timeSec * wall.swayFreq + wall.swayPhase) * wall.swayAmp;
}

function classifyHitRing(ratio, locale) {
  const key = ratio <= 0.16
    ? "bullseye"
    : ratio <= 0.38
      ? "ringInner"
      : ratio <= 0.66
        ? "ringMid"
        : "ringOuter";

  const scoreBase = key === "bullseye"
    ? 130
    : key === "ringInner"
      ? 90
      : key === "ringMid"
        ? 60
        : 35;

  const text = UI_COPY[locale].shotMessages[key];
  return { key, scoreBase, text };
}

class ArcheryHorizonRuntime {
  constructor({ canvas, locale, ui, deviceProfile, onSnapshot, onFullscreenRequest }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.locale = locale;
    this.ui = ui;
    this.deviceProfile = deviceProfile;
    this.onSnapshot = onSnapshot;
    this.onFullscreenRequest = onFullscreenRequest;

    const progress = loadProgress();
    this.unlockedLevel = progress.unlockedLevel;
    this.currentLevelIndex = clamp(progress.lastLevel - 1, 0, this.unlockedLevel - 1);
    this.stats = {
      shots: progress.stats.shots,
      hits: progress.stats.hits,
      bullseyes: progress.stats.bullseyes,
      score: progress.stats.score,
      bestStreak: progress.stats.bestStreak,
      currentStreak: progress.stats.currentStreak,
    };

    this.screen = "menu";
    this.paused = false;
    this.levelClear = false;
    this.campaignClear = false;
    this.shotState = "aiming";
    this.fullscreen = false;

    this.time = 0;
    this.flightTime = 0;
    this.resultTimer = 0;
    this.statusMessage = ui.shotMessages.ready;
    this.statusReason = "ready";
    this.result = {
      hit: false,
      ring: "",
      score: 0,
      zonePoints: 0,
      distanceBonus: 0,
      reason: "",
      impact: null,
      distanceToCenter: null,
    };

    this.arrow = {
      x: 0,
      y: 1.55,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      inFlight: false,
    };
    this.arrowTrail = [];

    this.camera = { x: 0, y: 1.75, z: 0, mode: "aim" };

    this.aim = computeRecommendedAim(this.currentLevel);
    this.previewCacheKey = "";
    this.previewCache = [];

    this.lastFrame = 0;
    this.accumulator = 0;
    this.snapshotAccumulator = 0;
    this.running = false;
    this.frameHandle = null;
    this.pointerDown = false;
    this.keyState = {
      yawLeft: false,
      yawRight: false,
      elevUp: false,
      elevDown: false,
      coarseElevUp: false,
      coarseElevDown: false,
      intensityUp: false,
      intensityDown: false,
      intensityFineUp: false,
      intensityFineDown: false,
      shift: false,
    };

    this.viewport = { width: WIDTH, height: HEIGHT, dpr: 1 };

    this.boundFrame = (timestamp) => this.frame(timestamp);
    this.boundResize = () => this.handleResize();
    this.boundKeyDown = (event) => this.onKeyDown(event);
    this.boundKeyUp = (event) => this.onKeyUp(event);
    this.boundBlur = () => this.clearAimKeyState();
    this.boundPointerDown = (event) => this.onPointerDown(event);
    this.boundPointerMove = (event) => this.onPointerMove(event);
    this.boundPointerUp = () => this.onPointerUp();
  }

  get currentLevel() {
    return LEVELS[this.currentLevelIndex];
  }

  start() {
    this.running = true;
    this.handleResize();
    window.addEventListener("resize", this.boundResize);
    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);
    window.addEventListener("blur", this.boundBlur);
    this.canvas.addEventListener("pointerdown", this.boundPointerDown);
    window.addEventListener("pointermove", this.boundPointerMove);
    window.addEventListener("pointerup", this.boundPointerUp);
    this.lastFrame = performance.now();
    this.frameHandle = requestAnimationFrame(this.boundFrame);
    this.emitSnapshot(true);
  }

  destroy() {
    this.running = false;
    if (this.frameHandle) {
      cancelAnimationFrame(this.frameHandle);
      this.frameHandle = null;
    }
    window.removeEventListener("resize", this.boundResize);
    window.removeEventListener("keydown", this.boundKeyDown);
    window.removeEventListener("keyup", this.boundKeyUp);
    window.removeEventListener("blur", this.boundBlur);
    this.canvas.removeEventListener("pointerdown", this.boundPointerDown);
    window.removeEventListener("pointermove", this.boundPointerMove);
    window.removeEventListener("pointerup", this.boundPointerUp);
  }

  setFullscreenState(value) {
    this.fullscreen = Boolean(value);
    this.emitSnapshot(true);
  }

  setDeviceProfile(profile) {
    this.deviceProfile = profile;
    this.emitSnapshot(true);
  }

  setAimYaw(value) {
    if (this.shotState !== "aiming" || this.screen !== "play") {
      return;
    }
    this.aim.yawDeg = clamp(Number(value) || 0, MIN_YAW, MAX_YAW);
    this.previewCacheKey = "";
    this.emitSnapshot(true);
  }

  setAimElevation(value) {
    if (this.shotState !== "aiming" || this.screen !== "play") {
      return;
    }
    this.aim.elevationDeg = clamp(Number(value) || 0, MIN_ELEVATION, MAX_ELEVATION);
    this.previewCacheKey = "";
    this.emitSnapshot(true);
  }

  setAimIntensity(value) {
    if (this.shotState !== "aiming" || this.screen !== "play") {
      return;
    }
    this.aim.intensity = clamp(Number(value) || 0, MIN_INTENSITY, MAX_INTENSITY);
    this.previewCacheKey = "";
    this.emitSnapshot(true);
  }

  startTour() {
    if (this.campaignClear) {
      this.loadLevel(0, false);
      this.campaignClear = false;
    }
    this.screen = "play";
    this.paused = false;
    this.levelClear = false;
    this.shotState = "aiming";
    this.statusMessage = this.ui.shotMessages.ready;
    this.statusReason = "ready";
    this.previewCacheKey = "";
    this.clearAimKeyState();
    this.emitSnapshot(true);
  }

  openMenu() {
    this.screen = "menu";
    this.paused = false;
    this.levelClear = false;
    this.shotState = "aiming";
    this.emitSnapshot(true);
  }

  togglePause() {
    if (this.screen !== "play" || this.levelClear || this.campaignClear) {
      return;
    }
    this.paused = !this.paused;
    this.emitSnapshot(true);
  }

  restartLevel() {
    this.loadLevel(this.currentLevelIndex, true);
    if (this.screen === "menu") {
      this.screen = "play";
    }
    this.emitSnapshot(true);
  }

  selectLevel(levelOneBased) {
    const parsed = clamp(Number(levelOneBased) || 1, 1, this.unlockedLevel);
    this.loadLevel(parsed - 1, false);
    if (this.screen === "menu") {
      this.screen = "play";
    }
    this.emitSnapshot(true);
  }

  nextLevel() {
    if (!this.levelClear && !this.campaignClear) {
      return;
    }
    const nextIndex = this.currentLevelIndex + 1;
    if (nextIndex >= MAX_LEVELS) {
      this.campaignClear = true;
      this.levelClear = false;
      this.screen = "menu";
      this.emitSnapshot(true);
      return;
    }
    this.loadLevel(nextIndex, false);
    this.screen = "play";
    this.levelClear = false;
    this.campaignClear = false;
    this.emitSnapshot(true);
  }

  launchArrow() {
    if (this.screen !== "play" || this.paused || this.shotState !== "aiming") {
      return;
    }

    const velocity = buildVelocityFromAim(this.aim);
    this.arrow = {
      x: 0,
      y: 1.55,
      z: 0,
      vx: velocity.vx,
      vy: velocity.vy,
      vz: velocity.vz,
      inFlight: true,
    };
    this.shotState = "flight";
    this.result = {
      hit: false,
      ring: "",
      score: 0,
      zonePoints: 0,
      distanceBonus: 0,
      reason: "",
      impact: null,
      distanceToCenter: null,
    };
    this.flightTime = 0;
    this.resultTimer = 0;
    this.arrowTrail = [];
    this.stats.shots += 1;
    this.camera.mode = "follow";
    this.clearAimKeyState();
    this.statusMessage = this.ui.shotMessages.ready;
    this.statusReason = "flight";
    this.persistProgress();
    this.emitSnapshot(true);
  }

  persistProgress() {
    saveProgress({
      unlockedLevel: this.unlockedLevel,
      lastLevel: clamp(this.currentLevelIndex + 1, 1, MAX_LEVELS),
      stats: {
        shots: this.stats.shots,
        hits: this.stats.hits,
        bullseyes: this.stats.bullseyes,
        score: this.stats.score,
        bestStreak: this.stats.bestStreak,
        currentStreak: this.stats.currentStreak,
      },
    });
  }

  loadLevel(index, keepAim) {
    this.currentLevelIndex = clamp(index, 0, MAX_LEVELS - 1);
    const level = this.currentLevel;
    if (!keepAim) {
      this.aim = computeRecommendedAim(level);
    }
    this.arrow = {
      x: 0,
      y: 1.55,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      inFlight: false,
    };
    this.arrowTrail = [];
    this.shotState = "aiming";
    this.resultTimer = 0;
    this.flightTime = 0;
    this.paused = false;
    this.levelClear = false;
    this.statusMessage = this.ui.shotMessages.ready;
    this.statusReason = "ready";
    this.result = {
      hit: false,
      ring: "",
      score: 0,
      zonePoints: 0,
      distanceBonus: 0,
      reason: "",
      impact: null,
      distanceToCenter: null,
    };
    this.previewCacheKey = "";
    this.camera.mode = "aim";
    this.clearAimKeyState();
    this.persistProgress();
  }

  setLevelCompleted(result) {
    this.shotState = "result";
    this.resultTimer = 0;
    this.result = {
      zonePoints: 0,
      distanceBonus: 0,
      ...result,
    };
    this.arrow.inFlight = false;
    this.camera.mode = "impact";

    if (result.hit) {
      this.stats.hits += 1;
      this.stats.score += result.score;
      this.stats.currentStreak += 1;
      this.stats.bestStreak = Math.max(this.stats.bestStreak, this.stats.currentStreak);
      if (result.ringKey === "bullseye") {
        this.stats.bullseyes += 1;
      }
      this.levelClear = true;
      this.statusReason = "levelComplete";
      this.statusMessage = `${result.ring} (+${result.score})`;
      if (this.currentLevelIndex + 2 > this.unlockedLevel) {
        this.unlockedLevel = clamp(this.currentLevelIndex + 2, 1, MAX_LEVELS);
      }
      if (this.currentLevelIndex === MAX_LEVELS - 1) {
        this.campaignClear = true;
        this.statusReason = "campaignComplete";
        this.statusMessage = this.ui.shotMessages.campaignComplete;
      }
    } else {
      this.stats.currentStreak = 0;
      this.levelClear = false;
      this.statusReason = result.reason;
      const missLabel = this.ui.shotMessages[result.reason] ?? this.ui.shotMessages.missTarget;
      this.statusMessage = `${missLabel} (+0)`;
    }

    this.persistProgress();
  }

  resolveWind(level, timeSec) {
    return {
      x: level.wind.baseX + Math.sin(timeSec * level.wind.freq + level.wind.phase) * level.wind.gustX,
      z: level.wind.forward * Math.cos(timeSec * (level.wind.freq * 0.6) + level.wind.phase * 0.5),
    };
  }

  resolveUpdraft(level, arrow, timeSec) {
    let lift = 0;
    for (const zone of level.updraftZones) {
      if (arrow.z >= zone.startZ && arrow.z <= zone.endZ && Math.abs(arrow.x - zone.centerX) <= zone.halfWidth) {
        lift += zone.lift * (0.65 + 0.35 * Math.sin(timeSec * zone.pulse + zone.id.length));
      }
    }
    return lift;
  }

  checkWallImpact(level, prevState, nextState, timeAtFrameStart, dt) {
    let closestEvent = null;
    for (const wall of level.walls) {
      if (prevState.z > wall.z || nextState.z < wall.z) {
        continue;
      }
      const dz = nextState.z - prevState.z;
      if (Math.abs(dz) < 1e-4) {
        continue;
      }
      const t = (wall.z - prevState.z) / dz;
      if (t < 0 || t > 1) {
        continue;
      }
      const eventTime = timeAtFrameStart + dt * t;
      const wallX = getWallX(wall, eventTime);
      const xAt = lerp(prevState.x, nextState.x, t);
      const yAt = lerp(prevState.y, nextState.y, t);
      const withinWidth = Math.abs(xAt - wallX) <= wall.width * 0.5;
      const insideGap = yAt >= wall.gapBottom && yAt <= wall.gapBottom + wall.gapHeight;
      if (withinWidth && !insideGap) {
        if (!closestEvent || t < closestEvent.t) {
          closestEvent = {
            t,
            x: xAt,
            y: yAt,
            z: wall.z,
            reason: "wall",
          };
        }
      }
    }
    return closestEvent;
  }

  updateArrow(dt) {
    const level = this.currentLevel;
    const prev = { ...this.arrow };
    const wind = this.resolveWind(level, this.flightTime);
    const updraft = this.resolveUpdraft(level, this.arrow, this.flightTime);
    const speed = Math.hypot(this.arrow.vx, this.arrow.vy, this.arrow.vz);
    const dragFactor = level.drag * speed;

    this.arrow.vx += (wind.x - dragFactor * this.arrow.vx * 0.028) * dt;
    this.arrow.vy += (-level.gravity + updraft - dragFactor * this.arrow.vy * 0.021) * dt;
    this.arrow.vz += (wind.z - dragFactor * this.arrow.vz * 0.022) * dt;

    this.arrow.x += this.arrow.vx * dt;
    this.arrow.y += this.arrow.vy * dt;
    this.arrow.z += this.arrow.vz * dt;

    this.flightTime += dt;

    if (this.arrowTrail.length > 72) {
      this.arrowTrail.shift();
    }
    this.arrowTrail.push({ x: this.arrow.x, y: this.arrow.y, z: this.arrow.z });

    const wallEvent = this.checkWallImpact(level, prev, this.arrow, this.flightTime - dt, dt);
    if (wallEvent) {
      this.arrow.x = wallEvent.x;
      this.arrow.y = Math.max(0, wallEvent.y);
      this.arrow.z = wallEvent.z;
      this.setLevelCompleted({
        hit: false,
        ring: "",
        ringKey: "",
        score: 0,
        zonePoints: 0,
        distanceBonus: 0,
        reason: wallEvent.reason,
        impact: { x: wallEvent.x, y: wallEvent.y, z: wallEvent.z },
        distanceToCenter: null,
      });
      return;
    }

    const targetBefore = getTargetAtTime(level, this.flightTime - dt);
    const targetAfter = getTargetAtTime(level, this.flightTime);
    const targetZ = level.target.z;
    if (prev.z <= targetZ && this.arrow.z >= targetZ) {
      const dz = this.arrow.z - prev.z;
      const t = Math.abs(dz) < 1e-5 ? 0 : (targetZ - prev.z) / dz;
      const impactX = lerp(prev.x, this.arrow.x, clamp(t, 0, 1));
      const impactY = lerp(prev.y, this.arrow.y, clamp(t, 0, 1));
      const targetInterpolated = {
        x: lerp(targetBefore.x, targetAfter.x, clamp(t, 0, 1)),
        y: lerp(targetBefore.y, targetAfter.y, clamp(t, 0, 1)),
        z: targetZ,
        radius: level.target.radius,
      };
      const distanceToCenter = Math.hypot(impactX - targetInterpolated.x, impactY - targetInterpolated.y);
      const ratio = distanceToCenter / targetInterpolated.radius;

      if (ratio <= 1) {
        const ring = classifyHitRing(ratio, this.locale);
        const difficultyBonus = Math.round(level.difficultyBand * 14 + level.target.z * 0.08);
        this.arrow.x = impactX;
        this.arrow.y = impactY;
        this.arrow.z = targetZ;
        this.setLevelCompleted({
          hit: true,
          ring: ring.text,
          ringKey: ring.key,
          score: ring.scoreBase + difficultyBonus,
          zonePoints: ring.scoreBase,
          distanceBonus: difficultyBonus,
          reason: ring.key,
          impact: { x: impactX, y: impactY, z: targetZ },
          distanceToCenter: toFixedNumber(distanceToCenter, 3),
        });
        return;
      }

      this.arrow.x = impactX;
      this.arrow.y = impactY;
      this.arrow.z = targetZ;
      this.setLevelCompleted({
        hit: false,
        ring: "",
        ringKey: "",
        score: 0,
        zonePoints: 0,
        distanceBonus: 0,
        reason: "missTarget",
        impact: { x: impactX, y: impactY, z: targetZ },
        distanceToCenter: toFixedNumber(distanceToCenter, 3),
      });
      return;
    }

    if (this.arrow.y <= 0) {
      const denom = prev.y - this.arrow.y;
      const t = Math.abs(denom) < 1e-5 ? 0 : prev.y / denom;
      const impactX = lerp(prev.x, this.arrow.x, clamp(t, 0, 1));
      const impactZ = lerp(prev.z, this.arrow.z, clamp(t, 0, 1));
      this.arrow.x = impactX;
      this.arrow.y = 0;
      this.arrow.z = impactZ;
      this.setLevelCompleted({
        hit: false,
        ring: "",
        ringKey: "",
        score: 0,
        zonePoints: 0,
        distanceBonus: 0,
        reason: "ground",
        impact: { x: impactX, y: 0, z: impactZ },
        distanceToCenter: null,
      });
      return;
    }

    if (Math.abs(this.arrow.x) > 40 || this.arrow.z > level.target.z + 120) {
      this.setLevelCompleted({
        hit: false,
        ring: "",
        ringKey: "",
        score: 0,
        zonePoints: 0,
        distanceBonus: 0,
        reason: "out",
        impact: { x: this.arrow.x, y: Math.max(0, this.arrow.y), z: this.arrow.z },
        distanceToCenter: null,
      });
    }
  }

  updateCamera(dt) {
    const level = this.currentLevel;
    let targetCamera;
    if (this.camera.mode === "follow" && this.shotState === "flight") {
      targetCamera = {
        x: this.arrow.x * 0.78,
        y: clamp(1.35 + this.arrow.y * 0.42, 1.2, 9.8),
        z: clamp(this.arrow.z - 2.6, 0, level.target.z + 24),
      };
    } else if (this.camera.mode === "impact" && this.result.impact) {
      targetCamera = {
        x: this.result.impact.x * 0.55,
        y: clamp(1.4 + this.result.impact.y * 0.42, 1.3, 8.6),
        z: clamp(this.result.impact.z - 6, 0, level.target.z + 22),
      };
    } else {
      targetCamera = { x: 0, y: 1.75, z: 0 };
      this.camera.mode = "aim";
    }

    const smoothing = 1 - Math.exp(-dt * 6.5);
    this.camera.x = lerp(this.camera.x, targetCamera.x, smoothing);
    this.camera.y = lerp(this.camera.y, targetCamera.y, smoothing);
    this.camera.z = lerp(this.camera.z, targetCamera.z, smoothing);
  }

  clearAimKeyState() {
    this.keyState.yawLeft = false;
    this.keyState.yawRight = false;
    this.keyState.elevUp = false;
    this.keyState.elevDown = false;
    this.keyState.coarseElevUp = false;
    this.keyState.coarseElevDown = false;
    this.keyState.intensityUp = false;
    this.keyState.intensityDown = false;
    this.keyState.intensityFineUp = false;
    this.keyState.intensityFineDown = false;
    this.keyState.shift = false;
  }

  setAimKeyState(code, isPressed) {
    switch (code) {
      case "ShiftLeft":
      case "ShiftRight":
        this.keyState.shift = isPressed;
        return true;
      case "ArrowLeft":
      case "KeyA":
      case "KeyJ":
        this.keyState.yawLeft = isPressed;
        return true;
      case "ArrowRight":
      case "KeyD":
      case "KeyL":
        this.keyState.yawRight = isPressed;
        return true;
      case "ArrowUp":
      case "KeyI":
        this.keyState.elevUp = isPressed;
        return true;
      case "ArrowDown":
      case "KeyK":
        this.keyState.elevDown = isPressed;
        return true;
      case "KeyQ":
        this.keyState.coarseElevUp = isPressed;
        return true;
      case "KeyE":
        this.keyState.coarseElevDown = isPressed;
        return true;
      case "KeyW":
      case "Equal":
      case "NumpadAdd":
        this.keyState.intensityUp = isPressed;
        return true;
      case "KeyS":
      case "Minus":
      case "NumpadSubtract":
        this.keyState.intensityDown = isPressed;
        return true;
      case "KeyX":
        this.keyState.intensityFineUp = isPressed;
        return true;
      case "KeyZ":
        this.keyState.intensityFineDown = isPressed;
        return true;
      default:
        return false;
    }
  }

  applyAimKeyboard(dt) {
    if (this.screen !== "play" || this.paused || this.shotState !== "aiming") {
      return;
    }

    const fine = this.keyState.shift;
    const yawSpeed = fine ? 16 : 42;
    const elevationSpeed = fine ? 12 : 30;
    const intensitySpeed = fine ? 0.12 : 0.34;

    let nextYaw = this.aim.yawDeg;
    let nextElevation = this.aim.elevationDeg;
    let nextIntensity = this.aim.intensity;

    if (this.keyState.yawLeft) {
      nextYaw -= yawSpeed * dt;
    }
    if (this.keyState.yawRight) {
      nextYaw += yawSpeed * dt;
    }
    if (this.keyState.elevUp) {
      nextElevation += elevationSpeed * dt;
    }
    if (this.keyState.elevDown) {
      nextElevation -= elevationSpeed * dt;
    }
    if (this.keyState.coarseElevUp) {
      nextElevation += elevationSpeed * 1.8 * dt;
    }
    if (this.keyState.coarseElevDown) {
      nextElevation -= elevationSpeed * 1.8 * dt;
    }
    if (this.keyState.intensityUp) {
      nextIntensity += intensitySpeed * dt;
    }
    if (this.keyState.intensityDown) {
      nextIntensity -= intensitySpeed * dt;
    }
    if (this.keyState.intensityFineUp) {
      nextIntensity += intensitySpeed * 0.42 * dt;
    }
    if (this.keyState.intensityFineDown) {
      nextIntensity -= intensitySpeed * 0.42 * dt;
    }

    nextYaw = clamp(nextYaw, MIN_YAW, MAX_YAW);
    nextElevation = clamp(nextElevation, MIN_ELEVATION, MAX_ELEVATION);
    nextIntensity = clamp(nextIntensity, MIN_INTENSITY, MAX_INTENSITY);

    const changed =
      Math.abs(nextYaw - this.aim.yawDeg) > 1e-5 ||
      Math.abs(nextElevation - this.aim.elevationDeg) > 1e-5 ||
      Math.abs(nextIntensity - this.aim.intensity) > 1e-5;

    if (changed) {
      this.aim.yawDeg = nextYaw;
      this.aim.elevationDeg = nextElevation;
      this.aim.intensity = nextIntensity;
      this.previewCacheKey = "";
      this.emitSnapshot(true);
    }
  }

  nudgeAimKey(code, isFine) {
    const yawStep = isFine ? 0.22 : 0.8;
    const elevationStep = isFine ? 0.26 : 0.85;
    const elevationCoarseStep = isFine ? 0.95 : 2.3;
    const intensityStep = isFine ? 0.004 : 0.016;
    const intensityFineStep = isFine ? 0.0022 : 0.0068;

    switch (code) {
      case "ArrowLeft":
      case "KeyA":
      case "KeyJ":
        this.setAimYaw(this.aim.yawDeg - yawStep);
        return true;
      case "ArrowRight":
      case "KeyD":
      case "KeyL":
        this.setAimYaw(this.aim.yawDeg + yawStep);
        return true;
      case "ArrowUp":
      case "KeyI":
        this.setAimElevation(this.aim.elevationDeg + elevationStep);
        return true;
      case "ArrowDown":
      case "KeyK":
        this.setAimElevation(this.aim.elevationDeg - elevationStep);
        return true;
      case "KeyQ":
        this.setAimElevation(this.aim.elevationDeg + elevationCoarseStep);
        return true;
      case "KeyE":
        this.setAimElevation(this.aim.elevationDeg - elevationCoarseStep);
        return true;
      case "KeyW":
      case "Equal":
      case "NumpadAdd":
        this.setAimIntensity(this.aim.intensity + intensityStep);
        return true;
      case "KeyS":
      case "Minus":
      case "NumpadSubtract":
        this.setAimIntensity(this.aim.intensity - intensityStep);
        return true;
      case "KeyX":
        this.setAimIntensity(this.aim.intensity + intensityFineStep);
        return true;
      case "KeyZ":
        this.setAimIntensity(this.aim.intensity - intensityFineStep);
        return true;
      default:
        return false;
    }
  }

  applyTrajectoryPreset(code) {
    if (code === "Digit6") {
      const recommended = computeRecommendedAim(this.currentLevel);
      this.aim.yawDeg = recommended.yawDeg;
      this.aim.elevationDeg = recommended.elevationDeg;
      this.aim.intensity = recommended.intensity;
      this.previewCacheKey = "";
      this.emitSnapshot(true);
      return true;
    }

    const presets = {
      Digit1: { elevation: 22, intensity: 0.36 },
      Digit2: { elevation: 28, intensity: 0.48 },
      Digit3: { elevation: 34, intensity: 0.6 },
      Digit4: { elevation: 40, intensity: 0.72 },
      Digit5: { elevation: 48, intensity: 0.84 },
    };
    const preset = presets[code];
    if (!preset) {
      return false;
    }
    this.aim.elevationDeg = clamp(preset.elevation, MIN_ELEVATION, MAX_ELEVATION);
    this.aim.intensity = clamp(preset.intensity, MIN_INTENSITY, MAX_INTENSITY);
    this.previewCacheKey = "";
    this.emitSnapshot(true);
    return true;
  }

  update(dt) {
    this.time += dt;
    if (this.screen !== "play") {
      this.clearAimKeyState();
      this.updateCamera(dt);
      return;
    }

    if (!this.paused) {
      this.applyAimKeyboard(dt);
      if (this.shotState === "flight") {
        this.updateArrow(dt);
      } else if (this.shotState === "result") {
        this.resultTimer += dt;
        if (!this.levelClear && this.resultTimer > 1.18) {
          this.shotState = "aiming";
          this.resultTimer = 0;
          this.camera.mode = "aim";
          this.arrow = {
            x: 0,
            y: 1.55,
            z: 0,
            vx: 0,
            vy: 0,
            vz: 0,
            inFlight: false,
          };
          this.arrowTrail = [];
          this.statusMessage = this.ui.shotMessages.ready;
          this.statusReason = "ready";
          this.clearAimKeyState();
        }
      }
    }

    this.updateCamera(dt);
  }

  advanceTime(ms = DT_MS) {
    const safeMs = Math.max(0, Number(ms) || 0);
    const steps = Math.max(1, Math.round(safeMs / DT_MS));
    for (let i = 0; i < steps; i += 1) {
      this.update(DT);
    }
    this.render();
    this.emitSnapshot(true);
  }

  onKeyDown(event) {
    const { code } = event;
    const inAim = this.screen === "play" && this.shotState === "aiming" && !this.paused;
    const inPlay = this.screen === "play";

    if (
      code === "ArrowLeft" ||
      code === "ArrowRight" ||
      code === "ArrowUp" ||
      code === "ArrowDown" ||
      code === "Space" ||
      code === "Equal" ||
      code === "Minus"
    ) {
      event.preventDefault();
    }

    this.setAimKeyState(code, true);

    if (event.repeat) {
      return;
    }

    if (code === "KeyF") {
      this.onFullscreenRequest?.();
      return;
    }

    if (code === "KeyP") {
      if (inPlay) {
        this.togglePause();
      }
      return;
    }

    if (code === "KeyR") {
      if (inPlay) {
        this.restartLevel();
      }
      return;
    }

    if (code === "KeyN") {
      this.nextLevel();
      return;
    }

    if (this.screen === "menu" && (code === "Enter" || code === "Space")) {
      this.startTour();
      return;
    }

    if (!inAim) {
      return;
    }

    if (code === "Enter" || code === "Space") {
      this.launchArrow();
      return;
    }

    if (this.applyTrajectoryPreset(code)) {
      return;
    }

    if (this.nudgeAimKey(code, this.keyState.shift || event.shiftKey)) {
      return;
    }
  }

  onKeyUp(event) {
    this.setAimKeyState(event.code, false);
  }

  onPointerDown(event) {
    if (this.screen !== "play" || this.shotState !== "aiming") {
      return;
    }
    this.pointerDown = true;
    this.updateAimFromPointer(event.clientX, event.clientY);
  }

  onPointerMove(event) {
    if (!this.pointerDown) {
      return;
    }
    this.updateAimFromPointer(event.clientX, event.clientY);
  }

  onPointerUp() {
    this.pointerDown = false;
  }

  updateAimFromPointer(clientX, clientY) {
    if (this.screen !== "play" || this.shotState !== "aiming") {
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const normalizedX = clamp((clientX - rect.left) / rect.width, 0, 1);
    const normalizedY = clamp((clientY - rect.top) / rect.height, 0, 1);

    const yaw = lerp(MIN_YAW, MAX_YAW, normalizedX);
    const elevation = lerp(MAX_ELEVATION, MIN_ELEVATION, normalizedY);

    this.aim.yawDeg = toFixedNumber(yaw, 2);
    this.aim.elevationDeg = toFixedNumber(elevation, 2);
    this.previewCacheKey = "";
    this.emitSnapshot(true);
  }

  handleResize() {
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || WIDTH;
    const height = rect.height || HEIGHT;

    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);

    this.viewport = { width, height, dpr };

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.render();
    this.emitSnapshot(true);
  }

  frame(timestamp) {
    if (!this.running) {
      return;
    }

    const elapsed = Math.min(0.1, (timestamp - this.lastFrame) / 1000);
    this.lastFrame = timestamp;
    this.accumulator += elapsed;

    while (this.accumulator >= DT) {
      this.update(DT);
      this.accumulator -= DT;
      this.snapshotAccumulator += DT;
    }

    this.render();
    this.emitSnapshot(false);
    this.frameHandle = requestAnimationFrame(this.boundFrame);
  }

  emitSnapshot(force) {
    if (!force && this.snapshotAccumulator < 1 / 20) {
      return;
    }
    this.snapshotAccumulator = 0;
    this.onSnapshot?.(this.buildSnapshot());
  }

  buildSnapshot() {
    const level = this.currentLevel;
    const target = getTargetAtTime(level, this.time);
    const wind = this.resolveWind(level, this.time);
    const speed = Math.hypot(this.arrow.vx, this.arrow.vy, this.arrow.vz);

    const statusLabel = this.ui.status[
      this.campaignClear
        ? "campaignClear"
        : this.levelClear
          ? "levelClear"
          : this.paused
            ? "paused"
            : this.screen === "play"
              ? "play"
              : "menu"
    ];

    return {
      mode: "arcade-archery-horizon",
      screen: this.screen,
      playState: this.shotState,
      locale: this.locale,
      coordinates: DEFAULT_SNAPSHOT.coordinates,
      level: {
        index: this.currentLevelIndex + 1,
        total: MAX_LEVELS,
        unlocked: this.unlockedLevel,
        environment: this.locale === "es" ? level.environment.nameEs : level.environment.nameEn,
        difficulty: getDifficultyLabel(this.currentLevelIndex, this.locale),
        distance: toFixedNumber(level.target.z, 2),
        gravity: toFixedNumber(level.gravity, 3),
        drag: toFixedNumber(level.drag, 4),
        windX: toFixedNumber(wind.x, 3),
        windZ: toFixedNumber(wind.z, 3),
      },
      aim: {
        yawDeg: toFixedNumber(this.aim.yawDeg, 2),
        elevationDeg: toFixedNumber(this.aim.elevationDeg, 2),
        intensity: toFixedNumber(this.aim.intensity, 3),
      },
      target: {
        x: toFixedNumber(target.x, 3),
        y: toFixedNumber(target.y, 3),
        z: toFixedNumber(target.z, 3),
        radius: toFixedNumber(target.radius, 3),
        moving: target.moving,
        movingAmplitude: toFixedNumber(level.target.movingAmplitude, 3),
      },
      arrow: {
        inFlight: this.shotState === "flight",
        x: toFixedNumber(this.arrow.x, 3),
        y: toFixedNumber(this.arrow.y, 3),
        z: toFixedNumber(this.arrow.z, 3),
        vx: toFixedNumber(this.arrow.vx, 3),
        vy: toFixedNumber(this.arrow.vy, 3),
        vz: toFixedNumber(this.arrow.vz, 3),
        speed: toFixedNumber(speed, 3),
      },
      camera: {
        mode: this.camera.mode,
        x: toFixedNumber(this.camera.x, 3),
        y: toFixedNumber(this.camera.y, 3),
        z: toFixedNumber(this.camera.z, 3),
      },
      stats: {
        attempts: this.stats.shots,
        hits: this.stats.hits,
        bullseyes: this.stats.bullseyes,
        score: this.stats.score,
        streak: this.stats.currentStreak,
        bestStreak: this.stats.bestStreak,
      },
      result: { ...this.result },
      message: this.statusMessage,
      statusLabel,
      trajectoryPreview: this.getTrajectoryPreview(),
      trajectoryDepth: toFixedNumber(this.estimateDepthForAim(), 2),
      fullscreen: this.fullscreen,
      paused: this.paused,
      levelClear: this.levelClear,
      campaignClear: this.campaignClear,
      deviceProfile: this.deviceProfile,
    };
  }

  estimateDepthForAim() {
    const level = this.currentLevel;
    const samples = this.getTrajectoryPreview();
    if (!samples.length) {
      return level.target.z;
    }
    return samples[samples.length - 1].z;
  }

  getTrajectoryPreview() {
    if (this.shotState !== "aiming") {
      return [];
    }

    const key = `${this.currentLevelIndex}|${this.aim.yawDeg.toFixed(2)}|${this.aim.elevationDeg.toFixed(2)}|${this.aim.intensity.toFixed(3)}`;
    if (key === this.previewCacheKey) {
      return this.previewCache;
    }

    const level = this.currentLevel;
    const velocity = buildVelocityFromAim(this.aim);
    let x = 0;
    let y = 1.55;
    let z = 0;
    let vx = velocity.vx;
    let vy = velocity.vy;
    let vz = velocity.vz;
    let t = 0;

    const points = [];
    for (let step = 0; step < 55; step += 1) {
      const dt = 0.07;
      const wind = this.resolveWind(level, t);
      const speed = Math.hypot(vx, vy, vz);
      const dragFactor = level.drag * speed;
      let updraft = 0;
      for (const zone of level.updraftZones) {
        if (z >= zone.startZ && z <= zone.endZ && Math.abs(x - zone.centerX) <= zone.halfWidth) {
          updraft += zone.lift * 0.6;
        }
      }

      vx += (wind.x - dragFactor * vx * 0.028) * dt;
      vy += (-level.gravity + updraft - dragFactor * vy * 0.021) * dt;
      vz += (wind.z - dragFactor * vz * 0.022) * dt;
      x += vx * dt;
      y += vy * dt;
      z += vz * dt;
      t += dt;

      points.push({
        x: toFixedNumber(x, 2),
        y: toFixedNumber(y, 2),
        z: toFixedNumber(z, 2),
      });

      if (y <= 0 || z >= level.target.z + 30) {
        break;
      }
    }

    this.previewCacheKey = key;
    this.previewCache = points;
    return points;
  }

  project(point) {
    const { width, height } = this.viewport;
    const focal = width * 0.58;
    const horizonY = height * 0.34;

    const relX = point.x - this.camera.x;
    const relY = point.y - this.camera.y;
    const relZ = point.z - this.camera.z;

    if (relZ <= 0.1) {
      return null;
    }

    const scale = focal / relZ;

    return {
      x: width * 0.5 + relX * scale,
      y: horizonY - relY * scale,
      scale,
      depth: relZ,
      horizonY,
    };
  }

  drawBackground(level) {
    const ctx = this.ctx;
    const { width, height } = this.viewport;

    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, level.environment.skyTop);
    sky.addColorStop(0.58, level.environment.skyBottom);
    sky.addColorStop(1, level.environment.groundFar);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    const horizon = height * 0.34;

    const drawRange = (baseY, ampA, ampB, freqA, freqB, color, phase) => {
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 8) {
        const y =
          baseY +
          Math.sin((x + phase) * freqA) * ampA +
          Math.sin((x + phase * 0.65) * freqB) * ampB;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };

    drawRange(
      horizon + 40,
      16,
      9,
      0.007,
      0.019,
      level.environment.mountainB,
      this.time * 18
    );

    drawRange(
      horizon + 70,
      22,
      12,
      0.011,
      0.023,
      level.environment.mountainA,
      this.time * 24 + 40
    );

    ctx.fillStyle = level.environment.haze;
    ctx.fillRect(0, horizon - 18, width, 80);
  }

  drawGroundGrid(level) {
    const ctx = this.ctx;
    const { width, height } = this.viewport;

    const horizon = height * 0.34;
    const groundGradient = ctx.createLinearGradient(0, horizon, 0, height);
    groundGradient.addColorStop(0, level.environment.groundFar);
    groundGradient.addColorStop(1, level.environment.groundNear);
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, horizon, width, height - horizon);

    ctx.lineWidth = 1;

    for (let z = 12; z < level.target.z + 120; z += 14) {
      const left = this.project({ x: -28, y: 0, z });
      const right = this.project({ x: 28, y: 0, z });
      if (!left || !right) {
        continue;
      }
      const alpha = clamp(1 - z / (level.target.z + 120), 0.08, 0.32);
      ctx.strokeStyle = `rgba(240, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.stroke();
    }

    for (let x = -28; x <= 28; x += 4) {
      const near = this.project({ x, y: 0, z: 6 });
      const far = this.project({ x, y: 0, z: level.target.z + 100 });
      if (!near || !far) {
        continue;
      }
      const alpha = x % 8 === 0 ? 0.22 : 0.1;
      ctx.strokeStyle = `rgba(230, 250, 255, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(near.x, near.y);
      ctx.lineTo(far.x, far.y);
      ctx.stroke();
    }
  }

  drawUpdrafts(level) {
    const ctx = this.ctx;
    for (const zone of level.updraftZones) {
      const nearLeft = this.project({ x: zone.centerX - zone.halfWidth, y: 0, z: zone.startZ });
      const nearRight = this.project({ x: zone.centerX + zone.halfWidth, y: 0, z: zone.startZ });
      const farLeft = this.project({ x: zone.centerX - zone.halfWidth, y: 0, z: zone.endZ });
      const farRight = this.project({ x: zone.centerX + zone.halfWidth, y: 0, z: zone.endZ });
      if (!nearLeft || !nearRight || !farLeft || !farRight) {
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(nearLeft.x, nearLeft.y);
      ctx.lineTo(nearRight.x, nearRight.y);
      ctx.lineTo(farRight.x, farRight.y);
      ctx.lineTo(farLeft.x, farLeft.y);
      ctx.closePath();
      ctx.fillStyle = "rgba(110, 245, 255, 0.14)";
      ctx.fill();

      ctx.strokeStyle = "rgba(140, 255, 255, 0.35)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  drawWalls(level) {
    const ctx = this.ctx;
    for (const wall of level.walls) {
      const wallX = getWallX(wall, this.time);
      const topLeft = this.project({ x: wallX - wall.width * 0.5, y: 6.2, z: wall.z });
      const topRight = this.project({ x: wallX + wall.width * 0.5, y: 6.2, z: wall.z });
      const bottomLeft = this.project({ x: wallX - wall.width * 0.5, y: 0, z: wall.z });
      const bottomRight = this.project({ x: wallX + wall.width * 0.5, y: 0, z: wall.z });
      const gapTopLeft = this.project({ x: wallX - wall.width * 0.5, y: wall.gapBottom + wall.gapHeight, z: wall.z });
      const gapBottomLeft = this.project({ x: wallX - wall.width * 0.5, y: wall.gapBottom, z: wall.z });

      if (!topLeft || !topRight || !bottomLeft || !bottomRight || !gapTopLeft || !gapBottomLeft) {
        continue;
      }

      ctx.fillStyle = "rgba(55, 38, 22, 0.88)";
      ctx.fillRect(
        Math.min(topLeft.x, bottomLeft.x),
        Math.min(topLeft.y, gapTopLeft.y),
        Math.abs(topRight.x - topLeft.x),
        Math.abs(gapTopLeft.y - topLeft.y)
      );
      ctx.fillRect(
        Math.min(gapBottomLeft.x, bottomLeft.x),
        Math.min(gapBottomLeft.y, bottomLeft.y),
        Math.abs(bottomRight.x - bottomLeft.x),
        Math.abs(bottomLeft.y - gapBottomLeft.y)
      );

      ctx.strokeStyle = "rgba(245, 197, 126, 0.7)";
      ctx.lineWidth = 1.4;
      ctx.strokeRect(
        Math.min(topLeft.x, bottomLeft.x),
        Math.min(topLeft.y, bottomLeft.y),
        Math.abs(topRight.x - topLeft.x),
        Math.abs(bottomLeft.y - topLeft.y)
      );
    }
  }

  drawTarget(level) {
    const ctx = this.ctx;
    const target = getTargetAtTime(level, this.time);
    const center = this.project({ x: target.x, y: target.y, z: target.z });
    const base = this.project({ x: target.x, y: 0, z: target.z });
    const top = this.project({ x: target.x, y: target.y + target.radius * 1.2, z: target.z });
    if (!center || !base || !top) {
      return;
    }

    const radius = Math.max(4, target.radius * center.scale);

    ctx.strokeStyle = "rgba(52, 33, 10, 0.9)";
    ctx.lineWidth = Math.max(1.5, center.scale * 0.08);
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(top.x, top.y);
    ctx.stroke();

    const ringColors = ["#f6f8fb", "#cf2a2a", "#1f4fd8", "#f6c533"];
    const ringScales = [1, 0.74, 0.48, 0.2];

    for (let i = 0; i < ringScales.length; i += 1) {
      ctx.beginPath();
      ctx.fillStyle = ringColors[i];
      ctx.arc(center.x, center.y, radius * ringScales[i], 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawArcher() {
    const ctx = this.ctx;
    const feet = this.project({ x: 0, y: 0, z: 0 });
    const head = this.project({ x: 0, y: 1.8, z: 0 });
    if (!feet || !head) {
      return;
    }

    const bodyHeight = Math.abs(feet.y - head.y);
    const bodyWidth = bodyHeight * 0.24;

    ctx.fillStyle = "#1f232f";
    ctx.fillRect(feet.x - bodyWidth * 0.45, head.y + bodyHeight * 0.2, bodyWidth * 0.9, bodyHeight * 0.65);

    ctx.beginPath();
    ctx.fillStyle = "#f2c39a";
    ctx.arc(head.x, head.y + bodyHeight * 0.08, bodyWidth * 0.42, 0, Math.PI * 2);
    ctx.fill();

    const armY = head.y + bodyHeight * 0.42;
    const bowLength = bodyHeight * 0.62;
    const yawFactor = this.aim.yawDeg / MAX_YAW;

    ctx.strokeStyle = "#5c2d12";
    ctx.lineWidth = Math.max(1.3, bodyWidth * 0.18);
    ctx.beginPath();
    ctx.moveTo(head.x + yawFactor * 16, armY - bowLength * 0.42);
    ctx.quadraticCurveTo(head.x + yawFactor * 22, armY, head.x + yawFactor * 16, armY + bowLength * 0.42);
    ctx.stroke();

    ctx.strokeStyle = "rgba(245, 244, 239, 0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(head.x + yawFactor * 16, armY - bowLength * 0.42);
    ctx.lineTo(head.x + yawFactor * 16, armY + bowLength * 0.42);
    ctx.stroke();
  }

  drawPovBowOverlay() {
    if (this.screen !== "play" || this.shotState !== "aiming") {
      return;
    }

    const ctx = this.ctx;
    const { width, height } = this.viewport;
    const level = this.currentLevel;

    const yawNorm = clamp(this.aim.yawDeg / MAX_YAW, -1, 1);
    const intensityNorm = clamp((this.aim.intensity - MIN_INTENSITY) / (MAX_INTENSITY - MIN_INTENSITY), 0, 1);

    const yaw = (this.aim.yawDeg * Math.PI) / 180;
    const elevation = (this.aim.elevationDeg * Math.PI) / 180;
    const dir = {
      x: Math.sin(yaw) * Math.cos(elevation),
      y: Math.sin(elevation),
      z: Math.cos(yaw) * Math.cos(elevation),
    };

    let aimProjected = null;
    if (dir.z > 0.0001) {
      const t = level.target.z / dir.z;
      const aimPoint = {
        x: dir.x * t,
        y: 1.55 + dir.y * t,
        z: level.target.z,
      };
      aimProjected = this.project(aimPoint);
    }

    const targetNow = getTargetAtTime(level, this.time);
    const targetProjected = this.project({
      x: targetNow.x,
      y: targetNow.y,
      z: targetNow.z,
    });

    const anchor = aimProjected ?? targetProjected ?? {
      x: width * 0.5 + yawNorm * width * 0.16,
      y: height * 0.42 - (this.aim.elevationDeg - 30) * 2,
    };
    const start = {
      x: clamp(width * 0.5 + yawNorm * width * 0.2, width * 0.16, width * 0.84),
      y: height - 18,
    };

    const shaftDx = anchor.x - start.x;
    const shaftDy = anchor.y - start.y;
    const shaftLen = Math.hypot(shaftDx, shaftDy) || 1;
    const shaftUx = shaftDx / shaftLen;
    const shaftUy = shaftDy / shaftLen;

    const visibleLength = clamp(130 + intensityNorm * 96, 120, Math.max(140, shaftLen * 0.88));
    const arrowStart = {
      x: start.x,
      y: start.y,
    };
    const arrowEnd = {
      x: start.x + shaftUx * visibleLength,
      y: start.y + shaftUy * visibleLength,
    };

    ctx.strokeStyle = "rgba(20, 36, 52, 0.45)";
    ctx.lineWidth = Math.max(4.2, width * 0.0062);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(arrowStart.x + 2, arrowStart.y + 2);
    ctx.lineTo(arrowEnd.x + 2, arrowEnd.y + 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(240, 240, 240, 0.94)";
    ctx.lineWidth = Math.max(2.2, width * 0.0028);
    ctx.beginPath();
    ctx.moveTo(arrowStart.x, arrowStart.y);
    ctx.lineTo(arrowEnd.x, arrowEnd.y);
    ctx.stroke();

    const featherSpread = Math.max(6, width * 0.01);
    const featherBack = Math.max(10, width * 0.014);
    const featherBaseX = arrowStart.x - shaftUx * featherBack;
    const featherBaseY = arrowStart.y - shaftUy * featherBack;
    const perpX = -shaftUy;
    const perpY = shaftUx;
    ctx.strokeStyle = "rgba(190, 232, 255, 0.86)";
    ctx.lineWidth = Math.max(1.1, width * 0.0016);
    ctx.beginPath();
    ctx.moveTo(arrowStart.x, arrowStart.y);
    ctx.lineTo(featherBaseX + perpX * featherSpread, featherBaseY + perpY * featherSpread);
    ctx.moveTo(arrowStart.x, arrowStart.y);
    ctx.lineTo(featherBaseX - perpX * featherSpread, featherBaseY - perpY * featherSpread);
    ctx.stroke();

    const arrowAngle = Math.atan2(arrowEnd.y - arrowStart.y, arrowEnd.x - arrowStart.x);
    const tipLength = Math.max(8, width * 0.012);
    ctx.fillStyle = "#ff8648";
    ctx.beginPath();
    ctx.moveTo(arrowEnd.x, arrowEnd.y);
    ctx.lineTo(
      arrowEnd.x - Math.cos(arrowAngle - 0.52) * tipLength,
      arrowEnd.y - Math.sin(arrowAngle - 0.52) * tipLength
    );
    ctx.lineTo(
      arrowEnd.x - Math.cos(arrowAngle + 0.52) * tipLength,
      arrowEnd.y - Math.sin(arrowAngle + 0.52) * tipLength
    );
    ctx.closePath();
    ctx.fill();
  }

  drawPreview(level) {
    if (this.screen !== "play" || this.shotState !== "aiming") {
      return;
    }
    const points = this.getTrajectoryPreview();
    if (points.length < 2) {
      return;
    }

    const ctx = this.ctx;
    ctx.strokeStyle = "rgba(128, 216, 255, 0.46)";
    ctx.lineWidth = 1.15;
    ctx.beginPath();

    let started = false;
    for (const point of points) {
      const projected = this.project(point);
      if (!projected) {
        continue;
      }
      if (!started) {
        ctx.moveTo(projected.x, projected.y);
        started = true;
      } else {
        ctx.lineTo(projected.x, projected.y);
      }
    }
    ctx.stroke();

    const depthMarker = this.project({ x: 0, y: 0, z: level.target.z });
    if (depthMarker) {
      ctx.fillStyle = "rgba(18, 30, 36, 0.72)";
      ctx.fillRect(depthMarker.x - 80, depthMarker.y - 26, 160, 18);
      ctx.fillStyle = "rgba(207, 245, 255, 0.95)";
      ctx.font = "12px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${this.ui.labels.trajectoryDepth}: ${level.target.z.toFixed(1)}m`, depthMarker.x, depthMarker.y - 12);
    }
  }

  drawAimReticle(level) {
    if (this.screen !== "play" || this.shotState !== "aiming") {
      return;
    }

    const yaw = (this.aim.yawDeg * Math.PI) / 180;
    const elevation = (this.aim.elevationDeg * Math.PI) / 180;
    const dir = {
      x: Math.sin(yaw) * Math.cos(elevation),
      y: Math.sin(elevation),
      z: Math.cos(yaw) * Math.cos(elevation),
    };
    if (dir.z <= 0.0001) {
      return;
    }

    const t = level.target.z / dir.z;
    const point = {
      x: dir.x * t,
      y: 1.55 + dir.y * t,
      z: level.target.z,
    };
    const projected = this.project(point);
    if (!projected) {
      return;
    }

    const ctx = this.ctx;
    const radius = Math.max(6, Math.min(12, projected.scale * 0.12));
    ctx.strokeStyle = "rgba(142, 226, 255, 0.9)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(projected.x - radius - 5, projected.y);
    ctx.lineTo(projected.x + radius + 5, projected.y);
    ctx.moveTo(projected.x, projected.y - radius - 5);
    ctx.lineTo(projected.x, projected.y + radius + 5);
    ctx.stroke();
  }

  drawArrow() {
    if (this.shotState !== "flight" && !this.result.impact) {
      return;
    }

    const ctx = this.ctx;

    if (this.arrowTrail.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(188, 248, 255, 0.42)";
      ctx.lineWidth = 1.3;
      let started = false;
      for (const point of this.arrowTrail) {
        const projected = this.project(point);
        if (!projected) {
          continue;
        }
        if (!started) {
          ctx.moveTo(projected.x, projected.y);
          started = true;
        } else {
          ctx.lineTo(projected.x, projected.y);
        }
      }
      ctx.stroke();
    }

    if (this.shotState === "flight") {
      const tip = this.project(this.arrow);
      if (!tip) {
        return;
      }
      const speed = Math.hypot(this.arrow.vx, this.arrow.vy, this.arrow.vz);
      const nx = speed > 1e-5 ? this.arrow.vx / speed : 0;
      const ny = speed > 1e-5 ? this.arrow.vy / speed : 0;
      const nz = speed > 1e-5 ? this.arrow.vz / speed : 1;
      const tail = this.project({
        x: this.arrow.x - nx * 1.2,
        y: this.arrow.y - ny * 1.2,
        z: this.arrow.z - nz * 1.2,
      });
      if (!tail) {
        return;
      }

      ctx.strokeStyle = "#f2f2f2";
      ctx.lineWidth = Math.max(1.2, tip.scale * 0.12);
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();

      ctx.fillStyle = "#ff6f3f";
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, Math.max(2, tip.scale * 0.1), 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.result.impact) {
      const impact = this.project(this.result.impact);
      if (impact) {
        ctx.strokeStyle = this.result.hit ? "rgba(96, 255, 144, 0.9)" : "rgba(255, 146, 96, 0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(impact.x - 7, impact.y - 7);
        ctx.lineTo(impact.x + 7, impact.y + 7);
        ctx.moveTo(impact.x + 7, impact.y - 7);
        ctx.lineTo(impact.x - 7, impact.y + 7);
        ctx.stroke();
      }
    }
  }

  drawHud(level) {
    const ctx = this.ctx;
    const { width } = this.viewport;

    const wind = this.resolveWind(level, this.time);
    const windMagnitude = Math.hypot(wind.x, wind.z);

    ctx.fillStyle = "rgba(8, 16, 22, 0.58)";
    ctx.fillRect(16, 14, 242, 66);

    ctx.fillStyle = "rgba(229, 245, 255, 0.95)";
    ctx.font = "12px 'Segoe UI', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${this.ui.labels.wind}: ${wind.x >= 0 ? "+" : ""}${wind.x.toFixed(2)}m/s`, 24, 34);
    ctx.fillText(`${this.ui.labels.gravity}: ${level.gravity.toFixed(2)}m/s2`, 24, 52);
    ctx.fillText(`${this.ui.labels.drag}: ${level.drag.toFixed(4)}`, 24, 70);

    const meterX = width - 178;
    const meterY = 20;
    const meterWidth = 146;
    const meterHeight = 10;
    ctx.fillStyle = "rgba(11, 21, 31, 0.65)";
    ctx.fillRect(meterX, meterY, meterWidth, meterHeight);
    const normalized = clamp(windMagnitude / 2.5, 0, 1);
    const gradient = ctx.createLinearGradient(meterX, meterY, meterX + meterWidth, meterY);
    gradient.addColorStop(0, "#66d2ff");
    gradient.addColorStop(1, "#ff9660");
    ctx.fillStyle = gradient;
    ctx.fillRect(meterX, meterY, meterWidth * normalized, meterHeight);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.strokeRect(meterX, meterY, meterWidth, meterHeight);
    ctx.fillStyle = "rgba(240, 249, 255, 0.92)";
    ctx.font = "11px 'Segoe UI', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${this.ui.labels.wind} ${windMagnitude.toFixed(2)}m/s`, meterX + meterWidth, meterY - 4);
  }

  render() {
    const level = this.currentLevel;
    if (!level) {
      return;
    }

    this.drawBackground(level);
    this.drawGroundGrid(level);
    this.drawUpdrafts(level);
    this.drawWalls(level);
    this.drawTarget(level);
    if (!(this.screen === "play" && this.shotState === "aiming")) {
      this.drawArcher();
    }
    this.drawPreview(level);
    this.drawAimReticle(level);
    this.drawPovBowOverlay();
    this.drawArrow();
    this.drawHud(level);
  }
}

function ArcheryHorizonGame() {
  const locale = useMemo(() => (resolveBrowserLanguage() === "es" ? "es" : "en"), []);
  const ui = useMemo(() => UI_COPY[locale], [locale]);

  const canvasRef = useRef(null);
  const shellRef = useRef(null);
  const runtimeRef = useRef(null);

  const [deviceProfile, setDeviceProfile] = useState(resolveDeviceProfile);
  const [snapshot, setSnapshot] = useState({ ...DEFAULT_SNAPSHOT, locale });

  const requestFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      } else if (shell.requestFullscreen) {
        await shell.requestFullscreen();
      } else if (shell.webkitRequestFullscreen) {
        shell.webkitRequestFullscreen();
      }
    } catch {
      // Ignore fullscreen errors.
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const runtime = new ArcheryHorizonRuntime({
      canvas,
      locale,
      ui,
      deviceProfile,
      onSnapshot: setSnapshot,
      onFullscreenRequest: requestFullscreen,
    });
    runtimeRef.current = runtime;
    runtime.start();

    return () => {
      runtime.destroy();
      runtimeRef.current = null;
    };
  }, [deviceProfile, locale, requestFullscreen, ui]);

  useEffect(() => {
    const onFullscreen = () => {
      runtimeRef.current?.setFullscreenState(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("webkitfullscreenchange", onFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("webkitfullscreenchange", onFullscreen);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia?.("(pointer: coarse)");
    const updateProfile = () => setDeviceProfile(resolveDeviceProfile());
    updateProfile();
    window.addEventListener("resize", updateProfile);
    media?.addEventListener?.("change", updateProfile);
    return () => {
      window.removeEventListener("resize", updateProfile);
      media?.removeEventListener?.("change", updateProfile);
    };
  }, []);

  useEffect(() => {
    runtimeRef.current?.setDeviceProfile(deviceProfile);
  }, [deviceProfile]);

  const buildTextPayload = useCallback(
    (state) => ({
      mode: "arcade-archery-horizon",
      screen: state.screen,
      playState: state.playState,
      coordinates: state.coordinates,
      level: state.level,
      aim: state.aim,
      target: state.target,
      arrow: state.arrow,
      camera: state.camera,
      stats: state.stats,
      result: state.result,
      wind: {
        x: state.level.windX,
        z: state.level.windZ,
      },
      statusLabel: state.statusLabel,
      message: state.message,
      trajectoryPreview: state.trajectoryPreview,
      trajectoryDepth: state.trajectoryDepth,
      paused: state.paused,
      levelClear: state.levelClear,
      campaignClear: state.campaignClear,
    }),
    []
  );

  const advanceTime = useCallback((ms) => runtimeRef.current?.advanceTime(ms), []);
  useGameRuntimeBridge(snapshot, buildTextPayload, advanceTime);

  const showOverlayMenu = snapshot.screen === "menu";
  const showOverlayPause = snapshot.screen === "play" && snapshot.paused;
  const showOverlayRoundResult = snapshot.screen === "play"
    && snapshot.playState === "result"
    && !snapshot.paused
    && !snapshot.levelClear
    && !snapshot.campaignClear;
  const showOverlayLevelClear = snapshot.screen === "play" && snapshot.levelClear && !snapshot.campaignClear;
  const showOverlayCampaign = snapshot.campaignClear;
  const roundPoints = Math.max(0, Number(snapshot.result?.score) || 0);
  const roundZonePoints = Math.max(0, Number(snapshot.result?.zonePoints) || 0);
  const roundDistanceBonus = Math.max(0, Number(snapshot.result?.distanceBonus) || 0);

  return (
    <div className={`mini-game archery-horizon-game ${deviceProfile === "touch" ? "archery-horizon-touch" : "archery-horizon-desktop"}`}>
      <div className="mini-head archery-horizon-head">
        <div>
          <p className="archery-horizon-tag">{snapshot.statusLabel}</p>
          <h4>{ui.title}</h4>
          <p>{ui.subtitle}</p>
        </div>
        <div className="archery-horizon-actions">
          <button type="button" onClick={() => runtimeRef.current?.startTour()}>
            {ui.buttons.start}
          </button>
          <button
            type="button"
            onClick={() => runtimeRef.current?.launchArrow()}
            disabled={snapshot.screen !== "play" || snapshot.playState !== "aiming" || snapshot.paused}
          >
            {ui.buttons.launch}
          </button>
          <button type="button" onClick={() => runtimeRef.current?.restartLevel()}>
            {ui.buttons.restart}
          </button>
          <button type="button" onClick={() => runtimeRef.current?.togglePause()}>
            {snapshot.paused ? ui.buttons.resume : ui.buttons.pause}
          </button>
          <button type="button" onClick={requestFullscreen}>
            {ui.buttons.fullscreen}
          </button>
        </div>
      </div>

      <div className="archery-horizon-shell">
        <aside className="archery-horizon-panel">
          <section>
            <h5>{ui.labels.objective}</h5>
            <p>{ui.labels.objectiveBody}</p>
          </section>

          <section>
            <h5>{ui.labels.controls}</h5>
            <p>{ui.labels.controlsBody}</p>
          </section>

          <section className="archery-horizon-stats-grid">
            <article>
              <span>{ui.labels.level}</span>
              <strong>{snapshot.level.index}/{snapshot.level.total}</strong>
            </article>
            <article>
              <span>{ui.labels.unlocked}</span>
              <strong>{snapshot.level.unlocked}/{snapshot.level.total}</strong>
            </article>
            <article>
              <span>{ui.labels.distance}</span>
              <strong>{snapshot.level.distance.toFixed(1)} m</strong>
            </article>
            <article>
              <span>{ui.labels.difficulty}</span>
              <strong>{snapshot.level.difficulty}</strong>
            </article>
            <article>
              <span>{ui.labels.environment}</span>
              <strong>{snapshot.level.environment}</strong>
            </article>
            <article>
              <span>{ui.labels.wind}</span>
              <strong>{snapshot.level.windX >= 0 ? "+" : ""}{snapshot.level.windX.toFixed(2)} m/s</strong>
            </article>
          </section>

          <section className="archery-horizon-slider-card">
            <h5>{ui.labels.trajectory}</h5>
            <label>
              <span>{ui.labels.yaw}: {snapshot.aim.yawDeg.toFixed(1)} deg</span>
              <input
                type="range"
                min={MIN_YAW}
                max={MAX_YAW}
                step="0.1"
                value={snapshot.aim.yawDeg}
                disabled={snapshot.screen !== "play" || snapshot.playState !== "aiming" || snapshot.paused}
                onChange={(event) => runtimeRef.current?.setAimYaw(Number(event.target.value))}
              />
            </label>
            <label>
              <span>{ui.labels.trajectory}: {snapshot.aim.elevationDeg.toFixed(1)} deg</span>
              <input
                type="range"
                min={MIN_ELEVATION}
                max={MAX_ELEVATION}
                step="0.1"
                value={snapshot.aim.elevationDeg}
                disabled={snapshot.screen !== "play" || snapshot.playState !== "aiming" || snapshot.paused}
                onChange={(event) => runtimeRef.current?.setAimElevation(Number(event.target.value))}
              />
            </label>
            <label>
              <span>{ui.labels.intensity}: {Math.round(snapshot.aim.intensity * 100)}%</span>
              <input
                type="range"
                min={MIN_INTENSITY}
                max={MAX_INTENSITY}
                step="0.001"
                value={snapshot.aim.intensity}
                disabled={snapshot.screen !== "play" || snapshot.playState !== "aiming" || snapshot.paused}
                onChange={(event) => runtimeRef.current?.setAimIntensity(Number(event.target.value))}
              />
            </label>
          </section>

          <section>
            <h5>{ui.labels.levelSelector}</h5>
            <input
              type="range"
              min="1"
              max={snapshot.level.unlocked}
              step="1"
              value={snapshot.level.index}
              onChange={(event) => runtimeRef.current?.selectLevel(Number(event.target.value))}
            />
            <p>{snapshot.level.index}/{snapshot.level.unlocked}</p>
          </section>

          <section className="archery-horizon-stats-grid">
            <article>
              <span>{ui.labels.attempts}</span>
              <strong>{snapshot.stats.attempts}</strong>
            </article>
            <article>
              <span>{ui.labels.hits}</span>
              <strong>{snapshot.stats.hits}</strong>
            </article>
            <article>
              <span>{ui.labels.bullseyes}</span>
              <strong>{snapshot.stats.bullseyes}</strong>
            </article>
            <article>
              <span>{ui.labels.score}</span>
              <strong>{snapshot.stats.score}</strong>
            </article>
            <article>
              <span>{ui.labels.streak}</span>
              <strong>{snapshot.stats.streak}</strong>
            </article>
            <article>
              <span>{ui.labels.bestStreak}</span>
              <strong>{snapshot.stats.bestStreak}</strong>
            </article>
          </section>
        </aside>

        <section className="archery-horizon-stage-wrap">
          <div className="archery-horizon-stage-head">
            <div>
              <strong>
                {ui.labels.level} {snapshot.level.index} / {snapshot.level.total}
              </strong>
              <p>{snapshot.level.environment} - {snapshot.level.difficulty}</p>
            </div>
            <div className="archery-horizon-head-chips">
              <span>{ui.labels.distance}: {snapshot.level.distance.toFixed(1)}m</span>
              <span>{ui.labels.trajectoryDepth}: {snapshot.trajectoryDepth.toFixed(1)}m</span>
              <span>
                {ui.labels.camera}: {
                  snapshot.camera.mode === "follow"
                    ? ui.labels.cameraFollow
                    : snapshot.camera.mode === "impact"
                      ? ui.labels.cameraImpact
                      : ui.labels.cameraAim
                }
              </span>
            </div>
          </div>

          <div className="archery-horizon-canvas-shell" ref={shellRef}>
            <canvas
              ref={canvasRef}
              className="archery-horizon-canvas"
              width={WIDTH}
              height={HEIGHT}
              aria-label={ui.title}
            />

            {showOverlayMenu ? (
              <div className="archery-horizon-overlay">
                <div className="archery-horizon-overlay-card">
                  <h5>{ui.overlays.menuTitle}</h5>
                  <p>{ui.overlays.menuBody}</p>
                  <div className="archery-horizon-overlay-actions">
                    <button type="button" onClick={() => runtimeRef.current?.startTour()}>{ui.buttons.start}</button>
                  </div>
                </div>
              </div>
            ) : null}

            {showOverlayPause ? (
              <div className="archery-horizon-overlay">
                <div className="archery-horizon-overlay-card compact">
                  <h5>{ui.overlays.pausedTitle}</h5>
                  <p>{ui.overlays.pausedBody}</p>
                  <div className="archery-horizon-overlay-actions">
                    <button type="button" onClick={() => runtimeRef.current?.togglePause()}>{ui.buttons.resume}</button>
                  </div>
                </div>
              </div>
            ) : null}

            {showOverlayRoundResult ? (
              <div className="archery-horizon-overlay">
                <div className="archery-horizon-overlay-card compact">
                  <h5>{ui.labels.roundSummary}</h5>
                  <p>{snapshot.message}</p>
                  <p className="archery-horizon-round-points">
                    <strong>{ui.labels.roundPoints}: +{roundPoints}</strong>
                  </p>
                </div>
              </div>
            ) : null}

            {showOverlayLevelClear ? (
              <div className="archery-horizon-overlay">
                <div className="archery-horizon-overlay-card compact">
                  <h5>{ui.overlays.clearTitle}</h5>
                  <p>{ui.overlays.clearBody}</p>
                  <p className="archery-horizon-round-points">
                    <strong>{ui.labels.roundPoints}: +{roundPoints}</strong>
                    {snapshot.result.ring ? ` | ${snapshot.result.ring}` : ""}
                  </p>
                  <p className="archery-horizon-round-breakdown">
                    {ui.labels.zonePoints}: +{roundZonePoints} | {ui.labels.distanceBonus}: +{roundDistanceBonus}
                  </p>
                  <div className="archery-horizon-overlay-actions">
                    <button type="button" onClick={() => runtimeRef.current?.nextLevel()}>{ui.buttons.next}</button>
                    <button type="button" onClick={() => runtimeRef.current?.restartLevel()}>{ui.buttons.retry}</button>
                  </div>
                </div>
              </div>
            ) : null}

            {showOverlayCampaign ? (
              <div className="archery-horizon-overlay">
                <div className="archery-horizon-overlay-card">
                  <h5>{ui.overlays.campaignTitle}</h5>
                  <p>{ui.overlays.campaignBody}</p>
                  <p className="archery-horizon-round-points">
                    <strong>{ui.labels.roundPoints}: +{roundPoints}</strong>
                    {snapshot.result.ring ? ` | ${snapshot.result.ring}` : ""}
                  </p>
                  <div className="archery-horizon-overlay-actions">
                    <button type="button" onClick={() => runtimeRef.current?.openMenu()}>{ui.buttons.backToMenu}</button>
                    <button type="button" onClick={() => runtimeRef.current?.restartLevel()}>{ui.buttons.retry}</button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="archery-horizon-stage-foot">
            <p>
              {ui.labels.status}: <strong>{snapshot.message}</strong>
              {snapshot.playState === "result" ? ` | ${ui.labels.roundPoints}: +${roundPoints}` : ""}
              {snapshot.result.distanceToCenter !== null ? ` | d=${snapshot.result.distanceToCenter.toFixed(2)}m` : ""}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ArcheryHorizonGame;
