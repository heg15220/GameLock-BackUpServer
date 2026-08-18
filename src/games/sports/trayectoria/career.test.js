import { describe, expect, it } from "vitest";

import {
  PHASES,
  acceptClause,
  acceptOffer,
  agreeTerms,
  askFor,
  availableAsks,
  cancelNegotiation,
  completeSigning,
  currentStanding,
  eventContext,
  nextFixture,
  nextTie,
  openMarket,
  playChance,
  refuseClause,
  resolveEvent,
  signYouthClub,
  startCareer,
  switchNationality,
  takeShot,
  watchMatch,
} from "./career.js";
import { PRODUCES, REPERTOIRE } from "./bigmatch.js";
import { EVENTS_BY_ID, MAX_INJURIES, drawEvent, weightOf } from "./events.js";
import { IDOLATRY } from "./idolatry.js";
import { shadowStanding } from "./rival.js";
import { CONTRACT } from "./contract.js";
import { seasonBand } from "./report.js";
import { CAREER_MODES, GROWTH, RETIREMENT_AGE, START_AGE } from "./tables.js";
import { world } from "./world.js";

const start = (overrides = {}) =>
  startCareer(
    {
      seed: "test-career",
      surname: "MOLINA",
      number: 9,
      foot: "left",
      country: "ESP",
      position: "DC",
      mode: "intensa",
      ...overrides,
    },
    world,
  );

/**
 * Sign without arguing. Picking a club now only opens the table, so every test that just
 * wants to be at a club goes through the two phases the player would.
 */
const signThrough = (run, clubId) => completeSigning(agreeTerms(signYouthClub(run, clubId)));
const takeOffer = (run, clubId) => completeSigning(agreeTerms(acceptOffer(run, clubId)));

/**
 * Take every shot the step puts in front of you, always going for the first placement.
 * A step can open the phase once per season, so this drains it rather than assuming one.
 */
/**
 * Resolve whichever kind of decider is on screen.
 *
 * A moment is either yours to take (a minigame) or a call inside a match that is being
 * narrated around you - see matchmode.js. `hit` says whether to convert it; the caller
 * does not have to know which mode came up, which is the point.
 */
function resolveMoment(run, hit = true, locale = "es") {
  let current = run;
  let guard = 0;
  // A fixture can owe him none, one or several sights of goal; drain the lot so callers
  // still deal in whole fixtures.
  while (current.phase === PHASES.MATCH && !current.matchday.last && guard < 10) {
    guard += 1;
    const { shot } = current.matchday;
    if (shot.mode === "skill") {
      /*
       * AN AIM IS A POINT, not a number, and this never knew it: `chance.target` is
       * undefined for the one mechanic measured in two dimensions, so every through ball a
       * career was handed was answered with `undefined` and judged as a total miss. The
       * midfielder's whole repertoire was being played by a harness that could not play it.
       * See `targetsOf`.
       */
      if (shot.chance.spot) {
        const spot = shot.chance.spot;
        const away = shot.chance.tolerance * 4 + 0.3;
        current = playChance(
          current,
          hit
            ? { x: spot.x + (spot.travel?.x ?? 0), y: spot.y + (spot.travel?.y ?? 0), t: 1 }
            : { x: Math.min(1, spot.x + away), y: Math.min(1, spot.y + away), t: 1 },
        );
      } else {
        const aim = shot.chance.gates ?? [shot.chance.target];
        // Dead on the target converts; a whole tolerance off the mark cannot.
        const inputs = aim.map((value) =>
          hit ? value : Math.min(1, value + shot.chance.tolerance * 4 + 0.3),
        );
        current = playChance(current, shot.chance.gates ? inputs : inputs[0]);
      }
    } else {
      /*
       * Missing on purpose means SHOOTING AT HIM. The keeper commits to one zone and every
       * other one is a goal (see `saveOdds`), so "the option next to the gap" stopped being
       * a miss the moment the model stopped covering everything but one place - both runs
       * scored and the two ways of playing a career came out identical.
       */
      const choice = hit ? shot.options[shot.gap] : shot.keeperAt ?? shot.options[0];
      current = takeShot(watchMatch(current, locale), choice);
    }
  }
  return current;
}

/**
 * Answer every card the step owes, taking the first option each time.
 *
 * A step deals one decision per season it covers, so `normal` asks two and `expres`
 * three; only `intensa` is the single card this harness used to assume. Draining the
 * phase is what the screen does too - one card, an answer, the next card - so a driver
 * that resolves exactly once simply stops half way through a step and spins.
 */
function answerEvents(run, locale = "es") {
  let current = run;
  let guard = 0;
  while (current.phase === PHASES.EVENT && guard < 10) {
    guard += 1;
    current = resolveEvent(current, current.event.es.options[0].id, locale);
  }
  expect(guard).toBeLessThan(10);
  return current;
}

/**
 * Every night of a season, in the order the season plays them.
 *
 * TOURNAMENT is in the loop because it is in the season now. The knockout ties used to be
 * queued after the whole year had been played and rolled; they are rounds of a competition
 * the player is in the middle of, so a season alternates between a tie his side plays and a
 * night he decides. A driver that only knew about MATCH stopped dead on the first last
 * sixteen and never reached the market.
 */
function playMatches(run, locale = "es", hit = true) {
  let current = run;
  let guard = 0;
  while ((current.phase === PHASES.MATCH || current.phase === PHASES.TOURNAMENT) && guard < 60) {
    guard += 1;
    if (current.phase === PHASES.TOURNAMENT) {
      current = nextTie(current, locale);
      continue;
    }
    current = resolveMoment(current, hit, locale);
    current = nextFixture(current, locale);
  }
  expect(guard).toBeLessThan(60);
  return current;
}

/** Drive a whole career, always taking the first option and the first offer. */
function playToRetirement(run, { locale = "es", pickOffer, hit = true } = {}) {
  let current = run;
  let guard = 0;
  current = signThrough(current, current.offers[0].clubId);

  while (current.phase !== PHASES.RETIRED && guard < 200) {
    guard += 1;
    current = answerEvents(current);
    current = playMatches(current, locale, hit);
    current = openMarket(current, locale);
    if (current.phase === PHASES.RETIRED) break;
    const offer = pickOffer ? pickOffer(current) : current.offers[0];
    current = takeOffer(current, offer.clubId);
  }
  expect(guard).toBeLessThan(200);
  return current;
}

describe("career start", () => {
  it("opens on the youth market with three clubs from the player's country", () => {
    const run = start();
    expect(run.phase).toBe(PHASES.YOUTH);
    expect(run.offers.length).toBe(3);
    for (const offer of run.offers) {
      const competition = world.competitions[world.clubs[offer.clubId].competitionId];
      expect(competition.country_fifa_code).toBe("ESP");
    }
  });

  it("starts at 16 with no club and simulates a shadow to measure against", () => {
    const run = start();
    expect(run.state.age).toBe(START_AGE);
    expect(run.state.clubId).toBeNull();
    expect(run.shadow.seasons.length).toBeGreaterThan(0);
    expect(run.shadow.surname).toBeTruthy();
  });

  it("is a pure function of the seed", () => {
    const a = playToRetirement(start({ seed: "same" }));
    const b = playToRetirement(start({ seed: "same" }));
    expect(a.summary).toEqual(b.summary);
    expect(a.state.history.map((s) => s.goals)).toEqual(b.state.history.map((s) => s.goals));
  });

  it("gives different seeds different careers", () => {
    const a = playToRetirement(start({ seed: "one" }));
    const b = playToRetirement(start({ seed: "two" }));
    expect(a.state.history.map((s) => s.goals)).not.toEqual(b.state.history.map((s) => s.goals));
  });
});

