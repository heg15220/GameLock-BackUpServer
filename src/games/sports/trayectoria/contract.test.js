import { describe, expect, it } from "vitest";

import {
  ASKS,
  ASKS_BY_ID,
  CLAUSE,
  CONTRACT,
  ROLE_WAGE,
  askOdds,
  breachYears,
  clauseOdds,
  contractModifiers,
  isUnderContract,
  leverageFor,
  negotiate,
  openingTerms,
  parWage,
  promiseRole,
  roleForDelta,
  sign,
  tickContract,
  wageBand,
  wagePressure,
} from "./contract.js";
import { REASON_LABELS } from "./copy.js";
import { simulateSeason } from "./engine.js";
import { applyToContract } from "./events.js";
import { IDOLATRY, exitCost, seasonIdolatry } from "./idolatry.js";
import { world } from "./world.js";

const terms = (overrides = {}) =>
  openingTerms({
    seed: "terms",
    season: 3,
    clubId: "test-club",
    reputation: 3,
    projectedDelta: 2,
    age: 24,
    ...overrides,
  });

const PAY = (overrides = {}) => ({ reputation: 3, strength: 2, tier: 1, ...overrides });

describe("a wage is a role, not a number", () => {
  it("reads a par wage back as exactly the role it was set for, whatever the league", () => {
    for (let reputation = 0; reputation <= 5; reputation += 1) {
      for (const strength of [0, 2, 4]) {
        for (const tier of [1, 2]) {
          const pay = { reputation, strength, tier };
          for (const role of Object.keys(ROLE_WAGE)) {
            expect(wageBand(parWage(pay, role), pay)).toBe(role);
          }
        }
      }
    }
  });

  it("pays more for the same role at a bigger club, a richer league and a higher division", () => {
    expect(parWage(PAY({ reputation: 5 }), "titular")).toBeGreaterThan(
      parWage(PAY({ reputation: 2 }), "titular"),
    );
    expect(parWage(PAY({ strength: 4 }), "titular")).toBeGreaterThan(
      parWage(PAY({ strength: 0 }), "titular"),
    );
    expect(parWage(PAY({ tier: 2 }), "titular")).toBeLessThan(parWage(PAY(), "titular"));
    expect(parWage(PAY(), "titular")).toBeGreaterThan(parWage(PAY(), "suplente"));
  });

  it("costs nothing when the wage is par for the role played", () => {
    const pay = PAY();
    const contract = sign({ ...terms(), pay, wage: parWage(pay, "titular"), wageRole: "titular" }, 3);
    expect(wagePressure(contract, "titular")).toBeCloseTo(0, 6);
  });

  it("charges the league and the division to par, not to the player", () => {
    // The same role at two very different clubs is the same standing, and the crowd of
    // each judges its own man against its own wage bill.
    for (const pay of [PAY({ strength: 4 }), PAY({ strength: 0 }), PAY({ tier: 2 })]) {
      const contract = sign(
        { ...terms(), pay, wage: parWage(pay, "rotacion_alta"), wageRole: "rotacion_alta" },
        0,
      );
      expect(wagePressure(contract, "rotacion_alta")).toBeCloseTo(0, 6);
    }
  });

  it("costs the crowd when a starter's wage ends up on the bench, and pays when it does not", () => {
    const contract = sign(terms({ projectedDelta: 6 }), 3);
    expect(contract.wageRole).toBe("titular");
    expect(wagePressure(contract, "suplente")).toBeGreaterThan(0);
    expect(wagePressure(contract, "rotacion_alta")).toBeGreaterThan(0);

    const cheap = sign(terms({ projectedDelta: -9 }), 3);
    expect(wagePressure(cheap, "titular")).toBeLessThan(0);
  });

  it("is what the stand actually charges for, per season", () => {
    const record = { role: "suplente", goals: 2, assists: 1, titles: [], awards: [], matches: 20 };
    const fair = seasonIdolatry({ record, wagePressure: 0 });
    const overpaid = seasonIdolatry({ record, wagePressure: 1 });
    expect(fair - overpaid).toBeCloseTo(IDOLATRY.perWageStep, 6);
    // Two rungs above what you played and an ordinary season goes backwards.
    expect(seasonIdolatry({ record, wagePressure: 1.6 })).toBeLessThan(0);
    // Cheap, and the crowd is generous.
    expect(seasonIdolatry({ record, wagePressure: -1 })).toBeGreaterThan(fair);
  });
});

