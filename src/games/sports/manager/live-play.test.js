import { beforeAll, describe, expect, it } from 'vitest';
import { advanceLiveMatch, changeLiveTactics, createLiveMatch, importLegacyMatchPrefix, liveMatchReport } from './live-match.js';

function fixture(seed = 'plays', modelVersion = 2) {
  const players = Object.fromEntries(['home', 'away'].flatMap((side) => Array.from({ length: 22 }, (_, i) => {
    const id = `${side}-${i}`;
    return [id, { id, name: `${side} ${i}`, position: i < 2 ? 'GK' : i < 10 ? 'DF' : i < 17 ? 'MF' : 'FW',
      rating: 75 + i % 4, age: 25, birthYear: 1987,
      health: { condition: 100, sharpness: 80, injury: null, minutesLast7Days: 0 } }];
  })));
  const teams = Object.fromEntries(['home', 'away'].map((side) => [side, {
    lineup: [0, 2, 3, 4, 5, 10, 11, 12, 17, 18, 19].map((i) => `${side}-${i}`),
    bench: [1, 6, 7, 8, 13, 14, 20].map((i) => `${side}-${i}`), tactics: { formation: '4-3-3', mentality: 'balanced' },
  }]));
  return createLiveMatch({ fixture: { id: 'fixed-fixture', homeId: 'home', awayId: 'away', date: '2012-09-01' },
    seed, year: 2012, ownSide: 'home', morale: 70, teams, players, modelVersion });
}

