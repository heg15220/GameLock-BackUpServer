import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base = process.argv[2] || 'http://127.0.0.1:5192';
const output = process.argv[3] || 'output/manager-v4/live';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
const checks = [];
const read = (page) => page.evaluate(() => JSON.parse(window.render_game_to_text()));
async function capture(page, name) {
  await page.locator('.launch-body').evaluate((node) => { node.scrollTop = 0; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${output}/${name}.png` });
  const dimensions = await page.locator('.fm-game').evaluate((node) => ({ client: node.clientWidth, scroll: node.scrollWidth }));
  assert.ok(dimensions.scroll <= dimensions.client + 1, `${name}: horizontal overflow`);
}
async function start(viewport, year = 2013) {
  const page = await browser.newPage({ viewport, isMobile: viewport.width < 600, hasTouch: viewport.width < 1100, reducedMotion: viewport.width < 600 ? 'reduce' : 'no-preference' });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${base}/es/games/sports-manager`, { waitUntil: 'networkidle' });
  const cookie = page.locator('.cookie-consent-primary');
  if (await cookie.isVisible()) await cookie.click();
  await page.getByLabel('Temporada inicial').selectOption(String(year));
  await page.getByLabel('Tu club', { exact: true }).selectOption('real-madrid');
  await page.locator('.fm-start').click();
  await page.locator('.fm-career').waitFor();
  return page;
}
async function changeTactics(page) {
  const before = (await read(page)).activeMatch;
  await page.getByLabel('Formación en el partido', { exact: true }).selectOption('3-5-2');
  await page.getByLabel('Mentalidad en el partido', { exact: true }).selectOption('attacking');
  await page.getByRole('group', { name: 'Presión en el partido', exact: true }).getByRole('button', { name: 'Alta', exact: true }).click();
  const apply = page.getByRole('button', { name: /Aplicar táctica/ });
  if (await apply.count()) await apply.click();
  const after = (await read(page)).activeMatch;
  assert.equal(after.tactics.formation, '3-5-2');
  assert.equal(after.tactics.mentality, 'attacking');
  assert.equal(after.tactics.pressing, 'high');
  assert.equal(after.minute, before.minute);
  assert.equal(after.homeGoals, before.homeGoals);
  assert.equal(after.awayGoals, before.awayGoals);
  assert.deepEqual(after.events.slice(0, before.events.length), before.events, 'coaching cannot rewrite events already played');
}
async function substitute(page) {
  const current = await read(page);
  const active = current.activeMatch;
  const players = new Map(current.squad.map((p) => [p.id, p]));
  const starters = active[`${active.ownSide}Lineup`];
  const bench = active[`${active.ownSide}Bench`];
  const outId = starters.find((id) => players.get(id)?.position !== 'GK' && bench.some((candidate) => players.get(candidate)?.position === players.get(id)?.position));
  const inId = bench.find((id) => players.get(id)?.position === players.get(outId)?.position);
  assert.ok(outId && inId, 'an eligible outfield substitution exists');
  await page.getByLabel('Jugador que sale', { exact: true }).selectOption(outId);
  await page.getByLabel('Jugador que entra', { exact: true }).selectOption(inId);
  await page.getByRole('button', { name: 'Confirmar cambio', exact: true }).click();
  const next = (await read(page)).activeMatch;
  assert.ok(!next[`${next.ownSide}Lineup`].includes(outId));
  assert.ok(next[`${next.ownSide}Lineup`].includes(inId));
  assert.ok(!next[`${next.ownSide}Bench`].includes(outId), 'no reentry');
  assert.equal(next.minute, active.minute);
  await page.waitForTimeout(750); // Observe the completed kit/formation transition as well as the state.
  return { outId, inId, minute: active.minute };
}

try {
  const desktop = await start({ width: 1440, height: 1000 });
  await capture(desktop, 'desktop-office');
  await desktop.getByRole('button', { name: 'Dirigir partido', exact: true }).click();
  assert.equal((await read(desktop)).activeMatch.minute, 0);
  await desktop.getByRole('button', { name: /Siguientes 15 minutos/ }).click();
  await desktop.getByRole('button', { name: /Siguientes 15 minutos/ }).click();
  assert.equal((await read(desktop)).activeMatch.minute, 30);
  await desktop.getByRole('checkbox', { name: /Cambios automáticos del asistente/ }).uncheck();
  assert.equal((await read(desktop)).activeMatch.autoSubstitutions, false);
  await changeTactics(desktop);
  await desktop.getByRole('navigation', { name: 'Accesos al banquillo', exact: true }).getByRole('button', { name: /^Cambios/ }).click();
  const choice = await read(desktop);
  const goalkeeper = choice.squad.find((p) => p.selected && p.position === 'GK');
  const outfieldReserve = choice.squad.find((p) => choice.activeMatch[`${choice.activeMatch.ownSide}Bench`].includes(p.id) && p.position !== 'GK');
  await desktop.getByLabel('Jugador que sale', { exact: true }).selectOption(goalkeeper.id);
  await desktop.getByLabel('Jugador que entra', { exact: true }).selectOption(outfieldReserve.id);
  assert.ok(await desktop.getByRole('button', { name: 'Confirmar cambio', exact: true }).isDisabled(), 'a goalkeeper cannot be replaced by an outfield player');
  const change = await substitute(desktop);
  await capture(desktop, 'desktop-coaching');
  const savePoint = (await read(desktop)).activeMatch;
  await desktop.reload({ waitUntil: 'networkidle' });
  await desktop.getByRole('button', { name: /Continuar partida/ }).click();
  assert.deepEqual((await read(desktop)).activeMatch, savePoint, 'reload preserves match decisions and the already played part');
  await desktop.getByRole('button', { name: /Siguientes 15 minutos/ }).click();
  assert.equal((await read(desktop)).activeMatch.minute, 45);
  await capture(desktop, 'desktop-halftime');
  await desktop.getByRole('button', { name: /^Reproducir/ }).click();
  await desktop.waitForFunction(() => JSON.parse(window.render_game_to_text()).activeMatch.minute > 45);
  await desktop.getByRole('button', { name: /^Pausar/ }).click();
  const pausedMinute = (await read(desktop)).activeMatch.minute;
  await desktop.waitForTimeout(1500);
  assert.equal((await read(desktop)).activeMatch.minute, pausedMinute, 'pause stops playback');
  await desktop.getByRole('button', { name: 'Ver resultado', exact: true }).click();
  const completed = await read(desktop);
  assert.equal(completed.activeMatch, null);
  assert.equal(completed.round, 1);
  assert.equal(completed.squad.find((p) => p.id === change.outId).minutes, change.minute);
  assert.ok(completed.squad.find((p) => p.id === change.inId).minutes > 0);
  await capture(desktop, 'desktop-result');
  checks.push('Desktop: tactics affect remaining match, substitution, immutable past, save/reload, halftime, autoplay/pause, final minutes');
  await fs.writeFile(`${output}/desktop-final-state.json`, JSON.stringify(completed, null, 2));

  for (const [name, viewport] of [['phone', { width: 390, height: 844 }], ['tablet', { width: 820, height: 1180 }]]) {
    const page = await start(viewport, 2025);
    await page.getByRole('button', { name: 'Dirigir partido', exact: true }).click();
    await page.getByRole('button', { name: /Siguientes 15 minutos/ }).click();
    await changeTactics(page);
    await substitute(page);
    await capture(page, `${name}-match`);
    await page.getByLabel('Jugador que sale', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/${name}-bench.png` });
    await page.locator('.fm-tabs').getByRole('button', { name: 'Plantilla', exact: true }).click();
    await page.getByRole('button', { name: /Volver al banquillo/ }).click();
    assert.equal((await read(page)).activeMatch.minute, 15);
    await page.getByRole('button', { name: 'Ver resultado', exact: true }).click();
    assert.equal((await read(page)).round, 1);
    checks.push(`${name}: responsive match, tactics, substitutions, section switching and completion`);
    await page.close();
  }
  assert.deepEqual(errors, [], 'No uncaught browser errors');
  await fs.writeFile(`${output}/verification.json`, JSON.stringify({ checks, errors }, null, 2));
  console.log(JSON.stringify({ checks, errors }));
} catch (error) {
  const page = browser.contexts().at(-1)?.pages().at(-1);
  if (page) {
    await page.screenshot({ path: `${output}/failure.png` }).catch(() => {});
    await fs.writeFile(`${output}/failure-state.json`, JSON.stringify(await read(page).catch(() => ({})), null, 2));
  }
  await fs.writeFile(`${output}/failure.json`, JSON.stringify({ message: error.message, stack: error.stack, errors }, null, 2));
  throw error;
} finally {
  await browser.close();
}