describe("the deal on the table", () => {
  it("is the same deal every time it is opened", () => {
    expect(terms()).toEqual(terms());
  });

  it("quotes the wage in the band the distance would put you in", () => {
    const deal = terms({ projectedDelta: 8 });
    expect(deal.projectedRole).toBe(roleForDelta(8));
    expect(deal.wageRole).toBe(deal.projectedRole);
    // Above par, because they need him - but never so far above that it changes band.
    const par = parWage(deal.pay, deal.projectedRole);
    expect(deal.wage).toBeGreaterThan(par);
    expect(deal.wage).toBeLessThan(par * 1.25);
  });

  it("gives the young long deals and the old short ones", () => {
    expect(terms({ age: 18 }).years).toBeGreaterThan(terms({ age: 36 }).years);
    for (const age of [16, 20, 25, 30, 35, 39]) {
      const { years } = terms({ age });
      expect(years).toBeGreaterThanOrEqual(CONTRACT.minYears);
      expect(years).toBeLessThanOrEqual(CONTRACT.maxYears);
    }
  });

  it("only volunteers a promise where a promise would change something", () => {
    // Just below the line: they rate him as an equal and say so to get him.
    expect(terms({ projectedDelta: -3, reputation: 2 }).rolePromise).toBe("titular");
    // Already above the squad - the shirt was his anyway, so it is not a term.
    expect(terms({ projectedDelta: 6, reputation: 2 }).rolePromise).toBeNull();
    // Far below it - they are not giving that away, which is what leaves him an argument.
    expect(terms({ projectedDelta: -11, reputation: 3 }).rolePromise).toBeNull();
    // And a giant volunteers nothing.
    expect(terms({ projectedDelta: -3, reputation: 5 }).rolePromise).toBeNull();
  });

  it("makes a promise worth exactly one rung, wherever you start", () => {
    expect(promiseRole("suplente")).toBe("rotacion_baja");
    expect(promiseRole("rotacion_baja")).toBe("rotacion_alta");
    expect(promiseRole("rotacion_alta")).toBe("titular");
    // At the top there is no rung left, so it becomes cover against being demoted.
    expect(promiseRole("titular")).toBe("titular");
  });
});

