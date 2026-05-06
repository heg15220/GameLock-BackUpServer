import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:5173/#game=knowledge-pasapalabra-rondo";
const out = process.argv[3] ?? "output/pasapalabra-mobile-check.png";
const shouldFullscreen = process.argv.includes("--fullscreen");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

const consoleMessages = [];
page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) {
    consoleMessages.push(`${message.type()}: ${message.text()}`);
  }
});
page.on("pageerror", (error) => {
  consoleMessages.push(`pageerror: ${error.message}`);
});

await page.addInitScript(() => {
  window.localStorage.setItem("platform-games-ad-preview-enabled", "true");
});
await page.goto(url, { waitUntil: "networkidle" });

await page.waitForSelector(".knowledge-pasapalabra", { timeout: 20000 });
await page.waitForTimeout(1600);

if (shouldFullscreen) {
  await page.getByRole("button", { name: /Pantalla completa|Fullscreen/i }).click();
  await page.waitForTimeout(1200);
}

const metrics = await page.evaluate(() => {
  const rect = (selector) => {
    const node = document.querySelector(selector);
    if (!node) return null;
    const r = node.getBoundingClientRect();
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      left: Math.round(r.left),
      right: Math.round(r.right),
      width: Math.round(r.width),
      height: Math.round(r.height),
    };
  };
  const keyboard = rect(".knowledge-pasapalabra .wordle-keyboard");
  const actions = rect(".knowledge-pasapalabra .wordle-actions");
  const input = rect(".knowledge-pasapalabra .pasapalabra-input-row");
  const externalAd = rect(".launch-system-bottom-ad-wrap");
  const shell = rect(".mobile-game-shell");
  const fullscreenAd = rect(".mobile-game-shell__system-bottom-ad-wrap");
  const visibleKeys = Array.from(document.querySelectorAll(".knowledge-pasapalabra .wordle-key"))
    .filter((node) => {
      const r = node.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom <= window.innerHeight && r.top >= 0;
    }).length;
  return {
    viewport: { width: window.innerWidth, height: window.innerHeight },
    keyboard,
    actions,
    input,
    externalAd,
    fullscreenAd,
    shell,
    fullscreenElement: Boolean(document.fullscreenElement),
    visibleKeys,
  };
});

await page.screenshot({ path: out, fullPage: false });
console.log(JSON.stringify({ out, metrics, consoleMessages }, null, 2));
await browser.close();
