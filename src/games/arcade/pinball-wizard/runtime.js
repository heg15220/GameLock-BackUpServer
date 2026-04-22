// Pinball Wizard — Physics Runtime
// Canvas: 400 × 720, launch lane on the right side

export const W = 400;
export const H = 720;

// Table geometry constants
const LEFT  = 22;           // left wall x
const RIGHT = 358;          // right edge of main field
const TOP   = 22;           // top wall y
const LANE_X = 378;         // ball x in launch lane
const LANE_R = 396;         // right edge of lane

// Ball
const BALL_R     = 10;
const GRAVITY    = 1300;    // px/s²
const AIR_DRAG   = 0.9996;  // per-frame multiplier (approx at 60fps)
const WALL_BOUNCE    = 0.60;
const FLIP_BOUNCE    = 0.80;
const BUMPER_EJECT   = 380;  // fixed bumper ejection speed (px/s) — no compounding
const BUMPER_MIN_ADD = 80;   // minimum boost added on top of incoming speed
const SLING_BOOST    = 130;  // kick added after slingshot reflection
const MAX_BALL_SPD   = 1050; // hard cap to prevent runaway speeds
const DRAIN_Y        = H - 12;

// Physics stepping
const SUB_STEPS = 4;
const MAX_DT    = 1 / 30;

// Flipper geometry
export const FLIP_Y   = 646;
export const L_PIV    = { x: 108, y: FLIP_Y };
export const R_PIV    = { x: 272, y: FLIP_Y };
export const FLIP_LEN = 70;
const FLIP_CONTACT_PAD = 14;
const FLIP_ACTIVE_REACH_BONUS = 3;
const FLIP_SURFACE_TRANSFER = 1.2;
const FLIP_ACTIVE_NORMAL_BOOST = 90;
const FLIP_TRAP_WALL_L = 86;
const FLIP_TRAP_WALL_R = 304;
const FLIP_TRAP_SPEED_MAX = 85;
const FLIP_TRAP_HOLD_TIME = 0.22;
const FLIP_TRAP_NUDGE_X = 8;
const FLIP_TRAP_NUDGE_Y = 6;
const FLIP_TRAP_PUSH_X = 180;
const FLIP_TRAP_PUSH_Y = 300;
const FL_REST  =  28 * Math.PI / 180;          // rest  (tip lower-right)
const FL_ACT   = -26 * Math.PI / 180;          // active (tip upper-right)
const FR_REST  = (180 - 28) * Math.PI / 180;   // 152° (tip lower-left)
const FR_ACT   = (180 + 26) * Math.PI / 180;   // 206° (tip upper-left)
// Flipper angular speed — must be slow enough that the ball interacts during
// the swing (not just after it's done). At 60 fps a swing of ~54° = 0.94 rad
// completes in  0.94 / FLIP_SPD  seconds.  π*5 ≈ 15.7 rad/s → ~4 frames,
// giving the ball several sub-steps of contact with the moving surface.
const FLIP_SPD = Math.PI * 5.7;                // rad/s

// Plunger
const PLUNGER_Y    = 638;
const LAUNCH_V_MIN = 400;   // px/s at 0% charge
const LAUNCH_V_MAX = 1380;  // px/s at 100% — just clears the top
const PLUNGE_RATE  = 1.5;   // charge per second (full in ~0.67s)

// Pop bumpers
export const BUMPER_DEFS = [
  { x: 190, y: 188, r: 24, score: 100 },
  { x: 144, y: 264, r: 24, score: 100 },
  { x: 236, y: 264, r: 24, score: 100 },
];

// Drop targets (5 in a row)
export const TGT_W = 14;
export const TGT_H = 36;
export const TARGET_DEFS = [
  { x:  98, y: 354, score: 500 },
  { x: 143, y: 354, score: 500 },
  { x: 188, y: 354, score: 500 },
  { x: 233, y: 354, score: 500 },
  { x: 278, y: 354, score: 500 },
];

// Rollover lanes at the top (ball passes over these strips)
export const ROLLOVER_DEFS = [
  { x1:  52, x2: 108, y: 88 },
  { x1: 144, x2: 214, y: 88 },
  { x1: 250, x2: 306, y: 88 },
];

