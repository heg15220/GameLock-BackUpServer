/**
 * The catalogue, checked as a whole.
 *
 * Every card is hand-written prose in two languages plus a `resolve` that has to agree
 * with it, and the catalogue is now big enough that reading it is not a check. These are
 * the invariants that make a card a card: it exists in both languages, its options line
 * up across them, `resolve` answers every option it offers and refuses the ones it does
 * not, and every effect it produces is one `applyEffects` actually implements - a typo in
 * an effect key is silent, and the card simply does nothing for the rest of the career.
 */
import { describe, expect, it } from "vitest";

import { EVENTS, EVENT_THEMES, EVENTS_BY_ID, applyEffects, weightOf } from "./events.js";
import { THEME_LABELS } from "./copy.js";
import { ICON_NAMES } from "./icons.jsx";
import { createStream } from "./rng.js";

/** Everything `applyEffects` and `applyToContract` know how to spend. */
const EFFECT_KEYS = new Set([
  "ovr", "ovrTemp", "ovrReturn", "matchesDelta", "roleShift", "forceRole",
  "titleMultiplier", "suspended", "forceCallup", "changeCountry", "idolatry",
  "wageFactor", "yearsDelta", "clauseFactor", "forceTransfer", "returnToFirstClub",
]);

/** A spread of careers, so weight functions are exercised rather than assumed. */
const CONTEXTS = [
  { age: 17, ovr: 52, delta: -6, role: "suplente", seasonsAtClub: 0, clubReputation: 0, competitionTier: 2, abroad: false, atFirstClub: true, calledUp: false, idolatry: 0, clubWantsOut: false, contractYearsLeft: 3 },
  { age: 24, ovr: 74, delta: 2, role: "titular", seasonsAtClub: 3, clubReputation: 3, competitionTier: 1, abroad: true, atFirstClub: false, calledUp: true, idolatry: 48, clubWantsOut: false, contractYearsLeft: 2 },
  { age: 33, ovr: 68, delta: -4, role: "rotacion_baja", seasonsAtClub: 8, clubReputation: 5, competitionTier: 1, abroad: false, atFirstClub: true, calledUp: false, idolatry: 88, clubWantsOut: true, contractYearsLeft: 0 },
  // The veteran who never went home. Several cards key off exactly this and nothing else.
  { age: 31, ovr: 71, delta: 1, role: "rotacion_alta", seasonsAtClub: 1, clubReputation: 2, competitionTier: 1, abroad: false, atFirstClub: false, calledUp: false, idolatry: 20, clubWantsOut: false, contractYearsLeft: 1 },
];

