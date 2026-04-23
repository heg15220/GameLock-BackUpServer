import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";

const loadArcheryHorizonAdvancedPanel = () => import("./ArcheryHorizonAdvancedPanel");
const ArcheryHorizonAdvancedPanel = lazy(loadArcheryHorizonAdvancedPanel);

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

    this.cloudDrift = 0;
    this.horizonFrac = 0.34;

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

  usesCompactPortraitHud() {
    if (this.deviceProfile !== "touch" || typeof window === "undefined") {
      return false;
    }
    return window.innerHeight > window.innerWidth;
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

    const cameraLift = clamp((this.camera.y - 1.75) / 7.5, 0, 1);
    const level = this.currentLevel;
    const camZProgress = level ? clamp(this.camera.z / Math.max(1, level.target.z * 0.9), 0, 1) : 0;
    this.horizonFrac = 0.34 - cameraLift * 0.1 - camZProgress * 0.025;

    if (level && !this.paused) {
      const wind = this.resolveWind(level, this.time);
      this.cloudDrift = ((this.cloudDrift + wind.x * dt * 1.4) % (this.viewport.width * 2) + this.viewport.width * 2) % (this.viewport.width * 2);
    }

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
    const horizonY = this.horizonFrac * height;

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

  _drawPuffCloud(ctx, cx, cy, rx, ry, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx - rx * 0.42, cy + ry * 0.28, rx * 0.62, ry * 0.68, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + rx * 0.44, cy + ry * 0.3, rx * 0.58, ry * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + rx * 0.1, cy - ry * 0.2, rx * 0.7, ry * 0.76, 0, 0, Math.PI * 2); ctx.fill();
  }

  _drawScreenPineTree(ctx, bx, by, h, dark, light, lean = 0) {
    const lx = lean;
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.moveTo(bx + lx, by - h); ctx.lineTo(bx - h * 0.38, by - h * 0.56); ctx.lineTo(bx + h * 0.38, by - h * 0.56); ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.moveTo(bx + lx * 0.65, by - h * 0.62); ctx.lineTo(bx - h * 0.46, by - h * 0.22); ctx.lineTo(bx + h * 0.46, by - h * 0.22); ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.moveTo(bx + lx * 0.3, by - h * 0.28); ctx.lineTo(bx - h * 0.52, by); ctx.lineTo(bx + h * 0.52, by); ctx.fill();
    ctx.fillStyle = "#3a2012"; ctx.fillRect(bx - h * 0.045, by - h * 0.06, h * 0.09, h * 0.06);
  }

  _drawScreenPalmTree(ctx, bx, by, h, lean = 0) {
    const leanCp = lean * 0.7;
    ctx.strokeStyle = "#6b4a1e"; ctx.lineWidth = Math.max(2, h * 0.07); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.bezierCurveTo(bx + h * 0.06 + leanCp, by - h * 0.4, bx + h * 0.14 + lean, by - h * 0.7, bx + h * 0.1 + lean, by - h); ctx.stroke();
    const tx = bx + h * 0.1 + lean, ty = by - h;
    const fronds = [
      [-h * 0.58, -h * 0.22, "#1a4820"], [-h * 0.44, -h * 0.46, "#1e5224"],
      [+h * 0.06, -h * 0.56, "#1a4820"], [+h * 0.54, -h * 0.32, "#1e5224"],
      [+h * 0.48, +h * 0.08, "#1a4820"], [-h * 0.34, +h * 0.1, "#1e5224"],
    ];
    for (const [dx, dy, col] of fronds) {
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, h * 0.032); ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + dx * 0.55, ty + dy * 0.55 + h * 0.05, tx + dx, ty + dy); ctx.stroke();
    }
  }

  _drawScreenCactus(ctx, bx, by, h) {
    const w = Math.max(2, h * 0.13);
    ctx.fillStyle = "#3d6b28";
    ctx.beginPath(); ctx.rect(bx - w, by - h, w * 2, h); ctx.fill();
    ctx.beginPath(); ctx.rect(bx - w * 5.2, by - h * 0.58, w * 4.2, w * 1.7); ctx.fill();
    ctx.beginPath(); ctx.rect(bx - w * 5.2, by - h * 0.58 - h * 0.28, w * 1.8, h * 0.3); ctx.fill();
    ctx.beginPath(); ctx.rect(bx + w, by - h * 0.44, w * 3.8, w * 1.7); ctx.fill();
    ctx.beginPath(); ctx.rect(bx + w * 3.2, by - h * 0.44 - h * 0.22, w * 1.8, h * 0.24); ctx.fill();
    ctx.fillStyle = "#4a8030";
    ctx.fillRect(bx - w + 1, by - h, 3, h); ctx.fillRect(bx + w - 4, by - h, 3, h);
  }

  _drawPineHorizonBand(ctx, baseY, width, colorA, colorB, xOff = 0) {
    const spacing = 22;
    const extra = spacing * 3;
    for (let xi = -1; xi * spacing < width + extra; xi++) {
      const bx = xi * spacing + ((xi * 7) % 11) - 5 + ((xOff % spacing) + spacing) % spacing - spacing;
      const h = 42 + ((xi * 17 + 3) % 24);
      ctx.fillStyle = xi % 2 === 0 ? colorA : colorB;
      ctx.beginPath(); ctx.moveTo(bx, baseY); ctx.lineTo(bx - h * 0.38, baseY - h * 0.55); ctx.lineTo(bx + h * 0.38, baseY - h * 0.55); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx, baseY - h * 0.5); ctx.lineTo(bx - h * 0.46, baseY - h * 0.12); ctx.lineTo(bx + h * 0.46, baseY - h * 0.12); ctx.fill();
    }
  }

  _drawJungleHorizonBand(ctx, baseY, width, colorA, colorB, xOff = 0) {
    const spacing = 16;
    const extra = spacing * 3;
    for (let xi = -1; xi * spacing < width + extra; xi++) {
      const bx = xi * spacing + ((xi * 11) % 14) - 6 + ((xOff % spacing) + spacing) % spacing - spacing;
      const h = 40 + ((xi * 13 + 5) % 30);
      ctx.fillStyle = xi % 2 === 0 ? colorA : colorB;
      ctx.beginPath(); ctx.arc(bx, baseY - h * 0.5, h * 0.52, Math.PI, 0); ctx.lineTo(bx + h * 0.52, baseY); ctx.lineTo(bx - h * 0.52, baseY); ctx.fill();
      ctx.fillStyle = colorB;
      ctx.beginPath(); ctx.arc(bx - h * 0.3, baseY - h * 0.32, h * 0.28, Math.PI, 0); ctx.lineTo(bx + h * 0.01, baseY); ctx.lineTo(bx - h * 0.6, baseY); ctx.fill();
    }
  }

  _drawMesaRange(ctx, baseY, width, colorA, colorB, xOff = 0) {
    const segments = [
      [0, 0.14, 0.55], [0.1, 0.24, 0.42], [0.22, 0.38, 0.52],
      [0.36, 0.48, 0.45], [0.46, 0.62, 0.58], [0.6, 0.74, 0.44],
      [0.7, 0.88, 0.5], [0.84, 1.02, 0.46],
    ];
    for (const [x1f, x2f, yf] of segments) {
      const x1 = x1f * width + xOff, x2 = x2f * width + xOff, topY = baseY - yf * 82;
      ctx.fillStyle = colorA;
      ctx.beginPath();
      ctx.moveTo(x1 - 10, baseY); ctx.lineTo(x1 + 8, topY + 14); ctx.lineTo(x1 + 22, topY);
      ctx.lineTo(x2 - 22, topY); ctx.lineTo(x2 - 8, topY + 14); ctx.lineTo(x2 + 10, baseY);
      ctx.fill();
      ctx.fillStyle = colorB; ctx.fillRect(x1 + 22, topY, x2 - x1 - 44, 5);
    }
  }

  _drawJaggedPeaksRange(ctx, baseY, peakDrop, width, bodyColor, snowColor, xOff = 0) {
    const peaks = [
      [0.04, 0.72], [0.12, 0.9], [0.21, 0.97], [0.3, 0.78], [0.4, 1.0],
      [0.52, 0.84], [0.6, 0.94], [0.7, 0.76], [0.8, 0.99], [0.9, 0.86], [1.0, 0.7],
    ];
    const pts = peaks.map(([xf, h]) => ({ x: xf * width + xOff, y: baseY - h * peakDrop }));
    ctx.fillStyle = bodyColor;
    ctx.beginPath(); ctx.moveTo(xOff - width, baseY);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.lineTo(width * 2 + xOff, baseY); ctx.fill();
    ctx.fillStyle = snowColor;
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i], pL = pts[i - 1], pR = pts[i + 1];
      if (p.y < baseY - peakDrop * 0.5) {
        const snowBottom = p.y + (baseY - p.y) * 0.28;
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
        ctx.lineTo((p.x + pL.x) * 0.5, snowBottom); ctx.lineTo((p.x + pR.x) * 0.5, snowBottom);
        ctx.fill();
      }
    }
  }

  _drawVolcanoPeaks(ctx, horizon, width, bodyColor, t, xOff = 0) {
    const baseY = horizon + 30;
    const peakDrop = 175;
    const peaks = [
      { xf: 0.08, hf: 0.62 }, { xf: 0.22, hf: 0.78 }, { xf: 0.48, hf: 1.0 },
      { xf: 0.7, hf: 0.85 }, { xf: 0.88, hf: 0.7 },
    ];
    ctx.fillStyle = bodyColor;
    ctx.beginPath(); ctx.moveTo(-10 + xOff, baseY);
    for (const { xf, hf } of peaks) {
      const x = xf * width + xOff, y = baseY - hf * peakDrop;
      ctx.lineTo(x - peakDrop * 0.14, y + peakDrop * 0.22); ctx.lineTo(x, y); ctx.lineTo(x + peakDrop * 0.14, y + peakDrop * 0.22);
    }
    ctx.lineTo(width + 10 + xOff, baseY); ctx.fill();
    const vx = peaks[2].xf * width + xOff, vy = baseY - peaks[2].hf * peakDrop;
    const gA = 0.5 + Math.sin(t * 2.2) * 0.18;
    const glowR = ctx.createRadialGradient(vx, vy, 2, vx, vy, 60);
    glowR.addColorStop(0, `rgba(255,140,20,${gA})`); glowR.addColorStop(0.5, `rgba(200,50,0,${gA * 0.4})`); glowR.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glowR; ctx.fillRect(vx - 60, vy - 60, 120, 120);
    for (let s = 0; s < 4; s++) {
      const sOff = (t * 18 + s * 22) % 80;
      ctx.fillStyle = `rgba(70,52,44,${0.14 - s * 0.025})`;
      ctx.beginPath(); ctx.ellipse(vx + Math.sin(t + s) * 7, vy - sOff, 14 + s * 4, 10 + s * 3, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawBackground(level) {
    const ctx = this.ctx;
    const { width, height } = this.viewport;
    const env = level.environment;
    const id = env.id;
    const horizon = this.horizonFrac * height;
    const t = this.time;

    // Parallax offsets from camera
    const camX = this.camera.x;
    const pxCloud = -camX * 1.8 + this.cloudDrift * 0.8;
    const pxFar   = -camX * 4;
    const pxMid   = -camX * 8;
    const pxNear  = -camX * 16;
    // Depth phase shift makes mountains "slide" as camera advances
    const zPhase  = this.camera.z * 3;

    const sky = ctx.createLinearGradient(0, 0, 0, horizon * 1.15);
    sky.addColorStop(0, env.skyTop); sky.addColorStop(1, env.skyBottom);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);

    const drawRange = (baseY, ampA, ampB, freqA, freqB, color, phase, xOff = 0) => {
      ctx.beginPath(); ctx.moveTo(xOff - 60, height);
      for (let x = -60; x <= width + 60; x += 6) {
        ctx.lineTo(x + xOff, baseY + Math.sin((x + phase) * freqA) * ampA + Math.sin((x + phase * 0.65) * freqB) * ampB);
      }
      ctx.lineTo(width + xOff + 60, height); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    };

    if (id === "cedar-valley") {
      const sunX = width * 0.72 + pxCloud * 0.4;
      const sg = ctx.createRadialGradient(sunX, horizon * 0.36, 10, sunX, horizon * 0.36, 78);
      sg.addColorStop(0, "rgba(255,252,200,0.95)"); sg.addColorStop(0.35, "rgba(255,240,160,0.45)"); sg.addColorStop(1, "rgba(255,240,160,0)");
      ctx.fillStyle = sg; ctx.fillRect(0, 0, width, horizon);
      ctx.fillStyle = "rgba(255,250,190,0.92)"; ctx.beginPath(); ctx.arc(sunX, horizon * 0.36, 22, 0, Math.PI * 2); ctx.fill();
      this._drawPuffCloud(ctx, width * 0.14 + pxCloud,       horizon * 0.28, 65, 28, "rgba(255,255,255,0.87)");
      this._drawPuffCloud(ctx, width * 0.44 + pxCloud * 0.9, horizon * 0.16, 82, 34, "rgba(255,255,255,0.82)");
      this._drawPuffCloud(ctx, width * 0.82 + pxCloud * 1.1, horizon * 0.34, 50, 22, "rgba(255,255,255,0.78)");
      drawRange(horizon - 18, 30, 15, 0.0045, 0.01, "#7da3c2", 80 + zPhase * 0.4, pxFar);
      drawRange(horizon + 2,  22, 11, 0.007,  0.016, "#587aa2", 130 + zPhase * 0.7, pxMid);
      this._drawPineHorizonBand(ctx, horizon + 24, width, "#2a4a20", "#1e3518", pxNear);
      drawRange(horizon + 44, 10, 4, 0.014, 0.03, "#2d5228", 210, pxNear * 1.2);

    } else if (id === "dune-canyon") {
      const sunX = width * 0.62 + pxCloud * 0.5;
      const sg = ctx.createRadialGradient(sunX, horizon * 0.78, 8, sunX, horizon * 0.78, 120);
      sg.addColorStop(0, "rgba(255,220,80,0.88)"); sg.addColorStop(0.4, "rgba(255,150,40,0.45)"); sg.addColorStop(1, "rgba(255,80,0,0)");
      ctx.fillStyle = sg; ctx.fillRect(0, 0, width, horizon);
      ctx.fillStyle = "rgba(255,230,120,0.95)"; ctx.beginPath(); ctx.arc(sunX, horizon * 0.78, 18, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 4; i++) { ctx.fillStyle = `rgba(220,160,80,${0.06 - i * 0.01})`; ctx.fillRect(0, horizon * (0.4 + i * 0.14) - 8, width, 18); }
      this._drawMesaRange(ctx, horizon + 10, width, env.mountainA, env.mountainB, pxFar);
      drawRange(horizon + 30, 14, 6, 0.009, 0.02, env.mountainA, 50 + zPhase, pxMid);
      drawRange(horizon + 52, 9,  4, 0.015, 0.032, "#8a5318", 160, pxNear);

    } else if (id === "frost-ridge") {
      for (let i = 0; i < 4; i++) {
        const aA = 0.06 + Math.sin(t * 0.7 + i * 1.4) * 0.035;
        ctx.fillStyle = `rgba(80,240,180,${aA})`; ctx.fillRect(0, horizon * (0.05 + i * 0.18), width, 20);
      }
      const sunX = width * 0.28 + pxCloud * 0.3;
      const sg = ctx.createRadialGradient(sunX, horizon * 0.42, 6, sunX, horizon * 0.42, 60);
      sg.addColorStop(0, "rgba(210,235,255,0.9)"); sg.addColorStop(0.5, "rgba(180,210,255,0.35)"); sg.addColorStop(1, "rgba(180,210,255,0)");
      ctx.fillStyle = sg; ctx.fillRect(0, 0, width, horizon);
      ctx.fillStyle = "rgba(225,240,255,0.88)"; ctx.beginPath(); ctx.arc(sunX, horizon * 0.42, 18, 0, Math.PI * 2); ctx.fill();
      this._drawPuffCloud(ctx, width * 0.12 + pxCloud,       horizon * 0.22, 85, 18, "rgba(210,230,255,0.5)");
      this._drawPuffCloud(ctx, width * 0.66 + pxCloud * 0.8, horizon * 0.1,  70, 14, "rgba(210,230,255,0.44)");
      this._drawJaggedPeaksRange(ctx, horizon - 30, 110, width, env.mountainB, "#e8f2fa", pxFar);
      this._drawJaggedPeaksRange(ctx, horizon - 4,  80,  width, env.mountainA, "#d0e4f0", pxMid);
      this._drawPineHorizonBand(ctx, horizon + 22, width, "#3a4a52", "#2c3a42", pxNear);
      drawRange(horizon + 38, 7, 3, 0.014, 0.028, "#c8dce6", 60, pxNear * 1.1);

    } else if (id === "storm-harbor") {
      for (let layer = 0; layer < 4; layer++) {
        ctx.fillStyle = `rgba(30,38,58,${0.55 - layer * 0.1})`;
        for (let ci = 0; ci < 5 + layer; ci++) {
          const cx2 = ((ci * 211 + layer * 83) % (width + 160)) - 80 + pxCloud * (0.5 + layer * 0.3);
          const cy2 = horizon * (0.08 + layer * 0.2) + (ci * 37 % 40) - 20;
          const cr = 60 + (ci * 43 % 80);
          ctx.beginPath(); ctx.ellipse(cx2, cy2, cr, cr * 0.55, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (Math.sin(t * 3.1) > 0.92) {
        ctx.strokeStyle = "rgba(200,220,255,0.7)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(width * 0.35, 10); ctx.lineTo(width * 0.33, 50); ctx.lineTo(width * 0.37, 80); ctx.lineTo(width * 0.35, 120); ctx.stroke();
      }
      drawRange(horizon - 20, 35, 18, 0.006, 0.013, env.mountainB, 70 + zPhase * 0.5, pxFar);
      drawRange(horizon + 6,  26, 13, 0.009, 0.018, env.mountainA, 130 + zPhase * 0.8, pxMid);
      drawRange(horizon + 30, 5, 2, 0.012, 0.028, "#1a2a3a", 40,  pxMid);
      drawRange(horizon + 46, 4, 2, 0.018, 0.038, "#172436", 190, pxNear);

    } else if (id === "volcanic-dusk") {
      for (let i = 0; i < 5; i++) {
        const bA = 0.06 + Math.sin(t * 0.6 + i * 0.9) * 0.03;
        ctx.fillStyle = `rgba(180,60,10,${bA})`; ctx.fillRect(0, horizon * (0.1 + i * 0.15), width, 16);
      }
      for (let layer = 0; layer < 3; layer++) {
        ctx.fillStyle = `rgba(45,32,28,${0.5 - layer * 0.12})`;
        for (let ci = 0; ci < 6; ci++) {
          const cx2 = ((ci * 167 + layer * 113) % (width + 200)) - 100 + pxCloud * (0.4 + layer * 0.3);
          const cy2 = horizon * (0.12 + layer * 0.22) + (ci * 29 % 30);
          const crx = 70 + (ci * 53 % 60);
          ctx.beginPath(); ctx.ellipse(cx2, cy2, crx, crx * 0.48, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
      this._drawVolcanoPeaks(ctx, horizon, width, env.mountainA, t, pxFar);
      drawRange(horizon + 30, 10, 4, 0.01, 0.022, "#2a100a", 90 + zPhase, pxMid);

    } else if (id === "emerald-plateau") {
      const sunX = width * 0.8 + pxCloud * 0.4;
      const sg = ctx.createRadialGradient(sunX, horizon * 0.24, 12, sunX, horizon * 0.24, 100);
      sg.addColorStop(0, "rgba(255,255,220,0.95)"); sg.addColorStop(0.4, "rgba(255,245,170,0.5)"); sg.addColorStop(1, "rgba(255,240,170,0)");
      ctx.fillStyle = sg; ctx.fillRect(0, 0, width, horizon);
      ctx.fillStyle = "rgba(255,255,210,0.95)"; ctx.beginPath(); ctx.arc(sunX, horizon * 0.24, 26, 0, Math.PI * 2); ctx.fill();
      this._drawPuffCloud(ctx, width * 0.12 + pxCloud,       horizon * 0.26, 72, 38, "rgba(255,255,255,0.88)");
      this._drawPuffCloud(ctx, width * 0.55 + pxCloud * 0.9, horizon * 0.11, 88, 46, "rgba(255,255,255,0.84)");
      this._drawPuffCloud(ctx, width * 0.9  + pxCloud * 1.1, horizon * 0.3,  58, 30, "rgba(255,255,255,0.8)");
      ctx.fillStyle = "rgba(200,255,228,0.12)"; ctx.fillRect(0, horizon * 0.65, width, 22);
      ctx.fillStyle = "rgba(200,255,228,0.08)"; ctx.fillRect(0, horizon * 0.82, width, 18);
      drawRange(horizon - 38, 38, 20, 0.004, 0.009, "#3d6e5a", 60  + zPhase * 0.3, pxFar);
      drawRange(horizon - 18, 30, 14, 0.006, 0.013, "#326048", 120 + zPhase * 0.6, pxMid);
      this._drawJungleHorizonBand(ctx, horizon + 8, width, "#1e4d30", "#163d24", pxNear);
      drawRange(horizon + 44, 7, 3, 0.014, 0.03, "#244e35", 200, pxNear * 1.2);
    }

    // Depth-based atmospheric haze — thickens as camera advances
    const hazeAlphaBoost = clamp(this.camera.z / Math.max(1, level.target.z) * 0.35, 0, 0.35);
    ctx.fillStyle = env.haze;
    ctx.fillRect(0, horizon - 20, width, 72);
    if (hazeAlphaBoost > 0.02) {
      ctx.fillStyle = `rgba(255,255,255,${hazeAlphaBoost})`;
      ctx.fillRect(0, horizon - 30, width, 90);
    }
  }

  drawGroundGrid(level) {
    const ctx = this.ctx;
    const { width, height } = this.viewport;
    const env = level.environment;
    const id = env.id;
    const horizon = height * 0.34;
    const t = this.time;

    const groundGradient = ctx.createLinearGradient(0, horizon, 0, height);
    groundGradient.addColorStop(0, env.groundFar);
    groundGradient.addColorStop(1, env.groundNear);
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, horizon, width, height - horizon);

    if (id === "cedar-valley") {
      for (let i = 0; i < 55; i++) {
        const gx = (i * 241 + 7) % width;
        const gy = horizon + (i * 97 + 13) % (height - horizon);
        ctx.strokeStyle = "rgba(60,140,40,0.28)"; ctx.lineWidth = 1.5;
        for (let b = 0; b < 3; b++) {
          ctx.beginPath(); ctx.moveTo(gx + b * 4, gy); ctx.lineTo(gx + b * 4 - 2, gy - 9); ctx.stroke();
        }
      }
    } else if (id === "frost-ridge") {
      for (let i = 0; i < 90; i++) {
        const sx = (i * 173 + 11) % width;
        const sy = horizon + (i * 87 + 7) % (height - horizon);
        const sa = 0.35 + Math.sin(t * 3.2 + i * 0.7) * 0.3;
        ctx.fillStyle = `rgba(255,255,255,${sa})`; ctx.fillRect(sx, sy, 2, 2);
      }
    } else if (id === "volcanic-dusk") {
      const crAlpha = 0.22 + Math.sin(t * 1.8) * 0.08;
      const cracks = [
        [0.35, 0.15, 0.42, 0.6], [0.55, 0.3, 0.62, 0.8],
        [0.2, 0.5, 0.28, 0.9], [0.7, 0.2, 0.76, 0.65], [0.48, 0.55, 0.5, 0.95],
      ];
      for (const [x1f, y1f, x2f, y2f] of cracks) {
        const gy1 = horizon + y1f * (height - horizon), gy2 = horizon + y2f * (height - horizon);
        ctx.strokeStyle = `rgba(255,80,0,${crAlpha * 0.38})`; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(x1f * width, gy1); ctx.lineTo(x2f * width, gy2); ctx.stroke();
        ctx.strokeStyle = `rgba(255,140,20,${crAlpha})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x1f * width, gy1); ctx.lineTo(x2f * width, gy2); ctx.stroke();
      }
    } else if (id === "storm-harbor") {
      ctx.strokeStyle = "rgba(160,195,235,0.14)"; ctx.lineWidth = 0.8;
      for (let i = 0; i < 45; i++) {
        const rx = ((i * 173 + Math.floor(t * 3) * 97) % width + width) % width;
        const ry = horizon + ((i * 61 + Math.floor(t * 6) * 43) % (height - horizon));
        ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + 3, ry + 14); ctx.stroke();
      }
    } else if (id === "dune-canyon") {
      ctx.lineWidth = 0.6;
      for (let i = 0; i < 12; i++) {
        const ry = horizon + (i + 1) * ((height - horizon) / 13);
        ctx.strokeStyle = `rgba(200,150,80,${0.06 + (i / 12) * 0.08})`;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 30) {
          const yOff = Math.sin((x + i * 37) * 0.022) * 3;
          x === 0 ? ctx.moveTo(x, ry + yOff) : ctx.lineTo(x, ry + yOff);
        }
        ctx.stroke();
      }
    } else if (id === "emerald-plateau") {
      for (let i = 0; i < 45; i++) {
        const gx = (i * 241 + 7) % width;
        const gy = horizon + (i * 97 + 13) % (height - horizon);
        ctx.strokeStyle = "rgba(80,200,80,0.25)"; ctx.lineWidth = 1.5;
        for (let b = 0; b < 3; b++) {
          ctx.beginPath(); ctx.moveTo(gx + b * 4, gy); ctx.lineTo(gx + b * 4 - 2, gy - 9); ctx.stroke();
        }
      }
    }

    const gridColor = id === "frost-ridge" ? "240,248,255" : id === "volcanic-dusk" ? "255,120,60" : id === "dune-canyon" ? "220,180,120" : id === "emerald-plateau" ? "180,255,190" : id === "storm-harbor" ? "180,200,230" : "230,250,255";
    const gridMax = id === "frost-ridge" ? 0.18 : id === "volcanic-dusk" ? 0.1 : id === "storm-harbor" ? 0.12 : 0.22;

    ctx.lineWidth = 1;
    for (let z = 12; z < level.target.z + 120; z += 14) {
      const left = this.project({ x: -28, y: 0, z });
      const right = this.project({ x: 28, y: 0, z });
      if (!left || !right) continue;
      const alpha = clamp(1 - z / (level.target.z + 120), 0.06, gridMax);
      ctx.strokeStyle = `rgba(${gridColor},${alpha})`;
      ctx.beginPath(); ctx.moveTo(left.x, left.y); ctx.lineTo(right.x, right.y); ctx.stroke();
    }
    for (let x = -28; x <= 28; x += 4) {
      const near = this.project({ x, y: 0, z: 6 });
      const far = this.project({ x, y: 0, z: level.target.z + 100 });
      if (!near || !far) continue;
      const alpha = x % 8 === 0 ? gridMax : gridMax * 0.45;
      ctx.strokeStyle = `rgba(${gridColor},${alpha})`;
      ctx.beginPath(); ctx.moveTo(near.x, near.y); ctx.lineTo(far.x, far.y); ctx.stroke();
    }
  }

  drawEnvironmentProps(level) {
    const ctx = this.ctx;
    const id = level.environment.id;
    const t = this.time;
    const wind = this.resolveWind(level, t);
    const windLean = wind.x * 1.4; // sway amplitude in screen-units (scaled by tree height)

    if (id === "cedar-valley") {
      const trees = [
        { x: -18, z: 12 }, { x: -22, z: 22 }, { x: -16, z: 36 }, { x: -21, z: 56 },
        { x: 18, z: 10 }, { x: 22, z: 20 }, { x: 16, z: 33 }, { x: 21, z: 50 },
        { x: -28, z: 16 }, { x: 28, z: 19 }, { x: -26, z: 44 }, { x: 26, z: 62 },
      ];
      for (const { x, z } of trees) {
        const pt = this.project({ x, y: 0, z });
        if (!pt) continue;
        const h = Math.max(8, 82 * pt.scale);
        const sway = Math.sin(t * 1.2 + x * 0.7) * windLean * h * 0.04;
        this._drawScreenPineTree(ctx, pt.x, pt.y, h, "#1e3518", "#2a4a20", sway);
      }

    } else if (id === "dune-canyon") {
      const cacti = [
        { x: -16, z: 14 }, { x: 18, z: 18 }, { x: -22, z: 32 },
        { x: 20, z: 28 }, { x: -14, z: 52 }, { x: 23, z: 45 },
      ];
      for (const { x, z } of cacti) {
        const pt = this.project({ x, y: 0, z });
        if (!pt) continue;
        const h = Math.max(6, 78 * pt.scale);
        this._drawScreenCactus(ctx, pt.x, pt.y, h);
      }

    } else if (id === "frost-ridge") {
      const trees = [
        { x: -17, z: 14 }, { x: -24, z: 30 }, { x: 19, z: 12 }, { x: 25, z: 26 },
        { x: -21, z: 47 }, { x: 22, z: 42 },
      ];
      for (const { x, z } of trees) {
        const pt = this.project({ x, y: 0, z });
        if (!pt) continue;
        const h = Math.max(7, 72 * pt.scale);
        const sway = Math.sin(t * 0.9 + x * 0.5) * windLean * h * 0.025;
        this._drawScreenPineTree(ctx, pt.x, pt.y, h, "#2c3a42", "#4a5f6a", sway);
        ctx.fillStyle = "rgba(220,240,255,0.88)";
        ctx.beginPath(); ctx.ellipse(pt.x + sway * 0.5, pt.y - h * 0.96, h * 0.22, h * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      }
      const rocks = [{ x: -26, z: 20 }, { x: 27, z: 36 }, { x: -19, z: 62 }];
      for (const { x, z } of rocks) {
        const pt = this.project({ x, y: 0, z });
        if (!pt) continue;
        const s = Math.max(4, 42 * pt.scale);
        ctx.fillStyle = "rgba(180,210,235,0.82)";
        ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(pt.x - s * 0.7, pt.y - s * 0.9); ctx.lineTo(pt.x + s * 0.5, pt.y - s * 1.1); ctx.lineTo(pt.x + s * 0.9, pt.y); ctx.fill();
        ctx.strokeStyle = "rgba(220,240,255,0.5)"; ctx.lineWidth = 1; ctx.stroke();
      }

    } else if (id === "storm-harbor") {
      // Wind-driven 3D rain streaks
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 35; i++) {
        const rx = -24 + (i * 173 % 48);
        const rz = 5 + (i * 89 % 140);
        const dropT = (t * (6 + (i * 23 % 8)) + i * 0.6) % 5.5;
        const ry = 0.2 + dropT * 1.0;
        const pt = this.project({ x: rx, y: ry, z: rz });
        if (!pt) continue;
        const endPt = this.project({ x: rx + wind.x * 0.08, y: ry - 0.6, z: rz });
        if (!endPt) continue;
        const alpha = 0.18 + 0.12 * Math.sin(i * 1.3);
        ctx.strokeStyle = `rgba(170,205,242,${alpha})`;
        ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(endPt.x, endPt.y); ctx.stroke();
      }
      const rocks = [{ x: -24, z: 18 }, { x: 26, z: 22 }, { x: -20, z: 42 }, { x: 23, z: 52 }];
      for (const { x, z } of rocks) {
        const pt = this.project({ x, y: 0, z });
        if (!pt) continue;
        const s = Math.max(4, 40 * pt.scale);
        ctx.fillStyle = "#2a3545";
        ctx.beginPath(); ctx.ellipse(pt.x, pt.y - s * 0.35, s * 0.7, s * 0.42, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#3a4858";
        ctx.beginPath(); ctx.ellipse(pt.x - s * 0.15, pt.y - s * 0.55, s * 0.42, s * 0.28, 0, 0, Math.PI * 2); ctx.fill();
      }

    } else if (id === "volcanic-dusk") {
      // Embers rising from ground
      for (let i = 0; i < 28; i++) {
        const ex = -24 + (i * 137 % 48);
        const speed = 0.8 + (i * 37 % 30) * 0.06;
        const ePhase = (t * speed + i * 0.9) % 9;
        const ey = 0.05 + ePhase * 1.2;
        const driftX = Math.sin(t * 1.8 + i * 0.8) * 0.4 + wind.x * ePhase * 0.06;
        const ez = 3 + (i * 89 % 120);
        const pt = this.project({ x: ex + driftX, y: ey, z: ez });
        if (!pt) continue;
        const lifeAlpha = Math.max(0, 1 - ePhase / 9);
        const eA = (0.5 + Math.sin(t * 5 + i) * 0.4) * lifeAlpha;
        ctx.fillStyle = `rgba(255,${80 + (i * 37 % 100)},5,${Math.min(1, eA * pt.scale * 6)})`;
        const er = Math.max(0.6, 2.2 * pt.scale * lifeAlpha);
        ctx.beginPath(); ctx.arc(pt.x, pt.y, er, 0, Math.PI * 2); ctx.fill();
      }
      const rocks = [{ x: -22, z: 16 }, { x: 24, z: 20 }, { x: -18, z: 40 }, { x: 23, z: 46 }];
      for (const { x, z } of rocks) {
        const pt = this.project({ x, y: 0, z });
        if (!pt) continue;
        const s = Math.max(4, 44 * pt.scale);
        ctx.fillStyle = "#1c0a04";
        ctx.beginPath(); ctx.moveTo(pt.x - s * 0.6, pt.y); ctx.lineTo(pt.x - s * 0.1, pt.y - s * 0.9); ctx.lineTo(pt.x + s * 0.5, pt.y - s * 0.6); ctx.lineTo(pt.x + s * 0.7, pt.y); ctx.fill();
        const lg = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, s * 0.9);
        lg.addColorStop(0, `rgba(255,80,0,${0.18 + Math.sin(t * 2.2 + x) * 0.07})`); lg.addColorStop(1, "rgba(255,80,0,0)");
        ctx.fillStyle = lg; ctx.fillRect(pt.x - s, pt.y - s * 0.9, s * 2, s * 0.9);
      }

    } else if (id === "emerald-plateau") {
      const palms = [
        { x: -17, z: 13 }, { x: -24, z: 30 }, { x: 19, z: 11 }, { x: 26, z: 24 },
        { x: -21, z: 46 }, { x: 22, z: 40 }, { x: -15, z: 62 }, { x: 24, z: 57 },
      ];
      for (const { x, z } of palms) {
        const pt = this.project({ x, y: 0, z });
        if (!pt) continue;
        const h = Math.max(8, 88 * pt.scale);
        const sway = Math.sin(t * 1.0 + x * 0.6) * windLean * h * 0.06;
        this._drawScreenPalmTree(ctx, pt.x, pt.y, h, sway);
      }
    }
  }

  drawAtmosphericParticles(level) {
    const ctx = this.ctx;
    const { width, height } = this.viewport;
    const id = level.environment.id;
    const t = this.time;
    const wind = this.resolveWind(level, t);

    if (id === "frost-ridge") {
      // Falling snow — screen-space, wind-drifted
      for (let i = 0; i < 55; i++) {
        const seed = i * 137.508;
        const speed = 0.8 + (seed % 0.9);
        const sx = ((seed * 9.1 + t * (wind.x * 18 + 12) * 0.8 + i * 17.4) % (width + 60) + width + 60) % (width + 60) - 30;
        const sy = (t * speed * 55 + seed * 41.3) % height;
        const alpha = 0.45 + 0.4 * Math.sin(t * 2.8 + i * 0.9);
        const r = 1.2 + (seed % 2.2);
        ctx.fillStyle = `rgba(218,238,255,${alpha})`;
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
      }

    } else if (id === "storm-harbor") {
      // Screen-space rain streaks, angled by wind
      const angle = Math.atan2(wind.x * 0.5, 5);
      const dx = Math.sin(angle) * 22, dy = 22;
      ctx.strokeStyle = "rgba(165,200,238,0.28)"; ctx.lineWidth = 0.75;
      for (let i = 0; i < 90; i++) {
        const seed = i * 91.3;
        const rx = ((seed * 6.7 + t * 340 + wind.x * 22) % (width + 80) + width + 80) % (width + 80) - 40;
        const ry = (t * 340 + seed * 44) % height;
        ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + dx, ry + dy); ctx.stroke();
      }
      // Puddle ripples on ground (screen-space lower third)
      for (let i = 0; i < 8; i++) {
        const seed = i * 211.3;
        const px = (seed * 123.7) % width;
        const py = height * 0.72 + (seed * 77.1) % (height * 0.26);
        const rPhase = (t * 0.9 + i * 0.4) % 1.8;
        const rr = rPhase * 18;
        const alpha = Math.max(0, (0.18 - rPhase * 0.09));
        ctx.strokeStyle = `rgba(160,195,230,${alpha})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(px, py, rr, rr * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
      }

    } else if (id === "dune-canyon") {
      // Wind-blown sand particles in lower sky / upper ground area
      for (let i = 0; i < 35; i++) {
        const seed = i * 173.2;
        const px = ((seed * 8.3 + t * wind.x * 90 + seed) % (width + 100) + width + 100) % (width + 100) - 50;
        const py = height * 0.36 + (seed * 7.1) % (height * 0.55);
        const alpha = 0.04 + 0.06 * Math.sin(t * 1.1 + i * 0.8);
        const rx = 5 + (seed % 18), ry = rx * 0.28;
        ctx.fillStyle = `rgba(205,158,72,${alpha})`;
        ctx.beginPath(); ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      }

    } else if (id === "volcanic-dusk") {
      // Fine embers / ash — screen-space, rise then drift
      for (let i = 0; i < 28; i++) {
        const seed = i * 97.4;
        const px = (seed * 11.3 + wind.x * 8) % width;
        const py = height - ((t * (30 + seed % 25) + seed * 37) % (height * 0.85));
        const alpha = Math.max(0, 0.55 + 0.4 * Math.sin(t * 5.5 + i * 0.7)) * (py / height);
        const r = 0.8 + (seed % 1.8);
        ctx.fillStyle = `rgba(255,${60 + (i * 53 % 80)},0,${alpha})`;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      }

    } else if (id === "cedar-valley") {
      // Pollen / light motes drifting on breeze
      for (let i = 0; i < 20; i++) {
        const seed = i * 151.7;
        const px = ((seed * 7.9 + t * (wind.x * 12 + 6) + seed * 0.5) % (width + 60) + width + 60) % (width + 60) - 30;
        const py = height * 0.38 + (seed * 11.3) % (height * 0.5);
        const wobble = Math.sin(t * 1.4 + i * 1.1) * 4;
        const alpha = 0.25 + 0.2 * Math.sin(t * 2 + i * 0.7);
        ctx.fillStyle = `rgba(255,248,160,${alpha})`;
        ctx.beginPath(); ctx.arc(px + wobble, py, 1.5 + (seed % 1.5), 0, Math.PI * 2); ctx.fill();
      }

    } else if (id === "emerald-plateau") {
      // Tropical firefly / light bokeh
      for (let i = 0; i < 18; i++) {
        const seed = i * 163.9;
        const px = (seed * 9.3 + wind.x * 5) % width;
        const py = height * 0.42 + (seed * 13.1) % (height * 0.48);
        const glow = 0.3 + 0.55 * Math.abs(Math.sin(t * 1.8 + i * 0.9));
        ctx.fillStyle = `rgba(180,255,160,${glow * 0.5})`;
        ctx.beginPath(); ctx.arc(px, py, 2.5 + (seed % 2), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(220,255,200,${glow})`;
        ctx.beginPath(); ctx.arc(px, py, 0.9, 0, Math.PI * 2); ctx.fill();
      }
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
    const compactHud = this.usesCompactPortraitHud();
    const panelX = compactHud ? 10 : 16;
    const panelY = compactHud ? 10 : 14;
    const panelWidth = compactHud ? 170 : 242;
    const panelHeight = compactHud ? 50 : 66;
    const textX = compactHud ? 16 : 24;
    const line1Y = compactHud ? 25 : 34;
    const line2Y = compactHud ? 37 : 52;
    const line3Y = compactHud ? 49 : 70;
    const labelFont = compactHud ? "9px 'Segoe UI', sans-serif" : "12px 'Segoe UI', sans-serif";
    const meterWidth = compactHud ? 96 : 146;
    const meterHeight = compactHud ? 7 : 10;
    const meterX = compactHud ? width - 114 : width - 178;
    const meterY = compactHud ? 16 : 20;
    const meterFont = compactHud ? "8px 'Segoe UI', sans-serif" : "11px 'Segoe UI', sans-serif";
    const depthText = `${this.ui.labels.trajectoryDepth}: ${level.target.z.toFixed(1)}m`;
    const depthFont = compactHud ? "9px 'Segoe UI', sans-serif" : "11px 'Segoe UI', sans-serif";
    const depthPadX = compactHud ? 8 : 10;
    const depthHeight = compactHud ? 16 : 18;
    const depthY = meterY + meterHeight + (compactHud ? 6 : 8);

    ctx.fillStyle = "rgba(8, 16, 22, 0.58)";
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    ctx.fillStyle = "rgba(229, 245, 255, 0.95)";
    ctx.font = labelFont;
    ctx.textAlign = "left";
    ctx.fillText(`${this.ui.labels.wind}: ${wind.x >= 0 ? "+" : ""}${wind.x.toFixed(2)}m/s`, textX, line1Y);
    ctx.fillText(`${this.ui.labels.gravity}: ${level.gravity.toFixed(2)}m/s2`, textX, line2Y);
    ctx.fillText(`${this.ui.labels.drag}: ${level.drag.toFixed(4)}`, textX, line3Y);

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
    ctx.font = meterFont;
    ctx.textAlign = "right";
    ctx.fillText(`${this.ui.labels.wind} ${windMagnitude.toFixed(2)}m/s`, meterX + meterWidth, compactHud ? meterY - 2 : meterY - 4);

    ctx.font = depthFont;
    const depthWidth = Math.ceil(ctx.measureText(depthText).width + depthPadX * 2);
    const depthX = width - depthWidth - (compactHud ? 10 : 16);
    ctx.fillStyle = "rgba(18, 30, 36, 0.72)";
    ctx.fillRect(depthX, depthY, depthWidth, depthHeight);
    ctx.fillStyle = "rgba(207, 245, 255, 0.95)";
    ctx.textAlign = "left";
    ctx.fillText(depthText, depthX + depthPadX, depthY + (compactHud ? 11 : 13));
  }

  render() {
    const level = this.currentLevel;
    if (!level) {
      return;
    }

    this.drawBackground(level);
    this.drawGroundGrid(level);
    this.drawEnvironmentProps(level);
    this.drawAtmosphericParticles(level);
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
  const [menuLevel, setMenuLevel] = useState(() => loadProgress().lastLevel);
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);

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

  useEffect(() => {
    if (showOverlayMenu) setMenuLevel(snapshot.level.index);
  }, [showOverlayMenu]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const toggleAdvancedPanel = useCallback(() => {
    setShowAdvancedPanel((current) => !current);
  }, []);

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
          <button
            type="button"
            onClick={toggleAdvancedPanel}
            onPointerEnter={loadArcheryHorizonAdvancedPanel}
            onFocus={loadArcheryHorizonAdvancedPanel}
          >
            {showAdvancedPanel ? (locale === "es" ? "Ocultar panel" : "Hide panel") : (locale === "es" ? "Abrir panel" : "Open panel")}
          </button>
        </div>
      </div>

      <div className="archery-horizon-shell">
        <aside className="archery-horizon-panel">
          {showAdvancedPanel ? (
            <Suspense fallback={<section><p>{locale === "es" ? "Cargando panel de tiro..." : "Loading aiming panel..."}</p></section>}>
              <ArcheryHorizonAdvancedPanel
                ui={ui}
                snapshot={snapshot}
                minYaw={MIN_YAW}
                maxYaw={MAX_YAW}
                minElevation={MIN_ELEVATION}
                maxElevation={MAX_ELEVATION}
                minIntensity={MIN_INTENSITY}
                maxIntensity={MAX_INTENSITY}
                onSetAimYaw={(value) => runtimeRef.current?.setAimYaw(value)}
                onSetAimElevation={(value) => runtimeRef.current?.setAimElevation(value)}
                onSetAimIntensity={(value) => runtimeRef.current?.setAimIntensity(value)}
                onSelectLevel={(value) => runtimeRef.current?.selectLevel(value)}
              />
            </Suspense>
          ) : (
            <>
              <section>
                <h5>{ui.labels.objective}</h5>
                <p>{ui.labels.objectiveBody}</p>
              </section>

              <section className="archery-horizon-stats-grid">
                <article>
                  <span>{ui.labels.level}</span>
                  <strong>{snapshot.level.index}/{snapshot.level.total}</strong>
                </article>
                <article>
                  <span>{ui.labels.distance}</span>
                  <strong>{snapshot.level.distance.toFixed(1)} m</strong>
                </article>
                <article>
                  <span>{ui.labels.wind}</span>
                  <strong>{snapshot.level.windX >= 0 ? "+" : ""}{snapshot.level.windX.toFixed(2)} m/s</strong>
                </article>
                <article>
                  <span>{ui.labels.status}</span>
                  <strong>{snapshot.statusLabel}</strong>
                </article>
              </section>

              <section>
                <h5>{locale === "es" ? "Panel avanzado" : "Advanced panel"}</h5>
                <p>
                  {locale === "es"
                    ? "Carga los sliders de trayectoria, el selector de nivel y las estadisticas completas cuando los necesites."
                    : "Load trajectory sliders, level selector, and full stats only when needed."}
                </p>
              </section>
            </>
          )}
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
                  <div className="archery-horizon-level-picker">
                    <p className="archery-horizon-level-picker-label">{ui.labels.levelSelector}</p>
                    <div className="archery-horizon-level-grid">
                      {Array.from({ length: snapshot.level.unlocked }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={`archery-horizon-level-btn${menuLevel === n ? " selected" : ""}`}
                          onClick={() => setMenuLevel(n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    {(() => {
                      const lvl = LEVELS[menuLevel - 1];
                      const envName = locale === "es" ? lvl.environment.nameEs : lvl.environment.nameEn;
                      const diff = getDifficultyLabel(menuLevel - 1, locale);
                      return (
                        <p className="archery-horizon-level-preview">
                          {envName} &middot; {diff} &middot; {lvl.target.z.toFixed(0)} m
                        </p>
                      );
                    })()}
                  </div>
                  <div className="archery-horizon-overlay-actions">
                    <button
                      type="button"
                      onClick={() => {
                        runtimeRef.current?.selectLevel(menuLevel);
                        runtimeRef.current?.startTour();
                      }}
                    >
                      {ui.buttons.start}{menuLevel > 1 ? ` — ${ui.labels.level} ${menuLevel}` : ""}
                    </button>
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
