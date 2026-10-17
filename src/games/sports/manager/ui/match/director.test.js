import { describe, it, expect } from 'vitest';
import { createMatch, advanceMatch, MATCH_CLOCK_RATE } from '../../career/match.js';
import { FORMATIONS, deriveAttributes } from '../../career/positions.js';
import { createStream } from '../../career/util.js';
import { Director } from './director.js';

function team(id, ovr) {
  const random = createStream('t', id);
  const players = {};
  const lineup = []; const bench = [];
  [...FORMATIONS['4-3-3'].map(([pos]) => pos), 'GK', 'CB', 'RB', 'CM', 'CAM', 'RW', 'ST'].forEach((pos, i) => {
    const p = { id: `${id}-${i}`, name: `${id} ${i}`, number: i + 1, pos, alt: [], ovr, age: 26, energy: 100 };
    p.attrs = deriveAttributes(p, random);
    players[p.id] = p;
    (i < 11 ? lineup : bench).push(p.id);
  });
  return { id, name: id, formation: '4-3-3', lineup, bench, players, tactics: {} };
}

/** A renderer without a canvas that moves bodies like PitchRenderer.step does. */
function fakeRenderer() {
  const bodies = new Map();
  return {
    bodies, kits: {}, ball: { x: 52.5, y: 34 }, label() {}, goalBurst() {}, cut() {},
    setTargets(targets, ball, dtMs) {
      this.ball = ball;
      const jump = this.snapBodies;
      this.snapBodies = false;
      const dt = Math.min(0.05, dtMs / 1000);
      for (const [id, t] of Object.entries(targets)) {
        if (!bodies.has(id)) bodies.set(id, { x: t.x, y: t.y });
        const b = bodies.get(id);
        if (jump) { b.x = t.x; b.y = t.y; }
        const dx = t.x - b.x; const dy = t.y - b.y; const dist = Math.hypot(dx, dy);
        const max = (t.dive ? 10 : t.sprint ? 10.5 : 7.6) * dt;
        const move = Math.min(dist, max, dist * 0.14 + max * 0.25);
        if (dist > 0.01) { b.x += (dx / dist) * move; b.y += (dy / dist) * move; }
        expect(Number.isFinite(t.x) && Number.isFinite(t.y)).toBe(true);
      }
    },
  };
}

describe('match director', () => {
  it('plays a manager match in about twenty minutes at 1x without cutting open play and puts the defender on the ball in every duel', () => {
    const renderer = fakeRenderer();
    let match = createMatch({ id: 'dir', seed: 'dir', date: '2025-09-01', comp: { id: 'x' }, home: team('H', 77), away: team('A', 76), clockRate: MATCH_CLOCK_RATE });
    const director = new Director(renderer, { lang: 'es' });
    director.sync(match);
    let screen = 0;
    const gaps = [];
    while (!match.complete || director.busy) {
      if (!director.busy && !match.complete) { const next = advanceMatch(match, 1, { ignorePauses: true }); director.enqueue(match, next); match = next; }
      const scene = director.update(16, 1);
      screen += 16;
      const a = scene?.action;
      if (!a) continue;
      const t = director.scene === scene ? director.elapsed / scene.duration : 1;
      const duelist = a.t === 'foul' ? a.by : a.t === 'carry' && a.vs && !a.chase ? a.vs : null;
      if (duelist && t > 0.85 && !scene.measured) {
        scene.measured = true;
        const b = renderer.bodies.get(duelist);
        gaps.push(Math.hypot(b.x - renderer.ball.x, b.y - renderer.ball.y));
      }
    }
    const minutes = screen / 60000;
    expect(minutes).toBeGreaterThan(15);
    expect(minutes).toBeLessThan(25);
    gaps.sort((x, y) => x - y);
    expect(gaps.length).toBeGreaterThan(10);
    expect(gaps[Math.floor(gaps.length / 2)]).toBeLessThan(2);
    expect(gaps[Math.floor(gaps.length * 0.9)]).toBeLessThan(4);
  });
});
