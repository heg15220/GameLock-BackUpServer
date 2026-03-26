import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('public/arcade/neon-rush/index.html', 'utf8');
const start = html.indexOf('const W=900');
const end = html.indexOf('GAME STATE');
const snippet = html.slice(start, end);
const ctx = {};
vm.createContext(ctx);
vm.runInContext(snippet + '\nthis.exports={W,H,GR,T,GV,JF,MS,JPF,TERMINAL_VY,COYOTE_FRAMES,JUMP_BUFFER_FRAMES,S,B,LL,buildLv};', ctx);
const base = ctx.exports;

function rO(ax,ay,aw,ah,bx,by,bw,bh){return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by;}

function step(state, objs, cfg, pressJump){
  let {x,y,vy,onGround,coyote,jumpBuffer,airJumpUsed,dead,win} = state;
  const {W,H,GR,T,S,GV,JF,MS,JPF,TERMINAL_VY,COYOTE_FRAMES,JUMP_BUFFER_FRAMES,AIR_JUMP_FORCE,ALLOW_AIR_JUMP} = cfg;
  if(dead||win)return state;

  if(jumpBuffer>0)jumpBuffer--;
  if(coyote>0)coyote--;
  if(pressJump)jumpBuffer=Math.max(jumpBuffer,JUMP_BUFFER_FRAMES);

  if(jumpBuffer>0){
    if(onGround||coyote>0){
      vy=JF;onGround=false;coyote=0;jumpBuffer=0;
    } else if(ALLOW_AIR_JUMP && !airJumpUsed){
      vy=Math.min(vy, AIR_JUMP_FORCE);
      onGround=false;
      coyote=0;
      jumpBuffer=0;
      airJumpUsed=true;
    }
  }

  vy=Math.min(vy+GV,TERMINAL_VY);
  y+=vy;
  x+=MS;

  onGround=false;
  if(y+T>=GR){y=GR-T;vy=0;onGround=true;coyote=COYOTE_FRAMES;airJumpUsed=false;}
  if(y<0){y=0;vy=Math.abs(vy)*0.4;}
  if(y>H+120)dead=true;

  const px=x,py=y,pw=T,ph=T;
  if(!dead){
    for(const obj of objs){
      const ox=obj.x,oy=obj.y,ow=obj.w||S,oh=obj.h||S;
      if(ox-x>W+120||ox+ow<x-40)continue;
      if(obj.t==='s'){
        if(rO(px+8,py+8,pw-16,ph-10,ox+8,oy+12,ow-16,oh-14)){dead=true;break;}
      }else if(obj.t==='i'){
        if(rO(px+8,py+5,pw-16,ph-10,ox+8,oy,ow-16,oh-14)){dead=true;break;}
      }else if(obj.t==='b'||obj.t==='pl'){
        if(rO(px,py,pw,ph,ox,oy,ow,oh)){
          const oL=(px+pw)-ox,oR=(ox+ow)-px,oT=(py+ph)-oy,oB=(oy+oh)-py;
          if(Math.min(oT,oB)<Math.min(oL,oR)){
            if(oT<oB){y=oy-ph;vy=0;onGround=true;coyote=COYOTE_FRAMES;airJumpUsed=false;}
            else{y=oy+oh;vy=Math.abs(vy)*.3;}
          }else{dead=true;break;}
        }
      }else if(obj.t==='j'){
        if(rO(px,py+ph-5,pw,5,ox,oy,ow,oh)){vy=JPF;onGround=false;coyote=0;jumpBuffer=0;airJumpUsed=false;}
      }else if(obj.t==='o'){
        const d=Math.sqrt((px+pw/2-ox)**2+(py+ph/2-oy)**2);
        if(d<obj.r+17&&jumpBuffer>0){vy=JF*1.1;onGround=false;coyote=0;jumpBuffer=0;airJumpUsed=false;}
      }else if(obj.t==='p'){
        if(rO(px,py,pw,ph,ox,oy,ow,oh)){win=true;break;}
      }
    }
  }
  return {x,y,vy,onGround,coyote,jumpBuffer,airJumpUsed,dead,win};
}

function keyOf(st){
  const y=Math.round(st.y*2)/2;
  const vy=Math.round(st.vy*10)/10;
  return `${y}|${vy}|${st.onGround?1:0}|${st.coyote}|${st.jumpBuffer}|${st.airJumpUsed?1:0}`;
}

function solvable(levelIndex,cfg,maxFrames=1400){
  const objs=cfg.buildLv(levelIndex);
  let states=new Map();
  const init={x:120,y:cfg.GR-cfg.T,vy:0,onGround:true,coyote:cfg.COYOTE_FRAMES,jumpBuffer:0,airJumpUsed:false,dead:false,win:false};
  states.set(keyOf(init),init);
  for(let f=0;f<maxFrames;f++){
    const next=new Map();
    for(const st of states.values()){
      for(const pressJump of [false,true]){
        const ns=step(st,objs,cfg,pressJump);
        if(ns.dead)continue;
        if(ns.win)return true;
        const k=keyOf(ns);
        if(!next.has(k))next.set(k,ns);
      }
    }
    if(next.size===0)return false;
    if(next.size>8000){
      const arr=[...next.values()];
      arr.sort((a,b)=>a.y-b.y||Math.abs(a.vy)-Math.abs(b.vy));
      states=new Map(arr.slice(0,8000).map(s=>[keyOf(s),s]));
    }else states=next;
  }
  return false;
}

const candidates=[];
for(const MS of [5.4,5.6,5.8,6.0,6.2,6.45]){
  for(const JF of [-12.8,-13.2,-13.6,-14.0]){
    for(const GV of [0.52,0.56,0.6]){
      for(const allowAir of [false,true]){
        const cfg={...base,MS,JF,GV,ALLOW_AIR_JUMP:allowAir,AIR_JUMP_FORCE:-11.8};
        let ok=0;
        for(let i=0;i<20;i++) if(solvable(i,cfg)) ok++;
        candidates.push({MS,JF,GV,allowAir,ok});
      }
    }
  }
}

candidates.sort((a,b)=>b.ok-a.ok||a.MS-b.MS);
console.log(JSON.stringify(candidates.slice(0,20),null,2));
