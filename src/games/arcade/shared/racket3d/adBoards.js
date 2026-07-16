// Sponsor hoardings rendered inside the 3D scene — courtside in tennis, around
// the barriers in table tennis.
//
// They are driven by the platform's ad-slot config, so when the monetization
// preview is switched on they carry whatever creatives are configured, and when
// it is off they fall back to neutral house branding instead of showing an
// empty grey slab.
import { project } from "./camera";
import { MOBILE_STAGE_AD_SLOTS } from "../../../../config/adPreview";

const HOUSE_BOARDS = {
  es: [
    { label: "TU MARCA", sub: "espacio disponible", accent: "#2f7de1" },
    { label: "PATROCINIO", sub: "gamelock.io", accent: "#d4432f" },
    { label: "ANÚNCIATE", sub: "aquí", accent: "#1f9e63" },
    { label: "GAMELOCK", sub: "arena oficial", accent: "#6a3fd4" },
    { label: "TU MARCA", sub: "contacta ya", accent: "#d78b1e" },
    { label: "PATROCINIO", sub: "espacio libre", accent: "#0f8f9e" },
  ],
  en: [
    { label: "YOUR BRAND", sub: "space available", accent: "#2f7de1" },
    { label: "SPONSOR", sub: "gamelock.io", accent: "#d4432f" },
    { label: "ADVERTISE", sub: "here", accent: "#1f9e63" },
    { label: "GAMELOCK", sub: "official arena", accent: "#6a3fd4" },
    { label: "YOUR BRAND", sub: "get in touch", accent: "#d78b1e" },
    { label: "SPONSOR", sub: "open slot", accent: "#0f8f9e" },
  ],
};

// One creative per board.  A configured slot wins; otherwise the house board in
// the same position is used, so the ring of hoardings is always full.
export function getBoardCreatives(locale = "es", count = 6) {
  const house = HOUSE_BOARDS[locale] ?? HOUSE_BOARDS.en;
  const boards = [];
  for (let i = 0; i < count; i += 1) {
    const slot = MOBILE_STAGE_AD_SLOTS[i % MOBILE_STAGE_AD_SLOTS.length];
    const fallback = house[i % house.length];
    boards.push({
      id: slot?.id ?? `house-${i}`,
      label: slot?.adUnitId || fallback.label,
      sub: slot?.targetUrl || fallback.sub,
      accent: fallback.accent,
    });
  }
  return boards;
}

// Maps the unit square onto a projected quad and runs `draw` in that space, so
// text and stripes sit on the board's plane instead of floating flat on screen.
// Affine, not perspective-correct — invisible at hoarding size, and far cheaper.
function withQuadTransform(ctx, topLeft, topRight, bottomLeft, draw) {
  const ax = topRight.x - topLeft.x;
  const ay = topRight.y - topLeft.y;
  const bx = bottomLeft.x - topLeft.x;
  const by = bottomLeft.y - topLeft.y;
  // A degenerate quad (edge-on to the camera) would collapse the transform.
  if (Math.abs(ax * by - ay * bx) < 1e-3) return;

  ctx.save();
  ctx.transform(ax, ay, bx, by, topLeft.x, topLeft.y);
  draw(ctx);
  ctx.restore();
}

// `corners` are world points in the order: top-left, top-right, bottom-right,
// bottom-left, seen from the front of the board.
export function drawAdBoard(ctx, cam, vW, vH, corners, creative) {
  const p = corners.map((c) => project(cam, c[0], c[1], c[2], vW, vH));
  if (p.some((q) => !q)) return;

  ctx.beginPath();
  ctx.moveTo(p[0].x, p[0].y);
  for (let i = 1; i < 4; i += 1) ctx.lineTo(p[i].x, p[i].y);
  ctx.closePath();
  ctx.fillStyle = creative.accent;
  ctx.fill();

  withQuadTransform(ctx, p[0], p[1], p[3], (c) => {
    // Board face is now the unit square.
    c.fillStyle = "rgba(255,255,255,0.14)";
    c.fillRect(0, 0, 1, 0.28);
    c.fillStyle = "rgba(0,0,0,0.18)";
    c.fillRect(0, 0.82, 1, 0.18);

    c.fillStyle = "rgba(255,255,255,0.95)";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = "bold 0.34px Arial, sans-serif";
    c.fillText(creative.label, 0.5, 0.44);

    c.fillStyle = "rgba(255,255,255,0.72)";
    c.font = "0.17px Arial, sans-serif";
    c.fillText(creative.sub, 0.5, 0.72);
  });

  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

// Lays a run of boards along a straight line, each `width` wide with a small
// gap, standing `height` tall from `y0`.
export function drawBoardRun(
  ctx,
  cam,
  vW,
  vH,
  { from, to, y0, height, creatives, gap = 0.12 }
) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.hypot(dx, dz);
  if (length < 0.1 || !creatives.length) return;

  const ux = dx / length;
  const uz = dz / length;
  const boardWidth = length / creatives.length;

  for (let i = 0; i < creatives.length; i += 1) {
    const s0 = i * boardWidth + gap / 2;
    const s1 = (i + 1) * boardWidth - gap / 2;
    const x0 = from[0] + ux * s0;
    const z0 = from[1] + uz * s0;
    const x1 = from[0] + ux * s1;
    const z1 = from[1] + uz * s1;

    drawAdBoard(
      ctx,
      cam,
      vW,
      vH,
      [
        [x0, y0 + height, z0],
        [x1, y0 + height, z1],
        [x1, y0, z1],
        [x0, y0, z0],
      ],
      creatives[i]
    );
  }
}
