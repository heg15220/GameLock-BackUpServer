import { STAGE_HEIGHT, STAGE_WIDTH } from "../constants";
import { getCookTint, getProfile } from "../systems/cookingSystem";

const TWO_PI = Math.PI * 2;

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export function drawKitchenScene(ctx, state) {
  ctx.clearRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
  drawBackground(ctx, state.elapsedMs);
  drawStations(ctx, state);
  drawStationContents(ctx, state);
  drawPlateStack(ctx, state);
  drawChef(ctx, state);
  drawParticles(ctx, state.particles);
  drawTopHud(ctx, state);
  drawFeedback(ctx, state);
  drawStateOverlay(ctx, state);
}

// ─── BACKGROUND ───────────────────────────────────────────────────────────────
function drawBackground(ctx, t) {
  drawWall(ctx);
  drawFloorTiles(ctx);
  drawCounter(ctx);
  drawCeiling(ctx, t);
  drawKitchenWindow(ctx, STAGE_WIDTH - 174, 50, 148, 174, t);
  drawDecorShelf(ctx);

  // subtle ambient warm glow
  const ag = ctx.createRadialGradient(STAGE_WIDTH * 0.82, STAGE_HEIGHT * 0.6, 20, STAGE_WIDTH * 0.82, STAGE_HEIGHT * 0.6, 320);
  ag.addColorStop(0, "rgba(253,224,71,0.09)");
  ag.addColorStop(1, "rgba(253,224,71,0)");
  ctx.fillStyle = ag;
  ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
}

function drawWall(ctx) {
  const g = ctx.createLinearGradient(0, 38, 0, 306);
  g.addColorStop(0, "#f7eedf");
  g.addColorStop(0.5, "#f1e6d2");
  g.addColorStop(1, "#e9dcc8");
  ctx.fillStyle = g;
  ctx.fillRect(0, 38, STAGE_WIDTH, 268);

  // horizontal mortar lines
  ctx.strokeStyle = "rgba(188,160,120,0.38)";
  ctx.lineWidth = 0.8;
  for (let row = 0; row < 7; row++) {
    const wy = 58 + row * 38;
    ctx.beginPath(); ctx.moveTo(0, wy); ctx.lineTo(STAGE_WIDTH, wy); ctx.stroke();
    // staggered vertical joints
    const offset = row % 2 === 0 ? 0 : 76;
    for (let vx = offset; vx < STAGE_WIDTH; vx += 152) {
      ctx.beginPath(); ctx.moveTo(vx, wy); ctx.lineTo(vx, wy + 38); ctx.stroke();
    }
  }
}

function drawFloorTiles(ctx) {
  const FLOOR_Y = 308;
  const SZ = 48;
  for (let row = 0; row * SZ + FLOOR_Y < STAGE_HEIGHT + SZ; row++) {
    for (let col = 0; col * SZ < STAGE_WIDTH; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#f3ecdA" : "#e2d9c6";
      ctx.fillRect(col * SZ, FLOOR_Y + row * SZ, SZ, SZ);
    }
  }
  ctx.strokeStyle = "rgba(158,135,100,0.30)";
  ctx.lineWidth = 0.8;
  for (let x = 0; x <= STAGE_WIDTH; x += SZ) {
    ctx.beginPath(); ctx.moveTo(x, FLOOR_Y); ctx.lineTo(x, STAGE_HEIGHT); ctx.stroke();
  }
  for (let y = FLOOR_Y; y <= STAGE_HEIGHT; y += SZ) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(STAGE_WIDTH, y); ctx.stroke();
  }
  // baseboard
  const bb = ctx.createLinearGradient(0, FLOOR_Y, 0, FLOOR_Y + 10);
  bb.addColorStop(0, "rgba(0,0,0,0.14)");
  bb.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = bb;
  ctx.fillRect(0, FLOOR_Y, STAGE_WIDTH, 10);
}

function drawCounter(ctx) {
  const g = ctx.createLinearGradient(0, 282, 0, 312);
  g.addColorStop(0, "#e4dcd0");
  g.addColorStop(0.35, "#d6cec2");
  g.addColorStop(0.8, "#c8c0b4");
  g.addColorStop(1, "#bab4a8");
  ctx.fillStyle = g;
  ctx.fillRect(0, 282, STAGE_WIDTH, 30);

  // highlight top edge
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillRect(0, 282, STAGE_WIDTH, 3);

  // marble veins
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.strokeStyle = "#9a8a78";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 7; i++) {
    const vx = 70 + i * 138;
    ctx.beginPath();
    ctx.moveTo(vx, 282);
    ctx.bezierCurveTo(vx + 18, 290, vx - 8, 300, vx + 12, 312);
    ctx.stroke();
  }
  ctx.restore();

  // bottom shadow
  ctx.fillStyle = "rgba(0,0,0,0.09)";
  ctx.fillRect(0, 308, STAGE_WIDTH, 8);
}

function drawCeiling(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, 44);
  g.addColorStop(0, "#171e2e");
  g.addColorStop(1, "#242f46");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, STAGE_WIDTH, 44);

  // rail bar
  ctx.fillStyle = "#364054";
  ctx.fillRect(0, 36, STAGE_WIDTH, 7);

  // pendant lights
  const lxArr = [170, 400, 620, 850];
  for (const lx of lxArr) {
    // cord
    ctx.strokeStyle = "#4a5570";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, 37); ctx.lineTo(lx, 58); ctx.stroke();

    // cone shade
    ctx.fillStyle = "#e8c840";
    ctx.beginPath();
    ctx.moveTo(lx - 14, 58);
    ctx.lineTo(lx + 14, 58);
    ctx.lineTo(lx + 8, 68);
    ctx.lineTo(lx - 8, 68);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c8a820";
    ctx.fillRect(lx - 14, 58, 28, 3);

    // bulb glow
    const pulse = 0.50 + Math.sin(t * 0.0018 + lx * 0.01) * 0.04;
    const glr = ctx.createRadialGradient(lx, 66, 3, lx, 66, 120);
    glr.addColorStop(0, `rgba(255,230,80,${0.32 * pulse})`);
    glr.addColorStop(1, "rgba(255,230,80,0)");
    ctx.fillStyle = glr;
    ctx.fillRect(lx - 120, 0, 240, 180);
  }
}

function drawKitchenWindow(ctx, x, y, w, h, t) {
  // outer frame shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  roundRect(ctx, x + 3, y + 4, w, h, 7);
  ctx.fill();

  // frame
  ctx.fillStyle = "#7a6048";
  roundRect(ctx, x, y, w, h, 7);
  ctx.fill();

  // sky gradient
  const sg = ctx.createLinearGradient(x, y + 5, x, y + h - 5);
  sg.addColorStop(0, "#7ec8e3");
  sg.addColorStop(0.55, "#c5e8f4");
  sg.addColorStop(1, "#e0f4f8");
  ctx.fillStyle = sg;
  roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 4);
  ctx.fill();

  // clip to glass
  ctx.save();
  roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 4);
  ctx.clip();

  // animated clouds
  const co = (t * 0.009) % (w + 90);
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  drawCloudShape(ctx, x + co - 10, y + 28, 58, 16);
  drawCloudShape(ctx, x + co - 70, y + 56, 42, 12);
  drawCloudShape(ctx, x + co + 42, y + 42, 36, 10);

  // light ray
  ctx.globalAlpha = 0.07;
  const rg = ctx.createLinearGradient(x + w * 0.4, y, x + w * 2, y + h * 2);
  rg.addColorStop(0, "#ffffff");
  rg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.35, y + 6);
  ctx.lineTo(x + w - 6, y + 6);
  ctx.lineTo(x + w * 2.2, y + h * 2);
  ctx.lineTo(x - w * 0.1, y + h * 2);
  ctx.fill();
  ctx.restore();

  // mullions
  ctx.strokeStyle = "#7a6048";
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x + w / 2, y + 6); ctx.lineTo(x + w / 2, y + h - 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 6, y + h / 2); ctx.lineTo(x + w - 6, y + h / 2); ctx.stroke();

  // sill
  ctx.fillStyle = "#9a8060";
  ctx.fillRect(x - 7, y + h, w + 14, 9);
}

function drawCloudShape(ctx, cx, cy, w, h) {
  ctx.beginPath();
  ctx.arc(cx, cy, h * 0.85, 0, TWO_PI);
  ctx.arc(cx + w * 0.22, cy - h * 0.28, h * 0.70, 0, TWO_PI);
  ctx.arc(cx + w * 0.50, cy, h * 0.82, 0, TWO_PI);
  ctx.arc(cx + w * 0.76, cy - h * 0.12, h * 0.68, 0, TWO_PI);
  ctx.fill();
}

function drawDecorShelf(ctx) {
  // small shelf on left wall section
  ctx.fillStyle = "#b89a6a";
  roundRect(ctx, 22, 210, 140, 11, 4);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(22, 221, 140, 3);
  // pots on shelf
  drawHerbPot(ctx, 48, 206);
  drawHerbPot(ctx, 92, 204);
  drawHerbPot(ctx, 138, 207);
}

function drawHerbPot(ctx, x, y) {
  // terracotta pot
  ctx.fillStyle = "#c07040";
  ctx.beginPath();
  ctx.moveTo(x - 11, y + 18);
  ctx.lineTo(x - 9, y + 2);
  ctx.lineTo(x + 9, y + 2);
  ctx.lineTo(x + 11, y + 18);
  ctx.closePath();
  ctx.fill();
  // pot rim
  ctx.fillStyle = "#d08050";
  ctx.fillRect(x - 11, y, 22, 4);
  // soil
  ctx.fillStyle = "#5a3218";
  ctx.fillRect(x - 9, y + 2, 18, 6);
  // herb leaves
  ctx.fillStyle = "#22c55e";
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * TWO_PI - Math.PI / 2;
    const lx = x + Math.cos(angle) * 6;
    const ly = y - 4 + Math.sin(angle) * 5;
    ctx.beginPath();
    ctx.ellipse(lx, ly, 4, 2.5, angle, 0, TWO_PI);
    ctx.fill();
  }
}

