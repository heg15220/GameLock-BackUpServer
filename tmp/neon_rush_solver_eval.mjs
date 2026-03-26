import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('public/arcade/neon-rush/index.html', 'utf8');
const start = html.indexOf('const W=900');
const end = html.indexOf('GAME STATE');
if (start < 0 || end < 0) throw new Error('Could not locate level script');
const snippet = html.slice(start, end);
const ctx = {};
vm.createContext(ctx);
vm.runInContext(snippet + '\nthis.exports={W,H,GR,T,GV,JF,MS,JPF,TERMINAL_VY,COYOTE_FRAMES,JUMP_BUFFER_FRAMES,S,B,LL,buildLv};', ctx);
const base = ctx.exports;

const argMap = Object.fromEntries(process.argv.slice(2).map((s) => {
  const [k,v] = s.split('=');
  return [k, v];
}));

const cfg = {
  ...base,
  MS: Number(argMap.MS ?? base.MS),
  JF: Number(argMap.JF ?? base.JF),
  GV: Number(argMap.GV ?? base.GV),
  JPF: Number(argMap.JPF ?? base.JPF),
  COYOTE_FRAMES: Number(argMap.COYOTE ?? base.COYOTE_FRAMES),
  JUMP_BUFFER_FRAMES: Number(argMap.BUF ?? base.JUMP_BUFFER_FRAMES),
  TERMINAL_VY: Number(argMap.TERM ?? base.TERMINAL_VY),
  ALLOW_AIR_JUMP: String(argMap.AIR ?? 'false') === 'true',
  AIR_JUMP_FORCE: Number(argMap.AIRF ?? -11.8),
};

function rO(ax,ay,aw,ah,bx,by,bw,bh){
  return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by;
}

function step(state, objs, pressJump){
  let {x,y,vy,onGround,coyote,jumpBuffer,airJumpUsed,dead,win} = state;
  if(dead||win) return state;

  if(jumpBuffer>0) jumpBuffer--;
  if(coyote>0) coyote--;
  if(pressJump) jumpBuffer = Math.max(jumpBuffer, cfg.JUMP_BUFFER_FRAMES);

  if(jumpBuffer>0){
    if(onGround||coyote>0){
      vy=cfg.JF; onGround=false; coyote=0; jumpBuffer=0;
    } else if(cfg.ALLOW_AIR_JUMP && !airJumpUsed){
      vy=Math.min(vy, cfg.AIR_JUMP_FORCE);
      onGround=false; coyote=0; jumpBuffer=0; airJumpUsed=true;
    }
  }

  vy=Math.min(vy+cfg.GV, cfg.TERMINAL_VY);
  y+=vy;
  x+=cfg.MS;

  onGround=false;
  if(y+cfg.T>=cfg.GR){
    y=cfg.GR-cfg.T;
    vy=0;
    onGround=true;
    coyote=cfg.COYOTE_FRAMES;
    airJumpUsed=false;
  }
  if(y<0){y=0;vy=Math.abs(vy)*0.4;}
  if(y>cfg.H+120){dead=true;}

  const px=x,py=y,pw=cfg.T,ph=cfg.T;
  if(!dead){
    for(const obj of objs){
      const ox=obj.x,oy=obj.y,ow=obj.w||cfg.S,oh=obj.h||cfg.S;
      if(ox-x>cfg.W+120||ox+ow<x-40)continue;
      if(obj.t==='s'){
        if(rO(px+8,py+8,pw-16,ph-10,ox+8,oy+12,ow-16,oh-14)){dead=true;break;}
      }else if(obj.t==='i'){
        if(rO(px+8,py+5,pw-16,ph-10,ox+8,oy,ow-16,oh-14)){dead=true;break;}
      }else if(obj.t==='b'||obj.t==='pl'){
        if(rO(px,py,pw,ph,ox,oy,ow,oh)){
          const oL=(px+pw)-ox,oR=(ox+ow)-px,oT=(py+ph)-oy,oB=(oy+oh)-py;
          if(Math.min(oT,oB)<Math.min(oL,oR)){
            if(oT<oB){
              y=oy-ph;
              vy=0;
              onGround=true;
              coyote=cfg.COYOTE_FRAMES;
              airJumpUsed=false;
            }
            else{y=oy+oh;vy=Math.abs(vy)*.3;}
          }else{dead=true;break;}
        }
      }else if(obj.t==='j'){
        if(rO(px,py+ph-5,pw,5,ox,oy,ow,oh)){
          vy=cfg.JPF;onGround=false;coyote=0;jumpBuffer=0;airJumpUsed=false;
        }
      }else if(obj.t==='o'){
        const d=Math.sqrt((px+pw/2-ox)**2+(py+ph/2-oy)**2);
        if(d<obj.r+17&&jumpBuffer>0){
          vy=cfg.JF*1.1;onGround=false;coyote=0;jumpBuffer=0;airJumpUsed=false;
        }
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

function isSolvable(levelIndex,maxFrames=1400){
  const objs=cfg.buildLv(levelIndex);
  let states=new Map();
  const init={x:120,y:cfg.GR-cfg.T,vy:0,onGround:true,coyote:cfg.COYOTE_FRAMES,jumpBuffer:0,airJumpUsed:false,dead:false,win:false};
  states.set(keyOf(init),init);
  for(let f=0;f<maxFrames;f++){
    const next=new Map();
    for(const st of states.values()){
      for(const pressJump of [false,true]){
        const ns=step(st,objs,pressJump);
        if(ns.dead)continue;
        if(ns.win)return {solvable:true,frame:f+1};
        const k=keyOf(ns);
        if(!next.has(k))next.set(k,ns);
      }
    }
    if(next.size===0)return {solvable:false,frame:f+1};
    if(next.size>7000){
      const arr=[...next.values()];
      arr.sort((a,b)=>a.y-b.y||Math.abs(a.vy)-Math.abs(b.vy));
      states=new Map(arr.slice(0,7000).map(s=>[keyOf(s),s]));
    }else states=next;
  }
  return {solvable:false,frame:maxFrames};
}

const results=[];
for(let i=0;i<20;i++)results.push({level:i+1,...isSolvable(i)});
const unsolved=results.filter(r=>!r.solvable).map(r=>r.level);
console.log(JSON.stringify({cfg:{MS:cfg.MS,JF:cfg.JF,GV:cfg.GV,JPF:cfg.JPF,COYOTE:cfg.COYOTE_FRAMES,BUF:cfg.JUMP_BUFFER_FRAMES,AIR:cfg.ALLOW_AIR_JUMP,AIRF:cfg.AIR_JUMP_FORCE},solved:20-unsolved.length,unsolved,results},null,2));
