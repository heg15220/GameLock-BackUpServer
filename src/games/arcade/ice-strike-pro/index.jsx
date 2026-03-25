import React, { useEffect, useRef } from "react";

// ── Canvas layout ─────────────────────────────────────────────────────────────
const W = 960, H = 590;
const ICE_W = 430;           // right edge of ice zone (panel starts here)

// ── Sheet geometry ────────────────────────────────────────────────────────────
const SH_L   = 62;           // left sheet rail
const SH_R   = 368;          // right sheet rail
const SH_W   = SH_R - SH_L; // 306 px
const SH_MID = (SH_L + SH_R) / 2; // 215

const HOUSE_X = SH_MID;
const HOUSE_Y = 100;         // house centre (far end)
const HACK_X  = SH_MID;
const HACK_Y  = 530;         // throwing position
const HOG_Y   = 440;         // hog line – stone must cross
const BACK_Y  = 36;          // back board line
const DIV_Y   = 315;         // centre sheet dividing line (used for guards)
const TEE_Y   = HOUSE_Y;     // tee line through house

// ── House ring radii ──────────────────────────────────────────────────────────
const RH = 90;   // 12-foot (outermost)
const RM = 60;   // 8-foot
const RI = 30;   // 4-foot
const RB = 9;    // button

// ── Physics ───────────────────────────────────────────────────────────────────
const STONE_R      = 15;   // px
const BASE_FRICTION = 60;  // px/s²  (modulated by ice condition)
const CURL_K       = 0.056;// lateral drift per unit fwd-speed per second
const SWEEP_MULT   = 0.70; // friction multiplier while sweeping
const COR          = 0.91; // coefficient of restitution stone-stone

// ── Game rules ────────────────────────────────────────────────────────────────
const ENDS           = 6;
const SHOTS_PER_TEAM = 4;

// ── Ice conditions ────────────────────────────────────────────────────────────
const ICE_CONDITIONS = {
  pebbled: { label: "Pebbled",  frictionMult: 1.00, curlMult: 1.00, color: "#4a9eff" },
  fast:    { label: "Fast Ice", frictionMult: 0.82, curlMult: 0.85, color: "#28e0a0" },
  slow:    { label: "Slow Ice", frictionMult: 1.22, curlMult: 1.18, color: "#f0a030" },
};
const ICE_COND_KEYS = ["pebbled", "fast", "slow"];

// ── Shot strategies ────────────────────────────────────────────────────────────
const STRATEGIES = {
  draw:    { label: "Draw",    key:"1", powerBias: 0.46, color: "#38c8f0", desc: "Aim to button" },
  guard:   { label: "Guard",  key:"2", powerBias: 0.42, color: "#40e080", desc: "Front of house" },
  takeout: { label: "Takeout",key:"3", powerBias: 0.82, color: "#f05050", desc: "Remove opponent" },
  raise:   { label: "Raise",  key:"4", powerBias: 0.68, color: "#f0c030", desc: "Promote own stone" },
};

// ── Palette ───────────────────────────────────────────────────────────────────
const CLR = {
  bg:         "#04080f",
  // Ice sheet
  iceTop:     "#c2dbee",
  iceMid:     "#d4ecf8",
  iceBot:     "#c8e4f2",
  iceEdge:    "#6a96b0",
  boardA:     "#1a2c42",
  boardB:     "#243550",
  boardLine:  "#304a68",
  // Lines on ice
  hog:        "rgba(200,32,32,0.80)",
  tee:        "rgba(40,100,180,0.60)",
  centre:     "rgba(40,100,180,0.28)",
  divLine:    "rgba(40,100,180,0.22)",
  // House rings (curling standard)
  ring12:     "rgba(204,28,28,0.88)",    // red 12-foot
  ring8:      "rgba(240,244,255,0.94)",  // white 8-foot
  ring4:      "rgba(28,80,188,0.90)",    // blue 4-foot
  ringBtn:    "rgba(240,244,255,0.96)",  // white button
  // Panel
  panelBg:    "#050911",
  panelBdr:   "rgba(50,100,190,0.28)",
  accent:     "#4a9eff",
  // Teams
  playerCol:  "#e03030",
  playerEdge: "#ff8080",
  aiCol:      "#d4a800",
  aiEdge:     "#ffe060",
  // Misc
  sweepIce:   "#c0ddf0",
  trajDraw:   "rgba(68,200,248,0.50)",
  trajTakeout:"rgba(240,80,80,0.50)",
  trajGuard:  "rgba(60,224,128,0.50)",
  trajRaise:  "rgba(240,192,48,0.50)",
};

// ── Pebble texture (pregenerated once) ────────────────────────────────────────
const PEBBLES = (() => {
  const pb = [];
  for (let i = 0; i < 280; i++) {
    pb.push({
      x: SH_L + Math.random() * SH_W,
      y: BACK_Y + Math.random() * (HACK_Y - BACK_Y + 30),
      r: 0.5 + Math.random() * 1.6,
      a: 0.08 + Math.random() * 0.18,
    });
  }
  return pb;
})();

// Subtle ice scratches (linear grain lines)
const SCRATCHES = (() => {
  const sc = [];
  for (let i = 0; i < 18; i++) {
    const x1 = SH_L + Math.random() * SH_W;
    const y1 = BACK_Y + Math.random() * (HACK_Y - BACK_Y);
    const len = 30 + Math.random() * 80;
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
    sc.push({
      x1, y1,
      x2: x1 + Math.cos(ang) * len,
      y2: y1 + Math.sin(ang) * len,
      a:  0.04 + Math.random() * 0.08,
    });
  }
  return sc;
})();

