import React, { useCallback, useEffect, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";

const TABLE_WIDTH = 960;
const TABLE_HEIGHT = 540;
const PLAY_LEFT = 86;
const PLAY_TOP = 82;
const PLAY_RIGHT = TABLE_WIDTH - 86;
const PLAY_BOTTOM = TABLE_HEIGHT - 82;
const TABLE_CENTER_X = (PLAY_LEFT + PLAY_RIGHT) / 2;
const TABLE_CENTER_Y = (PLAY_TOP + PLAY_BOTTOM) / 2;
const HEAD_STRING_X = PLAY_LEFT + (PLAY_RIGHT - PLAY_LEFT) * 0.24;
const FOOT_SPOT_X = PLAY_LEFT + (PLAY_RIGHT - PLAY_LEFT) * 0.74;
const BALL_RADIUS = 11.2;
const BALL_DIAMETER = BALL_RADIUS * 2;
const CORNER_POCKET_RADIUS = 26;
const SIDE_POCKET_RADIUS = 23;
const FIXED_DT = 1 / 120;
const MAX_FRAME_MS = 50;
const ROLL_DECEL = 138;
const STOP_SPEED = 5;
const RESTITUTION = 0.985;
const AI_ACTION_SLOWDOWN = 5.2;
const AIM_STEP = Math.PI / 180 * 1.6;
const POWER_STEP = 0.05;
const PLACE_NUDGE_STEP = 9;
const PLACE_NUDGE_FINE_STEP = 4;
const MAX_LOG_ITEMS = 6;
const PLAYER_HUMAN = 0;
const PLAYER_AI = 1;

const MODE_PRESETS = {
  "eight-ball": {
    label: { es: "Bola 8", en: "8-Ball" },
    summary: {
      es: "Mesa abierta, lisas/rayas y cierre cantando la 8.",
      en: "Open table, solids/stripes assignment, and a called 8-ball finish.",
    },
  },
  "nine-ball": {
    label: { es: "Bola 9", en: "9-Ball" },
    summary: {
      es: "Orden numerico, blanca en mano y regla de tres faltas.",
      en: "Numerical order, cue-ball in hand fouls, and the three-foul rule.",
    },
  },
  "ten-ball": {
    label: { es: "Bola 10", en: "10-Ball" },
    summary: {
      es: "Tiro cantado, push out y reposicion de la 10.",
      en: "Called-shot discipline, push out, and legal 10-ball spotting.",
    },
  },
  "carom-libre": {
    label: { es: "Carambola Libre", en: "Free Carom" },
    summary: {
      es: "Mesa sin troneras con 3 bolas: puntua al contactar las dos bolas objetivas en un mismo tiro.",
      en: "Pocketless 3-ball table: score by contacting both object balls in a single shot.",
    },
  },
  kelly: {
    label: { es: "Kelly", en: "Kelly" },
    summary: {
      es: "Modalidad recreativa multi-jugador: cada jugador tiene bola objetivo propia y gana quien emboca la suya.",
      en: "Recreational multiplayer variant: each player has a personal target ball and wins by pocketing it.",
    },
  },
};

const DIFFICULTY_PRESETS = {
  casual: {
    label: { es: "Recreativo", en: "Casual" },
    aimNoise: 0.11,
    powerNoise: 0.16,
    pickSpread: 5,
    thinkMs: 760,
    placeStepX: 92,
    placeStepY: 84,
    allowBankShots: false,
    bankShotWeight: 210,
    pushOutScoreThreshold: 760,
    safetyRiskThreshold: 980,
    safetyChanceOnRisk: 0.24,
    safetyChanceOnContact: 0.36,
    keyBallBonus: 12,
    powerDistanceWeight: 0.16,
    placementBias: 0.14,
  },
  club: {
    label: { es: "Club", en: "Club" },
    aimNoise: 0.045,
    powerNoise: 0.09,
    pickSpread: 2,
    thinkMs: 560,
    placeStepX: 74,
    placeStepY: 66,
    allowBankShots: true,
    bankShotWeight: 116,
    pushOutScoreThreshold: 860,
    safetyRiskThreshold: 900,
    safetyChanceOnRisk: 0.2,
    safetyChanceOnContact: 0.26,
    keyBallBonus: 22,
    powerDistanceWeight: 0.26,
    placementBias: 0.1,
  },
  pro: {
    label: { es: "Pro", en: "Pro" },
    aimNoise: 0.013,
    powerNoise: 0.035,
    pickSpread: 1,
    thinkMs: 460,
    placeStepX: 56,
    placeStepY: 52,
    allowBankShots: true,
    bankShotWeight: 56,
    pushOutScoreThreshold: 935,
    safetyRiskThreshold: 840,
    safetyChanceOnRisk: 0.16,
    safetyChanceOnContact: 0.18,
    keyBallBonus: 36,
    powerDistanceWeight: 0.38,
    placementBias: 0.06,
  },
};

const AI_ACTION_LABELS = {
  idle: "IA en espera.",
  scan: "IA analizando mesa y rutas posibles.",
  autoPlace: "IA autocolocando blanca en mano.",
  setPocket: "IA cantando tronera objetivo.",
  adjustAim: "IA ajustando angulo de tiro.",
  adjustPower: "IA calibrando potencia.",
  pushOut: "IA preparando push out.",
  safety: "IA preparando safety tactico.",
  shoot: "IA ejecutando tiro.",
};

const BALL_COLORS = {
  1: "#facc15",
  2: "#2563eb",
  3: "#ef4444",
  4: "#7c3aed",
  5: "#f97316",
  6: "#16a34a",
  7: "#881337",
  8: "#111827",
  9: "#facc15",
  10: "#2563eb",
  11: "#ef4444",
  12: "#7c3aed",
  13: "#f97316",
  14: "#16a34a",
  15: "#881337",
};

const POCKETS = [
  { id: "tl", label: { es: "Sup. izq.", en: "Top left" }, x: PLAY_LEFT - 10, y: PLAY_TOP - 10, radius: CORNER_POCKET_RADIUS },
  { id: "tm", label: { es: "Sup. centro", en: "Top center" }, x: TABLE_CENTER_X, y: PLAY_TOP - 6, radius: SIDE_POCKET_RADIUS },
  { id: "tr", label: { es: "Sup. dcha.", en: "Top right" }, x: PLAY_RIGHT + 10, y: PLAY_TOP - 10, radius: CORNER_POCKET_RADIUS },
  { id: "bl", label: { es: "Inf. izq.", en: "Bottom left" }, x: PLAY_LEFT - 10, y: PLAY_BOTTOM + 10, radius: CORNER_POCKET_RADIUS },
  { id: "bm", label: { es: "Inf. centro", en: "Bottom center" }, x: TABLE_CENTER_X, y: PLAY_BOTTOM + 6, radius: SIDE_POCKET_RADIUS },
  { id: "br", label: { es: "Inf. dcha.", en: "Bottom right" }, x: PLAY_RIGHT + 10, y: PLAY_BOTTOM + 10, radius: CORNER_POCKET_RADIUS },
];

const UI_COPY = {
  es: {
    title: "Billar Pool Club",
    subtitle: "Pool arcade-profesional con fisica top-down, modos Bola 8/Bola 9/Bola 10, push out, safety y IA tactica.",
    start: "Empezar",
    nextRack: "Siguiente rack",
    restartRack: "Repetir rack",
    newMatch: "Nuevo match",
    fullscreen: "Pantalla completa",
    orientationHorizontal: "Mesa horizontal",
    orientationVertical: "Mesa vertical",
    gameMode: "Modo de juego",
    aiMode: "Modo IA",
    participants: "Participantes",
    modeGoal: "Objetivo del modo:",
    leader: "Lider",
    pointsUnit: "puntos",
    winsUnit: "victorias",
    onTable: "en mesa",
    pocketed: "embocada",
    turn: "Turno",
    mode: "Modo",
    raceTo: "Objetivo: al mejor de",
    tableOpen: "Mesa abierta",
    ballInHand: "Blanca en mano",
    pushOutAvailable: "Push out disponible",
    safetyActive: "Safety activo",
    openTableButton: "Abrir mesa",
    rackClosedTitle: "Rack cerrado",
    prepareNextRack: "Preparar siguiente rack",
    matchFinishedTitle: "Match finalizado",
    backToMenu: "Volver al menu",
    scoreboard: "Marcador",
    group: "Grupo",
    remaining: "Restantes",
    targetBall: "Bola objetivo",
    foulsInRow: "Faltas seguidas",
    telemetry: "Telemetria",
    legalTarget: "Objetivo legal",
    power: "Potencia",
    angle: "Angulo",
    lowestBall: "Bola mas baja",
    pushOut: "Push out",
    yes: "si",
    no: "no",
    declared: "declarado",
    calledPocket: "Tronera cantada",
    aiConsole: "Cabina IA",
    analyzing: "analizando",
    standby: "standby",
    aiLedGroup: "Indicadores LED de acciones IA",
    aiTurn: "Turno IA",
    autoPlace: "Auto colocar",
    pocket: "Tronera",
    aimAdjust: "Ajuste angulo",
    powerAdjust: "Ajuste potencia",
    shoot: "Tirar",
    plan: "Plan",
    planPot: "tronera directa",
    planKick: "trayectoria alternativa",
    planContact: "contacto",
    ball: "bola",
    decision: "Decision",
    choosePocket: "Elige tronera",
    callShot: "Cantar tiro",
    callEight: "Cantar la 8",
    aimMinus: "Aim -",
    aimPlus: "Aim +",
    powerMinus: "- Potencia",
    powerPlus: "+ Potencia",
    safety: "Safety",
    shootButton: "Tirar",
    optionalMouseAim: "Raton opcional para apuntar.",
    help1: "A/D ajustan el taco en fase de apuntado.",
    help2: "W/S regulan potencia.",
    help3: "En blanca en mano: flechas o WASD mueven la bola.",
    help4: "Enter/Space fijan la blanca (Shift = ajuste fino).",
    help5: "O push out, V safety.",
    help6: "1/2 resuelven decisiones.",
    help7: "Space tira.",
    mobileHintPlace: "Pad tactil: mueve la blanca en mano en cuatro direcciones.",
    mobileHintAim: "Pad tactil: izquierda/derecha apuntan, arriba/abajo ajustan potencia.",
    mobileControlsAria: "Controles tactiles de billar",
    up: "Arriba",
    left: "Izquierda",
    right: "Derecha",
    down: "Abajo",
    placeCueBall: "Fijar blanca",
    autoCueBall: "Auto blanca",
    speedToUnderstand: "Rompe, gestiona faltas, usa push out/safety cuando toque y gana un duelo al mejor de",
    racksUnit: "racks",
    racks: "racks.",
  },
  en: {
    title: "Pool Club Billiards",
    subtitle: "Arcade-professional top-down pool with 8-ball/9-ball/10-ball rules, push out, safety, and tactical AI.",
    start: "Start",
    nextRack: "Next rack",
    restartRack: "Replay rack",
    newMatch: "New match",
    fullscreen: "Fullscreen",
    orientationHorizontal: "Horizontal table",
    orientationVertical: "Vertical table",
    gameMode: "Game mode",
    aiMode: "AI mode",
    participants: "Players",
    modeGoal: "Mode objective:",
    leader: "Leader",
    pointsUnit: "points",
    winsUnit: "wins",
    onTable: "on table",
    pocketed: "pocketed",
    turn: "Turn",
    mode: "Mode",
    raceTo: "Target: race to",
    tableOpen: "Open table",
    ballInHand: "Cue ball in hand",
    pushOutAvailable: "Push out available",
    safetyActive: "Safety active",
    openTableButton: "Open table",
    rackClosedTitle: "Rack over",
    prepareNextRack: "Prepare next rack",
    matchFinishedTitle: "Match over",
    backToMenu: "Back to menu",
    scoreboard: "Scoreboard",
    group: "Group",
    remaining: "Remaining",
    targetBall: "Target ball",
    foulsInRow: "Fouls in a row",
    telemetry: "Telemetry",
    legalTarget: "Legal target",
    power: "Power",
    angle: "Angle",
    lowestBall: "Lowest ball",
    pushOut: "Push out",
    yes: "yes",
    no: "no",
    declared: "declared",
    calledPocket: "Called pocket",
    aiConsole: "AI cockpit",
    analyzing: "analyzing",
    standby: "standby",
    aiLedGroup: "AI action LED indicators",
    aiTurn: "AI turn",
    autoPlace: "Auto place",
    pocket: "Pocket",
    aimAdjust: "Aim adjust",
    powerAdjust: "Power adjust",
    shoot: "Shoot",
    plan: "Plan",
    planPot: "direct pot",
    planKick: "alternative rail route",
    planContact: "contact shot",
    ball: "ball",
    decision: "Decision",
    choosePocket: "Choose pocket",
    callShot: "Call shot",
    callEight: "Call the 8",
    aimMinus: "Aim -",
    aimPlus: "Aim +",
    powerMinus: "- Power",
    powerPlus: "+ Power",
    safety: "Safety",
    shootButton: "Shoot",
    optionalMouseAim: "Mouse aiming is optional.",
    help1: "A/D fine-tune cue angle during aiming.",
    help2: "W/S adjust power.",
    help3: "With ball in hand: arrows or WASD move the cue ball.",
    help4: "Enter/Space confirms cue ball placement (Shift = fine nudge).",
    help5: "O for push out, V for safety.",
    help6: "1/2 resolve decision prompts.",
    help7: "Space shoots.",
    mobileHintPlace: "Touch pad: move the cue ball in hand in four directions.",
    mobileHintAim: "Touch pad: left/right aim, up/down adjust power.",
    mobileControlsAria: "Billiards touch controls",
    up: "Up",
    left: "Left",
    right: "Right",
    down: "Down",
    placeCueBall: "Lock cue ball",
    autoCueBall: "Auto place",
    speedToUnderstand: "Break, manage fouls, use push out/safety when needed, and win a duel race to",
    racksUnit: "racks",
    racks: "racks.",
  },
};

const STATUS_LABELS = {
  menu: { es: "menu", en: "menu" },
  aim: { es: "apuntando", en: "aiming" },
  placing: { es: "colocando blanca", en: "placing cue ball" },
  moving: { es: "bolas en movimiento", en: "balls in motion" },
  "ai-thinking": { es: "IA pensando", en: "AI thinking" },
  decision: { es: "decision", en: "decision" },
  "rack-over": { es: "rack cerrado", en: "rack over" },
  "match-over": { es: "match finalizado", en: "match over" },
};

function resolveLocale() {
  if (typeof navigator === "undefined" || typeof navigator.language !== "string") return "en";
  return navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
}

function localizeLabel(label, locale) {
  if (typeof label === "string") return label;
  return label?.[locale] ?? label?.es ?? "";
}

function modeLabel(modeKey, locale) {
  return localizeLabel(MODE_PRESETS[modeKey]?.label, locale) || modeKey;
}

function modeSummary(modeKey, locale) {
  return localizeLabel(MODE_PRESETS[modeKey]?.summary, locale) || "";
}

function difficultyLabel(difficultyKey, locale) {
  return localizeLabel(DIFFICULTY_PRESETS[difficultyKey]?.label, locale) || difficultyKey;
}

function pocketLabel(pocketId, locale) {
  const pocket = POCKETS.find((entry) => entry.id === pocketId);
  if (!pocket) return null;
  return localizeLabel(pocket.label, locale) || pocketId;
}

function localizePlayerName(name, locale) {
  if (locale === "es" || !name) return name;
  let out = String(name);
  out = out.replace(/^Tu$/i, "You");
  out = out.replace(/^IA\s+/i, "AI ");
  out = out.replace(/\bRecreativo\b/g, "Casual");
  return out;
}

function statusLabel(status, locale) {
  return STATUS_LABELS[status]?.[locale] ?? status;
}

function modeHasPockets(modeKey) {
  return modeKey !== "carom-libre";
}

function isKellyMode(modeKey) {
  return modeKey === "kelly";
}

function isCaromMode(modeKey) {
  return modeKey === "carom-libre";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function normalizeAngle(angle) {
  let next = angle;
  while (next <= -Math.PI) next += Math.PI * 2;
  while (next > Math.PI) next -= Math.PI * 2;
  return next;
}

function lerpAngle(start, end, t) {
  const delta = normalizeAngle(end - start);
  return normalizeAngle(start + delta * clamp(t, 0, 1));
}

function scaleAiDuration(durationMs) {
  return Math.max(40, Math.round(durationMs * AI_ACTION_SLOWDOWN));
}

function createAiLedState(active = {}) {
  return {
    turn: Boolean(active.turn),
    autoPlace: Boolean(active.autoPlace),
    pocket: Boolean(active.pocket),
    aim: Boolean(active.aim),
    power: Boolean(active.power),
    pushOut: Boolean(active.pushOut),
    safety: Boolean(active.safety),
    shoot: Boolean(active.shoot),
  };
}

function ballGroupFromNumber(number) {
  if (number >= 1 && number <= 7) return "solids";
  if (number >= 9 && number <= 15) return "stripes";
  return null;
}

function groupLabel(group, locale = "es") {
  if (group === "solids") return locale === "es" ? "lisas" : "solids";
  if (group === "stripes") return locale === "es" ? "rayas" : "stripes";
  return locale === "es" ? "abierta" : "open table";
}

function localizeRuntimeText(text, locale) {
  if (locale === "es" || text == null) return text;
  let out = String(text);
  const replacements = [
    [/Configura la mesa y pulsa Empezar\./g, "Set up the table and press Start."],
    [/Push out no disponible en esta entrada\./g, "Push out is not available on this visit."],
    [/Elige una tronera para cantar (.+) antes de tirar\./g, "Choose a pocket to call $1 before shooting."],
    [/La 8 se recoloca tras el saque\./g, "The 8 is spotted again after the break."],
    [/Safety declarado para el proximo tiro\./g, "Safety declared for the next shot."],
    [/Safety cancelado\./g, "Safety cancelled."],
    [/Blanca colocada automaticamente\./g, "Cue ball auto-placed."],
    [/Blanca en mano fijada con teclado\./g, "Cue ball in hand locked from keyboard controls."],
    [/Blanca en mano colocada\./g, "Cue ball in hand placed."],
    [/Posicion invalida para la blanca\./g, "Invalid cue-ball position."],
    [/La IA no encontro tiro claro y cede la mesa\./g, "AI found no clear shot and gives up the table."],
    [/Scratch: la blanca cae en tronera\./g, "Scratch: the cue ball drops into a pocket."],
    [/Falta: bola objetiva fuera de la mesa\./g, "Foul: object ball left the table."],
    [/Falta: no hubo contacto con una bola objetiva\./g, "Foul: no contact with an object ball."],
    [/Falta: primero debias tocar la (\d+)\./g, "Foul: you had to hit the $1 first."],
    [/Falta: con mesa resuelta debes tocar primero la 8\./g, "Foul: with your group cleared, you must hit the 8 first."],
    [/Falta: con mesa abierta no puedes tocar primero la 8\./g, "Foul: on an open table you cannot hit the 8 first."],
    [/Falta: debias tocar primero una (lisas|rayas|abierta)\./g, "Foul: you had to hit a $1 ball first."],
    [/Falta: ninguna bola toco banda tras el contacto\./g, "Foul: no ball hit a rail after contact."],
    [/Saque ilegal: menos de cuatro bolas objetivas tocaron banda\./g, "Illegal break: fewer than four object balls reached a rail."],
    [/gana por tres faltas consecutivas\./g, "wins by three consecutive fouls."],
    [/queda avisado con dos faltas seguidas\./g, "is now on two fouls in a row."],
    [/decide tras push out\./g, "decides after push out."],
    [/acepta la mesa tras push out\./g, "accepts the table after push out."],
    [/devuelve el tiro a /g, "passes the shot back to "],
    [/mantiene la entrada\. Push out disponible\./g, "keeps control. Push out available."],
    [/entra con opcion de push out\./g, "comes in with a push out option."],
    [/mantiene la entrada\./g, "keeps control."],
    [/toma el turno\./g, "takes the turn."],
    [/decide tras safety con bola legal embocada\./g, "decides after a safety with a legal pocketed ball."],
    [/acepta la mesa tras safety\./g, "accepts the table after safety."],
    [/entra tras safety\./g, "comes in after safety."],
    [/decide tras tiro cantado no valido\./g, "decides after an invalid called shot."],
    [/acepta la mesa tras tiro no cantado\./g, "accepts the table after an uncalled shot."],
    [/emboca la 10 legalmente y gana el rack\./g, "pockets the 10 legally and wins the rack."],
    [/emboca la 10 antes de tiempo: se repone y sigue\./g, "pockets the 10 early: it is spotted and play continues."],
    [/mantiene la entrada con tiro cantado valido\./g, "keeps control with a valid called shot."],
    [/tira a tronera\./g, "shoots for the pocket."],
    [/tira con trayectoria alternativa por banda\./g, "shoots using an alternate rail route."],
    [/tira de seguridad\./g, "plays a safety shot."],
    [/declara push out\./g, "declares push out."],
    [/juega un safety\./g, "plays a safety."],
    [/ejecuta el tiro\./g, "takes the shot."],
    [/Dificultad /g, "Difficulty "],
    [/Tronera cantada: /g, "Called pocket: "],
    [/Jugar mesa/g, "Play table"],
    [/Devolver tiro/g, "Pass shot back"],
    [/rompe en /g, "breaks in "],
    [/toma /g, "takes "],
    [/sigue en mesa con /g, "stays at the table with "],
    [/bola\(s\) de su grupo\./g, "ball(s) of their group."],
    [/entra a mesa\./g, "comes to the table."],
    [/gana: 8 ilegal o en tronera incorrecta\./g, "wins: illegal 8-ball or wrong pocket."],
    [/cierra la 8 en /g, "finishes the 8 in "],
    [/emboca la 9 y gana el rack\./g, "pockets the 9 and wins the rack."],
    [/IA en espera\./g, "AI idle."],
    [/IA analizando mesa y rutas posibles\./g, "AI analyzing table and possible routes."],
    [/IA autocolocando blanca en mano\./g, "AI auto-placing cue ball in hand."],
    [/IA cantando tronera objetivo\./g, "AI calling target pocket."],
    [/IA ajustando angulo de tiro\./g, "AI adjusting shot angle."],
    [/IA calibrando potencia\./g, "AI calibrating shot power."],
    [/IA preparando push out\./g, "AI preparing push out."],
    [/IA preparando safety tactico\./g, "AI preparing tactical safety."],
    [/IA ejecutando tiro\./g, "AI executing shot."],
  ];
  replacements.forEach(([pattern, value]) => {
    out = out.replace(pattern, value);
  });
  out = out.replace(/\bBola 8\b/g, "8-Ball");
  out = out.replace(/\bBola 9\b/g, "9-Ball");
  out = out.replace(/\bBola 10\b/g, "10-Ball");
  out = out.replace(/\blisas\b/g, "solids");
  out = out.replace(/\brayas\b/g, "stripes");
  out = out.replace(/\babierta\b/g, "open table");
  out = out.replace(/\bIA\b/g, "AI");
  out = out.replace(/Sup\. izq\./g, "Top left");
  out = out.replace(/Sup\. centro/g, "Top center");
  out = out.replace(/Sup\. dcha\./g, "Top right");
  out = out.replace(/Inf\. izq\./g, "Bottom left");
  out = out.replace(/Inf\. centro/g, "Bottom center");
  out = out.replace(/Inf\. dcha\./g, "Bottom right");
  out = out.replace(/tronera cantada/g, "called pocket");
  return out;
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function distancePointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy), 0, 1);
  const sx = x1 + dx * t;
  const sy = y1 + dy * t;
  return Math.hypot(px - sx, py - sy);
}

