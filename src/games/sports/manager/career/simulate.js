/**
 * Turning fixtures into results and results into consequences: team sheets,
 * quick simulation for the fixtures nobody watches, and what a match leaves
 * on the players (minutes, goals, cards, fitness, form, injuries).
 */
import { createStream, clamp, quantize, weighted, addDays } from './util.js';
import { FORMATIONS, positionFit, POSITION_LINE } from './positions.js';
import { pickLineup, pickBench, dynamicOvr, energyAt, isInjured, clubSquad } from './world.js';
import { createMatch, quickResult, strengthFromLineup, playToEnd, MATCH_CLOCK_RATE } from './match.js';
import { styleTactics } from './tactics.js';
import { isNation, recordResult, aggregateFor } from './competitions.js';
import { nationStrength, nationPool } from './national.js';

const INJURIES = {
  light: [['knock', 3, 9], ['sprain', 5, 12], ['bruise', 2, 6], ['tightness', 4, 10]],
  medium: [['hamstring', 14, 35], ['groin', 12, 28], ['calf', 14, 30], ['ankle', 18, 40]],
  severe: [['knee-ligament', 60, 200], ['fracture', 45, 110], ['achilles', 90, 220], ['meniscus', 40, 95]],
};

export function rollInjury(random, severity) {
  const list = INJURIES[severity] || INJURIES.light;
  const [name, min, max] = list[Math.floor(random() * list.length)];
  return { name, severity, days: Math.round(min + random() * (max - min)) };
}

export function planFor(career, clubId) {
  return clubId === career.clubId ? career.training : 'balanced';
}

function snapshot(player, date, plan) {
  return {
    id: player.id, name: player.name, number: player.number, pos: player.pos, alt: player.alt, ovr: dynamicOvr(player, date, plan),
    attrs: player.attrs, energy: energyAt(player, date, plan), age: player.age, nat: player.nat,
  };
}

/** The team sheet a side takes into a match. */
export function teamSheet(career, teamId, date) {
  const world = career.world;
  if (isNation(teamId)) {
    const fifa = teamId.slice(2);
    const country = world.countries[fifa];
    const user = career.national?.fifa === fifa;
    const squad = user ? career.national.squad.map((id) => world.players[id]).filter(Boolean)
      : nationPool(world, fifa, date.slice(0, 7)).slice(0, 50);
    const formation = user ? career.national.tactics.formation : '4-3-3';
    let lineupPlayers = user && !career.national.autoLineup && career.national.lineup?.length === 11
      ? career.national.lineup.map((id) => world.players[id]).filter((p) => p && !isInjured(p, date))
      : pickLineup(squad, formation, date).filter(Boolean);
    if (lineupPlayers.length < 11) lineupPlayers = pickLineup(squad, formation, date).filter(Boolean);
    const lineup = lineupPlayers.map((p) => p.id);
    const bench = pickBench(squad, lineup, date, 12);
    const players = Object.fromEntries([...lineup, ...bench].map((id) => [id, snapshot(world.players[id], date, 'balanced')]));
    return {
      id: teamId, name: country?.name_es || fifa, nameEn: country?.name_en || fifa, short: country?.name_es || fifa, color: country?.color || '#333',
      kit: country?.kit || null, crest: country?.flag || null, national: true, formation, lineup, bench, players,
      tactics: user ? { ...career.national.tactics } : styleTactics('balanced'), style: 'balanced',
    };
  }
  const club = world.clubs[teamId];
  const plan = planFor(career, teamId);
  const squad = clubSquad(world, teamId);
  const user = teamId === career.clubId;
  const formation = user ? career.tactics.formation : club.formation;
  let lineup;
  if (user && !career.autoLineup && career.lineup?.length === 11) {
    lineup = career.lineup.map((id) => world.players[id]).filter((p) => p && p.clubId === teamId && !isInjured(p, date) && !(p.susp > 0)).map((p) => p.id);
    if (lineup.length < 11) {
      const fill = pickLineup(squad.filter((p) => !lineup.includes(p.id)), formation, date, plan);
      const slots = FORMATIONS[formation].map(([pos]) => pos);
      // Keep the manager's choices in their slots, fill gaps with the best fits.
      const ordered = career.lineup.map((id, i) => (lineup.includes(id) ? id : null));
      for (let i = 0; i < 11; i += 1) if (!ordered[i]) {
        const candidate = squad.filter((p) => !ordered.includes(p.id) && !isInjured(p, date) && !(p.susp > 0))
          .sort((a, b) => dynamicOvr(b, date, plan) * positionFit(b, slots[i]) - dynamicOvr(a, date, plan) * positionFit(a, slots[i]))[0];
        ordered[i] = candidate?.id || fill[i]?.id || null;
      }
      lineup = ordered.filter(Boolean);
    }
  } else {
    lineup = pickLineup(squad, formation, date, plan).filter(Boolean).map((p) => p.id);
  }
  const maxBench = career.year >= 2020 ? 9 : 7;
  const bench = user && !career.autoLineup && career.bench?.length
    ? career.bench.filter((id) => world.players[id]?.clubId === teamId && !lineup.includes(id) && !isInjured(world.players[id], date) && !(world.players[id].susp > 0)).slice(0, maxBench)
    : pickBench(squad, lineup, date, maxBench, plan);
  const players = Object.fromEntries([...lineup, ...bench].map((id) => [id, snapshot(world.players[id], date, plan)]));
  return {
    id: teamId, name: club.name, short: club.short, color: club.color, crest: club.crest, formation, lineup, bench, players,
    // CPU clubs play to their identity: possession, direct, counter, pressing or balanced.
    tactics: user ? { ...career.tactics } : styleTactics(club.style), style: club.style || 'balanced',
  };
}

