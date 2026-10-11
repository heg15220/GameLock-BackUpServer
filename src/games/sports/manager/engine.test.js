import { describe, expect, it, vi } from 'vitest';

vi.mock('./data.js', async () => {
  const actual = await vi.importActual('./data.js');
  return {
  getManagerWorld: (year) => {
    if (year === 2025) return actual.getManagerWorld(year);
    const competitions = [
      { id: 'league-a', name: 'Liga A', country_fifa_code: 'ESP', confederation: 'UEFA', strength: 5, cupTrophy: '/cup.png' },
      { id: 'league-b', name: 'Liga B', country_fifa_code: 'ENG', confederation: 'UEFA', strength: 4 },
    ];
    const clubs = Array.from({ length: 10 }, (_, i) => ({
      id: `club-${i}`, name: `Club ${i}`, shortName: `C${i}`, competitionId: i < 4 ? 'league-a' : 'league-b',
      country: i < 4 ? 'ESP' : 'ENG', rating: 76 - i, budget: 40000000,
    }));
    const players = clubs.flatMap((club, team) => Array.from({ length: 22 }, (_, i) => ({
      id: `${club.id}-p${i}`, name: `Player ${team}-${i}`, clubId: club.id,
      birthYear: year - (i === 21 ? 18 : i === 20 ? 39 : 22 + i % 10),
      age: i === 21 ? 18 : i === 20 ? 39 : 22 + i % 10,
      nationality: ['ESP', 'ENG', 'GER', 'FRA'][team % 4],
      position: i < 2 ? 'GK' : i < 10 ? 'DF' : i < 17 ? 'MF' : 'FW',
      rating: club.rating - i % 8, potential: 90, value: 1000000 + i * 20000, wage: 1000 + i * 20,
      real: i !== 21, source: 'Test fixture',
    })));
    return { year, clubs, competitions, players, countries: ['ESP', 'ENG', 'GER', 'FRA'].map((fifa) => ({ fifa, confederation: 'UEFA' })), coverage: { note: 'Test world', snapshotDate: year === 2013 ? '2013-09-03' : `${year}-09-01`, archiveRevision: 'current-test' } };
  },
  };
});

import {
  createManagerCareer, createRoundRobin, getManagerSummary, getMarketPlayers, getNextFixture,
  getSquad, getStandings, managerReducer, restoreManagerCareer, serializeManagerCareer, simulateManagerMatch,
  getCareerRefreshEligibility, refreshInitialManagerCareer,
} from './engine.js';
import { packSnapshot, unpackSnapshot } from './save-codec.js';
import { getPlayerHealth } from './health.js';

const career = (seed = 'test-seed') => createManagerCareer({ year: 2012, clubId: 'club-0', seed });
const play = (state) => managerReducer(state, { type: 'PLAY_MATCH', mode: 'quick' });
function seasonEnd(state = career()) {
  let steps = 0;
  while (state.phase !== 'complete' && steps++ < 70) state = play(state);
  expect(state.phase).toBe('complete');
  return state;
}
function freezeDeep(object) {
  Object.freeze(object);
  Object.values(object).forEach((value) => { if (value && typeof value === 'object' && !Object.isFrozen(value)) freezeDeep(value); });
  return object;
}

