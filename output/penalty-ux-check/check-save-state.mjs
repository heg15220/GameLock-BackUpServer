import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const outputDir = "C:/Users/hugoe/Downloads/plataforma-juegos-saas/output/penalty-ux-check/manual";
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader"],
});

const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

try {
  await page.goto("http://127.0.0.1:4173/#game=arcade-penalty-neural-keeper", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("#penalty-start-btn", { timeout: 10000 });
  await page.click("#penalty-start-btn");

  await page.waitForFunction(() => {
    if (typeof window.render_game_to_text !== "function") {
      return false;
    }
    const state = JSON.parse(window.render_game_to_text());
    return state.phase === "ready" && state.turnMode === "attack";
  });

  await page.click("#penalty-zone-down-left");

  await page.waitForFunction(() => {
    if (typeof window.render_game_to_text !== "function") {
      return false;
    }
    const state = JSON.parse(window.render_game_to_text());
    return state.phase === "ready" && state.turnMode === "save";
  }, { timeout: 10000 });

  const state = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const roleText = await page.locator(".penalty-role-copy").textContent();
  const controlLabels = await page.locator(".penalty-zone-grid button").allTextContents();

  await page.screenshot({
    path: path.join(outputDir, "save-state.png"),
    fullPage: true,
  });
  fs.writeFileSync(path.join(outputDir, "save-state.json"), JSON.stringify({
    state,
    roleText,
    controlLabels,
  }, null, 2));
} finally {
  await browser.close();
}