describe("the decision catalogue", () => {
  it("has a unique id and a known theme on every card", () => {
    const ids = EVENTS.map((event) => event.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const event of EVENTS) {
      expect(EVENT_THEMES, `${event.id} has theme "${event.theme}"`).toContain(event.theme);
    }
  });

  it("names and draws every theme it uses", () => {
    // A theme with no label prints its own slug at the player; one with no glyph draws
    // nothing at all, because `Icon` returns null for a name it does not have.
    for (const theme of EVENT_THEMES) {
      expect(THEME_LABELS.es[theme], `no Spanish label for "${theme}"`).toBeTruthy();
      expect(THEME_LABELS.en[theme], `no English label for "${theme}"`).toBeTruthy();
      expect(ICON_NAMES, `no glyph for "${theme}"`).toContain(theme);
    }
    // And every theme is actually used, or it is a label for a family that does not exist.
    const used = new Set(EVENTS.map((event) => event.theme));
    for (const theme of EVENT_THEMES) expect(used, `"${theme}" has no cards`).toContain(theme);
  });

  it("is written in both languages, with the same options in each", () => {
    for (const event of EVENTS) {
      for (const locale of ["es", "en"]) {
        const copy = event[locale];
        expect(copy, `${event.id} has no ${locale}`).toBeTruthy();
        expect(copy.title, `${event.id}.${locale} has no title`).toBeTruthy();
        expect(copy.body, `${event.id}.${locale} has no body`).toBeTruthy();
        // One is allowed: a card with a single button is something happening TO you that
        // you only get to acknowledge (`competencia-por-el-puesto`). Zero is not a card.
        expect(copy.options.length, `${event.id}.${locale} has no options`).toBeGreaterThan(0);
        for (const option of copy.options) {
          expect(option.label, `${event.id}.${locale}.${option.id} has no label`).toBeTruthy();
          expect(option.detail, `${event.id}.${locale}.${option.id} has no detail`).toBeTruthy();
        }
      }
      // Same ids, same order: the screen renders from one locale and resolves with ids.
      expect(event.en.options.map((o) => o.id), `${event.id} options differ across locales`)
        .toEqual(event.es.options.map((o) => o.id));
    }
  });

  it("resolves every option it offers, into effects the model implements", () => {
    for (const event of EVENTS) {
      for (const option of event.es.options) {
        // Both branches of any roll inside the card, not just whichever one seed 0 takes.
        for (let attempt = 0; attempt < 40; attempt += 1) {
          const next = createStream("catalogue", event.id, option.id, attempt);
          const result = event.resolve(next, option.id);
          expect(result, `${event.id}.${option.id} resolved to nothing`).toBeTruthy();
          expect(result.outcome, `${event.id}.${option.id} has no outcome`).toBeTruthy();
          for (const key of Object.keys(result.effects ?? {})) {
            expect(EFFECT_KEYS, `${event.id}.${option.id} spends unknown effect "${key}"`)
              .toContain(key);
          }
        }
      }
    }
  });

  it("never silently swallows an option it does not know", () => {
    // Every card has a fallback branch, so a bad id resolves to something rather than
    // crashing - but it must not resolve to the GOOD branch, or the card is free.
    for (const event of EVENTS) {
      const next = createStream("bogus", event.id);
      const result = event.resolve(next, "definitely-not-an-option");
      expect(result, `${event.id} crashed on an unknown option`).toBeTruthy();
      expect(result.outcome).toBeTruthy();
    }
  });

  it("keeps every weight finite and non-negative in any career", () => {
    for (const event of EVENTS) {
      for (const context of CONTEXTS) {
        const weight = weightOf(event, context);
        expect(Number.isFinite(weight), `${event.id} weight is not a number`).toBe(true);
        expect(weight, `${event.id} weight is negative`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  /**
   * A card that can never be drawn is dead text, and the way it dies is a condition that
   * cannot hold - `age >= 30` on a card whose other clause only fires at 22. Three
   * hand-written careers cannot prove that: several cards key off a CONJUNCTION, so a
   * fixture set has to be tuned card by card as the catalogue grows, and it silently
   * stops covering the ones added after it. Sampling the space instead keeps the check
   * honest without anyone maintaining it.
   */
  it("can draw every card in some career", () => {
    const pick = (next, values) => values[Math.floor(next() * values.length)];
    const next = createStream("reachability");
    const sample = [];
    for (let i = 0; i < 600; i += 1) {
      sample.push({
        age: pick(next, [16, 19, 23, 27, 29, 31, 34]),
        ovr: pick(next, [48, 58, 66, 72, 78, 86, 92]),
        delta: pick(next, [-8, -3, 0, 2, 6]),
        role: pick(next, ["titular", "rotacion_alta", "rotacion_baja", "suplente"]),
        seasonsAtClub: pick(next, [0, 1, 3, 6, 10]),
        clubReputation: pick(next, [0, 1, 2, 3, 4, 5]),
        competitionTier: pick(next, [1, 2]),
        abroad: pick(next, [true, false]),
        atFirstClub: pick(next, [true, false]),
        calledUp: pick(next, [true, false]),
        idolatry: pick(next, [0, 20, 45, 70, 95]),
        clubWantsOut: pick(next, [true, false]),
        contractYearsLeft: pick(next, [0, 1, 2, 4]),
      });
    }

    const unreachable = EVENTS.filter(
      (event) => !sample.some((context) => weightOf(event, context) > 0),
    ).map((event) => event.id);
    expect(unreachable, `never drawn in 600 careers: ${unreachable.join(", ")}`).toEqual([]);
  });
});

describe("the press room", () => {
  const press = EVENTS.filter((event) => event.theme === "prensa");

  it("is a family, not a card", () => {
    expect(press.length).toBeGreaterThanOrEqual(8);
  });

  it("pays in the stand rather than in the rating", () => {
    // The point of the family: what you say is not what makes you a better footballer.
    // A press card may cost minutes or a rung, but permanent OVR is not its currency.
    for (const event of press) {
      for (const option of event.es.options) {
        for (let attempt = 0; attempt < 20; attempt += 1) {
          const next = createStream("press", event.id, option.id, attempt);
          const { effects = {} } = event.resolve(next, option.id);
          expect(effects.ovr ?? 0, `${event.id}.${option.id} moves OVR`).toBe(0);
          expect(effects.ovrTemp ?? 0, `${event.id}.${option.id} moves OVR`).toBe(0);
        }
      }
    }
    // And collectively they do move it: a family that never touches idolatría would be
    // paying in nothing at all.
    const touches = press.some((event) =>
      event.es.options.some((option) =>
        (event.resolve(createStream("press-check", event.id, option.id), option.id).effects ?? {})
          .idolatry,
      ),
    );
    expect(touches).toBe(true);
  });
});

describe("the idolatry effect", () => {
  it("banks onto the modifiers rather than the rating", () => {
    const state = { ovr: 70, modifiers: {} };
    const after = applyEffects(state, { idolatry: 5 });
    expect(after.modifiers.idolatry).toBe(5);
    expect(after.ovr).toBe(70);
  });

  it("accumulates, because a step can deal more than one card", () => {
    const once = applyEffects({ ovr: 70, modifiers: {} }, { idolatry: 5 });
    const twice = applyEffects(once, { idolatry: -2 });
    expect(twice.modifiers.idolatry).toBe(3);
  });

  it("is left alone when a card does not spend it", () => {
    const after = applyEffects({ ovr: 70, modifiers: { idolatry: 4 } }, { ovr: 1 });
    expect(after.modifiers.idolatry).toBe(4);
  });

  it("is reachable from a real card", () => {
    const card = EVENTS_BY_ID["rueda-de-presentacion"];
    expect(card).toBeTruthy();
    const outcomes = new Set();
    for (let i = 0; i < 60; i += 1) {
      outcomes.add(card.resolve(createStream("promise", i), "promise").outcome);
    }
    // Both sides of the bet the card prints, or the odds on it are decoration.
    expect(outcomes).toEqual(new Set(["landed", "hollow"]));
  });
});
