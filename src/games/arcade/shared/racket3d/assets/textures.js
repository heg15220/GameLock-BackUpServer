// Procedural textures, drawn into a <canvas> at load time.
//
// No binary assets, no network requests, no build step: every surface in both
// games is a function of a few numbers.  That also means a surface is *themeable*
// — clay is not a photograph of clay, it is a recipe, and the recipe takes the
// colour as an argument.
//
// Textures are cached by key and disposed together, because three.js will happily
// leak every one of them otherwise.

import * as THREE from "three";

const cache = new Map();

function canvas(size) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  return c;
}

// Deterministic value noise: the same court looks the same every time you play
// it, which matters more than it sounds — a court that reshuffles its grain on
// every restart reads as "unfinished".
function makeRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function grain(ctx, size, { amount, scale = 1, alpha = 0.08, seed = 7 }) {
  const rand = makeRandom(seed);
  for (let i = 0; i < amount; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const r = (0.4 + rand() * 1.6) * scale;
    const shade = rand() < 0.5 ? 0 : 255;
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${alpha * rand()})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function build(key, size, draw, { repeat = 1, srgb = true } = {}) {
  if (cache.has(key)) return cache.get(key);

  const c = canvas(size);
  const ctx = c.getContext("2d");
  draw(ctx, size);

  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 8;
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  cache.set(key, texture);
  return texture;
}

// ── Court surfaces ──────────────────────────────────────────────────────────

export function clayTexture() {
  return build("clay", 512, (ctx, size) => {
    ctx.fillStyle = "#b4562f";
    ctx.fillRect(0, 0, size, size);
    // Loose top dressing: brighter, drier specks over a damp base.
    grain(ctx, size, { amount: 9000, scale: 1.1, alpha: 0.22, seed: 11 });
    const rand = makeRandom(29);
    for (let i = 0; i < 260; i += 1) {
      ctx.fillStyle = `rgba(210,140,102,${0.05 + rand() * 0.14})`;
      ctx.beginPath();
      ctx.arc(rand() * size, rand() * size, 2 + rand() * 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { repeat: 6 });
}

export function grassTexture() {
  return build("grass", 512, (ctx, size) => {
    ctx.fillStyle = "#2f7a3f";
    ctx.fillRect(0, 0, size, size);
    // Mower stripes: the give-away of a grass court, and free here.
    const band = size / 8;
    for (let i = 0; i < 8; i += 1) {
      ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.05)";
      ctx.fillRect(0, i * band, size, band);
    }
    const rand = makeRandom(5);
    for (let i = 0; i < 4200; i += 1) {
      const x = rand() * size;
      const y = rand() * size;
      ctx.strokeStyle = `rgba(${40 + rand() * 60},${110 + rand() * 70},${50 + rand() * 40},0.35)`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 3, y - 2 - rand() * 3);
      ctx.stroke();
    }
  }, { repeat: 5 });
}

export function hardTexture() {
  return build("hard", 512, (ctx, size) => {
    ctx.fillStyle = "#2a6ca8";
    ctx.fillRect(0, 0, size, size);
    // Acrylic is a paint loaded with sand: fine, even, slightly sparkly.
    grain(ctx, size, { amount: 14000, scale: 0.7, alpha: 0.10, seed: 3 });
  }, { repeat: 4 });
}

export function surroundTexture(color = "#1d4f7c") {
  return build(`surround-${color}`, 256, (ctx, size) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    grain(ctx, size, { amount: 5000, scale: 0.8, alpha: 0.09, seed: 23 });
  }, { repeat: 8 });
}

// ── Table tennis ────────────────────────────────────────────────────────────

export function tableTopTexture() {
  return build("table-top", 512, (ctx, size) => {
    ctx.fillStyle = "#0f4c81";
    ctx.fillRect(0, 0, size, size);
    // A matte tournament top: almost uniform, with just enough tooth to catch the
    // light and stop it reading as flat plastic.
    grain(ctx, size, { amount: 6000, scale: 0.5, alpha: 0.05, seed: 17 });
  }, { repeat: 2 });
}

export function woodTexture() {
  return build("wood", 512, (ctx, size) => {
    ctx.fillStyle = "#c79a63";
    ctx.fillRect(0, 0, size, size);
    const rand = makeRandom(41);
    // Blade laminate: long grain along one axis.
    for (let i = 0; i < 160; i += 1) {
      const y = rand() * size;
      ctx.strokeStyle = `rgba(120,80,45,${0.05 + rand() * 0.18})`;
      ctx.lineWidth = 0.6 + rand() * 2.4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= size; x += 32) {
        ctx.lineTo(x, y + Math.sin((x / size) * Math.PI * 2 + i) * 3);
      }
      ctx.stroke();
    }
  }, { repeat: 1 });
}

