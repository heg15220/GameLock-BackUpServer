// Canvas rendering for Ping Pong Arena. Pseudo-3D scene drawn back-to-front with
// a painter's algorithm through the reference's perspective projection.
//
// World frame is the reference's (see physics.js): pixel units, x centred on 0,
// y measured up from the floor with the table surface at TABLE_TOP_Y, z running
// from BOARD_Z (near edge) to BOARD_END (far edge).
//
// Palette is the reference sprite's (blue table, yellow ball, red/orange bat)
// set into the platform's dark stage.

import {
  project3D,
  ballRadius,
  BOARD_HALF_WIDTH,
  BOARD_Z,
  BOARD_END,
  BOARD_THICKNESS,
  TABLE_TOP_Y,
  FLOOR_Y,
  NET_Z,
  NET_HEIGHT,
  PLAYER_Z,
  OPPONENT_Z,
  BAT_HALF_WIDTH,
  BAT_HALF_LENGTH,
} from "./physics.js";
import { isAdPreviewEnabledByCode } from "../../../config/adPreview.js";

const C = {
  arenaTop: "#0b1526",
  arenaBottom: "#05090f",
  floor: "#101f34",
  wall: "#0e1a2c",
  crowd: "rgba(120,150,190,0.30)",
  spot: "rgba(120,170,255,0.10)",
  tableTop: "#284088", // BOARD_BACKGROUND in the reference
  tableInner: "#24529b",
  tableEdge: "#122c5f",
  tableSide: "#0d1f45",
  line: "#eef2ff",
  leg: "#0a1224",
  net: "rgba(226,236,255,0.55)",
  netTape: "#f4f7ff",
  ball: "#ffd740", // BALL_BACKGROUND
  ballHi: "#fff3b0",
  ballEdge: "#ffc400", // BALL_BORDER
  shadow: "rgba(3,8,16,0.42)",
  paddleFace: "#c0182a",
  paddleBack: "#171a1f",
  paddleRim: "#0c0e12",
  handle: "#e6a23c",
  handleDark: "#b9791f",
  adPanel: "#0f1c30",
  adBorder: "rgba(120,150,200,0.35)",
  adText: "rgba(150,175,215,0.55)",
};

const BACK_Z = BOARD_END + 900;

const AD_BOARDS = [
  { x: 0, z: BOARD_END + 190, w: 840, label: "ADS" },
  { x: -470, z: NET_Z, w: 560, side: "left", label: "ADS" },
  { x: 470, z: NET_Z, w: 560, side: "right", label: "ADS" },
];

function p(cam, x, y, z) {
  return project3D(cam, x, y, z);
}

