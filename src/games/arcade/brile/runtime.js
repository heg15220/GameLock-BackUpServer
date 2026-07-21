// Brilé — "Dodgeball / balón prisionero" runtime.
//
// A top-down 6v6 dodgeball on a fenced graveyard court split by a centre line.
// You control ONE player of team A (the rest of both teams are AI). Hit an
// in-court rival with a thrown ball (before it bounces) to send them to the
// graveyard (the prisoner strip behind their side); catch a ball in the air to
// send the THROWER there instead. Prisoners keep throwing from the strip and
// return to their court the moment one of their throws lands a hit. A team loses
// when it has no players left in its own court.
//
// Time flows through `advanceTime(ms)` and every random choice comes from a
// seeded RNG, so a whole match is deterministic and testable.

// ── Court geometry (world units) ───────────────────────────────────────────
// Left→right columns: [B-prison][A court][ B court ][A-prison]. Team A (you) own
// the left court; A's brilados wait in the far-right strip (behind B's court),
// and B's brilados wait in the far-left strip. So each court is pincered from
// the front (across the centre line) and the back (its enemy's prison).
export const CEM_W = 42; // prisoner-strip width
export const HALF_W = 128; // one court's width
export const ARENA_W = 2 * (CEM_W + HALF_W); // 340
export const ARENA_H = 120;
export const WALL_MARGIN = 6;
export const CENTER_GAP = 2.5; // no one may step on the centre line
export const BODY_R = 3;
export const HIT_R = 5; // ball-vs-body contact for a hit/catch
export const PICK_R = 6; // reach to scoop a loose ball
export const CENTER_X = ARENA_W / 2; // 170

export const PLAYER_SPEED = 42; // world units / second
export const BALL_SPEED = 132; // thrown-ball speed
export const LOOSE_FRICTION = 2.4; // per-second velocity decay for loose balls
export const TEAM_SIZE = 6; // players per team
export const START_PRISONERS = 1; // each team starts one player in the strip
export const THROW_COOLDOWN_MS = 350; // min gap between a body's throws
export const START_GRACE_MS = 900; // no hits while everyone spreads out
// Pressure ramp: after RAMP_START the field tightens — AI dodge/catch odds fall
// and throws get faster and truer — so a match can't stall in an endless
// dodge/return equilibrium and tension keeps climbing. Symmetric across teams.
export const RAMP_START_MS = 36000;
export const RAMP_DUR_MS = 64000;
export const HARD_CAP_MS = 200000; // absolute safety net; matches end well before

// Per tier: AI throw cadence, aim error, catch/dodge odds, reaction reach and
// the human's catch-arm window. Both teams' AI share the tier — difficulty is the
// overall skill of the field; your edge is being the one human hand on team A.
export const DIFFICULTY = {
  facil: { throwMs: 2200, aimError: 8, catchP: 0.10, dodgeP: 0.34, reactMs: 520, humanCatchMs: 430, label_es: "Fácil", label_en: "Easy" },
  normal: { throwMs: 1550, aimError: 4.5, catchP: 0.20, dodgeP: 0.5, reactMs: 340, humanCatchMs: 360, label_es: "Normal", label_en: "Normal" },
  dificil: { throwMs: 1100, aimError: 2.2, catchP: 0.32, dodgeP: 0.62, reactMs: 220, humanCatchMs: 320, label_es: "Difícil", label_en: "Hard" },
};

const TEAM_COLORS = {
  A: { shirt: "#38bdf8", shirtShade: "#0e7490" },
  B: { shirt: "#f43f5e", shirtShade: "#9f1239" },
};
const SKINS = ["#f2c9a0", "#e0a878", "#c98a5e", "#efc49a", "#e8b98f", "#d69a6a"];
const HAIRS = ["#3a2a1a", "#7c4a24", "#2a2a30", "#b5651d", "#1f2937", "#0f172a"];
const AI_NAMES = ["Ada", "Beto", "Cleo", "Dani", "Eva", "Fabio", "Gala", "Hugo", "Iris", "Jon", "Kira"];

const BEST_KEY = "brileBestWin";

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
  const n = Number(window.localStorage.getItem(BEST_KEY));
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function writeBest(v) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BEST_KEY, String(v));
  } catch {
    // A lost best time is never worth throwing over.
  }
}

const len = (x, y) => Math.hypot(x, y);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Shortest distance from point (px,py) to segment (ax,ay)–(bx,by). Used for the
// swept hit test so a fast throw can't tunnel past a body between frames.
function pointSegDist(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const ab2 = abx * abx + aby * aby;
  let t = ab2 > 0 ? ((px - ax) * abx + (py - ay) * aby) / ab2 : 0;
  t = clamp(t, 0, 1);
  return len(px - (ax + abx * t), py - (ay + aby * t));
}

export class BrileRuntime {
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
    this.state = "menu"; // menu | playing | over
    this.best = readBest();

