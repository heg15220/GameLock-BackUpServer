// Topos a Mazazos — render pseudo-3D sobre Canvas 2D. Vista 3/4 elevada de una
// arena de jardín, pintada de atrás hacia delante (painter's algorithm) con una
// proyección pinhole propia. Dibuja cielo y suelo segado, seto y valla, agujeros
// con collar de tierra, topos (marrón/dorado/bomba) que asoman recortados por el
// borde del agujero, mascotas sin cara con mazo, barriles y el HUD.

import {
  ARENA_HALF_X,
  ARENA_NEAR_Z,
  ARENA_FAR_Z,
  POP_HEIGHT,
  clamp,
  makeRng,
} from "./moles.js";

export const PALETTE = {
  skyTop: "#9fdcff",
  skyBottom: "#e9f8ef",
  sun: "rgba(255,246,214,0.85)",
  cloud: "rgba(255,255,255,0.72)",
  standDark: "#cfe8d6",
  hedge: "#4f9b5c",
  hedgeDark: "#2f6b46",
  hedgeLight: "#6bb877",
  fence: "#f4faf6",
  fencePost: "#dfeee4",
  fenceShade: "#c4dccd",
  tileA: "#6fd0a6",
  tileB: "#4fb187",
  tileLine: "rgba(255,255,255,0.14)",
  grassBlade: "rgba(28,92,66,0.35)",
  mound: "#8a6236",
  moundDark: "#5d3f20",
  holeRim: "#3a2617",
  holeInner: "#2e1d10",
  holeDeep: "#160d06",
  holeDirt: "#6a4a2f",
  dust: "rgba(160,126,84,0.55)",
  brown: "#8a5a34",
  brownDark: "#4a2d16",
  brownLight: "#a97645",
  brownSnout: "#d3aa7c",
  earInner: "#c98a86",
  gold: "#ffd75e",
  goldDark: "#c98908",
  goldLight: "#fff0b8",
  bomb: "#4a5058",
  bombDark: "#15181d",
  fuse: "#b98a4a",
  spark: "#ffd85a",
  barrel: "#3f8fe0",
  barrelDark: "#1d4d8c",
  barrelLight: "#7cbcf5",
  barrelBand: "#cfe3ff",
  mallet: "#8a5a2c",
  malletDark: "#5e3a17",
  malletHead: "#d94f37",
  malletHeadDark: "#8f2f1f",
  malletBand: "#f7d9a0",
  skin: "#e2c7a4",
  skinDark: "#b2926e",
  hair: "#3f2d1e",
  shadow: "rgba(20,40,28,0.26)",
  text: "#123024",
  textLight: "#f4faf6",
};

// ─── Cámara / proyección ─────────────────────────────────────────────────────
const CAM_X = 0;
const CAM_Y = 300;
const CAM_Z = -300;
const FOCAL_PER_WIDTH = 0.86;
const NEAR_ANCHOR = 0.9; // ancla el fondo cercano al 90% de la altura

function makeCamera(vW, vH) {
  const zoom = clamp(1 + (760 - vW) / 1100, 1, 1.28); // más zoom en móvil
  const focal = FOCAL_PER_WIDTH * vW * zoom;
  const cy = NEAR_ANCHOR * vH - CAM_Y * (focal / (ARENA_NEAR_Z - CAM_Z));
  return { focal, cx: vW * 0.5, cy, vW, vH };
}

function project(cam, x, y, z) {
  const dz = z - CAM_Z;
  if (dz <= 1) return { sx: 0, sy: 0, scale: 0, visible: false };
  const scale = cam.focal / dz;
  return { sx: cam.cx + (x - CAM_X) * scale, sy: cam.cy + (CAM_Y - y) * scale, scale, visible: true };
}

// El suelo se ve en escorzo: un círculo del mundo se proyecta como esta elipse.
const GROUND_SQUASH = 0.46;