function shuffle(values) {
  const next = [...values];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function makeCueBall(x, y) {
  return {
    id: "cue",
    number: 0,
    x,
    y,
    vx: 0,
    vy: 0,
    pocketed: false,
    stripe: false,
    color: "#f8fafc",
    lastPocketId: null,
  };
}

function makeObjectBall(number, x, y) {
  return {
    id: `ball-${number}`,
    number,
    x,
    y,
    vx: 0,
    vy: 0,
    pocketed: false,
    stripe: number >= 9,
    color: BALL_COLORS[number] ?? "#64748b",
    lastPocketId: null,
  };
}

function buildTriangleRackPositions() {
  const positions = [];
  const xSpacing = BALL_RADIUS * 1.82;
  const ySpacing = BALL_RADIUS * 1.04;
  for (let row = 0; row < 5; row += 1) {
    for (let index = 0; index <= row; index += 1) {
      positions.push({
        x: FOOT_SPOT_X + row * xSpacing,
        y: TABLE_CENTER_Y + (index * 2 - row) * ySpacing,
      });
    }
  }
  return positions;
}

function buildDiamondRackPositions() {
  const offsets = [1, 2, 3, 2, 1];
  const positions = [];
  const xSpacing = BALL_RADIUS * 1.82;
  const ySpacing = BALL_RADIUS * 1.04;
  offsets.forEach((count, row) => {
    for (let index = 0; index < count; index += 1) {
      positions.push({
        x: FOOT_SPOT_X + row * xSpacing,
        y: TABLE_CENTER_Y + (index * 2 - (count - 1)) * ySpacing,
      });
    }
  });
  return positions;
}

function buildTenBallRackPositions() {
  const offsets = [1, 2, 3, 4];
  const positions = [];
  const xSpacing = BALL_RADIUS * 1.82;
  const ySpacing = BALL_RADIUS * 1.04;
  offsets.forEach((count, row) => {
    for (let index = 0; index < count; index += 1) {
      positions.push({
        x: FOOT_SPOT_X + row * xSpacing,
        y: TABLE_CENTER_Y + (index * 2 - (count - 1)) * ySpacing,
      });
    }
  });
  return positions;
}

function buildEightBallNumbers() {
  const solids = shuffle([1, 2, 3, 4, 5, 6, 7]);
  const stripes = shuffle([9, 10, 11, 12, 13, 14, 15]);
  const cornerLeft = solids.pop();
  const cornerRight = stripes.pop();
  const apexCandidates = shuffle([...solids, ...stripes]);
  const apex = apexCandidates[0];
  const pool = shuffle([
    ...solids.filter((value) => value !== apex),
    ...stripes.filter((value) => value !== apex),
  ]);
  const numbers = new Array(15).fill(null);
  numbers[0] = apex;
  numbers[4] = 8;
  numbers[10] = cornerLeft;
  numbers[14] = cornerRight;
  for (let i = 0; i < numbers.length; i += 1) {
    if (numbers[i] == null) {
      numbers[i] = pool.shift();
    }
  }
  return numbers;
}

function buildKellyNumbers() {
  return shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
}

function buildCaromBalls() {
  return [
    makeCueBall(PLAY_LEFT + 160, TABLE_CENTER_Y),
    makeObjectBall(1, TABLE_CENTER_X + 90, TABLE_CENTER_Y - 48),
    makeObjectBall(2, TABLE_CENTER_X + 190, TABLE_CENTER_Y + 54),
  ];
}

function buildRackBalls(modeKey) {
  if (isCaromMode(modeKey)) {
    return buildCaromBalls();
  }
  const cue = makeCueBall(HEAD_STRING_X - 74, TABLE_CENTER_Y);
  if (modeKey === "nine-ball") {
    const positions = buildDiamondRackPositions();
    const rest = shuffle([2, 3, 4, 5, 6, 7, 8]);
    const numbers = [1, rest[0], rest[1], rest[2], 9, rest[3], rest[4], rest[5], rest[6]];
    return [cue, ...positions.map((position, index) => makeObjectBall(numbers[index], position.x, position.y))];
  }
  if (modeKey === "ten-ball") {
    const positions = buildTenBallRackPositions();
    const rest = shuffle([2, 3, 4, 5, 6, 7, 8, 9]);
    const numbers = new Array(10).fill(null);
    numbers[0] = 1;
    numbers[4] = 10;
    let ptr = 0;
    for (let i = 0; i < numbers.length; i += 1) {
      if (numbers[i] == null) {
        numbers[i] = rest[ptr];
        ptr += 1;
      }
    }
    return [cue, ...positions.map((position, index) => makeObjectBall(numbers[index], position.x, position.y))];
  }
  if (isKellyMode(modeKey)) {
    const positions = buildTriangleRackPositions();
    const numbers = buildKellyNumbers();
    return [cue, ...positions.map((position, index) => makeObjectBall(numbers[index], position.x, position.y))];
  }
  const positions = buildTriangleRackPositions();
  const numbers = buildEightBallNumbers();
  return [cue, ...positions.map((position, index) => makeObjectBall(numbers[index], position.x, position.y))];
}

function createPlayers(difficultyKey, locale, modeKey, participantCount = 2) {
  if (!isKellyMode(modeKey)) {
    return [
      { name: locale === "es" ? "Tu" : "You", type: "human", group: null, racksWon: 0, foulsInRow: 0, kellyTarget: null },
      { name: `${locale === "es" ? "IA" : "AI"} ${difficultyLabel(difficultyKey, locale)}`, type: "ai", group: null, racksWon: 0, foulsInRow: 0, kellyTarget: null },
    ];
  }
  const total = clamp(Math.round(Number(participantCount) || 2), 2, 15);
  return Array.from({ length: total }, (_, index) => ({
    name: index === 0 ? (locale === "es" ? "Tu" : "You") : `${locale === "es" ? "IA" : "AI"} ${index}`,
    type: index === 0 ? "human" : "ai",
    group: null,
    racksWon: 0,
    foulsInRow: 0,
    kellyTarget: null,
  }));
}

function createRuntimeState(modeKey = "eight-ball", difficultyKey = "club", locale = resolveLocale(), participantCount = 2) {
  const initialMessage = locale === "es" ? "Configura la mesa y pulsa Empezar." : "Set up the table and press Start.";
  return {
    locale,
    modeKey,
    difficultyKey,
    participantCount: isKellyMode(modeKey) ? clamp(Math.round(Number(participantCount) || 2), 2, 15) : 2,
    raceTo: isCaromMode(modeKey) ? 10 : isKellyMode(modeKey) ? 1 : 3,
    players: createPlayers(difficultyKey, locale, modeKey, participantCount),
    currentPlayer: PLAYER_HUMAN,
    breakerIndex: PLAYER_HUMAN,
    nextBreaker: isKellyMode(modeKey) ? 1 : PLAYER_AI,
    phase: "menu",
    balls: [],
    tableOpen: modeKey === "eight-ball",
    breakShot: true,
    pushOutAvailable: false,
    ballInHand: { active: false, restrictHeadString: false },
    cueControl: { angle: 0, power: 0.74 },
    safetyDeclared: false,
    calledPocketId: null,
    shot: null,
    pendingDecision: null,
    aiTimerMs: 0,
    rackWinner: null,
    matchWinner: null,
    message: initialMessage,
    log: [initialMessage],
    aiRoutine: null,
    aiLeds: createAiLedState(),
    aiAction: AI_ACTION_LABELS.idle,
    aiPlanPreview: null,
    fullscreen: false,
    shotCount: 0,
  };
}

function cloneWins(players) {
  return players.map((player) => player.racksWon);
}

function nextPlayerIndex(state, fromIndex = state.currentPlayer) {
  if (!isKellyMode(state.modeKey)) {
    return fromIndex === PLAYER_HUMAN ? PLAYER_AI : PLAYER_HUMAN;
  }
  if (!state.players.length) return 0;
  return (fromIndex + 1) % state.players.length;
}

function assignKellyTargets(state) {
  if (!isKellyMode(state.modeKey)) return;
  const drawPool = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  state.players.forEach((player, index) => {
    player.group = null;
    player.foulsInRow = 0;
    player.kellyTarget = drawPool[index] ?? null;
  });
}

function getCueBall(state) {
  return state.balls.find((ball) => ball.id === "cue") ?? null;
}

function getBallById(state, ballId) {
  return state.balls.find((ball) => ball.id === ballId) ?? null;
}

function getActiveBalls(state) {
  return state.balls.filter((ball) => !ball.pocketed);
}

function addLog(state, text) {
  state.message = text;
  state.log = [text, ...state.log.filter((entry) => entry !== text)].slice(0, MAX_LOG_ITEMS);
}

function clearAiTelemetry(state) {
  state.aiRoutine = null;
  state.aiPlanPreview = null;
  state.aiAction = AI_ACTION_LABELS.idle;
  state.aiLeds = createAiLedState();
}

function setAiTelemetry(state, action, leds = {}) {
  const aiTurnActive = state.players[state.currentPlayer]?.type === "ai";
  state.aiAction = action;
  state.aiLeds = createAiLedState({ turn: aiTurnActive, ...leds });
}

function ballMatchesGroup(ball, group) {
  if (!ball || !group) return false;
  return ballGroupFromNumber(ball.number) === group;
}

function countRemainingGroupBalls(state, playerIndex) {
  const group = state.players[playerIndex]?.group;
  if (!group) return 0;
  return state.balls.filter((ball) => !ball.pocketed && ballMatchesGroup(ball, group)).length;
}

function getLowestNumber(state) {
  const numbers = state.balls
    .filter((ball) => !ball.pocketed && ball.number > 0)
    .map((ball) => ball.number)
    .sort((a, b) => a - b);
  return numbers[0] ?? null;
}

function getLegalNumbers(state, playerIndex) {
  if (isCaromMode(state.modeKey)) {
    return state.balls
      .filter((ball) => !ball.pocketed && ball.number > 0)
      .map((ball) => ball.number);
  }
  if (isKellyMode(state.modeKey)) {
    const target = state.players[playerIndex]?.kellyTarget ?? null;
    if (target == null) return [];
    const targetBall = state.balls.find((ball) => ball.number === target);
    return targetBall && !targetBall.pocketed ? [target] : [];
  }
  if (state.modeKey === "nine-ball" || state.modeKey === "ten-ball") {
    const lowest = getLowestNumber(state);
    return lowest == null ? [] : [lowest];
  }
  const player = state.players[playerIndex];
  if (state.tableOpen || !player.group) {
    return state.balls
      .filter((ball) => !ball.pocketed && ball.number > 0 && ball.number !== 8)
      .map((ball) => ball.number);
  }
  const remainingGroup = countRemainingGroupBalls(state, playerIndex);
  if (remainingGroup === 0) {
    return state.balls.filter((ball) => !ball.pocketed && ball.number === 8).map((ball) => ball.number);
  }
  return state.balls
    .filter((ball) => !ball.pocketed && ballMatchesGroup(ball, player.group))
    .map((ball) => ball.number);
}

function needsPocketCall(state, playerIndex) {
  if (state.modeKey === "ten-ball") {
    const legalNumbers = getLegalNumbers(state, playerIndex);
    return !state.breakShot && !state.safetyDeclared && legalNumbers.length > 0;
  }
  if (state.modeKey !== "eight-ball") return false;
  if (state.tableOpen) return false;
  const player = state.players[playerIndex];
  if (!player.group) return false;
  return countRemainingGroupBalls(state, playerIndex) === 0;
}

function supportsPushOut(modeKey) {
  return modeKey === "nine-ball" || modeKey === "ten-ball";
}

function supportsSafetyCall(modeKey) {
  return modeKey === "eight-ball" || modeKey === "ten-ball";
}

function setCueControlForTurn(state) {
  const cueBall = getCueBall(state);
  if (!cueBall) return;
  const legalNumbers = getLegalNumbers(state, state.currentPlayer);
  const targetBall = state.balls.find((ball) => !ball.pocketed && legalNumbers.includes(ball.number));
  state.cueControl.angle = targetBall
    ? Math.atan2(targetBall.y - cueBall.y, targetBall.x - cueBall.x)
    : 0;
  state.cueControl.power = state.breakShot ? 0.9 : clamp(state.cueControl.power || 0.58, 0.18, 1);
}
function isCuePlacementValid(state, x, y, restrictHeadString) {
  if (x < PLAY_LEFT + BALL_RADIUS + 2 || x > PLAY_RIGHT - BALL_RADIUS - 2) return false;
  if (y < PLAY_TOP + BALL_RADIUS + 2 || y > PLAY_BOTTOM - BALL_RADIUS - 2) return false;
  if (restrictHeadString && x > HEAD_STRING_X - BALL_RADIUS - 2) return false;
  const pocketCollision = POCKETS.some((pocket) => distance(x, y, pocket.x, pocket.y) < pocket.radius - 3);
  if (pocketCollision) return false;
  return state.balls.every((ball) => {
    if (ball.id === "cue" || ball.pocketed) return true;
    return distance(x, y, ball.x, ball.y) > BALL_DIAMETER + 1;
  });
}

function findNearestPlacement(state, preferredX, preferredY, restrictHeadString) {
  const xMin = PLAY_LEFT + BALL_RADIUS + 8;
  const xMax = restrictHeadString ? HEAD_STRING_X - BALL_RADIUS - 8 : PLAY_RIGHT - BALL_RADIUS - 8;
  const yMin = PLAY_TOP + BALL_RADIUS + 8;
  const yMax = PLAY_BOTTOM - BALL_RADIUS - 8;
  let best = null;
  for (let y = yMin; y <= yMax; y += BALL_DIAMETER * 1.05) {
    for (let x = xMin; x <= xMax; x += BALL_DIAMETER * 1.05) {
      if (!isCuePlacementValid(state, x, y, restrictHeadString)) continue;
      const score = distance(x, y, preferredX, preferredY);
      if (!best || score < best.score) {
        best = { x, y, score };
      }
    }
  }
  if (best) return best;
  return {
    x: clamp(preferredX, xMin, xMax),
    y: clamp(preferredY, yMin, yMax),
    score: 9999,
  };
}

function prepareCueBallForPlacement(state, restrictHeadString) {
  const cueBall = getCueBall(state);
  if (!cueBall) return;
  const preferredX = restrictHeadString ? HEAD_STRING_X - 100 : PLAY_LEFT + 120;
  const placement = findNearestPlacement(state, preferredX, TABLE_CENTER_Y, restrictHeadString);
  cueBall.pocketed = false;
  cueBall.vx = 0;
  cueBall.vy = 0;
  cueBall.x = placement.x;
  cueBall.y = placement.y;
}

function moveToTurnStart(state) {
  if (state.matchWinner != null || state.rackWinner != null) return;
  if (state.pendingDecision) {
    if (state.pendingDecision.chooserIndex === PLAYER_HUMAN) {
      state.currentPlayer = PLAYER_HUMAN;
      state.phase = "decision";
      return;
    }
    resolvePendingDecisionIfAi(state);
    return;
  }
  if (state.modeKey === "ten-ball") {
    state.calledPocketId = null;
  } else if (!needsPocketCall(state, state.currentPlayer)) {
    state.calledPocketId = null;
  }
  setCueControlForTurn(state);
  if (state.currentPlayer === PLAYER_HUMAN) {
    clearAiTelemetry(state);
    state.phase = state.ballInHand.active ? "placing" : "aim";
  } else {
    state.phase = "ai-thinking";
    state.aiTimerMs = scaleAiDuration(Math.round(DIFFICULTY_PRESETS[state.difficultyKey].thinkMs * 0.42));
    state.aiRoutine = null;
    state.aiPlanPreview = null;
    setAiTelemetry(state, AI_ACTION_LABELS.scan);
  }
}

function startRack(state, breakerIndex) {
  state.players.forEach((player) => {
    player.group = null;
    player.foulsInRow = 0;
    if (!isKellyMode(state.modeKey)) {
      player.kellyTarget = null;
    }
  });
  state.balls = buildRackBalls(state.modeKey);
  if (isKellyMode(state.modeKey)) {
    assignKellyTargets(state);
  }
  state.currentPlayer = breakerIndex;
  state.breakerIndex = breakerIndex;
  state.nextBreaker = nextPlayerIndex(state, breakerIndex);
  state.tableOpen = state.modeKey === "eight-ball";
  state.breakShot = !isCaromMode(state.modeKey);
  state.pushOutAvailable = false;
  state.ballInHand = { active: false, restrictHeadString: false };
  state.safetyDeclared = false;
  state.shot = null;
  state.pendingDecision = null;
  state.calledPocketId = null;
  state.rackWinner = null;
  state.matchWinner = null;
  state.shotCount = 0;
  if (isCaromMode(state.modeKey)) {
    addLog(state, state.locale === "es"
      ? `${state.players[breakerIndex].name} abre la serie de carambola.`
      : `${state.players[breakerIndex].name} opens the carom inning.`);
  } else if (isKellyMode(state.modeKey)) {
    const assignmentPreview = state.players
      .slice(0, 6)
      .map((player) => `${player.name}: ${player.kellyTarget ?? "-"}`)
      .join(" | ");
    const remainingAssignments = state.players.length - 6;
    const assignmentSuffix = remainingAssignments > 0
      ? (state.locale === "es" ? ` | +${remainingAssignments} mas` : ` | +${remainingAssignments} more`)
      : "";
    const assignments = `${assignmentPreview}${assignmentSuffix}`;
    addLog(state, state.locale === "es"
      ? `${state.players[breakerIndex].name} rompe en Kelly. Objetivos -> ${assignments}.`
      : `${state.players[breakerIndex].name} breaks in Kelly. Targets -> ${assignments}.`);
  } else {
    addLog(state, `${state.players[breakerIndex].name} rompe en ${modeLabel(state.modeKey, state.locale)}.`);
  }
  moveToTurnStart(state);
}

function findSpotPlacement(state) {
  const cue = getCueBall(state);
  const occupied = (x, y) => state.balls.some((ball) => {
    if (ball.pocketed) return false;
    if (cue && ball.id === cue.id) return false;
    return distance(x, y, ball.x, ball.y) < BALL_DIAMETER + 1;
  });
  const offsets = [0, BALL_DIAMETER, -BALL_DIAMETER, BALL_DIAMETER * 2, -BALL_DIAMETER * 2, BALL_DIAMETER * 3, -BALL_DIAMETER * 3];
  for (const offset of offsets) {
    const x = FOOT_SPOT_X;
    const y = TABLE_CENTER_Y + offset;
    if (!occupied(x, y)) return { x, y };
  }
  return { x: FOOT_SPOT_X, y: TABLE_CENTER_Y };
}

function respotBall(state, number) {
  const ball = state.balls.find((entry) => entry.number === number);
  if (!ball) return;
  const placement = findSpotPlacement(state);
  ball.pocketed = false;
  ball.x = placement.x;
  ball.y = placement.y;
  ball.vx = 0;
  ball.vy = 0;
  ball.lastPocketId = null;
}

function segmentClear(state, x1, y1, x2, y2, ignoreIds = new Set(), clearance = BALL_DIAMETER * 0.96) {
  return state.balls.every((ball) => {
    if (ball.pocketed || ignoreIds.has(ball.id)) return true;
    return distancePointToSegment(ball.x, ball.y, x1, y1, x2, y2) > clearance;
  });
}

function choosePocketPlans(state, playerIndex, cueX, cueY) {
  const legalNumbers = getLegalNumbers(state, playerIndex);
  const legalBalls = state.balls.filter((ball) => !ball.pocketed && legalNumbers.includes(ball.number));
  const plans = [];

  legalBalls.forEach((ball) => {
    POCKETS.forEach((pocket) => {
      const dx = pocket.x - ball.x;
      const dy = pocket.y - ball.y;
      const length = Math.hypot(dx, dy);
      if (length < 1) return;
      const nx = dx / length;
      const ny = dy / length;
      const contactX = ball.x - nx * BALL_DIAMETER;
      const contactY = ball.y - ny * BALL_DIAMETER;
      if (contactX < PLAY_LEFT || contactX > PLAY_RIGHT || contactY < PLAY_TOP || contactY > PLAY_BOTTOM) return;
      if (!segmentClear(state, ball.x, ball.y, pocket.x, pocket.y, new Set([ball.id, "cue"]), BALL_DIAMETER * 0.92)) return;
      if (!segmentClear(state, cueX, cueY, contactX, contactY, new Set([ball.id, "cue"]), BALL_DIAMETER * 0.92)) return;

      const cueDistance = distance(cueX, cueY, contactX, contactY);
      const objectDistance = distance(ball.x, ball.y, pocket.x, pocket.y);
      const aimAngle = Math.atan2(contactY - cueY, contactX - cueX);
      const centerAngle = Math.atan2(ball.y - cueY, ball.x - cueX);
      const cutPenalty = Math.abs(normalizeAngle(aimAngle - centerAngle));
      const isKeyBall = ball.number === 8 || ball.number === 9 || ball.number === 10;
      const score = cueDistance + objectDistance * 0.82 + cutPenalty * 180 + (isKeyBall ? -22 : 0);
      const basePower = clamp(0.34 + cueDistance / 560 + objectDistance / 920, 0.28, 0.88);

      plans.push({
        type: "pot",
        route: "direct",
        ballId: ball.id,
        ballNumber: ball.number,
        pocketId: pocket.id,
        angle: aimAngle,
        power: basePower,
        score,
        cueDistance,
        objectDistance,
        cutPenalty,
      });
    });
  });

  plans.sort((a, b) => a.score - b.score);
  return plans;
}

function chooseFallbackPlan(state, playerIndex, cueX, cueY) {
  const legalNumbers = getLegalNumbers(state, playerIndex);
  const legalBalls = state.balls
    .filter((ball) => !ball.pocketed && legalNumbers.includes(ball.number))
    .sort((a, b) => distance(cueX, cueY, a.x, a.y) - distance(cueX, cueY, b.x, b.y));
  const target = legalBalls[0];
  if (!target) return null;
  return {
    type: "contact",
    route: "direct",
    ballId: target.id,
    ballNumber: target.number,
    pocketId: null,
    angle: Math.atan2(target.y - cueY, target.x - cueX),
    power: state.breakShot ? 0.92 : 0.48,
    score: 9999,
    cueDistance: distance(cueX, cueY, target.x, target.y),
    objectDistance: 0,
    cutPenalty: 0,
  };
}

function computeBankBouncePoint(cueX, cueY, targetX, targetY, railId) {
  const cushionLeft = PLAY_LEFT + BALL_RADIUS;
  const cushionRight = PLAY_RIGHT - BALL_RADIUS;
  const cushionTop = PLAY_TOP + BALL_RADIUS;
  const cushionBottom = PLAY_BOTTOM - BALL_RADIUS;

  if (railId === "left" || railId === "right") {
    const railX = railId === "left" ? cushionLeft : cushionRight;
    const mirroredX = railX * 2 - targetX;
    const denominator = mirroredX - cueX;
    if (Math.abs(denominator) < 1e-4) return null;
    const t = (railX - cueX) / denominator;
    if (t <= 0.06 || t >= 0.94) return null;
    const y = cueY + (targetY - cueY) * t;
    if (y < cushionTop || y > cushionBottom) return null;
    return { x: railX, y };
  }

  const railY = railId === "top" ? cushionTop : cushionBottom;
  const mirroredY = railY * 2 - targetY;
  const denominator = mirroredY - cueY;
  if (Math.abs(denominator) < 1e-4) return null;
  const t = (railY - cueY) / denominator;
  if (t <= 0.06 || t >= 0.94) return null;
  const x = cueX + (targetX - cueX) * t;
  if (x < cushionLeft || x > cushionRight) return null;
  return { x, y: railY };
}

function chooseBankPlans(state, playerIndex, cueX, cueY, difficulty) {
  const legalNumbers = getLegalNumbers(state, playerIndex);
  const legalBalls = state.balls
    .filter((ball) => !ball.pocketed && legalNumbers.includes(ball.number))
    .sort((a, b) => distance(cueX, cueY, a.x, a.y) - distance(cueX, cueY, b.x, b.y))
    .slice(0, difficulty.allowBankShots ? 5 : 0);
  const rails = ["left", "right", "top", "bottom"];
  const plans = [];

  legalBalls.forEach((ball) => {
    rails.forEach((railId) => {
      const bounce = computeBankBouncePoint(cueX, cueY, ball.x, ball.y, railId);
      if (!bounce) return;
      const ignoreIds = new Set([ball.id, "cue"]);
      if (!segmentClear(state, cueX, cueY, bounce.x, bounce.y, ignoreIds, BALL_DIAMETER * 0.84)) return;
      if (!segmentClear(state, bounce.x, bounce.y, ball.x, ball.y, ignoreIds, BALL_DIAMETER * 0.9)) return;

      let pocketId = POCKETS[0].id;
      let nearestPocketDistance = Number.POSITIVE_INFINITY;
      POCKETS.forEach((pocket) => {
        const d = distance(ball.x, ball.y, pocket.x, pocket.y);
        if (d < nearestPocketDistance) {
          nearestPocketDistance = d;
          pocketId = pocket.id;
        }
      });
      const cueDistance = distance(cueX, cueY, bounce.x, bounce.y);
      const objectDistance = distance(bounce.x, bounce.y, ball.x, ball.y);
      const totalDistance = cueDistance + objectDistance;
      const aimAngle = Math.atan2(bounce.y - cueY, bounce.x - cueX);
      const centerAngle = Math.atan2(ball.y - cueY, ball.x - cueX);
      const cutPenalty = Math.abs(normalizeAngle(aimAngle - centerAngle));
      const score = totalDistance + cutPenalty * 240 + nearestPocketDistance * 0.1 + difficulty.bankShotWeight;
      const power = clamp(0.42 + totalDistance / 980 + cutPenalty * 0.2, 0.3, 0.95);

      plans.push({
        type: "kick",
        route: `bank-${railId}`,
        ballId: ball.id,
        ballNumber: ball.number,
        pocketId,
        angle: aimAngle,
        power,
        score,
        cueDistance,
        objectDistance,
        cutPenalty,
      });
    });
  });

  plans.sort((a, b) => a.score - b.score);
  return plans;
}

function evaluateAiPlanScore(state, playerIndex, plan, difficulty) {
  if (isKellyMode(state.modeKey) || isCaromMode(state.modeKey)) {
    return plan.score;
  }
  const opponentIndex = playerIndex === PLAYER_HUMAN ? PLAYER_AI : PLAYER_HUMAN;
  let score = plan.score;
  const ownFouls = state.players[playerIndex]?.foulsInRow ?? 0;
  const opponentFouls = state.players[opponentIndex]?.foulsInRow ?? 0;
  const isKeyBall = plan.ballNumber === 8 || plan.ballNumber === 9 || plan.ballNumber === 10;

  if (plan.type === "kick" && !difficulty.allowBankShots) {
    score += 180;
  }
  if (isKeyBall) {
    score -= difficulty.keyBallBonus;
  }
  score += ownFouls * 26;
  score -= opponentFouls * 11;
  score += (plan.cutPenalty ?? 0) * 90;
  if (state.modeKey === "eight-ball") {
    const ownRemaining = countRemainingGroupBalls(state, playerIndex);
    const opponentRemaining = countRemainingGroupBalls(state, opponentIndex);
    if (ownRemaining > 0 && opponentRemaining > 0) {
      score += (ownRemaining - opponentRemaining) * 5;
    }
  }
  return score;
}

function tuneAiPower(state, plan, difficulty) {
  const cueDistance = plan.cueDistance ?? 280;
  const objectDistance = plan.objectDistance ?? 0;
  const travelDistance = cueDistance + objectDistance * 0.72;
  const distanceFactor = clamp((travelDistance - 250) / 760, 0, 1);
  const routeBoost = plan.type === "kick" ? 0.09 : 0;
  const cutBoost = clamp((plan.cutPenalty ?? 0) / 1.2, 0, 1) * 0.07;
  const breakBoost = state.breakShot ? 0.14 : 0;
  const dynamicBias = (distanceFactor - 0.45) * difficulty.powerDistanceWeight;
  return clamp(plan.power + dynamicBias + routeBoost + cutBoost + breakBoost, 0.2, 1);
}

function shouldAiDeclareSafety(state, plan, difficulty, forcePushOut) {
  if (forcePushOut) return false;
  if (!supportsSafetyCall(state.modeKey) || state.breakShot) return false;
  const riskyShot = plan.type !== "pot"
    || plan.score >= difficulty.safetyRiskThreshold
    || (plan.cutPenalty ?? 0) > 0.7;
  if (!riskyShot) return false;
  const chance = plan.type === "pot" ? difficulty.safetyChanceOnRisk : difficulty.safetyChanceOnContact;
  return Math.random() < chance;
}

function chooseAiPlan(state, playerIndex, cueX, cueY, options = {}) {
  const difficulty = DIFFICULTY_PRESETS[state.difficultyKey];
  const deterministic = Boolean(options.deterministic);
  if (isCaromMode(state.modeKey)) {
    const objectBalls = state.balls
      .filter((ball) => !ball.pocketed && ball.number > 0)
      .sort((a, b) => distance(cueX, cueY, a.x, a.y) - distance(cueX, cueY, b.x, b.y));
    const firstObject = objectBalls[0];
    if (!firstObject) return null;
    const baseAngle = Math.atan2(firstObject.y - cueY, firstObject.x - cueX);
    return {
      type: "contact",
      route: "direct",
      ballId: firstObject.id,
      ballNumber: firstObject.number,
      pocketId: null,
      angle: baseAngle + (deterministic ? 0 : (Math.random() * 2 - 1) * difficulty.aimNoise * 0.35),
      power: clamp(0.66 + (deterministic ? 0 : (Math.random() * 2 - 1) * difficulty.powerNoise * 0.4), 0.4, 0.95),
      score: distance(cueX, cueY, firstObject.x, firstObject.y),
      cueDistance: distance(cueX, cueY, firstObject.x, firstObject.y),
      objectDistance: 0,
      cutPenalty: 0,
      tacticalScore: distance(cueX, cueY, firstObject.x, firstObject.y),
    };
  }
  const directPlans = choosePocketPlans(state, playerIndex, cueX, cueY);
  const bankPlans = difficulty.allowBankShots
    ? chooseBankPlans(state, playerIndex, cueX, cueY, difficulty).slice(0, 8)
    : [];
  const ranked = [...directPlans.slice(0, 12), ...bankPlans]
    .map((plan) => ({
      ...plan,
      tacticalScore: evaluateAiPlanScore(state, playerIndex, plan, difficulty),
    }))
    .sort((a, b) => a.tacticalScore - b.tacticalScore);
  const fallback = chooseFallbackPlan(state, playerIndex, cueX, cueY);
  const spread = deterministic ? 1 : difficulty.pickSpread;
  const selectedPlan = ranked[Math.min(Math.floor(Math.random() * spread), Math.max(ranked.length - 1, 0))] ?? fallback;
  if (!selectedPlan) return null;
  const tunedPower = tuneAiPower(state, selectedPlan, difficulty);
  return {
    ...selectedPlan,
    angle: selectedPlan.angle + (deterministic ? 0 : (Math.random() * 2 - 1) * difficulty.aimNoise),
    power: clamp(tunedPower + (deterministic ? 0 : (Math.random() * 2 - 1) * difficulty.powerNoise), 0.2, 1),
  };
}

function chooseAiPlacement(state, playerIndex, restrictHeadString) {
  const difficulty = DIFFICULTY_PRESETS[state.difficultyKey];
  const xStart = PLAY_LEFT + 90;
  const xEnd = restrictHeadString ? HEAD_STRING_X - 20 : PLAY_RIGHT - 120;
  const yStart = PLAY_TOP + 70;
  const yEnd = PLAY_BOTTOM - 70;
  const stepX = difficulty.placeStepX;
  const stepY = difficulty.placeStepY;
  let best = null;

  for (let y = yStart; y <= yEnd; y += stepY) {
    for (let x = xStart; x <= xEnd; x += stepX) {
      if (!isCuePlacementValid(state, x, y, restrictHeadString)) continue;
      const plan = chooseAiPlan(state, playerIndex, x, y, { deterministic: true });
      if (!plan) continue;
      const score = plan.tacticalScore + distance(x, y, HEAD_STRING_X - 80, TABLE_CENTER_Y) * difficulty.placementBias;
      if (!best || score < best.score) {
        best = { x, y, score };
      }
    }
  }

  if (best) return best;
  return findNearestPlacement(state, restrictHeadString ? HEAD_STRING_X - 90 : PLAY_LEFT + 120, TABLE_CENTER_Y, restrictHeadString);
}

function assignGroup(state, playerIndex, group) {
  if (!group) return;
  state.players[playerIndex].group = group;
  state.players[1 - playerIndex].group = group === "solids" ? "stripes" : "solids";
  state.tableOpen = false;
  addLog(state, `${state.players[playerIndex].name} toma ${groupLabel(group, state.locale)}.`);
}

function setTurnFoulCount(state, playerIndex, foul) {
  if (state.modeKey !== "nine-ball" && state.modeKey !== "ten-ball") return;
  state.players[playerIndex].foulsInRow = foul ? state.players[playerIndex].foulsInRow + 1 : 0;
}

function createShotContext(state, playerIndex, options = {}) {
  const legalNumbers = getLegalNumbers(state, playerIndex);
  const requiredFirstNumber = legalNumbers[0] ?? null;
  return {
    playerIndex,
    breakShot: state.breakShot,
    startTableOpen: state.tableOpen,
    requiredFirstNumber,
    calledBallNumber: isKellyMode(state.modeKey) ? (state.players[playerIndex]?.kellyTarget ?? requiredFirstNumber) : requiredFirstNumber,
    shooterGroup: state.players[playerIndex].group,
    canShootBlack: needsPocketCall(state, playerIndex),
    calledPocketId: options.calledPocketId ?? state.calledPocketId,
    isPushOut: Boolean(options.isPushOut),
    safetyDeclared: Boolean(options.safetyDeclared),
    firstHitBallId: null,
    railAfterContact: false,
    breakRailContacts: new Set(),
    pocketedIds: [],
    outOfTableIds: [],
    cuePocketed: false,
    cueObjectHitOrder: [],
  };
}

function startShot(state, angle, power, options = {}) {
  const cueBall = getCueBall(state);
  if (!cueBall || cueBall.pocketed) return false;
  if (!(state.phase === "aim" || state.phase === "placing")) return false;
  if (state.currentPlayer !== PLAYER_HUMAN) return false;
  if (state.phase === "placing") {
    state.phase = "aim";
  }
  const forcePushOut = Boolean(options.forcePushOut);
  if (forcePushOut && !(state.pushOutAvailable && supportsPushOut(state.modeKey))) {
    addLog(state, "Push out no disponible en esta entrada.");
    return false;
  }
  if (!forcePushOut && needsPocketCall(state, state.currentPlayer) && !state.calledPocketId) {
    const ballName = state.modeKey === "ten-ball" ? "la bola legal" : "la 8";
    addLog(state, `Elige una tronera para cantar ${ballName} antes de tirar.`);
    return false;
  }
  const useSafety = !forcePushOut && state.safetyDeclared && supportsSafetyCall(state.modeKey) && !state.breakShot;

  const speed = lerp(300, state.breakShot ? 1700 : 1460, clamp(power, 0.18, 1));
  cueBall.vx = Math.cos(angle) * speed;
  cueBall.vy = Math.sin(angle) * speed;
  state.phase = "moving";
  state.shotCount += 1;
  state.shot = createShotContext(state, state.currentPlayer, {
    calledPocketId: forcePushOut ? null : state.calledPocketId,
    isPushOut: forcePushOut,
    safetyDeclared: useSafety,
  });
  state.pushOutAvailable = false;
  state.pendingDecision = null;
  state.safetyDeclared = false;
  if (forcePushOut) {
    addLog(state, `${state.players[state.currentPlayer].name} declara push out.`);
  } else if (useSafety) {
    addLog(state, `${state.players[state.currentPlayer].name} juega un safety.`);
  } else {
    addLog(state, `${state.players[state.currentPlayer].name} ejecuta el tiro.`);
  }
  return true;
}
function switchTurn(state, options = {}) {
  const { ballInHand = false, restrictHeadString = false, reason = null, pushOutAvailable = false } = options;
  state.breakShot = false;
  state.currentPlayer = nextPlayerIndex(state, state.currentPlayer);
  state.pendingDecision = null;
  state.safetyDeclared = false;
  state.pushOutAvailable = pushOutAvailable;
  state.ballInHand = { active: ballInHand, restrictHeadString };
  if (ballInHand) {
    prepareCueBallForPlacement(state, restrictHeadString);
  }
  if (reason) addLog(state, reason);
  moveToTurnStart(state);
}

function continueTurn(state, options = {}) {
  const { reason = null, pushOutAvailable = false } = options;
  state.breakShot = false;
  state.pendingDecision = null;
  state.safetyDeclared = false;
  state.pushOutAvailable = pushOutAvailable;
  state.ballInHand = { active: false, restrictHeadString: false };
  if (reason) addLog(state, reason);
  moveToTurnStart(state);
}

function finishRack(state, winnerIndex, reason) {
  state.players[winnerIndex].racksWon += 1;
  state.rackWinner = winnerIndex;
  clearAiTelemetry(state);
  state.pendingDecision = null;
  state.pushOutAvailable = false;
  state.safetyDeclared = false;
  state.ballInHand = { active: false, restrictHeadString: false };
  state.calledPocketId = null;
  addLog(state, reason);
  if (state.players[winnerIndex].racksWon >= state.raceTo) {
    state.matchWinner = winnerIndex;
    state.phase = "match-over";
  } else {
    state.phase = "rack-over";
  }
}

function queueTakeOrPassDecision(state, {
  type,
  chooserIndex,
  returnToIndex,
  prompt,
  takeReason,
  passReason,
}) {
  const locale = state.locale ?? "es";
  state.pendingDecision = {
    type,
    chooserIndex,
    returnToIndex,
    prompt,
    options: [
      { id: "take", label: locale === "es" ? "Jugar mesa" : "Play table" },
      { id: "pass-back", label: locale === "es" ? "Devolver tiro" : "Pass shot back" },
    ],
    takeReason,
    passReason,
  };
  state.breakShot = false;
  state.pushOutAvailable = false;
  state.safetyDeclared = false;
  state.calledPocketId = null;
  addLog(state, prompt);
}

function pickAiDecision(state, chooserIndex) {
  const cueBall = getCueBall(state);
  if (!cueBall) return "take";
  const plans = choosePocketPlans(state, chooserIndex, cueBall.x, cueBall.y);
  const bestScore = plans[0]?.score ?? Infinity;
  return bestScore < 830 ? "take" : "pass-back";
}

function resolvePendingDecision(state, optionId) {
  const decision = state.pendingDecision;
  if (!decision) return;
  const pick = optionId ?? "take";
  const take = pick !== "pass-back";
  state.pendingDecision = null;
  state.breakShot = false;
  state.pushOutAvailable = false;
  state.safetyDeclared = false;
  state.ballInHand = { active: false, restrictHeadString: false };

  if (take) {
    state.currentPlayer = decision.chooserIndex;
    if (decision.takeReason) addLog(state, decision.takeReason);
  } else {
    state.currentPlayer = decision.returnToIndex;
    if (decision.passReason) addLog(state, decision.passReason);
  }
  moveToTurnStart(state);
}

function resolvePendingDecisionIfAi(state) {
  if (!state.pendingDecision) return false;
  if (state.pendingDecision.chooserIndex === PLAYER_HUMAN) {
    state.currentPlayer = PLAYER_HUMAN;
    state.phase = "decision";
    return true;
  }
  const option = pickAiDecision(state, state.pendingDecision.chooserIndex);
  resolvePendingDecision(state, option);
  return true;
}

function evaluateCaromShot(state, shot, shooterIndex) {
  const shooter = state.players[shooterIndex];
  const cueHits = new Set(shot.cueObjectHitOrder ?? []);
  const foul = shot.cuePocketed || shot.outOfTableIds.length > 0;
  if (foul) {
    switchTurn(state, {
      reason: state.locale === "es"
        ? "Falta en carambola: turno cedido."
        : "Carom foul: turn lost.",
    });
    return;
  }
  if (cueHits.size >= 2) {
    shooter.racksWon += 1;
    if (shooter.racksWon >= state.raceTo) {
      state.matchWinner = shooterIndex;
      state.phase = "match-over";
      addLog(state, state.locale === "es"
        ? `${shooter.name} gana la serie de carambola (${shooter.racksWon}/${state.raceTo}).`
        : `${shooter.name} wins the carom set (${shooter.racksWon}/${state.raceTo}).`);
      clearAiTelemetry(state);
      return;
    }
    continueTurn(state, {
      reason: state.locale === "es"
        ? `Carambola valida de ${shooter.name}. Punto ${shooter.racksWon}/${state.raceTo}.`
        : `Valid carom by ${shooter.name}. Point ${shooter.racksWon}/${state.raceTo}.`,
    });
    return;
  }
  switchTurn(state, {
    reason: state.locale === "es"
      ? `${shooter.name} no completa carambola. Cambia el turno.`
      : `${shooter.name} does not complete a carom. Turn changes.`,
  });
}

function kellyTargetOwner(state, number) {
  return state.players.findIndex((player) => player.kellyTarget === number);
}

function evaluateKellyShot(state, shot, shooterIndex) {
  const shooter = state.players[shooterIndex];
  const firstHitBall = shot.firstHitBallId ? getBallById(state, shot.firstHitBallId) : null;
  const pocketedBalls = shot.pocketedIds.map((ballId) => getBallById(state, ballId)).filter(Boolean);
  const ownTarget = shooter.kellyTarget ?? null;
  const illegalFirstContact = Boolean(ownTarget != null && firstHitBall && firstHitBall.number !== ownTarget);
  const foul = ownTarget == null || shot.cuePocketed || !firstHitBall || illegalFirstContact || shot.outOfTableIds.length > 0;
  const ownTargetPocketed = ownTarget != null && pocketedBalls.some((ball) => ball.number === ownTarget);

  pocketedBalls.forEach((ball) => {
    if (ball.number <= 0) return;
    const ownerIndex = kellyTargetOwner(state, ball.number);
    if (ownerIndex === -1 || ownerIndex === shooterIndex) return;
    respotBall(state, ball.number);
  });

  if (ownTargetPocketed && !foul) {
    finishRack(state, shooterIndex, state.locale === "es"
      ? `${shooter.name} emboca su bola objetivo (${ownTarget}) y gana Kelly.`
      : `${shooter.name} pockets their target ball (${ownTarget}) and wins Kelly.`);
    return;
  }

  if (foul) {
    if (ownTargetPocketed) {
      respotBall(state, ownTarget);
    }
    const foulReason = state.locale === "es"
      ? (ownTarget == null
        ? `${shooter.name} no tiene bola objetivo asignada.`
        : !firstHitBall
          ? `${shooter.name} falla contacto legal en Kelly.`
          : illegalFirstContact
            ? `${shooter.name} golpea primero una bola incorrecta en Kelly.`
            : `Falta de ${shooter.name} en Kelly.`)
      : (ownTarget == null
        ? `${shooter.name} has no assigned target ball.`
        : !firstHitBall
          ? `${shooter.name} misses legal contact in Kelly.`
          : illegalFirstContact
            ? `${shooter.name} hits the wrong first ball in Kelly.`
            : `${shooter.name} commits a Kelly foul.`);
    switchTurn(state, {
      ballInHand: true,
      reason: foulReason,
    });
    return;
  }

  switchTurn(state, {
    reason: state.locale === "es"
      ? `${shooter.name} no emboca su objetivo.`
      : `${shooter.name} does not pocket their target.`,
  });
}

function evaluateShot(state) {
  const shot = state.shot;
  if (!shot) return;
  state.shot = null;

  const shooterIndex = shot.playerIndex;
  const opponentIndex = shooterIndex === PLAYER_HUMAN ? PLAYER_AI : PLAYER_HUMAN;
  const shooter = state.players[shooterIndex];
  const opponent = state.players[opponentIndex];
  const firstHitBall = shot.firstHitBallId ? getBallById(state, shot.firstHitBallId) : null;
  const pocketedBalls = shot.pocketedIds.map((ballId) => getBallById(state, ballId)).filter(Boolean);
  const objectPocketed = pocketedBalls.filter((ball) => ball.number > 0);
  const pocketedEight = pocketedBalls.find((ball) => ball.number === 8) ?? null;
  const pocketedNine = pocketedBalls.find((ball) => ball.number === 9) ?? null;
  const pocketedTen = pocketedBalls.find((ball) => ball.number === 10) ?? null;
  const objectOutOfTable = shot.outOfTableIds
    .map((ballId) => getBallById(state, ballId))
    .filter((ball) => ball && ball.number > 0);
  const remainingObjectBalls = state.balls.filter((ball) => !ball.pocketed && ball.number > 0);
  let foulReason = null;

  if (isCaromMode(state.modeKey)) {
    evaluateCaromShot(state, shot, shooterIndex);
    return;
  }

  if (isKellyMode(state.modeKey)) {
    evaluateKellyShot(state, shot, shooterIndex);
    return;
  }

  if (shot.cuePocketed) {
    foulReason = "Scratch: la blanca cae en tronera.";
  }
  if (objectOutOfTable.length > 0) {
    foulReason = foulReason ?? "Falta: bola objetiva fuera de la mesa.";
  }
  if (!shot.isPushOut) {
    if (!firstHitBall) {
      foulReason = foulReason ?? "Falta: no hubo contacto con una bola objetiva.";
    }
    if (state.modeKey === "nine-ball" || state.modeKey === "ten-ball") {
      const requiredFirst = shot.requiredFirstNumber ?? (state.modeKey === "nine-ball" ? 9 : 10);
      if (firstHitBall && firstHitBall.number !== requiredFirst) {
        foulReason = foulReason ?? `Falta: primero debias tocar la ${requiredFirst}.`;
      }
    } else if (firstHitBall) {
      if (shot.canShootBlack) {
        if (firstHitBall.number !== 8) {
          foulReason = foulReason ?? "Falta: con mesa resuelta debes tocar primero la 8.";
        }
      } else if (shot.startTableOpen) {
        if (firstHitBall.number === 8) {
          foulReason = foulReason ?? "Falta: con mesa abierta no puedes tocar primero la 8.";
        }
      } else if (shooter.group && !ballMatchesGroup(firstHitBall, shooter.group)) {
        foulReason = foulReason ?? `Falta: debias tocar primero una ${groupLabel(shooter.group, state.locale)}.`;
      }
    }

    if (objectPocketed.length === 0 && !shot.railAfterContact) {
      foulReason = foulReason ?? "Falta: ninguna bola toco banda tras el contacto.";
    }
  }

  if (shot.breakShot && objectPocketed.length === 0 && shot.breakRailContacts.size < 4) {
    foulReason = foulReason ?? "Saque ilegal: menos de cuatro bolas objetivas tocaron banda.";
  }

  if (state.modeKey === "eight-ball") {
    if (pocketedEight) {
      if (shot.breakShot) {
        respotBall(state, 8);
        addLog(state, "La 8 se recoloca tras el saque.");
      } else {
        const correctPocket = shot.calledPocketId && pocketedEight.lastPocketId === shot.calledPocketId;
        if (!shot.canShootBlack || foulReason || !correctPocket) {
          finishRack(state, opponentIndex, `${state.players[opponentIndex].name} gana: 8 ilegal o en tronera incorrecta.`);
          return;
        }
        finishRack(state, shooterIndex, `${shooter.name} cierra la 8 en ${pocketLabel(shot.calledPocketId, state.locale) ?? "tronera cantada"}.`);
        return;
      }
    }

    if (!foulReason && shot.startTableOpen && !shot.breakShot) {
      const firstScoringBall = objectPocketed.find((ball) => ball.number !== 8);
      if (firstScoringBall && !shooter.group) {
        assignGroup(state, shooterIndex, ballGroupFromNumber(firstScoringBall.number));
      }
    }

    if (foulReason) {
      switchTurn(state, { ballInHand: true, restrictHeadString: false, reason: foulReason });
      return;
    }

    setTurnFoulCount(state, shooterIndex, false);
    if (shot.safetyDeclared) {
      switchTurn(state, { reason: `${opponent.name} entra tras safety declarado.` });
      return;
    }
    const activeGroup = state.players[shooterIndex].group;
    const ownPocketed = activeGroup
      ? objectPocketed.filter((ball) => ballMatchesGroup(ball, activeGroup)).length
      : 0;

    if (ownPocketed > 0) {
      continueTurn(state, { reason: `${shooter.name} sigue en mesa con ${ownPocketed} bola(s) de su grupo.` });
      return;
    }

    switchTurn(state, { reason: `${opponent.name} entra a mesa.` });
    return;
  }

  if (state.modeKey === "nine-ball") {
    if (pocketedNine && foulReason) {
      respotBall(state, 9);
    }

    if (foulReason) {
      setTurnFoulCount(state, shooterIndex, true);
      if (state.players[shooterIndex].foulsInRow >= 3) {
        finishRack(state, opponentIndex, `${opponent.name} gana por tres faltas consecutivas.`);
        return;
      }
      const warning = state.players[shooterIndex].foulsInRow === 2
        ? ` ${shooter.name} queda avisado con dos faltas seguidas.`
        : "";
      switchTurn(state, { ballInHand: true, reason: `${foulReason}${warning}` });
      return;
    }

    setTurnFoulCount(state, shooterIndex, false);
    if (pocketedNine) {
      finishRack(state, shooterIndex, `${shooter.name} emboca la 9 y gana el rack.`);
      return;
    }
    if (shot.isPushOut) {
      queueTakeOrPassDecision(state, {
        type: "push-out-choice",
        chooserIndex: opponentIndex,
        returnToIndex: shooterIndex,
        prompt: `${opponent.name} decide tras push out.`,
        takeReason: `${opponent.name} acepta la mesa tras push out.`,
        passReason: `${opponent.name} devuelve el tiro a ${shooter.name}.`,
      });
      resolvePendingDecisionIfAi(state);
      return;
    }
    if (shot.breakShot) {
      if (objectPocketed.length > 0) {
        continueTurn(state, { reason: `${shooter.name} mantiene la entrada. Push out disponible.`, pushOutAvailable: true });
      } else {
        switchTurn(state, { reason: `${opponent.name} entra con opcion de push out.`, pushOutAvailable: true });
      }
      return;
    }
    if (objectPocketed.length > 0) {
      continueTurn(state, { reason: `${shooter.name} mantiene la entrada.` });
      return;
    }
    switchTurn(state, { reason: `${opponent.name} toma el turno.` });
    return;
  }

  if (pocketedTen && foulReason) {
    respotBall(state, 10);
  }

  if (foulReason) {
    setTurnFoulCount(state, shooterIndex, true);
    if (state.players[shooterIndex].foulsInRow >= 3) {
      finishRack(state, opponentIndex, `${opponent.name} gana por tres faltas consecutivas.`);
      return;
    }
    const warning = state.players[shooterIndex].foulsInRow === 2
      ? ` ${shooter.name} queda avisado con dos faltas seguidas.`
      : "";
    switchTurn(state, { ballInHand: true, reason: `${foulReason}${warning}` });
    return;
  }

  setTurnFoulCount(state, shooterIndex, false);
  if (shot.isPushOut) {
    queueTakeOrPassDecision(state, {
      type: "push-out-choice",
      chooserIndex: opponentIndex,
      returnToIndex: shooterIndex,
      prompt: `${opponent.name} decide tras push out.`,
      takeReason: `${opponent.name} acepta la mesa tras push out.`,
      passReason: `${opponent.name} devuelve el tiro a ${shooter.name}.`,
    });
    resolvePendingDecisionIfAi(state);
    return;
  }

  if (shot.breakShot) {
    if (pocketedTen) {
      respotBall(state, 10);
    }
    if (objectPocketed.length > 0 || pocketedTen) {
      continueTurn(state, { reason: `${shooter.name} mantiene la entrada. Push out disponible.`, pushOutAvailable: true });
    } else {
      switchTurn(state, { reason: `${opponent.name} entra con opcion de push out.`, pushOutAvailable: true });
    }
    return;
  }

  const calledPocketId = shot.calledPocketId;
  const calledBallNumber = shot.calledBallNumber;
  const calledBallPocketed = objectPocketed.find((ball) => (
    ball.number === calledBallNumber && calledPocketId && ball.lastPocketId === calledPocketId
  ));
  const legalObjectPocketed = objectPocketed.some((ball) => ball.number === calledBallNumber);

  if (shot.safetyDeclared) {
    if (pocketedTen) respotBall(state, 10);
    if (legalObjectPocketed) {
      queueTakeOrPassDecision(state, {
        type: "ten-ball-return-choice",
        chooserIndex: opponentIndex,
        returnToIndex: shooterIndex,
        prompt: `${opponent.name} decide tras safety con bola legal embocada.`,
        takeReason: `${opponent.name} acepta la mesa tras safety.`,
        passReason: `${opponent.name} devuelve el tiro a ${shooter.name}.`,
      });
      resolvePendingDecisionIfAi(state);
      return;
    }
    switchTurn(state, { reason: `${opponent.name} entra tras safety.` });
    return;
  }

  if (!calledBallPocketed) {
    if (pocketedTen) respotBall(state, 10);
    queueTakeOrPassDecision(state, {
      type: "ten-ball-return-choice",
      chooserIndex: opponentIndex,
      returnToIndex: shooterIndex,
      prompt: `${opponent.name} decide tras tiro cantado no valido.`,
      takeReason: `${opponent.name} acepta la mesa tras tiro no cantado.`,
      passReason: `${opponent.name} devuelve el tiro a ${shooter.name}.`,
    });
    resolvePendingDecisionIfAi(state);
    return;
  }

  if (calledBallPocketed.number === 10) {
    if (remainingObjectBalls.length === 0) {
      finishRack(state, shooterIndex, `${shooter.name} emboca la 10 legalmente y gana el rack.`);
      return;
    }
    respotBall(state, 10);
    continueTurn(state, { reason: `${shooter.name} emboca la 10 antes de tiempo: se repone y sigue.` });
    return;
  }

  if (pocketedTen) respotBall(state, 10);
  continueTurn(state, { reason: `${shooter.name} mantiene la entrada con tiro cantado valido.` });
}

function markRailContact(state, ball) {
  if (!state.shot) return;
  if (state.shot.firstHitBallId) {
    state.shot.railAfterContact = true;
  }
  if (state.shot.breakShot && ball.number > 0) {
    state.shot.breakRailContacts.add(ball.id);
  }
}

function pocketBall(state, ball, pocketId) {
  if (ball.pocketed) return;
  ball.pocketed = true;
  ball.vx = 0;
  ball.vy = 0;
  ball.lastPocketId = pocketId;
  if (state.shot) {
    state.shot.pocketedIds.push(ball.id);
    if (ball.id === "cue") {
      state.shot.cuePocketed = true;
    } else {
      state.shot.railAfterContact = true;
    }
  }
}

function knockBallOffTable(state, ball) {
  if (ball.pocketed) return;
  ball.pocketed = true;
  ball.vx = 0;
  ball.vy = 0;
  ball.lastPocketId = "out";
  if (state.shot) {
    state.shot.pocketedIds.push(ball.id);
    state.shot.outOfTableIds.push(ball.id);
    if (ball.id === "cue") {
      state.shot.cuePocketed = true;
    } else {
      state.shot.railAfterContact = true;
    }
  }
}

function rayCircleIntersection(originX, originY, dirX, dirY, centerX, centerY, radius) {
  const ox = originX - centerX;
  const oy = originY - centerY;
  const b = 2 * (ox * dirX + oy * dirY);
  const c = ox * ox + oy * oy - radius * radius;
  const discriminant = b * b - 4 * c;
  if (discriminant < 0) return null;
  const root = Math.sqrt(discriminant);
  const t1 = (-b - root) / 2;
  const t2 = (-b + root) / 2;
  if (t1 > 0) return t1;
  if (t2 > 0) return t2;
  return null;
}

function getAimPreview(state) {
  const cueBall = getCueBall(state);
  if (!cueBall || cueBall.pocketed) return null;
  const dirX = Math.cos(state.cueControl.angle);
  const dirY = Math.sin(state.cueControl.angle);
  let hit = null;

  state.balls.forEach((ball) => {
    if (ball.id === "cue" || ball.pocketed) return;
    const t = rayCircleIntersection(cueBall.x, cueBall.y, dirX, dirY, ball.x, ball.y, BALL_DIAMETER * 0.96);
    if (t != null && (!hit || t < hit.t)) {
      hit = { t, ball };
    }
  });

  const tBounds = [];
  if (dirX > 0) tBounds.push((PLAY_RIGHT - cueBall.x) / dirX);
  if (dirX < 0) tBounds.push((PLAY_LEFT - cueBall.x) / dirX);
  if (dirY > 0) tBounds.push((PLAY_BOTTOM - cueBall.y) / dirY);
  if (dirY < 0) tBounds.push((PLAY_TOP - cueBall.y) / dirY);
  const wallT = tBounds.filter((value) => value > 0).sort((a, b) => a - b)[0] ?? 160;
  const distanceToUse = hit ? Math.min(hit.t, wallT) : wallT;
  return {
    x1: cueBall.x,
    y1: cueBall.y,
    x2: cueBall.x + dirX * distanceToUse,
    y2: cueBall.y + dirY * distanceToUse,
    hitBall: hit?.ball ?? null,
  };
}

function updatePhysics(state, dt) {
  const hasPockets = modeHasPockets(state.modeKey);
  const activeBalls = getActiveBalls(state);
  activeBalls.forEach((ball) => {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
  });

  for (const ball of activeBalls) {
    const outMargin = BALL_DIAMETER * 1.8;
    if (
      ball.x < PLAY_LEFT - outMargin ||
      ball.x > PLAY_RIGHT + outMargin ||
      ball.y < PLAY_TOP - outMargin ||
      ball.y > PLAY_BOTTOM + outMargin
    ) {
      knockBallOffTable(state, ball);
      continue;
    }
    if (hasPockets) {
      const pocket = POCKETS.find((entry) => distance(ball.x, ball.y, entry.x, entry.y) < entry.radius - (ball.id === "cue" ? 3 : 1));
      if (pocket) {
        pocketBall(state, ball, pocket.id);
        continue;
      }
    }

    const nearCornerY = Math.abs(ball.y - PLAY_TOP) < 48 || Math.abs(ball.y - PLAY_BOTTOM) < 48;
    const canBounceVerticalRail = !hasPockets || !nearCornerY;
    if (ball.x - BALL_RADIUS <= PLAY_LEFT && canBounceVerticalRail) {
      ball.x = PLAY_LEFT + BALL_RADIUS;
      ball.vx = Math.abs(ball.vx) * RESTITUTION;
      markRailContact(state, ball);
    }
    if (ball.x + BALL_RADIUS >= PLAY_RIGHT && canBounceVerticalRail) {
      ball.x = PLAY_RIGHT - BALL_RADIUS;
      ball.vx = -Math.abs(ball.vx) * RESTITUTION;
      markRailContact(state, ball);
    }

    const nearCornerX = Math.abs(ball.x - PLAY_LEFT) < 52 || Math.abs(ball.x - PLAY_RIGHT) < 52;
    const nearSideX = Math.abs(ball.x - TABLE_CENTER_X) < 42;
    const canBounceHorizontalRail = !hasPockets || !(nearCornerX || nearSideX);
    if (ball.y - BALL_RADIUS <= PLAY_TOP && canBounceHorizontalRail) {
      ball.y = PLAY_TOP + BALL_RADIUS;
      ball.vy = Math.abs(ball.vy) * RESTITUTION;
      markRailContact(state, ball);
    }
    if (ball.y + BALL_RADIUS >= PLAY_BOTTOM && canBounceHorizontalRail) {
      ball.y = PLAY_BOTTOM - BALL_RADIUS;
      ball.vy = -Math.abs(ball.vy) * RESTITUTION;
      markRailContact(state, ball);
    }
  }

  for (let i = 0; i < activeBalls.length; i += 1) {
    const ballA = activeBalls[i];
    if (ballA.pocketed) continue;
    for (let j = i + 1; j < activeBalls.length; j += 1) {
      const ballB = activeBalls[j];
      if (ballB.pocketed) continue;
      const dx = ballB.x - ballA.x;
      const dy = ballB.y - ballA.y;
      const distanceBetween = Math.hypot(dx, dy);
      if (distanceBetween <= 0 || distanceBetween >= BALL_DIAMETER) continue;

      const nx = dx / distanceBetween;
      const ny = dy / distanceBetween;
      const overlap = BALL_DIAMETER - distanceBetween;
      ballA.x -= nx * overlap * 0.5;
      ballA.y -= ny * overlap * 0.5;
      ballB.x += nx * overlap * 0.5;
      ballB.y += ny * overlap * 0.5;

      const relativeVelocity = (ballB.vx - ballA.vx) * nx + (ballB.vy - ballA.vy) * ny;
      if (relativeVelocity < 0) {
        const impulse = -(1 + RESTITUTION) * relativeVelocity * 0.5;
        ballA.vx -= impulse * nx;
        ballA.vy -= impulse * ny;
        ballB.vx += impulse * nx;
        ballB.vy += impulse * ny;
      }

      if (state.shot && !state.shot.firstHitBallId) {
        if (ballA.id === "cue" && ballB.number > 0) {
          state.shot.firstHitBallId = ballB.id;
        }
        if (ballB.id === "cue" && ballA.number > 0) {
          state.shot.firstHitBallId = ballA.id;
        }
      }
      if (state.shot) {
        if (ballA.id === "cue" && ballB.number > 0 && !state.shot.cueObjectHitOrder.includes(ballB.id)) {
          state.shot.cueObjectHitOrder.push(ballB.id);
        }
        if (ballB.id === "cue" && ballA.number > 0 && !state.shot.cueObjectHitOrder.includes(ballA.id)) {
          state.shot.cueObjectHitOrder.push(ballA.id);
        }
      }
    }
  }

  state.balls.forEach((ball) => {
    if (ball.pocketed) return;
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed <= STOP_SPEED) {
      ball.vx = 0;
      ball.vy = 0;
      return;
    }
    const nextSpeed = Math.max(0, speed - ROLL_DECEL * dt);
    const ratio = nextSpeed / speed;
    ball.vx *= ratio;
    ball.vy *= ratio;
  });

  const allStopped = state.balls.every((ball) => ball.pocketed || Math.hypot(ball.vx, ball.vy) <= STOP_SPEED);
  if (allStopped) {
    state.balls.forEach((ball) => {
      ball.vx = 0;
      ball.vy = 0;
    });
    evaluateShot(state);
  }
}

