import {describe,it,expect} from 'vitest';
import {matchPitchPositions,presentationLineups} from './match-center-model.js';
import {createPitchScene,getPitchFrame,idlePitchFrame,settlePitchFrame} from './pitch-scene.js';

const roster=side=>['GK','DF','DF','DF','DF','MF','MF','MF','FW','FW','FW'].map((position,index)=>({id:`${side}-${index}`,name:`${side} ${index}`,position}));
const home=roster('home'),away=roster('away');
const positions=[...matchPitchPositions(home,'4-3-3','home'),...matchPitchPositions(away,'4-3-3','away')];
const sequence=(kind,fields={})=>({id:`scene-${kind}`,minute:21,side:'home',kind,actorId:'home-5',receiverId:'home-9',keeperId:'away-0',lane:'left',source:'open-play',...fields});

describe('recorded football scene choreography',()=>{
  it('keeps real participants, valid coordinates and deterministic continuous movement',()=>{
    for(const kind of ['buildup','recovery','counter','corner','free-kick','penalty','shot','goal']){
      const scene=createPitchScene(sequence(kind),positions);
      const early=getPitchFrame(scene,scene.duration*.2),late=getPitchFrame(scene,scene.duration*.8);
      expect(early).toEqual(getPitchFrame(scene,scene.duration*.2));
      expect(new Set(late.players.map(p=>p.id))).toEqual(new Set(positions.map(p=>p.player.id)));
      expect(late.players.some((p,i)=>Math.hypot(p.x-early.players[i].x,p.y-early.players[i].y)>2)).toBe(true);
      for(const p of [...late.players,late.ball])expect(p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100).toBe(true);
    }
  });
  it('puts the actual last passer on the ball before the named receiver',()=>{
    const scene=createPitchScene(sequence('buildup'),positions);
    const passer=getPitchFrame(scene,scene.duration*.56),receiver=getPitchFrame(scene,scene.duration*.95);
    expect(passer.carrierId).toBe('home-5');expect(receiver.carrierId).toBe('home-9');
    const current=passer.players.find(p=>p.id===passer.carrierId);
    expect(Math.hypot(passer.ball.x-current.x,passer.ball.y-current.y)).toBeLessThan(1.5);
  });
  it('keeps penalty players outside the box and behind the spot until the kick',()=>{
    for(const kind of ['penalty','shot']){
      const scene=createPitchScene(sequence(kind,{source:'penalty',lane:'center'}),positions);
      const frame=getPitchFrame(scene,scene.duration*.4);
      expect(frame.players.find(p=>p.id==='away-0').x).toBe(97);
      expect(frame.players.find(p=>p.id==='home-5').x).toBe(86);
      for(const p of frame.players.filter(p=>!['away-0','home-5'].includes(p.id)))expect(p.x).toBeLessThan(81);
      expect(new Set(frame.players.map(p=>`${p.x}:${p.y}`)).size).toBe(frame.players.length);
    }
  });
  it('mirrors direction and the legal penalty geometry for away attacks',()=>{
    const scene=createPitchScene(sequence('penalty',{side:'away',actorId:'away-5',receiverId:'away-9',keeperId:'home-0',source:'penalty'}),positions);
    const frame=getPitchFrame(scene,scene.duration*.4);
    expect(frame.players.find(p=>p.id==='home-0').x).toBe(3);
    expect(frame.players.find(p=>p.id==='away-5').x).toBe(14);
    for(const p of frame.players.filter(p=>!['home-0','away-5'].includes(p.id)))expect(p.x).toBeGreaterThan(19);
  });
  it('reveals only a recorded goal after the shot arrives and keeps its identity through celebration',()=>{
    const fields={outcome:'goal',eventId:'recorded-goal',actorId:'home-9'};
    const shot=createPitchScene(sequence('shot',fields),positions);
    expect(getPitchFrame(shot,shot.duration*.8).goalReached).toBe(false);
    const arrival=getPitchFrame(shot,shot.duration*.83);
    expect(arrival.goalEventId).toBe('recorded-goal');
    const celebration=createPitchScene(sequence('goal',fields),positions,{fromFrame:arrival});
    expect(getPitchFrame(celebration,500).goalEventId).toBe('recorded-goal');
    const miss=createPitchScene(sequence('shot',{outcome:'wide'}),positions);
    expect(getPitchFrame(miss,miss.duration).goalReached).toBe(false);
  });
  it('starts the next scene where the previous one ended and never revives a removed player',()=>{
    const first=createPitchScene(sequence('buildup'),positions),end=getPitchFrame(first,first.duration);
    const nextPositions=positions.filter(p=>p.player.id!=='home-6');
    const next=createPitchScene(sequence('counter'),nextPositions,{fromFrame:end});
    const start=getPitchFrame(next,0);
    expect(start.players.some(p=>p.id==='home-6')).toBe(false);
    for(const p of start.players){const previous=end.players.find(item=>item.id===p.id);expect(p.x).toBeCloseTo(previous.x);expect(p.y).toBeCloseTo(previous.y);}
    expect(start.ball.x).toBeCloseTo(end.ball.x);
  });
  it('respects formation slots and tactical depth instead of a fixed natural-role layout',()=>{
    const adapted=[...matchPitchPositions(home,'3-5-2','home'),...matchPitchPositions(away,'4-3-3','away')];
    const scene=createPitchScene(sequence('buildup'),adapted,{tactics:{home:{mentality:'attacking'}}});
    const frame=getPitchFrame(scene,scene.duration);
    expect(frame.players.filter(p=>p.side==='home'&&p.role==='MF')).toHaveLength(5);
    expect(idlePitchFrame(adapted).players).toHaveLength(22);
  });
  it('shows a minute-64 scorer before his automatic substitution and replaces him after the scene',()=>{
    const substitute={id:'home-11',name:'Substitute',position:'FW'};
    const current={home:home.filter(p=>p.id!=='home-9').concat(substitute),away};
    const allPlayers=new Map([...home,...away,substitute].map(p=>[p.id,p]));
    const presentation={onPitch:{home:home.map(p=>p.id),away:away.map(p=>p.id)}};
    const snapshot=presentationLineups(presentation,allPlayers,current);
    const scenePositions=[...matchPitchPositions(snapshot.home,'4-3-3','home'),...matchPitchPositions(snapshot.away,'4-3-3','away')];
    const scene=createPitchScene(sequence('shot',{minute:64,actorId:'home-9',outcome:'goal',eventId:'goal-64'}),scenePositions);
    const goal=getPitchFrame(scene,scene.duration*.9);
    expect(goal.players.some(p=>p.id==='home-9')).toBe(true);
    expect(goal.players.some(p=>p.id==='home-11')).toBe(false);
    const currentPositions=[...matchPitchPositions(current.home,'4-3-3','home'),...matchPitchPositions(current.away,'4-3-3','away')];
    const complete=settlePitchFrame(goal,currentPositions);
    expect(complete.players.some(p=>p.id==='home-9')).toBe(false);
    expect(complete.players.some(p=>p.id==='home-11')).toBe(true);
    const manual=presentationLineups(presentation,allPlayers,current,'SUBSTITUTE_PLAYER:64');
    expect(manual.usesSnapshot).toBe(false);
    expect(manual.home.some(p=>p.id==='home-9')).toBe(false);
  });
  it('uses a midfield restart without a wall and ends recovery with its recorded owner',()=>{
    const far=createPitchScene(sequence('free-kick',{dangerous:false,zone:'midfield'}),positions);
    expect(getPitchFrame(far,far.duration*.4).players.find(p=>p.id==='home-5').x).toBe(49);
    const recovery=createPitchScene(sequence('recovery',{receiverId:null}),positions);
    expect(getPitchFrame(recovery,recovery.duration).carrierId).toBe('home-5');
  });
});

