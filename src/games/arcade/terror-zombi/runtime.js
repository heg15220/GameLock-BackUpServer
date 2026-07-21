// Terror Zombi — "Zombie Terror" runtime.
//
// A top-down zombie tag in a fenced graveyard. You and three AI survivors flee
// slow zombies; touch one and you turn, then you chase the rest. The round ends
// when a single human is left standing — if that's you, you win. The horde
// speeds up over time so a round always resolves and tension keeps rising.
//
// Time flows through `advanceTime(ms)` and every random choice comes from a
// seeded RNG, so the whole round is deterministic and testable.

export const ARENA_W = 120;
export const ARENA_H = 84;
export const WALL_MARGIN = 7; // fence inset the entities are bounded to
export const ENTITY_R = 2.3;
export const CONTACT_R = 4.2; // centre distance at which a zombie infects a human
export const HUMAN_SPEED = 23; // world units / second
export const START_GRACE_MS = 1300; // no infections while everyone spreads out
export const TOMBSTONES = 7;
// Movement feel: velocities ease toward their target instead of snapping, and
// same-kind entities gently push apart so a crowd never stacks into one blob.
export const ACCEL = 9; // higher = snappier; ~9 gives a bit of weight/glide
export const SEPARATION_R = ENTITY_R * 2.6; // clearance kept between same-kind bodies
export const SEPARATION_FORCE = 9; // push speed (world units/s) at full overlap

// Per tier: zombie count/speed/ramp, the zombie CUNNING `zWits` (0..1 — how far
// ahead they intercept and how tightly they flank), and the survivor-AI skill —
// `aiSense` is how far the AI rivals notice a zombie, `aiWits` (0..1) how sharply
// they react. Zombies are kept close to human pace: they catch you by cutting
// you off and surrounding, not by outrunning you. Easy rivals are careless and
// get caught; Hard rivals are alert competitors that outlast you if you slip.
export const DIFFICULTY = {
  facil: { zombies: 1, zStart: 10, zMax: 16, rampMs: 32000, zWits: 0.3, aiSense: 30, aiWits: 0.4, label_es: "Fácil", label_en: "Easy" },
  normal: { zombies: 2, zStart: 13, zMax: 20, rampMs: 28000, zWits: 0.65, aiSense: 48, aiWits: 0.8, label_es: "Normal", label_en: "Normal" },
  dificil: { zombies: 3, zStart: 16, zMax: 24, rampMs: 20000, zWits: 1.0, aiSense: 62, aiWits: 1.0, label_es: "Difícil", label_en: "Hard" },
};

// Three graveyards, each larger than the last (all share the cemetery theme).
// A bigger ground packs in more survivors, more headstones and an extra zombie
// or two, so the field never feels empty and the hunt stays balanced — the
// zombies and AI rivals are adapted to each map's size. `w`/`h` are world units;
// ARENA_W/ARENA_H above stay pinned to the first map for the exported defaults.
export const MAPS = [
  { id: "cementerio", w: 120, h: 84, tombstones: 7, humans: 4, zombieBonus: 0, label_es: "Cementerio", label_en: "Graveyard" },
  { id: "camposanto", w: 164, h: 116, tombstones: 12, humans: 6, zombieBonus: 1, label_es: "Camposanto", label_en: "Churchyard" },
  { id: "necropolis", w: 210, h: 148, tombstones: 18, humans: 8, zombieBonus: 2, label_es: "Necrópolis", label_en: "Necropolis" },
];
export const DEFAULT_MAP = MAPS[0].id;
export const getMap = (id) => MAPS.find((m) => m.id === id) ?? MAPS[0];

// Up to eight survivors on the largest map, so eight distinct shirt/skin/hair
// palettes and seven AI names (the player is always the first slot).
const HUMAN_COLORS = ["#38bdf8", "#f43f5e", "#a3e635", "#fbbf24", "#c084fc", "#fb923c", "#2dd4bf", "#f472b6"];
const HUMAN_SKINS = ["#f2c9a0", "#e0a878", "#f6d3b0", "#c98a5e", "#e8b98f", "#d69a6a", "#efc49a", "#b5794a"];
const HUMAN_HAIRS = ["#3a2a1a", "#7c4a24", "#2a2a30", "#b5651d", "#4a3620", "#1f2937", "#6b4423", "#0f172a"];
const AI_NAMES = ["Ada", "Beto", "Cleo", "Dani", "Eva", "Fabio", "Gala"];

