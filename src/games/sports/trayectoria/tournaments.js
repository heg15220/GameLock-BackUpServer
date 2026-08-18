/**
 * The five tournaments, in their real shape.
 *
 * Until now a continental run was one night: `semifinal_continental` or `final_continental`
 * fired, you took a shot, and the rest of the competition was a probability. That is fine
 * as an abstraction and useless as a story - a player who reaches a European Cup final
 * should be able to say which side he knocked out on the way, and the game had no idea.
 *
 * This is the format and nothing else: how many teams, how they are divided, and which
 * rounds a side has to come through to lift it. No React, no seed, no simulation - the
 * bracket a real edition would print before a ball is kicked. Everything that draws a run,
 * places a decisive night in it or narrates one reads its structure from here, so there is
 * exactly one description of what the European Cup is.
 *
 * WHY DECLARATIVE. Every one of these formats has changed in the last ten years and the
 * World Cup changes again. A table that says "twelve groups of four, top two and the eight
 * best thirds" is a thing anyone can check against reality in ten seconds; the same rule
 * expressed as code is a thing nobody checks at all.
 */

import { createStream, randInt } from "./rng.js";

/**
 * A knockout round, named by how many sides are in it when it starts.
 *
 * How many LEGS it is played over belongs to the tournament, not to the round: a European
 * quarter-final is two matches and a World Cup quarter-final is one, and they are the same
 * round. See `legsOf`.
 */
export const ROUNDS = {
  /** Champions only: 9th to 24th, sixteen sides playing for eight places in the last 16. */
  playoff: { id: "playoff", teams: 16, feeds: 8 },
  r32: { id: "r32", teams: 32, feeds: 16 },
  r16: { id: "r16", teams: 16, feeds: 8 },
  quarter: { id: "quarter", teams: 8, feeds: 4 },
  semi: { id: "semi", teams: 4, feeds: 2 },
  final: { id: "final", teams: 2, feeds: 1 },
};

/**
 * Legs. Club knockouts are two matches and the final is one; a finals tournament played in
 * one country is one match throughout.
 */
export const legsOf = (id, round) =>
  TOURNAMENTS[id]?.club && round !== "final" ? 2 : 1;

/**
 * The five, as they are actually played.
 *
 * `groups` is the group or league phase; `knockout` is the road from there to the cup. A
 * national-team tournament plays its knockouts over one leg because it is a finals
 * tournament in one country - which is also why its final is not two legs either.
 */
export const TOURNAMENTS = {
  /**
   * The 2024 reform: no groups at all. One league of 36 where everybody plays eight
   * different opponents, the top eight go straight through and 9th-24th play a two-legged
   * tie for the other eight places in the last sixteen.
   */
  champions: {
    id: "champions",
    trophy: "continental_a",
    confederation: "UEFA",
    club: true,
    teams: 36,
    phase: { kind: "league", matches: 8, direct: 8, playoff: [9, 24] },
    knockout: ["playoff", "r16", "quarter", "semi", "final"],
    neutralFinal: true,
  },

  /** Thirty-two in eight groups of four, top two through, and a one-off final. */
  libertadores: {
    id: "libertadores",
    trophy: "continental_a",
    confederation: "CONMEBOL",
    club: true,
    teams: 32,
    phase: { kind: "groups", groups: 8, perGroup: 4, qualify: 2 },
    knockout: ["r16", "quarter", "semi", "final"],
    neutralFinal: true,
  },

  /** Twenty-four in six groups of four: top two, plus the four best third places. */
  euro: {
    id: "euro",
    trophy: "continental_nt",
    confederation: "UEFA",
    club: false,
    teams: 24,
    phase: { kind: "groups", groups: 6, perGroup: 4, qualify: 2, bestThirds: 4 },
    knockout: ["r16", "quarter", "semi", "final"],
  },

  /** Sixteen in four groups of four, straight into the quarters. */
  copa_america: {
    id: "copa_america",
    trophy: "continental_nt",
    confederation: "CONMEBOL",
    club: false,
    teams: 16,
    phase: { kind: "groups", groups: 4, perGroup: 4, qualify: 2 },
    knockout: ["quarter", "semi", "final"],
  },

  /** Forty-eight from 2026: twelve groups of four, top two and the eight best thirds. */
  world_cup: {
    id: "world_cup",
    trophy: "world_cup",
    confederation: null,
    club: false,
    teams: 48,
    phase: { kind: "groups", groups: 12, perGroup: 4, qualify: 2, bestThirds: 8 },
    knockout: ["r32", "r16", "quarter", "semi", "final"],
  },
};