// ─── STATIONS ─────────────────────────────────────────────────────────────────
function drawStations(ctx, state) {
  for (const station of state.stationList) {
    const isNearby = station.id === state.nearestStationId;
    const label = state.locale === "es" ? station.labelEs : station.labelEn;
    ctx.save();
    switch (station.type) {
      case "fridge":       drawFridgeStation(ctx, station, isNearby, label); break;
      case "prep_table":   drawPrepStation(ctx, station, isNearby, label); break;
      case "cutting_board":drawBoardStation(ctx, station, isNearby, label, state.elapsedMs); break;
      case "pan":          drawPanStation(ctx, station, isNearby, label, state.elapsedMs); break;
      case "pot":          drawPotStation(ctx, station, isNearby, label, state.elapsedMs); break;
      case "oven":         drawOvenStation(ctx, station, isNearby, label, state.elapsedMs); break;
      case "plating":      drawPlatingStation(ctx, station, isNearby, label); break;
      case "serving":      drawServingStation(ctx, station, isNearby, label, state.elapsedMs); break;
      default: {
        ctx.fillStyle = "#e2e8f0";
        roundRect(ctx, station.x, station.y, station.w, station.h, 12);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

function stationShadow(ctx, x, y, w, h, r) {
  ctx.fillStyle = "rgba(0,0,0,0.20)";
  roundRect(ctx, x + 3, y + 5, w, h, r);
  ctx.fill();
}

function stationNearbyGlow(ctx, x, y, w, h, r, color) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();
  ctx.restore();
}

function drawFridgeStation(ctx, s, isNearby, label) {
  const { x, y, w, h } = s;
  stationShadow(ctx, x, y, w, h, 14);

  // body
  const bg = ctx.createLinearGradient(x, y, x + w, y + h * 0.7);
  bg.addColorStop(0, "#dbeafe");
  bg.addColorStop(0.45, "#eff6ff");
  bg.addColorStop(1, "#bfdbfe");
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();

  // top rim highlight
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  roundRect(ctx, x + 1, y + 1, w - 2, 8, 10);
  ctx.fill();

  // divider line (freezer | fridge)
  ctx.strokeStyle = "rgba(96,165,250,0.50)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 3]);
  ctx.beginPath(); ctx.moveTo(x + w * 0.44, y + 14); ctx.lineTo(x + w * 0.44, y + h - 14); ctx.stroke();
  ctx.setLineDash([]);

  // frost crystals (freezer side)
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "#93c5fd";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const fx = x + 10 + i * 10, fy = y + 20 + i * 11;
    ctx.beginPath();
    ctx.moveTo(fx - 5, fy); ctx.lineTo(fx + 5, fy);
    ctx.moveTo(fx, fy - 5); ctx.lineTo(fx, fy + 5);
    ctx.moveTo(fx - 3, fy - 3); ctx.lineTo(fx + 3, fy + 3);
    ctx.moveTo(fx + 3, fy - 3); ctx.lineTo(fx - 3, fy + 3);
    ctx.stroke();
  }
  ctx.restore();

  // fridge shelves (right side)
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#93c5fd";
  for (let i = 1; i < 3; i++) {
    const sy = y + h * (0.24 + i * 0.22);
    ctx.fillRect(x + w * 0.48, sy - 1, w * 0.46, 2);
  }
  ctx.restore();

  // chrome handle
  ctx.fillStyle = "#1d4ed8";
  roundRect(ctx, x + w - 16, y + h * 0.27, 10, h * 0.46, 5);
  ctx.fill();
  ctx.fillStyle = "rgba(147,197,253,0.8)";
  roundRect(ctx, x + w - 15, y + h * 0.29, 5, h * 0.42, 3);
  ctx.fill();

  // power LED
  ctx.fillStyle = "#16a34a";
  ctx.beginPath(); ctx.arc(x + 17, y + 17, 4.5, 0, TWO_PI); ctx.fill();
  const ledGlow = ctx.createRadialGradient(x + 17, y + 17, 0, x + 17, y + 17, 10);
  ledGlow.addColorStop(0, "rgba(74,222,128,0.6)");
  ledGlow.addColorStop(1, "rgba(74,222,128,0)");
  ctx.fillStyle = ledGlow;
  ctx.beginPath(); ctx.arc(x + 17, y + 17, 10, 0, TWO_PI); ctx.fill();

  // label
  ctx.fillStyle = "rgba(30,64,175,0.82)";
  ctx.font = "bold 11px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x + w / 2, y + h - 8);

  if (isNearby) stationNearbyGlow(ctx, x, y, w, h, 14, "#3b82f6");
}

function drawPrepStation(ctx, s, isNearby, label) {
  const { x, y, w, h } = s;
  stationShadow(ctx, x, y, w, h, 10);

  // table legs
  ctx.fillStyle = "#7c5c2a";
  ctx.fillRect(x + 8, y + h - 14, 10, 14);
  ctx.fillRect(x + w - 18, y + h - 14, 10, 14);

  // table front face (3d depth)
  ctx.fillStyle = "#b8864a";
  roundRect(ctx, x + 2, y + 4, w - 2, h - 4, 6);
  ctx.fill();

  // tabletop surface
  const tg = ctx.createLinearGradient(x, y, x, y + h * 0.6);
  tg.addColorStop(0, "#f0d898");
  tg.addColorStop(0.5, "#e8cc88");
  tg.addColorStop(1, "#d4b86a");
  ctx.fillStyle = tg;
  roundRect(ctx, x, y, w, h * 0.72, 8);
  ctx.fill();

  // wood grain lines
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "#8b5e30";
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 4, y + i * (h * 0.72 / 6));
    ctx.lineTo(x + w - 4, y + i * (h * 0.72 / 6));
    ctx.stroke();
  }
  ctx.restore();

  // highlight strip
  ctx.fillStyle = "rgba(255,255,255,0.30)";
  roundRect(ctx, x + 2, y + 2, w - 4, 6, 4);
  ctx.fill();

  ctx.fillStyle = "rgba(92,50,12,0.78)";
  ctx.font = "bold 11px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x + w / 2, y + h - 8);

  if (isNearby) stationNearbyGlow(ctx, x, y, w, h, 10, "#d97706");
}

function drawBoardStation(ctx, s, isNearby, label, t) {
  const { x, y, w, h } = s;
  stationShadow(ctx, x, y, w, h, 8);

  // board body
  const bg = ctx.createLinearGradient(x, y, x + w, y + h);
  bg.addColorStop(0, "#c9944e");
  bg.addColorStop(0.5, "#b87c3a");
  bg.addColorStop(1, "#a06828");
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();

  // surface area
  ctx.fillStyle = "#d4a862";
  roundRect(ctx, x + 7, y + 18, w - 14, h - 38, 5);
  ctx.fill();

  // wood grain on surface
  ctx.save();
  ctx.globalAlpha = 0.20;
  ctx.strokeStyle = "#7c4a18";
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 9, y + 22 + i * ((h - 38) / 7));
    ctx.lineTo(x + w - 9, y + 22 + i * ((h - 38) / 7));
    ctx.stroke();
  }
  ctx.restore();

  // knife cut lines
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = "#5c2e08";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const kx = x + 18 + i * ((w - 28) / 4);
    ctx.beginPath();
    ctx.moveTo(kx, y + 20);
    ctx.lineTo(kx + 4, y + h - 22);
    ctx.stroke();
  }
  ctx.restore();

  // animated knife during cut
  const kt = s.cuttingState?.knifeTimerMs ?? 0;
  if (kt > 0) {
    const cx = x + w * 0.5;
    const cy = y + h * 0.38;
    const motion = Math.sin((kt / 80) * Math.PI) * 16;
    ctx.save();
    ctx.translate(cx + motion * 0.5, cy - 10 - motion * 0.35);
    ctx.rotate(-0.55);
    // blade
    ctx.fillStyle = "#c8d0dc";
    ctx.beginPath();
    ctx.moveTo(-22, -3);
    ctx.lineTo(18, -1);
    ctx.lineTo(20, 1);
    ctx.lineTo(-22, 3);
    ctx.closePath();
    ctx.fill();
    // edge highlight
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(-22, -2, 40, 1);
    // handle
    ctx.fillStyle = "#2d1a08";
    ctx.fillRect(18, -4, 18, 8);
    ctx.fillStyle = "#3d2a18";
    roundRect(ctx, 17, -4, 6, 8, 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = "rgba(92,40,8,0.80)";
  ctx.font = "bold 11px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x + w / 2, y + h - 8);

  if (isNearby) stationNearbyGlow(ctx, x, y, w, h, 10, "#b45309");
}

function drawPanStation(ctx, s, isNearby, label, t) {
  const { x, y, w, h } = s;
  stationShadow(ctx, x, y, w, h, 10);

  // burner ring
  const br = ctx.createRadialGradient(x + w * 0.5, y + h * 0.52, 4, x + w * 0.5, y + h * 0.52, w * 0.38);
  br.addColorStop(0, s.isOn ? "#dc2626" : "#374151");
  br.addColorStop(0.7, s.isOn ? "#7f1d1d" : "#1f2937");
  br.addColorStop(1, "#111827");
  ctx.fillStyle = br;
  ctx.beginPath();
  ctx.ellipse(x + w * 0.50, y + h * 0.54, w * 0.38, w * 0.24, 0, 0, TWO_PI);
  ctx.fill();

  // burner coils (when on)
  if (s.isOn) {
    const flicker = 0.7 + Math.sin(t * 0.04) * 0.15;
    ctx.save();
    ctx.globalAlpha = flicker;
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.50, y + h * 0.54, w * 0.28, w * 0.17, 0, 0, TWO_PI);
    ctx.stroke();
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.50, y + h * 0.54, w * 0.18, w * 0.11, 0, 0, TWO_PI);
    ctx.stroke();
    ctx.restore();
  }

  // pan (ellipse from bird's eye)
  const panW = w * 0.72, panH = w * 0.46;
  const panX = x + w * 0.50, panY = y + h * 0.44;

  // pan rim shadow
  ctx.fillStyle = "#1f2937";
  ctx.beginPath();
  ctx.ellipse(panX + 2, panY + 3, panW / 2 + 2, panH / 2 + 2, 0, 0, TWO_PI);
  ctx.fill();

  // pan exterior
  const panG = ctx.createRadialGradient(panX - panW * 0.2, panY - panH * 0.3, 2, panX, panY, panW * 0.6);
  panG.addColorStop(0, "#9ca3af");
  panG.addColorStop(0.6, "#6b7280");
  panG.addColorStop(1, "#374151");
  ctx.fillStyle = panG;
  ctx.beginPath();
  ctx.ellipse(panX, panY, panW / 2, panH / 2, 0, 0, TWO_PI);
  ctx.fill();

  // pan interior
  const innerG = ctx.createRadialGradient(panX, panY, 2, panX, panY, panW * 0.4);
  innerG.addColorStop(0, s.isOn ? "#6b3a2a" : "#4b5563");
  innerG.addColorStop(1, s.isOn ? "#3d1e12" : "#374151");
  ctx.fillStyle = innerG;
  ctx.beginPath();
  ctx.ellipse(panX, panY, panW * 0.38, panH * 0.38, 0, 0, TWO_PI);
  ctx.fill();

  // pan handle
  ctx.fillStyle = "#111827";
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(panX - panW * 0.42, panY - 5);
  ctx.lineTo(x - 2, panY - 6);
  ctx.lineTo(x - 2, panY + 7);
  ctx.lineTo(panX - panW * 0.42, panY + 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#1c2333";
  roundRect(ctx, x - 4, panY - 7, 10, 15, 4);
  ctx.fill();
  ctx.restore();

  // heat gauge
  drawHeatBar(ctx, s, x + 6, y + h - 20, w - 12);

  ctx.fillStyle = "rgba(31,41,55,0.82)";
  ctx.font = "bold 11px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x + w / 2, y + h - 7);

  if (isNearby) stationNearbyGlow(ctx, x, y, w, h, 10, "#ef4444");
}