function createAiPlanPreview(plan, forcePushOut, useSafety, calledPocketId, targetPower) {
  return {
    type: plan.type,
    route: plan.route,
    ballNumber: plan.ballNumber ?? null,
    pocketId: calledPocketId ?? plan.pocketId ?? null,
    power: Number(targetPower.toFixed(2)),
    score: Number((plan.tacticalScore ?? plan.score).toFixed(1)),
    forcePushOut,
    safety: useSafety,
  };
}

function buildAiRoutine(state) {
  const cueBall = getCueBall(state);
  if (!cueBall) return null;
  const difficulty = DIFFICULTY_PRESETS[state.difficultyKey];
  const hasBallInHand = state.ballInHand.active;
  const placement = hasBallInHand
    ? chooseAiPlacement(state, state.currentPlayer, state.ballInHand.restrictHeadString)
    : null;
  const shotX = placement?.x ?? cueBall.x;
  const shotY = placement?.y ?? cueBall.y;
  const canPushOut = state.pushOutAvailable && supportsPushOut(state.modeKey);
  let forcePushOut = false;
  let plan = chooseAiPlan(state, state.currentPlayer, shotX, shotY);
  if (canPushOut) {
    const directPlans = choosePocketPlans(state, state.currentPlayer, shotX, shotY);
    const bestScore = directPlans[0]?.score ?? Number.POSITIVE_INFINITY;
    forcePushOut = directPlans.length === 0 || bestScore > difficulty.pushOutScoreThreshold;
    if (forcePushOut) {
      plan = chooseFallbackPlan(state, state.currentPlayer, shotX, shotY);
    }
  }
  if (!plan) return null;

  const calledPocketId = needsPocketCall(state, state.currentPlayer) && !forcePushOut
    ? (plan.pocketId ?? POCKETS[0].id)
    : null;
  const useSafety = shouldAiDeclareSafety(state, plan, difficulty, forcePushOut);
  const targetPower = forcePushOut ? clamp(plan.power * 0.62, 0.22, 0.56) : plan.power;
  const steps = [];

  if (hasBallInHand && placement) {
    steps.push({
      kind: "auto-place",
      durationMs: scaleAiDuration(Math.max(170, Math.round(difficulty.thinkMs * 0.35))),
      x: placement.x,
      y: placement.y,
    });
  }
  if (calledPocketId) {
    steps.push({
      kind: "set-pocket",
      durationMs: scaleAiDuration(Math.max(110, Math.round(difficulty.thinkMs * 0.2))),
      pocketId: calledPocketId,
    });
  }
  steps.push({
    kind: "adjust-aim",
    durationMs: scaleAiDuration(Math.max(140, Math.round(difficulty.thinkMs * 0.28))),
    targetAngle: plan.angle,
  });
  steps.push({
    kind: "adjust-power",
    durationMs: scaleAiDuration(Math.max(130, Math.round(difficulty.thinkMs * 0.24))),
    targetPower,
  });
  if (forcePushOut) {
    steps.push({ kind: "push-out", durationMs: scaleAiDuration(110) });
  } else if (useSafety) {
    steps.push({ kind: "safety", durationMs: scaleAiDuration(110) });
  }
  steps.push({ kind: "shoot", durationMs: scaleAiDuration(95) });

  state.aiPlanPreview = createAiPlanPreview(plan, forcePushOut, useSafety, calledPocketId, targetPower);
  return {
    plan,
    placement,
    calledPocketId,
    forcePushOut,
    useSafety,
    targetAngle: plan.angle,
    targetPower,
    steps,
    stepIndex: 0,
    stepElapsedMs: 0,
  };
}

