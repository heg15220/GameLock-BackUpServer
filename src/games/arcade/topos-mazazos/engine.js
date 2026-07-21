// Topos a Mazazos — runtime. Máquina de estados (menú → cuenta atrás → juego → fin),
// bucle de paso fijo, entrada (teclado / teclas virtuales / joystick), spawner de
// topos, martillazo de área, IA de rivales y marcador. Contrato como el resto de
// juegos: { canvas, locale, onSnapshot, onFullscreen } con start/destroy/advanceTime/
// pressVirtualKey/setVirtualKey. Headless-safe (arranca sin window en tests).

import {
  createHoles,
  createMole,
  stepMole,
  isWhackable,
  moleValue,
  pickMoleType,
  makeRng,
  distXZ,
  clamp,
  RISE_MS,
  FALL_MS,
  POP_HEIGHT,
  ARENA_HALF_X,
  ARENA_NEAR_Z,
  ARENA_FAR_Z,
} from "./moles.js";
import { createAiConfig, chooseTargetHole, stepToward } from "./ai.js";
import { drawWorld } from "./scene.js";
import { getCopy } from "./copy.js";
import createToposAudio, { readStoredToposMuted } from "./audio.js";

const DT = 1 / 60;
const DT_MS = 1000 / 60;

const ROUND_MS = 30000; // 30 s por ronda
const COUNTDOWN_MS = 3000; // 3-2-1
const PLAYER_SPEED = 186;
const WHACK_RADIUS = 66; // radio del martillazo de área
const WHACK_COOLDOWN_MS = 240;
const WHACK_ANIM_MS = 200;
const BOMB_STUN_MS = 900;
const BOMB_PENALTY = -2;
const MARGIN = 26;
const BARREL_R = 30;

// Colores de equipo: 0 = jugador (cálido), 1-3 = rivales.
export const TEAM_COLORS = ["#ff8a3d", "#4aa3ff", "#37d67a", "#c77dff"];

// Barriles fijos, colocados entre agujeros para estorbar sin taparlos.
const BARRELS = [
  { x: 0, z: 132 },
  { x: -128, z: 250 },
  { x: 128, z: 250 },
];

// El sonido es accesorio: un fallo suyo no puede tumbar la partida. El navegador
// puede negarse a crear un AudioContext (Chrome limita cuántos hay por página),
// y sin esta red una excepción en `unlock()` dejaba `startMatch()` a medias: el
// motor cambiaba de pantalla pero nunca notificaba a React, así que el botón de
// empezar parecía muerto. Envolvemos toda la superficie de audio.
function safeAudio(audio) {
  const noop = () => {};
  const guard = (fn, fallback) => (...args) => {
    try {
      return fn(...args);
    } catch {
      return fallback;
    }
  };
  return {
    unlock: guard(audio.unlock?.bind(audio) ?? noop),
    playHit: guard(audio.playHit?.bind(audio) ?? noop),
    playGold: guard(audio.playGold?.bind(audio) ?? noop),
    playBomb: guard(audio.playBomb?.bind(audio) ?? noop),
    playSwing: guard(audio.playSwing?.bind(audio) ?? noop),
    playEnd: guard(audio.playEnd?.bind(audio) ?? noop),
    isMuted: guard(audio.isMuted?.bind(audio) ?? (() => false), false),
    toggleMuted: guard(audio.toggleMuted?.bind(audio) ?? (() => false), false),
    dispose: guard(audio.dispose?.bind(audio) ?? noop),
  };
}

function initialMascots() {
  return [
    { id: 0, team: 0, x: 0, z: ARENA_NEAR_Z + 60, fx: 0, fz: 1, score: 0, whack: 0, stun: 0, cool: 0 },
    { id: 1, team: 1, x: -150, z: ARENA_FAR_Z - 60, fx: 0, fz: -1, score: 0, whack: 0, stun: 0, cool: 0, react: 0, target: -1 },
    { id: 2, team: 2, x: 150, z: ARENA_FAR_Z - 60, fx: 0, fz: -1, score: 0, whack: 0, stun: 0, cool: 0, react: 0, target: -1 },
    { id: 3, team: 3, x: 0, z: ARENA_FAR_Z - 20, fx: 0, fz: -1, score: 0, whack: 0, stun: 0, cool: 0, react: 0, target: -1 },
  ];
}