const BEST_KEY = "terrorZombiBest";

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

// Shortest distance from point (px,py) to the segment (ax,ay)–(bx,by). Used for
// swept infection: a fast zombie that jumps past a survivor between frames still
// registers the touch, instead of tunnelling straight through it.
function pointSegDist(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const ab2 = abx * abx + aby * aby;
  let t = ab2 > 0 ? ((px - ax) * abx + (py - ay) * aby) / ab2 : 0;
  t = clamp(t, 0, 1);
  return len(px - (ax + abx * t), py - (ay + aby * t));
}

export class TerrorZombiRuntime {
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
    this.mapId = options.mapId && getMap(options.mapId).id === options.mapId ? options.mapId : DEFAULT_MAP;
    const startMap = getMap(this.mapId);
    this.arenaW = startMap.w; // current arena size (set per map in startGame)
    this.arenaH = startMap.h;
    this.state = "menu"; // menu | playing | over
    this.best = readBest();

    this.elapsedMs = 0;
    this.paused = false;
    this.input = { x: 0, y: 0 };
    this.entities = [];
    this.tombstones = [];
    this.infectionOrder = 0;
    this.result = null;

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

  // ── Setup ─────────────────────────────────────────────────────────────────
  _spawnPositions(n) {
    // Spread the n survivors evenly around a ring near the perimeter. The first
    // slot (the player) sits upper-left with open field to the right and below.
    const cx = this.arenaW / 2;
    const cy = this.arenaH / 2;
    const rx = this.arenaW / 2 - (WALL_MARGIN + 8);
    const ry = this.arenaH / 2 - (WALL_MARGIN + 8);
    const out = [];
    for (let i = 0; i < n; i += 1) {
      const ang = Math.PI * 1.25 + (i / n) * Math.PI * 2;
      out.push({ x: cx + Math.cos(ang) * rx, y: cy + Math.sin(ang) * ry });
    }
    return out;
  }

  _buildTombstones(avoid, count) {
    const stones = [];
    let guard = 0;
    const cx = this.arenaW / 2;
    const cy = this.arenaH / 2;
    const maxGuard = count * 60;
    while (stones.length < count && guard < maxGuard) {
      guard += 1;
      const x = WALL_MARGIN + 8 + this.rng() * (this.arenaW - 2 * (WALL_MARGIN + 8));
      const y = WALL_MARGIN + 10 + this.rng() * (this.arenaH - 2 * (WALL_MARGIN + 12));
      const w = 4 + this.rng() * 3;
      const h = 5 + this.rng() * 3;
      const rect = { x, y, w, h };
      const clearOfSpawns = avoid.every((p) => len(p.x - x, p.y - y) > 12);
      // Spacing wide enough that two stones can't form an impassable gap that
      // wedges a body (stone half-widths + two entity radii ≈ 12, so keep >14).
      const clearOfStones = stones.every((s) => len(s.x - x, s.y - y) > 15);
      // Keep the central disc clear too: the zombies spawn there and a stone on
      // top of a spawn would bury an entity inside it, freezing it for the round.
      const clearOfCenter = len(cx - x, cy - y) > 16;
      if (clearOfSpawns && clearOfStones && clearOfCenter) stones.push(rect);
    }
    return stones;
  }

