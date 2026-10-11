import {describe,it,expect} from 'vitest';
import archive from './league-memberships.json';
import historicalResults from './historical-results.json';
import {world} from '../trayectoria/world.js';
import {getAvailableYears,getAvailableLeagues,getLeagueSeasonCoverage,getSeasonParticipants,getUnavailableLeagues,managerLeagueCatalog} from './league-memberships.js';
import {createMembershipClubResolver,parseMembershipCsv,validateSeasonParticipants} from './membership-providers.js';
import {getManagerWorld} from './data.js';

const ids=(id,year)=>getSeasonParticipants(id,year).map(team=>team.clubId);
const resolveId=createMembershipClubResolver(world,historicalResults);
const roundRobin=(count)=>Array.from({length:count},(_,i)=>Array.from({length:count-i-1},(_,j)=>({team1:`Team ${i}`,team2:`Team ${i+j+1}`}))).flat();

describe('documented league participants',()=>{
  it('offers only backed combinations, exposes every catalog gap and immutable source evidence',()=>{
    expect(managerLeagueCatalog).toHaveLength(51);
    expect(getAvailableYears()).toEqual(Array.from({length:36},(_,index)=>1990+index));
    expect(getAvailableYears('liga-dominicana-de-futbol')).toContain(2025);
    expect(getAvailableYears('liga-dominicana-de-futbol').every(year=>year>=2015)).toBe(true);
    expect(getLeagueSeasonCoverage('liga-mx',1990).available).toBe(false);
    for(const year of getAvailableYears()){
      expect(getAvailableLeagues(year).length+getUnavailableLeagues(year).length).toBe(51);
      for(const league of getAvailableLeagues(year)){
        const coverage=getLeagueSeasonCoverage(league.id,year);
        expect(coverage.clubCount).toBe(ids(league.id,year).length);
        if(coverage.license==='CC0-1.0'){
          expect(coverage.source).toMatch(/^https:\/\/raw\.githubusercontent\.com\//);
          expect(coverage.revision).toMatch(/^[a-f0-9]{40}$/);
        }else{
          expect(coverage.license).toBe('CC-BY-SA-4.0');
          expect(coverage.source).toMatch(/^https:\/\/(?:en|es|fr)\.wikipedia\.org\/w\/index\.php\?.*oldid=\d+/);
          expect(coverage.revision).toMatch(/^\d+$/);
          expect(coverage.attribution).toContain('Contributors');
          expect(coverage.licenseUrl).toBe('https://creativecommons.org/licenses/by-sa/4.0/');
          expect(coverage.historyUrl).toContain('action=history');
        }
        expect(archive.seasons[year][league.id].sha256).toMatch(/^[a-f0-9]{64}$/);
        expect(league.selectable&&league.simulated&&league.historicalMembership).toBe(true);
      }
    }
  });

  it('uses complete regional fields and keeps distinct tournament editions visible',()=>{
    for(const id of ['copa-de-primera','liga-bolivia','liga-de-primera','liga-futve','liga-uruguaya','liga1','ligapro-serie-a','primera-nacional','primera-division-costa-rica','hon-liga-nacional','liga-nacional-guatemala','slv-primera-division','liga-primera-de-nicaragua','liga-dominicana-de-futbol','pan-primera-division'])expect(getLeagueSeasonCoverage(id,2025).available,id).toBe(true);
    expect(ids('liga-nacional-guatemala',2025)).toHaveLength(12);
    expect(ids('hon-liga-nacional',2025)).toHaveLength(11);
    expect(ids('slv-primera-division',2024)).toHaveLength(11);
    expect(ids('liga-bolivia',2023)).toHaveLength(17);
    expect(ids('primera-nacional',2025)).toHaveLength(36);
    expect(getLeagueSeasonCoverage('pan-primera-division',2025).edition).toBe('Clausura');
    expect(getLeagueSeasonCoverage('primera-division-costa-rica',2025).edition).toBe('Apertura');
    expect(getAvailableLeagues(2025).find(league=>league.id==='primera-division-costa-rica').calendar).toBe('split');
    expect(ids('liga1',1990)).toHaveLength(44);
    expect(ids('liga1',1991)).toHaveLength(41);
  });

  it('reconstructs Spanish 1990 and 2009, not the present catalog or a relegation guess',()=>{
    expect(ids('laliga',1990)).toHaveLength(20);
    expect(ids('laliga',1990)).toEqual(expect.arrayContaining(['real-burgos','cd-logrones','castellon']));
    expect(ids('laliga',1990)).not.toContain('villarreal');
    expect(ids('laliga',1995)).toHaveLength(22);
    expect(ids('laliga',1996)).toHaveLength(22);
    expect(ids('laliga',2009)).toEqual(expect.arrayContaining(['xerez-cd','tenerife','deportivo-la-coruna']));
    expect(ids('laliga',2009)).not.toContain('elche');
    expect(ids('laliga',2025)).toContain('oviedo');
  });

  it('retains documented changes of league size and starts MLS only in its inaugural year',()=>{
    expect(ids('premier-league',1994)).toHaveLength(22);
    expect(ids('premier-league',1995)).toHaveLength(20);
    expect(ids('bundesliga',1990)).toHaveLength(18);
    expect(ids('bundesliga',1991)).toHaveLength(20);
    expect(ids('usa-mls',1995)).toEqual([]);
    expect(ids('usa-mls',1996)).toHaveLength(10);
    expect(ids('liga-profesional',2025)).toHaveLength(30);
    expect(getAvailableLeagues(2025).find(league=>league.id==='brasileirao')).toMatchObject({calendar:'annual',seasonLabel:'2025'});
    expect(getAvailableLeagues(2025).find(league=>league.id==='laliga')).toMatchObject({calendar:'split',seasonLabel:'2025/26'});
  });

  it('does not confuse clubs sharing a city or a name and reuses existing crest identities',()=>{
    expect(resolveId('Guadalajara','ESP','laliga-2')).not.toBe('guadalajara-chivas');
    expect(ids('laliga-2',2012)).not.toContain('guadalajara-chivas');
    expect(ids('liga-mx',2012)).toContain('guadalajara-chivas');
    expect(resolveId('Estudiantes','ARG','liga-profesional')).toBe('estudiantes');
    expect(ids('liga-profesional',2025)).toContain('estudiantes');
    expect(ids('liga-profesional',2025)).not.toContain('ca-estudiantes');
    expect(ids('brasileirao',2025)).toEqual(expect.arrayContaining(['palmeiras','flamengo','corinthians','atletico-mg']));
    expect(ids('por-primeira-liga',2025)).toEqual(expect.arrayContaining(['benfica','sporting-braga','estoril']));
    expect(ids('eredivisie',2025)).toEqual(expect.arrayContaining(['feyenoord','psv','twente','zwolle']));
    expect(resolveId('Lazio Roma','ITA','serie-a')).toBe('lazio');
    for(const year of [2012,2013,2025])expect(ids('serie-a',year)).toContain('lazio');
    expect(ids('primera-nacional',1997)).toContain('arg-almirante-brown-de-arrecifes');
    expect(ids('primera-nacional',1997)).toContain('almirante-brown');
    expect(ids('primera-nacional',1997)).toHaveLength(32);
    expect(ids('primera-nacional',2012)).toContain('almirante-brown');
  });

  it('every simulated league exactly equals its source list, with no current-catalog remainder',()=>{
    let auditedCombinations=0;
    for(const year of getAvailableYears()){
      const snapshot=getManagerWorld(year);
      const participantOwnership=new Map();
      for(const league of snapshot.competitions.filter(competition=>competition.simulated!==false)){
        const members=snapshot.clubs.filter(club=>club.competitionId===league.id).map(club=>club.id).sort();
        expect(members).toEqual(ids(league.id,year).sort());
        for(const clubId of members){
          expect(participantOwnership.has(clubId),`${year}: ${clubId} in two divisions`).toBe(false);
          participantOwnership.set(clubId,league.id);
        }
        auditedCombinations++;
      }
      for(const club of snapshot.clubs.filter(club=>club.selectable===false)){
        expect(club.competitionId).toMatch(/^external:/);
        expect(snapshot.competitions.find(competition=>competition.id===club.competitionId).simulated).toBe(false);
        expect(snapshot.players.some(player=>player.clubId===club.id&&player.real)).toBe(true);
      }
      expect(snapshot.coverage.totalLeagues+snapshot.coverage.unavailableLeagues.length).toBe(51);
      expect(new Set(snapshot.clubs.map(club=>club.id)).size).toBe(snapshot.clubs.length);
    }
    expect(auditedCombinations).toBe(1223);
  });
});

describe('participant importer validation',()=>{
  it('parses quoted CSVs and strips match-count annotations from historical names',()=>{
    expect(parseMembershipCsv('\uFEFFDate,Team 1,FT,Team 2\r\n1990,"Club, Norte (1)",1-0,"Club ""Sur"" (2)"\r\n')).toEqual([{team1:'Club, Norte',team2:'Club "Sur"'}]);
    expect(()=>parseMembershipCsv('Team 1,Team 2\n"Unfinished,x')).toThrow('Unclosed');
  });
  it('rejects truncated and mixed calendars instead of claiming a complete participant list',()=>{
    const resolver=name=>name;
    expect(validateSeasonParticipants(roundRobin(10),resolver,'ESP').valid).toBe(true);
    expect(validateSeasonParticipants(roundRobin(10).filter(match=>match.team1!=='Team 0'||match.team2==='Team 1'),resolver,'ESP').valid).toBe(false);
    expect(validateSeasonParticipants([...roundRobin(10),{team1:'Outsider',team2:'Team 0'}],resolver,'ESP').valid).toBe(false);
    expect(validateSeasonParticipants([{team1:'A',team2:'B'}],()=> 'same-id','ESP').reason).toBe('identity-collision');
  });
  it('excludes only documented playoff outsiders and ignores unassigned final placeholders',()=>{
    const matches=[...roundRobin(16),{team1:'Challenger 1',team2:'Team 14'},{team1:'Challenger 2',team2:'Team 15'},{team1:'N.N.',team2:'N.N.'}];
    const result=validateSeasonParticipants(matches,name=>name,'RUS',{expectedCount:16,regularSeasonCount:16});
    expect(result.valid).toBe(true);
    expect(result.teams).toHaveLength(16);
    expect(result.validation.excludedPlayoffChallengers).toHaveLength(2);
    expect(ids('liga-premier-de-rusia',2012)).toHaveLength(16);
  });
});
