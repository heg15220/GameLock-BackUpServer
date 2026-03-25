import React, { useEffect, useRef } from "react";

// ── Canvas layout ────────────────────────────────────────────────────────────
const W = 960, H = 580;
const AL = 14, AT = 14, AR = 654, AB = 566;
const AW = AR - AL;   // 640
const AH = AB - AT;   // 552
const PX = AR + 6, PW = W - PX;  // panel x=660, width=300

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:         "#04070e",
  floor:      "#080f18",
  floorGrid:  "#0d1520",
  wall:       "#111d35",
  wallCap:    "#192840",
  pillar:     "#182030",
  pillarEdge: "#243050",
  pillarCap:  "#1e2a40",
  accent:     "#3a8ef0",
  gold:       "#f0b830",
  panel:      "#050810",
  divider:    "rgba(35,65,125,0.45)",
  player:     "#46b4ff",
  sword:      "#c8e8ff",
  grunt:      "#9020d0",
  gEdge:      "#c040f8",
  archer:     "#16c088",
  aEdge:      "#28f0b0",
  brute:      "#d02818",
  bEdge:      "#ff4030",
  boss:       "#f0b030",
  boEdge:     "#ffe040",
  hp:         "#24c844",
  hpLow:      "#e02020",
  orb:        "#20d070",
  projE:      "#ff7820",
  projP:      "#70d8ff",
};

// ── Game constants ────────────────────────────────────────────────────────────
const PLAYER_R      = 13;
const PLAYER_MAX_HP = 8;
const PLAYER_SPD    = 165;
const DASH_SPD      = 520;
const DASH_DUR      = 0.17;
const DASH_CD       = 1.3;
const IHTIME        = 0.80;
const ATK_REACH     = 76;
const ATK_ARC       = 1.50;   // total arc in radians (~86°)
const ATK_DUR       = 0.22;
const ATK_CD        = 0.46;
const PILLAR_R      = 22;

// ── Static pillars (arena-local coords) ─────────────────────────────────────
const PILLAR_DEFS = [
  { x: 158, y: 143 },
  { x: 482, y: 143 },
  { x: 158, y: 409 },
  { x: 482, y: 409 },
  { x: 320, y: 276 },
];

// ── Enemy definitions ────────────────────────────────────────────────────────
const EDEFS = {
  grunt: {
    r: 13, maxHp: 3, speed: 74, damage: 1, score: 100,
    color: C.grunt, edge: C.gEdge, label: "GRUNT",
    meleeDist: 20, meleeCd: 1.0, meleeDmg: 1, knockback: 95,
  },
  archer: {
    r: 11, maxHp: 2, speed: 52, damage: 1, score: 200,
    color: C.archer, edge: C.aEdge, label: "ARCHER",
    prefDist: 185, shootRange: 250, shootCd: 1.7, projSpd: 255,
  },
  brute: {
    r: 20, maxHp: 11, speed: 40, damage: 2, score: 380,
    color: C.brute, edge: C.bEdge, label: "BRUTE",
    meleeDist: 28, meleeCd: 1.9, meleeDmg: 2, knockback: 170,
  },
  boss: {
    r: 28, maxHp: 45, speed: 58, damage: 2, score: 2800,
    color: C.boss, edge: C.boEdge, label: "BOSS",
    meleeDist: 36, meleeCd: 1.1, meleeDmg: 2, knockback: 145,
    burstCd: 3.0, projSpd: 195,
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function dist(a, b)      { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(v, lo, hi){ return v < lo ? lo : v > hi ? hi : v; }
function rand(lo, hi)    { return lo + Math.random() * (hi - lo); }

function rr(ctx, x, y, w, h, r) {
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function getPillars() {
  return PILLAR_DEFS.map(p => ({ x: AL + p.x, y: AT + p.y, r: PILLAR_R }));
}

function pushOutOfPillars(obj, r) {
  for (const p of getPillars()) {
    const d = dist(obj, p);
    const minD = r + p.r + 1;
    if (d < minD && d > 0.001) {
      const nx = (obj.x - p.x) / d, ny = (obj.y - p.y) / d;
      obj.x = p.x + nx * minD;
      obj.y = p.y + ny * minD;
    }
  }
}

function clampToArena(obj, r) {
  obj.x = clamp(obj.x, AL + r + 1, AR - r - 1);
  obj.y = clamp(obj.y, AT + r + 1, AB - r - 1);
}

function makeParticle(x, y, col, vx, vy, life, r = 2.5) {
  return { x, y, col, vx, vy, life, maxLife: life, r };
}

function spawnHitFX(arr, x, y, col, n = 8) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = rand(50, 150);
    arr.push(makeParticle(x, y, col, Math.cos(a) * s, Math.sin(a) * s, rand(0.25, 0.60)));
  }
}

function spawnDeathFX(arr, x, y, col, n = 20) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = rand(70, 240);
    arr.push(makeParticle(x, y, col, Math.cos(a) * s, Math.sin(a) * s, rand(0.4, 1.1), rand(2, 5.5)));
  }
}

// ── Wave builder ─────────────────────────────────────────────────────────────
function buildWave(n) {
  if (n % 5 === 0) {
    const list = ["boss"];
    for (let i = 0; i < n; i++) list.push("grunt");
    for (let i = 0; i < Math.floor(n / 2); i++) list.push("archer");
    return list;
  }
  const grunts  = clamp(3 + Math.floor(n * 1.5), 3, 15);
  const archers = Math.max(0, Math.floor((n - 1) * 0.6));
  const brutes  = Math.max(0, Math.floor((n - 2) * 0.45));
  const out = [];
  for (let i = 0; i < grunts;  i++) out.push("grunt");
  for (let i = 0; i < archers; i++) out.push("archer");
  for (let i = 0; i < brutes;  i++) out.push("brute");
  return out;
}

