/**
 * The CPU opponent, modelled on EA SPORTS FC 27's match AI.
 *
 * Three layers, as in the game:
 *
 * 1. Difficulty (Amateur … Legendary) sets four intelligence traits of the
 *    CPU side - attacking intelligence (how well it picks its options),
 *    defending intelligence (how well it reads lanes and covers), reaction
 *    speed (who gets to loose balls first) and marking & space (how tight it
 *    marks and closes down). "Professional" is neutral: both teams play with
 *    exactly the same brain.
 *
 * 2. CPU sliders, the FC 27 "CPU Opponent" settings: defending aggression,
 *    tackle and professional-foul frequency, build-up speed, regular and long
 *    shot frequency, regular and early cross frequency, dribble frequency,
 *    first-touch pass frequency, and the positioning ones (marking, run
 *    frequency, line height / length / width, full-back positioning). Every
 *    club gets its own set from its identity (possession, direct, counter,
 *    pressing, balanced) and its own small quirks, so CPU teams play in
 *    distinct ways.
 *
 * 3. AI behaviour. "Tactical" sides stick to their style whatever happens;
 *    "Dynamic" sides adapt mid-match: every ten minutes they look at where
 *    their chances come from and where they are being hurt, and lean into
 *    what works (the flank that creates, early crosses, balls in behind,
 *    going long against a press, dropping deeper against runners), and they
 *    read the game the way FC's tactical suggestions do - scoreline, time,
 *    red cards, possession, xG and how much the match matters.
 *
 * Values are 0-100 with 50 neutral; `factor(v)` turns them into multipliers.
 */
import { hash01 } from './util.js';

export const CPU_LEVELS = ['amateur', 'semipro', 'professional', 'world-class', 'legendary'];
export const AI_BEHAVIOURS = ['tactical', 'dynamic'];

/** Intelligence traits per level (FC's attacking/defending intelligence, reaction speed, marking & space). */
const LEVEL_TRAITS = {
  amateur: { attack: 0.3, defend: 0.3, react: 0.3, mark: 0.3 },
  semipro: { attack: 0.45, defend: 0.45, react: 0.45, mark: 0.45 },
  professional: { attack: 0.6, defend: 0.6, react: 0.6, mark: 0.6 },
  'world-class': { attack: 0.75, defend: 0.72, react: 0.75, mark: 0.72 },
  legendary: { attack: 0.9, defend: 0.85, react: 0.9, mark: 0.88 },
};
export const NEUTRAL_TRAITS = LEVEL_TRAITS.professional;

/** CPU sliders by club identity (FC 27 CPU Opponent sliders). */
const STYLE_SLIDERS = {
  balanced: { aggression: 50, tackle: 50, proFoul: 50, buildUp: 50, shot: 50, longShot: 50, cross: 50, earlyCross: 50, dribble: 50, firstTouch: 50, marking: 50, runs: 50, lineHeight: 50, lineLength: 50, lineWidth: 50, fullbacks: 50 },
  possession: { aggression: 60, tackle: 50, proFoul: 45, buildUp: 34, shot: 48, longShot: 38, cross: 40, earlyCross: 30, dribble: 56, firstTouch: 72, marking: 58, runs: 55, lineHeight: 64, lineLength: 40, lineWidth: 58, fullbacks: 68 },
  direct: { aggression: 58, tackle: 58, proFoul: 52, buildUp: 76, shot: 56, longShot: 62, cross: 68, earlyCross: 70, dribble: 42, firstTouch: 42, marking: 55, runs: 64, lineHeight: 46, lineLength: 56, lineWidth: 52, fullbacks: 48 },
  counter: { aggression: 50, tackle: 54, proFoul: 62, buildUp: 80, shot: 54, longShot: 55, cross: 50, earlyCross: 52, dribble: 52, firstTouch: 58, marking: 64, runs: 74, lineHeight: 30, lineLength: 36, lineWidth: 44, fullbacks: 38 },
  pressing: { aggression: 84, tackle: 70, proFoul: 60, buildUp: 64, shot: 55, longShot: 50, cross: 52, earlyCross: 54, dribble: 50, firstTouch: 60, marking: 66, runs: 62, lineHeight: 76, lineLength: 38, lineWidth: 52, fullbacks: 60 },
};

/** A multiplier from a 0-100 slider: 50 → 1, 0 → 1/(1+k), 100 → 1+k. */
export const factor = (value, k = 1) => {
  const v = (value ?? 50) - 50;
  return v >= 0 ? 1 + (v / 50) * k : 1 / (1 + (-v / 50) * k);
};

/**
 * The CPU's personality for one side: its style's sliders plus seeded quirks
 * of its own (two clubs with the same style still differ), and its traits.
 */
export function cpuProfile(teamId, style = 'balanced', { level = 'professional', behaviour = 'dynamic' } = {}) {
  const base = STYLE_SLIDERS[style] || STYLE_SLIDERS.balanced;
  const sliders = {};
  for (const [key, value] of Object.entries(base)) sliders[key] = Math.round(Math.max(5, Math.min(95, value + (hash01('cpu', teamId, key) - 0.5) * 16)));
  return {
    sliders,
    traits: LEVEL_TRAITS[level] || NEUTRAL_TRAITS,
    behaviour: AI_BEHAVIOURS.includes(behaviour) ? behaviour : 'dynamic',
    style,
    memory: freshMemory(),
    log: [],
  };
}

