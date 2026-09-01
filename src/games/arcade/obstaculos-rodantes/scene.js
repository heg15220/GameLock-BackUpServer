// Canvas scene for Obstáculos Rodantes.
//
// A side view of the player's own stretch of bridge, scrolled so the runner sits
// a third of the way in and you can see what is coming. The other three racers
// are not drawn alongside — at this zoom they would be off-screen most of the
// race — they live in the position bar under the track, which is exactly where
// the original puts them.
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

const WOOD = "#d8ad72";
const WOOD_DARK = "#a97c46";
const WOOD_RAIL = "#8b5f31";
const BARREL = "#c98a46";
const LOG = "#b98a56";

const VIEW_M = 30;        // metres of bridge visible across the canvas
const ANCHOR = 0.3;       // where the runner sits, as a fraction of the width

/** Pixel geometry of the bridge for a canvas box. */
export function bridgeLayout(w, h) {
  // `railY` is the far edge of the bridge and `deckY` is the line everything
  // actually stands on, a good way into the planks. Standing on the far edge
  // reads as standing on the handrail.
  const railY = h * 0.64;
  const deckY = h * 0.82;
  const pxPerM = w / VIEW_M;
  return {
    railY,
    deckY,
    pxPerM,
    anchorX: w * ANCHOR,
    runnerSize: Math.max(24, Math.min(h * 0.2, w * 0.1)),
    // One metre of height in the world, in pixels.
    pxPerHeight: Math.max(14, h * 0.13),
  };
}

