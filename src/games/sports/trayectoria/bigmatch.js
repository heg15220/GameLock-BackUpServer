/**
 * The three matches that decide a season.
 *
 * Everywhere else in this game you choose a club and a card and the model plays the
 * football. That is the right default - a career is mostly decisions - but it leaves the
 * player watching the one moment nobody watches from the outside: the ball at your feet
 * with the season on it. This is the exception, and it is deliberately the only one.
 *
 * How it works, and why it does not break the rest of the model:
 *
 *  1. A big match REPLACES part of a season rather than adding to it. For every trophy,
 *     the year is split in two: with probability `reach` it comes down to a match the
 *     player takes a shot in, and the rest of the time it is rolled as always - at
 *     whatever odds make the two halves add back up to the odds the model already had.
 *     `splitSeason` does that arithmetic, and it is what keeps a shot from being free
 *     silverware. The player decides many more seasons without winning more of them.
 *  2. The keeper's gap is drawn before you choose and revealed after, so the shot is a
 *     genuine guess. It is not a coin flip dressed as agency: OVR buys you a read that
 *     eliminates one wrong option, and at the top it buys the occasional goal you had no
 *     right to score. Both feed back into the split, so a better player really does take
 *     more of these seasons home.
 *  3. Everything is a pure function of the seed and the fixture, so the same career
 *     replays identically.
 *
 * Pure: no React, no clock, no world mutation.
 */

import { chance, createStream, randInt } from "./rng.js";
import {
  CONTINENTAL_CYCLE,
  CONTINENTAL_WIN,
  PROMOTION_ODDS,
  TITLE_DELTA_MULTIPLIER,
  TITLE_ODDS,
  WORLD_CUP_CYCLE,
  WORLD_CUP_QUALIFY,
  WORLD_CUP_WIN,
  multiplierFor,
  relegationOdds,
  tableLookup,
} from "./tables.js";

/**
 * The most seasons that may come down to a single match. A career where every year ends
 * on one shot is a penalty shoot-out simulator, not a career.
 */
export const DRAMA = 0.45;
export const MATCHES_PER_SEASON = 3;

/** The read: OVR buys you a hint that removes one wrong option. */
export const HINT_FROM_OVR = (ovr) => Math.max(0, Math.min(0.6, (ovr - 62) * 0.02));
/** The bailout: at the top you sometimes score having guessed wrong. */
export const NAILED_FROM_OVR = (ovr) => Math.max(0.02, Math.min(0.14, (ovr - 55) * 0.004));

/**
 * How often the shot goes in, before anyone takes it.
 *
 * Assumes the player picks blind among the placements he is offered, which is the honest
 * assumption: he has no information the model has not given him. The read leaves two live
 * options instead of three, so it is worth a sixth of a goal, and the bailout is added on
 * the guesses that were wrong.
 */
export function shotScoringRate(ovr) {
  const hint = HINT_FROM_OVR(ovr);
  const gap = hint * (1 / 2) + (1 - hint) * (1 / 3);
  return gap + (1 - gap) * NAILED_FROM_OVR(ovr);
}

/**
 * Split a season's odds between the matches the player takes and the rest of the year.
 *
 * `budget` is the probability the model already gave this outcome. Each stage takes a
 * slice of the remaining probability mass and pays back `value` of the budget when it
 * lands; whatever budget is left is spread over the mass nobody took, as a multiplier on
 * the roll that was going to happen anyway. If a stage cannot be afforded it simply does
 * not fire - which is why a bottom-half side rarely plays a title decider.
 *
 * Returns the reach of each stage plus `residual`, the odds the ordinary roll should use.
 */
export function splitSeason(budget, stages) {
  let left = Math.max(0, budget);
  let mass = 1;
  const reach = [];

  for (const value of stages) {
    if (value <= 0 || mass <= 0) {
      reach.push(0);
      continue;
    }
    // Odds conditional on having got this far, capped so drama stays rationed.
    const taken = Math.min(DRAMA, left / mass / value, 1);
    reach.push(taken);
    left -= mass * taken * value;
    mass -= mass * taken;
  }

  return { reach, residual: mass > 0 ? Math.max(0, Math.min(1, left / mass)) : 0 };
}

/**
 * Shot archetypes. Three placements each, because two is a coin flip and four makes the
 * read worthless. The ids are labelled in copy.js.
 */
