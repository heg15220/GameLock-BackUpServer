import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import "./styles.css";

const WIDTH = 960;
const HEIGHT = 540;
const ROAD_TOP = 54;
const ROAD_WIDTH = 368;
const ROAD_LEFT = (WIDTH - ROAD_WIDTH) / 2;
const ROAD_RIGHT = ROAD_LEFT + ROAD_WIDTH;
const LANE_COUNT = 4;
const PLAYER_BASE_Y = HEIGHT - 122;
const PLAYER_MIN_Y = HEIGHT - 176;
const PLAYER_MAX_Y = HEIGHT - 86;
const STEP_MS = 1000 / 60;
const MAX_INTEGRITY = 3;
const MAX_SHIELDS = 2;
const START_SEED = 0x51f15e;

const TRAFFIC_STYLES = [
  { body: "#2a303d", roof: "#d7dde8", accent: "#ef4444", glow: "#f98f9b" },
  { body: "#293245", roof: "#dce7f7", accent: "#38bdf8", glow: "#89d3ff" },
  { body: "#243238", roof: "#ddeee6", accent: "#22c55e", glow: "#80e3af" },
  { body: "#332f2a", roof: "#f1e6d7", accent: "#f59e0b", glow: "#f4c27e" },
  { body: "#2e2f39", roof: "#eceef4", accent: "#e5e7eb", glow: "#c7d2e7" },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const approach = (current, target, rate, dt) => lerp(current, target, clamp(rate * dt, 0, 1));
const round = (value, digits = 2) => Number(value.toFixed(digits));

const COPY = {
  es: {
    title: "Sunset Slipstream",
    subtitle: "Autopista arcade con fisica mas solida, near miss, escudo y focus.",
    eyebrow: "CARRERAS | TRAFFIC SURVIVAL",
    start: "Iniciar carrera",
    restart: "Reintentar",
    gameOver: "Sesion perdida",
    sessionLocked: "SESION TERMINADA",
    score: "Puntos",
    zone: "Zona",
    evaded: "Evadidos",
    integrity: "Casco",
    shield: "Escudos",
    focus: "Focus",
    speed: "Velocidad",
    laneLabel: "4 carriles",
    nearMissLabel: "near miss",
    shieldLabel: "escudo",
    focusLabel: "focus",
    nearMissMax: "Racha max",
    messageReady: "Mantente dentro del asfalto, lee trafico y busca huecos limpios.",
    messageStart: "Salida limpia. La autopista ya esta cargando densidad.",
    messageShield: "Escudo recogido. Tienes un impacto de margen.",
    messageCharge: "Carga recogida. El focus sube.",
    messageFocus: "Focus activo. El trafico entra en camara lenta.",
    messageCrash: "Impacto. Se pierde integridad.",
    messageBlocked: "Escudo consumido. Sigues vivo.",
    messageNearMiss: "Near miss. Bonificacion limpia.",
    messageZone: (zone) => `Zona ${zone}. Mas velocidad y menos margen.`,
    controls: "Izq/der maniobran, arriba acelera, abajo enfria el ritmo, espacio activa focus y R reinicia.",
    objective: "Sobrevive, esquiva trafico y encadena near miss para disparar la puntuacion.",
    scoreSuffix: "pts",
    speedSuffix: "km/h",
  },
  en: {
    title: "Sunset Slipstream",
    subtitle: "Arcade highway survival with stronger handling, shields, and focus.",
    eyebrow: "RACING | TRAFFIC SURVIVAL",
    start: "Start run",
    restart: "Restart",
    gameOver: "Run over",
    sessionLocked: "SESSION ENDED",
    score: "Score",
    zone: "Zone",
    evaded: "Evaded",
    integrity: "Hull",
    shield: "Shields",
    focus: "Focus",
    speed: "Speed",
    laneLabel: "4 lanes",
    nearMissLabel: "near miss",
    shieldLabel: "shield",
    focusLabel: "focus",
    nearMissMax: "Best streak",
    messageReady: "Stay inside the tarmac, read traffic, and find clean gaps.",
    messageStart: "Clean launch. Highway density is already building up.",
    messageShield: "Shield collected. You have one crash buffer.",
    messageCharge: "Charge collected. Focus meter rises.",
    messageFocus: "Focus engaged. Traffic slips into slow motion.",
    messageCrash: "Impact. Integrity lost.",
    messageBlocked: "Shield spent. The run stays alive.",
    messageNearMiss: "Near miss. Clean bonus.",
    messageZone: (zone) => `Zone ${zone}. More speed and less margin.`,
    controls: "Left/right steers, up accelerates, down cools the pace, space triggers focus, and R restarts.",
    objective: "Survive, dodge traffic, and chain near misses to spike the score.",
    scoreSuffix: "pts",
    speedSuffix: "km/h",
  },
};

function laneSize() {
  return ROAD_WIDTH / LANE_COUNT;
}

function laneCenter(index) {
  return ROAD_LEFT + laneSize() * index + laneSize() * 0.5;
}

function nearestLaneIndex(x) {
  return clamp(Math.round((x - ROAD_LEFT) / laneSize() - 0.5), 0, LANE_COUNT - 1);
}

function roundRectPath(ctx, x, y, width, height, radius) {
  const maxRadius = Math.min(radius, width / 2, height / 2);
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, maxRadius);
    return;
  }

  ctx.moveTo(x + maxRadius, y);
  ctx.lineTo(x + width - maxRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + maxRadius);
  ctx.lineTo(x + width, y + height - maxRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - maxRadius, y + height);
  ctx.lineTo(x + maxRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - maxRadius);
  ctx.lineTo(x, y + maxRadius);
  ctx.quadraticCurveTo(x, y, x + maxRadius, y);
}

