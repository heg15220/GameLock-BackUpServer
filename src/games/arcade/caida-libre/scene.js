// Procedural pseudo-3D scene for Caída Libre. Runtime positions drive every
// runner while stacked decks, cloud strata and islands establish real height.
import { clamp01, drawCloud, drawFacelessMii, easeInCubic, hash, roundRect, shade } from "../shared/wiiPartyCanvas.js";

const LEFT_DECK = "#ef557b";
const RIGHT_DECK = "#358fdf";
const STRIPE_A = "#ffd541";
const STRIPE_B = "#292b35";
export const PLAYER_COLORS = ["#2768e8", "#ef4d62", "#26a65b", "#f4a51c"];

export function platformLayout(w, h) {
  const deckW = Math.min(w * 0.88, h * 1.72);
  const deckH = Math.max(h * 0.19, deckW * 0.15);
  const cx = w / 2;
  const deckTop = h * 0.46;
  return { cx, deckTop, deckH, left: cx - deckW / 2, right: cx + deckW / 2, deckW, halfW: deckW / 2, figure: Math.max(23, Math.min(h * 0.205, deckW * 0.095)) };
}

export function sideAt(w, px) { return px < w / 2 ? "left" : "right"; }

function polygon(ctx, points) {
  ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
}

function fillPolygon(ctx, points, fill) { ctx.fillStyle = fill; polygon(ctx, points); ctx.fill(); }

function drawAtmosphere(ctx, w, h, timeMs, fallEnergy) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#176dcc"); sky.addColorStop(0.38, "#66bce9");
  sky.addColorStop(0.72, "#c7ecf6"); sky.addColorStop(1, "#f2fbff");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

  const sunX = w * 0.78; const sunY = h * 0.17;
  const halo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.25);
  halo.addColorStop(0, "rgba(255,247,196,.92)"); halo.addColorStop(0.22, "rgba(255,234,147,.3)"); halo.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = halo; ctx.fillRect(0, 0, w, h * 0.55);
  ctx.fillStyle = "#fff8c7"; ctx.beginPath(); ctx.arc(sunX, sunY, Math.max(9, h * 0.025), 0, Math.PI * 2); ctx.fill();

  for (let i = 0; i < 5; i += 1) {
    const x = hash(i * 9.13) * w; const y = h * (0.28 + hash(i * 3.7) * 0.2); const iw = h * (0.055 + hash(i * 6.2) * 0.055);
    ctx.globalAlpha = 0.24;
    fillPolygon(ctx, [[x - iw, y], [x + iw, y], [x + iw * 0.35, y + iw * 0.52], [x, y + iw], [x - iw * 0.4, y + iw * 0.5]], "#316f92");
    ctx.fillStyle = "#8bc878"; ctx.beginPath(); ctx.ellipse(x, y, iw, iw * 0.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  }

  const drift = timeMs * 0.006;
  for (let layer = 0; layer < 3; layer += 1) {
    for (let i = 0; i < 5 + layer * 2; i += 1) {
      const seed = i + layer * 19; const span = w + h * 0.42;
      const x = ((hash(seed * 2.71) * span + drift * (layer + 1)) % span) - h * 0.21;
      const y = h * (0.16 + layer * 0.28 + hash(seed * 5.4) * 0.17);
      const size = h * (0.025 + layer * 0.018 + hash(seed * 7.2) * 0.018);
      drawCloud(ctx, x, y, size, 0.25 + layer * 0.2);
    }
  }
  if (fallEnergy > 0) {
    ctx.save(); ctx.strokeStyle = `rgba(255,255,255,${0.16 + fallEnergy * 0.34})`; ctx.lineWidth = Math.max(1, h * 0.004);
    for (let i = 0; i < 18; i += 1) {
      const x = hash(i * 4.7 + 2) * w; const y = ((hash(i * 8.3) * h + timeMs * (0.18 + fallEnergy * 0.35)) % (h * 1.25)) - h * 0.15;
      const len = h * (0.035 + hash(i * 1.9) * 0.09) * fallEnergy;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len * 0.12, y + len); ctx.stroke();
    }
    ctx.restore();
  }
}

function drawDepthPlatform(ctx, cx, y, width, alpha) {
  const depth = width * 0.18; ctx.save(); ctx.globalAlpha = alpha;
  fillPolygon(ctx, [[cx - width / 2, y], [cx, y], [cx, y + depth], [cx - width * 0.43, y + depth]], LEFT_DECK);
  fillPolygon(ctx, [[cx, y], [cx + width / 2, y], [cx + width * 0.43, y + depth], [cx, y + depth]], RIGHT_DECK);
  fillPolygon(ctx, [[cx - width * 0.43, y + depth], [cx + width * 0.43, y + depth], [cx + width * 0.38, y + depth * 1.22], [cx - width * 0.38, y + depth * 1.22]], "#58788b");
  ctx.strokeStyle = "rgba(255,255,255,.65)"; ctx.lineWidth = Math.max(1, width * 0.008); ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, y + depth); ctx.stroke(); ctx.restore();
}

