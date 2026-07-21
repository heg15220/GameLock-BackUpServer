// Pádel Pro Arena — física del mundo. Módulo puro y testeable (sin DOM ni canvas).
//
// Marco del mundo (unidades en píxeles, escala 1 m = M px):
//   x — lateral, 0 en el centro de la pista, de -HALF_W (izquierda) a +HALF_W (derecha).
//   y — altura sobre el suelo, positiva hacia arriba. Suelo en y = 0.
//   z — profundidad. Fondo de TU pareja en z = 0, fondo rival en z = COURT_LEN,
//       red en z = NET_Z. La cámara mira a lo largo de +z desde detrás de z = 0.
//
// La pelota se integra con Euler semi-implícito a paso fijo: velocidad real con
// gravedad y un drag suave. Los rebotes (suelo, cristal, red) invierten la
// componente de velocidad correspondiente, lo que hace que la regla distintiva del
// pádel —seguir en juego tras rebotar en el cristal— salga de forma natural.

// ─── Escala y geometría de la pista ──────────────────────────────────────────
export const M = 40; // píxeles por metro
export const COURT_W = 10 * M; // 400 — ancho reglamentario (10 m)
export const HALF_W = COURT_W / 2; // 200
export const COURT_LEN = 20 * M; // 800 — largo reglamentario (20 m)
export const NET_Z = COURT_LEN / 2; // 400 — red en el centro
export const NEAR_Z = 0; // línea de fondo de tu pareja
export const FAR_Z = COURT_LEN; // línea de fondo rival

// Líneas de saque a 3 m de cada fondo (la caja de saque llega hasta 7 m de la red).
export const SERVICE_LINE_NEAR = 3 * M; // z = 120
export const SERVICE_LINE_FAR = COURT_LEN - 3 * M; // z = 680

// Alturas de cerramiento. Cristal hasta 3 m; malla metálica por encima hasta 4 m.
export const NET_HEIGHT = 0.88 * M; // ~35
export const NET_POST_HEIGHT = 0.92 * M;
export const GLASS_HEIGHT = 3 * M; // 120 — tope del cristal
export const FENCE_HEIGHT = 4 * M; // 160 — tope de la valla metálica

// ─── Pelota ──────────────────────────────────────────────────────────────────
export const BALL_R = 5; // radio visual/colisión de la pelota
export const GRAVITY = 9.8 * M; // 392 px/s²
export const AIR_DRAG = 0.04; // arrastre suave por segundo (pelota de baja presión)
export const REST_FLOOR = 0.6; // restitución del suelo (pelota de baja presión)
export const REST_GLASS = 0.78; // restitución del cristal (vivo)
export const REST_NET = 0.25; // la red mata la pelota
export const NET_CLEARANCE = 12; // margen (px) con el que un golpe debe superar la cinta

// ─── Efecto (spin) ────────────────────────────────────────────────────────────
// spin > 0 = liftado (topspin): en vuelo baja antes (efecto Magnus) y tras botar
// pica hacia delante quedándose bajo. spin < 0 = cortado (backspin): en vuelo flota
// y aguanta, y tras botar frena y se sienta (bolas que mueren). 0 = plano.
export const SPIN_MAGNUS = 0.16; // fuerza vertical del Magnus por unidad de spin·velocidad
export const SPIN_AIR_DECAY = 0.35; // el efecto se disipa en el aire (por segundo)
export const FLOOR_REST_SPIN = 0.14; // el spin modula el rebote: liftado más bajo, cortado más alto
export const FLOOR_KICK = 0.4; // el spin cambia la velocidad de avance tras botar
export const SPIN_BOUNCE_KEEP = 0.45; // fracción de spin que sobrevive a un bote
export const GLASS_SPIN_KEEP = 0.6; // fracción de spin que sobrevive a un rebote de cristal

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);

