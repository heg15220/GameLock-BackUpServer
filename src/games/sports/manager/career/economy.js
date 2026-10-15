import { clamp, roundMoney } from './util.js';

/** Money in the archive is scaled by era; the same curve prices every later move. */
export const moneyScale = (year) => Math.max(0.18, Math.pow(1.047, year - 2025));

/**
 * Market value: rating dominates, potential adds a premium for youth, age and
 * contract length discount it. Mirrors the archive's own pricing so a player
 * keeps the value the selection showed when the career began.
 */
export function marketValue({ ovr, pot, age, contractYears = 3, form = 0 }, year) {
  const ageScale = age <= 21 ? 1.25 : age <= 24 ? 1.12 : age <= 28 ? 1 : age <= 30 ? 0.78 : age <= 32 ? 0.5 : 0.28;
  const elite = Math.pow(1.08, Math.max(0, ovr - 75));
  const growth = Math.max(0, pot - ovr) * (age <= 23 ? 260000 : 90000);
  const contract = contractYears <= 0 ? 0.25 : contractYears === 1 ? 0.62 : contractYears === 2 ? 0.85 : 1;
  const raw = (Math.pow(Math.max(1, ovr - 43), 2.65) * 950 * elite + growth) * ageScale * contract * (1 + form * 0.025);
  return Math.max(15000, roundMoney(raw * moneyScale(year)));
}

/** Weekly wage a player expects at a club of a given prestige (0-5). */
export function expectedWage(player, prestige, year, role = 'rotation') {
  const roleFactor = { star: 1.35, important: 1.12, rotation: 1, backup: 0.82, prospect: 0.7 }[role] || 1;
  const quality = Math.pow(Math.max(1, player.ovr - 40), 2.35) * 2.1;
  const prestigeFactor = 0.55 + prestige * 0.22;
  const ageFactor = player.age >= 31 ? 1.1 : player.age <= 21 ? 0.75 : 1;
  return Math.max(400, roundMoney(quality * prestigeFactor * ageFactor * roleFactor * moneyScale(year)));
}

/** Club income by reputation and league strength (season totals, before prizes). */
export function seasonIncome(club, league, year) {
  const rep = club.rep ?? 1;
  const strength = league?.strength ?? 0;
  const tier = league?.tier ?? 1;
  const tv = (2.5e6 + strength * 14e6 + Math.max(0, rep - 1) * 9e6) / tier;
  const commercial = Math.pow(rep + 1, 2.4) * 1.6e6;
  return { tv: roundMoney(tv * 0.6 * moneyScale(year)), commercial: roundMoney(commercial * 0.6 * moneyScale(year)) };
}

export function stadiumCapacity(club) {
  const rep = club.rep ?? 1;
  return Math.round(clamp(6000 + rep * rep * 3600 + ((club.rating ?? 60) - 55) * 600, 4000, 99000) / 100) * 100;
}

export function ticketPrice(club, year) {
  return Math.max(6, Math.round((9 + (club.rep ?? 1) * 4.5) * moneyScale(year)));
}

export const formatMoney = (value, lang = 'es') => {
  const abs = Math.abs(value || 0);
  const sign = value < 0 ? '−' : '';
  const unit = lang === 'es' ? { m: ' M€', k: ' mil €', e: ' €' } : { m: 'M €', k: 'K €', e: ' €' };
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toLocaleString(lang === 'es' ? 'es-ES' : 'en-GB', { maximumFractionDigits: abs >= 1e8 ? 0 : abs >= 1e7 ? 1 : 2 })}${unit.m}`;
  if (abs >= 1e3) return `${sign}${Math.round(abs / 1e3).toLocaleString(lang === 'es' ? 'es-ES' : 'en-GB')}${unit.k}`;
  return `${sign}${Math.round(abs)}${unit.e}`;
};
