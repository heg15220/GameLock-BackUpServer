/**
 * The match director: turns each simulated minute into animated scenes.
 *
 * The engine decides what happened (who shot, who saved, who was booked).
 * The director only stages it: passes towards the shooter, the shot, the
 * keeper's dive, the net, the celebration. Team shapes come from the real
 * formations and move with the ball; the scorer and the goal reach the
 * scoreboard only when the ball crosses the line on screen.
 */
import { createStream } from '../../career/util.js';
import { FORMATIONS } from '../../career/positions.js';
import { LENGTH, WIDTH, GOAL_HALF } from './pitch.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const dirOf = (side) => (side === 'home' ? 1 : -1);
const other = (side) => (side === 'home' ? 'away' : 'home');

/** Attacking coordinates (across %, progress %) → world metres. */
export function toWorld(side, across, progress) {
  const x = side === 'home' ? (progress / 100) * LENGTH : LENGTH - (progress / 100) * LENGTH;
  const y = side === 'home' ? (across / 100) * WIDTH : WIDTH - (across / 100) * WIDTH;
  return { x, y };
}

const BASE = {
  ambient: 950, shot: 2300, goalCelebration: 2100, corner: 1500, foul: 1000, card: 800, offside: 950, sub: 900, injury: 1300,
  penalty: 2700, periodEnd: 1600, kickoff: 1200, var: 2200, tactics: 500,
};

export class Director {
  constructor(renderer, { onEvent, onGoal, lang } = {}) {
    this.renderer = renderer;
    this.queue = [];
    this.scene = null;
    this.elapsed = 0;
    this.onEvent = onEvent;
    this.onGoal = onGoal;
    this.lang = lang;
    this.lineups = { home: [], away: [] };
    this.slots = { home: {}, away: {} };
    this.formation = { home: '4-3-3', away: '4-3-3' };
    this.width = { home: 1, away: 1 };
    this.match = null;
  }

  sync(match) {
    this.match = match;
    for (const side of ['home', 'away']) {
      this.lineups[side] = match.sides[side].lineup.slice();
      this.formation[side] = match.sides[side].formation;
      for (const id of match.sides[side].lineup) this.slots[side][id] = match.players[id]?.slot;
    }
  }

  get busy() { return Boolean(this.scene) || this.queue.length > 0; }

  /** Base position of a player in his team's current shape. */
  basePosition(side, id) {
    const slot = this.slots[side][id] || this.match.players[id]?.slot || 'CM';
    const shape = FORMATIONS[this.formation[side]] || FORMATIONS['4-3-3'];
    const index = this.lineups[side].indexOf(id);
    const entry = shape[index] && shape[index][0] === slot ? shape[index] : shape.find(([pos]) => pos === slot) || shape[Math.max(0, index)] || shape[0];
    const across = 50 + (entry[1] - 50) * this.width[side];
    const progress = 2 + entry[2] * 0.6;
    return toWorld(side, across, progress);
  }

  /** Targets for everyone on the pitch given the ball. */
  shapeTargets(ball, possession, overrides = {}) {
    const targets = {};
    for (const side of ['home', 'away']) {
      const dir = dirOf(side);
      const along = side === 'home' ? ball.x / LENGTH : (LENGTH - ball.x) / LENGTH;
      const hasBall = possession === side;
      const shift = hasBall ? clamp((along - 0.42) * 36, -8, 26) : clamp((along - 0.6) * 30, -22, 8);
      for (const id of this.lineups[side]) {
        const p = this.match.players[id];
        if (!p || p.rc || (p.injured && p.replaced)) continue;
        const base = this.basePosition(side, id);
        const keeper = (this.slots[side][id] || p.slot) === 'GK';
        const t = time(this, id);
        let x = base.x + dir * shift * (keeper ? 0.1 : 1);
        let y = base.y + (ball.y - 34) * (keeper ? 0.18 : 0.24);
        x += Math.sin(t * 0.9) * 0.8;
        y += Math.cos(t * 0.7) * 0.8;
        targets[id] = { x: clamp(x, 0.5, LENGTH - 0.5), y: clamp(y, 0.8, WIDTH - 0.8) };
      }
    }
    // The nearest defender closes the ball down.
    if (possession) {
      const defenders = this.lineups[other(possession)].filter((id) => targets[id] && (this.slots[other(possession)][id] || this.match.players[id].slot) !== 'GK');
      const nearest = defenders.sort((a, b) => dist(targets[a], ball) - dist(targets[b], ball))[0];
      if (nearest) targets[nearest] = { x: ball.x - dirOf(possession) * 1.8, y: ball.y + 1.2 };
    }
    for (const [id, target] of Object.entries(overrides)) if (targets[id] || target.force) targets[id] = { ...targets[id], ...target };
    return targets;
  }

