const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const cases = [
    { name: 'desktop', viewport: { width: 1440, height: 900 }, ctxArgs: {} },
    { name: 'tablet', viewport: { width: 1024, height: 768 }, ctxArgs: { ...devices['iPad Pro 11 landscape'] } },
  ];
  for (const c of cases) {
    const ctx = await browser.newContext({ ...c.ctxArgs, viewport: c.viewport });
    const page = await ctx.newPage();
    await page.goto('http://localhost:5181/#game=knowledge-puzle-deslizante', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const info = await page.evaluate(() => {
      const grid = document.querySelector('.puzzle-grid');
      const shell = document.querySelector('.knowledge-mode-shell');
      const game = document.querySelector('.knowledge-arcade-game');
      const r = (el) => el ? el.getBoundingClientRect() : null;
      const out = {};
      if (grid) {
        const rect = r(grid);
        const cs = window.getComputedStyle(grid);
        out.grid = { w: Math.round(rect.width), h: Math.round(rect.height), maxWidth: cs.maxWidth, gridTemplateColumns: cs.gridTemplateColumns };
      }
      if (shell) { const rect = r(shell); out.shell = { w: Math.round(rect.width), h: Math.round(rect.height) }; }
      if (game) { const rect = r(game); out.game = { w: Math.round(rect.width), h: Math.round(rect.height) }; }
      const tile = document.querySelector('.puzzle-tile');
      if (tile) { const rect = r(tile); out.tile = { w: Math.round(rect.width), h: Math.round(rect.height) }; }
      return out;
    });
    console.log(c.name, JSON.stringify(info, null, 2));
    await page.screenshot({ path: `tmp/puzle-${c.name}.png`, fullPage: false });
    await ctx.close();
  }
  await browser.close();
})();
