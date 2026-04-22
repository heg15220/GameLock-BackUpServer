import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";

// ─── Canvas dimensions ────────────────────────────────────────────────────────
const WIDTH  = 960;
const HEIGHT = 540;
const DT     = 1 / 60;
const DT_MS  = 1000 / 60;
const STORAGE_KEY = "sports_basketball_court_v1";

// ─── Physics constants ────────────────────────────────────────────────────────
const GRAVITY        = 9.82;    // m/s²
const AIR_DRAG       = 0.011;   // coefficient per m/s per second
const BALL_RADIUS    = 0.121;   // NBA regulation
const RIM_RADIUS     = 0.228;   // inner rim radius
const RIM_HEIGHT     = 3.05;    // 10 feet in metres
const RIM_THICKNESS  = 0.022;   // rim tube radius for collision
const RELEASE_HEIGHT = 2.28;    // hand release from floor
const BACKBOARD_Z    = -0.15;   // world Z of backboard face

// ─── Aim constraints ──────────────────────────────────────────────────────────
const MIN_ARC      = 36;
const MAX_ARC      = 66;
const MIN_POWER    = 0.50;
const MAX_POWER    = 1.00;
const MAX_LATERAL  = 22;   // degrees left/right from ideal line

// ─── Shot positions ──────────────────────────────────────────────────────────
// World origin: basket rim centre projected to floor.  +Z = toward shooter.
const SHOT_POSITIONS = [
  {
    id: "free-throw", index: 0, pts: 1,
    labelEs: "Tiro Libre",          labelEn: "Free Throw",
    descEs: "Línea de tiro libre · 4.57 m",
    descEn: "Free throw line · 4.57 m",
    x: 0,    z: 4.57,
    idealArc: 52, idealPower: 0.72,
  },
  {
    id: "mid-range", index: 1, pts: 2,
    labelEs: "Media Distancia",     labelEn: "Mid-Range",
    descEs: "En suspensión lateral · ~5.2 m",
    descEn: "Side jump shot · ~5.2 m",
    x: 3.5,  z: 3.8,
    idealArc: 50, idealPower: 0.77,
  },
  {
    id: "corner-left", index: 2, pts: 3,
    labelEs: "Triple Esquina Izq",  labelEn: "Left Corner 3",
    descEs: "Esquina izquierda · 6.75 m",
    descEn: "Left corner · 6.75 m",
    x: 6.6,  z: 0.9,
    idealArc: 46, idealPower: 0.80,
  },
  {
    id: "corner-right", index: 3, pts: 3,
    labelEs: "Triple Esquina Der",  labelEn: "Right Corner 3",
    descEs: "Esquina derecha · 6.75 m",
    descEn: "Right corner · 6.75 m",
    x: -6.6, z: 0.9,
    idealArc: 46, idealPower: 0.80,
  },
  {
    id: "wing-left", index: 4, pts: 3,
    labelEs: "Triple Lateral Izq",  labelEn: "Left Wing 3",
    descEs: "Ala izquierda · 6.75 m",
    descEn: "Left wing · 6.75 m",
    x: 4.77, z: 4.77,
    idealArc: 50, idealPower: 0.86,
  },
  {
    id: "center-three", index: 5, pts: 3,
    labelEs: "Triple Central",      labelEn: "Center 3",
    descEs: "Top del arco · 6.75 m",
    descEn: "Top of arc · 6.75 m",
    x: 0,    z: 6.75,
    idealArc: 52, idealPower: 0.90,
  },
];

const MAX_POSSIBLE = SHOT_POSITIONS.reduce((s, p) => s + p.pts, 0); // 15

// ─── Game "21" constants ──────────────────────────────────────────────────────
const G21_POSITIONS = [
  { id: "paint",   x:  0,    z: 3.0,  labelEs: "Zona",        labelEn: "Paint",        idealArc: 56, idealPower: 0.65 },
  { id: "ft",      x:  0,    z: 4.57, labelEs: "Tiro Libre",  labelEn: "Free Throw",   idealArc: 52, idealPower: 0.72 },
  { id: "elbowL",  x: -2.8,  z: 5.2,  labelEs: "Codo Izq",    labelEn: "Left Elbow",   idealArc: 50, idealPower: 0.76 },
  { id: "elbowR",  x:  2.8,  z: 5.2,  labelEs: "Codo Der",    labelEn: "Right Elbow",  idealArc: 50, idealPower: 0.76 },
  { id: "wingL",   x: -4.77, z: 4.77, labelEs: "Ala Izq",     labelEn: "Left Wing",    idealArc: 50, idealPower: 0.86 },
  { id: "wingR",   x:  4.77, z: 4.77, labelEs: "Ala Der",     labelEn: "Right Wing",   idealArc: 50, idealPower: 0.86 },
  { id: "top3",    x:  0,    z: 6.75, labelEs: "Triple",      labelEn: "3-Pointer",    idealArc: 52, idealPower: 0.90 },
];
const G21_FT_POS   = { x: 0, z: 4.57, idealArc: 52, idealPower: 0.72 };
const G21_TARGET   = 21;
const G21_BUST     = 11;
const G21_FG_PTS   = 2;
const G21_FT_PTS   = 1;
const G21_STOR_KEY = "basketball_21_best_v1";
const G21_AI_THINK = 2.1;
const G21_AI_AIM   = 1.9;
const G21_AI_BOUNCE_SETUP_DELAY = 0.95;
const G21_AI_FT_SETUP_DELAY = 1.1;
const G21_AI_FT_AIM_MULT = 1.0;

// ─── UI copy ──────────────────────────────────────────────────────────────────
const UI = {
  es: {
    title:        "Basketball Court Pro",
    subtitle:     "6 posiciones reglamentarias · 1 ronda · Canesta el máximo",
    menuStart:    "Iniciar ronda",
    menuHint:     "Ajusta arco, potencia y dirección lateral para encestar.",
    pauseLabel:   "PAUSA",
    pauseResume:  "P para reanudar",
    arcLabel:     "Arco",
    powerLabel:   "Potencia",
    latLabel:     "Lateral",
    shootHint:    "↑↓ arco · ←→ lateral · W/S potencia · Space lanza",
    nextHint:     "Space · siguiente tiro",
    shotOf:       ["Tiro", "de"],
    scoreLabel:   "Puntos",
    bestLabel:    "Récord",
    rimView:      "vista aro",
    result: { basket: "¡CANASTA!", miss: "FALLO", rim: "¡Al aro!" },
    summary: {
      title:      "Resumen de ronda",
      score:      "Puntos totales",
      made:       "Anotados",
      best:       "Récord anterior",
      newRecord:  "⭐ ¡Nuevo récord!",
      again:      "Jugar de nuevo (Enter)",
    },
  },
  en: {
    title:        "Basketball Court Pro",
    subtitle:     "6 regulation spots · 1 round · Make as many as possible",
    menuStart:    "Start round",
    menuHint:     "Tune arc, power, and lateral aim to score from each spot.",
    pauseLabel:   "PAUSED",
    pauseResume:  "P to resume",
    arcLabel:     "Arc",
    powerLabel:   "Power",
    latLabel:     "Lateral",
    shootHint:    "↑↓ arc · ←→ lateral · W/S power · Space shoot",
    nextHint:     "Space · next shot",
    shotOf:       ["Shot", "of"],
    scoreLabel:   "Points",
    bestLabel:    "Record",
    rimView:      "rim view",
    result: { basket: "BASKET!", miss: "MISS", rim: "Off the rim!" },
    summary: {
      title:      "Round summary",
      score:      "Total points",
      made:       "Made",
      best:       "Previous best",
      newRecord:  "⭐ New record!",
      again:      "Play again (Enter)",
    },
  },
};

// ─── Game "21" UI copy ────────────────────────────────────────────────────────
const UI21 = {
  es: {
    title:      "El 21",
    subtitle:   "Sé el primero en anotar exactamente 21 puntos",
    you:        "TÚ",  ai: "IA",
    yourTurn:   "Tu turno · elige posición",
    aiTurn:     "TURNO IA",
    aiThinks:   "La IA está calculando...",
    selectHint: "←→ posición  ·  Enter confirmar",
    shootHint:  "↑↓ arco · ←→ lateral · W/S pot · Space lanza",
    ftHint:     "Tiro libre consecutivo – Space lanza",
    rebound:    "REBOTE →",
    bust:       "¡Pasado! Baja a",
    fg:         "CANASTA +2",
    ftMade:     "LIBRE +1",
    miss:       "FALLO",
    winner:     { you: "¡GANASTE! 🏆", ai: "La IA gana" },
    again:      "Jugar de nuevo (Enter)",
    best:       "Récord",
    ftLabel:    "TIRO LIBRE",
  },
  en: {
    title:      "21",
    subtitle:   "Be the first to score exactly 21 points",
    you:        "YOU", ai: "AI",
    yourTurn:   "Your turn · pick a spot",
    aiTurn:     "AI TURN",
    aiThinks:   "AI is calculating...",
    selectHint: "←→ spot  ·  Enter confirm",
    shootHint:  "↑↓ arc · ←→ lateral · W/S power · Space shoot",
    ftHint:     "Consecutive free throw – Space shoot",
    rebound:    "REBOUND →",
    bust:       "BUST! Reset to",
    fg:         "BASKET +2",
    ftMade:     "FREE +1",
    miss:       "MISS",
    winner:     { you: "YOU WIN! 🏆", ai: "AI wins" },
    again:      "Play again (Enter)",
    best:       "Best",
    ftLabel:    "FREE THROW",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function toRad(d) { return d * Math.PI / 180; }

function roundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, cx, y, maxW, lineH) {
  const words = text.split(" ");
  let line = "";
  let curY = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, curY);
      line = w;
      curY += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, curY);
  return curY;
}

// ─── Camera ───────────────────────────────────────────────────────────────────
function buildCamera(pos) {
  const Dh  = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
  const ux  = pos.x / Dh;   // unit from basket toward player X
  const uz  = pos.z / Dh;   // unit from basket toward player Z
  const BEHIND = 4.2;
  const camX = pos.x + ux * BEHIND;
  const camY = 3.4;
  const camZ = pos.z + uz * BEHIND;
  // look at basket rim centre
  const fX = 0 - camX, fY = RIM_HEIGHT - camY, fZ = 0 - camZ;
  const fH = Math.sqrt(fX * fX + fZ * fZ);
  return {
    x: camX, y: camY, z: camZ,
    yaw:   Math.atan2(fX, fZ),
    pitch: Math.atan2(fY, fH),
  };
}

function project3D(wx, wy, wz, cam, vW, vH) {
  const dx = wx - cam.x, dy = wy - cam.y, dz = wz - cam.z;
  // Yaw (rotation around Y).  Camera right = (-fZ, fX), forward = (fX, fZ).
  // Correct world-to-camera: cx = dot(d_xz, right), cz = dot(d_xz, forward)
  const cosY = Math.cos(cam.yaw), sinY = Math.sin(cam.yaw);
  const cx = -dx * cosY + dz * sinY;   // right component
  const cz =  dx * sinY + dz * cosY;   // forward depth
  // Pitch (rotation around X after yaw)
  const cosP = Math.cos(cam.pitch), sinP = Math.sin(cam.pitch);
  const pz =  cz * cosP + dy * sinP;
  const py = -cz * sinP + dy * cosP;
  if (pz <= 0.04) return null;
  const F = vH * 0.86;
  return { x: vW / 2 + cx * F / pz, y: vH / 2 - py * F / pz, depth: pz };
}

// shorthand
function p3(wx, wy, wz, cam, vW, vH) { return project3D(wx, wy, wz, cam, vW, vH); }

function line3D(ctx, cam, vW, vH, x1, y1, z1, x2, y2, z2) {
  const a = p3(x1, y1, z1, cam, vW, vH);
  const b = p3(x2, y2, z2, cam, vW, vH);
  if (!a || !b) return;
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
}

// ─── Physics ──────────────────────────────────────────────────────────────────
function computeLaunch(pos, arcDeg, power, latDeg) {
  const arcRad = toRad(arcDeg);
  const latRad = toRad(latDeg);
  const Dh = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
  const dH = RIM_HEIGHT - RELEASE_HEIGHT;          // ~0.77 m
  const tanA = Math.tan(arcRad), cosA = Math.cos(arcRad);
  const denom = Dh * tanA - dH;
  // Ideal speed: ball reaches basket plane at exactly RIM_HEIGHT.
  // Near-rim bounce shots can make `denom` tiny/negative; clamp it so close shots
  // stay controllable instead of jumping to an excessive fallback speed.
  const safeDenom = Math.max(0.12, denom);
  const vIdeal = clamp(
    Math.sqrt((GRAVITY * Dh * Dh) / (2 * cosA * cosA * safeDenom)),
    3.8,
    16.5
  );
  const speed = vIdeal * (power / pos.idealPower);
  // Forward direction (player → basket, XZ plane)
  const fwX = -pos.x / Dh, fwZ = -pos.z / Dh;
  // Perpendicular (right of forward)
  const pxX = -fwZ, pxZ = fwX;
  // Apply lateral rotation
  const cosL = Math.cos(latRad), sinL = Math.sin(latRad);
  const dirX = fwX * cosL + pxX * sinL;
  const dirZ = fwZ * cosL + pxZ * sinL;
  const vH = speed * cosA;
  return { vx: dirX * vH, vy: speed * Math.sin(arcRad), vz: dirZ * vH };
}

function stepBall(b, dt) {
  b.vy -= GRAVITY * dt;
  const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy + b.vz * b.vz);
  if (sp > 0.001) {
    const df = 1 - AIR_DRAG * sp * dt;
    b.vx *= df; b.vy *= df; b.vz *= df;
  }
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.z += b.vz * dt;
}

// Returns { type } or null.  Modifies ball in-place for elastic collisions.
function checkCollisions(ball, prev) {
  // Backboard
  if (prev.z > BACKBOARD_Z - BALL_RADIUS && ball.z <= BACKBOARD_Z + BALL_RADIUS && ball.vz < 0) {
    if (Math.abs(ball.x) <= 0.915 && ball.y >= 2.9 && ball.y <= 3.975) {
      ball.vz = Math.abs(ball.vz) * 0.48;
      ball.vx *= 0.82; ball.vy *= 0.84;
      ball.z = BACKBOARD_Z + BALL_RADIUS;
      return { type: "backboard" };
    }
  }
  // Rim collision – test 16 sample points around the ring
  const N = 16;
  for (let i = 0; i < N; i++) {
    const a  = (i / N) * Math.PI * 2;
    const rpX = Math.cos(a) * RIM_RADIUS;
    const rpZ = Math.sin(a) * RIM_RADIUS;
    const rpY = RIM_HEIGHT;
    const dist = Math.sqrt(
      (ball.x - rpX) ** 2 + (ball.y - rpY) ** 2 + (ball.z - rpZ) ** 2
    );
    if (dist < BALL_RADIUS + RIM_THICKNESS) {
      const nx = (ball.x - rpX) / dist;
      const ny = (ball.y - rpY) / dist;
      const nz = (ball.z - rpZ) / dist;
      const dot = ball.vx * nx + ball.vy * ny + ball.vz * nz;
      if (dot < 0) {
        const rest = 0.42;
        ball.vx -= (1 + rest) * dot * nx;
        ball.vy -= (1 + rest) * dot * ny;
        ball.vz -= (1 + rest) * dot * nz;
        ball.x = rpX + nx * (BALL_RADIUS + RIM_THICKNESS + 0.002);
        ball.y = rpY + ny * (BALL_RADIUS + RIM_THICKNESS + 0.002);
        ball.z = rpZ + nz * (BALL_RADIUS + RIM_THICKNESS + 0.002);
      }
      return { type: "rim" };
    }
  }
  // Basket: ball crossing rim plane downward within rim bore
  if (prev.y >= RIM_HEIGHT - BALL_RADIUS && ball.y < RIM_HEIGHT - BALL_RADIUS) {
    const dxz = Math.sqrt(ball.x * ball.x + ball.z * ball.z);
    if (dxz < RIM_RADIUS - BALL_RADIUS * 0.6) return { type: "basket" };
  }
  // Ground
  if (ball.y <= BALL_RADIUS) return { type: "ground" };
  // Out of useful range
  if (ball.z < -5 || ball.z > 22 || Math.abs(ball.x) > 18) return { type: "miss" };
  return null;
}

