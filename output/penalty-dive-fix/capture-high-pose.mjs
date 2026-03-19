import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = "C:/Users/hugoe/Downloads/plataforma-juegos-saas";
const OUT_DIR = path.join(ROOT, "output", "penalty-dive-fix", "probe-high");
fs.mkdirSync(OUT_DIR, { recursive: true });

async function getState(page) {
  return page.evaluate(() => {
    if (typeof window.render_game_to_text !== "function") return null;
    try { return JSON.parse(window.render_game_to_text()); } catch { return null; }
  });
}

async function waitForState(page, predicate, timeoutMs = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = await getState(page);
    if (state && predicate(state)) return state;
    await page.waitForTimeout(50);
  }
  throw new Error("Timeout waiting for state");
}

const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

try {
  await page.goto("http://127.0.0.1:4173/#game=arcade-penalty-neural-keeper", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);

  await page.waitForFunction(() => {
    const byId = document.querySelector("#penalty-start-btn");
    return !!byId && !byId.disabled;
  }, { timeout: 12000 });
  await page.click("#penalty-start-btn", { force: true });

  await page.waitForSelector("#penalty-zone-top-left", { timeout: 12000 });

  let safety = 0;
  while (safety < 5) {
    let ready = await waitForState(page, (s) => s.phase === "ready", 25000);
    if (ready.turnMode === "save") break;

    await page.click("#penalty-zone-center");
    await waitForState(page, (s) => s.phase === "ready" && s.turnMode === "save", 25000);
    break;
  }

  await page.click("#penalty-zone-top-left");
  await waitForState(page, (s) => s.phase === "shot" && !!s.activeShot, 7000);
  let snapshot = await getState(page);
  for (let i = 0; i < 90; i += 1) {
    const current = await getState(page);
    if (!current || current.phase !== "shot" || !current.activeShot) {
      break;
    }
    snapshot = current;
    if (Math.abs((current.activeShot.keeper?.x ?? 540) - 540) > 18 || (current.activeShot.progress ?? 0) >= 0.42) {
      break;
    }
    await page.evaluate(async () => {
      if (typeof window.advanceTime === "function") {
        await window.advanceTime(1000 / 60);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 16));
    });
  }

  await page.screenshot({ path: path.join(OUT_DIR, "high-0.png"), fullPage: false });
  fs.writeFileSync(path.join(OUT_DIR, "high-0.json"), JSON.stringify(snapshot, null, 2));
} finally {
  await browser.close();
}
