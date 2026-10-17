/** Re-parse every added source with the final completeness checks, offline. */
import fs from 'node:fs/promises';
import {parseWikiMembershipTables,selectWikiParticipants} from './lib/wiki-membership-parser.mjs';
import {globalMembershipOptions} from '../src/games/sports/manager/global-leagues.js';
const read=async path=>JSON.parse(await fs.readFile(path,'utf8'));
const root='src/games/sports/manager',cache='output/manager-global/memberships';
const archive=await read(`${root}/league-memberships.json`),regional=await read(`${root}/regional-memberships.json`);
const targets=new Map(), checked=new Set(), rejected=[];
for(const[year,leagues]of Object.entries(archive.seasons))for(const[id,record]of Object.entries(leagues)){
 if(!record.modifications?.startsWith('Names and linked'))continue;
 const key=`${new URL(record.source).hostname}:${record.revision}`;
 if(!targets.has(key))targets.set(key,[]);
 targets.get(key).push({year,id,record});
}
for(const file of await fs.readdir(cache)){
 if(!file.endsWith('.json')||file==='report.json')continue;
 const entry=await read(`${cache}/${file}`);if(!entry.text)continue;
 const page=JSON.parse(entry.text).parse;if(!page?.revid)continue;
 const key=`${new URL(entry.url).hostname}:${page.revid}`;
 if(!targets.has(key)||checked.has(key))continue;
 const parsed=parseWikiMembershipTables(page.text['*']);
 for(const{year,id,record}of targets.get(key)){
  const selected=selectWikiParticipants(parsed,globalMembershipOptions(id,Number(year)));
  const expected=record.teams.map(team=>team.identityCorrection?.originalArticle||team.originalArticle||team.article).sort();
  const actual=selected.teams?.map(team=>team.article).sort();
  if(!selected.valid||JSON.stringify(expected)!==JSON.stringify(actual)){
   rejected.push({year,id,source:record.source,reason:selected.reason||'participant-set-changed',previousCount:expected.length,currentCount:actual?.length,tableCounts:selected.tableCounts});
   if(process.argv.includes('--repair')){delete archive.seasons[year][id];delete regional.seasons[year]?.[id];}
  }else{
   record.validation=selected.validation;
   if(regional.seasons[year]?.[id])regional.seasons[year][id].validation=selected.validation;
  }
 }
 checked.add(key);
 if(checked.size%100===0)console.log(`Checked ${checked.size}/${targets.size} source revisions`);
}
const missing=[...targets.keys()].filter(key=>!checked.has(key));
await fs.writeFile('output/manager-global/membership-verification.json',JSON.stringify({checked:checked.size,sourceRevisions:targets.size,rejected,missing},null,2));
if(missing.length)throw Error(`Uncached source revisions: ${missing.length}`);
if(process.argv.includes('--repair'))for(const[name,value]of[['league-memberships',archive],['regional-memberships',regional]])for(const directory of[root,'public/data/football-manager']){
 const path=`${directory}/${name}.json`;await fs.writeFile(`${path}.tmp`,JSON.stringify(value)+'\n');
 for(let attempt=0;;attempt++){try{await fs.rename(`${path}.tmp`,path);break;}catch(error){if(!['EPERM','EBUSY','EACCES'].includes(error.code)||attempt>=119)throw error;await new Promise(resolve=>setTimeout(resolve,500));}}
}
console.log(JSON.stringify({checked:checked.size,rejected:rejected.length,missing:missing.length}));
if(rejected.length&&!process.argv.includes('--repair'))process.exitCode=1;
