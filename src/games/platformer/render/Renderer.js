import { SCREENS, VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from "../config";
import { TILE_TYPES, checkpointToWorldRect, tileKey, zoneToWorldRect } from "../levels/levelLoader";

const round = (value) => Math.round(value);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const hashNoise = (x, y) => {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
};

const ACCENTS = [
  "#57e3af",
  "#f9ca6b",
  "#77d6ff",
  "#fa8f79",
  "#9bf17f",
  "#bfa6ff",
  "#ff7fa5"
];

const THEMES = {
  day: {
    skyTop: "#1a8fd4",
    skyMid: "#5ec8f8",
    skyBottom: "#ffe78a",
    haze: "rgba(255, 228, 160, 0.28)",
    celestial: "#fff6b8",
    cloud: "#ffffff",
    cloudShadow: "rgba(180,200,220,0.45)",
    farMount: "#6ba0bc",
    nearMount: "#456e85",
    midGround: "#3a7a50",
    midGroundDark: "#295838",
    ridge: "#2a5940",
    groundTop: "#4db542",
    groundMain: "#6a3f20",
    groundStone: "#7a6348",
    brickMain: "#b85f32",
    brickDark: "#7a3a18",
    pipeMain: "#28b05e",
    pipeDark: "#1a7840",
    pipeHighlight: "rgba(255,255,255,0.22)",
    platformMain: "#c89855",
    platformDark: "#8a6038",
    platformHighlight: "rgba(255,255,255,0.28)",
    questionMain: "#f8c032",
    questionDark: "#8a5e10",
    questionUsed: "#7e6b4a",
    questionGlow: "rgba(255,200,60,0.35)",
    hudBg: "rgba(6, 12, 20, 0.72)",
    hudBorder: "rgba(110, 180, 255, 0.42)",
    hudAccentBar: "rgba(120,200,255,0.18)",
    text: "#f0faff",
    textDim: "rgba(200,230,255,0.7)"
  },
  dusk: {
    skyTop: "#1a1e40",
    skyMid: "#3a3e72",
    skyBottom: "#e8854a",
    haze: "rgba(255, 148, 96, 0.22)",
    celestial: "#fff2c6",
    cloud: "#f0e8ff",
    cloudShadow: "rgba(100,80,140,0.4)",
    farMount: "#32406a",
    nearMount: "#233058",
    midGround: "#1e3830",
    midGroundDark: "#152820",
    ridge: "#243e36",
    groundTop: "#427a3a",
    groundMain: "#5e3618",
    groundStone: "#6a5238",
    brickMain: "#a05428",
    brickDark: "#682e12",
    pipeMain: "#269050",
    pipeDark: "#186032",
    pipeHighlight: "rgba(255,255,255,0.18)",
    platformMain: "#ba8850",
    platformDark: "#725630",
    platformHighlight: "rgba(255,255,255,0.22)",
    questionMain: "#e8b030",
    questionDark: "#6e4a0e",
    questionUsed: "#6a5840",
    questionGlow: "rgba(240,175,40,0.28)",
    hudBg: "rgba(4, 6, 12, 0.78)",
    hudBorder: "rgba(148, 175, 255, 0.38)",
    hudAccentBar: "rgba(140,165,255,0.16)",
    text: "#e8f0ff",
    textDim: "rgba(180,200,255,0.65)"
  }
};

const STYLE_OVERRIDES = {
  classic: {},
  ice: {
    skyTop: "#7ecdf2",
    skyMid: "#c0eaff",
    skyBottom: "#e8f8ff",
    haze: "rgba(205, 238, 255, 0.36)",
    cloud: "#f0fbff",
    cloudShadow: "rgba(160,210,240,0.4)",
    farMount: "#8fc0da",
    nearMount: "#60a0c0",
    midGround: "#4882a0",
    midGroundDark: "#2e6080",
    ridge: "#2a5870",
    groundTop: "#a8e0ff",
    groundMain: "#607890",
    groundStone: "#7898b0",
    brickMain: "#90aac0",
    brickDark: "#5e7888",
    pipeMain: "#60a8d8",
    pipeDark: "#386898",
    pipeHighlight: "rgba(255,255,255,0.32)",
    platformMain: "#c8e8ff",
    platformDark: "#7898b2",
    platformHighlight: "rgba(255,255,255,0.38)",
    questionMain: "#d8f2ff",
    questionDark: "#6888a0",
    questionUsed: "#6a8098",
    questionGlow: "rgba(180,230,255,0.4)",
    hudBg: "rgba(4, 18, 32, 0.70)",
    hudBorder: "rgba(150, 225, 255, 0.48)",
    hudAccentBar: "rgba(160,230,255,0.18)",
    text: "#f0fbff",
    textDim: "rgba(200,240,255,0.7)"
  },
  lava: {
    skyTop: "#280900",
    skyMid: "#5e1a08",
    skyBottom: "#e87020",
    haze: "rgba(255, 130, 60, 0.24)",
    cloud: "#f0c8a0",
    cloudShadow: "rgba(140,60,20,0.45)",
    farMount: "#502010",
    nearMount: "#3c1808",
    midGround: "#401200",
    midGroundDark: "#280c00",
    ridge: "#340e0a",
    groundTop: "#804018",
    groundMain: "#482010",
    groundStone: "#604028",
    brickMain: "#803818",
    brickDark: "#502010",
    pipeMain: "#703018",
    pipeDark: "#422010",
    pipeHighlight: "rgba(255,120,60,0.22)",
    platformMain: "#a85e28",
    platformDark: "#603418",
    platformHighlight: "rgba(255,160,80,0.3)",
    questionMain: "#ffa030",
    questionDark: "#704010",
    questionUsed: "#5e3e28",
    questionGlow: "rgba(255,140,60,0.5)",
    hudBg: "rgba(15, 5, 2, 0.80)",
    hudBorder: "rgba(255, 140, 100, 0.48)",
    hudAccentBar: "rgba(255,120,60,0.22)",
    text: "#fff0e4",
    textDim: "rgba(255,210,170,0.65)"
  },
  fortress: {
    skyTop: "#0e1218",
    skyMid: "#222c3a",
    skyBottom: "#5a4a42",
    haze: "rgba(140, 118, 102, 0.18)",
    cloud: "#cccdd2",
    cloudShadow: "rgba(80,85,100,0.4)",
    farMount: "#2e3845",
    nearMount: "#202832",
    midGround: "#1c2228",
    midGroundDark: "#141820",
    ridge: "#1c1e24",
    groundTop: "#808090",
    groundMain: "#404252",
    groundStone: "#5a5868",
    brickMain: "#686070",
    brickDark: "#404048",
    pipeMain: "#525a68",
    pipeDark: "#343a48",
    pipeHighlight: "rgba(255,255,255,0.18)",
    platformMain: "#7e786a",
    platformDark: "#504a40",
    platformHighlight: "rgba(255,255,255,0.22)",
    questionMain: "#c8ae7c",
    questionDark: "#645230",
    questionUsed: "#625d52",
    questionGlow: "rgba(200,180,120,0.3)",
    hudBg: "rgba(8, 10, 16, 0.80)",
    hudBorder: "rgba(158, 168, 190, 0.42)",
    hudAccentBar: "rgba(160,170,195,0.16)",
    text: "#eef0f8",
    textDim: "rgba(200,210,235,0.65)"
  },
  boss_arena: {
    skyTop: "#04050a",
    skyMid: "#0c1018",
    skyBottom: "#300e10",
    haze: "rgba(255, 70, 50, 0.12)",
    cloud: "#b8b6c2",
    cloudShadow: "rgba(60,30,35,0.45)",
    farMount: "#1c1a22",
    nearMount: "#141218",
    midGround: "#160e10",
    midGroundDark: "#100810",
    ridge: "#140e14",
    groundTop: "#7a3838",
    groundMain: "#301414",
    groundStone: "#503030",
    brickMain: "#523030",
    brickDark: "#281414",
    pipeMain: "#3e2e38",
    pipeDark: "#241820",
    pipeHighlight: "rgba(255,100,100,0.18)",
    platformMain: "#7e4840",
    platformDark: "#4e2820",
    platformHighlight: "rgba(255,160,140,0.28)",
    questionMain: "#c08040",
    questionDark: "#583510",
    questionUsed: "#504240",
    questionGlow: "rgba(255,120,80,0.55)",
    hudBg: "rgba(6, 4, 8, 0.84)",
    hudBorder: "rgba(255, 100, 100, 0.50)",
    hudAccentBar: "rgba(255,80,80,0.22)",
    text: "#fff0ee",
    textDim: "rgba(255,200,195,0.65)"
  },
  forest: {
    skyTop: "#133b2d",
    skyMid: "#2f7650",
    skyBottom: "#d3f0a4",
    haze: "rgba(180, 235, 170, 0.22)",
    cloud: "#eff9e9",
    cloudShadow: "rgba(50,90,62,0.35)",
    farMount: "#244d38",
    nearMount: "#183828",
    midGround: "#22553d",
    midGroundDark: "#153726",
    ridge: "#143625",
    groundTop: "#5fc764",
    groundMain: "#5b4120",
    groundStone: "#7f6942",
    brickMain: "#a6683a",
    brickDark: "#6b4020",
    pipeMain: "#3ca95d",
    pipeDark: "#256f3d",
    pipeHighlight: "rgba(255,255,255,0.18)",
    platformMain: "#8d6d39",
    platformDark: "#5a431f",
    platformHighlight: "rgba(255,255,255,0.22)",
    questionMain: "#ffcb58",
    questionDark: "#7b5712",
    questionUsed: "#6b6757",
    questionGlow: "rgba(255,220,120,0.38)",
    hudBg: "rgba(6, 18, 14, 0.76)",
    hudBorder: "rgba(130, 215, 160, 0.38)",
    hudAccentBar: "rgba(128, 220, 156, 0.18)",
    text: "#eefcf2",
    textDim: "rgba(205,240,215,0.68)"
  },
  sunset: {
    skyTop: "#2c365c",
    skyMid: "#f07e51",
    skyBottom: "#ffd892",
    haze: "rgba(255, 197, 130, 0.26)",
    cloud: "#fff0d2",
    cloudShadow: "rgba(140,100,80,0.32)",
    farMount: "#7d5f6c",
    nearMount: "#5b4052",
    midGround: "#7e5d34",
    midGroundDark: "#5f431e",
    ridge: "#4f3823",
    groundTop: "#e0ad4f",
    groundMain: "#71431d",
    groundStone: "#9b7240",
    brickMain: "#d27c42",
    brickDark: "#8c4e20",
    pipeMain: "#5b8d66",
    pipeDark: "#356146",
    pipeHighlight: "rgba(255,255,255,0.18)",
    platformMain: "#d7a15c",
    platformDark: "#7e5a2f",
    platformHighlight: "rgba(255,255,255,0.25)",
    questionMain: "#ffe08a",
    questionDark: "#8d6115",
    questionUsed: "#7c6a55",
    questionGlow: "rgba(255,215,120,0.38)",
    hudBg: "rgba(20, 11, 8, 0.78)",
    hudBorder: "rgba(255, 186, 120, 0.38)",
    hudAccentBar: "rgba(255, 180, 112, 0.18)",
    text: "#fff5e8",
    textDim: "rgba(255,225,190,0.68)"
  },
  storm: {
    skyTop: "#0c162a",
    skyMid: "#324667",
    skyBottom: "#8aa7c8",
    haze: "rgba(150, 175, 220, 0.18)",
    cloud: "#d8e2f0",
    cloudShadow: "rgba(70,90,120,0.4)",
    farMount: "#26354c",
    nearMount: "#18263a",
    midGround: "#22354b",
    midGroundDark: "#142131",
    ridge: "#101c28",
    groundTop: "#7cb0c8",
    groundMain: "#41586a",
    groundStone: "#6d8798",
    brickMain: "#73889e",
    brickDark: "#48596c",
    pipeMain: "#5f86a5",
    pipeDark: "#35546e",
    pipeHighlight: "rgba(255,255,255,0.22)",
    platformMain: "#9ab4c8",
    platformDark: "#5f7486",
    platformHighlight: "rgba(255,255,255,0.28)",
    questionMain: "#d6ebff",
    questionDark: "#64839d",
    questionUsed: "#5c6774",
    questionGlow: "rgba(190,225,255,0.35)",
    hudBg: "rgba(5, 11, 20, 0.80)",
    hudBorder: "rgba(140, 190, 255, 0.40)",
    hudAccentBar: "rgba(140, 200, 255, 0.18)",
    text: "#f2f7ff",
    textDim: "rgba(205,220,245,0.68)"
  },
  toxic: {
    skyTop: "#142808",
    skyMid: "#3d6112",
    skyBottom: "#b0d84f",
    haze: "rgba(190, 255, 80, 0.16)",
    cloud: "#eef7d8",
    cloudShadow: "rgba(90,120,35,0.35)",
    farMount: "#355016",
    nearMount: "#23380f",
    midGround: "#365a18",
    midGroundDark: "#1f360b",
    ridge: "#1c2e09",
    groundTop: "#9ad443",
    groundMain: "#4d4f1c",
    groundStone: "#6f7540",
    brickMain: "#6d8b2c",
    brickDark: "#46581a",
    pipeMain: "#3dbb68",
    pipeDark: "#1f7340",
    pipeHighlight: "rgba(255,255,255,0.18)",
    platformMain: "#a5cb5b",
    platformDark: "#668035",
    platformHighlight: "rgba(255,255,255,0.24)",
    questionMain: "#e6f96e",
    questionDark: "#72881a",
    questionUsed: "#687044",
    questionGlow: "rgba(200,255,90,0.40)",
    hudBg: "rgba(8, 16, 4, 0.82)",
    hudBorder: "rgba(185, 255, 112, 0.36)",
    hudAccentBar: "rgba(175, 255, 96, 0.18)",
    text: "#f4ffe6",
    textDim: "rgba(225,245,180,0.68)"
  },
  celestial: {
    skyTop: "#08132d",
    skyMid: "#3d4fa0",
    skyBottom: "#90b9ff",
    haze: "rgba(190, 215, 255, 0.18)",
    cloud: "#f6f8ff",
    cloudShadow: "rgba(100,110,190,0.26)",
    farMount: "#273c72",
    nearMount: "#1a2a56",
    midGround: "#314f95",
    midGroundDark: "#1d3262",
    ridge: "#162547",
    groundTop: "#b5d1ff",
    groundMain: "#4c4f8f",
    groundStone: "#7073a8",
    brickMain: "#7885d6",
    brickDark: "#4a5597",
    pipeMain: "#62a8ff",
    pipeDark: "#336ac4",
    pipeHighlight: "rgba(255,255,255,0.28)",
    platformMain: "#d5e5ff",
    platformDark: "#7b90c8",
    platformHighlight: "rgba(255,255,255,0.34)",
    questionMain: "#eef4ff",
    questionDark: "#7f92c3",
    questionUsed: "#747f98",
    questionGlow: "rgba(195,220,255,0.44)",
    hudBg: "rgba(8, 12, 26, 0.80)",
    hudBorder: "rgba(170, 205, 255, 0.42)",
    hudAccentBar: "rgba(160, 205, 255, 0.20)",
    text: "#f5f8ff",
    textDim: "rgba(210,225,255,0.72)"
  }
};

const drawText = (ctx, text, x, y, options = {}) => {
  ctx.save();
  ctx.font = options.font || "14px monospace";
  ctx.fillStyle = options.color || "#ffffff";
  ctx.textAlign = options.align || "left";
  ctx.textBaseline = options.baseline || "alphabetic";
  if (options.shadowColor) {
    ctx.shadowColor = options.shadowColor;
    ctx.shadowBlur = options.shadowBlur || 0;
    ctx.shadowOffsetX = options.shadowOffsetX || 0;
    ctx.shadowOffsetY = options.shadowOffsetY || 0;
  }
  if (options.strokeColor) {
    ctx.strokeStyle = options.strokeColor;
    ctx.lineWidth = options.strokeWidth || 2;
    ctx.lineJoin = "round";
    ctx.strokeText(text, x, y);
  }
  ctx.fillText(text, x, y);
  ctx.restore();
};

const drawPanel = (ctx, x, y, w, h, fillColor, borderColor, radius = 0) => {
  ctx.fillStyle = fillColor;
  if (radius > 0) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    if (borderColor) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  } else {
    ctx.fillRect(x, y, w, h);
    if (!borderColor) {
      return;
    }
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
  }
};

