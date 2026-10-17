/**
 * Football biography infobox → career evidence.
 *
 * Senior club spells with their league appearances and goals, senior national
 * team caps, birth date and the stated playing position. Youth, reserve and
 * coaching careers are kept apart; national B / Olympic / youth sides never
 * count as senior caps.
 */
import { wikiTemplates, wikiBirthDate } from '../../src/games/sports/manager/wikimedia-roster-parser.js';

const strip = (value) => String(value || '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>|<ref\b[^>]*\/>/gi, '')
  .replace(/&nbsp;|&#160;/g, ' ')
  .trim();
const number = (value) => {
  const m = /-?\d+/.exec(strip(value).replace(/\{\{[^}]*\}\}/g, '').replace(/[()]/g, ''));
  return m ? Number(m[0]) : null;
};
const linkTarget = (value) => /\[\[([^\]|#]+)/.exec(value || '')?.[1]?.replace(/_/g, ' ').trim() || null;

/** "1998–2003", "2003–", "2003", "2003–04" → [from, to|null]. */
function years(value) {
  const text = strip(value).replace(/\{\{[^}]*\}\}/g, '').replace(/[^\d–—\-]/g, ' ').trim();
  const m = /^(\d{4})\s*(?:[–—-]\s*(\d{2,4})?)?/.exec(text);
  if (!m) return null;
  const from = Number(m[1]);
  let to;
  if (m[2]) to = m[2].length === 2 ? Number(String(from).slice(0, 2) + m[2]) : Number(m[2]);
  else to = /[–—-]/.test(text) ? null : from;
  if (to !== null && to < from) to = to + 100 < from + 30 ? to + 100 : from;
  return [from, to];
}

const POSITION_RULES = [
  [/goal ?keeper|goalie|\bgk\b/i, 'GK'],
  [/wing[- ]?back/i, 'WB'],
  [/left[- ]?back|left full[- ]?back/i, 'LB'],
  [/right[- ]?back|right full[- ]?back/i, 'RB'],
  [/full[- ]?back/i, 'FB'],
  [/centre[- ]?back|center[- ]?back|central defender|sweeper|libero|stopper/i, 'CB'],
  [/defensive midfield|holding midfield|anchor/i, 'CDM'],
  [/attacking midfield|playmaker|number 10|trequartista/i, 'CAM'],
  [/left wing(?!-back)|left winger|left midfield/i, 'LW'],
  [/right wing(?!-back)|right winger|right midfield/i, 'RW'],
  [/winger|wide midfield|\bwing\b/i, 'W'],
  [/second striker|support striker|deep-lying forward/i, 'SS'],
  [/centre[- ]?forward|center[- ]?forward|striker|forward/i, 'ST'],
  [/central midfield|midfield/i, 'CM'],
  [/defender|defence/i, 'CB'],
];
const LINE = { GK: 'GK', WB: 'DF', LB: 'DF', RB: 'DF', FB: 'DF', CB: 'DF', CDM: 'MF', CAM: 'MF', CM: 'MF', LW: 'FW', RW: 'FW', W: 'FW', SS: 'FW', ST: 'FW' };

export function positionsFrom(text) {
  const raw = strip(text).replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1');
  const found = [];
  for (const part of raw.split(/,|\/|<br\s*\/?>|\band\b|;|\bor\b/i)) {
    for (const [rule, pos] of POSITION_RULES) if (rule.test(part)) { if (!found.includes(pos)) found.push(pos); break; }
  }
  return found;
}

const NOT_SENIOR = /under[- ]?\d|\bu-?\d{2}\b|\bU\d{2}\b|olympic|\bB\b|\bB team|youth|amateur|futsal|beach|universiade|military|students|reserves|\bA'\b|unofficial|XI\b/i;

export function parseFootballInfobox(text, title = '') {
  if (!text) return null;
  const template = wikiTemplates(text.replace(/<!--[\s\S]*?-->/g, ''), (name) => /^infobox (football|soccer) biography/.test(name))[0];
  if (!template) return null;
  const f = template.fields;
  const birthDate = wikiBirthDate(f.birth_date || f.birthdate || '');
  const indices = [...new Set(Object.keys(f).flatMap((key) => /^(?:years|clubs)(\d+)$/.exec(key)?.slice(1) || []))].map(Number).sort((a, b) => a - b);
  const stints = [];
  for (const index of indices) {
    const span = years(f[`years${index}`]);
    const club = strip(f[`clubs${index}`]);
    if (!span || !club) continue;
    const article = linkTarget(club);
    stints.push({
      i: index, article, from: span[0], to: span[1], loan: /loan|→|\{\{\s*(?:to|loan)\b/i.test(club),
      caps: number(f[`caps${index}`]), goals: number(f[`goals${index}`]),
    });
  }
  const national = [];
  const nIndices = [...new Set(Object.keys(f).flatMap((key) => /^national(?:years|team)(\d+)$/.exec(key)?.slice(1) || []))].map(Number).sort((a, b) => a - b);
  for (const index of nIndices) {
    const teamRaw = strip(f[`nationalteam${index}`]);
    const span = years(f[`nationalyears${index}`]);
    if (!teamRaw || !span) continue;
    const article = linkTarget(teamRaw) || teamRaw;
    const display = teamRaw.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1');
    national.push({ article, display, from: span[0], to: span[1], caps: number(f[`nationalcaps${index}`]), goals: number(f[`nationalgoals${index}`]), senior: !NOT_SENIOR.test(`${article} ${display}`) });
  }
  const positions = positionsFrom(f.position || '');
  const name = strip(title).replace(/\s*\([^)]*\)\s*$/, '').trim();
  const height = /(\d)\.(\d{2})\s*m/.exec(strip(f.height || ''));
  return {
    name, birthDate, positions, line: positions.length ? LINE[positions[0]] : null, stints, national,
    height: height ? Number(`${height[1]}.${height[2]}`) : null,
    retired: Boolean(strip(f.currentclub || '').match(/retired/i)),
  };
}

/* ── Spanish Wikipedia: {{Ficha de deportista}} ── */

const ES_POSITIONS = [
  [/portero|arquero|guardameta/i, 'GK'], [/carrilero/i, 'WB'], [/lateral izquierdo/i, 'LB'], [/lateral derecho/i, 'RB'], [/lateral/i, 'FB'],
  [/defensa central|defensor central|zaguero|central|l[ií]bero/i, 'CB'], [/pivote|mediocentro defensivo|volante (?:de marca|defensivo|central)|contenci[oó]n/i, 'CDM'],
  [/mediapunta|enganche|volante ofensivo|media punta|centrocampista ofensivo/i, 'CAM'], [/extremo izquierdo|interior izquierdo/i, 'LW'],
  [/extremo derecho|interior derecho/i, 'RW'], [/extremo|puntero|carrilero/i, 'W'], [/segundo delantero/i, 'SS'], [/delantero|ariete|punta/i, 'ST'],
  [/centrocampista|mediocampista|volante|medio/i, 'CM'], [/defensa|defensor/i, 'CB'],
];
const ES_NATIONS = { peru: 'PER', 'perú': 'PER', venezuela: 'VEN', guatemala: 'GUA', 'el salvador': 'SLV', ecuador: 'ECU', honduras: 'HON', 'costa rica': 'CRC',
  bolivia: 'BOL', argentina: 'ARG', nicaragua: 'NCA', 'panamá': 'PAN', panama: 'PAN', paraguay: 'PAR', uruguay: 'URU', 'república dominicana': 'DOM', 'españa': 'ESP',
  chile: 'CHI', colombia: 'COL', 'méxico': 'MEX', mexico: 'MEX', brasil: 'BRA', cuba: 'CUB', haití: 'HAI', jamaica: 'JAM', 'estados unidos': 'USA', 'trinidad y tobago': 'TRI', belice: 'BLZ' };

function esDate(value) {
  const tpl = /\{\{\s*(?:fecha|edad)[^|}]*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})\s*\|\s*(\d{4})/i.exec(value || '');
  if (tpl) return `${tpl[3]}-${tpl[2].padStart(2, '0')}-${tpl[1].padStart(2, '0')}`;
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const text = /(\d{1,2}) de ([a-z]+) de (\d{4})/i.exec(strip(value).replace(/\[\[|\]\]/g, ''));
  if (text && months.includes(text[2].toLowerCase())) return `${text[3]}-${String(months.indexOf(text[2].toLowerCase()) + 1).padStart(2, '0')}-${text[1].padStart(2, '0')}`;
  return null;
}

function esYears(text) {
  const m = /\(\s*(\d{4})\s*(?:[-–—]\s*(\d{2,4}|presente|actualidad|act\.?|hoy)?)?/i.exec(text || '');
  if (!m) return null;
  const from = Number(m[1]);
  if (!m[2]) return /[-–—]\s*\)/.test(text) ? [from, null] : [from, from];
  if (/\D/.test(m[2])) return [from, null];
  let to = m[2].length === 2 ? Number(String(from).slice(0, 2) + m[2]) : Number(m[2]);
  if (to < from) to += 100;
  return [from, to];
}

/** "Clubes" wikitable rows: [[Club]] … | 1993-1994 (country cells and rowspans ignored). */
export function stintsFromSpanishTable(table) {
  const stints = [];
  if (!table) return stints;
  for (const row of table.split(/\n\|-/)) {
    const article = linkTarget(row.replace(/\{\{[^}]*\}\}/g, ''));
    const year = /(?:^|\n|\|)\s*(\d{4}(?:\s*[-–—]\s*(?:\d{2,4}|presente|actualidad))?)\s*(?:\n|$|\|)/i.exec(row.replace(/<ref[\s\S]*?<\/ref>|<ref[^>]*\/>/g, ''));
    if (!article || !year) continue;
    const span = esYears(`(${year[1]})`);
    if (span) stints.push({ i: stints.length + 1, article: `es:${article}`, from: span[0], to: span[1], loan: /cedid|pr[eé]stamo/i.test(row), caps: null, goals: null });
  }
  return stints;
}

export function parseSpanishInfobox(text, title = '', table = null) {
  if (!text) return null;
  const template = wikiTemplates(text.replace(/<!--[\s\S]*?-->/g, ''), (name) => /^ficha de (deportista|futbolista)/.test(name))[0];
  if (!template) return null;
  const f = template.fields;
  if (f.deporte && !/f[uú]tbol/i.test(f.deporte) && !f.equipos) return null;
  const birthDate = esDate(f['fecha nacimiento'] || f.fechadenacimiento || f['fecha de nacimiento'] || f.fecha_nacimiento || f.nacimiento || '');
  const stints = [];
  for (const line of strip(f.equipos || f.clubes || '').split(/\n|<br\s*\/?>/i)) {
    const article = linkTarget(line);
    const span = esYears(line.replace(/\[\[[^\]]*\]\]/g, ''));
    if (!article || !span) continue;
    stints.push({ i: stints.length + 1, article: `es:${article}`, from: span[0], to: span[1], loan: /cedid|pr[eé]stamo/i.test(line), caps: null, goals: null });
  }
  if (!stints.length && table) stints.push(...stintsFromSpanishTable(table));
  const national = [];
  const sel = strip(f['selección'] || f.seleccion || '');
  const selb = /\{\{\s*selb\s*\|\s*([A-Z]{3})/i.exec(sel);
  const named = linkTarget(sel) || sel.replace(/\{\{[^}]*\}\}/g, '').trim();
  const nationName = String(named || '').replace(/^selecci[oó]n (?:de f[uú]tbol )?(?:masculina )?(?:de |del )?/i, '').replace(/\s*\(.*$/, '').trim().toLowerCase();
  const fifa = selb ? selb[1].toUpperCase() : ES_NATIONS[nationName] || null;
  const caps = number(f['veces internacional'] || f.partidos_seleccion || '');
  const debut = /(\d{4})/.exec(strip(f['debut internacional'] || ''));
  if (fifa && !/sub[- ]?\d|ol[ií]mpic/i.test(sel)) national.push({ article: sel, display: nationName, fifa, from: debut ? Number(debut[1]) : (stints[0]?.from ?? 2000) + 3, to: null, caps, goals: number(f['goles internacional'] || ''), senior: true });
  const positions = [];
  for (const part of strip(f['posición'] || f.posicion || '').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1').split(/,|\/|<br\s*\/?>|\by\b/i)) {
    for (const [rule, pos] of ES_POSITIONS) if (rule.test(part)) { if (!positions.includes(pos)) positions.push(pos); break; }
  }
  const LINE_OF = { GK: 'GK', WB: 'DF', LB: 'DF', RB: 'DF', FB: 'DF', CB: 'DF', CDM: 'MF', CAM: 'MF', CM: 'MF', LW: 'FW', RW: 'FW', W: 'FW', SS: 'FW', ST: 'FW' };
  return {
    name: strip(title).replace(/\s*\([^)]*\)\s*$/, '').trim(), birthDate, positions, line: positions.length ? LINE_OF[positions[0]] : null, stints, national,
    height: null, retired: false, nationality: fifa,
  };
}

/* ── German Wikipedia: {{Infobox Fußballspieler}} with {{Team-Station}} rows ── */

const DE_MONTHS = ['januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember'];
const DE_POSITIONS = [
  [/torwart|torhüter/i, 'GK'], [/linke[rn]? außenverteidig|linksverteidig/i, 'LB'], [/rechte[rn]? außenverteidig|rechtsverteidig/i, 'RB'], [/außenverteidig|flügelverteidig/i, 'FB'],
  [/innenverteidig|libero|abwehrchef/i, 'CB'], [/defensive[sn]? mittelfeld|sechser/i, 'CDM'], [/offensive[sn]? mittelfeld|spielmacher|zehner/i, 'CAM'],
  [/linke[rn]? flügel|linksaußen/i, 'LW'], [/rechte[rn]? flügel|rechtsaußen/i, 'RW'], [/flügel|außenbahn/i, 'W'], [/hängende spitze/i, 'SS'], [/stürmer|angriff|mittelstürmer/i, 'ST'],
  [/mittelfeld/i, 'CM'], [/abwehr|verteidig/i, 'CB'],
];
const DE_NATIONS = { deutschland: 'GER', österreich: 'AUT', schweiz: 'SUI', polen: 'POL', tschechien: 'CZE', tschechoslowakei: 'CZE', ungarn: 'HUN', kroatien: 'CRO', serbien: 'SRB', jugoslawien: 'SRB',
  dänemark: 'DEN', niederlande: 'NED', belgien: 'BEL', frankreich: 'FRA', italien: 'ITA', spanien: 'ESP', portugal: 'POR', england: 'ENG', schottland: 'SCO', türkei: 'TUR', griechenland: 'GRE',
  rumänien: 'ROU', bulgarien: 'BUL', slowakei: 'SVK', slowenien: 'SVN', 'bosnien und herzegowina': 'BIH', sowjetunion: 'RUS', russland: 'RUS', ukraine: 'UKR', schweden: 'SWE', norwegen: 'NOR',
  finnland: 'FIN', island: 'ISL', brasilien: 'BRA', argentinien: 'ARG', ddr: 'GER', ghana: 'GHA', nigeria: 'NGA', kamerun: 'CMR', japan: 'JPN', 'südkorea': 'KOR', 'vereinigte staaten': 'USA', albanien: 'ALB', georgien: 'GEO', luxemburg: 'LUX', liechtenstein: 'LIE', iran: 'IRN', australien: 'AUS', kosovo: 'KOS', 'nordmazedonien': 'MKD', mazedonien: 'MKD', montenegro: 'MNE', irland: 'IRL', wales: 'WAL', lettland: 'LVA', litauen: 'LTU', estland: 'EST' };

function deDate(value) {
  const text = strip(value).replace(/\[\[|\]\]/g, '');
  const m = /(\d{1,2})\.\s*([A-Za-zäöüÄÖÜ]+)\s+(\d{4})/.exec(text);
  if (m && DE_MONTHS.includes(m[2].toLowerCase())) return `${m[3]}-${String(DE_MONTHS.indexOf(m[2].toLowerCase()) + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const tpl = /(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})/.exec(value || '');
  if (tpl) return `${tpl[1]}-${tpl[2].padStart(2, '0')}-${tpl[3].padStart(2, '0')}`;
  return null;
}

function teamStations(text) {
  const rows = [];
  for (const t of wikiTemplates(text || '', (name) => name === 'team-station')) {
    const [span, club, record] = t.parts.map((x) => strip(x));
    if (!span) continue;
    const y = years(span);
    const apps = /(\d+)\s*(?:\{\{0\}\}\s*)?\(\s*-?(\d+)\s*\)/.exec(String(record || '').replace(/\{\{0+\}\}/g, ''));
    rows.push({ span: y, club, link: linkTarget(club), display: String(club || '').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/\(.*\)/, '').replace(/→/g, '').trim(), apps: apps ? Number(apps[1]) : null, goals: apps ? Number(apps[2]) : null });
  }
  return rows;
}

export function parseGermanInfobox(text, title = '') {
  if (!text) return null;
  const template = wikiTemplates(text.replace(/<!--[\s\S]*?-->/g, ''), (name) => /^infobox fu(ß|ss)ballspieler/.test(name))[0];
  if (!template) return null;
  const f = template.fields;
  const birthDate = deDate(f.geburtstag || f.geburtsdatum || '');
  const known = new Map();
  const stints = [];
  for (const row of teamStations(f.vereine_tabelle || '')) {
    if (!row.span) continue;
    if (row.link) known.set(row.display.toLowerCase(), row.link);
    const article = row.link || known.get(row.display.toLowerCase()) || null;
    if (!article) continue;
    stints.push({ i: stints.length + 1, article: `de:${article}`, from: row.span[0], to: row.span[1], loan: /leih/i.test(row.club), caps: row.apps, goals: row.goals });
  }
  const national = [];
  for (const row of teamStations(f.nationalmannschaft_tabelle || '')) {
    if (!row.span) continue;
    const label = `${row.link || ''} ${row.display}`;
    const senior = !/U-?\d|olympia|B-|amateur|junior|auswahl|futsal/i.test(label);
    const name = row.display.toLowerCase().replace(/\s+b$/, '').trim();
    const fifa = DE_NATIONS[name] || DE_NATIONS[(row.link || '').toLowerCase().replace(/^(?:deutsche |österreichische |schweizer )?fu(?:ß|ss)ballnationalmannschaft.*$/, '')] || null;
    national.push({ article: row.link || row.display, display: row.display, fifa, from: row.span[0], to: row.span[1], caps: row.apps, goals: row.goals, senior });
  }
  const positions = [];
  for (const part of strip(f.position || '').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1').split(/,|\/|<br\s*\/?>|\bund\b/i)) {
    for (const [rule, pos] of DE_POSITIONS) if (rule.test(part)) { if (!positions.includes(pos)) positions.push(pos); break; }
  }
  const LINE_OF = { GK: 'GK', WB: 'DF', LB: 'DF', RB: 'DF', FB: 'DF', CB: 'DF', CDM: 'MF', CAM: 'MF', CM: 'MF', LW: 'FW', RW: 'FW', W: 'FW', SS: 'FW', ST: 'FW' };
  return { name: strip(title).replace(/\s*\([^)]*\)\s*$/, '').trim(), birthDate, positions, line: positions.length ? LINE_OF[positions[0]] : null, stints, national, height: null, retired: false, nationality: national.find((n) => n.senior && n.fifa)?.fifa || null };
}
