import React,{useEffect,useMemo,useRef,useState} from 'react';
import {AnimatePresence,motion,useReducedMotion} from 'motion/react';
import {Activity,ArrowDown,ArrowLeftRight,ArrowRight,ArrowUp,Check,ChevronRight,Clock3,Flag,Goal,Pause,Play,Radio,Shield,SkipForward,SlidersHorizontal,Target,Zap} from 'lucide-react';
import {getPlayerHealth} from './health.js';
import {LIVE_FORMATIONS,visibleMatchEvents,matchTeam,recordedFinalLineup,matchEventKey} from './match-center-model.js';
import LivePitch from './live-pitch.jsx';
import TacticalInstructions,{tacticalInstructionWords} from './tactical-instructions.jsx';
import './match-center.css';

const POSITION_NAMES={GK:['POR','GK'],DF:['DEF','DEF'],MF:['MED','MID'],FW:['DEL','FWD']};
const defaultTranslate=es=>es;

function Crest({team}){
  const [broken,setBroken]=useState(false);
  useEffect(()=>setBroken(false),[team.crest]);
  return team.crest&&!broken?<img src={team.crest} alt="" onError={()=>setBroken(true)} />:<span className="fm-live-crest-fallback" aria-hidden="true">{team.abbreviation??team.name?.slice(0,3)}</span>;
}

function EventIcon({type,...props}){
  const Icon=type==='goal'?Goal:type==='substitution'?ArrowLeftRight:type==='injury'?Activity:type==='chance'||type==='shot'?Target:(type==='tactics'||type==='tactical-change')?SlidersHorizontal:type==='full-time'||type==='half-time'?Flag:Radio;
  return <Icon size={15} aria-hidden="true" {...props}/>;
}

function eventWords(event,players,t){
  const name=id=>players.get(id)?.name??t('el jugador','the player');
  if(event.type==='tactics'){
    const mentality={defensive:t('Defensiva','Defensive'),balanced:t('Equilibrada','Balanced'),attacking:t('Ofensiva','Attacking')};
    const pressing={low:t('Presión baja','Low pressing'),balanced:t('Presión equilibrada','Balanced pressing'),high:t('Presión alta','High pressing')};
    const changed=key=>!event.changedKeys||event.changedKeys.includes(key);
    return [changed('formation')?event.formation:null,changed('mentality')?mentality[event.mentality]:null,changed('pressing')?pressing[event.pressing]:null,...tacticalInstructionWords(event,t),typeof event.autoSubstitutions==='boolean'?(event.autoSubstitutions?t('Asistente activado','Assistant enabled'):t('Cambios manuales','Manual substitutions')):null].filter(Boolean).join(' · ')||t('Plan táctico actualizado.','Tactical plan updated.');
  }
  if(event.type==='foul')return `${name(event.playerId)} ${t('comete falta sobre','fouls')} ${name(event.victimId)}.${event.penalty?` ${t('Penalti.','Penalty.')}`:''}`;
  if(event.type==='corner')return `${t('Córner. Saca','Corner taken by')} ${name(event.playerId)}.`;
  if(event.type==='free-kick')return `${t('Falta a balón parado para','Free kick for')} ${name(event.playerId)}.`;
  if(event.type==='penalty')return `${t('Penalti. Lanza','Penalty taken by')} ${name(event.playerId)}.`;
  if(event.type==='counter')return `${name(event.playerId)} ${t('inicia el contraataque.','starts the counterattack.')}`;
  if(event.type==='chance'&&event.outcome){const outcomes={saved:t('parada del portero','saved by the goalkeeper'),blocked:t('bloqueado por la defensa','blocked by the defence'),wide:t('fuera','wide')};return `${t('Remate de','Shot by')} ${name(event.playerId)}: ${outcomes[event.outcome]??event.outcome}.`;}
  if(event.type==='recovery')return `${name(event.playerId)} ${t('recupera el balón.','wins the ball.')}`;
  if(event.type==='goal')return `${t('¡Gol de','Goal by')} ${name(event.playerId)}!${event.assistId?` ${t('Asistencia de','Assist by')} ${name(event.assistId)}.`:''}`;
  if(event.type==='substitution')return `${t('Entra','On:')} ${name(event.playerInId)} · ${t('sale','off:')} ${name(event.playerOutId)}`;
  if(event.type==='injury')return `${name(event.playerId)} · ${t('se retira lesionado','leaves the pitch injured')}`;
  if(event.type==='kickoff')return t('El balón ya está en juego.','The ball is in play.');
  if(event.type==='half-time')return t('Descanso. Momento de ajustar el plan.','Half-time. Time to adjust the plan.');
  if(event.type==='extra-time')return t('El partido se decide en la prórroga.','The match goes to extra time.');
  if(event.type==='full-time')return t('Final del partido.','Full-time.');
  const phrases={'Ocasión que termina sin gol.':'The chance ends without a goal.','Disparo que detiene el portero.':'The goalkeeper saves the shot.','El centro al área lo despeja la defensa.':'The defence clears the cross.','Buena circulación en el centro del campo.':'Good passing in midfield.','La ocasión termina fuera.':'The chance goes wide.'};
  return phrases[event.text]?t(event.text,phrases[event.text]):event.text??t('El partido continúa.','The match continues.');
}

