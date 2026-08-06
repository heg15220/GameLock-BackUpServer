import { describe, expect, it } from "vitest";

import { FIXTURE_KINDS, SHOT_TYPES } from "./bigmatch.js";
import { FIXTURE_LABELS, PLACEMENT_LABELS, SHOT_LABELS } from "./copy.js";
import { FIXTURE_ICONS, ICON_NAMES, SHOT_ICONS } from "./icons.jsx";
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
