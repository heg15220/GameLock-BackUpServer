/**
 * Scouting network and youth academy.
 *
 * What you know about a player depends on who has watched him: players in
 * your league and the famous are known; everyone else is a range until a
 * scout files a report. Reports follow FC 27's four blocks - fit, future,
 * cost and willingness - written in plain language by texts.js.
 */
import { createStream, clamp, addDays, roundMoney, weighted, daysBetween } from './util.js';
import { generateName } from './names.js';
import { generateYouth } from './development.js';
import { clubSquad, dynamicOvr, assignNumbers } from './world.js';
import { POSITION_LINE } from './positions.js';
import { askingPrice, playerInterest, roleExpected, wageDemand } from './transfers.js';
import { addInbox } from './inbox.js';
import { ledger } from './transfers.js';
import { moneyScale } from './economy.js';

export const REGIONS = ['UEFA', 'CONMEBOL', 'CONCACAF', 'AFC', 'CAF'];

export function scoutCandidates(career, count = 6) {
  const random = createStream(career.seed, 'scout-market', career.year, career.scouting.hired);
  return Array.from({ length: count }, (_, i) => {
    const exp = 1 + Math.floor(random() * 5);
    const judgment = clamp(exp + Math.floor(random() * 3) - 1, 1, 5);
    const region = REGIONS[Math.floor(random() * REGIONS.length)];
    return {
      id: `scout-${career.year}-${career.scouting.hired}-${i}`, name: generateName(random, null, region), exp, judgment, region,
      wage: roundMoney((600 + exp * 700 + judgment * 900) * moneyScale(career.year)),
    };
  });
}

export function hireScout(career, candidate) {
  if (career.scouting.scouts.length >= 4) return { error: 'full' };
  career.scouting.scouts.push({ ...candidate, missionId: null });
  career.scouting.hired += 1;
  return { ok: true };
}

export function fireScout(career, scoutId) {
  career.scouting.scouts = career.scouting.scouts.filter((s) => s.id !== scoutId);
  career.scouting.missions = career.scouting.missions.filter((m) => m.scoutId !== scoutId);
  return { ok: true };
}

/** Send a scout: region, line, age profile, months. */
export function startMission(career, { scoutId, region, line = null, age = 'any', months = 1 }) {
  const scout = career.scouting.scouts.find((s) => s.id === scoutId);
  if (!scout || scout.missionId) return { error: 'busy' };
  const id = `mission-${career.serial.missions += 1}`;
  const mission = { id, scoutId, region, line, age, start: career.date, end: addDays(career.date, months * 30), next: addDays(career.date, 7), found: [] };
  career.scouting.missions.push(mission);
  scout.missionId = id;
  return { mission };
}

export function cancelMission(career, missionId) {
  const mission = career.scouting.missions.find((m) => m.id === missionId);
  if (!mission) return { error: 'missing' };
  const scout = career.scouting.scouts.find((s) => s.id === mission.scoutId);
  if (scout) scout.missionId = null;
  career.scouting.missions = career.scouting.missions.filter((m) => m.id !== missionId);
  return { ok: true };
}

function regionOf(career, player) {
  const club = career.world.clubs[player.clubId];
  const league = career.world.leagues[club?.leagueId];
  return league?.conf || career.world.countries[player.nat]?.confederation || null;
}