describe('reactive tactical movement from resolved v3 possessions',()=>{
  const resolved=(homeT={},awayT={},kind='buildup')=>sequence(kind,{
    passRoute:kind==='recovery'?undefined:['home-5','home-7','home-6','home-9'],
    receiverId:kind==='recovery'?null:'home-9',
    tacticalContext:{home:homeT,away:awayT,intent:'support'},
  });
  const sample=(seq,ratio=.85)=>{const scene=createPitchScene(seq,positions);return getPitchFrame(scene,scene.duration*ratio);};
  const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
  const own=frame=>frame.players.filter(p=>p.side==='home'&&p.role!=='GK');
  const spread=frame=>Math.max(...own(frame).map(p=>p.y))-Math.min(...own(frame).map(p=>p.y));

  it('uses every recorded pass-route identity and keeps contact at each reception',()=>{
    const seq=resolved({passing:'short'}),scene=createPitchScene(seq,positions);
    expect(scene.passRoute).toEqual(seq.passRoute);
    for(let index=0;index<seq.passRoute.length;index++){
      const time=.1+.78/(seq.passRoute.length-1)*index;
      const frame=getPitchFrame(scene,scene.duration*time),player=frame.players.find(p=>p.id===seq.passRoute[index]);
      expect(frame.carrierId).toBe(player.id);
      expect(Math.hypot(frame.ball.x-player.x,frame.ball.y-player.y)).toBeLessThan(1.5);
    }
  });
  it('changes width, passing support and forward runs spatially rather than only changing duration',()=>{
    const narrow=sample(resolved({width:'narrow',passing:'short'}));
    const wide=sample(resolved({width:'wide',passing:'short'}));
    expect(spread(wide)-spread(narrow)).toBeGreaterThan(18);
    const short=sample(resolved({passing:'short'})),direct=sample(resolved({passing:'direct'}));
    expect(mean(own(direct).filter(p=>p.role==='FW').map(p=>p.x))-mean(own(short).filter(p=>p.role==='FW').map(p=>p.x))).toBeGreaterThan(5);
    expect(own(short).filter(p=>p.duty==='support').length).toBeGreaterThanOrEqual(2);
    const cover=own(short).filter(p=>p.duty==='cover');
    expect(cover.length).toBeGreaterThanOrEqual(2);
    expect(cover.every(p=>p.x<short.ball.x)).toBe(true);
  });
  it('raises the defensive line while retaining only one or two active pressers',()=>{
    const low=sample(resolved({}, {defensiveLine:'low',pressing:'high'}));
    const high=sample(resolved({}, {defensiveLine:'high',pressing:'high'}));
    const defenders=frame=>frame.players.filter(p=>p.side==='away'&&p.role==='DF');
    expect(mean(defenders(low).map(p=>p.x))-mean(defenders(high).map(p=>p.x))).toBeGreaterThan(12);
    expect(high.players.filter(p=>['press','screen'].includes(p.duty))).toHaveLength(2);
    expect(high.players.filter(p=>p.side==='away'&&['cover','line'].includes(p.duty)).length).toBeGreaterThanOrEqual(7);
  });
  it('distinguishes retaining possession from counterattacking, and regrouping from counterpressing',()=>{
    const retain=sample(resolved({transition:'hold'},{ballLoss:'regroup'},'recovery'));
    const counter=sample(resolved({transition:'counter'},{ballLoss:'counterpress'},'recovery'));
    expect(counter.players.find(p=>p.id==='home-5').x-retain.players.find(p=>p.id==='home-5').x).toBeGreaterThan(12);
    expect(retain.players.some(p=>p.duty==='retain')).toBe(true);
    expect(retain.players.filter(p=>['press','screen'].includes(p.duty))).toHaveLength(0);
    expect(counter.players.filter(p=>['press','screen'].includes(p.duty))).toHaveLength(2);
  });
  it('keeps movement bounded and continuous with real personnel through the entire route',()=>{
    const scene=createPitchScene(resolved({width:'wide',passing:'direct',tempo:'high'},{pressing:'high'}),positions);
    let prior=getPitchFrame(scene,0);
    for(let step=1;step<=100;step++){
      const frame=getPitchFrame(scene,scene.duration*step/100);
      expect(new Set(frame.players.map(p=>p.id))).toEqual(new Set(positions.map(p=>p.player.id)));
      for(const p of frame.players){
        const before=prior.players.find(item=>item.id===p.id);
        expect(Math.hypot(p.x-before.x,(p.y-before.y)*.63)).toBeLessThan(1.2);
        expect(p.x>=2&&p.x<=98&&p.y>=5&&p.y<=95).toBe(true);
      }
      prior=frame;
    }
  });
  it('retains the ball and existing player coordinates across a coaching decision',()=>{
    const scene=createPitchScene(resolved({passing:'short'}),positions);
    const paused=getPitchFrame(scene,scene.duration*.55);
    const retained=settlePitchFrame(paused,positions);
    expect(retained.ball).toEqual(paused.ball);
    expect(retained.players).toEqual(paused.players);
    const next=createPitchScene(resolved({width:'wide',passing:'direct'}),positions,{fromFrame:retained});
    const start=getPitchFrame(next,0);
    expect(start.ball.x).toBeCloseTo(retained.ball.x);expect(start.ball.y).toBeCloseTo(retained.ball.y);
    for(const p of start.players){const before=retained.players.find(item=>item.id===p.id);expect(p.x).toBeCloseTo(before.x);expect(p.y).toBeCloseTo(before.y);}
  });
  it('does not let live controls overwrite the instructions recorded for an already-resolved possession',()=>{
    const seq=resolved({width:'narrow',passing:'short'});
    const first=createPitchScene(seq,positions,{tactics:{home:{width:'wide',passing:'direct'}}});
    const second=createPitchScene(seq,positions);
    expect(getPitchFrame(first,2300)).toEqual(getPitchFrame(second,2300));
  });
  it('ends an intercepted pass at the defender and preserves his possession into recovery',()=>{
    const seq={...resolved({passing:'short'}),interceptedById:'away-5',interceptedPassIndex:2,resultSide:'away',resultCarrierId:'away-5'};
    const scene=createPitchScene(seq,positions);
    for(const ratio of [.88,.94,1]){
      const frame=getPitchFrame(scene,scene.duration*ratio);
      expect(frame.carrierId).toBe('away-5');
      const intercepted=frame.players.find(p=>p.id==='away-5'),intended=frame.players.find(p=>p.id==='home-9');
      expect(Math.hypot(frame.ball.x-intercepted.x,frame.ball.y-intercepted.y)).toBeLessThan(1.5);
      expect(Math.hypot(frame.ball.x-intended.x,frame.ball.y-intended.y)).toBeGreaterThan(2);
    }
    const end=getPitchFrame(scene,scene.duration);
    const recovery=createPitchScene(sequence('recovery',{side:'away',actorId:'away-5',receiverId:null,defenderId:'home-9',tacticalContext:{away:{transition:'hold'},home:{ballLoss:'regroup'}}}),positions,{fromFrame:end});
    const start=getPitchFrame(recovery,0),after=getPitchFrame(recovery,recovery.duration*.08);
    expect(start.ball.x).toBeCloseTo(end.ball.x);expect(start.ball.y).toBeCloseTo(end.ball.y);
    expect(after.carrierId).toBe('away-5');
  });
});