// Wall segments: { s:[x1,y1,x2,y2], t:'wall'|'sling'|'deflect' }
export const WALL_SEGS = [
  // Main field border
  { s: [LEFT, TOP, RIGHT, TOP],          t: 'wall'    }, // top
  { s: [LEFT, TOP, LEFT, 438],           t: 'wall'    }, // left upper (to sling)
  { s: [LEFT, 542, LEFT, H],             t: 'wall'    }, // left lower (below sling)
  // Launch lane — separator starts at y=72 leaving gap [22..72] where deflector redirects ball
  { s: [RIGHT, 72, RIGHT, H],            t: 'wall'    }, // lane separator (gap above y=72)
  { s: [LANE_R, TOP, LANE_R, H],         t: 'wall'    }, // lane right edge
  { s: [RIGHT, TOP, LANE_R, TOP],        t: 'wall'    }, // lane top wall
  { s: [LANE_R, 74, RIGHT, TOP],         t: 'deflect' }, // deflector → redirects ball LEFT into field
  // Gutters
  { s: [LEFT, 542, 86, 640],             t: 'wall'    }, // left gutter diagonal
  { s: [RIGHT, 542, 304, 640],           t: 'wall'    }, // right gutter diagonal
  { s: [86, 640, 86, H],                 t: 'wall'    }, // left outlane
  { s: [304, 640, 304, H],               t: 'wall'    }, // right outlane
  // Slingshot faces (elastically bouncy)
  { s: [LEFT, 438, 86, 490],             t: 'sling'   }, // left sling upper
  { s: [86, 490, LEFT, 542],             t: 'sling'   }, // left sling lower
  { s: [RIGHT, 438, 294, 490],           t: 'sling'   }, // right sling upper
  { s: [294, 490, RIGHT, 542],           t: 'sling'   }, // right sling lower
];

const SAVE_KEY = 'pinball_wizard_v1';

// ─── helpers ─────────────────────────────────────────────────────────────────

function closestPtOnSeg(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 < 1e-10) return { x: ax, y: ay };
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
  return { x: ax + t * abx, y: ay + t * aby };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function syncCanvasResolution(canvas, ctx) {
  if (!canvas || !ctx || typeof window === 'undefined') return;
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(1, rect.width || canvas.clientWidth || W);
  const cssHeight = Math.max(1, rect.height || canvas.clientHeight || H);
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2.5));
  const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
  const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  ctx.setTransform(pixelWidth / W, 0, 0, pixelHeight / H, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
}

// ─── PinballRuntime ───────────────────────────────────────────────────────────

export default class PinballRuntime {
  constructor({ canvas, onSnapshot }) {
    this.canvas     = canvas;
    this.ctx        = canvas.getContext('2d');
    this.onSnapshot = onSnapshot;

    this.keys = {};
    this._onKeyDown = (e) => { this.keys[e.key] = true;  this._handleKey(true,  e.key); };
    this._onKeyUp   = (e) => { this.keys[e.key] = false; this._handleKey(false, e.key); };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup',   this._onKeyUp);

    this.rafId  = null;
    this.lastTs = null;

    this._audioCtx = null;
    this._hiScore  = 0;
    this._loadHiScore();
    this._onResize = () => syncCanvasResolution(this.canvas, this.ctx);
    window.addEventListener('resize', this._onResize);
    syncCanvasResolution(this.canvas, this.ctx);

    this._init();
  }

  // ── public API ─────────────────────────────────────────────────────────────

  start() {
    this.rafId = requestAnimationFrame(this._loop.bind(this));
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
    window.removeEventListener('resize', this._onResize);
    if (this._audioCtx) { try { this._audioCtx.close(); } catch { /**/ } }
  }

  /** Touch controls — called from React */
  setFlipLeft(down)   { this.leftFlipper.active  = down; }
  setFlipRight(down)  { this.rightFlipper.active = down; }
  setPlungeTouch(down){ this._touchPlunge = down; }

  advanceTime(ms) {
    // QA bridge — deterministic step
    this._tick(ms / 1000);
  }

  // ── init ──────────────────────────────────────────────────────────────────

