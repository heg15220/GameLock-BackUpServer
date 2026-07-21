// Distancia Justa — "The Right Distance" runtime.
//
// A target distance is announced. You walk your faceless runner to the right;
// distance signs are painted only for the first 30 metres, then the ground is
// bare and you must judge the rest by feel. Three AI rivals walk their own
// lanes at once. When you confirm (or the 30s clock runs out) everyone's stop
// is measured against the target and the four are ranked by who came closest.
// A match is a fixed series of rounds; placement points decide the champion.
//
// Time flows through `advanceTime(ms)` and the AI stops are drawn from a seeded
// RNG, so a whole match is deterministic and testable.

export const ROUNDS = 5;
export const ROUND_TIME_MS = 30000;
export const ANNOUNCE_MS = 1600;
export const TARGET_MIN_M = 40;
export const TARGET_MAX_M = 180;
export const MARKER_STEP_M = 10; // signs every 10 m on every difficulty
export const MARKER_MAX_M = 30; // ...only up to here, then bare ground
export const FORWARD_SPEED = 14; // m/s
export const BACK_SPEED = 9; // m/s
export const MAX_DISTANCE_M = 260;
export const PLACEMENT_POINTS = [5, 3, 2, 1];

// Per difficulty: `sigma` is the half-normal spread of each AI's absolute error
// in metres, and `viewM` is how many metres fit across a lane's width. The signs
// are always at 10/20/30 m, but a smaller viewM zooms the world in, so the very
// same signs sit visibly farther apart — fewer metres on screen to lean on, and
// harder to gauge how far you still have to walk.
export const DIFFICULTY = {
  facil: { sigma: 14, viewM: 80, label_es: "Fácil", label_en: "Easy" },
  normal: { sigma: 7, viewM: 52, label_es: "Normal", label_en: "Normal" },
  dificil: { sigma: 3, viewM: 26, label_es: "Difícil", label_en: "Hard" },
};

const AI_NAMES = ["Ada", "Beto", "Cleo"];
const AI_COLORS = ["#f97316", "#a3e635", "#f472b6"];
const PLAYER_COLOR = "#67e8f9";
const AI_WALK_SPEED = 12; // m/s the rivals stroll toward their chosen stop

const BEST_KEY = "distanciaJustaBest";

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

function readBest() {
  if (typeof window === "undefined") return 0;
  const n = Number(window.localStorage.getItem(BEST_KEY));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function writeBest(value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BEST_KEY, String(Math.floor(value)));
  } catch {
    // A lost best score is never worth throwing over.
  }
}

// Rank by absolute error ascending; ties share the better placement's points.
export function rankRacers(racers) {
  return racers.map((r) => {
    const closer = racers.filter((o) => o.error < r.error - 1e-9).length;
    return { ...r, rank: closer, points: PLACEMENT_POINTS[Math.min(closer, 3)] };
  });
}

export class DistanciaJustaRuntime {
  constructor(options = {}) {
    this.onSnapshot = typeof options.onSnapshot === "function" ? options.onSnapshot : () => {};
    this.onFullscreen = typeof options.onFullscreen === "function" ? options.onFullscreen : null;
    this.locale = options.locale === "en" ? "en" : "es";
    this.audio = options.audio ?? null;
    this.seed = Number.isFinite(options.seed) ? options.seed : (Date.now() >>> 0);
    this.rng = mulberry32(this.seed);

    this.raf = null;
    this.lastFrameTs = null;

    this.difficulty = "normal";
    this.markerStep = MARKER_STEP_M;
    this.markerMax = MARKER_MAX_M;
    this.viewM = DIFFICULTY.normal.viewM;
    this.state = "menu"; // menu | announce | run | reveal | gameover
    this.round = 0;
    this.best = readBest();

    this.targetM = 0;
    this.timeLeftMs = ROUND_TIME_MS;
    this.announceLeftMs = 0;
    this.moveDir = 0; // -1 back, 0 idle, 1 forward
    this.paused = false;

    // Four racers: index 0 is the player.
    this.racers = this._makeRacers();
    this.lastRound = null;

    this.emit();
  }

