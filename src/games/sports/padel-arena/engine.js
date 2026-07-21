// Pádel Pro Arena — runtime. Máquina de estados (menú → saque → peloteo → punto →
// over), bucle de paso fijo, entrada (teclado / teclas virtuales / joystick), y la
// integración de physics.js, ai.js, rules.js, scene.js y audio.js. Contrato igual
// que el resto de juegos 3D: { canvas, locale, onSnapshot, onFullscreen }, con
// start/destroy/advanceTime/pressVirtualKey/setVirtualKey.

import {
  createBall,
  stepBall,
  bounceFloor,
  bounceGlass,
  crossesNet,
  bounceNet,
  evaluateFault,
  launchToTarget,
  distXZ,
  createCamera,
  HALF_W,
  NET_Z,
  NEAR_Z,
  FAR_Z,
  BALL_R,
  GLASS_HEIGHT,
  FENCE_HEIGHT,
  NET_HEIGHT,
  SERVICE_LINE_NEAR,
  SERVICE_LINE_FAR,
  SHOT_FLIGHT,
  SHOT_SPIN,
  clamp,
  HALF_OF,
  OTHER_TEAM,
  sideOfZ,
} from "./physics.js";
import {
  createAiConfig,
  makeRng,
  desiredPosition,
  stepToward,
  chooseShot,
  predictLanding,
} from "./ai.js";
import { createMatchState, registerPoint, serveCourt, pointLabels } from "./rules.js";
import { drawWorld } from "./scene.js";
import { getCopy } from "./copy.js";
import PadelAudio from "./audio.js";

const DT = 1 / 60;
const DT_MS = 1000 / 60;

// Alcance de golpeo del jugador en el plano x-z y altura máxima de contacto.
const REACH_XZ = 58; // radio de golpeo (más generoso para interceptar y jugar la pared)
// Altura máxima de contacto realista (~2,8 m, con salto/pala extendida): por encima
// la bola SOBREVUELA al jugador — así los globos pasan por encima de la red en vez de
// ser interceptados en el aire, y pueden botar para jugarse.
const REACH_Y = NET_HEIGHT * 3.2;
const SMASH_Y = NET_HEIGHT * 2.2; // por encima de esto y cerca de red = remate
const VOLLEY_Y = NET_HEIGHT * 0.9; // bola en vuelo por encima de esto sin botar = volea
// Ventana de swing: al pulsar Golpear, el swing queda "armado" este tiempo y
// golpea la primera bola que entra en alcance. Da margen de timing.
const SWING_ARMED_MS = 190;
const SWING_ANIM_MS = 260;
const PLAYER_SPEED = 262;
const POINT_PAUSE_MS = 1200;
const SERVE_DELAY_MS = 700;

const AUDIO_KEY = "gamelock.padel-arena.audio";

// Teclas que golpean, cada una con el golpe elegido. F = volea (ataque natural: se
// convierte en remate/víbora si la bola llega alta a la red); G = revés; H = globo;
// J = dejada; Espacio también hace la volea/ataque. Las mismas intenciones las
// disparan los botones del deck móvil.
const SHOT_KEYS = {
  Space: "volea",
  KeyF: "volea",
  KeyG: "reves",
  KeyH: "globo",
  KeyJ: "dejada",
};

// ─── Carga de potencia ───────────────────────────────────────────────────────
// Mantener pulsado el golpe arma el swing y lo va cargando: al contactar con la
// bola, el tiempo acumulado decide cuánta potencia lleva. Es el mismo gesto en
// los tres sitios porque los tres acaban en keydown/keyup — teclado, botón en
// pantalla (pointerdown/up) y deck móvil (controles de tipo "hold").
//
// Un toque seco sigue dando exactamente el golpe de siempre: la potencia es
// aditiva desde cero, así que nada de lo que ya funcionaba cambia de sitio.
export const CHARGE_MAX_MS = 520;
// Techos de la carga completa. Más profundo y más rápido, pero también menos
// fino: pegar con todo abre el cono de colocación, así que la elección entre
// colocar y apretar es real y no "mantener siempre".
export const POWER_DEPTH_GAIN = 0.18; // hasta un 18% más al fondo
export const POWER_FLIGHT_GAIN = 0.16; // hasta un 16% menos de vuelo (más rápida)
export const POWER_SPREAD_PX = 26; // error lateral extra a plena potencia
// Golpes que no admiten potencia: la dejada es un golpe de toque —cargarla la
// contradice— y la devolución defensiva sale de un contacto malo que la fuerza
// no arregla.
const NO_POWER_KINDS = new Set(["dejada", "defensive"]);

function readAudioPref() {
  try {
    return window.localStorage.getItem(AUDIO_KEY) !== "off";
  } catch {
    return true;
  }
}
function writeAudioPref(enabled) {
  try {
    window.localStorage.setItem(AUDIO_KEY, enabled ? "on" : "off");
  } catch {
    /* preferencia no persistente */
  }
}

