/**
 * The two ends of the table, and the two things they were getting wrong.
 *
 * A promotion play-off and a survival final are the only nights in a career that decide a
 * TABLE rather than a cup, and that made them the only two that were half-modelled:
 *
 *  1. The season summary did not know they had been played. `leaguePosition` derives the
 *     finishing place from reputation and the year's form, so a June spent in a promotion
 *     play-off was filed fourteenth and a survival final ninth - a table that had never
 *     played the match it was supposed to explain.
 *  2. They were the only non-league matches allowed to end level and stop there. A knockout
 *     that finishes square goes to penalties everywhere else in this game; these two sat on
 *     screen reading 1-1 with nobody having gone up or stayed up.
 *
 * Both come from the same root - nobody answered the night - so both are fixed by the same
 * thing: `settleFinal` rolls promotion and survival with the season's own stream, the feed
 * hands a level tie to whoever really went up, and `simulateSeason` honours the answer
 * instead of rolling it again.
 */
import { describe, expect, it } from "vitest";

import {
  PHASES,
  acceptOffer,
  agreeTerms,
  completeSigning,
  nextFixture,
  nextTie,
  openMarket,
  playChance,
  resolveEvent,
  signYouthClub,
  startCareer,
  takeShot,
  watchMatch,
} from "./career.js";
import {
  PLAYOFF_PLACES,
  RELEGATION_PLACES,
  SURVIVAL_PLACES,
  leaguePosition,
} from "./engine.js";
import { world } from "./world.js";

describe("where a play-off side finished", () => {
  const club = { id: "c", domestic_reputation: 1, international_reputation: 1 };

  it("puts a promotion play-off inside the play-off places, up or not", () => {
    for (const promoted of [true, false]) {
      for (const latent of [-2, -1, 0, 1, 2]) {
        const position = leaguePosition({
          club, ovr: 72, latent, promoted, promotionPlayoff: true, size: 22,
        });
        expect(position).toBeGreaterThanOrEqual(3);
        expect(position).toBeLessThanOrEqual(2 + PLAYOFF_PLACES);
      }
    }
  });

  it("does not call a play-off winner champion of the division", () => {
    // The old rule read the play-off through `promoted` and printed first or second, which
    // is the one thing a side that went up through the play-off certainly did not finish.
    const position = leaguePosition({
      club, ovr: 72, promoted: true, promotionPlayoff: true, size: 22,
    });
    expect(position).toBeGreaterThan(2);
  });

  it("keeps automatic promotion in the top two", () => {
    expect(leaguePosition({ club, ovr: 72, promoted: true, size: 22 })).toBeLessThanOrEqual(2);
  });

  it("leaves a side that came through a survival final just above the drop", () => {
    const size = 20;
    const bottom = size - RELEGATION_PLACES;
    for (const latent of [-2, -1, 0, 1, 2]) {
      const position = leaguePosition({ club, ovr: 68, latent, survivalPlayoff: true, size });
      expect(position).toBeGreaterThanOrEqual(bottom - SURVIVAL_PLACES + 1);
      expect(position).toBeLessThanOrEqual(bottom);
    }
  });

  it("still puts a side that lost the survival final in the drop", () => {
    const position = leaguePosition({
      club, ovr: 68, relegated: true, survivalPlayoff: true, size: 20,
    });
    expect(position).toBeGreaterThan(20 - RELEGATION_PLACES);
  });

  it("keeps the shape inside the band - a better year finishes higher", () => {
    // Low latent is a good year (see fortune.js), so it must not come out below a bad one.
    const good = leaguePosition({ club, ovr: 72, latent: -2, promotionPlayoff: true, size: 22 });
    const bad = leaguePosition({ club, ovr: 72, latent: 2, promotionPlayoff: true, size: 22 });
    expect(good).toBeLessThanOrEqual(bad);
  });
});

/* ── The same two questions, asked of whole careers ────────────────────────── */

const POSITIONS = ["DC", "POR", "DFC", "MC", "EI"];

const startAt = (seed, position) =>
  startCareer(
    { seed, surname: "MOLINA", number: 9, foot: "left", country: "ESP", position, mode: "intensa" },
    world,
  );

/** Convert every chance the night owes, whichever mechanic it comes up as. */
function resolveMoment(run) {
  let current = run;
  let guard = 0;
  while (current.phase === PHASES.MATCH && !current.matchday.last && guard < 10) {
    guard += 1;
    const { shot } = current.matchday;
    if (shot.mode === "skill") {
      const { spot, gates, target } = shot.chance;
      if (spot) {
        current = playChance(current, {
          x: spot.x + (spot.travel?.x ?? 0),
          y: spot.y + (spot.travel?.y ?? 0),
          t: 1,
        });
      } else {
        current = playChance(current, gates ? gates : target);
      }
    } else {
      current = takeShot(watchMatch(current, "es"), shot.options[shot.gap]);
    }
  }
  return current;
}

/** How many clubs the player's division holds, which is what a position is read against. */
const sizeOf = (clubId) => {
  const competitionId = world.clubs[clubId]?.competitionId;
  return Math.max(
    2,
    Object.values(world.clubs).filter((club) => club.competitionId === competitionId).length,
  );
};

/**
 * Every night of a sweep of careers, with what the season made of it afterwards.
 *
 * Driven rather than forced: what is under test is the ordinary path - the fixture list
 * staging its own play-off in its own season - because that is where both bugs lived.
 */
