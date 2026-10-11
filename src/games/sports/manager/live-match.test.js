import { describe, expect, it, vi } from 'vitest';
vi.mock('./data.js', () => ({ getManagerWorld: () => { throw new Error('Use the supplied deterministic fixture'); } }));
import { createManagerCareer, managerReducer, serializeManagerCareer, restoreManagerCareer } from './engine.js';
import { advanceLiveMatch, createLiveMatch } from './live-match.js';

function career(year = 2012, seed = 'live-match') {
  const clubs = [0, 1].map((i) => ({ id: `c${i}`, name: `Club ${i}`, shortName: `C${i}`, competitionId: 'league', country: 'ESP', rating: 76, budget: 20000000 }));
  const players = clubs.flatMap((club) => Array.from({ length: 22 }, (_, i) => ({ id: `${club.id}-p${i}`, clubId: club.id,
    name: `Player ${club.id}-${i}`, nationality: 'ESP', birthYear: year - 25, age: 25,
    position: i < 2 ? 'GK' : i < 10 ? 'DF' : i < 17 ? 'MF' : 'FW', rating: 75 + i % 4, potential: 85, value: 200000, wage: 1000, real: false })));
  return createManagerCareer({ year, clubId: 'c0', seed, world: { year, clubs, players, competitions: [{ id: 'league', name: 'League', country_fifa_code: 'ESP', confederation: 'UEFA' }], countries: [], coverage: { snapshotDate: `${year}-09-01` } } });
}
const start = (initial = career()) => managerReducer(initial, { type: 'PLAY_MATCH', mode: 'deep' });
const advance = (state, minutes = 15) => managerReducer(state, { type: 'ADVANCE_MATCH', minutes });
const finish = (state) => managerReducer(state, { type: 'FINISH_MATCH' });
const own = (match, suffix) => match[`${match.ownSide}${suffix}`];
function sub(state) {
  const match = state.activeMatch;
  const inId = own(match, 'Bench').find((id) => match.players[id].position !== 'GK');
  const outId = own(match, 'Lineup').find((id) => match.players[id].position === match.players[inId].position)
    || own(match, 'Lineup').find((id) => match.players[id].position !== 'GK');
  return { state: managerReducer(state, { type: 'SUBSTITUTE_PLAYER', outId, inId }), outId, inId };
}

