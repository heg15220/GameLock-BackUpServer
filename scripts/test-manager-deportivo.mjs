import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.argv[2] || 'http://127.0.0.1:5193';
const output = process.argv[3] || 'output/manager-v12/browser-deportivo';
const oldSave = process.argv[4] || 'output/manager-v11/deportivo-v10-save.json';
const gapsPath = process.argv[5] || 'output/manager-v12/audit-final/roster-gaps.json';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const checks = [], errors = [], consoleErrors = [];
const state = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const assertSquad = snapshot => {
  assert.equal(snapshot.club.id, 'deportivo-la-coruna');
  assert.equal(snapshot.year, 2011);
  assert.equal(snapshot.squad.length, 25);
  assert.ok(snapshot.squad.every(p => p.real && p.membershipDate === '2011-09-01'));
  for (const name of ['Valerón', 'Guardado', 'Aranzubia', 'Colotto', 'Bergantiños', 'Riki'])
    assert.ok(snapshot.squad.some(p => p.name.includes(name)), name);
  assert.equal(snapshot.squad.filter(p => p.selected).length, 11);
  assert.match(snapshot.archiveRevision, /rosters-v12$/);
};
try {
  for (const [label, viewport] of [['desktop', { width:1440, height:1000 }], ['mobile', { width:390, height:844 }]]) {
    const context = await browser.newContext({ viewport, reducedMotion:'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await page.goto(`${base}/es/games/sports-manager?archive=deportivo-v11`, {waitUntil:'networkidle'});
    const cookie = page.locator('.cookie-consent-primary');
    if (await cookie.isVisible()) await cookie.click();
    await page.getByLabel('Temporada inicial').selectOption('2011');
    await page.getByLabel('Liga', {exact:true}).selectOption('laliga-2');
    await page.getByLabel('Tu club', {exact:true}).selectOption('deportivo-la-coruna');
    assert.match(await page.locator('.fm-roster-coverage').innerText(), /25 reales · 0 generados/);
    await page.locator('.fm-club-preview').scrollIntoViewIfNeeded();
    await page.screenshot({path:`${output}/${label}-setup.png`});
    await page.getByRole('button', {name:'Firmar y empezar', exact:true}).click();
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).mode === 'manager');
    assertSquad(await state(page));
    checks.push(`${label}: new Deportivo 2011 career has 25 real dated players and real XI`);

    // Reproduce the reported pre-fix save, then use the explicit update control.
    await page.getByLabel('Importar partida', {exact:true}).setInputFiles(oldSave);
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).archiveRevision.endsWith('rosters-v10'));
    assert.ok((await state(page)).squad.every(p => !p.real));
    await page.getByRole('button', {name:'Actualizar plantilla inicial', exact:true}).click();
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).archiveRevision.endsWith('rosters-v12'));
    const refreshed = await state(page);
    assertSquad(refreshed);
    assert.equal(refreshed.round, 0);
    await page.reload({waitUntil:'networkidle'});
    await page.getByRole('button', {name:/Continuar partida/}).click();
    const restored = await state(page);
    assertSquad(restored);
    assert.deepEqual(restored.squad, refreshed.squad);
    assert.equal(restored.budget, refreshed.budget);
    checks.push(`${label}: old generated save explicitly updates and reload preserves real squad and finances`);

    const nav = page.getByRole('navigation', {name:'Secciones del mánager'});
    await nav.getByRole('button', {name:'Plantilla', exact:true}).click();
    const provenance = page.locator('.fm-player-provenance').filter({hasText:'Valerón'}).first();
    await provenance.locator('summary').click();
    assert.match(await provenance.innerText(), /2011-09-01/);
    assert.ok(await provenance.locator('a[href*="49439402"]').count() > 0);
    assert.ok(await provenance.locator('a[href*="creativecommons.org"]').count() > 0);
    await provenance.scrollIntoViewIfNeeded();
    await page.screenshot({path:`${output}/${label}-provenance.png`});
    const layout = await page.evaluate(() => ({viewport:innerWidth,width:document.documentElement.scrollWidth}));
    assert.ok(layout.width <= layout.viewport + 1, `${label}: no page overflow`);
    await nav.getByRole('button', {name:'Despacho', exact:true}).click();
    await page.locator('.fm-dashboard').count().then(async n => { if (n) await page.locator('.fm-dashboard').scrollIntoViewIfNeeded(); });
    await page.screenshot({path:`${output}/${label}-real-xi.png`});
    await fs.writeFile(`${output}/${label}-real-squad.json`, JSON.stringify(await state(page),null,2));
    await page.getByRole('button', {name:'Simulación rápida',exact:true}).click();
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).round > 0);
    assert.ok((await state(page)).squad.every(p => p.real));
    checks.push(`${label}: provenance, attribution and match simulation verified`);
    await context.close();
  }
  for (const [league,club] of [['laliga','getafe'],['laliga-2','ce-sabadell'],['bundesliga','1-fc-kaiserslautern']]) {
    const context = await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    const page = await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
    await page.goto(`${base}/es/games/sports-manager?archive=deportivo-v11`,{waitUntil:'networkidle'});
    const cookie = page.locator('.cookie-consent-primary');
    if(await cookie.isVisible())await cookie.click();
    await page.getByLabel('Temporada inicial').selectOption('2011');
    await page.getByLabel('Liga',{exact:true}).selectOption(league);
    await page.getByLabel('Tu club',{exact:true}).selectOption(club);
    await page.getByRole('button',{name:'Firmar y empezar',exact:true}).click();
    const snapshot=await state(page);
    assert.equal(snapshot.club.id,club);
    assert.ok(snapshot.squad.filter(p=>p.real).length>=10,`${club}: imported real squad`);
    assert.ok(snapshot.squad.filter(p=>p.real&&p.membershipPrecision==='season').length>0);
    await fs.writeFile(`${output}/${club}-2011.json`,JSON.stringify({club,players:snapshot.squad.map(p=>({name:p.name,real:p.real,source:p.source,precision:p.membershipPrecision}))},null,2));
    checks.push(`${club} 2011: recovered season list reaches playable squad`);
    await context.close();
  }
  const gaps=JSON.parse(await fs.readFile(gapsPath,'utf8'));
  const missing=gaps.rows.find(row=>row.year===2011&&row.realPlayers===0);
  assert.ok(missing);
  const gapContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const gapPage=await gapContext.newPage();
  gapPage.on('pageerror',error=>errors.push(error.message));
  gapPage.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  await gapPage.goto(`${base}/es/games/sports-manager?archive=deportivo-v11`,{waitUntil:'networkidle'});
  const gapCookie=gapPage.locator('.cookie-consent-primary');
  if(await gapCookie.isVisible())await gapCookie.click();
  await gapPage.getByLabel('Temporada inicial').selectOption(String(missing.year));
  await gapPage.getByLabel('Liga',{exact:true}).selectOption(missing.leagueId);
  await gapPage.getByLabel('Tu club',{exact:true}).selectOption(missing.clubId);
  const warning=gapPage.getByTestId('roster-coverage');
  assert.match(await warning.innerText(),/Sin futbolistas reales documentados/);
  assert.match(await warning.innerText(),/plantilla ficticia/);
  await warning.scrollIntoViewIfNeeded();
  await gapPage.screenshot({path:`${output}/mobile-missing-squad-warning.png`});
  checks.push(`${missing.clubId} ${missing.year}: explicitly warns about fictional squad before starting`);
  await gapContext.close();
  assert.deepEqual(errors, []); assert.deepEqual(consoleErrors, []);
  const report = {checks, errors, consoleErrors};
  await fs.writeFile(`${output}/verification.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
} catch(error) {
  const page=browser.contexts().flatMap(context=>context.pages()).at(-1);
  if(page){
    await page.screenshot({path:`${output}/failure.png`}).catch(()=>{});
    await fs.writeFile(`${output}/failure-ui.txt`,await page.locator('body').innerText()).catch(()=>{});
  }
  throw error;
} finally { await browser.close(); }