// Estado de la pelota. `owner` es el último equipo que la golpeó ("home"|"away"),
// `floorBounces` los botes de suelo desde el último golpe (2 = punto perdido),
// `glassHits` cuántas paredes ha tocado desde el último bote de suelo (para el
// límite reglamentario de una sola pared antes de volver a botar), `phase` el
// estado del punto de vista físico.
export function createBall(overrides = {}) {
  return {
    x: 0,
    y: NET_HEIGHT,
    z: NEAR_Z + M,
    vx: 0,
    vy: 0,
    vz: 0,
    spin: 0, // + liftado / − cortado
    owner: null,
    floorBounces: 0,
    glassHits: 0,
    live: false,
    ...overrides,
  };
}

// ¿En qué mitad de la pista está la pelota? "near" = lado de tu pareja.
export function sideOfZ(z) {
  return z < NET_Z ? "near" : "far";
}
export const HALF_OF = { home: "near", away: "far" };
export const OTHER_TEAM = { home: "away", away: "home" };

// Avanza la pelota un paso de dt segundos. Puro: devuelve una pelota nueva con la
// gravedad y el drag aplicados. Las colisiones las resuelve el motor sobre el
// resultado (necesita saber posiciones de jugadores, red y paredes).
export function stepBall(ball, dt) {
  const drag = 1 - AIR_DRAG * dt;
  const spin = ball.spin || 0;
  // Magnus vertical: proporcional al efecto y a la velocidad horizontal. El
  // liftado (spin>0) añade caída; el cortado (spin<0) sostiene la bola.
  const horiz = Math.hypot(ball.vx, ball.vz);
  const aSpin = -SPIN_MAGNUS * spin * horiz;
  const vx = ball.vx * drag;
  const vz = ball.vz * drag;
  const vy = (ball.vy + (aSpin - GRAVITY) * dt) * drag;
  return {
    ...ball,
    x: ball.x + vx * dt,
    y: ball.y + vy * dt,
    z: ball.z + vz * dt,
    vx,
    vy,
    vz,
    spin: spin * (1 - SPIN_AIR_DECAY * dt),
  };
}

// Rebote en el suelo. Invierte y amortigua vy, cuenta el bote y resetea el
// contador de paredes (tras botar puede volver a tocar una pared). Devuelve una
// pelota nueva ya apoyada en el suelo.
export function bounceFloor(ball) {
  const spin = ball.spin || 0;
  // El liftado rebota más bajo y pica hacia delante; el cortado rebota más alto y
  // frena (con backspin fuerte casi se sienta), lo que hace que las dejadas mueran.
  const rest = clamp(REST_FLOOR - FLOOR_REST_SPIN * spin, 0.34, 0.95);
  const kick = clamp(1 + FLOOR_KICK * spin, 0.3, 1.6);
  return {
    ...ball,
    y: BALL_R,
    vy: Math.abs(ball.vy) * rest,
    vz: ball.vz * kick,
    vx: ball.vx * (0.7 + 0.3 * kick),
    spin: spin * SPIN_BOUNCE_KEEP,
    floorBounces: ball.floorBounces + 1,
    glassHits: 0,
  };
}

// Rebote en un plano de cristal. `axis` es "x" (paredes laterales) o "z" (fondos).
// Reposiciona la pelota justo dentro del plano e invierte esa componente.
export function bounceGlass(ball, axis, planeValue) {
  const next = { ...ball, glassHits: ball.glassHits + 1, spin: (ball.spin || 0) * GLASS_SPIN_KEEP };
  if (axis === "x") {
    next.x = planeValue - sign(ball.vx) * BALL_R;
    next.vx = -ball.vx * REST_GLASS;
  } else {
    next.z = planeValue - sign(ball.vz) * BALL_R;
    next.vz = -ball.vz * REST_GLASS;
  }
  return next;
}

// ¿La pelota cruza el plano de la red entre prev y next por debajo de su altura?
// Test de segmento para que una bola rápida no la atraviese.
export function crossesNet(prev, next) {
  const a = prev.z - NET_Z;
  const b = next.z - NET_Z;
  if (a === 0 && b === 0) return false;
  if (a > 0 === b > 0 && a !== 0 && b !== 0) return false;
  const t = a === b ? 0 : a / (a - b);
  const y = prev.y + (next.y - prev.y) * t;
  const x = prev.x + (next.x - prev.x) * t;
  return y >= 0 && y <= NET_HEIGHT && x >= -HALF_W && x <= HALF_W;
}

