import { describe,expect,it } from 'vitest';
import { getManagerWorld } from './data.js';
import {
  createManagerCareer,getManagerSummary,getNextFixture,getSquad,getStandings,
  managerReducer,restoreManagerCareer,serializeManagerCareer,simulateManagerMatch,
} from './engine.js';

const play=state=>managerReducer(state,{type:'PLAY_MATCH',mode:'quick'});
function finishSeason(state) {
  let rounds=0;
  while(state.phase!=='complete'&&rounds++<100) {
    state=play(state);
    expect(state.lastError).toBeNull();
  }
  expect(state.phase).toBe('complete');
  return state;
}

describe('manager integration with the real historical catalog',()=>{
  it.each([2012,2025])('can start and play a valid match in every documented selectable league in %s, excluding external club pools',year=>{
    const world=getManagerWorld(year);
    const playable=world.competitions.filter(competition=>competition.simulated!==false&&competition.selectable!==false);
    const external=world.competitions.filter(competition=>!playable.includes(competition));
    const playableIds=playable.map(competition=>competition.id).sort();
    expect(playable).toHaveLength(world.coverage.totalLeagues);
    expect(playable.length+world.coverage.unavailableLeagues.length).toBe(world.coverage.catalogLeagues);
    expect(external.length).toBeGreaterThan(0);
    for(const competition of external){
      expect(competition).toMatchObject({simulated:false,selectable:false,historicalMembership:false});
      expect(competition.id).toMatch(/^external:/);
      const clubs=world.clubs.filter(club=>club.competitionId===competition.id);
      expect(clubs.length).toBeGreaterThan(0);
      for(const club of clubs){
        expect(club.selectable).toBe(false);
        expect(()=>createManagerCareer({year,clubId:club.id,world,seed:'reject-external-club'})).toThrow(/liga documentada seleccionable/);
      }
    }
    for(const competition of playable) {
      expect(competition.historicalMembership).toBe(true);
      expect(competition.membershipCoverage.available).toBe(true);
      const clubs=world.clubs.filter(c=>c.competitionId===competition.id);
      expect(clubs.length,competition.id).toBeGreaterThan(1);
      expect(clubs).toHaveLength(competition.membershipCoverage.clubCount);
      const state=createManagerCareer({year,clubId:clubs[0].id,seed:`all-leagues-${year}`,world});
      expect(Object.keys(state.leagues).sort()).toEqual(playableIds);
      const squad=getSquad(state);
      const selected=squad.filter(p=>p.selected);
      expect(selected,competition.id).toHaveLength(11);
      expect(selected.filter(p=>p.position==='GK'),competition.id).toHaveLength(1);
      expect(squad.length,competition.id).toBeGreaterThanOrEqual(22);
      const summary=getManagerSummary(state);
      expect(summary.budget).toBeGreaterThan(0);
      expect(summary.budget).toBeLessThan(300000000);
      expect(summary.remainingWages).toBeGreaterThan(0);
      const fixture=getNextFixture(state)??state.leagues[competition.id].rounds.flat().find(f=>f.homeId===state.clubId||f.awayId===state.clubId);
      const match=simulateManagerMatch(state,fixture);
      expect(Number.isFinite(match.xgHome)).toBe(true);
      expect(Number.isFinite(match.xgAway)).toBe(true);
      expect(match.homeGoals).toBeGreaterThanOrEqual(0);
      expect(match.awayGoals).toBeGreaterThanOrEqual(0);
    }
  },30000);

  it.each([2012,2025])('quick and detailed games agree for real Barcelona %s and survive a paused-match save',year=>{
    const initial=createManagerCareer({year,clubId:'barcelona',seed:'integration-replay'});
    const quick=play(initial);
    let deep=managerReducer(initial,{type:'PLAY_MATCH',mode:'deep'});
    deep=managerReducer(deep,{type:'ADVANCE_MATCH'});
    deep=restoreManagerCareer(serializeManagerCareer(deep));
    while(deep.activeMatch) deep=managerReducer(deep,{type:'ADVANCE_MATCH'});
    expect(deep.round).toBe(quick.round);
    expect(deep.lastMatch).toEqual(quick.lastMatch);
    expect(deep.playerStats).toEqual(quick.playerStats);
    expect(deep.finances).toEqual(quick.finances);
    expect(getStandings(deep)).toEqual(getStandings(quick));
  },30000);

  it('keeps known Barcelona starters ahead of generated filler and respects a historical quality gap',()=>{
    const state=createManagerCareer({year:2012,clubId:'barcelona',seed:'historical-quality'});
    const selected=getSquad(state).filter(p=>p.selected);
    expect(selected.every(p=>p.real)).toBe(true);
    expect(selected.some(p=>p.name==='Lionel Messi')).toBe(true);
    const fixture={id:'quality-sample',homeId:'barcelona',awayId:'granada-cf',competitionId:'laliga'};
    let wins=0,notWins=0,totalGoals=0;
    for(let seed=0;seed<250;seed++) {
      const match=simulateManagerMatch({...state,seed:String(seed)},fixture);
      if(match.homeGoals>match.awayGoals)wins++;else notWins++;
      totalGoals+=match.homeGoals+match.awayGoals;
    }
    expect(wins).toBeGreaterThan(150);
    expect(notWins).toBeGreaterThan(0);
    expect(totalGoals/250).toBeGreaterThan(1.5);
    expect(totalGoals/250).toBeLessThan(6);
  });

  it('finishes two complete real-world seasons and restores their squads, finances and history',()=>{
    let state=createManagerCareer({year:2012,clubId:'barcelona',seed:'integration-two-seasons'});
    for(let season=0;season<2;season++) {
      state=finishSeason(state);
      for(const league of Object.values(state.leagues)) {
        expect(league.round).toBe(league.rounds.length);
        expect(league.table.every(row=>row.played===(league.clubIds.length-1)*2)).toBe(true);
      }
      expect(state.tournaments.every(t=>Boolean(t.winnerId))).toBe(true);
      expect(state.awards).toHaveLength(3);
      expect(state.finances.budget).toBeGreaterThan(0);
      const save=serializeManagerCareer(state);
      expect(save.length*2).toBeLessThan(5*1024*1024);
      const restored=restoreManagerCareer(save);
      expect(restored.world.players).toEqual(state.world.players);
      expect(restored.history).toEqual(state.history);
      expect(restored.finances).toEqual(state.finances);
      expect(getStandings(restored)).toEqual(getStandings(state));
      state=restored;
      if(season===0) state=managerReducer(state,{type:'NEXT_SEASON'});
    }
    expect(state.year).toBe(2013);
    expect(state.history).toHaveLength(2);
    expect(state.world.players.find(p=>p.name==='Neymar').clubId).toBe('santos');
    // The season label stays 2013/14 while the current calendar advances into 2014.
    expect(state.date >= '2014-06-24').toBe(true);
    expect(getSquad(state).find(p=>p.name==='Lionel Messi').age).toBe(27);
  },60000);
});
