// Pádel Pro Arena — render pseudo-3D sobre Canvas 2D. Se pinta de atrás hacia
// delante (painter's algorithm) a través de la proyección de physics.js. Toma
// prestadas las técnicas del render de Ping Pong Arena: superficies como quads 3D
// proyectados (no billboards planos), líneas como tiras 3D con perspectiva real,
// fondo de pabellón con gradiente + público + foco cenital, y materiales con
// sombreado. Dibuja: pista con líneas, cristales con montantes y reflejos, vallas
// de rejilla romboidal, red con cinta y postes, monigotes sin cara con sombreado y
// animación de carrera, palas perforadas, y pelota con sombra que comunica altura.

import {
  project3D,
  HALF_W,
  NEAR_Z,
  FAR_Z,
  NET_Z,
  NET_HEIGHT,
  NET_POST_HEIGHT,
  GLASS_HEIGHT,
  FENCE_HEIGHT,
  SERVICE_LINE_NEAR,
  SERVICE_LINE_FAR,
  BALL_R,
  clamp,
} from "./physics.js";
import { pointLabels } from "./rules.js";

export const PALETTE = {
  skyTop: "#0b1a24",
  skyBottom: "#04090d",
  standDark: "#0c1922",
  standRow: "#12242f",
  crowd: "rgba(150,180,205,0.22)",
  spot: "rgba(150,210,235,0.12)",
  courtNear: "#3a9d6f", // superficie iluminada (cerca)
  courtFar: "#256b4c", // superficie en sombra (lejos)
  courtBoxNear: "#2f8a60",
  courtBoxFar: "#1f5c41",
  line: "#f2f8f4",
  lineSoft: "rgba(242,248,244,0.75)",
  glassA: "rgba(150,205,230,0.10)",
  glassB: "rgba(120,175,205,0.05)",
  glassHi: "rgba(220,245,255,0.5)",
  glassFrame: "#9db4c2",
  glassPost: "#c3d2dc",
  fence: "rgba(150,172,192,0.42)",
  fencePost: "rgba(170,190,210,0.6)",
  netMesh: "rgba(232,240,250,0.5)",
  netMeshDark: "rgba(180,196,214,0.4)",
  netTape: "#f6faff",
  netStrap: "#dfe8f2",
  post: "#cdd8e0",
  postDark: "#8a99a6",
  ball: "#e2ff3d",
  ballHi: "#f8ffc0",
  ballEdge: "#a9cc00",
  shadow: "rgba(4,12,9,0.36)",
  home: "#ff8a3d",
  homeHi: "#ffb27a",
  homeDark: "#c14e1c",
  away: "#4aa3ff",
  awayHi: "#8ec6ff",
  awayDark: "#1f5bc0",
  skin: "#d0b393",
  skinDark: "#a98a68",
  hair: "#2a2018",
  shorts: "#1b2530",
  paddle: "#1b1f27",
  paddleFaceHome: "#ff5a3c",
  paddleFaceAway: "#3d7bff",
  paddleHi: "rgba(255,255,255,0.16)",
  text: "#eef4fb",
  textDim: "#9fc7b3",
};

function p(cam, x, y, z) {
  return project3D(cam, x, y, z);
}

// Rellena un polígono 3D (corners en coords de mundo). Descarta si algún vértice
// queda tras la cámara.
function quad(ctx, cam, corners, fill, stroke, lw = 1.5) {
  const s = corners.map((c) => p(cam, c[0], c[1], c[2]));
  if (s.some((q) => !q.visible)) return;
  ctx.beginPath();
  ctx.moveTo(s[0].sx, s[0].sy);
  for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].sx, s[i].sy);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

// Línea de pista paralela al eje X (fondo / saque), como tira 3D con ancho real.
function lineX(ctx, cam, z, x0, x1, w, fill) {
  quad(
    ctx,
    cam,
    [
      [x0, 0.4, z - w / 2],
      [x1, 0.4, z - w / 2],
      [x1, 0.4, z + w / 2],
      [x0, 0.4, z + w / 2],
    ],
    fill,
  );
}
// Línea de pista paralela al eje Z (laterales / central), como tira 3D.
function lineZ(ctx, cam, x, z0, z1, w, fill) {
  quad(
    ctx,
    cam,
    [
      [x - w / 2, 0.4, z0],
      [x + w / 2, 0.4, z0],
      [x + w / 2, 0.4, z1],
      [x - w / 2, 0.4, z1],
    ],
    fill,
  );
}

