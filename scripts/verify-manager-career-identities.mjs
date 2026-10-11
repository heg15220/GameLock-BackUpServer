#!/usr/bin/env node
// Resolve research candidates through actual Wikidata enwiki sitelinks. A
// name+DOB candidate is never promoted without this independent identity key.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const directory='output/manager-v12/careers',cache=`${directory}/wikidata-cache`;
await fs.mkdir(cache,{recursive:true});
const audit=JSON.parse(await fs.readFile(`${directory}/audit.json`,'utf8'));
const preview=JSON.parse(await fs.readFile(`${directory}/verified-player-careers.preview.json`,'utf8'));
const byPage=new Map(preview.players.map(p=>[p.identityPageId,p]));
const digest=text=>createHash('sha256').update(text).digest('hex');
const candidates=audit.historicalCandidates,confirmed=[],rejected=[],sources=[];
if(process.argv.includes('--offline')){
  const wanted=new Map(candidates.map(c=>[c.wikidataId,c]));
  for(const file of await fs.readdir(cache)){
    if(!file.endsWith('.json'))continue;
    const record=JSON.parse(await fs.readFile(`${cache}/${file}`,'utf8'));
    if(digest(record.text)!==record.sha256)throw Error('Identity cache digest mismatch');
    sources.push({url:record.url,sha256:record.sha256,fetchedAt:record.fetchedAt});
    for(const entity of Object.values(JSON.parse(record.text).entities||{})){
      const candidate=wanted.get(entity.id),player=candidate&&byPage.get(candidate.identityPageId);if(!player)continue;
      if(entity.sitelinks?.enwiki?.title===player.sourceTitle&&Number.isInteger(entity.lastrevid))confirmed.push({identityPageId:player.identityPageId,wikidataId:entity.id,wikidataRevision:entity.lastrevid,wikidataIdentitySource:`https://www.wikidata.org/w/index.php?title=${entity.id}&oldid=${entity.lastrevid}`,sitelink:entity.sitelinks.enwiki.title,responseSha256:record.sha256});
      else rejected.push({...candidate,reason:'wikidata-sitelink-not-identical',actualTitle:entity.sitelinks?.enwiki?.title});
      wanted.delete(entity.id);
    }
  }
  await fs.writeFile(`${directory}/confirmed-identities.json`,JSON.stringify({license:'CC0-1.0',sources,confirmed,rejected},null,2)+'\n');
  console.log(JSON.stringify({confirmed:confirmed.length,rejected:rejected.length,candidates:candidates.length}));
  process.exit(0);
}
for(let at=0;at<candidates.length;at+=50){
  const batch=candidates.slice(at,at+50),ids=[...new Set(batch.map(p=>p.wikidataId))];
  const url=`https://www.wikidata.org/w/api.php?${new URLSearchParams({action:'wbgetentities',ids:ids.join('|'),props:'sitelinks|info',sitefilter:'enwiki',format:'json'})}`;
  const file=`${cache}/${digest(url)}.json`;let record;
  try{record=JSON.parse(await fs.readFile(file,'utf8'));}catch{
    if(process.argv.includes('--offline'))continue;
    const response=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{'User-Agent':'GameLock-Manager-CareerResearch/1.0 (attributed public archival facts)'}});
    if(!response.ok)throw Error(`Wikidata ${response.status}; partial cache preserved`);
    const text=await response.text();record={url,text,sha256:digest(text),fetchedAt:new Date().toISOString()};
    await fs.writeFile(file,JSON.stringify(record));await new Promise(resolve=>setTimeout(resolve,1000));
  }
  const entities=JSON.parse(record.text).entities;if(!entities)throw Error('Invalid Wikidata response');
  sources.push({url:record.url,sha256:record.sha256,fetchedAt:record.fetchedAt});
  for(const candidate of batch){
    const entity=entities[candidate.wikidataId],player=byPage.get(candidate.identityPageId);
    if(entity?.sitelinks?.enwiki?.title===player?.sourceTitle&&entity.id===candidate.wikidataId&&Number.isInteger(entity.lastrevid)){
      confirmed.push({identityPageId:player.identityPageId,wikidataId:entity.id,wikidataRevision:entity.lastrevid,wikidataIdentitySource:`https://www.wikidata.org/w/index.php?title=${entity.id}&oldid=${entity.lastrevid}`,sitelink:entity.sitelinks.enwiki.title,responseSha256:record.sha256});
    }else rejected.push({...candidate,reason:'wikidata-sitelink-not-identical',actualTitle:entity?.sitelinks?.enwiki?.title});
  }
  if(at%500===0)console.log(`Checked ${Math.min(at+50,candidates.length)}/${candidates.length} identity candidates`);
}
await fs.writeFile(`${directory}/confirmed-identities.json`,JSON.stringify({license:'CC0-1.0',sources,confirmed,rejected},null,2)+'\n');
console.log(JSON.stringify({confirmed:confirmed.length,rejected:rejected.length,candidates:candidates.length}));
