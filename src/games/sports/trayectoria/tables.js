/**
 * Balance tables for Trayectoria.
 *
 * The model rests on one variable: `delta` = your OVR minus the level of the squad
 * around you. Squad level is not an average of anyone real - it is a fixed ladder
 * indexed by the club's international reputation. Delta then drives role, minutes,
 * goals, assists, awards and who comes looking for you.
 *
 * Four places where we deliberately diverge from the genre's usual model are marked
 * OUR CALL, with the reasoning.
 */

export const START_AGE = 16;
export const RETIREMENT_AGE = 40;
export const START_OVR = 50;
export const START_VALUE = 100000;
export const MIN_OVR = 40;
export const MAX_OVR = 99;
/** At this OVR a small club is treated as one rung more reputable. */
export const ELITE_OVR = 90;

export const POSITIONS = {
  POR: { group: "keeper", line: "keeper" },
  DFC: { group: "defensive", line: "defence" },
  LI: { group: "support", line: "defence" },
  LD: { group: "support", line: "defence" },
  MCD: { group: "defensive", line: "midfield" },
  MC: { group: "support", line: "midfield" },
  MI: { group: "creator", line: "midfield" },
  MD: { group: "creator", line: "midfield" },
  MCO: { group: "creator", line: "midfield" },
  EI: { group: "forward", line: "attack" },
  ED: { group: "forward", line: "attack" },
  DC: { group: "forward", line: "attack" },
};

export const DEVELOPMENT_PROFILES = ["early", "normal", "late"];
export const PROFILE_WEIGHTS = { early: 0.1, normal: 0.8, late: 0.1 };

/**
 * OVR delta drawn per two-year cycle, keyed by the age the cycle targets. The draw is
 * uniform inside the range and then split across the two seasons.
 *
 * Keepers get their own column: they keep improving to 28 and decay far more slowly,
 * which is the one place where real football careers genuinely differ by position.
 */
export const DEVELOPMENT = {
  early: {
    18: [7, 16], 20: [6, 16], 22: [4, 10], 24: [0, 7], 26: [-2, 1], 28: [-2, -1],
    30: [-2, 0], 32: [-4, 0], 34: [-6, -1], 36: [-8, -2], 38: [-10, -3],
  },
  normal: {
    18: [4, 14], 20: [3, 14], 22: [2, 10], 24: [1, 8], 26: [0, 3], 28: [-1, 0],
    30: [-1, 0], 32: [-3, 0], 34: [-5, -1], 36: [-7, -2], 38: [-10, -3],
  },
  late: {
    18: [2, 12], 20: [1, 12], 22: [1, 9], 24: [2, 9], 26: [1, 5], 28: [0, 1],
    30: [0, 1], 32: [-2, 0], 34: [-5, -1], 36: [-7, -2], 38: [-10, -3],
  },
  keeper: {
    18: [2, 10], 20: [2, 10], 22: [2, 9], 24: [2, 8], 26: [1, 7], 28: [1, 5],
    30: [0, 0], 32: [-1, 0], 34: [-2, 0], 36: [-4, -1], 38: [-6, -2],
  },
};

export const DEVELOPMENT_AGES = [18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38];

/**
 * From the cycle targeting 24 onwards, a player who is not getting minutes draws
 * development twice and keeps the worse roll.
 *
 * OUR CALL #1: the mechanic stays - it is what turns a bad club choice at 23 into a
 * permanent ceiling, and that is a true thing about football. What changes is that we
 * surface it: `DEVELOPMENT_WARNING_AGE` drives an explicit warning in the development
 * panel. A trap you can see coming is a decision; one you cannot is just a gotcha.
 */
export const DOUBLE_ROLL_FROM_AGE = 24;
export const DEVELOPMENT_WARNING_AGE = 22;
export const DOUBLE_ROLL_ROLES = ["rotacion_baja", "suplente"];

/** OVR the squad around you is assumed to have, by club international reputation. */
export const SQUAD_LEVEL = [58, 68, 75, 80, 84, 88];

export const ROLES = ["titular", "rotacion_alta", "rotacion_baja", "suplente"];

/** Delta -> role, and the matches that role is worth over a season. */
export const ROLE_BANDS = [
  { role: "titular", minDelta: 0, matches: [40, 50] },
  { role: "rotacion_alta", minDelta: -4, matches: [25, 39] },
  { role: "rotacion_baja", minDelta: -8, matches: [15, 24] },
  { role: "suplente", minDelta: -Infinity, matches: [5, 14] },
];

/** Keepers rotate far less: you are the keeper or you are not. */
export const KEEPER_ROLE_BANDS = [
  { role: "titular", minDelta: -2, matches: [38, 48] },
  { role: "rotacion_alta", minDelta: -6, matches: [18, 30] },
  { role: "rotacion_baja", minDelta: -10, matches: [6, 15] },
  { role: "suplente", minDelta: -Infinity, matches: [0, 4] },
];

