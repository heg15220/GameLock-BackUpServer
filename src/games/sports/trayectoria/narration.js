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
 * The same table for a night the player is the one STOPPING it.
 *
 * A chance that produces a save is the mirror image of one that produces a goal, and the
 * scoreline has to be the mirror image too. Handed the table above, a goalkeeper was sent
 * out 0-1 down and told that saving the penalty was "a huge step towards the league" over
 * a feed that still read 0-1 at full time: coming through had preserved a defeat. A save
 * defends something, so these are the scorelines there is something to defend - a lead or
 * a level game - and conceding is what takes it away.
 */
const STOP_SITUATIONS = [
  { id: "narrowLead", weight: 34, home: 1, away: 0 },
  { id: "level", weight: 30, home: 1, away: 1 },
  { id: "goalless", weight: 22, home: 0, away: 0 },
  { id: "twoOne", weight: 14, home: 2, away: 1 },
];

/**
 * What converting one of his chances actually puts on the board.
 *
 * The three are not the same event with different words on it. A goal and an assist both
 * end with the ball in their net; a save ends with the ball in nobody's, and FAILING one
 * ends with it in ours. Read as a goal either way - which is what this file did - a keeper
 * who saved the decisive penalty went 1-0 up for it and a keeper who was beaten conceded
 * nothing, so the scoreboard said the opposite of the match on both halves of the outcome.
 */
const PRODUCE_BEATS = {
  goal: { came: "scored", failed: "missed" },
  assist: { came: "assisted", failed: "assistMissed" },
  stop: { came: "stopped", failed: "conceded" },
};

/**
 * The match between the goals. These are events the simulator actually draws, not filler
 * selected by the UI. Weighting is deliberately asymmetric: pressure produces shots and
 * saves, a closed game produces recoveries, blocks and set pieces.
 */
const FLOW_EVENTS = [
  { id: "shotUs", side: "us", category: "chance", weight: 12 },
  { id: "shotThem", side: "them", category: "chance", weight: 12 },
  { id: "saveUs", side: "us", category: "save", weight: 8 },
  { id: "saveThem", side: "them", category: "save", weight: 8 },
  { id: "tackleUs", side: "us", category: "defence", weight: 8 },
  { id: "tackleThem", side: "them", category: "defence", weight: 8 },
  { id: "keyPassUs", side: "us", category: "creation", weight: 7 },
  { id: "keyPassThem", side: "them", category: "creation", weight: 7 },
  { id: "cornerUs", side: "us", category: "setpiece", weight: 5 },
  { id: "cornerThem", side: "them", category: "setpiece", weight: 5 },
  { id: "offsideUs", side: "us", category: "offside", weight: 3 },
  { id: "offsideThem", side: "them", category: "offside", weight: 3 },
];

/**
 * HOW OFTEN ONE OF THE NIGHT'S GOALS IS HIS.
 *
 * Being in the side and having a chance are two different things, and the tie narration only
 * ever had the first: he appeared, he did some work, and every goal his side scored belonged
 * to nobody. A forward who starts a quarter-final and never once has a sight of goal in
 * fifteen seasons of them is not a forward.
 *
 * So a goal the tie ALREADY HAS can be his. Nothing about the scoreline moves - it is the
 * bracket's, and the bracket is the competition - only who put it in. That is the honest
 * version of "he had chances": the match is what it is, and he is in it.
 */
const GOAL_SHARE = {
  keeper: 0,
  defensive: 0.16,
  support: 0.3,
  creator: 0.34,
  forward: 0.55,
};

const PLAYER_EVENTS = {
  keeper: ["playerSave", "playerClaim", "playerSave", "playerLongPass"],
  defensive: ["playerTackle", "playerBlock", "playerInterception", "playerCarry"],
  support: ["playerTackle", "playerRecovery", "playerKeyPass", "playerCross"],
  creator: ["playerKeyPass", "playerThroughBall", "playerCarry", "playerShot"],
  forward: ["playerRun", "playerShot", "playerHoldUp", "playerKeyPass"],
};

const eventFrom = (next, catalogue) => {
  const total = catalogue.reduce((sum, event) => sum + (event.weight ?? 1), 0);
  let target = next() * total;
  for (const event of catalogue) {
    target -= event.weight ?? 1;
    if (target <= 0) return event;
  }
  return catalogue[0];
};

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