function Condition({value,t}){
  if(!Number.isFinite(value))return null;
  const percentage=Math.round(value);
  return <span className={`fm-live-condition ${percentage<45?'fm-live-condition-low':percentage<65?'fm-live-condition-mid':''}`} title={`${t('Condición','Condition')}: ${percentage}%`}><span><i style={{width:`${percentage}%`}}/></span><b>{percentage}%</b></span>;
}

function MatchStats({match,isLive,t}){
  const stats=match.stats??match;
  if(!stats)return null;
  const possession=stats.possessionHome;
  const rows=[
    [t('Remates','Shots'),stats.shotsHome,stats.shotsAway],
    [t('Córners','Corners'),stats.cornersHome,stats.cornersAway],
    [t('Faltas','Fouls'),stats.foulsHome,stats.foulsAway],
    [t('Goles esperados','Expected goals'),Number.isFinite(stats.shotXgHome??stats.xgHome)?(stats.shotXgHome??stats.xgHome).toFixed(2):null,Number.isFinite(stats.shotXgAway??stats.xgAway)?(stats.shotXgAway??stats.xgAway).toFixed(2):null],
  ].filter(([,home,away])=>home!=null&&away!=null);
  return <div className="fm-live-stats">
    {Number.isFinite(possession)&&<div className="fm-live-possession"><div><b>{possession}%</b><span>{t('Posesión','Possession')}</span><b>{100-possession}%</b></div><span><i style={{width:`${possession}%`}}/></span></div>}
    {rows.map(([label,home,away])=><div className="fm-live-stat-row" key={label}><b>{home}</b><span>{label}</span><b>{away}</b></div>)}
    <small>{t('Estadísticas de esta simulación','Statistics from this simulation')}{isLive?` · ${match.minute}′`:''}</small>
  </div>;
}

