/**
 * Player development (FC 27 growth profiles): how fast a player grows, when
 * he peaks and how he declines. Monthly steps accumulate in `prog`; whole
 * points move the rating and every attribute with it.
 */
import { createStream, clamp, quantize, iso, ageOn, roundMoney } from './util.js';
import { assignPositions, deriveAttributes, ATTRIBUTE_KEYS, GK_ATTRIBUTE_KEYS } from './positions.js';
import { generateName } from './names.js';
import { marketValue, expectedWage } from './economy.js';
import { clubSquad, assignNumbers } from './world.js';

export const PEAK_AGE = { early: 24, standard: 27, late: 29, steady: 28, explosive: 23, durable: 30 };
const GROWTH_RATE = { early: 0.042, standard: 0.03, late: 0.022, steady: 0.026, explosive: 0.05, durable: 0.024 };
const DECLINE = { early: 1.25, standard: 1, late: 0.85, steady: 0.9, explosive: 1.35, durable: 0.6 };

function shiftAttributes(player, delta) {
  if (!player.attrs) return;
  const keys = player.pos === 'GK' ? GK_ATTRIBUTE_KEYS : ATTRIBUTE_KEYS;
  for (const key of keys) {
    // Pace fades first with age, physique last.
    const weight = delta < 0 && key === 'pac' && player.age > 29 ? 1.6 : delta < 0 && key === 'phy' ? 0.6 : 1;
    player.attrs[key] = clamp(Math.round((player.attrs[key] ?? player.ovr) + delta * weight), 15, 99);
  }
}

/** One month of development for every active player. */
export function monthlyDevelopment(career) {
  const date = career.date;
  for (const p of Object.values(career.world.players)) {
    if (p.retired) continue;
    p.age = ageOn(p, date);
    const random = createStream(career.seed, 'dev', p.id, date.slice(0, 7));
    const profile = p.growth || 'standard';
    const peak = PEAK_AGE[profile] + (p.pos === 'GK' ? 3 : 0);
    let delta = 0;
    if (p.age < peak) {
      const gap = Math.max(0, p.pot - p.ovr);
      const played = (p.stats?.mins || 0);
      const expectedMinutes = monthsIntoSeason(career) * 270;
      const minutesFactor = expectedMinutes > 0 ? clamp(0.55 + played / expectedMinutes * 0.75, 0.55, 1.35) : 1;
      const training = p.clubId === career.clubId ? ({ recovery: 0.9, balanced: 1, intensive: 1.18 }[career.training] || 1) : 1;
      const formBoost = 1 + clamp(p.form || 0, -3, 3) * 0.06;
      delta = gap * GROWTH_RATE[profile] * minutesFactor * training * formBoost + (random() - 0.45) * 0.25;
      if (p.age <= 23 && (p.form || 0) > 1.8 && random() < 0.08) p.pot = Math.min(99, p.pot + 1);
    } else if (p.age > peak + 1) {
      delta = -(0.07 + (p.age - peak - 1) * 0.045) * DECLINE[profile] + (random() - 0.5) * 0.12;
    } else {
      delta = (random() - 0.5) * 0.18;
    }
    if (p.injury && p.injury.severity === 'severe' && p.injury.until > date) delta -= 0.15;
    p.prog = quantize((p.prog || 0) + delta, 3);
    while (p.prog >= 1) { p.prog = quantize(p.prog - 1, 3); if (p.ovr < 99) { p.ovr += 1; shiftAttributes(p, 1); } }
    while (p.prog <= -1) { p.prog = quantize(p.prog + 1, 3); if (p.ovr > 30) { p.ovr -= 1; shiftAttributes(p, -1); } }
    if (p.ovr > p.pot) p.pot = p.ovr;
    if (p.age >= peak + 2 && p.pot > p.ovr) p.pot = Math.max(p.ovr, p.pot - 1);
  }
}

function monthsIntoSeason(career) {
  const [y, m] = career.date.split('-').map(Number);
  const months = (y - career.year) * 12 + m - 7;
  return clamp(months, 1, 11);
}

