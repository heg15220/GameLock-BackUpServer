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

  it("does not accuse him of missing a shot he was never given", () => {
    // An absent decider is not a miss - it settles at DECIDES.absent and the ball never
    // came to him - so the paper must not lead with "LA FALLÓ ÉL" over it. It also has no
    // `kind`, so the headline it used to write had a hole where the fixture should be.
    const line = headlineFor({
      record: record({ bigMatches: [{ decides: "league", scored: false, absent: true }] }),
      previous: null,
      state,
      world,
      locale: "es",
    });
    expect(line.id).not.toBe("missed-it");
    expect(line.body).not.toMatch(/\{\w+\}/);
  });

  it("does not write 'the keeper read him' about the keeper", () => {
    // A save is not a shot. Before the repertoires existed the paper had one verb for
    // coming through and it was "finished", which read as nonsense on a keeper's season.
    const won = headlineFor({
      record: record({
        bigMatches: [{ decides: "league", scored: true, produces: "stop", kind: "titulo_liga" }],
      }),
      previous: null, state, world, locale: "es",
    });
    expect(won.id).toBe("stopped-it");
    expect(won.body).not.toMatch(/\{\w+\}/);
    expect(won.body).toContain("MOLINA");

    const lost = headlineFor({
      record: record({
        bigMatches: [{ decides: "league", scored: false, produces: "stop", kind: "titulo_liga" }],
      }),
      previous: null, state, world, locale: "en",
    });
    expect(lost.id).toBe("let-it-in");
    expect(lost.body).not.toMatch(/\{\w+\}/);
  });

  it("still leads a striker's season with the shot, not with the save", () => {
    expect(
      head({ bigMatches: [{ decides: "league", scored: true, produces: "goal", kind: "titulo_liga" }] }),
    ).toBe("decided-it");
    expect(
      head({ bigMatches: [{ decides: "league", scored: false, produces: "goal", kind: "titulo_liga" }] }),
    ).toBe("missed-it");
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