describe("the deal reads the circumstances", () => {
  it("pays the same player differently in a rich league and a poor one", () => {
    const rich = terms({ strength: 4 });
    const poor = terms({ strength: 0 });
    expect(rich.wage).toBeGreaterThan(poor.wage * 1.8);
    // And neither of them is over par: the league is the club's problem, not the player's.
    expect(Math.abs(wagePressure(sign(rich, 0), rich.projectedRole))).toBeLessThan(0.25);
    expect(Math.abs(wagePressure(sign(poor, 0), poor.projectedRole))).toBeLessThan(0.25);
    expect(rich.reasons).toContain("strongLeague");
    expect(poor.reasons).toContain("weakLeague");
  });

  it("treats the second division as another economy entirely", () => {
    const first = terms({ tier: 1 });
    const second = terms({ tier: 2 });
    expect(second.wage).toBeLessThan(first.wage * 0.5);
    expect(second.years).toBeLessThan(first.years);
    expect(second.clause).toBeLessThan(first.clause);
    expect(second.reasons).toContain("secondTier");
    expect(second.reasons).toContain("sellingClub");
  });

  it("commits longer to a player it is signing to play, and hedges on cover", () => {
    const wanted = terms({ projectedDelta: 8 });
    const cover = terms({ projectedDelta: -7 });
    expect(wanted.years).toBeGreaterThan(cover.years);
    expect(wanted.wage).toBeGreaterThan(parWage(wanted.pay, wanted.projectedRole));
    expect(wanted.reasons).toContain("needed");
    expect(cover.reasons).toContain("squadFiller");
  });

  it("pays an idol over the odds to renew, and the stand then expects more of him", () => {
    const renewal = terms({ stay: true, idolatryHere: 90, seasonsAtClub: 6 });
    const arrival = terms({ stay: false, idolatryHere: 0 });
    expect(renewal.wage).toBeGreaterThan(arrival.wage);
    expect(renewal.years).toBeGreaterThanOrEqual(arrival.years);
    expect(renewal.reasons).toContain("idol");
    expect(wagePressure(sign(renewal, 0), renewal.projectedRole)).toBeGreaterThan(0);
  });

  it("prices the buy-out off the player's market value, which no other term reads", () => {
    const cheap = terms({ value: 500_000 });
    const expensive = terms({ value: 60_000_000 });
    expect(expensive.clause).toBeGreaterThan(cheap.clause);
    // Same wage either way: a clause is a selling price, not a salary.
    expect(expensive.wage).toBe(cheap.wage);
  });

  it("protects a young asset with a bigger clause than an identical older one", () => {
    expect(terms({ age: 20, value: 10_000_000 }).clause).toBeGreaterThan(
      terms({ age: 29, value: 10_000_000 }).clause,
    );
  });

  it("ties players up at a big club and lets a small one price to sell", () => {
    // The tag is `contender` now: length is a thing clubs with a title to chase do, not a
    // thing big clubs do. A reputation-5 side is both, so it still ties people down.
    expect(terms({ reputation: 5 }).reasons).toContain("contender");
    expect(terms({ reputation: 5 }).years).toBeGreaterThan(1);
    expect(terms({ reputation: 5, value: 40_000_000 }).clause).toBeGreaterThan(
      terms({ reputation: 1, value: 40_000_000, strength: 0 }).clause,
    );
  });

  it("gives two different clubs two different deals for the same player", () => {
    const shapes = new Set(
      [
        terms({ reputation: 5, strength: 4, projectedDelta: -6, age: 27 }),
        terms({ reputation: 1, strength: 1, projectedDelta: 9, age: 27 }),
        terms({ reputation: 3, strength: 2, tier: 2, projectedDelta: 2, age: 27 }),
      ].map((deal) => `${deal.years}-${deal.wageRole}-${deal.rolePromise}`),
    );
    expect(shapes.size).toBe(3);
  });

  it("only ever gives reasons it can name in both locales", () => {
    const seen = new Set();
    for (const reputation of [0, 2, 5]) {
      for (const strength of [0, 2, 4]) {
        for (const tier of [1, 2]) {
          for (const age of [17, 24, 31, 36]) {
            for (const projectedDelta of [-8, 0, 9]) {
              for (const stay of [false, true]) {
                const deal = terms({
                  reputation, strength, tier, age, projectedDelta, stay,
                  idolatryHere: stay ? 80 : 0,
                });
                deal.reasons.forEach((reason) => seen.add(reason));
                expect(new Set(deal.reasons).size).toBe(deal.reasons.length);
              }
            }
          }
        }
      }
    }
    expect(seen.size).toBeGreaterThan(6);
    for (const reason of seen) {
      expect(REASON_LABELS.es[reason], `no es label for ${reason}`).toBeTruthy();
      expect(REASON_LABELS.en[reason], `no en label for ${reason}`).toBeTruthy();
    }
  });
});

describe("leverage", () => {
  it("is the delta, read back as how much the club has to listen", () => {
    expect(leverageFor({ projectedDelta: 8, ovr: 84 })).toBeGreaterThan(
      leverageFor({ projectedDelta: -2, ovr: 84 }),
    );
    expect(leverageFor({ projectedDelta: -12, ovr: 50 })).toBe(0);
  });

  it("counts the crowd only where the crowd knows you", () => {
    const away = leverageFor({ projectedDelta: 1, idolatryHere: 90, stay: false });
    const home = leverageFor({ projectedDelta: 1, idolatryHere: 90, stay: true });
    expect(home).toBeGreaterThan(away);
  });

  it("refuses to sell a starting place to somebody with no hand", () => {
    expect(askOdds(ASKS_BY_ID.role, 0.1)).toBe(0);
    expect(askOdds(ASKS_BY_ID.role, 0.9)).toBeGreaterThan(0);
  });

  it("prints odds that never promise certainty", () => {
    for (const ask of Object.values(ASKS_BY_ID)) {
      expect(askOdds(ask, 1)).toBeLessThanOrEqual(0.95);
      expect(askOdds(ask, 0)).toBe(0);
    }
  });
});