  nearestOf(side, point, exclude = []) {
    return this.lineups[side].filter((id) => !exclude.includes(id) && (this.slots[side][id] || this.match.players[id]?.slot) !== 'GK')
      .sort((a, b) => dist(this.basePosition(side, a), point) - dist(this.basePosition(side, b), point))[0];
  }

  keeperOf(side) {
    return this.lineups[side].find((id) => (this.slots[side][id] || this.match.players[id]?.slot) === 'GK');
  }

  /** Build scenes for everything the engine produced since the last minute. */
  enqueue(prev, next) {
    this.match = next;
    const newEvents = next.events.slice(prev.events.length);
    const minute = next.timeline[next.timeline.length - 1];
    const random = createStream('director', next.id, next.clock, next.events.length);
    const scenes = [];
    const possession = minute ? (minute.p > 0 ? 'home' : 'away') : 'home';
    const zone = minute?.z ?? 50;
    let i = 0;
    let notable = false;
    while (i < newEvents.length) {
      const e = newEvents[i];
      const following = newEvents[i + 1];
      if (e.type === 'kick-off') { scenes.push(this.kickoffScene(e)); i += 1; continue; }
      if (e.type === 'foul') {
        const card = following?.type === 'card' && following.player === e.player ? following : null;
        if (e.inBox) {
          const awarded = newEvents.slice(i + 1).find((x) => x.type === 'penalty-awarded');
          const shot = newEvents.slice(i + 1).find((x) => (x.type === 'shot' || x.type === 'goal') && x.kind === 'penalty');
          scenes.push(this.foulScene(e, card));
          if (shot) scenes.push(this.penaltyScene(shot, random));
          i = shot ? newEvents.indexOf(shot) + 1 : (card ? i + 2 : i + 1);
          if (awarded && !shot) i = newEvents.indexOf(awarded) + 1;
          notable = true;
          continue;
        }
        scenes.push(this.foulScene(e, card));
        i += card ? 2 : 1;
        notable = true;
        continue;
      }
      if (e.type === 'card') { scenes.push(this.cardScene(e)); i += 1; notable = true; continue; }
      if (e.type === 'corner') { scenes.push(this.cornerScene(e, random)); i += 1; notable = true; continue; }
      if (e.type === 'shot' || e.type === 'goal' || e.type === 'var-offside') { scenes.push(this.shotScene(e, random)); i += 1; notable = true; continue; }
      if (e.type === 'offside') { scenes.push(this.offsideScene(e, random)); i += 1; notable = true; continue; }
      if (e.type === 'sub') { scenes.push(this.subScene(e)); i += 1; continue; }
      if (e.type === 'injury') { scenes.push(this.injuryScene(e)); i += 1; notable = true; continue; }
      if (e.type === 'period-end' || e.type === 'full-time' || e.type === 'extra-time' || e.type === 'shootout') { scenes.push(this.breakScene(e)); i += 1; continue; }
      if (e.type === 'tactics') { scenes.push({ kind: 'event', duration: BASE.tactics, event: e, possession, frame: (t, s) => this.ambientFrame(s, t) }); i += 1; continue; }
      i += 1;
    }
    if (!notable && minute) scenes.unshift(this.ambientScene(possession, zone, random, minute));
    for (const scene of scenes) { scene.minute = minute?.m; scene.added = minute?.a; }
    this.queue.push(...scenes);
    this.sync(next);
  }

  /* ── Scene builders ── */

  ambientScene(side, zone, random, minute) {
    const passers = [];
    const progress = clamp(side === 'home' ? zone : 100 - zone, 10, 90);
    const target = toWorld(side, 25 + random() * 50, progress);
    let current = this.nearestOf(side, target);
    for (let k = 0; k < 4 && current; k += 1) {
      passers.push(current);
      const options = this.lineups[side].filter((id) => !passers.includes(id) && (this.slots[side][id] || this.match.players[id]?.slot) !== 'GK');
      current = options[Math.floor(random() * options.length)];
      if (random() < 0.3) break;
    }
    const keys = passers.map((id, k) => {
      const base = this.basePosition(side, id);
      const shift = dirOf(side) * clamp((progress / 100 - 0.42) * 36, -8, 26);
      return { t: k / Math.max(1, passers.length), x: base.x + shift, y: base.y, z: 0, carrier: id };
    });
    if (!keys.length) keys.push({ t: 0, x: 52.5, y: 34, z: 0 });
    return { kind: 'ambient', duration: BASE.ambient, possession: side, keys, pressure: minute?.x || 0 };
  }