export class ToposRuntime {
  constructor({ canvas, locale, onSnapshot, onFullscreen, audio }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.locale = locale === "es" ? "es" : "en";
    this.copy = getCopy(this.locale);
    this.onSnapshot = onSnapshot;
    this.onFullscreen = onFullscreen;
    this.audio = safeAudio(audio ?? createToposAudio(readStoredToposMuted()));

    this.screen = "menu"; // menu | countdown | play | over
    this.paused = false;
    this.difficulty = "medium";

    this.vW = canvas.clientWidth || 960;
    this.vH = canvas.clientHeight || 540;
    this.dpr = null;
    this.resizeObserver = null;

    this.rng = makeRng((Date.now() & 0xffffffff) >>> 0);
    this.aiConfig = createAiConfig(this.difficulty);
    this.holes = createHoles();
    this.barrels = BARRELS.map((b) => ({ ...b }));
    this.mascots = initialMascots();

    this.timeLeft = ROUND_MS;
    this.countdown = COUNTDOWN_MS;
    this.spawnTimer = 0;
    this.banner = "";
    this.best = this._readBest();

    this.keys = {};
    this.whackBuffered = false;

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
    if (typeof requestAnimationFrame === "function") this.raf = requestAnimationFrame(this._onFrame);
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
    this.draw();
  }

  _readBest() {
    try {
      return Number(window.localStorage.getItem("gamelock.topos-mazazos.best")) || 0;
    } catch {
      return 0;
    }
  }
  _writeBest(v) {
    try {
      window.localStorage.setItem("gamelock.topos-mazazos.best", String(v));
    } catch {
      /* no persiste */
    }
  }

  // ─── Menú / configuración ──────────────────────────────────────────────────
  setDifficulty(id) {
    if (!["easy", "medium", "hard"].includes(id)) return;
    this.difficulty = id;
    this.aiConfig = createAiConfig(id);
    this.pushSnapshot();
  }
  toggleAudio() {
    this.audio.toggleMuted();
    this.pushSnapshot();
  }

  startMatch() {
    this.holes = createHoles();
    this.mascots = initialMascots();
    this.timeLeft = ROUND_MS;
    this.countdown = COUNTDOWN_MS;
    this.spawnTimer = 0;
    this.banner = "";
    this.screen = "countdown";
    // Avisamos a la UI antes de tocar el audio: el cambio de pantalla no puede
    // quedar colgando de que el navegador nos deje abrir un AudioContext.
    this.pushSnapshot();
    this.audio.unlock();
  }

