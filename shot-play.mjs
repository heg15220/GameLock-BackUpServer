import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1200 }, deviceScaleFactor: 1.6 });
await page.goto("file:///C:/Users/hugoe/Downloads/GameLock-BackUpServer/play-preview.html");
await page.waitForTimeout(400);
const sections = await page.$$(".tr-shell > section");
for (let i = 0; i < sections.length; i += 1) {
  await sections[i].screenshot({ path: `play-${String(i).padStart(2, "0")}.png` });
}
await browser.close();
console.log("ok", sections.length);
