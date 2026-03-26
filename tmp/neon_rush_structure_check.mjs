import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('public/arcade/neon-rush/index.html','utf8');
const start=html.indexOf('const W=900');
const end=html.indexOf('GAME STATE');
const snippet=html.slice(start,end);
const ctx={};
vm.createContext(ctx);
vm.runInContext(snippet+"\nthis.exports={META,ENV,buildLv,levelLengthFor};",ctx);
const {META,ENV,buildLv,levelLengthFor}=ctx.exports;
const samples=[0,19,20,39,59,79,99].map((n)=>{
  const objs=buildLv(n);
  const portal=objs.filter(o=>o.t==='p').at(-1);
  return {n:n+1,len:levelLengthFor(n),objs:objs.length,portalX:portal?.x,diff:META[n]?.d,env:META[n]?.e};
});
console.log(JSON.stringify({levels:META.length,envs:Object.keys(ENV).length,samples},null,2));
