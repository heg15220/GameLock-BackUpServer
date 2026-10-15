/**
 * Competitions of one season: leagues, domestic cups, continental club cups,
 * national-team qualifiers and summer tournaments.
 *
 * Teams are ids: club ids as they are, national teams as `N:<FIFA code>`.
 * Fixtures live in one map keyed by id and are indexed by date; knockout
 * rounds are drawn only when the previous round has been played.
 */
import { createStream, shuffle, addDays } from './util.js';
import { leagueRoundDates, roundRobin, seasonDates } from './calendar.js';

export const nationId = (fifa) => `N:${fifa}`;
export const isNation = (id) => typeof id === 'string' && id.startsWith('N:');

const CONTINENTAL_NAMES = {
  UEFA: ['Liga de Campeones', 'Liga Europa'],
  CONMEBOL: ['Copa Libertadores', 'Copa Sudamericana'],
  CONCACAF: ['Copa de Campeones CONCACAF', 'Copa Centroamericana'],
  AFC: ['Liga de Campeones de Asia', 'Copa AFC'],
  CAF: ['Liga de Campeones de África', 'Copa Confederación CAF'],
  OFC: ['Liga de Campeones de Oceanía', 'Copa de Oceanía'],
};
const CONTINENTAL_NAMES_EN = {
  UEFA: ['Champions League', 'Europa League'],
  CONMEBOL: ['Copa Libertadores', 'Copa Sudamericana'],
  CONCACAF: ['CONCACAF Champions Cup', 'Central American Cup'],
  AFC: ['AFC Champions League', 'AFC Cup'],
  CAF: ['CAF Champions League', 'CAF Confederation Cup'],
  OFC: ['OFC Champions League', 'OFC Cup'],
};

export const TOURNAMENTS = {
  world: { name: ['Mundial', 'World Cup'], conf: null, size: 32, trophy: 'world_cup', slots: { UEFA: 13, CONMEBOL: 5, CONCACAF: 4, CAF: 5, AFC: 5 } },
  euro: { name: ['Eurocopa', 'European Championship'], conf: 'UEFA', size: 24, trophy: 'continental_nt' },
  copa: { name: ['Copa América', 'Copa América'], conf: 'CONMEBOL', size: 16, trophy: 'continental_nt', noQualifiers: true },
  afcon: { name: ['Copa de África', 'Africa Cup of Nations'], conf: 'CAF', size: 24, trophy: 'continental_nt' },
  asian: { name: ['Copa de Asia', 'Asian Cup'], conf: 'AFC', size: 24, trophy: 'continental_nt' },
  gold: { name: ['Copa Oro', 'Gold Cup'], conf: 'CONCACAF', size: 16, trophy: 'continental_nt' },
};

/** Tournaments played in the summer of a calendar year. */
export function tournamentsIn(summerYear) {
  const keys = [];
  if (summerYear % 4 === 2) keys.push('world');
  if (summerYear % 4 === 0) keys.push('euro', 'copa');
  if (summerYear % 2 === 1) keys.push('afcon', 'gold');
  if (summerYear % 4 === 3) keys.push('asian');
  return keys;
}

export function tournamentForConf(summerYear, conf) {
  return tournamentsIn(summerYear).filter((key) => key === 'world' || TOURNAMENTS[key].conf === conf
    || (key === 'copa' && conf === 'CONCACAF'));
}

const emptyRow = (team) => ({ team, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] });

export function sortTable(rows, names = {}) {
  return rows.slice().sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || b.w - a.w
    || String(names[a.team] || a.team).localeCompare(String(names[b.team] || b.team)));
}

export function standings(comp, groupIndex = null) {
  if (comp.type === 'league') return sortTable(Object.values(comp.table));
  const group = comp.groups?.[groupIndex ?? 0];
  return group ? sortTable(Object.values(group.table)) : [];
}

/* ── Season construction ── */

function addFixture(season, fixture) {
  season.fixtures[fixture.id] = { done: false, hg: null, ag: null, ...fixture };
  (season.byDate[fixture.date] ||= []).push(fixture.id);
  return fixture.id;
}

export function createSeason(year) {
  return { year, dates: seasonDates(year), fixtures: {}, byDate: {}, comps: {}, order: [] };
}

