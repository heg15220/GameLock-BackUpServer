/**
 * The contract.
 *
 * Signing used to be one click on a club crest. That is the right shape for the delta
 * thesis - choosing a club is choosing a number - but it left the moment a career is
 * actually decided in an office completely unmodelled, and it made every deal identical.
 *
 * Four terms, and every one of them binds the model. Nothing here is texture:
 *
 *  1. `years` - while the contract runs, the club cannot push you out and "stay" is always
 *     on the table. Walking out early costs the crowd extra, on top of the ordinary exit.
 *  2. `wage` - the counterweight, and the reason this file exists. A wage is not money you
 *     spend; it is the standard you will be measured against. It is quoted as a ROLE: you
 *     sign on a starter's wage or a squad player's wage, and every season the crowd
 *     compares that promise to the role you actually played. Sign big and sit on the
 *     bench and idolatría goes backwards.
 *  3. `rolePromise` - a floor one rung above where the distance would leave you, honoured
 *     absolutely for the first season. Clubs volunteer it only in the narrow band where it
 *     is worth anything; below that you have to have the leverage to ask.
 *  4. `clause` - how easy you are to reach. A low buy-out brings more offers next summer.
 *
 * The negotiation is built out of the same grammar as the decision cards: every ask prints
 * the odds it will be granted, and the printed odds are the odds that get rolled.
 *
 * Pure: no React, no clock.
 */

import { chance, createStream } from "./rng.js";
import { ROLE_BANDS, SQUAD_LEVEL } from "./tables.js";

/**
 * What a season is worth at each rung of club, before role. Not a salary cap and not an
 * economy - the player never spends this. It exists so that "a starter's wage here" is a
 * number rather than an adjective.
 */
export const SQUAD_WAGE = [180_000, 460_000, 1_100_000, 2_600_000, 5_200_000, 9_000_000];

/** What each role is paid, relative to the squad around it. */
export const ROLE_WAGE = {
  titular: 1.4,
  rotacion_alta: 1.0,
  rotacion_baja: 0.68,
  suplente: 0.45,
};

/**
 * Two clubs of the same stature do not pay the same. A mid-table side in the strongest
 * league in the world outspends its exact counterpart three confederations away, and the
 * second tier is a different economy from the first wherever it is played.
 */
export const LEAGUE_PAY = [0.55, 0.7, 0.85, 1.0, 1.25];
export const TIER_PAY = { 1: 1, 2: 0.35 };

/** Role bands high to low, which is the order a wage is read in. */
const WAGE_LADDER = ["titular", "rotacion_alta", "rotacion_baja", "suplente"];

export const CONTRACT = {
  minYears: 1,
  maxYears: 5,

  /**
   * A DEAL HAS TO REACH THE NEXT SUMMER YOU ARE ALLOWED TO HAVE ONE.
   *
   * Everything a contract mechanically does, it does at the market: it guarantees "stay" is
   * on the table and it stops the club pushing you out (see `offersWithFallback`). But the
   * market only opens once a STEP, and a step is one season in intensa, two in normal and
   * three in exprés - so a one-year deal signed in exprés expired after the first of the
   * three seasons it was supposed to cover, and by the time the only screen that reads it
   * came round it had nothing left to say. The player had signed a four-word promise that
   * was over before anybody could hold anybody to it.
   *
   * So a term is rounded UP to a whole number of steps. What a club is offering is not
   * "three seasons", it is "one more cycle of this career" - and in a mode where three
   * seasons pass between decisions, one cycle is what three seasons are.
   */
  stepUp: (years, seasonsPerStep = 1) =>
    Math.max(1, Math.ceil(years / seasonsPerStep)) * seasonsPerStep,
  /** A buy-out is a multiple of the wage; the bigger the club, the sillier the multiple. */
  clauseMultiple: [6, 8, 10, 14, 18, 25],
  /** Asking for a shorter deal is the one thing that costs the club almost nothing. */
  maxAsks: 2,
  /** What a granted clause ask takes off the buy-out. */
  clauseCut: 0.55,

  /**
   * The stature at which a first-division club starts behaving like one with something to
   * protect. Below it, football is year to year.
   *
   * OUR CALL #8: length is a privilege of the clubs that have something to lose.
   *
   * The old model handed out length by age and then nudged it, and the result was upside
   * down: measured over 4,000 offers, 58% of all contracts ran four or five years, 8% ran
   * one, and a bottom-of-the-table first-division side offered LONGER deals (4.1 years on
   * average) than a genuine title contender (3.3). Every career was a sequence of long
   * deals nobody had a reason to give, which made `years` - the term that decides whether
   * the club can push you out and what walking away costs the crowd - a number the player
   * never had to think about.
   *
   * Now the default is one season, everywhere, for everyone. A multi-year deal is a thing
   * a club does when it is contending for something and wants you for the run at it, and
   * that is the only place it happens. `TITLE_ODDS.league` gives a reputation-3 side a 25%
   * shot at its division and a reputation-2 side 5%, so 3 is where "contender" starts
   * meaning something in the model rather than in the fiction.
   */
  contenderFrom: 3,
  /**
   * The window in which a club promises the shirt without being asked.
   *
   * A promise is a FLOOR, and `titular` starts at delta 0 - so promising a starting place
   * to somebody already comfortably above the squad guarantees him a thing he had anyway.
   * The only place the term is worth printing is the band just below the line: a club
   * signing a player it rates as an equal, and saying so to get him. Further down they
   * will not give it away, which is what leaves the player something to argue for.
   */
  promiseWindow: [-6, 0],
};

