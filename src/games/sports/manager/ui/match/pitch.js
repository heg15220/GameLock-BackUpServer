/**
 * Broadcast-style pitch renderer.
 *
 * World coordinates are metres: x along the 105 m length (home attacks
 * towards x = 105), y across the 68 m width (0 = far touchline). The camera
 * looks from the main stand: the far side is narrower, the near side wider.
 * On portrait screens the pitch turns vertical (home attacks upwards).
 *
 * The director (director.js) decides where players and ball should be; this
 * file only moves bodies smoothly towards those targets and paints them.
 */

const LENGTH = 105;
const WIDTH = 68;
const GOAL_HALF = 3.66;
const GOAL_HEIGHT = 2.44;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * Three grounds around the same pitch. The big one is the bowl the
 * national teams and the best clubs play in; a mid-sized club has a lower
 * stand with a roof line; a humble club plays in front of a few rows of
 * terracing, gaps in the seats, a fence, and houses and trees behind.
 * Only the stands change: the field is drawn exactly the same.
 */
const STADIUMS = {
  large: { stand: 1, side: 1, empty: 0, glow: 0.22, back: null },
  medium: { stand: 0.62, side: 0.7, empty: 0.16, glow: 0.17, back: 'roof' },
  small: { stand: 0.34, side: 0.4, empty: 0.42, glow: 0.11, back: 'town' },
};

/** Which ground a match is played in, from the home side's stadium capacity. */
export function stadiumFor({ national = false, neutral = false, capacity = 0 } = {}) {
  if (national || neutral || capacity >= 52000) return 'large';
  return capacity >= 20000 ? 'medium' : 'small';
}
const lerp = (a, b, t) => a + (b - a) * t;

