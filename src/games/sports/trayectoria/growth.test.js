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

describe("the rating, between the season and the market", () => {
  it("says nothing on the very first step, because there is nothing to compare", () => {
    const run = afterSeasons(1);
    expect(run.phase).toBe(PHASES.SEASON);
    const view = show(run);
    expect(view.growth(), "nothing to compare and it showed something anyway").toBeNull();
    view.unmount();
  });

  it("holds the screen with the rating and then hands over on its own", () => {
    const run = afterSeasons(1);
    // A step whose history already has a season behind it: force one in so there is a
    // before and an after without driving a second full step through the harness.
    const withPast = {
      ...run,
      state: { ...run.state, history: [{ ...run.state.history[0], ovr: run.state.history[0].ovr - 3 }, ...run.state.history] },
    };
    const view = show(withPast);
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
    const worse = {
      ...run,
      state: { ...run.state, history: [{ ...run.state.history[0], ovr: run.state.history[0].ovr + 5 }, ...run.state.history] },
    };
    const view = show(worse);
    expect(view.growth()?.getAttribute("class")).toContain("is-down");
    view.unmount();
  });
});
