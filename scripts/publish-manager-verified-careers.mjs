#!/usr/bin/env node
// Validate the reviewed offline preview and publish its attributed evidence.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {unambiguousCareerClub} from './lib/wiki-career-parser.mjs';
import {isPublishableCareerStint} from '../src/games/sports/manager/career-affiliation.js';
const directory='output/manager-v12/careers',folder='src/games/sports/manager';
const archive=JSON.parse(await fs.readFile(`${directory}/verified-player-careers.preview.json`,'utf8'));
let identities={confirmed:[],sources:[]};
try{identities=JSON.parse(await fs.readFile(`${directory}/confirmed-identities.json`,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
const historical=JSON.parse(await fs.readFile(`${folder}/historical-rosters.json`,'utf8'));
const memberships=JSON.parse(await fs.readFile(`${folder}/league-memberships.json`,'utf8'));
const rosterMetadata=JSON.parse(await fs.readFile(`${folder}/wikimedia-rosters.json`,'utf8'));
const metadataSources=new Map();
for(const [year,clubs] of Object.entries(rosterMetadata.seasons))for(const [clubId,record] of Object.entries(clubs))for(const player of record.players){
  const key=`${year}:${clubId}:${player.identityPageId}:${player.position}:${player.nationality}:${player.birthDate}`;
  if(!metadataSources.has(key))metadataSources.set(key,record.source);
}
const byId=new Map(historical.historicalPlayers.map(p=>[p.wikidataId,p]));
const byPage=new Map(identities.confirmed.map(row=>[row.identityPageId,row]));
let trimmed=0,bridged=0,corroboratedYears=0;
const seen=new Set(),byYear={},byLeague={};
for(const player of archive.players){
  if(seen.has(player.identityPageId))throw Error('Duplicate biography identity');seen.add(player.identityPageId);
  if(!/^https:\/\/en.wikipedia.org\/w\/index.php\?oldid=\d+$/.test(player.source)||!/^\d{4}-\d{2}-\d{2}$/.test(player.birthDate)||!['GK','DF','MF','FW'].includes(player.position))throw Error('Invalid career identity');
  const metadataSource=metadataSources.get(`${player.identityMetadataYear}:${player.identityMetadataClubId}:${player.identityPageId}:${player.position}:${player.nationality}:${player.birthDate}`);
  if(!metadataSource)throw Error(`Roster metadata evidence unavailable: ${player.identityPageId}`);
  if(player.identityMetadataSource!==metadataSource)throw Error(`Roster metadata source changed since preview: ${player.identityPageId}`);
  player.eligibleSeasons=player.eligibleSeasons.filter(row=>{
    const club=unambiguousCareerClub({valid:true,stints:player.careerStints},row.year,()=>row.clubId);
    const league=Object.entries(memberships.seasons[row.year]||{}).find(([,record])=>record.teams.some(team=>team.clubId===row.clubId))?.[0];
    if(!club||!isPublishableCareerStint(club.stint,row.year)||!league||club.stint.index!==row.stintIndex||row.year<1990||row.year>2025){trimmed++;return false;}
    byYear[row.year]=(byYear[row.year]||0)+1;byLeague[league]=(byLeague[league]||0)+1;return true;
  });
  const bridge=byPage.get(player.identityPageId);
  if(bridge&&bridge.sitelink===player.sourceTitle){
    player.wikidataId=bridge.wikidataId;player.wikidataIdentitySource=bridge.wikidataIdentitySource;player.wikidataIdentitySha256=bridge.responseSha256;bridged++;
    player.corroboratedArchiveSeasons=player.eligibleSeasons.filter(row=>(byId.get(bridge.wikidataId)?.memberships||[]).some(m=>m.verificationStatus!=='rejected'&&m.rank!=='deprecated'&&m.clubId===row.clubId&&Number(m.start?.value?.slice(0,4))<row.year&&Number(m.end?.value?.slice(0,4))>row.year)).map(row=>row.year);
    corroboratedYears+=player.corroboratedArchiveSeasons.length;
  }
}
archive.players=archive.players.filter(player=>player.eligibleSeasons.length);
archive.revision='2026-10-11-verified-careers-v2';
archive.limitations=[...new Set([...archive.limitations,'All explicit loan spells are excluded: year-only playing-club evidence does not establish the lending club or loan contract.'])];
Object.assign(archive.audit,{players:archive.players.length,playerSeasons:archive.players.reduce((n,p)=>n+p.eligibleSeasons.length,0),clubSeasons:new Set(archive.players.flatMap(p=>p.eligibleSeasons.map(s=>`${s.year}:${s.clubId}`))).size,byYear,byLeague,identityBridges:bridged,independentlyCorroboratedArchivePlayerSeasons:corroboratedYears,trimmedAtPublication:trimmed});
archive.identityBridgeSources=identities.sources;
const text=JSON.stringify(archive)+'\n';
for(const destination of [folder,'public/data/football-manager'])await fs.writeFile(`${destination}/verified-player-careers.json`,text);
await fs.writeFile(`${directory}/published.json`,JSON.stringify({sha256:createHash('sha256').update(text).digest('hex'),bytes:Buffer.byteLength(text),...archive.audit},null,2)+'\n');
console.log(JSON.stringify({players:archive.players.length,playerSeasons:archive.audit.playerSeasons,clubSeasons:archive.audit.clubSeasons,leagues:Object.keys(byLeague).length,bridged,corroboratedYears,trimmed,bytes:Buffer.byteLength(text)},null,2));
