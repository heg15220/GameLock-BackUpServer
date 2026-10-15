/** A current club page may supplement this season only with explicit evidence.
 * A revision timestamp or a passing mention of a year does not date its squad.
 */
export function currentClubSeasonEvidence(source, season) {
  const current = /^\s*\|\s*current\s*=\s*([^\n\r]+)/im.exec(source.text || '')?.[1]
    ?.replace(/<!--.*?-->/g, '').replaceAll('[[', '').replaceAll(']]', '').trim();
  const prefix = season.replace('/', '–');
  if (!current || !current.replaceAll('-', '–').startsWith(`${prefix} `) || !/\bseason\b/i.test(current)) return null;
  const year = Number(season.slice(0, 4)), split = season.includes('/');
  const start = `${year}-${split ? '07' : '01'}-01`, end = `${year + 1}-${split ? '07' : '01'}-01`;
  if (!source.timestamp || source.timestamp.slice(0, 10) < start || source.timestamp.slice(0, 10) >= end) return null;
  return `Club infobox current: ${current}; revision ${source.timestamp}`;
}
