import archive from './league-memberships.json';
import {world} from '../trayectoria/world.js';
import {managerCompetitionExtensions} from './competitions.js';

export const membershipArchiveRevision=archive.revision;
export const managerLeagueCatalog=[...Object.values(world.competitions),...managerCompetitionExtensions];
const catalog=new Map(managerLeagueCatalog.map(league=>[league.id,league]));

export function getLeagueSeasonCoverage(competitionId,year){
  const record=archive.seasons[String(year)]?.[competitionId];
  if(!record)return {available:false,competitionId,year:Number(year),clubCount:0,
    reason:catalog.has(competitionId)?'No hay una lista completa de participantes contrastada para esta temporada.':'Liga fuera del catálogo.'};
  return {available:true,competitionId,year:Number(year),season:record.season,seasonLabel:record.season.replace('-','/')+(record.edition?` · ${record.edition}`:''),edition:record.edition??null,
    source:record.source,license:record.license,sourceId:record.sourceId,revision:record.revision,
    licenseUrl:record.licenseUrl??null,attribution:record.attribution??null,historyUrl:record.historyUrl??null,
    stages:(record.stages??[]).map(stage=>({name:stage.name,clubCount:stage.clubIds.length})),
    clubCount:record.teams.length,validation:record.validation,reason:null};
}

export function getAvailableYears(competitionId){
  return Object.keys(archive.seasons).filter(year=>competitionId?!!archive.seasons[year][competitionId]:Object.keys(archive.seasons[year]).length>0).map(Number).sort((a,b)=>a-b);
}

export function getAvailableLeagues(year){
  return managerLeagueCatalog.filter(league=>archive.seasons[String(year)]?.[league.id]).map(league=>{
    const coverage=getLeagueSeasonCoverage(league.id,year);
    return {...league,historicalMembership:true,simulated:true,selectable:true,membershipSource:coverage.source,seasonLabel:coverage.seasonLabel,calendar:coverage.season.includes('-')?'split':'annual',membershipCoverage:coverage};
  });
}

export function getSeasonParticipants(competitionId,year){
  return (archive.seasons[String(year)]?.[competitionId]?.teams??[]).map(team=>({...team}));
}

export function getUnavailableLeagues(year){
  return managerLeagueCatalog.filter(league=>!archive.seasons[String(year)]?.[league.id]).map(league=>({id:league.id,name:league.name,country_fifa_code:league.country_fifa_code,...getLeagueSeasonCoverage(league.id,year)}));
}
