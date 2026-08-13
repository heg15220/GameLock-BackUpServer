import { chromium } from "playwright";
import fs from "node:fs/promises";

const url = process.argv[2] ?? "http://127.0.0.1:4174/es/games/sports-trayectoria";
const out = "output/trayectoria-simulation-overhaul/directed";
await fs.mkdir(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push({ type: "console", text: message.text() });
});
page.on("pageerror", (error) => errors.push({ type: "page", text: error.message }));

await page.goto(url, { waitUntil: "networkidle" });
await page.locator(".cookie-consent-primary").click().catch(() => {});
await page.locator(".tr-setup button[type=submit]").click();

let liveCaptured = false;
let seasonCaptured = false;
for (let guard = 0; guard < 240 && !(seasonCaptured && liveCaptured); guard += 1) {
  const raw = await page.evaluate(() => window.render_game_to_text?.() ?? '{"mode":"unknown"}');
  const state = JSON.parse(raw);

  if (state.mode === "youth") {
    await page.locator(".tr-offer .tr-btn--primary").first().click();
  } else if (state.mode === "negotiation") {
    await page.locator(".tr-talks__actions .tr-btn--primary").click();
  } else if (state.mode === "signing") {
    await page.locator(".tr-sign .tr-btn--primary").click();
  } else if (state.mode === "event") {
    await page.locator(".tr-option").first().click();
  } else if (state.mode === "match") {
    if (await page.locator(".tr-live").count()) {
      const skip = page.locator(".tr-live__skip");
      if (await skip.count()) await skip.click();
      await page.waitForTimeout(180);
      if (!liveCaptured && await page.locator(".tr-live__beat").count()) {
        await page.locator(".tr-match").screenshot({ path: `${out}/live-match.png` });
        liveCaptured = true;
      }
    }

    const shot = page.locator(".tr-shot:not([disabled])").first();
    const chance = page.locator(".tr-chance__track").first();
    const next = page.locator(".tr-match__result .tr-btn--primary");
    if (await shot.count()) await shot.click();
    else if (await chance.count()) await chance.click({ position: { x: 45, y: 20 } });
    else if (await next.count()) await next.click();
    else await page.waitForTimeout(250);
  } else if (state.mode === "season") {
    await page.waitForTimeout(2200);
    if (!seasonCaptured) {
      await page.locator(".tr-front").first().screenshot({ path: `${out}/season-report.png` });
      seasonCaptured = true;
    }
    await page.locator(".tr-stage > .tr-btn--primary").last().click();
  } else if (state.mode === "market") {
    const nationality = page.locator(".tr-nationality .tr-chip").last();
    const clause = page.locator(".tr-clause__actions .tr-btn").last();
    if (await nationality.count()) await nationality.click();
    else if (await clause.count()) await clause.click();
    else await page.locator(".tr-offer .tr-btn--primary").first().click();
  } else {
    await page.waitForTimeout(100);
  }
}

const finalState = await page.evaluate(() => window.render_game_to_text?.() ?? null);
await fs.writeFile(`${out}/state.json`, finalState ?? "null");
await fs.writeFile(`${out}/errors.json`, JSON.stringify(errors, null, 2));
await browser.close();

const blockingErrors = errors.filter((error) => error.type === "page");
if (!liveCaptured || !seasonCaptured || blockingErrors.length) {
  throw new Error(JSON.stringify({ liveCaptured, seasonCaptured, errors: blockingErrors }, null, 2));
}
console.log(JSON.stringify({ liveCaptured, seasonCaptured, pageErrors: 0, resourceErrors: errors.length }));
