import { chromium } from "playwright";
import fs from "node:fs/promises";

const url = process.argv[2] ?? "http://127.0.0.1:4176/es/games/sports-trayectoria";
const out = "output/trayectoria-tablet-view";
await fs.mkdir(out, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function runJourney(name, viewport) {
  const page = await browser.newPage({
    viewport,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator(".cookie-consent-primary").click().catch(() => {});
  await page.locator(".tr-setup").waitFor();

  const setup = await page.evaluate(() => {
    const host = document.querySelector(".trayectoria-mobile-host--tablet");
    const shell = host?.querySelector(".tr-shell");
    const offers = host?.querySelector(".tr-setup__grid");
    return {
      nativeTablet: Boolean(host),
      device: host?.dataset.nativeDevice,
      orientation: host?.dataset.nativeOrientation,
      genericBezel: Boolean(document.querySelector(".playground-device-shell")),
      shellOverflow: shell ? shell.scrollWidth - shell.clientWidth : null,
      setupColumns: offers ? getComputedStyle(offers).gridTemplateColumns.split(" ").length : 0,
    };
  });
  await page.locator(".launch-body").screenshot({ path: `${out}/${name}-setup.png` });
  await page.locator(".tr-setup button[type=submit]").click();

  let season = null;
  let market = null;
  let negotiation = null;
  for (let guard = 0; guard < 420 && !negotiation; guard += 1) {
    const state = JSON.parse(
      await page.evaluate(() => window.render_game_to_text?.() ?? '{"mode":"unknown"}'),
    );

    if (state.mode === "youth") {
      await page.locator(".tr-offer .tr-btn--primary").first().click();
    } else if (state.mode === "negotiation") {
      if (market) {
        await page.waitForTimeout(900);
        negotiation = await page.evaluate(() => {
          const host = document.querySelector(".trayectoria-mobile-host--tablet");
          const talks = host?.querySelector(".tr-talks");
          const room = host?.querySelector(".tr-talks__room");
          const camera = host?.closest(".launch-body");
          const roomBox = room?.getBoundingClientRect();
          const cameraBox = camera?.getBoundingClientRect();
          return {
            columns: talks ? getComputedStyle(talks).gridTemplateColumns.split(" ").length : 0,
            topInsideCamera: roomBox && cameraBox ? roomBox.top - cameraBox.top : null,
            shellOverflow: host ? host.scrollWidth - host.clientWidth : null,
          };
        });
        await page.locator(".launch-body").screenshot({ path: `${out}/${name}-negotiation.png` });
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
      season = await page.evaluate(() => {
        const host = document.querySelector(".trayectoria-mobile-host--tablet");
        const lead = host?.querySelector(".tr-front__lead");
        const stats = host?.querySelector(".tr-front__stats");
        const camera = host?.closest(".launch-body");
        const statsBox = stats?.getBoundingClientRect();
        const cameraBox = camera?.getBoundingClientRect();
        return {
          leadColumns: lead ? getComputedStyle(lead).gridTemplateColumns.split(" ").length : 0,
          statColumns: stats ? getComputedStyle(stats).gridTemplateColumns.split(" ").length : 0,
          statsTopInsideCamera: statsBox && cameraBox ? statsBox.top - cameraBox.top : null,
          statsBottomInsideCamera: statsBox && cameraBox ? statsBox.bottom - cameraBox.top : null,
          cameraHeight: camera?.clientHeight ?? null,
          shellOverflow: host ? host.scrollWidth - host.clientWidth : null,
        };
      });
      await page.locator(".launch-body").screenshot({ path: `${out}/${name}-season.png` });
      await page.locator(".tr-stage > .tr-btn--primary").last().click();
    } else if (state.mode === "market") {
      await page.waitForTimeout(900);
      market = await page.evaluate(() => {
        const host = document.querySelector(".trayectoria-mobile-host--tablet");
        const offers = host?.querySelector(".tr-offers");
        const heading = host?.querySelector(".tr-stage__head");
        const camera = host?.closest(".launch-body");
        const headingBox = heading?.getBoundingClientRect();
        const cameraBox = camera?.getBoundingClientRect();
        return {
          offerColumns: offers ? getComputedStyle(offers).gridTemplateColumns.split(" ").length : 0,
          topInsideCamera: headingBox && cameraBox ? headingBox.top - cameraBox.top : null,
          shellOverflow: host ? host.scrollWidth - host.clientWidth : null,
        };
      });
      await page.locator(".launch-body").screenshot({ path: `${out}/${name}-market.png` });
      await page.locator(".tr-offer .tr-btn--primary").first().click();
    } else {
      await page.waitForTimeout(100);
    }
  }

  await page.close();
  return { setup, season, market, negotiation, errors };
}

const portrait = await runJourney("portrait", { width: 768, height: 1024 });
const landscape = await runJourney("landscape", { width: 1024, height: 768 });
const result = { portrait, landscape };
await fs.writeFile(`${out}/result.json`, JSON.stringify(result, null, 2));
await browser.close();

for (const [name, journey] of Object.entries(result)) {
  const expectedTalkColumns = name === "landscape" ? 2 : 1;
  const valid =
    journey.setup.nativeTablet &&
    journey.setup.device === "tablet" &&
    journey.setup.orientation === name &&
    !journey.setup.genericBezel &&
    journey.season?.leadColumns === 2 &&
    journey.season?.statColumns === 4 &&
    journey.market?.offerColumns === 2 &&
    journey.negotiation?.columns === expectedTalkColumns &&
    journey.season?.statsTopInsideCamera >= -16 &&
    journey.market?.topInsideCamera >= -16 &&
    journey.negotiation?.topInsideCamera >= -16 &&
    [journey.setup, journey.season, journey.market, journey.negotiation].every(
      (screen) => screen?.shellOverflow <= 1 || screen?.shellOverflow == null,
    ) &&
    journey.errors.length === 0;
  if (!valid) throw new Error(`${name}: ${JSON.stringify(journey, null, 2)}`);
}

console.log(JSON.stringify(result));