function quad(ctx, cam, corners, fill, stroke, lw = 1) {
  const s = corners.map((c) => project(cam, c[0], c[1], c[2]));
  if (s.some((q) => !q.visible)) return;
  ctx.beginPath();
  ctx.moveTo(s[0].sx, s[0].sy);
  for (let i = 1; i < s.length; i += 1) ctx.lineTo(s[i].sx, s[i].sy);
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

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fillEllipse(ctx, x, y, rx, ry, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  ctx.fill();
}

// Sombra de contacto: se difumina y se aclara cuanto más alto está el objeto.
function contactShadow(ctx, x, y, rx, lift = 0) {
  const fade = clamp(1 - lift * 0.5, 0.35, 1);
  fillEllipse(ctx, x, y, rx * (1 + lift * 0.18), rx * GROUND_SQUASH * 0.62, `rgba(20,40,28,${0.3 * fade})`);
  fillEllipse(ctx, x, y, rx * 0.62, rx * GROUND_SQUASH * 0.4, `rgba(16,34,24,${0.24 * fade})`);
}

// ─── Cielo, suelo y vallado ───────────────────────────────────────────────────
function drawBackground(ctx, cam, vW, vH) {
  const g = ctx.createLinearGradient(0, 0, 0, vH);
  g.addColorStop(0, PALETTE.skyTop);
  g.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vW, vH);

  const horizon = project(cam, 0, 120, ARENA_FAR_Z + 60);
  const hy = horizon.visible ? Math.max(0, horizon.sy) : vH * 0.22;

  // Sol bajo a la derecha, con halo suave.
  const sunX = vW * 0.78;
  const sunY = hy * 0.42;
  const halo = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, Math.max(30, hy * 1.5));
  halo.addColorStop(0, "rgba(255,247,214,0.9)");
  halo.addColorStop(1, "rgba(255,247,214,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, vW, hy + 20);
  fillEllipse(ctx, sunX, sunY, Math.max(8, hy * 0.18), Math.max(8, hy * 0.18), PALETTE.sun);

  // Nubes: tres racimos de círculos, colocados en fracciones del ancho.
  ctx.fillStyle = PALETTE.cloud;
  for (const [fx, fy, fs] of [[0.16, 0.3, 1], [0.42, 0.18, 0.7], [0.62, 0.44, 0.85]]) {
    const cxp = vW * fx;
    const cyp = hy * fy + 6;
    const rr = Math.max(7, hy * 0.16 * fs);
    ctx.beginPath();
    ctx.ellipse(cxp, cyp, rr * 1.7, rr * 0.72, 0, 0, Math.PI * 2);
    ctx.ellipse(cxp - rr * 0.8, cyp + rr * 0.16, rr * 0.78, rr * 0.6, 0, 0, Math.PI * 2);
    ctx.ellipse(cxp + rr * 0.7, cyp + rr * 0.1, rr * 0.9, rr * 0.66, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Franja de arbolado/gradas tras el fondo lejano.
  ctx.fillStyle = PALETTE.standDark;
  ctx.fillRect(0, hy, vW, Math.max(0, vH - hy));
}

// Matas de hierba deterministas: se calculan una vez y se reutilizan cada frame.
let grassCache = null;
function getGrass() {
  if (grassCache) return grassCache;
  const rng = makeRng(0x70705);
  const tufts = [];
  for (let i = 0; i < 54; i += 1) {
    tufts.push({
      x: (rng() * 2 - 1) * (ARENA_HALF_X - 14),
      z: ARENA_NEAR_Z + rng() * (ARENA_FAR_Z - ARENA_NEAR_Z),
      w: 0.7 + rng() * 0.6,
    });
  }
  grassCache = tufts;
  return tufts;
}

function drawFloor(ctx, cam) {
  const cols = 8;
  const rows = 8;
  const x0 = -ARENA_HALF_X;
  const x1 = ARENA_HALF_X;
  const z0 = ARENA_NEAR_Z;
  const z1 = ARENA_FAR_Z;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const xa = x0 + ((x1 - x0) * c) / cols;
      const xb = x0 + ((x1 - x0) * (c + 1)) / cols;
      const za = z0 + ((z1 - z0) * r) / rows;
      const zb = z0 + ((z1 - z0) * (r + 1)) / rows;
      const fill = (r + c) % 2 === 0 ? PALETTE.tileA : PALETTE.tileB;
      quad(ctx, cam, [[xa, 0, za], [xb, 0, za], [xb, 0, zb], [xa, 0, zb]], fill);
    }
  }

  // Matas de hierba: dos briznas por mata, en V, con el tamaño en perspectiva.
  ctx.strokeStyle = PALETTE.grassBlade;
  ctx.lineCap = "round";
  for (const t of getGrass()) {
    const p = project(cam, t.x, 0, t.z);
    if (!p.visible) continue;
    const h = 9 * p.scale * t.w;
    if (h < 0.8) continue;
    ctx.lineWidth = Math.max(0.6, 1.4 * p.scale);
    ctx.beginPath();
    ctx.moveTo(p.sx, p.sy);
    ctx.lineTo(p.sx - h * 0.5, p.sy - h);
    ctx.moveTo(p.sx, p.sy);
    ctx.lineTo(p.sx + h * 0.45, p.sy - h * 0.85);
    ctx.stroke();
  }
}