// Inverted rubber: the red face is smooth, the black one shows its pips.
export function rubberTexture(color = "#c02b2b", pips = false) {
  return build(`rubber-${color}-${pips}`, 256, (ctx, size) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    if (pips) {
      const step = 9;
      for (let y = step / 2; y < size; y += step) {
        for (let x = step / 2; x < size; x += step) {
          ctx.fillStyle = "rgba(255,255,255,0.055)";
          ctx.beginPath();
          ctx.arc(x, y, 2.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(0,0,0,0.14)";
          ctx.beginPath();
          ctx.arc(x + 0.7, y + 0.9, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      grain(ctx, size, { amount: 3000, scale: 0.5, alpha: 0.05, seed: 31 });
    }
  }, { repeat: 1 });
}

// ── Balls ───────────────────────────────────────────────────────────────────

// Tennis felt.  The seam is real geometry (see ball.js); this is the nap.
export function feltTexture(color = "#d8e94a") {
  return build(`felt-${color}`, 256, (ctx, size) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    const rand = makeRandom(13);
    for (let i = 0; i < 6000; i += 1) {
      const x = rand() * size;
      const y = rand() * size;
      ctx.strokeStyle = `rgba(255,255,255,${rand() * 0.16})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 2.5, y + (rand() - 0.5) * 2.5);
      ctx.stroke();
    }
  }, { repeat: 1 });
}

// A ping-pong ball with a printed logo.  The logo is the point: without a mark on
// it, a white sphere spinning at 100 revolutions a second is indistinguishable
// from a white sphere sitting still, and the player loses all of the information
// the spin is carrying.
export function pingBallTexture(color = "#f7f2e8") {
  return build(`ping-ball-${color}`, 256, (ctx, size) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(30,40,60,0.5)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(size * 0.3, size * 0.5, size * 0.13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(30,40,60,0.42)";
    ctx.font = `bold ${Math.round(size * 0.1)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("40+", size * 0.72, size * 0.5);
    // The seam of a moulded ball.
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.5);
    ctx.lineTo(size, size * 0.5);
    ctx.stroke();
  }, { repeat: 1 });
}

// The nap again, this time as surface relief rather than colour.  Drawing fibres
// into the albedo makes a ball that *has* fuzz; only a normal map makes one that
// *catches the light* like fuzz, and under stadium floodlights that is the whole
// difference between felt and painted plastic.
export function feltNormalTexture() {
  return build("felt-normal", 256, (ctx, size) => {
    const wrap = (v) => (v + size) % size;
    const rand = makeRandom(67);

    // A height field first.  Raw white noise has a gradient of pure salt and
    // pepper, so it gets one box blur — enough to leave fibre-scale structure,
    // enough to kill the per-texel garbage.
    const noise = new Float32Array(size * size);
    for (let i = 0; i < noise.length; i += 1) noise[i] = rand();

    const height = new Float32Array(size * size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            sum += noise[wrap(y + dy) * size + wrap(x + dx)];
          }
        }
        height[y * size + x] = sum / 9;
      }
    }

    // The normal is the gradient of the height field, tilted away from straight
    // up in proportion to how steeply the surface climbs.
    const image = ctx.createImageData(size, size);
    const strength = 2.4;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const left = height[y * size + wrap(x - 1)];
        const right = height[y * size + wrap(x + 1)];
        const down = height[wrap(y - 1) * size + x];
        const up = height[wrap(y + 1) * size + x];

        const nx = (left - right) * strength;
        const ny = (down - up) * strength;
        const nz = 1;
        const inv = 1 / Math.hypot(nx, ny, nz);

        const o = (y * size + x) * 4;
        image.data[o] = (nx * inv * 0.5 + 0.5) * 255;
        image.data[o + 1] = (ny * inv * 0.5 + 0.5) * 255;
        image.data[o + 2] = (nz * inv * 0.5 + 0.5) * 255;
        image.data[o + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    // A normal map is data, not colour: no sRGB transfer, or the light bends wrong.
  }, { repeat: 1, srgb: false });
}

// ── Arena ───────────────────────────────────────────────────────────────────

export function standsTexture() {
  return build("stands", 256, (ctx, size) => {
    ctx.fillStyle = "#12203a";
    ctx.fillRect(0, 0, size, size);
    // Rows of empty seats, so the tiers still read as seating behind the crowd.
    const rows = 10;
    const h = size / rows;
    for (let r = 0; r < rows; r += 1) {
      ctx.fillStyle = r % 2 ? "#1a2c4d" : "#16253f";
      ctx.fillRect(0, r * h, size, h * 0.72);
    }
  }, { repeat: 10 });
}

// A blurred wall of spectators, used as the low tier's stand-in for a real crowd.
export function crowdImpostorTexture() {
  return build("crowd-impostor", 256, (ctx, size) => {
    ctx.fillStyle = "#101d33";
    ctx.fillRect(0, 0, size, size);
    const rand = makeRandom(97);
    const palette = ["#e8b98a", "#a9683f", "#f0d6b8", "#7a4a2c", "#d9a06d"];
    for (let i = 0; i < 900; i += 1) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 2.5 + rand() * 3;
      ctx.fillStyle = `rgba(30,45,75,${0.35 + rand() * 0.4})`;
      ctx.fillRect(x - r, y, r * 2, r * 2.6); // torso
      ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
      ctx.globalAlpha = 0.55 + rand() * 0.4;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }, { repeat: 1 });
}

// A sponsor board.  `slot` carries the ad copy when the platform's ad preview is
// on; with it off we fall back to neutral house branding rather than a blank.
export function bannerTexture(slot, index = 0) {
  const label = slot?.title ?? slot?.label ?? null;
  const key = `banner-${index}-${label ?? "house"}`;
  const palettes = [
    ["#0f2f52", "#4aa3ff"],
    ["#3a1050", "#c56bff"],
    ["#0d3a30", "#4fd6a8"],
    ["#41200c", "#ff9d4a"],
  ];
  const [bg, fg] = palettes[index % palettes.length];

  return build(key, 512, (ctx, size) => {
    const h = size / 4; // boards are 4:1
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    const gradient = ctx.createLinearGradient(0, 0, size, h);
    gradient.addColorStop(0, "rgba(255,255,255,0.05)");
    gradient.addColorStop(1, "rgba(255,255,255,0.16)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = fg;
    ctx.fillRect(0, h * 3.6, size, h * 0.1);

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.round(size * 0.13)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((label ?? "GAMELOCK").toUpperCase().slice(0, 16), size / 2, size / 2);
  }, { repeat: 1 });
}

export function disposeTextures() {
  for (const texture of cache.values()) texture.dispose();
  cache.clear();
}
