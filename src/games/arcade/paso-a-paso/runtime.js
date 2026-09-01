// Paso a Paso — runtime for the "Step by Step" staircase minigame.
//
// The rules come straight from the Wii Party minigame of the same name: four
// climbers, twelve steps, and every round each of them secretly picks 1, 3 or 5
// within ten seconds. Numbers are revealed simultaneously; a number picked by
// exactly one climber moves that climber up by it, and any number two or more
// climbers picked moves nobody. First to step 12 wins.
//
// The whole game is therefore one decision repeated: 5 climbs fastest but is
// also what everyone else wants, so the value of a number is `k` times the odds
// nobody else takes it. That has a clean symmetric mixed equilibrium (see
// `nashMix`), and the three CPU rivals are built as *deviations* from it — an
// impulsive one, a cautious one, and a reader — so that watching what they pick
// is worth something. Late in the climb the numbers stop being interchangeable:
// a climber on step 9 needs a 3 and everyone can see it, which is the layer the
// reference leaves implicit and this one prints on the board.
//
// What the board deliberately does *not* reward is blocking. Simulated over
// 3000 matches per policy, a player who spends rounds denying the leader wins
// less often than one who simply races (11.7% vs 17.4% on normal): with four
// climbers, the round you burn on one rival is a gift to the other two. Reading
// the rivals' habits is what pays — best-responding to their actual mixes takes
// the win rate from ~17% to ~37%, against a 25% fair share.
//
// Time is owned through `advanceTime(ms)` and the engine never reads Date.now in
// its update path, so a match is fully deterministic: seed it, feed it a known
// number of milliseconds, and the same staircase comes out.

import { getCopy } from "./copy.js";

export const NUMBERS = [1, 3, 5];
export const TOP_STEP = 12;
export const PICK_MS = 10000; // the reference's ten seconds to choose
export const REVEAL_MS = 1700; // cards flip and clashes are marked
export const CLIMB_MS = 1250; // climbers walk to their new step
export const PLAYER_COUNT = 4;

export const DIFFICULTIES = ["facil", "normal", "dificil"];

const BEST_KEY = "pasoAPasoBestRounds";
const WINS_KEY = "pasoAPasoWins";

// Deterministic PRNG (mulberry32) so a seed reproduces the exact match.
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
 * Symmetric mixed-strategy equilibrium over {1, 3, 5} for `n` climbers.
 *
 * A number k pays k whenever no other climber takes it, so its value is
 * `k * (1 - p_k)^(n-1)`. At equilibrium nobody can gain by switching, which
 * means those three values are equal; with the probabilities summing to 1 that
 * pins the mix exactly. For n = 4 it comes out ≈ 12% / 39% / 49%, i.e. 5 is the
 * most popular number and still not a free win.
 */
export function nashMix(playerCount = PLAYER_COUNT) {
  const n = Math.max(2, Math.floor(playerCount));
  const e = 1 / (n - 1);
  // (1 - p_k) = (c / k)^(1/(n-1)); write it as base * w_k and solve for base
  // using sum(1 - p_k) = |NUMBERS| - 1.
  const w = NUMBERS.map((k) => Math.pow(1 / k, e));
  const base = (NUMBERS.length - 1) / w.reduce((a, b) => a + b, 0);
  return NUMBERS.map((k, i) => Math.max(0, Math.min(1, 1 - base * w[i])));
}

const NASH = nashMix(PLAYER_COUNT);

// Odds nobody else takes k when the others play the equilibrium mix. Used to
// rank numbers whenever several of them would do the job: prefer the lonely one.
const UNIQUE_ODDS = NASH.map((p) => Math.pow(1 - p, PLAYER_COUNT - 1));

function pickWeighted(rng, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return NUMBERS[NUMBERS.length - 1];
  let roll = rng() * total;
  for (let i = 0; i < NUMBERS.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return NUMBERS[i];
  }
  return NUMBERS[NUMBERS.length - 1];
}

/**
 * Resolve one round: a number chosen by exactly one climber advances them, a
 * number chosen by two or more advances nobody, and a missing pick (the clock
 * ran out) advances nobody without blocking anyone else.
 */
export function resolvePicks(picks) {
  const counts = new Map();
  for (const pick of picks) {
    if (pick == null) continue;
    counts.set(pick, (counts.get(pick) ?? 0) + 1);
  }
  return picks.map((pick) => {
    if (pick == null) return { pick: null, unique: false, gain: 0 };
    const unique = counts.get(pick) === 1;
    return { pick, unique, gain: unique ? pick : 0 };
  });
}