/** Every knockout round of a tournament, in the order they are played. */
export const roundsOf = (id) =>
  (TOURNAMENTS[id]?.knockout ?? []).map((round) => ROUNDS[round]).filter(Boolean);

/**
 * The rounds that are watched rather than reported.
 *
 * From the last sixteen on, a continental run stops being a line in the season summary and
 * becomes a night: `career.js` queues one of these per round and the same broadcast the
 * deciders use plays it out. Before that it stays a result, and deliberately so - the point
 * of a knockout is that it narrows, and a competition that narrates its qualifying rounds
 * with the same weight as its final has no shape left.
 *
 * The play-off round and the World Cup's round of thirty-two sit below the line on purpose:
 * "octavos de final en adelante" is where a real broadcast starts treating it as an event.
 */
export const LIVE_ROUNDS = ["r16", "quarter", "semi", "final"];
export const isLiveRound = (round) => LIVE_ROUNDS.includes(round);

/**
 * WHERE IN THE SEASON A ROUND FALLS.
 *
 * The three deciders of a season are already sorted by a calendar - `when` in FIXTURE_KINDS
 * - because a promotion play-off is the middle of June and a league derby is a Sunday in
 * November, and a career that plays them out of order is visibly wrong. The rounds of a
 * bracket now have to share that calendar, because they are nights in the same season: the
 * last sixteen is February and the final is the end of May.
 *
 * Expressed as an offset BACK from the competition's own slot rather than as absolute
 * dates. A bracket is a run-up: whatever month the final is in, the rounds that led to it
 * are the weeks before it, in order, and nothing else in the season can land between two of
 * them in a way that reads as wrong.
 */
export const ROUND_STEP = 0.22;

export function whenOf(base, round, path = LIVE_ROUNDS) {
  const at = path.indexOf(round);
  if (at < 0) return base;
  return base - (path.length - 1 - at) * ROUND_STEP;
}

/**
 * How many sides come out of the group or league phase.
 *
 * Checked rather than assumed, because it is the one number a format can get wrong in a way
 * that is invisible: a bracket whose first round wants sixteen sides and is handed fourteen
 * still draws, it just quietly stops being the competition it says it is.
 */
export function qualifiersOf(id) {
  const phase = TOURNAMENTS[id]?.phase;
  if (!phase) return 0;
  // The league phase does not feed the first round on its own: the eight direct qualifiers
  // skip it and join the eight play-off winners in the last sixteen.
  if (phase.kind === "league") return phase.playoff[1] - phase.playoff[0] + 1;
  return phase.groups * phase.qualify + (phase.bestThirds ?? 0);
}

/**
 * How many matches a side plays to win the thing, group phase included. What a season has
 * to find room for, and the number that says why a European treble is a long year.
 */
export function matchesToWin(id) {
  const spec = TOURNAMENTS[id];
  if (!spec) return 0;
  const group = spec.phase.kind === "league" ? spec.phase.matches : spec.phase.perGroup - 1;
  // The longest road: through the play-off rather than round it.
  return group + roundsOf(id).reduce((sum, round) => sum + legsOf(id, round.id), 0);
}

/**
 * The rounds a side still has in front of it, having reached `from`. `null` means it has
 * not come out of the group phase yet, so the whole knockout is still ahead.
 */
export function pathFrom(id, from = null) {
  const rounds = roundsOf(id);
  if (!from) return rounds;
  const at = rounds.findIndex((round) => round.id === from);
  return at < 0 ? rounds : rounds.slice(at);
}

/** Which tournament a club or a country is playing, by confederation. Null for neither. */
export function tournamentFor({ confederation, club = true }) {
  return (
    Object.values(TOURNAMENTS).find(
      (spec) =>
        spec.club === club &&
        (spec.confederation === confederation || spec.confederation === null),
    ) ?? null
  );
}

/**
 * Turn the previous league finish into next season's continental entry.
 *
 * The world data does not model coefficients or cup reallocation, so the slots are an
 * explicit, conservative abstraction. Crucially, reputation never grants entry after a
 * season has been played: it only seeds a new career's first year, where no prior table
 * exists yet. Holders defend their title, as they do in both competitions.
 */
