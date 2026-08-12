/**
 * The ninety minutes, when they are not yours to take.
 *
 * Half the deciders in a career are now played rather than shot (see matchmode.js), and
 * "played" has to mean something more than the same guess with a longer wait in front of
 * it. This builds the whole match up front - a scoreline that moves, a clock that runs,
 * and the minute it comes down to you - and hands it to the screen to reveal a beat at a
 * time. The model is pure; only the reveal is live.
 *
 * Two rules carried over from press.js, because they are what keep this from being noise:
 *
 *  1. NOTHING IS INVENTED. Every line is drawn from something the model actually has -
 *     the two clubs, the trophy at stake, the player's own role and rating. There are no
 *     named team-mates, no fictional bookings, no invented sub-plots. A career sim that
 *     starts making things up stops being trustworthy about the things it is not making up.
 *  2. THE SCORE IS HONEST. It is built backwards from the result, so the match you watch
 *     is the match that happened. It never shows you a goal that is then taken away.
 *
 * The player's moment always arrives late and always matters: the scoreline is arranged so
 * that his chance is the one that decides it, because `seasonFixtures` only staged this
 * match on the understanding that it would.
 */

import { createStream, randInt } from "./rng.js";

/** Where the player's chance falls. Late, because that is what a decider is. */
export const MOMENT_WINDOW = [74, 88];
export const FULL_TIME = 90;

/**
 * How the match stands when the chance arrives. Each shape is a different kind of night,
 * and the weight is how often football serves it up.
 */
const SITUATIONS = [
  { id: "level", weight: 40, home: 1, away: 1 },
  { id: "behind", weight: 26, home: 0, away: 1 },
  { id: "goalless", weight: 20, home: 0, away: 0 },
  { id: "twoTwo", weight: 14, home: 2, away: 2 },
];

/**
 * How the night stands, from our side, at the moment a beat happens.
 *
 * The copy is chosen with it - see `beatLines` in copy.js - because half the good lines are
 * claims about the scoreline ("puts them in front", "levels it") and the scoreline is
 * already decided by the time anyone goes looking for words. Without this the seed alone
 * picked the line, and an equaliser at 1-1 could be announced as taking the lead.
 */
export const standingOf = (home, away) =>
  home > away ? "ahead" : home < away ? "behind" : "level";

const pickSituation = (next) => {
  const total = SITUATIONS.reduce((sum, s) => sum + s.weight, 0);
  let target = next() * total;
  for (const situation of SITUATIONS) {
    target -= situation.weight;
    if (target <= 0) return situation;
  }
  return SITUATIONS[0];
};

/**
 * Build the match up to the moment it comes down to him.
 *
 * Deliberately stops there. The alternative was to resolve the whole thing from the model
 * and let the player watch ninety minutes of text he cannot touch, and a career sim that
 * makes you a spectator at the biggest night of the season has picked the wrong half of
 * the idea. What the narration replaces is the empty screen around the shot, not the shot.
 *
 * So: the clock runs, the score moves, and at the decisive minute the same three
 * placements the game has always offered appear - and `narrateFinish` writes the rest
 * once he has called it.
 */
export function narrateMatch({
  seed,
  season,
  fixtureId,
  kind,
  chances = 1,
  national = false,
  ourName = "",
  theirName = "",
}) {
  const next = createStream(seed, "narration", fixtureId, season);
  const situation = pickSituation(next);
  const moment = randInt(next, MOMENT_WINDOW[0], MOMENT_WINDOW[1]);

  // Laid out first WITHOUT a score, because the minutes are not generated in order: the
  // goals are placed across the match and the furniture around them is added afterwards.
  // Attaching a running score as each one is pushed attributes the whole scoreline to
  // half time, which is a lie the reader can see.
  const laid = [{ minute: 0, id: "kickoff" }];

  // The goals that produced the situation. Rule-based: a scoreline of 1-1 needs one of
  // each, and they are placed on the clock, not invented.
  const goals = [];
  for (let i = 0; i < situation.home; i += 1) goals.push("us");
  for (let i = 0; i < situation.away; i += 1) goals.push("them");
  for (let i = goals.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [goals[i], goals[j]] = [goals[j], goals[i]];
  }
  const spread = Math.max(1, Math.floor((moment - 12) / (goals.length + 1)));
  goals.forEach((side, index) => {
    laid.push({
      minute: 8 + spread * (index + 1) + Math.floor(next() * 4),
      id: side === "us" ? "goalUs" : "goalThem",
    });
  });

  if (!goals.length) laid.push({ minute: 31, id: "tight" });
  laid.push({ minute: 45, id: "halfTime" });
  laid.push({
    minute: Math.min(70, moment - 6),
    id: situation.id === "behind" ? "chasing" : "pressing",
  });

  /*
   * The chances. A decider is worth however many sights of goal `chancesFor` drew for it,
   * and they are spread through the second half rather than stacked on one minute: the
   * first can fall on the hour and the last in stoppage time.
   *
   * `moment` is the LAST of them, because that is the one the match is remembered for and
   * the one the clock stops on. A night with none of them has no chance beat at all - the
   * game simply goes past him, which is a real thing football does and the model never
   * used to have a way of saying.
   */
  const moments = [];
  for (let i = 0; i < chances; i += 1) {
    const spanStart = Math.min(58, moment - 18);
    const at =
      chances === 1
        ? moment
        : Math.round(spanStart + ((moment - spanStart) * i) / (chances - 1));
    moments.push(at);
    laid.push({ minute: at, id: "chance", chance: true, attempt: i, of: chances });
  }
  if (!chances) laid.push({ minute: Math.max(moment - 4, 76), id: "bystander" });

  // Now put them in order and walk the clock, so every beat carries the score as it stood
  // when it happened.
  let home = 0;
  let away = 0;
  const beats = laid
    .sort((a, b) => a.minute - b.minute)
    .map((beat, index) => {
      if (beat.id === "goalUs") home += 1;
      if (beat.id === "goalThem") away += 1;
      return {
        ...beat,
        home,
        away,
        // What the board says once this beat has happened, so the line describing it cannot
        // contradict it.
        state: standingOf(home, away),
        ourName,
        theirName,
        // Which turn of phrase this beat gets. Drawn from the seed so the same match reads
        // the same way twice - see the note on variety at the top of copy.js.
        variant: Math.floor(next() * 64) + index,
      };
    });

  return {
    kind,
    national,
    moment,
    moments,
    chances,
    situation: situation.id,
    ourName,
    theirName,
    beats,
    standing: { home, away },
  };
}