describe("the step cycle", () => {
  it("goes youth -> event -> match -> season -> market -> event", () => {
    let run = start();
    run = signThrough(run, run.offers[0].clubId);
    expect(run.phase).toBe(PHASES.EVENT);
    expect(run.event).toBeTruthy();

    run = answerEvents(run);
    expect(run.phase).toBe(PHASES.MATCH);
    expect(run.matchday.fixtures.length).toBeGreaterThan(0);

    run = playMatches(run);
    expect(run.phase).toBe(PHASES.SEASON);
    expect(run.seasonResults.length).toBe(1);
    expect(run.seasonResults[0].headline.head).toBeTruthy();

    run = openMarket(run);
    expect(run.phase).toBe(PHASES.MARKET);
    expect(run.offers.length).toBeGreaterThan(0);

    run = takeOffer(run, run.offers[0].clubId);
    expect(run.phase).toBe(PHASES.EVENT);
    expect(run.step).toBe(1);
  });

  it("plays as many seasons per step as the mode says", () => {
    for (const mode of Object.keys(CAREER_MODES)) {
      let run = start({ mode });
      run = signThrough(run, run.offers[0].clubId);
      run = answerEvents(run);
      run = playMatches(run);
      expect(run.seasonResults.length).toBe(CAREER_MODES[mode].seasonsPerStep);
    }
  });

  it("ignores actions sent in the wrong phase", () => {
    const run = start();
    expect(resolveEvent(run, "accept")).toBe(run);
    expect(takeShot(run, "izquierda")).toBe(run);
    expect(nextFixture(run)).toBe(run);
    expect(acceptOffer(run, "boca-juniors")).toBe(run);
  });

  it("never offers the same event twice while the catalogue holds out", () => {
    const run = playToRetirement(start({ mode: "normal" }));
    const seen = run.usedEventIds;
    expect(new Set(seen).size).toBe(seen.length);
  });
});

describe("the table", () => {
  it("does not sign anybody: picking a club only opens talks", () => {
    let run = start();
    const clubId = run.offers[0].clubId;
    run = signYouthClub(run, clubId);

    expect(run.phase).toBe(PHASES.NEGOTIATION);
    expect(run.state.clubId).toBeNull();
    expect(run.deal.clubId).toBe(clubId);
    expect(run.deal.terms.years).toBeGreaterThan(0);
  });

  it("lets you walk away and come back to the offers", () => {
    let run = start();
    run = signYouthClub(run, run.offers[0].clubId);
    run = cancelNegotiation(run);
    expect(run.phase).toBe(PHASES.YOUTH);
    expect(run.deal).toBeNull();
  });

  it("gives a sixteen-year-old nothing to bargain with", () => {
    let run = start();
    run = signYouthClub(run, run.offers[0].clubId);
    expect(run.deal.leverage).toBeLessThan(0.35);
    expect(availableAsks(run).find((ask) => ask.id === "role").odds).toBe(0);
  });

  it("caps the asks and never lets the same one be made twice", () => {
    let run = start();
    run = signYouthClub(run, run.offers[0].clubId);

    const first = availableAsks(run)[0].id;
    run = askFor(run, first);
    expect(run.deal.round).toBe(1);
    expect(run.deal.last.askId).toBe(first);
    // Asked and answered.
    expect(availableAsks(run).some((ask) => ask.id === first)).toBe(false);
    expect(askFor(run, first)).toBe(run);

    run = askFor(run, availableAsks(run)[0].id);
    expect(run.deal.round).toBe(CONTRACT.maxAsks);
    expect(availableAsks(run)).toEqual([]);
    // Out of asks, and the reducer says so rather than quietly allowing a third.
    expect(askFor(run, "wage")).toBe(run);
  });

  it("writes the agreed terms onto the career, not the ones first offered", () => {
    let run = start();
    run = signYouthClub(run, run.offers[0].clubId);
    run = askFor(run, "short");
    const agreed = run.deal.terms;

    run = agreeTerms(run);
    expect(run.phase).toBe(PHASES.SIGNING);
    expect(run.signing.contract.years).toBe(agreed.years);

    run = completeSigning(run);
    expect(run.phase).toBe(PHASES.EVENT);
    expect(run.state.clubId).toBe(run.state.contract.clubId);
    expect(run.state.contract.years).toBe(agreed.years);
    expect(run.state.contract.yearsLeft).toBe(agreed.years);
  });

  it("ignores table actions sent from anywhere else", () => {
    const run = start();
    expect(askFor(run, "wage")).toBe(run);
    expect(agreeTerms(run)).toBe(run);
    expect(completeSigning(run)).toBe(run);
    expect(cancelNegotiation(run)).toBe(run);
    expect(availableAsks(run)).toEqual([]);
  });
});

describe("the contract, across seasons", () => {
  /** Sign, then play whole steps until the predicate holds or the career ends. */
  const runUntil = (run, predicate, limit = 24) => {
    let current = run;
    let guard = 0;
    while (current.phase !== PHASES.RETIRED && guard < limit && !predicate(current)) {
      guard += 1;
      current = answerEvents(current);
      current = playMatches(current);
      current = openMarket(current);
      if (current.phase === PHASES.RETIRED) break;
      const stay = current.offers.find((offer) => offer.stay);
      current = takeOffer(current, (stay ?? current.offers[0]).clubId);
    }
    return current;
  };

  it("burns a season off the deal for every season played", () => {
    let run = signThrough(start(), start().offers[0].clubId);
    const signed = run.state.contract.yearsLeft;
    run = playMatches(answerEvents(run));
    expect(run.state.contract.yearsLeft).toBe(signed - 1);
  });

  it("keeps a stay option on the table while the deal runs, however badly it goes", () => {
    let run = start();
    run = signThrough(run, run.offers[0].clubId);
    run = playMatches(answerEvents(run));
    // The club has had enough - but it is tied in and cannot say so yet. The deal is set
    // explicitly because a FIRST contract is always one season and would have expired by
    // now; this is about what a multi-year one buys.
    run = {
      ...run,
      state: {
        ...run.state,
        clubWantsOut: true,
        contract: { ...run.state.contract, years: 3, yearsLeft: 2 },
      },
    };
    run = openMarket(run);
    expect(run.state.contract.yearsLeft).toBeGreaterThan(0);
    expect(run.offers.some((offer) => offer.stay)).toBe(true);
  });

  it("lets the club walk away once the deal has run out", () => {
    let run = signThrough(start(), start().offers[0].clubId);
    run = playMatches(answerEvents(run));
    run = {
      ...run,
      state: { ...run.state, clubWantsOut: true, contract: { ...run.state.contract, yearsLeft: 0 } },
    };
    run = openMarket(run);
    expect(run.offers.some((offer) => offer.stay)).toBe(false);
  });

  it("prints the torn-up years on the offer that would tear them up", () => {
    let run = runUntil(signThrough(start({ seed: "breach" }), start({ seed: "breach" }).offers[0].clubId),
      (current) =>
        current.phase === PHASES.MARKET &&
        current.state.contract?.yearsLeft > 0 &&
        current.offers.some((offer) => offer.exit?.breachYears > 0));

    const move = run.offers.find((offer) => offer.exit?.breachYears > 0);
    if (move) {
      expect(move.exit.breachYears).toBe(run.state.contract.yearsLeft);
      expect(move.exit.breach).toBeLessThan(0);
      // The breach is on top of the ordinary cost of walking out.
      expect(move.exit.change).toBeLessThan(move.exit.breach);
    }
  });

  it("charges the wage against the role actually played, season after season", () => {
    let run = signThrough(start({ seed: "wages" }), start({ seed: "wages" }).offers[0].clubId);
    run = playMatches(answerEvents(run));
    const record = run.seasonResults[0].record;
    expect(record.wage).toBe(run.state.contract.wage);
    expect(typeof record.wagePressure).toBe("number");
  });
});

