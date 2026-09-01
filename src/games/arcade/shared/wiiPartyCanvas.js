// Shared canvas kit for the Wii Party-inspired minis.
//
// These games all stage the same cast — small faceless figures in a bright
// outdoor scene — so the figure, the colour maths and the rounded-rectangle
// helper live here rather than being copy-pasted five times. Everything is a
// pure painter: give it a context and numbers, it draws and returns nothing.
//
// The figures are deliberately faceless. At the sizes these scenes run (roughly
// 30-70px tall, and half that on a phone) a face is three dark specks that read
// as noise, so each player is identified by their colour alone — which is also
// what the scoreboards and markers key off.

// Deterministic 0–1 hash so scenery stays put between frames instead of
// shimmering as the scene scrolls.
export function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Multiply a #rrggbb colour by a factor. Only accepts hex — never its own output. */
export function shade(hex, f) {
  const h = String(hex).replace("#", "");
  const c = (i) => {
    const v = parseInt(h.slice(i, i + 2), 16) * f;
    return Math.max(0, Math.min(255, Math.round(v)));
  };
  return `rgb(${c(0)}, ${c(2)}, ${c(4)})`;
}

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export const easeOutCubic = (t) => 1 - (1 - t) ** 3;
export const easeInCubic = (t) => t ** 3;
export const clamp01 = (t) => Math.max(0, Math.min(1, t));

export const SKIN = "#f3cfa8";

/**
 * The cast of every one of these games: a faceless figure standing on `feetY`.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} o
 * @param {number} o.x         horizontal centre
 * @param {number} o.feetY     the ground line the figure stands on
 * @param {number} o.size      full height, head to feet
 * @param {string} o.color     the player's colour (hex) — shirt and hair
 * @param {number} [o.stride]  leg-swing phase in radians; 0 stands still
 * @param {number} [o.cheer]   0..1, how high the arms are raised
 * @param {number} [o.slump]   0..1, how far the figure sags
 * @param {number} [o.lean]    horizontal lean in units of size (running tilt)
 * @param {number} [o.armPump] 0..1, arms swinging with the legs instead of hanging
 * @param {boolean} [o.back]   drawn from behind (no lean of the head)
 * @param {number} [o.shadow]  0..1 opacity of the ground shadow; 0 hides it
 */
export function drawFacelessMii(ctx, o) {
  const {
    x, feetY, size, color,
    stride = 0, cheer = 0, slump = 0, lean = 0, armPump = 0,
    back = false, shadow = 0.2,
  } = o;

  const dark = shade(color, 0.7);
  const light = shade(color, 1.2);
  const headR = size * 0.2;
  const hipY = feetY - size * 0.46;
  const shoulderY = feetY - size * 0.72;
  const headCY = feetY - size * 0.9 + slump * size * 0.06;
  const tilt = lean * size;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (shadow > 0) {
    ctx.fillStyle = `rgba(30, 40, 20, ${shadow})`;
    ctx.beginPath();
    ctx.ellipse(x, feetY + size * 0.02, size * 0.26, size * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Legs.
  const swing = Math.sin(stride) * size * 0.16;
  ctx.strokeStyle = dark;
  ctx.lineWidth = size * 0.11;
  ctx.beginPath();
  ctx.moveTo(x + tilt * 0.4, hipY);
  ctx.lineTo(x - size * 0.09 + swing, feetY);
  ctx.moveTo(x + tilt * 0.4, hipY);
  ctx.lineTo(x + size * 0.09 - swing, feetY);
  ctx.stroke();

  // Torso.
  const torso = ctx.createLinearGradient(x - size * 0.16, 0, x + size * 0.16, 0);
  torso.addColorStop(0, back ? dark : light);
  torso.addColorStop(1, back ? light : dark);
  ctx.fillStyle = torso;
  roundRect(
    ctx,
    x - size * 0.16 + tilt * 0.6,
    shoulderY,
    size * 0.32,
    hipY - shoulderY + size * 0.06,
    size * 0.12,
  );
  ctx.fill();

  // Arms — raised when cheering, swinging when pumping, hanging otherwise.
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.085;
  const armY = shoulderY + size * 0.06;
  const lift = cheer * size * 0.42;
  const pump = armPump * Math.sin(stride + Math.PI) * size * 0.2;
  ctx.beginPath();
  ctx.moveTo(x - size * 0.14 + tilt * 0.6, armY);
  ctx.lineTo(
    x - size * 0.26 - cheer * size * 0.04 + tilt,
    armY + size * 0.24 - lift + slump * size * 0.05 - pump,
  );
  ctx.moveTo(x + size * 0.14 + tilt * 0.6, armY);
  ctx.lineTo(
    x + size * 0.26 + cheer * size * 0.04 + tilt,
    armY + size * 0.24 - lift + slump * size * 0.05 + pump,
  );
  ctx.stroke();

  // Head: skin dome plus a cap of hair in the player's colour. No face.
  const headX = x + tilt;
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(headX, headCY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(color, 0.55);
  ctx.beginPath();
  if (back) {
    // From behind the hair covers most of the head.
    ctx.arc(headX, headCY, headR * 0.98, 0, Math.PI * 2);
  } else {
    ctx.arc(headX, headCY - headR * 0.28, headR * 1.02, Math.PI, Math.PI * 2);
  }
  ctx.fill();

  ctx.restore();
}

/** A soft cartoon cloud, used by several of these skies. */
export function drawCloud(ctx, x, y, s, alpha = 0.85) {
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, s * 1.35, s * 0.62, 0, 0, Math.PI * 2);
  ctx.ellipse(x - s * 0.85, y + s * 0.16, s * 0.72, s * 0.44, 0, 0, Math.PI * 2);
  ctx.ellipse(x + s * 0.82, y + s * 0.2, s * 0.8, s * 0.46, 0, 0, Math.PI * 2);
  ctx.ellipse(x + s * 0.1, y - s * 0.42, s * 0.78, s * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** The bright blue-to-pale sky these games share. */
export function drawSky(ctx, w, h, top = "#4fa9e8", bottom = "#d5edfb") {
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.78);
  sky.addColorStop(0, top);
  sky.addColorStop(1, bottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
}

/**
 * The four player colours, shared so a player is the same colour in every game.
 * Blue is always the human.
 */
export const PLAYER_COLORS = ["#2f6fe0", "#e04f5f", "#2f9e4f", "#e8a317"];
