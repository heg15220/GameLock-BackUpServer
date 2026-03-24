// Bubble Storm — Canvas Renderer
// Reads state directly from the BubbleRuntime instance

import { W, H, R, HEX_W, HEX_H, COLORS, COLS_EVEN, COLS_ODD } from './runtime.js';

const TOP_Y     = R + 8;
const SHOOTER_Y = H - 58;
const GAMEOVER_Y = H - 170;

// ─── entry point ─────────────────────────────────────────────────────────────

export function drawBubbleScene(ctx, rt) {
  ctx.clearRect(0, 0, W, H);
  _drawBackground(ctx);
  _drawGameOverLine(ctx);
  _drawGridBubbles(ctx, rt);
  _drawFalling(ctx, rt.falling);
  _drawParticles(ctx, rt.particles);

  if (rt.phase === 'playing') {
    if (!rt.bullet) _drawAimLine(ctx, rt.getTrajectory());
    if (rt.bullet)  _drawBullet(ctx, rt.bullet);
    _drawShooter(ctx, rt);
  }

  _drawHUD(ctx, rt);

  if (rt.phase === 'menu')    _drawMenuOverlay(ctx);
  if (rt.phase === 'gameover') _drawGameOverOverlay(ctx, rt);
  if (rt.message && rt.msgTimer > 0) _drawMessage(ctx, rt);
}

// ─── background ──────────────────────────────────────────────────────────────