  _makeRacers() {
    const player = {
      id: "you",
      isPlayer: true,
      name: null,
      color: PLAYER_COLOR,
      meters: 0,
      confirmed: false,
      walkPhase: 0,
      moving: false,
      stopTarget: null,
      difficultyTag: null,
    };
    const ais = AI_NAMES.map((name, i) => ({
      id: `ai${i}`,
      isPlayer: false,
      name,
      color: AI_COLORS[i],
      meters: 0,
      confirmed: false,
      walkPhase: 0,
      moving: false,
      stopTarget: 0,
      difficultyTag: null,
    }));
    return [player, ...ais];
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  start() {
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") return;
    const loop = (ts) => {
      if (this.lastFrameTs != null) {
        const dt = ts - this.lastFrameTs;
        if (dt > 0) this._update(dt);
      }
      this.lastFrameTs = ts;
      this.emit();
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
    if (Number.isFinite(dt) && dt > 0) this._update(dt);
    return this.snapshot();
  }

  // ── Update ────────────────────────────────────────────────────────────────
  _update(dtMs) {
    if (this.paused) return;
    if (this.state === "announce") {
      this.announceLeftMs -= dtMs;
      if (this.announceLeftMs <= 0) this._beginRun();
      return;
    }
    if (this.state !== "run") return;

    const dt = dtMs / 1000;

    // Player movement.
    const player = this.racers[0];
    if (!player.confirmed && this.moveDir !== 0) {
      const speed = this.moveDir > 0 ? FORWARD_SPEED : BACK_SPEED;
      player.meters = Math.max(0, Math.min(MAX_DISTANCE_M, player.meters + this.moveDir * speed * dt));
      player.moving = true;
      player.walkPhase += dt * 9;
    } else {
      player.moving = false;
    }

    // AI rivals stroll toward their committed stop and halt there.
    for (let i = 1; i < this.racers.length; i += 1) {
      const ai = this.racers[i];
      if (ai.confirmed) {
        ai.moving = false;
        continue;
      }
      const remaining = ai.stopTarget - ai.meters;
      const stepAmt = ai.speed * dt;
      if (remaining <= stepAmt) {
        ai.meters = ai.stopTarget;
        ai.confirmed = true;
        ai.moving = false;
      } else {
        ai.meters += stepAmt;
        ai.moving = true;
        ai.walkPhase += dt * 9;
      }
    }

    // Results wait for everyone: the round only ends once all four runners have
    // committed a point. The 30s clock is the sole fallback.
    this._maybeResolve();
    if (this.state !== "run") return;

    this.timeLeftMs -= dtMs;
    if (this.timeLeftMs <= 0) {
      this.timeLeftMs = 0;
      this._resolveRound();
    }
  }

  _maybeResolve() {
    if (this.state !== "run") return;
    if (this.racers.every((r) => r.confirmed)) this._resolveRound();
  }

  // ── Round flow ──────────────────────────────────────────────────────────────
  _applyDifficulty() {
    this.viewM = DIFFICULTY[this.difficulty].viewM;
  }

  startGame(difficulty) {
    if (difficulty && DIFFICULTY[difficulty]) this.difficulty = difficulty;
    this._applyDifficulty();
    this.round = 1;
    this.racers = this._makeRacers();
    this.lastRound = null;
    this.audio?.unlock?.();
    this._announceRound();
    this.emit();
  }

  _announceRound() {
    const span = TARGET_MAX_M - TARGET_MIN_M;
    this.targetM = TARGET_MIN_M + Math.round(this.rng() * span);
    this.timeLeftMs = ROUND_TIME_MS;
    this.announceLeftMs = ANNOUNCE_MS;
    this.moveDir = 0;

    const sigma = DIFFICULTY[this.difficulty].sigma;
    // Reset positions and commit each AI's intended stop for this round.
    this.racers.forEach((r, i) => {
      r.meters = 0;
      r.confirmed = false;
      r.moving = false;
      r.walkPhase = 0;
      if (i === 0) {
        r.stopTarget = null;
      } else {
        // Per-AI spread nudge so the three rivals differ within the chosen level.
        const factor = 0.75 + this.rng() * 0.5; // 0.75–1.25
        const err = gaussian(this.rng) * sigma * factor;
        r.stopTarget = Math.max(2, Math.min(MAX_DISTANCE_M, this.targetM + err));
        r.speed = AI_WALK_SPEED * (0.9 + this.rng() * 0.25);
        r.difficultyTag = this.difficulty;
      }
    });
    this.state = "announce";
    this.audio?.playAnnounce?.();
  }

  _beginRun() {
    this.state = "run";
    this.emit();
  }

  // Skip the announcement countdown early.
  skipAnnounce() {
    if (this.state === "announce") this._beginRun();
  }

  confirmPlayer() {
    if (this.state !== "run") return;
    const player = this.racers[0];
    if (player.confirmed) return;
    player.confirmed = true;
    player.moving = false;
    this.audio?.playConfirm?.();
    // Do not jump to results: wait for the rivals to finish (or the clock).
    this._maybeResolve();
    this.emit();
  }

  _resolveRound() {
    // Snap any still-walking AI to its committed stop.
    for (let i = 1; i < this.racers.length; i += 1) {
      const ai = this.racers[i];
      ai.meters = ai.stopTarget;
      ai.confirmed = true;
      ai.moving = false;
    }
    const scored = this.racers.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      isPlayer: r.isPlayer,
      meters: Math.round(r.meters * 10) / 10,
      error: Math.abs(r.meters - this.targetM),
    }));
    const ranked = rankRacers(scored).sort((a, b) => a.rank - b.rank || a.error - b.error);

