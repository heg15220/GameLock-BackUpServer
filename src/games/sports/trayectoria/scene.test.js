import { describe, expect, it } from "vitest";

import { FIXTURE_KINDS, SHOT_TYPES } from "./bigmatch.js";
import { FIXTURE_LABELS, PLACEMENT_LABELS, SHOT_LABELS } from "./copy.js";
import { EVENTS } from "./events.js";
import { BEAT_ICONS, FIXTURE_ICONS, ICON_NAMES, OPTION_ICONS, SHOT_ICONS, beatIcon } from "./icons.jsx";
import { optionIcon } from "./icons.jsx";
import { getCopy } from "./copy.js";
import { PLACEMENTS, SITUATIONS, cameraFor } from "./scene.jsx";
import { CAMERAS, CAMERA_VIEWBOX, POSE_NAMES } from "./pitch.jsx";
import { CHANCE_MECHANIC, MECHANICS } from "./minigames.js";

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


/**
 * The stadium, and the two promises it makes.
 *
 * `pitch.jsx` replaced a goal made of three strokes with one made of netting, stands and
 * posed silhouettes, and the seven minigames moved onto it - so the drawing stopped being
 * decoration and became the thing the player reads a chance off. Two classes of bug come
 * with that, and neither of them throws:
 *
 *  - A POSE THAT IS NOT THERE. `SITUATIONS` now names a pose per chance. A typo falls back
 *    to `stand`, so a header renders as a man waiting and nobody ever finds out.
 *  - A CAMERA THAT DOES NOT MATCH ITS SURFACE. `pointIn` reads a pointer as a fraction of
 *    the box and `judgeChance` measures the same fraction, so the moment a viewBox stops
 *    having its surface's aspect ratio, what is drawn and what is judged come apart - and
 *    the only symptom is a chance that feels wrong.
 */
describe("the stadium", () => {
  it("names a pose that exists for every chance, on both sides of it", () => {
    for (const [type, situation] of Object.entries(SITUATIONS)) {
      if (situation.pose) {
        expect(POSE_NAMES, `${type}: no such pose "${situation.pose}"`).toContain(situation.pose);
      }
      if (situation.keeperPose) {
        expect(POSE_NAMES, `${type}: no such keeper pose "${situation.keeperPose}"`)
          .toContain(situation.keeperPose);
      }
    }
  });

  /** A keeper already flat on the turf with nothing to dive at is not "ready". */
  it("never opens a chance on a figure already committed", () => {
    for (const [type, situation] of Object.entries(SITUATIONS)) {
      expect(situation.keeperPose ?? "stand", `${type} starts mid-dive`).not.toBe("dive");
      expect(situation.pose ?? "stand", `${type} starts mid-dive`).not.toBe("dive");
    }
  });

  it("films a chance you are stopping from the goal, and one you are taking from behind", () => {
    for (const [type, situation] of Object.entries(SITUATIONS)) {
      expect(cameraFor(type), type).toBe(situation.stops ? CAMERAS.GOAL : CAMERAS.BEHIND);
    }
  });

  /**
   * The geometric promise. Both wide cameras have to share a ratio because their surface is
   * given one ratio in CSS, and the two-dimensional one has to be square or the disc the
   * judge measures is drawn as an ellipse.
   */
  it("gives every camera a viewBox, and the right shape", () => {
    const ratio = (camera) => {
      const box = CAMERA_VIEWBOX[camera];
      expect(box, `no viewBox for ${camera}`).toBeTruthy();
      const [, , w, h] = box.split(" ").map(Number);
      return w / h;
    };
    expect(ratio(CAMERAS.BEHIND)).toBeCloseTo(ratio(CAMERAS.GOAL), 5);
    expect(ratio(CAMERAS.AREA), "the two-dimensional camera is not square").toBeCloseTo(1, 5);
    // And every camera the code can ask for is in the table.
    for (const camera of Object.values(CAMERAS)) expect(CAMERA_VIEWBOX[camera]).toBeTruthy();
  });

  /**
   * The mechanics that are measured along the PITCH rather than across the goal cannot use
   * the close crop: it throws their target off the frame. Measured on a preview, a keeper's
   * window had its whole zone outside the picture.
   */
  it("keeps the mechanics that need depth off the close camera", () => {
    const needsDepth = [MECHANICS.WINDOW, MECHANICS.CHARGE];
    const deep = Object.entries(CHANCE_MECHANIC)
      .filter(([, mechanic]) => needsDepth.includes(mechanic))
      .map(([type]) => type);
    // Several of them belong to chances the player is STOPPING, which is exactly the case
    // that would otherwise be cropped - so this is not a vacuous list.
    expect(deep.some((type) => SITUATIONS[type]?.stops)).toBe(true);
    // Three of them: the keeper's close-in work and the defender's tackle. The four shots
    // at a goal have no mechanic left to crop - they are a zone. See CHANCE_MECHANIC.
    expect(deep.length).toBeGreaterThan(2);
  });
});

/**
 * Every line of a live match carries the mark of what happened in it - see BEAT_ICONS -
 * and a beat with no mark is not a crash, it is a sentence sitting a glyph's width to the
 * left of the ones above it. So the two lists are held together here: a beat that gets a
 * new kind of line in copy.js has to be given a picture of it at the same time.
 */
describe("every beat of a live match is marked", () => {
  const beatIds = Object.keys(getCopy("es").match.beats);

  it("names a glyph for every line the feed can print", () => {
    for (const id of beatIds) {
      expect(BEAT_ICONS[id], `no mark for the "${id}" beat`).toBeTruthy();
      expect(ICON_NAMES, `BEAT_ICONS.${id} points at a missing glyph`).toContain(BEAT_ICONS[id]);
    }
  });

  it("says the same thing in both languages", () => {
    expect(Object.keys(getCopy("en").match.beats).sort()).toEqual([...beatIds].sort());
  });

  it("maps nothing to a glyph that is not drawn, and falls back to one that is", () => {
    for (const [id, glyph] of Object.entries(BEAT_ICONS)) {
      expect(ICON_NAMES, `BEAT_ICONS.${id} points at a missing glyph`).toContain(glyph);
    }
    expect(ICON_NAMES).toContain(beatIcon("a-beat-nobody-has-written-yet"));
  });
});