describe("the three matches", () => {
  /** A run parked on the first shot of the career. */
  const atFirstShot = (overrides = {}) => {
    let run = start(overrides);
    run = signThrough(run, run.offers[0].clubId);
    return answerEvents(run);
  };

  it("opens the phase once per season, so every season gets its own three", () => {
    for (const mode of Object.keys(CAREER_MODES)) {
      let run = atFirstShot({ mode });
      let matchdays = 0;
      let guard = 0;
      while (run.phase === PHASES.MATCH && guard < 40) {
        guard += 1;
        if (run.matchday.index === 0 && !run.matchday.results.length) matchdays += 1;
        run = nextFixture(resolveMoment(run, true));
      }
      expect(matchdays).toBe(CAREER_MODES[mode].seasonsPerStep);
      expect(run.seasonResults.every((result) => result.record.bigMatches.length > 0)).toBe(true);
    }
  });

  it("holds the result until the player has read it, then moves on", () => {
    const run = atFirstShot();
    const fired = takeShot(run, run.matchday.shot.options[0]);
    expect(fired.matchday.last).toBeTruthy();
    expect(fired.matchday.results).toEqual([]);
    expect(fired.matchday.index).toBe(0);
    // A second shot at the same fixture is not a choice you get.
    expect(takeShot(fired, run.matchday.shot.options[1])).toBe(fired);

    // A sixteen-year-old at a small club usually only has the derby, so moving on either
    // opens the next fixture or ends the matchday - never leaves the shot hanging.
    const moved = nextFixture(fired);
    if (run.matchday.fixtures.length > 1) {
      expect(moved.matchday.results.length).toBe(1);
      expect(moved.matchday.index).toBe(1);
      expect(moved.matchday.last).toBeNull();
    } else {
      expect(moved.seasonResults[0].record.bigMatches.length).toBe(1);
    }
  });

  it("refuses a placement that was not on the table", () => {
    const run = atFirstShot();
    expect(takeShot(run, "no-such-placement")).toBe(run);
    expect(nextFixture(run)).toBe(run);
  });

  it("scores when the player finds the gap, and that goal lands in the season", () => {
    let run = atFirstShot();
    let scored = 0;
    while (run.phase === PHASES.MATCH) {
      const { shot } = run.matchday;
      run = nextFixture(takeShot(run, shot.options[shot.gap]));
      scored += 1;
    }
    const season = run.seasonResults[0].record;
    expect(season.bigMatches.every((match) => match.scored)).toBe(true);
    expect(season.bigMatchGoals).toBe(scored);
    expect(season.goals).toBeGreaterThanOrEqual(scored);
  });

  it("changes the career: the same seed, different shots, different trophies", () => {
    const play = (seed, hit) => {
      let run = atFirstShot({ seed });
      let guard = 0;
      // TOURNAMENT is part of a season now, so a driver that only knows MATCH stops on the
      // first knockout tie and never reaches the report. See `playMatches`.
      while ((run.phase === PHASES.MATCH || run.phase === PHASES.TOURNAMENT) && guard < 60) {
        guard += 1;
        run = run.phase === PHASES.TOURNAMENT ? nextTie(run) : nextFixture(resolveMoment(run, hit));
      }
      return run.seasonResults[0]?.record ?? null;
    };

    /*
     * A season can now give him no sight of goal at all - see `chancesFor` - and then
     * there is nothing to play differently and both runs are identical, correctly. The
     * test is about what happens when he DOES get a chance, so it finds a season that
     * offers one rather than assuming every season does.
     */
    /*
     * MEASURED OVER MANY SEEDS, because one is no longer a proof.
     *
     * It used to be: find the gap and it is a goal, miss it and it is a save. The keeper
     * commits to one of five zones now and can reach all of them - see `saveOdds` - so
     * putting it in the angle he has just left converts most of the time rather than every
     * time, and shooting at him goes in occasionally. One season could always come out
     * level by luck; what has to be true is the direction, over enough of them.
     */
    let seasons = 0;
    let hitGoals = 0;
    let missGoals = 0;
    let differed = 0;
    for (let i = 0; i < 40; i += 1) {
      const seed = `shots-${i}`;
      const hit = play(seed, true);
      if (!hit?.bigMatches?.some((match) => match.taken > 0)) continue;
      const miss = play(seed, false);
      if (!miss) continue;
      seasons += 1;
      hitGoals += hit.goals;
      missGoals += miss.goals;
      if (
        JSON.stringify(hit.bigMatches.map((m) => m.scored)) !==
        JSON.stringify(miss.bigMatches.map((m) => m.scored))
      ) {
        differed += 1;
      }
    }
    expect(seasons, "no seed gave him a chance in its first season").toBeGreaterThan(4);

    // Going for the corner he has vacated is worth goals, which is the whole of the moment.
    expect(hitGoals).toBeGreaterThan(missGoals);
    /*
     * And the two ways of playing it are not the same career - though they agree more often
     * than they used to, which is the model working rather than the test weakening. The
     * night's coin is the same for both runs, so the outcomes only diverge when it falls
     * BETWEEN the two save odds: the angle he left (beaten roughly one time in five) and
     * the zone next to him (beaten around half the time). Everything outside that band is
     * a goal either way or a save either way, exactly as football is.
     */
    expect(differed, "the shot never changed anything").toBeGreaterThanOrEqual(seasons / 5);
  });

  it("is still a pure function of the seed when the shots are the same", () => {
    const play = () => {
      let run = atFirstShot({ seed: "pure-shots" });
      let guard = 0;
      while (run.phase === PHASES.MATCH && guard < 40) {
        guard += 1;
        run = nextFixture(resolveMoment(run, true));
      }
      return run;
    };
    expect(play().seasonResults[0].record).toEqual(play().seasonResults[0].record);
  });

  it("leads the front page with the shot that decided the season", () => {
    let run = atFirstShot({ seed: "press-shot" });
    let decisive = false;
    while (run.phase === PHASES.MATCH) {
      const { shot, fixtures, index } = run.matchday;
      if (fixtures[index].decides !== "derby") decisive = true;
      run = nextFixture(takeShot(run, shot.options[shot.gap]));
    }
    if (decisive) expect(run.seasonResults[0].headline.id).toBe("decided-it");
  });
});

describe("career end", () => {
  it("retires by 40 with a summary, a verdict and a comparison", () => {
    const run = playToRetirement(start());
    expect(run.phase).toBe(PHASES.RETIRED);
    expect(run.state.age).toBeGreaterThanOrEqual(RETIREMENT_AGE);
    expect(run.summary.seasons).toBeGreaterThan(0);
    expect(run.verdict.head).toBeTruthy();
    expect(run.comparison.surname).toBe(run.shadow.surname);
  });

  it("writes the verdict in the locale it was asked for", () => {
    const es = playToRetirement(start({ seed: "locale" }), { locale: "es" });
    const en = playToRetirement(start({ seed: "locale" }), { locale: "en" });
    expect(es.verdict.head).not.toBe(en.verdict.head);
    // Same career, only the prose differs.
    expect(es.summary).toEqual(en.summary);
  });

  it("always has somewhere to sign, so no career dead-ends", () => {
    for (const seed of ["a", "b", "c", "d", "e"]) {
      const run = playToRetirement(start({ seed, mode: "normal" }));
      expect(run.state.history.every((season) => season.clubId)).toBe(true);
    }
  });
});

describe("rules that span seasons", () => {
  it("caps injuries across the whole career", () => {
    for (const seed of ["inj-1", "inj-2", "inj-3"]) {
      const run = playToRetirement(start({ seed }));
      expect(run.injuries.length).toBeLessThanOrEqual(MAX_INJURIES);
    }
  });

  it("keeps personal events rationed and never back to back", () => {
    const run = playToRetirement(start({ mode: "normal" }));
    const [, maxPersonal] = CAREER_MODES.normal.personalEvents;
    expect(run.personalEventsSeen).toBeLessThanOrEqual(maxPersonal);

    const personalSteps = run.usedEventIds
      .map((id, index) => (EVENTS_BY_ID[id]?.theme === "personal" ? index : -1))
      .filter((index) => index >= 0);
    for (let i = 1; i < personalSteps.length; i += 1) {
      expect(personalSteps[i] - personalSteps[i - 1]).toBeGreaterThanOrEqual(2);
    }
  });

  it("sends you back to your first club when you take that card", () => {
    let run = start();
    const firstClub = run.offers[0].clubId;
    run = signThrough(run, firstClub);
    // Move somewhere else, then force the homecoming card.
    run = answerEvents(run);
    run = playMatches(run);
    run = openMarket(run);
    const elsewhere = run.offers.find((offer) => offer.clubId !== firstClub);
    run = takeOffer(run, elsewhere.clubId);
    expect(run.state.clubId).not.toBe(firstClub);

    run = { ...run, event: EVENTS_BY_ID["regreso-al-barrio"] };
    run = resolveEvent(run, "accept");
    expect(run.state.clubId).toBe(firstClub);
  });

  it("turns a terminated contract into a market without a stay option", () => {
    let run = start();
    run = signThrough(run, run.offers[0].clubId);
    run = { ...run, event: EVENTS_BY_ID["crisis-en-el-club"] };
    run = resolveEvent(run, "leave");
    expect(run.state.forceTransfer).toBe(true);

    run = openMarket(playMatches(run));
    expect(run.offers.some((offer) => offer.stay)).toBe(false);
  });

  it("only opens the nationality switch when an event put it on the table", () => {
    let run = start();
    run = signThrough(run, run.offers[0].clubId);
    run = answerEvents(run);
    run = openMarket(playMatches(run));
    expect(run.nationalityChoices).toBeNull();
    expect(switchNationality(run, "ITA").state.country).toBe("ESP");
  });

  it("switches nationality when the passport card was taken", () => {
    let run = start();
    run = signThrough(run, run.offers[0].clubId);
    run = answerEvents(run);
    run = playMatches(run);
    run = { ...run, state: { ...run.state, pendingCountryChange: true, ovr: 88 } };
    run = openMarket(run);
    expect(run.nationalityChoices.length).toBeGreaterThan(0);

    const target = run.nationalityChoices[0];
    run = switchNationality(run, target);
    expect(run.state.country).toBe(target);
    expect(run.state.pendingCountryChange).toBe(false);
  });
});

