/**
 * Trayectoria - career simulation engine.
 *
 * A career is a pure function of its seed plus the decisions the player took. Nothing
 * here touches React, the DOM or the clock, so a whole 24-season run can be replayed in
 * a test in milliseconds.
 *
 * The season pipeline, in order:
 *   squad level -> delta -> role -> matches -> goals/assists -> titles -> national team
 *   -> awards -> development -> market value -> offers
 */

import { chance, createStream, pickWeighted, randInt } from "./rng.js";
import {
  AWARD_ELIGIBLE_ROLES,
  BALLON_DOR,
  BALLON_DOR_POSITION_MULTIPLIER,
  CALLUP_THRESHOLD,
  CAREER_MODES,
  CLUB_MATCH_MULTIPLIER,
  CLUB_OUTPUT_MULTIPLIER,
  CLUB_WORLD_CUP_CONMEBOL,
  CLUB_WORLD_CUP_CYCLE,
  CONTINENTAL_CYCLE,
  CONTINENTAL_WIN,
  DEVELOPMENT,
  DEVELOPMENT_AGES,
  DOUBLE_ROLL_FROM_AGE,
  DOUBLE_ROLL_ROLES,
  EARNED_TITLE_ROLES,
  ELITE_OVR,
  GOLDEN_BOOT,
  KEEPER_ROLE_BANDS,
  LEAGUE_STRENGTH_WEIGHT,
  MARKET_RADIUS,
  MAX_OVR,
  MIN_OVR,
  POSITIONS,
  PROFILE_WEIGHTS,
  PROMOTION_ODDS,
  RETIREMENT_AGE,
  ROLE_BANDS,
  SQUAD_LEVEL,
  START_AGE,
  START_OVR,
  START_VALUE,
  TITLE_DELTA_MULTIPLIER,
  TITLE_ODDS,
  VALUE_AGE_MULTIPLIER,
  VALUE_BY_OVR,
  WORLD_CUP_CYCLE,
  WORLD_CUP_QUALIFY,
  WORLD_CUP_WIN,
  deltaBand,
  multiplierFor,
  qualityMultiplier,
  relegationOdds,
  tableLookup,
  GOAL_RATE,
  ASSIST_RATE,
} from "./tables.js";

const clampOvr = (ovr) => Math.max(MIN_OVR, Math.min(MAX_OVR, Math.round(ovr)));

export function positionGroup(position) {
  return POSITIONS[position]?.group ?? "support";
}

export function isKeeper(position) {
  return position === "POR";
}

/**
 * Reputation the club is treated as having. A genuinely elite player lifts a small club
 * one rung - which is also what keeps them out of the relegation bracket entirely.
 */
export function effectiveReputation(club, ovr, key = "international") {
  const base = club[`${key}_reputation`] ?? 0;
  if (ovr >= ELITE_OVR && base < 5) return base + 1;
  return base;
}

export function squadLevelFor(club, ovr) {
  return SQUAD_LEVEL[effectiveReputation(club, ovr, "international")] ?? SQUAD_LEVEL[0];
}

/** Delta -> role. Keepers use their own thresholds: you are the keeper or you are not. */
export function roleFor(delta, keeper = false) {
  const bands = keeper ? KEEPER_ROLE_BANDS : ROLE_BANDS;
  for (const band of bands) {
    if (delta >= band.minDelta) return band;
  }
  return bands[bands.length - 1];
}

/** Move a role N rungs down (negative) or up (positive), clamped. */
export function shiftRole(roleName, shift, keeper = false) {
  const bands = keeper ? KEEPER_ROLE_BANDS : ROLE_BANDS;
  const index = bands.findIndex((band) => band.role === roleName);
  const next = Math.max(0, Math.min(bands.length - 1, index - shift));
  return bands[next];
}

/**
 * The role ladder as contiguous delta segments, for drawing it.
 *
 * Bands are declared as open-ended thresholds ("titular from 0 up", "suplente from minus
 * infinity"), which is right for a lookup and useless for a track. This closes both ends
 * against a visible window and pairs each band with the next one's threshold, so the
 * segments tile without gaps or overlaps.
 */
