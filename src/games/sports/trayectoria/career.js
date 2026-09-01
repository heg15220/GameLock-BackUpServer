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
 *          ├─▶ NEGOTIATION ─▶ SIGNING ─▶ EVENT ─▶ MATCH ─▶ TOURNAMENT ─▶ SEASON ─▶ MARKET ─┐
 *   MARKET ┘                              ▲   └── one per season ──┤                       │
 *                                         └───────────────────────────────────────────────┘
 *                                                                              └──▶ RETIRED
 *
 * TOURNAMENT only opens in a season whose side reached the last sixteen of a continental
 * cup or a World Cup; every other year goes straight from the last decider to the report.
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
  FIXTURE_KINDS,
  PRODUCES,
  TOURNAMENT_NIGHTS,
  conversionRate,
  derbyRivals,
  matchEffects,
  resolveShot,
  seasonFixtures,
  shotFor,
} from "./bigmatch.js";
import { keeperDifficulty, keeperMemory, rememberShot } from "./keeper.js";
import { MODES, modeFor, playsRound } from "./matchmode.js";
import { TRUST, applyTrust, settleTrust, toneEffect, trustAt } from "./tone.js";
import { CHANCE_MECHANIC, buildChance, judgeChance } from "./minigames.js";
import { narrateFinish, narrateMatch, narrateTie } from "./narration.js";
import {
  ASKS,
  CONTRACT,
  askAvailable,
  askOdds,
  clauseOdds,
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
  clubStanding,
  createCareer,
  developmentOutlook,
  effectiveReputation,
  growthFactor,
  NATIONAL_TROPHIES,
  roleFor,
  rollNationalTitle,
  rollPromotion,
  rollRelegation,
  rollTitle,
  seasonLatent,
  simulateLeagueTable,
  simulateSeason,
  squadLevelFor,
  youthOffers,
} from "./engine.js";
import { EVENTS, MAX_INJURIES, applyEffects, drawEvent, drawInjury } from "./events.js";
import {
  IDOLATRY,
  applyIdolatry,
  exitPreview,
  idolatryAt,
  levelOf,
  patienceFor,
  peakIdolatry,
  seasonIdolatry,
} from "./idolatry.js";
import { headlineFor, retirementVerdict, shadowNoteFor } from "./press.js";
import { chance, createStream, pickWeighted } from "./rng.js";
import { shadowComparison, simulateShadowCareer } from "./rival.js";
import { entrantsFor } from "./qualified.js";
import {
  TOURNAMENTS,
  LIVE_ROUNDS,
  continentalQualification,
  isLiveRound,
  matchInertia,
  playerPull,
  simulateTournamentRun,
  tournamentFor,
  whenOf,
} from "./tournaments.js";
import {
  CALLUP_THRESHOLD,
  CAREER_MODES,
  CLUB_MATCH_MULTIPLIER,
  CONTINENTAL_CYCLE,
  RETIREMENT_AGE,
  WORLD_CUP_CYCLE,
} from "./tables.js";

export const PHASES = {
  YOUTH: "youth",
  NEGOTIATION: "negotiation",
  SIGNING: "signing",
  EVENT: "event",
  MATCH: "match",
  /**
   * The knockout nights of a continental cup or a World Cup, from the last sixteen on.
   *
   * MATCH is the phase where the player decides something. This is the phase where his side
   * does: the bracket has already been simulated by the time it opens - see
   * `simulateTournamentRun` - and every tie in the queue plays out live with nothing to
   * press. It sits between MATCH and SEASON because that is when it happens: the ties are a
   * thing the season did, and the report is the morning after.
   */
  TOURNAMENT: "tournament",
  SEASON: "season",
  MARKET: "market",
  RETIRED: "retired",
};

/** Personal events read as punctuation, so they are rationed and never back to back. */
const PERSONAL_COOLDOWN_STEPS = 2;
const NATIONALITY_CHOICES = 3;

const modeOf = (mode) => CAREER_MODES[mode] ?? CAREER_MODES.intensa;

/**
 * The club as this run has left it, not as the data pinned it. Everything in this file
 * that asks "which club, which league" goes through here, so a side the player took up
 * or sent down stays up or down for the rest of the career.
 */
const standingOf = (run, clubId = run.state.clubId) =>
  clubStanding(run.world, run.world.clubs[clubId] ?? null, run.state.divisions);

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
  const { club, competition } = standingOf(run);
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
 * Draw one card for a given slot of the step.
 *
 * A long career in `intensa` can outlast the catalogue, and state-dependent weights can
 * empty the pool on their own. Rather than end the game early we relax the blocklist a
 * rung at a time - first the personal budget, then repeats - so the last seasons still
 * ask you something.
 */
function drawFor(run, slot) {
  const context = eventContext(run);
  return (
    drawEvent(run.state.seed, run.step, blockedEventIds(run), context, slot) ??
    drawEvent(run.state.seed, run.step, run.usedEventIds, context, slot) ??
    drawEvent(run.state.seed, run.step, [], context, slot) ??
    // Last resort: ignore the weights entirely. Reachable only if every card in the
    // catalogue gated itself out, which the fixed-weight cards make unlikely - but a
    // career must always have something to ask.
    EVENTS[
      Math.floor(
        createStream(run.state.seed, "event", "fallback", run.step, slot)() * EVENTS.length,
      )
    ]
  );
}

/**
 * Open the next decision, plus an injury if this is the year it happens.
 *
 * The step owes as many cards as it covers seasons (see CAREER_MODES). They are dealt one
 * at a time rather than up front, because what the next card is allowed to be depends on
 * what you have just been asked: the blocklist reads `usedEventIds`, the personal budget
 * and the personal cooldown, and all three move as each card is answered. Drawing three
 * at once would let a step hand you two personal cards in a row, which is the one thing
 * the cooldown exists to prevent.
 */
