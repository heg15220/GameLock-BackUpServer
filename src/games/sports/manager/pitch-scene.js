// Choreography illustrates recorded simulation events. It is not tracking data
// and never draws another event or changes a sporting result.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>t*t*(3-2*t);
const DURATIONS={buildup:5200,recovery:3900,counter:4600,corner:5000,'free-kick':4700,penalty:4900,shot:4100,goal:4100};
const point=(x,y)=>({x:clamp(x,2,98),y:clamp(y,5,95)});
const canonical=(p,side)=>({x:side==='home'?p.x:100-p.x,y:side==='home'?p.y:100-p.y});
const world=(p,side)=>canonical(p,side);

function interpolate(points,t,linear=false){
  const end=points.findIndex(p=>p.at>=t);
  if(end<=0)return {...points[end===0?0:points.length-1]};
  const a=points[end-1],b=points[end],fraction=(t-a.at)/(b.at-a.at),f=linear?fraction:ease(fraction);
  return {x:mix(a.x,b.x,f),y:mix(a.y,b.y,f),...(a.duty?{duty:a.duty}:{}),...(a.supportFor?{supportFor:a.supportFor}:{})};
}

const MOTION_DEFAULTS={mentality:'balanced',pressing:'balanced',width:'balanced',passing:'mixed',tempo:'balanced',defensiveLine:'balanced',transition:'balanced',ballLoss:'balanced'};
const distance=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*.63);

function contextFor(sequence,tactics){
  return {home:{...MOTION_DEFAULTS,...tactics.home,...sequence.tacticalContext?.home},away:{...MOTION_DEFAULTS,...tactics.away,...sequence.tacticalContext?.away},intent:sequence.tacticalContext?.intent??null};
}

/** Route participants are supplied by the resolved possession, never invented here. */
function routeBallKeys(sequence,positions,fromFrame){
  const allowed=new Set(positions.filter(p=>p.side===sequence.side).map(p=>p.player.id));
  const route=(sequence.passRoute??[]).filter(id=>allowed.has(id));
  if(!route.length)return null;
  const keys=fromFrame?.ball?[{at:0,...fromFrame.ball,playerId:fromFrame.carrierId??null}]:[{at:0,playerId:route[0],routeIndex:0,height:0}];
  keys.push({at:.1,playerId:route[0],routeIndex:0,height:0});
  if(route.length===1){keys.push({at:1,playerId:route[0],height:0});return keys;}
  const interceptor=positions.find(p=>p.player.id===sequence.interceptedById&&p.side!==sequence.side);
  const interval=.78/(route.length-1);
  for(let i=0;i<route.length-1;i++){
    const start=.1+interval*i;
    keys.push({at:start+interval*.36,playerId:route[i],routeIndex:i,height:0});
    keys.push({at:start+interval,playerId:interceptor&&i===route.length-2?interceptor.player.id:route[i+1],routeIndex:i+1,height:0});
  }
  keys.push({at:1,playerId:interceptor?.player.id??route.at(-1),height:0});
  return keys;
}

/* Tactical movement follows positional play: nearby passing triangles and
 * compensating cover when somebody runs beyond the ball. This is an original
 * illustrative steering model, not Football Manager code or tracking data.
 * Background: footballmanager.com/features/truer-football-motion-match-authenticity-positional-play
 */
