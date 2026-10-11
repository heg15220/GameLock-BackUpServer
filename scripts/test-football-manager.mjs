import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base = process.argv[2] || 'http://127.0.0.1:5191';
const output = process.argv[3] || 'output/manager-v3/browser';
await fs.mkdir(output, { recursive: true });
const legacyPath = 'output/manager-v2/legacy-career.json';
try { await fs.access(legacyPath); } catch {
  const { build } = await import('esbuild');
  const bundle = await build({ stdin: { contents: "import {createManagerCareer} from './src/games/sports/manager/engine.js'; import {getManagerWorld} from './src/games/sports/manager/legacy-v1/data.js'; export const initial = createManagerCareer({year:2012,clubId:'barcelona',world:getManagerWorld(2012)});", resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
  const { initial } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
  const { world, playerHealth, date, trainingIntensity, ...fields } = initial;
  await fs.writeFile(legacyPath, JSON.stringify({ ...fields, version: 1, playerChanges: [], leagues: Object.fromEntries(Object.entries(initial.leagues).map(([id, league]) => [id, { round: 0, table: league.table }])) }));
}
const legacyYear = JSON.parse(await fs.readFile(legacyPath, 'utf8')).year;
const browser = await chromium.launch({ headless: true });
const errors = [];
const failures = [];
async function makePage(viewport) {
  const page = await browser.newPage({ viewport, hasTouch: viewport.width < 1100, isMobile: viewport.width < 600 });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/es/games/sports-manager`, { waitUntil: 'networkidle' });
  const consent = page.locator('.cookie-consent-primary');
  if (await consent.isVisible()) await consent.click();
  await page.locator('.fm-start').waitFor();
  return page;
}
async function state(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text()));
}
async function tab(page, label) {
  await page.locator('.fm-tabs').getByRole('button', { name: label, exact: true }).click();
}
async function capture(page, name) {
  await page.locator('.fm-game img').evaluateAll(async (images) => {
    await Promise.all(images.map((img) => { img.loading = 'eager'; return img.decode().catch(() => {}); }));
  });
  await page.locator('.launch-body').evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({ path: `${output}/${name}.png` });
  const widths = await page.locator('.fm-game').evaluate((node) => ({ width: node.clientWidth, scroll: node.scrollWidth }));
  assert.ok(widths.scroll <= widths.width + 1, `${name}: horizontal overflow`);
}

try {
  const page = await makePage({ width: 1440, height: 1000 });
  await capture(page, 'desktop-setup');
  await page.locator('.fm-start').click();
  await page.locator('.fm-career').waitFor();
  let current = await state(page);
  assert.equal(current.year, 2012);
  assert.ok(current.squad.some((p) => p.name.includes('Messi') && p.selected));
  await capture(page, 'desktop-office');
  assert.equal(current.date, '2012-09-01');
  await tab(page, 'Preparación');
  await page.getByRole('button', { name: /^Recuperación/ }).click();
  assert.equal((await state(page)).trainingIntensity, 'recovery');
  await capture(page, 'desktop-preparation');
  await page.getByRole('button', { name: /^Equilibrado/ }).click();

  await tab(page, 'Prensa');
  await page.getByRole('button', { name: /Paso a paso/ }).click();
  assert.equal((await state(page)).morale, current.morale + 2);
  await page.getByRole('button', { name: /Paso a paso/ }).click();
  await page.getByRole('alert').filter({ hasText: /Ya has atendido/ }).waitFor();
  await capture(page, 'desktop-press');

  await tab(page, 'Plantilla');
  await page.getByLabel('Formación', { exact: true }).selectOption('4-4-2');
  await page.getByRole('button', { name: 'Mejor once' }).click();
  assert.equal((await state(page)).squad.filter((p) => p.selected).length, 11);
  await capture(page, 'desktop-squad');

  await tab(page, 'Ojeadores');
  const beforeScout = (await state(page)).budget;
  await page.getByRole('button', { name: /Encargar informe/ }).click();
  current = await state(page);
  assert.ok(current.scoutReports.length > 0);
  assert.equal(current.budget, beforeScout - 110000);
  await capture(page, 'desktop-scouting');

  await tab(page, 'Mercado');
  await page.getByRole('textbox', { name: 'Buscar jugador o club' }).fill('Sterling');
  await page.getByRole('button', { name: 'Negociar', exact: true }).first().click();
  const budgetBefore = (await state(page)).budget;
  await page.getByRole('button', { name: 'Presentar oferta' }).click();
  current = await state(page);
  assert.ok(['counter', 'accepted'].includes(current.negotiation.status));
  const finalFee = current.negotiation.fee;
  await capture(page, 'desktop-negotiation');
  await page.getByRole('button', { name: 'Aceptar condiciones y fichar' }).click();
  current = await state(page);
  assert.equal(current.budget, budgetBefore - finalFee);
  assert.ok(current.squad.some((p) => p.name.includes('Sterling')));

  await tab(page, 'Despacho');
  await page.getByRole('button', { name: /Dirigir partido/ }).click();
  assert.equal((await state(page)).activeMatch.minute, 0);
  await page.getByRole('button', { name: /Siguientes 15 minutos/ }).click();
  assert.equal((await state(page)).activeMatch.minute, 15);
  await capture(page, 'desktop-live');
  // Reload while a match is live: continuation must reconstruct the same replay.
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Continuar partida/ }).click();
  assert.equal((await state(page)).activeMatch.minute, 15);
  await page.getByRole('button', { name: 'Ver resultado', exact: true }).click();
  assert.equal((await state(page)).round, 1);
  current = await state(page);
  assert.ok(current.squad.some((p) => p.condition < 100 && p.minutes > 0));
  assert.ok(current.squad.every((p) => p.condition >= 0 && p.condition <= 100));
  await tab(page, 'Preparación');
  await capture(page, 'desktop-workload');

  await tab(page, 'Competiciones');
  assert.ok((await page.locator('.fm-standings tbody tr').count()) === 20);
  await capture(page, 'desktop-table');
  await tab(page, 'Despacho');
  // Full season through public UI controls, including all cup rounds.
  for (let guard = 0; guard < 100 && (await state(page)).phase !== 'complete'; guard++) {
    await page.getByRole('button', { name: 'Simulación rápida', exact: true }).click();
  }
  current = await state(page);
  assert.equal(current.phase, 'complete');
  assert.equal(current.awards.length, 3);
  assert.ok(current.divisionPlan.complete);
  assert.ok(current.divisionPlan.movements.length >= 20);
  assert.ok(current.divisionPlan.playoffs.some((p) => p.results.length));
  await fs.writeFile(`${output}/season-state.json`, JSON.stringify(current, null, 2));
  await tab(page, 'Palmarés');
  await capture(page, 'desktop-awards');
  assert.equal(await page.locator('.fm-honours').getByText('Por decidir', { exact: true }).count(), 0);
  await tab(page, 'Competiciones');
  await capture(page, 'desktop-cups');
  await tab(page, 'Despacho');
  await page.getByRole('button', { name: /Empezar próxima temporada/ }).click();
  assert.equal((await state(page)).year, 2013);
  assert.ok((await state(page)).divisionChanges.length >= 20);
  const save = await page.evaluate(() => localStorage.getItem('gamelock.football-manager.v1'));
  assert.ok(save?.length > 1000);
  await fs.writeFile(`${output}/career.json`, save);
  await page.locator('input[type=file]').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{"broken":true}') });
  await page.getByRole('status').filter({ hasText: /No se pudo abrir/ }).waitFor();
  assert.equal((await state(page)).year, 2013);
  await page.locator('input[type=file]').setInputFiles(`${output}/career.json`);
  assert.equal((await state(page)).year, 2013);
  // A real v1 save from the previous release keeps its original catalogue and migrates.
  await page.locator('input[type=file]').setInputFiles(legacyPath);
  await page.getByRole('status').filter({ hasText: /Carrera importada/ }).waitFor();
  assert.equal((await state(page)).year, legacyYear);
  await tab(page, 'Preparación');
  assert.equal((await state(page)).trainingIntensity, 'balanced');
  await capture(page, 'desktop-legacy-migrated');
  await page.close();

  for (const [name, viewport] of [['phone', { width: 390, height: 844 }], ['tablet', { width: 820, height: 1180 }]]) {
    const mobile = await makePage(viewport);
    await mobile.getByRole('button', { name: /2025\/26/ }).click();
    await mobile.getByLabel('Tu club', { exact: true }).selectOption('real-madrid');
    await capture(mobile, `${name}-setup`);
    await mobile.locator('.fm-start').click();
    current = await state(mobile);
    assert.equal(current.year, 2025);
    assert.ok(current.squad.some((p) => p.name.includes('Mbapp')));
    await capture(mobile, `${name}-office`);
    await tab(mobile, 'Preparación');
    await mobile.getByRole('button', { name: /^Intensivo/ }).click();
    assert.equal((await state(mobile)).trainingIntensity, 'intensive');
    await capture(mobile, `${name}-preparation`);
    await tab(mobile, 'Competiciones');
    await capture(mobile, `${name}-divisions`);
    await tab(mobile, 'Mercado');
    await mobile.getByRole('textbox', { name: 'Buscar jugador o club' }).fill('Haaland');
    await mobile.getByRole('button', { name: 'Negociar', exact: true }).click();
    await capture(mobile, `${name}-market`);
    await tab(mobile, 'Despacho');
    await mobile.getByRole('button', { name: /Dirigir partido/ }).click();
    await mobile.getByRole('button', { name: /Siguientes 15 minutos/ }).click();
    await capture(mobile, `${name}-live`);
    await mobile.getByRole('button', { name: 'Ver resultado', exact: true }).click();
    assert.equal((await state(mobile)).round, 1);
    await mobile.close();
  }
} catch (error) {
  failures.push(error.stack);
  for (const page of browser.contexts().flatMap((context) => context.pages())) {
    await page.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {});
    await fs.writeFile(`${output}/failure-state.json`, JSON.stringify(await state(page).catch(() => null), null, 2));
  }
} finally {
  await fs.writeFile(`${output}/errors.json`, JSON.stringify({ errors, failures }, null, 2));
  await browser.close();
}
assert.equal(errors.length + failures.length, 0, JSON.stringify({ errors, failures }, null, 2));
console.log('Manager UI verified: desktop, phone, tablet, training, fitness, match minutes, promotion playoffs, division movements, v1 migration, transfers, scouting, press, lineup, live/quick matches, full season, awards, rollover and save recovery.');
