import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const base = process.env.MANAGER_TEST_URL || 'http://127.0.0.1:5198';
const output = 'output/manager-global/browser';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [], report = [];
const hash = text => createHash('sha256').update(text).digest('hex');
async function open(viewport) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => localStorage.setItem('playforge.cookieConsent.v1', JSON.stringify({ version: 1, decided: true, updatedAt: new Date().toISOString(), preferences: { necessary: true } })));
  const page = await context.newPage(); page.setDefaultTimeout(180000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/es/games/sports-manager`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Nueva carrera', exact: true }).waitFor();
  return { page, context };
}
try {
  const { page, context } = await open({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Nueva carrera', exact: true }).click();
  const seasons = page.getByLabel('Todas las temporadas del histórico');
  const labels = () => page.locator('.mg-era-cards b').allTextContents();
  assert.deepEqual(await labels(), ['2026/27', '2025/26', '2024/25', '2023/24', '2022/23']);
  await seasons.selectOption('1999');
  assert.deepEqual(await labels(), ['1999/00', '1998/99', '1997/98', '1996/97', '1995/96']);
  await page.locator('.mg-era-cards button').nth(1).click();
  assert.deepEqual(await labels(), ['1998/99', '1997/98', '1996/97', '1995/96', '1994/95']);
  await seasons.selectOption('1990'); assert.deepEqual(await labels(), ['1990/91']);
  await seasons.selectOption('1999');
  await page.screenshot({ path: `${output}/seasons-desktop.png` });
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.getByRole('button', { name: 'CONMEBOL', exact: true }).click();
  await page.locator('.mg-league-card').filter({ hasText: 'Liga Profesional' }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  assert.equal(await page.locator('.mg-club-tile').count(), 20);
  await page.locator('.mg-club-tile').filter({ hasText: 'Boca' }).click();
  const coverage = await page.locator('.mg-roster-coverage').textContent();
  assert.ok(Number(/(\d+)\s*jugadores reales/.exec(coverage)?.[1]) > 0, coverage);
  await page.waitForFunction(() => [...document.querySelectorAll('.mg-club-tile img')].every(image => image.complete && image.naturalWidth > 0));
  await page.screenshot({ path: `${output}/argentina-1999.png` });
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.getByPlaceholder('Tu nombre', { exact: true }).fill('Carrera portable');
  await page.getByRole('button', { name: 'Firmar contrato', exact: true }).click();
  await page.getByRole('button', { name: '¡A trabajar!', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar y exportar código', exact: true }).click();
  const codeBox = page.getByLabel('Código de exportación', { exact: true });
  await codeBox.waitFor(); const code = await codeBox.inputValue();
  const original = await page.evaluate(() => JSON.stringify({ ...window.__managerDebug.career(), flags: { ...window.__managerDebug.career().flags, stops: [] } }));
  assert.ok(code.startsWith('GLM3.'));
  await page.screenshot({ path: `${output}/export-desktop.png` });
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar archivo', exact: true }).click();
  const download = await downloadEvent; await download.saveAs(`${output}/${download.suggestedFilename()}`);
  const size = (await fs.stat(`${output}/${download.suggestedFilename()}`)).size;
  report.push({ case: 'initial-export', jsonBytes: Buffer.byteLength(original), compressedBytes: size, codeCharacters: code.length, hash: hash(original) });

  // Another browser context has neither the original IndexedDB nor localStorage.
  const { page: mobile, context: otherContext } = await open({ width: 390, height: 844 });
  assert.equal(await mobile.getByRole('button', { name: /Continuar carrera/ }).count(), 0);
  await mobile.getByRole('button', { name: 'Importar partida', exact: true }).click();
  await mobile.getByLabel('Código de exportación', { exact: true }).fill(code);
  await mobile.getByRole('button', { name: 'Continuar con este código', exact: true }).click();
  await mobile.locator('.mg-hub').waitFor();
  const restored = await mobile.evaluate(() => JSON.stringify({ ...window.__managerDebug.career(), flags: { ...window.__managerDebug.career().flags, stops: [] } }));
  assert.equal(hash(restored), hash(original));
  await mobile.screenshot({ path: `${output}/import-mobile.png` });
  const live = await mobile.evaluate(async () => {
    const engine = await import('/src/games/sports/manager/career/career.js');
    const { advanceMatch } = await import('/src/games/sports/manager/career/match.js');
    const { saveCareer, prepareExport } = await import('/src/games/sports/manager/career/save.js');
    const career = window.__managerDebug.career();
    const fixture = Object.values(career.season.fixtures).find(f => f.home === career.clubId || f.away === career.clubId);
    career.date = fixture.date;
    engine.startUserMatch(career, fixture.id);
    career.live = advanceMatch(career.live, 37, { ignorePauses: true });
    await saveCareer(career);
    const transfer = await prepareExport(career);
    return { code: transfer.code, id: career.live.id, clock: career.live.clock, match: JSON.stringify(career.live) };
  });
  await fs.writeFile(`${output}/live-code.txt`, live.code);
  // Reload compressed IndexedDB, then import the in-progress match in a clean context.
  await mobile.reload({ waitUntil: 'domcontentloaded' });
  await mobile.getByRole('button', { name: /Continuar carrera/ }).click();
  await mobile.waitForFunction(() => window.__managerDebug?.career()?.live?.clock === 37);
  assert.equal(await mobile.locator('.mg-scorebug__clock').textContent(), "37'");
  const { page: third, context: thirdContext } = await open({ width: 1280, height: 900 });
  await third.getByRole('button', { name: 'Importar partida', exact: true }).click();
  await third.getByLabel('Código de exportación', { exact: true }).fill(live.code);
  await third.getByRole('button', { name: 'Continuar con este código', exact: true }).click();
  await third.waitForFunction(id => window.__managerDebug?.career()?.live?.id === id, live.id);
  await third.locator('.mg-scorebug__clock').waitFor();
  assert.equal(await third.locator('.mg-scorebug__clock').textContent(), "37'");
  assert.equal(await third.getByRole('button', { name: 'Comenzar partido', exact: true }).count(), 0);
  assert.equal(await third.evaluate(() => JSON.stringify(window.__managerDebug.career().live)), live.match);
  await third.screenshot({ path: `${output}/live-match-restored.png` });
  report.push({ case: 'new-device-exact-restore', passed: true }, { case: 'compressed-indexeddb-and-live-match', passed: true });

  // Sequential writes must leave the newest state, even with differing sizes.
  const queueResult = await page.evaluate(async () => {
    const { saveCareer, loadCareer, loadSummary } = await import('/src/games/sports/manager/career/save.js');
    const career = window.__managerDebug.career();
    career.managerName = 'First'; const first = saveCareer(career);
    career.managerName = 'Last'; const last = saveCareer(career);
    await Promise.all([first, last]);
    return { manager: (await loadCareer()).career.managerName, summary: (await loadSummary()).manager };
  });
  assert.deepEqual(queueResult, { manager: 'Last', summary: 'Last' });
  report.push({ case: 'ordered-autosaves', passed: true });
  assert.deepEqual(errors, []);
  await fs.writeFile(`${output}/report.json`, JSON.stringify({ report, errors }, null, 2));
  await thirdContext.close(); await otherContext.close(); await context.close();
  console.log(JSON.stringify({ report, errors }, null, 2));
} finally { await browser.close(); }
