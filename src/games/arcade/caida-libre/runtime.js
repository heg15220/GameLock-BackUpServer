// Caída Libre — runtime for the "Free Fall" minigame.
//
// The rules come from the Wii Party minigame, and the guide is unusually blunt
// about them: three platforms, each split into two trapdoors, one solid and one
// a cloud, and "la suerte y únicamente la suerte" decides. Fall through twice
// and your flight is over. This does not pretend otherwise — the door is a fair
// coin and nothing in here weights it.
//
// What the original *does* give you, and what this keeps, is the five seconds
// before the doors open. Everybody stands on the platform in plain sight and
// everybody can still move, so the guide's own advice — go where most of your
// rivals are, and at least you share their fate — is something you can act on
// right up to the buzzer. The rivals hesitate, commit and switch on their own
// schedules, so the tension is real even though the odds never move.
//
// Time is owned through `advanceTime(ms)`; a run is deterministic from a seed.

import { getCopy } from "./copy.js";

export const PLATFORMS = 3;
export const STRIKES_OUT = 2;
export const CHOOSE_MS = 5000;
export const OPEN_MS = 1100;   // doors swing, the losers drop
export const SETTLE_MS = 1000; // land on the next platform
export const PLAYER_COUNT = 4;
export const SIDES = ["left", "right"];
export const LATERAL_ACCEL = 42;
export const LATERAL_DAMPING = 9;
export const FALL_GRAVITY = 5.8;

export const DIFFICULTIES = ["facil", "normal", "dificil"];

// Difficulty cannot touch the odds — they are a coin — so it changes how much
// the rivals tell you: how early they commit and how often they change their
// minds. On easy they settle early and stay put, which makes "follow the pack"
// something you can actually do.
const TUNING = {
  facil:   { commitMin: 900,  commitMax: 2200, switchChance: 0.12, herd: 0.75 },
  normal:  { commitMin: 1400, commitMax: 3600, switchChance: 0.34, herd: 0.5 },
  dificil: { commitMin: 2400, commitMax: 4600, switchChance: 0.55, herd: 0.25 },
};

const WINS_KEY = "caidaLibreWins";
const RUNS_KEY = "caidaLibreRuns";

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

/** The odds a player survives all three platforms, for the copy to quote. */
export function survivalOdds() {
  // Fewer than two clouds in three fair flips.
  return 0.5;
}

export class CaidaLibreRuntime {
  constructor(options = {}) {
    this.onSnapshot = typeof options.onSnapshot === "function" ? options.onSnapshot : () => {};
    this.onFullscreen = typeof options.onFullscreen === "function" ? options.onFullscreen : null;
    this.locale = options.locale === "en" ? "en" : "es";
    this.audio = options.audio ?? null;

    const seed = Number.isFinite(options.seed) ? options.seed : (Date.now() >>> 0);
    this.rng = mulberry32(seed);

    this.difficulty = DIFFICULTIES.includes(options.difficulty) ? options.difficulty : "normal";
    this.state = "menu"; // menu | choosing | opening | settling | won | lost
    this.paused = false;
    this.phaseMs = 0;
    this.platform = 0;       // 0-based index of the platform being crossed
    this.badSide = null;     // which door is the cloud, once it is decided
    this.players = [];
    this.wins = readStoredInt(WINS_KEY);
    this.runs = readStoredInt(RUNS_KEY);
    this.score = 0;
    this.streak = 0;
    this.decisionScore = 0;
    this.lockedEarly = false;
    this.raf = null;

    this._resetPlayers();
    this.emit();
  }

  _resetPlayers() {
    this.players = Array.from({ length: PLAYER_COUNT }, (_, i) => ({
      id: i === 0 ? "you" : `cpu${i}`,
      isHuman: i === 0,
      lane: i,
      side: "left",
      x: -0.48,
      targetX: -0.48,
      vx: 0,
      y: 0,
      vy: 0,
      tilt: 0,
      switchPulse: 0,
      strikes: 0,
      out: false,
      fell: false,       // fell through on the platform just resolved
      committed: false,  // a rival has stopped moving
      commitAtMs: 0,
      switchAtMs: null,
    }));
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
    let remaining = dtMs;
    let guard = 0;
    while (remaining > 0 && guard < 32) {
      guard += 1;
      const duration =
        this.state === "choosing" ? CHOOSE_MS
        : this.state === "opening" ? OPEN_MS
        : this.state === "settling" ? SETTLE_MS
        : null;
      if (duration == null) break;

      const used = Math.min(remaining, duration - this.phaseMs);
      const from = this.phaseMs;
      this.phaseMs += used;
      remaining -= used;

      if (this.state === "choosing") this._moveRivals(from, this.phaseMs);
      this._stepPhysics(used);

      if (this.phaseMs < duration) break;
      if (this.state === "choosing") this._openDoors();
      else if (this.state === "opening") this._settle();
      else this._nextPlatform();
    }
    this.emit();
  }

