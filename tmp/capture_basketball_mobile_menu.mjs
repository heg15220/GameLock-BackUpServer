import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const outDir = path.resolve('output/basketball-court-mobile-menu');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

try {
  await page.goto('http://127.0.0.1:4179/index.html#game=sports-basketball-court', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas.basketball-court-canvas', { timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, 'full-mobile.png'), fullPage: true });
  await page.locator('.basketball-court-stage').screenshot({ path: path.join(outDir, 'stage-mobile.png') });
  await page.locator('canvas.basketball-court-canvas').screenshot({ path: path.join(outDir, 'canvas-mobile.png') });
} finally {
  await browser.close();
}