export function roleLadder({ keeper = false, min, max }) {
  const bands = keeper ? KEEPER_ROLE_BANDS : ROLE_BANDS;
  return [...bands].reverse().map((band, index, ladder) => ({
    role: band.role,
    from: index === 0 ? min : band.minDelta,
    to: index === ladder.length - 1 ? max : ladder[index + 1].minDelta,
  }));
}

export function rollDevelopmentProfile(seed, keeper) {
  if (keeper) return "keeper";
  const roll = createStream(seed, "profile")();
  if (roll < PROFILE_WEIGHTS.early) return "early";
  if (roll < PROFILE_WEIGHTS.early + PROFILE_WEIGHTS.late) return "late";
  return "normal";
}

/** The two-year cycle an age belongs to, or null outside the development window. */
export function developmentCycleFor(age) {
  return DEVELOPMENT_AGES.find((target) => target === age || target === age + 1) ?? null;
}

/**
 * OVR change for a cycle. Returns the range and the roll so the UI can show both -
 * this is the transparency half of the double-roll rule.
 */
export function developmentFor(seed, profile, targetAge, role, age) {
  const range = DEVELOPMENT[profile]?.[targetAge];
  if (!range) return { range: [0, 0], total: 0, doubled: false };

  const next = createStream(seed, "development", targetAge);
  const draw = () => range[0] + next() * (range[1] - range[0]);

  const doubled = targetAge >= DOUBLE_ROLL_FROM_AGE && DOUBLE_ROLL_ROLES.includes(role);
  const total = doubled ? Math.min(draw(), draw()) : draw();

  // The cycle spans two seasons, so half lands now and half next year.
  return { range, total, doubled, perSeason: total / 2, age };
}

/** What the player is told before choosing a club - the warning that was missing. */
export function developmentOutlook(state) {
  const target = developmentCycleFor(state.age + 1);
  if (!target) return null;
  const range = DEVELOPMENT[state.profile]?.[target];
  if (!range) return null;
  return {
    targetAge: target,
    range,
    atRisk: target >= DOUBLE_ROLL_FROM_AGE && DOUBLE_ROLL_ROLES.includes(state.lastRole),
  };
}

export function matchesFor(next, role, club, ovr) {
  const [min, max] = role.matches;
  const base = randInt(next, min, max);
  const domestic = effectiveReputation(club, ovr, "domestic");
  return Math.round(base * (CLUB_MATCH_MULTIPLIER[domestic] ?? 1));
}

export function outputFor(next, { group, delta, club, ovr, matches, kind }) {
  const table = kind === "goals" ? GOAL_RATE : ASSIST_RATE;
  const rate = table[group]?.[deltaBand(delta)] ?? 0;
  if (rate <= 0 || matches <= 0) return 0;

  const strength = CLUB_OUTPUT_MULTIPLIER[effectiveReputation(club, ovr, "domestic")] ?? 1;
  const expected = rate * matches * strength * qualityMultiplier(ovr);
  // Spread the season around its expectation rather than returning the mean flat.
  const variance = 0.75 + next() * 0.5;
  return Math.max(0, Math.round(expected * variance));
}

export function titleOddsFor({ trophy, club, ovr, delta, confederation, modifiers = {} }) {
  const spec = TITLE_ODDS[trophy];
  if (!spec) return 0;

  const reputation = effectiveReputation(club, ovr, spec.key);
  let base =
    trophy === "club_world_cup" && confederation === "CONMEBOL"
      ? CLUB_WORLD_CUP_CONMEBOL[reputation] ?? 0
      : spec.odds[reputation] ?? 0;

  base *= multiplierFor(TITLE_DELTA_MULTIPLIER, delta);
  base *= modifiers.titleMultipliers?.all ?? 1;
  base *= modifiers.titleMultipliers?.[trophy] ?? 1;
  return Math.max(0, Math.min(1, base));
}

