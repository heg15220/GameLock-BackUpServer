/**
 * The career loop.
 *
 * `engine.js` knows how to play one season. This is what turns that into a game: the
 * order the screens come in, which decisions are live at each point, and every rule that
 * spans more than a single season (the personal-event budget, the injury cap, the flags
 * an event sets now and the market honours later).
 *
 * A run is one plain object. Every function here takes a run and returns a new run, so
 * the whole thing is a reducer the UI can render and a test can drive in a loop.
 *
 * The shape of a career, per step:
 *
 *   YOUTH ─┐
 *          ├─▶ NEGOTIATION ─▶ SIGNING ─▶ EVENT ─▶ MATCH ─▶ SEASON ─▶ MARKET ─┐
 *   MARKET ┘                              ▲   └─ one per season ─┤           │
 *                                         └─────────────────────────────────┘
 *                                                                  └──▶ RETIRED
 *
 * A "step" is one decision cycle. In `intensa` it is one season, in `expres` three: the
 * mode does not change the simulation, only how often you get to touch it. MATCH is the
 * exception to that: every season gets its own three matches, so an `expres` step opens
 * the phase three times over before the report is printed.
 *
 * NEGOTIATION and SIGNING sit between picking a club and playing for it, because that is
 * where a career is actually decided and the game used to skip it in one click. Both the
 * youth signing and every summer transfer run through the same two phases.
 */

import {
  derbyRivals,
  matchEffects,
  resolveShot,
  seasonFixtures,
  shotFor,
} from "./bigmatch.js";
import {
  ASKS,
  CONTRACT,
  askOdds,
  contractModifiers,
  isUnderContract,
  leverageFor,
  negotiate,
  openingTerms,
  sign,
  tickContract,
  wagePressure,
} from "./contract.js";
import {
  buildOffers,
  careerSummary,
  createCareer,
  developmentOutlook,
  effectiveReputation,
  simulateSeason,
  squadLevelFor,
  youthOffers,
} from "./engine.js";
import { EVENTS, MAX_INJURIES, applyEffects, drawEvent, drawInjury } from "./events.js";
import {
  applyIdolatry,
  exitPreview,
  idolatryAt,
  levelOf,
  peakIdolatry,
  seasonIdolatry,
} from "./idolatry.js";
import { headlineFor, retirementVerdict, shadowNoteFor } from "./press.js";
import { createStream, pickWeighted } from "./rng.js";
import { shadowComparison, simulateShadowCareer } from "./rival.js";
import { CALLUP_THRESHOLD, CAREER_MODES, RETIREMENT_AGE } from "./tables.js";

export const PHASES = {
  YOUTH: "youth",
  NEGOTIATION: "negotiation",
  SIGNING: "signing",
  EVENT: "event",
  MATCH: "match",
  SEASON: "season",
  MARKET: "market",
  RETIRED: "retired",
};

/** Personal events read as punctuation, so they are rationed and never back to back. */
const PERSONAL_COOLDOWN_STEPS = 2;
const NATIONALITY_CHOICES = 3;

const modeOf = (mode) => CAREER_MODES[mode] ?? CAREER_MODES.intensa;

/**
 * Everything the draw is not allowed to offer this step: what has already been used,
 * plus the personal events once the career's budget for them is spent or still cooling.
 */
function blockedEventIds(run) {
  const blocked = [...run.usedEventIds];
  const [minPersonal, maxPersonal] = modeOf(run.state.mode).personalEvents;

  // The budget is a range; the seed picks where in it this career lands.
  const budgetStream = createStream(run.state.seed, "personal-budget");
  const budget = minPersonal + Math.floor(budgetStream() * (maxPersonal - minPersonal + 1));

  const spent = run.personalEventsSeen;
  const cooling = run.step - run.lastPersonalStep < PERSONAL_COOLDOWN_STEPS;
  if (spent >= budget || (run.lastPersonalStep >= 0 && cooling)) {
    for (const event of EVENTS) {
      if (event.theme === "personal") blocked.push(event.id);
    }
  }
  return blocked;
}

/**
 * What the deck is allowed to know about you. Every card's weight is a function of this,
 * so the catalogue reshuffles itself as the career changes shape.
 */