function reactiveTracks(sequence,positions,{fromFrame,context,duration,ball,legacyTracks}){
  const side=sequence.side,other=side==='home'?'away':'home',ownT=context[side],defT=context[other];
  const width=ownT.width==='wide'?1.28:ownT.width==='narrow'?.58:.92;
  const direct=ownT.passing==='direct',short=ownT.passing==='short';
  const hold=ownT.transition==='hold'&&['recovery','counter'].includes(sequence.kind);
  const counter=!hold&&(sequence.kind==='counter'||(sequence.kind==='recovery'&&ownT.transition==='counter'));
  const lane=sequence.lane==='left'?22:sequence.lane==='right'?78:50;
  const members=positions.map(p=>{
    const initial=fromFrame?.players?.find(item=>item.id===p.player.id)??p;
    return {id:p.player.id,side:p.side,role:p.role??p.player.position,player:p.player,base:canonical(p,side),pos:canonical(initial,side),vx:0,vy:0,points:[{at:0,...point(initial.x,initial.y),duty:'shape'}]};
  });
  const byId=new Map(members.map(p=>[p.id,p]));
  const own=members.filter(p=>p.side===side),defenders=members.filter(p=>p.side!==side);
  const route=(sequence.passRoute??[]).filter(id=>byId.has(id));
  const defensiveCover=own.filter(p=>p.role==='DF').sort((a,b)=>Math.abs(a.base.y-50)-Math.abs(b.base.y-50)).slice(0,2).map(p=>p.id);
  const pivot=own.filter(p=>p.role==='MF').sort((a,b)=>a.base.x-b.base.x||Math.abs(a.base.y-50)-Math.abs(b.base.y-50))[0];
  const steps=Math.max(70,Math.ceil(duration/60)),dt=duration/steps/1000;
  let pressingIds=[],lastCarrierId=null;
  for(let step=1;step<=steps;step++){
    const t=step/steps;
    const end=Math.max(0,ball.findIndex(key=>key.at>=t));
    const left=ball[Math.max(0,end-1)]??ball[0],right=ball[end]??ball.at(-1);
    const carrier=byId.get(left.playerId)??byId.get(sequence.actorId)??own[0];
    const recipient=byId.get(right.playerId)??carrier;
    const fraction=clamp((t-left.at)/Math.max(.001,right.at-left.at),0,1);
    const keyPosition=key=>Number.isFinite(key.x)?canonical(key,side):(byId.get(key.playerId)?.pos??carrier?.pos??{x:50,y:50});
    const p0=keyPosition(left),p1=keyPosition(right);
    const focus=point(mix(p0.x,p1.x,fraction),mix(p0.y,p1.y,fraction));
    const ownCarrier=carrier?.side===side?carrier:byId.get(sequence.actorId)??own[0];
    const routeIndex=Number.isInteger(left.routeIndex)?left.routeIndex:Math.max(0,route.indexOf(ownCarrier?.id));
    const nextReceiver=recipient?.side===side&&recipient.id!==ownCarrier?.id?recipient:byId.get(route[routeIndex+1]);
    const isLoss=['recovery','counter'].includes(sequence.kind)||sequence.source==='counter';
    const pressCount=defT.ballLoss==='regroup'&&isLoss?0:defT.ballLoss==='counterpress'&&isLoss?2:defT.pressing==='high'?2:defT.pressing==='low'?0:1;
    if(lastCarrierId!==ownCarrier?.id){
      pressingIds=defenders.filter(p=>p.role!=='GK'&&p.id!==sequence.interceptedById).sort((a,b)=>distance(a.pos,focus)-distance(b.pos,focus)+(a.role==='DF'?3:0)-(b.role==='DF'?3:0)).slice(0,Math.max(0,pressCount-(sequence.interceptedById?1:0))).map(p=>p.id);
      lastCarrierId=ownCarrier?.id;
    }
    const nearby=own.filter(p=>p.role!=='GK'&&p.id!==ownCarrier?.id&&p.id!==nextReceiver?.id&&!defensiveCover.includes(p.id)).sort((a,b)=>distance(a.base,focus)-distance(b.base,focus)+(a.role==='FW'?7:0)-(b.role==='FW'?7:0));
    const supportIds=nearby.slice(0,2).map(p=>p.id);
    const targets=new Map();
    for(const p of members){
      const attacking=p.side===side,wideY=clamp(50+(p.base.y-50)*width,8,92);
      const depthOffset=(attacking?p.base.x:100-p.base.x)-({GK:8,DF:22,MF:33,FW:43}[p.role]??33);
      const ownRank=own.findIndex(item=>item.id===p.id);
      const mentality=ownT.mentality==='attacking'?4:ownT.mentality==='defensive'?-4:0;
      const runDepth=counter?20:direct?15:short?7:11;
      let target,duty='shape';
      if(attacking){
        if(p.role==='GK')target=point(clamp(focus.x-29,8,18),50+(focus.y-50)*.14);
        else if(p.id===ownCarrier?.id){
          const carryDepth=hold?-1:counter?16:direct?10:short?3:6;
          const roleCeiling=p.role==='DF'?64:p.role==='MF'?78:90;
          target=point(clamp(p.pos.x+carryDepth,8,roleCeiling),mix(p.pos.y,hold?50:lane,.22));duty=hold?'retain':'carry';
        }else if(p.id===nextReceiver?.id){
          const backPass=p.role==='DF'||(p.role==='MF'&&p.base.x<(ownCarrier?.base.x??0)-3);
          const dx=backPass?(hold?-13:-8):(short?10:direct?29:18)+(counter?8:0);
          const offset=(wideY<focus.y?-1:1)*(short?12:direct?20:16);
          target=point(clamp(focus.x+dx,12,p.role==='DF'?65:91),clamp(focus.y+offset,8,92));duty=backPass?'recycle':direct||counter?'run':'receive';
        }else if(defensiveCover.includes(p.id)){
          const lineShift=ownT.defensiveLine==='high'?5:ownT.defensiveLine==='low'?-5:0;
          target=point(clamp(focus.x-23+lineShift,19,48)+depthOffset,35+defensiveCover.indexOf(p.id)*30+(focus.y-50)*.12);duty='cover';
        }else if(supportIds.includes(p.id)){
          const rank=supportIds.indexOf(p.id),sign=rank===0?-1:1;
          const spread=short?11:ownT.width==='wide'?20:15;
          target=point(focus.x+(rank===0?-9:hold?-5:6),focus.y+sign*spread);duty='support';
        }else if(p.id===pivot?.id){target=point(clamp(focus.x-13,25,58),50+(focus.y-50)*.2);duty='cover';}
        else if(p.role==='DF'){
          const ballSide=(p.base.y-50)*(focus.y-50)>0;
          target=point(clamp(focus.x+(ballSide?1:-20),24,ballSide?67:46),wideY);duty=ballSide?'support':'cover';
        }else if(p.role==='FW'){
          target=point(clamp(focus.x+(hold?8:runDepth)+mentality+((ownRank%2)*3),48,90),wideY);duty=direct||counter?'run':'width';
        }else{
          const halfSpace=p.base.y<50?30:70;
          target=point(clamp(focus.x+(hold?-8:3)+depthOffset,31,74),mix(halfSpace,wideY,.35)+(focus.y-50)*.12);duty='balance';
        }
      }else{
        const line=(defT.defensiveLine==='high'?65:defT.defensiveLine==='low'?85:75)+clamp(focus.x-64,0,23)*.28;
        const compactY=50+(p.base.y-50)*.66+(focus.y-50)*.28;
        if(p.id===sequence.interceptedById){
          const sender=byId.get(route[Math.max(0,(sequence.interceptedPassIndex??route.length-2))]);
          const intended=byId.get(route.at(-1));
          target=point(mix(sender?.pos.x??focus.x,intended?.pos.x??focus.x+12,.57),mix(sender?.pos.y??focus.y,intended?.pos.y??focus.y,.57));
          duty='intercept';
        }else if(p.role==='GK')target=point(defT.defensiveLine==='high'?92:96,clamp(50+(focus.y-50)*.2,43,57));
        else if(pressingIds.includes(p.id)){
          const rank=pressingIds.indexOf(p.id);
          target=rank===0?point(focus.x+2.8,focus.y+(p.pos.y<focus.y?-2.2:2.2)):point(mix(focus.x,nextReceiver?.pos.x??focus.x+7,.45)+2,mix(focus.y,nextReceiver?.pos.y??focus.y+8,.45));
          duty=rank===0?'press':'screen';
        }else{
          target=point(line-(p.role==='DF'?0:p.role==='MF'?14:27)-depthOffset,compactY);
          duty=isLoss&&defT.ballLoss==='regroup'?'regroup':p.role==='DF'?'line':'cover';
        }
      }
      // The already-resolved shot keeps the named taker and goalkeeper on its
      // original approach/save tracks; other players react to those movements.
      if(sequence.kind==='shot'&&(p.id===sequence.actorId||p.id===sequence.keeperId)){
        const original=legacyTracks.find(track=>track.id===p.id);
        if(original)target=canonical(interpolate(original.points,t),side);
        duty=p.id===sequence.actorId?'shoot':'goalkeeper';
      }
      targets.set(p.id,{...target,duty,supportFor:duty==='support'?ownCarrier?.id:null});
    }
    for(const p of members){
      const target=targets.get(p.id);
      const maxSpeed=(p.role==='GK'?3.2:['run','press','screen','intercept'].includes(target.duty)?8.8:['receive','support','carry'].includes(target.duty)?6.8:5.2)*(p.side===side?(ownT.tempo==='high'?1.15:ownT.tempo==='low'?.9:1):(defT.pressing==='high'?1.08:defT.pressing==='low'?.94:1));
      let dx=target.x-p.pos.x,dy=(target.y-p.pos.y)*.63;
      const len=Math.hypot(dx,dy),speed=Math.min(maxSpeed,len*2.3);
      let vx=len?dx/len*speed:0,vy=len?dy/len*speed:0;
      for(const neighbour of members){
        if(neighbour.id===p.id)continue;
        const gap=distance(p.pos,neighbour.pos);
        if(gap>0&&gap<3.6){const strength=(3.6-gap)*1.8;vx+=(p.pos.x-neighbour.pos.x)/gap*strength;vy+=(p.pos.y-neighbour.pos.y)*.63/gap*strength;}
      }
      const acceleration=1-Math.exp(-dt/.19);
      p.vx=mix(p.vx,vx,acceleration);p.vy=mix(p.vy,vy,acceleration);
      p.nextPosition=point(p.pos.x+p.vx*dt,p.pos.y+p.vy*dt/.63);
      p.points.push({at:t,...world(p.nextPosition,side),duty:target.duty,supportFor:target.supportFor});
    }
    for(const p of members)p.pos=p.nextPosition;
  }
  return members.map(p=>({id:p.id,player:p.player,side:p.side,role:p.role,reactive:true,points:p.points}));
}