function executeAiShot(state, routine) {
  const cueBall = getCueBall(state);
  if (!cueBall) {
    clearAiTelemetry(state);
    return;
  }
  if (state.ballInHand.active) {
    state.ballInHand = { active: false, restrictHeadString: false };
  }
  if (needsPocketCall(state, state.currentPlayer) && !routine.forcePushOut && !state.calledPocketId) {
    state.calledPocketId = routine.calledPocketId ?? POCKETS[0].id;
  }

  state.cueControl.angle = routine.targetAngle;
  state.cueControl.power = routine.targetPower;
  const speed = lerp(280, state.breakShot ? 1700 : 1460, clamp(routine.targetPower, 0.18, 1));
  cueBall.vx = Math.cos(routine.targetAngle) * speed;
  cueBall.vy = Math.sin(routine.targetAngle) * speed;
  state.phase = "moving";
  state.shotCount += 1;
  state.shot = createShotContext(state, state.currentPlayer, {
    calledPocketId: routine.forcePushOut ? null : state.calledPocketId,
    isPushOut: routine.forcePushOut,
    safetyDeclared: routine.useSafety,
  });
  state.pushOutAvailable = false;
  state.pendingDecision = null;
  state.safetyDeclared = false;
  state.aiRoutine = null;
  setAiTelemetry(state, AI_ACTION_LABELS.shoot, { shoot: true });

  if (routine.forcePushOut) {
    addLog(state, `${state.players[state.currentPlayer].name} declara push out.`);
  } else if (routine.useSafety) {
    addLog(state, `${state.players[state.currentPlayer].name} juega un safety.`);
  } else {
    const shotType = routine.plan.type === "pot"
      ? "a tronera"
      : routine.plan.type === "kick"
        ? "con trayectoria alternativa por banda"
        : "de seguridad";
    addLog(state, `${state.players[state.currentPlayer].name} tira ${shotType}.`);
  }
}

