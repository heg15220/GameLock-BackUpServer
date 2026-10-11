import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { resolve } from 'node:path';

// Exercise the public import/replay controls using saves produced by the real
// reducer. No fabricated goals, private React state or production test hooks.
const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const base = args[0] || 'http://127.0.0.1:5192';
const output = args[1] || 'output/manager-v6/presentation';
const fixturesOnly = process.argv.includes('--fixtures-only');
await fs.mkdir(`${output}/fixtures`, { recursive: true });

async function generateFixtures() {
  const { build } = await import('esbuild');
  const bundle = await build({ stdin: { contents: `
    export {createManagerCareer,managerReducer,serializeManagerCareer,restoreManagerCareer} from './src/games/sports/manager/engine.js';
    export {getManagerWorld} from './src/games/sports/manager/data.js';
  `, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
  const engine = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
  const catalogue = engine.getManagerWorld(2013);
  const ids = ['real-madrid', 'barcelona'];
  // Two actual squads make these UI fixtures inexpensive. This is a deliberately
  // reduced test competition, never a purported historical league season.
  const world = { ...catalogue, clubs: catalogue.clubs.filter((club) => ids.includes(club.id)),
    players: catalogue.players.filter((player) => ids.includes(player.clubId)),
    competitions: catalogue.competitions.filter((league) => league.id === 'laliga'), countries: [] };
  const required = ['buildup', 'recovery', 'counter', 'corner', 'corner-clearance', 'free-kick', 'penalty', 'goal', 'final-goal'];
  const fixtures = new Map();
  for (let seed = 0; seed < 180 && fixtures.size < required.length; seed++) {
    let state = engine.createManagerCareer({ year: 2013, clubId: ids[0], managerName: 'Auditoría de presentación', seed: `presentation-audit-${seed}`, world: structuredClone(world) });
    state = engine.managerReducer(state, { type: 'PLAY_MATCH', mode: 'deep' });
    assert.equal(state.activeMatch.modelVersion, 3, 'presentation fixtures require the current versioned match model');
    while (state.activeMatch) {
      const before = state;
      state = engine.managerReducer(state, { type: 'ADVANCE_MATCH', minutes: 1 });
      const match = state.activeMatch || state.lastMatch;
      const presentation = match.presentation;
      assert.ok(presentation?.sequences?.length, 'every played minute has a presentation descriptor');
      const kinds = new Set(presentation.sequences.map((sequence) => sequence.kind));
      if (presentation.sequences.some((sequence) => sequence.kind === 'recovery' && sequence.source === 'corner')) kinds.add('corner-clearance');
      if (!state.activeMatch && presentation.sequences.some((sequence) => sequence.kind === 'goal' && sequence.minute === 90)) kinds.add('final-goal');
      for (const kind of required) {
        if (fixtures.has(kind) || !kinds.has(kind)) continue;
        const save = engine.serializeManagerCareer(before);
        assert.deepEqual(engine.restoreManagerCareer(save).activeMatch, before.activeMatch, `${kind}: replayed save preserves the exact match prefix`);
        const file = `${output}/fixtures/${kind}.json`;
        await fs.writeFile(file, save);
        fixtures.set(kind, { kind, file: resolve(file), seed: before.seed, minuteBefore: before.activeMatch.minute,
          minute: presentation.minute, roundBefore: before.round, presentation,
          score: { home: match.homeGoals, away: match.awayGoals }, events: match.events,
          names: Object.fromEntries(world.players.map((player) => [player.id, player.name])) });
      }
    }
  }
  assert.deepEqual(required.filter((kind) => !fixtures.has(kind)), [], 'deterministic seed search covers every required sequence and a goal in the final minute');
  await fs.writeFile(`${output}/fixtures/manifest.json`, JSON.stringify([...fixtures.values()], null, 2));
  return fixtures;
}

const fixtures = await generateFixtures();
if (fixturesOnly) {
  console.log(JSON.stringify({ fixtures: [...fixtures.values()].map(({ kind, seed, minute }) => ({ kind, seed, minute })) }));
} else {
  const browser = await chromium.launch({ headless: true });
  const errors = [], consoleErrors = [], checks = [], observations = [];
  let activePage;
  const read = (page) => page.evaluate(() => JSON.parse(window.render_game_to_text()));
  const pitch = (page) => page.locator('[data-testid="live-pitch"]');

  async function snapshot(page) {
    return pitch(page).evaluate((node) => {
      const points = [...node.querySelectorAll('[data-player-id]')].map((marker) => ({
        id: marker.dataset.playerId, team: marker.dataset.team, x: Number(marker.dataset.x), y: Number(marker.dataset.y),
      })).sort((a, b) => a.id.localeCompare(b.id));
      const ball = node.querySelector('[data-testid="live-ball"]');
      return { scene: node.dataset.sceneId, kind: node.dataset.eventKind, phase: node.dataset.scenePhase,
        time: Number(node.dataset.presentationTime), running: node.dataset.running === 'true',
        presentation: node.dataset.presentationId, carrier: node.dataset.carrierId,
        points, ball: ball ? { x: Number(ball.dataset.x), y: Number(ball.dataset.y), height: Number(ball.dataset.height) } : null };
    });
  }

  function assertFrame(frame) {
    assert.ok(frame.scene && frame.presentation, 'the rendered scene is identified');
    assert.ok(Number.isFinite(frame.time) && frame.time >= 0, 'presentation time is finite');
    assert.ok(frame.points.length >= 18 && frame.points.length <= 22, 'only actual on-pitch players are rendered');
    assert.equal(new Set(frame.points.map((point) => point.id)).size, frame.points.length, 'no duplicate player markers');
    for (const point of [...frame.points, frame.ball]) {
      assert.ok(point && Number.isFinite(point.x) && Number.isFinite(point.y), 'finite player and ball positions');
      assert.ok(point.x >= 0 && point.x <= 100 && point.y >= 0 && point.y <= 100, 'positions stay within the illustrated pitch');
    }
    if (frame.carrier) assert.ok(frame.points.some((point) => point.id === frame.carrier), 'the carrier is currently on the pitch');
  }

  async function pageFor(viewport, reducedMotion = 'no-preference') {
    const page = await browser.newPage({ viewport, reducedMotion, isMobile: viewport.width < 600, hasTouch: viewport.width < 1100 });
    activePage = page;
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await page.goto(`${base}/es/games/sports-manager`, { waitUntil: 'networkidle' });
    const cookie = page.locator('.cookie-consent-primary');
    if (await cookie.isVisible()) await cookie.click();
    return page;
  }

  async function importFixture(page, fixture, reload = true) {
    // Remount the component so one scenario cannot inherit another's RAF queue.
    if (reload) await page.reload({ waitUntil: 'networkidle' });
    await page.getByLabel('Importar partida', { exact: true }).setInputFiles(fixture.file);
    await pitch(page).waitFor();
    await page.waitForFunction((minute) => JSON.parse(window.render_game_to_text()).activeMatch?.minute === minute, fixture.minuteBefore);
    await page.getByRole('button', { name: 'Reproducir partido', exact: true }).waitFor();
  }

  async function capture(page, name) {
    await page.locator('.launch-body').evaluate((node) => { node.scrollTop = 0; });
    await page.screenshot({ path: `${output}/${name}.png` });
    const widths = await page.locator('.fm-game').evaluate((node) => ({ client: node.clientWidth, scroll: node.scrollWidth }));
    assert.ok(widths.scroll <= widths.client + 1, `${name}: no horizontal page overflow`);
  }

  async function assertScore(page) {
    const current = await read(page);
    const match = current.activeMatch || current.lastMatch;
    assert.ok(match.events.every((event) => event.minute <= (match.minute ?? match.duration)), 'the state exposes no future event');
    const scores = await page.locator('.fm-live-score [aria-live="polite"] > b').allTextContents();
    assert.equal(scores.length, 2, 'both scores are visible');
    const visible = scores.map(Number);
    const scorers = await page.locator('.fm-live-scorers > div').evaluateAll((columns) => columns.map((column) => column.querySelectorAll(':scope > span').length));
    assert.deepEqual(scorers.length ? scorers : [0, 0], visible, 'visible scorer entries agree with the scoreboard');
    assert.ok(visible[0] <= match.homeGoals && visible[1] <= match.awayGoals, 'presentation never invents a goal');
    return visible;
  }

  async function pause(page) {
    const button = page.getByRole('button', { name: 'Pausar partido', exact: true });
    if (await button.isVisible()) await button.click();
    await page.waitForTimeout(60);
    const before = await snapshot(page), stateBefore = await read(page);
    await page.waitForTimeout(380);
    const after = await snapshot(page), stateAfter = await read(page);
    assert.deepEqual(after, before, 'pause freezes players, ball, current phase and the visual clock');
    assert.equal(stateAfter.activeMatch?.minute, stateBefore.activeMatch?.minute, 'pause also freezes the simulation');
    return after;
  }

  async function observeSequence(page, fixture, kind = fixture.kind) {
    await page.getByRole('group', { name: 'Velocidad de reproducción', exact: true }).getByRole('button', { name: '4×', exact: true }).click();
    await page.getByRole('button', { name: 'Reproducir partido', exact: true }).click();
    const expectedKind = kind === 'final-goal' ? 'goal' : kind === 'corner-clearance' ? 'recovery' : kind;
    const expectedScene = kind === 'corner-clearance' ? fixture.presentation.sequences.find((sequence) => sequence.kind === 'recovery' && sequence.source === 'corner').id : null;
    await page.waitForFunction(({ id, kind, scene }) => {
      const node = document.querySelector('[data-testid="live-pitch"]');
      return node?.dataset.presentationId === id && node?.dataset.eventKind === kind && (!scene || node.dataset.sceneId === scene);
    }, { id: fixture.presentation.id, kind: expectedKind, scene: expectedScene }, { timeout: 30000 });
    const observed = await snapshot(page);
    assertFrame(observed);
    observations.push({ kind, seed: fixture.seed, minute: fixture.minute, frame: observed });
    await assertScore(page);
    return observed;
  }

  try {
    const desktop = await pageFor({ width: 1440, height: 1000 });
    const build = fixtures.get('buildup');
    await importFixture(desktop, build, false);
    await desktop.getByRole('button', { name: 'Reproducir partido', exact: true }).click();
    await desktop.waitForFunction(() => {
      const node = document.querySelector('[data-testid="live-pitch"]');
      return node?.dataset.eventKind === 'buildup' && Number(node.dataset.presentationTime) > 70;
    });
    const movingA = await snapshot(desktop);
    await desktop.waitForTimeout(250);
    const movingB = await snapshot(desktop);
    assertFrame(movingA); assertFrame(movingB);
    assert.equal(movingA.scene, movingB.scene, 'movement is observed within a possession, not a scene jump');
    assert.ok(movingB.points.some((point) => { const earlier = movingA.points.find((entry) => entry.id === point.id); return earlier && Math.hypot(point.x - earlier.x, point.y - earlier.y) > .05; }), 'players move during possession');
    assert.ok(Math.hypot(movingB.ball.x - movingA.ball.x, movingB.ball.y - movingA.ball.y) > .05, 'the ball travels during possession');
    await pause(desktop);
    await capture(desktop, 'desktop-possession-paused');
    checks.push('Movement within possession and exact pause of players, ball and clocks');

    const speedMeasurements = [];
    for (const speed of [1, 2, 4]) {
      await importFixture(desktop, build);
      const control = desktop.getByRole('group', { name: 'Velocidad de reproducción', exact: true }).getByRole('button', { name: `${speed}×`, exact: true });
      await control.click();
      assert.equal(await control.getAttribute('aria-pressed'), 'true');
      await desktop.getByRole('button', { name: 'Reproducir partido', exact: true }).click();
      await desktop.waitForFunction(() => Number(document.querySelector('[data-testid="live-pitch"]')?.dataset.presentationTime) > 30);
      const before = await snapshot(desktop), start = performance.now();
      await desktop.waitForTimeout(180);
      const after = await snapshot(desktop), elapsed = performance.now() - start;
      assert.equal(after.scene, before.scene, 'speed measurement stays within one scene');
      const ratio = (after.time - before.time) / elapsed;
      assert.ok(ratio > speed * .55 && ratio < speed * 1.6, `${speed}× advances visual time proportionally (${ratio.toFixed(2)})`);
      speedMeasurements.push({ speed, ratio });
      await pause(desktop);
    }
    assert.ok(speedMeasurements[1].ratio > speedMeasurements[0].ratio && speedMeasurements[2].ratio > speedMeasurements[1].ratio, 'the speed controls increase actual playback speed');
    checks.push('Measured1×/2×/4× visual playback, not only selected button state');

    for (const kind of ['recovery', 'counter', 'corner', 'corner-clearance', 'free-kick', 'penalty']) {
      const fixture = fixtures.get(kind);
      await importFixture(desktop, fixture);
      await observeSequence(desktop, fixture);
      await pause(desktop);
      await capture(desktop, `desktop-${kind}`);
    }
    checks.push('Observed recovery, counterattack, corner, defensive recovery after a corner, free kick and penalty descriptors in the rendered pitch');

    const goalFixture = fixtures.get('goal');
    const celebration = goalFixture.presentation.sequences.find((sequence) => sequence.kind === 'goal');
    const shot = goalFixture.presentation.sequences.find((sequence) => sequence.kind === 'shot' && sequence.eventId === celebration.eventId);
    assert.ok(shot, 'the celebration belongs to the same recorded shot and goal');
    await importFixture(desktop, goalFixture);
    await desktop.getByRole('group', { name: 'Velocidad de reproducción', exact: true }).getByRole('button', { name: '4×', exact: true }).click();
    await desktop.getByRole('button', { name: 'Reproducir partido', exact: true }).click();
    await desktop.waitForFunction((id) => {
      const node = document.querySelector('[data-testid="live-pitch"]');
      return node?.dataset.sceneId === id && node?.dataset.scenePhase === 'approach';
    }, shot.id, { timeout: 30000 });
    await pause(desktop);
    const beforeGoal = goalFixture.presentation.scoreBefore;
    assert.deepEqual(await assertScore(desktop), [beforeGoal.home, beforeGoal.away], 'the upcoming goal is hidden while its shot is still being prepared');
    await capture(desktop, 'desktop-shot-before-goal');
    await desktop.getByRole('button', { name: 'Reproducir partido', exact: true }).click();
    await desktop.waitForFunction((id) => document.querySelector('[data-testid="live-pitch"]')?.dataset.sceneId === id, celebration.id);
    await pause(desktop);
    assert.deepEqual(await assertScore(desktop), [goalFixture.score.home, goalFixture.score.away], 'one shot plus celebration counts as one goal');
    assert.ok((await desktop.locator('.fm-live-scorers').textContent()).includes(goalFixture.names[celebration.actorId]), 'the displayed scorer is the recorded player');
    await capture(desktop, 'desktop-goal');
    checks.push('Goal hidden before the shot, shown at the finish, scored once and attributed to the actual scorer');

    await importFixture(desktop, build);
    await desktop.getByRole('button', { name: /^\+5/ }).click();
    await desktop.getByRole('group', { name: 'Velocidad de reproducción', exact: true }).getByRole('button', { name: '4×', exact: true }).click();
    await desktop.waitForFunction(() => {
      const current = JSON.parse(window.render_game_to_text());
      return current.activeMatch?.minute === 5 && document.querySelector('[data-testid="live-pitch"]')?.dataset.running === 'false';
    }, null, { timeout: 30000 });
    await desktop.getByRole('button', { name: 'Reproducir partido', exact: true }).waitFor();
    assert.equal((await read(desktop)).activeMatch.pausedFor, null, 'the jump finishes without a half-time or injury pause');
    await desktop.getByRole('button', { name: 'Reproducir partido', exact: true }).click();
    await desktop.waitForFunction(() => {
      const current = JSON.parse(window.render_game_to_text());
      return current.activeMatch?.minute === 6 && Number(document.querySelector('[data-testid="live-pitch"]')?.dataset.presentationTime) > 30;
    });
    await pause(desktop);
    checks.push('After a +5 jump consumes its visual queue, Play advances to minute6 and animates again');

    await importFixture(desktop, build);
    await observeSequence(desktop, build);
    await pause(desktop);
    await desktop.getByRole('checkbox', { name: /Cambios automáticos del asistente/ }).uncheck();
    const beforeSub = await read(desktop), active = beforeSub.activeMatch;
    const players = new Map(beforeSub.squad.map((player) => [player.id, player]));
    const outId = active[`${active.ownSide}Lineup`].find((id) => players.get(id)?.position !== 'GK' && active[`${active.ownSide}Bench`].some((entry) => players.get(entry)?.position === players.get(id)?.position));
    const inId = active[`${active.ownSide}Bench`].find((id) => players.get(id)?.position === players.get(outId)?.position);
    assert.ok(outId && inId, 'an eligible substitution is available');
    await desktop.getByLabel('Jugador que sale', { exact: true }).selectOption(outId);
    await desktop.getByLabel('Jugador que entra', { exact: true }).selectOption(inId);
    await desktop.getByRole('button', { name: 'Confirmar cambio', exact: true }).click();
    await desktop.waitForTimeout(100);
    let changed = await snapshot(desktop);
    assert.ok(!changed.points.some((point) => point.id === outId) && changed.points.some((point) => point.id === inId), 'substitution replaces the on-pitch marker');
    await desktop.getByRole('button', { name: 'Reproducir partido', exact: true }).click();
    for (let sample = 0; sample < 8; sample++) {
      await desktop.waitForTimeout(180);
      changed = await snapshot(desktop);
      assert.ok(!changed.points.some((point) => point.id === outId), 'the queued animation cannot resurrect a substituted player');
    }
    await pause(desktop);
    const savedState = (await read(desktop)).activeMatch;
    await desktop.reload({ waitUntil: 'networkidle' });
    await desktop.getByRole('button', { name: /Continuar partida/ }).click();
    assert.deepEqual((await read(desktop)).activeMatch, savedState, 'reload preserves played events, scores and substitutions');
    checks.push('Substitution cannot revive an off-field player; save/reload preserves the played prefix');

    const terminal = fixtures.get('final-goal');
    await importFixture(desktop, terminal);
    const terminalGoal = terminal.presentation.sequences.find((sequence) => sequence.kind === 'goal');
    const terminalShot = terminal.presentation.sequences.find((sequence) => sequence.kind === 'shot' && sequence.eventId === terminalGoal.eventId);
    await desktop.getByRole('group', { name: 'Velocidad de reproducción', exact: true }).getByRole('button', { name: '4×', exact: true }).click();
    await desktop.getByRole('button', { name: 'Reproducir partido', exact: true }).click();
    await desktop.waitForFunction((id) => {
      const node = document.querySelector('[data-testid="live-pitch"]');
      return node?.dataset.sceneId === id && node?.dataset.scenePhase === 'approach';
    }, terminalShot.id, { timeout: 30000 });
    await pause(desktop);
    assert.deepEqual(await assertScore(desktop), [terminal.presentation.scoreBefore.home, terminal.presentation.scoreBefore.away], 'pausing the final-minute shot must not reveal its upcoming goal');
    assert.equal(await desktop.locator('.fm-live-event-full-time').count(), 0, 'the commentary must not reveal the final score before the last shot');
    await capture(desktop, 'desktop-final-shot-paused');
    await desktop.getByRole('button', { name: 'Reproducir partido', exact: true }).click();
    await desktop.waitForFunction((id) => document.querySelector('[data-testid="live-pitch"]')?.dataset.sceneId === id, terminalGoal.id);
    const terminalFrame = await snapshot(desktop);
    assertFrame(terminalFrame);
    observations.push({ kind: 'final-goal', seed: terminal.seed, minute: terminal.minute, frame: terminalFrame });
    const finalState = await read(desktop);
    assert.equal(finalState.activeMatch, null);
    assert.equal(finalState.round, terminal.roundBefore + 1);
    assert.equal(await desktop.getByTestId('manager-match-center').count(), 1, 'the final-minute goal retains the match centre after the reducer completes');
    await capture(desktop, 'desktop-final-minute-goal');
    await desktop.waitForTimeout(2500);
    assert.deepEqual(await assertScore(desktop), [terminal.score.home, terminal.score.away], 'final visible score equals the completed result');
    await desktop.getByRole('button', { name: 'Volver al despacho', exact: true }).click();
    assert.equal((await read(desktop)).tab, 'office');
    checks.push('Final-minute shot can pause without revealing its goal, then resume its celebration; round and final score are committed once');
    await desktop.close();

    for (const [name, viewport, preference] of [
      ['phone-reduced-motion', { width: 390, height: 844 }, 'reduce'],
      ['tablet', { width: 820, height: 1180 }, 'no-preference'],
    ]) {
      const page = await pageFor(viewport, preference);
      await importFixture(page, fixtures.get('penalty'), false);
      await observeSequence(page, fixtures.get('penalty'));
      await pause(page);
      await capture(page, name);
      if (preference === 'reduce') assert.ok(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
      await page.locator('.fm-tabs').getByRole('button', { name: 'Plantilla', exact: true }).click();
      const left = (await read(page)).activeMatch.minute;
      await page.waitForTimeout(400);
      assert.equal((await read(page)).activeMatch.minute, left, 'leaving the pitch cancels autoplay');
      await page.getByRole('button', { name: /Volver al banquillo/ }).click();
      assert.equal((await read(page)).activeMatch.minute, left);
      checks.push(`${name}: responsive set piece, pause, accessible controls and no background match advancement`);
      await page.close();
    }
    assert.deepEqual(errors, [], 'No uncaught browser errors');
    await fs.writeFile(`${output}/verification.json`, JSON.stringify({ checks, errors, consoleErrors, speedMeasurements, observations }, null, 2));
    console.log(JSON.stringify({ checks, errors }));
  } catch (error) {
    if (activePage && !activePage.isClosed()) {
      await activePage.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {});
      await fs.writeFile(`${output}/failure-state.json`, JSON.stringify(await read(activePage).catch(() => ({})), null, 2));
      await fs.writeFile(`${output}/failure-pitch.json`, JSON.stringify(await snapshot(activePage).catch(() => ({})), null, 2));
    }
    await fs.writeFile(`${output}/failure.json`, JSON.stringify({ message: error.message, stack: error.stack, checks, errors, consoleErrors, observations }, null, 2));
    throw error;
  } finally {
    await browser.close();
  }
}
