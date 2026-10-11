import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { advanceLiveMatch, changeLiveTactics, createLiveMatch, setLiveAutoSubstitutions } from './live-match.js';
import { TACTICAL_DEFAULTS, normalizeTacticalInstructions, validateTacticalInstructions } from './tactical-model.js';

function fixture(seed = 'tactical', { modelVersion = 3, home = {}, away = {}, condition = 100, rating = 75 } = {}) {
  const players = Object.fromEntries(['home', 'away'].flatMap((side) => Array.from({ length: 22 }, (_, i) => {
    const id = `${side}-${i}`;
    return [id, { id, name: `${side} ${i}`, position: i < 2 ? 'GK' : i < 10 ? 'DF' : i < 17 ? 'MF' : 'FW',
      rating: rating + i % 4, age: 25, birthYear: 1987,
      health: { condition, sharpness: 80, injury: null, minutesLast7Days: 0 } }];
  })));
  const teams = Object.fromEntries(['home', 'away'].map((side) => [side, {
    lineup: [0, 2, 3, 4, 5, 10, 11, 12, 17, 18, 19].map((i) => `${side}-${i}`),
    bench: [1, 6, 7, 8, 13, 14, 20].map((i) => `${side}-${i}`),
    tactics: { formation: '4-3-3', mentality: 'balanced', ...(side === 'home' ? home : away) },
  }]));
  return createLiveMatch({ fixture: { id: 'fixed-fixture', homeId: 'home', awayId: 'away', date: '2012-09-01' },
    seed, year: 2012, ownSide: 'home', morale: 70, teams, players, modelVersion });
}

function ensemble(options, count = 24) {
  const rows = [];
  for (let seed = 0; seed < count; seed += 1) {
    let match = setLiveAutoSubstitutions(fixture(`tactical-${seed}`, options), false);
    const sequences = [];
    while (!match.complete) {
      match = advanceLiveMatch(match, 1);
      for (const seq of match.presentation.sequences) sequences.push({ ...seq, onPitch: match.presentation.onPitch });
    }
    rows.push({ match, sequences });
  }
  return rows;
}
const all = (rows) => rows.flatMap((row) => row.sequences);
const ownRoutes = (rows) => all(rows).filter((seq) => seq.side === 'home' && seq.passRoute?.length > 1);
const mean = (rows, value) => rows.reduce((sum, row) => sum + value(row), 0) / rows.length;