/** Deterministic scene using only the current presentation and named personnel. */
export function createPitchScene(sequence,positions,{fromFrame,tactics={},nextSequence}={}){
  const seq={kind:'buildup',side:'home',...sequence};
  const context=contextFor(seq,tactics);
  tactics={home:context.home,away:context.away};
  const duration=(DURATIONS[seq.kind]??4500)*(seq.tacticalContext?(context[seq.side].tempo==='high'?.84:context[seq.side].tempo==='low'?1.18:1):1);
  const side=seq.side,kind=seq.kind,lane=seq.lane==='left'?22:seq.lane==='right'?78:50;
  const freeFar=seq.dangerous===false||seq.zone==='midfield'||(kind==='shot'&&seq.source==='free-kick'&&fromFrame?.restartZone==='midfield');
  const own=positions.filter(p=>p.side===side),opponents=positions.filter(p=>p.side!==side);
  const outfield=own.filter(p=>p.player.position!=='GK');
  const choose=(id,role,list=own)=>list.find(p=>p.player.id===id)??list.find(p=>p.player.position===role)??list[0];
  const actor=choose(seq.actorId,'MF'),receiver=choose(seq.receiverId,'FW'),keeper=choose(seq.keeperId,'GK',opponents);
  const midfield=outfield.find(p=>p.player.position==='MF'&&p.player.id!==actor?.player.id)??receiver;
  const defender=outfield.find(p=>p.player.position==='DF')??midfield;
  let tracks=positions.map((p,index)=>{
    const local=canonical(p,side),attacking=p.side===side,role=p.role??p.player.position;
    const initial=fromFrame?.players?.find(item=>item.id===p.player.id)??p;
    let setup={...local},target={...local};
    const rank=(attacking?own:opponents).findIndex(item=>item.player.id===p.player.id);
    const lateral=clamp(local.y*.78+lane*.22,13,87);
    const formationDepth=(attacking?local.x:100-local.x)-({GK:8,DF:22,MF:33,FW:43}[role]??33);
    if(attacking){
      const depth={GK:10,DF:32,MF:51,FW:70};
      const push=(kind==='counter'?18:kind==='shot'?20:kind==='recovery'?8:10)+(tactics[p.side]?.mentality==='attacking'?4:tactics[p.side]?.mentality==='defensive'?-4:0);
      setup=point((depth[role]??48)+formationDepth-(kind==='counter'?12:0),lateral);
      target=point((depth[role]??48)+formationDepth+(role==='GK'?3:push),lateral+(rank%2?3:-3));
    }else{
      const depth={GK:95,DF:80,MF:65,FW:49};
      const pressing=tactics[p.side]?.pressing==='high'?-5:tactics[p.side]?.pressing==='low'?4:0;
      setup=point((depth[role]??70)-formationDepth-(kind==='counter'?13:0)+(role==='GK'?0:pressing),local.y*.84+lane*.16);
      target=point((depth[role]??70)-formationDepth+(role==='GK'?0:kind==='shot'?6:3),local.y*.73+lane*.27);
      // The closest defender closes the carrier instead of drifting randomly.
      if(p.player.id===seq.defenderId){setup=point(64,lane+6);target=point(78,lane+3);}
    }
    if(kind==='corner'){
      if(attacking&&role!=='GK')setup=point(role==='DF'?61:84+(rank%3)*3,25+(rank*13)%52);
      if(!attacking&&role!=='GK')setup=point(82+(rank%4)*3,23+(rank*11)%57);
      if(!attacking&&role==='GK')setup=point(95,50);
      if(p.player.id===actor?.player.id)setup=point(97,lane<50?5:95);
      if(p.player.id===receiver?.player.id)setup=point(85,46);
      target=point(setup.x+(attacking?2:-1),setup.y+(rank%2?4:-4));
      if(p.player.id===actor?.player.id)target={...setup};
    }
    if(kind==='free-kick'||(kind==='shot'&&seq.source==='free-kick')){
      if(freeFar){
        if(attacking&&role!=='GK')setup=point(({DF:34,MF:52,FW:68}[role]??50)+formationDepth,lateral);
        if(!attacking&&role!=='GK')setup=point(({DF:79,MF:65,FW:47}[role]??65)-formationDepth,local.y);
        if(p.player.id===actor?.player.id)setup=point(49,lane);
      }else{
        if(attacking&&role!=='GK')setup=point(70+(rank%3)*6,16+(rank*17)%70);
        if(!attacking&&role!=='GK')setup=point(85+(rank%2)*4,18+(rank*12)%68);
        const wall=opponents.filter(item=>item.player.position!=='GK').slice(0,4);
        const wallIndex=wall.findIndex(item=>item.player.id===p.player.id);
        if(wallIndex>=0)setup=point(84,43+wallIndex*4.5);
        if(p.player.id===actor?.player.id)setup=point(73,lane*.3+35);
      }
      if(!attacking&&role==='GK')setup=point(97,53);
      target=point(setup.x+(attacking?3:-1),setup.y);
    }
    if(kind==='penalty'||(kind==='shot'&&seq.source==='penalty')){
      // Penalty spot 11m from goal; everyone else is behind it, outside the
      // 16.5m area and 9.15m away. The keeper stays on the line until the kick.
      const rest=positions.filter(item=>item.player.id!==actor?.player.id&&item.player.id!==keeper?.player.id);
      const r=rest.findIndex(item=>item.player.id===p.player.id);
      setup=point(72-(r%4)*13,14+Math.floor(r/4)*18);
      if(p.player.id===actor?.player.id)setup=point(86,50);
      if(p.player.id===keeper?.player.id)setup=point(97,50);
      if(attacking&&role==='GK')setup=point(10,50);
      target=p.player.id===keeper?.player.id?point(97,seq.outcome==='saved'?45:58):{...setup};
    }
    if(kind==='shot'){
      if(p.player.id===actor?.player.id&&seq.source!=='penalty'&&seq.source!=='free-kick')setup=point(82,lane*.5+25);
      if(p.player.id===keeper?.player.id){setup=point(seq.source==='penalty'?97:94,50);target=point(97,seq.outcome==='saved'?45:58);}
      if(p.player.id===actor?.player.id)target=point(setup.x+3,setup.y);
    }
    if(kind==='goal'){
      setup=canonical(initial,side);
      target=attacking&&role!=='GK'&&rank>4?point(78+(rank%3)*6,17+Math.floor((rank-4)/3)*12):point(setup.x+(attacking?2:-4),setup.y);
      if(p.player.id===actor?.player.id)target=point(88,15);
      if(!attacking&&role==='GK')target=point(95,50);
    }
    const first=point(initial.x,initial.y),ready=world(setup,side),last=world(target,side);
    const isRestart=['corner','free-kick','penalty'].includes(kind)||(kind==='shot'&&['penalty','free-kick'].includes(seq.source));
    const points=isRestart?[{at:0,...first},{at:.28,...ready},{at:kind==='shot'?.43:.7,...ready},{at:1,...last}]:[{at:0,...first},{at:.38,...ready},{at:1,...last}];
    return {id:p.player.id,player:p.player,side:p.side,role:p.role,points};
  });
  let ball=[];
  const add=(at,player,x,y,height=0)=>ball.push({at,playerId:player?.player?.id??null,...(Number.isFinite(x)?world(point(x,y),side):{}),height});
  if(fromFrame?.ball)ball.push({at:0,...fromFrame.ball,playerId:fromFrame.carrierId??null});
  else add(0,kind==='buildup'?defender:actor);
  if(kind==='buildup'){
    add(.1,defender);add(.3,midfield);add(.51,actor);add(.62,actor);add(.86,receiver);add(1,receiver);
  }else if(kind==='recovery'){
    add(.08,fromFrame?.carrierId===seq.actorId?actor:choose(seq.defenderId,'MF',opponents));add(.38,actor);add(.53,actor);add(.79,seq.receiverId?receiver:actor);add(1,seq.receiverId?receiver:actor);
  }else if(kind==='counter'){
    add(.12,actor);add(.4,midfield);add(.49,midfield);add(.78,receiver);add(1,receiver);
  }else if(kind==='corner'){
    add(.28,actor);add(.53,actor);add(.77,null,88,47,7);add(1,receiver);
  }else if(kind==='free-kick'||kind==='penalty'){
    add(.28,actor);add(.7,actor);add(1,kind==='free-kick'&&nextSequence?.kind!=='shot'&&seq.receiverId?receiver:actor);
  }else if(kind==='shot'){
    add(.25,actor);add(.43,actor);
    const target=seq.outcome==='goal'?{x:98,y:seq.lane==='left'?46:54}:seq.outcome==='wide'?{x:98,y:seq.lane==='left'?34:67}:seq.outcome==='blocked'?{x:88,y:lane*.35+32}:{x:95,y:45};
    add(.82,seq.outcome==='saved'?keeper:null,target.x,target.y,seq.source==='corner'?2.5:0);
    const resultCarrier=positions.find(p=>p.player.id===seq.resultCarrierId);
    if(resultCarrier)add(1,resultCarrier);else add(1,seq.outcome==='saved'?keeper:null,target.x,target.y,0);
  }else if(kind==='goal'){
    add(.01,null,98,54);add(1,null,98,54);
  }else add(1,receiver);
  const resolvedRoute=routeBallKeys(seq,positions,fromFrame);
  if(resolvedRoute&&['buildup','counter'].includes(kind))ball=resolvedRoute;
  const reactive=Boolean(seq.tacticalContext)&&(['buildup','recovery','counter'].includes(kind)||(kind==='shot'&&!['penalty','free-kick','corner'].includes(seq.source)));
  if(reactive)tracks=reactiveTracks(seq,positions,{fromFrame,context,duration,ball,legacyTracks:tracks});
  return {id:seq.id??`${seq.minute}:${kind}`,sequence:seq,kind,side,duration,tracks,ball,reactive,tacticalContext:context,passRoute:resolvedRoute?seq.passRoute.slice():[]};
}

