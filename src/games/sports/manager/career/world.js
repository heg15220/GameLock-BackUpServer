import { getManagerWorld } from '../data.js';
import { createStream, clamp, ageOn, daysBetween, hash01, iso, mean } from './util.js';
import { assignPositions, deriveAttributes, FORMATIONS, positionFit, POSITION_LINE, secondaryFor } from './positions.js';
import { KNOWN_POSITIONS, positionFromNumber } from './known-positions.js';
import { marketValue, stadiumCapacity } from './economy.js';

export const GROWTH_PROFILES = ['early', 'standard', 'late', 'steady', 'explosive', 'durable'];

/** Spanish names of the domestic cups we can name; anything else gets a generic name. */
const CUP_NAMES = {
  'esp-copa-del-rey': 'Copa del Rey', 'eng-fa-cup': 'FA Cup', 'ger-dfb-pokal': 'DFB-Pokal', 'ita-coppa-italia': 'Coppa Italia',
  'fra-coupe-de-france': 'Coupe de France', 'por-taca-de-portugal': 'Taça de Portugal', 'ned-knvb-cup': 'Copa KNVB',
  'tur-copa-turquia': 'Copa de Turquía', 'bra-copa-do-brasil': 'Copa do Brasil', 'arg-copa-argentina': 'Copa Argentina',
  'usa-us-open': 'US Open Cup', 'col-copa-colombia': 'Copa Colombia', 'chi-copa-chile': 'Copa Chile', 'uru-copa-uruguay': 'Copa Uruguay',
  'ecu-copa-ecuador': 'Copa Ecuador', 'par-copa-paraguay': 'Copa Paraguay', 'bol-copa-bolivia': 'Copa Bolivia', 'ven-copa-venezuela': 'Copa Venezuela',
  'mex-copa-mx': 'Copa MX', 'supercopa-guatemala': 'Copa de Guatemala', 'slv-copa-presidente': 'Copa Presidente', 'copa-primera-de-nicaragua': 'Copa de Nicaragua',
};

export function cupName(cupId, country, lang = 'es') {
  if (CUP_NAMES[cupId]) return CUP_NAMES[cupId];
  const name = lang === 'es' ? country?.name_es : country?.name_en;
  return lang === 'es' ? `Copa de ${name || 'la Liga'}` : `${name || 'National'} Cup`;
}

const isExternal = (club) => String(club.competitionId || '').startsWith('external:');

/**
 * Build the mutable career world from the historical selection of a year.
 * Everything the season changes (club, rating, contract, form, fitness…) lives
 * on these records; the archive itself is never mutated.
 */