    // Accumulate placement points onto the persistent racer objects.
    ranked.forEach((entry) => {
      const racer = this.racers.find((r) => r.id === entry.id);
      racer.total = (racer.total || 0) + entry.points;
    });

    this.lastRound = ranked.map((e) => ({
      id: e.id,
      name: e.name,
      isPlayer: e.isPlayer,
      color: e.color,
      meters: e.meters,
      error: Math.round(e.error * 10) / 10,
      rank: e.rank,
      points: e.points,
    }));

    const playerEntry = ranked.find((e) => e.isPlayer);
    if (playerEntry && playerEntry.rank === 0) this.audio?.playRoundWin?.();
    else this.audio?.playRoundEnd?.();

    this.state = "reveal";
    this.emit();
  }

  nextRound() {
    if (this.state !== "reveal") return;
    if (this.round >= ROUNDS) {
      this.state = "gameover";
      const playerTotal = this.racers[0].total || 0;
      if (playerTotal > this.best) {
        this.best = playerTotal;
        writeBest(this.best);
      }
      const champ = this._standings()[0];
      if (champ?.isPlayer) this.audio?.playMatchWin?.();
      else this.audio?.playMatchEnd?.();
      this.emit();
      return;
    }
    this.round += 1;
    this._announceRound();
    this.emit();
  }

  _standings() {
    return this.racers
      .map((r) => ({ id: r.id, name: r.name, isPlayer: r.isPlayer, color: r.color, total: r.total || 0 }))
      .sort((a, b) => b.total - a.total);
  }

  restart() {
    this.startGame(this.difficulty);
  }

  backToMenu() {
    this.state = "menu";
    this.round = 0;
    this.racers = this._makeRacers();
    this.lastRound = null;
    this.emit();
  }

  togglePause() {
    if (this.state !== "run" && this.state !== "announce") return;
    this.paused = !this.paused;
    this.emit();
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  setMove(dir) {
    this.moveDir = dir > 0 ? 1 : dir < 0 ? -1 : 0;
  }

  primaryAction() {
    switch (this.state) {
      case "menu":
        this.startGame(this.difficulty);
        break;
      case "announce":
        this.skipAnnounce();
        break;
      case "run":
        this.confirmPlayer();
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

  setDifficulty(difficulty) {
    if (DIFFICULTY[difficulty]) {
      this.difficulty = difficulty;
      this._applyDifficulty();
      this.emit();
    }
  }

  pressVirtualKey(code) {
    switch (code) {
      case "Enter":
        this.primaryAction();
        break;
      case "Space":
        if (this.state === "run") this.confirmPlayer();
        else this.primaryAction();
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

  // ── Snapshot ────────────────────────────────────────────────────────────────
  snapshot() {
    const diff = DIFFICULTY[this.difficulty];
    return {
      screen: this.state,
      difficulty: this.difficulty,
      difficultyLabel: this.locale === "en" ? diff.label_en : diff.label_es,
      round: this.round,
      totalRounds: ROUNDS,
      targetMeters: this.targetM,
      timeLeftSeconds: Math.ceil(this.timeLeftMs / 1000),
      announceActive: this.state === "announce",
      paused: this.paused,
      best: this.best,
      markerMax: this.markerMax,
      markerStep: this.markerStep,
      viewM: this.viewM,
      racers: this.racers.map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        isPlayer: r.isPlayer,
        meters: Math.round(r.meters * 10) / 10,
        confirmed: r.confirmed,
        total: r.total || 0,
      })),
      player: {
        meters: Math.round(this.racers[0].meters * 10) / 10,
        confirmed: this.racers[0].confirmed,
      },
      confirmedCount: this.racers.filter((r) => r.confirmed).length,
      waitingForRivals:
        this.state === "run" && this.racers[0].confirmed && !this.racers.every((r) => r.confirmed),
      lastRound: this.lastRound,
      standings: this.state === "gameover" ? this._standings() : null,
      championId: this.state === "gameover" ? this._standings()[0]?.id ?? null : null,
      audio: { muted: this.audio?.isMuted?.() ?? false },
    };
  }

  emit() {
    this.onSnapshot(this.snapshot());
  }
}

export default DistanciaJustaRuntime;