// ── Helpers ───────────────────────────────────────────────────────────────────
function dist(a, b)       { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function rr(ctx, x, y, w, h, r) {
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ── Physics: advance one stone one sub-step ────────────────────────────────────
function stepStone(s, dt, sweeping, frMult, curlMult) {
  const spd = Math.hypot(s.vx, s.vy);
  if (spd < 0.5) { s.vx = 0; s.vy = 0; return; }

  const friction = BASE_FRICTION * frMult * (sweeping ? SWEEP_MULT : 1.0);
  const ratio    = Math.max(0, spd - friction * dt) / spd;
  s.vx *= ratio;
  s.vy *= ratio;

  // Curl: lateral force proportional to forward speed
  const fwd = -s.vy;  // positive = moving toward house
  if (fwd > 8 && !sweeping) {
    s.vx += s.rotation * CURL_K * curlMult * fwd * dt;
  }

  s.x += s.vx * dt;
  s.y += s.vy * dt;
}

// ── Physics: elastic stone-stone collisions ────────────────────────────────────
function resolveCollisions(stones, particles) {
  for (let i = 0; i < stones.length; i++) {
    for (let j = i + 1; j < stones.length; j++) {
      const a = stones[i], b = stones[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d >= STONE_R * 2 || d < 0.001) continue;

      // Positional correction
      const ov = (STONE_R * 2 - d) * 0.52;
      const nx = dx / d, ny = dy / d;
      a.x -= nx * ov; a.y -= ny * ov;
      b.x += nx * ov; b.y += ny * ov;

      // Velocity exchange (COR = 0.91)
      const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rel >= 0) continue;
      const imp = rel * (1 + COR) * 0.5;
      a.vx += imp * nx; a.vy += imp * ny;
      b.vx -= imp * nx; b.vy -= imp * ny;

      // Collision spark particles
      if (particles) {
        const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        for (let k = 0; k < 10; k++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 30 + Math.random() * 90;
          particles.push({
            x: cx, y: cy,
            vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
            life: 0.4 + Math.random() * 0.3,
            maxLife: 0.7,
            col: "#c8e8ff",
            r: 1.5 + Math.random() * 2,
          });
        }
      }
    }
  }
}

// ── Scoring ───────────────────────────────────────────────────────────────────
function computeScore(stones) {
  const hc = { x: HOUSE_X, y: HOUSE_Y };
  const inHouse = stones
    .map(s => ({ s, d: dist(s, hc) }))
    .filter(({ d }) => d < RH + STONE_R * 0.5)
    .sort((a, b) => a.d - b.d);

  if (!inHouse.length) return { team: null, pts: 0, closest: null };
  const winner = inHouse[0].s.team;
  let pts = 0;
  for (const { s } of inHouse) {
    if (s.team === winner) pts++;
    else break;
  }
  return { team: winner, pts, closest: inHouse[0] };
}

// ── AI planner ────────────────────────────────────────────────────────────────
function planAIShot(stones, difficulty, frMult, curlMult) {
  const hc      = { x: HOUSE_X, y: HOUSE_Y };
  const all     = stones.filter(s => dist(s, hc) < RH + STONE_R);
  const pIn     = all.filter(s => s.team === "player").sort((a, b) => dist(a, hc) - dist(b, hc));
  const aIn     = all.filter(s => s.team === "ai").sort((a, b) => dist(a, hc) - dist(b, hc));

  let target, powerBias;

  const pLeading = pIn.length > 0 && (aIn.length === 0 || dist(pIn[0], hc) < dist(aIn[0], hc));
  const canTakeout = difficulty !== "easy";

  if (canTakeout && pLeading) {
    target    = { x: pIn[0].x, y: pIn[0].y };
    powerBias = difficulty === "hard" ? 0.84 : 0.80;
  } else if (aIn.length === 0) {
    // First draw: aim straight at button
    const sp = difficulty === "easy" ? 36 : difficulty === "hard" ? 10 : 22;
    target = { x: HOUSE_X + (Math.random() - 0.5) * sp, y: HOUSE_Y + (Math.random() - 0.5) * sp };
    powerBias = 0.47;
  } else if (aIn.length < 2) {
    const sp = difficulty === "easy" ? 30 : difficulty === "hard" ? 12 : 22;
    target = { x: HOUSE_X + (Math.random() - 0.5) * sp, y: HOUSE_Y + (Math.random() - 0.5) * sp };
    powerBias = 0.47;
  } else {
    // Guard
    const sp = difficulty === "easy" ? 44 : difficulty === "hard" ? 16 : 30;
    target = { x: HOUSE_X + (Math.random() - 0.5) * sp, y: HOUSE_Y + RH * 0.72 };
    powerBias = 0.43;
  }

  const rotation = target.x <= HACK_X ? 1 : -1;
  const dy    = target.y - HACK_Y;
  const spd   = 200 + powerBias * 280;
  const tEst  = Math.abs(dy) / (spd * 0.80);
  const drift = rotation * CURL_K * curlMult * spd * tEst * tEst * 0.5;
  const aimX  = target.x - drift;
  const angle = Math.atan2(dy, aimX - HACK_X);

  const eS = difficulty === "easy" ? 2.8 : difficulty === "hard" ? 0.30 : 1.0;
  const errA = (Math.random() - 0.5) * 0.07 * eS;
  const errP = (Math.random() - 0.5) * 0.10 * eS;
  return { vx: Math.cos(angle + errA) * spd * (1 + errP), vy: Math.sin(angle + errA) * spd * (1 + errP), rotation };
}

// ── Runtime ───────────────────────────────────────────────────────────────────
class IceStrikeRuntime {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext("2d");
    this.vW = W; this.vH = H;

    this.screen    = "menu";
    this.phase     = "playerAim";
    this.time      = 0;

    // Scores & ends
    this.end       = 1;
    this.delivIdx  = 0;
    this.hammer    = "player";
    this.scores    = { player: 0, ai: 0 };
    this.endLog    = [];
    this.lastResult = null;
    this.endTimer  = 0;

    // Stones & effects
    this.stones      = [];
    this.flyingStone = null;
    this.particles   = [];

    // Aim
    this.aim = { angle: -100, power: 0.50, rotation: 1 };
    this.strategy = "draw";   // current shot strategy

    // Ice condition (per end)
    this.iceCondKey = "pebbled";

    // Difficulty & AI
    this.difficulty = "medium";
    this.aiTimer    = 0;

    // Sweep
    this.sweeping = false;

    // Mouse drag power
    this._dragActive = false;
    this._dragMoved  = false;
    this._dragStartY = 0;
    this._dragStartPower = 0.5;

    // Input
    this.keys  = {};
    this.mouse = { x: W / 2, y: H / 2 };

    this._onKD     = e => this._keyDown(e);
    this._onKU     = e => this._keyUp(e);
    this._onMM     = e => this._mouseMove(e);
    this._onClick  = e => this._click(e);
    this._onMD     = e => this._mouseDown(e);
    this._onMU     = e => this._mouseUp(e);
    this._onResize = () => this._resize();
    this._running  = false;
    this._last     = 0;
    this._raf      = null;
    this._frame    = ts => this._tick(ts);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  start() {
    this._running = true;
    this._resize();
    window.addEventListener("resize",    this._onResize);
    window.addEventListener("keydown",   this._onKD);
    window.addEventListener("keyup",     this._onKU);
    this.canvas.addEventListener("mousemove", this._onMM);
    this.canvas.addEventListener("click",     this._onClick);
    this.canvas.addEventListener("mousedown", this._onMD);
    this.canvas.addEventListener("mouseup",   this._onMU);
    this._last = performance.now();
    this._raf  = requestAnimationFrame(this._frame);
  }

  destroy() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    window.removeEventListener("resize",    this._onResize);
    window.removeEventListener("keydown",   this._onKD);
    window.removeEventListener("keyup",     this._onKU);
    this.canvas.removeEventListener("mousemove", this._onMM);
    this.canvas.removeEventListener("click",     this._onClick);
    this.canvas.removeEventListener("mousedown", this._onMD);
    this.canvas.removeEventListener("mouseup",   this._onMU);
  }

  _resize() {
    const dpr  = clamp(window.devicePixelRatio || 1, 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || W, h = rect.height || H;
    this.canvas.width  = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.vW = w; this.vH = h;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._render();
  }

  // ── Coordinate helpers ─────────────────────────────────────────────────────
  _lx(e) { const r = this.canvas.getBoundingClientRect(); return (e.clientX - r.left) * (W / r.width); }
  _ly(e) { const r = this.canvas.getBoundingClientRect(); return (e.clientY - r.top)  * (H / r.height); }

  // ── Input ──────────────────────────────────────────────────────────────────
  _keyDown(e) {
    const { code } = e;
    if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Space"].includes(code)) e.preventDefault();
    this.keys[code] = true;
    if (e.repeat) return;

    if (code === "Escape") { this.screen = "menu"; return; }
    if (this.screen === "menu" && (code === "Enter" || code === "Space")) { this._startGame(); return; }
    if (this.screen === "gameOver" && (code === "Enter" || code === "Space" || code === "KeyR")) { this.screen = "menu"; return; }
    if (this.screen !== "play") return;
    if (code === "KeyR") { this._startGame(); return; }

    if (this.phase === "playerAim") {
      if (code === "KeyQ") { this.aim.rotation = -1; return; }
      if (code === "KeyE") { this.aim.rotation =  1; return; }
      if (code === "Digit1") { this._setStrategy("draw");    return; }
      if (code === "Digit2") { this._setStrategy("guard");   return; }
      if (code === "Digit3") { this._setStrategy("takeout"); return; }
      if (code === "Digit4") { this._setStrategy("raise");   return; }
      if (code === "Space" || code === "Enter") { this._deliver(); return; }
    }
    if (this.phase === "flight") {
      if (code === "KeyS" || code === "ArrowDown") { this.sweeping = true; return; }
    }
  }

  _keyUp(e) {
    this.keys[e.code] = false;
    if (e.code === "KeyS" || e.code === "ArrowDown") this.sweeping = false;
  }

  _mouseMove(e) {
    this.mouse.x = this._lx(e);
    this.mouse.y = this._ly(e);
    if (this.phase !== "playerAim" || this.screen !== "play") return;
    const mx = this.mouse.x, my = this.mouse.y;
    if (mx > ICE_W) return;
    if (this._dragActive) {
      const delta = this._dragStartY - my;
      if (Math.abs(delta) > 3) this._dragMoved = true;
      this.aim.power = clamp(this._dragStartPower + delta / 200, 0, 1);
      return;
    }
    const adx = mx - HACK_X, ady = my - HACK_Y;
    if (Math.abs(adx) < 4 && Math.abs(ady) < 4) return;
    const ang = Math.atan2(ady, adx) * 180 / Math.PI;
    this.aim.angle = clamp(ang, -168, -12);
  }

  _mouseDown(e) {
    if (this.screen === "menu") return;
    if (this.phase !== "playerAim" || this.screen !== "play") return;
    const mx = this._lx(e), my = this._ly(e);
    if (mx > ICE_W) return;
    this._dragActive     = true;
    this._dragMoved      = false;
    this._dragStartY     = my;
    this._dragStartPower = this.aim.power;
  }

  _mouseUp() { this._dragActive = false; }

  _click(e) {
    const mx = this._lx(e), my = this._ly(e);
    if (this.screen === "menu") {
      // Difficulty buttons
      const bY = H / 2 + 8, bH = 34, bW = 90;
      const bEx = W / 2 - 148, bMx = W / 2 - 45, bHx = W / 2 + 58;
      if (my > bY && my < bY + bH) {
        if (mx > bEx && mx < bEx + bW) { this.difficulty = "easy";   return; }
        if (mx > bMx && mx < bMx + bW) { this.difficulty = "medium"; return; }
        if (mx > bHx && mx < bHx + bW) { this.difficulty = "hard";   return; }
      }
      this._startGame();
      return;
    }
    if (this.screen === "gameOver") { this.screen = "menu"; return; }
    if (this.screen !== "play") return;
    if (this.phase === "playerAim" && mx < ICE_W) {
      if (this._dragMoved) { this._dragMoved = false; return; }
      const adx = mx - HACK_X, ady = my - HACK_Y;
      if (Math.abs(adx) > 4 || Math.abs(ady) > 4) {
        const ang = Math.atan2(ady, adx) * 180 / Math.PI;
        this.aim.angle = clamp(ang, -168, -12);
      }
      this._deliver();
    }
  }

  // ── Game control ──────────────────────────────────────────────────────────
  _setStrategy(name) {
    this.strategy = name;
    const strat   = STRATEGIES[name];
    // Auto-set power bias for strategy
    this.aim.power = strat.powerBias;
    // Auto-aim angle toward strategy target
    const target = this._strategyTarget(name);
    if (target) {
      const dx = target.x - HACK_X, dy = target.y - HACK_Y;
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      this.aim.angle = clamp(ang, -168, -12);
    }
  }

  _strategyTarget(name) {
    const hc = { x: HOUSE_X, y: HOUSE_Y };
    const pIn = this.stones.filter(s => s.team === "player" && dist(s, hc) < RH);
    const aIn = this.stones.filter(s => s.team === "ai"     && dist(s, hc) < RH);
    switch (name) {
      case "draw":    return { x: HOUSE_X, y: HOUSE_Y };
      case "guard":   return { x: HOUSE_X, y: HOUSE_Y + RH + STONE_R * 2 };
      case "takeout": {
        const enemy = pIn.sort((a, b) => dist(a, hc) - dist(b, hc))[0];
        return enemy ? { x: enemy.x, y: enemy.y } : { x: HOUSE_X, y: HOUSE_Y };
      }
      case "raise": {
        const own = aIn.sort((a, b) => dist(a, hc) - dist(b, hc))[0];
        return own ? { x: own.x, y: own.y } : { x: HOUSE_X, y: HOUSE_Y };
      }
      default: return null;
    }
  }

  get _iceCond() { return ICE_CONDITIONS[this.iceCondKey]; }
  get _frMult()  { return this._iceCond.frictionMult; }
  get _curlMult(){ return this._iceCond.curlMult; }

  get _currentTeam() {
    return this.hammer === "player"
      ? (this.delivIdx % 2 === 0 ? "ai" : "player")
      : (this.delivIdx % 2 === 0 ? "player" : "ai");
  }

  _startGame() {
    // Pick random ice condition for first end
    this.iceCondKey  = ICE_COND_KEYS[Math.floor(Math.random() * ICE_COND_KEYS.length)];
    this.end         = 1;
    this.delivIdx    = 0;
    this.stones      = [];
    this.flyingStone = null;
    this.scores      = { player: 0, ai: 0 };
    this.endLog      = [];
    this.lastResult  = null;
    this.hammer      = "player";
    this.sweeping    = false;
    this.particles   = [];
    this._dragActive = false;
    this._dragMoved  = false;
    this.aim         = { angle: -100, power: 0.50, rotation: 1 };
    this.strategy    = "draw";
    this.screen      = "play";
    this.phase       = this._currentTeam === "player" ? "playerAim" : "aiTurn";
    this.aiTimer     = this.phase === "aiTurn" ? 1.4 : 0;
  }

  _deliver() {
    if (this.phase !== "playerAim") return;
    const rad = this.aim.angle * Math.PI / 180;
    const spd = 200 + this.aim.power * 280;
    const s   = {
      x: HACK_X, y: HACK_Y,
      vx: Math.cos(rad) * spd,
      vy: Math.sin(rad) * spd,
      rotation: this.aim.rotation,
      team: "player",
      id:   `p${this.delivIdx}`,
      delivNum: this.delivIdx + 1,
      crossed_hog: false,
      trail: [],
      spinAngle: 0,
    };
    this.stones.push(s);
    this.flyingStone = s;
    this.phase       = "flight";
    this.sweeping    = false;
  }

  _aiDeliver() {
    const shot = planAIShot(this.stones, this.difficulty, this._frMult, this._curlMult);
    const s    = {
      x: HACK_X, y: HACK_Y,
      vx: shot.vx, vy: shot.vy,
      rotation: shot.rotation,
      team: "ai",
      id:   `a${this.delivIdx}`,
      delivNum: this.delivIdx + 1,
      crossed_hog: false,
      trail: [],
      spinAngle: 0,
    };
    this.stones.push(s);
    this.flyingStone = s;
    this.phase       = "flight";
    this.sweeping    = false;
    this.aiTimer     = 0;
  }

  _finishEnd() {
    const result = computeScore(this.stones);
    this.lastResult = result;
    if (result.team === "player") this.scores.player += result.pts;
    else if (result.team === "ai") this.scores.ai    += result.pts;
    this.endLog.push({
      player: result.team === "player" ? result.pts : 0,
      ai:     result.team === "ai"     ? result.pts : 0,
    });
    if (result.team === "player") this.hammer = "ai";
    else if (result.team === "ai") this.hammer = "player";
    this.phase    = "endResult";
    this.endTimer = 3.5;
  }

  _nextEnd() {
    this.end++;
    if (this.end > ENDS) { this.screen = "gameOver"; return; }
    // New ice condition each end
    this.iceCondKey  = ICE_COND_KEYS[Math.floor(Math.random() * ICE_COND_KEYS.length)];
    this.delivIdx    = 0;
    this.stones      = [];
    this.flyingStone = null;
    this.lastResult  = null;
    this.sweeping    = false;
    this.particles   = [];
    this.aim         = { angle: -100, power: 0.50, rotation: 1 };
    this.strategy    = "draw";
    this.phase       = this._currentTeam === "player" ? "playerAim" : "aiTurn";
    this.aiTimer     = this.phase === "aiTurn" ? 1.4 : 0;
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  _tick(ts) {
    if (!this._running) return;
    const dt = clamp((ts - this._last) / 1000, 0, 0.05);
    this._last = ts;
    this._update(dt);
    this._render();
    this._raf = requestAnimationFrame(this._frame);
  }

  _update(dt) {
    this.time += dt;

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.88;     p.vy *= 0.88;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    if (this.screen !== "play") return;

    // Keyboard aim
    if (this.phase === "playerAim") {
      const ANG = 44 * dt, POW = 0.52 * dt;
      if (this.keys["ArrowLeft"]  || this.keys["KeyA"]) this.aim.angle = clamp(this.aim.angle - ANG, -168, -12);
      if (this.keys["ArrowRight"] || this.keys["KeyD"]) this.aim.angle = clamp(this.aim.angle + ANG, -168, -12);
      if (this.keys["ArrowUp"]    || this.keys["KeyW"]) this.aim.power = clamp(this.aim.power + POW, 0, 1);
      if (this.keys["ArrowDown"])                       this.aim.power = clamp(this.aim.power - POW, 0, 1);
    }

    if (this.phase === "endResult") {
      this.endTimer -= dt;
      if (this.endTimer <= 0) this._nextEnd();
      return;
    }

    if (this.phase === "aiTurn") {
      this.aiTimer -= dt;
      if (this.aiTimer <= 0) this._aiDeliver();
      return;
    }

    if (this.phase !== "flight") return;

    // Sub-step physics
    const SUBS = 4;
    for (let sub = 0; sub < SUBS; sub++) {
      const sdt    = dt / SUBS;
      const flying = this.flyingStone;

      for (const s of this.stones) {
        if (s.vx === 0 && s.vy === 0) continue;
        const isSweeping = this.sweeping && s === flying;
        stepStone(s, sdt, isSweeping, this._frMult, this._curlMult);
        if (!s.crossed_hog && s.y < HOG_Y) s.crossed_hog = true;

        // Spin animation
        const spd = Math.hypot(s.vx, s.vy);
        s.spinAngle = (s.spinAngle || 0) + s.rotation * spd * sdt * 0.04;
      }
      resolveCollisions(this.stones, this.particles);
    }

    // Sweep particles
    if (this.sweeping && this.flyingStone) {
      const f = this.flyingStone;
      if (Math.hypot(f.vx, f.vy) > 20) {
        for (let k = 0; k < 3; k++) {
          this.particles.push({
            x: f.x + (Math.random() - 0.5) * 24, y: f.y + STONE_R + Math.random() * 10,
            vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 14,
            life: 0.40, maxLife: 0.40, col: CLR.sweepIce, r: 1.8,
          });
        }
      }
    }

    // Trail
    if (this.flyingStone) {
      const f = this.flyingStone;
      f.trail.push({ x: f.x, y: f.y });
      if (f.trail.length > 35) f.trail.shift();
    }

    // OOB / hog rule
    for (let i = this.stones.length - 1; i >= 0; i--) {
      const s   = this.stones[i];
      const spd = Math.hypot(s.vx, s.vy);
      if (spd > 0) {
        if (s.x < SH_L - STONE_R * 3 || s.x > SH_R + STONE_R * 3 || s.y < BACK_Y - 30) {
          if (s === this.flyingStone) this.flyingStone = null;
          this.stones.splice(i, 1);
        }
        continue;
      }
      const oob = s.x < SH_L + STONE_R || s.x > SH_R - STONE_R
               || s.y < BACK_Y           || s.y > HACK_Y + 30
               || !s.crossed_hog;
      if (oob) {
        if (s === this.flyingStone) this.flyingStone = null;
        this.stones.splice(i, 1);
      }
    }

    // Check all at rest
    const anyMoving = this.stones.some(s => Math.hypot(s.vx, s.vy) > 0.5);
    if (!anyMoving && this.flyingStone === null) {
      this.delivIdx++;
      if (this.delivIdx >= SHOTS_PER_TEAM * 2) {
        this._finishEnd();
      } else {
        const team = this._currentTeam;
        if (team === "player") {
          this.phase    = "playerAim";
          this.aim      = { angle: -100, power: 0.50, rotation: 1 };
          this.strategy = "draw";
        } else {
          this.phase   = "aiTurn";
          this.aiTimer = 0.9 + Math.random() * 0.7;
        }
      }
    }
  }

  // ── Rendering ──────────────────────────────────────────────────────────────
  _render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.vW, this.vH);
    const sx = this.vW / W, sy = this.vH / H;
    ctx.save();
    ctx.scale(sx, sy);

    if (this.screen === "menu")    { this._drawMenu(ctx, W, H);     ctx.restore(); return; }
    if (this.screen === "gameOver") { this._drawGameOver(ctx, W, H); ctx.restore(); return; }

    this._drawIce(ctx);
    this._drawAim(ctx);
    this._drawStones(ctx);
    this._drawParticles(ctx);
    this._drawHUD(ctx);
    if (this.phase === "endResult") this._drawEndBanner(ctx);

    ctx.restore();
  }

  _drawIce(ctx) {
    // Full background
    ctx.fillStyle = CLR.bg; ctx.fillRect(0, 0, W, H);

    // ── Board surround (the rink "boards") ──
    const BL = SH_L - 28, BR = SH_R + 28, BT = BACK_Y - 28, BB = HACK_Y + 38;
    const BW = BR - BL, BH = BB - BT;
    const bgr = ctx.createLinearGradient(BL, BT, BR, BB);
    bgr.addColorStop(0, CLR.boardA);
    bgr.addColorStop(1, CLR.boardB);
    ctx.fillStyle = bgr;
    ctx.beginPath(); rr(ctx, BL, BT, BW, BH, 14); ctx.fill();
    // Board inner highlight
    ctx.strokeStyle = CLR.boardLine; ctx.lineWidth = 1;
    ctx.beginPath(); rr(ctx, BL + 6, BT + 6, BW - 12, BH - 12, 10); ctx.stroke();

    // ── Ice sheet fill ──
    const iceGrad = ctx.createLinearGradient(SH_L, HOUSE_Y, SH_MID, HACK_Y);
    iceGrad.addColorStop(0,    CLR.iceTop);
    iceGrad.addColorStop(0.40, CLR.iceMid);
    iceGrad.addColorStop(1,    CLR.iceBot);
    ctx.fillStyle = iceGrad;
    ctx.beginPath(); rr(ctx, SH_L - 2, BACK_Y - 2, SH_W + 4, HACK_Y - BACK_Y + 24, 4); ctx.fill();

    // Clip for textures
    ctx.save();
    ctx.beginPath(); rr(ctx, SH_L - 2, BACK_Y - 2, SH_W + 4, HACK_Y - BACK_Y + 24, 4);
    ctx.clip();

    // Ice grain scratches
    ctx.lineWidth = 0.7;
    for (const sc of SCRATCHES) {
      ctx.beginPath();
      ctx.moveTo(sc.x1, sc.y1); ctx.lineTo(sc.x2, sc.y2);
      ctx.strokeStyle = `rgba(255,255,255,${sc.a})`; ctx.stroke();
    }

    // Pebble texture dots
    for (const p of PEBBLES) {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${p.a})`; ctx.fill();
    }

    // Ice condition tint overlay
    const condCol = this._iceCond.color;
    ctx.fillStyle = condCol + "12";
    ctx.fillRect(SH_L, BACK_Y, SH_W, HACK_Y - BACK_Y);

    // Gloss sheen
    const gl = ctx.createLinearGradient(SH_L, BACK_Y, SH_MID, HOUSE_Y + 100);
    gl.addColorStop(0, "rgba(255,255,255,0.22)");
    gl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gl; ctx.fillRect(SH_L, BACK_Y, SH_W, (HACK_Y - BACK_Y) * 0.45);

    ctx.restore();

    // ── Sheet boundary rails ──
    ctx.strokeStyle = CLR.iceEdge; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(SH_L, BACK_Y - 6); ctx.lineTo(SH_L, HACK_Y + 22);
    ctx.moveTo(SH_R, BACK_Y - 6); ctx.lineTo(SH_R, HACK_Y + 22);
    ctx.stroke();

    // ── Center line (full length, dashed) ──
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = CLR.centre; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(SH_MID, BACK_Y); ctx.lineTo(SH_MID, HACK_Y + 22); ctx.stroke();
    ctx.setLineDash([]);

    // ── Dividing line (mid-sheet, solid) ──
    ctx.strokeStyle = CLR.divLine; ctx.lineWidth = 1.0;
    ctx.beginPath(); ctx.moveTo(SH_L, DIV_Y); ctx.lineTo(SH_R, DIV_Y); ctx.stroke();

    // ── Back line ──
    ctx.strokeStyle = CLR.tee; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(SH_L, BACK_Y); ctx.lineTo(SH_R, BACK_Y); ctx.stroke();

    // ── Tee line (through house) ──
    ctx.strokeStyle = CLR.tee; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(SH_L, TEE_Y); ctx.lineTo(SH_R, TEE_Y); ctx.stroke();

    // ── Hog line ──
    ctx.strokeStyle = CLR.hog; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(SH_L, HOG_Y); ctx.lineTo(SH_R, HOG_Y); ctx.stroke();

    // ── House rings (outer→inner) ──
    const houseCtx = ctx;
    // 12-foot red
    houseCtx.beginPath(); houseCtx.arc(HOUSE_X, HOUSE_Y, RH, 0, Math.PI * 2);
    houseCtx.fillStyle = CLR.ring12; houseCtx.fill();
    // 8-foot white
    houseCtx.beginPath(); houseCtx.arc(HOUSE_X, HOUSE_Y, RM, 0, Math.PI * 2);
    houseCtx.fillStyle = CLR.ring8; houseCtx.fill();
    // 4-foot blue
    houseCtx.beginPath(); houseCtx.arc(HOUSE_X, HOUSE_Y, RI, 0, Math.PI * 2);
    houseCtx.fillStyle = CLR.ring4; houseCtx.fill();
    // Button (white)
    houseCtx.beginPath(); houseCtx.arc(HOUSE_X, HOUSE_Y, RB, 0, Math.PI * 2);
    houseCtx.fillStyle = CLR.ringBtn; houseCtx.fill();

    // House ring outlines
    ctx.lineWidth = 0.8;
    [RH, RM, RI, RB].forEach((r, i) => {
      ctx.beginPath(); ctx.arc(HOUSE_X, HOUSE_Y, r, 0, Math.PI * 2);
      ctx.strokeStyle = i === 0 ? "rgba(140,20,20,0.35)" : "rgba(120,120,160,0.30)";
      ctx.stroke();
    });

    // House ring labels
    ctx.font = "bold 8px Arial"; ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.textAlign = "center";
    ctx.fillText("12", HOUSE_X, HOUSE_Y - RH + 14);
    ctx.fillStyle = "rgba(80,80,80,0.60)";
    ctx.fillText("8",  HOUSE_X, HOUSE_Y - RM + 13);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText("4",  HOUSE_X, HOUSE_Y - RI + 12);

    // Cross hair through house button
    ctx.strokeStyle = "rgba(40,80,160,0.55)"; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(HOUSE_X - 18, HOUSE_Y); ctx.lineTo(HOUSE_X + 18, HOUSE_Y);
    ctx.moveTo(HOUSE_X, HOUSE_Y - 18); ctx.lineTo(HOUSE_X, HOUSE_Y + 18);
    ctx.stroke();

    // ── Hack (throwing block) ──
    ctx.beginPath(); ctx.arc(HACK_X, HACK_Y, 11, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(25,45,85,0.50)"; ctx.fill();
    ctx.strokeStyle = "rgba(70,130,220,0.65)"; ctx.lineWidth = 2; ctx.stroke();
    // Hack grip lines
    ctx.strokeStyle = "rgba(70,130,220,0.30)"; ctx.lineWidth = 1;
    for (let d = -8; d <= 8; d += 4) {
      ctx.beginPath(); ctx.moveTo(HACK_X + d, HACK_Y - 8); ctx.lineTo(HACK_X + d, HACK_Y + 8); ctx.stroke();
    }

    // ── Line labels on left board ──
    ctx.textAlign = "right"; ctx.fillStyle = "rgba(140,180,210,0.60)";
    ctx.font = "bold 8px Arial";
    ctx.fillText("BACK", SH_L - 10, BACK_Y + 3);
    ctx.fillText("TEE",  SH_L - 10, TEE_Y + 3);
    ctx.fillText("HOG",  SH_L - 10, HOG_Y + 3);
    ctx.fillText("HACK", SH_L - 10, HACK_Y + 3);

    // ── Stone distance markers on right board ──
    ctx.textAlign = "left"; ctx.fillStyle = "rgba(110,150,190,0.42)";
    ctx.font = "7px Arial";
    const distY = [BACK_Y, TEE_Y, HOG_Y];
    distY.forEach(y => {
      ctx.beginPath();
      ctx.moveTo(SH_R + 4, y);
      ctx.lineTo(SH_R + 12, y);
      ctx.strokeStyle = "rgba(110,150,190,0.35)"; ctx.lineWidth = 1; ctx.stroke();
    });
  }

  _drawAim(ctx) {
    if (this.phase !== "playerAim") return;

    const rad = this.aim.angle * Math.PI / 180;
    const spd = 200 + this.aim.power * 280;
    const rot = this.aim.rotation;
    const strat = STRATEGIES[this.strategy];
    const trajCol = CLR[`traj${this.strategy.charAt(0).toUpperCase() + this.strategy.slice(1)}`] || CLR.trajDraw;

    // ── Simulate trajectory ──
    let bx = HACK_X, by = HACK_Y;
    let bvx = Math.cos(rad) * spd, bvy = Math.sin(rad) * spd;
    const path = [{ x: bx, y: by }];
    const SDT = 1 / 20;
    for (let i = 0; i < 100; i++) {
      const sp = Math.hypot(bvx, bvy);
      if (sp < 2) break;
      const ratio = Math.max(0, sp - BASE_FRICTION * this._frMult * SDT) / sp;
      bvx *= ratio; bvy *= ratio;
      const fwd = -bvy;
      if (fwd > 8) bvx += rot * CURL_K * this._curlMult * fwd * SDT;
      bx += bvx * SDT; by += bvy * SDT;
      if (bx < SH_L - 6 || bx > SH_R + 6 || by < BACK_Y - 14) break;
      path.push({ x: bx, y: by });
    }

    // Dashed trajectory in strategy color
    if (path.length > 2) {
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (const pt of path) ctx.lineTo(pt.x, pt.y);
      ctx.strokeStyle = trajCol;
      ctx.lineWidth   = 2.2;
      ctx.setLineDash([6, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ghost stone at trajectory end
      const ep = path[path.length - 1];
      ctx.beginPath(); ctx.arc(ep.x, ep.y, STONE_R, 0, Math.PI * 2);
      ctx.strokeStyle = trajCol; ctx.lineWidth = 1.8; ctx.stroke();
      // Ghost stone fill
      ctx.fillStyle = trajCol.replace("0.50", "0.18"); ctx.fill();
    }

    // ── Curl indicator arc at hack ──
    const arcR = 28;
    ctx.beginPath();
    ctx.arc(HACK_X, HACK_Y, arcR, -Math.PI * 0.08, Math.PI * 1.08, rot < 0);
    ctx.strokeStyle = rot > 0 ? "rgba(90,200,255,0.70)" : "rgba(255,120,80,0.70)";
    ctx.lineWidth   = 2.2; ctx.stroke();

    // Arrow dot at arc end
    const arrowT = rot > 0 ? Math.PI * 1.08 : -Math.PI * 0.08;
    const ax = HACK_X + Math.cos(arrowT) * arcR;
    const ay = HACK_Y + Math.sin(arrowT) * arcR;
    ctx.beginPath(); ctx.arc(ax, ay, 4, 0, Math.PI * 2);
    ctx.fillStyle = rot > 0 ? "rgba(90,200,255,0.75)" : "rgba(255,120,80,0.75)"; ctx.fill();

    // ── Mouse-drag power indicator ──
    if (this._dragActive) {
      const bX = HACK_X + 26, bTop = HACK_Y - 44, bH = 88;
      ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(bX, bTop, 10, bH);
      ctx.fillStyle = "#4ab8ff";
      ctx.fillRect(bX, bTop + bH * (1 - this.aim.power), 10, bH * this.aim.power);
      ctx.strokeStyle = "rgba(140,210,255,0.65)"; ctx.lineWidth = 1;
      ctx.strokeRect(bX, bTop, 10, bH);
    }
  }

  _drawStones(ctx) {
    const hc = { x: HOUSE_X, y: HOUSE_Y };

    for (const s of this.stones) {
      const cx = s.x, cy = s.y;
      const isFlying = s === this.flyingStone;
      const team     = s.team;
      const spin     = s.spinAngle || 0;

      // ── Trail ──
      if (isFlying && s.trail.length > 2) {
        for (let ti = 1; ti < s.trail.length; ti++) {
          const a = ti / s.trail.length;
          ctx.beginPath();
          ctx.moveTo(s.trail[ti - 1].x, s.trail[ti - 1].y);
          ctx.lineTo(s.trail[ti].x,     s.trail[ti].y);
          ctx.strokeStyle = team === "player"
            ? `rgba(232,48,48,${a * 0.40})`
            : `rgba(212,168,0,${a * 0.40})`;
          ctx.lineWidth = STONE_R * 1.8 * a * 0.7;
          ctx.stroke();
        }
      }

      // ── Shadow ──
      ctx.beginPath(); ctx.ellipse(cx + 3, cy + 5, STONE_R * 0.90, STONE_R * 0.35, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fill();

      // ── Granite body (radial gradient) ──
      const g = ctx.createRadialGradient(cx - STONE_R * 0.3, cy - STONE_R * 0.3, 2, cx, cy, STONE_R);
      if (team === "player") {
        g.addColorStop(0,   "#ff9898");
        g.addColorStop(0.45,"#d42020");
        g.addColorStop(0.78,"#880808");
        g.addColorStop(1,   "#440404");
      } else {
        g.addColorStop(0,   "#fff8a0");
        g.addColorStop(0.45,"#d4a000");
        g.addColorStop(0.78,"#806000");
        g.addColorStop(1,   "#402800");
      }
      ctx.beginPath(); ctx.arc(cx, cy, STONE_R, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();

      // ── Granite speckle texture ──
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, STONE_R - 1, 0, Math.PI * 2); ctx.clip();
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2 + spin;
        const rr2 = STONE_R * (0.3 + Math.random() * 0.55);
        const sx2 = cx + Math.cos(ang) * rr2;
        const sy2 = cy + Math.sin(ang) * rr2;
        ctx.beginPath(); ctx.arc(sx2, sy2, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = team === "player"
          ? "rgba(120,20,20,0.35)"
          : "rgba(100,80,0,0.35)";
        ctx.fill();
      }
      ctx.restore();

      // ── Outer ring (concentric band) ──
      ctx.beginPath(); ctx.arc(cx, cy, STONE_R, 0, Math.PI * 2);
      ctx.strokeStyle = team === "player" ? "rgba(255,140,140,0.70)" : "rgba(255,220,80,0.70)";
      ctx.lineWidth   = 2.2; ctx.stroke();

      // ── Concave inner band ──
      ctx.beginPath(); ctx.arc(cx, cy, STONE_R * 0.55, 0, Math.PI * 2);
      ctx.strokeStyle = team === "player" ? "rgba(200,60,60,0.50)" : "rgba(200,150,0,0.50)";
      ctx.lineWidth   = 1.2; ctx.stroke();

      // ── Handle (rotates with spin) ──
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(spin);
      const hLen = STONE_R * 0.52;
      ctx.beginPath();
      ctx.moveTo(-hLen * 0.4, -STONE_R * 0.08);
      ctx.lineTo( hLen * 0.4, -STONE_R * 0.08);
      ctx.lineWidth   = 3.2;
      ctx.strokeStyle = team === "player" ? "#e83838" : "#d4a000";
      ctx.stroke();
      // Handle dots
      ctx.beginPath(); ctx.arc(-hLen * 0.28, 0, 2.5, 0, Math.PI * 2);
      ctx.beginPath(); ctx.arc( hLen * 0.28, 0, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = team === "player" ? "#ff8080" : "#ffe060"; ctx.fill();
      ctx.restore();

      // ── Gloss highlight ──
      ctx.beginPath(); ctx.arc(cx - STONE_R * 0.28, cy - STONE_R * 0.28, STONE_R * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.30)"; ctx.fill();

      // ── Flying stone glow ──
      if (isFlying) {
        const glow = ctx.createRadialGradient(cx, cy, STONE_R, cx, cy, STONE_R + 12);
        glow.addColorStop(0, team === "player" ? "rgba(232,48,48,0.45)" : "rgba(212,168,0,0.45)");
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(cx, cy, STONE_R + 12, 0, Math.PI * 2);
        ctx.fillStyle = glow; ctx.fill();
      }

      // ── Delivery number ──
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.90)";
      ctx.font = `bold ${STONE_R < 13 ? 7 : 8}px Arial`;
      ctx.fillText(s.delivNum, cx, cy + 3);

      // ── Distance to button (only in-house stones at rest) ──
      const hd = dist(s, hc);
      if (!isFlying && hd < RH + STONE_R) {
        ctx.fillStyle = "rgba(255,255,255,0.70)";
        ctx.font = "6px Arial";
        ctx.fillText(Math.round(hd), cx, cy + STONE_R + 10);
      }

      // ── Closest stone indicator ──
      const scoring = computeScore(this.stones);
      if (scoring.closest && scoring.closest.s === s) {
        ctx.beginPath(); ctx.arc(cx, cy, STONE_R + 5, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,180,0.90)"; ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
      }
    }

    // ── Broom sweep effect ──
    if (this.sweeping && this.flyingStone) {
      const f   = this.flyingStone;
      const spd = Math.hypot(f.vx, f.vy);
      if (spd > 20) {
        const t = (this.time * 22) % 1;
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = "#a8cce8"; ctx.lineWidth = 2.5;
        for (let i = -2; i <= 2; i++) {
          const ox = i * 8 + (t - 0.5) * 6;
          ctx.beginPath();
          ctx.moveTo(f.x + ox, f.y + STONE_R + 2);
          ctx.lineTo(f.x + ox + (Math.random() - 0.5) * 5, f.y + STONE_R + 22);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  _drawParticles(ctx) {
    for (const p of this.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a * 0.75;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * a + 0.5, 0, Math.PI * 2);
      ctx.fillStyle = p.col; ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawHUD(ctx) {
    const px = ICE_W + 4, pw = W - px - 4, cx2 = px + pw / 2;

    // Panel background
    const pbg = ctx.createLinearGradient(px, 0, W, 0);
    pbg.addColorStop(0, CLR.panelBg);
    pbg.addColorStop(1, "#060a14");
    ctx.fillStyle = pbg; ctx.fillRect(px, 0, pw, H);
    ctx.strokeStyle = CLR.panelBdr; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();

    ctx.textAlign = "center";

    // ── Title ──
    ctx.fillStyle = CLR.accent; ctx.font = "bold 15px Arial";
    ctx.fillText("❄  ICE STRIKE PRO", cx2, 26);

    // End counter
    ctx.fillStyle = "rgba(100,155,215,0.55)"; ctx.font = "10px Arial";
    ctx.fillText(`End  ${this.end}  /  ${ENDS}`, cx2, 42);

    // Difficulty badge
    const diffCol = this.difficulty === "easy" ? "#50d870" : this.difficulty === "hard" ? "#ff5050" : "#f0c020";
    ctx.fillStyle = diffCol; ctx.font = "bold 8px Arial";
    ctx.fillText(this.difficulty.toUpperCase(), cx2, 53);

    // ── Scoreboard ──
    const sbY = 60, sbH = 80, sbW = pw - 20;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath(); rr(ctx, px + 10, sbY, sbW, sbH, 8); ctx.fill();

    const halfW   = sbW / 2 - 5;
    const ledBlink = Math.sin(this.time * 5.5) > 0;
    const pActive  = this.phase === "playerAim" || (this.phase === "flight" && this.flyingStone?.team === "player");
    const aActive  = this.phase === "aiTurn"    || (this.phase === "flight" && this.flyingStone?.team === "ai");

    const drawSide = (label, score, col, ox, active) => {
      const scx = px + 10 + ox + halfW / 2;
      ctx.textAlign = "center";
      ctx.fillStyle = active ? col : "rgba(100,130,160,0.55)";
      ctx.font = "bold 11px Arial";
      ctx.fillText(label, scx, sbY + 20);
      if (active) {
        ctx.beginPath(); ctx.arc(scx + 24, sbY + 15, 4, 0, Math.PI * 2);
        ctx.fillStyle = ledBlink ? "#44ff88" : "#103020"; ctx.fill();
        ctx.strokeStyle = "rgba(60,255,120,0.55)"; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(scx + 24, sbY + 15, 4, 0, Math.PI * 2); ctx.stroke();
      }
      const sCol = score >= 8 ? "#ff4444" : score >= 5 ? "#ffaa22" : active ? "#40e878" : "#1e4060";
      ctx.fillStyle = sCol;
      ctx.font = `bold ${Math.min(40, halfW * 0.78)}px Arial`;
      ctx.fillText(score, scx, sbY + 62);
    };
    drawSide("🔴 YOU", this.scores.player, CLR.playerCol, 0,          pActive);
    drawSide("🟡 CPU", this.scores.ai,     CLR.aiCol,     halfW + 10, aActive);
    ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 10 + halfW + 5, sbY + 8);
    ctx.lineTo(px + 10 + halfW + 5, sbY + sbH - 8);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.font = "9px Arial";
    ctx.fillText("vs", px + 10 + halfW + 5, sbY + 44);

    // ── Hammer indicator ──
    const hamY = sbY + sbH + 8;
    ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,220,80,0.70)"; ctx.font = "bold 8px Arial";
    const hamLabel = this.hammer === "player" ? "🔨 YOU have hammer" : "🔨 CPU has hammer";
    ctx.fillText(hamLabel, cx2, hamY + 8);

    // ── Delivery progress ──
    const delY  = hamY + 22;
    const total = SHOTS_PER_TEAM * 2;
    ctx.fillStyle = "rgba(80,125,180,0.55)"; ctx.font = "9px Arial"; ctx.textAlign = "center";
    ctx.fillText(`Shot  ${this.delivIdx + 1}  /  ${total}`, cx2, delY);
    const dotW = (pw - 32) / total;
    for (let i = 0; i < total; i++) {
      const team    = this.hammer === "player" ? (i % 2 === 0 ? "ai" : "player") : (i % 2 === 0 ? "player" : "ai");
      const col     = team === "player" ? CLR.playerCol : CLR.aiCol;
      const thrown  = i < this.delivIdx;
      const current = i === this.delivIdx;
      const dotX    = px + 16 + i * dotW + dotW / 2;
      const dotY    = delY + 13;
      ctx.beginPath(); ctx.arc(dotX, dotY, current ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = thrown ? "rgba(40,60,95,0.55)" : current ? col : col + "88";
      ctx.fill();
      if (current) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.2; ctx.stroke(); }
    }

    // ── Live score preview ──
    const scoring = computeScore(this.stones);
    const pvY     = delY + 36;
    ctx.textAlign = "center";
    if (scoring.team) {
      const col = scoring.team === "player" ? CLR.playerCol : CLR.aiCol;
      ctx.fillStyle = col; ctx.font = "bold 12px Arial";
      ctx.fillText(`${scoring.team === "player" ? "YOU" : "CPU"}  +${scoring.pts} pts`, cx2, pvY);
      ctx.fillStyle = "rgba(80,120,160,0.50)"; ctx.font = "8px Arial";
      ctx.fillText("leading this end", cx2, pvY + 13);
    } else if (this.stones.length > 0) {
      ctx.fillStyle = "rgba(90,125,165,0.50)"; ctx.font = "9px Arial";
      ctx.fillText("no stones in house", cx2, pvY + 4);
    }

    // ── Ice condition badge ──
    const icY = pvY + 26;
    const cond = this._iceCond;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath(); rr(ctx, px + 12, icY, pw - 24, 22, 5); ctx.fill();
    ctx.fillStyle = cond.color; ctx.font = "bold 9px Arial"; ctx.textAlign = "left";
    ctx.fillText("❄ " + cond.label, px + 20, icY + 15);
    ctx.fillStyle = "rgba(130,170,210,0.50)"; ctx.font = "8px Arial"; ctx.textAlign = "right";
    const condDesc = cond.frictionMult < 1 ? "faster, less curl" : cond.frictionMult > 1 ? "slower, more curl" : "normal";
    ctx.fillText(condDesc, px + pw - 16, icY + 15);

    // ── Power + rotation (player aim only) ──
    if (this.phase === "playerAim") {
      const gY  = icY + 30;
      const gW  = pw - 28;

      // Power label & value
      ctx.textAlign = "left"; ctx.fillStyle = "rgba(80,130,185,0.65)"; ctx.font = "9px Arial";
      ctx.fillText("POWER", px + 14, gY - 1);
      ctx.textAlign = "right"; ctx.fillStyle = CLR.accent; ctx.font = "bold 9px Arial";
      ctx.fillText(`${Math.round(this.aim.power * 100)}%`, px + pw - 14, gY - 1);

      // Power bar background
      ctx.fillStyle = "#0e1928"; ctx.fillRect(px + 14, gY + 2, gW, 14);
      // Zone marker (draw weight zone)
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(px + 14 + gW * 0.35, gY + 2, gW * 0.30, 14);
      ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + 14 + gW * 0.35, gY + 2); ctx.lineTo(px + 14 + gW * 0.35, gY + 16);
      ctx.moveTo(px + 14 + gW * 0.65, gY + 2); ctx.lineTo(px + 14 + gW * 0.65, gY + 16);
      ctx.stroke();
      // Power fill
      const p2 = this.aim.power;
      const pCol = p2 < 0.34 ? "#ff5050" : p2 < 0.65 ? "#50d870" : "#50a8ff";
      ctx.fillStyle = pCol;
      ctx.fillRect(px + 14, gY + 2, gW * p2, 14);
      ctx.fillStyle = "rgba(180,220,255,0.40)"; ctx.font = "7px Arial"; ctx.textAlign = "center";
      ctx.fillText("draw zone", px + 14 + gW * 0.50, gY + 26);

      // Strategy selector
      const sY = gY + 34;
      ctx.textAlign = "center"; ctx.fillStyle = "rgba(90,130,185,0.65)"; ctx.font = "bold 9px Arial";
      ctx.fillText("SHOT STRATEGY", cx2, sY);

      const stratKeys = Object.keys(STRATEGIES);
      const sBW = (pw - 24) / stratKeys.length - 4;
      stratKeys.forEach((k, idx) => {
        const strat = STRATEGIES[k];
        const sx2   = px + 12 + idx * (sBW + 4);
        const active = this.strategy === k;
        ctx.fillStyle  = active ? strat.color + "cc" : "rgba(15,25,45,0.80)";
        ctx.beginPath(); rr(ctx, sx2, sY + 6, sBW, 26, 5); ctx.fill();
        ctx.strokeStyle = active ? strat.color : "rgba(60,90,140,0.40)";
        ctx.lineWidth   = active ? 1.8 : 1; ctx.stroke();
        ctx.textAlign = "center";
        ctx.fillStyle = active ? "#fff" : "rgba(130,165,210,0.60)";
        ctx.font = `bold ${active ? 8 : 7}px Arial`;
        ctx.fillText(strat.label, sx2 + sBW / 2, sY + 14);
        ctx.fillStyle = "rgba(180,210,245,0.45)"; ctx.font = "7px Arial";
        ctx.fillText(strat.key, sx2 + sBW / 2, sY + 24);
      });

      // Rotation buttons
      const rotY = sY + 38;
      const qCol = this.aim.rotation < 0 ? "rgba(255,120,80,0.90)" : "rgba(50,70,115,0.55)";
      const eCol = this.aim.rotation > 0 ? "rgba(80,195,255,0.90)" : "rgba(50,70,115,0.55)";
      const rbW  = (pw - 36) / 2 - 4;
      ctx.fillStyle = qCol; ctx.beginPath();
      rr(ctx, px + 14, rotY, rbW, 26, 5); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.80)"; ctx.font = "9px Arial"; ctx.textAlign = "center";
      ctx.fillText("Q  ← CURL LEFT", px + 14 + rbW / 2, rotY + 17);

      ctx.fillStyle = eCol; ctx.beginPath();
      rr(ctx, px + 14 + rbW + 8, rotY, rbW, 26, 5); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.80)"; ctx.font = "9px Arial";
      ctx.fillText("E  CURL RIGHT →", px + 14 + rbW + 8 + rbW / 2, rotY + 17);

      // Phase hint
      const phY = rotY + 36;
      ctx.fillStyle = "rgba(110,160,215,0.70)"; ctx.font = "8px Arial"; ctx.textAlign = "center";
      ctx.fillText("1. Aim — mouse or ← →", cx2, phY);
      ctx.fillText("2. Power — drag ↕ or ↑ ↓", cx2, phY + 13);
      ctx.fillText("3. Strategy — keys 1/2/3/4", cx2, phY + 26);
      ctx.fillStyle = "#ffaa80"; ctx.font = "bold 10px Arial";
      ctx.fillText("SPACE or click to throw", cx2, phY + 43);

    } else if (this.phase === "aiTurn") {
      const d = ".".repeat(1 + (Math.floor(this.time * 2.5) % 3));
      const phY = icY + 34;
      ctx.fillStyle = "rgba(240,190,40,0.85)"; ctx.font = "bold 10px Arial"; ctx.textAlign = "center";
      ctx.fillText(`CPU is planning${d}`, cx2, phY);
    } else if (this.phase === "flight") {
      const phY = icY + 34;
      ctx.fillStyle = this.sweeping ? "#70d8ff" : "rgba(130,190,235,0.75)";
      ctx.font = "bold 10px Arial"; ctx.textAlign = "center";
      ctx.fillText(this.sweeping ? "SWEEPING — extending range!" : "Hold  S  or  ↓  to sweep", cx2, phY);
      if (!this.sweeping) {
        ctx.fillStyle = "rgba(90,135,185,0.50)"; ctx.font = "8px Arial";
        ctx.fillText("(reduces friction, extends range)", cx2, phY + 14);
      }
    }

    // ── End history ──
    if (this.endLog.length > 0) {
      const histRows = this.endLog.length;
      const histH    = histRows * 15 + 24;
      const histY    = H - 46 - histH;
      ctx.fillStyle  = "rgba(0,0,0,0.35)";
      ctx.beginPath(); rr(ctx, px + 10, histY, pw - 20, histH, 6); ctx.fill();
      ctx.fillStyle = "rgba(85,135,200,0.65)"; ctx.font = "bold 8px Arial"; ctx.textAlign = "center";
      ctx.fillText("END SCORES", cx2, histY + 12);
      this.endLog.forEach((e, i) => {
        const ry = histY + 22 + i * 15;
        ctx.fillStyle = "rgba(110,150,200,0.55)"; ctx.font = "8px Arial"; ctx.textAlign = "left";
        ctx.fillText(`E${i + 1}`, px + 18, ry);
        ctx.fillStyle = e.player > 0 ? CLR.playerCol : "rgba(90,120,155,0.50)"; ctx.textAlign = "center";
        ctx.fillText(e.player, px + 50, ry);
        ctx.fillStyle = "rgba(140,170,205,0.35)"; ctx.fillText("—", cx2, ry);
        ctx.fillStyle = e.ai > 0 ? CLR.aiCol : "rgba(90,120,155,0.50)";
        ctx.fillText(e.ai, px + pw - 48, ry);
      });
    }

    // ── Controls footer ──
    const fY = H - 42;
    ctx.fillStyle = "rgba(50,80,125,0.42)";
    ctx.beginPath(); rr(ctx, px + 10, fY, pw - 20, 36, 5); ctx.fill();
    ctx.fillStyle = "rgba(90,130,185,0.60)"; ctx.font = "8px Arial"; ctx.textAlign = "center";
    ctx.fillText("AIM: mouse/←→  POWER: drag/↑↓  CURL: Q/E", cx2, fY + 11);
    ctx.fillText("STRATEGY: 1-4  THROW: Space  SWEEP: S", cx2, fY + 22);
    ctx.fillText("R restart  ·  ESC menu", cx2, fY + 33);
  }

  _drawEndBanner(ctx) {
    const res = this.lastResult;
    ctx.fillStyle = "rgba(4,10,22,0.62)";
    ctx.fillRect(SH_L - 20, H * 0.38, SH_W + 40, H * 0.26);

    ctx.textAlign = "center";
    const mX = SH_MID, mY = H * 0.52;

    if (res && res.team) {
      const col  = res.team === "player" ? "#ff8080" : "#f0c020";
      const name = res.team === "player" ? "YOU SCORE" : "CPU SCORES";
      ctx.fillStyle = col; ctx.font = "bold 28px Arial";
      ctx.fillText(`${name}  ${res.pts}!`, mX, mY - 12);
    } else {
      ctx.fillStyle = "#88a8cc"; ctx.font = "bold 24px Arial";
      ctx.fillText("BLANK END", mX, mY - 12);
    }
    ctx.fillStyle = "rgba(155,195,240,0.65)"; ctx.font = "11px Arial";
    ctx.fillText(`Next end in ${Math.ceil(Math.max(0, this.endTimer))}s…`, mX, mY + 16);

    // Ice condition for next end
    const nextCond = ICE_CONDITIONS[this.iceCondKey];
    ctx.fillStyle = nextCond.color; ctx.font = "9px Arial";
    ctx.fillText(`Next: ${nextCond.label} ice`, mX, mY + 34);
  }

  _drawMenu(ctx, vW, vH) {
    const sx = vW / W, sy = vH / H;
    ctx.save(); ctx.scale(sx, sy);

    ctx.fillStyle = "#040810"; ctx.fillRect(0, 0, W, H);

    // Atmospheric gradient
    const atm = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, H * 0.65);
    atm.addColorStop(0, "rgba(15,40,100,0.25)");
    atm.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = atm; ctx.fillRect(0, 0, W, H);

    // Decorative house rings
    [RH * 2.6, RM * 2.4, RI * 2.8, RB * 3].forEach((r, i) => {
      ctx.beginPath(); ctx.arc(W / 2, H / 2 + 40, r, 0, Math.PI * 2);
      ctx.fillStyle = [CLR.ring12, CLR.ring8, CLR.ring4, CLR.ringBtn][i % 4].replace("0.88","0.08").replace("0.94","0.07").replace("0.90","0.08").replace("0.96","0.07");
      ctx.fill();
    });

    ctx.textAlign = "center";
    ctx.fillStyle = "#b0d8ff"; ctx.font = "bold 42px Arial";
    ctx.fillText("❄  ICE STRIKE PRO", W / 2, H / 2 - 96);
    ctx.fillStyle = "rgba(110,165,220,0.65)"; ctx.font = "13px Arial";
    ctx.fillText("Professional curling simulator · Physics-accurate stone delivery", W / 2, H / 2 - 62);

    const feats = [
      "Real curl physics — stone rotation bends the trajectory based on speed",
      "3 ice conditions per end — Fast, Pebbled, Slow — change friction & curl",
      "4 shot strategies — Draw / Guard / Takeout / Raise — with auto-aim assist",
      "Sweep mechanic — hold S mid-flight to reduce friction and extend range",
      `${ENDS} ends · ${SHOTS_PER_TEAM} stones per team · Elastic collisions between stones`,
    ];
    ctx.font = "11px Arial"; ctx.fillStyle = "rgba(130,175,220,0.62)";
    feats.forEach((f, i) => ctx.fillText(f, W / 2, H / 2 - 26 + i * 19));

    // Difficulty label
    ctx.fillStyle = "rgba(130,175,225,0.68)"; ctx.font = "bold 11px Arial";
    ctx.fillText("DIFFICULTY", W / 2, H / 2 + 2);

    // Difficulty buttons
    const diffs = [
      { id: "easy",   label: "EASY",   col: "#1a8a3a", bdr: "#50d870" },
      { id: "medium", label: "MEDIUM", col: "#7a6e00", bdr: "#f0c020" },
      { id: "hard",   label: "HARD",   col: "#8a1818", bdr: "#ff5050" },
    ];
    const bW = 90, bH = 34, bGap = 8;
    const totalW = diffs.length * bW + (diffs.length - 1) * bGap;
    const bStartX = W / 2 - totalW / 2;
    diffs.forEach(({ id, label, col, bdr }, i) => {
      const bx = bStartX + i * (bW + bGap), by = H / 2 + 8;
      const active = this.difficulty === id;
      ctx.fillStyle = active ? col : "rgba(15,25,45,0.75)";
      ctx.beginPath(); rr(ctx, bx, by, bW, bH, 7); ctx.fill();
      ctx.strokeStyle = active ? bdr : "rgba(70,105,160,0.38)"; ctx.lineWidth = active ? 2 : 1;
      ctx.beginPath(); rr(ctx, bx, by, bW, bH, 7); ctx.stroke();
      ctx.fillStyle = active ? "#fff" : "rgba(130,165,210,0.60)";
      ctx.font = `bold ${active ? 12 : 11}px Arial`;
      ctx.fillText(label, bx + bW / 2, by + 22);
    });

    // Start button
    ctx.fillStyle = "rgba(40,100,210,0.85)";
    ctx.beginPath(); rr(ctx, W / 2 - 120, H / 2 + 54, 240, 50, 12); ctx.fill();
    ctx.strokeStyle = "rgba(80,165,255,0.55)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); rr(ctx, W / 2 - 120, H / 2 + 54, 240, 50, 12); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = "bold 18px Arial";
    ctx.fillText("START GAME  ( Enter )", W / 2, H / 2 + 86);

    ctx.restore();
  }

  _drawGameOver(ctx, vW, vH) {
    const sx = vW / W, sy = vH / H;
    ctx.save(); ctx.scale(sx, sy);

    ctx.fillStyle = "rgba(4,10,22,0.97)"; ctx.fillRect(0, 0, W, H);

    const won = this.scores.player > this.scores.ai;
    const tie = this.scores.player === this.scores.ai;
    const wTxt = tie ? "TIE GAME" : won ? "YOU WIN!" : "CPU WINS";
    const wCol = tie ? "#80c0ff" : won ? "#ff8080" : "#f0c020";

    ctx.textAlign = "center";
    ctx.fillStyle = wCol; ctx.font = "bold 44px Arial";
    ctx.fillText(wTxt, W / 2, H / 2 - 108);

    ctx.fillStyle = won ? "#ff8080" : "#f0c020"; ctx.font = "bold 30px Arial";
    ctx.fillText(`${this.scores.player}  —  ${this.scores.ai}`, W / 2, H / 2 - 60);
    ctx.fillStyle = "rgba(170,200,230,0.50)"; ctx.font = "13px Arial";
    ctx.fillText("You  —  CPU", W / 2, H / 2 - 36);

    // End breakdown table
    ctx.fillStyle = "rgba(70,110,170,0.40)";
    ctx.beginPath(); rr(ctx, W / 2 - 150, H / 2 - 22, 300, this.endLog.length * 20 + 18, 8); ctx.fill();
    this.endLog.forEach((e, i) => {
      const ry = H / 2 - 10 + i * 20;
      ctx.fillStyle = "rgba(140,175,215,0.60)"; ctx.font = "11px Arial"; ctx.textAlign = "left";
      ctx.fillText(`End ${i + 1}`, W / 2 - 138, ry);
      ctx.fillStyle = e.player > 0 ? CLR.playerCol : "rgba(90,120,155,0.45)"; ctx.textAlign = "center";
      ctx.fillText(e.player, W / 2 - 28, ry);
      ctx.fillStyle = "rgba(140,165,195,0.30)"; ctx.fillText("—", W / 2, ry);
      ctx.fillStyle = e.ai > 0 ? CLR.aiCol : "rgba(90,120,155,0.45)";
      ctx.fillText(e.ai, W / 2 + 28, ry);
    });

    ctx.fillStyle = "rgba(195,225,255,0.85)"; ctx.font = "bold 13px Arial"; ctx.textAlign = "center";
    ctx.fillText("Press  Enter  or  click  to  return", W / 2, H - 42);

    ctx.restore();
  }
}

// ── React component ───────────────────────────────────────────────────────────
export default function IceStrikeProGame() {
  const canvasRef = useRef(null);
  const rtRef     = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rt = new IceStrikeRuntime(canvas);
    rtRef.current = rt;
    rt.start();
    return () => { rt.destroy(); rtRef.current = null; };
  }, []);

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", background: "#04080f",
    }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}
