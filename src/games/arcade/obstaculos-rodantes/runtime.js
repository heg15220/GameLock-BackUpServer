// Obstáculos Rodantes — runtime for the "Rolling Obstacles" minigame.
//
// The rules come from the Wii Party minigame: four runners sprint down a long
// wooden bridge while logs and barrels roll toward them, and the first one over
// the line wins. The original's control is the whole design — "shake once to
// jump, shake repeatedly to hang in the air and clear the big ones" — so this
// keeps both halves: a press jumps, and extra presses *while already airborne*
// buy a little more height and hang time.
//
// That is what makes the obstacle spacing a decision rather than a reflex test.
// A jump spends about 3.3 metres of track above barrel height, and the tightest
// pair the track ever builds is 3.8 metres apart, so a lone barrel is a jump and
// a pair is a jump you have to keep alive by mashing. Hitting something is not
// fatal, it is expensive: you stumble and lose most of your speed for a moment,
// which is exactly how a race is lost to three rivals who did not.
//
// Everything is driven through `advanceTime(ms)` in fixed steps, so a race is
// deterministic: same seed, same track, same rivals.

import { getCopy } from "./copy.js";

export const TRACK_M = 100;          // length of the bridge
export const BASE_SPEED = 9.2;       // metres per second at full tilt
export const START_SPEED = 6.4;      // runners build up to race pace
export const RUN_ACCEL = 5.8;        // metres per second squared
export const IMPACT_BRAKE = 18;      // how sharply a collision kills momentum
export const ROLL_SPEED = 1.8;       // obstacles genuinely roll toward the field
export const GRAVITY = 34;           // metres per second squared
// A jump peaks at JUMP_V^2/(4*GRAVITY) = 1.59m, well clear of a 1.05m barrel,
// which leaves roughly 3.3m of track spent above barrel height. That is a
// forgiving window for one obstacle and deliberately not enough for two: the
// closest pair the track ever builds is 3.8m apart, so a pair is where the
// mid-air presses stop being optional.
export const JUMP_V = 10.4;          // launch speed of a jump
export const HOVER_V = 3.4;          // extra lift bought by one mid-air press
export const MAX_HOVERS = 3;         // how many of those a single jump allows
export const MAX_HEIGHT = 2.4;       // ceiling, so mashing cannot fly the track
export const HOVER_COOLDOWN_MS = 105;// repeated shakes are impulses, not a teleport
export const STUMBLE_MS = 700;       // how long a hit costs you
export const STUMBLE_SPEED = 2.4;    // target speed while recovering from impact
export const RUNNER_HALF_WIDTH = 0.32;
export const RUNNER_COUNT = 4;
const STEP_MS = 16.6667;             // fixed physics step

export const DIFFICULTIES = ["facil", "normal", "dificil"];

// Per difficulty: how dense the track is, and how good the rivals are at it.
const TUNING = {
  facil:   { gapMin: 6.5, gapMax: 9.5, barrelChance: 0.3, rivalSkill: [0.62, 0.55, 0.48], rivalPace: [1.0, 0.98, 0.96] },
  normal:  { gapMin: 4.6, gapMax: 7.6, barrelChance: 0.42, rivalSkill: [0.78, 0.72, 0.66], rivalPace: [1.02, 1.0, 0.99] },
  dificil: { gapMin: 3.8, gapMax: 6.4, barrelChance: 0.52, rivalSkill: [0.9, 0.86, 0.8], rivalPace: [1.05, 1.03, 1.01] },
};

// A log is low enough to skim; a barrel needs a real jump or a hover.
export const OBSTACLE = {
  log:    { height: 0.55, halfWidth: 1 },
  barrel: { height: 1.05, halfWidth: 0.78 },
};

const BEST_KEY = "obstaculosBestMs";
const WINS_KEY = "obstaculosWins";

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

/** Lay out the bridge: obstacles from 10m to 92m, spaced by difficulty. */
export function buildTrack(rng, difficulty) {
  const t = TUNING[difficulty] ?? TUNING.normal;
  const obstacles = [];
  let pos = 10 + rng() * 3;
  while (pos < TRACK_M - 8) {
    const kind = rng() < t.barrelChance ? "barrel" : "log";
    obstacles.push({ pos, kind, ...OBSTACLE[kind] });
    pos += t.gapMin + rng() * (t.gapMax - t.gapMin);
  }
  return obstacles;
}

