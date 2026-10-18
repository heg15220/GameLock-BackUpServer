import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

// Full app, ordinary career setup and fixture flow. Only the clock is stepped;
// no player positions, outcomes or action chains are supplied by this audit.
const base = process.env.MANAGER_TEST_URL || 'http://127.0.0.1:5199';
const output = process.env.MANAGER_TEST_OUTPUT || 'output/manager-finishing/real-game';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => {
  const now = Date.now;
  Date.now = () => 1792350000000;
  window.__restoreAuditClock = () => { Date.now = now; };
  localStorage.setItem('playforge.cookieConsent.v1', JSON.stringify({ version: 1, decided: true, updatedAt: new Date().toISOString(), preferences: { necessary: true } }));
});
const page = await context.newPage();
page.setDefaultTimeout(120000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
const reports = [];
try {
  await page.goto(`${base}/es/games/sports-manager`, { waitUntil: 'domcontentloaded' });
  console.log('Opening career setup');
  await page.getByRole('button', { name: 'Nueva carrera', exact: true }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.locator('.mg-league-card').filter({ has: page.getByText('LaLiga', { exact: true }) }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.locator('.mg-club-tile').filter({ hasText: 'Barcelona' }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.getByPlaceholder('Tu nombre').fill('Auditoría remates');
  await page.getByRole('button', { name: 'Firmar contrato', exact: true }).click();
  console.log('Creating the real career');
  await page.getByRole('button', { name: '¡A trabajar!', exact: true }).click();
  await page.evaluate(() => window.__restoreAuditClock());
  console.log('Career ready');
  for (let game = 0; game < Number(process.env.MANAGER_TEST_MATCHES || 2); game++) {
    // Open an existing fixture through the same pre-match component. The
    // calendar simulation is unrelated to this gameplay audit.
    await page.evaluate(() => {
      const debug = window.__managerDebug, c = debug.career();
      const fixture = Object.values(c.season.fixtures).filter(f => !f.done && f.friendly && (f.home === c.clubId || f.away === c.clubId)).sort((a, b) => a.date.localeCompare(b.date))[0];
      if (!fixture) throw new Error('No real friendly fixture');
      debug.openMatch(fixture.id);
    });
    console.log('Opening scheduled fixture');
    await page.getByRole('button', { name: 'Jugar el partido', exact: true }).click();
    await page.waitForFunction(() => Boolean(window.__managerLive?.advanceTime));
    console.log('Gameplay loaded');
    await page.evaluate(() => {
      const live = window.__managerLive;
      window.advanceTime(0);
      const audit = window.__finishingAudit = { actions: [], decisions: [], captures: {}, seen: new WeakSet() };
      live.onDecision = decision => audit.decisions.push({ ...decision, minute: live.match().clock + 1 });
      const enqueue = live.director.enqueue.bind(live.director);
      live.director.enqueue = (previous, next) => {
        audit.actions.push(...next.lastChain.map(action => ({ ...action, minute: next.clock })));
        return enqueue(previous, next);
      };
      const draw = live.renderer.draw.bind(live.renderer);
      let frames = 0;
      live.renderer.draw = () => {
        // Physics and director still run every 16ms. Paint at 15fps while
        // fast-stepping, and always paint the exact contact being captured.
        if (++frames % 4 === 0) draw();
        const sc = live.director.scene, a = sc?.action;
        // The wind-up is 18% of the 2200ms shot, also when a goal extends the
        // scene for its celebration. Capture just before contact, at head height.
        if (!a || a.t !== 'shot' || audit.seen.has(sc) || live.director.elapsed < 320) return;
        audit.seen.add(sc);
        // The director queue is the engine's real sequence; locate the shot in
        // the recorded history by its event id (unique throughout the match).
        const index = audit.actions.findIndex(row => row.t === 'shot' && row.ev === a.ev);
        const before = audit.actions[index - 1];
        const category = before?.kind === 'cross' ? before.cross.startsWith('corner') ? 'corner' : before.cross === 'freekick' ? 'free-kick' : before.cross === 'throw' ? 'throw' : 'cross'
          : ['carry', 'dribble'].includes(before?.t) && before.from === a.from ? 'run' : a.p >= 84 ? 'box' : a.p >= 77 ? 'edge' : 'other';
        const key = `${a.side}-${category}`;
        if (audit.captures[key]) return;
        draw();
        const body = live.renderer.bodies.get(a.from);
        audit.captures[key] = {
          minute: sc.minute, action: a, previous: before, ball: { ...live.renderer.ball }, shooter: body && { x: body.x, y: body.y },
          name: live.match().players[a.from].name, png: live.renderer.canvas.toDataURL('image/png'),
        };
      };
    });
    await page.getByRole('button', { name: 'Comenzar partido', exact: true }).click();
    // Verify pause/resume on the actual UI before playing every scene at 1x.
    await page.getByRole('button', { name: 'Pausa', exact: true }).click();
    const paused = await page.evaluate(() => { const before = window.__managerLive.match().clock; window.advanceTime(1000); return [before, window.__managerLive.match().clock]; });
    assert.equal(paused[0], paused[1]);
    await page.getByRole('button', { name: 'Jugar', exact: true }).click();
    await page.getByRole('button', { name: '4×', exact: true }).click();
    let state, lastMinute = -10;
    for (let burst = 0; burst < 700; burst++) {
      state = await page.evaluate(() => {
        window.advanceTime(4000);
        const live = window.__managerLive, m = live.match();
        return { minute: m.clock, score: m.score, complete: m.complete, pausedFor: m.pausedFor, busy: live.director.busy, captures: Object.keys(window.__finishingAudit.captures) };
      });
      if (state.minute >= lastMinute + 10) {
        lastMinute = state.minute; console.log(JSON.stringify({ game, ...state }));
        await fs.writeFile(`${output}/progress.json`, JSON.stringify({ game, ...state }, null, 2));
      }
      if (state.pausedFor && !state.busy) {
        if (state.pausedFor === 'half-time') await page.getByRole('button', { name: 'Segunda parte', exact: true }).click();
        else if (state.pausedFor === 'injury') {
          // Normal assistant substitutions are enabled; if a manual injury
          // decision is required, report it instead of bypassing game rules.
          throw new Error('Injury needs a substitution in the audit');
        } else await page.getByRole('button', { name: 'Seguir', exact: true }).click();
      }
      if (state.complete && !state.busy) break;
    }
    assert.equal(state.complete && !state.busy, true, 'All gameplay scenes must finish');
    const report = await page.evaluate(() => {
      const m = window.__managerLive.match();
      return { seed: m.seed, id: m.id, clockRate: m.clockRate, userSide: m.userSide, home: m.sides.home.name, away: m.sides.away.name, score: m.score, stats: m.stats, events: m.events, actions: window.__finishingAudit.actions, decisions: window.__finishingAudit.decisions, captures: window.__finishingAudit.captures, text: JSON.parse(window.render_game_to_text()) };
    });
    for (const [key, capture] of Object.entries(report.captures)) {
      const file = `${output}/match-${game}-${key}.png`;
      await fs.writeFile(file, Buffer.from(capture.png.split(',')[1], 'base64'));
      delete capture.png; capture.file = file;
    }
    for (const side of ['home', 'away']) {
      assert.ok(report.stats[side].shots > 0, `${side} must shoot`);
      const actions = report.actions;
      for (let i = 0; i < actions.length; i++) {
        const a = actions[i];
        if (a.side !== side || a.kind !== 'cross' || !a.ok) continue;
        assert.ok(actions.slice(i + 1, i + 3).some(next => next.t === 'shot' && next.side === side), 'A won delivery must end in a shot');
      }
    }
    await page.screenshot({ path: `${output}/match-${game}-full-time.png` });
    reports.push(report);
    await fs.writeFile(`${output}/report.json`, JSON.stringify({ reports, errors }, null, 2));
    console.log(JSON.stringify({ game, score: report.score, shots: [report.stats.home.shots, report.stats.away.shots], captures: Object.keys(report.captures) }));
    await page.getByRole('button', { name: 'Ver resumen', exact: true }).click();
    if (game + 1 < Number(process.env.MANAGER_TEST_MATCHES || 2)) await page.locator('.mg-post').getByRole('button', { name: 'Continuar', exact: true }).click();
  }
  assert.deepEqual(errors, []);
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png` }).catch(() => {});
  await fs.writeFile(`${output}/failure.json`, JSON.stringify({ error: error.message, errors, body: await page.locator('body').innerText().catch(() => '') }, null, 2));
  throw error;
} finally { await browser.close(); }