function quad(ctx, cam, pts, fill, stroke) {
  const s = pts.map(([x, y, z]) => p(cam, x, y, z));
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
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawArena(ctx, cam, vW, vH) {
  const g = ctx.createLinearGradient(0, 0, 0, vH);
  g.addColorStop(0, C.arenaTop);
  g.addColorStop(1, C.arenaBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vW, vH);

  // Back wall + stands well behind the far baseline.
  quad(
    ctx,
    cam,
    [
      [-1400, FLOOR_Y, BACK_Z],
      [1400, FLOOR_Y, BACK_Z],
      [1400, 840, BACK_Z],
      [-1400, 840, BACK_Z],
    ],
    C.wall,
  );

  // Schematic crowd: rows of dots on the back wall.
  ctx.save();
  for (let row = 0; row < 5; row++) {
    const y = 190 + row * 112;
    for (let i = -7; i <= 7; i++) {
      const x = i * 147 + (row % 2) * 70;
      const q = p(cam, x, y, BACK_Z - 18);
      if (!q.visible) continue;
      ctx.fillStyle = C.crowd;
      ctx.beginPath();
      ctx.arc(q.sx, q.sy, Math.max(1.2, 21 * q.scale), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // Floor slab under and around the table.
  quad(
    ctx,
    cam,
    [
      [-1400, FLOOR_Y, PLAYER_Z - 140],
      [1400, FLOOR_Y, PLAYER_Z - 140],
      [1400, FLOOR_Y, BACK_Z],
      [-1400, FLOOR_Y, BACK_Z],
    ],
    C.floor,
  );

  // Overhead spotlight glow.
  const cx = vW * 0.5;
  const rg = ctx.createRadialGradient(cx, vH * 0.1, 20, cx, vH * 0.1, vW * 0.7);
  rg.addColorStop(0, C.spot);
  rg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, vW, vH);
}

function drawAdBoards(ctx, cam) {
  const previewOn = isAdPreviewEnabledByCode();
  for (const b of AD_BOARDS) {
    const half = b.w / 2;
    const top = 148;
    let pts;
    if (b.side === "left" || b.side === "right") {
      pts = [
        [b.x, FLOOR_Y, b.z - half],
        [b.x, FLOOR_Y, b.z + half],
        [b.x, top, b.z + half],
        [b.x, top, b.z - half],
      ];
    } else {
      pts = [
        [b.x - half, FLOOR_Y, b.z],
        [b.x + half, FLOOR_Y, b.z],
        [b.x + half, top, b.z],
        [b.x - half, top, b.z],
      ];
    }
    quad(ctx, cam, pts, previewOn ? "#12263f" : C.adPanel, C.adBorder);
    const cxp = pts.reduce((a, q) => a + q[0], 0) / 4;
    const czp = pts.reduce((a, q) => a + q[2], 0) / 4;
    const q = p(cam, cxp, top * 0.5, czp);
    if (q.visible) {
      ctx.fillStyle = C.adText;
      ctx.font = `700 ${Math.max(8, 56 * q.scale)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(b.label, q.sx, q.sy);
    }
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawTable(ctx, cam) {
  const y = TABLE_TOP_Y;
  const tb = TABLE_TOP_Y - BOARD_THICKNESS;

  // Legs first: they sit under the table, so the top and the front face must
  // paint over them. Drawing them last leaves the far pair showing through the
  // playing surface.
  for (const lx of [-BOARD_HALF_WIDTH + 64, BOARD_HALF_WIDTH - 64]) {
    for (const lz of [BOARD_Z + 78, BOARD_END - 78]) {
      quad(
        ctx,
        cam,
        [
          [lx - 11, tb, lz],
          [lx + 11, tb, lz],
          [lx + 11, FLOOR_Y, lz],
          [lx - 11, FLOOR_Y, lz],
        ],
        C.leg,
      );
    }
  }

  // Table side (thickness) — front face.
  quad(
    ctx,
    cam,
    [
      [-BOARD_HALF_WIDTH, y, BOARD_Z],
      [BOARD_HALF_WIDTH, y, BOARD_Z],
      [BOARD_HALF_WIDTH, tb, BOARD_Z],
      [-BOARD_HALF_WIDTH, tb, BOARD_Z],
    ],
    C.tableSide,
  );

  // Playing surface.
  quad(
    ctx,
    cam,
    [
      [-BOARD_HALF_WIDTH, y, BOARD_Z],
      [BOARD_HALF_WIDTH, y, BOARD_Z],
      [BOARD_HALF_WIDTH, y, BOARD_END],
      [-BOARD_HALF_WIDTH, y, BOARD_END],
    ],
    C.tableTop,
  );
  // Inner playing area (slightly inset, brighter blue).
  const m = 11;
  quad(
    ctx,
    cam,
    [
      [-BOARD_HALF_WIDTH + m, y, BOARD_Z + m],
      [BOARD_HALF_WIDTH - m, y, BOARD_Z + m],
      [BOARD_HALF_WIDTH - m, y, BOARD_END - m],
      [-BOARD_HALF_WIDTH + m, y, BOARD_END - m],
    ],
    C.tableInner,
  );

  // White boundary + centre line.
  const lw = 7;
  const white = C.line;
  quad(ctx, cam, [[-BOARD_HALF_WIDTH, y, BOARD_Z], [-BOARD_HALF_WIDTH + lw, y, BOARD_Z], [-BOARD_HALF_WIDTH + lw, y, BOARD_END], [-BOARD_HALF_WIDTH, y, BOARD_END]], white);
  quad(ctx, cam, [[BOARD_HALF_WIDTH - lw, y, BOARD_Z], [BOARD_HALF_WIDTH, y, BOARD_Z], [BOARD_HALF_WIDTH, y, BOARD_END], [BOARD_HALF_WIDTH - lw, y, BOARD_END]], white);
  quad(ctx, cam, [[-BOARD_HALF_WIDTH, y, BOARD_Z], [BOARD_HALF_WIDTH, y, BOARD_Z], [BOARD_HALF_WIDTH, y, BOARD_Z + lw], [-BOARD_HALF_WIDTH, y, BOARD_Z + lw]], white);
  quad(ctx, cam, [[-BOARD_HALF_WIDTH, y, BOARD_END - lw], [BOARD_HALF_WIDTH, y, BOARD_END - lw], [BOARD_HALF_WIDTH, y, BOARD_END], [-BOARD_HALF_WIDTH, y, BOARD_END]], white);
  quad(ctx, cam, [[-lw / 2, y, BOARD_Z], [lw / 2, y, BOARD_Z], [lw / 2, y, BOARD_END], [-lw / 2, y, BOARD_END]], "rgba(238,242,255,0.55)");
}

function drawNet(ctx, cam) {
  const top = TABLE_TOP_Y + NET_HEIGHT;
  quad(
    ctx,
    cam,
    [
      [-BOARD_HALF_WIDTH - 10, top, NET_Z],
      [BOARD_HALF_WIDTH + 10, top, NET_Z],
      [BOARD_HALF_WIDTH + 10, top - 5, NET_Z],
      [-BOARD_HALF_WIDTH - 10, top - 5, NET_Z],
    ],
    C.netTape,
  );

  ctx.save();
  ctx.strokeStyle = C.net;
  ctx.lineWidth = 1;
  const cols = 26;
  for (let i = 0; i <= cols; i++) {
    const x = -BOARD_HALF_WIDTH + (2 * BOARD_HALF_WIDTH * i) / cols;
    const a = p(cam, x, TABLE_TOP_Y, NET_Z);
    const b = p(cam, x, top, NET_Z);
    if (a.visible && b.visible) {
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.stroke();
    }
  }
  const rows = 5;
  for (let j = 0; j <= rows; j++) {
    const yy = TABLE_TOP_Y + (NET_HEIGHT * j) / rows;
    const a = p(cam, -BOARD_HALF_WIDTH, yy, NET_Z);
    const b = p(cam, BOARD_HALF_WIDTH, yy, NET_Z);
    if (a.visible && b.visible) {
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// The bat: a rounded blade with a handle, sized from the reference's
// BAT_WIDTH/BAT_LENGTH so it covers the same slice of the table.
function drawBat(ctx, cam, x, y, z, facing) {
  const c = p(cam, x, y, z);
  if (!c.visible) return;
  const rx = BAT_HALF_WIDTH * c.scale;
  const ry = BAT_HALF_LENGTH * c.scale * 0.62;

  const h1 = p(cam, x, y - BAT_HALF_LENGTH * 0.95, z);
  if (h1.visible) {
    ctx.strokeStyle = facing === "away" ? C.handleDark : C.handle;
    ctx.lineWidth = Math.max(4, 26 * c.scale);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(c.sx, c.sy + ry * 0.6);
    ctx.lineTo(h1.sx, h1.sy);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.ellipse(c.sx, c.sy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = facing === "away" ? C.paddleBack : C.paddleFace;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, 4 * c.scale);
  ctx.strokeStyle = C.paddleRim;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(c.sx - rx * 0.25, c.sy - ry * 0.3, rx * 0.5, ry * 0.55, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fill();
}

function drawBall(ctx, cam, ball) {
  // Shadow: on the table when the ball is over it, on the floor otherwise —
  // the reference picks the surface the same way.
  const onTable = ball.bounceLevel === TABLE_TOP_Y;
  const sh = p(cam, ball.x, onTable ? TABLE_TOP_Y + 1 : FLOOR_Y + 1, ball.z);
  // ballRadius() already returns a screen radius (the reference shrinks it with
  // depth itself and draws it straight), so it must NOT be run through the
  // projection scale again — only rescaled from the reference's native focal.
  const r = Math.max(2, ballRadius(ball) * (cam.focal / 500));
  if (sh.visible) {
    ctx.beginPath();
    ctx.ellipse(sh.sx, sh.sy, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.shadow;
    ctx.fill();
  }

  const c = p(cam, ball.x, ball.y, ball.z);
  if (!c.visible) return;
  const g = ctx.createRadialGradient(c.sx - r * 0.35, c.sy - r * 0.35, r * 0.2, c.sx, c.sy, r);
  g.addColorStop(0, C.ballHi);
  g.addColorStop(1, C.ball);
  ctx.beginPath();
  ctx.arc(c.sx, c.sy, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = C.ballEdge;
  ctx.stroke();
}

// Main scene draw (world only; HUD/overlays handled by the engine over the top).
export function drawWorld(ctx, cam, state, vW, vH) {
  drawArena(ctx, cam, vW, vH);
  drawAdBoards(ctx, cam);
  drawTable(ctx, cam);

  // Opponent bat is furthest back.
  drawBat(ctx, cam, state.oppBat.x, state.oppBat.y, state.oppBat.z ?? OPPONENT_Z, "away");

  // Order ball vs net by depth (painter's algorithm).
  if (state.ball.z >= NET_Z) {
    drawBall(ctx, cam, state.ball);
    drawNet(ctx, cam);
  } else {
    drawNet(ctx, cam);
    drawBall(ctx, cam, state.ball);
  }

  // Human bat is nearest the camera.
  drawBat(ctx, cam, state.playerBat.x, state.playerBat.y, state.playerBat.z ?? PLAYER_Z, "near");
}

export { C as PALETTE };