  _stepPhysics(dtMs) {
    let remaining = dtMs / 1000;
    while (remaining > 0) {
      const dt = Math.min(1 / 60, remaining);
      remaining -= dt;
      for (const player of this.players) {
        player.switchPulse = Math.max(0, player.switchPulse - dt * 3.6);

        if (this.state === "choosing") {
          const acceleration = (player.targetX - player.x) * LATERAL_ACCEL - player.vx * LATERAL_DAMPING;
          player.vx += acceleration * dt;
          player.vx = Math.max(-3.2, Math.min(3.2, player.vx));
          player.x += player.vx * dt;
          player.tilt += ((-player.vx * 0.1) - player.tilt) * Math.min(1, dt * 11);
          player.y = 0;
          player.vy = 0;
          continue;
        }

        if (this.state === "opening") {
          if (player.fell) {
            player.vy += FALL_GRAVITY * dt;
            player.y += player.vy * dt;
            player.tilt += (player.vx * 0.11 + (player.lane % 2 ? 0.8 : -0.8)) * dt;
            player.vx *= Math.pow(0.985, dt * 60);
            player.x += player.vx * dt * 0.38;
          } else if (!player.out) {
            player.vy += 7.8 * dt;
            player.y += player.vy * dt;
            if (player.y > 0) {
              player.y = 0;
              player.vy *= -0.28;
              if (Math.abs(player.vy) < 0.15) player.vy = 0;
            }
            player.tilt *= Math.pow(0.82, dt * 60);
          }
          continue;
        }

        if (this.state === "settling" && !player.out) {
          player.y += (0 - player.y) * Math.min(1, dt * 4.8);
          player.x += (player.targetX - player.x) * Math.min(1, dt * 5.2);
          player.vx *= Math.pow(0.7, dt * 60);
          player.vy *= Math.pow(0.7, dt * 60);
          player.tilt *= Math.pow(0.78, dt * 60);
        }
      }
    }
  }

  _setPlayerSide(player, side, pulse = true) {
    player.side = side;
    player.targetX = side === "left" ? -0.48 : 0.48;
    if (pulse) player.switchPulse = 1;
  }

  // Rivals commit at their own moment and may change their minds once. A
  // "herd" rival looks at where everybody else is standing and joins them,
  // which is the tell that makes the guide's own advice playable.
  _moveRivals(fromMs, toMs) {
    const tuning = TUNING[this.difficulty];
    for (const player of this.players) {
      if (player.isHuman || player.out) continue;

      if (!player.committed && player.commitAtMs > fromMs && player.commitAtMs <= toMs) {
        player.committed = true;
        if (this.rng() < tuning.herd) {
          const counts = { left: 0, right: 0 };
          for (const other of this.players) {
            if (other === player || other.out) continue;
            counts[other.side] += 1;
          }
          const side =
            counts.left === counts.right
              ? SIDES[Math.floor(this.rng() * 2)]
              : counts.left > counts.right ? "left" : "right";
          this._setPlayerSide(player, side);
        } else {
          this._setPlayerSide(player, SIDES[Math.floor(this.rng() * 2)]);
        }
      }

      if (
        player.switchAtMs != null &&
        player.switchAtMs > fromMs &&
        player.switchAtMs <= toMs
      ) {
        this._setPlayerSide(player, player.side === "left" ? "right" : "left");
        player.switchAtMs = null;
      }
    }
  }

  // ── Run flow ─────────────────────────────────────────────────────────────
  setDifficulty(difficulty) {
    if (!DIFFICULTIES.includes(difficulty)) return;
    this.difficulty = difficulty;
    this.emit();
  }

  startRun(difficulty) {
    if (difficulty) this.setDifficulty(difficulty);
    this._resetPlayers();
    this.paused = false;
    this.platform = 0;
    this.score = 0;
    this.streak = 0;
    this.runs += 1;
    writeStoredInt(RUNS_KEY, this.runs);
    this.audio?.unlock?.();
    this._beginPlatform();
  }

  restart() {
    if (this.state === "menu") return;
    this.startRun();
  }

  backToMenu() {
    this.state = "menu";
    this.paused = false;
    this.emit();
  }

  _beginPlatform() {
    const tuning = TUNING[this.difficulty];
    this.state = "choosing";
    this.phaseMs = 0;
    this.decisionScore = 0;
    this.lockedEarly = false;
    // The coin is flipped now but never published until the doors open, so
    // nothing on screen can leak it.
    this.badSide = SIDES[Math.floor(this.rng() * 2)];
    for (const player of this.players) {
      player.fell = false;
      player.y = 0;
      player.vy = 0;
      player.tilt = 0;
      if (player.isHuman || player.out) continue;
      player.committed = false;
      this._setPlayerSide(player, SIDES[Math.floor(this.rng() * 2)], false);
      player.commitAtMs = tuning.commitMin + this.rng() * (tuning.commitMax - tuning.commitMin);
      player.switchAtMs =
        this.rng() < tuning.switchChance
          ? player.commitAtMs + 200 + this.rng() * (CHOOSE_MS - player.commitAtMs - 300)
          : null;
    }
    this.emit();
  }

  /** Step onto one of the two trapdoors. Free until the doors open. */
  choose(side) {
    if (this.state !== "choosing" || this.paused) return;
    if (!SIDES.includes(side)) return;
    const you = this.players[0];
    if (you.out) return;
    if (you.side === side) return;
    this._setPlayerSide(you, side);
    this.audio?.playStep?.();
    this.emit();
  }

