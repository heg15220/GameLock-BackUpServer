import { describe, expect, it } from 'vitest';
import { createManagerCareer, getSquad, getMarketPlayers, getNextFixture, getManagerSummary, managerReducer, restoreManagerCareer, serializeManagerCareer, simulateManagerMatch } from './engine.js';
import { effectiveRating, getPlayerHealth, injuryProbability, recoverHealth } from './health.js';
import { packSnapshot, unpackSnapshot } from './save-codec.js';
import { getManagerWorld as getLegacyWorld } from './legacy-v1/data.js';

function world() {
  const competitions = [1, 2].map((tier) => ({ id: `tier-${tier}`, name: `Division ${tier}`, country_fifa_code: 'ESP', tier, confederation: 'UEFA', strength: 5 - tier }));
  const clubs = Array.from({ length: 14 }, (_, i) => ({ id: `club-${i}`, name: `Club ${i}`, shortName: `C${i}`, competitionId: `tier-${i < 6 ? 1 : 2}`, country: 'ESP', rating: 75, budget: 5000000 }));
  const players = clubs.flatMap((club) => Array.from({ length: 22 }, (_, i) => ({
    id: `${club.id}-p${i}`, clubId: club.id, name: `Footballer ${club.id}-${i}`, birthYear: 1987, age: 25, nationality: 'ESP',
    position: i < 2 ? 'GK' : i < 10 ? 'DF' : i < 17 ? 'MF' : 'FW', rating: 74 + i % 4, potential: 83, value: 250000, wage: 800, real: false,
  })));
  return { year: 2012, competitions, clubs, players, countries: [{ fifa: 'ESP', confederation: 'UEFA' }], coverage: { note: 'Synthetic deterministic fixture', snapshotDate: '2012-08-17' } };
}
const career = (seed = 'health-test') => createManagerCareer({ world: world(), clubId: 'club-0', year: 2012, seed });
const play = (state) => managerReducer(state, { type: 'PLAY_MATCH', mode: 'quick' });
const damaged = (condition = 30, injury = null) => ({ condition, sharpness: 80, injury, minutesLast7Days: 180, lastMatchDate: '2012-08-16' });
function end(state) { for (let i = 0; state.phase !== 'complete' && i < 90; i += 1) state = play(state); expect(state.phase).toBe('complete'); return state; }

