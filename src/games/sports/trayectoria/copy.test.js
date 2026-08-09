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
import { getCopy } from "./copy.js";

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
    const src = fs.readFileSync(path.join(__dirname, "index.jsx"), "utf8");
    const es = getCopy("es");
    const missing = [];
    // copy.section.key  (skip computed lookups like copy.market.growthBand[band])
    for (const m of src.matchAll(/\bcopy\.([a-zA-Z]+)\.([a-zA-Z]+)/g)) {
      const [, section, key] = m;
      if (es[section]?.[key] === undefined) missing.push(`${section}.${key}`);
    }
    expect([...new Set(missing)]).toEqual([]);
  });
});