function rollTitles(seed, season, context) {
  const { club, competition, ovr, delta, role, modifiers } = context;
  const won = [];
  if (modifiers.suspended) return won;

  const trophies = ["league", "cup", "continental_a", "continental_b"];
  if (CLUB_WORLD_CUP_CYCLE(context.age)) trophies.push("club_world_cup");

  // Trophies settled by a big match are not rolled again: the player already took the
  // shot, and rolling on top of that would make the moment decorative.
  const guaranteed = modifiers.guaranteedTitles ?? [];
  const denied = modifiers.deniedTitles ?? [];

  let wonContinentalA = false;
  for (const trophy of trophies) {
    if (denied.includes(trophy) && !guaranteed.includes(trophy)) continue;
    if (guaranteed.includes(trophy)) {
      if (trophy === "continental_a") wonContinentalA = true;
      won.push({
        trophy,
        competitionId: competition?.id ?? null,
        clubId: club.id,
        season,
        age: context.age,
        earned: true,
        decidedOnThePitch: true,
      });
      continue;
    }
    // A side in the main continental cup is not also contesting the second one.
    if (trophy === "continental_b" && (wonContinentalA || context.wonContinentalALastSeason)) {
      continue;
    }
    const odds = titleOddsFor({
      trophy,
      club,
      ovr,
      delta,
      confederation: competition?.confederation,
      modifiers,
    });
    const next = createStream(seed, "title", trophy, season);
    if (chance(next, odds)) {
      if (trophy === "continental_a") wonContinentalA = true;
      won.push({
        trophy,
        competitionId: competition?.id ?? null,
        clubId: club.id,
        season,
        age: context.age,
        // OUR CALL: the cabinet distinguishes what you won from what you attended.
        earned: EARNED_TITLE_ROLES.includes(role.role),
      });
    }
  }
  return won;
}

function rollNationalTeam(seed, season, context) {
  const { country, ovr, age, modifiers } = context;
  if (!country || modifiers.suspended) return null;

  const reputation = country.international_reputation ?? 0;
  const threshold = CALLUP_THRESHOLD[reputation] ?? 99;
  const forced = Boolean(modifiers.forceCallup);
  if (ovr < threshold && !forced) return null;

  const result = { calledUp: true, forced, caps: 0, titles: [] };
  const capsStream = createStream(seed, "national", "caps", season);
  result.caps = randInt(capsStream, 4, 12);

  const continentalRep = country.continental_reputation ?? 0;
  const fifaRep = country.fifa_reputation ?? 0;
  // A final the player took is not rolled again, in either direction. The roll it stood
  // in for was already scaled away when the fixture was drawn.
  const decided = modifiers.guaranteedNationalTitles ?? [];
  const denied = modifiers.deniedNationalTitles ?? [];
  const oddsOf = (trophy, base) =>
    denied.includes(trophy) ? 0 : base * (modifiers.nationalMultipliers?.[trophy] ?? 1);

  if (CONTINENTAL_CYCLE(age)) {
    const next = createStream(seed, "national", "continental", season);
    const odds = oddsOf("continental_nt", CONTINENTAL_WIN[continentalRep] ?? 0);
    if (decided.includes("continental_nt") || chance(next, odds)) {
      result.titles.push({ trophy: "continental_nt", season, age, earned: true });
    }
  }
  if (WORLD_CUP_CYCLE(age)) {
    const qualify = createStream(seed, "national", "qualify", season);
    if (decided.includes("world_cup") || chance(qualify, WORLD_CUP_QUALIFY[fifaRep] ?? 0)) {
      result.playedWorldCup = true;
      const next = createStream(seed, "national", "world-cup", season);
      const odds = oddsOf("world_cup", WORLD_CUP_WIN[fifaRep] ?? 0);
      if (decided.includes("world_cup") || chance(next, odds)) {
        result.titles.push({ trophy: "world_cup", season, age, earned: true });
      }
    }
  }
  return result;
}

function rollAwards(seed, season, context) {
  const { ovr, group, role, titles, goals, competition, modifiers } = context;
  const awards = [];
  if (modifiers.suspended || !AWARD_ELIGIBLE_ROLES.includes(role.role)) return awards;

  const wonLeague = titles.some((t) => t.trophy === "league");
  const wonContinental = titles.some((t) => t.trophy === "continental_a");
  const row = BALLON_DOR.find((entry) => ovr >= entry.minOvr) ?? BALLON_DOR[BALLON_DOR.length - 1];
  let odds = row.none;
  if (wonLeague && wonContinental) odds = row.both;
  else if (wonContinental) odds = row.continental;
  else if (wonLeague) odds = row.league;

  odds *= BALLON_DOR_POSITION_MULTIPLIER[group] ?? 1;
  const ballon = createStream(seed, "award", "ballon", season);
  if (chance(ballon, odds)) {
    awards.push({ award: group === "keeper" ? "golden_glove" : "ballon_dor", season });
  }

  // OUR CALL: open to every league, weighted by how strong that league is.
  const bootRow = GOLDEN_BOOT.find((entry) => goals >= entry.minGoals);
  if (bootRow) {
    const weight = LEAGUE_STRENGTH_WEIGHT[competition?.strength ?? 0] ?? 0.5;
    const boot = createStream(seed, "award", "boot", season);
    if (chance(boot, bootRow.odds * weight)) {
      awards.push({ award: "golden_boot", season, goals });
    }
  }
  return awards;
}

