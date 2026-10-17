/**
 * The match director: stages, action by action, what the engine decided.
 *
 * Every simulated minute leaves its chain of play in `match.lastChain`: who
 * passed to whom and from where, the carries and dribbles, the tackles and
 * interceptions, the restarts, the shots. The director plays that chain back
 * in order. Both teams stand in the shape the engine used to choose the pass
 * (career/shape.js): the block slides towards the ball, the first defender
 * presses and the second covers, forwards wait on the last defender's
 * shoulder. The receiver runs to where the ball is going, the interceptor
 * steps into the lane, runners attack their zones when a cross comes in with
 * their markers on their shoulder (`place` in the chain), both players chase
 * a second ball, a defender chases a runner who is clean through, the keeper
 * dives where the shot goes and the referee follows play. The score changes
 * only when the ball crosses the line on screen.
 *
 * Timing: at 1x the ball and the players always move at real speeds (see
 * PASS_SPEED, CARRY_SPEED and the renderer's sprint speed), and open play is
 * never cut. As in EA FC, the clock runs faster than the screen because the
 * engine plays unhurried circulation as one visible pass that stands for the
 * two or three it replaces (career/match.js, MATCH_COMPRESSION), so a match
 * is watched in about twenty minutes. Only when the ball is dead is there a
 * cut, and when it ends every player is already set for the restart. 2x and
 * 4x scale all of that, and highlights mode fast-forwards everything far
 * from both boxes.
 */
import { slotEntry, layoutTeams, kickoffSpot } from '../../career/shape.js';
import { LENGTH, WIDTH, GOAL_HALF } from './pitch.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const dirOf = (side) => (side === 'home' ? 1 : -1);
const other = (side) => (side === 'home' ? 'away' : 'home');

/** Attacking coordinates (across %, progress %) → world metres. */
export function toWorld(side, across, progress) {
  const x = side === 'home' ? (progress / 100) * LENGTH : LENGTH - (progress / 100) * LENGTH;
  const y = side === 'home' ? (across / 100) * WIDTH : WIDTH - (across / 100) * WIDTH;
  return { x, y };
}
/** World metres → attacking coordinates of `side`. */
function toFrame(side, x, y) {
  return side === 'home' ? { p: (x / LENGTH) * 100, a: (y / WIDTH) * 100 } : { p: 100 - (x / LENGTH) * 100, a: 100 - (y / WIDTH) * 100 };
}

/**
 * At 1x everything moves at football's own speed: a ground pass travels at
 * 17-22 m/s, a long ball hangs in the air, a player carries the ball at
 * 5-6 m/s and sprints at 7-8 m/s, a corner takes its time to be set up.
 * Faster speeds and highlights only scale this.
 */
const PASS_SPEED = { ground: 17, driven: 22, lofted: 24 };
const CARRY_SPEED = 6;
const SCENE_MS = {
  kickoff: 1300, 'goal-kick': 1700, 'throw-in': 1300, corner: 2100, 'free-kick': 2300, penalty: 3000,
  shot: 2200, goal: 5200, foul: 1400, card: 1800, sub: 1600, injury: 2200, period: 2400, event: 500, offside: 1600,
};
const CUT_MS = 420;
/** How fast a scene plays: build-up in the own half quickly, the final third at real speed. */
function tempoOf(scene) {
  const a = scene.action;
  if (!a || !['pass', 'carry', 'clear', 'loose', 'dribble'].includes(a.t)) return 1;
  // The decisive pass is never rushed more than play in the box.
  if (a.t === 'pass' && ['cross', 'cutback', 'through', 'flick'].includes(a.kind)) return BUILD_TEMPO.box;
  const reach = Math.max(a.p0 ?? 0, a.p1 ?? 0);
  return reach < 50 ? BUILD_TEMPO.own : reach < 68 ? BUILD_TEMPO.middle : reach < 84 ? BUILD_TEMPO.approach : BUILD_TEMPO.box;
}
const metresOf = (a) => Math.hypot(((a.p1 ?? 0) - (a.p0 ?? 0)) * 1.05, ((a.a1 ?? 0) - (a.a0 ?? 0)) * 0.68);

export class Director {
  constructor(renderer, { onEvent, onGoal, onCue, lang } = {}) {
    this.renderer = renderer;
    this.queue = [];
    this.scene = null;
    this.elapsed = 0;
    this.onEvent = onEvent;
    this.onGoal = onGoal;
    this.onCue = onCue;
    this.lang = lang;
    this.match = null;
    this.ball = { x: LENGTH / 2, y: WIDTH / 2, z: 0 };
    this.possession = 'home';
    this.lastBallFrame = { side: 'home', p: 50, a: 50 };
  }

  sync(match) {
    this.match = match;
  }

  get busy() { return Boolean(this.scene) || this.queue.length > 0; }

  /* ── Positions ── */

  lineup(side) {
    const team = this.match.sides[side];
    return team.lineup.filter((id) => { const p = this.match.players[id]; return p && !p.rc && !(p.injured && p.replaced); });
  }

  /**
   * Shape targets (world) for both sides given who has the ball and where (in
   * that side's frame): the same layout the engine decided with, so the block
   * slides, the first defender presses and the second covers on screen too.
   */
  shapeTargets(possession, frame, carrier = null) {
    const targets = {};
    const owner = possession || frame.side || 'home';
    const ballP = frame.side === owner ? frame.p : 100 - frame.p;
    const ballA = frame.side === owner ? frame.a : 100 - frame.a;
    const ids = { home: this.lineup('home'), away: this.lineup('away') };
    const { pos } = layoutTeams(this.match, { side: owner, p: ballP, a: ballA, carrier: carrier || '__ball' }, { ids });
    for (const side of ['home', 'away']) {
      for (const id of ids[side]) {
        const at = pos[id];
        if (!at) continue;
        // A little life: nobody stands perfectly still.
        const t = sway(id);
        targets[id] = toWorld(side, clamp(at.a + Math.cos(t * 0.8) * 0.7, 1, 99), clamp(at.p + Math.sin(t * 0.9) * 0.6, 0.8, 99.2));
      }
    }
    return targets;
  }