// Seto perimetral con valla blanca delante y topiarios en las esquinas.
function drawFence(ctx, cam) {
  const h = 46;
  const x0 = -ARENA_HALF_X;
  const x1 = ARENA_HALF_X;
  const z0 = ARENA_NEAR_Z;
  const z1 = ARENA_FAR_Z;

  const panels = [
    { pts: [[x0, 0, z1], [x1, 0, z1], [x1, h, z1], [x0, h, z1]], light: true }, // fondo
    { pts: [[x0, 0, z0], [x0, 0, z1], [x0, h, z1], [x0, h, z0]], light: false }, // izq
    { pts: [[x1, 0, z0], [x1, 0, z1], [x1, h, z1], [x1, h, z0]], light: false }, // der
  ];
  for (const p of panels) {
    quad(ctx, cam, p.pts, p.light ? PALETTE.hedge : PALETTE.hedgeDark, PALETTE.hedgeDark, 1.5);
  }
  // Remate iluminado en la coronación del seto del fondo.
  quad(
    ctx,
    cam,
    [[x0, h - 7, z1], [x1, h - 7, z1], [x1, h, z1], [x0, h, z1]],
    PALETTE.hedgeLight,
  );

  // Valla de listones delante del seto del fondo: postes + dos travesaños.
  const railTop = 26;
  const railLow = 13;
  for (const y of [railTop, railLow]) {
    quad(
      ctx,
      cam,
      [[x0, y, z1 - 6], [x1, y, z1 - 6], [x1, y - 3, z1 - 6], [x0, y - 3, z1 - 6]],
      PALETTE.fence,
    );
  }
  for (let i = 0; i <= 10; i += 1) {
    const px = x0 + ((x1 - x0) * i) / 10;
    quad(
      ctx,
      cam,
      [[px - 4, 0, z1 - 6], [px + 4, 0, z1 - 6], [px + 4, 34, z1 - 6], [px - 4, 34, z1 - 6]],
      i % 2 === 0 ? PALETTE.fence : PALETTE.fencePost,
      PALETTE.fenceShade,
      0.8,
    );
  }

  // Topiarios en las 4 esquinas, con maceta y luz superior.
  for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
    const base = project(cam, cx, 0, cz);
    const topP = project(cam, cx, 70, cz);
    if (!base.visible || !topP.visible) continue;
    const rr = Math.max(6, 26 * base.scale);
    contactShadow(ctx, base.sx, base.sy, rr * 0.9);
    ctx.fillStyle = PALETTE.moundDark;
    roundRectPath(ctx, base.sx - rr * 0.55, base.sy - rr * 0.7, rr * 1.1, rr * 0.8, rr * 0.2);
    ctx.fill();
    const g = ctx.createRadialGradient(
      topP.sx - rr * 0.35,
      topP.sy + rr * 0.15,
      rr * 0.2,
      topP.sx,
      topP.sy + rr * 0.5,
      rr,
    );
    g.addColorStop(0, PALETTE.hedgeLight);
    g.addColorStop(1, PALETTE.hedgeDark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(topP.sx, topP.sy + rr * 0.5, rr, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Agujero, topo, barril, mascota ───────────────────────────────────────────
// Geometría compartida entre agujero y topo, para que el recorte case exacto.
function holeGeom(p) {
  const rx = 27 * p.scale;
  return { rx, ry: rx * GROUND_SQUASH };
}

function drawHole(ctx, cam, hole) {
  const p = project(cam, hole.x, 0, hole.z);
  if (!p.visible) return;
  const { rx, ry } = holeGeom(p);

  // Collar de tierra alrededor: dos elipses, la de abajo más oscura.
  fillEllipse(ctx, p.sx, p.sy + ry * 0.3, rx * 1.34, ry * 1.36, PALETTE.moundDark);
  fillEllipse(ctx, p.sx, p.sy + ry * 0.12, rx * 1.3, ry * 1.3, PALETTE.mound);
  fillEllipse(ctx, p.sx, p.sy + ry * 0.02, rx * 1.16, ry * 1.14, PALETTE.holeDirt);

  // Pozo: gradiente vertical para que se lea hondo, no como una pegatina.
  const g = ctx.createLinearGradient(p.sx, p.sy - ry, p.sx, p.sy + ry);
  g.addColorStop(0, PALETTE.holeDeep);
  g.addColorStop(0.65, PALETTE.holeInner);
  g.addColorStop(1, PALETTE.holeRim);
  fillEllipse(ctx, p.sx, p.sy, rx, ry, g);

  // Sombra interior en el borde trasero.
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = Math.max(1, 3 * p.scale);
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy, rx * 0.94, ry * 0.94, 0, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  // Luz rasante en el borde delantero.
  ctx.strokeStyle = "rgba(255,236,200,0.35)";
  ctx.lineWidth = Math.max(0.8, 1.8 * p.scale);
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy, rx * 1.02, ry * 1.02, 0, Math.PI * 0.12, Math.PI * 0.88);
  ctx.stroke();
}

// Cuerpo del topo (marrón/dorado): pera con luz de borde, orejas, morro y bigotes.
function drawMoleBody(ctx, cx, cy, r, squash, type) {
  const body = type === "gold" ? PALETTE.gold : PALETTE.brown;
  const bodyDark = type === "gold" ? PALETTE.goldDark : PALETTE.brownDark;
  const bodyLight = type === "gold" ? PALETTE.goldLight : PALETTE.brownLight;
  const rw = r * 0.92 * (2 - squash);
  const rh = r * 1.06 * squash;

  // Orejas detrás del cuerpo, con interior rosado.
  for (const sx of [-1, 1]) {
    fillEllipse(ctx, cx + sx * rw * 0.66, cy - rh * 0.62, r * 0.3, r * 0.3, bodyDark);
    fillEllipse(ctx, cx + sx * rw * 0.66, cy - rh * 0.6, r * 0.17, r * 0.17, PALETTE.earInner);
  }

  const g = ctx.createRadialGradient(cx - rw * 0.35, cy - rh * 0.45, r * 0.15, cx, cy, r * 1.25);
  g.addColorStop(0, bodyLight);
  g.addColorStop(0.55, body);
  g.addColorStop(1, bodyDark);
  fillEllipse(ctx, cx, cy, rw, rh, g);

  // Luz de borde superior izquierda: separa al topo del fondo del agujero.
  ctx.strokeStyle = type === "gold" ? "rgba(255,255,255,0.6)" : "rgba(255,222,180,0.4)";
  ctx.lineWidth = Math.max(0.8, r * 0.1);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rw * 0.96, rh * 0.96, 0, Math.PI * 1.1, Math.PI * 1.85);
  ctx.stroke();

  // Barriga y morro claros (sin ojos: la familia de monigotes es sin cara).
  fillEllipse(ctx, cx, cy + rh * 0.44, rw * 0.6, rh * 0.4, `rgba(255,236,206,0.35)`);
  fillEllipse(ctx, cx, cy + rh * 0.26, rw * 0.52, rh * 0.36, PALETTE.brownSnout);
  fillEllipse(ctx, cx, cy + rh * 0.12, r * 0.16, r * 0.13, bodyDark);

  // Bigotes.
  ctx.strokeStyle = "rgba(60,40,24,0.5)";
  ctx.lineWidth = Math.max(0.6, r * 0.055);
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * r * 0.16, cy + rh * 0.2);
    ctx.lineTo(cx + sx * r * 0.72, cy + rh * 0.06);
    ctx.moveTo(cx + sx * r * 0.16, cy + rh * 0.26);
    ctx.lineTo(cx + sx * r * 0.7, cy + rh * 0.3);
    ctx.stroke();
  }

  if (type === "gold") {
    fillEllipse(ctx, cx - rw * 0.34, cy - rh * 0.42, r * 0.2, r * 0.28, "rgba(255,255,255,0.65)");
  }
}

