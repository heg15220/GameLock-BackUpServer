import { describe, expect, it } from 'vitest';
import {
  advanceDivisionPlayoffs, applyDivisionMovements, createDivisionPlayoffs, divisionPenaltyWinner,
  getDivisionPlayoffFixtures, getDivisionRules, isPromotionEligible, resolveDivisionMovements,
} from './divisions.js';

function career(country = 'ENG', year = 2025, sizes = [20, 24]) {
  const competitions = sizes.map((_, i) => ({ id: `division-${i + 1}`, tier: i + 1, name: `Liga ${i + 1}`, country_fifa_code: country }));
  const clubs = competitions.flatMap((competition, tier) => Array.from({ length: sizes[tier] }, (_, i) => ({
    id: `d${tier + 1}-c${i + 1}`, competitionId: competition.id, rating: 84 - tier * 8 - i,
  })));
  const leagues = Object.fromEntries(competitions.map((competition) => [competition.id, {
    rounds: [[]], round: 1, table: clubs.filter((club) => club.competitionId === competition.id)
      .map((club, i) => ({ clubId: club.id, points: 100 - i * 2, played: 38, gf: 70 - i, ga: 20 + i })),
  }]));
  return { year, seed: 'divisions-test', world: { year, competitions, clubs, players: [] }, leagues };
}
function mockMatch(state, fixture) {
  const homeWins = divisionPenaltyWinner(state.seed, fixture) === fixture.homeId;
  const homeGoals = homeWins ? 2 : 0; const awayGoals = homeWins ? 0 : 2;
  const aggregate = homeGoals + fixture.aggregateHome - awayGoals - fixture.aggregateAway;
  const winnerId = aggregate === 0 ? fixture.tieBreak === 'higher-seed' ? fixture.tieWinnerId
    : divisionPenaltyWinner(state.seed, fixture) : aggregate > 0 ? fixture.homeId : fixture.awayId;
  const penalties = fixture.knockout && aggregate === 0 && fixture.tieBreak !== 'higher-seed'
    ? { home: winnerId === fixture.homeId ? 5 : 4, away: winnerId === fixture.awayId ? 5 : 4 } : null;
  return { fixture, homeGoals, awayGoals, winnerId, penalties, duration: 90 };
}
function frozen(value) {
  Object.freeze(value);
  Object.values(value).forEach((entry) => { if (entry && typeof entry === 'object' && !Object.isFrozen(entry)) frozen(entry); });
  return value;
}

describe('season-specific division rules', () => {
  it('links all adjacent English tiers with the correct number of promotion places', () => {
    const rules = getDivisionRules(career('ENG', 2025, [20, 24, 24, 24]).world);
    expect(rules.map((rule) => [rule.automaticPromotion, rule.automaticRelegation])).toEqual([[2, 3], [2, 3], [3, 4]]);
    expect(rules.every((rule) => rule.playoff.neutralFinal)).toBe(true);
  });

  it('distinguishes direct French promotion in 2012 from the 2025 barrage', () => {
    expect(getDivisionRules(career('FRA', 2012, [20, 20]).world)[0]).toMatchObject({ automaticPromotion: 3, automaticRelegation: 3, playoff: null });
    expect(getDivisionRules(career('FRA', 2025, [18, 18]).world)[0].playoff.format).toBe('french');
  });

  it('uses the historical German away-goals rule and excludes closed leagues', () => {
    expect(getDivisionRules(career('GER', 2012, [18, 18]).world)[0].playoff.awayGoalsRule).toBe(true);
    expect(getDivisionRules(career('GER', 2025, [18, 18]).world)[0].playoff.awayGoalsRule).toBe(false);
    expect(getDivisionRules(career('USA').world)).toEqual([]);
    expect(getDivisionRules(career('AUS').world)).toEqual([]);
  });

  it('does not invent connections between competing regional groups', () => {
    const state = career();
    state.world.competitions.push({ id: 'another-group', tier: 2, country_fifa_code: 'ENG' });
    state.world.clubs.push({ id: 'g1', competitionId: 'another-group' }, { id: 'g2', competitionId: 'another-group' });
    expect(getDivisionRules(state.world)).toEqual([]);
  });

  it('never treats an external market pool as a division above the top flight', () => {
    const state = career('ESP', 2013, [20, 22]);
    const original = getDivisionRules(state.world);
    state.world.competitions.push({ id: 'external:ESP', tier: 0, country_fifa_code: 'ESP', simulated: false, selectable: false });
    state.world.clubs.push({ id: 'external-a', competitionId: 'external:ESP' }, { id: 'external-b', competitionId: 'external:ESP' });
    expect(getDivisionRules(state.world)).toEqual(original);
    const plan = createDivisionPlayoffs(state);
    expect(plan.rules).toEqual(original);
    expect(plan.movements.every((movement) => !movement.fromId.startsWith('external:') && !movement.toId.startsWith('external:'))).toBe(true);
    expect(() => applyDivisionMovements(state.world, [
      { clubId: 'external-a', fromId: 'external:ESP', toId: 'division-1' },
      { clubId: 'd1-c1', fromId: 'division-1', toId: 'external:ESP' },
    ])).toThrow(/inválido/);
  });

  it('labels approximated formats and catalogue size mismatches', () => {
    const rule = getDivisionRules(career('ARG', 2012, [20, 36]).world)[0];
    expect(rule.coverage).toBe('modeled');
    expect(rule.notes.join(' ')).toContain('promedios');
    expect(getDivisionRules(career('ESP', 2012, [20, 20]).world)[0].notes.join(' ')).toContain('Catálogo parcial');
  });
});

