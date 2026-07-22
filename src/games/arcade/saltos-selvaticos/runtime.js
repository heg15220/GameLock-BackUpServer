// Saltos Selváticos — "Jungle Jaunt" runtime.
//
// Adapted from the Wii Party minigame: you hang from a jungle vine, pump the
// swing to build momentum and let go at the right instant to fly as far as you
// can. Three AI rivals swing on their own vines at the same time, one lane
// deeper into the canopy each. Farthest jump wins the round; placement points
// across three rounds decide the champion.
//
// The swing is an honest rigid pendulum and the jump an honest projectile, so
// the guide's advice holds literally: more momentum reaches farther, and the
// release window is "roughly at the height of the wooden platform you launch
// from" — that height is exactly PLATFORM_ANGLE, a couple of degrees past the
// true optimum. The faster you swing, the quicker that window sweeps past.
//
// Time flows through `advanceTime(ms)` and every rival decision is drawn from a
// seeded RNG, so a whole match is deterministic and testable.

// Cartoon gravity. A projectile's range grows with the vine length alone
// (R ∝ L) while the swing period goes as √(L/g), so Earth's 9.81 can't give
// both the ~140 m jumps the original shows and a swing you can keep time with.
// One heavier g everywhere buys both, and every equation below stays honest.
export const G = 107; // m/s²
export const VINE_LEN = 57; // m — anchor to grip
export const PIVOT_H = 81; // m — anchor height over the jungle floor
export const PLATFORM_ANGLE = 0.733; // 42°, where the launch platform sits
// A vine is a rope, not a rod: past horizontal it cannot push, so it goes slack
// and drops you. That, not an invented cap, is what limits the swing.
export const ROPE_LIMIT = Math.PI / 2;
export const MIN_ANGLE = 0.12; // a limp vine still counts as swinging
export const SWING_TIME_MS = 60000; // pure safety net — swing as long as you like
export const INTRO_MS = 1500;
export const ROUNDS = 3;
// A pump is a person doing a fixed amount of work, so it adds *energy*, not
// speed: the first pumps swing you up fast and later ones bite less and less.
export const PUMP_ENERGY = 0.55; // rad²/s² added by one perfectly timed pump
// The skill is the *alternation*: the swing reverses every half-period, so
// throwing your weight the way you're already travelling always feeds it, and
// pressing the same button twice necessarily fights the arc. Where in the arc
// you press is a bonus on top, never a penalty — punishing that made the game
// unplayable for anyone without frame-perfect timing.
export const BASE_PUMP = 0.45; // quality floor for a correctly aimed shake
export const WRONG_WAY_QUALITY = -0.25; // thrown against the swing
export const GOOD_PUMP = 0.75; // quality above which a pump counts as well timed
export const DRAG = 0.012; // vine friction: stop pumping and the swing dies
export const PUMP_COOLDOWN_MS = 260; // mashing can't stack pumps
export const PLACEMENT_POINTS = [5, 3, 2, 1];

// Where the platform lip is, in world coordinates centred on the vine anchor.
export const PLATFORM_X = -VINE_LEN * Math.sin(PLATFORM_ANGLE);
export const PLATFORM_H = PIVOT_H - VINE_LEN * Math.cos(PLATFORM_ANGLE);

// Per difficulty: `ampRange` is the swing amplitude the rivals work up to and
// `sigma` the spread of their release-angle error, in radians.
export const DIFFICULTY = {
  facil: { ampRange: [0.95, 1.15], sigma: 0.3, label_es: "Fácil", label_en: "Easy" },
  normal: { ampRange: [1.2, 1.38], sigma: 0.17, label_es: "Normal", label_en: "Normal" },
  dificil: { ampRange: [1.44, 1.54], sigma: 0.07, label_es: "Difícil", label_en: "Hard" },
};

const AI_NAMES = ["Ada", "Beto", "Cleo"];
const AI_COLORS = ["#f59e0b", "#a3e635", "#f472b6"];
const PLAYER_COLOR = "#22d3ee";