    this.elapsedMs = 0;
    this.paused = false;
    this.input = { x: 0, y: 0 };
    this.wantThrow = false;
    this.catchArmedUntil = -1;
    this.players = [];
    this.balls = [];
    this.result = null;
    this.stats = { hits: 0, catches: 0 };

    this.emit();
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────
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

  // ── Zones ──────────────────────────────────────────────────────────────────
  // Movement bounds for a body, by team + whether it's in its court or the strip.
  // A team's prison sits behind the ENEMY court, so it is on the opposite flank.
  zoneBounds(p) {
    const yLo = WALL_MARGIN + BODY_R;
    const yHi = ARENA_H - WALL_MARGIN - BODY_R;
    if (p.zone === "court") {
      if (p.team === "A") return { x0: CEM_W + BODY_R, x1: CENTER_X - CENTER_GAP, y0: yLo, y1: yHi };
      return { x0: CENTER_X + CENTER_GAP, x1: ARENA_W - CEM_W - BODY_R, y0: yLo, y1: yHi };
    }
    // prison (graveyard strip)
    if (p.team === "A") return { x0: ARENA_W - CEM_W + CENTER_GAP, x1: ARENA_W - WALL_MARGIN - BODY_R, y0: yLo, y1: yHi };
    return { x0: WALL_MARGIN + BODY_R, x1: CEM_W - CENTER_GAP, y0: yLo, y1: yHi };
  }

  // A point inside p's zone at depth fraction `depthF` (0 = attacking edge / centre
  // line, 1 = back line) and vertical fraction `yF`. Used for spread home slots.
  _zonePoint(p, depthF, yF) {
    const b = this.zoneBounds(p);
    const w = b.x1 - b.x0;
    let x;
    if (p.zone === "court") x = p.team === "A" ? b.x1 - depthF * w : b.x0 + depthF * w;
    else x = p.team === "A" ? b.x0 + depthF * w : b.x1 - depthF * w;
    return { x, y: b.y0 + yF * (b.y1 - b.y0) };
  }

  // Assign each loose ball to the single nearest free AI who can reach it, so the
  // whole team doesn't swarm one ball — whoever is closest (often a back player
  // for a back rebound) claims it while the rest hold their spread.
  _assignBalls() {
    for (const p of this.players) p.chaseBallId = null;
    for (const ball of this.balls) {
      if (ball.state !== "loose") continue;
      let best = null;
      let bd = Infinity;
      for (const p of this.players) {
        if (p.holding || p.isPlayer) continue; // the human steers itself
        if (!this._canReach(p, ball.x, ball.y)) continue;
        const d = len(ball.x - p.x, ball.y - p.y);
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
      if (!best) continue;
      if (best.chaseBallId) {
        const other = this.balls.find((b) => b.id === best.chaseBallId);
        if (other && len(other.x - best.x, other.y - best.y) <= bd) continue; // keep nearer claim
      }
      best.chaseBallId = ball.id;
    }
  }

  // The x-band of the enemy court, where a ball thrown by `team` can land a hit.
  enemyCourtBand(team) {
    if (team === "A") return { x0: CENTER_X + CENTER_GAP, x1: ARENA_W - CEM_W - BODY_R };
    return { x0: CEM_W + BODY_R, x1: CENTER_X - CENTER_GAP };
  }

  // ── Setup ─────────────────────────────────────────────────────────────────
  _courtSlots(team, zone, n) {
    // Spread n bodies over their allowed zone in a tidy 2-column grid.
    const b = this.zoneBounds({ team, zone });
    const cols = zone === "prison" ? 1 : 2;
    const rows = Math.ceil(n / cols);
    const out = [];
    for (let i = 0; i < n; i += 1) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const fx = cols === 1 ? 0.5 : (c + 0.5) / cols;
      const fy = (r + 0.5) / rows;
      // Court bodies hug the centre line side a little; prison bodies centre.
      const xf = zone === "prison" ? fx : (team === "A" ? 0.35 + fx * 0.6 : 0.05 + fx * 0.6);
      out.push({ x: b.x0 + (b.x1 - b.x0) * xf, y: b.y0 + (b.y1 - b.y0) * fy });
    }
    return out;
  }

  _makePlayer(team, index, zone, isPlayer, pos) {
    const pal = TEAM_COLORS[team];
    return {
      id: `${team}${index}`,
      team,
      index,
      isPlayer,
      name: isPlayer ? null : AI_NAMES[(index + (team === "B" ? 6 : 0)) % AI_NAMES.length],
      zone, // court | prison
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      facing: team === "A" ? 1 : -1,
      holding: null, // ball id
      color: pal.shirt,
      shirtShade: pal.shirtShade,
      skin: SKINS[index % SKINS.length],
      hair: HAIRS[index % HAIRS.length],
      throwCdMs: 0,
      aiThrowMs: 0,
      timesHeld: 0, // how often this body has had the ball (for fair passing)
      defBallId: null, // which flight ball this body has reacted to
      defType: null, // catch | dodge | take
      chaseBallId: null, // the one loose ball this body is assigned to fetch
      // Home slot spread over three depth bands × two rows, so free players cover
      // the whole court (front/mid/BACK) instead of all crowding the centre line.
      homeXf: 0.26 + (index % 3) * 0.31,
      homeYf: 0.26 + Math.floor((index % 6) / 3) * 0.48,
      wander: this.rng() * Math.PI * 2,
      hitFlash: 0,
    };
  }