function drawBombBody(ctx, cx, cy, r, now) {
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.12, cx, cy, r * 1.1);
  g.addColorStop(0, "#6c737d");
  g.addColorStop(0.55, PALETTE.bomb);
  g.addColorStop(1, PALETTE.bombDark);
  fillEllipse(ctx, cx, cy, r, r, g);
  // Especular metálico + banda ecuatorial.
  fillEllipse(ctx, cx - r * 0.36, cy - r * 0.42, r * 0.2, r * 0.13, "rgba(255,255,255,0.7)");
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = Math.max(0.8, r * 0.12);
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.1, r * 0.92, r * 0.3, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Casquillo + mecha con chispa parpadeante.
  ctx.fillStyle = "#8a6338";
  roundRectPath(ctx, cx - r * 0.2, cy - r * 1.2, r * 0.4, r * 0.32, r * 0.1);
  ctx.fill();
  ctx.strokeStyle = PALETTE.fuse;
  ctx.lineWidth = Math.max(1, r * 0.13);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 1.15);
  ctx.quadraticCurveTo(cx + r * 0.85, cy - r * 1.45, cx + r * 0.55, cy - r * 1.85);
  ctx.stroke();
  const flick = 0.75 + Math.sin(now / 60) * 0.25;
  const sparkR = Math.max(1.2, r * 0.24 * flick);
  const halo = ctx.createRadialGradient(cx + r * 0.55, cy - r * 1.85, 0, cx + r * 0.55, cy - r * 1.85, sparkR * 3);
  halo.addColorStop(0, "rgba(255,216,90,0.9)");
  halo.addColorStop(1, "rgba(255,216,90,0)");
  fillEllipse(ctx, cx + r * 0.55, cy - r * 1.85, sparkR * 3, sparkR * 3, halo);
  fillEllipse(ctx, cx + r * 0.55, cy - r * 1.85, sparkR, sparkR, "#fff6d0");
}

