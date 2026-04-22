// Pinball Wizard — Canvas Renderer
// All drawing is pure functions receiving (ctx, state)

import {
  W, H,
  L_PIV, R_PIV, FLIP_LEN,
  BUMPER_DEFS, TARGET_DEFS, WALL_SEGS,
  TGT_W, TGT_H,
} from './runtime';

const LEFT    = 22;
const RIGHT   = 358;
const LANE_X  = 378;
const LANE_R  = 396;
const FLIP_Y  = 646;
const BALL_R  = 10;

// ─── Colour palette ──────────────────────────────────────────────────────────
const C = {
  felt:        '#06091a',
  feltGrid:    '#0b1028',
  wall:        '#8aa8c8',
  wallGlow:    '#4488cc',
  laneWall:    '#4466aa',
  bumperBase:  '#1a0033',
  bumperRing:  '#cc00ff',
  bumperGlow:  '#ff44ff',
  bumperLit:   '#ffaaff',
  tgtOn:       '#00ffcc',
  tgtOff:      '#0d3a30',
  tgtGlow:     '#00ccaa',
  slingFace:   '#ff8800',
  slingGlow:   '#ffaa33',
  rolloverOn:  '#00aaff',
  rolloverOff: '#0d2040',
  flipperBase: '#2a3a50',
  flipperEdge: '#88aad0',
  flipperGlow: '#44aaff',
  ball:        '#e0eaff',
  ballShine:   '#ffffff',
  ballShadow:  '#7090b0',
  plunger:     '#cc9933',
  plungerChg:  '#ffcc44',
  hud:         '#99bbdd',
  hudHi:       '#ffffff',
  msg:         '#ffff88',
  overlay:     'rgba(4,7,22,0.88)',
};

// ─── Main draw entry ─────────────────────────────────────────────────────────

export function drawPinballScene(ctx, state) {
  ctx.clearRect(0, 0, W, H);

  drawTableBackground(ctx);
  drawRollovers(ctx, state.rollovers);
  drawSlingZones(ctx);
  drawWallSegments(ctx);
  drawBumpers(ctx, state.bumpers);
  drawTargets(ctx, state.targets);
  drawFlippers(ctx, state);
  drawLaunchLane(ctx, state);
  if (state.phase === 'playing' || state.phase === 'ballLost') drawBall(ctx, state.ball);
  if (state.phase === 'launching') {
    drawPlunger(ctx, state.plungerCharge);
    drawBall(ctx, state.ball);
  }
  drawParticles(ctx, state.particles);
  drawHUD(ctx, state);

  if (state.phase === 'menu')     drawMenuOverlay(ctx);
  if (state.phase === 'ballLost') drawBallLostOverlay(ctx, state);
  if (state.phase === 'gameOver') drawGameOverOverlay(ctx, state);
}

// ─── Background ──────────────────────────────────────────────────────────────