const BEST_KEY = "saltosSelvaticosBest";

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

// Box–Muller: one standard-normal sample from two uniforms.
function gaussian(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function readBest() {
  if (typeof window === "undefined") return 0;
  const n = Number(window.localStorage.getItem(BEST_KEY));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : 0;
}

function writeBest(value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BEST_KEY, String(Math.round(value * 10) / 10));
  } catch {
    // A lost personal best is never worth throwing over.
  }
}

// ── Pendulum + projectile maths ─────────────────────────────────────────────
// All exported so the tests can assert the physics instead of the plumbing.

/** Swing amplitude implied by a (angle, angular speed) pair, via energy. */
export function amplitudeOf(theta, omega) {
  const c = Math.cos(theta) - (omega * omega * VINE_LEN) / (2 * G);
  return Math.acos(clamp(c, -1, 1));
}

/** Angular speed at `theta` for a swing of amplitude `amp` (unsigned). */
export function angularSpeedAt(theta, amp) {
  const inner = ((2 * G) / VINE_LEN) * (Math.cos(theta) - Math.cos(amp));
  return Math.sqrt(Math.max(0, inner));
}

/** Grip position for a vine angle, relative to the anchor. */
export function gripAt(theta) {
  return { x: VINE_LEN * Math.sin(theta), y: PIVOT_H - VINE_LEN * Math.cos(theta) };
}

/**
 * Let go at (theta, omega) and fly. Distance is measured from the launch tree
 * itself (the vine's anchor line), the way the original scores it: land back at
 * the trunk and you get nothing. Also returns the launch state the renderer
 * animates.
 */
export function computeJump(theta, omega) {
  const { x, y } = gripAt(theta);
  const vx = VINE_LEN * omega * Math.cos(theta);
  const vy = VINE_LEN * omega * Math.sin(theta);
  // Ballistic time to the floor (y = 0), taking the positive root.
  const flightMs = ((vy + Math.sqrt(vy * vy + 2 * G * Math.max(0, y))) / G) * 1000;
  const t = flightMs / 1000;
  const landX = x + vx * t;
  return {
    x0: x,
    y0: y,
    vx,
    vy,
    flightMs,
    distance: Math.max(0, landX),
    launchSpeed: Math.hypot(vx, vy),
    launchAngle: Math.atan2(vy, vx),
  };
}

/** Distance for a clean forward release at `theta` from a swing of `amp`. */
export function jumpDistance(theta, amp) {
  return computeJump(theta, angularSpeedAt(theta, amp)).distance;
}

/** Analytic flight position `t` ms after release. */
export function flightPoint(jump, tMs) {
  const t = Math.max(0, tMs) / 1000;
  return { x: jump.x0 + jump.vx * t, y: Math.max(0, jump.y0 + jump.vy * t - 0.5 * G * t * t) };
}

/** Rank by distance descending; ties share the better placement's points. */
export function rankJumpers(entries) {
  return entries.map((e) => {
    const ahead = entries.filter((o) => o.distance > e.distance + 1e-9).length;
    return { ...e, rank: ahead, points: PLACEMENT_POINTS[Math.min(ahead, 3)] };
  });
}

export class SaltosSelvaticosRuntime {
  constructor(options = {}) {
    this.onSnapshot = typeof options.onSnapshot === "function" ? options.onSnapshot : () => {};
    this.onFullscreen = typeof options.onFullscreen === "function" ? options.onFullscreen : null;
    this.locale = options.locale === "en" ? "en" : "es";
    this.audio = options.audio ?? null;
    this.seed = Number.isFinite(options.seed) ? options.seed : Date.now() >>> 0;
    this.rng = mulberry32(this.seed);

    this.difficulty = "normal";
    this.state = "menu"; // menu | intro | swing | reveal | gameover
    this.round = 0;
    this.paused = false;
    this.best = readBest();

    this.clockMs = 0; // free-running clock, drives animation phases
    this.stepClockMs = 0; // simulation clock, advances with the physics substeps
    this.introLeftMs = 0;
    this.swingLeftMs = SWING_TIME_MS;
    this.lastRound = null;
    this.pumpFlash = null; // { quality, at } — the renderer's swing feedback

    this.jumpers = this._makeJumpers();
    this.emit();
  }