describe("idolatría", () => {
  /** Play a whole career either always renewing, or always taking the first move. */
  const career = (seed, { loyal }) =>
    playToRetirement(start({ seed, mode: "normal" }), {
      pickOffer: (run) => {
        const stay = run.offers.find((o) => o.stay);
        if (loyal) return stay ?? run.offers[0];
        return run.offers.find((o) => !o.stay) ?? run.offers[0];
      },
    });

  /**
   * The thesis, measured across seeds rather than on each one.
   *
   * This used to assert that EVERY loyal career out-idolises its own touring twin, and
   * that is not a property the model has. Seed i1 is the counter-example and it is the
   * model being right, not wrong: the touring twin lands at a European giant and stays
   * ten of its twenty-four seasons, winning things, while the loyal twin gives all
   * twenty-four to a side that wins nothing and stops dead at CEILING_WITHOUT_TITLE. It
   * ends 95 to 80. Ten years somewhere you win beats twenty-four somewhere you cannot,
   * and idolatría is supposed to say so.
   *
   * What is true is the distribution: staying is worth far more on average, and it wins
   * on most careers. Both halves are asserted, because a change that genuinely inverted
   * the incentive - a card that paid you for arriving somewhere, say - would move them
   * together, and neither alone would catch it.
   */
  it("rewards staying and punishes touring, across a whole career", () => {
    const seeds = ["i1", "i2", "i3", "i4", "i5", "i6"];
    const peak = (run) => run.summary.idolatry?.value ?? 0;
    const loyalPeaks = seeds.map((s) => peak(career(s, { loyal: true })));
    const touringPeaks = seeds.map((s) => peak(career(s, { loyal: false })));

    const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(loyalPeaks)).toBeGreaterThan(mean(touringPeaks) + 20);

    const stayingWins = seeds.filter((_, i) => loyalPeaks[i] > touringPeaks[i]).length;
    expect(stayingWins, `staying won only ${stayingWins}/${seeds.length}`).toBeGreaterThanOrEqual(4);
  });

  it("counts idolatría per club, not globally", () => {
    const run = career("multi", { loyal: false });
    const clubs = run.summary.idolatry.clubs;
    expect(clubs.length).toBeGreaterThan(1);
    expect(run.summary.idolatry.value).toBe(clubs[0].value);
  });

  it("keeps a club with no trophy below the statue however long you stay", () => {
    for (const seed of ["c1", "c2", "c3", "c4"]) {
      const run = career(seed, { loyal: true });
      for (const club of run.summary.idolatry.clubs) {
        const wonHere = run.state.trophies.some((t) => String(t.clubId) === String(club.clubId));
        if (!wonHere) expect(club.value).toBeLessThanOrEqual(IDOLATRY.ceilingWithoutTitle);
      }
    }
  });

  it("records the change on every season, so the report can show it", () => {
    let run = start();
    run = signThrough(run, run.offers[0].clubId);
    run = answerEvents(run);
    run = playMatches(run);
    const { idolatry } = run.seasonResults[0].record;
    expect(idolatry.after).toBeGreaterThan(0);
    expect(idolatry.change).toBeCloseTo(idolatry.after - idolatry.before, 5);
    expect(idolatry.level).toBeTruthy();
  });

  it("prints the cost of leaving on every offer that would move you", () => {
    let run = start();
    run = signThrough(run, run.offers[0].clubId);
    for (let i = 0; i < 3; i += 1) {
      run = answerEvents(run);
      run = playMatches(run);
      run = openMarket(run);
      if (run.phase === PHASES.RETIRED) break;
      const moves = run.offers.filter((o) => !o.stay && o.clubId !== run.state.clubId);
      const here = run.state.idolatry[run.state.clubId] ?? 0;
      for (const offer of moves) {
        if (here <= 0) {
          // Nothing to lose yet - the card correctly stays quiet rather than quoting zero.
          expect(offer.exit).toBeNull();
          continue;
        }
        expect(offer.exit).toBeTruthy();
        expect(offer.exit.current).toBeCloseTo(here, 5);
        expect(offer.exit.change).toBeLessThan(0);
        expect(offer.exit.after).toBe(Math.max(0, offer.exit.current + offer.exit.change));
      }
      const stay = run.offers.find((o) => o.stay);
      expect(stay?.exit).toBeUndefined();
      run = takeOffer(run, (moves[0] ?? run.offers[0]).clubId);
    }
  });

  it("charges the published price when the offer is taken", () => {
    let run = start();
    run = signThrough(run, run.offers[0].clubId);
    run = answerEvents(run);
    run = playMatches(run);
    run = openMarket(run);

    const from = run.state.clubId;
    const move = run.offers.find((o) => !o.stay && o.clubId !== from);
    const quoted = move.exit;
    run = takeOffer(run, move.clubId);
    expect(Math.round(run.state.idolatry[from])).toBe(Math.round(quoted.after));
  });
});

describe("state-dependent event weights", () => {
  it("describes the career to the deck", () => {
    let run = start();
    run = signThrough(run, run.offers[0].clubId);
    const context = eventContext(run);
    expect(context.age).toBe(START_AGE);
    expect(context.atFirstClub).toBe(true);
    expect(context.abroad).toBe(false);
    expect(typeof context.delta).toBe("number");
    expect(typeof context.clubReputation).toBe("number");
  });

  it("keeps age-gated cards out of a teenager's deck", () => {
    const young = { age: 17, ovr: 50, delta: 0, role: null, seasonsAtClub: 0, clubReputation: 1, calledUp: false, atFirstClub: true, abroad: false };
    const gated = ["el-chico-de-la-cantera", "oferta-del-rival", "hacienda", "regreso-al-barrio"];
    for (const id of gated) {
      expect(weightOf(EVENTS_BY_ID[id], young)).toBe(0);
    }
  });

  it("opens those cards later in the career", () => {
    const veteran = { age: 31, ovr: 80, delta: 2, role: "titular", seasonsAtClub: 4, clubReputation: 3, calledUp: true, atFirstClub: false, abroad: true };
    expect(weightOf(EVENTS_BY_ID["el-chico-de-la-cantera"], veteran)).toBeGreaterThan(0);
    expect(weightOf(EVENTS_BY_ID["regreso-al-barrio"], veteran)).toBeGreaterThan(0);
    expect(weightOf(EVENTS_BY_ID["hacienda"], veteran)).toBeGreaterThan(0);
  });

  it("makes injuries likelier with age and the academy kid impossible when young", () => {
    const at = (age) => weightOf(EVENTS_BY_ID["lesion-en-el-peor-momento"], { age, ovr: 75, delta: 0, role: "titular", seasonsAtClub: 2, clubReputation: 2 });
    expect(at(34)).toBeGreaterThan(at(28));
    expect(at(22)).toBe(20);
  });

  it("weights the homesick card up when you are abroad", () => {
    const base = { age: 26, ovr: 78, delta: 1, role: "titular", seasonsAtClub: 2, clubReputation: 3, calledUp: true };
    const away = weightOf(EVENTS_BY_ID["la-llamada-de-casa"], { ...base, abroad: true });
    const home = weightOf(EVENTS_BY_ID["la-llamada-de-casa"], { ...base, abroad: false });
    expect(away).toBeGreaterThan(home);
  });

  it("still always finds a card, whatever the state", () => {
    for (const age of [16, 20, 24, 28, 32, 36, 39]) {
      const context = { age, ovr: 60, delta: -6, role: "suplente", seasonsAtClub: 0, clubReputation: 0, calledUp: false, atFirstClub: true, abroad: false };
      expect(drawEvent("deck", age, [], context)).toBeTruthy();
    }
  });

  it("treats a broken weight function as a card that is out of the deck", () => {
    expect(weightOf({ weight: () => NaN }, {})).toBe(0);
    expect(weightOf({ weight: () => -5 }, {})).toBe(0);
    expect(weightOf({ weight: 12 }, {})).toBe(12);
  });
});

