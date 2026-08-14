import { chromium } from "playwright";
import fs from "node:fs/promises";

const url = process.argv[2] ?? "http://127.0.0.1:4176/es/games/sports-trayectoria";
const out = "output/trayectoria-mobile-season-scroll";
await fs.mkdir(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(url, { waitUntil: "networkidle" });
await page.locator(".cookie-consent-primary").click().catch(() => {});
await page.evaluate(() => {
  const camera = document.querySelector(".launch-body");
  window.__trajectoryScrollCalls = [];
  const scrollTo = camera.scrollTo.bind(camera);
  camera.scrollTo = (...args) => {
    window.__trajectoryScrollCalls.push(args[0]);
    return scrollTo(...args);
  };
});
await page.locator(".tr-setup button[type=submit]").click();

let seasonMetrics = null;
let marketMetrics = null;
let negotiationMetrics = null;
let marketScrollCallStart = 0;
let negotiationScrollCallStart = 0;
for (let guard = 0; guard < 420 && !negotiationMetrics; guard += 1) {
  const state = JSON.parse(
    await page.evaluate(() => window.render_game_to_text?.() ?? '{"mode":"unknown"}'),
  );

  if (state.mode === "youth") {
    await page.locator(".tr-offer .tr-btn--primary").first().click();
  } else if (state.mode === "negotiation") {
    if (marketMetrics) {
      await page.waitForTimeout(900);
      negotiationMetrics = await page.evaluate((callStart) => {
        const target = document.querySelector(".tr-talks__room");
        const camera = target?.closest(".launch-body");
        if (!target || !camera) return null;
        const targetBox = target.getBoundingClientRect();
        const cameraBox = camera.getBoundingClientRect();
        return {
          scrollTop: camera.scrollTop,
          topInsideCamera: targetBox.top - cameraBox.top,
          scrollCalls: window.__trajectoryScrollCalls.slice(callStart),
        };
      }, negotiationScrollCallStart);
      await page.locator(".launch-body").screenshot({
        path: `${out}/negotiation-start-in-camera.png`,
      });
    } else {
      await page.locator(".tr-talks__actions .tr-btn--primary").click();
    }
  } else if (state.mode === "signing") {
    await page.locator(".tr-sign .tr-btn--primary").click();
  } else if (state.mode === "event") {
    await page.locator(".tr-option").first().click();
  } else if (state.mode === "match") {
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
    else await page.waitForTimeout(120);
  } else if (state.mode === "season") {
    for (let ceremonyGuard = 0; ceremonyGuard < 8; ceremonyGuard += 1) {
      const overlay = page.locator(".tr-ceremony, .tr-drop, .tr-growth").first();
      if (!(await overlay.count())) break;
      await overlay.click({ position: { x: 10, y: 10 } });
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(900);

    seasonMetrics = await page.evaluate(() => {
      const stats = document.querySelector(".tr-front__stats");
      const phone = stats
        ?.closest(".trayectoria-mobile-host")
        ?.closest(".launch-overlay--device-phone");
      const camera = stats?.closest(".launch-body");
      if (!stats || !camera) return null;
      const statsBox = stats.getBoundingClientRect();
      const cameraBox = camera.getBoundingClientRect();
      return {
        phoneShell: Boolean(phone),
        scrollTop: camera.scrollTop,
        statsTopInsideCamera: statsBox.top - cameraBox.top,
        statsBottomInsideCamera: statsBox.bottom - cameraBox.top,
        cameraHeight: camera.clientHeight,
        labels: [...stats.querySelectorAll("dt")].map((node) => node.textContent.trim()),
        scrollCalls: window.__trajectoryScrollCalls,
      };
    });
    await page.locator(".launch-body").screenshot({
      path: `${out}/season-stats-in-camera.png`,
    });
    marketScrollCallStart = await page.evaluate(() => window.__trajectoryScrollCalls.length);
    await page.locator(".tr-stage > .tr-btn--primary").last().click();
  } else if (state.mode === "market") {
    await page.waitForTimeout(900);
    marketMetrics = await page.evaluate((callStart) => {
      const target = document.querySelector(".tr-stage__head");
      const phone = target
        ?.closest(".trayectoria-mobile-host")
        ?.closest(".launch-overlay--device-phone");
      const camera = target?.closest(".launch-body");
      if (!target || !camera) return null;
      const targetBox = target.getBoundingClientRect();
      const cameraBox = camera.getBoundingClientRect();
      return {
        phoneShell: Boolean(phone),
        scrollTop: camera.scrollTop,
        topInsideCamera: targetBox.top - cameraBox.top,
        bottomInsideCamera: targetBox.bottom - cameraBox.top,
        cameraHeight: camera.clientHeight,
        heading: target.textContent.trim(),
        scrollCalls: window.__trajectoryScrollCalls.slice(callStart),
      };
    }, marketScrollCallStart);
    await page.locator(".launch-body").screenshot({
      path: `${out}/market-start-in-camera.png`,
    });
    negotiationScrollCallStart = await page.evaluate(() => window.__trajectoryScrollCalls.length);
    await page.locator(".tr-offer .tr-btn--primary").first().click();
  } else {
    await page.waitForTimeout(100);
  }
}

await fs.writeFile(
  `${out}/result.json`,
  JSON.stringify({ seasonMetrics, marketMetrics, negotiationMetrics, errors }, null, 2),
);
await browser.close();

const statsVisible =
  seasonMetrics &&
  seasonMetrics.phoneShell &&
  seasonMetrics.scrollCalls.some((call) => call?.behavior === "smooth") &&
  seasonMetrics.statsTopInsideCamera >= -16 &&
  seasonMetrics.statsBottomInsideCamera <= seasonMetrics.cameraHeight;
const marketVisible =
  marketMetrics &&
  marketMetrics.phoneShell &&
  marketMetrics.scrollCalls.some((call) => call?.behavior === "smooth") &&
  marketMetrics.topInsideCamera >= -16 &&
  marketMetrics.bottomInsideCamera <= marketMetrics.cameraHeight;
const negotiationVisible =
  negotiationMetrics &&
  negotiationMetrics.scrollCalls.some((call) => call?.behavior === "smooth") &&
  negotiationMetrics.topInsideCamera >= -16;
if (!statsVisible || !marketVisible || !negotiationVisible || errors.length) {
  throw new Error(JSON.stringify({ seasonMetrics, marketMetrics, negotiationMetrics, errors }, null, 2));
}
console.log(JSON.stringify({ seasonMetrics, marketMetrics, negotiationMetrics }));
