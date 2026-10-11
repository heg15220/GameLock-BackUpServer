import { defenderRoles } from './lineup-roles.js';

export const LIVE_FORMATIONS=['4-3-3','4-4-2','3-5-2','4-2-3-1','5-3-2'];

/** Layout coordinates illustrate the current formation; they are not tracking data. */
export function matchPitchPositions(players,formation='4-3-3',side='home'){
  const groups=formation==='4-2-3-1'
    ? [{role:'GK',count:1,x:8},{role:'DF',count:4,x:21},{role:'MF',count:2,x:29},{role:'MF',count:3,x:36},{role:'FW',count:1,x:43}]
    : [{role:'GK',count:1,x:8},...String(formation).split('-').map((count,i)=>({role:['DF','MF','FW'][i],count:Number(count),x:[22,33,43][i]}))];
  const used=new Set(),slots=[];
  for(const group of groups){
    let selected=players.filter(player=>player.position===group.role&&!used.has(player.id));
    if(group.role==='DF')selected=selected.slice().sort((a,b)=>{
      const rank=p=>defenderRoles(p)[0]==='LB'?0:defenderRoles(p)[0]==='RB'?2:1;
      return rank(a)-rank(b);
    });
    selected=selected.slice(0,group.count);
    for(let index=0;index<group.count;index++){
      const player=selected[index];
      if(player)used.add(player.id);
      const y=group.count===1?50:17+66/(group.count-1)*index;
      slots.push({player,role:group.role,x:side==='home'?group.x:100-group.x,y:side==='home'?y:100-y,side});
    }
  }
  // Reserve natural roles first. Only then fill the remaining formation slots
  // with current outfield players; nobody is added to or removed from the team.
  const others=players.filter(player=>!used.has(player.id)&&player.position!=='GK');
  for(const slot of slots)if(!slot.player&&slot.role!=='GK')slot.player=others.shift();
  return slots.filter(slot=>slot.player);
}

/** Never read a precomputed report or any events beyond the visible clock. */
export function visibleMatchEvents(match){
  const minute=Number.isFinite(match?.minute)?match.minute:Number.isFinite(match?.duration)?match.duration:0;
  return (match?.events??[]).filter(event=>Number.isFinite(event.minute)&&event.minute<=minute);
}

export function matchTeam(world,id,lang='es'){
  if(id?.startsWith('nation:')){
    const country=world.countries?.find(item=>item.fifa===id.slice(7));
    return {id,name:country?.[`name_${lang}`]??country?.name??id.slice(7),abbreviation:id.slice(7),crest:country?.flag};
  }
  return world.clubs.find(club=>club.id===id)??{id,name:id??'—',abbreviation:'FC'};
}

export function recordedFinalLineup(match,side){
  let ids=[...(match?.[`${side}Lineup`]??[])];
  for(const event of visibleMatchEvents(match)){
    if(event.side!==side)continue;
    if(event.type==='substitution')ids=ids.filter(id=>id!==event.playerOutId).concat(event.playerInId??[]);
    if(event.type==='injury'||event.type==='red-card')ids=ids.filter(id=>id!==event.playerId);
  }
  return [...new Set(ids)];
}

export function matchEventKey(event,index=0){
  return event?`${event.minute}:${event.type}:${event.side??''}:${event.playerId??event.playerInId??''}:${index}`:'kickoff';
}

export function matchInitials(name=''){
  const words=name.split(/\s+/).filter(Boolean);
  return (words.length>1?words[0][0]+words.at(-1)[0]:name.slice(0,2)).toUpperCase();
}

/** Automatic changes apply after the possession; later manual decisions cancel it. */
export function presentationLineups(presentation,players,current,manualDecisionKey=''){
  const usesSnapshot=Boolean(presentation?.onPitch&&!manualDecisionKey);
  return {usesSnapshot,...Object.fromEntries(['home','away'].map(side=>[side,usesSnapshot
    ? (presentation.onPitch[side]??[]).map(id=>players.get(id)).filter(Boolean)
    : current[side]]))};
}