function addComp(season, comp) {
  season.comps[comp.id] = comp;
  season.order.push(comp.id);
  return comp;
}

export function buildLeagues(season, world) {
  const dates = season.dates;
  const blocked = new Set([...dates.cupRounds, ...dates.continentalGroups, ...dates.continentalGroups.map((d) => addDays(d, 2)), ...dates.continentalKo.flat(), ...dates.continentalKo.flat().map((d) => addDays(d, 2))]);
  for (const league of Object.values(world.leagues)) {
    if (league.clubIds.length < 2) continue;
    const random = createStream('league-order', season.year, league.id);
    const teams = shuffle(random, league.clubIds);
    const schedule = roundRobin(teams);
    const roundDates = leagueRoundDates(dates, schedule.length, blocked);
    const comp = addComp(season, {
      id: `L:${league.id}`, type: 'league', leagueId: league.id, name: league.name, country: league.country, tier: league.tier,
      teams: league.clubIds.slice(), rounds: schedule.length, table: Object.fromEntries(league.clubIds.map((id) => [id, emptyRow(id)])),
    });
    schedule.forEach((pairs, round) => pairs.forEach(([home, away], i) => addFixture(season, {
      id: `${comp.id}:${round}:${i}`, comp: comp.id, stage: 'league', round, date: roundDates[round] || roundDates[roundDates.length - 1], home, away,
    })));
  }
}

const roundName = (size) => ({ 2: 'final', 4: 'sf', 8: 'qf', 16: 'r16', 32: 'r32', 64: 'r64', 128: 'r128', 256: 'r256' }[size] || `r${size}`);

export function buildCups(season, world, cupName) {
  const byCountry = {};
  for (const league of Object.values(world.leagues)) {
    if (league.clubIds.length < 2) continue;
    (byCountry[league.country] ||= []).push(league);
  }
  for (const [country, leagues] of Object.entries(byCountry)) {
    const teams = leagues.sort((a, b) => a.tier - b.tier).flatMap((league) => league.clubIds.slice()
      .sort((a, b) => world.clubs[b].rating - world.clubs[a].rating));
    if (teams.length < 4) continue;
    const top = leagues[0];
    let size = 2;
    while (size < teams.length) size *= 2;
    const rounds = Math.round(Math.log2(size));
    const roundDates = [...season.dates.cupRounds.slice(-(rounds - 1)), season.dates.cupFinal];
    const comp = addComp(season, {
      id: `C:${country}`, type: 'cup', name: cupName(top.cupId, world.countries[country]), country, cupId: top.cupId,
      trophyLeagueId: top.id, teams, roundDates, round: 0, alive: teams.slice(), rounds: [], winner: null, finished: false,
    });
    drawCupRound(season, comp, world);
  }
}

/** Seeded byes for the strongest clubs in the first round, open draw after. */
function drawCupRound(season, comp, world) {
  const random = createStream('cup-draw', season.year, comp.id, comp.round);
  const alive = comp.alive;
  let size = 1;
  while (size < alive.length) size *= 2;
  const byes = comp.round === 0 ? alive.slice(0, size - alive.length) : [];
  const playing = shuffle(random, alive.filter((id) => !byes.includes(id)));
  const date = comp.roundDates[comp.round];
  const final = comp.round === comp.roundDates.length - 1;
  const fixtures = [];
  for (let i = 0; i + 1 < playing.length; i += 2) {
    let [home, away] = [playing[i], playing[i + 1]];
    // Lower-division sides host, as in most domestic cups.
    const tier = (id) => world.leagues[world.clubs[id]?.leagueId]?.tier || 1;
    if (tier(away) > tier(home)) [home, away] = [away, home];
    fixtures.push(addFixture(season, { id: `${comp.id}:${comp.round}:${i / 2}`, comp: comp.id, stage: roundName(playing.length), round: comp.round, date, home, away, neutral: final, ko: true }));
  }
  comp.rounds.push({ stage: roundName(playing.length), date, fixtures, byes });
}

