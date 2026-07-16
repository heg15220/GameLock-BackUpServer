// Ping Pong Arena runtime. State machine (menu → serve → rally → point → over),
// fixed-step physics loop, input (finger / mouse / keyboard / virtual keys), and the
// integration of physics.js, ai.js, rules.js and scene.js. Mirrors the basketball-court
// runtime contract: { canvas, locale, onSnapshot, onFullscreen }, start/destroy,
// advanceTime, setVirtualKey, pressVirtualKey.

import {
  createBall,
  stepBall,
  crossesNet,
  bounceBackFromNet,
  hitBall,
  serveBallShot,
  checkBatCollision,
  ballOut,
  createCamera,
  unproject,
  clamp,
  BOARD_HALF_WIDTH,
  BOARD_Z,
  BOARD_END,
  BOARD_HALF_LENGTH,
  NET_Z,
  TABLE_TOP_Y,
  PLAYER_Z,
  OPPONENT_Z,
  BAT_REST_Y,
  BAT_HALF_WIDTH,
  BOUNDARY_PADDING,
  MAX_MOVE_VELOCITY,
  VELOCITY,
} from "./physics.js";
import {
  createOpponent,
  createGlide,
  stepGlide,
  makeRng,
  planReturn,
  predictDestination,
  recoveryTarget,
  serveX,
} from "./ai.js";
import {
  createMatchState,
  registerPoint,
  serverFor,
  OTHER,
} from "./rules.js";
import { drawWorld, PALETTE } from "./scene.js";
import { getCopy } from "./copy.js";
import PingPongAudio from "./audio.js";

// The reference caps its loop at 60fps and advances the ball by exactly one
// TIME step per frame. Its whole feel is calibrated to that pairing, so the
// simulation runs at 60Hz here too rather than our old 180Hz sub-stepping.
const DT = 1 / 60;
const DT_MS = 1000 / 60;

// Bat travel limits, mirroring User.fitToCourt().
const BAT_MIN_X = -BOARD_HALF_WIDTH - BOUNDARY_PADDING;
const BAT_MAX_X = BOARD_HALF_WIDTH + BOUNDARY_PADDING;
const BAT_MIN_Z = 0;
const BAT_MAX_Z = BOARD_Z + BOARD_HALF_LENGTH;

const OPP_REACH_X = BAT_HALF_WIDTH;

// How far above the reported contact point a finger is actually aiming, in CSS
// pixels. A physical quantity — the size of a fingertip — so it is a constant,
// not a fraction of the canvas.
const TOUCH_LIFT_PX = 24;

const AUDIO_KEY = "gamelock.ping-pong-arena.audio";

const halfOf = (z) => (z < NET_Z ? "near" : "far");
const HALF_OF = { player: "near", opponent: "far" };

// Sound is on unless the player has turned it off before. Storage can throw
// (private mode, blocked store), and a missing preference must not cost anyone
// the game — fall back to on.
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
    // Preference just won't survive the reload.
  }
}