export function marketValue(ovr, age) {
  const row = tableLookup(VALUE_BY_OVR, ovr);
  const multiplier = VALUE_AGE_MULTIPLIER[age] ?? 1.3;
  return Math.round(row.value * multiplier);
}

/** Clubs allowed to look at you this summer, given your OVR. */
export function marketRadius(ovr) {
  return tableLookup(MARKET_RADIUS, ovr);
}

export function buildOffers(seed, season, state, world, count = 3) {
  const radius = marketRadius(state.ovr);
  if (!radius.sameCountry && !radius.sameConfederation && !radius.global) return [];

  const current = world.clubs[state.clubId];
  const currentCompetition = current ? world.competitions[current.competitionId] : null;
  const homeCountry = state.country;
  const homeConfederation = world.countries[homeCountry]?.confederation;

  const candidates = Object.values(world.clubs).filter((club) => {
    if (club.id === state.clubId) return false;
    // Nobody signs a player who is far above or far below the level of the squad.
    const gap = state.ovr - (SQUAD_LEVEL[club.international_reputation] ?? 58);
    return gap >= -12 && gap <= 22;
  });

  const weightOf = (club) => {
    const competition = world.competitions[club.competitionId];
    if (!competition) return 0;
    if (competition.country_fifa_code === homeCountry) return radius.sameCountry || radius.global;
    if (competition.confederation === homeConfederation) {
      return radius.sameConfederation || radius.global;
    }
    return radius.global;
  };

  const next = createStream(seed, "offers", season);
  const offers = [];
  const seen = new Set();
  let guard = 0;
  while (offers.length < count && guard < count * 40 && candidates.length) {
    guard += 1;
    const club = pickWeighted(next, candidates, weightOf);
    if (!club || seen.has(club.id)) continue;
    seen.add(club.id);
    offers.push({
      clubId: club.id,
      competitionId: club.competitionId,
      projectedDelta: state.ovr - squadLevelFor(club, state.ovr),
    });
  }
  // Staying put is always on the table, unless the club has already had enough.
  if (current && !state.clubWantsOut) {
    offers.push({
      clubId: current.id,
      competitionId: currentCompetition?.id ?? null,
      stay: true,
      projectedDelta: state.ovr - squadLevelFor(current, state.ovr),
    });
  }
  return offers;
}

/** Youth offers at 16: three clubs from the player's own country. */
export function youthOffers(seed, state, world, count = 3) {
  const candidates = Object.values(world.clubs).filter((club) => {
    const competition = world.competitions[club.competitionId];
    return competition?.country_fifa_code === state.country;
  });
  if (!candidates.length) {
    // No league modelled for that country - fall back to the confederation.
    const confederation = world.countries[state.country]?.confederation;
    candidates.push(
      ...Object.values(world.clubs).filter(
        (club) => world.competitions[club.competitionId]?.confederation === confederation,
      ),
    );
  }
  const next = createStream(seed, "youth");
  const offers = [];
  const seen = new Set();
  let guard = 0;
  while (offers.length < count && guard < count * 40 && candidates.length) {
    guard += 1;
    // Youth systems: weight towards the mid and small clubs, not the giants.
    const club = pickWeighted(next, candidates, (c) => 6 - (c.international_reputation ?? 0));
    if (!club || seen.has(club.id)) continue;
    seen.add(club.id);
    offers.push({
      clubId: club.id,
      competitionId: club.competitionId,
      projectedDelta: state.ovr - squadLevelFor(club, state.ovr),
    });
  }
  return offers;
}