describe("asking", () => {
  const ask = (askId, leverage = 0.9, round = 0) =>
    negotiate({ seed: "talks", clubId: "c", round, terms: terms(), leverage, askId });

  it("is a pure function of the seed, so the same career replays identically", () => {
    expect(ask("wage")).toEqual(ask("wage"));
  });

  it("spends the whole ask when granted and half of it when refused", () => {
    const granted = negotiate({
      seed: "t", clubId: "c", round: 0, terms: terms(), leverage: 0.95, askId: "short",
    });
    expect(granted.granted).toBe(true);
    expect(granted.leverage).toBeCloseTo(0.95 - ASKS_BY_ID.short.cost, 6);

    // An ask nobody was ever going to grant still costs you for having made it.
    const refused = negotiate({
      seed: "t", clubId: "c", round: 0, terms: terms(), leverage: 0.0001, askId: "wage",
    });
    expect(refused.granted).toBe(false);
    expect(refused.leverage).toBeLessThan(0.0001);
  });

  it("moves the wage one rung up, and the expectation with it", () => {
    const before = terms({ projectedDelta: -2 });
    const after = ASKS_BY_ID.wage.apply(before);
    expect(after.wage).toBeGreaterThan(before.wage);
    // The band it lands in is what the crowd will hold him to, so it is recomputed.
    expect(wagePressure(sign(after, 0), before.projectedRole)).toBeGreaterThan(0);
  });

  it("turns a promise into a floor, a clause into a smaller one, and a deal into a shorter one", () => {
    const before = terms({ projectedDelta: -5, age: 20 });
    expect(ASKS_BY_ID.role.apply(before).rolePromise).toBe(promiseRole(before.projectedRole));
    expect(ASKS_BY_ID.clause.apply(before).clause).toBeLessThan(before.clause);
    expect(ASKS_BY_ID.short.apply(before).years).toBe(before.years - 1);
  });

  it("never shortens a deal below one season", () => {
    const oneYear = { ...terms(), years: 1 };
    expect(ASKS_BY_ID.short.apply(oneYear).years).toBe(1);
  });

  it("refuses an ask that is not on the list", () => {
    expect(negotiate({ seed: "s", clubId: "c", round: 0, terms: terms(), leverage: 1, askId: "car" }))
      .toBeNull();
  });
});

describe("what a signed contract does", () => {
  it("runs down a season at a time and then stops binding anybody", () => {
    let contract = sign({ ...terms(), years: 2 }, 0);
    expect(isUnderContract(contract, contract.clubId)).toBe(true);
    contract = tickContract(contract);
    expect(contract.yearsLeft).toBe(1);
    contract = tickContract(tickContract(contract));
    expect(contract.yearsLeft).toBe(0);
    expect(isUnderContract(contract, contract.clubId)).toBe(false);
  });

  it("only binds the club it was signed with", () => {
    const contract = sign(terms(), 0);
    expect(isUnderContract(contract, "somebody-else")).toBe(false);
  });

  it("honours a role promise in the first season and only the first", () => {
    const promised = sign({ ...terms(), rolePromise: "titular", years: 3 }, 0);
    expect(contractModifiers(promised).roleFloor).toBe("titular");
    expect(contractModifiers(tickContract(promised))).toEqual({});
    expect(contractModifiers(sign(terms(), 0))).toEqual({});
  });

  it("charges the crowd for every season torn up, and nothing for one run down", () => {
    const running = exitCost({ seasonsAtClub: 4, breachYears: 3 });
    const expired = exitCost({ seasonsAtClub: 4, breachYears: 0 });
    expect(running.change).toBeLessThan(expired.change);
    expect(running.breach).toBeCloseTo(3 * IDOLATRY.perBreachYear, 6);
    expect(expired.breach).toBeCloseTo(0, 10);
    // However long the deal, the breach has a floor.
    expect(exitCost({ seasonsAtClub: 1, breachYears: 9 }).breach).toBe(IDOLATRY.maxBreach);
  });

  it("counts the years left only where a deal is actually running", () => {
    const contract = sign({ ...terms(), years: 3 }, 0);
    expect(breachYears(contract, contract.clubId)).toBe(3);
    expect(breachYears(contract, "elsewhere")).toBe(0);
    expect(breachYears(null, "anything")).toBe(0);
  });
});