const drawCloud = (ctx, x, y, alpha, color, shadowColor) => {
  ctx.save();
  ctx.globalAlpha = alpha * 0.55;
  ctx.fillStyle = shadowColor || "rgba(180,200,220,0.4)";
  ctx.fillRect(x + 2, y + 10, 50, 14);
  ctx.fillRect(x + 9, y + 4, 20, 13);
  ctx.fillRect(x + 27, y + 5, 18, 11);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y + 6, 50, 14);
  ctx.fillRect(x + 7, y + 1, 22, 13);
  ctx.fillRect(x + 25, y + 2, 20, 11);
  ctx.fillRect(x + 36, y + 6, 14, 9);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillRect(x + 2, y + 7, 20, 3);
  ctx.fillRect(x + 8, y + 2, 10, 3);
  ctx.restore();
};

const drawMountain = (ctx, x, baseY, width, height, color, snowColor) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x + width * 0.5, baseY - height);
  ctx.lineTo(x + width, baseY);
  ctx.closePath();
  ctx.fill();

  if (snowColor && height > 60) {
    const snowH = height * 0.28;
    ctx.fillStyle = snowColor;
    ctx.beginPath();
    ctx.moveTo(x + width * 0.5, baseY - height);
    ctx.lineTo(x + width * 0.5 - snowH * 0.7, baseY - height + snowH);
    ctx.lineTo(x + width * 0.5 + snowH * 0.7, baseY - height + snowH);
    ctx.closePath();
    ctx.fill();
  }
};

