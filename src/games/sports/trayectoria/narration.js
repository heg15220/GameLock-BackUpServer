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

/**
 * The rest of it, once he has called it. Returned as its own list so the screen can play
 * the build-up, wait for the decision, and then carry on from the same clock.
 */
export function narrateFinish(broadcast, attempts = []) {
  if (!broadcast) return { beats: [], final: { home: 0, away: 0 }, won: false, scored: false };

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

  if (!taken.length) {
    beats.push(
      beat(broadcast.moment, "untouched", { home, away, variant: broadcast.moment }),
    );
  }
  beats.push(
    beat(FULL_TIME, "fullTime", { home: final.home, away: final.away, variant: broadcast.moment }),
  );

  return {
    scored: converted > 0,
    converted,
    final,
    // Won on the night if we finish in front. The trophy itself is still the engine's
    // call - see DECIDES - so this is the story of the match, not a verdict on the season.
    won: final.home > final.away,
    beats,
  };
}