export const SHOT_TYPES = {
  penal: ["izquierda", "centro", "derecha"],
  mano_a_mano: ["cruzado", "primer-palo", "picadita"],
  cabezazo: ["primer-palo", "segundo-palo", "atras"],
  falta: ["barrera", "palo-largo", "rasa"],
  volea: ["abajo", "escuadra", "cruzada"],
};

/**
 * What can be on the line, most important first. `weight` only orders the fixtures when
 * more than three qualify - it is not a probability.
 */
export const FIXTURE_KINDS = {
  final_mundial: { weight: 100, shots: ["penal", "mano_a_mano", "volea"], decides: "world_cup", national: true },
  final_continental_nt: { weight: 95, shots: ["penal", "cabezazo", "mano_a_mano"], decides: "continental_nt", national: true },
  final_continental: { weight: 90, shots: ["mano_a_mano", "volea", "penal"], decides: "continental_a" },
  ascenso: { weight: 86, shots: ["cabezazo", "falta", "mano_a_mano"], decides: "promotion" },
  salvacion: { weight: 85, shots: ["penal", "cabezazo", "mano_a_mano"], decides: "survival" },
  titulo_liga: { weight: 80, shots: ["mano_a_mano", "cabezazo", "volea"], decides: "league" },
  final_copa: { weight: 70, shots: ["falta", "penal", "mano_a_mano"], decides: "cup" },
  semifinal_continental: { weight: 60, shots: ["volea", "mano_a_mano", "falta"], decides: "semifinal" },
  clasico: { weight: 40, shots: ["cabezazo", "volea", "falta", "mano_a_mano"], decides: "derby" },
};

const oddsFor = (trophy, reputation) => TITLE_ODDS[trophy]?.odds?.[reputation] ?? 0;

/** Derived rivalries, per world. Cheap to compute once and asked for every season. */
const RIVAL_CACHE = new WeakMap();

/**
 * Who the derby is against.
 *
 * The world data models 574 clubs and no rivalries, so they are derived: same league,
 * nearest in stature, ties broken by id. No seed goes into it, which is the point - a
 * club's classic opponent is the same club in every career, the way a real one is.
 */
export function derbyRivals(world, clubId, limit = 3) {
  const club = world?.clubs?.[clubId];
  if (!club) return [];

  let cache = RIVAL_CACHE.get(world);
  if (!cache) {
    cache = new Map();
    RIVAL_CACHE.set(world, cache);
  }
  const hit = cache.get(clubId);
  if (hit) return hit;

  const reputation = club.international_reputation ?? 0;
  const rivals = Object.values(world.clubs)
    .filter((other) => other.id !== club.id && other.competitionId === club.competitionId)
    .sort((a, b) => {
      const gap =
        Math.abs((a.international_reputation ?? 0) - reputation) -
        Math.abs((b.international_reputation ?? 0) - reputation);
      return gap || String(a.id).localeCompare(String(b.id));
    })
    .slice(0, limit)
    .map((other) => other.id);

  cache.set(clubId, rivals);
  return rivals;
}

/**
 * Which of the season's matches actually mattered, in the order they are played, plus the
 * modifiers that keep the rest of the season honest about them.
 *
 * Everything here is rolled from the seed before the season is simulated, because the
 * player's shots are inputs to that simulation and not commentary on it.
 *
 * A trophy whose decider did not fire is not simply left alone: its ordinary roll is
 * scaled by `residual / base`, so the year still averages out to what the model always
 * gave. A decider that fired but was crowded out of the three - which happens to a great
 * player in a World Cup year - is played by the model at the rate his shot would have
 * scored at.
 */
