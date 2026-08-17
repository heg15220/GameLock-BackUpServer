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
  liveTiesOf,
  nextTie,
  resolveEvent,
  signYouthClub,
  startCareer,
  playChance,
  takeShot,
  watchMatch,
} from "./career.js";
import { entrantsFor } from "./qualified.js";
import { simulateTournamentRun } from "./tournaments.js";
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

  /**
   * The feed has to say what just happened, on the minute it happened.
   *
   * It used to narrate every chance in one batch at full time, because that is when
   * `narrateFinish` was called. On a night worth three, the player took the first one and
   * the match simply carried on: no line saying whether it went in, and a scoreboard still
   * reading what it read before he shot. He was being asked for the second one without
   * being told how the first had gone.
   */
  it("tells him how each chance went, on the spot", () => {
    const view = show(narratedDecider(3));
    const said = () => view.container.querySelector(".tr-live__feed")?.textContent ?? "";
    const score = () => view.container.querySelector(".tr-live__score")?.textContent ?? "";

    runClock();
    const before = { feed: said(), score: score() };
    shoot(view.container);

    // Something was said about it, and it was said before the next one is asked for.
    const told = [...copy.match.beats.scored, ...copy.match.beats.missed].some((line) =>
      said().includes(line.replace(/\{\w+\}/g, "")),
    );
    expect(told, `nothing was said about the first chance: ${said()}`).toBe(true);
    expect(said()).not.toBe(before.feed);

    // And the verdict for the whole fixture is still not out - the match is still running.
    expect(view.text()).not.toContain(copy.match.next);
    view.unmount();
  });

  it("puts a chance that goes in on the scoreboard straight away", () => {
    const run = narratedDecider(3);
    const view = show(run);
    const score = () => view.container.querySelector(".tr-live__score")?.textContent ?? "";

    runClock();
    const before = score();
    // The placement the keeper is not at: this one goes in, so the board has to move.
    const buttons = [...view.container.querySelectorAll("button.tr-shot")];
    const gap = buttons[run.matchday.shot.gap];
    expect(gap?.disabled, "the gap is not on offer").toBeFalsy();
    act(() => gap.dispatchEvent(new window.MouseEvent("click", { bubbles: true })));

    expect(score(), `board stuck on ${before}`).not.toBe(before);
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
    const track = container.querySelector("button.tr-chance__stage");
    expect(track, "no pitch to strike on").toBeTruthy();
    act(() => track.dispatchEvent(new window.MouseEvent("click", { bubbles: true })));
  };

  /*
   * Where the sight is, now that the chance is played on a pitch rather than on a bar.
   * The marker used to be a span positioned by a CSS custom property; it is a line across
   * the goal mouth, so its position is an SVG attribute and not a style string.
   */
  const markerAt = (container) =>
    container.querySelector(".tr-play__sight")?.getAttribute("x1") ?? "";

  it("shows a track straight away, with no waiting and no placements", () => {
    const view = mount(React.createElement(SkillHarness, { initial: skillDecider(1) }));
    expect(view.container.querySelector("button.tr-chance__stage")).toBeTruthy();
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
    expect(view.container.querySelector("button.tr-chance__stage")).toBeTruthy();
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

    /*
     * The tally moves at once - he has taken one of two and the screen says so - but the
     * SURFACE waits. There is only ever one pitch on this screen: while the drawing is
     * holding the shot just taken, the thing you play stands down, and it comes back when
     * the drawing lets go. See `showPlay` in MatchScreen.
     */
    expect(view.text()).toContain("Ocasión 2 de 2");
    expect(
      view.container.querySelector("button.tr-chance__stage"),
      "la superficie vuelve antes de que se vea el disparo anterior",
    ).toBeNull();
    expect(view.text()).not.toContain(copy.match.next);

    // The beat passes, and the second one is a new track rather than the finished one.
    runClock(2000);
    expect(view.container.querySelector("button.tr-chance__stage")).toBeTruthy();
    strike(view.container);
    expect(view.text()).toContain(copy.match.next);
    view.unmount();
  });

  /**
   * The four verbs that are not a tap.
   *
   * A hold, a drag and a two-beat all commit through pointer handlers, and a pointer
   * handler that never fires is a chance the player cannot play at all - the screen simply
   * sits there while the season waits. The tap games have been mounted since the first
   * version; these had nothing starting them, so this is where they get started.
   */
  describe("the held ones", () => {
    const surface = (container) => {
      const el = container.querySelector("button.tr-chance__stage");
      expect(el, "no surface to play").toBeTruthy();
      return el;
    };

    /** jsdom has no PointerEvent, and React only cares about the event's type. */
    const point = (el, type, x = 0.5, y = 0.5) =>
      act(() =>
        el.dispatchEvent(new window.MouseEvent(type, { bubbles: true, clientX: x, clientY: y })),
      );

    const play = (shotType) => {
      const view = mount(
        React.createElement(SkillHarness, { initial: skillDecider(1, shotType, `hold-${shotType}`) }),
      );
      return view;
    };

    it("settles a charge when the hold is released", () => {
      const view = play("volea");
      const el = surface(view.container);
      point(el, "pointerdown");
      runClock(300);
      expect(view.text(), "settled before it was let go").not.toContain(copy.match.next);
      point(el, "pointerup");
      expect(view.text()).toContain(copy.match.next);
      view.unmount();
    });

    it("takes a charge away from anyone who never lets go", () => {
      const view = play("volea");
      point(surface(view.container), "pointerdown");
      // Past the top of the bar: over it, and the fixture resolves without a release.
      runClock(4000);
      expect(view.text()).toContain(copy.match.next);
      view.unmount();
    });

    it("settles an aim where the drag is released", () => {
      const view = play("cabezazo");
      const el = surface(view.container);
      point(el, "pointerdown", 0.3, 0.4);
      point(el, "pointermove", 0.6, 0.5);
      runClock(120);
      expect(view.text()).not.toContain(copy.match.next);
      point(el, "pointerup", 0.6, 0.5);
      expect(view.text()).toContain(copy.match.next);
      view.unmount();
    });

    it("moves the aim target while it is being tracked", () => {
      const view = play("cabezazo");
      const spot = () =>
        view.container.querySelector(".tr-play__disc")?.getAttribute("cx") ?? "";
      const before = spot();
      runClock(300);
      expect(spot(), "the target is standing still").not.toBe(before);
      view.unmount();
    });

    it("takes the aim away from anyone who never goes for it", () => {
      const view = play("cabezazo");
      surface(view.container);
      // The run finishes with nobody on it: the ball went through and he was not there.
      runClock(4000);
      expect(view.text()).toContain(copy.match.next);
      view.unmount();
    });

    it("settles a dive on the side the swipe ended", () => {
      const view = play("parada_penal");
      const el = surface(view.container);
      runClock(200);
      point(el, "pointerdown", 0.2, 0.5);
      point(el, "pointermove", 0.8, 0.5);
      expect(view.text()).not.toContain(copy.match.next);
      point(el, "pointerup", 0.8, 0.5);
      expect(view.text()).toContain(copy.match.next);
      view.unmount();
    });

    it("takes the dive away from a keeper who never goes", () => {
      const view = play("parada_penal");
      surface(view.container);
      runClock(4000);
      expect(view.text()).toContain(copy.match.next);
      view.unmount();
    });

    it("measures a feint by the beat between the two touches", () => {
      const view = play("mano_a_mano");
      const el = surface(view.container);
      act(() => el.dispatchEvent(new window.MouseEvent("click", { bubbles: true })));
      // The dummy is sold; the prompt changes and nothing has been decided yet.
      expect(view.text()).toContain(copy.match.chanceGo);
      expect(view.text()).not.toContain(copy.match.next);
      runClock(400);
      act(() => el.dispatchEvent(new window.MouseEvent("click", { bubbles: true })));
      expect(view.text()).toContain(copy.match.next);
      view.unmount();
    });

    it("takes the feint away from anyone who never goes", () => {
      const view = play("mano_a_mano");
      act(() =>
        surface(view.container).dispatchEvent(new window.MouseEvent("click", { bubbles: true })),
      );
      runClock(4000);
      expect(view.text()).toContain(copy.match.next);
      view.unmount();
    });
  });

  /**
   * ONE PITCH, NEVER TWO.
   *
   * The situation drawing and the play surface are now the same stadium - same goal, same
   * net, same figures - so showing both stacked drew it twice and asked the player to work
   * out which of the two he was allowed to touch. It did not fit either: two 5:3 pitches
   * plus the masthead is taller than a phone's stage, so the thing you actually play was
   * under the fold. In the played mode the surface IS the picture, and the scene only comes
   * back for the beat a result is being held on.
   */
  it("never draws the stadium twice on one screen", () => {
    const view = mount(React.createElement(SkillHarness, { initial: skillDecider(2) }));
    const pitches = () => view.container.querySelectorAll(".tr-pitch").length;

    expect(pitches(), "dos campos a la vez al abrirse").toBe(1);
    expect(view.container.querySelector("button.tr-chance__stage")).toBeTruthy();
    expect(view.container.querySelector(".tr-scene"), "la escena no se apartó").toBeNull();

    // Take one: the drawing takes the screen and the surface stands down.
    strike(view.container);
    expect(pitches(), "dos campos a la vez mientras se ve el disparo").toBe(1);
    expect(view.container.querySelector(".tr-scene")).toBeTruthy();

    // And back again for the next chance.
    runClock(2000);
    expect(pitches(), "dos campos a la vez en la ocasión siguiente").toBe(1);
    expect(view.container.querySelector("button.tr-chance__stage")).toBeTruthy();
    view.unmount();
  });

  /**
   * And the same release in the played mode, which has no clock to wait for.
   *
   * The narrated one holds the picture of the shot just taken while the match runs on to
   * the next chance; here the next minigame mounts immediately, so the hold is a beat of
   * its own (`SHOT_HOLD`). Without it the second chance was played over a frozen drawing
   * of the first - keeper on the floor, ball already in the net.
   */
  it("lets the drawing go on its own once the beat is up", () => {
    const view = mount(
      React.createElement(SkillHarness, { initial: skillDecider(2, "penal", "reset-skill") }),
    );
    const sceneClass = () =>
      view.container.querySelector(".tr-scene")?.getAttribute("class") ?? "";
    const resolved = () => /is-scored|is-saved|is-absent/.test(sceneClass());

    const stage = view.container.querySelector("button.tr-chance__stage");
    expect(stage, "no surface to play").toBeTruthy();
    act(() => stage.dispatchEvent(new window.MouseEvent("click", { bubbles: true })));
    expect(resolved(), "nothing drawn after the first chance").toBe(true);

    // The beat passes and the figures go back to where a chance starts.
    runClock(3000);
    expect(resolved(), "la segunda ocasión se juega sobre el dibujo de la primera").toBe(false);
    // And there is still a chance to play, so this is a reset and not a finished fixture.
    expect(view.container.querySelector("button.tr-chance__stage")).toBeTruthy();
    view.unmount();
  });

});