function drawPotStation(ctx, s, isNearby, label, t) {
  const { x, y, w, h } = s;
  stationShadow(ctx, x, y, w, h, 10);

  // burner
  const br = ctx.createRadialGradient(x + w * 0.50, y + h * 0.78, 4, x + w * 0.50, y + h * 0.78, w * 0.4);
  br.addColorStop(0, s.isOn ? "#b91c1c" : "#374151");
  br.addColorStop(0.7, s.isOn ? "#7f1d1d" : "#1f2937");
  br.addColorStop(1, "#111827");
  ctx.fillStyle = br;
  ctx.beginPath();
  ctx.ellipse(x + w * 0.50, y + h * 0.80, w * 0.40, w * 0.25, 0, 0, TWO_PI);
  ctx.fill();

  if (s.isOn) {
    const fl = 0.7 + Math.sin(t * 0.035 + 1.2) * 0.15;
    ctx.save();
    ctx.globalAlpha = fl;
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.50, y + h * 0.80, w * 0.30, w * 0.18, 0, 0, TWO_PI);
    ctx.stroke();
    ctx.restore();
  }

  // pot body
  const potX = x + w * 0.50, potH = h * 0.64;
  const potTop = y + h * 0.14;
  const potBottom = potTop + potH;
  const potR = w * 0.34;

  // body gradient
  const potG = ctx.createLinearGradient(potX - potR, potTop, potX + potR, potTop);
  potG.addColorStop(0, "#6b7280");
  potG.addColorStop(0.3, "#9ca3af");
  potG.addColorStop(0.7, "#6b7280");
  potG.addColorStop(1, "#374151");
  ctx.fillStyle = potG;
  ctx.beginPath();
  ctx.moveTo(potX - potR, potTop + 6);
  ctx.arcTo(potX - potR, potBottom, potX + potR, potBottom, 8);
  ctx.arcTo(potX + potR, potBottom, potX + potR, potTop, 8);
  ctx.lineTo(potX + potR, potTop + 6);
  ctx.closePath();
  ctx.fill();

  // pot top ellipse (open)
  ctx.fillStyle = s.isOn && s.temperature > 60 ? "#3b5c7a" : "#374151";
  ctx.beginPath();
  ctx.ellipse(potX, potTop + 6, potR, potR * 0.38, 0, 0, TWO_PI);
  ctx.fill();

  // lid
  ctx.fillStyle = "#9ca3af";
  ctx.beginPath();
  ctx.ellipse(potX, potTop + 4, potR + 3, potR * 0.40, 0, 0, TWO_PI);
  ctx.fill();
  ctx.fillStyle = "#d1d5db";
  ctx.beginPath();
  ctx.ellipse(potX, potTop + 3, potR + 3, potR * 0.36, 0, 0, TWO_PI * 0.5);
  ctx.fill();
  // lid knob
  ctx.fillStyle = "#4b5563";
  ctx.beginPath(); ctx.arc(potX, potTop - 2, 6, 0, TWO_PI); ctx.fill();
  ctx.fillStyle = "#9ca3af";
  ctx.beginPath(); ctx.arc(potX, potTop - 3, 4, 0, TWO_PI * 0.5); ctx.fill();

  // side handles
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#4b5563";
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(potX + side * (potR + 7), potTop + potH * 0.28, 9, 5, 0, 0, TWO_PI);
    ctx.fill();
    ctx.fillStyle = "#6b7280";
    ctx.beginPath();
    ctx.ellipse(potX + side * (potR + 7), potTop + potH * 0.28, 6, 3, 0, 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  }

  drawHeatBar(ctx, s, x + 6, y + h - 20, w - 12);

  ctx.fillStyle = "rgba(31,41,55,0.82)";
  ctx.font = "bold 11px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x + w / 2, y + h - 7);

  if (isNearby) stationNearbyGlow(ctx, x, y, w, h, 10, "#16a34a");
}

function drawOvenStation(ctx, s, isNearby, label, t) {
  const { x, y, w, h } = s;
  stationShadow(ctx, x, y, w, h, 10);

  // oven body
  const bg = ctx.createLinearGradient(x, y, x + w * 0.5, y + h);
  bg.addColorStop(0, "#5c2a08");
  bg.addColorStop(0.4, "#7c3a12");
  bg.addColorStop(1, "#4a1a04");
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();

  // control panel at top
  ctx.fillStyle = "#3a1a04";
  roundRect(ctx, x + 6, y + 6, w - 12, 24, 6);
  ctx.fill();

  // knobs on panel
  const knobXArr = [x + 20, x + w / 2, x + w - 20];
  for (const kx of knobXArr) {
    ctx.fillStyle = "#1f2937";
    ctx.beginPath(); ctx.arc(kx, y + 18, 7, 0, TWO_PI); ctx.fill();
    ctx.fillStyle = "#374151";
    ctx.beginPath(); ctx.arc(kx, y + 18, 5, 0, TWO_PI); ctx.fill();
    // indicator line
    const angle = s.isOn ? -Math.PI / 3 : -Math.PI / 2;
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(kx, y + 18);
    ctx.lineTo(kx + Math.cos(angle) * 4, y + 18 + Math.sin(angle) * 4);
    ctx.stroke();
  }

  // door
  ctx.fillStyle = "#5a2808";
  roundRect(ctx, x + 8, y + 36, w - 16, h - 50, 8);
  ctx.fill();

  // door window
  const winX = x + w * 0.5, winY = y + 36 + (h - 50) * 0.42;
  const winW = (w - 28) * 0.7, winH = (h - 50) * 0.38;
  ctx.fillStyle = s.isOn ? "#1a0a00" : "#0f172a";
  roundRect(ctx, winX - winW / 2, winY - winH / 2, winW, winH, 5);
  ctx.fill();

  if (s.isOn) {
    const gflicker = 0.55 + Math.sin(t * 0.025) * 0.20;
    const heatGlow = ctx.createRadialGradient(winX, winY, 2, winX, winY, winW * 0.8);
    heatGlow.addColorStop(0, `rgba(251,191,36,${gflicker})`);
    heatGlow.addColorStop(0.5, `rgba(239,68,68,${gflicker * 0.6})`);
    heatGlow.addColorStop(1, "rgba(239,68,68,0)");
    ctx.fillStyle = heatGlow;
    roundRect(ctx, winX - winW / 2, winY - winH / 2, winW, winH, 5);
    ctx.fill();
  }

  // window frame
  ctx.strokeStyle = "#78350f";
  ctx.lineWidth = 2;
  roundRect(ctx, winX - winW / 2, winY - winH / 2, winW, winH, 5);
  ctx.stroke();

  // door handle
  ctx.fillStyle = "#92400e";
  roundRect(ctx, x + w * 0.28, y + h - 22, w * 0.44, 10, 4);
  ctx.fill();
  ctx.fillStyle = "#d97706";
  roundRect(ctx, x + w * 0.30, y + h - 21, w * 0.40, 6, 3);
  ctx.fill();

  drawHeatBar(ctx, s, x + 6, y + h - 14, w - 12);

  ctx.fillStyle = "rgba(254,243,199,0.85)";
  ctx.font = "bold 11px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x + w / 2, y + h - 5);

  if (isNearby) stationNearbyGlow(ctx, x, y, w, h, 12, "#f59e0b");
}

