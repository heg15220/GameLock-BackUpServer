import {describe,it,expect} from 'vitest';
import {matchPitchPositions,visibleMatchEvents,recordedFinalLineup,matchTeam} from './match-center-model.js';

describe('match centre visible state',()=>{
  it('never reads a future report and excludes future events even in an imported replay',()=>{
    const match={minute:20,events:[{minute:0,type:'kickoff'},{minute:12,type:'goal'},{minute:60,type:'goal'}]};
    Object.defineProperty(match,'report',{get(){throw new Error('Future report must not be read');}});
    expect(visibleMatchEvents(match).map(event=>event.minute)).toEqual([0,12]);
  });
  it('preserves the current personnel after formation changes instead of inventing starters',()=>{
    const players=['GK',...Array(4).fill('DF'),...Array(3).fill('MF'),...Array(3).fill('FW')].map((position,id)=>({id:String(id),position}));
    for(const formation of ['4-3-3','3-5-2','4-2-3-1','5-3-2']){
      const markers=matchPitchPositions(players,formation);
      expect(markers).toHaveLength(11);
      expect(new Set(markers.map(marker=>marker.player.id)).size).toBe(11);
      expect(new Set(markers.map(marker=>`${marker.x}:${marker.y}`)).size).toBe(11);
    }
  });
  it('keeps unusual manual lineups inside the pitch and mirrors opponents',()=>{
    const players=Array.from({length:11},(_,id)=>({id:String(id),position:'GK'}));
    const home=matchPitchPositions(players,'4-3-3','home'),away=matchPitchPositions(players,'4-3-3','away');
    for(const marker of [...home,...away])expect(marker.y>0&&marker.y<100&&marker.x>0&&marker.x<100).toBe(true);
    expect(home[0].x+away[0].x).toBe(100);
  });
  it('shows only the players left after recorded substitutions and injuries in a completed match',()=>{
    const match={duration:90,homeLineup:['one','two','three'],events:[{minute:30,side:'home',type:'substitution',playerOutId:'two',playerInId:'four'},{minute:80,side:'home',type:'injury',playerId:'three'}]};
    expect(recordedFinalLineup(match,'home')).toEqual(['one','four']);
  });
  it('resolves national teams without displaying their internal identifiers',()=>{
    const world={clubs:[],countries:[{fifa:'ESP',name_es:'España',name_en:'Spain',flag:'/esp.svg'}]};
    expect(matchTeam(world,'nation:ESP','es')).toMatchObject({name:'España',crest:'/esp.svg'});
    expect(matchTeam(world,'nation:ESP','en').name).toBe('Spain');
  });
});