  kickoffScene(event) {
    return { kind: 'kickoff', duration: BASE.kickoff, possession: 'home', event, keys: [{ t: 0, x: 52.5, y: 34, z: 0, snap: true }, { t: 1, x: 48, y: 30, z: 0 }], formationReset: true };
  }

  breakScene(event) {
    return { kind: 'break', duration: BASE.periodEnd, possession: null, event, keys: [{ t: 0, x: 52.5, y: 34, z: 0 }], formationReset: true };
  }

  buildUp(side, shooterId, assistId, shotPoint, random) {
    const keys = [];
    const creator = assistId || this.nearestOf(side, toWorld(side, 50, 55), [shooterId]);
    if (creator) {
      const start = this.basePosition(side, creator);
      const shift = dirOf(side) * 16;
      keys.push({ t: 0, x: start.x + shift, y: start.y, z: 0, carrier: creator });
      const mid = { x: lerp(start.x + shift, shotPoint.x, 0.55), y: lerp(start.y, shotPoint.y, 0.5) + (random() - 0.5) * 6 };
      keys.push({ t: 0.32, x: mid.x, y: mid.y, z: 0, carrier: creator });
    }
    keys.push({ t: 0.55, x: shotPoint.x, y: shotPoint.y, z: 0, carrier: shooterId, fast: true });
    return keys;
  }

  shotScene(e, random) {
    const side = e.side;
    const shotPoint = toWorld(side, e.x ?? 50, e.y ?? 84);
    const goalX = side === 'home' ? LENGTH : 0;
    const keeper = e.keeper || this.keeperOf(other(side));
    const keys = e.kind === 'penalty' ? [] : this.buildUp(side, e.player, e.assist, shotPoint, random);
    const aimY = 34 + (random() - 0.5) * GOAL_HALF * 1.6;
    const aimZ = 0.3 + random() * 1.8;
    let end;
    const fx = [{ t: 0.56, type: 'label', text: this.lang === 'es' ? (e.xg >= 0.3 ? '¡OCASIÓN CLARA!' : 'DISPARO') : (e.xg >= 0.3 ? 'BIG CHANCE!' : 'SHOT'), x: shotPoint.x, y: shotPoint.y, tone: 'info' }];
    const overrides = {};
    if (e.outcome === 'goal' || e.type === 'goal' || e.type === 'var-offside') {
      end = { x: goalX + dirOf(side) * 1.4, y: aimY, z: aimZ };
      fx.push({ t: 0.74, type: e.type === 'var-offside' ? 'var' : 'goal', event: e });
    } else if (e.outcome === 'saved') {
      end = { x: goalX - dirOf(side) * 0.8, y: aimY, z: aimZ * 0.7 };
      fx.push({ t: 0.74, type: 'label', text: this.lang === 'es' ? '¡PARADÓN!' : 'GREAT SAVE!', x: goalX, y: aimY, tone: 'save' });
      if (keeper) overrides.dive = { id: keeper, x: goalX - dirOf(side) * 0.8, y: aimY, dive: aimY > 34 ? 1 : -1 };
    } else if (e.outcome === 'blocked') {
      const blockAt = { x: lerp(shotPoint.x, goalX, 0.25), y: lerp(shotPoint.y, 34, 0.25) };
      end = { ...blockAt, z: 0.4 };
      if (e.blocker) overrides.block = { id: e.blocker, ...blockAt };
      fx.push({ t: 0.7, type: 'label', text: this.lang === 'es' ? 'TAPADO' : 'BLOCKED', x: blockAt.x, y: blockAt.y, tone: 'info' });
    } else {
      const sideSign = random() < 0.5 ? -1 : 1;
      end = { x: goalX + dirOf(side) * 3, y: 34 + sideSign * (GOAL_HALF + 0.8 + random() * 3), z: 0.5 + random() * 2.6 };
      fx.push({ t: 0.75, type: 'label', text: this.lang === 'es' ? '¡FUERA!' : 'WIDE!', x: goalX, y: end.y, tone: 'info' });
    }
    keys.push({ t: 0.6, x: shotPoint.x, y: shotPoint.y, z: 0, carrier: e.player });
    keys.push({ t: 0.74, ...end, fast: true, trail: true });
    if (e.outcome === 'saved') keys.push({ t: 0.9, x: goalX - dirOf(side) * (4 + random() * 4), y: end.y + (random() - 0.5) * 10, z: 0.6 });
    else if (e.outcome === 'blocked') keys.push({ t: 0.92, x: end.x - dirOf(side) * 5, y: end.y + (random() - 0.5) * 12, z: 0.3 });
    else keys.push({ t: 1, ...end, z: e.type === 'goal' ? 0.2 : end.z * 0.3 });
    const goal = e.type === 'goal' || e.type === 'var-offside';
    return {
      kind: 'shot', duration: BASE.shot + (goal ? BASE.goalCelebration : 0) + (e.type === 'var-offside' ? BASE.var : 0), possession: side, event: e, keys: goal ? keys.map((k) => ({ ...k, t: k.t * BASE.shot / (BASE.shot + BASE.goalCelebration + (e.type === 'var-offside' ? BASE.var : 0)) })) : keys,
      fx: goal ? fx.map((f) => ({ ...f, t: f.t * BASE.shot / (BASE.shot + BASE.goalCelebration + (e.type === 'var-offside' ? BASE.var : 0)) })) : fx,
      overrides, celebration: e.type === 'goal' ? { side, scorer: e.player, from: BASE.shot / (BASE.shot + BASE.goalCelebration) } : null,
    };
  }

