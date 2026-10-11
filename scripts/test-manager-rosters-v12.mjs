import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const base=process.argv[2]||'http://127.0.0.1:5193';
const output=process.argv[3]||'output/manager-v12/browser-rosters';
const requestedClubs=process.argv[4]?.split(',');
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[],consoleErrors=[],checks=[];
const read=page=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const cases=[
  {year:2019,league:'laliga',club:'barcelona',names:['Messi','Suárez','Piqué','Busquets','Alba'],minimum:20},
  {year:2019,league:'laliga-2',club:'deportivo-la-coruna',names:['Bergantiños'],minimum:18},
  {year:2024,league:'laliga-2',club:'deportivo-la-coruna',names:['Yeremay','Dani Barcia'],minimum:15,multilingual:true},
  {year:2019,league:'laliga',club:'celta-vigo',names:['Aspas'],minimum:8},
  {year:2025,league:'liga-bolivia',club:'bolivar',minimum:16,multilingual:true},
  {year:1995,league:'premier-league',club:'everton',names:['Ferguson'],minimum:3},
  {year:2012,league:'usa-mls',club:'sporting-kansas-city',names:['Michael Thomas'],minimum:1,correctedIdentity:true},
];
// The expanding season lists can supersede a biography for a given club.
// Select a real remaining career-provenance case from the audited final world.
const audit=JSON.parse(await fs.readFile('output/manager-v12/runtime-archive-audit.json','utf8'));
const careerCase=audit.years.find(year=>year.careerExample)?.careerExample;
assert.ok(careerCase,'The final audit must contain a playable career-provenance example');
cases.push({...careerCase,names:[careerCase.name],minimum:1,career:true});
try{
  for(const [label,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]])for(const item of cases.filter(c=>!requestedClubs||requestedClubs.includes(c.club))){
    const context=await browser.newContext({viewport,reducedMotion:'reduce'});
    const page=await context.newPage();
    page.setDefaultTimeout(45000);
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',e=>{if(e.type()==='error')consoleErrors.push(e.text());});
    await page.goto(`${base}/es/games/sports-manager?archive=rosters-v12`,{waitUntil:'networkidle'});
    const cookies=page.locator('.cookie-consent-primary');
    if(await cookies.isVisible())await cookies.click();
    await page.getByLabel('Temporada inicial').selectOption(String(item.year));
    await page.getByLabel('Liga',{exact:true}).selectOption(item.league);
    await page.getByLabel('Tu club',{exact:true}).selectOption(item.club);
    await page.locator('.fm-club-preview').scrollIntoViewIfNeeded();
    await page.screenshot({path:`${output}/${label}-${item.club}-${item.year}-setup.png`});
    await page.getByRole('button',{name:'Firmar y empezar',exact:true}).click();
    await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='manager');
    const initial=await read(page),real=initial.squad.filter(p=>p.real);
    assert.equal(initial.club.id,item.club);assert.equal(initial.year,item.year);
    assert.ok(real.length>=item.minimum,`${item.club}: ${real.length} real players`);
    assert.match(initial.archiveRevision,/rosters-v12$/);
    for(const name of item.names||[])assert.ok(real.some(p=>p.name.includes(name)),`${item.club}: ${name}`);
    if(item.club==='deportivo-la-coruna'&&item.year===2024)assert.equal(real.find(p=>p.name==='Dani Barcia')?.birthDate,'2003-01-19');
    if(item.correctedIdentity){const michael=real.find(p=>p.name==='Michael Thomas');assert.equal(michael.birthDate,'1988-03-08');assert.equal(michael.nationality,'USA');assert.equal(michael.wikidataId,'Q427832');}
    if(item.multilingual)assert.ok(real.some(p=>p.identityWiki==='es'&&p.identityPageId));
    const nav=page.getByRole('navigation',{name:'Secciones del mánager'});
    await nav.getByRole('button',{name:'Plantilla',exact:true}).click();
    const target=item.correctedIdentity?real.find(p=>p.name==='Michael Thomas'):item.career?real.find(p=>p.source==='wikimedia-verified-career'):real.find(p=>p.sourceUrl?.includes('wikipedia.org'));
    assert.ok(target,`${item.club}: source-backed player exists`);
    const provenance=page.locator('.fm-player-provenance').filter({hasText:target.name}).first();
    await provenance.locator('summary').click();
    const text=await provenance.innerText();
    if(item.correctedIdentity){
      assert.match(text,/Identidad contrastada con el club/);
      assert.ok(await provenance.locator('a[href="https://www.sportingkc.com/players/michael-thomas/"]').count());
    }else assert.ok(await provenance.locator('a[href*="wikipedia.org"]').count()>0);
    if(item.career){
      assert.equal(target.membershipPrecision,'year-interior');
      assert.ok(target.stintFrom<item.year&&item.year<target.stintTo);
      assert.match(text,/Año interior del período/);
    }
    await provenance.scrollIntoViewIfNeeded();
    await page.screenshot({path:`${output}/${label}-${item.club}-${item.year}-source.png`});
    const layout=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
    assert.ok(layout.width<=layout.viewport+1);
    await page.reload({waitUntil:'networkidle'});
    await page.getByRole('button',{name:/Continuar partida/}).click();
    assert.deepEqual((await read(page)).squad,initial.squad);
    await page.getByRole('button',{name:'Simulación rápida',exact:true}).click();
    await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).round>0);
    const after=await read(page);
    assert.deepEqual(after.squad.filter(p=>p.real).map(p=>p.id).sort(),real.map(p=>p.id).sort());
    await page.waitForFunction(round=>JSON.parse(localStorage.getItem('gamelock.football-manager.v1')||'null')?.round===round,after.round);
    assert.equal(await page.getByText('No hay espacio para guardar en este navegador.',{exact:false}).count(),0);
    await page.reload({waitUntil:'networkidle'});
    await page.getByRole('button',{name:/Continuar partida/}).click();
    const resumed=await read(page);
    assert.equal(resumed.round,after.round);
    assert.deepEqual(resumed.squad,after.squad);
    assert.equal(resumed.budget,after.budget);
    await page.locator('.fm-office-grid').scrollIntoViewIfNeeded();
    await page.screenshot({path:`${output}/${label}-${item.club}-${item.year}-after-match.png`});
    if(label==='desktop'&&item.club==='barcelona'){
      await nav.getByRole('button',{name:'Datos y épocas',exact:true}).click();
      const careerArchive=page.getByRole('link',{name:/Trayectorias, fuentes y atribuciones/});
      await careerArchive.scrollIntoViewIfNeeded();
      assert.equal(await careerArchive.getAttribute('href'),'/data/football-manager/verified-player-careers.json');
      assert.ok(await page.getByRole('link',{name:/Plantillas en otros idiomas y atribuciones/}).count());
      await page.screenshot({path:`${output}/desktop-open-sources.png`});
    }
    await fs.writeFile(`${output}/${label}-${item.club}-${item.year}.json`,JSON.stringify({initial,after},null,2));
    checks.push({label,year:item.year,club:item.club,real:real.length,generated:initial.squad.length-real.length,provenance:target.name,saveReload:true,match:true});
    await context.close();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
  await fs.writeFile(`${output}/verification.json`,JSON.stringify({checks,errors,consoleErrors},null,2));
  console.log(JSON.stringify({checks,errors,consoleErrors}));
}catch(error){
  const page=browser.contexts().flatMap(c=>c.pages()).at(-1);
  if(page){await page.screenshot({path:`${output}/failure.png`}).catch(()=>{});await fs.writeFile(`${output}/failure-ui.txt`,await page.locator('body').innerText()).catch(()=>{});}
  throw error;
}finally{await browser.close();}