describe("standing", () => {
  it("reports the delta the whole model is built on", () => {
    let run = start();
    run = signThrough(run, run.offers[0].clubId);
    const standing = currentStanding(run);
    expect(standing.club.id).toBe(run.state.clubId);
    expect(standing.delta).toBe(standing.ovr - standing.squadLevel);
    expect(standing.seasonsLeft).toBe(RETIREMENT_AGE - START_AGE);
  });

  /**
   * The card in the masthead said 55 while the season was being rolled at 53.
   *
   * A decision card can leave an `ovrTemp`, and EVERYTHING that decides the year reads
   * `state.ovr + ovrTemp` - `fixtureContext` splits the odds at it, `simulateSeason` rolls
   * every trophy at it, `settleFinal` prices a final at it. The screens read `state.ovr`
   * alone, so the two numbers this interface is loudest about - the rating on the card and
   * the delta cell beside it - were both showing a value the model was not using. Measured
   * over ten careers, 76 live screens disagreed.
   *
   * This is the guard, and it is a whole-career sweep rather than a staged case: the point
   * is that there is no reachable state where the two differ.
   */
  it("shows the rating the season is actually being played at", () => {
    let sawTemp = false;
    let checked = 0;

    // Walked one screen at a time rather than through `playToRetirement`, because the
    // whole question is what a LIVE screen is showing between a card and its season.
    const audit = (run) => {
      const standing = currentStanding(run);
      const temp = run.state.modifiers?.ovrTemp ?? 0;
      if (temp !== 0) sawTemp = true;
      checked += 1;
      // What the card shows IS what the engine is about to simulate at.
      expect(standing.ovr, "la carta y el modelo no coinciden").toBe(
        Math.max(1, Math.min(99, Math.round(run.state.ovr + temp))),
      );
      expect(standing.ovrTemp).toBe(temp);
      expect(standing.baseOvr).toBe(run.state.ovr);
      // And the delta - the number the model turns on - comes off the same rating.
      if (standing.club) expect(standing.delta).toBe(standing.ovr - standing.squadLevel);
    };

    for (const seed of ["ovr-sync-a", "ovr-sync-b", "ovr-sync-c"]) {
      let run = start({ seed });
      run = signThrough(run, run.offers[0].clubId);
      let guard = 0;
      while (run.phase !== PHASES.RETIRED && guard < 400) {
        guard += 1;
        audit(run);
        if (run.phase === PHASES.EVENT) run = resolveEvent(run, run.event.es.options[0].id);
        else if (run.phase === PHASES.MATCH) run = playMatches(run);
        else if (run.phase === PHASES.TOURNAMENT) run = nextTie(run);
        else if (run.phase === PHASES.SEASON) run = openMarket(run);
        else if (run.phase === PHASES.MARKET) run = takeOffer(run, run.offers[0].clubId);
        else break;
      }
    }
    expect(checked).toBeGreaterThan(50);
    // A career with no temporary modifier anywhere in it would pass this vacuously.
    expect(sawTemp, "ninguna carta dejó un ovrTemp").toBe(true);
  });

  /** Outside a live step there is nothing on loan, so the two readings are the same. */
  it("has no temporary rating left by the time the market opens", () => {
    let run = start({ seed: "ovr-sync-market" });
    run = signThrough(run, run.offers[0].clubId);
    run = answerEvents(run);
    run = playMatches(run);
    while (run.phase === PHASES.TOURNAMENT) run = nextTie(run);
    run = openMarket(run);

    expect(run.phase).toBe(PHASES.MARKET);
    const standing = currentStanding(run);
    expect(standing.ovrTemp).toBe(0);
    expect(standing.ovr).toBe(standing.baseOvr);
  });
});

/**
 * The two things the summer market now tells you that it used to keep to itself, and the
 * one thing the career now remembers about a club after it has moved it.
 */
describe("what the market screen knows", () => {
  it("prices what each club would do to your development, not just to your role", () => {
    let run = playToRetirement(start({ seed: "growth-market" }), {
      pickOffer: (current) => {
        for (const offer of current.offers) {
          expect(offer.growth).toBeTruthy();
          expect(offer.growth.factor).toBeGreaterThan(0);
          // The forecast has to be a number the player can rank three clubs by.
          expect(Number.isFinite(offer.growth.factor)).toBe(true);
        }
        return current.offers[0];
      },
    });
    expect(run.phase).toBe(PHASES.RETIRED);
  });

  it("keeps every projection inside the bounds the meter is drawn against", () => {
    let run = start({ seed: "growth-rank" });
    run = signThrough(run, run.offers[0].clubId);
    run = answerEvents(run);
    run = playMatches(run);
    run = openMarket(run);

    const rated = run.offers
      .filter((offer) => offer.growth)
      .map((offer) => ({
        delta: offer.projectedDelta,
        factor: offer.growth.factor,
      }));
    expect(rated.length).toBeGreaterThan(0);
    // Nothing in the projection may fall outside the bounds the meter is drawn against.
    for (const entry of rated) {
      expect(entry.factor).toBeGreaterThanOrEqual(GROWTH.min);
      expect(entry.factor).toBeLessThanOrEqual(GROWTH.max);
    }
  });

  it("reads the cycle at the rate the last season actually collected it", () => {
    let run = start({ seed: "outlook-effective" });
    run = signThrough(run, run.offers[0].clubId);
    run = answerEvents(run);
    run = playMatches(run);
    run = openMarket(run);
    if (!run.outlook) return;
    expect(run.outlook.growth).toBeGreaterThan(0);
    expect(run.outlook.effective).toHaveLength(2);
  });
});

describe("a club the career moved stays moved", () => {
  it("carries the division overlay through the whole reducer", () => {
    const run = playToRetirement(start({ seed: "division-run" }));
    // Whatever happened, the overlay is a per-club integer in {-1, 0, 1} and nothing else.
    for (const [, shift] of Object.entries(run.state.divisions ?? {})) {
      expect([-1, 0, 1]).toContain(shift);
    }
    // Every season the player was promoted or relegated left the club somewhere new.
    for (const season of run.state.history) {
      if (season.promoted || season.relegated) {
        expect(run.state.divisions).toHaveProperty(season.clubId);
      }
    }
  });

  it("shows the header the division the club is really in", () => {
    let run = start({ seed: "division-header" });
    run = signThrough(run, run.offers[0].clubId);
    run = answerEvents(run);
    run = playMatches(run);
    const standing = currentStanding(run);
    expect(standing.division.tier).toBe(standing.competition.tier);
    expect(standing.growth).toBeTruthy();
  });

  it("never promotes the same club twice running", () => {
    const run = playToRetirement(start({ seed: "no-double-promotion" }));
    const promotedAt = run.state.history.filter((season) => season.promoted);
    for (let i = 1; i < promotedAt.length; i += 1) {
      const previous = promotedAt[i - 1];
      const current = promotedAt[i];
      // Same club twice is only legitimate if it went back down in between.
      if (previous.clubId === current.clubId) {
        const between = run.state.history.filter(
          (season) =>
            season.season > previous.season &&
            season.season < current.season &&
            season.clubId === current.clubId &&
            season.relegated,
        );
        expect(between.length).toBeGreaterThan(0);
      }
    }
  });
});

/**
 * The other half of OUR CALL #8: a long deal is a decision because it can be bought out,
 * and being bought out is itself a decision because the money never asked the player.
 */