// Compute a synthetic position object from a floor bounce point
function computeBouncePos(ball) {
  const x = clamp(ball.x, -8, 8);
  const z = clamp(ball.z, 0.5, 9.5);
  const d = Math.max(0.55, Math.sqrt(x * x + z * z));
  const idealArc   = clamp(60 - d * 2.1, 45, 62);
  const idealPower = clamp(0.32 + d * 0.085, 0.28, 0.94);
  return { x, z, idealArc, idealPower, fromBounce: true };
}

function getPowerRangeForPos(pos) {
  if (!pos || !pos.fromBounce) {
    return { minPower: MIN_POWER, maxPower: MAX_POWER };
  }
  const d = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
  const minPower = clamp(0.22 + d * 0.065, 0.24, MIN_POWER);
  return { minPower, maxPower: MAX_POWER };
}

// Trajectory preview (low-rate simulation)
function previewTrajectory(pos, arcDeg, power, latDeg) {
  const vel = computeLaunch(pos, arcDeg, power, latDeg);
  const b = { x: pos.x, y: RELEASE_HEIGHT, z: pos.z, ...vel };
  const pts = [{ x: b.x, y: b.y, z: b.z }];
  const SDT = 1 / 28;
  for (let i = 0; i < 90; i++) {
    const prev = { ...b };
    stepBall(b, SDT);
    pts.push({ x: b.x, y: b.y, z: b.z });
    const col = checkCollisions(b, prev);
    if (col && (col.type === "basket" || col.type === "ground" || col.type === "miss")) break;
    if (i > 70 && b.z < -1) break;
  }
  return pts;
}

function collectSamples(center, span, step, lo, hi) {
  const out = [];
  for (let v = center - span; v <= center + span + 1e-6; v += step) {
    const c = clamp(v, lo, hi);
    if (out.length === 0 || Math.abs(out[out.length - 1] - c) > 1e-5) {
      out.push(c);
    }
  }
  return out;
}

function simulateShotForAim(pos, arcDeg, power, latDeg) {
  const vel = computeLaunch(pos, arcDeg, power, latDeg);
  const ball = { x: pos.x, y: RELEASE_HEIGHT, z: pos.z, ...vel };
  const dt = 1 / 120;
  let minRimGap = Number.POSITIVE_INFINITY;
  let minRimPlaneGap = Number.POSITIVE_INFINITY;
  let flightSteps = 0;

  for (let i = 0; i < 260; i++) {
    const prev = { ...ball };
    stepBall(ball, dt);
    flightSteps = i;

    const radial = Math.sqrt(ball.x * ball.x + ball.z * ball.z);
    const centerGap = Math.hypot(radial, ball.y - RIM_HEIGHT);
    minRimGap = Math.min(minRimGap, centerGap);

    if (Math.abs(ball.y - RIM_HEIGHT) <= 0.22) {
      const bore = RIM_RADIUS - BALL_RADIUS * 0.45;
      minRimPlaneGap = Math.min(minRimPlaneGap, Math.abs(radial - bore));
    }

    const col = checkCollisions(ball, prev);
    if (!col) {
      continue;
    }
    if (col.type === "basket") {
      return { made: true, terminal: "basket", minRimGap, minRimPlaneGap, flightSteps };
    }
    if (col.type === "ground" || col.type === "miss") {
      return { made: false, terminal: col.type, minRimGap, minRimPlaneGap, flightSteps };
    }
  }

  return { made: false, terminal: "timeout", minRimGap, minRimPlaneGap, flightSteps };
}

function scoreAimSimulation(sim) {
  if (sim.made) {
    return 10_000 - sim.flightSteps * 3;
  }
  const rimPenalty = sim.minRimGap * 190;
  const planePenalty = Number.isFinite(sim.minRimPlaneGap) ? sim.minRimPlaneGap * 260 : 320;
  const terminalPenalty = sim.terminal === "miss" ? 130 : sim.terminal === "timeout" ? 180 : 70;
  return -(rimPenalty + planePenalty + terminalPenalty);
}

function findSmartAimForPos(pos) {
  const { minPower, maxPower } = getPowerRangeForPos(pos);
  const baseArc = clamp(pos.idealArc, MIN_ARC, MAX_ARC);
  const basePower = clamp(pos.idealPower, minPower, maxPower);
  let best = { arc: baseArc, power: basePower, lat: 0, score: Number.NEGATIVE_INFINITY, made: false };

  const evaluate = (arc, power, lat) => {
    const sim = simulateShotForAim(pos, arc, power, lat);
    const score = scoreAimSimulation(sim);
    if (score > best.score) {
      best = { arc, power, lat, score, made: sim.made };
    }
  };

  evaluate(baseArc, basePower, 0);

  const passes = [
    { arcSpan: 8, powerSpan: 0.18, latSpan: 12, arcStep: 2, powerStep: 0.03, latStep: 2 },
    { arcSpan: 3, powerSpan: 0.06, latSpan: 4, arcStep: 1, powerStep: 0.015, latStep: 1 },
    { arcSpan: 1.5, powerSpan: 0.025, latSpan: 1.5, arcStep: 0.5, powerStep: 0.008, latStep: 0.5 },
  ];

  for (const pass of passes) {
    const arcs = collectSamples(best.arc, pass.arcSpan, pass.arcStep, MIN_ARC, MAX_ARC);
    const powers = collectSamples(best.power, pass.powerSpan, pass.powerStep, minPower, maxPower);
    const lats = collectSamples(best.lat, pass.latSpan, pass.latStep, -MAX_LATERAL, MAX_LATERAL);
    for (const arc of arcs) {
      for (const power of powers) {
        for (const lat of lats) {
          evaluate(arc, power, lat);
        }
      }
    }
  }

  return best;
}

// ─── Storage ──────────────────────────────────────────────────────────────────
function loadBest() {
  try { const d = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); return Math.max(0, Number(d.best) || 0); }
  catch { return 0; }
}
function saveBest(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ best: s })); } catch { /* */ }
}

// ─── Render colours ───────────────────────────────────────────────────────────
const C = {
  gymCeil:      "#080d16",
  floorNear:    "#d49448",
  floorMid:     "#c08030",
  floorFar:     "#7a4e1a",
  floorLine:    "rgba(0,0,0,0.08)",
  floorAlt:     "rgba(130,65,10,0.07)",
  floorGloss:   "rgba(255,215,150,0.06)",
  courtLine:    "rgba(255,255,255,0.88)",
  paint:        "rgba(195,60,15,0.30)",
  paintBorder:  "rgba(220,80,20,0.55)",
  rim:          "#e84800",
  rimHighlight: "rgba(255,130,50,0.70)",
  rimShadow:    "rgba(80,20,0,0.60)",
  bbGlass:      "rgba(185,220,255,0.13)",
  bbGlossHL:    "rgba(200,230,255,0.13)",
  bbEdge:       "#8aa0bc",
  bbFrame:      "rgba(140,170,210,0.40)",
  bbBox:        "rgba(255,40,40,0.90)",
  netLine:      "rgba(235,242,248,0.78)",
  netShadow:    "rgba(0,0,0,0.25)",
  panelBg0:     "#080f1c",
  panelBg1:     "#0e1826",
  accentOrange: "#f0a030",
  textMuted:    "#5a7090",
  textDim:      "#3a5068",
  ballHigh:     "#ffb040",
  ballMid:      "#d44e0c",
  ballLow:      "#8a2400",
  truss:        "rgba(42,58,88,0.80)",
  trussD:       "rgba(38,52,80,0.50)",
  wallDark:     "#0f1825",
  wallMid:      "#141f32",
  wallLight:    "#1c2a42",
  scoreBoard:   "#050810",
  scoreBorder:  "rgba(255,100,20,0.45)",
  bannerBlue:   "rgba(40,100,200,0.55)",
  bannerRed:    "rgba(180,40,40,0.55)",
};

// ─── Runtime ──────────────────────────────────────────────────────────────────
class BasketballRuntime {
  constructor({ canvas, locale, onSnapshot, onFullscreen }) {
    this.canvas      = canvas;
    this.ctx         = canvas.getContext("2d");
    this.locale      = locale;
    this.ui          = UI[locale] ?? UI.en;
    this.onSnapshot  = onSnapshot;
    this.onFullscreen = onFullscreen;

    this.screen    = "menu";     // menu | play | summary | play21 | summary21
    this.paused    = false;
    this.fullscreen = false;
    this.gameMode  = "classic";  // "classic" | "21"

    this.shotIdx   = 0;
    this.results   = [];         // { made, pts }[]
    this.roundPts  = 0;
    this.best      = loadBest();
    this.newBest   = false;

    this.shotState  = "aiming";  // aiming | flight | result
    this.aim        = { arc: 50, power: 0.75, lat: 0 };
    this.ball       = null;
    this.trail      = [];
    this.resultType = null;      // "basket" | "miss" | "rim"
    this.resultTimer = 0;
    this.netSway    = 0;

    this.camera     = buildCamera(SHOT_POSITIONS[0]);
    this.preview    = [];
    this.previewDirty = true;
    this.g21        = null;   // active game-21 state

    this.time       = 0;
    this.vW         = WIDTH;
    this.vH         = HEIGHT;
    this.keys       = {};
    this.lastFrame  = 0;
    this.accumulator = 0;
    this.running    = false;
    this.raf        = null;

    this._onFrame   = (ts) => this.frame(ts);
    this._onResize  = ()   => this.handleResize();
    this._onKD      = (e)  => this.onKeyDown(e);
    this._onKU      = (e)  => this.onKeyUp(e);
    this._onClick   = (e)  => this.onCanvasClick(e);
  }

  get pos() { return SHOT_POSITIONS[this.shotIdx]; }

