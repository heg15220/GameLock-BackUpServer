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
    await page.goto('http://localhost:5181/#game=knowledge-sudoku-sprint', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const info = await page.evaluate(() => {
      const board = document.querySelector('.sudoku-board');
      const shell = document.querySelector('.sudoku-board-shell');
      const cell = document.querySelector('.sudoku-cell');
      const r = (el) => el ? el.getBoundingClientRect() : null;
      const out = {};
      if (board) { const rect = r(board); const cs = window.getComputedStyle(board); out.board = { w: Math.round(rect.width), h: Math.round(rect.height), gridTemplateColumns: cs.gridTemplateColumns }; }
      if (shell) { const rect = r(shell); const cs = window.getComputedStyle(shell); out.shell = { w: Math.round(rect.width), h: Math.round(rect.height), maxWidth: cs.maxWidth }; }
      if (cell) { const rect = r(cell); out.cell = { w: Math.round(rect.width), h: Math.round(rect.height) }; }
      return out;
    });
    console.log(c.name, JSON.stringify(info, null, 2));
    await ctx.close();
  }
  await browser.close();
})();