  _spawnTeam(team) {
    const courtN = TEAM_SIZE - START_PRISONERS;
    const courtSlots = this._courtSlots(team, "court", courtN);
    const prisonSlots = this._courtSlots(team, "prison", START_PRISONERS);
    const list = [];
    for (let i = 0; i < courtN; i += 1) {
      const isPlayer = team === "A" && i === 0; // you are A's first court body
      list.push(this._makePlayer(team, i, "court", isPlayer, courtSlots[i]));
    }
    for (let i = 0; i < START_PRISONERS; i += 1) {
      list.push(this._makePlayer(team, courtN + i, "prison", false, prisonSlots[i]));
    }
    return list;
  }

  startGame(difficulty) {
    if (difficulty && DIFFICULTY[difficulty]) this.difficulty = difficulty;
    this.elapsedMs = 0;
    this.paused = false;
    this.result = null;
    this.stats = { hits: 0, catches: 0 };
    this.input = { x: 0, y: 0 };
    this.wantThrow = false;
    this.catchArmedUntil = -1;

    this.players = [...this._spawnTeam("A"), ...this._spawnTeam("B")];

    // Two balls: one loose in the middle of each court, so both teams open with
    // a scramble instead of standing around.
    const aBand = this.zoneBounds({ team: "A", zone: "court" });
    const bBand = this.zoneBounds({ team: "B", zone: "court" });
    this.balls = [
      this._makeBall("ball0", (aBand.x0 + aBand.x1) / 2, ARENA_H * 0.5),
      this._makeBall("ball1", (bBand.x0 + bBand.x1) / 2, ARENA_H * 0.5),
    ];

    this.state = "playing";
    this.audio?.unlock?.();
    this.audio?.playWhistle?.();
    this.emit();
  }

  _makeBall(id, x, y) {
    return { id, state: "loose", x, y, vx: 0, vy: 0, owner: null, team: null, thrownBy: null, prevX: x, prevY: y, live: false, entered: false, pass: false, passTo: null };
  }

  // Snap a loose ball to the nearest zone whose occupants can actually scoop it,
  // so a ball can never come to rest in the wall border or the centre-line gap
  // where no one is allowed to stand. An EMPTY prison strip hands the ball to the
  // adjacent court instead of stranding it (a ball behind you is the other side's).
  _settleLooseBall(ball) {
    let team;
    let zone;
    if (ball.x < CEM_W) { team = "B"; zone = "prison"; } // far-left strip
    else if (ball.x < CENTER_X) { team = "A"; zone = "court"; }
    else if (ball.x < ARENA_W - CEM_W) { team = "B"; zone = "court"; }
    else { team = "A"; zone = "prison"; } // far-right strip
    if (zone === "prison" && !this.players.some((p) => p.team === team && p.zone === "prison")) {
      zone = "court";
      team = ball.x < CENTER_X ? "A" : "B";
    }
    const b = this.zoneBounds({ team, zone });
    ball.x = clamp(ball.x, b.x0, b.x1);
    ball.y = clamp(ball.y, b.y0, b.y1);
    ball.vx = 0;
    ball.vy = 0;
  }

  _dropLoose(ball) {
    ball.state = "loose";
    ball.live = false;
    ball.entered = false;
    ball.team = null;
    ball.thrownBy = null;
    ball.owner = null;
    this._settleLooseBall(ball);
  }

