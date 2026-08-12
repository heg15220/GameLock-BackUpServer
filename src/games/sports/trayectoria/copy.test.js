/**
 * The furniture, guarded.
 *
 * Two failures that render as the word "undefined" on screen and nothing louder: a key
 * that exists in one locale and not the other, and a screen reaching for a key that was
 * renamed out from under it. Neither shows up in any other test, because the screens are
 * not mounted anywhere - so they are checked here, against the source.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { countOf, fillTemplate, getCopy } from "./copy.js";
import { MECHANICS } from "./minigames.js";

const keysOf = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? keysOf(v, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );

describe("copy", () => {
  it("has the same keys in both locales", () => {
    const es = keysOf(getCopy("es")).sort();
    const en = keysOf(getCopy("en")).sort();
    expect(en.filter((k) => !es.includes(k))).toEqual([]);
    expect(es.filter((k) => !en.includes(k))).toEqual([]);
  });

  it("resolves every copy.* path the screens reference", () => {
    // Every file that draws something. The seven chances moved out of index.jsx into their
    // own module and took their strings with them; a screen that is not on this list is a
    // screen this test stopped covering the day it was split off.
    const screens = ["index.jsx", "chancegames.jsx", "scene.jsx", "trophies.jsx"];
    const es = getCopy("es");
    const missing = [];
    for (const screen of screens) {
      const src = fs.readFileSync(path.join(__dirname, screen), "utf8");
      // copy.section.key  (skip computed lookups like copy.market.growthBand[band])
      for (const m of src.matchAll(/\bcopy\.([a-zA-Z]+)\.([a-zA-Z]+)/g)) {
        const [, section, key] = m;
        if (es[section]?.[key] === undefined) missing.push(`${screen}: ${section}.${key}`);
      }
    }
    expect([...new Set(missing)]).toEqual([]);
  });

  /**
   * The chance prompts are keyed by mechanic, so a new mechanic with no words is a screen
   * that renders an empty instruction - and the first time a player meets one of these,
   * the instruction is all he has.
   */
  it("has a prompt and a hint for every mechanic, in both locales", () => {
    for (const locale of ["es", "en"]) {
      const copy = getCopy(locale);
      for (const mechanic of Object.values(MECHANICS)) {
        expect(copy.match.chancePrompt[mechanic], `no ${locale} prompt for ${mechanic}`).toBeTruthy();
        expect(copy.match.chanceHint[mechanic], `no ${locale} hint for ${mechanic}`).toBeTruthy();
      }
    }
  });
});

/**
 * "Te quedan 1 temporadas."
 *
 * The contract sheet had been picking a singular by hand since the first version, and
 * everything written after it forgot. A game that is this careful about its numbers cannot
 * be careless about the words attached to them, so every line that takes a count is checked
 * for having both forms - and for the two of them actually being different.
 */
describe("counted lines", () => {
  const COUNTED = [
    ["contract", "yearsOne", "yearsValue"],
    ["contract", "breachOne", "breach"],
    ["market", "lockedOne", "locked"],
    ["hud", "wonTimes", "wonTimesPlural"],
  ];

  it("has a singular and a plural for every line that takes a number", () => {
    for (const locale of ["es", "en"]) {
      const copy = getCopy(locale);
      for (const [section, one, many] of COUNTED) {
        expect(copy[section]?.[one], `${locale}: falta ${section}.${one}`).toBeTruthy();
        expect(copy[section]?.[many], `${locale}: falta ${section}.${many}`).toBeTruthy();
        expect(copy[section][one], `${locale}: ${section}.${one} es igual al plural`).not.toBe(
          copy[section][many],
        );
      }
    }
  });

  it("picks the singular at one, in both directions, and the plural everywhere else", () => {
    expect(countOf("una", "muchas", 1)).toBe("una");
    expect(countOf("una", "muchas", -1)).toBe("una");
    expect(countOf("una", "muchas", 0)).toBe("muchas");
    expect(countOf("una", "muchas", 2)).toBe("muchas");
  });

  /** The bug as reported: one season left, and the line said "temporadas". */
  it("never writes a bare plural noun straight after a 1", () => {
    for (const locale of ["es", "en"]) {
      const copy = getCopy(locale);
      for (const [section, one] of COUNTED) {
        const line = fillTemplate(copy[section][one], { years: 1, n: 1 });
        expect(line, `${locale}: ${section}.${one}`).not.toMatch(/\b1 (temporadas|seasons|veces|times)\b/);
      }
    }
  });
});
