// Trilero / Shell Game runtime. State machine (menu → place → shuffle → pick →
// reveal → over), fixed-step loop, pointer/keyboard input, and playback of the
// plan choreography.js generated. Mirrors the basketball-court / ping-pong
// runtime contract: { canvas, locale, onSnapshot, onFullscreen }, start/destroy,
// advanceTime, setVirtualKey, pressVirtualKey.

import { createShellGameAudio, readStoredShellMuted } from "./audio.js";
import { cupSlotAt, makeRng, planShuffle } from "./choreography.js";
import { MOVES, levelConfig } from "./levels.js";
import { createGameState, registerGuess } from "./rules.js";
import { drawWorld, layoutFor, slotAtPoint, slotX, PALETTE } from "./scene.js";
import { getCopy } from "./copy.js";

const DT = 1 / 60;
const DT_MS = 1000 / 60;

// Placing the ball is deliberately unhurried: it is the contract with the
// player, and rushing it is how a shell game starts feeling like a swindle.
const PLACE_LIFT = 0.45;
const PLACE_HOLD = 0.85;
const PLACE_DROP = 0.4;
const PLACE_TOTAL = PLACE_LIFT + PLACE_HOLD + PLACE_DROP;

const SETTLE = 0.35; // beat between the last cross and the prompt
const REVEAL_TOTAL = 1.5;

const BEST_KEY = "gamelock.shell-game.bestStreak";

// How far a crossing cup swings toward or away from the viewer. Every cross
// needs it: two cups trading places on a flat line would pass through one
// another. Bigger for the showier moves.
const DEPTH_BY_MOVE = {
  [MOVES.SLIDE]: 0.45,
  [MOVES.ARC]: 1,
  [MOVES.CIRCLE]: 0.75,
};

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const smoothstep = (t) => t * t * (3 - 2 * t);
const easeOutBack = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

function readBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Private mode or a blocked store: the run still plays, it just won't persist.
  }
}

export class ShellGameRuntime {
  constructor({ canvas, locale, onSnapshot, onFullscreen, seed }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.locale = locale === "es" ? "es" : "en";
    this.copy = getCopy(this.locale);
    this.onSnapshot = onSnapshot;
    this.onFullscreen = onFullscreen;

    this.rng = makeRng(seed ?? ((Date.now() & 0xffffffff) >>> 0));
    this.state = createGameState(readBest());
    this.plan = null;
    this.audio = createShellGameAudio(readStoredShellMuted());
    // Crosses fire their swish once, when the phase clock passes their start.
    // Tracked by id rather than by comparing against last frame's clock, so an
    // advanceTime() jump replays the round's cues exactly once each.
    this.firedSwaps = new Set();

    this.screen = "menu"; // menu | place | shuffle | pick | reveal | over
    this.paused = false;
    this.phaseT = 0;
    this.pickedSlot = -1;
    this.pickCorrect = null;
    this.hoverSlot = -1;

    this.vW = canvas.clientWidth || 960;
    this.vH = canvas.clientHeight || 540;
    this.layout = layoutFor(this.vW, this.vH, 3);

    this.running = false;
    this.raf = null;
    this.resizeObserver = null;
    this.lastFrame = 0;
    this.accumulator = 0;

    this._onFrame = (ts) => this.frame(ts);
    this._onResize = () => this.handleResize();
    this._onKD = (e) => this.onKeyDown(e);
    this._onPointerDown = (e) => this.onPointerDown(e);
    this._onPointerMove = (e) => this.onPointerMove(e);
  }

