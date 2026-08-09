// @vitest-environment jsdom
/**
 * The live clock, mounted and actually run.
 *
 * `render.test.js` server-renders every screen, which catches anything that throws while a
 * component is being built. It cannot catch anything that only happens once the thing is
 * alive - effects, timers, a state machine that stops advancing - and that is precisely
 * where the last bug lived: the broadcast clock stopped at `moment`, the LAST chance of the
 * match, for every attempt. On a night worth two sights of goal it ran past the first, let
 * the player shoot at the second, and then hung for ever, because the "we have arrived"
 * announcement is keyed on where the clock was allowed to stop and that had not moved.
 *
 * So this file is the other half: jsdom, a real React root, and fake timers driving the
 * same requestAnimationFrame loop the player sees. It is deliberately only about the clock
 * and what it gates - there is no attempt here to test the whole interface.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  PHASES,
  agreeTerms,
  completeSigning,
  resolveEvent,
  signYouthClub,
  startCareer,
  playChance,
  takeShot,
  watchMatch,
} from "./career.js";
import { getCopy } from "./copy.js";
import { buildChance } from "./minigames.js";
import { SCREENS } from "./index.jsx";
import { world } from "./world.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const copy = getCopy("es");
const noop = () => {};

/** The clock is a rAF loop reading performance.now(), so both have to be faked. */
beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout", "clearTimeout", "Date"],
  });
});
afterEach(() => {
  vi.useRealTimers();
});

