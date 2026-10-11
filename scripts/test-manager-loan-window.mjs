import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';

// Usage: node scripts/test-manager-loan-window.mjs BASE OUT [--fixtures-only]
// Synthetic clubs are explicitly test fixtures, never claimed as historical squads.
// Saves use public constructors/reducer actions; the browser bridge is read-only.
const args = process.argv.slice(2).filter(value => !value.startsWith('--'));
const base = args[0] || 'http://127.0.0.1:5192';
const output = args[1] || 'output/manager-v10/loan-window-browser';
await fs.mkdir(`${output}/fixtures`, { recursive: true });
const bundle = await build({ stdin: { contents: `
  export { createManagerCareer, managerReducer, getTransferWindow,
    serializeManagerCareer, restoreManagerCareer } from './src/games/sports/manager/engine.js';
`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const clubs = Array.from({ length: 4 }, (_, i) => ({ id: `c${i}`, name: `Club ${i}`, shortName: `C${i}`,
  country: i === 1 ? 'ESP' : 'ENG', competitionId: i === 1 ? 'la-liga' : 'championship', rating: 75, budget: 8000000 }));
const players = clubs.flatMap(club => Array.from({ length: 24 }, (_, i) => ({ id: `${club.id}-p${i}`,
  name: `Player ${club.id}-${i}`, clubId: club.id, birthYear: 2000,
  position: i < 2 ? 'GK' : i < 10 ? 'DF' : i < 17 ? 'MF' : 'FW', rating: 74, potential: 85,
  nationality: 'ESP', value: 200000, wage: 1000, real: false })));
const world = { year: 2018, clubs, players, countries: [], sources: [],
  competitions: [
    { id: 'la-liga', country_fifa_code: 'ESP', name: 'Liga de prueba', tier: 1, confederation: 'UEFA' },
    { id: 'championship', country_fifa_code: 'ENG', name: 'Championship', tier: 2, confederation: 'UEFA' },
  ], coverage: { snapshotDate: '2018-08-10', archiveRevision: 'synthetic-efl-browser-test',
    totalLeagues: 2, catalogLeagues: 2, historicalCompetitions: 0, unavailableLeagues: [],
    rostersComplete: false, rosterClubs: 0, importedRealPlayers: 0 } };
const act = (state, type, payload = {}) => {
  const next = api.managerReducer(state, { type, ...payload });
  assert.ok(!next.lastError, `${type}: ${next.lastError}`);
  return next;
};
let agreement = api.createManagerCareer({ year: 2018, clubId: 'c0', seed: 'efl-loan-window',
  managerName: 'Auditoría EFL', world });
assert.equal(agreement.date, '2018-08-10');
assert.equal(api.getTransferWindow(agreement).open, false);
assert.equal(api.getTransferWindow(agreement, { transactionType: 'loan' }).open, true);
agreement = act(agreement, 'OPEN_LOAN_NEGOTIATION', { playerId: 'c1-p17' });
agreement = act(agreement, 'ADVANCE_CALENDAR', { days: 2 });
assert.equal(agreement.loanNegotiation.stage, 'club');
agreement = act(agreement, 'OFFER_LOAN_TERMS', { ...agreement.loanNegotiation.counterTerms,
  purchaseType: 'option', purchaseFee: 240000 });
assert.equal(agreement.loanNegotiation.stage, 'agreed');
assert.equal(agreement.date, '2018-08-12');
const expectedActive = act(agreement, 'COMPLETE_LOAN', { timing: 'immediate' });
assert.equal(expectedActive.loans[0].status, 'active');
assert.equal(expectedActive.loans[0].startDate, agreement.date);
const expectedPurchase = act(expectedActive, 'EXERCISE_LOAN_OPTION', { loanId: expectedActive.loans[0].id });
assert.equal(expectedPurchase.loans[0].status, 'active');
assert.equal(expectedPurchase.loans[0].purchaseDate, '2019-01-01');
assert.equal(expectedPurchase.world.players.find(player => player.id === 'c1-p17').ownerClubId, 'c1');
const save = api.serializeManagerCareer(agreement);
const restored = api.restoreManagerCareer(save);
assert.ok(restored, 'public importer accepts the synthetic fixture');
assert.deepEqual(restored.loanNegotiation, agreement.loanNegotiation);
assert.deepEqual(restored.transferWindowCalendar, agreement.transferWindowCalendar);
const fixturePath = resolve(`${output}/fixtures/efl-2018-loan-agreed.json`);
await fs.writeFile(fixturePath, save);
const fixture = { file: fixturePath, synthetic: true, date: agreement.date, playerId: 'c1-p17',
  ownerClubId: 'c1', borrowerClubId: 'c0', expectedPurchaseDate: '2019-01-01' };
await fs.writeFile(`${output}/fixtures/manifest.json`, JSON.stringify(fixture, null, 2));
if (process.argv.includes('--fixtures-only')) { console.log(JSON.stringify(fixture)); process.exit(0); }

const browser = await chromium.launch({ headless: true });
const checks = [], errors = [], consoleErrors = [], snapshots = {};
let activePage;
const read = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const button = (page, name) => page.getByRole('button', { name, exact: true });
const nav = (page, name) => page.getByRole('navigation', { name: 'Secciones del mánager', exact: true })
  .getByRole('button', { name, exact: true }).click();
async function capture(page, name, locator) {
  await locator.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.fm-career-body')).opacity) >= .99);
  await page.screenshot({ path: `${output}/${name}.png` });
  const dimensions = await page.locator('.fm-game').evaluate(node => ({ client: node.clientWidth, scroll: node.scrollWidth }));
  assert.ok(dimensions.scroll <= dimensions.client + 1, `${name}: no horizontal overflow`);
  assert.doesNotMatch(await page.locator('.fm-career').innerText(), /Invalid Date|NaN/);
  snapshots[name] = await read(page);
}
async function persist(page, label) {
  const before = await read(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Continuar partida/ }).waitFor({ state: 'visible', timeout: 90000 });
  await page.getByRole('button', { name: /Continuar partida/ }).click();
  await page.locator('.fm-career').waitFor();
  const after = await read(page);
  for (const field of ['date', 'loans', 'loanNegotiation', 'squad', 'budget', 'financialObligations',
    'pendingTransfers', 'transfers', 'recruitmentFinances', 'transferWindow'])
    assert.deepEqual(after[field], before[field], `${label}: reload preserves ${field}`);
  await nav(page, 'Mercado');
  return after;
}
try {
  for (const [device, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport, isMobile: device === 'mobile', hasTouch: device === 'mobile', reducedMotion: 'reduce' });
    activePage = page;
    page.setDefaultTimeout(30000); page.setDefaultNavigationTimeout(90000);
    page.on('pageerror', error => errors.push(`${device}: ${error.message}`));
    page.on('crash', () => errors.push(`${device}: browser page crashed`));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(`${device}: ${message.text()}`); });
    await page.goto(`${base}/es/games/sports-manager`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Importar partida', { exact: true }).waitFor({ state: 'attached', timeout: 90000 });
    if (await page.locator('.cookie-consent-primary').isVisible()) await page.locator('.cookie-consent-primary').click();
    await page.getByLabel('Importar partida', { exact: true }).setInputFiles(fixturePath);
    await page.waitForFunction(date => {
      const state = JSON.parse(window.render_game_to_text());
      return state.date === date && state.loanNegotiation?.stage === 'agreed';
    }, agreement.date);
    await nav(page, 'Mercado');
    const desk = page.getByTestId('loan-desk');
    await desk.waitFor();
    const arrival = desk.getByLabel(/^Fecha de incorporación/);
    assert.equal(await arrival.inputValue(), 'immediate', `${device}: arrival defaults to immediate`);
    assert.equal(await arrival.locator('option[value="immediate"]').innerText(), 'Inmediata');
    assert.match(await desk.innerText(), /Periodo exclusivo de cesiones de la EFL hasta/);
    assert.match(await desk.innerText(), /La compra definitiva debe esperar a su propia ventana/);
    assert.ok(await desk.getByRole('link', { name: /Fuente/ }).getAttribute('href'), 'exception cites its source');
    assert.equal((await read(page)).transferWindow.open, false, 'permanent market remains closed');
    await capture(page, `${device}-immediate-efl-loan`, desk);
    const before = await read(page);
    await desk.getByRole('button', { name: 'Confirmar cesión', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).loans?.[0]?.status === 'active');
    const active = await read(page), loan = active.loans[0];
    assert.deepEqual(active.loans, expectedActive.loans, `${device}: UI loan matches public reducer`);
    assert.equal(loan.startDate, agreement.date, 'August arrival is not postponed to January');
    assert.equal(active.budget, before.budget - loan.fee);
    assert.equal(active.squad.find(player => player.id === fixture.playerId)?.ownerClubId, fixture.ownerClubId);
    await persist(page, `${device}-active`);
    await button(page, 'Contratos y cesiones').click();
    let card = page.locator(`[data-loan-id="${loan.id}"]`);
    await capture(page, `${device}-active-august-loan`, card);
    const beforePurchase = await read(page);
    await card.getByRole('button', { name: 'Ejecutar opción de compra', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).loans?.[0]?.purchaseDate === '2019-01-01');
    const queued = await read(page);
    assert.deepEqual(queued.loans, expectedPurchase.loans, `${device}: queued purchase matches public reducer`);
    assert.equal(queued.loans[0].status, 'active');
    assert.equal(queued.budget, beforePurchase.budget, 'future purchase does not charge immediately');
    assert.equal(queued.squad.find(player => player.id === fixture.playerId)?.ownerClubId, fixture.ownerClubId);
    assert.equal(queued.recruitmentFinances.loanReserve, loan.purchaseFee, 'purchase fee reserved until permanent window');
    assert.equal(await card.getByRole('button', { name: 'Ejecutar opción de compra', exact: true }).count(), 0, 'option cannot be exercised twice');
    assert.match(await card.innerText(), /Compra prevista/);
    await capture(page, `${device}-purchase-january-reserved`, card);
    await persist(page, `${device}-purchase-reserved`);
    await button(page, 'Contratos y cesiones').click();
    card = page.locator(`[data-loan-id="${loan.id}"]`);
    await capture(page, `${device}-purchase-reloaded`, card);
    checks.push(`${device}: immediate EFL August loan, separate January purchase, ownership and reserves, exact reload, no overflow`);
    console.log(checks.at(-1));
    await page.close(); activePage = null;
  }
  assert.deepEqual(errors, [], 'no browser exceptions');
  assert.deepEqual(consoleErrors, [], 'no console errors');
  await fs.writeFile(`${output}/verification.json`, JSON.stringify({ checks, errors, consoleErrors, fixture, snapshots }, null, 2));
  console.log(JSON.stringify({ checks, errors, consoleErrors }));
} catch (error) {
  if (activePage) {
    await activePage.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {});
    await fs.writeFile(`${output}/failure-ui.txt`, await activePage.locator('body').innerText().catch(() => ''));
    await fs.writeFile(`${output}/failure-state.json`, JSON.stringify(await read(activePage).catch(() => ({})), null, 2));
  }
  await fs.writeFile(`${output}/verification.json`, JSON.stringify({ checks, errors, consoleErrors, fixture, snapshots, failure: error.message }, null, 2));
  throw error;
} finally { await browser.close(); }
