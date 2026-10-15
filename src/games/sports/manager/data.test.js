import { describe,it,expect } from 'vitest';
import { getManagerWorld,getAvailableYears,dataSources } from './data.js';
import { world } from '../trayectoria/world.js';

const findPlayer=(snapshot,name)=>snapshot.players.find(player=>player.name===name);
const members=(snapshot,league)=>snapshot.clubs.filter(club=>club.competitionId===league).map(club=>club.id);

describe('football manager historical data',()=>{
  it('builds the current 2026/27 world with that season’s participants and documented players',()=>{
    const snapshot=getManagerWorld(2026);
    expect(snapshot.year).toBe(2026);
    expect(members(snapshot,'laliga')).toHaveLength(20);
    expect(members(snapshot,'laliga')).toEqual(expect.arrayContaining(['deportivo-la-coruna','racing-santander','malaga']));
    const barcelona=snapshot.clubs.find(club=>club.id==='barcelona');
    expect(barcelona.rosterCoverage.realPlayers).toBeGreaterThan(15);
    const imported=snapshot.players.filter(player=>player.clubId==='barcelona'&&player.source==='wikimedia-season-squad');
    expect(imported.length).toBeGreaterThan(15);
    expect(snapshot.players.filter(player=>player.clubId==='barcelona'&&player.real).length).toBeGreaterThan(15);
    for(const player of imported)expect(player.membershipSeason).toBe('2026/27');
    expect(()=>getManagerWorld(2027)).toThrow(RangeError);
  });
  it('puts the requested 2012 stars and prospects in their era-specific clubs',()=>{
    const snapshot=getManagerWorld(2012);
    expect(findPlayer(snapshot,'Lionel Messi')).toMatchObject({clubId:'barcelona',real:true,rating:96});
    expect(findPlayer(snapshot,'Cristiano Ronaldo')).toMatchObject({clubId:'real-madrid',real:true});
    expect(findPlayer(snapshot,'Arjen Robben')).toMatchObject({clubId:'bayern-munchen',real:true});
    expect(findPlayer(snapshot,'Neymar')).toMatchObject({clubId:'santos',age:20});
    expect(findPlayer(snapshot,'Paul Pogba')).toMatchObject({clubId:'juventus',age:19});
    expect(findPlayer(snapshot,'Isco')).toMatchObject({clubId:'malaga',age:20});
    expect(findPlayer(snapshot,'Philippe Coutinho').clubId).toBe('inter');
    expect(findPlayer(snapshot,'Jan Oblak').clubId).toBe('rio-ave');
    expect(findPlayer(snapshot,'Harry Kane')).toMatchObject({clubId:'norwich',age:19,rating:63});
    expect(findPlayer(snapshot,'Kevin De Bruyne')).toMatchObject({clubId:'werder-bremen',age:21});
    expect(findPlayer(snapshot,'Diego Costa').nationality).toBe('BRA');
    expect(findPlayer(snapshot,'Geoffrey Kondogbia').nationality).toBe('FRA');
    expect(findPlayer(snapshot,'Lamine Yamal')).toBeUndefined();
    expect(findPlayer(snapshot,'Kylian Mbappé')).toBeUndefined();
  });
  it('uses 2025 clubs and plausible teenage prospects, without Messi or Robben at their 2012 clubs',()=>{
    const snapshot=getManagerWorld(2025);
    expect(findPlayer(snapshot,'Kylian Mbappé').clubId).toBe('real-madrid');
    expect(findPlayer(snapshot,'Lamine Yamal')).toMatchObject({clubId:'barcelona',age:18});
    expect(findPlayer(snapshot,'Erling Haaland').clubId).toBe('manchester-city');
    expect(findPlayer(snapshot,'Lionel Messi').clubId).toBe('inter-miami');
    expect(findPlayer(snapshot,'Arjen Robben')).toBeUndefined();
    expect(findPlayer(snapshot,'Désiré Doué')).toMatchObject({clubId:'paris-saint-germain',age:20});
    expect(findPlayer(snapshot,'Estêvão')).toMatchObject({clubId:'chelsea',age:18});
    expect(findPlayer(snapshot,'Alexander Isak').clubId).toBe('liverpool');
    expect(findPlayer(snapshot,'Kylian Mbappé').value).toBeGreaterThan(100000000);
    expect(findPlayer(snapshot,'Lamine Yamal').value).toBeGreaterThan(80000000);
  });
  it('reconstructs league membership instead of copying the current division',()=>{
    const historical=getManagerWorld(2012),modern=getManagerWorld(2025);
    expect(members(historical,'laliga')).toHaveLength(20);
    expect(members(historical,'laliga')).toContain('real-zaragoza');
    expect(members(historical,'laliga')).toContain('malaga');
    expect(members(historical,'laliga')).not.toContain('villarreal');
    expect(members(modern,'laliga')).toContain('villarreal');
    expect(members(modern,'laliga')).toContain('oviedo');
    expect(members(modern,'laliga')).not.toContain('deportivo-la-coruna');
    expect(members(historical,'premier-league')).toHaveLength(20);
    expect(members(historical,'premier-league')).toContain('reading');
    expect(members(historical,'premier-league')).not.toContain('bournemouth');
    expect(members(historical,'bundesliga')).toHaveLength(18);
    expect(members(historical,'serie-a')).toHaveLength(20);
    expect(members(historical,'ligue-1')).toHaveLength(20);
    expect(historical.clubs.find(c=>c.id==='inter-miami')).toBeUndefined();
    expect(getManagerWorld(1990).clubs.find(c=>c.id==='rb-leipzig')).toBeUndefined();
  });
  it('has deterministic independent state and reuses existing crests and trophies',()=>{
    const first=getManagerWorld(2012),second=getManagerWorld(2012);
    expect(first).toEqual(second);
    const barcelona=first.clubs.find(c=>c.id==='barcelona');
    expect(barcelona.crest).toBe(world.clubs.barcelona.crest);
    expect(first.competitions.find(c=>c.id==='laliga').trophy).toBe(world.competitions.laliga.trophy);
    barcelona.playerIds.length=0;
    expect(second.clubs.find(c=>c.id==='barcelona').playerIds.length).toBeGreaterThan(21);
    expect(world.clubs.barcelona.playerIds).toBeUndefined();
  });
  it('keeps every squad and its players consistent across the entire selectable range',()=>{
    for(const year of getAvailableYears()) {
      const snapshot=getManagerWorld(year);
      const playerIds=new Set(snapshot.players.map(p=>p.id));
      expect(playerIds.size).toBe(snapshot.players.length);
      const clubs=new Map(snapshot.clubs.map(c=>[c.id,c]));
      const ownerIds=snapshot.clubs.flatMap(c=>c.playerIds);
      expect(new Set(ownerIds).size).toBe(snapshot.players.length);
      for(const club of snapshot.clubs) {
        expect(club.playerIds.length).toBeGreaterThanOrEqual(22);
        expect(club.budget).toBeGreaterThan(0);
      }
      for(const player of snapshot.players) {
        if(player.age<16||player.birthYear>year||!Number.isFinite(player.rating)||player.potential<player.rating||!clubs.get(player.clubId)?.playerIds.includes(player.id)) throw new Error(`Invalid player ${player.id} (${year})`);
        if(!player.real&&player.source!=='generated') throw new Error('Synthetic player without generated provenance');
      }
    }
  });
  it('reports incomplete coverage and exposes provenance rather than asserting global accuracy',()=>{
    const snapshot=getManagerWorld(2012),approximate=getManagerWorld(1990);
    expect(snapshot.coverage.exhaustive).toBe(false);
    expect(snapshot.coverage.ratingsAreEstimates).toBe(true);
    expect(snapshot.coverage.generatedPlayers).toBeGreaterThan(0);
    expect(snapshot.coverage.realPlayers).toBeGreaterThan(200);
    expect(snapshot.coverage.verifiedPlayers).toBeGreaterThan(1);
    expect(approximate.coverage.historicalCompetitions).toBe(12);
    expect(approximate.coverage.catalogLeagues).toBe(51);
    expect(approximate.coverage.unavailableLeagues).toHaveLength(39);
    // New 1990 lists can change the descriptive label, not the completeness claim.
    expect(approximate.coverage.exhaustive).toBe(false);
    expect(approximate.coverage.rostersComplete).toBe(false);
    expect(approximate.coverage.generatedPlayers).toBeGreaterThan(0);
    expect(dataSources.find(s=>s.id==='openfootball').license).toBe('CC0-1.0');
    expect(()=>getManagerWorld(1800)).toThrow(RangeError);
    expect(()=>getManagerWorld('invalid')).toThrow(RangeError);
  });
});
