/** Parsers for pinned OpenFootball v0-format and players archives (CC0). */
import {verifiedCC0RosterIdentity} from './cc0-identity-disambiguation.js';
export const identityKey = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[.'’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const positions = {G:'GK',D:'DF',M:'MF',F:'FW',GK:'GK',DF:'DF',MF:'MF',FW:'FW'};
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const nationalities = {NGR:'NGA',ROM:'ROU',SPA:'ESP',CHL:'CHI',PRT:'POR',GRC:'GRE',SER:'SRB',SWI:'SUI',DRC:'COD',PRY:'PAR',SLO:'SVN'};
export const normalizeNationality = code => nationalities[code] || code;
export function parseBirthDate(value) {
  const match = /(?:^|\s)(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})(?=\s|$|\()/.exec(value);
  if (!match) return null;
  const date = `${match[3]}-${String(months.indexOf(match[2])+1).padStart(2,'0')}-${match[1].padStart(2,'0')}`;
  const parsed = new Date(date);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === date ? date : null;
}
export function parsePlayerIdentities(text, nationality, source) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const match = /^([^#=,]+),\s*([GDMF]),.*?\bb\.\s*(.+)$/.exec(line);
    const birthDate = match && parseBirthDate(match[3]);
    if (!birthDate) continue;
    rows.push({name:match[1].trim(),birthDate,birthYear:Number(birthDate.slice(0,4)),position:positions[match[2]],nationality,identitySource:source});
  }
  return rows;
}
export function createIdentityIndex(identities) {
  const index = new Map();
  for (const player of identities) {
    if (!player.birthDate || !player.identitySource) continue;
    const key = identityKey(player.name);
    if (!index.has(key)) index.set(key, []);
    const rows = index.get(key);
    if (!rows.some(row => row.birthDate === player.birthDate && row.nationality === player.nationality)) rows.push(player);
  }
  return index;
}
/** Exact full names only. A unique normalized spelling does not make a mononym safe. */
export function resolveIdentity(name, index, nationality) {
  const key = identityKey(name);
  if (!key.includes(' ')) return null;
  const candidates = (index.get(key) || []).filter(row => !nationality || row.nationality === nationality);
  if (new Set(candidates.map(row => row.birthDate)).size !== 1 || new Set(candidates.map(row => row.nationality)).size !== 1) return null;
  return candidates[0] || null;
}
export function parseArchivedSquad(text, {format, country, identities, year, clubId, source}) {
  const players = [], unresolved = [];
  let section = null;
  const lines = text.split(/\r?\n/);
  for (let i=0; i<lines.length; i++) {
    const line = lines[i];
    if (/^##\s*(Goalkeepers|Defenders|Midfielders|Forwards)/.test(line)) section = {Goalkeepers:'GK',Defenders:'DF',Midfielders:'MF',Forwards:'FW'}[line.match(/^##\s*(\w+)/)[1]];
    let name, number, position, nationality, birthDate;
    if (format === 'mls') {
      const match = /^\((\d+)\)\s+(.+)$/.exec(line), stats = /^#\$\$\s+pos:\s*([GDMF])\b/.exec(lines[i+1] || '');
      if (!match || !stats) continue;
      [,number,name] = match; position = positions[stats[1]];
    } else if (format === 'sections') {
      const match = /^\s*(\d+)\s+(.+?)\s*$/.exec(line);
      if (!match || !section) continue;
      [,number,name] = match; position = section;
      const foreign = /\s*\(([A-Z]{3})\)\s*$/.exec(name);
      nationality = foreign ? normalizeNationality(foreign[1]) : undefined;
      name = name.replace(/\s*\([A-Z]{3}\)\s*$/, '').trim();
    } else {
      const match = /^\s*(\d+)\s+(?:\((?:c|vc)\)\s*)?(.+?)\s+(GK|DF|MF|FW)\b(.*)$/.exec(line);
      if (!match) continue;
      [,number,name,position] = match;
      const foreign = /\s*\(([A-Z]{3})\)\s*$/.exec(name);
      nationality = normalizeNationality(foreign?.[1] || country);
      name = name.replace(/\s*\([A-Z]{3}\)\s*$/, '').trim();
      if (name.includes(',')) { const [last,first] = name.split(','); name = `${first.trim()} ${last.trim()}`; }
      birthDate = parseBirthDate(match[4]);
    }
    const identity = birthDate ? null : verifiedCC0RosterIdentity({name,year,clubId,shirtNumber:number,source}) || resolveIdentity(name, identities, nationality);
    birthDate ||= identity?.birthDate;
    nationality ||= identity?.nationality;
    if (!birthDate || !nationality) { unresolved.push({name,reason:'missing-or-ambiguous-dated-identity'}); continue; }
    const birthYear = Number(birthDate.slice(0,4));
    if (year-birthYear < 14 || year-birthYear > 48) { unresolved.push({name,reason:'age-outside-import-range'}); continue; }
    players.push({name,birthDate,birthYear,nationality,position,shirtNumber:Number(number),...(identity ? {identitySource:identity.identitySource,...(identity.wikidataId ? {wikidataId:identity.wikidataId} : {}),...(identity.identityCorrection ? {identityCorrection:identity.identityCorrection} : {})} : {})});
  }
  return {players,unresolved};
}