describe("cards that rewrite the deal", () => {
  it("rebands the wage when a card moves it, because the expectation moves too", () => {
    const contract = sign(terms({ projectedDelta: -3 }), 0);
    const raised = applyToContract(contract, { wageFactor: 2.2 });
    expect(raised.wage).toBeGreaterThan(contract.wage);
    expect(wagePressure(raised, contract.wageRole)).toBeGreaterThan(0);

    const cut = applyToContract(contract, { wageFactor: 0.5 });
    expect(wagePressure(cut, contract.wageRole)).toBeLessThan(0);
  });

  it("extends a deal without ever leaving more years left than the deal has", () => {
    const contract = tickContract(sign({ ...terms(), years: 3 }, 0));
    const extended = applyToContract(contract, { yearsDelta: 2 });
    expect(extended.years).toBe(5);
    expect(extended.yearsLeft).toBeLessThanOrEqual(extended.years);
    expect(extended.yearsLeft).toBe(4);
  });

  it("leaves a player with no contract alone", () => {
    expect(applyToContract(null, { wageFactor: 2 })).toBeNull();
  });
});

describe("the engine honours a promised role", () => {
  const club = Object.values(world.clubs).find((c) => c.international_reputation === 5);

  const stateAt = (modifiers, ovr) => ({
    seed: "promise", surname: "MOLINA", number: 9, foot: "left", country: "ESP",
    position: "DC", group: "attack", mode: "intensa", profile: "normal",
    age: 24, ovr, value: 0, clubId: club.id, lastRole: null, contract: null,
    idolatry: {}, betrayed: {}, titleClubs: {}, benchStreak: 0, lowRotationStreak: 0,
    clubWantsOut: false, seasonsAtClub: 1, wonContinentalALastSeason: false,
    modifiers, pendingOvr: 0, history: [], trophies: [], awards: [],
    nationalCaps: 0, retired: false,
  });

  it("lifts a player the squad would have left out", () => {
    const base = simulateSeason(stateAt({ titleMultipliers: {} }, 62), world, { season: 2 });
    expect(base.record.role).not.toBe("titular");

    const promised = simulateSeason(
      stateAt({ titleMultipliers: {}, roleFloor: "titular" }, 62),
      world,
      { season: 2 },
    );
    expect(promised.record.role).toBe("titular");
    expect(promised.record.matches).toBeGreaterThan(base.record.matches);
  });

  it("never demotes a player who earned better on his own", () => {
    const { record } = simulateSeason(
      stateAt({ titleMultipliers: {}, roleFloor: "rotacion_baja" }, 92),
      world,
      { season: 2 },
    );
    expect(record.role).toBe("titular");
  });
});

/**
 * OUR CALL #8. Length is a privilege of the clubs with something to protect, and the
 * buy-out is the way out of it. Both halves are measured here, because the old model had
 * a bottom-half side handing out longer deals than a title contender.
 */