export function continentalQualification({
  position = null,
  confederation = null,
  tier = 1,
  wonMain = false,
  wonCup = false,
  reputation = 0,
} = {}) {
  if (tier !== 1 || !confederation) return { level: "none", reason: "division" };
  if (wonMain) return { level: "main", reason: "holder" };

  // A career begins in medias res. Until its first table exists, stature is the only
  // honest evidence available about which continental list the club entered on.
  if (!Number.isFinite(position)) {
    if (reputation >= 3) return { level: "main", reason: "seeded" };
    if (reputation >= 1) return { level: "secondary", reason: "seeded" };
    return { level: "none", reason: "seeded" };
  }

  const mainSlots = confederation === "CONMEBOL" ? 6 : confederation === "UEFA" ? 4 : 2;
  const secondarySlots = confederation === "CONMEBOL" || confederation === "UEFA" ? 2 : 1;
  if (position <= mainSlots) return { level: "main", reason: "league", cutoff: mainSlots };
  if (wonCup || position <= mainSlots + secondarySlots) {
    return { level: "secondary", reason: wonCup ? "cup" : "league", cutoff: mainSlots + secondarySlots };
  }
  return { level: "none", reason: "league", cutoff: mainSlots + secondarySlots };
}

/**
 * HOW MUCH OF THE RUN IS HIM.
 *
 * Until now a tournament run was drawn entirely from `strengthOf(player)`, and `player` is
 * the CLUB - its continental reputation and nothing else. So the competition was the one
 * part of a career the career could not touch: a ninety-rated forward carrying a mid-table
 * side went out in the last sixteen exactly as often as the reserve keeper who preceded
 * him, and a twenty-year-old on the bench at a giant reached semi-finals every year. The
 * bracket knew which badge he wore and nothing about him.
 *
 * Two things decide how much a footballer lifts a side, and they are the two the model
 * already keeps:
 *
 *  - WHAT HE IS NOW. `ovr` at this exact point in the career, not a career average. A
 *    player is not the same asset at 22 and at 31, and the tournament should not think so.
 *  - HOW MUCH FOOTBALL HE IS PLAYING. A rating is a claim; matches are the evidence. The
 *    current season counts most, because that is the side that is actually in this
 *    bracket - but a man three seasons into carrying a team is a different proposition
 *    from one who has just arrived, so the two behind it still count for something.
 *
 * The result is added to the club's reputation, in the same units, and clamped: he tilts
 * the competition, he does not replace it. A great player at a small club goes further
 * than the club would on its own and still does not win the thing every year.
 */
export const PULL = {
  /** The rating that neither lifts a side nor drags it. Roughly a first-choice starter. */
  neutralOvr: 76,
  /** Reputation points per point of OVR either side of it. */
  perOvr: 0.055,
  /** And how far that alone is allowed to move a side. */
  ovrCap: 1.5,
  /** A full season of football, against which "how much is he playing" is measured. */
  fullSeason: 38,
  /** What playing everything, or nothing, is worth on top. */
  inertiaCap: 0.7,
  /**
   * How the last three seasons are weighted, current first. The season the bracket is
   * actually being played in is worth as much as the two behind it together, because it
   * is the only one of the three that describes the side he is in now.
   */
  weights: [1, 0.5, 0.25],
};

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

/**
 * The inertia on its own: 0 for a man who has not played, 1 for a man playing everything,
 * with the current season carrying half the total weight. Exported because the report and
 * the tests both want to be able to say what it was.
 */
export function matchInertia(matches = 0, previous = []) {
  const seasons = [matches, ...previous].slice(0, PULL.weights.length);
  let total = 0;
  let used = 0;
  seasons.forEach((count, index) => {
    const weight = PULL.weights[index];
    total += clamp((count ?? 0) / PULL.fullSeason, 0, 1) * weight;
    used += weight;
  });
  // A first season is measured against itself rather than against two years it has not
  // had yet, or every debutant would read as a man who stopped playing.
  return used > 0 ? total / used : 0;
}

/**
 * What the player is worth to this run, in the same units as a club's continental
 * reputation. Added to it by `simulateTournamentRun`.
 */
export function playerPull({ ovr = PULL.neutralOvr, matches = 0, previous = [] } = {}) {
  const rating = clamp((ovr - PULL.neutralOvr) * PULL.perOvr, -PULL.ovrCap, PULL.ovrCap);
  // Centred on half a season: playing everything is a lift, playing nothing is a drag, and
  // a squad player is neither. A man who is not on the pitch cannot carry anybody, so the
  // inertia also damps the rating - a ninety who played four games is not this side's
  // ninety, whatever the card says.
  const inertia = (matchInertia(matches, previous) - 0.5) * 2 * PULL.inertiaCap;
  const presence = clamp(0.35 + matchInertia(matches, previous), 0, 1);
  return rating * presence + inertia;
}

