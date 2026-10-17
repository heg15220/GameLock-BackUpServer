import { describe, it, expect } from 'vitest';
import { normalizeTactics, roleParams, autoRoles, tacticalSummary, applyPreset, rolesFor, ROLES, PRESETS, INSTRUCTIONS, TACTIC_DEFAULTS } from './tactics.js';
import { layoutTeams, metres } from './shape.js';
import { createMatch, playToEnd, advanceMatch } from './match.js';
import { FORMATIONS, deriveAttributes } from './positions.js';
import { createStream } from './util.js';

const slotsOf = (formation) => FORMATIONS[formation].map(([pos]) => pos);

function team(id, ovr, formation = '4-3-3', tactics = {}) {
  const random = createStream('t', id);
  const players = {};
  const lineup = []; const bench = [];
  [...slotsOf(formation), 'GK', 'CB', 'RB', 'CM', 'CAM', 'RW', 'ST'].forEach((pos, i) => {
    const p = { id: `${id}-${i}`, name: `${id} ${i}`, number: i + 1, pos, alt: [], ovr: ovr - (i >= 11 ? 4 : 0), age: 26, energy: 100 };
    p.attrs = deriveAttributes(p, random);
    players[p.id] = p;
    (i < 11 ? lineup : bench).push(p.id);
  });
  return { id, name: id, formation, lineup, bench, players, tactics };
}