function drawPlatingStation(ctx, s, isNearby, label) {
  const { x, y, w, h } = s;
  stationShadow(ctx, x, y, w, h, 14);

  // marble surface
  const mg = ctx.createLinearGradient(x, y, x + w, y + h);
  mg.addColorStop(0, "#f8f4f0");
  mg.addColorStop(0.5, "#f0ece8");
  mg.addColorStop(1, "#e8e2de");
  ctx.fillStyle = mg;
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();

  // marble veins
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.strokeStyle = "#9a9090";
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const vx = x + 18 + i * 38;
    ctx.beginPath();
    ctx.moveTo(vx, y + 6);
    ctx.bezierCurveTo(vx + 10, y + h * 0.4, vx - 6, y + h * 0.6, vx + 8, y + h - 6);
    ctx.stroke();
  }
  ctx.restore();

  // plate ring
  const cx = x + w / 2, cy = y + h / 2 - 6;
  ctx.strokeStyle = "#c8b89a";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(cx, cy, 38, 15, 0, 0, TWO_PI); ctx.stroke();
  // inner plate
  const plateG = ctx.createRadialGradient(cx - 8, cy - 4, 2, cx, cy, 36);
  plateG.addColorStop(0, "#ffffff");
  plateG.addColorStop(0.7, "#f8f8f8");
  plateG.addColorStop(1, "#f0ece8");
  ctx.fillStyle = plateG;
  ctx.beginPath(); ctx.ellipse(cx, cy, 34, 13, 0, 0, TWO_PI); ctx.fill();
  // gold rim
  ctx.strokeStyle = "#d4a818";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(cx, cy, 33, 12.5, 0, 0, TWO_PI); ctx.stroke();

  // top highlight
  ctx.fillStyle = "rgba(255,255,255,0.40)";
  roundRect(ctx, x + 2, y + 2, w - 4, 7, 10);
  ctx.fill();

  ctx.fillStyle = "rgba(75,60,40,0.75)";
  ctx.font = "bold 11px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x + w / 2, y + h - 7);

  if (isNearby) stationNearbyGlow(ctx, x, y, w, h, 14, "#84cc16");
}

function drawServingStation(ctx, s, isNearby, label, t) {
  const { x, y, w, h } = s;
  stationShadow(ctx, x, y, w, h, 12);

  // counter surface
  const cg = ctx.createLinearGradient(x, y, x, y + h);
  cg.addColorStop(0, "#fef9ee");
  cg.addColorStop(0.5, "#fef3d8");
  cg.addColorStop(1, "#fde68a");
  ctx.fillStyle = cg;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();

  // ticket rail at top
  ctx.fillStyle = "#92400e";
  roundRect(ctx, x + 8, y + 5, w - 16, 10, 5);
  ctx.fill();
  // ticket clips
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = "#b45309";
    ctx.beginPath();
    ctx.arc(x + 26 + i * (w - 52) / 2, y + 10, 4, 0, TWO_PI);
    ctx.fill();
  }

  // service bell
  const bx = x + w / 2 - 8, by = y + h / 2 - 14;
  const bellBob = Math.sin(t * 0.003) * 1.5;

  // bell shadow
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath(); ctx.ellipse(bx + 10, by + 40 + bellBob, 18, 5, 0, 0, TWO_PI); ctx.fill();

  // bell dome
  const bellG = ctx.createRadialGradient(bx + 4, by + 8 + bellBob, 2, bx + 10, by + 20 + bellBob, 20);
  bellG.addColorStop(0, "#fde68a");
  bellG.addColorStop(0.5, "#f59e0b");
  bellG.addColorStop(1, "#d97706");
  ctx.fillStyle = bellG;
  ctx.beginPath();
  ctx.arc(bx + 10, by + 22 + bellBob, 20, Math.PI, 0);
  ctx.fill();
  // bell base
  ctx.fillStyle = "#d97706";
  ctx.fillRect(bx - 2, by + 21 + bellBob, 24, 7);
  // bell shine
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.beginPath();
  ctx.ellipse(bx + 5, by + 15 + bellBob, 6, 3, -0.5, 0, TWO_PI);
  ctx.fill();
  // bell knob
  ctx.fillStyle = "#92400e";
  ctx.beginPath(); ctx.arc(bx + 10, by + 20 + bellBob, 3.5, 0, TWO_PI); ctx.fill();
  // strike button
  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(bx + 6, by + 28 + bellBob, 8, 3);

  ctx.fillStyle = "rgba(120,60,10,0.82)";
  ctx.font = "bold 11px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x + w / 2, y + h - 7);

  if (isNearby) stationNearbyGlow(ctx, x, y, w, h, 12, "#f59e0b");
}

function drawHeatBar(ctx, s, bx, by, bw) {
  const ratio = Math.max(0, Math.min(1, (s.temperature - 20) / (s.maxTemperature - 20)));
  const bh = 7;
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  roundRect(ctx, bx, by, bw, bh, 999);
  ctx.fill();
  if (ratio > 0) {
    const bg = ctx.createLinearGradient(bx, by, bx + bw, by);
    bg.addColorStop(0, "#fbbf24");
    bg.addColorStop(0.65, "#f97316");
    bg.addColorStop(1, "#dc2626");
    ctx.fillStyle = bg;
    roundRect(ctx, bx, by, bw * ratio, bh, 999);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "600 9px Outfit, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`${Math.round(s.temperature)}°`, bx + bw, by - 2);
  if (s.isOn) {
    const ig = ctx.createRadialGradient(bx + bw - 6, by + 3, 0, bx + bw - 6, by + 3, 8);
    ig.addColorStop(0, "rgba(34,197,94,0.8)");
    ig.addColorStop(1, "rgba(34,197,94,0)");
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.arc(bx + bw - 6, by + 3, 8, 0, TWO_PI); ctx.fill();
    ctx.fillStyle = "#22c55e";
    ctx.beginPath(); ctx.arc(bx + bw - 6, by + 3, 3.5, 0, TWO_PI); ctx.fill();
  }
}

// ─── STATION CONTENTS ─────────────────────────────────────────────────────────
function drawStationContents(ctx, state) {
  for (const ing of state.ingredients) {
    if (state.chef.holdingId === ing.id) continue;
    if (ing.stationId === "plate_stack") continue;
    drawIngredientSprite(ctx, ing);
  }
}

function drawPlateStack(ctx, state) {
  const items = state.ingredients.filter((i) => i.stationId === "plate_stack");
  items.forEach((ing, idx) => {
    const clone = {
      ...ing,
      position: { x: ing.position.x + ((idx % 2) - 0.5) * 16, y: ing.position.y - Math.floor(idx / 2) * 8 },
    };
    drawIngredientSprite(ctx, clone);
  });
}

// ─── CHEF ─────────────────────────────────────────────────────────────────────
function drawChef(ctx, state) {
  const { chef } = state;
  const walkPulse = state.mode === "playing" ? Math.sin(state.elapsedMs * 0.022) : 0;
  const bob = state.mode === "playing" ? Math.sin(state.elapsedMs * 0.014) * 1.8 : 0;

  ctx.save();
  ctx.translate(chef.x, chef.y + bob);

  ctx.fillStyle = "rgba(15,23,42,0.16)";
  ctx.beginPath();
  ctx.ellipse(0, 24, 15, 6, 0, 0, TWO_PI);
  ctx.fill();

  const armSwing = walkPulse * 3.8;
  const legSwing = walkPulse * 5.2;

  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Stick torso
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(0, 8);
  ctx.stroke();

  // Stick arms
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.lineTo(-11, 8 + armSwing);
  ctx.moveTo(0, -2);
  ctx.lineTo(11, 8 - armSwing);
  ctx.stroke();

  // Stick legs
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(-8, 23 + legSwing);
  ctx.moveTo(0, 8);
  ctx.lineTo(8, 23 - legSwing);
  ctx.stroke();

  // Head without facial details
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.arc(0, -22, 9, 0, TWO_PI);
  ctx.fill();
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 2.6;
  ctx.stroke();

  // Minimal chef cap
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, -10, -36, 20, 7, 3);
  ctx.fill();
  roundRect(ctx, -6, -43, 12, 8, 2);
  ctx.fill();
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1.1;
  roundRect(ctx, -10, -36, 20, 7, 3);
  ctx.stroke();

  // Carried ingredient near right hand
  if (chef.holdingId) {
    const carried = state.ingredients.find((it) => it.id === chef.holdingId);
    if (carried) {
      drawIngredientSprite(
        ctx,
        { ...carried, position: { x: 15, y: -2 }, size: { w: 26, h: 26 } },
        true
      );
    }
  }

  ctx.restore();
}

