#!/usr/bin/env node
// Compare conservative career evidence; counts never imply complete squads.
import fs from 'node:fs/promises';
const dir='output/manager-v12/careers';
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const [next,initial,checkpoint,audit,aliases]=await Promise.all([
  `${dir}/verified-player-careers.preview.json`,`${dir}/verified-player-careers.initial.json`,
  `${dir}/verified-player-careers.checkpoint2.json`,`${dir}/audit.json`,`${dir}/career-club-alias-evidence.json`,
].map(read));
const rows=archive=>new Set(archive.players.flatMap(p=>p.eligibleSeasons.map(s=>`${p.identityPageId}:${s.year}:${s.clubId}`)));
const nextIds=new Map(next.players.map(p=>[p.identityPageId,p]));
const rejected=new Map(audit.rejectedRows.map(p=>[p.pageId,p]));
const compare=old=>{
  const oldIds=new Map(old.players.map(p=>[p.identityPageId,p])),oldRows=rows(old),newRows=rows(next);
  const removed=old.players.filter(p=>!nextIds.has(p.identityPageId)).map(p=>({identityPageId:p.identityPageId,name:p.name,reason:rejected.get(p.identityPageId)?.reason||'not-in-catalogue-or-no-eligible-years',detail:rejected.get(p.identityPageId),previousSeasons:p.eligibleSeasons}));
  const reasonCounts={};for(const p of removed)reasonCounts[p.reason]=(reasonCounts[p.reason]||0)+1;
  return {beforePlayers:old.players.length,afterPlayers:next.players.length,addedPlayers:next.players.filter(p=>!oldIds.has(p.identityPageId)).length,removedPlayers:removed.length,
    addedPlayerSeasons:[...newRows].filter(key=>!oldRows.has(key)).length,removedPlayerSeasons:[...oldRows].filter(key=>!newRows.has(key)).length,reasonCounts,removed};
};
const checkpointRows=rows(checkpoint),aliasImpact=[];
for(const alias of aliases.aliases){
  const recovered=[];
  for(const p of next.players)for(const s of p.eligibleSeasons){
    if(s.clubId===alias.clubId&&p.careerStints.find(stint=>stint.index===s.stintIndex)?.article===alias.article&&!checkpointRows.has(`${p.identityPageId}:${s.year}:${s.clubId}`))
      recovered.push({identityPageId:p.identityPageId,name:p.name,year:s.year,source:p.source});
  }
  aliasImpact.push({...alias,newPlayerSeasons:recovered.length,players:new Set(recovered.map(p=>p.identityPageId)).size,recovered});
}
const report={initial:compare(initial),checkpoint2:compare(checkpoint),aliasImpact,
  attributionCaveat:'Alias impact counts observations newly usable versus checkpoint2; new biography availability may also contribute. It is not an isolated causal benchmark.'};
try{report.beforeRetirementSourceCorrection=compare(await read(`${dir}/verified-player-careers.pre-retirement-source.json`));}
catch(error){if(error.code!=='ENOENT')throw error;}
await fs.writeFile(`${dir}/final-career-delta.json`,JSON.stringify(report,null,2)+'\n');
const summary=({removed,...rest})=>rest;
console.log(JSON.stringify({initial:summary(report.initial),checkpoint2:summary(report.checkpoint2),beforeRetirementSourceCorrection:report.beforeRetirementSourceCorrection&&summary(report.beforeRetirementSourceCorrection),aliasImpact:aliasImpact.map(({recovered,...rest})=>rest)},null,2));