const identityOf = (entry) => entry?.id ?? entry?.fifa ?? null;
const nameOf = (entry) => entry?.shortName ?? entry?.short_name ?? entry?.name_es ?? entry?.name ?? identityOf(entry) ?? "—";
const strengthOf = (entry) =>
  entry?.continental_reputation ?? entry?.international_reputation ?? entry?.fifa_reputation ?? 2;

/**
 * How often a knockout tie is still level when the football runs out.
 *
 * This used to be zero: `tieScore` drew a margin of one or two and handed the tie to
 * whoever it had already decided, so no tie in the game's history had ever gone to
 * penalties. That is not a small omission - a shootout is the single most recognisable
 * thing a knockout does, and a competition that has never had one is visibly not the
 * competition it claims to be.
 *
 * A two-legged tie is level on aggregate rather more often than a one-off is level at
 * ninety minutes, which is what the two numbers say. Either way the answer is the same:
 * extra time, and then twelve yards. See `settleTie`.
 */
const LEVEL_ODDS = { 1: 0.19, 2: 0.24 };

/** Spread one side's aggregate across the legs of the tie. */
function splitAcrossLegs(next, total, legs) {
  if (legs <= 1) return [total];
  const first = randInt(next, 0, total);
  return [first, total - first];
}

/**
 * One knockout tie, played out: who went through, what it finished, and how.
 *
 * The aggregate is drawn first and then split across the legs, rather than the other way
 * round, because the aggregate is the thing that has to be true - it is what decides the
 * tie - and a pair of leg scores that happen to add up to the wrong number is a tie the
 * narration cannot tell. A level aggregate is not a draw: it is a shootout, and `won` still
 * says which way it went, because a champion is forced through the whole verified format.
 */
function settleTie(next, ours, theirs, legs, forceWin) {
  const edge = Math.max(-0.22, Math.min(0.22, (ours - theirs) * 0.055));
  const naturalWin = next() < 0.5 + edge;
  const won = forceWin ?? naturalWin;

  const level = next() < (LEVEL_ODDS[legs] ?? LEVEL_ODDS[1]);
  const loser = randInt(next, 0, legs === 2 ? 3 : 2);
  const margin = level ? 0 : next() < 0.68 ? 1 : 2;
  const winner = loser + margin;

  // The scoreline as OUR side reads it, whichever way the tie went.
  const us = level ? loser : won ? winner : loser;
  const them = level ? loser : won ? loser : winner;
  const ourLegs = splitAcrossLegs(next, us, legs);
  const theirLegs = splitAcrossLegs(next, them, legs);

  return {
    won,
    home: us,
    away: them,
    // Every leg of the tie, in order. The last one is the night it is settled on.
    legScores: ourLegs.map((goals, index) => ({ us: goals, them: theirLegs[index] })),
    // Level when the whistle goes means the extra half hour, and then the spot.
    extraTime: level,
    penalties: level,
  };
}

/**
 * Who comes out of the bombo, and why it is not simply a uniform draw.
 *
 * The field is now the real one (see qualified.js), which fixes the names but not the shape
 * of the competition: drawn flat, a European Cup final is as likely to be against the
 * thirty-sixth seed as against Real Madrid, and every round of it reads like a first round.
 * A knockout narrows in strength as well as in number - the sides that survive to a semi are
 * the sides that were always going to - so the draw leans harder on reputation the deeper it
 * gets. `depth` runs 0 at the first knockout round to 1 at the final.
 *
 * Still no upsets removed: the weakest side in the pool can be drawn in the final, it is
 * simply not as likely as the strongest one. That is the whole difference between a bracket
 * and a raffle.
 */
function drawOpponent(next, available, depth) {
  if (!available.length) return null;
  const tilt = 0.6 + depth * 1.9;
  const weights = available.map((entry) => (strengthOf(entry) + 1) ** tilt);
  let target = next() * weights.reduce((sum, weight) => sum + weight, 0);
  for (let index = 0; index < available.length; index += 1) {
    target -= weights[index];
    if (target <= 0) return available[index];
  }
  return available[available.length - 1];
}

