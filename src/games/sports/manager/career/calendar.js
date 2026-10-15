/**
 * The season calendar.
 *
 * One shape for every career, European-style:
 *
 *   1 Jul        summer transfer window opens, pre-season friendlies
 *   mid Aug      leagues kick off (window still open)
 *   31 Aug       deadline day
 *   Sep-Dec      first half of the season, continental group stage, cup rounds
 *   January      winter transfer window
 *   Feb-May      second half, knockout rounds and finals
 *   June         international summer: Euro, Copa América, AFCON, Asian Cup,
 *                Gold Cup or World Cup when one is due
 *
 * Leagues that really run on calendar years (Brazil, Argentina, MLS…) are
 * folded into the same shape - a declared simplification so that one season
 * has one transfer rhythm.
 */
import { addDays, iso, weekdayOnOrAfter } from './util.js';

export const STAGES = ['summer-window', 'first-half', 'winter-window', 'second-half', 'international', 'season-end'];

export function seasonDates(year) {
  const next = year + 1;
  const sat = (y, m, d, n = 0) => weekdayOnOrAfter(iso(y, m, d), 6, n);
  const tue = (y, m, d) => weekdayOnOrAfter(iso(y, m, d), 2);
  const wed = (y, m, d) => weekdayOnOrAfter(iso(y, m, d), 3);
  const breaks = [sat(year, 9, 4), sat(year, 10, 9), sat(year, 11, 13), sat(next, 3, 19)];
  return {
    start: iso(year, 7, 1),
    summerClose: iso(year, 8, 31),
    winterOpen: iso(next, 1, 1),
    winterClose: iso(next, 1, 31),
    leagueStart: sat(year, 8, 14),
    leagueEnd: sat(next, 5, 14),
    friendlies: [sat(year, 7, 11), sat(year, 7, 18), sat(year, 7, 25), sat(year, 8, 1)],
    breaks,
    breakMatches: breaks.flatMap((date) => [date, addDays(date, 3)]),
    cupRounds: [wed(year, 9, 22), wed(year, 10, 27), wed(year, 12, 1), wed(next, 1, 12), wed(next, 1, 26), wed(next, 2, 9), wed(next, 3, 2)],
    cupFinal: sat(next, 5, 21),
    continentalGroups: [tue(year, 9, 15), tue(year, 9, 29), tue(year, 10, 20), tue(year, 11, 3), tue(year, 11, 24), tue(year, 12, 8)],
    continentalKo: [[tue(next, 2, 10), tue(next, 2, 17)], [tue(next, 3, 3), tue(next, 3, 10)], [tue(next, 4, 6), tue(next, 4, 13)], [tue(next, 4, 27), tue(next, 5, 4)]],
    continentalFinal: sat(next, 5, 28),
    secondFinal: wed(next, 5, 25),
    seasonEnd: iso(next, 5, 31),
    tournament: {
      groups: [iso(next, 6, 8), iso(next, 6, 12), iso(next, 6, 16)],
      r16: iso(next, 6, 20), qf: iso(next, 6, 24), sf: iso(next, 6, 27), final: iso(next, 6, 30),
    },
    juneFriendlies: [iso(next, 6, 6), iso(next, 6, 9)],
    nextStart: iso(next, 7, 1),
  };
}

export function stageOf(date, dates, { tournamentRunning = false } = {}) {
  if (date < dates.start) return 'season-end';
  if (date <= dates.summerClose) return 'summer-window';
  if (date < dates.winterOpen) return 'first-half';
  if (date <= dates.winterClose) return 'winter-window';
  if (date <= dates.seasonEnd) return 'second-half';
  return tournamentRunning ? 'international' : 'season-end';
}

export function windowOpen(date, dates) {
  return (date >= dates.start && date <= dates.summerClose) || (date >= dates.winterOpen && date <= dates.winterClose);
}

/** Next date a window opens (or today if open). */
export function nextWindowDate(date, dates) {
  if (windowOpen(date, dates)) return date;
  if (date < dates.winterOpen) return dates.winterOpen;
  return dates.nextStart;
}

/**
 * League round dates: Saturdays outside international breaks, topped up with
 * midweek rounds where a league has more rounds than free weekends.
 */
export function leagueRoundDates(dates, rounds, blockedMidweek = new Set()) {
  const blocked = new Set(dates.breaks);
  const saturdays = [];
  for (let d = dates.leagueStart; d <= dates.leagueEnd; d = addDays(d, 7)) if (!blocked.has(d)) saturdays.push(d);
  let pool = saturdays;
  if (rounds > saturdays.length) {
    const midweek = [];
    for (let d = addDays(dates.leagueStart, 18); d <= addDays(dates.leagueEnd, -10); d = addDays(d, 7)) {
      if (![d, addDays(d, -1), addDays(d, 1)].some((x) => blockedMidweek.has(x)) && !blocked.has(addDays(d, -4))) midweek.push(d);
    }
    const needed = rounds - saturdays.length;
    const chosen = [];
    for (let i = 0; i < needed && midweek.length; i += 1) chosen.push(midweek[Math.floor((i + 0.5) * midweek.length / needed)]);
    pool = [...saturdays, ...new Set(chosen)].sort();
  }
  if (rounds >= pool.length) return pool.slice(0, rounds);
  // Spread fewer rounds across the whole season instead of finishing early.
  return Array.from({ length: rounds }, (_, i) => pool[Math.round(i * (pool.length - 1) / Math.max(1, rounds - 1))]);
}

/** Circle method double round robin, alternating home and away. */
export function roundRobin(teams) {
  if (teams.length < 2) return [];
  const list = teams.slice();
  if (list.length % 2) list.push(null);
  const n = list.length;
  const first = [];
  for (let round = 0; round < n - 1; round += 1) {
    const pairs = [];
    for (let i = 0; i < n / 2; i += 1) {
      let home = list[i];
      let away = list[n - 1 - i];
      if (i === 0 ? round % 2 === 1 : (round + i) % 2 === 1) [home, away] = [away, home];
      if (home && away) pairs.push([home, away]);
    }
    first.push(pairs);
    list.splice(1, 0, list.pop());
  }
  return [...first, ...first.map((pairs) => pairs.map(([home, away]) => [away, home]))];
}

/** Every pair once, for single round-robin groups. */
export function singleRoundRobin(teams) {
  return roundRobin(teams).slice(0, teams.length % 2 ? teams.length : teams.length - 1);
}