/** A generated youngster for a club (academy graduate or regen). */
export function generateYouth(career, { clubId = null, country, conf, age = 17, quality = 60, key = '' }) {
  const random = createStream(career.seed, 'youth', key || `${clubId}:${career.date}:${country}`);
  const line = ['GK', 'DF', 'DF', 'DF', 'MF', 'MF', 'MF', 'FW', 'FW'][Math.floor(random() * 9)];
  const { pos, alt } = assignPositions(line, random);
  const wonder = random() < 0.035;
  const pot = Math.round(clamp(quality + 4 + random() * 14 + (wonder ? 12 : 0), 45, 95));
  const ovr = Math.round(clamp(pot - 18 - random() * 10 + (age - 16) * 2, 38, pot));
  const year = career.year;
  const player = {
    id: `y-${key || `${clubId}-${career.date}`}-${Math.floor(random() * 1e6).toString(36)}`, name: generateName(random, country, conf), nat: country,
    born: iso(year - age + (career.date.slice(5) < '07-01' ? 1 : 0), 1 + Math.floor(random() * 12), 1 + Math.floor(random() * 28)),
    pos, alt, ovr, pot, clubId, real: false, generated: 'youth', foot: random() < 0.24 ? 'L' : 'R',
    growth: ['early', 'standard', 'late', 'steady', 'explosive', 'durable'][Math.floor(random() * 6)],
    energy: 100, energyDate: career.date, form: 0, morale: 74, injury: null, susp: 0, yc: 0, stats: {}, number: 0,
    contractEnd: year + 3, wage: 0,
  };
  player.age = ageOn(player, career.date);
  player.attrs = deriveAttributes(player, random);
  player.wage = Math.max(300, roundMoney(expectedWage(player, career.world.clubs[clubId]?.rep ?? 1, year, 'prospect') * 0.6));
  player.value = marketValue({ ...player, contractYears: 3 }, year);
  return player;
}

/**
 * Summer: contracts end, veterans retire, AI clubs renew who they want and
 * promote youngsters so every squad starts the season with enough players.
 */
export function seasonTurnover(career) {
  const world = career.world;
  const endYear = career.year + 1; // the season that just finished ends in June of this year
  const retired = [];
  const freed = [];
  for (const p of Object.values(world.players)) {
    if (p.retired) continue;
    const random = createStream(career.seed, 'turnover', p.id, endYear);
    const age = ageOn(p, `${endYear}-07-01`);
    const limit = p.pos === 'GK' ? 36 : 34;
    const retireChance = age >= 40 ? 1 : age >= limit ? (age - limit + 1) * 0.2 - (p.ovr >= 84 ? 0.25 : 0) : 0;
    if (!p.clubId && age >= 32 && random() < 0.5) {
      p.retired = true; retired.push(p.id);
      continue;
    }
    if (retireChance > 0 && random() < retireChance) {
      p.retired = true;
      retired.push(p.id);
      if (p.clubId && world.clubs[p.clubId]) world.clubs[p.clubId].playerIds = world.clubs[p.clubId].playerIds.filter((id) => id !== p.id);
      continue;
    }
    if (p.loan && p.loan.until <= `${endYear}-06-30`) {
      const home = world.clubs[p.loan.from];
      if (home) {
        world.clubs[p.clubId].playerIds = world.clubs[p.clubId].playerIds.filter((id) => id !== p.id);
        p.clubId = home.id; home.playerIds.push(p.id);
      }
      p.loan = null; p.loanWageShare = undefined;
    }
    if (p.clubId && p.contractEnd <= endYear && !p.generated) {
      if (p.clubId === career.clubId) {
        freed.push(p.id);
      } else {
        const club = world.clubs[p.clubId];
        const squad = clubSquad(world, club.id).sort((a, b) => b.ovr - a.ovr);
        const keep = squad.indexOf(p) < 18 && age <= 33 && random() < 0.78;
        if (keep || club.external) { p.contractEnd = endYear + 1 + Math.floor(random() * 3); p.wage = roundMoney(p.wage * 1.05); continue; }
        freed.push(p.id);
      }
      const club = world.clubs[p.clubId];
      if (club) club.playerIds = club.playerIds.filter((id) => id !== p.id);
      p.clubId = null;
    } else if (p.clubId && p.contractEnd <= endYear) {
      p.contractEnd = endYear + 2;
    }
  }
  // Every simulated squad starts with 22: free agents first, then youngsters.
  const freeAgents = Object.values(world.players).filter((p) => !p.clubId && !p.retired && !p.generated).sort((a, b) => b.ovr - a.ovr);
  const regens = [];
  for (const club of Object.values(world.clubs)) {
    if (club.external || club.id === career.clubId) continue;
    const squad = clubSquad(world, club.id);
    let missing = Math.max(0, 22 - squad.length);
    if (squad.filter((p) => p.pos === 'GK').length < 2) missing = Math.max(missing, 1);
    for (let i = 0; i < missing; i += 1) {
      const fit = freeAgents.findIndex((p) => p.ovr <= club.rating + 2 && p.ovr >= club.rating - 10);
      if (fit >= 0 && i % 2 === 0) {
        const p = freeAgents.splice(fit, 1)[0];
        p.clubId = club.id; p.contractEnd = endYear + 1 + (p.age > 30 ? 0 : 1);
        p.wage = roundMoney(Math.max(500, p.wage * 0.85));
        club.playerIds.push(p.id);
        continue;
      }
      const league = world.leagues[club.leagueId];
      const youth = generateYouth(career, { clubId: club.id, country: club.country, conf: league?.conf, age: 17 + (i % 3), quality: club.rating - 12, key: `regen-${club.id}-${endYear}-${i}` });
      world.players[youth.id] = youth;
      club.playerIds.push(youth.id);
      regens.push(youth.id);
    }
    assignNumbers(club, world.players);
  }
  return { retired, freed, regens };
}