export function eventContext(run) {
  const { state, world } = run;
  const club = world.clubs[state.clubId] ?? null;
  const competition = club ? world.competitions[club.competitionId] ?? null : null;
  const country = world.countries[state.country] ?? null;
  const squadLevel = club ? squadLevelFor(club, state.ovr) : state.ovr;
  const callupThreshold = CALLUP_THRESHOLD[country?.international_reputation ?? 0] ?? 99;

  return {
    age: state.age,
    ovr: state.ovr,
    delta: state.ovr - squadLevel,
    role: state.lastRole,
    seasonsAtClub: state.seasonsAtClub,
    clubReputation: club?.international_reputation ?? 0,
    competitionTier: competition?.tier ?? 1,
    abroad: Boolean(competition && competition.country_fifa_code !== state.country),
    atFirstClub: state.clubId != null && state.clubId === run.firstClubId,
    calledUp: state.ovr >= callupThreshold,
    idolatry: idolatryAt(state.idolatry, state.clubId),
    clubWantsOut: Boolean(state.clubWantsOut),
    // The deal you are on, so the office cards only appear when there is one to rewrite.
    contractYearsLeft:
      state.contract?.clubId === state.clubId ? state.contract.yearsLeft : 0,
    wageRole: state.contract?.clubId === state.clubId ? state.contract.wageRole : null,
  };
}

/**
 * Open the next decision: one card, plus an injury if this is the year it happens.
 *
 * A long career in `intensa` can outlast the catalogue, and state-dependent weights can
 * empty the pool on their own. Rather than end the game early we relax the blocklist a
 * rung at a time - first the personal budget, then repeats - so the last seasons still
 * ask you something.
 */
function openStep(run) {
  const context = eventContext(run);
  const event =
    drawEvent(run.state.seed, run.step, blockedEventIds(run), context) ??
    drawEvent(run.state.seed, run.step, run.usedEventIds, context) ??
    drawEvent(run.state.seed, run.step, [], context) ??
    // Last resort: ignore the weights entirely. Reachable only if every card in the
    // catalogue gated itself out, which the fixed-weight cards make unlikely - but a
    // career must always have something to ask.
    EVENTS[Math.floor(createStream(run.state.seed, "event", "fallback", run.step)() * EVENTS.length)];
  const injury =
    run.injuries.length < MAX_INJURIES ? drawInjury(run.state.seed, run.step) : null;
  return {
    ...run,
    phase: PHASES.EVENT,
    event,
    injury,
    seasonResults: [],
    matchday: null,
    deal: null,
    signing: null,
  };
}

/* ── The office ───────────────────────────────────────────────────────────── */

/**
 * Open talks over one offer.
 *
 * Leverage is worked out once, here, from the same delta the rest of the game turns on
 * plus whatever the crowd at this club already thinks of you. It is the only thing you
 * bring to the table, and at sixteen it is close to nothing - which is the honest answer.
 */
function openNegotiation(run, clubId, { youth = false } = {}) {
  const offer = run.offers.find((candidate) => candidate.clubId === clubId);
  const club = run.world.clubs[clubId];
  if (!offer || !club) return run;

  const competition = run.world.competitions[club.competitionId] ?? null;
  const stay = Boolean(offer.stay) || clubId === run.state.clubId;
  const idolatryHere = idolatryAt(run.state.idolatry, clubId);

  const terms = openingTerms({
    seed: run.state.seed,
    season: run.season,
    clubId,
    reputation: club.international_reputation ?? 0,
    // The league and the division are half of what a contract is: the same club one tier
    // down, or three confederations away, is not offering the same deal.
    strength: competition?.strength ?? 2,
    tier: competition?.tier ?? 1,
    projectedDelta: offer.projectedDelta ?? 0,
    age: run.state.age,
    value: run.state.value,
    seasonsAtClub: stay ? run.state.seasonsAtClub : 0,
    idolatryHere,
    stay,
  });

  return {
    ...run,
    phase: PHASES.NEGOTIATION,
    deal: {
      clubId,
      stay,
      youth,
      exit: offer.exit ?? null,
      opening: terms,
      terms,
      leverage: leverageFor({
        projectedDelta: offer.projectedDelta ?? 0,
        idolatryHere,
        ovr: run.state.ovr,
        stay,
      }),
      round: 0,
      used: [],
      last: null,
    },
  };
}

