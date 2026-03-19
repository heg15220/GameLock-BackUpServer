import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = "C:/Users/hugoe/Downloads/plataforma-juegos-saas";
const OUT_DIR = path.join(ROOT, "output", "penalty-dive-fix", "probe-before");
fs.mkdirSync(OUT_DIR, { recursive: true });

async function getState(page) {
  return page.evaluate(() => {
    if (typeof window.render_game_to_text !== "function") return null;
    try {
      return JSON.parse(window.render_game_to_text());
    } catch {
      return null;
    }
  });
}

async function advance(page, ms) {
  await page.evaluate(async (dt) => {
    if (typeof window.advanceTime === "function") {
      await window.advanceTime(dt);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, dt));
  }, ms);
}

async function waitForState(page, predicate, timeoutMs = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = await getState(page);
    if (state && predicate(state)) {
      return state;
    }
    await page.waitForTimeout(50);
  }
  throw new Error("Timeout waiting for state condition");
}

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

try {
  await page.goto("http://127.0.0.1:4173/#game=arcade-penalty-neural-keeper", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(900);
  await page.waitForFunction(() => {
    const byId = document.querySelector("#penalty-start-btn");
    if (byId && !byId.disabled) return true;
    const byText = [...document.querySelectorAll("button")].find((button) =>
      /Iniciar duelo|Arrancar tanda|Empezar tanda|Start duel|Start shootout|Play again|Jugar otra vez/i.test(
        button.textContent || ""
      ) && !button.disabled
    );
    return Boolean(byText);
  }, { timeout: 12000 });
  await page.evaluate(() => {
    const byId = document.querySelector("#penalty-start-btn");
    if (byId && !byId.disabled) {
      byId.click();
      return;
    }
    const byText = [...document.querySelectorAll("button")].find((button) =>
      /Iniciar duelo|Arrancar tanda|Empezar tanda|Start duel|Start shootout|Play again|Jugar otra vez/i.test(
        button.textContent || ""
      ) && !button.disabled
    );
    if (byText) {
      byText.click();
    }
  });

  await page.waitForSelector("#penalty-zone-top-left", { timeout: 12000 });

  let ready = await waitForState(page, (s) => s.phase === "ready");
  let guard = 0;
  while (ready?.turnMode === "save" && guard < 4) {
    await page.click("#penalty-zone-center");
    ready = await waitForState(page, (s) => s.phase === "ready");
    guard += 1;
  }

  let cycleGuard = 0;
  while (ready?.ai?.predictedZone === "center" && cycleGuard < 4) {
    await page.click("#penalty-zone-center");
    ready = await waitForState(page, (s) => s.phase === "ready");
    if (ready?.turnMode === "save") {
      await page.click("#penalty-zone-center");
      ready = await waitForState(page, (s) => s.phase === "ready");
    }
    cycleGuard += 1;
  }

  const predictedZone = ready?.ai?.predictedZone ?? null;
  fs.writeFileSync(path.join(OUT_DIR, "pre-shot-state.json"), JSON.stringify(ready, null, 2));

  await page.click("#penalty-zone-top-left");
  await waitForState(page, (s) => s.phase === "shot" && !!s.activeShot, 6000);

  let baseline = null;
  try {
    baseline = await waitForState(
      page,
      (s) => s.phase === "shot" && !!s.activeShot && (s.activeShot.progress ?? 0) >= 0.55,
      2000
    );
  } catch {
    baseline = await getState(page);
  }
  await page.screenshot({ path: path.join(OUT_DIR, "dive-0.png"), fullPage: false });
  fs.writeFileSync(
    path.join(OUT_DIR, "dive-0.json"),
    JSON.stringify({ predictedZone, snapshot: baseline }, null, 2)
  );

  for (let i = 1; i < 3; i += 1) {
    await page.waitForTimeout(80);
    const state = await getState(page);
    await page.screenshot({ path: path.join(OUT_DIR, `dive-${i}.png`), fullPage: false });
    fs.writeFileSync(
      path.join(OUT_DIR, `dive-${i}.json`),
      JSON.stringify({ predictedZone, snapshot: state }, null, 2)
    );
  }
} finally {
  await browser.close();
}