function drawHazardBand(ctx, x, y, w, h) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); const step = Math.max(10, h * 1.55);
  for (let px = x - h; px < x + w + h; px += step) {
    fillPolygon(ctx, [[px, y], [px + step, y], [px + step - h, y + h], [px - h, y + h]], Math.floor((px - x) / step) % 2 ? STRIPE_A : STRIPE_B);
  }
  ctx.restore();
}

function halfPoints(layout, side) {
  const inset = layout.deckW * 0.055; const y0 = layout.deckTop; const y1 = layout.deckTop + layout.deckH;
  return side === "left"
    ? [[layout.left + inset, y0], [layout.cx, y0], [layout.cx, y1], [layout.left, y1]]
    : [[layout.cx, y0], [layout.right - inset, y0], [layout.right, y1], [layout.cx, y1]];
}

function drawArrow(ctx, layout, side) {
  const cx = side === "left" ? layout.left + layout.halfW * 0.52 : layout.cx + layout.halfW * 0.48;
  const cy = layout.deckTop + layout.deckH * 0.54; const dir = side === "left" ? -1 : 1; const s = layout.deckH * 0.28;
  fillPolygon(ctx, [[cx + dir * s, cy], [cx - dir * s * 0.12, cy - s * 0.72], [cx - dir * s * 0.12, cy - s * 0.28], [cx - dir * s, cy - s * 0.28], [cx - dir * s, cy + s * 0.28], [cx - dir * s * 0.12, cy + s * 0.28], [cx - dir * s * 0.12, cy + s * 0.72]], "rgba(255,255,255,.42)");
}

function drawDeckHalf(ctx, layout, side, openT) {
  const color = side === "left" ? LEFT_DECK : RIGHT_DECK; const points = halfPoints(layout, side);
  const pivotX = side === "left" ? layout.left : layout.right; const pivotY = layout.deckTop; ctx.save();
  if (openT > 0) {
    const eased = easeInCubic(openT); ctx.translate(pivotX, pivotY); ctx.rotate((side === "left" ? 1 : -1) * eased * 1.18); ctx.scale(1, 1 - eased * 0.3); ctx.translate(-pivotX, -pivotY); ctx.globalAlpha = 1 - eased * 0.22;
  }
  const grad = ctx.createLinearGradient(0, layout.deckTop, 0, layout.deckTop + layout.deckH); grad.addColorStop(0, color); grad.addColorStop(1, shade(color, 0.72));
  fillPolygon(ctx, points, grad); drawArrow(ctx, layout, side); ctx.strokeStyle = "rgba(255,255,255,.36)"; ctx.lineWidth = Math.max(1, layout.deckH * 0.018); polygon(ctx, points); ctx.stroke(); ctx.restore();
}

function drawPlatform(ctx, layout, badSide, openT, hoverSide, choosing) {
  const rim = Math.max(7, layout.deckH * 0.13); ctx.save(); ctx.shadowColor = "rgba(22,64,92,.32)"; ctx.shadowBlur = layout.deckH * 0.22; ctx.shadowOffsetY = layout.deckH * 0.16;
  fillPolygon(ctx, [[layout.left - rim, layout.deckTop - rim], [layout.right + rim, layout.deckTop - rim], [layout.right + rim * 1.2, layout.deckTop + layout.deckH + rim], [layout.left - rim * 1.2, layout.deckTop + layout.deckH + rim]], "#495766"); ctx.restore();
  drawHazardBand(ctx, layout.left - rim, layout.deckTop - rim, layout.deckW + rim * 2, rim); drawHazardBand(ctx, layout.left - rim * 1.2, layout.deckTop + layout.deckH, layout.deckW + rim * 2.4, rim);
  const order = badSide === "left" ? ["right", "left"] : ["left", "right"]; for (const side of order) drawDeckHalf(ctx, layout, side, badSide === side ? openT : 0);
  ctx.fillStyle = "#c8d5dd"; roundRect(ctx, layout.cx - rim * 0.18, layout.deckTop - rim * 0.42, rim * 0.36, layout.deckH + rim * 0.84, rim * 0.16); ctx.fill();
  ctx.fillStyle = "#6a7b88"; for (let i = 0; i < 4; i += 1) { ctx.beginPath(); ctx.arc(layout.cx, layout.deckTop + layout.deckH * (0.14 + i * 0.24), rim * 0.09, 0, Math.PI * 2); ctx.fill(); }
  if (choosing && hoverSide) { ctx.strokeStyle = "rgba(255,255,255,.96)"; ctx.lineWidth = Math.max(2, layout.deckH * 0.035); ctx.setLineDash([layout.deckH * 0.11, layout.deckH * 0.08]); polygon(ctx, halfPoints(layout, hoverSide)); ctx.stroke(); ctx.setLineDash([]); }
}