// ── Background ───────────────────────────────────────────────────────────────
function drawValley(ctx, w, h, scrollM, timeMs) {
  drawSky(ctx, w, h, "#57ade8", "#dceffa");

  // Warm sun and atmospheric rings keep the horizon from reading as a flat
  // blue fill while remaining entirely procedural.
  const sunX = w * 0.82;
  const sunY = h * 0.16;
  const sunR = Math.max(20, h * 0.075);
  const halo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.7);
  halo.addColorStop(0, "rgba(255,244,177,0.95)");
  halo.addColorStop(0.42, "rgba(255,225,133,0.38)");
  halo.addColorStop(1, "rgba(255,225,133,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(sunX - sunR * 3, sunY - sunR * 3, sunR * 6, sunR * 6);
  ctx.fillStyle = "#fff0a8";
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  const drift = (timeMs / 1000) * 3;
  for (let i = 0; i < 4; i += 1) {
    const span = w + 240;
    const x = ((hash(i * 4.1) * span + drift * (0.3 + hash(i) * 0.4)) % span) - 120;
    drawCloud(ctx, x, h * (0.06 + hash(i * 7.3) * 0.1), h * (0.03 + hash(i * 3.1) * 0.02), 0.8);
  }

  // Distant mountain silhouettes and nearer hills run at different parallax
  // rates, which makes speed legible even before the bridge planks rush past.
  const par = -scrollM * 3;
  ctx.fillStyle = "#87aeb0";
  ctx.beginPath();
  ctx.moveTo(-20, h * 0.62);
  for (let i = 0; i <= 7; i += 1) {
    const x = -20 + ((w + 40) / 7) * i;
    const peak = i % 2 ? 0.36 : 0.45;
    ctx.lineTo(x, h * (peak + hash(i * 8.2) * 0.08));
  }
  ctx.lineTo(w + 20, h * 0.66);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#8fbf74";
  ctx.beginPath();
  ctx.moveTo(-20, h);
  ctx.lineTo(-20, h * 0.56);
  for (let i = 0; i <= 8; i += 1) {
    const x = -20 + ((w + 40) / 8) * i;
    ctx.lineTo(x, h * (0.5 + hash(Math.floor((par / 90) + i) * 3.3) * 0.12));
  }
  ctx.lineTo(w + 20, h);
  ctx.closePath();
  ctx.fill();

  // Treetops peeking over the rail, scrolling with the deck.
  const treeSpacing = 90;
  const first = Math.floor(par / treeSpacing) - 1;
  for (let i = first; i < first + Math.ceil(w / treeSpacing) + 3; i += 1) {
    const x = i * treeSpacing - par;
    if (x < -80 || x > w + 80) continue;
    const s = h * (0.09 + hash(i * 5.7) * 0.05);
    ctx.fillStyle = i % 2 ? "#4f9950" : "#3f8544";
    ctx.beginPath();
    ctx.ellipse(x, h * 0.6, s, s * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // The gorge under the bridge, with a river sliding in the opposite parallax.
  const gorge = ctx.createLinearGradient(0, h * 0.58, 0, h);
  gorge.addColorStop(0, "#4e8c50");
  gorge.addColorStop(1, "#244e37");
  ctx.fillStyle = gorge;
  ctx.fillRect(0, h * 0.58, w, h);
  ctx.fillStyle = "rgba(91, 190, 217, 0.72)";
  ctx.beginPath();
  ctx.moveTo(w * 0.58, h * 0.6);
  ctx.quadraticCurveTo(w * 0.45 + (scrollM % 12) * 2, h * 0.78, w * 0.69, h);
  ctx.lineTo(w * 0.82, h);
  ctx.quadraticCurveTo(w * 0.58, h * 0.76, w * 0.64, h * 0.6);
  ctx.closePath();
  ctx.fill();
}

function drawDeck(ctx, w, h, layout, scrollM) {
  const { deckY, railY, pxPerM } = layout;

  // Planks: one every 1.2m, drawn from the scroll offset so they slide past.
  const plankM = 1.2;
  const startM = Math.floor(scrollM / plankM) * plankM;
  // Dark bridge body and support beams below the playable deck give it mass.
  ctx.fillStyle = "#654329";
  ctx.fillRect(0, railY + h * 0.18, w, h - railY);
  ctx.fillStyle = WOOD;
  ctx.fillRect(0, railY, w, h - railY);
  ctx.strokeStyle = WOOD_DARK;
  ctx.lineWidth = Math.max(1, h * 0.005);
  for (let m = startM; m < scrollM + VIEW_M + plankM; m += plankM) {
    const x = (m - scrollM) * pxPerM;
    ctx.beginPath();
    ctx.moveTo(x, railY);
    ctx.lineTo(x - h * 0.1, h);
    ctx.stroke();
  }

  // The far rail sits at the back of the planks, behind everything that runs.
  ctx.fillStyle = WOOD_RAIL;
  ctx.fillRect(0, railY - h * 0.055, w, h * 0.018);
  const postM = 3;
  const firstPost = Math.floor(scrollM / postM) * postM;
  for (let m = firstPost; m < scrollM + VIEW_M + postM; m += postM) {
    const x = (m - scrollM) * pxPerM;
    ctx.fillRect(x, railY - h * 0.055, Math.max(2, w * 0.006), h * 0.055);
  }

  // Lane seams across the perspective surface help place all four runners.
  ctx.strokeStyle = "rgba(101, 65, 31, 0.2)";
  ctx.lineWidth = Math.max(1, h * 0.004);
  for (let lane = 1; lane < 4; lane += 1) {
    const y = railY + ((deckY - railY) / 4) * lane;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

function drawSpeedLines(ctx, w, h, snap, timeMs) {
  const ratio = Math.max(0, Math.min(1.2, snap?.you?.speedRatio ?? 0));
  if (ratio < 0.72 || snap?.screen !== "racing") return;
  const count = Math.round(5 + ratio * 7);
  ctx.save();
  ctx.strokeStyle = `rgba(255,255,255,${0.06 + ratio * 0.08})`;
  ctx.lineCap = "round";
  for (let i = 0; i < count; i += 1) {
    const phase = ((timeMs * (0.00045 + ratio * 0.0002) + hash(i * 4.7)) % 1);
    const y = h * (0.28 + hash(i * 9.1) * 0.47);
    const x = w * (1 - phase);
    const len = w * (0.025 + ratio * 0.045);
    ctx.lineWidth = Math.max(1, h * 0.004 * ratio);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - len, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBarrel(ctx, x, y, r, roll) {
  ctx.save();
  ctx.translate(x, y - r);
  ctx.fillStyle = "rgba(60, 45, 20, 0.2)";
  ctx.beginPath();
  ctx.ellipse(0, r * 0.98, r * 0.95, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(roll);
  const grad = ctx.createLinearGradient(-r, 0, r, 0);
  grad.addColorStop(0, shade(BARREL, 0.78));
  grad.addColorStop(0.5, shade(BARREL, 1.12));
  grad.addColorStop(1, shade(BARREL, 0.78));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(90, 58, 26, 0.6)";
  ctx.lineWidth = Math.max(1.2, r * 0.12);
  for (const off of [-0.42, 0.42]) {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.98, off - 0.3, off + 0.3);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(120, 80, 34, 0.5)";
  ctx.lineWidth = Math.max(1, r * 0.09);
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, 0);
  ctx.lineTo(r * 0.7, 0);
  ctx.stroke();
  ctx.restore();
}

function drawLog(ctx, x, y, halfW, height, roll) {
  ctx.save();
  ctx.translate(x, y - height / 2);
  ctx.fillStyle = "rgba(60, 45, 20, 0.2)";
  ctx.beginPath();
  ctx.ellipse(0, height * 0.55, halfW, height * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  const grad = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
  grad.addColorStop(0, shade(LOG, 1.16));
  grad.addColorStop(1, shade(LOG, 0.76));
  ctx.fillStyle = grad;
  roundRect(ctx, -halfW, -height / 2, halfW * 2, height, height * 0.45);
  ctx.fill();
  ctx.strokeStyle = "rgba(90, 58, 26, 0.35)";
  ctx.lineWidth = Math.max(1, height * 0.08);
  ctx.beginPath();
  ctx.moveTo(-halfW * 0.6, Math.sin(roll) * height * 0.16);
  ctx.lineTo(halfW * 0.6, Math.sin(roll) * height * 0.16);
  ctx.stroke();
  ctx.restore();
}

const LANE_COLORS = ["#2f6fe0", "#e04f5f", "#2f9e4f", "#e8a317"];

// Where the other three actually are. The DOM has this too, but the mobile
// shell hides everything outside the stage, and a race you cannot see yourself
// losing is not a race — so it is painted here as well.
function drawPositionBar(ctx, snap, w, h) {
  const runners = snap?.runners ?? [];
  if (runners.length === 0) return;
  const barH = Math.max(8, h * 0.035);
  const pad = Math.max(8, w * 0.05);
  const y = h - barH * 1.65;
  const x0 = pad;
  const x1 = w - pad;

  ctx.save();
  ctx.fillStyle = "rgba(40, 28, 14, 0.42)";
  roundRect(ctx, x0 - barH * 0.4, y - barH * 0.5, x1 - x0 + barH * 0.8, barH, barH / 2);
  ctx.fill();

  // Start and finish ticks.
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.fillRect(x0, y - barH * 0.32, Math.max(1, w * 0.003), barH * 0.64);
  ctx.fillRect(x1, y - barH * 0.32, Math.max(1, w * 0.003), barH * 0.64);

  const dotR = barH * 0.38;
  for (const runner of runners) {
    const x = x0 + (x1 - x0) * Math.max(0, Math.min(1, runner.progress));
    const runnerY = y + (runner.lane - 1.5) * dotR * 0.72;
    ctx.fillStyle = runner.stumbling ? "#d9483c" : LANE_COLORS[runner.lane] ?? "#888";
    ctx.beginPath();
    ctx.arc(x, runnerY, dotR, 0, Math.PI * 2);
    ctx.fill();
    if (runner.isHuman) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(1.4, dotR * 0.4);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawRunner(ctx, runner, x, feetY, size, timeMs, color, isHuman = false) {
  const shadowLift = Math.max(0, runner?.y ?? 0);
  drawFacelessMii(ctx, {
    x,
    feetY,
    size,
    color,
    stride: runner?.airborne ? 0 : timeMs / (isHuman ? 54 : 62),
    armPump: runner?.airborne ? 0 : 1,
    cheer: runner?.airborne ? 0.72 : 0,
    lean: runner?.stumbling ? -0.16 : 0.065,
    slump: runner?.stumbling ? 1 : 0,
    shadow: shadowLift > 0 ? 0.08 : 0.2,
  });
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
  const layout = bridgeLayout(w, h);
  const you = snap?.you ?? { dist: 0, y: 0 };
  const scrollM = you.dist - VIEW_M * ANCHOR;

  ctx.save();
  ctx.clearRect(0, 0, w, h);
  // Overscan base so camera shake never exposes transparent canvas edges.
  ctx.fillStyle = "#57ade8";
  ctx.fillRect(0, 0, w, h);
  if (you.stumbling) {
    const shake = Math.max(0, you.impactProgress ?? 0);
    ctx.translate(Math.sin(timeMs * 0.09) * 5 * shake, Math.cos(timeMs * 0.12) * 2 * shake);
  }
  drawValley(ctx, w, h, scrollM, timeMs);
  drawSpeedLines(ctx, w, h, snap, timeMs);
  drawDeck(ctx, w, h, layout, scrollM);

  const toX = (m) => (m - scrollM) * layout.pxPerM;

  // The finish line, once it is in view.
  const trackM = snap?.trackM ?? 100;
  if (trackM - scrollM < VIEW_M + 4) {
    const fx = toX(trackM);
    const bandH = h * 0.045;
    for (let i = 0; i < 8; i += 1) {
      ctx.fillStyle = i % 2 ? "#ffffff" : "#2c2c2c";
      ctx.fillRect(fx - layout.pxPerM * 0.4, layout.deckY - bandH * (i + 1), layout.pxPerM * 0.8, bandH);
    }
    ctx.fillStyle = "rgba(40, 30, 16, 0.45)";
    ctx.fillRect(fx - layout.pxPerM * 0.06, layout.deckY - bandH * 8, layout.pxPerM * 0.12, bandH * 8);
  }

  // Other runners occupy the three farther seams of the bridge and use the
  // same physical jump height exposed by the runtime.
  for (const runner of (snap?.runners ?? []).filter((candidate) => !candidate.isHuman).reverse()) {
    const formationOffset = (runner.lane - 2) * layout.runnerSize * 0.38;
    const x = layout.anchorX + (runner.dist - you.dist) * layout.pxPerM + formationOffset;
    if (x < -layout.runnerSize || x > w + layout.runnerSize) continue;
    const laneLift = h * (0.018 + runner.lane * 0.045);
    const feetY = layout.deckY - laneLift - (runner.y ?? 0) * layout.pxPerHeight;
    const scale = 0.86 - runner.lane * 0.055;
    drawRunner(ctx, runner, x, feetY, layout.runnerSize * scale, timeMs, LANE_COLORS[runner.lane], false);
  }

  // Obstacles. Their world positions now move toward the field, and their spin
  // is tied to that motion rather than being a purely decorative clock.
  for (const obstacle of snap?.obstacles ?? []) {
    const x = toX(obstacle.pos);
    if (x < -w * 0.2 || x > w * 1.2) continue;
    const roll = -(obstacle.pos * 1.9 + timeMs / 150);
    if (obstacle.kind === "barrel") {
      drawBarrel(ctx, x, layout.deckY, (obstacle.height / 2) * layout.pxPerHeight * 1.1, roll);
    } else {
      drawLog(
        ctx,
        x,
        layout.deckY,
        obstacle.halfWidth * layout.pxPerM,
        obstacle.height * layout.pxPerHeight,
        roll,
      );
    }
  }

  // The runner.
  const rx = layout.anchorX;
  const ry = layout.deckY - you.y * layout.pxPerHeight;
  drawRunner(ctx, you, rx, ry, layout.runnerSize, timeMs, "#2f6fe0", true);

  // How much hang time is left in this jump — the only hidden number the player
  // needs, so it rides on the runner rather than in the HUD.
  if (you.airborne && you.hoversLeft > 0) {
    const dotR = Math.max(2, layout.runnerSize * 0.07);
    for (let i = 0; i < you.hoversLeft; i += 1) {
      ctx.fillStyle = "#ffe27a";
      ctx.beginPath();
      ctx.arc(
        rx + (i - (you.hoversLeft - 1) / 2) * dotR * 3,
        ry - layout.runnerSize * 1.28,
        dotR,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  // Dust when a stumble costs you speed.
  if (you.stumbling) {
    for (let i = 0; i < 5; i += 1) {
      const t = ((timeMs / 260) + i * 0.2) % 1;
      ctx.fillStyle = `rgba(214, 190, 150, ${0.5 * (1 - t)})`;
      ctx.beginPath();
      ctx.arc(
        rx - layout.runnerSize * (0.4 + t * 1.6),
        layout.deckY - layout.runnerSize * 0.1 * t,
        layout.runnerSize * (0.08 + t * 0.16),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.strokeStyle = `rgba(255, 224, 128, ${0.8 * (you.impactProgress ?? 0)})`;
    ctx.lineWidth = Math.max(2, layout.runnerSize * 0.055);
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI * 2 * i) / 6;
      ctx.beginPath();
      ctx.moveTo(rx + Math.cos(a) * layout.runnerSize * 0.45, ry - layout.runnerSize * 0.45 + Math.sin(a) * layout.runnerSize * 0.45);
      ctx.lineTo(rx + Math.cos(a) * layout.runnerSize * 0.8, ry - layout.runnerSize * 0.45 + Math.sin(a) * layout.runnerSize * 0.8);
      ctx.stroke();
    }
  }

  // Compact danger readout: type and closing distance of the next hazard.
  const next = snap?.nextObstacle;
  if (next && next.distanceAhead > 0 && next.distanceAhead < 8 && snap?.screen === "racing") {
    const urgency = 1 - Math.min(1, next.distanceAhead / 8);
    const badgeW = Math.max(92, w * 0.16);
    const badgeH = Math.max(24, h * 0.065);
    ctx.fillStyle = `rgba(72, 42, 18, ${0.58 + urgency * 0.24})`;
    roundRect(ctx, w - badgeW - 12, h * 0.12, badgeW, badgeH, badgeH / 2);
    ctx.fill();
    ctx.fillStyle = urgency > 0.65 ? "#ffd36a" : "#fff8e6";
    ctx.font = `800 ${Math.round(badgeH * 0.42)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${next.kind === "barrel" ? "◉" : "▰"} ${next.distanceAhead.toFixed(1)} m`, w - badgeW / 2 - 12, h * 0.12 + badgeH / 2);
  }

  drawPositionBar(ctx, snap, w, h);

  ctx.restore();
}

export default drawScene;