/**
 * What a promise is actually worth: one rung above where the distance would leave you,
 * capped at the top. Guaranteeing the role somebody was getting anyway is not a term.
 */
export function promiseRole(projectedRole) {
  const index = WAGE_LADDER.indexOf(projectedRole);
  return WAGE_LADDER[Math.max(0, index - 1)];
}

/**
 * What a player in this role, at this club, is paid: the yardstick everything else is
 * measured against.
 *
 * `pay` is the club's wage structure and nothing about the individual deal - stature,
 * league and division. That separation is the whole point: anything in here moves par, so
 * it costs the player nothing; anything outside it moves his wage AGAINST par, and the
 * crowd charges for the difference.
 */
export function parWage(pay, role) {
  const { reputation = 0, strength = 2, tier = 1 } = pay ?? {};
  const base = SQUAD_WAGE[reputation] ?? SQUAD_WAGE[0];
  return Math.round(
    base * (ROLE_WAGE[role] ?? 1) * (LEAGUE_PAY[strength] ?? 1) * (TIER_PAY[tier] ?? 1),
  );
}

/**
 * Read a wage back as the role it corresponds to. This is what gets printed on the
 * contract before signing, and what the crowd holds you to afterwards.
 */
export function wageBand(wage, pay) {
  let best = WAGE_LADDER[WAGE_LADDER.length - 1];
  let bestGap = Infinity;
  for (const role of WAGE_LADDER) {
    const gap = Math.abs(Math.log(wage / parWage(pay, role)));
    if (gap < bestGap) {
      bestGap = gap;
      best = role;
    }
  }
  return best;
}

/**
 * How far a wage sits above the par of its own band.
 *
 * `wageBand` rounds a wage to the nearest role, which is what makes it readable - but it
 * also hides the difference between a starter's wage and the biggest starter's wage at
 * the club. This is that difference, and the crowd charges for it like any other.
 */
export function wagePremium(wage, pay) {
  const par = parWage(pay, wageBand(wage, pay));
  return par > 0 ? Math.log2(wage / par) : 0;
}

/** The role a projected delta would land you in - the same ladder the meter draws. */
export function roleForDelta(delta) {
  return (ROLE_BANDS.find((band) => delta >= band.minDelta) ?? ROLE_BANDS[ROLE_BANDS.length - 1])
    .role;
}

/**
 * How much the club will take from you.
 *
 * Leverage is not charisma: it is the same delta the whole game turns on, plus whatever
 * the crowd already thinks of you. A seventeen-year-old who would be fourth choice has
 * nothing to negotiate with, and the game should say so rather than pretend.
 */
export function leverageFor({ projectedDelta = 0, idolatryHere = 0, ovr = 50, stay = false }) {
  const fromDelta = 0.5 + projectedDelta * 0.055;
  const fromCrowd = (stay ? idolatryHere : 0) / 100 * 0.3;
  const fromQuality = (ovr - 68) * 0.006;
  return Math.max(0, Math.min(1, fromDelta + fromCrowd + fromQuality));
}

