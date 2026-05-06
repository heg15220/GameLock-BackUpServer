
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../utils/useGameRuntimeBridge";

const WIDTH = 900;
const HEIGHT = 560;
const STEP_MS = 1000 / 60;
const STEP_SECONDS = 1 / 60;

const FIELD = {
  groundY: 420,
  left: 36,
  right: 864,
  ceilingY: 94,
  goalWidth: 65,
  goalHeight: 122,
  ballRadius: 17,
  goalTop: 420 - 122,
};

const PHYSICS = {
  playerGravity: 0.5,
  ballGravity: 0.34,
  bounce: 0.64,
  friction: 0.992,
  speed: 4.8,
  jumpVelocity: -14.6,
  playerHalfWidth: 22,
};

const MATCH_OPTIONS = [45, 60, 90];
const TOURNAMENT_MATCH_OPTIONS = [45, 60, 75, 90];

function resolveSoccerLocale(localeCandidate) {
  const probe =
    typeof localeCandidate === "string" && localeCandidate.trim()
      ? localeCandidate
      : typeof navigator !== "undefined"
        ? navigator.language
        : "en";
  return String(probe).toLowerCase().startsWith("es") ? "es" : "en";
}

function getRoundDisplayLabel(round, localeCandidate) {
  const locale = resolveSoccerLocale(localeCandidate);
  return locale === "es" ? round.labelEs : round.labelEn;
}

function getSingleMatchLabel(localeCandidate) {
  return resolveSoccerLocale(localeCandidate) === "es" ? "Partido unico" : "Single match";
}

function getTournamentModeLabel(localeCandidate) {
  return resolveSoccerLocale(localeCandidate) === "es" ? "Torneo" : "Tournament";
}

function getTournamentPathText(localeCandidate) {
  return resolveSoccerLocale(localeCandidate) === "es"
    ? "octavos, cuartos, semifinal y final"
    : "Round of 16, quarterfinals, semifinals, and final";
}

function getSponsorBannerCopy(localeCandidate) {
  return resolveSoccerLocale(localeCandidate) === "es"
    ? {
        question: "Te gusta la F1?",
        answer: "overcutf1.com",
      }
    : {
        question: "Like F1?",
        answer: "overcutf1.com",
      };
}

const GAME_MODE_OPTIONS = [
  { id: "single", label: "Single match" },
  { id: "tournament", label: "Tournament" },
];

const TOURNAMENT_ROUNDS = [
  {
    id: "round16",
    labelEs: "Octavos de final",
    labelEn: "Round of 16",
    matchCount: 8,
    difficultyId: "rookie",
    duration: 45,
  },
  {
    id: "quarterfinal",
    labelEs: "Cuartos de final",
    labelEn: "Quarterfinals",
    matchCount: 4,
    difficultyId: "pro",
    duration: 60,
  },
  {
    id: "semifinal",
    labelEs: "Semifinal",
    labelEn: "Semifinals",
    matchCount: 2,
    difficultyId: "elite",
    duration: 75,
  },
  {
    id: "final",
    labelEs: "Final",
    labelEn: "Final",
    matchCount: 1,
    difficultyId: "elite",
    duration: 90,
  },
];

const DIFFICULTIES = {
  rookie: {
    id: "rookie",
    label: "Rookie",
    reactionSeconds: 0.34,
    anticipation: 14,
    minX: 370,
    jumpRange: 108,
    jumpOffset: 8,
    chargeDistance: 68,
    chargeChance: 0.22,
    releaseMin: 0.24,
    releaseMax: 0.4,
  },
  pro: {
    id: "pro",
    label: "Pro",
    reactionSeconds: 0.24,
    anticipation: 20,
    minX: 360,
    jumpRange: 116,
    jumpOffset: 5,
    chargeDistance: 72,
    chargeChance: 0.30,
    releaseMin: 0.19,
    releaseMax: 0.36,
    predictionDepth: 0.95,
    headerLead: 0.28,
    headerReach: 62,
    chargeLeadMin: 0.20,
    chargeLeadMax: 0.40,
    chargeReach: 50,
    aggressionBase: 0.46,
    panicReleaseShift: -0.04,
    protectGuardX: 234,
  },
  elite: {
    id: "elite",
    label: "Elite",
    reactionSeconds: 0.13,
    anticipation: 30,
    minX: 330,
    jumpRange: 142,
    jumpOffset: -2,
    chargeDistance: 92,
    chargeChance: 0.55,
    releaseMin: 0.09,
    releaseMax: 0.2,
    predictionDepth: 1.6,
    headerLead: 0.2,
    headerReach: 80,
    chargeLeadMin: 0.13,
    chargeLeadMax: 0.52,
    chargeReach: 74,
    aggressionBase: 0.72,
    panicReleaseShift: -0.08,
    protectGuardX: 200,
  },
};

const TOURNAMENT_CHARACTERS = [
  {
    id: "volt",
    name: "Volt Vega",
    flag: "ESP",
    skinLight: "#ffd9b5",
    skinDark: "#cd8650",
    hair: "#1e293b",
    jersey: "#1d4ed8",
    shorts: "#1e3a8a",
    boots: "#111827",
    accent: "#93c5fd",
    brow: "#1f2937",
    eye: "#0f172a",
    bald: false,
    rating: 84,
  },
  {
    id: "nova",
    name: "Nova Kim",
    flag: "KOR",
    skinLight: "#f7cfab",
    skinDark: "#cf8756",
    hair: "#111827",
    jersey: "#dc2626",
    shorts: "#991b1b",
    boots: "#0f172a",
    accent: "#fecaca",
    brow: "#1f2937",
    eye: "#111827",
    bald: false,
    rating: 82,
  },
  {
    id: "atlas",
    name: "Atlas Mamba",
    flag: "CMR",
    skinLight: "#ad6a3e",
    skinDark: "#6c3f24",
    hair: "#1f0f08",
    jersey: "#16a34a",
    shorts: "#166534",
    boots: "#2b2b2b",
    accent: "#bbf7d0",
    brow: "#20120a",
    eye: "#120a05",
    bald: true,
    rating: 83,
  },
  {
    id: "zen",
    name: "Zen Ito",
    flag: "JPN",
    skinLight: "#f0c59e",
    skinDark: "#bb7b45",
    hair: "#111111",
    jersey: "#7c3aed",
    shorts: "#5b21b6",
    boots: "#111827",
    accent: "#ddd6fe",
    brow: "#1e1b4b",
    eye: "#111111",
    bald: false,
    rating: 80,
  },
  {
    id: "rio",
    name: "Rio Blaze",
    flag: "BRA",
    skinLight: "#efbe90",
    skinDark: "#b66a35",
    hair: "#2f1a10",
    jersey: "#059669",
    shorts: "#065f46",
    boots: "#1f2937",
    accent: "#a7f3d0",
    brow: "#3f1f12",
    eye: "#1b130f",
    bald: false,
    rating: 81,
  },
  {
    id: "onyx",
    name: "Onyx Storm",
    flag: "USA",
    skinLight: "#cf8a5d",
    skinDark: "#7f4a2f",
    hair: "#0b0f1a",
    jersey: "#ea580c",
    shorts: "#9a3412",
    boots: "#111827",
    accent: "#fed7aa",
    brow: "#111827",
    eye: "#0f172a",
    bald: false,
    rating: 79,
  },
  {
    id: "luna",
    name: "Luna Frost",
    flag: "ARG",
    skinLight: "#ffd7bc",
    skinDark: "#c5815a",
    hair: "#0f172a",
    jersey: "#0ea5e9",
    shorts: "#0369a1",
    boots: "#1e293b",
    accent: "#bae6fd",
    brow: "#0f172a",
    eye: "#082f49",
    bald: false,
    rating: 85,
  },
  {
    id: "rajin",
    name: "Rajin Bolt",
    flag: "NGA",
    skinLight: "#be7a4f",
    skinDark: "#6a3d26",
    hair: "#22120c",
    jersey: "#eab308",
    shorts: "#a16207",
    boots: "#292524",
    accent: "#fde68a",
    brow: "#29140a",
    eye: "#1c1009",
    bald: true,
    rating: 86,
  },
];

const QUALIFIER_PROFILES = Array.from({ length: 8 }, (_, index) => {
  const palette = [
    ["#60a5fa", "#1d4ed8"],
    ["#f472b6", "#be185d"],
    ["#34d399", "#0f766e"],
    ["#f59e0b", "#b45309"],
    ["#a78bfa", "#6d28d9"],
    ["#f87171", "#b91c1c"],
    ["#22d3ee", "#0e7490"],
    ["#4ade80", "#166534"],
  ][index];

  return {
    id: `qualifier-${index + 1}`,
    name: `Qualifier ${index + 1}`,
    flag: "CPU",
    skinLight: "#efbf8f",
    skinDark: "#b97645",
    hair: "#1f2937",
    jersey: palette[0],
    shorts: palette[1],
    boots: "#1f2937",
    accent: "#e2e8f0",
    brow: "#111827",
    eye: "#111827",
    bald: index % 2 === 0,
    rating: 70 + index,
  };
});

const DEFAULT_SINGLE_PLAYER_ID = TOURNAMENT_CHARACTERS[0].id;
const DEFAULT_SINGLE_CPU_ID = TOURNAMENT_CHARACTERS[2].id;
const ALL_PROFILES = [...TOURNAMENT_CHARACTERS, ...QUALIFIER_PROFILES];
const PROFILE_BY_ID = new Map(ALL_PROFILES.map((profile) => [profile.id, profile]));

function createRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function formatClock(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function shuffleList(values, random = Math.random) {
  const next = [...values];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function getProfileById(profileId, fallbackId = DEFAULT_SINGLE_PLAYER_ID) {
  return PROFILE_BY_ID.get(profileId) || PROFILE_BY_ID.get(fallbackId) || TOURNAMENT_CHARACTERS[0];
}

function createTournamentMatch(matchId) {
  return {
    id: matchId,
    homeId: null,
    awayId: null,
    homeScore: null,
    awayScore: null,
    winnerId: null,
    played: false,
    simulated: false,
    containsPlayer: false,
  };
}

function createEmptyTournament(playerCharacterId = DEFAULT_SINGLE_PLAYER_ID, localeCandidate = "en") {
  const locale = resolveSoccerLocale(localeCandidate);
  return {
    active: false,
    status: "idle",
    playerCharacterId,
    currentRoundIndex: 0,
    currentMatchIndex: -1,
    rounds: TOURNAMENT_ROUNDS.map((round) => ({
      id: round.id,
      label: getRoundDisplayLabel(round, locale),
      matchCount: round.matchCount,
      difficultyId: round.difficultyId,
      duration: round.duration,
      matches: Array.from({ length: round.matchCount }, (_, index) => createTournamentMatch(`${round.id}-${index + 1}`)),
    })),
    summary: null,
    celebrationTimer: 0,
  };
}

function winnerFromRatings(homeId, awayId, random = Math.random) {
  const homeRating = getProfileById(homeId).rating || 75;
  const awayRating = getProfileById(awayId).rating || 75;
  const total = homeRating + awayRating;
  if (total <= 0) {
    return random() < 0.5 ? "home" : "away";
  }
  return random() < homeRating / total ? "home" : "away";
}

function buildScoreline(homeWins, random = Math.random) {
  const loserGoals = Math.floor(random() * 3);
  const winnerGoals = loserGoals + 1 + Math.floor(random() * 3);
  return homeWins
    ? { homeScore: winnerGoals, awayScore: loserGoals }
    : { homeScore: loserGoals, awayScore: winnerGoals };
}

function applyMatchResult(match, homeScore, awayScore, winnerId, simulated) {
  match.homeScore = homeScore;
  match.awayScore = awayScore;
  match.winnerId = winnerId;
  match.played = true;
  match.simulated = simulated;
}

function resolveSimulatedMatch(match, random = Math.random) {
  if (!match.homeId || !match.awayId) {
    return;
  }
  const winnerSide = winnerFromRatings(match.homeId, match.awayId, random);
  const scoreline = buildScoreline(winnerSide === "home", random);
  const winnerId = winnerSide === "home" ? match.homeId : match.awayId;
  applyMatchResult(match, scoreline.homeScore, scoreline.awayScore, winnerId, true);
}

function buildTournament(playerCharacterId, seed = Date.now(), localeCandidate = "en") {
  const locale = resolveSoccerLocale(localeCandidate);
  const tournament = createEmptyTournament(playerCharacterId, locale);
  const random = createRandom(seed >>> 0);

  const remaining = TOURNAMENT_CHARACTERS
    .map((character) => character.id)
    .filter((characterId) => characterId !== playerCharacterId);
  const seededCharacters = shuffleList([playerCharacterId, ...remaining], random);
  const qualifiers = shuffleList(QUALIFIER_PROFILES.map((profile) => profile.id), random);

  const firstRound = tournament.rounds[0];
  firstRound.matches.forEach((match, index) => {
    match.homeId = seededCharacters[index];
    match.awayId = qualifiers[index];
    match.containsPlayer = match.homeId === playerCharacterId || match.awayId === playerCharacterId;
  });

  tournament.active = true;
  tournament.status = "active";
  tournament.currentRoundIndex = 0;
  tournament.currentMatchIndex = firstRound.matches.findIndex((match) => match.containsPlayer);
  tournament.summary = {
    title: locale === "es" ? "Cuadro listo" : "Bracket seeded",
    text:
      locale === "es"
        ? `${firstRound.label} listos. Empieza tu primer cruce.`
        : `${firstRound.label} ready. Start your first tie.`,
    accent: "#38bdf8",
  };

  return tournament;
}

function hydrateNextRound(tournament, nextRoundIndex, playerCharacterId, random = Math.random) {
  if (nextRoundIndex <= 0 || nextRoundIndex >= tournament.rounds.length) {
    return;
  }

  const previousRound = tournament.rounds[nextRoundIndex - 1];
  const nextRound = tournament.rounds[nextRoundIndex];

  nextRound.matches.forEach((match, index) => {
    const left = previousRound.matches[index * 2];
    const right = previousRound.matches[index * 2 + 1];
    match.homeId = left?.winnerId || null;
    match.awayId = right?.winnerId || null;
    match.containsPlayer = match.homeId === playerCharacterId || match.awayId === playerCharacterId;
  });

  tournament.currentRoundIndex = nextRoundIndex;
  tournament.currentMatchIndex = nextRound.matches.findIndex((match) => match.containsPlayer);

  nextRound.matches.forEach((match, index) => {
    if (index !== tournament.currentMatchIndex && match.homeId && match.awayId && !match.played) {
      resolveSimulatedMatch(match, random);
    }
  });
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke = "#111111", lineWidth = 2) {
  ctx.beginPath();
  roundedRectPath(ctx, x, y, width, height, radius);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function getCanvasRenderMetrics(canvas) {
  if (!canvas || typeof window === "undefined") {
    return null;
  }

  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(1, rect.width || canvas.clientWidth || WIDTH);
  const cssHeight = Math.max(1, rect.height || canvas.clientHeight || HEIGHT);
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2.5));
  const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
  const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));

  return {
    pixelWidth,
    pixelHeight,
    scaleX: pixelWidth / WIDTH,
    scaleY: pixelHeight / HEIGHT,
  };
}

