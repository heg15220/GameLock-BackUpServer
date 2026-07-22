// Canvas renderer for Saltos Selváticos.
//
// Modelled on the original's presentation: a bright, sunny side-on jungle under
// a blue sky, with the camera locked to the jumper so the trees stream past
// during the flight. Depth comes from four parallax bands of trees that fade
// into a pale haze the further back they sit, exactly the way the reference
// shots read. Everything is procedural — no assets to load.
//
// Only the player is drawn in the world (the rivals live in the HUD, as in the
// original); their landed marks are planted as slim flags so you can see what
// you have to beat.
//
// The renderer is a pure function of the runtime state: it reads, never mutates.

import { PIVOT_H, PLATFORM_ANGLE, PLATFORM_H, PLATFORM_X, flightPoint, gripAt } from "./runtime.js";

const VIEW_H_M = 112; // metres of world height across the canvas
const GROUND_FRAC = 0.86; // where the jungle floor sits
const TREE_ANCHOR = 0.3; // the launch tree's resting place, as a fraction of width
const FLYER_ANCHOR = 0.34; // where the camera holds the jumper in flight

// Four depth bands. `p` is the parallax factor, `haze` how much pale sky is
// mixed over them, and the palette cools and lightens with distance.
const BANDS = [
  { p: 0.28, haze: 0.72, scale: 0.42, spacing: 26, y: 0.055, canopy: "#8fbd7e", trunk: "#a08a6e" },
  { p: 0.46, haze: 0.5, scale: 0.6, spacing: 33, y: 0.035, canopy: "#74ad5c", trunk: "#8a7050" },
  { p: 0.68, haze: 0.28, scale: 0.82, spacing: 44, y: 0.016, canopy: "#569b43", trunk: "#75593a" },
  { p: 0.9, haze: 0.1, scale: 1.05, spacing: 62, y: 0, canopy: "#3f8733", trunk: "#5f4529" },
];