export function progressScouting(career) {
  for (const mission of career.scouting.missions.slice()) {
    if (mission.next > career.date) continue;
    const scout = career.scouting.scouts.find((s) => s.id === mission.scoutId);
    if (!scout) continue;
    const random = createStream(career.seed, mission.id, mission.next);
    const myRating = career.world.clubs[career.clubId].rating;
    const pool = Object.values(career.world.players).filter((p) => !p.retired && p.clubId !== career.clubId && !p.generated
      && !mission.found.includes(p.id) && (!mission.line || POSITION_LINE[p.pos] === mission.line)
      && (mission.age === 'young' ? p.age <= 21 : mission.age === 'prime' ? p.age >= 22 && p.age <= 29 : mission.age === 'veteran' ? p.age >= 30 : true)
      && (mission.region === 'world' || regionOf(career, p) === mission.region || career.world.countries[p.nat]?.confederation === mission.region));
    // Better scouts find players who would actually improve the squad.
    const picks = [];
    for (let i = 0; i < 1 + Math.floor(random() * 2) + (scout.exp >= 4 ? 1 : 0) && pool.length; i += 1) {
      const choice = weighted(random, pool, (p) => {
        const quality = mission.age === 'young' ? p.pot - myRating + 12 : p.ovr - myRating + 10;
        return Math.max(0.2, quality) ** (1 + scout.exp * 0.3) * (p.value < career.finances.transferBudget * 1.4 ? 1.3 : 0.6);
      });
      pool.splice(pool.indexOf(choice), 1);
      picks.push(choice);
    }
    for (const p of picks) {
      mission.found.push(p.id);
      writeReport(career, p, scout);
    }
    if (picks.length) addInbox(career, { kind: 'scout-report', mission: mission.id, scout: scout.id, players: picks.map((p) => p.id) });
    mission.next = addDays(mission.next, 7);
    if (mission.next > mission.end) {
      scout.missionId = null;
      career.scouting.missions = career.scouting.missions.filter((m) => m.id !== mission.id);
      addInbox(career, { kind: 'mission-done', scout: scout.id, count: mission.found.length });
    }
  }
}

/** A report with ranges whose width depends on the scout's judgment. */
export function writeReport(career, player, scout = { judgment: 3, name: '' }) {
  const random = createStream(career.seed, 'report', player.id, career.date);
  const spread = Math.max(0, 6 - scout.judgment);
  const off = Math.round((random() - 0.5) * spread);
  const ovrLo = clamp(player.ovr - spread + off, 30, 99);
  const potOff = Math.round((random() - 0.5) * spread * 1.5);
  const potLo = clamp(player.pot - spread - 1 + potOff, ovrLo, 99);
  const squad = clubSquad(career.world, career.clubId);
  const sameLine = squad.filter((p) => POSITION_LINE[p.pos] === POSITION_LINE[player.pos]).sort((a, b) => b.ovr - a.ovr);
  const rank = sameLine.filter((p) => p.ovr > player.ovr).length + 1;
  const interest = playerInterest(career, player);
  const role = roleExpected(career, player);
  career.scouting.reports[player.id] = {
    date: career.date, scout: scout.name, judgment: scout.judgment,
    ovr: [ovrLo, clamp(ovrLo + spread * 2, ovrLo, 99)], pot: [potLo, clamp(potLo + spread * 2 + 2, potLo, 99)],
    rank, lineSize: sameLine.length + 1, role, interest,
    fee: player.clubId ? askingPrice(career, player) : 0, wage: roundMoney(wageDemand(career, player, role, interest)),
    verdict: player.ovr >= (sameLine[0]?.ovr ?? 0) ? 'starter' : player.pot >= career.world.clubs[career.clubId].rating + 4 && player.age <= 21 ? 'future' : rank <= 3 ? 'depth' : 'not-needed',
  };
  return career.scouting.reports[player.id];
}

/** How precisely the interface may show a player's level. */
export function knowledge(career, player) {
  if (!player) return null;
  const report = career.scouting.reports[player.id];
  const mine = player.clubId === career.clubId;
  const sameLeague = career.world.clubs[player.clubId]?.leagueId && career.world.clubs[player.clubId]?.leagueId === career.world.clubs[career.clubId]?.leagueId;
  if (mine) return { exact: true, ovr: [player.ovr, player.ovr], pot: [player.pot, player.pot], report: null };
  if (report) return { exact: report.ovr[0] === report.ovr[1], ovr: report.ovr, pot: report.pot, report };
  if (sameLeague || (player.real && player.ovr >= 78) || career.national?.fifa === player.nat) {
    const lo = Math.max(player.ovr - 3, 30);
    return { exact: true, ovr: [player.ovr, player.ovr], pot: [Math.max(player.ovr, player.pot - 4), Math.min(99, player.pot + 2)], report: null, potRange: true };
  }
  const random = createStream(career.seed, 'fog', player.id, career.year);
  const lo = clamp(player.ovr - 3 - Math.floor(random() * 3), 30, 99);
  return { exact: false, ovr: [lo, clamp(lo + 6, lo, 99)], pot: null, report: null };
}

/* ── Youth academy ── */

