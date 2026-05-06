import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:5173/#game=arcade-valle-tranquilo";
const out = process.argv[3] ?? "output/valle-tranquilo-intro.png";

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
  window.localStorage.setItem("platform-games-ad-preview-enabled", "false");
});
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForSelector(".arcade-valle-tranquilo-frame", { timeout: 20000 });
await page.waitForTimeout(1800);

const metrics = await page.evaluate(() => {
  const host = document.querySelector(".arcade-valle-tranquilo-frame");
  const root = host?.shadowRoot;
  const copy = root?.querySelector(".intro-copy");
  const modal = root?.querySelector("#mx");
  const title = root?.querySelector("#mt")?.textContent ?? null;
  const subtitle = root?.querySelector("#ms")?.textContent ?? null;
  const text = copy?.innerText ?? null;
  const rectFor = (node) => {
    if (!node) return null;
    const r = node.getBoundingClientRect();
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      width: Math.round(r.width),
      height: Math.round(r.height),
      scrollHeight: Math.round(node.scrollHeight ?? 0),
      clientHeight: Math.round(node.clientHeight ?? 0),
    };
  };
  return {
    title,
    subtitle,
    paragraphCount: copy?.querySelectorAll("p").length ?? 0,
    textLength: text?.length ?? 0,
    startsWith: text?.slice(0, 180) ?? null,
    copyRect: rectFor(copy),
    modalRect: rectFor(modal),
  };
});

await page.screenshot({ path: out, fullPage: false });
console.log(JSON.stringify({ out, metrics, consoleMessages }, null, 2));
await browser.close();