describe('manager calendar and deterministic match model', () => {
  it.each([4, 5, 16, 20])('schedules each ordered pair once in a %i-club league with no simultaneous appearances', (count) => {
    const ids = Array.from({ length: count }, (_, i) => String(i));
    const rounds = createRoundRobin(ids);
    expect(rounds).toHaveLength((count + count % 2 - 1) * 2);
    const pairs = rounds.flat().map((match) => `${match.homeId}:${match.awayId}`);
    expect(new Set(pairs).size).toBe(count * (count - 1));
    for (const round of rounds) {
      const playing = round.flatMap((match) => [match.homeId, match.awayId]);
      expect(new Set(playing).size).toBe(playing.length);
    }
  });

  it('quick and deep modes commit exactly the same day; commentary does not leak future goals', () => {
    const initial = freezeDeep(career());
    const quick = play(initial);
    let deep = managerReducer(initial, { type: 'PLAY_MATCH', mode: 'deep' });
    expect(deep.round).toBe(0);
    expect(deep.activeMatch.homeGoals).toBe(0);
    expect(deep.playerStats).toEqual({});
    while (deep.activeMatch) {
      expect(deep.activeMatch.events.every((event) => event.minute <= deep.activeMatch.minute)).toBe(true);
      deep = managerReducer(deep, { type: 'ADVANCE_MATCH' });
    }
    expect(deep).toEqual(quick);
    expect(initial.round).toBe(0);
    expect(initial.playerStats).toEqual({});
    expect(getStandings(initial).every((row) => row.played === 0)).toBe(true);
  });

  it('a materially stronger team wins more over an ensemble, without being guaranteed victory', () => {
    const state = career();
    const fixture = { id: 'strong-v-weak', homeId: 'club-0', awayId: 'club-1', competitionId: 'league-a' };
    state.world = { ...state.world, players: state.world.players.map((player) => ({
      ...player, rating: player.clubId === 'club-0' ? 91 : player.clubId === 'club-1' ? 50 : player.rating,
    })) };
    let wins = 0;
    let nonWins = 0;
    for (let i = 0; i < 200; i += 1) {
      const match = simulateManagerMatch({ ...state, seed: String(i) }, fixture);
      if (match.homeGoals > match.awayGoals) wins += 1; else nonWins += 1;
    }
    expect(wins).toBeGreaterThan(150);
    expect(nonWins).toBeGreaterThan(0);
  });

  it('rejects invalid lineups and changes match expectations when tactics change', () => {
    const state = career();
    const incomplete = managerReducer(state, { type: 'TOGGLE_STARTER', playerId: state.lineup[0] });
    expect(play(incomplete).lastError).toMatch(/once jugadores/);
    expect(play(incomplete).round).toBe(0);
    const fixture = getNextFixture(state);
    const aggressive = managerReducer(state, { type: 'SET_TACTICS', formation: '3-5-2', mentality: 'attacking' });
    expect(aggressive.lineup).toHaveLength(11);
    expect(simulateManagerMatch(aggressive, fixture).xgHome).not.toBe(simulateManagerMatch(state, fixture).xgHome);
  });
});