  startGame(difficulty, mapId) {
    if (difficulty && DIFFICULTY[difficulty]) this.difficulty = difficulty;
    if (mapId && getMap(mapId).id === mapId) this.mapId = mapId;
    const diff = DIFFICULTY[this.difficulty];
    const map = getMap(this.mapId);
    this.arenaW = map.w;
    this.arenaH = map.h;
    const spawns = this._spawnPositions(map.humans);
    this.tombstones = this._buildTombstones(spawns, map.tombstones);
    this.elapsedMs = 0;
    this.paused = false;
    this.infectionOrder = 0;
    this.result = null;
    this.input = { x: 0, y: 0 };

    // The survivors (player first), spread around the ring.
    this.entities = spawns.map((p, i) => ({
      id: i === 0 ? "you" : `ai${i}`,
      isPlayer: i === 0,
      name: i === 0 ? null : AI_NAMES[(i - 1) % AI_NAMES.length],
      kind: "human",
      x: p.x,
      y: p.y,
      vx: 0,
      vy: 0,
      facing: i % 2 === 0 ? 1 : -1,
      color: HUMAN_COLORS[i % HUMAN_COLORS.length],
      skin: HUMAN_SKINS[i % HUMAN_SKINS.length],
      hair: HUMAN_HAIRS[i % HUMAN_HAIRS.length],
      infectedAt: null,
      wander: this.rng() * Math.PI * 2,
    }));

    // Initial zombies near the centre, spread a little. Bigger maps add a few.
    const zCount = diff.zombies + map.zombieBonus;
    for (let z = 0; z < zCount; z += 1) {
      const ang = (z / zCount) * Math.PI * 2 + this.rng();
      this.entities.push({
        id: `z${z}`,
        isPlayer: false,
        name: null,
        kind: "zombie",
        x: this.arenaW / 2 + Math.cos(ang) * 8,
        y: this.arenaH / 2 + Math.sin(ang) * 8,
        vx: 0,
        vy: 0,
        facing: 1,
        color: "#8fae7a",
        skin: "#8fae7a",
        hair: "#2f3a24",
        infectedAt: 0,
        wander: this.rng() * Math.PI * 2,
      });
    }

    this.state = "playing";
    this.audio?.unlock?.();
    this.audio?.playStart?.();
    this.audio?.startAmbience?.();
    this.emit();
  }

  // ── Update ────────────────────────────────────────────────────────────────
  _hordeSpeed() {
    const diff = DIFFICULTY[this.difficulty];
    const t = clamp(this.elapsedMs / diff.rampMs, 0, 1);
    let speed = diff.zStart + (diff.zMax - diff.zStart) * t;
    // Once the ramp is done the horde keeps creeping up slowly, so a lone
    // perfect runner is always eventually overtaken and the round can't stall
    // forever — even on the easier tiers where the peak sits at/below the human
    // speed. The early and mid-round feel is untouched.
    const over = this.elapsedMs - diff.rampMs;
    if (over > 0) speed += (over / 1000) * 1.6;
    // Cap it modestly: the horde relies on smart interception and flanking to
    // corner prey, not raw speed. A small late-game edge (≈1.55×) guarantees a
    // lone runner is eventually overtaken without the horde feeling like it just
    // outruns everything. (Raw speed past this is counterproductive — a survivor
    // that anticipates the hunter only dodges a faster charge more easily.)
    return Math.min(speed, HUMAN_SPEED * 1.55);
  }

  _blocked(x, y, self) {
    if (x < WALL_MARGIN || x > this.arenaW - WALL_MARGIN) return true;
    if (y < WALL_MARGIN || y > this.arenaH - WALL_MARGIN) return true;
    for (const s of this.tombstones) {
      // circle vs rect (expanded by the entity radius)
      const nx = clamp(x, s.x - s.w / 2, s.x + s.w / 2);
      const ny = clamp(y, s.y - s.h / 2, s.y + s.h / 2);
      if (len(x - nx, y - ny) < ENTITY_R) return true;
    }
    return false;
  }

  _moveWithCollision(e, dx, dy) {
    // Axis-separated so a body slides along a surface instead of stopping dead.
    // When an axis is blocked we also kill that velocity component, otherwise
    // the eased (inertial) velocity keeps pressing into the obstacle and the
    // entity grinds/jitters against it forever.
    if (!this._blocked(e.x + dx, e.y, e)) e.x += dx;
    else e.vx = 0;
    if (!this._blocked(e.x, e.y + dy, e)) e.y += dy;
    else e.vy = 0;
  }