const drawMidGroundLayer = (ctx, cameraX, timeSeconds, palette, visualStyle) => {
  const offset = (cameraX * 0.72) % 130;

  if (visualStyle === "ice") {
    ctx.fillStyle = palette.midGround || "#508aaa";
    for (let i = -1; i < 8; i += 1) {
      const bx = i * 130 - offset;
      const bh = 48 + (i % 3) * 16;
      ctx.fillRect(bx, VIEWPORT_HEIGHT - 150 - bh, 80, bh);
      ctx.fillRect(bx + 26, VIEWPORT_HEIGHT - 162 - bh, 28, 12);
      ctx.fillStyle = "rgba(220,240,255,0.6)";
      ctx.fillRect(bx + 10, VIEWPORT_HEIGHT - 152 - bh, 60, 6);
      ctx.fillStyle = palette.midGround || "#508aaa";
    }
    return;
  }

  if (visualStyle === "lava" || visualStyle === "boss_arena") {
    ctx.fillStyle = palette.midGround || "#401200";
    for (let i = -1; i < 7; i += 1) {
      const bx = i * 140 - offset;
      const bh = 55 + (i % 4) * 20;
      ctx.fillRect(bx, VIEWPORT_HEIGHT - 140 - bh, 90, bh);
      ctx.fillStyle = palette.midGroundDark || "#280c00";
      ctx.fillRect(bx, VIEWPORT_HEIGHT - 142 - bh, 90, 4);
      ctx.fillStyle = palette.midGround || "#401200";
    }
    return;
  }

  if (visualStyle === "fortress") {
    ctx.fillStyle = palette.midGround || "#1c2228";
    for (let i = -1; i < 8; i += 1) {
      const bx = i * 122 - offset;
      const bh = 50 + (i % 3) * 22;
      ctx.fillRect(bx, VIEWPORT_HEIGHT - 148 - bh, 72, bh);
      ctx.fillRect(bx + 18, VIEWPORT_HEIGHT - 162 - bh, 36, 14);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      for (let wx = bx + 8; wx < bx + 68; wx += 16) {
        ctx.fillRect(wx, VIEWPORT_HEIGHT - 148 - bh + 8, 6, 26);
      }
      ctx.fillStyle = palette.midGround || "#1c2228";
    }
    return;
  }

  if (visualStyle === "forest") {
    for (let i = -1; i < 8; i += 1) {
      const bx = i * 120 - offset;
      const trunkH = 92 + (i % 3) * 18;
      ctx.fillStyle = palette.midGroundDark || "#153726";
      ctx.fillRect(bx + 20, VIEWPORT_HEIGHT - 170 - trunkH, 16, trunkH);
      ctx.fillRect(bx + 56, VIEWPORT_HEIGHT - 150 - trunkH * 0.76, 12, trunkH * 0.76);
      ctx.fillStyle = palette.midGround || "#22553d";
      ctx.fillRect(bx, VIEWPORT_HEIGHT - 206 - trunkH, 78, 22);
      ctx.fillRect(bx + 14, VIEWPORT_HEIGHT - 224 - trunkH, 58, 18);
      ctx.fillRect(bx + 28, VIEWPORT_HEIGHT - 238 - trunkH, 32, 14);
    }
    return;
  }

  if (visualStyle === "storm") {
    ctx.fillStyle = palette.midGround || "#22354b";
    for (let i = -1; i < 8; i += 1) {
      const bx = i * 134 - offset;
      const bh = 58 + (i % 4) * 16;
      ctx.fillRect(bx, VIEWPORT_HEIGHT - 144 - bh, 88, bh);
      ctx.fillRect(bx + 18, VIEWPORT_HEIGHT - 160 - bh, 30, 12);
      ctx.fillStyle = palette.midGroundDark || "#142131";
      ctx.fillRect(bx + 52, VIEWPORT_HEIGHT - 152 - bh, 18, bh + 8);
      ctx.fillStyle = palette.midGround || "#22354b";
    }
    return;
  }

  if (visualStyle === "toxic") {
    ctx.fillStyle = palette.midGround || "#365a18";
    for (let i = -1; i < 8; i += 1) {
      const bx = i * 118 - offset;
      const bh = 46 + (i % 4) * 12;
      ctx.fillRect(bx, VIEWPORT_HEIGHT - 146 - bh, 76, bh);
      ctx.fillStyle = "rgba(220,255,140,0.18)";
      ctx.fillRect(bx + 6, VIEWPORT_HEIGHT - 144 - bh, 64, 6);
      ctx.fillStyle = palette.midGroundDark || "#1f360b";
      ctx.fillRect(bx + 20, VIEWPORT_HEIGHT - 160 - bh, 12, 14);
      ctx.fillRect(bx + 44, VIEWPORT_HEIGHT - 166 - bh, 10, 20);
      ctx.fillStyle = palette.midGround || "#365a18";
    }
    return;
  }

  if (visualStyle === "celestial") {
    ctx.fillStyle = palette.midGround || "#314f95";
    for (let i = -1; i < 7; i += 1) {
      const bx = i * 138 - offset;
      const bh = 30 + (i % 4) * 9;
      ctx.fillRect(bx, VIEWPORT_HEIGHT - 154 - bh, 92, bh);
      ctx.fillStyle = "rgba(255,255,255,0.30)";
      ctx.fillRect(bx + 8, VIEWPORT_HEIGHT - 154 - bh, 34, 4);
      ctx.fillStyle = palette.midGroundDark || "#1d3262";
      ctx.fillRect(bx + 18, VIEWPORT_HEIGHT - 166 - bh, 44, 12);
      ctx.fillStyle = palette.midGround || "#314f95";
    }
    return;
  }

  if (visualStyle === "sunset") {
    ctx.fillStyle = palette.midGround || "#7e5d34";
    for (let i = -1; i < 8; i += 1) {
      const bx = i * 120 - offset;
      const bh = 24 + (i % 5) * 10;
      ctx.fillRect(bx, VIEWPORT_HEIGHT - 150 - bh, 78, bh);
      ctx.fillStyle = palette.midGroundDark || "#5f431e";
      ctx.fillRect(bx, VIEWPORT_HEIGHT - 152 - bh, 78, 5);
      ctx.fillStyle = palette.midGround || "#7e5d34";
    }
    return;
  }

  ctx.fillStyle = palette.midGround || "#3a7a50";
  for (let i = -1; i < 8; i += 1) {
    const bx = i * 110 - offset;
    const bh = 20 + (i % 4) * 8;
    ctx.fillRect(bx, VIEWPORT_HEIGHT - 148 - bh, 70, bh);
    ctx.fillStyle = palette.midGroundDark || "#295838";
    ctx.fillRect(bx, VIEWPORT_HEIGHT - 148 - bh, 70, 6);
    ctx.fillStyle = palette.midGround || "#3a7a50";
    for (let t = bx + 5; t < bx + 65; t += 12) {
      const th = 8 + (hashNoise(t, i) * 6);
      ctx.fillRect(t, VIEWPORT_HEIGHT - 148 - bh - th, 4, th);
    }
    ctx.fillStyle = palette.midGround || "#3a7a50";
  }
};

const drawStars = (ctx, timeSeconds) => {
  for (let i = 0; i < 90; i += 1) {
    const x = round((i * 89.7 + 13) % VIEWPORT_WIDTH);
    const y = round((i * 53.9 + 7) % 180);
    const twinkle = Math.sin(timeSeconds * 2.8 + i * 0.9) * 0.5 + 0.5;
    const alpha = 0.18 + twinkle * 0.64;
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    const size = i % 11 === 0 ? 2 : 1;
    ctx.fillRect(x, y, size, size);
  }
};

const drawSnowDrift = (ctx, timeSeconds) => {
  for (let i = 0; i < 80; i += 1) {
    const baseX = (i * 53.1) % VIEWPORT_WIDTH;
    const drift = Math.sin(timeSeconds * 1.4 + i * 0.55) * 11;
    const fall = (timeSeconds * (16 + (i % 7) * 2.2) + i * 14.3) % (VIEWPORT_HEIGHT + 50);
    const x = round((baseX + drift + VIEWPORT_WIDTH) % VIEWPORT_WIDTH);
    const y = round(fall - 22);
    const size = i % 5 === 0 ? 2 : 1;
    const alpha = i % 3 === 0 ? 0.85 : 0.62;
    ctx.fillStyle = `rgba(235,248,255,${alpha.toFixed(2)})`;
    ctx.fillRect(x, y, size, size);
  }
};

const drawEmbers = (ctx, timeSeconds) => {
  for (let i = 0; i < 40; i += 1) {
    const baseX = (i * 47.3 + timeSeconds * (25 + i % 9) * 0.7) % VIEWPORT_WIDTH;
    const rise = ((timeSeconds * (22 + i % 8) + i * 17.9)) % (VIEWPORT_HEIGHT + 30);
    const x = round((baseX + Math.sin(timeSeconds * 2.1 + i) * 8 + VIEWPORT_WIDTH) % VIEWPORT_WIDTH);
    const y = round(VIEWPORT_HEIGHT - rise);
    const alpha = clamp(0.7 - rise / VIEWPORT_HEIGHT, 0.1, 0.8);
    const hue = 20 + (i % 5) * 8;
    ctx.fillStyle = `hsla(${hue},100%,60%,${alpha.toFixed(2)})`;
    const size = i % 7 === 0 ? 2 : 1;
    ctx.fillRect(x, y, size, size);
  }
};

const drawRain = (ctx, timeSeconds) => {
  for (let i = 0; i < 120; i += 1) {
    const x = (i * 47.7 + timeSeconds * 180) % (VIEWPORT_WIDTH + 40) - 20;
    const y = (i * 29.3 + timeSeconds * 260) % (VIEWPORT_HEIGHT + 60) - 30;
    ctx.fillStyle = "rgba(190,220,255,0.22)";
    ctx.fillRect(round(x), round(y), 1, 10);
  }
};

const drawAurora = (ctx, timeSeconds) => {
  const ribbons = [
    ["rgba(120,255,220,0.20)", 36, 0.9],
    ["rgba(180,190,255,0.18)", 52, 1.2],
    ["rgba(255,180,255,0.12)", 68, 1.5]
  ];
  ribbons.forEach(([color, baseY, speed], index) => {
    ctx.fillStyle = color;
    for (let x = 0; x < VIEWPORT_WIDTH; x += 6) {
      const y = baseY + Math.sin(x * 0.022 + timeSeconds * speed + index) * 12;
      ctx.fillRect(x, round(y), 8, 3);
    }
  });
};

const drawToxicFumes = (ctx, timeSeconds) => {
  for (let i = 0; i < 24; i += 1) {
    const x = (i * 53 + Math.sin(timeSeconds * 0.7 + i) * 20 + VIEWPORT_WIDTH) % VIEWPORT_WIDTH;
    const y = 270 + Math.sin(timeSeconds * 1.1 + i * 0.6) * 18 + (i % 4) * 10;
    ctx.fillStyle = `rgba(200,255,90,${(0.08 + (i % 3) * 0.03).toFixed(2)})`;
    ctx.fillRect(round(x), round(y), 42, 16);
  }
};

