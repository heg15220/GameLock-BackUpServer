import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://localhost:5173/");
await page.waitForFunction(() => Array.isArray(window.__benchGames));

await page.evaluate(() => {
  window.__bench.reset("arcade-valle-tranquilo");
  window.dispatchEvent(new CustomEvent("bench:open-game", { detail: "arcade-valle-tranquilo" }));
});
await page.evaluate(() => window.__bench.ready);
await page.waitForTimeout(1500);

// Dismiss intro modal with space/enter clicks on canvas area
const vp = await page.$(".arcade-neon-rush-frame");
if (vp) {
  const box = await vp.boundingBox();
  if (box) {
    for (let i = 0; i < 3; i++) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.keyboard.press("Enter");
      await page.keyboard.press("Space");
      await page.waitForTimeout(200);
    }
  }
}

// Patch the draw() function inside the scoped Function closure. The game lives
// behind an iframe-like shadow DOM host, but its globals live in its own Function
// scope so we can't patch it from outside. Instead, we rely on the game exposing
// things on window — unfortunately it doesn't. So the next best: measure GC-ish
// blocks by sampling requestIdleCallback + RAF + measure over a longer window.

const profile = await page.evaluate(async () => {
  const frameTimes = [];
  const slowFrames = [];
  let lastT = 0;
  let done = false;

  // Record the time the script begins vs next RAF — detect garbage pauses.
  const loop = (t) => {
    if (done) return;
    if (lastT) {
      const dt = t - lastT;
      frameTimes.push(dt);
      if (dt > 20) slowFrames.push({ at: t, dt });
    }
    lastT = t;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  await new Promise(r => setTimeout(r, 5000));
  done = true;

  frameTimes.sort((a, b) => a - b);
  const p = (q) => frameTimes[Math.floor(q * frameTimes.length)];
  return {
    frameCount: frameTimes.length,
    fps: +(frameTimes.length / 5).toFixed(1),
    p50: +p(0.5).toFixed(2),
    p75: +p(0.75).toFixed(2),
    p95: +p(0.95).toFixed(2),
    p99: +p(0.99).toFixed(2),
    max: +frameTimes[frameTimes.length - 1].toFixed(2),
    slowFramesCount: slowFrames.length,
    slowFramePct: +((slowFrames.length / frameTimes.length) * 100).toFixed(1),
    slowFrameSample: slowFrames.slice(0, 10).map(s => +s.dt.toFixed(2)),
    // Heap snapshot
    heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
  };
});

console.log(JSON.stringify(profile, null, 2));
await browser.close();