export function MatchCenter({career,dispatch,t=defaultTranslate,lang='es'}){
  const isLive=Boolean(career.activeMatch),match=career.activeMatch??career.lastMatch;
  const [playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[outId,setOutId]=useState(''),[inId,setInId]=useState(''),[visibleScore,setVisibleScore]=useState(null);
  const autoAdvanceRef=useRef(false),completedPresentationRef=useRef(null),skipPresentationRef=useRef(!isLive);
  const dispatchRef=useRef(dispatch),tacticsRef=useRef(null),benchRef=useRef(null),reducedMotion=useReducedMotion();
  dispatchRef.current=dispatch;
  const fixtureId=match?.fixture?.id,pausedFor=career.activeMatch?.pausedFor;
  useEffect(()=>{setPlaying(false);setOutId('');setInId('');setVisibleScore(null);autoAdvanceRef.current=false;completedPresentationRef.current=null;skipPresentationRef.current=!isLive;},[fixtureId]);
  useEffect(()=>{
    const visibility=()=>{if(document.hidden){setPlaying(false);autoAdvanceRef.current=false;}};
    document.addEventListener('visibilitychange',visibility);
    return ()=>document.removeEventListener('visibilitychange',visibility);
  },[]);
  const players=useMemo(()=>new Map(career.world.players.map(player=>[player.id,player])),[career.world.players]);
  const events=useMemo(()=>visibleMatchEvents(match),[match]);
  if(!match)return null;
  const fixture=match.fixture,home=matchTeam(career.world,fixture.homeId,lang),away=matchTeam(career.world,fixture.awayId,lang);
  const competition=career.world.competitions.find(item=>item.id===fixture.competitionId)
    ??career.tournaments?.find(item=>item.id===fixture.competitionId)
    ??career.divisionPlan?.playoffs?.find(item=>item.id===fixture.competitionId);
  const ownSide=match.ownSide??(fixture.homeId===career.clubId?'home':fixture.awayId===career.clubId?'away':null);
  const minute=isLive?match.minute:match.duration??90;
  const tactics=match.tactics??career.tactics;
  const homeIds=isLive?match.homeLineup??[]:match.homeFinalLineup??recordedFinalLineup(match,'home');
  const awayIds=isLive?match.awayLineup??[]:match.awayFinalLineup??recordedFinalLineup(match,'away');
  const homePlayers=homeIds.map(id=>players.get(id)).filter(Boolean),awayPlayers=awayIds.map(id=>players.get(id)).filter(Boolean);
  const ownIds=ownSide==='home'?homeIds:ownSide==='away'?awayIds:[];
  const shape=tactics.formation==='4-2-3-1'?[4,5,1]:(tactics.formation??'4-3-3').split('-').map(Number);
  const roleMismatch=['DF','MF','FW'].some((position,index)=>ownIds.filter(id=>players.get(id)?.position===position).length!==shape[index]);
  const benchIds=isLive&&ownSide?(match[`${ownSide}Bench`]??[]):[];
  const used=Number.isInteger(match.substitutionsUsed)?match.substitutionsUsed:0;
  const maxSubs=match.maxSubstitutions??(career.year>=2020?5:3);
  const remaining=Math.max(0,maxSubs-used);
  const validOut=ownIds.includes(outId)?outId:'',validIn=benchIds.includes(inId)?inId:'';
  const invalidGoalkeeperChange=Boolean(validOut&&validIn&&(players.get(validOut)?.position==='GK')!==(players.get(validIn)?.position==='GK'));
  const injured=new Set(match.injuredIds??[]);
  const condition=id=>isLive&&Number.isFinite(match.condition?.[id])?match.condition[id]:players.get(id)?getPlayerHealth(career,players.get(id)).condition:null;
  const unavailable=id=>injured.has(id)||!players.get(id)||!getPlayerHealth(career,players.get(id)).available;
  const changeInstructions=changes=>{autoAdvanceRef.current=false;setPlaying(false);dispatch({type:'SET_MATCH_TACTICS',...changes});};
  const changeTactic=(key,value)=>changeInstructions({[key]:value});
  const advance=minutes=>{autoAdvanceRef.current=false;setPlaying(true);dispatch({type:'ADVANCE_MATCH',minutes});};
  const openCoachingPanel=ref=>{setPlaying(false);ref.current?.scrollIntoView({behavior:reducedMotion?'auto':'smooth',block:'start'});ref.current?.focus({preventScroll:true});};
  const togglePlayback=()=>{
    if(playing){autoAdvanceRef.current=false;setPlaying(false);return;}
    autoAdvanceRef.current=true;setPlaying(true);
    if(isLive&&completedPresentationRef.current===match.presentation?.id)dispatch({type:'ADVANCE_MATCH',minutes:1});
  };
  const sceneComplete=()=>{
    completedPresentationRef.current=match.presentation?.id;
    if(!playing)return;
    if(!isLive||pausedFor||!autoAdvanceRef.current){setPlaying(false);return;}
    dispatchRef.current({type:'ADVANCE_MATCH',minutes:1});
  };
  const updateVisibleScore=value=>{
    if(value.complete)completedPresentationRef.current=value.presentationId;
    if(value.score&&Number.isFinite(value.score.home)&&Number.isFinite(value.score.away))setVisibleScore(value);
  };
  const presentationPending=Boolean(match.presentation&&!skipPresentationRef.current&&!(visibleScore?.presentationId===match.presentation.id&&visibleScore.complete));
  const displayScore=(!isLive&&!presentationPending)?{home:match.homeGoals,away:match.awayGoals}:visibleScore?.presentationId===match.presentation?.id?visibleScore.score:match.presentation?.scoreBefore??{home:match.homeGoals,away:match.awayGoals};
  const pendingEventIds=new Set((match.presentation?.sequences??[]).map(seq=>seq.eventId).filter(Boolean));
  const revealedEventIds=new Set(visibleScore?.presentationId===match.presentation?.id?visibleScore.eventIds??[]:[]);
  const visibleCounts={home:0,away:0};
  const shownEvents=events.filter(item=>{
    if(item.type==='full-time'&&presentationPending)return false;
    if(presentationPending&&item.minute===match.presentation?.minute){
      if(pendingEventIds.has(item.id)&&!revealedEventIds.has(item.id))return false;
      if(item.type==='foul'&&(match.presentation.sequences??[]).some(seq=>['free-kick','penalty'].includes(seq.kind))&&!(match.presentation.sequences??[]).some(seq=>['free-kick','penalty'].includes(seq.kind)&&revealedEventIds.has(seq.eventId)))return false;
    }
    return item.type!=='goal'||++visibleCounts[item.side]<=displayScore[item.side];
  });
  const chooseOut=id=>{if(ownIds.includes(id)){setOutId(id);setPlaying(false);}};
  const substitute=()=>{setPlaying(false);dispatch({type:'SUBSTITUTE_PLAYER',outId:validOut,inId:validIn});setOutId('');setInId('');};
  const dateText=fixture.date?new Date(`${fixture.date}T12:00:00Z`).toLocaleDateString(lang==='es'?'es-ES':'en-GB',{day:'numeric',month:'short',year:'numeric'}):career.date;
  const goalEvents=shownEvents.filter(item=>item.type==='goal');
  return <section className="fm-live-center" data-testid="manager-match-center" data-visible-home-goals={displayScore.home} data-visible-away-goals={displayScore.away} aria-label={t('Centro de partido','Match centre')}>
    <div className="fm-live-topline"><span><Radio size={13} aria-hidden="true"/>{t('CENTRO DE PARTIDO','MATCH CENTRE')}</span><span>{competition?.name??t('DÍA DE PARTIDO','MATCHDAY')}<i/> {dateText}</span></div>
    <header className="fm-live-scoreboard">
      <div className="fm-live-team fm-live-team-home"><Crest team={home}/><div><small>{t('LOCAL','HOME')}</small><h2>{home.name}</h2></div></div>
      <div className="fm-live-score"><div className={`fm-live-status ${isLive&&!pausedFor?'fm-live-status-active':''}`}><i/>{!isLive&&!presentationPending?t('FINAL','FULL TIME'):pausedFor==='half-time'?t('DESCANSO','HALF-TIME'):pausedFor==='extra-time'?t('PRÓRROGA','EXTRA TIME'):pausedFor==='injury'?t('LESIÓN','INJURY'):`${minute}′`}</div><div aria-live="polite" aria-label={`${home.name} ${displayScore.home}, ${away.name} ${displayScore.away}`}><motion.b key={`h${displayScore.home}`} initial={reducedMotion?false:{opacity:.4,y:-5}} animate={{opacity:1,y:0}}>{displayScore.home}</motion.b><span>:</span><motion.b key={`a${displayScore.away}`} initial={reducedMotion?false:{opacity:.4,y:-5}} animate={{opacity:1,y:0}}>{displayScore.away}</motion.b></div>{match.penalties&&<small>{t('Penaltis','Penalties')} {match.penalties.home}–{match.penalties.away}</small>}{(fixture.aggregateHome!=null||fixture.aggregateAway!=null)&&<small>{t('Global','Aggregate')} {displayScore.home+(fixture.aggregateHome??0)}–{displayScore.away+(fixture.aggregateAway??0)}</small>}</div>
      <div className="fm-live-team fm-live-team-away"><div><small>{t('VISITANTE','AWAY')}</small><h2>{away.name}</h2></div><Crest team={away}/></div>
    </header>
    {isLive&&pausedFor&&<div className="fm-live-pause-note" role="status"><Pause size={14} aria-hidden="true"/>{pausedFor==='injury'?t('Partido en pausa por lesión. Sustituye al jugador o reanuda en inferioridad.','Paused for an injury. Replace the player or resume with fewer players.'):t('Pausa para preparar los siguientes minutos. Reanuda cuando estés listo.','A pause to prepare for the next minutes. Resume when you are ready.')}</div>}
    {goalEvents.length>0&&<div className="fm-live-scorers">{['home','away'].map(side=><div key={side}>{goalEvents.filter(item=>item.side===side).map((item,index)=><span key={matchEventKey(item,index)}><Goal size={12} aria-hidden="true"/>{players.get(item.playerId)?.name??'—'} <b>{item.minute}′</b></span>)}</div>)}</div>}
    <div className="fm-live-broadcast">
      <div className="fm-live-stage">
        {(isLive||presentationPending)&&<div className="fm-live-playback"><div className="fm-live-playback-main"><button type="button" className="fm-live-button fm-live-play" onClick={togglePlayback} aria-label={playing?t('Pausar partido','Pause match'):t('Reproducir partido','Play match')} aria-pressed={playing}>{playing?<Pause size={16} aria-hidden="true"/>:<Play size={16} aria-hidden="true"/>}<span>{playing?t('Pausar','Pause'):pausedFor?t('Reanudar','Resume'):t('Reproducir','Play')}</span></button><div className="fm-live-speed" role="group" aria-label={t('Velocidad de reproducción','Playback speed')}>{[1,2,4].map(value=><button type="button" key={value} aria-pressed={speed===value} onClick={()=>setSpeed(value)}>{value}×</button>)}</div><span className="fm-live-playback-clock"><Clock3 size={13} aria-hidden="true"/>{minute}′ / {match.duration??90}′</span>{isLive&&ownSide&&<nav className="fm-live-coach-nav" aria-label={t('Accesos al banquillo','Touchline shortcuts')}><button type="button" className="fm-live-button" onClick={()=>openCoachingPanel(tacticsRef)}><SlidersHorizontal size={15} aria-hidden="true"/>{t('Pizarra','Tactics')}</button><button type="button" className="fm-live-button" onClick={()=>openCoachingPanel(benchRef)}><ArrowLeftRight size={15} aria-hidden="true"/>{t('Cambios','Substitutions')}<b>{remaining}</b></button></nav>}</div><div className="fm-live-time-progress" role="progressbar" aria-label={t('Tiempo de partido','Match time')} aria-valuenow={minute} aria-valuemin={0} aria-valuemax={match.duration??90}><i style={{width:`${Math.min(100,minute/(match.duration??90)*100)}%`}}/></div><div className="fm-live-jump"><button type="button" className="fm-live-button" onClick={()=>advance(5)} disabled={!isLive}>+5′<ChevronRight size={14} aria-hidden="true"/></button><button type="button" className="fm-live-button" onClick={()=>advance(15)} disabled={!isLive}>{t('Siguientes 15 minutos','Next 15 minutes')}<SkipForward size={14} aria-hidden="true"/></button><button type="button" className="fm-live-button fm-live-text-control" onClick={()=>{autoAdvanceRef.current=false;skipPresentationRef.current=true;setPlaying(false);dispatch({type:'FINISH_MATCH'});}}>{t('Ver resultado','Full time')}<ArrowRight size={14} aria-hidden="true"/></button></div></div>}
        <LivePitch {...{homePlayers,awayPlayers,home,away,players,minute,isLive,ownSide,t,reducedMotion,speed}} homeFormation={match.homeTactics?.formation??(ownSide==='home'?tactics.formation:'4-3-3')} awayFormation={match.awayTactics?.formation??(ownSide==='away'?tactics.formation:'4-3-3')} homeTactics={match.homeTactics} awayTactics={match.awayTactics} presentation={match.presentation} manualDecisionKey={(match.actions??[]).filter(action=>action.minute===match.presentation?.minute).map(action=>JSON.stringify(action)).join('|')} injuredIds={match.injuredIds??[]} selectedId={validOut} onSelect={chooseOut} running={playing} onComplete={sceneComplete} onVisibleScore={updateVisibleScore}/>
      </div>
      <aside className="fm-live-relay"><div className="fm-live-panel-heading"><h3><Radio size={15} aria-hidden="true"/>{t('El partido','Match feed')}</h3><span>{t('EN VIVO','AS IT HAPPENS')}</span></div><div className="fm-live-event-list" data-testid="live-event-feed" role="log" aria-live="polite" aria-relevant="additions text"><AnimatePresence initial={false}>{shownEvents.slice(-12).reverse().map((item,index)=><motion.article key={matchEventKey(item,events.length-index)} className={`fm-live-event fm-live-event-${item.type}`} initial={{opacity:0,y:reducedMotion?0:-6}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.2}}><time>{item.minute}′</time><span className="fm-live-event-icon"><EventIcon type={item.type}/></span><p>{eventWords(item,players,t)}</p></motion.article>)}</AnimatePresence></div><MatchStats match={match} isLive={isLive} t={t}/></aside>
    </div>
    {isLive&&ownSide&&<div className="fm-live-dugout">
      <section className="fm-live-tactical-panel" ref={tacticsRef} tabIndex={-1} aria-label={t('Pizarra del entrenador','Coaching board')}><div className="fm-live-panel-heading"><h3><SlidersHorizontal size={16} aria-hidden="true"/>{t('Tu pizarra','Your tactics')}</h3><span>{t('DURANTE EL PARTIDO','IN-MATCH')}</span></div><p>{t('Ajusta el plan desde el banquillo. Los cambios actúan sobre los minutos que quedan.','Adjust the plan from the touchline. Changes affect the minutes still to come.')}</p><>{roleMismatch&&<p className="fm-live-role-warning">{t('El dibujo no encaja con las posiciones naturales del once. Reordena tus jugadores con cambios para evitar perder rendimiento.','The shape does not match your XI’s natural positions. Use substitutions to avoid a performance penalty.')}</p>}</><div className="fm-live-tactic-fields"><label>{t('Formación','Formation')}<select aria-label={t('Formación en el partido','In-match formation')} value={tactics.formation} onChange={e=>changeTactic('formation',e.target.value)}>{LIVE_FORMATIONS.map(value=><option key={value}>{value}</option>)}</select></label><label>{t('Mentalidad','Mentality')}<select aria-label={t('Mentalidad en el partido','In-match mentality')} value={tactics.mentality} onChange={e=>changeTactic('mentality',e.target.value)}><option value="defensive">{t('Defensiva','Defensive')}</option><option value="balanced">{t('Equilibrada','Balanced')}</option><option value="attacking">{t('Ofensiva','Attacking')}</option></select></label></div><fieldset className="fm-live-pressing" aria-label={t('Presión en el partido','In-match pressing')}><legend>{t('Presión','Pressing')}</legend>{[['low',Shield,t('Replegar','Low')],['balanced',Activity,t('Equilibrada','Balanced')],['high',Zap,t('Alta','High')]].map(([value,Icon,label])=><button type="button" key={value} aria-pressed={(tactics.pressing??'balanced')===value} onClick={()=>changeTactic('pressing',value)}><Icon size={15} aria-hidden="true"/>{label}</button>)}</fieldset><TacticalInstructions tactics={tactics} modelVersion={match.modelVersion} onChange={changeInstructions} t={t}/><label className="fm-live-assistant"><input type="checkbox" checked={match.autoSubstitutions!==false} onChange={e=>{setPlaying(false);dispatch({type:'SET_MATCH_AUTOSUBS',enabled:e.target.checked});}}/><span>{t('Cambios automáticos del asistente','Assistant automatic substitutions')}<small>{t('Ayuda con lesiones y descanso. Desactiva el asistente si quieres decidir todos los cambios.','Helps with injuries and rest. Switch the assistant off to decide every substitution.')}</small></span></label><div className="fm-live-tactic-note"><Activity size={15} aria-hidden="true"/><span>{t('Presionar más exige más esfuerzo. Vigila la condición de tu once.','More pressure takes more effort. Keep an eye on your XI’s condition.')}</span></div></section>
      <section className="fm-live-sub-panel" ref={benchRef} tabIndex={-1} aria-label={t('Cambios del equipo','Team substitutions')}><div className="fm-live-panel-heading"><h3><ArrowLeftRight size={16} aria-hidden="true"/>{t('Mueve el banquillo','Make a substitution')}</h3><span>{remaining}/{maxSubs} {t('DISPONIBLES','AVAILABLE')}</span></div><div className="fm-live-sub-lists"><div><h4><ArrowDown size={13} aria-hidden="true"/>{t('Sale · en el campo','Off · on the pitch')}</h4><select aria-label={t('Jugador que sale','Player coming off')} value={validOut} disabled={!remaining} onChange={e=>chooseOut(e.target.value)}><option value="">{t('Seleccionar jugador','Select player')}</option>{ownIds.map(id=><option key={id} value={id}>{players.get(id)?.name}{injured.has(id)?` · ${t('Lesionado','Injured')}`:''}</option>)}</select><div className="fm-live-roster-list" data-testid="live-starters">{ownIds.map(id=>{const player=players.get(id);return player&&<button type="button" key={id} className={`fm-live-roster-player ${validOut===id?'fm-live-roster-selected':''}`} onClick={()=>chooseOut(id)} aria-pressed={validOut===id} disabled={!remaining}><span className="fm-live-position">{POSITION_NAMES[player.position]?.[lang==='es'?0:1]??player.position}</span><span className="fm-live-roster-name">{player.name}{injured.has(id)&&<small>{t('Lesionado','Injured')}</small>}</span><Condition value={condition(id)} t={t}/></button>;})}</div></div><div><h4><ArrowUp size={13} aria-hidden="true"/>{t('Entra · suplentes','On · substitutes')}</h4><select aria-label={t('Jugador que entra','Player coming on')} value={validIn} disabled={!remaining||!benchIds.length} onChange={e=>{setPlaying(false);setInId(e.target.value);}}><option value="">{t('Seleccionar suplente','Select substitute')}</option>{benchIds.map(id=><option key={id} value={id} disabled={unavailable(id)}>{players.get(id)?.name}</option>)}</select><div className="fm-live-roster-list" data-testid="live-bench">{benchIds.map(id=>{const player=players.get(id);return player&&<button type="button" key={id} className={`fm-live-roster-player ${validIn===id?'fm-live-roster-selected':''}`} onClick={()=>{setPlaying(false);setInId(id);}} aria-pressed={validIn===id} disabled={!remaining||unavailable(id)}><span className="fm-live-position">{POSITION_NAMES[player.position]?.[lang==='es'?0:1]??player.position}</span><span className="fm-live-roster-name">{player.name}</span><Condition value={condition(id)} t={t}/></button>;})}{!benchIds.length&&<p className="fm-live-empty">{t('No quedan suplentes disponibles.','No substitutes available.')}</p>}</div></div></div><div className="fm-live-sub-confirm"><span id="fm-live-sub-help">{invalidGoalkeeperChange?t('El portero debe ser reemplazado por otro portero. Elige un cambio entre jugadores de campo o entre porteros.','A goalkeeper must be replaced by another goalkeeper. Choose two outfield players or two goalkeepers.'):validOut&&validIn?<>{players.get(validOut)?.name}<ArrowRight size={13} aria-hidden="true"/>{players.get(validIn)?.name}</>:t('Elige quién sale y quién entra.','Choose a player to take off and bring on.')}</span><button type="button" className="fm-live-button fm-live-primary" onClick={substitute} aria-describedby="fm-live-sub-help" disabled={!validOut||!validIn||!remaining||unavailable(validIn)||invalidGoalkeeperChange}><Check size={15} aria-hidden="true"/>{t('Confirmar cambio','Confirm substitution')}</button></div></section>
    </div>}
  </section>;
}

export default MatchCenter;