  _init() {
    this.phase          = 'menu';
    this.score          = 0;
    this.ballsLeft      = 3;
    this.multiplier     = 1;
    this.plungerCharge  = 0;
    this._touchPlunge   = false;
    this.message        = '';
    this.msgTimer       = 0;
    this.comboBumper    = 0;  // consecutive bumper hits for bonus
    this.targetResetT   = 0;
    this.flipperTrapT   = 0;

    this.leftFlipper  = { angle: FL_REST, omega: 0, active: false };
    this.rightFlipper = { angle: FR_REST, omega: 0, active: false };

    this.bumpers  = BUMPER_DEFS.map(b => ({ ...b, lit: 0 }));
    this.targets  = TARGET_DEFS.map(t => ({ ...t, hit: false }));
    this.rollovers = ROLLOVER_DEFS.map(r => ({ ...r, lit: false }));

    this.particles = [];
    this._placeBallOnLauncher();
  }

  _startGame() {
    this.score         = 0;
    this.ballsLeft     = 3;
    this.multiplier    = 1;
    this.comboBumper   = 0;
    this.targetResetT  = 0;
    this.bumpers.forEach(b => b.lit = 0);
    this.targets.forEach(t => t.hit  = false);
    this.rollovers.forEach(r => r.lit = false);
    this.particles     = [];
    this._placeBallOnLauncher();
  }

  _placeBallOnLauncher() {
    this.ball          = { x: LANE_X, y: PLUNGER_Y, vx: 0, vy: 0 };
    this.phase         = 'launching';
    this.plungerCharge = 0;
    this._touchPlunge  = false;
    this.flipperTrapT  = 0;
  }

  // ── storage ───────────────────────────────────────────────────────────────

  _loadHiScore() {
    try { this._hiScore = parseInt(localStorage.getItem(SAVE_KEY) ?? '0', 10) || 0; } catch { /**/ }
  }

  _saveHiScore() {
    try {
      if (this.score > this._hiScore) {
        this._hiScore = this.score;
        localStorage.setItem(SAVE_KEY, String(this._hiScore));
      }
    } catch { /**/ }
  }

  // ── input ─────────────────────────────────────────────────────────────────

  _handleKey(down, key) {
    // Flippers
    if (key === 'z' || key === 'Z' || key === 'ArrowLeft')      this.leftFlipper.active  = down;
    if (key === 'x' || key === 'X' || key === '/' || key === 'ArrowRight') this.rightFlipper.active = down;

    if (!down) return;

    if (key === 'r' || key === 'R') { this._init(); this._startGame(); return; }

    if (key === ' ' || key === 'Enter') {
      if (this.phase === 'menu')     { this._startGame(); return; }
      if (this.phase === 'gameOver') { this._init(); return; }
      if (this.phase === 'ballLost') { this._placeBallOnLauncher(); return; }
    }
  }

  // ── main loop ─────────────────────────────────────────────────────────────

  _loop(ts) {
    this.rafId = requestAnimationFrame(this._loop.bind(this));
    const rawDt = (ts - (this.lastTs ?? ts)) / 1000;
    this.lastTs = ts;
    this._tick(Math.min(rawDt, MAX_DT));
    syncCanvasResolution(this.canvas, this.ctx);
    this._render();
  }

  _tick(dt) {
    this.msgTimer = Math.max(0, this.msgTimer - dt);
    if (this.msgTimer <= 0) this.message = '';

    this._updateFlippers(dt);
    this.bumpers.forEach(b => { if (b.lit > 0) b.lit = Math.max(0, b.lit - dt * 2.5); });
    this._updateParticles(dt);

    if (this.phase === 'launching') this._tickLaunching(dt);
    if (this.phase === 'playing')   this._tickPlaying(dt);

    this._publishSnapshot();
  }

  // ── launching ─────────────────────────────────────────────────────────────

  _tickLaunching(dt) {
    const charging = this.keys[' '] || this.keys['Enter'] || this._touchPlunge;
    if (charging) {
      this.plungerCharge = Math.min(1, this.plungerCharge + dt * PLUNGE_RATE);
    } else if (this.plungerCharge > 0.05) {
      // Release: launch ball
      const v = LAUNCH_V_MIN + (LAUNCH_V_MAX - LAUNCH_V_MIN) * this.plungerCharge;
      this.ball.vy = -v;
      this.ball.vx = 0;
      this.plungerCharge = 0;
      this.phase = 'playing';
      this._beep(220, 0.05, 'sine', 0.1);
      this._beep(440, 0.08, 'sine', 0.15);
    }
    // Ball locked to launcher position
    this.ball.x = LANE_X;
    this.ball.y = PLUNGER_Y;
  }

  // ── playing ───────────────────────────────────────────────────────────────