export function youthScoutCandidates(career, count = 5) {
  const random = createStream(career.seed, 'youth-scout-market', career.year, career.academy.hired);
  const countries = Object.values(career.world.countries).filter((c) => c.confederation && c.confederation !== 'OFC')
    .sort((a, b) => (b.international_reputation ?? 0) - (a.international_reputation ?? 0)).slice(0, 40);
  return Array.from({ length: count }, (_, i) => {
    const quality = 1 + Math.floor(random() * 5);
    const country = countries[Math.floor(random() * countries.length)];
    return { id: `yscout-${career.year}-${career.academy.hired}-${i}`, name: generateName(random, country.fifa, country.confederation), quality, country: country.fifa,
      wage: roundMoney((400 + quality * 650) * moneyScale(career.year)), next: null };
  });
}

export function hireYouthScout(career, candidate, country = candidate.country) {
  if (career.academy.scouts.length >= 3) return { error: 'full' };
  career.academy.scouts.push({ ...candidate, country, next: addDays(career.date, 30) });
  career.academy.hired += 1;
  return { ok: true };
}

export function progressAcademy(career) {
  const club = career.world.clubs[career.clubId];
  for (const scout of career.academy.scouts) {
    if (!scout.next || scout.next > career.date) continue;
    scout.next = addDays(career.date, 30);
    const country = career.world.countries[scout.country];
    const random = createStream(career.seed, 'youth-find', scout.id, career.date);
    const count = 1 + (random() < 0.35 ? 1 : 0);
    const found = [];
    for (let i = 0; i < count; i += 1) {
      const quality = clamp(club.rating - 14 + scout.quality * 3 + (country?.international_reputation ?? 1) * 2, 40, 82);
      const youth = generateYouth(career, { clubId: null, country: scout.country, conf: country?.confederation, age: 15 + Math.floor(random() * 2), quality, key: `aca-${scout.id}-${career.date}-${i}` });
      career.academy.prospects.unshift({ ...youth, scoutId: scout.id, foundOn: career.date });
      found.push(youth.id);
    }
    career.academy.prospects = career.academy.prospects.slice(0, 12);
    addInbox(career, { kind: 'youth-report', scout: scout.id, players: found });
  }
  // Academy players grow every month with the first team.
  for (const youth of career.academy.players) {
    const random = createStream(career.seed, 'aca-dev', youth.id, career.date.slice(0, 7));
    youth.prog = (youth.prog || 0) + (youth.pot - youth.ovr) * 0.035 + (random() - 0.4) * 0.3;
    while (youth.prog >= 1) { youth.prog -= 1; youth.ovr = Math.min(youth.pot, youth.ovr + 1); }
  }
}

export function signProspect(career, prospectId) {
  const index = career.academy.prospects.findIndex((p) => p.id === prospectId);
  if (index < 0) return { error: 'missing' };
  if (career.academy.players.length >= 14) return { error: 'full' };
  const [youth] = career.academy.prospects.splice(index, 1);
  career.academy.players.push({ ...youth, joinedAcademy: career.date });
  return { ok: true };
}

export function dismissProspect(career, prospectId) {
  career.academy.prospects = career.academy.prospects.filter((p) => p.id !== prospectId);
  return { ok: true };
}

export function releaseYouth(career, youthId) {
  career.academy.players = career.academy.players.filter((p) => p.id !== youthId);
  return { ok: true };
}

/** Promote an academy player to the first team on a modest contract. */
export function promoteYouth(career, youthId) {
  const index = career.academy.players.findIndex((p) => p.id === youthId);
  if (index < 0) return { error: 'missing' };
  const [youth] = career.academy.players.splice(index, 1);
  const club = career.world.clubs[career.clubId];
  const player = { ...youth, clubId: club.id, contractEnd: career.year + 3, joined: career.date, role: 'prospect', energyDate: career.date };
  delete player.scoutId; delete player.foundOn; delete player.joinedAcademy;
  career.world.players[player.id] = player;
  club.playerIds.push(player.id);
  assignNumbers(club, career.world.players);
  return { ok: true, player };
}

export function academyAge(career, youth) {
  return youth.age;
}

export const daysSince = (career, date) => daysBetween(date, career.date);
export { dynamicOvr };