// Posiciones de reposo iniciales de las cuatro figuras.
function initialPlayers() {
  return [
    { id: 0, team: "home", column: -1, x: -HALF_W * 0.5, z: SERVICE_LINE_NEAR + 30, swing: 0, swingArmedMs: 0 },
    { id: 1, team: "home", column: 1, x: HALF_W * 0.5, z: SERVICE_LINE_NEAR + 30, swing: 0, swingArmedMs: 0 },
    { id: 2, team: "away", column: -1, x: -HALF_W * 0.5, z: SERVICE_LINE_FAR - 30, swing: 0, swingArmedMs: 0 },
    { id: 3, team: "away", column: 1, x: HALF_W * 0.5, z: SERVICE_LINE_FAR - 30, swing: 0, swingArmedMs: 0 },
  ];
}

export class PadelRuntime {
  constructor({ canvas, locale, onSnapshot, onFullscreen }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.locale = locale === "es" ? "es" : "en";
    this.copy = getCopy(this.locale);
    this.onSnapshot = onSnapshot;
    this.onFullscreen = onFullscreen;
    this.audio = new PadelAudio();
    this.audio.setEnabled(readAudioPref());

    this.screen = "menu"; // menu | serve | rally | point | over
    this.paused = false;
    this.difficulty = "medium";
    this.bestOf = 3;

    this.vW = canvas.clientWidth || 960;
    this.vH = canvas.clientHeight || 540;
    this.cam = createCamera(this.vW, this.vH);
    this.dpr = null;
    this.resizeObserver = null;

    this.rng = makeRng((Date.now() & 0xffffffff) >>> 0);
    this.aiConfig = createAiConfig(this.difficulty);
    this.match = createMatchState(this.bestOf, "home");

    this.players = initialPlayers();
    this.ball = createBall();
    this.activeIndex = 0; // qué jugador de tu pareja controlas
    this.serverIndex = 0;

    this.keys = {};
    this.hitBuffered = false; // Golpear pulsado y a la espera
    this.pendingShot = "volea"; // golpe elegido para el próximo contacto
    this.hitHeld = false; // botón/tecla de golpe mantenido ahora mismo
    this.hitChargeMs = 0; // tiempo acumulado de carga
    this.pointTimer = 0;
    this.serveTimer = 0;
    this.banner = "";
    this.lastHitterIndex = null;
    this.pointEnded = false;
    this.pointReason = null;
    this.ballHitId = 0; // cambia con cada golpe/saque; dispara la reacción de la IA

    this.running = false;
    this.raf = null;
    this.accumulator = 0;
    this.lastFrame = 0;

    this._onFrame = (ts) => this.frame(ts);
    this._onResize = () => this.handleResize();
    this._onKD = (e) => this.onKeyDown(e);
    this._onKU = (e) => this.onKeyUp(e);
  }

  // ─── Ciclo de vida ──────────────────────────────────────────────────────────
  // Sin `window` (SSR / entorno de test) el runtime arranca en modo headless: sin
  // listeners ni RAF, pero con estado, snapshot y advanceTime plenamente operativos.
  start() {
    this.running = true;
    this.handleResize();
    this.pushSnapshot();
    this.draw();
    if (typeof window === "undefined") return;
    window.addEventListener("resize", this._onResize);
    if (typeof ResizeObserver === "function") {
      this.resizeObserver = new ResizeObserver(this._onResize);
      this.resizeObserver.observe(this.canvas);
    }
    window.addEventListener("keydown", this._onKD);
    window.addEventListener("keyup", this._onKU);
    this.lastFrame = typeof performance !== "undefined" ? performance.now() : 0;
    if (typeof requestAnimationFrame === "function") {
      this.raf = requestAnimationFrame(this._onFrame);
    }
  }