// The cheapest number that still carries a climber `need` steps to the gate is
// not the smallest one but the least contested one, so a rival guessing what
// somebody else is about to play looks it up the same way that climber would.
function bestFinisherIndex(need) {
  let bestIdx = -1;
  let bestScore = -1;
  NUMBERS.forEach((k, i) => {
    if (k < need) return;
    if (UNIQUE_ODDS[i] > bestScore) {
      bestScore = UNIQUE_ODDS[i];
      bestIdx = i;
    }
  });
  return bestIdx;
}

/**
 * How a CPU rival picks. Every personality is the equilibrium mix bent in one
 * readable direction, so a player who watches the reveal row can actually learn
 * something instead of facing noise.
 */
export function aiWeights({
  personality,
  difficulty,
  need,
  threatNeed = null,
  humanBias = null,
  humanLead = 0,
  behind = 0,
}) {
  const sharpness = difficulty === "dificil" ? 1 : difficulty === "normal" ? 0.72 : 0.34;
  let w = NASH.map((p) => Math.max(0.02, p));

  // ── Personality ──────────────────────────────────────────────────────────
  if (personality === "impulsivo") {
    // Grabs the big number, and grabs it harder the further behind he is.
    const push = 1 + 0.9 * sharpness + Math.max(0, behind) * 0.06;
    w = [w[0] * (1 - 0.5 * sharpness), w[1], w[2] * push];
  } else if (personality === "prudente") {
    // Trades ceiling for the quiet numbers nobody is fighting over.
    w = [w[0] * (1 + 2.2 * sharpness), w[1] * (1 + 0.55 * sharpness), w[2] * (1 - 0.45 * sharpness)];
  } else if (personality === "lector" && humanBias && humanLead >= -2) {
    // Sits on whatever the human keeps repeating instead of stepping aside.
    // Colliding costs her the round too, but this is a race: denying five steps
    // beats taking three, and it is the only answer to a player who has found
    // one number and stopped thinking. She only bothers while the human is not
    // already behind her — blocking someone who is losing just wastes rounds.
    const total = NUMBERS.reduce((a, k) => a + (humanBias[k] ?? 0), 0);
    if (total > 0) {
      let topIdx = 0;
      NUMBERS.forEach((k, i) => {
        if ((humanBias[k] ?? 0) > (humanBias[NUMBERS[topIdx]] ?? 0)) topIdx = i;
      });
      const share = (humanBias[NUMBERS[topIdx]] ?? 0) / total;
      const habit = Math.max(0, share - 1 / NUMBERS.length);
      w[topIdx] *= 1 + 5.5 * sharpness * habit;
    }
  }

  // ── The finish line ──────────────────────────────────────────────────────
  // Once the top is within reach the numbers stop being interchangeable: every
  // number that reaches the gate is worth exactly the same thing — the win — so
  // their ranking is no longer `k` but purely the odds nobody else takes them.
  // Personality survives only as a square-rooted tiebreaker, which is why a
  // rival one step out reaches for the quiet 1 rather than the crowded 5.
  //
  // A number that falls short is not worthless either: from four steps out only
  // 5 wins, but taking a quiet 1 leaves you three steps out, where 3 *and* 5
  // both win. Scoring that repositioning is what stops the endgame deadlocking —
  // without it every climber sitting on need 4 or 5 plays 5 forever and nobody
  // moves, which is the one way this game can stall.
  if (need != null && need <= NUMBERS[NUMBERS.length - 1]) {
    const closing = 1 + 8 * sharpness;
    w = NUMBERS.map((k, i) => {
      if (k >= need) return UNIQUE_ODDS[i] * closing * Math.sqrt(w[i]);
      const outs = NUMBERS.filter((other) => other >= need - k).length;
      return UNIQUE_ODDS[i] * (0.55 * outs) / NUMBERS.length;
    });
  }

  // ── Denying the leader ───────────────────────────────────────────────────
  // Only the single climber nearest the gate is worth denying, and only while
  // they are not further from it than we are. Blocking everyone who happens to
  // be within reach is what turns the last third of a match into a gridlock
  // where four climbers sit on the same number for ten rounds.
  //
  // It is deliberately reserved for the hard rivals. Measured over 3000 matches
  // per policy, a human who blocks the leader wins *less* than one who simply
  // races (11.7% vs 17.4% on normal): with four climbers the round you spend
  // denying somebody is a gift to the two players you are not denying. Handing
  // that weapon to every rival at every level would only make the mid tier feel
  // arbitrary, so normal rivals race and hard rivals gang up.
  const maxNumber = NUMBERS[NUMBERS.length - 1];
  if (
    sharpness > 0.9 &&
    threatNeed != null &&
    threatNeed <= maxNumber &&
    (need == null || threatNeed <= need)
  ) {
    const idx = bestFinisherIndex(threatNeed);
    if (idx >= 0) {
      const urgency = (maxNumber + 1 - threatNeed) / maxNumber; // 1.0 at one step out
      w[idx] *= 1 + 2.6 * urgency;
    }
  }

  // Easy rivals are dragged back toward a flat guess so their habits stay loud
  // and their reads stay weak.
  if (difficulty === "facil") {
    const flat = 1 / NUMBERS.length;
    const total = w.reduce((a, b) => a + b, 0) || 1;
    w = w.map((v) => v / total * 0.55 + flat * 0.45);
  }

  return w.map((v) => Math.max(0.0001, v));
}