  _depenetrate(e) {
    // Failsafe: if a body ends up buried inside a headstone (e.g. a zombie that
    // spawned on one, or was shoved in by separation), eject it in a single
    // step. This MUST use the same circle-vs-rect test as `_blocked` — an
    // AABB/square test would flag a body sitting just off a rounded corner as
    // "buried" and snap it back every frame, freezing it against the corner
    // even though `_blocked` would happily let it round the stone.
    for (const s of this.tombstones) {
      const nx = clamp(e.x, s.x - s.w / 2, s.x + s.w / 2);
      const ny = clamp(e.y, s.y - s.h / 2, s.y + s.h / 2);
      const dx = e.x - nx;
      const dy = e.y - ny;
      const d = len(dx, dy);
      if (d >= ENTITY_R) continue; // outside the collision shell — leave it
      if (d > 0.001) {
        // Overlapping an edge/corner: push straight out to the shell surface.
        const push = ENTITY_R - d;
        e.x += (dx / d) * push;
        e.y += (dy / d) * push;
      } else {
        // Dead inside the rect: eject along the axis of shallowest penetration.
        const px = s.w / 2 + ENTITY_R - Math.abs(e.x - s.x);
        const py = s.h / 2 + ENTITY_R - Math.abs(e.y - s.y);
        if (px < py) e.x = s.x + (e.x >= s.x ? 1 : -1) * (s.w / 2 + ENTITY_R);
        else e.y = s.y + (e.y >= s.y ? 1 : -1) * (s.h / 2 + ENTITY_R);
      }
    }
    e.x = clamp(e.x, WALL_MARGIN, this.arenaW - WALL_MARGIN);
    e.y = clamp(e.y, WALL_MARGIN, this.arenaH - WALL_MARGIN);
  }