  // ── Queries ─────────────────────────────────────────────────────────────────
  get player() {
    return this.players[0] ?? null;
  }
  _byId(id) {
    return this.players.find((p) => p.id === id) ?? null;
  }
  _courtCount(team) {
    return this.players.filter((p) => p.team === team && p.zone === "court").length;
  }
  _enemyCourtBodies(team) {
    const foe = team === "A" ? "B" : "A";
    return this.players.filter((p) => p.team === foe && p.zone === "court");
  }
  _nearestEnemyTarget(p) {
    let best = null;
    let bd = Infinity;
    for (const e of this._enemyCourtBodies(p.team)) {
      const d = len(e.x - p.x, e.y - p.y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  // Pick an AI throw target with variety so the ball actually reaches the back of
  // the court, not only the front row. Only rivals with a CLEAR lane are eligible
  // (no closer team-mate of theirs sits on the throwing line to intercept the
  // swept ball), then a weighted-random pick — a mild preference for nearer
  // targets, but exposed deep players get a real share of the throws.
  _selectTarget(p) {
    const enemies = this._enemyCourtBodies(p.team);
    if (!enemies.length) return null;
    const clear = [];
    for (const e of enemies) {
      const dist = len(e.x - p.x, e.y - p.y);
      let blocked = false;
      for (const o of enemies) {
        if (o === e) continue;
        if (len(o.x - p.x, o.y - p.y) >= dist) continue; // only nearer bodies block
        if (pointSegDist(o.x, o.y, p.x, p.y, e.x, e.y) < HIT_R * 1.7) {
          blocked = true;
          break;
        }
      }
      if (!blocked) clear.push(e);
    }
    const pool = clear.length ? clear : enemies;
    let total = 0;
    const weights = pool.map((e) => {
      const w = 1 / (0.5 + len(e.x - p.x, e.y - p.y) / HALF_W);
      total += w;
      return w;
    });
    let r = this.rng() * total;
    for (let i = 0; i < pool.length; i += 1) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  // Depth of a court body: 0 at the centre line, 1 at the back line.
  _depthFrac(p) {
    const b = this.zoneBounds({ team: p.team, zone: "court" });
    return p.team === "A" ? (b.x1 - p.x) / (b.x1 - b.x0) : (p.x - b.x0) / (b.x1 - b.x0);
  }

  // A free team-mate deeper than p that has had the ball least — the one to feed
  // so the back rank gets to play instead of the front row hogging possession.
  _passTarget(p) {
    if (p.zone !== "court") return null;
    const myDepth = this._depthFrac(p);
    const cand = this.players.filter(
      (o) => o !== p && o.team === p.team && o.zone === "court" && !o.holding && this._depthFrac(o) > myDepth + 0.12,
    );
    if (!cand.length) return null;
    cand.sort((a, b) => a.timesHeld - b.timesHeld || this._depthFrac(b) - this._depthFrac(a));
    return cand[0];
  }

  _pass(p, mate) {
    const ball = this.balls.find((b) => b.id === p.holding);
    if (!ball) return false;
    let dx = mate.x - p.x;
    let dy = mate.y - p.y;
    const m = len(dx, dy) || 1;
    dx /= m;
    dy /= m;
    ball.state = "flight";
    ball.pass = true;
    ball.passTo = mate.id;
    ball.team = p.team;
    ball.thrownBy = p.id;
    ball.live = false;
    ball.entered = false;
    ball.vx = dx * BALL_SPEED * 0.8;
    ball.vy = dy * BALL_SPEED * 0.8;
    ball.x = p.x + dx * (BODY_R + 1);
    ball.y = p.y + dy * (BODY_R + 1);
    ball.prevX = ball.x;
    ball.prevY = ball.y;
    p.holding = null;
    p.throwCdMs = THROW_COOLDOWN_MS;
    p.facing = dx >= 0 ? 1 : -1;
    this.audio?.playThrow?.();
    return true;
  }

  // ── Throwing ────────────────────────────────────────────────────────────────
  _throw(p, aimError = 0, target = null) {
    if (!p.holding) return false;
    if (!target) target = this._nearestEnemyTarget(p);
    if (!target) return false;
    const ball = this.balls.find((b) => b.id === p.holding);
    if (!ball) return false;
    ball.pass = false;
    ball.passTo = null;

    // Lead the target by the travel time, then jitter by the tier's aim error.
    const dist = len(target.x - p.x, target.y - p.y);
    const lead = clamp(dist / BALL_SPEED, 0, 0.5);
    let aimX = target.x + target.vx * lead;
    let aimY = target.y + target.vy * lead;
    if (aimError > 0) {
      aimX += (this.rng() - 0.5) * aimError * 2;
      aimY += (this.rng() - 0.5) * aimError * 2;
    }
    let dx = aimX - p.x;
    let dy = aimY - p.y;
    const m = len(dx, dy) || 1;
    dx /= m;
    dy /= m;

    ball.state = "flight";
    ball.owner = null;
    ball.team = p.team;
    ball.thrownBy = p.id;
    ball.live = true;
    ball.entered = false;
    ball.vx = dx * BALL_SPEED;
    ball.vy = dy * BALL_SPEED;
    ball.x = p.x + dx * (BODY_R + 1);
    ball.y = p.y + dy * (BODY_R + 1);
    ball.prevX = ball.x;
    ball.prevY = ball.y;

    p.holding = null;
    p.throwCdMs = THROW_COOLDOWN_MS;
    p.facing = dx >= 0 ? 1 : -1;
    this.audio?.playThrow?.();
    return true;
  }

  // ── Update ────────────────────────────────────────────────────────────────
  _update(dtMs) {
    if (this.state !== "playing" || this.paused) return;
    this.elapsedMs += dtMs;
    const dt = dtMs / 1000;
    const diff = DIFFICULTY[this.difficulty];
    // Uncapped above 1 so dodge/catch odds keep falling to zero — no match can
    // dodge its way to eternity — while feel-facing uses stay clamped to [0,1].
    this._pressure = Math.max(0, (this.elapsedMs - RAMP_START_MS) / RAMP_DUR_MS);

    for (const p of this.players) {
      p.throwCdMs = Math.max(0, p.throwCdMs - dtMs);
      p.hitFlash = Math.max(0, p.hitFlash - dtMs);
    }

    // Human throw request (resolved before movement so it fires this frame).
    const you = this.player;
    if (this.wantThrow && you && you.holding && you.throwCdMs <= 0) {
      this._throw(you, 0);
    }
    this.wantThrow = false;

    this._assignBalls();
    this._stepPlayers(dt, diff);
    this._stepBalls(dt);
    this._resolvePickups();
    this._checkWin();
    this.emit();
  }

  _stepPlayers(dt, diff) {
    for (const p of this.players) {
      let dir;
      if (p.isPlayer) {
        const m = len(this.input.x, this.input.y);
        dir = m > 0.01 ? { x: this.input.x / m, y: this.input.y / m } : { x: 0, y: 0 };
      } else {
        dir = this._aiSteer(p, diff);
      }

      // Light separation so bodies don't stack into a single blob.
      let sx = 0;
      let sy = 0;
      for (const o of this.players) {
        if (o === p) continue;
        const ddx = p.x - o.x;
        const ddy = p.y - o.y;
        const d = len(ddx, ddy);
        if (d > 0 && d < BODY_R * 2.4) {
          const w = (BODY_R * 2.4 - d) / (BODY_R * 2.4);
          sx += (ddx / d) * w;
          sy += (ddy / d) * w;
        }
      }

      const speed = PLAYER_SPEED;
      const tvx = dir.x * speed + sx * speed * 0.6;
      const tvy = dir.y * speed + sy * speed * 0.6;
      // Ease toward target velocity for a touch of weight (k→1 over coarse steps
      // keeps the physics tests deterministic).
      const k = Math.min(1, dt * 12);
      p.vx += (tvx - p.vx) * k;
      p.vy += (tvy - p.vy) * k;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (Math.abs(dir.x) > 0.05) p.facing = dir.x >= 0 ? 1 : -1;

      const b = this.zoneBounds(p);
      p.x = clamp(p.x, b.x0, b.x1);
      p.y = clamp(p.y, b.y0, b.y1);

      // Carry a held ball at the body's leading hand.
      if (p.holding) {
        const ball = this.balls.find((bb) => bb.id === p.holding);
        if (ball) {
          ball.x = p.x + p.facing * (BODY_R + 1.5);
          ball.y = p.y - 1;
          ball.prevX = ball.x;
          ball.prevY = ball.y;
        }
      }
    }
  }

  _aiSteer(p, diff) {
    // 1) React to the most threatening live ball heading our way.
    const threat = this._incomingBall(p, diff.reactMs);
    if (threat) {
      if (p.defBallId !== threat.ball.id) {
        p.defBallId = threat.ball.id;
        // Late in the match the field tires: catches and dodges get rarer.
        const pr = this._pressure || 0;
        // Reach zero at full pressure (pr=1) so the late game is true sudden death.
        const catchP = diff.catchP * Math.max(0, 1 - pr);
        const dodgeP = diff.dodgeP * Math.max(0, 1 - pr);
        const r = this.rng();
        p.defType = r < catchP ? "catch" : r < catchP + dodgeP ? "dodge" : "take";
      }
      if (p.defType === "dodge") {
        // Slide perpendicular to the ball's heading, away from its line.
        const bl = len(threat.ball.vx, threat.ball.vy) || 1;
        const hx = threat.ball.vx / bl;
        const hy = threat.ball.vy / bl;
        let px = -hy;
        let py = hx;
        const side = (p.x - threat.ball.x) * px + (p.y - threat.ball.y) * py;
        if (side < 0) {
          px = -px;
          py = -py;
        }
        return { x: px, y: py };
      }
      if (p.defType === "catch") {
        // Stand into the intercept point and hold for the catch.
        const dx = threat.ball.x - p.x;
        const dy = threat.ball.y - p.y;
        const m = len(dx, dy) || 1;
        return { x: (dx / m) * 0.35, y: (dy / m) * 0.35 };
      }
      // 'take' — do nothing special, fall through to normal behaviour.
    } else {
      p.defBallId = null;
      p.defType = null;
    }

    // 2) Holding a ball: advance toward the throwing edge and let fly on cadence.
    if (p.holding) {
      p.aiThrowMs += 16.7; // coarse tick; cadence uses ms accumulation
      const target = this._nearestEnemyTarget(p);
      const pr = this._pressure || 0;
      const throwMs = Math.max(250, diff.throwMs * (1 - 0.5 * pr)); // faster as it drags on
      const aimError = Math.max(0.4, diff.aimError * Math.max(0, 1 - pr)); // truer aim, dead-eye by full pressure
      if (p.throwCdMs <= 0 && p.aiThrowMs >= throwMs) {
        // Feed a deeper, ball-starved team-mate so the back rank actually plays;
        // otherwise fire at a rival. Passing eases off as the match heats up (the
        // pressure ramp) so the late game turns aggressive and resolves.
        const mate = this._passTarget(p);
        const passChance = 0.46 * Math.max(0, 1 - 0.7 * pr);
        if (mate && this.rng() < passChance) {
          p.aiThrowMs = 0;
          this._pass(p, mate);
          return { x: 0, y: 0 };
        }
        if (target) {
          p.aiThrowMs = 0;
          this._throw(p, aimError, this._selectTarget(p));
          return { x: 0, y: 0 };
        }
      }
      // Advance a little toward the throwing edge and line up on the target — but
      // gently, so grabbing a ball at the back doesn't drag the whole team forward.
      const b = this.zoneBounds(p);
      const edgeX = p.zone === "court" ? (p.team === "A" ? b.x1 : b.x0) : (p.team === "A" ? b.x0 : b.x1);
      const dx = edgeX - p.x;
      const ty = target ? target.y - p.y : 0;
      const m = len(dx, ty) || 1;
      return { x: (dx / m) * 0.5, y: (ty / m) * 0.5 };
    }

    // 3) No ball: only the assigned retriever chases; everyone else holds their
    //    spread home slot, so the back is always manned and possession rotates.
    if (p.chaseBallId) {
      const ball = this.balls.find((bb) => bb.id === p.chaseBallId);
      if (ball && ball.state === "loose") {
        const dx = ball.x - p.x;
        const dy = ball.y - p.y;
        const m = len(dx, dy) || 1;
        return { x: dx / m, y: dy / m };
      }
    }

    // 4) Hold the home slot with a little wander, easing off as we arrive.
    p.wander += (this.rng() - 0.5) * 0.25;
    const home = this._zonePoint(p, p.homeXf, p.homeYf);
    const hx = home.x - p.x;
    const hy = home.y - p.y;
    const hm = len(hx, hy) || 1;
    const pull = Math.min(1, hm / 22);
    return { x: (hx / hm) * pull * 0.85 + Math.cos(p.wander) * 0.2, y: (hy / hm) * pull * 0.85 + Math.sin(p.wander) * 0.2 };
  }

  // The live enemy ball most likely to reach `p` within `reactMs`, or null.
  _incomingBall(p, reactMs) {
    let best = null;
    let bestT = Infinity;
    for (const ball of this.balls) {
      if (ball.state !== "flight" || !ball.live || ball.team === p.team) continue;
      const bl = len(ball.vx, ball.vy) || 1;
      const hx = ball.vx / bl;
      const hy = ball.vy / bl;
      const rel = (p.x - ball.x) * hx + (p.y - ball.y) * hy; // distance ahead along heading
      if (rel < 0) continue; // ball moving away
      const perp = Math.abs((p.x - ball.x) * -hy + (p.y - ball.y) * hx);
      if (perp > HIT_R + 6) continue; // won't pass close
      const t = (rel / bl) * 1000; // ms until closest approach
      if (t <= reactMs && t < bestT) {
        bestT = t;
        best = { ball, t };
      }
    }
    return best;
  }

  // Can body p legally stand at (x,y)? (inside its own zone bounds)
  _canReach(p, x, y) {
    const b = this.zoneBounds(p);
    return x >= b.x0 - 1 && x <= b.x1 + 1 && y >= b.y0 - 1 && y <= b.y1 + 1;
  }

  _stepBalls(dt) {
    for (const ball of this.balls) {
      if (ball.state === "held") continue;

      if (ball.state === "loose") {
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        const decay = Math.max(0, 1 - LOOSE_FRICTION * dt);
        ball.vx *= decay;
        ball.vy *= decay;
        ball.x = clamp(ball.x, WALL_MARGIN, ARENA_W - WALL_MARGIN);
        ball.y = clamp(ball.y, WALL_MARGIN, ARENA_H - WALL_MARGIN);
        continue;
      }

      // flight
      ball.prevX = ball.x;
      ball.prevY = ball.y;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      // A pass never hits anyone: it flies to a team-mate who receives it.
      if (ball.pass) {
        const mate = this._byId(ball.passTo);
        const oobPass = ball.x < WALL_MARGIN || ball.x > ARENA_W - WALL_MARGIN || ball.y < WALL_MARGIN || ball.y > ARENA_H - WALL_MARGIN;
        if (!mate || mate.zone !== "court" || mate.holding) {
          this._dropLoose(ball);
        } else if (len(ball.x - mate.x, ball.y - mate.y) < PICK_R) {
          ball.state = "held";
          ball.owner = mate.id;
          ball.pass = false;
          ball.passTo = null;
          ball.team = null;
          ball.thrownBy = null;
          ball.vx = 0;
          ball.vy = 0;
          mate.holding = ball.id;
          mate.timesHeld += 1;
        } else if (oobPass) {
          this._dropLoose(ball);
        }
        continue;
      }

      const band = this.enemyCourtBand(ball.team);
      const inBand = ball.x >= band.x0 && ball.x <= band.x1;
      if (inBand) ball.entered = true;

      // Swept hit test vs in-court enemies of the thrower, inside the enemy court
      // band and past the opening grace. First body along the path resolves it.
      if (ball.live && inBand && this.elapsedMs > START_GRACE_MS) {
        let hit = null;
        let hd = Infinity;
        for (const e of this._enemyCourtBodies(ball.team)) {
          const d = pointSegDist(e.x, e.y, ball.prevX, ball.prevY, ball.x, ball.y);
          if (d < HIT_R && d < hd) {
            hd = d;
            hit = e;
          }
        }
        if (hit) {
          this._resolveContact(ball, hit);
          continue; // ball is no longer in flight
        }
      }

      // A live ball that has crossed the enemy court and come out the far side (or
      // reached a wall) lands as a loose ball, settled where someone can fetch it.
      const exited = ball.entered && !inBand;
      const oob = ball.x < WALL_MARGIN || ball.x > ARENA_W - WALL_MARGIN || ball.y < WALL_MARGIN || ball.y > ARENA_H - WALL_MARGIN;
      if (exited || oob) {
        // A miss usually REBOUNDS into the back of the enemy court, so its back
        // row actually gets a ball to play — only sometimes does it carry all the
        // way through to the prison strip to feed the waiting prisoners.
        if (exited && this.rng() < 0.65) {
          ball.x = ball.team === "A" ? band.x1 - 2 : band.x0 + 2;
        }
        this._dropLoose(ball);
      }
    }
  }

  _resolveContact(ball, target) {
    const thrower = this._byId(ball.thrownBy);
    const caught = target.isPlayer
      ? this.elapsedMs <= this.catchArmedUntil
      : target.defBallId === ball.id && target.defType === "catch";

    if (caught) {
      // The defender snatches it: the THROWER is sent down (if still in court),
      // and the catcher keeps the ball in hand.
      ball.state = "held";
      ball.owner = target.id;
      ball.live = false;
      ball.team = null;
      ball.thrownBy = null;
      target.holding = ball.id;
      target.timesHeld += 1;
      target.defBallId = null;
      target.defType = null;
      if (thrower && thrower.zone === "court") this._sendToPrison(thrower);
      if (target.isPlayer) this.stats.catches += 1;
      this.audio?.playCatch?.();
    } else {
      // Clean hit: the target is brilado. A prison thrower earns their way back.
      this._sendToPrison(target);
      this._dropLoose(ball);
      // Prisoners earn their way back — except in the late-game "sudden death"
      // (full pressure), when returns switch off so court counts only fall and the
      // match can't oscillate forever on prisoners bouncing back.
      if (thrower && thrower.zone === "prison" && (this._pressure || 0) < 1) this._returnToCourt(thrower);
      if (thrower && thrower.isPlayer) this.stats.hits += 1;
      this.audio?.playHit?.();
    }
  }

  _sendToPrison(p) {
    if (p.holding) {
      const ball = this.balls.find((b) => b.id === p.holding);
      if (ball) this._dropLoose(ball);
      p.holding = null;
    }
    p.zone = "prison";
    p.hitFlash = 320;
    p.defBallId = null;
    p.defType = null;
    const slot = this._openSlot(p);
    p.x = slot.x;
    p.y = slot.y;
    p.vx = 0;
    p.vy = 0;
  }

  _returnToCourt(p) {
    p.zone = "court";
    const slot = this._openSlot(p);
    p.x = slot.x;
    p.y = slot.y;
    p.vx = 0;
    p.vy = 0;
  }

  // A spot inside p's (new) zone with the most clearance from teammates there.
  _openSlot(p) {
    const b = this.zoneBounds(p);
    let best = { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 };
    let bestClear = -Infinity;
    const peers = this.players.filter((o) => o !== p && o.team === p.team && o.zone === p.zone);
    for (let i = 0; i < 12; i += 1) {
      const x = b.x0 + this.rng() * (b.x1 - b.x0);
      const y = b.y0 + this.rng() * (b.y1 - b.y0);
      let clear = Infinity;
      for (const o of peers) clear = Math.min(clear, len(o.x - x, o.y - y));
      if (peers.length === 0) return { x, y };
      if (clear > bestClear) {
        bestClear = clear;
        best = { x, y };
      }
    }
    return best;
  }

  _resolvePickups() {
    for (const ball of this.balls) {
      if (ball.state !== "loose") continue;
      // Liveness guard: if the ball drifted somewhere nobody may stand, pull it
      // back to a reachable zone so the match can never stall on a dead ball.
      if (!this.players.some((p) => !p.holding && this._canReach(p, ball.x, ball.y))) {
        this._settleLooseBall(ball);
      }
      // A near-stationary loose ball can be scooped by the closest eligible body.
      let picker = null;
      let bd = PICK_R;
      for (const p of this.players) {
        if (p.holding) continue;
        if (!this._canReach(p, ball.x, ball.y)) continue;
        const d = len(ball.x - p.x, ball.y - p.y);
        if (d < bd) {
          bd = d;
          picker = p;
        }
      }
      if (picker) {
        ball.state = "held";
        ball.owner = picker.id;
        ball.vx = 0;
        ball.vy = 0;
        ball.live = false;
        picker.holding = ball.id;
        picker.timesHeld += 1;
      }
    }
  }

  _checkWin() {
    if (this.state !== "playing") return;
    const a = this._courtCount("A");
    const b = this._courtCount("B");
    // Absolute safety net: if a match somehow runs past the hard cap, settle it
    // on court strength (should never trigger — the ramp resolves matches first).
    if (a > 0 && b > 0) {
      if (this.elapsedMs >= HARD_CAP_MS) this._endMatch(a >= b);
      return;
    }
    // A team with no court bodies loses. If both empty on the same frame, the
    // side that still has the ball advantage (more prisoners is worse) — simplest
    // tie rule: whoever cleared the other first; we treat A-empty as a loss.
    const win = b === 0 && a > 0 ? true : a === 0 && b > 0 ? false : a >= b;
    this._endMatch(win);
  }

  _endMatch(win) {
    const durationSeconds = this.elapsedMs / 1000;
    if (win && (this.best === 0 || durationSeconds < this.best)) {
      this.best = durationSeconds;
      writeBest(this.best);
    }
    this.result = {
      win,
      durationSeconds,
      hits: this.stats.hits,
      catches: this.stats.catches,
      aCourt: this._courtCount("A"),
      bCourt: this._courtCount("B"),
    };
    this.state = "over";
    if (win) this.audio?.playWin?.();
    else this.audio?.playLose?.();
    this.emit();
  }

  // ── Input / flow ────────────────────────────────────────────────────────────
  setMove(x, y) {
    this.input = { x: Number(x) || 0, y: Number(y) || 0 };
  }
  pressThrow() {
    this.wantThrow = true;
  }
  pressCatch() {
    if (this.state !== "playing") return;
    this.catchArmedUntil = this.elapsedMs + DIFFICULTY[this.difficulty].humanCatchMs;
  }

  restart() {
    this.startGame(this.difficulty);
  }
  backToMenu() {
    this.state = "menu";
    this.result = null;
    this.players = [];
    this.balls = [];
    this.input = { x: 0, y: 0 };
    this.emit();
  }
  togglePause() {
    if (this.state !== "playing") return;
    this.paused = !this.paused;
    this.emit();
  }
  setDifficulty(difficulty) {
    if (DIFFICULTY[difficulty]) {
      this.difficulty = difficulty;
      this.emit();
    }
  }
  primaryAction() {
    if (this.state === "menu") this.startGame(this.difficulty);
    else if (this.state === "over") this.startGame(this.difficulty);
  }

  pressVirtualKey(code) {
    switch (code) {
      case "Enter":
        this.primaryAction();
        break;
      case "Space":
      case "KeyJ":
        if (this.state === "playing") this.pressThrow();
        else this.primaryAction();
        break;
      case "KeyK":
      case "ShiftLeft":
      case "ShiftRight":
        this.pressCatch();
        break;
      case "KeyR":
        if (this.state !== "menu") this.restart();
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
    const you = this.player;
    const threat = you && this.state === "playing" ? this._incomingBall(you, 700) : null;
    return {
      screen: this.state,
      difficulty: this.difficulty,
      difficultyLabel: this.locale === "en" ? diff.label_en : diff.label_es,
      elapsedSeconds: this.elapsedMs / 1000,
      graceActive: this.state === "playing" && this.elapsedMs <= START_GRACE_MS,
      paused: this.paused,
      aCourt: this._courtCount("A"),
      bCourt: this._courtCount("B"),
      teamSize: TEAM_SIZE,
      playerZone: you ? you.zone : "court",
      playerHolding: you ? Boolean(you.holding) : false,
      catchArmed: this.state === "playing" && this.elapsedMs <= this.catchArmedUntil,
      incoming: Boolean(threat),
      best: this.best,
      result: this.result,
      audio: { muted: this.audio?.isMuted?.() ?? false },
    };
  }

  emit() {
    this.onSnapshot(this.snapshot());
  }
}

export default BrileRuntime;
