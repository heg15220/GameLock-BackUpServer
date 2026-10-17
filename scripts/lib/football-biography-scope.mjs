/** Exclude explicitly documented women's playing careers from this men's archive. */
export function isWomensPlayingCareer(info, record = {}) {
  const teams = [...(info.stints || []), ...(info.national || [])].map(team => `${team.article || ''} ${team.display || ''}`).join('\n');
  if (/\bwomen(?:['’]s)?\b|\bfemenin[oa]s?\b|\bfrauen(?:fu(?:ß|ss)ball(?:nationalmannschaft)?)?\b/i.test(teams)) return true;
  return /^\s*\|\s*(?:mw\s*=\s*w|(?:sex|gender|sexo|género)\s*=\s*(?:female|femenino|mujer))\s*(?:\||$)/im.test(record.infobox || '')
    || /^\s*\|\s*(?:deporte|sport)\s*=.*\bfemenin[oa]\b/im.test(record.infobox || '');
}

/** Generic Spanish athlete infoboxes also occur in basketball and futsal. */
export function isOtherSport(record = {}) {
  const value = /^\s*\|\s*(?:deporte|sport)\s*=([^\r\n]+)/im.exec(record.infobox || '')?.[1];
  if (!value?.trim()) return false;
  const sport = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return !/\b(?:futbol|football|soccer)\b/i.test(sport) || /\b(?:sala|futsal|beach|playa|americano|american|gaelic|australian)\b/i.test(sport);
}