  _nearest(from, kind) {
    let best = null;
    let bestD = Infinity;
    for (const e of this.entities) {
      if (e.kind !== kind || e === from) continue;
      const d = len(e.x - from.x, e.y - from.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return { target: best, dist: bestD };
  }

  _humanDir(e, dt) {
    // Player steers directly.
    if (e.isPlayer) {
      const m = len(this.input.x, this.input.y);
      return m > 0.01 ? { x: this.input.x / m, y: this.input.y / m } : { x: 0, y: 0 };
    }

    const diff = DIFFICULTY[this.difficulty];
    const sense = diff.aiSense;
    const wits = diff.aiWits;

    // Sense the nearest threat (by real distance) to decide whether to flee.
    let threat = 0;
    for (const z of this.entities) {
      if (z.kind !== "zombie") continue;
      const d = len(e.x - z.x, e.y - z.y);
      if (d < sense) threat = Math.max(threat, (sense - d) / sense);
    }

    let fx;
    let fy;
    if (threat > 0.02) {
      // Look-ahead evasion: since the hunters now intercept, running straight
      // away just feeds the cut-off. Instead, score headings by how far they
      // keep us from every zombie's PREDICTED position while staying off the
      // fence and out of headstones, and take the safest — with a nudge for
      // continuity so the escape reads as a smooth dodge, not a jitter. The
      // planning horizon grows with the tier's wits, so sharper survivors
      // anticipate the pincer and last longer.
      const reach = HUMAN_SPEED * 0.5; // how far ahead we test our own step
      // How far we anticipate the hunters — the core of the dodge. It fades as a
      // round drags on far past the ramp (the survivors tire and can no longer
      // read the pincer), so an otherwise-perfect evader is eventually caught and
      // the round always ends. Normal-length rounds finish before this bites.
      const fatigue = clamp((this.elapsedMs - diff.rampMs - 10000) / 35000, 0, 1);
      const laPred = wits * 0.9 * (1 - fatigue);
      const curMag = len(e.vx, e.vy) || 1;
      let best = null;
      let bestScore = -Infinity;
      for (let a = 0; a < 24; a += 1) {
        const ang = (a / 24) * Math.PI * 2;
        const cx = Math.cos(ang);
        const cy = Math.sin(ang);
        const fxp = e.x + cx * reach;
        const fyp = e.y + cy * reach;
        let danger = Infinity;
        for (const z of this.entities) {
          if (z.kind !== "zombie") continue;
          const d = len(fxp - (z.x + z.vx * laPred), fyp - (z.y + z.vy * laPred));
          if (d < danger) danger = d;
        }
        const wallClear = Math.min(
          fxp - WALL_MARGIN,
          this.arenaW - WALL_MARGIN - fxp,
          fyp - WALL_MARGIN,
          this.arenaH - WALL_MARGIN - fyp,
        );
        let score = danger + Math.min(wallClear, 16) * 0.7;
        if (wallClear < 2) score -= 30; // pinned against / over the fence
        if (this._blocked(fxp, fyp, e)) score -= 22; // heads into a headstone
        score += ((cx * e.vx + cy * e.vy) / curMag) * 1.6; // continuity
        if (score > bestScore) {
          bestScore = score;
          best = { x: cx, y: cy };
        }
      }
      fx = best.x;
      fy = best.y;
    } else {
      // No zombie sensed — amble. Sharper survivors wander calmly and drift to
      // open ground (harder to corner); careless ones jitter about aimlessly.
      e.wander += (this.rng() - 0.5) * dt * (3.2 - wits * 1.6);
      fx = Math.cos(e.wander);
      fy = Math.sin(e.wander);
      fx += ((this.arenaW / 2 - e.x) / this.arenaW) * wits;
      fy += ((this.arenaH / 2 - e.y) / this.arenaH) * wits;
    }

    // Fence and headstone steering is handled centrally by _avoidObstacles.
    const m = len(fx, fy) || 1;
    return { x: fx / m, y: fy / m };
  }

  _avoidObstacles(e, ix, iy) {
    // Steering that routes a path around headstones and off the fence. `ix,iy`
    // is the entity's intended (unit) direction. A pure radial push cancels a
    // head-on approach and deadlocks the body against the stone, so alongside
    // the radial safety push we add a TANGENTIAL "steer-around" component —
    // perpendicular to the intent, toward the side the stone is not on — which
    // sweeps the body past the obstacle instead of pinning it. Returned in the
    // same units as a unit direction, to be summed with the intent vector.
    let ax = 0;
    let ay = 0;

    const look = ENTITY_R + 7;
    for (const s of this.tombstones) {
      const nx = clamp(e.x, s.x - s.w / 2, s.x + s.w / 2);
      const ny = clamp(e.y, s.y - s.h / 2, s.y + s.h / 2);
      let dx = e.x - nx;
      let dy = e.y - ny;
      let d = len(dx, dy);
      if (d >= look) continue;
      if (d < 0.001) {
        // Overlapping the stone — eject straight out from its centre.
        dx = e.x - s.x;
        dy = e.y - s.y;
        d = len(dx, dy) || 1;
      }
      const w = (look - d) / look;
      // radial safety push, away from the stone
      ax += (dx / d) * w * 1.1;
      ay += (dy / d) * w * 1.1;
      // tangential steer-around, only when heading toward this stone
      const tox = -dx / d; // unit vector from entity to stone
      const toy = -dy / d;
      const approaching = ix * tox + iy * toy;
      if (approaching > 0) {
        let tx = -iy; // perpendicular to intent
        let ty = ix;
        if (tx * tox + ty * toy > 0) {
          tx = -tx; // flip to the side away from the stone
          ty = -ty;
        }
        const strength = approaching * w * 2.2;
        ax += tx * strength;
        ay += ty * strength;
      }
    }

    // Fence: ramp inward as an edge nears so a fleeing survivor never dead-ends
    // in a corner. Zombies are NOT steered off the fence — that push would fight
    // their chase and let a survivor pinned to the wall never be caught; a
    // zombie just slides along the rail instead.
    if (e.kind === "human") {
      const edge = 15;
      if (e.x < WALL_MARGIN + edge) ax += (WALL_MARGIN + edge - e.x) / edge;
      if (e.x > this.arenaW - WALL_MARGIN - edge) ax -= (e.x - (this.arenaW - WALL_MARGIN - edge)) / edge;
      if (e.y < WALL_MARGIN + edge) ay += (WALL_MARGIN + edge - e.y) / edge;
      if (e.y > this.arenaH - WALL_MARGIN - edge) ay -= (e.y - (this.arenaH - WALL_MARGIN - edge)) / edge;
    }

    return { x: ax, y: ay };
  }

  _separation(e) {
    // Sum of unit pushes away from same-kind bodies within SEPARATION_R,
    // weighted by how deep the overlap is. Deterministic (position-only).
    let sx = 0;
    let sy = 0;
    for (const o of this.entities) {
      if (o === e || o.kind !== e.kind) continue;
      const dx = e.x - o.x;
      const dy = e.y - o.y;
      const d = len(dx, dy);
      if (d > 0 && d < SEPARATION_R) {
        const w = (SEPARATION_R - d) / SEPARATION_R;
        sx += (dx / d) * w;
        sy += (dy / d) * w;
      }
    }
    return { x: sx * SEPARATION_FORCE, y: sy * SEPARATION_FORCE };
  }

  _assignZombieTargets() {
    // Spread the horde across the survivors: each survivor is claimed by its
    // nearest free hunter first (so the pack fans out to cover the field and cut
    // off escape), then any spare zombies gang the nearest survivor to flank it.
    // Recomputed every frame from positions only — stateless and deterministic,
    // so it can never latch onto a stale target and stall.
    const zombies = this.entities.filter((e) => e.kind === "zombie");
    const humans = this.entities.filter((e) => e.kind === "human");
    if (!humans.length) {
      for (const z of zombies) z.hunt = null;
      return;
    }
    const pairs = [];
    for (const z of zombies) for (const h of humans) pairs.push([len(z.x - h.x, z.y - h.y), z, h]);
    pairs.sort((a, b) => a[0] - b[0]);
    const zDone = new Set();
    const hClaimed = new Set();
    for (const [, z, h] of pairs) {
      if (zDone.has(z) || hClaimed.has(h)) continue;
      z.hunt = h;
      zDone.add(z);
      hClaimed.add(h);
    }
    for (const z of zombies) {
      if (zDone.has(z)) continue; // more zombies than survivors — join the nearest
      let best = null;
      let bd = Infinity;
      for (const h of humans) {
        const d = len(z.x - h.x, z.y - h.y);
        if (d < bd) {
          bd = d;
          best = h;
        }
      }
      z.hunt = best;
    }
  }

  _zombieDir(e) {
    const prey = e.hunt && e.hunt.kind === "human" ? e.hunt : this._nearest(e, "human").target;
    if (!prey) {
      e.chaseDist = null;
      return { x: 0, y: 0 };
    }
    const dx0 = prey.x - e.x;
    const dy0 = prey.y - e.y;
    const dist = len(dx0, dy0);
    e.chaseDist = dist;
    const diff = DIFFICULTY[this.difficulty];
    const zSpeed = this._zSpeed || HUMAN_SPEED;

    // Interception — aim where the prey will be by the time we get there, so the
    // hunter cuts the corner and closes efficiently rather than trailing in its
    // wake. The prediction horizon scales with the tier's cunning.
    const tClose = clamp(dist / Math.max(6, zSpeed), 0, 2.2) * diff.zWits;
    let aimX = prey.x + prey.vx * tClose;
    let aimY = prey.y + prey.vy * tClose;

    // Flank — if others hunt the same prey, peel off to our own side of its
    // escape line so the pack pincers it instead of queuing single file behind.
    let coHunters = 0;
    for (const z of this.entities) {
      if (z.kind === "zombie" && z !== e && z.hunt === prey) coHunters += 1;
    }
    if (coHunters > 0) {
      const sp = len(prey.vx, prey.vy);
      const hx = sp > 1 ? prey.vx / sp : dx0 / (dist || 1); // prey heading (or our approach)
      const hy = sp > 1 ? prey.vy / sp : dy0 / (dist || 1);
      const perpX = -hy;
      const perpY = hx;
      const side = Math.sign((e.x - prey.x) * perpX + (e.y - prey.y) * perpY) || 1;
      const flank = 7 * diff.zWits;
      aimX += perpX * side * flank;
      aimY += perpY * side * flank;
    }

    const dx = aimX - e.x;
    const dy = aimY - e.y;
    const m = len(dx, dy) || 1;
    return { x: dx / m, y: dy / m };
  }

  _update(dtMs) {
    if (this.state !== "playing" || this.paused) return;
    this.elapsedMs += dtMs;
    const dt = dtMs / 1000;
    const zSpeed = this._hordeSpeed();
    this._zSpeed = zSpeed; // exposed for interception aiming in _zombieDir
    this._assignZombieTargets();

    for (const e of this.entities) {
      const preX = e.x;
      const preY = e.y;
      e.prevX = preX; // start-of-frame position, for swept infection
      e.prevY = preY;
      const dir = e.kind === "human" ? this._humanDir(e, dt) : this._zombieDir(e);
      const speed = e.kind === "human" ? HUMAN_SPEED : zSpeed;
      // Blend the intent (chase/flee/steer) with obstacle avoidance so the AI
      // arcs around headstones and off the fence instead of pinning itself to
      // them. The player is manually driven, so it steers itself.
      let dx = dir.x;
      let dy = dir.y;
      // Only the LIVING human player steers itself; once infected it's an
      // AI-driven zombie and needs the same avoidance/unstick as any other, or
      // it wedges on a stone and freezes (input no longer moves it).
      const playerControlled = e.isPlayer && e.kind === "human";
      if (!playerControlled) {
        const wantsMove = len(dir.x, dir.y) > 0.3;
        if (wantsMove && (e.stuckMs || 0) > 200) {
          // Unstick: this body has barely moved for a while despite wanting to
          // (wedged in a wall/stone pocket, or steering forces cancelling out).
          // Scan headings around the circle, keep only those that are actually
          // clear a step ahead, and take the open one nearest the intent — so it
          // slips straight out through whatever gap exists instead of blindly
          // pushing into a wall. Catches physical blockage AND force-
          // cancellation, which the old rotating breaker could miss.
          let best = null;
          let bestDot = -Infinity;
          for (let a = 0; a < 16; a += 1) {
            const ang = (a / 16) * Math.PI * 2;
            const cx = Math.cos(ang);
            const cy = Math.sin(ang);
            if (this._blocked(e.x + cx * (ENTITY_R + 0.6), e.y + cy * (ENTITY_R + 0.6), e)) continue;
            const dot = cx * dir.x + cy * dir.y; // favour headings toward the intent
            if (dot > bestDot) {
              bestDot = dot;
              best = { x: cx, y: cy };
            }
          }
          if (best) {
            dx = best.x;
            dy = best.y;
          } else {
            // Fully enclosed (should not happen): bail toward the open centre.
            dx = this.arenaW / 2 - e.x;
            dy = this.arenaH / 2 - e.y;
            const m = len(dx, dy) || 1;
            dx /= m;
            dy /= m;
          }
        } else {
          // A zombie within lunging range of its prey commits to the touch and
          // ignores obstacle steering, so it can't be deflected into orbiting a
          // headstone right next to the victim (which used to stall the round).
          const committing = e.kind === "zombie" && e.chaseDist != null && e.chaseDist < CONTACT_R + ENTITY_R * 2;
          if (!committing) {
            const avoid = this._avoidObstacles(e, dir.x, dir.y);
            dx += avoid.x;
            dy += avoid.y;
            const m = len(dx, dy);
            if (m > 1) {
              dx /= m;
              dy /= m;
            }
          }
        }
      }
      // Steering velocity plus a soft shove away from same-kind neighbours so
      // the horde spreads to surround and survivors don't clip through one
      // another. Different kinds don't repel — a zombie must still reach its
      // prey to infect it.
      const sep = this._separation(e);
      const tvx = dx * speed + sep.x;
      const tvy = dy * speed + sep.y;
      // Ease toward the target velocity for a touch of inertia. Over a coarse
      // step (k→1) this collapses to the old instant behaviour, so the round
      // stays deterministic and the physics tests are unaffected.
      const k = Math.min(1, dt * ACCEL);
      e.vx += (tvx - e.vx) * k;
      e.vy += (tvy - e.vy) * k;
      if (dir.x !== 0 || dir.y !== 0) e.facing = dir.x >= 0 ? 1 : -1;
      this._moveWithCollision(e, e.vx * dt, e.vy * dt);
      this._depenetrate(e); // never let a body stay buried in a stone
      // Track how long the body has been effectively immobile while under AI
      // control, to drive the unstick above. The player is exempt (it may idle).
      const disp = len(e.x - preX, e.y - preY);
      e.stuckMs = !playerControlled && disp < 0.03 ? (e.stuckMs || 0) + dtMs : 0;
    }

    // Infection (after the grace window so nobody is caught at spawn).
    if (this.elapsedMs > START_GRACE_MS) {
      for (const z of this.entities) {
        if (z.kind !== "zombie") continue;
        for (const h of this.entities) {
          if (h.kind !== "human") continue;
          // Swept test: the touch lands if the survivor is within reach of the
          // zombie's path this frame, so a fast lunge can't skip over the prey.
          const zax = z.prevX ?? z.x;
          const zay = z.prevY ?? z.y;
          if (pointSegDist(h.x, h.y, zax, zay, z.x, z.y) < CONTACT_R) {
            this.infectionOrder += 1;
            h.kind = "zombie";
            h.color = "#8fae7a";
            h.infectedAt = this.elapsedMs;
            h.order = this.infectionOrder;
            if (h.isPlayer) this.audio?.playInfect?.();
            else this.audio?.playBite?.();
          }
        }
      }
    }

    const humans = this.entities.filter((e) => e.kind === "human");
    if (humans.length <= 1) this._endRound(humans[0] ?? null);
  }

  _endRound(survivor) {
    // Rank the four humans: the survivor first, then latest-infected to earliest.
    const original = this.entities.filter((e) => e.id === "you" || e.id.startsWith("ai"));
    const ranked = original
      .map((e) => ({
        id: e.id,
        isPlayer: e.isPlayer,
        name: e.name,
        survivedMs: e.infectedAt == null ? this.elapsedMs : e.infectedAt,
        survived: e.infectedAt == null,
      }))
      .sort((a, b) => b.survivedMs - a.survivedMs);
    ranked.forEach((r, i) => {
      r.rank = i + 1;
    });

    const player = ranked.find((r) => r.isPlayer);
    const survivedSeconds = player.survivedMs / 1000;
    if (survivedSeconds > this.best) {
      this.best = survivedSeconds;
      writeBest(this.best);
    }
    this.result = {
      win: Boolean(survivor && survivor.isPlayer),
      rank: player.rank,
      survivedSeconds,
      winnerId: survivor ? survivor.id : null,
      ranking: ranked,
    };
    this.state = "over";
    if (this.result.win) this.audio?.playWin?.();
    else this.audio?.playLose?.();
    this.emit();
  }

  // ── Input / flow ────────────────────────────────────────────────────────────
  setMove(x, y) {
    this.input = { x: Number(x) || 0, y: Number(y) || 0 };
  }

  restart() {
    this.startGame(this.difficulty);
  }

  backToMenu() {
    this.state = "menu";
    this.result = null;
    this.entities = [];
    this.input = { x: 0, y: 0 };
    this.audio?.stopAmbience?.();
    this.emit();
  }

  togglePause() {
    if (this.state !== "playing") return;
    this.paused = !this.paused;
    // El cementerio no se calla del todo en pausa: solo baja, para que se note
    // que la partida sigue ahí.
    this.audio?.setAmbiencePaused?.(this.paused);
    this.emit();
  }

  setDifficulty(difficulty) {
    if (DIFFICULTY[difficulty]) {
      this.difficulty = difficulty;
      this.emit();
    }
  }

  setMap(mapId) {
    if (getMap(mapId).id === mapId) {
      this.mapId = mapId;
      const map = getMap(mapId);
      // Reflect the pick immediately so a menu preview can size to the map.
      if (this.state !== "playing") {
        this.arenaW = map.w;
        this.arenaH = map.h;
      }
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
      case "Space":
        this.primaryAction();
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
    const map = getMap(this.mapId);
    const humans = this.entities.filter((e) => e.kind === "human").length;
    const zombies = this.entities.filter((e) => e.kind === "zombie").length;
    const player = this.entities[0];
    return {
      screen: this.state,
      difficulty: this.difficulty,
      difficultyLabel: this.locale === "en" ? diff.label_en : diff.label_es,
      mapId: this.mapId,
      mapLabel: this.locale === "en" ? map.label_en : map.label_es,
      elapsedSeconds: this.elapsedMs / 1000,
      graceActive: this.state === "playing" && this.elapsedMs <= START_GRACE_MS,
      paused: this.paused,
      humansLeft: humans,
      zombies,
      totalHumans: map.humans,
      playerInfected: player ? player.kind === "zombie" : false,
      best: this.best,
      result: this.result,
      audio: { muted: this.audio?.isMuted?.() ?? false },
    };
  }

  emit() {
    this.onSnapshot(this.snapshot());
  }
}

export default TerrorZombiRuntime;