/**
 * The whole competition, from the group phase to the night it ends.
 *
 * -- Why this is drawn BEFORE the season and not after -------------------------
 *
 * It used to be drawn after: `playSeason` rolled the trophies, and the bracket was then
 * built backwards to agree with whichever ones the club had won. That worked as arithmetic
 * and failed as a competition, because the season also staged a `final_continental` as one
 * of its three deciders - a separate night, rolled from separate odds, played BEFORE any of
 * this existed. So a career watched itself win the European Cup final in May and then sat
 * through the last sixteen, the quarter and the semi of the same edition, followed by a
 * second final that might disagree with the first. Two descriptions of one competition,
 * told backwards.
 *
 * There is one now, and it is this. The run is built with the season's plan, so the ties
 * can be played in the order football plays them, and the night the player DECIDES is a
 * round of it rather than a fixture standing next to it.
 *
 * -- The three things a caller can force ---------------------------------------
 *
 *  - `champion` - the side wins the thing. Still honoured, because a trophy the ceremony
 *    is about to lift cannot be contradicted by the bracket that led to it.
 *  - `reaches` - the side gets AT LEAST to this round. This is how a decisive night is
 *    kept honest: if the season has staged the player's moment in the semi-final, the run
 *    has to actually arrive at the semi-final.
 *  - `decidesAt` / `answers` - the rounds the player answers HIMSELF, and what he has said
 *    about each so far. A run stops at the first of them he has not answered yet, and that
 *    round is `pending`: no result, and no rounds after it, because none of them have
 *    happened. A great player answers all of them; a squad player answers none.
 *
 * THE STREAM DOES NOT MOVE when any of them changes. Every draw below happens whatever the
 * forcing says, and the forcing is applied to the result rather than to the drawing - which
 * is what lets the same run be built twice, once before the player answers and once after,
 * and come out with the same opponents and the same earlier rounds both times.
 */