  _tickPlaying(dt) {
    const subDt = dt / SUB_STEPS;
    for (let i = 0; i < SUB_STEPS; i++) {
      this._integrateBall(subDt);
      this._resolveAll();
    }
    this._resolveFlipperWallTrap(dt);
    this._checkDrain();
    this._checkTargetReset(dt);
    this._checkRollovers();
  }

  _integrateBall(dt) {
    const b = this.ball;
    b.vy += GRAVITY * dt;
    // Air drag (per-frame approximation)
    const drag = 1 - (1 - AIR_DRAG) * (dt * 60);
    b.vx *= drag;
    b.vy *= drag;
    b.x  += b.vx * dt;
    b.y  += b.vy * dt;
  }

  _resolveAll() {
    for (const wall of WALL_SEGS)     this._resolveWall(wall);
    for (const bmp  of this.bumpers)  this._resolveBumper(bmp);
    for (const tgt  of this.targets)  { if (!tgt.hit) this._resolveTarget(tgt); }
    this._resolveFlipper(this.leftFlipper,  L_PIV);
    this._resolveFlipper(this.rightFlipper, R_PIV);
  }

  // ─ Wall ─────────────────────────────────────────────────────────────────

  _resolveWall(wall) {
    const [x1, y1, x2, y2] = wall.s;
    const cp   = closestPtOnSeg(this.ball.x, this.ball.y, x1, y1, x2, y2);
    const dx   = this.ball.x - cp.x;
    const dy   = this.ball.y - cp.y;
    const dist = Math.hypot(dx, dy);
    if (dist >= BALL_R || dist < 1e-7) return;

    const inv  = 1 / dist;
    const nx   = dx * inv, ny = dy * inv;

    // Push ball outside the wall
    this.ball.x = cp.x + nx * BALL_R;
    this.ball.y = cp.y + ny * BALL_R;

    const vdot = this.ball.vx * nx + this.ball.vy * ny;
    if (vdot >= 0) return; // already moving away

    if (wall.t === 'sling') {
      // Slingshot: reflect with moderate restitution + directional kick
      const e   = 0.75;
      this.ball.vx -= (1 + e) * vdot * nx;
      this.ball.vy -= (1 + e) * vdot * ny;
      // Add kick away from sling, then cap
      this.ball.vx += nx * SLING_BOOST;
      this.ball.vy += ny * SLING_BOOST;
      const slingSpd = Math.hypot(this.ball.vx, this.ball.vy);
      if (slingSpd > MAX_BALL_SPD) {
        const inv = MAX_BALL_SPD / slingSpd;
        this.ball.vx *= inv;
        this.ball.vy *= inv;
      }
      const pts = this._addScore(50);
      this._showMsg('+' + pts + ' SLING!');
      this._spawnParticles(cp.x, cp.y, '#ff9900', 5);
      this._beep(440, 0.06, 'sawtooth', 0.14);
    } else {
      const e = WALL_BOUNCE;
      this.ball.vx -= (1 + e) * vdot * nx;
      this.ball.vy -= (1 + e) * vdot * ny;
    }
  }

  // ─ Bumper ────────────────────────────────────────────────────────────────

  _resolveBumper(bmp) {
    const dx   = this.ball.x - bmp.x;
    const dy   = this.ball.y - bmp.y;
    const dist = Math.hypot(dx, dy);
    const minD = BALL_R + bmp.r;
    if (dist >= minD || dist < 1e-7) return;

    const inv = 1 / dist;
    const nx  = dx * inv, ny = dy * inv;

    // Push ball out
    this.ball.x = bmp.x + nx * minD;
    this.ball.y = bmp.y + ny * minD;

    // Fixed ejection speed — prevents chain-compounding across multiple bumpers.
    // Result is the max of: a fixed target speed OR (incoming + small boost).
    const inSpd    = Math.hypot(this.ball.vx, this.ball.vy);
    const ejectSpd = Math.min(Math.max(BUMPER_EJECT, inSpd + BUMPER_MIN_ADD), MAX_BALL_SPD);
    this.ball.vx = nx * ejectSpd;
    this.ball.vy = ny * ejectSpd;

    this.comboBumper++;
    const comboBonus = this.comboBumper >= 3 ? 2 : 1;
    const pts = this._addScore(bmp.score * comboBonus);
    bmp.lit   = 1.0;
    this._spawnParticles(bmp.x, bmp.y, '#ff00ee', 10);
    this._showMsg(this.comboBumper >= 3 ? 'COMBO ×' + this.comboBumper + '! +' + pts : '+' + pts + ' BUMPER!');
    this._playBumper();
  }

