import { describe,it,expect } from 'vitest';
import { parseOpenFootballSquad,parseLegacyOpenFootballSquad,extractHistoricalRoster,historicalRosterQuery,auditHistoricalMemberships } from './roster-providers.js';
import { playerClubAtDate } from './providers.js';
import { getManagerWorld } from './data.js';
import rosters from './historical-rosters.json';
import { world } from '../trayectoria/world.js';
import { createManagerCareer } from './engine.js';

describe('expanded open historical rosters',()=>{
  it('parses real roster facts without confusing former clubs, positions or coaches',()=>{
    const rows=parseOpenFootballSquad('= FC Example\n 9, Kylian Mbappé (FRA), FW, b. 1998, AS Monaco\n 27, Lamine Yamal, FW, b. 2007, Barcelona B\n -, Coach, MG, b. 1980, Example','ESP');
    expect(rows).toEqual([
      {name:'Kylian Mbappé',nationality:'FRA',position:'FW',birthYear:1998,shirtNumber:9},
      {name:'Lamine Yamal',nationality:'ESP',position:'FW',birthYear:2007,shirtNumber:27},
    ]);
  });
  it('recovers 2014 season lists without inventing births or resolving homonyms by the first match',()=>{
    const row={name:'Example Player',wikidataId:'Q1',birthYear:1980,birthDate:'1980-01-01'};
    const text='1 (c) Example Player (ESP) GK 2010-\n2 Missing Person DF\n3 Ambiguous Name MF';
    const parsed=parseLegacyOpenFootballSquad(text,'ENG',[row,{...row,wikidataId:'Q2',name:'Ambiguous Name'},{...row,wikidataId:'Q3',name:'Ambiguous Name'}]);
    expect(parsed.players).toHaveLength(1);
    expect(parsed.players[0]).toMatchObject({name:'Example Player',birthYear:1980,nationality:'ESP',wikidataId:'Q1'});
    expect(parsed.unresolved.map(p=>p.reason)).toEqual(['missing-dated-identity','ambiguous-identity']);
    expect(Object.keys(rosters.seasons[2014])).toHaveLength(5);
    const united=rosters.seasons[2014]['manchester-united'];
    expect(united.precision).toBe('season');
    expect(united.players.find(p=>p.name==='Ángel Di María')).toMatchObject({nationality:'ARG',birthYear:1988});
    expect(united.players.find(p=>p.name==='Ángel Di María').identitySource).toBeTruthy();
    expect(united.players.find(p=>p.name==='Wayne Rooney')).toMatchObject({birthYear:1985});
    expect(rosters.seasons[2014]['manchester-city'].players.find(p=>p.name==='Sergio Agüero')).toMatchObject({birthYear:1988});
    const playable=getManagerWorld(2014).players;
    expect(playable.find(p=>p.name==='Ángel Di María')).toMatchObject({clubId:'manchester-united',birthDate:'1988-02-14',membershipPrecision:'season',identitySourceUrl:united.players.find(p=>p.name==='Ángel Di María').identitySource});
    expect(playable.find(p=>p.name==='Wayne Rooney')).toMatchObject({clubId:'manchester-united',age:28});
  });
  it('joins an existing editorial identity without using its old club or merging conflicting births',()=>{
    const text='7 Ángel Di María (ARG) MF 2014-';
    const identity={name:'Ángel Di María',birthYear:1988,birthDate:'1988-02-14',identitySource:'https://example.org/official-profile'};
    const result=parseLegacyOpenFootballSquad(text,'ENG',[identity,{...identity,clubId:'real-madrid'}]);
    expect(result.players).toHaveLength(1);
    expect(result.players[0]).toMatchObject({birthYear:1988,identitySource:identity.identitySource});
    expect(result.players[0].clubId).toBeUndefined();
    expect(parseLegacyOpenFootballSquad(text,'ENG',[identity,{...identity,birthDate:'1988-06-01'}]).players).toHaveLength(0);
  });
  it('keeps uncertain dates and never equates British citizenship with a constituent national team',()=>{
    const val=value=>({value});
    const rows=extractHistoricalRoster([{p:val('http://www.wikidata.org/entity/Q1'),label:val('Player'),dob:val('1980-01-01T00:00:00Z'),iso:val('GB'),position:val('http://www.wikidata.org/entity/Q193592'),start:val('2001-01-01T00:00:00Z'),sp:val('9'),end:val('2006-06-01T00:00:00Z'),ep:val('10')}],'arsenal',world.countries);
    expect(rows[0]).toMatchObject({nationality:'GBR',position:'MF',memberships:[{clubId:'arsenal',start:{value:'2001',precision:'year'},end:{value:'2006-06',precision:'month'}}]});
    expect(()=>historicalRosterQuery('Q1; arbitrary')).toThrow();
  });
  it('bundles ninety real 2023/24 club lists and dated historical identities with source hashes',()=>{
    expect(rosters.license).toBe('CC0-1.0');
    expect(Object.keys(rosters.seasons[2023])).toHaveLength(90);
    expect(Object.values(rosters.seasons[2023]).reduce((sum,c)=>sum+c.players.length,0)).toBeGreaterThan(3000);
    expect(rosters.historicalPlayers.length).toBeGreaterThan(5000);
    for(const club of Object.values(rosters.seasons[2023])){
      expect(club.source).toMatch(/^https:\/\/raw\.githubusercontent\.com\/openfootball\/.+\/[a-f0-9]{40}\//);
      expect(club.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(club.precision).toBe('season');
      expect(club.license).toBe('CC0-1.0');
    }
  });
  it('exposes source precision, authentic young players and final per-club coverage',()=>{
    const data=getManagerWorld(2023);
    expect(data.coverage.realPlayers).toBeGreaterThan(3000);
    expect(data.coverage.seasonRosterClubs).toBe(90);
    expect(data.coverage.importedRealPlayers).toBeGreaterThan(3000);
    expect(data.players.find(p=>p.name==='Pau Cubarsí')).toMatchObject({clubId:'barcelona',real:true,age:16,source:'openfootball-squad',membershipPrecision:'season'});
    expect(data.players.find(p=>p.name==='Ethan Nwaneri')).toMatchObject({clubId:'arsenal',real:true,age:16});
    // One documented teenager must not cap an otherwise undocumented senior attack.
    expect(data.players.find(p=>p.id==='ferran-torres').rating).toBeGreaterThan(70);
    const barcelona=data.clubs.find(c=>c.id==='barcelona');
    expect(barcelona.crest).toBe(world.clubs.barcelona.crest);
    expect(barcelona.rosterCoverage.realPlayers).toBe(data.players.filter(p=>p.clubId==='barcelona'&&p.real).length);
    expect(barcelona.rosterCoverage.precision).toBe('season');
    expect(data.coverage.catalogLeagues).toBe(51);
    const selectable=data.competitions.filter(competition=>competition.simulated!==false&&competition.selectable!==false);
    expect(selectable).toHaveLength(46);
    expect(data.coverage.totalLeagues).toBe(selectable.length);
    expect(data.coverage.unavailableLeagues).toHaveLength(5);
    for(const competition of selectable){
      expect(competition.historicalMembership).toBe(true);
      expect(competition.membershipCoverage.available).toBe(true);
      const clubs=data.clubs.filter(club=>club.competitionId===competition.id);
      expect(clubs.length).toBeGreaterThan(1);
      expect(clubs).toHaveLength(competition.membershipCoverage.clubCount);
      expect(clubs.every(club=>club.selectable!==false)).toBe(true);
    }
    for(const competition of data.competitions.filter(entry=>!selectable.includes(entry))){
      expect(competition).toMatchObject({simulated:false,selectable:false});
      expect(competition.id).toMatch(/^external:/);
      expect(data.clubs.filter(club=>club.competitionId===competition.id).every(club=>club.selectable===false)).toBe(true);
    }
  });
  it('preserves curated eras without activating unreviewed historical claims',()=>{
    for(const year of [1990,1998,2006,2012,2025]){
      const data=getManagerWorld(year);
      expect(data.players.some(p=>p.source==='wikidata-history')).toBe(false);
      expect(data.players.filter(p=>p.real).every(p=>p.birthYear<=year-16)).toBe(true);
    }
  });
  it('quarantines the systemic source problem and records the three reported contradictions',()=>{
    expect(rosters.membershipAudit.policy).toBe('independent-evidence-required');
    expect(rosters.membershipAudit.quarantinedMemberships).toBeGreaterThan(13000);
    expect(rosters.membershipAudit.rejectedMemberships).toBe(3);
    expect(rosters.membershipAudit.auditedEntities).toHaveLength(3);
    for(const id of ['Q969146','Q654903']){
      const player=rosters.historicalPlayers.find(p=>p.wikidataId===id);
      expect(player.memberships.find(m=>m.clubId==='real-madrid')).toMatchObject({verificationStatus:'rejected',auditReason:'contradicted-by-primary-club-record'});
      expect(player.memberships.some(m=>!m.clubId&&m.teamWikidataId)).toBe(true);
      for(const year of [2012,2013,2014,2025])expect(playerClubAtDate(player,`${year}-09-03`)).toBeNull();
    }
    expect(rosters.historicalPlayers.find(p=>p.wikidataId==='Q38136')).toMatchObject({name:'Marcelo',nationality:'BRA'});
    const input={historicalPlayers:[{wikidataId:'Q999999',memberships:[{clubId:'real-madrid',start:{value:'2011',precision:'year'},end:null}]}]};
    auditHistoricalMemberships(input);
    expect(playerClubAtDate(input.historicalPlayers[0],'2013-09-03')).toBeNull();
    expect(input.historicalPlayers[0].memberships[0].auditReason).toBe('independent-evidence-not-reviewed');
  });
  it('rejects a source team QID mismatch without matching it by a similar club name',()=>{
    const val=value=>({value});
    const [player]=extractHistoricalRoster([{p:val('http://www.wikidata.org/entity/Q1'),team:val('http://www.wikidata.org/entity/Q7156'),label:val('Example'),dob:val('1980-01-01T00:00:00Z'),iso:val('ES'),position:val('http://www.wikidata.org/entity/Q193592'),start:val('2011-01-01T00:00:00Z'),sp:val('9')}],'real-madrid',world.countries);
    expect(player.memberships[0]).toMatchObject({verificationStatus:'rejected',auditReason:'club-entity-mismatch'});
  });
  it('keeps the men’s Barcelona 2012 lineup and does not turn undocumented reserves into stars',()=>{
    const career=createManagerCareer({year:2012,clubId:'barcelona',seed:'historical-lineup'});
    const players=career.world.players,barcelona=players.filter(p=>p.clubId==='barcelona');
    expect(players.some(p=>p.name==='Florencia Quiñones')).toBe(false);
    expect(barcelona.filter(p=>/Adriano Correia/.test(p.name))).toHaveLength(1);
    const firstTeam=career.lineup.map(id=>players.find(p=>p.id===id).name);
    expect(firstTeam).toContain('Víctor Valdés');
    expect(firstTeam).toContain('Gerard Piqué');
    expect(firstTeam).toContain('Sergio Busquets');
    for(const name of ['Andreu Fontàs','Oier Olazábal','Isaac Cuenca']){
      const p=barcelona.find(player=>player.name===name);
      if(p)expect(p.rating).toBeLessThan(85);
      expect(firstTeam).not.toContain(name);
    }
    expect(rosters.historicalPlayers.every(p=>p.gender==='male')).toBe(true);
  });
});