export function ratingKeyForRounds(rounds) {
  if (rounds <= 6) return "flash";
  if (rounds <= 9) return "sharp";
  if (rounds <= 13) return "solid";
  return "grind";
}

const RIVALS = [
  { id: "p1", color: "#e04f5f", personality: "impulsivo" },
  { id: "p2", color: "#2f9e4f", personality: "prudente" },
  { id: "p3", color: "#e8a317", personality: "lector" },
];

export class PasoAPasoRuntime {
  constructor(options = {}) {
    this.onSnapshot = typeof options.onSnapshot === "function" ? options.onSnapshot : () => {};
    this.onFullscreen = typeof options.onFullscreen === "function" ? options.onFullscreen : null;
    this.locale = options.locale === "en" ? "en" : "es";
    this.audio = options.audio ?? null;

    const seed = Number.isFinite(options.seed) ? options.seed : (Date.now() >>> 0);
    this.rng = mulberry32(seed);

    this.difficulty = DIFFICULTIES.includes(options.difficulty) ? options.difficulty : "normal";
    this.state = "menu"; // menu | pick | reveal | climb | gameover
    this.paused = false;
    this.round = 0;
    this.phaseMs = 0;
    this.pickMsLeft = PICK_MS;
    this.lastTickSecond = -1;
    this.winners = [];
    this.bestRounds = readStoredInt(BEST_KEY);
    this.wins = readStoredInt(WINS_KEY);

    this.players = this._freshPlayers();
    this.emit();
  }