describe('manager season, accounting and historical continuity', () => {
  it('completes every league, all elimination brackets and awards from accumulated statistics', () => {
    const state = seasonEnd();
    for (const league of Object.values(state.leagues)) {
      const expectedGames = (league.clubIds.length - 1) * 2;
      expect(league.round).toBe(league.rounds.length);
      expect(league.table.every((row) => row.played === expectedGames)).toBe(true);
      expect(league.table.reduce((sum, row) => sum + row.gf, 0)).toBe(league.table.reduce((sum, row) => sum + row.ga, 0));
      expect(league.table.every((row) => row.points === row.won * 3 + row.drawn)).toBe(true);
    }
    for (const tournament of state.tournaments) {
      expect(tournament.remaining).toHaveLength(1);
      expect(tournament.winnerId).toBe(tournament.remaining[0]);
      expect(tournament.results).toHaveLength(new Set(tournament.results.flatMap((result) => [result.fixture.homeId, result.fixture.awayId])).size - 1);
      expect(tournament.results.every((result) => result.winnerId)).toBe(true);
    }
    expect(state.awards).toHaveLength(3);
    const boot = state.awards.find((award) => award.id === 'golden-boot');
    expect(boot.value).toBe(Math.max(...Object.values(state.playerStats).map((stats) => stats.leagueGoals)));
    const glove = state.awards.find((award) => award.id === 'golden-glove');
    expect(state.world.players.find((player) => player.id === glove.playerId).position).toBe('GK');
    expect(state.history).toHaveLength(1);
    expect(state.finances.budget).toBe(40000000 + state.finances.income - state.finances.spent);
    expect(state.finances.wagesPaid).toBeGreaterThan(0);
    expect(state.finances.operatingReserve + state.finances.wagesPaid).toBe(career().finances.operatingReserve);
    expect(play(state).phase).toBe('complete');
  });

  it('preserves transfers through the next season, ages players and introduces explicitly fictional academy replacements', () => {
    let state = career();
    const prospect = getMarketPlayers(state).find((player) => player.age === 18);
    state = managerReducer(state, { type: 'NEGOTIATE', playerId: prospect.id, fee: prospect.value, wage: prospect.wage });
    state = managerReducer(state, { type: 'ACCEPT_TRANSFER' });
    expect(getSquad(state).some((player) => player.id === prospect.id)).toBe(true);
    state = seasonEnd(state);
    const next = managerReducer(state, { type: 'NEXT_SEASON' });
    const persisted = getSquad(next).find((player) => player.id === prospect.id);
    expect(next.year).toBe(2013);
    expect(next.round).toBe(0);
    expect(next.phase).toBe('season');
    expect(next.playerStats).toEqual({});
    expect(persisted.age).toBe(19);
    expect(persisted.rating).toBeGreaterThanOrEqual(prospect.rating);
    expect(persisted.rating).toBeLessThanOrEqual(persisted.potential);
    expect(next.world.players.some((player) => player.retired)).toBe(true);
    const academy = next.world.players.filter((player) => player.id.startsWith('academy-'));
    expect(academy.length).toBeGreaterThan(0);
    expect(academy.every((player) => player.real === false && player.age === 17)).toBe(true);
    expect(next.history).toHaveLength(1);
  });

  it('rejects an early season rollover and repeat press morale farming', () => {
    const state = career();
    expect(managerReducer(state, { type: 'NEXT_SEASON' }).year).toBe(2012);
    const press = managerReducer(state, { type: 'PRESS', tone: 'calm' });
    const repeated = managerReducer(press, { type: 'PRESS', tone: 'calm' });
    expect(press.morale).toBe(state.morale + 2);
    expect(repeated.morale).toBe(press.morale);
    expect(repeated.lastError).toBeTruthy();
  });

  it('uses a four-year World Cup cycle and requires club continental qualification', () => {
    let state = createManagerCareer({ year: 2013, clubId: 'club-0', seed: 'calendar' });
    while (state.phase === 'season') state = play(state);
    expect(state.tournaments.some((tournament) => tournament.id === 'manager-world-cup')).toBe(true);
    expect(state.tournaments.filter((tournament) => tournament.continental).every((tournament) => tournament.remaining.every((clubId) => {
      const club = state.world.clubs.find((entry) => entry.id === clubId);
      return getStandings(state, club.competitionId).findIndex((row) => row.clubId === clubId) < 4;
    }))).toBe(true);
    const completed = seasonEnd(state);
    expect(completed.tournaments.some((tournament) => tournament.id === 'manager-club-world-cup')).toBe(true);
    expect(seasonEnd(career()).tournaments.some((tournament) => tournament.id === 'manager-world-cup')).toBe(false);
  });
});

