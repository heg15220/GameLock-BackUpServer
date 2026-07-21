// Pádel Pro Arena — IA de las figuras controladas por la máquina (tu pareja y los
// dos rivales). Módulo puro y testeable: predice el vuelo con la propia física,
// coloca a cada jugador por zona y elige el golpe según la situación. El motor
// mueve las figuras y ejecuta el golpe; aquí vive la decisión.

import {
  stepBall,
  bounceFloor,
  BALL_R,
  HALF_W,
  NET_Z,
  FAR_Z,
  NEAR_Z,
  SHOT_FLIGHT,
  SHOT_SPIN,
  clamp,
} from "./physics.js";

// Knobs por dificultad. `speed` es px/s de movimiento del jugador, `reactionMs` el
// retardo antes de reaccionar a un cambio de bola, `aimError` el ruido de
// colocación, `aggression` la probabilidad de subir a la red y rematar, `lobChance`
// la de defender con globo y `faultChance` la de fallar la devolución.
// `reactionMs` = retardo antes de perseguir una bola recién golpeada; `readError` =
// error lateral (px) con que la IA lee dónde caerá la bola. Juntos abren huecos: una
// bola rápida o bien colocada llega antes de que la IA reaccione y cubra, así que el
// usuario puede ganar puntos por mérito propio (no solo por fallos de la IA).
export const DIFFICULTIES = {
  easy: {
    id: "easy",
    speed: 165, // más lento que el jugador (262)
    reactionMs: 420,
    aimError: 46, // error en la colocación de sus propios golpes
    readError: 96, // lee mal dónde cae la bola → falla coberturas
    aggression: 0.18,
    lobChance: 0.15,
    faultChance: 0.17,
  },
  medium: {
    id: "medium",
    speed: 225,
    reactionMs: 240,
    aimError: 34,
    readError: 54,
    aggression: 0.45,
    lobChance: 0.3,
    faultChance: 0.09,
  },
  hard: {
    id: "hard",
    speed: 292,
    reactionMs: 135,
    aimError: 18,
    readError: 26,
    aggression: 0.74,
    lobChance: 0.4,
    faultChance: 0.04,
  },
};

export function createAiConfig(difficulty = "medium") {
  return { ...(DIFFICULTIES[difficulty] ?? DIFFICULTIES.medium) };
}

// PRNG mulberry32 sembrable, para partidas reproducibles.
export function makeRng(seed = 0x9e3779b9) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Simula el vuelo de la bola (con botes de suelo, ignorando paredes para la
// predicción) hasta que su z cruza `targetZ`. Devuelve { x, y, z, t, reachable }
// con el estado interpolado en el cruce, o reachable:false si no lo alcanza.
export function predictAtZ(ball, targetZ, maxSteps = 400, dt = 1 / 60) {
  let b = ball;
  const dirToward = Math.sign(targetZ - ball.z) || 1;
  for (let i = 0; i < maxSteps; i++) {
    const prev = b;
    b = stepBall(b, dt);
    if (b.y <= BALL_R && b.vy < 0) b = bounceFloor(b);
    const crossed =
      (dirToward > 0 && b.z >= targetZ) || (dirToward < 0 && b.z <= targetZ);
    if (crossed) {
      const span = b.z - prev.z;
      const f = span === 0 ? 0 : (targetZ - prev.z) / span;
      return {
        x: prev.x + (b.x - prev.x) * f,
        y: prev.y + (b.y - prev.y) * f,
        z: targetZ,
        t: (i + f) * dt,
        reachable: true,
      };
    }
  }
  return { x: b.x, y: b.y, z: b.z, t: maxSteps * dt, reachable: false };
}

// Punto de primer bote en el suelo. Devuelve { x, z, t }.
export function predictLanding(ball, maxSteps = 400, dt = 1 / 60) {
  let b = ball;
  for (let i = 0; i < maxSteps; i++) {
    const nb = stepBall(b, dt);
    if (nb.y <= BALL_R && nb.vy < 0) {
      return { x: nb.x, z: nb.z, t: i * dt };
    }
    b = nb;
  }
  return { x: b.x, z: b.z, t: maxSteps * dt };
}

// Posición objetivo de un jugador de la máquina. Si la bola viene hacia su columna
// (mitad izquierda/derecha de su campo) va a interceptar el punto de bote; si no,
// mantiene una posición de cobertura en su columna a media pista.
//   player   : { x, z, column: -1|1, team: "home"|"away" }
//   ball     : estado de la pelota
// Devuelve { x, z }.
export function desiredPosition(player, ball, config) {
  const homeSide = player.team === "home";
  const myHalfMin = homeSide ? NEAR_Z : NET_Z;
  const myHalfMax = homeSide ? NET_Z : FAR_Z;
  const ballIncoming = homeSide ? ball.vz < 0 : ball.vz > 0;

  // Franja de reposo de la columna: red o fondo según lo cerca que esté la bola.
  const restZ = homeSide
    ? clamp(myHalfMin + (myHalfMax - myHalfMin) * 0.4, myHalfMin + 20, myHalfMax - 20)
    : clamp(myHalfMax - (myHalfMax - myHalfMin) * 0.4, myHalfMin + 20, myHalfMax - 20);
  const restX = player.column * HALF_W * 0.5;

  if (!ballIncoming || !ball.live) {
    return { x: restX, z: restZ };
  }

  const landing = predictLanding(ball);
  const inMyHalf = landing.z >= myHalfMin - 30 && landing.z <= myHalfMax + 30;
  const inMyColumn = Math.sign(landing.x) === player.column || Math.abs(landing.x) < 24;

  if (inMyHalf && inMyColumn) {
    let tz = clamp(landing.z, myHalfMin + 10, myHalfMax - 10);
    // Si el bote cae pegado a tu pared de fondo, colócate por DELANTE del bote para
    // tomar la bola cuando rebote en el cristal hacia ti (juego de pared).
    const backWall = homeSide ? myHalfMin : myHalfMax;
    if (Math.abs(landing.z - backWall) < 80) {
      tz = homeSide ? tz + 58 : tz - 58;
    }
    return {
      x: clamp(landing.x, -HALF_W + 10, HALF_W - 10),
      z: clamp(tz, myHalfMin + 10, myHalfMax - 10),
    };
  }
  // La bola es del compañero: cubre tu columna avanzando ligeramente.
  return { x: restX, z: restZ };
}

// Mueve una posición hacia un objetivo a `speed` px/s, sin pasarse. Puro.
export function stepToward(pos, target, speed, dt) {
  const dx = target.x - pos.x;
  const dz = target.z - pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 1) return { x: target.x, z: target.z };
  const step = Math.min(dist, speed * dt);
  return { x: pos.x + (dx / dist) * step, z: pos.z + (dz / dist) * step };
}