  /** Move the players named in an action's `place` list ([id, p, a] in the action side's frame) towards their spots. */
  placeRuns(overrides, a, t, { delay = 0 } = {}) {
    if (!a.place || t < delay) return;
    // The renderer runs each body towards its target at a footballer's speed.
    for (const [id, p, across] of a.place) {
      if (overrides[id] || !this.match.players[id]) continue;
      overrides[id] = toWorld(a.side, clamp(across, 0.5, 99.5), clamp(p, 0.5, 99.5));
    }
  }

  /** Kick-off formation: everyone in his own half. */
  kickoffTargets(kickoffSide) {
    const targets = {};
    for (const side of ['home', 'away']) {
      const team = this.match.sides[side];
      for (const id of this.lineup(side)) {
        const p = this.match.players[id];
        const entry = slotEntry(team.formation, team.lineup, id, p.slot || p.pos);
        const taker = side === kickoffSide && p.slot === 'ST' && !Object.values(targets).some((x) => x.taker);
        const spot = kickoffSpot(entry, taker);
        targets[id] = { ...toWorld(side, spot.a, spot.p), taker };
      }
    }
    return targets;
  }

  keeperOf(side) {
    return this.lineup(side).find((id) => (this.match.players[id]?.slot) === 'GK');
  }

  /* ── Building scenes ── */

  enqueue(prev, next) {
    this.match = next;
    const firstNew = prev.events.length;
    const chain = next.lastChain || [];
    const minute = next.timeline[next.timeline.length - 1];
    const linked = new Set(chain.filter((a) => a.ev != null).map((a) => a.ev));
    const scenes = [];
    const stamp = (scene) => { scene.minute = minute?.m ?? scene.minute; scene.added = minute?.a ?? 0; return scene; };
    const trailing = [];
    for (let i = firstNew; i < next.events.length; i += 1) {
      if (linked.has(i)) continue;
      const e = next.events[i];
      const scene = stamp({ kind: 'event', duration: e.type === 'kick-off' ? 300 : SCENE_MS.event, event: e, notable: false });
      if (e.type === 'full-time' || e.type === 'shootout' || e.type === 'extra-time') { scene.duration = 1800; trailing.push(scene); } else scenes.push(scene);
    }
    for (const action of chain) {
      scenes.push(stamp(this.sceneFor(action, next)));
    }
    scenes.push(...trailing);
    if (!chain.length && !scenes.length && minute) scenes.push(stamp({ kind: 'idle', duration: 600 }));
    const edited = this.setPieceCuts(this.groupSubs(scenes));
    // Anticipation reaches back into the scene already on screen when nothing else is queued.
    this.prepare([this.queue[this.queue.length - 1] || this.scene, ...edited].filter(Boolean));
    this.queue.push(...edited);
  }

  /**
   * Substitutions made at the same stoppage are one moment on screen: the
   * board goes up once with every number, the men going off walk to the
   * halfway line together and the men coming on go in from there.
   */
  groupSubs(scenes) {
    const out = [];
    for (const sc of scenes) {
      const prev = out[out.length - 1];
      if (sc.kind === 'sub' && prev?.kind === 'sub') { prev.subs.push(sc.action); prev.duration += 1100; if (sc.event) prev.events.push(sc.event); continue; }
      if (sc.kind === 'sub') { out.push({ ...sc, subs: [sc.action], events: sc.event ? [sc.event] : [] }); continue; }
      out.push(sc);
    }
    return out;
  }

  /**
   * Every set piece starts already set: a cut, and in its dark moment the
   * ball is on the spot and every player in his place (the wall, the lines,
   * the thrower on the touchline, the keeper behind the ball), so no time is
   * spent watching them walk there.
   */
  setPieceCuts(scenes) {
    const out = [];
    for (const sc of scenes) {
      if (sc.kind === 'restart' && sc.action) out.push({ kind: 'cut', duration: CUT_MS, setup: sc, minute: sc.minute, added: sc.added, notable: sc.notable });
      out.push(sc);
    }
    return out;
  }

  /**
   * Anticipation: what the next action needs is set up during the current
   * one. The man who will win the ball closes the carrier down, the runner
   * starts his run before the through ball or the cross, and the wall and the
   * players set for a free kick stay put while it is struck.
   */
  prepare(list) {
    for (let i = 0; i < list.length - 1; i += 1) {
      const cur = list[i];
      const next = list.slice(i + 1).find((sc) => sc.action);
      const a = next?.action;
      if (!a || !cur.action) continue;
      const prep = [];
      const duelist = a.t === 'carry' && a.vs && !a.chase ? a.vs
        : a.t === 'dribble' ? a.vs
          : a.t === 'foul' ? a.by
            : a.t === 'pass' && !a.ok && a.by && !a.claim && a.kind !== 'cross' ? a.by : null;
      if (duelist) prep.push({ id: duelist, mode: 'press' });
      if (a.t === 'pass' && a.place && a.kind !== 'cross') for (const [id, p, across] of a.place) if (id !== a.from) prep.push({ id, mode: 'run', side: a.side, p, a: across });
      // The next receiver moves towards where he will take the ball: he shows for it.
      if (a.t === 'pass' && a.to && a.kind !== 'cross' && !prep.some((x) => x.id === a.to) && cur.action.to !== a.to) prep.push({ id: a.to, mode: 'run', side: a.side, p: a.p1, a: a.a1 });
      if (a.t === 'pass' && a.kind === 'cross' && a.place && cur.action.t !== 'restart') for (const [id, p, across] of a.place) prep.push({ id, mode: 'run', side: a.side, p: p - 6, a: across });
      if (prep.length) cur.prep = prep;
      if (cur.kind === 'restart' && cur.action.place && (a.t === 'shot' || a.t === 'pass')) next.sticky = { side: cur.action.side, place: cur.action.place };
    }
  }

