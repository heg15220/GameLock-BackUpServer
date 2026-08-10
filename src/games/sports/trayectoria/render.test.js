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
import { getCopy } from "./copy.js";
import { SCREENS } from "./index.jsx";
import { playableCountries, world } from "./world.js";

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

  it("draws a mark on every answer to a decision", () => {
    // `scene.test.js` proves every option HAS a glyph; this proves the button actually
    // renders it, which is the half a data table cannot check.
    for (let i = 0; i < 30; i += 1) {
      let run = start(`option-mark-${i}`);
      run = completeSigning(agreeTerms(signYouthClub(run, run.offers[0].clubId)));
      if (run.phase !== PHASES.EVENT) continue;

      const html = draw(PHASES.EVENT, run);
      const options = run.event.es.options.length;
      expect(options).toBeGreaterThan(1);
      // One disc per answer, and an actual drawn glyph inside each of them.
      expect((html.match(/tr-option__mark/g) ?? []).length).toBe(options);
      expect((html.match(/<span class="tr-option__mark"><svg/g) ?? []).length).toBe(options);
      return;
    }
    throw new Error("no seed opened a decision card");
  });

  it("offers every playable country by its flag, with one of them chosen", () => {
    // It was a <select>, and a native <option> cannot carry an image - so the field about
    // where you are from was the one with nothing to look at.
    const countries = playableCountries();
    expect(countries.length).toBeGreaterThan(10);

    for (const locale of ["es", "en"]) {
      const html = draw("setup", null, { locale });
      expect(html.match(/class="tr-flagpick/g) ?? []).toHaveLength(countries.length);
      // Exactly one country is selected, marked both for the eye and for a screen reader.
      // Scoped to the picker: the foot and the mode carry `aria-pressed` of their own.
      expect((html.match(/tr-flagpick is-on" aria-pressed="true"/g) ?? []).length).toBe(1);
      expect((html.match(/tr-flagpick" aria-pressed="true"/g) ?? []).length).toBe(0);
      for (const country of countries) {
        expect(html).toContain(locale === "es" ? country.name_es : country.name_en);
      }
      // A flag element per country, not a single one beside a dropdown.
      expect((html.match(/class="tr-flag[ "]/g) ?? []).length).toBeGreaterThanOrEqual(
        countries.length,
      );
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

  /** A career sat on a decider that gives him no sight of goal, in the mode asked for. */
  const untouchedRun = (mode) => {
    for (let i = 0; i < 60; i += 1) {
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
      if (run.matchday.shot.mode !== mode) continue;
      return run.matchday.shot.mode === "match" ? watchMatch(run, "es") : run;
    }
    return null;
  };

  it("renders a decider that never gives him a sight of goal", () => {
    // The 0-chance fixture used to wait for an input that could not come, in both the
    // mode where the ball is at his feet and the one where the match plays out around him.
    for (const mode of ["skill", "match"]) {
      const run = untouchedRun(mode);
      expect(run, `no seed produced a ${mode} fixture with no chances`).toBeTruthy();
      // It settles itself, so the screen has a result to draw straight away.
      expect(run.matchday.last).toBeTruthy();
      expect(run.matchday.last.absent).toBe(true);
      expect(draw(PHASES.MATCH, run).length).toBeGreaterThan(200);
    }
  });

  it("prints a goalkeeper's verdict as a save rather than as a goal", () => {
    // Same screen, same code path, different position: the keeper's decider must never
    // read "GOL", and the line under it names where the shot went, not where a gap was.
    for (let i = 0; i < 40; i += 1) {
      let run = startCareer(
        { seed: `por-${i}`, surname: "MOLINA", number: 1, foot: "left", country: "ESP", position: "POR", mode: "intensa" },
        world,
      );
      run = completeSigning(agreeTerms(signYouthClub(run, run.offers[0].clubId)));
      if (run.phase === PHASES.EVENT) run = resolveEvent(run, run.event.es.options[0].id);
      if (run.phase !== PHASES.MATCH) continue;
      const { shot } = run.matchday;
      if (shot.mode !== "skill" || (run.matchday.fixtures[run.matchday.index].chances ?? 1) === 0) continue;

      expect(shot.produces).toBe("stop");
      // Dead on the target, so the chance is converted and the verdict is the good one.
      const aim = shot.chance.gates ?? [shot.chance.target];
      run = playChance(run, shot.chance.gates ? aim : aim[0]);
      if (!run.matchday.last) continue;
      expect(run.matchday.last.scored).toBe(true);

      for (const locale of ["es", "en"]) {
        const copy = getCopy(locale);
        const html = draw(PHASES.MATCH, run, { locale });
        expect(html).toContain(copy.match.verdicts.stop.won);
        expect(html).not.toContain(copy.match.verdicts.goal.won);
        // "La puso: ..." rather than "El hueco: ..." - it was the striker who chose.
        expect(html).toContain(copy.match.verdicts.stop.gap.split("{")[0]);
        expect(html).not.toContain(copy.match.gapWas.split("{")[0]);
      }
      return;
    }
    throw new Error("no seed produced a playable goalkeeper decider");
  });

  it("calls a night the ball never came to him neither a goal nor a save", () => {
    // It used to print the keeper's verdict and reveal the gap of a shot nobody took,
    // which contradicts the narration the same screen has just finished reading out.
    // Checked on the played mode, because that one draws its result without waiting on a
    // clock - the markup below is the same on both.
    const run = untouchedRun("skill");
    expect(run, "no seed produced a skill fixture with no chances").toBeTruthy();

    for (const locale of ["es", "en"]) {
      const copy = getCopy(locale);
      const html = draw(PHASES.MATCH, run, { locale });
      expect(html).toContain(copy.match.absent);
      expect(html).not.toContain(copy.match.saved);
      expect(html).not.toContain(copy.match.scored);
      // No gap named and none ringed, because there was no shot to have missed it.
      expect(html).not.toContain(copy.match.gapWas.split("{")[0]);
      expect(html).not.toContain("tr-scene__gap");
      // Neither won nor lost by him: the trophy settles at DECIDES.absent.
      const verdicts = copy.match.decides[run.matchday.last.decides];
      expect(html).toContain(verdicts.none);
      expect(html).not.toContain(verdicts.yes);
      expect(html).not.toContain(verdicts.no);
      // And the card is marked as its own state, not as a miss.
      expect(html).toContain("is-absent");
      expect(html).not.toContain("is-saved");
    }
  });
});