/** Fewer competitions to play in a small club means fewer matches. */
export const CLUB_MATCH_MULTIPLIER = [0.7, 0.78, 0.86, 0.92, 0.96, 1.0];

/** Seven delta bands; band 0 is the big fish in the small pond. */
export function deltaBand(delta) {
  if (delta >= 10) return 0;
  if (delta >= 6) return 1;
  if (delta >= 2) return 2;
  if (delta >= -2) return 3;
  if (delta >= -6) return 4;
  if (delta >= -10) return 5;
  return 6;
}

/** Goals per match, by position group and delta band. */
export const GOAL_RATE = {
  forward: [1.10, 0.85, 0.65, 0.50, 0.30, 0.15, 0.05],
  creator: [0.85, 0.60, 0.45, 0.30, 0.20, 0.10, 0.05],
  support: [0.15, 0.10, 0.08, 0.05, 0.02, 0.0, 0.0],
  defensive: [0.10, 0.08, 0.06, 0.04, 0.02, 0.0, 0.0],
  keeper: [0, 0, 0, 0, 0, 0, 0],
};

/** Assists per match. The creator leads here, as they should. */
export const ASSIST_RATE = {
  forward: [0.40, 0.30, 0.22, 0.15, 0.10, 0.05, 0.02],
  creator: [0.60, 0.45, 0.32, 0.22, 0.14, 0.07, 0.03],
  support: [0.35, 0.26, 0.18, 0.12, 0.07, 0.03, 0.01],
  defensive: [0.15, 0.10, 0.07, 0.04, 0.02, 0.01, 0.0],
  keeper: [0, 0, 0, 0, 0, 0, 0],
};

/** Strong sides attack more, so the same player scores more in them. */
export const CLUB_OUTPUT_MULTIPLIER = [0.55, 0.68, 0.80, 0.92, 1.06, 1.20];

/** Absolute quality still counts for something, from x0.60 at 65 to x1.10 at 95. */
export function qualityMultiplier(ovr) {
  const clamped = Math.max(65, Math.min(95, ovr));
  return 0.6 + ((clamped - 65) / 30) * 0.5;
}

/** Per-season, independent rolls. Indexed by the reputation each trophy keys off. */
export const TITLE_ODDS = {
  league: { key: "domestic", odds: [0, 0.01, 0.05, 0.25, 0.45, 0.70] },
  cup: { key: "domestic", odds: [0.01, 0.04, 0.10, 0.25, 0.35, 0.40] },
  continental_a: { key: "continental", odds: [0, 0.005, 0.03, 0.15, 0.20, 0.30] },
  // Peaks at reputation 2: the clubs that actually contest the second-tier continental
  // cup. A reputation 4-5 side is in the main competition instead.
  continental_b: { key: "continental", odds: [0, 0.04, 0.12, 0.02, 0, 0] },
  club_world_cup: { key: "continental", odds: [0, 0, 0.005, 0.05, 0.10, 0.15] },
};

/** CONMEBOL sides reach the Club World Cup, but rarely win it. */
export const CLUB_WORLD_CUP_CONMEBOL = [0, 0, 0, 0.002, 0.005, 0];

/**
 * OUR CALL #2: the delta multiplier on titles is symmetric.
 *
 * The usual model only ever multiplies upward: being far better than your team helps
 * it win, being far worse costs it nothing. That makes "sign for the biggest club that
 * will have you and sit on the bench" the dominant strategy for silverware, which
 * hollows out every transfer decision in the game. A soft penalty is enough to make you
 * have to deserve it.
 */
export const TITLE_DELTA_MULTIPLIER = [
  { minDelta: 10, multiplier: 1.6 },
  { minDelta: 6, multiplier: 1.3 },
  { minDelta: 3, multiplier: 1.1 },
  { minDelta: -4, multiplier: 1.0 },
  { minDelta: -8, multiplier: 0.9 },
  { minDelta: -Infinity, multiplier: 0.75 },
];

/**
 * OUR CALL #3: a title counts as *earned* only if you were playing. Below that it still
 * goes in the cabinet, but greyed out and labelled - and the career summary counts the
 * two separately. You keep what the engine gave you; the trophy case just tells the
 * truth about it.
 */
export const EARNED_TITLE_ROLES = ["titular", "rotacion_alta"];

/** Second-tier leagues: winning is promotion, and here *you* are the difference. */
export const PROMOTION_ODDS = [
  { maxOvr: 64, odds: 0.03 },
  { maxOvr: 69, odds: 0.04 },
  { maxOvr: 74, odds: 0.06 },
  { maxOvr: 79, odds: 0.09 },
  { maxOvr: 84, odds: 0.13 },
  { maxOvr: 87, odds: 0.18 },
  { maxOvr: 89, odds: 0.25 },
  { maxOvr: 99, odds: 0.30 },
];

/** Only small top-flight clubs can go down, and a great player drags them clear. */
export function relegationOdds(ovr) {
  const raw = 0.05 + (0.10 * (1.1 - qualityMultiplier(ovr))) / 0.5;
  return Math.max(0.05, Math.min(0.10, raw));
}