/** Continental slots per league: a base by strength, topped up towards 32. */
function continentalEntrants(world, conf, lastStandings, level) {
  const leagues = Object.values(world.leagues).filter((league) => league.conf === conf && league.tier === 1 && league.clubIds.length >= 4)
    .sort((a, b) => b.strength - a.strength || b.clubIds.length - a.clubIds.length);
  if (!leagues.length) return [];
  const order = (league) => (lastStandings?.[league.id]?.filter((id) => league.clubIds.includes(id)).length === league.clubIds.length
    ? lastStandings[league.id] : league.clubIds.slice().sort((a, b) => world.clubs[b].rating - world.clubs[a].rating));
  const base = [1, 2, 3, 4, 4, 4];
  const slots = Object.fromEntries(leagues.map((league) => [league.id, base[league.strength] || 1]));
  let total = Object.values(slots).reduce((a, b) => a + b, 0);
  for (let pass = 0; total < 32 && pass < 8; pass += 1) {
    for (const league of leagues) {
      if (total >= 32) break;
      if (slots[league.id] < Math.floor(league.clubIds.length / 3)) { slots[league.id] += 1; total += 1; }
    }
  }
  const first = leagues.flatMap((league) => order(league).slice(0, slots[league.id]));
  if (level === 1) return first;
  const taken = new Set(first);
  const second = leagues.flatMap((league) => order(league).filter((id) => !taken.has(id)).slice(0, Math.max(1, Math.ceil(slots[league.id] / 2))));
  return second;
}

export function buildContinental(season, world, lastStandings = null) {
  const confs = [...new Set(Object.values(world.leagues).map((league) => league.conf))].filter(Boolean);
  for (const conf of confs) {
    for (const level of [1, 2]) {
      const entrants = continentalEntrants(world, conf, lastStandings, level);
      const size = entrants.length >= 32 ? 32 : entrants.length >= 16 ? 16 : entrants.length >= 8 ? 8 : level === 1 && entrants.length >= 4 ? 4 : 0;
      if (!size) continue;
      const teams = entrants.slice(0, size);
      const comp = addComp(season, {
        id: `K:${conf}:${level}`, type: 'continental', conf, level, name: CONTINENTAL_NAMES[conf]?.[level - 1] || `Copa ${conf}`,
        nameEn: CONTINENTAL_NAMES_EN[conf]?.[level - 1] || `${conf} Cup`, teams, groups: [], ko: [], winner: null, phase: size >= 16 ? 'groups' : 'ko', finished: false,
      });
      const shift = level === 2 ? 2 : 0;
      if (size >= 16) {
        buildGroups(season, comp, teams, size / 4, season.dates.continentalGroups.map((d) => addDays(d, shift)), world, true);
      } else {
        drawKnockout(season, comp, shuffle(createStream('ko', season.year, comp.id), teams), world);
      }
    }
  }
}

/** Pots by strength, one team of each pot per group. */
function buildGroups(season, comp, teams, groupCount, dates, world, doubleRoundRobin, neutral = false) {
  const random = createStream('groups', season.year, comp.id);
  const strength = (id) => (isNation(id) ? 0 : world.clubs[id]?.rating || 0);
  const ranked = teams.slice().sort((a, b) => (comp.seed?.[b] ?? strength(b)) - (comp.seed?.[a] ?? strength(a)));
  const groups = Array.from({ length: groupCount }, (_, i) => ({ name: String.fromCharCode(65 + i), teams: [], table: {} }));
  comp.groupFixtures = [];
  const potSize = groupCount;
  for (let pot = 0; pot * potSize < ranked.length; pot += 1) {
    const members = shuffle(random, ranked.slice(pot * potSize, pot * potSize + potSize));
    members.forEach((team, i) => groups[i].teams.push(team));
  }
  groups.forEach((group, g) => {
    group.table = Object.fromEntries(group.teams.map((id) => [id, emptyRow(id)]));
    const schedule = doubleRoundRobin ? roundRobin(group.teams) : roundRobin(group.teams).slice(0, group.teams.length - 1);
    schedule.forEach((pairs, round) => pairs.forEach(([home, away], i) => comp.groupFixtures.push(addFixture(season, {
      id: `${comp.id}:g${group.name}:${round}:${i}`, comp: comp.id, stage: 'group', group: g, round, date: dates[Math.min(round, dates.length - 1)], home, away, neutral,
    }))));
  });
  comp.groups = groups;
}