export function seasonFixtures({
  seed,
  season,
  club,
  competition,
  country,
  ovr,
  age,
  delta = 0,
  effectiveReputation,
  calledUp = false,
  rivals = [],
  titleMultipliers = {},
}) {
  const modifiers = { titleMultipliers: {}, nationalMultipliers: {} };
  if (!club) return { fixtures: [], modifiers };

  const rate = shotScoringRate(ovr);
  // The budget being split has to be the odds the engine will actually roll: the delta
  // multiplier, and whatever the decision card already did to this season. Split the raw
  // odds instead and a player above the level of his squad quietly loses the part of the
  // season the shot took over.
  const deltaMultiplier = multiplierFor(TITLE_DELTA_MULTIPLIER, delta);
  const clubOdds = (trophy, key) =>
    Math.min(
      1,
      oddsFor(trophy, effectiveReputation(key)) *
        deltaMultiplier *
        (titleMultipliers.all ?? 1) *
        (titleMultipliers[trophy] ?? 1),
    );
  const candidates = [];
  const push = (kind, extra = {}) => candidates.push({ kind, ...extra });

  /** Where each outcome's ordinary roll lives, so the rest of this reads the same way. */
  const assign = (decides, value) => {
    if (decides === "league" || decides === "cup" || decides === "continental_a") {
      modifiers.titleMultipliers[decides] = value;
    } else if (decides === "world_cup" || decides === "continental_nt") {
      modifiers.nationalMultipliers[decides] = value;
    } else if (decides === "promotion") {
      modifiers.promotionMultiplier = value;
    } else if (decides === "survival") {
      modifiers.relegationMultiplier = value;
    }
  };

  /**
   * One decider: roll whether the season comes down to it, and scale the roll it did not
   * replace. `stake` is what the player's shot is worth against the budget - the odds of
   * scoring, except for survival, where what he is buying is the miss not happening.
   */
  const contest = (decides, kind, base, stake, key, extra = {}) => {
    const scale = (value) => (base > 0 ? value / base : 1);
    const split = splitSeason(base, [stake]);
    if (chance(createStream(seed, "fixture", key, season), split.reach[0])) {
      push(kind, { ...extra, offstage: { decides, value: scale(stake) } });
      return true;
    }
    assign(decides, scale(split.residual));
    return false;
  };

  // ── Club trophies ───────────────────────────────────────────────────────────
  // The continental has two stages: the final, and failing that a semi whose winner has
  // the final played for him. Everything else is a single decider.
  const continentalBase = clubOdds("continental_a", "continental");
  const continental = splitSeason(continentalBase, [rate, rate * rate]);
  const scaleContinental = (value) => (continentalBase > 0 ? value / continentalBase : 1);
  if (chance(createStream(seed, "fixture", "continental", season), continental.reach[0])) {
    push("final_continental", { offstage: { decides: "continental_a", value: scaleContinental(rate) } });
  } else if (chance(createStream(seed, "fixture", "semi", season), continental.reach[1])) {
    push("semifinal_continental", {
      offstage: { decides: "continental_a", value: scaleContinental(rate * rate) },
      multipliers: {
        scored: { continental_a: scaleContinental(rate) },
        missed: { continental_a: 0 },
      },
    });
  } else {
    assign("continental_a", scaleContinental(continental.residual));
  }

  contest("cup", "final_copa", clubOdds("cup", "domestic"), rate, "cup");
  contest("league", "titulo_liga", clubOdds("league", "domestic"), rate, "league");

  // ── The two ends of the table, the only places a season is ever really decided ──
  if (competition?.tier === 2) {
    contest("promotion", "ascenso", tableLookup(PROMOTION_ODDS, ovr).odds, rate, "promo");
  } else if (effectiveReputation("domestic") === 0) {
    // Going down is what the shot prevents, so the budget being split is the drop itself
    // and the decider only pays it back when the shot is missed.
    contest("survival", "salvacion", relegationOdds(ovr), 1 - rate, "drop");
  }

  // ── National team finals, on their real cycles ───────────────────────────────
  if (calledUp && country) {
    if (WORLD_CUP_CYCLE(age)) {
      const reputation = country.fifa_reputation ?? 0;
      // The model qualifies you first and only then plays the final, so the budget being
      // split is the product of the two.
      const base = (WORLD_CUP_QUALIFY[reputation] ?? 0) * (WORLD_CUP_WIN[reputation] ?? 0);
      contest("world_cup", "final_mundial", base, rate, "wc");
    }
    if (CONTINENTAL_CYCLE(age)) {
      const base = CONTINENTAL_WIN[country.continental_reputation ?? 0] ?? 0;
      contest("continental_nt", "final_continental_nt", base, rate, "ct");
    }
  }

  // The derby always exists. It decides nothing and everyone remembers it.
  if (rivals.length) {
    const derby = createStream(seed, "fixture", "derby", season);
    push("clasico", { opponentId: rivals[Math.floor(derby() * rivals.length)] });
  }

  const ordered = candidates.sort(
    (a, b) => FIXTURE_KINDS[b.kind].weight - FIXTURE_KINDS[a.kind].weight,
  );

  // Only three fit. A decider reached and then crowded out - which happens to a great
  // player in a World Cup year - is played by the model at the rate his shot would have
  // scored at, so being busy costs him nothing.
  for (const fixture of ordered.slice(MATCHES_PER_SEASON)) {
    if (fixture.offstage) assign(fixture.offstage.decides, fixture.offstage.value);
  }

  const fixtures = ordered.slice(0, MATCHES_PER_SEASON).map((fixture, index) => ({
    ...fixture,
    id: `${season}-${fixture.kind}`,
    index,
    decides: FIXTURE_KINDS[fixture.kind].decides,
    national: Boolean(FIXTURE_KINDS[fixture.kind].national),
  }));

  return { fixtures, modifiers };
}

