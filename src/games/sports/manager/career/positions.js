/**
 * Positions and formations.
 *
 * The archive only knows four lines (GK/DF/MF/FW). A manager game needs the
 * real vocabulary - a left back is not a centre back - so every player gets a
 * main position and up to two secondary ones, derived deterministically from
 * the archive line and the player's id. Coordinates are percentages of the
 * pitch: x from the left touchline, y from the own goal line towards the rival.
 */

export const POSITIONS = ['GK', 'RB', 'CB', 'LB', 'RWB', 'LWB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'ST'];

export const POSITION_LINE = {
  GK: 'GK', RB: 'DF', CB: 'DF', LB: 'DF', RWB: 'DF', LWB: 'DF',
  CDM: 'MF', CM: 'MF', CAM: 'MF', RM: 'MF', LM: 'MF',
  RW: 'FW', LW: 'FW', ST: 'FW',
};

export const POSITION_LABEL = {
  es: { GK: 'POR', RB: 'LD', CB: 'DFC', LB: 'LI', RWB: 'CAD', LWB: 'CAI', CDM: 'MCD', CM: 'MC', CAM: 'MCO', RM: 'MD', LM: 'MI', RW: 'ED', LW: 'EI', ST: 'DC' },
  en: { GK: 'GK', RB: 'RB', CB: 'CB', LB: 'LB', RWB: 'RWB', LWB: 'LWB', CDM: 'CDM', CM: 'CM', CAM: 'CAM', RM: 'RM', LM: 'LM', RW: 'RW', LW: 'LW', ST: 'ST' },
};

export const POSITION_NAME = {
  es: { GK: 'Portero', RB: 'Lateral derecho', CB: 'Central', LB: 'Lateral izquierdo', RWB: 'Carrilero derecho', LWB: 'Carrilero izquierdo', CDM: 'Mediocentro defensivo', CM: 'Centrocampista', CAM: 'Mediapunta', RM: 'Interior derecho', LM: 'Interior izquierdo', RW: 'Extremo derecho', LW: 'Extremo izquierdo', ST: 'Delantero centro' },
  en: { GK: 'Goalkeeper', RB: 'Right back', CB: 'Centre back', LB: 'Left back', RWB: 'Right wing-back', LWB: 'Left wing-back', CDM: 'Defensive midfielder', CM: 'Central midfielder', CAM: 'Attacking midfielder', RM: 'Right midfielder', LM: 'Left midfielder', RW: 'Right winger', LW: 'Left winger', ST: 'Striker' },
};

/** Pitch coordinates of each position's natural zone, used for fit distance. */
const ZONE = {
  GK: [50, 4], RB: [86, 26], CB: [50, 20], LB: [14, 26], RWB: [88, 40], LWB: [12, 40],
  CDM: [50, 36], CM: [50, 50], CAM: [50, 64], RM: [84, 54], LM: [16, 54], RW: [84, 74], LW: [16, 74], ST: [50, 82],
};

/**
 * How well a player plays out of position, 0.3-1. Distance between natural
 * zones, softened for listed secondary positions (FC 27: no penalty there).
 */
export function positionFit(player, slot) {
  if (!player) return 0;
  if (player.pos === slot) return 1;
  if (player.alt?.includes(slot)) return 0.97;
  if (player.pos === 'GK' || slot === 'GK') return 0.3;
  const [ax, ay] = ZONE[player.pos];
  const [bx, by] = ZONE[slot];
  const distance = Math.hypot((ax - bx) * 0.8, ay - by);
  return Math.max(0.55, 1 - distance / 115);
}

/** Formations: slot positions and coordinates, GK first. */
export const FORMATIONS = {
  '4-3-3': [
    ['GK', 50, 5], ['RB', 84, 25], ['CB', 61, 19], ['CB', 39, 19], ['LB', 16, 25],
    ['CM', 68, 47], ['CDM', 50, 39], ['CM', 32, 47], ['RW', 82, 73], ['ST', 50, 80], ['LW', 18, 73],
  ],
  '4-2-3-1': [
    ['GK', 50, 5], ['RB', 84, 25], ['CB', 61, 19], ['CB', 39, 19], ['LB', 16, 25],
    ['CDM', 61, 38], ['CDM', 39, 38], ['RM', 80, 60], ['CAM', 50, 60], ['LM', 20, 60], ['ST', 50, 80],
  ],
  '4-4-2': [
    ['GK', 50, 5], ['RB', 84, 25], ['CB', 61, 19], ['CB', 39, 19], ['LB', 16, 25],
    ['RM', 82, 50], ['CM', 60, 46], ['CM', 40, 46], ['LM', 18, 50], ['ST', 60, 78], ['ST', 40, 78],
  ],
  '4-1-2-1-2': [
    ['GK', 50, 5], ['RB', 84, 25], ['CB', 61, 19], ['CB', 39, 19], ['LB', 16, 25],
    ['CDM', 50, 36], ['CM', 68, 49], ['CM', 32, 49], ['CAM', 50, 62], ['ST', 61, 79], ['ST', 39, 79],
  ],
  '3-5-2': [
    ['GK', 50, 5], ['CB', 70, 20], ['CB', 50, 17], ['CB', 30, 20],
    ['RWB', 86, 45], ['CM', 64, 46], ['CDM', 50, 38], ['CM', 36, 46], ['LWB', 14, 45], ['ST', 60, 78], ['ST', 40, 78],
  ],
  '3-4-3': [
    ['GK', 50, 5], ['CB', 70, 20], ['CB', 50, 17], ['CB', 30, 20],
    ['RM', 84, 47], ['CM', 60, 44], ['CM', 40, 44], ['LM', 16, 47], ['RW', 78, 73], ['ST', 50, 80], ['LW', 22, 73],
  ],
  '5-3-2': [
    ['GK', 50, 5], ['RWB', 87, 32], ['CB', 68, 19], ['CB', 50, 16], ['CB', 32, 19], ['LWB', 13, 32],
    ['CM', 66, 46], ['CDM', 50, 40], ['CM', 34, 46], ['ST', 60, 76], ['ST', 40, 76],
  ],
  '4-5-1': [
    ['GK', 50, 5], ['RB', 84, 25], ['CB', 61, 19], ['CB', 39, 19], ['LB', 16, 25],
    ['RM', 82, 52], ['CM', 64, 47], ['CDM', 50, 40], ['CM', 36, 47], ['LM', 18, 52], ['ST', 50, 78],
  ],
  '4-1-4-1': [
    ['GK', 50, 5], ['RB', 84, 25], ['CB', 61, 19], ['CB', 39, 19], ['LB', 16, 25],
    ['CDM', 50, 36], ['RM', 82, 55], ['CM', 62, 50], ['CM', 38, 50], ['LM', 18, 55], ['ST', 50, 80],
  ],
  '4-4-1-1': [
    ['GK', 50, 5], ['RB', 84, 25], ['CB', 61, 19], ['CB', 39, 19], ['LB', 16, 25],
    ['RM', 82, 50], ['CM', 60, 45], ['CM', 40, 45], ['LM', 18, 50], ['CAM', 50, 66], ['ST', 50, 81],
  ],
  '4-2-2-2': [
    ['GK', 50, 5], ['RB', 84, 25], ['CB', 61, 19], ['CB', 39, 19], ['LB', 16, 25],
    ['CDM', 61, 38], ['CDM', 39, 38], ['CAM', 72, 62], ['CAM', 28, 62], ['ST', 60, 80], ['ST', 40, 80],
  ],
  '4-3-2-1': [
    ['GK', 50, 5], ['RB', 84, 25], ['CB', 61, 19], ['CB', 39, 19], ['LB', 16, 25],
    ['CM', 66, 46], ['CDM', 50, 39], ['CM', 34, 46], ['CAM', 64, 66], ['CAM', 36, 66], ['ST', 50, 81],
  ],
  '3-4-2-1': [
    ['GK', 50, 5], ['CB', 70, 20], ['CB', 50, 17], ['CB', 30, 20],
    ['RWB', 86, 47], ['CM', 60, 43], ['CM', 40, 43], ['LWB', 14, 47], ['CAM', 66, 66], ['CAM', 34, 66], ['ST', 50, 81],
  ],
  '5-4-1': [
    ['GK', 50, 5], ['RWB', 87, 30], ['CB', 68, 19], ['CB', 50, 16], ['CB', 32, 19], ['LWB', 13, 30],
    ['RM', 80, 50], ['CM', 60, 45], ['CM', 40, 45], ['LM', 20, 50], ['ST', 50, 78],
  ],
};

export const FORMATION_KEYS = Object.keys(FORMATIONS);

/** Archive line → detailed positions with weights; secondary positions by line. */
const LINE_SPLIT = {
  GK: [['GK', 1]],
  DF: [['CB', 0.5], ['RB', 0.2], ['LB', 0.2], ['RWB', 0.05], ['LWB', 0.05]],
  MF: [['CM', 0.36], ['CDM', 0.24], ['CAM', 0.2], ['RM', 0.1], ['LM', 0.1]],
  FW: [['ST', 0.5], ['RW', 0.25], ['LW', 0.25]],
};

const SECONDARY = {
  GK: [], CB: ['CDM', 'RB', 'LB'], RB: ['RWB', 'RM', 'CB'], LB: ['LWB', 'LM', 'CB'], RWB: ['RB', 'RM'], LWB: ['LB', 'LM'],
  CDM: ['CM', 'CB'], CM: ['CDM', 'CAM'], CAM: ['CM', 'ST', 'RW', 'LW'], RM: ['RW', 'CM', 'RB'], LM: ['LW', 'CM', 'LB'],
  RW: ['RM', 'ST', 'LW'], LW: ['LM', 'ST', 'RW'], ST: ['CAM', 'RW', 'LW'],
};

export function secondaryFor(pos, random) {
  const options = SECONDARY[pos] || [];
  const alt = [];
  if (options.length && random() < 0.72) alt.push(options[Math.floor(random() * options.length)]);
  if (options.length > 1 && random() < 0.25) {
    const second = options[Math.floor(random() * options.length)];
    if (!alt.includes(second)) alt.push(second);
  }
  return alt;
}

export function assignPositions(line, random) {
  const split = LINE_SPLIT[line] || LINE_SPLIT.MF;
  let roll = random();
  let pos = split[0][0];
  for (const [candidate, weight] of split) {
    roll -= weight;
    if (roll <= 0) { pos = candidate; break; }
  }
  const options = SECONDARY[pos];
  const alt = [];
  if (options.length && random() < 0.72) alt.push(options[Math.floor(random() * options.length)]);
  if (options.length > 1 && random() < 0.25) {
    const second = options[Math.floor(random() * options.length)];
    if (!alt.includes(second)) alt.push(second);
  }
  return { pos, alt };
}

/** Face attributes (FC style): pace, shooting, passing, dribbling, defending, physical. */
const ATTRIBUTE_PROFILE = {
  GK: [-30, -45, -20, -30, -40, -5],
  CB: [-6, -28, -12, -16, 4, 4],
  RB: [3, -20, -6, -4, -2, -2], LB: [3, -20, -6, -4, -2, -2],
  RWB: [5, -14, -3, 0, -6, -3], LWB: [5, -14, -3, 0, -6, -3],
  CDM: [-8, -12, 0, -4, 0, 3],
  CM: [-4, -4, 3, 0, -8, -2],
  CAM: [-1, 0, 4, 4, -26, -8],
  RM: [4, -5, 0, 2, -18, -6], LM: [4, -5, 0, 2, -18, -6],
  RW: [7, 0, -2, 5, -32, -8], LW: [7, 0, -2, 5, -32, -8],
  ST: [3, 5, -8, 0, -36, 2],
};
export const ATTRIBUTE_KEYS = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'];
export const GK_ATTRIBUTE_KEYS = ['div', 'han', 'kic', 'ref', 'spd', 'gkp'];

export function deriveAttributes(player, random) {
  const base = player.ovr;
  if (player.pos === 'GK') {
    return Object.fromEntries(GK_ATTRIBUTE_KEYS.map((key, i) => [key, Math.round(Math.max(20, Math.min(99,
      base + [1, 0, -6, 2, -14, 0][i] + (random() - 0.5) * 8)))]));
  }
  const profile = ATTRIBUTE_PROFILE[player.pos] || ATTRIBUTE_PROFILE.CM;
  const age = player.age ?? 25;
  return Object.fromEntries(ATTRIBUTE_KEYS.map((key, i) => {
    let value = base + profile[i] + (random() - 0.5) * 12;
    if (key === 'pac') value -= Math.max(0, age - 29) * 1.6;
    if (key === 'phy') value += Math.max(0, Math.min(age, 30) - 22) * 0.6;
    return [key, Math.round(Math.max(20, Math.min(99, value)))];
  }));
}
