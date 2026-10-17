import { describe, it, expect } from 'vitest';
import { createMatch, playToEnd, advanceMatch, userSubstitute, quickResult, sideStrength, shotXg } from './match.js';
import { FORMATIONS } from './positions.js';
import { createStream } from './util.js';
import { deriveAttributes } from './positions.js';

function team(id, ovr, formation = '4-3-3') {
  const random = createStream('t', id);
  const slots = FORMATIONS[formation].map(([pos]) => pos);
  const extra = ['GK', 'CB', 'RB', 'CM', 'CAM', 'RW', 'ST', 'CDM', 'LB'];
  const players = {};
  const lineup = []; const bench = [];
  [...slots, ...extra].forEach((pos, i) => {
    const p = { id: `${id}-${i}`, name: `${id} ${i}`, number: i + 1, pos, alt: [], ovr: ovr - (i >= 11 ? 4 : 0), age: 26, energy: 100 };
    p.attrs = deriveAttributes(p, random);
    players[p.id] = p;
    (i < 11 ? lineup : bench).push(p.id);
  });
  return { id, name: id, formation, lineup, bench, players, tactics: {} };
}

function averages(n, a, b, opts = {}) {
  const t = { goals: 0, shots: 0, sot: 0, corners: 0, fouls: 0, yc: 0, rc: 0, pens: 0, offsides: 0, homeWins: 0, draws: 0, xg: 0, injuries: 0, subs: 0 };
  for (let i = 0; i < n; i += 1) {
    const m = playToEnd(createMatch({ id: `m${i}`, seed: 'cal', date: '2025-09-01', comp: { id: 'x' }, home: team('H', a), away: team('A', b), ...opts }));
    t.goals += m.score.home + m.score.away;
    for (const s of ['home', 'away']) {
      const st = m.stats[s];
      t.shots += st.shots; t.sot += st.sot; t.corners += st.corners; t.fouls += st.fouls; t.yc += st.yc; t.rc += st.rc; t.offsides += st.offsides; t.xg += st.xg;
      t.subs += m.sides[s].subs;
    }
    t.pens += m.events.filter((e) => e.type === 'penalty-awarded').length;
    t.injuries += m.events.filter((e) => e.type === 'injury').length;
    if (m.score.home > m.score.away) t.homeWins += 1; else if (m.score.home === m.score.away) t.draws += 1;
  }
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, +(v / n).toFixed(2)]));
}

