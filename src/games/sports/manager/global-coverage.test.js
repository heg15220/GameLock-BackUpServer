import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { getManagerWorld } from './data.js';
import { getAvailableYears, getAvailableLeagues, getSeasonParticipants } from './league-memberships.js';
import { loadSeasonEvidence } from './evidence-archive.js';
import { globalLeagueSources } from './global-leagues.js';

describe('expanded historical world', () => {
  it('documents every Argentine season and gives each participant real player evidence', async () => {
    const years = Array.from({ length: 37 }, (_, index) => 1990 + index), rows = [];
    expect(getAvailableYears('liga-profesional')).toEqual(years);
    expect(getSeasonParticipants('liga-profesional', 2020)).toHaveLength(24);
    for (const year of years) {
      await loadSeasonEvidence(year);
      const world = getManagerWorld(year);
      for (const club of world.clubs.filter(club => club.competitionId === 'liga-profesional')) rows.push({ year, id: club.id, name: club.name, ...club.rosterCoverage });
    }
    fs.mkdirSync('output/manager-global', { recursive: true });
    fs.writeFileSync('output/manager-global/argentina-runtime-coverage.json', JSON.stringify(rows, null, 2));
    expect(rows.filter(row => row.realPlayers === 0)).toEqual([]);
    for (const year of [2003, 2005]) expect(rows.find(row => row.year === year && row.id === 'gimnasia-lp')?.realPlayers).toBeGreaterThan(10);
    expect(getSeasonParticipants('liga-profesional', 1990).map(team => team.clubId)).toContain('arg-deportivo-mandiyu');
    expect(getSeasonParticipants('liga-profesional', 1990).map(team => team.clubId)).not.toContain('textil-mandiyu');
  }, 600000);

  it('makes each added league playable in at least one documented season', () => {
    for (const league of globalLeagueSources) expect(getAvailableYears(league.id).length, league.id).toBeGreaterThan(0);
    for (const [first, second] of [['japan-j1','japan-j2'],['korea-k1','korea-k2'],['algeria-ligue-1','algeria-ligue-2'],['morocco-botola','morocco-botola-2']]) {
      const leagues = getAvailableLeagues(2024);
      expect(leagues.find(league => league.id === first)?.tier || 1).toBe(1);
      expect(leagues.find(league => league.id === second)?.tier).toBe(2);
      const ids = [...getSeasonParticipants(first,2024),...getSeasonParticipants(second,2024)].map(team=>team.clubId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
