/**
 * The cabinet, guarded.
 *
 * `scene.test.js` exists because adding a shot type without a row in both of its tables
 * renders an empty goal frame and says nothing. This is the same hazard: award a trophy
 * the silhouette set has never heard of and the ceremony plays with a blank where the cup
 * should be. Nothing else in the suite would notice, because none of it mounts a screen.
 */
import { describe, expect, it } from "vitest";

import { AWARD_LABELS, TROPHY_LABELS } from "./copy.js";
import { TROPHY_IDS, hasSilhouette, trophyAssetFor } from "./trophies.jsx";
import { TITLE_ODDS } from "./tables.js";
import { world } from "./world.js";

/** Everything `rollTitles`, `rollNationalTeam` and `rollAwards` can put on the record. */
const CLUB_TROPHIES = Object.keys(TITLE_ODDS);
const NATIONAL_TROPHIES = ["continental_nt", "world_cup"];
const AWARDS = Object.keys(AWARD_LABELS.es);

describe("every honour the model can award has a shape", () => {
  it("covers every club trophy in TITLE_ODDS", () => {
    for (const trophy of CLUB_TROPHIES) {
      expect(hasSilhouette(trophy), `no silhouette for ${trophy}`).toBe(true);
    }
  });

  it("covers both national-team trophies", () => {
    for (const trophy of NATIONAL_TROPHIES) {
      expect(hasSilhouette(trophy), `no silhouette for ${trophy}`).toBe(true);
    }
  });

  it("covers every individual award", () => {
    for (const award of AWARDS) {
      expect(hasSilhouette(award), `no silhouette for ${award}`).toBe(true);
    }
  });

  it("draws nothing the copy cannot name, in either language", () => {
    // The reverse guard: a shape with no label is a cup nobody can read.
    for (const id of TROPHY_IDS) {
      const named = TROPHY_LABELS.es[id] ?? AWARD_LABELS.es[id];
      const namedEn = TROPHY_LABELS.en[id] ?? AWARD_LABELS.en[id];
      expect(named, `no es label for ${id}`).toBeTruthy();
      expect(namedEn, `no en label for ${id}`).toBeTruthy();
    }
  });
});

/**
 * The photographs are the optional half. `public/assets/football/` is gitignored, so on a
 * fresh clone every one of these resolves to nothing and the silhouette has to carry the
 * screen - these assert that the lookup fails quietly rather than producing a broken path.
 */
describe("the photographs, and the map that finds them", () => {
  /** Stands in for `world.trophies` - the map of what the fetch actually mirrored. */
  const mirrored = {
    "international/UEFA/champions-league": "/x/ucl.png",
    "international/UEFA/euro": "/x/euro.png",
    "international/CONMEBOL/copa-sudamericana": "/x/sudamericana.png",
    "international/CONCACAF/champions-cup": "/x/concacaf.png",
    "international/FIFA/world-cup": "/x/wc.png",
    "international/FIFA/club-world-cup": "/x/cwc.png",
    "international/FIFA/ballon-dor": "/x/bdo.png",
    "international/UEFA/golden-boot": "/x/boot.png",
    "international/FIFA/golden-glove": "/x/glove.png",
  };

  it("uses the path the world build resolved for a league and a cup", () => {
    const comp = { trophy: "/x/la-liga.png", cupTrophy: "/x/copa-del-rey.png" };
    expect(trophyAssetFor("league", { competition: comp })).toBe("/x/la-liga.png");
    expect(trophyAssetFor("cup", { competition: comp })).toBe("/x/copa-del-rey.png");
  });

  it("falls back to the league's own mark when no trophy was photographed", () => {
    // A competition logo is already on disk from the crest fetch and names the title
    // perfectly well, so a league should never reach the silhouette.
    expect(trophyAssetFor("league", { competition: { trophy: null, logo: "/x/logo.svg" } })).toBe(
      "/x/logo.svg",
    );
    // A cup has no logo bucket of its own, so it does drop through.
    expect(trophyAssetFor("cup", { competition: { cupTrophy: null, logo: "/x/logo.svg" } })).toBeNull();
  });

  it("resolves all three individual awards", () => {
    expect(trophyAssetFor("ballon_dor", { mirrored })).toBe("/x/bdo.png");
    expect(trophyAssetFor("golden_boot", { mirrored })).toBe("/x/boot.png");
    expect(trophyAssetFor("golden_glove", { mirrored })).toBe("/x/glove.png");
  });

  it("resolves the club and national trophies it was asked about", () => {
    expect(trophyAssetFor("continental_a", { confederation: "UEFA", mirrored })).toBe("/x/ucl.png");
    expect(trophyAssetFor("continental_a", { confederation: "CONCACAF", mirrored })).toBe("/x/concacaf.png");
    expect(trophyAssetFor("continental_b", { confederation: "CONMEBOL", mirrored })).toBe("/x/sudamericana.png");
    expect(trophyAssetFor("continental_nt", { confederation: "UEFA", mirrored })).toBe("/x/euro.png");
    expect(trophyAssetFor("world_cup", { mirrored })).toBe("/x/wc.png");
    expect(trophyAssetFor("club_world_cup", { mirrored })).toBe("/x/cwc.png");
  });

  /**
   * The map is committed; the images are not. So the thing worth guarding is that every
   * confederation has somewhere to look - a missing slug is a permanent silhouette that
   * no amount of re-fetching would ever fix.
   */
  it("knows a slug for every confederation and every continental trophy", () => {
    const confederations = [...new Set(
      Object.values(world.countries).map((c) => c.confederation).filter(Boolean),
    )];
    expect(confederations.length).toBe(6);
    for (const confederation of confederations) {
      for (const trophy of ["continental_a", "continental_b", "continental_nt"]) {
        // Pass a map that contains every possible key, so this tests the slug table and
        // not what happens to be downloaded on this machine.
        const everything = new Proxy({}, { get: (_t, key) => `/any/${String(key)}` });
        const found = trophyAssetFor(trophy, { confederation, mirrored: everything });
        // CONCACAF and OFC have no second-tier club competition the model would award
        // separately; everything else must resolve.
        if (trophy === "continental_b" && ["OFC"].includes(confederation)) continue;
        expect(found, `no slug for ${trophy} / ${confederation}`).toBeTruthy();
      }
    }
  });

  it("returns nothing for a slug that was never mirrored", () => {
    expect(trophyAssetFor("continental_a", { confederation: "CAF", mirrored })).toBeNull();
    expect(trophyAssetFor("continental_a", { confederation: "UEFA", mirrored: {} })).toBeNull();
  });

  it("never resolves a photograph for something with nothing behind it", () => {
    expect(trophyAssetFor("league", {})).toBeNull();
    expect(trophyAssetFor("cup", {})).toBeNull();
    expect(trophyAssetFor("nonsense", { confederation: "UEFA", mirrored })).toBeNull();
  });

  it("still has a silhouette for every gap it just refused to fill", () => {
    for (const [trophy, confederation] of [
      ["continental_a", "CAF"],
      ["continental_b", "AFC"],
      ["league", null],
      ["golden_boot", null],
    ]) {
      expect(trophyAssetFor(trophy, { confederation, mirrored: {} })).toBeNull();
      expect(hasSilhouette(trophy)).toBe(true);
    }
  });
});