describe('playoff brackets and aggregate results', () => {
  it('plays English semi-finals over two legs and a single neutral final', () => {
    const state = career(); let plan = createDivisionPlayoffs(state);
    let fixtures = getDivisionPlayoffFixtures(plan);
    expect(fixtures.map((fixture) => [fixture.homeId, fixture.awayId])).toEqual([['d2-c6', 'd2-c3'], ['d2-c5', 'd2-c4']]);
    expect(fixtures.every((fixture) => !fixture.knockout && fixture.leg === 1)).toBe(true);
    plan = advanceDivisionPlayoffs(plan, fixtures.map((fixture) => ({ fixture, homeGoals: 2, awayGoals: 0 })));
    fixtures = getDivisionPlayoffFixtures(plan);
    expect(fixtures[0]).toMatchObject({ homeId: 'd2-c3', awayId: 'd2-c6', aggregateHome: 0, aggregateAway: 2, knockout: true });
    plan = advanceDivisionPlayoffs(plan, fixtures.map((fixture) => ({ fixture, homeGoals: 1, awayGoals: 0 })));
    const [final] = getDivisionPlayoffFixtures(plan);
    expect(final).toMatchObject({ homeId: 'd2-c5', awayId: 'd2-c6', neutral: true, legs: 1, knockout: true });
    plan = advanceDivisionPlayoffs(plan, [{ fixture: final, homeGoals: 0, awayGoals: 1 }]);
    expect(plan.complete).toBe(true);
    expect(plan.movements.find((move) => move.reason === 'promotion-playoff').clubId).toBe('d2-c6');
    expect(plan.movements.find((move) => move.reason === 'relegation-playoff').clubId).toBe('d1-c18');
  });

  it('uses higher league position after aggregate draws in Spain and does not use away goals', () => {
    const state = career('ESP', 2025, [20, 22]);
    let plan = createDivisionPlayoffs(state);
    while (!plan.complete) {
      const fixtures = getDivisionPlayoffFixtures(plan);
      expect(fixtures.every((fixture) => fixture.tieBreak === 'higher-seed' && !fixture.awayGoalsRule && !fixture.noExtraTime)).toBe(true);
      plan = advanceDivisionPlayoffs(plan, fixtures.map((fixture) => ({ fixture, homeGoals: 1, awayGoals: 1, duration: fixture.knockout ? 120 : 90 })));
    }
    expect(plan.playoffs[0].winnerId).toBe('d2-c3');
    expect(plan.playoffs[0].results).toHaveLength(6);
  });

  it('keeps the German upper club up when it wins the aggregate, even if it loses the return leg', () => {
    let plan = createDivisionPlayoffs(career('GER', 2025, [18, 18]));
    let [fixture] = getDivisionPlayoffFixtures(plan);
    expect(fixture).toMatchObject({ homeId: 'd1-c16', awayId: 'd2-c3', knockout: false });
    plan = advanceDivisionPlayoffs(plan, [{ fixture, homeGoals: 3, awayGoals: 0 }]);
    [fixture] = getDivisionPlayoffFixtures(plan);
    expect(fixture).toMatchObject({ homeId: 'd2-c3', aggregateHome: 0, aggregateAway: 3 });
    plan = advanceDivisionPlayoffs(plan, [{ fixture, homeGoals: 1, awayGoals: 0 }]);
    expect(plan.playoffs[0].winnerId).toBe('d1-c16');
    expect(plan.movements).toHaveLength(4);
  });

  it('uses German away goals only in the seasons which had that rule', () => {
    let plan = createDivisionPlayoffs(career('GER', 2012, [18, 18]));
    let [fixture] = getDivisionPlayoffFixtures(plan);
    plan = advanceDivisionPlayoffs(plan, [{ fixture, homeGoals: 1, awayGoals: 1 }]);
    [fixture] = getDivisionPlayoffFixtures(plan);
    plan = advanceDivisionPlayoffs(plan, [{ fixture, homeGoals: 0, awayGoals: 0 }]);
    expect(plan.playoffs[0].winnerId).toBe('d2-c3');
    expect(plan.movements).toHaveLength(6);
  });

  it('retains historical Spanish away goals before extra time but removes them from 2021/22', () => {
    const old = createDivisionPlayoffs(career('ESP', 2012, [20, 22]));
    const current = createDivisionPlayoffs(career('ESP', 2025, [20, 22]));
    expect(getDivisionPlayoffFixtures(old)[0]).toMatchObject({ awayGoalsRule: true, awayGoalsExtraTime: false });
    expect(getDivisionPlayoffFixtures(current)[0].awayGoalsRule).toBe(false);
    let plan = advanceDivisionPlayoffs(old, getDivisionPlayoffFixtures(old).map((fixture) => ({ fixture, homeGoals: 0, awayGoals: 0 })));
    plan = advanceDivisionPlayoffs(plan, getDivisionPlayoffFixtures(plan).map((fixture) => ({ fixture, homeGoals: 1, awayGoals: 1 })));
    expect(plan.playoffs[0].ties[0].winnerId).toBe('d2-c6');
  });

  it('gives the third-tier German club the home first leg at the second/third boundary', () => {
    const state = career('GER', 2025, [18, 18, 20]);
    const fixture = getDivisionPlayoffFixtures(createDivisionPlayoffs(state)).find((entry) => entry.homeId === 'd3-c3');
    expect(fixture).toMatchObject({ homeId: 'd3-c3', awayId: 'd2-c16', leg: 1 });
  });

  it('honors the exact Italian 2012 direct-promotion threshold of more than nine points', () => {
    const state = career('ITA', 2012, [20, 22]);
    const table = state.leagues['division-2'].table;
    table[2].points = 90; table.slice(3).forEach((row, i) => { row.points = 81 - i; });
    expect(createDivisionPlayoffs(state).playoffs).toHaveLength(1);
    table[2].points = 91;
    const plan = createDivisionPlayoffs(state);
    expect(plan.complete).toBe(true); expect(plan.movements).toHaveLength(6);
    expect(plan.movements.find((move) => move.clubId === 'd2-c3').reason).toBe('promotion-automatic');
  });

  it('has six Italian 2025 entrants, seeded preliminaries, no ET in two-legged ties and the 14-point threshold', () => {
    const state = career('ITA', 2025, [20, 20]);
    let plan = createDivisionPlayoffs(state);
    const fixtures = getDivisionPlayoffFixtures(plan);
    expect(fixtures.map((f) => [f.homeId, f.awayId])).toEqual([['d2-c5', 'd2-c8'], ['d2-c6', 'd2-c7']]);
    expect(fixtures.every((f) => f.knockout && !f.noExtraTime)).toBe(true);
    plan = advanceDivisionPlayoffs(plan, fixtures.map((fixture) => ({ fixture, homeGoals: 1, awayGoals: 0 })));
    expect(getDivisionPlayoffFixtures(plan).every((f) => f.noExtraTime && f.legs === 2)).toBe(true);
    state.leagues['division-2'].table[2].points = 96;
    state.leagues['division-2'].table.slice(3).forEach((row, i) => { row.points = 81 - i; });
    expect(createDivisionPlayoffs(state).complete).toBe(true);
  });

  it('stages the French 4th/5th and 3rd-place qualifiers before a home-and-away barrage', () => {
    const state = career('FRA', 2025, [18, 18]); let plan = createDivisionPlayoffs(state);
    let [fixture] = getDivisionPlayoffFixtures(plan);
    expect(fixture).toMatchObject({ homeId: 'd2-c4', awayId: 'd2-c5', legs: 1, noExtraTime: true });
    plan = advanceDivisionPlayoffs(plan, [{ fixture, homeGoals: 2, awayGoals: 1 }]);
    [fixture] = getDivisionPlayoffFixtures(plan);
    expect(fixture).toMatchObject({ homeId: 'd2-c3', awayId: 'd2-c4', noExtraTime: true });
    plan = advanceDivisionPlayoffs(plan, [{ fixture, homeGoals: 2, awayGoals: 1 }]);
    [fixture] = getDivisionPlayoffFixtures(plan);
    expect(fixture).toMatchObject({ homeId: 'd2-c3', awayId: 'd1-c16', legs: 2, knockout: false, noExtraTime: false });
  });

  it('never awards promotion before league completion or without a resolved deciding result', () => {
    const state = career(); state.leagues['division-2'].round = 0;
    const waiting = createDivisionPlayoffs(state);
    expect(waiting.movements).toEqual([]); expect(waiting.notes.join(' ')).toContain('sin terminar');
    expect(() => resolveDivisionMovements(career())).toThrow('simulateMatch');
    let plan = createDivisionPlayoffs(career());
    plan = advanceDivisionPlayoffs(plan, getDivisionPlayoffFixtures(plan).map((fixture) => ({ fixture, homeGoals: 0, awayGoals: 0 })));
    expect(() => advanceDivisionPlayoffs(plan, getDivisionPlayoffFixtures(plan).map((fixture) => ({ fixture, homeGoals: 0, awayGoals: 0 })))).toThrow('ganador');
  });

  it('rejects repeated legs and forged opponents rather than progressing the bracket twice', () => {
    const plan = createDivisionPlayoffs(career()); const [fixture] = getDivisionPlayoffFixtures(plan);
    const result = { fixture, homeGoals: 1, awayGoals: 0 };
    expect(() => advanceDivisionPlayoffs(plan, [result, result])).toThrow('inválido');
    expect(() => advanceDivisionPlayoffs(plan, [{ ...result, fixture: { ...fixture, homeId: 'd1-c1' } }])).toThrow('inválido');
    expect(() => advanceDivisionPlayoffs(advanceDivisionPlayoffs(plan, [result]), [result])).toThrow('inválido');
  });
});

