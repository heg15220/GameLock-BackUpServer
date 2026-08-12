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

/**
 * What your shot is worth to the result - and, crucially, what it is not.
 *
 * A decider used to settle its trophy outright in both directions: score and the cup was
 * yours, miss and it was gone. That reads as decisive and plays as a coin flip deciding a
 * whole season, and it is not how football works. Eleven other players are on the pitch;
 * a striker who misses the big chance watches his team win it anyway often enough that
 * the moment is remembered precisely because it so nearly cost them.
 *
 * So the shot now moves the odds hard rather than closing them. Score and the side wins
 * it four times in five; miss and they still take it about a quarter of the time. It is
 * the largest single swing in the model by a distance, which is what makes it the moment
 * of the season without making it the whole of it.
 *
 * The split arithmetic absorbs this without any other change: what the decider is worth
 * against the season's budget is simply the blend of the two, `stakeFor`, and the same
 * `reach x stake + (1 - reach) x residual = base` invariant holds.
 */
export const DECIDES = {
  scored: 0.82,
  missed: 0.24,
  /**
   * And the third outcome, which football has and the model did not: the ball never came
   * to him. A final he played and never got a sight of is not a miss - the other ten are
   * still out there - so it settles near the middle and the night belongs to somebody
   * else. It is also the only outcome he cannot be blamed for, which is the point.
   */
  absent: 0.5,
};

/**
 * How many sights of goal a decider gives him.
 *
 * A match is not one chance. Some nights three fall to you and some nights the game goes
 * past you entirely, and a decider that always served up exactly one was the last place
 * this simulation was still visibly a slot machine.
 *
 * The count is drawn at FIXTURE time, from the seed, before anything is played - which is
 * what lets `stakeFor` price the moment exactly rather than on average. The tilt is the
 * number the rest of the game runs on: a side that depends on you works the ball to you.
 */
export const CHANCE_WEIGHTS = [
  { chances: 0, weight: 12 },
  { chances: 1, weight: 46 },
  { chances: 2, weight: 28 },
  { chances: 3, weight: 11 },
  { chances: 4, weight: 3 },
];
/**
 * How hard delta tilts the table, per point, as an exponential tilt on the weights.
 *
 * Multiplicative rather than additive so the shape is preserved: subtracting a flat amount
 * drove the busy end of the table negative for a fringe player and clamped three chances
 * and four to the same floor, which said a passenger is as likely to get four sights of
 * goal as three. An exponential tilt cannot reorder anything.
 */
export const CHANCE_TILT = 0.1;
/** The count the tilt pivots around: above it a good player gains, below it he loses. */
const TILT_PIVOT = 1.3;

export function chancesFor(seed, season, fixtureId, delta = 0) {
  const reach = Math.max(-10, Math.min(10, delta));
  const weighted = CHANCE_WEIGHTS.map(({ chances, weight }) => ({
    chances,
    // Fewer sights of goal for a passenger, more for the man they play through.
    weight: weight * Math.exp(reach * CHANCE_TILT * (chances - TILT_PIVOT)),
  }));
  const total = weighted.reduce((sum, row) => sum + row.weight, 0);
  let target = createStream(seed, "chances", fixtureId, season)() * total;
  for (const row of weighted) {
    target -= row.weight;
    if (target <= 0) return row.chances;
  }
  return 1;
}

/** The odds he converts at least one of `n` sights of goal. */
export const convertsOneOf = (rate, n) => (n <= 0 ? 0 : 1 - (1 - rate) ** n);

/**
 * What a decider is worth against the budget, given how many chances it will actually
 * give him. `n === 0` is the absent case and does not touch the scored/missed axis at all.
 */
export function stakeFor(rate, n = 1) {
  if (n <= 0) return DECIDES.absent;
  const converts = convertsOneOf(rate, n);
  return converts * DECIDES.scored + (1 - converts) * DECIDES.missed;
}

