/** Original game model. Probabilities are tuning estimates, not medical predictions. */
import { getPlayerAge } from './player-age.js';
export const TRAINING_INTENSITIES = ['recovery', 'balanced', 'intensive'];
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const defaults = { condition: 100, sharpness: 80, injury: null, minutesLast7Days: 0, lastMatchDate: null };
const healthViews = new WeakMap();
export const addDays = (date, days) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 86400000));
export function getPlayerHealth(state, player) {
  let views = healthViews.get(state);
  if (!views) { views = new Map(); healthViews.set(state, views); }
  if (views.has(player.id)) return views.get(player.id);
  let health = { ...defaults, ...(state.playerHealth?.[player.id] || {}) };
  const updated = health.lastUpdatedDate || health.lastMatchDate || state.seasonStartDate
    || (state.year ? `${state.year}-08-17` : state.date);
  if (updated && state.date && state.date > updated) {
    health = recoverHealth(health, daysBetween(updated, state.date), player.clubId === state.clubId ? state.trainingIntensity : 'balanced');
  }
  health.lastUpdatedDate = state.date || updated || null;
  const view = { ...health, available: !player.retired && !(health.injury?.daysRemaining > 0) };
  views.set(player.id, view);
  return view;
}
export function effectiveRating(player, health = defaults) {
  return player.rating * (0.67 + clamp(health.condition, 0, 100) * 0.003) + (health.sharpness - 65) * 0.045;
}
export function injuryProbability(player, health, minutes = 90) {
  const fatigue = (100 - health.condition) / 100;
  const age = player.age || 25;
  return clamp((0.007 + fatigue * fatigue * 0.12 + Math.max(0, age - 30) * 0.0006
    + Math.max(0, health.minutesLast7Days - 150) * 0.00012) * minutes / 90, 0.002, 0.18);
}
export function recoverHealth(health, days, intensity = 'balanced') {
  const rate = { recovery: 9, balanced: 5.5, intensive: 3.1 }[intensity] || 5.5;
  const injuredDays = Math.min(days, health.injury?.daysRemaining || 0);
  const healthyDays = Math.max(0, days - injuredDays);
  const injury = health.injury && health.injury.daysRemaining > days
    ? { ...health.injury, daysRemaining: health.injury.daysRemaining - days } : null;
  const training = { recovery: -0.7, balanced: 0.12, intensive: 0.55 }[intensity] || 0;
  const injuryCondition = injuredDays > 0 ? Math.min(82, health.condition + rate * injuredDays) : health.condition;
  return { ...health, condition: +clamp(injuryCondition + rate * healthyDays, 0, injury ? 82 : 100).toFixed(1),
    sharpness: +clamp(health.sharpness - injuredDays * 0.7 + healthyDays * training, 35, 100).toFixed(1), injury,
    minutesLast7Days: Math.max(0, Math.round(health.minutesLast7Days * Math.max(0, 1 - days / 7))) };
}
export function matchHealth(player, health, minutes, date, injury = null) {
  const age = getPlayerAge(player, date, player.birthYear + (player.age || 25));
  const loss = minutes / 90 * (player.position === 'GK' ? 11 : 24 + Math.max(0, age - 30) * 0.5);
  return { ...health, condition: +clamp(health.condition - loss, 10, 100).toFixed(1),
    sharpness: +clamp(health.sharpness + minutes / 30, 35, 100).toFixed(1),
    injury: injury ? { ...injury, returnDate: addDays(date, injury.daysRemaining) } : health.injury,
    minutesLast7Days: health.minutesLast7Days + minutes, lastMatchDate: date, lastUpdatedDate: date };
}
export function sampleInjury(random) {
  const roll = random();
  if (roll < 0.55) return { name: 'Contusión', daysRemaining: 3 + Math.floor(random() * 7) };
  if (roll < 0.87) return { name: 'Sobrecarga muscular', daysRemaining: 10 + Math.floor(random() * 14) };
  if (roll < 0.98) return { name: 'Rotura muscular', daysRemaining: 25 + Math.floor(random() * 35) };
  return { name: 'Lesión de rodilla', daysRemaining: 90 + Math.floor(random() * 120) };
}