  /** Apply the anticipation and the set-piece positions of a scene. */
  applyPrep(scene, t, overrides, ball) {
    if (scene.sticky && t < 0.55) {
      for (const [id, p, across] of scene.sticky.place) if (!overrides[id] && this.match.players[id]) overrides[id] = toWorld(scene.sticky.side, clamp(across, 0.5, 99.5), clamp(p, 0.5, 99.5));
    }
    if (!scene.prep || t < 0.3) return;
    for (const item of scene.prep) {
      const player = this.match.players[item.id];
      if (!player || overrides[item.id]) continue;
      if (item.mode === 'press') {
        // Goal-side of the ball, close enough to put a foot in.
        const ownGoal = { x: player.side === 'home' ? 0 : LENGTH, y: WIDTH / 2 };
        const dx = ownGoal.x - ball.x; const dy = ownGoal.y - ball.y; const d = Math.hypot(dx, dy) || 1;
        overrides[item.id] = { x: ball.x + (dx / d) * 1.7, y: ball.y + (dy / d) * 1.7, sprint: true };
      } else {
        const spot = toWorld(item.side, clamp(item.a, 0.5, 99.5), clamp(item.p, 0.5, 99.5));
        const body = this.bodyAt(item.id);
        overrides[item.id] = { x: lerp(body.x, spot.x, 0.5), y: lerp(body.y, spot.y, 0.5), sprint: true };
      }
    }
  }

  sceneFor(action, match) {
    const event = action.ev != null ? match.events[action.ev] : null;
    const notableZone = (action.p1 ?? action.p ?? 0) > 70 || (action.p0 ?? 0) > 75;
    const base = { action, event, notable: notableZone };
    switch (action.t) {
      case 'pass': {
        // Wind-up (the first 12% of the scene) plus the flight at a real ball speed.
        const distance = metresOf(action);
        const lofted = action.lofted ?? ['long', 'switch', 'cross'].includes(action.kind);
        const speed = lofted ? PASS_SPEED.lofted : action.kind === 'through' || action.kind === 'cross' ? PASS_SPEED.driven : PASS_SPEED.ground;
        const flight = (lofted ? 0.45 : 0.15) + distance / speed;
        const duration = clamp((flight * 1000) / 0.88, 600, 3600);
        return { ...base, kind: 'pass', duration: action.offside ? SCENE_MS.offside : duration, notable: base.notable || action.offside || action.kind === 'cross' || action.kind === 'through' };
      }
      case 'carry': return { ...base, kind: 'carry', duration: clamp((metresOf(action) / CARRY_SPEED) * 1000, 800, 3200) };
      case 'dribble': return { ...base, kind: 'dribble', duration: action.ok ? 1600 : 1300 };
      case 'clear': return { ...base, kind: 'clear', duration: clamp((0.5 + metresOf(action) / 22) * 1000, 1200, 3000) };
      case 'loose': return { ...base, kind: 'loose', duration: clamp((0.4 + metresOf(action) / 9) * 1000, 800, 2200), notable: true };
      // A quick free kick in midfield is taken at once; one with a wall and lines takes its time.
      case 'restart': return { ...base, kind: 'restart', duration: action.kind === 'free-kick' && !action.place ? 1100 : SCENE_MS[action.kind] || 1000, notable: ['corner', 'penalty', 'free-kick'].includes(action.kind) && (action.p ?? 0) > 60 };
      case 'shot': {
        const goal = event?.type === 'goal';
        const varGoal = event?.type === 'var-offside';
        // Flight time from the distance: a struck shot travels at ~27 m/s, a header at ~16 m/s.
        const toGoal = Math.hypot((100 - action.p) * 1.05, (50 - action.a) * 0.68);
        const speed = ['header', 'corner-header'].includes(action.kind) ? 16 : 27;
        const flight = clamp(((0.08 + toGoal / speed) * 1000) / SCENE_MS.shot, 0.1, 0.5);
        return { ...base, kind: 'shot', duration: goal ? SCENE_MS.goal : varGoal ? SCENE_MS.goal + 600 : SCENE_MS.shot, notable: true, goal, varGoal, flight };
      }
      case 'foul': return { ...base, kind: 'foul', duration: SCENE_MS.foul, notable: true };
      case 'card': return { ...base, kind: 'card', duration: SCENE_MS.card, notable: true };
      case 'sub': return { ...base, kind: 'sub', duration: 3200, notable: true };
      case 'injury': return { ...base, kind: 'injury', duration: SCENE_MS.injury, notable: true };
      case 'period': return { ...base, kind: 'period', duration: SCENE_MS.period, notable: true };
      default: return { ...base, kind: 'idle', duration: 400 };
    }
  }

  /* ── Playback ── */