const drawLightning = (ctx, timeSeconds) => {
  const flashCycle = Math.floor(timeSeconds * 0.22);
  if (Math.sin(flashCycle * 1237.5) < 0.82) {
    return;
  }
  ctx.save();
  ctx.strokeStyle = "rgba(255,200,255,0.55)";
  ctx.lineWidth = 1;
  const lx = ((flashCycle * 3197) % (VIEWPORT_WIDTH - 80)) + 40;
  ctx.beginPath();
  ctx.moveTo(lx, 0);
  let cy = 0;
  let cx = lx;
  while (cy < VIEWPORT_HEIGHT * 0.55) {
    cy += 22 + (Math.sin(cy * 0.3) * 10);
    cx += (Math.sin(cy * 0.7 + flashCycle) * 14);
    ctx.lineTo(round(cx), round(cy));
  }
  ctx.stroke();
  ctx.restore();
};

const drawFortressBackdrop = (ctx, colorPrimary, colorSecondary) => {
  ctx.fillStyle = colorPrimary;
  for (let i = -1; i < 7; i += 1) {
    const x = i * 128 + 20;
    const h = 90 + (i % 3) * 24;
    ctx.fillRect(x, VIEWPORT_HEIGHT - 164 - h, 76, h);
    ctx.fillRect(x + 20, VIEWPORT_HEIGHT - 178 - h, 36, 14);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let wx = x + 8; wx < x + 70; wx += 18) {
      ctx.fillRect(wx, VIEWPORT_HEIGHT - 164 - h + 10, 7, h - 18);
    }
    ctx.fillStyle = colorPrimary;
  }
  ctx.fillStyle = colorSecondary;
  for (let i = -1; i < 8; i += 1) {
    const x = i * 102 + 6;
    const h = 55 + (i % 4) * 15;
    ctx.fillRect(x, VIEWPORT_HEIGHT - 128 - h, 58, h);
  }
};

const drawLavaSea = (ctx, timeSeconds, y, baseColor, glowColor) => {
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, y, VIEWPORT_WIDTH, VIEWPORT_HEIGHT - y);

  for (let x = 0; x < VIEWPORT_WIDTH; x += 14) {
    const wave = Math.sin(timeSeconds * 3.8 + x * 0.085) * 3.5;
    ctx.fillStyle = glowColor;
    ctx.fillRect(x, y - 3 + wave, 10, 5);
  }

  for (let i = 0; i < 30; i += 1) {
    const bx = (i * 37 + timeSeconds * (22 + i * 1.1)) % VIEWPORT_WIDTH;
    const by = y + ((timeSeconds * 40 + i * 11.5) % Math.max(20, VIEWPORT_HEIGHT - y));
    const alpha = 0.14 + (i % 5) * 0.05;
    ctx.fillStyle = `rgba(255,195,120,${alpha.toFixed(2)})`;
    ctx.fillRect(round(bx), round(by), 2, 2);
  }
};

const drawGroundDetails = (ctx, x, y, size, tx, ty, palette) => {
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(x, y + size - 6, size, 6);

  const rockCount = 1 + Math.floor(hashNoise(tx, ty) * 3);
  for (let i = 0; i < rockCount; i += 1) {
    const nx = hashNoise(tx * 3 + i, ty * 5) * (size - 8);
    const ny = hashNoise(tx * 7, ty + i * 4) * (size - 14) + 10;
    ctx.fillStyle = palette.groundStone || "rgba(0,0,0,0.14)";
    ctx.fillRect(x + round(nx), y + round(ny), 3, 2);
  }

  if (hashNoise(tx, ty * 11) > 0.52) {
    const grassX = x + 3 + round(hashNoise(tx * 4, ty * 2) * (size - 8));
    ctx.fillStyle = palette.groundTop;
    ctx.fillRect(grassX, y + 4, 1, 4);
    ctx.fillRect(grassX + 2, y + 3, 1, 5);
    ctx.fillRect(grassX + 4, y + 5, 1, 3);
  }
};

const drawTile = (ctx, tileType, screenX, screenY, size, options) => {
  const {
    tx,
    ty,
    usedQuestionBlock,
    pulse,
    palette,
    accent
  } = options;

  if (tileType === TILE_TYPES.EMPTY) {
    return;
  }

  if (tileType === TILE_TYPES.GROUND) {
    ctx.fillStyle = palette.groundMain;
    ctx.fillRect(screenX, screenY, size, size);
    ctx.fillStyle = palette.groundTop;
    ctx.fillRect(screenX, screenY, size, 8);
    ctx.fillStyle = "rgba(255,255,255,0.20)";
    ctx.fillRect(screenX + 1, screenY + 1, size - 2, 3);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(screenX, screenY + 8, size, 3);
    drawGroundDetails(ctx, screenX, screenY, size, tx, ty, palette);
    return;
  }

  if (tileType === TILE_TYPES.BRICK) {
    ctx.fillStyle = palette.brickMain;
    ctx.fillRect(screenX, screenY, size, size);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(screenX + 1, screenY + 1, size - 2, 3);
    ctx.strokeStyle = palette.brickDark;
    ctx.lineWidth = 1;
    for (let y = 8; y < size; y += 8) {
      ctx.beginPath();
      ctx.moveTo(screenX, screenY + y + 0.5);
      ctx.lineTo(screenX + size, screenY + y + 0.5);
      ctx.stroke();
    }
    const splitOffset = tx % 2 === 0 ? 8 : 12;
    for (let x = splitOffset; x < size; x += 16) {
      ctx.beginPath();
      ctx.moveTo(screenX + x + 0.5, screenY);
      ctx.lineTo(screenX + x + 0.5, screenY + size);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(screenX, screenY + size - 4, size, 4);
    return;
  }

  if (tileType === TILE_TYPES.PIPE) {
    ctx.fillStyle = palette.pipeMain;
    ctx.fillRect(screenX + 4, screenY + 8, size - 8, size - 8);
    ctx.fillStyle = palette.pipeDark;
    ctx.fillRect(screenX + size - 10, screenY + 8, 4, size - 8);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(screenX + 4, screenY + size - 5, size - 8, 5);

    ctx.fillStyle = accent;
    ctx.fillRect(screenX, screenY, size, 8);
    ctx.fillStyle = palette.pipeDark;
    ctx.fillRect(screenX + size - 8, screenY, 4, 8);

    ctx.fillStyle = palette.pipeHighlight || "rgba(255,255,255,0.22)";
    ctx.fillRect(screenX + 2, screenY + 1, 4, 5);
    ctx.fillRect(screenX + 6, screenY + 10, 3, size - 14);
    return;
  }

  if (tileType === TILE_TYPES.PLATFORM) {
    ctx.fillStyle = palette.platformMain;
    ctx.fillRect(screenX, screenY + 14, size, 10);

    ctx.fillStyle = palette.platformDark;
    ctx.fillRect(screenX, screenY + 23, size, 3);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(screenX, screenY + 25, size, 2);

    ctx.fillStyle = palette.platformHighlight || "rgba(255,255,255,0.28)";
    ctx.fillRect(screenX, screenY + 14, size, 3);

    ctx.fillStyle = "rgba(0,0,0,0.22)";
    for (let x = screenX + 4; x < screenX + size - 4; x += 8) {
      ctx.fillRect(x, screenY + 18, 2, 5);
    }
    return;
  }

  if (tileType === TILE_TYPES.SPRING) {
    ctx.fillStyle = palette.platformMain;
    ctx.fillRect(screenX, screenY + 18, size, 8);
    ctx.fillStyle = accent;
    ctx.fillRect(screenX + 2, screenY + 10, size - 4, 8);
    ctx.fillStyle = palette.platformDark;
    ctx.fillRect(screenX + 4, screenY + 20, size - 8, 4);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(screenX + 3, screenY + 11, size - 6, 2);
    for (let index = 0; index < 4; index += 1) {
      const coilX = screenX + 5 + index * 6;
      ctx.fillStyle = "#2d3840";
      ctx.fillRect(coilX, screenY + 16, 3, 8);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(coilX, screenY + 16, 1, 6);
    }
    return;
  }

  if (tileType === TILE_TYPES.QUESTION) {
    const shimmer = usedQuestionBlock ? 0 : 0.72 + Math.sin(pulse + tx * 0.6) * 0.18;

    if (!usedQuestionBlock) {
      const glowAlpha = 0.25 + Math.sin(pulse + tx * 0.4) * 0.2;
      ctx.fillStyle = (palette.questionGlow || "rgba(255,200,60,0.35)").replace(/[\d.]+\)$/, `${(glowAlpha).toFixed(3)})`);
      ctx.fillRect(screenX - 3, screenY - 3, size + 6, size + 6);
    }

    ctx.fillStyle = usedQuestionBlock ? palette.questionUsed : palette.questionMain;
    ctx.fillRect(screenX, screenY, size, size);

    ctx.strokeStyle = usedQuestionBlock ? "#504030" : palette.questionDark;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(screenX + 0.75, screenY + 0.75, size - 1.5, size - 1.5);

    ctx.fillStyle = `rgba(255,255,255,${(usedQuestionBlock ? 0.10 : shimmer).toFixed(3)})`;
    ctx.fillRect(screenX + 2, screenY + 2, size - 4, 3);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(screenX, screenY + size - 4, size, 4);

    const markColor = usedQuestionBlock ? "rgba(90,75,60,0.9)" : "rgba(80,50,10,0.9)";
    ctx.fillStyle = markColor;
    ctx.fillRect(screenX + 12, screenY + 7, 8, 4);
    ctx.fillRect(screenX + 10, screenY + 12, 4, 4);
    ctx.fillRect(screenX + 16, screenY + 12, 4, 4);
    ctx.fillRect(screenX + 12, screenY + 17, 8, 4);
    ctx.fillRect(screenX + 13, screenY + 22, 6, 3);
  }
};

