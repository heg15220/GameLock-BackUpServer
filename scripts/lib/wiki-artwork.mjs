/** Read only the selected football infobox, never a later stadium/photo box. */
export function footballArtwork(text, kind) {
  const pattern = kind === 'crests'
    ? /\{\{\s*(?:Infobox football club|Infobox soccer club|Infobox football team|Infobox sports team|Infobox Club de football|Ficha de club deportivo|Ficha de equipo de fútbol)/i
    : /\{\{\s*(?:Infobox football league|Infobox sports league|Infobox football tournament|Infobox Compétition sportive|Infobox Compétition de football)\b/i;
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  const start = text.search(pattern);
  if (start < 0) return { reason: 'no-football-infobox' };
  let depth = 0, end = start;
  for (; end < text.length - 1; end++) {
    const pair = text.slice(end, end + 2);
    if (pair === '{{') { depth++; end++; }
    else if (pair === '}}') { depth--; end++; if (!depth) { end++; break; } }
  }
  const box = text.slice(start, end);
  const match = /^[ \t]*\|?\s*(?:image|logo|badge|imagen|escudo)\s*=\s*(?:\[\[)?(?:File:|Image:|Fichier:|Archivo:|Imagen:)?([^\n|{}]+?\.(?:svg|png|jpe?g|webp|gif))(?=\s*(?:\||\]\]|\{\{!\}\}|<ref\b|\r?$))/im.exec(box);
  if (!match || /stadium|stadion|estadio|team.photo|squad|flag_of|map\./i.test(match[1])) return { reason: 'no-explicit-crest-image' };
  return { file: `File:${match[1].trim().replace(/_/g, ' ')}` };
}