  // ─ Drop target ───────────────────────────────────────────────────────────

  _resolveTarget(tgt) {
    const l   = tgt.x - TGT_W / 2, r = tgt.x + TGT_W / 2;
    const top = tgt.y - TGT_H / 2, bot = tgt.y + TGT_H / 2;
    const cx  = clamp(this.ball.x, l, r);
    const cy  = clamp(this.ball.y, top, bot);
    const dx  = this.ball.x - cx;
    const dy  = this.ball.y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist >= BALL_R) return;

    tgt.hit = true;
    this.comboBumper = 0; // reset bumper combo

    const nx = dist > 1e-7 ? dx / dist : 0;
    const ny = dist > 1e-7 ? dy / dist : -1;
    this.ball.x += nx * (BALL_R - dist);
    this.ball.y += ny * (BALL_R - dist);

    const vdot = this.ball.vx * nx + this.ball.vy * ny;
    if (vdot < 0) {
      this.ball.vx -= 2 * vdot * nx;
      this.ball.vy -= 2 * vdot * ny;
    }

    const pts = this._addScore(tgt.score);
    this._spawnParticles(tgt.x, tgt.y, '#00ffcc', 7);
    this._showMsg('+' + pts + ' TARGET!');
    this._beep(660, 0.12, 'sine', 0.18);

