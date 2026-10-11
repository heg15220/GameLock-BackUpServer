import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';

// Real reducer saves, imported through the same control used by a player.
// The render bridge and data attributes are read-only observation surfaces.
const args=process.argv.slice(2).filter(arg=>!arg.startsWith('--'));
const base=args[0]||'http://127.0.0.1:5192';
const output=args[1]||'output/manager-v6/tactics';
await fs.mkdir(`${output}/fixtures`,{recursive:true});
const bundle=await build({stdin:{contents:`
  export {createManagerCareer,managerReducer,serializeManagerCareer,restoreManagerCareer} from './src/games/sports/manager/engine.js';
  export {getManagerWorld} from './src/games/sports/manager/data.js';
`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const engine=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const catalogue=engine.getManagerWorld(2013),ids=['real-madrid','barcelona'];
const world={...catalogue,clubs:catalogue.clubs.filter(club=>ids.includes(club.id)),players:catalogue.players.filter(player=>ids.includes(player.clubId)),competitions:catalogue.competitions.filter(league=>league.id==='laliga'),countries:[]};
const fields={width:'Anchura en el partido',passing:'Pases en el partido',tempo:'Ritmo en el partido',defensiveLine:'Línea defensiva en el partido',transition:'Al recuperar en el partido',ballLoss:'Al perder en el partido'};
const custom={width:'narrow',passing:'short',tempo:'low',defensiveLine:'high',transition:'hold',ballLoss:'counterpress'};
const plans={
  narrow:{width:'narrow',passing:'short',tempo:'low',defensiveLine:'balanced',transition:'hold',ballLoss:'regroup'},
  wide:{width:'wide',passing:'short',tempo:'low',defensiveLine:'balanced',transition:'hold',ballLoss:'regroup'},
  direct:{width:'wide',passing:'direct',tempo:'high',defensiveLine:'low',transition:'counter',ballLoss:'regroup'},
};
const fixtures={};
function start(seed){
  let state=engine.createManagerCareer({year:2013,clubId:ids[0],managerName:'Auditoría táctica',seed:`tactical-browser-${seed}`,world:structuredClone(world)});
  state=engine.managerReducer(state,{type:'PLAY_MATCH',mode:'deep'});
  assert.equal(state.activeMatch.modelVersion,3,'new matches use tactical model 3');
  return engine.managerReducer(state,{type:'SET_MATCH_AUTOSUBS',enabled:false});
}
async function saveFixture(name,state,sequence=null,presentation=null){
  const save=engine.serializeManagerCareer(state),file=resolve(`${output}/fixtures/${name}.json`);
  assert.deepEqual(engine.restoreManagerCareer(save).activeMatch,state.activeMatch,`${name}: save replay is exact`);
  await fs.writeFile(file,save);
  fixtures[name]={file,minute:state.activeMatch.minute,side:state.activeMatch.ownSide,sequence,presentation};
}
let prefix=start(0);
prefix=engine.managerReducer(prefix,{type:'ADVANCE_MATCH',minutes:10});
await saveFixture('prefix',prefix);
for(const [name,values] of Object.entries(plans)){
  for(let seed=0;seed<12&&!fixtures[name];seed++){
    let state=engine.managerReducer(start(seed),{type:'SET_MATCH_TACTICS',...values});
    while(state.activeMatch&&state.activeMatch.minute<12&&!fixtures[name]){
      const before=state;
      state=engine.managerReducer(state,{type:'ADVANCE_MATCH',minutes:1});
      const match=state.activeMatch;
      const sequence=match?.presentation?.sequences.find(item=>item.kind==='buildup'&&item.side===match.ownSide&&item.passRoute?.length>=2);
      if(sequence){
        assert.equal(sequence.passRoute[0],sequence.actorId);
        assert.equal(sequence.passRoute.at(-1),sequence.receiverId);
        assert.ok(sequence.passRoute.every(id=>match.presentation.onPitch[sequence.side].includes(id)),'route uses only actual participants');
        await saveFixture(name,before,sequence,match.presentation);
      }
    }
  }
  assert.ok(fixtures[name],`${name}: bounded real simulation finds an own-side buildup`);
}
for(let seed=0;seed<12&&!fixtures.interception;seed++){
  let state=engine.managerReducer(start(seed),{type:'SET_MATCH_TACTICS',...plans.direct});
  while(state.activeMatch&&state.activeMatch.minute<15&&!fixtures.interception){
    const before=state;state=engine.managerReducer(state,{type:'ADVANCE_MATCH',minutes:1});
    const presentation=state.activeMatch?.presentation;
    const sequence=presentation?.sequences.find(item=>item.interceptedById&&item.passRoute?.length>=2);
    if(sequence)await saveFixture('interception',before,sequence,presentation);
  }
}
assert.ok(fixtures.interception,'bounded real simulation finds an intercepted pass');
await fs.writeFile(`${output}/fixtures/manifest.json`,JSON.stringify(fixtures,null,2));
if(process.argv.includes('--fixtures-only')){
  console.log(JSON.stringify({fixtures,modelVersion:3}));
  process.exit(0);
}

const browser=await chromium.launch({headless:true}),errors=[],consoleErrors=[],checks=[],observations=[];
let activePage;
const read=page=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const pitch=page=>page.locator('[data-testid="live-pitch"]');
const frame=page=>pitch(page).evaluate(node=>JSON.parse(node.dataset.frame));
async function pageFor(viewport,reducedMotion='no-preference'){
  const page=await browser.newPage({viewport,reducedMotion,isMobile:viewport.width<600,hasTouch:viewport.width<1100});activePage=page;
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  await page.goto(`${base}/es/games/sports-manager`,{waitUntil:'networkidle'});
  const cookie=page.locator('.cookie-consent-primary');if(await cookie.isVisible())await cookie.click();
  return page;
}
async function importFixture(page,name){
  await page.reload({waitUntil:'networkidle'});
  await page.getByLabel('Importar partida',{exact:true}).setInputFiles(fixtures[name].file);
  await pitch(page).waitFor();
  await page.waitForFunction(minute=>JSON.parse(window.render_game_to_text()).activeMatch?.minute===minute,fixtures[name].minute);
}
function assertNoFuture(match){assert.ok(match.events.every(event=>event.minute<=match.minute),'no future events exposed');}
async function pause(page){
  const button=page.getByRole('button',{name:'Pausar partido',exact:true});if(await button.isVisible())await button.click();
  await page.waitForTimeout(80);
  const a=await frame(page),minute=(await read(page)).activeMatch.minute;
  await page.waitForTimeout(260);
  assert.deepEqual(await frame(page),a,'pause freezes the exact frame');
  assert.equal((await read(page)).activeMatch.minute,minute);
  return a;
}
async function capture(page,name,board=false){
  if(board)await page.getByRole('region',{name:'Pizarra del entrenador',exact:true}).scrollIntoViewIfNeeded();
  else await page.locator('.launch-body').evaluate(node=>{node.scrollTop=0;});
  await page.screenshot({path:`${output}/${name}.png`});
  const dimensions=await page.locator('.fm-game').evaluate(node=>({client:node.clientWidth,scroll:node.scrollWidth}));
  assert.ok(dimensions.scroll<=dimensions.client+1,`${name}: no horizontal overflow`);
}
async function checkChoices(page,expected){
  const match=(await read(page)).activeMatch;
  for(const [key,value] of Object.entries(expected)){
    assert.equal(match.tactics[key],value,`${key} reaches the engine`);
    if(fields[key])assert.equal(await page.getByLabel(fields[key],{exact:true}).inputValue(),value,`${key} control stays in sync`);
  }
  assertNoFuture(match);
}
function validateFrame(current,match){
  const valid=new Set([...match.presentation.onPitch.home,...match.presentation.onPitch.away]);
  assert.equal(new Set(current.players.map(player=>player.id)).size,current.players.length,'unique markers');
  assert.ok(current.players.length>=18&&current.players.length<=22);
  assert.ok(current.players.every(player=>valid.has(player.id)),'no invented or retired participants');
  for(const p of [...current.players,current.ball])assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100);
  if(current.carrierId)assert.ok(current.players.some(player=>player.id===current.carrierId));
}
async function observePlan(page,name){
  await importFixture(page,name);
  await page.getByRole('group',{name:'Velocidad de reproducción',exact:true}).getByRole('button',{name:'1×',exact:true}).click();
  await page.getByRole('button',{name:'Reproducir partido',exact:true}).click();
  await page.waitForFunction(id=>{
    const node=document.querySelector('[data-testid="live-pitch"]');
    if(node?.dataset.sceneId!==id)return false;
    const f=JSON.parse(node.dataset.frame);return f.elapsed/f.duration>=.78;
  },fixtures[name].sequence.id,{timeout:60000});
  const current=await pause(page),match=(await read(page)).activeMatch,expected=fixtures[name].sequence;
  assert.equal(current.sceneId,expected.id,'pause captured the requested buildup');
  assert.deepEqual(current.passRoute,expected.passRoute,'the displayed ball route is the route computed by the engine');
  for(const [key,value] of Object.entries(plans[name]))assert.equal(current.tacticalContext[fixtures[name].side][key],value,`frame reflects ${key}`);
  validateFrame(current,match);assertNoFuture(match);
  const own=current.players.filter(player=>player.side===fixtures[name].side);
  const width=Math.max(...own.map(player=>player.y))-Math.min(...own.map(player=>player.y));
  observations.push({name,width,frame:current,sequence:expected});
  await capture(page,`desktop-${name}`);
  return {current,width};
}
try{
  const desktop=await pageFor({width:1440,height:1000});
  await importFixture(desktop,'prefix');
  const before=(await read(desktop)).activeMatch;
  for(const [key,value] of Object.entries(custom))await desktop.getByLabel(fields[key],{exact:true}).selectOption(value);
  await checkChoices(desktop,custom);
  const after=(await read(desktop)).activeMatch;
  assert.equal(after.minute,before.minute);
  assert.equal(after.homeGoals,before.homeGoals);assert.equal(after.awayGoals,before.awayGoals);
  assert.deepEqual(after.events.slice(0,before.events.length),before.events,'new instructions cannot rewrite already played events');
  await pause(desktop);
  await capture(desktop,'desktop-custom-board',true);
  await desktop.reload({waitUntil:'networkidle'});
  await desktop.getByRole('button',{name:/Continuar partida/}).click();
  assert.deepEqual((await read(desktop)).activeMatch,after,'save/reload preserves all decisions, route and match prefix');
  await checkChoices(desktop,custom);
  checks.push('Six public controls: engine values, immutable past, exact save replay, pause');

  const presetGroup=desktop.getByRole('group',{name:'Planes de juego',exact:true});
  for(const [label,values] of [['Controlar',{passing:'short',transition:'hold'}],['Atacar espacios',{passing:'direct',defensiveLine:'low',transition:'counter'}],['Apretar arriba',{pressing:'high',defensiveLine:'high',ballLoss:'counterpress'}],['Proteger ventaja',{width:'narrow',tempo:'low',defensiveLine:'low'}]]){
    await presetGroup.getByRole('button',{name:label,exact:true}).click();
    await checkChoices(desktop,values);
    assert.equal(await presetGroup.getByRole('button',{name:label,exact:true}).getAttribute('aria-pressed'),'true');
  }
  checks.push('All four presets apply to the real match and report selected state');

  const narrow=await observePlan(desktop,'narrow'),wide=await observePlan(desktop,'wide');
  assert.ok(wide.width>narrow.width+8,`wide instruction visibly increases team width: ${wide.width} > ${narrow.width}`);
  await observePlan(desktop,'direct');
  checks.push('Real short/direct routes and tactical context match the rendered frame; wide shape increases width');

  await importFixture(desktop,'interception');
  await desktop.getByRole('group',{name:'Velocidad de reproducción',exact:true}).getByRole('button',{name:'1×',exact:true}).click();
  await desktop.getByRole('button',{name:'Reproducir partido',exact:true}).click();
  await desktop.waitForFunction(id=>{
    const node=document.querySelector('[data-testid="live-pitch"]');
    if(node?.dataset.sceneId!==id)return false;
    const f=JSON.parse(node.dataset.frame);return f.elapsed/f.duration>=.885;
  },fixtures.interception.sequence.id,{timeout:60000});
  const intercepted=await pause(desktop),interceptSequence=fixtures.interception.sequence;
  assert.equal(intercepted.carrierId,interceptSequence.interceptedById,'intercepted pass reaches the actual defender, not the intended receiver');
  assert.notEqual(intercepted.carrierId,interceptSequence.receiverId);
  await capture(desktop,'desktop-interception');
  const recovery=fixtures.interception.presentation.sequences.find(sequence=>sequence.kind==='recovery'&&sequence.actorId===interceptSequence.interceptedById&&sequence.interception);
  assert.ok(recovery,'the interception has a matching real recovery event');
  await desktop.getByRole('button',{name:'Reproducir partido',exact:true}).click();
  await desktop.waitForFunction(id=>document.querySelector('[data-testid="live-pitch"]')?.dataset.sceneId===id,recovery.id,{timeout:15000});
  const recovered=await pause(desktop);
  assert.equal(recovered.carrierId,interceptSequence.interceptedById,'recovery does not return the ball to the dispossessed side');
  observations.push({name:'interception',frame:intercepted,recovery:recovered,sequence:interceptSequence});
  checks.push('Interception cuts the pass to its recorded defender and preserves possession into recovery');

  await importFixture(desktop,'prefix');
  const state=await read(desktop),match=state.activeMatch,players=new Map(state.squad.map(player=>[player.id,player]));
  const out=match[`${match.ownSide}Lineup`].find(id=>players.get(id)?.position!=='GK'&&match[`${match.ownSide}Bench`].some(candidate=>players.get(candidate)?.position===players.get(id)?.position));
  const incoming=match[`${match.ownSide}Bench`].find(id=>players.get(id)?.position===players.get(out)?.position);
  assert.ok(out&&incoming);
  await desktop.getByLabel('Jugador que sale',{exact:true}).selectOption(out);
  await desktop.getByLabel('Jugador que entra',{exact:true}).selectOption(incoming);
  await desktop.getByRole('button',{name:'Confirmar cambio',exact:true}).click();
  await desktop.getByLabel(fields.passing,{exact:true}).selectOption('direct');
  await desktop.getByRole('button',{name:'Reproducir partido',exact:true}).click();
  for(let sample=0;sample<8;sample++){
    await desktop.waitForTimeout(150);const visible=await frame(desktop);
    assert.ok(!visible.players.some(player=>player.id===out),'a tactical change does not revive the substituted player');
    assert.ok(visible.players.some(player=>player.id===incoming),'the substitute is visible');
  }
  await pause(desktop);
  checks.push('Substitution followed by tactical instruction never restores the player who left');

  for(const [name,viewport,reduced] of [['phone',{width:390,height:844},'reduce'],['tablet',{width:820,height:1180},'no-preference']]){
    const page=await pageFor(viewport,reduced);await importFixture(page,'prefix');
    for(const [key,value] of Object.entries(custom))await page.getByLabel(fields[key],{exact:true}).selectOption(value);
    await checkChoices(page,custom);await capture(page,`${name}-board`,true);
    await page.getByRole('button',{name:'Reproducir partido',exact:true}).click();await page.waitForTimeout(300);
    await pause(page);await capture(page,`${name}-pitch`);
    await page.close();
    checks.push(`${name}: all instructions accessible, pause and responsive layout${reduced==='reduce'?' with reduced motion':''}`);
  }
  assert.deepEqual(errors,[],'no page errors');assert.deepEqual(consoleErrors,[],'no console errors');
  await fs.writeFile(`${output}/verification.json`,JSON.stringify({checks,errors,consoleErrors,observations},null,2));
  console.log(JSON.stringify({checks,errors,consoleErrors}));
}catch(error){
  if(activePage&&!activePage.isClosed()){
    await activePage.screenshot({path:`${output}/failure.png`}).catch(()=>{});
    await fs.writeFile(`${output}/failure-state.json`,JSON.stringify(await read(activePage).catch(()=>null),null,2));
  }
  await fs.writeFile(`${output}/verification.json`,JSON.stringify({checks,errors,consoleErrors,error:error.stack,observations},null,2));
  throw error;
}finally{await browser.close();}