function sweep(seeds) {
  const nights = [];
  const seasons = [];

  seeds.forEach((seed, index) => {
    let run = startAt(seed, POSITIONS[index % POSITIONS.length]);
    run = completeSigning(agreeTerms(signYouthClub(run, run.offers[0].clubId)));
    let years = 0;
    while (run.phase !== PHASES.RETIRED && years < 40) {
      years += 1;
      let cards = 0;
      while (run.phase === PHASES.EVENT && cards < 10) {
        cards += 1;
        run = resolveEvent(run, run.event.es.options[0].id, "es");
      }

      const played = [];
      let guard = 0;
      while ((run.phase === PHASES.MATCH || run.phase === PHASES.TOURNAMENT) && guard < 60) {
        guard += 1;
        if (run.phase === PHASES.TOURNAMENT) {
          run = nextTie(run, "es");
          continue;
        }
        const fixture = run.matchday.fixtures[run.matchday.index];
        run = resolveMoment(run);
        const finish = run.matchday.broadcast?.finish;
        const last = run.matchday.last;
        if (finish?.closed) {
          nights.push({
            seed,
            year: years,
            kind: fixture.kind,
            decides: fixture.decides,
            finish,
            // The one the summer has to agree with. See `settleFinal`.
            settled: last?.settledTitle ?? null,
          });
        }
        played.push(fixture.kind);
        run = nextFixture(run, "es");
      }

      const record = run.seasonResults?.[run.seasonResults.length - 1]?.record;
      if (record) seasons.push({ seed, year: years, played, record, size: sizeOf(record.clubId) });

      run = openMarket(run, "es");
      if (run.phase === PHASES.RETIRED) break;
      run = completeSigning(agreeTerms(acceptOffer(run, run.offers[0].clubId)));
    }
  });

  return { nights, seasons };
}

const SWEPT = sweep(Array.from({ length: 24 }, (_, index) => `playoff-${index}`));

describe("a season that came down to the table", () => {
  it("stages enough play-offs and survival finals to be measuring anything", () => {
    const staged = SWEPT.seasons.filter(
      (entry) => entry.played.includes("ascenso") || entry.played.includes("salvacion"),
    );
    expect(staged.length).toBeGreaterThan(10);
  });

  it("files a promotion play-off season in the play-off places", () => {
    for (const entry of SWEPT.seasons) {
      if (!entry.played.includes("ascenso")) continue;
      const last = Math.min(entry.size, 2 + PLAYOFF_PLACES);
      const where = `${entry.seed} ${entry.record.season}: ${entry.record.position}.º de ${entry.size}`;
      expect(entry.record.position, where).toBeGreaterThanOrEqual(Math.min(3, entry.size));
      expect(entry.record.position, where).toBeLessThanOrEqual(last);
    }
  });

  it("files a survival final season at the bottom of the table, either side of the line", () => {
    for (const entry of SWEPT.seasons) {
      if (!entry.played.includes("salvacion")) continue;
      const bottom = Math.max(2, entry.size - RELEGATION_PLACES);
      const where = `${entry.seed} ${entry.record.season}: ${entry.record.position}.º de ${entry.size}`;
      if (entry.record.relegated) {
        expect(entry.record.position, where).toBeGreaterThan(bottom);
      } else {
        expect(entry.record.position, where).toBeGreaterThanOrEqual(
          Math.max(2, bottom - SURVIVAL_PLACES + 1),
        );
        expect(entry.record.position, where).toBeLessThanOrEqual(bottom);
      }
    }
  });
});

describe("a match that is not a league match cannot end level", () => {
  /** The two competitions where a draw really is a result: the table takes the point. */
  const LEAGUE = new Set(["league", "derby"]);

  it("sees a level night in a knockout at all", () => {
    const level = SWEPT.nights.filter(
      (night) => !LEAGUE.has(night.decides) && night.finish.final.home === night.finish.final.away,
    );
    expect(level.length).toBeGreaterThan(0);
  });

  it("settles every one of them, from twelve yards if it has to", () => {
    for (const night of SWEPT.nights) {
      if (LEAGUE.has(night.decides)) continue;
      const { final, beats } = night.finish;
      const decided =
        final.home !== final.away ||
        beats.some((beat) => beat.id === "shootoutWon" || beat.id === "shootoutLost");
      expect(decided, `${night.kind} sin resolver: ${final.home}-${final.away}`).toBe(true);
    }
  });

  it("leaves a league match free to be drawn", () => {
    // The other half of the rule, and the reason this is not simply "never level": a point
    // is a result, and a derby that finishes 1-1 has not gone unanswered.
    const drawn = SWEPT.nights.filter(
      (night) => LEAGUE.has(night.decides) && night.finish.final.home === night.finish.final.away,
    );
    expect(drawn.length).toBeGreaterThan(0);
    for (const night of drawn) {
      expect(night.finish.beats.some((beat) => beat.kicks)).toBe(false);
    }
  });

  it("gives the night to whoever really went up, or really stayed up", () => {
    /*
     * The shoot-out is not a second lottery on top of the first. `settleFinal` has already
     * rolled promotion and survival with the season's own stream and odds, so the verdict
     * the player watched and the division he is in next August are the same answer - which
     * is the rule every cup final in this game already obeys.
     */
    const seasons = new Map(
      SWEPT.seasons.map((entry) => [`${entry.seed}:${entry.year}`, entry]),
    );
    let checked = 0;
    for (const night of SWEPT.nights) {
      if (night.kind !== "ascenso" && night.kind !== "salvacion") continue;
      const entry = seasons.get(`${night.seed}:${night.year}`);
      if (!entry) continue;
      checked += 1;
      const where = `${night.seed} año ${night.year} (${night.kind})`;
      expect(night.settled, where).toBeTruthy();
      const stood = night.kind === "ascenso" ? entry.record.promoted : !entry.record.relegated;
      expect(night.settled.won, where).toBe(stood);
      expect(night.finish.won, where).toBe(stood);
    }
    expect(checked).toBeGreaterThan(10);
  });
});
