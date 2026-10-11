#!/usr/bin/env node
// Targeted, offline repair from the original attributed API snapshots. Running
// this again is idempotent. The shared parser also fixes future full imports.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseWikiMembershipTables,selectWikiParticipants} from './lib/wiki-membership-parser.mjs';

const digest=text=>createHash('sha256').update(text).digest('hex');
const folder='src/games/sports/manager';
const regional=JSON.parse(await readFile(`${folder}/regional-memberships.json`,'utf8'));
const archive=JSON.parse(await readFile(`${folder}/league-memberships.json`,'utf8'));
const report=[];
for(const year of [2010,2011]){
  const entry=regional.seasons[year]['ligapro-serie-a'];
  const title=new URL(entry.source).searchParams.get('title');
  const url=`https://en.wikipedia.org/w/api.php?${new URLSearchParams({action:'parse',page:title,prop:'text|revid',redirects:'1',format:'json'})}`;
  const cache=JSON.parse(await readFile(`.cache/football-manager-regions/${digest(url)}.json`,'utf8'));
  if(digest(cache.text)!==entry.sha256)throw new Error(`Source digest changed: ${year}`);
  const payload=JSON.parse(cache.text).parse;
  if(String(payload.revid)!==entry.revision)throw new Error(`Source revision changed: ${year}`);
  const selected=selectWikiParticipants(parseWikiMembershipTables(payload.text['*']));
  if(!selected.valid||selected.teams.length!==12)throw new Error(`Unexpected extraction: ${year}`);
  const old=entry.teams;
  const teams=selected.teams.map(team=>{
    const match=old.find(item=>item.article===team.article);
    if(!match)throw new Error(`Repair would introduce an unreviewed club: ${team.article}`);
    return match;
  });
  const removed=old.filter(team=>!teams.some(item=>item.clubId===team.clubId));
  if(removed.some(team=>team.name!=='details'||team.article!==`${year} LDU Quito season`))throw new Error('Unexpected removal');
  const updated={...entry,teams,tableContext:selected.tableContext,validation:selected.validation};
  regional.seasons[year]['ligapro-serie-a']=updated;
  archive.seasons[year]['ligapro-serie-a']=updated;
  report.push({year,source:entry.source,revision:entry.revision,sha256:entry.sha256,corroboration:`https://www.rsssf.org/tablese/ecua${year}.html`,before:old,after:teams,removed});
}
for(const [name,data] of [['regional-memberships',regional],['league-memberships',archive]])for(const destination of [folder,'public/data/football-manager'])await writeFile(`${destination}/${name}.json`,JSON.stringify(data)+'\n');
await mkdir('output/manager-v11/audit',{recursive:true});
await writeFile('output/manager-v11/audit/participant-navigation-repair.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.map(row=>({year:row.year,before:row.before.length,after:row.after.length,removed:row.removed})),null,2));