function koDatesFor(season, comp, rounds) {
  if (comp.type === 'continental') {
    const shift = comp.level === 2 ? 2 : 0;
    const legs = season.dates.continentalKo.slice(-(rounds - 1)).map((pair) => pair.map((d) => addDays(d, shift)));
    return { legs, final: comp.level === 2 ? season.dates.secondFinal : season.dates.continentalFinal };
  }
  const t = season.dates.tournament;
  const single = [t.r16, t.qf, t.sf].slice(-(rounds - 1));
  return { single, final: t.final };
}

/** Knockout bracket from an ordered list: 1 v 2, 3 v 4… */
function drawKnockout(season, comp, ordered) {
  const size = ordered.length;
  const rounds = Math.round(Math.log2(size));
  comp.koPlan = koDatesFor(season, comp, rounds);
  comp.phase = 'ko';
  createKoRound(season, comp, ordered);
}

function createKoRound(season, comp, ordered) {
  const index = comp.ko.length;
  const size = ordered.length;
  const final = size === 2;
  const twoLegs = comp.type === 'continental' && !final;
  const stage = roundName(size);
  const ties = [];
  for (let i = 0; i + 1 < size; i += 2) {
    const [a, b] = [ordered[i], ordered[i + 1]];
    const tieId = `${comp.id}:${stage}:${i / 2}`;
    if (twoLegs) {
      const [d1, d2] = comp.koPlan.legs[index] || comp.koPlan.legs[comp.koPlan.legs.length - 1];
      const f1 = addFixture(season, { id: `${tieId}:1`, comp: comp.id, stage, round: index, leg: 1, tie: tieId, date: d1, home: b, away: a, ko: false });
      const f2 = addFixture(season, { id: `${tieId}:2`, comp: comp.id, stage, round: index, leg: 2, tie: tieId, date: d2, home: a, away: b, ko: true, firstLeg: f1 });
      ties.push({ id: tieId, a, b, legs: [f1, f2], winner: null });
    } else {
      const date = final ? comp.koPlan.final : comp.koPlan.single?.[index] ?? comp.koPlan.final;
      const neutral = comp.type !== 'continental' || final;
      const f = addFixture(season, { id: `${tieId}:1`, comp: comp.id, stage, round: index, tie: tieId, date, home: a, away: b, neutral, ko: true });
      ties.push({ id: tieId, a, b, legs: [f], winner: null });
    }
  }
  comp.ko.push({ stage, ties });
}

/* ── National teams ── */

/**
 * Qualifiers for the tournaments of next summer, played in the autumn
 * international breaks: groups of four, home and away.
 */
export function buildQualifiers(season, nationsByConf, strengthOf) {
  const summer = season.year + 1;
  const dates = season.dates.breakMatches.slice(0, 6);
  for (const key of tournamentsIn(summer)) {
    const def = TOURNAMENTS[key];
    if (def.noQualifiers) continue;
    const confs = def.conf ? [def.conf] : Object.keys(def.slots);
    for (const conf of confs) {
      const nations = (nationsByConf[conf] || []).slice().sort((a, b) => strengthOf(nationId(b)) - strengthOf(nationId(a)));
      const slots = def.conf ? def.size : def.slots[conf];
      if (nations.length < 4 || !slots) continue;
      const pool = nations.slice(0, Math.min(nations.length, Math.max(slots * 2, 8))).map(nationId);
      const groupCount = Math.max(1, Math.floor(pool.length / 4));
      const comp = addComp(season, {
        id: `Q:${key}:${conf}`, type: 'qualifiers', key, conf, name: def.name, slots, teams: pool.slice(0, groupCount * 4), groups: [], qualified: [], finished: false,
        seed: Object.fromEntries(pool.map((id) => [id, strengthOf(id)])),
      });
      buildGroups(season, comp, comp.teams, groupCount, dates, null, true);
    }
  }
}