function drawIngredientSprite(ctx, ingredient, ignoreShadow = false) {
  const { x, y } = ingredient.position;
  const w = ingredient.size?.w ?? 44;
  const h = ingredient.size?.h ?? 44;

  if (!ignoreShadow) {
    ctx.fillStyle = "rgba(15,23,42,0.16)";
    ctx.beginPath();
    ctx.ellipse(x, y + h * 0.3, w * 0.38, h * 0.14, 0, 0, TWO_PI);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(x, y - 4);

  switch (ingredient.type) {
    case "onion":     drawOnion(ctx, ingredient.state, w, h); break;
    case "tomato":    drawTomato(ctx, ingredient.state, w, h); break;
    case "potato":    drawPotato(ctx, ingredient.state, w, h); break;
    case "meat_patty":drawPatty(ctx, ingredient.state, w, h); break;
    case "bun":       drawBun(ctx, ingredient.state, w, h); break;
    case "dough":     drawDough(ctx, ingredient.state, w, h); break;
    case "cheese":    drawCheese(ctx, ingredient.state, w, h); break;
    case "lettuce":   drawLettuce(ctx, ingredient.state, w, h); break;
    case "mushroom":  drawMushroom(ctx, ingredient.state, w, h); break;
    case "chicken":   drawChicken(ctx, ingredient.state, w, h); break;
    default:
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(-w * 0.3, -h * 0.2, w * 0.6, h * 0.4);
  }

  // cook-level tint overlay
  const profile = getProfile(ingredient.type, ingredient.cookMethod || "fry")
    ?? getProfile(ingredient.type, ingredient.cookMethod || "boil")
    ?? getProfile(ingredient.type, ingredient.cookMethod || "bake");
  if (profile) {
    const burnThreshold = profile.burn ?? (profile.overcook + 4) ?? profile.ideal + 5;
    const tint = getCookTint(ingredient.cookLevel ?? 0, profile.ideal, burnThreshold);
    if (tint > 0.01) {
      ctx.globalAlpha = Math.min(0.72, tint);
      ctx.fillStyle = "#5b3418";
      ctx.beginPath(); ctx.ellipse(0, 0, w * 0.28, h * 0.20, 0, 0, TWO_PI); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  if (ingredient.state === "burned") {
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = "#0f172a";
    ctx.beginPath(); ctx.ellipse(0, 0, w * 0.30, h * 0.22, 0, 0, TWO_PI); ctx.fill();
    ctx.globalAlpha = 1;
    // smoke wisps
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 6, -h * 0.24);
      ctx.bezierCurveTo(i * 6 + 4, -h * 0.38, i * 6 - 4, -h * 0.50, i * 6 + 2, -h * 0.62);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

function drawOnion(ctx, state, w, h) {
  const R = w * 0.28, HR = h * 0.22;
  const isDiced = state === "diced";
  const isSliced = state === "sliced";
  const isSauteed = state === "sauteed" || state === "caramelized";

  if (isDiced) {
    // multiple small cubes
    ctx.fillStyle = isSauteed ? "#7c3f8f" : "#a78bfa";
    for (let r = -1; r <= 1; r++) {
      for (let c = -1; c <= 1; c++) {
        if (Math.abs(r) + Math.abs(c) > 1) continue;
        roundRect(ctx, c * 9 - 4, r * 9 - 4, 8, 8, 2);
        ctx.fill();
      }
    }
    return;
  }

  // main bulb shape
  const color = isSauteed ? "#c084fc" : isSliced ? "#c4b5fd" : "#ddd6fe";
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(0, 2, R, HR, 0, 0, TWO_PI); ctx.fill();

  // top highlight
  ctx.fillStyle = "rgba(255,255,255,0.30)";
  ctx.beginPath(); ctx.ellipse(-R * 0.25, HR * 0.1 - HR * 0.3, R * 0.42, HR * 0.28, -0.3, 0, TWO_PI); ctx.fill();

  // root base
  ctx.strokeStyle = "#8b5cf6";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-4, HR + 2); ctx.lineTo(0, HR + 6); ctx.lineTo(4, HR + 2); ctx.stroke();

  // concentric rings
  ctx.strokeStyle = "rgba(139,92,246,0.45)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 2; i++) {
    ctx.beginPath(); ctx.ellipse(0, 2, R * (0.65 - i * 0.15), HR * (0.65 - i * 0.15), 0, 0, TWO_PI); ctx.stroke();
  }

  // stem tip
  ctx.fillStyle = "#6d28d9";
  ctx.beginPath(); ctx.arc(0, -HR, 3, 0, TWO_PI); ctx.fill();

  if (isSliced) {
    ctx.strokeStyle = "#7c3aed";
    ctx.lineWidth = 1.5;
    for (let a = 0; a < Math.PI; a += Math.PI / 3) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R * 0.9, Math.sin(a) * HR * 0.9); ctx.stroke();
    }
  }
}

function drawTomato(ctx, state, w, h) {
  const R = w * 0.28, HR = h * 0.22;
  const isDiced = state === "diced";
  const isSliced = state === "sliced";

  if (isDiced) {
    ctx.fillStyle = "#f87171";
    for (let r = -1; r <= 1; r++) {
      for (let c = -1; c <= 1; c++) {
        if (Math.abs(r) + Math.abs(c) > 1) continue;
        roundRect(ctx, c * 9 - 4, r * 9 - 4, 8, 8, 2);
        ctx.fill();
        ctx.fillStyle = "#fecaca";
        ctx.fillRect(c * 9 - 3, r * 9 - 3, 3, 2);
        ctx.fillStyle = "#f87171";
      }
    }
    return;
  }

  // base
  ctx.fillStyle = "#ef4444";
  ctx.beginPath(); ctx.ellipse(0, 2, R, HR, 0, 0, TWO_PI); ctx.fill();
  // highlight
  ctx.fillStyle = "rgba(255,255,255,0.32)";
  ctx.beginPath(); ctx.ellipse(-R * 0.28, -HR * 0.20, R * 0.40, HR * 0.30, -0.4, 0, TWO_PI); ctx.fill();

  // seeds if sliced
  if (isSliced) {
    ctx.fillStyle = "#fecaca";
    for (let i = 0; i < 4; i++) {
      const a = (TWO_PI * i) / 4;
      ctx.beginPath(); ctx.ellipse(Math.cos(a) * R * 0.55, Math.sin(a) * HR * 0.55, 3, 2, a, 0, TWO_PI); ctx.fill();
    }
  }

  // green stem
  ctx.fillStyle = "#16a34a";
  ctx.save(); ctx.translate(0, -HR - 2);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(i * 3, -5, i * 6, -4, i * 7, -1);
    ctx.strokeStyle = "#15803d";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

function drawPotato(ctx, state, w, h) {
  const isDiced = state === "diced";
  const isBoiled = state === "boiled_cooked";

  if (isDiced) {
    ctx.fillStyle = isBoiled ? "#fef08a" : "#facc15";
    for (let r = -1; r <= 1; r++) {
      for (let c = -1; c <= 1; c++) {
        if (Math.abs(r) + Math.abs(c) > 1) continue;
        roundRect(ctx, c * 10 - 5, r * 10 - 5, 9, 9, 2);
        ctx.fill();
      }
    }
    return;
  }

  // irregular potato shape
  ctx.fillStyle = isBoiled ? "#d4aa50" : "#d97706";
  ctx.beginPath();
  ctx.ellipse(2, 0, w * 0.27, h * 0.19, 0.2, 0, TWO_PI);
  ctx.fill();
  // skin texture dots
  ctx.fillStyle = "rgba(120,60,0,0.30)";
  for (const [ex, ey] of [[-8, -5], [4, 3], [-2, 8], [8, -2], [-6, 6]]) {
    ctx.beginPath(); ctx.arc(ex * (w / 46), ey * (h / 46), 1.5, 0, TWO_PI); ctx.fill();
  }
  // highlight
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath(); ctx.ellipse(-4, -5, w * 0.12, h * 0.09, -0.3, 0, TWO_PI); ctx.fill();
}

function drawPatty(ctx, state, w, h) {
  const colors = {
    raw: "#b91c1c",
    fried_cooked: "#7c2d12",
    fried_overcooked: "#4a1d0f",
    burned: "#1c1917",
  };
  ctx.fillStyle = colors[state] ?? "#7c2d12";
  ctx.beginPath(); ctx.ellipse(0, 0, w * 0.31, h * 0.18, 0, 0, TWO_PI); ctx.fill();

  // edge detail
  ctx.strokeStyle = "rgba(0,0,0,0.30)";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 0, w * 0.31, h * 0.18, 0, 0, TWO_PI); ctx.stroke();

  // grill marks
  if (state !== "raw") {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 7 - 8, -h * 0.12);
      ctx.lineTo(i * 7 + 8, h * 0.12);
      ctx.stroke();
    }
    ctx.restore();
  }

  // surface sheen (raw)
  if (state === "raw") {
    ctx.fillStyle = "rgba(255,100,100,0.20)";
    ctx.beginPath(); ctx.ellipse(-4, -3, w * 0.15, h * 0.08, -0.4, 0, TWO_PI); ctx.fill();
  }
}

function drawBun(ctx, state, w, h) {
  const isToasted = state === "toasted" || state === "baked_overcooked";
  const topColor = isToasted ? "#b45309" : "#f59e0b";
  const baseColor = isToasted ? "#92400e" : "#d97706";

  // bottom half (bun base)
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.ellipse(0, 4, w * 0.31, h * 0.10, 0, 0, TWO_PI);
  ctx.fill();

  // top bun dome
  ctx.fillStyle = topColor;
  ctx.beginPath();
  ctx.arc(0, -2, w * 0.28, Math.PI, 0);
  ctx.ellipse(0, -2, w * 0.28, h * 0.10, 0, 0, TWO_PI * 0.5, Math.PI);
  ctx.fill();

  // sesame seeds
  ctx.fillStyle = isToasted ? "#78350f" : "#fef3c7";
  const seeds = [[-7, -8], [0, -12], [8, -7], [-3, -4], [6, -3]];
  for (const [sx, sy] of seeds) {
    ctx.beginPath(); ctx.ellipse(sx, sy, 2.5, 1.2, (sx * 0.2), 0, TWO_PI); ctx.fill();
  }
  // highlight
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.beginPath(); ctx.ellipse(-5, -8, 7, 3, -0.5, 0, TWO_PI); ctx.fill();
}

