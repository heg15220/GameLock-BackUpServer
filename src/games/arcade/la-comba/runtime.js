// La Comba — runtime for the "Jump Rope" minigame.
//
// The rules come from the Wii Party minigame: you are not the one jumping, you
// are the one *turning the rope*. Five Miis jump in the middle of the square and
// your job is to keep the rope going in time so they can clear it, until you
// reach the number of jumps you were set. The original phrases the feedback
// exactly as this does: turn in time and musical notes come off them, fall out
// of time and you see them sweat.
//
// So the whole game is one beat clock. Every turn of the rope is a beat, and a
// beat asks for exactly one input inside a window around it. Land it and a
// jumper clears the rope; land it sloppily and the rope wobbles; miss three in a
// row and somebody trips and the rope has to be restarted. The tempo climbs the
// whole time, so a rhythm that was comfortable at jump 10 is not at jump 40 —
// that, rather than any hidden state, is the difficulty curve.
//
// The beat is advanced through `advanceTime(ms)` and inputs are judged against
// the phase it exposes, so a run is fully deterministic and testable.

import { getCopy } from "./copy.js";

export const DIFFICULTIES = ["facil", "normal", "dificil"];
export const ROUND_MS = 60000;
export const TRIP_RECOVER_MS = 1200; // rope stopped after somebody trips
export const MISSES_TO_TRIP = 3;

// Per difficulty: how many jumps you owe, how fast the rope starts and ends,
// how many jumps it takes to get there, and how wide the timing windows are.
export const TUNING = {
  facil:   { target: 25, startMs: 760, endMs: 540, rampJumps: 25, perfectMs: 150, goodMs: 260 },
  normal:  { target: 40, startMs: 680, endMs: 450, rampJumps: 35, perfectMs: 110, goodMs: 200 },
  dificil: { target: 60, startMs: 600, endMs: 360, rampJumps: 45, perfectMs: 80,  goodMs: 150 },
};

const BEST_KEY = "laCombaBestJumps";
const WINS_KEY = "laCombaWins";

function readStoredInt(key) {
  if (typeof window === "undefined") return 0;
  const n = Number(window.localStorage.getItem(key));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function writeStoredInt(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, String(Math.floor(value)));
  } catch {
    // Storage can be denied (private mode); a lost record is never fatal.
  }
}

/** How long one turn of the rope lasts after `jumps` successful jumps. */
export function beatDurationFor(difficulty, jumps) {
  const t = TUNING[difficulty] ?? TUNING.normal;
  const ramp = Math.max(1, t.rampJumps);
  const k = Math.max(0, Math.min(1, jumps / ramp));
  return t.startMs + (t.endMs - t.startMs) * k;
}

/** Judge an input landed `offsetMs` away from the beat it was aimed at. */
export function judge(difficulty, offsetMs) {
  const t = TUNING[difficulty] ?? TUNING.normal;
  const err = Math.abs(offsetMs);
  if (err <= t.perfectMs) return "perfect";
  if (err <= t.goodMs) return "good";
  return "miss";
}

