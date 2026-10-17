import { describe, it, expect } from 'vitest';
import { createCareer, continueCareer, simulateUserMatch, leaguePosition } from './career.js';
import { leagueTable, leagueRanking } from './competitions.js';
import { resolveEvent } from './events.js';
import { getAvailableLeagues, getSeasonParticipants } from '../league-memberships.js';

function runSeason(career) {
  const start = career.year;
  for (let guard = 0; career.year === start && guard < 3000; guard += 1) {
    career.board.confidence = 100; // results are random here; the test is about the format
    const result = continueCareer(career);
    if (result.stop === 'match') simulateUserMatch(career, result.fixture.id);
    for (const event of career.events.filter((e) => !e.resolved)) resolveEvent(career, event.id, 'a');
    if (result.stop === 'sacked') break;
  }
}

describe('Segunda B / Primera Federación', () => {
  it('is documented in every selectable season, with its era name and regional groups', () => {
    for (let year = 1990; year <= 2026; year += 1) {
      const league = getAvailableLeagues(year).find((l) => l.id === 'spain-segunda-b');
      expect(league, String(year)).toBeTruthy();
      expect(league.tier).toBe(3);
      expect(league.name).toBe(year >= 2022 ? 'Primera Federación' : year === 2021 ? 'Primera División RFEF' : 'Segunda División B');
      const teams = getSeasonParticipants('spain-segunda-b', year).map((t) => t.clubId);
      expect(league.groups.flatMap((g) => g.clubIds).sort()).toEqual(teams.slice().sort());
      expect(league.groups.length).toBe(year >= 2021 ? 2 : year === 2020 ? 5 : 4);
    }
  });

  it('plays parallel groups, crowns group champions and promotes four clubs to Segunda', () => {
    const career = createCareer({ year: 2005, clubId: 'cd-badajoz', managerName: 'Grupos', seed: 'SEGB' });
    const comp = career.season.comps['L:spain-segunda-b'];
    expect(comp.groups).toHaveLength(4);
    expect(comp.rounds).toBe(38);
    const own = leaguePosition(career);
    expect(own.size).toBe(20);
    expect(own.group).toMatch(/^Grupo /);
    // Every fixture is between clubs of the same group.
    const groupOf = new Map(comp.groups.flatMap((g, i) => g.teams.map((id) => [id, i])));
    for (const f of Object.values(career.season.fixtures).filter((x) => x.comp === comp.id)) expect(groupOf.get(f.home)).toBe(groupOf.get(f.away));
    // Reserve sides stay out of the Copa del Rey.
    const cup = career.season.comps['C:ESP'];
    expect(cup.teams.some((id) => career.world.clubs[id].reserveParentId)).toBe(false);
    expect(career.world.clubs['real-madrid-castilla']?.reserveParentId ?? 'real-madrid').toBe('real-madrid');

    const third = new Set(career.world.leagues['spain-segunda-b'].clubIds);
    runSeason(career);
    const finished = career.history[0];
    expect(finished.of).toBe(20);
    const promoted = career.world.leagues['laliga-2'].clubIds.filter((id) => third.has(id));
    expect(promoted).toHaveLength(4);
    expect(promoted.filter((id) => career.world.clubs[id].reserveParentId)).toEqual([]);
    const groups = career.world.leagues['spain-segunda-b'].groups;
    expect(groups.reduce((n, g) => n + g.clubIds.length, 0)).toBe(career.world.leagues['spain-segunda-b'].clubIds.length);
    expect(groups.every((g) => g.clubIds.length === 20)).toBe(true);
    // The new season keeps playing in groups.
    expect(career.season.comps['L:spain-segunda-b'].groups).toHaveLength(4);
    expect(leagueRanking(career.season.comps['L:spain-segunda-b'])).toHaveLength(80);
    expect(leagueTable(career.season.comps['L:spain-segunda-b'], 'cd-badajoz')).toHaveLength(20);
  }, 240000);
});
