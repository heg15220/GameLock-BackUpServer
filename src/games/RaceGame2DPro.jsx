import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../utils/useGameRuntimeBridge";
import { RACE2DPRO_CIRCUITS } from "./race2dpro/circuits";
import "./RaceGame2DPro.css";

const STEP_MS = 1000 / 60;
const SEM_LIGHTS = 5;
const SPEED_TO_KMH = 0.55;
const FIXED_WEATHER_KEY = "dry";
const FINISH_PRESENTATION_DURATION = 2.25;
const FINISH_COAST_DECEL = 64;
const FINISH_COAST_MIN_SPEED = 54;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const wrap01 = (value) => ((value % 1) + 1) % 1;
const angNorm = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
const signedAngleDiff = (from, to) => angNorm(to - from);
const roundNumber = (value, digits = 2) => Number(value.toFixed(digits));
const approach = (current, target, rate, dt) => lerp(current, target, clamp(rate * dt, 0, 1));

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return [
    0.5
      * ((2 * p1[0])
      + (-p0[0] + p2[0]) * t
      + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2
      + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5
      * ((2 * p1[1])
      + (-p0[1] + p2[1]) * t
      + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2
      + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
  ];
}

function pseudoRandom(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453123;
  return value - Math.floor(value);
}

function formatRaceTime(seconds) {
  const safeSeconds = Math.max(0, seconds || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const secs = (safeSeconds % 60).toFixed(1).padStart(4, "0");
  return `${minutes}:${secs}`;
}

const ENVIRONMENTS = {
  "neon-city": {
    name: { es: "Circuito Urbano", en: "Urban Circuit" },
    roadColor: "#3a4048",
    borderColor: "#f6f6f6",
    glowColor: "rgba(255,255,255,0.12)",
    runoffColor: "#6b7480",
    kerbRed: "#e03030",
    kerbWhite: "#f3f3f3",
    bgColor: "#4a5a6e",
    grassColor: "#5a7060",
    centerLineColor: "rgba(255,255,255,0.30)",
    barrierColor: "#1e5eff",
    treeColor: "#2e5535",
    treeCount: 22,
    hasCrowd: true,
    runoffType: "asphalt",
  },
  volcano: {
    name: { es: "Circuito Montana", en: "Mountain Circuit" },
    roadColor: "#444850",
    borderColor: "#f6f6f6",
    glowColor: "rgba(255,255,255,0.12)",
    runoffColor: "#9c8060",
    kerbRed: "#d8402e",
    kerbWhite: "#f4f4f4",
    bgColor: "#7a6040",
    grassColor: "#8a7050",
    centerLineColor: "rgba(255,255,255,0.28)",
    barrierColor: "#e05500",
    treeColor: "#6a5030",
    treeCount: 14,
    hasCrowd: false,
    runoffType: "gravel",
  },
  arctic: {
    name: { es: "Circuito Costa", en: "Coastal Circuit" },
    roadColor: "#464c54",
    borderColor: "#f7f7f7",
    glowColor: "rgba(255,255,255,0.14)",
    runoffColor: "#dce8f0",
    kerbRed: "#d04040",
    kerbWhite: "#f5f5f5",
    bgColor: "#7090b0",
    grassColor: "#a0b8c8",
    centerLineColor: "rgba(255,255,255,0.32)",
    barrierColor: "#4488ff",
    treeColor: "#2a5038",
    treeCount: 18,
    hasCrowd: true,
    runoffType: "snow",
  },
  jungle: {
    name: { es: "Circuito Bosque", en: "Forest Circuit" },
    roadColor: "#404848",
    borderColor: "#f7f7f7",
    glowColor: "rgba(255,255,255,0.12)",
    runoffColor: "#3a6830",
    kerbRed: "#cc4030",
    kerbWhite: "#f4f4f4",
    bgColor: "#2a6840",
    grassColor: "#1e5428",
    centerLineColor: "rgba(255,255,255,0.28)",
    barrierColor: "#208020",
    treeColor: "#144a18",
    treeCount: 30,
    hasCrowd: false,
    runoffType: "grass",
  },
  desert: {
    name: { es: "Circuito Desierto", en: "Desert Circuit" },
    roadColor: "#4c5058",
    borderColor: "#f7f7f7",
    glowColor: "rgba(255,255,255,0.12)",
    runoffColor: "#c8a058",
    kerbRed: "#c84030",
    kerbWhite: "#f5f5f5",
    bgColor: "#d4a84c",
    grassColor: "#c09040",
    centerLineColor: "rgba(255,255,255,0.28)",
    barrierColor: "#cc8800",
    treeColor: "#8a6810",
    treeCount: 10,
    hasCrowd: false,
    runoffType: "sand",
  },
  space: {
    name: { es: "Grand Prix", en: "Grand Prix" },
    roadColor: "#424850",
    borderColor: "#f8f8f8",
    glowColor: "rgba(255,255,255,0.14)",
    runoffColor: "#606878",
    kerbRed: "#d04040",
    kerbWhite: "#f4f4f4",
    bgColor: "#7090b8",
    grassColor: "#607858",
    centerLineColor: "rgba(255,255,255,0.30)",
    barrierColor: "#0055ff",
    treeColor: "#204a28",
    treeCount: 20,
    hasCrowd: true,
    runoffType: "asphalt",
  },
};

const AI_PROFILES = {
  easy: {
    speedFactor: 0.84,
    lineOffset: 0.55,
    brakeMargin: 1.38,
    errorRate: 0.14,
    errorMag: 0.34,
    apexPrecision: 0.58,
    lookAheadBias: 0.9,
    trafficAwareness: 0.45,
    cornerCommit: 0.92,
    throttleCommit: 0.82,
    aggression: 0.38,
    gripFactor: 0.96,
    engineFactor: 0.94,
    brakeFactor: 0.96,
    steeringFactor: 0.94,
  },
  medium: {
    speedFactor: 0.93,
    lineOffset: 0.28,
    brakeMargin: 1.10,
    errorRate: 0.04,
    errorMag: 0.16,
    apexPrecision: 0.80,
    lookAheadBias: 1.0,
    trafficAwareness: 0.68,
    cornerCommit: 0.98,
    throttleCommit: 0.93,
    aggression: 0.62,
    gripFactor: 1.0,
    engineFactor: 1.0,
    brakeFactor: 1.0,
    steeringFactor: 1.0,
  },
  hard: {
    speedFactor: 1.07,
    lineOffset: 0.025,
    brakeMargin: 0.89,
    errorRate: 0.0015,
    errorMag: 0.018,
    apexPrecision: 1.08,
    lookAheadBias: 1.22,
    trafficAwareness: 1.0,
    cornerCommit: 1.08,
    throttleCommit: 1.06,
    aggression: 0.92,
    gripFactor: 1.08,
    engineFactor: 1.07,
    brakeFactor: 1.10,
    steeringFactor: 1.08,
  },
};

const AI_MOBILE_HARD_PROFILE = {
  ...AI_PROFILES.hard,
  speedFactor: 1.24,
  brakeMargin: 0.78,
  apexPrecision: 1.14,
  lookAheadBias: 1.30,
  cornerCommit: 1.20,
  throttleCommit: 1.22,
  aggression: 1.0,
  gripFactor: 1.18,
  engineFactor: 1.28,
  brakeFactor: 1.14,
  steeringFactor: 1.12,
  exitAcceleration: 1.26,
};

function getAiProfile(aiDifficulty, mobileHardAi) {
  if (mobileHardAi && aiDifficulty === "hard") return AI_MOBILE_HARD_PROFILE;
  return AI_PROFILES[aiDifficulty] ?? AI_PROFILES.medium;
}

const WEATHER_PROFILES = {
  dry: { id: "dry", label: { es: "Seco", en: "Dry" }, icon: "SUN", gripMult: 1.0, rainOverlay: false },
  rain: { id: "rain", label: { es: "Lluvia", en: "Rain" }, icon: "RAIN", gripMult: 0.72, rainOverlay: true },
  dusk: { id: "dusk", label: { es: "Crepusculo", en: "Dusk" }, icon: "DUSK", gripMult: 0.90, rainOverlay: false },
};

const PHYS = {
  MAX_SPEED: 470,
  ENGINE_ACCEL: 320,
  BRAKE_DECEL: 560,
  ENGINE_BRAKE: 92,
  ROLLING_DRAG: 28,
  AERO_DRAG: 0.00085,
  STEER_RATE: 3.15,
  STEER_RESPONSE: 10.5,
  THROTTLE_RESPONSE: 9.0,
  BRAKE_RESPONSE: 10.0,
  YAW_RESPONSE: 8.8,
  LATERAL_GRIP: 12.5,
  LATERAL_STABILITY: 9.0,
  CAR_RADIUS: 12,
  COLLISION_SEPARATION: 0.52,
  COLLISION_VELOCITY_DAMP: 0.992,
  COLLISION_YAW_DAMP: 0.82,
  COLLISION_THROTTLE_CLAMP: 0.78,
  COLLISION_CAMERA_SHAKE: 4,
  COLLISION_COOLDOWN: 0.1,
  OFF_TRACK_GRIP: 0.72,
  OFF_TRACK_MAX_SPEED_FACTOR: 0.82,
  OFF_TRACK_RECOVERY: 0.65,
};

const JOYSTICK_MAX_RADIUS = 45;
const JOYSTICK_DEADZONE = 7;

function getTrackUsableHalfWidth(track) {
  return Math.max(PHYS.CAR_RADIUS * 1.5, track.trackWidth * 0.5 - PHYS.CAR_RADIUS * 1.75);
}

function buildTrackSlots(track, startS, totalCars, {
  poleSide = "left",
  direction = -1,
  rowSpacing,
  lateralScale = 0.56,
  stagger = 0.42,
  leadOffsetRows = 0,
} = {}) {
  const primarySideSign = poleSide === "left" ? -1 : 1;
  const secondarySideSign = -primarySideSign;
  const usableHalfWidth = getTrackUsableHalfWidth(track);
  const effectiveRowSpacing = rowSpacing ?? Math.max(44, track.trackWidth * 0.62);
  const lateralOffsetMagnitude = usableHalfWidth * lateralScale;

  return Array.from({ length: totalCars }, (_, index) => {
    const row = Math.floor(index / 2);
    const onPrimarySide = index % 2 === 0;
    const sideSign = onPrimarySide ? primarySideSign : secondarySideSign;
    const rowOffset = leadOffsetRows + row + (onPrimarySide ? 0 : stagger);
    const slotS = wrap01(startS + direction * ((rowOffset * effectiveRowSpacing) / Math.max(1, track.totalLength)));
    const slotPoint = sampleTrackAt(track, slotS);
    const normalX = -Math.sin(slotPoint.ang);
    const normalY = Math.cos(slotPoint.ang);
    const trackOffset = sideSign * lateralOffsetMagnitude;
    return {
      x: slotPoint.x + normalX * trackOffset,
      y: slotPoint.y + normalY * trackOffset,
      a: slotPoint.ang,
      s: slotS,
      trackOffset,
      slot: index + 1,
      side: sideSign < 0 ? "left" : "right",
    };
  });
}

function buildTrack(trackDef, canvasWidth, canvasHeight) {
  const raw = trackDef.raw;
  const xs = raw.map((point) => point[0]);
  const ys = raw.map((point) => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = Math.min((canvasWidth * 0.86) / spanX, (canvasHeight * 0.76) / spanY);
  const offsetX = canvasWidth / 2 - ((minX + maxX) / 2) * scale;
  const offsetY = canvasHeight / 2 - ((minY + maxY) / 2) * scale;
  const points = raw.map(([x, y]) => [x * scale + offsetX, y * scale + offsetY]);
  const sampleCount = Math.max(900, raw.length * 32);

  const samples = [];
  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / sampleCount;
    const segment = t * raw.length;
    const index = Math.floor(segment);
    const fraction = segment - index;
    const p0 = points[(index - 1 + raw.length) % raw.length];
    const p1 = points[index % raw.length];
    const p2 = points[(index + 1) % raw.length];
    const p3 = points[(index + 2) % raw.length];
    const [x, y] = catmullRom(p0, p1, p2, p3, fraction);
    samples.push({ x, y, ang: 0, curvature: 0, speedLimit: PHYS.MAX_SPEED });
  }

  for (let i = 0; i < sampleCount; i += 1) {
    const next = samples[(i + 1) % sampleCount];
    const prev = samples[(i - 1 + sampleCount) % sampleCount];
    samples[i].ang = Math.atan2(next.y - prev.y, next.x - prev.x);
  }

  for (let i = 0; i < sampleCount; i += 1) {
    const prev = samples[(i - 1 + sampleCount) % sampleCount];
    const next = samples[(i + 1) % sampleCount];
    const deltaAngle = Math.abs(angNorm(next.ang - prev.ang));
    samples[i].curvature = deltaAngle;
    samples[i].speedLimit = PHYS.MAX_SPEED * clamp(1 - deltaAngle * 4.1, 0.24, 1);
  }

  let totalLength = 0;
  for (let i = 0; i < sampleCount; i += 1) {
    const next = samples[(i + 1) % sampleCount];
    totalLength += Math.hypot(next.x - samples[i].x, next.y - samples[i].y);
  }

  const decorations = [];
  let rngState = (trackDef.id + 1) * 9301 + 49297;
  const random = () => {
    rngState = (rngState * 9301 + 49297) % 233280;
    return rngState / 233280;
  };

  const environment = ENVIRONMENTS[trackDef.envId];
  const outerOffset = trackDef.trackWidth / 2 + 82;
  for (let treeIndex = 0; treeIndex < (environment.treeCount || 16); treeIndex += 1) {
    const sample = samples[Math.floor(random() * sampleCount)];
    const side = random() > 0.5 ? 1 : -1;
    const distance = outerOffset + random() * 74;
    const normalX = -Math.sin(sample.ang);
    const normalY = Math.cos(sample.ang);
    const radius = 6 + random() * 12;
    const treeColor = environment.treeColor || "#1e5a28";
    const hex = treeColor.replace("#", "");
    const r = Math.min(255, parseInt(hex.slice(0, 2), 16) + 30);
    const g = Math.min(255, parseInt(hex.slice(2, 4), 16) + 30);
    const b = Math.min(255, parseInt(hex.slice(4, 6), 16) + 20);
    decorations.push({
      type: "tree",
      x: sample.x + normalX * distance * side,
      y: sample.y + normalY * distance * side,
      radius,
      color: treeColor,
      highlight: `rgb(${r},${g},${b})`,
    });
  }

  if (environment.hasCrowd) {
    const gridSample = samples[Math.floor(trackDef.startS * sampleCount)];
    const normalX = -Math.sin(gridSample.ang);
    const normalY = Math.cos(gridSample.ang);
    const alongX = Math.cos(gridSample.ang);
    const alongY = Math.sin(gridSample.ang);
    const crowdOffset = trackDef.trackWidth / 2 + 68;
    for (let row = 0; row < 3; row += 1) {
      for (let col = -4; col <= 4; col += 1) {
        decorations.push({
          type: "crowd",
          x: gridSample.x + normalX * (crowdOffset + row * 14) + alongX * col * 16,
          y: gridSample.y + normalY * (crowdOffset + row * 14) + alongY * col * 16,
          row,
          col,
        });
      }
    }
    decorations.push({
      type: "stand",
      x: gridSample.x + normalX * (crowdOffset + 20),
      y: gridSample.y + normalY * (crowdOffset + 20),
      ang: gridSample.ang,
      w: 160,
      h: 50,
    });
  }

  const halfWidth = trackDef.trackWidth / 2;
  const barrierOffset = halfWidth + 36;
  const pathCenter = new Path2D();
  const pathLeft = new Path2D();
  const pathRight = new Path2D();
  const barrierLeft = new Path2D();
  const barrierRight = new Path2D();

  for (let i = 0; i <= sampleCount; i += 1) {
    const sample = samples[i % sampleCount];
    const normalX = -Math.sin(sample.ang);
    const normalY = Math.cos(sample.ang);
    const leftX = sample.x + normalX * halfWidth;
    const leftY = sample.y + normalY * halfWidth;
    const rightX = sample.x - normalX * halfWidth;
    const rightY = sample.y - normalY * halfWidth;
    const barrierLeftX = sample.x + normalX * barrierOffset;
    const barrierLeftY = sample.y + normalY * barrierOffset;
    const barrierRightX = sample.x - normalX * barrierOffset;
    const barrierRightY = sample.y - normalY * barrierOffset;

    if (i === 0) {
      pathCenter.moveTo(sample.x, sample.y);
      pathLeft.moveTo(leftX, leftY);
      pathRight.moveTo(rightX, rightY);
      barrierLeft.moveTo(barrierLeftX, barrierLeftY);
      barrierRight.moveTo(barrierRightX, barrierRightY);
    } else {
      pathCenter.lineTo(sample.x, sample.y);
      pathLeft.lineTo(leftX, leftY);
      pathRight.lineTo(rightX, rightY);
      barrierLeft.lineTo(barrierLeftX, barrierLeftY);
      barrierRight.lineTo(barrierRightX, barrierRightY);
    }
  }

  const kerbA = new Path2D();
  const kerbB = new Path2D();
  let kerbAccum = 0;
  let kerbColorIndex = 0;
  for (let i = 0; i < sampleCount - 1; i += 1) {
    const current = samples[i];
    const next = samples[i + 1];
    const curvature = (current.curvature + next.curvature) * 0.5;
    if (curvature < 0.015) {
      kerbAccum = 0;
      continue;
    }
    const segmentLength = Math.hypot(next.x - current.x, next.y - current.y);
    kerbAccum += segmentLength;
    if (kerbAccum > 14) {
      kerbColorIndex += 1;
      kerbAccum = 0;
    }
    const currentNormalX = -Math.sin(current.ang);
    const currentNormalY = Math.cos(current.ang);
    const nextNormalX = -Math.sin(next.ang);
    const nextNormalY = Math.cos(next.ang);
    for (const side of [-1, 1]) {
      const ax = current.x + currentNormalX * halfWidth * side;
      const ay = current.y + currentNormalY * halfWidth * side;
      const bx = next.x + nextNormalX * halfWidth * side;
      const by = next.y + nextNormalY * halfWidth * side;
      const path = (kerbColorIndex + (side === 1 ? 0 : 1)) % 2 === 0 ? kerbA : kerbB;
      path.moveTo(ax, ay);
      path.lineTo(bx, by);
    }
  }

  return {
    samples,
    totalLength,
    startS: trackDef.startS,
    trackWidth: trackDef.trackWidth,
    decorations,
    paths: {
      center: pathCenter,
      left: pathLeft,
      right: pathRight,
      barrierLeft,
      barrierRight,
      kerbA,
      kerbB,
    },
  };
}

function sampleTrackAt(track, s) {
  const safeS = wrap01(s);
  const index = safeS * track.samples.length;
  const index0 = Math.floor(index) % track.samples.length;
  const index1 = (index0 + 1) % track.samples.length;
  const fraction = index - Math.floor(index);
  const a = track.samples[index0];
  const b = track.samples[index1];
  return {
    x: lerp(a.x, b.x, fraction),
    y: lerp(a.y, b.y, fraction),
    ang: a.ang + signedAngleDiff(a.ang, b.ang) * fraction,
    curvature: lerp(a.curvature, b.curvature, fraction),
    speedLimit: lerp(a.speedLimit, b.speedLimit, fraction),
  };
}

function closestS(track, x, y) {
  const sampleCount = track.samples.length;
  let bestDistance = Infinity;
  let bestIndex = 0;
  const coarseStep = Math.max(1, Math.floor(sampleCount / 80));

  for (let i = 0; i < sampleCount; i += coarseStep) {
    const sample = track.samples[i];
    const distance = Math.hypot(sample.x - x, sample.y - y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  for (let i = bestIndex - 20; i <= bestIndex + 20; i += 1) {
    const index = ((i % sampleCount) + sampleCount) % sampleCount;
    const sample = track.samples[index];
    const distance = Math.hypot(sample.x - x, sample.y - y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex / sampleCount;
}

function closestSNear(track, x, y, hintS) {
  const sampleCount = track.samples.length;
  const hintIndex = Math.round(wrap01(hintS) * sampleCount);
  let bestDistance = Infinity;
  let bestIndex = hintIndex;
  for (let offset = -55; offset <= 55; offset += 1) {
    const index = ((hintIndex + offset) % sampleCount + sampleCount) % sampleCount;
    const sample = track.samples[index];
    const distance = Math.hypot(sample.x - x, sample.y - y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return bestIndex / sampleCount;
}

function buildTrackInfo(trackDef, weatherKey, aiDifficulty, laps, rivals, lang, t) {
  return {
    id: trackDef.id,
    name: trackDef.name[lang],
    env: ENVIRONMENTS[trackDef.envId].name[lang],
    classification: trackDef.classification[lang],
    layout: trackDef.layoutLabel[lang],
    note: trackDef.note[lang],
    distanceKm: trackDef.distanceKm,
    turns: trackDef.turns,
    overtaking: trackDef.overtaking[lang],
    profile: trackDef.profile[lang],
    weather: WEATHER_PROFILES[weatherKey].label[lang],
    difficulty: t[aiDifficulty],
    laps,
    rivals,
  };
}

function createStartProcedure(trackId, laps, rivals, aiDifficulty) {
  const difficultySeed = { easy: 7, medium: 19, hard: 31 }[aiDifficulty] || 7;
  const holdAfterFull = 0.48 + (((trackId + 1) * 23 + laps * 11 + rivals * 7 + difficultySeed) % 55) / 100;
  return {
    phase: "grid",
    elapsed: 0,
    lightCount: 0,
    gridDuration: 1.35,
    lightInterval: 0.72,
    holdAfterFull,
    goDuration: 0.70,
  };
}

function buildStartOverlay(startProcedure, t, screen = "race") {
  if (!startProcedure || screen !== "race") {
    return { phase: "off", lights: Array.from({ length: SEM_LIGHTS }, () => false), caption: "", detail: "" };
  }
  if (startProcedure.phase === "grid") {
    return { phase: "grid", lights: Array.from({ length: SEM_LIGHTS }, () => false), caption: t.gridReady, detail: t.gridDetail };
  }
  if (startProcedure.phase === "lights") {
    return {
      phase: "lights",
      lights: Array.from({ length: SEM_LIGHTS }, (_, index) => index < startProcedure.lightCount),
      caption: t.watchLights,
      detail: t.watchLightsDetail,
    };
  }
  if (startProcedure.phase === "go") {
    return { phase: "go", lights: Array.from({ length: SEM_LIGHTS }, () => false), caption: t.lightsOut, detail: t.lightsOutDetail };
  }
  return { phase: "off", lights: Array.from({ length: SEM_LIGHTS }, () => false), caption: "", detail: "" };
}

function getOrderedCars(game) {
  const getLiveS = (car) => {
    if (car.finished || !game.track) return car.s;
    return closestSNear(game.track, car.x, car.y, car.s);
  };

  const getProgressScore = (car) => {
    const liveS = getLiveS(car);
    const startS = game.track?.startS ?? 0;
    if (car.awaitingStartCross && car.lap <= 1) {
      const gridS = typeof car.gridS === "number" ? car.gridS : liveS;
      const distanceToStart = wrap01(startS - gridS);
      const traveledSinceGrid = wrap01(liveS - gridS);
      return traveledSinceGrid - distanceToStart;
    }
    return (car.lap - 1) + wrap01(liveS - startS);
  };

  return [...game.cars].sort((a, b) => {
    const aProgress = getProgressScore(a);
    const bProgress = getProgressScore(b);
    if (a.finishOrder && b.finishOrder) return a.finishOrder - b.finishOrder;
    if (a.finishOrder) return -1;
    if (b.finishOrder) return 1;
    return bProgress - aProgress;
  });
}

function getRacePosition(game, car) {
  return getOrderedCars(game).findIndex((candidate) => candidate.id === car.id) + 1;
}

function buildLeaderboard(game, t) {
  const ordered = getOrderedCars(game);
  return ordered.map((car, index) => {
    const time = car.finishTime != null && game._raceStartTime != null
      ? formatRaceTime((car.finishTime - game._raceStartTime) / 1000)
      : "--:--.-";
    return {
      pos: index + 1,
      isPlayer: car.isPlayer,
      color: car.color,
      driver: car.isPlayer ? t.you : `${t.rival} ${car.gridSlot}`,
      time,
      lap: car.lap,
      finished: car.finished,
    };
  });
}

function buildSetupViewModel(trackDef, aiDifficulty, weatherKey, laps, rivals, lang, t) {
  return {
    mode: "race2dpro",
    coordinates: "origin_top_left_x_right_y_down",
    screen: "setup",
    phase: "setup",
    track: buildTrackInfo(trackDef, weatherKey, aiDifficulty, laps, rivals, lang, t),
    format: {
      startType: t.standingStart,
      lights: t.fiveLights,
      grid: t.staggeredGrid,
      laps,
      rivals,
      difficulty: t[aiDifficulty],
    },
    startOverlay: buildStartOverlay(null, t, "setup"),
    hud: {
      position: 1,
      total: rivals + 1,
      lap: 1,
      totalLaps: laps,
      speed: 0,
      weatherIcon: WEATHER_PROFILES[weatherKey].icon,
      timer: "0:00.0",
      message: trackDef.note[lang],
    },
    player: null,
    cars: [],
    leaderboard: [],
    message: trackDef.note[lang],
  };
}

function buildRaceViewModel(screen, game, weatherKey, aiDifficulty, lang, t) {
  const playerCar = game.cars.find((car) => car.isPlayer) || game.cars[0];
  const preStartPhase = game.startProcedure?.phase && game.startProcedure.phase !== "racing";
  const playerPosition = playerCar.finishOrder
    || (preStartPhase
      ? (playerCar.gridSlot || getRacePosition(game, playerCar))
      : getRacePosition(game, playerCar));
  const startOverlay = buildStartOverlay(game.startProcedure, t, screen);
  const leaderboard = game.pendingLeaderboard || buildLeaderboard(game, t);
  const finishPresentation = screen !== "end" && game.finishPresentation?.active
    ? {
        title: t.finishBanner,
        detail: playerCar?.finished
          ? `P${playerPosition}/${game.cars.length} | ${t.finishBannerDetail}`
          : t.finishBannerDetail,
      }
    : null;
  const message = startOverlay.phase !== "off"
    ? startOverlay.detail
    : finishPresentation
      ? finishPresentation.detail
    : playerCar?.finished
      ? t.finishMessage
      : playerCar?.offTrack
        ? t.trackLimits
        : playerCar?.slipAngle > 0.13 && playerCar?.speed > 170
          ? t.balanceCaution
          : game.trackDef.note[lang];

  return {
    mode: "race2dpro",
    coordinates: "origin_top_left_x_right_y_down",
    screen,
    phase: screen === "end" ? "finished" : finishPresentation ? "finish" : game.startProcedure.phase,
    track: buildTrackInfo(game.trackDef, weatherKey, aiDifficulty, game.totalLaps, game.cars.length - 1, lang, t),
    format: {
      startType: t.standingStart,
      lights: t.fiveLights,
      grid: t.staggeredGrid,
      laps: game.totalLaps,
      rivals: game.cars.length - 1,
      difficulty: t[aiDifficulty],
    },
    startOverlay: screen === "end" ? buildStartOverlay(null, t, "end") : startOverlay,
    hud: {
      position: playerPosition,
      total: game.cars.length,
      lap: clamp(playerCar?.lap || 1, 1, game.totalLaps),
      totalLaps: game.totalLaps,
      speed: Math.round((playerCar?.speed || 0) * SPEED_TO_KMH),
      weatherIcon: game.weather.icon,
      timer: formatRaceTime(game.raceElapsed),
      message,
    },
    player: playerCar
      ? {
          id: playerCar.id,
          x: roundNumber(playerCar.x, 1),
          y: roundNumber(playerCar.y, 1),
          angle: roundNumber(playerCar.a, 2),
          progress: roundNumber(
            playerCar.finished || !game.track
              ? playerCar.s
              : closestSNear(game.track, playerCar.x, playerCar.y, playerCar.s),
            4
          ),
          lap: playerCar.lap,
          speedKmh: Math.round(playerCar.speed * SPEED_TO_KMH),
          slipAngle: roundNumber(playerCar.slipAngle, 3),
          surfaceGrip: roundNumber(playerCar.surfaceGrip, 2),
          offTrack: playerCar.offTrack,
          finished: playerCar.finished,
          gridSlot: playerCar.gridSlot,
        }
      : null,
    cars: getOrderedCars(game).map((car) => ({
      id: car.id,
      isPlayer: car.isPlayer,
      x: roundNumber(car.x, 1),
      y: roundNumber(car.y, 1),
      angle: roundNumber(car.a, 2),
      progress: roundNumber(
        car.finished || !game.track ? car.s : closestSNear(game.track, car.x, car.y, car.s),
        4
      ),
      lap: car.lap,
      finished: car.finished,
      finishOrder: car.finishOrder,
      speedKmh: Math.round(car.speed * SPEED_TO_KMH),
      gridSlot: car.gridSlot,
    })),
    finishPresentation,
    leaderboard,
    message,
  };
}

const CAR_LIVERIES = [
  { primary: "#e8001e", secondary: "#ffffff", helmet: "#ffff00", number: "#ffffff" },
  { primary: "#1e41ff", secondary: "#ffdd00", helmet: "#ffffff", number: "#ffdd00" },
  { primary: "#ff8000", secondary: "#000000", helmet: "#ffffff", number: "#000000" },
  { primary: "#00d2be", secondary: "#c0c0c0", helmet: "#000000", number: "#000000" },
  { primary: "#3671c6", secondary: "#ff0000", helmet: "#ffffff", number: "#ff0000" },
  { primary: "#900000", secondary: "#ffd700", helmet: "#ffffff", number: "#ffd700" },
  { primary: "#005aff", secondary: "#ffffff", helmet: "#ff0000", number: "#ffffff" },
  { primary: "#2d826d", secondary: "#cedc00", helmet: "#000000", number: "#cedc00" },
];

function createCar(id, isPlayer, aiDifficulty, seedBase, mobileHardAi = false) {
  const livery = CAR_LIVERIES[id % CAR_LIVERIES.length];
  const seed = seedBase + id * 17.23;
  return {
    id,
    isPlayer,
    color: livery.primary,
    livery,
    x: 0,
    y: 0,
    a: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    s: 0,
    lap: 1,
    finished: false,
    finishTime: null,
    finishOrder: null,
    spawnGrace: 1.5,
    trail: [],
    dustParticles: [],
    offTrack: false,
    offTrackRecovery: 1.0,
    throttleState: 0,
    brakeState: 0,
    steerState: 0,
    yawRate: 0,
    slipAngle: 0,
    surfaceGrip: 1,
    collided: false,
    collisionCooldown: 0,
    touchAssist: false,
    aiProfile: isPlayer ? null : getAiProfile(aiDifficulty, mobileHardAi),
    ai: isPlayer
      ? null
      : {
          t: 0,
          noiseSeed: pseudoRandom(seed + 0.7) * 9999,
          lineOffset: (pseudoRandom(seed + 2.4) - 0.5) * 0.4,
        },
    gridX: 0,
    gridY: 0,
    gridA: 0,
    gridS: 0,
    gridSlot: id + 1,
    gridSide: "left",
    trackOffset: 0,
    finishCoastSpeed: 0,
    awaitingStartCross: true,
  };
}

function buildGridSlots(track, trackDef, totalCars) {
  return buildTrackSlots(track, track.startS, totalCars, {
    poleSide: trackDef.poleSide,
    direction: -1,
    rowSpacing: Math.max(46, track.trackWidth * 0.66),
    lateralScale: 0.54,
    stagger: 0.42,
  });
}

function placeCarsOnGrid(cars, track, trackDef, playerGridIndex = 0) {
  const slots = buildGridSlots(track, trackDef, cars.length);
  const clampedPlayerGridIndex = clamp(playerGridIndex, 0, cars.length - 1);
  const playerCar = cars.find((car) => car.isPlayer) || cars[0];
  const aiCars = cars.filter((car) => !car.isPlayer);
  const orderedCars = Array.from({ length: cars.length }, () => null);
  orderedCars[clampedPlayerGridIndex] = playerCar;

  let aiIndex = 0;
  for (let i = 0; i < orderedCars.length; i += 1) {
    if (orderedCars[i]) continue;
    orderedCars[i] = aiCars[aiIndex];
    aiIndex += 1;
  }

  for (let i = 0; i < orderedCars.length; i += 1) {
    const slot = slots[i];
    const car = orderedCars[i];
    car.x = slot.x;
    car.y = slot.y;
    car.a = slot.a;
    car.vx = 0;
    car.vy = 0;
    car.speed = 0;
    car.throttleState = 0;
    car.brakeState = 0;
    car.steerState = 0;
    car.yawRate = 0;
    car.slipAngle = 0;
    car.surfaceGrip = 1;
    car.collided = false;
    car.collisionCooldown = 0;
    car.s = slot.s;
    car.gridX = slot.x;
    car.gridY = slot.y;
    car.gridA = slot.a;
    car.gridS = slot.s;
    car.gridSlot = slot.slot;
    car.gridSide = slot.side;
    car.trackOffset = slot.trackOffset;
    car.finishCoastSpeed = 0;
    car.awaitingStartCross = true;
  }
}

function parkCarsOnFinish(track, orderedCars) {
  const slots = buildTrackSlots(track, track.startS + 0.002, orderedCars.length, {
    poleSide: "left",
    direction: 1,
    rowSpacing: Math.max(52, track.trackWidth * 0.78),
    lateralScale: 0.42,
    stagger: 0.35,
    leadOffsetRows: 0.78,
  });

  for (let index = 0; index < orderedCars.length; index += 1) {
    const car = orderedCars[index];
    const slot = slots[index];
    car.x = slot.x;
    car.y = slot.y;
    car.a = slot.a;
    car.vx = 0;
    car.vy = 0;
    car.speed = 0;
    car.throttleState = 0;
    car.brakeState = 0;
    car.steerState = 0;
    car.yawRate = 0;
    car.slipAngle = 0;
    car.s = slot.s;
    car.trackOffset = slot.trackOffset;
    car.finishCoastSpeed = 0;
  }
}

function finalizeRaceResults(game, t, { parkCars = true } = {}) {
  const orderedCars = getOrderedCars(game);

  orderedCars.forEach((car, index) => {
    if (!car.finishOrder) {
      car.finishOrder = index + 1;
    }
    if (!car.finished) {
      car.finished = true;
      car.finishTime = game.clockMs;
    }
  });

  game.finishOrder = orderedCars.map((car) => car.id);
  if (parkCars) {
    parkCarsOnFinish(game.track, orderedCars);
  }
  game.pendingLeaderboard = buildLeaderboard(game, t);
}

function beginFinishPresentation(game, playerCar, t) {
  if (game._endTriggered) return;
  finalizeRaceResults(game, t, { parkCars: false });
  game._endTriggered = true;
  game.endCountdown = FINISH_PRESENTATION_DURATION;
  game.finishPresentation = {
    active: true,
    playerOrder: playerCar?.finishOrder || null,
  };
  if (!playerCar) return;

  const usableHalfWidth = getTrackUsableHalfWidth(game.track) * 0.58;
  playerCar.trackOffset = clamp(playerCar.trackOffset, -usableHalfWidth, usableHalfWidth);
  playerCar.finishCoastSpeed = clamp(playerCar.speed * 0.78, FINISH_COAST_MIN_SPEED, 220);
}

function advanceFinishedCar(car, track, dt, straightenToCenter = true) {
  if (!car.finished || car.finishCoastSpeed <= 0) return;

  const usableHalfWidth = getTrackUsableHalfWidth(track) * 0.58;
  car.trackOffset = straightenToCenter
    ? clamp(car.trackOffset * Math.max(0, 1 - dt * 1.2), -usableHalfWidth, usableHalfWidth)
    : clamp(car.trackOffset, -usableHalfWidth, usableHalfWidth);

  const travel = car.finishCoastSpeed * dt;
  car.finishCoastSpeed = Math.max(0, car.finishCoastSpeed - FINISH_COAST_DECEL * dt);
  car.s = wrap01(car.s + travel / Math.max(1, track.totalLength));
  const sample = sampleTrackAt(track, car.s);
  const normalX = -Math.sin(sample.ang);
  const normalY = Math.cos(sample.ang);
  const forwardX = Math.cos(sample.ang);
  const forwardY = Math.sin(sample.ang);

  car.a = sample.ang;
  car.x = sample.x + normalX * car.trackOffset;
  car.y = sample.y + normalY * car.trackOffset;
  car.vx = forwardX * car.finishCoastSpeed;
  car.vy = forwardY * car.finishCoastSpeed;
  car.speed = car.finishCoastSpeed;
  car.throttleState = 0;
  car.brakeState = 0;
  car.steerState = 0;
  car.yawRate = 0;
  car.slipAngle = 0;
  car.trail.unshift({ x: car.x, y: car.y, a: car.a });
  if (car.trail.length > 28) car.trail.pop();
}

function advanceFinishPresentation(game, dt) {
  if (!game.finishPresentation?.active) return;
  const playerCar = game.cars.find((car) => car.isPlayer);
  if (!playerCar) return;
  advanceFinishedCar(playerCar, game.track, dt, true);
}

function updateCar(car, dt, input, track, weatherProfile, allCars, startLocked) {
  if (car.finished || startLocked) return;

  const touchAssist = Boolean(car.isPlayer && car.touchAssist);
  const aiGripFactor = car.aiProfile?.gripFactor ?? 1;
  const aiEngineFactor = car.aiProfile?.engineFactor ?? 1;
  const aiBrakeFactor = car.aiProfile?.brakeFactor ?? 1;
  const aiSteeringFactor = car.aiProfile?.steeringFactor ?? 1;
  const offTrackMultiplier = car.offTrack ? lerp(PHYS.OFF_TRACK_GRIP, 1, car.offTrackRecovery) : 1;
  const touchGripBonus = touchAssist ? 1.16 : 1;
  const surfaceGrip = weatherProfile.gripMult * offTrackMultiplier * touchGripBonus * aiGripFactor;
  car.surfaceGrip = surfaceGrip;

  car.throttleState = approach(car.throttleState, input.throttle, PHYS.THROTTLE_RESPONSE, dt);
  car.brakeState = approach(car.brakeState, input.brake, PHYS.BRAKE_RESPONSE, dt);
  car.steerState = approach(car.steerState, input.steer, PHYS.STEER_RESPONSE, dt);

  const forwardX = Math.cos(car.a);
  const forwardY = Math.sin(car.a);
  const rightX = -forwardY;
  const rightY = forwardX;
  let longVel = car.vx * forwardX + car.vy * forwardY;
  let latVel = car.vx * rightX + car.vy * rightY;

  const offTrackSpeedFactor = car.offTrack
    ? lerp(PHYS.OFF_TRACK_MAX_SPEED_FACTOR, 1, car.offTrackRecovery)
    : 1;
  const maxSpeed = PHYS.MAX_SPEED * (car.aiProfile ? car.aiProfile.speedFactor : 1) * offTrackSpeedFactor;
  const speedRatio = clamp(Math.abs(longVel) / Math.max(1, maxSpeed), 0, 1.15);
  const driveAccel = PHYS.ENGINE_ACCEL * aiEngineFactor * car.throttleState * clamp(1 - Math.pow(speedRatio, 1.45), 0.18, 1);
  const brakeAccel = PHYS.BRAKE_DECEL * aiBrakeFactor * car.brakeState;
  const dragAccel = PHYS.ROLLING_DRAG + Math.abs(longVel) * 0.055 + longVel * longVel * PHYS.AERO_DRAG;
  const engineBrake = car.throttleState < 0.08 ? PHYS.ENGINE_BRAKE : 0;
  longVel += (driveAccel - brakeAccel - dragAccel - engineBrake) * dt;
  longVel = clamp(longVel, 0, maxSpeed);

  const steerAuthority = clamp((Math.abs(longVel) - 8) / (maxSpeed * 0.44), 0, 1);
  const touchYawAssist = touchAssist
    ? lerp(1, 0.82, clamp(car.throttleState * (0.5 + steerAuthority * 0.5), 0, 1))
    : 1;
  const targetYawRate = car.steerState
    * PHYS.STEER_RATE
    * aiSteeringFactor
    * (0.34 + steerAuthority * 1.08)
    * (0.75 + surfaceGrip * 0.25)
    * touchYawAssist;
  car.yawRate = approach(car.yawRate, targetYawRate, PHYS.YAW_RESPONSE, dt);
  car.a += car.yawRate * dt;

  const lateralGrip = PHYS.LATERAL_GRIP
    * surfaceGrip
    * (0.95 - speedRatio * 0.22)
    * (car.brakeState > 0.25 ? 0.94 : 1)
    * (touchAssist ? 1.36 : 1);
  latVel = lerp(latVel, 0, clamp(lateralGrip * dt, 0, 1));

  const alignedForwardX = Math.cos(car.a);
  const alignedForwardY = Math.sin(car.a);
  const alignedRightX = -alignedForwardY;
  const alignedRightY = alignedForwardX;
  const targetVx = alignedForwardX * longVel + alignedRightX * latVel;
  const targetVy = alignedForwardY * longVel + alignedRightY * latVel;
  const stabilityBlend = clamp(
    PHYS.LATERAL_STABILITY * surfaceGrip * (touchAssist ? 1.28 : 1) * dt,
    0,
    1
  );
  car.vx = lerp(car.vx, targetVx, stabilityBlend);
  car.vy = lerp(car.vy, targetVy, stabilityBlend);
  car.x += car.vx * dt;
  car.y += car.vy * dt;
  car.speed = Math.hypot(car.vx, car.vy);

  const halfWidth = track.trackWidth / 2;
  const currentS = closestSNear(track, car.x, car.y, car.s);
  const closestPoint = sampleTrackAt(track, currentS);
  const dx = car.x - closestPoint.x;
  const dy = car.y - closestPoint.y;
  const distance = Math.hypot(dx, dy);
  car.trackOffset = dx * (-Math.sin(closestPoint.ang)) + dy * Math.cos(closestPoint.ang);

  if (distance > halfWidth + 4) {
    car.offTrack = true;
    car.offTrackRecovery = Math.max(0, car.offTrackRecovery - dt / PHYS.OFF_TRACK_RECOVERY);
    const overDistance = distance - (halfWidth + 4);
    car.x -= (dx / distance) * overDistance * 0.7;
    car.y -= (dy / distance) * overDistance * 0.7;
    const scrub = clamp(overDistance / 30, 0, 0.24);
    car.vx *= 1 - scrub * 0.12;
    car.vy *= 1 - scrub * 0.12;
    car.yawRate *= 0.96;
    if (car.dustParticles.length < 60 && Math.random() < 0.4) {
      const angle = Math.random() * Math.PI * 2;
      car.dustParticles.push({
        x: car.x,
        y: car.y,
        vx: Math.cos(angle) * (20 + Math.random() * 30),
        vy: Math.sin(angle) * (20 + Math.random() * 30),
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1,
      });
    }
  } else {
    car.offTrack = false;
    car.offTrackRecovery = Math.min(1, car.offTrackRecovery + dt / PHYS.OFF_TRACK_RECOVERY);
  }

  for (let i = car.dustParticles.length - 1; i >= 0; i -= 1) {
    const particle = car.dustParticles[i];
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.92;
    particle.vy *= 0.92;
    particle.life -= dt;
    if (particle.life <= 0) car.dustParticles.splice(i, 1);
  }

  if (car.spawnGrace > 0) car.spawnGrace -= dt;
  if (car.collisionCooldown > 0) car.collisionCooldown -= dt;

  const deltaS = wrap01(currentS - car.s + 0.5) - 0.5;
  if (deltaS > 0) car.s = currentS;

  if (car.isPlayer) {
    for (const other of allCars) {
      if (other.id === car.id) continue;
      const nearDistance = Math.hypot(car.x - other.x, car.y - other.y);
      if (nearDistance < PHYS.CAR_RADIUS * 3.5 && nearDistance > PHYS.CAR_RADIUS * 2.2 && other.speed > car.speed) {
        car.vx += (other.vx - car.vx) * 0.004;
        car.vy += (other.vy - car.vy) * 0.004;
      }
    }
  }

  const slipForwardX = Math.cos(car.a);
  const slipForwardY = Math.sin(car.a);
  const slipRightX = -slipForwardY;
  const slipRightY = slipForwardX;
  const stabilizedLongVel = car.vx * slipForwardX + car.vy * slipForwardY;
  const stabilizedLatVel = car.vx * slipRightX + car.vy * slipRightY;
  car.slipAngle = Math.atan2(Math.abs(stabilizedLatVel), Math.max(32, Math.abs(stabilizedLongVel)));

  car.trail.unshift({ x: car.x, y: car.y, a: car.a });
  if (car.trail.length > 28) car.trail.pop();
}

function resolveCarCollisions(cars) {
  for (const car of cars) {
    car.collided = false;
  }

  for (let i = 0; i < cars.length; i += 1) {
    const a = cars[i];
    if (a.finished || a.spawnGrace > 0) continue;

    for (let j = i + 1; j < cars.length; j += 1) {
      const b = cars[j];
      if (b.finished || b.spawnGrace > 0) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      const minimumDistance = PHYS.CAR_RADIUS * 2.02;
      if (distance >= minimumDistance) continue;

      const safeDistance = Math.max(distance, 0.001);
      const nx = dx / safeDistance;
      const ny = dy / safeDistance;
      const overlap = minimumDistance - safeDistance;
      const separation = overlap * PHYS.COLLISION_SEPARATION;

      a.x -= nx * separation;
      a.y -= ny * separation;
      b.x += nx * separation;
      b.y += ny * separation;

      const relativeVx = b.vx - a.vx;
      const relativeVy = b.vy - a.vy;
      const closingSpeed = relativeVx * nx + relativeVy * ny;

      if (closingSpeed < 0) {
        const impulse = -closingSpeed * 0.32;
        a.vx -= nx * impulse;
        a.vy -= ny * impulse;
        b.vx += nx * impulse;
        b.vy += ny * impulse;
      }

      a.vx *= PHYS.COLLISION_VELOCITY_DAMP;
      a.vy *= PHYS.COLLISION_VELOCITY_DAMP;
      b.vx *= PHYS.COLLISION_VELOCITY_DAMP;
      b.vy *= PHYS.COLLISION_VELOCITY_DAMP;
      a.speed = Math.hypot(a.vx, a.vy);
      b.speed = Math.hypot(b.vx, b.vy);

      a.yawRate *= PHYS.COLLISION_YAW_DAMP;
      b.yawRate *= PHYS.COLLISION_YAW_DAMP;
      a.throttleState = Math.min(a.throttleState, PHYS.COLLISION_THROTTLE_CLAMP);
      b.throttleState = Math.min(b.throttleState, PHYS.COLLISION_THROTTLE_CLAMP);

      if (a.collisionCooldown <= 0) {
        a.collided = true;
        a.collisionCooldown = PHYS.COLLISION_COOLDOWN;
      }
      if (b.collisionCooldown <= 0) {
        b.collided = true;
        b.collisionCooldown = PHYS.COLLISION_COOLDOWN;
      }
    }
  }
}

function computeAiInput(car, track, weatherProfile, allCars) {
  const profile = car.aiProfile;
  const ai = car.ai;
  ai.t += 0.016;
  ai.lowSpeedTime = car.speed < 28 && !car.finished
    ? (ai.lowSpeedTime ?? 0) + 0.016
    : Math.max(0, (ai.lowSpeedTime ?? 0) - 0.048);

  const speedRatio = car.speed / PHYS.MAX_SPEED;
  const awareness = profile.trafficAwareness ?? 0.6;
  const aggression = profile.aggression ?? 0.5;
  const lookAheadBias = profile.lookAheadBias ?? 1;
  const shortLook = (0.018 + speedRatio * 0.034) * lookAheadBias;
  const midLook = (0.038 + speedRatio * 0.048) * lookAheadBias;
  const longLook = (0.072 + speedRatio * 0.060) * lookAheadBias;
  const targetS = wrap01(car.s + shortLook);
  const target = sampleTrackAt(track, targetS);
  const midTarget = sampleTrackAt(track, wrap01(car.s + midLook));
  const longTarget = sampleTrackAt(track, wrap01(car.s + longLook));
  const cornerStrength = Math.max(target.curvature, midTarget.curvature, longTarget.curvature);
  const isCorner = cornerStrength > 0.014;
  const normalX = -Math.sin(target.ang);
  const normalY = Math.cos(target.ang);

  let apexOffset = 0;
  if (isCorner) {
    const entry = sampleTrackAt(track, wrap01(car.s + shortLook * 0.35));
    const exit = sampleTrackAt(track, wrap01(car.s + longLook * 1.12));
    const entryDelta = angNorm(target.ang - entry.ang);
    const exitDelta = angNorm(exit.ang - target.ang);
    const curveSign = Math.sign(entryDelta + exitDelta) || Math.sign(angNorm(longTarget.ang - target.ang)) || 1;
    const phase = clamp((cornerStrength - 0.012) / 0.055, 0, 1);
    const entryWidening = curveSign * track.trackWidth * 0.18 * profile.apexPrecision * (1 - phase * 0.35);
    const apexClip = curveSign * track.trackWidth * 0.34 * profile.apexPrecision * phase;
    apexOffset = lerp(entryWidening, apexClip, clamp(speedRatio * 0.85 + phase * 0.35, 0, 1));
  }

  const noiseOffset = Math.sin(ai.t * 0.35 + ai.noiseSeed) * track.trackWidth * profile.lineOffset * 0.4;
  const baseOffset = apexOffset + noiseOffset + ai.lineOffset * profile.lineOffset * track.trackWidth * 0.15;

  let overtakeShift = 0;
  let trafficSpeedBias = 1;
  let trafficBrakeBias = 0;
  const usableHalfWidth = getTrackUsableHalfWidth(track);
  const recoveryMode = ai.lowSpeedTime > 0.55 || (car.offTrack && car.speed < 74);
  const trafficEnabled = !recoveryMode && ai.lowSpeedTime < 0.24 && !car.offTrack;
  if (trafficEnabled) {
    for (const other of allCars) {
      if (other.id === car.id) continue;
      const relX = other.x - car.x;
      const relY = other.y - car.y;
      const along = relX * Math.cos(car.a) + relY * Math.sin(car.a);
      const lateral = -relX * Math.sin(car.a) + relY * Math.cos(car.a);
      const sameLapThreat = !other.finished && Math.abs(wrap01(other.s - car.s + 0.5) - 0.5) < 0.08;
      if (!sameLapThreat || along <= -18 || along > 150) continue;

      const closing = car.speed - other.speed;
      const sideSpaceLeft = usableHalfWidth + car.trackOffset;
      const sideSpaceRight = usableHalfWidth - car.trackOffset;
      const preferLeft = sideSpaceLeft > sideSpaceRight ? -1 : 1;
      const passSide = lateral < -8 ? 1 : lateral > 8 ? -1 : preferLeft;
      const obstacleUrgency = clamp((150 - along) / 130, 0, 1) * clamp((34 - Math.abs(lateral)) / 34, 0, 1);

      if (obstacleUrgency > 0) {
        const cornerCaution = isCorner ? 0.55 : 1;
        overtakeShift += passSide * track.trackWidth * 0.32 * awareness * obstacleUrgency * cornerCaution;
        if (car.speed > 108 && closing > 34 && along < 54) {
          trafficBrakeBias = Math.max(trafficBrakeBias, (closing - 26) / 110 * (1 - aggression * 0.52));
        }
        if (along > 42 && Math.abs(lateral) < 18 && closing < 18 && !isCorner) {
          trafficSpeedBias = Math.max(trafficSpeedBias, 1 + 0.035 * awareness);
        }
      }
    }
  }

  const requestedOffset = recoveryMode ? baseOffset * 0.24 : baseOffset + overtakeShift;
  const safeOffset = clamp(requestedOffset, -usableHalfWidth * 0.9, usableHalfWidth * 0.9);
  const targetX = target.x + normalX * safeOffset;
  const targetY = target.y + normalY * safeOffset;
  let angleDiff = angNorm(Math.atan2(targetY - car.y, targetX - car.x) - car.a);
  if (Math.random() < profile.errorRate) {
    angleDiff += (Math.random() - 0.5) * profile.errorMag * 2;
  }

  const steeringGain = 2.25 + awareness * 0.32 + clamp(cornerStrength * 8, 0, 0.55);
  const steer = clamp(angleDiff * steeringGain, -1, 1);
  const minUpcomingSpeed = Math.min(target.speedLimit, midTarget.speedLimit, longTarget.speedLimit);
  const cornerExit = isCorner && longTarget.curvature < cornerStrength * 0.62 && Math.abs(steer) < 0.7;
  const exitAcceleration = profile.exitAcceleration ?? 1;
  const straightBonus = cornerStrength < 0.006
    ? 1 + 0.055 * profile.throttleCommit
    : (cornerExit ? 1 + 0.045 * exitAcceleration : 1);
  const cornerGripUse = isCorner ? profile.cornerCommit : 1;
  const environmentGrip = weatherProfile.gripMult * (car.offTrack ? 0.9 : 1);
  const rawTargetSpeed = (minUpcomingSpeed * environmentGrip * profile.speedFactor * cornerGripUse * straightBonus * trafficSpeedBias) / profile.brakeMargin;
  const skillRecovery = clamp((profile.speedFactor - 0.84) / 0.23, 0, 1);
  const minimumRollingSpeed = car.offTrack
    ? lerp(58, 90, skillRecovery)
    : (isCorner ? lerp(78, 128, skillRecovery) : lerp(104, 164, skillRecovery));
  const targetSpeed = Math.max(minimumRollingSpeed, rawTargetSpeed);
  const speedDiff = car.speed - targetSpeed;
  const slipCaution = car.speed > 84 ? clamp((car.slipAngle - 0.08) / 0.16, 0, 0.45) : 0;
  const offTrackCaution = car.offTrack ? clamp((car.speed - 70) / 180, 0, 0.22) : 0;
  const cautionBrake = speedDiff > -12 ? trafficBrakeBias + slipCaution + offTrackCaution : Math.max(0, trafficBrakeBias - 0.12);
  const rawBrake = clamp((speedDiff > 0 ? speedDiff / (86 - awareness * 18) : 0) + cautionBrake, 0, 1);
  const brake = recoveryMode && speedDiff < 18 ? 0 : rawBrake;
  let throttle = brake > 0.06
    ? 0
    : speedDiff < -8
      ? clamp((targetSpeed - car.speed) / (76 - awareness * 14), 0.18, isCorner ? 0.78 * profile.throttleCommit : 1)
      : (isCorner ? 0.24 * profile.throttleCommit : 0.44 * profile.throttleCommit);

  if (cornerExit && brake <= 0.06) {
    throttle = Math.max(throttle, clamp(0.68 * exitAcceleration, 0.68, 1));
  }

  if (recoveryMode) {
    throttle = Math.max(throttle, car.offTrack ? 0.72 * exitAcceleration : 0.58 * exitAcceleration);
  }

  return { throttle: clamp(throttle, 0, 1), brake, steer };
}

function checkLapCross(car, prevS, startS, totalLaps, clockMs, onFinish) {
  const prevFromStart = wrap01(prevS - startS);
  const currentFromStart = wrap01(car.s - startS);
  const crossed = prevFromStart > 0.85 && currentFromStart < 0.15;
  if (!crossed) return;
  if (car.awaitingStartCross) {
    car.awaitingStartCross = false;
    return;
  }
  if (car.lap >= totalLaps) {
    car.finished = true;
    car.finishTime = clockMs;
    car.finishCoastSpeed = clamp(car.speed * 0.82, FINISH_COAST_MIN_SPEED, 220);
    onFinish(car);
  } else {
    car.lap += 1;
  }
}

function getPlayerInput(keys, joy, touchInput) {
  let throttle = 0;
  let brake = 0;
  let steer = 0;

  if (joy.active) {
    const dx = clamp(joy.dx / JOYSTICK_MAX_RADIUS, -1, 1);
    const deadzone = JOYSTICK_DEADZONE / JOYSTICK_MAX_RADIUS;
    const absDx = Math.abs(dx);
    if (absDx > deadzone) {
      const normalizedDx = clamp((absDx - deadzone) / (1 - deadzone), 0, 1);
      steer = Math.sign(dx) * Math.pow(normalizedDx, 0.82);
    }
  }

  if (keys.has("ArrowUp") || keys.has("KeyW") || keys.has("Numpad8")) throttle = 1;
  if (keys.has("ArrowDown") || keys.has("KeyS") || keys.has("Numpad2")) brake = 1;
  if (keys.has("ArrowLeft") || keys.has("KeyA") || keys.has("Numpad4")) steer = steer === 0 ? -1 : Math.min(steer, -0.42);
  if (keys.has("ArrowRight") || keys.has("KeyD") || keys.has("Numpad6")) steer = steer === 0 ? 1 : Math.max(steer, 0.42);

  if (touchInput.touchThrottle) throttle = 1;
  if (touchInput.touchBrake) brake = 1;

  return { throttle, brake, steer };
}

function updateStartProcedure(game, dt) {
  const start = game.startProcedure;
  let changed = false;
  start.elapsed += dt;

  if (start.phase === "grid" && start.elapsed >= start.gridDuration) {
    start.phase = "lights";
    start.elapsed = 0;
    start.lightCount = 0;
    return true;
  }

  if (start.phase === "lights") {
    const nextLightCount = Math.min(SEM_LIGHTS, Math.floor(start.elapsed / start.lightInterval));
    if (nextLightCount !== start.lightCount) {
      start.lightCount = nextLightCount;
      changed = true;
    }

    if (start.elapsed >= start.lightInterval * SEM_LIGHTS + start.holdAfterFull) {
      start.phase = "go";
      start.elapsed = 0;
      start.lightCount = 0;
      game._raceStartTime = game.clockMs;
      return true;
    }
  }

  if (start.phase === "go" && start.elapsed >= start.goDuration) {
    start.phase = "racing";
    start.elapsed = 0;
    return true;
  }

  return changed;
}

function stepRaceState(game, dt, playerInput, t) {
  game.clockMs += dt * 1000;
  game.time += dt;

  if (game._endTriggered) {
    for (const car of game.cars) {
      if (!car.isPlayer) advanceFinishedCar(car, game.track, dt, false);
    }
    advanceFinishPresentation(game, dt);
    game.endCountdown -= dt;
    if (game.endCountdown <= 0) {
      if (game.finishPresentation?.active) {
        parkCarsOnFinish(game.track, getOrderedCars(game));
        game.finishPresentation.active = false;
      }
      return { requestScreen: "end", importantChange: true };
    }
    return { importantChange: false };
  }

  const startChanged = updateStartProcedure(game, dt);
  const startLocked = game.startProcedure.phase !== "racing";
  const playerCar = game.cars.find((car) => car.isPlayer);

  for (const car of game.cars) {
    const prevS = car.s;
    let input;
    if (car.isPlayer) {
      input = startLocked ? { throttle: 0, brake: 0, steer: 0 } : playerInput;
    } else if (game.startProcedure.phase === "racing") {
      input = computeAiInput(car, game.track, game.weather, game.cars);
    } else {
      input = { throttle: 0, brake: 0, steer: 0 };
    }

    updateCar(car, dt, input, game.track, game.weather, game.cars, startLocked);

    if (game.startProcedure.phase === "racing") {
      checkLapCross(car, prevS, game.track.startS, game.totalLaps, game.clockMs, (finishedCar) => {
        finishedCar.finishOrder = game.finishOrder.length + 1;
        game.finishOrder.push(finishedCar.id);
      });
    }
  }

  if (game.startProcedure.phase === "racing") {
    resolveCarCollisions(game.cars);
  }

  for (const car of game.cars) {
    if (!car.isPlayer) advanceFinishedCar(car, game.track, dt, false);
  }

  if (game.startProcedure.phase === "racing" && game._raceStartTime != null) {
    game.raceElapsed = Math.max(0, (game.clockMs - game._raceStartTime) / 1000);
  }

  if (game.startProcedure.phase === "racing") {
    const playerFinished = Boolean(playerCar && playerCar.finished);
    const allFinished = game.cars.every((car) => car.finished);
    if (playerFinished) {
      beginFinishPresentation(game, playerCar, t);
      return { importantChange: true };
    }
    if (allFinished) {
      finalizeRaceResults(game, t);
      game._endTriggered = true;
      game.endCountdown = 0.8;
      return { importantChange: true };
    }
  }

  return { importantChange: startChanged };
}

function renderBackground(ctx, width, height, env, weatherProfile, time) {
  ctx.fillStyle = env.bgColor;
  ctx.fillRect(0, 0, width, height);

  if (weatherProfile.rainOverlay) {
    ctx.save();
    ctx.strokeStyle = "rgba(140,190,255,0.16)";
    ctx.lineWidth = 1;
    const offset = (time * 280) % 55;
    for (let x = -60; x < width + 60; x += 11) {
      ctx.beginPath();
      ctx.moveTo(x + offset, 0);
      ctx.lineTo(x + offset + 28, height);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (weatherProfile.id === "dusk") {
    const gradient = ctx.createRadialGradient(width / 2, height / 2, height * 0.15, width / 2, height / 2, height * 0.85);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(25,12,0,0.50)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
}

function renderDecorations(ctx, track, env) {
  if (!track.decorations) return;
  for (const decoration of track.decorations) {
    if (decoration.type === "tree") {
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.ellipse(decoration.x + 3, decoration.y + 4, decoration.radius * 0.9, decoration.radius * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = decoration.color;
      ctx.beginPath();
      ctx.arc(decoration.x, decoration.y, decoration.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = decoration.highlight || decoration.color;
      ctx.beginPath();
      ctx.arc(decoration.x - decoration.radius * 0.2, decoration.y - decoration.radius * 0.2, decoration.radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (decoration.type === "stand") {
      ctx.save();
      ctx.translate(decoration.x, decoration.y);
      ctx.rotate(decoration.ang + Math.PI / 2);
      ctx.fillStyle = "rgba(60,60,80,0.85)";
      ctx.fillRect(-decoration.w / 2, -decoration.h / 2, decoration.w, decoration.h);
      ctx.fillStyle = "rgba(30,30,50,0.9)";
      ctx.fillRect(-decoration.w / 2, -decoration.h / 2, decoration.w, 10);
      ctx.restore();
    } else if (decoration.type === "crowd") {
      const crowdColors = ["#c44", "#c84", "#48c", "#8c4", "#c48", "#888"];
      ctx.fillStyle = crowdColors[(decoration.row * 3 + (decoration.col + 4)) % crowdColors.length];
      ctx.beginPath();
      ctx.arc(decoration.x, decoration.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function updateFollowCamera(camera, player, dt, mobileCamera = false) {
  const lookAhead = mobileCamera
    ? 72 + player.speed * 0.30
    : 110 + player.speed * 0.46;
  const targetX = player.x + Math.cos(player.a) * lookAhead + player.vx * 0.14;
  const targetY = player.y + Math.sin(player.a) * lookAhead + player.vy * 0.14;
  const blend = clamp(dt * 4, 0, 1);
  camera.x = lerp(camera.x, targetX, blend);
  camera.y = lerp(camera.y, targetY, blend);
  const targetZoom = mobileCamera
    ? clamp(1.16 - (player.speed / PHYS.MAX_SPEED) * 0.16, 0.92, 1.16)
    : clamp(0.94 - (player.speed / PHYS.MAX_SPEED) * 0.20, 0.68, 0.94);
  camera.zoom = lerp(camera.zoom, targetZoom, clamp(dt * 2.6, 0, 1));
  camera.shakeX = lerp(camera.shakeX || 0, 0, clamp(dt * 8, 0, 1));
  camera.shakeY = lerp(camera.shakeY || 0, 0, clamp(dt * 8, 0, 1));
}

function applyCameraTransform(ctx, camera, width, height) {
  ctx.setTransform(
    camera.zoom,
    0,
    0,
    camera.zoom,
    width / 2 - (camera.x + (camera.shakeX || 0)) * camera.zoom,
    height / 2 - (camera.y + (camera.shakeY || 0)) * camera.zoom
  );
}

function renderTrack(ctx, track, env) {
  const samples = track.samples;
  const finishIndex = Math.floor(track.startS * samples.length);
  const finishSample = samples[finishIndex];
  const squareWidth = Math.max(6, track.trackWidth / 8);
  const squareHeight = 10;
  const squareCount = Math.round(track.trackWidth / squareWidth);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  let runoffColor = env.runoffColor;
  if (env.runoffType === "grass") runoffColor = env.grassColor || "#2a6030";
  else if (env.runoffType === "sand") runoffColor = env.runoffColor || "#c8a058";
  else if (env.runoffType === "snow") runoffColor = "#dce8f0";
  else if (env.runoffType === "gravel") runoffColor = "#8a7860";
  ctx.strokeStyle = runoffColor;
  ctx.lineWidth = track.trackWidth + 70;
  ctx.stroke(track.paths.center);

  ctx.lineWidth = 5;
  ctx.strokeStyle = env.barrierColor || "#1e5eff";
  ctx.stroke(track.paths.barrierLeft);
  ctx.stroke(track.paths.barrierRight);

  ctx.strokeStyle = env.roadColor;
  ctx.lineWidth = track.trackWidth + 2;
  ctx.stroke(track.paths.center);

  const roadHex = env.roadColor.replace("#", "");
  const roadR = parseInt(roadHex.slice(0, 2), 16);
  const roadG = parseInt(roadHex.slice(2, 4), 16);
  const roadB = parseInt(roadHex.slice(4, 6), 16);
  ctx.strokeStyle = `rgba(${Math.min(255, roadR + 18)},${Math.min(255, roadG + 18)},${Math.min(255, roadB + 18)},0.5)`;
  ctx.lineWidth = track.trackWidth * 0.5;
  ctx.stroke(track.paths.center);

  ctx.setLineDash([20, 15]);
  ctx.strokeStyle = env.centerLineColor;
  ctx.lineWidth = 2;
  ctx.stroke(track.paths.center);
  ctx.setLineDash([]);

  ctx.save();
  ctx.translate(finishSample.x, finishSample.y);
  ctx.rotate(finishSample.ang);
  for (let col = 0; col < squareCount; col += 1) {
    for (let row = 0; row < 2; row += 1) {
      ctx.fillStyle = (col + row) % 2 === 0 ? "#ffffff" : "#1a1a1a";
      ctx.fillRect(-squareHeight / 2 + row * squareHeight, -track.trackWidth / 2 + col * squareWidth, squareHeight, squareWidth);
    }
  }
  ctx.restore();

  ctx.lineWidth = 8;
  ctx.strokeStyle = env.kerbRed || "#e03030";
  ctx.stroke(track.paths.kerbA);
  ctx.strokeStyle = env.kerbWhite || "#f3f3f3";
  ctx.stroke(track.paths.kerbB);

  ctx.save();
  ctx.shadowBlur = 8;
  ctx.shadowColor = "rgba(255,255,255,0.3)";
  ctx.strokeStyle = env.borderColor;
  ctx.lineWidth = 2.5;
  ctx.stroke(track.paths.left);
  ctx.stroke(track.paths.right);
  ctx.restore();
}

function renderStartingBoxes(ctx, cars, phase, phaseTimer, env) {
  if (phase === "racing" || phase === "off") return;
  const alpha = phase === "go" ? Math.max(0, 1 - phaseTimer / 0.7) : 0.82;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = env.borderColor;
  ctx.lineWidth = 1.6;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.shadowBlur = 10;
  ctx.shadowColor = env.borderColor;

  for (const car of cars) {
    ctx.save();
    ctx.translate(car.gridX, car.gridY);
    ctx.rotate(car.gridA);
    ctx.beginPath();
    ctx.moveTo(-20, -12);
    ctx.lineTo(16, -12);
    ctx.lineTo(16, 12);
    ctx.lineTo(-20, 12);
    ctx.stroke();
    ctx.fillRect(-20, -12, 36, 24);
    ctx.font = "bold 9px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(car.gridSlot), -26, 0);
    ctx.restore();
  }

  ctx.restore();
}

function renderCar(ctx, car, isPlayer) {
  const livery = car.livery || { primary: car.color, secondary: "#ffffff", helmet: "#ffffff", number: "#ffffff" };

  for (let i = 0; i < car.trail.length; i += 1) {
    const trail = car.trail[i];
    const alpha = (1 - i / car.trail.length) * (isPlayer ? 0.18 : 0.10);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(trail.x, trail.y);
    ctx.rotate(trail.a);
    ctx.fillStyle = livery.primary;
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(0.1, 6.2 - i * 0.18), Math.max(0.1, 3.0 - i * 0.06), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (car.dustParticles.length > 0) {
    ctx.save();
    ctx.fillStyle = "rgba(180,160,120,0.8)";
    for (const particle of car.dustParticles) {
      ctx.globalAlpha = (particle.life / particle.maxLife) * 0.55;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 4 * (particle.life / particle.maxLife), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.a);

  if (isPlayer) {
    ctx.shadowBlur = 20;
    ctx.shadowColor = livery.primary;
  }

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.beginPath();
  ctx.ellipse(3, 3, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#111111";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(6, -10, 8, 5, 2);
  else ctx.rect(6, -10, 8, 5);
  ctx.fill();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(6, 5, 8, 5, 2);
  else ctx.rect(6, 5, 8, 5);
  ctx.fill();

  ctx.fillStyle = livery.primary;
  ctx.beginPath();
  ctx.moveTo(-14, -6);
  ctx.lineTo(14, -8);
  ctx.lineTo(14, 8);
  ctx.lineTo(-14, 6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = livery.secondary;
  ctx.beginPath();
  ctx.moveTo(-6, -4.5);
  ctx.lineTo(10, -5.5);
  ctx.lineTo(10, -3.5);
  ctx.lineTo(-6, -2.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = livery.secondary;
  ctx.beginPath();
  ctx.moveTo(-14, -12);
  ctx.lineTo(-10, -8);
  ctx.lineTo(-10, 8);
  ctx.lineTo(-14, 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = livery.primary;
  ctx.fillRect(-15, -13, 3, 4);
  ctx.fillRect(-15, 9, 3, 4);

  ctx.fillStyle = livery.secondary;
  ctx.fillRect(11, -10, 5, 20);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(13, -5, 1, 10);

  ctx.fillStyle = "#111111";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-14, -10, 8, 5, 2);
  else ctx.rect(-14, -10, 8, 5);
  ctx.fill();
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-14, 5, 8, 5, 2);
  else ctx.rect(-14, 5, 8, 5);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(-13, -10, 3, 2);
  ctx.fillRect(-13, 5, 3, 2);
  ctx.fillRect(7, -10, 3, 2);
  ctx.fillRect(7, 5, 3, 2);

  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-2, -4, 10, 8, 4);
  else ctx.rect(-2, -4, 10, 8);
  ctx.fill();

  ctx.strokeStyle = "rgba(200,200,200,0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(2, 0, 5, Math.PI, 0);
  ctx.stroke();

  ctx.fillStyle = livery.helmet;
  ctx.beginPath();
  ctx.arc(1, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(0,180,255,0.7)";
  ctx.beginPath();
  ctx.arc(2, 0, 2, -0.8, 0.8);
  ctx.fill();

  ctx.fillStyle = livery.number;
  ctx.font = "bold 6px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(car.id === 0 ? "P1" : String(car.id), 7, 0);
  ctx.restore();
}

function renderPlayerTag(ctx, car, label) {
  ctx.save();
  ctx.translate(car.x, car.y - 30);
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const textWidth = ctx.measureText(label).width;
  const bubbleWidth = textWidth + 16;
  const bubbleHeight = 18;
  ctx.fillStyle = "rgba(8, 14, 20, 0.92)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = 1;
  ctx.shadowBlur = 16;
  ctx.shadowColor = "rgba(79, 214, 255, 0.34)";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth, bubbleHeight, 999);
  else ctx.rect(-bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth, bubbleHeight);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#bdf4ff";
  ctx.fillText(label, 0, 0);
  ctx.restore();
}

function renderMinimap(ctx, track, cars, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(4,4,12,0.92)";
  ctx.fillRect(0, 0, width, height);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const sample of track.samples) {
    minX = Math.min(minX, sample.x);
    maxX = Math.max(maxX, sample.x);
    minY = Math.min(minY, sample.y);
    maxY = Math.max(maxY, sample.y);
  }

  const pad = 7;
  const scale = Math.min((width - pad * 2) / (maxX - minX || 1), (height - pad * 2) / (maxY - minY || 1));
  const offsetX = pad + ((width - pad * 2) - (maxX - minX) * scale) / 2 - minX * scale;
  const offsetY = pad + ((height - pad * 2) - (maxY - minY) * scale) / 2 - minY * scale;

  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i <= track.samples.length; i += 1) {
    const sample = track.samples[i % track.samples.length];
    const drawX = sample.x * scale + offsetX;
    const drawY = sample.y * scale + offsetY;
    if (i === 0) ctx.moveTo(drawX, drawY);
    else ctx.lineTo(drawX, drawY);
  }
  ctx.stroke();

  for (const car of cars) {
    ctx.save();
    ctx.shadowBlur = car.isPlayer ? 8 : 0;
    ctx.shadowColor = car.color;
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.arc(car.x * scale + offsetX, car.y * scale + offsetY, car.isPlayer ? 3.5 : 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function TrackPreviewCanvas({ track, active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pixelRatio = window.devicePixelRatio || 1;
    const width = (canvas.offsetWidth || 120) * pixelRatio;
    const height = (canvas.offsetHeight || 90) * pixelRatio;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    const env = ENVIRONMENTS[track.envId];
    ctx.fillStyle = env.bgColor;
    ctx.fillRect(0, 0, width, height);

    const xs = track.raw.map((point) => point[0]);
    const ys = track.raw.map((point) => point[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const scale = Math.min((width * 0.74) / spanX, (height * 0.64) / spanY);
    const offsetX = width / 2 - ((minX + maxX) / 2) * scale;
    const offsetY = height / 2 - ((minY + maxY) / 2) * scale;

    ctx.shadowBlur = 8;
    ctx.shadowColor = env.borderColor;
    ctx.strokeStyle = active ? env.borderColor : "rgba(255,255,255,0.30)";
    ctx.lineWidth = 2.6;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let index = 0; index <= track.raw.length; index += 1) {
      const point = track.raw[index % track.raw.length];
      const drawX = point[0] * scale + offsetX;
      const drawY = point[1] * scale + offsetY;
      if (index === 0) ctx.moveTo(drawX, drawY);
      else ctx.lineTo(drawX, drawY);
    }
    ctx.closePath();
    ctx.stroke();
  }, [track, active]);

  return <canvas ref={canvasRef} className="r2p__trackPreview" />;
}

export default function RaceGame2DPro() {
  const lang = navigator.language?.startsWith("es") ? "es" : "en";

  const t = useMemo(() => ({
    es: {
      title: "Race 2D Pro",
      subtitle: "10 circuitos | Trazados grandes | Parrilla escalonada | 5 luces",
      selectTrack: "Circuito",
      selectDifficulty: "Dificultad IA",
      selectWeather: "Clima",
      easy: "Facil",
      medium: "Medio",
      hard: "Dificil",
      laps: "Vueltas",
      rivals: "Rivales",
      startRace: "Lanzar carrera",
      raceOver: "Carrera terminada",
      restart: "Reiniciar",
      backToSetup: "Volver al setup",
      posLabel: "POS",
      lapLabel: "VUELTA",
      speedUnit: "km/h",
      you: "Tu",
      rival: "Rival",
      keyHint: "UP/DOWN acelerar-frenar | LEFT/RIGHT girar | R reinicia",
      standingStart: "Salida detenida",
      fiveLights: "5 luces rojas",
      staggeredGrid: "Parrilla escalonada",
      gridReady: "Parrilla formada",
      gridDetail: "Completada la vuelta de formacion. Mantente preparado para la secuencia.",
      watchLights: "Observa las luces",
      watchLightsDetail: "Cada luz roja se enciende de forma secuencial. No muevas el coche hasta el apagado.",
      lightsOut: "GO!",
      lightsOutDetail: "Luces fuera. Gestiona la traccion y busca la referencia de frenada de T1.",
      finishMessage: "Bandera a cuadros. Clasificacion final confirmada.",
      finishBanner: "BANDERA A CUADROS",
      finishBannerDetail: "Cruce confirmado. Mantente en la recta mientras cerramos la clasificacion.",
      trackLimits: "Fuera de pista: el agarre cae, la frenada se alarga y el coche pierde velocidad.",
      balanceCaution: "El coche esta deslizando. Suelta direccion y recupera apoyo antes de volver a acelerar.",
      distanceLabel: "Longitud",
      turnsLabel: "Curvas",
      overtakingLabel: "Adelantamiento",
      profileLabel: "Perfil",
      promoLine: "Te gusta la F1? Visita overcutf1.com",
    },
    en: {
      title: "Race 2D Pro",
      subtitle: "10 circuits | Larger layouts | Staggered grid | 5 lights",
      selectTrack: "Circuit",
      selectDifficulty: "AI difficulty",
      selectWeather: "Weather",
      easy: "Easy",
      medium: "Medium",
      hard: "Hard",
      laps: "Laps",
      rivals: "Rivals",
      startRace: "Launch race",
      raceOver: "Race over",
      restart: "Restart",
      backToSetup: "Back to setup",
      posLabel: "POS",
      lapLabel: "LAP",
      speedUnit: "km/h",
      you: "You",
      rival: "Rival",
      keyHint: "UP/DOWN throttle-brake | LEFT/RIGHT steer | R restart",
      standingStart: "Standing start",
      fiveLights: "5 red lights",
      staggeredGrid: "Staggered grid",
      gridReady: "Grid formed",
      gridDetail: "Formation lap complete. Stay ready for the light sequence.",
      watchLights: "Watch the lights",
      watchLightsDetail: "Each red light illuminates in sequence. Do not release the car before lights out.",
      lightsOut: "GO!",
      lightsOutDetail: "Lights out. Manage traction and commit to the first braking point.",
      finishMessage: "Chequered flag. Final classification confirmed.",
      finishBanner: "CHEQUERED FLAG",
      finishBannerDetail: "Finish confirmed. Hold the straight while we lock the final classification.",
      trackLimits: "Off track: grip drops, braking distances grow, and the car sheds speed.",
      balanceCaution: "The car is sliding. Open the steering and let the platform settle before reapplying throttle.",
      distanceLabel: "Distance",
      turnsLabel: "Turns",
      overtakingLabel: "Overtaking",
      profileLabel: "Profile",
      promoLine: "Like F1? Visit overcutf1.com",
    },
  })[lang], [lang]);

  const [screen, setScreen] = useState("setup");
  const [selectedTrackId, setSelectedTrackId] = useState(RACE2DPRO_CIRCUITS[0].id);
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const weatherKey = FIXED_WEATHER_KEY;
  const [laps, setLaps] = useState(3);
  const [rivals, setRivals] = useState(5);
  const [joyKnob, setJoyKnob] = useState({ dx: 0, dy: 0 });
  const [viewModel, setViewModel] = useState(
    buildSetupViewModel(RACE2DPRO_CIRCUITS[0], "medium", "dry", 3, 5, lang, t)
  );
  const isTouchControlProfile = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }
    const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
    return coarsePointer || (navigator.maxTouchPoints ?? 0) > 0;
  }, []);

  const canvasRef = useRef(null);
  const minimapRef = useRef(null);
  const rafRef = useRef(null);
  const lastRef = useRef(performance.now());
  const gameRef = useRef(null);
  const keysRef = useRef(new Set());
  const inputRef = useRef({ throttle: 0, brake: 0, steer: 0, touchThrottle: false, touchBrake: false });
  const joyRef = useRef({ active: false, pointerId: null, cx: 0, cy: 0, dx: 0, dy: 0 });
  const frameCountRef = useRef(0);
  const pendingStartRef = useRef(false);
  const drawFrameRef = useRef(() => undefined);
  const stepFrameRef = useRef(() => ({ importantChange: false }));
  const screenRef = useRef(screen);

  const selectedTrack = RACE2DPRO_CIRCUITS.find((track) => track.id === selectedTrackId) || RACE2DPRO_CIRCUITS[0];

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    if (screen === "setup") {
      setViewModel(buildSetupViewModel(selectedTrack, aiDifficulty, weatherKey, laps, rivals, lang, t));
    }
  }, [screen, selectedTrack, aiDifficulty, weatherKey, laps, rivals, lang, t]);

  const syncRaceViewModel = useCallback((screenName = "race") => {
    if (!gameRef.current) return;
    setViewModel(buildRaceViewModel(screenName, gameRef.current, weatherKey, aiDifficulty, lang, t));
  }, [weatherKey, aiDifficulty, lang, t]);

  const initializeRace = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    const pixelRatio = window.devicePixelRatio || 1;
    const width = (canvas.clientWidth || 800) * pixelRatio;
    const height = (canvas.clientHeight || 600) * pixelRatio;
    canvas.width = width;
    canvas.height = height;

    const track = buildTrack(selectedTrack, width, height);
    const env = ENVIRONMENTS[selectedTrack.envId];
    const weather = WEATHER_PROFILES[weatherKey];
    const seedBase = (selectedTrack.id + 1) * 101 + laps * 17 + rivals * 13 + ({ easy: 5, medium: 11, hard: 19 }[aiDifficulty] || 5);
    const cars = [];
    for (let i = 0; i < rivals + 1; i += 1) {
      cars.push(createCar(i, i === 0, aiDifficulty, seedBase, isTouchControlProfile));
    }
    const playerCar = cars.find((car) => car.isPlayer);
    if (playerCar) {
      playerCar.touchAssist = isTouchControlProfile;
    }
    const playerGridIndex = Math.floor(Math.random() * cars.length);
    placeCarsOnGrid(cars, track, selectedTrack, playerGridIndex);

    const startPoint = sampleTrackAt(track, track.startS);
    gameRef.current = {
      cars,
      playerGridIndex,
      track,
      trackDef: selectedTrack,
      env,
      weather,
      weatherKey,
      totalLaps: laps,
      finishOrder: [],
      time: 0,
      clockMs: 0,
      raceElapsed: 0,
      _raceStartTime: null,
      _endTriggered: false,
      endCountdown: 0,
      pendingLeaderboard: null,
      finishPresentation: null,
      camera: { x: startPoint.x, y: startPoint.y, zoom: isTouchControlProfile ? 1.12 : 1, shakeX: 0, shakeY: 0 },
      startProcedure: createStartProcedure(selectedTrack.id, laps, rivals, aiDifficulty),
    };

    keysRef.current.clear();
    inputRef.current = { throttle: 0, brake: 0, steer: 0, touchThrottle: false, touchBrake: false };
    joyRef.current = { active: false, pointerId: null, cx: 0, cy: 0, dx: 0, dy: 0 };
    frameCountRef.current = 0;
    setJoyKnob({ dx: 0, dy: 0 });
    setViewModel(buildRaceViewModel("race", gameRef.current, weatherKey, aiDifficulty, lang, t));
    return true;
  }, [selectedTrack, weatherKey, laps, rivals, aiDifficulty, lang, t, isTouchControlProfile]);

  const startRace = useCallback(() => {
    setScreen("race");
    pendingStartRef.current = !initializeRace();
  }, [initializeRace]);

  useEffect(() => {
    if (screen !== "race" || !pendingStartRef.current) return;
    if (initializeRace()) pendingStartRef.current = false;
  }, [screen, initializeRace]);

  const onJoyStart = useCallback((event) => {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some embedded mobile browsers reject pointer capture; continue with local tracking.
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    joyRef.current = { active: true, pointerId: event.pointerId, cx, cy, dx: 0, dy: 0 };
  }, []);

  const onJoyMove = useCallback((event) => {
    event.preventDefault();
    const joy = joyRef.current;
    if (!joy.active || event.pointerId !== joy.pointerId) return;
    const rawDx = event.clientX - joy.cx;
    const rawDy = event.clientY - joy.cy;
    const distance = Math.hypot(rawDx, rawDy);
    const factor = distance > JOYSTICK_MAX_RADIUS ? JOYSTICK_MAX_RADIUS / distance : 1;
    const dx = rawDx * factor;
    const dy = rawDy * factor;
    joyRef.current.dx = dx;
    joyRef.current.dy = dy;
    setJoyKnob({ dx, dy });
  }, []);

  const onJoyEnd = useCallback((event) => {
    event.preventDefault();
    if (event.pointerId !== joyRef.current.pointerId) return;
    try {
      if (event.currentTarget?.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Ignore pointer capture release failures.
    }
    joyRef.current = { active: false, pointerId: null, cx: 0, cy: 0, dx: 0, dy: 0 };
    setJoyKnob({ dx: 0, dy: 0 });
  }, []);

  const onTouchThrottle = useCallback((event, value) => {
    event.preventDefault();
    inputRef.current.touchThrottle = value;
  }, []);

  const onTouchBrake = useCallback((event, value) => {
    event.preventDefault();
    inputRef.current.touchBrake = value;
  }, []);

  useEffect(() => {
    if (screen !== "race") return undefined;

    const canvas = canvasRef.current;
    const minimap = minimapRef.current;
    if (!canvas || !minimap) return undefined;

    const pixelRatio = window.devicePixelRatio || 1;
    const miniWidth = 92;
    const miniHeight = 72;
    minimap.width = miniWidth * pixelRatio;
    minimap.height = miniHeight * pixelRatio;
    const ctx = canvas.getContext("2d");
    const minimapCtx = minimap.getContext("2d");
    minimapCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const resize = () => {
      const width = canvas.clientWidth * pixelRatio;
      const height = canvas.clientHeight * pixelRatio;
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      const game = gameRef.current;
      if (!game) return;
      const rebuiltTrack = buildTrack(game.trackDef, width, height);
      game.track = rebuiltTrack;
      if (game.startProcedure.phase === "racing") {
        for (const car of game.cars) {
          const sample = sampleTrackAt(rebuiltTrack, car.s);
          const normalX = -Math.sin(sample.ang);
          const normalY = Math.cos(sample.ang);
          car.x = sample.x + normalX * (car.trackOffset || 0);
          car.y = sample.y + normalY * (car.trackOffset || 0);
          car.a = sample.ang;
        }
      } else {
        placeCarsOnGrid(game.cars, rebuiltTrack, game.trackDef, game.playerGridIndex ?? 0);
      }
      syncRaceViewModel("race");
    };

    const onKeyDown = (event) => {
      keysRef.current.add(event.code);
      if (event.code === "KeyR") startRace();
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Numpad8", "Numpad2", "Numpad4", "Numpad6"].includes(event.code)) {
        event.preventDefault();
      }
    };

    const onKeyUp = (event) => {
      keysRef.current.delete(event.code);
    };

    const drawFrame = () => {
      const game = gameRef.current;
      if (!game) return;

      const width = canvas.width;
      const height = canvas.height;
      renderBackground(ctx, width, height, game.env, game.weather, game.time);

      const playerCar = game.cars.find((car) => car.isPlayer);
      if (playerCar) {
        if (playerCar.collided) {
          game.camera.shakeX += (Math.random() - 0.5) * PHYS.COLLISION_CAMERA_SHAKE;
          game.camera.shakeY += (Math.random() - 0.5) * PHYS.COLLISION_CAMERA_SHAKE;
        }
        updateFollowCamera(game.camera, playerCar, STEP_MS / 1000, playerCar.touchAssist);
      }

      applyCameraTransform(ctx, game.camera, width, height);
      renderTrack(ctx, game.track, game.env);
      renderDecorations(ctx, game.track, game.env);
      renderStartingBoxes(ctx, game.cars, game.startProcedure.phase, game.startProcedure.elapsed, game.env);
      for (const car of game.cars) {
        if (!car.isPlayer) renderCar(ctx, car, false);
      }
      if (playerCar) {
        renderCar(ctx, playerCar, true);
        renderPlayerTag(ctx, playerCar, "YOU");
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      renderMinimap(minimapCtx, game.track, game.cars, miniWidth, miniHeight);
    };

    const stepFrame = (dt) => {
      const game = gameRef.current;
      if (!game) return { importantChange: false };
      const playerInput = getPlayerInput(keysRef.current, joyRef.current, inputRef.current);
      const result = stepRaceState(game, dt, playerInput, t);
      if (result.requestScreen === "end") {
        setViewModel(buildRaceViewModel("end", game, weatherKey, aiDifficulty, lang, t));
        setScreen("end");
        return result;
      }
      frameCountRef.current += 1;
      if (result.importantChange || frameCountRef.current % 5 === 0) {
        syncRaceViewModel("race");
      }
      return result;
    };

    drawFrameRef.current = drawFrame;
    stepFrameRef.current = stepFrame;

    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    lastRef.current = performance.now();

    const loop = (now) => {
      rafRef.current = requestAnimationFrame(loop);
      const delta = Math.min((now - lastRef.current) / 1000, 0.033);
      lastRef.current = now;
      const result = stepFrame(delta);
      if (result.requestScreen !== "end") drawFrame();
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      drawFrameRef.current = () => undefined;
      stepFrameRef.current = () => ({ importantChange: false });
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [screen, aiDifficulty, weatherKey, lang, t, startRace, syncRaceViewModel]);

  const advanceTime = useCallback((milliseconds) => {
    if (screenRef.current !== "race" || !gameRef.current) return undefined;
    const loops = Math.max(1, Math.round(milliseconds / STEP_MS));
    for (let index = 0; index < loops; index += 1) {
      const result = stepFrameRef.current(STEP_MS / 1000);
      if (result.requestScreen === "end") break;
    }
    drawFrameRef.current();
    if (screenRef.current === "race" && gameRef.current) {
      setViewModel(buildRaceViewModel("race", gameRef.current, weatherKey, aiDifficulty, lang, t));
    }
    return undefined;
  }, [weatherKey, aiDifficulty, lang, t]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const debugApi = {
      forcePlayerFinish: () => {
        const game = gameRef.current;
        if (!game) return false;
        const playerCar = game.cars.find((car) => car.isPlayer);
        if (!playerCar) return false;
        const targetS = wrap01(game.track.startS - 0.0015);
        const sample = sampleTrackAt(game.track, targetS);
        const normalX = -Math.sin(sample.ang);
        const normalY = Math.cos(sample.ang);
        const usableHalfWidth = getTrackUsableHalfWidth(game.track) * 0.5;
        const lateralOffset = clamp(playerCar.trackOffset, -usableHalfWidth, usableHalfWidth);
        playerCar.lap = game.totalLaps;
        playerCar.s = targetS;
        playerCar.a = sample.ang;
        playerCar.x = sample.x + normalX * lateralOffset;
        playerCar.y = sample.y + normalY * lateralOffset;
        playerCar.vx = Math.cos(sample.ang) * 160;
        playerCar.vy = Math.sin(sample.ang) * 160;
        playerCar.speed = 160;
        playerCar.trackOffset = lateralOffset;
        playerCar.finished = false;
        playerCar.finishOrder = null;
        playerCar.finishCoastSpeed = 0;
        return true;
      },
    };
    window.__race2dproDebug = debugApi;
    return () => {
      if (window.__race2dproDebug === debugApi) {
        delete window.__race2dproDebug;
      }
    };
  }, []);

  useGameRuntimeBridge(viewModel, useCallback((snapshot) => snapshot, []), advanceTime);

  if (screen === "setup") {
    return (
      <div className="r2p">
        <div className="r2p__setup">
          <div className="r2p__setupCard">
            <div className="r2p__setupHeader">
              <div>
                <div className="r2p__setupTitle">GRID | {t.title}</div>
                <div className="r2p__setupSub">{t.subtitle}</div>
              </div>
            </div>
            <div className="r2p__setupDivider" />

            <div className="r2p__setupMain">
              <div className="r2p__setupPanel r2p__setupPanelTracks">
                <div className="r2p__sectionLabel">{t.selectTrack}</div>
                <div className="r2p__trackGrid">
              {RACE2DPRO_CIRCUITS.map((track) => (
                <div
                  key={track.id}
                  className={`r2p__trackCard${selectedTrackId === track.id ? " isActive" : ""}`}
                  onClick={() => setSelectedTrackId(track.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedTrackId(track.id);
                    }
                  }}
                >
                  <TrackPreviewCanvas track={track} active={selectedTrackId === track.id} />
                  <div className="r2p__trackName">{track.name[lang]}</div>
                  <div className="r2p__trackEnv">{ENVIRONMENTS[track.envId].name[lang]} · {track.classification[lang]}</div>
                  <div className="r2p__trackMeta">{track.distanceKm} · {track.turns} {t.turnsLabel.toLowerCase()}</div>
                  <div className="r2p__trackLayout">{track.profile[lang]}</div>
                </div>
              ))}
                </div>
              </div>

              <div className="r2p__setupPanel r2p__setupPanelConfig">
                <div className="r2p__selectedTrack">
              <div className="r2p__selectedTrackTitle">{viewModel.track.name}</div>
              <div className="r2p__selectedTrackFacts">
                <span>{t.distanceLabel}: {viewModel.track.distanceKm}</span>
                <span>{t.turnsLabel}: {viewModel.track.turns}</span>
                <span>{t.overtakingLabel}: {viewModel.track.overtaking}</span>
                <span>{t.profileLabel}: {viewModel.track.profile}</span>
              </div>
              <div className="r2p__trackNote">{viewModel.track.note}</div>
              <div className="r2p__formatRow">
                <span className="r2p__formatChip">{t.standingStart}</span>
                <span className="r2p__formatChip">{t.fiveLights}</span>
                <span className="r2p__formatChip">{t.staggeredGrid}</span>
                <span className="r2p__formatChip">{WEATHER_PROFILES[FIXED_WEATHER_KEY].icon} {WEATHER_PROFILES[FIXED_WEATHER_KEY].label[lang]}</span>
              </div>
            </div>

            <div className="r2p__optionsRow">
              <div className="r2p__optBlock">
                <div className="r2p__sectionLabel">{t.selectDifficulty}</div>
                <div className="r2p__choiceGroup">
                  {["easy", "medium", "hard"].map((difficulty) => (
                    <button
                      key={difficulty}
                      type="button"
                      className={`r2p__choiceBtn diff-${difficulty}${aiDifficulty === difficulty ? " isActive" : ""}`}
                      onClick={() => setAiDifficulty(difficulty)}
                    >
                      {t[difficulty]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="r2p__optBlock">
                <div className="r2p__sectionLabel">{t.laps}</div>
                <div className="r2p__choiceGroup">
                  {[3, 5, 7].map((count) => (
                    <button
                      key={count}
                      type="button"
                      className={`r2p__choiceBtn${laps === count ? " isActive" : ""}`}
                      onClick={() => setLaps(count)}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <div className="r2p__optBlock r2p__optBlockWide">
                <div className="r2p__sectionLabel">{t.rivals}</div>
                <div className="r2p__choiceGroup">
                  {[3, 5, 7].map((count) => (
                    <button
                      key={count}
                      type="button"
                      className={`r2p__choiceBtn${rivals === count ? " isActive" : ""}`}
                      onClick={() => setRivals(count)}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button id="start-btn" className="r2p__startBtn" type="button" onClick={startRace}>
              {t.startRace}
            </button>
          </div>
        </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "end") {
    return (
      <div className="r2p">
        <div className="r2p__endOverlay">
          <div className="r2p__endCard">
            <div className="r2p__endTitle">FINISH | {t.raceOver}</div>
            <table className="r2p__endTable">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{lang === "es" ? "Piloto" : "Driver"}</th>
                  <th>{lang === "es" ? "Tiempo" : "Time"}</th>
                </tr>
              </thead>
              <tbody>
                {viewModel.leaderboard.map((row) => (
                  <tr key={row.pos} className={row.isPlayer ? "isPlayer" : ""}>
                    <td>
                      <span className="r2p__endPosIcon">
                        {row.pos === 1 ? "1ST" : row.pos === 2 ? "2ND" : row.pos === 3 ? "3RD" : row.pos}
                      </span>
                    </td>
                    <td>
                      <span
                        className="r2p__endColorDot"
                        style={{ background: row.color, boxShadow: `0 0 5px ${row.color}` }}
                      />
                      {row.driver}
                    </td>
                    <td style={{ fontVariantNumeric: "tabular-nums" }}>{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="r2p__endBtns">
              <button className="r2p__endBtnPrimary" type="button" onClick={startRace}>
                {t.restart}
              </button>
              <button className="r2p__endBtnSecondary" type="button" onClick={() => setScreen("setup")}>
                {t.backToSetup}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="r2p">
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />

      <div className="r2p__hud">
        <div className="r2p__hudPanel">
          <div className="r2p__hudTrack">{viewModel.track.name}</div>
          <div className="r2p__hudPos">
            {viewModel.hud.position}
            <sub>/{viewModel.hud.total}</sub>
          </div>
          <div className="r2p__hudPosLabel">{t.posLabel}</div>
          <div className="r2p__hudLap">{t.lapLabel} {viewModel.hud.lap}/{viewModel.hud.totalLaps}</div>
          <div className="r2p__hudSpeed">{viewModel.hud.speed} {t.speedUnit}</div>
          <div className="r2p__hudTimer">{viewModel.hud.timer}</div>
          <div className="r2p__hudWeather">{viewModel.hud.weatherIcon}</div>
          <div className="r2p__hudMessage">{viewModel.hud.message}</div>
        </div>

        <div className="r2p__minimapWrap">
          <canvas ref={minimapRef} className="r2p__minimapCanvas" />
        </div>
      </div>

      {viewModel.startOverlay.phase !== "off" && (
        <div className="r2p__semaphore">
          <div className="r2p__semLights">
            {viewModel.startOverlay.lights.map((on, index) => (
              <div key={index} className={`r2p__semLight${on ? " isOn" : ""}`} />
            ))}
          </div>
          <div className={`r2p__semCaption${viewModel.startOverlay.phase === "go" ? " isGo" : ""}`}>
            {viewModel.startOverlay.caption}
          </div>
        </div>
      )}

      {viewModel.finishPresentation && (
        <div className="r2p__finishBanner">
          <div className="r2p__finishTitle">{viewModel.finishPresentation.title}</div>
          <div className="r2p__finishDetail">{viewModel.finishPresentation.detail}</div>
        </div>
      )}

      <div className="r2p__touch">
        <div
          className="r2p__joystick"
          onPointerDown={onJoyStart}
          onPointerMove={onJoyMove}
          onPointerUp={onJoyEnd}
          onPointerCancel={onJoyEnd}
          onLostPointerCapture={onJoyEnd}
          onContextMenu={(event) => event.preventDefault()}
        >
          <div
            className="r2p__joystickKnob"
            style={{ transform: `translate(calc(-50% + ${joyKnob.dx}px), calc(-50% + ${joyKnob.dy}px))` }}
          />
        </div>

        <div className="r2p__touchRight">
          <button
            className="r2p__touchBtn"
            type="button"
            onPointerDown={(event) => onTouchThrottle(event, true)}
            onPointerUp={(event) => onTouchThrottle(event, false)}
            onPointerCancel={(event) => onTouchThrottle(event, false)}
            onPointerLeave={(event) => onTouchThrottle(event, false)}
            onTouchStart={(event) => onTouchThrottle(event, true)}
            onTouchEnd={(event) => onTouchThrottle(event, false)}
            onTouchCancel={(event) => onTouchThrottle(event, false)}
            onMouseDown={(event) => event.preventDefault()}
            onContextMenu={(event) => event.preventDefault()}
          >
            UP
          </button>
          <button
            className="r2p__touchBtn"
            type="button"
            onPointerDown={(event) => onTouchBrake(event, true)}
            onPointerUp={(event) => onTouchBrake(event, false)}
            onPointerCancel={(event) => onTouchBrake(event, false)}
            onPointerLeave={(event) => onTouchBrake(event, false)}
            onTouchStart={(event) => onTouchBrake(event, true)}
            onTouchEnd={(event) => onTouchBrake(event, false)}
            onTouchCancel={(event) => onTouchBrake(event, false)}
            onMouseDown={(event) => event.preventDefault()}
            onContextMenu={(event) => event.preventDefault()}
          >
            DOWN
          </button>
        </div>
      </div>

      <div className="r2p__keyHint">{t.keyHint}</div>
      <div className="r2p__promo" aria-hidden="true">{t.promoLine}</div>
    </div>
  );
}
