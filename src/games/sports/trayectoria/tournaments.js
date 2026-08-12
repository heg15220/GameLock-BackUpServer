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