/** Every ask still on the table, with the odds it is granted printed on it. */
export function availableAsks(run) {
  const deal = run.deal;
  if (!deal || deal.round >= CONTRACT.maxAsks) return [];
  return ASKS.filter((ask) => !deal.used.includes(ask.id)).map((ask) => ({
    id: ask.id,
    icon: ask.icon,
    odds: askOdds(ask, deal.leverage),
  }));
}

/**
 * Put one ask to the club. Granted, the terms move; refused, it still costs you standing,
 * because you have shown your hand and been told no.
 */
export function askFor(run, askId) {
  const deal = run.deal;
  if (run.phase !== PHASES.NEGOTIATION || !deal) return run;
  if (deal.round >= CONTRACT.maxAsks || deal.used.includes(askId)) return run;

  const result = negotiate({
    seed: run.state.seed,
    clubId: deal.clubId,
    round: deal.round,
    terms: deal.terms,
    leverage: deal.leverage,
    askId,
  });
  if (!result) return run;

  return {
    ...run,
    deal: {
      ...deal,
      terms: result.terms,
      leverage: result.leverage,
      round: deal.round + 1,
      used: [...deal.used, askId],
      last: { askId, granted: result.granted, odds: result.odds },
    },
  };
}

/** Stop talking and put it in writing. */
export function agreeTerms(run) {
  if (run.phase !== PHASES.NEGOTIATION || !run.deal) return run;
  return {
    ...run,
    phase: PHASES.SIGNING,
    signing: { ...run.deal, contract: sign(run.deal.terms, run.season) },
  };
}

/** Walk away from the table and go back to the offers. */
export function cancelNegotiation(run) {
  if (run.phase !== PHASES.NEGOTIATION) return run;
  return { ...run, phase: run.deal?.youth ? PHASES.YOUTH : PHASES.MARKET, deal: null };
}

export function startCareer({ seed, surname, number, foot, country, position, mode }, world) {
  const state = createCareer({ seed, surname, number, foot, country, position, mode });
  return {
    phase: PHASES.YOUTH,
    state,
    world,
    shadow: simulateShadowCareer(seed, world),
    offers: youthOffers(seed, state, world, 3),
    season: 0,
    step: 0,
    firstClubId: null,
    usedEventIds: [],
    personalEventsSeen: 0,
    lastPersonalStep: -Infinity,
    injuries: [],
    event: null,
    injury: null,
    seasonResults: [],
    matchday: null,
    deal: null,
    signing: null,
    nationalityChoices: null,
    summary: null,
    comparison: null,
    verdict: null,
  };
}

/**
 * Pick the club that starts the career. It does not sign you yet - even a sixteen-year-old
 * gets a table and a contract, and finding out he has nothing to ask for with is the first
 * thing this game teaches him.
 */
export function signYouthClub(run, clubId) {
  if (run.phase !== PHASES.YOUTH) return run;
  return openNegotiation(run, clubId, { youth: true });
}

/**
 * Resolve the decision card. The event's own `resolve` owns the odds - we only fold the
 * effects in and honour the flags it sets, so the card really is the contract.
 */
export function resolveEvent(run, optionId, locale = "es") {
  if (run.phase !== PHASES.EVENT || !run.event) return run;
  const event = run.event;
  const next = createStream(run.state.seed, "resolve", event.id, run.step);
  const { effects, outcome } = event.resolve(next, optionId);

  let state = applyEffects(run.state, effects);

  // The injury is not a decision: it is applied alongside whatever you chose.
  if (run.injury) {
    state = applyEffects(state, { ovr: run.injury.ovr, matchesDelta: run.injury.matches });
  }

  // Going home closes the circle now, so the season you play is played there.
  if (state.returnToFirstClub && run.firstClubId) {
    state = { ...state, clubId: run.firstClubId, seasonsAtClub: 0, returnToFirstClub: false };
  }
  // Tearing up the contract does not skip the season, it removes "stay" from the summer
  // market. It is kept as its own flag rather than folded into `clubWantsOut`, which
  // simulateSeason recomputes from the bench streaks and would therefore forget.

  return openMatchday(
    {
      ...run,
      state,
      usedEventIds: [...run.usedEventIds, event.id],
      personalEventsSeen: run.personalEventsSeen + (event.theme === "personal" ? 1 : 0),
      lastPersonalStep: event.theme === "personal" ? run.step : run.lastPersonalStep,
      injuries: run.injury ? [...run.injuries, { ...run.injury, step: run.step }] : run.injuries,
      lastChoice: { eventId: event.id, optionId, outcome },
    },
    locale,
  );
}

