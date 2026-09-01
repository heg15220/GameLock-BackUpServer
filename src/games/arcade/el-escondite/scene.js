// Canvas scene for El Escondite.
//
// A park seen from a raised corner, the way the Wii original frames it, with
// seven pieces of playground scattered across it: a climbing tower, a dome, a
// hut, a tube, a bush, a toy plane and a fountain. Each one is a hiding place
// and a hit target, so the layout lives in `SPOTS` as fractions of the canvas
// and both the painter and the pointer read from that same list — the picture
// and the hit test can never disagree.
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

const GRASS_FAR = "#7ec06a";
const GRASS_NEAR = "#5aa74d";
const PATH = "#e3c893";
const WOOD = "#a9763f";
const WOOD_DARK = "#7c5327";

/**
 * The seven hiding places, in fractions of the stage. The positions are spread
 * on both axes so the same list reads correctly in a 16:9 stage and in the tall
 * box a phone gives it.
 */
export const SPOTS = [
  { id: 0, kind: "tower", x: 0.14, y: 0.3 },
  { id: 1, kind: "dome", x: 0.42, y: 0.22 },
  { id: 2, kind: "hut", x: 0.76, y: 0.24 },
  { id: 3, kind: "tube", x: 0.16, y: 0.6 },
  { id: 4, kind: "bush", x: 0.46, y: 0.55 },
  { id: 5, kind: "plane", x: 0.8, y: 0.58 },
  { id: 6, kind: "fountain", x: 0.46, y: 0.86 },
];

/** Pixel geometry of the spots for a given canvas size. */
export function spotLayout(w, h) {
  const r = Math.max(20, Math.min(w, h) * 0.115);
  return SPOTS.map((spot) => ({ ...spot, cx: spot.x * w, cy: spot.y * h, r }));
}

/** Which place a pointer at (px, py) is over, or null. */
export function spotAt(w, h, px, py) {
  let best = null;
  let bestDist = Infinity;
  for (const spot of spotLayout(w, h)) {
    const d = Math.hypot(px - spot.cx, py - spot.cy);
    if (d <= spot.r * 1.12 && d < bestDist) {
      bestDist = d;
      best = spot.id;
    }
  }
  return best;
}

