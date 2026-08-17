// @vitest-environment jsdom
/**
 * The rating, said out loud between the front page and the market.
 *
 * A career is one number moving, and that number used to move in silence: you read the
 * season, you picked a club, and somewhere in between your rating had changed. It is what
 * every offer on the next screen is priced against, so it gets the same treatment the cup
 * and the drop already get - the screen stops, says it, and hands over.
 *
 * Mounted rather than looked at, because it is a timer gating a phase, which is exactly the
 * shape of thing that has hung this game before.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  PHASES, agreeTerms, completeSigning, nextFixture, openMarket,
  resolveEvent, signYouthClub, startCareer, takeShot, watchMatch, playChance,
} from "./career.js";
import { getCopy } from "./copy.js";
import { SCREENS } from "./index.jsx";
import { world } from "./world.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const copy = getCopy("es");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout", "clearTimeout", "Date"] });
});
afterEach(() => vi.useRealTimers());

function mount(element) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(element));
  return {
    container,
    text: () => container.textContent ?? "",
    growth: () => container.querySelector(".tr-growth"),
    unmount: () => { act(() => root.unmount()); container.remove(); },
  };
}

/** A run parked on the season screen, having played at least two steps. */
function afterSeasons(steps = 2, seed = "growth") {
  let run = startCareer(
    { seed, surname: "MOLINA", number: 9, foot: "left", country: "ESP", position: "DC", mode: "intensa" },
    world,
  );
  run = completeSigning(agreeTerms(signYouthClub(run, run.offers[0].clubId)));
  for (let step = 0; step < steps; step += 1) {
    let guard = 0;
    while (run.phase === PHASES.EVENT && guard < 10) { guard += 1; run = resolveEvent(run, run.event.es.options[0].id); }
    guard = 0;
    while (run.phase === PHASES.MATCH && guard < 40) {
      guard += 1;
      let inner = 0;
      while (run.phase === PHASES.MATCH && !run.matchday.last && inner < 8) {
        inner += 1;
        const shot = run.matchday.shot;
        if (shot.mode === "skill") {
          const aim = shot.chance.gates ?? [shot.chance.spot ?? shot.chance.target];
          run = playChance(run, aim.length > 1 ? aim : aim[0]);
        } else {
          run = takeShot(watchMatch(run, "es"), shot.options[shot.gap]);
        }
      }
      run = nextFixture(run);
    }
    if (run.phase !== PHASES.SEASON) break;
    if (step < steps - 1) {
      run = openMarket(run);
      if (run.phase !== PHASES.MARKET) break;
      const stay = run.offers.find((o) => o.stay) ?? run.offers[0];
      run = completeSigning(agreeTerms(run.offers.length ? { ...run, deal: null } : run));
      run = completeSigning(agreeTerms(openMarket(run) === run ? run : run));
      break;
    }
  }
  return run;
}

const show = (run) => mount(React.createElement(SCREENS.season, { run, locale: "es", onNext: () => {} }));

/** Force the step to have been played at a given rating, whatever the career produced. */
const playedAt = (run, ovr) => ({
  ...run,
  seasonResults: run.seasonResults.map((result, index) =>
    index === 0 ? { ...result, record: { ...result.record, ovr } } : result,
  ),
});

describe("the rating, between the season and the market", () => {
  /**
   * THE FIRST STEP HAS THE MOST TO SAY, and it used to say nothing.
   *
   * The reveal compared the previous step's record to this one's - both on the history
   * timeline - so on step one there was no "previous" and it stayed silent, which meant a
   * sixteen-year-old's first season, the single biggest jump of a career, went unremarked.
   * It now bridges the rating the season was PLAYED at to the rating he is on NOW, and
   * that exists from the very first season. See the note in `SeasonScreen`.
   */
  it("speaks on the very first step, because the first year is a real jump", () => {
    const run = afterSeasons(1);
    expect(run.phase).toBe(PHASES.SEASON);
    const played = run.seasonResults[0].record.ovr;
    expect(run.state.ovr, "el primer año no movió el OVR").not.toBe(played);

    const view = show(run);
    expect(view.growth(), "el primer año creció y la pantalla se calló").toBeTruthy();
    expect(view.text()).toContain(copy.season.growthHeading);
    // It starts on what the year was played at, not on some earlier season.
    expect(view.container.querySelector(".tr-growth__from")?.textContent).toBe(String(played));
    view.unmount();
  });

  it("holds the screen with the rating and then hands over on its own", () => {
    const view = show(playedAt(afterSeasons(1), 40));
    const panel = view.growth();
    expect(panel, "no rating reveal at all").toBeTruthy();
    expect(view.text()).toContain(copy.season.growthHeading);
    // The new rating is on screen, and so is the movement.
    expect(view.text()).toMatch(/[+-]\d+ OVR|Sin cambios/);

    // It dismisses itself rather than waiting for a press it might never get.
    act(() => vi.advanceTimersByTime(4000));
    expect(view.growth(), "the reveal never let go").toBeNull();
    view.unmount();
  });

  it("colours the reading by which way the year went", () => {
    const run = afterSeasons(1);
    // Played the year well above where it left him: the year went backwards.
    const view = show(playedAt(run, run.state.ovr + 5));
    expect(view.growth()?.getAttribute("class")).toContain("is-down");
    view.unmount();

    const better = show(playedAt(run, run.state.ovr - 5));
    expect(better.growth()?.getAttribute("class")).toContain("is-up");
    better.unmount();
  });

  /**
   * The whole point of the change: the number it lands on is the number the masthead card
   * is showing. They were a full season apart - the reveal animated 68 -> 72 while the card
   * read 76 - because the two were reading different timelines.
   */
  it("lands on the rating the player is actually on now", () => {
    const run = afterSeasons(1);
    const view = show(run);
    const from = Number(view.container.querySelector(".tr-growth__from")?.textContent);
    const move = view.text().match(/([+-]\d+) OVR/);
    expect(from + (move ? Number(move[1]) : 0)).toBe(run.state.ovr);
    view.unmount();
  });
});
