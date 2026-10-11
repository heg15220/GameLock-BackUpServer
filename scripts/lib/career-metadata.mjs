import {isUnambiguousCareerArticle} from './wiki-career-parser.mjs';

/** Metadata may come from a season-long list, including a winter arrival.
 * This validates identity context only; it never establishes a starting squad.
 * Conflicting nationalities among compatible observations remain quarantined.
 */
export function validateCareerMetadata(parsed, observations, resolveClub) {
  if (!parsed.valid) return {valid:false,reason:'invalid-biography',observations:[],excluded:observations};
  const birthDates=new Set(observations.map(row=>row.player.birthDate));
  if(birthDates.size!==1||!birthDates.has(parsed.birthDate))return {valid:false,reason:'conflicting-birth-date',observations:[],excluded:observations};
  const accepted=[],excluded=[];
  for(const row of observations){
    const lastYear=/^\d{4}[-/–]\d{2,4}$/.test(row.season||'')?row.year+1:row.year;
    const supported=parsed.stints.some(stint=>isUnambiguousCareerArticle(stint.article)&&stint.from<=lastYear&&(stint.to===null||stint.to>=row.year)&&resolveClub(stint.article,row.year)===row.clubId);
    (supported?accepted:excluded).push(row);
  }
  if(!accepted.length)return {valid:false,reason:'no-career-compatible-metadata',observations:accepted,excluded};
  if(new Set(accepted.map(row=>row.player.nationality)).size!==1)return {valid:false,reason:'conflicting-nationality',observations:accepted,excluded};
  return {valid:true,selected:accepted[0],observations:accepted,excluded};
}