/** Neutral settings for a side the manager controls: no sliders, neutral traits. */
export function neutralProfile() {
  return { sliders: {}, traits: NEUTRAL_TRAITS, behaviour: 'none', memory: freshMemory(), log: [] };
}

export function freshMemory() {
  return { xgFor: { left: 0, center: 0, right: 0 }, kinds: {}, xgAgainst: { through: 0, cross: 0, other: 0 }, ownThirdLosses: 0, crossesWon: 0, crosses: 0, throughOk: 0, through: 0 };
}

/** Where on the front a point (attacking frame) is: the side's own left, centre or right. */
export const channelOf = (a) => (a < 36 ? 'left' : a > 64 ? 'right' : 'center');

/**
 * What a Dynamic CPU side changes after looking at the last ten minutes.
 * Returns { changes, reason } or null. Pure: the engine applies it.
 */
export function dynamicReview(tactics, memory, context) {
  const changes = {};
  const reasons = [];
  const xg = memory.xgFor;
  const total = xg.left + xg.center + xg.right;
  // Lean into the flank that is working.
  if (total >= 0.25) {
    const best = Object.entries(xg).sort((a, b) => b[1] - a[1])[0];
    if (best[1] / total >= 0.55) {
      const focus = best[0] === 'center' ? 'center' : best[0];
      if (tactics.focus !== focus) { changes.focus = focus; reasons.push(`focus-${focus}`); }
    }
  }
  // Crosses that are being won in the air: keep putting them in early.
  if (memory.crosses >= 4 && memory.crossesWon / memory.crosses >= 0.38 && tactics.finalThird !== 'early-cross') { changes.finalThird = 'early-cross'; reasons.push('crosses'); }
  // Balls in behind that land: go more direct and run more.
  if (memory.through >= 3 && memory.throughOk / memory.through >= 0.55 && tactics.buildUp !== 'counter') { changes.buildUp = 'counter'; reasons.push('in-behind'); }
  // Pressed into mistakes at the back: go long.
  if (memory.ownThirdLosses >= 3 && tactics.goalKicks !== 'long') { changes.goalKicks = 'long'; changes.buildUp = changes.buildUp || 'direct'; reasons.push('beat-the-press'); }
  // Hurt by runs in behind: drop the line.
  if (memory.xgAgainst.through >= 0.35 && tactics.line !== 'deep') { changes.line = tactics.line === 'high' ? 'normal' : 'deep'; reasons.push('line-down'); }
  // Hurt by crosses: defend the box with more bodies.
  if (memory.xgAgainst.cross >= 0.35 && tactics.width !== 'narrow') { changes.width = 'narrow'; reasons.push('protect-box'); }
  // Overrun in possession while level or ahead: sit and break.
  if (context.possessionAgainst >= 0.62 && context.diff >= 0 && tactics.block !== 'low') { changes.block = 'mid'; changes.onWin = 'counter'; reasons.push('sit-and-break'); }
  return Object.keys(changes).length ? { changes, reason: reasons.join(',') } : null;
}

/**
 * FC's tactical suggestions: what the situation asks for, from the scoreline,
 * the time, red cards, possession, xG and how much the match matters.
 * Returns a preset id and a focus (-1 defending, 0 default, +1 attacking).
 */
export function situationalPlan({ minute, diff, men, rivalMen, xgFor, xgAgainst, possession, knockout, aggregateDiff = 0 }) {
  const effectiveDiff = knockout ? diff + aggregateDiff : diff;
  const late = minute >= 75;
  if (men < rivalMen) return effectiveDiff > 0 ? { preset: 'park-the-bus', focus: -1 } : effectiveDiff === 0 ? { preset: 'counter-attack', focus: -1 } : { preset: 'long-ball', focus: late ? 1 : 0 };
  if (men > rivalMen) return effectiveDiff <= 0 ? { preset: possession >= 0.5 ? 'wing-play' : 'gegenpress', focus: 1 } : { preset: 'tiki-taka', focus: 0 };
  if (effectiveDiff < 0) {
    if (minute >= 80) return { preset: xgFor < xgAgainst ? 'long-ball' : 'wing-play', focus: 1 };
    if (minute >= 60) return { preset: possession < 0.45 ? 'gegenpress' : 'wing-play', focus: 1 };
    return null;
  }
  if (effectiveDiff > 0) {
    if (minute >= 82 && effectiveDiff === 1) return { preset: knockout ? 'park-the-bus' : 'counter-attack', focus: -1 };
    if (minute >= 70 && xgAgainst > xgFor + 0.6) return { preset: 'counter-attack', focus: -1 };
    return null;
  }
  // Level: a knockout tie drifting towards extra time, or a game that is getting away.
  if (minute >= 70 && xgAgainst > xgFor + 0.8) return { preset: 'counter-attack', focus: -1 };
  if (minute >= 75 && knockout === false && xgFor > xgAgainst + 0.5) return { preset: 'wing-play', focus: 1 };
  return null;
}