/**
 * The drawing has to be a drawing of the shot that was just taken.
 *
 * It was keyed to the FIXTURE outcome, whose `scored` means "any of them went in". On a
 * night worth two that put the goal on the wrong moment in both directions: score the first
 * and nothing was drawn at all, because the fixture was not closed yet; then miss the second
 * and the ball flew in green, because the first one had gone in.
 */
describe("the scene under a multi-chance decider", () => {
  const sceneClass = (container) =>
    container.querySelector(".tr-scene")?.getAttribute("class") ?? "";

  it("draws the goal on the chance that went in, and the miss on the one that did not", () => {
    const view = show(narratedDecider(2));

    runClock();
    // Convert the first: the placement the keeper is not at.
    const first = [...view.container.querySelectorAll("button.tr-shot")];
    const run = narratedDecider(2);
    act(() =>
      first[run.matchday.shot.gap].dispatchEvent(new window.MouseEvent("click", { bubbles: true })),
    );
    expect(sceneClass(view.container), "no drawing after a goal").toContain("is-scored");

    // Miss the second.
    runClock();
    const second = [...view.container.querySelectorAll("button.tr-shot")].filter((b) => !b.disabled);
    const wrong = second.find((_, i) => i !== run.matchday.shot.gap) ?? second[0];
    act(() => wrong.dispatchEvent(new window.MouseEvent("click", { bubbles: true })));
    runClock();

    // The fixture went in - one of them did - but the picture is of the shot that missed.
    expect(view.text()).toContain(copy.match.next);
    expect(sceneClass(view.container), "a goal drawn over a miss").not.toContain("is-scored");
    view.unmount();
  });
});


