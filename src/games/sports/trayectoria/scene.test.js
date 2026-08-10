import { describe, expect, it } from "vitest";

import { FIXTURE_KINDS, SHOT_TYPES } from "./bigmatch.js";
import { FIXTURE_LABELS, PLACEMENT_LABELS, SHOT_LABELS } from "./copy.js";
import { EVENTS } from "./events.js";
import { FIXTURE_ICONS, ICON_NAMES, OPTION_ICONS, SHOT_ICONS, optionIcon } from "./icons.jsx";
import { PLACEMENTS, SITUATIONS } from "./scene.jsx";

/**
 * The drawing is data, not artwork: a shot type is a row in three tables and a placement is
 * a point in one. Adding a sixth kind of chance to bigmatch.js and forgetting one of them
 * would not throw - it would quietly render an empty frame - so this is where that is caught.
 */
describe("every situation has a picture", () => {
  it("draws every kind of chance and names it with a glyph that exists", () => {
    for (const type of Object.keys(SHOT_TYPES)) {
      expect(SITUATIONS[type], `no situation drawn for ${type}`).toBeTruthy();
      expect(SITUATIONS[type].from).toHaveLength(2);
      expect(SITUATIONS[type].keeper).toHaveLength(2);
      expect(ICON_NAMES, `no glyph for ${type}`).toContain(SHOT_ICONS[type]);
      expect(SHOT_LABELS.es[type]).toBeTruthy();
      expect(SHOT_LABELS.en[type]).toBeTruthy();
    }
  });

  it("puts every placement somewhere inside the goal mouth", () => {
    const used = new Set(Object.values(SHOT_TYPES).flat());
    for (const placement of used) {
      const spot = PLACEMENTS[placement];
      expect(spot, `no point drawn for ${placement}`).toBeTruthy();
      const [u, v] = spot;
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThanOrEqual(1);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(PLACEMENT_LABELS.es[placement]).toBeTruthy();
      expect(PLACEMENT_LABELS.en[placement]).toBeTruthy();
    }
  });

  it("keeps the three placements of a shot type apart on the drawing", () => {
    for (const [type, options] of Object.entries(SHOT_TYPES)) {
      for (let a = 0; a < options.length; a += 1) {
        for (let b = a + 1; b < options.length; b += 1) {
          const [ua, va] = PLACEMENTS[options[a]];
          const [ub, vb] = PLACEMENTS[options[b]];
          const gap = Math.hypot(ua - ub, va - vb);
          // Two options that land on the same spot would make the picture a lie.
          expect(gap, `${type}: ${options[a]} and ${options[b]} overlap`).toBeGreaterThan(0.15);
        }
      }
    }
  });

  it("gives every fixture a mark and a name in both locales", () => {
    for (const kind of Object.keys(FIXTURE_KINDS)) {
      expect(ICON_NAMES, `no glyph for ${kind}`).toContain(FIXTURE_ICONS[kind]);
      expect(FIXTURE_LABELS.es[kind]).toBeTruthy();
      expect(FIXTURE_LABELS.en[kind]).toBeTruthy();
    }
  });

  it("does not carry placements nothing ever shoots at", () => {
    const used = new Set(Object.values(SHOT_TYPES).flat());
    for (const placement of Object.keys(PLACEMENTS)) {
      expect(used, `${placement} is drawn but never offered`).toContain(placement);
    }
  });
});

/**
 * The same completeness check, for the answers to a decision card.
 *
 * A card is written in two languages and its options are written twice with it; only the
 * id is shared, which is why the glyph hangs off the id. Adding a forty-seventh card with
 * a new id would not throw - the button would just come out with an empty disc on it.
 */
describe("every answer to a decision has a mark on it", () => {
  const optionsOf = (event, locale) => event[locale]?.options ?? [];

  it("gives every option in the catalogue a glyph that exists", () => {
    for (const event of EVENTS) {
      for (const locale of ["es", "en"]) {
        for (const option of optionsOf(event, locale)) {
          const glyph = optionIcon(event, option.id);
          expect(ICON_NAMES, `${event.id}/${option.id} has no glyph`).toContain(glyph);
        }
      }
    }
  });

  it("names every option deliberately rather than falling back to the card's theme", () => {
    // The theme fallback exists so a button is never empty at runtime. Reaching it means
    // somebody added an option and did not say what it is, so it fails here instead.
    for (const event of EVENTS) {
      for (const option of optionsOf(event, "es")) {
        expect(
          event.icons?.[option.id] ?? OPTION_ICONS[option.id],
          `${event.id}/${option.id} is not in OPTION_ICONS`,
        ).toBeTruthy();
      }
    }
  });

  it("marks the same option the same way in both languages", () => {
    for (const event of EVENTS) {
      const es = optionsOf(event, "es").map((option) => option.id);
      const en = optionsOf(event, "en").map((option) => option.id);
      expect(en, `${event.id} offers different options per language`).toEqual(es);
    }
  });

  it("maps nothing to a glyph that is not drawn", () => {
    for (const [id, glyph] of Object.entries(OPTION_ICONS)) {
      expect(ICON_NAMES, `OPTION_ICONS.${id} points at a missing glyph`).toContain(glyph);
    }
  });

  it("lets a card override an id that means something else on it", () => {
    // `out` is "ask to leave" everywhere but the dressing-room card, where it is the
    // opposite of leaving.
    const grupito = EVENTS.find((event) => event.id === "el-grupito");
    expect(grupito.icons.out).toBe("personal");
    expect(optionIcon(grupito, "out")).toBe("personal");
    expect(optionIcon({ theme: "sport" }, "out")).toBe(OPTION_ICONS.out);
  });
});