describe('promotion eligibility, save replay and conservation', () => {
  it('passes Spanish reserve promotion places to eligible clubs and prevents German II teams reaching tier two', () => {
    const state = career('ESP', 2012, [20, 22]);
    state.world.clubs.find((club) => club.id === 'd2-c1').reserveParentId = 'd1-c1';
    const plan = createDivisionPlayoffs(state);
    expect(plan.movements.some((move) => move.clubId === 'd2-c1')).toBe(false);
    expect(plan.movements.find((move) => move.reason === 'promotion-automatic').clubId).toBe('d2-c2');
    const german = career('GER', 2025, [18, 18, 20]);
    expect(isPromotionEligible({ id: 'reserves', reserveParentId: 'd1-c1' }, german.world.competitions[1], german.world)).toBe(false);
  });

  it.each(['ENG', 'ESP', 'GER', 'ITA', 'FRA', 'BRA', 'AUT', 'ARG'])('preserves every club and division cardinality for %s', (country) => {
    const state = frozen(career(country));
    const first = resolveDivisionMovements(state, { simulateMatch: mockMatch });
    expect(resolveDivisionMovements(state, { simulateMatch: mockMatch })).toEqual(first);
    const world = applyDivisionMovements(state.world, first.movements);
    expect(world.clubs).toHaveLength(state.world.clubs.length);
    expect(new Set(world.clubs.map((club) => club.id)).size).toBe(state.world.clubs.length);
    for (const competition of world.competitions) expect(world.clubs.filter((club) => club.competitionId === competition.id))
      .toHaveLength(state.world.clubs.filter((club) => club.competitionId === competition.id).length);
    expect(first.movements.every((move) => world.clubs.find((club) => club.id === move.clubId).membershipSource === 'career-simulation')).toBe(true);
  });

  it('preserves all four English league sizes across simultaneous movements on three boundaries', () => {
    const state = career('ENG', 2025, [20, 24, 24, 24]);
    const plan = resolveDivisionMovements(state, { simulateMatch: mockMatch });
    expect(plan.movements).toHaveLength(20);
    const world = applyDivisionMovements(state.world, plan.movements);
    expect(state.world.competitions.map((c) => world.clubs.filter((club) => club.competitionId === c.id).length)).toEqual([20, 24, 24, 24]);
    expect(new Set(plan.movements.map((move) => move.clubId)).size).toBe(20);
  });

  it('resumes a JSON save between legs with exactly the same promoted clubs', () => {
    const state = career('ITA'); let plan = createDivisionPlayoffs(state);
    plan = advanceDivisionPlayoffs(plan, getDivisionPlayoffFixtures(plan).map((fixture) => mockMatch(state, fixture)));
    const resumed = { ...state, divisionPlayoffs: JSON.parse(JSON.stringify(plan)) };
    expect(resolveDivisionMovements(resumed, { simulateMatch: mockMatch })).toEqual(resolveDivisionMovements(state, { simulateMatch: mockMatch }));
  });

  it('forces reserve relegation and balances a replacement when a lower division is loaded', () => {
    const state = career('GER', 2025, [18, 18, 20, 20]);
    const reserve = state.world.clubs.find((club) => club.id === 'd3-c10');
    reserve.reserveParentId = 'd2-c18';
    const plan = resolveDivisionMovements(state, { simulateMatch: mockMatch });
    expect(plan.movements.find((movement) => movement.clubId === reserve.id)).toMatchObject({ fromId: 'division-3', toId: 'division-4', reason: 'relegation-reserve-rule' });
    const world = applyDivisionMovements(state.world, plan.movements);
    expect(world.clubs.find((club) => club.id === reserve.id).competitionId).toBe('division-4');
    expect(world.clubs.filter((club) => club.competitionId === 'division-3')).toHaveLength(20);
  });

  it('makes an unloaded reserve relegation explicit without dropping the club from its catalogue', () => {
    const state = career('ESP', 2025, [20, 22]);
    state.world.clubs.find((club) => club.id === 'd2-c10').reserveParentId = 'd1-c20';
    const plan = resolveDivisionMovements(state, { simulateMatch: mockMatch });
    expect(plan.notes.join(' ')).toContain('excepción de cobertura');
    expect(plan.rules[0].notes.join(' ')).toContain('tercera categoría no cargada');
    expect(applyDivisionMovements(state.world, plan.movements).clubs).toHaveLength(42);
  });

  it('rejects unbalanced, duplicated, cross-country and stale movement sets atomically', () => {
    const state = career('FRA', 2012); const plan = createDivisionPlayoffs(state);
    expect(() => applyDivisionMovements(state.world, plan.movements.slice(0, 1))).toThrow('conservar');
    expect(() => applyDivisionMovements(state.world, [...plan.movements, plan.movements[0]])).toThrow('inválido');
    const changed = applyDivisionMovements(state.world, plan.movements);
    expect(() => applyDivisionMovements(changed, plan.movements)).toThrow('inválido');
    state.world.competitions[1].country_fifa_code = 'ESP';
    expect(() => applyDivisionMovements(state.world, plan.movements)).toThrow('inválido');
  });
});