  start() {
    this.running = true;
    this.handleResize();
    window.addEventListener("resize", this._onResize);
    // The mobile shell resizes the stage on its own — entering fullscreen,
    // rotating, or reserving the band for the ad vignette — without the window
    // ever changing size. Watching the canvas itself is what keeps the cups
    // sized to the box they are actually in.
    if (typeof ResizeObserver === "function") {
      this.resizeObserver = new ResizeObserver(this._onResize);
      this.resizeObserver.observe(this.canvas);
    }
    window.addEventListener("keydown", this._onKD);
    this.canvas.addEventListener("pointerdown", this._onPointerDown);
    this.canvas.addEventListener("pointermove", this._onPointerMove);
    this.canvas.style.touchAction = "manipulation";
    this.lastFrame = typeof performance !== "undefined" ? performance.now() : 0;
    this.emit();
    if (typeof requestAnimationFrame === "function") {
      this.raf = requestAnimationFrame(this._onFrame);
    }
  }

  destroy() {
    this.running = false;
    this.audio.dispose();
    if (this.raf) cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("keydown", this._onKD);
    this.canvas.removeEventListener("pointerdown", this._onPointerDown);
    this.canvas.removeEventListener("pointermove", this._onPointerMove);
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
    this.layout = layoutFor(w, h, this.plan?.cups ?? levelConfig(this.state.level).cups);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render();
  }

  emit() {
    if (!this.onSnapshot) return;
    const s = this.state;
    this.onSnapshot({
      mode: "arcade-shell-game",
      screen: this.screen,
      level: s.level,
      lives: s.lives,
      score: s.score,
      streak: s.streak,
      bestStreak: s.bestStreak,
      cups: this.plan?.cups ?? levelConfig(s.level).cups,
      paused: this.paused,
      over: s.over,
      lastResult: s.lastResult,
      audio: this.audio.snapshot(),
    });
  }

  // ── Lifecycle ───────────────────────────────────────────────────────
  startGame() {
    // Reached from a click or a keypress, which is the gesture the context needs:
    // the shuffle's cues fire from the raf loop and have no gesture of their own.
    this.audio.unlock();
    this.state = createGameState(this.state.bestStreak);
    this.beginRound();
  }

  toggleAudioMuted() {
    this.audio.unlock();
    const muted = this.audio.toggleMuted();
    this.emit();
    return muted;
  }

  restart() {
    this.screen = "menu";
    this.paused = false;
    this.plan = null;
    this.pickedSlot = -1;
    this.pickCorrect = null;
    this.state = createGameState(this.state.bestStreak);
    this.layout = layoutFor(this.vW, this.vH, levelConfig(1).cups);
    this.emit();
    this.render();
  }

  beginRound() {
    this.plan = planShuffle(this.state.level, this.rng);
    this.layout = layoutFor(this.vW, this.vH, this.plan.cups);
    this.screen = "place";
    this.phaseT = 0;
    // New plan, new ids: without this the second round's crosses would be taken
    // for already-played ones and shuffle in silence.
    this.firedSwaps.clear();
    this.pickedSlot = -1;
    this.pickCorrect = null;
    this.hoverSlot = -1;
    this.emit();
  }

  togglePause() {
    if (this.screen === "menu" || this.screen === "over") return;
    this.paused = !this.paused;
    this.emit();
    this.render();
  }

  // ── Frame ───────────────────────────────────────────────────────────
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
    if (this.screen === "menu" || this.screen === "pick" || this.screen === "over") return;
    this.phaseT += dt;

    if (this.screen === "place" && this.phaseT >= PLACE_TOTAL) {
      this.screen = "shuffle";
      this.phaseT = 0;
      this.emit();
      return;
    }

    if (this.screen === "shuffle" && this.plan) {
      // Sorted by `at`, so this stops at the first cross still in the future.
      for (const swap of this.plan.swaps) {
        if (swap.at > this.phaseT) break;
        if (this.firedSwaps.has(swap.id)) continue;
        this.firedSwaps.add(swap.id);
        this.audio.playSwish(swap);
      }
      // A DOUBLE puts two crosses on the same timestamp; the tick boundary is
      // what lets the cue cap treat them as one move rather than two.
      this.audio.endTick();
    }

    if (this.screen === "shuffle" && this.phaseT >= this.plan.totalDuration + SETTLE) {
      this.screen = "pick";
      this.phaseT = 0;
      this.emit();
      return;
    }