/**
 * The deal the club puts on the table before anybody talks.
 *
 * Every term is a reading of the circumstances rather than a table lookup, because two
 * clubs offering "three years" for completely different reasons is what makes a career of
 * signings feel like a career rather than a menu:
 *
 *  - YEARS are how long they think you are worth having. Age sets the span; a club that
 *    is signing you to play stretches it, a club hedging on a squad player cuts it, big
 *    clubs tie people down and the second tier cannot afford to.
 *  - WAGE starts at par for the role you would land in - which already knows the league
 *    and the division - and then moves against par for the two things that are about this
 *    negotiation and not about the club: how badly they need you, and whether the stand
 *    already sings your name. Both are printed, and both raise what is expected of you.
 *  - A ROLE PROMISE is offered unasked only in the band where it changes something, and
 *    never by a club that does not need to say it.
 *  - The CLAUSE is a selling price, so it is the only term that reads your market value.
 *    Selling clubs price to sell; big clubs price to keep.
 *
 * Deterministic per offer, so re-reading the market does not reroll the terms.
 */
export function openingTerms({
  seed,
  season,
  clubId,
  reputation = 0,
  strength = 2,
  tier = 1,
  projectedDelta = 0,
  age = 16,
  value = 0,
  seasonsAtClub = 0,
  idolatryHere = 0,
  stay = false,
  youth = false,
  /*
   * How many seasons pass between one market and the next. Every term below is drawn in
   * seasons, as football does; this is what turns the answer into something the career can
   * actually be held to. See CONTRACT.stepUp.
   */
  seasonsPerStep = 1,
}) {
  const next = createStream(seed, "contract", clubId, season);
  const pay = { reputation, strength, tier };
  const role = roleForDelta(projectedDelta);
  const reasons = [];
  const note = (id) => reasons.push(id);

  /* ── Years ──────────────────────────────────────────────────────────────── */
  // See OUR CALL #8. One season is the default and the overwhelming majority; length is
  // something only a first-division side with a title to chase has a reason to offer.
  const contender = tier === 1 && reputation >= CONTRACT.contenderFrom;
  // Carried on the terms so every later reading of them - the asks, the sheet - measures a
  // deal in the same units the club offered it in.
  const perStep = Math.max(1, seasonsPerStep);
  let years = 1;

  /*
   * The first one is always a single season, wherever it is signed.
   *
   * Nobody knows anything yet - not the club, and not the player, who at sixteen has a
   * rating drawn from a table and no evidence behind it. It is also the first thing this
   * game teaches: leverage is the delta plus what the crowd thinks of you, and at sixteen
   * both are nothing, so the first deal is the one you have least say in. Tying a
   * seventeen-year-old to a giant for five years on the strength of a youth-team draw
   * would hand him the whole career before he had played a match of it.
   */
  if (youth) {
    note("firstDeal");
  } else if (contender) {
    note("contender");
    // How long the run at it is worth: a giant plans in cycles, a fringe contender in
    // seasons. This is the whole of the base - everything else adjusts it by one.
    years = reputation >= 5 ? 4 : reputation >= 4 ? 3 : 2;

    if (age <= 21) {
      years += 1;
      note("young");
    } else if (age >= 33) {
      years -= 1;
      note("veteran");
    }
    if (projectedDelta >= 5) {
      years += 1;
      note("needed");
    } else if (projectedDelta <= -5) {
      years -= 1;
      note("squadFiller");
    }
    if (stay && idolatryHere >= 50) {
      years += 1;
      note("idol");
    }
    // A little give, so two identical situations are not two identical contracts.
    if (next() < 0.25) years += 1;
  } else {
    note("yearToYear");
    if (tier === 2) note("secondTier");
    // The two reasons a club with nothing to protect still commits to a second year: a
    // teenager it wants to keep hold of, and a player it is signing to build around.
    if (age <= 21 && projectedDelta >= -2 && next() < 0.45) {
      years = 2;
      note("young");
    } else if (projectedDelta >= 8 && next() < 0.4) {
      years = 2;
      note("needed");
    }
  }
  /*
   * Rounded up to whole steps, and the ceiling with it: a deal that runs out halfway
   * through a step is a deal that was never in force when it mattered, and a five-season
   * maximum in exprés would be under two markets anyway. `maxYears` is the football
   * number; the mode decides how many of those a promise has to be worth.
   */
  const span = Math.max(1, seasonsPerStep);
  const longest = CONTRACT.stepUp(CONTRACT.maxYears, span);
  years = Math.max(span, Math.min(longest, CONTRACT.stepUp(years, span)));

  /* ── Wage ───────────────────────────────────────────────────────────────── */
  if (strength >= 4) note("strongLeague");
  else if (strength <= 1 && tier === 1) note("weakLeague");

  // What they will stretch for. Bounded, and always smaller than what the player can win
  // at the table himself - the argument should matter more than the circumstances.
  const need = 1 + Math.max(-6, Math.min(10, projectedDelta)) * 0.02;
  const loyalty = stay ? 1 + (Math.min(100, idolatryHere) / 100) * 0.18 : 1;
  const wage = Math.round(parWage(pay, role) * need * loyalty);

  /* ── Role promise ───────────────────────────────────────────────────────── */
  // Only in the band where the term is worth anything, and only from a club that has to
  // say something to get him. A giant promises nobody.
  const [floorDelta, ceilingDelta] = CONTRACT.promiseWindow;
  const promised =
    reputation <= 4 && projectedDelta >= floorDelta && projectedDelta < ceilingDelta
      ? promiseRole(role)
      : null;
  if (promised) note("promised");

  /* ── Clause ─────────────────────────────────────────────────────────────── */
  let clause = Math.max(
    wage * (CONTRACT.clauseMultiple[reputation] ?? 10),
    value * (reputation >= 4 ? 2.4 : 1.6),
  );
  if (age <= 22) clause *= 1.4;
  if (tier === 2 || strength <= 1) {
    clause *= 0.6;
    note("sellingClub");
  }

  return {
    clubId,
    years,
    // The unit the deal was written in, so the asks argue in it too. See CONTRACT.stepUp.
    seasonsPerStep: perStep,
    wage,
    wageRole: wageBand(wage, pay),
    rolePromise: promised,
    clause: Math.round(clause),
    pay,
    reputation,
    projectedRole: role,
    seasonsAtClub,
    stay,
    // Why the deal looks like this. Printed on the sheet - the game does not hide its
    // reasoning anywhere else and there is no reason to start here.
    reasons: [...new Set(reasons)],
  };
}

