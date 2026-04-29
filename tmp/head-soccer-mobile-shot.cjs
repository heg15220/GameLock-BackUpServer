const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    ...devices['iPhone 12'],
    viewport: { width: 390, height: 844 },
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5180/#game=sports-head-soccer-arena', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const k = btns.find(b => /kick off|patear|empezar/i.test(b.textContent || ''));
    if (k) k.click();
  });
  await page.waitForTimeout(2200);
  const tree = await page.evaluate(() => {
    const out = { bodyClass: document.body.className };
    const shell = document.querySelector('.mobile-game-shell');
    out.shellClass = shell ? shell.className : null;
    const stage = document.querySelector('.mobile-game-shell__stage-viewport');
    out.stageData = stage ? { dataset: { ...stage.dataset } } : null;
    const ctrls = document.querySelectorAll('.head-soccer-pro-controls');
    out.controlsCount = ctrls.length;
    out.controls = Array.from(ctrls).map(c => {
      const cs = window.getComputedStyle(c);
      const r = c.getBoundingClientRect();
      return {
        path: c.outerHTML.substring(0, 100),
        display: cs.display,
        flexDir: cs.flexDirection,
        x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        dataMobileStageHidden: c.getAttribute('data-mobile-stage-hidden'),
        parentClass: c.parentElement?.className,
      };
    });
    return out;
  });
  console.log(JSON.stringify(tree, null, 2));
  await browser.close();
})();