/**
 * The knockout queue, mounted and clicked through.
 *
 * Four ties in a season is four separate ninety minutes on one screen, and `Broadcast` keeps
 * the clock in a ref: without a key per tie, the second night opened with the clock already
 * on ninety and its arrival effect already spent, which is a finished match with no button
 * on it and a career that cannot continue. `render.test.js` cannot see that - it renders
 * once and never advances - so it is checked here, where the thing is alive.
 */
function knockoutQueue(seed = "queue-clock") {
  let run = startCareer(
    { seed, surname: "MOLINA", number: 9, foot: "left", country: "ESP", position: "DC", mode: "intensa" },
    world,
  );
  run = completeSigning(agreeTerms(signYouthClub(run, run.offers[0].clubId)));

  const club = world.clubs["real-madrid"];
  const tournament = simulateTournamentRun({
    id: "champions",
    seed,
    season: 5,
    entrants: entrantsFor("champions", world, { include: [club] }),
    player: club,
    champion: true,
    phasePosition: 1,
  });
  const ties = liveTiesOf(
    { ...run, state: { ...run.state, clubId: club.id } },
    { season: 5, clubId: club.id, tournamentRuns: [tournament] },
    "es",
  );
  expect(ties.length, "no live ties to walk").toBeGreaterThan(1);

  const opened = {
    ...run,
    phase: PHASES.TOURNAMENT,
    matchday: null,
    tournament: { season: 5, ties, index: -1, broadcast: null },
  };
  return { run: nextTie(opened, "es"), ties };
}