/** The same, for an outcome the shot PREVENTS: survival is the drop not happening. */
export function dropStakeFor(rate, n = 1) {
  if (n <= 0) return 1 - DECIDES.absent;
  const converts = convertsOneOf(rate, n);
  return converts * (1 - DECIDES.scored) + (1 - converts) * (1 - DECIDES.missed);
}

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
 * How many shots the model's own estimate is worth, before what actually happened starts
 * to outweigh it.
 *
 * A career takes at most ~70 of these and has taken none at all in its first summer, so
 * an empirical rate on its own would be noise: one lucky penalty at seventeen would tell
 * the season planner this player converts everything. Twelve is roughly a third of a
 * career's worth of shots - enough that the prior still runs the early years, little
 * enough that by thirty the record has taken over.
 */
export const CONVERSION_PRIOR = 12;

/**
 * What this player converts a decisive chance at - the number the whole season split is
 * built on, and the one thing in the model that has to be true rather than assumed.
 *
 * `shotScoringRate` is an a priori estimate, and it is only correct while the player has
 * no information the model has not given him: it assumes he guesses blind among the
 * placements he is offered. The moment the moment becomes something he can be GOOD at -
 * a minigame, a read he learns, anything with skill in it - that assumption breaks, and
 * it breaks in the one direction that matters. `splitSeason` hands the decider a slice of
 * the season's budget priced at this rate; convert above it and the player collects more
 * silverware than the model believes it is handing out, every season, for a whole career.
 *
 * So the rate is measured instead of assumed. A Beta-Binomial posterior over what he has
 * actually done, shrunk towards the model's estimate by `CONVERSION_PRIOR` pseudo-shots:
 *
 *     rate = (k·p0 + scored) / (k + taken)
 *
 * Two properties are what make this the right tool. It starts at exactly the old value,
 * so nothing changes for a career that has not taken a shot yet; and it can never run
 * away, because every observation moves it by at most 1/(k + n). The budget identity is
 * untouched - `splitSeason` simply gets told the truth about what it is buying.
 */
export function conversionRate(ovr, record = null) {
  const prior = shotScoringRate(ovr);
  const taken = record?.taken ?? 0;
  if (taken <= 0) return prior;
  const scored = Math.max(0, Math.min(taken, record.scored ?? 0));
  return Math.max(0, Math.min(1, (CONVERSION_PRIOR * prior + scored) / (CONVERSION_PRIOR + taken)));
}

