// @vitest-environment jsdom
/**
 * The cabinet, pressed.
 *
 * A row of gold silhouettes with a number on the corner is legible once you already know
 * what they are. The only thing that named them was a `title`, which does not exist on a
 * phone - so on the device most of these careers are played on, the trophy case was a row
 * of unlabelled shapes. Pressing one now names it and says how many times he has won it,
 * and that is a state machine, which is why it is checked here rather than looked at.
 */
import { describe, expect, it } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";

import { TrophyShelf, dropCapSafe } from "./index.jsx";
import { AWARD_LABELS, TROPHY_LABELS, getCopy } from "./copy.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const copy = getCopy("es");

function mount(element) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(element));
  return {
    container,
    text: () => container.textContent ?? "",
    cups: () => [...container.querySelectorAll("button.tr-shelf__item")],
    named: () => container.querySelector(".tr-shelf__named")?.textContent ?? null,
    press: (i) =>
      act(() =>
        container
          .querySelectorAll("button.tr-shelf__item")
          [i].dispatchEvent(new window.MouseEvent("click", { bubbles: true })),
      ),
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

const won = (trophy, times, national = false) =>
  Array.from({ length: times }, (_, i) => ({ trophy, national, season: i + 1 }));

const took = (award, times) =>
  Array.from({ length: times }, (_, i) => ({ award, season: i + 1 }));

const shelf = (trophies, awards = []) =>
  mount(React.createElement(TrophyShelf, { trophies, awards, locale: "es" }));

describe("the trophy case", () => {
  it("says nothing at all when nothing has been won", () => {
    const view = shelf([]);
    expect(view.container.textContent).toBe("");
    view.unmount();
  });

  it("names the cup and how many times, when one is pressed", () => {
    const view = shelf([...won("league", 3), ...won("cup", 1)]);
    expect(view.named(), "named before anything was pressed").toBeNull();

    view.press(0);
    expect(view.named()).toContain(TROPHY_LABELS.es.league);
    expect(view.named()).toContain("3 veces");

    // The singular is a different line: "1 veces" is the kind of thing this game does not do.
    view.press(1);
    expect(view.named()).toContain(TROPHY_LABELS.es.cup);
    expect(view.named()).toContain("1 vez");
    expect(view.named()).not.toContain("veces");
    view.unmount();
  });

  it("closes when the open one is pressed again", () => {
    const view = shelf(won("league", 2));
    view.press(0);
    expect(view.named()).toBeTruthy();
    view.press(0);
    expect(view.named()).toBeNull();
    view.unmount();
  });

  it("keeps one entry per cup, counted, and one press per entry", () => {
    const view = shelf([...won("league", 4), ...won("world_cup", 1, true)]);
    expect(view.cups()).toHaveLength(2);
    view.press(1);
    expect(view.named()).toContain(TROPHY_LABELS.es.world_cup);
    view.unmount();
  });

  /**
   * The same cup won with a club and with the country are two lines on the shelf - see the
   * key in `TrophyShelf` - so pressing one must not answer for the other.
   */
  it("tells a cup won with the country apart from the same one won with a club", () => {
    const view = shelf([...won("continental_a", 2), ...won("continental_a", 1, true)]);
    expect(view.cups()).toHaveLength(2);
    view.press(0);
    expect(view.named()).toContain("2 veces");
    view.press(1);
    expect(view.named()).toContain("1 vez");
    view.unmount();
  });

  it("offers the answer to a mouse without a press, too", () => {
    const view = shelf(won("cup", 2));
    const label = view.cups()[0].getAttribute("title");
    expect(label).toContain(TROPHY_LABELS.es.cup);
    expect(label).toContain("×2");
    // And to a screen reader, which has no hover and no colour.
    expect(view.cups()[0].getAttribute("aria-label")).toBe(label);
    expect(view.cups()[0].getAttribute("aria-pressed")).toBe("false");
    view.press(0);
    expect(view.cups()[0].getAttribute("aria-pressed")).toBe("true");
    view.unmount();
  });

  /**
   * The individual honours, which the shelf never showed.
   *
   * The model has rolled a Balón de Oro since the first version and drew a silhouette for
   * it soon after, and the only place either ever surfaced was a count on the retirement
   * page. A player could win three of them and carry a cabinet that said nothing about it
   * for the twenty years he was still playing.
   */
  it("puts the individual honours on the shelf, after the cups", () => {
    const view = shelf(won("league", 2), [...took("ballon_dor", 2), ...took("golden_boot", 1)]);
    const cups = view.cups();
    expect(cups).toHaveLength(3);
    // The cups first, whatever order the career collected them in.
    expect(cups[0].className).not.toContain("is-award");
    expect(cups[1].className).toContain("is-award");
    expect(cups[2].className).toContain("is-award");
    view.unmount();
  });

  it("names an award and counts it, like any other line on the shelf", () => {
    const view = shelf([], took("ballon_dor", 3));
    view.press(0);
    expect(view.named()).toContain(AWARD_LABELS.es.ballon_dor);
    expect(view.named()).toContain("3 veces");
    expect(view.cups()[0].getAttribute("aria-label")).toContain(AWARD_LABELS.es.ballon_dor);
    view.unmount();
  });

  it("opens on an award alone, with no cup ever won", () => {
    const view = shelf([], took("golden_boot", 1));
    // A career can be one great season and nothing on the team's shelf at all.
    expect(view.cups()).toHaveLength(1);
    view.press(0);
    expect(view.named()).toContain(AWARD_LABELS.es.golden_boot);
    view.unmount();
  });

  it("still says nothing when there is neither a cup nor an award", () => {
    const view = shelf([], []);
    expect(view.container.textContent).toBe("");
    view.unmount();
  });

  it("has both halves of the count line in both languages", () => {
    for (const locale of ["es", "en"]) {
      const words = getCopy(locale).hud;
      expect(words.wonTimes).toContain("{n}");
      expect(words.wonTimesPlural).toContain("{n}");
      expect(words.wonTimes).not.toBe(words.wonTimesPlural);
    }
    expect(copy.hud.wonTimes).toBeTruthy();
  });
});

/**
 * The drop cap, which was misquoting the season.
 *
 * `::first-letter` takes the first CHARACTER, and several press bodies open on a figure -
 * "{goals} goles en {matches} partidos". A twelve-match season was therefore set as a 52px
 * red "1" followed by "2 partidos", and the reader came away with a different number. In a
 * game whose whole claim is that its figures are honest, typography that misquotes them is
 * worse than a plain paragraph, so the flourish stands down when the line opens on a digit.
 */
describe("the front page drop cap", () => {
  it("stands down when the paragraph opens on a figure", () => {
    expect(dropCapSafe("12 partidos, 1 gol y un año que no se repite.")).toBe(false);
    expect(dropCapSafe("9 goles en 20 partidos.")).toBe(false);
    expect(dropCapSafe("—Nada que contar.")).toBe(false);
    expect(dropCapSafe('"Eso lo decide él", dijo.')).toBe(false);
  });

  it("keeps it for the ordinary paragraph, accents and all", () => {
    expect(dropCapSafe("El Eibar se lleva dos.")).toBe(true);
    expect(dropCapSafe("Ángel firma la temporada de su vida.")).toBe(true);
    expect(dropCapSafe("  Con sangría por delante.")).toBe(true);
  });

  it("says no rather than throwing when there is no paragraph at all", () => {
    expect(dropCapSafe("")).toBe(false);
    expect(dropCapSafe(null)).toBe(false);
    expect(dropCapSafe(undefined)).toBe(false);
  });
});