function drawTableBackground(ctx) {
  // Felt base
  ctx.fillStyle = C.felt;
  ctx.fillRect(0, 0, W, H);

  // Subtle dot grid on felt
  ctx.fillStyle = C.feltGrid;
  for (let x = LEFT + 6; x < RIGHT; x += 18) {
    for (let y = 30; y < FLIP_Y - 10; y += 18) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Launch lane background
  const laneGrad = ctx.createLinearGradient(RIGHT, 0, LANE_R, 0);
  laneGrad.addColorStop(0, '#0a0f20');
  laneGrad.addColorStop(1, '#06091a');
  ctx.fillStyle = laneGrad;
  ctx.fillRect(RIGHT, 0, LANE_R - RIGHT, H);

  // Field border inner glow
  ctx.shadowColor = C.wallGlow;
  ctx.shadowBlur  = 8;
  ctx.strokeStyle = C.wallGlow;
  ctx.lineWidth   = 1;
  ctx.strokeRect(LEFT + 1, 23, RIGHT - LEFT - 2, FLIP_Y - 44);
  ctx.shadowBlur = 0;
}

// ─── Rollover lanes ──────────────────────────────────────────────────────────

function drawRollovers(ctx, rollovers) {
  for (const rv of rollovers) {
    const color = rv.lit ? C.rolloverOn : C.rolloverOff;
    ctx.fillStyle = color;
    if (rv.lit) {
      ctx.shadowColor = C.rolloverOn;
      ctx.shadowBlur  = 12;
    }
    ctx.fillRect(rv.x1, rv.y - 4, rv.x2 - rv.x1, 8);
    // Lane label dots
    ctx.fillStyle = rv.lit ? '#ffffff' : '#1a3060';
    ctx.beginPath();
    ctx.arc((rv.x1 + rv.x2) / 2, rv.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

// ─── Slingshot zones (visual shading) ────────────────────────────────────────

function drawSlingZones(ctx) {
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = C.slingGlow;

  // Left sling triangle
  ctx.beginPath();
  ctx.moveTo(LEFT, 438); ctx.lineTo(86, 490); ctx.lineTo(LEFT, 542);
  ctx.closePath();
  ctx.fill();

  // Right sling triangle
  ctx.beginPath();
  ctx.moveTo(RIGHT, 438); ctx.lineTo(294, 490); ctx.lineTo(RIGHT, 542);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 1;
}

// ─── Wall segments ───────────────────────────────────────────────────────────

function drawWallSegments(ctx) {
  for (const wall of WALL_SEGS) {
    const [x1, y1, x2, y2] = wall.s;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    if (wall.t === 'sling') {
      ctx.shadowColor = C.slingGlow;
      ctx.shadowBlur  = 10;
      ctx.strokeStyle = C.slingFace;
      ctx.lineWidth   = 3;
    } else if (wall.t === 'deflect') {
      ctx.shadowColor = C.wallGlow;
      ctx.shadowBlur  = 8;
      ctx.strokeStyle = '#6699cc';
      ctx.lineWidth   = 2.5;
    } else {
      ctx.shadowColor = C.wallGlow;
      ctx.shadowBlur  = 6;
      ctx.strokeStyle = C.wall;
      ctx.lineWidth   = 2;
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Lane separator visual emphasis
  ctx.beginPath();
  ctx.moveTo(RIGHT, 72);
  ctx.lineTo(RIGHT, H);
  ctx.strokeStyle = C.laneWall;
  ctx.lineWidth   = 2;
  ctx.shadowColor = '#224488';
  ctx.shadowBlur  = 6;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// ─── Pop bumpers ─────────────────────────────────────────────────────────────

function drawBumpers(ctx, bumpers) {
  for (const bmp of bumpers) {
    const glow = bmp.lit;

    // Glow halo
    if (glow > 0) {
      const halo = ctx.createRadialGradient(bmp.x, bmp.y, bmp.r * 0.6, bmp.x, bmp.y, bmp.r * 2.2);
      halo.addColorStop(0, `rgba(255,0,255,${glow * 0.5})`);
      halo.addColorStop(1, 'rgba(255,0,255,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(bmp.x, bmp.y, bmp.r * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outer ring
    ctx.shadowColor = glow > 0 ? C.bumperGlow : C.bumperRing;
    ctx.shadowBlur  = glow > 0 ? 20 : 10;
    ctx.strokeStyle = glow > 0 ? C.bumperLit : C.bumperRing;
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.arc(bmp.x, bmp.y, bmp.r, 0, Math.PI * 2);
    ctx.stroke();

    // Inner fill
    const inner = ctx.createRadialGradient(bmp.x - bmp.r * 0.3, bmp.y - bmp.r * 0.3, 0, bmp.x, bmp.y, bmp.r * 0.95);
    if (glow > 0) {
      inner.addColorStop(0, `rgba(255,180,255,${0.4 + glow * 0.5})`);
      inner.addColorStop(1, `rgba(100,0,180,${0.6 + glow * 0.3})`);
    } else {
      inner.addColorStop(0, '#2a004a');
      inner.addColorStop(1, '#100020');
    }
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.arc(bmp.x, bmp.y, bmp.r - 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Shine spot
    ctx.fillStyle = `rgba(255,255,255,${0.15 + glow * 0.25})`;
    ctx.beginPath();
    ctx.arc(bmp.x - bmp.r * 0.28, bmp.y - bmp.r * 0.28, bmp.r * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }
}

// ─── Drop targets ─────────────────────────────────────────────────────────────

function drawTargets(ctx, targets) {
  for (const tgt of targets) {
    const l   = tgt.x - TGT_W / 2, t = tgt.y - TGT_H / 2;
    const color = tgt.hit ? C.tgtOff : C.tgtOn;

    if (!tgt.hit) {
      ctx.shadowColor = C.tgtGlow;
      ctx.shadowBlur  = 12;
    }
    ctx.fillStyle = color;
    ctx.fillRect(l, t, TGT_W, TGT_H);

    // Border
    ctx.strokeStyle = tgt.hit ? '#0d2a20' : C.tgtGlow;
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(l, t, TGT_W, TGT_H);

    // Cross mark when hit
    if (tgt.hit) {
      ctx.strokeStyle = '#0d2a20';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(l + 3, t + 6); ctx.lineTo(l + TGT_W - 3, t + TGT_H - 6);
      ctx.moveTo(l + TGT_W - 3, t + 6); ctx.lineTo(l + 3, t + TGT_H - 6);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
  }

  // Label above targets
  ctx.fillStyle   = '#334466';
  ctx.font        = 'bold 9px monospace';
  ctx.textAlign   = 'center';
  ctx.fillText('● DROP TARGETS ●', 188, 325);
}

// ─── Flippers ────────────────────────────────────────────────────────────────

function drawFlippers(ctx, state) {
  _drawFlipper(ctx, L_PIV, state.leftFlipper.angle,  state.leftFlipper.active);
  _drawFlipper(ctx, R_PIV, state.rightFlipper.angle, state.rightFlipper.active);
}

function _drawFlipper(ctx, pivot, angle, active) {
  const tipX = pivot.x + Math.cos(angle) * FLIP_LEN;
  const tipY = pivot.y + Math.sin(angle) * FLIP_LEN;

  const glowColor = active ? '#66ccff' : '#3366aa';
  ctx.shadowColor = glowColor;
  ctx.shadowBlur  = active ? 18 : 9;

  // Body (thick capsule approximation using stroke)
  ctx.strokeStyle = active ? '#aaddff' : C.flipperEdge;
  ctx.lineWidth   = 12;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(pivot.x, pivot.y);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  // Inner highlight
  ctx.strokeStyle = active ? 'rgba(255,255,255,0.4)' : 'rgba(180,210,255,0.2)';
  ctx.lineWidth   = 5;
  ctx.beginPath();
  ctx.moveTo(pivot.x, pivot.y);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  ctx.lineCap    = 'butt';
  ctx.shadowBlur = 0;
}

// ─── Launch lane ─────────────────────────────────────────────────────────────

function drawLaunchLane(ctx, state) {
  // Guideline in lane
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = '#1a2a44';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(LANE_X, 80);
  ctx.lineTo(LANE_X, FLIP_Y - 10);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ─── Plunger ─────────────────────────────────────────────────────────────────

function drawPlunger(ctx, charge) {
  const plungerY   = FLIP_Y - 4;
  const baseY      = plungerY + 32;
  const comprLevel = charge * 28;

  // Plunger track
  ctx.strokeStyle = '#334466';
  ctx.lineWidth   = 6;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(LANE_X, plungerY);
  ctx.lineTo(LANE_X, baseY);
  ctx.stroke();

  // Plunger head (rises as charge increases)
  const headY = baseY - comprLevel;
  const chgColor = charge > 0 ? C.plungerChg : C.plunger;
  ctx.shadowColor = chgColor;
  ctx.shadowBlur  = charge > 0 ? 12 : 4;
  ctx.fillStyle   = chgColor;
  ctx.beginPath();
  ctx.arc(LANE_X, headY, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffeeaa';
  ctx.lineWidth   = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Charge bar (left of lane)
  if (charge > 0.05) {
    const barH   = 100;
    const barX   = RIGHT - 14;
    const barY   = plungerY - barH;
    const fillH  = barH * charge;
    ctx.fillStyle = '#0a1428';
    ctx.strokeStyle = '#224466';
    ctx.lineWidth = 1;
    ctx.fillRect(barX, barY, 8, barH);
    ctx.strokeRect(barX, barY, 8, barH);

    const barGrad = ctx.createLinearGradient(0, barY + barH, 0, barY);
    barGrad.addColorStop(0, '#00cc44');
    barGrad.addColorStop(0.5, '#ffcc00');
    barGrad.addColorStop(1, '#ff4400');
    ctx.fillStyle = barGrad;
    ctx.fillRect(barX, barY + barH - fillH, 8, fillH);

    ctx.fillStyle = '#ffffff';
    ctx.font      = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(charge * 100) + '%', barX + 4, barY - 4);
  }

  // Hint
  ctx.fillStyle   = '#334466';
  ctx.font        = '8px monospace';
  ctx.textAlign   = 'center';
  ctx.fillText('HOLD SPACE', LANE_X, FLIP_Y + 22);
}

// ─── Ball ────────────────────────────────────────────────────────────────────

function drawBall(ctx, ball) {
  const x = ball.x, y = ball.y;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + BALL_R + 2, BALL_R * 0.8, BALL_R * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Chrome gradient
  const grad = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, BALL_R);
  grad.addColorStop(0, C.ballShine);
  grad.addColorStop(0.3, '#c8d8ee');
  grad.addColorStop(0.8, C.ballShadow);
  grad.addColorStop(1, '#3a5070');
  ctx.fillStyle = grad;

  ctx.shadowColor = 'rgba(100,160,255,0.5)';
  ctx.shadowBlur  = 12;
  ctx.beginPath();
  ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Specular highlight
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(x - 3, y - 3, 3, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Particles ───────────────────────────────────────────────────────────────

function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle   = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur  = 0;
}

// ─── HUD ─────────────────────────────────────────────────────────────────────

function drawHUD(ctx, state) {
  ctx.textAlign = 'left';

  // Score
  ctx.font      = 'bold 14px monospace';
  ctx.fillStyle = C.hudHi;
  ctx.shadowColor = '#4488ff';
  ctx.shadowBlur  = 8;
  ctx.fillText(String(state.score).padStart(8, '0'), LEFT + 4, 14);
  ctx.shadowBlur  = 0;

  // Hi-score
  ctx.font      = '9px monospace';
  ctx.fillStyle = C.hud;
  ctx.fillText('BEST ' + String(state.hiScore).padStart(8, '0'), LEFT + 4, H - 4);

  // Multiplier
  if (state.multiplier > 1) {
    ctx.font        = 'bold 11px monospace';
    ctx.fillStyle   = '#ffcc00';
    ctx.shadowColor = '#cc8800';
    ctx.shadowBlur  = 8;
    ctx.textAlign   = 'right';
    ctx.fillText('×' + state.multiplier, RIGHT - 4, 14);
    ctx.shadowBlur  = 0;
  }

  // Ball indicators (dots)
  ctx.textAlign = 'right';
  ctx.fillStyle = '#334466';
  ctx.font      = '9px monospace';
  ctx.fillText('BALLS', RIGHT - 4, H - 4);
  for (let i = 0; i < 3; i++) {
    const bx = RIGHT - 68 + i * 14;
    ctx.fillStyle = i < state.ballsLeft ? '#44aaff' : '#0d1a30';
    ctx.shadowColor = i < state.ballsLeft ? '#44aaff' : 'transparent';
    ctx.shadowBlur  = i < state.ballsLeft ? 6 : 0;
    ctx.beginPath();
    ctx.arc(bx, H - 5, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Scrolling message
  if (state.msgTimer > 0) {
    const alpha = Math.min(1, state.msgTimer * 2);
    ctx.globalAlpha = alpha;
    ctx.textAlign   = 'center';
    ctx.font        = 'bold 11px monospace';
    ctx.fillStyle   = C.msg;
    ctx.shadowColor = '#888800';
    ctx.shadowBlur  = 10;
    ctx.fillText(state.message, (LEFT + RIGHT) / 2, 580);
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;
  }
}

// ─── Overlays ────────────────────────────────────────────────────────────────

function _drawCard(ctx, title, lines, y0) {
  const cx = (LEFT + RIGHT) / 2;
  const cw = 240, ch = 40 + lines.length * 22;
  const cx1 = cx - cw / 2, cy1 = y0;

  // Card background
  ctx.fillStyle = C.overlay;
  ctx.strokeStyle = C.wallGlow;
  ctx.lineWidth = 2;
  ctx.shadowColor = C.wallGlow;
  ctx.shadowBlur  = 16;
  _roundRect(ctx, cx1, cy1, cw, ch, 10);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Title
  ctx.textAlign   = 'center';
  ctx.font        = 'bold 14px monospace';
  ctx.fillStyle   = C.hudHi;
  ctx.fillText(title, cx, cy1 + 22);

  // Lines
  ctx.font      = '10px monospace';
  ctx.fillStyle = C.hud;
  lines.forEach((line, i) => {
    ctx.fillText(line, cx, cy1 + 44 + i * 22);
  });
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawMenuOverlay(ctx) {
  // Full dim
  ctx.fillStyle = 'rgba(4,7,22,0.75)';
  ctx.fillRect(0, 0, W, H);

  const cx = (LEFT + RIGHT) / 2;

  // Title
  ctx.textAlign   = 'center';
  ctx.font        = 'bold 26px monospace';
  ctx.fillStyle   = '#ff44ff';
  ctx.shadowColor = '#ff00ff';
  ctx.shadowBlur  = 20;
  ctx.fillText('PINBALL', cx, 230);
  ctx.fillStyle   = '#44aaff';
  ctx.shadowColor = '#0088ff';
  ctx.fillText('WIZARD', cx, 262);
  ctx.shadowBlur = 0;

  ctx.font        = '10px monospace';
  ctx.fillStyle   = '#6688aa';
  ctx.fillText('─────────────────────', cx, 292);

  const hints = [
    'Z / ← LEFT FLIPPER',
    'X / → RIGHT FLIPPER',
    'SPACE / ENTER PLUNGER',
    'R RESTART',
    '',
    '★ HIT ALL 5 TARGETS → MULTI ★',
    '★ LIT ALL 3 LANES → BONUS ★',
  ];
  ctx.font      = '9px monospace';
  ctx.fillStyle = C.hud;
  hints.forEach((h, i) => ctx.fillText(h, cx, 314 + i * 18));

  // Pulse prompt
  const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 400);
  ctx.globalAlpha = pulse;
  ctx.font        = 'bold 11px monospace';
  ctx.fillStyle   = '#ffff88';
  ctx.fillText('PRESS SPACE TO START', cx, 462);
  ctx.globalAlpha = 1;
}

function drawBallLostOverlay(ctx, state) {
  _drawCard(ctx, '▼ BALL LOST ▼', [
    state.ballsLeft + ' ball' + (state.ballsLeft > 1 ? 's' : '') + ' remaining',
    'Score: ' + state.score,
    '',
    'SPACE / ENTER to continue',
  ], 300);
}

function drawGameOverOverlay(ctx, state) {
  ctx.fillStyle = 'rgba(4,7,22,0.8)';
  ctx.fillRect(0, 0, W, H);

  const cx = (LEFT + RIGHT) / 2;
  ctx.textAlign   = 'center';
  ctx.font        = 'bold 22px monospace';
  ctx.fillStyle   = '#ff4444';
  ctx.shadowColor = '#cc0000';
  ctx.shadowBlur  = 16;
  ctx.fillText('GAME OVER', cx, 270);
  ctx.shadowBlur = 0;

  ctx.font      = '11px monospace';
  ctx.fillStyle = C.hudHi;
  ctx.fillText('SCORE   ' + state.score, cx, 308);
  if (state.score >= state.hiScore && state.hiScore > 0) {
    ctx.fillStyle   = '#ffcc00';
    ctx.shadowColor = '#cc8800';
    ctx.shadowBlur  = 10;
    ctx.fillText('★ NEW BEST! ★', cx, 334);
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = C.hud;
    ctx.fillText('BEST    ' + state.hiScore, cx, 334);
  }

  const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 500);
  ctx.globalAlpha = pulse;
  ctx.font        = 'bold 10px monospace';
  ctx.fillStyle   = '#88aaff';
  ctx.fillText('SPACE / ENTER or R to play again', cx, 380);
  ctx.globalAlpha = 1;
}