function parseColor(color) {
  if (typeof color !== "string") {
    return { r: 255, g: 255, b: 255 };
  }

  const trimmed = color.trim();
  if (/^#([0-9a-f]{3}){1,2}$/i.test(trimmed)) {
    const raw = trimmed.slice(1);
    const hex =
      raw.length === 3
        ? raw
            .split("")
            .map((value) => value + value)
            .join("")
        : raw;

    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  const channels = trimmed.match(/^rgba?\(([^)]+)\)$/i)?.[1]?.split(",") ?? [];
  if (channels.length >= 3) {
    return {
      r: clamp(Number.parseFloat(channels[0]), 0, 255),
      g: clamp(Number.parseFloat(channels[1]), 0, 255),
      b: clamp(Number.parseFloat(channels[2]), 0, 255),
    };
  }

  return { r: 255, g: 255, b: 255 };
}

function mixColor(colorA, colorB, amount) {
  const ratio = clamp(amount, 0, 1);
  const from = parseColor(colorA);
  const to = parseColor(colorB);
  const r = Math.round(lerp(from.r, to.r, ratio));
  const g = Math.round(lerp(from.g, to.g, ratio));
  const b = Math.round(lerp(from.b, to.b, ratio));
  return `rgb(${r}, ${g}, ${b})`;
}