describe('match engine calibration', () => {
  it('produces realistic averages for evenly matched teams', () => {
    const avg = averages(500, 75, 75);
    console.log('even', avg);
    expect(avg.goals).toBeGreaterThan(2.2); expect(avg.goals).toBeLessThan(3.2);
    expect(avg.shots).toBeGreaterThan(19); expect(avg.shots).toBeLessThan(30);
    expect(avg.yc).toBeGreaterThan(2.8); expect(avg.yc).toBeLessThan(5.5);
    expect(avg.corners).toBeGreaterThan(7); expect(avg.corners).toBeLessThan(13);
    expect(avg.homeWins).toBeGreaterThan(0.38); expect(avg.homeWins).toBeLessThan(0.52);
  });
  it('lets the stronger side win more often', () => {
    const avg = averages(300, 84, 70);
    console.log('strong', avg);
    expect(avg.homeWins).toBeGreaterThan(0.62);
  });
  it('quick results are on the same scale', () => {
    let goals = 0; let home = 0;
    const s = { att: 75, mid: 75, def: 75, gk: 75 };
    for (let i = 0; i < 2000; i += 1) { const r = quickResult({ seed: 'q', id: `q${i}`, home: s, away: s, detail: false }); goals += r.hg + r.ag; if (r.hg > r.ag) home += 1; }
    console.log('quick', goals / 2000, home / 2000);
    expect(goals / 2000).toBeGreaterThan(2.3); expect(goals / 2000).toBeLessThan(3.1);
  });
  it('is deterministic and pauses at half time for the user', () => {
    const make = () => createMatch({ id: 'd', seed: 's', date: '2025-09-01', comp: { id: 'x' }, home: team('H', 75), away: team('A', 74), userSide: 'home' });
    const a = advanceMatch(make(), 200);
    expect(a.pausedFor).toBe('half-time');
    expect(a.complete).toBe(false);
    const b = advanceMatch(make(), 200);
    expect(b.score).toEqual(a.score);
    const subbed = userSubstitute(a, a.sides.home.lineup[9], a.sides.home.bench[6]);
    expect(subbed.sides.home.subs).toBe(1);
    const end = advanceMatch(subbed, 200, { ignorePauses: true });
    expect(end.complete).toBe(true);
    expect(end.motm).toBeTruthy();
  });
  it('settles knockouts with extra time or penalties', () => {
    let shootouts = 0;
    for (let i = 0; i < 120; i += 1) {
      const m = playToEnd(createMatch({ id: `k${i}`, seed: 'ko', date: '2025-09-01', comp: { id: 'x' }, home: team('H', 75), away: team('A', 75), knockout: true }));
      expect(m.winner).not.toBeNull();
      if (m.pens) { shootouts += 1; expect(m.pens.home).not.toBe(m.pens.away); }
    }
    console.log('shootouts', shootouts);
    expect(shootouts).toBeGreaterThan(5);
  });

  it('stages every minute as a coherent chain of actions by real players', () => {
    let match = createMatch({ id: 'chain', seed: 'c', date: '2025-09-01', comp: { id: 'x' }, home: team('H', 76), away: team('A', 74) });
    const kinds = new Set();
    while (!match.complete) {
      match = advanceMatch(match, 1, { ignorePauses: true });
      for (const action of match.lastChain) {
        kinds.add(action.t === 'pass' ? `pass:${action.kind}` : action.t === 'restart' ? `restart:${action.kind}` : action.t);
        for (const key of ['from', 'to', 'by', 'victim', 'vs']) {
          if (action[key]) expect(match.players[action[key]]).toBeTruthy();
        }
        if (action.t === 'pass' && action.ok) expect(match.players[action.to].side).toBe(action.side);
        if (action.t === 'pass' && action.by) expect(match.players[action.by].side).not.toBe(action.side);
        if (action.ev != null) expect(match.events[action.ev]).toBeTruthy();
      }
    }
    for (const kind of ['pass:short', 'pass:long', 'carry', 'shot', 'restart:throw-in', 'restart:goal-kick', 'restart:kickoff']) expect(kinds.has(kind)).toBe(true);
  });
  it('has the volume and texture of a real match', () => {
    let passes = 0; let accuracy = 0; let woodwork = 0; let throwIns = 0; let crosses = 0; const n = 80;
    for (let i = 0; i < n; i += 1) {
      const m = playToEnd(createMatch({ id: `v${i}`, seed: 'vol', date: '2025-09-01', comp: { id: 'x' }, home: team('H', 75), away: team('A', 75) }));
      for (const s of ['home', 'away']) { passes += m.stats[s].passes; accuracy += m.stats[s].passOk; woodwork += m.stats[s].woodwork; throwIns += m.stats[s].throwIns; crosses += m.stats[s].crosses; }
    }
    accuracy /= passes; passes /= n; woodwork /= n; throwIns /= n; crosses /= n;
    console.log('texture', { passes, accuracy, woodwork, throwIns, crosses });
    expect(passes).toBeGreaterThan(650); expect(passes).toBeLessThan(1250);
    expect(accuracy).toBeGreaterThan(0.75); expect(accuracy).toBeLessThan(0.9);
    expect(woodwork).toBeGreaterThan(0.1);
    expect(throwIns).toBeGreaterThan(20);
    expect(crosses).toBeGreaterThan(15);
  });
  it('lets keepers win matches: a great one concedes clearly less than a poor one', () => {
    const conceded = (gk) => {
      let goals = 0;
      for (let i = 0; i < 120; i += 1) {
        const away = team('A', 75);
        const keeperId = away.lineup[0];
        away.players[keeperId] = { ...away.players[keeperId], ovr: gk, attrs: Object.fromEntries(Object.keys(away.players[keeperId].attrs).map((k) => [k, gk])) };
        const m = playToEnd(createMatch({ id: `gk${i}`, seed: 'gk', date: '2025-09-01', comp: { id: 'x' }, neutral: true, home: team('H', 75), away }));
        goals += m.score.home;
      }
      return goals / 120;
    };
    expect(conceded(90)).toBeLessThan(conceded(60) * 0.85);
  });
  it('values shots by distance and angle', () => {
    expect(shotXg(89.5, 50, 'penalty')).toBeCloseTo(0.76);
    expect(shotXg(95, 50, 'open')).toBeGreaterThan(shotXg(85, 50, 'open'));
    expect(shotXg(85, 50, 'open')).toBeGreaterThan(shotXg(85, 22, 'open'));
    expect(shotXg(72, 50, 'long')).toBeLessThan(0.06);
    expect(shotXg(92, 50, 'header')).toBeLessThan(shotXg(92, 50, 'open'));
  });
});