  /** Ball and players for a scene at progress t (0-1). */
  frame(scene, t) {
    const a = scene.action;
    const overrides = {};
    let possession = this.possession;
    let ball;
    const hold = (id, at, offset = 0.7) => {
      const p = this.match.players[id];
      if (!p) return;
      overrides[id] = { x: at.x - dirOf(p.side) * offset, y: at.y + 0.35 };
    };
    if (scene.kind === 'cut' && scene.setup) {
      // Before the dark moment the picture holds; after it, the set piece as it will start.
      if (t < 0.5) return { ball: { ...this.ball, snap: true }, possession, overrides, frame: this.lastBallFrame };
      if (!scene.jumped) { scene.jumped = true; this.renderer.snapBodies = true; }
      return this.frame(scene.setup, 0);
    }
    if (!a) {
      ball = { ...this.ball };
      return { ball, possession, overrides, frame: this.lastBallFrame };
    }
    const side = a.side;
    switch (scene.kind) {
      case 'pass': {
        possession = side;
        const from = toWorld(side, a.a0, a.p0);
        const toPt = toWorld(side, clamp(a.a1, -2, 102), clamp(a.p1, -2, 102));
        const kick = 0.12;
        const u = clamp((t - kick) / (1 - kick), 0, 1);
        // In the air the ball keeps its horizontal speed; along the ground it leaves fast and slows a little.
        const travel = (a.lofted ?? ['long', 'switch', 'cross'].includes(a.kind)) ? u : 1 - Math.pow(1 - u, 1.6);
        const lofted = a.lofted ?? ['long', 'switch', 'cross'].includes(a.kind);
        const height = a.kind === 'flick' ? 1.6 : lofted ? clamp(Math.hypot(toPt.x - from.x, toPt.y - from.y) / 7, 2.5, 9) : a.kind === 'through' ? 0.4 : 0;
        ball = { x: lerp(from.x, toPt.x, travel), y: lerp(from.y, toPt.y, travel), z: Math.sin(travel * Math.PI) * height, fast: u > 0 && u < 1, trail: lofted || a.kind === 'through' };
        if (a.throw) {
          // Both feet behind the line, ball released from over the head.
          const line = { x: from.x, y: from.y < WIDTH / 2 ? -0.5 : WIDTH + 0.5 };
          overrides[a.from] = { ...line };
          ball = t < kick ? { x: line.x, y: line.y, z: 2.2 } : { x: lerp(line.x, toPt.x, travel), y: lerp(line.y, toPt.y, travel), z: lerp(2.2, 0.2, travel) + Math.sin(travel * Math.PI) * 1.3, fast: true };
        } else if (t < kick) { ball = { ...from, z: 0 }; hold(a.from, from); }
        else if (!a.wall) overrides[a.from] = { x: from.x + dirOf(side) * 1.2 * u, y: from.y };
        if (a.to && this.match.players[a.to]) {
          const runTo = a.ok ? toPt : toWorld(side, clamp(a.a1, 2, 98), clamp(a.p1 + 2, 2, 98));
          overrides[a.to] = { x: lerp(this.match.players[a.to] && this.bodyAt(a.to).x, runTo.x - dirOf(side) * 0.6, easeOut(clamp(t * 1.3, 0, 1))), y: lerp(this.bodyAt(a.to).y, runTo.y + 0.3, easeOut(clamp(t * 1.3, 0, 1))), sprint: true };
        }
        if (!a.ok && a.by && this.match.players[a.by]) {
          const at = toWorld(side, clamp(a.a1, 1, 99), clamp(a.p1, 1, 99));
          const keeper = this.match.players[a.by].slot === 'GK';
          overrides[a.by] = { x: at.x + (keeper ? 0 : dirOf(side) * 0.6), y: at.y, dive: keeper && a.claim && t > 0.7 ? 0.25 : 0, sprint: true };
        }
        if (a.offside && t > 0.55) { this.flag(scene, 'offside', toPt); }
        // Runners attack their zones as the ball is struck; markers go with them.
        this.placeRuns(overrides, a, t, { delay: a.kind === 'cross' ? 0 : 0.05 });
        this.lastBallFrame = { side, p: lerp(a.p0, a.p1, travel), a: lerp(a.a0, a.a1, travel) };
        break;
      }
      case 'carry':
      case 'dribble': {
        possession = side;
        const from = toWorld(side, a.a0, a.p0);
        const toPt = toWorld(side, a.a1, a.p1);
        // Running with the ball: an even pace, the ball a stride ahead of him.
        const u = t;
        ball = { x: lerp(from.x, toPt.x, u) + Math.sin(t * 22) * 0.12, y: lerp(from.y, toPt.y, u), z: 0 };
        hold(a.from, ball, 0.6);
        // Running with the ball he stays on it: as fast as the ball goes.
        if (overrides[a.from]) overrides[a.from].sprint = true;
        // A tackle on the carry: the defender steps in.
        if (scene.kind === 'carry' && a.vs && this.match.players[a.vs]) {
          // Clean through: the defender chases from behind, as far back as the runner's lead.
          if (a.chase) overrides[a.vs] = { x: ball.x - dirOf(side) * Math.max(0.7, a.lead ?? lerp(2, 0.6, t)), y: ball.y + 0.8 };
          else overrides[a.vs] = { x: ball.x + dirOf(side) * lerp(1.8, 0.5, clamp(t * 1.6, 0, 1)), y: ball.y - 0.4, sprint: true };
        }
        // The covering defender closes the space behind the duel.
        if (scene.kind === 'dribble' && a.cover && this.match.players[a.cover]) overrides[a.cover] = toWorld(side, lerp(a.a0, a.a1, 0.8), clamp(lerp(a.p0, a.p1, 0.8) + 3, 1, 99));
        if (scene.kind === 'dribble' && a.vs && this.match.players[a.vs]) {
          const opp = this.match.players[a.vs];
          const meet = toWorld(side, lerp(a.a0, a.a1, 0.45), lerp(a.p0, a.p1, 0.45));
          // Beaten: he lunges and is left behind. Winning: he steps in and takes it.
          overrides[a.vs] = a.ok ? { x: meet.x + dirOf(side) * (t < 0.5 ? 1 : -1.5 * (t - 0.5)), y: meet.y + (t > 0.45 ? 1.4 : 0), sprint: true } : { x: lerp(meet.x + dirOf(side) * 1.5, ball.x + dirOf(side) * 0.6, clamp(t * 1.6, 0, 1)), y: ball.y - 0.4, sprint: true };
          if (!a.ok && t > 0.6) overrides[a.from] = { ...overrides[a.from], down: false };
          void opp;
        }
        this.lastBallFrame = { side, p: lerp(a.p0, a.p1, u), a: lerp(a.a0, a.a1, u) };
        break;
      }
      case 'clear': {
        possession = side;
        const from = toWorld(side, a.a0, a.p0);
        const toPt = toWorld(side, a.a1, a.p1);
        const u = ease(clamp((t - 0.1) / 0.9, 0, 1));
        ball = { x: lerp(from.x, toPt.x, u), y: lerp(from.y, toPt.y, u), z: Math.sin(u * Math.PI) * (a.header ? 5 : 11), trail: true };
        if (t < 0.12) hold(a.from, from);
        this.lastBallFrame = { side, p: lerp(a.p0, a.p1, u), a: lerp(a.a0, a.a1, u) };
        break;
      }
      case 'loose': {
        // The loose ball starts from wherever the ball is now.
        if (!scene.ballFrom) scene.ballFrom = { ...this.ball };
        const from = scene.ballFrom;
        const toPt = toWorld(side, a.a1, a.p1);
        ball = { x: lerp(from.x, toPt.x, ease(t)), y: lerp(from.y, toPt.y, ease(t)), z: Math.sin(t * Math.PI) * (a.touch ? 0.3 : 1.2) };
        // Both chase the second ball; the winner gets there first.
        if (a.to && this.match.players[a.to]) overrides[a.to] = { x: toPt.x - dirOf(this.match.players[a.to].side) * 0.6, y: toPt.y, sprint: true };
        if (a.vs && this.match.players[a.vs]) overrides[a.vs] = { x: toPt.x - dirOf(this.match.players[a.vs].side) * 1.4, y: toPt.y + 0.8, sprint: true };
        if (a.keeper && this.match.players[a.keeper]) overrides[a.keeper] = { ...from, down: true };
        possession = side;
        this.lastBallFrame = { side, p: a.p1, a: a.a1 };
        break;
      }
      case 'restart': {
        possession = side;
        const at = toWorld(side, clamp(a.a, 0, 100), clamp(a.p, 0, 100));
        ball = { ...at, z: 0, snap: t < 0.05 };
        if (a.kind === 'kickoff') {
          this.lastBallFrame = { side, p: 50, a: 50 };
          return { ball: { x: LENGTH / 2, y: WIDTH / 2, z: 0, snap: true }, possession: null, kickoff: side, overrides: { [a.by]: { x: LENGTH / 2 - dirOf(side) * 0.6, y: WIDTH / 2 } }, frame: this.lastBallFrame };
        }
        if (a.kind === 'throw-in') {
          // He fetches the ball, walks to the spot and holds it over his head.
          const spot = { x: at.x, y: at.y < WIDTH / 2 ? -0.5 : WIDTH + 0.5 };
          overrides[a.by] = { ...spot, sprint: true };
          const body = this.bodyAt(a.by);
          const there = Math.hypot(body.x - spot.x, body.y - spot.y) < 1.2;
          ball = there ? { ...spot, z: 2.2 } : { x: body.x, y: body.y, z: 1.1 };
        } else if (a.kind === 'corner') {
          overrides[a.by] = { x: at.x + dirOf(side) * 0.8, y: at.y < WIDTH / 2 ? at.y - 0.8 : at.y + 0.8 };
          if (a.place) this.placeRuns(overrides, a, 1);
          else this.crowdBox(overrides, side, t);
        } else if (a.kind === 'penalty') {
          this.penaltyShape(overrides, side, a.by);
        } else if (a.kind === 'free-kick') {
          // The wall, the lines, the keeper: the engine's set-up; the taker steps back for his run-up.
          if (a.place) this.placeRuns(overrides, a, 1);
          else if (a.p > 66) this.wall(overrides, side, at);
          if (!a.place) hold(a.by, at, 2.2 - t * 1.5);
          if (a.place && t > 0.8) hold(a.by, at, 0.9);
        } else if (a.kind === 'goal-kick') {
          // The keeper places the ball on the six-yard line, walks back and runs up; the centre backs split if it goes short.
          if (a.place) this.placeRuns(overrides, a, 1);
          overrides[a.by] = t < 0.7 ? { x: at.x - dirOf(side) * 4.5, y: at.y } : { x: at.x - dirOf(side) * 0.8, y: at.y, sprint: true };
        }
        this.lastBallFrame = { side, p: a.p, a: a.a };
        break;
      }
      case 'shot': {
        possession = side;
        const from = toWorld(side, a.a, a.p);
        const goalX = side === 'home' ? LENGTH : 0;
        const kick = a.kind === 'penalty' ? 0.3 : 0.18;
        const flight = scene.flight ?? 0.3;
        const u = clamp((t - kick) / flight, 0, 1);
        let end;
        const aimY = side === 'home' ? (a.aimA / 100) * WIDTH : WIDTH - (a.aimA / 100) * WIDTH;
        if (scene.goal || scene.varGoal) end = { x: goalX + dirOf(side) * 1.6, y: aimY, z: clamp(a.aimZ, 0.1, 2.2) };
        else if (a.outcome === 'saved') end = { x: goalX - dirOf(side) * 0.9, y: aimY, z: clamp(a.aimZ, 0.2, 2.2) };
        else if (a.outcome === 'post') end = { x: goalX, y: 34 + (aimY > 34 ? GOAL_HALF : -GOAL_HALF), z: 1.2 };
        else if (a.outcome === 'blocked') end = { x: lerp(from.x, goalX, 0.22), y: lerp(from.y, 34, 0.22), z: 0.6 };
        else end = { x: goalX + dirOf(side) * 2.5, y: aimY, z: a.aimZ };
        const scaled = goalAdjust(scene);
        const u2 = clamp((scaled(t) - kick) / flight, 0, 1);
        ball = { x: lerp(from.x, end.x, u2), y: lerp(from.y, end.y, u2), z: lerp(0.1, end.z, u2) + Math.sin(u2 * Math.PI) * (a.kind === 'header' || a.kind === 'corner-header' ? 0.6 : 0.8), fast: u2 > 0 && u2 < 1, trail: true };
        if (scaled(t) < kick) { ball = { ...from, z: a.kind === 'header' || a.kind === 'corner-header' ? 2.1 : 0 }; hold(a.from, from, 0.9); }
        // After the shot: rebound off the keeper or post, ball in the net, or out.
        const after = clamp((scaled(t) - kick - flight) / 0.35, 0, 1);
        if (after > 0) {
          // Held: the ball stays in his gloves. Parried: it spins away.
          if (a.outcome === 'saved' && a.held) ball = { x: end.x, y: end.y, z: clamp(end.z, 0.3, 1.6) };
          else if (a.outcome === 'saved') ball = { x: end.x - dirOf(side) * after * 4, y: end.y + (end.y > 34 ? 1 : -1) * after * 6, z: end.z * (1 - after) };
          else if (a.outcome === 'post') ball = { x: end.x - dirOf(side) * after * 7, y: end.y + (end.y > 34 ? -1 : 1) * after * 4, z: 1.2 * (1 - after) + Math.sin(after * Math.PI) * 1.5 };
          else if (a.outcome === 'blocked') ball = { x: end.x - dirOf(side) * after * 5, y: end.y + after * 4, z: 0.4 * (1 - after) };
          else if (scene.goal || scene.varGoal) ball = { x: goalX + dirOf(side) * 1.9, y: end.y, z: Math.max(0, end.z * (1 - after)) };
        }
        const keeper = a.keeper && this.match.players[a.keeper] ? a.keeper : this.keeperOf(other(side));
        if (keeper) {
          const line = { x: goalX - dirOf(side) * 0.6, y: 34 + (from.y - 34) * 0.12 };
          const dive = scaled(t) > kick + flight * 0.35 && a.outcome !== 'blocked' && a.outcome !== 'wide' ? clamp((scaled(t) - kick - flight * 0.35) * 6, 0, 1) : 0;
          overrides[keeper] = dive ? { x: line.x, y: lerp(line.y, end.y, 0.85), dive: dive * (end.y > line.y ? 1 : -1) * (side === 'home' ? 1 : -1) } : line;
        }
        if (a.blocker && this.match.players[a.blocker]) overrides[a.blocker] = { x: lerp(from.x, goalX, 0.2), y: lerp(from.y, 34, 0.2) };
        // Celebration by the corner flag.
        if (scene.goal && scaled(t) > 0.62) {
          const flag = { x: side === 'home' ? LENGTH - 2 : 2, y: end.y > 34 ? WIDTH - 2 : 2 };
          overrides[a.from] = { x: flag.x, y: flag.y };
          this.lineup(side).forEach((id, k) => {
            if (id === a.from || this.match.players[id]?.slot === 'GK' || k % 3 === 0) return;
            overrides[id] = { x: flag.x - dirOf(side) * (2 + (k % 3)), y: flag.y + (flag.y < 34 ? 2 + (k % 4) : -2 - (k % 4)) };
          });
        }
        this.lastBallFrame = { side, p: a.p, a: a.a };
        break;
      }
      case 'foul':
      case 'card': {
        // The engine gives the point in the frame of the fouled side.
        possession = other(side);
        const point = toWorld(other(side), a.a, a.p);
        // The ball runs on to where the challenge happens instead of jumping there.
        if (!scene.ballFrom) scene.ballFrom = { ...this.ball };
        const k = clamp(t / 0.3, 0, 1);
        ball = { x: lerp(scene.ballFrom.x, point.x, k), y: lerp(scene.ballFrom.y, point.y, k), z: 0 };
        // He only goes down once the man fouling him has reached him.
        const offender = a.by ? this.bodyAt(a.by) : null;
        const contact = !offender || Math.hypot(offender.x - point.x, offender.y - point.y) < 1.8;
        if (contact && scene.kind === 'foul' && scene.contactAt == null) scene.contactAt = t;
        const down = scene.kind === 'foul' && scene.contactAt != null && t < 0.95;
        if (a.victim) overrides[a.victim] = { x: point.x, y: point.y, down, sprint: true };
        if (a.by) overrides[a.by] = { x: point.x - dirOf(other(side)) * 0.9, y: point.y + 0.7, sprint: true };
        this.lastBallFrame = { side: other(side), p: a.p, a: a.a };
        break;
      }
      case 'sub': {
        // By the fourth official on the halfway line: off walks the one, on runs the other.
        ball = { ...this.ball, z: 0 };
        possession = this.possession;
        (scene.subs || [a]).forEach((sub, k) => {
          const x = LENGTH / 2 + (k - ((scene.subs || [a]).length - 1) / 2) * 3;
          const line = WIDTH + 1.2;
          if (this.match.players[sub.out]) overrides[sub.out] = t < 0.75 ? { x: x - 0.9, y: line - (t < 0.45 ? 4 * (1 - t / 0.45) : 0), force: true } : { x: x - 0.9, y: line + 2.5, force: true };
          if (this.match.players[sub.by]) {
            const body = this.renderer.bodies.get(sub.by);
            // He waits on the touchline until his teammate is off, then goes on.
            if (body && !scene.placed?.has(sub.by)) { (scene.placed ||= new Set()).add(sub.by); body.x = x + 0.9; body.y = line + 0.6; body.on = true; }
            if (t < 0.6) overrides[sub.by] = { x: x + 0.9, y: line + 0.6 };
          }
        });
        break;
      }
      case 'injury': {
        ball = { ...this.ball, z: 0 };
        const body = this.bodyAt(a.by);
        overrides[a.by] = { x: body.x, y: body.y, down: true, force: true };
        break;
      }
      case 'period': {
        ball = { x: LENGTH / 2, y: WIDTH / 2, z: 0 };
        possession = null;
        return { ball, possession, overrides: {}, frame: { side: 'home', p: 50, a: 50 }, kickoff: 'none' };
      }
      default:
        ball = { ...this.ball };
    }
    this.applyPrep(scene, t, overrides, ball);
    return { ball, possession, overrides, frame: this.lastBallFrame };
  }