/** Would a runner at height `y` clear this obstacle? */
export function clears(obstacle, y) {
  return y > obstacle.height;
}

export class ObstaculosRuntime {
  constructor(options = {}) {
    this.onSnapshot = typeof options.onSnapshot === "function" ? options.onSnapshot : () => {};
    this.onFullscreen = typeof options.onFullscreen === "function" ? options.onFullscreen : null;
    this.locale = options.locale === "en" ? "en" : "es";
    this.audio = options.audio ?? null;

    const seed = Number.isFinite(options.seed) ? options.seed : (Date.now() >>> 0);
    this.seed = seed;
    this.rng = mulberry32(seed);

    this.difficulty = DIFFICULTIES.includes(options.difficulty) ? options.difficulty : "normal";
    this.state = "menu"; // menu | racing | won | lost
    this.paused = false;
    this.raceMs = 0;
    this.accMs = 0;

    this.obstacles = [];
    this.runners = [];
    this.hits = 0;
    this.finishOrder = [];
    this.bestMs = readStoredInt(BEST_KEY);
    this.wins = readStoredInt(WINS_KEY);
    this.raf = null;

    this._resetRunners();
    this.emit();
  }

  _resetRunners() {
    this.runners = Array.from({ length: RUNNER_COUNT }, (_, i) => ({
      id: i === 0 ? "you" : `cpu${i}`,
      isHuman: i === 0,
      lane: i,
      dist: 0,
      speed: START_SPEED,
      y: 0,
      vy: 0,
      airborne: false,
      hoversLeft: 0,
      hoverCooldownMs: 0,
      stumbleMs: 0,
      finishedMs: null,
      nextObstacle: 0, // index of the next obstacle this runner meets
      aiDecisionObstacle: -1,
      aiWillJump: false,
      aiHoverUsed: false,
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

  // Fixed-step integration: the jump arc has to be the same whatever frame rate
  // the device manages, or the same track is a different game on a slow phone.
  _advance(dtMs) {
    if (this.state !== "racing") {
      this.emit();
      return;
    }
    this.accMs += dtMs;
    let guard = 0;
    while (this.accMs >= STEP_MS && guard < 240) {
      guard += 1;
      this.accMs -= STEP_MS;
      this._step(STEP_MS / 1000);
      if (this.state !== "racing") break;
    }
    this.emit();
  }

  _step(dt) {
    this.raceMs += dt * 1000;
    const tuning = TUNING[this.difficulty];

    // These are rolling hazards rather than painted markers. Moving every one
    // by the same amount preserves their authored gaps and ordering.
    for (const obstacle of this.obstacles) obstacle.pos -= ROLL_SPEED * dt;

    for (const runner of this.runners) {
      if (runner.finishedMs != null) continue;

      if (runner.stumbleMs > 0) runner.stumbleMs = Math.max(0, runner.stumbleMs - dt * 1000);
      runner.hoverCooldownMs = Math.max(0, runner.hoverCooldownMs - dt * 1000);

      const paceIndex = runner.isHuman ? -1 : runner.lane - 1;
      const pace = runner.isHuman ? 1 : tuning.rivalPace[paceIndex] ?? 1;

      // Rivals now use the same jump arc and collision test as the player.
      // Difficulty only changes whether they read each obstacle correctly.
      if (!runner.isHuman) {
        const next = this.obstacles[runner.nextObstacle];
        if (next && runner.aiDecisionObstacle !== runner.nextObstacle) {
          runner.aiDecisionObstacle = runner.nextObstacle;
          const skill = tuning.rivalSkill[paceIndex] ?? 0.7;
          const penalty = next.kind === "barrel" ? 0.1 : 0;
          runner.aiWillJump = this.rng() < skill - penalty;
          runner.aiHoverUsed = false;
        }
        if (next && runner.aiWillJump) {
          const closingSpeed = Math.max(1, runner.speed + ROLL_SPEED);
          const reactionM = Math.max(2.15, closingSpeed * 0.27);
          const ahead = next.pos - runner.dist;
          if (!runner.airborne && ahead <= reactionM && ahead > -0.4) {
            runner.airborne = true;
            runner.vy = JUMP_V * (0.96 + this.rng() * 0.04);
            runner.hoversLeft = 1;
          }
          const following = this.obstacles[runner.nextObstacle + 1];
          const tightPair = following && following.pos - next.pos < 4.6;
          if (runner.airborne && tightPair && !runner.aiHoverUsed && ahead < 1.25 && runner.y > 0.55) {
            runner.aiHoverUsed = true;
            runner.hoversLeft = 0;
            runner.vy = Math.max(runner.vy, 0) + HOVER_V * 0.8;
          }
        }
      }

      if (runner.airborne) {
        runner.vy -= GRAVITY * dt;
        runner.y += runner.vy * dt;
        if (runner.y > MAX_HEIGHT) {
          runner.y = MAX_HEIGHT;
          runner.vy = Math.min(runner.vy, 0);
        }
        if (runner.y <= 0) {
          runner.y = 0;
          runner.vy = 0;
          runner.airborne = false;
          runner.hoversLeft = 0;
          runner.hoverCooldownMs = 0;
        }
      }

      // Momentum is continuous. A hit applies a strong braking impulse and the
      // runner then accelerates back to pace instead of snapping between two
      // constant speeds.
      const targetSpeed = runner.stumbleMs > 0 ? STUMBLE_SPEED : BASE_SPEED * pace;
      const rate = runner.stumbleMs > 0 ? IMPACT_BRAKE : RUN_ACCEL;
      const speedDelta = Math.max(-rate * dt, Math.min(rate * dt, targetSpeed - runner.speed));
      runner.speed = Math.max(0, runner.speed + speedDelta);
      const before = runner.dist;
      runner.dist += runner.speed * dt;

      // Swept front-edge contact prevents tunnelling at low frame rates and
      // makes the obstacle width part of the collision instead of a point test.
      while (
        runner.nextObstacle < this.obstacles.length &&
        this.obstacles[runner.nextObstacle].pos - this.obstacles[runner.nextObstacle].halfWidth <= runner.dist + RUNNER_HALF_WIDTH
      ) {
        const obstacle = this.obstacles[runner.nextObstacle];
        runner.nextObstacle += 1;
        const beforeFront = before + RUNNER_HALF_WIDTH;
        if (obstacle.pos + obstacle.halfWidth < beforeFront) continue;

        const cleared = clears(obstacle, runner.y);

        if (!cleared) {
          runner.stumbleMs = STUMBLE_MS;
          runner.speed = Math.max(STUMBLE_SPEED, runner.speed * 0.38);
          runner.airborne = false;
          runner.y = 0;
          runner.vy = 0;
          runner.hoversLeft = 0;
          if (runner.isHuman) {
            this.hits += 1;
            this.audio?.playHit?.();
          }
        }
      }

      if (runner.dist >= TRACK_M) {
        runner.dist = TRACK_M;
        runner.finishedMs = this.raceMs;
        this.finishOrder.push(runner.id);
        if (runner.isHuman) this._finish();
      }
    }

    // The race is over once the human is home; if every rival beats them, it
    // ends too rather than making the player run a lap on their own.
    if (this.state === "racing" && this.finishOrder.length >= RUNNER_COUNT) this._finish();
  }

  // ── Race flow ────────────────────────────────────────────────────────────
  setDifficulty(difficulty) {
    if (!DIFFICULTIES.includes(difficulty)) return;
    this.difficulty = difficulty;
    this.emit();
  }

  startRace(difficulty) {
    if (difficulty) this.setDifficulty(difficulty);
    this.obstacles = buildTrack(this.rng, this.difficulty);
    this._resetRunners();
    this.raceMs = 0;
    this.accMs = 0;
    this.hits = 0;
    this.finishOrder = [];
    this.paused = false;
    this.state = "racing";
    this.audio?.unlock?.();
    this.emit();
  }

  restart() {
    if (this.state === "menu") return;
    this.startRace();
  }

  backToMenu() {
    this.state = "menu";
    this.paused = false;
    this.emit();
  }

  /**
   * One shake of the remote. On the ground it launches a jump; in the air it
   * buys extra hang time, which is the only way to clear a tight pair.
   */
  jump() {
    if (this.state !== "racing" || this.paused) return;
    const you = this.runners[0];
    if (you.finishedMs != null) return;

    if (!you.airborne) {
      you.airborne = true;
      you.vy = JUMP_V;
      you.hoversLeft = MAX_HOVERS;
      you.hoverCooldownMs = HOVER_COOLDOWN_MS;
      this.audio?.playJump?.();
      return;
    }
    if (you.hoversLeft > 0 && you.y < MAX_HEIGHT && you.hoverCooldownMs <= 0) {
      you.hoversLeft -= 1;
      you.hoverCooldownMs = HOVER_COOLDOWN_MS;
      you.vy = Math.min(JUMP_V * 0.78, Math.max(you.vy, -0.5) + HOVER_V);
      this.audio?.playHover?.();
    }
  }

  _finish() {
    const you = this.runners[0];
    const place = this.finishOrder.indexOf("you");
    const won = place === 0;
    this.state = won ? "won" : "lost";
    if (won) {
      this.wins += 1;
      writeStoredInt(WINS_KEY, this.wins);
      const ms = Math.round(you.finishedMs ?? this.raceMs);
      if (this.bestMs === 0 || ms < this.bestMs) {
        this.bestMs = ms;
        writeStoredInt(BEST_KEY, this.bestMs);
      }
      this.audio?.playWin?.();
    } else {
      this.audio?.playLose?.();
    }
    this.emit();
  }

  togglePause() {
    if (this.state !== "racing") return;
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
      case "ArrowUp":
      case "KeyW":
      case "Enter":
        if (this.state === "racing") this.jump();
        else this.startRace();
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
    switch (this.state) {
      case "menu":
        return copy.menuStatus;
      case "racing":
        return `${Math.round(this.runners[0].dist)} / ${TRACK_M} m`;
      case "won":
        return copy.winLead;
      case "lost":
        return copy.loseLead;
      default:
        return null;
    }
  }

  /** Where the human placed, 1-based, or null while still running. */
  placement() {
    const idx = this.finishOrder.indexOf("you");
    return idx < 0 ? null : idx + 1;
  }

  // ── Snapshot ─────────────────────────────────────────────────────────────
  snapshot() {
    const you = this.runners[0];
    return {
      screen: this.state,
      coordinateSystem: "Bridge metres increase toward the finish; canvas origin is top-left with +x right and +y down.",
      statusText: this.statusText(),
      paused: this.paused,
      difficulty: this.difficulty,
      trackM: TRACK_M,
      raceMs: Math.round(this.raceMs),
      hits: this.hits,
      placement: this.placement(),
      wins: this.wins,
      bestMs: this.bestMs,
      you: {
        dist: you.dist,
        speed: you.speed,
        speedRatio: you.speed / BASE_SPEED,
        y: you.y,
        vy: you.vy,
        airborne: you.airborne,
        hoversLeft: you.hoversLeft,
        maxHovers: MAX_HOVERS,
        hoverCooldownMs: you.hoverCooldownMs,
        stumbling: you.stumbleMs > 0,
        impactProgress: you.stumbleMs / STUMBLE_MS,
        finished: you.finishedMs != null,
      },
      runners: this.runners.map((runner) => ({
        id: runner.id,
        isHuman: runner.isHuman,
        lane: runner.lane,
        dist: runner.dist,
        speed: runner.speed,
        y: runner.y,
        airborne: runner.airborne,
        progress: Math.min(1, runner.dist / TRACK_M),
        stumbling: runner.stumbleMs > 0,
        finished: runner.finishedMs != null,
      })),
      // Only the stretch of bridge in view needs to reach the renderer.
      obstacles: this.obstacles
        .filter((o) => o.pos > you.dist - 6 && o.pos < you.dist + 34)
        .map((o) => ({ pos: o.pos, kind: o.kind, height: o.height, halfWidth: o.halfWidth })),
      nextObstacle: this.obstacles[you.nextObstacle]
        ? {
            kind: this.obstacles[you.nextObstacle].kind,
            distanceAhead: this.obstacles[you.nextObstacle].pos - you.dist,
          }
        : null,
      audio: { muted: this.audio?.isMuted?.() ?? false },
    };
  }

  emit() {
    this.onSnapshot(this.snapshot());
  }
}

export default ObstaculosRuntime;
