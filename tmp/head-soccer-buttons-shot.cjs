const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 12'], viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5181/#game=sports-head-soccer-arena', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  // Trigger fullscreen mobile shell first if needed
  await page.evaluate(() => {
    const fs = document.querySelector('.fullscreen-toggle, [data-fullscreen]');
    if (fs) fs.click();
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const k = btns.find(b => /kick off/i.test(b.textContent || ''));
    if (k) k.click();
  });
  await page.waitForTimeout(2200);
  const info = await page.evaluate(() => {
    const cluster = document.querySelector('.mobile-control-deck__cluster--actions');
    if (!cluster) return { err: 'no actions cluster' };
    const cs = window.getComputedStyle(cluster);
    const r = cluster.getBoundingClientRect();
    const btns = Array.from(cluster.querySelectorAll('button')).map(b => {
      const br = b.getBoundingClientRect();
      return { text: (b.textContent || '').trim(), x: Math.round(br.x), y: Math.round(br.y), w: Math.round(br.width), h: Math.round(br.height) };
    });
    return {
      cluster: { display: cs.display, gridTemplateColumns: cs.gridTemplateColumns, gap: cs.gap, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      btns,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: 'tmp/head-soccer-portrait-actions.png', fullPage: false });
  await browser.close();
})();