  /**
   * A cross (or a second ball) is in the air long enough for the man who wins it to arrive
   * (a footballer covers ~8 m/s at full tilt), never longer than a lofted
   * ball really takes.
   */
  timeForRunners(scene) {
    const a = scene.action;
    if (!a) return;
    if (a.t === 'foul' && a.by && this.match.players[a.by]) {
      // The foul needs the offender there: time for him to arrive.
      const body = this.bodyAt(a.by);
      const spot = toWorld(other(a.side), a.a, a.p);
      const need = ((Math.hypot(body.x - spot.x, body.y - spot.y) - 1.2) / 10) * 1000 / 0.6;
      scene.duration = clamp(Math.max(scene.duration, need), scene.duration, scene.duration * 2.2);
      return;
    }
    const loose = a.t === 'loose';
    const intercepted = a.t === 'pass' && !a.ok && a.by && !a.claim;
    const dribble = (a.t === 'dribble' || (a.t === 'carry' && !a.chase)) && a.vs;
    const who = loose ? a.to : dribble ? a.vs : a.ok ? a.to : a.by || a.to;
    const awaited = a.t === 'pass' && (a.kind === 'cross' || (a.ok && (a.bridge || ['through', 'cutback', 'long', 'switch', 'short', 'back'].includes(a.kind))));
    if (!(loose || dribble || intercepted || awaited) || !who || !this.match.players[who]) return;
    const body = this.bodyAt(who);
    const spot = dribble ? toWorld(a.side, lerp(a.a0, a.a1, 0.45), lerp(a.p0, a.p1, 0.45)) : toWorld(a.side, clamp(a.a1, 0, 100), clamp(a.p1, 0, 100));
    const need = ((Math.hypot(body.x - spot.x, body.y - spot.y) - 1) / 9) * 1000 / (dribble ? 0.45 : 0.88);
    // Never much more than twice as long as the action itself takes.
    scene.duration = clamp(Math.max(scene.duration, need), scene.duration, Math.max(scene.duration * 2.6, a.kind === 'cross' ? 3400 : 0));
  }

