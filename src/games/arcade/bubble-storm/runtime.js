// Bubble Storm — Physics / State Runtime
// Canvas 400 × 620  ·  Hex bubble grid  ·  Bust-a-Move mechanics

export const W      = 400;
export const H      = 620;
export const R      = 17;              // bubble radius
export const HEX_W  = R * 2;          // = 34 — horizontal centre spacing
export const HEX_H  = Math.sqrt(3) * R; // ≈ 29.44 — vertical row spacing

const TOP_Y      = R + 8;             // row-0 centre y when pushAnim = 0
const SHOOTER_Y  = H - 58;            // cannon centre y
const GAMEOVER_Y = H - 170;           // any bubble y > this → game over

export const COLS_EVEN = 11;          // columns in even rows (0,2,4…)
export const COLS_ODD  = 10;          // columns in odd rows  (1,3,5…)
const INIT_ROWS   = 7;
const MAX_ROWS    = 14;

const BULLET_SPD  = 760;              // px/s
const MIN_ANGLE   = 12 * Math.PI / 180; // prevent near-horizontal shots
const PUSH_SHOTS  = 8;               // shots before a new top row is pushed in
const PUSH_SPEED  = 95;              // px/s push animation
const MATCH_MIN   = 3;               // bubbles needed to pop
const KEY_AIM_SPEED = 2.3;
const KEY_VERTICAL_PULL = 4.6;
const KEY_VERTICAL_SPREAD = 1.8;

export const COLORS = [
  '#ff4466',  // 0  red
  '#4499ff',  // 1  blue
  '#44dd77',  // 2  green
  '#ffee33',  // 3  yellow
  '#cc44ff',  // 4  purple
  '#ff8833',  // 5  orange
];

const SAVE_KEY = 'bubble_storm_v1';

// ─── seeded RNG ───────────────────────────────────────────────────────────────

function makeRng(seed) {
  let s = (seed | 0) || 12345;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967295; };
}

// ─── BubbleRuntime ────────────────────────────────────────────────────────────

export default class BubbleRuntime {
  constructor({ canvas, onSnapshot }) {
    this.canvas     = canvas;
    this.ctx        = canvas.getContext('2d');
    this.onSnapshot = onSnapshot;

    this._hiScore  = 0;
    this._loadHiScore();
    this._audioCtx = null;

    this.aimAngle = -Math.PI / 2;   // straight up initially

    this.rafId  = null;
    this.lastTs = null;

    this._init();
  }

  // ── public API ─────────────────────────────────────────────────────────────