function startAiStep(state, step) {
  step.started = true;
  if (step.kind === "auto-place") {
    const cueBall = getCueBall(state);
    step.startX = cueBall?.x ?? step.x;
    step.startY = cueBall?.y ?? step.y;
    setAiTelemetry(state, AI_ACTION_LABELS.autoPlace, { autoPlace: true });
    return;
  }
  if (step.kind === "set-pocket") {
    state.calledPocketId = step.pocketId;
    setAiTelemetry(state, AI_ACTION_LABELS.setPocket, { pocket: true });
    return;
  }
  if (step.kind === "adjust-aim") {
    step.startAngle = state.cueControl.angle;
    setAiTelemetry(state, AI_ACTION_LABELS.adjustAim, { aim: true });
    return;
  }
  if (step.kind === "adjust-power") {
    step.startPower = state.cueControl.power;
    setAiTelemetry(state, AI_ACTION_LABELS.adjustPower, { power: true });
    return;
  }
  if (step.kind === "push-out") {
    setAiTelemetry(state, AI_ACTION_LABELS.pushOut, { pushOut: true });
    return;
  }
  if (step.kind === "safety") {
    state.safetyDeclared = true;
    setAiTelemetry(state, AI_ACTION_LABELS.safety, { safety: true });
    return;
  }
  setAiTelemetry(state, AI_ACTION_LABELS.shoot, { shoot: true });
}

