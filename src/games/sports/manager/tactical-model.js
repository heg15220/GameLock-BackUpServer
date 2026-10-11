import { pickWeighted } from '../trayectoria/rng.js';

export const TACTICAL_OPTIONS = Object.freeze({
  width: ['narrow', 'balanced', 'wide'], passing: ['short', 'mixed', 'direct'],
  tempo: ['low', 'balanced', 'high'], defensiveLine: ['low', 'balanced', 'high'],
  transition: ['hold', 'balanced', 'counter'], ballLoss: ['regroup', 'balanced', 'counterpress'],
});
export const TACTICAL_DEFAULTS = Object.freeze({ width: 'balanced', passing: 'mixed', tempo: 'balanced',
  defensiveLine: 'balanced', transition: 'balanced', ballLoss: 'balanced' });
export const TACTICAL_KEYS = Object.freeze(Object.keys(TACTICAL_OPTIONS));
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

/** Missing instructions in an older career mean the neutral defaults. */
export function normalizeTacticalInstructions(tactics = {}) {
  return Object.fromEntries(TACTICAL_KEYS.map((key) => [key, tactics[key] ?? TACTICAL_DEFAULTS[key]]));
}
export function validateTacticalInstructions(tactics = {}) {
  return !!tactics && TACTICAL_KEYS.every((key) => tactics[key] === undefined || TACTICAL_OPTIONS[key].includes(tactics[key]));
}

/** Original simulation estimates: no licensed attribute set or universal bonus. */
export function tacticalMatchup(attacking, defending, attackQuality, defenseQuality, attackCondition, defenseCondition, recentLoss = false) {
  const attack = normalizeTacticalInstructions(attacking), defense = normalizeTacticalInstructions(defending);
  const readiness = clamp(0.45 + defenseCondition / 180, 0.5, 1);
  let pressure = ({ low: 0.18, balanced: 0.4, high: 0.65 }[defending.pressing || 'balanced'])
    + ({ low: -0.09, balanced: 0, high: 0.11 }[defense.defensiveLine]);
  if (recentLoss) pressure += defense.ballLoss === 'counterpress' ? 0.22 : defense.ballLoss === 'regroup' ? -0.15 : 0;
  pressure = clamp(pressure * readiness * clamp(defenseQuality / 78, 0.65, 1.15));
  const space = clamp(({ low: 0.2, balanced: 0.46, high: 0.77 }[defense.defensiveLine])
    + (recentLoss ? defense.ballLoss === 'counterpress' ? 0.13 : defense.ballLoss === 'regroup' ? -0.13 : 0 : 0)
    + Math.max(0, 75 - defenseCondition) / 180);
  const crowded = defense.defensiveLine === 'low' && attack.width === 'narrow';
  const interception = clamp(({ short: 0.025, mixed: 0.05, direct: 0.13 }[attack.passing])
    + pressure * (attack.passing === 'direct' ? 0.025 : 0.09)
    + ({ low: -0.009, balanced: 0, high: 0.025 }[attack.tempo])
    + Math.max(0, 75 - attackQuality) * 0.0015 + Math.max(0, 70 - attackCondition) * 0.001
    + (attack.width === 'wide' && attack.passing === 'short' ? 0.012 : 0) + (crowded ? 0.017 : 0), 0.018, 0.36);
  const threat = ({ low: 0.82, balanced: 1, high: 1.22 }[attack.tempo])
    * ({ short: 0.92, mixed: 1, direct: 1.16 }[attack.passing]);
  const quality = (attack.passing === 'direct' ? (space - 0.46) * 0.085 : attack.passing === 'short' ? (attackQuality - 72) * 0.0011 - pressure * 0.013 : 0)
    + (attack.tempo === 'high' ? -0.015 - Math.max(0, 75 - attackQuality) * 0.001 : attack.tempo === 'low' ? 0.009 : 0)
    + (crowded ? -0.016 : attack.width === 'wide' ? -0.008 : 0);
  return { pressure, space, interception, threat, quality,
    counterChance: clamp(({ hold: 0.06, balanced: 0.4, counter: 0.77 }[attack.transition])
      * (defense.ballLoss === 'regroup' ? 0.78 : 1) * clamp(attackCondition / 85, 0.55, 1.1), 0.025, 0.88),
    cornerChance: attack.width === 'wide' ? 0.12 : attack.width === 'narrow' ? 0.065 : 0.09 };
}

/** Route endpoints are actual players; short play favors nearby positional lines. */
export function planPassRoute({ random, ids, players, carrierId, tactics, counter = false }) {
  const instructions = normalizeTacticalInstructions(tactics);
  const direct = counter || instructions.passing === 'direct';
  const length = counter ? 2 + Number(random() < 0.3) : direct ? 2 + Number(random() < 0.22)
    : instructions.passing === 'short' ? 3 + Math.floor(random() * 3) : 2 + Math.floor(random() * 3);
  const route = [carrierId];
  const rank = { GK: 0, DF: 1, MF: 2, FW: 3 };
  for (let i = 1; i < length; i += 1) {
    const previous = route.at(-1);
    const candidates = ids.filter((id) => id !== previous && (players[id].position !== 'GK' || players[previous].position === 'DF'));
    if (!candidates.length) break;
    const fromRank = rank[players[previous].position];
    const receiver = pickWeighted(random, candidates, (id) => {
      const position = players[id].position;
      const distance = Math.abs(rank[position] - fromRank);
      const support = distance > 1 ? 0.18 : position === 'MF' ? 4 : position === 'DF' ? 2 : position === 'GK' ? 0.15 : 1.4;
      const directWeight = position === 'FW' ? 5 : position === 'MF' ? 2 : 0.12;
      return (direct && i === length - 1 ? directWeight : support) * (players[id].rating / 75) ** 2
        * (id === route.at(-2) ? 0.55 : 1);
    });
    if (!receiver) break;
    route.push(receiver);
  }
  return route;
}

export function tacticalEffort(tactics, { hasBall, recentLoss = false, counter = false }) {
  const instructions = normalizeTacticalInstructions(tactics);
  return 1 + (hasBall ? instructions.tempo === 'high' ? 0.18 : instructions.tempo === 'low' ? -0.12 : 0 : 0)
    + (recentLoss && instructions.ballLoss === 'counterpress' ? 0.2 : recentLoss && instructions.ballLoss === 'regroup' ? -0.04 : 0)
    + (!hasBall && instructions.defensiveLine === 'high' ? 0.06 : 0)
    + (hasBall && counter ? 0.12 : 0) + (hasBall && instructions.width === 'wide' ? 0.035 : 0);
}
