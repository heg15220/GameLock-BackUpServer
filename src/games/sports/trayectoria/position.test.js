/**
 * Where the club finished, before anything reads it.
 *
 * This number is about to decide who plays in Europe, so it is checked on its own first -
 * the method that has worked twice this week: the model, its invariants, and a measured
 * distribution, before a single consumer exists to hide a mistake inside.
 *
 * The invariants are not decoration. A table that lets a champion finish third, or a
 * relegated side finish sixth, is not a table; it is noise with a number on it, and every
 * qualification rule built on top would inherit the nonsense.
 */
import { describe, expect, it } from "vitest";

import { leaguePosition } from "./engine.js";
import {
  PHASES, acceptOffer, agreeTerms, completeSigning, nextFixture, openMarket,
  playChance, resolveEvent, signYouthClub, startCareer, takeShot, watchMatch,
} from "./career.js";
import { world } from "./world.js";

const clubAt = (reputation) =>
  Object.values(world.clubs).find((club) => club.domestic_reputation === reputation) ??
  Object.values(world.clubs)[0];

const spread = [-2, -1, -0.5, 0, 0.5, 1, 2];

describe("where the club finished", () => {
  it("puts the champion first and nobody else", () => {
    for (const reputation of [0, 2, 5]) {
      const club = clubAt(reputation);
      expect(leaguePosition({ club, wonLeague: true, latent: 2 })).toBe(1);
      for (const latent of spread) {
        // Only the title makes you first. A great year without it is second at best.
        expect(leaguePosition({ club, latent })).toBeGreaterThan(1);
      }
    }
  });

  it("puts a relegated side in the drop and a promoted one at the top", () => {
    for (const reputation of [0, 3, 5]) {
      const club = clubAt(reputation);
      for (const latent of spread) {
        expect(leaguePosition({ club, latent, relegated: true }), "descendido y a media tabla")
          .toBeGreaterThanOrEqual(18);
        expect(leaguePosition({ club, latent, promoted: true }), "asciende desde media tabla")
          .toBeLessThanOrEqual(2);
      }
    }
  });

  it("never leaves the table", () => {
    for (const reputation of [0, 1, 2, 3, 4, 5]) {
      const club = clubAt(reputation);
      for (const latent of [-6, -2, 0, 2, 6]) {
        for (const delta of [-40, 0, 40]) {
          const at = leaguePosition({ club, latent, delta });
          expect(at).toBeGreaterThanOrEqual(1);
          expect(at).toBeLessThanOrEqual(20);
          expect(Number.isInteger(at)).toBe(true);
        }
      }
    }
  });

  it("finishes a big club above a small one, year for year", () => {
    for (const latent of spread) {
      const big = leaguePosition({ club: clubAt(5), latent });
      const small = leaguePosition({ club: clubAt(1), latent });
      expect(big, `con latente ${latent}`).toBeLessThan(small);
    }
  });

  /** Low latent is a good year - the same convention the trophies and the form use. */
  it("finishes higher in a good year than in a bad one, same club", () => {
    for (const reputation of [1, 3, 5]) {
      const club = clubAt(reputation);
      expect(leaguePosition({ club, latent: -1.5 })).toBeLessThanOrEqual(
        leaguePosition({ club, latent: 1.5 }),
      );
    }
  });

  it("lets a player well above his squad drag it up, a little", () => {
    const club = clubAt(2);
    const carried = leaguePosition({ club, delta: 30, latent: 0 });
    const ordinary = leaguePosition({ club, delta: 0, latent: 0 });
    expect(carried).toBeLessThanOrEqual(ordinary);
    // But not enough to turn a mid-table side into a champion on his own.
    expect(carried).toBeGreaterThan(1);
  });

  it("is a pure function of what it is given", () => {
    const club = clubAt(4);
    const args = { club, delta: 6, latent: -0.4 };
    expect(leaguePosition(args)).toBe(leaguePosition(args));
  });

  /**
   * The distribution, because the invariants alone would be satisfied by a constant. A club
   * has to finish in a range of places across a career, not the same one every May.
   */
  it("gives a club a career's worth of different finishes", () => {
    const club = clubAt(3);
    const seen = new Set();
    for (let i = -20; i <= 20; i += 1) {
      seen.add(leaguePosition({ club, latent: i / 8 }));
    }
    expect(seen.size, `siempre acaba en los mismos puestos: ${[...seen].join(", ")}`).toBeGreaterThan(4);
  });
});

/**
 * And now on the record, because the summary has to print it and next summer has to read it.
 */
describe("the finish, recorded", () => {
  it("writes a position on every season a career plays", () => {
    let run = startCareer(
      { seed: "recorded", surname: "M", number: 9, foot: "left", country: "ESP", position: "DC", mode: "intensa" },
      world,
    );
    run = completeSigning(agreeTerms(signYouthClub(run, run.offers[0].clubId)));
    let guard = 0;
    while (run.phase !== PHASES.RETIRED && guard < 40) {
      guard += 1;
      while (run.phase === PHASES.EVENT) run = resolveEvent(run, run.event.es.options[0].id);
      let inner = 0;
      while (run.phase === PHASES.MATCH && inner < 40) {
        inner += 1;
        const shot = run.matchday.shot;
        if (!run.matchday.last) {
          run = shot.mode === "skill"
            ? playChance(run, (shot.chance.gates ?? [shot.chance.spot ?? shot.chance.target])[0])
            : takeShot(watchMatch(run, "es"), shot.options[shot.gap]);
        }
        run = nextFixture(run);
      }
      if (run.phase !== PHASES.SEASON) break;
      run = openMarket(run);
      if (run.phase !== PHASES.MARKET) break;
      run = acceptOffer(run, (run.offers.find((o) => o.stay) ?? run.offers[0]).clubId);
      if (run.phase === PHASES.NEGOTIATION) run = completeSigning(agreeTerms(run));
    }

    expect(run.state.history.length).toBeGreaterThan(1);
    for (const record of run.state.history) {
      expect(record.position, `temporada ${record.season} sin puesto`).toBeGreaterThanOrEqual(1);
      expect(record.position).toBeLessThanOrEqual(20);
      // The anchors, on real seasons rather than on hand-built ones.
      if (record.titles?.some((t) => t.trophy === "league")) expect(record.position).toBe(1);
      if (record.relegated) expect(record.position).toBeGreaterThanOrEqual(18);
    }
  });
});