function syncCanvasResolution(canvas, ctx) {
  const metrics = getCanvasRenderMetrics(canvas);
  if (!canvas || !ctx || !metrics) {
    return null;
  }

  if (canvas.width !== metrics.pixelWidth || canvas.height !== metrics.pixelHeight) {
    canvas.width = metrics.pixelWidth;
    canvas.height = metrics.pixelHeight;
  }

  ctx.setTransform(metrics.scaleX, 0, 0, metrics.scaleY, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return metrics;
}

function buildCrowdLayer(renderScale = 1) {
  const scale = Math.max(1, renderScale);
  const layer = document.createElement("canvas");
  layer.width = Math.max(1, Math.round(WIDTH * scale));
  layer.height = Math.max(1, Math.round(260 * scale));
  const ctx = layer.getContext("2d");
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const skyGradient = ctx.createLinearGradient(0, 0, 0, 130);
  skyGradient.addColorStop(0, "#6ec6f5");
  skyGradient.addColorStop(1, "#b8e4f9");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, WIDTH, 260);

  const cloud = (x, y, radius) => {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + radius * 0.7, y + radius * 0.2, radius * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - radius * 0.6, y + radius * 0.25, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  cloud(120, 40, 28);
  cloud(340, 25, 22);
  cloud(600, 35, 32);
  cloud(820, 28, 20);

  ctx.fillStyle = "#8a9aaa";
  ctx.fillRect(0, 60, WIDTH, 60);
  ctx.fillStyle = "#6a7a8a";
  ctx.fillRect(0, 120, WIDTH, 40);
  ctx.fillStyle = "#9aaa8a";
  ctx.fillRect(0, 160, WIDTH, 50);
  ctx.fillStyle = "#7a8a6a";
  ctx.fillRect(0, 210, WIDTH, 50);
  ctx.fillStyle = "#556";
  ctx.fillRect(0, 117, WIDTH, 5);
  ctx.fillStyle = "#667";
  ctx.fillRect(0, 157, WIDTH, 5);
  ctx.fillStyle = "#445";
  ctx.fillRect(0, 207, WIDTH, 5);

  const random = createRandom(71237);
  const colors = [
    "#e74c3c",
    "#3498db",
    "#2ecc71",
    "#f39c12",
    "#9b59b6",
    "#1abc9c",
    "#e67e22",
    "#16a085",
    "#d35400",
    "#2980b9",
    "#8e44ad",
    "#27ae60",
    "#c0392b",
    "#2c3e50",
    "#f1c40f",
  ];
  const skins = ["#fddbb4", "#f0b27a", "#d4955a", "#c27b3e", "#8d5524", "#5c3317"];
  const rows = [
    { y: 90, n: 80, size: 12 },
    { y: 108, n: 80, size: 11 },
    { y: 130, n: 75, size: 12 },
    { y: 148, n: 75, size: 11 },
    { y: 175, n: 70, size: 13 },
    { y: 195, n: 70, size: 12 },
    { y: 220, n: 65, size: 14 },
    { y: 243, n: 65, size: 13 },
  ];

  const pick = (list) => list[Math.floor(random() * list.length)];

  rows.forEach((row) => {
    const step = WIDTH / row.n;
    for (let i = 0; i < row.n; i += 1) {
      const x = i * step + step / 2 + (random() - 0.5) * 4;
      const y = row.y + (random() - 0.5) * 3;
      const skin = pick(skins);
      const shirt = pick(colors);
      const radius = row.size;

      ctx.fillStyle = shirt;
      ctx.beginPath();
      ctx.ellipse(x, y + radius * 0.5, radius * 0.65, radius * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(x, y - radius * 0.1, radius * 0.52, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = random() > 0.4 ? "#1a0a00" : "#4a2a10";
      ctx.beginPath();
      ctx.arc(x, y - radius * 0.2, radius * 0.48, Math.PI * 0.9, 0);
      ctx.fill();

      if (random() > 0.82) {
        ctx.fillStyle = pick(colors);
        ctx.fillRect(x - radius * 0.15, y - radius * 1.8, radius * 0.3, radius * 0.9);
        ctx.fillRect(x - radius * 0.5, y - radius * 2, radius, radius * 0.35);
      }
    }
  });

  return layer;
}

function drawField(ctx, crowdLayer, localeCandidate) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.drawImage(crowdLayer, 0, 0, WIDTH, 260);

  const sponsorCopy = getSponsorBannerCopy(localeCandidate);
  const banners = [
    {
      background: "#0f172a",
      foreground: "#f8fafc",
      text: sponsorCopy.question,
      width: 210,
      fontSize: 14,
      textAlign: "center",
    },
    {
      background: "#1d4ed8",
      foreground: "#eff6ff",
      text: sponsorCopy.answer,
      width: 280,
      fontSize: 13,
      textAlign: "center",
    },
    { background: "#153a29", foreground: "#f8fafc", text: "HEAD SOCCER PRO", width: 220, fontSize: 11 },
    { background: "#b91c1c", foreground: "#fef2f2", text: "LIVE MATCH", width: 190, fontSize: 11 },
  ];

  let bannerX = 0;
  const bannerY = 258;
  const bannerHeight = 36;
  banners.forEach((banner) => {
    ctx.fillStyle = banner.background;
    ctx.fillRect(bannerX, bannerY, banner.width, bannerHeight);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.strokeRect(bannerX, bannerY, banner.width, bannerHeight);
    ctx.fillStyle = banner.foreground;
    ctx.font = `700 ${banner.fontSize || 13}px 'Bricolage Grotesque', sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = banner.textAlign || "left";
    const textX = (banner.textAlign || "left") === "center" ? bannerX + banner.width / 2 : bannerX + 8;
    ctx.fillText(banner.text, textX, bannerY + bannerHeight / 2);
    bannerX += banner.width;
  });

  const wallTop = 294;
  const wallBottom = FIELD.groundY - 34;
  const turfTop = FIELD.groundY - 22;

  const wallGradient = ctx.createLinearGradient(0, wallTop, 0, wallBottom);
  wallGradient.addColorStop(0, "#535e6f");
  wallGradient.addColorStop(0.55, "#3f4a59");
  wallGradient.addColorStop(1, "#2e3948");
  ctx.fillStyle = wallGradient;
  ctx.fillRect(0, wallTop, WIDTH, wallBottom - wallTop);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1;
  for (let rib = 0; rib <= 14; rib += 1) {
    const x = (rib * WIDTH) / 14;
    ctx.beginPath();
    ctx.moveTo(x, wallTop + 8);
    ctx.lineTo(x, wallBottom - 6);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(18, 25, 36, 0.5)";
  ctx.fillRect(0, wallBottom - 24, WIDTH, 24);

  const turfGradient = ctx.createLinearGradient(0, turfTop, 0, HEIGHT);
  turfGradient.addColorStop(0, "#389f45");
  turfGradient.addColorStop(0.45, "#2f9640");
  turfGradient.addColorStop(1, "#287f38");
  ctx.fillStyle = turfGradient;
  ctx.fillRect(0, turfTop, WIDTH, HEIGHT - turfTop);

  const stripeCount = 8;
  for (let stripe = 0; stripe < stripeCount; stripe += 1) {
    const y = turfTop + (stripe * (HEIGHT - turfTop)) / stripeCount;
    const h = (HEIGHT - turfTop) / stripeCount;
    ctx.fillStyle = stripe % 2 === 0 ? "rgba(255, 255, 255, 0.045)" : "rgba(0, 0, 0, 0.04)";
    ctx.fillRect(0, y, WIDTH, h);
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(FIELD.left, turfTop + 8);
  ctx.lineTo(FIELD.right, turfTop + 8);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(FIELD.left, FIELD.groundY + 1);
  ctx.lineTo(FIELD.right, FIELD.groundY + 1);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(WIDTH / 2, FIELD.groundY - 13);
  ctx.lineTo(WIDTH / 2, FIELD.groundY + 10);
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 255, 255, 0.58)";
  ctx.beginPath();
  ctx.ellipse(WIDTH / 2, FIELD.groundY - 2, 10, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.fillRect(FIELD.left + 108, FIELD.groundY - 3, 16, 2.5);
  ctx.fillRect(FIELD.right - 124, FIELD.groundY - 3, 16, 2.5);

  const foregroundShade = ctx.createLinearGradient(0, FIELD.groundY + 12, 0, HEIGHT);
  foregroundShade.addColorStop(0, "rgba(0, 0, 0, 0)");
  foregroundShade.addColorStop(1, "rgba(0, 0, 0, 0.16)");
  ctx.fillStyle = foregroundShade;
  ctx.fillRect(0, FIELD.groundY + 8, WIDTH, HEIGHT - FIELD.groundY - 8);
}

function drawGoals(ctx) {
  const post = 14;
  const netCell = 10;
  const goalDepth = 56;

  const drawCheckeredPost = (x, y, width, height) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, width, height);

    const cell = Math.max(10, Math.floor(Math.min(width, height) / 2) * 2);
    const columns = Math.ceil(width / cell);
    const rows = Math.ceil(height / cell);

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        if ((row + column) % 2 === 0) {
          ctx.fillStyle = "#dd1111";
          ctx.fillRect(
            x + column * cell,
            y + row * cell,
            Math.min(cell, width - column * cell),
            Math.min(cell, height - row * cell)
          );
        }
      }
    }

    ctx.strokeStyle = "#aaaaaa";
    ctx.lineWidth = 1.4;
    ctx.strokeRect(x, y, width, height);
  };

  const drawGoal = (isLeft) => {
    const nearX = isLeft ? FIELD.left : FIELD.right;
    const depthDir = isLeft ? -1 : 1;
    const backX = nearX + depthDir * goalDepth;
    const goalTop = FIELD.goalTop;
    const goalBottom = FIELD.groundY;
    const backTop = goalTop + 8;
    const backBottom = goalBottom + 6;

    const frameX = Math.min(nearX, backX) - post / 2;
    const frameWidth = Math.abs(backX - nearX) + post;

    ctx.fillStyle = "rgba(14, 54, 25, 0.38)";
    ctx.beginPath();
    ctx.moveTo(nearX, goalTop);
    ctx.lineTo(backX, backTop);
    ctx.lineTo(backX, backBottom);
    ctx.lineTo(nearX, goalBottom);
    ctx.closePath();
    ctx.fill();

    const netRows = Math.max(8, Math.floor(FIELD.goalHeight / netCell));
    ctx.strokeStyle = "rgba(255, 255, 255, 0.56)";
    ctx.lineWidth = 0.85;
    for (let row = 0; row <= netRows; row += 1) {
      const t = row / netRows;
      const yFront = goalTop + t * (goalBottom - goalTop);
      const yBack = backTop + t * (backBottom - backTop);
      ctx.beginPath();
      ctx.moveTo(nearX, yFront);
      ctx.lineTo(backX, yBack);
      ctx.stroke();
    }

    const netCols = Math.max(4, Math.floor(goalDepth / netCell));
    for (let column = 0; column <= netCols; column += 1) {
      const t = column / netCols;
      const x = nearX + depthDir * goalDepth * t;
      const yTop = goalTop + (backTop - goalTop) * t;
      const yBottom = goalBottom + (backBottom - goalBottom) * t;
      ctx.beginPath();
      ctx.moveTo(x, yTop);
      ctx.lineTo(x, yBottom);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.17)";
    ctx.beginPath();
    ctx.ellipse(nearX + depthDir * goalDepth * 0.55, goalBottom + 9, goalDepth * 0.9, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    drawCheckeredPost(frameX, goalTop - post, frameWidth, post);
    drawCheckeredPost(frameX, goalBottom, frameWidth, post);
    drawCheckeredPost(nearX - post / 2, goalTop - post, post, FIELD.goalHeight + post);
    drawCheckeredPost(backX - post / 2, backTop - post, post, backBottom - backTop + post);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(nearX + depthDir * 2, goalTop - post + 2);
    ctx.lineTo(backX + depthDir * 2, backTop - post + 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(nearX + depthDir * 2, goalBottom + 2);
    ctx.lineTo(backX + depthDir * 2, backBottom + 2);
    ctx.stroke();
  };

  drawGoal(true);
  drawGoal(false);
}
function drawPlayer(ctx, player) {
  const { x, y, dir, charging, power, kick, kickTimer, special, profile } = player;

  const headRadius = 30;
  const headCenterX = x;
  const headCenterY = y - 62;
  const neckY = headCenterY + headRadius - 3;
  const hipY = y - 24;

  const kickBlend = kick ? clamp(kickTimer / 0.24, 0, 1) : 0;
  const supportFootX = x - dir * 10;
  const supportFootY = y - 1;
  const kickFootX = x + dir * (16 + 20 * kickBlend);
  const kickFootY = y - (2 + 13 * kickBlend);
  const kickKneeX = x + dir * (6 + 9 * kickBlend);
  const kickKneeY = y - (14 + 7 * kickBlend);

  const drawBoot = (bootX, bootY, orientation, highlight = false) => {
    ctx.save();
    ctx.translate(bootX, bootY);
    ctx.rotate(orientation * 0.12);
    ctx.fillStyle = profile.boots;
    ctx.strokeStyle = "#10151d";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 7.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = highlight ? "#f8fafc" : "rgba(248, 250, 252, 0.55)";
    ctx.beginPath();
    ctx.ellipse(orientation * 4, -1, 5, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (charging) {
    const glowRadius = 54;
    const glow = ctx.createRadialGradient(headCenterX, headCenterY, 6, headCenterX, headCenterY, glowRadius);
    const glowStrength = clamp(power / 100, 0, 1);
    glow.addColorStop(0, `rgba(255, 245, 95, ${0.5 * glowStrength})`);
    glow.addColorStop(1, "rgba(255, 170, 0, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(headCenterX, headCenterY, glowRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 23, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = profile.jersey;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x, neckY);
  ctx.lineTo(x, hipY);
  ctx.stroke();

  ctx.strokeStyle = profile.shorts;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, hipY);
  ctx.lineTo(supportFootX, y - 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, hipY);
  ctx.lineTo(kickKneeX, kickKneeY);
  ctx.lineTo(kickFootX, kickFootY);
  ctx.stroke();

  drawBoot(supportFootX, supportFootY, dir, false);
  drawBoot(kickFootX, kickFootY, dir, true);

  const headGradient = ctx.createRadialGradient(
    headCenterX - 11,
    headCenterY - 14,
    5,
    headCenterX,
    headCenterY,
    headRadius + 4
  );
  headGradient.addColorStop(0, profile.skinLight || "#f4d3b0");
  headGradient.addColorStop(1, profile.skinDark || "#ca8a53");
  ctx.fillStyle = headGradient;
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(headCenterX, headCenterY, headRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (kick && kickTimer > 0.08) {
    ctx.save();
    ctx.globalAlpha = clamp(kickTimer / 0.24, 0, 1);
    ctx.fillStyle = special ? "#ff8800" : "#ffee44";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    const burstX = x + dir * 34;
    const burstY = y - 16;
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const radius = i % 2 === 0 ? 21 : 9;
      const pointX = burstX + Math.cos(angle) * radius;
      const pointY = burstY + Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(pointX, pointY);
      } else {
        ctx.lineTo(pointX, pointY);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawBall(ctx, ball) {
  const radius = FIELD.ballRadius;

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.beginPath();
  ctx.ellipse(ball.x, ball.y + radius + 2, radius * 0.8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.rotate(ball.rot);

  const bodyGradient = ctx.createRadialGradient(-6, -6, 2, 0, 0, radius);
  bodyGradient.addColorStop(0, "#ffffff");
  bodyGradient.addColorStop(0.4, "#eeeeee");
  bodyGradient.addColorStop(1, "#aaaaaa");
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#888888";
  ctx.lineWidth = 1;
  ctx.stroke();

  const drawPentagon = (x, y, pentagonRadius) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const pointX = x + pentagonRadius * Math.cos(angle);
      const pointY = y + pentagonRadius * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(pointX, pointY);
      } else {
        ctx.lineTo(pointX, pointY);
      }
    }
    ctx.closePath();
    ctx.fill();
  };

  ctx.fillStyle = "#222222";
  drawPentagon(0, 0, 6);
  drawPentagon(0, -radius + 5, 5);
  drawPentagon(radius * Math.cos(Math.PI / 5) - 3, radius * Math.sin(Math.PI / 5) - 4, 4);
  drawPentagon(-radius * Math.cos(Math.PI / 5) + 3, radius * Math.sin(Math.PI / 5) - 4, 4);

  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.beginPath();
  ctx.ellipse(-5, -6, 6, 4, -0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawFx(ctx, state) {
  state.fx.forEach((fx) => {
    const ratio = 1 - fx.life / fx.maxLife;
    ctx.save();
    ctx.globalAlpha = clamp(1 - ratio, 0, 1);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.round(28 + ratio * 40)}px 'Bricolage Grotesque', sans-serif`;
    ctx.fillStyle = fx.color || "#ffffff";
    ctx.fillText(fx.label, fx.x, fx.y - ratio * 50);
    ctx.restore();
  });
}

function drawScene(ctx, state, crowdLayer, localeCandidate) {
  drawField(ctx, crowdLayer, localeCandidate);
  drawGoals(ctx);
  drawPlayer(ctx, state.players.left);
  drawPlayer(ctx, state.players.right);
  drawBall(ctx, state.ball);
  drawFx(ctx, state);

  if (state.paused && state.phase !== "intro" && state.phase !== "finished") {
    ctx.fillStyle = "rgba(6, 12, 20, 0.45)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#f8fafc";
    ctx.textAlign = "center";
    ctx.font = "700 50px 'Bricolage Grotesque', sans-serif";
    ctx.fillText("PAUSED", WIDTH / 2, HEIGHT / 2 - 10);
  }
}

function createPlayer(side, profileId) {
  const x = side === "left" ? 200 : 700;
  const direction = side === "left" ? 1 : -1;
  const fallback = side === "left" ? DEFAULT_SINGLE_PLAYER_ID : DEFAULT_SINGLE_CPU_ID;
  const profile = getProfileById(profileId || fallback, fallback);

  return {
    side,
    profileId: profile.id,
    profile,
    x,
    y: FIELD.groundY,
    vx: 0,
    vy: 0,
    onGround: true,
    dir: direction,
    power: 0,
    kickPower: 0,
    charging: false,
    kick: false,
    kickTimer: 0,
    special: false,
  };
}

function createInitialState(localeCandidate = "en") {
  const locale = resolveSoccerLocale(localeCandidate);
  const selectedId = DEFAULT_SINGLE_PLAYER_ID;
  const initialTournament = createEmptyTournament(selectedId, locale);

  return {
    phase: "intro",
    running: false,
    paused: false,
    gameMode: "single",
    matchDuration: 60,
    difficultyId: "pro",
    timer: 60,
    goldenGoal: false,
    goalDelay: 0,
    scores: { left: 0, right: 0 },
    result: { title: "", subtitle: "", accent: "#f8fafc" },
    message: "Press Kick Off to start the match.",
    logs: ["Football Head loaded."],
    matchMeta: {
      roundLabel: getSingleMatchLabel(locale),
      playerName: getProfileById(selectedId).name,
      cpuName: getProfileById(DEFAULT_SINGLE_CPU_ID).name,
    },
    players: {
      left: createPlayer("left", selectedId),
      right: createPlayer("right", DEFAULT_SINGLE_CPU_ID),
    },
    ball: {
      x: WIDTH / 2,
      y: FIELD.groundY - 140,
      vx: 0,
      vy: 0,
      rot: 0,
      bounceChain: 0,
    },
    fx: [],
    tournament: initialTournament,
    ai: {
      left: false,
      right: false,
      jump: false,
      charge: false,
      rethinkIn: 0,
      releaseDelay: 0,
      predSamples: [],
      predLandingX: null,
      predLandingT: null,
    },
  };
}

function createControlState() {
  return {
    keys: Object.create(null),
    touch: {
      left: false,
      right: false,
      jump: false,
      kick: false,
    },
    queue: {
      start: false,
      restart: false,
      pause: false,
    },
    prevJumpHeld: false,
  };
}

function pushLog(state, entry) {
  state.logs = [entry, ...state.logs].slice(0, 8);
}

function spawnFx(state, x, y, label, color = "#ffffff", maxLife = 0.75) {
  state.fx.push({ x, y, label, color, life: maxLife, maxLife });
}

function setPlayersForMatch(state, leftProfileId, rightProfileId) {
  const leftProfile = getProfileById(leftProfileId, DEFAULT_SINGLE_PLAYER_ID);
  const rightProfile = getProfileById(rightProfileId, DEFAULT_SINGLE_CPU_ID);

  state.players.left.profileId = leftProfile.id;
  state.players.left.profile = leftProfile;
  state.players.right.profileId = rightProfile.id;
  state.players.right.profile = rightProfile;

  state.matchMeta.playerName = leftProfile.name;
  state.matchMeta.cpuName = rightProfile.name;
}

function resetKickoff(state) {
  const left = state.players.left;
  const right = state.players.right;

  left.x = 200;
  left.y = FIELD.groundY;
  left.vx = 0;
  left.vy = 0;
  left.onGround = true;
  left.dir = 1;
  left.power = 0;
  left.kickPower = 0;
  left.charging = false;
  left.kick = false;
  left.kickTimer = 0;
  left.special = false;

  right.x = 700;
  right.y = FIELD.groundY;
  right.vx = 0;
  right.vy = 0;
  right.onGround = true;
  right.dir = -1;
  right.power = 0;
  right.kickPower = 0;
  right.charging = false;
  right.kick = false;
  right.kickTimer = 0;
  right.special = false;

  state.ball.x = WIDTH / 2;
  state.ball.y = FIELD.groundY - 200;
  state.ball.vx = (Math.random() - 0.5) * 3;
  state.ball.vy = -2;
  state.ball.rot = 0;
  state.ball.bounceChain = 0;
}

function startMatch(state, settings, options = {}) {
  const duration = Number(options.duration ?? settings.duration) || 60;
  const difficultyIdCandidate = options.difficultyId ?? settings.difficultyId;
  const difficultyId = difficultyIdCandidate in DIFFICULTIES ? difficultyIdCandidate : "pro";

  const leftProfileId = options.leftProfileId || state.players.left.profileId || DEFAULT_SINGLE_PLAYER_ID;
  const rightProfileId = options.rightProfileId || state.players.right.profileId || DEFAULT_SINGLE_CPU_ID;
  setPlayersForMatch(state, leftProfileId, rightProfileId);

  state.matchDuration = duration;
  state.difficultyId = difficultyId;
  state.timer = duration;
  state.goldenGoal = false;
  state.scores.left = 0;
  state.scores.right = 0;
  state.running = true;
  state.paused = false;
  state.phase = "playing";
  state.goalDelay = 0;
  state.fx = [];
  state.logs = [];
  state.ai.left = false;
  state.ai.right = false;
  state.ai.jump = false;
  state.ai.charge = false;
  state.ai.rethinkIn = 0;
  state.ai.releaseDelay = 0;
  state.ai.predSamples = [];
  state.ai.predLandingX = null;
  state.ai.predLandingT = null;
  state.result = { title: "", subtitle: "", accent: "#f8fafc" };
  state.matchMeta.roundLabel = options.roundLabel || getSingleMatchLabel(settings.locale);
  state.message = options.message || "Kick off. Jump and attack with headers to create space.";

  resetKickoff(state);
  pushLog(
    state,
    `${state.matchMeta.roundLabel}: ${state.matchMeta.playerName} vs ${state.matchMeta.cpuName} - ${duration}s - ${DIFFICULTIES[difficultyId].label}.`
  );
}

function setupIntroFromSettings(state, settings) {
  const locale = resolveSoccerLocale(settings.locale);
  const mode = settings.mode === "tournament" ? "tournament" : "single";
  const selectedCharacter = getProfileById(settings.tournamentCharacterId, DEFAULT_SINGLE_PLAYER_ID);
  const defaultCpu = TOURNAMENT_CHARACTERS.find((entry) => entry.id !== selectedCharacter.id) || getProfileById(DEFAULT_SINGLE_CPU_ID);
  const introDuration = mode === "tournament"
    ? Number(settings.tournamentDuration) || 60
    : Number(settings.duration) || 60;

  state.phase = "intro";
  state.running = false;
  state.paused = false;
  state.goldenGoal = false;
  state.goalDelay = 0;
  state.fx = [];
  state.scores.left = 0;
  state.scores.right = 0;
  state.result = { title: "", subtitle: "", accent: "#f8fafc" };
  state.gameMode = mode;
  state.tournament = createEmptyTournament(selectedCharacter.id, locale);

  setPlayersForMatch(state, selectedCharacter.id, defaultCpu.id);
  state.matchMeta.roundLabel = mode === "tournament" ? getTournamentModeLabel(locale) : getSingleMatchLabel(locale);
  state.timer = introDuration;
  state.matchDuration = introDuration;
  state.message = mode === "tournament"
    ? locale === "es"
      ? "Elige tu jugador y pulsa Kick Off para empezar el torneo."
      : "Choose your fighter and press Kick Off to start the tournament."
    : locale === "es"
      ? "Pulsa Kick Off para iniciar un partido unico."
      : "Press Kick Off to start a single match.";
  state.logs = [
    mode === "tournament"
      ? locale === "es"
        ? "Modo torneo listo."
        : "Tournament mode ready."
      : locale === "es"
        ? "Modo partido unico listo."
        : "Single match mode ready.",
  ];

  resetKickoff(state);
}

function startSingleMatch(state, settings) {
  const locale = resolveSoccerLocale(settings.locale);
  const selectedCharacter = getProfileById(settings.tournamentCharacterId, DEFAULT_SINGLE_PLAYER_ID);
  const cpuPool = TOURNAMENT_CHARACTERS.filter((entry) => entry.id !== selectedCharacter.id);
  const cpu = cpuPool[Math.floor(Math.random() * cpuPool.length)] || getProfileById(DEFAULT_SINGLE_CPU_ID);

  state.gameMode = "single";
  state.tournament = createEmptyTournament(selectedCharacter.id, locale);
  startMatch(state, settings, {
    leftProfileId: selectedCharacter.id,
    rightProfileId: cpu.id,
    roundLabel: getSingleMatchLabel(locale),
    message:
      locale === "es"
        ? "Saque inicial. Salta y ataca con cabezazos para ganar espacio."
        : "Kick off. Jump and attack with headers to create space.",
  });
}

function startCurrentTournamentMatch(state, settings) {
  const tournament = state.tournament;
  if (!tournament.active) {
    return;
  }

  const round = tournament.rounds[tournament.currentRoundIndex];
  const match = round?.matches[tournament.currentMatchIndex];
  if (!match) {
    return;
  }

  const playerId = tournament.playerCharacterId;
  const opponentId = match.homeId === playerId ? match.awayId : match.homeId;
  const duration = Number(settings.tournamentDuration) || Number(round.duration) || 60;

  startMatch(state, settings, {
    duration,
    difficultyId: settings.difficultyId,
    leftProfileId: playerId,
    rightProfileId: opponentId || DEFAULT_SINGLE_CPU_ID,
    roundLabel: round.label,
    message: `${round.label}: ${getProfileById(playerId).name} vs ${getProfileById(opponentId).name}.`,
  });

  tournament.status = "active";
  tournament.summary = {
    title: round.label,
    text: `${getProfileById(playerId).name} vs ${getProfileById(opponentId).name}`,
    accent: "#38bdf8",
  };
}

function startTournament(state, settings) {
  const selectedCharacter = getProfileById(settings.tournamentCharacterId, DEFAULT_SINGLE_PLAYER_ID);
  const tournament = buildTournament(selectedCharacter.id, Date.now(), settings.locale);
  const random = createRandom((Date.now() * 17) >>> 0);
  const firstRound = tournament.rounds[0];

  firstRound.matches.forEach((match, index) => {
    if (index !== tournament.currentMatchIndex) {
      resolveSimulatedMatch(match, random);
    }
  });

  state.gameMode = "tournament";
  state.tournament = tournament;
  startCurrentTournamentMatch(state, settings);
}

function handleTournamentResult(state, playerWon) {
  const tournament = state.tournament;
  if (!tournament.active) {
    return;
  }

  const currentRound = tournament.rounds[tournament.currentRoundIndex];
  const currentMatch = currentRound?.matches[tournament.currentMatchIndex];
  if (!currentRound || !currentMatch) {
    return;
  }

  const playerId = tournament.playerCharacterId;
  const opponentId = currentMatch.homeId === playerId ? currentMatch.awayId : currentMatch.homeId;
  const playerIsHome = currentMatch.homeId === playerId;
  const homeScore = playerIsHome ? state.scores.left : state.scores.right;
  const awayScore = playerIsHome ? state.scores.right : state.scores.left;
  const winnerId = playerWon ? playerId : opponentId;

  applyMatchResult(currentMatch, homeScore, awayScore, winnerId, false);

  if (!playerWon) {
    tournament.status = "eliminated";
    tournament.summary = {
      title: "Eliminated",
      text: `${getProfileById(opponentId).name} knocked you out in ${currentRound.label}.`,
      accent: "#ef4444",
    };
    state.result.title = "ELIMINATED";
    state.result.subtitle = `${currentRound.label} ended your run.`;
    state.result.accent = "#ef4444";
    state.message = "Tournament run ended. Restart to try again.";
    pushLog(state, `Eliminated in ${currentRound.label}.`);
    return;
  }

  const nextRoundIndex = tournament.currentRoundIndex + 1;
  if (nextRoundIndex >= tournament.rounds.length) {
    tournament.status = "champion";
    tournament.celebrationTimer = 4.2;
    tournament.summary = {
      title: "Champion",
      text: `${getProfileById(playerId).name} lifted the trophy.`,
      accent: "#facc15",
    };
    state.result.title = "CHAMPION";
    state.result.subtitle = "You won the final and conquered the tournament.";
    state.result.accent = "#facc15";
    state.message = "Trophy secured. You are the champion.";
    spawnFx(state, WIDTH / 2, FIELD.groundY - 190, "TROPHY", "#facc15", 1.3);
    pushLog(state, "Tournament completed. Champion crowned.");
    return;
  }

  const random = createRandom((Date.now() + nextRoundIndex * 131 + homeScore * 17 + awayScore * 31) >>> 0);
  hydrateNextRound(tournament, nextRoundIndex, playerId, random);
  const nextRound = tournament.rounds[nextRoundIndex];
  tournament.status = "between_rounds";
  tournament.summary = {
    title: `${currentRound.label} cleared`,
    text: `You advance to ${nextRound.label}.`,
    accent: "#22c55e",
  };
  state.result.title = "ADVANCE";
  state.result.subtitle = `Round won. Next: ${nextRound.label}.`;
  state.result.accent = "#22c55e";
  state.message = `Great match. ${nextRound.label} unlocked.`;
  pushLog(state, `Qualified for ${nextRound.label}.`);
}

function finishMatch(state) {
  state.running = false;
  state.paused = false;
  state.goldenGoal = false;
  state.phase = "finished";

  if (state.scores.left > state.scores.right) {
    state.result.title = "VICTORY";
    state.result.subtitle = "You controlled the match.";
    state.result.accent = "#f0c030";
    state.message = "Final whistle. You win.";
  } else if (state.scores.left < state.scores.right) {
    state.result.title = "DEFEAT";
    state.result.subtitle = "CPU edged the match. Try again.";
    state.result.accent = "#e74c3c";
    state.message = "Final whistle. CPU wins.";
  } else {
    state.result.title = "DRAW";
    state.result.subtitle = "Balanced game from both sides.";
    state.result.accent = "#cbd5e1";
    state.message = "Final whistle. Draw.";
  }

  pushLog(state, `Final score ${state.scores.left}-${state.scores.right}.`);

  if (state.gameMode === "tournament" && state.tournament.active) {
    handleTournamentResult(state, state.scores.left > state.scores.right);
  }
}

function registerGoal(state, side) {
  if (state.phase !== "playing") {
    return;
  }

  const ball = state.ball;
  const scoredOnRightGoal = side === "left";
  const insideGoalX = scoredOnRightGoal ? FIELD.right + FIELD.goalWidth * 0.34 : FIELD.left - FIELD.goalWidth * 0.34;
  const insideGoalY = FIELD.goalTop + FIELD.goalHeight * 0.72;

  state.scores[side] += 1;
  state.phase = "goal";
  state.goalDelay = 1.15;

  ball.x = insideGoalX;
  ball.y = insideGoalY;
  ball.vx = 0;
  ball.vy = 0;
  ball.bounceChain = 0;

  const goalText = state.goldenGoal ? "GOLDEN GOAL" : "GOAL";
  if (side === "left") {
    state.message = state.goldenGoal ? "Golden goal for YOU." : "Goal for YOU.";
    pushLog(state, state.goldenGoal ? "Golden goal scored by YOU." : "You scored.");
  } else {
    state.message = state.goldenGoal ? "Golden goal for CPU." : "Goal for CPU.";
    pushLog(state, state.goldenGoal ? "Golden goal scored by CPU." : "CPU scored.");
  }

  spawnFx(state, WIDTH / 2, FIELD.groundY - 180, goalText, state.goldenGoal ? "#facc15" : "#ffffff", 0.9);
}
function releaseKick(player, state) {
  if (!player.charging) {
    return;
  }

  const chargedPower = clamp(player.power, 0, 100);
  player.charging = false;
  player.kick = true;
  player.kickTimer = 0.24;
  player.kickPower = chargedPower;
  player.special = chargedPower >= 88;

  if (player.special) {
    spawnFx(state, player.x, player.y - 60, "POWER", "#ffd55a", 0.5);
  }

  player.power = 0;
}

function applyBallHits(player, state) {
  const ball = state.ball;
  const headX = player.x;
  const headY = player.y - 61;
  const headDistance = Math.hypot(ball.x - headX, ball.y - headY);
  const ballSpeed = Math.hypot(ball.vx, ball.vy);
  const airborneHeader = !player.onGround && ball.y < player.y - 24;

  if (headDistance < FIELD.ballRadius + 31) {
    const angle = Math.atan2(ball.y - headY, ball.x - headX);
    const approachBonus = clamp(Math.abs(player.vx) * 0.35 + Math.max(0, -player.vy) * 0.22, 0, 4.5);
    const speed = Math.max(airborneHeader ? 13 : 10.5, ballSpeed * 1.08 + (airborneHeader ? 6.6 : 4.4) + approachBonus);
    const forwardDrive = player.dir * (airborneHeader ? 5.4 : 3.1);
    const upwardLift = airborneHeader ? -4.6 : -2.8;
    ball.vx = Math.cos(angle) * speed + forwardDrive;
    ball.vy = Math.sin(angle) * speed + upwardLift;
    ball.vx = clamp(ball.vx, -22, 22);
    ball.vy = clamp(ball.vy, -22, 22);
    ball.bounceChain = 0;
  }

  if (player.kick && player.kickTimer > 0.07) {
    const footX = player.x + player.dir * 27;
    const footY = player.y - 6;
    const kickDistance = Math.hypot(ball.x - footX, ball.y - footY);
    const lowBall = ball.y > player.y - 42;

    if (lowBall && kickDistance < FIELD.ballRadius + 12) {
      const wasSpecial = player.special;
      const chargeRatio = clamp(player.kickPower / 100, 0, 1);
      const power = wasSpecial ? 1.55 : 0.82 + chargeRatio * 0.68;
      const angle = Math.atan2(ball.y - footY, ball.x - footX);
      ball.vx = Math.cos(angle) * 13.5 * power;
      ball.vy = Math.sin(angle) * 12.8 * power - 3.1;
      ball.vx = clamp(ball.vx, -18.5, 18.5);
      ball.vy = clamp(ball.vy, -18.5, 18.5);
      ball.bounceChain = 0;
      player.kick = false;
      player.special = false;
      player.kickPower = 0;

      if (wasSpecial) {
        spawnFx(state, ball.x, ball.y, "FIRE", "#ff9a3c", 0.45);
      }
    }
  }
}

function updatePlayerPhysics(player, controls, state, dt) {
  const frame = dt * 60;

  if (player.charging) {
    player.power = Math.min(100, player.power + 1.5 * frame);
  } else if (player.power > 0) {
    player.power = Math.max(0, player.power - 4 * frame);
  }

  if (controls.left && !controls.right) {
    player.vx = -PHYSICS.speed;
    player.dir = -1;
  } else if (controls.right && !controls.left) {
    player.vx = PHYSICS.speed;
    player.dir = 1;
  } else {
    player.vx = 0;
  }

  if (controls.jump && player.onGround) {
    player.vy = PHYSICS.jumpVelocity;
    player.onGround = false;
  }

  player.vy += PHYSICS.playerGravity * frame;
  player.x += player.vx * frame;
  player.y += player.vy * frame;

  if (player.y >= FIELD.groundY) {
    player.y = FIELD.groundY;
    player.vy = 0;
    player.onGround = true;
  }

  if (player.x < FIELD.left + PHYSICS.playerHalfWidth) {
    player.x = FIELD.left + PHYSICS.playerHalfWidth;
    player.vx = 0;
  }

  if (player.x > FIELD.right - PHYSICS.playerHalfWidth) {
    player.x = FIELD.right - PHYSICS.playerHalfWidth;
    player.vx = 0;
  }

  if (player.kick) {
    player.kickTimer -= dt;
    if (player.kickTimer <= 0) {
      player.kick = false;
      player.special = false;
      player.kickPower = 0;
    }
  }

  applyBallHits(player, state);
}

function updateBallPhysics(state, dt) {
  if (state.phase !== "playing") {
    return;
  }

  const frame = dt * 60;
  const ball = state.ball;

  ball.vy += PHYSICS.ballGravity * frame;
  ball.vx *= Math.pow(PHYSICS.friction, frame);
  ball.vy *= Math.pow(PHYSICS.friction, frame);
  ball.x += ball.vx * frame;
  ball.y += ball.vy * frame;
  ball.rot += ball.vx * 0.05 * frame;

  if (ball.y + FIELD.ballRadius >= FIELD.groundY) {
    const incoming = Math.abs(ball.vy);
    const chain = Math.min(ball.bounceChain || 0, 8);
    const scriptedBounce = [13.6, 11.7, 10.0, 8.5, 7.2, 6.1, 5.2, 4.5, 3.9][chain];
    const carryMultiplier = Math.max(0.32, 0.78 - chain * 0.07);
    const rebound = clamp(Math.max(scriptedBounce, incoming * PHYSICS.bounce * carryMultiplier), 3.8, 17);
    ball.y = FIELD.groundY - FIELD.ballRadius;
    ball.vy = -rebound;
    ball.vx *= Math.max(0.7, 0.9 - chain * 0.03);
    ball.bounceChain = chain + 1;
  }

  if (ball.y - FIELD.ballRadius < FIELD.ceilingY) {
    ball.y = FIELD.ceilingY + FIELD.ballRadius;
    ball.vy = Math.abs(ball.vy) * 0.46;
  }

  if (ball.x - FIELD.ballRadius <= FIELD.left && ball.y > FIELD.goalTop) {
    registerGoal(state, "right");
    return;
  }

  if (ball.x + FIELD.ballRadius >= FIELD.right && ball.y > FIELD.goalTop) {
    registerGoal(state, "left");
    return;
  }

  if (ball.x - FIELD.ballRadius < FIELD.left && ball.y <= FIELD.goalTop) {
    ball.x = FIELD.left + FIELD.ballRadius;
    ball.vx = Math.abs(ball.vx) * 0.55;
  }

  if (ball.x + FIELD.ballRadius > FIELD.right && ball.y <= FIELD.goalTop) {
    ball.x = FIELD.right - FIELD.ballRadius;
    ball.vx = -Math.abs(ball.vx) * 0.55;
  }

  const left = state.players.left;
  const right = state.players.right;
  const deltaX = right.x - left.x;

  if (Math.abs(deltaX) < PHYSICS.playerHalfWidth * 2 && Math.abs(right.y - left.y) < 60) {
    const overlap = PHYSICS.playerHalfWidth * 2 - Math.abs(deltaX);
    const direction = Math.sign(deltaX || 1);
    left.x -= (overlap / 2) * direction;
    right.x += (overlap / 2) * direction;
    left.vx -= overlap * 0.3 * direction;
    right.vx += overlap * 0.3 * direction;

    left.x = clamp(left.x, FIELD.left + PHYSICS.playerHalfWidth, FIELD.right - PHYSICS.playerHalfWidth);
    right.x = clamp(right.x, FIELD.left + PHYSICS.playerHalfWidth, FIELD.right - PHYSICS.playerHalfWidth);
  }
}

const BOUNCE_SCRIPT = [13.6, 11.7, 10.0, 8.5, 7.2, 6.1, 5.2, 4.5, 3.9];

function predictBallTrajectory(ball, depthSec) {
  const totalSteps = Math.max(1, Math.round(depthSec * 60));
  const ballRadius = FIELD.ballRadius;
  let x = ball.x;
  let y = ball.y;
  let vx = ball.vx;
  let vy = ball.vy;
  let chain = ball.bounceChain || 0;
  let landingX = null;
  let landingT = null;
  let crossesAiSideT = null;
  const samples = new Array(totalSteps);

  for (let s = 1; s <= totalSteps; s += 1) {
    vy += PHYSICS.ballGravity;
    vx *= PHYSICS.friction;
    vy *= PHYSICS.friction;
    x += vx;
    y += vy;

    if (y + ballRadius >= FIELD.groundY && vy > 0) {
      const c = Math.min(chain, 8);
      const carry = Math.max(0.32, 0.78 - c * 0.07);
      const rebound = clamp(Math.max(BOUNCE_SCRIPT[c], Math.abs(vy) * PHYSICS.bounce * carry), 3.8, 17);
      y = FIELD.groundY - ballRadius;
      vy = -rebound;
      vx *= Math.max(0.7, 0.9 - c * 0.03);
      if (landingX === null) {
        landingX = x;
        landingT = s / 60;
      }
      chain += 1;
    }

    if (y - ballRadius < FIELD.ceilingY) {
      y = FIELD.ceilingY + ballRadius;
      vy = Math.abs(vy) * 0.46;
    }

    if (x - ballRadius < FIELD.left) {
      x = FIELD.left + ballRadius;
      vx = Math.abs(vx) * 0.55;
    }
    if (x + ballRadius > FIELD.right) {
      x = FIELD.right - ballRadius;
      vx = -Math.abs(vx) * 0.55;
    }

    if (crossesAiSideT === null && x > WIDTH / 2 && ball.x <= WIDTH / 2) {
      crossesAiSideT = s / 60;
    }

    samples[s - 1] = { x, y, vx, vy, t: s / 60 };
  }

  if (landingX === null) {
    const last = samples[samples.length - 1];
    landingX = last ? last.x : ball.x;
    landingT = last ? last.t : depthSec;
  }

  return { samples, landingX, landingT, crossesAiSideT };
}

function updateAi(state, dt) {
  const profile = DIFFICULTIES[state.difficultyId] || DIFFICULTIES.pro;
  const ai = state.ai;
  const cpu = state.players.right;
  const ball = state.ball;

  // Rookie keeps the legacy reactive AI — easy to read.
  if (profile.id === "rookie") {
    ai.rethinkIn -= dt;
    if (ai.rethinkIn <= 0) {
      const deltaX = ball.x - cpu.x;
      const deltaY = ball.y - (cpu.y - 80);
      const distance = Math.hypot(deltaX, deltaY);
      const targetX = ball.vx > 0 ? ball.x + profile.anticipation : ball.x;
      ai.left = cpu.x > targetX + 15 && cpu.x > profile.minX;
      ai.right = cpu.x < targetX - 15;
      ai.jump = deltaY < -40 + profile.jumpOffset && Math.abs(deltaX) < profile.jumpRange && cpu.onGround;
      ai.charge = distance < profile.chargeDistance && Math.random() < profile.chargeChance;
      ai.rethinkIn = profile.reactionSeconds;
    }

    if (ai.charge && !cpu.charging) {
      cpu.charging = true;
      ai.releaseDelay = profile.releaseMin + Math.random() * (profile.releaseMax - profile.releaseMin);
    }
    if (cpu.charging) {
      ai.releaseDelay -= dt;
      if (ai.releaseDelay <= 0) {
        releaseKick(cpu, state);
        ai.charge = false;
      }
    }
    const jumpNow = ai.jump;
    ai.jump = false;
    updatePlayerPhysics(cpu, { left: ai.left, right: ai.right, jump: jumpNow }, state, dt);
    return;
  }

  // === Pro/Elite: predictive adaptive AI ===
  // Geometry note: CPU is on the right side, faces LEFT (dir = -1).
  //   Foot kick origin: footX = cpu.x + dir*27 = cpu.x - 27.
  //   For the kick to send the ball LEFT (toward the player goal) the ball must be
  //   strictly LEFT of the foot. So the AI body must sit to the RIGHT of the ball
  //   (offset of ~+38 px). All target X values use that "right-of-ball" bias.

  // Match-state signals.
  const lead = state.scores.right - state.scores.left;
  const matchDuration = Math.max(1, state.matchDuration);
  const timeRatio = clamp(state.timer / matchDuration, 0, 1);
  const lateGame = timeRatio < 0.4;
  const veryLate = timeRatio < 0.15;
  const protectMode = lead >= 2 && lateGame;
  const holdMode = lead === 1 && lateGame;
  const panicMode = lead <= -1 && lateGame;
  const urgency = clamp(
    profile.aggressionBase + -lead * 0.28 + (1 - timeRatio) * 0.42 + (panicMode ? 0.3 : 0) - (protectMode ? 0.45 : 0),
    -0.4,
    1.6
  );

  // Refresh trajectory periodically.
  ai.rethinkIn -= dt;
  if (ai.rethinkIn <= 0 || !ai.predSamples || ai.predSamples.length === 0) {
    const traj = predictBallTrajectory(ball, profile.predictionDepth);
    ai.predSamples = traj.samples;
    ai.predLandingX = traj.landingX;
    ai.predLandingT = traj.landingT;
    ai.rethinkIn = profile.reactionSeconds;
  }
  const samples = ai.predSamples;

  // Useful constants
  const cpuMaxSpeedPxPerSec = PHYSICS.speed * 60; // ~288 px/s
  const aiVy0 = PHYSICS.jumpVelocity;
  const aiG = PHYSICS.playerGravity;
  const headerReach = profile.headerReach;
  const playerHalf = PHYSICS.playerHalfWidth;
  const FOOT_OFFSET = 38; // body must be this many px right of ball for a left-going kick
  const FOOT_Y_TOP = cpu.y - 55;
  const FOOT_Y_BOT = cpu.y + 8;

  // Scan trajectory for opportunities and threats.
  let footIntercept = null;
  let headerIntercept = null;
  let dangerSample = null;
  for (let i = 0; i < samples.length; i += 1) {
    const s = samples[i];
    if (s.t < 0.04) continue;

    // Threat: ball nearing own goal area moving right.
    if (dangerSample === null && s.x > FIELD.right - 230 && s.vx > 1) {
      dangerSample = s;
    }

    // Foot intercept: predicted foot-height ball that AI can walk to in time.
    if (footIntercept === null && s.y >= FOOT_Y_TOP && s.y <= FOOT_Y_BOT) {
      const desiredX = clamp(s.x + FOOT_OFFSET, FIELD.left + 60, FIELD.right - playerHalf - 4);
      const walkDist = Math.abs(desiredX - cpu.x);
      const walkTime = walkDist / cpuMaxSpeedPxPerSec;
      // Allow a small slack — AI keeps walking while charging.
      if (walkTime <= s.t + 0.18) {
        footIntercept = { t: s.t, sample: s, targetX: desiredX, walkTime };
      }
    }

    // Header intercept: jump-now reach, accounting for AI vertical trajectory.
    if (headerIntercept === null && cpu.onGround && s.y < cpu.y - 30) {
      const n = s.t * 60;
      const dy = aiVy0 * n + 0.5 * aiG * n * (n + 1);
      if (dy < 0) {
        const headY = cpu.y + dy - 61;
        const dx = Math.abs(s.x - cpu.x);
        if (dx <= headerReach && Math.hypot(dx, s.y - headY) <= headerReach) {
          headerIntercept = { t: s.t, sample: s, headY };
        }
      }
    }
  }

  // === Tactical mode: choose intent ===
  // - Header has timing priority (only fires for a tiny window).
  // - Foot intercept = main attack/defense move.
  // - Otherwise position around predicted landing or guard goal.
  let targetX;
  let intent;
  if (headerIntercept) {
    targetX = cpu.x; // hold ground while jumping
    intent = "header";
  } else if (footIntercept) {
    targetX = footIntercept.targetX;
    intent = "foot";
  } else if (dangerSample) {
    // Emergency: ball going to own goal with no clean intercept — sprint to goal line.
    targetX = clamp(dangerSample.x + FOOT_OFFSET, FIELD.right - 200, FIELD.right - playerHalf - 4);
    intent = "rescue";
  } else {
    const landing = ai.predLandingX ?? ball.x;
    targetX = clamp(landing + FOOT_OFFSET, FIELD.left + 60, FIELD.right - playerHalf - 4);
    intent = ball.x < WIDTH / 2 ? "press" : "track";
  }

  // Apply tactical biases per match mode.
  if (protectMode) {
    const guardLine = FIELD.right - profile.protectGuardX;
    if (intent !== "header" && intent !== "foot") {
      targetX = Math.max(targetX, guardLine);
    } else {
      // Even when intercepting, don't over-commit too far forward.
      targetX = Math.max(targetX, guardLine - 60);
    }
  } else if (holdMode && intent === "press") {
    // Slight backwards bias when ball is in opponent half and we're 1 ahead.
    targetX = Math.max(targetX, WIDTH / 2 + 60);
  } else if (panicMode) {
    // Allow sprinting deep into opponent half when intercepting low.
    if (intent === "foot" || intent === "press") {
      targetX = Math.max(targetX, FIELD.left + 100);
    }
  }

  targetX = clamp(targetX, FIELD.left + playerHalf, FIELD.right - playerHalf);

  // Variable deadband: tight on attack, looser when guarding.
  const deadband = intent === "header" ? 4 : panicMode ? 6 : protectMode ? 22 : 10;
  ai.left = cpu.x > targetX + deadband;
  ai.right = cpu.x < targetX - deadband;

  // === Jump decision ===
  // Jump when a header opportunity exists AND it makes tactical sense.
  let shouldJump = false;
  if (headerIntercept) {
    const sH = headerIntercept.sample;
    const goingToOurGoal = sH.vx > 0.4;
    const inOurHalf = sH.x >= WIDTH / 2 - 40;
    const offensiveHeader = sH.x < WIDTH / 2 - 20; // ball already in opponent half — head it deeper
    if (goingToOurGoal || inOurHalf) {
      shouldJump = !protectMode || goingToOurGoal; // protect mode only jumps to clear danger
    } else if (offensiveHeader) {
      shouldJump = !protectMode && (urgency > 0.2 || panicMode);
    }
  }

  // Anti-spam: don't repeatedly jump in protect mode unless real danger.
  if (protectMode && shouldJump && !(headerIntercept && headerIntercept.sample.vx > 0.6)) {
    shouldJump = false;
  }

  // === Charge decision ===
  let shouldCharge = false;
  if (!cpu.charging && cpu.onGround && footIntercept) {
    const fi = footIntercept;
    const tooFarToReach = Math.abs(fi.targetX - cpu.x) > 110 && fi.t < 0.32;
    const insideChargeWindow = fi.t >= profile.chargeLeadMin && fi.t <= profile.chargeLeadMax;
    if (insideChargeWindow && !tooFarToReach) {
      shouldCharge = true;
    }
    if (protectMode) {
      // Only commit to a charge if the ball is squarely in slot.
      shouldCharge = shouldCharge && Math.abs(fi.sample.x - cpu.x) < 70 && Math.random() < 0.55;
    } else if (holdMode) {
      // 1-goal lead: still attack but skip risky deep charges.
      const tooDeep = fi.targetX < WIDTH / 2 + 40;
      if (tooDeep) shouldCharge = false;
    }
  }

  // Hopeful chaos shot when trailing in the dying minutes.
  if (panicMode && veryLate && !cpu.charging && !shouldCharge && Math.abs(ball.x - cpu.x) < 220) {
    if (Math.random() < 0.012 + urgency * 0.018) {
      shouldCharge = true;
    }
  }

  if (shouldCharge) {
    cpu.charging = true;
    const releaseShift = panicMode ? profile.panicReleaseShift : 0;
    ai.releaseDelay = clamp(
      profile.releaseMin + Math.random() * (profile.releaseMax - profile.releaseMin) + releaseShift,
      0.05,
      0.55
    );
  }

  if (cpu.charging) {
    ai.releaseDelay -= dt;
    const footX = cpu.x - 27;
    const ballAtFoot = ball.x < footX + 6 && ball.x > footX - 30 && ball.y > cpu.y - 50;
    const ballEscapedRight = ball.x > cpu.x + 36 && ball.vx > 1.2;
    const wrongSide = ball.x > cpu.x - 8; // ball moved to wrong side of foot — abort or hope
    if (
      ai.releaseDelay <= 0 ||
      ballAtFoot ||
      ballEscapedRight ||
      (veryLate && panicMode && ai.releaseDelay < 0.1) ||
      (wrongSide && ai.releaseDelay < 0.05)
    ) {
      releaseKick(cpu, state);
    }
  }

  updatePlayerPhysics(cpu, { left: ai.left, right: ai.right, jump: shouldJump }, state, dt);
}

function updateFx(state, dt) {
  state.fx = state.fx
    .map((fx) => ({ ...fx, life: fx.life - dt }))
    .filter((fx) => fx.life > 0);

  if (state.tournament?.celebrationTimer > 0) {
    state.tournament.celebrationTimer = Math.max(0, state.tournament.celebrationTimer - dt);
  }
}

function readInput(controls) {
  const keys = controls.keys;
  const touch = controls.touch;

  const left = Boolean(keys.KeyA || keys.ArrowLeft || touch.left);
  const right = Boolean(keys.KeyD || keys.ArrowRight || touch.right);
  const jumpHeld = Boolean(keys.KeyW || keys.ArrowUp || touch.jump);
  const kickHeld = Boolean(keys.Space || touch.kick);

  const jumpPressed = jumpHeld && !controls.prevJumpHeld;
  controls.prevJumpHeld = jumpHeld;

  const startPressed = controls.queue.start;
  controls.queue.start = false;

  const restartPressed = controls.queue.restart;
  controls.queue.restart = false;

  const pausePressed = controls.queue.pause;
  controls.queue.pause = false;

  return {
    left,
    right,
    jumpPressed,
    kickHeld,
    startPressed,
    restartPressed,
    pausePressed,
  };
}

function stepGame(state, controls, settings, dt) {
  const input = readInput(controls);
  const mode = settings.mode === "tournament" ? "tournament" : "single";

  if (input.restartPressed) {
    if (mode === "tournament") {
      startTournament(state, settings);
    } else {
      startSingleMatch(state, settings);
    }
    return;
  }

  if (input.startPressed && (state.phase === "intro" || state.phase === "finished")) {
    if (mode === "tournament") {
      if (state.tournament.active && state.tournament.status === "between_rounds") {
        startCurrentTournamentMatch(state, settings);
      } else {
        startTournament(state, settings);
      }
    } else {
      startSingleMatch(state, settings);
    }
    return;
  }

  if (input.pausePressed && (state.phase === "playing" || state.phase === "goal")) {
    state.paused = !state.paused;
    state.message = state.paused ? "Paused." : "Match resumed.";
    pushLog(state, state.paused ? "Game paused." : "Game resumed.");
  }

  if (state.phase === "intro" || state.phase === "finished" || state.paused) {
    updateFx(state, dt);
    return;
  }

  if (state.phase === "goal") {
    state.goalDelay -= dt;
    updateFx(state, dt);
    if (state.goalDelay <= 0) {
      if (state.goldenGoal && state.scores.left !== state.scores.right) {
        finishMatch(state);
      } else {
        resetKickoff(state);
        state.phase = "playing";
        state.message = state.goldenGoal ? "Golden goal continues." : "Match live.";
      }
    }
    return;
  }

  if (!state.running) {
    return;
  }

  if (!state.goldenGoal) {
    state.timer = Math.max(0, state.timer - dt);
    if (state.timer <= 0) {
      if (state.scores.left === state.scores.right) {
        state.goldenGoal = true;
        state.message = "Time over. Golden goal is active: next goal wins.";
        pushLog(state, "Golden goal activated.");
      } else {
        finishMatch(state);
        return;
      }
    }
  }

  const player = state.players.left;
  if (input.kickHeld && !player.charging) {
    player.charging = true;
  }
  if (!input.kickHeld && player.charging) {
    releaseKick(player, state);
  }

  updatePlayerPhysics(
    player,
    {
      left: input.left,
      right: input.right,
      jump: input.jumpPressed,
    },
    state,
    dt
  );

  updateAi(state, dt);
  updateBallPhysics(state, dt);
  updateFx(state, dt);
}

function buildSnapshot(state) {
  const ballSpeed = Math.hypot(state.ball.vx, state.ball.vy);
  const difficulty = DIFFICULTIES[state.difficultyId] || DIFFICULTIES.pro;
  const tournament = state.tournament || createEmptyTournament(DEFAULT_SINGLE_PLAYER_ID);
  const currentRound = tournament.rounds[tournament.currentRoundIndex];

  const tournamentRounds = tournament.rounds.map((round) => ({
    id: round.id,
    label: round.label,
    matches: round.matches.map((match) => ({
      id: match.id,
      homeName: match.homeId ? getProfileById(match.homeId).name : "TBD",
      awayName: match.awayId ? getProfileById(match.awayId).name : "TBD",
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      winnerId: match.winnerId,
      played: match.played,
      containsPlayer: match.containsPlayer,
    })),
  }));

  return {
    mode: state.gameMode,
    phase: state.phase,
    running: state.running,
    paused: state.paused,
    difficultyId: state.difficultyId,
    difficultyLabel: difficulty.label,
    roundLabel: state.matchMeta.roundLabel,
    matchDuration: state.matchDuration,
    goldenGoal: state.goldenGoal,
    timer: round2(state.timer),
    timerLabel: state.goldenGoal ? "GOLDEN" : formatClock(state.timer),
    score: {
      you: state.scores.left,
      cpu: state.scores.right,
    },
    powers: {
      you: Math.round(state.players.left.power),
      cpu: Math.round(state.players.right.power),
    },
    competitors: {
      you: {
        id: state.players.left.profileId,
        name: state.players.left.profile.name,
        flag: state.players.left.profile.flag,
      },
      cpu: {
        id: state.players.right.profileId,
        name: state.players.right.profile.name,
        flag: state.players.right.profile.flag,
      },
    },
    result: state.result,
    message: state.message,
    logs: [...state.logs],
    tournament: {
      active: tournament.active,
      status: tournament.status,
      playerCharacterId: tournament.playerCharacterId,
      playerCharacterName: getProfileById(tournament.playerCharacterId).name,
      currentRoundIndex: tournament.currentRoundIndex,
      currentRoundLabel: currentRound?.label || null,
      currentMatchIndex: tournament.currentMatchIndex,
      summary: tournament.summary,
      celebrationTimer: round2(tournament.celebrationTimer),
      rounds: tournamentRounds,
    },
    player: {
      x: round2(state.players.left.x),
      y: round2(state.players.left.y),
      vx: round2(state.players.left.vx),
      vy: round2(state.players.left.vy),
      charging: state.players.left.charging,
      kick: state.players.left.kick,
    },
    cpu: {
      x: round2(state.players.right.x),
      y: round2(state.players.right.y),
      vx: round2(state.players.right.vx),
      vy: round2(state.players.right.vy),
      charging: state.players.right.charging,
      kick: state.players.right.kick,
    },
    ball: {
      x: round2(state.ball.x),
      y: round2(state.ball.y),
      vx: round2(state.ball.vx),
      vy: round2(state.ball.vy),
      speed: round2(ballSpeed),
    },
  };
}

const DIFFICULTY_OPTIONS = Object.values(DIFFICULTIES);
export default function HeadSoccerGame({ locale }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const crowdLayerRef = useRef(null);
  const crowdLayerScaleRef = useRef(0);

  const uiLocale = useMemo(() => resolveSoccerLocale(locale), [locale]);
  const stateRef = useRef(createInitialState(uiLocale));
  const controlsRef = useRef(createControlState());
  const activeTouchPointersRef = useRef(new Map());

  const frameRef = useRef(0);
  const previousTimeRef = useRef(0);
  const accumulatorRef = useRef(0);

  const [settings, setSettings] = useState({
    locale: uiLocale,
    mode: "single",
    difficultyId: "pro",
    duration: 60,
    tournamentDuration: 60,
    tournamentCharacterId: DEFAULT_SINGLE_PLAYER_ID,
  });
  const settingsRef = useRef(settings);
  const [snapshot, setSnapshot] = useState(() => buildSnapshot(stateRef.current));

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    setSettings((previous) => (
      previous.locale === uiLocale ? previous : { ...previous, locale: uiLocale }
    ));
  }, [uiLocale]);

  const syncSnapshot = useCallback(() => {
    setSnapshot(buildSnapshot(stateRef.current));
  }, []);

  const draw = useCallback((time = 0) => {
    if (!ctxRef.current || !canvasRef.current) {
      return;
    }

    const metrics = syncCanvasResolution(canvasRef.current, ctxRef.current);
    const crowdScale = metrics ? Math.max(metrics.scaleX, metrics.scaleY) : 1;
    if (!crowdLayerRef.current || Math.abs(crowdLayerScaleRef.current - crowdScale) > 0.05) {
      crowdLayerRef.current = buildCrowdLayer(crowdScale);
      crowdLayerScaleRef.current = crowdScale;
    }
    drawScene(ctxRef.current, stateRef.current, crowdLayerRef.current, settingsRef.current.locale);
  }, []);

  useEffect(() => {
    const currentState = stateRef.current;
    if (currentState.phase === "playing" || currentState.phase === "goal") {
      return;
    }
    setupIntroFromSettings(currentState, settingsRef.current);
    draw(performance.now());
    syncSnapshot();
  }, [settings.locale, settings.mode, settings.tournamentCharacterId, draw, syncSnapshot]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    ctxRef.current = canvas.getContext("2d");
    const metrics = syncCanvasResolution(canvas, ctxRef.current);
    const crowdScale = metrics ? Math.max(metrics.scaleX, metrics.scaleY) : 1;
    crowdLayerRef.current = buildCrowdLayer(crowdScale);
    crowdLayerScaleRef.current = crowdScale;
    draw(0);

    const tick = (time) => {
      if (!previousTimeRef.current) {
        previousTimeRef.current = time;
      }

      const delta = Math.min(100, time - previousTimeRef.current);
      previousTimeRef.current = time;
      accumulatorRef.current += delta;

      while (accumulatorRef.current >= STEP_MS) {
        stepGame(stateRef.current, controlsRef.current, settingsRef.current, STEP_SECONDS);
        accumulatorRef.current -= STEP_MS;
      }

      draw(time);
      syncSnapshot();
      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frameRef.current);
    };
  }, [draw, syncSnapshot]);

  const queueAction = useCallback((action) => {
    controlsRef.current.queue[action] = true;
  }, []);

  const setTouchState = useCallback((name, value) => {
    controlsRef.current.touch[name] = value;
  }, []);

  const releaseTouchPointer = useCallback(
    (pointerId) => {
      const name = activeTouchPointersRef.current.get(pointerId);
      if (!name) {
        return;
      }

      activeTouchPointersRef.current.delete(pointerId);
      setTouchState(name, false);
    },
    [setTouchState]
  );

  const releaseAllTouchPointers = useCallback(() => {
    Array.from(activeTouchPointersRef.current.keys()).forEach((pointerId) => {
      releaseTouchPointer(pointerId);
    });
  }, [releaseTouchPointer]);

  const bindTouchHold = useCallback(
    (name) => ({
      onPointerDown: (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) {
          return;
        }

        event.preventDefault();
        activeTouchPointersRef.current.set(event.pointerId, name);
        try {
          event.currentTarget.setPointerCapture?.(event.pointerId);
        } catch {
          /* noop */
        }
        setTouchState(name, true);
      },
      onPointerUp: (event) => {
        try {
          event.currentTarget.releasePointerCapture?.(event.pointerId);
        } catch {
          /* noop */
        }
        releaseTouchPointer(event.pointerId);
      },
      onPointerCancel: (event) => {
        try {
          event.currentTarget.releasePointerCapture?.(event.pointerId);
        } catch {
          /* noop */
        }
        releaseTouchPointer(event.pointerId);
      },
      onLostPointerCapture: (event) => {
        releaseTouchPointer(event.pointerId);
      },
    }),
    [releaseTouchPointer, setTouchState]
  );

  useEffect(() => {
    const onWindowPointerEnd = (event) => {
      releaseTouchPointer(event.pointerId);
    };

    const onWindowBlur = () => {
      releaseAllTouchPointers();
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        releaseAllTouchPointers();
      }
    };

    window.addEventListener("pointerup", onWindowPointerEnd);
    window.addEventListener("pointercancel", onWindowPointerEnd);
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("pointerup", onWindowPointerEnd);
      window.removeEventListener("pointercancel", onWindowPointerEnd);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      releaseAllTouchPointers();
    };
  }, [releaseAllTouchPointers, releaseTouchPointer]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") {
        return;
      }

      if (
        event.code === "ArrowLeft" ||
        event.code === "ArrowRight" ||
        event.code === "ArrowUp" ||
        event.code === "Space"
      ) {
        event.preventDefault();
      }

      controlsRef.current.keys[event.code] = true;

      if (!event.repeat && event.code === "Enter") {
        queueAction("start");
      }
      if (!event.repeat && event.code === "KeyR") {
        queueAction("restart");
      }
      if (!event.repeat && event.code === "KeyP") {
        queueAction("pause");
      }
    };

    const onKeyUp = (event) => {
      controlsRef.current.keys[event.code] = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [queueAction]);

  const buildTextPayload = useCallback(
    (current) => ({
      mode: "head_soccer_pro",
      gameMode: current.mode,
      coordinates: "origin_top_left_x_right_y_down",
      phase: current.phase,
      running: current.running,
      paused: current.paused,
      roundLabel: current.roundLabel,
      goldenGoal: current.goldenGoal,
      difficulty: {
        id: current.difficultyId,
        label: current.difficultyLabel,
      },
      matchDuration: current.matchDuration,
      timer: current.timer,
      timerLabel: current.timerLabel,
      score: current.score,
      powers: current.powers,
      player: current.player,
      cpu: current.cpu,
      ball: current.ball,
      result: current.result,
      message: current.message,
      logs: current.logs,
      competitors: current.competitors,
      tournament: current.tournament,
    }),
    []
  );

  const advanceTime = useCallback(
    (ms) => {
      const loops = Math.max(1, Math.round(ms / STEP_MS));
      for (let i = 0; i < loops; i += 1) {
        stepGame(stateRef.current, controlsRef.current, settingsRef.current, STEP_SECONDS);
      }
      draw(performance.now());
      syncSnapshot();
    },
    [draw, syncSnapshot]
  );

  useGameRuntimeBridge(snapshot, buildTextPayload, advanceTime);

  const introVisible = snapshot.phase === "intro";
  const resultVisible = snapshot.phase === "finished";
  const setupLocked = snapshot.phase === "playing" || snapshot.phase === "goal";
  const isTournamentMode = settings.mode === "tournament";
  const tournamentStatus = snapshot.tournament.status;
  const championVisible = resultVisible && snapshot.mode === "tournament" && tournamentStatus === "champion";
  const pauseLabel = snapshot.paused ? "Resume" : "Pause";
  const startLabel = introVisible
    ? "Kick Off"
    : resultVisible
      ? snapshot.mode === "tournament"
        ? tournamentStatus === "between_rounds"
          ? "Next Round"
          : "Start New Tournament"
        : "Play Again"
      : "Start";
  const restartLabel = isTournamentMode ? "Restart Tournament" : "Restart";
  const resultActionLabel = snapshot.mode === "tournament"
    ? tournamentStatus === "between_rounds"
      ? "Play Next Round"
      : "Start New Tournament"
    : "Rematch";
  const tournamentPathText = useMemo(() => getTournamentPathText(settings.locale), [settings.locale]);

  const controlsHint = useMemo(
    () => "A/D or arrows move, W or up jumps, Space charges a low kick, and aerial headers are stronger. Enter starts, R restarts, P pauses.",
    []
  );

  return (
    <div className="mini-game head-soccer-game head-soccer-pro">
      <div className="mini-head">
        <div>
          <h4>Football Head</h4>
          <p>
            {settings.locale === "es"
              ? `Elige partido unico o torneo, avanza por ${tournamentPathText} y lucha por el trofeo.`
              : `Choose single match or tournament mode, build your run through ${tournamentPathText}, and fight for the trophy.`}
          </p>
        </div>
        <div className="head-soccer-pro-actions">
          <button type="button" onClick={() => queueAction("start")}>
            {startLabel}
          </button>
          <button type="button" onClick={() => queueAction("restart")}>{restartLabel}</button>
          <button
            type="button"
            onClick={() => queueAction("pause")}
            disabled={snapshot.phase === "intro" || snapshot.phase === "finished"}
          >
            {pauseLabel}
          </button>
        </div>
      </div>

      <div className="head-soccer-pro-layout">
        <section className="head-soccer-pro-stage">
          <div className="head-soccer-pro-canvas-shell">
            <canvas
              ref={canvasRef}
              width={WIDTH}
              height={HEIGHT}
              aria-label="Football Head canvas"
            />

            <button
              type="button"
              className="head-soccer-pro-pause-btn"
              onClick={() => queueAction("pause")}
              disabled={snapshot.phase === "intro" || snapshot.phase === "finished"}
            >
              {snapshot.paused ? "Play" : "Pause"}
            </button>

            <div className="head-soccer-pro-hud">
              <div className="head-soccer-pro-hud-top">
                <div className="head-soccer-pro-wing">
                  <span>YOU</span>
                  <div className="head-soccer-pro-track">
                    <div className="head-soccer-pro-track-fill" style={{ width: `${snapshot.powers.you}%` }} />
                  </div>
                  <strong>{snapshot.competitors.you.flag}</strong>
                </div>

                <div className="head-soccer-pro-timer">
                  <small>TIME</small>
                  <strong className={snapshot.timer <= 10 ? "danger" : ""}>{snapshot.timerLabel}</strong>
                </div>

                <div className="head-soccer-pro-wing right">
                  <span>CPU</span>
                  <div className="head-soccer-pro-track">
                    <div className="head-soccer-pro-track-fill" style={{ width: `${snapshot.powers.cpu}%` }} />
                  </div>
                  <strong>{snapshot.competitors.cpu.flag}</strong>
                  <div className="head-soccer-pro-round-tag head-soccer-pro-round-tag--hud">
                    {snapshot.roundLabel}{snapshot.goldenGoal ? " | GOLDEN GOAL" : ""} | {snapshot.competitors.you.name} vs {snapshot.competitors.cpu.name}
                  </div>
                </div>
              </div>

              <div className="head-soccer-pro-score-strip">
                <b>{snapshot.score.you}</b>
                <span>-</span>
                <b>{snapshot.score.cpu}</b>
              </div>
            </div>

            {introVisible ? (
              <div className="head-soccer-pro-overlay">
                <div className="head-soccer-pro-overlay-card">
                  <h5>{isTournamentMode ? "Tournament Mode" : "Single Match"}</h5>
                  <p>
                    {isTournamentMode
                      ? settings.locale === "es"
                        ? `Elige 1 de 8 jugadores y supera ${tournamentPathText} para levantar el trofeo.`
                        : `Choose one of 8 fighters and clear ${tournamentPathText} to lift the trophy.`
                      : "Classic 1v1 arcade football. Use jumps and headers as your main attacking weapon."}
                  </p>
                  <button type="button" onClick={() => queueAction("start")}>Kick Off</button>
                </div>
              </div>
            ) : null}

            {resultVisible ? (
              <div className="head-soccer-pro-overlay result">
                <div className="head-soccer-pro-overlay-card">
                  <h5 style={{ color: snapshot.result.accent }}>{snapshot.result.title}</h5>
                  <p>{snapshot.result.subtitle}</p>
                  <p className="scoreline">{snapshot.score.you} - {snapshot.score.cpu}</p>
                  {snapshot.mode === "tournament" && snapshot.tournament.summary ? (
                    <p className="head-soccer-tournament-summary" style={{ color: snapshot.tournament.summary.accent }}>
                      {snapshot.tournament.summary.title}: {snapshot.tournament.summary.text}
                    </p>
                  ) : null}
                  {championVisible ? (
                    <div className="head-soccer-trophy-celebration" aria-hidden="true">
                      <div className="head-soccer-trophy-icon">🏆</div>
                      <div className="head-soccer-confetti">
                        {Array.from({ length: 18 }, (_, index) => (
                          <span key={`confetti-${index}`} className={`tone-${index % 6}`} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <button type="button" onClick={() => queueAction("start")}>{resultActionLabel}</button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="head-soccer-pro-controls">
            <div className="head-soccer-pro-pad">
              <button type="button" className="head-soccer-pro-btn dir" {...bindTouchHold("left")}>Left</button>
              <button type="button" className="head-soccer-pro-btn dir" {...bindTouchHold("right")}>Right</button>
            </div>
            <div className="head-soccer-pro-pad actions">
              <button type="button" className="head-soccer-pro-btn kick" {...bindTouchHold("kick")}>Kick</button>
              <button type="button" className="head-soccer-pro-btn jump" {...bindTouchHold("jump")}>Jump</button>
            </div>
          </div>

          {isTournamentMode ? (
            <section className={`head-soccer-tournament-board${resultVisible ? " expanded" : ""}`}>
              <h5>{resultVisible ? "Tournament bracket update" : "Tournament bracket"}</h5>
              <div className="head-soccer-bracket-grid">
                {snapshot.tournament.rounds.map((round) => (
                  <div key={round.id} className="head-soccer-bracket-round">
                    <h6>{round.label}</h6>
                    {round.matches.map((match) => (
                      <article
                        key={match.id}
                        className={`head-soccer-bracket-match${match.containsPlayer ? " player-path" : ""}${match.played ? " played" : ""}`}
                      >
                        <span>{match.homeName}</span>
                        <strong>{match.played ? `${match.homeScore}-${match.awayScore}` : "VS"}</strong>
                        <span>{match.awayName}</span>
                      </article>
                    ))}
                  </div>
                ))}
              </div>
              {snapshot.tournament.summary ? (
                <p className="head-soccer-tournament-board-note" style={{ color: snapshot.tournament.summary.accent }}>
                  {snapshot.tournament.summary.title}: {snapshot.tournament.summary.text}
                </p>
              ) : null}
            </section>
          ) : null}
        </section>

        <aside className="head-soccer-pro-sidebar">
          <section className="head-soccer-pro-panel">
            <h5>Mode & Match Setup</h5>
            <label htmlFor="hs-mode">
              Mode
              <select
                id="hs-mode"
                value={settings.mode}
                disabled={setupLocked}
                onChange={(event) => {
                  const nextMode = event.target.value === "tournament" ? "tournament" : "single";
                  setSettings((previous) => ({ ...previous, mode: nextMode }));
                }}
              >
                {GAME_MODE_OPTIONS.map((modeOption) => (
                  <option key={modeOption.id} value={modeOption.id}>
                    {modeOption.label}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="hs-difficulty">
              CPU level
              <select
                id="hs-difficulty"
                value={settings.difficultyId}
                disabled={setupLocked}
                onChange={(event) => {
                  const nextDifficulty = event.target.value;
                  setSettings((previous) => ({ ...previous, difficultyId: nextDifficulty }));
                }}
              >
                {DIFFICULTY_OPTIONS.map((difficulty) => (
                  <option key={difficulty.id} value={difficulty.id}>
                    {difficulty.label}
                  </option>
                ))}
              </select>
            </label>

            {settings.mode === "single" ? (
              <>
                <label htmlFor="hs-duration">
                  Match duration
                  <select
                    id="hs-duration"
                    value={settings.duration}
                    disabled={setupLocked}
                    onChange={(event) => {
                      const nextDuration = Number(event.target.value);
                      setSettings((previous) => ({ ...previous, duration: nextDuration }));
                    }}
                  >
                    {MATCH_OPTIONS.map((duration) => (
                      <option key={duration} value={duration}>
                        {duration}s
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <label htmlFor="hs-tournament-duration">
                Tournament round time
                <select
                  id="hs-tournament-duration"
                  value={settings.tournamentDuration}
                  disabled={setupLocked}
                  onChange={(event) => {
                    const nextDuration = Number(event.target.value);
                    setSettings((previous) => ({ ...previous, tournamentDuration: nextDuration }));
                  }}
                >
                  {TOURNAMENT_MATCH_OPTIONS.map((duration) => (
                    <option key={duration} value={duration}>
                      {duration}s
                    </option>
                  ))}
                </select>
              </label>
            )}

            <p className="note">Settings apply on next kickoff/restart in both modes.</p>
          </section>

          {isTournamentMode ? (
            <section className="head-soccer-pro-panel">
              <h5>Select Fighter (8)</h5>
              <div className="head-soccer-character-grid">
                {TOURNAMENT_CHARACTERS.map((character) => {
                  const selected = settings.tournamentCharacterId === character.id;
                  return (
                    <button
                      key={character.id}
                      type="button"
                      data-character-id={character.id}
                      className={`head-soccer-character-card${selected ? " selected" : ""}`}
                      disabled={setupLocked}
                      onClick={() => {
                        setSettings((previous) => ({ ...previous, tournamentCharacterId: character.id }));
                      }}
                    >
                      <span className="flag">{character.flag}</span>
                      <strong>{character.name}</strong>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="head-soccer-pro-panel">
            <h5>Live Status</h5>
            <div className="head-soccer-pro-grid">
              <div>
                <span>Mode</span>
                <strong>{snapshot.mode === "tournament" ? "TOURNAMENT" : "SINGLE"}</strong>
              </div>
              <div>
                <span>State</span>
                <strong>{snapshot.phase.toUpperCase()}</strong>
              </div>
              <div>
                <span>Round</span>
                <strong>{snapshot.roundLabel}</strong>
              </div>
              <div>
                <span>Difficulty</span>
                <strong>{snapshot.difficultyLabel}</strong>
              </div>
              <div>
                <span>Ball speed</span>
                <strong>{snapshot.ball.speed}</strong>
              </div>
              <div>
                <span>Timer</span>
                <strong>{snapshot.timerLabel}</strong>
              </div>
            </div>
          </section>

          <section className="head-soccer-pro-panel">
            <h5>Controls</h5>
            <p>{controlsHint}</p>
          </section>
        </aside>
      </div>

      <p className="game-message">{snapshot.message}</p>
      <ul className="game-log">
        {snapshot.logs.map((entry, index) => (
          <li key={`${entry}-${index}`}>{entry}</li>
        ))}
      </ul>
    </div>
  );
}