// ── Runtime ───────────────────────────────────────────────────────────────────
class NeonCryptRuntime {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext("2d");
    this.vW = W; this.vH = H;

    this.screen = "menu";
    this.time   = 0;

    this.wave       = 0;
    this.score      = 0;
    this.hiScore    = +(localStorage.getItem("neon_crypt_hi") || 0);
    this.player     = null;
    this.enemies    = [];
    this.projectiles= [];
    this.orbs       = [];
    this.particles  = [];
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.waveReady  = true;   // waiting for next wave
    this.waveBanner = 0;

    this.floorDots  = this._genFloorDots();

    this.keys  = {};
    this.mouse = { x: W / 2, y: H / 2 };

    this._onKD     = e => this._keyDown(e);
    this._onKU     = e => this._keyUp(e);
    this._onMM     = e => this._mouseMove(e);
    this._onClick  = e => this._click(e);
    this._onResize = () => this._resize();
    this._running  = false;
    this._last     = 0;
    this._raf      = null;
    this._frame    = ts => this._tick(ts);
  }

  _genFloorDots() {
    const dots = [];
    for (let i = 0; i < 320; i++) {
      dots.push({
        x: AL + Math.random() * AW,
        y: AT + Math.random() * AH,
        r: 0.5 + Math.random() * 1.4,
        a: 0.04 + Math.random() * 0.14,
      });
    }
    return dots;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  start() {
    this._running = true;
    this._resize();
    window.addEventListener("resize",   this._onResize);
    window.addEventListener("keydown",  this._onKD);
    window.addEventListener("keyup",    this._onKU);
    this.canvas.addEventListener("mousemove", this._onMM);
    this.canvas.addEventListener("click",     this._onClick);
    this._last = performance.now();
    this._raf  = requestAnimationFrame(this._frame);
  }

  destroy() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    window.removeEventListener("resize",   this._onResize);
    window.removeEventListener("keydown",  this._onKD);
    window.removeEventListener("keyup",    this._onKU);
    this.canvas.removeEventListener("mousemove", this._onMM);
    this.canvas.removeEventListener("click",     this._onClick);
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

  // ── Input ─────────────────────────────────────────────────────────────────
  _lx(e) { const r = this.canvas.getBoundingClientRect(); return (e.clientX - r.left) * (W / r.width); }
  _ly(e) { const r = this.canvas.getBoundingClientRect(); return (e.clientY - r.top)  * (H / r.height); }

  _keyDown(e) {
    const { code } = e;
    if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Space"].includes(code)) e.preventDefault();
    this.keys[code] = true;
    if (e.repeat) return;
    if (code === "Escape") { this.screen = "menu"; return; }
    if (this.screen === "menu"    && (code === "Enter" || code === "Space")) { this._startGame(); return; }
    if (this.screen === "gameover"&& (code === "Enter" || code === "Space" || code === "KeyR")) { this.screen = "menu"; return; }
    if (this.screen !== "play") return;
    if (code === "KeyR") { this._startGame(); return; }
    if (code === "Space" || code === "KeyF") { this._tryAttack(); return; }
    if (code === "ShiftLeft" || code === "ShiftRight" || code === "KeyE") { this._tryDash(); return; }
  }

  _keyUp(e) { this.keys[e.code] = false; }

  _mouseMove(e) {
    this.mouse.x = this._lx(e);
    this.mouse.y = this._ly(e);
  }

  _click(e) {
    if (this.screen === "menu")     { this._startGame(); return; }
    if (this.screen === "gameover") { this.screen = "menu"; return; }
    if (this.screen === "play")     { this._tryAttack(); }
  }

  // ── Game control ──────────────────────────────────────────────────────────
  _startGame() {
    this.wave        = 0;
    this.score       = 0;
    this.enemies     = [];
    this.projectiles = [];
    this.orbs        = [];
    this.particles   = [];
    this.spawnQueue  = [];
    this.spawnTimer  = 0;
    this.waveReady   = true;
    this.waveBanner  = 0;
    this.time        = 0;

    this.player = {
      x: AL + AW / 2, y: AT + AH / 2,
      vx: 0, vy: 0,
      hp: PLAYER_MAX_HP, maxHp: PLAYER_MAX_HP,
      ihTimer:  0,
      atkTimer: 0, atkCd: 0, atkAngle: 0,
      dashTimer: 0, dashCd: 0, dashVx: 0, dashVy: 0,
      facing: 0,
    };

    this.screen = "play";
    this._nextWave();
  }

  _nextWave() {
    this.wave++;
    this.spawnQueue = buildWave(this.wave);
    this.spawnTimer = 0.6;
    this.waveReady  = false;
    this.waveBanner = 2.8;
  }

  _tryAttack() {
    const p = this.player;
    if (!p || p.atkCd > 0 || p.atkTimer > 0) return;
    p.atkAngle = Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x);
    p.atkTimer = ATK_DUR;
    p.atkCd    = ATK_CD;
    this._resolveAttack();
  }

  _tryDash() {
    const p = this.player;
    if (!p || p.dashCd > 0 || p.dashTimer > 0) return;
    let mx = 0, my = 0;
    if (this.keys["KeyA"] || this.keys["ArrowLeft"])  mx -= 1;
    if (this.keys["KeyD"] || this.keys["ArrowRight"]) mx += 1;
    if (this.keys["KeyW"] || this.keys["ArrowUp"])    my -= 1;
    if (this.keys["KeyS"] || this.keys["ArrowDown"])  my += 1;
    let da = p.facing;
    if (mx !== 0 || my !== 0) da = Math.atan2(my, mx);
    p.dashVx    = Math.cos(da) * DASH_SPD;
    p.dashVy    = Math.sin(da) * DASH_SPD;
    p.dashTimer = DASH_DUR;
    p.dashCd    = DASH_CD;
    p.ihTimer   = Math.max(p.ihTimer, DASH_DUR + 0.12);
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      this.particles.push(makeParticle(p.x, p.y, "rgba(60,180,255,0.22)", Math.cos(a)*70, Math.sin(a)*70, 0.28, 4));
    }
  }

  _resolveAttack() {
    const p = this.player;
    const hit = [];
    for (const e of this.enemies) {
      if (dist(p, e) > ATK_REACH + e.r) continue;
      let diff = Math.atan2(e.y - p.y, e.x - p.x) - p.atkAngle;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) < ATK_ARC / 2) hit.push(e);
    }
    for (const e of hit) {
      this._damageEnemy(e, 1);
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      e.vx += Math.cos(a) * 130;
      e.vy += Math.sin(a) * 130;
    }
    if (hit.length > 0) spawnHitFX(this.particles, hit[0].x, hit[0].y, C.sword, 10);
    else {
      // miss spark at reach tip
      const sx = p.x + Math.cos(p.atkAngle) * ATK_REACH;
      const sy = p.y + Math.sin(p.atkAngle) * ATK_REACH;
      for (let i = 0; i < 4; i++) {
        const a = p.atkAngle + rand(-0.5, 0.5);
        this.particles.push(makeParticle(sx, sy, "rgba(180,220,255,0.50)", Math.cos(a)*40, Math.sin(a)*40, 0.18, 1.5));
      }
    }
  }

  _damageEnemy(e, dmg) {
    e.hp -= dmg;
    e.flashTimer = 0.14;
    if (e.hp <= 0) {
      this.score += e.def.score;
      spawnDeathFX(this.particles, e.x, e.y, e.def.edge, 22);
      if (Math.random() < 0.35)
        this.orbs.push({ x: e.x, y: e.y, r: 8, life: 9, _t: 0 });
      this.enemies.splice(this.enemies.indexOf(e), 1);
    }
  }

  _damagePlayer(dmg, srcX, srcY) {
    const p = this.player;
    if (!p || p.ihTimer > 0) return;
    p.hp      -= dmg;
    p.ihTimer  = IHTIME;
    spawnHitFX(this.particles, p.x, p.y, C.hpLow, 9);
    if (srcX !== undefined) {
      const a = Math.atan2(p.y - srcY, p.x - srcX);
      p.vx += Math.cos(a) * 85;
      p.vy += Math.sin(a) * 85;
    }
    if (p.hp <= 0) {
      p.hp = 0;
      spawnDeathFX(this.particles, p.x, p.y, C.player, 30);
      if (this.score > this.hiScore) {
        this.hiScore = this.score;
        localStorage.setItem("neon_crypt_hi", this.hiScore);
      }
      this.screen = "gameover";
    }
  }

  // ── Update ────────────────────────────────────────────────────────────────
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
    this._updateParticles(dt);
    if (this.screen !== "play") return;
    if (this.waveBanner > 0) this.waveBanner -= dt;
    this._updateSpawner(dt);
    this._updatePlayer(dt);
    this._updateEnemies(dt);
    this._updateProjectiles(dt);
    this._updateOrbs(dt);
    this._checkWaveComplete();
  }

  _updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x    += p.vx * dt;
      p.y    += p.vy * dt;
      p.vx   *= 0.90;
      p.vy   *= 0.90;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  _updateSpawner(dt) {
    if (!this.spawnQueue.length) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = 0.40 + Math.random() * 0.45;

    const type = this.spawnQueue.shift();
    const def  = EDEFS[type];

    // Spawn at arena edge
    let sx, sy;
    const side = Math.floor(Math.random() * 4);
    if      (side === 0) { sx = rand(AL + def.r + 5, AR - def.r - 5); sy = AT + def.r + 5; }
    else if (side === 1) { sx = AR - def.r - 5; sy = rand(AT + def.r + 5, AB - def.r - 5); }
    else if (side === 2) { sx = rand(AL + def.r + 5, AR - def.r - 5); sy = AB - def.r - 5; }
    else                 { sx = AL + def.r + 5; sy = rand(AT + def.r + 5, AB - def.r - 5); }

    const e = {
      x: sx, y: sy, vx: 0, vy: 0,
      hp: def.maxHp, maxHp: def.maxHp,
      def, type, r: def.r,
      atkCd: Math.random() * (def.meleeCd || def.shootCd || 1),
      flashTimer: 0, angle: 0,
    };
    if (type === "boss") e.burstTimer = def.burstCd;
    this.enemies.push(e);

    // Spawn flash
    spawnHitFX(this.particles, sx, sy, def.edge, 12);
  }

  _updatePlayer(dt) {
    const p = this.player;
    if (!p) return;

    if (p.ihTimer  > 0) p.ihTimer  -= dt;
    if (p.atkCd    > 0) p.atkCd    -= dt;
    if (p.atkTimer > 0) p.atkTimer -= dt;
    if (p.dashCd   > 0) p.dashCd   -= dt;

    p.facing = Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x);

    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      p.x += p.dashVx * dt;
      p.y += p.dashVy * dt;
      if (Math.random() < 0.55)
        this.particles.push(makeParticle(p.x, p.y, "rgba(50,170,255,0.20)",
          rand(-25, 25), rand(-25, 25), 0.20, 3.5));
    } else {
      let mx = 0, my = 0;
      if (this.keys["KeyA"] || this.keys["ArrowLeft"])  mx -= 1;
      if (this.keys["KeyD"] || this.keys["ArrowRight"]) mx += 1;
      if (this.keys["KeyW"] || this.keys["ArrowUp"])    my -= 1;
      if (this.keys["KeyS"] || this.keys["ArrowDown"])  my += 1;
      if (mx !== 0 && my !== 0) { mx *= 0.7071; my *= 0.7071; }
      const spd = PLAYER_SPD;
      p.vx += (mx * spd - p.vx) * clamp(dt * 15, 0, 1);
      p.vy += (my * spd - p.vy) * clamp(dt * 15, 0, 1);
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
    }

    clampToArena(p, PLAYER_R);
    pushOutOfPillars(p, PLAYER_R);

    // Orb collection
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      if (dist(p, o) < PLAYER_R + o.r) {
        p.hp = Math.min(p.maxHp, p.hp + 1);
        spawnHitFX(this.particles, o.x, o.y, C.orb, 10);
        this.orbs.splice(i, 1);
      }
    }
  }

  _updateEnemies(dt) {
    const p = this.player;
    if (!p) return;

    for (const e of this.enemies) {
      if (e.flashTimer > 0) e.flashTimer -= dt;
      if (e.atkCd     > 0) e.atkCd      -= dt;

      const dp = dist(e, p);
      e.angle  = Math.atan2(p.y - e.y, p.x - e.x);

      let tgtX = p.x, tgtY = p.y, moveSpd = e.def.speed;

      if (e.type === "archer") {
        const pref = e.def.prefDist;
        if (dp < pref * 0.75) {
          // Back away
          tgtX = e.x - Math.cos(e.angle) * 220;
          tgtY = e.y - Math.sin(e.angle) * 220;
        } else if (dp > pref * 1.35) {
          // Close in
          tgtX = p.x; tgtY = p.y;
        } else {
          // Strafe
          const sa = e.angle + Math.PI / 2;
          const sd = Math.sin(this.time * 1.4) > 0 ? 1 : -1;
          tgtX = e.x + Math.cos(sa) * sd * 90;
          tgtY = e.y + Math.sin(sa) * sd * 90;
          moveSpd *= 0.55;
        }
        if (e.atkCd <= 0 && dp < e.def.shootRange) {
          this._shootProjectile(e, p);
          e.atkCd = e.def.shootCd;
        }

      } else if (e.type === "grunt" || e.type === "brute") {
        if (dp < e.def.meleeDist + e.r + PLAYER_R && e.atkCd <= 0) {
          this._damagePlayer(e.def.meleeDmg, e.x, e.y);
          e.atkCd = e.def.meleeCd;
          spawnHitFX(this.particles, p.x, p.y, e.def.edge, 5);
        }

      } else if (e.type === "boss") {
        if (dp < e.def.meleeDist + e.r + PLAYER_R && e.atkCd <= 0) {
          this._damagePlayer(e.def.meleeDmg, e.x, e.y);
          e.atkCd = e.def.meleeCd;
          spawnHitFX(this.particles, p.x, p.y, e.def.edge, 7);
        }
        e.burstTimer -= dt;
        if (e.burstTimer <= 0) {
          e.burstTimer = e.def.burstCd;
          this._bossBurst(e);
        }
      }

      // Steering toward target
      const tdx = tgtX - e.x, tdy = tgtY - e.y;
      const td  = Math.hypot(tdx, tdy);
      if (td > 2) {
        const nx = tdx / td, ny = tdy / td;
        e.vx += (nx * moveSpd - e.vx) * clamp(dt * 7, 0, 1);
        e.vy += (ny * moveSpd - e.vy) * clamp(dt * 7, 0, 1);
      } else {
        e.vx *= 0.80; e.vy *= 0.80;
      }

      // Separation between enemies
      for (const o of this.enemies) {
        if (o === e) continue;
        const sd = dist(e, o);
        const minS = e.r + o.r + 2;
        if (sd < minS && sd > 0.001) {
          const nx = (e.x - o.x) / sd, ny = (e.y - o.y) / sd;
          e.vx += nx * 45 * dt;
          e.vy += ny * 45 * dt;
        }
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;
      clampToArena(e, e.r);
      pushOutOfPillars(e, e.r);
    }
  }

  _shootProjectile(e, p) {
    const ang = Math.atan2(p.y - e.y, p.x - e.x);
    const spd = e.def.projSpd || 260;
    this.projectiles.push({
      x: e.x, y: e.y,
      vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
      r: 5, damage: 1, life: 2.6, col: C.projE,
    });
  }

  _bossBurst(e) {
    const n = 8;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      this.projectiles.push({
        x: e.x, y: e.y,
        vx: Math.cos(ang) * e.def.projSpd,
        vy: Math.sin(ang) * e.def.projSpd,
        r: 6, damage: 2, life: 3.0, col: C.boEdge,
      });
    }
  }

  _updateProjectiles(dt) {
    const p = this.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.x    += pr.vx * dt;
      pr.y    += pr.vy * dt;
      pr.life -= dt;

      let remove = pr.life <= 0
        || pr.x < AL || pr.x > AR || pr.y < AT || pr.y > AB;

      if (!remove) {
        for (const pl of getPillars()) {
          if (dist(pr, pl) < pl.r + pr.r) { remove = true; break; }
        }
      }
      if (!remove && p && dist(pr, p) < PLAYER_R + pr.r) {
        this._damagePlayer(pr.damage, pr.x - pr.vx * dt, pr.y - pr.vy * dt);
        spawnHitFX(this.particles, pr.x, pr.y, pr.col, 6);
        remove = true;
      }
      if (remove) {
        spawnHitFX(this.particles, pr.x, pr.y, pr.col, 3);
        this.projectiles.splice(i, 1);
      }
    }
  }

  _updateOrbs(dt) {
    for (const o of this.orbs) {
      o._t   += dt;
      o.life -= dt;
    }
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      if (this.orbs[i].life <= 0) this.orbs.splice(i, 1);
    }
  }

  _checkWaveComplete() {
    if (this.waveReady) return;
    if (this.spawnQueue.length > 0 || this.enemies.length > 0) return;
    this.waveReady = true;
    setTimeout(() => {
      if (this.screen === "play") this._nextWave();
    }, 2000);
  }

  // ── Rendering ─────────────────────────────────────────────────────────────
  _render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.vW, this.vH);
    const sx = this.vW / W, sy = this.vH / H;
    ctx.save();
    ctx.scale(sx, sy);

    if (this.screen === "menu")     { this._drawMenu(ctx);     ctx.restore(); return; }
    if (this.screen === "gameover") { this._drawGameOver(ctx); ctx.restore(); return; }

    this._drawArena(ctx);
    this._drawOrbs(ctx);
    this._drawParticles(ctx);
    this._drawProjectiles(ctx);
    this._drawEnemies(ctx);
    this._drawPlayer(ctx);
    this._drawHUD(ctx);
    if (this.waveBanner > 0) this._drawWaveBanner(ctx);

    ctx.restore();
  }

  _drawArena(ctx) {
    // Full BG
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);

    // Floor
    ctx.fillStyle = C.floor; ctx.fillRect(AL, AT, AW, AH);

    // Grid
    ctx.strokeStyle = C.floorGrid; ctx.lineWidth = 0.7;
    const G = 46;
    for (let x = AL; x <= AR; x += G) {
      ctx.beginPath(); ctx.moveTo(x, AT); ctx.lineTo(x, AB); ctx.stroke();
    }
    for (let y = AT; y <= AB; y += G) {
      ctx.beginPath(); ctx.moveTo(AL, y); ctx.lineTo(AR, y); ctx.stroke();
    }

    // Floor texture dots
    for (const d of this.floorDots) {
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(55,90,165,${d.a})`; ctx.fill();
    }

    // Ambient corner glow
    const corners = [
      [AL, AT], [AR, AT], [AL, AB], [AR, AB],
    ];
    for (const [cx, cy] of corners) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
      g.addColorStop(0, "rgba(30,60,140,0.10)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(AL, AT, AW, AH);
    }

    // Wall border
    ctx.fillStyle = C.wall;
    ctx.fillRect(0, 0, W, AT);
    ctx.fillRect(0, AB, W, H - AB);
    ctx.fillRect(0, AT, AL, AH);
    // right wall — only up to panel
    ctx.fillRect(AR, AT, PX - AR, AH);

    // Wall cap highlight
    ctx.strokeStyle = C.wallCap; ctx.lineWidth = 2;
    ctx.strokeRect(AL, AT, AW, AH);

    // Corner brackets
    const bracket = (x, y, dx, dy) => {
      const s = 18, t = 4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx * s, y);
      ctx.lineTo(x + dx * s, y + dy * t);
      ctx.lineTo(x + dx * t, y + dy * t);
      ctx.lineTo(x + dx * t, y + dy * s);
      ctx.lineTo(x, y + dy * s);
      ctx.closePath();
      ctx.fillStyle = "rgba(60,140,240,0.18)"; ctx.fill();
      ctx.strokeStyle = "rgba(70,160,255,0.55)"; ctx.lineWidth = 1; ctx.stroke();
    };
    bracket(AL, AT,  1,  1);
    bracket(AR, AT, -1,  1);
    bracket(AL, AB,  1, -1);
    bracket(AR, AB, -1, -1);

    // Pillars
    for (const pd of PILLAR_DEFS) {
      const px = AL + pd.x, py = AT + pd.y;

      // Shadow
      ctx.beginPath(); ctx.ellipse(px, py + 8, PILLAR_R + 2, PILLAR_R * 0.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.38)"; ctx.fill();

      // Body
      ctx.beginPath(); ctx.arc(px, py, PILLAR_R, 0, Math.PI * 2);
      ctx.fillStyle = C.pillar; ctx.fill();
      ctx.strokeStyle = C.pillarEdge; ctx.lineWidth = 2; ctx.stroke();

      // Top cap
      ctx.beginPath(); ctx.arc(px, py - 5, PILLAR_R * 0.58, 0, Math.PI * 2);
      ctx.fillStyle = C.pillarCap; ctx.fill();

      // Rim glow
      const pg = ctx.createRadialGradient(px, py, PILLAR_R - 1, px, py, PILLAR_R + 9);
      pg.addColorStop(0, "rgba(40,80,160,0.18)");
      pg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(px, py, PILLAR_R + 9, 0, Math.PI * 2);
      ctx.fillStyle = pg; ctx.fill();
    }
  }

  _drawOrbs(ctx) {
    for (const o of this.orbs) {
      const bob   = Math.sin(o._t * 3.8) * 3;
      const alpha = clamp(Math.min(1, o.life * 0.6), 0, 1);

      const g = ctx.createRadialGradient(o.x, o.y + bob, 0, o.x, o.y + bob, o.r + 8);
      g.addColorStop(0, `rgba(24,200,90,${0.45 * alpha})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(o.x, o.y + bob, o.r + 8, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();

      ctx.beginPath(); ctx.arc(o.x, o.y + bob, o.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(24,215,90,${alpha})`; ctx.fill();

      ctx.strokeStyle = `rgba(200,255,210,${alpha * 0.75})`;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(o.x, o.y + bob - 4.5); ctx.lineTo(o.x, o.y + bob + 4.5);
      ctx.moveTo(o.x - 4.5, o.y + bob); ctx.lineTo(o.x + 4.5, o.y + bob);
      ctx.stroke();
    }
  }

  _drawParticles(ctx) {
    for (const p of this.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.5 + a * 0.5) + 0.5, 0, Math.PI * 2);
      ctx.fillStyle = p.col; ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawProjectiles(ctx) {
    for (const pr of this.projectiles) {
      const ang = Math.atan2(pr.vy, pr.vx);

      // Trail
      ctx.save();
      ctx.translate(pr.x, pr.y);
      ctx.rotate(ang);
      const tg = ctx.createLinearGradient(-22, 0, 0, 0);
      tg.addColorStop(0, "rgba(0,0,0,0)");
      tg.addColorStop(1, pr.col + "88");
      ctx.beginPath();
      ctx.ellipse(-11, 0, 11, pr.r * 0.55, 0, 0, Math.PI * 2);
      ctx.fillStyle = tg; ctx.fill();
      ctx.restore();

      // Glow + core
      const g = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, pr.r + 6);
      g.addColorStop(0,   pr.col);
      g.addColorStop(0.4, pr.col + "88");
      g.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r + 6, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();

      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
      ctx.fillStyle = pr.col; ctx.fill();
    }
  }

  _drawEnemies(ctx) {
    for (const e of this.enemies) {
      const flash = e.flashTimer > 0;
      const r = e.r;

      // Shadow
      ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.75, r * 0.88, r * 0.32, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.32)"; ctx.fill();

      // Glow halo
      const gR = r + 12;
      const glow = ctx.createRadialGradient(e.x, e.y, r * 0.4, e.x, e.y, gR);
      glow.addColorStop(0, e.def.edge + "38");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(e.x, e.y, gR, 0, Math.PI * 2);
      ctx.fillStyle = glow; ctx.fill();

      // Body shape
      ctx.beginPath();
      if (e.type === "brute") {
        const s = r * 0.88;
        ctx.rect(e.x - s, e.y - s, s * 2, s * 2);
      } else if (e.type === "boss") {
        const pts = 6;
        for (let i = 0; i <= pts; i++) {
          const a = (i / pts) * Math.PI * 2 - Math.PI / 2;
          const rad = i % 2 === 0 ? r : r * 0.52;
          const px2 = e.x + Math.cos(a) * rad;
          const py2 = e.y + Math.sin(a) * rad;
          i === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
        }
        ctx.closePath();
      } else if (e.type === "archer") {
        // Diamond
        ctx.moveTo(e.x, e.y - r);
        ctx.lineTo(e.x + r * 0.75, e.y);
        ctx.lineTo(e.x, e.y + r);
        ctx.lineTo(e.x - r * 0.75, e.y);
        ctx.closePath();
      } else {
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
      }
      ctx.fillStyle = flash ? "#ffffff" : e.def.color; ctx.fill();
      ctx.strokeStyle = flash ? "#ffffff" : e.def.edge;
      ctx.lineWidth   = e.type === "boss" ? 2.5 : 1.8;
      ctx.stroke();

      // Eye dot
      const eyeX = e.x + Math.cos(e.angle) * r * 0.52;
      const eyeY = e.y + Math.sin(e.angle) * r * 0.52;
      ctx.beginPath(); ctx.arc(eyeX, eyeY, r * 0.20, 0, Math.PI * 2);
      ctx.fillStyle = flash ? e.def.color : "#ffffff"; ctx.fill();

      // HP bar
      const bW = r * 2.5, bH = 4;
      const bX = e.x - bW / 2, bY = e.y - r - 11;
      ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(bX, bY, bW, bH);
      const hpPct = e.hp / e.maxHp;
      ctx.fillStyle = hpPct > 0.5 ? C.hp : C.hpLow;
      ctx.fillRect(bX, bY, bW * hpPct, bH);

      if (e.type === "boss") {
        ctx.fillStyle = C.gold; ctx.font = "bold 9px Arial"; ctx.textAlign = "center";
        ctx.fillText("BOSS", e.x, bY - 3);
      }
    }
  }

  _drawPlayer(ctx) {
    const p = this.player;
    if (!p) return;

    const blink = p.ihTimer > 0 && Math.sin(this.time * 30) > 0;
    if (blink) return;

    // Shadow
    ctx.beginPath(); ctx.ellipse(p.x, p.y + PLAYER_R * 0.65, PLAYER_R * 0.82, PLAYER_R * 0.28, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.32)"; ctx.fill();

    // Outer glow
    const g = ctx.createRadialGradient(p.x, p.y, PLAYER_R * 0.3, p.x, p.y, PLAYER_R + 16);
    g.addColorStop(0, "rgba(55,170,255,0.38)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_R + 16, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();

    // Body
    ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_R, 0, Math.PI * 2);
    ctx.fillStyle = C.player; ctx.fill();
    ctx.strokeStyle = "#90d0ff"; ctx.lineWidth = 2; ctx.stroke();

    // Inner ring
    ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_R * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(160,220,255,0.22)"; ctx.fill();

    // Facing dot
    if (p.atkTimer <= 0) {
      const fx = p.x + Math.cos(p.facing) * (PLAYER_R + 5);
      const fy = p.y + Math.sin(p.facing) * (PLAYER_R + 5);
      ctx.beginPath(); ctx.arc(fx, fy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(150,220,255,0.80)"; ctx.fill();
    }

    // Sword attack arc
    if (p.atkTimer > 0) {
      const prog = 1 - p.atkTimer / ATK_DUR;
      const aStart = p.atkAngle - ATK_ARC / 2;
      const aEnd   = aStart + ATK_ARC * prog;

      // Sweep fill
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, ATK_REACH, aStart, aEnd);
      ctx.closePath();
      const sg = ctx.createRadialGradient(p.x, p.y, PLAYER_R, p.x, p.y, ATK_REACH);
      sg.addColorStop(0, "rgba(160,230,255,0.55)");
      sg.addColorStop(1, "rgba(80,180,255,0)");
      ctx.fillStyle = sg; ctx.fill();

      // Blade line
      const ba = aEnd;
      const bx = p.x + Math.cos(ba) * ATK_REACH;
      const by = p.y + Math.sin(ba) * ATK_REACH;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(ba) * PLAYER_R, p.y + Math.sin(ba) * PLAYER_R);
      ctx.lineTo(bx, by);
      ctx.strokeStyle = "#d8f0ff"; ctx.lineWidth = 3; ctx.stroke();

      // Tip spark
      ctx.beginPath(); ctx.arc(bx, by, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff"; ctx.fill();
    }

    // Dash CD ring
    if (p.dashCd > 0) {
      const pct = 1 - p.dashCd / DASH_CD;
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLAYER_R + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
      ctx.strokeStyle = "rgba(90,200,255,0.50)"; ctx.lineWidth = 2.5; ctx.stroke();
    }
  }

  _drawHUD(ctx) {
    const p    = this.player;
    const pcx  = PX + PW / 2;

    // Panel background
    ctx.fillStyle = C.panel; ctx.fillRect(PX, 0, PW, H);
    ctx.strokeStyle = C.divider; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PX, 0); ctx.lineTo(PX, H); ctx.stroke();

    ctx.textAlign = "center";

    // Title
    ctx.fillStyle = C.accent; ctx.font = "bold 15px Arial, sans-serif";
    ctx.fillText("⚔  NEON CRYPT", pcx, 26);

    // Wave
    ctx.fillStyle = C.gold; ctx.font = "bold 12px Arial";
    ctx.fillText(`WAVE  ${this.wave}`, pcx, 44);

    // Score
    ctx.fillStyle = "rgba(130,175,230,0.60)"; ctx.font = "9px Arial";
    ctx.fillText("SCORE", pcx, 59);
    ctx.fillStyle = "#d4e8ff"; ctx.font = "bold 22px Arial";
    ctx.fillText(this.score.toLocaleString(), pcx, 80);
    ctx.fillStyle = "rgba(100,140,195,0.45)"; ctx.font = "9px Arial";
    ctx.fillText(`BEST  ${this.hiScore.toLocaleString()}`, pcx, 93);

    // HP bar
    const hpY   = 108;
    const hpBW  = PW - 28;
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(130,175,230,0.65)"; ctx.font = "bold 9px Arial";
    ctx.fillText("HP", PX + 14, hpY);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(130,175,230,0.55)"; ctx.font = "8px Arial";
    ctx.fillText(p ? `${p.hp} / ${p.maxHp}` : "0", PX + PW - 14, hpY);

    ctx.fillStyle = "rgba(0,0,0,0.50)";
    ctx.beginPath(); rr(ctx, PX + 14, hpY + 4, hpBW, 13, 4); ctx.fill();
    if (p && p.hp > 0) {
      const pct = p.hp / p.maxHp;
      ctx.fillStyle = pct > 0.5 ? C.hp : pct > 0.25 ? C.gold : C.hpLow;
      ctx.beginPath(); rr(ctx, PX + 14, hpY + 4, hpBW * pct, 13, 4); ctx.fill();
    }

    // Abilities section
    const abY = hpY + 30;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(100,140,195,0.60)"; ctx.font = "bold 9px Arial";
    ctx.fillText("ABILITIES", pcx, abY);

    const atkPct  = p ? clamp(1 - p.atkCd  / ATK_CD,  0, 1) : 1;
    const dashPct = p ? clamp(1 - p.dashCd / DASH_CD, 0, 1) : 1;
    this._drawAbility(ctx, PX + 14, abY + 8,  "ATTACK", "Click / Space", atkPct,  C.sword);
    this._drawAbility(ctx, PX + 14, abY + 46, "DASH",   "Shift / E",     dashPct, C.accent);

    // Enemies left
    const remY = abY + 102;
    const total = this.spawnQueue.length + this.enemies.length;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(100,140,195,0.55)"; ctx.font = "9px Arial";
    ctx.fillText("ENEMIES LEFT", pcx, remY);
    ctx.fillStyle = total > 0 ? "#ff8080" : C.hp; ctx.font = "bold 24px Arial";
    ctx.fillText(total, pcx, remY + 22);

    // Enemy type breakdown
    const counts = {};
    for (const e of this.enemies) counts[e.type] = (counts[e.type] || 0) + 1;
    let row = 0;
    for (const [type, cnt] of Object.entries(counts)) {
      ctx.fillStyle = EDEFS[type].edge + "cc"; ctx.font = "9px Arial"; ctx.textAlign = "left";
      ctx.fillText(`${EDEFS[type].label}:  ${cnt}`, PX + 18, remY + 38 + row * 14);
      row++;
    }

    // Controls box
    const fY = H - 126;
    ctx.fillStyle = "rgba(35,55,100,0.45)";
    ctx.beginPath(); rr(ctx, PX + 10, fY, PW - 20, 120, 6); ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(90,135,195,0.65)"; ctx.font = "bold 9px Arial";
    ctx.fillText("CONTROLS", pcx, fY + 13);

    const ctls = [
      ["WASD / ↑↓←→", "move"],
      ["Mouse",        "aim"],
      ["Click / Space","attack (sword)"],
      ["Shift / E",   "dash — invincible"],
      ["R",           "restart  ·  ESC menu"],
    ];
    ctx.font = "8px Arial";
    ctls.forEach(([k, v], i) => {
      ctx.fillStyle = C.accent + "cc"; ctx.textAlign = "left";
      ctx.fillText(k, PX + 16, fY + 26 + i * 17);
      ctx.fillStyle = "rgba(130,165,210,0.55)"; ctx.textAlign = "right";
      ctx.fillText(v, PX + PW - 14, fY + 26 + i * 17);
    });

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(24,190,80,0.55)"; ctx.font = "8px Arial";
    ctx.fillText("Green orbs restore 1 HP", pcx, H - 5);
  }

  _drawAbility(ctx, x, y, name, key, pct, col) {
    const bW = PW - 28, bH = 16;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath(); rr(ctx, x, y + 10, bW, bH, 4); ctx.fill();
    ctx.fillStyle = pct >= 1 ? col : col + "55";
    ctx.beginPath(); rr(ctx, x, y + 10, bW * pct, bH, 4); ctx.fill();
    ctx.font = "bold 8px Arial";
    ctx.fillStyle = pct >= 1 ? "#ffffff" : "rgba(160,195,235,0.55)";
    ctx.textAlign = "left";  ctx.fillText(name, x + 4, y + 21);
    ctx.textAlign = "right"; ctx.fillText(pct >= 1 ? key : "cooldown...", x + bW - 2, y + 21);
  }

  _drawWaveBanner(ctx) {
    const a = clamp(Math.min(1, this.waveBanner) * Math.min(1, this.waveBanner * 2.5), 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(0,0,0,0.60)";
    ctx.fillRect(AL, AT + AH / 2 - 46, AW, 92);
    ctx.textAlign = "center";
    const cx = AL + AW / 2;
    ctx.fillStyle = C.gold; ctx.font = "bold 34px Arial";
    ctx.fillText(`WAVE  ${this.wave}`, cx, AT + AH / 2 + 2);
    if (this.wave % 5 === 0) {
      ctx.fillStyle = C.boEdge; ctx.font = "bold 14px Arial";
      ctx.fillText("⚠  BOSS WAVE  ⚠", cx, AT + AH / 2 + 26);
    } else {
      const types = buildWave(this.wave);
      const cnt   = {};
      types.forEach(t => cnt[t] = (cnt[t] || 0) + 1);
      const desc = Object.entries(cnt).map(([t, n]) => `${n} ${EDEFS[t].label}`).join("  ·  ");
      ctx.fillStyle = "rgba(170,205,250,0.65)"; ctx.font = "11px Arial";
      ctx.fillText(desc, cx, AT + AH / 2 + 26);
    }
    ctx.globalAlpha = 1;
  }

  _drawMenu(ctx) {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);

    const atm = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, H * 0.75);
    atm.addColorStop(0, "rgba(20,40,110,0.20)");
    atm.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = atm; ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.arc(W / 2, H / 2 + 36, 55 + i * 52, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(40,80,190,${0.10 - i * 0.015})`; ctx.lineWidth = 1; ctx.stroke();
    }

    ctx.textAlign = "center";
    ctx.fillStyle = C.accent; ctx.font = "bold 46px Arial";
    ctx.fillText("NEON CRYPT", W / 2, H / 2 - 112);
    ctx.fillStyle = "rgba(130,175,230,0.62)"; ctx.font = "13px Arial";
    ctx.fillText("Arena dungeon crawler  ·  Wave combat  ·  Sword & dash", W / 2, H / 2 - 76);

    const feats = [
      "WASD to move  ·  Mouse to aim  ·  Click / Space to swing your sword",
      "Shift / E to dash — grants brief invincibility and repositions instantly",
      "Kill enemies to drop green HP orbs  ·  Waves get harder each round",
      "Grunts rush you  ·  Archers keep distance  ·  Brutes hit hard  ·  Boss: survive the burst",
    ];
    ctx.font = "11px Arial"; ctx.fillStyle = "rgba(115,158,212,0.55)";
    feats.forEach((f, i) => ctx.fillText(f, W / 2, H / 2 - 36 + i * 20));

    if (this.hiScore > 0) {
      ctx.fillStyle = C.gold; ctx.font = "bold 11px Arial";
      ctx.fillText(`BEST SCORE:  ${this.hiScore.toLocaleString()}`, W / 2, H / 2 + 52);
    }

    ctx.fillStyle = "rgba(28,88,200,0.88)";
    ctx.beginPath(); rr(ctx, W / 2 - 122, H / 2 + 60, 244, 50, 12); ctx.fill();
    ctx.strokeStyle = "rgba(70,155,255,0.55)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); rr(ctx, W / 2 - 122, H / 2 + 60, 244, 50, 12); ctx.stroke();
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 18px Arial";
    ctx.fillText("START GAME  ( Enter )", W / 2, H / 2 + 92);
  }

  _drawGameOver(ctx) {
    ctx.fillStyle = "rgba(4,7,14,0.97)"; ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.fillStyle = C.hpLow; ctx.font = "bold 46px Arial";
    ctx.fillText("GAME OVER", W / 2, H / 2 - 110);

    ctx.fillStyle = "rgba(140,180,235,0.72)"; ctx.font = "14px Arial";
    ctx.fillText(`Survived  ${this.wave}  wave${this.wave === 1 ? "" : "s"}`, W / 2, H / 2 - 70);

    ctx.fillStyle = "#d4e4ff"; ctx.font = "bold 28px Arial";
    ctx.fillText(`Score:  ${this.score.toLocaleString()}`, W / 2, H / 2 - 38);

    if (this.score > 0 && this.score >= this.hiScore) {
      ctx.fillStyle = C.gold; ctx.font = "bold 14px Arial";
      ctx.fillText("★  NEW BEST SCORE!  ★", W / 2, H / 2 - 10);
    } else if (this.hiScore > 0) {
      ctx.fillStyle = "rgba(130,170,215,0.45)"; ctx.font = "11px Arial";
      ctx.fillText(`Best:  ${this.hiScore.toLocaleString()}`, W / 2, H / 2 - 10);
    }

    ctx.fillStyle = "rgba(28,88,200,0.88)";
    ctx.beginPath(); rr(ctx, W / 2 - 122, H / 2 + 22, 244, 50, 12); ctx.fill();
    ctx.strokeStyle = "rgba(70,155,255,0.55)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); rr(ctx, W / 2 - 122, H / 2 + 22, 244, 50, 12); ctx.stroke();
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 17px Arial";
    ctx.fillText("Play Again  ( Enter / R )", W / 2, H / 2 + 54);

    ctx.fillStyle = "rgba(100,140,195,0.45)"; ctx.font = "10px Arial";
    ctx.fillText("ESC — return to menu", W / 2, H / 2 + 86);
  }
}

// ── React component ──────────────────────────────────────────────────────────
export default function NeonCryptGame() {
  const canvasRef = useRef(null);
  const rtRef     = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rt = new NeonCryptRuntime(canvas);
    rtRef.current = rt;
    rt.start();
    return () => { rt.destroy(); rtRef.current = null; };
  }, []);

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", background: "#04070e",
    }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}