  bodyAt(id) {
    const body = this.renderer.bodies.get(id);
    return body ? { x: body.x, y: body.y } : { x: LENGTH / 2, y: WIDTH / 2 };
  }

  crowdBox(overrides, side, t) {
    const goalX = side === 'home' ? LENGTH : 0;
    let k = 0;
    for (const s of [side, other(side)]) {
      for (const id of this.lineup(s)) {
        if (overrides[id] || this.match.players[id]?.slot === 'GK') continue;
        if (k % 11 < 7) overrides[id] = { x: goalX - dirOf(side) * (3.5 + (k % 5) * 2.2), y: 25 + ((k * 7.3) % 18) + Math.sin(t * 6 + k) * 0.6 };
        k += 1;
      }
    }
  }

  penaltyShape(overrides, side, taker) {
    const goalX = side === 'home' ? LENGTH : 0;
    let k = 0;
    for (const s of ['home', 'away']) {
      for (const id of this.lineup(s)) {
        if (id === taker) { overrides[id] = { x: goalX - dirOf(side) * 13.5, y: 34 }; continue; }
        const keeper = this.match.players[id]?.slot === 'GK';
        if (keeper && s !== side) { overrides[id] = { x: goalX - dirOf(side) * 0.3, y: 34 }; continue; }
        if (keeper) continue;
        overrides[id] = { x: goalX - dirOf(side) * (19 + (k % 3) * 1.6), y: 16 + ((k * 37) % 36) };
        k += 1;
      }
    }
  }

