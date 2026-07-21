// Pulso Exacto — mental-stopwatch runtime.
//
// A round shows a random target time (5.0s–60.0s). The clock counts up and is
// visible only for the first GUIDE_MS as a pacing reference, then hides. The
// player stops it (Space / click / tap) when they believe it reached the
// target; the closer they land, the more points they score. A game is a fixed
// series of ROUNDS.
//
// The runtime owns time through `advanceTime(ms)` and never reads Date.now in
// its update path, so a round is fully deterministic and testable: feed it a
// seed, advance a known number of milliseconds, stop, and the score is fixed.

export const GUIDE_MS = 2000; // clock visible as a pacing guide for this long
export const ROUNDS = 5;
export const MIN_TARGET_MS = 5000; // 5.0s
export const MAX_TARGET_MS = 60000; // 60.0s
export const PERFECT_MS = 100; // |error| <= 0.10s counts as a perfect stop
export const SCORE_WINDOW_MS = 3000; // beyond 3.0s off scores nothing
export const MAX_ROUND_SCORE = 1000;
// Never let a forgotten round run forever: past the scoring window it is a 0
// anyway, so auto-resolve a little beyond it.
const AUTO_STOP_MARGIN_MS = 5000;

const BEST_KEY = "pulsoExactoBest";

// Deterministic PRNG (mulberry32) so a seed reproduces the exact target series.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function readBest() {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(BEST_KEY);
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function writeBest(value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BEST_KEY, String(Math.floor(value)));
  } catch {
    // Storage can be denied (private mode); a lost best score is never fatal.
  }
}

export function scoreForError(errorMs) {
  const err = Math.abs(errorMs);
  if (err <= PERFECT_MS) return MAX_ROUND_SCORE;
  if (err >= SCORE_WINDOW_MS) return 0;
  return Math.round(MAX_ROUND_SCORE * (1 - err / SCORE_WINDOW_MS));
}

export function ratingKeyForTotal(total) {
  const max = ROUNDS * MAX_ROUND_SCORE;
  const ratio = max > 0 ? total / max : 0;
  if (ratio >= 0.9) return "swiss";
  if (ratio >= 0.7) return "master";
  if (ratio >= 0.5) return "steady";
  if (ratio >= 0.3) return "warming";
  return "practice";
}

export class PulsoExactoRuntime {
  constructor(options = {}) {
    this.onSnapshot = typeof options.onSnapshot === "function" ? options.onSnapshot : () => {};
    this.onFullscreen = typeof options.onFullscreen === "function" ? options.onFullscreen : null;
    this.locale = options.locale === "en" ? "en" : "es";
    this.audio = options.audio ?? null;

    const seed = Number.isFinite(options.seed) ? options.seed : (Date.now() >>> 0);
    this.rng = mulberry32(seed);

    this.raf = null;
    this.lastFrameTs = null;

    this.state = "menu"; // menu | ready | running | result | gameover
    this.round = 0;
    this.totalScore = 0;
    this.best = readBest();

    this.targetMs = 0;
    this.elapsedMs = 0;
    this.autoStopMs = null;
    this.paused = false;
    this.lastGuideSecond = -1;
    this.lastResult = null; // { stoppedMs, errorMs, points, perfect }

    this.emit();
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────
  start() {
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
      return; // Test / SSR env: the clock is driven by advanceTime instead.
    }
    const loop = (ts) => {
      if (this.lastFrameTs != null) {
        const dt = ts - this.lastFrameTs;
        if (dt > 0) this._advance(dt);
      }
      this.lastFrameTs = ts;
      this.raf = window.requestAnimationFrame(loop);
    };
    this.raf = window.requestAnimationFrame(loop);
  }

  destroy() {
    if (this.raf != null && typeof window !== "undefined") {
      window.cancelAnimationFrame(this.raf);
    }
    this.raf = null;
    this.audio?.dispose?.();
  }

  // Deterministic stepping used by tests and the QA bridge.
  advanceTime(ms = 0) {
    const dt = Number(ms);
    if (Number.isFinite(dt) && dt > 0) this._advance(dt);
    return this.snapshot();
  }

  _advance(dtMs) {
    if (this.state !== "running" || this.paused) return;
    this.elapsedMs += dtMs;

    // Tick once per whole second while the clock is still visible.
    if (this.elapsedMs < GUIDE_MS) {
      const sec = Math.floor(this.elapsedMs / 1000);
      if (sec !== this.lastGuideSecond) {
        this.lastGuideSecond = sec;
        this.audio?.playTick?.();
      }
    }

    if (this.autoStopMs != null && this.elapsedMs >= this.autoStopMs) {
      this.stopClock();
      return;
    }
    this.emit();
  }