// ── helpers ──────────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(r)}, ${c(g)}, ${c(b)})`;
}
/** Mix a colour toward the pale horizon, which is what sells the depth. */
function haze(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  const [hr, hg, hb] = [222, 240, 224];
  const m = (a, b2) => Math.round(a + (b2 - a) * amount);
  return `rgb(${m(r, hr)}, ${m(g, hg)}, ${m(b, hb)})`;
}
// Deterministic 0–1 hash so the forest stays put instead of shimmering as the
// camera scrolls past it.
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// ── trees ────────────────────────────────────────────────────────────────────
/** Broadleaf jungle tree: slim leaning trunk under stacked canopy pillows. */
function broadleaf(ctx, x, baseY, h, canopy, trunk, seed) {
  const lean = (hash(seed) - 0.5) * h * 0.12;
  const w = h * 0.055;
  ctx.fillStyle = trunk;
  ctx.beginPath();
  ctx.moveTo(x - w, baseY);
  ctx.quadraticCurveTo(x - w * 0.55 + lean * 0.5, baseY - h * 0.4, x + lean - w * 0.45, baseY - h * 0.72);
  ctx.lineTo(x + lean + w * 0.45, baseY - h * 0.72);
  ctx.quadraticCurveTo(x + w * 0.55 + lean * 0.5, baseY - h * 0.4, x + w, baseY);
  ctx.closePath();
  ctx.fill();

  const cx = x + lean;
  const cy = baseY - h * 0.78;
  const r = h * 0.3;
  const dark = shade(canopy, 0.82);
  const light = shade(canopy, 1.14);
  const blobs = [
    [0, 0, 1],
    [-0.72, 0.22, 0.74],
    [0.74, 0.18, 0.78],
    [-0.3, -0.42, 0.66],
    [0.36, -0.46, 0.7],
  ];
  blobs.forEach(([bx, by, br], i) => {
    ctx.fillStyle = i % 2 ? dark : canopy;
    ctx.beginPath();
    ctx.ellipse(cx + bx * r, cy + by * r, r * br, r * br * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // Sun catching the top-left of the crown.
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.28, cy - r * 0.42, r * 0.52, r * 0.34, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

/** Fan palm: a curved bare trunk with fronds spraying from the crown. */
function palm(ctx, x, baseY, h, canopy, trunk, seed) {
  const bend = (hash(seed) - 0.5) * h * 0.3;
  const topX = x + bend;
  const topY = baseY - h * 0.82;
  ctx.strokeStyle = trunk;
  ctx.lineWidth = Math.max(1.4, h * 0.045);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + bend * 0.2, baseY - h * 0.45, topX, topY);
  ctx.stroke();

  const n = 7;
  const len = h * 0.3;
  for (let i = 0; i < n; i += 1) {
    const a = Math.PI + (i / (n - 1)) * Math.PI + (hash(seed + i) - 0.5) * 0.2;
    ctx.fillStyle = i % 2 ? shade(canopy, 0.85) : canopy;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * len * 0.6,
      topY + Math.sin(a) * len * 0.6 - len * 0.22,
      topX + Math.cos(a) * len,
      topY + Math.sin(a) * len + len * 0.16,
    );
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * len * 0.55,
      topY + Math.sin(a) * len * 0.55 + len * 0.16,
      topX,
      topY,
    );
    ctx.fill();
  }
}

/** Low bush clump used along the treeline and scattered over the grass. */
function bush(ctx, x, baseY, r, color, seed) {
  const dark = shade(color, 0.84);
  for (let i = 0; i < 5; i += 1) {
    const a = Math.PI + (i / 4) * Math.PI;
    ctx.fillStyle = i % 2 ? dark : color;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * r * 0.7, baseY + Math.sin(a) * r * 0.28, r * 0.62, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── the faceless jungle explorer ─────────────────────────────────────────────
// `mode` is "hang" (arms overhead on the vine), "fly" (tumbling) or "stand".
function drawExplorer(ctx, x, y, h, color, opts) {
  const { mode, lean = 0, spin = 0, swing = 0 } = opts;
  const dark = shade(color, 0.68);
  const light = shade(color, 1.25);
  const skin = "#f4c89a";

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(mode === "fly" ? spin : lean);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const headR = h * 0.18;
  const shoulderY = mode === "hang" ? h * 0.44 : h * 0.3;
  const hipY = shoulderY + h * 0.3;

  ctx.strokeStyle = skin;
  ctx.lineWidth = h * 0.085;
  ctx.beginPath();
  if (mode === "hang") {
    ctx.moveTo(-h * 0.05, shoulderY);
    ctx.lineTo(0, h * 0.02);
    ctx.moveTo(h * 0.05, shoulderY);
    ctx.lineTo(0, h * 0.02);
  } else if (mode === "fly") {
    ctx.moveTo(-h * 0.06, shoulderY);
    ctx.lineTo(-h * 0.32, shoulderY - h * 0.18);
    ctx.moveTo(h * 0.06, shoulderY);
    ctx.lineTo(h * 0.32, shoulderY - h * 0.08);
  } else {
    ctx.moveTo(-h * 0.06, shoulderY);
    ctx.lineTo(-h * 0.16, shoulderY + h * 0.26);
    ctx.moveTo(h * 0.06, shoulderY);
    ctx.lineTo(h * 0.16, shoulderY + h * 0.26);
  }
  ctx.stroke();

  const kick = mode === "hang" ? swing * 0.5 : mode === "fly" ? 0.8 : 0;
  ctx.strokeStyle = dark;
  ctx.lineWidth = h * 0.11;
  const leg = (dir) => {
    const kneeX = dir * h * 0.1 + kick * h * 0.18;
    const kneeY = hipY + h * 0.2;
    ctx.beginPath();
    ctx.moveTo(dir * h * 0.05, hipY);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(kneeX + kick * h * 0.2, kneeY + h * 0.17);
    ctx.stroke();
  };
  leg(-1);
  leg(1);

  const bodyW = h * 0.25;
  const grad = ctx.createLinearGradient(-bodyW, 0, bodyW, 0);
  grad.addColorStop(0, dark);
  grad.addColorStop(0.5, color);
  grad.addColorStop(1, light);
  ctx.fillStyle = grad;
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1, h * 0.02);
  ctx.beginPath();
  ctx.moveTo(-bodyW / 2, hipY);
  ctx.lineTo(-bodyW / 2, shoulderY);
  ctx.arc(0, shoulderY, bodyW / 2, Math.PI, 0);
  ctx.lineTo(bodyW / 2, hipY);
  ctx.arc(0, hipY, bodyW / 2, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const headCY = shoulderY - headR * 0.95;
  ctx.fillStyle = skin;
  ctx.strokeStyle = shade(skin, 0.75);
  ctx.beginPath();
  ctx.arc(0, headCY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#3f7f2c";
  roundRect(ctx, -headR, headCY - headR * 0.52, headR * 2, headR * 0.44, headR * 0.2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.32)";
  ctx.beginPath();
  ctx.arc(-headR * 0.3, headCY + headR * 0.12, headR * 0.34, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ── camera ───────────────────────────────────────────────────────────────────
/**
 * Where the world's x = 0 (the launch tree) sits on screen, in metres of world
 * offset. The camera frames the tree while you swing, then tracks the jumper
 * forward and never scrolls back — the same one-way pan the original uses.
 */
function cameraLeftM(rt, W, pxPerM) {
  const viewW = W / pxPerM;
  const resting = -TREE_ANCHOR * viewW;
  const you = rt.jumpers[0];
  if (!you.released) return resting;
  const p = flightPoint(you.jump, you.flightMs);
  return Math.max(resting, p.x - FLYER_ANCHOR * viewW);
}

// ── scenery ──────────────────────────────────────────────────────────────────
function drawSky(ctx, rt, W, H, groundY) {
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, "#57b6ea");
  sky.addColorStop(0.42, "#8ed2f0");
  sky.addColorStop(0.78, "#c9ebf3");
  sky.addColorStop(1, "#e6f4dd");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, groundY + 2);

  // Sun glow in the upper right, the light everything else is lit by.
  const sun = ctx.createRadialGradient(W * 0.82, H * 0.08, 0, W * 0.82, H * 0.08, H * 0.5);
  sun.addColorStop(0, "rgba(255,250,210,0.55)");
  sun.addColorStop(1, "rgba(255,250,210,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, groundY);
}

function drawClouds(ctx, camLeft, W, H, pxPerM) {
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  const spacing = 58;
  const first = Math.floor((camLeft * 0.12 - spacing) / spacing);
  const last = Math.ceil((camLeft * 0.12 + W / pxPerM + spacing) / spacing);
  for (let k = first; k <= last; k += 1) {
    const wx = k * spacing + hash(k * 3) * 26;
    const sx = (wx - camLeft * 0.12) * pxPerM;
    if (sx < -W * 0.3 || sx > W * 1.3) continue;
    const cy = H * (0.06 + hash(k) * 0.16);
    const r = H * (0.035 + hash(k * 7) * 0.03);
    ctx.beginPath();
    ctx.ellipse(sx, cy, r * 1.7, r * 0.8, 0, 0, Math.PI * 2);
    ctx.ellipse(sx - r * 1.1, cy + r * 0.24, r * 1.05, r * 0.62, 0, 0, Math.PI * 2);
    ctx.ellipse(sx + r * 1.2, cy + r * 0.2, r * 1.15, r * 0.66, 0, 0, Math.PI * 2);
    ctx.ellipse(sx + r * 0.2, cy - r * 0.55, r * 1.0, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBand(ctx, band, camLeft, W, H, pxPerM, groundY) {
  const shift = camLeft * band.p;
  const baseY = groundY + H * band.y;
  const canopy = haze(band.canopy, band.haze);
  const trunk = haze(band.trunk, band.haze);
  const first = Math.floor((shift - band.spacing) / band.spacing);
  const last = Math.ceil((shift + W / pxPerM + band.spacing) / band.spacing);
  for (let k = first; k <= last; k += 1) {
    const wx = k * band.spacing + hash(k * 5 + band.spacing) * band.spacing * 0.7;
    const sx = (wx - shift) * pxPerM;
    if (sx < -W * 0.25 || sx > W * 1.25) continue;
    const r = hash(k * 11 + band.spacing);
    const h = H * band.scale * (0.42 + r * 0.26);
    if (r > 0.7) palm(ctx, sx, baseY, h, canopy, trunk, k + band.spacing);
    else broadleaf(ctx, sx, baseY, h, canopy, trunk, k + band.spacing);
  }
  // Bushes tucked against the band's feet so the trunks never float.
  for (let k = first * 2; k <= last * 2; k += 1) {
    const wx = (k * band.spacing) / 2 + hash(k * 17) * band.spacing * 0.4;
    const sx = (wx - shift) * pxPerM;
    if (sx < -60 || sx > W + 60) continue;
    bush(ctx, sx, baseY, H * band.scale * (0.045 + hash(k * 23) * 0.03), haze(shade(band.canopy, 0.9), band.haze * 0.8), k);
  }
}

function drawGround(ctx, rt, camLeft, W, H, pxPerM, groundY) {
  const grass = ctx.createLinearGradient(0, groundY - 4, 0, H);
  grass.addColorStop(0, "#a8cc55");
  grass.addColorStop(0.35, "#8fba43");
  grass.addColorStop(1, "#63913a");
  ctx.fillStyle = grass;
  ctx.fillRect(0, groundY - 2, W, H - groundY + 2);

  // Soft light band across the clearing, plus tufts pinned to world positions
  // so the ground visibly streams past during the flight.
  const glow = ctx.createLinearGradient(0, groundY, 0, groundY + (H - groundY) * 0.5);
  glow.addColorStop(0, "rgba(255,255,220,0.35)");
  glow.addColorStop(1, "rgba(255,255,220,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, groundY, W, (H - groundY) * 0.5);

  const spacing = 7;
  const first = Math.floor((camLeft - spacing) / spacing);
  const last = Math.ceil((camLeft + W / pxPerM + spacing) / spacing);
  for (let k = first; k <= last; k += 1) {
    const wx = k * spacing + hash(k * 13) * spacing;
    const sx = (wx - camLeft) * pxPerM;
    if (sx < -20 || sx > W + 20) continue;
    const gy = groundY + (H - groundY) * (0.12 + hash(k * 19) * 0.7);
    const s = 3 + hash(k * 29) * 5;
    ctx.strokeStyle = hash(k * 31) > 0.5 ? "rgba(105,150,52,0.75)" : "rgba(196,224,120,0.75)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(sx, gy);
    ctx.lineTo(sx - s * 0.5, gy - s);
    ctx.moveTo(sx, gy);
    ctx.lineTo(sx + s * 0.55, gy - s * 0.9);
    ctx.stroke();
    if (hash(k * 37) > 0.88) {
      ctx.fillStyle = ["#fde68a", "#fca5a5", "#ffffff"][k % 3];
      ctx.beginPath();
      ctx.arc(sx + 2, gy - s - 1, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** The launch tree: fat buttressed trunk, the platform, and the vine's branch. */
function drawLaunchTree(ctx, rt, P, m, groundY) {
  const anchor = P(0, PIVOT_H);
  const plat = P(PLATFORM_X, PLATFORM_H);
  const trunkX = plat.x - m(6);

  ctx.fillStyle = "rgba(60,80,30,0.2)";
  ctx.beginPath();
  ctx.ellipse(trunkX, groundY + m(1), m(16), m(2.6), 0, 0, Math.PI * 2);
  ctx.fill();

  const grad = ctx.createLinearGradient(trunkX - m(6), 0, trunkX + m(6), 0);
  grad.addColorStop(0, "#4d3620");
  grad.addColorStop(0.42, "#8a6440");
  grad.addColorStop(0.75, "#6d4c2c");
  grad.addColorStop(1, "#3f2c19");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(trunkX - m(6), groundY + 2);
  ctx.quadraticCurveTo(trunkX - m(3.6), anchor.y + m(24), trunkX - m(3), anchor.y - m(8));
  ctx.lineTo(trunkX + m(3), anchor.y - m(8));
  ctx.quadraticCurveTo(trunkX + m(3.6), anchor.y + m(24), trunkX + m(6), groundY + 2);
  ctx.closePath();
  ctx.fill();
  // Buttress roots flaring into the grass.
  ctx.fillStyle = "#4a331d";
  ctx.beginPath();
  ctx.moveTo(trunkX - m(6), groundY + 2);
  ctx.quadraticCurveTo(trunkX - m(12), groundY - m(1.4), trunkX - m(15), groundY + 2);
  ctx.lineTo(trunkX + m(15), groundY + 2);
  ctx.quadraticCurveTo(trunkX + m(12), groundY - m(1.4), trunkX + m(6), groundY + 2);
  ctx.closePath();
  ctx.fill();
  // Bark grooves.
  ctx.strokeStyle = "rgba(48,32,16,0.35)";
  ctx.lineWidth = Math.max(1, m(0.5));
  for (let k = -2; k <= 2; k += 1) {
    ctx.beginPath();
    ctx.moveTo(trunkX + m(k * 2), groundY);
    ctx.quadraticCurveTo(trunkX + m(k * 1.6), anchor.y + m(20), trunkX + m(k * 1.3), anchor.y - m(6));
    ctx.stroke();
  }

  // The branch the vine hangs from, arcing out over the clearing.
  ctx.strokeStyle = "#5b3f26";
  ctx.lineWidth = Math.max(3, m(2.4));
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(trunkX, anchor.y - m(6));
  ctx.quadraticCurveTo((trunkX + anchor.x) / 2, anchor.y - m(11), anchor.x + m(9), anchor.y - m(1));
  ctx.stroke();

  // Crown over the branch, in the near band's colours — canopy pillows only,
  // since the trunk is already drawn above.
  const crown = (cx, cy, r, base) => {
    const dark = shade(base, 0.82);
    const light = shade(base, 1.16);
    [[0, 0, 1], [-0.74, 0.24, 0.72], [0.76, 0.2, 0.76], [-0.32, -0.44, 0.64], [0.38, -0.48, 0.68]].forEach(
      ([bx, by, br], i) => {
        ctx.fillStyle = i % 2 ? dark : base;
        ctx.beginPath();
        ctx.ellipse(cx + bx * r, cy + by * r, r * br, r * br * 0.82, 0, 0, Math.PI * 2);
        ctx.fill();
      },
    );
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.3, cy - r * 0.44, r * 0.5, r * 0.32, -0.3, 0, Math.PI * 2);
    ctx.fill();
  };
  crown(trunkX + m(1), anchor.y - m(18), m(15), "#3f8733");
  crown(anchor.x + m(13), anchor.y - m(4), m(9), "#4f9c3c");

  // Wooden platform with its rope ladder.
  const platW = m(15);
  const platH = Math.max(3, m(1.9));
  ctx.fillStyle = "rgba(40,30,12,0.28)";
  roundRect(ctx, plat.x - platW * 0.62, plat.y + platH * 0.6, platW * 1.12, platH, platH * 0.4);
  ctx.fill();
  const plank = ctx.createLinearGradient(0, plat.y - platH, 0, plat.y + platH);
  plank.addColorStop(0, "#d0a06a");
  plank.addColorStop(1, "#8a5f31");
  ctx.fillStyle = plank;
  roundRect(ctx, plat.x - platW * 0.66, plat.y - platH * 0.5, platW * 1.16, platH, platH * 0.32);
  ctx.fill();
  ctx.strokeStyle = "rgba(70,44,20,0.7)";
  ctx.lineWidth = 1;
  for (let k = 1; k < 5; k += 1) {
    const px = plat.x - platW * 0.66 + (platW * 1.16 * k) / 5;
    ctx.beginPath();
    ctx.moveTo(px, plat.y - platH * 0.5);
    ctx.lineTo(px, plat.y + platH * 0.5);
    ctx.stroke();
  }
  // Support post down to the ground.
  ctx.fillStyle = "#6d4c2c";
  ctx.fillRect(plat.x - m(1.2), plat.y, m(2.4), groundY - plat.y);
  ctx.strokeStyle = "rgba(196,160,102,0.8)";
  ctx.lineWidth = Math.max(1, m(0.4));
  const ladX = plat.x + m(4.5);
  ctx.beginPath();
  ctx.moveTo(ladX - m(1.4), plat.y);
  ctx.lineTo(ladX - m(1.4), groundY);
  ctx.moveTo(ladX + m(1.4), plat.y);
  ctx.lineTo(ladX + m(1.4), groundY);
  ctx.stroke();
  for (let k = 1; k <= 6; k += 1) {
    const ry = plat.y + ((groundY - plat.y) * k) / 7;
    ctx.beginPath();
    ctx.moveTo(ladX - m(1.4), ry);
    ctx.lineTo(ladX + m(1.4), ry);
    ctx.stroke();
  }
}

/**
 * Slim flags marking where the rivals already landed. The swing framing is
 * fixed (moving it would change how the release cue reads), and the best rivals
 * out-jump that framing, so any mark past the right edge is pinned there as an
 * arrow with its distance — you can always see what you have to beat.
 */
function drawRivalFlags(ctx, rt, P, m, groundY, W) {
  const edge = W - 6;
  const pinned = [];
  for (let i = 1; i < rt.jumpers.length; i += 1) {
    const r = rt.jumpers[i];
    if (!r.landed) continue;
    const p = P(r.jump ? flightPoint(r.jump, r.flightMs).x : 0, 0);
    if (p.x > edge) {
      pinned.push(r);
      continue;
    }
    if (p.x < -40) continue;
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, groundY);
    ctx.lineTo(p.x, groundY - m(13));
    ctx.stroke();
    ctx.fillStyle = r.color;
    ctx.beginPath();
    ctx.moveTo(p.x, groundY - m(13));
    ctx.lineTo(p.x + m(8), groundY - m(11));
    ctx.lineTo(p.x, groundY - m(9));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(15,32,12,0.85)";
    ctx.font = "700 11px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(`${Math.round(r.distance)}m`, p.x, groundY - m(8));
  }

  return pinned.sort((a, b) => a.distance - b.distance);
}

/** Off-screen rival marks, stacked up the right edge, nearest first. */
function drawPinnedMarks(ctx, pinned, m, groundY, W, H) {
  pinned.forEach((r, i) => {
    const y = groundY - m(10) - i * (H * 0.055);
    const label = `${Math.round(r.distance)}m`;
    ctx.font = "800 12px 'Segoe UI', sans-serif";
    const tw = ctx.measureText(label).width;
    const boxW = tw + 26;
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    roundRect(ctx, W - boxW - 4, y - 11, boxW, 22, 11);
    ctx.fill();
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#1f3b12";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, W - boxW + 4, y + 1);
    // Chevron pointing off past the edge.
    ctx.fillStyle = r.color;
    ctx.beginPath();
    ctx.moveTo(W - 12, y - 6);
    ctx.lineTo(W - 5, y);
    ctx.lineTo(W - 12, y + 6);
    ctx.closePath();
    ctx.fill();
  });
}

// ── main ─────────────────────────────────────────────────────────────────────
// W/H are CSS pixels; dpr scales the backing store so the jungle stays crisp on
// high-density phone screens instead of upscaling a 1x buffer.
export function drawScene(ctx, rt, W, H, dpr = 1) {
  const width = W ?? ctx.canvas.width;
  const height = H ?? ctx.canvas.height;
  const pxPerM = height / VIEW_H_M;
  const groundY = height * GROUND_FRAC;
  const camLeft = cameraLeftM(rt, width, pxPerM);
  const P = (x, y) => ({ x: (x - camLeft) * pxPerM, y: groundY - y * pxPerM });
  const m = (v) => v * pxPerM;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(0, 0, width, height);

  drawSky(ctx, rt, width, height, groundY);
  drawClouds(ctx, camLeft, width, height, pxPerM);
  BANDS.forEach((band) => drawBand(ctx, band, camLeft, width, height, pxPerM, groundY));
  drawGround(ctx, rt, camLeft, width, height, pxPerM, groundY);
  const offScreenMarks = drawRivalFlags(ctx, rt, P, m, groundY, width);
  drawLaunchTree(ctx, rt, P, m, groundY);

  const you = rt.jumpers[0];
  const bodyH = m(9);

  // The release cue: the platform's height, which is the whole skill of the
  // minigame. Drawn only while you're still on the vine.
  if (!you.released && (rt.state === "swing" || rt.state === "intro" || rt.state === "menu")) {
    const cue = P(gripAt(PLATFORM_ANGLE).x, gripAt(PLATFORM_ANGLE).y);
    const plat = P(PLATFORM_X, PLATFORM_H);
    const live = you.omega > 0 && Math.abs(you.theta - PLATFORM_ANGLE) < 0.14;
    ctx.save();
    ctx.setLineDash([7, 7]);
    ctx.lineWidth = live ? 3 : 1.8;
    ctx.strokeStyle = live ? "rgba(250,204,21,0.95)" : "rgba(250,204,21,0.5)";
    ctx.beginPath();
    ctx.moveTo(plat.x, cue.y);
    ctx.lineTo(cue.x + m(10), cue.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = live ? "#facc15" : "rgba(250,204,21,0.6)";
    ctx.lineWidth = live ? 3.5 : 2.2;
    ctx.beginPath();
    ctx.arc(cue.x, cue.y, m(4) * (live ? 1.2 : 1), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Vine + jumper.
  if (!you.released) {
    const anchor = P(0, PIVOT_H);
    const g = gripAt(you.theta);
    const grip = P(g.x, g.y);
    // The rope bows under load instead of drawing as a rigid stick, and reddens
    // as it approaches the angle where it will go slack.
    const strain = Math.max(0, Math.abs(you.theta) - 1.2) / 0.4;
    const sag = m(2.6) * Math.cos(you.theta);
    ctx.strokeStyle = strain > 0 ? `rgb(${Math.round(75 + strain * 160)}, ${Math.round(127 - strain * 40)}, 47)` : "#4b7f2f";
    ctx.lineWidth = Math.max(2.5, m(1.1));
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y);
    ctx.quadraticCurveTo(
      (anchor.x + grip.x) / 2 + Math.sin(you.theta) * m(1.6),
      (anchor.y + grip.y) / 2 + sag,
      grip.x,
      grip.y,
    );
    ctx.stroke();
    ctx.strokeStyle = "rgba(163,214,120,0.55)";
    ctx.lineWidth = Math.max(1, m(0.35));
    ctx.stroke();

    drawExplorer(ctx, grip.x, grip.y, bodyH, you.color, {
      mode: "hang",
      lean: you.theta * 0.6,
      swing: Math.max(-1, Math.min(1, you.omega)),
    });
  } else {
    const p = flightPoint(you.jump, you.flightMs);
    const sp = P(p.x, p.y);
    // Dotted trail so the arc of the jump stays readable while it streams past.
    ctx.save();
    ctx.setLineDash([2, 8]);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const steps = 30;
    for (let k = 0; k <= steps; k += 1) {
      const q = flightPoint(you.jump, (you.flightMs * k) / steps);
      const sq = P(q.x, q.y);
      if (k === 0) ctx.moveTo(sq.x, sq.y);
      else ctx.lineTo(sq.x, sq.y);
    }
    ctx.stroke();
    ctx.restore();

    if (you.landed) {
      ctx.fillStyle = "rgba(214,200,140,0.55)";
      for (let k = 0; k < 5; k += 1) {
        ctx.beginPath();
        ctx.ellipse(sp.x + (k - 2) * m(2.4), sp.y - m(0.6), m(2.2), m(1.1), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      drawExplorer(ctx, sp.x, sp.y - bodyH * 0.62, bodyH, you.color, { mode: "stand" });
    } else {
      drawExplorer(ctx, sp.x, sp.y - bodyH * 0.5, bodyH, you.color, { mode: "fly", spin: you.spin });
    }

    // Big live distance readout beside the jumper, as in the original.
    const label = `${you.landed ? you.distance : Math.max(0, Math.round(p.x))} m`;
    ctx.font = `800 ${Math.max(18, Math.round(height * 0.075))}px "Bricolage Grotesque", 'Segoe UI', sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const lx = Math.min(sp.x + m(7), width - ctx.measureText(label).width - 12);
    const ly = Math.max(height * 0.12, sp.y - bodyH * 0.9);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.strokeText(label, lx, ly);
    ctx.fillStyle = "#1f3b12";
    ctx.fillText(label, lx, ly);
  }

  drawPinnedMarks(ctx, offScreenMarks, m, groundY, width, height);

  // A couple of soft out-of-focus leaves framing the bottom corners; light, so
  // the sunny clearing keeps its brightness.
  const sway = Math.sin(rt.clockMs / 1700) * 0.05;
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#2f6b28";
  ctx.beginPath();
  ctx.moveTo(-width * 0.02, height * 1.02);
  ctx.quadraticCurveTo(width * 0.14, height * (0.86 + sway), width * 0.3, height * 0.99);
  ctx.quadraticCurveTo(width * 0.12, height * 1.02, -width * 0.02, height * 1.02);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(width * 1.02, height * 1.02);
  ctx.quadraticCurveTo(width * 0.86, height * (0.88 - sway), width * 0.72, height * 1.0);
  ctx.quadraticCurveTo(width * 0.9, height * 1.02, width * 1.02, height * 1.02);
  ctx.fill();
  ctx.restore();
}

export default drawScene;