/** How often a penalty in a shootout goes in. The real figure sits around three in four. */
const SHOOTOUT_RATE = 0.74;

/**
 * The tie, from twelve yards, kick by kick.
 *
 * Real rules: five each, alternating, and the moment one side cannot be caught it stops -
 * which is why a shootout is very often 4-3 after nine kicks and not ten. Level after five
 * goes to sudden death, one pair at a time.
 *
 * The WINNER IS NOT DRAWN HERE. It arrives from the trophy roll, because the cup was
 * already decided before anybody walked up - see `settleFinal` in career.js. What this does
 * is produce a shootout that ends the way it has to, by drawing whole shootouts from the
 * seed until one does. That keeps every sequence a plausible one rather than a rigged last
 * kick, and it stays pure: same seed, same tie, same order.
 */
export function shootoutFor(seed, won) {
  const decided = (us, them, round) => {
    const left = Math.max(0, 5 - round);
    // Once the trailing side cannot catch up even by scoring everything it has left.
    if (us > them + left) return "us";
    if (them > us + left) return "them";
    return null;
  };

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const next = createStream(seed, "shootout", attempt);
    const us = [];
    const them = [];
    let scoredUs = 0;
    let scoredThem = 0;
    let winner = null;

    for (let round = 1; round <= 20 && !winner; round += 1) {
      const ours = next() < SHOOTOUT_RATE;
      us.push(ours);
      if (ours) scoredUs += 1;
      winner = decided(scoredUs, scoredThem, round);
      if (winner) break;

      const theirs = next() < SHOOTOUT_RATE;
      them.push(theirs);
      if (theirs) scoredThem += 1;
      winner = decided(scoredUs, scoredThem, round);
      // Sudden death: level after five, the first pair that differs settles it.
      if (!winner && round >= 5) {
        if (scoredUs !== scoredThem) winner = scoredUs > scoredThem ? "us" : "them";
      }
    }

    if (winner === (won ? "us" : "them")) {
      return { us, them, score: { us: scoredUs, them: scoredThem } };
    }
  }
  // Unreachable in practice; a tie that must be won is at worst one kick each.
  return { us: [won], them: [!won], score: { us: won ? 1 : 0, them: won ? 0 : 1 } };
}

/** The beats that actually put the ball in the net, and whose net it goes into. */
const SCORED_BY = { goalUs: "home", scored: "home", goalThem: "away" };

/**
 * The merged match, with every beat carrying the score as it ACTUALLY stood.
 *
 * The build-up is laid out before the player has taken anything, so a beat at 71' has no
 * idea about the goal he scored at 58': it carries the score the build-up alone produced.
 * Read straight off the beats, that made the scoreboard jump back to 0-0 as soon as the
 * clock passed his goal, and - worse - let a build-up equaliser after it pick the line
 * about going in front, which is the same lie `beatLines` exists to prevent.
 *
 * So the two lists are merged, sorted and walked once, and the running total is stamped
 * over whatever they were built with. This is the only place that arithmetic is done.
 */
export function withStandings(beats) {
  let home = 0;
  let away = 0;
  return [...beats]
    .sort((a, b) => a.minute - b.minute)
    .map((beat) => {
      const side = SCORED_BY[beat.id];
      if (side === "home") home += 1;
      if (side === "away") away += 1;
      return { ...beat, home, away, state: standingOf(home, away) };
    });
}

