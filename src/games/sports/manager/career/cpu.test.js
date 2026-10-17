import { describe, it, expect } from 'vitest';
import { cpuProfile, dynamicReview, situationalPlan, factor, freshMemory } from './cpu.js';
import { createMatch, playToEnd } from './match.js';
import { FORMATIONS, deriveAttributes } from './positions.js';
import { createStream } from './util.js';
import { TACTIC_DEFAULTS } from './tactics.js';

function team(id, ovr, style = 'balanced') {
  const random = createStream('t', id);
  const players = {};
  const lineup = []; const bench = [];
  [...FORMATIONS['4-3-3'].map(([pos]) => pos), 'GK', 'CB', 'RB', 'CM', 'CAM', 'RW', 'ST'].forEach((pos, i) => {
    const p = { id: `${id}-${i}`, name: `${id} ${i}`, number: i + 1, pos, alt: [], ovr, age: 26, energy: 100 };
    p.attrs = deriveAttributes(p, random);
    players[p.id] = p;
    (i < 11 ? lineup : bench).push(p.id);
  });
  return { id, name: id, formation: '4-3-3', lineup, bench, players, tactics: {}, style };
}

describe('CPU opponent', () => {
  it('gives every club its own sliders around its style', () => {
    const a = cpuProfile('club-a', 'pressing');
    const b = cpuProfile('club-b', 'pressing');
    const c = cpuProfile('club-c', 'possession');
    expect(a.sliders.aggression).toBeGreaterThan(c.sliders.aggression);
    expect(c.sliders.buildUp).toBeLessThan(a.sliders.buildUp);
    expect(a.sliders).not.toEqual(b.sliders);
    expect(factor(50)).toBe(1);
    expect(factor(100)).toBeGreaterThan(1);
    expect(factor(0)).toBeLessThan(1);
  });

  it('adapts like a Dynamic AI: leans into the flank that works, goes long against a press', () => {
    const memory = freshMemory();
    memory.xgFor.right = 0.5; memory.xgFor.center = 0.1;
    memory.ownThirdLosses = 4;
    const review = dynamicReview({ ...TACTIC_DEFAULTS }, memory, { possessionAgainst: 0.5, diff: 0 });
    expect(review.changes.focus).toBe('right');
    expect(review.changes.goalKicks).toBe('long');
  });

  it('follows the situation like the tactical suggestions', () => {
    expect(situationalPlan({ minute: 85, diff: 1, men: 11, rivalMen: 11, xgFor: 1, xgAgainst: 1, possession: 0.5, knockout: true }).preset).toBe('park-the-bus');
    expect(situationalPlan({ minute: 82, diff: -1, men: 11, rivalMen: 11, xgFor: 0.5, xgAgainst: 1.5, possession: 0.6, knockout: false }).focus).toBe(1);
    expect(situationalPlan({ minute: 30, diff: 0, men: 10, rivalMen: 11, xgFor: 0.3, xgAgainst: 0.3, possession: 0.5, knockout: false }).focus).toBe(-1);
  });

  it('makes a harder CPU beat the manager more often', () => {
    const run = (level) => {
      let diff = 0;
      for (let i = 0; i < 80; i += 1) {
        const m = playToEnd(createMatch({ id: `l${i}`, seed: 'lvl', date: '2025-09-01', comp: { id: 'x' }, neutral: true, userSide: 'home', home: team(`H${i}`, 75), away: team(`A${i}`, 75), cpu: { level } }));
        diff += m.score.away - m.score.home;
      }
      return diff / 80;
    };
    expect(run('legendary')).toBeGreaterThan(run('amateur') + 0.3);
  });
});
