#!/usr/bin/env node
/** Resolve missing full names to dated male footballer identities, never club claims. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const folder='output/manager-v9/open-sources',offline=process.argv.includes('--offline');
await mkdir(`${folder}/identity-cache`,{recursive:true});
const digest=s=>createHash('sha256').update(s).digest('hex');
async function get(url){
  const path=`${folder}/identity-cache/${digest(url)}.json`;
  try{return JSON.parse(await readFile(path,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  if(offline)throw new Error('Missing identity cache');
  await new Promise(r=>setTimeout(r,1400));
  let response;
  for(let i=0;i<3;i++){response=await fetch(url,{signal:AbortSignal.timeout(45000),headers:{'User-Agent':'GameLock-OpenFootball-Identity-Audit/1.0'}});if(response.ok)break;if(response.status!==429&&response.status<500)throw new Error(`HTTP ${response.status}`);await new Promise(r=>setTimeout(r,30000));}
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const text=await response.text(),record={url,text,fetchedAt:new Date().toISOString(),sha256:digest(text)};await writeFile(path,JSON.stringify(record));return record;
}
const audit=JSON.parse(await readFile(`${folder}/cc0-roster-audit.json`,'utf8'));
const names=[...new Set(audit.unresolved.map(row=>row.name).filter(name=>name.trim().includes(' ')&&!name.includes('?')))].sort();
const nameIds=new Map(),querySources=[];
for(let i=0;i<names.length;i+=40){
  const batch=names.slice(i,i+40),record=await get('https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageprops&ppprop=wikibase_item&titles='+encodeURIComponent(batch.join('|'))),data=JSON.parse(record.text).query;
  if(!data)throw new Error('Invalid title lookup');
  const aliases=new Map([...(data.normalized||[]),...(data.redirects||[])].map(r=>[r.from,r.to])),pages=new Map(Object.values(data.pages).map(p=>[p.title,p]));
  for(const name of batch){let title=name;const seen=new Set();while(aliases.has(title)&&!seen.has(title)){seen.add(title);title=aliases.get(title);}const page=pages.get(title);if(page?.pageprops?.wikibase_item)nameIds.set(name,page.pageprops.wikibase_item);}
  querySources.push({source:record.url,sha256:record.sha256});console.log('Titles',Math.min(i+40,names.length),names.length);
}
const ids=[...new Set(nameIds.values())],entities={};
for(let i=0;i<ids.length;i+=40){const record=await get('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims%7Clabels%7Cinfo&languages=en&ids='+ids.slice(i,i+40).join('|'));Object.assign(entities,JSON.parse(record.text).entities);console.log('Entities',Math.min(i+40,ids.length),ids.length);}
const value=(claim)=>claim?.mainsnak?.datavalue?.value;
const countryIds=[...new Set(Object.values(entities).flatMap(e=>(e.claims?.P27||[]).map(c=>value(c)?.id)).filter(Boolean))],countries={};
for(let i=0;i<countryIds.length;i+=40){const record=await get('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids='+countryIds.slice(i,i+40).join('|'));Object.assign(countries,JSON.parse(record.text).entities);}
const world=JSON.parse(await readFile('src/games/sports/trayectoria/world.data.json','utf8'));
const byIso=Object.fromEntries(Object.values(world.countries).map(c=>[c.iso2,c.fifa]));
const british={Q21:'ENG',Q22:'SCO',Q25:'WAL',Q26:'NIR'};
const players=[],rejected=[];
for(const [name,id] of nameIds){
  const e=entities[id],claims=e?.claims||{};
  if(!(claims.P106||[]).some(c=>value(c)?.id==='Q937857')||!(claims.P21||[]).some(c=>value(c)?.id==='Q6581097')){rejected.push({name,id,reason:'not-explicit-male-association-football-player'});continue;}
  const births=(claims.P569||[]).filter(c=>c.rank!=='deprecated').map(value).filter(v=>v?.precision===11&&/^\+\d{4}-\d\d-\d\dT/.test(v.time)).map(v=>v.time.slice(1,11));
  if(new Set(births).size!==1){rejected.push({name,id,reason:'missing-or-conflicting-exact-birthdate'});continue;}
  const nationality=(claims.P27||[]).filter(c=>c.rank!=='deprecated').map(c=>value(c)?.id).map(q=>british[q]||byIso[value(countries[q]?.claims?.P297?.[0])]).find(code=>world.countries[code]);
  if(!nationality){rejected.push({name,id,reason:'no-supported-nationality'});continue;}
  const birthDate=births[0];
  players.push({name,wikidataId:id,birthDate,birthYear:Number(birthDate.slice(0,4)),nationality,identitySource:`https://www.wikidata.org/w/index.php?title=${id}&oldid=${e.lastrevid}`,identityRevision:e.lastrevid,license:'CC0-1.0'});
}
// Subsequent runs target remaining unresolved names; retain previously proven identities.
// A changed birth date remains a second candidate and is rejected as ambiguous downstream.
let existing=[];
try{existing=JSON.parse(await readFile('src/games/sports/manager/cc0-player-identities.json','utf8')).players||[];}catch(error){if(error.code!=='ENOENT')throw error;}
const merged=new Map([...existing,...players].map(p=>[`${p.name}|${p.wikidataId}|${p.birthDate}|${p.nationality}`,p]));
const result={schemaVersion:1,license:'CC0-1.0',generatedAt:new Date().toISOString(),scope:'Dated identities only; no affiliation claims are consumed.',players:[...merged.values()]};
await writeFile('src/games/sports/manager/cc0-player-identities.json',JSON.stringify(result)+'\n');
await writeFile('public/data/football-manager/cc0-player-identities.json',JSON.stringify(result)+'\n');
await writeFile(`${folder}/identity-audit.json`,JSON.stringify({requested:names.length,resolved:players.length,rejected,querySources},null,2));
console.log(JSON.stringify({requested:names.length,resolved:players.length,rejected:rejected.length}));