function drawDough(ctx, state, w, h) {
  const isBaked = state === "baked_cooked";
  const isOvercooked = state === "baked_overcooked";
  ctx.fillStyle = isOvercooked ? "#b45309" : isBaked ? "#d97706" : "#fde68a";
  ctx.beginPath(); ctx.ellipse(0, 0, w * 0.32, h * 0.20, 0, 0, TWO_PI); ctx.fill();

  // dough texture bumps (raw)
  if (!isBaked && !isOvercooked) {
    ctx.fillStyle = "rgba(254,215,100,0.6)";
    for (const [bx, by] of [[-8, -3], [3, -7], [9, 2], [-3, 6], [0, 0]]) {
      ctx.beginPath(); ctx.arc(bx, by, 3, 0, TWO_PI); ctx.fill();
    }
  }

  // crust bubbles when baked
  if (isBaked || isOvercooked) {
    ctx.fillStyle = "rgba(120,53,15,0.45)";
    for (const [bx, by, r] of [[-7, -2, 4], [5, 3, 3.5], [-2, 6, 3]]) {
      ctx.beginPath(); ctx.arc(bx, by, r, 0, TWO_PI); ctx.fill();
    }
  }
  // highlight
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath(); ctx.ellipse(-6, -5, w * 0.12, h * 0.09, -0.4, 0, TWO_PI); ctx.fill();
}