// Clasifica la formación rival: ambos en la red, ambos al fondo, o partida.
export function readFormation(opponents, toFar) {
  const atNet = opponents.map((o) => (toFar ? o.z < NET_Z + 150 : o.z > NET_Z - 150));
  const bothNet = atNet[0] && atNet[1];
  const bothBack = !atNet[0] && !atNet[1];
  return { bothNet, bothBack, split: !bothNet && !bothBack, atNet };
}

// Elige el golpe de una figura de la máquina con criterio táctico. Lee la formación
// rival, la altura de la bola y su propia posición para escoger entre remate,
// víbora, bandeja, volea, globo, dejada o liftada, con el efecto adecuado. Devuelve
// { targetX, targetZ, flight, kind, spin }.
export function chooseShot(config, rng, { hitter, ballY, ballBounced = true, nearNet = false, hitterTeam, opponents }) {
  const r = rng ?? makeRng();
  const toFar = hitterTeam === "home"; // ataca hacia el campo contrario
  const oppMinZ = toFar ? NET_Z : NEAR_Z;
  const oppMaxZ = toFar ? FAR_Z : NET_Z;
  const form = readFormation(opponents, toFar);

  // Pasillos libres: el más ancho entre rivales o junto a las bandas.
  const oppXs = opponents.map((o) => o.x).sort((a, b) => a - b);
  const gaps = [
    { x: (-HALF_W + oppXs[0]) / 2, w: oppXs[0] + HALF_W },
    { x: (oppXs[0] + oppXs[1]) / 2, w: oppXs[1] - oppXs[0] },
    { x: (oppXs[1] + HALF_W) / 2, w: HALF_W - oppXs[1] },
  ].sort((a, b) => b.w - a.w);
  let targetX = gaps[0].x;

  const highBall = ballY > 2.2 * BALL_R * 6; // bola alta, rematable
  const veryHigh = ballY > 3.4 * BALL_R * 6;

  let kind = "drive";
  let depth = 0.82;

  if (highBall && nearNet && r() < config.aggression) {
    // Bola alta en la red: víbora si está muy alta y agresivo, remate si no.
    kind = veryHigh && r() < config.aggression ? "vibora" : "smash";
    depth = kind === "vibora" ? 0.62 : 0.5;
    // Remate a los pies del rival más adelantado o al hueco.
    targetX = form.bothNet ? gaps[0].x : targetX;
  } else if (!ballBounced && nearNet) {
    // Bola en vuelo en la red: volea de ataque al hueco (o dejada de volea si los
    // rivales están lejos).
    if (form.bothBack && r() < config.aggression * 0.4) {
      kind = "dejada";
      depth = 0.16;
    } else {
      kind = "volea";
      depth = 0.7;
    }
  } else if (form.bothNet && r() < config.lobChance + 0.25) {
    // Rivales pegados a la red: globo cortado y profundo por encima de ellos.
    kind = "lob";
    depth = 0.95;
    targetX = clamp(targetX * 0.5, -HALF_W * 0.65, HALF_W * 0.65);
  } else if (form.bothBack && nearNet && r() < config.aggression * 0.5) {
    // Rivales al fondo y tú en la red: dejada que muere corta.
    kind = "dejada";
    depth = 0.17;
  } else if (nearNet) {
    // En la red sin bola alta: bandeja cortada y profunda para no perder la red.
    kind = "bandeja";
    depth = 0.84;
  } else {
    // Desde el fondo: liftada profunda para empujar al rival contra el cristal; a
    // veces busca la pared lateral colocándola muy abierta.
    kind = "drive";
    depth = 0.88;
    if (r() < config.aggression * 0.3) targetX = Math.sign(targetX || 1) * HALF_W * 0.82;
  }

  const targetZ = toFar
    ? oppMinZ + (oppMaxZ - oppMinZ) * depth
    : oppMaxZ - (oppMaxZ - oppMinZ) * depth;

  // Ruido de colocación por dificultad.
  targetX = clamp(targetX + (r() * 2 - 1) * config.aimError, -HALF_W + 12, HALF_W - 12);

  return { targetX, targetZ, flight: SHOT_FLIGHT[kind], kind, spin: SHOT_SPIN[kind] };
}