  /** Commit early and open the doors now. */
  lockIn() {
    if (this.state !== "choosing" || this.paused) return;
    const remainingRatio = Math.max(0, (CHOOSE_MS - this.phaseMs) / CHOOSE_MS);
    this.decisionScore = Math.round(remainingRatio * 250);
    this.score += this.decisionScore;
    this.lockedEarly = true;
    this._openDoors();
  }

  _openDoors() {
    this.state = "opening";
    this.phaseMs = 0;
    for (const player of this.players) {
      if (player.out) continue;
      if (player.side === this.badSide) {
        player.fell = true;
        player.vy = 0.55;
        player.strikes += 1;
        if (player.strikes >= STRIKES_OUT) player.out = true;
      } else {
        player.vy = -1.55;
      }
    }
    const you = this.players[0];
    if (you.fell) {
      this.streak = 0;
      this.audio?.playFall?.();
    } else {
      this.streak += 1;
      this.score += 400 + this.streak * 125;
      this.audio?.playSafe?.();
    }
    this.emit();
  }

  _settle() {
    this.state = "settling";
    this.phaseMs = 0;
    this.emit();
  }

  _nextPlatform() {
    const you = this.players[0];
    if (you.out) {
      this._finish(false);
      return;
    }
    this.platform += 1;
    if (this.platform >= PLATFORMS) {
      this._finish(true);
      return;
    }
    this._beginPlatform();
  }

  _finish(won) {
    this.state = won ? "won" : "lost";
    this.phaseMs = 0;
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
    if (this.state === "menu" || this.state === "won" || this.state === "lost") return;
    this.paused = !this.paused;
    this.emit();
  }

  toggleAudioMuted() {
    const muted = this.audio?.toggleMuted?.() ?? false;
    this.emit();
    return muted;
  }

  // ── Input ────────────────────────────────────────────────────────────────
  // The original holds the remote sideways and uses the d-pad, so left and
  // right are the whole control scheme.
  pressVirtualKey(code) {
    switch (code) {
      case "ArrowLeft":
      case "KeyA":
        this.choose("left");
        break;
      case "ArrowRight":
      case "KeyD":
        this.choose("right");
        break;
      case "Space":
      case "Enter":
        if (this.state === "choosing") this.lockIn();
        else if (this.state === "menu" || this.state === "won" || this.state === "lost") {
          this.startRun();
        }
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
    const you = this.players[0];
    switch (this.state) {
      case "menu":
        return copy.menuStatus;
      case "choosing":
        return `${copy.platform} ${this.platform + 1}/${PLATFORMS} · ${copy.chooseSide}`;
      case "opening":
      case "settling":
        return you.fell ? copy.fellStatus : copy.safeStatus;
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
    const revealed = this.state === "opening" || this.state === "settling"
      || this.state === "won" || this.state === "lost";
    const duration =
      this.state === "choosing" ? CHOOSE_MS
      : this.state === "opening" ? OPEN_MS
      : this.state === "settling" ? SETTLE_MS
      : 1;
    return {
      screen: this.state,
      statusText: this.statusText(),
      paused: this.paused,
      coordinateSystem: "player x is normalized across the platform (-1 left, +1 right); y is fall distance in platform heights, positive downward",
      difficulty: this.difficulty,
      platform: this.platform,
      platforms: PLATFORMS,
      strikesOut: STRIKES_OUT,
      secondsLeft: this.state === "choosing" ? Math.ceil((CHOOSE_MS - this.phaseMs) / 1000) : 0,
      chooseProgress: this.state === "choosing" ? Math.min(1, this.phaseMs / CHOOSE_MS) : 0,
      phaseProgress: Math.min(1, this.phaseMs / duration),
      // The cloud is never published while anyone can still move.
      badSide: revealed ? this.badSide : null,
      wins: this.wins,
      runs: this.runs,
      score: this.score,
      streak: this.streak,
      decisionScore: this.decisionScore,
      lockedEarly: this.lockedEarly,
      crowd: {
        left: this.players.filter((player) => !player.out && player.side === "left").length,
        right: this.players.filter((player) => !player.out && player.side === "right").length,
      },
      players: this.players.map((player) => ({
        id: player.id,
        isHuman: player.isHuman,
        lane: player.lane,
        side: player.side,
        x: Number(player.x.toFixed(3)),
        targetX: player.targetX,
        vx: Number(player.vx.toFixed(3)),
        y: Number(player.y.toFixed(3)),
        vy: Number(player.vy.toFixed(3)),
        tilt: Number(player.tilt.toFixed(3)),
        switchPulse: Number(player.switchPulse.toFixed(3)),
        strikes: player.strikes,
        out: player.out,
        fell: player.fell,
        committed: player.isHuman ? true : player.committed,
      })),
      audio: { muted: this.audio?.isMuted?.() ?? false },
    };
  }

  emit() {
    this.onSnapshot(this.snapshot());
  }
}

export default CaidaLibreRuntime;
