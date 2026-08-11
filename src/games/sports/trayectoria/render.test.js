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
import { SHOT_LABELS, getCopy } from "./copy.js";
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

  /** A career sat on a decider that gives him no sight of goal. */
  const untouchedRun = () => {
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
      return watchMatch(run, "es");
    }
    return null;
  };

  it("plays out a decider that never gives him a sight of goal", () => {
    // Such a night is always the watched mode - see modeFor. It used to be able to come up
    // as "tu momento", which is a mode with nothing in it: the fixture settles itself so
    // there is nothing to press, and the ninety minutes are only built for the other mode,
    // so there was nothing to read either. The screen named a chance that never came and
    // printed a verdict, with nothing in between.
    const run = untouchedRun();
    expect(run, "no seed produced a fixture with no chances").toBeTruthy();
    expect(run.matchday.shot.mode).toBe("match");
    // It settles on arrival - the clock must never stop on a chance that cannot come.
    expect(run.matchday.last).toBeTruthy();
    expect(run.matchday.last.absent).toBe(true);
    // And it has ninety minutes to show, already carried through to full time.
    expect(run.matchday.broadcast).toBeTruthy();
    expect(run.matchday.broadcast.finish).toBeTruthy();

    const html = draw(PHASES.MATCH, run);
    expect(html).toContain("tr-live__feed");
    expect(html).toContain(getCopy("es").match.modeWatch);
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

  /**
   * A live decider that still owes him at least one chance, sat exactly where the screen
   * opens: the clock at kick-off, nothing reached yet. `renderToStaticMarkup` runs no
   * effects, so `reached` stays false and this is the first frame the player sees.
   */
  const pendingLiveRun = () => {
    for (let i = 0; i < 80; i += 1) {
      let run = start(`live-${i}`);
      run = completeSigning(agreeTerms(signYouthClub(run, run.offers[0].clubId)));
      let guard = 0;
      while (run.phase !== PHASES.MATCH && run.phase !== PHASES.RETIRED && guard < 10) {
        guard += 1;
        if (run.phase === PHASES.EVENT) run = resolveEvent(run, run.event.es.options[0].id);
        else break;
      }
      if (run.phase !== PHASES.MATCH) continue;
      if (run.matchday.shot.mode !== "match") continue;
      if ((run.matchday.fixtures[run.matchday.index].chances ?? 1) < 1) continue;
      run = watchMatch(run, "es");
      if (run.matchday.last) continue;
      return run;
    }
    return null;
  };

  it("never names the chance before the broadcast reaches it", () => {
    // The whole point of the live mode is that the match happens to you in order. The
    // screen used to print "Cabezazo al área" - and draw the cross coming in for it -
    // above a feed still sitting on the kick-off, so you knew you were getting a header
    // in the box before a ball had been kicked.
    const run = pendingLiveRun();
    expect(run, "no seed produced a live decider that owes him a chance").toBeTruthy();
    const { shot } = run.matchday;

    for (const locale of ["es", "en"]) {
      const copy = getCopy(locale);
      const html = draw(PHASES.MATCH, run, { locale });

      expect(html).not.toContain(SHOT_LABELS[locale][shot.type]);
      // Nor drawn: the wall, the spot and the cross say which chance it is without words.
      expect(html).not.toContain("tr-scene");
      // Nor counted: "Ocasión 1 de 2" gives away that the ball is coming at all. Checked
      // by class, because the pips in the header carry the same words about a different
      // thing - which of the season's three deciders this is - and those are no secret.
      expect(html).not.toContain("tr-match__tally");

      // What is left still has to read as a live match with something pending.
      expect(html).toContain(copy.match.modeWatch);
      expect(html).toContain(copy.match.shotPending);
      expect(html).toContain(copy.match.waiting);
    }
  });

  it("names the chance straight away when the ball is at his feet", () => {
    // The gate above is for the live mode only. In the played mode the shot type IS the
    // question being asked, so hiding it would leave the screen with nothing on it.
    for (let i = 0; i < 60; i += 1) {
      let run = start(`feet-${i}`);
      run = completeSigning(agreeTerms(signYouthClub(run, run.offers[0].clubId)));
      if (run.phase === PHASES.EVENT) run = resolveEvent(run, run.event.es.options[0].id);
      if (run.phase !== PHASES.MATCH) continue;
      const { shot } = run.matchday;
      if (shot.mode !== "skill") continue;
      if ((run.matchday.fixtures[run.matchday.index].chances ?? 1) < 1) continue;

      const html = draw(PHASES.MATCH, run);
      expect(html).toContain(SHOT_LABELS.es[shot.type]);
      expect(html).toContain("tr-scene");
      expect(html).not.toContain(getCopy("es").match.shotPending);
      return;
    }
    throw new Error("no seed produced a playable skill decider");
  });

  /**
   * A real career sat on its first season page.
   *
   * The engine only relegates a top-flight club whose effective domestic reputation has
   * reached zero (see `rollSeason`), which a career that keeps climbing may never be, so
   * driving seeds until one goes down is not a test, it is a wait. The screen's contract
   * is `record.relegated`, so that is what gets set: whether the engine produces the flag
   * is engine.test.js's business, and what the report does with it is this file's.
   */
  const seasonRun = (seed = "down") => {
    let run = start(seed);
    run = completeSigning(agreeTerms(signYouthClub(run, run.offers[0].clubId)));
    let guard = 0;
    while (run.phase !== PHASES.SEASON && run.phase !== PHASES.RETIRED && guard < 400) {
      guard += 1;
      if (run.phase === PHASES.EVENT) {
        run = resolveEvent(run, run.event.es.options[0].id);
      } else if (run.phase === PHASES.MATCH) {
        const { shot } = run.matchday;
        if (shot.mode === "match" && !run.matchday.broadcast) run = watchMatch(run, "es");
        if (run.matchday.last) run = nextFixture(run, "es");
        else if (shot.mode === "skill") {
          const aim = shot.chance.gates ?? [shot.chance.target];
          run = playChance(run, shot.chance.gates ? aim : aim[0]);
        } else run = takeShot(run, shot.options[0]);
        if (run.phase === PHASES.MATCH && run.matchday.last) run = nextFixture(run, "es");
      } else break;
    }
    return run;
  };

  const withRelegation = (run) => ({
    ...run,
    seasonResults: run.seasonResults.map((result, i) =>
      i === 0 ? { ...result, record: { ...result.record, relegated: true } } : result,
    ),
  });

  it("gives the drop the screen when the club goes down", () => {
    // Going down was one red word in the same strip that reports a served suspension.
    // It is the biggest thing that can happen to a club in a season, so it gets the
    // screen the way a trophy does - before the front page, not inside it.
    const base = seasonRun();
    expect(base.phase).toBe(PHASES.SEASON);
    const run = withRelegation(base);
    const club = world.clubs[run.seasonResults[0].record.clubId];

    for (const locale of ["es", "en"]) {
      const copy = getCopy(locale);
      const html = draw(PHASES.SEASON, run, { locale });
      // A step that also won something queues the cups first; the drop is still coming.
      if (html.includes("tr-ceremony")) continue;

      expect(html).toContain("tr-drop");
      expect(html).toContain(copy.season.relegationEyebrow);
      expect(html).toContain(copy.season.relegated);
      expect(html).toContain(club.shortName ?? club.name);
      // The line it falls through is the whole image; without it this is just a word.
      expect(html).toContain("tr-drop__line");
    }
  });

  it("keeps the drop off a season the club survived", () => {
    // The overlay is absolutely positioned over the stage, so one that renders when it
    // should not does not merely look wrong - it covers the report underneath it.
    const run = seasonRun("survived");
    expect(run.phase).toBe(PHASES.SEASON);
    expect(run.seasonResults.some((result) => result.record.relegated)).toBe(false);
    expect(draw(PHASES.SEASON, run)).not.toContain("tr-drop");
  });

  it("calls a night the ball never came to him neither a goal nor a save", () => {
    // It used to print the keeper's verdict and reveal the gap of a shot nobody took,
    // which contradicts the narration the same screen has just finished reading out.
    //
    // The half of this that used to be markup is now behind the clock: such a night is
    // always watched, so its verdict waits for full time and `renderToStaticMarkup` runs
    // no effects and never gets there. What the verdict WILL say is checked on the copy
    // the screen reaches for, which is where a renamed or missing key would break; what
    // must never appear at all is still checked on the markup, and "never" includes the
    // ninety minutes before the verdict lands.
    const run = untouchedRun();
    expect(run, "no seed produced a fixture with no chances").toBeTruthy();

    for (const locale of ["es", "en"]) {
      const copy = getCopy(locale);
      const html = draw(PHASES.MATCH, run, { locale });

      // Neither won nor lost by him: the trophy settles at DECIDES.absent, and that is
      // the branch the screen will take, because `last.absent` is what picks it.
      expect(run.matchday.last.absent).toBe(true);
      const verdicts = copy.match.decides[run.matchday.last.decides];
      expect(verdicts.none).toBeTruthy();
      expect(copy.match.absent).toBeTruthy();
      expect(copy.match.absentNote).toBeTruthy();

      expect(html).not.toContain(copy.match.saved);
      expect(html).not.toContain(copy.match.scored);
      expect(html).not.toContain(verdicts.yes);
      expect(html).not.toContain(verdicts.no);
      // No gap named and none ringed, because there was no shot to have missed it.
      expect(html).not.toContain(copy.match.gapWas.split("{")[0]);
      expect(html).not.toContain("tr-scene__gap");
      // And the card is marked as its own state, not as a miss.
      expect(html).toContain("is-absent");
      expect(html).not.toContain("is-saved");
    }
  });
});
