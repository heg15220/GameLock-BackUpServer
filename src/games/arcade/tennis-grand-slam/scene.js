// Tennis rendering: stadium, court, net, players, ball, HUD, and the menu /
// bracket screens.  Pure drawing — it reads the runtime, it never mutates it.
import { createCamera, project, line3D, fillPoly3D } from "../shared/racket3d/camera";
import { getBoardCreatives, drawBoardRun } from "../shared/racket3d/adBoards";
import {
  COURT_HALF_LENGTH,
  COURT_HALF_WIDTH,
  SERVICE_LINE_Z,
  NET_CENTER_HEIGHT,
  NET_POST_HEIGHT,
  NET_POST_X,
  BALL_RADIUS,
  netHeightAt,
} from "./physics";
import { ROUND_NAMES, ROUND_KEYS, SURFACE_NAMES, champion } from "./tournament";
import { TIER_LABELS } from "../shared/racket3d/adaptiveAi";
import { STYLES } from "./players";
import { scoreLabels, matchSummary } from "./rules";
import { UI } from "./copy";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const SURFACE_COLORS = {
  hard: {
    court: "#2f6fb5",
    apron: "#1d5a86",
    surround: "#17456a",
    line: "#f2f6fb",
    haze: "#0d2c47",
  },
  clay: {
    court: "#c4643a",
    apron: "#a44f2c",
    surround: "#8c4526",
    line: "#f6efe6",
    haze: "#3c1d10",
  },
  grass: {
    court: "#3f8b45",
    apron: "#2f6f37",
    surround: "#275c2e",
    line: "#f4f8f2",
    haze: "#123018",
  },
};

const SURROUND = 9.5;   // apron beyond the baselines
const SIDE_RUNOFF = 5.5;
const STAND_HEIGHT = 7.5;

// ── Camera ──────────────────────────────────────────────────────────────────

function buildCamera(rt, vW, vH) {
  const human = rt.players?.[0] ?? { x: 0, z: -COURT_HALF_LENGTH };
  const aspect = vW / Math.max(1, vH);

  // A narrow (portrait phone) viewport needs the camera further back and higher,
  // or the far baseline falls off the top of the frame.
  const portrait = aspect < 1.15;
  const back = portrait ? 8.6 : 6.4;
  const height = portrait ? 4.4 : 3.2;
  const fovScale = portrait ? 0.66 : 0.86;

  const ball = rt.ball;
  const followX = ball ? human.x * 0.42 + ball.x * 0.10 : human.x * 0.42;

  return createCamera({
    pos: { x: followX, y: height, z: human.z - back },
    lookAt: { x: followX * 0.3, y: 0.95, z: 2.2 },
    fovScale,
  });
}

// ── Scene ───────────────────────────────────────────────────────────────────

function drawSky(ctx, vW, vH, colors) {
  const g = ctx.createLinearGradient(0, 0, 0, vH);
  g.addColorStop(0, "#050b14");
  g.addColorStop(0.55, colors.haze);
  g.addColorStop(1, colors.surround);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vW, vH);
}