/**
 * The four things worth asking for, in the order a player would ask for them.
 *
 * `cost` is what the ask spends of your leverage; the odds of being granted are your
 * leverage measured against it, and they are printed on the button before you press it.
 */
export const ASKS = [
  {
    id: "wage",
    cost: 0.42,
    icon: "wage",
    /**
     * One rung up the wage ladder - which is one rung up what the crowd expects too.
     *
     * At the top of the ladder there is no rung left, and the raise must not quietly
     * become a rounding error: it goes above what a starter here is paid, and the stand
     * measures you against that. Being the best-paid man at the club is a standard.
     */
    apply: (terms) => {
      const index = WAGE_LADDER.indexOf(terms.wageRole);
      const wage =
        index <= 0
          ? Math.round(terms.wage * 1.45)
          : Math.max(
              Math.round(terms.wage * 1.15),
              parWage(terms.pay, WAGE_LADDER[index - 1]),
            );
      return {
        ...terms,
        wage,
        wageRole: wageBand(wage, terms.pay),
        // A buy-out follows the wage up: they have more to lose now.
        clause: Math.max(terms.clause, Math.round(wage * (CONTRACT.clauseMultiple[terms.pay.reputation] ?? 10))),
      };
    },
  },
  {
    id: "role",
    cost: 0.58,
    icon: "role",
    /**
     * Only where there is a rung above him to be promised.
     *
     * `titular` is the top of the ladder and it starts at delta 0, so `promiseRole` hands
     * a player who is already projected there the role he was getting anyway. The club has
     * always known that - `CONTRACT.promiseWindow` is why it never volunteers the term
     * above delta 0 - but the ASK was never gated the same way, so a delta +3 player was
     * shown "the shirt, 95%", spent the biggest slice of leverage in the office on it, was
     * granted it, and got a floor identical to his ceiling. The signing screen then listed
     * it under what he had won, which is the game telling him a plain untruth.
     *
     * Also off the table once the club has already volunteered the same promise: asking
     * for a thing you have been handed is not a negotiation.
     */
    available: (terms) => {
      const lift = promiseRole(terms.projectedRole);
      return lift !== terms.projectedRole && lift !== terms.rolePromise;
    },
    apply: (terms) => ({ ...terms, rolePromise: promiseRole(terms.projectedRole) }),
  },
  {
    id: "clause",
    cost: 0.36,
    icon: "clause",
    /**
     * The escape hatch, and the only term that is worth arguing over precisely because the
     * deal is long. On a one-year deal there is nothing to escape from - you are free in
     * ten months - so the ask does not appear at all; on a four-year deal at a giant it is
     * the difference between a career you steer and one you wait out.
     */
    available: (terms) => terms.years > 1,
    apply: (terms) => ({ ...terms, clause: Math.round(terms.clause * CONTRACT.clauseCut) }),
  },
  {
    id: "short",
    cost: 0.14,
    icon: "years",
    /*
     * Nothing to shorten at the minimum, and the club will not sign for half a season - nor
     * for half a step, which is the same thing said in the units the career runs in. A deal
     * argued down to something that expires before the next market would be the player
     * asking for the one term that cannot be honoured.
     */
    available: (terms) => terms.years > CONTRACT.stepUp(1, terms.seasonsPerStep ?? 1),
    apply: (terms) => {
      const span = Math.max(1, terms.seasonsPerStep ?? 1);
      return { ...terms, years: Math.max(span, terms.years - span) };
    },
  },
];