// ── Background ───────────────────────────────────────────────────────────────
function drawPark(ctx, w, h, timeMs) {
  drawSky(ctx, w, h);

  const drift = (timeMs / 1000) * 4;
  for (let i = 0; i < 4; i += 1) {
    const span = w + 240;
    const x = ((hash(i * 3.7) * span + drift * (0.4 + hash(i) * 0.5)) % span) - 120;
    drawCloud(ctx, x, h * (0.05 + hash(i * 5.3) * 0.08), h * (0.03 + hash(i * 2.1) * 0.02), 0.8);
  }

  // Two bands of grass so the park has a horizon rather than a flat wash.
  ctx.fillStyle = GRASS_FAR;
  ctx.beginPath();
  ctx.moveTo(-10, h);
  ctx.lineTo(-10, h * 0.16);
  ctx.quadraticCurveTo(w * 0.5, h * 0.1, w + 10, h * 0.16);
  ctx.lineTo(w + 10, h);
  ctx.closePath();
  ctx.fill();

  const near = ctx.createLinearGradient(0, h * 0.3, 0, h);
  near.addColorStop(0, GRASS_FAR);
  near.addColorStop(1, GRASS_NEAR);
  ctx.fillStyle = near;
  ctx.beginPath();
  ctx.moveTo(-10, h);
  ctx.lineTo(-10, h * 0.42);
  ctx.quadraticCurveTo(w * 0.35, h * 0.36, w * 0.68, h * 0.46);
  ctx.quadraticCurveTo(w * 0.88, h * 0.52, w + 10, h * 0.44);
  ctx.lineTo(w + 10, h);
  ctx.closePath();
  ctx.fill();

  // A sandy path curling through the middle, purely to break up the green.
  ctx.strokeStyle = PATH;
  ctx.lineWidth = Math.max(8, h * 0.055);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-10, h * 0.72);
  ctx.quadraticCurveTo(w * 0.3, h * 0.62, w * 0.6, h * 0.72);
  ctx.quadraticCurveTo(w * 0.85, h * 0.8, w + 10, h * 0.66);
  ctx.stroke();

  // Flowers, deterministic so they never shimmer.
  for (let i = 0; i < 22; i += 1) {
    const x = hash(i * 9.1) * w;
    const y = h * (0.24 + hash(i * 4.3) * 0.72);
    const r = Math.max(1.4, h * 0.006);
    ctx.fillStyle = ["#ffd94a", "#ffffff", "#ff8fb1"][i % 3];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── The seven hiding places ──────────────────────────────────────────────────
function drawTower(ctx, r) {
  ctx.fillStyle = WOOD_DARK;
  roundRect(ctx, -r * 0.5, -r * 0.1, r * 0.16, r * 0.9, r * 0.06);
  ctx.fill();
  roundRect(ctx, r * 0.34, -r * 0.1, r * 0.16, r * 0.9, r * 0.06);
  ctx.fill();
  ctx.fillStyle = "#4fb0d8";
  roundRect(ctx, -r * 0.62, -r * 0.28, r * 1.24, r * 0.3, r * 0.1);
  ctx.fill();
  ctx.fillStyle = "#e0574f";
  ctx.beginPath();
  ctx.moveTo(-r * 0.72, -r * 0.3);
  ctx.lineTo(0, -r * 0.92);
  ctx.lineTo(r * 0.72, -r * 0.3);
  ctx.closePath();
  ctx.fill();
  // Slide.
  ctx.strokeStyle = "#ffc94a";
  ctx.lineWidth = r * 0.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(r * 0.5, -r * 0.05);
  ctx.lineTo(r * 0.95, r * 0.72);
  ctx.stroke();
}

function drawDome(ctx, r) {
  ctx.fillStyle = "#f5f2ee";
  ctx.beginPath();
  ctx.arc(0, r * 0.5, r * 0.86, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f08fb0";
  ctx.beginPath();
  ctx.arc(0, r * 0.5, r * 0.86, Math.PI * 1.08, Math.PI * 1.62);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#3b3128";
  ctx.beginPath();
  ctx.arc(0, r * 0.52, r * 0.34, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-r * 0.34, r * 0.5, r * 0.68, r * 0.04);
}

function drawHut(ctx, r) {
  ctx.fillStyle = "#f0e2c8";
  roundRect(ctx, -r * 0.6, -r * 0.15, r * 1.2, r * 0.75, r * 0.08);
  ctx.fill();
  ctx.fillStyle = "#3b3128";
  roundRect(ctx, -r * 0.22, r * 0.12, r * 0.44, r * 0.48, r * 0.05);
  ctx.fill();
  ctx.fillStyle = "#4aa3c8";
  ctx.beginPath();
  ctx.moveTo(-r * 0.78, -r * 0.15);
  ctx.lineTo(0, -r * 0.82);
  ctx.lineTo(r * 0.78, -r * 0.15);
  ctx.closePath();
  ctx.fill();
}

function drawTube(ctx, r) {
  const colors = ["#e0574f", "#ffc94a", "#4fb0d8", "#7bc86c"];
  for (let i = 0; i < 4; i += 1) {
    ctx.fillStyle = colors[i];
    roundRect(ctx, -r * 0.9 + i * r * 0.45, -r * 0.32, r * 0.46, r * 0.66, r * 0.12);
    ctx.fill();
  }
  ctx.fillStyle = "#2f2a22";
  ctx.beginPath();
  ctx.ellipse(-r * 0.86, r * 0.01, r * 0.14, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBush(ctx, r) {
  ctx.fillStyle = "#3f8f42";
  ctx.beginPath();
  ctx.ellipse(-r * 0.34, r * 0.2, r * 0.46, r * 0.4, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 0.34, r * 0.22, r * 0.44, r * 0.38, 0, 0, Math.PI * 2);
  ctx.ellipse(0, -r * 0.08, r * 0.56, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#54a755";
  ctx.beginPath();
  ctx.ellipse(-r * 0.12, -r * 0.2, r * 0.3, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlane(ctx, r) {
  ctx.fillStyle = "#4f7fe0";
  roundRect(ctx, -r * 0.85, -r * 0.16, r * 1.6, r * 0.44, r * 0.2);
  ctx.fill();
  ctx.fillStyle = "#e0574f";
  roundRect(ctx, -r * 0.3, -r * 0.5, r * 0.9, r * 0.24, r * 0.1);
  ctx.fill();
  ctx.fillStyle = "#ffc94a";
  ctx.beginPath();
  ctx.moveTo(r * 0.6, -r * 0.16);
  ctx.lineTo(r * 0.95, -r * 0.62);
  ctx.lineTo(r * 0.98, -r * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#2f2a22";
  ctx.beginPath();
  ctx.arc(-r * 0.45, r * 0.3, r * 0.16, 0, Math.PI * 2);
  ctx.arc(r * 0.42, r * 0.3, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
}

function drawFountain(ctx, r) {
  ctx.fillStyle = "#c9c2b4";
  ctx.beginPath();
  ctx.ellipse(0, r * 0.36, r * 0.9, r * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7ec9e8";
  ctx.beginPath();
  ctx.ellipse(0, r * 0.34, r * 0.72, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c9c2b4";
  roundRect(ctx, -r * 0.12, -r * 0.5, r * 0.24, r * 0.8, r * 0.06);
  ctx.fill();
  ctx.fillStyle = "#a9dcf2";
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.58, r * 0.24, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
}

const PAINTERS = {
  tower: drawTower,
  dome: drawDome,
  hut: drawHut,
  tube: drawTube,
  bush: drawBush,
  plane: drawPlane,
  fountain: drawFountain,
};

function drawResultBadge(ctx, r, hits) {
  // Below the object, not above it: the top row of places sits under the HUD
  // rail and a badge up there would be half-hidden by it.
  const br = r * 0.36;
  const bx = r * 0.78;
  const by = r * 0.5;
  ctx.fillStyle = hits > 0 ? "#2f9e4f" : "#8b8577";
  ctx.beginPath();
  ctx.arc(bx, by, br, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1.6, br * 0.24);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  if (hits > 0) {
    ctx.moveTo(bx - br * 0.42, by);
    ctx.lineTo(bx - br * 0.08, by + br * 0.36);
    ctx.lineTo(bx + br * 0.45, by - br * 0.38);
  } else {
    ctx.moveTo(bx - br * 0.36, by - br * 0.36);
    ctx.lineTo(bx + br * 0.36, by + br * 0.36);
    ctx.moveTo(bx + br * 0.36, by - br * 0.36);
    ctx.lineTo(bx - br * 0.36, by + br * 0.36);
  }
  ctx.stroke();
}

const HIDER_COLORS = ["#e04f5f", "#2f9e4f", "#e8a317"];

/**
 * Paint one frame.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} snap    runtime snapshot
 * @param {number} w       CSS width
 * @param {number} h       CSS height
 * @param {number} timeMs  monotonic clock, for idle motion
 * @param {number|null} hoverId  the place the pointer is over
 */
export function drawScene(ctx, snap, w, h, timeMs = 0, hoverId = null) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  drawPark(ctx, w, h, timeMs);

  const spots = spotLayout(w, h);
  const snapSpots = snap?.spots ?? [];
  const playing = snap?.screen === "seeking";

  // Painter's order: lower on the canvas is nearer the camera.
  const order = [...spots].sort((a, b) => a.cy - b.cy);

  for (const spot of order) {
    const state = snapSpots[spot.id] ?? {};
    const r = spot.r;
    const reveal = state.reveal ?? 0;
    const hovered = playing && hoverId === spot.id && !state.searched;

    ctx.save();
    ctx.translate(spot.cx, spot.cy);

    // Ground shadow under the object.
    ctx.fillStyle = "rgba(30, 45, 20, 0.16)";
    ctx.beginPath();
    ctx.ellipse(0, r * 0.72, r * 0.85, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    if (hovered) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = Math.max(2, r * 0.07);
      ctx.setLineDash([r * 0.24, r * 0.18]);
      ctx.beginPath();
      ctx.ellipse(0, r * 0.62, r * 1.02, r * 0.36, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.save();
    if (state.searched) ctx.globalAlpha = 0.62;
    (PAINTERS[spot.kind] ?? drawBush)(ctx, r);
    ctx.restore();

    // Hiders that were caught here step out and stay out.
    const caught = state.searched ? state.hits ?? 0 : 0;
    for (let i = 0; i < caught; i += 1) {
      const pop = 1 - reveal * 0.5;
      const px = (i - (caught - 1) / 2) * r * 0.5;
      drawFacelessMii(ctx, {
        x: px,
        feetY: r * 0.78,
        size: r * 0.78 * pop,
        color: HIDER_COLORS[i % HIDER_COLORS.length],
        slump: 1,
        shadow: 0.14,
      });
    }

    if (state.searched) drawResultBadge(ctx, r, state.hits ?? 0);

    // Once the round is over, the places that were never searched admit what
    // they were holding — otherwise a loss teaches you nothing.
    if (!playing && !state.searched && (state.occupied ?? 0) > 0) {
      const n = state.occupied;
      for (let i = 0; i < n; i += 1) {
        const px = (i - (n - 1) / 2) * r * 0.5;
        ctx.globalAlpha = 0.9;
        drawFacelessMii(ctx, {
          x: px,
          feetY: r * 0.78,
          size: r * 0.72,
          color: HIDER_COLORS[i % HIDER_COLORS.length],
          cheer: 1,
          shadow: 0.12,
        });
        ctx.globalAlpha = 1;
      }
    }

    ctx.restore();

    // The number that searches this place from the keyboard.
    if (playing && !state.searched) {
      const label = String(spot.id + 1);
      const lr = Math.max(9, r * 0.24);
      ctx.fillStyle = "rgba(40, 30, 16, 0.55)";
      ctx.beginPath();
      ctx.arc(spot.cx - r * 0.78, spot.cy + r * 0.66, lr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff3d6";
      ctx.font = `700 ${Math.round(lr * 1.15)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, spot.cx - r * 0.78, spot.cy + r * 0.66 + lr * 0.05);
    }
  }

  ctx.restore();
}

export default drawScene;