describe("when somebody pays the buy-out", () => {
  /** Force the offer: a running deal with a buy-out anyone could meet, and a wanted player. */
  const withPaidClause = (run, { clause = 1_000 } = {}) => ({
    ...run,
    state: {
      ...run.state,
      ovr: 92,
      value: 60_000_000,
      seasonsAtClub: 4,
      idolatry: { ...run.state.idolatry, [run.state.clubId]: 60 },
      contract: {
        ...(run.state.contract ?? {}),
        clubId: run.state.clubId,
        years: 4,
        yearsLeft: 3,
        clause,
        wage: 4_000_000,
        wageRole: "titular",
        pay: { reputation: 3, strength: 3, tier: 1 },
      },
    },
  });

  const marketWithClause = (seed) => {
    let run = start({ seed });
    run = signThrough(run, run.offers[0].clubId);
    run = answerEvents(run);
    run = playMatches(run);
    return openMarket(withPaidClause(run));
  };

  /** Seeds differ in whether the roll fires, so find one that did. */
  const firstWithOffer = () => {
    for (let i = 0; i < 40; i += 1) {
      const run = marketWithClause(`clause-${i}`);
      if (run.clauseOffer) return run;
    }
    return null;
  };

  it("opens the door on a reachable buy-out and never on a wall", () => {
    const opened = firstWithOffer();
    expect(opened).not.toBeNull();
    expect(opened.clauseOffer.clausePaid).toBe(true);
    expect(opened.clauseOffer.clubId).not.toBe(opened.state.clubId);
    expect(opened.clauseOffer.fee).toBe(1_000);

    // The same careers, with the buy-out priced where the club meant it to be.
    for (let i = 0; i < 12; i += 1) {
      let run = start({ seed: `wall-${i}` });
      run = signThrough(run, run.offers[0].clubId);
      run = answerEvents(run);
      run = playMatches(run);
      expect(openMarket(withPaidClause(run, { clause: 900_000_000 })).clauseOffer).toBeNull();
    }
  });

  it("charges the ordinary price of leaving and not a season of breach", () => {
    const run = firstWithOffer();
    const exit = run.clauseOffer.exit;
    expect(exit.clausePaid).toBe(true);
    expect(exit.breach).toBe(0);
    // Three years were still to run: torn up, that would have cost on top.
    expect(exit.change).toBe(IDOLATRY.leaving);
  });

  it("takes the player to the table, where it is an ordinary signing", () => {
    const run = acceptClause(firstWithOffer());
    expect(run.phase).toBe(PHASES.NEGOTIATION);
    expect(run.deal.clausePaid).toBe(true);
    expect(run.deal.exit.breach).toBe(0);
  });

  it("pays the stand for turning it down, and the club is not asked twice", () => {
    const offered = firstWithOffer();
    const before = offered.state.idolatry[offered.state.clubId];
    const refused = refuseClause(offered);

    expect(refused.clauseOffer).toBeNull();
    expect(refused.phase).toBe(PHASES.MARKET);
    expect(refused.state.clubId).toBe(offered.state.clubId);
    expect(refused.state.idolatry[offered.state.clubId]).toBeGreaterThan(before);
    expect(refused.refusedClause.change).toBeGreaterThan(0);

    // Re-opening the same summer does not put it back on the table.
    expect(openMarket(refused).clauseOffer).toBeNull();
  });

  it("does nothing at all outside the market, or with no offer standing", () => {
    const offered = firstWithOffer();
    expect(refuseClause({ ...offered, phase: PHASES.EVENT })).toEqual({
      ...offered,
      phase: PHASES.EVENT,
    });
    expect(acceptClause({ ...offered, clauseOffer: null }).phase).toBe(PHASES.MARKET);
  });

  it("never fires for a player whose deal has run out - he is leaving for nothing anyway", () => {
    for (let i = 0; i < 12; i += 1) {
      let run = start({ seed: `free-${i}` });
      run = signThrough(run, run.offers[0].clubId);
      run = answerEvents(run);
      run = playMatches(run);
      const expired = withPaidClause(run);
      expired.state.contract.yearsLeft = 0;
      expect(openMarket(expired).clauseOffer).toBeNull();
    }
  });
});

describe("the office only offers asks that mean something", () => {
  it("hides the buy-out argument on a one-year deal and shows it on a long one", () => {
    let run = start({ seed: "asks" });
    run = signYouthClub(run, run.offers[0].clubId);
    const ids = () => availableAsks(run).map((ask) => ask.id);

    if (run.deal.terms.years === 1) {
      expect(ids()).not.toContain("clause");
      expect(ids()).not.toContain("short");
    } else {
      expect(ids()).toContain("clause");
    }
    // Whatever the deal, there is always something worth asking for.
    expect(ids().length).toBeGreaterThan(0);
  });
});

describe("the crowd keeps you in the building", () => {
  /** Drive one season at a club with a given standing and see whether they bin him. */
  const seasonAt = (idolatry) => {
    let run = start({ seed: "patience", mode: "normal" });
    run = signThrough(run, run.offers[0].clubId);
    // Far enough below the squad to be out of the side, which is what sets the streak.
    run = {
      ...run,
      state: {
        ...run.state,
        ovr: 40,
        benchStreak: 0,
        idolatry: { ...run.state.idolatry, [run.state.clubId]: idolatry },
      },
    };
    run = answerEvents(run);
    return playMatches(run);
  };

  it("bins a newcomer for a season out of the side and keeps a favourite", () => {
    const newcomer = seasonAt(0);
    const favourite = seasonAt(95);
    expect(newcomer.state.history[0].role).toBe("suplente");
    expect(favourite.state.history[0].role).toBe("suplente");
    // Same season, same streak, different standing - and only one of them is being moved on.
    expect(newcomer.state.clubWantsOut).toBe(true);
    expect(favourite.state.clubWantsOut).toBe(false);
  });

  it("records the rope it gave him, so the season can say why he is still there", () => {
    expect(seasonAt(95).state.history[0].patience).toBe(IDOLATRY.maxPatience);
    expect(seasonAt(0).state.history[0].patience).toBe(0);
  });
});

/**
 * The shadow, while the career is still running. The ending has always compared the two
 * of you; being told about it only on the last screen made it a scoreboard rather than a
 * rivalry, so `shadowStanding` is what the decision panel reads every step.
 */
describe("knowing who you are being measured against", () => {
  it("says nothing before he has played a season", () => {
    const run = start({ seed: "rival-start" });
    expect(shadowStanding(run.shadow, run.state, run.state.age - 1)).toBeNull();
  });

  it("totals both careers in the currencies the ending is judged in", () => {
    let run = start({ seed: "rival-run" });
    run = signThrough(run, run.offers[0].clubId);
    for (let step = 0; step < 6 && run.phase !== PHASES.RETIRED; step += 1) {
      run = answerEvents(run);
      run = playMatches(run);
      run = openMarket(run);
      if (run.phase === PHASES.RETIRED) break;
      run = takeOffer(run, (run.offers.find((o) => o.stay) ?? run.offers[0]).clubId);
    }
    const standing = shadowStanding(run.shadow, run.state, run.state.age - 1);
    expect(standing).toBeTruthy();
    expect(standing.surname).toBe(run.shadow.surname);
    expect(standing.mine.goals).toBe(
      run.state.history.reduce((sum, season) => sum + season.goals, 0),
    );
    expect(standing.lead.goals).toBe(standing.mine.goals - standing.theirs.goals);
    expect(typeof standing.ahead).toBe("boolean");
    // Only what he had done by then - the panel must never leak his future.
    expect(standing.theirs.goals).toBeLessThanOrEqual(
      run.shadow.seasons.reduce((sum, season) => sum + season.goals, 0),
    );
  });

  it("never counts a season the shadow has not played yet", () => {
    const run = start({ seed: "rival-clip" });
    const early = shadowStanding(run.shadow, { ...run.state, history: [] }, 20);
    const late = shadowStanding(run.shadow, { ...run.state, history: [] }, 34);
    if (early && late) expect(early.theirs.goals).toBeLessThanOrEqual(late.theirs.goals);
  });
});

describe("the career keeps the shooting record the season planner prices off", () => {
  it("counts every chance and every goal, and carries them into the next season's plan", () => {
    let run = start({ seed: "conv" });
    expect(run.state.conversion).toEqual({ taken: 0, scored: 0 });

    run = signThrough(run, run.offers[0].clubId);
    let shots = 0;
    let goals = 0;
    for (let step = 0; step < 8 && run.phase !== PHASES.RETIRED; step += 1) {
      run = answerEvents(run);
      while (run.phase === PHASES.MATCH) {
        run = resolveMoment(run, true);
        // A fixture can be worth any number of chances, including none at all.
        shots += run.matchday.last.taken;
        goals += run.matchday.last.converted;
        run = nextFixture(run);
      }
      run = openMarket(run);
      if (run.phase === PHASES.RETIRED) break;
      run = takeOffer(run, (run.offers.find((o) => o.stay) ?? run.offers[0]).clubId);
    }

    expect(shots).toBeGreaterThan(0);
    expect(run.state.conversion.taken).toBe(shots);
    expect(run.state.conversion.scored).toBe(goals);
    expect(run.state.conversion.scored).toBeLessThanOrEqual(run.state.conversion.taken);
  });

  it("puts the running record on every season it played matches in", () => {
    let run = start({ seed: "conv-record" });
    run = signThrough(run, run.offers[0].clubId);
    run = answerEvents(run);
    run = playMatches(run);
    const season = run.state.history[run.state.history.length - 1];
    expect(season.conversion.taken).toBeGreaterThanOrEqual(0);
    expect(season.conversion).toEqual(run.state.conversion);
  });
});

