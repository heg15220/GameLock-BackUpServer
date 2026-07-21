// Canvas renderer for Distancia Justa.
//
// Four stacked lanes, each scrolled independently so every runner stays in view
// no matter how far apart they end up — the same split-screen idea the Wii game
// uses. Everything (sky, hills, trees, faceless runners, signs) is drawn
// procedurally with soft shading, so there are no assets to load. The renderer
// is a pure function of the runtime state: it reads, never mutates.

const DEFAULT_VIEW_M = 52; // metres visible across a lane (overridden per difficulty)
const ANCHOR_FRAC = 0.26; // where each runner sits, as a fraction of width

// ── small colour helpers ─────────────────────────────────────────────────────
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(r)}, ${c(g)}, ${c(b)})`;
}
// Deterministic 0–1 hash so scenery stays put instead of shimmering as it scrolls.
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// ── faceless runner ──────────────────────────────────────────────────────────
function drawRunner(ctx, x, groundY, h, color, phase, moving) {
  const dark = shade(color, 0.72);
  const light = shade(color, 1.22);
  const swing = moving ? Math.sin(phase) : 0;
  const lean = moving ? h * 0.05 : 0;

  const hipY = groundY - h * 0.44;
  const shoulderY = groundY - h * 0.74;
  const headR = h * 0.17;
  const headCY = groundY - h * 0.9;
  const bodyW = h * 0.2;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Ground shadow.
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(x, groundY + 1, h * 0.26, h * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  // Two-segment legs with a bent knee.
  const legT = h * 0.24;
  const legS = h * 0.24;
  const drawLeg = (dir) => {
    const thigh = swing * dir * 0.7;
    const kneeX = x + Math.sin(thigh) * legT;
    const kneeY = hipY + Math.cos(thigh) * legT;
    const shin = thigh * 0.35 - Math.max(0, swing * dir) * 0.5;
    const footX = kneeX + Math.sin(shin) * legS;
    const footY = kneeY + Math.cos(shin) * legS;
    ctx.strokeStyle = dark;
    ctx.lineWidth = h * 0.12;
    ctx.beginPath();
    ctx.moveTo(x, hipY);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(footX, footY);
    ctx.stroke();
  };
  drawLeg(1);
  drawLeg(-1);

  // Arms (single bent segment, counter-swinging).
  ctx.strokeStyle = dark;
  ctx.lineWidth = h * 0.09;
  const shoulderX = x + lean;
  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY + h * 0.02);
  ctx.lineTo(shoulderX - swing * h * 0.16, shoulderY + h * 0.22);
  ctx.moveTo(shoulderX, shoulderY + h * 0.02);
  ctx.lineTo(shoulderX + swing * h * 0.16, shoulderY + h * 0.22);
  ctx.stroke();

  // Torso — a filled capsule leaning slightly forward.
  ctx.save();
  ctx.translate(0, 0);
  const topX = shoulderX;
  const grad = ctx.createLinearGradient(x - bodyW, 0, x + bodyW, 0);
  grad.addColorStop(0, dark);
  grad.addColorStop(0.5, color);
  grad.addColorStop(1, light);
  ctx.fillStyle = grad;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - bodyW / 2, hipY);
  ctx.quadraticCurveTo(x - bodyW / 2 - lean, (hipY + shoulderY) / 2, topX - bodyW / 2, shoulderY);
  ctx.arc(topX, shoulderY, bodyW / 2, Math.PI, 0);
  ctx.quadraticCurveTo(x + bodyW / 2 + lean, (hipY + shoulderY) / 2, x + bodyW / 2, hipY);
  ctx.arc(x, hipY, bodyW / 2, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Head — deliberately featureless, with a soft highlight.
  ctx.fillStyle = color;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(topX, headCY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.arc(topX - headR * 0.32, headCY - headR * 0.34, headR * 0.42, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ── distance sign ────────────────────────────────────────────────────────────
function drawSign(ctx, x, groundY, text) {
  ctx.save();
  ctx.font = "700 11px 'Segoe UI', sans-serif";
  const w = Math.max(30, ctx.measureText(text).width + 16);
  const h = 18;
  const postH = 26;
  const boardY = groundY - postH - h;

  // Base shadow.
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.beginPath();
  ctx.ellipse(x, groundY + 1, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Post with a little grain.
  const post = ctx.createLinearGradient(x - 2, 0, x + 3, 0);
  post.addColorStop(0, "#8a6239");
  post.addColorStop(1, "#5f3f22");
  ctx.fillStyle = post;
  ctx.fillRect(x - 2.5, groundY - postH, 5, postH);

  // Board.
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  roundRect(ctx, x - w / 2 + 2, boardY + 2, w, h, 5);
  ctx.fill();
  const board = ctx.createLinearGradient(0, boardY, 0, boardY + h);
  board.addColorStop(0, "#fff7e0");
  board.addColorStop(1, "#ffe6a8");
  ctx.fillStyle = board;
  roundRect(ctx, x - w / 2, boardY, w, h, 5);
  ctx.fill();
  ctx.strokeStyle = "#c98a3c";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#7a4a1a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, boardY + h / 2 + 1);
  ctx.restore();
}

// ── one lane ─────────────────────────────────────────────────────────────────
function drawLane(ctx, rt, racer, top, laneH, W) {
  const VIEW_M = rt.viewM ?? DEFAULT_VIEW_M; // difficulty zoom: fewer metres = signs farther apart
  const pxPerM = W / VIEW_M;
  const anchorX = W * ANCHOR_FRAC;
  const runnerM = racer.meters;
  const worldX = (m, parallax = 1) => anchorX + (m - runnerM * parallax) * pxPerM;
  const horizon = top + laneH * 0.44;
  const groundY = top + laneH * 0.85;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top, W, laneH);
  ctx.clip();

  // Sky.
  const sky = ctx.createLinearGradient(0, top, 0, horizon);
  sky.addColorStop(0, "#a9def9");
  sky.addColorStop(0.7, "#d6f0ff");
  sky.addColorStop(1, "#eefaff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, top, W, horizon - top + 2);

  // Clouds (slow parallax).
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (let k = 0; k < 3; k += 1) {
    const cm = k * 34 + 12;
    const cx = worldX(cm, 0.25);
    const cy = top + laneH * (0.1 + hash(k + 1) * 0.14);
    const wrapped = ((cx % (W + 120)) + W + 120) % (W + 120) - 60;
    ctx.beginPath();
    ctx.ellipse(wrapped, cy, 16, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(wrapped + 12, cy + 2, 12, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(wrapped - 12, cy + 3, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Distant hills.
  ctx.fillStyle = "#a7d98a";
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  for (let hx = -20; hx <= W + 20; hx += 20) {
    const hy = horizon - 14 - Math.sin((hx + runnerM * 0.4) * 0.02) * 8;
    ctx.lineTo(hx, hy);
  }
  ctx.lineTo(W, horizon);
  ctx.closePath();
  ctx.fill();

  // Grass band.
  const grass = ctx.createLinearGradient(0, horizon - 6, 0, groundY);
  grass.addColorStop(0, "#79c24c");
  grass.addColorStop(1, "#5da638");
  ctx.fillStyle = grass;
  ctx.fillRect(0, horizon - 6, W, groundY - horizon + 8);

  // Trees along the horizon (layered canopy, slight parallax).
  const treeSpacing = 13;
  const parallaxM = runnerM * 0.85;
  const firstK = Math.floor((parallaxM - VIEW_M) / treeSpacing);
  const lastK = Math.ceil((parallaxM + VIEW_M) / treeSpacing);
  for (let k = firstK; k <= lastK; k += 1) {
    const m = k * treeSpacing + hash(k) * 5;
    const tx = anchorX + (m - parallaxM) * pxPerM;
    if (tx < -30 || tx > W + 30) continue;
    const baseY = horizon - 4;
    const scale = 0.85 + hash(k * 3) * 0.4;
    const th = 30 * scale;
    ctx.fillStyle = "#6b4a2b";
    ctx.fillRect(tx - 2, baseY - th * 0.5, 4, th * 0.5);
    ctx.fillStyle = "#3f7f2c";
    ctx.beginPath();
    ctx.arc(tx, baseY - th * 0.62, th * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#57a83b";
    ctx.beginPath();
    ctx.arc(tx - th * 0.2, baseY - th * 0.5, th * 0.32, 0, Math.PI * 2);
    ctx.arc(tx + th * 0.22, baseY - th * 0.52, th * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.arc(tx - th * 0.15, baseY - th * 0.75, th * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dirt track with a lighter running lane.
  const dirt = ctx.createLinearGradient(0, groundY - 4, 0, top + laneH);
  dirt.addColorStop(0, "#e3ce93");
  dirt.addColorStop(1, "#c9ab6d");
  ctx.fillStyle = dirt;
  ctx.fillRect(0, groundY - 2, W, top + laneH - groundY + 2);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(0, groundY + laneH * 0.05);
  ctx.lineTo(W, groundY + laneH * 0.05);
  ctx.stroke();
  ctx.setLineDash([]);

  // Grass tufts + flowers + pebbles pinned to world positions.
  for (let k = firstK * 2; k <= lastK * 2; k += 1) {
    const m = k * 6 + hash(k) * 4;
    const gx = worldX(m);
    if (gx < -12 || gx > W + 12) continue;
    const r = hash(k * 7);
    // tuft near the grass edge
    ctx.strokeStyle = shade("#5da638", 0.9);
    ctx.lineWidth = 1.4;
    const gy = horizon + 4 + r * 4;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx - 2, gy - 4);
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + 2, gy - 4);
    ctx.stroke();
    if (r > 0.72) {
      ctx.fillStyle = ["#f9d54a", "#f472b6", "#fff"][k % 3];
      ctx.beginPath();
      ctx.arc(gx, gy - 5, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    // pebble on the track
    if (hash(k * 11) > 0.8) {
      ctx.fillStyle = "rgba(120,96,54,0.5)";
      ctx.beginPath();
      ctx.ellipse(worldX(m + 3), groundY + laneH * 0.09, 2, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Start line at 0 m.
  const x0 = worldX(0);
  if (x0 > -10 && x0 < W + 10) {
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(x0, horizon + 6);
    ctx.lineTo(x0, groundY + laneH * 0.1);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Distance signs, only for the first 30 m.
  for (let m = rt.markerStep ?? 10; m <= (rt.markerMax ?? 30); m += rt.markerStep ?? 10) {
    const mx = worldX(m);
    if (mx < -40 || mx > W + 40) continue;
    drawSign(ctx, mx, groundY + 2, `${m}m`);
  }

  // On reveal, uncover the hidden grid marks (same spacing as the signs) so the
  // player sees the reference they were estimating against, then the target line.
  if (rt.state === "reveal") {
    const step = rt.markerStep ?? 10;
    const from = (rt.markerMax ?? 30) + step;
    const to = Math.max(rt.targetM, racer.meters) + step;
    ctx.save();
    ctx.globalAlpha = 0.55;
    for (let m = from; m <= to; m += step) {
      const gx = worldX(m);
      if (gx < -30 || gx > W + 30) continue;
      ctx.strokeStyle = "rgba(122,74,26,0.8)";
      ctx.lineWidth = 1.4;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(gx, groundY - 16);
      ctx.lineTo(gx, groundY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(90,58,26,0.95)";
      ctx.font = "600 9px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(`${m}m`, gx, groundY - 19);
    }
    ctx.restore();

    const tx = worldX(rt.targetM);
    if (tx > -50 && tx < W + 50) {
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(tx, top + laneH * 0.16);
      ctx.lineTo(tx, groundY + laneH * 0.08);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ef4444";
      roundRect(ctx, tx - 16, top + laneH * 0.05, 32, 14, 4);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "700 10px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${rt.targetM}m`, tx, top + laneH * 0.05 + 7);
    }
  }

  // Runner.
  const runnerH = laneH * 0.52;
  drawRunner(ctx, anchorX, groundY, runnerH, racer.color, racer.walkPhase, racer.moving);

  ctx.restore();

  // Lane label + total, over the clip.
  ctx.save();
  const isPlayer = racer.isPlayer;
  const label = isPlayer ? (rt.locale === "en" ? "YOU" : "TÚ") : (racer.name || "").toUpperCase();
  ctx.fillStyle = "rgba(7,17,31,0.72)";
  roundRect(ctx, 8, top + 8, 82, 21, 7);
  ctx.fill();
  ctx.fillStyle = racer.color;
  ctx.beginPath();
  ctx.arc(19, top + 18, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "700 12px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#f1f5f9";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 28, top + 18);
  if (rt.round > 0) {
    ctx.fillStyle = "#fde047";
    ctx.textAlign = "right";
    ctx.fillText(`${racer.total || 0}pts`, 84, top + 18);
  }

  if (isPlayer) {
    ctx.strokeStyle = "rgba(103,232,249,0.7)";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(1.5, top + 1.5, W - 3, laneH - 3);
  }
  ctx.restore();
}

// W/H are CSS pixels; dpr scales the backing store so the field stays crisp on
// high-density phone screens instead of upscaling a 1x buffer.
export function drawScene(ctx, rt, W, H, dpr = 1) {
  const width = W ?? ctx.canvas.width;
  const height = H ?? ctx.canvas.height;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#060a14";
  ctx.fillRect(0, 0, width, height);

  const laneH = height / 4;
  rt.racers.forEach((racer, i) => {
    drawLane(ctx, rt, racer, i * laneH, laneH, width);
    if (i > 0) {
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, i * laneH);
      ctx.lineTo(width, i * laneH);
      ctx.stroke();
    }
  });
}

export default drawScene;