function applyAiStepProgress(state, step, progress) {
  if (step.kind === "auto-place") {
    const cueBall = getCueBall(state);
    if (!cueBall) return;
    cueBall.x = lerp(step.startX, step.x, progress);
    cueBall.y = lerp(step.startY, step.y, progress);
    cueBall.pocketed = false;
    cueBall.vx = 0;
    cueBall.vy = 0;
    return;
  }
  if (step.kind === "adjust-aim") {
    state.cueControl.angle = lerpAngle(step.startAngle, step.targetAngle, progress);
    return;
  }
  if (step.kind === "adjust-power") {
    state.cueControl.power = clamp(lerp(step.startPower, step.targetPower, progress), 0.18, 1);
  }
}

function completeAiStep(state, routine, step) {
  if (step.kind === "auto-place") {
    const cueBall = getCueBall(state);
    if (cueBall) {
      cueBall.x = step.x;
      cueBall.y = step.y;
      cueBall.pocketed = false;
      cueBall.vx = 0;
      cueBall.vy = 0;
    }
    state.ballInHand = { active: false, restrictHeadString: false };
    return false;
  }
  if (step.kind === "set-pocket") {
    state.calledPocketId = step.pocketId;
    return false;
  }
  if (step.kind === "adjust-aim") {
    state.cueControl.angle = step.targetAngle;
    return false;
  }
  if (step.kind === "adjust-power") {
    state.cueControl.power = step.targetPower;
    return false;
  }
  if (step.kind === "shoot") {
    executeAiShot(state, routine);
    return true;
  }
  return false;
}

function updateAi(state, dt) {
  if (state.pendingDecision) {
    resolvePendingDecisionIfAi(state);
    return;
  }

  if (state.aiTimerMs > 0) {
    state.aiTimerMs -= dt * 1000;
    setAiTelemetry(state, AI_ACTION_LABELS.scan);
    return;
  }

  if (!state.aiRoutine) {
    state.aiRoutine = buildAiRoutine(state);
    if (!state.aiRoutine) {
      switchTurn(state, { reason: "La IA no encontro tiro claro y cede la mesa." });
      return;
    }
  }

  const step = state.aiRoutine.steps[state.aiRoutine.stepIndex];
  if (!step) {
    executeAiShot(state, state.aiRoutine);
    return;
  }
  if (!step.started) {
    startAiStep(state, step);
  }

  const durationMs = Math.max(40, step.durationMs || 100);
  state.aiRoutine.stepElapsedMs += dt * 1000;
  const progress = clamp(state.aiRoutine.stepElapsedMs / durationMs, 0, 1);
  applyAiStepProgress(state, step, progress);

  if (progress >= 1) {
    const finishedShot = completeAiStep(state, state.aiRoutine, step);
    if (finishedShot) return;
    state.aiRoutine.stepIndex += 1;
    state.aiRoutine.stepElapsedMs = 0;
  }
}

