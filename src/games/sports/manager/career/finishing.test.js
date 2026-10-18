import { afterEach, describe, expect, it, vi } from 'vitest';
import { advanceMatch, createMatch } from './match.js';
import { FORMATIONS, deriveAttributes } from './positions.js';
import { createStream } from './util.js';
import * as shape from './shape.js';

function team(id, tactics = {}) {
  const random = createStream('finishing', id);
  const players = {};
  const lineup = FORMATIONS['4-3-3'].map(([pos], i) => {
    const p = { id: `${id}-${i}`, name: `${id} ${i}`, pos, alt: [], number: i + 1, ovr: 75, energy: 100, age: 26 };
    p.attrs = deriveAttributes(p, random);
    players[p.id] = p;
    return p.id;
  });
  return { id, name: id, formation: '4-3-3', lineup, bench: [], players, tactics };
}

function matchAt(side, i, ball = {}, tactics = {}) {
  const match = createMatch({ id: `finish-${i}`, seed: 'finishing', home: team('H', tactics), away: team('A', tactics), userSide: 'home', neutral: true, clockRate: 120 });
  match.phase = 'live';
  match.ball = { side, p: 89, a: 50, carrier: match.sides[side].lineup[9], facing: 'goal', last: 'short', seq: 2, fresh: 3, ...ball };
  return match;
}

const originalLayout = shape.layoutTeams;
function openLayout({ blocked = false, receiver = false } = {}) {
  vi.spyOn(shape, 'layoutTeams').mockImplementation((match, ball, opts) => {
    const layout = originalLayout(match, ball, opts);
    const rival = ball.side === 'home' ? 'away' : 'home';
    // Defenders have been beaten, with only the keeper between ball and goal.
    match.sides[rival].lineup.forEach((id, i) => {
      layout.pos[id] = i === 0 ? { p: 2, a: 50 } : { p: 35 + i, a: i % 2 ? 15 : 85 };
    });
    if (blocked) {
      layout.pos[match.sides[rival].lineup[2]] = { p: 100 - ball.p - 1, a: 100 - ball.a };
      layout.pos[match.sides[rival].lineup[3]] = { p: 100 - ball.p - 2, a: 100 - ball.a - 1 };
    }
    if (receiver) layout.pos[match.sides[ball.side].lineup[9]] = { p: 90, a: 50 };
    layout.first = null;
    layout.second = null;
    layout.offside = 96;
    return layout;
  });
}

afterEach(() => vi.restoreAllMocks());

describe.each(['home', 'away'])('finishing decisions: %s (user and opponent)', (side) => {
  it('takes clear box chances even with slow possession instructions', () => {
    openLayout();
    let shots = 0;
    for (let i = 0; i < 80; i++) {
      const result = advanceMatch(matchAt(side, i, {}, { tempo: 'slow', buildUp: 'short', finalThird: 'work-box' }), 1);
      if (result.lastChain[0]?.t === 'shot') shots++;
    }
    expect(shots).toBeGreaterThanOrEqual(64);
  });

  it('uses space on the central edge of the box to shoot', () => {
    openLayout();
    let shots = 0;
    for (let i = 0; i < 80; i++) {
      const result = advanceMatch(matchAt(side, i, { p: 80, last: 'carry' }), 1);
      if (result.lastChain[0]?.t === 'shot') shots++;
    }
    expect(shots).toBeGreaterThanOrEqual(48);
  });

  it('does not force shots from tight angles, long range or with his back to goal', () => {
    openLayout();
    for (const ball of [{ p: 93, a: 8 }, { p: 63, a: 50 }, { facing: 'back' }]) {
      let shots = 0;
      for (let i = 0; i < 60; i++) {
        if (advanceMatch(matchAt(side, i, ball), 1).lastChain[0]?.t === 'shot') shots++;
      }
      expect(shots).toBeLessThan(30);
    }
  });

  it('keeps alternatives when defenders close the shooting lane', () => {
    openLayout({ blocked: true });
    let shots = 0;
    for (let i = 0; i < 60; i++) {
      if (advanceMatch(matchAt(side, i), 1).lastChain[0]?.t === 'shot') shots++;
    }
    expect(shots).toBeLessThan(30);
  });

  it('finishes in the same sequence after a forward carry creates room', () => {
    openLayout();
    let chances = 0; let finishes = 0;
    for (let i = 0; i < 120; i++) {
      const result = advanceMatch(matchAt(side, i, { p: 76, last: 'carry' }), 1);
      const [carry, shot] = result.lastChain;
      if (carry?.t !== 'carry' || carry.vs || carry.p1 < 81) continue;
      chances++;
      if (shot?.t === 'shot' && shot.from === carry.from) finishes++;
    }
    expect(chances).toBeGreaterThan(10);
    expect(finishes / chances).toBeGreaterThan(0.5);
  });

  it('heads a successful high pass in the box instead of always controlling it', () => {
    openLayout({ receiver: true });
    let receptions = 0; let headers = 0;
    for (let i = 0; i < 350; i++) {
      const initial = matchAt(side, i, { p: 54, carrier: `${side === 'home' ? 'H' : 'A'}-5` }, { buildUp: 'direct', tempo: 'fast' });
      const [pass, shot] = advanceMatch(initial, 1).lastChain;
      if (pass?.t !== 'pass' || !pass.lofted || !pass.ok || pass.p1 < 84 || pass.a1 < 30 || pass.a1 > 70) continue;
      receptions++;
      if (shot?.t === 'shot' && shot.kind === 'header' && shot.from === pass.to) headers++;
    }
    expect(receptions).toBeGreaterThan(4);
    expect(headers / receptions).toBeGreaterThan(0.6);
  });

  it.each(['corner', 'free-kick'])('keeps successful %s deliveries linked to a finish', (restart) => {
    let headers = 0; let receptions = 0;
    for (let i = 0; i < 100; i++) {
      const initial = matchAt(side, i, { p: restart === 'corner' ? 99.5 : 76, a: 4, restart, carrier: null });
      const chain = advanceMatch(initial, 1).lastChain;
      const crossIndex = chain.findIndex(a => a.t === 'pass' && a.kind === 'cross' && a.ok);
      if (crossIndex < 0) continue;
      receptions++;
      const next = chain[crossIndex + 1];
      const shot = next?.t === 'shot' ? next : chain[crossIndex + 2];
      expect(shot?.t).toBe('shot');
      expect(shot.side).toBe(side);
      if (['header', 'corner-header'].includes(shot.kind)) headers++;
    }
    expect(receptions).toBeGreaterThan(5);
    expect(headers).toBeGreaterThan(3);
  });
});