  penaltyScene(e, random) {
    const side = e.side;
    const goalX = side === 'home' ? LENGTH : 0;
    const spot = { x: goalX - dirOf(side) * 11, y: 34 };
    const scene = this.shotScene({ ...e, x: 50, y: 89.5 }, random);
    scene.kind = 'penalty';
    scene.duration += 600;
    scene.keys = [{ t: 0, x: spot.x, y: spot.y, z: 0, snap: true, carrier: e.player }, ...scene.keys];
    scene.penalty = { side, spot, taker: e.player };
    scene.fx = [{ t: 0.05, type: 'label', text: this.lang === 'es' ? 'PENALTI' : 'PENALTY', x: spot.x, y: spot.y, tone: 'card' }, ...scene.fx.filter((f) => f.type !== 'label' || f.tone !== 'info')];
    return scene;
  }

  cornerScene(e, random) {
    const side = e.side;
    const goalX = side === 'home' ? LENGTH : 0;
    const flagY = random() < 0.5 ? 0.4 : WIDTH - 0.4;
    const target = { x: goalX - dirOf(side) * (6 + random() * 5), y: 34 + (random() - 0.5) * 12 };
    return {
      kind: 'corner', duration: BASE.corner, possession: side, event: e, corner: { side, flagY, goalX },
      keys: [{ t: 0, x: goalX - dirOf(side) * 0.6, y: flagY, z: 0, snap: true, carrier: e.player }, { t: 0.35, x: goalX - dirOf(side) * 0.6, y: flagY, z: 0, carrier: e.player }, { t: 0.8, ...target, z: 2.2, trail: true }, { t: 1, ...target, z: 0.4 }],
      fx: [{ t: 0.05, type: 'label', text: this.lang === 'es' ? 'CÓRNER' : 'CORNER', x: goalX - dirOf(side) * 2, y: flagY, tone: 'info' }],
    };
  }

  foulScene(e, card) {
    const victim = e.victim || e.player;
    const victimSide = other(e.side);
    const at = this.basePosition(victimSide, victim) || { x: 52.5, y: 34 };
    const point = { x: clamp(at.x + dirOf(victimSide) * 12, 4, LENGTH - 4), y: at.y };
    const fx = [{ t: 0.3, type: 'label', text: e.inBox ? (this.lang === 'es' ? '¡PENALTI!' : 'PENALTY!') : (this.lang === 'es' ? 'FALTA' : 'FOUL'), x: point.x, y: point.y, tone: e.inBox ? 'card' : 'info' }];
    if (card) fx.push({ t: 0.65, type: 'label', text: card.card === 'yellow' ? (this.lang === 'es' ? 'AMARILLA' : 'YELLOW') : (this.lang === 'es' ? '¡ROJA!' : 'RED!'), x: point.x, y: point.y, tone: card.card === 'yellow' ? 'card' : 'red', event: card });
    return {
      kind: 'foul', duration: BASE.foul + (card ? BASE.card : 0), possession: victimSide, event: e, card,
      keys: [{ t: 0, x: point.x - dirOf(victimSide) * 4, y: point.y, z: 0, carrier: victim }, { t: 0.3, x: point.x, y: point.y, z: 0, carrier: victim }, { t: 1, x: point.x, y: point.y, z: 0 }],
      overrides: { foul: { offender: e.player, victim, point } }, fx,
    };
  }

