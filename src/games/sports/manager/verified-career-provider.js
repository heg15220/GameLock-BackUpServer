import archive from './verified-player-careers.json';
import {isPublishableCareerStint} from './career-affiliation.js';

// Preserve one source per record: combining players into a single invented
// roster URL would conceal their distinct biographies and date precision.
const recordsByYear=new Map();
export function getVerifiedCareerRecords(year){
  if(recordsByYear.has(Number(year)))return recordsByYear.get(Number(year));
  const records=[];
  for(const player of archive.players||[]){
    const membership=player.eligibleSeasons.find(row=>row.year===Number(year));
    if(!membership)continue;
    const stint=player.careerStints.find(row=>row.index===membership.stintIndex);
    if(!isPublishableCareerStint(stint,year))continue;
    records.push([membership.clubId,{
      source:player.source,sourceId:'wikimedia-verified-career',sourceSha256:player.sourceSha256,revision:player.sourceRevision,
      license:archive.license,licenseUrl:archive.licenseUrl,
      attribution:`Contributors to English Wikipedia: ${player.sourceTitle}; revision ${player.sourceRevision}. Senior career facts adapted by GameLock.`,
      precision:'year-interior',scope:'individual-career',complete:false,season:String(year),
      modifications:'Only unambiguous interior calendar years of closed senior spells; all loans, transition years and overlapping reserve spells excluded.',
      players:[{name:player.name,birthDate:player.birthDate,birthYear:player.birthYear,nationality:player.nationality,position:player.position,
        identityPageId:player.identityPageId,identitySource:player.identitySource,
        ...(player.wikidataId?{wikidataId:player.wikidataId}:{}),
        source:player.source,identityMetadataSource:player.identityMetadataSource,stintFrom:stint.from,stintTo:stint.to,careerEvidencePrecision:'year-interior'}],
    }]);
  }
  recordsByYear.set(Number(year),records);return records;
}

export const verifiedCareerArchiveInfo={revision:archive.revision,players:archive.players?.length||0,precision:archive.precision,complete:false};
