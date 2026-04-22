import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:4178/index.html#game=strategy-parchis-ludoteka';
const outDir = path.resolve('output/parchis-responsive-ui');
fs.mkdirSync(outDir, { recursive: true });

const devices = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 834, height: 1194 },
];

async function getState(page) {
  return page.evaluate(() => {
    if (typeof window.render_game_to_text !== 'function') return null;
    return JSON.parse(window.render_game_to_text());
  });
}

async function advanceFrames(page, frames = 60) {
  for (let i = 0; i < frames; i += 1) {
    await page.evaluate(async () => {
      if (typeof window.advanceTime === 'function') {
        await window.advanceTime(1000 / 60);
      }
    });
  }
}

async function waitForHumanRoll(page) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const state = await getState(page);
    if (state?.turn === 'human' && state?.phase === 'await-roll' && !state?.diceUi?.rolling) {
      return state;
    }
    await advanceFrames(page, 20);
    await page.waitForTimeout(25);
  }
  throw new Error('Human roll state not reached');
}

async function reachAiRolling(page) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const state = await getState(page);
    if (state?.diceUi?.rolling && state?.diceUi?.activeOwner && state.diceUi.activeOwner !== 'human') {
      return state;
    }

    if (state?.turn === 'human' && state?.phase === 'await-roll' && !state?.diceUi?.rolling) {
      const pinnedRollButton = page.locator('.mobile-game-status-panel__parchis-roll-button').first();
      if (await pinnedRollButton.count()) {
        await pinnedRollButton.click();
      } else {
        await page.evaluate(() => {
          const button = Array.from(document.querySelectorAll('.parchis-roll-inline'))
            .find((node) => node.getClientRects().length > 0 && !node.disabled)
            || Array.from(document.querySelectorAll('.parchis-roll-inline')).find((node) => !node.disabled);
          button?.click();
        });
      }
      await page.waitForTimeout(50);
    } else if (state?.turn === 'human' && state?.phase === 'await-action' && !state?.diceUi?.rolling) {
      if (Array.isArray(state.legalActionsHuman) && state.legalActionsHuman.length > 0) {
        await page.keyboard.press('Enter');
      } else {
        await page.keyboard.press('KeyX');
      }
      await page.waitForTimeout(50);
    }

    await advanceFrames(page, 24);
    await page.waitForTimeout(25);
  }
  throw new Error('AI rolling state not reached');
}

async function captureDevice(browser, device) {
  const page = await browser.newPage({ viewport: { width: device.width, height: device.height } });
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push({ type: 'console.error', text: msg.text() });
  });
  page.on('pageerror', (err) => {
    consoleErrors.push({ type: 'pageerror', text: String(err) });
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('.parchis-head-actions button'));
    const startButton = buttons.find((button) => {
      const text = button.textContent || '';
      return /iniciar partida|start match/i.test(text) && button.getClientRects().length > 0;
    }) || buttons.find((button) => /iniciar partida|start match/i.test(button.textContent || ''));
    startButton?.click();
  });
  await page.waitForTimeout(150);

  const humanState = await waitForHumanRoll(page);
  const panelLocator = page.locator('.mobile-game-status-panel__menu--parchis-dice');
  await panelLocator.waitFor({ state: 'visible' });
  await panelLocator.screenshot({ path: path.join(outDir, `${device.name}-human-ready.png`) });
  fs.writeFileSync(path.join(outDir, `${device.name}-human-ready.json`), JSON.stringify(humanState, null, 2));

  const aiState = await reachAiRolling(page);
  await panelLocator.waitFor({ state: 'visible' });
  await panelLocator.screenshot({ path: path.join(outDir, `${device.name}-ai-rolling.png`) });
  fs.writeFileSync(path.join(outDir, `${device.name}-ai-rolling.json`), JSON.stringify(aiState, null, 2));

  if (consoleErrors.length) {
    fs.writeFileSync(path.join(outDir, `${device.name}-errors.json`), JSON.stringify(consoleErrors, null, 2));
  }

  await page.close();
}

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader'],
});

try {
  for (const device of devices) {
    await captureDevice(browser, device);
  }
} finally {
  await browser.close();
}