/** Build next summer's tournaments once qualifiers are done. */
export function buildTournaments(season, nationsByConf, strengthOf, userNation = null) {
  const summer = season.year + 1;
  for (const key of tournamentsIn(summer)) {
    const def = TOURNAMENTS[key];
    let teams = [];
    if (key === 'copa') {
      const south = (nationsByConf.CONMEBOL || []).map(nationId);
      const north = (nationsByConf.CONCACAF || []).map(nationId).sort((a, b) => strengthOf(b) - strengthOf(a)).slice(0, 16 - Math.min(10, south.length));
      teams = [...south.slice(0, 10), ...north];
    } else {
      const quals = Object.values(season.comps).filter((comp) => comp.type === 'qualifiers' && comp.key === key);
      for (const comp of quals) teams.push(...comp.qualified);
    }
    const size = teams.length >= def.size ? def.size : teams.length >= 16 ? 16 : teams.length >= 8 ? 8 : 0;
    if (!size) continue;
    teams = teams.slice(0, size);
    const comp = addComp(season, {
      id: `T:${key}`, type: 'tournament', key, conf: def.conf, name: def.name, size, teams, groups: [], ko: [], winner: null,
      phase: 'groups', finished: false, seed: Object.fromEntries(teams.map((id) => [id, strengthOf(id)])), userInvolved: userNation ? teams.includes(nationId(userNation)) : false,
    });
    buildGroups(season, comp, teams, size / 4, season.dates.tournament.groups, null, false, true);
  }
}

/* ── Results and progression ── */

function applyRow(row, gf, ga) {
  row.p += 1; row.gf += gf; row.ga += ga;
  const result = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
  if (result === 'W') { row.w += 1; row.pts += 3; } else if (result === 'D') { row.d += 1; row.pts += 1; } else row.l += 1;
  row.form = [...row.form, result].slice(-5);
}

export function recordResult(season, fixtureId, result) {
  const fixture = season.fixtures[fixtureId];
  Object.assign(fixture, { done: true, hg: result.hg, ag: result.ag, pens: result.pens || null, et: Boolean(result.et), ev: result.ev || null, xg: result.xg || null, motm: result.motm || null });
  const comp = season.comps[fixture.comp];
  if (!comp) return fixture;
  const table = comp.type === 'league' ? comp.table : fixture.stage === 'group' ? comp.groups[fixture.group]?.table : null;
  if (table) {
    applyRow(table[fixture.home], result.hg, result.ag);
    applyRow(table[fixture.away], result.ag, result.hg);
  }
  return fixture;
}

export function winnerOf(season, fixture) {
  if (fixture.pens) return fixture.pens.home > fixture.pens.away ? fixture.home : fixture.away;
  let home = fixture.hg;
  let away = fixture.ag;
  if (fixture.firstLeg) {
    const first = season.fixtures[fixture.firstLeg];
    home += first.ag; away += first.hg;
  }
  return home > away ? fixture.home : away > home ? fixture.away : null;
}

/** Aggregate before a second leg kicks off, from the second-leg home side's view. */
export function aggregateFor(season, fixture) {
  if (!fixture.firstLeg) return null;
  const first = season.fixtures[fixture.firstLeg];
  return first.done ? { home: first.ag, away: first.hg } : { home: 0, away: 0 };
}

const fixturesDone = (season, ids) => ids.every((id) => season.fixtures[id].done);