export function buildWorld(year, seed) {
  const source = getManagerWorld(Number(year));
  const startDate = iso(year, 7, 1);
  const countries = {};
  for (const country of source.countries || []) countries[country.fifa] = country;

  const leagues = {};
  for (const competition of source.competitions) {
    if (competition.simulated === false) continue;
    leagues[competition.id] = {
      id: competition.id, name: competition.name, country: competition.country_fifa_code, conf: competition.confederation,
      tier: competition.tier || 1, strength: competition.strength ?? 0, logo: competition.logo || null,
      trophy: competition.trophy || null, cupTrophy: competition.cupTrophy || null, cupId: competition.domesticCupId || null,
      selectable: competition.selectable !== false, clubIds: [],
    };
  }

  const clubs = {};
  for (const club of source.clubs) {
    const league = leagues[club.competitionId] || null;
    const random = createStream(seed, 'club', club.id);
    clubs[club.id] = {
      id: club.id, name: club.name, short: club.shortName || club.name, abbr: club.abbreviation || club.name.slice(0, 3).toUpperCase(),
      color: club.color || '#2c4a6e', crest: club.crest || null, leagueId: league ? league.id : null,
      country: club.country || league?.country || String(club.competitionId || '').replace('external:', '') || null,
      rep: club.international_reputation ?? 1, domRep: club.domestic_reputation ?? 1, rating: club.rating || 60,
      budget: Math.max(150000, Math.round(club.budget || 1e6)), external: isExternal(club) || !league,
      selectable: club.selectable !== false && Boolean(league?.selectable),
      formation: ['4-3-3', '4-2-3-1', '4-4-2', '4-3-3', '3-5-2', '4-1-2-1-2'][Math.floor(random() * 6)],
      style: ['balanced', 'possession', 'direct', 'counter', 'pressing'][Math.floor(random() * 5)],
      youthFocus: random() < 0.3,
    };
    if (league) league.clubIds.push(club.id);
  }

  const players = {};
  for (const base of source.players) {
    if (base.retired || base.emergency) continue;
    const random = createStream(seed, 'player', base.id);
    // Real position when known, the shirt number as a hint otherwise.
    const known = KNOWN_POSITIONS.get(base.name);
    const hinted = !known && positionFromNumber(base.position, base.shirtNumber);
    const drawn = assignPositions(base.position, random);
    const pos = known && (POSITION_LINE[known.pos] === base.position || base.position !== 'GK') ? known.pos : hinted || drawn.pos;
    const alt = known && pos === known.pos ? known.alt : hinted ? secondaryFor(hinted, random) : drawn.alt;
    const born = base.birthDate || `${base.birthYear || year - 25}-${String(1 + Math.floor(random() * 12)).padStart(2, '0')}-${String(1 + Math.floor(random() * 28)).padStart(2, '0')}`;
    const player = {
      id: base.id, name: base.name, nat: base.nationality || null, born, pos, alt,
      ovr: base.rating, pot: Math.max(base.rating, base.potential || base.rating), clubId: base.clubId || null,
      real: Boolean(base.real), foot: known?.foot || (['LB', 'LWB', 'LM', 'LW'].includes(pos) ? (random() < 0.68 ? 'L' : 'R') : random() < 0.17 ? 'L' : 'R'),
      growth: GROWTH_PROFILES[Math.floor(random() * GROWTH_PROFILES.length)],
      energy: 100, energyDate: startDate, form: 0, morale: 68 + Math.round(random() * 14),
      injury: null, susp: 0, yc: 0, stats: {}, number: 0,
    };
    player.age = ageOn(player, startDate);
    player.attrs = deriveAttributes(player, random);
    const years = 1 + Math.floor(random() * (player.age > 31 ? 2 : 5));
    player.contractEnd = year + years;
    player.wage = Math.max(300, Math.round(base.wage || 1000));
    player.value = marketValue({ ...player, contractYears: years }, year);
    players[player.id] = player;
  }

  for (const club of Object.values(clubs)) {
    club.capacity = stadiumCapacity(club);
    club.playerIds = [];
  }
  for (const player of Object.values(players)) {
    if (player.clubId && clubs[player.clubId]) clubs[player.clubId].playerIds.push(player.id);
    else player.clubId = null;
  }
  for (const club of Object.values(clubs)) {
    club.formation = bestFormation(club.playerIds.map((id) => players[id]), club.formation);
    assignNumbers(club, players);
    const wages = club.playerIds.reduce((total, id) => total + players[id].wage, 0);
    club.wageBudget = Math.round(wages * 1.08);
    club.balance = Math.round(club.budget * 2.2);
    club.rating = Math.round(squadStrength(club.playerIds.map((id) => players[id])) || club.rating);
  }

  return { year: Number(year), clubs, leagues, players, countries, coverage: source.coverage || null };
}

