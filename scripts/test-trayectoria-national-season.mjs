import { chromium } from "playwright";
import fs from "node:fs/promises";

const url = process.argv[2] ?? "http://127.0.0.1:4175/es/games/sports-trayectoria";
const out = "output/trayectoria-national-season";
await fs.mkdir(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(url, { waitUntil: "networkidle" });
await page.locator(".cookie-consent-primary").click().catch(() => {});
await page.locator(".tr-setup button[type=submit]").click();

let captured = null;
for (let guard = 0; guard < 1800 && !captured; guard += 1) {
  const state = JSON.parse(await page.evaluate(() => window.render_game_to_text?.() ?? '{}'));

  if (state.mode === "youth") await page.locator(".tr-offer .tr-btn--primary").first().click();
  else if (state.mode === "negotiation") await page.locator(".tr-talks__actions .tr-btn--primary").click();
  else if (state.mode === "signing") await page.locator(".tr-sign .tr-btn--primary").click();
  else if (state.mode === "event") await page.locator(".tr-option").first().click();
  else if (state.mode === "match") {
    if (await page.locator(".tr-live").count()) {
      const skip = page.locator(".tr-live__skip");
      if (await skip.count()) await skip.click();
    }
    const shot = page.locator(".tr-shot:not([disabled])").first();
    const chance = page.locator(".tr-chance__track").first();
    const next = page.locator(".tr-match__result .tr-btn--primary");
    if (await shot.count()) await shot.click();
    else if (await chance.count()) await chance.click({ position: { x: 45, y: 20 } });
    else if (await next.count()) await next.click();
    else await page.waitForTimeout(180);
  } else if (state.mode === "season") {
    await page.waitForTimeout(2600);
    const settled = JSON.parse(await page.evaluate(() => window.render_game_to_text?.() ?? '{}'));
    const national = settled.seasonReport?.find((season) => season.national)?.national ?? null;
    if (national && await page.locator(".tr-front__note--national").count()) {
      await page.locator(".tr-front").first().screenshot({ path: `${out}/desktop.png` });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator(".tr-front__note--national").first().scrollIntoViewIfNeeded();
      await page.locator(".tr-front__note--national").first().screenshot({ path: `${out}/mobile-block.png` });
      captured = national;
    } else {
      await page.locator(".tr-stage > .tr-btn--primary").last().click();
    }
  } else if (state.mode === "market") {
    const nationality = page.locator(".tr-nationality .tr-chip").last();
    const clause = page.locator(".tr-clause__actions .tr-btn").last();
    if (await nationality.count()) await nationality.click();
    else if (await clause.count()) await clause.click();
    else await page.locator(".tr-offer .tr-btn--primary").first().click();
  } else await page.waitForTimeout(100);
}

await fs.writeFile(`${out}/state.json`, JSON.stringify({ captured, errors }, null, 2));
await browser.close();
if (!captured || errors.length) throw new Error(JSON.stringify({ captured, errors }, null, 2));
console.log(JSON.stringify(captured));