function openStep(run) {
  const injury =
    run.injuries.length < MAX_INJURIES ? drawInjury(run.state.seed, run.step) : null;
  return {
    ...run,
    phase: PHASES.EVENT,
    event: drawFor(run, 0),
    // How many more this step still owes after the one on screen.
    eventsLeft: Math.max(0, (modeOf(run.state.mode).eventsPerStep ?? 1) - 1),
    injury,
    seasonResults: [],
    matchday: null,
    tournament: null,
    deal: null,
    signing: null,
    clauseOffer: null,
    refusedClause: null,
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
    // The first deal a career signs is always a single season. See openingTerms.
    youth,
    /*
     * And how long a season has to be to mean anything. A contract's whole job is done at
     * the market, the market opens once a step, and a step is three seasons in exprés - so
     * the mode is what decides whether "un año" is a promise or a formality. See
     * CONTRACT.stepUp.
     */
    seasonsPerStep: modeOf(run.state.mode).seasonsPerStep,
  });

  return {
    ...run,
    phase: PHASES.NEGOTIATION,
    deal: {
      clubId,
      stay,
      youth,
      exit: offer.exit ?? null,
      // Carried to the signing, where it is the difference between an ordinary departure
      // and one the crowd charges a season of breach for.
      clausePaid: Boolean(offer.clausePaid),
      fee: offer.fee ?? null,
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

/**
 * Every ask still on the table, with the odds it is granted printed on it.
 *
 * An ask that cannot apply to this deal is not shown at all rather than shown at zero: on
 * a one-year contract there is no shorter deal to sign and no buy-out worth arguing over,
 * and offering both anyway taught the player that half the office is decoration.
 */
export function availableAsks(run) {
  const deal = run.deal;
  if (!deal || deal.round >= CONTRACT.maxAsks) return [];
  return ASKS.filter((ask) => !deal.used.includes(ask.id) && askAvailable(ask, deal.terms)).map(
    (ask) => ({
      id: ask.id,
      icon: ask.icon,
      odds: askOdds(ask, deal.leverage, deal.terms),
    }),
  );
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
    tournament: null,
    deal: null,
    signing: null,
    clauseOffer: null,
    refusedClause: null,
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

  /*
   * WHAT IT COST TO SAY IT THAT WAY.
   *
   * The card's own `effects` are what was DECIDED - the clause moved, the manager was
   * backed. This is what was heard. A press room has two audiences and they very often want
   * opposite things (see tone.js), so the same answer that has the stand singing your name
   * is the one the board reads over breakfast and remembers in June.
   *
   * Folded in here rather than inside `resolve` because every card would otherwise have to
   * remember to do it, and the one that forgot would be the one nobody noticed.
   */
  const tone = event.tones?.[optionId] ?? null;
  const heard = tone ? toneEffect(tone, event.room ?? {}) : { idolatry: 0, trust: 0 };

  let state = applyEffects(run.state, effects);
  if (tone) {
    state = {
      ...applyEffects(state, { idolatry: heard.idolatry }),
      trust: applyTrust(trustAt(state), heard.trust),
      // What he said and how, so the season page can say why the board went cold.
      saidLately: [...(state.saidLately ?? []), { step: run.step, tone, ...heard }].slice(-8),
    };
  }

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

  const answered = {
    ...run,
    state,
    usedEventIds: [...run.usedEventIds, event.id],
    personalEventsSeen: run.personalEventsSeen + (event.theme === "personal" ? 1 : 0),
    lastPersonalStep: event.theme === "personal" ? run.step : run.lastPersonalStep,
    injuries: run.injury ? [...run.injuries, { ...run.injury, step: run.step }] : run.injuries,
    // Applied above, alongside the first answer of the step. It is one injury per step,
    // not one per card, so it is cleared as soon as it has landed.
    injury: null,
    lastChoice: { eventId: event.id, optionId, outcome },
  };

  // The step is not over until it has asked everything it owes. The next card is drawn
  // now rather than earlier, so it can see what this one just did.
  const left = run.eventsLeft ?? 0;
  if (left > 0) {
    const perStep = modeOf(run.state.mode).eventsPerStep ?? 1;
    return {
      ...answered,
      phase: PHASES.EVENT,
      event: drawFor(answered, perStep - left),
      eventsLeft: left - 1,
    };
  }

  return openMatchday({ ...answered, eventsLeft: 0 }, locale);
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
  const { club, competition } = standingOf(run);
  const country = world.countries[state.country] ?? null;
  const threshold = CALLUP_THRESHOLD[country?.international_reputation ?? 0] ?? 99;
  // The same OVR the season will be simulated at, temporary modifiers included, so the
  // odds being split are the odds that will actually be rolled.
  const ovr = state.ovr + (state.modifiers?.ovrTemp ?? 0);
  const previous = state.history?.[state.history.length - 1] ?? null;
  const previousAtClub = previous?.clubId === club?.id ? previous : null;
  const continentalEntry = continentalQualification({
    position: previousAtClub?.position ?? null,
    confederation: competition?.confederation,
    tier: competition?.tier ?? 1,
    wonMain: Boolean(previousAtClub?.titles?.some((title) => title.trophy === "continental_a")),
    wonCup: Boolean(previousAtClub?.titles?.some((title) => title.trophy === "cup")),
    reputation: club ? effectiveReputation(club, ovr, "continental") : 0,
  });
  const delta = club ? ovr - squadLevelFor(club, ovr) : 0;
  const leagueTable = club
    ? simulateLeagueTable({
        seed: state.seed,
        season: run.season,
        world,
        club,
        competition,
        ovr,
        delta,
        latent: seasonLatent(state.seed, run.season),
      })
    : [];

  return {
    seed: state.seed,
    season: run.season,
    // The fixture list now draws opponents as well as fixtures, so it needs the clubs.
    world,
    club,
    competition,
    country,
    ovr,
    age: state.age,
    delta,
    effectiveReputation: (key) => (club ? effectiveReputation(club, ovr, key) : 0),
    calledUp: state.ovr >= threshold,
    rivals: club ? derbyRivals(world, club.id) : [],
    leagueTable,
    // What he has actually converted so far. Without this the split prices every decider
    // at what a blind guess is worth, and any skill above that quietly prints trophies.
    conversion: state.conversion,
    // Whatever the card the player just took did to this season's odds. It is already in
    // `state.modifiers`, and the split has to be made against the odds it left behind.
    titleMultipliers: state.modifiers?.titleMultipliers ?? {},
    continentalEntry,
  };
}

/**
 * Set up one decider: the shot itself, then how it is going to be played.
 *
 * The mode is decided here rather than in `bigmatch.js` because it needs the shot type -
 * somebody takes the penalties - and because it changes nothing about the model. Both
 * ways out produce the same `scored`, and `conversionRate` measures whichever mix of the
 * two this career actually ended up playing.
 */
function shotAt(run, fixtures, index, attempt = 0, taken = []) {
  const fixture = fixtures[index];
  const shot = shotFor({
    seed: run.state.seed,
    season: run.season,
    fixture,
    ovr: run.state.ovr,
    // Which repertoire the night can draw from: a keeper is not handed one-on-ones to
    // finish, and a centre-back's decisive moment is mostly the one he stops.
    group: run.state.group,
    position: run.state.position,
    attempt,
    keeper: keeperFacing(run, fixture),
  });

  const { club } = standingOf(run);
  const delta = club ? run.state.ovr - squadLevelFor(club, run.state.ovr) : 0;
  const mode = modeFor({
    seed: run.state.seed,
    season: run.season,
    fixtureId: fixture.id,
    delta,
    role: run.state.lastRole,
    shotType: shot.type,
    // A night worth no sight of goal is watched whatever the roll would have said; there
    // is no moment to hand him. See modeFor.
    chances: fixture.chances ?? 1,
    // And how much football he has actually been playing, this season above the two behind
    // it. The same figure the bracket is drawn with - see `matchInertia`.
    inertia: inertiaOf(run.state),
  });

  /*
   * A CHANCE WITH NO GAME OF ITS OWN IS NEVER SKILL.
   *
   * The four that are a shot at a goal ask one question - which of the five zones - and
   * they are asked the same way whichever mode the roll came up with: a flick on a phone,
   * a button on a desktop. See CHANCE_MECHANIC and aim.jsx. Only the goalkeeper's four,
   * the through ball and the tackle still have a game to play.
   */
  const playable = Boolean(CHANCE_MECHANIC[shot.type]);


  return {
    ...shot,
    attempt,
    mode: playable ? mode : MODES.MATCH,
    // Only built for the mode that needs it, so a watched match costs nothing to set up.
    chance:
      playable && mode === MODES.SKILL
        ? buildChance({
            seed: run.state.seed,
            season: run.season,
            fixtureId: fixture.id,
            shotType: shot.type,
            ovr: run.state.ovr,
          })
        : null,
  };
}

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

  /**
   * Both multiplier maps have to COMPOUND rather than overwrite, and both have to survive
   * the spread below. `matchEffects` always returns the two keys - empty when no decider
   * of that kind fired - so a plain spread would wipe the residual scaling the draw put
   * on every trophy nobody played for, and hand those seasons their raw odds back.
   */
  const compound = (key) => {
    const merged = { ...(modifiers[key] ?? {}) };
    for (const source of [plan[key], effects[key]]) {
      for (const [trophy, value] of Object.entries(source ?? {})) {
        merged[trophy] = (merged[trophy] ?? 1) * value;
      }
    }
    return merged;
  };

  /*
   * The same problem one level up, and the same fix. A trophy answered by the bracket is
   * settled at PLAN time (see `stageTournaments`) and a trophy answered by a decider is
   * settled on the night, so both can be true in one season - and a plain spread let
   * whichever arrived second throw the other away, handing a cup that had already been
   * decided back to the dice.
   */
  const settledTitles = {
    ...(modifiers.settledTitles ?? {}),
    ...(plan.settledTitles ?? {}),
    ...(effects.settledTitles ?? {}),
  };

  return {
    ...modifiers,
    ...plan,
    ...effects,
    titleMultipliers: compound("titleMultipliers"),
    nationalMultipliers: compound("nationalMultipliers"),
    ...(Object.keys(settledTitles).length ? { settledTitles } : {}),
  };
}

/**
 * Play one season, with whatever the player did in its big matches folded in first, and
 * write its headline - because a row of numbers is not a story.
 */
function playSeason(run, plan, matchResults, locale, tournamentRuns = []) {
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
  /*
   * The brackets are handed IN rather than built here, and that is the whole reordering.
   * They were drawn after the fact - from the trophies this call was about to roll - which
   * is why the competition could only ever be narrated after the season, behind the final
   * the season had already played. They are drawn with the plan now. See `stageTournaments`.
   */
  const { state: nextState, record } = simulateSeason(state, run.world, {
    season,
    tournamentRuns,
  });

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
    // What the decisions of this step were worth to this stand. `state` is still the
    // pre-season one here, so the modifiers the cards wrote are readable; simulateSeason
    // has already cleared them on its way out.
    fromEvents: state.modifiers?.idolatry ?? 0,
  });
  const after = applyIdolatry(before, gained, {
    wonTitleHere,
    betrayed: Boolean(state.betrayed?.[record.clubId]),
  });

  record.idolatry = { before, after, change: after - before, level: levelOf(after).key };

  // Whether the club has had enough. `simulateSeason` decides this from the bench streaks
  // alone, because it does not know what the stand thinks; it is re-decided here, where we
  // do. A crowd's favourite is given more rope than a squad player - see `patienceFor`,
  // and OUR CALL #8 for why the shield had to move here from the contract.
  const limits = CAREER_MODES[state.mode] ?? CAREER_MODES.intensa;
  const patience = patienceFor(after);
  /*
   * AND WHETHER THE PEOPLE WHO PAY HIM STILL WANT HIM THERE.
   *
   * `benchStreak` is the football reason a club gives up on a player and it was the only
   * one. What a player SAYS is the other, and it is the one every dressing room actually
   * loses people over: a season of headlines nobody at the club asked for. `trust` carries
   * it - see tone.js - and it drifts back towards the middle every year, because a club
   * forgets faster than a crowd does and slower than the player would like.
   */
  const trust = settleTrust(trustAt(state));
  record.trust = { before: trustAt(state), after: trust };
  const clubWantsOut =
    nextState.benchStreak >= limits.benchLimit + patience ||
    nextState.lowRotationStreak >= limits.lowRotationLimit + patience ||
    trust < TRUST.breaking;
  record.patience = patience;
  // The record is already in `nextState.history` by reference, so the season keeps the
  // shots that decided it - and what the wage cost it - wherever it is read from later.
  record.bigMatches = matchResults;
  // The board's memory, one season older. Carried on the state so the next summer reads it.
  nextState.trust = trust;
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

  // Every chance he stood over this season, and how many he put away. Counted here rather
  // than in the engine because the engine never sees a shot - it is handed the result.
  // Counted per CHANCE, not per fixture: one decider can be worth three sights of goal
  // or none at all, and `conversionRate` is a rate over chances.
  const conversion = matchResults.reduce(
    (totals, result) => ({
      taken: totals.taken + (result.taken ?? 1),
      scored: totals.scored + (result.converted ?? (result.scored ? 1 : 0)),
    }),
    { taken: state.conversion?.taken ?? 0, scored: state.conversion?.scored ?? 0 },
  );
  record.conversion = conversion;

  return {
    ...run,
    state: {
      ...nextState,
      conversion,
      clubWantsOut,
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

/* ── The knockout nights ─────────────────────────────────────────────────────────
   From the last sixteen on, a continental run is watched rather than read. The bracket
   itself was simulated inside the season - `simulateTournamentRun` - so nothing here
   decides anything; this is the queue that turns its rounds into evenings, and the
   narration that plays them. See PHASES.TOURNAMENT.                                  */

/** What a side is called on a scoreboard, whether it is a club or a country. */
function displayName(world, id, locale) {
  const club = world?.clubs?.[id];
  if (club) return club.shortName ?? club.name ?? "";
  const country = world?.countries?.[id];
  if (country) return (locale === "en" ? country.name_en : country.name_es) ?? country.fifa ?? "";
  return "";
}

/**
 * Every tie of this season worth sitting through, in the order they were played.
 *
 * A round the bracket never reached is not in `run.rounds` at all, so a side that went out
 * in the play-off simply has no queue - which is the correct amount of ceremony for it.
 * The round the side was eliminated IN is very much in the queue: going out of a quarter
 * final is a night too, and a game that only narrates the ones you win is a highlights reel.
 */
export function liveTiesOf(run, record, locale = "es") {
  return tiesOf(run, record?.tournamentRuns ?? [], record?.clubId, record?.season ?? run.season, locale);
}

/**
 * The same list, from a set of runs that have not been folded into a record yet.
 *
 * Which is now the ordinary case: the brackets are built with the season's plan rather than
 * after it - see `stageTournaments` - so the ties exist before there is a record to hang
 * them on. `liveTiesOf` stays as the reader for a season already played.
 */
export function tiesOf(run, runs, clubId, season, locale = "es") {
  const ties = [];
  for (const tournament of runs ?? []) {
    if (!tournament) continue;
    const spec = TOURNAMENTS[tournament.id];
    const national = spec ? !spec.club : false;
    const ourId = national ? run.state.country : clubId;
    for (const round of tournament.rounds ?? []) {
      if (!round.live) continue;
      // The night he has not answered yet has no scoreline to narrate, and putting one on
      // the queue would be a broadcast of a match nobody has played.
      if (round.pending) continue;
      /*
       * And the night he DID answer is not queued either. He has just played it, with its
       * own ninety minutes and its own verdict; narrating the same round again immediately
       * afterwards is the exact duplication this whole reordering exists to remove - only
       * with the two halves the right way round instead of the wrong one.
       */
      if (round.decides) continue;
      const legScores = round.legScores?.length
        ? round.legScores
        : [{ us: round.score.us, them: round.score.them }];
      ties.push({
        id: `${season}-${tournament.id}-${round.round}`,
        season,
        tournamentId: tournament.id,
        round: round.round,
        legs: round.legs,
        national,
        ourId,
        opponentId: round.opponentId,
        ourName: displayName(run.world, ourId, locale) || round.opponent,
        theirName: displayName(run.world, round.opponentId, locale) || round.opponent,
        // The leg that settles it is the one that is played out; the other is what you
        // carried into it. See `narrateTie`.
        score: legScores[legScores.length - 1],
        firstLeg: legScores.length > 1 ? legScores[0] : null,
        aggregate: round.score,
        won: round.won,
        penalties: Boolean(round.penalties),
        extraTime: Boolean(round.extraTime),
        champion: Boolean(tournament.champion) && round.round === "final",
        // Which night of the season this is. A bracket is a run-up, so its rounds sit in
        // the weeks before the competition's own slot rather than all on one date.
        when: whenOf(tournament.when ?? 6, round.round),
        // A tie he answered himself is still watched afterwards - this is the replay of
        // the night, not a second asking of it.
        decided: Boolean(round.decides),
        // And whether he was in the side for it. See `roundOdds`.
        played: round.played ?? null,
      });
    }
  }
  return ties.sort((a, b) => a.when - b.when);
}

/** The tie at the head of the queue, built into ninety minutes. */
const broadcastFor = (run, tie) =>
  narrateTie({
    seed: `${run.state.seed}:${tie.id}`,
    round: tie.round,
    legs: tie.legs,
    ourName: tie.ourName,
    theirName: tie.theirName,
    score: tie.score,
    aggregate: tie.aggregate,
    firstLeg: tie.firstLeg,
    won: tie.won,
    penalties: tie.penalties,
    extraTime: tie.extraTime,
    // Whether he is in the side for this one, and what kind of footballer walks out if he
    // is. The tie is simulated either way; this is what puts him inside it - and what
    // gives him a share of the goals the night already had. See GOAL_SHARE.
    played: tie.played,
    group: run.state.group,
    ovr: run.state.ovr,
  });

/* -- The season, as one calendar --------------------------------------------------
   A season used to be told in two halves that did not know about each other. The three
   deciders were played first, straight off `seasonFixtures`; the season was then rolled;
   and only then were the knockout ties of the SAME season narrated. So a European Cup
   final was played in the first screen of the year and the last sixteen of that very
   edition in the fifth, followed by a second final free to disagree with the first.

   There is one queue now. The brackets are built with the plan, before a ball is kicked,
   and every night of the season - a tie his side plays and a night he decides himself -
   goes into it and is sorted by the calendar. See `whenOf` in tournaments.js.        */

/** Where each competition's final sits in the season, so its rounds can lead up to it. */
const CUP_WHEN = {
  continental_a: FIXTURE_KINDS.final_continental.when,
  world_cup: FIXTURE_KINDS.final_mundial.when,
  continental_nt: FIXTURE_KINDS.final_continental_nt.when,
};

/** When a night is played: a fixture has its own slot, a bracket round leads up to one. */
const whenOfNight = (night) =>
  night.round ? whenOf(CUP_WHEN[night.trophy] ?? 6, night.round) : FIXTURE_KINDS[night.kind].when;

/**
 * Which cups the player's side is actually in this season, and what each one is worth.
 *
 * Only the ones the model already grants: the club's continental place has to be `main`
 * (see `continentalQualification`), and a country only plays a finals tournament in the
 * year its cycle comes round. The Euro and the Copa America used to be in neither list -
 * there was no bracket for them at all, only the standalone final - so half the national
 * tournaments in the game existed as a single night and nothing else.
 */
function cupsFor(run, context) {
  const { state, world } = run;
  const { club, competition } = standingOf(run);
  const country = world.countries[state.country] ?? null;
  const cups = [];
  if (!club) return cups;

  if (context.continentalEntry?.level === "main") {
    const spec = tournamentFor({ confederation: competition?.confederation, club: true });
    if (spec) cups.push({ id: spec.id, trophy: "continental_a", national: false, side: club });
  }
  if (context.calledUp && country) {
    if (WORLD_CUP_CYCLE(state.age)) {
      cups.push({ id: "world_cup", trophy: "world_cup", national: true, side: country });
    }
    if (CONTINENTAL_CYCLE(state.age)) {
      const spec = tournamentFor({ confederation: country.confederation, club: false });
      if (spec) cups.push({ id: spec.id, trophy: "continental_nt", national: true, side: country });
    }
  }
  return cups;
}

/**
 * Build every bracket the season is going to play, BEFORE it is played.
 *
 * Two shapes come out of this, and the difference is whether the season handed the player a
 * night in that competition:
 *
 *  - A cup he DECIDES. The run is forced to reach his round (`reaches`) and stops dead
 *    there (`decidesAt`, with nothing answered yet). The ties in front of it are real and
 *    can be watched; the round itself and everything past it does not exist until he has
 *    taken it. `closeCup` finishes the job once he has.
 *  - A cup he does not. There is nobody to wait for, so the trophy is rolled here, with the
 *    same odds and the same modifiers the season would have used, and the whole bracket is
 *    built to agree with it. `rollTitles` then honours the answer instead of asking again -
 *    the rule `settleFinal` has followed for club cups since the ceremony started
 *    contradicting the scoreboard.
 */
function stageTournaments(run, plan, context, locale = "es") {
  const { state, world } = run;
  const nights = plan.tournaments ?? [];
  const settledTitles = {};
  const runs = [];

  // What he is worth to a bracket right now: the rating of this exact season, damped and
  // lifted by how much football he has been playing. See `playerPull`.
  const ovr = clampToOvr(state.ovr + (state.modifiers?.ovrTemp ?? 0));
  const previous = (state.history ?? []).slice(-3).reverse();
  const pull = playerPull({
    ovr,
    matches: previous[0]?.matches ?? 0,
    previous: previous.slice(1).map((entry) => entry.matches ?? 0),
  });

  const inertia = inertiaOf(state);
  const delta = deltaOf(run);

  for (const cup of cupsFor(run, context)) {
    const night = nights.find((entry) => entry.trophy === cup.trophy) ?? null;
    const base = {
      id: cup.id,
      seed: state.seed,
      season: run.season,
      entrants: entrantsFor(cup.id, world, { include: cup.side ? [cup.side] : [] }),
      player: cup.side,
      pull,
    };

    /*
     * WHICH OF THESE NIGHTS HE IS ACTUALLY IN.
     *
     * Not which he decides - the ties are simulated, and they stay simulated: a bracket is
     * a competition his side plays, and it plays whether or not the ball comes to him. Only
     * the night the season was PRICED on is his to answer, and that one comes from the
     * budget, as it always has.
     *
     * What is rolled here is the team sheet. A European run used to be narrated with the
     * player missing from it entirely - ninety minutes of his own quarter-final naming the
     * two clubs, the shots and the corners, and never him. So each round asks whether he is
     * in the eleven, off what he is rated right now and how much football he has been
     * playing: at the top he is in nearly all of them, a squad player is in almost none,
     * and a season spent injured takes them away. See `roundOdds`.
     */
    const path = LIVE_ROUNDS.filter(
      (round) => TOURNAMENTS[cup.id]?.knockout?.includes(round),
    );
    const plays = path.filter((round) =>
      playsRound({
        seed: state.seed,
        season: run.season,
        tournamentId: cup.id,
        round,
        delta,
        role: state.lastRole,
        inertia,
      }),
    );
    const decidesAt = night ? [night.round] : [];

    /*
     * The run carries its own terms. It is rebuilt from scratch every time he answers one
     * of its rounds - that is what keeps the ties already watched identical, see
     * `simulateTournamentRun` - so it has to remember what it was built with.
     */
    const terms = {
      when: CUP_WHEN[cup.trophy] ?? 6,
      trophy: cup.trophy,
      national: cup.national,
      decidesAt,
      plays,
      answers: {},
      // Which of his rounds carries the cup, so `closeCup` knows when to roll it.
      settlesAt: night ? night.round : null,
      reaches: night ? night.round : null,
    };

    const built = night
      ? simulateTournamentRun({ ...base, reaches: night.round, decidesAt, plays })
      : null;

    if (night) {
      // Unknown until he answers the night the cup is priced on.
      runs.push({ ...built, ...terms, championRoll: null });
      continue;
    }

    /*
     * Nobody is taking the trophy night, so the cup is rolled here - exactly as the season
     * would have - and the bracket is built to end the way the cabinet will say it ended.
     *
     * His earlier rounds still stand in front of it, and they are still his to lose: fail
     * one and the run is over, whatever the roll said. So a cup he was going to win and
     * then went out of in the quarter-final has to stop being a cup he won.
     */
    const modifiers = withMatchEffects(state.modifiers ?? {}, plan.modifiers ?? {}, []);
    const won = rollCup(run, cup.trophy, modifiers);
    settledTitles[cup.trophy] = won;
    runs.push({
      ...simulateTournamentRun({ ...base, champion: won, plays }),
      ...terms,
      championRoll: won,
    });
  }

  return { runs: runs.filter(Boolean), settledTitles };
}


/**
 * The same night, one chance later.
 *
 * Only the keeper moves. A fixture is one match: the kind of chance it produces and whether
 * it is played or called blind were settled when it opened and have no business changing
 * halfway through - rebuilding the whole shot turned the second of three penalties into a
 * free kick, and a minigame into a guess. What is rebuilt is the read: a new dive, drawn
 * for this attempt, with everything he has done tonight in the keeper's memory.
 */
function nextRead(run, fixture, played) {
  const shot = run.matchday.shot;
  const read = shotFor({
    seed: run.state.seed,
    season: run.season,
    fixture,
    ovr: run.state.ovr,
    group: run.state.group,
    position: run.state.position,
    attempt: played.length,
    keeper: keeperFacing(run, fixture),
  });
  return {
    ...shot,
    attempt: played.length,
    // Everything the keeper decides, and the coin the night turns on. All of it, or the
    // second chance is resolved against the first one's dive.
    keeperAt: read.keeperAt,
    roll: read.roll,
    gap: read.gap,
    ruledOut: read.ruledOut,
    keeper: read.keeper,
  };
}

/**
 * THE KEEPER THIS NIGHT PUTS IN FRONT OF HIM.
 *
 * Three things the model already knows and had never used: what the match is worth, who the
 * opposition are, and what this player has been converting. A World Cup final against the
 * strongest side in the draw, taken by a man who has scored his last six, is not the coin a
 * Sunday in November is - and until now it was exactly the same coin. See keeper.js.
 *
 * Tonight's attempts are the half of the memory that matters most - put the first one to
 * his left and he is standing there for the second - and they arrive through `state.shots`
 * like everything else he has seen.
 */
function keeperFacing(run, fixture) {
  const { world, state } = run;
  const opponent = fixture.opponentId
    ? world.clubs[fixture.opponentId] ?? world.countries[fixture.opponentId] ?? null
    : null;
  const reputation =
    opponent?.continental_reputation ??
    opponent?.international_reputation ??
    opponent?.fifa_reputation ??
    0;

  return {
    difficulty: keeperDifficulty({
      decides: fixture.decides,
      reputation,
      form: conversionRate(state.ovr, state.conversion),
    }),
    /*
     * COUNTED ONCE. `state.shots` is a rolling tail that `recordAttempt` appends to as each
     * chance is taken, so it ALREADY holds tonight's attempts - handing them in again beside
     * it filed every shot twice, which quietly halved how much career the keeper's five-deep
     * dossier could hold. See `rememberShot`.
     */
    memory: keeperMemory(state.shots ?? []),
  };
}

/** How far above the squad he is, which is what every "is this yours" roll turns on. */
function deltaOf(run) {
  const { club } = standingOf(run);
  if (!club) return 0;
  const ovr = clampToOvr(run.state.ovr + (run.state.modifiers?.ovrTemp ?? 0));
  return ovr - squadLevelFor(club, ovr);
}

/**
 * Finish a bracket the player has just answered.
 *
 * `cameThrough` is his night; `won` is what the cup did about it. They are two questions
 * and only a final collapses them into one - come through a semi and the run gains a final
 * that still has to be played by somebody. The run is rebuilt rather than patched, which is
 * safe because nothing about the forcing touches the stream: the ties already watched come
 * back identical. See `simulateTournamentRun`.
 */
function closeCup(run, tournamentRun, { round, cameThrough, won }) {
  const { state, world } = run;
  const side = tournamentRun.national
    ? world.countries[state.country]
    : world.clubs[standingOf(run).club?.id];
  if (!side) return tournamentRun;

  const answers = { ...(tournamentRun.answers ?? {}), [round]: cameThrough };
  /*
   * The cup is only answered on the night the season priced it. Every other round he plays
   * is worth the tie and nothing else - go out in the quarter-final and the trophy is gone
   * whatever it was rolled at, which is what `champion` below is being told.
   */
  const championRoll =
    round === tournamentRun.settlesAt ? Boolean(won) : tournamentRun.championRoll;

  const ovr = clampToOvr(state.ovr + (state.modifiers?.ovrTemp ?? 0));
  const previous = (state.history ?? []).slice(-3).reverse();
  const rebuilt = simulateTournamentRun({
    id: tournamentRun.id,
    seed: state.seed,
    season: run.season,
    entrants: entrantsFor(tournamentRun.id, world, { include: [side] }),
    player: side,
    pull: playerPull({
      ovr,
      matches: previous[0]?.matches ?? 0,
      previous: previous.slice(1).map((entry) => entry.matches ?? 0),
    }),
    reaches: tournamentRun.reaches,
    decidesAt: tournamentRun.decidesAt,
    plays: tournamentRun.plays,
    answers,
    // A cup he came through the final of is a cup he won, and one somebody else settled is
    // whatever the roll said. Either way the bracket says the same thing the cabinet will.
    champion: Boolean(championRoll),
  });
  return {
    ...rebuilt,
    when: tournamentRun.when,
    trophy: tournamentRun.trophy,
    national: tournamentRun.national,
    decidesAt: tournamentRun.decidesAt,
    reaches: tournamentRun.reaches,
    settlesAt: tournamentRun.settlesAt,
    plays: tournamentRun.plays,
    answers,
    championRoll,
  };
}

/**
 * How much football he has been playing, as one number the whole game can read.
 *
 * The season being played is not in `history` yet - it is the one being set up - so this is
 * the last three that are, weighted towards the most recent. Used in two places that used
 * to disagree about the same player: how far his side goes in a cup, and whether the
 * decisive night is his to take.
 */
const inertiaOf = (state) => {
  const recent = (state.history ?? []).slice(-3).reverse();
  return matchInertia(recent[0]?.matches ?? 0, recent.slice(1).map((entry) => entry.matches ?? 0));
};

/** The trophy roll a cup uses when the player is not the one answering it. */
function rollCup(run, trophy, modifiers) {
  const { state, world } = run;
  if (NATIONAL_TROPHIES.includes(trophy)) {
    return rollNationalTitle(state.seed, run.season, trophy, {
      country: world.countries[state.country] ?? null,
      modifiers,
    });
  }
  const { club, competition } = standingOf(run);
  if (!club) return false;
  const ovr = clampToOvr(state.ovr + (modifiers.ovrTemp ?? 0));
  return rollTitle(state.seed, run.season, trophy, {
    club,
    competition,
    ovr,
    delta: ovr - squadLevelFor(club, ovr),
    modifiers,
    latent: seasonLatent(state.seed, run.season),
  });
}

/**
 * The whole season as an ordered list of nights, and the cursor that walks it.
 *
 * A night is either a tie his side plays - watched, nothing to press - or a fixture he
 * decides. Both are in one list because both happen in one season, and the only thing that
 * ever put them in the wrong order was that they used to live in two.
 */
function programmeOf(run, plan, runs, locale) {
  const { club } = standingOf(run);
  const ties = tiesOf(run, runs, club?.id, run.season, locale);
  /*
   * A NIGHT IN A COMPETITION YOUR SIDE IS OUT OF DOES NOT HAPPEN.
   *
   * Every round he is due to play is laid out with the plan, which is right - the calendar
   * has to exist before the season does. But the rounds are also his to lose: go out in the
   * semi-final and the final of that tournament is not a match anybody plays, and leaving
   * it in the queue had him walking out for a World Cup final his country had been knocked
   * out of a fortnight earlier - and winning it.
   *
   * The run always knows which of its rounds is the next one waiting on him (`pendingAt`),
   * and it is rebuilt every time he answers one. So the queue carries exactly that round
   * and no other: each answer reveals the next, and a run that has ended reveals nothing.
   */
  const playable = matchNightsOf(plan).filter(
    (fixture) =>
      !fixture.tournamentId ||
      runs.some((entry) => entry?.id === fixture.tournamentId && entry.pendingAt === fixture.round),
  );
  return [
    ...ties.map((tie) => ({ when: tie.when, kind: "tie", tie })),
    ...playable.map((fixture) => ({ when: whenOfNight(fixture), kind: "fixture", at: fixture.index })),
  ].sort((a, b) => a.when - b.when);
}

/** Every night he decides this season, tournament rounds included, in calendar order. */
const matchNightsOf = (plan) =>
  [...(plan.fixtures ?? []), ...(plan.tournaments ?? [])]
    .sort((a, b) => whenOfNight(a) - whenOfNight(b))
    .map((fixture, index) => ({ ...fixture, index }));

/**
 * Show whatever the cursor is pointing at, or close the season once it has run off the end.
 *
 * The one place either phase is entered. A tie opens TOURNAMENT, a fixture opens MATCH, and
 * the queue does not care which is which - which is the whole point of having one.
 */
function showNight(run, locale = "es") {
  const day = run.matchday;
  if (!day) return run;
  const night = day.queue[day.cursor];

  if (!night) {
    // Every night played. Now the season can be rolled, with the brackets it produced.
    const settled = playSeason(run, day.plan, day.results, locale, day.runs);
    return openMatchday({ ...settled, matchday: null, tournament: null }, locale);
  }

  if (night.kind === "tie") {
    const ties = day.queue.filter((entry) => entry.kind === "tie").map((entry) => entry.tie);
    return {
      ...run,
      phase: PHASES.TOURNAMENT,
      tournament: {
        season: day.season,
        ties,
        index: ties.findIndex((tie) => tie.id === night.tie.id),
        broadcast: broadcastFor(run, night.tie),
      },
    };
  }

  // `settleIfUntouched` because a fixture can be one that gives him no sight of goal, and
  // then there is no input to wait for.
  return settleIfUntouched({
    ...run,
    phase: PHASES.MATCH,
    tournament: null,
    matchday: {
      ...day,
      index: night.at,
      attempts: [],
      lastAttempt: null,
      shot: shotAt(run, day.fixtures, night.at),
      broadcast: null,
      last: null,
    },
  });
}

/** Move the cursor on one night. */
const advance = (run, locale = "es") =>
  showNight({ ...run, matchday: { ...run.matchday, cursor: run.matchday.cursor + 1 } }, locale);

/** Move on to the next night of the season. */
export function nextTie(run, locale = "es") {
  if (run.phase !== PHASES.TOURNAMENT || !run.matchday) return run;
  return advance(run, locale);
}

/**
 * Open the season, or close the step if there are none left to play.
 *
 * A season with nothing on the line - and a season spent serving a ban - is simulated
 * straight through, so a phase only ever opens on a night that actually exists.
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
    // A ban is served, not played: no shots, no bracket, and the plan that goes with them
    // is dropped so the season is rolled exactly as it would have been.
    // Derived once. It simulates a whole league table, and both the fixture draw and the
    // brackets are asking the same question of the same season.
    const context = current.state.modifiers?.suspended ? null : fixtureContext(current);
    const plan = context
      ? seasonFixtures(context)
      : { fixtures: [], tournaments: [], modifiers: {} };

    const staged = context
      ? stageTournaments(current, plan, context, locale)
      : { runs: [], settledTitles: {} };
    const modifiers = Object.keys(staged.settledTitles).length
      ? { ...plan.modifiers, settledTitles: staged.settledTitles }
      : plan.modifiers;

    /*
     * The night knows which cup it is a round of. `seasonFixtures` cannot say - it deals in
     * trophies, and which competition a trophy is played in depends on the confederation -
     * so the id is stamped on here, off the run that was just built for it. The screen needs
     * it to be able to say "Final - la Copa de Europa" instead of naming a fixture kind.
     */
    const tournaments = [
      ...(plan.tournaments ?? []).map((night) => ({
        ...night,
        tournamentId: staged.runs.find((entry) => entry.trophy === night.trophy)?.id ?? null,
      })),
    ];
    const fixtures = matchNightsOf({ ...plan, tournaments });
    const queue = programmeOf(current, { ...plan, tournaments }, staged.runs, locale);

    if (queue.length) {
      return showNight(
        {
          ...current,
          matchday: {
            season: current.season,
            fixtures,
            plan: modifiers,
            runs: staged.runs,
            queue,
            cursor: 0,
            index: 0,
            results: [],
            attempts: [],
            lastAttempt: null,
            shot: null,
            broadcast: null,
            last: null,
          },
        },
        locale,
      );
    }
    current = playSeason(current, modifiers, [], locale, staged.runs);
  }

  return { ...current, phase: PHASES.SEASON, matchday: null, tournament: null, played: true };
}