  _makeJumper(overrides) {
    return {
      theta: -PLATFORM_ANGLE, // standing on the platform, vine pulled back
      omega: 0,
      released: false,
      landed: false,
      forced: false,
      slack: false,
      releaseAngle: null,
      releaseAmp: null,
      jump: null,
      flightMs: 0,
      distance: 0,
      total: 0,
      lastPumpMs: -Infinity,
      pumpArmedDir: 0,
      pumpCount: 0,
      goodPumps: 0,
      spin: 0,
      ...overrides,
    };
  }

  _makeJumpers() {
    const player = this._makeJumper({
      id: "you",
      isPlayer: true,
      name: null,
      color: PLAYER_COLOR,
      lane: 0,
    });
    const ais = AI_NAMES.map((name, i) =>
      this._makeJumper({
        id: `ai${i}`,
        isPlayer: false,
        name,
        color: AI_COLORS[i],
        lane: i + 1,
        targetAmp: 1.2,
        releaseTarget: PLATFORM_ANGLE,
      }),
    );
    return [player, ...ais];
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  start() {
    // The React shell owns the frame loop and calls advanceTime; nothing to do
    // here beyond matching the interface the other arcade runtimes expose.
    this.emit();
  }

  destroy() {
    this.audio?.dispose?.();
  }

  advanceTime(ms = 0) {
    const dt = Number(ms);
    if (Number.isFinite(dt) && dt > 0) this._update(dt);
    return this.snapshot();
  }

  // ── Update ────────────────────────────────────────────────────────────────
  _update(dtMs) {
    if (this.paused) return;
    this.clockMs += dtMs;

    if (this.state === "intro") {
      this.introLeftMs -= dtMs;
      if (this.introLeftMs <= 0) {
        this.state = "swing";
        this.audio?.playGo?.();
      }
      return;
    }
    if (this.state !== "swing") return;

    // Fixed substeps keep the pendulum stable when a frame runs long, and let a
    // single big advanceTime (tests, or a stalled tab) play out to the end.
    const steps = Math.max(1, Math.ceil(dtMs / 12));
    const stepMs = dtMs / steps;
    for (let s = 0; s < steps && this.state === "swing"; s += 1) this._step(stepMs);
  }

  _step(stepMs) {
    const dt = stepMs / 1000;
    this.stepClockMs += stepMs;
    this.swingLeftMs -= stepMs;
    if (this.swingLeftMs <= 0) {
      this.swingLeftMs = 0;
      // Arms give out: everyone still hanging lets go where they are.
      for (const j of this.jumpers) if (!j.released) this._release(j, true);
    }
    for (const j of this.jumpers) {
      if (j.landed) continue;
      if (j.released) {
        j.flightMs += stepMs;
        j.spin += dt * 6;
        if (j.flightMs >= j.jump.flightMs) {
          j.flightMs = j.jump.flightMs;
          j.landed = true;
          if (j.isPlayer) this.audio?.playLand?.();
        }
        continue;
      }
      // Rigid pendulum, semi-implicit Euler, with a whisper of drag so a swing
      // left alone slowly dies and pumping actually has to keep up.
      j.omega += (-(G / VINE_LEN) * Math.sin(j.theta) - DRAG * j.omega) * dt;
      const prevTheta = j.theta;
      j.theta += j.omega * dt;
      if (this._isSlack(j)) {
        this._release(j, false, true);
        continue;
      }
      if (!j.isPlayer) this._thinkAI(j, prevTheta);
    }
    if (this.jumpers.every((j) => j.landed)) this._resolveRound();
  }

  // Rivals pump every time they sweep the bottom of the arc until they reach
  // the amplitude they were assigned, then let go at their (noisy) target angle.
  _thinkAI(ai, prevTheta) {
    const amp = amplitudeOf(ai.theta, ai.omega);
    // With the clock nearly out they take whatever swing they have rather than
    // being torn off the vine at a hopeless angle.
    const outOfTime = this.swingLeftMs < 2500;
    if (
      !outOfTime &&
      amp < ai.targetAmp &&
      Math.abs(ai.theta) < 0.1 &&
      this.stepClockMs - ai.lastPumpMs > PUMP_COOLDOWN_MS
    ) {
      ai.lastPumpMs = this.stepClockMs;
      ai.pumpCount += 1;
      ai.goodPumps += 1;
      this._applyPump(ai, 1);
      // Rivals hold their assigned swing instead of overshooting into the cap,
      // so "hard" still leaves a perfect human some daylight.
      const ceiling = angularSpeedAt(ai.theta, ai.targetAmp);
      ai.omega = clamp(ai.omega, -ceiling, ceiling);
      return;
    }
    const ready = outOfTime || amp >= ai.targetAmp - 0.04;
    // Crossing the release angle on the way up and out, moving forward.
    if (ready && ai.omega > 0 && prevTheta < ai.releaseTarget && ai.theta >= ai.releaseTarget) {
      this._release(ai, false);
    }
  }

  // No ceiling: keep pumping and the swing keeps growing. Past horizontal the
  // rope simply stops being able to hold you — see _isSlack. That is the only
  // thing standing between you and an infinitely long jump, and it means the
  // pump that takes you over 90° commits you to jumping on *this* swing.
  _applyPump(j, quality) {
    const dir = j.omega >= 0 ? 1 : -1;
    const w2 = j.omega * j.omega + PUMP_ENERGY * quality;
    j.omega = dir * Math.sqrt(Math.max(0.0004, w2));
  }

  /**
   * Radial equation for a rope: T/m = L·ω² + g·cos θ. Below horizontal the
   * cosine term keeps it positive, but swing past 90° and there comes a point
   * where the vine can no longer pull you round — it goes slack and you're
   * suddenly a projectile at a hopeless angle.
   */
  _isSlack(j) {
    return VINE_LEN * j.omega * j.omega + G * Math.cos(j.theta) < 0;
  }

  _release(j, forced, slack = false) {
    if (j.released) return;
    j.released = true;
    j.forced = Boolean(forced);
    j.slack = Boolean(slack);
    if (slack) this.audio?.playSlack?.();
    j.jump = computeJump(j.theta, j.omega);
    j.releaseAngle = j.theta;
    j.releaseAmp = amplitudeOf(j.theta, j.omega);
    j.distance = Math.round(j.jump.distance * 10) / 10;
    j.flightMs = 0;
    if (j.jump.flightMs <= 0) j.landed = true;
    if (j.isPlayer) this.audio?.playJump?.();
  }

  // ── Round flow ────────────────────────────────────────────────────────────
  startGame(difficulty) {
    if (difficulty && DIFFICULTY[difficulty]) this.difficulty = difficulty;
    this.round = 1;
    this.jumpers = this._makeJumpers();
    this.lastRound = null;
    this.audio?.unlock?.();
    this._beginRound();
    this.emit();
  }

  _beginRound() {
    const { ampRange, sigma } = DIFFICULTY[this.difficulty];
    this.jumpers.forEach((j) => {
      const total = j.total;
      Object.assign(
        j,
        this._makeJumper({
          id: j.id,
          isPlayer: j.isPlayer,
          name: j.name,
          color: j.color,
          lane: j.lane,
          total,
        }),
      );
      if (!j.isPlayer) {
        j.targetAmp = ampRange[0] + this.rng() * (ampRange[1] - ampRange[0]);
        // A rival aiming for the platform-height cue, missing it by `sigma`.
        j.releaseTarget = clamp(PLATFORM_ANGLE + gaussian(this.rng) * sigma, 0.12, j.targetAmp - 0.04);
      }
    });
    this.swingLeftMs = SWING_TIME_MS;
    this.introLeftMs = INTRO_MS;
    this.pumpFlash = null;
    this.state = "intro";
    this.audio?.playReady?.();
  }

  _resolveRound() {
    const scored = this.jumpers.map((j) => ({
      id: j.id,
      name: j.name,
      color: j.color,
      isPlayer: j.isPlayer,
      distance: j.distance,
      releaseDeg: Math.round(((j.releaseAngle ?? 0) * 180) / Math.PI),
      ampDeg: Math.round(((j.releaseAmp ?? 0) * 180) / Math.PI),
      forced: Boolean(j.forced),
      slack: Boolean(j.slack),
    }));
    const ranked = rankJumpers(scored).sort((a, b) => a.rank - b.rank || b.distance - a.distance);
    ranked.forEach((entry) => {
      const j = this.jumpers.find((x) => x.id === entry.id);
      j.total += entry.points;
    });
    this.lastRound = ranked;

    const you = ranked.find((e) => e.isPlayer);
    if (you && you.distance > this.best) {
      this.best = you.distance;
      writeBest(this.best);
    }
    if (you?.rank === 0) this.audio?.playRoundWin?.();
    else this.audio?.playRoundEnd?.();

    this.state = "reveal";
    this.emit();
  }

  nextRound() {
    if (this.state !== "reveal") return;
    if (this.round >= ROUNDS) {
      this.state = "gameover";
      const champ = this._standings()[0];
      if (champ?.isPlayer) this.audio?.playMatchWin?.();
      else this.audio?.playMatchEnd?.();
      this.emit();
      return;
    }
    this.round += 1;
    this._beginRound();
    this.emit();
  }

  _standings() {
    return this.jumpers
      .map((j) => ({ id: j.id, name: j.name, isPlayer: j.isPlayer, color: j.color, total: j.total }))
      .sort((a, b) => b.total - a.total);
  }

  restart() {
    this.startGame(this.difficulty);
  }

  backToMenu() {
    this.state = "menu";
    this.round = 0;
    this.jumpers = this._makeJumpers();
    this.lastRound = null;
    this.emit();
  }

  togglePause() {
    if (this.state !== "swing" && this.state !== "intro") return;
    this.paused = !this.paused;
    this.emit();
  }

  setDifficulty(difficulty) {
    if (DIFFICULTY[difficulty]) {
      this.difficulty = difficulty;
      this.emit();
    }
  }

  // ── Player input ──────────────────────────────────────────────────────────
  /**
   * One shake of the vine, thrown in a direction: `dir` is -1 for the backswing
   * (◀) and +1 for the forward swing (▶). Omit it and the direction is inferred,
   * which is what the rivals and the tests use.
   *
   * Two things have to be right: *where* you are in the arc (best at the bottom,
   * harmful out at the ends) and *which way* you threw your weight.
   */
  pump(dir) {
    if (this.state !== "swing" || this.paused) return 0;
    const you = this.jumpers[0];
    if (you.released) return 0;
    if (this.stepClockMs - you.lastPumpMs < PUMP_COOLDOWN_MS) return 0;

    const moving = you.omega >= 0 ? 1 : -1;
    // One shake per half-swing. Anything after that in the same sweep is simply
    // ignored, so mashing a single button can never out-earn real alternation.
    if (moving === you.pumpArmedDir) return 0;
    you.pumpArmedDir = moving;
    you.lastPumpMs = this.stepClockMs;
    you.pumpCount += 1;

    const thrown = dir === 1 || dir === -1 ? dir : moving;
    const amp = Math.max(MIN_ANGLE, amplitudeOf(you.theta, you.omega));
    // 1 sweeping the bottom, tailing to 0 at the extremes — a bonus, not a cliff.
    const placement = clamp(1 - Math.abs(you.theta) / amp, 0, 1);
    const quality =
      thrown === moving ? BASE_PUMP + (1 - BASE_PUMP) * placement : WRONG_WAY_QUALITY;

    if (quality > GOOD_PUMP) you.goodPumps += 1;
    this._applyPump(you, quality);
    this.pumpFlash = { quality, dir: thrown, wrongWay: thrown !== moving, at: this.clockMs };
    this.audio?.playPump?.(quality);
    this.emit();
    return quality;
  }

  /** Let go of the vine. */
  jump() {
    if (this.state !== "swing" || this.paused) return;
    const you = this.jumpers[0];
    if (you.released) return;
    this._release(you, false);
    this.emit();
  }

  skipIntro() {
    if (this.state === "intro") {
      this.introLeftMs = 0;
      this.state = "swing";
    }
  }

  primaryAction() {
    switch (this.state) {
      case "menu":
        this.startGame(this.difficulty);
        break;
      case "intro":
        this.skipIntro();
        break;
      case "swing":
        this.jump();
        break;
      case "reveal":
        this.nextRound();
        break;
      case "gameover":
        this.restart();
        break;
      default:
        break;
    }
  }

  pressVirtualKey(code) {
    switch (code) {
      case "Space":
        if (this.state === "swing") this.pump();
        else this.primaryAction();
        break;
      case "Enter":
      case "KeyJ":
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

  // ── Snapshot ──────────────────────────────────────────────────────────────
  snapshot() {
    const diff = DIFFICULTY[this.difficulty];
    const you = this.jumpers[0];
    const amp = you.released ? (you.releaseAmp ?? 0) : amplitudeOf(you.theta, you.omega);
    return {
      screen: this.state,
      difficulty: this.difficulty,
      difficultyLabel: this.locale === "en" ? diff.label_en : diff.label_es,
      round: this.round,
      totalRounds: ROUNDS,
      paused: this.paused,
      best: this.best,
      timeLeftSeconds: Math.ceil(this.swingLeftMs / 1000),
      introActive: this.state === "intro",
      player: {
        released: you.released,
        landed: you.landed,
        distance: you.distance,
        angleDeg: Math.round((you.theta * 180) / Math.PI),
        amplitudeDeg: Math.round((amp * 180) / Math.PI),
        // 0–1 gauge against the rope's own limit: at 100% the vine is about to
        // go slack, so the last few per cent are a gamble rather than a wall.
        power: clamp((amp - PLATFORM_ANGLE) / (ROPE_LIMIT - PLATFORM_ANGLE), 0, 1),
        atRisk: !you.released && amp > ROPE_LIMIT - 0.12,
        slack: Boolean(you.slack),
        // Which of ◀ / ▶ to press right now — always the way you're travelling,
        // so the alternation is legible instead of guessed at. `pumpSweet` marks
        // the sweep through the bottom, where the same press is worth most.
        pumpCue: you.released || this.state !== "swing" ? 0 : you.omega >= 0 ? 1 : -1,
        pumpSweet:
          !you.released &&
          this.state === "swing" &&
          Math.abs(you.theta) < 0.45 * Math.max(MIN_ANGLE, amp),
        // Sticky for a beat so the warning is readable, then it clears itself.
        lastPumpWrongWay:
          Boolean(this.pumpFlash?.wrongWay) && this.clockMs - this.pumpFlash.at < 700,
        // True while the vine sweeps through the platform-height window.
        inWindow:
          !you.released && you.omega > 0 && Math.abs(you.theta - PLATFORM_ANGLE) < 0.14,
        pumpQuality: this.pumpFlash?.quality ?? null,
      },
      jumpers: this.jumpers.map((j) => ({
        id: j.id,
        name: j.name,
        color: j.color,
        isPlayer: j.isPlayer,
        released: j.released,
        landed: j.landed,
        distance: j.distance,
        total: j.total,
      })),
      landedCount: this.jumpers.filter((j) => j.landed).length,
      waitingForRivals:
        this.state === "swing" && you.landed && !this.jumpers.every((j) => j.landed),
      lastRound: this.lastRound,
      standings: this.state === "gameover" ? this._standings() : null,
      championId: this.state === "gameover" ? (this._standings()[0]?.id ?? null) : null,
      audio: { muted: this.audio?.isMuted?.() ?? false },
    };
  }

  emit() {
    this.onSnapshot(this.snapshot());
  }
}

export default SaltosSelvaticosRuntime;