  cardScene(e) {
    const p = this.basePosition(e.side, e.player);
    return { kind: 'card', duration: BASE.card, possession: null, event: e, keys: [{ t: 0, x: p.x, y: p.y, z: 0 }], fx: [{ t: 0.1, type: 'label', text: e.card === 'yellow' ? (this.lang === 'es' ? 'AMARILLA' : 'YELLOW') : (this.lang === 'es' ? '¡ROJA!' : 'RED!'), x: p.x, y: p.y, tone: e.card === 'yellow' ? 'card' : 'red' }] };
  }

  offsideScene(e, random) {
    const side = e.side;
    const runner = e.player || this.nearestOf(side, toWorld(side, 50, 80));
    const point = toWorld(side, 30 + random() * 40, 74 + random() * 10);
    const start = toWorld(side, 50, 55);
    return {
      kind: 'offside', duration: BASE.offside, possession: side, event: e,
      keys: [{ t: 0, ...start, z: 0 }, { t: 0.55, ...point, z: 0.6, trail: true, carrier: runner }, { t: 1, ...point, z: 0 }],
      fx: [{ t: 0.55, type: 'label', text: this.lang === 'es' ? 'FUERA DE JUEGO' : 'OFFSIDE', x: point.x, y: 1, tone: 'card' }],
    };
  }

  subScene(e) {
    return { kind: 'sub', duration: BASE.sub, possession: null, event: e, keys: [{ t: 0, x: this.renderer.ball.x, y: this.renderer.ball.y, z: 0 }] };
  }

  injuryScene(e) {
    const p = this.basePosition(e.side, e.player);
    return {
      kind: 'injury', duration: BASE.injury, possession: null, event: e, keys: [{ t: 0, x: p.x + 2, y: p.y, z: 0 }],
      overrides: { down: { id: e.player } },
      fx: [{ t: 0.1, type: 'label', text: this.lang === 'es' ? 'LESIÓN' : 'INJURY', x: p.x, y: p.y, tone: 'red' }],
    };
  }

  /* ── Playback ── */

