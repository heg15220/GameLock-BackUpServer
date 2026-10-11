import {wikiTemplates,wikiBirthDate} from '../../src/games/sports/manager/wikimedia-roster-parser.js';

const clean=value=>String(value||'').replace(/<!--[\s\S]*?-->/g,'').replace(/<ref\b[^>]*>[\s\S]*?<\/ref>|<ref\b[^>]*\/>/gi,'').replace(/&nbsp;|&#160;/g,' ').trim();
export const careerArticleKey=value=>String(value||'').replaceAll('_',' ').normalize('NFC').trim().toLowerCase();
const genericClubArticles=new Set(['nacional','libertad','racing','unión','union','independiente','universidad católica','everton','barcelona','rangers','sporting']);
export const isUnambiguousCareerArticle=article=>Boolean(article)&&!genericClubArticles.has(careerArticleKey(article));

/** Only the explicit senior football infobox; national, youth and coaching
 * careers never establish registration at a playable senior club. */
export function parseWikiSeniorCareer(text){
  const start=text.search(/\{\{\s*infobox[ _]+(?:football|soccer)[ _]+biography\b/i);
  if(start<0)return {valid:false,reason:'no-football-biography'};
  let depth=0,end=start;
  for(;end<text.length-1;end++){const pair=text.slice(end,end+2);if(pair==='{{'){depth++;end++;}else if(pair==='}}'){depth--;end++;if(!depth){end++;break;}}}
  const template=wikiTemplates(text.slice(start,end).replace(/<!--[\s\S]*?-->/g,''),name=>/^infobox (football|soccer) biography$/.test(name))[0];
  if(!template)return {valid:false,reason:'malformed-biography'};
  const f=template.fields,birthDate=wikiBirthDate(f.birth_date||''),stints=[];
  const indices=[...new Set(Object.keys(f).flatMap(key=>/^(?:years|clubs)(\d+)$/.exec(key)?.slice(1)||[]))].sort((a,b)=>a-b);
  for(const index of indices){
    const years=clean(f[`years${index}`]),club=clean(f[`clubs${index}`]);
    const match=/^(\d{4})(?:\s*[–—-]\s*(\d{4})?)?$/.exec(years);
    const links=[...club.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)];
    // An unreadable dated senior stint could overlap any candidate year.
    if(!match||!club)return {valid:false,reason:'unresolved-senior-stint',index,years,club};
    const from=Number(match[1]),to=match[2]?Number(match[2]):/[-–—]/.test(years)?null:from;
    if(from<1900||(to!==null&&to<from))return {valid:false,reason:'invalid-senior-interval'};
    stints.push({index:Number(index),article:links.length===1?links[0][1].trim():null,...(links.length!==1?{unresolvedClub:club}:{}),from,to,loan:/loan|→|\{\{\s*to\b/i.test(club),years});
  }
  return {valid:Boolean(birthDate&&stints.length),reason:!birthDate?'missing-birth-date':!stints.length?'no-senior-stints':null,birthDate,stints};
}

/** A year must be strictly inside a closed source interval. All senior stints
 * (including unknown/reserve clubs and loans) remain potential blockers. We do
 * not manufacture July/September dates from calendar-year precision. */
export function unambiguousCareerClub(parsed,year,resolveClub){
  if(!parsed.valid)return null;
  const possible=parsed.stints.filter(s=>year>=s.from&&(s.to===null||year<=s.to));
  const sure=possible.filter(s=>s.to!==null&&year>s.from&&year<s.to);
  if(sure.length!==1||possible.length!==1)return null;
  const stint=sure[0],clubId=isUnambiguousCareerArticle(stint.article)?resolveClub(stint.article):null;
  return clubId?{clubId,stint}:null;
}