export const ASKS_BY_ID = Object.fromEntries(ASKS.map((ask) => [ask.id, ask]));

/** Whether this ask is on the table at all, given what is being offered. */
export const askAvailable = (ask, terms) => (ask.available ? ask.available(terms) : true);

/**
 * The odds this ask is granted. Printed on the button, and the number that gets rolled.
 *
 * The clause is the one ask where the club's own circumstances speak as loudly as the
 * player's leverage - "si el club lo considera oportuno". A side that is stretching to
 * sign someone it needs will write a reachable buy-out to get the signature; a giant
 * protecting an asset it did not have to fight for will not, whatever the player says.
 */
export function askOdds(ask, leverage, terms = null) {
  if (ask.id === "role" && leverage < 0.25) return 0;
  if (terms && !askAvailable(ask, terms)) return 0;

  let odds = leverage / ask.cost;
  if (ask.id === "clause" && terms) {
    odds *= clauseWillingness(terms);
  }
  return Math.max(0, Math.min(0.95, odds));
}

/**
 * How open the club is to writing a lower buy-out. Multiplies the ordinary odds, so the
 * player's leverage still matters - this decides how far it gets him.
 */
export function clauseWillingness({ reputation = 0, projectedDelta = 0, stay = false }) {
  // They need you more than they need the protection.
  const need = projectedDelta >= 5 ? 1.3 : projectedDelta >= 0 ? 1.05 : 0.8;
  // The bigger the club, the less it has to concede to get a signature.
  const stature = reputation >= 5 ? 0.55 : reputation >= 4 ? 0.75 : 1;
  // Renewing, they already have you; there is nothing to win by making you cheaper.
  return need * stature * (stay ? 0.8 : 1);
}

/**
 * Put an ask to the club. Granted, the terms move and the leverage is spent; refused, it
 * still costs half - you have shown them what you want, and they have said no.
 */
export function negotiate({ seed, clubId, round, terms, leverage, askId }) {
  const ask = ASKS_BY_ID[askId];
  if (!ask || !askAvailable(ask, terms)) return null;
  const odds = askOdds(ask, leverage, terms);
  const granted = chance(createStream(seed, "negotiate", clubId, askId, round), odds);
  return {
    askId,
    odds,
    granted,
    terms: granted ? ask.apply(terms) : terms,
    leverage: Math.max(0, leverage - (granted ? ask.cost : ask.cost / 2)),
  };
}

/** Turn agreed terms into the contract the career carries around. */
export function sign(terms, season) {
  return {
    clubId: terms.clubId,
    years: terms.years,
    yearsLeft: terms.years,
    wage: terms.wage,
    wageRole: terms.wageRole,
    rolePromise: terms.rolePromise,
    clause: terms.clause,
    // The club's wage structure travels with the deal: par is what the crowd compares
    // the wage against every season, so it cannot be recomputed from stature alone.
    pay: terms.pay,
    reputation: terms.pay?.reputation ?? terms.reputation ?? 0,
    reasons: terms.reasons ?? [],
    signedSeason: season,
  };
}