/* ── The three matches ────────────────────────────────────────────────────── */

/**
 * What `seasonFixtures` needs to know to pick the matches this season is really about.
 *
 * Reputation goes in as a function rather than a number because the fixture list asks
 * about the domestic and the continental standing separately, and an elite player lifts
 * a small club one rung in both.
 */
function fixtureContext(run) {
  const { state, world } = run;
  const club = world.clubs[state.clubId] ?? null;
  const competition = club ? world.competitions[club.competitionId] ?? null : null;
  const country = world.countries[state.country] ?? null;
  const threshold = CALLUP_THRESHOLD[country?.international_reputation ?? 0] ?? 99;
  // The same OVR the season will be simulated at, temporary modifiers included, so the
  // odds being split are the odds that will actually be rolled.
  const ovr = state.ovr + (state.modifiers?.ovrTemp ?? 0);

  return {
    seed: state.seed,
    season: run.season,
    club,
    competition,
    country,
    ovr,
    age: state.age,
    delta: club ? ovr - squadLevelFor(club, ovr) : 0,
    effectiveReputation: (key) => (club ? effectiveReputation(club, ovr, key) : 0),
    calledUp: state.ovr >= threshold,
    rivals: club ? derbyRivals(world, club.id) : [],
    // Whatever the card the player just took did to this season's odds. It is already in
    // `state.modifiers`, and the split has to be made against the odds it left behind.
    titleMultipliers: state.modifiers?.titleMultipliers ?? {},
  };
}

const shotAt = (run, fixtures, index) =>
  shotFor({
    seed: run.state.seed,
    season: run.season,
    fixture: fixtures[index],
    ovr: run.state.ovr,
  });

/**
 * Fold the fixture plan and the shots into the season's modifiers.
 *
 * `plan` is what the draw already decided - which rolls the deciders replaced, scaled so
 * the year still averages out to what the model always gave. Multipliers compound rather
 * than overwrite, so a card that made the continental likelier and a fixture that scaled
 * it back both count; overwriting would silently throw one of them away.
 */
function withMatchEffects(modifiers = {}, plan = {}, results = []) {
  const effects = results.length ? matchEffects(results) : {};
  const multipliers = { ...(modifiers.titleMultipliers ?? {}) };
  for (const source of [plan.titleMultipliers, effects.titleMultipliers]) {
    for (const [trophy, value] of Object.entries(source ?? {})) {
      multipliers[trophy] = (multipliers[trophy] ?? 1) * value;
    }
  }
  return { ...modifiers, ...plan, ...effects, titleMultipliers: multipliers };
}

/**
 * Play one season, with whatever the player did in its big matches folded in first, and
 * write its headline - because a row of numbers is not a story.
 */