export class LaCombaRuntime {
  constructor(options = {}) {
    this.onSnapshot = typeof options.onSnapshot === "function" ? options.onSnapshot : () => {};
    this.onFullscreen = typeof options.onFullscreen === "function" ? options.onFullscreen : null;
    this.locale = options.locale === "en" ? "en" : "es";
    this.audio = options.audio ?? null;

    this.difficulty = DIFFICULTIES.includes(options.difficulty) ? options.difficulty : "normal";
    this.state = "menu"; // menu | playing | won | lost
    this.paused = false;

    this.msLeft = ROUND_MS;
    this.elapsedMs = 0;
    this.jumps = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.missStreak = 0;
    this.trips = 0;
    this.sync = 1; // 0..1, how in-time the last few beats were

    // The beat clock. `beatMs` is the current period, `phaseMs` how far into the
    // current turn we are, and `beatMs` is recomputed each time a beat lands.
    this.beatMs = beatDurationFor(this.difficulty, 0);
    this.phaseMs = 0;
    this.beatIndex = 0;
    this.usedBeat = -1;      // the beat this input was already spent on
    this.recoverMs = 0;      // rope stopped after a trip
    this.lastJudge = null;   // { kind, offsetMs, at }
    this.judgeAgeMs = 0;

    this.bestJumps = readStoredInt(BEST_KEY);
    this.wins = readStoredInt(WINS_KEY);
    this.raf = null;

    this.emit();
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────
  start() {
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") return;
    let last = null;
    const loop = (ts) => {
      if (last != null) {
        const dt = ts - last;
        if (dt > 0) this.advanceTime(Math.min(60, dt));
      }
      last = ts;
      this.raf = window.requestAnimationFrame(loop);
    };
    this.raf = window.requestAnimationFrame(loop);
  }

  destroy() {
    if (this.raf != null && typeof window !== "undefined") window.cancelAnimationFrame(this.raf);
    this.raf = null;
    this.audio?.dispose?.();
  }

  advanceTime(ms = 0) {
    const dt = Number(ms);
    if (Number.isFinite(dt) && dt > 0 && !this.paused) this._advance(dt);
    return this.snapshot();
  }

  _advance(dtMs) {
    if (this.lastJudge) this.judgeAgeMs += dtMs;
    if (this.state !== "playing") {
      this.emit();
      return;
    }

    this.elapsedMs += dtMs;
    this.msLeft = Math.max(0, ROUND_MS - this.elapsedMs);

    if (this.recoverMs > 0) {
      // The rope is being picked up again; the clock still runs, which is what
      // makes a trip cost something.
      this.recoverMs = Math.max(0, this.recoverMs - dtMs);
      if (this.recoverMs === 0) {
        this.phaseMs = 0;
        this.usedBeat = this.beatIndex;
      }
      if (this.msLeft <= 0) this._finish(false);
      else this.emit();
      return;
    }

    // Advance the rope. Crossing a beat boundary with no input spent on that
    // beat is a miss: the jumpers went over nothing.
    this.phaseMs += dtMs;
    let guard = 0;
    while (this.phaseMs >= this.beatMs && guard < 16) {
      guard += 1;
      this.phaseMs -= this.beatMs;
      // The rope has to get round once before anybody can be asked to land on
      // it, so the very first turn is never scored as a miss. It still accepts
      // an input — swallowing the player's first press would feel broken.
      if (this.beatIndex > 0 && this.usedBeat !== this.beatIndex) this._registerMiss();
      this.beatIndex += 1;
      this.beatMs = beatDurationFor(this.difficulty, this.jumps);
      if (this.state !== "playing") return;
    }

    if (this.msLeft <= 0) this._finish(false);
    else this.emit();
  }

  // ── Round flow ───────────────────────────────────────────────────────────
  setDifficulty(difficulty) {
    if (!DIFFICULTIES.includes(difficulty)) return;
    this.difficulty = difficulty;
    this.beatMs = beatDurationFor(this.difficulty, 0);
    this.emit();
  }

  startRound(difficulty) {
    if (difficulty) this.setDifficulty(difficulty);
    this.state = "playing";
    this.paused = false;
    this.msLeft = ROUND_MS;
    this.elapsedMs = 0;
    this.jumps = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.missStreak = 0;
    this.trips = 0;
    this.sync = 1;
    this.beatMs = beatDurationFor(this.difficulty, 0);
    this.phaseMs = 0;
    this.beatIndex = 0;
    this.usedBeat = -1;
    this.recoverMs = 0;
    this.lastJudge = null;
    this.judgeAgeMs = 0;
    this.audio?.unlock?.();
    this.emit();
  }

  restart() {
    if (this.state === "menu") return;
    this.startRound();
  }

  backToMenu() {
    this.state = "menu";
    this.paused = false;
    this.emit();
  }

  /**
   * One turn of the rope. Judged against whichever beat is nearest — the one
   * just gone or the one coming up — so landing slightly early counts the same
   * as landing slightly late.
   */
  turn() {
    if (this.state !== "playing" || this.paused || this.recoverMs > 0) return;

    const late = this.phaseMs;                 // ms after the beat that just passed
    const early = this.phaseMs - this.beatMs;  // negative ms before the next beat
    const aimingNext = Math.abs(early) < late;
    const beat = aimingNext ? this.beatIndex + 1 : this.beatIndex;
    if (this.usedBeat === beat) return; // one input per turn of the rope

    this.usedBeat = beat;
    const offsetMs = aimingNext ? early : late;
    const kind = judge(this.difficulty, offsetMs);
    this.lastJudge = { kind, offsetMs };
    this.judgeAgeMs = 0;

    if (kind === "miss") {
      this._registerMiss();
      return;
    }

    this.jumps += 1;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.missStreak = 0;
    this.sync = Math.min(1, this.sync + (kind === "perfect" ? 0.25 : 0.12));
    if (kind === "perfect") this.audio?.playPerfect?.();
    else this.audio?.playGood?.();

    const target = TUNING[this.difficulty].target;
    if (this.jumps >= target) this._finish(true);
    else this.emit();
  }

  _registerMiss() {
    this.combo = 0;
    this.missStreak += 1;
    this.sync = Math.max(0, this.sync - 0.34);
    this.lastJudge = { kind: "miss", offsetMs: 0 };
    this.judgeAgeMs = 0;

    if (this.missStreak >= MISSES_TO_TRIP) {
      // Somebody caught a foot. The rope stops and has to be started again.
      this.missStreak = 0;
      this.trips += 1;
      this.recoverMs = TRIP_RECOVER_MS;
      this.sync = 0;
      this.audio?.playTrip?.();
    } else {
      this.audio?.playWobble?.();
    }
    this.emit();
  }

  _finish(won) {
    this.state = won ? "won" : "lost";
    if (this.jumps > this.bestJumps) {
      this.bestJumps = this.jumps;
      writeStoredInt(BEST_KEY, this.bestJumps);
    }
    if (won) {
      this.wins += 1;
      writeStoredInt(WINS_KEY, this.wins);
      this.audio?.playWin?.();
    } else {
      this.audio?.playLose?.();
    }
    this.emit();
  }

  togglePause() {
    if (this.state !== "playing") return;
    this.paused = !this.paused;
    this.emit();
  }

  toggleAudioMuted() {
    const muted = this.audio?.toggleMuted?.() ?? false;
    this.emit();
    return muted;
  }

  // ── Input ────────────────────────────────────────────────────────────────
  pressVirtualKey(code) {
    switch (code) {
      case "Space":
      case "Enter":
      case "ArrowUp":
        if (this.state === "playing") this.turn();
        else this.startRound();
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

  statusText() {
    const copy = getCopy(this.locale);
    const target = TUNING[this.difficulty].target;
    switch (this.state) {
      case "menu":
        return copy.menuStatus;
      case "playing":
        return `${copy.jumps} ${this.jumps}/${target}`;
      case "won":
        return copy.winLead;
      case "lost":
        return copy.loseLead;
      default:
        return null;
    }
  }

  // ── Snapshot ─────────────────────────────────────────────────────────────
  snapshot() {
    const target = TUNING[this.difficulty].target;
    // Rope phase 0..1 around one full turn; the scene draws the rope from it and
    // the jumpers hop at the bottom of the arc.
    const ropePhase = this.recoverMs > 0 ? 0 : this.beatMs > 0 ? this.phaseMs / this.beatMs : 0;
    return {
      screen: this.state,
      statusText: this.statusText(),
      paused: this.paused,
      difficulty: this.difficulty,
      secondsLeft: Math.ceil(this.msLeft / 1000),
      timeProgress: Math.min(1, this.elapsedMs / ROUND_MS),
      jumps: this.jumps,
      target,
      combo: this.combo,
      bestCombo: this.bestCombo,
      trips: this.trips,
      sync: this.sync,
      ropePhase,
      beatMs: this.beatMs,
      recovering: this.recoverMs > 0,
      recoverProgress: this.recoverMs > 0 ? 1 - this.recoverMs / TRIP_RECOVER_MS : 1,
      // The last verdict, and how stale it is, so the scene can fade it out.
      lastJudge: this.lastJudge ? { ...this.lastJudge, ageMs: this.judgeAgeMs } : null,
      bestJumps: this.bestJumps,
      wins: this.wins,
      audio: { muted: this.audio?.isMuted?.() ?? false },
    };
  }

  emit() {
    this.onSnapshot(this.snapshot());
  }
}

export default LaCombaRuntime;
