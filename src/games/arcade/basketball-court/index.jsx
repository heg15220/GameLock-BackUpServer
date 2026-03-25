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
  const cY = Math.cos(-cam.yaw),  sY = Math.sin(-cam.yaw);
  const cx  = dx * cY - dz * sY;
  const cz  = dx * sY + dz * cY;
  const cP  = Math.cos(-cam.pitch), sP = Math.sin(-cam.pitch);
  const pz  = cz * cP - dy * sP;
  const py  = cz * sP + dy * cP;
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
  // Ideal speed: ball reaches basket plane at exactly RIM_HEIGHT
  const vIdeal = denom > 0.05
    ? Math.sqrt(GRAVITY * Dh * Dh / (2 * cosA * cosA * denom))
    : 22;
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
  gymCeil:      "#131720",
  floorNear:    "#c08838",
  floorFar:     "#8a5e20",
  floorLine:    "rgba(0,0,0,0.11)",
  courtLine:    "rgba(255,255,255,0.84)",
  paint:        "rgba(180,55,18,0.22)",
  rim:          "#e05500",
  bbBoard:      "rgba(236,242,255,0.90)",
  bbFrame:      "#b8c4d4",
  bbBox:        "rgba(255,45,45,0.80)",
  netLine:      "rgba(230,235,240,0.72)",
  panelBg0:     "#0c1220",
  panelBg1:     "#101828",
  accentOrange: "#f0a030",
  textMuted:    "#5a7090",
  textDim:      "#3a5068",
  ballHigh:     "#ff8c28",
  ballMid:      "#d44e0c",
  ballLow:      "#8a2400",
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

    this.screen    = "menu";     // menu | play | summary
    this.paused    = false;
    this.fullscreen = false;

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
  }

  get pos() { return SHOT_POSITIONS[this.shotIdx]; }

  start() {
    this.running = true;
    this.handleResize();
    window.addEventListener("resize", this._onResize);
    window.addEventListener("keydown", this._onKD);
    window.addEventListener("keyup",   this._onKU);
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this._onFrame);
  }

  destroy() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("keydown", this._onKD);
    window.removeEventListener("keyup",   this._onKU);
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

    if (code === "KeyP" && this.screen === "play") {
      this.paused = !this.paused; this.emit(); return;
    }
    if (code === "KeyR" && this.screen !== "menu") { this.startRound(); return; }

    if (this.screen === "menu" && (code === "Enter" || code === "Space")) { this.startRound(); return; }
    if (this.screen === "summary" && (code === "Enter" || code === "Space" || code === "KeyR")) { this.startRound(); return; }

    if (this.screen === "play" && !this.paused) {
      if (this.shotState === "aiming"  && (code === "Enter" || code === "Space")) { this.shoot(); return; }
      if (this.shotState === "result"  && (code === "Enter" || code === "Space")) { this.advanceShot(); return; }
    }
  }

  onKeyUp(e) { this.keys[e.code] = false; }

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

    if (this.screen === "menu")    { this.drawMenu(ctx, vW, vH);    return; }
    if (this.screen === "summary") { this.drawSummary(ctx, vW, vH); return; }

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
    ctx.fillStyle = "rgba(8,12,22,0.72)"; ctx.fillRect(0, 0, vW, vH);

    // Card
    const cw = Math.min(530, vW * 0.86), ch = 310;
    const cx = vW / 2 - cw / 2, cy = vH / 2 - ch / 2 - 10;
    ctx.fillStyle = "rgba(10,16,28,0.92)";
    ctx.beginPath(); roundRect(ctx, cx, cy, cw, ch, 18); ctx.fill();
    ctx.strokeStyle = "rgba(240,160,48,0.38)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); roundRect(ctx, cx, cy, cw, ch, 18); ctx.stroke();

    const ui = this.ui;
    ctx.textAlign = "center";

    ctx.fillStyle = C.accentOrange;
    ctx.font = "bold 28px Arial, sans-serif";
    ctx.fillText("🏀  " + ui.title, vW / 2, cy + 48);

    ctx.fillStyle = "#8098b8";
    ctx.font = "14px Arial, sans-serif";
    ctx.fillText(ui.subtitle, vW / 2, cy + 74);

    // Shot list
    const colCount = 3;
    SHOT_POSITIONS.forEach((sp, i) => {
      const col = i % colCount, row = Math.floor(i / colCount);
      const px = cx + 28 + col * ((cw - 56) / colCount) + (cw - 56) / colCount / 2;
      const py = cy + 110 + row * 28;
      const lbl = this.locale === "es" ? sp.labelEs : sp.labelEn;
      ctx.fillStyle = "#5878a0";
      ctx.font = "12px Arial, sans-serif";
      ctx.fillText(`${i + 1}. ${lbl}  (+${sp.pts})`, px, py);
    });

    ctx.fillStyle = "#6888a8";
    ctx.font = "12px Arial, sans-serif";
    ctx.fillText(ui.menuHint, vW / 2, cy + 180);

    // Best score
    if (this.best > 0) {
      ctx.fillStyle = "#4a6888";
      ctx.font = "12px Arial, sans-serif";
      ctx.fillText(`${ui.bestLabel}: ${this.best} / ${MAX_POSSIBLE}`, vW / 2, cy + 200);
    }

    // Start button
    const bw = 210, bh = 44, bx = vW / 2 - bw / 2, by = cy + ch - 68;
    const bg = ctx.createLinearGradient(bx, by, bx, by + bh);
    bg.addColorStop(0, "#d85c10"); bg.addColorStop(1, "#9a3c08");
    ctx.fillStyle = bg;
    ctx.beginPath(); roundRect(ctx, bx, by, bw, bh, 10); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px Arial, sans-serif";
    ctx.fillText(ui.menuStart + "  (Enter)", vW / 2, by + 28);
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
    // Find horizon Y to split ceiling and floor
    const hor = p3(0, 0, 200, cam, vW, vH);
    const horY = hor ? clamp(hor.y, 0, vH * 0.7) : vH * 0.42;

    // Ceiling gradient
    const cg = ctx.createLinearGradient(0, 0, 0, horY);
    cg.addColorStop(0, "#0f1420"); cg.addColorStop(1, "#1c253a");
    ctx.fillStyle = cg; ctx.fillRect(0, 0, vW, horY);

    // Ceiling girders / trusses
    ctx.strokeStyle = "rgba(50,60,90,0.6)"; ctx.lineWidth = 2;
    [0, 5, 10, 15].forEach(gz => {
      ctx.beginPath();
      line3D(ctx, cam, vW, vH, -8, 7, gz, 8, 7, gz);
      ctx.stroke();
      ctx.beginPath();
      line3D(ctx, cam, vW, vH, -8, 8.5, gz, 8, 8.5, gz);
      ctx.stroke();
    });

    // Ceiling lights
    [0, 5, 11, 17].forEach(lz => {
      const lp = p3(0, 8.8, lz, cam, vW, vH);
      if (!lp) return;
      const r = Math.max(2, 160 / (lp.depth + 1));
      const lg = ctx.createRadialGradient(lp.x, lp.y, 0, lp.x, lp.y, r * 5);
      lg.addColorStop(0, "rgba(255,245,210,0.30)");
      lg.addColorStop(1, "rgba(255,245,210,0)");
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.arc(lp.x, lp.y, r * 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,252,230,0.85)";
      ctx.beginPath(); ctx.arc(lp.x, lp.y, r * 0.9, 0, Math.PI * 2); ctx.fill();
    });

    // Side walls (bleachers suggestion)
    [-7.5, 7.5].forEach(wx => {
      const wPts = [
        p3(wx, 0, -2, cam, vW, vH), p3(wx, 7, -2, cam, vW, vH),
        p3(wx, 7, 22, cam, vW, vH), p3(wx, 0, 22, cam, vW, vH),
      ].filter(Boolean);
      if (wPts.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(wPts[0].x, wPts[0].y);
        wPts.slice(1).forEach(pt => ctx.lineTo(pt.x, pt.y));
        ctx.closePath();
        ctx.fillStyle = "#161e30"; ctx.fill();
        // Wall stripe
        ctx.strokeStyle = "rgba(80,100,140,0.3)"; ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // Back wall
    const bwPts = [
      p3(-8, 0, -2, cam, vW, vH), p3(-8, 8, -2, cam, vW, vH),
      p3(8,  8, -2, cam, vW, vH), p3(8,  0, -2, cam, vW, vH),
    ].filter(Boolean);
    if (bwPts.length === 4) {
      ctx.beginPath();
      ctx.moveTo(bwPts[0].x, bwPts[0].y);
      bwPts.slice(1).forEach(pt => ctx.lineTo(pt.x, pt.y));
      ctx.closePath();
      ctx.fillStyle = "#1a2235"; ctx.fill();
    }
  }

  // ── Floor ────────────────────────────────────────────────────
  drawFloor(ctx, cam, vW, vH) {
    const hor = p3(0, 0, 200, cam, vW, vH);
    const horY = hor ? clamp(hor.y, 0, vH * 0.7) : vH * 0.42;

    // Base floor rectangle
    const fg = ctx.createLinearGradient(0, horY, 0, vH);
    fg.addColorStop(0, C.floorFar); fg.addColorStop(1, C.floorNear);
    ctx.fillStyle = fg; ctx.fillRect(0, horY, vW, vH - horY);

    // Hardwood planks – lines running Z direction (depth)
    ctx.strokeStyle = C.floorLine; ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let px = -7.5; px <= 7.5; px += 0.38) {
      const near = p3(px, 0.001, 0, cam, vW, vH);
      const far  = p3(px, 0.001, 22, cam, vW, vH);
      if (near && far) { ctx.moveTo(near.x, near.y); ctx.lineTo(far.x, far.y); }
    }
    // Cross-grain cuts every ~2.4m
    for (let pz = 0; pz <= 22; pz += 2.4) {
      const l = p3(-7.5, 0.001, pz, cam, vW, vH);
      const r = p3(7.5,  0.001, pz, cam, vW, vH);
      if (l && r) { ctx.moveTo(l.x, l.y); ctx.lineTo(r.x, r.y); }
    }
    ctx.stroke();
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
    // Support pole
    ctx.strokeStyle = "#555e70"; ctx.lineWidth = 5;
    ctx.beginPath(); line3D(ctx, cam, vW, vH, 0, 0, -1.22, 0, 3.35, -1.22); ctx.stroke();
    // Horizontal arm to backboard
    ctx.lineWidth = 3.5;
    ctx.beginPath(); line3D(ctx, cam, vW, vH, 0, 3.35, -1.22, 0, 3.35, BACKBOARD_Z - 0.05); ctx.stroke();

    // Backboard
    const BB_HW = 0.915, BB_B = 2.9, BB_T = 3.975;
    const bbPts = [
      p3(-BB_HW, BB_B, BACKBOARD_Z, cam, vW, vH), p3(BB_HW, BB_B, BACKBOARD_Z, cam, vW, vH),
      p3(BB_HW,  BB_T, BACKBOARD_Z, cam, vW, vH), p3(-BB_HW, BB_T, BACKBOARD_Z, cam, vW, vH),
    ];
    if (bbPts.every(Boolean)) {
      ctx.beginPath();
      ctx.moveTo(bbPts[0].x, bbPts[0].y);
      bbPts.slice(1).forEach(b => ctx.lineTo(b.x, b.y));
      ctx.closePath();
      ctx.fillStyle = C.bbBoard; ctx.fill();
      ctx.strokeStyle = C.bbFrame; ctx.lineWidth = 3; ctx.stroke();
      // Shooting box
      const SBW = 0.295, SBH = 0.45, SBB = 2.92;
      const sbPts = [
        p3(-SBW, SBB,       BACKBOARD_Z - 0.001, cam, vW, vH),
        p3( SBW, SBB,       BACKBOARD_Z - 0.001, cam, vW, vH),
        p3( SBW, SBB + SBH, BACKBOARD_Z - 0.001, cam, vW, vH),
        p3(-SBW, SBB + SBH, BACKBOARD_Z - 0.001, cam, vW, vH),
      ];
      if (sbPts.every(Boolean)) {
        ctx.beginPath();
        ctx.moveTo(sbPts[0].x, sbPts[0].y);
        sbPts.slice(1).forEach(s => ctx.lineTo(s.x, s.y));
        ctx.closePath();
        ctx.strokeStyle = C.bbBox; ctx.lineWidth = 2; ctx.stroke();
      }
    }

    // Rim
    ctx.strokeStyle = C.rim; ctx.lineWidth = 4.5;
    ctx.beginPath();
    let rimFirst = true;
    for (let i = 0; i <= 32; i++) {
      const a  = (i / 32) * Math.PI * 2;
      const pt = p3(Math.cos(a) * RIM_RADIUS, RIM_HEIGHT, Math.sin(a) * RIM_RADIUS, cam, vW, vH);
      if (!pt) { rimFirst = true; continue; }
      rimFirst ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
      rimFirst = false;
    }
    ctx.stroke();

    // Net
    const NL = 12, NH = 0.44;
    const swX = Math.sin(this.time * 8)  * this.netSway * 0.038;
    const swZ = Math.cos(this.time * 6)  * this.netSway * 0.028;
    ctx.strokeStyle = C.netLine; ctx.lineWidth = 1;
    for (let i = 0; i < NL; i++) {
      const a  = (i / NL) * Math.PI * 2;
      const tx = Math.cos(a) * RIM_RADIUS, tz = Math.sin(a) * RIM_RADIUS;
      const bx = Math.cos(a) * RIM_RADIUS * 0.48 + swX;
      const bz = Math.sin(a) * RIM_RADIUS * 0.48 + swZ;
      const top = p3(tx, RIM_HEIGHT, tz, cam, vW, vH);
      const mid = p3(bx, RIM_HEIGHT - NH * 0.5, bz, cam, vW, vH);
      const bot = p3(bx * 0.6, RIM_HEIGHT - NH, bz * 0.6, cam, vW, vH);
      if (top && mid && bot) {
        ctx.beginPath();
        ctx.moveTo(top.x, top.y); ctx.lineTo(mid.x, mid.y); ctx.lineTo(bot.x, bot.y);
        ctx.stroke();
      }
    }
    // Net horizontal rings
    [0.3, 0.6, 0.9, 1.0].forEach(t => {
      const rR = RIM_RADIUS * (1 - t * 0.5);
      const rY = RIM_HEIGHT - NH * t;
      const rsX = swX * t, rsZ = swZ * t;
      ctx.beginPath();
      let nf = true;
      for (let i = 0; i <= 16; i++) {
        const a  = (i / 16) * Math.PI * 2;
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

    // Shadow
    const sh = p3(this.ball.x, 0, this.ball.z, cam, vW, vH);
    if (sh) {
      const fade = clamp(1 - this.ball.y / 9, 0.05, 0.38);
      ctx.beginPath(); ctx.ellipse(sh.x, sh.y, sr * 1.15, sr * 0.38, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fill();
    }

    // Ball body
    const grad = ctx.createRadialGradient(
      bp.x - sr * 0.28, bp.y - sr * 0.30, sr * 0.08,
      bp.x, bp.y, sr
    );
    grad.addColorStop(0, C.ballHigh); grad.addColorStop(0.58, C.ballMid); grad.addColorStop(1, C.ballLow);
    ctx.beginPath(); ctx.arc(bp.x, bp.y, sr, 0, Math.PI * 2);
    ctx.fillStyle = grad; ctx.fill();

    // Seams
    const sw = Math.max(0.5, sr * 0.07);
    ctx.strokeStyle = "rgba(0,0,0,0.42)"; ctx.lineWidth = sw;
    ctx.beginPath(); ctx.arc(bp.x, bp.y, sr * 0.94, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(bp.x, bp.y, sr * 0.28, sr, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bp.x - sr, bp.y); ctx.lineTo(bp.x + sr, bp.y); ctx.stroke();

    // Specular
    ctx.beginPath(); ctx.arc(bp.x - sr * 0.26, bp.y - sr * 0.30, sr * 0.20, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,210,0.28)"; ctx.fill();
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
}

// ─── React component ──────────────────────────────────────────────────────────
export default function BasketballCourtGame() {
  const locale     = useMemo(() => (resolveBrowserLanguage() === "es" ? "es" : "en"), []);
  const canvasRef  = useRef(null);
  const rootRef    = useRef(null);
  const rtRef      = useRef(null);
  const [snap, setSnap] = useState(null);

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

  return (
    <div
      ref={rootRef}
      style={{
        width: "100%", height: "100%", display: "flex", position: "relative",
        background: "#0c1020", fontFamily: "Arial, sans-serif",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}