/**
 * The rest of it, once he has called it. Returned as its own list so the screen can play
 * the build-up, wait for the decision, and then carry on from the same clock.
 *
 * `closed` is whether the fixture has had every chance it owed him. It is not always true,
 * and that is the whole reason this takes an argument: a night worth three used to be
 * narrated in one batch at full time, so a player took the first one and the match carried
 * on with no line saying whether it went in and a scoreboard still reading what it read
 * before he shot. He was being asked for the second one without being told how the first
 * had gone. Called after every attempt now, and only the last call is allowed to blow the
 * whistle.
 */
export function narrateFinish(
  broadcast,
  attempts = [],
  { closed = true, won = null, shootout = false } = {},
) {
  if (!broadcast) {
    return { beats: [], final: { home: 0, away: 0 }, won: false, scored: false, closed };
  }

  const taken = Array.isArray(attempts) ? attempts : [];
  const converted = taken.filter(Boolean).length;
  const { home, away } = broadcast.standing;
  const final = { home: home + converted, away };

  const beat = (minute, id, extra = {}) => ({
    minute,
    id,
    ourName: broadcast.ourName,
    theirName: broadcast.theirName,
    decisive: true,
    ...extra,
    state: standingOf(extra.home ?? home, extra.away ?? away),
  });

  // One line per chance, on the minute it happened, with the score as it stood after it.
  let running = home;
  const beats = taken.map((scored, i) => {
    if (scored) running += 1;
    return beat(broadcast.moments[i] ?? broadcast.moment, scored ? "scored" : "missed", {
      home: running,
      away,
      variant: i * 7 + broadcast.moment,
    });
  });

  // The two lines that end a match only belong on the call that ends it. Mid-fixture they
  // would be a whistle blown over a game still being played.
  if (closed) {
    if (!taken.length) {
      beats.push(
        beat(broadcast.moment, "untouched", { home, away, variant: broadcast.moment }),
      );
    }

    /*
     * A FINAL HAS ALREADY BEEN ANSWERED, and the answer arrives here as `won`.
     *
     * The scoreline this file invents is fiction with a number on it, and on a night that
     * IS the trophy that number is a claim about the cabinet. Left to itself it contradicted
     * the ceremony: a cup final read 0-1 at full time and the trophy played ten seconds
     * later, because the trophy was rolled somewhere else entirely. Measured, two in five of
     * the finals a player missed came out that way.
     *
     * So the last minutes bend to the result rather than the other way round. Somebody else
     * settles it, late, and the feed says so - which is exactly the thing DECIDES has always
     * claimed about a missed final: eleven other players are on the pitch, and often enough
     * one of them wins it anyway. The odds do not move; only the story now matches them.
     */
    if (won !== null && final.home !== final.away) {
      // The ninety minutes disagree with the result: somebody settles it late. This is the
      // ordinary way a match that was already decided elsewhere gets told.
      const minute = Math.min(FULL_TIME - 1, Math.max(broadcast.moment + 2, 86));
      const ourGoal = won && final.home < final.away;
      if (ourGoal) final.home = final.away + 1;
      else if (!won && final.home > final.away) final.away = final.home + 1;
      beats.push(
        beat(minute, ourGoal ? "goalUs" : "goalThem", {
          home: final.home,
          away: final.away,
          variant: minute,
          late: true,
        }),
      );
    }

    beats.push(
      beat(FULL_TIME, "fullTime", { home: final.home, away: final.away, variant: broadcast.moment }),
    );

    /*
     * A KNOCKOUT CANNOT END LEVEL.
     *
     * Ninety minutes that finish square are a result in a league and a question anywhere
     * else, and football answers it the same way every time. The shootout is not a second
     * lottery on top of the first: the tie has already been settled - `won` arrives from the
     * trophy roll itself - so this only tells the player HOW, which is the one thing the
     * feed was getting wrong when it left a cup final reading 1-1.
     */
    if (shootout && final.home === final.away) {
      const kicks = shootoutFor(`${broadcast.ourName}:${broadcast.theirName}:${broadcast.moment}`, won);
      beats.push(
        beat(FULL_TIME, "shootout", {
          home: final.home,
          away: final.away,
          variant: broadcast.moment,
          // The kicks themselves, so the screen can walk them one at a time rather than
          // print a sentence about something the player never saw happen.
          kicks,
        }),
      );
      beats.push(
        beat(FULL_TIME, won ? "shootoutWon" : "shootoutLost", {
          home: final.home,
          away: final.away,
          variant: broadcast.moment + 3,
          decided: true,
          shootoutScore: kicks.score,
        }),
      );
    }
  }

  return {
    closed,
    scored: converted > 0,
    converted,
    final,
    /*
     * Won on the night if we finish in front - or if the shootout said so, which the
     * scoreline by definition cannot. A tie broken from twelve yards leaves the board
     * level, so reading the result off `final` alone reported every shootout as a defeat.
     */
    won: won === null ? final.home > final.away : won,
    beats,
  };
}