function drawCheese(ctx, state, w, h) {
  const isMelted = state === "melted";
  const isSliced = state === "sliced" || isMelted;

  if (isMelted) {
    // melted cheese drips
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath(); ctx.ellipse(0, 2, w * 0.34, h * 0.16, 0, 0, TWO_PI); ctx.fill();
    // drips
    ctx.fillStyle = "#f59e0b";
    for (const [dx, dy] of [[-10, 5], [0, 7], [10, 5], [-5, 8], [5, 8]]) {
      ctx.beginPath();
      ctx.ellipse(dx, h * 0.14 + dy, 4, 6, 0, 0, TWO_PI);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.beginPath(); ctx.ellipse(-4, -4, 8, 4, -0.4, 0, TWO_PI); ctx.fill();
    return;
  }

  if (isSliced) {
    // slice wedge shape
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.moveTo(-w * 0.30, h * 0.14);
    ctx.lineTo(w * 0.30, h * 0.14);
    ctx.lineTo(w * 0.22, -h * 0.12);
    ctx.lineTo(-w * 0.22, -h * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ca8a04";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // holes
    ctx.fillStyle = "#fef08a";
    ctx.beginPath(); ctx.arc(-5, 2, 3, 0, TWO_PI); ctx.fill();
    ctx.beginPath(); ctx.arc(6, -2, 2.5, 0, TWO_PI); ctx.fill();
    return;
  }

  // whole cheese wedge (3D)
  ctx.fillStyle = "#fde047";
  ctx.beginPath();
  ctx.moveTo(-w * 0.32, h * 0.18);
  ctx.lineTo(w * 0.32, h * 0.18);
  ctx.lineTo(w * 0.24, -h * 0.16);
  ctx.lineTo(-w * 0.24, -h * 0.16);
  ctx.closePath();
  ctx.fill();
  // darker side face
  ctx.fillStyle = "#d4a008";
  ctx.beginPath();
  ctx.moveTo(w * 0.24, -h * 0.16);
  ctx.lineTo(w * 0.32, h * 0.18);
  ctx.lineTo(w * 0.38, h * 0.12);
  ctx.lineTo(w * 0.30, -h * 0.20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#ca8a04";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-w * 0.32, h * 0.18);
  ctx.lineTo(w * 0.32, h * 0.18);
  ctx.lineTo(w * 0.24, -h * 0.16);
  ctx.lineTo(-w * 0.24, -h * 0.16);
  ctx.closePath();
  ctx.stroke();
  // holes
  ctx.fillStyle = "#fef08a";
  ctx.beginPath(); ctx.arc(-6, 2, 3.5, 0, TWO_PI); ctx.fill();
  ctx.beginPath(); ctx.arc(5, -3, 2.5, 0, TWO_PI); ctx.fill();
}

function drawLettuce(ctx, state, w, h) {
  const isShredded = state === "shredded";

  if (isShredded) {
    // shredded strips
    ctx.fillStyle = "#4ade80";
    for (let i = -2; i <= 2; i++) {
      ctx.save();
      ctx.rotate(i * 0.28);
      ctx.beginPath();
      ctx.ellipse(i * 4, 0, w * 0.10, h * 0.24, i * 0.2, 0, TWO_PI);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "#22c55e";
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.ellipse(i * 7, -2, w * 0.07, h * 0.18, i * 0.15, 0, TWO_PI);
      ctx.fill();
    }
    return;
  }

  // whole lettuce head (ruffled)
  const leafColor = "#4ade80";
  const darkLeaf = "#16a34a";
  ctx.fillStyle = leafColor;

  // multiple overlapping leaf shapes
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * TWO_PI;
    const lx = Math.cos(angle) * w * 0.12;
    const ly = Math.sin(angle) * h * 0.10;
    ctx.beginPath();
    ctx.ellipse(lx, ly, w * 0.18, h * 0.16, angle, 0, TWO_PI);
    ctx.fill();
  }
  // center
  ctx.fillStyle = "#86efac";
  ctx.beginPath(); ctx.ellipse(0, 0, w * 0.14, h * 0.12, 0, 0, TWO_PI); ctx.fill();
  // dark veins
  ctx.save();
  ctx.globalAlpha = 0.30;
  ctx.strokeStyle = darkLeaf;
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * TWO_PI;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * w * 0.22, Math.sin(angle) * h * 0.18);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMushroom(ctx, state, w, h) {
  const isSliced = state === "sliced";
  const isFried = state === "fried_cooked" || state === "fried_overcooked";

  if (isSliced) {
    // cross-section slices
    ctx.fillStyle = isFried ? "#d4a57a" : "#f5e0c8";
    for (let i = -1; i <= 1; i++) {
      // cap outline
      ctx.beginPath();
      ctx.arc(i * 9, -2, 7, Math.PI, 0);
      ctx.fill();
      // stem
      ctx.fillRect(i * 9 - 3, -2, 6, 6);
      // gills
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "#c8a090";
      ctx.lineWidth = 0.8;
      for (let g = -2; g <= 2; g++) {
        ctx.beginPath();
        ctx.moveTo(i * 9 + g * 1.5, -8);
        ctx.lineTo(i * 9 + g * 1.5 * 0.7, 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    return;
  }

  // whole mushroom
  const capColor = isFried ? "#d4a57a" : "#d4b8a0";
  const stemColor = isFried ? "#f5dcc8" : "#f5ece0";
  const spotColor = "#c8a090";

  // stem
  ctx.fillStyle = stemColor;
  ctx.fillRect(-w * 0.10, h * 0.02, w * 0.20, h * 0.20);
  // cap
  ctx.fillStyle = capColor;
  ctx.beginPath();
  ctx.arc(0, 0, w * 0.28, Math.PI, 0);
  ctx.ellipse(0, 0, w * 0.28, h * 0.10, 0, 0, TWO_PI * 0.5, Math.PI);
  ctx.fill();
  // cap top highlight
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath(); ctx.ellipse(-w * 0.10, -h * 0.10, w * 0.12, h * 0.07, -0.5, 0, TWO_PI); ctx.fill();
  // spots on cap
  ctx.fillStyle = spotColor;
  for (const [sx, sy] of [[-7, -5], [5, -8], [0, -3], [-3, -12], [8, -4]]) {
    ctx.beginPath(); ctx.arc(sx, sy, 2, 0, TWO_PI); ctx.fill();
  }
  // gills (underside)
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = "#b8906a";
  ctx.lineWidth = 1;
  for (let g = -3; g <= 3; g++) {
    ctx.beginPath();
    ctx.moveTo(g * 5, -1);
    ctx.quadraticCurveTo(g * 5 * 0.7, 4, 0, 6);
    ctx.stroke();
  }
  ctx.restore();
}

function drawChicken(ctx, state, w, h) {
  const isRaw = state === "raw";
  const isBaked = state === "baked_cooked" || state === "baked_overcooked";
  const isFried = state === "fried_cooked" || state === "fried_overcooked";

  const bodyColor = isBaked ? "#d97706" : isFried ? "#c2855a" : "#f9a8d4";
  const darkColor = isBaked ? "#92400e" : isFried ? "#8c5030" : "#e879a0";

  // breast / main body shape
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(0, 2, w * 0.28, h * 0.22, 0, 0, TWO_PI);
  ctx.fill();

  // drumstick bump
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.arc(-w * 0.22, h * 0.12, w * 0.12, 0, TWO_PI);
  ctx.fill();

  // bone handle if not raw
  if (!isRaw) {
    ctx.fillStyle = "#fef9ee";
    ctx.beginPath(); ctx.arc(-w * 0.30, h * 0.12, 4, 0, TWO_PI); ctx.fill();
    ctx.strokeStyle = "#fef9ee";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w * 0.30, h * 0.12);
    ctx.lineTo(-w * 0.38, h * 0.12);
    ctx.stroke();
  }

  // surface detail
  if (isFried || isBaked) {
    // crispy grill lines
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "#7c3500";
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 8 - 6, -h * 0.14);
      ctx.quadraticCurveTo(i * 6, 0, i * 8 + 6, h * 0.14);
      ctx.stroke();
    }
    ctx.restore();
  }

  // pink raw surface
  if (isRaw) {
    ctx.fillStyle = "rgba(255,150,180,0.30)";
    ctx.beginPath(); ctx.ellipse(-3, -2, w * 0.14, h * 0.10, -0.3, 0, TWO_PI); ctx.fill();
  }

  // highlight
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath(); ctx.ellipse(-4, -5, w * 0.12, h * 0.08, -0.4, 0, TWO_PI); ctx.fill();
}

// ─── PARTICLES ────────────────────────────────────────────────────────────────
function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.alpha ?? 1;

    switch (p.kind) {
      case "boil_bubble": {
        // glass-like bubble
        const br = p.radius ?? 3;
        const bubG = ctx.createRadialGradient(p.x - br * 0.3, p.y - br * 0.3, 0.5, p.x, p.y, br * 1.2);
        bubG.addColorStop(0, "rgba(219,234,254,0.90)");
        bubG.addColorStop(0.7, "rgba(191,219,254,0.40)");
        bubG.addColorStop(1, "rgba(147,197,253,0.10)");
        ctx.fillStyle = bubG;
        ctx.beginPath(); ctx.arc(p.x, p.y, br, 0, TWO_PI); ctx.fill();
        ctx.strokeStyle = "rgba(147,197,253,0.75)";
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(p.x, p.y, br, 0, TWO_PI); ctx.stroke();
        break;
      }
      case "steam": {
        const sg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        sg.addColorStop(0, "rgba(226,232,240,0.70)");
        sg.addColorStop(0.5, "rgba(241,245,249,0.40)");
        sg.addColorStop(1, "rgba(248,250,252,0)");
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * 0.45, p.size * 0.65, p.x * 0.01, 0, TWO_PI); ctx.fill();
        break;
      }
      case "smoke": {
        const smG = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        smG.addColorStop(0, "rgba(55,65,81,0.75)");
        smG.addColorStop(1, "rgba(55,65,81,0)");
        ctx.fillStyle = smG;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * 0.50, p.size * 0.40, 0, 0, TWO_PI); ctx.fill();
        break;
      }
      case "fry_spark": {
        // orange spark with glow
        const sg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, (p.size ?? 2) * 2.5);
        sg.addColorStop(0, "rgba(253,224,71,0.95)");
        sg.addColorStop(0.4, "rgba(249,115,22,0.70)");
        sg.addColorStop(1, "rgba(249,115,22,0)");
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.arc(p.x, p.y, (p.size ?? 2) * 2.5, 0, TWO_PI); ctx.fill();
        ctx.fillStyle = "#fef08a";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size ?? 2, 0, TWO_PI); ctx.fill();
        break;
      }
      case "cut_piece": {
        const cs = p.size ?? 3;
        ctx.fillStyle = p.tint ?? "#fde68a";
        roundRect(ctx, p.x - cs, p.y - cs, cs * 2, cs * 2, 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillRect(p.x - cs + 1, p.y - cs + 1, cs, 1);
        break;
      }
      case "success": {
        // star-like confetti
        const ss = p.size ?? 3;
        ctx.fillStyle = p.tint ?? "#fde68a";
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.x * 0.05 + p.y * 0.03);
        ctx.fillRect(-ss, -ss * 0.4, ss * 2, ss * 0.8);
        ctx.fillRect(-ss * 0.4, -ss, ss * 0.8, ss * 2);
        ctx.restore();
        break;
      }
      default: {
        ctx.fillStyle = p.tint ?? "#fbbf24";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size ?? 2.5, 0, TWO_PI); ctx.fill();
      }
    }

    ctx.restore();
  }
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
function drawTopHud(ctx, state) {
  ctx.save();
  const hudX = 10;
  const hudY = 8;
  const hudW = 286;
  const hudH = 34;

  const panel = ctx.createLinearGradient(hudX, hudY, hudX, hudY + hudH);
  panel.addColorStop(0, "rgba(15,23,42,0.72)");
  panel.addColorStop(1, "rgba(15,23,42,0.55)");
  ctx.fillStyle = panel;
  roundRect(ctx, hudX, hudY, hudW, hudH, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(99,102,241,0.34)";
  ctx.lineWidth = 1;
  roundRect(ctx, hudX, hudY, hudW, hudH, 10);
  ctx.stroke();

  const sec = Math.max(0, Math.ceil(state.remainingMs / 1000));
  const timerColor = sec < 30 ? "#f87171" : sec < 60 ? "#fbbf24" : "#86efac";
  const timeLabel = state.locale === "es" ? "Tiempo" : "Time";

  ctx.font = "700 12px Outfit, sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "#fbbf24";
  ctx.fillText("Score " + state.score, hudX + 10, hudY + 22);
  ctx.fillStyle = "#a5f3fc";
  ctx.fillText("Combo x" + state.combo, hudX + 102, hudY + 22);
  ctx.fillStyle = timerColor;
  ctx.fillText(timeLabel + " " + sec + "s", hudX + 188, hudY + 22);

  ctx.restore();
}

function drawOrderTickets(ctx, state) {
  const startX = STAGE_WIDTH - 244;
  const startY = 12;
  const W = 228, H = 102;
  const gap = 8;

  ctx.save();
  ctx.font = "700 12px Outfit, sans-serif";
  ctx.textAlign = "left";

  for (let i = 0; i < 2; i++) {
    const order = state.activeOrders[i];
    const ty = startY + i * (H + gap);

    // ticket paper bg
    const tg = ctx.createLinearGradient(startX, ty, startX, ty + H);
    tg.addColorStop(0, "rgba(255,255,255,0.94)");
    tg.addColorStop(1, "rgba(248,245,238,0.88)");
    ctx.fillStyle = tg;
    roundRect(ctx, startX, ty, W, H, 12);
    ctx.fill();

    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    roundRect(ctx, startX + 2, ty + 4, W, H, 12);
    // redraw bg over shadow
    ctx.fillStyle = tg;
    roundRect(ctx, startX, ty, W, H, 12);
    ctx.fill();

    if (!order) {
      // empty slot
      ctx.strokeStyle = "rgba(148,163,184,0.35)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      roundRect(ctx, startX, ty, W, H, 12);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(100,116,139,0.55)";
      ctx.textAlign = "center";
      ctx.font = "600 12px Outfit, sans-serif";
      ctx.fillText(state.locale === "es" ? "— En espera —" : "— Waiting —", startX + W / 2, ty + H / 2 + 5);
      ctx.textAlign = "left";
      ctx.font = "700 12px Outfit, sans-serif";
      continue;
    }

    const remMs = Math.max(0, order.deadlineAtMs - state.elapsedMs);
    const ratio = remMs / order.durationMs;
    const urgentColor = ratio > 0.5 ? "#16a34a" : ratio > 0.22 ? "#d97706" : "#dc2626";

    // urgency side stripe
    ctx.fillStyle = urgentColor;
    roundRect(ctx, startX, ty, 5, H, 12);
    ctx.fill();
    ctx.fillRect(startX + 5, ty + 12, 3, H - 24);

    // ticket border
    ctx.strokeStyle = urgentColor + "66";
    ctx.lineWidth = 1.5;
    roundRect(ctx, startX, ty, W, H, 12);
    ctx.stroke();

    // recipe name
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 13px Outfit, sans-serif";
    const name = state.locale === "es" ? order.recipe.nameEs : order.recipe.nameEn;
    ctx.fillText(name, startX + 16, ty + 24);

    // summary
    ctx.fillStyle = "#64748b";
    ctx.font = "600 10px Outfit, sans-serif";
    const summary = state.locale === "es" ? order.recipe.summaryEs : order.recipe.summaryEn;
    const maxW = W - 26;
    ctx.fillText(summary.length > 36 ? summary.slice(0, 34) + "…" : summary, startX + 16, ty + 40);
    ctx.font = "700 12px Outfit, sans-serif";

    // countdown
    ctx.fillStyle = urgentColor;
    ctx.textAlign = "right";
    ctx.font = "700 14px Outfit, sans-serif";
    ctx.fillText(`${Math.ceil(remMs / 1000)}s`, startX + W - 14, ty + 24);
    ctx.textAlign = "left";
    ctx.font = "700 12px Outfit, sans-serif";

    // progress bar
    const barX = startX + 14, barY = ty + 54, barW = W - 28, barH = 8;
    ctx.fillStyle = "rgba(15,23,42,0.12)";
    roundRect(ctx, barX, barY, barW, barH, 999);
    ctx.fill();
    const barG = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    barG.addColorStop(0, urgentColor);
    barG.addColorStop(1, urgentColor + "88");
    ctx.fillStyle = barG;
    roundRect(ctx, barX, barY, barW * Math.max(0, Math.min(1, ratio)), barH, 999);
    ctx.fill();

    // step indicators (ingredient chips)
    if (order.recipe?.steps) {
      const stepY = ty + 74;
      order.recipe.steps.slice(0, 4).forEach((step, si) => {
        const chipX = startX + 14 + si * 50;
        ctx.fillStyle = "rgba(241,245,249,0.85)";
        roundRect(ctx, chipX, stepY, 44, 18, 5);
        ctx.fill();
        ctx.fillStyle = "#334155";
        ctx.font = "600 9px Outfit, sans-serif";
        ctx.fillText(step.type.slice(0, 4), chipX + 4, stepY + 12);
      });
    }
    ctx.font = "700 12px Outfit, sans-serif";
  }

  ctx.restore();
}

// ─── FEEDBACK ─────────────────────────────────────────────────────────────────
function drawFeedback(ctx, state) {
  if (!state.feedback || state.feedback.timerMs <= 0) return;

  const colorMap = {
    perfect: "#15803d", good: "#0e7490",
    late: "#a16207", wrong: "#b91c1c",
    burned: "#7f1d1d", overcooked: "#92400e", info: "#1d4ed8",
  };

  const alpha = Math.min(1, state.feedback.timerMs / 800);
  const y = STAGE_HEIGHT - 38;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";

  const color = colorMap[state.feedback.kind] ?? "#1d4ed8";
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.font = "800 28px Bricolage Grotesque, sans-serif";
  ctx.fillText(state.feedback.text, STAGE_WIDTH * 0.5 + 2, y + 2);
  // main text
  ctx.fillStyle = color;
  ctx.fillText(state.feedback.text, STAGE_WIDTH * 0.5, y);

  // glow halo
  ctx.globalAlpha = alpha * 0.28;
  ctx.shadowColor = color;
  ctx.shadowBlur = 22;
  ctx.fillText(state.feedback.text, STAGE_WIDTH * 0.5, y);

  ctx.restore();
}

// ─── OVERLAY ──────────────────────────────────────────────────────────────────
function resolveContextHint(state) {
  const nearestStation = state.stationList?.find((station) => station.id === state.nearestStationId) ?? null;
  if (!nearestStation) {
    return null;
  }

  if (state.locale === "es") {
    if (nearestStation.type === "fridge") {
      return "Nevera: selecciona ingrediente (1-6/panel) y pulsa E para cogerlo";
    }
    if (nearestStation.type === "cutting_board") {
      return "Tabla: E dejar/recoger ingrediente y Espacio para cortar";
    }
    if (nearestStation.type === "pan" || nearestStation.type === "pot" || nearestStation.type === "oven") {
      return "Coccion: E dejar/recoger y T para calor on/off";
    }
    if (nearestStation.type === "plating") {
      return "Emplatado: E para anadir o retirar ingrediente del plato";
    }
    if (nearestStation.type === "serving") {
      return "Entrega: con plato completo pulsa Enter para servir";
    }
    return "E interactuar con estacion";
  }

  if (nearestStation.type === "fridge") {
    return "Fridge: pick ingredient (1-6/panel) and press E to take it";
  }
  if (nearestStation.type === "cutting_board") {
    return "Board: E to drop/pick ingredient, Space to cut";
  }
  if (nearestStation.type === "pan" || nearestStation.type === "pot" || nearestStation.type === "oven") {
    return "Cooking: E to drop/pick and T to toggle heat";
  }
  if (nearestStation.type === "plating") {
    return "Plating: press E to add/remove ingredient on plate";
  }
  if (nearestStation.type === "serving") {
    return "Serving: with full plate, press Enter to deliver";
  }
  return "Press E to interact with station";
}

function drawStateOverlay(ctx, state) {
  if (state.mode === "playing") {
    const hint = resolveContextHint(state);
    if (hint) {
      ctx.save();
      const textW = ctx.measureText(hint).width + 28;
      const hx = STAGE_WIDTH / 2 - textW / 2;
      const hy = STAGE_HEIGHT - 56;
      ctx.fillStyle = "rgba(15,23,42,0.75)";
      roundRect(ctx, hx, hy, textW, 34, 10);
      ctx.fill();
      ctx.strokeStyle = "rgba(99,102,241,0.5)";
      ctx.lineWidth = 1;
      roundRect(ctx, hx, hy, textW, 34, 10);
      ctx.stroke();
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "600 13px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(hint, STAGE_WIDTH / 2, hy + 22);
      ctx.restore();
    }
    // ingredient selector
    drawIngredientSelector(ctx, state);
    return;
  }

  // dim overlay
  ctx.fillStyle = "rgba(15,23,42,0.62)";
  ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);

  ctx.textAlign = "center";

  if (state.mode === "menu") {
    // title panel
    const px = STAGE_WIDTH / 2 - 220, py = STAGE_HEIGHT / 2 - 130;
    const pg = ctx.createLinearGradient(px, py, px, py + 240);
    pg.addColorStop(0, "rgba(30,41,59,0.96)");
    pg.addColorStop(1, "rgba(15,23,42,0.94)");
    ctx.fillStyle = pg;
    roundRect(ctx, px, py, 440, 240, 20);
    ctx.fill();
    ctx.strokeStyle = "rgba(99,102,241,0.5)";
    ctx.lineWidth = 2;
    roundRect(ctx, px, py, 440, 240, 20);
    ctx.stroke();

    ctx.fillStyle = "#f1f5f9";
    ctx.font = "800 40px Bricolage Grotesque, sans-serif";
    ctx.fillText("Kitchen Rush 2D", STAGE_WIDTH / 2, py + 54);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 15px Outfit, sans-serif";
    const obj = state.locale === "es"
      ? "Corta, cocina, emplata y entrega antes de que expire el tiempo."
      : "Slice, cook, plate and deliver before timers run out.";
    ctx.fillText(obj, STAGE_WIDTH / 2, py + 86);

    ctx.fillStyle = "#7dd3fc";
    ctx.font = "600 13px Outfit, sans-serif";
    const ctrl = state.locale === "es"
      ? "WASD mover  •  E interactuar  •  Esp cortar  •  T encender"
      : "WASD move  •  E interact  •  Space cut  •  T toggle heat";
    ctx.fillText(ctrl, STAGE_WIDTH / 2, py + 116);

    const ing = state.locale === "es"
      ? "1-6 seleccionar ingrediente  |  F pantalla completa"
      : "1-6 select ingredient  |  F fullscreen";
    ctx.fillText(ing, STAGE_WIDTH / 2, py + 138);

    // start button
    const btnX = STAGE_WIDTH / 2 - 100, btnY = py + 162;
    const startG = ctx.createLinearGradient(btnX, btnY, btnX, btnY + 44);
    startG.addColorStop(0, "#4f46e5");
    startG.addColorStop(1, "#6d28d9");
    ctx.fillStyle = startG;
    roundRect(ctx, btnX, btnY, 200, 44, 12);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 18px Outfit, sans-serif";
    ctx.fillText(state.locale === "es" ? "▶  Iniciar" : "▶  Start", STAGE_WIDTH / 2, btnY + 28);

  } else if (state.mode === "paused") {
    ctx.fillStyle = "#f8fafc";
    ctx.font = "800 42px Bricolage Grotesque, sans-serif";
    ctx.fillText(state.locale === "es" ? "⏸ Pausa" : "⏸ Paused", STAGE_WIDTH / 2, STAGE_HEIGHT / 2 - 16);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 18px Outfit, sans-serif";
    ctx.fillText(state.locale === "es" ? "Pulsa P para continuar" : "Press P to resume", STAGE_WIDTH / 2, STAGE_HEIGHT / 2 + 28);

  } else if (state.mode === "gameover") {
    const px = STAGE_WIDTH / 2 - 200, py = STAGE_HEIGHT / 2 - 110;
    const pg = ctx.createLinearGradient(px, py, px, py + 220);
    pg.addColorStop(0, "rgba(30,41,59,0.96)");
    pg.addColorStop(1, "rgba(15,23,42,0.94)");
    ctx.fillStyle = pg;
    roundRect(ctx, px, py, 400, 220, 20);
    ctx.fill();
    ctx.strokeStyle = "rgba(251,191,36,0.5)";
    ctx.lineWidth = 2;
    roundRect(ctx, px, py, 400, 220, 20);
    ctx.stroke();

    ctx.fillStyle = "#fbbf24";
    ctx.font = "800 36px Bricolage Grotesque, sans-serif";
    ctx.fillText(state.locale === "es" ? "Turno Terminado" : "Shift Complete!", STAGE_WIDTH / 2, py + 48);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 20px Outfit, sans-serif";
    ctx.fillText(`⭐ ${state.score} pts`, STAGE_WIDTH / 2, py + 88);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 15px Outfit, sans-serif";
    ctx.fillText(`${state.ordersCompleted} pedidos  |  Mejor combo x${state.bestCombo ?? state.combo}`, STAGE_WIDTH / 2, py + 118);

    const btnX = STAGE_WIDTH / 2 - 100, btnY = py + 146;
    const btnG = ctx.createLinearGradient(btnX, btnY, btnX, btnY + 44);
    btnG.addColorStop(0, "#dc2626");
    btnG.addColorStop(1, "#991b1b");
    ctx.fillStyle = btnG;
    roundRect(ctx, btnX, btnY, 200, 44, 12);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 17px Outfit, sans-serif";
    ctx.fillText(state.locale === "es" ? "↺  Repetir" : "↺  Retry", STAGE_WIDTH / 2, btnY + 28);
  }
}

