import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,Goal,Pause,Radio} from 'lucide-react';
import {matchPitchPositions,matchInitials,presentationLineups} from './match-center-model.js';
import {createPitchScene,getPitchFrame,idlePitchFrame,settlePitchFrame} from './pitch-scene.js';
import './live-pitch.css';

const KIND_LABELS={ready:['Preparados para jugar','Ready to play'],buildup:['Construcción de la jugada','Building possession'],recovery:['Recuperación y salida','Winning the ball'],counter:['Contraataque','Counterattack'],corner:['Córner','Corner kick'],'free-kick':['Falta directa','Free kick'],penalty:['Preparación del penalti','Penalty setup'],shot:['Remate a portería','Attempt on goal'],goal:['Celebración del gol','Goal celebration']};

/** One RAF clock drives players, passes and celebrations; pausing freezes all. */
export default function LivePitch({homePlayers,awayPlayers,homeFormation,awayFormation,home,away,players,presentation,minute,selectedId,onSelect,isLive,ownSide,injuredIds=[],running,speed=1,reducedMotion,t,onComplete,onVisibleScore,homeTactics,awayTactics,manualDecisionKey=''}){
  const currentSignature=[homeFormation,awayFormation,homePlayers.map(p=>p.id).join(','),awayPlayers.map(p=>p.id).join(','),injuredIds.join(',')].join('|');
  const currentPositions=useMemo(()=>[...matchPitchPositions(homePlayers,homeFormation,'home'),...matchPitchPositions(awayPlayers,awayFormation,'away')].filter(p=>!injuredIds.includes(p.player.id)),[currentSignature]);
  const {usesSnapshot:snapshotAllowed,home:snapshotHome,away:snapshotAway}=presentationLineups(presentation,players,{home:homePlayers,away:awayPlayers},manualDecisionKey);
  const signature=[homeFormation,awayFormation,snapshotHome.map(p=>p.id).join(','),snapshotAway.map(p=>p.id).join(','),snapshotAllowed?'snapshot':injuredIds.join(','),manualDecisionKey,JSON.stringify(homeTactics??{}),JSON.stringify(awayTactics??{})].join('|');
  const positions=useMemo(()=>snapshotAllowed?[...matchPitchPositions(snapshotHome,homeFormation,'home'),...matchPitchPositions(snapshotAway,awayFormation,'away')]:currentPositions,[signature]);
  const [frame,setFrame]=useState(()=>idlePitchFrame(positions));
  const frameRef=useRef(frame),positionsRef=useRef(positions),currentPositionsRef=useRef(currentPositions),controller=useRef(null),callbacks=useRef({onComplete,onVisibleScore}),tacticsRef=useRef({home:homeTactics,away:awayTactics});
  callbacks.current={onComplete,onVisibleScore};positionsRef.current=positions;currentPositionsRef.current=currentPositions;tacticsRef.current={home:homeTactics,away:awayTactics};
  const presentationId=presentation?.id??`legacy:${minute}`;
  const publish=next=>{frameRef.current=next;setFrame(next);};
  useEffect(()=>{
    const previous=controller.current;
    if(previous?.id===presentationId&&previous.signature===signature)return;
    if(previous?.id===presentationId){
      // A manual change replaces current personnel immediately. An old scene
      // must never put a substituted or injured player back on the pitch.
      previous.done=true;previous.notified=false;previous.signature=signature;
      callbacks.current.onVisibleScore?.({presentationId,score:presentation?.scoreAfter,eventIds:(presentation?.sequences??[]).map(seq=>seq.eventId).filter(Boolean),complete:true});
      publish({...settlePitchFrame(frameRef.current,currentPositionsRef.current),sceneId:'decision',kind:'ready',passRoute:[],tacticalContext:tacticsRef.current,trail:null});
      return;
    }
    const sequences=(presentation?.sequences??[]).filter(seq=>seq.minute<=minute);
    const state={id:presentationId,signature,sequences,index:0,elapsed:0,done:!sequences.length,notified:false,revealed:new Set(),eventIds:new Set(),score:{...(presentation?.scoreBefore??{})}};
    state.scene=sequences[0]?createPitchScene(sequences[0],positionsRef.current,{fromFrame:frameRef.current,tactics:tacticsRef.current,nextSequence:sequences[1]}):null;
    controller.current=state;
    callbacks.current.onVisibleScore?.({presentationId,score:presentation?.scoreBefore,eventIds:[],complete:false});
    publish(state.scene?getPitchFrame(state.scene,0):idlePitchFrame(positionsRef.current));
  },[presentationId,signature]);
  useEffect(()=>{
    if(!running)return undefined;
    let handle,last=performance.now(),stopped=false;
    const reveal=next=>{
      const state=controller.current,seq=state.scene.sequence;
      let changed=false;
      const visible=next.kind==='shot'?next.progress>=.82:next.kind==='recovery'?next.progress>=.38:true;
      if(seq.eventId&&visible&&!state.eventIds.has(seq.eventId)){state.eventIds.add(seq.eventId);changed=true;}
      if(next.goalReached&&next.goalEventId&&!state.revealed.has(next.goalEventId)){
        state.revealed.add(next.goalEventId);
        state.score[next.side]=(state.score[next.side]??0)+1;changed=true;
      }
      if(changed)callbacks.current.onVisibleScore?.({presentationId:state.id,score:{...state.score},eventIds:[...state.eventIds],complete:false});
    };
    const tick=now=>{
      if(stopped)return;
      const state=controller.current;
      if(!state)return;
      if(state.done){if(!state.notified){state.notified=true;callbacks.current.onComplete?.();}return;}
      const delta=Math.min(100,Math.max(0,now-last))*speed;last=now;
      // Reduced motion keeps the event order and dwell time but removes travel.
      state.elapsed=Math.min(state.scene.duration,state.elapsed+delta*(reducedMotion?state.scene.duration/950:1));
      let next=getPitchFrame(state.scene,reducedMotion?state.scene.duration:state.elapsed);
      reveal(next);
      if(state.elapsed>=state.scene.duration){
        state.index+=1;state.elapsed=0;
        if(state.index>=state.sequences.length){state.done=true;next=settlePitchFrame(next,currentPositionsRef.current);callbacks.current.onVisibleScore?.({presentationId:state.id,score:presentation?.scoreAfter,eventIds:[...state.eventIds],complete:true});}
        else {state.scene=createPitchScene(state.sequences[state.index],positionsRef.current,{fromFrame:next,tactics:tacticsRef.current,nextSequence:state.sequences[state.index+1]});next=getPitchFrame(state.scene,0);}
      }
      publish(next);
      handle=requestAnimationFrame(tick);
    };
    handle=requestAnimationFrame(tick);
    return()=>{stopped=true;cancelAnimationFrame(handle);};
  },[running,speed,reducedMotion,presentationId,signature]);

  const scene=controller.current?.scene,sequence=scene?.sequence;
  const scoring=frame.goalReached,scoringTeam=frame.side==='home'?home:away;
  const goalAge=frame.kind==='shot'?Math.max(0,frame.elapsed-frame.duration*.82):frame.elapsed+400;
  const goalEntrance=reducedMotion?1:Math.min(1,goalAge/260);
  const goalStyle={opacity:goalEntrance,transform:`translateY(${(1-goalEntrance)*8}px)`};
  const scorer=players.get(sequence?.actorId),carrier=players.get(frame.carrierId);
  const label=KIND_LABELS[frame.kind]??KIND_LABELS.buildup;
  const sideTeam=frame.side==='away'?away:home;
  const goalScore=controller.current?.score??presentation?.scoreAfter;
  const view={sceneId:frame.sceneId,kind:frame.kind,phase:frame.phase,elapsed:Math.round(frame.elapsed),duration:frame.duration,carrierId:frame.carrierId,tacticalContext:frame.tacticalContext??null,passRoute:frame.passRoute??[],interceptedById:frame.interceptedById??null,ball:{x:+frame.ball.x.toFixed(2),y:+frame.ball.y.toFixed(2),height:+frame.ball.height.toFixed(2)},players:frame.players.map(p=>({id:p.id,side:p.side,duty:p.duty??'shape',x:+p.x.toFixed(2),y:+p.y.toFixed(2)}))};
  return <div className="fm-live-pitch-wrap">
    <div className="fm-live-pitch-caption"><span><i/>{home.abbreviation??home.name}<ArrowRight size={12}/></span><span>{t('PARTIDO EN MOVIMIENTO','LIVE MATCH VIEW')}</span><span><ArrowRight size={12} className="fm-live-rotate"/>{away.abbreviation??away.name}<i/></span></div>
    <div className={`fm-live-pitch fm-live-animated-pitch ${scoring?'fm-live-pitch-scored':''}`} data-testid="live-pitch" data-presentation-id={presentationId} data-scene-id={frame.sceneId} data-event-kind={frame.kind} data-scene-phase={frame.phase} data-presentation-time={Math.round(frame.elapsed)} data-running={Boolean(running&&!controller.current?.done)} data-carrier-id={frame.carrierId??''} data-goal-event-id={frame.goalEventId??''} data-frame={JSON.stringify(view)} data-tactical-intent={frame.tacticalContext?.intent??''} data-pass-route={JSON.stringify(frame.passRoute??[])} data-tactical-context={JSON.stringify(frame.tacticalContext??{})} aria-label={t('Campo animado de la simulación. Coordenadas ilustrativas.','Animated simulation pitch. Illustrative coordinates.')}>
      <svg className="fm-live-pitch-lines" viewBox="0 0 1000 630" preserveAspectRatio="none" aria-hidden="true"><rect x="30" y="30" width="940" height="570" rx="2"/><path d="M500 30V600M30 175H180V455H30M970 175H820V455H970M30 250H82V380H30M970 250H918V380H970"/><circle cx="500" cy="315" r="76"/><circle cx="500" cy="315" r="3"/><circle cx="130" cy="315" r="3"/><circle cx="870" cy="315" r="3"/><path d="M180 256A76 76 0 0 1 180 374M820 256A76 76 0 0 0 820 374"/></svg>
      <div className="fm-live-pitch-goal fm-live-pitch-goal-home"/><div className="fm-live-pitch-goal fm-live-pitch-goal-away"/>
      <svg className="fm-live-play-paths" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {frame.trail&&!frame.carrierId&&<line x1={frame.trail.x} y1={frame.trail.y} x2={frame.ball.x} y2={frame.ball.y} className="fm-live-ball-trail"/>}
        {frame.players.filter(p=>p.duty==='support'&&p.side===frame.side).slice(0,2).map(p=><line key={`support:${p.id}`} x1={frame.ball.x} y1={frame.ball.y} x2={p.x} y2={p.y} className="fm-live-support-path"/>)}
        {frame.players.filter(p=>p.duty==='press'||p.duty==='screen').map(p=><path key={p.id} d={`M${p.x} ${p.y} Q${(p.x+frame.ball.x)/2} ${p.y} ${frame.ball.x} ${frame.ball.y}`} className={`fm-live-pressure-path ${p.duty==='screen'?'fm-live-screen-path':''}`}/>)}

        {scoring&&[0,1,2].map(index=><ellipse key={index} cx={frame.side==='home'?98:2} cy="50" rx={1.5+((frame.elapsed/240+index*2)%8)} ry={3+((frame.elapsed/180+index*3)%13)} className="fm-live-net-ripple" style={{opacity:.5-index*.12}}/>)}
      </svg>
      {frame.players.map(p=>{const player=players.get(p.id);if(!player)return null;return <button key={p.id} type="button" data-player-id={p.id} data-team={p.side} data-duty={p.duty??'shape'} data-x={p.x.toFixed(2)} data-y={p.y.toFixed(2)} className={`fm-live-player fm-live-player-${p.side} ${selectedId===p.id?'fm-live-player-selected':''} ${frame.carrierId===p.id?'fm-live-player-carrier':''} ${scoring&&sequence?.actorId===p.id?'fm-live-player-scorer':''}`} style={{left:`${p.x}%`,top:`${p.y}%`}} onClick={()=>onSelect(p.id)} disabled={!isLive||p.side!==ownSide} title={player.name} aria-label={`${player.name} · ${t('Valoración estimada','Estimated rating')} ${player.rating}`} aria-pressed={isLive&&p.side===ownSide?selectedId===p.id:undefined}><span className="fm-live-shirt">{player.shirtNumber??matchInitials(player.name)}</span><span className="fm-live-player-label">{player.name.split(' ').at(-1)}</span></button>;})}
      <span className="fm-live-ball-shadow" style={{left:`${frame.ball.x}%`,top:`${frame.ball.y}%`,opacity:Math.max(.12,.45-frame.ball.height*.025)}} aria-hidden="true"/>
      <span className="fm-live-moving-ball" data-testid="live-ball" data-x={frame.ball.x.toFixed(2)} data-y={frame.ball.y.toFixed(2)} data-height={frame.ball.height.toFixed(2)} style={{left:`${frame.ball.x}%`,top:`${frame.ball.y}%`,transform:`translate(-50%,calc(-50% - ${frame.ball.height*1.7}px)) scale(${1+frame.ball.height*.035})`}} aria-hidden="true"/>
      {scoring&&<div className="fm-live-inpitch-goal" style={goalStyle} aria-hidden="true"><Goal size={14}/>{t('¡GOL!','GOAL!')}<span>{sequence?.minute??minute}′</span></div>}
      <span className="fm-live-pitch-minute" aria-hidden="true">{minute}′</span>
    </div>
    <div className="fm-live-scene-strip" aria-live="off"><span>{running?<Radio size={13}/>:<Pause size={13}/>}<b>{t(...label)}</b></span><span>{carrier?.name??sideTeam?.abbreviation??sideTeam?.name}</span><i style={{width:`${frame.progress*100}%`}}/></div>
    {scoring&&<div className="fm-live-goal-banner" style={goalStyle} data-testid="live-goal-celebration" data-goal-event-id={frame.goalEventId} role="status">{scoringTeam.crest?<img src={scoringTeam.crest} alt=""/>:<Goal size={28}/>}<div><span>{t('¡GOOOL!','GOAL!')} <b>{sequence?.minute??minute}′</b></span><strong>{scorer?.name??scoringTeam.name}</strong><small>{scoringTeam.name}{sequence?.assistId?` · ${t('Asistencia','Assist')}: ${players.get(sequence.assistId)?.name??'—'}`:''}</small></div><b className="fm-live-celebration-score">{goalScore?.home??0}<span>–</span>{goalScore?.away??0}</b></div>}
    <p className="fm-live-illustration-note">{t('Jugadas de esta simulación. Los recorridos ilustran posesión, movimientos y acciones a balón parado.','Plays from this simulation. Movement illustrates possession, runs and set pieces.')}</p>
  </div>;
}