/** Burn a season off the deal. A contract at zero is a player who can leave for nothing. */
export function tickContract(contract) {
  if (!contract) return null;
  return { ...contract, yearsLeft: Math.max(0, contract.yearsLeft - 1) };
}

export const isUnderContract = (contract, clubId) =>
  Boolean(contract && contract.clubId === clubId && contract.yearsLeft > 0);

/**
 * What the contract does to the season about to be played. The role promise is honoured
 * absolutely and only in the first season: a promise with an escape hatch is not a promise,
 * and a promise that never expires is not a contract.
 */
export function contractModifiers(contract) {
  if (!contract?.rolePromise) return {};
  if (contract.yearsLeft !== contract.years) return {};
  return { roleFloor: contract.rolePromise };
}

/**
 * How far the wage sits above or below the role actually played.
 *
 * Positive means the crowd is watching someone who is paid more than he plays. This is the
 * whole point of quoting a wage as a role: the comparison is made in the same units.
 */
export function wagePressure(contract, playedRole, pay) {
  if (!contract?.wage || !playedRole) return 0;
  const par = parWage(pay ?? contract.pay ?? { reputation: contract.reputation ?? 0 }, playedRole);
  if (par <= 0) return 0;
  // Log ratio, so being paid double and being paid half are symmetric.
  return Math.max(-1.2, Math.min(1.6, Math.log2(contract.wage / par)));
}

/** Breaking a deal that still had years to run. Paid to the crowd, never to the club. */
export function breachYears(contract, clubId) {
  return isUnderContract(contract, clubId) ? contract.yearsLeft : 0;
}

/* ── Somebody pays the buy-out ────────────────────────────────────────────────
   The other half of OUR CALL #8, and the reason a long deal is a decision rather
   than a sentence.

   A buy-out used to do exactly one thing: set how many clubs came looking next
   summer. That made the clause ask a quiet little bonus rather than a lever, and it
   left a four-year deal at a giant with no story in it at all - you either sat out
   the years or tore the contract up and paid the crowd for it.

   Now the number is a price, and it can be met. Argue it down at the table and you
   are not buying a discount, you are buying the odds that somebody triggers it - and
   when they do, the contract is settled in full, so the crowd charges you the
   ordinary cost of leaving and not a season of breach on top. Leave the clause where
   they wrote it and nobody comes near it, which is exactly what the club paid for.

   And it is still a decision when it happens: the money changing hands does not move
   the player. Turning it down is the loudest thing he can say to a stand.          */

export const CLAUSE = {
  /** At or under this multiple of market value, a buy-out is simply a price. */
  cheap: 1.4,
  /** Past this it is a wall, and the club has bought the years it paid for. */
  steep: 5,
  /** The most likely this can ever be in one summer. A career is not an auction. */
  maxOdds: 0.45,
  /** Below this rating nobody is triggering anybody's release. */
  wantedFrom: 70,
  wantedFull: 88,
};

/**
 * The odds a club pays it this summer.
 *
 * Two independent things have to be true: the number has to be reachable, and the player
 * has to be worth reaching for. The first is the clause against his market value on a log
 * scale - the difference between 1.4x and 2.8x matters far more than between 8x and 16x,
 * both of which are simply "no". The second is that nobody triggers a release for a squad
 * player, however cheap he is.
 */
export function clauseOdds({ clause, value, ovr = 0 }) {
  if (!(clause > 0) || !(value > 0)) return 0;
  const ratio = clause / value;
  if (ratio >= CLAUSE.steep) return 0;

  const top = Math.log(CLAUSE.steep);
  const bottom = Math.log(CLAUSE.cheap);
  const reachable = (top - Math.log(Math.max(ratio, CLAUSE.cheap))) / (top - bottom);
  const wanted = Math.max(
    0,
    Math.min(1, (ovr - CLAUSE.wantedFrom) / (CLAUSE.wantedFull - CLAUSE.wantedFrom)),
  );
  return Math.max(0, Math.min(CLAUSE.maxOdds, reachable * wanted * CLAUSE.maxOdds));
}