/**
 * Commit to a placement.
 *
 * The result is held rather than applied: the keeper's position is only revealed once you
 * cannot change your mind, and the player gets to read it before the next fixture opens.
 */
/**
 * A decider that gives him no sight of goal at all decides itself.
 *
 * There is nothing to press, so the screen would otherwise sit there waiting for an input
 * that can never come. The night still happened and the trophy still resolves - at
 * `DECIDES.absent`, which is neither his fault nor his doing.
 */
function settleIfUntouched(run) {
  const matchday = run.matchday;
  if (!matchday || matchday.last) return run;
  if ((matchday.fixtures[matchday.index]?.chances ?? 1) > 0) return run;

  /*
   * This path never goes through `recordAttempt`, because there was no attempt - and that
   * is exactly how a cup final could still end 1-1 on screen after the rest of this was
   * fixed. A night he never touched is still a final, and a final still has a winner.
   */
  const outcome = outcomeOf(run, []);
  const settled = settleFinal(run, matchday.fixtures[matchday.index], outcome);
  if (settled) outcome.settledTitle = settled;
  const broadcast = matchday.broadcast;

  return {
    ...run,
    matchday: {
      ...matchday,
      last: outcome,
      broadcast: broadcast
        ? { ...broadcast, finish: narrateFinish(broadcast, [], {
              won: settled ? settled.won : null,
              shootout: goesToPenalties(matchday.fixtures[matchday.index]),
              produces: matchday.shot?.produces,
            }) }
        : broadcast,
    },
  };
}