describe('directed incremental matches', () => {
  it('stores no future report and pauses at halftime independently of the size of each advance', () => {
    const initial = start();
    expect(initial.activeMatch.report).toBeUndefined();
    expect(initial.activeMatch.events).toHaveLength(1);
    expect(initial.activeMatch.stats.xgHome).toBe(0);
    let byMinute = initial, byQuarter = initial;
    for (let i = 0; i < 45; i += 1) byMinute = advance(byMinute, 1);
    for (let i = 0; i < 3; i += 1) byQuarter = advance(byQuarter);
    expect(byMinute.activeMatch).toEqual(byQuarter.activeMatch);
    expect(byQuarter.activeMatch.minute).toBe(45);
    expect(byQuarter.activeMatch.pausedFor).toBe('half-time');
    expect(byQuarter.activeMatch.events.every((event) => event.minute <= 45)).toBe(true);
    expect(advance(byQuarter, 1).activeMatch.minute).toBe(46);
  });
  it('quick play and detailed play without intervention have identical scores, events, minutes and finances', () => {
    const initial = career();
    const quick = managerReducer(initial, { type: 'PLAY_MATCH', mode: 'quick' });
    let deep = start(initial);
    while (deep.activeMatch) deep = advance(deep, 5);
    expect(deep).toEqual(quick);
  });
  it('tactical instructions change only future expectations and pressure consumes more condition', () => {
    const state = advance(advance(start()));
    const past = JSON.parse(JSON.stringify(state.activeMatch));
    const attacking = managerReducer(state, { type: 'SET_MATCH_TACTICS', formation: '4-3-3', mentality: 'attacking', pressing: 'high' });
    const defensive = managerReducer(state, { type: 'SET_MATCH_TACTICS', formation: '4-3-3', mentality: 'defensive', pressing: 'low' });
    expect(state.activeMatch).toEqual(past);
    expect(attacking.activeMatch.events.slice(0, past.events.length)).toEqual(past.events);
    expect(attacking.activeMatch.homeGoals).toBe(past.homeGoals); expect(attacking.activeMatch.awayGoals).toBe(past.awayGoals);
    const aggressive = advance(attacking).activeMatch, cautious = advance(defensive).activeMatch;
    const key = past.ownSide === 'home' ? 'xgHome' : 'xgAway';
    expect(aggressive.stats[key] - past.stats[key]).toBeGreaterThan(cautious.stats[key] - past.stats[key]);
    const player = own(past, 'Lineup').find((id) => past.players[id].position !== 'GK' && !aggressive.injuredIds.includes(id) && !cautious.injuredIds.includes(id));
    expect(aggressive.condition[player]).toBeLessThan(cautious.condition[player]);
    expect(managerReducer(state, { type: 'SET_MATCH_TACTICS', formation: '9-1-0' }).activeMatch).toBe(state.activeMatch);
  });
  it.each([[2012, 3], [2025, 5]])('enforces the %s substitution limit, goalkeeper preservation and no reentry', (year, limit) => {
    let state = start(career(year));
    const before = state.activeMatch;
    const keeper = own(before, 'Lineup').find((id) => before.players[id].position === 'GK');
    const outfield = own(before, 'Bench').find((id) => before.players[id].position !== 'GK');
    expect(managerReducer(state, { type: 'SUBSTITUTE_PLAYER', outId: keeper, inId: outfield }).lastError).toMatch(/portero/);
    const first = sub(state); state = first.state;
    expect(managerReducer(state, { type: 'SUBSTITUTE_PLAYER', outId: first.inId, inId: first.outId }).lastError).toMatch(/reingresar/);
    for (let i = 1; i < limit; i += 1) { state = sub(state).state; expect(state.lastError).toBeNull(); }
    expect(state.activeMatch.substitutionsUsed).toBe(limit);
    expect(sub(state).state.lastError).toMatch(/agotado/);
    expect(state.activeMatch.events.filter((event) => event.type === 'substitution')).toHaveLength(limit);
  });
  it('charges each player only his actual minutes and excludes a player replaced before kickoff from appearances', () => {
    const initialChange = sub(start());
    const ended = finish(initialChange.state);
    expect(ended.playerStats[initialChange.outId]).toBeUndefined();
    expect(ended.playerStats[initialChange.inId].minutes).toBe(ended.lastMatch.minutes[initialChange.inId]);
    let state = advance(advance(advance(start(career(2012, 'halftime-sub')))));
    const changed = sub(state); state = changed.state;
    expect(state.lastError).toBeNull();
    const after = finish(state);
    expect(after.lastMatch.minutes[changed.outId]).toBe(45);
    expect(after.lastMatch.events.some((event) => event.type === 'goal' && event.playerId === changed.outId && event.minute > 45)).toBe(false);
    expect(after.playerStats[changed.outId].minutes).toBe(45);
    expect(after.lastMatch.minutes[changed.inId]).toBeGreaterThan(0);
    expect(Object.values(after.lastMatch.minutes).reduce((sum, value) => sum + value, 0)).toBeLessThanOrEqual(22 * after.lastMatch.duration);
  });
  it('restores tactical changes and substitutions exactly, including a paused halftime', () => {
    let state = advance(advance(advance(start())));
    state = managerReducer(state, { type: 'SET_MATCH_TACTICS', formation: '3-5-2', mentality: 'attacking', pressing: 'high' });
    state = sub(state).state;
    const serialized = serializeManagerCareer(state);
    const saved = JSON.parse(serialized);
    expect(saved.activeMatch.report).toBeUndefined();
    expect(saved.activeMatch.modelVersion).toBe(3);
    expect(saved.activeMatch.actions).toHaveLength(2);
    const restored = restoreManagerCareer(serialized);
    expect(restored.activeMatch).toEqual(state.activeMatch);
    expect(restored.activeMatch.presentation).toEqual(state.activeMatch.presentation);
    expect(finish(restored)).toEqual(finish(state));
    const secondHalf = advance(state, 5);
    expect(restoreManagerCareer(serializeManagerCareer(secondHalf)).activeMatch).toEqual(secondHalf.activeMatch);
    expect(() => restoreManagerCareer({ ...saved, activeMatch: { ...saved.activeMatch, actions: [{ type: 'SUBSTITUTE_PLAYER', minute: 45, outId: 'missing', inId: 'missing' }] } })).toThrow();
    expect(() => restoreManagerCareer({ ...saved, activeMatch: { ...saved.activeMatch, actions: [{ ...saved.activeMatch.actions[0], minute: 46 }] } })).toThrow();
  });
  it.each([1, 2])('resumes a directed v%s match with its original model, actions and outcomes', (modelVersion) => {
    let state = start({ ...career(), tactics: { formation: '4-3-3', mentality: 'balanced' } });
    const initial = state.activeMatch;
    const teams = Object.fromEntries(['home', 'away'].map((side) => [side, {
      lineup: initial[`${side}Lineup`], bench: initial[`${side}Bench`],
      tactics: Object.fromEntries(['formation', 'mentality', 'pressing'].map((key) => [key, initial[`${side}Tactics`][key]])),
    }]));
    state = { ...state, activeMatch: createLiveMatch({ ...initial, teams, modelVersion }) };
    state = advance(advance(state));
    state = managerReducer(state, { type: 'SET_MATCH_TACTICS', mentality: 'attacking', pressing: 'high' });
    state = sub(state).state;
    const observed = state.activeMatch.events.slice();
    const restored = restoreManagerCareer(serializeManagerCareer(state));
    expect(restored.activeMatch.modelVersion).toBe(modelVersion);
    expect(restored.activeMatch.events).toEqual(observed);
    expect(restored.activeMatch).toEqual(state.activeMatch);
    expect(finish(restored)).toEqual(finish(state));
  });
  it('persists a full tactical plan and its later match instructions without changing the past', () => {
    const plan = { width: 'wide', passing: 'short', tempo: 'low', defensiveLine: 'high', transition: 'hold', ballLoss: 'counterpress', pressing: 'high' };
    let state = managerReducer(career(), { type: 'SET_TACTICS', ...plan });
    expect(state.lastError).toBeNull(); expect(state.tactics).toMatchObject(plan);
    const savedPlan = restoreManagerCareer(serializeManagerCareer(state));
    expect(savedPlan.tactics).toEqual(state.tactics);
    state = advance(start(savedPlan));
    expect(state.activeMatch.modelVersion).toBe(3);
    expect(state.activeMatch.tactics).toMatchObject(plan);
    const previousEvents = state.activeMatch.events.slice();
    const previousScene = state.activeMatch.presentation;
    state = managerReducer(state, { type: 'SET_MATCH_TACTICS', passing: 'direct', tempo: 'high', transition: 'counter', defensiveLine: 'low', ballLoss: 'regroup' });
    expect(state.activeMatch.events.slice(0, -1)).toEqual(previousEvents);
    expect(state.activeMatch.presentation).toEqual(previousScene);
    state = advance(state, 1);
    expect(own(state.activeMatch, 'Tactics').passing).toBe('direct');
    expect(state.activeMatch.presentation.tacticalContext[state.activeMatch.ownSide].passing).toBe('direct');
    const serialized = serializeManagerCareer(state), restored = restoreManagerCareer(serialized);
    expect(restored.activeMatch).toEqual(state.activeMatch);
    expect(finish(restored)).toEqual(finish(state));
    const corrupt = JSON.parse(serialized);
    corrupt.activeMatch.actions[0].passing = 'teleport';
    expect(() => restoreManagerCareer(corrupt)).toThrow(/instrucción/);
    expect(managerReducer(career(), { type: 'SET_TACTICS', ballLoss: 'teleport' }).lastError).toBeTruthy();
  });
  it('lets the coach control injury replacements and never gives an injured player more minutes', () => {
    let injuredState;
    for (let seed = 0; seed < 60 && !injuredState; seed += 1) {
      let state = managerReducer(start(career(2012, `manual-injury-${seed}`)), { type: 'SET_MATCH_AUTOSUBS', enabled: false });
      while (state.activeMatch && state.activeMatch.minute < 89) {
        state = advance(state, 5);
        if (state.activeMatch?.pausedFor === 'injury') { injuredState = state; break; }
      }
    }
    expect(injuredState).toBeTruthy();
    const match = injuredState.activeMatch;
    const injuredId = own(match, 'Lineup').find((id) => match.injuredIds.includes(id));
    expect(match.autoSubstitutions).toBe(false);
    expect(match.substitutionsUsed).toBe(0);
    expect(restoreManagerCareer(serializeManagerCareer(injuredState)).activeMatch).toEqual(match);
    const continued = advance(injuredState, 1);
    expect(continued.activeMatch.minutes[injuredId]).toBe(match.minutes[injuredId]);
    expect(restoreManagerCareer(serializeManagerCareer(continued)).activeMatch).toEqual(continued.activeMatch);
    const inId = own(match, 'Bench').find((id) => match.players[id].position === match.players[injuredId].position);
    expect(inId).toBeTruthy();
    const replaced = managerReducer(continued, { type: 'SUBSTITUTE_PLAYER', outId: injuredId, inId });
    expect(replaced.lastError).toBeNull();
    expect(own(replaced.activeMatch, 'Lineup')).not.toContain(injuredId);
    const result = finish(replaced);
    expect(result.playerStats[injuredId].minutes).toBe(match.minutes[injuredId]);
    const assisted = managerReducer(injuredState, { type: 'SET_MATCH_AUTOSUBS', enabled: true });
    expect(own(assisted.activeMatch, 'Lineup')).not.toContain(injuredId);
    expect(assisted.activeMatch.substitutionsUsed).toBe(1);
    expect(restoreManagerCareer(serializeManagerCareer(assisted)).activeMatch).toEqual(assisted.activeMatch);
  });
  it('introduces extra time only after a tied ninety minutes and honors ranking or penalty tie breaks', () => {
    const initial = start().activeMatch;
    const regulation = advanceLiveMatch(initial, 90, true);
    const fixture = { ...initial.fixture, knockout: true,
      aggregateHome: Math.max(0, regulation.awayGoals - regulation.homeGoals),
      aggregateAway: Math.max(0, regulation.homeGoals - regulation.awayGoals) };
    const atNinety = advanceLiveMatch({ ...initial, fixture }, 90, true);
    expect(atNinety.minute).toBe(90); expect(atNinety.duration).toBe(120);
    expect(atNinety.pausedFor).toBe('extra-time'); expect(atNinety.complete).toBe(false);
    const ended = advanceLiveMatch(atNinety, 30, true);
    expect(ended.minute).toBe(120); expect(ended.complete).toBe(true); expect(ended.winnerId).toBeTruthy();
    const ranked = advanceLiveMatch({ ...initial, fixture: { ...fixture, noExtraTime: true, tieBreak: 'higher-seed', tieWinnerId: fixture.awayId } }, 90, true);
    expect(ranked.complete).toBe(true); expect(ranked.minute).toBe(90); expect(ranked.winnerId).toBe(fixture.awayId); expect(ranked.penalties).toBeNull();
  });
  it('continues an old v2 active-match archive and preserves its observed prefix after new decisions and another save', () => {
    const initial = advance(advance(start()));
    const saved = JSON.parse(serializeManagerCareer(initial));
    delete saved.activeMatch.modelVersion; delete saved.activeMatch.actions;
    let restored = restoreManagerCareer(saved);
    expect(restored.activeMatch.minute).toBe(30);
    expect(restored.activeMatch.legacyMinute).toBe(30);
    const observed = restored.activeMatch.events.slice();
    restored = managerReducer(restored, { type: 'SET_MATCH_TACTICS', mentality: 'defensive', pressing: 'low' });
    expect(restored.activeMatch.events.slice(0, observed.length)).toEqual(observed);
    const again = restoreManagerCareer(serializeManagerCareer(restored));
    expect(again.activeMatch).toEqual(restored.activeMatch);
    expect(finish(again)).toEqual(finish(restored));
  });
});