/** Coordinates are percentages, origin top-left. Pure; safe for test/time stepping. */
export function getPitchFrame(scene,elapsedMs){
  const elapsed=clamp(elapsedMs,0,scene.duration),t=elapsed/scene.duration;
  const players=scene.tracks.map(track=>({id:track.id,side:track.side,role:track.role,...interpolate(track.points,t,track.reactive)}));
  const resolve=key=>{
    if(Number.isFinite(key.x))return key;
    const track=scene.tracks.find(item=>item.id===key.playerId);
    const pos=track?interpolate(track.points,key.at,track.reactive):{x:50,y:50};
    return {...key,x:pos.x+((track?.side??scene.side)==='home'?1.1:-1.1),y:pos.y+.6};
  };
  const keys=scene.ball.map(resolve),end=keys.findIndex(key=>key.at>=t);
  const b=keys[end<0?keys.length-1:end]??{at:1,x:50,y:50},a=keys[Math.max(0,end-1)]??b;
  const f=a===b?1:clamp((t-a.at)/Math.max(.001,b.at-a.at),0,1);
  const ball={x:mix(a.x,b.x,f),y:mix(a.y,b.y,f),height:mix(a.height??0,b.height??0,f)+(a.playerId!==b.playerId?Math.sin(f*Math.PI)*(scene.kind==='corner'?8:scene.kind==='shot'?2:scene.tacticalContext?.[scene.side]?.passing==='direct'&&Math.hypot(b.x-a.x,b.y-a.y)>20?4:1):0)};
  const carrierId=a.playerId===b.playerId?a.playerId:f<.08?a.playerId:f>.92?b.playerId:null;
  if(carrierId&&a.playerId===b.playerId&&t>0){const carrier=players.find(p=>p.id===carrierId);if(carrier){ball.x=carrier.x+(carrier.side==='home'?1.1:-1.1);ball.y=carrier.y+.6;ball.height=0;}}
  const goalReached=scene.kind==='goal'||(scene.kind==='shot'&&scene.sequence.outcome==='goal'&&t>=.82);
  const phase=scene.kind==='goal'?'celebration':['corner','free-kick','penalty'].includes(scene.kind)&&t<.55?'set-piece':scene.kind==='shot'?(t<.43?'approach':t<.82?'shot':scene.sequence.outcome??'shot'):scene.kind==='recovery'&&t<.4?'recovery':carrierId?'carrying':'pass';
  return {sceneId:scene.id,kind:scene.kind,side:scene.side,phase,elapsed,tacticalContext:scene.tacticalContext,passRoute:scene.passRoute,interceptedById:scene.sequence.interceptedById??null,duration:scene.duration,restartZone:scene.sequence.zone??(scene.sequence.dangerous===false?'midfield':null),progress:t,players,ball,carrierId,goalReached,goalEventId:goalReached?(scene.sequence.eventId??scene.sequence.attackId??scene.id):null,trail:{x:a.x,y:a.y},complete:t>=1};
}

export function idlePitchFrame(positions){
  return {sceneId:'ready',kind:'ready',side:null,phase:'ready',elapsed:0,duration:0,progress:0,players:positions.map(p=>({id:p.player.id,side:p.side,role:p.role,x:p.x,y:p.y})),ball:{x:50,y:50,height:0},carrierId:null,goalReached:false,goalEventId:null,complete:true};
}

export function settlePitchFrame(frame,currentPositions){
  return {...frame,goalReached:false,goalEventId:null,phase:'complete',carrierId:currentPositions.some(p=>p.player.id===frame.carrierId)?frame.carrierId:null,players:currentPositions.map(p=>frame.players.find(item=>item.id===p.player.id)??{id:p.player.id,side:p.side,role:p.role,x:p.x,y:p.y})};
}