export function takeShot(run, choice) {
  if (run.phase !== PHASES.MATCH || !run.matchday || run.matchday.last) return run;
  const { shot } = run.matchday;
  if (shot.mode === MODES.SKILL) return run;
  if (!shot.options.includes(choice)) return run;

  // The narration of it - and the whistle, once this was the last one - is `recordAttempt`,
  // which both ways of resolving a chance go through.
  return recordAttempt(run, resolveShot(shot, choice));
}

/**
 * Resolve a chance the player actually played, rather than guessed at.
 *
 * `inputs` is where he stopped the marker - see minigames.js. The verdict comes back in
 * the same shape `resolveShot` returns, so everything downstream is identical: the model
 * never learns which way the moment was decided, and it must not, because the season's
 * budget was priced off how often he converts and not off how he does it.
 */
export function playChance(run, inputs) {
  if (run.phase !== PHASES.MATCH || !run.matchday || run.matchday.last) return run;
  const { shot } = run.matchday;
  if (shot.mode !== MODES.SKILL || !shot.chance) return run;

  const judged = judgeChance(shot.chance, inputs);
  const picked = playedPlacement(shot, judged);
  return recordAttempt(run, {
    ...shot,
    ...judged,
    /*
     * WHICH PLACEMENT A PLAYED CHANCE CAME OUT AS.
     *
     * A minigame is a gesture, not a menu, so the model has to name the gesture before
     * anything downstream can talk about it - `ShotScene` puts the keeper on `picked` and
     * the season table prints `choice`. Neither was being given one: `picked` was simply
     * never set, so the drawing held the result of a chance with the goalkeeper standing
     * where he had been waiting and no ball on the pitch at all, and `choice` was read off
     * `accuracy`, which meant a clean finish always reported the LAST option in the list
     * while the verdict beside it named a different one as the gap.
     */
    picked,
    choice: shot.options[picked],
    foundGap: judged.clean,
  });
}