const drawPlayer = (ctx, player, cameraX, cameraY, accent, timeSeconds) => {
  if (!player) {
    return;
  }
  if (player.invulnerableTimer > 0 && Math.floor(player.invulnerableTimer * 14) % 2 === 0) {
    return;
  }

  const x = round(player.x - cameraX);
  const y = round(player.y - cameraY);
  const running = player.animation === "run";
  const runFrame = running ? Math.floor(player.animationTimer * 12) % 2 : 0;
  const legOffset = running ? (runFrame === 0 ? -3 : 3) : 0;
  const bodyColor = player.powerLevel > 0 ? "#e8472c" : "#2478d8";
  const trimColor = player.powerLevel > 0 ? "#ffcc60" : "#88c8ff";
  const hatColor = player.powerLevel > 0 ? "#cc2a1c" : "#1858b8";

  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(x + 2, y + player.h - 2, player.w - 4, 3);

  if (player.powerLevel > 0) {
    const aura = 0.12 + (Math.sin(timeSeconds * 7.5) * 0.5 + 0.5) * 0.26;
    ctx.strokeStyle = `rgba(255,210,100,${aura.toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 2, y - 2, player.w + 4, player.h + 4);
  }

  ctx.save();
  if (player.facing === "left") {
    ctx.translate(x + player.w, 0);
    ctx.scale(-1, 1);
    ctx.translate(-x, 0);
  }

  ctx.fillStyle = hatColor;
  ctx.fillRect(x + 4, y - 2, 14, 5);
  ctx.fillRect(x + 6, y - 5, 10, 5);

  ctx.fillStyle = "#f4c8a8";
  ctx.fillRect(x + 7, y + 3, 8, 7);
  ctx.fillStyle = "#111820";
  ctx.fillRect(x + 8, y + 5, 2, 2);
  ctx.fillRect(x + 12, y + 5, 2, 2);
  ctx.fillStyle = "#cc6655";
  ctx.fillRect(x + 10, y + 8, 2, 1);

  ctx.fillStyle = bodyColor;
  ctx.fillRect(x + 4, y + 10, 14, 9);
  ctx.fillStyle = trimColor;
  ctx.fillRect(x + 4, y + 10, 14, 3);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(x + 5, y + 10, 6, 6);

  ctx.fillStyle = "#183a52";
  ctx.fillRect(x + 5 + legOffset, y + 19, 5, 9);
  ctx.fillRect(x + 12 - legOffset, y + 19, 5, 9);
  ctx.fillStyle = "#0e2030";
  ctx.fillRect(x + 4 + legOffset, y + 27, 6, 3);
  ctx.fillRect(x + 12 - legOffset, y + 27, 6, 3);

  ctx.fillStyle = "#f4c8a8";
  ctx.fillRect(x + 2, y + 11, 2, 7);
  ctx.fillRect(x + 18, y + 11, 2, 7);
  ctx.fillStyle = "#dda888";
  ctx.fillRect(x + 2, y + 17, 2, 2);
  ctx.fillRect(x + 18, y + 17, 2, 2);

  if (player.animation === "jump") {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 1, y + 1, player.w - 2, player.h - 2);
  }

  ctx.restore();
};

const drawEnemy = (ctx, enemy, cameraX, cameraY) => {
  if (!enemy?.active) {
    return;
  }
  const x = round(enemy.x - cameraX);
  const y = round(enemy.y - cameraY);
  const step = enemy.animationFrame === 0 ? 0 : 1;
  const jumper = enemy.type === "jumper";
  const bodyColor = jumper ? "#4f7df5" : "#a02020";
  const hatColor = jumper ? "#79b8ff" : "#c03030";
  const trimColor = jumper ? "#3155a8" : "#801818";
  const eyeColor = jumper ? "#7ff6ff" : "#ee5533";

  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(x + 3, y + enemy.h - 2, enemy.w - 6, 3);

  ctx.save();
  if (enemy.direction < 0) {
    ctx.translate(x + enemy.w, 0);
    ctx.scale(-1, 1);
    ctx.translate(-x, 0);
  }

  ctx.fillStyle = hatColor;
  ctx.fillRect(x + 4, y, enemy.w - 8, 4);
  ctx.fillStyle = "#f0b880";
  ctx.fillRect(x + 7, y + 4, 10, 7);
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x + 4, y + 11, 16, 8);
  ctx.fillStyle = trimColor;
  ctx.fillRect(x + 5, y + 11, 16, 3);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(x + 5, y + 12, 6, 5);

  ctx.fillStyle = "#282030";
  ctx.fillRect(x + 5 + step, y + 19, 6, 5);
  ctx.fillRect(x + 13 - step, y + 19, 6, 5);
  ctx.fillRect(x + 4 + step, y + 23, 7, 2);
  ctx.fillRect(x + 13 - step, y + 23, 7, 2);

  ctx.fillStyle = "#111820";
  ctx.fillRect(x + 9, y + 6, 2, 2);
  ctx.fillRect(x + 13, y + 6, 2, 2);
  ctx.fillStyle = eyeColor;
  ctx.fillRect(x + 9, y + 9, 6, 1);

  ctx.restore();
};

const drawBoss = (ctx, enemy, cameraX, cameraY, timeSeconds) => {
  if (!enemy?.active) {
    return;
  }

  const x = round(enemy.x - cameraX);
  const y = round(enemy.y - cameraY);
  const flash = enemy.flashTimer > 0 && Math.floor(enemy.flashTimer * 22) % 2 === 0;
  const pulse = 0.16 + (Math.sin(timeSeconds * 7.2) * 0.5 + 0.5) * 0.24;
  const eyeGlow = 0.6 + Math.sin(timeSeconds * 4.8) * 0.3;
  const bossPalette = {
    juggernaut: { aura: [255, 80, 70], body: "#aa2c30", trim: "#7a1c22", crown: "#f0e068", eye: [255, 230, 80] },
    sentinel: { aura: [120, 200, 255], body: "#2c4f86", trim: "#1f355c", crown: "#d2e8ff", eye: [140, 250, 255] },
    tempest: { aura: [170, 220, 255], body: "#35648f", trim: "#1f3f64", crown: "#d3e8ff", eye: [190, 245, 255] },
    forge: { aura: [255, 120, 60], body: "#9d4827", trim: "#6f2d13", crown: "#ffc16b", eye: [255, 210, 120] },
    phantom: { aura: [200, 120, 255], body: "#6d3d8c", trim: "#40205a", crown: "#f0d2ff", eye: [220, 200, 255] }
  }[enemy.variant || "juggernaut"];

  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.fillRect(x + 4, y + enemy.h - 2, enemy.w - 8, 5);

  if (!flash) {
    ctx.fillStyle = `rgba(${bossPalette.aura[0]},${bossPalette.aura[1]},${bossPalette.aura[2]},${(pulse * 0.7).toFixed(3)})`;
    ctx.fillRect(x - 4, y - 4, enemy.w + 8, enemy.h + 8);
    ctx.fillStyle = `rgba(${bossPalette.aura[0]},${Math.max(0, bossPalette.aura[1] - 25)},${Math.max(0, bossPalette.aura[2] - 30)},${(pulse * 0.4).toFixed(3)})`;
    ctx.fillRect(x - 8, y - 8, enemy.w + 16, enemy.h + 16);
  }

  ctx.fillStyle = flash ? "#ffe0d4" : bossPalette.body;
  ctx.fillRect(x + 2, y + 10, enemy.w - 4, enemy.h - 12);
  ctx.fillStyle = bossPalette.trim;
  ctx.fillRect(x + 4, y + 12, enemy.w - 8, 5);
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(x + 4, y + 11, 10, enemy.h - 18);

  ctx.fillStyle = "#f0ba98";
  ctx.fillRect(x + 10, y + 2, enemy.w - 20, 10);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(x + 10, y + 10, enemy.w - 20, 3);

  ctx.fillStyle = `rgba(${bossPalette.eye[0]},${bossPalette.eye[1]},${bossPalette.eye[2]},${eyeGlow.toFixed(2)})`;
  ctx.fillRect(x + 14, y + 4, 5, 5);
  ctx.fillRect(x + enemy.w - 19, y + 4, 5, 5);
  ctx.fillStyle = "#111018";
  ctx.fillRect(x + 15, y + 5, 3, 3);
  ctx.fillRect(x + enemy.w - 18, y + 5, 3, 3);
  ctx.fillStyle = "rgba(255,240,100,0.8)";
  ctx.fillRect(x + 16, y + 5, 1, 1);
  ctx.fillRect(x + enemy.w - 17, y + 5, 1, 1);

  ctx.fillStyle = bossPalette.crown;
  ctx.fillRect(x + 12, y - 3, enemy.w - 24, 4);
  ctx.fillRect(x + 7, y - 1, 4, 5);
  ctx.fillRect(x + enemy.w - 11, y - 1, 4, 5);
  ctx.fillRect(x + 10, y - 6, 3, 5);
  ctx.fillRect(x + enemy.w - 13, y - 6, 3, 5);

  const step = enemy.animationFrame === 0 ? 0 : 3;
  ctx.fillStyle = "#2a101a";
  ctx.fillRect(x + 7 + step, y + enemy.h - 9, 8, 9);
  ctx.fillRect(x + enemy.w - 15 - step, y + enemy.h - 9, 8, 9);
  ctx.fillStyle = "#180810";
  ctx.fillRect(x + 6 + step, y + enemy.h - 4, 10, 4);
  ctx.fillRect(x + enemy.w - 16 - step, y + enemy.h - 4, 10, 4);
};

const drawItem = (ctx, item, cameraX, cameraY, timeSeconds) => {
  if (!item?.active) {
    return;
  }

  const x = round(item.x - cameraX);
  const y = round(item.y - cameraY);
  if (item.type === "coin") {
    const pulse = Math.sin(item.animationTimer * 9);
    const width = round(item.w * (0.42 + Math.abs(pulse) * 0.54));
    const offset = round((item.w - width) / 2);
    const shimmer = 0.4 + Math.abs(pulse) * 0.5;
    const glowAlpha = 0.18 + Math.abs(pulse) * 0.32;

    ctx.fillStyle = `rgba(255,220,60,${glowAlpha.toFixed(2)})`;
    ctx.fillRect(x + offset - 2, y - 2, width + 4, item.h + 4);

    ctx.fillStyle = "#ffe040";
    ctx.fillRect(x + offset, y, width, item.h);
    ctx.strokeStyle = "#a86810";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + offset, y, width, item.h);
    ctx.fillStyle = `rgba(255,255,200,${shimmer.toFixed(2)})`;
    ctx.fillRect(x + offset + 1, y + 1, Math.max(1, round(width * 0.5)), 3);
    return;
  }

  const bobY = Math.sin(timeSeconds * 3.5 + item.x * 0.05) * 2;
  ctx.fillStyle = "#e8c898";
  ctx.fillRect(x + 7, y + 8 + bobY, 10, 12);
  ctx.fillStyle = "#e84040";
  ctx.fillRect(x + 2, y + 2 + bobY, 20, 8);
  ctx.fillStyle = "#ff6060";
  ctx.fillRect(x + 3, y + 2 + bobY, 4, 3);
  ctx.fillRect(x + 17, y + 2 + bobY, 4, 3);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 5, y + 4 + bobY, 4, 3);
  ctx.fillRect(x + 15, y + 4 + bobY, 4, 3);
  ctx.fillStyle = "#b82828";
  ctx.fillRect(x + 3, y + 9 + bobY, 18, 1);
  const stemColor = "#22884a";
  ctx.fillStyle = stemColor;
  ctx.fillRect(x + 9, y + bobY, 6, 4);
};

const drawProjectile = (ctx, projectile, cameraX, cameraY, timeSeconds) => {
  if (!projectile?.active) {
    return;
  }
  const x = round(projectile.x - cameraX);
  const y = round(projectile.y - cameraY);
  const glow = 0.5 + (Math.sin(timeSeconds * 24 + projectile.x * 0.04) * 0.5 + 0.5) * 0.4;
  ctx.fillStyle = `rgba(255,100,30,${(glow * 0.7).toFixed(3)})`;
  ctx.fillRect(x - 2, y - 2, projectile.w + 4, projectile.h + 4);
  ctx.fillStyle = "#ff7020";
  ctx.fillRect(x, y, projectile.w, projectile.h);
  ctx.fillStyle = "#ffd060";
  ctx.fillRect(x + 2, y + 2, projectile.w - 4, projectile.h - 4);
  ctx.fillStyle = "rgba(255,255,200,0.8)";
  ctx.fillRect(x + 3, y + 3, 2, 2);
};

const drawGoal = (ctx, goalRect, cameraX, cameraY, accent, timeSeconds) => {
  if (!goalRect) {
    return;
  }
  const x = round(goalRect.x - cameraX);
  const y = round(goalRect.y - cameraY);
  const wave = Math.sin(timeSeconds * 6.5) * 3;
  const waveB = Math.sin(timeSeconds * 6.5 + 0.3) * 2;
  const cubePulse = 0.22 + (Math.sin(timeSeconds * 8.5) * 0.5 + 0.5) * 0.28;

  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(x + 11, y, 4, goalRect.h);
  ctx.fillStyle = "#908070";
  ctx.fillRect(x + 10, y, 4, goalRect.h);

  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(x + 10, y, 2, goalRect.h);

  ctx.fillStyle = accent;
  ctx.fillRect(x + 14, y + 5, 16 + wave, 12);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(x + 14, y + 5 + waveB, 16 + wave * 0.5, 3);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(x + 15, y + 6, 12 + wave * 0.4, 3);

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(x + 7, y + goalRect.h - 8, 10, 4);

  ctx.fillStyle = `rgba(255,255,255,${cubePulse.toFixed(2)})`;
  ctx.fillRect(x + 18, y - 10, 18, 18);
  ctx.fillStyle = accent;
  ctx.fillRect(x + 21, y - 7, 12, 12);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(x + 22, y - 6, 5, 3);
  ctx.fillRect(x + 31, y - 4, 3, 6);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(x + 24, y - 13, 8, 2);
};

const drawWindZones = (ctx, level, cameraX, cameraY, timeSeconds) => {
  if (!Array.isArray(level?.windZones)) {
    return;
  }
  for (const zone of level.windZones) {
    const rect = zoneToWorldRect(level, zone);
    const x = round(rect.x - cameraX);
    const y = round(rect.y - cameraY);
    const alpha = 0.08 + (Math.sin(timeSeconds * 3 + zone.x) * 0.5 + 0.5) * 0.08;
    ctx.fillStyle = `rgba(160,220,255,${alpha.toFixed(2)})`;
    ctx.fillRect(x, y, rect.w, rect.h);
    ctx.strokeStyle = "rgba(170,225,255,0.18)";
    ctx.strokeRect(x + 0.5, y + 0.5, rect.w - 1, rect.h - 1);
    for (let line = 0; line < 3; line += 1) {
      const ly = y + 10 + line * 10;
      const wave = Math.sin(timeSeconds * 8 + line + zone.y * 0.4) * 5;
      ctx.fillStyle = "rgba(220,245,255,0.35)";
      ctx.fillRect(x + 6 + wave, ly, rect.w - 12, 2);
    }
  }
};

const drawHazardZones = (ctx, level, cameraX, cameraY, timeSeconds) => {
  if (!Array.isArray(level?.hazardZones)) {
    return;
  }
  for (const zone of level.hazardZones) {
    const rect = zoneToWorldRect(level, zone);
    const x = round(rect.x - cameraX);
    const y = round(rect.y - cameraY);
    const pulse = 0.15 + (Math.sin(timeSeconds * 5 + zone.x) * 0.5 + 0.5) * 0.12;
    const fillColor = /acid|toxic/i.test(zone.type)
      ? `rgba(180,255,90,${pulse.toFixed(2)})`
      : `rgba(255,110,90,${pulse.toFixed(2)})`;
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, rect.w, rect.h);
    ctx.strokeStyle = /acid|toxic/i.test(zone.type)
      ? "rgba(210,255,150,0.32)"
      : "rgba(255,180,130,0.30)";
    ctx.strokeRect(x + 0.5, y + 0.5, rect.w - 1, rect.h - 1);
  }
};

const drawCheckpoints = (ctx, level, cameraX, cameraY, timeSeconds) => {
  if (!Array.isArray(level?.checkpoints)) {
    return;
  }
  for (const checkpoint of level.checkpoints) {
    const rect = checkpointToWorldRect(level, checkpoint);
    const x = round(rect.x - cameraX);
    const y = round(rect.y - cameraY);
    const bannerWave = Math.sin(timeSeconds * 7 + checkpoint.x * 0.3) * 3;
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(x + 8, y + 8, 3, rect.h - 8);
    ctx.fillStyle = checkpoint.active ? "#9df7e8" : "#8ea9d6";
    ctx.fillRect(x + 7, y + 8, 3, rect.h - 8);
    ctx.fillStyle = checkpoint.active ? "#5cffd1" : "#e8f2ff";
    ctx.fillRect(x + 10, y + 6, 12 + bannerWave, 9);
    ctx.fillStyle = checkpoint.active ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.14)";
    ctx.fillRect(x + 10, y + 6, 8, 2);
    if (checkpoint.active) {
      ctx.fillStyle = "rgba(150,255,225,0.16)";
      ctx.fillRect(x - 4, y + 2, 28, 16);
    }
  }
};

const drawEffects = (ctx, effects, cameraX, cameraY) => {
  for (const effect of effects || []) {
    if (!effect || effect.life <= 0) {
      continue;
    }
    const alpha = clamp(effect.life / effect.maxLife, 0, 1);
    const x = round(effect.x - cameraX);
    const y = round(effect.y - cameraY);
    ctx.fillStyle = effect.color.replace("__ALPHA__", alpha.toFixed(3));
    ctx.fillRect(x, y, effect.size, effect.size);
  }
};

const drawScanlines = (ctx) => {
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = "#05080f";
  for (let y = 0; y < VIEWPORT_HEIGHT; y += 3) {
    ctx.fillRect(0, y, VIEWPORT_WIDTH, 1);
  }
  const vignette = ctx.createRadialGradient(
    VIEWPORT_WIDTH * 0.5,
    VIEWPORT_HEIGHT * 0.5,
    VIEWPORT_HEIGHT * 0.24,
    VIEWPORT_WIDTH * 0.5,
    VIEWPORT_HEIGHT * 0.5,
    VIEWPORT_HEIGHT * 0.72
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.globalAlpha = 1;
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
  ctx.restore();
};

const resolvePalette = (state) => {
  const themeKey = state.level?.theme === "dusk" ? "dusk" : "day";
  const visualStyle = STYLE_OVERRIDES[state.level?.visualStyle]
    ? state.level.visualStyle
    : "classic";
  const palette = {
    ...THEMES[themeKey],
    ...STYLE_OVERRIDES[visualStyle]
  };
  const accent = ACCENTS[(state.levelTemplateIndex ?? state.levelIndex ?? 0) % ACCENTS.length];
  return { palette, accent, themeKey, visualStyle };
};

const timeBarColor = (ratio) => {
  if (ratio > 0.55) {
    return "#3ee878";
  }
  if (ratio > 0.28) {
    return "#f8c840";
  }
  return "#ff4848";
};

const drawHearts = (ctx, lives, x, y, palette) => {
  const maxShown = Math.min(lives, 5);
  for (let i = 0; i < maxShown; i += 1) {
    const hx = x + i * 15;
    ctx.fillStyle = "#ff4466";
    ctx.fillRect(hx + 2, y, 3, 2);
    ctx.fillRect(hx + 6, y, 3, 2);
    ctx.fillRect(hx, y + 2, 10, 3);
    ctx.fillRect(hx + 1, y + 5, 8, 2);
    ctx.fillRect(hx + 2, y + 7, 6, 2);
    ctx.fillRect(hx + 3, y + 9, 4, 1);
    ctx.fillRect(hx + 4, y + 10, 2, 1);
    ctx.fillStyle = "rgba(255,200,200,0.5)";
    ctx.fillRect(hx + 2, y + 1, 2, 2);
  }
  if (lives > 5) {
    drawText(ctx, `+${lives - 5}`, x + 76, y + 10, {
      font: "10px monospace",
      color: "#ff7798"
    });
  }
};

export default class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.canvas.width = VIEWPORT_WIDTH;
    this.canvas.height = VIEWPORT_HEIGHT;
    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false;
    }
  }

  drawBackground(state, paletteData, timeSeconds) {
    const ctx = this.ctx;
    const { palette, themeKey, visualStyle } = paletteData;
    const cameraX = state.camera.x || 0;

    const gradient = ctx.createLinearGradient(0, 0, 0, VIEWPORT_HEIGHT);
    gradient.addColorStop(0, palette.skyTop);
    gradient.addColorStop(0.38, palette.skyMid);
    gradient.addColorStop(0.78, palette.skyBottom);
    gradient.addColorStop(1, palette.ridge);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    ctx.fillStyle = palette.haze;
    ctx.fillRect(0, VIEWPORT_HEIGHT * 0.52, VIEWPORT_WIDTH, VIEWPORT_HEIGHT * 0.48);

    if (themeKey === "dusk" || visualStyle === "boss_arena" || visualStyle === "celestial") {
      drawStars(ctx, timeSeconds);
      ctx.fillStyle = "rgba(255,245,215,0.86)";
      ctx.fillRect(596, 50, 22, 22);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(590, 44, 34, 34);
    } else if (visualStyle !== "lava") {
      ctx.fillStyle = "rgba(255,248,180,0.90)";
      ctx.fillRect(586, 44, 38, 38);
      ctx.fillStyle = "rgba(255,255,220,0.25)";
      ctx.fillRect(580, 38, 50, 50);
    }

    const cloudOffset = ((cameraX * 0.18 + timeSeconds * 9) % (VIEWPORT_WIDTH + 130));
    if (visualStyle !== "boss_arena") {
      const cs = palette.cloud;
      const csh = palette.cloudShadow;
      drawCloud(ctx, 80 - cloudOffset, 68, 0.62, cs, csh);
      drawCloud(ctx, 340 - cloudOffset, 90, 0.50, cs, csh);
      drawCloud(ctx, 600 - cloudOffset, 62, 0.56, cs, csh);
      drawCloud(ctx, 860 - cloudOffset, 82, 0.48, cs, csh);
      if (cloudOffset < 120) {
        drawCloud(ctx, VIEWPORT_WIDTH + 80 - cloudOffset, 74, 0.44, cs, csh);
      }
    }

    const farOffset = (cameraX * 0.30) % 260;
    const snowCap = (visualStyle === "ice") ? "rgba(220,244,255,0.85)" : null;
    for (let i = -1; i < 6; i += 1) {
      drawMountain(ctx, i * 240 - farOffset, 342, 240, 148, palette.farMount, snowCap);
    }

    const nearOffset = (cameraX * 0.54) % 200;
    const snowCapN = (visualStyle === "ice") ? "rgba(240,252,255,0.75)" : null;
    for (let i = -1; i < 7; i += 1) {
      drawMountain(ctx, i * 190 - nearOffset, 366, 190, 118, palette.nearMount, snowCapN);
    }

    if (visualStyle === "fortress" || visualStyle === "boss_arena") {
      drawFortressBackdrop(ctx, "rgba(16, 20, 30, 0.55)", "rgba(10, 12, 20, 0.70)");
    }

    drawMidGroundLayer(ctx, cameraX, timeSeconds, palette, visualStyle);

    if (visualStyle === "ice") {
      drawSnowDrift(ctx, timeSeconds);
    }
    if (visualStyle === "storm") {
      drawRain(ctx, timeSeconds);
    }
    if (visualStyle === "lava" || visualStyle === "boss_arena") {
      drawEmbers(ctx, timeSeconds);
    }
    if (visualStyle === "celestial") {
      drawAurora(ctx, timeSeconds);
    }
    if (visualStyle === "toxic") {
      drawToxicFumes(ctx, timeSeconds);
    }
    if (visualStyle === "boss_arena") {
      drawLightning(ctx, timeSeconds);
    }

    ctx.fillStyle = palette.ridge;
    ctx.fillRect(0, 368, VIEWPORT_WIDTH, VIEWPORT_HEIGHT - 368);

    if (visualStyle === "lava") {
      drawLavaSea(ctx, timeSeconds, 380, "rgba(145, 42, 16, 0.94)", "rgba(255, 190, 100, 0.75)");
    } else if (visualStyle === "boss_arena") {
      drawLavaSea(ctx, timeSeconds, 372, "rgba(115, 30, 25, 0.97)", "rgba(255, 130, 80, 0.82)");
    } else if (visualStyle === "toxic") {
      drawLavaSea(ctx, timeSeconds, 382, "rgba(60, 92, 12, 0.92)", "rgba(205, 255, 120, 0.50)");
    }
  }

  drawLevel(state, paletteData, timeSeconds) {
    const level = state.level;
    if (!level) {
      return;
    }
    const ctx = this.ctx;
    const cameraX = state.camera.x || 0;
    const cameraY = state.camera.y || 0;
    const tileSize = level.tileSize;
    const startTx = Math.max(0, Math.floor(cameraX / tileSize) - 1);
    const endTx = Math.min(level.width - 1, Math.ceil((cameraX + VIEWPORT_WIDTH) / tileSize) + 1);
    const startTy = Math.max(0, Math.floor(cameraY / tileSize) - 1);
    const endTy = Math.min(level.height - 1, Math.ceil((cameraY + VIEWPORT_HEIGHT) / tileSize) + 1);

    for (let ty = startTy; ty <= endTy; ty += 1) {
      for (let tx = startTx; tx <= endTx; tx += 1) {
        const tileType = level.tiles[ty][tx];
        if (tileType === TILE_TYPES.EMPTY) {
          continue;
        }

        const screenX = round(tx * tileSize - cameraX);
        const screenY = round(ty * tileSize - cameraY);
        const block = level.questionBlocks.get(tileKey(tx, ty));

        drawTile(ctx, tileType, screenX, screenY, tileSize, {
          tx,
          ty,
          usedQuestionBlock: Boolean(block?.used),
          pulse: timeSeconds * 6,
          palette: paletteData.palette,
          accent: paletteData.accent
        });
      }
    }
  }

  drawWorldObjects(state, paletteData, timeSeconds) {
    const cameraX = state.camera.x || 0;
    const cameraY = state.camera.y || 0;
    drawWindZones(this.ctx, state.level, cameraX, cameraY, timeSeconds);
    drawHazardZones(this.ctx, state.level, cameraX, cameraY, timeSeconds);
    drawCheckpoints(this.ctx, state.level, cameraX, cameraY, timeSeconds);
    drawGoal(this.ctx, state.goalRect, cameraX, cameraY, paletteData.accent, timeSeconds);
    for (const item of state.items) {
      drawItem(this.ctx, item, cameraX, cameraY, timeSeconds);
    }
    for (const projectile of state.projectiles) {
      drawProjectile(this.ctx, projectile, cameraX, cameraY, timeSeconds);
    }
    for (const enemy of state.enemies) {
      if (enemy.type === "boss") {
        drawBoss(this.ctx, enemy, cameraX, cameraY, timeSeconds);
      } else {
        drawEnemy(this.ctx, enemy, cameraX, cameraY);
      }
    }
    drawPlayer(this.ctx, state.player, cameraX, cameraY, paletteData.accent, timeSeconds);
    drawEffects(this.ctx, state.effects, cameraX, cameraY);
  }

  drawHud(state, paletteData, timeSeconds) {
    const ctx = this.ctx;
    const { palette, accent } = paletteData;
    const coinProgress = state.coinsTotal > 0 ? state.coinsCollected / state.coinsTotal : 0;
    const timeProgress = state.timeLimit > 0 ? state.timeLeft / state.timeLimit : 0;
    const timeColor = timeBarColor(timeProgress);
    const timeUrgent = timeProgress < 0.28;
    const powerLabel = state.player.powerLevel > 0 ? "FIRE" : "BASE";
    const powerColor = state.player.powerLevel > 0 ? "#ff9940" : palette.textDim;
    const stageShort = (state.level?.name || `Stage ${state.levelIndex + 1}`).substring(0, 22);
    const biomeShort = (state.level?.biome || "Frontier").substring(0, 16);
    const windLabel = state.activeWind?.label || "Calm";
    const checkpointLabel = state.activeCheckpointId ? state.activeCheckpointId.toUpperCase() : "SPAWN";
    const difficulty = Math.max(1, Math.min(5, Number(state.level?.difficulty) || 1));
    const timeVal = Math.max(0, Math.ceil(state.timeLeft));
    const timeFlash = timeUrgent && Math.floor(timeSeconds * 4) % 2 === 0;

    drawPanel(ctx, 8, 6, VIEWPORT_WIDTH - 16, 44, palette.hudBg, palette.hudBorder, 4);
    ctx.fillStyle = palette.hudAccentBar || "rgba(120,200,255,0.12)";
    ctx.fillRect(11, 9, VIEWPORT_WIDTH - 22, 2);
    ctx.fillRect(11, 48, VIEWPORT_WIDTH - 22, 1);

    drawText(ctx, `${state.score}`, 22, 23, {
      font: "bold 14px monospace",
      color: accent,
      shadowColor: accent,
      shadowBlur: 4
    });
    drawText(ctx, "SCORE", 22, 33, {
      font: "9px monospace",
      color: palette.textDim
    });

    drawHearts(ctx, Math.max(0, state.lives), 108, 14, palette);
    drawText(ctx, "LIVES", 108, 33, {
      font: "9px monospace",
      color: palette.textDim
    });

    drawText(ctx, `${state.coinsCollected}/${state.coinsTotal}`, 332, 19, {
      font: "bold 12px monospace",
      color: "#ffe060"
    });
    drawText(ctx, "COINS", 332, 29, {
      font: "9px monospace",
      color: palette.textDim
    });
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fillRect(332, 33, 74, 5);
    ctx.fillStyle = "#ffe040";
    ctx.fillRect(332, 33, round(74 * clamp(coinProgress, 0, 1)), 5);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(332, 33, round(74 * clamp(coinProgress, 0, 1) * 0.5), 2);

    drawText(ctx, `${timeVal}s`, 420, 19, {
      font: "bold 12px monospace",
      color: timeFlash ? "#ffffff" : timeColor,
      shadowColor: timeUrgent ? timeColor : null,
      shadowBlur: timeUrgent ? 6 : 0
    });
    drawText(ctx, "TIME", 420, 29, {
      font: "9px monospace",
      color: palette.textDim
    });
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fillRect(420, 33, 74, 5);
    ctx.fillStyle = timeColor;
    ctx.fillRect(420, 33, round(74 * clamp(timeProgress, 0, 1)), 5);

    drawText(ctx, `ROUTE ${state.levelIndex + 1}/${state.levelCount}  ${stageShort}`, 162, 19, {
      font: "bold 10px monospace",
      color: "rgba(220,240,255,0.9)"
    });
    drawText(ctx, `${biomeShort}  CP ${checkpointLabel}`, 162, 31, {
      font: "9px monospace",
      color: state.activeCheckpointId ? "#9ff0d6" : palette.textDim
    });

    drawText(ctx, `WIND ${windLabel.toUpperCase()}`, VIEWPORT_WIDTH - 14, 19, {
      font: "9px monospace",
      color: state.activeWind ? "#aeeeff" : palette.textDim,
      align: "right"
    });
    drawText(ctx, `POWER ${powerLabel}`, VIEWPORT_WIDTH - 14, 31, {
      font: "bold 9px monospace",
      color: powerColor,
      align: "right"
    });
    for (let index = 0; index < 5; index += 1) {
      ctx.fillStyle = index < difficulty ? accent : "rgba(255,255,255,0.12)";
      ctx.fillRect(VIEWPORT_WIDTH - 74 + index * 10, 38, 6, 5);
    }

    if (state.activeBoss) {
      const bossRatio = state.activeBoss.maxHealth > 0
        ? clamp(state.activeBoss.health / state.activeBoss.maxHealth, 0, 1)
        : 0;
      const bossBarX = 134;
      const bossBarW = VIEWPORT_WIDTH - 268;
      drawPanel(ctx, bossBarX - 5, 52, bossBarW + 10, 16, "rgba(28, 6, 8, 0.74)", "rgba(255, 110, 110, 0.50)", 2);
      const bossVariant = (state.activeBoss.variant || "juggernaut").toUpperCase();
      const bossLabel = `BOSS ${state.activeBoss.name.toUpperCase()} ${bossVariant} ${state.activeBoss.health}/${state.activeBoss.maxHealth}`;
      drawText(ctx, bossLabel, VIEWPORT_WIDTH * 0.5, 63, {
        align: "center",
        font: "bold 9px monospace",
        color: "#ffc8c8"
      });
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(bossBarX, 56, bossBarW, 4);
      const bossFill = round(bossBarW * bossRatio);
      if (bossFill > 0) {
        ctx.fillStyle = `hsl(${Math.round(bossRatio * 30)},100%,48%)`;
        ctx.fillRect(bossBarX, 56, bossFill, 4);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(bossBarX, 56, round(bossFill * 0.55), 1);
      }
    }
  }

  drawMessage(state, paletteData) {
    if (!state.message) {
      return;
    }
    const msg = state.message;
    let msgColor = "#d8f0ff";
    let panelColor = "rgba(8, 16, 26, 0.62)";

    if (/boss|defeated|warden|titan|overseer/i.test(msg)) {
      msgColor = "#ffb0b0";
      panelColor = "rgba(30, 6, 8, 0.68)";
    } else if (/coin|collected|hidden/i.test(msg)) {
      msgColor = "#ffe878";
      panelColor = "rgba(24, 16, 4, 0.60)";
    } else if (/power.up|fire|mushroom/i.test(msg)) {
      msgColor = "#9aefb8";
      panelColor = "rgba(4, 20, 10, 0.60)";
    } else if (/checkpoint|spring|wind/i.test(msg)) {
      msgColor = "#9fe8ff";
      panelColor = "rgba(6, 18, 28, 0.62)";
    } else if (/fell|time|void|lives|no lives/i.test(msg)) {
      msgColor = "#ff8888";
      panelColor = "rgba(30, 6, 6, 0.68)";
    }

    drawPanel(this.ctx, 10, VIEWPORT_HEIGHT - 34, VIEWPORT_WIDTH - 20, 22, panelColor, null, 3);
    drawText(this.ctx, msg, 20, VIEWPORT_HEIGHT - 18, {
      font: "12px monospace",
      color: msgColor
    });
  }

  drawOverlay(state, paletteData, timeSeconds) {
    if (state.screen === SCREENS.PLAYING) {
      return;
    }

    const ctx = this.ctx;
    ctx.fillStyle = "rgba(4, 7, 14, 0.66)";
    ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    const { palette, accent } = paletteData;
    drawPanel(ctx, 96, 78, 576, 282, "rgba(7, 12, 22, 0.94)", palette.hudBorder, 6);
    ctx.fillStyle = palette.hudAccentBar || "rgba(120,200,255,0.12)";
    ctx.fillRect(100, 82, 568, 3);

    const title =
      state.screen === SCREENS.START
        ? "SKY RUNNER DX"
        : state.screen === SCREENS.LEVEL_COMPLETE
          ? "STAGE CLEAR!"
          : state.screen === SCREENS.GAME_COMPLETE
            ? "CAMPAIGN COMPLETE!"
            : "RUN FAILED";

    const titleColor =
      state.screen === SCREENS.GAME_COMPLETE
        ? "#80ff98"
        : state.screen === SCREENS.GAME_OVER
          ? "#ff7070"
          : "#d8f0ff";

    drawText(ctx, title, VIEWPORT_WIDTH / 2, 120, {
      align: "center",
      font: "bold 26px monospace",
      color: titleColor,
      shadowColor: titleColor,
      shadowBlur: 10
    });

    if (state.screen === SCREENS.LEVEL_COMPLETE || state.screen === SCREENS.GAME_COMPLETE) {
      drawText(ctx, `Score: ${state.score}`, VIEWPORT_WIDTH / 2, 148, {
        align: "center",
        font: "14px monospace",
        color: accent
      });
    }

    const subtitle =
      state.screen === SCREENS.START
        ? `${state.levelCount}-sector route · 32 handcrafted stages · bosses, wind, checkpoints and springs`
        : state.screen === SCREENS.LEVEL_COMPLETE
          ? `Loading next stage... (${state.levelIndex + 2}/${state.levelCount})`
          : state.screen === SCREENS.GAME_COMPLETE
            ? "All bosses defeated! Press Enter for a new route."
            : `Lives ran out. Score: ${state.score} · Press Enter to retry.`;

    drawText(ctx, subtitle, VIEWPORT_WIDTH / 2, state.screen === SCREENS.LEVEL_COMPLETE ? 170 : 162, {
      align: "center",
      font: "13px monospace",
      color: "rgba(185,210,240,0.90)"
    });

    if (state.screen === SCREENS.START) {
      const controls = [
        { key: "A / D  or  ← →", label: "Move" },
        { key: "W / ↑ / Space",  label: "Jump  (hold = higher)" },
        { key: "F / B",          label: "Fire  (needs power-up)" },
        { key: "Springs / Wind", label: "Use stage mechanics to recover routes" },
        { key: "R",              label: "Restart current sector" }
      ];
      controls.forEach((ctrl, i) => {
        const cy = 186 + i * 22;
        drawPanel(ctx, 150, cy - 14, 468, 20, "rgba(255,255,255,0.04)", null, 3);
        drawText(ctx, ctrl.key, 246, cy, {
          font: "bold 12px monospace",
          color: "#97f0c0",
          align: "right"
        });
        drawText(ctx, `  ${ctrl.label}`, 250, cy, {
          font: "12px monospace",
          color: "#c0d8f0"
        });
      });

      drawText(ctx, "Objective: clear every sector, touch checkpoints and capture the cube beacon.", VIEWPORT_WIDTH / 2, 306, {
        align: "center",
        font: "12px monospace",
        color: "#ffe89a"
      });
    }

    drawPanel(ctx, 200, 326, 368, 24, "rgba(255,255,255,0.06)", null, 4);
    drawText(ctx, "Enter / Jump: Start    |    R: Restart", VIEWPORT_WIDTH / 2, 341, {
      align: "center",
      font: "12px monospace",
      color: accent
    });
  }

  render(state) {
    if (!this.ctx) {
      return;
    }
    const timeSeconds = (state.elapsedMs || 0) / 1000;
    const paletteData = resolvePalette(state);

    this.drawBackground(state, paletteData, timeSeconds);
    this.drawLevel(state, paletteData, timeSeconds);
    this.drawWorldObjects(state, paletteData, timeSeconds);
    this.drawHud(state, paletteData, timeSeconds);
    this.drawMessage(state, paletteData);
    this.drawOverlay(state, paletteData, timeSeconds);
    drawScanlines(this.ctx);
  }
}