describe('observable resolved football plays', () => {
  const runs = [];
  beforeAll(() => {
    for (let seed = 0; seed < 32; seed += 1) {
      let match = fixture(`plays-${seed}`);
      const presentations = [];
      while (!match.complete) {
        match = advanceLiveMatch(match, 1);
        presentations.push(match.presentation);
      }
      runs.push({ match, presentations });
    }
  });

  it('uses only players present at each play and relates every shot to exactly one result event', () => {
    for (const { match, presentations } of runs) {
      for (const play of presentations) {
        const observed = match.events.filter((event) => event.minute <= play.minute);
        expect(play.scoreAfter.home).toBe(observed.filter((event) => event.type === 'goal' && event.side === 'home').length);
        expect(play.scoreAfter.away).toBe(observed.filter((event) => event.type === 'goal' && event.side === 'away').length);
        for (const seq of play.sequences) {
          const own = play.onPitch[seq.side], opponent = play.onPitch[seq.side === 'home' ? 'away' : 'home'];
          expect(seq.minute).toBe(play.minute);
          expect(own).toContain(seq.actorId);
          for (const key of ['receiverId', 'assistId']) if (seq[key]) expect(own).toContain(seq[key]);
          for (const key of ['keeperId', 'defenderId']) if (seq[key]) expect(opponent).toContain(seq[key]);
          if (seq.resultCarrierId) expect(play.onPitch[seq.resultSide]).toContain(seq.resultCarrierId);
          if (seq.eventId) {
            const event = observed.find((entry) => entry.id === seq.eventId);
            expect(event).toBeTruthy(); expect(event.minute).toBe(play.minute);
            if (seq.kind === 'shot') {
              expect(event.type).toBe(seq.outcome === 'goal' ? 'goal' : 'chance');
              expect(event.playerId).toBe(seq.actorId); expect(event.outcome).toBe(seq.outcome);
            }
          }
        }
      }
      const sequences = presentations.flatMap((play) => play.sequences);
      for (const side of ['home', 'away']) {
        const cap = side === 'home' ? 'Home' : 'Away';
        const shots = sequences.filter((seq) => seq.kind === 'shot' && seq.side === side);
        expect(match.stats[`shots${cap}`]).toBe(shots.length);
        expect(match[`${side}Goals`]).toBe(shots.filter((seq) => seq.outcome === 'goal').length);
        expect(match.stats[`shotsOnTarget${cap}`]).toBe(shots.filter((seq) => ['goal', 'saved'].includes(seq.outcome)).length);
        for (const [kind, key] of [['corner', 'corners'], ['penalty', 'penalties'], ['recovery', 'recoveries'], ['counter', 'counters']]) {
          expect(match.stats[`${key}${cap}`]).toBe(sequences.filter((seq) => seq.kind === kind && seq.side === side).length);
        }
      }
    }
  });

  it('creates genuine set pieces with dangerous or distant free kicks and a defending recovery after a cleared corner', () => {
    const sequences = runs.flatMap(({ presentations }) => presentations.flatMap((play) => play.sequences));
    expect(new Set(sequences.map((seq) => seq.kind))).toEqual(new Set(['buildup', 'recovery', 'counter', 'corner', 'free-kick', 'penalty', 'shot', 'goal']));
    expect(sequences.some((seq) => seq.kind === 'free-kick' && seq.dangerous && seq.zone === 'attacking-third')).toBe(true);
    expect(sequences.some((seq) => seq.kind === 'free-kick' && !seq.dangerous && seq.zone === 'midfield')).toBe(true);
    let clearances = 0, penalties = 0;
    for (const { match, presentations } of runs) for (const play of presentations) {
      play.sequences.forEach((seq, i) => {
        if (seq.kind === 'corner') {
          const next = play.sequences[i + 1];
          expect(['shot', 'recovery']).toContain(next.kind);
          if (next.kind === 'recovery') {
            clearances += 1;
            expect(next.side).not.toBe(seq.side); expect(next.source).toBe('corner');
            expect(next.defenderId).toBe(seq.receiverId);
          }
        }
        if (seq.kind === 'penalty') {
          penalties += 1;
          const shot = play.sequences[i + 1];
          expect(shot.kind).toBe('shot'); expect(shot.actorId).toBe(seq.actorId); expect(shot.source).toBe('penalty');
          expect(shot.assistId).toBeNull();
          expect(match.events.some((event) => event.minute === seq.minute && event.type === 'foul' && event.penalty)).toBe(true);
        }
        if (seq.kind === 'counter') expect(play.sequences[i + 1].actorId).toBe(seq.receiverId);
      });
    }
    expect(clearances).toBeGreaterThan(0); expect(penalties).toBeGreaterThan(0);
  });

  it('keeps a plausible aggregate range for balanced teams without manufacturing extra goals', () => {
    const mean = (read) => runs.reduce((sum, run) => sum + read(run.match), 0) / runs.length;
    expect(mean((match) => match.homeGoals + match.awayGoals)).toBeGreaterThan(1.5);
    expect(mean((match) => match.homeGoals + match.awayGoals)).toBeLessThan(4.5);
    expect(mean((match) => match.stats.shotsHome + match.stats.shotsAway)).toBeGreaterThan(14);
    expect(mean((match) => match.stats.shotsHome + match.stats.shotsAway)).toBeLessThan(38);
    expect(mean((match) => match.stats.cornersHome + match.stats.cornersAway)).toBeGreaterThan(5);
    expect(mean((match) => match.stats.cornersHome + match.stats.cornersAway)).toBeLessThan(18);
    expect(mean((match) => match.stats.foulsHome + match.stats.foulsAway)).toBeGreaterThan(12);
    expect(mean((match) => match.stats.foulsHome + match.stats.foulsAway)).toBeLessThan(32);
  });

  it('does not expose future plays, mutate old scenes or vary results with advance size', () => {
    const initial = fixture('plays-0');
    expect(initial.presentation.sequences).toEqual([]);
    const minute = advanceLiveMatch(initial, 1);
    const snapshot = JSON.parse(JSON.stringify(minute));
    const directed = changeLiveTactics(minute, { mentality: 'attacking', pressing: 'high' });
    advanceLiveMatch(directed, 30, true);
    expect(minute).toEqual(snapshot);
    expect(minute.events.every((event) => event.minute <= minute.minute)).toBe(true);
    expect(minute.presentation.minute).toBe(minute.minute);
    expect(advanceLiveMatch(initial, 120, true)).toEqual(runs[0].match);
    expect(liveMatchReport(runs[0].match).presentation).toEqual(runs[0].presentations.at(-1));
  });

  it('preserves the last-minute goal scene when the final whistle ends the match', () => {
    const scored = runs.find(({ match }) => match.events.some((event) => event.minute === 90 && event.type === 'goal'));
    expect(scored).toBeTruthy();
    const report = liveMatchReport(scored.match);
    expect(report.events.at(-1).type).toBe('full-time');
    expect(report.presentation.minute).toBe(90);
    expect(report.presentation.sequences.some((seq) => seq.kind === 'goal')).toBe(true);
    expect(report.presentation.scoreAfter).toEqual({ home: report.homeGoals, away: report.awayGoals });
    expect(report.homeFinalLineup).toEqual(scored.match.homeLineup);
  });

  it('keeps the historical v1 golden result exactly while adding an independently derived scene', () => {
    const match = advanceLiveMatch(fixture('compat-v1', 1), 120, true);
    expect([match.homeGoals, match.awayGoals]).toEqual([3, 0]);
    expect(match.stats).toEqual({ shotsHome: 13, shotsAway: 5, xgHome: 1.5075734966372787, xgAway: 1.1294262938844295, possessionHome: 50 });
    expect(match.events.map((event) => [event.minute, event.type, event.side || null, event.playerId || event.playerOutId || null, event.playerInId || null])).toEqual([
      [0, 'kickoff', null, null, null], [9, 'goal', 'home', 'home-19', null], [11, 'goal', 'home', 'home-3', null],
      [12, 'chance', 'home', null, null], [15, 'goal', 'home', 'home-12', null], [16, 'chance', 'home', null, null],
      [28, 'chance', 'home', null, null], [31, 'chance', 'home', null, null], [31, 'chance', 'away', null, null],
      [37, 'chance', 'home', null, null], [45, 'half-time', null, null, null], [51, 'chance', 'home', null, null],
      [58, 'chance', 'home', null, null], [64, 'substitution', 'home', 'home-4', 'home-6'], [64, 'substitution', 'away', 'away-4', 'away-6'],
      [65, 'chance', 'home', null, null], [66, 'chance', 'away', null, null], [67, 'chance', 'away', null, null],
      [69, 'chance', 'home', null, null], [70, 'chance', 'home', null, null], [76, 'substitution', 'home', 'home-12', 'home-13'],
      [76, 'substitution', 'away', 'away-12', 'away-13'], [85, 'chance', 'away', null, null], [90, 'chance', 'away', null, null],
      [90, 'full-time', null, null, null],
    ]);
    expect(match.minutes['home-4']).toBe(64); expect(match.minutes['home-6']).toBe(26);
    expect(match.presentation.legacy).toBe(true);
    expect(match.presentation.sequences.find((seq) => seq.kind === 'shot').illustrative).toBe(true);
    const goal = advanceLiveMatch(fixture('compat-v1', 1), 9, true);
    expect(goal.presentation.sequences.find((seq) => seq.kind === 'goal')).toMatchObject({ actorId: 'home-19', illustrative: false });
  });

  it('reconstructs the actual replacement in an aggregate archive with an injury before a substitution', () => {
    const initial = fixture('archive', 1);
    const report = { homeLineup: initial.homeLineup, awayLineup: initial.awayLineup, duration: 90, xgHome: 1.2, xgAway: 1, possessionHome: 52,
      events: [{ minute: 5, side: 'home', type: 'injury', playerId: 'home-4', injury: { name: 'Lesión', daysRemaining: 7 } },
        { minute: 5, side: 'home', type: 'substitution', playerOutId: 'home-4', playerInId: 'home-6' },
        { minute: 10, side: 'home', type: 'goal', playerId: 'home-6', assistId: 'home-10' }] };
    const imported = importLegacyMatchPrefix(initial, report, 10);
    expect(imported.presentation.onPitch.home).toContain('home-6');
    expect(imported.presentation.onPitch.home).not.toContain('home-4');
    expect(imported.presentation.onPitch.home).toHaveLength(11);
    expect(imported.presentation.sequences.find((seq) => seq.kind === 'goal').actorId).toBe('home-6');
  });
});