/**
 * Where a played chance ended up, as one of the placements the blind mode would have named.
 *
 * Clean means he found the gap - that is what `judgeChance` measures - so it IS the gap. A
 * miss went somewhere else, and which somewhere is taken off the gesture itself so the same
 * play always reads back the same way. The option lists are not in spatial order (see
 * SHOT_TYPES), so this is a naming convention rather than a measurement; what matters is
 * that the drawing, the verdict and the season table all get the same answer.
 */
function playedPlacement(shot, judged) {
  if (judged.clean) return shot.gap;
  const wrong = shot.options.map((_, index) => index).filter((index) => index !== shot.gap);
  if (!wrong.length) return shot.gap;
  const first = Array.isArray(judged.inputs) ? judged.inputs[0] : judged.inputs;
  const value = typeof first === "number" ? first : (first?.x ?? 0);
  const at = Math.floor(Math.max(0, Math.min(0.999, value)) * wrong.length);
  return wrong[at];
}

/**
 * Fold one attempt into the fixture, and close the fixture once he has had them all.
 *
 * A decider is worth `fixture.chances` sights of goal - drawn before anything is played,
 * which is what let `stakeFor` price it exactly. He takes every one of them: converting
 * the first of three does not end the match, it just means the rest are for the score.
 * The fixture is decided by whether ANY of them went in, which is the same question
 * `convertsOneOf` answered when the season was budgeted.
 */