export function createFixtureMatch(career, fixture, userSide) {
  const season = career.season;
  const comp = season.comps[fixture.comp];
  const home = teamSheet(career, fixture.home, fixture.date);
  const away = teamSheet(career, fixture.away, fixture.date);
  return createMatch({
    id: fixture.id, seed: career.seed, date: fixture.date, comp: { id: fixture.comp, type: comp?.type || 'friendly', stage: fixture.stage, name: comp?.name || null },
    home, away, userSide, neutral: Boolean(fixture.neutral), knockout: Boolean(fixture.ko), aggregate: aggregateFor(season, fixture),
    maxSubs: career.year >= 2020 ? 5 : 3, allowExtraTime: true,
    // The CPU opponent: difficulty and AI behaviour chosen by the manager (FC 27 style).
    cpu: { level: career.cpu?.level || 'professional', behaviour: career.cpu?.behaviour || 'dynamic' },
    // The clock runs faster than the play, as in EA FC: about twenty minutes a match at 1x.
    clockRate: MATCH_CLOCK_RATE,
  });
}

/* ── Quick simulation of fixtures nobody watches ── */

function quickTeam(career, teamId, date) {
  if (isNation(teamId)) {
    const s = nationStrength(career.world, teamId.slice(2), date);
    return { strength: s, lineup: null };
  }
  const club = career.world.clubs[teamId];
  const plan = planFor(career, teamId);
  const squad = clubSquad(career.world, teamId);
  const lineup = pickLineup(squad, club.formation, date, plan);
  const filled = lineup.map((p, i) => (p ? { ...p, ovrNow: dynamicOvr(p, date, plan) } : { pos: FORMATIONS[club.formation][i][0], alt: [], ovr: 40, ovrNow: 40 }));
  const missing = lineup.filter((p) => !p).length;
  const mentality = club.style === 'counter' ? 'defensive' : 'balanced';
  return { strength: strengthFromLineup(filled, club.formation, { mentality, missing }), lineup, formation: club.formation, squad };
}

const SCORER = { GK: 0.01, CB: 0.3, RB: 0.38, LB: 0.38, RWB: 0.55, LWB: 0.55, CDM: 0.5, CM: 1.1, CAM: 2.4, RM: 1.6, LM: 1.6, RW: 3, LW: 3, ST: 5 };
const ASSIST = { GK: 0.05, CB: 0.25, RB: 1, LB: 1, RWB: 1.4, LWB: 1.4, CDM: 0.8, CM: 1.8, CAM: 2.8, RM: 2.1, LM: 2.1, RW: 2.3, LW: 2.3, ST: 1.3 };

