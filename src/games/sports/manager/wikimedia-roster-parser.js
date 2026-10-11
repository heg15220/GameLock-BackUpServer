// Structured facts only. Source attribution and CC BY-SA terms remain on each
// imported roster; the parser itself is original GameLock code.
export function splitWikiFields(text) {
  const fields = []; let buffer = '', braces = 0, links = 0;
  for (let i = 0; i < text.length; i++) {
    const pair = text.slice(i, i + 2);
    if (pair === '{{') { braces++; buffer += pair; i++; }
    else if (pair === '}}') { braces--; buffer += pair; i++; }
    else if (pair === '[[') { links++; buffer += pair; i++; }
    else if (pair === ']]') { links--; buffer += pair; i++; }
    else if (text[i] === '|' && braces === 0 && links === 0) { fields.push(buffer.trim()); buffer = ''; }
    else buffer += text[i];
  }
  fields.push(buffer.trim()); return fields;
}
export function wikiTemplates(text, wanted) {
  const found = []; const stack = [];
  for (let i = 0; i < text.length - 1; i++) {
    if (text.slice(i, i + 2) === '{{') { stack.push(i); i++; }
    else if (text.slice(i, i + 2) === '}}' && stack.length) {
      const start = stack.pop(), raw = text.slice(start + 2, i), separator=raw.indexOf('|');
      // Most templates in a season article are match reports or citations.
      // Avoid splitting every field of those large, irrelevant templates.
      const name=raw.slice(0,separator<0?raw.length:separator).trim();
      if (wanted(name.toLowerCase().replaceAll('_', ' '))) {
        const parts = splitWikiFields(raw);
        const fields = {};
        for (const part of parts.slice(1)) { const equal = part.indexOf('='); if (equal > 0) fields[part.slice(0, equal).trim()] = part.slice(equal + 1).trim(); }
        found.push({ name: parts[0], parts: parts.slice(1), fields, start, end:i+2 });
      }
      i++;
    }
  }
  return found.sort((a, b) => a.start - b.start);
}
const clean = text => String(text || '').replace(/<ref\b[^>]*>[\s\S]*?<\/ref>|<ref\b[^>]*\/>/gi, '').replace(/<[^>]*>/g, '').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/'{2,}/g, '').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').trim();
export function wikiPlayerName(raw, {allowLiteral=false} = {}) {
  const sort = wikiTemplates(raw || '', name => ['sortname', 'sort name'].includes(name))[0];
  if (sort) { const positional=sort.parts.filter(part=>!/^\w+\s*=/.test(part)),name = clean(`${positional[0] || ''} ${positional[1] || ''}`).trim();if(sort.fields.nolink)return allowLiteral?{name,article:null}:null;return { name, article: clean(sort.fields.link || (sort.fields.dab ? `${name} (${sort.fields.dab})` : positional[2]) || name) }; }
  const link = String(raw || '').match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
  if (link) return { name: clean(link[2] || link[1]).replace(/ \([^)]*\)$/, ''), article: link[1] };
  // Plain text is not an identity link. Guessing an article from it can turn a
  // Brazilian academy player named Thierry Henry into the retired French one.
  const name=clean(raw);
  return allowLiteral&&/^[\p{L}\p{M} .’'\-]+$/u.test(name)?{name,article:null}:null;
}
export function wikiBirthDate(text) {
  const templates = wikiTemplates(text, name => /^(age|birth date(?: and age)?|birth-date(?: and age)?|birth date and age2|bda|birthdate and age|dob|dts)$/.test(name));
  for (const template of templates) {
    const numbers = template.parts.filter(part => /^\d+$/.test(part)).map(Number);
    // birth date and age2 starts with the reference date, then the birth date.
    const [year, month, day] = template.name.toLowerCase().replaceAll('_',' ') === 'birth date and age2' ? numbers.slice(3) : numbers;
    if (year >= 1900 && year <= 2025 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date) return date;
    }
  }
  // Older infoboxes sometimes store a literal date in this exact field.
  // Do not let Date.parse search a paragraph or guess an ambiguous 1/2/1980.
  const literalCandidates=[clean(text),...templates.flatMap(template=>template.parts.filter(part=>!part.includes('=')))];
  const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
  for(const candidate of literalCandidates){
    const iso=candidate.match(/^(\d{4})-(\d{2})-(\d{2})$/), english=candidate.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/), american=candidate.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
    const year=Number(iso?.[1]||english?.[3]||american?.[3]),month=iso?Number(iso[2]):months.indexOf((english?.[2]||american?.[1]||'').toLowerCase())+1,day=Number(iso?.[3]||english?.[1]||american?.[2]);
    if(year<1900||year>2025||month<1||month>12||day<1||day>31||!Number.isFinite(year))continue;
    const date=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    if(new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)===date)return date;
  }
  return null;
}
export function wikiPlayerBirthDate(text) {
  // Never read an arbitrary age/death/match template elsewhere in an article.
  const start=text.search(/\{\{\s*infobox[ _]+(?:football|soccer|sportsperson)/i);
  if(start<0)return null;
  let depth=0,end=start;
  for(;end<text.length-1;end++){
    const pair=text.slice(end,end+2);
    if(pair==='{{'){depth++;end++;}
    else if(pair==='}}'){depth--;end++;if(depth===0){end++;break;}}
  }
  const infobox = wikiTemplates(text.slice(start,end), name => /^infobox (football|soccer|sportsperson)/.test(name))[0];
  return infobox?.fields.birth_date ? wikiBirthDate(infobox.fields.birth_date) : null;
}
function wikiSeniorPeriodValues(text) {
  const start=text.search(/\{\{\s*infobox[ _]+(?:football|soccer|sportsperson)/i);
  if(start<0)return [];
  let depth=0,end=start;
  for(;end<text.length-1;end++){
    const pair=text.slice(end,end+2);
    if(pair==='{{'){depth++;end++;}
    else if(pair==='}}'){depth--;end++;if(depth===0){end++;break;}}
  }
  const box=wikiTemplates(text.slice(start,end),name=>/^infobox (football|soccer|sportsperson)/.test(name))[0];
  return Object.entries(box?.fields||{}).filter(([key])=>/^years\d+$/i.test(key)).map(([,value])=>clean(value));
}
export function wikiPlayerSeniorPeriods(text) {
  return wikiSeniorPeriodValues(text).flatMap(value=>{
    const match=value.match(/^(\d{4})(?:\s*[–-]\s*(\d{4}|present)?)?$/i);
    if(!match)return [];
    const from=Number(match[1]),to=/[–-]/.test(value)?(/^\d{4}$/.test(match[2]||'')?Number(match[2]):null):from;
    return to!==null&&to<from?[]:[{from,to}];
  });
}
export function wikiPlayerCareerEvidence(text) {
  const periods=wikiSeniorPeriodValues(text);
  if(!periods.length)return null;
  const closed=periods.map(value=>value.match(/^(\d{4})(?:\s*[–-]\s*(\d{4}))?$/));
  if(closed.some(period=>!period))return null;
  // Closed senior periods are positive career evidence even when the lead says
  // "was a footballer" or describes a current coach instead of saying "former".
  // Include every senior spell: a later return must not be mistaken for a
  // retirement after the first spell. Open or unknown periods prevent this guard.
  if(closed.some(period=>Number(period[2]||period[1])<Number(period[1])))return null;
  return {allSeniorPeriodsClosed:true,lastSeniorYear:Math.max(...closed.map(period=>Number(period[2]||period[1])))};
}
export function wikiPlayerFootballFacts(text) {
  const start=text.search(/\{\{\s*infobox[ _]+(?:football|soccer)[ _]+biography\b/i);
  if(start<0)return null;
  const biography=text.slice(start);
  return {birthDate:wikiPlayerBirthDate(biography),careerEvidence:wikiPlayerCareerEvidence(biography),seniorPeriods:wikiPlayerSeniorPeriods(biography)};
}
export function parseWikiRoster(text, countries = {}, { requireSquadSection = false } = {}) {
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  const positions = { GK: 'GK', G: 'GK', GOALKEEPER: 'GK', DF: 'DF', D: 'DF', CB: 'DF', LB: 'DF', RB: 'DF', LWB: 'DF', RWB: 'DF', SW: 'DF', DEF: 'DF', MF: 'MF', M: 'MF', CM: 'MF', DM: 'MF', AM: 'MF', RM: 'MF', LM: 'MF', MID: 'MF', FW: 'FW', F: 'FW', CF: 'FW', ST: 'FW', RW: 'FW', LW: 'FW', SS: 'FW' };
  const result = [], seen = new Set(), excluded = new Set();
  const staffLabel=value=>!(/\b(?:squad|players|roster|playing staff)\b/i.test(clean(value)))&&/^(?:staff|coaches|coaching|technical team|team management)$|\b(?:coaching|technical|backroom|management|medical)\s+staff\b|\b(?:goalkeeping|goalkeeper|assistant|head|fitness)\s+coach(?:es)?\b/i.test(clean(value));
  const staffRole=value=>staffLabel(value)&&!(/\bplayer[\s/-]*coach\b/i.test(clean(value)));
  const playerKey=player=>player.article||`literal:${player.name}`;
  const headings = [...text.matchAll(/^(={2,6})\s*(.*?)\s*\1\s*$/gm)].map(match => ({ start: match.index, level: match[1].length, title: clean(match[2]) }));
  const explicitPositionGroup = start => {
    const prefix = text.slice(0, start), tableStart = prefix.lastIndexOf('{|');
    if (tableStart < 0 || prefix.lastIndexOf('|}') > tableStart) return null;
    const groups = [...prefix.slice(tableStart).matchAll(/^[!|][^\n]*\|\s*('{0,3})(Goalkeepers|Defenders|Midfielders|Forwards|Strikers|(?:Players )?out on loan|Loaned out|Outgoing loans|On loan|Reserves?|Youth|Academy|Departures|Left the club|Staff|(?:Coaching|Technical|Backroom|Management|Medical) staff|(?:Goalkeeping|Goalkeeper|Assistant|Head|Fitness) coach(?:es)?)\1\s*$/gim)];
    const label=groups.at(-1)?.[2].toLowerCase();
    return {position:{ goalkeepers:'GK', defenders:'DF', midfielders:'MF', forwards:'FW', strikers:'FW' }[label],staff:staffLabel(label),excluded:Boolean(label&&/loan|reserve|youth|academy|departures|left the club/.test(label))};
  };
  for (const template of wikiTemplates(text, name => ['fb si player', 'football squad player', 'football squad player2', 'football squad player sort', 'fs player', 'extended football squad player', 'efs player', 'efs player2', 'efs player3', 'efs player4', 'fb ss player', 'fb ss player 3'].includes(name))) {
    const context=[];
    for(const heading of headings){if(heading.start>template.start)break;while(context.at(-1)?.level>=heading.level)context.pop();context.push(heading);}
    const f = template.fields;
    // This one template explicitly expands first/last into sortname links.
    // The other squad templates render name/p verbatim and require a link.
    const value=template.name.toLowerCase().replaceAll('_',' ')==='football squad player sort'?`{{sortname|${f.name||''}${f.first||''}|${f.last||''}|${f.dab||f.link||''}|nolink=${f.nolink||''}}}`:(f.p||f.name||'');
    const identity = wikiPlayerName(value,{allowLiteral:true});
    if(context.some(h=>staffLabel(h.title))||[f.role,f.job,f.pos,f.notes,f.note,f.other].some(staffRole))continue;
    if(context.some(h => /out on loan|loaned out|loan out|outgoing loans|players on loan|^on loan$|departures|transfers|reserve|youth|b team|academy|goal\s?scorers|top scorers|disciplin|clean sheets|line.?ups/i.test(h.title))){
      if(identity && context.some(h=>/out on loan|loaned out|loan out|outgoing loans|players on loan|^on loan$/i.test(h.title)))excluded.add(playerKey(identity));
      continue;
    }
    if(f.onloan || f.outonloan || /on loan at|on loan to|loan return to/i.test([f.notes,f.note,f.other].filter(Boolean).join(' '))){if(identity)excluded.add(playerKey(identity));continue;}
    if(requireSquadSection && !context.some(h=>/\bsquad\b|\bplayers\b|first[ -]?team|\broster\b|playing staff/i.test(h.title)))continue;
    const tableGroup=explicitPositionGroup(template.start);
    if(tableGroup?.staff)continue;
    if(tableGroup?.excluded){if(identity)excluded.add(playerKey(identity));continue;}
    const position = positions[clean(f.pos).toUpperCase().split(/[\/,\s]/)[0]] || (!f.pos ? tableGroup?.position : null);
    const nat = clean(f.ni || f.nb || f.nat || '').replace(/\[.*$/, '').trim();
    const nationality = countries[nat.toLowerCase()] || (/^[A-Z]{3}$/.test(nat) ? nat : null);
    const birthDate = wikiBirthDate(f.age || f.dob || '');
    if (!identity?.name || !position || !nationality || seen.has(playerKey(identity)) || (!identity.article&&!birthDate)) continue;
    seen.add(playerKey(identity));
    result.push({ ...identity, birthDate, birthYear: birthDate ? Number(birthDate.slice(0, 4)) : null, nationality, position,
      shirtNumber: /^\d+$/.test(f.n || f.no || '') ? Number(f.n || f.no) : null });
  }
  // Table-based season squads are common before template standardisation.
  // Require labelled identity/position columns; never infer a player from a
  // match report, transfer fee table or a list of goalscorers.
  const stripCell = value => {
    const parts = splitWikiFields(value);
    return parts.length > 1 && /(?:style|align|width|rowspan|colspan|class)\s*=/i.test(parts[0]) ? parts.slice(1).join('|') : value.trim();
  };
  const labelText=value=>{
    let text=String(value||'');
    for(const template of wikiTemplates(text,name=>['abbr','tooltip','sort'].includes(name)).reverse()){
      const replacement=template.name.toLowerCase()==='sort'?template.parts[1]:template.parts[0];
      text=text.slice(0,template.start)+(replacement||'')+text.slice(template.end);
    }
    return clean(text);
  };
  const cells = row => row.split(/\r?\n/).filter(line => /^[!|](?![}\-+])/.test(line.trim())).flatMap(line => {
    const raw = line.trim().slice(1).replace(/!!/g, '||');
    // splitWikiFields protects pipes inside nested links and templates.
    const fields = splitWikiFields(raw); const output = []; let pending = '';
    for (let i = 0; i < fields.length; i++) {
      if (i + 1 < fields.length && fields[i + 1] === '') { output.push(stripCell(pending + fields[i])); pending = ''; i++; }
      else if (i === fields.length - 1) output.push(stripCell(pending + fields[i]));
      else pending += `${fields[i]}|`;
    }
    return output;
  });
  const tables = []; const stack = [];
  for (const match of text.matchAll(/^\{\||^\|\}/gm)) {
    if (match[0] === '{|') stack.push(match.index);
    else if (stack.length) { const start = stack.pop(); if (!stack.length) tables.push({ start, text: text.slice(start, match.index) }); }
  }
  for (const table of tables) {
    const context = [];
    for (const heading of headings) { if (heading.start > table.start) break; while (context.at(-1)?.level >= heading.level) context.pop(); context.push(heading); }
    if(context.some(h=>staffLabel(h.title)))continue;
    if (context.some(h => /out on loan|loaned out|loan out|outgoing loans|players on loan|^on loan$|departures|transfers|reserve|youth|b team|academy|goal\s?scorers|top scorers|disciplin|clean sheets|line.?ups/i.test(h.title))) continue;
    if(requireSquadSection && !context.some(h=>/\bsquad\b|\bplayers\b|first[ -]?team|\broster\b|playing staff/i.test(h.title)))continue;
    const rows = table.text.split(/^\|-.*$/m);
    const groupPositions={goalkeepers:'GK',defenders:'DF',midfielders:'MF',forwards:'FW',strikers:'FW'};
    let columns = null, excludedGroup = false, staffGroup=false, positionGroup = null;
    for (const row of rows) {
      if(/colspan\s*=/.test(row) && cells(row).length===1){
        const group=labelText(cells(row)[0]).toLowerCase();
        if(staffLabel(group)){staffGroup=true;continue;}
        positionGroup=groupPositions[group]||null;
        if(/out on loan|loaned out|outgoing loans|^on loan$|reserve|youth|academy|departures|left the club/.test(group)){excludedGroup=true;continue;}
        if(positionGroup){excludedGroup=false;staffGroup=false;continue;}
      }
      if (/^!/m.test(row)) {
        const labels = cells(row).map(value => labelText(value).toLowerCase().replace(/\./g, ''));
        if(labels.some(staffLabel))staffGroup=true;
        if(labels.some(value=>/out on loan|loaned out|outgoing loans|^on loan$|reserve|youth|academy|departures/.test(value)))excludedGroup=true;
        else if(labels.some(value=>/^(?:goalkeepers|defenders|midfielders|forwards|strikers)$/.test(value))){excludedGroup=false;staffGroup=false;}
        const name = labels.findIndex(value => /^(?:name|player|players|player name)$/.test(value));
        const position = labels.findIndex(value => /^(?:pos|position|position\(s\))$/.test(value));
        if (name >= 0) columns = { name, position, role:labels.findIndex(value=>/^(?:role|job|staff role)$/.test(value)), nationality: labels.findIndex(value => /^(?:nat|nationality|nation)$/.test(value)), number: labels.findIndex(value => /^(?:no|number|squad no|#)$/.test(value)), birth: labels.findIndex(value => /date of birth|birth date|birthday|^born$|^age$/.test(value)) };
        continue;
      }
      if (!columns || staffGroup || /on loan (?:to|at)\b/i.test(row)) continue;
      if(columns.position<0&&!positionGroup&&!excludedGroup)continue;
      const values = cells(row), nameCell = values[columns.name];
      if(staffRole(values[columns.role])||staffRole(values[columns.position]))continue;
      if (!nameCell) continue;
      const identity = wikiPlayerName(nameCell.replace(/\{\{(?:flagicon|flag|flagcountry|flagdeco)\|[^}]*\}\}/gi, ''),{allowLiteral:true});
      if(excludedGroup){if(identity)excluded.add(playerKey(identity));continue;}
      let positionRaw = stripCell(values[columns.position] || '');
      const positionTemplate = wikiTemplates(positionRaw, name => ['abbr', 'tooltip', 'small','sort'].includes(name))[0];
      if (positionTemplate) positionRaw = positionTemplate.parts[positionTemplate.name.toLowerCase()==='sort'?1:0];
      const position = columns.position>=0 ? positions[clean(positionRaw).toUpperCase().split(/[\/,\s]/)[0]] : positionGroup;
      const natCell = columns.nationality >= 0 ? values[columns.nationality] || '' : nameCell;
      const flag = wikiTemplates(natCell, name => /^(flagicon|flag|flagcountry|flagdeco|fb|fbicon)$/.test(name))[0];
      const nat = clean(flag?.parts[0] || natCell);
      const nationality = countries[nat.toLowerCase()] || (/^[A-Z]{3}$/.test(nat) ? nat : null);
      if (!identity?.name || !position || !nationality) continue;
      const birthDate = columns.birth >= 0 ? wikiBirthDate(values[columns.birth] || '') : null;
      if(!identity.article&&!birthDate)continue;
      if(seen.has(playerKey(identity))){
        const existing=result.find(player=>playerKey(player)===playerKey(identity));
        if(existing && !existing.birthDate && birthDate){existing.birthDate=birthDate;existing.birthYear=Number(birthDate.slice(0,4));}
        continue;
      }
      seen.add(playerKey(identity));
      const shirt = columns.number >= 0 ? clean(values[columns.number]) : '';
      result.push({ ...identity, birthDate, birthYear: birthDate ? Number(birthDate.slice(0, 4)) : null, nationality, position, shirtNumber: /^\d+$/.test(shirt) ? Number(shirt) : null });
    }
  }
  return result.filter(player=>!excluded.has(playerKey(player)));
}
