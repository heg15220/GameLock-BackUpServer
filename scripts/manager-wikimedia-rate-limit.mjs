import fs from 'node:fs/promises';
import path from 'node:path';

const directory=path.resolve('output/manager-v12');
const statePath=path.join(directory,'wikimedia-rate-limit.json');
const lockPath=path.join(directory,'wikimedia-rate-limit.lock');
const requestLockPath=path.join(directory,'wikimedia-request.lock');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function readState(){try{return JSON.parse(await fs.readFile(statePath,'utf8'));}catch{return {};}}
async function changeState(change){
 await fs.mkdir(directory,{recursive:true});
 let lock;
 while(!lock){
  try{lock=await fs.open(lockPath,'wx');}
  catch(error){
   if(error.code!=='EEXIST')throw error;
   try{const stat=await fs.stat(lockPath);if(Date.now()-stat.mtimeMs>30000)await fs.unlink(lockPath);}catch{}
   await sleep(100);
  }
 }
 try{
  const state=await readState(),result=change(state);
  const temporary=`${statePath}.${process.pid}.tmp`;
  await fs.writeFile(temporary,JSON.stringify(state));await fs.rename(temporary,statePath);
  return result;
 }finally{await lock.close();await fs.unlink(lockPath).catch(()=>{});}
}

/** Shared, sequential API permits for English and multilingual importers. */
export async function waitForWikimediaSlot(intervalMs=0){
 for(;;){
  const scheduled=await changeState(state=>{
   const at=Math.max(Date.now(),state.nextAt||0,state.blockedUntil||0);
   state.nextAt=at+Math.max(intervalMs,state.minimumIntervalMs||2000);state.updatedAt=new Date().toISOString();return at;
  });
  await sleep(Math.max(0,scheduled-Date.now()));
  const state=await readState();
  if((state.blockedUntil||0)<=Date.now())return;
  // A peer received Retry-After while this process waited for its permit.
 }
}

export async function setWikimediaInterval(milliseconds){
 return changeState(state=>{state.minimumIntervalMs=Math.max(2000,milliseconds);state.updatedAt=new Date().toISOString();return state.minimumIntervalMs;});
}

export async function backoffWikimedia(milliseconds,reason='server-retry-after'){
 return changeState(state=>{
  state.blockedUntil=Math.max(state.blockedUntil||0,Date.now()+Math.max(30000,milliseconds));
  if(/429/.test(reason))state.minimumIntervalMs=Math.max(8000,state.minimumIntervalMs||0);
  state.nextAt=Math.max(state.nextAt||0,state.blockedUntil);
  state.blockedReason=reason;state.updatedAt=new Date().toISOString();return state.blockedUntil;
 });
}

/** One in-flight request across importers, with the documented contact UA.
 * Read the whole response under the lock so streaming bodies cannot overlap.
 */
export async function fetchWikimedia(url,options={}){
 await fs.mkdir(directory,{recursive:true});let lock;
 while(!lock){
  try{lock=await fs.open(requestLockPath,'wx');}
  catch(error){
   if(error.code!=='EEXIST')throw error;
   try{const stat=await fs.stat(requestLockPath);if(Date.now()-stat.mtimeMs>120000)await fs.unlink(requestLockPath);}catch{}
   await sleep(100);
  }
 }
 try{
  await waitForWikimediaSlot();
  const headers=new Headers(options.headers||{});
  if(!headers.has('User-Agent'))headers.set('User-Agent','GameLockArchive/1.0 (historical football facts; gamelockweb@gmail.com)');
  const response=await fetch(url,{...options,headers,signal:options.signal||AbortSignal.timeout(45000)});
  const body=await response.arrayBuffer();
  if(response.status===429||response.status===503){
   const value=response.headers.get('retry-after');
   const delay=/^\d+(?:\.\d+)?$/.test(value||'')?Number(value)*1000:Math.max(0,Date.parse(value||'')-Date.now())||30000;
   await backoffWikimedia(Math.max(30000,delay),`shared-http-${response.status}`);
  }else{
   try{if(JSON.parse(new TextDecoder().decode(body)).error?.code==='maxlag')await backoffWikimedia(30000,'shared-maxlag');}catch{}
  }
  return new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers});
 }finally{await lock.close();await fs.unlink(requestLockPath).catch(()=>{});}
}