  wall(overrides, side, at) {
    const defenders = this.lineup(other(side)).filter((id) => this.match.players[id]?.slot !== 'GK');
    const goal = { x: side === 'home' ? LENGTH : 0, y: 34 };
    const dx = goal.x - at.x; const dy = goal.y - at.y; const d = Math.hypot(dx, dy) || 1;
    const centre = { x: at.x + (dx / d) * 9.15, y: at.y + (dy / d) * 9.15 };
    defenders.slice(0, 4).forEach((id, k) => { overrides[id] = { x: centre.x, y: centre.y + (k - 1.5) * 0.75 * (dx / d) }; });
  }

  flag(scene, kind, at) {
    if (scene.flagged) return;
    scene.flagged = true;
    this.renderer.label(this.lang === 'es' ? 'FUERA DE JUEGO' : 'OFFSIDE', at.x, 1, 'card', 1400);
    this.onCue?.('whistle-foul');
  }

  /** Labels and sounds when a scene starts or reaches its moment. */
  fire(scene, t) {
    const a = scene.action;
    const e = scene.event;
    const fired = scene.fired || (scene.fired = new Set());
    const once = (key, fn) => { if (!fired.has(key)) { fired.add(key); fn(); } };
    const es = this.lang === 'es';
    if (!a) return;
    if (scene.kind === 'restart' && t >= 0) {
      once('start', () => {
        if (a.kind === 'kickoff') this.onCue?.('whistle-kickoff');
        if (a.kind === 'corner') { const at = toWorld(a.side, a.a, a.p); this.renderer.label(es ? 'CÓRNER' : 'CORNER', at.x, at.y, 'info', 1300); this.onCue?.('corner', { side: a.side }); }
        if (a.kind === 'penalty') { const at = toWorld(a.side, 50, 89); this.renderer.label(es ? 'PENALTI' : 'PENALTY', at.x, at.y, 'card', 1600); this.onCue?.('penalty', { side: a.side }); }
        if (a.kind === 'free-kick' && a.p > 66) { const at = toWorld(a.side, a.a, a.p); this.renderer.label(es ? 'FALTA PELIGROSA' : 'DANGEROUS FREE KICK', at.x, at.y, 'info', 1300); this.onCue?.('tension', { side: a.side }); }
      });
    }
    if (scene.kind === 'shot') {
      const scaled = goalAdjust(scene);
      once('kick', () => this.onCue?.('shot', { side: a.side, xg: e?.xg || 0 }));
      const impact = (a.kind === 'penalty' ? 0.3 : 0.18) + (scene.flight ?? 0.3);
      if (scaled(t) >= impact) once('impact', () => {
        const goalX = a.side === 'home' ? LENGTH : 0;
        const y = a.side === 'home' ? (a.aimA / 100) * WIDTH : WIDTH - (a.aimA / 100) * WIDTH;
        if (scene.goal) { this.renderer.goalBurst(a.side, this.renderer.kits?.[a.side]?.main); this.onGoal?.(e); this.onCue?.('goal', { side: a.side }); }
        else if (scene.varGoal) { this.renderer.goalBurst(a.side, '#ffffff'); this.onCue?.('goal', { side: a.side, disallowed: true }); }
        else if (a.outcome === 'saved') { this.renderer.label(e?.xg >= 0.25 ? (es ? '¡PARADÓN!' : 'GREAT SAVE!') : (es ? 'PARADA' : 'SAVE'), goalX, y, 'save', 1300); this.onCue?.('miss', { side: a.side, xg: e?.xg || 0, kind: 'save' }); }
        else if (a.outcome === 'post') { this.renderer.label(es ? '¡AL PALO!' : 'OFF THE POST!', goalX, y, 'card', 1500); this.onCue?.('miss', { side: a.side, xg: Math.max(0.3, e?.xg || 0), kind: 'post' }); }
        else if (a.outcome === 'blocked') { const at = toWorld(a.side, a.a, a.p); this.renderer.label(es ? 'TAPADO' : 'BLOCKED', at.x, at.y, 'info', 1100); this.onCue?.('miss', { side: a.side, xg: (e?.xg || 0) * 0.5, kind: 'block' }); }
        else { this.renderer.label(e?.xg >= 0.25 ? (es ? '¡SE MARCHA FUERA!' : 'MISSED!') : (es ? 'FUERA' : 'WIDE'), goalX, y, 'info', 1200); this.onCue?.('miss', { side: a.side, xg: e?.xg || 0, kind: 'wide' }); }
      });
      if (scene.varGoal && scaled(t) >= 0.75) once('var', () => { this.onGoal?.({ ...e, disallowed: true }); this.onCue?.('var', { side: a.side }); });
    }
    if (scene.kind === 'foul') once('start', () => {
      const at = toWorld(other(a.side), a.a, a.p);
      this.renderer.label(a.inBox ? (es ? '¡PENALTI!' : 'PENALTY!') : (es ? 'FALTA' : 'FOUL'), at.x, at.y, a.inBox ? 'card' : 'info', 1200);
      this.onCue?.('foul', { side: a.side, inBox: a.inBox });
    });
    if (scene.kind === 'card') once('start', () => {
      const at = toWorld(other(a.side), a.a, a.p);
      this.renderer.label(a.card === 'yellow' ? (es ? 'AMARILLA' : 'YELLOW') : (es ? '¡ROJA!' : 'RED!'), at.x, at.y, a.card === 'yellow' ? 'card' : 'red', 1500);
      this.onCue?.('card', { side: a.side, card: a.card });
    });
    if (scene.kind === 'injury') once('start', () => { const b = this.bodyAt(a.by); this.renderer.label(es ? 'LESIÓN' : 'INJURY', b.x, b.y, 'red', 1500); this.onCue?.('whistle-foul'); });
    if (scene.kind === 'period') once('start', () => this.onCue?.(a.ended === 1 || a.ended === 3 ? 'whistle-end' : 'whistle-period'));
    if (scene.kind === 'pass' && a.kind === 'cross') once('cross', () => this.onCue?.('tension', { side: a.side }));
    if (scene.kind === 'dribble' && a.ok && a.p1 > 70) once('drib', () => this.onCue?.('tension', { side: a.side }));
  }