describe("how long a club ties you down", () => {
  /** Sweep a realistic spread of clubs and ages rather than assert one lucky seed. */
  const sweep = (make) => {
    const out = [];
    for (let i = 0; i < 600; i += 1) {
      out.push(
        make({
          seed: `sweep-${i}`,
          age: 17 + (i % 20),
          projectedDelta: -8 + (i % 17),
        }),
      );
    }
    return out;
  };

  const yearsAt = (fixed) =>
    sweep(({ seed, age, projectedDelta }) =>
      openingTerms({
        seed, season: 1, clubId: "c", age, projectedDelta, value: 5_000_000, ...fixed,
      }).years,
    );

  const share = (xs, predicate) => xs.filter(predicate).length / xs.length;

  it("makes one season the overwhelming default away from the contenders", () => {
    for (const reputation of [0, 1, 2]) {
      const years = yearsAt({ reputation, tier: 1 });
      expect(share(years, (y) => y === 1)).toBeGreaterThan(0.6);
    }
  });

  it("keeps the second tier year to year whatever the club's stature", () => {
    const years = yearsAt({ reputation: 4, tier: 2 });
    expect(share(years, (y) => y === 1)).toBeGreaterThan(0.6);
    expect(terms({ reputation: 4, tier: 2 }).reasons).toContain("yearToYear");
  });

  it("signs long only where there is a title to chase, and longer the bigger the chase", () => {
    const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const fringe = mean(yearsAt({ reputation: CONTRACT.contenderFrom, tier: 1 }));
    const giant = mean(yearsAt({ reputation: 5, tier: 1 }));
    const nobody = mean(yearsAt({ reputation: 1, tier: 1 }));

    expect(nobody).toBeLessThan(1.6);
    expect(fringe).toBeGreaterThan(nobody);
    expect(giant).toBeGreaterThan(fringe);
    // The defect this replaced: a bottom-half side offered 4.1 years and a contender 3.3.
    expect(giant).toBeGreaterThan(nobody + 1);
  });

  it("still lets a small club commit to a teenager it wants to keep", () => {
    const young = yearsAt({ reputation: 1, tier: 1 });
    expect(share(young, (y) => y > 1)).toBeGreaterThan(0.05);
  });
});

describe("arguing the buy-out down", () => {
  const clause = ASKS_BY_ID.clause;

  it("is not on the table at all on a one-year deal", () => {
    // Nothing to escape from: he is free in ten months either way.
    expect(clause.available({ years: 1 })).toBe(false);
    expect(clause.available({ years: 3 })).toBe(true);
    expect(askOdds(clause, 0.9, { years: 1, reputation: 3, projectedDelta: 0 })).toBe(0);
  });

  it("is refused flat by a negotiate() call that should never have been made", () => {
    const result = negotiate({
      seed: "no", clubId: "c", round: 0, leverage: 1, askId: "clause",
      terms: terms({ reputation: 1, tier: 1 , age: 30 }),
    });
    // A one-year deal at a non-contender: the ask does not exist, so nothing moves.
    expect(result).toBeNull();
  });

  it("reads the club's circumstances and not only the player's leverage", () => {
    const desperate = { years: 3, reputation: 3, projectedDelta: 8, stay: false };
    const giant = { years: 3, reputation: 5, projectedDelta: -2, stay: false };
    expect(askOdds(clause, 0.4, desperate)).toBeGreaterThan(askOdds(clause, 0.4, giant));
  });

  it("takes a real bite out of the number when it is granted", () => {
    const long = terms({ reputation: 5, age: 22 });
    expect(long.years).toBeGreaterThan(1);
    expect(clause.apply(long).clause).toBeCloseTo(
      Math.round(long.clause * CONTRACT.clauseCut),
      0,
    );
  });

  it("leaves the shorter-deal ask off a deal that is already at the minimum", () => {
    expect(ASKS_BY_ID.short.available({ years: CONTRACT.minYears })).toBe(false);
    expect(ASKS_BY_ID.short.available({ years: 2 })).toBe(true);
  });
});

describe("somebody paying it", () => {
  const odds = (ratio, ovr = 86) => clauseOdds({ clause: ratio * 1e7, value: 1e7, ovr });

  it("gets likelier the more reachable the number is", () => {
    expect(odds(1.3)).toBeGreaterThan(odds(2.4));
    expect(odds(2.4)).toBeGreaterThan(odds(4));
  });

  it("is a wall past the point the club paid for", () => {
    expect(odds(CLAUSE.steep)).toBe(0);
    expect(odds(9)).toBe(0);
  });

  it("never fires for a player nobody wants, however cheap he is", () => {
    expect(odds(1, 60)).toBe(0);
    expect(odds(1, CLAUSE.wantedFrom)).toBe(0);
    expect(odds(1, 90)).toBeGreaterThan(0);
  });

  it("is rationed: a career is not an auction", () => {
    for (const ovr of [70, 80, 90, 99]) {
      for (const ratio of [0.2, 1, 2, 4.9]) {
        const value = odds(ratio, ovr);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(CLAUSE.maxOdds);
      }
    }
  });

  it("roughly doubles the way out when the clause was argued down at signing", () => {
    // The return on the ask is not a discount, it is the odds of the door opening.
    expect(odds(2.4 * CONTRACT.clauseCut)).toBeGreaterThan(odds(2.4) * 1.5);
  });

  it("returns nothing for a player with no clause or no value", () => {
    expect(clauseOdds({ clause: 0, value: 1e7, ovr: 90 })).toBe(0);
    expect(clauseOdds({ clause: 1e7, value: 0, ovr: 90 })).toBe(0);
  });
});

