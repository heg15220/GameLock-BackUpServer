/**
 * National teams.
 *
 * A nation's pool is every player of that nationality in the world. Many
 * nations have only a handful of players in the simulated leagues, so missing
 * slots are filled with a nominal level by reputation for CPU nations, and with
 * clearly labelled generated players when the manager coaches that nation.
 */
import { createStream, ageOn, clamp, iso } from './util.js';
import { pickLineup, dynamicOvr } from './world.js';
import { FORMATIONS, assignPositions, deriveAttributes, positionFit, POSITION_LINE } from './positions.js';
import { strengthFromLineup } from './match.js';
import { generateName } from './names.js';
import { marketValue } from './economy.js';

const FILLER_LEVEL = [56, 61, 66, 71, 75, 79];

export function nationsByConf(world) {
  const counts = {};
  for (const p of Object.values(world.players)) if (p.nat && !p.retired) counts[p.nat] = (counts[p.nat] || 0) + 1;
  const result = {};
  for (const country of Object.values(world.countries)) {
    const conf = country.confederation;
    if (!conf || conf === 'OFC') continue;
    if ((counts[country.fifa] || 0) < 3 && (country.international_reputation ?? 0) < 1) continue;
    (result[conf] ||= []).push(country.fifa);
  }
  return result;
}

const poolCache = new WeakMap();

/** Players of a nationality, best first. Indexed once per world and month. */
export function nationPool(world, fifa, month = '') {
  let entry = poolCache.get(world);
  if (!entry || entry.month !== month || entry.count !== Object.keys(world.players).length) {
    const byNat = new Map();
    for (const p of Object.values(world.players)) {
      if (!p.nat || p.retired || p.age > 39) continue;
      if (!byNat.has(p.nat)) byNat.set(p.nat, []);
      byNat.get(p.nat).push(p);
    }
    for (const list of byNat.values()) list.sort((a, b) => b.ovr - a.ovr);
    entry = { month, byNat, count: Object.keys(world.players).length };
    poolCache.set(world, entry);
  }
  return entry.byNat.get(fifa) || [];
}

export function invalidateNationPools(world) { poolCache.delete(world); }

const cache = new WeakMap();

/** Line strengths of a nation's best eleven, cached per world month. */
export function nationStrength(world, fifa, date) {
  let byWorld = cache.get(world);
  if (!byWorld) { byWorld = new Map(); cache.set(world, byWorld); }
  const key = `${fifa}:${date.slice(0, 7)}`;
  if (byWorld.has(key)) return byWorld.get(key);
  const country = world.countries[fifa];
  const filler = FILLER_LEVEL[clamp(country?.international_reputation ?? 1, 0, 5)];
  const pool = nationPool(world, fifa, date.slice(0, 7)).slice(0, 60);
  const lineup = pickLineup(pool, '4-3-3', date).map((p) => (p ? { ...p, ovrNow: dynamicOvr(p, date) } : { ovr: filler, ovrNow: filler, pos: null, alt: [] }));
  const fixed = lineup.map((p, i) => (p.pos ? p : { ...p, pos: FORMATIONS['4-3-3'][i][0] }));
  const strength = strengthFromLineup(fixed, '4-3-3');
  strength.overall = Math.round(fixed.reduce((total, p) => total + p.ovrNow, 0) / fixed.length);
  byWorld.set(key, strength);
  return strength;
}

export function nationRating(world, fifa, date) {
  return nationStrength(world, fifa, date).overall;
}

/**
 * Generated players so a coached nation can always name a full squad: two per
 * line short, three goalkeepers. They "play abroad" in leagues the game does not
 * simulate and are marked as generated.
 */
export function ensureNationalFillers(world, fifa, seed, year) {
  const country = world.countries[fifa];
  invalidateNationPools(world);
  const pool = nationPool(world, fifa);
  const need = { GK: 3, DF: 8, MF: 8, FW: 6 };
  const have = { GK: 0, DF: 0, MF: 0, FW: 0 };
  for (const p of pool) have[POSITION_LINE[p.pos]] += 1;
  const level = FILLER_LEVEL[clamp(country?.international_reputation ?? 1, 0, 5)];
  const added = [];
  for (const line of ['GK', 'DF', 'MF', 'FW']) {
    for (let i = have[line]; i < need[line]; i += 1) {
      const random = createStream(seed, 'nat-filler', fifa, line, i);
      const { pos, alt } = assignPositions(line, random);
      const age = 22 + Math.floor(random() * 11);
      const ovr = Math.round(clamp(level - 4 + random() * 8, 45, 85));
      const player = {
        id: `nat-${fifa}-${line}-${i}`, name: generateName(random, fifa, country?.confederation), nat: fifa,
        born: iso(year - age, 1 + Math.floor(random() * 12), 1 + Math.floor(random() * 28)), pos, alt, ovr, pot: ovr + Math.floor(random() * 3),
        clubId: null, real: false, generated: 'national', foot: random() < 0.25 ? 'L' : 'R', growth: 'steady',
        energy: 100, energyDate: iso(year, 7, 1), form: 0, morale: 72, injury: null, susp: 0, yc: 0, stats: {}, number: 0,
        contractEnd: year + 2, wage: 0,
      };
      player.age = ageOn(player, iso(year, 7, 1));
      player.attrs = deriveAttributes(player, random);
      player.value = marketValue({ ...player, contractYears: 2 }, year);
      world.players[player.id] = player;
      added.push(player.id);
    }
  }
  return added;
}

/** Best squad of 26 (or 23) for a nation: positional balance, then quality. */
export function autoCallUp(world, fifa, date, size = 26) {
  invalidateNationPools(world);
  const pool = nationPool(world, fifa, date.slice(0, 7)).filter((p) => !(p.injury && p.injury.until > date));
  const sorted = pool.slice().sort((a, b) => dynamicOvr(b, date) - dynamicOvr(a, date));
  const picked = [];
  const quota = { GK: 3, DF: Math.round(size * 0.3), MF: Math.round(size * 0.3), FW: size - 3 - 2 * Math.round(size * 0.3) };
  for (const line of ['GK', 'DF', 'MF', 'FW']) {
    picked.push(...sorted.filter((p) => POSITION_LINE[p.pos] === line).slice(0, quota[line]));
  }
  for (const p of sorted) if (picked.length < size && !picked.includes(p)) picked.push(p);
  return picked.slice(0, size).map((p) => p.id);
}

export function nationalLineup(world, squadIds, formation, date) {
  const squad = squadIds.map((id) => world.players[id]).filter(Boolean);
  return pickLineup(squad, formation, date).map((p) => p?.id || null);
}

export const fitOf = positionFit;