describe('tactics', () => {
  it('reads old saves and fills every instruction', () => {
    const t = normalizeTactics({ mentality: 'attacking', pressing: 'high', tempo: 'fast' });
    expect(t.block).toBe('high');
    expect(t.buildUp).toBe('balanced');
    expect(normalizeTactics({ block: 'nonsense' }).block).toBe('mid');
    for (const key of Object.keys(INSTRUCTIONS)) expect(INSTRUCTIONS[key]).toContain(normalizeTactics({})[key]);
  });

  it('gives every position at least one role and every role valid focuses', () => {
    for (const slot of ['GK', 'RB', 'LB', 'CB', 'RWB', 'LWB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'ST']) expect(rolesFor(slot).length).toBeGreaterThan(0);
    for (const [id, role] of Object.entries(ROLES)) for (const focus of role.focuses) {
      const p = roleParams(`${id}:${focus}`, role.slots[0]);
      expect(p.id).toBe(id);
      expect(p.ip).toHaveLength(3);
    }
  });

  it('turns focus and role into behaviour', () => {
    expect(roleParams('advanced-forward:attack', 'ST').track).toBeLessThan(roleParams('advanced-forward:support', 'ST').track);
    expect(roleParams('fullback:defend', 'RB').run).toBeLessThan(roleParams('attacking-wingback:attack', 'RB').run);
    expect(roleParams('inverted-wingback:build-up', 'LB').ip[1][1]).toBeGreaterThan(15);
    // A role that does not exist for the slot falls back to the slot's default.
    expect(roleParams('poacher:attack', 'CB').id).toBe('defender');
  });

  it('picks roles a coach would pick', () => {
    const slots = slotsOf('3-5-2');
    const players = slots.map((pos) => ({ pos, ovr: 75, attrs: pos === 'ST' ? { pac: 60, sho: 76, pas: 60, dri: 64, def: 30, phy: 88 } : null }));
    const roles = autoRoles(players, slots);
    expect(roles[1]).toMatch(/^wide-back/);
    expect(roles[3]).toMatch(/^wide-back/);
    expect(roles[9]).toMatch(/^target-forward/);
  });

  it('summarises the cost of a tactic', () => {
    const slots = slotsOf('4-3-3');
    const press = tacticalSummary({ ...TACTIC_DEFAULTS, ...PRESETS.gegenpress }, slots);
    const bus = tacticalSummary({ ...TACTIC_DEFAULTS, ...PRESETS['park-the-bus'] }, slots);
    expect(press.ratings.endurance).toBeLessThan(bus.ratings.endurance);
    expect(press.ratings.length).toBeGreaterThan(bus.ratings.length);
    expect(press.notes.some((n) => n.tone === 'good')).toBe(true);
    const kept = applyPreset({ ...TACTIC_DEFAULTS, formation: '4-4-2', roles: { 0: 'sweeper-keeper:balanced' } }, 'tiki-taka');
    expect(kept.formation).toBe('4-4-2');
    expect(kept.roles[0]).toBe('sweeper-keeper:balanced');
    expect(kept.buildUp).toBe('short');
  });
});

describe('team shape', () => {
  const make = (homeTactics = {}, awayTactics = {}) => createMatch({ id: 'shape', seed: 's', date: '2025-09-01', comp: { id: 'x' }, home: team('H', 75, '4-3-3', homeTactics), away: team('A', 75, '4-3-3', awayTactics) });

  it('keeps attackers onside and the back line flat', () => {
    const match = make();
    const { pos, offside } = layoutTeams(match, { side: 'home', p: 62, a: 30, carrier: match.sides.home.lineup[6] });
    for (const id of match.sides.home.lineup.slice(1)) if (id !== match.sides.home.lineup[6]) expect(pos[id].p).toBeLessThanOrEqual(offside + 0.5);
    const back = match.sides.away.lineup.slice(1, 5).map((id) => pos[id].p);
    expect(Math.max(...back) - Math.min(...back)).toBeLessThan(6);
  });

  it('sits deeper in a low block and slides towards the ball', () => {
    const low = make({}, { block: 'low' });
    const high = make({}, { block: 'high' });
    const ball = { side: 'home', p: 40, a: 50, carrier: low.sides.home.lineup[6] };
    const backLine = (m) => layoutTeams(m, ball).line;
    expect(backLine(low)).toBeLessThan(backLine(high));
    const across = (a) => {
      const { pos } = layoutTeams(low, { ...ball, a });
      return low.sides.away.lineup.slice(1).reduce((s, id) => s + pos[id].a, 0) / 10;
    };
    // The away frame mirrors "across": the ball on the home side's left is on the away side's right.
    expect(across(15)).toBeGreaterThan(across(85));
  });

  it('presses closer with a higher intensity and covers the presser', () => {
    const ballFor = (m) => ({ side: 'home', p: 45, a: 50, carrier: m.sides.home.lineup[6] });
    const gap = (pressing) => {
      const m = make({}, { pressing, block: 'high' });
      const L = layoutTeams(m, ballFor(m));
      return { gap: L.gap, first: L.first, second: L.second, pos: L.pos };
    };
    const high = gap('high');
    const low = gap('low');
    expect(high.gap).toBeLessThan(low.gap);
    expect(high.second).toBeTruthy();
    const ball = { p: 55, a: 50 };
    expect(metres(high.pos[high.first], ball)).toBeLessThan(metres(high.pos[high.second], ball));
  });

  it('moves players by role: an inverted wingback steps inside, a false 9 drops', () => {
    const plain = make({ roles: { 1: 'fullback:balanced', 9: 'advanced-forward:attack' } });
    const inverted = make({ roles: { 1: 'inverted-wingback:attack', 9: 'false-9:build-up' } });
    const ball = { side: 'home', p: 55, a: 50, carrier: plain.sides.home.lineup[6] };
    const rb = plain.sides.home.lineup[1];
    const st = plain.sides.home.lineup[9];
    const a = layoutTeams(plain, ball).pos;
    const b = layoutTeams(inverted, ball).pos;
    expect(Math.abs(b[rb].a - 50)).toBeLessThan(Math.abs(a[rb].a - 50) - 10);
    expect(b[st].p).toBeLessThan(a[st].p - 4);
  });
});

describe('tactics change matches', () => {
  const run = (n, homeTactics, awayTactics = {}) => {
    const total = { crosses: 0, highTurnovers: 0, offsides: 0, longBalls: 0, passes: 0, shots: 0 };
    for (let i = 0; i < n; i += 1) {
      const m = playToEnd(createMatch({ id: `t${i}`, seed: 'tac', date: '2025-09-01', comp: { id: 'x' }, neutral: true, home: team(`H${i}`, 75, '4-3-3', homeTactics), away: team(`A${i}`, 75, '4-3-3', awayTactics) }));
      for (const k of Object.keys(total)) total[k] += k === 'offsides' ? m.stats.away.offsides : m.stats.home[k];
    }
    return total;
  };

  it('width, block, offside trap and build-up do what they say', () => {
    const n = 30;
    expect(run(n, { width: 'wide', finalThird: 'early-cross' }).crosses).toBeGreaterThan(run(n, { width: 'narrow', finalThird: 'work-box' }).crosses);
    expect(run(n, { block: 'high', pressing: 'high' }).highTurnovers).toBeGreaterThan(run(n, { block: 'low', pressing: 'low' }).highTurnovers);
    expect(run(n, { offsideTrap: true, line: 'high' }).offsides).toBeGreaterThan(run(n, { line: 'deep' }).offsides);
    const direct = run(n, { buildUp: 'direct' });
    const short = run(n, { buildUp: 'short' });
    expect(direct.longBalls / direct.passes).toBeGreaterThan(short.longBalls / short.passes);
  });

  it('stages crosses as runs into zones with markers', () => {
    let crosses = 0;
    const zones = new Set();
    let match = createMatch({ id: 'chain-x', seed: 'cross', date: '2025-09-01', comp: { id: 'x' }, home: team('HX', 76, '4-3-3', { width: 'wide', finalThird: 'early-cross' }), away: team('AX', 74) });
    while (!match.complete) {
      match = advanceMatch(match, 1, { ignorePauses: true });
      for (const a of match.lastChain) {
        if (a.t !== 'pass' || a.kind !== 'cross') continue;
        crosses += 1;
        zones.add(a.zone);
        for (const [id] of a.place || []) expect(match.players[id]).toBeTruthy();
      }
    }
    expect(crosses).toBeGreaterThan(5);
    expect(zones.size).toBeGreaterThan(2);
  });
});