function _drawBackground(ctx) {
  ctx.fillStyle = '#080b14';
  ctx.fillRect(0, 0, W, H);

  // Vignette
  const vign = ctx.createRadialGradient(W / 2, H / 2, 30, W / 2, H / 2, W * 0.8);
  vign.addColorStop(0, 'rgba(20,10,50,0)');
  vign.addColorStop(1, 'rgba(0,0,8,0.6)');
  ctx.fillStyle = vign;
  ctx.fillRect(0, 0, W, H);

  // Subtle hex grid hint (very faint)
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = '#8888ff';
  ctx.lineWidth   = 0.5;
  for (let r = 0; r < 14; r++) {
    const cols = r % 2 === 0 ? COLS_EVEN : COLS_ODD;
    for (let c = 0; c < cols; c++) {
      const x = R + c * HEX_W + (r % 2 === 0 ? 0 : R);
      const y = TOP_Y + r * HEX_H;
      ctx.beginPath();
      ctx.arc(x, y, R - 1, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ─── game-over line ───────────────────────────────────────────────────────────

function _drawGameOverLine(ctx) {
  ctx.save();
  ctx.setLineDash([5, 7]);
  ctx.strokeStyle = 'rgba(255,55,55,0.3)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(0, GAMEOVER_Y);
  ctx.lineTo(W, GAMEOVER_Y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ─── bubbles ─────────────────────────────────────────────────────────────────

function _drawBubble(ctx, x, y, radius, colorStr, glowAmt = 8) {
  // Glow layer
  ctx.save();
  ctx.shadowColor = colorStr;
  ctx.shadowBlur  = glowAmt;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = colorStr;
  ctx.fill();
  ctx.restore();

  // 3-D shine gradient
  const shine = ctx.createRadialGradient(x - radius * 0.32, y - radius * 0.36, 0, x, y, radius);
  shine.addColorStop(0,   'rgba(255,255,255,0.6)');
  shine.addColorStop(0.28, 'rgba(255,255,255,0.12)');
  shine.addColorStop(1,   'rgba(0,0,0,0.28)');
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = shine;
  ctx.fill();

  // Thin rim
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth   = 1;
  ctx.stroke();
}

function _drawGridBubbles(ctx, rt) {
  for (let r = 0; r < rt.grid.length; r++) {
    const cols = rt._colCount(r);
    for (let c = 0; c < cols; c++) {
      const color = rt.grid[r][c];
      if (color === null) continue;
      const x = rt._bubbleX(r, c);
      const y = rt._bubbleY(r);
      _drawBubble(ctx, x, y, R - 1, COLORS[color]);
    }
  }
}

function _drawFalling(ctx, falling) {
  for (const f of falling) {
    _drawBubble(ctx, f.x, f.y, R - 1, COLORS[f.color], 6);
  }
}

// ─── particles ───────────────────────────────────────────────────────────────

function _drawParticles(ctx, particles) {
  ctx.save();
  for (const p of particles) {
    const alpha = p.maxLife > 0 ? p.life / p.maxLife : 0;
    ctx.globalAlpha = alpha * 0.9;
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = 4;
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ─── aim line ─────────────────────────────────────────────────────────────────

function _drawAimLine(ctx, pts) {
  if (!pts || pts.length < 2) return;
  ctx.save();
  ctx.setLineDash([7, 9]);
  ctx.strokeStyle = 'rgba(220,230,255,0.35)';
  ctx.lineWidth   = 1.8;
  ctx.shadowColor = 'rgba(180,200,255,0.4)';
  ctx.shadowBlur  = 5;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Dot at predicted landing
  const last = pts[pts.length - 1];
  ctx.globalAlpha = 0.55;
  ctx.fillStyle   = 'white';
  ctx.shadowBlur  = 8;
  ctx.beginPath();
  ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ─── bullet ───────────────────────────────────────────────────────────────────

function _drawBullet(ctx, bullet) {
  // Trail
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle   = COLORS[bullet.color];
  ctx.shadowColor = COLORS[bullet.color];
  ctx.shadowBlur  = 8;
  ctx.beginPath();
  ctx.arc(bullet.x - bullet.vx * 0.013, bullet.y - bullet.vy * 0.013, R * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  _drawBubble(ctx, bullet.x, bullet.y, R - 1, COLORS[bullet.color], 14);
}

// ─── shooter ─────────────────────────────────────────────────────────────────

function _drawShooter(ctx, rt) {
  const cx  = W / 2;
  const cy  = SHOOTER_Y;
  const ang = rt.aimAngle;

  // Cannon barrel
  const barrelLen = 42;
  const bx0 = cx + Math.cos(ang) * (R + 2);
  const by0 = cy + Math.sin(ang) * (R + 2);
  const bx1 = cx + Math.cos(ang) * (R + barrelLen);
  const by1 = cy + Math.sin(ang) * (R + barrelLen);

  ctx.save();
  ctx.lineCap     = 'round';
  ctx.lineWidth   = 10;
  ctx.strokeStyle = '#2244aa';
  ctx.shadowColor = '#4488cc';
  ctx.shadowBlur  = 14;
  ctx.beginPath(); ctx.moveTo(bx0, by0); ctx.lineTo(bx1, by1); ctx.stroke();

  ctx.lineWidth   = 6;
  ctx.strokeStyle = '#6699dd';
  ctx.shadowBlur  = 6;
  ctx.beginPath(); ctx.moveTo(bx0, by0); ctx.lineTo(bx1, by1); ctx.stroke();
  ctx.restore();

  // Launcher base ring
  ctx.save();
  ctx.shadowColor = '#4488ff';
  ctx.shadowBlur  = 20;
  ctx.fillStyle   = '#0d1a33';
  ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3366bb';
  ctx.lineWidth   = 2.5;
  ctx.stroke();
  ctx.restore();

  // Current bubble sitting in the launcher
  _drawBubble(ctx, cx, cy, R - 2, COLORS[rt.currentColor], 16);

  // Next bubble preview (bottom-left)
  const nx = 44, ny = H - 30;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath(); ctx.arc(nx, ny, 20, 0, Math.PI * 2); ctx.fill();
  _drawBubble(ctx, nx, ny, R - 5, COLORS[rt.nextColor], 6);
  ctx.fillStyle   = 'rgba(200,210,255,0.55)';
  ctx.font        = '9px monospace';
  ctx.textAlign   = 'center';
  ctx.fillText('NEXT', nx, ny + 30);
  ctx.restore();

  // Swap hint (bottom-right)
  ctx.save();
  ctx.fillStyle = 'rgba(200,210,255,0.35)';
  ctx.font      = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('TAB=SWAP', W - 44, H - 10);
  ctx.restore();
}

// ─── HUD ─────────────────────────────────────────────────────────────────────

function _drawHUD(ctx, rt) {
  // Bottom bar background
  ctx.fillStyle = 'rgba(5,8,18,0.7)';
  ctx.fillRect(0, H - 48, W, 48);

  ctx.save();
  ctx.textAlign = 'center';

  ctx.shadowColor = '#4499ff';
  ctx.shadowBlur  = 10;
  ctx.fillStyle   = '#ffffff';
  ctx.font        = 'bold 18px monospace';
  ctx.fillText(rt.score.toLocaleString(), W / 2, H - 8);

  ctx.shadowBlur  = 0;
  ctx.fillStyle   = 'rgba(180,190,230,0.5)';
  ctx.font        = '10px monospace';
  ctx.fillText(`BEST ${rt._hiScore.toLocaleString()}`, W / 2, H - 28);

  // Level (top-right)
  ctx.textAlign   = 'right';
  ctx.fillStyle   = 'rgba(180,200,255,0.55)';
  ctx.font        = '11px monospace';
  ctx.fillText(`LVL ${rt.level}`, W - 8, H - 28);
  ctx.restore();
}

// ─── floating message ─────────────────────────────────────────────────────────

function _drawMessage(ctx, rt) {
  const alpha = Math.min(1, rt.msgTimer * 2.5);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign   = 'center';
  ctx.font        = 'bold 22px monospace';
  ctx.fillStyle   = '#ffff88';
  ctx.shadowColor = '#ffaa00';
  ctx.shadowBlur  = 18;
  ctx.fillText(rt.message, W / 2, GAMEOVER_Y - 20);
  ctx.restore();
}

// ─── overlays ────────────────────────────────────────────────────────────────

function _drawMenuOverlay(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(4,7,18,0.80)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.shadowColor = '#4499ff'; ctx.shadowBlur = 24;
  ctx.fillStyle   = '#88ccff';
  ctx.font        = 'bold 32px monospace';
  ctx.fillText('BUBBLE STORM', W / 2, H / 2 - 60);

  ctx.shadowBlur  = 8;
  ctx.fillStyle   = '#cc88ff';
  ctx.font        = '13px monospace';
  ctx.fillText('Match 3+ same-colour bubbles to pop them', W / 2, H / 2 - 18);

  ctx.fillStyle   = 'rgba(200,215,255,0.75)';
  ctx.font        = '12px monospace';
  ctx.fillText('Aim with mouse  ·  Click or Space to shoot', W / 2, H / 2 + 12);
  ctx.fillText('Tab / S  to swap next bubble', W / 2, H / 2 + 36);

  ctx.shadowBlur  = 14;
  ctx.fillStyle   = '#ffff55';
  ctx.font        = 'bold 14px monospace';
  ctx.fillText('— CLICK OR PRESS SPACE TO START —', W / 2, H / 2 + 78);
  ctx.restore();
}

function _drawGameOverOverlay(ctx, rt) {
  ctx.save();
  ctx.fillStyle = 'rgba(4,6,16,0.82)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign   = 'center';
  ctx.font        = 'bold 30px monospace';
  ctx.fillStyle   = '#ff6688';
  ctx.shadowColor = '#ff3355';
  ctx.shadowBlur  = 22;
  ctx.fillText('GAME OVER', W / 2, H / 2 - 55);

  ctx.shadowBlur  = 0;
  ctx.font        = '16px monospace';
  ctx.fillStyle   = '#ffffff';
  ctx.fillText(`Score: ${rt.score.toLocaleString()}`, W / 2, H / 2 - 10);

  if (rt.score > 0 && rt.score >= rt._hiScore) {
    ctx.fillStyle = '#ffee44';
    ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 12;
    ctx.font = 'bold 14px monospace';
    ctx.fillText('✦ NEW HI-SCORE ✦', W / 2, H / 2 + 20);
  } else {
    ctx.fillStyle = 'rgba(200,210,255,0.55)';
    ctx.font = '13px monospace';
    ctx.fillText(`Best: ${rt._hiScore.toLocaleString()}`, W / 2, H / 2 + 20);
  }

  ctx.shadowBlur  = 0;
  ctx.fillStyle   = 'rgba(200,215,255,0.55)';
  ctx.font        = '12px monospace';
  ctx.fillText('Click or Space to play again', W / 2, H / 2 + 62);
  ctx.restore();
}