describe('versioned tactical choices', () => {
  it('preserves the complete v2 pre-edit golden including every event, physical state and presentation', () => {
    const match = advanceLiveMatch(fixture('compat-v2', { modelVersion: 2 }), 120, true);
    expect(createHash('sha256').update(JSON.stringify(match)).digest('hex')).toBe('4149cd03f36986ec697c6db252ad6db26df251181d57ac2763a7aff564194810');
    expect([match.homeGoals, match.awayGoals]).toEqual([0, 2]);
    expect(() => changeLiveTactics(match, { passing: 'short' })).toThrow(/modelo anterior/);
  });

  it('defaults missing instructions, rejects invalid values and records only changed instruction keys', () => {
    expect(normalizeTacticalInstructions()).toEqual(TACTICAL_DEFAULTS);
    expect(validateTacticalInstructions({ passing: 'teleport' })).toBe(false);
    const original = advanceLiveMatch(fixture(), 15);
    const snapshot = JSON.parse(JSON.stringify(original));
    const directed = changeLiveTactics(original, { passing: 'short', width: 'wide' });
    expect(directed.events.at(-1).changedKeys).toEqual(['width', 'passing']);
    expect(directed.events.slice(0, -1)).toEqual(original.events);
    expect(directed.presentation).toEqual(original.presentation);
    const future = advanceLiveMatch(directed, 5);
    expect(future.presentation.tacticalContext.home.passing).toBe('short');
    expect(future.presentation.tacticalContext.home.width).toBe('wide');
    expect(original).toEqual(snapshot);
    expect(() => changeLiveTactics(original, { ballLoss: 'always-win' })).toThrow(/instrucción/);
  });

  it('uses longer support routes for short passing and wider lanes when instructed', () => {
    const short = ensemble({ home: { passing: 'short', width: 'narrow', tempo: 'low', transition: 'hold' } });
    const direct = ensemble({ home: { passing: 'direct', width: 'wide', tempo: 'high', transition: 'counter' } });
    const shortRoutes = ownRoutes(short), directRoutes = ownRoutes(direct);
    expect(mean(shortRoutes, (seq) => seq.passRoute.length)).toBeGreaterThan(mean(directRoutes, (seq) => seq.passRoute.length) + 0.4);
    expect(mean(shortRoutes, (seq) => Number(seq.lane === 'center'))).toBeGreaterThan(mean(directRoutes, (seq) => Number(seq.lane === 'center')) + 0.35);
    for (const seq of [...all(short), ...all(direct)]) {
      expect(seq.onPitch[seq.side]).toContain(seq.actorId);
      expect(seq.tacticalContext.home.passing).toBeTruthy();
      if (seq.passRoute) {
        expect(seq.passRoute[0]).toBe(seq.actorId);
        expect(seq.passRoute.at(-1)).toBe(seq.receiverId);
        for (const id of seq.passRoute) expect(seq.onPitch[seq.side]).toContain(id);
        expect(seq.passRoute.every((id, i) => !i || id !== seq.passRoute[i - 1])).toBe(true);
      }
      if (seq.interceptedById) {
        expect(seq.onPitch[seq.side === 'home' ? 'away' : 'home']).toContain(seq.interceptedById);
        expect(seq.interceptedPassIndex).toBe(seq.passRoute.length - 2);
      }
      if (seq.kind === 'recovery') {
        const instruction = seq.tacticalContext[seq.side].transition;
        expect(seq.tacticalContext.intent).toBe(instruction === 'counter' ? 'counter' : instruction === 'hold' ? 'circulate' : 'support');
      }
    }
  });

  it('offers more immediate counterattacks after recovery when instructed instead of holding the ball', () => {
    const holding = ensemble({ home: { transition: 'hold' } });
    const countering = ensemble({ home: { transition: 'counter' } });
    expect(mean(countering, ({ match }) => match.stats.countersHome)).toBeGreaterThan(mean(holding, ({ match }) => match.stats.countersHome) * 3);
    expect(all(countering).some((seq) => seq.interception)).toBe(true);
  });

  it('trades recovery pressure for exposed space behind a high line rather than improving all defensive outcomes', () => {
    const low = ensemble({ home: { passing: 'direct', transition: 'counter' }, away: { defensiveLine: 'low' } });
    const high = ensemble({ home: { passing: 'direct', transition: 'counter' }, away: { defensiveLine: 'high' } });
    const homeSequences = (rows) => all(rows).filter((seq) => seq.side === 'home');
    expect(mean(homeSequences(high), (seq) => seq.tacticalContext.pressure)).toBeGreaterThan(mean(homeSequences(low), (seq) => seq.tacticalContext.pressure));
    expect(mean(homeSequences(high), (seq) => seq.tacticalContext.space)).toBeGreaterThan(mean(homeSequences(low), (seq) => seq.tacticalContext.space));
    const openShots = (rows) => homeSequences(rows).filter((seq) => seq.kind === 'shot' && ['open-play', 'counter'].includes(seq.source));
    expect(mean(openShots(high), (seq) => seq.expectedGoals)).toBeGreaterThan(mean(openShots(low), (seq) => seq.expectedGoals) + 0.025);
  });

  it('charges tempo and counterpress effort while a tired team executes pressure less effectively', () => {
    const slow = ensemble({ home: { tempo: 'low', ballLoss: 'regroup' } });
    const intense = ensemble({ home: { tempo: 'high', ballLoss: 'counterpress' } });
    const costPerMinute = ({ match }) => {
      const ids = Object.keys(match.minutes).filter((id) => id.startsWith('home-') && match.players[id].position !== 'GK');
      return ids.reduce((sum, id) => sum + 100 - match.condition[id], 0) / ids.reduce((sum, id) => sum + match.minutes[id], 0);
    };
    expect(mean(intense, costPerMinute)).toBeGreaterThan(mean(slow, costPerMinute) * 1.1);
    const fit = advanceLiveMatch(fixture('condition', { away: { pressing: 'high', ballLoss: 'counterpress' } }), 1);
    const tired = advanceLiveMatch(fixture('condition', { away: { pressing: 'high', ballLoss: 'counterpress' }, condition: 45 }), 1);
    // Identical initial seed and side: readiness affects the pressure on the ball.
    expect(fit.presentation.possessionSide).toBe(tired.presentation.possessionSide);
    expect(tired.presentation.tacticalContext.pressure).toBeLessThan(fit.presentation.tacticalContext.pressure);
  });

  it('remains deterministic across stepping sizes and preserves every past tactical scene', () => {
    const initial = fixture('steps', { home: { width: 'wide', passing: 'short', ballLoss: 'counterpress' } });
    let stepped = initial;
    while (!stepped.complete) stepped = advanceLiveMatch(stepped, 1);
    expect(advanceLiveMatch(initial, 120, true)).toEqual(stepped);
    expect(initial.presentation.sequences).toEqual([]);
    expect(stepped.events.every((event) => event.minute <= stepped.minute)).toBe(true);
  });
});
