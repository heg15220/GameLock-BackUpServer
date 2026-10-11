#!/usr/bin/env node
/** Resolve full-name disambiguation pages using CC0 identities, never team affiliations. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {identityKey} from '../src/games/sports/manager/cc0-roster-parser.js';
import {selectDatedFootballIdentity} from '../src/games/sports/manager/cc0-identity-disambiguation.js';
const dir='output/manager-v10/open-sources',offline=process.argv.includes('--offline');
await mkdir(`${dir}/cache`,{recursive:true});
const digest=s=>createHash('sha256').update(s).digest('hex');
async function get(url){
  const path=`${dir}/cache/${digest(url)}.json`;
  try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  if(offline)throw new Error(`Missing cache ${url}`);
  await new Promise(done=>setTimeout(done,1700));
  let r;
  for(let attempt=0;attempt<3;attempt++){
    r=await fetch(url,{signal:AbortSignal.timeout(45000),headers:{'User-Agent':'GameLock-CC0-Identity-Research/2.0'}});
    if(r.ok)break;
    if(r.status!==429&&r.status<500)throw new Error(`HTTP ${r.status}`);
    await new Promise(done=>setTimeout(done,30000));
  }
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  const text=await r.text(),record={url,text,sha256:digest(text),fetchedAt:new Date().toISOString()};
  await writeFile(path,JSON.stringify(record));return record;
}
let targets;
try{targets=JSON.parse(await readFile(`${dir}/disambiguation-targets.json`,'utf8'));}catch(e){
  if(e.code!=='ENOENT')throw e;
  const audit=JSON.parse(await readFile('output/manager-v9/open-sources/cc0-roster-audit.json','utf8')),counts=new Map();
  for(const row of audit.unresolved){if(!identityKey(row.name).includes(' '))continue;const current=counts.get(row.name)||{name:row.name,years:[],rows:0};current.years.push(row.year);current.rows++;counts.set(row.name,current);}
  targets=[...counts.values()].sort((a,b)=>b.rows-a.rows||a.name.localeCompare(b.name)).slice(0,140).map(r=>({...r,years:[...new Set(r.years)]}));
  await writeFile(`${dir}/disambiguation-targets.json`,JSON.stringify(targets,null,2));
}
const matches=new Map(),searches=[];
for(let i=0;i<targets.length;i+=20){
  const batch=targets.slice(i,i+20),pages=new Map(),aliases=new Map(),evidence=[];
  let continuation={};
  do{
    const params=new URLSearchParams({action:'query',format:'json',redirects:'1',prop:'links',plnamespace:'0',pllimit:'max',titles:batch.map(t=>t.name).join('|'),...continuation});
    const record=await get('https://en.wikipedia.org/w/api.php?'+params),response=JSON.parse(record.text),data=response.query;
    if(!data?.pages)throw new Error('Invalid disambiguation response');
    for(const row of [...(data.normalized||[]),...(data.redirects||[])])aliases.set(row.from,row.to);
    for(const page of Object.values(data.pages)){const links=pages.get(page.title)||new Set([page.title]);for(const link of page.links||[])links.add(link.title);pages.set(page.title,links);}
    evidence.push({source:record.url,sourceSha256:record.sha256});continuation=response.continue||{};
  }while(Object.keys(continuation).length);
  for(const target of batch){
    let canonical=target.name;const visited=new Set();while(aliases.has(canonical)&&!visited.has(canonical)){visited.add(canonical);canonical=aliases.get(canonical);}
    const titles=[...(pages.get(canonical)||[])].filter(t=>identityKey(t.replace(/\s*\([^)]*\)\s*$/,''))===identityKey(target.name));
    matches.set(target.name,titles);searches.push({name:target.name,evidence,titles,method:'complete-name-page-links'});
  }
  console.log('Disambiguation pages',Math.min(i+20,targets.length),targets.length);
}
const titles=[...new Set([...matches.values()].flat())],titleIds=new Map();
for(let i=0;i<titles.length;i+=40){
  const record=await get('https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageprops&ppprop=wikibase_item&titles='+encodeURIComponent(titles.slice(i,i+40).join('|'))),data=JSON.parse(record.text).query;
  const aliases=new Map([...(data.normalized||[]),...(data.redirects||[])].map(r=>[r.from,r.to])),pages=new Map(Object.values(data.pages).map(p=>[p.title,p]));
  for(const title of titles.slice(i,i+40)){let canonical=title;const visited=new Set();while(aliases.has(canonical)&&!visited.has(canonical)){visited.add(canonical);canonical=aliases.get(canonical);}const id=pages.get(canonical)?.pageprops?.wikibase_item;if(id)titleIds.set(title,id);}
}
const ids=[...new Set(titleIds.values())],entities={};
for(let i=0;i<ids.length;i+=40){const record=await get('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims%7Clabels%7Cinfo&languages=en&ids='+ids.slice(i,i+40).join('|'));Object.assign(entities,JSON.parse(record.text).entities);console.log('Entities',Math.min(i+40,ids.length),ids.length);}
const value=c=>c?.mainsnak?.datavalue?.value,claims=(e,p)=>(e?.claims?.[p]||[]).filter(c=>c.rank!=='deprecated');
const countryIds=[...new Set(Object.values(entities).flatMap(e=>[...claims(e,'P27'),...claims(e,'P1532')].map(c=>value(c)?.id)).filter(Boolean))],countries={};
for(let i=0;i<countryIds.length;i+=40){const record=await get('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids='+countryIds.slice(i,i+40).join('|'));Object.assign(countries,JSON.parse(record.text).entities);}
const world=JSON.parse(await readFile('src/games/sports/trayectoria/world.data.json','utf8')),iso=Object.fromEntries(Object.values(world.countries).map(c=>[c.iso2,c.fifa])),british={Q21:'ENG',Q22:'SCO',Q25:'WAL',Q26:'NIR'};
const accepted=[],rejected=[];
for(const target of targets){
  const candidates=[...new Set(matches.get(target.name).map(t=>titleIds.get(t)).filter(Boolean))].map(id=>entities[id]);
  const nationality=e=>[...claims(e,'P1532'),...claims(e,'P27')].map(c=>value(c)?.id).map(q=>british[q]||iso[value(claims(countries[q],'P297')[0])]).find(n=>world.countries[n]);
  const result=selectDatedFootballIdentity(target.name,target.years,candidates,nationality);
  if(result.player)accepted.push(result.player);else rejected.push({name:target.name,reason:result.reason,candidates:result.candidates});
}
const path='src/games/sports/manager/cc0-player-identities.json',previous=JSON.parse(await readFile(path,'utf8'));
const merged=new Map([...previous.players,...accepted].map(p=>[`${p.name}|${p.wikidataId}|${p.birthDate}|${p.nationality}`,p]));
previous.players=[...merged.values()];previous.generatedAt=new Date().toISOString();
for(const target of [path,'public/data/football-manager/cc0-player-identities.json'])await writeFile(target,JSON.stringify(previous)+'\n');
await writeFile(`${dir}/disambiguation-audit.json`,JSON.stringify({requested:targets.length,accepted,rejected,searches},null,2));
console.log(JSON.stringify({requested:targets.length,accepted:accepted.length,rejected:rejected.length,identities:merged.size}));
