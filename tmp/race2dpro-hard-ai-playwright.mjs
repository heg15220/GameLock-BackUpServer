import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const outDir = "output/race2dpro-hard-ai-custom";
fs.mkdirSync(outDir, { recursive: true });
const log = (message) => fs.appendFileSync(path.join(outDir, "run.log"), `${new Date().toISOString()} ${message}\n`);

log("launching");
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader"],
  timeout: 15000,
});
log("launched");
const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push({ type: "console.error", text: msg.text() });
});
page.on("pageerror", (error) => errors.push({ type: "pageerror", text: String(error) }));

await page.goto("http://127.0.0.1:4178/#game=racing-race2dpro", { waitUntil: "domcontentloaded" });
log("loaded");
await page.waitForSelector(".r2p");
await page.evaluate(() => document.querySelector(".diff-hard")?.click());
await page.waitForTimeout(100);
await page.evaluate(() => document.querySelector("#start-btn")?.click());
log("started");

await page.waitForFunction(() => window.render_game_to_text?.().includes('"screen":"race"'), null, { timeout: 5000 });
await page.evaluate(() => window.advanceTime?.(12000));
log("advanced");

const stateText = await page.evaluate(() => window.render_game_to_text?.() ?? "{}");
fs.writeFileSync(path.join(outDir, "state-hard-12s.json"), stateText);
const canvas = await page.$("canvas");
if (canvas) {
  await canvas.screenshot({ path: path.join(outDir, "shot-hard-12s.png") });
} else {
  await page.screenshot({ path: path.join(outDir, "shot-hard-12s.png"), fullPage: true });
}
if (errors.length) {
  fs.writeFileSync(path.join(outDir, "errors.json"), JSON.stringify(errors, null, 2));
}
log("written");

await Promise.race([
  browser.close(),
  new Promise((resolve) => setTimeout(resolve, 2000)),
]);
log("closed");
process.exit(0);