function drawIngredientSelector(ctx, state) {
  if (!state.availableIngredientTypes?.length) return;

  const types = state.availableIngredientTypes;
  const chipW = 70, chipH = 28, gap = 6;
  const totalW = types.length * (chipW + gap) - gap;
  const startX = STAGE_WIDTH / 2 - totalW / 2;
  const sy = STAGE_HEIGHT - 90;

  types.forEach((entry, i) => {
    const type = typeof entry === "string" ? entry : entry?.type;
    const label = typeof entry === "string"
      ? entry
      : (typeof entry?.name === "string" ? entry.name : type || "");
    const isSelected = type === state.selectedIngredientType;
    const cx = startX + i * (chipW + gap);

    ctx.fillStyle = isSelected ? "rgba(99,102,241,0.85)" : "rgba(15,23,42,0.65)";
    roundRect(ctx, cx, sy, chipW, chipH, 7);
    ctx.fill();

    if (isSelected) {
      ctx.strokeStyle = "#818cf8";
      ctx.lineWidth = 1.5;
      roundRect(ctx, cx, sy, chipW, chipH, 7);
      ctx.stroke();
    }

    ctx.fillStyle = isSelected ? "#ffffff" : "#94a3b8";
    ctx.font = `${isSelected ? "700" : "600"} 10px Outfit, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(`${i + 1} ${label.slice(0, 6)}`, cx + chipW / 2, sy + 18);
  });
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w * 0.5, h * 0.5));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
