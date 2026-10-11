import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';

// All imported saves are produced by public career constructors/reducer actions.
// Browser interaction uses public controls; the game bridge is strictly read-only.
const args = process.argv.slice(2).filter(value => !value.startsWith('--'));
const base = args[0] || 'http://127.0.0.1:5192';
const output = args[1] || 'output/manager-v8/contracts';
await fs.mkdir(`${output}/fixtures`, { recursive: true });
const bundle = await build({ stdin: { contents: `
  export { createManagerCareer, managerReducer, getNextFixture, getManagerSummary, getSquad,
    getTransferWindow, getRecruitmentFinances, serializeManagerCareer, restoreManagerCareer }
    from './src/games/sports/manager/engine.js';
  export { getManagerWorld } from './src/games/sports/manager/data.js';
`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const catalogue = api.getManagerWorld(2013);
const clubs = catalogue.clubs.filter(club => club.competitionId === 'laliga');
const clubIds = new Set(clubs.map(club => club.id));
const world = { ...catalogue, clubs, players: catalogue.players.filter(player => clubIds.has(player.clubId)),
  competitions: catalogue.competitions.filter(competition => competition.id === 'laliga'), countries: catalogue.countries.filter(country => country.fifa === 'ESP') };
const start = (clubId = 'real-madrid', careerWorld = world) => api.createManagerCareer({ year: 2013, clubId,
  managerName: 'Auditoría de contratos', seed: 'contracts-browser-v8', world: careerWorld });
const act = (state, type, payload = {}) => {
  const next = api.managerReducer(state, { type, ...payload });
  assert.ok(!next.lastError, `${type}: ${next.lastError}`);
  return next;
};
const previousDay = date => new Date(Date.parse(`${date}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
function advanceTo(state, date) {
  for (let turns = 0; state.date < date && turns < 200; turns++) {
    if (api.getNextFixture(state)?.date <= state.date) state = act(state, 'PLAY_MATCH', { mode: 'quick' });
    else state = act(state, 'ADVANCE_CALENDAR', { days: Math.min(7, Math.round((Date.parse(date) - Date.parse(state.date)) / 86400000)) });
  }
  assert.equal(state.date, date, 'fixture date reached through calendar and real football');
  return state;
}
function completeSeason(state) {
  for (let turns = 0; state.phase !== 'complete' && turns < 100; turns++) state = act(state, 'PLAY_MATCH', { mode: 'quick' });
  assert.equal(state.phase, 'complete'); return state;
}
function loanAgreement(state, playerId, purchaseType = 'none') {
  state = act(state, 'OPEN_LOAN_NEGOTIATION', { playerId });
  state = advanceTo(state, state.loanNegotiation.readyDate);
  return act(state, 'OFFER_LOAN_TERMS', { ...state.loanNegotiation.counterTerms, purchaseType });
}
function purchaseAgreement(state, playerId, clauses = {}) {
  state = act(state, 'OPEN_NEGOTIATION', { playerId });
  state = advanceTo(state, state.negotiation.readyDate);
  state = act(state, 'OFFER_CLUB', { fee: state.negotiation.askingFee, ...clauses });
  if (state.negotiation.stage === 'club') state = act(state, 'ACCEPT_CLUB_COUNTER');
  assert.equal(state.negotiation.stage, 'contract');
  return act(state, 'ACCEPT_CONTRACT_COUNTER');
}
const fixtures = {};
async function fixture(name, state, extra = {}) {
  const save = api.serializeManagerCareer(state), restored = api.restoreManagerCareer(save);
  for (const key of ['loans','loanNegotiation','renewalNegotiation','financialObligations','contractRights','pendingTransfers'])
    assert.deepEqual(restored[key], state[key], `${name}: ${key} exact save round trip`);
  const file = resolve(`${output}/fixtures/${name}.json`);
  await fs.writeFile(file, save);
  fixtures[name] = { file, date: state.date, round: state.round, phase: state.phase, budget: state.finances.budget,
    loans: state.loans.length, loanStage: state.loanNegotiation?.stage || null, ...extra };
}

let target, salePlayer;
if (process.argv.includes('--browser-only')) {
  const manifest = JSON.parse(await fs.readFile(`${output}/fixtures/manifest.json`, 'utf8'));
  Object.assign(fixtures, manifest.fixtures); target = manifest.target; salePlayer = manifest.salePlayer;
} else {
const initial = start();
const winterDate = api.getTransferWindow(initial).nextOpenDate;
const winter = advanceTo(initial, winterDate);
assert.equal(api.getTransferWindow(winter).open, true);
for (const player of world.players.filter(player => player.real && player.clubId !== initial.clubId && player.position !== 'GK'
  && player.value > 100000 && player.value < initial.finances.budget * .12).sort((a,b) => a.value-b.value)) {
  try {
    const loan = loanAgreement(winter, player.id, 'option');
    assert.equal(loan.loanNegotiation.stage, 'agreed');
    assert.equal(purchaseAgreement(winter, player.id).negotiation.stage, 'agreed');
    target = player; break;
  } catch { /* A sporting or financial refusal is an expected simulation outcome. */ }
}
assert.ok(target, 'a real affordable player accepts both a loan and a purchase enquiry');
console.log(`Fixtures: target ${target.name}, winter ${winterDate}`);
await fixture('winter', winter);
const activeOption = act(loanAgreement(winter, target.id, 'option'), 'COMPLETE_LOAN');
await fixture('active-option', activeOption);
await fixture('postseason-option', completeSeason(activeOption));
const closedAgreement = loanAgreement(initial, target.id, 'option');
await fixture('closed-loan-agreement', closedAgreement);
const pending = act(closedAgreement, 'COMPLETE_LOAN');
assert.equal(pending.loans[0].status, 'pending');
await fixture('loan-arrival-eve', advanceTo(pending, previousDay(pending.loans[0].startDate)), { arrivalDate: pending.loans[0].startDate });
const returnSeason = completeSeason(act(loanAgreement(winter, target.id), 'COMPLETE_LOAN'));
const returnNext = act(returnSeason, 'NEXT_SEASON');
assert.equal(returnNext.loans[0].status, 'returned');
await fixture('return-season-end', returnSeason, { nextDate: returnNext.date, returnedDate: returnNext.loans[0].returnedDate,
  nextFees: returnNext.financialObligations.filter(item => item.kind === 'loan-fee') });
const mandatoryAgreement = loanAgreement(winter, target.id, 'obligation');
await fixture('mandatory-agreement', mandatoryAgreement);
const mandatorySeason = completeSeason(act(mandatoryAgreement, 'COMPLETE_LOAN'));
const mandatoryNext = act(mandatorySeason, 'NEXT_SEASON');
assert.equal(mandatoryNext.loans[0].status, 'purchased');
await fixture('mandatory-season-end', mandatorySeason, { nextDate: mandatoryNext.date,
  expectedPlayer: api.getSquad(mandatoryNext).find(player => player.id === target.id), expectedObligations: mandatoryNext.financialObligations });

let saleResponse;
for (const player of winter.world.players.filter(player => player.clubId === winter.clubId && player.real && player.position !== 'GK'
  && !winter.lineup.includes(player.id)).sort((a,b) => a.value-b.value)) {
  try {
    const listed = act(winter, 'LIST_FOR_TRANSFER', { playerId: player.id, askingFee: player.value });
    const response = advanceTo(listed, listed.transferListings.at(-1).responseDate);
    const offer = response.transferOffers.find(item => item.playerId === player.id && item.status === 'pending');
    assert.ok(offer);
    const loanListed = act(winter, 'LIST_FOR_TRANSFER', { playerId: player.id, kind: 'loan', askingFee: Math.round(player.value * .04),
      loanTerms: { months: 6, fee: Math.round(player.value * .04), wageShare: 70, purchaseType: 'option', purchaseFee: Math.round(player.value * 1.2) } });
    const loanResponse = advanceTo(loanListed, loanListed.transferListings.at(-1).responseDate);
    assert.ok(loanResponse.transferOffers.some(item => item.playerId === player.id && item.status === 'pending'));
    salePlayer = player; saleResponse = response; await fixture('outgoing-loan-offer', loanResponse); break;
  } catch { /* Find a public listing that genuinely attracts a funded buyer. */ }
}
assert.ok(salePlayer, 'a reserve attracts both sale and loan offers');
await fixture('sale-offer', saleResponse);
const purchased = act(purchaseAgreement(winter, target.id, { installments: 2, upfrontPercent: 50, sellOnPercent: 10, buybackFee: Math.round(target.value * 3), buybackYears: 2 }), 'COMPLETE_TRANSFER');
const installmentsSeason = completeSeason(purchased);
await fixture('installments-season-end', installmentsSeason, { nextObligations: act(installmentsSeason, 'NEXT_SEASON').financialObligations });

// Create an opponent's contractual clause through an actual renewal, then start
// a fresh Madrid career in that contract-bearing world. No historical clause is invented.
let ownerCareer = act(start(target.clubId), 'OPEN_CONTRACT_RENEWAL', { playerId: target.id });
ownerCareer = act(ownerCareer, 'OFFER_RENEWAL', { ...ownerCareer.renewalNegotiation.demands, releaseClause: Math.round(target.value * 2) });
assert.equal(ownerCareer.renewalNegotiation.stage, 'agreed');
ownerCareer = act(ownerCareer, 'COMPLETE_RENEWAL');
const releaseCareer = advanceTo(start('real-madrid', ownerCareer.world), winterDate);
await fixture('release-clause', releaseCareer, { releaseFee: releaseCareer.world.players.find(player => player.id === target.id).contract.releaseClause });
await fs.writeFile(`${output}/fixtures/manifest.json`, JSON.stringify({ fixtures, target, salePlayer }, null, 2));
}
if (!fixtures['postseason-option']) {
  const savedOption = api.restoreManagerCareer(await fs.readFile(fixtures['active-option'].file, 'utf8'));
  await fixture('postseason-option', completeSeason(savedOption));
  await fs.writeFile(`${output}/fixtures/manifest.json`, JSON.stringify({ fixtures, target, salePlayer }, null, 2));
}
if (process.argv.includes('--fixtures-only')) { console.log(JSON.stringify({ fixtureCount: Object.keys(fixtures).length, target: target.name, salePlayer: salePlayer.name })); process.exit(0); }

const browser = await chromium.launch({ headless: true });
const checks = [], errors = [], consoleErrors = [];
checks.push = (...items) => { console.log(items.join('\n')); return Array.prototype.push.apply(checks, items); };
let activePage;
const read = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const button = (page, name) => page.getByRole('button', { name, exact: true });
const nav = (page, name) => page.getByRole('navigation', { name: 'Secciones del mánager', exact: true }).getByRole('button', { name, exact: true }).click();
async function pageFor(viewport) {
  const page = await browser.newPage({ viewport, isMobile: viewport.width < 600, hasTouch: viewport.width < 600, reducedMotion: 'reduce' });
  page.setDefaultTimeout(30000); page.setDefaultNavigationTimeout(90000); activePage = page;
  page.on('pageerror', error => errors.push(error.message));
  page.on('crash', () => errors.push('Browser page crashed'));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto(`${base}/es/games/sports-manager`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Importar partida', { exact: true }).waitFor({ state: 'attached', timeout: 90000 });
  if (await page.locator('.cookie-consent-primary').isVisible()) await page.locator('.cookie-consent-primary').click();
  return page;
}
async function importFixture(page, name) {
  await page.getByLabel('Importar partida', { exact: true }).setInputFiles(fixtures[name].file);
  await page.waitForFunction(expected => {
    const current = JSON.parse(window.render_game_to_text());
    return current.date === expected.date && current.round === expected.round && current.budget === expected.budget
      && current.loans?.length === expected.loans && (current.loanNegotiation?.stage || null) === expected.loanStage;
  }, fixtures[name]);
  await nav(page, 'Despacho');
  await nav(page, 'Mercado');
}
async function capture(page, name, locator) {
  if (locator) await locator.scrollIntoViewIfNeeded();
  else await page.locator('.launch-body').evaluate(node => { node.scrollTop = 0; });
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.fm-career-body')).opacity) >= .99);
  await page.screenshot({ path: `${output}/${name}.png` });
  const dimensions = await page.locator('.fm-game').evaluate(node => ({ client: node.clientWidth, scroll: node.scrollWidth }));
  assert.ok(dimensions.scroll <= dimensions.client + 1, `${name}: no horizontal overflow`);
  assert.doesNotMatch(await page.locator('.fm-career').innerText(), /Invalid Date|NaN/);
}
async function persist(page, fields) {
  const before = await read(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Continuar partida/ }).waitFor({ state: 'visible', timeout: 90000 });
  await page.getByRole('button', { name: /Continuar partida/ }).click();
  await page.locator('.fm-career').waitFor();
  const after = await read(page);
  for (const field of fields) assert.deepEqual(after[field], before[field], `reload preserves ${field}`);
  await nav(page, 'Mercado'); return after;
}
async function selectTarget(page) {
  await button(page, 'Buscar futbolistas').click();
  await page.getByLabel('Buscar jugador o club', { exact: true }).fill(target.name);
  await page.locator('.fm-recruit-table tbody tr').filter({ hasText: target.name }).first().getByRole('button', { name: 'Ver ficha', exact: true }).click();
}
async function advanceBrowserTo(page, date) {
  for (let turns = 0; turns < 30; turns++) {
    const current = await read(page);
    if (current.date === date) return current;
    assert.ok(current.date < date);
    if (current.phase !== 'complete' && current.restDays === 0) { await nav(page, 'Despacho'); await button(page, 'Simulación rápida').click(); await nav(page, 'Mercado'); }
    else await button(page, 'Avanzar un día').click();
  }
  throw new Error(`UI calendar did not reach ${date}`);
}
async function fillLoan(scope, terms) {
  await scope.getByLabel('Duración de la cesión').selectOption(String(terms.months));
  await scope.getByLabel('Tarifa de cesión (€)', { exact: true }).fill(String(terms.fee));
  await scope.getByLabel('Salario a cargo del receptor (%)', { exact: true }).fill(String(terms.wageShare));
  await scope.getByLabel('Compra al finalizar').selectOption(terms.purchaseType);
  if (terms.purchaseType !== 'none') await scope.getByLabel('Precio de compra acordado (€)', { exact: true }).fill(String(terms.purchaseFee));
}
async function fillClauses(scope, terms) {
  const details = scope.locator('.fm-clause-fields');
  if ((await details.getAttribute('open')) === null) await details.locator('summary').click();
  await scope.getByLabel('Pagos aplazados').selectOption(String(terms.installments || 0));
  if (terms.installments) await scope.getByLabel('Pago inicial (%)', { exact: true }).fill(String(terms.upfrontPercent));
  await scope.getByLabel('Porcentaje de futura venta (%)', { exact: true }).fill(String(terms.sellOnPercent));
  await scope.getByLabel('Precio de recompra (€)', { exact: true }).fill(String(terms.buybackFee));
  await scope.getByLabel('Vigencia de recompra').selectOption(String(terms.buybackYears));
}
async function signPlayerContract(page, releaseClause = null) {
  const demands = (await read(page)).negotiation.demands;
  await page.getByLabel('Salario semanal (€)', { exact: true }).fill(String(demands.wage));
  await page.getByLabel('Prima de fichaje (€)', { exact: true }).fill(String(demands.signingBonus));
  await page.getByLabel('Duración del contrato').selectOption(String(demands.years));
  await page.getByLabel('Papel en la plantilla').selectOption(demands.role);
  await page.getByLabel('Cláusula de rescisión (€)', { exact: true }).fill(releaseClause ? String(releaseClause) : '');
  await button(page, 'Proponer contrato').click();
  if ((await read(page)).negotiation.stage === 'contract') await button(page, 'Aceptar condiciones del jugador').click();
  assert.equal((await read(page)).negotiation.stage, 'agreed');
  await button(page, 'Confirmar fichaje').click();
}

async function verifyPostseason(page) {
  await importFixture(page, 'postseason-option');
  assert.equal((await read(page)).phase, 'complete');
  assert.ok(await button(page, 'Avanzar un día').isEnabled(), 'finished season still permits market calendar');
  await button(page, 'Contratos y cesiones').click();
  assert.ok(await button(page, 'Ejecutar opción de compra').isEnabled(), 'summer purchase decision remains available after finals');
  await button(page, 'Ejecutar opción de compra').click();
  const reserved = await read(page), loan = reserved.loans[0];
  assert.ok(loan.purchaseDate > reserved.date);
  assert.equal(loan.status, 'active'); assert.equal(reserved.recruitmentFinances.loanReserve, loan.purchaseFee);
  await page.getByLabel('Futbolista con contrato').selectOption(salePlayer.id);
  await button(page, 'Negociar renovación').click();
  const beforeRenewal = await read(page), terms = beforeRenewal.renewalNegotiation.demands;
  await button(page, 'Aceptar condiciones de renovación').click();
  await button(page, 'Firmar renovación').click();
  const renewed = await read(page);
  assert.equal(renewed.budget, beforeRenewal.budget - terms.signingBonus);
  assert.equal(renewed.squad.find(player => player.id === salePlayer.id).wage, terms.wage);
  await persist(page, ['loans','squad','budget','financialObligations']);
  await nav(page, 'Ojeadores');
  await page.getByLabel('Duración de la misión').selectOption('14');
  await page.getByRole('button', { name: /^Iniciar misión de ojeo/ }).click();
  const scouting = await read(page), mission = scouting.scoutMissions.at(-1);
  assert.ok(mission && mission.status === 'active', 'scouting can start after competitions finish');
  await nav(page, 'Mercado');
  const arrived = await advanceBrowserTo(page, loan.purchaseDate);
  assert.equal(arrived.phase, 'complete'); assert.equal(arrived.loans[0].status, 'purchased');
  assert.equal(arrived.budget, scouting.budget - loan.purchaseFee);
  assert.equal(arrived.squad.find(player => player.id === target.id).ownerClubId, 'real-madrid');
  await button(page, 'Contratos y cesiones').click();
  await capture(page, 'desktop-postseason-option', page.locator('.fm-contract-card').first());
  await advanceBrowserTo(page, mission.endDate);
  assert.equal((await read(page)).scoutMissions.at(-1).status, 'complete');
  await nav(page, 'Ojeadores');
  await capture(page, 'desktop-postseason-scouting', page.locator('.fm-scout-report').first());
  await persist(page, ['loans','financialObligations','squad','scoutMissions','scoutReports','budget']);
  checks.push('Postseason June/July: exercise option, renew contract, fund scouting and advance to registration/reports without forced season rollover');
}

if (process.argv.includes('--postseason-only')) {
  try {
    await verifyPostseason(await pageFor({ width: 1440, height: 1000 }));
    assert.deepEqual(errors, []); assert.deepEqual(consoleErrors, []);
    await fs.writeFile(`${output}/postseason-verification.json`, JSON.stringify({ checks, errors, consoleErrors }, null, 2));
    console.log(JSON.stringify({ checks, errors, consoleErrors }));
  } catch (error) {
    if (activePage) {
      await activePage.screenshot({ path: `${output}/postseason-failure.png` }).catch(() => {});
      await fs.writeFile(`${output}/postseason-failure-state.json`, JSON.stringify(await read(activePage).catch(() => ({})), null, 2));
    }
    throw error;
  } finally { await browser.close(); }
  process.exit(0);
}

try {
  const page = await pageFor({ width: 1440, height: 1000 });
  await importFixture(page, 'winter'); await selectTarget(page); await button(page, 'Cesión').click();
  await button(page, 'Consultar cesión').click();
  const inquiry = (await read(page)).loanNegotiation;
  assert.equal(inquiry.stage, 'inquiry');
  await capture(page, 'desktop-loan-inquiry', page.getByTestId('loan-desk'));
  await persist(page, ['loanNegotiation','budget']);
  await advanceBrowserTo(page, inquiry.readyDate);
  const quote = (await read(page)).loanNegotiation.counterTerms;
  await fillLoan(page.getByTestId('loan-desk'), { ...quote, purchaseType: 'option' });
  await button(page, 'Proponer cesión').click();
  assert.equal((await read(page)).loanNegotiation.stage, 'agreed');
  assert.match(await page.getByTestId('loan-desk').innerText(), /Contrato pactado si se compra/);
  const beforeLoan = await read(page);
  await button(page, 'Confirmar cesión').click();
  const signedLoan = await read(page), loan = signedLoan.loans[0];
  assert.equal(loan.status, 'active'); assert.equal(loan.purchaseType, 'option');
  assert.equal(signedLoan.budget, beforeLoan.budget - loan.fee);
  assert.equal(signedLoan.squad.find(player => player.id === target.id).ownerClubId, target.clubId);
  await persist(page, ['loans','budget','squad','financialObligations']);
  await button(page, 'Contratos y cesiones').click();
  assert.ok(!(await page.getByLabel('Futbolista con contrato').locator('option').allTextContents()).includes(target.name), 'borrowed player is excluded from renewal list');
  await capture(page, 'desktop-loan-option', page.locator(`[data-loan-id="${loan.id}"]`));
  const beforeOption = await read(page);
  await button(page, 'Ejecutar opción de compra').click();
  const bought = await read(page);
  assert.equal(bought.loans[0].status, 'purchased');
  assert.equal(bought.budget, beforeOption.budget - loan.purchaseFee);
  assert.equal(bought.squad.find(player => player.id === target.id).ownerClubId, 'real-madrid');
  assert.equal(bought.squad.find(player => player.id === target.id).contract.years, loan.purchaseYears);
  await persist(page, ['loans','budget','financialObligations','squad']);
  checks.push('Incoming enquiry, exact reload, negotiated option, wage split, signing and voluntary permanent purchase');

  await importFixture(page, 'closed-loan-agreement');
  const closedBefore = await read(page);
  await button(page, 'Confirmar cesión').click();
  const queued = await read(page);
  assert.equal(queued.loans[0].status, 'pending'); assert.equal(queued.budget, closedBefore.budget);
  assert.ok(!queued.squad.some(player => player.id === target.id));
  assert.equal(queued.recruitmentFinances.loanReserve, queued.loans[0].fee);
  await persist(page, ['loans','budget','financialObligations']);
  await importFixture(page, 'loan-arrival-eve');
  const arrivalBefore = await read(page);
  const arrival = await advanceBrowserTo(page, fixtures['loan-arrival-eve'].arrivalDate);
  assert.equal(arrival.loans[0].status, 'active'); assert.equal(arrival.budget, arrivalBefore.budget - arrival.loans[0].fee);
  assert.equal(arrival.financialObligations.filter(item => item.kind === 'loan-fee').length, 1);
  checks.push('Closed period reserves a loan; documented January date registers it and charges the fee once');

  await importFixture(page, 'return-season-end'); await nav(page, 'Despacho');
  await button(page, 'Empezar próxima temporada').click();
  const returned = await read(page);
  assert.equal(returned.date, fixtures['return-season-end'].nextDate);
  assert.equal(returned.loans[0].status, 'returned'); assert.equal(returned.loans[0].returnedDate, fixtures['return-season-end'].returnedDate);
  assert.ok(!returned.squad.some(player => player.id === target.id));
  assert.deepEqual(returned.financialObligations.filter(item => item.kind === 'loan-fee'), fixtures['return-season-end'].nextFees);
  await persist(page, ['loans','financialObligations','budget']);
  checks.push('Automatic summer return keeps the agreed return date, removes registration and cannot duplicate the fee');

  await importFixture(page, 'mandatory-agreement');
  await button(page, 'Confirmar cesión').click();
  const mandatory = await read(page);
  assert.equal(mandatory.loans[0].purchaseType, 'obligation');
  assert.equal(mandatory.recruitmentFinances.loanReserve, mandatory.loans[0].purchaseFee);
  await button(page, 'Contratos y cesiones').click(); await capture(page, 'desktop-mandatory', page.locator('.fm-contract-card').first());
  await importFixture(page, 'mandatory-season-end'); await nav(page, 'Despacho'); await button(page, 'Empezar próxima temporada').click();
  const converted = await read(page);
  assert.equal(converted.loans[0].status, 'purchased');
  assert.deepEqual(converted.financialObligations, fixtures['mandatory-season-end'].expectedObligations);
  const convertedPlayer = converted.squad.find(player => player.id === target.id), expectedPlayer = fixtures['mandatory-season-end'].expectedPlayer;
  for (const key of ['wage','condition','sharpness','injury','contract','ownerClubId']) assert.deepEqual(convertedPlayer[key], expectedPlayer[key], `summer purchase preserves ${key}`);
  await persist(page, ['loans','squad','financialObligations']);
  checks.push('Mandatory purchase reserves its full price, executes at summer registration and preserves health/contract state');

  await importFixture(page, 'winter'); await button(page, 'Ventas y ofertas').click();
  await page.getByLabel('Jugador a ofrecer').selectOption(salePlayer.id);
  await page.getByLabel('Modalidad de salida').selectOption('loan');
  await fillLoan(page.locator('.fm-offer-form').first(), { months: 6, fee: Math.round(salePlayer.value * .04), wageShare: 70, purchaseType: 'option', purchaseFee: Math.round(salePlayer.value * 1.2) });
  await button(page, 'Ofrecer en cesión').click();
  const listing = (await read(page)).transferListings.find(item => item.playerId === salePlayer.id);
  assert.equal(listing.loanTerms.purchaseType, 'option');
  await advanceBrowserTo(page, listing.responseDate);
  let outgoing = (await read(page)).transferOffers.find(item => item.playerId === salePlayer.id && item.kind === 'loan');
  assert.ok(outgoing);
  const loanOffer = page.locator(`[data-offer-id="${outgoing.id}"]`);
  await fillLoan(loanOffer, { ...outgoing.loanTerms, fee: Math.min(outgoing.maxFee, outgoing.fee + 1000), wageShare: 80 });
  await loanOffer.getByRole('button', { name: 'Contraofertar cesión', exact: true }).click();
  outgoing = (await read(page)).transferOffers.find(item => item.id === outgoing.id);
  assert.equal(outgoing.status, 'counter'); assert.equal(outgoing.loanTerms.wageShare, 80);
  await capture(page, 'desktop-outgoing-loan', loanOffer);
  const beforeOutgoing = await read(page);
  await loanOffer.getByRole('button', { name: 'Aceptar cesión saliente', exact: true }).click();
  const acceptedLoan = await read(page);
  assert.equal(acceptedLoan.loans[0].ownerClubId, 'real-madrid'); assert.equal(acceptedLoan.loans[0].wageShare, 80);
  assert.ok(!acceptedLoan.squad.some(player => player.id === salePlayer.id));
  assert.equal(acceptedLoan.budget, beforeOutgoing.budget + outgoing.fee);
  await persist(page, ['loans','budget','financialObligations','transferOffers']);
  checks.push('Outgoing listing publishes actual loan terms; buyer responds, accepts wage-sharing counter and pays once');

  await importFixture(page, 'winter'); await selectTarget(page); await button(page, 'Consulta de disponibilidad').click();
  await advanceBrowserTo(page, (await read(page)).negotiation.readyDate);
  const asking = (await read(page)).negotiation.askingFee;
  await page.getByLabel('Oferta al club (€)', { exact: true }).fill(String(asking));
  await fillClauses(page.getByTestId('negotiation-desk'), { installments: 2, upfrontPercent: 50, sellOnPercent: 10, buybackFee: Math.round(target.value * 3), buybackYears: 2 });
  await capture(page, 'desktop-purchase-clauses', page.getByTestId('negotiation-desk'));
  await button(page, 'Presentar oferta al club').click();
  if ((await read(page)).negotiation.stage === 'club') await button(page, 'Aceptar contraoferta del club').click();
  const purchaseBefore = await read(page);
  await signPlayerContract(page, Math.round(target.value * 2));
  const installmentPurchase = await read(page);
  assert.equal(installmentPurchase.squad.find(player => player.id === target.id).contract.releaseClause, Math.round(target.value * 2));
  assert.equal(installmentPurchase.contractRights.filter(right => right.playerId === target.id).length, 2);
  const ledger = installmentPurchase.financialObligations.filter(item => item.playerId === target.id);
  assert.equal(ledger.filter(item => item.kind === 'transfer-installment' && item.status === 'pending').length, 2);
  assert.equal(installmentPurchase.budget, purchaseBefore.budget - ledger.filter(item => item.status === 'paid').reduce((sum,item) => sum + item.amount,0));
  assert.equal(installmentPurchase.recruitmentFinances.installmentReserve, ledger.filter(item => item.status === 'pending').reduce((sum,item) => sum + item.amount,0));
  await persist(page, ['contractRights','financialObligations','budget','squad']);
  await button(page, 'Contratos y cesiones').click(); await capture(page, 'desktop-payment-calendar', page.locator('.fm-contract-payments'));
  await importFixture(page, 'installments-season-end'); await nav(page, 'Despacho'); await button(page, 'Empezar próxima temporada').click();
  assert.deepEqual((await read(page)).financialObligations, fixtures['installments-season-end'].nextObligations);
  checks.push('Purchase negotiates deferred payments, sell-on, buyback and release; future cash is reserved and installments settle once');

  await importFixture(page, 'sale-offer'); await button(page, 'Ventas y ofertas').click();
  let sale = (await read(page)).transferOffers.find(item => item.playerId === salePlayer.id);
  const saleCard = page.locator(`[data-offer-id="${sale.id}"]`), saleFee = Math.floor(sale.maxFee * .8);
  await saleCard.getByLabel('Tu contraoferta (€)', { exact: true }).fill(String(saleFee));
  await fillClauses(saleCard, { installments: 0, sellOnPercent: 10, buybackFee: saleFee * 2, buybackYears: 2 });
  await saleCard.getByRole('button', { name: 'Contraofertar venta', exact: true }).click();
  assert.equal((await read(page)).transferOffers.find(item => item.id === sale.id).status, 'counter');
  await saleCard.getByRole('button', { name: 'Aceptar venta', exact: true }).click();
  const sold = await read(page);
  assert.ok(!sold.squad.some(player => player.id === salePlayer.id));
  const ownRights = sold.contractRights.filter(right => right.playerId === salePlayer.id);
  assert.equal(ownRights.length, 2); assert.ok(ownRights.every(right => right.holderClubId === 'real-madrid'));
  await button(page, 'Contratos y cesiones').click(); await capture(page, 'desktop-own-buyback', page.getByTestId('contracts-panel'));
  await button(page, 'Iniciar recompra').click();
  const buybackDeal = (await read(page)).negotiation;
  assert.equal(buybackDeal.stage, 'contract'); assert.equal(buybackDeal.fee, saleFee * 2);
  await signPlayerContract(page);
  const repurchased = await read(page);
  assert.ok(repurchased.squad.some(player => player.id === salePlayer.id));
  assert.ok(repurchased.contractRights.filter(right => right.playerId === salePlayer.id).every(right => right.status === 'used'));
  assert.equal(repurchased.budget, sold.budget - Math.round(buybackDeal.fee * .9) - buybackDeal.demands.signingBonus);
  await persist(page, ['contractRights','financialObligations','squad','budget']);
  checks.push('Sale retains own sell-on/buyback rights; exercising buyback negotiates consent and offsets own royalty without self-payment');

  await importFixture(page, 'release-clause'); await selectTarget(page);
  await page.getByRole('button', { name: /^Negociar pagando rescisión/ }).click();
  assert.equal((await read(page)).negotiation.stage, 'contract'); assert.equal((await read(page)).negotiation.fee, fixtures['release-clause'].releaseFee);
  await signPlayerContract(page);
  assert.ok((await read(page)).squad.some(player => player.id === target.id));
  await persist(page, ['squad','budget','financialObligations']);
  checks.push('Recorded release clause bypasses club pricing but still requires player contract and final signing');

  await importFixture(page, 'winter'); await button(page, 'Contratos y cesiones').click();
  await page.getByLabel('Futbolista con contrato').selectOption(salePlayer.id); await button(page, 'Negociar renovación').click();
  const renewalBefore = await read(page), renewalTerms = renewalBefore.renewalNegotiation.demands;
  await page.getByLabel('Rescisión del nuevo contrato (€)', { exact: true }).fill(String(Math.round(salePlayer.value * 2)));
  await button(page, 'Proponer renovación').click();
  assert.equal((await read(page)).renewalNegotiation.stage, 'agreed');
  await capture(page, 'desktop-renewal', page.getByTestId('renewal-desk'));
  await button(page, 'Firmar renovación').click();
  const renewed = await read(page), renewedPlayer = renewed.squad.find(player => player.id === salePlayer.id);
  assert.equal(renewedPlayer.wage, renewalTerms.wage); assert.equal(renewedPlayer.contract.releaseClause, Math.round(salePlayer.value * 2));
  assert.equal(renewed.budget, renewalBefore.budget - renewalTerms.signingBonus);
  await persist(page, ['squad','budget','financialObligations']);
  checks.push('Renewal changes salary, term and executable release clause, with one signing bonus and exact reload');

  const phone = await pageFor({ width: 390, height: 844 });
  await importFixture(phone, 'mandatory-agreement'); await capture(phone, 'phone-loan-terms', phone.getByTestId('loan-desk'));
  await button(phone, 'Confirmar cesión').click(); await button(phone, 'Contratos y cesiones').click();
  await capture(phone, 'phone-contracts', phone.locator('.fm-contract-card').first());
  await importFixture(phone, 'outgoing-loan-offer'); await button(phone, 'Ventas y ofertas').click();
  const phoneOffer = phone.locator('.fm-sale-offer').first(); await capture(phone, 'phone-outgoing-loan', phoneOffer);
  const phoneBudget = (await read(phone)).budget;
  await phoneOffer.getByRole('button', { name: 'Rechazar oferta', exact: true }).click();
  assert.equal((await read(phone)).budget, phoneBudget);
  assert.ok((await read(phone)).squad.some(player => player.id === salePlayer.id));
  checks.push('390px phone: loan signature, contract cards and outgoing offer controls work without horizontal overflow');
  await verifyPostseason(page);
  assert.deepEqual(errors, [], 'no browser exceptions'); assert.deepEqual(consoleErrors, [], 'no console errors');
  await fs.writeFile(`${output}/verification.json`, JSON.stringify({ checks, errors, consoleErrors, target: target.name, salePlayer: salePlayer.name, fixtures }, null, 2));
  console.log(JSON.stringify({ checks, errors, consoleErrors }));
} catch (error) {
  if (activePage) {
    await activePage.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {});
    await fs.writeFile(`${output}/failure-ui.txt`, await activePage.locator('body').innerText().catch(() => ''));
    await fs.writeFile(`${output}/failure-state.json`, JSON.stringify(await read(activePage).catch(() => ({})), null, 2));
  }
  await fs.writeFile(`${output}/verification.json`, JSON.stringify({ checks, errors, consoleErrors, failure: error.message }, null, 2));
  throw error;
} finally { await browser.close(); }