    if (this.targets.every(t => t.hit)) {
      this.multiplier = Math.min(6, this.multiplier + 1);
      const bonus = this._addScore(3000);
      this.targetResetT = 1.8;
      this._showMsg('ALL TARGETS! ×' + this.multiplier + ' MULTI! +' + bonus);
      for (let i = 0; i < 24; i++) this._spawnParticles(188, 354, '#ffff00', 1);
      this._beep(880, 0.15, 'sine', 0.2);
      setTimeout(() => this._beep(1100, 0.12, 'sine', 0.18), 120);
      setTimeout(() => this._beep(1320, 0.2,  'sine', 0.15), 260);
    }
  }

  _checkTargetReset(dt) {
    if (this.targetResetT > 0) {
      this.targetResetT -= dt;
      if (this.targetResetT <= 0) this.targets.forEach(t => t.hit = false);
    }
  }

  // ─ Rollover lanes ────────────────────────────────────────────────────────

  _checkRollovers() {
    const b = this.ball;
    for (const rv of this.rollovers) {
      if (!rv.lit && b.y >= rv.y - BALL_R && b.y <= rv.y + BALL_R + 4
          && b.x >= rv.x1 && b.x <= rv.x2) {
        rv.lit = true;
        const pts = this._addScore(1000);
        this._showMsg('+' + pts + ' LANE!');
        this._beep(550, 0.08, 'sine', 0.12);
        // If all lit → bonus + reset
        if (this.rollovers.every(r => r.lit)) {
          const bonus = this._addScore(5000);
          this.rollovers.forEach(r => r.lit = false);
          this._showMsg('ALL LANES! +' + bonus);
          for (let i = 0; i < 16; i++) this._spawnParticles(188, 90, '#00aaff', 1);
          this._beep(1100, 0.2, 'sine', 0.2);
        }
      }
    }
  }

  // ─ Flipper ───────────────────────────────────────────────────────────────

  _distanceToFlipper(pivot, angle) {
    const tipX = pivot.x + Math.cos(angle) * FLIP_LEN;
    const tipY = pivot.y + Math.sin(angle) * FLIP_LEN;
    const cp = closestPtOnSeg(this.ball.x, this.ball.y, pivot.x, pivot.y, tipX, tipY);
    return Math.hypot(this.ball.x - cp.x, this.ball.y - cp.y);
  }

  _resolveFlipperWallTrap(dt) {
    const b = this.ball;
    const speed = Math.hypot(b.vx, b.vy);
    const inFlipperBand = b.y >= FLIP_Y - 54 && b.y <= H - BALL_R - 2;
    const nearLeftTrapWall = b.x <= FLIP_TRAP_WALL_L + BALL_R + 7;
    const nearRightTrapWall = b.x >= FLIP_TRAP_WALL_R - BALL_R - 7;
    const nearLeftFlipper = this._distanceToFlipper(L_PIV, this.leftFlipper.angle) <= BALL_R + FLIP_CONTACT_PAD + 8;
    const nearRightFlipper = this._distanceToFlipper(R_PIV, this.rightFlipper.angle) <= BALL_R + FLIP_CONTACT_PAD + 8;

    const isTrapped = speed <= FLIP_TRAP_SPEED_MAX
      && inFlipperBand
      && ((nearLeftTrapWall && nearLeftFlipper) || (nearRightTrapWall && nearRightFlipper));

    if (!isTrapped) {
      this.flipperTrapT = 0;
      return;
    }

    this.flipperTrapT += dt;
    if (this.flipperTrapT < FLIP_TRAP_HOLD_TIME) return;

    const pushRight = nearLeftTrapWall && !nearRightTrapWall;
    const dirX = pushRight ? 1 : -1;
    b.x = clamp(b.x + dirX * FLIP_TRAP_NUDGE_X, LEFT + BALL_R + 1, LANE_R - BALL_R - 1);
    b.y = Math.max(TOP + BALL_R + 1, b.y - FLIP_TRAP_NUDGE_Y);
    b.vx = dirX * Math.max(Math.abs(b.vx), FLIP_TRAP_PUSH_X);
    b.vy = Math.min(b.vy, -FLIP_TRAP_PUSH_Y);

    this.flipperTrapT = 0;
    this._spawnParticles(b.x, b.y, '#99ccff', 6);
  }

  _resolveFlipper(flipper, pivot) {
    const tipX = pivot.x + Math.cos(flipper.angle) * FLIP_LEN;
    const tipY = pivot.y + Math.sin(flipper.angle) * FLIP_LEN;
    const cp   = closestPtOnSeg(this.ball.x, this.ball.y, pivot.x, pivot.y, tipX, tipY);
    const dx   = this.ball.x - cp.x;
    const dy   = this.ball.y - cp.y;
    const dist = Math.hypot(dx, dy);
    const thr  = BALL_R + FLIP_CONTACT_PAD + (flipper.active ? FLIP_ACTIVE_REACH_BONUS : 0);
    if (dist >= thr || dist < 1e-7) return;

    const nx  = dx / dist, ny = dy / dist;
    this.ball.x = cp.x + nx * thr;
    this.ball.y = cp.y + ny * thr;

    // Surface velocity due to flipper rotation:
    // In screen-coords (y↓), clockwise ω > 0 → v = ω*(-ry, rx) at arm (rx,ry)
    const rx  = cp.x - pivot.x, ry = cp.y - pivot.y;
    const swingOmega = flipper.omega * FLIP_SURFACE_TRANSFER;
    const svx = -swingOmega * ry;
    const svy =  swingOmega * rx;

    // Relative velocity of ball w.r.t. flipper surface
    const rvx  = this.ball.vx - svx;
    const rvy  = this.ball.vy - svy;
    const rdot = rvx * nx + rvy * ny;

    if (rdot < 0) {
      const e = FLIP_BOUNCE;
      this.ball.vx -= (1 + e) * rdot * nx;
      this.ball.vy -= (1 + e) * rdot * ny;
      if (flipper.active) {
        this.ball.vx += nx * FLIP_ACTIVE_NORMAL_BOOST;
        this.ball.vy += ny * FLIP_ACTIVE_NORMAL_BOOST;
      }
      // Hard cap so rapid flips can't accidentally exceed safe speed
      const spd = Math.hypot(this.ball.vx, this.ball.vy);
      if (spd > MAX_BALL_SPD) {
        const inv = MAX_BALL_SPD / spd;
        this.ball.vx *= inv;
        this.ball.vy *= inv;
      }
    }
    this.comboBumper = 0;
  }

  _updateFlippers(dt) {
    const lf = this.leftFlipper;
    if (lf.active) {
      lf.omega = -FLIP_SPD;
      lf.angle = Math.max(FL_ACT, lf.angle - FLIP_SPD * dt);
    } else {
      lf.omega = FLIP_SPD * 0.55;
      lf.angle = Math.min(FL_REST, lf.angle + FLIP_SPD * 0.55 * dt);
    }
    if (Math.abs(lf.angle - (lf.active ? FL_ACT : FL_REST)) < 0.005) lf.omega = 0;

    const rf = this.rightFlipper;
    if (rf.active) {
      rf.omega = FLIP_SPD;
      rf.angle = Math.min(FR_ACT, rf.angle + FLIP_SPD * dt);
    } else {
      rf.omega = -FLIP_SPD * 0.55;
      rf.angle = Math.max(FR_REST, rf.angle - FLIP_SPD * 0.55 * dt);
    }
    if (Math.abs(rf.angle - (rf.active ? FR_ACT : FR_REST)) < 0.005) rf.omega = 0;
  }

  // ─ Drain ─────────────────────────────────────────────────────────────────

  _checkDrain() {
    if (this.ball.y <= DRAIN_Y) return;
    this.ballsLeft--;
    this._saveHiScore();
    this._spawnParticles(this.ball.x, this.ball.y - 30, '#ff4444', 14);
    this._playDrain();
    if (this.ballsLeft <= 0) {
      this.phase = 'gameOver';
      this._saveHiScore();
      this._showMsg('GAME OVER');
    } else {
      this.phase = 'ballLost';
      this._showMsg('BALL LOST — ' + this.ballsLeft + ' ball' + (this.ballsLeft > 1 ? 's' : '') + ' left');
    }
  }

  // ─ Particles ─────────────────────────────────────────────────────────────

  _spawnParticles(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a   = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 220;
      const life = 0.5 + Math.random() * 0.5;
      this.particles.push({ x, y, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd, color, life, maxLife: life, r: 2 + Math.random() * 3 });
    }
  }

  _updateParticles(dt) {
    this.particles = this.particles.filter(p => {
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      p.vy += 350 * dt;  // particle gravity
      p.life -= dt;
      return p.life > 0;
    });
  }

  // ─ Scoring ───────────────────────────────────────────────────────────────

  _addScore(base) {
    const pts = base * this.multiplier;
    this.score += pts;
    return pts;
  }

  _showMsg(msg) {
    this.message  = msg;
    this.msgTimer = 2.2;
  }

  // ─ Audio (Web Audio API — procedural) ────────────────────────────────────

  _getAC() {
    if (!this._audioCtx) {
      try { this._audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { /**/ }
    }
    return this._audioCtx;
  }

  _beep(freq, dur, type = 'square', vol = 0.14) {
    const ac = this._getAC();
    if (!ac) return;
    try {
      const osc  = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + dur + 0.01);
    } catch { /**/ }
  }

  _playBumper() {
    this._beep(880, 0.07, 'square', 0.18);
    setTimeout(() => this._beep(1100, 0.05, 'square', 0.12), 50);
  }

  _playDrain() {
    this._beep(220, 0.28, 'sine', 0.22);
    setTimeout(() => this._beep(165, 0.35, 'sine', 0.16), 220);
    setTimeout(() => this._beep(110, 0.45, 'sine', 0.10), 480);
  }

  // ─ Snapshot ──────────────────────────────────────────────────────────────

  _publishSnapshot() {
    if (!this.onSnapshot) return;
    this.onSnapshot({
      phase:         this.phase,
      score:         this.score,
      hiScore:       this._hiScore,
      ballsLeft:     this.ballsLeft,
      multiplier:    this.multiplier,
      plungerCharge: this.plungerCharge,
      message:       this.message,
      msgTimer:      this.msgTimer,
      // Geometry (for QA bridge / external consumers)
      ball:          { x: this.ball.x, y: this.ball.y, vx: this.ball.vx, vy: this.ball.vy, r: BALL_R },
      bumpers:       this.bumpers.map(b => ({ x: b.x, y: b.y, r: b.r, lit: b.lit })),
      targets:       this.targets.map(t => ({ x: t.x, y: t.y, hit: t.hit })),
      rollovers:     this.rollovers.map(r => ({ x1: r.x1, x2: r.x2, y: r.y, lit: r.lit })),
      leftFlipper:   { angle: this.leftFlipper.angle,  active: this.leftFlipper.active  },
      rightFlipper:  { angle: this.rightFlipper.angle, active: this.rightFlipper.active },
      particles:     this.particles.map(p => ({
        x: p.x, y: p.y, color: p.color, r: p.r,
        alpha: p.maxLife > 0 ? p.life / p.maxLife : 0,
      })),
    });
  }

  _render() {
    // Delegated to render.js — imported & called from index.jsx game loop
    // (render.js is imported in index.jsx which passes ctx + snapshot)
  }
}
