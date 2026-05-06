import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const outDir = "output/pasapalabra-mobile-check";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true, timeout: 15000 });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
});
const page = await context.newPage();

const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push({ type: "console.error", text: msg.text() });
});
page.on("pageerror", (error) => errors.push({ type: "pageerror", text: String(error) }));

await page.goto("http://localhost:5174/#game=knowledge-pasapalabra-rondo", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".knowledge-pasapalabra", { timeout: 12000 });

// Wait a bit for dynamic load of cache
await page.waitForFunction(
  () => !!document.querySelector(".pasapalabra-ring .pasapalabra-letter"),
  null,
  { timeout: 8000 }
);
await page.waitForTimeout(400);

// Capture screenshot
await page.screenshot({ path: path.join(outDir, "pasa-mobile-portrait.png"), fullPage: false });

// Inspect computed styles and bounds
const inspection = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return { sel, missing: true };
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      sel,
      rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      display: cs.display,
      flex: cs.flex,
      gridTemplateRows: cs.gridTemplateRows,
      height: cs.height,
      minHeight: cs.minHeight,
      maxHeight: cs.maxHeight,
      overflow: cs.overflow,
      overflowY: cs.overflowY,
      padding: cs.padding,
      visibility: cs.visibility,
      position: cs.position,
    };
  };
  const stage = document.querySelector(".mobile-game-shell__stage-viewport");
  const hidden = stage
    ? Array.from(stage.querySelectorAll("[data-mobile-stage-hidden=\"true\"]")).map((n) => n.className)
    : [];
  const target = stage?.querySelector("[data-mobile-stage-target=\"true\"]")?.className;
  const isolated = stage?.getAttribute("data-mobile-stage-isolated");
  return {
    isolated,
    target,
    hidden,
    body: pick(".mobile-game-shell__body"),
    stageShell: pick(".mobile-game-shell__stage-shell"),
    screenFrame: pick(".mobile-game-shell__screen-frame"),
    stageViewport: pick(".mobile-game-shell__stage-viewport"),
    miniGame: pick(".knowledge-pasapalabra"),
    miniHead: pick(".knowledge-pasapalabra > .mini-head"),
    shellSection: pick(".pasapalabra-shell"),
    statusRow: pick(".pasapalabra-shell .knowledge-status-row"),
    layout: pick(".pasapalabra-layout"),
    pasaStage: pick(".pasapalabra-stage"),
    ring: pick(".pasapalabra-ring"),
    clue: pick(".pasapalabra-clue-card"),
    panel: pick(".pasapalabra-panel"),
    inputRow: pick(".pasapalabra-input-row"),
    actions: pick(".knowledge-pasapalabra .wordle-actions"),
    keyboard: pick(".knowledge-pasapalabra .wordle-keyboard"),
    message: pick(".knowledge-pasapalabra .pasapalabra-panel .game-message"),
  };
});

fs.writeFileSync(path.join(outDir, "inspection.json"), JSON.stringify(inspection, null, 2));
if (errors.length) fs.writeFileSync(path.join(outDir, "errors.json"), JSON.stringify(errors, null, 2));

console.log("Done. Stage isolation:", inspection.isolated, "Target:", inspection.target);
console.log("Hidden siblings:", inspection.hidden);
console.log("Stage rect:", inspection.stageViewport.rect);
console.log("Pasa shell rect:", inspection.shellSection.rect);
console.log("Stage rect (pasa):", inspection.pasaStage.rect);
console.log("Panel rect:", inspection.panel.rect);
console.log("Keyboard rect:", inspection.keyboard.rect);

await browser.close();
process.exit(0);