function advanceSimulation(state, milliseconds) {
  const safeMs = clamp(milliseconds, 0, 4000);
  let remaining = safeMs / 1000;
  while (remaining > 0) {
    const step = Math.min(FIXED_DT, remaining);
    if (state.phase === "moving") {
      updatePhysics(state, step);
    } else if (state.phase === "ai-thinking") {
      updateAi(state, step);
    }
    remaining -= step;
  }
}
function drawTable(ctx, state, preview, placementGhost) {
  ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

  const ambient = ctx.createLinearGradient(0, 0, 0, TABLE_HEIGHT);
  ambient.addColorStop(0, "#2a180e");
  ambient.addColorStop(1, "#140d07");
  ctx.fillStyle = ambient;
  ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

  const wood = ctx.createLinearGradient(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
  wood.addColorStop(0, "#8b5a2b");
  wood.addColorStop(0.45, "#5f3417");
  wood.addColorStop(1, "#3c2213");
  ctx.fillStyle = wood;
  drawRoundedRect(ctx, 28, 24, TABLE_WIDTH - 56, TABLE_HEIGHT - 48, 34);
  ctx.fill();

  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  drawRoundedRect(ctx, 48, 44, TABLE_WIDTH - 96, TABLE_HEIGHT - 88, 26);
  ctx.fill();

  const felt = ctx.createLinearGradient(PLAY_LEFT, PLAY_TOP, PLAY_RIGHT, PLAY_BOTTOM);
  felt.addColorStop(0, "#0d7f55");
  felt.addColorStop(0.5, "#0f6f4c");
  felt.addColorStop(1, "#09593d");
  ctx.fillStyle = felt;
  drawRoundedRect(ctx, PLAY_LEFT - 10, PLAY_TOP - 10, PLAY_RIGHT - PLAY_LEFT + 20, PLAY_BOTTOM - PLAY_TOP + 20, 24);
  ctx.fill();

  const sheen = ctx.createRadialGradient(TABLE_CENTER_X - 120, TABLE_CENTER_Y - 90, 40, TABLE_CENTER_X, TABLE_CENTER_Y, 360);
  sheen.addColorStop(0, "rgba(255, 255, 255, 0.12)");
  sheen.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(PLAY_LEFT - 10, PLAY_TOP - 10, PLAY_RIGHT - PLAY_LEFT + 20, PLAY_BOTTOM - PLAY_TOP + 20);

  ctx.strokeStyle = "rgba(229, 231, 235, 0.15)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(HEAD_STRING_X, PLAY_TOP + 18);
  ctx.lineTo(HEAD_STRING_X, PLAY_BOTTOM - 18);
  ctx.stroke();

  ctx.fillStyle = "rgba(248, 250, 252, 0.34)";
  ctx.beginPath();
  ctx.arc(FOOT_SPOT_X, TABLE_CENTER_Y, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(HEAD_STRING_X, TABLE_CENTER_Y, 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(250, 204, 21, 0.52)";
  for (let i = 1; i <= 7; i += 1) {
    const x = PLAY_LEFT + ((PLAY_RIGHT - PLAY_LEFT) / 8) * i;
    const yTop = PLAY_TOP - 24;
    const yBottom = PLAY_BOTTOM + 24;
    ctx.beginPath();
    ctx.moveTo(x, yTop - 5);
    ctx.lineTo(x + 5, yTop);
    ctx.lineTo(x, yTop + 5);
    ctx.lineTo(x - 5, yTop);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, yBottom - 5);
    ctx.lineTo(x + 5, yBottom);
    ctx.lineTo(x, yBottom + 5);
    ctx.lineTo(x - 5, yBottom);
    ctx.closePath();
    ctx.fill();
  }

  if (modeHasPockets(state.modeKey)) {
    POCKETS.forEach((pocket) => {
      const selected = state.calledPocketId === pocket.id;
      ctx.beginPath();
      ctx.fillStyle = selected ? "#fde68a" : "#05080f";
      ctx.arc(pocket.x, pocket.y, pocket.radius, 0, Math.PI * 2);
      ctx.fill();
      if (selected) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(250, 204, 21, 0.8)";
        ctx.lineWidth = 3;
        ctx.arc(pocket.x, pocket.y, pocket.radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }

  if (preview) {
    const aiGuide = state.phase === "ai-thinking" && state.players[state.currentPlayer]?.type === "ai";
    const legal = preview.hitBall ? getLegalNumbers(state, state.currentPlayer).includes(preview.hitBall.number) : false;
    ctx.strokeStyle = aiGuide
      ? "rgba(250, 204, 21, 0.94)"
      : legal
        ? "rgba(125, 211, 252, 0.86)"
        : "rgba(248, 113, 113, 0.72)";
    ctx.lineWidth = aiGuide ? 4.2 : 2.4;
    ctx.setLineDash(aiGuide ? [14, 6] : [10, 8]);
    ctx.beginPath();
    ctx.moveTo(preview.x1, preview.y1);
    ctx.lineTo(preview.x2, preview.y2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (preview.hitBall) {
      ctx.beginPath();
      ctx.strokeStyle = aiGuide
        ? "rgba(250, 204, 21, 0.98)"
        : legal
          ? "rgba(125, 211, 252, 0.9)"
          : "rgba(248, 113, 113, 0.82)";
      ctx.lineWidth = aiGuide ? 3 : 2;
      ctx.arc(preview.hitBall.x, preview.hitBall.y, BALL_RADIUS + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (placementGhost) {
    ctx.save();
    ctx.globalAlpha = placementGhost.valid ? 0.58 : 0.32;
    ctx.fillStyle = placementGhost.valid ? "#f8fafc" : "#f87171";
    ctx.beginPath();
    ctx.arc(placementGhost.x, placementGhost.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const activeBalls = state.balls.filter((ball) => !ball.pocketed).sort((a, b) => {
    if (a.id === "cue") return -1;
    if (b.id === "cue") return 1;
    return a.number - b.number;
  });

  activeBalls.forEach((ball) => {
    ctx.fillStyle = "rgba(15, 23, 42, 0.28)";
    ctx.beginPath();
    ctx.ellipse(ball.x + 3, ball.y + 5, BALL_RADIUS * 0.96, BALL_RADIUS * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();

    if (ball.id === "cue") {
      const cueGradient = ctx.createRadialGradient(ball.x - 4, ball.y - 5, 2, ball.x, ball.y, BALL_RADIUS + 3);
      cueGradient.addColorStop(0, "#ffffff");
      cueGradient.addColorStop(1, "#d7dee8");
      ctx.fillStyle = cueGradient;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(100, 116, 139, 0.7)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      return;
    }

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = ball.stripe ? "#f8fafc" : ball.color;
    ctx.fill();

    if (ball.stripe) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = ball.color;
      ctx.fillRect(ball.x - BALL_RADIUS, ball.y - BALL_RADIUS * 0.48, BALL_DIAMETER, BALL_RADIUS * 0.96);
      ctx.restore();
    }

    const glossy = ctx.createRadialGradient(ball.x - 3, ball.y - 4, 1, ball.x, ball.y, BALL_RADIUS + 2);
    glossy.addColorStop(0, "rgba(255, 255, 255, 0.42)");
    glossy.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = glossy;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(15, 23, 42, 0.32)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS * 0.46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.font = `${ball.number >= 10 ? 8 : 9}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(ball.number), ball.x, ball.y + 0.5);
  });

  const cueBall = getCueBall(state);
  if ((state.phase === "aim" || state.phase === "placing") && cueBall && !cueBall.pocketed) {
    const backAngle = state.cueControl.angle + Math.PI;
    const cueLength = 162 + state.cueControl.power * 118;
    const startX = cueBall.x + Math.cos(backAngle) * (BALL_RADIUS + 8 + state.cueControl.power * 14);
    const startY = cueBall.y + Math.sin(backAngle) * (BALL_RADIUS + 8 + state.cueControl.power * 14);
    const endX = cueBall.x + Math.cos(backAngle) * cueLength;
    const endY = cueBall.y + Math.sin(backAngle) * cueLength;
    const cueGradient = ctx.createLinearGradient(startX, startY, endX, endY);
    cueGradient.addColorStop(0, "#f4d3a2");
    cueGradient.addColorStop(0.5, "#bb7a37");
    cueGradient.addColorStop(1, "#5b3415");
    ctx.strokeStyle = cueGradient;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }
}

function buildSnapshot(state) {
  const locale = state.locale ?? "es";
  const cueBall = getCueBall(state);
  const legalNumbers = getLegalNumbers(state, state.currentPlayer);
  return {
    locale,
    mode: "billiards_pool",
    variant: state.modeKey,
    status: state.phase,
    statusLabel: statusLabel(state.phase, locale),
    participantCount: state.participantCount ?? 2,
    hasPockets: modeHasPockets(state.modeKey),
    coordinates: "origin_top_left_x_right_y_down_table_pixels",
    modeLabel: modeLabel(state.modeKey, locale),
    difficultyKey: state.difficultyKey,
    difficultyLabel: difficultyLabel(state.difficultyKey, locale),
    raceTo: state.raceTo,
    currentPlayer: state.currentPlayer,
    currentPlayerName: localizePlayerName(state.players[state.currentPlayer]?.name ?? "-", locale),
    breakerIndex: state.breakerIndex,
    nextBreaker: state.nextBreaker,
    tableOpen: state.tableOpen,
    breakShot: state.breakShot,
    pushOutAvailable: state.pushOutAvailable,
    ballInHand: state.ballInHand.active,
    restrictHeadString: state.ballInHand.restrictHeadString,
    safetyDeclared: state.safetyDeclared,
    calledPocketId: state.calledPocketId,
    calledPocketLabel: pocketLabel(state.calledPocketId, locale),
    needsPocketCall: needsPocketCall(state, state.currentPlayer),
    pendingDecision: state.pendingDecision
      ? {
          type: state.pendingDecision.type,
          chooserIndex: state.pendingDecision.chooserIndex,
          prompt: localizeRuntimeText(state.pendingDecision.prompt, locale),
          options: state.pendingDecision.options.map((option) => ({
            ...option,
            label: localizeRuntimeText(option.label, locale),
          })),
        }
      : null,
    canDeclarePushOut: state.phase === "aim"
      && state.currentPlayer === PLAYER_HUMAN
      && state.pushOutAvailable
      && supportsPushOut(state.modeKey),
    canDeclareSafety: state.phase === "aim"
      && state.currentPlayer === PLAYER_HUMAN
      && !state.breakShot
      && supportsSafetyCall(state.modeKey),
    legalTargets: legalNumbers,
    lowestBall: getLowestNumber(state),
    cueControl: {
      angleRadians: state.cueControl.angle,
      angleDegrees: Math.round((state.cueControl.angle * 180) / Math.PI),
      power: Number(state.cueControl.power.toFixed(2)),
    },
    ai: {
      action: localizeRuntimeText(state.aiAction, locale),
      leds: state.aiLeds,
      planPreview: state.aiPlanPreview,
      thinking: state.phase === "ai-thinking",
    },
    players: state.players.map((player, index) => {
      const targetBall = player.kellyTarget != null
        ? state.balls.find((ball) => ball.number === player.kellyTarget)
        : null;
      return {
        name: localizePlayerName(player.name, locale),
        type: player.type,
        group: player.group,
        groupLabel: groupLabel(player.group, locale),
        kellyTarget: player.kellyTarget ?? null,
        kellyTargetPocketed: targetBall ? targetBall.pocketed : null,
        remainingGroupBalls: countRemainingGroupBalls(state, index),
        racksWon: player.racksWon,
        foulsInRow: player.foulsInRow,
      };
    }),
    cueBall: cueBall
      ? {
          x: Number(cueBall.x.toFixed(1)),
          y: Number(cueBall.y.toFixed(1)),
          vx: Number(cueBall.vx.toFixed(1)),
          vy: Number(cueBall.vy.toFixed(1)),
          pocketed: cueBall.pocketed,
        }
      : null,
    balls: state.balls
      .filter((ball) => ball.number > 0)
      .map((ball) => ({
        id: ball.id,
        number: ball.number,
        group: ballGroupFromNumber(ball.number),
        x: Number(ball.x.toFixed(1)),
        y: Number(ball.y.toFixed(1)),
        vx: Number(ball.vx.toFixed(1)),
        vy: Number(ball.vy.toFixed(1)),
        pocketed: ball.pocketed,
        lastPocketId: ball.lastPocketId,
      })),
    rackWinner: state.rackWinner,
    matchWinner: state.matchWinner,
    shotCount: state.shotCount,
    message: localizeRuntimeText(state.message, locale),
    log: state.log.map((entry) => localizeRuntimeText(entry, locale)),
    controls: {
      keyboard: locale === "es"
        ? "A/D (o flechas) giran en apuntado, W/S potencia, en blanca en mano flechas/WASD mueven bola, Enter/Space confirman o tiran, P autocoloca, O push out, V safety, R reinicia rack, N siguiente, F fullscreen"
        : "A/D (or arrows) adjust aim, W/S adjust power, with ball in hand arrows/WASD move the cue ball, Enter/Space confirm or shoot, P auto-places, O push out, V safety, R restarts rack, N next rack, F fullscreen.",
      mouse: locale === "es"
        ? "Mueve para apuntar y clic para colocar blanca en mano si lo prefieres"
        : "Move to aim and click to place cue ball in hand if needed.",
      touch: locale === "es"
        ? "Usa los botones tactiles de apuntado/potencia y Tirar."
        : "Use on-screen aim/power controls and Shoot.",
    },
  };
}

function eventToWorld(canvas, event, options = {}) {
  const { rotateTable = false } = options;
  const rect = canvas.getBoundingClientRect();
  const source = event.touches?.[0] ?? event.changedTouches?.[0] ?? event;
  if (!source) return null;
  const normalizedX = clamp((source.clientX - rect.left) / rect.width, 0, 1);
  const normalizedY = clamp((source.clientY - rect.top) / rect.height, 0, 1);
  if (rotateTable) {
    return {
      x: (1 - normalizedY) * TABLE_WIDTH,
      y: normalizedX * TABLE_HEIGHT,
    };
  }
  return {
    x: normalizedX * TABLE_WIDTH,
    y: normalizedY * TABLE_HEIGHT,
  };
}

function readMobileViewport() {
  if (typeof window === "undefined") return { isMobile: false, isPortrait: false };
  const width = Math.max(window.innerWidth || 0, document.documentElement?.clientWidth || 0);
  const height = Math.max(window.innerHeight || 0, document.documentElement?.clientHeight || 0);
  return { isMobile: width <= 920, isPortrait: height >= width };
}

function isInsideMobileGameShell(node) {
  return Boolean(node?.closest?.(".mobile-game-shell"));
}

function createRuntime({ canvas, onSnapshot, onFullscreenRequest, isTableRotated = () => false, locale = resolveLocale() }) {
  const ctx = canvas.getContext("2d");
  const runtime = {
    canvas,
    ctx,
    state: createRuntimeState("eight-ball", "club", locale, 2),
    pointer: { x: TABLE_CENTER_X, y: TABLE_CENTER_Y, active: false },
    lastFrame: 0,
    rafId: 0,
    publish() {
      onSnapshot(buildSnapshot(this.state));
    },
    draw() {
      const preview = (this.state.phase === "aim" || this.state.phase === "placing" || this.state.phase === "ai-thinking")
        ? getAimPreview(this.state)
        : null;
      const placementGhost = this.state.phase === "placing" && this.pointer.active
        ? {
            x: this.pointer.x,
            y: this.pointer.y,
            valid: isCuePlacementValid(this.state, this.pointer.x, this.pointer.y, this.state.ballInHand.restrictHeadString),
          }
        : null;
      drawTable(ctx, this.state, preview, placementGhost);
    },
    refresh() {
      this.publish();
      this.draw();
    },
    resetToMenu(modeKey = this.state.modeKey, difficultyKey = this.state.difficultyKey, participantCount = this.state.participantCount ?? 2) {
      this.state = createRuntimeState(modeKey, difficultyKey, this.state.locale ?? locale, participantCount);
      this.refresh();
    },
    startMatch() {
      const nextState = createRuntimeState(
        this.state.modeKey,
        this.state.difficultyKey,
        this.state.locale ?? locale,
        this.state.participantCount ?? 2
      );
      startRack(nextState, PLAYER_HUMAN);
      this.state = nextState;
      this.refresh();
    },
    restartRack() {
      if (this.state.phase === "menu") {
        this.startMatch();
        return;
      }
      const wins = cloneWins(this.state.players);
      const nextState = createRuntimeState(
        this.state.modeKey,
        this.state.difficultyKey,
        this.state.locale ?? locale,
        this.state.participantCount ?? 2
      );
      nextState.players.forEach((player, index) => {
        player.racksWon = wins[index];
      });
      startRack(nextState, this.state.breakerIndex);
      this.state = nextState;
      this.refresh();
    },
    nextRack() {
      if (!(this.state.phase === "rack-over" || this.state.phase === "match-over")) return;
      if (this.state.phase === "match-over") {
        this.resetToMenu();
        return;
      }
      const wins = cloneWins(this.state.players);
      const nextState = createRuntimeState(
        this.state.modeKey,
        this.state.difficultyKey,
        this.state.locale ?? locale,
        this.state.participantCount ?? 2
      );
      nextState.players.forEach((player, index) => {
        player.racksWon = wins[index];
      });
      startRack(nextState, this.state.nextBreaker);
      this.state = nextState;
      this.refresh();
    },
    setMode(modeKey) {
      if (!(this.state.phase === "menu" || this.state.phase === "match-over")) return;
      if (!MODE_PRESETS[modeKey]) return;
      const participantCount = isKellyMode(modeKey) ? (this.state.participantCount ?? 2) : 2;
      this.resetToMenu(modeKey, this.state.difficultyKey, participantCount);
    },
    setParticipantCount(participantCount) {
      if (!(this.state.phase === "menu" || this.state.phase === "match-over")) return;
      const normalized = clamp(Math.round(Number(participantCount) || 2), 2, 15);
      const nextCount = isKellyMode(this.state.modeKey) ? normalized : 2;
      this.resetToMenu(this.state.modeKey, this.state.difficultyKey, nextCount);
    },
    setDifficulty(difficultyKey) {
      if (!(this.state.phase === "menu" || this.state.phase === "match-over")) return;
      if (!DIFFICULTY_PRESETS[difficultyKey]) return;
      const localeKey = this.state.locale ?? locale;
      this.state.difficultyKey = difficultyKey;
      if (isKellyMode(this.state.modeKey)) {
        this.state.players.forEach((player, index) => {
          if (index === PLAYER_HUMAN) {
            player.name = localeKey === "es" ? "Tu" : "You";
          } else {
            player.name = `${localeKey === "es" ? "IA" : "AI"} ${index}`;
          }
        });
      } else {
        this.state.players[PLAYER_AI].name = `${localeKey === "es" ? "IA" : "AI"} ${difficultyLabel(difficultyKey, localeKey)}`;
      }
      if (this.state.phase === "menu") {
        addLog(this.state, localeKey === "es" ? `Dificultad ${difficultyLabel(difficultyKey, localeKey)}.` : `Difficulty ${difficultyLabel(difficultyKey, localeKey)}.`);
      }
      this.refresh();
    },
    setCalledPocket(pocketId) {
      if (!POCKETS.some((pocket) => pocket.id === pocketId)) return;
      this.state.calledPocketId = pocketId;
      const localeKey = this.state.locale ?? locale;
      addLog(this.state, localeKey === "es"
        ? `Tronera cantada: ${pocketLabel(pocketId, localeKey)}.`
        : `Called pocket: ${pocketLabel(pocketId, localeKey)}.`);
      this.refresh();
    },
    toggleSafety() {
      if (this.state.phase !== "aim" || this.state.currentPlayer !== PLAYER_HUMAN) return;
      if (!supportsSafetyCall(this.state.modeKey) || this.state.breakShot) return;
      this.state.safetyDeclared = !this.state.safetyDeclared;
      addLog(this.state, this.state.safetyDeclared ? "Safety declarado para el proximo tiro." : "Safety cancelado.");
      this.refresh();
    },
    adjustAim(delta) {
      if (this.state.phase !== "aim") return;
      this.state.cueControl.angle = normalizeAngle(this.state.cueControl.angle + delta);
      this.refresh();
    },
    adjustPower(delta) {
      if (!(this.state.phase === "aim" || this.state.phase === "placing")) return;
      this.state.cueControl.power = clamp(this.state.cueControl.power + delta, 0.18, 1);
      this.refresh();
    },
    autoPlaceCueBall() {
      if (!this.state.ballInHand.active || this.state.currentPlayer !== PLAYER_HUMAN) return;
      prepareCueBallForPlacement(this.state, this.state.ballInHand.restrictHeadString);
      this.state.ballInHand = { active: false, restrictHeadString: false };
      this.state.phase = "aim";
      setCueControlForTurn(this.state);
      addLog(this.state, "Blanca colocada automaticamente.");
      this.refresh();
    },
    confirmCuePlacement(source = "teclado") {
      if (!this.state.ballInHand.active || this.state.currentPlayer !== PLAYER_HUMAN || this.state.phase !== "placing") return;
      this.state.ballInHand = { active: false, restrictHeadString: false };
      this.state.phase = "aim";
      setCueControlForTurn(this.state);
      addLog(this.state, source === "teclado" ? "Blanca en mano fijada con teclado." : "Blanca en mano colocada.");
      this.refresh();
    },
    nudgeCueBall(dx, dy) {
      if (!this.state.ballInHand.active || this.state.currentPlayer !== PLAYER_HUMAN || this.state.phase !== "placing") return;
      const cueBall = getCueBall(this.state);
      if (!cueBall) return;
      const restrict = this.state.ballInHand.restrictHeadString;
      const xMax = restrict ? HEAD_STRING_X - BALL_RADIUS - 2 : PLAY_RIGHT - BALL_RADIUS - 2;
      let nextX = clamp(cueBall.x + dx, PLAY_LEFT + BALL_RADIUS + 2, xMax);
      let nextY = clamp(cueBall.y + dy, PLAY_TOP + BALL_RADIUS + 2, PLAY_BOTTOM - BALL_RADIUS - 2);
      if (!isCuePlacementValid(this.state, nextX, nextY, restrict)) {
        const fallback = findNearestPlacement(this.state, nextX, nextY, restrict);
        if (!isCuePlacementValid(this.state, fallback.x, fallback.y, restrict)) return;
        nextX = fallback.x;
        nextY = fallback.y;
      }
      cueBall.x = nextX;
      cueBall.y = nextY;
      cueBall.pocketed = false;
      cueBall.vx = 0;
      cueBall.vy = 0;
      this.pointer = { x: nextX, y: nextY, active: true };
      this.refresh();
    },
    shoot() {
      const didShoot = startShot(this.state, this.state.cueControl.angle, this.state.cueControl.power);
      if (didShoot) {
        this.refresh();
      } else {
        this.draw();
      }
    },
    declarePushOut() {
      if (!(this.state.phase === "aim" && this.state.currentPlayer === PLAYER_HUMAN)) return;
      const didShoot = startShot(this.state, this.state.cueControl.angle, this.state.cueControl.power, { forcePushOut: true });
      if (didShoot) {
        this.refresh();
      } else {
        this.draw();
      }
    },
    resolveDecision(optionId) {
      if (this.state.phase !== "decision" || !this.state.pendingDecision) return;
      resolvePendingDecision(this.state, optionId);
      this.refresh();
    },
    setPointer(worldPoint) {
      if (!worldPoint) return;
      this.pointer = { ...worldPoint, active: true };
      if (this.state.currentPlayer === PLAYER_HUMAN && this.state.phase === "aim") {
        const cueBall = getCueBall(this.state);
        if (cueBall) {
          this.state.cueControl.angle = Math.atan2(worldPoint.y - cueBall.y, worldPoint.x - cueBall.x);
          this.refresh();
          return;
        }
      }
      this.draw();
    },
    placeCueFromPointer(worldPoint) {
      if (!worldPoint || this.state.currentPlayer !== PLAYER_HUMAN || this.state.phase !== "placing") return;
      if (!isCuePlacementValid(this.state, worldPoint.x, worldPoint.y, this.state.ballInHand.restrictHeadString)) {
        addLog(this.state, "Posicion invalida para la blanca.");
        this.refresh();
        return;
      }
      const cueBall = getCueBall(this.state);
      if (!cueBall) return;
      cueBall.x = worldPoint.x;
      cueBall.y = worldPoint.y;
      cueBall.pocketed = false;
      cueBall.vx = 0;
      cueBall.vy = 0;
      this.confirmCuePlacement("raton");
    },
    setFullscreenState(isFullscreen) {
      this.state.fullscreen = Boolean(isFullscreen);
      this.publish();
      this.draw();
    },
    handleKeyDown(event) {
      if (event.target && ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(event.target.tagName)) {
        return;
      }
      if (event.code === "KeyF") {
        onFullscreenRequest?.();
        event.preventDefault();
        return;
      }
      if (event.code === "KeyR") {
        this.restartRack();
        event.preventDefault();
        return;
      }
      if (event.code === "KeyN") {
        this.nextRack();
        event.preventDefault();
        return;
      }
      if (this.state.phase === "decision") {
        if (event.code === "Digit1" || event.code === "Numpad1" || event.code === "Enter") {
          this.resolveDecision("take");
          event.preventDefault();
          return;
        }
        if (event.code === "Digit2" || event.code === "Numpad2") {
          this.resolveDecision("pass-back");
          event.preventDefault();
        }
        return;
      }
      if (this.state.phase === "menu" && (event.code === "Enter" || event.code === "Space")) {
        this.startMatch();
        event.preventDefault();
        return;
      }
      if (this.state.phase === "placing") {
        const step = event.shiftKey ? PLACE_NUDGE_FINE_STEP : PLACE_NUDGE_STEP;
        switch (event.code) {
          case "ArrowLeft":
          case "KeyA":
            this.nudgeCueBall(-step, 0);
            event.preventDefault();
            return;
          case "ArrowRight":
          case "KeyD":
            this.nudgeCueBall(step, 0);
            event.preventDefault();
            return;
          case "ArrowUp":
          case "KeyW":
            this.nudgeCueBall(0, -step);
            event.preventDefault();
            return;
          case "ArrowDown":
          case "KeyS":
            this.nudgeCueBall(0, step);
            event.preventDefault();
            return;
          case "Enter":
          case "Space":
            this.confirmCuePlacement("teclado");
            event.preventDefault();
            return;
          case "KeyP":
            this.autoPlaceCueBall();
            event.preventDefault();
            return;
          default:
            return;
        }
      }
      if (this.state.phase !== "aim") {
        return;
      }
      switch (event.code) {
        case "ArrowLeft":
        case "KeyA":
          this.adjustAim(-AIM_STEP);
          event.preventDefault();
          break;
        case "ArrowRight":
        case "KeyD":
          this.adjustAim(AIM_STEP);
          event.preventDefault();
          break;
        case "ArrowUp":
        case "KeyW":
          this.adjustPower(POWER_STEP);
          event.preventDefault();
          break;
        case "ArrowDown":
        case "KeyS":
          this.adjustPower(-POWER_STEP);
          event.preventDefault();
          break;
        case "KeyO":
          this.declarePushOut();
          event.preventDefault();
          break;
        case "KeyV":
          this.toggleSafety();
          event.preventDefault();
          break;
        case "Enter":
        case "Space":
          this.shoot();
          event.preventDefault();
          break;
        default:
      }
    },
    advanceTime(milliseconds) {
      advanceSimulation(this.state, milliseconds);
      this.refresh();
    },
    frame: (timestamp) => {
      const instance = runtime;
      if (!instance.lastFrame) {
        instance.lastFrame = timestamp;
      }
      const deltaMs = clamp(timestamp - instance.lastFrame, 0, MAX_FRAME_MS);
      instance.lastFrame = timestamp;
      if (instance.state.phase === "moving" || instance.state.phase === "ai-thinking") {
        advanceSimulation(instance.state, deltaMs);
        instance.publish();
      }
      instance.draw();
      instance.rafId = requestAnimationFrame(instance.frame);
    },
    start() {
      const move = (event) => {
        const worldPoint = eventToWorld(canvas, event, { rotateTable: isTableRotated() });
        this.setPointer(worldPoint);
      };
      const down = (event) => {
        const worldPoint = eventToWorld(canvas, event, { rotateTable: isTableRotated() });
        this.placeCueFromPointer(worldPoint);
      };
      const wheel = (event) => {
        if (!(this.state.phase === "aim" || this.state.phase === "placing")) return;
        event.preventDefault();
        this.adjustPower(event.deltaY < 0 ? POWER_STEP : -POWER_STEP);
      };
      this._listeners = {
        move,
        down,
        wheel,
        keydown: (event) => this.handleKeyDown(event),
      };
      canvas.addEventListener("mousemove", move);
      canvas.addEventListener("touchmove", move, { passive: true });
      canvas.addEventListener("mousedown", down);
      canvas.addEventListener("touchstart", down, { passive: true });
      canvas.addEventListener("wheel", wheel, { passive: false });
      window.addEventListener("keydown", this._listeners.keydown);
      this.refresh();
      this.rafId = requestAnimationFrame(this.frame);
    },
    destroy() {
      cancelAnimationFrame(this.rafId);
      if (!this._listeners) return;
      canvas.removeEventListener("mousemove", this._listeners.move);
      canvas.removeEventListener("touchmove", this._listeners.move);
      canvas.removeEventListener("mousedown", this._listeners.down);
      canvas.removeEventListener("touchstart", this._listeners.down);
      canvas.removeEventListener("wheel", this._listeners.wheel);
      window.removeEventListener("keydown", this._listeners.keydown);
    },
  };
  return runtime;
}

function createDefaultSnapshot(locale = resolveLocale()) {
  return buildSnapshot(createRuntimeState("eight-ball", "club", locale));
}

function BilliardsClubGame() {
  const canvasRef = useRef(null);
  const shellRef = useRef(null);
  const runtimeRef = useRef(null);
  const tableRotatedRef = useRef(false);
  const [locale] = useState(() => resolveLocale());
  const [snapshot, setSnapshot] = useState(() => createDefaultSnapshot(locale));
  const [mobileViewport, setMobileViewport] = useState(() => readMobileViewport());
  const [embeddedInMobileShell, setEmbeddedInMobileShell] = useState(false);
  const [preferVerticalTable, setPreferVerticalTable] = useState(true);
  const forceHorizontalTable = mobileViewport.isMobile && embeddedInMobileShell;
  const useVerticalTable =
    mobileViewport.isMobile &&
    mobileViewport.isPortrait &&
    preferVerticalTable &&
    !forceHorizontalTable;
  const ui = UI_COPY[locale] ?? UI_COPY.en;

  useEffect(() => {
    tableRotatedRef.current = useVerticalTable;
  }, [useVerticalTable]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const runtime = createRuntime({
      canvas,
      onSnapshot: setSnapshot,
      isTableRotated: () => tableRotatedRef.current,
      locale,
      onFullscreenRequest: () => {
        const shell = shellRef.current;
        if (!shell) return;
        const request = shell.requestFullscreen || shell.webkitRequestFullscreen;
        if (request) request.call(shell);
      },
    });
    runtimeRef.current = runtime;
    runtime.start();
    return () => {
      runtime.destroy();
      runtimeRef.current = null;
    };
  }, [locale]);

  useEffect(() => {
    const onChange = () => {
      runtimeRef.current?.setFullscreenState(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  useEffect(() => {
    const updateViewport = () => {
      setMobileViewport(readMobileViewport());
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);
    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
    };
  }, []);

  useEffect(() => {
    const syncMobileShell = () => {
      setEmbeddedInMobileShell(isInsideMobileGameShell(shellRef.current));
    };
    syncMobileShell();
    window.addEventListener("resize", syncMobileShell);
    return () => {
      window.removeEventListener("resize", syncMobileShell);
    };
  }, []);

  const startMatch = useCallback(() => runtimeRef.current?.startMatch(), []);
  const restartRack = useCallback(() => runtimeRef.current?.restartRack(), []);
  const nextRack = useCallback(() => runtimeRef.current?.nextRack(), []);
  const resetMatch = useCallback(() => runtimeRef.current?.resetToMenu(), []);
  const setMode = useCallback((modeKey) => runtimeRef.current?.setMode(modeKey), []);
  const setDifficulty = useCallback((difficultyKey) => runtimeRef.current?.setDifficulty(difficultyKey), []);
  const setParticipantCount = useCallback((participantCount) => runtimeRef.current?.setParticipantCount(participantCount), []);
  const setPocket = useCallback((pocketId) => runtimeRef.current?.setCalledPocket(pocketId), []);
  const adjustAim = useCallback((delta) => runtimeRef.current?.adjustAim(delta), []);
  const adjustPower = useCallback((delta) => runtimeRef.current?.adjustPower(delta), []);
  const shoot = useCallback(() => runtimeRef.current?.shoot(), []);
  const declarePushOut = useCallback(() => runtimeRef.current?.declarePushOut(), []);
  const toggleSafety = useCallback(() => runtimeRef.current?.toggleSafety(), []);
  const resolveDecision = useCallback((optionId) => runtimeRef.current?.resolveDecision(optionId), []);
  const autoPlaceCueBall = useCallback(() => runtimeRef.current?.autoPlaceCueBall(), []);
  const nudgeCueBall = useCallback((dx, dy) => runtimeRef.current?.nudgeCueBall(dx, dy), []);
  const confirmCuePlacement = useCallback(() => runtimeRef.current?.confirmCuePlacement("teclado"), []);
  const requestFullscreen = useCallback(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const request = shell.requestFullscreen || shell.webkitRequestFullscreen;
    if (request) request.call(shell);
  }, []);

  const advanceTime = useCallback((ms) => runtimeRef.current?.advanceTime(ms), []);
  useGameRuntimeBridge(snapshot, useCallback((state) => state, []), advanceTime);

  const overlayVisible = snapshot.status === "menu" || snapshot.status === "rack-over" || snapshot.status === "match-over";
  const humanTurn = snapshot.currentPlayer === PLAYER_HUMAN;
  const canAim = snapshot.status === "aim" && humanTurn;
  const canPlace = snapshot.status === "placing" && humanTurn;
  const canPushOut = Boolean(snapshot.canDeclarePushOut);
  const canSafety = Boolean(snapshot.canDeclareSafety);
  const aiLeds = snapshot.ai?.leds ?? createAiLedState();
  const aiThinking = Boolean(snapshot.ai?.thinking);
  const aiPlan = snapshot.ai?.planPreview ?? null;
  const ledClass = (active, baseClass = "") => [baseClass, aiThinking && active ? "led-active" : ""].filter(Boolean).join(" ");
  const canConfigureBeforeStart = snapshot.status === "menu" || snapshot.status === "match-over";
  const modeObjective = snapshot.variant === "kelly"
    ? `${modeSummary(snapshot.variant, locale)} ${locale === "es" ? `Participantes: ${snapshot.participantCount}.` : `Players: ${snapshot.participantCount}.`}`
    : modeSummary(snapshot.variant, locale);
  const raceUnit = isCaromMode(snapshot.variant)
    ? ui.pointsUnit
    : isKellyMode(snapshot.variant)
      ? ui.winsUnit
      : ui.racksUnit;
  const scoreboardHeadline = snapshot.players.length === 2
    ? `${snapshot.players[0]?.racksWon ?? 0} - ${snapshot.players[1]?.racksWon ?? 0}`
    : (() => {
        const topScore = Math.max(...snapshot.players.map((player) => player.racksWon), 0);
        const leaders = snapshot.players.filter((player) => player.racksWon === topScore).map((player) => player.name);
        const leaderLabel = leaders.length > 3
          ? `${leaders.slice(0, 3).join(", ")}...`
          : leaders.join(", ");
        return `${ui.leader}: ${leaderLabel || "-"} (${topScore})`;
      })();
  const showKellyTargets = snapshot.variant === "kelly";
  const showGroupInfo = snapshot.variant === "eight-ball";
  const mobileDirectionalHint = canPlace
    ? ui.mobileHintPlace
    : ui.mobileHintAim;
  const gameClassName = [
    "mini-game",
    "billiards-game",
    mobileViewport.isMobile ? "billiards-mobile" : "",
    mobileViewport.isMobile && mobileViewport.isPortrait ? "billiards-mobile-portrait" : "",
    mobileViewport.isMobile && !mobileViewport.isPortrait ? "billiards-mobile-landscape" : "",
    useVerticalTable ? "billiards-table-vertical" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={gameClassName}>
      <div className="mini-head">
        <div>
          <h4>{ui.title}</h4>
          <p>{ui.subtitle}</p>
        </div>
        <div className="billiards-head-actions">
          {snapshot.status === "menu" ? <button id="billiards-start-btn" type="button" onClick={startMatch}>{ui.start}</button> : null}
          {snapshot.status === "rack-over" ? <button id="billiards-next-rack-btn" type="button" onClick={nextRack}>{ui.nextRack}</button> : null}
          <button type="button" onClick={restartRack}>{ui.restartRack}</button>
          <button type="button" onClick={resetMatch}>{ui.newMatch}</button>
          {mobileViewport.isMobile && mobileViewport.isPortrait && !forceHorizontalTable ? (
            <button id="billiards-orientation-btn" type="button" onClick={() => setPreferVerticalTable((previous) => !previous)}>
              {useVerticalTable ? ui.orientationHorizontal : ui.orientationVertical}
            </button>
          ) : null}
          <button id="billiards-fullscreen-btn" type="button" onClick={requestFullscreen}>{ui.fullscreen}</button>
        </div>
      </div>

      <div className="billiards-toolbar">
        <div className="billiards-setup-row">
          <label className="billiards-select-field" htmlFor="billiards-mode-select">
            <span>{ui.gameMode}</span>
            <select
              id="billiards-mode-select"
              value={snapshot.variant}
              onChange={(event) => setMode(event.target.value)}
              disabled={!canConfigureBeforeStart}
            >
              {Object.entries(MODE_PRESETS).map(([modeKey, preset]) => (
                <option key={modeKey} value={modeKey}>{localizeLabel(preset.label, locale)}</option>
              ))}
            </select>
          </label>
          <label className="billiards-select-field" htmlFor="billiards-ai-select">
            <span>{ui.aiMode}</span>
            <select
              id="billiards-ai-select"
              value={snapshot.difficultyKey}
              onChange={(event) => setDifficulty(event.target.value)}
              disabled={!canConfigureBeforeStart}
            >
              {Object.entries(DIFFICULTY_PRESETS).map(([difficultyKey, preset]) => (
                <option key={difficultyKey} value={difficultyKey}>{localizeLabel(preset.label, locale)}</option>
              ))}
            </select>
          </label>
          {snapshot.variant === "kelly" ? (
            <label className="billiards-select-field" htmlFor="billiards-participants-select">
              <span>{ui.participants}</span>
              <select
                id="billiards-participants-select"
                value={snapshot.participantCount}
                onChange={(event) => setParticipantCount(event.target.value)}
                disabled={!canConfigureBeforeStart}
              >
                {Array.from({ length: 14 }, (_, index) => {
                  const count = index + 2;
                  return <option key={count} value={count}>{count}</option>;
                })}
              </select>
            </label>
          ) : null}
          <p className="billiards-mode-goal">
            <strong>{ui.modeGoal}</strong> {modeObjective}
          </p>
        </div>
        <div className="billiards-chipline">
          <span className="hud-pill billiards-turn-pill">
            <span className={`billiards-led-dot ${aiThinking && aiLeds.turn ? "on" : ""}`} aria-hidden="true" />
            {ui.turn}: {snapshot.currentPlayerName}
          </span>
          <span className="hud-pill">{ui.mode}: {snapshot.modeLabel}</span>
          <span className="hud-pill">{ui.raceTo} {snapshot.raceTo}</span>
          {snapshot.tableOpen ? <span className="hud-pill">{ui.tableOpen}</span> : null}
          {snapshot.ballInHand ? <span className="hud-pill">{ui.ballInHand}</span> : null}
          {snapshot.pushOutAvailable ? <span className="hud-pill">{ui.pushOutAvailable}</span> : null}
          {snapshot.safetyDeclared ? <span className="hud-pill">{ui.safetyActive}</span> : null}
        </div>
      </div>

      <div className="billiards-layout">
        <div className="billiards-stage phaser-canvas-shell" ref={shellRef}>
          <div className="phaser-canvas-host billiards-canvas-host">
            <canvas id="billiards-canvas" ref={canvasRef} width={TABLE_WIDTH} height={TABLE_HEIGHT} className="billiards-canvas" aria-label={locale === "es" ? "Mesa de billar" : "Pool table"} />
          </div>
          {overlayVisible ? (
            <div className="billiards-overlay">
              {snapshot.status === "menu" ? (
                <>
                  <h5>{ui.title}</h5>
                  <p>{modeObjective}</p>
                  <p>{ui.speedToUnderstand} {snapshot.raceTo} {raceUnit}.</p>
                  <button id="billiards-overlay-start" type="button" onClick={startMatch}>{ui.openTableButton}</button>
                </>
              ) : null}
              {snapshot.status === "rack-over" ? (
                <>
                  <h5>{ui.rackClosedTitle}</h5>
                  <p>{snapshot.message}</p>
                  <button type="button" onClick={nextRack}>{ui.prepareNextRack}</button>
                </>
              ) : null}
              {snapshot.status === "match-over" ? (
                <>
                  <h5>{ui.matchFinishedTitle}</h5>
                  <p>{snapshot.message}</p>
                  <button type="button" onClick={resetMatch}>{ui.newMatch}</button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <aside className="billiards-sidepanel">
          <section className="billiards-panel scoreboard">
            <header>
              <span>{ui.scoreboard}</span>
              <strong>{scoreboardHeadline}</strong>
            </header>
            <div className="billiards-score-row">
              {snapshot.players.map((player, index) => (
                <article key={`${player.name}-${index}`} className={snapshot.currentPlayer === index ? "active" : ""}>
                  <h6>{player.name}</h6>
                  <p>{raceUnit}: {player.racksWon}</p>
                  {showGroupInfo ? <p>{ui.group}: {player.groupLabel}</p> : null}
                  {showGroupInfo && player.group ? <p>{ui.remaining}: {player.remainingGroupBalls}</p> : null}
                  {showKellyTargets ? (
                    <p>
                      {ui.targetBall}: {player.kellyTarget ?? "-"}{" "}
                      {player.kellyTarget == null
                        ? ""
                        : `(${player.kellyTargetPocketed ? ui.pocketed : ui.onTable})`}
                    </p>
                  ) : null}
                  {snapshot.variant === "nine-ball" || snapshot.variant === "ten-ball" ? <p>{ui.foulsInRow}: {player.foulsInRow}</p> : null}
                </article>
              ))}
            </div>
          </section>

          <section className="billiards-panel state">
            <header>
              <span>{ui.telemetry}</span>
              <strong>{snapshot.statusLabel ?? snapshot.status}</strong>
            </header>
            <p>{ui.legalTarget}: {snapshot.legalTargets.length ? snapshot.legalTargets.join(", ") : "-"}</p>
            <p>{ui.power}: {Math.round(snapshot.cueControl.power * 100)}%</p>
            <p>{ui.angle}: {snapshot.cueControl.angleDegrees}&deg;</p>
            <p>{ui.lowestBall}: {snapshot.lowestBall ?? "-"}</p>
            <p>{ui.pushOut}: {snapshot.pushOutAvailable ? ui.yes : ui.no}</p>
            <p>{ui.safety}: {snapshot.safetyDeclared ? ui.declared : ui.no}</p>
            {snapshot.calledPocketLabel ? <p>{ui.calledPocket}: {snapshot.calledPocketLabel}</p> : null}
          </section>

          <section className="billiards-panel ai-console">
            <header>
              <span>{ui.aiConsole}</span>
              <strong>{aiThinking ? ui.analyzing : ui.standby}</strong>
            </header>
            <p>{snapshot.ai?.action ?? localizeRuntimeText(AI_ACTION_LABELS.idle, locale)}</p>
            <div className="billiards-led-grid" aria-label={ui.aiLedGroup}>
              <span className={`billiards-led-pill ${aiThinking && aiLeds.turn ? "on" : ""}`}>{ui.aiTurn}</span>
              <span className={`billiards-led-pill ${aiThinking && aiLeds.autoPlace ? "on" : ""}`}>{ui.autoPlace}</span>
              <span className={`billiards-led-pill ${aiThinking && aiLeds.pocket ? "on" : ""}`}>{ui.pocket}</span>
              <span className={`billiards-led-pill ${aiThinking && aiLeds.aim ? "on" : ""}`}>{ui.aimAdjust}</span>
              <span className={`billiards-led-pill ${aiThinking && aiLeds.power ? "on" : ""}`}>{ui.powerAdjust}</span>
              <span className={`billiards-led-pill ${aiThinking && aiLeds.pushOut ? "on" : ""}`}>{ui.pushOut}</span>
              <span className={`billiards-led-pill ${aiThinking && aiLeds.safety ? "on" : ""}`}>{ui.safety}</span>
              <span className={`billiards-led-pill ${aiThinking && aiLeds.shoot ? "on" : ""}`}>{ui.shoot}</span>
            </div>
            {aiPlan ? (
              <p>
                {ui.plan}: {aiPlan.type === "pot" ? ui.planPot : aiPlan.type === "kick" ? ui.planKick : ui.planContact}
                {aiPlan.route ? ` (${aiPlan.route})` : ""}, {ui.ball} {aiPlan.ballNumber ?? "-"}, {ui.power.toLowerCase()} {Math.round(aiPlan.power * 100)}%.
              </p>
            ) : null}
          </section>

          {snapshot.pendingDecision ? (
            <section className="billiards-panel decision">
              <header>
                <span>{ui.decision}</span>
                <strong>{ui.turn}: {snapshot.currentPlayerName}</strong>
              </header>
              <p>{snapshot.pendingDecision.prompt}</p>
              <div className="billiards-control-group">
                {snapshot.pendingDecision.options.map((option, index) => (
                  <button
                    key={option.id}
                    id={`billiards-decision-${option.id}`}
                    type="button"
                    onClick={() => resolveDecision(option.id)}
                  >
                    {index + 1}. {option.label}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {snapshot.needsPocketCall ? (
            <section className="billiards-panel pockets">
              <header>
                <span>{snapshot.variant === "ten-ball" ? ui.callShot : ui.callEight}</span>
                <strong>{ui.choosePocket}</strong>
              </header>
              <div className="billiards-pocket-grid">
                {POCKETS.map((pocket) => (
                  <button
                    key={pocket.id}
                    id={`billiards-pocket-${pocket.id}`}
                    type="button"
                    className={snapshot.calledPocketId === pocket.id ? "active" : ""}
                    onClick={() => setPocket(pocket.id)}
                  >
                    {localizeLabel(pocket.label, locale)}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      <div className="billiards-control-deck">
        <div className="billiards-control-group">
          <button id="billiards-aim-left" type="button" className={ledClass(aiLeds.aim)} onClick={() => adjustAim(-AIM_STEP)} disabled={!canAim}>{ui.aimMinus}</button>
          <button id="billiards-aim-right" type="button" className={ledClass(aiLeds.aim)} onClick={() => adjustAim(AIM_STEP)} disabled={!canAim}>{ui.aimPlus}</button>
          <button id="billiards-power-minus" type="button" className={ledClass(aiLeds.power)} onClick={() => adjustPower(-POWER_STEP)} disabled={!(canAim || canPlace)}>{ui.powerMinus}</button>
          <button id="billiards-power-plus" type="button" className={ledClass(aiLeds.power)} onClick={() => adjustPower(POWER_STEP)} disabled={!(canAim || canPlace)}>{ui.powerPlus}</button>
          <button id="billiards-push-out" type="button" className={ledClass(aiLeds.pushOut)} onClick={declarePushOut} disabled={!canPushOut}>{ui.pushOut}</button>
          <button id="billiards-safety" type="button" className={`${snapshot.safetyDeclared ? "active" : ""} ${ledClass(aiLeds.safety)}`.trim()} onClick={toggleSafety} disabled={!canSafety}>{ui.safety}</button>
          <button id="billiards-shoot-btn" type="button" className={ledClass(aiLeds.shoot)} onClick={shoot} disabled={!canAim}>{ui.shootButton}</button>
          <button id="billiards-auto-place" type="button" className={ledClass(aiLeds.autoPlace)} onClick={autoPlaceCueBall} disabled={!canPlace}>{ui.autoPlace}</button>
        </div>
        <div className="billiards-help-copy">
          <span>{ui.optionalMouseAim}</span>
          <span>{ui.help1}</span>
          <span>{ui.help2}</span>
          <span>{ui.help3}</span>
          <span>{ui.help4}</span>
          <span>{ui.help5}</span>
          <span>{ui.help6}</span>
          <span>{ui.help7}</span>
        </div>
      </div>

      {mobileViewport.isMobile ? (
        <div className="billiards-mobile-controls" role="group" aria-label={ui.mobileControlsAria}>
          <p className="billiards-mobile-hint">{mobileDirectionalHint}</p>
          <div className="billiards-mobile-grid">
            <div className="billiards-mobile-pad">
              <button
                type="button"
                onClick={() => (canPlace ? nudgeCueBall(0, -PLACE_NUDGE_STEP) : adjustPower(POWER_STEP))}
                disabled={!(canAim || canPlace)}
                aria-label={canPlace ? (locale === "es" ? "Mover blanca arriba" : "Move cue ball up") : (locale === "es" ? "Aumentar potencia" : "Increase power")}
              >
                {ui.up}
              </button>
              <button
                type="button"
                onClick={() => (canPlace ? nudgeCueBall(-PLACE_NUDGE_STEP, 0) : adjustAim(-AIM_STEP))}
                disabled={!(canAim || canPlace)}
                aria-label={canPlace ? (locale === "es" ? "Mover blanca izquierda" : "Move cue ball left") : (locale === "es" ? "Apuntar a la izquierda" : "Aim left")}
              >
                {ui.left}
              </button>
              <button
                type="button"
                onClick={() => (canPlace ? nudgeCueBall(PLACE_NUDGE_STEP, 0) : adjustAim(AIM_STEP))}
                disabled={!(canAim || canPlace)}
                aria-label={canPlace ? (locale === "es" ? "Mover blanca derecha" : "Move cue ball right") : (locale === "es" ? "Apuntar a la derecha" : "Aim right")}
              >
                {ui.right}
              </button>
              <button
                type="button"
                onClick={() => (canPlace ? nudgeCueBall(0, PLACE_NUDGE_STEP) : adjustPower(-POWER_STEP))}
                disabled={!(canAim || canPlace)}
                aria-label={canPlace ? (locale === "es" ? "Mover blanca abajo" : "Move cue ball down") : (locale === "es" ? "Reducir potencia" : "Decrease power")}
              >
                {ui.down}
              </button>
            </div>
            <div className="billiards-mobile-actions">
              <button
                id="billiards-mobile-main-action"
                type="button"
                className="billiards-mobile-primary"
                onClick={() => (canPlace ? confirmCuePlacement() : shoot())}
                disabled={!(canAim || canPlace)}
              >
                {canPlace ? ui.placeCueBall : ui.shootButton}
              </button>
              <button type="button" onClick={autoPlaceCueBall} disabled={!canPlace}>{ui.autoCueBall}</button>
              <button type="button" onClick={declarePushOut} disabled={!canPushOut}>{ui.pushOut}</button>
              <button type="button" onClick={toggleSafety} disabled={!canSafety}>{ui.safety}</button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="billiards-log-strip">
        {snapshot.log.map((entry, index) => (
          <span key={`${entry}-${index}`}>{entry}</span>
        ))}
      </div>

      <p className="game-message">{snapshot.message}</p>
    </div>
  );
}

export default BilliardsClubGame;
