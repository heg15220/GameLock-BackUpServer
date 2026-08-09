/**
 * Every screen, actually rendered.
 *
 * This project has no jsdom and no testing library, so until now every file here was
 * checked as pure logic and the JSX was checked by being read. Three bugs shipped through
 * that gap in a row, and all three were the same shape - code that is only ever executed
 * when a component renders:
 *
 *   - a `useEffect` whose dependency array read a `const` declared twenty lines below it,
 *     which is a temporal dead zone crash the moment the phase opens;
 *   - a reveal timer that jumped straight past its own build-up;
 *   - copy keys referenced from JSX that did not exist in the table.
 *
 * `react-dom/server` needs no DOM: it runs the component body, every hook that is not an
 * effect, and the whole tree. That is exactly where all three live. It will not catch
 * anything that only happens after mount - effects, timers, clicks - and it is not trying
 * to; it is the cheapest thing that would have caught what actually broke.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  PHASES,
  acceptOffer,
  agreeTerms,
  completeSigning,
  nextFixture,
  openMarket,
  playChance,
  resolveEvent,
  signYouthClub,
  startCareer,
  takeShot,
  watchMatch,
} from "./career.js";
import { SCREENS } from "./index.jsx";
import { world } from "./world.js";

const noop = () => {};

const start = (seed = "render") =>
  startCareer(
    { seed, surname: "MOLINA", number: 9, foot: "left", country: "ESP", position: "DC", mode: "intensa" },
    world,
  );

/** Everything any screen might ask for. Extra props are ignored; missing ones crash. */
const handlers = {
  onStart: noop, onSign: noop, onResolve: noop, onAsk: noop, onAgree: noop, onBack: noop,
  onDone: noop, onShoot: noop, onPlay: noop, onWatch: noop, onNext: noop, onPick: noop,
  onSwitchNationality: noop, onAcceptClause: noop, onRefuseClause: noop, onRestart: noop,
};

const draw = (phase, run, extra = {}) => {
  const Screen = SCREENS[phase];
  expect(Screen, `no screen for phase "${phase}"`).toBeTruthy();
  return renderToStaticMarkup(
    React.createElement(Screen, { run, locale: extra.locale ?? "es", ...handlers, ...extra }),
  );
};

/** Drive a career to each phase in turn, rendering it as we arrive. */
function walk(seed, locale) {
  const seen = new Set();
  let run = start(seed);

  draw(PHASES.YOUTH, run, { locale });
  seen.add(PHASES.YOUTH);

  run = signYouthClub(run, run.offers[0].clubId);
  draw(PHASES.NEGOTIATION, run, { locale });
  seen.add(PHASES.NEGOTIATION);

  run = agreeTerms(run);
  draw(PHASES.SIGNING, run, { locale });
  seen.add(PHASES.SIGNING);

  run = completeSigning(run);

  let guard = 0;
  while (run.phase !== PHASES.RETIRED && guard < 600) {
    guard += 1;
    if (run.phase === PHASES.EVENT) {
      draw(PHASES.EVENT, run, { locale });
      seen.add(PHASES.EVENT);
      run = resolveEvent(run, run.event.es.options[0].id);
      continue;
    }
    if (run.phase === PHASES.MATCH) {
      const { shot } = run.matchday;
      // Both modes, and a fixture that owes him nothing, all render from here.
      if (shot.mode === "match") run = watchMatch(run, locale);
      draw(PHASES.MATCH, run, { locale });
      seen.add(PHASES.MATCH);

      if (run.matchday.last) {
        run = nextFixture(run, locale);
      } else if (shot.mode === "skill") {
        const aim = shot.chance.gates ?? [shot.chance.target];
        run = playChance(run, shot.chance.gates ? aim : aim[0]);
      } else {
        run = takeShot(run, shot.options[0]);
      }
      // Render again once the moment has been resolved: the result branch is its own tree.
      if (run.phase === PHASES.MATCH && run.matchday.last) {
        draw(PHASES.MATCH, run, { locale });
        run = nextFixture(run, locale);
      }
      continue;
    }
    if (run.phase === PHASES.SEASON) {
      draw(PHASES.SEASON, run, { locale });
      seen.add(PHASES.SEASON);
      run = openMarket(run, locale);
      continue;
    }
    if (run.phase === PHASES.MARKET) {
      draw(PHASES.MARKET, run, { locale });
      seen.add(PHASES.MARKET);
      run = acceptOffer(run, (run.offers.find((o) => o.stay) ?? run.offers[0]).clubId);
      run = completeSigning(agreeTerms(run));
      continue;
    }
    break;
  }

  if (run.phase === PHASES.RETIRED) {
    draw(PHASES.RETIRED, run, { locale });
    seen.add(PHASES.RETIRED);
  }
  return { seen, run };
}

describe("every screen renders", () => {
  it("walks a whole career in Spanish without throwing", () => {
    const { seen, run } = walk("render-es", "es");
    expect(run.phase).toBe(PHASES.RETIRED);
    // Everything except the setup screen, which has no run behind it.
    for (const phase of Object.values(PHASES)) {
      expect(seen.has(phase), `never rendered the "${phase}" screen`).toBe(true);
    }
  });

  it("walks a whole career in English without throwing", () => {
    expect(walk("render-en", "en").run.phase).toBe(PHASES.RETIRED);
  });

  it("renders the setup screen, which has no career behind it", () => {
    for (const locale of ["es", "en"]) {
      const html = draw("setup", null, { locale });
      expect(html.length).toBeGreaterThan(200);
    }
  });

  /**
   * A missing copy key renders as the word "undefined" rather than as a crash, which is
   * the quietest failure this interface has. `copy.test.js` checks the keys exist; this
   * checks nothing reached for one that does not, including through a computed lookup it
   * cannot see.
   */
  it("never prints the word undefined at the player", () => {
    for (const locale of ["es", "en"]) {
      let run = start(`undef-${locale}`);
      const screens = [
        () => draw(PHASES.YOUTH, run, { locale }),
        () => draw("setup", null, { locale }),
      ];
      for (const render of screens) {
        const html = render();
        expect(html).not.toMatch(/>undefined</);
        expect(html).not.toMatch(/undefined</);
      }
    }
  });

  it("renders a decider that never gives him a sight of goal", () => {
    // The 0-chance fixture used to wait for an input that could not come.
    let found = false;
    for (let i = 0; i < 40 && !found; i += 1) {
      let run = start(`none-${i}`);
      run = completeSigning(agreeTerms(signYouthClub(run, run.offers[0].clubId)));
      let guard = 0;
      while (run.phase !== PHASES.MATCH && run.phase !== PHASES.RETIRED && guard < 10) {
        guard += 1;
        if (run.phase === PHASES.EVENT) run = resolveEvent(run, run.event.es.options[0].id);
        else break;
      }
      if (run.phase !== PHASES.MATCH) continue;
      if ((run.matchday.fixtures[run.matchday.index].chances ?? 1) !== 0) continue;
      found = true;
      if (run.matchday.shot.mode === "match") run = watchMatch(run, "es");
      // It settles itself, so the screen has a result to draw straight away.
      expect(run.matchday.last).toBeTruthy();
      expect(run.matchday.last.absent).toBe(true);
      expect(draw(PHASES.MATCH, run).length).toBeGreaterThan(200);
    }
    expect(found, "no seed produced a fixture with no chances").toBe(true);
  });
});
