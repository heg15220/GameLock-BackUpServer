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

import {
  formFactor,
  fortunateChance,
  poisson,
  standardNormal,
  unfortunateChance,
} from "./fortune.js";
// The model's own a priori estimate of what this player converts in a decider. Only used
// to price a keeper's season, whose year the goal tables cannot see at all.
import { shotScoringRate } from "./bigmatch.js";
import { chance, createStream, pickWeighted, randInt } from "./rng.js";
import {
  continentalQualification,
  playerPull,
  simulateTournamentRun,
  tournamentFor,
} from "./tournaments.js";
import { entrantsFor } from "./qualified.js";
import { TRUST } from "./tone.js";
import {
  AWARD_ELIGIBLE_ROLES,
  BALLON_DOR,
  BALLON_DOR_POSITION_MULTIPLIER,
  CALLUP_THRESHOLD,
  CAREER_MODES,
  CLUB_MATCH_MULTIPLIER,
  CLUB_OUTPUT_MULTIPLIER,
  CONCEDED_DELTA_MULTIPLIER,
  CONCEDED_RATE,
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
  FORM_SIGMA,
  GROWTH,
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
  SEASON_COHESION,
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

/* ── Where a club sits, once the career has moved it ──────────────────────────── */

/**
 * OUR CALL #7: going up and going down are things that happened, not things that were
 * announced.
 *
 * `world.data.json` is a photograph: 574 clubs, each pinned to one competition forever.
 * So the model rolled promotion every year for a second-division side and relegation
 * every year for a small top-flight one, and neither outcome changed anything. Measured
 * over 600 careers, one career was promoted with the same club four times and another was
 * relegated six times - the second division it went down to did not exist, so it was
 * still a first-division club the following August. Promotion was a repeatable ten points
 * of idolatría and relegation was a repeatable trophy-wipe.
 *
 * The world stays immutable - it is shared by every career on the device and half the UI
 * reads it directly. What moves is a per-career overlay: one integer per club, in
 * {-1, 0, +1}, for where this career has left it relative to the photograph. Everything
 * else falls out of that one number:
 *
 *     effective tier = clamp(base tier - shift, 1, 2)
 *
 * which makes a promoted side top-flight (and therefore no longer promotable, and now
 * with something to lose), a relegated one second-tier (and therefore no longer
 * relegatable, and now with something to play for), and the yo-yo club a real arc rather
 * than the same roll over and over.
 */
export const TIERS = { top: 1, second: 2 };

const divisionOf = (divisions, clubId) => divisions?.[clubId] ?? 0;

/** Competitions of a country by tier, computed once per world. */
const TIER_INDEX = new WeakMap();

function tierIndex(world) {
  let index = TIER_INDEX.get(world);
  if (index) return index;
  index = new Map();
  for (const competition of Object.values(world.competitions ?? {})) {
    index.set(`${competition.country_fifa_code}:${competition.tier}`, competition);
  }
  TIER_INDEX.set(world, index);
  return index;
}

/**
 * The club and the competition as this career has left them.
 *
 * Where the world models the division the club has moved into - every second tier in the
 * data has a top flight above it, so promotion always resolves - the club really changes
 * league. Where it does not, the tier moves and the badge on the fixture list does not,
 * and `demoted` says so rather than the UI inventing a league that was never in the data.
 */
export function clubStanding(world, club, divisions = {}) {
  const competition = club ? world.competitions[club.competitionId] ?? null : null;
  const shift = club ? divisionOf(divisions, club.id) : 0;
  if (!club || !shift) {
    return { club, competition, shift: 0, tier: competition?.tier ?? 1, moved: false, demoted: false };
  }

  const baseTier = competition?.tier ?? 1;
  const tier = Math.max(TIERS.top, Math.min(TIERS.second, baseTier - shift));
  const destination =
    tier === baseTier
      ? competition
      : tierIndex(world).get(`${competition?.country_fifa_code}:${tier}`) ?? null;

  return {
    club: {
      ...club,
      domestic_reputation: Math.max(0, Math.min(5, (club.domestic_reputation ?? 0) + shift)),
      competitionId: destination?.id ?? club.competitionId,
    },
    // A competition really at this tier if the world has one, otherwise the old badge with
    // the truth about the division written over it.
    competition: destination ?? (competition ? { ...competition, tier } : null),
    shift,
    tier,
    moved: Boolean(destination) && destination !== competition,
    demoted: shift < 0,
  };
}

/** Fold a season's promotion or relegation into the overlay. Clamped: one rung either way. */
export function shiftDivision(divisions = {}, clubId, { promoted = false, relegated = false }) {
  if (!clubId || (!promoted && !relegated)) return divisions;
  const next = Math.max(-1, Math.min(1, divisionOf(divisions, clubId) + (promoted ? 1 : -1)));
  if (next === divisionOf(divisions, clubId)) return divisions;
  return { ...divisions, [clubId]: next };
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
 * How much of a development cycle a season of this kind actually collects.
 *
 * See OUR CALL #6 in tables.js for why this exists and what the three terms are. The
 * whole thing is a pure function of the season's shape, so the market screen can run it
 * on an offer and print what signing there would do to you - which is the same promise
 * the delta meter and the exit cost already make. A ceiling you can see coming is a
 * decision; one you cannot is a gotcha.
 */
export function growthFactor({ matches = 0, delta = 0, reputation = 0 } = {}) {
  const load = Math.min(GROWTH.minutesCap, Math.max(0, matches) / GROWTH.fullSeason);
  const minutes = GROWTH.minutesFloor + GROWTH.minutesSpan * load ** GROWTH.minutesCurve;

  // An inverted U: too far below and you never get on, too far above and nothing asks a
  // question of you. The peak sits just above your head, where football says it is.
  const off = (delta - GROWTH.challengeAt) / GROWTH.challengeWidth;
  const challenge = Math.max(GROWTH.challengeFloor, GROWTH.challengePeak - GROWTH.challengeFall * off * off);

  const environment = GROWTH.environment[Math.max(0, Math.min(5, reputation))] ?? 1;

  const raw = minutes * challenge * environment * GROWTH.normaliser;
  const factor = Math.max(GROWTH.min, Math.min(GROWTH.max, raw));
  return { factor, minutes, challenge, environment };
}

/** The same factor read backwards, for the half of a career that goes down instead of up. */
export const declineFactor = (growth) =>
  Math.max(GROWTH.declineMin, Math.min(GROWTH.declineMax, 2 - growth));

/**
 * OVR change for a cycle. Returns the range and the roll so the UI can show both -
 * this is the transparency half of the double-roll rule.
 *
 * `growth` is what the season just played is worth (see `growthFactor`). It scales what
 * lands, never the published range: `total` is still the honest draw the panel prints,
 * and `perSeason` is what the player earned of it.
 */
export function developmentFor(seed, profile, targetAge, role, age, growth = 1) {
  const range = DEVELOPMENT[profile]?.[targetAge];
  if (!range) {
    return { range: [0, 0], total: 0, doubled: false, growth: 1, scale: 1, perSeason: 0 };
  }

  const next = createStream(seed, "development", targetAge);
  const draw = () => range[0] + next() * (range[1] - range[0]);

  const doubled = targetAge >= DOUBLE_ROLL_FROM_AGE && DOUBLE_ROLL_ROLES.includes(role);
  const total = doubled ? Math.min(draw(), draw()) : draw();

  // Growing and declining are the same rule read in opposite directions: minutes buy you
  // more of the rise, and they buy you less of the fall. `scale` is the one that actually
  // applied, which is the only one worth printing - in a decline year the growth factor
  // and the number that scaled the draw are not the same, and showing the wrong one
  // tells the reader his best season made him worse.
  const scale = total >= 0 ? growth : declineFactor(growth);

  // The cycle spans two seasons, so half lands now and half next year.
  return { range, total, doubled, growth, scale, perSeason: (total / 2) * scale, age };
}

/**
 * What the player is told before choosing a club - the warning that was missing.
 *
 * `growth` here is the season he has just played, i.e. what the next instalment of the
 * cycle is currently worth to him. The market screen recomputes it per offer with
 * `growthFactor` so the two can be read side by side.
 */
export function developmentOutlook(state, growth = null) {
  const target = developmentCycleFor(state.age + 1);
  if (!target) return null;
  const range = DEVELOPMENT[state.profile]?.[target];
  if (!range) return null;
  const rising = range[1] > 0;
  return {
    targetAge: target,
    /*
     * The two seasons the cycle actually covers, because the landing age on its own reads
     * as next year and is not. A cycle runs two years and is named after the one it ends
     * on, so a player of 18 is entering the cycle that lands at 20 - and the panel, showing
     * "20" beside a heading that says "next", was telling him he would be twenty next
     * season. It also held the same number two years running, which no "next year" does.
     */
    covers: [target - 1, target],
    range,
    atRisk: target >= DOUBLE_ROLL_FROM_AGE && DOUBLE_ROLL_ROLES.includes(state.lastRole),
    rising,
    growth,
    // What the range becomes at the growth the last season earned, which is the number
    // the player is really choosing between when he reads the offers.
    effective: growth
      ? range.map((bound) => bound * (bound >= 0 ? growth : declineFactor(growth)))
      : range,
  };
}

/**
 * Where the club finished.
 *
 * THE ONE THING A SEASON NEVER SAID. A record has told us for a long time whether the league
 * was won, whether the club went up and whether it went down, and nothing in between - so
 * "finish in the top four" was not a rule the game could evaluate, it was a question about a
 * number that did not exist. Continental football was therefore drawn from reputation alone,
 * and a small club that won its league had exactly the same chance of a European campaign as
 * one that finished last.
 *
 * Derived rather than rolled. Everything here already decided the season: the level of the
 * squad, the player's distance from it, and the latent that makes a club's year hang
 * together (LOW IS A GOOD YEAR - see fortune.js). Adding a fresh die would let the table
 * disagree with the trophies it is supposed to explain; reading the same ones means the
 * position is simply the shape those numbers already had, given a name.
 *
 * Three anchors keep it honest, and they are checks on the model rather than decoration:
 * champions finish first, relegated sides finish in the drop, and a promoted side came up.
 * Anything that contradicts those is not a table, it is noise with a number on it.
 */
/**
 * How many places the drop zone is.
 *
 * Three is the figure nearly every twenty-side league uses, and it is the one number that
 * has to be shared by the two halves of this: the places a relegated club is put INTO, and
 * the places a surviving club must be kept OUT of. They were two separate constants by
 * accident - `size - 2` on one branch and nothing at all on the other - which is exactly
 * how a club could stay up in twentieth.
 */
export const RELEGATION_PLACES = 3;

export function leaguePosition({
  club,
  ovr = 70,
  delta = 0,
  latent = 0,
  wonLeague = false,
  relegated = false,
  promoted = false,
  size = 20,
}) {
  if (wonLeague) return 1;

  const reputation = club ? effectiveReputation(club, ovr, "domestic") : 0;
  // Where a side of this standing finishes in an ordinary year, as a fraction of the table.
  const EXPECTED = [0.82, 0.66, 0.5, 0.34, 0.18, 0.08];
  const base = EXPECTED[reputation] ?? 0.5;

  // A player well above the squad drags it up the table, and one well below does not.
  const lift = Math.max(-0.08, Math.min(0.08, delta / 250));
  // The club's own year. A whole standard deviation is worth about a fifth of the table.
  const year = Math.max(-0.22, Math.min(0.22, latent * 0.2));

  const spot = Math.round((base - lift + year) * (size - 1)) + 1;
  const placed = Math.max(1, Math.min(size, spot));

  // A side that went down finished in the drop, whatever the arithmetic said; one that came
  // up won its division or was right behind whoever did.
  if (relegated) return Math.max(size - RELEGATION_PLACES + 1, placed);
  if (promoted) return Math.min(2, placed);

  /*
   * AND A SIDE THAT STAYED UP DID NOT FINISH IN THE DROP.
   *
   * This clamp only ever ran one way. `relegated` pushed a club down into the last three;
   * nothing pulled a club back out of them, so the position - which is derived from
   * reputation and the year's form, not from the relegation roll - was free to land on
   * 20th in a season the club stayed up. Measured over a sweep of the form draw, a
   * reputation-0 side finished in the relegation places in 44% of the seasons it survived
   * and dead last in 31% of them: the front page read "Posición final en liga: 20.º" with
   * no drop, no descent screen and a career that carried on in the first division.
   *
   * The fix is on this side of the line rather than the other, deliberately. Deriving
   * `relegated` from the table instead would be re-rolling the drop off a number that was
   * never meant to decide it, and `relegationOdds` is a balance table with measured
   * behaviour behind it. So the RESULT stands and the table is made to agree with it: the
   * safe places are compressed into 2..(size - RELEGATION_PLACES), which keeps the shape -
   * a poor side still finishes near the bottom of what survival looks like - without ever
   * printing a position the season did not mean.
   */
  const safeLast = Math.max(2, size - RELEGATION_PLACES);
  const squeezed = 2 + ((placed - 2) * (safeLast - 2)) / Math.max(1, size - 2);
  // Only the champion is first.
  return Math.max(2, Math.min(safeLast, Math.round(squeezed)));
}

export function matchesFor(next, role, club, ovr) {
  const [min, max] = role.matches;
  const base = randInt(next, min, max);
  const domestic = effectiveReputation(club, ovr, "domestic");
  return Math.round(base * (CLUB_MATCH_MULTIPLIER[domestic] ?? 1));
}

/**
 * A season's goals or assists.
 *
 * `form` is the season's multiplicative form factor (mean 1, drawn once and shared with
 * everything else that happened that year - see fortune.js). The count around it is
 * Poisson, so the spread of a tally falls with its size the way a real one does, and both
 * the form and the count are unbiased: the expectation is exactly the rate table.
 */
/**
 * What the season asked of him, before the dice.
 *
 * Pulled out of `outputFor` and exported because this number is the yardstick the season
 * gets marked against: `seasonBand` in report.js reads what he actually did against what
 * was expected of a player in that role, at that club, over that many matches. It used to
 * be computed here, used once and thrown away, which is why the form stamp had nothing to
 * compare a tally to and could only report the dice.
 */
export function expectedOutput({ group, delta, club, ovr, matches, kind }) {
  const table = kind === "goals" ? GOAL_RATE : ASSIST_RATE;
  const rate = table[group]?.[deltaBand(delta)] ?? 0;
  if (rate <= 0 || matches <= 0) return 0;

  const strength = CLUB_OUTPUT_MULTIPLIER[effectiveReputation(club, ovr, "domestic")] ?? 1;
  return rate * matches * strength * qualityMultiplier(ovr);
}

export function outputFor(next, { form = 1, ...spec }) {
  const expected = expectedOutput(spec);
  if (expected <= 0) return 0;
  return poisson(next, expected * Math.max(0, form));
}

/**
 * Los goles que entraron detrás de él.
 *
 * La única cifra que mide la temporada de quien defiende, y por eso se dibuja igual que
 * las otras: una expectativa del club corregida por el jugador, y un Poisson alrededor.
 *
 * `stops` son las paradas y entradas decisivas que hizo A MANO en las noches grandes. Se
 * restan aquí por la misma razón por la que los goles de esas noches se SUMAN al delantero
 * un poco más abajo: son los que puso él, y la ficha tiene que decirlo. Un portero que
 * saca un penalti en una final ha evitado un gol, y su línea del año debe notarlo.
 */
export function expectedConceded({ club, ovr, delta, matches }) {
  if (matches <= 0) return 0;
  const base = CONCEDED_RATE[effectiveReputation(club, ovr, "domestic")] ?? CONCEDED_RATE[3];
  return base * matches * (CONCEDED_DELTA_MULTIPLIER[deltaBand(delta)] ?? 1);
}

export function concededFor(next, { form = 1, stops = 0, ...spec }) {
  const expected = expectedConceded(spec);
  if (expected <= 0) return 0;
  // La forma de la temporada se INVIERTE aquí: un buen año del club es encajar menos, y
  // `form` tiene media 1 con el bien hacia arriba. Sin esto, el año en que todo salió
  // redondo sería también el año en que más goles entraron.
  const drawn = poisson(next, expected / Math.max(0.2, form));
  return Math.max(0, drawn - stops);
}

export function titleOddsFor({
  trophy,
  club,
  ovr,
  delta,
  confederation,
  continentalEntry = null,
  modifiers = {},
}) {
  const spec = TITLE_ODDS[trophy];
  if (!spec) return 0;

  // Continental cups are invitations earned the previous year, not reputation lotteries.
  // `null` preserves compatibility for isolated engine calls; real careers always pass an
  // entry once a previous table exists.
  if (continentalEntry) {
    if (trophy === "continental_a" && continentalEntry.level !== "main") return 0;
    if (trophy === "continental_b" && continentalEntry.level !== "secondary") return 0;
  }

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

/**
 * One trophy, rolled.
 *
 * Pulled out so that a FINAL can be resolved the moment it is played instead of at the end
 * of the season - see `settleFinal` in career.js. The narration prints a scoreline for that
 * match, and a scoreline is a claim about the trophy: a cup final that ends 0-1 on screen
 * and then appears in the cabinet is the game contradicting itself in the two places the
 * player is looking. Same stream, same odds, same answer - only asked earlier.
 */
export function rollTitle(seed, season, trophy, context) {
  const { club, competition, ovr, delta, modifiers, latent = 0, continentalEntry = null } = context;
  const odds = titleOddsFor({
    trophy,
    club,
    ovr,
    delta,
    confederation: competition?.confederation,
    continentalEntry,
    modifiers,
  });
  const next = createStream(seed, "title", trophy, season);
  // Exactly `odds`, but in sympathy with the rest of the club's year: this is where
  // doubles come from, and where a barren season stays barren.
  return fortunateChance(next, odds, latent, SEASON_COHESION[trophy] ?? 0);
}

/** What the year the club is having looks like, before anything in it is rolled. */
export const seasonLatent = (seed, season) =>
  standardNormal(createStream(seed, "fortune", season));

/**
 * A reproducible snapshot of the whole domestic table for this season.
 *
 * The career used to know only where the player's club finished. That was enough for
 * qualification, but not enough to answer the more human question: who are we actually
 * fighting in the table? This snapshot gives every club in the current division the same
 * ingredients as the player's side: standing, a season-wide form draw and a deterministic
 * tie break. Low latent is a good year, just like everywhere else in this engine.
 *
 * `club` may be the moved copy returned by `clubStanding`. When promotion or relegation
 * puts it in a competition in which the immutable world does not list it, it replaces one
 * entrant rather than creating a 21-team league.
 */
export function simulateLeagueTable({
  seed,
  season,
  world,
  club,
  competition,
  ovr = 70,
  delta = 0,
  latent = null,
}) {
  if (!world?.clubs || !club || !competition) return [];

  const registered = Object.values(world.clubs).filter(
    (candidate) => candidate.competitionId === competition.id && candidate.id !== club.id,
  );
  const originalInDivision = world.clubs[club.id]?.competitionId === competition.id;
  const targetSize = Math.max(2, registered.length + (originalInDivision ? 1 : 0));

  // A promoted side replaces a weak top-flight entrant; a relegated side replaces a
  // strong second-tier entrant. Which exact club moves is data we do not model, so the id
  // tie-break makes that missing half of the exchange stable and inspectable.
  let entrants = registered;
  if (!originalInDivision && registered.length >= targetSize) {
    const weakestFirst = [...registered].sort(
      (a, b) =>
        (a.domestic_reputation ?? 0) - (b.domestic_reputation ?? 0) ||
        String(a.id).localeCompare(String(b.id)),
    );
    const displaced = competition.tier === 1 ? weakestFirst[0] : weakestFirst.at(-1);
    entrants = registered.filter((candidate) => candidate.id !== displaced?.id);
  }
  entrants = [...entrants, club];

  const ratingFor = (candidate) => {
    const isPlayerClub = candidate.id === club.id;
    const reputation = isPlayerClub
      ? effectiveReputation(candidate, ovr, "domestic")
      : candidate.domestic_reputation ?? 0;
    const year = isPlayerClub && latent != null
      ? latent
      : standardNormal(createStream(seed, "league-form", season, candidate.id));
    // Twelve points per reputation rung preserves the hierarchy; annual form can still
    // produce a Leicester-shaped surprise. The user's contribution is worth at most one
    // rung, so a star can drag a side upwards without making the other ten irrelevant.
    const playerLift = isPlayerClub ? Math.max(-12, Math.min(12, delta * 1.2)) : 0;
    return reputation * 12 - year * 9 + playerLift;
  };

  const ranked = entrants
    .map((candidate) => ({ clubId: candidate.id, rating: ratingFor(candidate) }))
    .sort(
      (a, b) => b.rating - a.rating || String(a.clubId).localeCompare(String(b.clubId)),
    );

  const span = Math.max(1, ranked.length - 1);
  return ranked.map((row, index) => ({
    clubId: row.clubId,
    position: index + 1,
    // Points are presentation and matchup context, not a second result roll. Keeping them
    // monotonic guarantees that the printed table can never disagree with its positions.
    points: Math.round(84 - (index * 56) / span),
    rating: Number(row.rating.toFixed(3)),
  }));
}

/**
 * The two competitions a COUNTRY plays, and where their odds actually live.
 *
 * `rollTitle` above reads `TITLE_ODDS`, which is a table of club competitions and has no row
 * for either of these - a country's chance comes off its own reputation, not off the badge
 * of whoever pays its striker. Asking that table about a World Cup returns zero, and zero
 * odds is not a long shot, it is a tournament that cannot be won.
 *
 * That is exactly what `settleFinal` was doing when it answered a national final: every one
 * of them was narrated as a defeat, and then `rollNationalTeam` - which had never been
 * taught to honour a settled final in the first place - rolled the trophy again at the end
 * of the season and handed it over in the ceremony. The player watched his country lose 2-3
 * and lifted the cup ten seconds later.
 *
 * So both sides read this, and only this. Same stream, same odds, same answer as the season
 * would have produced on its own - the club path's rule, applied to the country.
 */
export function rollNationalTitle(seed, season, trophy, { country, modifiers = {} } = {}) {
  if (!country) return false;

  const base =
    trophy === "world_cup"
      ? WORLD_CUP_WIN[country.fifa_reputation ?? 0] ?? 0
      : trophy === "continental_nt"
        ? CONTINENTAL_WIN[country.continental_reputation ?? 0] ?? 0
        : 0;
  // The same key the season uses, so asking early and asking late are the same question.
  const key = trophy === "world_cup" ? "world-cup" : "continental";
  const next = createStream(seed, "national", key, season);
  return chance(next, base * (modifiers.nationalMultipliers?.[trophy] ?? 1));
}

/** Which trophies belong to the country rather than to the club. */
export const NATIONAL_TROPHIES = ["world_cup", "continental_nt"];

function rollTitles(seed, season, context) {
  const { club, competition, role, modifiers, latent = 0 } = context;
  const won = [];
  if (modifiers.suspended) return won;

  const trophies = ["league", "cup", "continental_a", "continental_b"];
  if (CLUB_WORLD_CUP_CYCLE(context.age)) trophies.push("club_world_cup");

  // A trophy the player took a decider in is still rolled - his shot moved the odds a
  // long way but did not close them, which is what `DECIDES` is for. What the list gives
  // us is the right to say afterwards that this one came down to a night he was on.
  const decided = modifiers.decidedTrophies ?? [];

  let wonContinentalA = false;
  for (const trophy of trophies) {
    // A side in the main continental cup is not also contesting the second one.
    if (trophy === "continental_b" && (wonContinentalA || context.wonContinentalALastSeason)) {
      continue;
    }
    /*
     * A final that was played out on screen has already been answered, and the answer is
     * on the scoreboard the player watched. Re-rolling it here is what let a cup be lost
     * 0-1 in the narration and lifted in the ceremony ten seconds later.
     */
    const settled = modifiers.settledTitles?.[trophy];
    const takes =
      settled === undefined
        ? rollTitle(seed, season, trophy, { ...context, latent })
        : settled;
    if (takes) {
      if (trophy === "continental_a") wonContinentalA = true;
      const onThePitch = decided.includes(trophy);
      won.push({
        trophy,
        competitionId: competition?.id ?? null,
        clubId: club.id,
        season,
        age: context.age,
        // OUR CALL: the cabinet distinguishes what you won from what you attended - and
        // a trophy you took the decisive shot in was never attended.
        earned: onThePitch || EARNED_TITLE_ROLES.includes(role.role),
        decidedOnThePitch: onThePitch,
      });
    }
  }
  return won;
}

function rollNationalTeam(seed, season, context) {
  const { country, ovr, age, group, modifiers } = context;
  if (!country || modifiers.suspended) return null;

  const settled = modifiers.settledTitles ?? {};
  /*
   * A national final that was played out on screen is proof of a call-up, whichever way it
   * went. Without this the threshold below could still throw the whole tournament away - a
   * card that costs him a couple of points on the night is enough - and the player would
   * have watched his country win a World Cup that never reaches the cabinet.
   */
  const played = NATIONAL_TROPHIES.some((trophy) => settled[trophy] !== undefined);

  const reputation = country.international_reputation ?? 0;
  const threshold = CALLUP_THRESHOLD[reputation] ?? 99;
  const forced = Boolean(modifiers.forceCallup);
  if (ovr < threshold && !forced && !played) return null;

  const result = { calledUp: true, forced, caps: 0, titles: [] };
  const capsStream = createStream(seed, "national", "caps", season);
  result.caps = randInt(capsStream, 4, 12);

  /*
   * The selection used to record only appearances, so a striker could score in a World
   * Cup final on screen and retire with no international goals anywhere in his record.
   * These rates are deliberately separate from club output: international calendars are
   * shorter and every appearance is against a stronger pool. They are pure and modest,
   * with OVR providing a bounded quality lift and the player's position deciding what is
   * plausible. A keeper records saves instead of being handed a fake scoring line.
   */
  const NATIONAL_RATE = {
    keeper: { goals: 0, assists: 0, saves: 3.1 },
    defensive: { goals: 0.07, assists: 0.06, saves: 0 },
    support: { goals: 0.13, assists: 0.21, saves: 0 },
    creator: { goals: 0.19, assists: 0.28, saves: 0 },
    forward: { goals: 0.42, assists: 0.14, saves: 0 },
  };
  const rates = NATIONAL_RATE[group] ?? NATIONAL_RATE.support;
  const quality = Math.max(0.75, Math.min(1.25, 1 + (ovr - 75) / 80));
  result.goals = poisson(
    createStream(seed, "national", "goals", season),
    result.caps * rates.goals * quality,
  ) + (modifiers.nationalBonusGoals ?? 0);
  result.assists = poisson(
    createStream(seed, "national", "assists", season),
    result.caps * rates.assists * quality,
  ) + (modifiers.nationalBonusAssists ?? 0);
  if (group === "keeper") {
    result.saves = poisson(
      createStream(seed, "national", "saves", season),
      result.caps * rates.saves * quality,
    ) + (modifiers.nationalBonusSaves ?? 0);
  }

  const fifaRep = country.fifa_reputation ?? 0;
  // A final the player took is still played out - the shot moved the odds, it did not end
  // the argument. What standing in one does settle is that he got there.
  const decided = modifiers.decidedTrophies ?? [];
  const reached = modifiers.nationalReached ?? [];

  /*
   * A final that was played out on screen has already been answered, and the answer is the
   * scoreboard the player watched - the same rule `rollTitles` follows for a club cup. This
   * is the half of it that was missing: the country's two trophies were re-rolled here no
   * matter what the narration had just shown, so a final lost 2-3 still played the ceremony.
   */
  const takes = (trophy) =>
    settled[trophy] === undefined
      ? rollNationalTitle(seed, season, trophy, { country, modifiers })
      : settled[trophy];

  const lift = (trophy) => {
    result.titles.push({
      trophy,
      season,
      age,
      earned: true,
      decidedOnThePitch: decided.includes(trophy),
    });
  };

  if (CONTINENTAL_CYCLE(age)) {
    if (takes("continental_nt")) lift("continental_nt");
  }
  if (WORLD_CUP_CYCLE(age)) {
    const qualify = createStream(seed, "national", "qualify", season);
    if (reached.includes("world_cup") || chance(qualify, WORLD_CUP_QUALIFY[fifaRep] ?? 0)) {
      result.playedWorldCup = true;
      if (takes("world_cup")) lift("world_cup");
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

  // The club you would be staying at is the one the career left, division and all.
  const currentStandingHere = clubStanding(world, world.clubs[state.clubId], state.divisions);
  const current = currentStandingHere.club;
  const currentCompetition = currentStandingHere.competition;
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
    /** Where this career has left each club it moved: -1 down, +1 up. See `clubStanding`. */
    divisions: {},
    /**
     * Every decisive chance he has had, and how many went in. The season planner prices
     * its deciders off this rather than off an assumption - see `conversionRate`.
     */
    conversion: { taken: 0, scored: 0 },
    /*
     * What the people who pay him make of him. Moved by what he says in a press room and
     * by nothing else - see tone.js - and read by `clubWantsOut` in career.js.
     */
    trust: TRUST.start,
    /*
     * Where he has been putting them lately. Read by the opposition keeper rather than by
     * the model - a placement you keep using is one he is standing on. See keeper.js.
     */
    shots: [],
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
export function simulateSeason(state, world, { season, tournamentRuns: prebuiltRuns = null }) {
  const registered = world.clubs[state.clubId];
  if (!registered) throw new Error(`simulateSeason: unknown club ${state.clubId}`);
  // Not the club the data describes - the club this career has left behind it.
  const standing = clubStanding(world, registered, state.divisions);
  const club = standing.club;
  const competition = standing.competition;
  const country = world.countries[state.country];
  const modifiers = state.modifiers ?? { titleMultipliers: {} };
  const keeper = isKeeper(state.position);

  const effectiveOvr = clampOvr(state.ovr + (modifiers.ovrTemp ?? 0));
  const squadLevel = squadLevelFor(club, effectiveOvr);
  const delta = effectiveOvr - squadLevel;
  const previous = state.history?.[state.history.length - 1] ?? null;
  const previousAtClub = previous?.clubId === club.id ? previous : null;
  const continentalEntry = continentalQualification({
    position: previousAtClub?.position ?? null,
    confederation: competition?.confederation,
    tier: standing.tier,
    wonMain: Boolean(previousAtClub?.titles?.some((title) => title.trophy === "continental_a")),
    wonCup: Boolean(previousAtClub?.titles?.some((title) => title.trophy === "cup")),
    reputation: effectiveReputation(club, effectiveOvr, "continental"),
  });

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

  // How the year went for everybody at this club, drawn once. Low is good. Every outcome
  // below leans on it by its own amount, which is what makes a season a season instead of
  // a handful of unrelated coins - and none of it moves a single average. See fortune.js.
  const fortuneStream = createStream(state.seed, "fortune", season);
  const latent = standardNormal(fortuneStream);
  const form = formFactor(latent, fortuneStream, FORM_SIGMA, SEASON_COHESION.form);

  const goalStream = createStream(state.seed, "goals", season);
  const assistStream = createStream(state.seed, "assists", season);
  // Goals scored in the big matches are goals, and the last pass that won a final is an
  // assist. Both are counted on top of the rolled season rather than inside it, because
  // the player put them there by hand. A decisive SAVE adds to neither - it is already
  // paid for in the trophy the shot settled, and a keeper's scoring rate is zero.
  const bigMatchGoals = modifiers.suspended ? 0 : modifiers.bonusGoals ?? 0;
  const bigMatchAssists = modifiers.suspended ? 0 : modifiers.bonusAssists ?? 0;
  const spec = { group: state.group, delta, club, ovr: effectiveOvr, matches };
  const goals = outputFor(goalStream, { ...spec, kind: "goals", form }) + bigMatchGoals;
  const assists = outputFor(assistStream, { ...spec, kind: "assists", form }) + bigMatchAssists;
  /*
   * Lo que entró detrás de él. Se calcula SIEMPRE, aunque sólo la vean el portero y la
   * línea defensiva (ver `showsConceded`): encajar le pasa al equipo entero, y una cifra
   * que sólo existe para quien la mira acaba siendo una cifra que nadie puede comprobar.
   */
  const conceded = concededFor(createStream(state.seed, "conceded", season), {
    ...spec,
    form,
    stops: modifiers.suspended ? 0 : modifiers.bonusStops ?? 0,
  });

  /*
   * What the year asked of him, kept beside what he did with it.
   *
   * This is the whole of the form read-out now (see `seasonBand`). The big-match goals are
   * NOT in here on purpose: they are the ones he put in himself, so leaving them out of the
   * expectation and in the tally is exactly what makes converting a final read as a season
   * above what was asked. A keeper has no expectation at all - `GOAL_RATE.keeper` is zero -
   * so his year is measured on the deciders he came through instead, and those are priced
   * off the model's own estimate of him before this season's went into it.
   */
  const expected = {
    goals: expectedOutput({ ...spec, kind: "goals" }),
    assists: expectedOutput({ ...spec, kind: "assists" }),
  };
  const taken = modifiers.suspended ? 0 : modifiers.deciders?.taken ?? 0;
  const deciders = {
    taken,
    converted: modifiers.suspended ? 0 : modifiers.deciders?.converted ?? 0,
    expected: taken * shotScoringRate(effectiveOvr),
  };

  const context = {
    club, competition, country, ovr: effectiveOvr, delta, role, modifiers, latent,
    age: state.age, group: state.group, goals,
    wonContinentalALastSeason: state.wonContinentalALastSeason,
    continentalEntry,
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
      fortunateChance(
        createStream(state.seed, "promotion", season),
        odds,
        latent,
        SEASON_COHESION.promotion,
      );
  } else if (effectiveReputation(club, effectiveOvr, "domestic") === 0) {
    const odds = relegationOdds(effectiveOvr) * (modifiers.relegationMultiplier ?? 1);
    // The one outcome the season's fortune should make LESS likely: a side having its
    // best year in a decade does not go down with it.
    relegated =
      modifiers.forceRelegation ??
      unfortunateChance(
        createStream(state.seed, "relegation", season),
        odds,
        latent,
        SEASON_COHESION.relegation,
      );
  }
  // Going down wipes the club silverware won on the way.
  const keptTitles = relegated ? [] : titles;

  // Development: half of the two-year cycle lands each season, scaled by the season that
  // was actually played. A year on the bench at a giant no longer develops you the same
  // as a year carrying a side that needed you.
  const growth = growthFactor({
    matches,
    delta,
    reputation: effectiveReputation(club, effectiveOvr, "international"),
  });
  const targetAge = developmentCycleFor(state.age);
  const development = targetAge
    ? developmentFor(state.seed, state.profile, targetAge, role.role, state.age, growth.factor)
    : { perSeason: 0, doubled: false, range: [0, 0], growth: growth.factor };

  const nextOvr = clampOvr(state.ovr + (development.perSeason ?? 0) + (state.pendingOvr ?? 0));

  const position = leaguePosition({
    club,
    ovr: effectiveOvr,
    delta,
    latent,
    wonLeague: keptTitles.some((title) => title.trophy === "league"),
    relegated,
    promoted,
    size: Math.max(2, Object.values(world.clubs).filter((candidate) => candidate.competitionId === club.competitionId).length),
  });
  const nextContinentalEntry = continentalQualification({
    position,
    confederation: competition?.confederation,
    tier: relegated ? 2 : standing.tier,
    wonMain: keptTitles.some((title) => title.trophy === "continental_a"),
    wonCup: keptTitles.some((title) => title.trophy === "cup"),
    reputation: effectiveReputation(club, effectiveOvr, "continental"),
  });

  /*
   * The two tournaments the season can put the player's side into, drawn from the sides that
   * really qualified for them rather than from every club in the confederation - see
   * qualified.js. The player's own club is passed in explicitly because the real list
   * obviously does not name a side the career has just taken there for the first time.
   */
  /*
   * THE BRACKETS ARE HANDED IN, NOT DRAWN HERE.
   *
   * They used to be drawn at this point, backwards from the trophies just rolled above -
   * which is exactly why a continental run could only ever be told AFTER the season, behind
   * the final that season had already played as a standalone decider. A competition
   * described twice, in the wrong order.
   *
   * `career.js` builds them with the season's plan now (see `stageTournaments`), plays their
   * ties in the order football plays them, and hands the finished runs back here to be
   * recorded. Falling back to drawing them keeps this function usable on its own, which the
   * engine tests and any caller outside the career loop rely on.
   */
  const recentMatches = (state.history ?? [])
    .slice(-2)
    .reverse()
    .map((entry) => entry.matches ?? 0);
  const pull = playerPull({ ovr: effectiveOvr, matches, previous: recentMatches });

  let tournamentRuns = prebuiltRuns ?? [];
  if (!prebuiltRuns) {
    const clubTournament = tournamentFor({ confederation: competition?.confederation, club: true });
    if (clubTournament && continentalEntry.level === "main") {
      tournamentRuns.push(simulateTournamentRun({
        id: clubTournament.id,
        seed: state.seed,
        season,
        entrants: entrantsFor(clubTournament.id, world, { include: [club] }),
        player: club,
        pull,
        champion: keptTitles.some((title) => title.trophy === "continental_a"),
      }));
    }
    if (national?.playedWorldCup) {
      tournamentRuns.push(simulateTournamentRun({
        id: "world_cup",
        seed: state.seed,
        season,
        entrants: entrantsFor("world_cup", world, { include: country ? [country] : [] }),
        player: country,
        pull,
        champion: national.titles?.some((title) => title.trophy === "world_cup"),
      }));
    }
  }

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
    /*
     * Where the club finished. Derived from the same numbers that decided everything above
     * it - see `leaguePosition` - so the table cannot contradict the trophies it explains,
     * and recorded here because the summer after this one has to read it: a Champions League
     * place is a finishing position, not a reputation.
     */
    position,
    continentalEntry,
    nextContinentalEntry,
    tournamentRuns: tournamentRuns.filter(Boolean),
    // Which division this was actually played in, which is not always the one on the badge.
    division: { tier: standing.tier, shift: standing.shift, demoted: standing.demoted },
    suspended: Boolean(modifiers.suspended),
    value: marketValue(effectiveOvr, state.age),
    // How the year went for the club, and how the player felt in it. Kept on the record
    // so the report and the press can say so instead of only printing the tally.
    fortune: { latent, form },
    // What was asked of him, and the deciders he was handed. `seasonBand` marks the season
    // against these; nothing in the model reads them.
    expected,
    conceded,
    deciders,
    growth,
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
    // Where the club now is. A side that just went up is not promotable again next
    // August, and one that just went down has a season to play its way back.
    divisions: shiftDivision(state.divisions, club.id, { promoted, relegated }),
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
      acc.conceded += season.conceded ?? 0;
      acc.seasons += 1;
      acc.peakOvr = Math.max(acc.peakOvr, season.ovr);
      acc.peakValue = Math.max(acc.peakValue, season.value);
      acc.bestLeagueFinish = season.position
        ? Math.min(acc.bestLeagueFinish ?? season.position, season.position)
        : acc.bestLeagueFinish;
      acc.topFourFinishes += season.division?.tier === 1 && season.position <= 4 ? 1 : 0;
      acc.promotions += season.promoted ? 1 : 0;
      acc.relegations += season.relegated ? 1 : 0;
      return acc;
    },
    {
      matches: 0,
      goals: 0,
      assists: 0,
      conceded: 0,
      seasons: 0,
      peakOvr: 0,
      peakValue: 0,
      bestLeagueFinish: null,
      topFourFinishes: 0,
      promotions: 0,
      relegations: 0,
    },
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
    contributions: totals.goals + totals.assists,
    contributionsPerMatch: totals.matches
      ? (totals.goals + totals.assists) / totals.matches
      : 0,
    leagueTitles: state.trophies.filter((t) => !t.national && t.trophy === "league").length,
    continentalTitles: state.trophies.filter(
      (t) => !t.national && (t.trophy === "continental_a" || t.trophy === "continental_b"),
    ).length,
    worldCups: state.trophies.filter((t) => t.national && t.trophy === "world_cup").length,
  };
}