  /** Advance playback; returns the scene on screen. */
  update(dtMs, speedFactor) {
    if (!this.scene && this.queue.length) {
      this.scene = this.queue.shift();
      this.elapsed = 0;
      if (this.scene.event) this.onEvent?.(this.scene.event, this.scene);
      if (this.scene.kind === 'event' && this.scene.event?.type === 'full-time') this.onCue?.('whistle-end');
      if (this.scene.kind === 'event' && this.scene.event?.type === 'kick-off') this.onCue?.('whistle-kickoff');
      if (this.scene.kind === 'cut') this.renderer.cut?.();
      if (this.scene.kind === 'sub') {
        // The board goes up: red for the numbers going off, green for those coming on.
        const list = (this.scene.subs || [this.scene.action]).filter(Boolean);
        const P = (id) => this.match.players[id];
        this.renderer.showSubs?.(list.map((s) => ({ side: s.side, out: P(s.out), on: P(s.by) })), this.scene.duration);
        for (const e of (this.scene.events || []).slice(1)) this.onEvent?.(e, this.scene);
        this.onCue?.('whistle-foul');
      }
      this.timeForRunners(this.scene);
    }
    const scene = this.scene;
    if (!scene) return null;
    this.elapsed += dtMs * speedFactor;
    const t = clamp(this.elapsed / scene.duration, 0, 1);
    this.fire(scene, t);
    const { ball, possession, overrides, frame, kickoff } = this.frame(scene, t);
    if (possession !== undefined && possession !== null) this.possession = possession;
    let targets;
    if (kickoff && kickoff !== 'none') targets = this.kickoffTargets(kickoff);
    else if (kickoff === 'none') targets = this.kickoffTargets('home');
    else targets = this.shapeTargets(this.possession, frame || this.lastBallFrame, scene.action?.t === 'carry' || scene.action?.t === 'dribble' ? scene.action.from : scene.action?.to || null);
    for (const [id, target] of Object.entries(overrides || {})) if (targets[id] || target.force) targets[id] = { ...targets[id], ...target };
    // The referee keeps a diagonal a few metres from play.
    targets.__ref = { x: clamp(ball.x - 9 * dirOf(this.possession || 'home'), 3, LENGTH - 3), y: clamp(ball.y + (ball.y > 34 ? -11 : 11), 4, WIDTH - 4) };
    for (const body of this.renderer.bodies.values()) body.highlight = null;
    const focus = scene.action?.from || scene.action?.by || scene.event?.player;
    if (focus && this.renderer.bodies.get(focus)) this.renderer.bodies.get(focus).highlight = 'event';
    this.ball = { x: ball.x, y: ball.y, z: ball.z || 0 };
    this.renderer.setTargets(targets, { ...ball, snap: true }, dtMs * speedFactor);
    if (t >= 1) this.scene = null;
    return scene;
  }

  skip() {
    this.queue = [];
    this.scene = null;
  }
}

/** Goal scenes are longer (celebration): the shot itself keeps its normal pace. */
function goalAdjust(scene) {
  if (!scene.goal && !scene.varGoal) return (t) => t;
  const ratio = SCENE_MS.shot / scene.duration;
  return (t) => (t <= ratio ? t / ratio : 1 + (t - ratio));
}

const phases = new Map();
function sway(id) {
  if (!phases.has(id)) phases.set(id, Math.random() * 10);
  return phases.get(id) + performance.now() / 1000;
}
export { toFrame };