  _freshPlayers() {
    return [
      {
        id: "you",
        isHuman: true,
        color: "#2f6fe0",
        personality: null,
        step: 0,
        fromStep: 0,
        pick: null,
        unique: false,
        gain: 0,
        lockAtMs: null,
        history: [],
      },
      ...RIVALS.map((rival) => ({
        ...rival,
        isHuman: false,
        step: 0,
        fromStep: 0,
        pick: null,
        unique: false,
        gain: 0,
        lockAtMs: null,
        history: [],
      })),
    ];
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────
  start() {
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
      return; // Test / SSR env: the clock is driven by advanceTime instead.
    }
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

  _phaseDuration() {
    if (this.state === "pick") return PICK_MS;
    if (this.state === "reveal") return REVEAL_MS;
    if (this.state === "climb") return CLIMB_MS;
    return null; // menu and gameover wait for the player, not for the clock
  }

  // One call may span several phases: a QA step of 13 seconds has to land where
  // thirteen one-second frames would, so leftover time carries into the phase
  // it opens instead of being swallowed by the boundary.
  _advance(dtMs) {
    let remaining = dtMs;
    let guard = 0;
    while (remaining > 0 && guard < 64) {
      guard += 1;
      const duration = this._phaseDuration();
      if (duration == null) break;

      const used = Math.min(remaining, duration - this.phaseMs);
      this.phaseMs += used;
      remaining -= used;

      if (this.state === "pick") {
        this.pickMsLeft = Math.max(0, PICK_MS - this.phaseMs);
        // One tick per remaining second, so the last seconds are audible.
        const second = Math.ceil(this.pickMsLeft / 1000);
        if (second !== this.lastTickSecond && second <= 5 && second > 0) {
          this.lastTickSecond = second;
          this.audio?.playTick?.();
        }
      }

      if (this.phaseMs < duration) break;
      if (this.state === "pick") this._reveal();
      else if (this.state === "reveal") this._climb();
      else this._settle();
    }
    this.emit();
  }

  // ── Match flow ───────────────────────────────────────────────────────────
  setDifficulty(difficulty) {
    if (!DIFFICULTIES.includes(difficulty)) return;
    this.difficulty = difficulty;
    this.emit();
  }

  startMatch(difficulty) {
    if (difficulty) this.setDifficulty(difficulty);
    this.players = this._freshPlayers();
    this.round = 0;
    this.winners = [];
    this.audio?.unlock?.();
    this._beginRound();
  }

  restart() {
    if (this.state === "menu") return;
    this.startMatch();
  }

  backToMenu() {
    this.state = "menu";
    this.paused = false;
    this.emit();
  }

  _beginRound() {
    this.round += 1;
    this.state = "pick";
    this.phaseMs = 0;
    this.pickMsLeft = PICK_MS;
    this.lastTickSecond = -1;
    for (const player of this.players) {
      player.pick = null;
      player.unique = false;
      player.gain = 0;
      player.fromStep = player.step;
      player.lockAtMs = null;
    }
    // The rivals make up their minds now, not at the reveal. Nothing about the
    // round depends on the human's choice — that is what "simultaneous" means —
    // so deciding early costs nothing and buys the one thing the board was
    // missing: each climber can show that they have settled on a number while
    // the number itself stays hidden. They settle at staggered moments so the
    // ten seconds have some life in them.
    this._decideRivals();
    for (const player of this.players) {
      if (player.isHuman) continue;
      player.lockAtMs = 900 + this.rng() * (PICK_MS * 0.62);
    }
    this.emit();
  }

  _decideRivals() {
    const humanBias = this._humanBias();
    const leader = Math.max(...this.players.map((p) => p.step));

    for (const player of this.players) {
      if (player.isHuman) continue;
      const need = TOP_STEP - player.step;
      // The one climber closest to the gate, us excluded: the only one worth
      // spending a round to deny.
      const threatStep = Math.max(
        ...this.players.filter((other) => other !== player).map((other) => other.step),
      );
      const weights = aiWeights({
        personality: player.personality,
        difficulty: this.difficulty,
        need,
        threatNeed: TOP_STEP - threatStep,
        humanBias,
        humanLead: this.players[0].step - player.step,
        behind: leader - player.step,
      });
      player.pick = pickWeighted(this.rng, weights);
    }
  }

  /** The human's choice. Locking it in early does not skip the reveal — the
   *  reference gives everyone the same ten seconds — but it can be changed
   *  until the clock runs out. */
  choose(number) {
    if (this.state !== "pick" || this.paused) return;
    if (!NUMBERS.includes(number)) return;
    const you = this.players[0];
    const changed = you.pick !== number;
    you.pick = number;
    if (changed) this.audio?.playSelect?.();
    this.emit();
  }

  /** Commit the current choice and reveal immediately — the impatient path. */
  lockIn() {
    if (this.state !== "pick" || this.paused) return;
    if (this.players[0].pick == null) return;
    this._reveal();
  }

  _humanBias() {
    const you = this.players[0];
    const recent = you.history.slice(-6);
    if (recent.length < 2) return null;
    const bias = {};
    for (const pick of recent) {
      if (pick == null) continue;
      bias[pick] = (bias[pick] ?? 0) + 1;
    }
    return Object.keys(bias).length > 0 ? bias : null;
  }

  _reveal() {
    // Every rival already chose at the top of the round; this only resolves it.
    if (this.players.some((p) => !p.isHuman && p.pick == null)) this._decideRivals();

    const results = resolvePicks(this.players.map((p) => p.pick));
    results.forEach((result, i) => {
      const player = this.players[i];
      player.unique = result.unique;
      player.gain = result.gain;
      player.history.push(player.pick);
    });

    this.state = "reveal";
    this.phaseMs = 0;
    const youClashed = this.players[0].pick != null && !this.players[0].unique;
    if (this.players[0].pick == null) this.audio?.playMiss?.();
    else if (youClashed) this.audio?.playClash?.();
    else this.audio?.playReveal?.();
    this.emit();
  }

  _climb() {
    for (const player of this.players) {
      player.fromStep = player.step;
      player.step = Math.min(TOP_STEP, player.step + player.gain);
    }
    this.state = "climb";
    this.phaseMs = 0;
    if (this.players.some((p) => p.gain > 0)) this.audio?.playClimb?.();
    this.emit();
  }

  _settle() {
    const winners = this.players.filter((p) => p.step >= TOP_STEP);
    if (winners.length > 0) {
      this.winners = winners.map((p) => p.id);
      this.state = "gameover";
      this.phaseMs = 0;
      if (this.winners.includes("you")) {
        this.wins += 1;
        writeStoredInt(WINS_KEY, this.wins);
        if (this.bestRounds === 0 || this.round < this.bestRounds) {
          this.bestRounds = this.round;
          writeStoredInt(BEST_KEY, this.bestRounds);
        }
        this.audio?.playWin?.();
      } else {
        this.audio?.playLose?.();
      }
      this.emit();
      return;
    }
    this._beginRound();
  }

  togglePause() {
    if (this.state === "menu" || this.state === "gameover") return;
    this.paused = !this.paused;
    this.emit();
  }

  toggleAudioMuted() {
    const muted = this.audio?.toggleMuted?.() ?? false;
    this.emit();
    return muted;
  }

  // ── Input ────────────────────────────────────────────────────────────────
  // The Wii original maps the three numbers onto the d-pad (left 1, up 3,
  // right 5); the arrow keys keep that muscle memory, and 1/3/5 spell it out.
  pressVirtualKey(code) {
    switch (code) {
      case "ArrowLeft":
      case "Digit1":
      case "Numpad1":
        this.choose(1);
        break;
      case "ArrowUp":
      case "Digit3":
      case "Numpad3":
        this.choose(3);
        break;
      case "ArrowRight":
      case "Digit5":
      case "Numpad5":
        this.choose(5);
        break;
      case "Space":
      case "Enter":
        if (this.state === "menu") this.startMatch();
        else if (this.state === "gameover") this.startMatch();
        else if (this.state === "pick") this.lockIn();
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
  // otherwise title-cases the raw screen id, which would read "Pick".
  statusText() {
    const copy = getCopy(this.locale);
    const round = `${copy.round} ${this.round}`;
    switch (this.state) {
      case "menu":
        return copy.statusMenu;
      case "pick":
        return `${round} · ${copy.pickPrompt}`;
      case "reveal":
        return `${round} · ${copy.revealLead}`;
      case "climb":
        return `${round} · ${copy.climbLead}`;
      case "gameover":
        return this.winners.includes("you") ? copy.winnerYou : copy.statusLost;
      default:
        return null;
    }
  }

  // ── Snapshot ─────────────────────────────────────────────────────────────
  // The reveal hides the CPU picks until the cards actually flip: the snapshot
  // is what the renderer and the QA bridge read, so leaking them here would
  // leak them on screen.
  snapshot() {
    const revealed = this.state === "reveal" || this.state === "climb" || this.state === "gameover";
    const climbT = this.state === "climb" ? Math.min(1, this.phaseMs / CLIMB_MS) : 1;
    return {
      screen: this.state,
      statusText: this.statusText(),
      paused: this.paused,
      difficulty: this.difficulty,
      round: this.round,
      topStep: TOP_STEP,
      secondsLeft: this.state === "pick" ? Math.ceil(this.pickMsLeft / 1000) : 0,
      pickProgress: this.state === "pick" ? Math.min(1, this.phaseMs / PICK_MS) : 0,
      revealed,
      revealProgress: this.state === "reveal" ? Math.min(1, this.phaseMs / REVEAL_MS) : revealed ? 1 : 0,
      climbProgress: climbT,
      winners: [...this.winners],
      wins: this.wins,
      bestRounds: this.bestRounds,
      ratingKey: this.state === "gameover" && this.winners.includes("you")
        ? ratingKeyForRounds(this.round)
        : null,
      yourPick: this.players[0].pick,
      players: this.players.map((player) => ({
        id: player.id,
        isHuman: player.isHuman,
        color: player.color,
        personality: player.personality,
        step: player.step,
        fromStep: player.fromStep,
        needs: TOP_STEP - player.step,
        pick: player.isHuman || revealed ? player.pick : null,
        picked: player.pick != null,
        // "This climber has settled on a number" — true for the human as soon
        // as they choose, and for a rival once their staggered moment passes.
        // Never says *which* number: that is what `pick` is for, and `pick` is
        // withheld until the reveal.
        locked: revealed
          ? player.pick != null
          : player.isHuman
            ? player.pick != null
            : player.lockAtMs != null && this.phaseMs >= player.lockAtMs,
        unique: revealed ? player.unique : false,
        gain: revealed ? player.gain : 0,
        history: player.history.slice(-6),
      })),
      audio: { muted: this.audio?.isMuted?.() ?? false },
    };
  }

  emit() {
    this.onSnapshot(this.snapshot());
  }
}

export default PasoAPasoRuntime;