/**
 * A final, answered on the night it is played.
 *
 * The trophies of a season are rolled together at the end of it, which is right for every
 * one of them EXCEPT the one whose final the player has just watched: that match printed a
 * scoreline, and on a night that is the trophy, a scoreline is a claim about the cabinet.
 * Left apart, the two disagreed - a cup final read 0-1 at full time and the ceremony played
 * anyway, two times in five across a measured sample.
 *
 * So the fixture's own trophy is rolled HERE, with the same stream and the same odds the
 * season would have used: every multiplier is already known, because a step answers all its
 * cards before it plays a ball. `rollTitles` then honours the answer instead of asking
 * again, so nothing about how often a cup is won has moved - only when the question is put.
 *
 * Returns null for a fixture that decides nothing on its own, which is most of them: a
 * league is not settled by one match, and a semi-final is not the cup.
 */
const FINALS = new Set(["final_copa", "final_continental", "final_mundial", "final_continental_nt"]);

/**
 * What a level scoreline MEANS at ninety minutes.
 *
 * In a LEAGUE match a draw is a result: the table takes the point and the season carries
 * on. Everywhere else it is a question, and football has always answered it the same way.
 * So a knockout that finishes square goes to penalties - which is also what stops a cup
 * final sitting on screen reading 1-1 with a trophy in the cabinet.
 *
 * The promotion play-off and the survival final used to be in this set, and they had no
 * business being there: neither is a league match. A play-off tie ended 1-1 and the season
 * moved on without saying who had gone up, which made them the only two nights in the game
 * where the biggest match of the year simply stopped. They are knockouts, `settleFinal`
 * gives them a winner, and a level one is now settled from twelve yards like every other.
 */
const LEVEL_IS_A_RESULT = new Set(["league", "derby"]);
const goesToPenalties = (fixture) =>
  Boolean(fixture?.decides) && !LEVEL_IS_A_RESULT.has(fixture.decides);

/**
 * The two nights that decide a table rather than a cup.
 *
 * They are settled the same way a final is - see `settleFinal` - and honoured by
 * `simulateSeason` instead of rolled again, so the shoot-out that ends a level play-off
 * gives the tie to whoever really goes up.
 */
const TABLE_DECIDERS = new Set(["promotion", "survival"]);

function settleFinal(run, fixture, outcome) {
  /*
   * A SEMI-FINAL IS ALSO A NIGHT THE CUP HAS TO ANSWER.
   *
   * It never used to be, and it did not need to be: the semi was a fixture standing beside
   * a bracket that was drawn afterwards, so the trophy could safely be left to the end of
   * the season. Now the bracket is drawn with the plan and continues past his night - come
   * through a semi and the run gains a final somebody has to play - so the run cannot be
   * closed until the cup has a result. `TOURNAMENT_NIGHTS` names the trophy, because
   * `fixture.decides` on a semi says "semifinal", which is a stage and not a cup.
   */
  const stage = TOURNAMENT_NIGHTS[fixture.kind];

  /*
   * GOING UP AND STAYING UP ARE ALSO ANSWERS SOMEBODY HAS TO GIVE ON THE NIGHT.
   *
   * They used to be given in August, by `simulateSeason`, months after the match that was
   * supposed to be about them - which is why a promotion play-off was allowed to finish
   * 1-1 and stop there, and why the season summary was then free to file the same club
   * fourteenth. Rolled here, with the same stream and the same odds the season would have
   * used and every multiplier this very night put on them, the answer exists before the
   * whistle: the feed can hand a level tie to whoever really went up, and the table has to
   * agree with the night it was decided on. See `rollPromotion` / `rollRelegation`.
   *
   * `won` is read the way the player reads it - going up, and staying up.
   */
  if (TABLE_DECIDERS.has(fixture.decides)) {
    const { club } = standingOf(run);
    if (!club) return null;
    const modifiers = withMatchEffects(run.state.modifiers ?? {}, run.matchday.plan ?? {}, [outcome]);
    const spec = {
      ovr: clampToOvr(run.state.ovr + (modifiers.ovrTemp ?? 0)),
      latent: seasonLatent(run.state.seed, run.season),
      modifiers,
    };
    return {
      trophy: fixture.decides,
      won:
        fixture.decides === "promotion"
          ? rollPromotion(run.state.seed, run.season, spec)
          : !rollRelegation(run.state.seed, run.season, spec),
    };
  }

  // `tie` rounds are the ones in front of the night the season was priced on. They settle
  // the eliminatoria and nothing else - rolling a cup at the last sixteen would answer in
  // February the question the final is there to ask.
  if (!FINALS.has(fixture.kind) && !(stage && !stage.tie)) return null;
  const trophy = stage?.trophy ?? fixture.decides;
  if (!trophy) return null;

  // The same modifiers the season would have rolled this with: the step's plan, the cards
  // it already answered, and what this very night did to the odds.
  const modifiers = withMatchEffects(run.state.modifiers ?? {}, run.matchday.plan ?? {}, [outcome]);

  /*
   * A World Cup or a continental final belongs to the country, and its odds are not in the
   * club table at all - see `rollNationalTitle`. Rolled through `rollTitle` it came back
   * zero every single time, so every national final the player watched was narrated as a
   * defeat and then contradicted by the ceremony that followed it.
   */
  if (NATIONAL_TROPHIES.includes(trophy)) {
    return {
      trophy,
      won: rollNationalTitle(run.state.seed, run.season, trophy, {
        country: run.world.countries[run.state.country] ?? null,
        modifiers,
      }),
    };
  }

  const { club, competition } = standingOf(run);
  if (!club) return null;

  const ovr = clampToOvr(run.state.ovr + (modifiers.ovrTemp ?? 0));
  return {
    trophy,
    won: rollTitle(run.state.seed, run.season, trophy, {
      club,
      competition,
      ovr,
      delta: ovr - squadLevelFor(club, ovr),
      modifiers,
      latent: seasonLatent(run.state.seed, run.season),
    }),
  };
}

/** The same clamp the engine applies before it prices anything off a rating. */
const clampToOvr = (value) => Math.max(1, Math.min(99, Math.round(value)));

function recordAttempt(run, resolved) {
  const { fixtures, index, attempts = [], broadcast } = run.matchday;
  const fixture = fixtures[index];
  const played = [...attempts, resolved];
  const total = fixture.chances ?? 1;
  const closed = played.length >= total;

  // A closed fixture knows what it produced; a closed FINAL also knows what it settled.
  const outcome = closed ? outcomeOf(run, played) : null;
  const settled = outcome ? settleFinal(run, fixture, outcome) : null;
  if (settled) outcome.settledTitle = settled;

  /*
   * THE KEEPER GETS UP AND HAS A LOOK AT YOU.
   *
   * The shot was built once per fixture, so a night worth three sights of goal asked the
   * same question three times: one gap, drawn before the first of them, unchanged by
   * anything that happened. The most profitable thing a player could do was find it and
   * stop varying, which is the opposite of what the moment is supposed to be about.
   *
   * So the next chance is rebuilt on the spot, with this one in the keeper's memory. See
   * `keeperFacing` and `keeperDive`.
   */
  const state = {
    ...run.state,
    // What he has been doing lately, kept short. A keeper is not a database.
    shots: rememberShot(run.state.shots ?? [], resolved?.choice),
  };
  const next = closed ? run.matchday.shot : nextRead({ ...run, state }, fixture, played);

  return {
    ...run,
    state,
    matchday: {
      ...run.matchday,
      attempts: played,
      lastAttempt: resolved,
      shot: next,
      last: outcome,
      /*
       * Narrate it NOW, not at full time.
       *
       * On a night worth more than one, the feed used to say nothing at all between the
       * chances: whether the first went in was only written when the last had been taken.
       * So the match asked for the second one with no line about the first and a scoreboard
       * that had not moved. Every attempt gets its beat on the minute it happened; only the
       * one that closes the fixture is allowed to reach full time.
       *
       * A final also carries its answer by then, so the last minutes can tell the truth
       * about the cup instead of inventing a scoreline the ceremony will contradict.
       */
      broadcast: broadcast
        ? {
            ...broadcast,
            finish: narrateFinish(broadcast, played.map((attempt) => attempt.scored), {
              closed,
              won: settled ? settled.won : null,
              shootout: goesToPenalties(fixture),
              // A save is not a goal and a chance he did not save is one for them. The
              // feed reads this off the same `produces` the season totals do.
              produces: run.matchday.shot?.produces,
            }),
          }
        : broadcast,
    },
  };
}

/** Everything the season needs from a decider, whichever way it was resolved. */
function outcomeOf(run, attempts) {
  const { fixtures, index, shot } = run.matchday;
  const fixture = fixtures[index];
  const taken = attempts.length;
  const converted = attempts.filter((attempt) => attempt.scored).length;
  const last = attempts[attempts.length - 1] ?? {};

  return {
    // Which match this was, before anything that happened in it. An absent night has no
    // attempt to inherit these from, and the season front page names its fixtures off
    // them - so they come from the shot that was set up, which exists either way.
    fixtureId: shot?.fixtureId ?? fixture.id,
    kind: shot?.kind ?? fixture.kind,
    type: shot?.type ?? null,
    // Whether coming through here would have been a goal, an assist or a save. The season
    // totals and every verdict printed downstream read it.
    produces: shot?.produces ?? PRODUCES.GOAL,
    ...last,
    // The fixture went in if any of them did. Nothing about the number of chances reaches
    // the model beyond this - the budget already knew how many there would be.
    scored: converted > 0,
    // A night the ball never came to him is its own outcome, and it is not a miss.
    absent: taken === 0,
    attempts,
    taken,
    converted,
    decides: fixture.decides,
    national: fixture.national,
    opponentId: fixture.opponentId ?? null,
    // What the three outcomes leave the trophy on. None of them is a verdict.
    settle: fixture.settle ?? null,
    reached: fixture.reached ?? null,
  };
}