function drawMole(ctx, cam, hole, now) {
  const m = hole.mole;
  if (!m) return;
  const base = project(cam, hole.x, 0, hole.z);
  if (!base.visible) return;
  const s = base.scale;
  const { rx, ry } = holeGeom(base);
  const r = 20 * s;
  const t = clamp(m.y / POP_HEIGHT, 0, 1); // 0 escondido → 1 asomado del todo

  // El centro viaja desde bajo el borde hasta medio cuerpo fuera.
  const hiddenY = base.sy + r * 1.35;
  const outY = base.sy - r * 0.55;
  const cy = hiddenY + (outY - hiddenY) * t;
  // Squash-stretch: se estira al subir y se asienta al llegar.
  const squash = 1 + 0.18 * Math.sin(t * Math.PI);

  // Recorte = todo lo que hay por encima del agujero + el propio pozo. Así el
  // topo emerge del agujero en lugar de cortarse por la mitad en el aire.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, cam.vW, base.sy);
  ctx.ellipse(base.sx, base.sy, rx * 0.96, ry * 0.96, 0, 0, Math.PI * 2);
  ctx.clip();

  // Sombra propia dentro del agujero, bajo el topo.
  fillEllipse(ctx, base.sx, base.sy + ry * 0.1, rx * 0.8, ry * 0.7, "rgba(0,0,0,0.45)");

  if (m.type === "bomb") drawBombBody(ctx, base.sx, cy, r, now);
  else drawMoleBody(ctx, base.sx, cy, r, squash, m.type);
  ctx.restore();

  // Patas agarradas al borde una vez asomado: ancla el topo al agujero.
  if (t > 0.55 && m.type !== "bomb") {
    const pawY = base.sy - ry * 0.12;
    const dark = m.type === "gold" ? PALETTE.goldDark : PALETTE.brownDark;
    for (const sx of [-1, 1]) {
      fillEllipse(ctx, base.sx + sx * r * 0.72, pawY, r * 0.3, r * 0.2, dark);
      ctx.strokeStyle = "rgba(255,240,214,0.7)";
      ctx.lineWidth = Math.max(0.5, r * 0.05);
      ctx.beginPath();
      for (const k of [-1, 0, 1]) {
        const px = base.sx + sx * r * 0.72 + k * r * 0.12;
        ctx.moveTo(px, pawY - r * 0.06);
        ctx.lineTo(px, pawY - r * 0.2);
      }
      ctx.stroke();
    }
  }

  // Polvo al emerger: sólo durante la subida.
  if (m.phase === "rising" && t > 0.12) {
    const puff = 1 - t;
    ctx.fillStyle = PALETTE.dust;
    ctx.globalAlpha = puff * 0.8;
    for (const [dx, dy, sc] of [[-1.15, -0.15, 0.5], [1.1, -0.25, 0.42], [-0.55, -0.45, 0.3], [0.6, -0.5, 0.34]]) {
      fillEllipse(ctx, base.sx + dx * rx, base.sy + dy * ry - (1 - puff) * r * 0.5, rx * sc, ry * sc * 1.2, PALETTE.dust);
    }
    ctx.globalAlpha = 1;
  }

  // Impacto: destello de estrella + anillo de polvo mientras se hunde.
  if (m.whacked) {
    const fade = clamp(1 - (m.phase === "falling" ? 1 - m.y / POP_HEIGHT : 0), 0.15, 1);
    ctx.globalAlpha = fade;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.strokeStyle = "#ffd85a";
    ctx.lineWidth = Math.max(1, 2 * s);
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 === 0 ? r * (1.5 + (1 - fade)) : r * 0.75;
      const px = base.sx + Math.cos(a) * rr;
      const py = base.sy - r * 0.5 + Math.sin(a) * rr * GROUND_SQUASH * 1.6;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(160,126,84,0.5)";
    ctx.lineWidth = Math.max(1, 2.4 * s);
    ctx.beginPath();
    ctx.ellipse(base.sx, base.sy, rx * (1.3 + (1 - fade) * 0.8), ry * (1.3 + (1 - fade) * 0.8), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawBarrel(ctx, cam, b) {
  const base = project(cam, b.x, 0, b.z);
  const top = project(cam, b.x, 52, b.z);
  if (!base.visible || !top.visible) return;
  const s = base.scale;
  const w = 26 * s;
  const hgt = base.sy - top.sy;

  contactShadow(ctx, base.sx, base.sy, w * 1.1);

  // Cuerpo con duelas: gradiente lateral + franjas verticales sutiles.
  const g = ctx.createLinearGradient(base.sx - w, 0, base.sx + w, 0);
  g.addColorStop(0, PALETTE.barrelDark);
  g.addColorStop(0.34, PALETTE.barrel);
  g.addColorStop(0.46, PALETTE.barrelLight);
  g.addColorStop(0.62, PALETTE.barrel);
  g.addColorStop(1, PALETTE.barrelDark);
  ctx.fillStyle = g;
  roundRectPath(ctx, base.sx - w, top.sy, w * 2, hgt, w * 0.34);
  ctx.fill();

  ctx.save();
  roundRectPath(ctx, base.sx - w, top.sy, w * 2, hgt, w * 0.34);
  ctx.clip();
  ctx.strokeStyle = "rgba(10,30,60,0.22)";
  ctx.lineWidth = Math.max(0.6, 1.2 * s);
  for (const f of [-0.6, -0.2, 0.2, 0.6]) {
    ctx.beginPath();
    ctx.moveTo(base.sx + w * f, top.sy);
    ctx.lineTo(base.sx + w * f, base.sy);
    ctx.stroke();
  }
  // Aros metálicos.
  for (const f of [0.2, 0.62]) {
    const y = top.sy + hgt * f;
    ctx.fillStyle = PALETTE.barrelBand;
    ctx.fillRect(base.sx - w, y, w * 2, Math.max(1.6, 4 * s));
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(base.sx - w, y, w * 2, Math.max(0.6, 1.4 * s));
  }
  ctx.restore();

  // Tapa superior con reborde.
  fillEllipse(ctx, base.sx, top.sy, w, w * GROUND_SQUASH * 0.9, PALETTE.barrelBand);
  fillEllipse(ctx, base.sx, top.sy, w * 0.78, w * GROUND_SQUASH * 0.68, PALETTE.barrelLight);
  fillEllipse(ctx, base.sx - w * 0.2, top.sy - w * 0.05, w * 0.34, w * GROUND_SQUASH * 0.24, "rgba(255,255,255,0.55)");
}

// Mazo dibujado en su propio sistema de coordenadas y rotado según el swing.
function drawMallet(ctx, handX, handY, s, angle, flip) {
  const len = 46 * s;
  const headW = 15 * s;
  const headH = 11 * s;
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(angle * (flip ? -1 : 1));
  // Mango con veta.
  ctx.strokeStyle = PALETTE.mallet;
  ctx.lineWidth = Math.max(1.8, 4.6 * s);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -len);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.malletDark;
  ctx.lineWidth = Math.max(0.6, 1.4 * s);
  ctx.beginPath();
  ctx.moveTo(-headW * 0.08, -len * 0.15);
  ctx.lineTo(-headW * 0.08, -len * 0.85);
  ctx.stroke();
  // Cabeza con aro claro y sombra inferior.
  ctx.fillStyle = PALETTE.malletHeadDark;
  roundRectPath(ctx, -headW, -len - headH * 0.75, headW * 2, headH * 1.6, headH * 0.5);
  ctx.fill();
  const hg = ctx.createLinearGradient(0, -len - headH, 0, -len + headH * 0.6);
  hg.addColorStop(0, "#ff8e6f");
  hg.addColorStop(0.5, PALETTE.malletHead);
  hg.addColorStop(1, PALETTE.malletHeadDark);
  ctx.fillStyle = hg;
  roundRectPath(ctx, -headW, -len - headH * 0.75, headW * 2, headH * 1.35, headH * 0.45);
  ctx.fill();
  ctx.fillStyle = PALETTE.malletBand;
  ctx.fillRect(-headW * 0.16, -len - headH * 0.7, headW * 0.32, headH * 1.3);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  roundRectPath(ctx, -headW * 0.8, -len - headH * 0.55, headW * 1.6, headH * 0.28, headH * 0.14);
  ctx.fill();
  ctx.restore();
}

function drawMascot(ctx, cam, mascot, color, isPlayer, now, whackRadius) {
  const base = project(cam, mascot.x, 0, mascot.z);
  if (!base.visible) return;
  const s = base.scale;
  const bx = base.sx;
  const byFeet = base.sy;
  const bodyH = 78 * s;
  const w = 21 * s;

  const stunned = mascot.stun > 0;
  const moving = Math.hypot(mascot.fx, mascot.fz) > 0.01;
  const phase = now / 120 + mascot.id * 1.6;
  const stride = stunned ? 0 : Math.sin(phase) * (moving ? 1 : 0.12);
  const bob = stunned ? 0 : Math.abs(Math.cos(phase)) * bodyH * (moving ? 0.022 : 0.006);

  contactShadow(ctx, bx, byFeet, w * 1.15, bob / (bodyH || 1));

  // Alcance del mazo: anillo tenue sólo para el jugador, para que se lea que el
  // golpe es de área y no un clic sobre el agujero.
  if (isPlayer && whackRadius) {
    ctx.save();
    ctx.setLineDash([6 * s * 2, 5 * s * 2]);
    ctx.strokeStyle = "rgba(255,240,150,0.5)";
    ctx.lineWidth = Math.max(1.2, 2 * s);
    ctx.beginPath();
    ctx.ellipse(bx, byFeet, whackRadius * s, whackRadius * s * GROUND_SQUASH, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const hipY = byFeet - bodyH * 0.44 - bob;
  const shoulderY = byFeet - bodyH * 0.78 - bob;
  const headR = Math.max(3.6, 8.6 * s);
  const headY = byFeet - bodyH * 0.88 - headR * 0.62 - bob;
  const dark = shade(color, -0.34);
  const hi = shade(color, 0.3);

  ctx.lineCap = "round";

  // Piernas + pies.
  ctx.strokeStyle = shade(color, -0.55);
  ctx.lineWidth = Math.max(2.2, 5.6 * s);
  const footL = bx - w * 0.3 + stride * w * 0.55;
  const footR = bx + w * 0.3 - stride * w * 0.55;
  ctx.beginPath();
  ctx.moveTo(bx - w * 0.16, hipY);
  ctx.lineTo(footL, byFeet);
  ctx.moveTo(bx + w * 0.16, hipY);
  ctx.lineTo(footR, byFeet);
  ctx.stroke();
  fillEllipse(ctx, footL, byFeet, w * 0.24, w * 0.13, PALETTE.hair);
  fillEllipse(ctx, footR, byFeet, w * 0.24, w * 0.13, PALETTE.hair);

  // Brazo trasero, contrapuesto a la zancada.
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(2, 4.6 * s);
  ctx.beginPath();
  ctx.moveTo(bx - w * 0.34, shoulderY + bodyH * 0.04);
  ctx.lineTo(bx - w * 0.66 - stride * w * 0.3, shoulderY + bodyH * 0.26);
  ctx.stroke();

  // Torso: hombros redondeados, cintura marcada.
  const tg = ctx.createLinearGradient(bx - w * 0.6, shoulderY, bx + w * 0.6, hipY);
  tg.addColorStop(0, hi);
  tg.addColorStop(0.55, color);
  tg.addColorStop(1, dark);
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(bx - w * 0.42, hipY);
  ctx.quadraticCurveTo(bx - w * 0.52, shoulderY + bodyH * 0.12, bx - w * 0.44, shoulderY);
  ctx.quadraticCurveTo(bx, shoulderY - bodyH * 0.05, bx + w * 0.44, shoulderY);
  ctx.quadraticCurveTo(bx + w * 0.52, shoulderY + bodyH * 0.12, bx + w * 0.42, hipY);
  ctx.closePath();
  ctx.fill();
  // Cinturón y luz de borde.
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(bx - w * 0.44, hipY - bodyH * 0.05, w * 0.88, Math.max(1.2, bodyH * 0.045));
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = Math.max(0.6, 1.3 * s);
  ctx.beginPath();
  ctx.moveTo(bx - w * 0.4, hipY);
  ctx.quadraticCurveTo(bx - w * 0.5, shoulderY + bodyH * 0.12, bx - w * 0.42, shoulderY);
  ctx.stroke();

  // Cuello + cabeza lisa sin cara, con casquete de pelo.
  ctx.strokeStyle = PALETTE.skinDark;
  ctx.lineWidth = Math.max(1.4, 3.2 * s);
  ctx.beginPath();
  ctx.moveTo(bx, shoulderY);
  ctx.lineTo(bx, headY + headR * 0.7);
  ctx.stroke();
  const hg2 = ctx.createRadialGradient(bx - headR * 0.34, headY - headR * 0.36, headR * 0.15, bx, headY, headR * 1.1);
  hg2.addColorStop(0, "#f6e3c8");
  hg2.addColorStop(0.5, PALETTE.skin);
  hg2.addColorStop(1, PALETTE.skinDark);
  ctx.fillStyle = hg2;
  ctx.beginPath();
  ctx.arc(bx, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.hair;
  ctx.beginPath();
  ctx.arc(bx, headY, headR, Math.PI * 1.06, Math.PI * 1.94);
  ctx.closePath();
  ctx.fill();
  // Sombra de la barbilla sobre el pecho.
  fillEllipse(ctx, bx, headY + headR * 0.95, headR * 0.7, headR * 0.24, "rgba(60,40,24,0.22)");

  // Mazo: reposa alto y describe un arco al golpear.
  const wp = mascot.whack > 0 ? clamp(mascot.whack / 200, 0, 1) : 0; // 1 recién golpeado → 0
  const swing = 1 - wp; // 0 arriba → 1 abajo
  const eased = swing * swing * (3 - 2 * swing);
  const angle = -0.55 + eased * 2.35; // radianes, de hombro atrás a suelo delante
  const handX = bx + w * 0.46;
  const handY = shoulderY + bodyH * 0.05;
  drawMallet(ctx, handX, handY, s, angle, false);

  // Brazo delantero, siguiendo al mazo.
  ctx.strokeStyle = hi;
  ctx.lineWidth = Math.max(2, 4.8 * s);
  ctx.beginPath();
  ctx.moveTo(bx + w * 0.34, shoulderY + bodyH * 0.04);
  ctx.lineTo(handX, handY);
  ctx.stroke();
  fillEllipse(ctx, handX, handY, w * 0.15, w * 0.15, PALETTE.skin);

  // Estela del mazazo, sólo en el fotograma caliente.
  if (wp > 0.35) {
    ctx.strokeStyle = `rgba(255,255,255,${(wp - 0.35) * 0.9})`;
    ctx.lineWidth = Math.max(1.5, 3 * s);
    ctx.beginPath();
    ctx.arc(handX, handY, 44 * s, -Math.PI * 0.85, -Math.PI * 0.1);
    ctx.stroke();
  }

  // Aturdido: estrellitas girando sobre la cabeza.
  if (stunned) {
    for (let i = 0; i < 3; i += 1) {
      const a = now / 200 + (i / 3) * Math.PI * 2;
      const px = bx + Math.cos(a) * headR * 1.9;
      const py = headY - headR * 1.7 + Math.sin(a) * headR * 0.45;
      drawStar(ctx, px, py, Math.max(1.6, 3.4 * s), "#ffd85a");
    }
  }
}

function drawStar(ctx, cx, cy, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
function drawHud(ctx, vW, state) {
  const { mascots, teamColors, timeLeft, copy } = state;
  // Reloj central.
  const secs = Math.max(0, Math.ceil(timeLeft / 1000));
  const bw = 92;
  const bx = (vW - bw) / 2;
  ctx.fillStyle = "rgba(9,26,18,0.72)";
  roundRectPath(ctx, bx, 8, bw, 30, 9);
  ctx.fill();
  if (secs <= 5) {
    ctx.strokeStyle = "rgba(255,122,90,0.8)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.fillStyle = secs <= 5 ? "#ff7a5a" : PALETTE.textLight;
  ctx.font = "800 18px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`⏱ ${secs}`, vW / 2, 23);

  // Cuatro marcadores en las esquinas (jugador destacado).
  const corners = [
    { x: 10, y: 8, align: "left" },
    { x: vW - 10, y: 8, align: "right" },
    { x: 10, y: 44, align: "left" },
    { x: vW - 10, y: 44, align: "right" },
  ];
  mascots.forEach((m, i) => {
    const c = corners[i];
    const label = i === 0 ? copy.you : `${copy.cpu}${i}`;
    ctx.textAlign = c.align;
    ctx.font = "800 14px system-ui, sans-serif";
    const text = `${label} ${m.score}`;
    const tw = ctx.measureText(text).width + 26;
    const px = c.align === "left" ? c.x : c.x - tw;
    ctx.fillStyle = "rgba(9,26,18,0.66)";
    roundRectPath(ctx, px, c.y, tw, 28, 8);
    ctx.fill();
    if (i === 0) {
      ctx.strokeStyle = "rgba(255,240,150,0.75)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    fillEllipse(ctx, px + 13, c.y + 14, 6, 6, teamColors[m.team]);
    ctx.fillStyle = PALETTE.textLight;
    ctx.textAlign = "left";
    ctx.fillText(text, px + 24, c.y + 15);
  });
}

function drawCenterMessage(ctx, vW, vH, text, big) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = big ? "900 72px system-ui, sans-serif" : "800 30px system-ui, sans-serif";
  if (big) {
    ctx.fillStyle = "rgba(9,26,18,0.35)";
    ctx.fillText(text, vW / 2 + 3, vH / 2 + 3);
    ctx.fillStyle = PALETTE.textLight;
    ctx.fillText(text, vW / 2, vH / 2);
  } else {
    const w = ctx.measureText(text).width + 52;
    ctx.fillStyle = "rgba(9,26,18,0.8)";
    roundRectPath(ctx, (vW - w) / 2, vH * 0.42, w, 54, 13);
    ctx.fill();
    ctx.fillStyle = PALETTE.textLight;
    ctx.fillText(text, vW / 2, vH * 0.42 + 27);
  }
}

function drawFinal(ctx, vW, vH, state) {
  const { ranking, teamColors, copy, banner } = state;
  ctx.fillStyle = "rgba(6,16,11,0.72)";
  ctx.fillRect(0, 0, vW, vH);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = PALETTE.textLight;
  ctx.font = "900 30px system-ui, sans-serif";
  ctx.fillText(banner, vW / 2, vH * 0.22);
  const rowH = 34;
  const top = vH * 0.34;
  const bw = Math.min(300, vW - 40);
  ranking.forEach((r, i) => {
    const y = top + i * rowH;
    const x = (vW - bw) / 2;
    ctx.fillStyle = i === 0 ? "rgba(255,215,94,0.22)" : "rgba(255,255,255,0.08)";
    roundRectPath(ctx, x, y, bw, rowH - 6, 8);
    ctx.fill();
    fillEllipse(ctx, x + 22, y + (rowH - 6) / 2, 8, 8, teamColors[r.team]);
    ctx.fillStyle = PALETTE.textLight;
    ctx.textAlign = "left";
    ctx.font = "800 16px system-ui, sans-serif";
    const name = r.id === 0 ? copy.you : `${copy.cpu}${r.id}`;
    ctx.fillText(`${i + 1}. ${name}`, x + 38, y + (rowH - 6) / 2 + 1);
    ctx.textAlign = "right";
    ctx.fillText(String(r.score), x + bw - 16, y + (rowH - 6) / 2 + 1);
  });
}

// Aclara/oscurece un color hex.
function shade(hex, amt) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const f = (v) => clamp(Math.round(v + (amt > 0 ? (255 - v) * amt : v * amt)), 0, 255);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

// ─── Composición ────────────────────────────────────────────────────────────────
export function drawWorld(ctx, state) {
  const {
    dpr, vW, vH, holes, barrels, mascots, teamColors, whackRadius,
    countdown, screen, paused, copy,
  } = state;
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  const cam = makeCamera(vW, vH);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, vW, vH);

  drawBackground(ctx, cam, vW, vH);
  drawFloor(ctx, cam);
  drawFence(ctx, cam);
  // Los agujeros son parte del suelo: van todos antes que las entidades.
  for (const h of holes) drawHole(ctx, cam, h);

  // Entidades (topos + barriles + mascotas) ordenadas por z (lejos → cerca).
  const ents = [];
  holes.forEach((h) => {
    if (h.mole) ents.push({ z: h.z, kind: "mole", hole: h });
  });
  barrels.forEach((b) => ents.push({ z: b.z, kind: "barrel", b }));
  mascots.forEach((m) => ents.push({ z: m.z, kind: "mascot", m }));
  ents.sort((a, b) => a.z - b.z);
  for (const e of ents) {
    if (e.kind === "mole") drawMole(ctx, cam, e.hole, now);
    else if (e.kind === "barrel") drawBarrel(ctx, cam, e.b);
    else drawMascot(ctx, cam, e.m, teamColors[e.m.team], e.m.id === 0, now, whackRadius);
  }

  // Viñeta suave: centra la mirada en la arena.
  const vig = ctx.createRadialGradient(vW / 2, vH * 0.55, vH * 0.35, vW / 2, vH * 0.55, vH * 0.95);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(12,30,20,0.28)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, vW, vH);

  if (screen !== "over") drawHud(ctx, vW, state);

  if (screen === "countdown") {
    const n = Math.max(1, Math.ceil(countdown / 1000));
    drawCenterMessage(ctx, vW, vH, n > 0 ? String(n) : copy.ready, true);
  }
  if (screen === "over") drawFinal(ctx, vW, vH, state);
  if (paused) drawCenterMessage(ctx, vW, vH, copy.paused, false);
}