describe('manager market and scouts', () => {
  it('charges scouting once, respects era age and country, and excludes previously reported players', () => {
    const original = career();
    const first = managerReducer(original, { type: 'SCOUT', country: 'GER', maxAge: 21 });
    expect(first.scoutReports.length).toBeGreaterThan(0);
    expect(original.finances.budget - first.finances.budget).toBe(60000);
    expect(first.scoutReports.every((report) => report.age <= 21 && original.world.players.find((player) => player.id === report.playerId).nationality === 'GER')).toBe(true);
    const second = managerReducer(first, { type: 'SCOUT', country: 'GER', maxAge: 21 });
    const ids = second.scoutReports.map((report) => report.playerId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(managerReducer({ ...original, finances: { ...original.finances, budget: 1 } }, { type: 'SCOUT' }).scoutReports).toHaveLength(0);
  });

  it('does not move a player until a funded counteroffer is accepted and debits exactly once', () => {
    const original = freezeDeep(career());
    const player = getMarketPlayers(original)[0];
    const negotiating = managerReducer(original, { type: 'NEGOTIATE', playerId: player.id, fee: player.value, wage: player.wage });
    expect(negotiating.negotiation.status).toBe('counter');
    expect(negotiating.finances.budget).toBe(original.finances.budget);
    expect(negotiating.world).toBe(original.world);
    const signed = managerReducer(negotiating, { type: 'ACCEPT_TRANSFER' });
    expect(original.finances.budget - signed.finances.budget).toBe(negotiating.negotiation.fee);
    expect(getManagerSummary(signed).wageBill - getManagerSummary(original).wageBill).toBe(negotiating.negotiation.wage);
    expect(getSquad(signed).some((entry) => entry.id === player.id)).toBe(true);
    expect(signed.world.players.filter((entry) => entry.id === player.id)).toHaveLength(1);
    expect(managerReducer(signed, { type: 'ACCEPT_TRANSFER' }).finances.budget).toBe(signed.finances.budget);
    expect(getMarketPlayers(signed).some((entry) => entry.id === player.id)).toBe(false);
  });

  it('rejects unaffordable fees, salaries, and impossible or broken negotiations', () => {
    const state = career();
    const player = getMarketPlayers(state)[0];
    for (const [fee, wage] of [[1e12, 1000], [player.value, 1e10], [NaN, 1000], [-1, 1000]]) {
      const next = managerReducer(state, { type: 'NEGOTIATE', playerId: player.id, fee, wage });
      expect(next.lastError).toBeTruthy();
      expect(next.finances).toBe(state.finances);
    }
    const broken = managerReducer(state, { type: 'NEGOTIATE', playerId: player.id, fee: 1, wage: 1 });
    expect(broken.negotiation.status).toBe('rejected');
    expect(managerReducer(broken, { type: 'ACCEPT_TRANSFER' }).world).toBe(state.world);
    const counter = managerReducer(state, { type: 'NEGOTIATE', playerId: player.id, fee: player.value, wage: player.wage });
    const unfunded = { ...counter, finances: { ...counter.finances, budget: counter.negotiation.fee - 1 } };
    expect(managerReducer(unfunded, { type: 'ACCEPT_TRANSFER' }).world).toBe(state.world);
  });
});

describe('manager persistence', () => {
  it('round-trips partial matches and preserves identical future results', () => {
    let state = play(career());
    state = managerReducer(state, { type: 'PLAY_MATCH', mode: 'deep' });
    state = managerReducer(state, { type: 'ADVANCE_MATCH' });
    const serialized = serializeManagerCareer(state);
    const payload = JSON.parse(serialized);
    const { transferWindowCalendar, ...withoutCalendar } = payload;
    // Keep the existing game-state budget; the new immutable source-backed
    // calendar has its own allowance rather than hiding state-size growth.
    expect(JSON.stringify(withoutCalendar).length).toBeLessThan(150000);
    // The retained historical calendar now includes eight archived FIFA editions.
    // It remains bounded; replay inputs still avoid serializing the whole world.
    expect(serialized.length).toBeLessThan(400000);
    expect(payload.world).toBeUndefined();
    const restored = restoreManagerCareer(serialized);
    expect(restored.transferWindowCalendar).toEqual(transferWindowCalendar);
    expect(restored.activeMatch).toEqual(state.activeMatch);
    expect(managerReducer(restored, { type: 'FINISH_MATCH' })).toEqual(managerReducer(state, { type: 'FINISH_MATCH' }));
  });

  it('restores simulated development instead of replacing it with the next historical dataset', () => {
    const next = managerReducer(seasonEnd(), { type: 'NEXT_SEASON' });
    const restored = restoreManagerCareer(serializeManagerCareer(next));
    expect(restored.world.players).toEqual(next.world.players);
    expect(restored.history).toEqual(next.history);
  });

  it('rejects corrupted version, negative balances, foreign lineups and duplicate standings', () => {
    const valid = JSON.parse(serializeManagerCareer(career()));
    expect(() => restoreManagerCareer('{')).toThrow();
    expect(() => restoreManagerCareer({ ...valid, version: 999 })).toThrow();
    expect(() => restoreManagerCareer({ ...valid, finances: { ...valid.finances, budget: -1 } })).toThrow();
    expect(() => restoreManagerCareer({ ...valid, lineup: ['club-1-p0'] })).toThrow();
    const duplicate = { ...valid, leagues: { ...valid.leagues, 'league-a': { ...valid.leagues['league-a'], table: Array(4).fill(valid.leagues['league-a'].table[0]) } } };
    expect(() => restoreManagerCareer(duplicate)).toThrow();
  });
});

describe('manager consistency audit', () => {
  const expectRosters = (state) => {
    for (const club of state.world.clubs) expect(club.playerIds).toEqual(state.world.players.filter((player) => player.clubId === club.id && !player.retired).map((player) => player.id));
  };
  it('aligns a new career with its historical snapshot and preserves the date of an existing save', () => {
    const state = createManagerCareer({ year: 2013, clubId: 'club-0' });
    expect(state.date).toBe('2013-09-03');
    expect(getManagerSummary(state).position).toBeNull();
    expect(getManagerSummary(state).transferWindowOpen).toBe(true);
    expect(state.leagues['league-a'].rounds.flat().every((fixture) => fixture.date > state.date)).toBe(true);
    expect(getManagerSummary(play(state)).transferWindowOpen).toBe(false);
    const old = createManagerCareer({ year: 2013, clubId: 'club-0', world: { ...state.world, coverage: { snapshotDate: '2013-08-17' } } });
    expect(restoreManagerCareer(serializeManagerCareer(old)).date).toBe('2013-08-17');
  });
  it('refreshes only an explicitly requested untouched v2 archive and retains user preferences', () => {
    const initial = career('chosen-seed');
    const oldWorld = { ...initial.world, coverage: { snapshotDate: '2012-08-17', archiveRevision: 'obsolete' },
      players: initial.world.players.map((player) => player.id === 'club-0-p2' ? { ...player, name: 'Obsolete identity' } : player) };
    let old = createManagerCareer({ year: 2012, clubId: 'club-0', world: oldWorld, seed: 'chosen-seed', managerName: 'Entrenadora' });
    old = managerReducer(old, { type: 'SET_TACTICS', formation: '4-4-2', mentality: 'attacking' });
    old = managerReducer(old, { type: 'SET_TRAINING', intensity: 'recovery' });
    old = { ...old, autoLineup: false };
    expect(getCareerRefreshEligibility(old).eligible).toBe(true);
    const updated = refreshInitialManagerCareer(freezeDeep(old));
    expect(updated.lastError).toBeNull();
    expect(updated.world.players.find((player) => player.id === 'club-0-p2').name).not.toBe('Obsolete identity');
    expect(updated.world.coverage.archiveRevision).toBe('current-test');
    expect(updated.date).toBe('2012-09-01');
    expect(updated.managerName).toBe(old.managerName); expect(updated.seed).toBe(old.seed);
    expect(updated.tactics).toEqual(old.tactics); expect(updated.trainingIntensity).toBe('recovery');
    expect(updated.lineup).toEqual(old.lineup); expect(updated.autoLineup).toBe(false);
    expect(old.world.players.find((player) => player.id === 'club-0-p2').name).toBe('Obsolete identity');
    const variations = [play(initial), { ...initial, migratedFromVersion: 1 }, { ...initial, pressRound: 0 },
      { ...initial, transfers: [{ playerId: 'club-1-p0' }] }, managerReducer(initial, { type: 'SCOUT' }),
      managerReducer(initial, { type: 'NEGOTIATE', playerId: 'club-1-p0', fee: 1000000, wage: 1000 })];
    for (const state of variations) {
      expect(getCareerRefreshEligibility(state).eligible).toBe(false);
      const denied = refreshInitialManagerCareer(state);
      expect(denied.lastError).toBeTruthy(); expect(denied.world).toBe(state.world);
      expect(denied.finances).toBe(state.finances); expect(denied.transfers).toBe(state.transfers);
    }
  });
  it('keeps both roster indexes and physical history coherent through signings, sales, aging and restoration', () => {
    let state = managerReducer(career(), { type: 'SET_TRAINING', intensity: 'intensive' });
    state = { ...state, date: '2012-09-05' };
    const player = getMarketPlayers(state)[0];
    const before = getPlayerHealth(state, player);
    state = managerReducer(state, { type: 'NEGOTIATE', playerId: player.id, fee: player.value, wage: player.wage });
    state = managerReducer(state, { type: 'ACCEPT_TRANSFER' });
    expect(state.lastError).toBeNull(); expectRosters(state);
    const after = getSquad(state).find((entry) => entry.id === player.id);
    expect(after.sharpness).toBe(before.sharpness); expect(after.condition).toBe(before.condition);
    const outfield = getSquad(state).find((entry) => entry.position !== 'GK');
    state = managerReducer(state, { type: 'SELL_PLAYER', playerId: outfield.id });
    expect(state.lastError).toBeNull(); expectRosters(state);
    expectRosters(restoreManagerCareer(serializeManagerCareer(state)));
    const next = managerReducer(seasonEnd(state), { type: 'NEXT_SEASON' });
    expectRosters(next); expectRosters(restoreManagerCareer(serializeManagerCareer(next)));
    expect(next.finances.budget).toBe(next.finances.openingBudget + next.finances.income - next.finances.spent);
  });
  it('uses recorded birthdays for squad ages, scouts and market filters', () => {
    const initial = career();
    const target = initial.world.players.find((player) => player.clubId === 'club-1' && player.position === 'FW');
    const own = initial.world.players.find((player) => player.clubId === initial.clubId);
    const world = { ...initial.world, players: initial.world.players.map((player) => [target.id, own.id].includes(player.id)
      ? { ...player, birthYear: 1991, birthDate: '1991-12-19', age: 21, nationality: 'TST' } : player) };
    const state = { ...initial, world };
    expect(getSquad(state).find((player) => player.id === own.id).age).toBe(20);
    expect(getMarketPlayers(state, { maxAge: 20 }).some((player) => player.id === target.id)).toBe(true);
    const scouting = managerReducer(state, { type: 'SCOUT', maxAge: 20, country: 'TST' });
    expect(scouting.scoutReports.find((report) => report.playerId === target.id)?.age).toBe(20);
    expect(getSquad({ ...state, date: '2012-12-19' }).find((player) => player.id === own.id).age).toBe(21);
  });
  it('rejects invalid accepted prices, impossible minutes, inconsistent tables and unbalanced saved accounts', () => {
    const state = career();
    const target = getMarketPlayers(state)[0];
    const counter = managerReducer(state, { type: 'NEGOTIATE', playerId: target.id, fee: target.value, wage: target.wage });
    for (const fee of [-1000, NaN, Infinity]) {
      const result = managerReducer({ ...counter, negotiation: { ...counter.negotiation, fee } }, { type: 'ACCEPT_TRANSFER' });
      expect(result.lastError).toBeTruthy(); expect(result.world).toBe(state.world);
    }
    const played = play(state);
    const saved = JSON.parse(serializeManagerCareer(played));
    const stats = unpackSnapshot(saved.packedStats);
    const id = Object.keys(stats)[0];
    stats[id] = { ...stats[id], minutes: stats[id].appearances * 120 + 1 };
    expect(() => restoreManagerCareer({ ...saved, packedStats: packSnapshot(stats) })).toThrow(/estadísticas/);
    expect(() => restoreManagerCareer({ ...saved, finances: { ...saved.finances, budget: saved.finances.budget + 5000 } })).toThrow(/saldo/);
    const table = saved.leagues['league-a'].table.map((row, i) => i ? row : { ...row, gf: row.gf + 1 });
    expect(() => restoreManagerCareer({ ...saved, leagues: { ...saved.leagues, 'league-a': { ...saved.leagues['league-a'], table } } })).toThrow(/clasificación/);
  });
});

describe('bundled-world integration', () => {
  it('simulates and saves a complete real catalog within practical browser limits', () => {
    const start = Date.now();
    const initial = createManagerCareer({ year: 2025, clubId: 'barcelona', seed: 'full-world' });
    expect(initial.world.players.length).toBeGreaterThan(10000);
    const complete = seasonEnd(initial);
    expect(complete.lastError).toBeNull();
    expect(complete.tournaments.some((tournament) => tournament.id === 'manager-world-cup')).toBe(true);
    expect(complete.tournaments.some((tournament) => tournament.id === 'manager-club-world-cup')).toBe(true);
    const save = serializeManagerCareer(complete);
    // localStorage implementations commonly count UTF-16 code units against their quota.
    expect(save.length * 2).toBeLessThan(5 * 1024 * 1024);
    const restored = restoreManagerCareer(save);
    expect(restored.awards).toEqual(complete.awards);
    const next = managerReducer(complete, { type: 'NEXT_SEASON' });
    const laterSave = serializeManagerCareer(next);
    expect(laterSave.length * 2).toBeLessThan(5 * 1024 * 1024);
    expect(restoreManagerCareer(laterSave).world.players).toEqual(next.world.players);
    // Expanded catalogs simulate 51 leagues, physical state and promotion legs,
    // then encode/decode two self-contained worlds within this aggregate budget.
    expect(Date.now() - start).toBeLessThan(60000);
  }, 90000);
});