/**
 * Kick off a decider that is being played out rather than shot.
 *
 * Builds the ninety minutes up to the chance and nothing past it - the placements still
 * decide the end of it, so the narration is the match around the moment rather than a
 * replacement for it.
 */
export function watchMatch(run, locale = "es") {
  if (run.phase !== PHASES.MATCH || !run.matchday || run.matchday.broadcast) return run;
  const { fixtures, index, shot } = run.matchday;
  if (shot.mode !== MODES.MATCH) return run;

  const fixture = fixtures[index];
  const { club } = standingOf(run);
  const opponent = fixture.opponentId ? run.world.clubs[fixture.opponentId] : null;
  const country = run.world.countries[run.state.country] ?? null;
  const ourName = fixture.national
    ? (locale === "en" ? country?.name_en : country?.name_es) ?? ""
    : club?.shortName ?? club?.name ?? "";

  // A night that gives him nothing still has to reach full time on its own, or the clock
  // stops on a chance that never comes and the screen waits for an input it cannot get.
  const owed = fixture.chances ?? 1;
  const built = narrateMatch({
    seed: run.state.seed,
    season: run.season,
    fixtureId: fixture.id,
    kind: fixture.kind,
    chances: owed,
    national: Boolean(fixture.national),
    ourName,
    theirName: opponent?.shortName ?? opponent?.name ?? "",
    group: run.state.group,
    ovr: run.state.ovr,
    // Which scoreline the night is built around: a striker's chance decides a match he can
    // win, a keeper's decides one he can lose. See STOP_SITUATIONS in narration.js.
    produces: shot.produces,
  });

  /*
   * A night worth no sight of goal has to reach full time on its own - the clock cannot stop
   * on a chance that never comes - and it has to reach it KNOWING WHAT THE NIGHT DECIDED.
   *
   * The fixture settled its own trophy when it opened, one step ahead of this: `nextFixture`
   * runs `settleIfUntouched` before the screen ever asks for a broadcast, so by the time we
   * get here `matchday.last` is already set and the `settleIfUntouched` below returns without
   * touching anything. Which left this line as the only thing writing the feed - and it was
   * writing it blind. No `won`, so the verdict came off a scoreline narration.js had made up;
   * no `shootout`, so a cup final was allowed to end level.
   *
   * That is the whole of the contradiction on a night the ball never came to him: the feed
   * said 0-1, or 2-2 and nothing, and the ceremony lifted the cup ten seconds later - the two
   * halves were answering different questions. Now the feed is told the same answer the
   * cabinet was given, which is the rule everywhere else in this file.
   */
  const settled = run.matchday.last?.settledTitle ?? null;
  const closing = {
    ...built,
    finish: narrateFinish(built, [], {
      won: settled ? settled.won : null,
      shootout: goesToPenalties(fixture),
      produces: shot.produces,
    }),
  };

  // Still called, for the one order this does not cover: a broadcast opened before the
  // fixture had settled itself. It writes the same finish from the same answer.
  return settleIfUntouched({
    ...run,
    matchday: { ...run.matchday, broadcast: owed > 0 ? built : closing },
  });
}

/**
 * Move on from a shot already taken: the next fixture, or the season those shots just
 * decided.
 */
export function nextFixture(run, locale = "es") {
  if (run.phase !== PHASES.MATCH || !run.matchday?.last) return run;
  const { fixtures, index, results, last } = run.matchday;
  const fixture = fixtures[index];
  const played = [...results, last];

  /*
   * A NIGHT THAT WAS A ROUND LEAVES A BRACKET WAITING ON IT.
   *
   * The run was built with this round left open - no result, no rounds after it, because
   * none of them had happened. Now they have: he came through or he did not, the cup was
   * answered with him, and the rest of the competition can be drawn and dropped into the
   * calendar behind him. That is the whole of what "the final is a round of the tournament"
   * buys, and it is why this cannot be done at the end of the season like everything else.
   */
  let matchday = { ...run.matchday, results: played };
  const stage = TOURNAMENT_NIGHTS[fixture.kind];
  if (stage) {
    const pending = matchday.runs.find(
      (entry) => entry.pendingAt === (fixture.round ?? null) && entry.id === fixture.tournamentId,
    );
    if (pending) {
      /*
       * WHAT HIS NIGHT DID TO THE BRACKET, which is not the same question as whether he
       * came through it.
       *
       * His shot moves the odds - that is what `settle` is for, and the whole budget is
       * priced off it - and the roll still decides the cup. So on a FINAL the tie follows
       * the trophy: score and lose it anyway and the feed already knows how to say so (see
       * the `contradicts` branch in narrateFinish), but a bracket that crowned him champion
       * for scoring would be the drawing contradicting the cabinet all over again.
       *
       * A semi has no trophy of its own, so it follows him - except when the cup was won,
       * which is proof he got past it whatever the night looked like.
       */
      const round = fixture.round ?? pending.pendingAt;
      /*
       * A FINAL IS THE TROPHY, WHOEVER STAGED IT.
       *
       * Two kinds of final can reach him. One is the night the season was priced on: his
       * shot moved the odds through `settle` and `settleFinal` has just rolled the cup with
       * them. The other is a final his own form handed him in a competition the budget did
       * not pick - see `roundOdds` - where the cup was rolled with the plan and his shot
       * does not move it.
       *
       * Either way the tie follows the trophy, because a final IS the trophy. Read off his
       * conversion instead, the second kind crowned him champion of a cup the cabinet had
       * already recorded as lost. Every round in front of a final is the opposite: it is the
       * tie and nothing else, so there it is his own night that decides.
       */
      const rolled =
        pending.settlesAt === round
          ? Boolean(last?.settledTitle?.won)
          : Boolean(pending.championRoll);
      const settles = round === "final";
      const closed = closeCup(run, pending, {
        round,
        cameThrough: settles ? rolled : Boolean(last?.scored),
        won: rolled,
      });
      const runs = matchday.runs.map((entry) => (entry === pending ? closed : entry));
      /*
       * GOING OUT IS LOSING THE CUP, whatever it was rolled at.
       *
       * A cup with no decisive final has its trophy rolled with the plan, before a ball is
       * kicked, so the bracket can be built to agree with it. His own rounds still stand in
       * front of that: fail the quarter-final and the run is over - and a run that is over
       * cannot go on to lift the thing. Written into the plan rather than into the night,
       * because a round is not a trophy night and has no `settledTitle` of its own.
       */
      const plan =
        closed.eliminatedAt && closed.trophy
          ? {
              ...matchday.plan,
              settledTitles: { ...matchday.plan?.settledTitles, [closed.trophy]: false },
            }
          : matchday.plan;
      matchday = { ...matchday, plan, runs, queue: requeue(run, matchday, runs, locale) };
    }
  }

  return advance({ ...run, matchday }, locale);
}

/**
 * The calendar, rebuilt around ties that did not exist when it was first laid out.
 *
 * Only nights still ahead of the cursor can move. Everything already played stays exactly
 * where it was played - a queue that reshuffled behind the cursor would replay a tie or
 * skip one - so the new rounds are simply merged into the part of the season that has not
 * happened yet, in the order football plays them.
 */
function requeue(run, matchday, runs, locale) {
  const seen = new Set(
    matchday.queue.slice(0, matchday.cursor + 1).map((night) => nightKey(night)),
  );
  const rebuilt = programmeOf(run, { fixtures: matchday.fixtures, tournaments: [] }, runs, locale);
  const ahead = rebuilt.filter((night) => !seen.has(nightKey(night)));
  return [...matchday.queue.slice(0, matchday.cursor + 1), ...ahead.sort((a, b) => a.when - b.when)];
}

const nightKey = (night) => (night.kind === "tie" ? `tie:${night.tie.id}` : `fixture:${night.at}`);

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

  /*
   * A deal that is still running is the whole of the summer.
   *
   * This is what `years` is FOR, and until now it was only half enforced: the club could
   * not push you out, but you could still walk into any other club's office and sign,
   * paying the crowd a breach fee on the way. That made a four-year contract a price
   * rather than a commitment, and it made the buy-out - the term the player argues down
   * at the table precisely so that somebody CAN come for him - almost pointless, because
   * he could leave without one.
   *
   * So while the deal runs there is exactly one card on the table: stay. The two ways out
   * are somebody meeting the buy-out (`clauseOfferFor`, its own panel) and a decision card
   * that tears the contract up (`forceTransfer`), which is the one path that still charges
   * `IDOLATRY.perBreachYear`.
   */
  if (locked && !run.state.forceTransfer) {
    const { club, competition } = standingOf(run);
    if (!club) return [];
    return [
      {
        clubId: club.id,
        competitionId: competition?.id ?? null,
        stay: true,
        projectedDelta: run.state.ovr - squadLevelFor(club, run.state.ovr),
      },
    ];
  }

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
 * Somebody meets the buy-out.
 *
 * Only ever while a deal is still running - once it expires the player walks for nothing
 * and there is no clause to trigger. The club that does it is not drawn from the ordinary
 * market: a side that pays a release is a side that has decided, so it is the biggest one
 * that could plausibly want him. That is the fantasy the term is there to buy.
 *
 * Returns the offer, or null for the overwhelming majority of summers.
 */