export function assignNumbers(club, players) {
  const used = new Set();
  const list = club.playerIds.map((id) => players[id]).sort((a, b) => b.ovr - a.ovr);
  const preferred = { GK: [1, 13, 25], CB: [4, 5, 3, 15, 24], RB: [2, 22, 12], LB: [3, 18, 12], RWB: [2, 22], LWB: [3, 18],
    CDM: [6, 16, 5], CM: [8, 14, 16, 20], CAM: [10, 20, 21], RM: [7, 17], LM: [11, 17], RW: [7, 17, 19], LW: [11, 19, 17], ST: [9, 19, 21, 29] };
  for (const player of list) if (player.number && !used.has(player.number)) used.add(player.number);
  for (const player of list) {
    if (player.number && used.has(player.number) && list.filter((p) => p.number === player.number).length === 1) continue;
    const choice = (preferred[player.pos] || []).find((n) => !used.has(n)) ?? Array.from({ length: 98 }, (_, i) => i + 2).find((n) => !used.has(n));
    player.number = choice;
    used.add(choice);
  }
}

/* ── Fitness, form and the dynamic rating (FC 27's three pillars) ── */

export const RECOVERY_PER_DAY = { recovery: 17, balanced: 13, intensive: 9 };

export function energyAt(player, date, plan = 'balanced') {
  const days = Math.max(0, daysBetween(player.energyDate || date, date));
  return clamp(player.energy + days * (RECOVERY_PER_DAY[plan] || 13), 0, 100);
}

export function isInjured(player, date) {
  return Boolean(player.injury && player.injury.until > date);
}

export function fitnessLabel(player, date, plan) {
  if (isInjured(player, date)) return 'injured';
  const energy = energyAt(player, date, plan);
  return energy >= 92 ? 'peak' : energy >= 78 ? 'good' : energy >= 60 ? 'low' : 'unfit';
}

/** Dynamic rating: base OVR moved by form and morale, penalised when unready. */
export function dynamicOvr(player, date, plan) {
  const energy = energyAt(player, date, plan);
  const form = clamp(player.form || 0, -3, 3);
  const morale = clamp(((player.morale ?? 65) - 62) / 14, -2.5, 1.5);
  const fitness = energy >= 80 ? 0 : (80 - energy) / 6;
  return Math.round(clamp(player.ovr + form + morale - fitness, 20, 99));
}

export function moraleLabel(morale) {
  return morale >= 82 ? 'very-high' : morale >= 66 ? 'high' : morale >= 48 ? 'normal' : morale >= 30 ? 'low' : 'very-low';
}

/** The shape that gets the most out of a squad (ties keep the current one). */
export function bestFormation(squad, current = '4-3-3') {
  let best = current;
  let bestScore = -Infinity;
  for (const formation of Object.keys(FORMATIONS)) {
    const slots = FORMATIONS[formation];
    const lineup = pickLineup(squad, formation, null);
    const score = lineup.reduce((total, p, i) => total + (p ? p.ovr * positionFit(p, slots[i][0]) : 30), 0) + (formation === current ? 0.5 : 0);
    if (score > bestScore) { bestScore = score; best = formation; }
  }
  return best;
}

/** Strength of a squad: mean of a positional best eleven. */
export function squadStrength(squad, formation = '4-3-3') {
  const lineup = pickLineup(squad, formation, null);
  return mean(lineup.filter(Boolean), (p) => p.ovr);
}

/**
 * Greedy best eleven for a formation: fill the hardest slots first with the
 * best-fitting available player. `date` excludes injured and suspended players.
 */
