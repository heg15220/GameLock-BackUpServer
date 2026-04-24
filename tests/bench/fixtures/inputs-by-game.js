// Per-game input scripts. The default pokes the most common controls
// (click canvas, press Space, press Enter, arrow keys). For games that
// don't respond to these, add a custom entry keyed by game id.
//
// Each function receives `page` (Playwright Page) and `durationMs`
// (total time the frame-sampling window runs). It should issue inputs
// throughout that window; each input should be surrounded by the
// bench.markInput()/wait-for-RAF pattern so input latency is captured.

async function pressKeyWithLatency(page, key) {
  await page.evaluate(() => window.__bench?.markInput?.());
  await page.keyboard.press(key);
}

async function clickCanvasWithLatency(page) {
  await page.evaluate(() => window.__bench?.markInput?.());
  const canvas = page.locator("canvas").first();
  if (await canvas.count()) {
    try {
      await canvas.click({ timeout: 1000, trial: false });
    } catch {
      // ignore failed clicks — some games cover canvas with overlays
    }
  }
}

async function defaultInputLoop(page, durationMs) {
  const start = Date.now();
  // Kick past menus
  await clickCanvasWithLatency(page);
  await page.waitForTimeout(50);
  await pressKeyWithLatency(page, "Enter");
  await page.waitForTimeout(50);
  await pressKeyWithLatency(page, "Space");
  await page.waitForTimeout(50);

  const keys = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Space"];
  let i = 0;
  while (Date.now() - start < durationMs) {
    await pressKeyWithLatency(page, keys[i % keys.length]);
    i += 1;
    await page.waitForTimeout(120);
  }
}

async function pinballInputLoop(page, durationMs) {
  const start = Date.now();
  // Charge and release the plunger
  await page.evaluate(() => window.__bench?.markInput?.());
  await page.keyboard.down("Space");
  await page.waitForTimeout(250);
  await page.keyboard.up("Space");
  await page.waitForTimeout(50);

  const keys = ["z", "x", "ArrowLeft", "ArrowRight"];
  let i = 0;
  while (Date.now() - start < durationMs) {
    await pressKeyWithLatency(page, keys[i % keys.length]);
    i += 1;
    await page.waitForTimeout(100);
  }
}

async function pointerDragLoop(page, durationMs) {
  const start = Date.now();
  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) {
    return defaultInputLoop(page, durationMs);
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  let dir = 1;
  while (Date.now() - start < durationMs) {
    await page.evaluate(() => window.__bench?.markInput?.());
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 120 * dir, cy - 40, { steps: 6 });
    await page.mouse.up();
    dir = -dir;
    await page.waitForTimeout(140);
  }
}

export const INPUT_LOOPS = {
  __default: defaultInputLoop,
  "arcade-pinball-wizard": pinballInputLoop,
  "arcade-reactor-toss": pointerDragLoop,
  "arcade-archery-horizon": pointerDragLoop,
  "arcade-golf-tour-2d": pointerDragLoop,
  "arcade-bowling-pro-tour": pointerDragLoop,
  "arcade-billar-pool-club": pointerDragLoop,
};

export function getInputLoop(gameId) {
  return INPUT_LOOPS[gameId] || INPUT_LOOPS.__default;
}