function clauseOfferFor(run) {
  const contract = run.state.contract;
  if (!isUnderContract(contract, run.state.clubId)) return null;

  const odds = clauseOdds({
    clause: contract.clause,
    value: run.state.value,
    ovr: run.state.ovr,
  });
  if (!chanceOf(run, "clause", odds)) return null;

  const current = run.world.clubs[run.state.clubId] ?? null;
  const candidates = Object.values(run.world.clubs).filter((club) => {
    if (club.id === run.state.clubId) return false;
    // Somebody who would actually play him, and who is worth the fee they just paid.
    const gap = run.state.ovr - (squadLevelFor(club, run.state.ovr) ?? 58);
    return gap >= -10 && gap <= 14 && (club.international_reputation ?? 0) >= 2;
  });
  if (!candidates.length) return null;

  const next = createStream(run.state.seed, "clause", "suitor", run.season);
  const club = pickWeighted(next, candidates, (c) => (c.international_reputation ?? 0) ** 3 + 1);
  if (!club) return null;

  const competition = run.world.competitions[club.competitionId] ?? null;
  return {
    clubId: club.id,
    competitionId: competition?.id ?? null,
    projectedDelta: run.state.ovr - squadLevelFor(club, run.state.ovr),
    clausePaid: true,
    fee: contract.clause,
    exit: exitPreview({
      idolatry: run.state.idolatry,
      clubId: run.state.clubId,
      seasonsAtClub: run.state.seasonsAtClub,
      sameCompetition: Boolean(current) && competition?.id === current.competitionId,
      // The price was named by the club and it was met. There is no deal being torn up.
      breachYears: 0,
      clausePaid: true,
    }),
  };
}

/** One roll, keyed so that re-reading the market never rerolls it. */
const chanceOf = (run, key, odds) =>
  chance(createStream(run.state.seed, key, run.season), odds);

/**
 * Attach what signing each offer would cost you in idolatría. This is the half of the
 * system the genre normally hides: a loyalty tax you cannot see before you pay it is a
 * gotcha, and the rest of this game is built on telling you the number first.
 */
function withExitCost(run, offers) {
  const current = standingOf(run).club;
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

/**
 * What signing each offer would do to the player, not just to his role.
 *
 * The exit cost is already printed on the card, and the delta meter already draws the
 * minutes. This adds the third thing a club decides for you and the one the game used to
 * keep to itself: whether you carry on getting better there. It is projected from the
 * same `growthFactor` the season will actually be scored with, so it is a promise the
 * engine keeps rather than a hint.
 */
function withGrowthPreview(run, offers) {
  const keeper = run.state.position === "POR";
  return offers.map((offer) => {
    // Through the overlay, so the club you are being asked to stay at is the one you took
    // up last May rather than the one the data froze in place.
    const { club } = standingOf(run, offer.clubId);
    if (!club) return offer;
    const delta = offer.projectedDelta ?? 0;
    const role = roleFor(delta, keeper);
    const [min, max] = role.matches;
    // The role's midpoint, scaled the way the season will scale it. Good enough to rank
    // three offers, which is all this has to do.
    const matches =
      ((min + max) / 2) *
      (CLUB_MATCH_MULTIPLIER[effectiveReputation(club, run.state.ovr, "domestic")] ?? 1);
    return {
      ...offer,
      growth: growthFactor({
        matches,
        delta,
        reputation: effectiveReputation(club, run.state.ovr, "international"),
      }),
    };
  });
}

/** Close the step: either the career is over, or the summer market opens. */
export function openMarket(run, locale = "es") {
  if (run.state.retired || run.state.age >= RETIREMENT_AGE) return retire(run, locale);
  const last = run.state.history[run.state.history.length - 1] ?? null;
  // Refused once, it does not come back the same summer - the club was told no.
  const clauseOffer = run.state.refusedClauseSeason === run.season ? null : clauseOfferFor(run);
  return {
    ...run,
    phase: PHASES.MARKET,
    offers: withGrowthPreview(run, withExitCost(run, offersWithFallback(run))),
    clauseOffer: clauseOffer ? withGrowthPreview(run, [clauseOffer])[0] : null,
    outlook: developmentOutlook(run.state, last?.growth?.factor ?? null),
    nationalityChoices: run.state.pendingCountryChange ? nationalityChoicesFor(run) : null,
  };
}

/**
 * Take the call. The buy-out has been met, so this is an ordinary signing from here - it
 * simply happens in a summer the contract said it could not.
 */
export function acceptClause(run) {
  if (run.phase !== PHASES.MARKET || !run.clauseOffer) return run;
  // The offer has to be in the list `openNegotiation` reads, and it is not one of the
  // three the market drew: this is a fourth door that opened on its own.
  const offers = [...run.offers.filter((o) => o.clubId !== run.clauseOffer.clubId), run.clauseOffer];
  return openNegotiation({ ...run, offers }, run.clauseOffer.clubId);
}

/**
 * Say no to a club that has already paid.
 *
 * Nothing in the model makes him go - the money went between two clubs and he was never
 * asked. So the only thing that happens is the thing that should: the stand hears about
 * it. This is the single largest gift in `IDOLATRY` that is not a trophy.
 */
export function refuseClause(run) {
  if (run.phase !== PHASES.MARKET || !run.clauseOffer) return run;
  const clubId = run.state.clubId;
  const before = idolatryAt(run.state.idolatry, clubId);
  const after = applyIdolatry(before, IDOLATRY.refusedClause, {
    wonTitleHere: Boolean(run.state.titleClubs?.[clubId]),
    betrayed: Boolean(run.state.betrayed?.[clubId]),
  });
  return {
    ...run,
    clauseOffer: null,
    refusedClause: { clubId: run.clauseOffer.clubId, before, after, change: after - before },
    state: {
      ...run.state,
      idolatry: { ...run.state.idolatry, [clubId]: after },
      refusedClauseSeason: run.season,
    },
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

  /*
   * A DEAL THAT IS STILL RUNNING IS NOT RE-SIGNED EVERY SUMMER.
   *
   * While the contract runs the market offers exactly one card - stay - and taking it went
   * through the table and the signature like any transfer, which wrote a NEW deal over the
   * old one. So a player with three years left was made to re-sign every June, and the years
   * he had argued for at the table were quietly replaced by whatever the club offered now.
   * That is the opposite of what a contract is: the whole point of the years is that neither
   * side gets to reopen them.
   *
   * Staying put under a running deal is therefore not a transaction at all. Nothing is
   * signed, nothing is renegotiated, and the season simply starts - the contract ticks down
   * on its own in `playSeason`, which is the only place it ever should.
   */
  const staying = clubId === run.state.clubId;
  if (staying && isUnderContract(run.state.contract, run.state.clubId)) {
    return openStep({ ...run, offers: [], deal: null, clauseOffer: null });
  }

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
    refusedClauseSeason: null,
  };
  return openStep({
    ...run,
    state,
    step: run.step + 1,
    offers: [],
    outlook: null,
    clauseOffer: null,
    refusedClause: null,
  });
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
  const { club, competition, tier, shift, demoted } = standingOf(run);
  const idolatry = idolatryAt(run.state.idolatry, run.state.clubId);
  const contract = run.state.contract?.clubId === run.state.clubId ? run.state.contract : null;
  const last = run.state.history[run.state.history.length - 1] ?? null;

  /*
   * THE RATING THE SEASON WILL ACTUALLY BE PLAYED AT.
   *
   * A decision card can leave an `ovrTemp` - a knock, a fallout, a summer that sharpened
   * him - and everything that decides the year reads `state.ovr + ovrTemp`: `fixtureContext`
   * splits the season's odds at it, `simulateSeason` rolls every trophy at it, and
   * `settleFinal` prices a final at it. The screens read `state.ovr` on its own, so the card
   * in the masthead said 55 while the season was being played at 53 - and the delta cell,
   * which is the number this entire model turns on, was out by the same two.
   *
   * That is precisely the promise this interface makes everywhere else: the exit cost is on
   * the offer, the conversion rate is on the match screen, the growth band is on the market
   * card. The game shows you the number it is about to use. So the standing reports the
   * effective rating, keeps the base beside it, and hands the screens `ovrTemp` so the card
   * can say that the difference is a loan and not growth.
   *
   * Nothing outside a live step moves: `simulateSeason` clears the modifiers on its way out,
   * so by the market screen `ovrTemp` is zero and `ovr === baseOvr`.
   */
  const ovrTemp = run.state.modifiers?.ovrTemp ?? 0;
  const ovr = Math.max(1, Math.min(99, Math.round(run.state.ovr + ovrTemp)));

  return {
    club,
    competition,
    // Where the club actually is, which is only the same as the badge until it moves.
    division: club ? { tier, shift, demoted } : null,
    country: run.world.countries[run.state.country] ?? null,
    ovr,
    baseOvr: run.state.ovr,
    ovrTemp,
    squadLevel: club ? squadLevelFor(club, ovr) : null,
    delta: club ? ovr - squadLevelFor(club, ovr) : null,
    // What the last season was worth to his development, so the header can say whether
    // he is in a place that is still making him better.
    growth: last?.growth ?? null,
    seasonsLeft: Math.max(0, RETIREMENT_AGE - run.state.age),
    idolatry: club ? { value: Math.round(idolatry), level: levelOf(idolatry).key } : null,
    contract,
    // What the shirt is currently expected to be worth, in role terms.
    wageExpectation: contract
      ? wagePressure(contract, run.state.lastRole ?? contract.wageRole)
      : 0,
  };
}
