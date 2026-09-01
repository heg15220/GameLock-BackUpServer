// Canvas scene for Paso a Paso.
//
// One sunny hillside with a twelve-log staircase climbing to a wooden gate, the
// way the Wii original stages it: everybody on the same flight of steps, so a
// glance tells you who is where and how far the leader still has to go. Nothing
// is loaded — sky, peaks, hills, logs, gate, flowers and climbers are all drawn
// procedurally.
//
// `drawScene` is a pure function of a runtime snapshot plus a clock, which is
// what makes the art reviewable: the same call renders inside the game and
// inside a headless page that dumps a PNG.

const SKY_TOP = "#4fa9e8";
const SKY_BOTTOM = "#d5edfb";
const HILL_FAR = "#7ec06a";
const HILL_NEAR = "#5aa74d";
const GRASS = "#69b653";
const WOOD = "#a9763f";
const WOOD_DARK = "#7c5327";
const WOOD_LIGHT = "#c99a5c";

// Deterministic 0–1 hash so clouds and flowers stay put between frames.
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function shade(hex, f) {
  const h = hex.replace("#", "");
  const c = (i) => {
    const v = parseInt(h.slice(i, i + 2), 16) * f;
    return Math.max(0, Math.min(255, Math.round(v)));
  };
  return `rgb(${c(0)}, ${c(2)}, ${c(4)})`;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

/**
 * Where every step of the staircase sits. Exported so the HUD and any hit test
 * agree with the picture instead of guessing at it.
 */
export function stairGeometry(w, h, topStep = 12) {
  // A phone gives the stage a tall box rather than a 16:9 one. Twelve steps
  // still have to cross it, so the staircase takes more of the width and climbs
  // steeper instead of shrinking into a corner.
  const tall = h / w > 0.62;
  const baseX = w * (tall ? 0.1 : 0.15);
  const baseY = h * (tall ? 0.9 : 0.855);
  const topY = h * (tall ? 0.22 : 0.315);
  const stepW = (w * (tall ? 0.8 : 0.66)) / topStep;
  const stepH = (baseY - topY) / topStep;
  return {
    topStep,
    tall,
    baseX,
    baseY,
    stepW,
    stepH,
    // A climber may never be wider than the tread they stand on, or four of
    // them on one step become a single blob on a narrow canvas.
    climberSize: Math.max(18, Math.min(stepH * 2.5, stepW * 1.7)),
    x: (step) => baseX + step * stepW,
    y: (step) => baseY - step * stepH,
  };
}

// ── Background ───────────────────────────────────────────────────────────────
function drawSky(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.72);
  sky.addColorStop(0, SKY_TOP);
  sky.addColorStop(1, SKY_BOTTOM);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Warm sun haze in the upper left, matching the reference's bright noon look.
  const glow = ctx.createRadialGradient(w * 0.18, h * 0.06, 0, w * 0.18, h * 0.06, h * 0.55);
  glow.addColorStop(0, "rgba(255, 250, 214, 0.75)");
  glow.addColorStop(1, "rgba(255, 250, 214, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

function drawCloud(ctx, x, y, s, alpha) {
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, s * 1.35, s * 0.62, 0, 0, Math.PI * 2);
  ctx.ellipse(x - s * 0.85, y + s * 0.16, s * 0.72, s * 0.44, 0, 0, Math.PI * 2);
  ctx.ellipse(x + s * 0.82, y + s * 0.2, s * 0.8, s * 0.46, 0, 0, Math.PI * 2);
  ctx.ellipse(x + s * 0.1, y - s * 0.42, s * 0.78, s * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawClouds(ctx, w, h, timeMs) {
  const drift = (timeMs / 1000) * 5;
  for (let i = 0; i < 5; i += 1) {
    const span = w + 260;
    const x = ((hash(i * 3.1) * span + drift * (0.4 + hash(i) * 0.5)) % span) - 130;
    const y = h * (0.07 + hash(i * 7.7) * 0.2);
    const s = h * (0.035 + hash(i * 2.3) * 0.035);
    drawCloud(ctx, x, y, s, 0.72 + hash(i * 5.5) * 0.2);
  }
}

function drawMountains(ctx, w, h) {
  const baseY = h * 0.58;
  ctx.fillStyle = "#8fa9c9";
  ctx.beginPath();
  ctx.moveTo(-20, baseY);
  const peaks = 7;
  for (let i = 0; i <= peaks; i += 1) {
    const x = -20 + ((w + 40) / peaks) * i;
    const peakY = baseY - h * (0.1 + hash(i * 4.4) * 0.16);
    ctx.lineTo(x - (w + 40) / peaks / 2, baseY);
    ctx.lineTo(x, peakY);
  }
  ctx.lineTo(w + 20, baseY);
  ctx.closePath();
  ctx.fill();

  // Snow caps: a small white triangle riding each peak.
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  for (let i = 0; i <= peaks; i += 1) {
    const x = -20 + ((w + 40) / peaks) * i;
    const peakY = baseY - h * (0.1 + hash(i * 4.4) * 0.16);
    const cap = (baseY - peakY) * 0.3;
    ctx.beginPath();
    ctx.moveTo(x, peakY);
    ctx.lineTo(x + cap * 0.78, peakY + cap);
    ctx.lineTo(x + cap * 0.3, peakY + cap * 0.72);
    ctx.lineTo(x - cap * 0.22, peakY + cap * 1.05);
    ctx.lineTo(x - cap * 0.8, peakY + cap);
    ctx.closePath();
    ctx.fill();
  }
}

function drawHills(ctx, w, h) {
  ctx.fillStyle = HILL_FAR;
  ctx.beginPath();
  ctx.moveTo(-20, h);
  ctx.lineTo(-20, h * 0.62);
  ctx.quadraticCurveTo(w * 0.22, h * 0.5, w * 0.5, h * 0.6);
  ctx.quadraticCurveTo(w * 0.78, h * 0.7, w + 20, h * 0.55);
  ctx.lineTo(w + 20, h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = HILL_NEAR;
  ctx.beginPath();
  ctx.moveTo(-20, h);
  ctx.lineTo(-20, h * 0.74);
  ctx.quadraticCurveTo(w * 0.3, h * 0.64, w * 0.62, h * 0.74);
  ctx.quadraticCurveTo(w * 0.85, h * 0.8, w + 20, h * 0.7);
  ctx.lineTo(w + 20, h);
  ctx.closePath();
  ctx.fill();
}

function drawFence(ctx, w, h) {
  const y = h * 0.66;
  ctx.strokeStyle = WOOD_DARK;
  ctx.lineWidth = Math.max(2, h * 0.008);
  ctx.lineCap = "round";
  for (let i = 0; i < 4; i += 1) {
    const x = w * (0.87 + i * 0.035);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + h * 0.075);
    ctx.stroke();
  }
  ctx.strokeStyle = WOOD;
  ctx.beginPath();
  ctx.moveTo(w * 0.86, y + h * 0.018);
  ctx.lineTo(w * 0.99, y + h * 0.018);
  ctx.moveTo(w * 0.86, y + h * 0.048);
  ctx.lineTo(w * 0.99, y + h * 0.048);
  ctx.stroke();
}

// ── Staircase ────────────────────────────────────────────────────────────────
function drawSlope(ctx, geo, w, h) {
  // The earth the steps are cut into: a wedge following the stair line.
  const grad = ctx.createLinearGradient(0, geo.y(geo.topStep), 0, h);
  grad.addColorStop(0, shade(GRASS, 1.12));
  grad.addColorStop(1, shade(GRASS, 0.78));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-20, h + 20);
  ctx.lineTo(-20, geo.baseY + h * 0.05);
  ctx.quadraticCurveTo(geo.baseX * 0.5, geo.baseY + h * 0.02, geo.baseX - geo.stepW * 0.6, geo.baseY);
  ctx.lineTo(geo.x(geo.topStep) + geo.stepW * 0.6, geo.y(geo.topStep));
  ctx.quadraticCurveTo(w * 0.94, geo.y(geo.topStep) + h * 0.02, w + 20, geo.y(geo.topStep) + h * 0.06);
  ctx.lineTo(w + 20, h + 20);
  ctx.closePath();
  ctx.fill();

  // Bare earth under the treads so the logs read as cut into the hill.
  ctx.fillStyle = "#b98b58";
  ctx.beginPath();
  ctx.moveTo(geo.baseX - geo.stepW * 0.55, geo.baseY);
  ctx.lineTo(geo.x(geo.topStep) + geo.stepW * 0.55, geo.y(geo.topStep));
  ctx.lineTo(geo.x(geo.topStep) + geo.stepW * 0.55, geo.y(geo.topStep) + geo.stepH * 2.1);
  ctx.lineTo(geo.baseX - geo.stepW * 0.55, geo.baseY + geo.stepH * 2.1);
  ctx.closePath();
  ctx.fill();
}

function drawLog(ctx, cx, cy, len, thick) {
  const half = len / 2;
  // Body.
  const grad = ctx.createLinearGradient(0, cy - thick / 2, 0, cy + thick / 2);
  grad.addColorStop(0, WOOD_LIGHT);
  grad.addColorStop(0.55, WOOD);
  grad.addColorStop(1, WOOD_DARK);
  ctx.fillStyle = grad;
  roundRect(ctx, cx - half, cy - thick / 2, len, thick, thick * 0.42);
  ctx.fill();

  // Bark grain.
  ctx.strokeStyle = "rgba(90, 58, 26, 0.28)";
  ctx.lineWidth = Math.max(0.7, thick * 0.07);
  for (let i = 0; i < 3; i += 1) {
    const y = cy - thick * 0.22 + thick * 0.22 * i;
    ctx.beginPath();
    ctx.moveTo(cx - half * 0.72, y);
    ctx.lineTo(cx + half * 0.72, y);
    ctx.stroke();
  }

  // Sawn end cap facing the camera.
  ctx.fillStyle = "#d9b184";
  ctx.beginPath();
  ctx.ellipse(cx + half - thick * 0.16, cy, thick * 0.19, thick * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(124, 83, 39, 0.6)";
  ctx.lineWidth = Math.max(0.6, thick * 0.06);
  ctx.beginPath();
  ctx.ellipse(cx + half - thick * 0.16, cy, thick * 0.1, thick * 0.28, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawStairs(ctx, geo) {
  const thick = Math.max(5, geo.stepH * 0.92);
  const len = geo.stepW * 1.34;
  for (let s = 1; s <= geo.topStep; s += 1) {
    const cx = geo.x(s);
    const cy = geo.y(s) + thick * 0.5;
    // Shadow the step throws onto the earth below it.
    ctx.fillStyle = "rgba(60, 40, 20, 0.18)";
    roundRect(ctx, cx - len / 2, cy + thick * 0.42, len, thick * 0.5, thick * 0.25);
    ctx.fill();
    drawLog(ctx, cx, cy, len, thick);
  }
}

function drawGate(ctx, geo, h) {
  // The wooden gate at the summit — the finish line the whole climb aims at.
  const x = geo.x(geo.topStep);
  const y = geo.y(geo.topStep);
  // The gate is the finish line, so it must always be *in* the picture and out
  // from under the HUD rail. The rail is a fixed-size pill — about 44px however
  // big the stage is — so the clearance is measured in pixels, not in fractions
  // of the height: on a short tablet-landscape stage a fractional margin puts
  // the crossbeam behind it, and on a tall phone one it would send the whole
  // gate off the top of the canvas.
  const HUD_PX = 50;
  const postH = Math.min(h * 0.235, Math.max(h * 0.07, y - HUD_PX));
  const postW = Math.max(5, h * 0.021);
  const span = geo.stepW * 2.3;

  ctx.fillStyle = WOOD_DARK;
  roundRect(ctx, x - span / 2, y - postH, postW, postH, postW * 0.3);
  ctx.fill();
  roundRect(ctx, x + span / 2 - postW, y - postH, postW, postH, postW * 0.3);
  ctx.fill();

  ctx.fillStyle = WOOD;
  roundRect(ctx, x - span * 0.62, y - postH, span * 1.24, postW * 1.5, postW * 0.5);
  ctx.fill();
  ctx.fillStyle = WOOD_LIGHT;
  roundRect(ctx, x - span * 0.54, y - postH + postW * 2.1, span * 1.08, postW * 1.05, postW * 0.4);
  ctx.fill();
}

function drawFlowers(ctx, geo, w, h) {
  const colors = ["#ffd94a", "#ff8fb1", "#ffffff", "#ffd94a"];
  for (let i = 0; i < 26; i += 1) {
    const t = hash(i * 9.13);
    const x = t * w;
    // Keep them off the staircase itself, above or below the stair line.
    const stairY = geo.baseY - ((x - geo.baseX) / geo.stepW) * geo.stepH;
    const below = hash(i * 3.71) > 0.45;
    const y = below
      ? stairY + geo.stepH * (2.6 + hash(i * 1.9) * 4)
      : stairY - geo.stepH * (1.6 + hash(i * 5.2) * 3.4);
    if (y < h * 0.6 || y > h * 1.02) continue;
    const r = Math.max(1.6, h * (0.006 + hash(i * 6.6) * 0.005));
    ctx.fillStyle = colors[i % colors.length];
    for (let p = 0; p < 5; p += 1) {
      const a = (p / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, r * 0.62, r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#f0a93a";
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.5, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Climbers ─────────────────────────────────────────────────────────────────
function drawClimber(ctx, x, feetY, size, color, { stride = 0, cheer = 0, slump = 0 } = {}) {
  const dark = shade(color, 0.7);
  const light = shade(color, 1.2);
  const headR = size * 0.2;
  const hipY = feetY - size * 0.46;
  const shoulderY = feetY - size * 0.72;
  const headCY = feetY - size * 0.9 + slump * size * 0.06;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.fillStyle = "rgba(30, 40, 20, 0.2)";
  ctx.beginPath();
  ctx.ellipse(x, feetY + size * 0.02, size * 0.26, size * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs.
  ctx.strokeStyle = dark;
  ctx.lineWidth = size * 0.11;
  const swing = Math.sin(stride) * size * 0.16;
  ctx.beginPath();
  ctx.moveTo(x, hipY);
  ctx.lineTo(x - size * 0.09 + swing, feetY);
  ctx.moveTo(x, hipY);
  ctx.lineTo(x + size * 0.09 - swing, feetY);
  ctx.stroke();

  // Torso.
  const torso = ctx.createLinearGradient(x - size * 0.16, 0, x + size * 0.16, 0);
  torso.addColorStop(0, light);
  torso.addColorStop(1, dark);
  ctx.fillStyle = torso;
  roundRect(ctx, x - size * 0.16, shoulderY, size * 0.32, hipY - shoulderY + size * 0.06, size * 0.12);
  ctx.fill();

  // Arms — raised when cheering, hanging when slumped.
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.085;
  const armY = shoulderY + size * 0.06;
  const lift = cheer * size * 0.42;
  ctx.beginPath();
  ctx.moveTo(x - size * 0.14, armY);
  ctx.lineTo(x - size * 0.26 - cheer * size * 0.04, armY + size * 0.24 - lift + slump * size * 0.05);
  ctx.moveTo(x + size * 0.14, armY);
  ctx.lineTo(x + size * 0.26 + cheer * size * 0.04, armY + size * 0.24 - lift + slump * size * 0.05);
  ctx.stroke();

  // Head — faceless, like the runners in the other minis. At this size a face is
  // three dark specks that read as noise, and leaving it off keeps every climber
  // identified by their colour alone.
  ctx.fillStyle = "#f3cfa8";
  ctx.beginPath();
  ctx.arc(x, headCY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(color, 0.55);
  ctx.beginPath();
  ctx.arc(x, headCY - headR * 0.28, headR * 1.02, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBalloon(ctx, x, y, size, number, color, clashed, pop, scale = 1) {
  const r = size * 0.42 * pop * scale;
  if (r <= 0.5) return;
  ctx.save();
  ctx.strokeStyle = "rgba(60, 50, 40, 0.5)";
  ctx.lineWidth = Math.max(1, size * 0.03);
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.lineTo(x, y + r * 1.7);
  ctx.stroke();

  ctx.fillStyle = "rgba(20, 30, 40, 0.2)";
  ctx.beginPath();
  ctx.arc(x + r * 0.08, y + r * 0.1, r, 0, Math.PI * 2);
  ctx.fill();

  // A clash desaturates the balloon rather than crossing it out: the number is
  // the whole point of the reveal, so it has to stay readable — the rejection
  // goes in a badge on the rim instead of over the digit.
  // `shade` only parses hex, so the dim factor is folded into the stops rather
  // than shading an already-shaded rgb() string.
  const dim = clashed ? 0.58 : 1;
  const grad = ctx.createRadialGradient(x - r * 0.32, y - r * 0.36, r * 0.1, x, y, r);
  grad.addColorStop(0, shade(color, 1.45 * dim));
  grad.addColorStop(1, shade(color, 0.95 * dim));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = clashed ? "rgba(255, 255, 255, 0.45)" : "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = Math.max(1.2, r * 0.1);
  ctx.stroke();

  ctx.fillStyle = clashed ? "rgba(255, 255, 255, 0.72)" : "#ffffff";
  ctx.font = `700 ${Math.round(r * 1.2)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(number), x, y + r * 0.04);

  if (clashed) {
    const bx = x + r * 0.72;
    const by = y - r * 0.72;
    const br = r * 0.44;
    ctx.fillStyle = "#e33b3b";
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(1.4, br * 0.28);
    ctx.beginPath();
    ctx.moveTo(bx - br * 0.42, by - br * 0.42);
    ctx.lineTo(bx + br * 0.42, by + br * 0.42);
    ctx.moveTo(bx + br * 0.42, by - br * 0.42);
    ctx.lineTo(bx - br * 0.42, by + br * 0.42);
    ctx.stroke();
  }
  ctx.restore();
}

// The marker every climber wears while the numbers are being chosen: a chevron
// over their head that is hollow and drifting while they are still deciding and
// drops onto them, solid, the moment they settle. It never says *which* number
// was picked — the choice is simultaneous and secret until the reveal — only
// that this climber is done thinking, which is the tension the ten seconds are
// made of.
function drawPickArrow(ctx, x, y, size, color, locked, timeMs, phase, stem = 0) {
  const w = size * 0.38;
  const h = size * 0.3;
  const bob = locked ? 0 : Math.sin(timeMs / 260 + phase) * size * 0.11;
  const cy = y + bob;

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // On a crowded step the chevrons are lifted into lanes to stay legible, which
  // moves them off their owner's head; a stem down to the head says whose is
  // whose without any of them being pushed back into the pile.
  if (stem > 0) {
    ctx.strokeStyle = shade(color, 1.1);
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = Math.max(1, size * 0.045);
    ctx.beginPath();
    ctx.moveTo(x, cy + h / 2);
    ctx.lineTo(x, cy + h / 2 + stem);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.beginPath();
  ctx.moveTo(x - w / 2, cy - h / 2);
  ctx.lineTo(x, cy + h / 2);
  ctx.lineTo(x + w / 2, cy - h / 2);

  if (locked) {
    ctx.closePath();
    ctx.fillStyle = shade(color, 1.08);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
    ctx.lineWidth = Math.max(1.2, size * 0.055);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = Math.max(1.6, size * 0.085);
    ctx.stroke();
    ctx.strokeStyle = shade(color, 1.1);
    ctx.lineWidth = Math.max(1, size * 0.05);
    ctx.stroke();
  }

  ctx.restore();
}

// "Three more and they are through the gate." The number a climber still needs
// is the one fact that decides the endgame, so it is painted next to them
// rather than only in the scoreboard — which the mobile shell hides when it
// isolates the stage.
function drawNeedTag(ctx, x, y, size, needs) {
  const h = size * 0.34;
  const w = size * 0.62;
  ctx.save();
  ctx.fillStyle = "rgba(52, 34, 16, 0.72)";
  roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = "#ffe6a8";
  ctx.font = `700 ${Math.round(h * 0.68)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`▲${needs}`, x, y + h * 0.04);
  ctx.restore();
}

// Climbers standing on the same step are fanned across the tread — sideways to
// separate the bodies, and in depth so four of them on step 0 at kick-off read
// as four people rather than one smear.
function laneSlots(count, stepW, stepH) {
  if (count <= 1) return [{ dx: 0, dy: 0, lane: 0 }];
  const spread = stepW * (count <= 2 ? 0.72 : 1.16);
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    return {
      dx: -spread / 2 + spread * t,
      dy: (t - 0.5) * stepH * 0.5,
      lane: i,
    };
  });
}

/**
 * Paint one frame.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} snap  runtime snapshot (see PasoAPasoRuntime#snapshot)
 * @param {number} w     CSS width
 * @param {number} h     CSS height
 * @param {number} timeMs monotonic clock, only used for idle motion
 */
export function drawScene(ctx, snap, w, h, timeMs = 0) {
  const topStep = snap?.topStep ?? 12;
  const geo = stairGeometry(w, h, topStep);

  ctx.save();
  ctx.clearRect(0, 0, w, h);
  drawSky(ctx, w, h);
  drawClouds(ctx, w, h, timeMs);
  drawMountains(ctx, w, h);
  drawHills(ctx, w, h);
  drawFence(ctx, w, h);
  drawSlope(ctx, geo, w, h);
  drawGate(ctx, geo, h);
  drawStairs(ctx, geo);
  drawFlowers(ctx, geo, w, h);

  const players = snap?.players ?? [];
  const climbing = snap?.screen === "climb";
  const t = climbing ? easeOutCubic(Math.min(1, snap?.climbProgress ?? 1)) : 1;

  // Where each climber is right now, as a fractional step.
  const positions = players.map((p) => {
    const from = p.fromStep ?? p.step;
    return climbing ? from + (p.step - from) * t : p.step;
  });

  // Group by the step they are drawn on so a shared tread spreads them out.
  const buckets = new Map();
  positions.forEach((pos, i) => {
    const key = Math.round(pos);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(i);
  });
  const slots = new Array(players.length).fill(null);
  const crowd = new Array(players.length).fill(1);
  for (const group of buckets.values()) {
    const lanes = laneSlots(group.length, geo.stepW, geo.stepH);
    group.forEach((idx, i) => {
      slots[idx] = lanes[i];
      crowd[idx] = group.length;
    });
  }

  const size = geo.climberSize;
  const won = snap?.screen === "gameover";
  const winners = new Set(snap?.winners ?? []);

  // Painter's order: the lowest climber is nearest the camera, so draw the
  // highest ones first and let the near ones overlap them.
  const order = players.map((_, i) => i).sort((a, b) => positions[b] - positions[a]);

  for (const i of order) {
    const p = players[i];
    const pos = positions[i];
    const slot = slots[i] ?? { dx: 0, dy: 0, lane: 0 };
    const cx = geo.x(pos) + slot.dx;
    const feetY = geo.y(pos) + slot.dy;
    const stride = climbing && p.gain > 0 ? (timeMs / 90) + i : 0;
    // Climbers hop while they walk up; the arc reads as effort on a staircase.
    const hop = climbing && p.gain > 0 ? Math.abs(Math.sin(timeMs / 90 + i)) * geo.stepH * 0.28 : 0;
    const cheer = won && winners.has(p.id) ? 1 : snap?.screen === "reveal" && p.unique ? 0.5 : 0;
    const slump = snap?.screen === "reveal" && p.pick != null && !p.unique ? 1 : 0;

    drawClimber(ctx, cx, feetY - hop, size, p.color, { stride, cheer, slump });

    if (snap?.screen === "pick") {
      // Four climbers share a step at kick-off and the tread is only so wide, so
      // on a busy step the markers climb in lanes instead of stacking into one
      // illegible pile.
      const lift = crowd[i] >= 3 ? slot.lane * size * 0.34 : 0;
      // Everyone wears a chevron while the numbers are being chosen; it settles
      // onto whoever has already made up their mind.
      drawPickArrow(
        ctx, cx, feetY - hop - size * 1.42 - lift, size, p.color, Boolean(p.locked), timeMs, i * 1.7,
        lift,
      );
      // A climber within one round of the gate also wears the number they need —
      // that is the whole endgame, on the board. It sits above the chevron.
      if (p.needs != null && p.needs > 0 && p.needs <= 5) {
        drawNeedTag(ctx, cx, feetY - hop - size * 1.95 - lift, size, p.needs);
      }
    }

    if (snap?.revealed && p.pick != null && snap.screen !== "gameover") {
      const pop = snap.screen === "reveal"
        ? Math.min(1, (snap.revealProgress ?? 1) * 3.2)
        : 1;
      // A busy step shrinks the balloons and stacks them at alternating heights;
      // otherwise four discs land on top of each other and nothing is readable.
      const scale = crowd[i] >= 3 ? 0.7 : 1;
      const stagger = crowd[i] >= 3 ? (slot.lane % 2) * size * 0.62 : 0;
      drawBalloon(
        ctx,
        cx,
        feetY - hop - size * 1.22 - stagger,
        size,
        p.pick,
        p.color,
        !p.unique,
        pop,
        scale,
      );
    }
  }

  ctx.restore();
}

export default drawScene;
