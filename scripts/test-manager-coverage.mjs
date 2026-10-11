import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';

// Production smoke through public controls. Expected options come from the
// documented archive, not from the DOM or a replacement test catalogue.
const args = process.argv.slice(2).filter(value => !value.startsWith('--'));
const base = args[0] || 'http://127.0.0.1:5193';
const output = args[1] || 'output/manager-v8/coverage';
const oldSavePath = resolve(args[2] || 'output/manager-v6/production-tactics/fixtures/prefix.json');
await fs.mkdir(output, { recursive: true });
const bundle = await build({ stdin: { contents: `
  export { restoreManagerCareer, serializeManagerCareer } from './src/games/sports/manager/engine.js';
  export { getAvailableLeagues, getLeagueSeasonCoverage } from './src/games/sports/manager/league-memberships.js';
`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const archive = JSON.parse(await fs.readFile('src/games/sports/manager/league-memberships.json', 'utf8'));
const years = [1990, 2013, 2025];
const regionalIds = new Set(['copa-de-primera','liga-bolivia','liga-de-primera','liga-futve','liga-uruguaya','liga1','ligapro-serie-a','primera-nacional','primera-division-costa-rica','hon-liga-nacional','liga-nacional-guatemala','slv-primera-division','liga-primera-de-nicaragua','liga-dominicana-de-futbol','pan-primera-division']);
const expected = Object.fromEntries(years.map(year => {
  const leagues = api.getAvailableLeagues(year);
  assert.ok(leagues.length > 0, `${year}: documented leagues exist`);
  for (const league of leagues) {
    assert.ok(!league.id.startsWith('external:') && league.simulated !== false && league.selectable !== false);
    assert.equal(league.historicalMembership, true);
    assert.equal(api.getLeagueSeasonCoverage(league.id, year).available, true);
    assert.ok(archive.seasons[year][league.id]?.teams.length > 0);
  }
  const teams = archive.seasons[year].laliga.teams;
  return [year, { leagues: leagues.map(league => ({ id: league.id, source: league.membershipSource })),
    clubs: teams.map(team => team.clubId).sort(), regional: leagues.filter(league=>regionalIds.has(league.id)).map(league=>({id:league.id,clubs:archive.seasons[year][league.id].teams.map(team=>team.clubId).sort()})) }];
}));

// The actual v6 save stores the replay inputs, rather than a full future report.
// Verify those inputs and exact reconstruction across another serialization;
// then compare that reconstructed match to the browser's imported match below.
const oldSave = await fs.readFile(oldSavePath, 'utf8');
const savedInput = JSON.parse(oldSave);
const restored = api.restoreManagerCareer(oldSave);
assert.ok(restored.activeMatch, 'real v6 fixture restores an active match');
for (const key of ['minute', 'fixture', 'modelVersion', 'actions']) {
  assert.deepEqual(restored.activeMatch[key], savedInput.activeMatch[key], `v6 preserves ${key}`);
}
assert.deepEqual(api.restoreManagerCareer(api.serializeManagerCareer(restored)).activeMatch,
  restored.activeMatch, 'v6 activeMatch survives a complete round-trip exactly');
assert.deepEqual(api.restoreManagerCareer(oldSave).activeMatch, restored.activeMatch, 'v6 replay remains deterministic');
const checks = ['Real v6 save: replay inputs, deterministic restoration and exact activeMatch round-trip'];
const observations = { years: Object.fromEntries(years.map(year => [year, {
  leagues: expected[year].leagues.length, laligaClubs: expected[year].clubs.length,
}])), compatibility: { path: oldSavePath, version: savedInput.version,
  modelVersion: restored.activeMatch.modelVersion, minute: restored.activeMatch.minute } };
if (process.argv.includes('--preflight-only')) {
  await fs.writeFile(`${output}/preflight.json`, JSON.stringify({ checks, observations }, null, 2));
  console.log(JSON.stringify({ checks, observations }));
  process.exit(0);
}

const browser = await chromium.launch({ headless: true });
const errors = [], consoleErrors = [];
let activePage;
const read = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const button = (page, name) => page.getByRole('button', { name, exact: true });
async function openPage(viewport) {
  const page = await browser.newPage({ viewport, isMobile: viewport.width < 600,
    hasTouch: viewport.width < 600, reducedMotion: 'reduce' });
  page.setDefaultTimeout(20000);
  activePage = page;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto(`${base}/es/games/sports-manager`, { waitUntil: 'networkidle' });
  const cookie = page.locator('.cookie-consent-primary');
  if (await cookie.isVisible()) await cookie.click();
  await page.getByLabel('Temporada inicial').waitFor();
  return page;
}
async function checkLayout(page, label) {
  const layout = await page.evaluate(() => {
    const launch = document.querySelector('.launch-body');
    const game = document.querySelector('.fm-game');
    return { width: innerWidth, documentWidth: document.documentElement.scrollWidth,
      launchWidth: launch?.clientWidth, launchScrollWidth: launch?.scrollWidth,
      gameWidth: game?.clientWidth, gameScrollWidth: game?.scrollWidth,
      invalid: /Invalid Date|\bNaN\b/.test(game?.innerText || '') };
  });
  assert.ok(layout.documentWidth <= layout.width + 1, `${label}: no document overflow`);
  assert.ok(layout.launchScrollWidth <= layout.launchWidth + 1, `${label}: no launch overflow`);
  assert.ok(layout.gameScrollWidth <= layout.gameWidth + 1, `${label}: no manager overflow`);
  assert.equal(layout.invalid, false, `${label}: no invalid dates/numbers`);
}
async function capture(page, name, locator) {
  await page.waitForFunction(() => [...document.querySelectorAll('.fm-career-body, .fm-game')]
    .every(node => Number(getComputedStyle(node).opacity) >= .99));
  if (locator) await locator.scrollIntoViewIfNeeded();
  else await page.locator('.launch-body').evaluate(node => { node.scrollTop = 0; });
  await checkLayout(page, name);
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: false });
  await fs.writeFile(`${output}/${name}.state.json`, JSON.stringify(await read(page), null, 2));
}
async function selectYear(page, year) {
  await page.getByLabel('Temporada inicial').selectOption(String(year));
  await page.waitForFunction(value => JSON.parse(window.render_game_to_text()).year === value, year);
  const options = await page.getByLabel('Liga', { exact: true }).locator('option')
    .evaluateAll(nodes => nodes.map(node => ({ id: node.value, label: node.textContent })));
  assert.deepEqual(options.map(option => option.id).sort(), expected[year].leagues.map(league => league.id).sort(),
    `${year}: selector options match getAvailableLeagues exactly`);
  assert.ok(options.every(option => !option.id.startsWith('external:') && option.label.includes('✓') && !option.label.includes('≈')),
    `${year}: no external or undocumented league is selectable`);
  await page.getByLabel('Liga', { exact: true }).selectOption('laliga');
  const clubs = await page.getByLabel('Tu club', { exact: true }).locator('option').evaluateAll(nodes => nodes.map(node => node.value).sort());
  assert.deepEqual(clubs, expected[year].clubs, `${year}: LaLiga clubs match the season archive exactly`);
  for(const regional of expected[year].regional){
    await page.getByLabel('Liga', {exact:true}).selectOption(regional.id);
    const regionalClubs=await page.getByLabel('Tu club',{exact:true}).locator('option').evaluateAll(nodes=>nodes.map(node=>node.value).sort());
    assert.deepEqual(regionalClubs,regional.clubs,`${year}/${regional.id}: regional participants match their specific edition`);
  }
  await page.getByLabel('Liga',{exact:true}).selectOption('laliga');
  assert.ok((await page.locator('.fm-coverage-status').innerText()).includes('Participantes de esta temporada documentados'));
  await checkLayout(page, `${year} setup`);
}
async function checkSourcePanel(page, year) {
  const panel = page.locator('.fm-source-panel');
  await panel.waitFor();
  assert.ok((await panel.innerText()).includes('Cobertura parcial'));
  assert.ok((await panel.innerText()).includes('Las nuevas carreras solo ofrecen ligas con participantes documentados'));
  const entries = panel.locator('.fm-coverage-leagues > span');
  assert.equal(await entries.count(), expected[year].leagues.length, `${year}: coverage league count matches setup`);
  assert.equal(await panel.locator('.fm-coverage-leagues > span:not(.is-documented)').count(), 0,
    `${year}: coverage never labels an undocumented league available`);
  const links = await entries.locator('a').evaluateAll(nodes => nodes.map(node => node.href).sort());
  assert.deepEqual(links, expected[year].leagues.map(league => league.source).sort(), `${year}: coverage links retain archive evidence`);
  const stat = panel.locator('.fm-stat').filter({ has: page.getByText('Ligas disponibles', { exact: true }) });
  assert.equal(Number(await stat.locator('strong').innerText()), expected[year].leagues.length);
  await checkLayout(page, `${year} coverage`);
}
async function inspectSetup(page, label) {
  for (const year of years) {
    await selectYear(page, year);
    await button(page, 'Datos y cobertura').click();
    await checkSourcePanel(page, year);
    if (year === 2013) await capture(page, `${label}-setup-coverage-2013`, page.locator('.fm-source-panel'));
    await button(page, 'Datos y cobertura').click();
  }
  await selectYear(page, 2013);
  await page.getByLabel('Tu club', { exact: true }).selectOption('real-madrid');
  await capture(page, `${label}-setup-2013`, page.locator('.fm-new-career'));
  checks.push(`${label}: 1990/2013/2025 documented league options, exact LaLiga and regional participants, and coverage evidence`);
}
async function startCareer(page, label) {
  await page.getByLabel('Tu nombre').fill('Auditoría de cobertura');
  await button(page, 'Firmar y empezar').click();
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text());
    return state.mode === 'manager' && state.year === 2013 && state.club?.id === 'real-madrid';
  });
  const state = await read(page);
  assert.equal(state.round, 0);
  assert.equal(state.date, '2013-09-03');
  const nav = page.getByRole('navigation', { name: 'Secciones del mánager', exact: true });
  await nav.getByRole('button', { name: 'Datos y épocas', exact: true }).click();
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).tab === 'sources');
  await checkSourcePanel(page, 2013);
  await capture(page, `${label}-career-coverage-2013`, page.locator('.fm-source-panel'));
  checks.push(`${label}: starts a real 2013 career and opens Datos y épocas`);
}
try {
  const desktop = await openPage({ width: 1440, height: 1000 });
  await inspectSetup(desktop, 'desktop');
  await startCareer(desktop, 'desktop');
  await desktop.getByLabel('Importar partida', { exact: true }).setInputFiles(oldSavePath);
  await desktop.waitForFunction(expectedMatch => {
    const state = JSON.parse(window.render_game_to_text());
    return state.activeMatch?.fixture.id === expectedMatch.fixture.id && state.activeMatch?.minute === expectedMatch.minute;
  }, restored.activeMatch);
  const imported = (await read(desktop)).activeMatch;
  for (const [key, value] of Object.entries(imported)) {
    assert.deepEqual(value, restored.activeMatch[key], `browser v6 import preserves activeMatch.${key}`);
  }
  checks.push('Production UI imports the real v6 save with all exposed activeMatch fields unchanged');
  await capture(desktop, 'desktop-v6-restored', desktop.getByTestId('manager-match-center'));
  await desktop.close();
  const phone = await openPage({ width: 390, height: 844 });
  await inspectSetup(phone, 'phone');
  await startCareer(phone, 'phone');
  assert.deepEqual(errors, [], 'no page errors');
  assert.deepEqual(consoleErrors, [], 'no console errors');
  const result = { checks, observations, errors, consoleErrors };
  await fs.writeFile(`${output}/verification.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} catch (error) {
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: `${output}/failure.png`, fullPage: false }).catch(() => {});
  await fs.writeFile(`${output}/verification.json`, JSON.stringify({ checks, observations, errors, consoleErrors, failure: error.message }, null, 2));
  throw error;
} finally {
  await browser.close();
}
