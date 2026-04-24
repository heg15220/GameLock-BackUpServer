import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://localhost:5173/?nocache=" + Date.now());
await page.waitForFunction(() => Array.isArray(window.__benchGames));

await page.evaluate(() => {
  window.__bench.reset("arcade-valle-tranquilo");
  window.dispatchEvent(new CustomEvent("bench:open-game", { detail: "arcade-valle-tranquilo" }));
});
await page.evaluate(() => window.__bench.ready);
await page.waitForTimeout(1500);

// Use CDP to start a CPU profile for 3 seconds
const client = await page.context().newCDPSession(page);
await client.send("Profiler.enable");
await client.send("Profiler.setSamplingInterval", { interval: 250 }); // 250 µs
await client.send("Profiler.start");

await page.waitForTimeout(3000);

const { profile } = await client.send("Profiler.stop");
await client.send("Profiler.disable");

// Analyze: aggregate time by function name
const nodesById = new Map(profile.nodes.map(n => [n.id, n]));
const totalSamples = profile.samples.length;
const hitCount = new Map();
for (const sid of profile.samples) {
  const n = nodesById.get(sid);
  if (!n) continue;
  const name = (n.callFrame.functionName || "(anonymous)") +
    (n.callFrame.url ? " @ " + n.callFrame.url.split("/").pop() + ":" + n.callFrame.lineNumber : "");
  hitCount.set(name, (hitCount.get(name) || 0) + 1);
}

const sorted = [...hitCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
const intervalMs = 0.25; // 250 us
console.log("Top functions by self time (profiler samples, 3s):");
console.log("samples | selfMs | name");
for (const [name, count] of sorted) {
  console.log(String(count).padStart(7), "|", String((count * intervalMs).toFixed(1)).padStart(6), "|", name);
}

const totalMs = (totalSamples * intervalMs).toFixed(1);
console.log(`\nTotal sampled: ${totalSamples} (${totalMs}ms wall)`);
await browser.close();
