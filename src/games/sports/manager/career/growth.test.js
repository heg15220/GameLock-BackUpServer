import { describe, it, expect } from 'vitest';
import { evolveClubs } from './career.js';
import { seasonIncome, stadiumCapacity } from './economy.js';

function world() {
  const clubs = {};
  const ids = Array.from({ length: 20 }, (_, i) => `c${i}`);
  ids.forEach((id, i) => { clubs[id] = { id, leagueId: 'top', rep: i === 0 ? 5 : i === 19 ? 1 : 2.5, rating: 75 }; });
  for (const club of Object.values(clubs)) club.capacity = stadiumCapacity(club);
  return { clubs, leagues: { top: { id: 'top', strength: 3, tier: 1, clubIds: ids } } };
}

function season(champion) {
  return { comps: { L: { type: 'league', finished: true, winner: champion }, C: { type: 'continental', level: 1, finished: true, winner: champion, ko: [] } } };
}

describe('club growth', () => {
  it('turns a small club that keeps winning into a top club over the years', () => {
    const w = world();
    const career = { world: w, clubId: 'c19', news: [], serial: { news: 0 }, year: 2003 };
    const small = w.clubs.c19;
    const income0 = seasonIncome(small, w.leagues.top, 2003);
    const capacity0 = small.capacity;
    const reps = [];
    for (let year = 0; year < 12; year += 1) {
      const order = ['c19', ...Object.keys(w.clubs).filter((id) => id !== 'c19')];
      career.lastStandings = { top: order };
      career.season = season(year >= 3 ? 'c19' : 'c0');
      evolveClubs(career);
      reps.push(small.rep);
    }
    expect(reps[4]).toBeGreaterThan(2);
    expect(small.rep).toBeGreaterThanOrEqual(4.5);
    expect(seasonIncome(small, w.leagues.top, 2003).commercial).toBeGreaterThan(income0.commercial * 5);
    expect(small.capacity).toBeGreaterThan(capacity0 * 2);
  });

  it('lets a giant that stops winning fade slowly, cushioned by its fan base', () => {
    const w = world();
    const career = { world: w, clubId: 'c19', news: [], serial: { news: 0 }, year: 2003 };
    const giant = w.clubs.c0;
    for (let year = 0; year < 3; year += 1) {
      const order = Object.keys(w.clubs).filter((id) => id !== 'c0');
      order.splice(12, 0, 'c0');
      career.lastStandings = { top: order };
      career.season = season('c1');
      evolveClubs(career);
    }
    expect(giant.rep).toBeLessThan(5);
    expect(giant.rep).toBeGreaterThan(4.4);
    for (let year = 0; year < 30; year += 1) evolveClubs(career);
    expect(giant.rep).toBeGreaterThanOrEqual(3.5);
  });
});
