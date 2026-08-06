import { describe, expect, it } from "vitest";

import {
  PHASES,
  acceptOffer,
  agreeTerms,
  askFor,
  availableAsks,
  cancelNegotiation,
  completeSigning,
  currentStanding,
  eventContext,
  nextFixture,
  openMarket,
  resolveEvent,
  signYouthClub,
  startCareer,
  switchNationality,
  takeShot,
} from "./career.js";
import { EVENTS_BY_ID, MAX_INJURIES, drawEvent, weightOf } from "./events.js";
import { IDOLATRY } from "./idolatry.js";
import { CONTRACT } from "./contract.js";
import { CAREER_MODES, RETIREMENT_AGE, START_AGE } from "./tables.js";
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
function playMatches(run, locale = "es") {
  let current = run;
  let guard = 0;
  while (current.phase === PHASES.MATCH && guard < 40) {
    guard += 1;
    current = takeShot(current, current.matchday.shot.options[0]);
    current = nextFixture(current, locale);
  }
  expect(guard).toBeLessThan(40);
  return current;
}

/** Drive a whole career, always taking the first option and the first offer. */
function playToRetirement(run, { locale = "es", pickOffer } = {}) {
  let current = run;
  let guard = 0;
  current = signThrough(current, current.offers[0].clubId);

  while (current.phase !== PHASES.RETIRED && guard < 200) {
    guard += 1;
    current = resolveEvent(current, current.event.es.options[0].id);
    current = playMatches(current, locale);
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

    run = resolveEvent(run, run.event.es.options[0].id);
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
      run = resolveEvent(run, run.event.es.options[0].id);
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
      current = resolveEvent(current, current.event.es.options[0].id);
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
    run = playMatches(resolveEvent(run, run.event.es.options[0].id));
    expect(run.state.contract.yearsLeft).toBe(signed - 1);
  });

  it("keeps a stay option on the table while the deal runs, however badly it goes", () => {
    let run = signThrough(start(), start().offers[0].clubId);
    run = playMatches(resolveEvent(run, run.event.es.options[0].id));
    // The club has had enough - but it signed for three years and cannot say so yet.
    run = { ...run, state: { ...run.state, clubWantsOut: true } };
    run = openMarket(run);
    expect(run.state.contract.yearsLeft).toBeGreaterThan(0);
    expect(run.offers.some((offer) => offer.stay)).toBe(true);
  });

  it("lets the club walk away once the deal has run out", () => {
    let run = signThrough(start(), start().offers[0].clubId);
    run = playMatches(resolveEvent(run, run.event.es.options[0].id));
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
    run = playMatches(resolveEvent(run, run.event.es.options[0].id));
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
    return resolveEvent(run, run.event.es.options[0].id);
  };

  it("opens the phase once per season, so every season gets its own three", () => {
    for (const mode of Object.keys(CAREER_MODES)) {
      let run = atFirstShot({ mode });
      let matchdays = 0;
      let guard = 0;
      while (run.phase === PHASES.MATCH && guard < 40) {
        guard += 1;
        if (run.matchday.index === 0 && !run.matchday.results.length) matchdays += 1;
        run = nextFixture(takeShot(run, run.matchday.shot.options[0]));
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
    const play = (aim) => {
      let run = atFirstShot({ seed: "shots" });
      let guard = 0;
      while (run.phase === PHASES.MATCH && guard < 40) {
        guard += 1;
        const { shot } = run.matchday;
        run = nextFixture(takeShot(run, aim(shot)));
      }
      return run.seasonResults[0].record;
    };
    const hit = play((shot) => shot.options[shot.gap]);
    const miss = play((shot) => shot.options[(shot.gap + 1) % shot.options.length]);

    expect(hit.goals).toBeGreaterThan(miss.goals);
    expect(hit.bigMatches.map((m) => m.scored)).not.toEqual(miss.bigMatches.map((m) => m.scored));
  });

  it("is still a pure function of the seed when the shots are the same", () => {
    const play = () => {
      let run = atFirstShot({ seed: "pure-shots" });
      let guard = 0;
      while (run.phase === PHASES.MATCH && guard < 40) {
        guard += 1;
        run = nextFixture(takeShot(run, run.matchday.shot.options[0]));
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
    run = resolveEvent(run, run.event.es.options[0].id);
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
    run = resolveEvent(run, run.event.es.options[0].id);
    run = openMarket(playMatches(run));
    expect(run.nationalityChoices).toBeNull();
    expect(switchNationality(run, "ITA").state.country).toBe("ESP");
  });

  it("switches nationality when the passport card was taken", () => {
    let run = start();
    run = signThrough(run, run.offers[0].clubId);
    run = resolveEvent(run, run.event.es.options[0].id);
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

  it("rewards staying and punishes touring, across a whole career", () => {
    const seeds = ["i1", "i2", "i3", "i4", "i5", "i6"];
    const loyalPeaks = seeds.map((s) => career(s, { loyal: true }).summary.idolatry?.value ?? 0);
    const touringPeaks = seeds.map((s) => career(s, { loyal: false }).summary.idolatry?.value ?? 0);

    const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(loyalPeaks)).toBeGreaterThan(mean(touringPeaks) + 20);
    // Every loyal career should out-idolise its own touring twin on the same seed.
    for (let i = 0; i < seeds.length; i += 1) {
      expect(loyalPeaks[i]).toBeGreaterThan(touringPeaks[i]);
    }
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
    run = resolveEvent(run, run.event.es.options[0].id);
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
      run = resolveEvent(run, run.event.es.options[0].id);
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
    run = resolveEvent(run, run.event.es.options[0].id);
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
    expect(standing.delta).toBe(run.state.ovr - standing.squadLevel);
    expect(standing.seasonsLeft).toBe(RETIREMENT_AGE - START_AGE);
  });
});