  start()   { this.rafId = requestAnimationFrame(this._loop.bind(this)); }
  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this._audioCtx) { try { this._audioCtx.close(); } catch { /**/ } }
  }

  setAim(canvasX, canvasY) {
    const dx = canvasX - W / 2;
    const dy = canvasY - SHOOTER_Y;
    let a = Math.atan2(dy, dx);
    // Keep in upward half: angle must be between -(PI - MIN_ANGLE) and -MIN_ANGLE
    a = Math.max(-Math.PI + MIN_ANGLE, Math.min(-MIN_ANGLE, a));
    this.aimAngle = a;
  }

  shoot() {
    if (this.phase !== 'playing' || this.bullet || this.isPushing) return;
    const vx = Math.cos(this.aimAngle) * BULLET_SPD;
    const vy = Math.sin(this.aimAngle) * BULLET_SPD;
    this.bullet       = { x: W / 2, y: SHOOTER_Y, vx, vy, color: this.currentColor };
    this.currentColor = this.nextColor;
    this.nextColor    = this._pickNextColor();
    this.shotsFired++;
    this._beep(660, 0.04, 'sine', 0.08);
  }

  swap() {
    if (this.phase !== 'playing' || this.bullet) return;
    [this.currentColor, this.nextColor] = [this.nextColor, this.currentColor];
    this._beep(440, 0.03, 'sine', 0.06);
  }

  handleKey(down, key) {
    const keyName = String(key || '');
    const normalized = keyName.toLowerCase();

    if (normalized === 'arrowleft' || normalized === 'a') {
      this.keyAim.left = down;
      return;
    }
    if (normalized === 'arrowright' || normalized === 'd') {
      this.keyAim.right = down;
      return;
    }
    if (normalized === 'arrowup' || normalized === 'w') {
      this.keyAim.up = down;
      return;
    }
    if (normalized === 'arrowdown') {
      this.keyAim.down = down;
      return;
    }

    if (!down) return;
    if (keyName === ' ' || keyName === 'Enter') {
      if (this.phase === 'menu')    { this._startGame(); return; }
      if (this.phase === 'gameover'){ this._init();      return; }
      if (this.phase === 'playing') { this.shoot();      return; }
    }
    if (normalized === 'r' && this.phase !== 'menu') { this._init(); this._startGame(); }
    if (keyName === 'Tab' || normalized === 's') { this.swap(); }
  }

  advanceTime(ms) { this._tick(ms / 1000); }

  // ── trajectory (for aim-line rendering) ─────────────────────────────────

  getTrajectory() {
    const pts = [{ x: W / 2, y: SHOOTER_Y }];
    let x = W / 2, y = SHOOTER_Y;
    let vx = Math.cos(this.aimAngle);
    let vy = Math.sin(this.aimAngle);
    const STEP = 7, MAX_PTS = 110;

    for (let i = 0; i < MAX_PTS; i++) {
      x += vx * STEP;
      y += vy * STEP;

      // Wall bounces
      if (x - R < 0)  { x = R;     vx =  Math.abs(vx); }
      if (x + R > W)  { x = W - R; vx = -Math.abs(vx); }

      pts.push({ x, y });

      // Stop when reaching grid bubble proximity
      let stop = false;
      for (let r = 0; r < this.grid.length && !stop; r++) {
        const gy = this._bubbleY(r);
        if (Math.abs(y - gy) > 3 * R) continue;
        for (let c = 0; c < this._colCount(r) && !stop; c++) {
          if (this.grid[r][c] === null) continue;
          if (Math.hypot(x - this._bubbleX(r, c), y - gy) < 2 * R + 3) stop = true;
        }
      }
      if (stop || y < TOP_Y - R) break;
    }
    return pts;
  }

  // ── init ──────────────────────────────────────────────────────────────────

  _init() {
    this.phase        = 'menu';
    this.score        = 0;
    this.level        = 1;
    this.shotsFired   = 0;
    this.pushAnim     = 0;
    this.isPushing    = false;
    this.bullet       = null;
    this.falling      = [];
    this.particles    = [];
    this.message      = '';
    this.msgTimer     = 0;

    this._rand        = makeRng(Date.now() & 0xffff);
    this.currentColor = Math.floor(this._rand() * COLORS.length);
    this.nextColor    = Math.floor(this._rand() * COLORS.length);
    this.grid         = this._buildGrid(INIT_ROWS);
    this.keyAim       = { up: false, down: false, left: false, right: false };
  }

  _startGame() {
    this.score        = 0;
    this.level        = 1;
    this.shotsFired   = 0;
    this.pushAnim     = 0;
    this.isPushing    = false;
    this.bullet       = null;
    this.falling      = [];
    this.particles    = [];
    this.message      = '';
    this.msgTimer     = 0;
    this._rand        = makeRng(Date.now() & 0xffff);
    this.currentColor = Math.floor(this._rand() * COLORS.length);
    this.nextColor    = Math.floor(this._rand() * COLORS.length);
    this.grid         = this._buildGrid(INIT_ROWS);
    this.keyAim       = { up: false, down: false, left: false, right: false };
    this.phase        = 'playing';
  }

  _buildGrid(filledRows) {
    const grid = [];
    for (let r = 0; r < MAX_ROWS; r++) {
      const cols    = this._colCount(r);
      const maxClr  = Math.min(this.level + 2, COLORS.length);
      grid.push(r < filledRows
        ? Array.from({ length: cols }, () => Math.floor(this._rand() * maxClr))
        : Array(cols).fill(null)
      );
    }
    return grid;
  }

  _pickNextColor() {
    // Prefer colors already present in the grid to avoid unshootable orphans
    const present = new Set();
    for (const row of this.grid) for (const c of row) if (c !== null) present.add(c);
    if (present.size === 0) return Math.floor(this._rand() * COLORS.length);
    const arr = [...present];
    return arr[Math.floor(this._rand() * arr.length)];
  }

  // ── grid helpers ──────────────────────────────────────────────────────────

  _colCount(row) { return row % 2 === 0 ? COLS_EVEN : COLS_ODD; }

  _bubbleX(row, col) {
    return R + col * HEX_W + (row % 2 === 0 ? 0 : R);
  }

  _bubbleY(row) {
    return TOP_Y + row * HEX_H + this.pushAnim;
  }

  // Hex neighbours — uses "offset grid" convention (even rows flush, odd rows offset +R)
  _neighbors(row, col) {
    const nbs    = [];
    const cols   = this._colCount(row);
    const isEven = row % 2 === 0;

    // Same row
    if (col > 0)        nbs.push([row, col - 1]);
    if (col < cols - 1) nbs.push([row, col + 1]);

    // Row above  (row-1)
    if (row > 0) {
      const aboveCols = this._colCount(row - 1);
      if (isEven) {
        if (col - 1 >= 0 && col - 1 < aboveCols)  nbs.push([row - 1, col - 1]);
        if (col     >= 0 && col     < aboveCols)   nbs.push([row - 1, col    ]);
      } else {
        if (col     >= 0 && col     < aboveCols)   nbs.push([row - 1, col    ]);
        if (col + 1 >= 0 && col + 1 < aboveCols)  nbs.push([row - 1, col + 1]);
      }
    }

    // Row below (row+1)
    if (row + 1 < this.grid.length) {
      const belowCols = this._colCount(row + 1);
      if (isEven) {
        if (col - 1 >= 0 && col - 1 < belowCols)  nbs.push([row + 1, col - 1]);
        if (col     >= 0 && col     < belowCols)   nbs.push([row + 1, col    ]);
      } else {
        if (col     >= 0 && col     < belowCols)   nbs.push([row + 1, col    ]);
        if (col + 1 >= 0 && col + 1 < belowCols)  nbs.push([row + 1, col + 1]);
      }
    }

    return nbs;
  }

  // ── main loop ─────────────────────────────────────────────────────────────

  _loop(ts) {
    this.rafId = requestAnimationFrame(this._loop.bind(this));
    const dt   = Math.min((ts - (this.lastTs ?? ts)) / 1000, 1 / 30);
    this.lastTs = ts;
    this._tick(dt);
    this._render();
  }

  _tick(dt) {
    this.msgTimer = Math.max(0, this.msgTimer - dt);
    if (this.msgTimer <= 0) this.message = '';

    this._updateParticles(dt);
    this._updateFalling(dt);
    this._updateAimFromKeys(dt);

    if (this.phase !== 'playing') return;

    if (this.isPushing) {
      this.pushAnim += PUSH_SPEED * dt;
      if (this.pushAnim >= HEX_H) {
        this.pushAnim = 0;
        this.isPushing = false;
        this._addTopRow();
        this._checkGameOver();
      }
    }

    if (this.bullet && !this.isPushing) this._tickBullet(dt);

    if (this.onSnapshot) this.onSnapshot(this._snapshot());
  }

  _updateAimFromKeys(dt) {
    if (!this.keyAim) return;

    const horizontal = (this.keyAim.right ? 1 : 0) - (this.keyAim.left ? 1 : 0);
    let nextAngle = this.aimAngle + horizontal * dt * KEY_AIM_SPEED;

    if (this.keyAim.up) {
      nextAngle += (-Math.PI / 2 - nextAngle) * Math.min(1, dt * KEY_VERTICAL_PULL);
    }

    if (this.keyAim.down) {
      const spreadDirection = nextAngle <= -Math.PI / 2 ? -1 : 1;
      nextAngle += spreadDirection * dt * KEY_VERTICAL_SPREAD;
    }

    this.aimAngle = Math.max(-Math.PI + MIN_ANGLE, Math.min(-MIN_ANGLE, nextAngle));
  }

  // ── push ─────────────────────────────────────────────────────────────────

  _addTopRow() {
    // Trim trailing all-null rows then prepend a filled row
    while (this.grid.length > 0 && this.grid[this.grid.length - 1].every(c => c === null))
      this.grid.pop();

    const maxClr = Math.min(this.level + 2, COLORS.length);
    // New row at index 0 will be even (pushes all existing rows one index down)
    const newRow = Array.from({ length: COLS_EVEN }, () => Math.floor(this._rand() * maxClr));
    this.grid.unshift(newRow);
    while (this.grid.length > MAX_ROWS) this.grid.pop();
  }

  // ── bullet ────────────────────────────────────────────────────────────────

  _tickBullet(dt) {
    const b = this.bullet;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (b.x - R < 0)  { b.x = R;     b.vx =  Math.abs(b.vx); }
    if (b.x + R > W)  { b.x = W - R; b.vx = -Math.abs(b.vx); }

    // Collision with grid bubbles
    for (let r = 0; r < this.grid.length; r++) {
      const gy = this._bubbleY(r);
      if (Math.abs(b.y - gy) > 3 * R) continue;
      for (let c = 0; c < this._colCount(r); c++) {
        if (this.grid[r][c] === null) continue;
        if (Math.hypot(b.x - this._bubbleX(r, c), b.y - gy) < 2 * R - 1) {
          this._snapBullet(r, c);
          return;
        }
      }
    }

    // Hit top wall
    if (b.y - R <= this._bubbleY(0) - HEX_H * 0.6) {
      this._snapBulletToTop();
    }
  }

  _snapBullet(hitRow, hitCol) {
    const b     = this.bullet;
    const color = b.color;
    this.bullet = null;

    // Prefer the empty neighbour closest to the bullet approach position
    const nbs = this._neighbors(hitRow, hitCol);
    let bestR = -1, bestC = -1, bestDist = Infinity;

    for (const [nr, nc] of nbs) {
      if (nr < 0 || nr >= this.grid.length) continue;
      if (nc < 0 || nc >= this._colCount(nr)) continue;
      if (this.grid[nr][nc] !== null) continue;
      const d = Math.hypot(b.x - this._bubbleX(nr, nc), b.y - this._bubbleY(nr));
      if (d < bestDist) { bestDist = d; bestR = nr; bestC = nc; }
    }

    if (bestR === -1) {
      // Fallback: scan a wider area around the hit position
      for (let dr = -2; dr <= 2 && bestR === -1; dr++) {
        const tr = hitRow + dr;
        if (tr < 0 || tr >= this.grid.length) continue;
        for (let c = 0; c < this._colCount(tr); c++) {
          if (this.grid[tr][c] !== null) continue;
          const d = Math.hypot(b.x - this._bubbleX(tr, c), b.y - this._bubbleY(tr));
          if (d < bestDist) { bestDist = d; bestR = tr; bestC = c; }
        }
      }
    }

    if (bestR !== -1) {
      this._placeAt(bestR, bestC, color);
    }
  }

  _snapBulletToTop() {
    const b     = this.bullet;
    const color = b.color;
    this.bullet = null;

    let bestC = 0, bestDist = Infinity;
    for (let c = 0; c < this._colCount(0); c++) {
      if (this.grid[0][c] !== null) continue;
      const d = Math.abs(b.x - this._bubbleX(0, c));
      if (d < bestDist) { bestDist = d; bestC = c; }
    }
    this._placeAt(0, bestC, color);
  }

  _placeAt(row, col, color) {
    if (row < 0 || row >= this.grid.length) return;
    if (col < 0 || col >= this._colCount(row)) return;
    this.grid[row][col] = color;
    this._beep(440 + color * 50, 0.05, 'sine', 0.08);

    // Match check
    const matched = this._findMatch(row, col, color);
    if (matched.length >= MATCH_MIN) {
      this._popBubbles(matched);
      this._dropIsolated();
    }

    // Check clear
    const remaining = this.grid.reduce((n, rw) => n + rw.filter(c => c !== null).length, 0);
    if (remaining === 0) { this._levelUp(); return; }

    // Push down after N shots
    if (this.shotsFired % PUSH_SHOTS === 0) this.isPushing = true;

    this._checkGameOver();
  }

  // ── match / pop ───────────────────────────────────────────────────────────

  _findMatch(startRow, startCol, color) {
    const visited = new Set();
    const result  = [];
    const queue   = [[startRow, startCol]];
    while (queue.length) {
      const [r, c] = queue.shift();
      const key = r + ',' + c;
      if (visited.has(key)) continue;
      visited.add(key);
      if (this.grid[r]?.[c] !== color) continue;
      result.push([r, c]);
      for (const nb of this._neighbors(r, c)) {
        if (!visited.has(nb[0] + ',' + nb[1])) queue.push(nb);
      }
    }
    return result;
  }

  _popBubbles(cells) {
    let pts = 0;
    for (const [r, c] of cells) {
      const col = this.grid[r][c];
      this.grid[r][c] = null;
      this._spawnParticles(this._bubbleX(r, c), this._bubbleY(r), COLORS[col], 9);
      pts += 100;
    }
    const extra = cells.length > MATCH_MIN ? (cells.length - MATCH_MIN) * 60 : 0;
    this.score += pts + extra;
    this._showMsg(`+${pts + extra}!`);
    this._beep(880, 0.09, 'square', 0.14);
    setTimeout(() => this._beep(1100, 0.07, 'square', 0.09), 75);
  }

  _dropIsolated() {
    // BFS from every cell in row 0 to mark ceiling-connected bubbles
    const connected = new Set();
    const queue = [];
    for (let c = 0; c < this._colCount(0); c++) {
      if (this.grid[0][c] !== null) queue.push([0, c]);
    }
    while (queue.length) {
      const [r, c] = queue.shift();
      const key = r + ',' + c;
      if (connected.has(key) || this.grid[r]?.[c] === null) continue;
      connected.add(key);
      for (const nb of this._neighbors(r, c)) queue.push(nb);
    }

    let dropped = 0;
    for (let r = 1; r < this.grid.length; r++) {
      for (let c = 0; c < this._colCount(r); c++) {
        if (this.grid[r][c] === null) continue;
        if (connected.has(r + ',' + c)) continue;
        const col = this.grid[r][c];
        this.grid[r][c] = null;
        this.falling.push({
          x:  this._bubbleX(r, c),
          y:  this._bubbleY(r),
          vx: (this._rand() - 0.5) * 70,
          vy: -90 - this._rand() * 70,
          color: col,
        });
        dropped++;
      }
    }
    if (dropped > 0) {
      const bonus = dropped * 150;
      this.score += bonus;
      this._showMsg(`${dropped} DROPPED! +${bonus}`);
      this._beep(550, 0.1, 'sine', 0.12);
    }
  }

  // ── level up ──────────────────────────────────────────────────────────────

  _levelUp() {
    this.level++;
    const bonus = 3000 * this.level;
    this.score += bonus;
    this.shotsFired  = 0;
    this.pushAnim    = 0;
    this.isPushing   = false;
    this._showMsg(`LEVEL ${this.level}! +${bonus}`);
    this.grid = this._buildGrid(INIT_ROWS + Math.min(this.level - 1, 4));
    this._beep(880, 0.15, 'sine', 0.18);
    setTimeout(() => this._beep(1100, 0.12, 'sine', 0.14), 140);
    setTimeout(() => this._beep(1320, 0.18, 'sine', 0.10), 300);
  }

  // ── game over ─────────────────────────────────────────────────────────────

  _checkGameOver() {
    for (let r = 0; r < this.grid.length; r++) {
      const gy = this._bubbleY(r);
      for (let c = 0; c < this._colCount(r); c++) {
        if (this.grid[r][c] !== null && gy > GAMEOVER_Y) {
          this.phase = 'gameover';
          this._saveHiScore();
          this._beep(220, 0.35, 'sine', 0.22);
          setTimeout(() => this._beep(165, 0.4, 'sine', 0.14), 280);
          return;
        }
      }
    }
  }

  // ── falling bubbles ───────────────────────────────────────────────────────

  _updateFalling(dt) {
    this.falling = this.falling.filter(f => {
      f.vy += 900 * dt;
      f.x  += f.vx * dt;
      f.y  += f.vy * dt;
      return f.y < H + 50;
    });
  }

  // ── particles ─────────────────────────────────────────────────────────────

  _spawnParticles(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a   = Math.random() * Math.PI * 2;
      const spd = 50 + Math.random() * 180;
      const life = 0.38 + Math.random() * 0.4;
      this.particles.push({ x, y, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd, color, life, maxLife: life, r: 2 + Math.random()*3 });
    }
  }

  _updateParticles(dt) {
    this.particles = this.particles.filter(p => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 320 * dt; p.life -= dt;
      return p.life > 0;
    });
  }

  // ── messaging / scoring ───────────────────────────────────────────────────

  _showMsg(msg) { this.message = msg; this.msgTimer = 2.0; }

  // ── storage ───────────────────────────────────────────────────────────────

  _loadHiScore() {
    try { this._hiScore = parseInt(localStorage.getItem(SAVE_KEY) ?? '0', 10) || 0; } catch { /**/ }
  }
  _saveHiScore() {
    try { if (this.score > this._hiScore) { this._hiScore = this.score; localStorage.setItem(SAVE_KEY, String(this._hiScore)); } } catch { /**/ }
  }

  // ── audio ─────────────────────────────────────────────────────────────────

  _getAC() {
    if (!this._audioCtx) try { this._audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { /**/ }
    return this._audioCtx;
  }

  _beep(freq, dur, type = 'sine', vol = 0.1) {
    const ac = this._getAC();
    if (!ac) return;
    try {
      const osc = ac.createOscillator(), gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = type; osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      osc.start(); osc.stop(ac.currentTime + dur + 0.01);
    } catch { /**/ }
  }

  // ── snapshot (for QA bridge) ──────────────────────────────────────────────

  _snapshot() {
    return {
      phase: this.phase, score: this.score, hiScore: this._hiScore, level: this.level,
      bullet: this.bullet ? { ...this.bullet } : null,
      currentColor: this.currentColor, nextColor: this.nextColor,
      shotsFired: this.shotsFired,
    };
  }

  _render() { /* patched in index.jsx */ }
}