/**
 * The constraint the `years` term exists to impose.
 *
 * Half of it was already enforced - a running deal stopped the club pushing you out - but
 * the other half was not: the player could walk into any office and sign, paying the crowd
 * a breach fee. That made a four-year contract a price rather than a commitment, and made
 * the buy-out nearly pointless, since he could leave without anyone meeting it.
 */
describe("a contract that is still running is the whole of the summer", () => {
  /** A career sitting in the market on a deal with `yearsLeft` still to run. */
  const inMarketWith = (yearsLeft, seed = "locked", extra = {}) => {
    let run = start({ seed });
    run = signThrough(run, run.offers[0].clubId);
    run = answerEvents(run);
    run = playMatches(run);
    run = {
      ...run,
      state: {
        ...run.state,
        ...extra,
        contract: {
          ...(run.state.contract ?? {}),
          clubId: run.state.clubId,
          years: Math.max(1, yearsLeft),
          yearsLeft,
          wage: 2_000_000,
          wageRole: "titular",
          clause: 900_000_000,
          pay: { reputation: 3, strength: 3, tier: 1 },
        },
      },
    };
    return openMarket(run);
  };

  it("puts exactly one card on the table: stay", () => {
    for (const yearsLeft of [1, 2, 3, 4]) {
      const run = inMarketWith(yearsLeft, `lock-${yearsLeft}`);
      expect(run.offers).toHaveLength(1);
      expect(run.offers[0].stay).toBe(true);
      expect(run.offers[0].clubId).toBe(run.state.clubId);
    }
  });

  it("refuses to open talks with anybody else, even asked directly", () => {
    const run = inMarketWith(3);
    const elsewhere = Object.keys(world.clubs).find((id) => id !== run.state.clubId);
    // `acceptOffer` only opens talks over an offer that is on the table, and none is.
    const tried = acceptOffer(run, elsewhere);
    expect(tried.phase).toBe(PHASES.MARKET);
    expect(tried.deal).toBeFalsy();
  });

  it("opens the market again the summer the deal runs out", () => {
    const free = inMarketWith(0, "free");
    expect(free.offers.length).toBeGreaterThan(1);
    expect(free.offers.some((offer) => !offer.stay)).toBe(true);
  });

  it("still lets a buy-out take him, which is the point of arguing it down", () => {
    // A reachable clause and a wanted player: the one door a running deal leaves open.
    let run = start({ seed: "lock-clause" });
    run = signThrough(run, run.offers[0].clubId);
    run = answerEvents(run);
    run = playMatches(run);
    const withClause = {
      ...run,
      state: {
        ...run.state,
        ovr: 92,
        value: 60_000_000,
        contract: {
          ...(run.state.contract ?? {}),
          clubId: run.state.clubId,
          years: 4,
          yearsLeft: 3,
          clause: 1_000,
          wage: 4_000_000,
          wageRole: "titular",
          pay: { reputation: 3, strength: 3, tier: 1 },
        },
      },
    };
    let opened = openMarket(withClause);
    for (let i = 0; i < 40 && !opened.clauseOffer; i += 1) {
      opened = openMarket({ ...withClause, season: withClause.season + i + 1 });
    }
    expect(opened.clauseOffer, "no summer produced a paid buy-out").toBeTruthy();
    // One card in the grid, and a separate door that somebody else opened.
    expect(opened.offers).toHaveLength(1);
    expect(acceptClause(opened).phase).toBe(PHASES.NEGOTIATION);
  });

  it("lets a decision card tear the deal up, and that is the path that pays the breach", () => {
    const forced = inMarketWith(3, "forced", { forceTransfer: true });
    expect(forced.offers.length).toBeGreaterThan(1);
    const leaving = forced.offers.find((offer) => !offer.stay);
    expect(leaving).toBeTruthy();
    // Torn up rather than bought out, so the years still to run are charged in full.
    expect(leaving.exit?.breachYears ?? 0).toBeGreaterThan(0);
    expect(leaving.exit.breach).toBeLessThan(0);
  });

  it("never charges a breach on a move the deal allowed", () => {
    // Once it has expired there is nothing left to break.
    const free = inMarketWith(0, "no-breach");
    for (const offer of free.offers) {
      if (offer.stay || !offer.exit) continue;
      expect(offer.exit.breachYears).toBe(0);
      expect(Math.abs(offer.exit.breach)).toBe(0);
    }
  });
});

describe("the first contract of a career", () => {
  it("is one season, at every club that could offer it", () => {
    for (let i = 0; i < 30; i += 1) {
      let run = start({ seed: `first-${i}` });
      for (const offer of run.offers) {
        const opened = signYouthClub(run, offer.clubId);
        expect(opened.deal.terms.years, `club ${offer.clubId}`).toBe(1);
        expect(opened.deal.terms.reasons).toContain("firstDeal");
      }
    }
  });

  it("leaves nothing to ask for about its length, and no buy-out to argue", () => {
    let run = start({ seed: "first-asks" });
    run = signYouthClub(run, run.offers[0].clubId);
    const ids = availableAsks(run).map((ask) => ask.id);
    expect(ids).not.toContain("short");
    expect(ids).not.toContain("clause");
    expect(ids.length).toBeGreaterThan(0);
  });

  it("means the second summer is always a real market", () => {
    let run = start({ seed: "first-free" });
    run = signThrough(run, run.offers[0].clubId);
    run = answerEvents(run);
    run = playMatches(run);
    run = openMarket(run);
    // One season signed, one season played: he is out of contract and free to choose.
    expect(run.state.contract.yearsLeft).toBe(0);
    expect(run.offers.length).toBeGreaterThan(1);
  });
});

/**
 * A whole career per position, played through the deciders rather than asserted on the
 * tables. The tables can be right and the career still wrong: what a keeper is HANDED is
 * decided in bigmatch.js, what it is WORTH is decided in engine.js, and the two only meet
 * here.
 */
describe("a career is played from the position it is played in", () => {
  const careerAs = (position, seed) =>
    playToRetirement(start({ position, seed: `${seed}-${position}` }));

  it("never asks a goalkeeper to score, and never credits him with one", () => {
    const run = careerAs("POR", "repertoire");
    const decisive = run.state.history.flatMap((record) => record.bigMatches ?? []);
    expect(decisive.length, "the career never played a decider").toBeGreaterThan(0);
    for (const match of decisive) {
      expect(REPERTOIRE.keeper, `keeper handed ${match.type}`).toContain(match.type);
      expect(match.produces).toBe(PRODUCES.STOP);
    }
    // Converting every one of them, all career, still leaves the scoring rate at zero.
    expect(run.state.history.reduce((sum, record) => sum + record.goals, 0)).toBe(0);
  });

  it("gives a centre-back defending to do and a corner to win it with", () => {
    const run = careerAs("DFC", "repertoire");
    const matches = run.state.history.flatMap((record) => record.bigMatches ?? []);
    const types = new Set(matches.map((match) => match.type));
    expect(types.size).toBeGreaterThan(0);
    for (const type of types) expect(REPERTOIRE.defensive).toContain(type);

    // Both halves of the repertoire have to actually pay out the way they claim to: a
    // headed corner is a goal on his sheet, everything else he does is not.
    const headers = matches.filter((match) => match.type === "cabezazo" && match.scored);
    const stops = matches.filter((match) => match.produces === PRODUCES.STOP && match.scored);
    expect(headers.length, "a whole career without a decisive corner").toBeGreaterThan(0);
    expect(stops.length, "a whole career without a decisive stop").toBeGreaterThan(0);
    for (const match of headers) expect(match.produces).toBe(PRODUCES.GOAL);
    expect(run.state.history.reduce((sum, record) => sum + record.goals, 0)).toBeGreaterThanOrEqual(
      headers.reduce((sum, match) => sum + (match.converted ?? 1), 0),
    );
  });

  it("lets a midfielder's last pass show up as an assist rather than a goal", () => {
    const run = careerAs("MCO", "repertoire");
    const passes = run.state.history
      .flatMap((record) => record.bigMatches ?? [])
      .filter((match) => match.type === "pase_gol" && match.scored);
    expect(passes.length, "no decisive final ball in a whole career").toBeGreaterThan(0);
    for (const match of passes) expect(match.produces).toBe(PRODUCES.ASSIST);
  });

  it("leaves the striker's career exactly as it was", () => {
    const run = careerAs("DC", "repertoire");
    for (const match of run.state.history.flatMap((record) => record.bigMatches ?? [])) {
      expect(REPERTOIRE.forward).toContain(match.type);
      expect(match.produces).toBe(PRODUCES.GOAL);
    }
    expect(run.state.history.reduce((sum, record) => sum + record.goals, 0)).toBeGreaterThan(0);
  });

  it("prices every position's deciders off the same conversion record", () => {
    // The budget identity does not care which repertoire it bought: `taken` counts
    // chances, and a save is a chance he came through on.
    for (const position of ["POR", "DFC", "MCO", "DC"]) {
      const run = careerAs(position, "conversion");
      const { taken, scored } = run.state.conversion;
      expect(taken, position).toBeGreaterThan(0);
      expect(scored).toBeLessThanOrEqual(taken);
    }
  });
});

