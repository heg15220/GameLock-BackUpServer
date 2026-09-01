// Canvas scene for La Comba.
//
// A town square seen side-on: two turners at the edges, a long rope between
// them, five jumpers in the middle. The rope is the entire interface — the beat
// is the instant it touches the ground, so nothing else has to tell you when to
// press. A contracting ring under the rope repeats that cue for players who
// would rather watch a meter than a rope.
//
// Everything is drawn procedurally; nothing is loaded.

import {
  drawCloud,
  drawFacelessMii,
  drawSky,
  hash,
  roundRect,
  shade,
} from "../shared/wiiPartyCanvas.js";

const GROUND = "#c8a678";
const GROUND_DARK = "#a9885c";
const ROPE = "#e8d24a";

const JUMPER_COLORS = ["#e04f5f", "#2f9e4f", "#e8a317", "#8f5fd0", "#e07f3f"];
const TURNER_COLORS = ["#2f6fe0", "#3aa8c0"];

/** Where everything stands, derived from the canvas box. */
export function squareLayout(w, h) {
  const groundY = h * 0.82;
  const turnerSize = Math.max(26, Math.min(h * 0.24, w * 0.13));
  const margin = Math.max(turnerSize * 0.9, w * 0.1);
  return {
    groundY,
    turnerSize,
    leftX: margin,
    rightX: w - margin,
    // The rope leaves the turners' hands at shoulder height.
    handY: groundY - turnerSize * 0.62,
    jumperSize: turnerSize * 0.84,
  };
}

// ── Background ───────────────────────────────────────────────────────────────
function drawBuilding(ctx, x, y, w, h, body, roof) {
  ctx.fillStyle = body;
  roundRect(ctx, x, y - h, w, h, w * 0.04);
  ctx.fill();
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.08, y - h);
  ctx.lineTo(x + w * 0.5, y - h - w * 0.24);
  ctx.lineTo(x + w * 1.08, y - h);
  ctx.closePath();
  ctx.fill();

  // Windows on a fixed grid so they never shimmer.
  ctx.fillStyle = "rgba(60, 78, 96, 0.72)";
  const cols = Math.max(2, Math.round(w / (w * 0.3)));
  const rows = Math.max(2, Math.round(h / (h * 0.3)));
  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      const ww = w * 0.16;
      const wh = h * 0.16;
      ctx.fillRect(
        x + w * 0.14 + c * (w * 0.72) / Math.max(1, cols - 1) - ww / 2,
        y - h + h * 0.18 + r * (h * 0.62) / Math.max(1, rows - 1) - wh / 2,
        ww,
        wh,
      );
    }
  }
}