export function pickLineup(squad, formation = '4-3-3', date = null, plan = 'balanced') {
  const slots = FORMATIONS[formation] || FORMATIONS['4-3-3'];
  const available = squad.filter((p) => p && (!date || (!isInjured(p, date) && !(p.susp > 0))));
  const base = new Map(available.map((p) => [p.id, date ? dynamicOvr(p, date, plan) - (energyAt(p, date, plan) < 62 ? 6 : 0) : p.ovr]));
  const score = (p, slot) => base.get(p.id) * positionFit(p, slot);
  const result = new Array(slots.length).fill(null);
  const used = new Set();
  const order = slots.map((slot, i) => i).sort((a, b) => (slots[a][0] === 'GK' ? -1 : slots[b][0] === 'GK' ? 1 : 0));
  for (const i of order) {
    let best = null;
    let bestScore = -Infinity;
    for (const p of available) {
      if (used.has(p.id)) continue;
      const s = score(p, slots[i][0]);
      if (s > bestScore) { bestScore = s; best = p; }
    }
    if (best) { result[i] = best; used.add(best.id); }
  }
  // Greedy filling can strand a star (two right wingers, one slot); a few
  // passes of pairwise swaps and bench swaps fix the obvious cases.
  const misplaced = result.some((p, i) => p && positionFit(p, slots[i][0]) < 0.95);
  for (let pass = 0; misplaced && pass < 3; pass += 1) {
    let improved = false;
    for (let i = 0; i < result.length; i += 1) {
      for (let j = i + 1; j < result.length; j += 1) {
        const a = result[i];
        const b = result[j];
        if (!a || !b) continue;
        const now = score(a, slots[i][0]) + score(b, slots[j][0]);
        const swapped = score(b, slots[i][0]) + score(a, slots[j][0]);
        if (swapped > now + 0.01) { result[i] = b; result[j] = a; improved = true; }
      }
    }
    for (let i = 0; i < result.length; i += 1) {
      for (const p of available) {
        if (used.has(p.id) || !result[i]) continue;
        if (score(p, slots[i][0]) > score(result[i], slots[i][0]) + 0.01) {
          used.delete(result[i].id); result[i] = p; used.add(p.id); improved = true;
        }
      }
    }
    // Bring a reserve into slot i, move the starter of i to slot j, drop j.
    for (const p of available) {
      if (used.has(p.id)) continue;
      for (let i = 0; i < result.length; i += 1) {
        if (positionFit(p, slots[i][0]) < 0.97) continue;
        for (let j = 0; j < result.length; j += 1) {
          if (i === j || !result[i] || !result[j]) continue;
          const now = score(result[i], slots[i][0]) + score(result[j], slots[j][0]);
          const moved = score(p, slots[i][0]) + score(result[i], slots[j][0]);
          if (moved > now + 0.01) {
            used.delete(result[j].id);
            result[j] = result[i];
            result[i] = p;
            used.add(p.id);
            improved = true;
            break;
          }
        }
        if (used.has(p.id)) break;
      }
    }
    if (!improved) break;
  }
  return result;
}

export function pickBench(squad, lineupIds, date, size = 9, plan = 'balanced') {
  const used = new Set(lineupIds);
  const pool = squad.filter((p) => !used.has(p.id) && !isInjured(p, date) && !(p.susp > 0))
    .sort((a, b) => dynamicOvr(b, date, plan) - dynamicOvr(a, date, plan));
  const keeper = pool.find((p) => p.pos === 'GK');
  const outfield = pool.filter((p) => p.pos !== 'GK');
  const bench = [];
  if (keeper) bench.push(keeper);
  // A bench covers every line before it doubles up.
  for (const line of ['DF', 'MF', 'FW']) {
    const candidate = outfield.find((p) => POSITION_LINE[p.pos] === line && !bench.includes(p));
    if (candidate && bench.length < size) bench.push(candidate);
  }
  for (const p of outfield) if (bench.length < size && !bench.includes(p)) bench.push(p);
  return bench.map((p) => p.id);
}

export function clubSquad(world, clubId) {
  return (world.clubs[clubId]?.playerIds || []).map((id) => world.players[id]).filter(Boolean);
}

/** Expected league finish rank from squad strength - the board's yardstick. */
export function expectedRank(world, clubId) {
  const league = world.leagues[world.clubs[clubId]?.leagueId];
  if (!league) return 1;
  const ranked = league.clubIds.slice().sort((a, b) => world.clubs[b].rating - world.clubs[a].rating);
  return ranked.indexOf(clubId) + 1;
}

export const stableNoise = (...parts) => hash01(...parts) - 0.5;