function line3(ctx, cam, a, b, style, width = 1) {
  const pa = p(cam, a[0], a[1], a[2]);
  const pb = p(cam, b[0], b[1], b[2]);
  if (!pa.visible || !pb.visible) return;
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(pa.sx, pa.sy);
  ctx.lineTo(pb.sx, pb.sy);
  ctx.stroke();
}

// ─── Fondo del pabellón ─────────────────────────────────────────────────────────
function drawArena(ctx, cam, vW, vH) {
  const g = ctx.createLinearGradient(0, 0, 0, vH);
  g.addColorStop(0, PALETTE.skyTop);
  g.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vW, vH);

  // Gradas tras el fondo rival, en varias filas escalonadas.
  const standTop = p(cam, 0, FENCE_HEIGHT + 260, FAR_Z + 120);
  const standBottom = p(cam, 0, FENCE_HEIGHT + 20, FAR_Z + 120);
  if (standTop.visible && standBottom.visible) {
    ctx.fillStyle = PALETTE.standDark;
    ctx.fillRect(0, 0, vW, Math.max(0, standBottom.sy));
    // Filas de público esquemático.
    for (let row = 0; row < 5; row++) {
      const y = FENCE_HEIGHT + 40 + row * 46;
      for (let i = -9; i <= 9; i++) {
        const x = i * 52 + (row % 2) * 26;
        const q = p(cam, x, y, FAR_Z + 118);
        if (!q.visible) continue;
        ctx.fillStyle = PALETTE.crowd;
        ctx.beginPath();
        ctx.arc(q.sx, q.sy, Math.max(1, 7 * q.scale), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Foco cenital.
  const cx = vW * 0.5;
  const rg = ctx.createRadialGradient(cx, vH * 0.08, 20, cx, vH * 0.08, vW * 0.72);
  rg.addColorStop(0, PALETTE.spot);
  rg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, vW, vH);
}

// ─── Pista y líneas ─────────────────────────────────────────────────────────────
function drawCourt(ctx, cam) {
  // Superficie por bandas de profundidad con degradado luz→sombra y distinción de
  // las cajas de saque, para dar volumen y perspectiva al césped.
  const bands = 14;
  for (let i = 0; i < bands; i++) {
    const z0 = NEAR_Z + ((FAR_Z - NEAR_Z) * i) / bands;
    const z1 = NEAR_Z + ((FAR_Z - NEAR_Z) * (i + 1)) / bands;
    const zc = (z0 + z1) / 2;
    const t = i / (bands - 1); // 0 cerca → 1 lejos
    const inBox = zc < SERVICE_LINE_NEAR || zc > SERVICE_LINE_FAR;
    const near = inBox ? PALETTE.courtBoxNear : PALETTE.courtNear;
    const far = inBox ? PALETTE.courtBoxFar : PALETTE.courtFar;
    quad(
      ctx,
      cam,
      [
        [-HALF_W, 0, z0],
        [HALF_W, 0, z0],
        [HALF_W, 0, z1],
        [-HALF_W, 0, z1],
      ],
      lerpColor(near, far, t),
    );
  }

  const W = 4;
  const L = PALETTE.line;
  // Perímetro.
  lineX(ctx, cam, NEAR_Z, -HALF_W, HALF_W, W, L);
  lineX(ctx, cam, FAR_Z, -HALF_W, HALF_W, W, L);
  lineZ(ctx, cam, -HALF_W, NEAR_Z, FAR_Z, W, L);
  lineZ(ctx, cam, HALF_W, NEAR_Z, FAR_Z, W, L);
  // Líneas de saque.
  lineX(ctx, cam, SERVICE_LINE_NEAR, -HALF_W, HALF_W, W * 0.8, L);
  lineX(ctx, cam, SERVICE_LINE_FAR, -HALF_W, HALF_W, W * 0.8, L);
  // Línea central de saque (solo entre líneas de saque).
  lineZ(ctx, cam, 0, SERVICE_LINE_NEAR, SERVICE_LINE_FAR, W * 0.8, PALETTE.lineSoft);
}

// ─── Cristales y vallas ─────────────────────────────────────────────────────────
// Panel de cristal con degradado de reflejo, marco y una franja de brillo alta.
function drawGlassPanel(ctx, cam, corners) {
  const s = corners.map((c) => p(cam, c[0], c[1], c[2]));
  if (s.some((q) => !q.visible)) return;
  ctx.beginPath();
  ctx.moveTo(s[0].sx, s[0].sy);
  for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].sx, s[i].sy);
  ctx.closePath();
  const grad = ctx.createLinearGradient(s[0].sx, s[0].sy, s[2].sx, s[2].sy);
  grad.addColorStop(0, PALETTE.glassHi);
  grad.addColorStop(0.18, PALETTE.glassA);
  grad.addColorStop(1, PALETTE.glassB);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = PALETTE.glassFrame;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Rejilla romboidal (dos familias de diagonales) entre dos postes, del cristal al
// tope de valla. `along` es "x" (pared de fondo) o "z" (laterales).
function drawFenceMesh(ctx, cam, along, fixed, a0, a1) {
  ctx.strokeStyle = PALETTE.fence;
  ctx.lineWidth = 0.8;
  const span = a1 - a0;
  const steps = Math.max(4, Math.round(Math.abs(span) / 46));
  const yLo = GLASS_HEIGHT;
  const yHi = FENCE_HEIGHT;
  const pt = (a, y) => (along === "x" ? [a, y, fixed] : [fixed, y, a]);
  // Diagonales ascendentes y descendentes formando rombos.
  for (let i = -steps; i <= steps; i++) {
    const off = (span / steps) * i;
    line3(ctx, cam, pt(clamp(a0 + off, Math.min(a0, a1), Math.max(a0, a1)), yLo), pt(clamp(a0 + off + (yHi - yLo), Math.min(a0, a1), Math.max(a0, a1)), yHi), PALETTE.fence, 0.7);
    line3(ctx, cam, pt(clamp(a1 - off, Math.min(a0, a1), Math.max(a0, a1)), yLo), pt(clamp(a1 - off - (yHi - yLo), Math.min(a0, a1), Math.max(a0, a1)), yHi), PALETTE.fence, 0.7);
  }
  // Rieles horizontal superior e inferior.
  line3(ctx, cam, pt(a0, yLo), pt(a1, yLo), PALETTE.fencePost, 1);
  line3(ctx, cam, pt(a0, yHi), pt(a1, yHi), PALETTE.fencePost, 1);
}

// Montantes verticales del marco de cristal.
function mullion(ctx, cam, x, z, hTop) {
  line3(ctx, cam, [x, 0, z], [x, hTop, z], PALETTE.glassPost, 2);
}

function drawEnclosure(ctx, cam) {
  // Fondo rival: cristal + rejilla + postes.
  drawGlassPanel(ctx, cam, [
    [-HALF_W, GLASS_HEIGHT, FAR_Z],
    [HALF_W, GLASS_HEIGHT, FAR_Z],
    [HALF_W, 0, FAR_Z],
    [-HALF_W, 0, FAR_Z],
  ]);
  drawFenceMesh(ctx, cam, "x", FAR_Z, -HALF_W, HALF_W);
  for (const mx of [-HALF_W, -HALF_W / 2, 0, HALF_W / 2, HALF_W]) mullion(ctx, cam, mx, FAR_Z, GLASS_HEIGHT);
  // Riel horizontal a media altura del cristal.
  line3(ctx, cam, [-HALF_W, GLASS_HEIGHT * 0.55, FAR_Z], [HALF_W, GLASS_HEIGHT * 0.55, FAR_Z], "rgba(180,210,225,0.28)", 1);

  // Laterales (fondo → red, como en pádel).
  for (const wx of [-HALF_W, HALF_W]) {
    drawGlassPanel(ctx, cam, [
      [wx, GLASS_HEIGHT, FAR_Z],
      [wx, GLASS_HEIGHT, NET_Z],
      [wx, 0, NET_Z],
      [wx, 0, FAR_Z],
    ]);
    drawFenceMesh(ctx, cam, "z", wx, FAR_Z, NET_Z);
    for (const mz of [FAR_Z, (FAR_Z + NET_Z) / 2, NET_Z]) mullion(ctx, cam, wx, mz, GLASS_HEIGHT);
  }
}

// Cristal cercano: solo insinuado con postes/riel para no tapar el juego.
function drawNearGlassHint(ctx, cam) {
  for (const wx of [-HALF_W, HALF_W]) {
    mullion(ctx, cam, wx, NEAR_Z, GLASS_HEIGHT * 0.92);
    drawFenceMesh(ctx, cam, "z", wx, NEAR_Z, NET_Z);
    for (const mz of [NEAR_Z, (NEAR_Z + NET_Z) / 2]) mullion(ctx, cam, wx, mz, GLASS_HEIGHT * 0.9);
    // Riel superior tenue del cristal cercano.
    line3(ctx, cam, [wx, GLASS_HEIGHT * 0.9, NEAR_Z], [wx, GLASS_HEIGHT * 0.9, NET_Z], "rgba(150,200,225,0.2)", 1.5);
  }
}

// ─── Red ─────────────────────────────────────────────────────────────────────
function drawNet(ctx, cam) {
  // Malla doble (dos tonos) para densidad visual.
  const cols = 30;
  for (let i = 0; i <= cols; i++) {
    const x = -HALF_W + (2 * HALF_W * i) / cols;
    line3(ctx, cam, [x, 0, NET_Z], [x, NET_HEIGHT, NET_Z], i % 2 ? PALETTE.netMesh : PALETTE.netMeshDark, 0.7);
  }
  const rows = 6;
  for (let i = 0; i <= rows; i++) {
    const y = (NET_HEIGHT * i) / rows;
    line3(ctx, cam, [-HALF_W, y, NET_Z], [HALF_W, y, NET_Z], PALETTE.netMesh, 0.7);
  }
  // Banda de tela inferior (más opaca cerca del suelo).
  quad(
    ctx,
    cam,
    [
      [-HALF_W, NET_HEIGHT * 0.3, NET_Z],
      [HALF_W, NET_HEIGHT * 0.3, NET_Z],
      [HALF_W, 0, NET_Z],
      [-HALF_W, 0, NET_Z],
    ],
    "rgba(210,224,238,0.12)",
  );
  // Cinta superior blanca (tira 3D con grosor).
  quad(
    ctx,
    cam,
    [
      [-HALF_W, NET_HEIGHT, NET_Z],
      [HALF_W, NET_HEIGHT, NET_Z],
      [HALF_W, NET_HEIGHT - 4, NET_Z],
      [-HALF_W, NET_HEIGHT - 4, NET_Z],
    ],
    PALETTE.netTape,
  );
  // Postes con grosor (cara + arista) y correa central.
  for (const px of [-HALF_W, HALF_W]) {
    quad(
      ctx,
      cam,
      [
        [px - 2, NET_POST_HEIGHT, NET_Z],
        [px + 2, NET_POST_HEIGHT, NET_Z],
        [px + 2, 0, NET_Z],
        [px - 2, 0, NET_Z],
      ],
      PALETTE.post,
      PALETTE.postDark,
      1,
    );
  }
  line3(ctx, cam, [0, NET_HEIGHT, NET_Z], [0, 0, NET_Z], PALETTE.netStrap, 2);
}

// ─── Monigote sin cara + pala perforada ─────────────────────────────────────────
function drawPlayer(ctx, cam, player, isActive, now) {
  const base = p(cam, player.x, 0, player.z);
  if (!base.visible) return;
  const s = base.scale;
  const teamCol = player.team === "home" ? PALETTE.home : PALETTE.away;
  const teamHi = player.team === "home" ? PALETTE.homeHi : PALETTE.awayHi;
  const teamDark = player.team === "home" ? PALETTE.homeDark : PALETTE.awayDark;
  const faceCol = player.team === "home" ? PALETTE.paddleFaceHome : PALETTE.paddleFaceAway;

  // Estima el movimiento reciente para animar la carrera (guarda estado en la
  // propia figura, suavizado). El swing prima sobre la zancada.
  const px = player._px ?? player.x;
  const pz = player._pz ?? player.z;
  const spd = Math.hypot(player.x - px, player.z - pz);
  player._moveAmp = (player._moveAmp ?? 0) * 0.82 + Math.min(1, spd * 0.9) * 0.18;
  player._px = player.x;
  player._pz = player.z;
  const phase = now / 150 + player.id * 1.7;
  const stride = Math.sin(phase) * player._moveAmp;
  const bob = Math.abs(Math.cos(phase)) * player._moveAmp * 6 * s;

  const bodyH = 82 * s;
  const bx = base.sx;
  const byFeet = base.sy - bob;
  const w = 22 * s;

  // Sombra blanda.
  const shGrad = ctx.createRadialGradient(bx, base.sy, 1, bx, base.sy, w * 1.4);
  shGrad.addColorStop(0, "rgba(4,12,9,0.4)");
  shGrad.addColorStop(1, "rgba(4,12,9,0)");
  ctx.fillStyle = shGrad;
  ctx.beginPath();
  ctx.ellipse(bx, base.sy, w * 1.4, w * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  if (isActive) {
    ctx.strokeStyle = "rgba(255,238,140,0.95)";
    ctx.lineWidth = Math.max(1.6, 2.6 * s);
    ctx.beginPath();
    ctx.ellipse(bx, base.sy, w * 1.5, w * 0.62, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,238,140,0.3)";
    ctx.lineWidth = Math.max(3, 6 * s);
    ctx.stroke();
  }

  const hipY = byFeet - bodyH * 0.46;
  const shoulderY = byFeet - bodyH * 0.8;
  const neckY = byFeet - bodyH * 0.86;
  const headR = Math.max(3.4, 8 * s);
  const headY = neckY - headR * 0.9;
  const legW = Math.max(2.4, 6 * s);

  ctx.lineCap = "round";

  // Piernas con zancada (una adelanta, otra atrasa).
  ctx.strokeStyle = PALETTE.shorts;
  ctx.lineWidth = legW;
  ctx.beginPath();
  ctx.moveTo(bx - w * 0.16, hipY);
  ctx.lineTo(bx - w * 0.3 + stride * w * 0.5, byFeet);
  ctx.moveTo(bx + w * 0.16, hipY);
  ctx.lineTo(bx + w * 0.3 - stride * w * 0.5, byFeet);
  ctx.stroke();

  // Short (banda de cadera).
  ctx.fillStyle = PALETTE.shorts;
  ctx.beginPath();
  roundRectPath(ctx, bx - w * 0.42, hipY - legW * 0.4, w * 0.84, bodyH * 0.16, 3 * s);
  ctx.fill();

  // Torso con degradado (camiseta del equipo).
  const tg = ctx.createLinearGradient(bx - w * 0.5, shoulderY, bx + w * 0.5, hipY);
  tg.addColorStop(0, teamHi);
  tg.addColorStop(0.5, teamCol);
  tg.addColorStop(1, teamDark);
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(bx - w * 0.46, hipY);
  ctx.lineTo(bx + w * 0.46, hipY);
  ctx.lineTo(bx + w * 0.4, shoulderY);
  ctx.quadraticCurveTo(bx, shoulderY - bodyH * 0.03, bx - w * 0.4, shoulderY);
  ctx.closePath();
  ctx.fill();

  // Cuello + cabeza lisa sin cara, con pelo (casquete) y sin rasgos.
  ctx.strokeStyle = PALETTE.skinDark;
  ctx.lineWidth = Math.max(2, 4.5 * s);
  ctx.beginPath();
  ctx.moveTo(bx, shoulderY);
  ctx.lineTo(bx, neckY);
  ctx.stroke();

  const hg = ctx.createRadialGradient(bx - headR * 0.3, headY - headR * 0.3, headR * 0.2, bx, headY, headR);
  hg.addColorStop(0, PALETTE.skin);
  hg.addColorStop(1, PALETTE.skinDark);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(bx, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  // Pelo: casquete superior.
  ctx.fillStyle = PALETTE.hair;
  ctx.beginPath();
  ctx.arc(bx, headY, headR, Math.PI * 1.08, Math.PI * 1.92, false);
  ctx.arc(bx, headY - headR * 0.15, headR * 0.98, Math.PI * 1.92, Math.PI * 1.08, true);
  ctx.closePath();
  ctx.fill();

  // Brazo + pala perforada. El tipo de golpe cambia la pose: el remate va por
  // encima de la cabeza y el revés cruza el brazo al lado contrario.
  const swingP = player.swing > 0 ? clamp(player.swing / 260, 0, 1) : 0;
  const dominant = player.team === "home" ? 1 : -1;
  const armSide = player.backhand ? -dominant : dominant;
  const kind = player.swingKind ?? "drive";
  let handX;
  let handY;
  if (kind === "smash" || kind === "vibora") {
    handX = bx + armSide * w * 0.22;
    handY = headY - bodyH * 0.16 - swingP * bodyH * 0.12; // por encima de la cabeza
  } else {
    const armReach = w * (0.72 + swingP * 0.95);
    handX = bx + armSide * armReach;
    const lift = kind === "lob" ? 0.04 : kind === "dejada" ? 0.02 : kind === "volea" ? 0.12 : 0.2;
    handY = shoulderY + bodyH * 0.05 - swingP * bodyH * lift;
  }
  // Brazo libre (opuesto), leve balanceo.
  ctx.strokeStyle = PALETTE.skin;
  ctx.lineWidth = Math.max(2, 4 * s);
  ctx.beginPath();
  ctx.moveTo(bx - armSide * w * 0.36, shoulderY + bodyH * 0.05);
  ctx.lineTo(bx - armSide * (w * 0.5 + stride * w * 0.4), shoulderY + bodyH * 0.22);
  ctx.stroke();
  // Brazo de la pala.
  ctx.beginPath();
  ctx.moveTo(bx + armSide * w * 0.38, shoulderY + bodyH * 0.04);
  ctx.lineTo(handX, handY);
  ctx.stroke();

  drawPaddle(ctx, handX, handY, armSide, swingP, s, faceCol);
}

// Pala: paleta sólida perforada, sin cuerdas, con cara bicolor, agujeros y grip.
function drawPaddle(ctx, handX, handY, side, swingP, s, faceCol) {
  const padR = Math.max(4.5, 10 * s);
  ctx.save();
  ctx.translate(handX + side * padR * 0.35, handY - padR * 0.7);
  ctx.rotate(side * (-0.6 + swingP * 1.1));

  // Cara con degradado.
  const fg = ctx.createLinearGradient(-padR, -padR, padR, padR);
  fg.addColorStop(0, faceCol);
  fg.addColorStop(1, PALETTE.paddle);
  ctx.fillStyle = fg;
  ctx.strokeStyle = PALETTE.paddle;
  ctx.lineWidth = Math.max(1, 1.8 * s);
  ctx.beginPath();
  ctx.ellipse(0, 0, padR * 0.82, padR, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Brillo.
  ctx.fillStyle = PALETTE.paddleHi;
  ctx.beginPath();
  ctx.ellipse(-padR * 0.28, -padR * 0.34, padR * 0.34, padR * 0.44, 0, 0, Math.PI * 2);
  ctx.fill();

  // Agujeros (patrón hexagonal aproximado).
  ctx.fillStyle = "rgba(16,20,28,0.72)";
  const rr = Math.max(0.5, padR * 0.1);
  for (let row = -2; row <= 2; row++) {
    const cols = row % 2 === 0 ? 2 : 1;
    for (let c = -cols; c <= cols; c++) {
      const hx = c * padR * 0.34 + (row % 2 ? padR * 0.17 : 0);
      const hy = row * padR * 0.3;
      if (hx * hx / (padR * 0.62 * padR * 0.62) + hy * hy / (padR * 0.8 * padR * 0.8) > 1) continue;
      ctx.beginPath();
      ctx.arc(hx, hy, rr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Puente y mango con grip.
  ctx.strokeStyle = PALETTE.paddle;
  ctx.lineWidth = Math.max(1.6, 2.6 * s);
  ctx.beginPath();
  ctx.moveTo(0, padR);
  ctx.lineTo(0, padR * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(200,200,210,0.5)";
  ctx.lineWidth = Math.max(0.5, 0.9 * s);
  for (let i = 0; i < 3; i++) {
    const gy = padR * (1.35 + i * 0.2);
    ctx.beginPath();
    ctx.moveTo(-padR * 0.14, gy);
    ctx.lineTo(padR * 0.14, gy + padR * 0.12);
    ctx.stroke();
  }
  ctx.restore();
}

// ─── Pelota ──────────────────────────────────────────────────────────────────
function drawBall(ctx, cam, ball) {
  if (!ball) return;
  const shadow = p(cam, ball.x, 0.5, ball.z);
  if (shadow.visible) {
    const heightFade = clamp(1 - ball.y / 220, 0.22, 1);
    const sr = 6.5 * shadow.scale * heightFade;
    const sg = ctx.createRadialGradient(shadow.sx, shadow.sy, 0.5, shadow.sx, shadow.sy, Math.max(1, sr));
    sg.addColorStop(0, "rgba(4,12,9,0.42)");
    sg.addColorStop(1, "rgba(4,12,9,0)");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.ellipse(shadow.sx, shadow.sy, Math.max(1, sr), Math.max(0.5, sr * 0.42), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const pos = p(cam, ball.x, ball.y, ball.z);
  if (!pos.visible) return;
  const r = Math.max(2.6, BALL_R * pos.scale * 1.15);
  const g = ctx.createRadialGradient(pos.sx - r * 0.35, pos.sy - r * 0.35, r * 0.15, pos.sx, pos.sy, r);
  g.addColorStop(0, PALETTE.ballHi);
  g.addColorStop(0.6, PALETTE.ball);
  g.addColorStop(1, PALETTE.ballEdge);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(pos.sx, pos.sy, r, 0, Math.PI * 2);
  ctx.fill();
  // Costura curva.
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = Math.max(0.5, r * 0.12);
  ctx.beginPath();
  ctx.arc(pos.sx, pos.sy, r * 0.7, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
}

// ─── Marcador y overlays ────────────────────────────────────────────────────────
function drawScoreboard(ctx, vW, match, copy) {
  const labels = pointLabels(match);
  const boxW = Math.min(408, vW - 14);
  const x = (vW - boxW) / 2;
  const y = 8;
  const h = 46;
  const pad = 13;

  // Panel.
  const bg = ctx.createLinearGradient(x, y, x, y + h);
  bg.addColorStop(0, "rgba(10,22,17,0.92)");
  bg.addColorStop(1, "rgba(6,14,11,0.85)");
  ctx.fillStyle = bg;
  roundRectPath(ctx, x, y, boxW, h, 11);
  ctx.fill();
  ctx.strokeStyle = "rgba(120,190,150,0.24)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textBaseline = "middle";
  const midY = y + h / 2;

  // Equipo local (izquierda) con punto de saque.
  const homeServes = match.server === "home";
  ctx.textAlign = "left";
  let lx = x + pad;
  if (homeServes) {
    serveDot(ctx, lx + 4, midY);
    lx += 15;
  }
  ctx.font = "800 14px system-ui, sans-serif";
  ctx.fillStyle = PALETTE.home;
  ctx.fillText(copy.you, lx, midY);

  // Equipo rival (derecha) con punto de saque.
  const awayServes = match.server === "away";
  ctx.textAlign = "right";
  let rx = x + boxW - pad;
  if (awayServes) {
    serveDot(ctx, rx - 4, midY);
    rx -= 15;
  }
  ctx.fillStyle = PALETTE.away;
  ctx.fillText(copy.cpu, rx, midY);

  // Columnas centrales de marcador con etiqueta.
  const cols = match.tieBreak
    ? [
        [copy.hudSet, `${match.homeSets}-${match.awaySets}`],
        [copy.hudTie, `${match.homeGames}-${match.awayGames}`],
      ]
    : [
        [copy.hudSet, `${match.homeSets}-${match.awaySets}`],
        [copy.hudGame, `${match.homeGames}-${match.awayGames}`],
        [copy.hudPoint, `${labels.home}-${labels.away}`],
      ];
  const cW = 62;
  const totalW = cols.length * cW;
  let cx = vW / 2 - totalW / 2 + cW / 2;
  for (const [label, value] of cols) {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(159,199,179,0.85)";
    ctx.font = "700 8.5px system-ui, sans-serif";
    ctx.fillText(label, cx, y + 14);
    ctx.fillStyle = PALETTE.text;
    ctx.font = "800 16px system-ui, sans-serif";
    ctx.fillText(value, cx, y + 31);
    cx += cW;
  }
}

// Pequeña pelota amarilla como indicador de saque.
function serveDot(ctx, x, y) {
  ctx.fillStyle = PALETTE.ball;
  ctx.beginPath();
  ctx.arc(x, y, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.ballEdge;
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBanner(ctx, vW, vH, text, team) {
  if (!text) return;
  ctx.font = "800 26px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const w = ctx.measureText(text).width + 62;
  const x = (vW - w) / 2;
  const y = vH * 0.38;
  const h = 52;
  const bg = ctx.createLinearGradient(x, y, x, y + h);
  bg.addColorStop(0, "rgba(9,20,16,0.94)");
  bg.addColorStop(1, "rgba(6,14,11,0.88)");
  ctx.fillStyle = bg;
  roundRectPath(ctx, x, y, w, h, 13);
  ctx.fill();
  // Acento e indicador de equipo: verde tú, azul rival.
  const accent = team === "home" ? PALETTE.home : team === "away" ? PALETTE.away : "rgba(255,138,61,0.4)";
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.stroke();
  if (team) {
    // Barra de color a la izquierda del banner.
    ctx.fillStyle = accent;
    roundRectPath(ctx, x, y, 7, h, 3);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 24, y + h / 2, 6, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(text, vW / 2 + (team ? 12 : 0), y + h / 2);
}

// Mezcla lineal de dos colores hex.
function lerpColor(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `rgb(${r},${g},${bl})`;
}
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// ─── Composición ────────────────────────────────────────────────────────────────
// Barra de carga sobre el jugador activo. Va aquí y no en el DOM porque el
// snapshot solo se emite en eventos: en el canvas se repinta a 60 fps, y además
// la referencia queda junto a la figura, que es donde está mirando el jugador
// durante un peloteo. Solo aparece mientras se mantiene pulsado.
function drawChargeGauge(ctx, cam, player, charge = 0, charging = false) {
  if (!charging || !player || charge <= 0.001) return;
  const base = p(cam, player.x, 0, player.z);
  if (!base.visible) return;
  const s = base.scale;
  const w = Math.max(34, 66 * s);
  const h = Math.max(5, 9 * s);
  const x = base.sx - w / 2;
  const y = base.sy - Math.max(72, 132 * s);
  const r = h / 2;

  const pill = (px, py, pw, ph, pr) => {
    ctx.beginPath();
    ctx.moveTo(px + pr, py);
    ctx.arcTo(px + pw, py, px + pw, py + ph, pr);
    ctx.arcTo(px + pw, py + ph, px, py + ph, pr);
    ctx.arcTo(px, py + ph, px, py, pr);
    ctx.arcTo(px, py, px + pw, py, pr);
    ctx.closePath();
  };

  ctx.fillStyle = "rgba(4,12,18,0.72)";
  pill(x - 1.5, y - 1.5, w + 3, h + 3, r + 1.5);
  ctx.fill();

  // Blanco → ámbar → rojo: el color dice cuánto llevas sin tener que medir.
  const fill = charge > 0.86 ? "#ff6b4a" : charge > 0.55 ? "#ffc247" : "#eaf6ff";
  ctx.fillStyle = fill;
  pill(x, y, Math.max(h, w * charge), h, r);
  ctx.fill();

  // A tope, un borde que lo remata: ya no gana más por seguir aguantando.
  if (charge >= 0.999) {
    ctx.strokeStyle = "rgba(255,107,74,0.9)";
    ctx.lineWidth = Math.max(1, 1.6 * s);
    pill(x - 2.5, y - 2.5, w + 5, h + 5, r + 2.5);
    ctx.stroke();
  }
}

export function drawWorld(ctx, cam, state) {
  const { dpr, vW, vH, players, activeIndex, ball, match, banner, bannerTeam, copy, paused, screen } = state;
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, vW, vH);

  drawArena(ctx, cam, vW, vH);
  drawCourt(ctx, cam);
  drawEnclosure(ctx, cam);

  // Entidades (figuras + pelota) ordenadas de lejos a cerca, partidas por la red:
  // las del fondo rival se pintan antes de la red y las cercanas después, para que
  // la red quede correctamente entre ambos campos en la vista broadcast.
  const showBall = ball?.live || screen === "serve";
  const entities = players.map((pl, i) => ({ kind: "player", z: pl.z, pl, i }));
  entities.push({ kind: "ball", z: ball?.z ?? 0 });
  entities.sort((a, b) => b.z - a.z);

  const drawEntity = (e) => {
    if (e.kind === "player") drawPlayer(ctx, cam, e.pl, e.i === activeIndex && e.pl.team === "home", now);
    else if (showBall) drawBall(ctx, cam, ball);
  };

  for (const e of entities) if (e.z >= NET_Z) drawEntity(e);
  drawNet(ctx, cam);
  for (const e of entities) if (e.z < NET_Z) drawEntity(e);

  drawNearGlassHint(ctx, cam);
  drawChargeGauge(ctx, cam, players[activeIndex], state.charge, state.charging);
  drawScoreboard(ctx, vW, match, copy);
  drawBanner(ctx, vW, vH, banner, bannerTeam);
  if (paused) drawBanner(ctx, vW, vH, copy.paused);
}
