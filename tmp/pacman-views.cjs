const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const cases = [
    { name: 'desktop', viewport: { width: 1440, height: 900 }, ctxArgs: {} },
    { name: 'tablet-landscape', viewport: { width: 1024, height: 768 }, ctxArgs: { ...devices['iPad Pro 11 landscape'] } },
  ];
  for (const c of cases) {
    const ctx = await browser.newContext({ ...c.ctxArgs, viewport: c.viewport });
    const page = await ctx.newPage();
    await page.goto('http://localhost:5181/#game=arcade-pacman-maze-protocol', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2200);
    const info = await page.evaluate(() => {
      const canvas = document.querySelector('.pacman-canvas');
      const shell = document.querySelector('.pacman-stage-shell');
      const wrap = document.querySelector('.pacman-stage-wrap--sky') || document.querySelector('.sky-runner-dx-stage-wrap');
      const out = {};
      if (canvas) {
        const cs = window.getComputedStyle(canvas);
        const r = canvas.getBoundingClientRect();
        out.canvas = {
          backing: { w: canvas.width, h: canvas.height },
          css: { w: Math.round(r.width), h: Math.round(r.height) },
          imageRendering: cs.imageRendering,
          objectFit: cs.objectFit,
          display: cs.display,
        };
      }
      if (shell) {
        const cs = window.getComputedStyle(shell);
        const r = shell.getBoundingClientRect();
        out.shell = { w: Math.round(r.width), h: Math.round(r.height), aspectRatio: cs.aspectRatio, width: cs.width, maxWidth: cs.maxWidth };
      }
      if (wrap) {
        const r = wrap.getBoundingClientRect();
        out.wrap = { w: Math.round(r.width), h: Math.round(r.height), cls: wrap.className };
      }
      out.bodyClass = document.body.className;
      const shellEl = document.querySelector('.mobile-game-shell');
      out.mobileShellClass = shellEl ? shellEl.className : null;
      return out;
    });
    console.log(c.name, JSON.stringify(info, null, 2));
    await page.screenshot({ path: `tmp/pacman-${c.name}.png`, fullPage: false });
    await ctx.close();
  }
  await browser.close();
})();
