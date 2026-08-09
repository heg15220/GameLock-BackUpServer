import { describe, expect, it } from "vitest";

import { headlineFor } from "./press.js";
import { GROWTH } from "./tables.js";
import { world } from "./world.js";

const clubId = Object.keys(world.clubs)[0];
const state = { surname: "MOLINA" };

const record = (overrides = {}) => ({
  season: 3,
  age: 25,
  clubId,
  role: "titular",
  matches: 40,
  goals: 11,
  assists: 5,
  titles: [],
  awards: [],
  national: null,
  promoted: false,
  relegated: false,
  suspended: false,
  ...overrides,
});

const head = (overrides, previous = null) =>
  headlineFor({ record: record(overrides), previous, state, world, locale: "es" }).id;

const title = (trophy) => ({ trophy, earned: true });

describe("the paper leads with the biggest true thing", () => {
  it("always finds a line, in both languages", () => {
    for (const locale of ["es", "en"]) {
      const line = headlineFor({ record: record(), previous: null, state, world, locale });
      expect(line.head).toBeTruthy();
      expect(line.body).toBeTruthy();
      // Every placeholder resolved: an unfilled {token} is a bug the reader would see.
      expect(line.body).not.toMatch(/\{\w+\}/);
    }
  });

  it("fills the surname and the club into the body", () => {
    const line = headlineFor({ record: record(), previous: null, state, world, locale: "es" });
    const club = world.clubs[clubId];
    expect(line.body).toContain(club.shortName ?? club.name);
  });
});

/**
 * The trophies of a season now come off one shared draw (fortune.js), so they arrive in
 * clusters. These are the headlines that exist because of it - and the ordering matters:
 * a sweep is a bigger story than any one cup inside it.
 */
describe("a season that swept", () => {
  it("leads with the treble rather than with one of its trophies", () => {
    expect(head({ titles: [title("league"), title("cup"), title("continental_a")] })).toBe("treble");
  });

  it("leads with the double, over the trophy that would otherwise have led", () => {
    expect(head({ titles: [title("league"), title("cup")] })).toBe("double");
    expect(head({ titles: [title("continental_a"), title("cup")] })).toBe("double");
  });

  it("still leads with the trophy itself when there was only one", () => {
    expect(head({ titles: [title("continental_a")] })).toBe("continental-club");
    expect(head({ titles: [title("league")] })).toBe("league");
  });

  it("does not outrank a season the player decided with his own foot", () => {
    // A shot he took beats anything the model handed him, which is the existing thesis
    // and must survive the new rules being inserted above the trophy ones.
    expect(
      head({
        titles: [title("league"), title("cup")],
        bigMatches: [{ decides: "league", scored: true, kind: "titulo_liga" }],
      }),
    ).toBe("decided-it");
  });

  it("does not outrank the Ballon d'Or or a World Cup", () => {
    expect(head({ titles: [title("league"), title("cup")], awards: [{ award: "ballon_dor" }] })).toBe(
      "ballon",
    );
    expect(
      head({
        titles: [title("league"), title("cup")],
        national: { calledUp: true, caps: 8, titles: [{ trophy: "world_cup" }] },
      }),
    ).toBe("world-cup");
  });
});

/** OUR CALL #6, in the fiction: standing still is news precisely when nothing went wrong. */
describe("the season nothing happened in", () => {
  const stalling = { factor: GROWTH.stallBelow - 0.05, minutes: 1.0, challenge: 0.74, environment: 0.94 };

  it("reports a player who is playing, scoring and not improving", () => {
    expect(
      head({
        age: 22,
        goals: 14,
        growth: stalling,
        development: { range: [2, 10] },
      }),
    ).toBe("stalled");
  });

  it("says nothing about a season that was always going to be a decline", () => {
    expect(
      head({ age: 35, growth: stalling, development: { range: [-5, -1] } }),
    ).not.toBe("stalled");
  });

  it("says nothing when the cycle was collected in full", () => {
    expect(
      head({
        age: 22,
        growth: { factor: 1.1, minutes: 1, challenge: 1.1, environment: 1 },
        development: { range: [2, 10] },
      }),
    ).not.toBe("stalled");
  });

  it("lets the bench tell its own story first", () => {
    expect(
      head({ role: "suplente", matches: 6, growth: stalling, development: { range: [2, 10] } }),
    ).toBe("benched");
  });

  it("never fires for a season that was not played at all", () => {
    expect(head({ matches: 0, growth: stalling, development: { range: [2, 10] } })).not.toBe("stalled");
    expect(head({ suspended: true, growth: stalling, development: { range: [2, 10] } })).toBe("banned");
  });
});
