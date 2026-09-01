// El Escondite — runtime for the "Hide and Seek" minigame.
//
// The rules come from the Wii Party minigame: one seeker against three hiders,
// seven hiding places in a park, five searches and thirty seconds. Searching a
// place finds *everyone* in it, and several hiders may share one — so a lucky
// pick can end the round in one go. The seeker wins by finding all three; the
// hiders win if even one is still hidden when the time or the searches run out.
//
// Played straight that is a blind 5-from-7 guess, which is a lottery rather
// than a game. The one thing added here is the thing hide and seek actually
// turns on: **an occupied hiding place gives itself away**. Every so often a
// place with somebody in it twitches — the tube rocks, the dome shakes — for a
// fraction of a second. Difficulty is entirely how often and how long those
// tells last, so paying attention is what improves your odds, not luck.
//
// Time is owned through `advanceTime(ms)`, so a round is deterministic: seed
// it, feed it milliseconds, and the same hiders end up in the same places.

import { getCopy } from "./copy.js";

export const SPOT_COUNT = 7;
export const HIDER_COUNT = 3;
export const MAX_SEARCHES = 5;
export const ROUND_MS = 30000;
export const REVEAL_MS = 900; // how long a searched place shows its result

export const DIFFICULTIES = ["facil", "normal", "dificil"];

// How the hiding places behave per difficulty: how often an occupied one gives
// a tell, how long it lasts, and how much the hiders spread out.
const TUNING = {
  facil:   { tellEveryMs: 1500, tellMs: 620, spread: 0.15 },
  normal:  { tellEveryMs: 2400, tellMs: 420, spread: 0.55 },
  dificil: { tellEveryMs: 3600, tellMs: 260, spread: 1 },
};

const BEST_KEY = "elEscondorBestScore";
const WINS_KEY = "elEscondorWins";

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

/**
 * Where the three hiders go.
 *
 * `spread` is the chance a hider refuses a place somebody already took. At 0
 * they pile in together — one lucky search ends the round — and at 1 they always
 * split up, so the seeker has to find three separate places out of seven with
 * five searches. That is the whole difficulty curve.
 */
export function placeHiders(rng, spread) {
  const spots = [];
  for (let i = 0; i < HIDER_COUNT; i += 1) {
    let spot = Math.floor(rng() * SPOT_COUNT);
    if (spots.includes(spot) && rng() < spread) {
      const free = [];
      for (let s = 0; s < SPOT_COUNT; s += 1) if (!spots.includes(s)) free.push(s);
      if (free.length > 0) spot = free[Math.floor(rng() * free.length)];
    }
    spots.push(spot);
  }
  return spots;
}

/** Points for a win: what is left over when you found them all. */
export function scoreFor(msLeft, searchesLeft) {
  return Math.max(0, Math.round(msLeft / 100) + searchesLeft * 120);
}

export class ElEscondideRuntime {
  constructor(options = {}) {
    this.onSnapshot = typeof options.onSnapshot === "function" ? options.onSnapshot : () => {};
    this.onFullscreen = typeof options.onFullscreen === "function" ? options.onFullscreen : null;
    this.locale = options.locale === "en" ? "en" : "es";
    this.audio = options.audio ?? null;

    const seed = Number.isFinite(options.seed) ? options.seed : (Date.now() >>> 0);
    this.rng = mulberry32(seed);

    this.difficulty = DIFFICULTIES.includes(options.difficulty) ? options.difficulty : "normal";
    this.state = "menu"; // menu | seeking | won | lost
    this.paused = false;
    this.msLeft = ROUND_MS;
    this.elapsedMs = 0;
    this.searchesLeft = MAX_SEARCHES;
    this.bestScore = readStoredInt(BEST_KEY);
    this.wins = readStoredInt(WINS_KEY);
    this.lastScore = 0;

    this.spots = this._freshSpots();
    this.hiderSpots = [];
    this.foundCount = 0;
    this.raf = null;

    this.emit();
  }