    if (this.screen === "reveal" && this.phaseT >= REVEAL_TOTAL) {
      this.afterReveal();
    }
  }

  afterReveal() {
    if (this.state.over) {
      this.screen = "over";
      this.phaseT = 0;
      writeBest(this.state.bestStreak);
      this.emit();
      return;
    }
    this.beginRound();
  }

  // ── Input ───────────────────────────────────────────────────────────
  guess(slot) {
    if (this.screen !== "pick" || !this.plan) return;
    if (slot < 0 || slot >= this.plan.cups) return;

    const correct = slot === this.plan.finalBallSlot;
    this.pickedSlot = slot;
    this.pickCorrect = correct;
    this.state = registerGuess(this.state, { correct, cups: this.plan.cups });
    if (correct) this.audio.playWin();
    else this.audio.playLose();
    if (this.state.bestStreak > 0) writeBest(this.state.bestStreak);
    this.screen = "reveal";
    this.phaseT = 0;
    this.emit();
  }

  pointerSlot(e) {
    const rect = this.canvas.getBoundingClientRect();
    return slotAtPoint(this.layout, e.clientX - rect.left, e.clientY - rect.top);
  }

  onPointerDown(e) {
    this.audio.unlock();
    if (this.screen === "menu") {
      this.startGame();
      return;
    }
    if (this.screen === "over") {
      this.restart();
      return;
    }
    const slot = this.pointerSlot(e);
    if (slot >= 0) this.guess(slot);
  }

  onPointerMove(e) {
    this.hoverSlot = this.screen === "pick" ? this.pointerSlot(e) : -1;
  }

  onKeyDown(e) {
    const code = e.code;
    if (["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Space", "Enter"].includes(code)) {
      e.preventDefault?.();
    }
    this.audio.unlock();

    if (code === "KeyF") return void this.onFullscreen?.();
    if (code === "KeyP") return void this.togglePause();
    if (code === "KeyR") return void this.restart();

    if (this.screen === "menu") {
      if (code === "Enter" || code === "Space") this.startGame();
      return;
    }
    if (this.screen === "over") {
      if (code === "Enter" || code === "Space") this.restart();
      return;
    }
    if (this.screen === "pick") {
      const n = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5"].indexOf(code);
      if (n >= 0) this.guess(n);
    }
  }

  setVirtualKey() {
    // No held keys in this game; the stage is the control.
  }

  pressVirtualKey(code) {
    if (!code) return;
    this.onKeyDown({ code, preventDefault() {} });
  }

  // ── View model ──────────────────────────────────────────────────────
  // Turn the plan plus the phase clock into the render list the scene draws.
  buildView() {
    const cupsN = this.plan?.cups ?? this.layout.cups;
    const cups = [];
    for (let id = 0; id < cupsN; id++) cups.push({ slot: id, lift: 0, depth: 0 });

    if (!this.plan) return { cups, ball: null, pickedSlot: -1, hoverSlot: -1, pickCorrect: null };

    const ballCup = this.plan.ballCup;
    let ballSlot = this.plan.ballSlot;
    let ballVisible = false;

    if (this.screen === "place") {
      const t = this.phaseT;
      let lift = 0;
      if (t < PLACE_LIFT) lift = smoothstep(t / PLACE_LIFT);
      else if (t < PLACE_LIFT + PLACE_HOLD) lift = 1;
      else lift = 1 - smoothstep(clamp((t - PLACE_LIFT - PLACE_HOLD) / PLACE_DROP, 0, 1));

      cups[ballCup].lift = lift;
      cups[ballCup].depth = lift * 0.25;
      ballVisible = true;
      ballSlot = this.plan.ballSlot;
    } else if (this.screen === "shuffle") {
      const t = Math.min(this.phaseT, this.plan.totalDuration);
      for (let id = 0; id < cupsN; id++) {
        const at = cupSlotAt(this.plan, id, t);
        if (!at.swap) {
          cups[id].slot = at.slot;
          cups[id].depth = 0;
          continue;
        }
        // Ease the travel so a cross accelerates and settles instead of
        // sliding at a dead constant rate.
        const p = smoothstep(at.progress);
        cups[id].slot = at.from + (at.to - at.from) * p;

        const amount = DEPTH_BY_MOVE[at.swap.type] ?? DEPTH_BY_MOVE[MOVES.SLIDE];
        cups[id].depth = this.depthFor(id, at, amount) * Math.sin(Math.PI * at.progress);
      }
      ballSlot = cups[ballCup].slot;
    } else {
      // pick / reveal / over — cups have settled on the answer.
      for (let id = 0; id < cupsN; id++) {
        cups[id].slot = cupSlotAt(this.plan, id, this.plan.totalDuration).slot;
      }
      ballSlot = cups[ballCup].slot;

      if (this.screen === "reveal") {
        const t = clamp(this.phaseT / (REVEAL_TOTAL * 0.42), 0, 1);
        const lift = easeOutBack(t);
        // Always lift the player's pick. When it was wrong, lift the real one
        // too — the round has to end by showing where the ball actually was.
        if (this.pickedSlot >= 0) {
          const picked = cups.findIndex((c) => Math.round(c.slot) === this.pickedSlot);
          if (picked >= 0) cups[picked].lift = lift;
        }
        if (this.pickCorrect === false) {
          const delay = clamp((this.phaseT - REVEAL_TOTAL * 0.3) / (REVEAL_TOTAL * 0.4), 0, 1);
          cups[ballCup].lift = Math.max(cups[ballCup].lift, easeOutBack(delay));
        }
        ballVisible = true;
      }
    }

    return {
      cups,
      ball: {
        cupIndex: ballCup,
        slot: ballSlot,
        radius: this.layout.cupW * 0.17,
        visible: ballVisible,
      },
      pickedSlot: this.screen === "reveal" ? this.pickedSlot : -1,
      hoverSlot: this.hoverSlot,
      pickCorrect: this.pickCorrect,
    };
  }

  // Which way a cup swings during a cross: one goes in front, the other behind.
  // In a three-cup rotation the one making the long trip takes the front, since
  // it is the one that has to cross the others' paths.
  depthFor(cupId, at, amount) {
    const swap = at.swap;
    if (swap.type === MOVES.CIRCLE) {
      const spans = swap.slots.map((s, i) => Math.abs(swap.slots[(i + 1) % 3] - s));
      return Math.abs(at.to - at.from) >= Math.max(...spans) ? amount : -amount * 0.5;
    }
    return swap.cups.indexOf(cupId) === swap.front ? amount : -amount;
  }

  // ── Render ──────────────────────────────────────────────────────────
  render() {
    const ctx = this.ctx;
    const { vW, vH } = this;
    ctx.clearRect(0, 0, vW, vH);

    drawWorld(ctx, this.layout, this.buildView());

    if (this.screen === "menu") return void this.drawMenu(ctx, vW, vH);

    this.drawHud(ctx, vW, vH);

    const banner =
      this.screen === "place" ? this.copy.watch
      : this.screen === "shuffle" ? this.copy.shuffling
      : this.screen === "pick" ? this.copy.pick
      : this.screen === "reveal" ? (this.pickCorrect ? this.copy.hit : this.copy.miss)
      : "";
    if (banner) this.drawBanner(ctx, vW, vH, banner);

    if (this.screen === "over") this.drawOverlay(ctx, vW, vH);
    if (this.paused) this.drawOverlay(ctx, vW, vH, this.copy.paused, this.copy.resume);
  }

  drawHud(ctx, vW, vH) {
    const s = this.state;
    const pad = Math.round(vH * 0.03);
    ctx.save();
    ctx.textBaseline = "top";

    ctx.font = `800 ${Math.round(vH * 0.038)}px system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText(`${this.copy.level} ${s.level}`, pad, pad);

    ctx.fillStyle = PALETTE.gold;
    ctx.font = `900 ${Math.round(vH * 0.05)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(String(s.score), vW / 2, pad);

    ctx.textAlign = "right";
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = `800 ${Math.round(vH * 0.038)}px system-ui, sans-serif`;
    ctx.fillText("●".repeat(s.lives) + "○".repeat(Math.max(0, 3 - s.lives)), vW - pad, pad);

    if (s.streak > 1) {
      ctx.textAlign = "left";
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `800 ${Math.round(vH * 0.03)}px system-ui, sans-serif`;
      ctx.fillText(`${this.copy.streak} ×${s.streak}`, pad, pad + vH * 0.05);
    }
    ctx.restore();
  }

  drawBanner(ctx, vW, vH, text) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 ${Math.round(vH * 0.045)}px system-ui, sans-serif`;
    ctx.lineWidth = Math.max(3, vH * 0.008);
    ctx.strokeStyle = "rgba(4, 9, 16, 0.85)";
    ctx.strokeText(text, vW / 2, vH * 0.17);
    ctx.fillStyle =
      this.screen === "reveal"
        ? this.pickCorrect ? "#7ee7a8" : "#ff7a6a"
        : PALETTE.text;
    ctx.fillText(text, vW / 2, vH * 0.17);
    ctx.restore();
  }

  drawMenu(ctx, vW, vH) {
    ctx.save();
    ctx.fillStyle = "rgba(4, 9, 16, 0.72)";
    ctx.fillRect(0, 0, vW, vH);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = PALETTE.gold;
    ctx.font = `900 ${Math.round(vH * 0.1)}px system-ui, sans-serif`;
    ctx.fillText(this.copy.title, vW / 2, vH * 0.3);

    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 ${Math.round(vH * 0.035)}px system-ui, sans-serif`;
    ctx.fillText(this.copy.subtitle, vW / 2, vH * 0.42);

    if (this.state.bestStreak > 0) {
      ctx.fillStyle = PALETTE.textDim;
      ctx.font = `700 ${Math.round(vH * 0.03)}px system-ui, sans-serif`;
      ctx.fillText(`${this.copy.best}: ${this.state.bestStreak}`, vW / 2, vH * 0.52);
    }

    ctx.fillStyle = PALETTE.gold;
    ctx.font = `800 ${Math.round(vH * 0.05)}px system-ui, sans-serif`;
    ctx.fillText(`▶ ${this.copy.start}`, vW / 2, vH * 0.66);
    ctx.restore();
  }

  drawOverlay(ctx, vW, vH, title, sub) {
    ctx.save();
    ctx.fillStyle = "rgba(4, 9, 16, 0.74)";
    ctx.fillRect(0, 0, vW, vH);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = PALETTE.gold;
    ctx.font = `900 ${Math.round(vH * 0.075)}px system-ui, sans-serif`;
    ctx.fillText(title ?? this.copy.gameOver, vW / 2, vH * 0.38);

    if (!title) {
      ctx.fillStyle = PALETTE.text;
      ctx.font = `700 ${Math.round(vH * 0.04)}px system-ui, sans-serif`;
      ctx.fillText(`${this.copy.finalScore}: ${this.state.score}`, vW / 2, vH * 0.5);
      ctx.fillStyle = PALETTE.textDim;
      ctx.font = `700 ${Math.round(vH * 0.032)}px system-ui, sans-serif`;
      ctx.fillText(`${this.copy.best}: ${this.state.bestStreak}`, vW / 2, vH * 0.58);
    }

    ctx.fillStyle = PALETTE.text;
    ctx.font = `800 ${Math.round(vH * 0.04)}px system-ui, sans-serif`;
    ctx.fillText(`▶ ${sub ?? this.copy.again}`, vW / 2, vH * 0.7);
    ctx.restore();
  }
}
