#!/usr/bin/env node
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {parseWikiSeniorCareer,unambiguousCareerClub,isUnambiguousCareerArticle} from './lib/wiki-career-parser.mjs';
import {isPublishableCareerStint} from '../src/games/sports/manager/career-affiliation.js';
const preview=process.argv.includes('--preview');
const path=preview?'output/manager-v12/careers/verified-player-careers.preview.json':'src/games/sports/manager/verified-player-careers.json';
const text=await fs.readFile(path,'utf8'),archive=JSON.parse(text),memberships=JSON.parse(await fs.readFile('src/games/sports/manager/league-memberships.json','utf8'));
if(!preview)assert.equal(text,await fs.readFile('public/data/football-manager/verified-player-careers.json','utf8'));
assert.equal(archive.license,'CC-BY-SA-4.0');assert.equal(archive.complete,false);
const identities=new Set(),wikidataIds=new Set(),clubSamples=new Map(),sampleBiographies=[];
if(preview){
  const buffon=archive.players.find(player=>player.name==='Gianluigi Buffon');
  assert(buffon?.eligibleSeasons.some(row=>row.year===2022&&row.clubId==='parma'),'Documented Buffon at Parma 2022 must survive veteran age validation');
  const murphy=archive.players.find(player=>player.identityPageId===2419956);
  assert(murphy?.birthDate==='1981-08-21'&&murphy.eligibleSeasons.some(row=>row.year===2025&&row.clubId==='tranmere-rovers'),'Imported Joe Murphy at Tranmere 2025 must survive veteran validation');
  for(const retiredIdentity of [1777522,47921978,38409009,7543774])assert(!archive.players.some(player=>player.identityPageId===retiredIdentity&&player.eligibleSeasons.some(row=>row.year-player.birthYear>43)),'Retired namesake/coach cannot be a veteran registration');
}
let playerSeasons=0,loanSeasons=0,linkedIdentities=0;
for(const player of archive.players){
  assert(!identities.has(player.identityPageId));identities.add(player.identityPageId);
  if(player.wikidataId){assert(!wikidataIds.has(player.wikidataId));wikidataIds.add(player.wikidataId);linkedIdentities++;}
  const years=new Set();
  for(const record of player.eligibleSeasons){
    assert(record.year-player.birthYear>=16&&record.year-player.birthYear<=65,'Career outside data-validation age bounds');
    assert(!years.has(record.year));years.add(record.year);
    const selected=unambiguousCareerClub({valid:true,stints:player.careerStints},record.year,()=>record.clubId);
    assert(selected&&selected.stint.index===record.stintIndex);
    assert(isPublishableCareerStint(selected.stint,record.year),'Loan ownership or closed interval not established');
    assert(isUnambiguousCareerArticle(selected.stint.article));
    const owners=Object.entries(memberships.seasons[record.year]||{}).filter(([,league])=>league.teams.some(t=>t.clubId===record.clubId));
    assert.equal(owners.length,1);playerSeasons++;loanSeasons+=Number(selected.stint.loan);
    if(/libertad|nacional|racing|independiente|barcelona|rangers|everton|universidad cat/i.test(selected.stint.article)){
      const key=`${selected.stint.article}:${record.clubId}:${owners[0][0]}`;
      if(!clubSamples.has(key))clubSamples.set(key,{article:selected.stint.article,clubId:record.clubId,league:owners[0][0],player:player.name,year:record.year,source:player.source});
    }
  }
  if(['Lionel Messi','Cristiano Ronaldo','Juan Carlos Valerón','Gonzalo Bergessio','Nani','Javier Saviola','Manuel Almunia','Thierry Henry'].includes(player.name)){
    const key=createHash('sha256').update(player.sourceTitle).digest('hex');
    const cached=[];for(const suffix of ['.json','.json.gz']){try{const raw=await fs.readFile(`output/manager-v8/wikimedia-cache/${key}${suffix}`);cached.push(JSON.parse((suffix.endsWith('.gz')?gunzipSync(raw):raw).toString('utf8')));}catch{}}
    if(!cached.length)continue;
    const source=cached.find(row=>String(row.revision)===player.sourceRevision);assert(source,'Pinned biography revision missing from cache');
    assert.equal(source.pageId,player.identityPageId);assert.equal(String(source.revision),player.sourceRevision);
    assert.equal(createHash('sha256').update(source.text).digest('hex'),player.sourceSha256);
    const parsed=parseWikiSeniorCareer(source.text);assert(parsed.valid);assert.deepEqual(parsed.stints,player.careerStints);
    sampleBiographies.push({name:player.name,source:player.source,sha256:player.sourceSha256,stints:parsed.stints,eligibleSeasons:player.eligibleSeasons});
  }
}
const report={sha256:createHash('sha256').update(text).digest('hex'),identities:identities.size,playerSeasons,linkedIdentities,loanSeasons,preview,mirrorIdentical:preview?null:true,allRowsHaveOneClosedInteriorStint:true,allClubYearsHaveOneParticipantLeague:true,sampleBiographies,homonymClubSamples:[...clubSamples.values()]};
await fs.writeFile(`output/manager-v12/careers/${preview?'preview-':''}adversarial-review.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,sampleBiographies:sampleBiographies.length,homonymClubSamples:clubSamples.size},null,2));