export class PingPongRuntime {
  constructor({ canvas, locale, onSnapshot, onFullscreen }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.locale = locale === "es" ? "es" : "en";
    this.copy = getCopy(this.locale);
    this.onSnapshot = onSnapshot;
    this.onFullscreen = onFullscreen;
    this.audio = new PingPongAudio();
    this.audio.setEnabled(readAudioPref());

    this.screen = "menu"; // menu | serve | rally | point | over
    this.paused = false;
    this.difficulty = "medium";
    this.bestOf = 3;

    this.vW = canvas.clientWidth || 960;
    this.vH = canvas.clientHeight || 540;
    this.cam = createCamera(this.vW, this.vH);

    this.rng = makeRng((Date.now() & 0xffffffff) >>> 0);
    this.match = createMatchState(this.bestOf, "player");
    this.opp = createOpponent(this.difficulty);

    this.ball = createBall();
    // Both bats live on the same horizontal plane at BAT_REST_Y and move in
    // x/z, exactly as the reference's Player does. Depth (z) is the swing.
    this.playerBat = { x: 0, y: BAT_REST_Y, z: PLAYER_Z, prevX: 0, prevZ: PLAYER_Z };
    this.oppBat = { x: 0, y: BAT_REST_Y, z: OPPONENT_Z };
    this.oppGlide = null;

    // Bat swing speed, read from how fast the bat is driven forward in z.
    this.batVel = { dz: 0, dx: 0 };
    this.keys = {};
    this.pointerActive = false;
    this.lastPointer = null;

    this.possession = null;
    this.pointResult = null;
    this.pointTimer = 0;
    this.serveTimer = 0;
    this.banner = "";

    this.keysMove = { x: 0, y: 0 };

    this.running = false;
    this.raf = null;
    this.accumulator = 0;
    this.lastFrame = 0;

    this._onFrame = (ts) => this.frame(ts);
    this._onResize = () => this.handleResize();
    this._onKD = (e) => this.onKeyDown(e);
    this._onKU = (e) => this.onKeyUp(e);
    this._onPointerDown = (e) => this.onPointerDown(e);
    this._onPointerMove = (e) => this.onPointerMove(e);
    this._onPointerUp = (e) => this.onPointerUp(e);
  }

  start() {
    this.running = true;
    this.handleResize();
    window.addEventListener("resize", this._onResize);
    window.addEventListener("keydown", this._onKD);
    window.addEventListener("keyup", this._onKU);
    this.canvas.addEventListener("pointerdown", this._onPointerDown);
    this.canvas.addEventListener("pointermove", this._onPointerMove);
    window.addEventListener("pointerup", this._onPointerUp);
    this.canvas.style.touchAction = "none";
    this.audio.preload();
    this.lastFrame = performance.now();
    this.emit();
    this.raf = requestAnimationFrame(this._onFrame);
  }