function drawPlayers(ctx, snap, layout, timeMs, openT) {
  for (const player of snap?.players ?? []) {
    if (player.out && !player.fell) continue;
    const laneNudge = (player.lane - 1.5) * layout.deckW * 0.035;
    const x = layout.cx + (player.x ?? (player.side === "left" ? -0.48 : 0.48)) * layout.deckW * 0.43 + laneNudge;
    const feetY = layout.deckTop + layout.deckH * (0.14 + player.lane * 0.035) + (player.y ?? 0) * layout.deckH * 1.55;
    const speed = Math.min(1, Math.abs(player.vx ?? 0) / 2.2);
    const bob = snap?.screen === "choosing" ? Math.sin(timeMs / 85 + player.lane * 1.8) * layout.figure * 0.018 * (0.25 + speed) : 0;
    const scale = Math.max(0.68, 1 - Math.max(0, player.y ?? 0) * 0.045);
    if (player.fell && openT > 0.05) {
      ctx.save(); ctx.globalAlpha = 0.22 * (1 - clamp01((player.y ?? 0) / 4)); ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(1, layout.figure * 0.035);
      for (let i = 0; i < 3; i += 1) { ctx.beginPath(); ctx.moveTo(x - layout.figure * (0.35 - i * 0.3), feetY - layout.figure * (1.5 + i * 0.2)); ctx.lineTo(x - layout.figure * (0.45 - i * 0.3), feetY - layout.figure * (2.25 + i * 0.28)); ctx.stroke(); } ctx.restore();
    }
    ctx.save(); ctx.translate(x, feetY + bob); ctx.rotate(player.tilt ?? 0); ctx.scale(scale, scale); ctx.translate(-x, -(feetY + bob));
    drawFacelessMii(ctx, { x, feetY: feetY + bob, size: layout.figure, color: PLAYER_COLORS[player.lane], cheer: player.fell ? 1 : speed * 0.72 + (player.switchPulse ?? 0) * 0.2, shadow: player.fell ? 0 : 0.22 }); ctx.restore();
    if (player.isHuman && !player.fell) { const pulse = 1 + Math.sin(timeMs / 150) * 0.07; ctx.strokeStyle = "rgba(255,255,255,.96)"; ctx.lineWidth = Math.max(2, layout.figure * 0.065); ctx.beginPath(); ctx.ellipse(x, feetY + layout.figure * 0.06, layout.figure * 0.33 * pulse, layout.figure * 0.105 * pulse, 0, 0, Math.PI * 2); ctx.stroke(); }
    if (snap?.screen === "choosing" && !player.isHuman && !player.committed) { ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.font = `900 ${Math.round(layout.figure * 0.38)}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.fillText("?", x, feetY - layout.figure * 1.24 + Math.sin(timeMs / 190 + player.lane) * layout.figure * 0.07); }
  }
}

function drawVerdict(ctx, layout, badSide, openT) {
  if (!badSide || openT < 0.42) return;
  for (const side of ["left", "right"]) {
    const x = (side === "left" ? layout.left : layout.cx) + layout.halfW / 2; const bad = side === badSide; const w = layout.deckW * 0.145; const h = Math.max(20, layout.deckH * 0.28);
    ctx.fillStyle = bad ? "rgba(192,49,63,.92)" : "rgba(27,143,82,.92)"; roundRect(ctx, x - w / 2, layout.deckTop - h * 1.75, w, h, h / 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = `900 ${Math.round(h * 0.58)}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(bad ? "☁" : "✓", x, layout.deckTop - h * 1.25);
  }
}

export function drawScene(ctx, snap, w, h, timeMs = 0, hoverSide = null) {
  const layout = platformLayout(w, h); const screen = snap?.screen ?? "menu"; const choosing = screen === "choosing"; const badSide = snap?.badSide ?? null;
  const openT = screen === "opening" ? clamp01((snap?.phaseProgress ?? 0) * 1.4) : screen === "settling" || screen === "won" || screen === "lost" ? 1 : 0;
  const fallEnergy = screen === "opening" ? openT : screen === "settling" ? 1 - (snap?.phaseProgress ?? 0) : 0;
  ctx.save(); ctx.clearRect(0, 0, w, h); drawAtmosphere(ctx, w, h, timeMs, fallEnergy);
  const remaining = Math.max(0, (snap?.platforms ?? 3) - (snap?.platform ?? 0) - 1); const settleZoom = screen === "settling" ? (snap?.phaseProgress ?? 0) : 0;
  for (let i = remaining - 1; i >= 0; i -= 1) { const depth = i + 1; const width = layout.deckW * (0.3 + (remaining - i) * 0.11 + settleZoom * 0.08); const y = h * (0.7 + depth * 0.095 - settleZoom * 0.12); drawDepthPlatform(ctx, layout.cx, y, width, 0.4 + (remaining - i) * 0.14); }
  drawPlatform(ctx, layout, badSide, openT, hoverSide, choosing); drawPlayers(ctx, snap, layout, timeMs, openT); drawVerdict(ctx, layout, badSide, openT);
  ctx.save(); ctx.globalAlpha = 0.5; for (let i = 0; i < 5; i += 1) drawCloud(ctx, (i - 0.25) * w / 4, h * (0.965 + Math.sin(i + timeMs / 1900) * 0.012), h * 0.065, 0.75); ctx.restore(); ctx.restore();
}

export default drawScene;