/** The record itself, for the panel that prints it. */
export function conversionRecord(record = null, ovr = 0) {
  const taken = record?.taken ?? 0;
  const scored = record?.scored ?? 0;
  return {
    taken,
    scored,
    observed: taken ? scored / taken : null,
    expected: shotScoringRate(ovr),
    rate: conversionRate(ovr, record),
  };
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
 * Chance archetypes. Three placements each, because two is a coin flip and four makes the
 * read worthless. The ids are labelled in copy.js and drawn in scene.jsx.
 *
 * The first five are a striker's. The rest were added when the deciders stopped being the
 * same five shots for everybody: a centre-back's final is not decided by his penalty, and
 * a goalkeeper was being handed one-on-ones to finish while `GOAL_RATE.keeper` insisted he
 * scores nothing. See REPERTOIRE.
 */
export const SHOT_TYPES = {
  // Striker.
  penal: ["izquierda", "centro", "derecha"],
  mano_a_mano: ["cruzado", "primer-palo", "picadita"],
  cabezazo: ["primer-palo", "segundo-palo", "atras"],
  falta: ["barrera", "palo-largo", "rasa"],
  volea: ["abajo", "escuadra", "cruzada"],
  // Goalkeeper. The three options are where HE goes, not where the ball does.
  parada_penal: ["izquierda", "centro", "derecha"],
  salida_mano_a_mano: ["achique", "palo-corto", "abajo"],
  tiro_lejano: ["escuadra", "abajo", "cruzada"],
  centro_lateral: ["salida", "primer-palo", "segundo-palo"],
  // Defender.
  despeje: ["primer-palo", "centro", "segundo-palo"],
  entrada: ["adelantarse", "aguantar", "cerrar"],
  anticipo: ["primer-palo", "atras", "cruzado"],
  // Midfield.
  pase_gol: ["al-hueco", "atras", "cruzado"],
};

/**
 * What converting one is worth on the scoresheet - and, for half of them, nothing at all.
 *
 * This is the only place the new repertoires touch the model. A converted chance settles
 * its trophy identically whichever it is, because `stakeFor` prices a decider off how
 * often the player comes through and not off what coming through looks like. But a saved
 * penalty is not a goal, and the season totals have to say so.
 */
export const PRODUCES = { GOAL: "goal", ASSIST: "assist", STOP: "stop" };

export const SHOT_PRODUCES = {
  penal: PRODUCES.GOAL,
  mano_a_mano: PRODUCES.GOAL,
  cabezazo: PRODUCES.GOAL,
  falta: PRODUCES.GOAL,
  volea: PRODUCES.GOAL,
  parada_penal: PRODUCES.STOP,
  salida_mano_a_mano: PRODUCES.STOP,
  tiro_lejano: PRODUCES.STOP,
  centro_lateral: PRODUCES.STOP,
  despeje: PRODUCES.STOP,
  entrada: PRODUCES.STOP,
  anticipo: PRODUCES.STOP,
  pase_gol: PRODUCES.ASSIST,
};

/**
 * Which chances a season can actually put in front of this player.
 *
 * Keyed by the position group `engine.js` already derives, so the eleven playable
 * positions collapse to the four the football does: the man in the goal, the man stopping
 * it, the man supplying it and the man finishing it.
 *
 * A defender gets three defensive moments and a corner, which is exactly the shape of a
 * real centre-back's decisive night - he saves it three times and wins it once with his
 * head. A midfielder's is the last pass and the shot from distance. The striker's list is
 * the original five, unchanged, so nothing about an existing forward career moves.
 */
export const REPERTOIRE = {
  keeper: ["parada_penal", "salida_mano_a_mano", "tiro_lejano", "centro_lateral"],
  defensive: ["despeje", "entrada", "anticipo", "cabezazo"],
  support: ["pase_gol", "falta", "volea", "mano_a_mano"],
  creator: ["pase_gol", "falta", "volea", "mano_a_mano"],
  forward: ["penal", "mano_a_mano", "cabezazo", "falta", "volea"],
};

/**
 * What can be on the line, and when.
 *
 * The two numbers do different jobs and used to be the same one, which is how a season
 * ended up playing its derby AFTER the cup final and the last day of the league:
 *
 *  - `weight` decides which three matter when more than three qualify. It is a ranking of
 *    importance, not a probability.
 *  - `when` decides the order they are actually played in, and it is the calendar. A
 *    league derby is a Sunday in November; a promotion play-off is the middle of June.
 *    Nothing about the model reads it - it is chronology, and chronology is the one thing
 *    a career simulation cannot get wrong without the player noticing immediately.
 */
export const FIXTURE_KINDS = {
  final_mundial: { weight: 100, when: 9, shots: ["penal", "mano_a_mano", "volea"], decides: "world_cup", national: true },
  final_continental_nt: { weight: 95, when: 8, shots: ["penal", "cabezazo", "mano_a_mano"], decides: "continental_nt", national: true },
  final_continental: { weight: 90, when: 6, shots: ["mano_a_mano", "volea", "penal"], decides: "continental_a" },
  ascenso: { weight: 86, when: 7, shots: ["cabezazo", "falta", "mano_a_mano"], decides: "promotion" },
  salvacion: { weight: 85, when: 5, shots: ["penal", "cabezazo", "mano_a_mano"], decides: "survival" },
  titulo_liga: { weight: 80, when: 4, shots: ["mano_a_mano", "cabezazo", "volea"], decides: "league" },
  final_copa: { weight: 70, when: 3, shots: ["falta", "penal", "mano_a_mano"], decides: "cup" },
  semifinal_continental: { weight: 60, when: 2, shots: ["volea", "mano_a_mano", "falta"], decides: "semifinal" },
  clasico: { weight: 40, when: 1, shots: ["cabezazo", "volea", "falta", "mano_a_mano"], decides: "derby" },
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
 * Who each kind of decider is against.
 *
 * Only the derby ever had an opponent, so the biggest nights of a career were played
 * against the words "el rival" and a blank badge. The pool is what the fixture would
 * really be drawn from, which is also what makes the derby exception below possible:
 *
 *  - `contenders` / `strugglers` - the last day of a league is played against whoever is
 *    up there or down there with you, not against a random mid-table side.
 *  - `domestic` - a cup final or a play-off is anyone in your division, nearest in
 *    stature first, which is the same ordering `derbyRivals` uses.
 *  - `continental` - your confederation, and your own league is in the bombo. Two clubs
 *    from the same city have met in a European final inside living memory.
 */
export const OPPONENT_POOLS = {
  titulo_liga: "contenders",
  salvacion: "strugglers",
  final_copa: "domestic",
  ascenso: "domestic",
  final_continental: "continental",
  semifinal_continental: "continental",
};

/** How many clubs a draw picks from. Wide enough to surprise, narrow enough to be credible. */
const POOL_SIZE = { contenders: 6, strugglers: 6, domestic: 10, continental: 24 };

/** Same shape as RIVAL_CACHE: the pools are pure functions of the world, so derive once. */
const POOL_CACHE = new WeakMap();

export function opponentPool(world, club, competition, kind) {
  const pool = OPPONENT_POOLS[kind];
  if (!pool || !world?.clubs || !club) return [];

  let cache = POOL_CACHE.get(world);
  if (!cache) {
    cache = new Map();
    POOL_CACHE.set(world, cache);
  }
  const key = `${club.id}:${pool}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const others = Object.values(world.clubs).filter((other) => other.id !== club.id);
  // Every sort breaks its ties by id, so a pool is the same list in every career.
  const byId = (a, b) => String(a.id).localeCompare(String(b.id));
  let ranked;

  if (pool === "continental") {
    const confederation = competition?.confederation;
    ranked = others
      .filter((other) => world.competitions[other.competitionId]?.confederation === confederation)
      .sort(
        (a, b) =>
          (b.continental_reputation ?? 0) - (a.continental_reputation ?? 0) || byId(a, b),
      );
  } else {
    const sameLeague = others.filter((other) => other.competitionId === club.competitionId);
    const standing = (other) => other.domestic_reputation ?? 0;
    if (pool === "contenders") {
      ranked = sameLeague.sort((a, b) => standing(b) - standing(a) || byId(a, b));
    } else if (pool === "strugglers") {
      ranked = sameLeague.sort((a, b) => standing(a) - standing(b) || byId(a, b));
    } else {
      const stature = club.international_reputation ?? 0;
      ranked = sameLeague.sort(
        (a, b) =>
          Math.abs((a.international_reputation ?? 0) - stature) -
            Math.abs((b.international_reputation ?? 0) - stature) || byId(a, b),
      );
    }
  }

  const drawn = ranked.slice(0, POOL_SIZE[pool]).map((other) => other.id);
  cache.set(key, drawn);
  return drawn;
}

/** One draw from that pool, off the seed, so a career replays the same opponents. */
export function opponentFor({ seed, season, world, club, competition, kind }) {
  const pool = opponentPool(world, club, competition, kind);
  if (!pool.length) return null;
  const stream = createStream(seed, "opponent", kind, season);
  return pool[Math.floor(stream() * pool.length)];
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
  world,
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
  conversion = null,
}) {
  const modifiers = { titleMultipliers: {}, nationalMultipliers: {} };
  if (!club) return { fixtures: [], modifiers };

  // What he actually converts, not what the model guessed he would. See `conversionRate`.
  const rate = conversionRate(ovr, conversion);
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
   * replace.
   *
   * `stake` is what the shot is worth against the budget - the blend of the two outcomes,
   * not the odds of scoring. `settle` is what the two outcomes leave the trophy on, as a
   * multiplier on its own base so the engine can keep rolling it the way it rolls
   * everything else. Both are scaled against `settleBase`, which is the budget except for
   * the World Cup, where qualifying and winning are two separate rolls.
   */
  const contest = (decides, kind, base, stake, key, extra = {}, outcomes = DECIDES, settleBase = base) => {
    const scale = (value) => (base > 0 ? value / base : 1);
    const scaleSettle = (value) => (settleBase > 0 ? value / settleBase : 1);
    const split = splitSeason(base, [stake]);
    if (chance(createStream(seed, "fixture", key, season), split.reach[0])) {
      push(kind, {
        ...extra,
        offstage: { decides, value: scale(stake) },
        settle: {
          scored: scaleSettle(outcomes.scored),
          missed: scaleSettle(outcomes.missed),
          absent: scaleSettle(outcomes.absent),
        },
      });
      return true;
    }
    assign(decides, scale(split.residual));
    return false;
  };

  /**
   * How many sights of goal each decider gives him, and therefore exactly what it is
   * worth. Drawn per fixture rather than per season: a career can have a final he barely
   * touched and a play-off he had three cracks at, in the same May.
   */
  const chancesAt = (key) => chancesFor(seed, season, key, delta);
  const stakeAt = (key) => stakeFor(rate, chancesAt(key));

  // ── Club trophies ───────────────────────────────────────────────────────────
  // The continental has two stages: the final, and failing that a semi whose winner has
  // the final played for him. Everything else is a single decider.
  const continentalBase = clubOdds("continental_a", "continental");
  const finalChances = chancesAt("continental");
  const finalStake = stakeFor(rate, finalChances);
  const semiChances = chancesAt("semi");
  // A semi is worth the final it leads to: win it and the final is played at the ordinary
  // stake, lose it and the run is over - that one really is settled on the night.
  const semiStake = stakeFor(rate, semiChances) * finalStake;
  const continental = splitSeason(continentalBase, [finalStake, semiStake]);
  const scaleContinental = (value) => (continentalBase > 0 ? value / continentalBase : 1);
  if (chance(createStream(seed, "fixture", "continental", season), continental.reach[0])) {
    push("final_continental", {
      chances: finalChances,
      offstage: { decides: "continental_a", value: scaleContinental(finalStake) },
      settle: {
        scored: scaleContinental(DECIDES.scored),
        missed: scaleContinental(DECIDES.missed),
        absent: scaleContinental(DECIDES.absent),
      },
    });
  } else if (chance(createStream(seed, "fixture", "semi", season), continental.reach[1])) {
    push("semifinal_continental", {
      chances: semiChances,
      offstage: { decides: "continental_a", value: scaleContinental(semiStake) },
      // Reaching the final is itself the blend, so even a missed semi leaves a way through.
      settle: {
        scored: scaleContinental(DECIDES.scored * finalStake),
        missed: scaleContinental(DECIDES.missed * finalStake),
        absent: scaleContinental(DECIDES.absent * finalStake),
      },
    });
  } else {
    assign("continental_a", scaleContinental(continental.residual));
  }

  contest("cup", "final_copa", clubOdds("cup", "domestic"), stakeAt("cup"), "cup", {
    chances: chancesAt("cup"),
  });
  contest("league", "titulo_liga", clubOdds("league", "domestic"), stakeAt("league"), "league", {
    chances: chancesAt("league"),
  });

  // ── The two ends of the table, the only places a season is ever really decided ──
  if (competition?.tier === 2) {
    contest("promotion", "ascenso", tableLookup(PROMOTION_ODDS, ovr).odds, stakeAt("promo"), "promo", {
      chances: chancesAt("promo"),
    });
  } else if (effectiveReputation("domestic") === 0) {
    // Going down is what the shot prevents, so the budget being split is the drop itself
    // and both outcomes are read the other way up: score and you probably stay, miss and
    // you probably do not - but neither is certain, which is the whole point.
    const dropChances = chancesAt("drop");
    contest(
      "survival",
      "salvacion",
      relegationOdds(ovr),
      dropStakeFor(rate, dropChances),
      "drop",
      { chances: dropChances },
      { scored: 1 - DECIDES.scored, missed: 1 - DECIDES.missed, absent: 1 - DECIDES.absent },
    );
  }

  // ── National team finals, on their real cycles ───────────────────────────────
  if (calledUp && country) {
    if (WORLD_CUP_CYCLE(age)) {
      const reputation = country.fifa_reputation ?? 0;
      // The model qualifies you first and only then plays the final, so the budget being
      // split is the product of the two - but the settle only touches the final, because
      // standing in one means you already qualified. `nationalReached` says so.
      const win = WORLD_CUP_WIN[reputation] ?? 0;
      const base = (WORLD_CUP_QUALIFY[reputation] ?? 0) * win;
      contest(
        "world_cup",
        "final_mundial",
        base,
        stakeAt("wc"),
        "wc",
        { reached: "world_cup", chances: chancesAt("wc") },
        DECIDES,
        win,
      );
    }
    if (CONTINENTAL_CYCLE(age)) {
      const base = CONTINENTAL_WIN[country.continental_reputation ?? 0] ?? 0;
      contest("continental_nt", "final_continental_nt", base, stakeAt("ct"), "ct", {
        chances: chancesAt("ct"),
      });
    }
  }

  // The derby always exists. It decides nothing and everyone remembers it.
  if (rivals.length) {
    const derby = createStream(seed, "fixture", "derby", season);
    push("clasico", {
      opponentId: rivals[Math.floor(derby() * rivals.length)],
      // A derby you never got a kick in is the most derby thing there is, so it draws its
      // chances like everything else.
      chances: chancesAt("derby"),
    });
  }

  // Ranked by what is at stake, which is what the cut to three is made on.
  const ranked = candidates.sort(
    (a, b) => FIXTURE_KINDS[b.kind].weight - FIXTURE_KINDS[a.kind].weight,
  );

  // Everybody he is playing. The derby drew its own opponent above; the rest draw here.
  for (const fixture of ranked) {
    if (fixture.opponentId || FIXTURE_KINDS[fixture.kind].national) continue;
    fixture.opponentId = opponentFor({ seed, season, world, club, competition, kind: fixture.kind });
  }

  /**
   * The one case where the derby is not the first match of the year.
   *
   * A classic is a fixture, not a date: if the cup final or the last day of the league
   * happens to be against the same club the derby was going to be against, that match IS
   * the derby, and it is played when a final is played rather than in November. So the
   * derby is not staged separately - it is folded into the match it collided with, and
   * the slot it vacates goes to the decider that had been crowded out of the three.
   */
  const derbyFixture = ranked.find((fixture) => fixture.kind === "clasico");
  let staged = ranked;
  if (derbyFixture?.opponentId) {
    const others = ranked.filter((fixture) => fixture !== derbyFixture);
    // Only a match that is actually going to be played can absorb it.
    const host = others
      .slice(0, MATCHES_PER_SEASON)
      .find((fixture) => fixture.opponentId === derbyFixture.opponentId);
    if (host) {
      host.derby = true;
      staged = others;
    }
  }

  // Only three fit. A decider reached and then crowded out - which happens to a great
  // player in a World Cup year - is played by the model at the rate his shot would have
  // scored at, so being busy costs him nothing.
  for (const fixture of staged.slice(MATCHES_PER_SEASON)) {
    if (fixture.offstage) assign(fixture.offstage.decides, fixture.offstage.value);
  }

  // And now, and only now, they are put in the order they are played in. Importance chose
  // them; the calendar sorts them.
  const fixtures = staged
    .slice(0, MATCHES_PER_SEASON)
    .sort((a, b) => FIXTURE_KINDS[a.kind].when - FIXTURE_KINDS[b.kind].when)
    .map((fixture, index) => ({
      ...fixture,
      id: `${season}-${fixture.kind}`,
      chances: fixture.chances ?? 1,
      index,
      decides: FIXTURE_KINDS[fixture.kind].decides,
      national: Boolean(FIXTURE_KINDS[fixture.kind].national),
      // It still settles its own trophy. Being the derby as well is a layer on top.
      derby: Boolean(fixture.derby),
    }));

  return { fixtures, modifiers };
}

/**
 * Set up one shot. The gap is where the keeper is not; it is drawn now and only revealed
 * once the player has committed.
 */
export function shotFor({ seed, season, fixture, ovr, group = "forward" }) {
  const spec = FIXTURE_KINDS[fixture.kind];
  const typeStream = createStream(seed, "shot", "type", fixture.id, season);

  // What this player's position can be handed, weighted towards what this fixture is
  // known for - a World Cup final leans on the penalty spot, a cup final on a free kick.
  // The preference degrades to a flat draw for a position whose repertoire it names none
  // of, which is every position but the striker's.
  const pool = REPERTOIRE[group] ?? REPERTOIRE.forward;
  const preferred = new Set(spec.shots ?? []);
  const weights = pool.map((entry) => (preferred.has(entry) ? 2 : 1));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let target = typeStream() * total;
  let type = pool[pool.length - 1];
  for (let i = 0; i < pool.length; i += 1) {
    target -= weights[i];
    if (target <= 0) {
      type = pool[i];
      break;
    }
  }
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

  return {
    fixtureId: fixture.id,
    kind: fixture.kind,
    type,
    produces: SHOT_PRODUCES[type] ?? PRODUCES.GOAL,
    options,
    gap,
    nailed,
    ruledOut,
  };
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
    // A converted chance is not always a goal. A keeper who guesses the corner has saved
    // the final, not scored in it, and `GOAL_RATE.keeper` is zero for a reason.
    bonusAssists: 0,
    /*
     * How many deciders he was handed and how many he came through, whatever they produced.
     *
     * The two counters above only see the ones that end in the tally. A keeper's whole
     * season of big nights is invisible to them by design - which left `seasonBand` with
     * nothing at all to mark a goalkeeper's year against, since his goal expectation is
     * zero too. This is the one record of it.
     */
    deciders: { taken: 0, converted: 0 },
    /*
     * Finals answered on the night they were played - see `settleFinal` in career.js. The
     * season honours these instead of rolling them again, which is what stops a cup being
     * lost 0-1 on the scoreboard and lifted in the ceremony a moment later.
     */
    settledTitles: {},
    derbyGoals: 0,
    // Which trophies came down to a match the player stood in. They are still rolled -
    // see DECIDES - but the cabinet remembers that this one was settled on the night.
    decidedTrophies: [],
    titleMultipliers: {},
    nationalMultipliers: {},
    nationalReached: [],
  };

  for (const result of results) {
    // Every chance he came through on, and what coming through was worth on the sheet.
    // A stop is worth nothing here and everything to the trophy, which is the point.
    const came = result.converted ?? (result.scored ? 1 : 0);
    const produces = SHOT_PRODUCES[result.type] ?? PRODUCES.GOAL;
    if (produces === PRODUCES.GOAL) effects.bonusGoals += came;
    else if (produces === PRODUCES.ASSIST) effects.bonusAssists += came;
    // A night the ball never came to him is not a chance he was handed, so it is not one
    // he can be marked down for - see `absent` in outcomeOf.
    effects.deciders.taken += result.taken ?? (result.absent ? 0 : 1);
    effects.deciders.converted += came;
    if (result.settledTitle) {
      effects.settledTitles[result.settledTitle.trophy] = result.settledTitle.won;
    }
    // Whatever the outcome, the shot leaves the trophy on the odds the draw worked out
    // for it. Nothing here decides anything outright any more - and a night the ball
    // never came to him is its own outcome, neither his fault nor his doing.
    const outcome = result.absent ? "absent" : result.scored ? "scored" : "missed";
    const settle = result.settle?.[outcome];

    switch (result.decides) {
      case "league":
      case "cup":
      case "continental_a":
      case "semifinal":
        if (settle != null) {
          const trophy = result.decides === "semifinal" ? "continental_a" : result.decides;
          effects.titleMultipliers[trophy] = settle;
          effects.decidedTrophies.push(trophy);
        }
        break;
      case "world_cup":
      case "continental_nt":
        if (settle != null) {
          effects.nationalMultipliers[result.decides] = settle;
          effects.decidedTrophies.push(result.decides);
        }
        // Standing in the final means the qualifying already happened.
        if (result.reached) effects.nationalReached.push(result.reached);
        break;
      case "promotion":
        if (settle != null) effects.promotionMultiplier = settle;
        break;
      case "survival":
        if (settle != null) effects.relegationMultiplier = settle;
        break;
      case "derby":
        if (produces === PRODUCES.GOAL) effects.derbyGoals += came;
        break;
      default:
        break;
    }
  }
  return effects;
}