describe("a buy-out that was met is not a contract that was broken", () => {
  it("charges no breach when the price was paid", () => {
    const broken = exitCost({ seasonsAtClub: 4, breachYears: 3, idolatryHere: 40 });
    const paid = exitCost({ seasonsAtClub: 4, breachYears: 3, idolatryHere: 40, clausePaid: true });
    expect(broken.breach).toBeLessThan(0);
    expect(paid.breach).toBe(0);
    expect(paid.change).toBeGreaterThan(broken.change);
    // The ordinary price of leaving is still charged in full - he did still leave.
    expect(paid.change).toBe(IDOLATRY.leaving);
  });

  it("still brands a move to a league rival, paid or not", () => {
    const paid = exitCost({
      seasonsAtClub: 6, sameCompetition: true, idolatryHere: 90, breachYears: 2, clausePaid: true,
    });
    expect(paid.betrayal).toBe(true);
    expect(paid.breach).toBe(0);
  });
});

/**
 * The office must never charge for nothing.
 *
 * Every ask spends leverage and prints its odds, so an ask that is granted and changes no
 * term is the game lying twice: once on the button and once on the signing sheet, which
 * lists it under what you won. `clause` and `short` were already gated; `role` was not.
 */
describe("no ask is offered that cannot change the deal", () => {
  const roleAsk = ASKS_BY_ID.role;

  it("does not offer the shirt to a player who already has it", () => {
    // delta >= 0 is `titular`, the top of the ladder: there is no rung above to promise.
    const deal = terms({ projectedDelta: 3 });
    expect(deal.projectedRole).toBe("titular");
    expect(promiseRole("titular")).toBe("titular");
    expect(roleAsk.available(deal)).toBe(false);
    expect(askOdds(roleAsk, 0.95, deal)).toBe(0);
    expect(negotiate({ seed: "n", clubId: "c", round: 0, terms: deal, leverage: 1, askId: "role" }))
      .toBeNull();
  });

  it("does offer it to a player who is a rung below", () => {
    const deal = terms({ projectedDelta: -3, reputation: 5 });
    expect(deal.projectedRole).toBe("rotacion_alta");
    expect(roleAsk.available(deal)).toBe(true);
    expect(askOdds(roleAsk, 0.9, deal)).toBeGreaterThan(0);
    expect(roleAsk.apply(deal).rolePromise).toBe("titular");
  });

  it("does not offer it twice when the club already volunteered it", () => {
    const volunteered = terms({ projectedDelta: -3, reputation: 2 });
    expect(volunteered.rolePromise).toBe("titular");
    expect(roleAsk.available(volunteered)).toBe(false);
  });

  /** The property, over every deal the game can put on a table. */
  it("changes at least one term whenever it is granted", () => {
    for (const reputation of [0, 2, 3, 5]) {
      for (const tier of [1, 2]) {
        for (const projectedDelta of [-11, -7, -3, -1, 0, 2, 6, 10]) {
          for (const age of [17, 22, 27, 33, 38]) {
            const deal = terms({ reputation, tier, projectedDelta, age });
            for (const ask of ASKS) {
              if (!ask.available?.(deal) && ask.available) continue;
              const after = ask.apply(deal);
              const moved = ["years", "wage", "wageRole", "rolePromise", "clause"].some(
                (key) => after[key] !== deal[key],
              );
              expect(
                moved,
                `ask "${ask.id}" changed nothing at rep ${reputation} tier ${tier} delta ${projectedDelta} age ${age}`,
              ).toBe(true);
            }
          }
        }
      }
    }
  });
});