describe('physical preparation and calendar', () => {
  it('fatigue reduces team expectations and increases injury risk', () => {
    const fresh = career();
    const tired = { ...fresh, playerHealth: Object.fromEntries(getSquad(fresh).map((player) => [player.id, damaged(20)])) };
    // Compare present-day fatigue, before the scheduled interval can restore it.
    const fixture = { ...getNextFixture(fresh), date: fresh.date };
    const strong = simulateManagerMatch(fresh, fixture);
    const weak = simulateManagerMatch(tired, fixture);
    expect(fixture.homeId === fresh.clubId ? weak.xgHome < strong.xgHome : weak.xgAway < strong.xgAway).toBe(true);
    const player = getSquad(fresh)[0];
    expect(injuryProbability(player, damaged(20))).toBeGreaterThan(injuryProbability(player, getPlayerHealth(fresh, player)) * 4);
    expect(effectiveRating(player, damaged(20))).toBeLessThan(effectiveRating(player, getPlayerHealth(fresh, player)));
  });
  it('recovery trades sharpness for condition and clears an injury only when its days elapse', () => {
    const health = damaged(35, { name: 'Muscular', daysRemaining: 10 });
    const rest = recoverHealth(health, 3, 'recovery');
    const training = recoverHealth(health, 3, 'intensive');
    expect(rest.condition).toBeGreaterThan(training.condition);
    expect(rest.injury.daysRemaining).toBe(7);
    expect(recoverHealth(rest, 6).injury.daysRemaining).toBe(1);
    expect(recoverHealth(rest, 7).injury).toBeNull();
    const healthyRest = recoverHealth(damaged(), 3, 'recovery');
    const healthyTraining = recoverHealth(damaged(), 3, 'intensive');
    expect(healthyRest.sharpness).toBeLessThan(healthyTraining.sharpness);
  });
  it('does not count injured days as intensive training when a long rest crosses the return date', () => {
    const initial = damaged(35, { name: 'Muscular', daysRemaining: 4 });
    const together = recoverHealth(initial, 10, 'intensive');
    const separately = recoverHealth(recoverHealth(initial, 4, 'intensive'), 6, 'intensive');
    expect(together.injury).toBeNull();
    expect(together.condition).toBe(separately.condition);
    expect(together.sharpness).toBe(separately.sharpness);
    expect(together.sharpness).toBe(80.5);
  });
  it('training is a repeat-safe plan with consequences over preparation days', () => {
    let state = career();
    state = { ...state, playerHealth: Object.fromEntries(getSquad(state).map((player) => [player.id, damaged(20)])) };
    const rest = managerReducer(state, { type: 'SET_TRAINING', intensity: 'recovery' });
    expect(managerReducer(rest, { type: 'SET_TRAINING', intensity: 'recovery' }).playerHealth).toBe(rest.playerHealth);
    const hard = managerReducer(state, { type: 'SET_TRAINING', intensity: 'intensive' });
    expect(getManagerSummary({ ...rest, date: '2012-08-20' }).averageCondition).toBeGreaterThan(getManagerSummary({ ...hard, date: '2012-08-20' }).averageCondition);
    expect(Date.parse(getManagerSummary(state).nextMatchDate)).toBeGreaterThan(Date.parse(state.date));
    expect(play(state).date).toBe(getManagerSummary(state).nextMatchDate);
  });
  it('changing preparation cannot retrospectively recover or sharpen a rested substitute', () => {
    const initial = career();
    const id = initial.world.players.find((player) => player.clubId === initial.clubId && !initial.lineup.includes(player.id)).id;
    const state = { ...initial, date: '2012-08-22', playerHealth: { [id]: damaged(30) } };
    const before = getSquad(state).find((player) => player.id === id);
    let changed = managerReducer(state, { type: 'SET_TRAINING', intensity: 'intensive' });
    changed = managerReducer(changed, { type: 'SET_TRAINING', intensity: 'recovery' });
    const after = getSquad(changed).find((player) => player.id === id);
    expect(after.condition).toBe(before.condition);
    expect(after.sharpness).toBe(before.sharpness);
  });
  it('applies training to academy substitutes before their first appearance', () => {
    const initial = career();
    const id = initial.world.players.find((player) => player.clubId === initial.clubId && !initial.lineup.includes(player.id)).id;
    const training = managerReducer(initial, { type: 'SET_TRAINING', intensity: 'intensive' });
    const later = { ...training, date: '2012-08-24' };
    const substitute = getSquad(later).find((player) => player.id === id);
    expect(substitute.stats.appearances).toBe(0);
    expect(substitute.sharpness).toBeGreaterThan(80);
  });
  it('injured starters are replaced and simultaneous goalkeeper injuries cannot deadlock a season', () => {
    let state = career();
    const keepers = getSquad(state).filter((player) => player.position === 'GK');
    state = { ...state, playerHealth: Object.fromEntries(keepers.map((player) => [player.id, damaged(50, { name: 'Lesión', daysRemaining: 35 })])) };
    const auto = managerReducer(state, { type: 'AUTO_LINEUP' });
    expect(auto.lineup.every((id) => !keepers.some((player) => player.id === id))).toBe(true);
    const result = play(auto);
    expect(result.lastError).toBeNull();
    expect(result.round).toBe(1);
    const emergency = getSquad(result).find((player) => player.emergency);
    expect(emergency.position).toBe('GK'); expect(emergency.real).toBe(false);
    expect(result.lastMatch.homeLineup.concat(result.lastMatch.awayLineup)).toContain(emergency.id);
    expect(result.lastMatch.homeLineup.concat(result.lastMatch.awayLineup).some((id) => keepers.some((player) => player.id === id))).toBe(false);
    expect(result.world.clubs.find((club) => club.id === result.clubId).playerIds).toContain(emergency.id);
    expect(managerReducer({ ...result, phase: 'complete' }, { type: 'SELL_PLAYER', playerId: emergency.id }).lastError).toMatch(/emergencia/);
    const foreignView = { ...result, clubId: 'club-1', phase: 'complete' };
    expect(getMarketPlayers(foreignView).some((player) => player.id === emergency.id)).toBe(false);
    expect(managerReducer(foreignView, { type: 'NEGOTIATE', playerId: emergency.id, fee: 100000, wage: 1000 }).lastError).toBeTruthy();
  });
  it('injuries and substitutions record only on-pitch minutes and quick/deep health states match', () => {
    let state = career('find-injuries');
    state = { ...state, playerHealth: Object.fromEntries(state.world.players.map((player) => [player.id, damaged(10)])) };
    const quick = play(state);
    let deep = managerReducer(state, { type: 'PLAY_MATCH', mode: 'deep' });
    deep = managerReducer(deep, { type: 'FINISH_MATCH' });
    expect(deep).toEqual(quick);
    const match = quick.lastMatch;
    expect(Object.values(match.minutes).reduce((sum, value) => sum + value, 0)).toBeLessThanOrEqual(22 * match.duration);
    for (const event of match.events.filter((event) => event.type === 'substitution')) {
      const entered = match.events.find((entry) => entry.type === 'substitution' && entry.playerInId === event.playerOutId)?.minute || 0;
      const exit = match.events.find((entry) => (entry.type === 'substitution' && entry.playerOutId === event.playerInId) || (entry.type === 'injury' && entry.playerId === event.playerInId))?.minute ?? match.duration;
      expect(match.minutes[event.playerOutId]).toBe(event.minute - entered);
      expect(match.minutes[event.playerInId]).toBe(exit - event.minute);
      expect(quick.playerStats[event.playerInId].minutes).toBe(match.minutes[event.playerInId]);
      expect(match.events.slice(match.events.indexOf(event) + 1).some((goal) => goal.type === 'goal' && goal.playerId === event.playerOutId)).toBe(false);
    }
    expect(Object.values(quick.playerHealth).some((health) => health.injury)).toBe(true);
  });
  it('cup matchdays are three days apart and never book a club twice on the same day', () => {
    let state = career();
    while (state.phase !== 'tournaments') state = play(state);
    const date = state.date;
    const next = play(state);
    expect((Date.parse(next.date) - Date.parse(date)) / 86400000).toBe(3);
    const ids = next.lastResults.flatMap((match) => [match.fixture.homeId, match.fixture.awayId]);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('counts a goalkeeper clean sheet only during the minutes he actually played', () => {
    let example;
    for (let seed = 0; seed < 100 && !example; seed += 1) {
      let state = managerReducer(career(`keeper-minutes-${seed}`), { type: 'PLAY_MATCH', mode: 'deep' });
      for (const minutes of [15, 15, 15, 15, 10]) state = managerReducer(state, { type: 'ADVANCE_MATCH', minutes });
      const match = state.activeMatch;
      const otherSide = match.ownSide === 'home' ? 'away' : 'home';
      if (match[`${otherSide}Goals`] > 0) continue;
      const keeperId = match[`${match.ownSide}Lineup`].find((id) => match.players[id].position === 'GK');
      const replacementId = match[`${match.ownSide}Bench`].find((id) => match.players[id].position === 'GK');
      if (!keeperId || !replacementId || match.minutes[keeperId] !== 70) continue;
      state = managerReducer(state, { type: 'SUBSTITUTE_PLAYER', outId: keeperId, inId: replacementId });
      if (state.lastError) continue;
      const finished = managerReducer(state, { type: 'FINISH_MATCH' });
      if (finished.lastMatch[`${otherSide}Goals`] > 0) example = { finished, keeperId, replacementId };
    }
    expect(example).toBeTruthy();
    expect(example.finished.playerStats[example.keeperId].cleanSheets).toBe(1);
    expect(example.finished.playerStats[example.replacementId].cleanSheets).toBe(0);
    expect(example.finished.playerStats[example.keeperId].minutes).toBe(70);
  });
  it('includes every domestic club and distributes preliminary byes without discarding teams', () => {
    let state = career('all-domestic-clubs');
    while (state.phase !== 'tournaments') state = play(state);
    const originalCup = state.tournaments.find((tournament) => tournament.id === 'manager-domestic-cup');
    expect(new Set(originalCup.remaining)).toEqual(new Set(state.world.clubs.map((club) => club.id)));
    expect(originalCup.remaining).toHaveLength(14);
    const first = play(state);
    const after = first.tournaments.find((tournament) => tournament.id === originalCup.id);
    expect(after.remaining).toHaveLength(8); expect(after.results).toHaveLength(6);
    const finished = end(restoreManagerCareer(serializeManagerCareer(first)));
    const cup = finished.tournaments.find((tournament) => tournament.id === originalCup.id);
    expect(cup.results).toHaveLength(13);
    expect(new Set(cup.results.flatMap((result) => [result.fixture.homeId, result.fixture.awayId]))).toEqual(new Set(originalCup.remaining));
    // Old archives have no balancedByes marker and keep their original pairings.
    const legacyBracket = { ...state, tournaments: state.tournaments.map((tournament) => ({ ...tournament, balancedByes: undefined })) };
    const restored = restoreManagerCareer(serializeManagerCareer(legacyBracket));
    const oldAfter = play(restored).tournaments.find((tournament) => tournament.id === originalCup.id);
    expect(oldAfter.remaining).toHaveLength(7); expect(oldAfter.results).toHaveLength(7);
    expect(oldAfter.results[0].fixture.homeId).toBe(originalCup.remaining[0]);
    expect(oldAfter.results[0].fixture.awayId).toBe(originalCup.remaining[1]);
  });
  it('can save and complete a domestic cup larger than 64 participants', () => {
    const base = world();
    const competitions = Array.from({ length: 33 }, (_, i) => ({ ...base.competitions[0], id: `small-${i}`, tier: undefined }));
    const clubs = Array.from({ length: 66 }, (_, i) => ({ ...base.clubs[0], id: `large-${i}`, competitionId: `small-${Math.floor(i / 2)}` }));
    const players = clubs.flatMap((club) => base.players.slice(0, 22).map((player, i) => ({ ...player, id: `${club.id}-p${i}`, clubId: club.id })));
    let state = createManagerCareer({ year: 2012, clubId: clubs[0].id, world: { ...base, clubs, players, competitions } });
    state = play(play(state));
    expect(state.phase).toBe('tournaments');
    expect(state.tournaments.find((cup) => cup.id === 'manager-domestic-cup').remaining).toHaveLength(66);
    state = end(restoreManagerCareer(serializeManagerCareer(state)));
    expect(state.tournaments.find((cup) => cup.id === 'manager-domestic-cup').results).toHaveLength(65);
    expect(restoreManagerCareer(serializeManagerCareer(state)).tournaments).toEqual(state.tournaments);
  });
  it('recovers CPU players between extra rounds of a longer league instead of playing twice on one date', () => {
    const before = play(play(career('calendar-cpu')));
    const state = play(before);
    expect(state.leagues['tier-2'].round - before.leagues['tier-2'].round).toBe(2);
    const dates = state.leagues['tier-2'].rounds.slice(before.leagues['tier-2'].round, state.leagues['tier-2'].round).map((fixtures) => fixtures[0].date);
    expect(new Set(dates).size).toBe(2);
    const keeper = state.world.players.find((player) => player.clubId === 'club-6' && player.position === 'GK' && state.playerStats[player.id]?.appearances >= 2);
    expect(keeper).toBeTruthy();
    const health = getPlayerHealth(state, keeper);
    expect(health.minutesLast7Days).toBeLessThan(180);
    expect(health.condition).toBeGreaterThan(78);
    expect(health.lastUpdatedDate).toBe(state.date);
  });
  it('keeps every league calendar independent of the managed club and inside the same season window', () => {
    const top = career();
    const lower = createManagerCareer({ year: 2012, clubId: 'club-6', world: world() });
    for (const id of Object.keys(top.leagues)) {
      expect(top.leagues[id].rounds).toEqual(lower.leagues[id].rounds);
      const dates = top.leagues[id].rounds.map((fixtures) => fixtures[0].date);
      expect(new Set(dates).size).toBe(dates.length);
      expect((Date.parse(dates[dates.length - 1]) - Date.parse(top.seasonStartDate)) / 86400000).toBe(266);
    }
  });
});

describe('career continuity across promotions and data releases', () => {
  it('allows under-21 signings with an expanded historical squad and caps only senior registrations at 30', () => {
    const initial = career();
    const extra = Array.from({ length: 13 }, (_, i) => ({ ...initial.world.players[2], id: `extra-${i}`, birthYear: 1995, age: 17 }));
    const target = initial.world.players.find((player) => player.clubId === 'club-1');
    const state = { ...initial, world: { ...initial.world, players: [...initial.world.players.map((player) => player.id === target.id ? { ...player, birthYear: 1995, age: 17 } : player), ...extra] },
      finances: { ...initial.finances, wageBudget: 100000 } };
    expect(getSquad(state)).toHaveLength(35);
    const offer = managerReducer(state, { type: 'NEGOTIATE', playerId: target.id, fee: 300000, wage: 1000 });
    expect(offer.lastError).toBeNull();
    expect(getSquad(managerReducer(offer, { type: 'ACCEPT_TRANSFER' }))).toHaveLength(36);
    const seniors = { ...state, world: { ...state.world, players: state.world.players.map((player) => ({ ...player, birthYear: 1985, age: 27 })) } };
    expect(managerReducer(seniors, { type: 'NEGOTIATE', playerId: target.id, fee: 300000, wage: 1000 }).lastError).toMatch(/30 jugadores/);
  });
  it('persists complete promotion playoffs, new memberships and two consecutive seasons', () => {
    let state = career();
    while (state.phase === 'season') state = play(state);
    expect(state.phase).toBe('playoffs');
    state = restoreManagerCareer(serializeManagerCareer(play(state)));
    state = end(state);
    const movements = state.divisionPlan.movements;
    expect(movements.length).toBeGreaterThan(0);
    const next = managerReducer(state, { type: 'NEXT_SEASON' });
    for (const change of movements) expect(next.world.clubs.find((club) => club.id === change.clubId).competitionId).toBe(change.toId);
    const restored = restoreManagerCareer(serializeManagerCareer(next));
    expect(restored.world).toEqual(next.world);
    expect(restored.leagues).toEqual(next.leagues);
    expect(new Set(Object.values(restored.leagues).flatMap((league) => league.clubIds)).size).toBe(next.world.clubs.length);
    expect(end(restored).year).toBe(2013);
  });
  it('keeps self-contained world data even when no current baseline knows the club', () => {
    const initial = career();
    initial.world = { ...initial.world, coverage: { note: 'Archived factual snapshot' } };
    const restored = restoreManagerCareer(serializeManagerCareer(initial));
    expect(restored.world).toEqual(initial.world);
    expect(serializeManagerCareer(restored)).toBe(serializeManagerCareer(initial));
  });
  it('migrates a real v1 career using the original frozen 2012 dataset', () => {
    const original = createManagerCareer({ year: 2012, clubId: 'barcelona', world: getLegacyWorld(2012) });
    const { world: originalWorld, playerHealth, date, trainingIntensity, ...fields } = original;
    const legacy = { ...fields, version: 1, playerChanges: [], leagues: Object.fromEntries(Object.entries(original.leagues).map(([id, league]) => [id, { round: 0, table: league.table }])) };
    const raw = JSON.stringify(legacy);
    const restored = restoreManagerCareer(raw);
    expect(restored.version).toBe(2); expect(restored.year).toBe(2012);
    expect(restored.transfers).toEqual(legacy.transfers);
    expect(restored.history).toEqual(legacy.history);
    expect(Object.keys(restored.leagues).sort()).toEqual(Object.keys(legacy.leagues).sort());
    expect(restoreManagerCareer(serializeManagerCareer(restored)).world.players).toEqual(restored.world.players);
  });
  it('refuses missing, incomplete or invalid promotion plans before they can deadlock the career', () => {
    let state = career();
    while (state.phase === 'season') state = play(state);
    const saved = JSON.parse(serializeManagerCareer(state));
    expect(() => restoreManagerCareer({ ...saved, divisionPlan: null })).toThrow();
    expect(() => restoreManagerCareer({ ...saved, phase: 'complete' })).toThrow();
    expect(() => restoreManagerCareer({ ...saved, divisionPlan: { ...saved.divisionPlan, movements: [{ clubId: 'unknown', fromId: 'tier-1', toId: 'tier-2' }] } })).toThrow();
  });
  it('rejects corrupt health and self-contained snapshot payloads', () => {
    const state = career();
    const saved = JSON.parse(serializeManagerCareer(state));
    expect(() => restoreManagerCareer({ ...saved, packedWorld: 'broken' })).toThrow();
    expect(() => restoreManagerCareer({ ...saved, packedHealth: packSnapshot({ [state.lineup[0]]: damaged(-1) }) })).toThrow();
    const data = { sentence: 'Fútbol: ⚽, 日本語, Çà', entries: Array.from({ length: 10000 }, (_, i) => [i, `club-${i % 100}`, 'repeated football name']) };
    expect(unpackSnapshot(packSnapshot(data))).toEqual(data);
  });
});