export function createCareer({
  seed,
  surname = "JUGADOR",
  number = 9,
  foot = "left",
  country,
  position = "DC",
  mode = "intensa",
}) {
  const keeper = isKeeper(position);
  return {
    seed,
    surname,
    number,
    foot,
    country,
    position,
    group: positionGroup(position),
    mode,
    profile: rollDevelopmentProfile(seed, keeper),
    age: START_AGE,
    ovr: START_OVR,
    value: START_VALUE,
    clubId: null,
    lastRole: null,
    /** The deal you are on: years, wage, role promise and buy-out. See contract.js. */
    contract: null,
    /** Idolatría by club id, plus the clubs that will never forgive the way you left. */
    idolatry: {},
    betrayed: {},
    titleClubs: {},
    benchStreak: 0,
    lowRotationStreak: 0,
    clubWantsOut: false,
    seasonsAtClub: 0,
    wonContinentalALastSeason: false,
    modifiers: { titleMultipliers: {} },
    pendingOvr: 0,
    history: [],
    trophies: [],
    awards: [],
    nationalCaps: 0,
    retired: false,
  };
}

/**
 * Simulate a single season at the player's current club and return the next state plus
 * a record of what happened. Pure: same state in, same season out.
 */
export function simulateSeason(state, world, { season }) {
  const club = world.clubs[state.clubId];
  if (!club) throw new Error(`simulateSeason: unknown club ${state.clubId}`);
  const competition = world.competitions[club.competitionId];
  const country = world.countries[state.country];
  const modifiers = state.modifiers ?? { titleMultipliers: {} };
  const keeper = isKeeper(state.position);

  const effectiveOvr = clampOvr(state.ovr + (modifiers.ovrTemp ?? 0));
  const squadLevel = squadLevelFor(club, effectiveOvr);
  const delta = effectiveOvr - squadLevel;

  const bands = keeper ? KEEPER_ROLE_BANDS : ROLE_BANDS;
  let role = roleFor(delta, keeper);
  if (modifiers.forceRole) {
    role = bands.find((b) => b.role === modifiers.forceRole) ?? role;
  } else if (modifiers.roleShift) {
    role = shiftRole(role.role, modifiers.roleShift, keeper);
  }

  // A role promised in the contract is a floor, not a setting: it lifts a player the
  // squad would have left out, and never demotes one who earned better on his own.
  if (modifiers.roleFloor) {
    const floor = bands.findIndex((band) => band.role === modifiers.roleFloor);
    const current = bands.findIndex((band) => band.role === role.role);
    if (floor >= 0 && current > floor) role = bands[floor];
  }

  const matchStream = createStream(state.seed, "matches", season);
  // An injury does not change your standing, only your availability, so it lands on the
  // match count after the role has been decided rather than on the role itself.
  const matches = modifiers.suspended
    ? 0
    : Math.max(0, matchesFor(matchStream, role, club, effectiveOvr) + (modifiers.matchesDelta ?? 0));

  const goalStream = createStream(state.seed, "goals", season);
  const assistStream = createStream(state.seed, "assists", season);
  // Goals scored in the big matches are goals. They are counted on top of the rolled
  // season rather than inside it, because the player put them there by hand.
  const bigMatchGoals = modifiers.suspended ? 0 : modifiers.bonusGoals ?? 0;
  const goals =
    outputFor(goalStream, {
      group: state.group, delta, club, ovr: effectiveOvr, matches, kind: "goals",
    }) + bigMatchGoals;
  const assists = outputFor(assistStream, {
    group: state.group, delta, club, ovr: effectiveOvr, matches, kind: "assists",
  });

  const context = {
    club, competition, country, ovr: effectiveOvr, delta, role, modifiers,
    age: state.age, group: state.group, goals,
    wonContinentalALastSeason: state.wonContinentalALastSeason,
  };
  const titles = rollTitles(state.seed, season, context);
  const national = rollNationalTeam(state.seed, season, context);
  const awards = rollAwards(state.seed, season, { ...context, titles });

  // Promotion and relegation, which invert who is responsible for the result. A play-off
  // or a survival six-pointer the player took a shot in overrides the roll entirely.
  let promoted = false;
  let relegated = false;
  // The multipliers are how a play-off the player did not reach stays as likely as it was
  // before big matches existed: what the decider took, the ordinary roll gives back.
  if (competition?.tier === 2) {
    const odds =
      tableLookup(PROMOTION_ODDS, effectiveOvr).odds * (modifiers.promotionMultiplier ?? 1);
    promoted =
      modifiers.forcePromotion ??
      chance(createStream(state.seed, "promotion", season), odds);
  } else if (effectiveReputation(club, effectiveOvr, "domestic") === 0) {
    const odds = relegationOdds(effectiveOvr) * (modifiers.relegationMultiplier ?? 1);
    relegated =
      modifiers.forceRelegation ?? chance(createStream(state.seed, "relegation", season), odds);
  }
  // Going down wipes the club silverware won on the way.
  const keptTitles = relegated ? [] : titles;

  // Development: half of the two-year cycle lands each season.
  const targetAge = developmentCycleFor(state.age);
  const development = targetAge
    ? developmentFor(state.seed, state.profile, targetAge, role.role, state.age)
    : { perSeason: 0, doubled: false, range: [0, 0] };

  const nextOvr = clampOvr(state.ovr + (development.perSeason ?? 0) + (state.pendingOvr ?? 0));

  const record = {
    season,
    age: state.age,
    clubId: club.id,
    competitionId: competition?.id ?? null,
    ovr: effectiveOvr,
    delta,
    role: role.role,
    matches,
    goals,
    bigMatchGoals,
    assists,
    titles: keptTitles,
    awards,
    national,
    promoted,
    relegated,
    suspended: Boolean(modifiers.suspended),
    value: marketValue(effectiveOvr, state.age),
    development: { ...development, applied: development.perSeason ?? 0 },
  };

  const benchStreak = role.role === "suplente" ? state.benchStreak + 1 : 0;
  const lowRotationStreak = role.role === "rotacion_baja" ? state.lowRotationStreak + 1 : 0;
  const limits = CAREER_MODES[state.mode] ?? CAREER_MODES.intensa;

  const nextState = {
    ...state,
    age: state.age + 1,
    ovr: nextOvr,
    pendingOvr: 0,
    lastRole: role.role,
    benchStreak,
    lowRotationStreak,
    seasonsAtClub: state.seasonsAtClub + 1,
    wonContinentalALastSeason: keptTitles.some((t) => t.trophy === "continental_a"),
    clubWantsOut:
      benchStreak >= limits.benchLimit || lowRotationStreak >= limits.lowRotationLimit,
    value: marketValue(nextOvr, state.age + 1),
    history: [...state.history, record],
    trophies: [
      ...state.trophies,
      ...keptTitles,
      ...(national?.titles ?? []).map((t) => ({ ...t, national: true })),
    ],
    awards: [...state.awards, ...awards],
    nationalCaps: state.nationalCaps + (national?.caps ?? 0),
    // Temporary modifiers expire; deferred ones come due next season.
    modifiers: { titleMultipliers: {} },
    retired: state.age + 1 >= RETIREMENT_AGE,
  };

  return { state: nextState, record };
}

/** Aggregate a finished career into the numbers the summary screen reads from. */
export function careerSummary(state) {
  const totals = state.history.reduce(
    (acc, season) => {
      acc.matches += season.matches;
      acc.goals += season.goals;
      acc.assists += season.assists;
      acc.seasons += 1;
      acc.peakOvr = Math.max(acc.peakOvr, season.ovr);
      acc.peakValue = Math.max(acc.peakValue, season.value);
      return acc;
    },
    { matches: 0, goals: 0, assists: 0, seasons: 0, peakOvr: 0, peakValue: 0 },
  );

  const clubTitles = state.trophies.filter((t) => !t.national);
  return {
    ...totals,
    clubs: [...new Set(state.history.map((s) => s.clubId))],
    titles: clubTitles.length,
    titlesEarned: clubTitles.filter((t) => t.earned).length,
    titlesFromBench: clubTitles.filter((t) => !t.earned).length,
    nationalTitles: state.trophies.filter((t) => t.national).length,
    awards: state.awards.length,
    caps: state.nationalCaps,
    goalsPerMatch: totals.matches ? totals.goals / totals.matches : 0,
  };
}