  // ─── Entrada ────────────────────────────────────────────────────────────────
  onKeyDown(e) {
    const code = e.code;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(code)) e.preventDefault();
    if (code === "KeyP") return this.togglePause();
    if (code === "KeyR") return this.startMatch();
    if (code === "KeyF") return this.onFullscreen?.();
    if (code === "KeyM") return this.toggleAudio();
    if (code === "Space" || code === "Enter") return this.onAction();
    this.keys[code] = true;
    if (code === "KeyA") this.keys.ArrowLeft = true;
    if (code === "KeyD") this.keys.ArrowRight = true;
    if (code === "KeyW") this.keys.ArrowUp = true;
    if (code === "KeyS") this.keys.ArrowDown = true;
  }
  onKeyUp(e) {
    const code = e.code;
    this.keys[code] = false;
    if (code === "KeyA") this.keys.ArrowLeft = false;
    if (code === "KeyD") this.keys.ArrowRight = false;
    if (code === "KeyW") this.keys.ArrowUp = false;
    if (code === "KeyS") this.keys.ArrowDown = false;
  }

  onAction() {
    if (this.screen === "menu" || this.screen === "over") return this.startMatch();
    if (this.screen === "play") this.whackBuffered = true;
  }

  togglePause() {
    if (this.screen !== "play" && this.screen !== "countdown") return;
    this.paused = !this.paused;
    this.pushSnapshot();
  }

  setVirtualKey(code, pressed) {
    this.keys[code] = Boolean(pressed);
  }
  pressVirtualKey(code) {
    if (code === "Space" || code === "Enter") return this.onAction();
    if (code === "KeyP") return this.togglePause();
    if (code === "KeyR") return this.startMatch();
  }

  // ─── Bucle ──────────────────────────────────────────────────────────────────
  frame(ts) {
    if (!this.running) return;
    const now = ts ?? (typeof performance !== "undefined" ? performance.now() : 0);
    let delta = now - this.lastFrame;
    this.lastFrame = now;
    if (delta > 250) delta = 250;
    this.accumulator += delta;
    while (this.accumulator >= DT_MS) {
      this.update(DT);
      this.accumulator -= DT_MS;
    }
    this.draw();
    if (typeof requestAnimationFrame === "function") this.raf = requestAnimationFrame(this._onFrame);
  }

  advanceTime(ms) {
    let remaining = ms;
    while (remaining >= DT_MS) {
      this.update(DT);
      remaining -= DT_MS;
    }
  }

  update(dt) {
    if (this.paused || this.screen === "menu" || this.screen === "over") return;

    for (const m of this.mascots) {
      if (m.whack > 0) m.whack = Math.max(0, m.whack - dt * 1000);
      if (m.stun > 0) m.stun = Math.max(0, m.stun - dt * 1000);
      if (m.cool > 0) m.cool = Math.max(0, m.cool - dt * 1000);
    }

    if (this.screen === "countdown") {
      this.countdown -= dt * 1000;
      if (this.countdown <= 0) {
        this.screen = "play";
        this.pushSnapshot();
      }
      return;
    }

    // screen === "play"
    this.timeLeft -= dt * 1000;
    this.stepMoles(dt);
    this.spawnMoles(dt);
    this.updatePlayer(dt);
    this.updateAI(dt);

    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.endRound();
    }
    this.pushSnapshot();
  }

  stepMoles(dt) {
    for (const h of this.holes) {
      if (h.mole) {
        const next = stepMole(h.mole, dt);
        h.mole = next;
      }
    }
  }

  spawnMoles(dt) {
    this.spawnTimer -= dt * 1000;
    const active = this.holes.filter((h) => h.mole).length;
    // Más presión conforme avanza la ronda: más topos a la vez y más seguidos.
    const progress = 1 - this.timeLeft / ROUND_MS;
    const maxActive = 4 + Math.round(progress * 3); // 4 → 7
    const interval = 620 - progress * 300; // 620 → 320 ms
    if (this.spawnTimer <= 0 && active < maxActive) {
      const empties = [];
      for (let i = 0; i < this.holes.length; i += 1) if (!this.holes[i].mole) empties.push(i);
      if (empties.length) {
        const idx = empties[Math.floor(this.rng() * empties.length)];
        const type = pickMoleType(this.rng, 1 + progress * 0.6);
        const upMs = 1100 - progress * 500 + this.rng() * 300; // más rápidos al final
        this.holes[idx].mole = createMole(type, Math.max(420, upMs));
      }
      this.spawnTimer = interval;
    }
  }

  // Colisión con barriles y límites de la arena. Devuelve la posición corregida.
  resolveMove(x, z) {
    let nx = clamp(x, -ARENA_HALF_X + MARGIN, ARENA_HALF_X - MARGIN);
    let nz = clamp(z, ARENA_NEAR_Z + MARGIN, ARENA_FAR_Z - MARGIN);
    for (const b of this.barrels) {
      const d = distXZ(nx, nz, b.x, b.z);
      const min = BARREL_R + 12;
      if (d < min && d > 0.001) {
        nx = b.x + ((nx - b.x) / d) * min;
        nz = b.z + ((nz - b.z) / d) * min;
      }
    }
    return { x: nx, z: nz };
  }

  updatePlayer(dt) {
    const p = this.mascots[0];
    if (p.stun <= 0) {
      let mx = 0;
      let mz = 0;
      if (this.keys.ArrowLeft) mx -= 1;
      if (this.keys.ArrowRight) mx += 1;
      if (this.keys.ArrowUp) mz += 1;
      if (this.keys.ArrowDown) mz -= 1;
      const len = Math.hypot(mx, mz);
      if (len > 0) {
        p.fx = mx / len;
        p.fz = mz / len;
        const moved = this.resolveMove(p.x + (mx / len) * PLAYER_SPEED * dt, p.z + (mz / len) * PLAYER_SPEED * dt);
        p.x = moved.x;
        p.z = moved.z;
      }
      if (this.whackBuffered && p.cool <= 0) this.doWhack(0);
    }
    this.whackBuffered = false;
  }

  updateAI(dt) {
    for (let i = 1; i < this.mascots.length; i += 1) {
      const m = this.mascots[i];
      if (m.stun > 0) continue;
      m.react = (m.react ?? 0) - dt * 1000;
      // Reelegir objetivo cuando toca reaccionar o si el objetivo ya no es válido.
      const cur = m.target >= 0 ? this.holes[m.target] : null;
      if (m.react <= 0 || !cur || !isWhackable(cur.mole) || cur.mole.type === "bomb") {
        m.target = chooseTargetHole(m, this.holes, this.aiConfig, this.rng);
        m.react = this.aiConfig.reactionMs;
        m.errX = (this.rng() * 2 - 1) * this.aiConfig.targetError;
        m.errZ = (this.rng() * 2 - 1) * this.aiConfig.targetError;
      }
      let target;
      if (m.target >= 0) {
        const h = this.holes[m.target];
        target = { x: h.x + (m.errX || 0), z: h.z + (m.errZ || 0) };
      } else {
        target = { x: m.x, z: m.z }; // sin objetivo: espera
      }
      const dx = target.x - m.x;
      const dz = target.z - m.z;
      if (Math.hypot(dx, dz) > 1) {
        const l = Math.hypot(dx, dz);
        m.fx = dx / l;
        m.fz = dz / l;
      }
      const next = stepToward({ x: m.x, z: m.z }, target, this.aiConfig.speed, dt);
      const moved = this.resolveMove(next.x, next.z);
      m.x = moved.x;
      m.z = moved.z;

      // Golpea si tiene un topo golpeable en su radio y no está en cooldown.
      if (m.cool <= 0 && this.hasWhackableNear(m)) this.doWhack(i);
    }
  }

  hasWhackableNear(m) {
    for (const h of this.holes) {
      if (isWhackable(h.mole) && h.mole.type !== "bomb" && distXZ(m.x, m.z, h.x, h.z) <= WHACK_RADIUS) return true;
    }
    return false;
  }

  // Martillazo de área: golpea todos los topos golpeables en el radio del mascota.
  doWhack(index) {
    const m = this.mascots[index];
    m.whack = WHACK_ANIM_MS;
    m.cool = WHACK_COOLDOWN_MS;
    let gained = 0;
    let hitBomb = false;
    let hitGold = false;
    for (const h of this.holes) {
      if (!isWhackable(h.mole)) continue;
      if (distXZ(m.x, m.z, h.x, h.z) > WHACK_RADIUS) continue;
      const type = h.mole.type;
      // Lo mandamos a la bajada (no lo borramos de golpe): así se ve hundirse y
      // da tiempo al destello de impacto. Entramos a la altura actual para que
      // no pegue un salto si aún estaba subiendo. `whacked` ya lo excluye de
      // isWhackable, así que no se puede volver a golpear.
      const ft = FALL_MS * (1 - clamp(h.mole.y / POP_HEIGHT, 0, 1));
      h.mole = { ...h.mole, whacked: true, phase: "falling", t: RISE_MS + h.mole.upMs + ft };
      if (type === "bomb") {
        gained += BOMB_PENALTY;
        hitBomb = true;
      } else {
        gained += moleValue(type);
        if (type === "gold") hitGold = true;
      }
    }
    if (gained !== 0 || hitBomb) {
      m.score = Math.max(0, m.score + gained);
      if (hitBomb) {
        m.stun = BOMB_STUN_MS;
        this.audio.playBomb();
      } else if (hitGold) {
        this.audio.playGold();
      } else {
        this.audio.playHit();
      }
    } else {
      this.audio.playSwing(); // fallo: mazazo al aire
    }
  }

  endRound() {
    this.screen = "over";
    const p = this.mascots[0];
    if (p.score > this.best) {
      this.best = p.score;
      this._writeBest(this.best);
    }
    const ranking = [...this.mascots].sort((a, b) => b.score - a.score);
    const won = ranking[0].id === 0;
    this.banner = won ? this.copy.youWin : this.copy.youLose;
    this.audio.playEnd(won);
    this.pushSnapshot();
  }

  // ─── Snapshot / render ──────────────────────────────────────────────────────
  ranking() {
    return [...this.mascots]
      .map((m) => ({ id: m.id, team: m.team, score: m.score }))
      .sort((a, b) => b.score - a.score);
  }

  pushSnapshot() {
    if (!this.onSnapshot) return;
    this.onSnapshot({
      screen: this.screen,
      paused: this.paused,
      difficulty: this.difficulty,
      audioEnabled: !this.audio.isMuted(),
      timeLeft: Math.ceil(this.timeLeft / 1000),
      countdown: Math.ceil(this.countdown / 1000),
      scores: this.mascots.map((m) => m.score),
      playerScore: this.mascots[0].score,
      best: this.best,
      ranking: this.ranking(),
      banner: this.banner,
    });
  }

  draw() {
    drawWorld(this.ctx, {
      dpr: this.dpr || 1,
      vW: this.vW,
      vH: this.vH,
      screen: this.screen,
      paused: this.paused,
      holes: this.holes,
      barrels: this.barrels,
      mascots: this.mascots,
      teamColors: TEAM_COLORS,
      whackRadius: WHACK_RADIUS,
      timeLeft: this.timeLeft,
      countdown: this.countdown,
      banner: this.banner,
      ranking: this.ranking(),
      copy: this.copy,
    });
  }
}