function hexToRgb(hex) {
  const v = String(hex || '#888888').replace('#', '');
  const n = parseInt(v.length === 3 ? v.split('').map((c) => c + c).join('') : v.padEnd(6, '0').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const luminance = (hex) => { const [r, g, b] = hexToRgb(hex); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
const colorDistance = (a, b) => { const [r1, g1, b1] = hexToRgb(a); const [r2, g2, b2] = hexToRgb(b); return Math.hypot(r1 - r2, g1 - g2, b1 - b2); };
const shade = (hex, f) => { const [r, g, b] = hexToRgb(hex); const s = (c) => clamp(Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f), 0, 255); return `rgb(${s(r)},${s(g)},${s(b)})`; };

/** Pick kits that do not clash. */
export function chooseKits(home, away) {
  const homeMain = home.kit?.[0] || home.color || '#d22';
  let awayMain = away.kit?.[0] || away.color || '#22d';
  if (colorDistance(homeMain, awayMain) < 120) awayMain = away.kit?.[1] || (luminance(homeMain) > 0.55 ? '#1b1f2a' : '#f4f4f0');
  if (colorDistance(homeMain, awayMain) < 120) awayMain = luminance(homeMain) > 0.55 ? '#1b1f2a' : '#f4f4f0';
  const second = (team, main) => {
    const list = (team.kit || []).filter((c) => c && colorDistance(c, main) > 60);
    return list[0] || (luminance(main) > 0.55 ? '#1b1f2a' : '#f4f4f0');
  };
  const awayIsAlt = awayMain !== (away.kit?.[0] || away.color);
  return {
    home: { main: homeMain, shorts: second(home, homeMain), socks: home.kit?.[2] || homeMain, text: luminance(homeMain) > 0.6 ? '#101418' : '#ffffff', keeper: '#c6f24a' },
    away: { main: awayMain, shorts: awayIsAlt ? (luminance(awayMain) > 0.55 ? '#1b1f2a' : '#f4f4f0') : second(away, awayMain), socks: awayIsAlt ? awayMain : (away.kit?.[2] || awayMain), text: luminance(awayMain) > 0.6 ? '#101418' : '#ffffff', keeper: '#ff8a3d' },
    ref: { main: '#15171c', shorts: '#15171c', socks: '#15171c', text: '#e9ff4a', keeper: '#15171c' },
  };
}

const shortName = (name) => {
  const parts = String(name || '').trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(-1)[0] : parts[0] || '';
};

export class PitchRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.bodies = new Map();
    this.ball = { x: 52.5, y: 34, z: 0, vx: 0, vy: 0 };
    this.trail = [];
    this.netBulge = { home: 0, away: 0, y: 34 };
    this.particles = [];
    this.flash = 0;
    this.shake = 0;
    this.labels = [];
    this.kits = null;
    this.vertical = false;
    this.time = 0;
    this.boardOffset = 0;
    this.boardTexts = ['GAMELOCK', 'MODO MÁNAGER'];
    this.stadium = 'large';
    this.resize();
  }

  setTeams(match, kits, boardTexts) {
    this.kits = kits;
    if (boardTexts) this.boardTexts = boardTexts;
    for (const p of Object.values(match.players)) {
      if (!this.bodies.has(p.id)) this.bodies.set(p.id, { id: p.id, x: p.side === 'home' ? 30 : 75, y: 34, tx: 30, ty: 34, side: p.side, number: p.number, name: shortName(p.name), keeper: p.pos === 'GK', on: false, phase: Math.random() * 10, down: 0, speed: 0 });
      else this.bodies.get(p.id).keeper = p.slot === 'GK' || (p.pos === 'GK' && !p.slot);
    }
    if (!this.bodies.has('__ref')) this.bodies.set('__ref', { id: '__ref', x: 45, y: 40, tx: 45, ty: 40, side: 'ref', number: '', name: '', keeper: false, on: false, phase: 0, down: 0, speed: 0, official: true });
    for (const [id, y] of [['__ar1', -1.6], ['__ar2', WIDTH + 1.6]]) {
      if (!this.bodies.has(id)) this.bodies.set(id, { id, x: id === '__ar1' ? 30 : 75, y, tx: 30, ty: y, side: 'ref', number: '', name: '', keeper: false, on: true, phase: 0, down: 0, speed: 0, official: true, linesman: true });
    }
  }

  setStadium(tier) {
    if (!STADIUMS[tier] || tier === this.stadium) return;
    this.stadium = tier;
    this.crowd = null;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(10, rect.width);
    this.h = Math.max(10, rect.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.vertical = this.h > this.w * 1.08;
    this.layout();
    this.crowd = null;
    this.grass = null;
  }

  /** Field frame on screen. */
  layout() {
    const { w, h } = this;
    if (!this.vertical) {
      const standH = h * 0.2;
      this.field = { top: standH, bottom: h - h * 0.05, nearW: w * 0.9, farW: w * 0.7, cx: w / 2 };
    } else {
      const pad = h * 0.06;
      this.field = { top: pad, bottom: h - pad * 0.6, nearW: w * 0.86, farW: w * 0.68, cx: w / 2 };
    }
  }

  /** World → screen. Returns {x, y, s} where s is a scale for sizes. */
  project(x, y, z = 0) {
    const f = this.field;
    let along;
    let across;
    if (!this.vertical) { along = x / LENGTH; across = y / WIDTH; } else { along = 1 - y / WIDTH; across = 1 - x / LENGTH; }
    // `across` is depth for the horizontal camera; for vertical, `across` runs along the screen height.
    if (!this.vertical) {
      const depth = across; // 0 far, 1 near
      const rowW = lerp(f.farW, f.nearW, depth);
      const sy = lerp(f.top, f.bottom, depth > 0 ? Math.pow(depth, 0.94) : depth);
      const sx = f.cx + (along - 0.5) * rowW;
      const s = rowW / LENGTH;
      return { x: sx, y: sy - z * s * 1.15, s, groundY: sy };
    }
    const depth = across; // 0 top (home attacks up), 1 bottom
    const rowW = lerp(f.farW, f.nearW, depth);
    const sy = lerp(f.top, f.bottom, depth > 0 ? Math.pow(depth, 0.97) : depth);
    const sx = f.cx + (along - 0.5) * rowW;
    const s = rowW / WIDTH;
    return { x: sx, y: sy - z * s * 1.05, s, groundY: sy };
  }

  /* ── Simulation of bodies ── */

  setTargets(targets, ball, dtMs) {
    const jump = this.snapBodies;
    this.snapBodies = false;
    for (const [id, target] of Object.entries(targets)) {
      const body = this.bodies.get(id);
      if (!body) continue;
      body.tx = target.x; body.ty = target.y;
      // In the dark of a cut the picture changes: everyone is already where the play has moved.
      if (jump) { body.x = target.x; body.y = target.y; }
      body.on = true;
      body.down = target.down ? Math.min(1, body.down + dtMs / 300) : Math.max(0, body.down - dtMs / 500);
      body.dive = target.dive || 0;
      body.sprint = Boolean(target.sprint);
    }
    for (const body of this.bodies.values()) if (!targets[body.id] && !body.linesman) body.on = false;
    if (ball) {
      this.ballTarget = ball;
      // Assistant referees run their half of the touchline level with play.
      const ar1 = this.bodies.get('__ar1'); const ar2 = this.bodies.get('__ar2');
      if (ar1) { ar1.tx = clamp(ball.x, 52.5, LENGTH); ar1.ty = -1.6; }
      if (ar2) { ar2.tx = clamp(ball.x, 0, 52.5); ar2.ty = WIDTH + 1.6; }
    }
  }

  step(dtMs, speed = 1) {
    const dt = Math.min(0.05, dtMs / 1000) * speed;
    this.time += dtMs / 1000;
    for (const body of this.bodies.values()) {
      if (!body.on) continue;
      const dx = body.tx - body.x;
      const dy = body.ty - body.y;
      const dist = Math.hypot(dx, dy);
      // A footballer at full sprint covers 7-8 m/s; a diving keeper is a little quicker over a metre or two.
      const max = (body.dive ? 10 : body.sprint ? 9.6 : 7.6) * dt;
      const move = Math.min(dist, max, dist * 0.14 + max * 0.25);
      if (dist > 0.01) { body.x += (dx / dist) * move; body.y += (dy / dist) * move; }
      body.speed = lerp(body.speed, move / Math.max(dt, 0.001), 0.2);
      body.phase += body.speed * dt * 1.4;
    }
    // Bodies take up space: two players never stand on the same spot.
    const live = [...this.bodies.values()].filter((b) => b.on && !b.linesman);
    for (let i = 0; i < live.length; i += 1) {
      for (let j = i + 1; j < live.length; j += 1) {
        const p = live[i]; const q = live[j];
        const dx = q.x - p.x; const dy = q.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d >= 0.75 || p.down > 0.5 || q.down > 0.5) continue;
        const push = (0.75 - Math.max(d, 0.01)) / 2;
        const ux = d > 0.01 ? dx / d : 1; const uy = d > 0.01 ? dy / d : 0;
        p.x -= ux * push; p.y -= uy * push; q.x += ux * push; q.y += uy * push;
      }
    }
    if (this.ballTarget) {
      const b = this.ball;
      const t = this.ballTarget;
      const k = t.snap ? 1 : clamp(dt * (t.fast ? 11 : 6.5), 0, 1);
      b.x = lerp(b.x, t.x, k); b.y = lerp(b.y, t.y, k); b.z = lerp(b.z, t.z || 0, k);
      if (t.trail) { this.trail.push({ x: b.x, y: b.y, z: b.z, a: 1 }); if (this.trail.length > 14) this.trail.shift(); }
    }
    for (const point of this.trail) point.a -= dt * 3.2;
    this.trail = this.trail.filter((p) => p.a > 0);
    this.netBulge.home = Math.max(0, this.netBulge.home - dt * 1.4);
    this.netBulge.away = Math.max(0, this.netBulge.away - dt * 1.4);
    this.flash = Math.max(0, this.flash - dt * 2.2);
    this.fade = Math.max(0, (this.fade || 0) - dtMs / 450);
    this.shake = Math.max(0, this.shake - dt * 3);
    for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.life -= dt; p.rot += p.vr * dt; }
    this.particles = this.particles.filter((p) => p.life > 0);
    this.labels = this.labels.filter((l) => (l.until -= dtMs) > 0);
    if (this.subs && (this.subs.until -= dtMs) <= 0) this.subs = null;
    this.boardOffset = (this.boardOffset + dt * 40) % 10000;
  }

  goalBurst(side, color) {
    const goalX = side === 'home' ? LENGTH : 0;
    this.netBulge[side === 'home' ? 'away' : 'home'] = 1;
    this.netBulge.y = this.ball.y;
    this.flash = 1;
    this.shake = 1;
    const at = this.project(goalX, this.ball.y, 1);
    for (let i = 0; i < 90; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const v = 140 + Math.random() * 360;
      this.particles.push({ x: at.x, y: at.y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - 260, life: 1.4 + Math.random() * 0.8, color: i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? color : '#ffd34d', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, size: 3 + Math.random() * 4 });
    }
  }

  /** The fourth official's board and the names, for the length of a substitution. */
  showSubs(list, ms) {
    this.subs = { list, until: ms, total: ms };
  }

  /** Start a cut transition (see draw). */
  cut() {
    this.fade = 1;
  }

  label(text, x, y, tone = 'info', ms = 1400) {
    this.labels.push({ text, x, y, tone, until: ms, total: ms });
  }

  /* ── Painting ── */

  draw() {
    const ctx = this.ctx;
    const { w, h } = this;
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake * 8, (Math.random() - 0.5) * this.shake * 6);
    this.drawStadium(ctx, w, h);
    this.drawGrass(ctx);
    this.drawLines(ctx);
    this.drawBoards(ctx);
    const goalFar = this.vertical ? 'home' : null;
    void goalFar;
    this.drawGoal(ctx, 0, 'home');
    this.drawGoal(ctx, LENGTH, 'away');
    // Painter's order: far bodies first.
    const order = [...this.bodies.values()].filter((b) => b.on).sort((a, b) => this.project(a.x, a.y).y - this.project(b.x, b.y).y);
    for (const body of order) this.drawShadow(ctx, body);
    this.drawBallShadow(ctx);
    for (const body of order) this.drawBody(ctx, body);
    this.drawTrail(ctx);
    this.drawBall(ctx);
    this.drawLabels(ctx);
    this.drawSubs(ctx);
    ctx.restore();
    for (const p of this.particles) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = clamp(p.life, 0, 1); ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore();
    }
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.35})`; ctx.fillRect(0, 0, w, h); }
    // A broadcast cut: a brief dip to dark while the play jumps ahead.
    if (this.fade > 0) { ctx.fillStyle = `rgba(3,7,11,${Math.sin(this.fade * Math.PI) * 0.55})`; ctx.fillRect(0, 0, w, h); }
  }

  drawStadium(ctx, w, h) {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#04080d'); sky.addColorStop(0.35, '#0a1520'); sky.addColorStop(1, '#060b10');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    if (!this.crowd) this.crowd = this.makeCrowd(w, h);
    ctx.drawImage(this.crowd, 0, 0, w, h);
    // Crowd shimmer: a few camera flashes.
    for (let i = 0; i < 4; i += 1) {
      const seed = Math.floor(this.time * 3 + i * 7.3);
      const fx = ((seed * 9301 + 49297) % 233280) / 233280 * w;
      const fy = ((seed * 4513 + 1297) % 2333) / 2333 * (this.field.top - 6);
      if ((seed % 5) === 0) { ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(fx, fy, 1.4, 0, Math.PI * 2); ctx.fill(); }
    }
    // Floodlight glow: a big ground's roof lights, or the pylons of a small one.
    const st = STADIUMS[this.stadium] || STADIUMS.large;
    const lampY = this.vertical ? 0 : this.field.top * (1 - st.stand) * 0.55;
    for (const x of [w * 0.08, w * 0.92]) {
      const g = ctx.createRadialGradient(x, lampY, 0, x, lampY, w * (0.2 + st.glow));
      g.addColorStop(0, `rgba(210,235,255,${st.glow})`); g.addColorStop(1, 'rgba(210,235,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
  }

  makeCrowd(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.round(w); c.height = Math.round(h);
    const g = c.getContext('2d');
    const st = STADIUMS[this.stadium] || STADIUMS.large;
    const top = this.field.top;
    // The stand only fills the lower part of the band in smaller grounds.
    const standTop = top * (1 - st.stand);
    const palette = ['#2b3a4a', '#3c4b5c', '#1d2833', '#55606e', '#7d2f35', '#2d5b8a', '#c9c3b5', '#8a6d3a'];
    if (this.kits) palette.push(this.kits.home.main, this.kits.home.main, this.kits.away.main);
    const seat = this.kits ? shade(this.kits.home.main, -0.55) : '#24323f';
    if (st.back === 'town') this.paintTown(g, w, standTop);
    if (st.back === 'roof') this.paintRoof(g, w, standTop);
    if (st.stand < 1) {
      // The back wall of a modest stand.
      g.fillStyle = '#141c24'; g.fillRect(0, standTop, w, top - standTop);
    }
    const rows = Math.max(this.vertical ? 3 : 4, Math.floor((top - standTop) / 5));
    for (let r = 0; r < rows; r += 1) {
      const y = standTop + 3 + r * (top - standTop - 6) / rows;
      for (let x = 2; x < w; x += 4 + (r % 3)) {
        const empty = Math.random() < st.empty;
        g.fillStyle = empty ? seat : palette[Math.floor(Math.random() * palette.length)];
        g.globalAlpha = empty ? 0.5 : 0.55 + Math.random() * 0.4;
        g.fillRect(x + Math.random() * 2, y + Math.random() * 1.5, 2.4, empty ? 2 : 3);
      }
    }
    g.globalAlpha = 1;
    const fade = g.createLinearGradient(0, standTop, 0, top);
    fade.addColorStop(0, `rgba(4,8,13,${st.stand < 1 ? 0.45 : 0.75})`); fade.addColorStop(1, 'rgba(4,8,13,0)');
    g.fillStyle = fade; g.fillRect(0, standTop, w, top - standTop);
    if (st.back === 'town') {
      // A low fence in front of the terrace.
      g.strokeStyle = 'rgba(190,200,205,0.35)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, top - 2); g.lineTo(w, top - 2); g.stroke();
      for (let x = 0; x < w; x += 9) { g.beginPath(); g.moveTo(x, top - 7); g.lineTo(x, top - 2); g.stroke(); }
    }
    // Side stands on the vertical layout.
    if (this.vertical) {
      for (let x = 0; x < w * 0.06 * st.side; x += 4) for (let y = top; y < h; y += 4) {
        const empty = Math.random() < st.empty;
        g.fillStyle = empty ? seat : palette[Math.floor(Math.random() * palette.length)];
        g.globalAlpha = 0.35; g.fillRect(x, y, 2.4, 3); g.fillRect(w - x - 3, y, 2.4, 3);
      }
      g.globalAlpha = 1;
    }
    return c;
  }

  /** Behind a humble ground: rooftops, trees and two floodlight pylons against the night. */
  paintTown(g, w, ground) {
    if (ground < 6) return;
    let x = 0;
    while (x < w) {
      const roofW = 22 + Math.random() * 40;
      const roofH = ground * (0.25 + Math.random() * 0.45);
      g.fillStyle = Math.random() < 0.5 ? '#0b1219' : '#0e161e';
      g.fillRect(x, ground - roofH, roofW, roofH);
      g.beginPath(); g.moveTo(x - 2, ground - roofH); g.lineTo(x + roofW / 2, ground - roofH - roofW * 0.25); g.lineTo(x + roofW + 2, ground - roofH); g.fill();
      if (Math.random() < 0.6) { g.fillStyle = 'rgba(255,214,140,0.55)'; g.fillRect(x + roofW * 0.3, ground - roofH * 0.6, 3, 3); }
      x += roofW + Math.random() * 10;
      if (Math.random() < 0.35) {
        g.fillStyle = '#08100c';
        g.beginPath(); g.arc(x, ground - 8, 8 + Math.random() * 7, 0, Math.PI * 2); g.fill();
        x += 12;
      }
    }
    for (const px of [w * 0.08, w * 0.92]) {
      g.strokeStyle = '#3a4650'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(px, ground + 2); g.lineTo(px, Math.max(4, ground * 0.18)); g.stroke();
      g.fillStyle = 'rgba(235,245,255,0.9)'; g.fillRect(px - 7, Math.max(2, ground * 0.18) - 4, 14, 5);
    }
  }

  /** Behind a mid-sized stand: its roof edge with a strip of lights. */
  paintRoof(g, w, ground) {
    if (ground < 4) return;
    g.fillStyle = '#0c141c'; g.fillRect(0, ground - 6, w, 6);
    g.fillStyle = 'rgba(220,235,255,0.55)';
    for (let x = 6; x < w; x += 26) g.fillRect(x, ground - 3, 10, 2);
  }

  fieldPath(ctx, inset = 0) {
    const a = this.project(0 - inset, 0 - inset);
    const b = this.project(LENGTH + inset, 0 - inset);
    const c = this.project(LENGTH + inset, WIDTH + inset);
    const d = this.project(0 - inset, WIDTH + inset);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath();
  }

  drawGrass(ctx) {
    // Surround (run-off) then the mown stripes.
    ctx.fillStyle = '#123d22';
    this.fieldPath(ctx, 5); ctx.fill();
    const stripes = 18;
    for (let i = 0; i < stripes; i += 1) {
      const x0 = (i / stripes) * LENGTH;
      const x1 = ((i + 1) / stripes) * LENGTH;
      const p = [this.project(x0, 0), this.project(x1, 0), this.project(x1, WIDTH), this.project(x0, WIDTH)];
      ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (const q of p.slice(1)) ctx.lineTo(q.x, q.y); ctx.closePath();
      ctx.fillStyle = i % 2 ? '#2f7a3c' : '#2a6f37';
      ctx.fill();
    }
    // Vignette towards the far side and the light pools.
    const f = this.field;
    const g = ctx.createLinearGradient(0, f.top, 0, f.bottom);
    g.addColorStop(0, 'rgba(0,0,0,0.28)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.12)');
    this.fieldPath(ctx, 5); ctx.fillStyle = g; ctx.fill();
    const centre = this.project(52.5, 34);
    const pool = ctx.createRadialGradient(centre.x, centre.y, 0, centre.x, centre.y, this.w * 0.55);
    pool.addColorStop(0, 'rgba(255,255,230,0.08)'); pool.addColorStop(1, 'rgba(255,255,230,0)');
    ctx.fillStyle = pool; this.fieldPath(ctx, 5); ctx.fill();
  }

  line(ctx, points, close = false) {
    ctx.beginPath();
    points.forEach(([x, y], i) => { const p = this.project(x, y); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
    if (close) ctx.closePath();
    ctx.stroke();
  }

  arc(ctx, cx, cy, r, a0, a1, steps = 40) {
    const points = [];
    for (let i = 0; i <= steps; i += 1) { const a = a0 + (a1 - a0) * (i / steps); points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    this.line(ctx, points);
  }

  drawLines(ctx) {
    ctx.strokeStyle = 'rgba(245,250,240,0.86)';
    ctx.lineWidth = Math.max(1, this.project(52.5, 34).s * 0.14);
    ctx.lineJoin = 'round';
    this.line(ctx, [[0, 0], [LENGTH, 0], [LENGTH, WIDTH], [0, WIDTH]], true);
    this.line(ctx, [[52.5, 0], [52.5, WIDTH]]);
    this.arc(ctx, 52.5, 34, 9.15, 0, Math.PI * 2, 60);
    for (const side of [0, 1]) {
      const x = side ? LENGTH : 0;
      const dir = side ? -1 : 1;
      this.line(ctx, [[x, 13.84], [x + dir * 16.5, 13.84], [x + dir * 16.5, 54.16], [x, 54.16]]);
      this.line(ctx, [[x, 24.84], [x + dir * 5.5, 24.84], [x + dir * 5.5, 43.16], [x, 43.16]]);
      const a = side ? Math.PI - 0.925 : -0.925;
      this.arc(ctx, x + dir * 11, 34, 9.15, a, a + 1.85, 24);
      for (const cy of [0, WIDTH]) this.arc(ctx, x, cy, 1, side ? (cy ? Math.PI : Math.PI / 2) : (cy ? -Math.PI / 2 : 0), side ? (cy ? Math.PI * 1.5 : Math.PI) : (cy ? 0 : Math.PI / 2), 8);
      const spot = this.project(x + dir * 11, 34);
      ctx.fillStyle = 'rgba(245,250,240,0.9)'; ctx.beginPath(); ctx.arc(spot.x, spot.y, Math.max(1, spot.s * 0.22), 0, Math.PI * 2); ctx.fill();
    }
    const c = this.project(52.5, 34);
    ctx.beginPath(); ctx.arc(c.x, c.y, Math.max(1.2, c.s * 0.25), 0, Math.PI * 2); ctx.fill();
  }

  drawBoards(ctx) {
    // LED boards along the far touchline (or the top goal line on vertical screens).
    const segments = 12;
    const texts = this.boardTexts;
    for (let i = 0; i < segments; i += 1) {
      const x0 = -3 + (i / segments) * (LENGTH + 6);
      const x1 = -3 + ((i + 1) / segments) * (LENGTH + 6) - 0.6;
      const yb = this.vertical ? null : -3.2;
      if (this.vertical) continue;
      const a = this.project(x0, yb, 0);
      const b = this.project(x1, yb, 0);
      const height = 0.9 * a.s * 1.15 * 1.4;
      const grad = ctx.createLinearGradient(a.x, a.y - height, a.x, a.y);
      const hue = (i * 37 + this.boardOffset * 2) % 360;
      grad.addColorStop(0, `hsl(${hue},70%,18%)`); grad.addColorStop(1, `hsl(${hue},70%,10%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(a.x, a.y - height, b.x - a.x, height);
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      const text = texts[(i + Math.floor(this.boardOffset / 120)) % texts.length];
      let size = Math.max(6, height * 0.55);
      ctx.font = `700 ${size}px "Barlow Condensed", "Outfit", sans-serif`;
      const room = (b.x - a.x) * 0.9;
      const width = ctx.measureText(text).width;
      if (width > room) { size = Math.max(4, size * room / width); ctx.font = `700 ${size}px "Barlow Condensed", "Outfit", sans-serif`; }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, (a.x + b.x) / 2, a.y - height / 2);
    }
  }

  drawGoal(ctx, x, side) {
    const dir = x === 0 ? -1 : 1;
    const depth = 2;
    const bulge = this.netBulge[side];
    const by = this.netBulge.y;
    const post = (y, z) => this.project(x, y, z);
    const back = (y, z) => { const near = Math.max(0, 1 - Math.abs(y - by) / 4.5); return this.project(x + dir * (depth + bulge * near * 1.2), y, z * (1 - 0.25)); };
    ctx.strokeStyle = 'rgba(235,240,245,0.35)';
    ctx.lineWidth = 0.7;
    for (let i = 0; i <= 8; i += 1) {
      const y = 34 - GOAL_HALF + (i / 8) * GOAL_HALF * 2;
      const a = post(y, GOAL_HEIGHT); const b = back(y, GOAL_HEIGHT); const c = back(y, 0);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.stroke();
    }
    for (let j = 0; j <= 4; j += 1) {
      const z = (j / 4) * GOAL_HEIGHT;
      ctx.beginPath();
      for (let i = 0; i <= 8; i += 1) { const y = 34 - GOAL_HALF + (i / 8) * GOAL_HALF * 2; const p = back(y, z); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
      ctx.stroke();
    }
    ctx.strokeStyle = '#f5f7f8';
    ctx.lineWidth = Math.max(1.5, this.project(x, 34).s * 0.22);
    const l0 = post(34 - GOAL_HALF, 0); const l1 = post(34 - GOAL_HALF, GOAL_HEIGHT); const r1 = post(34 + GOAL_HALF, GOAL_HEIGHT); const r0 = post(34 + GOAL_HALF, 0);
    ctx.beginPath(); ctx.moveTo(l0.x, l0.y); ctx.lineTo(l1.x, l1.y); ctx.lineTo(r1.x, r1.y); ctx.lineTo(r0.x, r0.y); ctx.stroke();
  }

  drawShadow(ctx, body) {
    const p = this.project(body.x, body.y);
    const r = Math.max(2.8, p.s * 0.98);
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath(); ctx.ellipse(p.x + r * 0.5, p.y + r * 0.15, r * 1.25, r * 0.42, -0.2, 0, Math.PI * 2); ctx.fill();
  }

  drawBody(ctx, body) {
    const kit = this.kits?.[body.side] || (body.side === 'ref' ? { main: '#15171c', shorts: '#15171c', socks: '#15171c', text: '#e9ff4a', keeper: '#15171c' } : null);
    if (!kit) return;
    const p = this.project(body.x, body.y);
    const scale = Math.max(3, p.s * 1.08);
    const bob = Math.abs(Math.sin(body.phase)) * scale * 0.25 * clamp(body.speed / 6, 0, 1);
    const main = body.keeper ? kit.keeper : kit.main;
    const shorts = body.keeper ? shade(kit.keeper, -0.5) : kit.shorts || shade(main, -0.45);
    const socks = body.keeper ? kit.keeper : kit.socks || main;
    const height = scale * 3.1;
    ctx.save();
    ctx.translate(p.x, p.y - bob);
    if (body.down > 0) ctx.rotate(body.down * 1.35 * (body.side === 'home' ? 1 : -1));
    if (body.dive) ctx.rotate(body.dive * 1.1);
    // Legs (alternate with the stride).
    const stride = Math.sin(body.phase * 2) * scale * 0.45 * clamp(body.speed / 5, 0, 1);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#d9a982'; ctx.lineWidth = Math.max(1, scale * 0.34);
    ctx.beginPath(); ctx.moveTo(-scale * 0.25, -height * 0.35); ctx.lineTo(-scale * 0.25 + stride * 0.5, -height * 0.18);
    ctx.moveTo(scale * 0.25, -height * 0.35); ctx.lineTo(scale * 0.25 - stride * 0.5, -height * 0.18); ctx.stroke();
    ctx.strokeStyle = socks; ctx.lineWidth = Math.max(1, scale * 0.38);
    ctx.beginPath(); ctx.moveTo(-scale * 0.25 + stride * 0.5, -height * 0.18); ctx.lineTo(-scale * 0.25 + stride, 0);
    ctx.moveTo(scale * 0.25 - stride * 0.5, -height * 0.18); ctx.lineTo(scale * 0.25 - stride, 0); ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.fillRect(-scale * 0.25 + stride - scale * 0.2, -scale * 0.12, scale * 0.42, scale * 0.16);
    ctx.fillRect(scale * 0.25 - stride - scale * 0.2, -scale * 0.12, scale * 0.42, scale * 0.16);
    // Shorts and shirt.
    ctx.fillStyle = shorts;
    ctx.fillRect(-scale * 0.55, -height * 0.48, scale * 1.1, height * 0.16);
    const torso = ctx.createLinearGradient(-scale, -height, scale, -height * 0.4);
    torso.addColorStop(0, shade(main, 0.18)); torso.addColorStop(1, shade(main, -0.22));
    ctx.fillStyle = torso;
    ctx.beginPath(); ctx.roundRect?.(-scale * 0.72, -height * 0.9, scale * 1.44, height * 0.46, scale * 0.35);
    if (!ctx.roundRect) ctx.rect(-scale * 0.72, -height * 0.9, scale * 1.44, height * 0.46);
    ctx.fill();
    // Head.
    ctx.fillStyle = '#e2b48f';
    ctx.beginPath(); ctx.arc(0, -height * 1.02, scale * 0.42, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1d14';
    ctx.beginPath(); ctx.arc(0, -height * 1.08, scale * 0.42, Math.PI, Math.PI * 2); ctx.fill();
    // Number.
    if (scale > 3.4) {
      ctx.fillStyle = body.keeper ? '#111' : kit.text;
      ctx.font = `800 ${Math.round(scale * 0.8)}px "Barlow Condensed", "Outfit", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(body.number ?? ''), 0, -height * 0.67);
    }
    ctx.restore();
    if (body.highlight === 'event' && body.name && scale > 2.6) {
      ctx.save();
      ctx.font = `700 ${Math.max(9, Math.min(12, scale * 1.5))}px "Barlow Condensed", "Outfit", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      const label = body.name;
      const w = ctx.measureText(label).width + 8;
      const y = p.y - height * 1.45 - bob;
      ctx.fillStyle = 'rgba(6,12,18,0.72)';
      ctx.beginPath(); ctx.roundRect?.(p.x - w / 2, y - 13, w, 14, 4); if (!ctx.roundRect) ctx.rect(p.x - w / 2, y - 13, w, 14); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(label, p.x, y);
      ctx.restore();
    }
    if (body.highlight) {
      ctx.strokeStyle = body.highlight === 'user' ? 'rgba(46,230,176,0.9)' : 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, scale * 1.4, scale * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }

  drawBallShadow(ctx) {
    const b = this.ball;
    const p = this.project(b.x, b.y, 0);
    const r = Math.max(1.4, p.s * 0.3) * (1 + b.z * 0.05);
    ctx.fillStyle = `rgba(0,0,0,${0.35 - Math.min(0.25, b.z * 0.02)})`;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.3, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  }

  drawTrail(ctx) {
    for (const point of this.trail) {
      const p = this.project(point.x, point.y, point.z);
      ctx.fillStyle = `rgba(255,255,255,${point.a * 0.35})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, p.s * 0.28) * point.a, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawBall(ctx) {
    const b = this.ball;
    const p = this.project(b.x, b.y, b.z + 0.22);
    const r = Math.max(2.6, p.s * 0.42);
    const g = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.35, r * 0.1, p.x, p.y, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c9d0d6');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b2733';
    ctx.beginPath(); ctx.arc(p.x + Math.cos(this.time * 9) * r * 0.25, p.y + Math.sin(this.time * 9) * r * 0.25, r * 0.32, 0, Math.PI * 2); ctx.fill();
  }

  drawSubs(ctx) {
    if (!this.subs) return;
    const { list, until, total } = this.subs;
    const alpha = Math.min(1, (total - until) / 250, until / 300);
    ctx.save();
    ctx.globalAlpha = alpha;
    // The board, held up over the halfway line on the near touchline.
    const at = this.project(LENGTH / 2, WIDTH + 1.4, 3.2);
    const rowH = 22;
    const w = 54;
    const h = rowH * list.length + 8;
    ctx.fillStyle = 'rgba(10,12,14,0.92)';
    ctx.fillRect(at.x - w / 2, at.y - h, w, h);
    ctx.font = '800 16px "Barlow Condensed", "Outfit", sans-serif';
    ctx.textBaseline = 'middle';
    list.forEach((sub, k) => {
      const y = at.y - h + 4 + rowH * k + rowH / 2;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff4d4d'; ctx.fillText(String(sub.out?.number ?? '–'), at.x - 13, y);
      ctx.fillStyle = '#3ddc84'; ctx.fillText(String(sub.on?.number ?? '–'), at.x + 13, y);
    });
    // Who comes on and who goes off, by name.
    const lines = list.map((sub) => [sub.on?.name || '', sub.out?.name || '']);
    const boxW = Math.min(this.w - 24, 300);
    const lineH = 18;
    const boxH = lines.length * lineH * 2 + 14;
    const bx = Math.min(Math.max(12, at.x - boxW / 2), this.w - boxW - 12);
    const by = Math.max(8, at.y - h - boxH - 10);
    ctx.fillStyle = 'rgba(6,12,18,0.85)';
    ctx.beginPath(); ctx.roundRect?.(bx, by, boxW, boxH, 10); if (!ctx.roundRect) ctx.rect(bx, by, boxW, boxH); ctx.fill();
    ctx.textAlign = 'left';
    ctx.font = '700 13px "Barlow Condensed", "Outfit", sans-serif';
    lines.forEach(([on, off], k) => {
      const y = by + 10 + k * lineH * 2 + lineH / 2;
      ctx.fillStyle = '#3ddc84'; ctx.fillText('▲ ' + on, bx + 12, y);
      ctx.fillStyle = '#ff8a8a'; ctx.fillText('▼ ' + off, bx + 12, y + lineH);
    });
    ctx.restore();
  }

  drawLabels(ctx) {
    for (const label of this.labels) {
      const p = this.project(label.x, label.y, 4.2);
      const t = label.until / label.total;
      const alpha = Math.min(1, t * 4, (1 - t) * 8 + 0.2);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `800 ${Math.max(11, Math.min(16, this.w / 48))}px "Barlow Condensed", "Outfit", sans-serif`;
      const width = ctx.measureText(label.text).width + 16;
      const y = p.y - (1 - t) * 10;
      ctx.fillStyle = { goal: '#2ee6b0', card: '#ffcf33', red: '#ff4d4d', info: 'rgba(8,16,24,0.82)', save: '#7aa8ff' }[label.tone] || 'rgba(8,16,24,0.82)';
      ctx.beginPath(); ctx.roundRect?.(p.x - width / 2, y - 11, width, 22, 11); if (!ctx.roundRect) ctx.rect(p.x - width / 2, y - 11, width, 22); ctx.fill();
      ctx.fillStyle = ['goal', 'card'].includes(label.tone) ? '#0b1218' : '#ffffff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label.text, p.x, y + 0.5);
      ctx.restore();
    }
  }
}

export { LENGTH, WIDTH, GOAL_HALF };