  _freshSpots() {
    return Array.from({ length: SPOT_COUNT }, (_, id) => ({
      id,
      searched: false,   // already used a search here
      hits: 0,           // how many hiders were caught here
      revealMs: 0,       // countdown of the "just searched" flash
      tellMs: 0,         // countdown of a visible tell
      nextTellMs: 0,     // when this place next gives itself away
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
    // Reveal flashes and tells run in every state so a finished round settles.
    for (const spot of this.spots) {
      if (spot.revealMs > 0) spot.revealMs = Math.max(0, spot.revealMs - dtMs);
      if (spot.tellMs > 0) spot.tellMs = Math.max(0, spot.tellMs - dtMs);
    }

    if (this.state !== "seeking") {
      this.emit();
      return;
    }

    this.elapsedMs += dtMs;
    this.msLeft = Math.max(0, ROUND_MS - this.elapsedMs);

    // An occupied place gives itself away now and then. A place already
    // searched has nothing left to hide, so it stays still.
    const tuning = TUNING[this.difficulty];
    for (const spot of this.spots) {
      if (spot.searched) continue;
      const occupied = this.hiderSpots.includes(spot.id);
      if (!occupied) continue;
      spot.nextTellMs -= dtMs;
      if (spot.nextTellMs <= 0) {
        spot.tellMs = tuning.tellMs;
        spot.nextTellMs = tuning.tellEveryMs * (0.6 + this.rng() * 0.8);
        this.audio?.playRustle?.();
      }
    }

    if (this.msLeft <= 0) this._finish(false);
    else this.emit();
  }

  // ── Round flow ───────────────────────────────────────────────────────────
  setDifficulty(difficulty) {
    if (!DIFFICULTIES.includes(difficulty)) return;
    this.difficulty = difficulty;
    this.emit();
  }

  startRound(difficulty) {
    if (difficulty) this.setDifficulty(difficulty);
    const tuning = TUNING[this.difficulty];
    this.spots = this._freshSpots();
    this.hiderSpots = placeHiders(this.rng, tuning.spread);
    for (const spot of this.spots) {
      // Stagger the first tell so they do not all fire on the same frame.
      spot.nextTellMs = tuning.tellEveryMs * (0.25 + this.rng() * 0.9);
    }
    this.foundCount = 0;
    this.searchesLeft = MAX_SEARCHES;
    this.elapsedMs = 0;
    this.msLeft = ROUND_MS;
    this.lastScore = 0;
    this.paused = false;
    this.state = "seeking";
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

  /** Search one hiding place. Finds everyone in it, and costs one attempt. */
  search(spotId) {
    if (this.state !== "seeking" || this.paused) return;
    const spot = this.spots[spotId];
    if (!spot || spot.searched) return;

    spot.searched = true;
    spot.revealMs = REVEAL_MS;
    spot.tellMs = 0;
    this.searchesLeft -= 1;

    const hits = this.hiderSpots.filter((s) => s === spotId).length;
    spot.hits = hits;
    this.foundCount += hits;

    if (hits > 0) this.audio?.playFound?.();
    else this.audio?.playEmpty?.();

    if (this.foundCount >= HIDER_COUNT) this._finish(true);
    else if (this.searchesLeft <= 0) this._finish(false);
    else this.emit();
  }

  _finish(won) {
    this.state = won ? "won" : "lost";
    if (won) {
      this.lastScore = scoreFor(this.msLeft, this.searchesLeft);
      this.wins += 1;
      writeStoredInt(WINS_KEY, this.wins);
      if (this.lastScore > this.bestScore) {
        this.bestScore = this.lastScore;
        writeStoredInt(BEST_KEY, this.bestScore);
      }
      this.audio?.playWin?.();
    } else {
      this.lastScore = 0;
      this.audio?.playLose?.();
    }
    this.emit();
  }

  togglePause() {
    if (this.state !== "seeking") return;
    this.paused = !this.paused;
    this.emit();
  }

  toggleAudioMuted() {
    const muted = this.audio?.toggleMuted?.() ?? false;
    this.emit();
    return muted;
  }

  // ── Input ────────────────────────────────────────────────────────────────
  // Keys 1-7 search the matching place, so the game is playable without a
  // pointer; the canvas hit test calls `search` directly.
  pressVirtualKey(code) {
    const digit = /^(Digit|Numpad)([1-7])$/.exec(code);
    if (digit) {
      this.search(Number(digit[2]) - 1);
      return;
    }
    switch (code) {
      case "Space":
      case "Enter":
        if (this.state === "menu" || this.state === "won" || this.state === "lost") {
          this.startRound();
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

  // The mobile status panel prints `statusText` when a runtime offers one and
  // otherwise title-cases the raw screen id, which would read "Seeking".
  statusText() {
    const copy = getCopy(this.locale);
    switch (this.state) {
      case "menu":
        return copy.menuStatus;
      case "seeking":
        return `${copy.found} ${this.foundCount}/${HIDER_COUNT} · ${copy.searches} ${this.searchesLeft}`;
      case "won":
        return copy.winLead;
      case "lost":
        return this.msLeft <= 0 ? copy.loseTime : copy.loseSearches;
      default:
        return null;
    }
  }

  // ── Snapshot ─────────────────────────────────────────────────────────────
  // A place never publishes whether it is occupied until it has been searched
  // or the round is over: leaking that here would leak it on screen.
  snapshot() {
    const over = this.state === "won" || this.state === "lost";
    return {
      screen: this.state,
      statusText: this.statusText(),
      paused: this.paused,
      difficulty: this.difficulty,
      secondsLeft: Math.ceil(this.msLeft / 1000),
      timeProgress: Math.min(1, this.elapsedMs / ROUND_MS),
      searchesLeft: this.searchesLeft,
      maxSearches: MAX_SEARCHES,
      foundCount: this.foundCount,
      hiderCount: HIDER_COUNT,
      wins: this.wins,
      bestScore: this.bestScore,
      lastScore: this.lastScore,
      spots: this.spots.map((spot) => ({
        id: spot.id,
        searched: spot.searched,
        hits: spot.hits,
        // 0..1 flash right after a search, and 0..1 while giving a tell.
        reveal: spot.revealMs > 0 ? spot.revealMs / REVEAL_MS : 0,
        tell: spot.tellMs > 0 ? Math.min(1, spot.tellMs / 260) : 0,
        // Only once the round is decided does the board admit where they were.
        occupied: over ? this.hiderSpots.filter((s) => s === spot.id).length : null,
      })),
      audio: { muted: this.audio?.isMuted?.() ?? false },
    };
  }

  emit() {
    this.onSnapshot(this.snapshot());
  }
}

export default ElEscondideRuntime;
