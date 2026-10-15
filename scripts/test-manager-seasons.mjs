import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.MANAGER_TEST_URL || 'http://127.0.0.1:5196';
const output = 'output/manager-2026/browser';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const reports = [];
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    await context.addInitScript(() => localStorage.setItem('playforge.cookieConsent.v1', JSON.stringify({
      version: 1, decided: true, updatedAt: new Date().toISOString(), preferences: { necessary: true },
    })));
    const page = await context.newPage();
    page.setDefaultTimeout(180000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/es/games/sports-manager`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Nueva carrera', exact: true }).click();
    const seasons = page.getByLabel('Todas las temporadas del histórico');
    await seasons.waitFor();
    assert.equal(await seasons.inputValue(), '2026');
    assert.equal(await seasons.locator('option').count(), 37);
    assert.equal(await seasons.locator('option').first().textContent(), '2026/27');
    assert.equal(await seasons.locator('option').last().textContent(), '1990/91');
    await seasons.selectOption('2001');
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await page.locator('.mg-league-card').filter({ has: page.getByText('LaLiga', { exact: true }) }).click();
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await page.locator('.mg-club-tile').filter({ hasText: 'Barcelona' }).click();
    await page.getByRole('button', { name: 'Atrás', exact: true }).click();
    await page.getByRole('button', { name: 'Atrás', exact: true }).click();
    await seasons.selectOption('2026');
    await page.screenshot({ path: `${output}/seasons-${viewport.width}.png` });
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Siguiente', exact: true }).isDisabled(), true);
    assert.equal(await page.locator('.mg-league-card.is-active').count(), 0);
    await page.locator('.mg-league-card').filter({ has: page.getByText('LaLiga', { exact: true }) }).click();
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    assert.equal(await page.locator('.mg-club-tile.is-active').count(), 0);
    await page.locator('.mg-club-tile').filter({ hasText: 'Barcelona' }).click();
    const coverage = await page.locator('.mg-roster-coverage').textContent();
    assert.match(coverage, /[1-9]\d* jugadores reales/);
    await page.screenshot({ path: `${output}/club-${viewport.width}.png` });
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await page.getByPlaceholder('Tu nombre').fill('Prueba temporadas');
    await page.getByRole('button', { name: 'Firmar contrato', exact: true }).click();
    await page.locator('.mg-root.is-hub').waitFor();
    const state = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
    assert.equal(state.mode, 'manager');
    assert.match(state.date, /^2026-/);
    assert.match(state.club, /Barcelona/);
    await page.screenshot({ path: `${output}/career-${viewport.width}.png` });
    // Persist and restore through the same flow as a real user.
    await page.waitForTimeout(2500);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.mg-save-card').click();
    await page.locator('.mg-root.is-hub').waitFor();
    const restored = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
    assert.equal(restored.club, state.club);
    assert.equal(restored.date, state.date);
    assert.deepEqual(errors, []);
    reports.push({ viewport, seasons: 37, nonFeaturedYear: 2001, coverage, state, restored, errors });
    await context.close();
  }
  await fs.writeFile(`${output}/report.json`, JSON.stringify(reports, null, 2));
  console.log(JSON.stringify(reports, null, 2));
} finally { await browser.close(); }