function withAlpha(color, alpha) {
  const { r, g, b } = parseColor(color);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

function nextRandom(game) {
  game.rng = (game.rng * 1664525 + 1013904223) >>> 0;
  return game.rng / 4294967296;
}

function chooseOpenLane(game) {
  let candidate = Math.floor(nextRandom(game) * LANE_COUNT);
  for (let tries = 0; tries < LANE_COUNT; tries += 1) {
    const clear = game.entities.every(
      (entity) => entity.lane !== candidate || entity.y > 136
    );
    if (clear) return candidate;
    candidate = (candidate + 1) % LANE_COUNT;
  }
  return candidate;
}

function createTrafficCar(game) {
  const lane = chooseOpenLane(game);
  const style = TRAFFIC_STYLES[Math.floor(nextRandom(game) * TRAFFIC_STYLES.length)];

  return {
    id: `traffic-${game.nextId++}`,
    kind: "traffic",
    lane,
    baseX: laneCenter(lane),
    x: laneCenter(lane),
    y: -120 - nextRandom(game) * 140,
    width: 44,
    height: 86,
    speedMul: 0.78 + nextRandom(game) * 0.28 + (game.zone - 1) * 0.02,
    swayAmp: 3 + nextRandom(game) * 8,
    swaySpeed: 0.9 + nextRandom(game) * 1.4,
    swayPhase: nextRandom(game) * Math.PI * 2,
    body: style.body,
    roof: style.roof,
    accent: style.accent,
    glow: style.glow,
    nearMissAwarded: false,
    passed: false,
  };
}

function createPickup(game) {
  const lane = Math.floor(nextRandom(game) * LANE_COUNT);
  const kind = nextRandom(game) > 0.54 ? "shield" : "charge";

  return {
    id: `pickup-${game.nextId++}`,
    kind,
    lane,
    baseX: laneCenter(lane),
    x: laneCenter(lane),
    y: -88,
    size: 28,
    bobPhase: nextRandom(game) * Math.PI * 2,
  };
}

function getSpawnInterval(game) {
  return clamp(820 - game.evaded * 12 - (game.zone - 1) * 36, 260, 820);
}

function createGameState(copy, seedOffset = 0) {
  return {
    mode: "menu",
    seed: START_SEED + seedOffset * 97,
    rng: START_SEED + seedOffset * 97,
    nextId: 1,
    time: 0,
    distance: 0,
    spawnTimer: 820,
    player: {
      x: laneCenter(1),
      y: PLAYER_BASE_Y,
      vx: 0,
      vy: 0,
      width: 48,
      height: 94,
      worldSpeed: 316,
      targetSpeed: 316,
      drift: 0,
    },
    focusMeter: 18,
    focusTimer: 0,
    focusLatch: false,
    integrity: MAX_INTEGRITY,
    shields: 1,
    score: 0,
    evaded: 0,
    nearMisses: 0,
    streak: 0,
    bestStreak: 0,
    zone: 1,
    entities: [],
    flash: 0,
    shake: 0,
    resultScore: 0,
    resultEvaded: 0,
    message: copy.messageReady,
    messageTone: "neutral",
  };
}

function setMessage(game, text, tone = "neutral") {
  game.message = text;
  game.messageTone = tone;
}

function buildViewModel(screen, game) {
  return {
    mode: "sunset-slipstream",
    coordinates: "origin_top_left_x_right_y_down",
    screen,
    phase: screen === "menu" ? "setup" : screen === "gameover" ? "gameover" : "playing",
    player: {
      x: round(game.player.x, 1),
      y: round(game.player.y, 1),
      vx: round(game.player.vx, 2),
      vy: round(game.player.vy, 2),
      speed: round(game.player.worldSpeed, 1),
      laneApprox: nearestLaneIndex(game.player.x),
      integrity: game.integrity,
      shields: game.shields,
      focusMeter: round(game.focusMeter, 1),
      focusTimer: round(game.focusTimer, 2),
    },
    hud: {
      score: Math.round(game.score),
      zone: game.zone,
      evaded: game.evaded,
      nearMisses: game.nearMisses,
      message: game.message,
    },
    traffic: game.entities
      .filter((entity) => entity.kind === "traffic" && entity.y < HEIGHT + 120)
      .map((entity) => ({
        id: entity.id,
        lane: entity.lane,
        x: round(entity.x, 1),
        y: round(entity.y, 1),
        width: entity.width,
        height: entity.height,
      })),
    pickups: game.entities
      .filter((entity) => entity.kind !== "traffic" && entity.y < HEIGHT + 100)
      .map((entity) => ({
        id: entity.id,
        lane: entity.lane,
        kind: entity.kind,
        x: round(entity.x, 1),
        y: round(entity.y, 1),
      })),
  };
}

function SunsetSlipstream() {
  const lang = navigator.language?.startsWith("es") ? "es" : "en";
  const copy = useMemo(() => COPY[lang], [lang]);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const lastRef = useRef(0);
  const lastHudRef = useRef(0);
  const keysRef = useRef(new Set());
  const gameRef = useRef(createGameState(copy));
  const frameRef = useRef({ draw: () => undefined, step: () => undefined });
  const seedRunRef = useRef(0);
  const [screen, setScreen] = useState("menu");
  const [viewModel, setViewModel] = useState(buildViewModel("menu", gameRef.current));

  const syncViewModel = useCallback((nextScreen = screen) => {
    setViewModel(buildViewModel(nextScreen, gameRef.current));
  }, [screen]);

  const startRun = useCallback(() => {
    seedRunRef.current += 1;
    const next = createGameState(copy, seedRunRef.current);
    next.mode = "playing";
    setMessage(next, copy.messageStart, "accent");
    gameRef.current = next;
    setScreen("playing");
    setViewModel(buildViewModel("playing", next));
  }, [copy]);

  const restartRun = useCallback(() => {
    startRun();
  }, [startRun]);

  const setVirtualKey = useCallback((code, pressed) => {
    if (!code) {
      return;
    }
    if (pressed) {
      keysRef.current.add(code);
    } else {
      keysRef.current.delete(code);
    }
  }, []);

  const bindHoldControl = useCallback(
    (code) => ({
      onPointerDown: (event) => {
        event.preventDefault();
        setVirtualKey(code, true);
      },
      onPointerUp: () => setVirtualKey(code, false),
      onPointerLeave: () => setVirtualKey(code, false),
      onPointerCancel: () => setVirtualKey(code, false),
    }),
    [setVirtualKey]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const resize = () => {
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = WIDTH * pixelRatio;
      canvas.height = HEIGHT * pixelRatio;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const drawCar = ({
      x,
      y,
      width,
      height,
      body,
      roof,
      accent = "#e2e8f0",
      glow,
      tilt = 0,
      label = "",
      shield = false,
      isPlayer = false,
    }) => {
      const bodyLight = mixColor(body, "#ffffff", isPlayer ? 0.34 : 0.24);
      const bodyMid = mixColor(body, "#1e293b", 0.22);
      const bodyDark = mixColor(body, "#020617", 0.52);
      const bodyDeep = mixColor(body, "#020617", 0.7);
      const glassTop = mixColor(roof, "#ecfeff", 0.48);
      const glassBase = mixColor(roof, "#0f172a", 0.38);
      const chrome = mixColor(roof, "#ffffff", 0.28);
      const accentSoft = mixColor(accent, "#ffffff", 0.18);
      const accentShadow = mixColor(accent, "#020617", 0.44);
      const headlightColor = isPlayer ? "#fff4c2" : "#fff1d6";
      const taillightColor = isPlayer ? "#ff5b77" : "#ff7c88";

      const traceBody = () => {
        ctx.beginPath();
        ctx.moveTo(0, -height * 0.55);
        ctx.bezierCurveTo(width * 0.24, -height * 0.55, width * 0.42, -height * 0.42, width * 0.47, -height * 0.15);
        ctx.lineTo(width * 0.45, height * 0.3);
        ctx.bezierCurveTo(width * 0.42, height * 0.5, width * 0.22, height * 0.6, 0, height * 0.6);
        ctx.bezierCurveTo(-width * 0.22, height * 0.6, -width * 0.42, height * 0.5, -width * 0.45, height * 0.3);
        ctx.lineTo(-width * 0.47, -height * 0.15);
        ctx.bezierCurveTo(-width * 0.42, -height * 0.42, -width * 0.24, -height * 0.55, 0, -height * 0.55);
        ctx.closePath();
      };

      const traceCockpit = () => {
        ctx.beginPath();
        ctx.moveTo(-width * 0.2, -height * 0.32);
        ctx.lineTo(width * 0.2, -height * 0.32);
        ctx.bezierCurveTo(width * 0.26, -height * 0.18, width * 0.24, height * 0.12, width * 0.14, height * 0.26);
        ctx.lineTo(-width * 0.14, height * 0.26);
        ctx.bezierCurveTo(-width * 0.24, height * 0.12, -width * 0.26, -height * 0.18, -width * 0.2, -height * 0.32);
        ctx.closePath();
      };

      const traceWindow = (topY, bottomY, topWidth, bottomWidth) => {
        ctx.beginPath();
        ctx.moveTo(-topWidth, topY);
        ctx.lineTo(topWidth, topY);
        ctx.lineTo(bottomWidth, bottomY);
        ctx.lineTo(-bottomWidth, bottomY);
        ctx.closePath();
      };

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt * 0.08);

      ctx.fillStyle = "rgba(2, 6, 15, 0.34)";
      ctx.beginPath();
      ctx.ellipse(0, height * 0.46, width * 0.72, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      const roadReflection = ctx.createLinearGradient(0, height * 0.12, 0, height * 0.56);
      roadReflection.addColorStop(0, "rgba(255, 255, 255, 0)");
      roadReflection.addColorStop(1, withAlpha(glow, 0.18));
      ctx.fillStyle = roadReflection;
      ctx.beginPath();
      ctx.ellipse(0, height * 0.45, width * 0.58, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      if (shield) {
        ctx.strokeStyle = "rgba(125, 211, 252, 0.72)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, 0, width * 0.84, height * 0.66, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "rgba(224, 242, 254, 0.42)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, width * 0.72, height * 0.56, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (const side of [-1, 1]) {
        for (const wheelY of [-height * 0.18, height * 0.22]) {
          ctx.fillStyle = "#02050c";
          ctx.beginPath();
          ctx.ellipse(side * width * 0.46, wheelY, width * 0.12, height * 0.11, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "rgba(148, 163, 184, 0.24)";
          ctx.beginPath();
          ctx.ellipse(side * width * 0.46, wheelY, width * 0.05, height * 0.045, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.shadowColor = glow;
      ctx.shadowBlur = isPlayer ? 24 : 16;
      const shellGradient = ctx.createLinearGradient(0, -height * 0.55, 0, height * 0.6);
      shellGradient.addColorStop(0, bodyLight);
      shellGradient.addColorStop(0.28, body);
      shellGradient.addColorStop(0.62, bodyMid);
      shellGradient.addColorStop(1, bodyDark);
      ctx.fillStyle = shellGradient;
      traceBody();
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = withAlpha(bodyDeep, 0.42);
      ctx.beginPath();
      ctx.moveTo(-width * 0.34, -height * 0.42);
      ctx.lineTo(-width * 0.16, -height * 0.08);
      ctx.lineTo(-width * 0.16, height * 0.42);
      ctx.lineTo(-width * 0.3, height * 0.48);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(width * 0.34, -height * 0.42);
      ctx.lineTo(width * 0.16, -height * 0.08);
      ctx.lineTo(width * 0.16, height * 0.42);
      ctx.lineTo(width * 0.3, height * 0.48);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = mixColor(body, "#111827", 0.2);
      traceCockpit();
      ctx.fill();

      const windshield = ctx.createLinearGradient(0, -height * 0.38, 0, height * 0.04);
      windshield.addColorStop(0, glassTop);
      windshield.addColorStop(1, withAlpha(glassBase, 0.95));
      ctx.fillStyle = windshield;
      traceWindow(-height * 0.34, -height * 0.08, width * 0.18, width * 0.13);
      ctx.fill();

      const rearGlass = ctx.createLinearGradient(0, 0, 0, height * 0.3);
      rearGlass.addColorStop(0, withAlpha(glassTop, 0.88));
      rearGlass.addColorStop(1, withAlpha(glassBase, 0.96));
      ctx.fillStyle = rearGlass;
      traceWindow(height * 0.02, height * 0.24, width * 0.12, width * 0.19);
      ctx.fill();

      ctx.fillStyle = roof;
      ctx.beginPath();
      roundRectPath(ctx, -width * 0.12, -height * 0.12, width * 0.24, height * 0.22, 10);
      ctx.fill();

      const centerHighlight = ctx.createLinearGradient(0, -height * 0.48, 0, height * 0.4);
      centerHighlight.addColorStop(0, withAlpha("#ffffff", isPlayer ? 0.32 : 0.22));
      centerHighlight.addColorStop(0.35, "rgba(255, 255, 255, 0.08)");
      centerHighlight.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = centerHighlight;
      ctx.beginPath();
      ctx.moveTo(-width * 0.08, -height * 0.46);
      ctx.lineTo(width * 0.08, -height * 0.46);
      ctx.lineTo(width * 0.16, height * 0.22);
      ctx.lineTo(0, height * 0.48);
      ctx.lineTo(-width * 0.16, height * 0.22);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = withAlpha(chrome, 0.45);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -height * 0.42);
      ctx.lineTo(0, height * 0.44);
      ctx.stroke();

      ctx.strokeStyle = "rgba(8, 14, 25, 0.42)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-width * 0.26, -height * 0.03);
      ctx.lineTo(width * 0.26, -height * 0.03);
      ctx.moveTo(-width * 0.19, height * 0.18);
      ctx.lineTo(width * 0.19, height * 0.18);
      ctx.stroke();

      const centralStripe = ctx.createLinearGradient(0, -height * 0.5, 0, height * 0.45);
      centralStripe.addColorStop(0, accentSoft);
      centralStripe.addColorStop(1, accentShadow);
      ctx.fillStyle = centralStripe;
      ctx.beginPath();
      ctx.moveTo(-width * 0.035, -height * 0.5);
      ctx.lineTo(width * 0.035, -height * 0.5);
      ctx.lineTo(width * 0.065, height * 0.04);
      ctx.lineTo(width * 0.045, height * 0.36);
      ctx.lineTo(-width * 0.045, height * 0.36);
      ctx.lineTo(-width * 0.065, height * 0.04);
      ctx.closePath();
      ctx.fill();

      for (const side of [-1, 1]) {
        const sideStripe = ctx.createLinearGradient(
          side * width * 0.3,
          -height * 0.44,
          side * width * 0.21,
          height * 0.36
        );
        sideStripe.addColorStop(0, accentSoft);
        sideStripe.addColorStop(1, accentShadow);
        ctx.fillStyle = sideStripe;
        ctx.beginPath();
        ctx.moveTo(side * width * 0.32, -height * 0.38);
        ctx.lineTo(side * width * 0.19, -height * 0.24);
        ctx.lineTo(side * width * 0.2, -height * 0.01);
        ctx.lineTo(side * width * 0.28, height * 0.1);
        ctx.lineTo(side * width * 0.23, height * 0.34);
        ctx.lineTo(side * width * 0.32, height * 0.3);
        ctx.lineTo(side * width * 0.36, height * 0.02);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = headlightColor;
      ctx.beginPath();
      ctx.moveTo(-width * 0.25, -height * 0.46);
      ctx.lineTo(-width * 0.06, -height * 0.44);
      ctx.lineTo(-width * 0.11, -height * 0.34);
      ctx.lineTo(-width * 0.26, -height * 0.37);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(width * 0.25, -height * 0.46);
      ctx.lineTo(width * 0.06, -height * 0.44);
      ctx.lineTo(width * 0.11, -height * 0.34);
      ctx.lineTo(width * 0.26, -height * 0.37);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = taillightColor;
      ctx.beginPath();
      roundRectPath(ctx, -width * 0.26, height * 0.34, width * 0.16, height * 0.08, 4);
      ctx.fill();
      ctx.beginPath();
      roundRectPath(ctx, width * 0.1, height * 0.34, width * 0.16, height * 0.08, 4);
      ctx.fill();

      ctx.fillStyle = "rgba(8, 14, 25, 0.78)";
      ctx.beginPath();
      roundRectPath(ctx, -width * 0.16, height * 0.42, width * 0.32, height * 0.06, 4);
      ctx.fill();

      ctx.fillStyle = withAlpha(chrome, 0.5);
      ctx.beginPath();
      roundRectPath(ctx, -width * 0.1, height * 0.44, width * 0.2, height * 0.03, 999);
      ctx.fill();

      if (label) {
        ctx.fillStyle = "#f8fafc";
        ctx.font = "700 13px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(label, 0, -height * 0.72);
      }

      ctx.restore();
    };

    const drawSky = (game) => {
      const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      sky.addColorStop(0, "#050b18");
      sky.addColorStop(0.52, "#0e2447");
      sky.addColorStop(0.74, "#ff7a18");
      sky.addColorStop(1, "#ffe1a6");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = "rgba(255, 239, 206, 0.85)";
      ctx.beginPath();
      ctx.arc(WIDTH * 0.76, 96, 54, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(8, 14, 25, 0.72)";
      ctx.beginPath();
      ctx.moveTo(0, 140);
      ctx.lineTo(88, 114);
      ctx.lineTo(164, 148);
      ctx.lineTo(258, 108);
      ctx.lineTo(358, 142);
      ctx.lineTo(444, 112);
      ctx.lineTo(540, 150);
      ctx.lineTo(630, 118);
      ctx.lineTo(722, 146);
      ctx.lineTo(836, 120);
      ctx.lineTo(960, 156);
      ctx.lineTo(960, 214);
      ctx.lineTo(0, 214);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(4, 9, 16, 0.88)";
      for (let index = 0; index < 14; index += 1) {
        const x = 22 + index * 68;
        const buildingHeight = 40 + ((index * 23) % 66);
        ctx.fillRect(x, 160 - buildingHeight, 40, buildingHeight);
        ctx.fillRect(x + 30, 188 - buildingHeight * 0.7, 16, buildingHeight * 0.7);
      }

      if (game.focusTimer > 0) {
        ctx.fillStyle = "rgba(96, 165, 250, 0.08)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }
    };

    const drawRoad = (game) => {
      ctx.fillStyle = "#2d7d46";
      ctx.fillRect(0, ROAD_TOP, ROAD_LEFT, HEIGHT - ROAD_TOP);
      ctx.fillRect(ROAD_RIGHT, ROAD_TOP, WIDTH - ROAD_RIGHT, HEIGHT - ROAD_TOP);

      const shoulderGradient = ctx.createLinearGradient(ROAD_LEFT - 34, 0, ROAD_LEFT, 0);
      shoulderGradient.addColorStop(0, "#9a3412");
      shoulderGradient.addColorStop(1, "#f59e0b");
      ctx.fillStyle = shoulderGradient;
      ctx.fillRect(ROAD_LEFT - 34, ROAD_TOP, 34, HEIGHT - ROAD_TOP);
      ctx.fillRect(ROAD_RIGHT, ROAD_TOP, 34, HEIGHT - ROAD_TOP);

      const road = ctx.createLinearGradient(ROAD_LEFT, 0, ROAD_RIGHT, 0);
      road.addColorStop(0, "#1a2230");
      road.addColorStop(0.5, "#272f3f");
      road.addColorStop(1, "#1a2230");
      ctx.fillStyle = road;
      ctx.fillRect(ROAD_LEFT, ROAD_TOP, ROAD_WIDTH, HEIGHT - ROAD_TOP);

      ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
      ctx.fillRect(ROAD_LEFT + ROAD_WIDTH * 0.48, ROAD_TOP, ROAD_WIDTH * 0.04, HEIGHT - ROAD_TOP);

      const stripOffset = (game.distance * 1.2) % 112;
      for (let y = ROAD_TOP - 112 + stripOffset; y < HEIGHT; y += 112) {
        ctx.fillStyle = "#f8fafc";
        for (let lane = 1; lane < LANE_COUNT; lane += 1) {
          const center = laneCenter(lane) - laneSize() * 0.5;
          ctx.fillRect(center - 3, y, 6, 56);
        }

        ctx.fillStyle = "#fdf2cf";
        ctx.fillRect(ROAD_LEFT - 24, y, 10, 56);
        ctx.fillRect(ROAD_RIGHT + 14, y, 10, 56);
        ctx.fillStyle = "#fb7185";
        ctx.fillRect(ROAD_LEFT - 14, y, 14, 56);
        ctx.fillRect(ROAD_RIGHT, y, 14, 56);
      }

      const lampOffset = (game.distance * 0.9) % 128;
      for (let y = ROAD_TOP - 128 + lampOffset; y < HEIGHT + 80; y += 128) {
        ctx.fillStyle = "rgba(253, 224, 71, 0.16)";
        ctx.fillRect(ROAD_LEFT - 66, y + 14, 20, 4);
        ctx.fillRect(ROAD_RIGHT + 46, y + 14, 20, 4);
        ctx.fillStyle = "rgba(255, 255, 255, 0.38)";
        ctx.fillRect(ROAD_LEFT - 52, y, 3, 28);
        ctx.fillRect(ROAD_RIGHT + 49, y, 3, 28);
      }
    };

    const drawEntities = (game) => {
      const orderedTraffic = game.entities
        .filter((entity) => entity.kind === "traffic")
        .sort((a, b) => a.y - b.y);
      const pickups = game.entities.filter((entity) => entity.kind !== "traffic");

      for (const entity of pickups) {
        ctx.save();
        ctx.translate(entity.x, entity.y);
        ctx.fillStyle = entity.kind === "shield" ? "#67e8f9" : "#f59e0b";
        ctx.shadowColor = entity.kind === "shield" ? "#67e8f9" : "#fdba74";
        ctx.shadowBlur = 18;
        ctx.beginPath();
        if (entity.kind === "shield") {
          ctx.moveTo(0, -18);
          ctx.lineTo(16, -4);
          ctx.lineTo(10, 18);
          ctx.lineTo(-10, 18);
          ctx.lineTo(-16, -4);
          ctx.closePath();
        } else {
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#03111f";
        ctx.font = "700 13px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(entity.kind === "shield" ? "S" : "F", 0, 1);
        ctx.restore();
      }

      for (const entity of orderedTraffic) {
        drawCar({
          x: entity.x,
          y: entity.y,
          width: entity.width,
          height: entity.height,
          body: entity.body,
          roof: entity.roof,
          accent: entity.accent,
          glow: entity.glow,
          tilt: Math.sin(entity.swayPhase + game.time * entity.swaySpeed) * 0.2,
        });
      }
    };

    const drawHud = (game) => {
      const hudTone =
        game.messageTone === "danger"
          ? "#fecaca"
          : game.messageTone === "accent"
            ? "#bbf7d0"
            : "#e2e8f0";

      ctx.fillStyle = "rgba(4, 11, 21, 0.78)";
      ctx.beginPath();
      roundRectPath(ctx, 16, 16, 250, 112, 18);
      ctx.fill();

      ctx.fillStyle = "#f8fafc";
      ctx.font = "700 13px sans-serif";
      ctx.fillText(copy.title.toUpperCase(), 28, 38);

      ctx.font = "600 12px sans-serif";
      ctx.fillStyle = "#dbe4f1";
      ctx.fillText(`${copy.score}: ${Math.round(game.score)} ${copy.scoreSuffix}`, 28, 62);
      ctx.fillText(`${copy.evaded}: ${game.evaded}`, 28, 82);
      ctx.fillText(`${copy.zone}: ${game.zone}`, 28, 102);

      ctx.fillText(`${copy.integrity}: ${game.integrity}/${MAX_INTEGRITY}`, 164, 62);
      ctx.fillText(`${copy.shield}: ${game.shields}/${MAX_SHIELDS}`, 164, 82);
      ctx.fillText(`${copy.focus}: ${Math.round(game.focusMeter)}%`, 164, 102);

      ctx.fillStyle = "rgba(4, 11, 21, 0.78)";
      ctx.beginPath();
      roundRectPath(ctx, WIDTH - 208, 16, 192, 64, 18);
      ctx.fill();

      ctx.fillStyle = "#f8fafc";
      ctx.font = "700 12px sans-serif";
      ctx.fillText(`${copy.speed} ${Math.round(game.player.worldSpeed)} ${copy.speedSuffix}`, WIDTH - 194, 38);
      ctx.fillStyle = "#dbe4f1";
      ctx.fillText(`${copy.focus} ${game.focusTimer > 0 ? "ON" : "READY"}`, WIDTH - 194, 60);

      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.beginPath();
      roundRectPath(ctx, WIDTH - 194, 28, 180, 12, 999);
      ctx.fill();
      ctx.fillStyle = game.focusTimer > 0 ? "#38bdf8" : "#f59e0b";
      ctx.beginPath();
      roundRectPath(ctx, WIDTH - 194, 28, 180 * (clamp(game.focusMeter, 0, 100) / 100), 12, 999);
      ctx.fill();

      ctx.fillStyle = "rgba(4, 11, 21, 0.7)";
      ctx.beginPath();
      roundRectPath(ctx, 16, HEIGHT - 76, WIDTH - 32, 52, 18);
      ctx.fill();

      ctx.fillStyle = hudTone;
      ctx.font = "600 13px sans-serif";
      ctx.fillText(game.message, 28, HEIGHT - 46);
    };

    const drawFrame = () => {
      const game = gameRef.current;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      const shakeX = (nextRandom(game) - 0.5) * game.shake * 10;
      const shakeY = (nextRandom(game) - 0.5) * game.shake * 8;

      ctx.save();
      ctx.translate(shakeX, shakeY);
      drawSky(game);
      drawRoad(game);
      drawEntities(game);
      drawCar({
        x: game.player.x,
        y: game.player.y,
        width: game.player.width,
        height: game.player.height,
        body: game.focusTimer > 0 ? "#2b78d0" : "#1f9f73",
        roof: game.focusTimer > 0 ? "#e0f2fe" : "#e8fff4",
        accent: game.focusTimer > 0 ? "#7dd3fc" : "#34d399",
        glow: game.focusTimer > 0 ? "#7ec5ff" : "#86efac",
        tilt: game.player.drift,
        label: "YOU",
        shield: game.shields > 0,
        isPlayer: true,
      });
      ctx.restore();

      drawHud(game);

      if (game.flash > 0) {
        ctx.fillStyle =
          game.messageTone === "danger"
            ? `rgba(248, 113, 113, ${Math.min(0.28, game.flash * 0.18)})`
            : `rgba(255, 255, 255, ${Math.min(0.18, game.flash * 0.14)})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }
    };

    const step = (dt) => {
      const game = gameRef.current;
      if (!game) return;

      game.time += dt;
      game.flash = Math.max(0, game.flash - dt * 2.4);
      game.shake = Math.max(0, game.shake - dt * 3.1);
      game.focusTimer = Math.max(0, game.focusTimer - dt);

      if (game.mode !== "playing") return;

      const player = game.player;
      const keys = keysRef.current;
      const steer =
        (keys.has("ArrowRight") || keys.has("KeyD") ? 1 : 0) -
        (keys.has("ArrowLeft") || keys.has("KeyA") ? 1 : 0);
      const accelerate = keys.has("ArrowUp") || keys.has("KeyW");
      const brake = keys.has("ArrowDown") || keys.has("KeyS");
      const wantsFocus = keys.has("Space");

      player.targetSpeed = accelerate ? 438 : brake ? 232 : 320;
      player.worldSpeed = approach(player.worldSpeed, player.targetSpeed + (game.zone - 1) * 20, 2.8, dt);

      const yTarget = accelerate ? PLAYER_MIN_Y : brake ? PLAYER_MAX_Y : PLAYER_BASE_Y;
      player.vy = approach(player.vy, (yTarget - player.y) * 4.6, 4.8, dt);
      player.y = clamp(player.y + player.vy * dt, PLAYER_MIN_Y, PLAYER_MAX_Y);

      player.vx = approach(player.vx, steer * 326, steer === 0 ? 5.4 : 8.8, dt);
      player.x += player.vx * dt;

      const minX = ROAD_LEFT + 40;
      const maxX = ROAD_RIGHT - 40;
      if (player.x < minX || player.x > maxX) {
        player.x = clamp(player.x, minX, maxX);
        player.vx *= -0.2;
        game.shake = Math.max(game.shake, 0.15);
      }

      player.drift = approach(player.drift, clamp(player.vx / 320, -1, 1), 6, dt);

      if (wantsFocus && !game.focusLatch && game.focusTimer <= 0 && game.focusMeter >= 40) {
        game.focusTimer = 2.8;
        game.focusMeter = clamp(game.focusMeter - 40, 0, 100);
        game.flash = 0.8;
        setMessage(game, copy.messageFocus, "accent");
      }
      game.focusLatch = wantsFocus;

      game.distance += player.worldSpeed * dt;
      game.spawnTimer -= dt * 1000;

      if (game.spawnTimer <= 0) {
        const pickupsEnabled = game.evaded >= 8;
        const shouldSpawnPickup =
          pickupsEnabled &&
          !game.entities.some((entity) => entity.kind !== "traffic") &&
          nextRandom(game) > 0.84;

        game.entities.push(shouldSpawnPickup ? createPickup(game) : createTrafficCar(game));

        if (!shouldSpawnPickup && game.zone > 1 && nextRandom(game) > 0.76) {
          game.entities.push(createTrafficCar(game));
        }

        game.spawnTimer = getSpawnInterval(game) * lerp(0.88, 1.18, nextRandom(game));
      }

      const trafficSlow = game.focusTimer > 0 ? 0.58 : 1;

      for (let index = game.entities.length - 1; index >= 0; index -= 1) {
        const entity = game.entities[index];
        if (entity.kind === "traffic") {
          entity.y += player.worldSpeed * entity.speedMul * trafficSlow * dt;
          entity.x = entity.baseX + Math.sin(game.time * entity.swaySpeed + entity.swayPhase) * entity.swayAmp;

          const dx = Math.abs(entity.x - player.x);
          const dy = Math.abs(entity.y - player.y);
          const collisionX = (entity.width + player.width) * 0.42;
          const collisionY = (entity.height + player.height) * 0.42;
          const nearX = collisionX + 20;

          if (!entity.passed && entity.y > player.y - entity.height * 0.28) {
            entity.passed = true;
            if (dx > collisionX && dx < nearX && dy < collisionY + 12) {
              entity.nearMissAwarded = true;
              game.nearMisses += 1;
              game.streak += 1;
              game.bestStreak = Math.max(game.bestStreak, game.streak);
              game.focusMeter = clamp(game.focusMeter + 16, 0, 100);
              game.score += 34 + game.streak * 9;
              setMessage(game, copy.messageNearMiss, "accent");
            } else {
              game.streak = 0;
            }
          }

          if (dx < collisionX && dy < collisionY) {
            entity.y = HEIGHT + 180;
            game.shake = 1;
            game.flash = 1;

            if (game.shields > 0) {
              game.shields -= 1;
              setMessage(game, copy.messageBlocked, "accent");
            } else {
              game.integrity -= 1;
              game.streak = 0;
              setMessage(game, copy.messageCrash, "danger");
              if (game.integrity <= 0) {
                game.mode = "gameover";
                game.resultScore = Math.round(game.score);
                game.resultEvaded = game.evaded;
                setScreen("gameover");
                setViewModel(buildViewModel("gameover", game));
                return;
              }
            }
          }

          if (entity.y > HEIGHT + 120) {
            game.evaded += 1;
            game.score += 11 + game.zone * 2;
            if (!entity.nearMissAwarded) {
              game.streak = 0;
            }
            const nextZone = 1 + Math.floor(game.evaded / 12);
            if (nextZone !== game.zone) {
              game.zone = nextZone;
              game.flash = 0.45;
              setMessage(game, copy.messageZone(game.zone), "accent");
            }
            game.entities.splice(index, 1);
          }
        } else {
          entity.y += player.worldSpeed * 0.92 * dt;
          entity.x = entity.baseX + Math.sin(game.time * 2.4 + entity.bobPhase) * 7;

          const dx = Math.abs(entity.x - player.x);
          const dy = Math.abs(entity.y - player.y);
          if (dx < 34 && dy < 50) {
            if (entity.kind === "shield") {
              game.shields = clamp(game.shields + 1, 0, MAX_SHIELDS);
              setMessage(game, copy.messageShield, "accent");
            } else {
              game.focusMeter = clamp(game.focusMeter + 38, 0, 100);
              game.score += 28;
              setMessage(game, copy.messageCharge, "accent");
            }
            game.flash = 0.55;
            game.entities.splice(index, 1);
          } else if (entity.y > HEIGHT + 80) {
            game.entities.splice(index, 1);
          }
        }
      }
    };

    resize();
    frameRef.current = { draw: drawFrame, step };
    lastRef.current = performance.now();
    lastHudRef.current = 0;

    const onKeyDown = (event) => {
      keysRef.current.add(event.code);

      if (event.code === "KeyR") {
        event.preventDefault();
        restartRun();
      }
    };

    const onKeyUp = (event) => {
      keysRef.current.delete(event.code);
    };

    const loop = (now) => {
      rafRef.current = requestAnimationFrame(loop);
      const dt = Math.min(0.033, (now - lastRef.current) / 1000 || 0.016);
      lastRef.current = now;
      frameRef.current.step(dt);
      frameRef.current.draw();

      if (now - lastHudRef.current > 120) {
        lastHudRef.current = now;
        syncViewModel(gameRef.current.mode === "gameover" ? "gameover" : screen === "menu" ? "menu" : "playing");
      }
    };

    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [copy, restartRun, screen, syncViewModel]);

  const advanceTime = useCallback((ms = 0) => {
    const loops = Math.max(1, Math.round(ms / STEP_MS));
    for (let index = 0; index < loops; index += 1) {
      frameRef.current.step(STEP_MS / 1000);
      if (gameRef.current.mode === "gameover") break;
    }
    frameRef.current.draw();
    setViewModel(
      buildViewModel(
        gameRef.current.mode === "gameover" ? "gameover" : screen === "menu" ? "menu" : "playing",
        gameRef.current
      )
    );
    return undefined;
  }, [screen]);

  useEffect(() => {
    const next = createGameState(copy, seedRunRef.current);
    gameRef.current = next;
    setScreen("menu");
    setViewModel(buildViewModel("menu", next));
  }, [copy]);

  useGameRuntimeBridge(viewModel, useCallback((snapshot) => snapshot, []), advanceTime);

  return (
    <div className="mtr">
      <canvas ref={canvasRef} className="mtr__canvas" />

      {screen === "menu" && (
        <div className="mtr__overlay">
          <div className="mtr__card">
            <div className="mtr__eyebrow">{copy.eyebrow}</div>
            <h3>{copy.title}</h3>
            <p>{copy.subtitle}</p>
            <div className="mtr__pillRow">
              <span className="mtr__pill">{copy.laneLabel}</span>
              <span className="mtr__pill">{copy.nearMissLabel}</span>
              <span className="mtr__pill">{copy.shieldLabel}</span>
              <span className="mtr__pill">{copy.focusLabel}</span>
            </div>
            <p className="mtr__hint">{copy.controls}</p>
            <button id="start-btn" type="button" className="mtr__button" onClick={startRun}>
              {copy.start}
            </button>
          </div>
        </div>
      )}

      {screen === "gameover" && (
        <div className="mtr__overlay">
          <div className="mtr__card">
            <div className="mtr__eyebrow">{copy.sessionLocked}</div>
            <h3>{copy.gameOver}</h3>
            <div className="mtr__stats">
              <div>
                <strong>{gameRef.current.resultScore}</strong>
                <span>{copy.score}</span>
              </div>
              <div>
                <strong>{gameRef.current.resultEvaded}</strong>
                <span>{copy.evaded}</span>
              </div>
              <div>
                <strong>{gameRef.current.bestStreak}</strong>
                <span>{copy.nearMissMax}</span>
              </div>
            </div>
            <p className="mtr__hint">{copy.objective}</p>
            <button type="button" className="mtr__button" onClick={restartRun}>
              {copy.restart}
            </button>
          </div>
        </div>
      )}

      <div className="mtr__touchControls" role="group" aria-label={copy.controls}>
        <div className="mtr__touchPad">
          <button type="button" {...bindHoldControl("ArrowLeft")}>{lang === "es" ? "Izq" : "Left"}</button>
          <button type="button" {...bindHoldControl("ArrowRight")}>{lang === "es" ? "Der" : "Right"}</button>
        </div>
        <div className="mtr__touchPad">
          <button type="button" {...bindHoldControl("ArrowUp")}>{lang === "es" ? "Gas" : "Fast"}</button>
          <button type="button" {...bindHoldControl("ArrowDown")}>{lang === "es" ? "Freno" : "Brake"}</button>
        </div>
        <div className="mtr__touchActions">
          <button type="button" className="mtr__touchPrimary" {...bindHoldControl("Space")}>{lang === "es" ? "Focus" : "Focus"}</button>
          <button type="button" onClick={restartRun}>{copy.restart}</button>
        </div>
      </div>
    </div>
  );
}

export default SunsetSlipstream;