function drawSquare(ctx, w, h, timeMs, layout) {
  drawSky(ctx, w, h, "#5cb2e8", "#dff0fb");

  const drift = (timeMs / 1000) * 4;
  for (let i = 0; i < 4; i += 1) {
    const span = w + 240;
    const x = ((hash(i * 3.3) * span + drift * (0.4 + hash(i) * 0.5)) % span) - 120;
    drawCloud(ctx, x, h * (0.06 + hash(i * 6.1) * 0.08), h * (0.028 + hash(i * 2.7) * 0.02), 0.82);
  }

  // A row of townhouses along the back of the square.
  const roofY = layout.groundY - h * 0.02;
  const palette = [
    ["#e9d6bc", "#c06a52"],
    ["#dfc9a8", "#a85a46"],
    ["#efe1c8", "#b8654e"],
    ["#e2cdb0", "#9e5140"],
  ];
  const count = Math.max(3, Math.round(w / (h * 0.42)));
  for (let i = 0; i < count; i += 1) {
    const bw = w / count;
    const bh = h * (0.24 + hash(i * 5.9) * 0.14);
    const [body, roof] = palette[i % palette.length];
    drawBuilding(ctx, i * bw + bw * 0.06, roofY, bw * 0.88, bh, body, roof);
  }

  // The paved square itself.
  const ground = ctx.createLinearGradient(0, layout.groundY, 0, h);
  ground.addColorStop(0, GROUND);
  ground.addColorStop(1, GROUND_DARK);
  ctx.fillStyle = ground;
  ctx.fillRect(0, layout.groundY, w, h - layout.groundY);

  // Paving lines, fanned toward the viewer.
  ctx.strokeStyle = "rgba(120, 92, 56, 0.3)";
  ctx.lineWidth = Math.max(1, h * 0.004);
  for (let i = 0; i <= 8; i += 1) {
    const t = i / 8;
    ctx.beginPath();
    ctx.moveTo(w * t, layout.groundY);
    ctx.lineTo(w * (t * 1.5 - 0.25), h);
    ctx.stroke();
  }
  for (let i = 1; i < 3; i += 1) {
    const y = layout.groundY + (h - layout.groundY) * (i / 3);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

// ── The rope ─────────────────────────────────────────────────────────────────
/**
 * The rope's control point for a phase. Phase 0 is the rope on the ground —
 * the beat — and it swings up over the jumpers and back down by phase 1.
 */
function ropeControlY(phase, layout, h) {
  const amp = (layout.groundY - layout.handY) + h * 0.3;
  return layout.handY + Math.cos(phase * Math.PI * 2) * amp;
}

function drawRope(ctx, layout, phase, h, sync) {
  const cy = ropeControlY(phase, layout, h);
  ctx.save();
  ctx.lineCap = "round";
  // A slack shadow of the rope, so it reads as a loop rather than a line.
  ctx.strokeStyle = "rgba(60, 45, 20, 0.18)";
  ctx.lineWidth = Math.max(3, h * 0.016);
  ctx.beginPath();
  ctx.moveTo(layout.leftX, layout.handY + h * 0.008);
  ctx.quadraticCurveTo((layout.leftX + layout.rightX) / 2, cy + h * 0.012, layout.rightX, layout.handY + h * 0.008);
  ctx.stroke();

  ctx.strokeStyle = sync < 0.35 ? shade("#e8d24a", 0.78) : ROPE;
  ctx.lineWidth = Math.max(2.4, h * 0.012);
  ctx.beginPath();
  ctx.moveTo(layout.leftX, layout.handY);
  ctx.quadraticCurveTo((layout.leftX + layout.rightX) / 2, cy, layout.rightX, layout.handY);
  ctx.stroke();
  ctx.restore();
}

// ── Feedback that floats off the jumpers ─────────────────────────────────────
function drawNote(ctx, x, y, s, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#3f6fd8";
  ctx.beginPath();
  ctx.ellipse(x, y, s * 0.42, s * 0.32, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + s * 0.3, y - s * 1.1, s * 0.13, s * 1.1);
  ctx.beginPath();
  ctx.moveTo(x + s * 0.43, y - s * 1.1);
  ctx.quadraticCurveTo(x + s * 0.95, y - s * 0.95, x + s * 0.8, y - s * 0.5);
  ctx.quadraticCurveTo(x + s * 0.78, y - s * 0.8, x + s * 0.43, y - s * 0.82);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSweat(ctx, x, y, s, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#6fc6f0";
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.7);
  ctx.quadraticCurveTo(x + s * 0.42, y, x, y + s * 0.42);
  ctx.quadraticCurveTo(x - s * 0.42, y, x, y - s * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Paint one frame.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} snap   runtime snapshot
 * @param {number} w      CSS width
 * @param {number} h      CSS height
 * @param {number} timeMs monotonic clock, for idle motion
 */
export function drawScene(ctx, snap, w, h, timeMs = 0) {
  const layout = squareLayout(w, h);
  const phase = snap?.ropePhase ?? 0;
  const sync = snap?.sync ?? 1;
  const playing = snap?.screen === "playing";
  const recovering = Boolean(snap?.recovering);

  ctx.save();
  ctx.clearRect(0, 0, w, h);
  drawSquare(ctx, w, h, timeMs, layout);

  // The rope passes behind the turners' backs on the way up and in front of the
  // jumpers on the way down; drawing it once behind everybody keeps the picture
  // simple and never hides a jumper at the moment that matters.
  if (!recovering) drawRope(ctx, layout, phase, h, sync);

  // Five jumpers in a row across the middle. They are airborne as the rope
  // sweeps the ground and land in between.
  const lift = Math.max(0, Math.cos(phase * Math.PI * 2)) ** 0.7;
  const jumperCount = JUMPER_COLORS.length;
  const spanStart = layout.leftX + (layout.rightX - layout.leftX) * 0.2;
  const spanEnd = layout.leftX + (layout.rightX - layout.leftX) * 0.8;
  for (let i = 0; i < jumperCount; i += 1) {
    const t = jumperCount === 1 ? 0.5 : i / (jumperCount - 1);
    const x = spanStart + (spanEnd - spanStart) * t;
    const hop = recovering ? 0 : lift * layout.jumperSize * 0.34;
    const feetY = layout.groundY - hop;
    drawFacelessMii(ctx, {
      x,
      feetY,
      size: layout.jumperSize,
      color: JUMPER_COLORS[i],
      cheer: recovering ? 0 : lift * 0.5,
      slump: recovering ? 1 : 0,
      shadow: 0.16,
    });

    // In time: musical notes. Out of time: sweat. Exactly the tell the original
    // describes, and the only feedback the scene gives about `sync`.
    if (playing && !recovering) {
      const bob = ((timeMs / 900 + i * 0.31) % 1);
      const y = feetY - layout.jumperSize * (1.25 + bob * 0.55);
      const s = layout.jumperSize * 0.2;
      if (sync >= 0.62) drawNote(ctx, x + layout.jumperSize * 0.32, y, s, (1 - bob) * 0.85);
      else if (sync <= 0.36) drawSweat(ctx, x + layout.jumperSize * 0.34, y, s, (1 - bob) * 0.9);
    }
  }

  // The two turners. Their outside arm swings with the rope, so the whole
  // picture turns together.
  const armPhase = phase * Math.PI * 2;
  for (const [i, x] of [layout.leftX, layout.rightX].entries()) {
    drawFacelessMii(ctx, {
      x,
      feetY: layout.groundY,
      size: layout.turnerSize,
      color: TURNER_COLORS[i],
      cheer: 0.45 + Math.cos(armPhase) * 0.35,
      back: true,
      shadow: 0.18,
    });
  }

  // The beat ring: it contracts onto the hit point as the rope comes down, so
  // the timing is readable even at a glance.
  if (playing && !recovering) {
    const cx = (layout.leftX + layout.rightX) / 2;
    // Kept high enough that the ring at full size still fits on the canvas.
    const cy = h * 0.88;
    const base = Math.max(8, Math.min(w, h) * 0.042);
    // Shrinks across the turn and snaps back at the beat.
    const grow = 1 + (1 - phase) * 1.6;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = Math.max(1.5, base * 0.13);
    ctx.beginPath();
    ctx.arc(cx, cy, base, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = phase > 0.86 || phase < 0.14 ? "#ffe27a" : "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = Math.max(2, base * 0.18);
    ctx.beginPath();
    ctx.arc(cx, cy, base * grow, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // The verdict on the last turn, fading out where it happened.
  const judge = snap?.lastJudge;
  if (playing && judge && judge.ageMs < 620) {
    const alpha = 1 - judge.ageMs / 620;
    const cx = (layout.leftX + layout.rightX) / 2;
    const cy = layout.groundY - layout.jumperSize * (1.6 + (1 - alpha) * 0.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle =
      judge.kind === "perfect" ? "#2f9e4f" : judge.kind === "good" ? "#d08a12" : "#d9483c";
    ctx.font = `800 ${Math.round(Math.min(w, h) * 0.062)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      judge.kind === "perfect" ? "♪" : judge.kind === "good" ? "•" : "✕",
      cx,
      cy,
    );
    ctx.restore();
  }

  ctx.restore();
}

export default drawScene;