/**
 * The form stamp, over whole careers.
 *
 * `report.test.js` checks the arithmetic on a hand-built record. This checks the thing the
 * arithmetic exists for, which only shows up in bulk: how OFTEN each verdict comes up, and
 * whether it comes up for the right reasons. Both were calibrated by measurement rather than
 * by argument, and both are cheap to break by nudging a constant - so they are pinned here.
 */
describe("how often the season gets a verdict", () => {
  const bandsOf = (position, seed, hit) => {
    const run = playToRetirement(start({ position, seed: `${seed}-${position}` }), { hit });
    return run.state.history.map((record) => seasonBand(record)).filter(Boolean);
  };

  const shareOf = (bands, key) => bands.filter((band) => band === key).length / bands.length;

  it("keeps the two extremes about as rare as they have always been", () => {
    const bands = [];
    for (const position of ["DC", "MC", "DFC", "POR"]) {
      for (let i = 0; i < 8; i += 1) bands.push(...bandsOf(position, `bands-${i}`, i % 2 === 0));
    }
    expect(bands.length).toBeGreaterThan(200);
    // The old read-out printed these at 13.7% and 15.5%. A stamp that shows up in a third
    // of all seasons is not a stamp, and one that never shows up is not a feature.
    expect(shareOf(bands, "inspirado")).toBeGreaterThan(0.06);
    expect(shareOf(bands, "inspirado")).toBeLessThan(0.24);
    expect(shareOf(bands, "gris")).toBeGreaterThan(0.06);
    expect(shareOf(bands, "gris")).toBeLessThan(0.26);
    // And the middle is still where most seasons live.
    expect(shareOf(bands, "normal")).toBeGreaterThan(0.15);
  });

  /**
   * The whole point of the change. What the player does in the deciders - by hand, in the
   * minigames - has to be able to move the verdict, which the old form stamp could not do
   * because it was drawn before the season started.
   */
  it("says more about a player who comes through than one who does not", () => {
    const came = [];
    const did_not = [];
    for (const position of ["DC", "MC", "POR"]) {
      for (let i = 0; i < 6; i += 1) {
        came.push(...bandsOf(position, `through-${i}`, true));
        did_not.push(...bandsOf(position, `through-${i}`, false));
      }
    }
    /*
     * Half again as many inspired seasons, where it used to be nearly twice as many. The
     * threshold moved because the model did, in both directions at once: coming through is
     * no longer certain when you pick right - a hard night puts a quarter of them over the
     * bar, see `offTargetOdds` - and shooting straight at him is no longer certain to fail,
     * because a keeper is beaten on his own zone often enough to matter. The signal is
     * smaller and it is the honest size.
     */
    expect(shareOf(came, "inspirado")).toBeGreaterThan(shareOf(did_not, "inspirado") * 1.5);
    expect(shareOf(did_not, "gris")).toBeGreaterThan(shareOf(came, "gris"));
  });

  /**
   * A striker is asked for eighteen goals and a centre-back for two, so raw ratios hand the
   * defender three times as many extreme verdicts - the stamp would be measuring how much
   * evidence his position generates rather than how his year went. See `FORM_PRIOR`.
   */
  it("does not decide the verdict by the position that was picked", () => {
    const extremes = {};
    for (const position of ["DC", "MC", "DFC", "POR"]) {
      const bands = [];
      for (let i = 0; i < 8; i += 1) bands.push(...bandsOf(position, `even-${i}`, i % 2 === 0));
      extremes[position] = shareOf(bands, "inspirado") + shareOf(bands, "gris");
    }
    const values = Object.values(extremes);
    const report = Object.entries(extremes)
      .map(([position, share]) => `${position} ${(share * 100).toFixed(0)}%`)
      .join(", ");
    expect(Math.max(...values) / Math.min(...values), report).toBeLessThan(2.5);
  });
});

/**
 * The night the cup is decided, and what the cabinet is allowed to say about it.
 *
 * A final that is played out on screen prints a scoreline, and on a night that IS the
 * trophy, a scoreline is a claim about the cabinet. The two used to be rolled apart: the
 * broadcast invented a score and the season rolled the cup somewhere else entirely, so a
 * final could read 0-1 at full time and the ceremony play a moment later. Measured before
 * the fix, two in five of the finals a player missed came out that way.
 *
 * `settleFinal` answers the fixture's own trophy on the night, with the same stream and the
 * same odds the season would have used, and `rollTitles` honours the answer. So the two
 * guards here are: the screen never contradicts the cabinet, and DECIDES still means what
 * it says - miss the final and the side still lifts it about a quarter of the time.
 */
describe("a final and its trophy", () => {
  /** Play a career, watching every decider and always missing, and collect the finals. */
  const finalsOf = (seed, hit) => {
    const out = [];
    let run = signThrough(start({ seed }), start({ seed }).offers[0].clubId);
    let guard = 0;
    while (run.phase !== PHASES.RETIRED && guard < 200) {
      guard += 1;
      run = answerEvents(run);

      let inner = 0;
      // TOURNAMENT is part of a season now, not a queue after it - see `playMatches`.
      while ((run.phase === PHASES.MATCH || run.phase === PHASES.TOURNAMENT) && inner < 60) {
        inner += 1;
        if (run.phase === PHASES.TOURNAMENT) {
          run = nextTie(run);
          continue;
        }
        const { fixtures, index } = run.matchday;
        const fixture = fixtures[index];
        const watched = fixture.kind === "final_copa";
        if (watched && !run.matchday.broadcast) run = watchMatch(run, "es");
        run = resolveMoment(run, hit);
        if (watched && run.matchday.broadcast?.finish?.closed) {
          out.push({ finish: run.matchday.broadcast.finish, last: run.matchday.last });
        }
        run = nextFixture(run);
      }

      const record = run.state.history[run.state.history.length - 1];
      for (const entry of out) {
        if (entry.cup === undefined && entry.season === undefined) {
          entry.season = record?.season;
          entry.cup = Boolean(record?.titles?.some((t) => t.trophy === "cup"));
        }
      }
      run = openMarket(run);
      if (run.phase === PHASES.RETIRED) break;
      const stay = run.offers.find((offer) => offer.stay);
      run = takeOffer(run, (stay ?? run.offers[0]).clubId);
    }
    return out;
  };

  /*
   * THE OTHER PATH, now closed.
   *
   * This was `it.fails` for a while, and the note on it was right: `settleFinal` closed the
   * main route - a final played out and shot at - but something else was reaching a closed
   * final broadcast without ever being told what the night had decided, and on that path the
   * cup was still rolled apart from the scoreline. The measurement quoted here was a final
   * narrated 0-0 with the cup in the cabinet.
   *
   * It was `watchMatch`, on a fixture worth no sight of goal. Those settle themselves the
   * moment they open, one step ahead of the screen, so by the time the broadcast is built
   * `matchday.last` is set and the `settleIfUntouched` inside `watchMatch` returns without
   * doing anything - leaving the feed to be written by a `narrateFinish` call that was
   * passed neither the answer nor the right to break a tie. Both are handed to it now.
   */
  it("never lifts a cup it just lost on the scoreboard", () => {
    const finals = [];
    for (let i = 0; i < 30; i += 1) finals.push(...finalsOf(`cupfinal-${i}`, i % 2 === 0));
    expect(finals.length, "no cup final was ever narrated").toBeGreaterThan(0);

    for (const { finish, cup } of finals) {
      const score = `${finish.final.home}-${finish.final.away}`;
      // The one thing that must never happen, in either direction.
      expect(cup, `narrado ${score} y la copa en la vitrina`).toBe(finish.won);

      // And the case the old note left un-asserted: a cup final is never a draw. It is
      // settled in ninety minutes, late, or from twelve yards.
      const decided =
        finish.final.home !== finish.final.away ||
        finish.beats.some((beat) => beat.id === "shootoutWon" || beat.id === "shootoutLost");
      expect(decided, `final sin resolver: ${score}`).toBe(true);
    }
  });
});
