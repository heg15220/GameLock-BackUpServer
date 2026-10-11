import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';

// Outcomes and dates come from the real reducer. The browser only uses public
// controls, save import and read-only observation; no production state injection.
const positional = process.argv.slice(2).filter(value => !value.startsWith('--'));
const base = positional[0] || 'http://127.0.0.1:5192';
const output = positional[1] || 'output/manager-v7/market';
await fs.mkdir(`${output}/fixtures`, { recursive: true });
const bundle = await build({ stdin: { contents: `
  export { createManagerCareer, managerReducer, getNextFixture, getManagerSummary,
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
const start = () => api.createManagerCareer({ year: 2013, clubId: 'real-madrid', managerName: 'Auditoría del mercado', seed: 'market-browser-v7', world });
const act = (state, action) => {
  const next = api.managerReducer(state, action);
  assert.ok(!next.lastError, `${action.type}: ${next.lastError}`);
  return next;
};
const dayBefore = date => new Date(Date.parse(`${date}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
function advanceTo(state, date) {
  for (let attempts = 0; state.date < date && attempts < 160; attempts++) {
    const nextDate = api.getNextFixture(state)?.date;
    if (nextDate && nextDate <= state.date) state = act(state, { type: 'PLAY_MATCH', mode: 'quick' });
    else {
      const days = Math.min(7, Math.round((Date.parse(date) - Date.parse(state.date)) / 86400000));
      const before = state.date;
      state = act(state, { type: 'ADVANCE_CALENDAR', days });
      assert.ok(state.date > before, 'calendar makes progress before next fixture');
    }
  }
  assert.equal(state.date, date, 'calendar reaches requested fixture date without skipping football');
  return state;
}
function readyInquiry(state, playerId) {
  state = act(state, { type: 'OPEN_NEGOTIATION', playerId });
  assert.equal(state.negotiation.stage, 'inquiry');
  assert.equal(state.negotiation.status, 'waiting');
  return advanceTo(state, state.negotiation.readyDate);
}
function agree(state, playerId) {
  state = readyInquiry(state, playerId);
  assert.equal(state.negotiation.stage, 'club');
  state = act(state, { type: 'OFFER_CLUB', fee: state.negotiation.askingFee });
  if (state.negotiation.stage === 'club' && state.negotiation.status === 'counter') state = act(state, { type: 'ACCEPT_CLUB_COUNTER' });
  assert.equal(state.negotiation.stage, 'contract');
  state = act(state, { type: 'OFFER_CONTRACT', ...state.negotiation.demands });
  if (state.negotiation.stage === 'contract' && state.negotiation.status === 'counter') state = act(state, { type: 'ACCEPT_CONTRACT_COUNTER' });
  assert.equal(state.negotiation.stage, 'agreed');
  return state;
}
const fixtures = {};
async function fixture(name, state, extra = {}) {
  const save = api.serializeManagerCareer(state), restored = api.restoreManagerCareer(save);
  assert.equal(restored.date, state.date);
  assert.deepEqual(restored.negotiation, state.negotiation, `${name}: negotiation restored exactly`);
  assert.deepEqual(restored.pendingTransfers || [], state.pendingTransfers || [], `${name}: pending transfers restored exactly`);
  assert.deepEqual(restored.scoutMissions || [], state.scoutMissions || [], `${name}: scouting restored exactly`);
  assert.deepEqual(api.getNextFixture(restored), api.getNextFixture(state), `${name}: imported fixture calendar unchanged`);
  const file = resolve(`${output}/fixtures/${name}.json`);
  await fs.writeFile(file, save);
  fixtures[name] = { file, date: state.date, round: state.round, budget: state.finances.budget,
    negotiationStage: state.negotiation?.stage || null, pendingCount: state.pendingTransfers?.length || 0, ...extra };
}

const initial = start();
assert.equal(api.getTransferWindow(initial).open, false, 'September archive begins after the simplified summer window');
let target;
for (const player of world.players.filter(player => player.real && player.clubId !== initial.clubId && player.value > 100000 && player.value < initial.finances.budget * .12).sort((a, b) => a.value - b.value)) {
  try {
    const candidate = agree(initial, player.id);
    if (candidate.negotiation.fee + candidate.negotiation.signingBonus < initial.finances.budget * .2) { target = player; break; }
  } catch { /* A refusal is a legitimate outcome; select a verified playable scenario. */ }
}
assert.ok(target, 'a real affordable target accepts talks through the actual reducer');
await fixture('initial', initial, { target: { id: target.id, name: target.name, clubId: target.clubId } });
const closed = act(initial, { type: 'PLAY_MATCH', mode: 'quick' });
assert.equal(api.getTransferWindow(closed).open, false, 'September is outside the simplified windows');
await fixture('closed', closed);
const closedAgreement = agree(closed, target.id);
await fixture('closed-agreement', closedAgreement);
const pending = act(closedAgreement, { type: 'COMPLETE_TRANSFER', timing: 'next-window' });
assert.equal(pending.world.players.find(player => player.id === target.id).clubId, target.clubId);
assert.equal(pending.pendingTransfers.length, 1);
assert.ok(api.getRecruitmentFinances(pending).reservedFees > 0);
const joinDate = pending.pendingTransfers[0].joinDate;
await fixture('pending', pending, { joinDate });
await fixture('arrival-eve', advanceTo(pending, dayBefore(joinDate)), { joinDate });
const winter = advanceTo(closed, joinDate);
await fixture('winter', winter);
let salePlayer;
for (const player of winter.world.players.filter(player => player.clubId === winter.clubId && player.real && player.position !== 'GK' && !winter.lineup.includes(player.id)).sort((a, b) => a.value - b.value)) {
  const listed = api.managerReducer(winter, { type: 'LIST_FOR_TRANSFER', playerId: player.id, askingFee: player.value });
  if (listed.lastError) continue;
  const response = advanceTo(listed, listed.transferListings.at(-1).responseDate);
  const offer = response.transferOffers.find(offer => offer.playerId === player.id && offer.status === 'pending' && offer.maxFee >= offer.fee + 1000);
  if (offer) { salePlayer = player; await fixture('sale-offer', response); break; }
}
assert.ok(salePlayer, 'a genuine club makes an affordable offer for a listed reserve');
const scoutAction = { type: 'START_SCOUTING', level: 'elite', duration: 14, country: 'ESP', position: 'MF', minAge: 16, maxAge: 21, focus: 'prospect' };
const scoutStarted = act(initial, scoutAction);
await fixture('scouting-complete', advanceTo(scoutStarted, scoutStarted.scoutMissions[0].endDate));
await fs.writeFile(`${output}/fixtures/manifest.json`, JSON.stringify(fixtures, null, 2));
if (process.argv.includes('--fixtures-only')) {
  console.log(JSON.stringify({ fixtures, target: { id: target.id, name: target.name } }));
  process.exit(0);
}

const browser = await chromium.launch({ headless: true });
const checks = [], errors = [], consoleErrors = [];
let activePage;
const read = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const button = (page, name) => page.getByRole('button', { name, exact: true });
const nav = (page, name) => page.getByRole('navigation', { name: 'Secciones del mánager', exact: true }).getByRole('button', { name, exact: true }).click();
async function pageFor(viewport) {
  const page = await browser.newPage({ viewport, isMobile: viewport.width < 600, hasTouch: viewport.width < 1100, reducedMotion: viewport.width < 600 ? 'reduce' : 'no-preference' });
  activePage = page;
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto(`${base}/es/games/sports-manager`, { waitUntil: 'networkidle' });
  const cookie = page.locator('.cookie-consent-primary');
  if (await cookie.isVisible()) await cookie.click();
  return page;
}
async function importFixture(page, name, section = 'Mercado') {
  await page.getByLabel('Importar partida', { exact: true }).setInputFiles(fixtures[name].file);
  await page.waitForFunction(expected => {
    const current = JSON.parse(window.render_game_to_text());
    return current.date === expected.date && current.round === expected.round && current.budget === expected.budget
      && (current.negotiation?.stage || null) === expected.negotiationStage && (current.pendingTransfers?.length || 0) === expected.pendingCount;
  }, fixtures[name]);
  await nav(page, section);
}
async function capture(page, name, locator) {
  if (locator) await locator.scrollIntoViewIfNeeded();
  else await page.locator('.launch-body').evaluate(node => { node.scrollTop = 0; });
  await page.waitForFunction(() => {
    const panel = document.querySelector('.fm-career-body');
    return panel && Number(getComputedStyle(panel).opacity) >= .99;
  });
  await page.screenshot({ path: `${output}/${name}.png` });
  const dimensions = await page.locator('.fm-game').evaluate(node => ({ client: node.clientWidth, scroll: node.scrollWidth }));
  assert.ok(dimensions.scroll <= dimensions.client + 1, `${name}: no horizontal overflow`);
  assert.doesNotMatch(await page.locator('.fm-career').innerText(), /Invalid Date|NaN/, `${name}: valid displayed dates and amounts`);
}
async function reloadAndContinue(page) {
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Continuar partida/ }).click();
  await page.locator('.fm-career').waitFor();
}
async function selectTarget(page) {
  await page.getByLabel('Buscar jugador o club', { exact: true }).fill(target.name);
  const row = page.locator('.fm-recruit-table tbody tr').filter({ hasText: target.name }).first();
  await row.getByRole('button', { name: 'Ver ficha', exact: true }).click();
}
async function advanceInquiry(page) {
  for (let days = 0; days < 7 && (await read(page)).negotiation?.stage === 'inquiry'; days++) await button(page, 'Avanzar un día').click();
  assert.equal((await read(page)).negotiation.stage, 'club');
}
async function fillContract(page, values) {
  await page.getByLabel('Salario semanal (€)', { exact: true }).fill(String(values.wage));
  await page.getByLabel('Prima de fichaje (€)', { exact: true }).fill(String(values.signingBonus));
  await page.getByLabel('Duración del contrato').selectOption(String(values.years));
  await page.getByLabel('Papel en la plantilla').selectOption(values.role);
}
async function advanceBrowserTo(page, date, section = 'Ojeadores') {
  for (let turns = 0; turns < 40; turns++) {
    const current = await read(page);
    if (current.date === date) return current;
    assert.ok(current.date < date, 'UI cannot overshoot the requested date');
    if (current.restDays === 0) {
      await nav(page, 'Despacho');
      await button(page, 'Simulación rápida').click();
      await nav(page, section);
    } else {
      const delta = Math.round((Date.parse(date) - Date.parse(current.date)) / 86400000);
      await button(page, delta >= 7 ? 'Avanzar siete días' : 'Avanzar un día').click();
    }
  }
  throw new Error('Calendar UI did not reach requested day within its bounded steps');
}

if (process.argv.includes('--phone-capture-only')) {
  try {
    const page = await pageFor({ width: 390, height: 844 });
    await importFixture(page, 'closed-agreement');
    await capture(page, 'phone-market');
    assert.deepEqual(errors, []);
    assert.deepEqual(consoleErrors, []);
    console.log(JSON.stringify({ capture: 'phone-market.png', errors, consoleErrors }));
  } finally { await browser.close(); }
  process.exit(0);
}

try {
  const desktop = await pageFor({ width: 1440, height: 1000 });
  await importFixture(desktop, 'winter');
  await selectTarget(desktop);
  await button(desktop, 'Consulta de disponibilidad').click();
  const inquiry = (await read(desktop)).negotiation;
  assert.equal(inquiry.stage, 'inquiry');
  await capture(desktop, 'desktop-inquiry', desktop.getByTestId('negotiation-desk'));
  await reloadAndContinue(desktop);
  assert.deepEqual((await read(desktop)).negotiation, inquiry, 'save/reload preserves the pending inquiry');
  await nav(desktop, 'Mercado');
  await advanceInquiry(desktop);
  const clubState = await read(desktop);
  await desktop.getByLabel('Oferta al club (€)', { exact: true }).fill(String(Math.ceil(clubState.budget * 2 / 1000) * 1000));
  await button(desktop, 'Presentar oferta al club').click();
  assert.deepEqual((await read(desktop)).negotiation, clubState.negotiation, 'an unaffordable offer cannot alter the deal');
  assert.equal((await read(desktop)).budget, clubState.budget);
  const lowFee = Math.floor(clubState.negotiation.askingFee * .85 / 1000) * 1000;
  await desktop.getByLabel('Oferta al club (€)', { exact: true }).fill(String(lowFee));
  await button(desktop, 'Presentar oferta al club').click();
  assert.equal((await read(desktop)).negotiation.status, 'counter', 'plausible lower offer obtains a club counteroffer');
  assert.ok(!(await read(desktop)).squad.some(player => player.id === target.id), 'club response does not transfer the player');
  await capture(desktop, 'desktop-club-counter', desktop.getByTestId('negotiation-desk'));
  await button(desktop, 'Aceptar contraoferta del club').click();
  assert.equal((await read(desktop)).negotiation.stage, 'contract');
  const contractBefore = (await read(desktop)).negotiation;
  await desktop.getByLabel('Salario semanal (€)', { exact: true }).fill('0');
  await button(desktop, 'Proponer contrato').click();
  assert.deepEqual((await read(desktop)).negotiation, contractBefore, 'invalid zero salary cannot submit a contract');
  assert.deepEqual(await desktop.getByLabel('Duración del contrato').evaluate(select => Array.from(select.options).map(option => option.value)), ['1','2','3','4','5']);
  const demand = contractBefore.demands;
  await fillContract(desktop, { ...demand, wage: Math.max(100, Math.floor(demand.wage * .85 / 100) * 100) });
  await button(desktop, 'Proponer contrato').click();
  assert.equal((await read(desktop)).negotiation.status, 'counter', 'player responds independently of the selling club');
  await capture(desktop, 'desktop-contract', desktop.getByTestId('negotiation-desk'));
  await button(desktop, 'Aceptar condiciones del jugador').click();
  const agreed = await read(desktop);
  assert.equal(agreed.negotiation.stage, 'agreed');
  const cost = agreed.negotiation.fee + agreed.negotiation.signingBonus;
  await button(desktop, 'Confirmar fichaje').click();
  const signed = await read(desktop);
  assert.ok(signed.squad.some(player => player.id === target.id), 'final confirmation registers the player in an open period');
  assert.equal(signed.budget, agreed.budget - cost, 'one fee and signing bonus are charged');
  assert.ok(!signed.negotiation);
  await reloadAndContinue(desktop);
  assert.equal((await read(desktop)).budget, signed.budget, 'reloading cannot double-charge the transfer');
  assert.ok((await read(desktop)).squad.some(player => player.id === target.id));
  checks.push('Inquiry, separate club/player counteroffers, invalid salary, contract, immediate registration and exact reload');

  await importFixture(desktop, 'initial');
  await selectTarget(desktop);
  await button(desktop, 'Consulta de disponibilidad').click();
  const cancelBudget = (await read(desktop)).budget;
  await button(desktop, 'Retirar negociación').click();
  const cancelled = await read(desktop);
  assert.ok(!cancelled.negotiation);
  assert.equal(cancelled.budget, cancelBudget);
  assert.ok(!cancelled.squad.some(player => player.id === target.id));
  checks.push('Withdrawing a negotiation neither spends money nor moves the player');

  await importFixture(desktop, 'closed');
  await selectTarget(desktop);
  await button(desktop, 'Consulta de disponibilidad').click();
  await advanceInquiry(desktop);
  const rejectedBudget = (await read(desktop)).budget;
  await desktop.getByLabel('Oferta al club (€)', { exact: true }).fill('0');
  await button(desktop, 'Presentar oferta al club').click();
  assert.equal((await read(desktop)).negotiation.stage, 'broken', 'a grossly inadequate fee ends the negotiation');
  assert.equal((await read(desktop)).budget, rejectedBudget);
  assert.ok(!(await read(desktop)).squad.some(player => player.id === target.id));
  await capture(desktop, 'desktop-rejected', desktop.getByTestId('negotiation-desk'));
  checks.push('Unfunded and unacceptable offers cannot spend money or register a footballer');

  await importFixture(desktop, 'closed-agreement');
  assert.equal((await read(desktop)).transferWindow.open, false);
  const beforePending = await read(desktop);
  await button(desktop, 'Confirmar fichaje').click();
  const afterPending = await read(desktop);
  assert.equal(afterPending.pendingTransfers.length, 1);
  assert.ok(!afterPending.squad.some(player => player.id === target.id));
  assert.equal(afterPending.budget, beforePending.budget, 'pending fee is reserved, not charged twice');
  assert.ok(afterPending.recruitmentFinances.reservedFees > 0);
  assert.ok(afterPending.recruitmentFinances.reservedWages > 0);
  await capture(desktop, 'desktop-pending');
  const pendingSnapshot = afterPending.pendingTransfers;
  await reloadAndContinue(desktop);
  assert.deepEqual((await read(desktop)).pendingTransfers, pendingSnapshot);
  await importFixture(desktop, 'arrival-eve');
  const arrivalBefore = await read(desktop);
  assert.equal(arrivalBefore.transferWindow.open, false);
  const arrivalAfter = await advanceBrowserTo(desktop, joinDate, 'Mercado');
  assert.equal(arrivalAfter.date, joinDate);
  assert.equal(arrivalAfter.transferWindow.open, true);
  assert.ok(arrivalAfter.squad.some(player => player.id === target.id));
  assert.equal(arrivalAfter.pendingTransfers.length, 0);
  assert.equal(arrivalAfter.recruitmentFinances.reservedFees, 0);
  await capture(desktop, 'desktop-winter-arrival');
  checks.push('Closed window permits a reserved agreement; January opens and registers it once on the agreed date');

  await importFixture(desktop, 'winter');
  await button(desktop, 'Ventas y ofertas').click();
  await desktop.getByLabel('Jugador a ofrecer').selectOption(salePlayer.id);
  await desktop.getByLabel('Precio de salida (€)', { exact: true }).fill(String(salePlayer.value));
  const saleBefore = await read(desktop);
  await button(desktop, 'Ofrecer en el mercado').click();
  const listing = (await read(desktop)).transferListings.find(item => item.playerId === salePlayer.id);
  assert.ok(listing && !listing.responded);
  assert.equal((await read(desktop)).budget, saleBefore.budget, 'listing a player is not a completed sale');
  assert.equal(await desktop.getByLabel('Precio de salida (€)', { exact: true }).inputValue(), '', 'listing a player clears his previous asking price');
  const nextListedId = await desktop.getByLabel('Jugador a ofrecer').inputValue();
  const nextListedPlayer = winter.world.players.find(player => player.id === nextListedId);
  assert.ok(nextListedPlayer && nextListedId !== salePlayer.id);
  assert.equal(await desktop.getByLabel('Precio de salida (€)', { exact: true }).getAttribute('placeholder'), String(Math.round(nextListedPlayer.value)), 'new suggested price belongs to the next selected player');
  await advanceBrowserTo(desktop, listing.responseDate, 'Mercado');
  const offer = (await read(desktop)).transferOffers.find(item => item.playerId === salePlayer.id && item.status === 'pending');
  assert.ok(offer, 'buyer responds after the advertised delay');
  const saleCard = desktop.locator('.fm-sale-offer').filter({ hasText: salePlayer.name }).first();
  const counterFee = Math.min(offer.maxFee, offer.fee + 1000);
  await saleCard.getByLabel('Tu contraoferta (€)', { exact: true }).fill(String(counterFee));
  await saleCard.getByRole('button', { name: 'Contraofertar venta', exact: true }).click();
  assert.equal((await read(desktop)).transferOffers.find(item => item.id === offer.id).status, 'counter');
  await capture(desktop, 'desktop-sale-counter', saleCard);
  const acceptedSaleBefore = await read(desktop);
  await saleCard.getByRole('button', { name: 'Aceptar venta', exact: true }).click();
  const acceptedSale = await read(desktop);
  assert.ok(!acceptedSale.squad.some(player => player.id === salePlayer.id));
  assert.equal(acceptedSale.budget, acceptedSaleBefore.budget + counterFee);
  assert.equal(acceptedSale.transferOffers.find(item => item.id === offer.id).status, 'accepted');
  await reloadAndContinue(desktop);
  assert.equal((await read(desktop)).budget, acceptedSale.budget);
  checks.push('Transfer listing, delayed genuine buyer, counteroffer, completed sale and one-time income');

  await importFixture(desktop, 'initial', 'Ojeadores');
  await desktop.getByRole('group', { name: 'Nivel de la red de ojeo', exact: true }).getByRole('button', { name: /Red de élite/ }).click();
  await desktop.getByLabel('Nacionalidad del jugador').selectOption('ESP');
  await desktop.getByLabel('Posición buscada').selectOption('MF');
  await desktop.getByLabel('Duración de la misión').selectOption('14');
  const scoutingBefore = await read(desktop);
  await desktop.getByRole('button', { name: /^Iniciar misión de ojeo/ }).click();
  const scoutingStart = await read(desktop), mission = scoutingStart.scoutMissions.at(-1);
  assert.ok(mission && mission.status === 'active');
  assert.equal(mission.level, 'elite');
  assert.equal(mission.duration, 14);
  assert.equal(mission.filters.country, 'ESP');
  assert.equal(mission.filters.position, 'MF');
  assert.equal(scoutingStart.budget, scoutingBefore.budget - mission.cost, 'mission paid once at dispatch');
  assert.equal(scoutingStart.scoutReports.length, 0, 'no instant completed reports');
  await capture(desktop, 'desktop-scout-mission', desktop.locator('.fm-scout-assignment').first());
  await button(desktop, 'Avanzar siete días').click();
  const partialScouting = await read(desktop);
  assert.ok(partialScouting.scoutReports.length > 0, 'reports arrive with calendar time');
  assert.ok(partialScouting.scoutReports.some(report => report.stage !== 'complete'));
  await capture(desktop, 'desktop-scout-progress', desktop.locator('.fm-scout-report').first());
  const completedScouting = await advanceBrowserTo(desktop, mission.endDate);
  assert.equal(completedScouting.scoutMissions.find(item => item.id === mission.id).status, 'complete');
  assert.ok(completedScouting.scoutReports.length > 0 && completedScouting.scoutReports.every(report => report.stage === 'complete'));
  for (const report of completedScouting.scoutReports) {
    const player = world.players.find(player => player.id === report.playerId);
    assert.equal(player.nationality, 'ESP');
    assert.equal(player.position, 'MF');
    assert.ok(report.age >= 16 && report.age <= 21);
    assert.ok(report.potentialMin <= report.potentialMax);
  }
  const reportCard = desktop.locator('.fm-scout-report').first();
  await reportCard.getByRole('button', { name: 'Seguir jugador', exact: true }).click();
  assert.ok((await read(desktop)).shortlist.includes(completedScouting.scoutReports[0].playerId));
  await capture(desktop, 'desktop-scout-complete', reportCard);
  const reportsBeforeReload = (await read(desktop)).scoutReports;
  await reloadAndContinue(desktop);
  assert.deepEqual((await read(desktop)).scoutReports, reportsBeforeReload);
  await nav(desktop, 'Ojeadores');
  await desktop.getByLabel('Objetivo del ojeo').selectOption('first-team');
  await desktop.getByLabel('Posición buscada').selectOption('all');
  await desktop.getByRole('button', { name: /^Iniciar misión de ojeo/ }).click();
  const cancelMissionBudget = (await read(desktop)).budget;
  await button(desktop, 'Cancelar misión').click();
  assert.equal((await read(desktop)).scoutMissions.at(-1).status, 'cancelled');
  assert.equal((await read(desktop)).budget, cancelMissionBudget, 'cancellation does not refund an already paid assignment');
  checks.push('Scouting filters, one-time cost, progressive reports, completion, shortlist, save replay and cancellation');

  const phone = await pageFor({ width: 390, height: 844 });
  await importFixture(phone, 'closed-agreement');
  await capture(phone, 'phone-market');
  await capture(phone, 'phone-contract', phone.getByTestId('negotiation-desk'));
  assert.ok(await button(phone, 'Confirmar fichaje').isEnabled());
  await button(phone, 'Retirar negociación').click();
  assert.ok(!(await read(phone)).negotiation);
  await importFixture(phone, 'scouting-complete', 'Ojeadores');
  await capture(phone, 'phone-scouting', phone.locator('.fm-scout-assignment').first());
  await capture(phone, 'phone-scout-report', phone.locator('.fm-scout-report').first());
  await phone.locator('.fm-scout-report').first().getByRole('button', { name: 'Seguir jugador', exact: true }).click();
  assert.ok((await read(phone)).shortlist.length > 0);
  await importFixture(phone, 'sale-offer');
  await button(phone, 'Ventas y ofertas').click();
  const phoneSaleCard = phone.locator('.fm-sale-offer').filter({ hasText: salePlayer.name }).first();
  await capture(phone, 'phone-sale-offer', phoneSaleCard);
  const rejectionIncome = (await read(phone)).budget;
  await phoneSaleCard.getByRole('button', { name: 'Rechazar oferta', exact: true }).click();
  assert.equal((await read(phone)).budget, rejectionIncome);
  assert.ok((await read(phone)).squad.some(player => player.id === salePlayer.id));
  checks.push('Phone: negotiation, cancellation and transfer calendar remain usable without horizontal overflow');
  assert.deepEqual(errors, [], 'no browser exceptions');
  assert.deepEqual(consoleErrors, [], 'no console errors');
  await fs.writeFile(`${output}/verification.json`, JSON.stringify({ checks, errors, consoleErrors, target: { id: target.id, name: target.name }, fixtures }, null, 2));
  console.log(JSON.stringify({ checks, errors, consoleErrors }));
} catch (error) {
  if (activePage) {
    await activePage.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {});
    await fs.writeFile(`${output}/failure-state.json`, JSON.stringify(await read(activePage).catch(() => ({})), null, 2));
  }
  await fs.writeFile(`${output}/verification.json`, JSON.stringify({ checks, errors, consoleErrors, failure: error.message }, null, 2));
  throw error;
} finally {
  await browser.close();
}