const pickSituation = (next, produces = "goal") => {
  // One draw either way, so switching tables does not move the stream for the careers that
  // were already using the first one.
  const table = produces === "stop" ? STOP_SITUATIONS : SITUATIONS;
  const total = table.reduce((sum, s) => sum + s.weight, 0);
  let target = next() * total;
  for (const situation of table) {
    target -= situation.weight;
    if (target <= 0) return situation;
  }
  return table[0];
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
  group = "forward",
  ovr = 70,
  produces = "goal",
}) {
  const next = createStream(seed, "narration", fixtureId, season);
  const situation = pickSituation(next, produces);
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

  // A full broadcast now has a football texture of its own. The count varies by night and
  // the minutes are sampled independently, then sorted with the goals. Near-duplicates are
  // nudged apart so the feed breathes instead of dumping four lines on 37'.
  const occupied = new Set(laid.map((beat) => beat.minute));
  const flowCount = randInt(next, 6, 10) + (situation.home + situation.away >= 4 ? 2 : 0);
  const addAtFreeMinute = (beat, from = 5, to = Math.max(8, moment - 3)) => {
    let minute = randInt(next, from, to);
    let guard = 0;
    while (occupied.has(minute) && guard < 8) {
      minute = minute >= to ? from : minute + 1;
      guard += 1;
    }
    occupied.add(minute);
    laid.push({ minute, ...beat });
  };
  for (let index = 0; index < flowCount; index += 1) {
    addAtFreeMinute(eventFrom(next, FLOW_EVENTS));
  }

  // The player is visible in the kind of work his position actually performs. OVR affects
  // frequency, never the truth of a goal or the result: these are touches inside the match,
  // while the decisive chance remains the player's input.
  const repertoire = PLAYER_EVENTS[group] ?? PLAYER_EVENTS.forward;
  const playerCount = 1 + (next() < Math.max(0.12, Math.min(0.72, (ovr - 45) / 65)) ? 1 : 0);
  for (let index = 0; index < playerCount; index += 1) {
    addAtFreeMinute({
      id: repertoire[Math.floor(next() * repertoire.length)],
      side: "us",
      category: group === "keeper" ? "save" : group === "defensive" ? "defence" : "player",
      player: true,
    });
  }

  if (!goals.length) laid.push({ minute: 31, id: "tight" });
  laid.push({ minute: 45, id: "halfTime" });
  // What the last twenty minutes are ABOUT, read off the scoreline rather than off the
  // name of the situation: a side one goal up is holding on, not pressing, and the table a
  // keeper's night is drawn from is full of exactly that.
  laid.push({
    minute: Math.min(70, moment - 6),
    id:
      situation.home < situation.away
        ? "chasing"
        : situation.home > situation.away
          ? "holding"
          : "pressing",
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

/**
 * A knockout night the player's side plays and he does not decide.
 *
 * From the last sixteen on, a continental run stopped being a bracket in the season summary
 * and became something you sit through - see LIVE_ROUNDS in tournaments.js. That is a
 * different job from `narrateMatch`, and the difference is the whole reason this is its own
 * function: a decider is built UP TO the player's chance and left open, because he answers
 * it. A tie has no question in it. The result arrived from the bracket before a ball was
 * kicked, so this builds the entire ninety minutes and closes them, and the only thing the
 * player does is watch his club go through or go out.
 *
 * Which is also why it is worth watching at all. `narrateMatch` cannot be reused with a
 * `chances: 0` and a shrug, because the two rules at the top of this file still bind: the
 * score is honest, and it is the score the bracket says. Everything here is built backwards
 * from `score` and `aggregate`, so the feed can never show a goal the tie did not have.
 *
 * ONE LEG IS NARRATED, and it is the last one. A two-legged European tie is two nights and
 * one of them decides it; narrating both would double every season's screens to tell the
 * player something the aggregate already says. So the return leg is played and the first
 * leg arrives as what it really is by then - a scoreline you carry into the second.
 */
export function narrateTie({
  seed,
  round,
  legs = 1,
  ourName = "",
  theirName = "",
  score = { us: 0, them: 0 },
  aggregate = null,
  firstLeg = null,
  won = true,
  penalties = false,
  extraTime = false,
  group = "forward",
  ovr = 70,
  played = null,
} = {}) {
  const next = createStream(seed, "tie", round);
  const laid = [{ minute: 0, id: "kickoff" }];

  // The goals this leg actually had, placed across the ninety rather than invented.
  const goals = [];
  for (let i = 0; i < (score.us ?? 0); i += 1) goals.push("us");
  for (let i = 0; i < (score.them ?? 0); i += 1) goals.push("them");
  for (let i = goals.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [goals[i], goals[j]] = [goals[j], goals[i]];
  }
  const occupied = new Set([0, 45, FULL_TIME]);
  const place = (from, to) => {
    let minute = randInt(next, from, to);
    let guard = 0;
    while (occupied.has(minute) && guard < 12) {
      minute = minute >= to ? from : minute + 1;
      guard += 1;
    }
    occupied.add(minute);
    return minute;
  };
  const spread = Math.max(1, Math.floor(80 / (goals.length + 1)));
  // Kept as a list so one of ours can be handed to him below without moving the scoreline.
  const ours = [];
  goals.forEach((side, index) => {
    const beat = {
      minute: place(
        Math.max(3, 6 + spread * index),
        Math.min(FULL_TIME - 2, 8 + spread * (index + 1) + 6),
      ),
      id: side === "us" ? "goalUs" : "goalThem",
    };
    laid.push(beat);
    if (side === "us") ours.push(beat);
  });

  // The football between them, exactly as a decider draws it.
  const flowCount = randInt(next, 7, 11);
  for (let index = 0; index < flowCount; index += 1) {
    const event = eventFrom(next, FLOW_EVENTS);
    laid.push({ minute: place(4, FULL_TIME - 3), ...event });
  }

  /*
   * AND HIM, IF HE PLAYED.
   *
   * This was the hole in the whole idea. A continental run is the part of a career that
   * takes years to earn, and it was narrated with the player absent from it: the feed named
   * the two clubs, the shots, the saves and the corners, and the man the career is about
   * never appeared in ninety minutes of his own quarter-final. The bracket was his club's;
   * he was reading about it.
   *
   * `played` is the team sheet - see `roundOdds`, which asks whether a man of his rating,
   * in his role, playing as much as he has been, is in the side for this round. When he is,
   * the same repertoire a decisive night draws on puts him in the match: a keeper claims
   * crosses, a centre-back throws himself in front of things, a midfielder threads the
   * pass. He does not decide the tie - the tie was settled by the bracket - he plays in it,
   * which is the difference between a competition happening to you and one you are in.
   *
   * `null` means nobody asked, which is every caller outside the career loop. Those get the
   * feed exactly as it was.
   */
  /*
   * ONE OF THEM CAN BE HIS.
   *
   * Drawn before the furniture so the choice is made against the goals the tie actually
   * had - it never invents one, and it never takes one away. `mine` is an index into the
   * goals for us, or -1 for a night somebody else settled.
   */
  let mine = -1;
  if (played && ours.length) {
    const share = (GOAL_SHARE[group] ?? GOAL_SHARE.forward) * Math.max(0.5, Math.min(1.3, ovr / 78));
    if (next() < share) mine = Math.floor(next() * ours.length);
  }
  if (mine >= 0) ours[mine].id = "playerGoal";

  if (played) {
    const repertoire = PLAYER_EVENTS[group] ?? PLAYER_EVENTS.forward;
    const touches = 1 + (next() < Math.max(0.15, Math.min(0.8, (ovr - 45) / 62)) ? 1 : 0);
    for (let index = 0; index < touches; index += 1) {
      laid.push({
        minute: place(6, FULL_TIME - 4),
        id: repertoire[Math.floor(next() * repertoire.length)],
        side: "us",
        category: group === "keeper" ? "save" : group === "defensive" ? "defence" : "player",
        player: true,
      });
    }
  }

  if (!goals.length) laid.push({ minute: place(26, 38), id: "tight" });
  laid.push({ minute: 45, id: "halfTime" });
  laid.push({
    minute: place(66, 74),
    id:
      score.us < score.them ? "chasing" : score.us > score.them ? "holding" : "pressing",
  });

  let home = 0;
  let away = 0;
  const beats = laid
    .sort((a, b) => a.minute - b.minute)
    .map((beat, index) => {
      // A goal of his is a goal of ours, obviously - see SCORED_BY.
      if (beat.id === "goalUs" || beat.id === "playerGoal") home += 1;
      if (beat.id === "goalThem") away += 1;
      return {
        ...beat,
        home,
        away,
        state: standingOf(home, away),
        ourName,
        theirName,
        player: beat.player || beat.id === "playerGoal",
        variant: Math.floor(next() * 64) + index,
      };
    });

  // The whistle, and everything a level tie still owes: the extra half hour, the spot, and
  // the one line that says which of the two is still in the competition.
  const closing = [];
  const closingBeat = (id, extra = {}) => ({
    minute: FULL_TIME,
    id,
    ourName,
    theirName,
    home,
    away,
    state: standingOf(home, away),
    decisive: true,
    ...extra,
  });
  // The extra half hour is announced BEFORE the whistle, because that is the order it
  // happens in: ninety minutes run out, the tie is level, and only then is it over.
  if (extraTime) closing.push(closingBeat("extraTime", { variant: goals.length }));
  closing.push(closingBeat("fullTime", { variant: round?.length ?? 0 }));

  let kicks = null;
  if (penalties) {
    kicks = shootoutFor(`${seed}:${round}:${ourName}:${theirName}`, won);
    closing.push(closingBeat("shootout", { kicks, variant: goals.length }));
    closing.push(
      closingBeat(won ? "shootoutWon" : "shootoutLost", {
        variant: goals.length + 3,
        shootoutScore: kicks.score,
      }),
    );
  }
  closing.push(closingBeat(won ? "tieWon" : "tieLost", { variant: goals.length + 5 }));

  return {
    round,
    legs,
    // Whether he was in the side for this one. The screen prints it; nothing reads it.
    played,
    // And whether one of the night's goals was his.
    scored: mine >= 0,
    ourName,
    theirName,
    // No chance is ever handed over, so the clock has nowhere to stop before full time.
    moment: FULL_TIME,
    moments: [],
    chances: 0,
    aggregate,
    firstLeg,
    penalties,
    extraTime,
    beats,
    standing: { home, away },
    finish: {
      closed: true,
      scored: false,
      converted: 0,
      final: { home, away },
      won,
      beats: closing,
      shootout: kicks,
    },
  };
}

/** How often a penalty in a shootout goes in. The real figure sits around three in four. */
const SHOOTOUT_RATE = 0.74;

/**
 * The tie, from twelve yards, kick by kick.
 *
 * Real rules: five each, alternating, and the moment one side cannot be caught it stops -
 * which is why a shootout is very often 4-3 after nine kicks and not ten. Level after five
 * goes to SUDDEN DEATH: one pair at a time, both sides take theirs, and the first pair that
 * differs settles it. See `settledAfter` for the two ways this used to get the counting
 * wrong.
 *
 * The WINNER IS NOT DRAWN HERE. It arrives from the trophy roll, because the cup was
 * already decided before anybody walked up - see `settleFinal` in career.js. What this does
 * is produce a shootout that ends the way it has to, by drawing whole shootouts from the
 * seed until one does. That keeps every sequence a plausible one rather than a rigged last
 * kick, and it stays pure: same seed, same tie, same order.
 */
/** Five each, and then it is one pair at a time until a pair differs. */
export const SHOOTOUT_KICKS = 5;

/**
 * Whether the tie is already over, counted from what each side has actually taken.
 *
 * The two sides do NOT have the same number of kicks left at every point, and reading it as
 * if they did is how this got the rules wrong. After our kick in round three we have taken
 * three and they have taken two: we have two left and they have three. Measured with one
 * shared "kicks remaining" the shootout stopped at 3-0 there, which is not over - three
 * kicks is exactly enough for them to make it 3-3.
 */
const settledAfter = (us, them, usTaken, themTaken) => {
  const usLeft = Math.max(0, SHOOTOUT_KICKS - usTaken);
  const themLeft = Math.max(0, SHOOTOUT_KICKS - themTaken);
  // Once the trailing side cannot catch up even by scoring everything it has left.
  if (us > them + themLeft) return "us";
  if (them > us + usLeft) return "them";
  return null;
};

export function shootoutFor(seed, won) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const next = createStream(seed, "shootout", attempt);
    const us = [];
    const them = [];
    let scoredUs = 0;
    let scoredThem = 0;
    let winner = null;

    for (let round = 1; round <= 30 && !winner; round += 1) {
      /*
       * SUDDEN DEATH IS A PAIR, NOT A KICK.
       *
       * Past five each, the rule is that both sides take one and the tie is settled only if
       * they differ. Checked after our kick as well - which the shared count above made it
       * do, since it read "no kicks left" as "whoever is ahead has won" - it ended the
       * shootout the instant we scored the sixth, with the other side never invited to take
       * theirs. A 6-5 that the opponent was not allowed to answer is not a shootout.
       */
      const suddenDeath = round > SHOOTOUT_KICKS;

      const ours = next() < SHOOTOUT_RATE;
      us.push(ours);
      if (ours) scoredUs += 1;
      if (!suddenDeath) {
        winner = settledAfter(scoredUs, scoredThem, us.length, them.length);
        if (winner) break;
      }

      const theirs = next() < SHOOTOUT_RATE;
      them.push(theirs);
      if (theirs) scoredThem += 1;
      if (suddenDeath) {
        if (scoredUs !== scoredThem) winner = scoredUs > scoredThem ? "us" : "them";
      } else {
        winner = settledAfter(scoredUs, scoredThem, us.length, them.length);
      }
    }

    if (winner === (won ? "us" : "them")) {
      return { us, them, score: { us: scoredUs, them: scoredThem } };
    }
  }
  // Unreachable in practice; a tie that must be won is at worst one kick each.
  return { us: [won], them: [!won], score: { us: won ? 1 : 0, them: won ? 0 : 1 } };
}

/**
 * The beats that actually put the ball in the net, and whose net it goes into.
 *
 * The player's own moment is three different events - see PRODUCE_BEATS - and only two of
 * them move the board in our favour. `stopped` is deliberately absent: a save is the ball
 * NOT going in, and counting it as a goal is how a goalkeeper's clean sheet used to be
 * narrated as a 1-0 he scored himself.
 */
const SCORED_BY = {
  goalUs: "home",
  // A goal of the tie that turned out to be his. Same goal, same scoreline, named owner.
  playerGoal: "home",
  scored: "home",
  assisted: "home",
  goalThem: "away",
  conceded: "away",
};

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
  { closed = true, won = null, shootout = false, produces = "goal" } = {},
) {
  if (!broadcast) {
    return { beats: [], final: { home: 0, away: 0 }, won: false, scored: false, closed };
  }

  const taken = Array.isArray(attempts) ? attempts : [];
  const converted = taken.filter(Boolean).length;
  // WHAT COMING THROUGH DID TO THE SCOREBOARD, which is not the same question as whether
  // he came through. A goal and an assist are one for us; a save is nothing for anybody,
  // and the ones he did not make are one for them. See PRODUCE_BEATS.
  const named = PRODUCE_BEATS[produces] ?? PRODUCE_BEATS.goal;
  const stops = produces === "stop";
  const conceded = stops ? taken.length - converted : 0;
  const { home, away } = broadcast.standing;
  const final = { home: home + (stops ? 0 : converted), away: away + conceded };

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
  let runningHome = home;
  let runningAway = away;
  const beats = taken.map((came, i) => {
    if (came && !stops) runningHome += 1;
    if (!came && stops) runningAway += 1;
    return beat(broadcast.moments[i] ?? broadcast.moment, came ? named.came : named.failed, {
      home: runningHome,
      away: runningAway,
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
    const contradicts =
      won !== null &&
      final.home !== final.away &&
      won !== final.home > final.away;
    if (contradicts) {
      /*
       * The ninety minutes disagree with the result: somebody settles it late. This is the
       * ordinary way a match that was already decided elsewhere gets told.
       *
       * Only when they actually disagree. The guard used to be `final.home !== final.away`,
       * which is true of every match that is not level - so a final we were winning 2-1 and
       * DID win pushed a "they score" beat carrying the same 2-1 it already had. The line
       * announced a goal, the scoreboard did not move, and the feed had told a lie small
       * enough to be unfixable by reading it.
       */
      const minute = Math.min(FULL_TIME - 1, Math.max(broadcast.moment + 2, 86));
      const ourGoal = won;
      if (ourGoal) final.home = final.away + 1;
      else final.away = final.home + 1;
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
      const key = `${broadcast.ourName}:${broadcast.theirName}:${broadcast.moment}`;
      /*
       * A tie nobody has answered still has to be answered.
       *
       * `won` arrives from the trophy roll on a final and is null everywhere else - a
       * semi-final, most of all, which is a knockout with no trophy attached to it. Handed
       * a null, `shootoutFor` read it as false and drew a shootout the other side won, so
       * every level semi-final in the game's history ended in defeat from twelve yards. It
       * is a coin now, off the same key, which is what a shootout nobody has pre-decided is.
       */
      const settled = won === null ? createStream(key, "shootout-winner")() < 0.5 : won;
      const kicks = shootoutFor(key, settled);
      won = settled;
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