/** Draw and schedule whatever became possible after the fixtures of a date. */
export function progressCompetitions(season, world) {
  const events = [];
  for (const compId of season.order) {
    const comp = season.comps[compId];
    if (comp.finished) continue;
    if (comp.type === 'cup') {
      const current = comp.rounds[comp.rounds.length - 1];
      if (!current || !fixturesDone(season, current.fixtures)) continue;
      const winners = current.fixtures.map((id) => winnerOf(season, season.fixtures[id]));
      comp.alive = [...current.byes, ...winners];
      if (comp.alive.length === 1) {
        comp.winner = comp.alive[0]; comp.finished = true;
        events.push({ type: 'trophy', comp: comp.id, winner: comp.winner });
      } else {
        comp.round += 1;
        drawCupRound(season, comp, world);
      }
    } else if (comp.type === 'continental' || comp.type === 'tournament') {
      if (comp.phase === 'groups') {
        if (!fixturesDone(season, comp.groupFixtures || [])) continue;
        const qualified = groupQualifiers(comp);
        const rounds = Math.round(Math.log2(qualified.length));
        comp.koPlan = koDatesFor(season, comp, rounds);
        comp.phase = 'ko';
        createKoRound(season, comp, qualified);
        events.push({ type: 'groups-done', comp: comp.id });
      } else if (comp.phase === 'ko') {
        const round = comp.ko[comp.ko.length - 1];
        const ids = round.ties.flatMap((tie) => tie.legs);
        if (!fixturesDone(season, ids)) continue;
        for (const tie of round.ties) tie.winner = winnerOf(season, season.fixtures[tie.legs[tie.legs.length - 1]]);
        const winners = round.ties.map((tie) => tie.winner);
        if (winners.length === 1) {
          comp.winner = winners[0]; comp.finished = true; comp.phase = 'done';
          events.push({ type: 'trophy', comp: comp.id, winner: comp.winner });
        } else {
          createKoRound(season, comp, winners);
        }
      }
    } else if (comp.type === 'qualifiers') {
      const ids = comp.groupFixtures || [];
      if (!ids.length || !fixturesDone(season, ids)) continue;
      const tables = comp.groups.map((group) => sortTable(Object.values(group.table)));
      const winners = tables.map((rows) => rows[0].team);
      const runners = tables.map((rows) => rows[1]).filter(Boolean).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
      const thirds = tables.map((rows) => rows[2]).filter(Boolean).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
      comp.qualified = [...winners, ...runners.map((row) => row.team), ...thirds.map((row) => row.team)].slice(0, comp.slots);
      comp.finished = true;
      events.push({ type: 'qualifiers-done', comp: comp.id, qualified: comp.qualified });
    } else if (comp.type === 'league') {
      if (!comp.finished && Object.values(comp.table).every((row) => row.p === (comp.teams.length - 1) * 2)) {
        comp.finished = true;
        comp.winner = sortTable(Object.values(comp.table))[0].team;
        events.push({ type: 'trophy', comp: comp.id, winner: comp.winner });
      }
    }
  }
  return events;
}

/** Group winners and runners-up (plus best thirds in 24-team formats), crossed. */
function groupQualifiers(comp) {
  const tables = comp.groups.map((group) => sortTable(Object.values(group.table)));
  const W = tables.map((rows) => rows[0].team);
  const R = tables.map((rows) => rows[1].team);
  const n = W.length;
  if (n === 6) {
    const T = tables.map((rows) => rows[2]).filter(Boolean)
      .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf).slice(0, 4).map((row) => row.team);
    return [W[0], T[3], W[1], T[2], W[2], T[1], W[3], T[0], W[4], R[5], W[5], R[4], R[0], R[1], R[2], R[3]];
  }
  // Winner of A meets runner-up of B, winner of B meets runner-up of A…
  const ordered = [];
  for (let i = 0; i < n; i += 2) {
    ordered.push(W[i], R[(i + 1) % n]);
    if (i + 1 < n) ordered.push(W[i + 1], R[i]);
  }
  return ordered;
}

export function compOfTeam(season, teamId, types) {
  return Object.values(season.comps).filter((comp) => (!types || types.includes(comp.type)) && comp.teams?.includes(teamId));
}

export function teamFixtures(season, teamId) {
  return Object.values(season.fixtures).filter((f) => f.home === teamId || f.away === teamId).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function stillAlive(season, comp, teamId) {
  if (comp.finished) return comp.winner === teamId;
  if (comp.type === 'league' || comp.type === 'qualifiers') return true;
  if (comp.type === 'cup') return comp.alive.includes(teamId) || comp.rounds.at(-1)?.fixtures.some((id) => [season.fixtures[id].home, season.fixtures[id].away].includes(teamId));
  if (comp.phase === 'groups') return comp.teams.includes(teamId);
  const round = comp.ko[comp.ko.length - 1];
  return round?.ties.some((tie) => tie.a === teamId || tie.b === teamId) ?? false;
}

/** Furthest stage a team reached in a knockout competition. */
export function stageReached(season, comp, teamId) {
  if (comp.winner === teamId) return 'winner';
  if (comp.type === 'cup') {
    for (let i = comp.rounds.length - 1; i >= 0; i -= 1) {
      const round = comp.rounds[i];
      if (round.fixtures.some((id) => [season.fixtures[id].home, season.fixtures[id].away].includes(teamId))) return round.stage;
    }
    return comp.teams.includes(teamId) ? 'entered' : null;
  }
  for (let i = (comp.ko?.length || 0) - 1; i >= 0; i -= 1) {
    if (comp.ko[i].ties.some((tie) => tie.a === teamId || tie.b === teamId)) return comp.ko[i].stage;
  }
  return comp.teams?.includes(teamId) ? 'group' : null;
}