function playSeason(run, plan, matchResults, locale) {
  const season = run.season;
  const previous =
    run.seasonResults[run.seasonResults.length - 1]?.record ??
    run.state.history[run.state.history.length - 1];

  const state = {
    ...run.state,
    modifiers: {
      ...withMatchEffects(run.state.modifiers, plan, matchResults),
      // A role promised in the contract, honoured in the first season of the deal.
      ...contractModifiers(run.state.contract),
    },
  };
  const { state: nextState, record } = simulateSeason(state, run.world, { season });

  // What the season was worth to this club's crowd. Folded in here rather than in the
  // engine because idolatría spans a career, and simulateSeason only knows a season.
  const club = run.world.clubs[record.clubId];
  const competition = club ? run.world.competitions[club.competitionId] : null;
  const wonTitleHere = Boolean(nextState.titleClubs?.[record.clubId]) || record.titles.length > 0;
  const before = idolatryAt(state.idolatry, record.clubId);
  // What you were paid, against the role you turned out to play. The only place money
  // touches the model, and it touches the stand rather than the football.
  const pressure =
    state.contract?.clubId === record.clubId ? wagePressure(state.contract, record.role) : 0;
  const gained = seasonIdolatry({
    record,
    seasonsAtClub: state.seasonsAtClub,
    abroad: Boolean(competition && competition.country_fifa_code !== state.country),
    debut: state.seasonsAtClub === 0,
    wagePressure: pressure,
  });
  const after = applyIdolatry(before, gained, {
    wonTitleHere,
    betrayed: Boolean(state.betrayed?.[record.clubId]),
  });

  record.idolatry = { before, after, change: after - before, level: levelOf(after).key };
  // The record is already in `nextState.history` by reference, so the season keeps the
  // shots that decided it - and what the wage cost it - wherever it is read from later.
  record.bigMatches = matchResults;
  record.wagePressure = pressure;
  record.wage = state.contract?.clubId === record.clubId ? state.contract.wage : null;

  const result = {
    record,
    headline: headlineFor({ record, previous, state, world: run.world, locale }),
    shadowNote: shadowNoteFor({
      shadow: run.shadow,
      age: record.age,
      record,
      world: run.world,
      locale,
    }),
  };

  return {
    ...run,
    state: {
      ...nextState,
      // A season off the deal. At zero you are a free agent still wearing the shirt.
      contract: tickContract(nextState.contract),
      idolatry: { ...nextState.idolatry, [record.clubId]: after },
      titleClubs: wonTitleHere
        ? { ...nextState.titleClubs, [record.clubId]: true }
        : nextState.titleClubs,
    },
    season: season + 1,
    seasonResults: [...run.seasonResults, result],
  };
}

/**
 * Open the matches of the next season in this step, or close the step if there are none
 * left to play.
 *
 * A season with nothing on the line - and a season spent serving a ban - is simulated
 * straight through, so the phase only ever opens on a match that actually exists.
 */
function openMatchday(run, locale = "es") {
  let current = run;
  const seasons = modeOf(current.state.mode).seasonsPerStep;

  // Terminates: every turn of the loop that does not return appends a season result.
  while (
    current.seasonResults.length < seasons &&
    !current.state.retired &&
    current.state.age < RETIREMENT_AGE
  ) {
    // A ban is served, not played: no shots, and the plan that goes with them is dropped
    // so the season is rolled exactly as it would have been.
    const plan = current.state.modifiers?.suspended
      ? { fixtures: [], modifiers: {} }
      : seasonFixtures(fixtureContext(current));

    if (plan.fixtures.length) {
      return {
        ...current,
        phase: PHASES.MATCH,
        matchday: {
          season: current.season,
          fixtures: plan.fixtures,
          plan: plan.modifiers,
          index: 0,
          results: [],
          shot: shotAt(current, plan.fixtures, 0),
          last: null,
        },
      };
    }
    current = playSeason(current, plan.modifiers, [], locale);
  }

  return { ...current, phase: PHASES.SEASON, matchday: null, played: true };
}

/**
 * Commit to a placement.
 *
 * The result is held rather than applied: the keeper's position is only revealed once you
 * cannot change your mind, and the player gets to read it before the next fixture opens.
 */
export function takeShot(run, choice) {
  if (run.phase !== PHASES.MATCH || !run.matchday || run.matchday.last) return run;
  const { fixtures, index, shot } = run.matchday;
  if (!shot.options.includes(choice)) return run;

  const fixture = fixtures[index];
  return {
    ...run,
    matchday: {
      ...run.matchday,
      last: {
        ...resolveShot(shot, choice),
        decides: fixture.decides,
        national: fixture.national,
        opponentId: fixture.opponentId ?? null,
        // A semi-final carries the odds its two outcomes leave the final on.
        multipliers: fixture.multipliers ?? null,
      },
    },
  };
}

/**
 * Move on from a shot already taken: the next fixture, or the season those shots just
 * decided.
 */
export function nextFixture(run, locale = "es") {
  if (run.phase !== PHASES.MATCH || !run.matchday?.last) return run;
  const { fixtures, index, results, last } = run.matchday;
  const played = [...results, last];

  if (index + 1 < fixtures.length) {
    return {
      ...run,
      matchday: {
        ...run.matchday,
        index: index + 1,
        results: played,
        shot: shotAt(run, fixtures, index + 1),
        last: null,
      },
    };
  }
  return openMatchday(playSeason(run, run.matchday.plan, played, locale), locale);
}