function drawStands(ctx, cam, vW, vH) {
  const farZ = COURT_HALF_LENGTH + SURROUND;
  const sideX = COURT_HALF_WIDTH + SIDE_RUNOFF;

  const faces = [
    // Far end.
    [
      [-sideX, STAND_HEIGHT, farZ + 6],
      [sideX, STAND_HEIGHT, farZ + 6],
      [sideX, 0, farZ],
      [-sideX, 0, farZ],
    ],
    // Left flank.
    [
      [-sideX - 6, STAND_HEIGHT, farZ + 6],
      [-sideX - 6, STAND_HEIGHT, -farZ - 6],
      [-sideX, 0, -farZ],
      [-sideX, 0, farZ],
    ],
    // Right flank.
    [
      [sideX + 6, STAND_HEIGHT, farZ + 6],
      [sideX + 6, STAND_HEIGHT, -farZ - 6],
      [sideX, 0, -farZ],
      [sideX, 0, farZ],
    ],
  ];

  for (const face of faces) {
    fillPoly3D(ctx, cam, vW, vH, face, "#101c2c");
  }

  // Crowd: deterministic speckle so it does not shimmer between frames.
  let seed = 1337;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  ctx.save();
  for (let i = 0; i < 520; i += 1) {
    const bank = rand();
    let x;
    let z;
    if (bank < 0.42) {
      x = -sideX + rand() * sideX * 2;
      z = farZ + rand() * 6;
    } else if (bank < 0.71) {
      x = -sideX - rand() * 6;
      z = -farZ + rand() * (farZ * 2 + 6);
    } else {
      x = sideX + rand() * 6;
      z = -farZ + rand() * (farZ * 2 + 6);
    }
    const y = 0.9 + rand() * (STAND_HEIGHT - 1.2);
    const p = project(cam, x, y, z, vW, vH);
    if (!p) continue;
    const shade = 40 + Math.floor(rand() * 90);
    ctx.fillStyle = `rgb(${shade + 30},${shade + 18},${shade + 40})`;
    const r = Math.max(0.8, 26 / p.depth);
    ctx.fillRect(p.x - r / 2, p.y - r / 2, r, r * 1.3);
  }
  ctx.restore();

  // Floodlight rigs.
  for (const sx of [-1, 1]) {
    const p = project(cam, sx * (sideX + 3), STAND_HEIGHT + 3.2, farZ + 2, vW, vH);
    if (!p) continue;
    const r = Math.max(6, 160 / p.depth);
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, "rgba(255,248,220,0.85)");
    g.addColorStop(1, "rgba(255,248,220,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawAdvertising(ctx, cam, vW, vH, locale) {
  const farZ = COURT_HALF_LENGTH + SURROUND - 0.4;
  const sideX = COURT_HALF_WIDTH + SIDE_RUNOFF - 0.4;
  const creatives = getBoardCreatives(locale, 6);

  // Behind the far baseline — the wall you look at all match.
  drawBoardRun(ctx, cam, vW, vH, {
    from: [-sideX, farZ],
    to: [sideX, farZ],
    y0: 0,
    height: 1.05,
    creatives,
  });

  // Flanks, angled away from the camera.
  const flank = getBoardCreatives(locale, 4);
  drawBoardRun(ctx, cam, vW, vH, {
    from: [-sideX, farZ],
    to: [-sideX, -2],
    y0: 0,
    height: 1.05,
    creatives: flank,
  });
  drawBoardRun(ctx, cam, vW, vH, {
    from: [sideX, farZ],
    to: [sideX, -2],
    y0: 0,
    height: 1.05,
    creatives: [...flank].reverse(),
  });
}

function drawCourt(ctx, cam, vW, vH, colors) {
  const outerZ = COURT_HALF_LENGTH + SURROUND;
  const outerX = COURT_HALF_WIDTH + SIDE_RUNOFF;

  fillPoly3D(
    ctx,
    cam,
    vW,
    vH,
    [
      [-outerX, 0, outerZ],
      [outerX, 0, outerZ],
      [outerX, 0, -outerZ],
      [-outerX, 0, -outerZ],
    ],
    colors.surround
  );

  const apronZ = COURT_HALF_LENGTH + 5.5;
  const apronX = COURT_HALF_WIDTH + 3.2;
  fillPoly3D(
    ctx,
    cam,
    vW,
    vH,
    [
      [-apronX, 0, apronZ],
      [apronX, 0, apronZ],
      [apronX, 0, -apronZ],
      [-apronX, 0, -apronZ],
    ],
    colors.apron
  );

  fillPoly3D(
    ctx,
    cam,
    vW,
    vH,
    [
      [-COURT_HALF_WIDTH, 0, COURT_HALF_LENGTH],
      [COURT_HALF_WIDTH, 0, COURT_HALF_LENGTH],
      [COURT_HALF_WIDTH, 0, -COURT_HALF_LENGTH],
      [-COURT_HALF_WIDTH, 0, -COURT_HALF_LENGTH],
    ],
    colors.court
  );

  // Lines.
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const y = 0.005;
  const W = COURT_HALF_WIDTH;
  const L = COURT_HALF_LENGTH;
  const S = SERVICE_LINE_Z;

  line3D(ctx, cam, vW, vH, [-W, y, -L], [W, y, -L]);   // near baseline
  line3D(ctx, cam, vW, vH, [-W, y, L], [W, y, L]);     // far baseline
  line3D(ctx, cam, vW, vH, [-W, y, -L], [-W, y, L]);   // left sideline
  line3D(ctx, cam, vW, vH, [W, y, -L], [W, y, L]);     // right sideline
  line3D(ctx, cam, vW, vH, [-W, y, -S], [W, y, -S]);   // near service line
  line3D(ctx, cam, vW, vH, [-W, y, S], [W, y, S]);     // far service line
  line3D(ctx, cam, vW, vH, [0, y, -S], [0, y, S]);     // centre service line
  line3D(ctx, cam, vW, vH, [0, y, -L], [0, y, -L + 0.3]);
  line3D(ctx, cam, vW, vH, [0, y, L], [0, y, L - 0.3]);
  ctx.stroke();
}

function drawNet(ctx, cam, vW, vH) {
  // Mesh.
  ctx.strokeStyle = "rgba(230,238,246,0.30)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  const COLS = 26;
  for (let i = 0; i <= COLS; i += 1) {
    const x = -NET_POST_X + (2 * NET_POST_X * i) / COLS;
    line3D(ctx, cam, vW, vH, [x, 0, 0], [x, netHeightAt(x), 0]);
  }
  const ROWS = 9;
  for (let j = 0; j <= ROWS; j += 1) {
    const t = j / ROWS;
    const segments = 24;
    for (let i = 0; i < segments; i += 1) {
      const x0 = -NET_POST_X + (2 * NET_POST_X * i) / segments;
      const x1 = -NET_POST_X + (2 * NET_POST_X * (i + 1)) / segments;
      line3D(
        ctx,
        cam,
        vW,
        vH,
        [x0, netHeightAt(x0) * t, 0],
        [x1, netHeightAt(x1) * t, 0]
      );
    }
  }
  ctx.stroke();

  // White tape along the top.
  ctx.strokeStyle = "#f2f6fb";
  ctx.lineWidth = 3;
  ctx.beginPath();
  const segments = 26;
  for (let i = 0; i < segments; i += 1) {
    const x0 = -NET_POST_X + (2 * NET_POST_X * i) / segments;
    const x1 = -NET_POST_X + (2 * NET_POST_X * (i + 1)) / segments;
    line3D(ctx, cam, vW, vH, [x0, netHeightAt(x0), 0], [x1, netHeightAt(x1), 0]);
  }
  ctx.stroke();

  // Posts.
  ctx.strokeStyle = "#c9d4e0";
  ctx.lineWidth = 4;
  ctx.beginPath();
  line3D(ctx, cam, vW, vH, [-NET_POST_X, 0, 0], [-NET_POST_X, NET_POST_HEIGHT, 0]);
  line3D(ctx, cam, vW, vH, [NET_POST_X, 0, 0], [NET_POST_X, NET_POST_HEIGHT, 0]);
  ctx.stroke();

  // Centre strap.
  ctx.strokeStyle = "#e8eef5";
  ctx.lineWidth = 2;
  ctx.beginPath();
  line3D(ctx, cam, vW, vH, [0, 0, 0], [0, NET_CENTER_HEIGHT, 0]);
  ctx.stroke();
}

function drawShadow(ctx, cam, vW, vH, x, z, radius, alpha) {
  const p = project(cam, x, 0.004, z, vW, vH);
  if (!p) return;
  const rx = Math.max(2, (radius * vH * cam.fovScale) / p.depth);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, rx, rx * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer(ctx, cam, vW, vH, player, color, swinging) {
  const { x, z } = player;
  drawShadow(ctx, cam, vW, vH, x, z, 0.45, 0.32);

  const head = project(cam, x, 1.80, z, vW, vH);
  const neck = project(cam, x, 1.60, z, vW, vH);
  const hip = project(cam, x, 0.95, z, vW, vH);
  const footL = project(cam, x - 0.22, 0, z, vW, vH);
  const footR = project(cam, x + 0.22, 0, z, vW, vH);
  if (!head || !neck || !hip || !footL || !footR) return;

  const scale = (vH * cam.fovScale) / Math.max(0.5, head.depth);

  // Legs and torso.
  ctx.strokeStyle = color.kit;
  ctx.lineWidth = Math.max(2, scale * 0.10);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(hip.x, hip.y);
  ctx.lineTo(footL.x, footL.y);
  ctx.moveTo(hip.x, hip.y);
  ctx.lineTo(footR.x, footR.y);
  ctx.stroke();

  ctx.strokeStyle = color.shirt;
  ctx.lineWidth = Math.max(3, scale * 0.16);
  ctx.beginPath();
  ctx.moveTo(hip.x, hip.y);
  ctx.lineTo(neck.x, neck.y);
  ctx.stroke();

  // Racket arm: swings out when striking.
  const reach = swinging ? 0.95 : 0.62;
  const armY = swinging ? 1.35 : 1.15;
  const armX = x + (player.side < 0 ? reach : -reach) * (player.racketSide ?? 1);
  const hand = project(cam, armX, armY, z + (player.side < 0 ? 0.25 : -0.25), vW, vH);
  if (hand) {
    ctx.strokeStyle = color.shirt;
    ctx.lineWidth = Math.max(2, scale * 0.08);
    ctx.beginPath();
    ctx.moveTo(neck.x, neck.y);
    ctx.lineTo(hand.x, hand.y);
    ctx.stroke();

    // Racket head.
    ctx.strokeStyle = color.racket;
    ctx.lineWidth = Math.max(1.5, scale * 0.05);
    ctx.beginPath();
    ctx.ellipse(hand.x, hand.y, scale * 0.13, scale * 0.18, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Head.
  ctx.fillStyle = color.skin;
  ctx.beginPath();
  ctx.arc(head.x, head.y, Math.max(2, scale * 0.10), 0, Math.PI * 2);
  ctx.fill();
}

function drawBall(ctx, cam, vW, vH, ball, trail) {
  if (!ball) return;

  drawShadow(ctx, cam, vW, vH, ball.x, ball.z, 0.11 + ball.y * 0.02, clamp(0.42 - ball.y * 0.05, 0.08, 0.42));

  if (trail?.length) {
    ctx.strokeStyle = "rgba(226,240,120,0.28)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (const t of trail) {
      const p = project(cam, t.x, t.y, t.z, vW, vH);
      if (!p) continue;
      if (started) ctx.lineTo(p.x, p.y);
      else {
        ctx.moveTo(p.x, p.y);
        started = true;
      }
    }
    ctx.stroke();
  }

  const p = project(cam, ball.x, ball.y, ball.z, vW, vH);
  if (!p) return;
  const r = Math.max(2, (BALL_RADIUS * vH * cam.fovScale) / p.depth);

  const g = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, r * 0.1, p.x, p.y, r);
  g.addColorStop(0, "#f4ff9a");
  g.addColorStop(1, "#c8d838");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = Math.max(0.6, r * 0.14);
  ctx.beginPath();
  ctx.arc(p.x, p.y, r * 0.72, 0.6, 2.3);
  ctx.stroke();
}

// A small on-court reticle showing where the current aim would send the ball.
// It is the whole reason the D-pad aiming model is legible on a phone.
function drawAimMarker(ctx, cam, vW, vH, rt) {
  if (!rt.swing || rt.point?.phase !== "rally") return;
  const aimX = rt.lateralInput() * COURT_HALF_WIDTH * 0.86;
  const depth = clamp(0.62 + 0.30 * rt.depthInput(), 0.22, 0.94);
  const aimZ = COURT_HALF_LENGTH * depth;

  const p = project(cam, aimX, 0.01, aimZ, vW, vH);
  if (!p) return;
  const r = Math.max(6, (0.6 * vH * cam.fovScale) / p.depth);
  ctx.strokeStyle = "rgba(255,236,120,0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, r, r * 0.42, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(p.x - r * 0.5, p.y);
  ctx.lineTo(p.x + r * 0.5, p.y);
  ctx.stroke();
}

// ── HUD ─────────────────────────────────────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHud(ctx, rt, vW, vH) {
  const ui = UI[rt.locale] ?? UI.en;
  const m = rt.match;
  if (!m) return;

  const compact = vW < 620;
  const w = compact ? 210 : 268;
  const h = 74;
  const x = 12;
  const y = 12;

  ctx.fillStyle = "rgba(8,16,26,0.80)";
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  const names = [
    rt.locale === "es" ? "TÚ" : "YOU",
    (rt.opponentInfo?.name ?? "CPU").toUpperCase(),
  ];
  const points = scoreLabels(m);

  const rowH = 26;
  for (let i = 0; i < 2; i += 1) {
    const ry = y + 12 + i * rowH;
    const serving = m.server === i;

    if (serving) {
      ctx.fillStyle = "#e8d24a";
      ctx.beginPath();
      ctx.arc(x + 14, ry + 8, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = i === 0 ? "#7fd4ff" : "#ff9d7f";
    ctx.font = `bold ${compact ? 11 : 12}px Arial, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(names[i].slice(0, compact ? 9 : 14), x + 24, ry + 8);

    // Sets already banked, then the current game count, then the point score.
    ctx.fillStyle = "#cfe0ee";
    ctx.font = `${compact ? 11 : 12}px Arial, sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText(String(m.sets[i]), x + w - 84, ry + 8);
    ctx.fillText(String(m.games[i]), x + w - 54, ry + 8);

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${compact ? 13 : 15}px Arial, sans-serif`;
    ctx.fillText(points[i], x + w - 14, ry + 8);
  }

  // Column captions.
  ctx.fillStyle = "rgba(190,208,224,0.55)";
  ctx.font = "9px Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(ui.setsShort, x + w - 84, y + h - 8);
  ctx.fillText(ui.gamesShort, x + w - 54, y + h - 8);
  ctx.fillText(ui.pointsShort, x + w - 14, y + h - 8);

  // Surface + difficulty tag.
  const tierLabel = TIER_LABELS[rt.locale]?.[rt.ai?.tier?.id] ?? "";
  const surfaceLabel = SURFACE_NAMES[rt.locale]?.[rt.surfaceId] ?? rt.surfaceId;
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(220,232,244,0.8)";
  ctx.font = "11px Arial, sans-serif";
  ctx.fillText(`${surfaceLabel} · ${tierLabel}`, vW - 14, 22);

  if (rt.opponentInfo?.style) {
    const style = STYLES[rt.opponentInfo.style];
    if (style) {
      ctx.fillStyle = "rgba(190,208,224,0.6)";
      ctx.font = "10px Arial, sans-serif";
      ctx.fillText(style[rt.locale] ?? style.en, vW - 14, 38);
    }
  }

  // Serve prompt.
  if (rt.point?.phase === "serve" && rt.point.server === 0 && !rt.point.over) {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "bold 13px Arial, sans-serif";
    ctx.fillText(
      rt.point.firstServe ? ui.serveHint : ui.secondServeHint,
      vW / 2,
      vH - 28
    );
  }

  // Charge meter.
  if (rt.swing) {
    const cw = 140;
    const cx = vW / 2 - cw / 2;
    const cy = vH - 54;
    ctx.fillStyle = "rgba(8,16,26,0.7)";
    roundRect(ctx, cx, cy, cw, 10, 5);
    ctx.fill();
    const t = clamp(rt.swing.charge / 0.62, 0, 1);
    ctx.fillStyle = t > 0.85 ? "#ff6b4a" : t > 0.5 ? "#f0c14b" : "#5ad07a";
    roundRect(ctx, cx, cy, cw * t, 10, 5);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "10px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText((ui.strokes[rt.swing.kind] ?? rt.swing.kind).toUpperCase(), vW / 2, cy - 6);
  }

  // Event banner.
  if (rt.banner) {
    const text = ui.events[rt.banner] ?? "";
    if (text) {
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(8,16,26,0.82)";
      const tw = ctx.measureText(text).width + 40;
      roundRect(ctx, vW / 2 - tw / 2, vH / 2 - 26, tw, 40, 8);
      ctx.fill();
      ctx.fillStyle = "#ffe9a8";
      ctx.font = "bold 18px Arial, sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillText(text, vW / 2, vH / 2 - 6);
    }
  }

  if (rt.paused) {
    ctx.fillStyle = "rgba(4,8,14,0.65)";
    ctx.fillRect(0, 0, vW, vH);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ui.paused, vW / 2, vH / 2);
  }
}

// ── Screens ─────────────────────────────────────────────────────────────────

function panel(ctx, vW, vH) {
  const g = ctx.createLinearGradient(0, 0, 0, vH);
  g.addColorStop(0, "#0a1524");
  g.addColorStop(1, "#122840");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vW, vH);
}

function drawMenu(ctx, rt, vW, vH) {
  const ui = UI[rt.locale] ?? UI.en;
  panel(ctx, vW, vH);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#e8f2fb";
  ctx.font = `bold ${Math.min(34, vW / 16)}px Arial, sans-serif`;
  ctx.fillText(ui.title, vW / 2, vH * 0.26);

  ctx.fillStyle = "rgba(190,214,236,0.75)";
  ctx.font = "13px Arial, sans-serif";
  ctx.fillText(ui.menuSubtitle, vW / 2, vH * 0.36);

  const opts = [ui.menuExhibition, ui.menuTournament];
  opts.forEach((label, i) => {
    const y = vH * 0.52 + i * 46;
    const w = Math.min(320, vW * 0.7);
    ctx.fillStyle = "rgba(46,110,180,0.35)";
    roundRect(ctx, vW / 2 - w / 2, y - 17, w, 34, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(140,200,255,0.4)";
    ctx.stroke();
    ctx.fillStyle = "#dff0ff";
    ctx.font = "bold 14px Arial, sans-serif";
    ctx.fillText(`${i + 1}. ${label}`, vW / 2, y);
  });

  ctx.fillStyle = "rgba(170,196,220,0.6)";
  ctx.font = "11px Arial, sans-serif";
  ctx.fillText(ui.menuHint, vW / 2, vH - 24);
}

function drawSetup(ctx, rt, vW, vH) {
  const ui = UI[rt.locale] ?? UI.en;
  panel(ctx, vW, vH);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#e8f2fb";
  ctx.font = "bold 22px Arial, sans-serif";
  ctx.fillText(
    rt.screen === "setup-tournament" ? ui.menuTournament : ui.menuExhibition,
    vW / 2,
    vH * 0.18
  );

  const rows = [
    {
      label: ui.surface,
      value: SURFACE_NAMES[rt.locale]?.[rt.config.surface] ?? rt.config.surface,
      hint: "← →",
    },
    {
      label: ui.difficulty,
      value: TIER_LABELS[rt.locale]?.[rt.config.tier] ?? rt.config.tier,
      hint: "↑ ↓",
    },
    {
      label: ui.sets,
      value: rt.config.setsToWin === 2 ? ui.bestOf3 : ui.bestOf5,
      hint: "S",
    },
  ];

  rows.forEach((row, i) => {
    const y = vH * 0.36 + i * 52;
    const w = Math.min(380, vW * 0.82);
    const x = vW / 2 - w / 2;
    ctx.fillStyle = "rgba(20,44,72,0.72)";
    roundRect(ctx, x, y - 20, w, 40, 8);
    ctx.fill();

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(180,206,230,0.85)";
    ctx.font = "12px Arial, sans-serif";
    ctx.fillText(row.label, x + 14, y);

    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Arial, sans-serif";
    ctx.fillText(row.value, x + w - 44, y);

    ctx.fillStyle = "rgba(150,180,210,0.5)";
    ctx.font = "10px Arial, sans-serif";
    ctx.fillText(row.hint, x + w - 12, y);
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "#dff0ff";
  ctx.font = "bold 14px Arial, sans-serif";
  ctx.fillText(ui.startHint, vW / 2, vH - 42);

  ctx.fillStyle = "rgba(170,196,220,0.6)";
  ctx.font = "11px Arial, sans-serif";
  ctx.fillText(ui.controlsHint, vW / 2, vH - 20);
}

function drawBracket(ctx, rt, vW, vH) {
  const ui = UI[rt.locale] ?? UI.en;
  const t = rt.tournament;
  panel(ctx, vW, vH);
  if (!t) return;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#e8f2fb";
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText(
    `${SURFACE_NAMES[rt.locale]?.[t.surface] ?? t.surface} · ${ROUND_NAMES[rt.locale][ROUND_KEYS[t.round]]}`,
    vW / 2,
    26
  );

  // Columns, one per round, with the human's path highlighted.
  const cols = ROUND_KEYS.length;
  const colW = vW / cols;
  const top = 54;
  const usable = vH - top - 60;

  for (let r = 0; r < cols; r += 1) {
    const matches = t.bracket[r];
    const cx = colW * r + colW / 2;

    ctx.fillStyle = "rgba(160,190,220,0.55)";
    ctx.font = "10px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(ROUND_NAMES[rt.locale][ROUND_KEYS[r]], cx, top - 8);

    const slotH = usable / matches.length;
    for (let i = 0; i < matches.length; i += 1) {
      const m = matches[i];
      const y = top + slotH * i + slotH / 2;
      const boxW = colW * 0.86;
      const boxH = Math.min(30, slotH * 0.8);
      const human = m.a?.human || m.b?.human;

      ctx.fillStyle = human ? "rgba(58,120,190,0.55)" : "rgba(18,38,60,0.7)";
      roundRect(ctx, cx - boxW / 2, y - boxH / 2, boxW, boxH, 4);
      ctx.fill();
      if (human) {
        ctx.strokeStyle = "rgba(140,200,255,0.7)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const nameFor = (p) => (p ? (p.human ? (rt.locale === "es" ? "Tú" : "You") : p.name) : "—");
      const fontSize = boxH > 22 ? 9 : 7;
      ctx.font = `${fontSize}px Arial, sans-serif`;
      ctx.textAlign = "center";

      const rows = [nameFor(m.a), nameFor(m.b)];
      rows.forEach((name, k) => {
        const won = m.winner && ((k === 0 && m.winner === m.a) || (k === 1 && m.winner === m.b));
        ctx.fillStyle = won ? "#8ff0b0" : m.winner ? "rgba(180,200,220,0.42)" : "#d6e6f4";
        ctx.fillText(
          name.length > 14 ? `${name.slice(0, 13)}…` : name,
          cx,
          y - boxH / 4 + (k * boxH) / 2
        );
      });
    }
  }

  const rival = t.bracket[t.round]?.find((m) => m.a?.human || m.b?.human);
  const opponent = rival ? (rival.a?.human ? rival.b : rival.a) : null;

  ctx.textAlign = "center";
  if (t.status === "playing" && opponent) {
    ctx.fillStyle = "#dff0ff";
    ctx.font = "bold 14px Arial, sans-serif";
    ctx.fillText(`${ui.nextMatch}: ${opponent.name} (${opponent.country})`, vW / 2, vH - 34);
    ctx.fillStyle = "rgba(170,196,220,0.65)";
    ctx.font = "11px Arial, sans-serif";
    ctx.fillText(ui.playHint, vW / 2, vH - 16);
  }
}

function drawMatchOver(ctx, rt, vW, vH) {
  const ui = UI[rt.locale] ?? UI.en;
  panel(ctx, vW, vH);
  const won = rt.match?.winner === 0;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = won ? "#8ff0b0" : "#ff9d8a";
  ctx.font = "bold 28px Arial, sans-serif";
  ctx.fillText(won ? ui.youWon : ui.youLost, vW / 2, vH * 0.34);

  ctx.fillStyle = "#dde9f4";
  ctx.font = "16px Arial, sans-serif";
  ctx.fillText(rt.match ? matchSummary(rt.match).join("  ") : "", vW / 2, vH * 0.47);

  ctx.fillStyle = "rgba(180,206,230,0.75)";
  ctx.font = "12px Arial, sans-serif";
  ctx.fillText(`vs ${rt.opponentInfo?.name ?? "CPU"}`, vW / 2, vH * 0.56);

  ctx.fillStyle = "#dff0ff";
  ctx.font = "bold 13px Arial, sans-serif";
  ctx.fillText(ui.continueHint, vW / 2, vH - 30);
}

function drawTournamentOver(ctx, rt, vW, vH) {
  const ui = UI[rt.locale] ?? UI.en;
  panel(ctx, vW, vH);
  const t = rt.tournament;
  const champ = t ? champion(t) : null;
  const won = t?.status === "champion";

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = won ? "#ffd76a" : "#c9d8e6";
  ctx.font = "bold 26px Arial, sans-serif";
  ctx.fillText(won ? ui.champion : ui.eliminated, vW / 2, vH * 0.36);

  if (!won && champ) {
    ctx.fillStyle = "rgba(200,220,238,0.8)";
    ctx.font = "14px Arial, sans-serif";
    ctx.fillText(`${ui.winnerWas}: ${champ.name}`, vW / 2, vH * 0.5);
  }

  ctx.fillStyle = "#dff0ff";
  ctx.font = "bold 13px Arial, sans-serif";
  ctx.fillText(ui.menuReturnHint, vW / 2, vH - 30);
}

// ── Entry point ─────────────────────────────────────────────────────────────

export function drawScene(ctx, rt, vW, vH) {
  ctx.clearRect(0, 0, vW, vH);

  switch (rt.screen) {
    case "menu":
      drawMenu(ctx, rt, vW, vH);
      return;
    case "setup-exhibition":
    case "setup-tournament":
      drawSetup(ctx, rt, vW, vH);
      return;
    case "bracket":
      drawBracket(ctx, rt, vW, vH);
      return;
    case "match-over":
      drawMatchOver(ctx, rt, vW, vH);
      return;
    case "tournament-over":
      drawTournamentOver(ctx, rt, vW, vH);
      return;
    default:
      break;
  }

  if (!rt.players) return;

  const colors = SURFACE_COLORS[rt.surfaceId] ?? SURFACE_COLORS.hard;
  const cam = buildCamera(rt, vW, vH);

  drawSky(ctx, vW, vH, colors);
  drawStands(ctx, cam, vW, vH);
  drawAdvertising(ctx, cam, vW, vH, rt.locale);
  drawCourt(ctx, cam, vW, vH, colors);

  // The far player is behind the net from our camera, so draw them first.
  drawPlayer(ctx, cam, vW, vH, rt.players[1], {
    kit: "#2a3446",
    shirt: "#e0724f",
    skin: "#e8c39a",
    racket: "#f0e6d2",
  }, rt.point?.lastHitter === 1 && rt.rallyCount > 0);

  drawNet(ctx, cam, vW, vH);
  drawAimMarker(ctx, cam, vW, vH, rt);
  drawBall(ctx, cam, vW, vH, rt.ball, rt.trail);

  drawPlayer(ctx, cam, vW, vH, rt.players[0], {
    kit: "#2a3446",
    shirt: "#4aa3e0",
    skin: "#e8c39a",
    racket: "#f0e6d2",
  }, Boolean(rt.swing || rt.pendingSwing));

  drawHud(ctx, rt, vW, vH);
}