/** Player-level consequences for a quick-simulated club side. */
function attribute(random, team, goals, conceded, side, deep) {
  if (!deep || !team.lineup) return { participants: [], scorers: [] };
  const slots = FORMATIONS[team.formation].map(([pos]) => pos);
  const starters = team.lineup.map((p, i) => (p ? { p, slot: slots[i] } : null)).filter(Boolean);
  const benchPool = team.squad.filter((p) => !team.lineup.includes(p) && !p.injury && !(p.susp > 0) && p.pos !== 'GK').sort((a, b) => b.ovr - a.ovr).slice(0, 5);
  const subsCount = Math.min(benchPool.length, 2 + Math.floor(random() * 3));
  const participants = starters.map(({ p, slot }) => ({ id: p.id, slot, minutes: 90, goals: 0, assists: 0, yc: 0, rc: 0, rating: 6.3, injury: null }));
  const outfield = participants.filter((x) => x.slot !== 'GK');
  for (let i = 0; i < subsCount; i += 1) {
    const out = outfield[outfield.length - 1 - i];
    if (!out) break;
    const minute = 58 + Math.floor(random() * 30);
    out.minutes = minute;
    participants.push({ id: benchPool[i].id, slot: out.slot, minutes: 90 - minute, goals: 0, assists: 0, yc: 0, rc: 0, rating: 6.3, injury: null });
  }
  const scorers = [];
  const byId = Object.fromEntries(team.squad.map((p) => [p.id, p]));
  for (let g = 0; g < goals; g += 1) {
    const scorer = weighted(random, participants, (x) => SCORER[x.slot] * (x.minutes / 90) * Math.pow((byId[x.id]?.attrs?.sho ?? 60) / 70, 2));
    scorer.goals += 1; scorer.rating += 1.1;
    let assist = null;
    if (random() < 0.74) {
      assist = weighted(random, participants.filter((x) => x !== scorer), (x) => ASSIST[x.slot] * (x.minutes / 90) * Math.pow((byId[x.id]?.attrs?.pas ?? 60) / 70, 2.5));
      if (assist) { assist.assists += 1; assist.rating += 0.6; }
    }
    scorers.push({ p: scorer.id, a: assist?.id || null, m: 1 + Math.floor(random() * 90), s: side });
  }
  for (const x of participants) {
    if (random() < 0.075) { x.yc = 1; x.rating -= 0.35; }
    if (random() < 0.004) { x.rc = 1; x.rating -= 1.6; }
    if (x.minutes > 0 && random() < 0.009) x.injury = random() < 0.6 ? 'light' : random() < 0.82 ? 'medium' : 'severe';
    const diff = goals - conceded;
    x.rating += (diff > 0 ? 0.3 : diff < 0 ? -0.25 : 0) + (random() - 0.5) * 0.9;
    if (conceded === 0 && ['GK', 'CB', 'RB', 'LB', 'RWB', 'LWB'].includes(x.slot)) x.rating += 0.5;
    if (x.slot === 'GK') x.rating -= conceded * 0.25;
    x.rating = Math.round(clamp(x.rating, 4, 10) * 10) / 10;
  }
  scorers.sort((a, b) => a.m - b.m);
  return { participants, scorers };
}

export function simulateQuick(career, fixture) {
  const season = career.season;
  const date = fixture.date;
  const home = quickTeam(career, fixture.home, date);
  const away = quickTeam(career, fixture.away, date);
  const deep = (id) => !isNation(id) && career.deepLeagues.includes(career.world.clubs[id]?.leagueId);
  const result = quickResult({
    seed: career.seed, id: fixture.id, home: home.strength, away: away.strength, neutral: Boolean(fixture.neutral),
    knockout: Boolean(fixture.ko), aggregate: aggregateFor(season, fixture), detail: true,
  });
  const random = result.random;
  const homeOut = attribute(random, home, result.hg, result.ag, 'home', deep(fixture.home));
  const awayOut = attribute(random, away, result.ag, result.hg, 'away', deep(fixture.away));
  const scorers = [...homeOut.scorers, ...awayOut.scorers].sort((a, b) => a.m - b.m);
  recordResult(season, fixture.id, { hg: result.hg, ag: result.ag, pens: result.pens, et: result.extraTime, ev: scorers.length ? scorers : null, xg: [result.xgHome, result.xgAway] });
  const comp = season.comps[fixture.comp];
  for (const [teamId, out, scored, conceded] of [[fixture.home, homeOut, result.hg, result.ag], [fixture.away, awayOut, result.ag, result.hg]]) {
    if (!out.participants.length) continue;
    applyParticipation(career, teamId, out.participants.map((x) => ({ ...x, scored, conceded })), comp, fixture, random);
  }
  return season.fixtures[fixture.id];
}

/**
 * What a match leaves on the players: stats, fitness, form, cards, injuries,
 * and suspensions served by everyone who was banned for it.
 */
