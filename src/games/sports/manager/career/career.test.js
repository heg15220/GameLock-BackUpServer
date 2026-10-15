import { describe, it, expect } from 'vitest';
import { createCareer, continueCareer, simulateUserMatch, ownLeagueComp, leaguePosition, startUserMatch, finishUserMatch } from './career.js';
import { playToEnd } from './match.js';
import { sortTable } from './competitions.js';
import { enquire, offerToClub, acceptClubAsk, acceptPlayerAsk, searchPlayers } from './transfers.js';
import { resolveEvent } from './events.js';

function runSeason(career, log = false) {
  const stops = {};
  let guard = 0;
  const startYear = career.year;
  while (career.year === startYear && guard < 3000) {
    guard += 1;
    const result = continueCareer(career);
    stops[result.stop] = (stops[result.stop] || 0) + 1;
    if (result.stop === 'match') {
      if (guard % 3 === 0) {
        const match = playToEnd(startUserMatch(career, result.fixture.id));
        finishUserMatch(career, match);
      } else simulateUserMatch(career, result.fixture.id);
    }
    for (const event of career.events.filter((e) => !e.resolved)) resolveEvent(career, event.id, 'a');
    if (result.stop === 'sacked') break;
  }
  if (log) console.log('stops', stops, 'loops', guard);
  return stops;
}

describe('career', () => {
  it('starts in the latest documented season when the caller does not specify a year', () => {
    const career = createCareer({ clubId: 'barcelona', managerName: 'Actual', seed: 'LATEST' });
    expect(career.startYear).toBe(2026);
    expect(career.year).toBe(2026);
    expect(career.date).toBe('2026-07-01');
    expect(career.season.year).toBe(2026);
  });
  it('plays a full season with the national team and rolls over', () => {
    let t = Date.now();
    const career = createCareer({ year: 2025, clubId: 'barcelona', managerName: 'Test', seed: 'T1', nationFifa: 'ESP' });
    console.log('create ms', Date.now() - t, 'players', Object.keys(career.world.players).length, 'fixtures', Object.keys(career.season.fixtures).length);
    expect(career.season.comps['L:laliga']).toBeTruthy();
    expect(Object.values(career.season.comps).some((c) => c.type === 'continental' && c.teams.includes('barcelona'))).toBe(true);
    // A signing during the summer window.
    const target = searchPlayers(career, { line: 'DF', minOvr: 78, maxValue: career.finances.transferBudget * 0.6 })[0];
    if (target) {
      const { negotiation } = enquire(career, target.id);
      expect(negotiation).toBeTruthy();
    }
    t = Date.now();
    const stops = runSeason(career, true);
    console.log('season ms', Date.now() - t);
    const neg = career.transfers.negotiations[career.transfers.negotiations.length - 1];
    if (neg) console.log('negotiation', neg.status, neg.stage, neg.log.map((l) => l.key).join(','));
    expect(career.year).toBe(2026);
    expect(career.history.length).toBe(1);
    const h = career.history[0];
    console.log('history', JSON.stringify({ position: h.position, points: h.points, record: h.record, trophies: h.trophies, comps: h.comps, top: h.topScorer, best: h.best, grade: h.grade }));
    console.log('national', JSON.stringify(career.national?.history), 'trophies', career.trophies.map((x) => x.name));
    console.log('awards', JSON.stringify(h.awards.ballon), JSON.stringify(h.awards.boot));
    console.log('transfers log', career.news.filter((n) => n.kind === 'ai-transfer').length, 'news', career.news.length, 'inbox', career.inbox.length);
    console.log('balance', career.finances.balance, 'budget', career.finances.transferBudget);
    expect(stops.match).toBeGreaterThan(40);
    // The new season has a fresh calendar.
    expect(career.season.year).toBe(2026);
    expect(Object.values(ownLeagueComp(career).table).every((row) => row.p === 0)).toBe(true);
  }, 600000);

  it('summarises league tables with plausible spreads', () => {
    const career = createCareer({ year: 2025, clubId: 'getafe', managerName: 'T', seed: 'T2' });
    runSeason(career);
    const last = career.history[0];
    expect(last.position).toBeGreaterThan(0);
  }, 600000);
});