// Rebote muerto contra la red hacia el lado del que golpeó.
export function bounceNet(ball) {
  const toNear = ball.owner === "home";
  return {
    ...ball,
    z: NET_Z + (toNear ? -M * 0.5 : M * 0.5),
    vz: -ball.vz * REST_NET,
    vx: ball.vx * 0.4,
  };
}

// ─── Faltas / fin de punto ────────────────────────────────────────────────────
// Resultado de evaluar el estado tras el paso: null si sigue vivo, o
// { scorer, reason } con el equipo que gana el punto.
//
// Reglas modeladas:
//   - Doble bote en el suelo → punto para el equipo contrario al último botador.
//   - La bola golpea el cristal del lado receptor ANTES de botar en su suelo →
//     falta del que golpeó (owner pierde el punto).
//   - La bola toca la valla metálica (por encima del cristal) → out.
//   - La bola sale por encima del cerramiento → out del que golpeó.
export function evaluateFault(ball) {
  // Doble bote: el receptor no llegó → gana el equipo que golpeó por última vez.
  if (ball.floorBounces >= 2) {
    return { scorer: ball.owner ?? "home", reason: "double-bounce" };
  }
  return null;
}

// Distancia horizontal (plano x-z) entre dos puntos.
export function distXZ(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

// ─── Golpe: lanzar la pelota hacia un objetivo del suelo ──────────────────────
// Resuelve el proyectil para un tiempo de vuelo T: parte de la posición actual y
// aterriza en (targetX, targetZ) a ras de suelo. Puro.
function solveLaunch(ball, targetX, targetZ, T, team) {
  const vx = (targetX - ball.x) / T;
  const vz = (targetZ - ball.z) / T;
  // y(T) = 0  =>  vy = (0.5 g T² − y0) / T   (aterriza a ras de suelo)
  const vy = (0.5 * GRAVITY * T * T - ball.y) / T;
  return { ...ball, vx, vy, vz, owner: team, floorBounces: 0, glassHits: 0, live: true };
}

// Altura de la parábola (que aterriza en targetZ en tiempo T) al cruzar el plano de
// la red. Sirve para garantizar que el golpe supere la cinta.
function heightAtNet(ball, targetZ, T) {
  const vz = (targetZ - ball.z) / T;
  if (vz === 0) return Infinity;
  const tNet = (NET_Z - ball.z) / vz;
  if (tNet <= 0 || tNet >= T) return Infinity; // no cruza la red en este vuelo
  const vy = (0.5 * GRAVITY * T * T - ball.y) / T;
  return ball.y + vy * tNet - 0.5 * GRAVITY * tNet * tNet;
}

// Lanza hacia (targetX, targetZ) con un vuelo base `flight` que codifica el tipo de
// golpe (raso, globo, remate…). GARANTIZA que la bola supere la red: si la parábola
// que aterriza en el objetivo pasaría por debajo de la cinta al cruzarla, eleva el
// arco (aumenta el tiempo de vuelo) hasta despejarla. Así la IA y el jugador nunca
// estrellan un golpe válido contra la red por geometría. Puro.
export function launchToTarget(ball, { targetX, targetZ, flight, team, spin = 0 }) {
  const crossesNetPlane = (ball.z - NET_Z) * (targetZ - NET_Z) < 0;
  let T = Math.max(0.18, flight);
  // Un golpe liftado baja antes por el Magnus, así que exige más margen sobre la
  // cinta para que la elevación del arco lo compense y no lo estrelle en la red.
  const topspinPenalty = Math.max(0, spin) * 14;
  if (crossesNetPlane) {
    for (let i = 0; i < 12; i++) {
      if (heightAtNet(ball, targetZ, T) >= NET_HEIGHT + NET_CLEARANCE + topspinPenalty) break;
      T *= 1.13; // eleva el arco manteniendo el punto de caída
    }
  }
  const shot = solveLaunch(ball, targetX, targetZ, T, team);
  shot.spin = spin;
  return shot;
}

// Efecto característico de cada tipo de golpe (+ liftado / − cortado).
export const SHOT_SPIN = {
  drive: 0.62, // liftada: penetra y se queda baja
  reves: 0.28, // revés: plano con algo de liftado
  volea: -0.12, // volea: bloqueada, casi plana
  smash: 0.28, // remate: plano-liftado, potente
  bandeja: -0.45, // bandeja: cortada, controlada
  vibora: 0.2, // víbora: liftada con salida rápida
  lob: -0.5, // globo: cortado, flota y se sienta
  dejada: -0.85, // dejada: muy cortada, muere en la red
  serve: 0.08,
  defensive: -0.3, // devolución defensiva flotada
};

// Tiempo de vuelo por tipo de golpe. La ventana de timing del jugador modula el
// tipo efectivo, pero estos son los valores base que también usa la IA.
export const SHOT_FLIGHT = {
  drive: 0.62, // liftada: raso y directo con arco
  reves: 0.6, // revés: golpe plano de revés
  lob: 1.55, // globo alto y profundo: sobrevuela a los jugadores de red
  smash: 0.4, // remate picado y rápido
  vibora: 0.46, // víbora: remate liftado más plano y con salida
  bandeja: 0.74, // control, media altura
  volea: 0.5, // volea: rápida y plana, sin dejar botar
  dejada: 0.66, // dejada: suave, muere cerca de la red
  defensive: 1.05, // devolución defensiva: alta y flotada para ganar tiempo
  serve: 0.82, // saque por debajo
};

// Altura del bote de la sombra: escala visual de la pelota con la profundidad.
export function depthScaleForZ(z, camZ) {
  return 1 / Math.max(0.2, (z - camZ) / (NEAR_Z - camZ));
}

// ─── Proyección perspectiva pseudo-3D (pinhole, cámara broadcast) ─────────────
// Cámara elevada detrás de la línea de fondo de tu pareja, mirando a lo largo de
// +z. Los puntos lejanos (z mayor) se proyectan más pequeños y más arriba en
// pantalla, dando la vista broadcast del pádel. focal ∝ ancho para encuadrar la
// pista a cualquier tamaño; CAM_Y / CAM_Z calibran la proporción vertical.
export const CAM_X = 0;
export const CAM_Y = 290; // altura de cámara (~7,25 m)
export const CAM_Z = -560; // detrás del fondo cercano
const FOCAL_PER_WIDTH = 0.92;

// Fracción de la altura donde se ancla la línea de fondo cercana. Al fijarla,
// aumentar el zoom agranda la pista hacia arriba (usando el espacio de gradas) sin
// recortar a los jugadores del fondo cercano.
const NEAR_BASELINE_FRAC = 0.9;

export function createCamera(viewW, viewH) {
  // Zoom adaptativo: en pantallas estrechas (móvil) el focal ∝ ancho deja la pista
  // pequeña y lejana. Acercamos progresivamente al reducirse el ancho — 1x en
  // escritorio (≥760px) hasta ~1.3x en móvil — para que la pista llene más el cuadro.
  const zoom = clamp(1 + (760 - viewW) / 1100, 1, 1.3);
  const focal = FOCAL_PER_WIDTH * viewW * zoom;
  // Ancla el fondo cercano a NEAR_BASELINE_FRAC de la altura; el zoom sube el fondo
  // rival hacia las gradas y agranda la pista sin sacar de cuadro lo cercano.
  const cy = NEAR_BASELINE_FRAC * viewH - CAM_Y * (focal / (NEAR_Z - CAM_Z));
  return {
    viewW,
    viewH,
    camX: CAM_X,
    camY: CAM_Y,
    camZ: CAM_Z,
    focal,
    cx: viewW * 0.5,
    cy,
  };
}

// Proyecta un punto del mundo a pantalla. Devuelve { sx, sy, scale, visible }.
export function project3D(cam, x, y, z) {
  const dz = z - cam.camZ;
  if (dz <= 1) return { sx: 0, sy: 0, scale: 0, visible: false };
  const scale = cam.focal / dz;
  return {
    sx: cam.cx + (x - cam.camX) * scale,
    sy: cam.cy + (cam.camY - y) * scale,
    scale,
    visible: true,
  };
}