function TieHarness({ initial }) {
  const [run, setRun] = useState(initial);
  const Screen = SCREENS.tournament;
  return React.createElement(Screen, {
    run,
    locale: "es",
    onNext: () => setRun((prev) => nextTie(prev, "es")),
  });
}

describe("the knockout queue", () => {
  it("plays every tie in turn instead of opening the second one already finished", () => {
    const { run, ties } = knockoutQueue();
    const view = mount(React.createElement(TieHarness, { initial: run }));

    for (let index = 0; index < ties.length; index += 1) {
      // Nothing to press until the whistle: this is the phase with no decision in it.
      expect(
        view.container.querySelector("button.tr-btn"),
        `eliminatoria ${index + 1} ya resuelta al abrirse`,
      ).toBeNull();

      runClock();

      const button = view.container.querySelector("button.tr-btn");
      expect(button, `eliminatoria ${index + 1} nunca llegó al final`).toBeTruthy();
      act(() => button.dispatchEvent(new window.MouseEvent("click", { bubbles: true })));
    }

    // The queue is spent, so the screen has nothing left to draw.
    expect(view.container.textContent).toBe("");
    view.unmount();
  });

  it("counts the clock up from nought on every one of them", () => {
    const { run, ties } = knockoutQueue();
    const view = mount(React.createElement(TieHarness, { initial: run }));

    for (let index = 0; index < ties.length; index += 1) {
      expect(view.text(), `el reloj no arrancó en la ${index + 1}`).toContain("0'");
      runClock();
      expect(view.text()).toContain("90'");
      const button = view.container.querySelector("button.tr-btn");
      act(() => button.dispatchEvent(new window.MouseEvent("click", { bubbles: true })));
    }
    view.unmount();
  });
});

/**
 * The figures go back between chances.
 *
 * `matchday.lastAttempt` is not cleared until the whole fixture closes, so a night worth
 * more than one chance asked for the second one over a frozen picture of the first: the
 * keeper still lying where he had dived, the flight still drawn, the ball still in the net.
 * The player was aiming at a goal that already had a ball in it.
 *
 * Mounted rather than reasoned about, because the release is a timer in one mode and the
 * broadcast clock in the other, and neither exists until the thing is alive.
 */
describe("between two chances", () => {
  const sceneClass = (container) =>
    container.querySelector(".tr-scene")?.getAttribute("class") ?? "";
  const resolved = (container) =>
    /is-scored|is-saved|is-absent/.test(sceneClass(container));

  it("puts the keeper back on his line once the match reaches the next one", () => {
    const view = show(narratedDecider(2, "reset-live"));
    runClock();

    // Take the first, and the drawing is of it.
    const run = narratedDecider(2, "reset-live");
    const first = [...view.container.querySelectorAll("button.tr-shot")];
    act(() =>
      first[run.matchday.shot.gap].dispatchEvent(new window.MouseEvent("click", { bubbles: true })),
    );
    expect(resolved(view.container), "nothing drawn after the first chance").toBe(true);

    // The clock runs on to the second, and the picture stops being about the first.
    runClock();
    expect(view.text(), "never reached the second chance").toContain(copy.match.choose);
    expect(
      resolved(view.container),
      "la segunda ocasión se pide sobre el dibujo de la primera",
    ).toBe(false);
    view.unmount();
  });

});