  start() {
    this.running = true;
    this.handleResize();
    window.addEventListener("resize", this._onResize);
    window.addEventListener("keydown", this._onKD);
    window.addEventListener("keyup",   this._onKU);
    this.canvas.addEventListener("click", this._onClick);
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this._onFrame);
  }

  destroy() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("keydown", this._onKD);
    window.removeEventListener("keyup",   this._onKU);
    this.canvas.removeEventListener("click", this._onClick);
  }

  handleResize() {
    const dpr  = clamp(window.devicePixelRatio || 1, 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w    = rect.width  || WIDTH;
    const h    = rect.height || HEIGHT;
    this.canvas.width  = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.vW = w; this.vH = h;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render();
  }

  emit() {
    if (!this.onSnapshot) return;
    this.onSnapshot({
      mode: "sports-basketball-court", screen: this.screen,
      shotIdx: this.shotIdx, roundPts: this.roundPts, best: this.best,
    });
  }

  // ── Game control ─────────────────────────────────────────────
  startRound() {
    this.shotIdx = 0; this.results = []; this.roundPts = 0; this.newBest = false;
    this.screen  = "play"; this.paused = false;
    this.setupShot();
  }

  setupShot() {
    const pos = this.pos;
    this.shotState    = "aiming";
    this.resultTimer  = 0;
    this.resultType   = null;
    this.ball         = null;
    this.trail        = [];
    this.netSway      = 0;
    // Start aim near ideal with a small random offset (gives player something to dial in)
    this.aim = {
      arc:   clamp(pos.idealArc   + (Math.random() - 0.5) * 6, MIN_ARC,   MAX_ARC),
      power: clamp(pos.idealPower + (Math.random() - 0.5) * 0.10, MIN_POWER, MAX_POWER),
      lat:   (Math.random() - 0.5) * 10,
    };
    this.camera       = buildCamera(pos);
    this.previewDirty = true;
    this.emit();
  }

  shoot() {
    if (this.shotState !== "aiming" || this.screen !== "play" || this.paused) return;
    const v = computeLaunch(this.pos, this.aim.arc, this.aim.power, this.aim.lat);
    this.ball  = { x: this.pos.x, y: RELEASE_HEIGHT, z: this.pos.z, ...v };
    this.trail = [];
    this.shotState = "flight";
    this.preview   = [];
    this.emit();
  }

  advanceShot() {
    if (this.shotIdx < SHOT_POSITIONS.length - 1) {
      this.shotIdx++;
      this.setupShot();
    } else {
      if (this.roundPts > this.best) {
        this.best = this.roundPts; this.newBest = true; saveBest(this.best);
      }
      this.screen = "summary";
      this.emit();
    }
  }

  // ── Keys ─────────────────────────────────────────────────────
  onKeyDown(e) {
    const { code } = e;
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(code)) e.preventDefault();
    this.keys[code] = true;
    if (e.repeat) return;

    if (code === "KeyF") { this.onFullscreen?.(); return; }
    if (code === "Escape" && this.screen !== "menu") { this.screen = "menu"; this.g21 = null; this.emit(); return; }

    if (code === "KeyP" && this.screen === "play") {
      this.paused = !this.paused; this.emit(); return;
    }
    if (code === "KeyR" && this.screen !== "menu") { this.startRound(); return; }

    if (this.screen === "menu") {
      if (code === "Digit1" || code === "Numpad1") { this.gameMode = "classic"; this.startRound(); return; }
      if (code === "Digit2" || code === "Numpad2") { this.gameMode = "21"; this.startGame21(); return; }
      if (code === "Enter" || code === "Space") {
        if (this.gameMode === "21") this.startGame21(); else this.startRound();
        return;
      }
      if (code === "ArrowLeft" || code === "ArrowRight") {
        this.gameMode = this.gameMode === "classic" ? "21" : "classic"; return;
      }
    }
    if (this.screen === "summary" && (code === "Enter" || code === "Space" || code === "KeyR")) { this.startRound(); return; }
    if (this.screen === "summary21" && (code === "Enter" || code === "Space" || code === "KeyR")) { this.startGame21(); return; }

    if (this.screen === "play" && !this.paused) {
      if (this.shotState === "aiming"  && (code === "Enter" || code === "Space")) { this.shoot(); return; }
      if (this.shotState === "result"  && (code === "Enter" || code === "Space")) { this.advanceShot(); return; }
    }

    if (this.screen === "play21" && this.g21) {
      this.onKeyDown21(code);
    }
  }

  onKeyDown21(code) {
    const g = this.g21;
    if (g.phase === "playerSelect") {
      if (code === "ArrowLeft")  { g.posIdx = (g.posIdx - 1 + G21_POSITIONS.length) % G21_POSITIONS.length; this.camera = buildCamera(G21_POSITIONS[g.posIdx]); }
      if (code === "ArrowRight") { g.posIdx = (g.posIdx + 1) % G21_POSITIONS.length; this.camera = buildCamera(G21_POSITIONS[g.posIdx]); }
      if (code === "Enter" || code === "Space") { this.g21confirmPos(); }
    }
    if (g.phase === "playerAim" || g.phase === "playerFT" || g.phase === "playerBounceAim") {
      if (code === "Enter" || code === "Space") { this.g21shoot(); }
    }
    if (g.phase === "gameOver") {
      if (code === "Enter" || code === "Space" || code === "KeyR") { this.startGame21(); }
    }
  }

  onKeyUp(e) { this.keys[e.code] = false; }

  onCanvasClick(e) {
    if (this.screen === "menu") {
      // Detect which mode card was clicked
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (this.vW / rect.width);
      const my = (e.clientY - rect.top)  * (this.vH / rect.height);
      const cw = Math.min(620, this.vW * 0.90);
      const mcW = (cw - 56 - 16) / 2;
      const mcX1 = this.vW / 2 - cw / 2 + 28;
      const mcX2 = mcX1 + mcW + 16;
      const mcY  = this.vH / 2 - 360 / 2 - 10 + 82;
      if (mx >= mcX1 && mx <= mcX1 + mcW && my >= mcY && my <= mcY + 175) {
        this.gameMode = "classic"; this.startRound(); return;
      }
      if (mx >= mcX2 && mx <= mcX2 + mcW && my >= mcY && my <= mcY + 175) {
        this.gameMode = "21"; this.startGame21(); return;
      }
      return;
    }
    if (this.screen === "summary") { this.startRound(); return; }
    if (this.screen === "summary21") { this.startGame21(); return; }
    if (this.screen === "play" && !this.paused) {
      if (this.shotState === "aiming")  { this.shoot();       return; }
      if (this.shotState === "result")  { this.advanceShot(); return; }
    }
    if (this.screen === "play21" && this.g21) {
      const g = this.g21;
      if (g.phase === "playerSelect") { this.g21confirmPos(); return; }
      if (g.phase === "playerAim" || g.phase === "playerFT" || g.phase === "playerBounceAim") { this.g21shoot(); return; }
    }
  }

  // ── Update ───────────────────────────────────────────────────
  applyAimKeys(dt) {
    const k = this.keys;
    const ARC = 20 * dt, LAT = 18 * dt, POW = 0.25 * dt;
    let dirty = false;
    if (k["ArrowUp"]   || k["KeyI"]) { this.aim.arc   = clamp(this.aim.arc   + ARC, MIN_ARC,     MAX_ARC);     dirty = true; }
    if (k["ArrowDown"] || k["KeyK"]) { this.aim.arc   = clamp(this.aim.arc   - ARC, MIN_ARC,     MAX_ARC);     dirty = true; }
    if (k["ArrowLeft"] || k["KeyJ"]) { this.aim.lat   = clamp(this.aim.lat   - LAT, -MAX_LATERAL, MAX_LATERAL); dirty = true; }
    if (k["ArrowRight"]|| k["KeyL"]) { this.aim.lat   = clamp(this.aim.lat   + LAT, -MAX_LATERAL, MAX_LATERAL); dirty = true; }
    if (k["KeyW"] || k["Equal"])     { this.aim.power = clamp(this.aim.power + POW, MIN_POWER,   MAX_POWER);   dirty = true; }
    if (k["KeyS"] || k["Minus"])     { this.aim.power = clamp(this.aim.power - POW, MIN_POWER,   MAX_POWER);   dirty = true; }
    if (dirty) this.previewDirty = true;
  }

  update(dt) {
    this.time += dt;
    if (this.screen === "play21") { this.update21(dt); return; }
    if (this.screen !== "play" || this.paused) return;

    if (this.shotState === "aiming") {
      this.applyAimKeys(dt);
      if (this.previewDirty) {
        this.preview = previewTrajectory(this.pos, this.aim.arc, this.aim.power, this.aim.lat);
        this.previewDirty = false;
      }
    }

    if (this.shotState === "flight" && this.ball) {
      const SUBS = 4, sdt = dt / SUBS;
      let terminal = null;
      for (let i = 0; i < SUBS && !terminal; i++) {
        const prev = { ...this.ball };
        stepBall(this.ball, sdt);
        if (i === 0) {
          this.trail.push({ x: this.ball.x, y: this.ball.y, z: this.ball.z });
          if (this.trail.length > 45) this.trail.shift();
        }
        const col = checkCollisions(this.ball, prev);
        if (col) {
          if (col.type === "basket") terminal = col;
          else if (col.type === "ground" || col.type === "miss") terminal = col;
          // rim / backboard: velocity already modified, continue flight
        }
      }
      if (terminal) {
        const made = terminal.type === "basket";
        this.results.push({ made, pts: made ? this.pos.pts : 0 });
        if (made) { this.roundPts += this.pos.pts; this.netSway = 1.0; }
        this.resultType  = terminal.type;
        this.resultTimer = 0;
        this.shotState   = "result";
        this.emit();
      }
    }

    if (this.shotState === "result") {
      this.resultTimer += dt;
      this.netSway = Math.max(0, this.netSway - dt * 1.4);
      if (this.resultTimer > 2.4) this.advanceShot();
    }
  }

  advanceTime(ms = DT_MS) {
    const steps = Math.max(1, Math.round(Number(ms) / DT_MS));
    for (let i = 0; i < steps; i++) this.update(DT);
    this.render();
  }

  setVirtualKey(code, pressed) {
    if (!code) {
      return;
    }
    this.keys[code] = Boolean(pressed);
  }

  pressVirtualKey(code) {
    if (!code) {
      return;
    }
    this.onKeyDown({ code, preventDefault() {}, repeat: false });
    this.onKeyUp({ code });
  }

  frame(ts) {
    if (!this.running) return;
    const el = Math.min(0.1, (ts - this.lastFrame) / 1000);
    this.lastFrame = ts;
    this.accumulator += el;
    while (this.accumulator >= DT) { this.update(DT); this.accumulator -= DT; }
    this.render();
    this.raf = requestAnimationFrame(this._onFrame);
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════
  render() {
    const ctx = this.ctx, vW = this.vW, vH = this.vH;
    ctx.clearRect(0, 0, vW, vH);

    if (this.screen === "menu")       { this.drawMenu(ctx, vW, vH);       return; }
    if (this.screen === "summary")    { this.drawSummary(ctx, vW, vH);    return; }
    if (this.screen === "play21")     { this.drawPlay21(ctx, vW, vH);     return; }
    if (this.screen === "summary21")  { this.drawSummary21(ctx, vW, vH);  return; }

    // Split: court view left 68%, HUD panel right 32%
    const courtW = Math.floor(vW * 0.68);
    const cam = this.camera;

    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, courtW, vH); ctx.clip();
    this.drawGym(ctx, cam, vW, vH);
    this.drawFloor(ctx, cam, vW, vH);
    this.drawCourtLines(ctx, cam, vW, vH);
    this.drawBasket(ctx, cam, vW, vH);
    if (this.shotState === "aiming" && this.preview.length > 2) this.drawPreview(ctx, cam, vW, vH);
    if (this.ball) { this.drawBallTrail(ctx, cam, vW, vH); this.drawBall(ctx, cam, vW, vH); }
    this.drawPlayerMarker(ctx, cam, vW, vH);
    if (this.shotState === "result") this.drawResultFlash(ctx, courtW, vH);
    if (this.paused) this.drawPause(ctx, courtW, vH);
    ctx.restore();

    this.drawHUD(ctx, vW, vH, courtW);
  }

  // ── Menu screen ──────────────────────────────────────────────
  drawMenu(ctx, vW, vH) {
    // Background court preview (dimmed)
    const previewCam = (() => {
      const c = buildCamera({ x: 1.5, z: 7, idealPower: 1, idealArc: 50 });
      c.y = 4.2;
      const fX = 0 - c.x, fY = RIM_HEIGHT - c.y, fZ = 0 - c.z;
      const fH = Math.sqrt(fX * fX + fZ * fZ);
      c.yaw = Math.atan2(fX, fZ); c.pitch = Math.atan2(fY, fH);
      return c;
    })();
    ctx.globalAlpha = 0.35;
    this.drawGym(ctx, previewCam, vW, vH);
    this.drawFloor(ctx, previewCam, vW, vH);
    this.drawCourtLines(ctx, previewCam, vW, vH);
    this.drawBasket(ctx, previewCam, vW, vH);
    ctx.globalAlpha = 1;

    // Dark overlay
    ctx.fillStyle = "rgba(8,12,22,0.76)"; ctx.fillRect(0, 0, vW, vH);

    const compactMenu = vW <= 560;
    const tightMenu = vW <= 420;

    // Main card
    const cw = Math.min(compactMenu ? 520 : 620, vW * 0.92), ch = compactMenu ? 320 : 360;
    const cx = vW / 2 - cw / 2, cy = vH / 2 - ch / 2 - (compactMenu ? 0 : 10);
    ctx.fillStyle = "rgba(9,14,26,0.94)";
    ctx.beginPath(); roundRect(ctx, cx, cy, cw, ch, 18); ctx.fill();
    ctx.strokeStyle = "rgba(240,160,48,0.32)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); roundRect(ctx, cx, cy, cw, ch, 18); ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = C.accentOrange;
    ctx.font = `bold ${compactMenu ? 22 : 26}px Arial, sans-serif`;
    ctx.fillText("🏀  Basketball", vW / 2, cy + (compactMenu ? 38 : 42));
    ctx.fillStyle = "#6888a8"; ctx.font = `${tightMenu ? 11 : 13}px Arial, sans-serif`;
    wrapText(ctx, "Selecciona un modo de juego / Select game mode", vW / 2, cy + (compactMenu ? 58 : 64), cw - 36, tightMenu ? 12 : 13);

    // Mode cards: Classic (left) | 21 (right)
    const mcGap = compactMenu ? 12 : 16, mcW = (cw - 56 - mcGap) / 2, mcH = compactMenu ? (tightMenu ? 152 : 148) : 175;
    const mcY = cy + (compactMenu ? 88 : 82);
    const mcX1 = cx + 28, mcX2 = cx + 28 + mcW + mcGap;
    const mcY2 = mcY;

    const drawModeCard = (x, y, w, h, selected, accent, title, sub, lines, keyHint) => {
      const isHov = this.gameMode === selected;
      const titleFont = compactMenu ? 14 : 17;
      const subFont = tightMenu ? 8 : compactMenu ? 9 : 11;
      const bodyFont = tightMenu ? 7 : compactMenu ? 8 : 11;
      const buttonFont = tightMenu ? 10 : 12;
      const bodyLineGap = compactMenu ? 10 : 18;
      const buttonH = compactMenu ? 26 : 30;
      const buttonY = y + h - (compactMenu ? 34 : 40);
      const textWidth = w - 26;
      ctx.fillStyle = isHov ? "rgba(240,160,48,0.10)" : "rgba(255,255,255,0.04)";
      ctx.beginPath(); roundRect(ctx, x, y, w, h, 12); ctx.fill();
      ctx.strokeStyle = isHov ? accent : "rgba(255,255,255,0.10)";
      ctx.lineWidth = isHov ? 2 : 1;
      ctx.beginPath(); roundRect(ctx, x, y, w, h, 12); ctx.stroke();
      ctx.textAlign = "center";
      const cx2 = x + w / 2;
      ctx.fillStyle = isHov ? accent : "#a0b8d0";
      ctx.font = `bold ${titleFont}px Arial, sans-serif`;
      wrapText(ctx, title, cx2, y + 24, textWidth, compactMenu ? 13 : 16);
      ctx.fillStyle = "#5878a0"; ctx.font = `${subFont}px Arial, sans-serif`;
      let lineY = wrapText(ctx, sub, cx2, y + (compactMenu ? 40 : 46), textWidth, compactMenu ? 10 : 13) + (compactMenu ? 10 : 22);
      const visibleLines = compactMenu ? [] : lines;
      visibleLines.forEach((ln, i) => {
        if (i > 0 && compactMenu && lineY >= buttonY - 8) return;
        ctx.fillStyle = "#486080"; ctx.font = `${bodyFont}px Arial, sans-serif`;
        lineY = wrapText(ctx, ln, cx2, lineY, textWidth, bodyLineGap) + (compactMenu ? 4 : 6);
      });
      const by2 = buttonY, bw2 = w - 24;
      const btnG = ctx.createLinearGradient(x + 12, by2, x + 12, by2 + buttonH);
      if (isHov) { btnG.addColorStop(0, "#d86010"); btnG.addColorStop(1, "#9a3c08"); }
      else       { btnG.addColorStop(0, "#243448"); btnG.addColorStop(1, "#182838"); }
      ctx.fillStyle = btnG;
      ctx.beginPath(); roundRect(ctx, x + 12, by2, bw2, buttonH, 7); ctx.fill();
      ctx.fillStyle = isHov ? "#fff" : "#6888a8";
      ctx.font = `bold ${buttonFont}px Arial, sans-serif`;
      ctx.fillText(keyHint, cx2, by2 + (compactMenu ? 17 : 20));
    };

    drawModeCard(mcX1, mcY, mcW, mcH, "classic", C.accentOrange,
      "Court Pro",
      this.locale === "es" ? "6 posiciones · 1 ronda · Puntúa máximo" : "6 spots · 1 round · Score max",
      compactMenu
        ? (this.locale === "es"
          ? ["6 posiciones reglamentarias", "Libres, media distancia y triples"]
          : ["6 regulation spots", "Free throws, mid-range and 3s"])
        : (this.locale === "es"
          ? ["Tira desde 6 posiciones", "reglamentarias", "Tiro libre, media distancia,", "triples desde todas las zonas"]
          : ["Shoot from 6 regulation", "positions", "Free throw, mid-range,", "3-pointers from all zones"]),
      this.locale === "es" ? "Jugar Court Pro  (1)" : "Play Court Pro  (1)"
    );

    drawModeCard(mcX2, mcY2, mcW, mcH, "21", "#40d878",
      "El 21",
      this.locale === "es" ? "1 vs IA · Primero en llegar a 21 gana" : "1 vs AI · First to 21 wins",
      this.locale === "es"
        ? ["Canastas = +2 pts", "Tiros libres = +1 pt (hasta fallar)", "Rebote disputado tras fallo", "¡Pasarse de 21 baja la puntuación!"]
        : ["Field goals = +2 pts", "Free throws = +1 pt (until miss)", "Rebound contest on FT miss", "Busting 21 resets your score!"],
      this.locale === "es" ? "Jugar El 21  (2)" : "Play 21  (2)"
    );

    // Current best scores row
    ctx.textAlign = "center"; ctx.fillStyle = "#3a5068"; ctx.font = "11px Arial, sans-serif";
    const bestC  = this.best;
    const best21 = this.loadG21Best();
    ctx.fillText(
      (this.locale === "es" ? "Récord Court Pro:" : "Court Pro best:") + ` ${bestC}/${MAX_POSSIBLE}` +
      "    " +
      (this.locale === "es" ? "Récord El 21:" : "21 best:") + ` ${best21}`,
      vW / 2, cy + ch - (compactMenu ? 10 : 14)
    );
  }

  // ── Summary screen ───────────────────────────────────────────
  drawSummary(ctx, vW, vH) {
    ctx.fillStyle = "rgba(8,12,22,0.97)"; ctx.fillRect(0, 0, vW, vH);
    const cw = Math.min(560, vW * 0.88), ch = 400;
    const cx = vW / 2 - cw / 2, cy = vH / 2 - ch / 2;
    ctx.fillStyle = "rgba(12,18,32,0.96)";
    ctx.beginPath(); roundRect(ctx, cx, cy, cw, ch, 18); ctx.fill();
    ctx.strokeStyle = this.newBest ? "rgba(255,215,0,0.55)" : "rgba(240,120,30,0.38)";
    ctx.lineWidth = 2;
    ctx.beginPath(); roundRect(ctx, cx, cy, cw, ch, 18); ctx.stroke();

    const ui = this.ui.summary;
    ctx.textAlign = "center";
    ctx.fillStyle = C.accentOrange;
    ctx.font = "bold 24px Arial, sans-serif";
    ctx.fillText(ui.title, vW / 2, cy + 44);

    if (this.newBest) {
      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 15px Arial, sans-serif";
      ctx.fillText(ui.newRecord, vW / 2, cy + 70);
    }

    // Results table
    const tx = cx + 28, baseY = cy + 98, colW = (cw - 56) / 4;
    ctx.textAlign = "left";
    ctx.fillStyle = C.textMuted;
    ctx.font = "11px Arial, sans-serif";
    ["Posición / Position","Dist","Pts",""].forEach((h, i) => {
      ctx.fillText(h, tx + i * colW, baseY);
    });
    this.results.forEach((r, i) => {
      const sp  = SHOT_POSITIONS[i];
      const lbl = this.locale === "es" ? sp.labelEs : sp.labelEn;
      const Dh  = Math.sqrt(sp.x * sp.x + sp.z * sp.z).toFixed(1);
      const ry  = baseY + 22 + i * 28;
      ctx.fillStyle = r.made ? "#44d878" : "#d84444";
      ctx.font = "13px Arial, sans-serif";
      ctx.fillText(lbl, tx, ry);
      ctx.fillText(`${Dh}m`, tx + colW, ry);
      ctx.fillText(r.made ? `+${r.pts}` : "0", tx + colW * 2, ry);
      ctx.fillText(r.made ? "✓" : "✗", tx + colW * 3 + 20, ry);
    });

    const madeCount = this.results.filter(r => r.made).length;
    ctx.textAlign = "center";
    ctx.fillStyle = "#c8d8ec";
    ctx.font = "bold 19px Arial, sans-serif";
    ctx.fillText(
      `${ui.score}: ${this.roundPts} / ${MAX_POSSIBLE}   ·   ${ui.made}: ${madeCount} / ${SHOT_POSITIONS.length}`,
      vW / 2, cy + ch - 88
    );
    if (!this.newBest && this.best > 0) {
      ctx.fillStyle = C.textMuted;
      ctx.font = "13px Arial, sans-serif";
      ctx.fillText(`${ui.best}: ${this.best}`, vW / 2, cy + ch - 64);
    }

    // Button
    const bw = 220, bh = 40, bx = vW / 2 - bw / 2, by = cy + ch - 48;
    const bg = ctx.createLinearGradient(bx, by, bx, by + bh);
    bg.addColorStop(0, "#d85c10"); bg.addColorStop(1, "#9a3c08");
    ctx.fillStyle = bg;
    ctx.beginPath(); roundRect(ctx, bx, by, bw, bh, 8); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Arial, sans-serif";
    ctx.fillText(ui.again, vW / 2, by + 26);
  }

  // ── Gym background ───────────────────────────────────────────
  drawGym(ctx, cam, vW, vH) {
    const FAR = 500;
    const hor = p3(cam.x + Math.sin(cam.yaw) * FAR, 0, cam.z + Math.cos(cam.yaw) * FAR, cam, vW, vH);
    const horY = hor ? clamp(hor.y, 0, vH * 0.72) : vH * 0.44;

    // ── Ceiling ──────────────────────────────────────────────
    const cg = ctx.createLinearGradient(0, 0, 0, horY);
    cg.addColorStop(0, "#060b12"); cg.addColorStop(0.55, "#0d1628"); cg.addColorStop(1, "#18223c");
    ctx.fillStyle = cg; ctx.fillRect(0, 0, vW, horY);

    // Main longitudinal beams (top chord)
    const BH = 8.3;
    ctx.strokeStyle = C.truss; ctx.lineWidth = 3.5;
    [-4, 0, 4].forEach(bx => {
      ctx.beginPath(); line3D(ctx, cam, vW, vH, bx, BH, -2, bx, BH, 22); ctx.stroke();
    });

    // Cross beams at regular intervals
    ctx.strokeStyle = C.truss; ctx.lineWidth = 2.5;
    [0, 4, 8, 12, 16, 20].forEach(gz => {
      ctx.beginPath(); line3D(ctx, cam, vW, vH, -8, BH,   gz, 8, BH,   gz); ctx.stroke();
      ctx.beginPath(); line3D(ctx, cam, vW, vH, -8, 7.4,  gz, 8, 7.4,  gz); ctx.stroke();
    });

    // Diagonal braces (celosía) on side walls
    ctx.strokeStyle = C.trussD; ctx.lineWidth = 1.5;
    [0, 4, 8, 12, 16].forEach(gz => {
      [-8, 8].forEach(wx => {
        ctx.beginPath(); line3D(ctx, cam, vW, vH, wx, BH,  gz, wx, 7.4, gz + 4); ctx.stroke();
        ctx.beginPath(); line3D(ctx, cam, vW, vH, wx, 7.4, gz, wx, BH,  gz + 4); ctx.stroke();
      });
    });

    // ── Ceiling lights (luminarias industriales) ──────────────
    [1, 5.5, 10, 14.5, 19].forEach(lz => {
      [-3.5, 0, 3.5].forEach(lx => {
        const lp = p3(lx, 8.8, lz, cam, vW, vH);
        if (!lp || lp.depth > 220) return;
        const r = Math.max(2.5, 160 / (lp.depth + 1));

        // Outer glow
        const lg = ctx.createRadialGradient(lp.x, lp.y, 0, lp.x, lp.y, r * 7);
        lg.addColorStop(0, "rgba(255,250,210,0.16)");
        lg.addColorStop(0.5, "rgba(255,245,200,0.05)");
        lg.addColorStop(1, "rgba(255,245,200,0)");
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.arc(lp.x, lp.y, r * 7, 0, Math.PI * 2); ctx.fill();

        // Fixture housing
        ctx.fillStyle = "rgba(50,62,92,0.92)";
        ctx.fillRect(lp.x - r * 2.2, lp.y - r * 0.4, r * 4.4, r * 0.8);

        // Bright bulb core
        ctx.fillStyle = "rgba(255,252,225,0.93)";
        ctx.beginPath(); ctx.arc(lp.x, lp.y, r * 0.88, 0, Math.PI * 2); ctx.fill();
      });
    });

    // ── Side walls with colour band & panel divisions ─────────
    [-7.5, 7.5].forEach((wx) => {
      const wPts = [
        p3(wx, 0, -2, cam, vW, vH), p3(wx, 7, -2, cam, vW, vH),
        p3(wx, 7, 22, cam, vW, vH), p3(wx, 0, 22, cam, vW, vH),
      ].filter(Boolean);
      if (wPts.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(wPts[0].x, wPts[0].y);
        wPts.slice(1).forEach(pt => ctx.lineTo(pt.x, pt.y));
        ctx.closePath();
        const wg = ctx.createLinearGradient(0, wPts[1]?.y ?? 0, 0, wPts[0]?.y ?? vH);
        wg.addColorStop(0, C.wallDark); wg.addColorStop(0.65, C.wallMid); wg.addColorStop(1, C.wallLight);
        ctx.fillStyle = wg; ctx.fill();
        // Accent stripe
        ctx.strokeStyle = "rgba(240,120,20,0.22)"; ctx.lineWidth = 4;
        ctx.beginPath(); line3D(ctx, cam, vW, vH, wx, 2.0, -2, wx, 2.0, 22); ctx.stroke();
        ctx.strokeStyle = "rgba(240,120,20,0.10)"; ctx.lineWidth = 2;
        ctx.beginPath(); line3D(ctx, cam, vW, vH, wx, 2.35, -2, wx, 2.35, 22); ctx.stroke();
        // Panel dividers
        ctx.strokeStyle = "rgba(55,75,115,0.20)"; ctx.lineWidth = 0.8;
        [0, 4, 8, 12, 16, 20].forEach(pz => {
          ctx.beginPath(); line3D(ctx, cam, vW, vH, wx, 0, pz, wx, 7, pz); ctx.stroke();
        });
      }
    });

    // ── Back wall with scoreboard & banners ───────────────────
    const bwPts = [
      p3(-8, 0, -2, cam, vW, vH), p3(-8, 8, -2, cam, vW, vH),
      p3( 8, 8, -2, cam, vW, vH), p3( 8, 0, -2, cam, vW, vH),
    ].filter(Boolean);
    if (bwPts.length === 4) {
      ctx.beginPath();
      ctx.moveTo(bwPts[0].x, bwPts[0].y);
      bwPts.slice(1).forEach(pt => ctx.lineTo(pt.x, pt.y));
      ctx.closePath();
      const bwg = ctx.createLinearGradient(0, bwPts[1].y, 0, bwPts[0].y);
      bwg.addColorStop(0, "#08101e"); bwg.addColorStop(1, "#16243a");
      ctx.fillStyle = bwg; ctx.fill();

      // Scoreboard
      const sbTL = p3(-2.8, 5.8, -1.92, cam, vW, vH);
      const sbBR = p3( 2.8, 4.1, -1.92, cam, vW, vH);
      if (sbTL && sbBR) {
        const isMode21 = (this.screen === "play21" || this.screen === "summary21") && !!this.g21;
        const leftLabel = isMode21
          ? (this.locale === "es" ? "JUG" : "YOU")
          : "HOME";
        const rightLabel = isMode21
          ? (this.locale === "es" ? "IA" : "AI")
          : "AWAY";
        const leftScore = isMode21 ? (this.g21.playerScore ?? 0) : this.roundPts;
        const rightScore = isMode21 ? (this.g21.aiScore ?? 0) : 0;

        const sbW = Math.abs(sbBR.x - sbTL.x), sbH = Math.abs(sbBR.y - sbTL.y);
        const sbX = Math.min(sbTL.x, sbBR.x), sbY = Math.min(sbTL.y, sbBR.y);
        ctx.fillStyle = C.scoreBoard; ctx.fillRect(sbX, sbY, sbW, sbH);
        ctx.strokeStyle = C.scoreBorder; ctx.lineWidth = 1.5;
        ctx.strokeRect(sbX + 1, sbY + 1, sbW - 2, sbH - 2);
        if (sbW > 24) {
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          const fs = Math.max(7, sbH * 0.38);
          ctx.fillStyle = "#ff6020"; ctx.font = `bold ${fs}px monospace`;
          ctx.fillText(leftLabel, sbX + sbW * 0.25, sbY + sbH * 0.30);
          ctx.fillText(rightLabel, sbX + sbW * 0.75, sbY + sbH * 0.30);
          ctx.strokeStyle = "rgba(255,100,20,0.28)"; ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.moveTo(sbX + sbW * 0.5, sbY + 2); ctx.lineTo(sbX + sbW * 0.5, sbY + sbH - 2); ctx.stroke();
          ctx.fillStyle = "#ffcc00"; ctx.font = `bold ${Math.max(10, sbH * 0.54)}px monospace`;
          ctx.fillText(String(leftScore).padStart(2, "0"), sbX + sbW * 0.25, sbY + sbH * 0.70);
          ctx.fillText(String(rightScore).padStart(2, "0"), sbX + sbW * 0.75, sbY + sbH * 0.70);
          ctx.textBaseline = "alphabetic";
        }
      }

      // Team banners
      [-5.5, 5.5].forEach((bx, bi) => {
        const t = p3(bx, 6.9, -1.94, cam, vW, vH);
        const b2 = p3(bx, 5.1, -1.94, cam, vW, vH);
        const tr = p3(bx + 0.95, 6.9, -1.94, cam, vW, vH);
        if (t && b2 && tr) {
          const bw2 = Math.abs(tr.x - t.x), bh2 = Math.abs(b2.y - t.y);
          ctx.fillStyle = bi === 0 ? C.bannerBlue : C.bannerRed;
          ctx.fillRect(t.x, t.y, bw2, bh2);
          ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 0.5;
          ctx.strokeRect(t.x, t.y, bw2, bh2);
          ctx.fillStyle = "rgba(255,255,255,0.14)";
          ctx.fillRect(t.x, t.y + bh2 * 0.42, bw2, bh2 * 0.16);
        }
      });
    }
  }

  // ── Floor ────────────────────────────────────────────────────
  drawFloor(ctx, cam, vW, vH) {
    const FAR = 500;
    const hor = p3(cam.x + Math.sin(cam.yaw) * FAR, 0, cam.z + Math.cos(cam.yaw) * FAR, cam, vW, vH);
    const horY = hor ? clamp(hor.y, 0, vH * 0.72) : vH * 0.44;

    // Base hardwood gradient – warm maple tones
    const fg = ctx.createLinearGradient(0, horY, 0, vH);
    fg.addColorStop(0,    C.floorFar);
    fg.addColorStop(0.38, C.floorMid);
    fg.addColorStop(1,    C.floorNear);
    ctx.fillStyle = fg; ctx.fillRect(0, horY, vW, vH - horY);

    // Alternating plank colour bands (every 2 planks slightly darker)
    const PW = 0.30;
    for (let px = -7.5; px <= 7.5; px += PW * 2) {
      const n0 = p3(px,      0.001, 0,  cam, vW, vH);
      const n1 = p3(px + PW, 0.001, 0,  cam, vW, vH);
      const f0 = p3(px,      0.001, 22, cam, vW, vH);
      const f1 = p3(px + PW, 0.001, 22, cam, vW, vH);
      if (!n0 || !n1 || !f0 || !f1) continue;
      ctx.beginPath();
      ctx.moveTo(n0.x, n0.y); ctx.lineTo(n1.x, n1.y);
      ctx.lineTo(f1.x, f1.y); ctx.lineTo(f0.x, f0.y);
      ctx.closePath();
      ctx.fillStyle = C.floorAlt; ctx.fill();
    }

    // Plank separation lines (lengthwise grain)
    ctx.strokeStyle = C.floorLine; ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let px = -7.5; px <= 7.5; px += PW) {
      const near = p3(px, 0.001, 0,  cam, vW, vH);
      const far  = p3(px, 0.001, 22, cam, vW, vH);
      if (near && far) { ctx.moveTo(near.x, near.y); ctx.lineTo(far.x, far.y); }
    }
    ctx.stroke();

    // Cross-grain end cuts every ~1.2 m (more fine-grained)
    ctx.strokeStyle = "rgba(0,0,0,0.06)"; ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let pz = 0; pz <= 22; pz += 1.2) {
      const l = p3(-7.5, 0.001, pz, cam, vW, vH);
      const r = p3( 7.5, 0.001, pz, cam, vW, vH);
      if (l && r) { ctx.moveTo(l.x, l.y); ctx.lineTo(r.x, r.y); }
    }
    ctx.stroke();

    // Varnish gloss highlight near camera
    const g0 = p3(0, 0.002, 0.5, cam, vW, vH);
    const g1 = p3(0, 0.002, 3.5, cam, vW, vH);
    if (g0 && g1) {
      const glosG = ctx.createLinearGradient(0, g0.y, 0, g1.y);
      glosG.addColorStop(0, C.floorGloss);
      glosG.addColorStop(0.5, "rgba(255,215,150,0.03)");
      glosG.addColorStop(1, "rgba(255,215,150,0)");
      ctx.fillStyle = glosG;
      ctx.fillRect(0, g0.y, vW, vH - g0.y);
    }
  }

  // ── Court markings ───────────────────────────────────────────
  drawCourtLines(ctx, cam, vW, vH) {
    const BL_Z = -1.575; // baseline behind basket

    // Paint fill
    const paintCorners = [
      p3(-1.8, 0.01, BL_Z, cam, vW, vH), p3(1.8, 0.01, BL_Z, cam, vW, vH),
      p3(1.8,  0.01, 4.6,  cam, vW, vH), p3(-1.8, 0.01, 4.6,  cam, vW, vH),
    ].filter(Boolean);
    if (paintCorners.length === 4) {
      ctx.beginPath();
      ctx.moveTo(paintCorners[0].x, paintCorners[0].y);
      paintCorners.slice(1).forEach(pt => ctx.lineTo(pt.x, pt.y));
      ctx.closePath();
      ctx.fillStyle = C.paint; ctx.fill();
    }

    ctx.strokeStyle = C.courtLine; ctx.lineWidth = 2;

    // Helper for arc segment
    const drawArc3D = (r, fromA, toA, segs, yOff = 0.01, cx3 = 0, cz3 = 0) => {
      ctx.beginPath();
      let first = true;
      for (let i = 0; i <= segs; i++) {
        const a  = fromA + (toA - fromA) * (i / segs);
        const pt = p3(cx3 + Math.cos(a) * r, yOff, cz3 + Math.sin(a) * r, cam, vW, vH);
        if (!pt) { first = true; continue; }
        first ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
        first = false;
      }
      ctx.stroke();
    };

    // Baseline
    ctx.beginPath(); line3D(ctx, cam, vW, vH, -7.5, 0.01, BL_Z, 7.5, 0.01, BL_Z); ctx.stroke();

    // Lane lines
    ctx.beginPath();
    line3D(ctx, cam, vW, vH, -1.8, 0.01, BL_Z, -1.8, 0.01, 4.6);
    line3D(ctx, cam, vW, vH,  1.8, 0.01, BL_Z,  1.8, 0.01, 4.6);
    ctx.stroke();

    // Free throw line
    ctx.beginPath(); line3D(ctx, cam, vW, vH, -1.8, 0.01, 4.6, 1.8, 0.01, 4.6); ctx.stroke();

    // Free throw semi-circle (above line, toward half-court)
    drawArc3D(1.8, 0, Math.PI, 24, 0.01, 0, 4.6);

    // Restricted area arc
    drawArc3D(1.25, 0, Math.PI, 20);

    // 3-point arc – only the portion above z=-0.5 and within ±6.6
    ctx.beginPath();
    let first = true;
    for (let i = 0; i <= 64; i++) {
      const a  = (i / 64) * Math.PI;
      const ax = Math.cos(a) * 6.75;
      const az = Math.sin(a) * 6.75;
      if (Math.abs(ax) > 6.6 && az < 0.9) { first = true; continue; }
      const pt = p3(ax, 0.01, az, cam, vW, vH);
      if (!pt) { first = true; continue; }
      first ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
      first = false;
    }
    ctx.stroke();

    // Corner 3 straight lines
    ctx.beginPath();
    line3D(ctx, cam, vW, vH,  6.6, 0.01, BL_Z,  6.6, 0.01, 0.9);
    line3D(ctx, cam, vW, vH, -6.6, 0.01, BL_Z, -6.6, 0.01, 0.9);
    ctx.stroke();

    // Lane hash marks
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    [0.9, 1.75, 2.9, 3.6].forEach(hz => {
      line3D(ctx, cam, vW, vH,  1.8, 0.01, hz, 2.45, 0.01, hz);
      line3D(ctx, cam, vW, vH, -1.8, 0.01, hz, -2.45, 0.01, hz);
    });
    ctx.stroke();

    // Basket centre dot
    ctx.lineWidth = 2;
    drawArc3D(0.18, 0, Math.PI * 2, 12);

    // Shot position markers
    SHOT_POSITIONS.forEach((sp, i) => {
      const pt = p3(sp.x, 0.025, sp.z, cam, vW, vH);
      if (!pt) return;
      const isCurrent = this.screen === "play" && i === this.shotIdx;
      const wasShot   = this.results[i] !== undefined;
      const made      = this.results[i]?.made;
      const r = clamp(300 / (pt.depth + 1), 4, 14);
      ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isCurrent
        ? "rgba(255,185,30,0.9)"
        : wasShot ? (made ? "rgba(50,210,90,0.7)" : "rgba(210,50,50,0.7)")
        : "rgba(180,190,220,0.25)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  // ── Basket ───────────────────────────────────────────────────
  drawBasket(ctx, cam, vW, vH) {
    // ── Support structure ──────────────────────────────────────
    // Base plate
    const basePt = p3(0, 0.04, -1.22, cam, vW, vH);
    if (basePt) {
      ctx.fillStyle = "#383f50";
      ctx.beginPath(); ctx.ellipse(basePt.x, basePt.y, 9, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    }

    // Main pole with 3D gradient
    const poleBot = p3(0, 0,    -1.22, cam, vW, vH);
    const poleTop = p3(0, 3.35, -1.22, cam, vW, vH);
    if (poleBot && poleTop) {
      const pw = Math.max(3, 7 / (poleBot.depth + 0.5));
      const polG = ctx.createLinearGradient(poleBot.x - pw * 2, 0, poleBot.x + pw * 2, 0);
      polG.addColorStop(0, "#22303f"); polG.addColorStop(0.35, "#50636e");
      polG.addColorStop(0.65, "#607080"); polG.addColorStop(1, "#22303f");
      ctx.strokeStyle = polG; ctx.lineWidth = pw * 2;
      ctx.beginPath(); ctx.moveTo(poleBot.x, poleBot.y); ctx.lineTo(poleTop.x, poleTop.y); ctx.stroke();
    }

    // Horizontal arm + diagonal brace
    ctx.strokeStyle = "#455060"; ctx.lineWidth = 3.5;
    ctx.beginPath(); line3D(ctx, cam, vW, vH, 0, 3.35, -1.22, 0, 3.35, BACKBOARD_Z - 0.04); ctx.stroke();
    ctx.strokeStyle = "#354050"; ctx.lineWidth = 2;
    ctx.beginPath(); line3D(ctx, cam, vW, vH, 0, 3.05, -1.22, 0, 3.35, BACKBOARD_Z - 0.04); ctx.stroke();

    // ── Backboard (tempered glass look) ───────────────────────
    const BB_HW = 0.915, BB_B = 2.9, BB_T = 3.975;
    const bbPts = [
      p3(-BB_HW, BB_B, BACKBOARD_Z, cam, vW, vH), p3(BB_HW, BB_B, BACKBOARD_Z, cam, vW, vH),
      p3(BB_HW,  BB_T, BACKBOARD_Z, cam, vW, vH), p3(-BB_HW, BB_T, BACKBOARD_Z, cam, vW, vH),
    ];
    if (bbPts.every(Boolean)) {
      // Glass fill
      ctx.beginPath();
      ctx.moveTo(bbPts[0].x, bbPts[0].y);
      bbPts.slice(1).forEach(b => ctx.lineTo(b.x, b.y));
      ctx.closePath();
      ctx.fillStyle = C.bbGlass; ctx.fill();

      // Gloss reflection (left third of backboard)
      const hlPts = [
        p3(-BB_HW * 0.90, BB_T - 0.08, BACKBOARD_Z - 0.001, cam, vW, vH),
        p3(-BB_HW * 0.22, BB_T - 0.08, BACKBOARD_Z - 0.001, cam, vW, vH),
        p3(-BB_HW * 0.22, BB_B + 0.18, BACKBOARD_Z - 0.001, cam, vW, vH),
        p3(-BB_HW * 0.90, BB_B + 0.18, BACKBOARD_Z - 0.001, cam, vW, vH),
      ];
      if (hlPts.every(Boolean)) {
        ctx.beginPath();
        ctx.moveTo(hlPts[0].x, hlPts[0].y);
        hlPts.slice(1).forEach(h => ctx.lineTo(h.x, h.y));
        ctx.closePath();
        ctx.fillStyle = C.bbGlossHL; ctx.fill();
      }

      // Thick border frame
      ctx.beginPath();
      ctx.moveTo(bbPts[0].x, bbPts[0].y);
      bbPts.slice(1).forEach(b => ctx.lineTo(b.x, b.y));
      ctx.closePath();
      ctx.strokeStyle = C.bbEdge; ctx.lineWidth = 4.5; ctx.stroke();

      // Inner border line
      const FR = 0.065;
      const ibbPts = [
        p3(-(BB_HW - FR), BB_B + FR, BACKBOARD_Z - 0.002, cam, vW, vH),
        p3(  BB_HW - FR,  BB_B + FR, BACKBOARD_Z - 0.002, cam, vW, vH),
        p3(  BB_HW - FR,  BB_T - FR, BACKBOARD_Z - 0.002, cam, vW, vH),
        p3(-(BB_HW - FR), BB_T - FR, BACKBOARD_Z - 0.002, cam, vW, vH),
      ];
      if (ibbPts.every(Boolean)) {
        ctx.beginPath();
        ctx.moveTo(ibbPts[0].x, ibbPts[0].y);
        ibbPts.slice(1).forEach(b => ctx.lineTo(b.x, b.y));
        ctx.closePath();
        ctx.strokeStyle = C.bbFrame; ctx.lineWidth = 1; ctx.stroke();
      }

      // Shooting box (red rectangle)
      const SBW = 0.295, SBH = 0.45, SBB = 2.92;
      const sbPts = [
        p3(-SBW, SBB,       BACKBOARD_Z - 0.003, cam, vW, vH),
        p3( SBW, SBB,       BACKBOARD_Z - 0.003, cam, vW, vH),
        p3( SBW, SBB + SBH, BACKBOARD_Z - 0.003, cam, vW, vH),
        p3(-SBW, SBB + SBH, BACKBOARD_Z - 0.003, cam, vW, vH),
      ];
      if (sbPts.every(Boolean)) {
        ctx.beginPath();
        ctx.moveTo(sbPts[0].x, sbPts[0].y);
        sbPts.slice(1).forEach(s => ctx.lineTo(s.x, s.y));
        ctx.closePath();
        ctx.strokeStyle = C.bbBox; ctx.lineWidth = 2.5; ctx.stroke();
      }
    }

    // ── Rim ────────────────────────────────────────────────────
    const drawRimRing = (rad, y, lw, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = lw;
      ctx.beginPath();
      let rf = true;
      for (let i = 0; i <= 48; i++) {
        const a  = (i / 48) * Math.PI * 2;
        const pt = p3(Math.cos(a) * rad, y, Math.sin(a) * rad, cam, vW, vH);
        if (!pt) { rf = true; continue; }
        rf ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
        rf = false;
      }
      ctx.stroke();
    };

    // Arm from backboard bottom to rim
    ctx.strokeStyle = "#485560"; ctx.lineWidth = 2.5;
    ctx.beginPath(); line3D(ctx, cam, vW, vH, 0, RIM_HEIGHT, BACKBOARD_Z + 0.02, 0, RIM_HEIGHT, RIM_RADIUS); ctx.stroke();

    // Shadow ring (depth illusion)
    drawRimRing(RIM_RADIUS + 0.020, RIM_HEIGHT - 0.016, 7.5, C.rimShadow);
    // Main rim
    drawRimRing(RIM_RADIUS, RIM_HEIGHT, 5.5, C.rim);
    // Top highlight (tube surface)
    drawRimRing(RIM_RADIUS - 0.008, RIM_HEIGHT + 0.007, 2.5, C.rimHighlight);

    // ── Net ────────────────────────────────────────────────────
    const NL = 18, NH = 0.50;
    const swX = Math.sin(this.time * 8) * this.netSway * 0.040;
    const swZ = Math.cos(this.time * 6) * this.netSway * 0.030;

    for (let i = 0; i < NL; i++) {
      const a  = (i / NL) * Math.PI * 2;
      const tX = Math.cos(a) * RIM_RADIUS, tZ = Math.sin(a) * RIM_RADIUS;
      const mX = Math.cos(a) * RIM_RADIUS * 0.56 + swX * 0.5;
      const mZ = Math.sin(a) * RIM_RADIUS * 0.56 + swZ * 0.5;
      const bX = Math.cos(a) * RIM_RADIUS * 0.30 + swX;
      const bZ = Math.sin(a) * RIM_RADIUS * 0.30 + swZ;
      const top = p3(tX, RIM_HEIGHT,          tZ, cam, vW, vH);
      const mid = p3(mX, RIM_HEIGHT - NH * 0.45, mZ, cam, vW, vH);
      const bot = p3(bX, RIM_HEIGHT - NH,     bZ, cam, vW, vH);
      if (!top || !mid || !bot) continue;

      // Shadow string
      ctx.strokeStyle = C.netShadow; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(top.x + 1, top.y + 1);
      ctx.quadraticCurveTo(mid.x + 1, mid.y + 1, bot.x + 1, bot.y + 1);
      ctx.stroke();

      // Main string with slight brightness variation
      const alpha = 0.55 + 0.20 * Math.cos(a);
      ctx.strokeStyle = `rgba(230,240,248,${alpha.toFixed(2)})`; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.quadraticCurveTo(mid.x, mid.y, bot.x, bot.y);
      ctx.stroke();
    }

    // Net horizontal rings (mesh illusion)
    [0.20, 0.42, 0.62, 0.80, 1.0].forEach(t => {
      const rR  = RIM_RADIUS * (1 - t * 0.62);
      const rY  = RIM_HEIGHT - NH * t;
      const rsX = swX * t, rsZ = swZ * t;
      ctx.strokeStyle = `rgba(220,232,242,${(0.50 + t * 0.18).toFixed(2)})`; ctx.lineWidth = 0.9;
      ctx.beginPath();
      let nf = true;
      for (let i = 0; i <= 24; i++) {
        const a  = (i / 24) * Math.PI * 2;
        const pt = p3(Math.cos(a) * rR + rsX, rY, Math.sin(a) * rR + rsZ, cam, vW, vH);
        if (!pt) { nf = true; continue; }
        nf ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
        nf = false;
      }
      ctx.stroke();
    });
  }

  // ── Trajectory preview ───────────────────────────────────────
  drawPreview(ctx, cam, vW, vH) {
    const pts = this.preview;
    const proj = pts.map(pt => p3(pt.x, pt.y, pt.z, cam, vW, vH)).filter(Boolean);
    if (proj.length < 2) return;
    ctx.setLineDash([5, 8]); ctx.lineWidth = 1.8;
    ctx.strokeStyle = "rgba(255,205,45,0.50)";
    ctx.beginPath();
    proj.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
    ctx.stroke();
    ctx.setLineDash([]);
    // Landing marker
    const last = proj[proj.length - 1];
    ctx.beginPath(); ctx.arc(last.x, last.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,205,45,0.65)"; ctx.fill();
  }

  // ── Ball trail ───────────────────────────────────────────────
  drawBallTrail(ctx, cam, vW, vH) {
    ctx.setLineDash([]);
    const n = this.trail.length;
    for (let i = 1; i < n; i++) {
      const a = this.trail[i - 1], b = this.trail[i];
      const pa = p3(a.x, a.y, a.z, cam, vW, vH);
      const pb = p3(b.x, b.y, b.z, cam, vW, vH);
      if (!pa || !pb) continue;
      const t = i / n;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = `rgba(255,135,28,${t * 0.55})`;
      ctx.lineWidth = Math.max(1, t * 6);
      ctx.stroke();
    }
  }

  // ── Ball ─────────────────────────────────────────────────────
  drawBall(ctx, cam, vW, vH) {
    if (!this.ball) return;
    const bp = p3(this.ball.x, this.ball.y, this.ball.z, cam, vW, vH);
    if (!bp) return;
    const sr = clamp(BALL_RADIUS * 360 / (bp.depth + 1.5), 5, 38);

    // Ground shadow (scales with height)
    const sh = p3(this.ball.x, 0, this.ball.z, cam, vW, vH);
    if (sh) {
      const fade = clamp(1 - this.ball.y / 9, 0.04, 0.46);
      const shW  = sr * 1.25 * clamp(1 - this.ball.y * 0.04, 0.4, 1);
      ctx.beginPath(); ctx.ellipse(sh.x, sh.y, Math.max(3, shW), Math.max(2, shW * 0.36), 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,0,0,${fade.toFixed(2)})`; ctx.fill();
    }

    // Outer dark border (depth)
    ctx.beginPath(); ctx.arc(bp.x, bp.y, sr + 1.2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.32)"; ctx.fill();

    // Ball body – 3-stop radial gradient for rounder 3D look
    const grad = ctx.createRadialGradient(
      bp.x - sr * 0.30, bp.y - sr * 0.34, sr * 0.04,
      bp.x + sr * 0.08, bp.y + sr * 0.08, sr * 1.05
    );
    grad.addColorStop(0,    "#ffb848");
    grad.addColorStop(0.28, C.ballHigh);
    grad.addColorStop(0.62, C.ballMid);
    grad.addColorStop(1,    C.ballLow);
    ctx.beginPath(); ctx.arc(bp.x, bp.y, sr, 0, Math.PI * 2);
    ctx.fillStyle = grad; ctx.fill();

    // Seams clipped to ball shape (NBA peanut pattern)
    ctx.save();
    ctx.beginPath(); ctx.arc(bp.x, bp.y, sr, 0, Math.PI * 2); ctx.clip();
    const sw = Math.max(0.7, sr * 0.075);
    ctx.strokeStyle = "rgba(55,16,4,0.52)"; ctx.lineWidth = sw;
    // Equator line
    ctx.beginPath(); ctx.moveTo(bp.x - sr, bp.y); ctx.lineTo(bp.x + sr, bp.y); ctx.stroke();
    // Longitudinal oval
    ctx.beginPath(); ctx.ellipse(bp.x, bp.y, sr * 0.27, sr, 0, 0, Math.PI * 2); ctx.stroke();
    // Upper peanut curve
    ctx.beginPath();
    ctx.moveTo(bp.x - sr, bp.y);
    ctx.bezierCurveTo(bp.x - sr * 0.48, bp.y - sr * 0.44, bp.x + sr * 0.48, bp.y - sr * 0.44, bp.x + sr, bp.y);
    ctx.stroke();
    // Lower peanut curve
    ctx.beginPath();
    ctx.moveTo(bp.x - sr, bp.y);
    ctx.bezierCurveTo(bp.x - sr * 0.48, bp.y + sr * 0.44, bp.x + sr * 0.48, bp.y + sr * 0.44, bp.x + sr, bp.y);
    ctx.stroke();
    ctx.restore();

    // Specular highlight
    const hg = ctx.createRadialGradient(
      bp.x - sr * 0.28, bp.y - sr * 0.32, 0,
      bp.x - sr * 0.16, bp.y - sr * 0.20, sr * 0.46
    );
    hg.addColorStop(0, "rgba(255,255,220,0.40)");
    hg.addColorStop(0.55, "rgba(255,240,200,0.12)");
    hg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.beginPath(); ctx.arc(bp.x, bp.y, sr, 0, Math.PI * 2);
    ctx.fillStyle = hg; ctx.fill();
  }

  // ── Player marker ────────────────────────────────────────────
  drawPlayerMarker(ctx, cam, vW, vH) {
    if (this.screen !== "play") return;
    const pt = p3(this.pos.x, 0.02, this.pos.z, cam, vW, vH);
    if (!pt) return;
    const r = clamp(380 / (pt.depth + 1), 7, 20);
    ctx.strokeStyle = "rgba(255,215,40,0.88)"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pt.x - r * 1.7, pt.y); ctx.lineTo(pt.x - r * 0.55, pt.y);
    ctx.moveTo(pt.x + r * 0.55, pt.y); ctx.lineTo(pt.x + r * 1.7, pt.y);
    ctx.moveTo(pt.x, pt.y - r * 1.7); ctx.lineTo(pt.x, pt.y - r * 0.55);
    ctx.moveTo(pt.x, pt.y + r * 0.55); ctx.lineTo(pt.x, pt.y + r * 1.7);
    ctx.stroke();
  }

  // ── Result flash ─────────────────────────────────────────────
  drawResultFlash(ctx, courtW, vH) {
    const alpha = clamp(1 - (this.resultTimer - 0.4) / 1.4, 0, 1);
    if (alpha <= 0) return;
    const made  = this.resultType === "basket";
    const label = made ? this.ui.result.basket : this.ui.result.miss;
    ctx.save(); ctx.globalAlpha = alpha; ctx.textAlign = "center";
    const baseY = vH / 2 - 50;
    if (made) {
      ctx.shadowBlur = 32; ctx.shadowColor = "#ffd700";
      ctx.fillStyle = "#ffd700"; ctx.font = `bold 52px Arial, sans-serif`;
      ctx.fillText(`🏀 ${label}`, courtW / 2, baseY);
      ctx.shadowBlur = 16;
      ctx.fillStyle = "#fff"; ctx.font = "bold 28px Arial, sans-serif";
      ctx.fillText(`+${this.pos.pts} pt${this.pos.pts > 1 ? "s" : ""}`, courtW / 2, baseY + 44);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = "rgba(215,48,48,0.94)";
      ctx.font = "bold 44px Arial, sans-serif";
      ctx.fillText(label, courtW / 2, baseY);
    }
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "13px Arial, sans-serif";
    ctx.fillText(this.ui.nextHint, courtW / 2, baseY + 82);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Pause overlay ────────────────────────────────────────────
  drawPause(ctx, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.52)"; ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff"; ctx.font = "bold 34px Arial, sans-serif";
    ctx.fillText(this.ui.pauseLabel, w / 2, h / 2 - 8);
    ctx.fillStyle = "#80a0c0"; ctx.font = "15px Arial, sans-serif";
    ctx.fillText(this.ui.pauseResume, w / 2, h / 2 + 22);
  }

  // ── HUD panel ────────────────────────────────────────────────
  drawHUD(ctx, vW, vH, courtW) {
    const panW = vW - courtW;
    const px   = courtW;
    const cx   = px + panW / 2;
    const ui   = this.ui;

    // Panel bg
    const pbg = ctx.createLinearGradient(px, 0, vW, 0);
    pbg.addColorStop(0, C.panelBg0); pbg.addColorStop(1, C.panelBg1);
    ctx.fillStyle = pbg; ctx.fillRect(px, 0, panW, vH);
    ctx.strokeStyle = "rgba(240,160,48,0.18)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, vH); ctx.stroke();

    if (this.screen !== "play") return;

    ctx.textAlign = "center";

    // Title
    ctx.fillStyle = C.accentOrange; ctx.font = "bold 13px Arial, sans-serif";
    ctx.fillText("🏀 " + ui.title, cx, 26);

    // Shot counter
    ctx.fillStyle = C.textMuted; ctx.font = "12px Arial, sans-serif";
    ctx.fillText(`${ui.shotOf[0]} ${this.shotIdx + 1} ${ui.shotOf[1]} ${SHOT_POSITIONS.length}`, cx, 44);

    // Shot label
    const pos = this.pos;
    const lbl = this.locale === "es" ? pos.labelEs : pos.labelEn;
    const dsc = this.locale === "es" ? pos.descEs  : pos.descEn;
    ctx.fillStyle = "#ddeaf8"; ctx.font = "bold 15px Arial, sans-serif";
    ctx.fillText(lbl, cx, 66);
    ctx.fillStyle = C.textMuted; ctx.font = "11px Arial, sans-serif";
    wrapText(ctx, dsc, cx, 82, panW - 20, 14);

    // Aim gauges
    this.gauge(ctx, px + 10, 110, panW - 20, 22, ui.arcLabel,   this.aim.arc,   MIN_ARC,     MAX_ARC,     pos.idealArc,   "°");
    this.gauge(ctx, px + 10, 152, panW - 20, 22, ui.powerLabel, this.aim.power, MIN_POWER,   MAX_POWER,   pos.idealPower, "");
    this.gauge(ctx, px + 10, 194, panW - 20, 22, ui.latLabel,   this.aim.lat,   -MAX_LATERAL, MAX_LATERAL, 0,             "°");

    // Overhead rim view
    this.drawRimTop(ctx, cx, 278, 48);

    // Divider
    ctx.strokeStyle = "rgba(240,160,48,0.15)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 8, 355); ctx.lineTo(vW - 8, 355); ctx.stroke();

    // Score / best
    ctx.textAlign = "left";
    ctx.fillStyle = C.textMuted; ctx.font = "11px Arial, sans-serif";
    ctx.fillText(ui.scoreLabel + ":", px + 12, 374);
    ctx.fillStyle = "#f0d060"; ctx.font = "bold 24px Arial, sans-serif";
    ctx.fillText(`${this.roundPts}`, px + 12, 400);

    ctx.textAlign = "right";
    ctx.fillStyle = C.textMuted; ctx.font = "11px Arial, sans-serif";
    ctx.fillText(ui.bestLabel + ":", vW - 12, 374);
    ctx.fillStyle = "#78a0c0"; ctx.font = "bold 20px Arial, sans-serif";
    ctx.fillText(`${this.best}`, vW - 12, 400);

    // Progress dots
    const dY = 428, dSp = panW / (SHOT_POSITIONS.length + 1);
    SHOT_POSITIONS.forEach((sp, i) => {
      const dx = px + dSp * (i + 1);
      const r  = this.results[i];
      ctx.beginPath(); ctx.arc(dx, dY, 7, 0, Math.PI * 2);
      ctx.fillStyle = i === this.shotIdx
        ? "rgba(255,195,42,0.95)"
        : r ? (r.made ? "#38cc66" : "#cc3838") : "rgba(70,90,120,0.45)";
      ctx.fill();
      ctx.textAlign = "center";
      ctx.fillStyle = C.textDim; ctx.font = "9px Arial, sans-serif";
      ctx.fillText(`+${sp.pts}`, dx, dY + 18);
    });

    // Controls hint
    ctx.fillStyle = "rgba(70,100,140,0.65)";
    ctx.font = "9.5px Arial, sans-serif";
    wrapText(ctx, ui.shootHint, cx, vH - 30, panW - 14, 13);
  }

  gauge(ctx, x, y, w, h, label, value, lo, hi, ideal, suffix) {
    const t      = (value - lo) / (hi - lo);
    const tIdeal = (ideal  - lo) / (hi - lo);
    const dist   = Math.abs(t - tIdeal);

    ctx.textAlign = "left";
    ctx.fillStyle = C.textMuted; ctx.font = "10px Arial, sans-serif";
    ctx.fillText(label, x, y - 2);

    ctx.textAlign = "right";
    ctx.fillStyle = "#b8cce0"; ctx.font = "bold 10px Arial, sans-serif";
    ctx.fillText(suffix === "°" ? `${value.toFixed(1)}°` : value.toFixed(2), x + w, y - 2);

    // Track
    ctx.fillStyle = "#18243a";
    ctx.beginPath(); roundRect(ctx, x, y, w, h, 3); ctx.fill();

    // Fill
    const fillC = dist < 0.06 ? "#38d860" : dist < 0.14 ? "#d8c038" : "#c03830";
    ctx.fillStyle = fillC;
    ctx.beginPath(); roundRect(ctx, x, y, t * w, h, 3); ctx.fill();

    // Ideal marker
    ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + tIdeal * w, y); ctx.lineTo(x + tIdeal * w, y + h);
    ctx.stroke();
  }

  drawRimTop(ctx, cx, cy, r) {
    // Bird's-eye rim view showing lateral aim accuracy
    ctx.fillStyle = "#080e1a";
    ctx.beginPath(); ctx.arc(cx, cy, r + 7, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = "rgba(224,85,0,0.65)"; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
    ctx.stroke();

    const latFrac = clamp(this.aim.lat / MAX_LATERAL, -1, 1);
    const dotX    = cx + latFrac * r * 0.82;
    const dist    = Math.abs(latFrac);
    const dotCol  = dist < 0.32 ? "#38d860" : dist < 0.68 ? "#d8c038" : "#c03830";
    ctx.beginPath(); ctx.arc(dotX, cy, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = dotCol; ctx.fill();

    ctx.textAlign = "center";
    ctx.fillStyle = C.textDim; ctx.font = "9.5px Arial, sans-serif";
    ctx.fillText(this.ui.rimView, cx, cy + r + 15);
  }

  // ═══════════════════════════════════════════════════════════════
  // GAME "21" – LOGIC
  // ═══════════════════════════════════════════════════════════════

  loadG21Best() {
    try { return Math.max(0, Number(JSON.parse(localStorage.getItem(G21_STOR_KEY) || "{}").wins) || 0); } catch { return 0; }
  }
  saveG21Best() {
    try { const b = this.loadG21Best(); localStorage.setItem(G21_STOR_KEY, JSON.stringify({ wins: b + 1 })); } catch { /* */ }
  }

  startGame21() {
    this.g21 = {
      phase: "playerSelect",
      playerScore: 0, aiScore: 0,
      posIdx: 1,
      aim: { arc: 52, power: 0.75, lat: 0 },
      ball: null, trail: [], netSway: 0,
      preview: [], previewDirty: true,
      resultType: null, resultTimer: 0,
      ftStreak: 0, aiFtStreak: 0,
      aiPosIdx: 1, aiTargetAim: null,
      aiCurrentAim: { arc: 50, power: 0.75, lat: 0 },
      aiThinkTimer: 0, aiAimTimer: 0,
      ledTimer: 0,
      bouncePos: null,
      winner: null, winnerTimer: 0,
      message: null, messageTimer: 0,
    };
    this.screen = "play21";
    this.camera = buildCamera(G21_POSITIONS[1]);
    this.emit();
  }

  g21confirmPos() {
    const g = this.g21;
    if (g.phase !== "playerSelect") return;
    const pos = G21_POSITIONS[g.posIdx];
    g.aim = {
      arc:   clamp(pos.idealArc   + (Math.random() - 0.5) * 5, MIN_ARC, MAX_ARC),
      power: clamp(pos.idealPower + (Math.random() - 0.5) * 0.08, MIN_POWER, MAX_POWER),
      lat:   (Math.random() - 0.5) * 8,
    };
    g.previewDirty = true;
    g.phase = "playerAim";
    this.camera = buildCamera(pos);
  }

  g21shoot() {
    const g = this.g21;
    if (g.phase !== "playerAim" && g.phase !== "playerFT" && g.phase !== "playerBounceAim") return;
    let pos, nextFlight;
    if (g.phase === "playerFT")         { pos = G21_FT_POS;               nextFlight = "playerFTFlight"; }
    else if (g.phase === "playerBounceAim") { pos = g.bouncePos;           nextFlight = "playerBounceFlight"; }
    else                                { pos = G21_POSITIONS[g.posIdx];   nextFlight = "playerFlight"; }
    const v = computeLaunch(pos, g.aim.arc, g.aim.power, g.aim.lat);
    g.ball  = { x: pos.x, y: RELEASE_HEIGHT, z: pos.z, ...v };
    g.trail = [];
    g.preview = [];
    g.phase = nextFlight;
  }

  g21applyAimKeys(dt) {
    const k = this.keys, g = this.g21;
    if (g.phase !== "playerAim" && g.phase !== "playerFT" && g.phase !== "playerBounceAim") return;
    const pos =
      g.phase === "playerFT"
        ? G21_FT_POS
        : g.phase === "playerBounceAim"
          ? g.bouncePos
          : G21_POSITIONS[g.posIdx];
    const { minPower, maxPower } = getPowerRangeForPos(pos);
    const ARC = 20 * dt, LAT = 18 * dt, POW = 0.25 * dt;
    let dirty = false;
    if (k["ArrowUp"]    || k["KeyI"]) { g.aim.arc   = clamp(g.aim.arc   + ARC, MIN_ARC,      MAX_ARC);     dirty = true; }
    if (k["ArrowDown"]  || k["KeyK"]) { g.aim.arc   = clamp(g.aim.arc   - ARC, MIN_ARC,      MAX_ARC);     dirty = true; }
    if (k["ArrowLeft"]  || k["KeyJ"]) { g.aim.lat   = clamp(g.aim.lat   - LAT, -MAX_LATERAL, MAX_LATERAL); dirty = true; }
    if (k["ArrowRight"] || k["KeyL"]) { g.aim.lat   = clamp(g.aim.lat   + LAT, -MAX_LATERAL, MAX_LATERAL); dirty = true; }
    if (k["KeyW"] || k["Equal"])      { g.aim.power = clamp(g.aim.power + POW, minPower, maxPower); dirty = true; }
    if (k["KeyS"] || k["Minus"])      { g.aim.power = clamp(g.aim.power - POW, minPower, maxPower); dirty = true; }
    if (dirty) g.previewDirty = true;
  }

  g21applyScore(who, pts) {
    const g = this.g21;
    if (who === "player") {
      g.playerScore += pts;
      if (g.playerScore > G21_TARGET) {
        g.playerScore = G21_BUST;
        g.message = `${UI21[this.locale].bust} ${G21_BUST}`;
        g.messageTimer = 2.5;
      } else if (g.playerScore === G21_TARGET) {
        g.winner = "player";
        this.saveG21Best();
      }
    } else {
      g.aiScore += pts;
      if (g.aiScore > G21_TARGET) { g.aiScore = G21_BUST; }
      else if (g.aiScore === G21_TARGET) { g.winner = "ai"; }
    }
  }

  g21handleFlight(dt, who) {
    const g = this.g21;
    if (!g.ball) return;
    const SUBS = 4, sdt = dt / SUBS;
    let terminal = null;
    for (let i = 0; i < SUBS && !terminal; i++) {
      const prev = { ...g.ball };
      stepBall(g.ball, sdt);
      if (i === 0) {
        g.trail.push({ x: g.ball.x, y: g.ball.y, z: g.ball.z });
        if (g.trail.length > 45) g.trail.shift();
      }
      const col = checkCollisions(g.ball, prev);
      if (col) {
        if (col.type === "basket") g.netSway = 1.0;
        if (col.type === "basket" || col.type === "ground" || col.type === "miss") terminal = col;
      }
    }
    if (!terminal) return;
    const made = terminal.type === "basket";
    g.resultTimer = 0;

    if (!made) {
      // Capture the first-bounce position (clamp "miss"/OOB to a sensible court area)
      g.bouncePos = computeBouncePos(g.ball);
    }

    // Player field-goal attempt
    if (who === "player" || who === "playerBounce") {
      if (made) {
        this.g21applyScore("player", G21_FG_PTS);
        if (g.winner === "player") { g.phase = "gameOver"; g.winnerTimer = 0; return; }
        g.ftStreak = 0; g.phase = "playerFTSetup";
      } else {
        // AI gets the ball from the bounce point
        g.phase = "aiBounceSetup"; g.resultTimer = 0;
        g.ball = null; g.trail = [];
      }
    // Player free-throw
    } else if (who === "playerFT") {
      if (made) {
        this.g21applyScore("player", G21_FT_PTS);
        if (g.winner === "player") { g.phase = "gameOver"; g.winnerTimer = 0; return; }
        g.ftStreak++;
        g.phase = "playerFTSetup";
      } else {
        // Miss on FT → AI shoots from the first bounce position
        g.phase = "aiBounceSetup"; g.resultTimer = 0;
        g.ball = null; g.trail = [];
      }
    // AI field-goal attempt
    } else if (who === "ai" || who === "aiBounce") {
      if (made) {
        this.g21applyScore("ai", G21_FG_PTS);
        if (g.winner === "ai") { g.phase = "gameOver"; g.winnerTimer = 0; return; }
        g.aiFtStreak = 0; g.phase = "aiFTSetup";
      } else {
        // Player gets the ball from the bounce point
        g.phase = "playerBounceSetup"; g.resultTimer = 0;
        g.ball = null; g.trail = [];
      }
    // AI free-throw
    } else if (who === "aiFT") {
      if (made) {
        this.g21applyScore("ai", G21_FT_PTS);
        if (g.winner === "ai") { g.phase = "gameOver"; g.winnerTimer = 0; return; }
        g.aiFtStreak++;
        g.phase = "aiFTSetup";
      } else {
        // Miss on FT → Player shoots from the first bounce position
        g.phase = "playerBounceSetup"; g.resultTimer = 0;
        g.ball = null; g.trail = [];
      }
    }
  }

  g21chooseAIPos() {
    const g = this.g21;
    const need = G21_TARGET - g.aiScore;
    if (need <= 1) {
      return 1; // keep setup aligned with free-throw geometry before FT chains
    }
    if (need <= 3) {
      return Math.random() < 0.65 ? 1 : 0;
    }
    if (need <= 7) {
      return [0, 1, 2, 3][Math.floor(Math.random() * 4)];
    }
    if (need <= 12) {
      return [1, 2, 3, 4, 5][Math.floor(Math.random() * 5)];
    }
    return [2, 3, 4, 5, 6][Math.floor(Math.random() * 5)];
  }

  g21computeAIAim(pos) {
    const best = findSmartAimForPos(pos);
    const { minPower, maxPower } = getPowerRangeForPos(pos);
    const g = this.g21;
    const aiScore = g?.aiScore ?? 0;
    const playerScore = g?.playerScore ?? 0;
    const scoreGap = playerScore - aiScore;
    const lead = aiScore - playerScore;
    const need = G21_TARGET - aiScore;

    // Humanized consistency profile so the AI is strong but not perfect.
    let missChance = pos === G21_FT_POS ? 0.19 : pos?.fromBounce ? 0.29 : 0.24;
    if (lead >= 6) missChance += 0.11;
    if (scoreGap >= 5) missChance -= 0.07;
    if (need <= 3) missChance -= 0.05;
    if (playerScore >= 18) missChance -= 0.04;
    missChance = clamp(missChance, 0.12, 0.45);

    let arcTarget = best.arc;
    let powerTarget = best.power;
    let latTarget = best.lat;

    if (Math.random() < missChance) {
      const severity = Math.random() < 0.35 ? 1.0 : 0.68;
      const mode = Math.floor(Math.random() * 4); // long / short / push-right / pull-left
      if (mode === 0) {
        powerTarget += (0.045 + Math.random() * 0.085) * severity;
        arcTarget += (Math.random() - 0.5) * 2.1;
      } else if (mode === 1) {
        powerTarget -= (0.045 + Math.random() * 0.08) * severity;
        arcTarget += (1.2 + Math.random() * 2.8) * severity;
      } else if (mode === 2) {
        latTarget += (3.3 + Math.random() * 6.8) * severity;
        arcTarget += (Math.random() - 0.5) * 1.8;
      } else {
        latTarget -= (3.3 + Math.random() * 6.8) * severity;
        arcTarget += (Math.random() - 0.5) * 1.8;
      }
    }

    const pressureScale = scoreGap >= 6 ? 0.48 : scoreGap >= 3 ? 0.58 : 0.74;
    const baseNoise = pos?.fromBounce ? 0.9 : 1.08;
    const arcNoise = (Math.random() - 0.5) * 1.3 * baseNoise * pressureScale;
    const powerNoise = (Math.random() - 0.5) * 0.026 * baseNoise * pressureScale;
    const latNoise = (Math.random() - 0.5) * 1.7 * baseNoise * pressureScale;
    return {
      arc:   clamp(arcTarget + arcNoise, MIN_ARC, MAX_ARC),
      power: clamp(powerTarget + powerNoise, minPower, maxPower),
      lat:   clamp(latTarget + latNoise, -MAX_LATERAL, MAX_LATERAL),
    };
  }

  update21(dt) {
    const g = this.g21;
    if (!g) return;
    g.ledTimer += dt;
    if (g.netSway > 0) g.netSway = Math.max(0, g.netSway - dt * 1.4);
    if (g.messageTimer > 0) g.messageTimer -= dt;

    if (g.phase === "playerAim" || g.phase === "playerFT") {
      this.g21applyAimKeys(dt);
      const pos = g.phase === "playerFT" ? G21_FT_POS : G21_POSITIONS[g.posIdx];
      if (g.previewDirty) {
        g.preview = previewTrajectory(pos, g.aim.arc, g.aim.power, g.aim.lat);
        g.previewDirty = false;
      }
    }

    if (g.phase === "playerFTSetup") {
      g.resultTimer += dt;
      if (g.resultTimer > 0.9) {
        g.aim = {
          arc:   clamp(G21_FT_POS.idealArc   + (Math.random() - 0.5) * 5, MIN_ARC, MAX_ARC),
          power: clamp(G21_FT_POS.idealPower + (Math.random() - 0.5) * 0.07, MIN_POWER, MAX_POWER),
          lat:   (Math.random() - 0.5) * 6,
        };
        g.ball = null; g.trail = [];
        g.previewDirty = true; g.resultTimer = 0;
        g.phase = "playerFT";
        this.camera = buildCamera(G21_FT_POS);
      }
    }

    if (g.phase === "playerFlight")       this.g21handleFlight(dt, "player");
    if (g.phase === "playerFTFlight")     this.g21handleFlight(dt, "playerFT");
    if (g.phase === "playerBounceFlight") this.g21handleFlight(dt, "playerBounce");

    // ── Player bounce-position setup (brief pause after opponent's miss) ──
    if (g.phase === "playerBounceSetup") {
      g.resultTimer += dt;
      if (g.resultTimer > 0.7) {
        const bp = g.bouncePos;
        const { minPower, maxPower } = getPowerRangeForPos(bp);
        g.aim = {
          arc:   clamp(bp.idealArc   + (Math.random() - 0.5) * 5, MIN_ARC, MAX_ARC),
          power: clamp(bp.idealPower + (Math.random() - 0.5) * 0.08, minPower, maxPower),
          lat:   (Math.random() - 0.5) * 8,
        };
        g.ball = null; g.trail = [];
        g.previewDirty = true; g.resultTimer = 0;
        g.phase = "playerBounceAim";
        this.camera = buildCamera(bp);
      }
    }

    if (g.phase === "playerBounceAim") {
      this.g21applyAimKeys(dt);
      if (g.previewDirty) {
        g.preview = previewTrajectory(g.bouncePos, g.aim.arc, g.aim.power, g.aim.lat);
        g.previewDirty = false;
      }
    }

    // ── AI bounce-position setup ──
    if (g.phase === "aiBounceSetup") {
      g.resultTimer += dt;
      if (g.resultTimer > G21_AI_BOUNCE_SETUP_DELAY) {
        g.aiTargetAim = this.g21computeAIAim(g.bouncePos);
        g.aiCurrentAim = { arc: 50, power: 0.75, lat: 0 };
        g.aiAimTimer = 0;
        g.ball = null; g.trail = [];
        g.resultTimer = 0; g.phase = "aiBounceAim";
        this.camera = buildCamera(g.bouncePos);
        g.preview = [];
      }
    }

    if (g.phase === "aiBounceAim") {
      g.aiAimTimer += dt;
      const t = clamp(g.aiAimTimer / G21_AI_AIM, 0, 1);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const tgt = g.aiTargetAim;
      g.aiCurrentAim.arc   = 50   + (tgt.arc   - 50)   * e;
      g.aiCurrentAim.power = 0.75 + (tgt.power - 0.75) * e;
      g.aiCurrentAim.lat   = tgt.lat * e;
      if (t > 0.3) g.preview = previewTrajectory(g.bouncePos, g.aiCurrentAim.arc, g.aiCurrentAim.power, g.aiCurrentAim.lat);
      if (t >= 1) {
        const v = computeLaunch(g.bouncePos, tgt.arc, tgt.power, tgt.lat);
        g.ball  = { x: g.bouncePos.x, y: RELEASE_HEIGHT, z: g.bouncePos.z, ...v };
        g.trail = []; g.preview = [];
        g.phase = "aiBounceFlight";
      }
    }

    if (g.phase === "aiBounceFlight") this.g21handleFlight(dt, "aiBounce");

    if (g.phase === "aiThink") {
      g.aiThinkTimer -= dt;
      if (g.aiThinkTimer <= 0) {
        const aiPos = G21_POSITIONS[g.aiPosIdx];
        g.aiTargetAim = this.g21computeAIAim(aiPos);
        g.aiCurrentAim = { arc: 50, power: 0.75, lat: 0 };
        g.aiAimTimer = 0;
        g.phase = "aiAim";
        this.camera = buildCamera(aiPos);
        g.preview = [];
      }
    }

    if (g.phase === "aiAim") {
      g.aiAimTimer += dt;
      const t = clamp(g.aiAimTimer / G21_AI_AIM, 0, 1);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const tgt = g.aiTargetAim;
      g.aiCurrentAim.arc   = 50  + (tgt.arc   - 50)   * e;
      g.aiCurrentAim.power = 0.75 + (tgt.power - 0.75) * e;
      g.aiCurrentAim.lat   = tgt.lat * e;
      if (t > 0.3) g.preview = previewTrajectory(G21_POSITIONS[g.aiPosIdx], g.aiCurrentAim.arc, g.aiCurrentAim.power, g.aiCurrentAim.lat);
      if (t >= 1) {
        const aiPos = G21_POSITIONS[g.aiPosIdx];
        const v = computeLaunch(aiPos, tgt.arc, tgt.power, tgt.lat);
        g.ball  = { x: aiPos.x, y: RELEASE_HEIGHT, z: aiPos.z, ...v };
        g.trail = []; g.preview = [];
        g.phase = "aiFlight";
      }
    }

    if (g.phase === "aiFlight")   this.g21handleFlight(dt, "ai");
    if (g.phase === "aiFTFlight") this.g21handleFlight(dt, "aiFT");

    if (g.phase === "aiFTSetup") {
      g.resultTimer += dt;
      if (g.resultTimer > G21_AI_FT_SETUP_DELAY) {
        g.aiTargetAim = this.g21computeAIAim(G21_FT_POS);
        g.aiCurrentAim = { arc: 50, power: 0.75, lat: 0 };
        g.aiAimTimer = 0;
        g.ball = null; g.trail = [];
        g.resultTimer = 0; g.phase = "aiFTAim";
        this.camera = buildCamera(G21_FT_POS);
      }
    }

    if (g.phase === "aiFTAim") {
      g.aiAimTimer += dt;
      const t = clamp(g.aiAimTimer / (G21_AI_AIM * G21_AI_FT_AIM_MULT), 0, 1);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const tgt = g.aiTargetAim;
      g.aiCurrentAim.arc   = 50   + (tgt.arc   - 50)   * e;
      g.aiCurrentAim.power = 0.75 + (tgt.power - 0.75) * e;
      g.aiCurrentAim.lat   = tgt.lat * e;
      if (t > 0.4) g.preview = previewTrajectory(G21_FT_POS, g.aiCurrentAim.arc, g.aiCurrentAim.power, g.aiCurrentAim.lat);
      if (t >= 1) {
        const v = computeLaunch(G21_FT_POS, tgt.arc, tgt.power, tgt.lat);
        g.ball  = { x: G21_FT_POS.x, y: RELEASE_HEIGHT, z: G21_FT_POS.z, ...v };
        g.trail = []; g.preview = [];
        g.phase = "aiFTFlight";
      }
    }

    if (g.phase === "gameOver") {
      g.winnerTimer = (g.winnerTimer || 0) + dt;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // GAME "21" – RENDERING
  // ═══════════════════════════════════════════════════════════════

  drawPlay21(ctx, vW, vH) {
    const g = this.g21;
    if (!g) return;
    const courtW = Math.floor(vW * 0.68);
    const cam = this.camera;

    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, courtW, vH); ctx.clip();
    this.drawGym(ctx, cam, vW, vH);
    this.drawFloor(ctx, cam, vW, vH);
    this.drawCourtLines(ctx, cam, vW, vH);
    this.draw21PositionMarkers(ctx, cam, vW, vH);
    this.drawBasket(ctx, cam, vW, vH);

    const showPreview = (
      g.phase === "playerAim" || g.phase === "playerFT" || g.phase === "playerBounceAim" ||
      (g.phase === "aiAim"       && g.aiAimTimer > G21_AI_AIM * 0.3) ||
      (g.phase === "aiFTAim"     && g.aiAimTimer > G21_AI_AIM * 0.25) ||
      (g.phase === "aiBounceAim" && g.aiAimTimer > G21_AI_AIM * 0.3)
    );
    if (showPreview && g.preview.length > 2) {
      const isAI = g.phase === "aiAim" || g.phase === "aiFTAim" || g.phase === "aiBounceAim";
      this.drawPreview21(ctx, cam, vW, vH, isAI);
    }

    if (g.ball) {
      const savedBall  = this.ball;
      const savedTrail = this.trail;
      const savedSway  = this.netSway;
      this.ball = g.ball; this.trail = g.trail; this.netSway = g.netSway;
      this.drawBallTrail(ctx, cam, vW, vH);
      this.drawBall(ctx, cam, vW, vH);
      this.ball = savedBall; this.trail = savedTrail; this.netSway = savedSway;
    }

    if (g.phase === "playerSelect" || g.phase === "playerAim" || g.phase === "playerBounceAim") {
      const pos = g.phase === "playerBounceAim" ? g.bouncePos : G21_POSITIONS[g.posIdx];
      const pt  = pos ? p3(pos.x, 0.02, pos.z, cam, vW, vH) : null;
      if (pt) {
        const r = clamp(380 / (pt.depth + 1), 7, 20);
        ctx.strokeStyle = "rgba(255,215,40,0.92)"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pt.x - r * 1.7, pt.y); ctx.lineTo(pt.x - r * 0.55, pt.y);
        ctx.moveTo(pt.x + r * 0.55, pt.y); ctx.lineTo(pt.x + r * 1.7, pt.y);
        ctx.moveTo(pt.x, pt.y - r * 1.7); ctx.lineTo(pt.x, pt.y - r * 0.55);
        ctx.moveTo(pt.x, pt.y + r * 0.55); ctx.lineTo(pt.x, pt.y + r * 1.7);
        ctx.stroke();
      }
    }

    if (g.phase === "playerFT"    || g.phase === "playerFTFlight" ||
        g.phase === "aiFTAim"   || g.phase === "aiFTFlight") {
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,215,40,0.82)"; ctx.font = "bold 13px Arial, sans-serif";
      ctx.fillText(UI21[this.locale].ftLabel, courtW / 2, 22);
    }

    // Bounce position marker (pulsing X on the floor)
    if (g.bouncePos && (
      g.phase === "playerBounceSetup" || g.phase === "playerBounceAim" || g.phase === "playerBounceFlight" ||
      g.phase === "aiBounceSetup"     || g.phase === "aiBounceAim"     || g.phase === "aiBounceFlight"
    )) {
      const bp = g.bouncePos;
      const pt = p3(bp.x, 0.04, bp.z, cam, vW, vH);
      if (pt) {
        const pulse = 0.6 + 0.4 * Math.sin(this.time * 6);
        const r = clamp(320 / (pt.depth + 1), 6, 18) * pulse;
        ctx.save();
        ctx.globalAlpha = 0.85 * pulse;
        ctx.strokeStyle = "#ff8800"; ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(pt.x - r, pt.y - r); ctx.lineTo(pt.x + r, pt.y + r);
        ctx.moveTo(pt.x + r, pt.y - r); ctx.lineTo(pt.x - r, pt.y + r);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    if (g.message && g.messageTimer > 0) {
      const a = clamp(g.messageTimer / 0.6, 0, 1);
      ctx.save(); ctx.globalAlpha = a;
      ctx.textAlign = "center"; ctx.fillStyle = "#ff4444";
      ctx.font = "bold 30px Arial, sans-serif";
      ctx.fillText(g.message, courtW / 2, vH / 2 - 20);
      ctx.restore();
    }

    if (g.phase === "gameOver") this.draw21GameOver(ctx, courtW, vH);

    ctx.restore();
    this.drawHUD21(ctx, vW, vH, courtW);
  }

  draw21PositionMarkers(ctx, cam, vW, vH) {
    const g = this.g21;
    const isPlayerPhase = ["playerSelect","playerAim","playerFT","playerBounceAim"].includes(g.phase);
    G21_POSITIONS.forEach((pos, i) => {
      const pt = p3(pos.x, 0.025, pos.z, cam, vW, vH);
      if (!pt) return;
      const isSel = i === g.posIdx && isPlayerPhase;
      const r = clamp(280 / (pt.depth + 1), 4, 14);
      if (isSel) {
        const glow = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r * 3.5);
        glow.addColorStop(0, "rgba(255,215,40,0.28)");
        glow.addColorStop(1, "rgba(255,215,40,0)");
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, r * 3.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isSel ? "rgba(255,215,40,0.95)" : "rgba(120,160,200,0.28)";
      ctx.fill();
      ctx.strokeStyle = isSel ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1.2; ctx.stroke();
      if (isSel) {
        const lbl = this.locale === "es" ? pos.labelEs : pos.labelEn;
        ctx.textAlign = "center"; ctx.fillStyle = "#ffd700";
        ctx.font = "bold 11px Arial, sans-serif";
        ctx.fillText(lbl, pt.x, pt.y - r - 4);
      }
      if (!isSel) {
        ctx.textAlign = "center"; ctx.fillStyle = "rgba(140,170,210,0.55)";
        ctx.font = "9px Arial, sans-serif";
        ctx.fillText(i + 1, pt.x, pt.y + 3);
      }
    });
  }

  drawPreview21(ctx, cam, vW, vH, isAI) {
    const g = this.g21;
    const proj = g.preview.map(pt => p3(pt.x, pt.y, pt.z, cam, vW, vH)).filter(Boolean);
    if (proj.length < 2) return;
    const col = isAI ? "rgba(80,200,255,0.50)" : "rgba(255,205,45,0.50)";
    ctx.setLineDash([5, 8]); ctx.lineWidth = 1.8;
    ctx.strokeStyle = col;
    ctx.beginPath();
    proj.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
    ctx.stroke();
    ctx.setLineDash([]);
    const last = proj[proj.length - 1];
    ctx.beginPath(); ctx.arc(last.x, last.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = isAI ? "rgba(80,200,255,0.70)" : "rgba(255,205,45,0.70)"; ctx.fill();
  }

  draw21GameOver(ctx, courtW, vH) {
    const g = this.g21;
    const ui = UI21[this.locale];
    const playerWon = g.winner === "player";
    const alpha = clamp((g.winnerTimer || 0) / 0.5, 0, 1);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(0,0,0,0.62)"; ctx.fillRect(0, 0, courtW, vH);
    ctx.textAlign = "center";
    ctx.fillStyle = playerWon ? "#ffd700" : "#ff5555";
    ctx.font = "bold 52px Arial, sans-serif";
    if (playerWon) { ctx.shadowBlur = 28; ctx.shadowColor = "#ffd700"; }
    ctx.fillText(playerWon ? ui.winner.you : ui.winner.ai, courtW / 2, vH / 2 - 18);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#a0c0e0"; ctx.font = "16px Arial, sans-serif";
    ctx.fillText(ui.again, courtW / 2, vH / 2 + 28);
    ctx.restore();
  }

  drawHUD21(ctx, vW, vH, courtW) {
    const g = this.g21;
    const ui = UI21[this.locale];
    const panW = vW - courtW, px = courtW, cx = px + panW / 2;

    const pbg = ctx.createLinearGradient(px, 0, vW, 0);
    pbg.addColorStop(0, C.panelBg0); pbg.addColorStop(1, C.panelBg1);
    ctx.fillStyle = pbg; ctx.fillRect(px, 0, panW, vH);
    ctx.strokeStyle = "rgba(240,160,48,0.18)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, vH); ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = C.accentOrange; ctx.font = "bold 15px Arial, sans-serif";
    ctx.fillText("🏀 " + ui.title, cx, 26);
    ctx.fillStyle = C.textMuted; ctx.font = "10px Arial, sans-serif";
    ctx.fillText(this.locale === "es" ? "Primero a 21 gana" : "First to 21 wins", cx, 40);

    // Scoreboard card
    const sbY = 52, sbH = 88, sbW = panW - 22;
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.beginPath(); roundRect(ctx, px + 11, sbY, sbW, sbH, 10); ctx.fill();

    const isPlayerTurn = ["playerSelect","playerAim","playerFT","playerFlight","playerFTFlight","playerFTSetup","playerBounceSetup","playerBounceAim","playerBounceFlight"].includes(g.phase);
    const isAITurn     = ["aiThink","aiAim","aiFlight","aiFTSetup","aiFTAim","aiFTFlight","aiBounceSetup","aiBounceAim","aiBounceFlight"].includes(g.phase);
    const ledOn = Math.sin(g.ledTimer * 6) > 0;

    const halfW = sbW / 2 - 5;
    const drawScore = (lbl, score, x, active) => {
      ctx.textAlign = "center";
      const cx2 = x + halfW / 2;
      ctx.fillStyle = active ? (ledOn ? "#ffffff" : "#a0c0e0") : "#4a6888";
      ctx.font = "bold 11px Arial, sans-serif";
      ctx.fillText(lbl, cx2, sbY + 18);
      if (active) {
        ctx.beginPath(); ctx.arc(cx2 + 20, sbY + 13, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = ledOn ? "#40ff80" : "#183028"; ctx.fill();
        ctx.strokeStyle = "rgba(64,255,128,0.60)"; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(cx2 + 20, sbY + 13, 4.5, 0, Math.PI * 2); ctx.stroke();
      }
      const scoreCol = score >= 18 ? "#ff4444" : score >= 14 ? "#ffaa00" : active ? "#40d878" : "#3a6080";
      ctx.fillStyle = scoreCol;
      ctx.font = `bold ${Math.min(36, halfW * 0.7)}px Arial, sans-serif`;
      ctx.fillText(score, cx2, sbY + 58);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(x + 4, sbY + 68, halfW - 8, 7);
      ctx.fillStyle = active ? scoreCol : "#2a5070";
      ctx.fillRect(x + 4, sbY + 68, Math.max(0, (halfW - 8) * (score / G21_TARGET)), 7);
    };

    drawScore(ui.you, g.playerScore, px + 11,              isPlayerTurn);
    drawScore(ui.ai,  g.aiScore,     px + 11 + halfW + 10, isAITurn);
    ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 11 + halfW + 5, sbY + 10); ctx.lineTo(px + 11 + halfW + 5, sbY + sbH - 10); ctx.stroke();
    ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.font = "9px Arial, sans-serif";
    ctx.fillText("vs", px + 11 + halfW + 5, sbY + 40);

    ctx.fillStyle = "#2a4058"; ctx.font = "10px Arial, sans-serif";
    ctx.fillText(`→ ${G21_TARGET}   ${this.locale === "es" ? "pasarse→" : "bust→"} ${G21_BUST}`, cx, sbY + sbH + 13);

    const phaseY = sbY + sbH + 30;

    if (isAITurn) {
      ctx.fillStyle = "rgba(80,200,255,0.92)"; ctx.font = "bold 12px Arial, sans-serif";
      ctx.fillText(ui.aiTurn, cx, phaseY);
      if (g.phase === "aiThink") {
        ctx.fillStyle = "#4080a0"; ctx.font = "11px Arial, sans-serif";
        const dotCount = Math.floor(g.ledTimer * 2.5) % 4;
        ctx.fillText(ui.aiThinks.replace("...", ".".repeat(dotCount)), cx, phaseY + 18);
      }
      if (g.phase === "aiAim" || g.phase === "aiFTAim" || g.phase === "aiBounceAim") {
        const pos = g.phase === "aiFTAim" ? G21_FT_POS
                  : g.phase === "aiBounceAim" ? g.bouncePos
                  : G21_POSITIONS[g.aiPosIdx];
        const { minPower: aiMinPower } = getPowerRangeForPos(pos);
        const lbl = g.phase === "aiFTAim"    ? (this.locale === "es" ? "Tiro Libre" : "Free Throw")
                  : g.phase === "aiBounceAim" ? (this.locale === "es" ? "Posición de rebote" : "Bounce spot")
                  : (this.locale === "es" ? G21_POSITIONS[g.aiPosIdx].labelEs : G21_POSITIONS[g.aiPosIdx].labelEn);
        ctx.fillStyle = "#4898b8"; ctx.font = "11px Arial, sans-serif";
        ctx.fillText(lbl, cx, phaseY + 18);
        const a = g.aiCurrentAim;
        this.gauge21(ctx, px + 10, phaseY + 32, panW - 20, 18, "Arc",   a.arc,   MIN_ARC,   MAX_ARC,   pos.idealArc,   "°");
        this.gauge21(ctx, px + 10, phaseY + 60, panW - 20, 18, "Power", a.power, aiMinPower, MAX_POWER, pos.idealPower, "");
        this.gauge21(ctx, px + 10, phaseY + 88, panW - 20, 18, "Lat",   a.lat,   -MAX_LATERAL, MAX_LATERAL, 0, "°");
      }
    } else if (isPlayerTurn) {
      ctx.fillStyle = "rgba(255,215,40,0.92)"; ctx.font = "bold 12px Arial, sans-serif";
      ctx.fillText(ui.yourTurn, cx, phaseY);
      if (g.phase === "playerSelect") {
        const pos = G21_POSITIONS[g.posIdx];
        const lbl = this.locale === "es" ? pos.labelEs : pos.labelEn;
        ctx.fillStyle = "#ffd700"; ctx.font = "bold 13px Arial, sans-serif";
        ctx.fillText(lbl, cx, phaseY + 18);
        ctx.fillStyle = "#405870"; ctx.font = "10px Arial, sans-serif";
        wrapText(ctx, ui.selectHint, cx, phaseY + 34, panW - 16, 13);
      }
      if (g.phase === "playerAim" || g.phase === "playerFT" || g.phase === "playerBounceAim") {
        const pos = g.phase === "playerFT"         ? G21_FT_POS
                  : g.phase === "playerBounceAim"  ? g.bouncePos
                  : G21_POSITIONS[g.posIdx];
        const { minPower: playerMinPower } = getPowerRangeForPos(pos);
        if (g.phase === "playerBounceAim") {
          ctx.fillStyle = "#ff8800"; ctx.font = "bold 11px Arial, sans-serif";
          ctx.fillText(this.locale === "es" ? "Posición de rebote" : "Bounce spot", cx, phaseY + 18);
        }
        this.gauge21(ctx, px + 10, phaseY + (g.phase === "playerBounceAim" ? 32 : 10), panW - 20, 18, "Arc",   g.aim.arc,   MIN_ARC,   MAX_ARC,   pos.idealArc,   "°");
        this.gauge21(ctx, px + 10, phaseY + (g.phase === "playerBounceAim" ? 60 : 38), panW - 20, 18, "Power", g.aim.power, playerMinPower, MAX_POWER, pos.idealPower, "");
        this.gauge21(ctx, px + 10, phaseY + (g.phase === "playerBounceAim" ? 88 : 66), panW - 20, 18, "Lat",   g.aim.lat,   -MAX_LATERAL, MAX_LATERAL, 0, "°");
        ctx.fillStyle = "#405870"; ctx.font = "10px Arial, sans-serif"; ctx.textAlign = "center";
        wrapText(ctx, g.phase === "playerFT" ? ui.ftHint : ui.shootHint, cx, phaseY + (g.phase === "playerBounceAim" ? 118 : 96), panW - 16, 13);
        if (g.ftStreak > 0) {
          ctx.fillStyle = "#40d878"; ctx.font = "bold 11px Arial, sans-serif";
          ctx.fillText(`${g.ftStreak}× ${this.locale === "es" ? "consecutivo" : "consecutive"}`, cx, phaseY + (g.phase === "playerBounceAim" ? 146 : 124));
        }
      }
    }

    // Back to menu hint
    ctx.fillStyle = "#223040"; ctx.font = "9px Arial, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(this.locale === "es" ? "Esc / menú" : "Esc / menu", cx, vH - 12);
  }

  gauge21(ctx, x, y, w, h, label, value, lo, hi, ideal, suffix) {
    const t = (value - lo) / (hi - lo);
    const tI = (ideal  - lo) / (hi - lo);
    const dist = Math.abs(t - tI);
    ctx.textAlign = "left";  ctx.fillStyle = C.textMuted; ctx.font = "9px Arial, sans-serif";
    ctx.fillText(label, x, y - 1);
    ctx.textAlign = "right"; ctx.fillStyle = "#b8cce0"; ctx.font = "bold 9px Arial, sans-serif";
    ctx.fillText(suffix === "°" ? `${value.toFixed(1)}°` : value.toFixed(2), x + w, y - 1);
    ctx.fillStyle = "#18243a";
    ctx.beginPath(); roundRect(ctx, x, y, w, h, 2); ctx.fill();
    const fc = dist < 0.06 ? "#38d860" : dist < 0.14 ? "#d8c038" : "#c03830";
    ctx.fillStyle = fc;
    ctx.beginPath(); roundRect(ctx, x, y, Math.max(0, clamp(t, 0, 1) * w), h, 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.50)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + tI * w, y); ctx.lineTo(x + tI * w, y + h); ctx.stroke();
  }

  drawSummary21(ctx, vW, vH) {
    // Currently unused – gameOver is shown inline. Kept as fallback.
    this.drawPlay21(ctx, vW, vH);
  }
}

// ─── React component ──────────────────────────────────────────────────────────
export default function BasketballCourtGame() {
  const locale     = useMemo(() => (resolveBrowserLanguage() === "es" ? "es" : "en"), []);
  const canvasRef  = useRef(null);
  const rootRef    = useRef(null);
  const rtRef      = useRef(null);
  const [snap, setSnap] = useState(null);
  const copy = UI[locale] ?? UI.en;

  const handleFS = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    document.fullscreenElement ? document.exitFullscreen?.() : el.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rt = new BasketballRuntime({ canvas, locale, onSnapshot: setSnap, onFullscreen: handleFS });
    rtRef.current = rt;
    rt.start();
    return () => { rt.destroy(); rtRef.current = null; };
  }, [locale, handleFS]);

  const buildPayload    = useCallback((s) => s ?? {}, []);
  const advanceHandler  = useCallback((ms) => rtRef.current?.advanceTime(ms), []);
  useGameRuntimeBridge(snap, buildPayload, advanceHandler);

  const bindHoldControl = useCallback(
    (code) => ({
      onPointerDown: (event) => {
        event.preventDefault();
        rtRef.current?.setVirtualKey(code, true);
      },
      onPointerUp: () => rtRef.current?.setVirtualKey(code, false),
      onPointerLeave: () => rtRef.current?.setVirtualKey(code, false),
      onPointerCancel: () => rtRef.current?.setVirtualKey(code, false),
    }),
    []
  );

  const pressControl = useCallback((code) => rtRef.current?.pressVirtualKey(code), []);
  const screen = snap?.screen ?? "menu";
  const primaryActionLabel =
    screen === "menu"
      ? locale === "es" ? "Empezar" : "Start"
      : screen === "summary" || screen === "summary21"
        ? locale === "es" ? "Otra ronda" : "Again"
        : locale === "es" ? "Lanzar" : "Shoot";

  return (
    <div ref={rootRef} className="mini-game basketball-court-game">
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="basketball-court-actions">
          {screen === "menu" ? (
            <>
              <button type="button" onClick={() => pressControl("Digit1")}>
                {locale === "es" ? "Clasico" : "Classic"}
              </button>
              <button type="button" onClick={() => pressControl("Digit2")}>
                21
              </button>
            </>
          ) : null}
          <button type="button" onClick={() => pressControl("KeyR")}>
            {locale === "es" ? "Reiniciar" : "Restart"}
          </button>
          <button type="button" onClick={() => pressControl("KeyF")}>
            {locale === "es" ? "Pantalla completa" : "Fullscreen"}
          </button>
        </div>
      </div>

      <div className="basketball-court-stage">
        <canvas
          ref={canvasRef}
          className="basketball-court-canvas"
        />
      </div>

      <section className="basketball-court-controls" aria-label={locale === "es" ? "Controles tactiles de baloncesto" : "Basketball touch controls"}>
        <div className="basketball-court-control-grid">
          <div className="basketball-court-control-group">
            <span>{copy.arcLabel}</span>
            <div className="basketball-court-control-row">
              <button type="button" {...bindHoldControl("ArrowUp")}>+</button>
              <button type="button" {...bindHoldControl("ArrowDown")}>-</button>
            </div>
          </div>
          <div className="basketball-court-control-group">
            <span>{copy.latLabel}</span>
            <div className="basketball-court-control-row">
              <button type="button" {...bindHoldControl("ArrowLeft")}>L</button>
              <button type="button" {...bindHoldControl("ArrowRight")}>R</button>
            </div>
          </div>
          <div className="basketball-court-control-group">
            <span>{copy.powerLabel}</span>
            <div className="basketball-court-control-row">
              <button type="button" {...bindHoldControl("KeyW")}>+</button>
              <button type="button" {...bindHoldControl("KeyS")}>-</button>
            </div>
          </div>
        </div>

        <div className="basketball-court-action-strip">
          <button type="button" className="basketball-court-primary" onClick={() => pressControl("Enter")}>
            {primaryActionLabel}
          </button>
          <button type="button" onClick={() => pressControl("KeyP")}>
            {locale === "es" ? "Pausa" : "Pause"}
          </button>
        </div>

        <p className="basketball-court-hint">{copy.shootHint}</p>
      </section>
    </div>
  );
}