  destroy() {
    this.running = false;
    if (this.raf && typeof cancelAnimationFrame === "function") cancelAnimationFrame(this.raf);
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", this._onResize);
      window.removeEventListener("keydown", this._onKD);
      window.removeEventListener("keyup", this._onKU);
    }
    if (this.resizeObserver) this.resizeObserver.disconnect();
    this.audio.dispose();
  }

  handleResize() {
    const canvas = this.canvas;
    const cssW = Math.max(320, Math.floor(canvas.clientWidth || 960));
    const cssH = Math.max(220, Math.floor(canvas.clientHeight || 540));
    const dpr = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
    if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr) || dpr !== this.dpr) {
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      this.dpr = dpr;
    }
    this.vW = cssW;
    this.vH = cssH;
    this.cam = createCamera(cssW, cssH);
    this.draw();
  }

  // ─── Menú / configuración ──────────────────────────────────────────────────
  setDifficulty(id) {
    if (!["easy", "medium", "hard"].includes(id)) return;
    this.difficulty = id;
    this.aiConfig = createAiConfig(id);
    this.pushSnapshot();
  }
  setFormat(n) {
    this.bestOf = Number(n) === 1 ? 1 : 3;
    this.pushSnapshot();
  }
  toggleAudio() {
    const enabled = !this.audio.getEnabled();
    this.audio.setEnabled(enabled);
    writeAudioPref(enabled);
    this.pushSnapshot();
  }

  startMatch() {
    this.match = createMatchState(this.bestOf, "home");
    this.players = initialPlayers();
    this.banner = "";
    this.beginServe();
  }

  // ─── Saque ──────────────────────────────────────────────────────────────────
  // Coloca a los CUATRO jugadores en la formación reglamentaria de saque: el
  // sacador tras su línea de saque en el cuadro correcto, su pareja en la red, el
  // restador en diagonal (profundo, para restar) y su pareja en la red del otro
  // lado. El restador humano queda como jugador activo cuando saca la CPU.
  beginServe() {
    this.screen = "serve";
    this.serveTimer = 0;
    this.hitBuffered = false;
    const court = serveCourt(this.match); // "right" | "left"
    const server = this.match.server;
    const homeSide = server === "home";

    // Signo lateral del cuadro de saque, visto por el sacador hacia la red.
    const sx = homeSide ? (court === "right" ? 1 : -1) : court === "right" ? -1 : 1;
    const serverX = sx * HALF_W * 0.5;
    const recvX = -serverX; // el resto es cruzado

    // Zonas en profundidad.
    const nearBackZ = SERVICE_LINE_NEAR * 0.5; // 60, tras la línea de saque cercana
    const farBackZ = FAR_Z - SERVICE_LINE_NEAR * 0.5; // 740
    const netNearZ = NET_Z - 62;
    const netFarZ = NET_Z + 62;
    const recvNearZ = SERVICE_LINE_NEAR - 22; // restador cercano, profundo
    const recvFarZ = FAR_Z - SERVICE_LINE_NEAR + 22; // restador lejano, profundo

    const homeArr = [this.players[0], this.players[1]];
    const awayArr = [this.players[2], this.players[3]];
    const serverArr = homeSide ? homeArr : awayArr;
    const recvArr = homeSide ? awayArr : homeArr;

    const serverPlayer = serverArr.find((pl) => pl.column === Math.sign(serverX)) ?? serverArr[0];
    const serverPartner = serverArr.find((pl) => pl !== serverPlayer);
    const recvPlayer = recvArr.find((pl) => pl.column === Math.sign(recvX)) ?? recvArr[0];
    const recvPartner = recvArr.find((pl) => pl !== recvPlayer);

    const set = (pl, x, z) => {
      pl.x = clamp(x, -HALF_W + 8, HALF_W - 8);
      pl.z = z;
      pl.swing = 0;
    };
    set(serverPlayer, serverX, homeSide ? nearBackZ : farBackZ);
    set(serverPartner, -serverX * 0.62, homeSide ? netNearZ : netFarZ);
    set(recvPlayer, recvX, homeSide ? recvFarZ : recvNearZ);
    set(recvPartner, -recvX * 0.62, homeSide ? netFarZ : netNearZ);

    this.serverIndex = this.players.indexOf(serverPlayer);
    // Controlas a quien saca (si sacas tú) o a quien resta (si saca la CPU).
    this.activeIndex = homeSide
      ? this.serverIndex
      : this.players.indexOf(recvPlayer);

    const srv = this.players[this.serverIndex];
    this.ball = createBall({ x: srv.x, y: NET_HEIGHT * 1.15, z: srv.z, live: false, owner: server });
    this.pushSnapshot();
  }

  // Ejecuta el saque cruzado por debajo hacia el cuadro diagonal.
  executeServe() {
    const server = this.match.server;
    const court = serveCourt(this.match);
    // Cuadro diagonal del receptor.
    const toFar = server === "home";
    const targetX = court === "right" ? -HALF_W * 0.5 : HALF_W * 0.5;
    const boxZ = toFar
      ? NET_Z + (SERVICE_LINE_FAR - NET_Z) * 0.7
      : NET_Z - (NET_Z - SERVICE_LINE_NEAR) * 0.7;
    this.ball = launchToTarget(this.ball, {
      targetX,
      targetZ: boxZ,
      flight: SHOT_FLIGHT.serve,
      team: server,
    });
    this.lastHitterIndex = this.serverIndex;
    this.ballHitId += 1;
    this.players[this.serverIndex].swing = SWING_ANIM_MS;
    this.audio.paddle();
    this.screen = "rally";
    this.pushSnapshot();
  }

  // ─── Entrada ────────────────────────────────────────────────────────────────
  onKeyDown(e) {
    const code = e.code;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(code)) {
      e.preventDefault();
    }
    if (code === "KeyP") return this.togglePause();
    if (code === "KeyR") return this.startMatch();
    if (code === "KeyM") return this.toggleAudio();
    if (code === "Enter" && (this.screen === "over" || this.screen === "menu")) {
      return this.startMatch();
    }
    // `repeat` son las repeticiones del sistema al mantener la tecla: llegan a
    // ~30/s y reiniciarían la carga en cada una.
    if (SHOT_KEYS[code]) {
      if (e.repeat) return;
      return this.onHitPress(SHOT_KEYS[code]);
    }
    this.keys[code] = true;
    // Alias WASD.
    if (code === "KeyA") this.keys.ArrowLeft = true;
    if (code === "KeyD") this.keys.ArrowRight = true;
    if (code === "KeyW") this.keys.ArrowUp = true;
    if (code === "KeyS") this.keys.ArrowDown = true;
  }
  onKeyUp(e) {
    const code = e.code;
    if (SHOT_KEYS[code]) this.onHitRelease(SHOT_KEYS[code]);
    this.keys[code] = false;
    if (code === "KeyA") this.keys.ArrowLeft = false;
    if (code === "KeyD") this.keys.ArrowRight = false;
    if (code === "KeyW") this.keys.ArrowUp = false;
    if (code === "KeyS") this.keys.ArrowDown = false;
  }

  // `intent` es el golpe elegido: "volea" | "reves" | "globo" | "dejada".
  onHitPress(intent = "volea") {
    if (this.screen === "serve") return this.executeServe();
    if (this.screen === "rally") {
      // Repetición de tecla mantenida: no reinicia la carga en curso.
      if (this.hitHeld && this.pendingShot === intent) return;
      this.pendingShot = intent;
      this.hitBuffered = true;
      this.hitHeld = true;
      this.hitChargeMs = 0;
      this.players[this.activeIndex].swingArmedMs = SWING_ARMED_MS;
      return;
    }
    if (this.screen === "over") return this.startMatch();
  }

  // Soltar no golpea: el golpe sale al contactar con la bola. Lo que hace es
  // congelar la carga y devolver el swing a su ventana normal, así que soltar
  // justo antes del contacto conecta igual, con la potencia acumulada.
  onHitRelease(intent = null) {
    if (!this.hitHeld) return;
    if (intent && this.pendingShot !== intent) return;
    this.hitHeld = false;
    if (this.screen === "rally") {
      const p = this.players[this.activeIndex];
      p.swingArmedMs = Math.max(p.swingArmedMs, SWING_ARMED_MS);
    }
  }

  // Potencia acumulada, 0..1. La lee el HUD para pintar la barra.
  chargeRatio() {
    return clamp(this.hitChargeMs / CHARGE_MAX_MS, 0, 1);
  }

  togglePause() {
    if (this.screen === "menu" || this.screen === "over") return;
    this.paused = !this.paused;
    this.pushSnapshot();
  }

  // Teclas virtuales del deck móvil.
  setVirtualKey(code, pressed) {
    this.keys[code] = Boolean(pressed);
  }
  pressVirtualKey(code) {
    if (SHOT_KEYS[code]) return this.onHitPress(SHOT_KEYS[code]);
    if (code === "KeyP") return this.togglePause();
    if (code === "KeyR") return this.startMatch();
    if (code === "Enter") return this.onHitPress();
  }
  // Los botones de golpe en pantalla sueltan por aquí, igual que el teclado por
  // keyup y el deck móvil por sus controles de tipo "hold".
  releaseVirtualKey(code) {
    if (SHOT_KEYS[code]) return this.onHitRelease(SHOT_KEYS[code]);
    if (code === "Enter") return this.onHitRelease();
  }

  // ─── Bucle ──────────────────────────────────────────────────────────────────
  frame(ts) {
    if (!this.running) return;
    const now = ts ?? performance.now();
    let delta = now - this.lastFrame;
    this.lastFrame = now;
    if (delta > 250) delta = 250;
    this.accumulator += delta;
    while (this.accumulator >= DT_MS) {
      this.update(DT);
      this.accumulator -= DT_MS;
    }
    this.draw();
    this.raf = requestAnimationFrame(this._onFrame);
  }

  // Avance manual determinista (para el puente móvil / tests).
  advanceTime(ms) {
    let remaining = ms;
    while (remaining >= DT_MS) {
      this.update(DT);
      remaining -= DT_MS;
    }
  }

  update(dt) {
    if (this.paused || this.screen === "menu" || this.screen === "over") return;

    // Animaciones de swing / ventana de golpeo.
    for (const p of this.players) {
      if (p.swing > 0) p.swing = Math.max(0, p.swing - dt * 1000);
      if (p.swingArmedMs > 0) p.swingArmedMs = Math.max(0, p.swingArmedMs - dt * 1000);
    }

    if (this.screen === "serve") {
      this.updateServe(dt);
      return;
    }
    if (this.screen === "point") {
      this.pointTimer -= dt * 1000;
      this.updatePlayers(dt, true);
      if (this.pointTimer <= 0) this.afterPoint();
      return;
    }
    if (this.screen === "rally") {
      this.updateActivePlayer(dt);
      this.updatePlayers(dt, false);
      this.updateBall(dt);
      this.updateActiveSelection();
    }
  }

  updateServe(dt) {
    // Los jugadores MANTIENEN la formación de saque (no se mueven a su posición de
    // IA). Solo la CPU lanza el saque tras un breve retardo.
    if (this.match.server === "away") {
      this.serveTimer += dt * 1000;
      if (this.serveTimer >= SERVE_DELAY_MS) this.executeServe();
    }
  }

  // Movimiento manual del jugador activo de tu pareja.
  updateActivePlayer(dt) {
    const p = this.players[this.activeIndex];
    if (p.team !== "home") return;
    let mx = 0;
    let mz = 0;
    if (this.keys.ArrowLeft) mx -= 1;
    if (this.keys.ArrowRight) mx += 1;
    if (this.keys.ArrowUp) mz += 1; // hacia la red (+z)
    if (this.keys.ArrowDown) mz -= 1;
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      p.x = clamp(p.x + (mx / len) * PLAYER_SPEED * dt, -HALF_W + 6, HALF_W - 6);
      p.z = clamp(p.z + (mz / len) * PLAYER_SPEED * dt, NEAR_Z + 6, NET_Z - 10);
    }
    // Mientras se mantiene pulsado, el swing sigue armado y cargando: estás
    // aguantando el golpe atrás, así que no se "cae" la ventana por esperar.
    if (this.hitHeld) {
      this.hitChargeMs = Math.min(CHARGE_MAX_MS, this.hitChargeMs + dt * 1000);
      p.swingArmedMs = Math.max(p.swingArmedMs, SWING_ARMED_MS);
    }

    // Golpeo del jugador: si el swing está armado, la bola está en alcance y no
    // es ya nuestra. La posesión es imprescindible desde que se mantiene pulsado
    // para cargar: tras golpear, la bola sigue unos frames dentro del alcance, y
    // sin esta guarda el swing re-armado la volvía a golpear frame tras frame
    // —hasta 60 veces por segundo—, apilando sonidos de pala y relanzando la
    // trayectoria. Es además la regla del pádel: no se golpea dos veces seguidas.
    if (p.swingArmedMs > 0 && this.ballReachableBy(p) && this.ball.owner !== p.team) {
      this.playerHit(this.activeIndex);
      this.hitBuffered = false;
    }
  }

  // Movimiento por IA de las tres figuras restantes + su golpeo.
  updatePlayers(dt, freeze) {
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      const isActiveHuman = i === this.activeIndex && p.team === "home" && this.screen === "rally";
      if (isActiveHuman) continue;

      // Reacción + error de lectura: al llegar un golpe nuevo hacia su lado, la IA
      // tarda `reactionMs` en ir a por él y lo lee con un error lateral. Mientras
      // reacciona sigue su objetivo previo, así una bola rápida o bien colocada le
      // gana la mano y el usuario puede rematar el punto.
      if (!freeze && this.ball.live && this.ballComingTo(p.team) && p.readHitId !== this.ballHitId) {
        p.readHitId = this.ballHitId;
        p.reactMs = this.aiConfig.reactionMs;
        p.readErrX = (this.rng() * 2 - 1) * this.aiConfig.readError;
      }

      let target;
      if (!freeze && (p.reactMs ?? 0) > 0) {
        p.reactMs -= dt * 1000;
        target = { x: p.commitX ?? p.x, z: p.commitZ ?? p.z }; // aún no persigue
      } else {
        const raw = desiredPosition(p, this.ball, this.aiConfig);
        target = { x: raw.x + (p.readErrX || 0), z: raw.z };
        p.commitX = target.x;
        p.commitZ = target.z;
      }

      const speed = p.team === "away" ? this.aiConfig.speed : this.aiConfig.speed * 0.92;
      const next = stepToward({ x: p.x, z: p.z }, target, freeze ? speed * 0.4 : speed, dt);
      p.x = clamp(next.x, -HALF_W + 6, HALF_W - 6);
      const zMin = p.team === "home" ? NEAR_Z + 6 : NET_Z + 10;
      const zMax = p.team === "home" ? NET_Z - 10 : FAR_Z - 6;
      p.z = clamp(next.z, zMin, zMax);

      // Golpeo de IA: si la bola viene a su lado, está en alcance y no es el sacador
      // esperando, golpea. Solo golpea si ha terminado de reaccionar.
      if (
        !freeze &&
        this.screen === "rally" &&
        (p.reactMs ?? 0) <= 0 &&
        this.ballReachableBy(p) &&
        this.ballComingTo(p.team)
      ) {
        if (this.ball.owner !== p.team) this.aiHit(i);
      }
    }
  }

  ballComingTo(team) {
    return HALF_OF[team] === "near" ? this.ball.vz < 0 : this.ball.vz > 0;
  }

  ballReachableBy(p) {
    if (!this.ball.live) return false;
    const onSide = sideOfZ(this.ball.z) === HALF_OF[p.team];
    if (!onSide) return false;
    if (this.ball.y > REACH_Y) return false;
    return distXZ(this.ball.x, this.ball.z, p.x, p.z) <= REACH_XZ;
  }

  // Hueco lateral más ancho entre los dos rivales (o junto a las bandas).
  openGapX(opponents) {
    const xs = opponents.map((o) => o.x).sort((a, b) => a - b);
    const gaps = [
      { x: (-HALF_W + xs[0]) / 2, w: xs[0] + HALF_W },
      { x: (xs[0] + xs[1]) / 2, w: xs[1] - xs[0] },
      { x: (xs[1] + HALF_W) / 2, w: HALF_W - xs[1] },
    ].sort((a, b) => b.w - a.w);
    return gaps[0].x;
  }

  // Calidad de contacto: 1 = golpe centrado y a buena altura; baja al estirarte o
  // llegar mal. Depende de lo cerca que esté la bola del jugador y de su altura.
  contactQuality(p, b) {
    const d = distXZ(b.x, b.z, p.x, p.z);
    const distQ = 1 - clamp(d / REACH_XZ, 0, 1);
    const ideal = NET_HEIGHT * 1.5; // altura de golpeo cómoda (cintura/pecho)
    const hQ = 1 - clamp(Math.abs(b.y - ideal) / (NET_HEIGHT * 3.2), 0, 0.65);
    return clamp(distQ * 0.68 + hQ * 0.32, 0.28, 1);
  }

  // El jugador golpea. El estado de la bola y tu dirección deciden el tipo:
  //   ↓ dejada · ↑ globo · bola alta en la red → remate/víbora · bola en vuelo → volea
  //   · media altura en la red → bandeja · por defecto liftada.
  // La calidad de contacto modula la profundidad, el efecto y el error; un contacto
  // pobre sale en devolución defensiva flotada.
  playerHit(index) {
    const p = this.players[index];
    const b = this.ball;
    const quality = this.contactQuality(p, b);
    let dirX = 0;
    if (this.keys.ArrowLeft) dirX -= 1;
    if (this.keys.ArrowRight) dirX += 1;

    const nearNet = p.z > NET_Z - 120;
    const notBounced = b.floorBounces === 0; // aún no botó en nuestro campo
    const veryHigh = b.y > SMASH_Y * 1.35;
    const highBall = b.y > SMASH_Y;

    // El golpe elegido por el usuario (botón/tecla) manda. "volea" es el ataque
    // natural: se resuelve según la bola (remate/víbora, volea, bandeja o liftada).
    const intent = this.pendingShot ?? "volea";
    let kind;
    let depth;
    if (intent === "globo") {
      kind = "lob";
      depth = 0.92;
    } else if (intent === "dejada") {
      kind = "dejada";
      depth = 0.16; // muere justo pasada la red
    } else if (intent === "reves") {
      kind = "reves"; // revés plano
      depth = 0.76;
    } else if (highBall && nearNet) {
      // Bola alta en la red: con dirección marcada → víbora; si no, remate.
      kind = veryHigh && dirX !== 0 ? "vibora" : "smash";
      depth = kind === "vibora" ? 0.6 : 0.5;
    } else if (notBounced && b.y > VOLLEY_Y) {
      kind = "volea";
      depth = 0.68;
    } else if (nearNet && b.y > NET_HEIGHT * 1.3) {
      kind = "bandeja"; // media altura en la red → bandeja de control, profunda
      depth = 0.82;
    } else {
      kind = "drive"; // liftada
      depth = 0.78;
    }

    // Un contacto pobre (te estiras o llegas mal) no permite atacar: sale flotada.
    if (quality < 0.45 && kind !== "lob" && kind !== "dejada") {
      kind = "defensive";
      depth = 0.7;
    }

    // Contactos peores acortan los golpes de ataque (cuesta pegar profundo estirado).
    if (kind !== "dejada" && kind !== "defensive") {
      depth = clamp(depth * (0.62 + 0.38 * quality), 0.14, 0.95);
    }

    // Potencia acumulada manteniendo pulsado. Suma sobre lo anterior: un toque
    // seco (power 0) da exactamente el golpe de siempre.
    const power = NO_POWER_KINDS.has(kind) ? 0 : this.chargeRatio();
    if (power > 0) {
      depth = clamp(depth * (1 + POWER_DEPTH_GAIN * power), 0.14, 0.97);
    }

    const opponents = this.players.filter((o) => o.team !== p.team);
    let targetX = dirX !== 0 ? dirX * HALF_W * 0.74 : this.openGapX(opponents);
    if (kind === "lob" || kind === "defensive") targetX *= 0.6;
    // Error de colocación por contacto pobre, más el que abre la propia fuerza.
    targetX += (this.rng() * 2 - 1) * (1 - quality) * 64;
    if (power > 0) targetX += (this.rng() * 2 - 1) * POWER_SPREAD_PX * power;
    targetX = clamp(targetX, -HALF_W + 12, HALF_W - 12);
    const targetZ = NET_Z + (FAR_Z - NET_Z) * depth;

    // Revés vs derecha (para la animación): forzado en el revés, o según de qué lado
    // llega la bola en el resto.
    const backhand = kind === "reves" ? true : Math.sign(b.x - p.x) === -1;

    // Más potencia = menos tiempo de vuelo: la bola llega antes.
    const flight = SHOT_FLIGHT[kind] * (1 - POWER_FLIGHT_GAIN * power);

    if (kind === "smash" || kind === "vibora") this.audio.smash();
    else this.audio.paddle();
    this.strike(
      index,
      { targetX, targetZ, flight, team: "home", spin: SHOT_SPIN[kind] },
      { kind, backhand },
    );
    // La carga se gasta en el golpe: para el siguiente hay que volver a cargar.
    this.hitChargeMs = 0;
  }

  aiHit(index) {
    const p = this.players[index];
    const opponents = this.players.filter((o) => o.team !== p.team).map((o) => ({ x: o.x, z: o.z }));
    // Fallo ocasional: devuelve a la red o fuera.
    if (this.rng() < this.aiConfig.faultChance) {
      const targetX = this.ball.x;
      const targetZ = p.team === "away" ? NET_Z - 12 : NET_Z + 12; // a la red → falta
      this.strike(index, { targetX, targetZ, flight: SHOT_FLIGHT.drive, team: p.team });
      this.audio.paddle();
      return;
    }
    const nearNet = p.team === "away" ? p.z < NET_Z + 120 : p.z > NET_Z - 120;
    const partner = this.players.find((o) => o.team === p.team && o !== p);
    const shot = chooseShot(this.aiConfig, this.rng, {
      hitter: { x: p.x, z: p.z },
      partner: partner ? { x: partner.x, z: partner.z } : null,
      ballY: this.ball.y,
      ballBounced: this.ball.floorBounces > 0,
      nearNet,
      hitterTeam: p.team,
      opponents,
    });
    if (shot.kind === "smash" || shot.kind === "vibora") this.audio.smash();
    else this.audio.paddle();
    this.strike(
      index,
      { targetX: shot.targetX, targetZ: shot.targetZ, flight: shot.flight, team: p.team, spin: shot.spin },
      { kind: shot.kind, backhand: Math.sign(this.ball.x - p.x) === (p.team === "home" ? -1 : 1) },
    );
  }

  strike(index, shot, meta = {}) {
    const p = this.players[index];
    this.ball = launchToTarget(this.ball, shot);
    this.lastHitterIndex = index;
    this.ballHitId += 1; // nuevo golpe → la IA debe reaccionar
    p.swing = SWING_ANIM_MS;
    p.swingArmedMs = 0;
    p.swingKind = meta.kind ?? "drive";
    p.backhand = Boolean(meta.backhand);
  }

  // ─── Física de la bola + resolución de colisiones y faltas ──────────────────
  updateBall(dt) {
    if (!this.ball.live) return;
    const prev = this.ball;
    let b = stepBall(this.ball, dt);

    // Red (test de segmento).
    if (crossesNet(prev, b)) {
      // Un tiro que no pasa la red: falta del que golpeó.
      this.audio.net();
      this.ball = bounceNet(b);
      return this.endPoint(OTHER_TEAM[b.owner ?? "home"], "net");
    }

    // Suelo.
    if (b.y <= BALL_R && b.vy < 0) {
      b = bounceFloor(b);
      this.audio.floor();
    }

    // Paredes de cristal (laterales y fondos) — reflejan si es juego válido.
    b = this.resolveWalls(b, prev);
    if (this.pointEnded) {
      this.pointEnded = false;
      return;
    }

    this.ball = b;

    // Doble bote.
    const fault = evaluateFault(b);
    if (fault) return this.endPoint(fault.scorer, fault.reason);
  }

  // Resuelve contactos con cristal/valla. Devuelve la bola (posiblemente reflejada).
  // Marca this.pointEnded si el contacto termina el punto.
  resolveWalls(b, prev) {
    const owner = b.owner ?? "home";
    const receiver = OTHER_TEAM[owner];
    // Lateral izquierdo/derecho.
    for (const wallX of [-HALF_W, HALF_W]) {
      const crossed = (wallX < 0 && b.x <= wallX) || (wallX > 0 && b.x >= wallX);
      if (!crossed) continue;
      if (b.y > FENCE_HEIGHT) {
        this.endPoint(receiver, "out-side");
        this.pointEnded = true;
        return b;
      }
      if (b.y > GLASS_HEIGHT) {
        // Valla metálica → out del que golpeó.
        this.endPoint(receiver, "fence-side");
        this.pointEnded = true;
        return b;
      }
      // Cristal: válido solo si ya botó en el suelo del lado receptor.
      if (b.floorBounces >= 1) {
        this.audio.glass();
        return bounceGlass(b, "x", wallX);
      }
      // Directo a la pared sin botar → falta del que golpeó.
      this.audio.glass();
      this.endPoint(receiver, "wall-direct-side");
      this.pointEnded = true;
      return b;
    }

    // Fondos (near / far).
    const backWalls = [
      { z: NEAR_Z, side: "near" },
      { z: FAR_Z, side: "far" },
    ];
    for (const w of backWalls) {
      const crossed = w.side === "near" ? b.z <= w.z : b.z >= w.z;
      if (!crossed) continue;
      const wallIsReceiver = HALF_OF[receiver] === w.side;
      if (b.y > FENCE_HEIGHT) {
        this.endPoint(wallIsReceiver ? owner : receiver, "out-back");
        this.pointEnded = true;
        return b;
      }
      if (b.y > GLASS_HEIGHT) {
        this.endPoint(wallIsReceiver ? owner : receiver, "fence-back");
        this.pointEnded = true;
        return b;
      }
      if (b.floorBounces >= 1) {
        this.audio.glass();
        return bounceGlass(b, "z", w.z);
      }
      // Sin bote previo: si es la pared del receptor, es falta del que golpeó
      // (la clavó en el cristal); si es su propia pared, falta suya.
      this.audio.glass();
      this.endPoint(wallIsReceiver ? owner : receiver, "wall-direct-back");
      this.pointEnded = true;
      return b;
    }
    return b;
  }

  // ─── Fin de punto y avance del marcador ─────────────────────────────────────
  endPoint(scorer, reason) {
    if (this.screen !== "rally") return;
    this.pointReason = reason;
    this.ball = { ...this.ball, live: false };
    const before = this.match;
    this.match = registerPoint(before, scorer);
    const forYou = scorer === "home";
    // Indica claramente a qué equipo va, y si además cerró juego o set.
    const setClosed = this.match.setNumber > before.setNumber;
    const gameClosed =
      setClosed ||
      this.match.homeGames + this.match.awayGames !== before.homeGames + before.awayGames;
    // El público aplaude el punto, sin más. El partido lleva además el silbato
    // del árbitro.
    this.audio.clap();
    if (this.match.over) {
      this.audio.whistle();
      this.screen = "over";
      this.banner = this.match.matchWinner === "home" ? this.copy.matchWon : this.copy.matchLost;
    } else {
      this.screen = "point";
      this.pointTimer = POINT_PAUSE_MS;
      if (setClosed) this.banner = forYou ? this.copy.setWon : this.copy.setLost;
      else if (gameClosed) this.banner = forYou ? this.copy.gameWon : this.copy.gameLost;
      else this.banner = forYou ? this.copy.pointForYou : this.copy.pointForCpu;
    }
    // El equipo del punto para colorear el banner en el marcador.
    this.pointFor = forYou ? "home" : "away";
    this.pushSnapshot();
  }

  afterPoint() {
    this.banner = "";
    this.pointFor = null;
    this.beginServe();
  }

  // Auto-conmuta el jugador activo al de tu pareja más cercano al bote previsto.
  updateActiveSelection() {
    if (!this.ball.live) return;
    if (!this.ballComingTo("home")) return;
    const landing = predictLanding(this.ball);
    if (landing.z >= NET_Z) return; // aún en campo rival
    const homeIdx = [0, 1];
    let best = this.activeIndex;
    let bestDist = Infinity;
    for (const i of homeIdx) {
      const p = this.players[i];
      const d = Math.abs(p.x - landing.x) + Math.abs(p.z - landing.z) * 0.4;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    this.activeIndex = best;
  }

  // ─── Snapshot / render ──────────────────────────────────────────────────────
  pushSnapshot() {
    if (!this.onSnapshot) return;
    const labels = pointLabels(this.match);
    this.onSnapshot({
      screen: this.screen,
      paused: this.paused,
      difficulty: this.difficulty,
      bestOf: this.bestOf,
      audioEnabled: this.audio.getEnabled(),
      server: this.match.server,
      tieBreak: this.match.tieBreak,
      points: labels,
      games: { home: this.match.homeGames, away: this.match.awayGames },
      sets: { home: this.match.homeSets, away: this.match.awaySets },
      setNumber: this.match.setNumber,
      banner: this.banner,
      charge: this.chargeRatio(),
      charging: this.hitHeld,
    });
  }

  draw() {
    drawWorld(this.ctx, this.cam, {
      dpr: this.dpr || 1,
      vW: this.vW,
      vH: this.vH,
      screen: this.screen,
      paused: this.paused,
      players: this.players,
      activeIndex: this.activeIndex,
      ball: this.ball,
      match: this.match,
      banner: this.banner,
      bannerTeam: this.pointFor,
      copy: this.copy,
      charge: this.chargeRatio(),
      charging: this.hitHeld,
    });
  }
}