/**
 * Countries that would actually call you up, for the passport event. Offering federations
 * whose threshold you cannot meet would make the switch a trap rather than a choice.
 */
function nationalityChoicesFor(run) {
  const { state, world } = run;
  const eligible = Object.values(world.countries).filter((country) => {
    if (country.fifa === state.country) return false;
    const threshold = CALLUP_THRESHOLD[country.international_reputation ?? 0] ?? 99;
    return state.ovr >= threshold;
  });
  if (!eligible.length) return null;

  const next = createStream(state.seed, "nationality", run.step);
  const picked = [];
  const seen = new Set();
  let guard = 0;
  while (picked.length < NATIONALITY_CHOICES && guard < NATIONALITY_CHOICES * 40) {
    guard += 1;
    const country = pickWeighted(next, eligible, (c) => 1 + (c.fifa_reputation ?? 0) * 2);
    if (!country || seen.has(country.fifa)) continue;
    seen.add(country.fifa);
    picked.push(country.fifa);
  }
  return picked.length ? picked : null;
}

/**
 * How many clubs come looking, which is the buy-out clause doing its job.
 *
 * A clause is not a price the player pays; it is how hard he is to reach. Argue it down
 * at signing and one more door opens every summer after - which is why the cheap ask is
 * worth as much as the loud one.
 */
function suitorsFor(run) {
  const contract = run.state.contract;
  if (!isUnderContract(contract, run.state.clubId)) return 4;
  const ratio = contract.clause / Math.max(1, run.state.value);
  if (ratio <= 2.5) return 4;
  if (ratio >= 9) return 2;
  return 3;
}

/**
 * Nobody signs a player nobody wants, but a career cannot dead-end either: if the market
 * has nothing, fall back to the small clubs at home, which is where that player really goes.
 */
function offersWithFallback(run) {
  // The two ways you can end up without a "stay" option: the club has had enough of you,
  // or you walked out on it. A contract still running answers the first one - that is what
  // the years on it are for - but not the second, because you were the one who left.
  const locked = isUnderContract(run.state.contract, run.state.clubId);
  const marketState = {
    ...run.state,
    clubWantsOut: Boolean(run.state.forceTransfer) || (!locked && run.state.clubWantsOut),
  };
  const offers = buildOffers(run.state.seed, run.season, marketState, run.world, suitorsFor(run));
  if (offers.length) return offers;

  const fallback = youthOffers(`${run.state.seed}:fallback:${run.season}`, run.state, run.world, 2);
  const current = marketState.clubWantsOut ? null : run.world.clubs[run.state.clubId];
  if (!fallback.length && current) {
    return [
      {
        clubId: current.id,
        competitionId: current.competitionId,
        stay: true,
        projectedDelta: run.state.ovr - squadLevelFor(current, run.state.ovr),
      },
    ];
  }
  return fallback;
}

/**
 * Attach what signing each offer would cost you in idolatría. This is the half of the
 * system the genre normally hides: a loyalty tax you cannot see before you pay it is a
 * gotcha, and the rest of this game is built on telling you the number first.
 */
function withExitCost(run, offers) {
  const current = run.world.clubs[run.state.clubId] ?? null;
  return offers.map((offer) => {
    if (offer.stay || offer.clubId === run.state.clubId) return offer;
    return {
      ...offer,
      exit: exitPreview({
        idolatry: run.state.idolatry,
        clubId: run.state.clubId,
        seasonsAtClub: run.state.seasonsAtClub,
        sameCompetition:
          Boolean(current) && offer.competitionId === current.competitionId,
        // Years still to run on the deal you would be tearing up.
        breachYears: isUnderContract(run.state.contract, run.state.clubId)
          ? run.state.contract.yearsLeft
          : 0,
      }),
    };
  });
}

/** Close the step: either the career is over, or the summer market opens. */
export function openMarket(run, locale = "es") {
  if (run.state.retired || run.state.age >= RETIREMENT_AGE) return retire(run, locale);
  return {
    ...run,
    phase: PHASES.MARKET,
    offers: withExitCost(run, offersWithFallback(run)),
    outlook: developmentOutlook(run.state),
    nationalityChoices: run.state.pendingCountryChange ? nationalityChoicesFor(run) : null,
  };
}