  // ── Round flow ───────────────────────────────────────────────────────────
  startGame() {
    this.round = 1;
    this.totalScore = 0;
    this.lastResult = null;
    this._prepareRound();
    this.audio?.unlock?.();
    this.emit();
  }

  _prepareRound() {
    // Target between 5.0s and 60.0s, quantised to one decimal.
    const span = MAX_TARGET_MS - MIN_TARGET_MS; // in ms
    const steps = span / 100; // 100ms = 0.1s
    const pick = Math.floor(this.rng() * (steps + 1));
    this.targetMs = MIN_TARGET_MS + pick * 100;
    this.elapsedMs = 0;
    this.autoStopMs = this.targetMs + AUTO_STOP_MARGIN_MS;
    this.paused = false;
    this.lastGuideSecond = -1;
    this.state = "ready";
  }

  beginRoundClock() {
    if (this.state !== "ready") return;
    this.elapsedMs = 0;
    this.lastGuideSecond = -1;
    this.state = "running";
    this.audio?.unlock?.();
    this.emit();
  }

  stopClock() {
    if (this.state !== "running") return;
    const stoppedMs = this.elapsedMs;
    const errorMs = stoppedMs - this.targetMs;
    const points = scoreForError(errorMs);
    const perfect = Math.abs(errorMs) <= PERFECT_MS;
    this.lastResult = { stoppedMs, errorMs, points, perfect };
    this.totalScore += points;
    this.state = "result";
    if (perfect) this.audio?.playPerfect?.();
    else if (points > 0) this.audio?.playGood?.();
    else this.audio?.playMiss?.();
    this.emit();
  }

  nextRound() {
    if (this.state !== "result") return;
    if (this.round >= ROUNDS) {
      this.state = "gameover";
      if (this.totalScore > this.best) {
        this.best = this.totalScore;
        writeBest(this.best);
      }
      this.audio?.playFinish?.();
      this.emit();
      return;
    }
    this.round += 1;
    this.lastResult = null;
    this._prepareRound();
    this.emit();
  }

  restart() {
    this.startGame();
  }

  togglePause() {
    if (this.state !== "running") return;
    this.paused = !this.paused;
    this.emit();
  }

  // ── Input ────────────────────────────────────────────────────────────────
  // The stage-wide tap and the primary button both route here so Space, click
  // and touch all read as "the one action this screen expects".
  primaryAction() {
    switch (this.state) {
      case "menu":
        this.startGame();
        break;
      case "ready":
        this.beginRoundClock();
        break;
      case "running":
        this.stopClock();
        break;
      case "result":
        this.nextRound();
        break;
      case "gameover":
        this.startGame();
        break;
      default:
        break;
    }
  }

  pressVirtualKey(code) {
    switch (code) {
      case "Space":
      case "Enter":
        this.primaryAction();
        break;
      case "KeyR":
        this.restart();
        break;
      case "KeyP":
        this.togglePause();
        break;
      case "KeyF":
        this.onFullscreen?.();
        break;
      case "KeyM":
        this.toggleAudioMuted();
        break;
      default:
        break;
    }
  }

  toggleAudioMuted() {
    const muted = this.audio?.toggleMuted?.() ?? false;
    this.emit();
    return muted;
  }

  // ── Snapshot ─────────────────────────────────────────────────────────────
  snapshot() {
    const clockVisible = this.state === "running" && this.elapsedMs < GUIDE_MS;
    let displayMs = null;
    if (this.state === "ready") displayMs = 0;
    else if (clockVisible) displayMs = this.elapsedMs;
    return {
      screen: this.state,
      round: this.round,
      totalRounds: ROUNDS,
      targetSeconds: this.targetMs / 1000,
      elapsedSeconds: this.elapsedMs / 1000,
      displaySeconds: displayMs == null ? null : displayMs / 1000,
      clockVisible,
      paused: this.paused,
      totalScore: this.totalScore,
      best: this.best,
      lastResult: this.lastResult
        ? {
            stoppedSeconds: this.lastResult.stoppedMs / 1000,
            errorSeconds: this.lastResult.errorMs / 1000,
            points: this.lastResult.points,
            perfect: this.lastResult.perfect,
          }
        : null,
      ratingKey: this.state === "gameover" ? ratingKeyForTotal(this.totalScore) : null,
      audio: { muted: this.audio?.isMuted?.() ?? false },
    };
  }

  emit() {
    this.onSnapshot(this.snapshot());
  }
}

export default PulsoExactoRuntime;