export function applyParticipation(career, teamId, participants, comp, fixture, random) {
  const world = career.world;
  const date = fixture.date;
  const plan = planFor(career, teamId);
  const isClub = !isNation(teamId);
  const league = comp?.type === 'league';
  const played = new Set(participants.map((x) => x.id));
  for (const x of participants) {
    const p = world.players[x.id];
    if (!p) continue;
    const stats = isClub ? (p.stats ||= {}) : (p.natStats ||= {});
    stats.apps = (stats.apps || 0) + 1;
    stats.mins = (stats.mins || 0) + x.minutes;
    stats.g = (stats.g || 0) + x.goals;
    stats.a = (stats.a || 0) + x.assists;
    stats.yc = (stats.yc || 0) + x.yc;
    stats.rc = (stats.rc || 0) + x.rc;
    stats.rs = +((stats.rs || 0) + x.rating).toFixed(1);
    if (x.motm) stats.motm = (stats.motm || 0) + 1;
    if (league && isClub) { stats.lg = (stats.lg || 0) + x.goals; stats.la = (stats.la || 0) + x.assists; stats.lapps = (stats.lapps || 0) + 1; }
    if (x.conceded === 0 && x.minutes >= 60 && ['GK', 'CB', 'RB', 'LB', 'RWB', 'LWB'].includes(x.slot)) {
      stats.cs = (stats.cs || 0) + 1;
      if (league && x.slot === 'GK') stats.lcs = (stats.lcs || 0) + 1;
    }
    const before = energyAt(p, date, plan);
    const cost = x.energyEnd != null ? before - x.energyEnd : (x.slot === 'GK' ? 12 : 30 + Math.max(0, p.age - 29)) * x.minutes / 90;
    p.energy = quantize(clamp(before - Math.max(0, cost), 5, 100), 1);
    p.energyDate = date;
    p.form = quantize(clamp((p.form || 0) * 0.68 + (x.rating - 6.6) * 1.15, -3, 3), 2);
    p.morale = quantize(clamp((p.morale ?? 65) + (x.minutes >= 60 ? 1.2 : 0.4) + (x.scored > x.conceded ? 1.5 : x.scored < x.conceded ? -1.5 : 0), 5, 100), 1);
    if (x.rc) p.susp = (p.susp || 0) + (x.rcStraight ? 2 : 1);
    if (x.yc && isClub) {
      p.yc = (p.yc || 0) + x.yc;
      if (p.yc >= 5) { p.yc = 0; p.susp = (p.susp || 0) + 1; }
    }
    if (x.injury) {
      const injury = rollInjury(random || createStream(career.seed, 'inj', fixture.id, x.id), x.injury);
      p.injury = { name: injury.name, severity: injury.severity, until: addDays(date, injury.days), since: date };
      p.form = quantize(clamp(p.form - 0.6, -3, 3), 2);
      if (teamId === career.clubId) career.flags.injuryNews = [...(career.flags.injuryNews || []), p.id];
    }
  }
  // Suspensions are served in the next match the team plays.
  if (isClub) {
    for (const p of clubSquad(world, teamId)) {
      if (!played.has(p.id) && p.susp > 0 && !participants.some((x) => x.id === p.id && x.rc)) p.susp -= 1;
      if (!played.has(p.id)) p.form = quantize((p.form || 0) * 0.92, 2);
    }
  }
}

/** Fold a finished interactive match into the season and the world. */
export function applyLiveMatch(career, fixture, match) {
  const season = career.season;
  const scorers = match.events.filter((e) => e.type === 'goal').map((e) => ({ p: e.player, a: e.assist, m: e.minute, s: e.side, k: e.kind }));
  const cards = match.events.filter((e) => e.type === 'card').map((e) => ({ p: e.player, c: e.card, m: e.minute, s: e.side }));
  recordResult(season, fixture.id, {
    hg: match.score.home, ag: match.score.away, pens: match.pens ? { home: match.pens.home, away: match.pens.away } : null,
    et: match.period >= 2, ev: scorers, xg: [+match.stats.home.xg.toFixed(2), +match.stats.away.xg.toFixed(2)], motm: match.motm,
  });
  season.fixtures[fixture.id].cards = cards;
  season.fixtures[fixture.id].stats = { home: match.stats.home, away: match.stats.away, possession: match.possession };
  const comp = season.comps[fixture.comp];
  for (const side of ['home', 'away']) {
    const teamId = side === 'home' ? fixture.home : fixture.away;
    const isUser = teamId === career.clubId || (isNation(teamId) && career.national?.fifa === teamId.slice(2));
    const deep = isUser || (!isNation(teamId) && career.deepLeagues.includes(career.world.clubs[teamId]?.leagueId));
    if (!deep) continue;
    const participants = Object.values(match.players).filter((p) => p.side === side && p.minutes > 0).map((p) => ({
      id: p.id, slot: p.slot || p.pos, minutes: p.minutes, goals: p.goals, assists: p.assists, yc: p.yc ? Math.min(1, p.yc) : 0, rc: p.rc,
      rcStraight: p.rc && p.yc < 2, rating: p.rating, injury: p.injured, energyEnd: p.energy, motm: match.motm === p.id,
      scored: match.score[side], conceded: match.score[side === 'home' ? 'away' : 'home'],
    }));
    applyParticipation(career, teamId, participants, comp, fixture, createStream(career.seed, 'live-inj', fixture.id));
  }
  return season.fixtures[fixture.id];
}

/** The user's fixture, simulated instantly with the full engine. */
export function simulateUserInstant(career, fixture, userSide) {
  const match = playToEnd(createFixtureMatch(career, fixture, userSide));
  applyLiveMatch(career, fixture, match);
  return match;
}

export const lineOf = (pos) => POSITION_LINE[pos];
