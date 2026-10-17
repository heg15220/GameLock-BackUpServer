import { formatMoney } from '../career/economy.js';
import { POSITION_LABEL, POSITION_NAME } from '../career/positions.js';
import { isNation, continentalName, currentCompName } from '../career/competitions.js';

export const money = (value, lang) => formatMoney(value, lang);

const WEEKDAYS = {
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
const MONTHS = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const parse = (date) => new Date(`${date}T12:00:00Z`);

export function longDate(date, lang) {
  const d = parse(date);
  const wd = WEEKDAYS[lang][d.getUTCDay()];
  const month = MONTHS[lang][d.getUTCMonth()];
  return lang === 'es' ? `${wd}, ${d.getUTCDate()} de ${month}` : `${wd}, ${d.getUTCDate()} ${month}`;
}

export function shortDate(date, lang) {
  const d = parse(date);
  const month = MONTHS[lang][d.getUTCMonth()].slice(0, 3);
  return lang === 'es' ? `${d.getUTCDate()} ${month}` : `${d.getUTCDate()} ${month}`;
}

export function weekdayShort(date, lang) {
  return WEEKDAYS[lang][parse(date).getUTCDay()].slice(0, 3);
}

export const monthName = (index, lang) => MONTHS[lang][index];
export const weekdayNames = (lang) => WEEKDAYS[lang];

export const posLabel = (pos, lang) => POSITION_LABEL[lang]?.[pos] || pos;
export const posName = (pos, lang) => POSITION_NAME[lang]?.[pos] || pos;

export const seasonLabel = (year) => `${year}/${String(year + 1).slice(-2)}`;

export function ratingTone(value) {
  if (value >= 85) return 'elite';
  if (value >= 78) return 'gold';
  if (value >= 70) return 'silver';
  if (value >= 62) return 'bronze';
  return 'basic';
}

export function matchRatingTone(value) {
  if (value >= 8) return 'great';
  if (value >= 7) return 'good';
  if (value >= 6) return 'ok';
  return 'poor';
}

export function teamName(career, id, lang = 'es', short = false) {
  if (!id) return '—';
  if (isNation(id)) {
    const country = career.world.countries[id.slice(2)];
    return (lang === 'es' ? country?.name_es : country?.name_en) || id.slice(2);
  }
  const club = career.world.clubs[id];
  return (short ? club?.short : club?.name) || id;
}

export function teamInfo(career, id) {
  if (!id) return null;
  if (isNation(id)) {
    const country = career.world.countries[id.slice(2)];
    return { id, name: country?.name_es, nameEn: country?.name_en, crest: country?.flag || null, color: country?.color || '#334', abbr: id.slice(2), nation: true, kit: country?.kit };
  }
  const club = career.world.clubs[id];
  return club ? { id, name: club.name, short: club.short, crest: club.crest, color: club.color, abbr: club.abbr, nation: false } : null;
}

export function compName(comp, lang) {
  if (!comp) return '';
  // Club competitions are named afresh (older saves stored the old brand names).
  if (comp.type === 'continental' && comp.conf && comp.level) return continentalName(comp.conf, comp.level, lang);
  if (comp.type === 'cup' && typeof comp.name === 'string') return currentCompName(comp.name);
  if (comp.type === 'qualifiers') return lang === 'es' ? `Clasificación · ${comp.name[0]}` : `${comp.name[1]} qualifiers`;
  if (Array.isArray(comp.name)) return comp.name[lang === 'es' ? 0 : 1];
  if (comp.type === 'continental' && lang === 'en' && comp.nameEn) return comp.nameEn;
  if (comp.type === 'friendly') return lang === 'es' ? 'Amistoso' : 'Friendly';
  if (comp.type === 'qualifiers') return lang === 'es' ? `Clasificación · ${comp.name[0]}` : `${comp.name[1]} qualifiers`;
  return comp.name;
}

export const STAGE_LABEL = {
  es: { league: 'Liga', group: 'Fase de grupos', r256: 'Ronda previa', r128: 'Primera ronda', r64: 'Treintaidosavos', r32: 'Dieciseisavos', r16: 'Octavos', qf: 'Cuartos', sf: 'Semifinal', final: 'Final', winner: 'Campeón', friendly: 'Amistoso', entered: 'Primera ronda' },
  en: { league: 'League', group: 'Group stage', r256: 'Preliminary round', r128: 'First round', r64: 'Round of 64', r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-final', sf: 'Semi-final', final: 'Final', winner: 'Champions', friendly: 'Friendly', entered: 'First round' },
};

export const stageLabel = (stage, lang) => STAGE_LABEL[lang][stage] || stage;

export function fixtureLabel(career, fixture, lang) {
  const comp = career.season.comps[fixture.comp];
  if (fixture.friendly) return fixture.national ? (lang === 'es' ? 'Amistoso internacional' : 'International friendly') : (lang === 'es' ? 'Amistoso de pretemporada' : 'Pre-season friendly');
  if (fixture.stage === 'league') return `${compName(comp, lang)} · ${lang === 'es' ? 'Jornada' : 'Matchday'} ${fixture.round + 1}`;
  if (fixture.stage === 'group') return `${compName(comp, lang)} · ${lang === 'es' ? 'Grupo' : 'Group'} ${comp.groups?.[fixture.group]?.name ?? ''}`;
  const leg = fixture.leg ? (lang === 'es' ? ` · ${fixture.leg === 1 ? 'Ida' : 'Vuelta'}` : ` · ${fixture.leg === 1 ? '1st leg' : '2nd leg'}`) : '';
  return `${compName(comp, lang)} · ${stageLabel(fixture.stage, lang)}${leg}`;
}

export const pct = (value) => `${Math.round(value)}%`;