/** Minimum OVR for a call-up, by the country's international reputation. */
export const CALLUP_THRESHOLD = [60, 70, 74, 78, 80, 83, 86];
export const WORLD_CUP_QUALIFY = [0.05, 0.5, 0.8, 1, 1, 1, 1];
export const CONTINENTAL_WIN = [0.005, 0.02, 0.05, 0.10, 0.20, 0.30, 0.80];
export const WORLD_CUP_WIN = [0.005, 0.005, 0.05, 0.08, 0.12, 0.18, 0.02];

/** Four-year cycles offset so the World Cup and the continental never collide. */
export const CONTINENTAL_CYCLE = (age) => (age - 17) % 4 === 0;
export const WORLD_CUP_CYCLE = (age) => (age - 19) % 4 === 0;
export const CLUB_WORLD_CUP_CYCLE = (age) => (age - 18) % 4 === 0;

/** Ballon d'Or odds by OVR band and what you won that season. */
export const BALLON_DOR = [
  { minOvr: 97, both: 1.0, continental: 1.0, league: 1.0, none: 1.0 },
  { minOvr: 94, both: 1.0, continental: 0.8, league: 0.65, none: 0.5 },
  { minOvr: 90, both: 0.6, continental: 0.4, league: 0.3, none: 0.2 },
  { minOvr: 85, both: 0.1, continental: 0.05, league: 0.01, none: 0 },
  { minOvr: 0, both: 0, continental: 0, league: 0, none: 0 },
];

export const BALLON_DOR_POSITION_MULTIPLIER = {
  forward: 1,
  creator: 1,
  support: 0.5,
  defensive: 0.25,
  keeper: 1, // judged on its own award
};

/** You only enter the conversation if you were actually playing. */
export const AWARD_ELIGIBLE_ROLES = ["titular", "rotacion_alta"];

/**
 * OUR CALL #4: the Golden Boot is global.
 *
 * Restricting it to one confederation contradicts the game's own goal model, which
 * rewards being a big fish in a small pond - you engineer 34 goals in Chile and are then
 * told they do not count. Instead every league is eligible and the odds scale with how
 * strong the league is, so the award reads as "how hard were those goals to score".
 */
export const GOLDEN_BOOT = [
  { minGoals: 50, odds: 1.0 },
  { minGoals: 40, odds: 0.5 },
  { minGoals: 30, odds: 0.25 },
];

/** League strength 0-5 -> weight applied to Golden Boot odds. */
export const LEAGUE_STRENGTH_WEIGHT = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

/** Who is allowed to look at you, by OVR. Weights feed a weighted pick. */
export const MARKET_RADIUS = [
  { maxOvr: 49, sameCountry: 0, sameConfederation: 0, global: 0 },
  { maxOvr: 72, sameCountry: 100, sameConfederation: 0, global: 0 },
  { maxOvr: 77, sameCountry: 0, sameConfederation: 100, global: 0 },
  { maxOvr: 82, sameCountry: 0, sameConfederation: 50, global: 50 },
  { maxOvr: 99, sameCountry: 0, sameConfederation: 0, global: 100 },
];

/** Market value by OVR, before the age multiplier. */
export const VALUE_BY_OVR = [
  { maxOvr: 55, value: 100000 },
  { maxOvr: 60, value: 250000 },
  { maxOvr: 65, value: 600000 },
  { maxOvr: 70, value: 1200000 },
  { maxOvr: 75, value: 2500000 },
  { maxOvr: 80, value: 6000000 },
  { maxOvr: 85, value: 15000000 },
  { maxOvr: 90, value: 40000000 },
  { maxOvr: 95, value: 80000000 },
  { maxOvr: 99, value: 150000000 },
];

/** The market stops paying you years before you stop performing. */
export const VALUE_AGE_MULTIPLIER = {
  21: 1.3, 22: 1.2, 23: 1.2, 24: 1.2, 25: 1.2, 26: 1.0, 27: 1.0, 28: 1.0,
  29: 0.9, 30: 0.8, 31: 0.75, 32: 0.7, 33: 0.65, 34: 0.6, 35: 0.2, 36: 0.15,
  37: 0.1, 38: 0.05, 39: 0.05, 40: 0.05,
};

/** How long a club tolerates you not playing before it lets you go. */
export const CAREER_MODES = {
  intensa: { seasonsPerStep: 1, personalEvents: [6, 7], benchLimit: 2, lowRotationLimit: 3 },
  normal: { seasonsPerStep: 2, personalEvents: [3, 4], benchLimit: 1, lowRotationLimit: 2 },
  expres: { seasonsPerStep: 3, personalEvents: [2, 3], benchLimit: 1, lowRotationLimit: 2 },
};

export function tableLookup(table, value, key = "maxOvr") {
  for (const row of table) {
    if (value <= row[key]) return row;
  }
  return table[table.length - 1];
}

export function multiplierFor(table, delta) {
  for (const row of table) {
    if (delta >= row.minDelta) return row.multiplier;
  }
  return 1;
}