/**
 * Set up one shot. The gap is where the keeper is not; it is drawn now and only revealed
 * once the player has committed.
 */
export function shotFor({ seed, season, fixture, ovr }) {
  const spec = FIXTURE_KINDS[fixture.kind];
  const typeStream = createStream(seed, "shot", "type", fixture.id, season);
  const type = spec.shots[Math.floor(typeStream() * spec.shots.length)];
  const options = SHOT_TYPES[type];

  const gapStream = createStream(seed, "shot", "gap", fixture.id, season);
  const gap = randInt(gapStream, 0, options.length - 1);

  const nailedStream = createStream(seed, "shot", "nailed", fixture.id, season);
  const nailed = chance(nailedStream, NAILED_FROM_OVR(ovr));

  // The read removes one option the keeper has covered - never the gap itself.
  const hintStream = createStream(seed, "shot", "hint", fixture.id, season);
  let ruledOut = null;
  if (chance(hintStream, HINT_FROM_OVR(ovr))) {
    const wrong = options.map((_, index) => index).filter((index) => index !== gap);
    ruledOut = wrong[Math.floor(hintStream() * wrong.length)];
  }

  return { fixtureId: fixture.id, kind: fixture.kind, type, options, gap, nailed, ruledOut };
}

/** Commit to a placement. Scoring means finding the gap - or being good enough not to need it. */
export function resolveShot(shot, choice) {
  const picked = shot.options.indexOf(choice);
  const foundGap = picked === shot.gap;
  const scored = foundGap || shot.nailed;
  return {
    ...shot,
    choice,
    picked,
    foundGap,
    scored,
    // Beating a keeper who read you is the moment worth printing.
    nailedIt: scored && !foundGap,
  };
}

/**
 * Fold the three results into the modifiers the season simulation reads.
 *
 * A decider the player took settles its trophy outright, in both directions: the roll it
 * replaced was already scaled away by `seasonFixtures`, so a miss really is the end of it.
 */
export function matchEffects(results = []) {
  const effects = {
    bonusGoals: 0,
    derbyGoals: 0,
    guaranteedTitles: [],
    deniedTitles: [],
    guaranteedNationalTitles: [],
    deniedNationalTitles: [],
    titleMultipliers: {},
    forcePromotion: null,
    forceRelegation: null,
  };

  for (const result of results) {
    if (result.scored) effects.bonusGoals += 1;

    switch (result.decides) {
      case "league":
      case "cup":
      case "continental_a":
        if (result.scored) effects.guaranteedTitles.push(result.decides);
        else effects.deniedTitles.push(result.decides);
        break;
      case "world_cup":
      case "continental_nt":
        if (result.scored) effects.guaranteedNationalTitles.push(result.decides);
        else effects.deniedNationalTitles.push(result.decides);
        break;
      case "semifinal":
        // A semi does not hand you the cup, it puts you in the final - which the model
        // then plays, at the rate this player's shots go in. Both multipliers were worked
        // out against the real odds when the fixture was drawn.
        Object.assign(
          effects.titleMultipliers,
          (result.scored ? result.multipliers?.scored : result.multipliers?.missed) ?? {},
        );
        break;
      case "promotion":
        effects.forcePromotion = result.scored;
        break;
      case "survival":
        effects.forceRelegation = !result.scored;
        break;
      case "derby":
        if (result.scored) effects.derbyGoals += 1;
        break;
      default:
        break;
    }
  }
  return effects;
}