  ballAt(scene, t) {
    const keys = scene.keys;
    if (!keys.length) return { x: 52.5, y: 34, z: 0 };
    if (t <= keys[0].t) return { ...keys[0] };
    for (let k = 1; k < keys.length; k += 1) {
      if (t <= keys[k].t) {
        const a = keys[k - 1];
        const b = keys[k];
        const u = ease((t - a.t) / Math.max(0.0001, b.t - a.t));
        const arc = b.z > 0.5 ? Math.sin(u * Math.PI) * Math.max(a.z || 0, b.z) * 0.6 : 0;
        return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerp(a.z || 0, b.z || 0, u) + arc, fast: b.fast, trail: b.trail, carrier: a.carrier };
      }
    }
    return { ...keys[keys.length - 1] };
  }

  ambientFrame(scene, t) {
    const ball = this.ballAt(scene, t);
    return { ball, targets: this.shapeTargets(ball, scene.possession, ball.carrier ? { [ball.carrier]: { x: ball.x - dirOf(this.match.players[ball.carrier]?.side) * 0.8, y: ball.y + 0.4 } } : {}) };
  }

  frame(scene, t) {
    const ball = this.ballAt(scene, t);
    const overrides = {};
    if (ball.carrier && this.match.players[ball.carrier]) overrides[ball.carrier] = { x: ball.x - dirOf(this.match.players[ball.carrier].side) * 0.7, y: ball.y + 0.4 };
    if (scene.overrides?.dive && t > 0.6) {
      const d = scene.overrides.dive;
      overrides[d.id] = { x: d.x, y: d.y, dive: clamp((t - 0.6) * 6, 0, 1) * d.dive };
    }
    if (scene.overrides?.block && t > 0.5) overrides[scene.overrides.block.id] = { x: scene.overrides.block.x, y: scene.overrides.block.y };
    if (scene.overrides?.foul) {
      const f = scene.overrides.foul;
      overrides[f.victim] = { x: f.point.x, y: f.point.y, down: t > 0.3 && t < 0.85 };
      overrides[f.offender] = { x: f.point.x - 1.2, y: f.point.y + 1 };
    }
    if (scene.overrides?.down) overrides[scene.overrides.down.id] = { x: ball.x - 2, y: ball.y, down: true };
    if (scene.penalty) {
      // Everyone outside the box, keeper on the line, taker at the spot.
      const { side, spot } = scene.penalty;
      const goalX = side === 'home' ? LENGTH : 0;
      for (const s of ['home', 'away']) {
        this.lineups[s].forEach((id, k) => {
          if (id === scene.penalty.taker) { overrides[id] = { x: spot.x - dirOf(side) * (t < 0.5 ? 2.5 : 0.4), y: spot.y }; return; }
          const keeper = (this.slots[s][id] || this.match.players[id]?.slot) === 'GK';
          if (keeper && s !== side) { if (!overrides[id]) overrides[id] = { x: goalX - dirOf(side) * 0.3, y: 34 }; return; }
          if (keeper) return;
          overrides[id] = { x: goalX - dirOf(side) * (19 + (k % 3) * 1.6), y: 18 + (k * 37) % 32 };
        });
      }
    }
    if (scene.corner && t < 0.8) {
      const { side, goalX } = scene.corner;
      [...this.lineups[side], ...this.lineups[other(side)]].forEach((id, k) => {
        if (overrides[id] || (this.slots.home[id] || this.slots.away[id] || this.match.players[id]?.slot) === 'GK') return;
        if (k % 11 < 6) overrides[id] = { x: goalX - dirOf(side) * (4 + (k % 4) * 2.4), y: 26 + ((k * 13) % 16) };
      });
    }
    if (scene.celebration && t > scene.celebration.from) {
      const { side, scorer } = scene.celebration;
      const flag = { x: side === 'home' ? LENGTH - 2 : 2, y: ball.y > 34 ? WIDTH - 2 : 2 };
      overrides[scorer] = { x: flag.x, y: flag.y };
      this.lineups[side].forEach((id, k) => { if (id !== scorer && (this.slots[side][id] || this.match.players[id]?.slot) !== 'GK' && k % 2 === 0) overrides[id] = { x: flag.x - dirOf(side) * (2 + (k % 3)), y: flag.y + (flag.y < 34 ? 2 + (k % 4) : -2 - (k % 4)) }; });
    }
    if (scene.formationReset) {
      return { ball, targets: this.shapeTargets({ x: 52.5, y: 34 }, null) };
    }
    return { ball, targets: this.shapeTargets(ball, scene.possession, overrides) };
  }

  /** Advance playback; returns the minute currently on screen. */
  update(dtMs, speedFactor) {
    if (!this.scene && this.queue.length) {
      this.scene = this.queue.shift();
      this.elapsed = 0;
      this.firedFx = new Set();
      if (this.scene.event) this.onEvent?.(this.scene.event, this.scene);
    }
    const scene = this.scene;
    if (!scene) return null;
    this.elapsed += dtMs * speedFactor;
    const t = clamp(this.elapsed / scene.duration, 0, 1);
    for (const [index, fx] of (scene.fx || []).entries()) {
      if (t >= fx.t && !this.firedFx.has(index)) {
        this.firedFx.add(index);
        if (fx.type === 'label') this.renderer.label(fx.text, fx.x, fx.y, fx.tone, 1300 / Math.max(0.6, speedFactor * 0.6));
        if (fx.type === 'goal') { this.renderer.goalBurst(fx.event.side, this.renderer.kits?.[fx.event.side]?.main); this.onGoal?.(fx.event); }
        if (fx.type === 'var') this.onGoal?.({ ...fx.event, disallowed: true });
      }
    }
    const { ball, targets } = scene.kind === 'ambient' || scene.kind === 'event' ? this.ambientFrame(scene, t) : this.frame(scene, t);
    for (const body of this.renderer.bodies.values()) body.highlight = null;
    if (scene.event?.player && this.renderer.bodies.get(scene.event.player)) this.renderer.bodies.get(scene.event.player).highlight = 'event';
    this.renderer.setTargets(targets, { ...ball, snap: ball.snap }, dtMs * speedFactor);
    if (t >= 1) this.scene = null;
    return scene;
  }

  skip() {
    this.queue = [];
    this.scene = null;
  }
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const phases = new Map();
function time(director, id) {
  if (!phases.has(id)) phases.set(id, Math.random() * 10);
  return phases.get(id) + performance.now() / 1000;
}
