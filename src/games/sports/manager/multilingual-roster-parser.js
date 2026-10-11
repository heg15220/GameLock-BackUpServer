import { wikiTemplates, wikiPlayerName, splitWikiFields } from './wikimedia-roster-parser.js';

// Grammars are language-specific. Unsupported languages fail closed rather than
// guessing date order or treating an archived edit date as a season label.
const clean = value => String(value || '').replace(/<ref\b[^>]*>[\s\S]*?<\/ref>|<ref\b[^>]*\/>/gi, '').replace(/<[^>]*>/g, '').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/'{2,}/g, '').trim();
const norm = value => clean(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replaceAll('_', ' ').trim();
const rosterTemplateName = value => norm(value).replace(/ con esquema$/,'');
const fields = template => Object.fromEntries(Object.entries(template.fields).map(([key,value]) => [norm(key), value]));
const excludedSection = title => /femenin|filial|reserva|juvenil|cedidos|transferencias|traspasos|fichajes|\baltas\b|\bbajas\b|jugadores hist[oó]ricos|goleadores|estad[ií]sticas|selecci[oó]n|\bequipo\s+sub[\s-]?(?:1\d|2[0-3])\b|\bsin\s+inscribir\b|\bno\s+inscritos\b/i.test(title);
// Spanish Jugador de fútbol renders name literally. An unlinked name may
// remain a row identity only; the importer requires its own exact birth date
// and must never resolve it by searching a biography of the same name.
function spanishPlayerName(value) {
  const linked=wikiPlayerName(value); if(linked)return linked;
  if(/\[|\]|\{\{|\}\}|https?:/i.test(value))return null;
  const name=clean(value);
  return /^[\p{L}][\p{L}\p{M} .’'()\-]+$/u.test(name)?{name,article:name}:null;
}
function validDate(year, month, day) {
  if (year < 1900 || year > 2025 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  return new Date(`${iso}T00:00:00Z`).toISOString().slice(0,10) === iso ? iso : null;
}
export function multilingualBirthDate(value, language = 'es') {
  if (language !== 'es') return null;
  for (const template of wikiTemplates(value || '', name => ['edad','fecha','fecha de nacimiento','fecha de nacimiento y edad'].includes(norm(name)))) {
    const numbers = template.parts.filter(part => /^\d+$/.test(part)).map(Number);
    // Spanish Edad and Fecha explicitly use day/month/year.
    if (numbers.length >= 3) {
      const [day,month,year] = numbers;
      const result = validDate(year,month,day); if (result) return result;
    }
  }
  const text = clean(value), months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const literal = text.match(/^(\d{1,2}) de ([a-z]+) de (\d{4})$/i), iso=text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return literal ? validDate(Number(literal[3]), months.indexOf(literal[2].toLowerCase())+1, Number(literal[1])) : iso ? validDate(Number(iso[1]),Number(iso[2]),Number(iso[3])) : null;
}
export function multilingualBiography(text, language = 'es') {
  if(language !== 'es') return null;
  text=text.replace(/<!--[\s\S]*?-->/g,'');
  const template = wikiTemplates(text, name => /^(ficha de deportista|ficha de futbolista)$/.test(norm(name)))[0];
  const f=template?fields(template):{},sport=norm(f.deporte);
  // Some football biographies have no infobox, or leave deporte empty. The
  // first statement about the article subject can corroborate football, but
  // a later mention of a football-playing relative cannot do so.
  const lead=clean(text.slice(template?.end || 0).trim().split(/\n\s*\n|\n==/)[0]);
  const statement=lead.match(/^([^\n]{1,500}?)\b(?:es|fue)\s+([^.!?\n]{1,100})/i);
  const footballLead=Boolean(statement&&!/[.!?]|\b(?:su|sus)\s+(?:hij[oa]s?|herman[oa]s?|padre|madre)\b/i.test(statement[1])&&/^(?:un\s+|una\s+)?futbolista\b/i.test(statement[2]));
  if(sport&&sport!=='futbol')return null;
  if((!template||norm(template.name)!=='ficha de futbolista')&&sport!=='futbol'&&!footballLead)return null;
  const leadDate=footballLead?statement[1].match(/\b\d{1,2} de [a-z]+ de \d{4}\b/i)?.[0]:null;
  return {birthDate:multilingualBirthDate(f['fecha nacimiento'] || f['fecha de nacimiento'] || leadDate || '',language), name:clean(f.nombrecompleto || f['nombre completo'] || f.nombre || '')};
}
export function explicitRosterSeason(value) {
  const match = clean(value).match(/\b((?:19|20)\d{2})(?:\s*[/–-]\s*((?:19|20)\d{2}|\d{2}))?(?!\d)/);
  if(!match) return null;
  const year=Number(match[1]);
  if(year < 1990 || year > 2025) return null;
  if(match[2] && Number(match[2]) !== year+1 && Number(match[2]) !== (year+1)%100) return null;
  return {year,season:match[2]?`${year}/${String(year+1).slice(-2)}`:String(year)};
}
export function parseMultilingualRoster(text, countries = {}, language = 'es', articleContext = {}) {
  if(language !== 'es') return [];
  text=text.replace(/<!--[\s\S]*?-->/g,'');
  const templates=wikiTemplates(text,name => /^(equipo de futbol (inicio|fin)|jugador de futbol|cesiones equipo de futbol)$/.test(rosterTemplateName(name)));
  const headings=[...text.matchAll(/^(={2,6})\s*(.*?)\s*\1\s*$/gm)].map(m=>({start:m.index,level:m[1].length,title:clean(m[2])}));
  const contexts = position => {
    const result=[];
    for(const heading of headings){if(heading.start>position)break;while(result.at(-1)?.level>=heading.level)result.pop();result.push(heading);}
    return result;
  };
  const output=[];
  for(const start of templates.filter(t=>rosterTemplateName(t.name)==='equipo de futbol inicio')){
    const finish=templates.find(t=>t.start>start.start && /equipo de futbol (inicio|fin)/.test(rosterTemplateName(t.name)));
    if(!finish || rosterTemplateName(finish.name)!=='equipo de futbol fin') continue;
    const context=contexts(start.start), f=fields(start);
    if(f.fem || context.some(h=>excludedSection(h.title))) continue;
    const labelled=context.filter(h=>/plantilla|plantel|jugadores|temporada|equipo/i.test(h.title)).map(h=>({label:h.title,...explicitRosterSeason(h.title)})).filter(v=>v.year);
    const fieldSeason=explicitRosterSeason(f.temporada || f.titulo || ''), headingSeason=labelled.at(-1);
    if(fieldSeason && headingSeason && fieldSeason.year!==headingSeason.year) continue;
    const titleSeason=/^Anexo:Temporada\s/i.test(articleContext.pageTitle || '')?explicitRosterSeason(articleContext.pageTitle):null;
    if(titleSeason && [fieldSeason,headingSeason].some(s=>s&&s.year!==titleSeason.year))continue;
    const season=fieldSeason || headingSeason || titleSeason; if(!season) continue;
    const players=[], excluded=new Set();
    for(const row of templates.filter(t=>t.start>start.start && t.end<=finish.start && rosterTemplateName(t.name)==='jugador de futbol')){
      const r=fields(row), context=contexts(row.start);
      const outgoingSection=templates.some(t=>t.start>start.start&&t.start<row.start&&rosterTemplateName(t.name)==='cesiones equipo de futbol');
      const tableGroup=text.slice(start.end,row.start).split('\n').filter(line=>/^\|[^\n]*colspan\s*=/i.test(line)).at(-1) || '';
      if(outgoingSection||excludedSection(tableGroup)||/\{\{\s*cedido\s*\|\s*out\b/i.test(r.nota || '')||/^\s*→/.test(r.procedencia || ''))continue;
      const raw=r.nombre || r.name || '';
      // External profile URLs are not identity evidence, and images are not people.
      if(/\[https?:/i.test(raw) || context.some(h=>excludedSection(h.title))) continue;
      const withoutDecorations=raw.replace(/\[\[(?:Archivo|File|Imagen):[^\]]+\]\]/gi,'').replace(/\{\{[^{}]*\}\}/g,'').replace(/'{2,}/g,'').replace(/\s+\d+\*?\s*$/,'').trim();
      const identity=spanishPlayerName(withoutDecorations); if(!identity)continue;
      const position={POR:'GK',ARQ:'GK',DEF:'DF',MED:'MF',VOL:'MF',DEL:'FW'}[clean(r.pos).toUpperCase()];
      const nationality=countries[norm(r.nac || r.nat)]; if(!position || !nationality)continue;
      const birthDate=multilingualBirthDate(r.edad || '',language);
      const key=norm(identity.article), prior=players.find(p=>norm(p.article)===key);
      if(prior){if(prior.birthDate!==birthDate)excluded.add(key);continue;}
      const number=clean(r.num || r.no || '');
      players.push({...identity, linkedIdentity:/\[\[[^\]]+\]\]/.test(withoutDecorations), birthDate, nationality, position, shirtNumber:/^\d+$/.test(number)?Number(number):null});
    }
    output.push({year:season.year,season:season.season,seasonEvidence:[f.temporada,headingSeason?.label,titleSeason?articleContext.pageTitle:null].filter(Boolean).join(' | '),players:players.filter(p=>!excluded.has(norm(p.article))),conflictingIdentities:[...excluded]});
  }
  // Older Spanish pages use manual squad tables. Require labelled player,
  // nationality and position columns, an explicit local season, and one
  // independent cell per line. Transfer/goal/appearance tables cannot qualify.
  const stripCell=value=>{const parts=splitWikiFields(value.replace(/^[!|]/,''));return parts.length>1&&/(?:style|align|width|rowspan|colspan)\s*=/i.test(parts[0])?parts.slice(1).join('|'):parts.join('|');};
  for(const match of text.matchAll(/\{\|[\s\S]*?\n\|\}/g)){
    const context=contexts(match.index);
    if(context.some(h=>excludedSection(h.title)))continue;
    const label=context.filter(h=>/plantilla|plantel|jugadores|temporada|equipo/i.test(h.title)).at(-1)?.title;
    const season=explicitRosterSeason(label || '') || (/^Anexo:Temporada\s/i.test(articleContext.pageTitle || '')?explicitRosterSeason(articleContext.pageTitle):null);
    if(!season)continue;
    const chunks=match[0].split(/\n\|-/),header=chunks.find(chunk=>/^!/m.test(chunk));
    if(!header)continue;
    const headers=header.split('\n').filter(line=>line.startsWith('!')).flatMap(line=>line.split('!!')).map(cell=>norm(stripCell(cell)));
    const nameIndex=headers.findIndex(h=>/^(nombre|jugador)$/.test(h)),nationalityIndex=headers.findIndex(h=>/^nacionalidad$/.test(h)),positionIndex=headers.findIndex(h=>/^(posicion|pos\.?|demarcacion)$/.test(h));
    const ageIndex=headers.findIndex(h=>/^(edad|nacimiento|fecha de nacimiento)$/.test(h)),numberIndex=headers.findIndex(h=>/^(no\.?|n\.?|dorsal|numero)$/.test(h));
    if(nameIndex<0||nationalityIndex<0||positionIndex<0)continue;
    const players=[],excluded=new Set();
    for(const chunk of chunks){
      if(/^!/m.test(chunk))continue;
      const cells=chunk.split('\n').filter(line=>/^\|(?![}\-+])/.test(line)).map(stripCell);
      if(cells.length!==headers.length)continue;
      const identity=spanishPlayerName(cells[nameIndex]);if(!identity)continue;
      const flag=wikiTemplates(cells[nationalityIndex],name=>/^(bandera|bandera2|flagicon)$/.test(norm(name)))[0];
      const nationality=countries[norm(flag?.parts[0] || cells[nationalityIndex])];
      const positionText=norm(cells[positionIndex]),icon=cells[positionIndex].normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().match(/(?:archivo|file):ficha (portero|defensa|mediocampista|delantero)(?: \(\d+\))?\.jpg/);
      const position={por:'GK',arq:'GK',portero:'GK',guardameta:'GK',def:'DF',defensa:'DF',med:'MF',vol:'MF',mediocampista:'MF',centrocampista:'MF',del:'FW',delantero:'FW'}[icon?.[1] || positionText];
      if(!nationality||!position)continue;
      const birthDate=ageIndex<0?null:multilingualBirthDate(cells[ageIndex],language),key=norm(identity.article),prior=players.find(p=>norm(p.article)===key);
      if(prior){if(prior.birthDate!==birthDate)excluded.add(key);continue;}
      const number=clean(cells[numberIndex]);players.push({...identity,linkedIdentity:/\[\[[^\]]+\]\]/.test(cells[nameIndex]),birthDate,nationality,position,shirtNumber:/^\d+$/.test(number)?Number(number):null});
    }
    if(players.length)output.push({year:season.year,season:season.season,seasonEvidence:label || articleContext.pageTitle,players:players.filter(p=>!excluded.has(norm(p.article))),conflictingIdentities:[...excluded]});
  }
  return output;
}