/** Take the passport. Only reachable when an event put it on the table. */
export function switchNationality(run, fifa) {
  if (run.phase !== PHASES.MARKET || !run.state.pendingCountryChange) return run;
  return {
    ...run,
    state: { ...run.state, country: fifa, pendingCountryChange: false },
    nationalityChoices: null,
  };
}

/** Take an offer to the table. Nothing is signed until the terms are agreed. */
export function acceptOffer(run, clubId) {
  if (run.phase !== PHASES.MARKET) return run;
  return openNegotiation(run, clubId);
}

/**
 * Put your name on it. This is where the career actually moves: the crowd you are walking
 * out on is charged the price that was on the card, and the deal you argued for becomes
 * the deal the model reads for the next few seasons.
 */
export function completeSigning(run) {
  if (run.phase !== PHASES.SIGNING || !run.signing) return run;
  const { clubId, youth, exit, contract } = run.signing;

  if (youth) {
    const state = { ...run.state, clubId, contract, seasonsAtClub: 0 };
    return openStep({ ...run, state, firstClubId: clubId, offers: [] });
  }

  const staying = clubId === run.state.clubId;
  const leaving = run.state.clubId != null && !staying;

  let idolatry = run.state.idolatry;
  let betrayed = run.state.betrayed;
  if (leaving && exit) {
    const from = run.state.clubId;
    idolatry = {
      ...idolatry,
      [from]: applyIdolatry(idolatryAt(idolatry, from), exit.change, {
        wonTitleHere: Boolean(run.state.titleClubs?.[from]),
        betrayed: exit.betrayal || Boolean(betrayed?.[from]),
      }),
    };
    if (exit.betrayal) betrayed = { ...betrayed, [from]: true };
  }

  const state = {
    ...run.state,
    clubId,
    contract,
    idolatry,
    betrayed,
    seasonsAtClub: staying ? run.state.seasonsAtClub : 0,
    clubWantsOut: false,
    forceTransfer: false,
    pendingCountryChange: false,
  };
  return openStep({ ...run, state, step: run.step + 1, offers: [], outlook: null });
}

export function retire(run, locale = "es") {
  const peak = peakIdolatry(run.state.idolatry);
  const club = peak ? run.world.clubs[peak.clubId] ?? null : null;
  const idolatry = peak
    ? {
        clubId: peak.clubId,
        clubName: club?.shortName ?? club?.name ?? "",
        value: Math.round(peak.value),
        level: levelOf(peak.value).key,
        clubs: Object.entries(run.state.idolatry)
          .map(([clubId, value]) => ({
            clubId,
            value: Math.round(value),
            level: levelOf(value).key,
            name: run.world.clubs[clubId]?.shortName ?? run.world.clubs[clubId]?.name ?? "",
            betrayed: Boolean(run.state.betrayed?.[clubId]),
          }))
          .sort((a, b) => b.value - a.value),
      }
    : null;

  const summary = { ...careerSummary(run.state), idolatry };
  return {
    ...run,
    phase: PHASES.RETIRED,
    summary,
    comparison: shadowComparison(run.shadow, summary),
    verdict: retirementVerdict({ summary, locale }),
  };
}

/**
 * What the header shows: who you are right now, in the terms the game is played in.
 */
export function currentStanding(run) {
  const club = run.world.clubs[run.state.clubId] ?? null;
  const competition = club ? run.world.competitions[club.competitionId] ?? null : null;
  const idolatry = idolatryAt(run.state.idolatry, run.state.clubId);
  const contract = run.state.contract?.clubId === run.state.clubId ? run.state.contract : null;
  return {
    club,
    competition,
    country: run.world.countries[run.state.country] ?? null,
    squadLevel: club ? squadLevelFor(club, run.state.ovr) : null,
    delta: club ? run.state.ovr - squadLevelFor(club, run.state.ovr) : null,
    seasonsLeft: Math.max(0, RETIREMENT_AGE - run.state.age),
    idolatry: club ? { value: Math.round(idolatry), level: levelOf(idolatry).key } : null,
    contract,
    // What the shirt is currently expected to be worth, in role terms.
    wageExpectation: contract
      ? wagePressure(contract, run.state.lastRole ?? contract.wageRole)
      : 0,
  };
}