  destroy() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("keydown", this._onKD);
    window.removeEventListener("keyup", this._onKU);
    this.canvas.removeEventListener("pointerdown", this._onPointerDown);
    this.canvas.removeEventListener("pointermove", this._onPointerMove);
    window.removeEventListener("pointerup", this._onPointerUp);
    this.audio.dispose();
  }

  setAudioEnabled(enabled) {
    const on = Boolean(enabled);
    this.audio.setEnabled(on);
    writeAudioPref(on);
    // Turning it back on mid-match should not wait for the next rally to fetch
    // the samples. Muting only gates playback: tearing the context down would
    // mean re-decoding everything the moment they toggle back.
    if (on) this.audio.preload();
    this.emit();
    this.render();
  }

  toggleAudio() {
    this.setAudioEnabled(!this.audio.getEnabled());
  }

  handleResize() {
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || 960;
    const h = rect.height || 540;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.vW = w;
    this.vH = h;
    this.cam = createCamera(w, h);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render();
  }

  emit() {
    if (!this.onSnapshot) return;
    const m = this.match;
    this.onSnapshot({
      mode: "sports-ping-pong-arena",
      screen: this.screen,
      difficulty: this.difficulty,
      bestOf: this.bestOf,
      playerPoints: m.playerPoints,
      opponentPoints: m.opponentPoints,
      playerSets: m.playerSets,
      opponentSets: m.opponentSets,
      server: m.server,
      matchWinner: m.matchWinner,
      paused: this.paused,
      audioEnabled: this.audio.getEnabled(),
    });
  }

  // ── Menu / lifecycle ────────────────────────────────────────────
  setDifficulty(id) {
    if (this.screen !== "menu") return;
    if (["easy", "medium", "hard"].includes(id)) {
      this.difficulty = id;
      this.emit();
      this.render();
    }
  }

  setFormat(bestOf) {
    if (this.screen !== "menu") return;
    if ([1, 3, 5].includes(bestOf)) {
      this.bestOf = bestOf;
      this.emit();
      this.render();
    }
  }

  // Bat swing parameters. Mirrors User.getParameters(): the speed the bat is
  // driven forward in z sets the shot velocity (60..90), and the launch angle
  // falls as the velocity rises (120 - velocity), so a hard flick comes out flat
  // and a gentle push loops. sideAngle comes from the diagonal of the swing.
  batShotParams() {
    const dz = this.batVel.dz;
    const dx = this.batVel.dx;
    const sideAngle = dx !== 0 ? Math.atan(dz / dx) : 0;
    const v = clamp(dz, 0, MAX_MOVE_VELOCITY);
    const velocity = (v + 2400) / 40;
    const upAngle = 120 - velocity;
    return { velocity, sideAngle, upAngle };
  }

  startMatch() {
    this.opp = createOpponent(this.difficulty);
    this.match = createMatchState(this.bestOf, "player");
    this.pointResult = null;
    this.banner = "";
    this.audio.play("referee");
    this.beginServe();
  }

  restart() {
    this.screen = "menu";
    this.paused = false;
    this.match = createMatchState(this.bestOf, "player");
    this.pointResult = null;
    this.banner = "";
    this.emit();
    this.render();
  }

  togglePause() {
    if (this.screen === "menu" || this.screen === "over") return;
    this.paused = !this.paused;
    this.emit();
    this.render();
  }

  // ── Serve ───────────────────────────────────────────────────────
  beginServe() {
    const server = this.match.server;
    this.screen = "serve";
    this.serveTimer = server === "opponent" ? 0.9 : 0;
    this.pointResult = null;
    this.oppGlide = null;
    // Hold the ball at the server's bat. The opponent picks a random x across
    // the table, as in Opponent.setPosition().
    if (server === "player") {
      this.ball = createBall({ x: this.playerBat.x, y: BAT_REST_Y, z: BOARD_Z });
    } else {
      this.oppBat.x = serveX(this.rng);
      this.oppBat.z = OPPONENT_Z;
      this.ball = createBall({ x: this.oppBat.x, y: BAT_REST_Y, z: BOARD_END });
    }
    this.emit();
  }

  serveBall(server) {
    if (server === "player") {
      const { velocity, sideAngle } = this.batShotParams();
      this.ball = serveBallShot(
        createBall({ x: this.playerBat.x, y: BAT_REST_Y, z: BOARD_Z }),
        velocity,
        sideAngle,
      );
    } else {
      // Opponent.serve(): fixed VELOCITY, negative so it comes toward the human.
      this.ball = serveBallShot(
        createBall({ x: this.oppBat.x, y: BAT_REST_Y, z: BOARD_END }),
        -VELOCITY,
        0,
      );
    }
    this.audio.play("batHit");
    this.possession = {
      hitter: server,
      receiver: OTHER[server],
      serve: true,
      serveBounceDone: false,
      receiverBounces: 0,
      age: 0,
    };
    if (server === "player") this.aimOpponent();
    this.screen = "rally";
    this.emit();
  }

  // Send the opponent's bat toward its read of the ball, on the eased glide.
  // Mirrors game.js opponentMovement() -> opponent.animate(destination).
  aimOpponent() {
    const dest = predictDestination(this.ball);
    const err = (this.rng() * 2 - 1) * this.opp.aimError;
    const x = clamp(dest.x + err, BAT_MIN_X, BAT_MAX_X);
    this.oppGlide = createGlide(this.oppBat.x, this.oppBat.z, x, dest.z, this.opp.easeMs);
  }

  // ── Frame / update ──────────────────────────────────────────────
  frame(ts) {
    if (!this.running) return;
    const el = Math.min(0.05, (ts - this.lastFrame) / 1000);
    this.lastFrame = ts;
    if (!this.paused) {
      this.accumulator += el;
      let guard = 0;
      while (this.accumulator >= DT && guard < 12) {
        this.update(DT);
        this.accumulator -= DT;
        guard += 1;
      }
    }
    this.render();
    this.raf = requestAnimationFrame(this._onFrame);
  }

  advanceTime(ms = DT_MS) {
    const steps = Math.max(1, Math.round(Number(ms) / DT_MS));
    for (let i = 0; i < steps; i++) this.update(DT);
    this.render();
  }

  update(dt) {
    this.applyKeyboardMove(dt);
    this.updateBatVelocity(dt);

    if (this.screen === "serve") {
      if (this.match.server === "player") {
        // Ball sits at the bat until it is struck forward.
        this.ball.x = this.playerBat.x;
        this.ball.y = BAT_REST_Y;
        this.ball.z = BOARD_Z;
        // A forward drive through the ball serves it, as in game.js serveBall().
        if (this.batVel.dz > 120) this.serveBall("player");
      } else {
        this.serveTimer -= dt;
        if (this.serveTimer <= 0) this.serveBall("opponent");
      }
      return;
    }

    if (this.screen === "point") {
      this.pointTimer -= dt;
      if (this.pointTimer <= 0) this.afterPoint();
      return;
    }

    if (this.screen !== "rally") return;
    this.stepRally(dt);
  }

  stepRally(dt) {
    if (this.possession) this.possession.age += dt;

    const prev = this.ball;
    const next = stepBall(prev);

    // Net. The reference tests this discretely and rebounds the ball back onto
    // the hitter's side; the point goes to the other player either way.
    if (crossesNet(prev, next)) {
      this.ball = bounceBackFromNet(next, this.possession.hitter);
      this.scorePoint(OTHER[this.possession.hitter], "net");
      return;
    }

    this.ball = next;

    // stepBall raises bounceCount on the frame it re-launches the ball. The
    // surface it came off is the bounce level it was falling toward.
    if (next.bounceCount > prev.bounceCount) {
      if (prev.bounceLevel === TABLE_TOP_Y) {
        // The reference splits its two bounce samples on exactly this: a live
        // bounce off the table vs a dead one off the floor.
        this.audio.play("bounceIn");
        this.onBounce(halfOf(next.z));
        if (this.screen !== "rally") return;
      } else {
        this.audio.play("bounceOut");
        // Hit the floor — the ball is dead. The reference waits for it to leave
        // the arena entirely, which idles for a couple of seconds; resolving on
        // the floor bounce reaches the same verdict immediately.
        this.resolveDead();
        return;
      }
    }

    this.moveOpponent(dt);
    this.checkOpponentContact(prev, this.ball);
    if (this.screen !== "rally") return;
    this.checkPlayerContact(prev, this.ball);
    if (this.screen !== "rally") return;

    if (ballOut(this.ball)) this.resolveDead();
  }

  onBounce(half) {
    const pos = this.possession;
    if (!pos) return;
    const hitterHalf = HALF_OF[pos.hitter];
    if (half === hitterHalf) {
      if (pos.serve && !pos.serveBounceDone) {
        pos.serveBounceDone = true; // legal first serve bounce
      } else {
        this.scorePoint(OTHER[pos.hitter], "double-own"); // illegal bounce back on own side
      }
      return;
    }
    // Bounce on the receiver's half.
    if (pos.serve && !pos.serveBounceDone) {
      // Serve reached the far half without bouncing own side first.
      this.scorePoint(OTHER[pos.hitter], "serve-fault");
      return;
    }
    pos.receiverBounces += 1;
    if (pos.receiverBounces >= 2) {
      this.scorePoint(pos.hitter, "two-bounce");
    }
  }

  // The bat glides to its read on an eased tween — Opponent.animate().
  moveOpponent(dt) {
    if (!this.oppGlide) return;
    const s = stepGlide(this.oppGlide, dt);
    this.oppBat.x = s.x;
    this.oppBat.z = s.z;
    this.oppGlide.elapsed = s.elapsed;
    if (s.done) this.oppGlide = null;
  }

  checkOpponentContact(prev, cur) {
    const pos = this.possession;
    if (!pos || pos.receiver !== "opponent" || pos.receiverBounces < 1) return;
    if (checkBatCollision(cur, this.oppBat, "opponent") && cur.vz > 0) {
      this.opponentHit();
    }
  }

  // The shot velocity runs 60..90 (see batShotParams), so pitching the sample
  // across that range makes a hard drive crack and a soft push thud, keeping the
  // audio coupled to the swing the way the rest of the game is.
  batHitRate(velocity) {
    const t = clamp((Math.abs(velocity) - 60) / 30, 0, 1);
    return 0.92 + t * 0.16;
  }

  opponentHit() {
    // The rally state the CPU aims from: where it is hitting from, where the
    // human is standing, and how fast they are moving (so it can hit behind them).
    const shot = planReturn(this.opp, this.rng, {
      ball: this.ball,
      fromZ: this.oppBat.z,
      playerX: this.playerBat.x,
      playerVx: this.batVel.dx,
    });
    this.audio.play("batHit", { rate: this.batHitRate(shot.velocity) });
    this.ball = hitBall(this.ball, {
      side: "opponent",
      velocity: shot.velocity,
      sideAngle: shot.sideAngle,
      upAngle: shot.upAngle,
      drift: shot.drift,
      fromZ: this.oppBat.z,
    });
    this.possession = {
      hitter: "opponent",
      receiver: "player",
      serve: false,
      serveBounceDone: true,
      receiverBounces: 0,
      age: 0,
    };
    // Push back toward the middle to cover the reply instead of standing where
    // the shot was played. Replaced by aimOpponent() the moment the human hits.
    this.oppGlide = createGlide(
      this.oppBat.x,
      this.oppBat.z,
      recoveryTarget(this.opp, this.oppBat.x),
      OPPONENT_Z,
      this.opp.easeMs,
    );
  }

  checkPlayerContact(prev, cur) {
    const pos = this.possession;
    if (!pos || pos.receiver !== "player" || pos.receiverBounces < 1) return;
    if (checkBatCollision(cur, this.playerBat, "player") && cur.vz < 0) {
      this.playerHit();
    }
  }

  playerHit() {
    // The swing itself is the shot: how hard the bat is driven forward sets the
    // speed, and the launch angle falls out of it.
    const { velocity, sideAngle, upAngle } = this.batShotParams();
    this.audio.play("batHit", { rate: this.batHitRate(velocity) });
    this.ball = hitBall(this.ball, {
      side: "player",
      velocity,
      sideAngle,
      upAngle,
      fromZ: this.playerBat.z,
    });
    this.possession = {
      hitter: "player",
      receiver: "opponent",
      serve: false,
      serveBounceDone: true,
      receiverBounces: 0,
      age: 0,
    };
    this.aimOpponent();
  }

  resolveDead() {
    const pos = this.possession;
    if (!pos) {
      this.beginServe();
      return;
    }
    if (pos.receiverBounces >= 1) {
      // Ball landed legally in the receiver's half and they failed to return it.
      this.scorePoint(pos.hitter, "winner");
    } else {
      // Hitter's shot never landed in the receiver's half (long / wide / into net).
      this.scorePoint(OTHER[pos.hitter], "out");
    }
  }

  scorePoint(scorer, reason) {
    if (this.screen === "point" || this.screen === "over") return;
    const prevSets = { p: this.match.playerSets, o: this.match.opponentSets };
    this.match = registerPoint(this.match, scorer);
    this.pointResult = { scorer, reason };
    this.screen = "point";
    this.pointTimer = 1.1;

    // The crowd backs the human: a warm clap when you take the point, a flatter
    // one when the CPU does. Same split as the reference's clapHigh/clapLow.
    this.audio.play(scorer === "player" ? "clapHigh" : "clapLow");

    if (this.match.over) {
      this.banner = this.match.matchWinner === "player" ? this.copy.matchWon : this.copy.matchLost;
    } else if (
      this.match.playerSets !== prevSets.p ||
      this.match.opponentSets !== prevSets.o
    ) {
      this.banner = this.match.lastSetWinner === "player" ? this.copy.setWon : this.copy.setLost;
    } else {
      this.banner = "";
    }
    this.emit();
  }

  afterPoint() {
    if (this.match.over) {
      // Whistled out, as the reference does on its win screen. Held until the
      // point banner clears so it does not land on top of the clap.
      this.audio.play("referee");
      this.screen = "over";
      this.emit();
      return;
    }
    this.banner = "";
    this.beginServe();
  }

  // ── Input ───────────────────────────────────────────────────────
  // The pointer drives the bat across a horizontal plane at BAT_REST_Y, so
  // screen y maps to depth (z), not height. Mirrors User.handleBatMovement()
  // via projection.get3dPosition(), then fitToCourt().
  pointerToWorld(clientX, clientY, pointerType = "mouse") {
    const rect = this.canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top - this.pointerLift(pointerType);
    const w = unproject(this.cam, sx, sy, BAT_REST_Y);
    return {
      x: clamp(w.x, BAT_MIN_X, BAT_MAX_X),
      z: clamp(w.z, BAT_MIN_Z, BAT_MAX_Z),
    };
  }

  // A finger reports the centroid of its contact patch, which sits below the
  // point the player believes they are aiming with — and then covers it. The
  // projection is exact (screen → plane → screen round-trips to the pixel), so
  // there is nowhere else to close that gap: lift the touch point before it is
  // unprojected. A mouse or a pen reports the exact pixel and gets nothing.
  pointerLift(pointerType) {
    return pointerType === "touch" ? TOUCH_LIFT_PX : 0;
  }

  setBatFromPointer(clientX, clientY, pointerType = "mouse") {
    const w = this.pointerToWorld(clientX, clientY, pointerType);
    this.playerBat.x = w.x;
    this.playerBat.z = w.z;
  }

  // The bat's speed is measured from how far it actually moved since the last
  // frame, exactly as the reference does with prevPositionX/prevPositionZ. It
  // must not be gated on the pointer being held down — the reference tracks a
  // plain mousemove, with no click involved.
  updateBatVelocity(dt) {
    this.batVel = {
      dz: (this.playerBat.z - this.playerBat.prevZ) / dt,
      dx: (this.playerBat.x - this.playerBat.prevX) / dt,
    };
    this.playerBat.prevX = this.playerBat.x;
    this.playerBat.prevZ = this.playerBat.z;
  }

  onPointerDown(e) {
    this.pointerActive = true;
    this.setBatFromPointer(e.clientX, e.clientY, e.pointerType);
  }

  onPointerMove(e) {
    this.setBatFromPointer(e.clientX, e.clientY, e.pointerType);
  }

  onPointerUp() {
    this.pointerActive = false;
  }

  applyKeyboardMove(dt) {
    const speed = 900; // px/s of bat travel
    let dx = 0;
    let dz = 0;
    if (this.keys.ArrowLeft) dx -= 1;
    if (this.keys.ArrowRight) dx += 1;
    if (this.keys.ArrowUp) dz += 1;
    if (this.keys.ArrowDown) dz -= 1;
    if (dx || dz) {
      this.playerBat.x = clamp(this.playerBat.x + dx * speed * dt, BAT_MIN_X, BAT_MAX_X);
      this.playerBat.z = clamp(this.playerBat.z + dz * speed * dt, BAT_MIN_Z, BAT_MAX_Z);
    }
  }

  onKeyDown(e) {
    const code = e.code;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(code)) {
      e.preventDefault?.();
    }
    this.keys[code] = true;

    if (code === "KeyF") {
      this.onFullscreen?.();
      return;
    }
    if (code === "KeyP") {
      this.togglePause();
      return;
    }
    if (code === "KeyM") {
      this.toggleAudio();
      return;
    }
    if (code === "KeyR") {
      this.restart();
      return;
    }

    if (this.screen === "menu") {
      if (code === "Digit1") this.setDifficulty("easy");
      else if (code === "Digit2") this.setDifficulty("medium");
      else if (code === "Digit3") this.setDifficulty("hard");
      else if (code === "Digit4") this.setFormat(1);
      else if (code === "Digit5") this.setFormat(3);
      else if (code === "Digit6") this.setFormat(5);
      else if (code === "Enter" || code === "Space") this.startMatch();
      return;
    }

    if (this.screen === "over") {
      if (code === "Enter" || code === "Space") this.restart();
      return;
    }

    if (code === "Space") {
      if (this.screen === "serve" && this.match.server === "player") {
        this.serveBall("player");
      }
    }
  }

  onKeyUp(e) {
    this.keys[e.code] = false;
  }

  setVirtualKey(code, pressed) {
    if (!code) return;
    this.keys[code] = Boolean(pressed);
  }

  pressVirtualKey(code) {
    if (!code) return;
    this.onKeyDown({ code, preventDefault() {}, repeat: false });
    this.onKeyUp({ code });
  }

  // ── Render ──────────────────────────────────────────────────────
  render() {
    const ctx = this.ctx;
    const { vW, vH } = this;
    ctx.clearRect(0, 0, vW, vH);

    drawWorld(
      ctx,
      this.cam,
      { ball: this.ball, playerBat: this.playerBat, oppBat: this.oppBat },
      vW,
      vH,
    );

    if (this.screen === "menu") {
      this.drawMenu(ctx, vW, vH);
      return;
    }

    this.drawHud(ctx, vW, vH);

    if (this.screen === "serve" && this.match.server === "player") {
      this.drawCenterText(ctx, vW, vH, this.copy.tapToServe, vH * 0.82, 0.032);
    }
    if (this.screen === "point" && this.banner) {
      this.drawCenterText(ctx, vW, vH, this.banner, vH * 0.42, 0.05);
    }
    if (this.screen === "over") {
      this.drawOverlay(ctx, vW, vH, this.banner, this.copy.again);
    }
    if (this.paused) {
      this.drawOverlay(ctx, vW, vH, this.copy.paused, this.copy.resume);
    }
  }

  drawHud(ctx, vW, vH) {
    const m = this.match;
    ctx.save();
    // Scoreboard panel top-centre.
    const pad = 10;
    const w = Math.min(360, vW * 0.7);
    const h = 44;
    const x = (vW - w) / 2;
    const y = 10;
    ctx.fillStyle = "rgba(6,12,22,0.72)";
    ctx.strokeStyle = "rgba(120,150,200,0.35)";
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#e6edf7";
    ctx.font = `800 ${Math.round(h * 0.4)}px system-ui, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(this.copy.you, x + pad, y + h * 0.36);
    ctx.textAlign = "right";
    ctx.fillText(this.copy.cpu, x + w - pad, y + h * 0.36);

    ctx.textAlign = "center";
    ctx.fillStyle = PALETTE.ball;
    ctx.font = `900 ${Math.round(h * 0.5)}px system-ui, sans-serif`;
    ctx.fillText(`${m.playerPoints}   -   ${m.opponentPoints}`, vW / 2, y + h * 0.5);

    ctx.fillStyle = "rgba(190,205,225,0.8)";
    ctx.font = `700 ${Math.round(h * 0.26)}px system-ui, sans-serif`;
    ctx.fillText(`${this.copy.sets} ${m.playerSets}-${m.opponentSets}`, vW / 2, y + h * 0.82);

    // Serve indicator.
    const serveText = m.server === "player" ? "●" : "○";
    ctx.fillStyle = m.server === "player" ? PALETTE.ball : "rgba(190,205,225,0.6)";
    ctx.textAlign = "left";
    ctx.fillText(serveText, x + pad, y + h * 0.82);
    ctx.textAlign = "right";
    ctx.fillStyle = m.server === "opponent" ? PALETTE.ball : "rgba(190,205,225,0.6)";
    ctx.fillText(m.server === "opponent" ? "●" : "○", x + w - pad, y + h * 0.82);

    ctx.restore();
  }

  drawMenu(ctx, vW, vH) {
    ctx.save();
    ctx.fillStyle = "rgba(4,9,16,0.72)";
    ctx.fillRect(0, 0, vW, vH);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = PALETTE.ball;
    ctx.font = `900 ${Math.round(vH * 0.09)}px system-ui, sans-serif`;
    ctx.fillText(this.copy.title, vW / 2, vH * 0.2);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = `600 ${Math.round(vH * 0.032)}px system-ui, sans-serif`;
    ctx.fillText(this.copy.subtitle, vW / 2, vH * 0.3);

    const diffs = [
      ["easy", this.copy.easy],
      ["medium", this.copy.medium],
      ["hard", this.copy.hard],
    ];
    const fmts = [
      [1, this.copy.best1],
      [3, this.copy.best3],
      [5, this.copy.best5],
    ];
    this.drawChoiceRow(ctx, vW, vH * 0.46, this.copy.difficulty, diffs, this.difficulty);
    this.drawChoiceRow(ctx, vW, vH * 0.66, this.copy.format, fmts, this.bestOf);

    ctx.fillStyle = PALETTE.ball;
    ctx.font = `800 ${Math.round(vH * 0.045)}px system-ui, sans-serif`;
    ctx.fillText(`▶ ${this.copy.start}`, vW / 2, vH * 0.86);
    ctx.restore();
  }

  drawChoiceRow(ctx, vW, y, label, options, selected) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#9fb3cc";
    ctx.font = `700 ${Math.round(this.vH * 0.028)}px system-ui, sans-serif`;
    ctx.fillText(label, vW / 2, y - this.vH * 0.06);
    const n = options.length;
    const bw = Math.min(160, vW * 0.26);
    const gap = 14;
    const total = n * bw + (n - 1) * gap;
    let x = (vW - total) / 2;
    for (const [val, text] of options) {
      const on = val === selected;
      ctx.fillStyle = on ? "rgba(255,215,64,0.9)" : "rgba(15,28,48,0.85)";
      ctx.strokeStyle = on ? "#ffd740" : "rgba(120,150,200,0.35)";
      roundRect(ctx, x, y - this.vH * 0.035, bw, this.vH * 0.07, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = on ? "#111827" : "#dfe7f2";
      ctx.font = `800 ${Math.round(this.vH * 0.03)}px system-ui, sans-serif`;
      ctx.textBaseline = "middle";
      ctx.fillText(text, x + bw / 2, y);
      x += bw + gap;
    }
  }

  drawCenterText(ctx, vW, vH, text, y, sizeFrac) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 ${Math.round(vH * sizeFrac)}px system-ui, sans-serif`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(4,9,16,0.85)";
    ctx.strokeText(text, vW / 2, y);
    ctx.fillStyle = "#f4f7ff";
    ctx.fillText(text, vW / 2, y);
    ctx.restore();
  }

  drawOverlay(ctx, vW, vH, title, sub) {
    ctx.save();
    ctx.fillStyle = "rgba(4,9,16,0.68)";
    ctx.fillRect(0, 0, vW, vH);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = PALETTE.ball;
    ctx.font = `900 ${Math.round(vH * 0.08)}px system-ui, sans-serif`;
    ctx.fillText(title, vW / 2, vH * 0.44);
    ctx.fillStyle = "#dfe7f2";
    ctx.font = `700 ${Math.round(vH * 0.04)}px system-ui, sans-serif`;
    ctx.fillText(`▶ ${sub}`, vW / 2, vH * 0.58);
    ctx.restore();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
