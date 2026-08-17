/**
 * The five tournaments, in their real shape.
 *
 * Until now a continental run was one night: `semifinal_continental` or `final_continental`
 * fired, you took a shot, and the rest of the competition was a probability. That is fine
 * as an abstraction and useless as a story - a player who reaches a Champions League final
 * should be able to say which side he knocked out on the way, and the game had no idea.
 *
 * This is the format and nothing else: how many teams, how they are divided, and which
 * rounds a side has to come through to lift it. No React, no seed, no simulation - the
 * bracket a real edition would print before a ball is kicked. Everything that draws a run,
 * places a decisive night in it or narrates one reads its structure from here, so there is
 * exactly one description of what a Champions League is.
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
 * of the competition: drawn flat, a Champions League final is as likely to be against the
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
 * Simulate every stage of the player's tournament rather than jumping from entry to final.
 * This is a compact player-centric bracket: it records the phase, every opponent, aggregate
 * score and exit round. The forced final outcome keeps it consistent with the season's
 * already-settled trophy roll.
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
} = {}) {
  const spec = TOURNAMENTS[id];
  if (!spec || !qualified || !player) return null;
  const playerId = identityOf(player);
  const next = createStream(seed, "tournament-run", id, season, playerId);
  const pool = entrants.filter((entry) => identityOf(entry) && identityOf(entry) !== playerId);
  const playerStrength = strengthOf(player);

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
  const phaseQualified = spec.phase.kind === "league"
    ? derivedPhasePosition <= spec.phase.playoff[1] || champion
    : derivedPhasePosition <= spec.phase.qualify || thirdPlace || champion;

  const run = {
    id,
    phase: { kind: spec.phase.kind, position: derivedPhasePosition, qualified: phaseQualified, direct },
    rounds: [],
    eliminatedAt: phaseQualified ? null : "phase",
    champion: false,
  };
  if (!phaseQualified) return run;

  const rounds = roundsOf(id).filter((round) => !(id === "champions" && direct && round.id === "playoff"));
  // A non-champion exits somewhere. Strong sides are more likely to travel further, while
  // every round remains possible; champions are forced through the whole verified format.
  let exitAt = rounds.length - 1;
  if (!champion) {
    const survival = Math.max(0.34, Math.min(0.78, 0.43 + playerStrength * 0.065));
    exitAt = 0;
    while (exitAt < rounds.length - 1 && next() < survival) exitAt += 1;
  }

  const used = new Set();
  for (let index = 0; index < rounds.length; index += 1) {
    const round = rounds[index];
    const available = pool.filter((entry) => !used.has(identityOf(entry)));
    const opponent = drawOpponent(next, available, index / Math.max(1, rounds.length - 1));
    if (opponent) used.add(identityOf(opponent));
    const mustWin = champion || index < exitAt;
    const legs = legsOf(id, round.id);
    const score = settleTie(next, playerStrength, strengthOf(opponent), legs, mustWin);
    run.rounds.push({
      round: round.id,
      legs,
      opponentId: identityOf(opponent),
      opponent: nameOf(opponent),
      score: { us: score.home, them: score.away },
      legScores: score.legScores,
      extraTime: score.extraTime,
      penalties: score.penalties,
      won: mustWin,
      // Whether this is a night the player is shown rather than told about. See LIVE_ROUNDS.
      live: isLiveRound(round.id),
    });
    if (!mustWin) {
      run.eliminatedAt = round.id;
      break;
    }
  }
  run.champion = champion;
  if (champion) run.eliminatedAt = null;
  return run;
}