export function simulateTournamentRun({
  id,
  seed,
  season,
  entrants = [],
  player,
  qualified = true,
  champion = false,
  phasePosition = null,
  pull = 0,
  reaches = null,
  decidesAt = null,
  answers = {},
  plays = null,
} = {}) {
  const spec = TOURNAMENTS[id];
  if (!spec || !qualified || !player) return null;
  const playerId = identityOf(player);
  const next = createStream(seed, "tournament-run", id, season, playerId);
  const pool = entrants.filter((entry) => identityOf(entry) && identityOf(entry) !== playerId);
  /*
   * The side, as this bracket meets it: the badge plus the man wearing the shirt.
   *
   * `pull` is the whole of the difference between a competition a career happens next to
   * and one it is actually in - see `playerPull`. Clamped to the same 0..5 the reputations
   * live in, so a great player at a small club is drawn as a bigger club rather than as
   * something the format has no room for.
   */
  const playerStrength = clamp(strengthOf(player) + pull, 0, 5);

  const phaseSize = spec.phase.kind === "league" ? spec.teams : spec.phase.perGroup;
  const derivedPhasePosition = phasePosition ?? Math.max(
    1,
    Math.min(phaseSize, Math.round(phaseSize * (0.72 - playerStrength * 0.1 + next() * 0.42))),
  );
  const direct = spec.phase.kind === "league" && derivedPhasePosition <= spec.phase.direct;
  /**
   * Third in the group and through anyway.
   *
   * The 2026 World Cup takes the eight best third places out of twelve groups, and the Euro
   * the four best out of six - which the format table has always said and the simulation
   * has always ignored, so finishing third was death in a tournament where it is a coin
   * flip. Two thirds of them go through, so two thirds of them go through.
   */
  const thirdPlace =
    spec.phase.kind === "groups" &&
    spec.phase.bestThirds &&
    derivedPhasePosition === spec.phase.qualify + 1 &&
    next() < spec.phase.bestThirds / spec.phase.groups;
  const naturallyQualified = spec.phase.kind === "league"
    ? derivedPhasePosition <= spec.phase.playoff[1]
    : derivedPhasePosition <= spec.phase.qualify || thirdPlace;
  /*
   * A side that has to reach a round has to come out of the group phase first. The champion
   * always had that exemption; it is now shared with the night the player is standing in,
   * because the season cannot stage his semi-final and then not take him to one.
   */
  // Which rounds are his, in the order they are played rather than the order they arrived.
  const decides = new Set(
    (Array.isArray(decidesAt) ? decidesAt : decidesAt ? [decidesAt] : []).filter(Boolean),
  );
  const forced = champion || Boolean(reaches) || decides.size > 0;
  const phaseQualified = naturallyQualified || forced;

  const run = {
    id,
    phase: { kind: spec.phase.kind, position: derivedPhasePosition, qualified: phaseQualified, direct },
    rounds: [],
    eliminatedAt: phaseQualified ? null : "phase",
    champion: false,
    /** The round still waiting on him, if the run has one it cannot get past yet. */
    pendingAt: null,
  };
  if (!phaseQualified) return run;

  const rounds = roundsOf(id).filter((round) => !(id === "champions" && direct && round.id === "playoff"));
  const indexOfRound = (roundId) => rounds.findIndex((round) => round.id === roundId);

  /*
   * How far the side goes on its own.
   *
   * Drawn unconditionally, which it did not used to be: a champion skipped this loop
   * entirely, so forcing a run through changed every opponent that came after it. The run
   * has to be buildable twice - once before the player answers his night and once after -
   * and that only works if nothing about the forcing touches the stream.
   */
  const survival = Math.max(0.34, Math.min(0.78, 0.43 + playerStrength * 0.065));
  let natural = 0;
  while (natural < rounds.length - 1 && next() < survival) natural += 1;

  // Where the run ends, once everything the caller knows has been applied to it.
  let exitAt = champion ? rounds.length - 1 : natural;
  const reachIndex = reaches ? indexOfRound(reaches) : -1;
  if (reachIndex >= 0) exitAt = Math.max(exitAt, reachIndex);
  /*
   * Every round he is standing in, in order. He cannot answer one his side never reached,
   * so each of them drags the run at least that far; a night he came through is worth at
   * least one more; and the first one he failed is where it ends, whatever the draw said.
   */
  for (let index = 0; index < rounds.length; index += 1) {
    if (!decides.has(rounds[index].id)) continue;
    const answer = answers[rounds[index].id];
    exitAt = Math.max(exitAt, index);
    if (answer === false) {
      exitAt = index;
      break;
    }
    if (answer === true) exitAt = Math.max(exitAt, index + 1);
  }
  exitAt = Math.min(exitAt, rounds.length - 1);

  const used = new Set();
  for (let index = 0; index < rounds.length; index += 1) {
    const round = rounds[index];
    const available = pool.filter((entry) => !used.has(identityOf(entry)));
    const opponent = drawOpponent(next, available, index / Math.max(1, rounds.length - 1));
    if (opponent) used.add(identityOf(opponent));
    const legs = legsOf(id, round.id);
    const mine = decides.has(round.id);
    const answer = mine ? answers[round.id] : undefined;
    const through = mine ? (answer === undefined ? null : answer) : champion || index < exitAt;
    /*
     * Drawn even for the round nobody has answered yet, and deliberately: `settleTie` takes
     * the same number of draws from the stream whichever way the tie went, so asking it for
     * a provisional scoreline here is exactly what keeps the rest of the bracket identical
     * once the real answer arrives. The provisional score is thrown away below.
     */
    const score = settleTie(next, playerStrength, strengthOf(opponent), legs, through ?? true);

    const entry = {
      round: round.id,
      legs,
      opponentId: identityOf(opponent),
      opponent: nameOf(opponent),
      // Whether this is a night the player is shown rather than told about. See LIVE_ROUNDS.
      live: isLiveRound(round.id),
      // And whether it is a night he answers himself rather than one that plays out.
      decides: mine,
      /*
       * Whether he was in the side for it. `null` means nobody asked - a run built without
       * a team sheet, which is every caller outside the career loop - and the narration
       * treats that as "not known" rather than as "left out".
       */
      played: plays ? plays.includes(round.id) : null,
    };

    if (mine && through === null) {
      // Nothing has happened here yet. A scoreline would be a claim about a match nobody
      // has played, which is the one thing this file has never allowed itself.
      run.rounds.push({ ...entry, pending: true, won: null, score: null, legScores: null });
      run.pendingAt = round.id;
      return run;
    }

    run.rounds.push({
      ...entry,
      score: { us: score.home, them: score.away },
      legScores: score.legScores,
      extraTime: score.extraTime,
      penalties: score.penalties,
      won: Boolean(through),
    });
    if (!through) {
      run.eliminatedAt = round.id;
      return run;
    }
  }
  run.champion = true;
  run.eliminatedAt = null;
  return run;
}