function mount(element) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(element));
  return {
    container,
    text: () => container.textContent ?? "",
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

/** Let the match run. Wrapped in `act` so React flushes everything the frames caused. */
function runClock(ms = 30_000) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** Click the first placement on offer. */
function shoot(container) {
  const button = [...container.querySelectorAll("button.tr-shot")].find((b) => !b.disabled);
  expect(button, "no placement to press").toBeTruthy();
  act(() => button.dispatchEvent(new window.MouseEvent("click", { bubbles: true })));
}

/**
 * A career sitting on a narrated decider worth exactly `chances` sights of goal.
 *
 * Forced rather than searched for: the point is the clock, and hunting seeds for a
 * two-chance narrated fixture would make the test slow and its failures hard to read.
 */
function narratedDecider(chances, seed = "clock") {
  let run = startCareer(
    { seed, surname: "MOLINA", number: 9, foot: "left", country: "ESP", position: "DC", mode: "intensa" },
    world,
  );
  run = completeSigning(agreeTerms(signYouthClub(run, run.offers[0].clubId)));
  run = resolveEvent(run, run.event.es.options[0].id);
  expect(run.phase).toBe(PHASES.MATCH);

  const { index, fixtures } = run.matchday;
  return watchMatch(
    {
      ...run,
      matchday: {
        ...run.matchday,
        fixtures: fixtures.map((fixture, i) => (i === index ? { ...fixture, chances } : fixture)),
        shot: { ...run.matchday.shot, mode: "match", chance: null },
        attempts: [],
        last: null,
        broadcast: null,
      },
    },
    "es",
  );
}

/** The match screen, holding its own run the way the game does. */
function Harness({ initial }) {
  const [run, setRun] = useState(initial);
  const Screen = SCREENS.match;
  return React.createElement(Screen, {
    run,
    locale: "es",
    onShoot: (choice) => setRun((prev) => takeShot(prev, choice)),
    onPlay: noop,
    onWatch: () => setRun((prev) => watchMatch(prev, "es")),
    onNext: noop,
  });
}

const show = (initial) => mount(React.createElement(Harness, { initial }));

describe("the live clock", () => {
  it("does not offer the shot before the match has reached it", () => {
    const view = show(narratedDecider(1));
    // Kick-off has happened; the chance has not.
    expect(view.text()).toContain(copy.match.waiting);
    expect(view.container.querySelectorAll("button.tr-shot")).toHaveLength(0);
    view.unmount();
  });

  it("counts up from nought and stops on the chance", () => {
    const run = narratedDecider(1);
    const view = show(run);
    runClock();
    expect(view.container.querySelectorAll("button.tr-shot").length).toBeGreaterThan(0);
    expect(view.text()).not.toContain(copy.match.waiting);
    view.unmount();
  });

  /**
   * The regression. Before the fix this hung: the second chance was never offered, because
   * the clock had already announced arriving at `moment` and could not do it twice.
   */
  it("asks again for every chance the fixture owes him", () => {
    const view = show(narratedDecider(2));

    runClock();
    expect(view.text()).toContain("Ocasión 1 de 2");
    shoot(view.container);

    // Back to watching: the match has to carry on to the second one.
    expect(view.text()).toContain(copy.match.waiting);
    expect(view.container.querySelectorAll("button.tr-shot")).toHaveLength(0);

    runClock();
    expect(view.text()).toContain("Ocasión 2 de 2");
    expect(view.container.querySelectorAll("button.tr-shot").length).toBeGreaterThan(0);
    view.unmount();
  });

  it("holds the result back until full time", () => {
    const view = show(narratedDecider(1));
    runClock();
    shoot(view.container);

    // Decided, but the match is still running and the verdict is not read out yet.
    expect(view.text()).not.toContain(copy.match.next);

    runClock();
    expect(view.text()).toContain(copy.match.next);
    expect(view.text()).toMatch(/90'/);
    view.unmount();
  });

  it("plays a night that never gives him the ball, and still finishes it", () => {
    const view = show(narratedDecider(0));
    runClock();
    // No placements were ever offered, and the match reached its end on its own.
    expect(view.container.querySelectorAll("button.tr-shot")).toHaveLength(0);
    expect(view.text()).toContain(copy.match.next);
    view.unmount();
  });

  it("gets there immediately when the player skips", () => {
    const view = show(narratedDecider(1));
    const skip = [...view.container.querySelectorAll("button")].find(
      (button) => button.textContent === copy.match.skip,
    );
    expect(skip, "no skip button").toBeTruthy();
    act(() => skip.dispatchEvent(new window.MouseEvent("click", { bubbles: true })));
    expect(view.container.querySelectorAll("button.tr-shot").length).toBeGreaterThan(0);
    view.unmount();
  });

  it("runs three chances end to end without ever stalling", () => {
    const view = show(narratedDecider(3));
    for (let n = 1; n <= 3; n += 1) {
      runClock();
      expect(view.text(), `stalled before chance ${n}`).toContain(`Ocasión ${n} de 3`);
      shoot(view.container);
    }
    runClock();
    expect(view.text()).toContain(copy.match.next);
    view.unmount();
  });
});

/**
 * The other half of the moment. The minigame track is the same kind of thing - a rAF loop
 * gating a decision - so it can stall in the same way, and nothing else in the suite ever
 * starts it.
 */
describe("the chance track", () => {
  /** A career sitting on a skill decider worth `chances` sights of goal. */
  function skillDecider(chances, shotType = "penal", seed = "track") {
    let run = startCareer(
      { seed, surname: "MOLINA", number: 9, foot: "left", country: "ESP", position: "DC", mode: "intensa" },
      world,
    );
    run = completeSigning(agreeTerms(signYouthClub(run, run.offers[0].clubId)));
    run = resolveEvent(run, run.event.es.options[0].id);
    const { index, fixtures } = run.matchday;
    const chance = buildChance({
      seed, season: run.season, fixtureId: fixtures[index].id, shotType, ovr: run.state.ovr,
    });
    return {
      ...run,
      matchday: {
        ...run.matchday,
        fixtures: fixtures.map((fixture, i) => (i === index ? { ...fixture, chances } : fixture)),
        shot: { ...run.matchday.shot, type: shotType, mode: "skill", chance },
        attempts: [],
        last: null,
        broadcast: null,
      },
    };
  }

  function SkillHarness({ initial }) {
    const [run, setRun] = useState(initial);
    const Screen = SCREENS.match;
    return React.createElement(Screen, {
      run,
      locale: "es",
      onShoot: noop,
      onPlay: (inputs) => setRun((prev) => playChance(prev, inputs)),
      onWatch: noop,
      onNext: noop,
    });
  }

  const strike = (container) => {
    const track = container.querySelector("button.tr-chance__track");
    expect(track, "no track to strike").toBeTruthy();
    act(() => track.dispatchEvent(new window.MouseEvent("click", { bubbles: true })));
  };

  const markerAt = (container) =>
    container.querySelector(".tr-chance__marker")?.getAttribute("style") ?? "";

  it("shows a track straight away, with no waiting and no placements", () => {
    const view = mount(React.createElement(SkillHarness, { initial: skillDecider(1) }));
    expect(view.container.querySelector("button.tr-chance__track")).toBeTruthy();
    expect(view.container.querySelectorAll("button.tr-shot")).toHaveLength(0);
    expect(view.text()).not.toContain(copy.match.waiting);
    view.unmount();
  });

  it("moves the marker while nobody presses anything", () => {
    const view = mount(React.createElement(SkillHarness, { initial: skillDecider(1) }));
    const before = markerAt(view.container);
    runClock(400);
    expect(markerAt(view.container)).not.toBe(before);
    view.unmount();
  });

  it("settles the whole chance on one strike, and resolves the fixture", () => {
    const view = mount(React.createElement(SkillHarness, { initial: skillDecider(1) }));
    runClock(200);
    strike(view.container);
    // One chance, so the decider is done and the verdict is on screen.
    expect(view.text()).toContain(copy.match.next);
    view.unmount();
  });

  it("wants both touches of a free kick before it settles anything", () => {
    const view = mount(React.createElement(SkillHarness, { initial: skillDecider(1, "falta") }));
    runClock(200);
    strike(view.container);
    // Still on the track, now asking for the second touch.
    expect(view.container.querySelector("button.tr-chance__track")).toBeTruthy();
    expect(view.text()).toContain("2");
    strike(view.container);
    expect(view.text()).toContain(copy.match.next);
    view.unmount();
  });

  it("gives him a fresh track for every chance the fixture owes", () => {
    const view = mount(React.createElement(SkillHarness, { initial: skillDecider(2) }));
    runClock(200);
    expect(view.text()).toContain("Ocasión 1 de 2");
    strike(view.container);

    // The second one is a new track, not the finished one left on screen.
    expect(view.text()).toContain("Ocasión 2 de 2");
    expect(view.container.querySelector("button.tr-chance__track")).toBeTruthy();
    expect(view.text()).not.toContain(copy.match.next);

    runClock(200);
    strike(view.container);
    expect(view.text()).toContain(copy.match.next);
    view.unmount();
  });
});
