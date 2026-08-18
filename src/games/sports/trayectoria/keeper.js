/**
 * The man in the other goal, and how much he knows about you.
 *
 * ── What was wrong with the old one ───────────────────────────────────────────
 *
 * There was no man. `shotFor` drew `gap` - the one placement the keeper does not cover -
 * from a flat stream, once per fixture, and that was the whole of the opposition. Three
 * consequences, all of them things a player notices before the model does:
 *
 *  1. HE NEVER LEARNED. Put three penalties in the same corner across one night and the
 *     third was exactly as likely to go in as the first. Every real keeper in the world
 *     watches where you put the last one.
 *  2. THE GAP DID NOT MOVE BETWEEN CHANCES. Drawn once per FIXTURE, a night worth three
 *     sights of goal had one answer: find it once and repeat it twice. The most rewarding
 *     thing a player could do was stop varying.
 *  3. EVERY KEEPER WAS THE SAME KEEPER. A World Cup final against the best side in the
 *     draw and a relegation six-pointer were the same coin, which makes the opposition a
 *     label rather than an opponent.
 *
 * ── What this is ─────────────────────────────────────────────────────────────
 *
 * A keeper is two numbers. `keeperDifficulty` is how good he is TONIGHT - drawn from what
 * is at stake, who the opposition are, and how dangerous the man in front of him has been
 * lately, because sides prepare for a player in form. `keeperDive` is where he goes, and
 * it is the one with a memory: the zones you have been using recently are the ones he
 * commits to, so shooting into your own habit is shooting at him.
 *
 * THE ECONOMY IS SAFE, and deliberately so. The model prices a season off `conversionRate`,
 * which is a POSTERIOR over what the player has actually converted rather than an
 * assumption about what he should - see the note on it in bigmatch.js. A player who keeps
 * shooting into the keeper's hands converts less, the measured rate falls, and the season
 * planner is told the truth. A player who varies sits at the same one-in-three the flat
 * draw gave him. Nothing here has to be balanced against the budget because the budget
 * reads the outcome.
 *
 * Pure and seed-derived, like everything else: same career, same keeper, same dive.
 */

import { createStream } from "./rng.js";

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

/**
 * THE GOAL, AS FIVE PLACES.
 *
 * Every shooting chance in the game aims at the same five: the four corners and the middle.
 * One vocabulary rather than a different set of names per situation - "picadita", "barrera",
 * "al segundo palo" - because those were thirteen private languages for one spatial
 * question, and a player had to learn each of them to know what he was pressing.
 *
 * Named from BEHIND THE SHOOTER, which is where the camera is: left is the left of the
 * picture. The keeper's own chances use the same five, because where he goes is the same
 * question asked of the man who has to get there.
 */
export const ZONES = [
  "arriba-izquierda",
  "arriba-derecha",
  "centro",
  "abajo-izquierda",
  "abajo-derecha",
];

/** Where each of them is in the goal mouth, in the normalised (u, v) the drawing speaks. */
export const ZONE_AT = {
  // Pushed right out into the angles. A "top corner" that sits a third of the way in is a
  // shot a keeper standing still reaches, and the whole point of choosing one is that he
  // has to commit to get there.
  "arriba-izquierda": [0.12, 0.15],
  "arriba-derecha": [0.88, 0.15],
  centro: [0.5, 0.5],
  "abajo-izquierda": [0.12, 0.85],
  "abajo-derecha": [0.88, 0.85],
};

/** Whether a placement is one of the goal's five. */
export const isZone = (placement) => Boolean(ZONE_AT[placement]);

export const KEEPER = {
  /**
   * How hard a night is before anything about it is known. A shade under half, so the
   * average keeper leaves the flat one-in-three roughly where it was.
   */
  base: 0.4,

  /**
   * WHAT IS AT STAKE. A man defending a World Cup is not the man defending a mid-table
   * Sunday, and the fixture already knows which it is - `decides` is on every night the
   * game stages. Keyed by it rather than by the fixture kind so a night that is two things
   * at once (a final that is also the derby) is priced by the thing that matters.
   */
  stake: {
    world_cup: 0.24,
    continental_a: 0.22,
    continental_nt: 0.2,
    semifinal: 0.18,
    round: 0.16,
    cup: 0.13,
    league: 0.13,
    promotion: 0.09,
    survival: 0.09,
    derby: 0.07,
  },

  /** Per point of the opponent's reputation, 0 to 5. The best sides have the best keepers. */
  perReputation: 0.045,

  /**
   * And who he is looking at. A player converting everything gets the video session, the
   * extra man on the near post and a keeper who has watched all of it - which is the most
   * ordinary thing in football and the one thing a static opponent can never express.
   * Measured against the flat third a blind guess is worth.
   */
  perForm: 0.5,
  formBaseline: 1 / 3,

  /**
   * HOW MUCH HE REMEMBERS, and how far he leans on it.
   *
   * `recall` is deliberately short. A keeper is not a database: he knows what you did in
   * this tie and roughly what you have been doing, and the fourth-last penalty of your
   * career is not in the dossier.
   */
  recall: 5,
  /*
   * HOW HARD HE LEANS ON IT, and it was nowhere near hard enough.
   *
   * At 0.62 a player could put four penalties into the same corner in one night and watch
   * the keeper go somewhere else for three of them: after seeing the same shot twice he
   * still only went there 27% of the time, which is barely above the 18% a corner gets from
   * a keeper who has seen nothing at all. That is not a man watching you, it is a man being
   * told about you afterwards.
   *
   * At this weight the second identical shot is a coin and the third is worse than one. A
   * favourite corner is still a good corner - he has four other places to be - but going
   * back to it all night is the thing it ought to be, which is a gift.
   */
  memory: 1.4,

  /*
   * THE MIDDLE IS NOT A CORNER, and drawing him uniformly across the five made it one.
   *
   * Every other zone costs him a dive: he has to pick a side and go, and if he picks wrong
   * he is on the floor watching. The middle costs him nothing - it is the one place he
   * covers by staying where he already is - so it comes up rather more than a fifth of the
   * time, and putting it down the middle is the gamble it is supposed to be rather than the
   * safest thing on the board.
   */
  middle: 1.75,

  /** Neither end is ever certain: the worst keeper in the division still saves some. */
  min: 0.06,
  max: 0.92,

  /*
   * HE GOES ONE WAY, AND THAT IS THE ONE HE CAN STOP.
   *
   * Softened for a while into a reach that fell away with distance, so a keeper who went to
   * the top left still saved a third of the shots into the bottom right. It read as a lie
   * every time it happened, and it was: you watched him dive one way and the ball go the
   * other and the screen said SAVED. A keeper commits. Put it anywhere he did not go and it
   * is in.
   *
   * What is left to be good at is the two things a keeper is actually good at: reading
   * where you are going - see `keeperDive`, which is where his whole night now lives - and
   * keeping the ones he gets to. `onTheSpot` is that second half, and it is not certain
   * either: he guesses right and is beaten anyway often enough to matter.
   */
  onTheSpot: 0.86,
  ceiling: 0.94,

  /**
   * The night, as a multiplier on all of it.
   *
   * Centred on `typical` rather than on `base`, because `base` is what a keeper is worth
   * before anything is known about the match and no real night is ever that: stake,
   * reputation and the player's form always add something. An ordinary decider lands near
   * 0.65, and that is the one the conversion rate below is measured at.
   */
  typical: 0.65,
  slope: 0.55,

  /*
   * THE OTHER HALF OF A HARD NIGHT, and without it there is barely a first half.
   *
   * Once the keeper only saves the zone he went to, everything else about him stops
   * mattering very much: he is in your zone one time in five whatever kind of night he is
   * having, so a World Cup final against the best side in the draw converted at 81% and a
   * Sunday in November at 84%. Three points of difference for the whole of `keeperDifficulty`
   * is not an opponent, it is a rounding error.
   *
   * What a hard night actually does to a footballer is not give the keeper longer arms. It
   * is the shot itself: over the bar, wide of the post, a yard too close to him. So the
   * difficulty buys a chance the ball never troubles the goal at all - and a rating is what
   * holds up against it, which is the whole difference between a player who wants the ball
   * in those minutes and one who hides.
   */
  pressure: 0.5,
  /** The rating at which nerve stops improving, and the one where it is worth nothing. */
  nerveFrom: 55,
  nerveTo: 125,
  wildest: 0.36,
};

/**
 * How good the keeper is tonight, 0 to 1.
 *
 * `form` is what the player has actually been converting - the same posterior the season
 * budget is priced off. Passing it is what makes the opposition respond to a career instead
 * of to a rating: two players with the same OVR, one of whom has scored his last six, do
 * not face the same night.
 */
export function keeperDifficulty({
  decides = null,
  reputation = 0,
  form = KEEPER.formBaseline,
  extra = 0,
} = {}) {
  const stake = KEEPER.stake[decides] ?? 0;
  const badge = clamp(reputation, 0, 5) * KEEPER.perReputation;
  // Only the part of his record that is ABOVE a blind guess counts against him. A player
  // converting less than chance is not one anybody is preparing for.
  const respect = Math.max(0, form - KEEPER.formBaseline) * KEEPER.perForm;
  return clamp(KEEPER.base + stake + badge + respect + extra, KEEPER.min, KEEPER.max);
}

/**
 * How likely this shot is saved, given where he went and where it went.
 *
 * The one number the whole moment turns on, and it is zero everywhere except the zone he
 * committed to. Not certain even there: he guesses right and is beaten anyway often enough
 * to matter, which is what `onTheSpot` is.
 */
export function saveOdds(shotZone, keeperZone, difficulty = KEEPER.typical) {
  if (shotZone !== keeperZone) return 0;
  const night = clamp(1 + KEEPER.slope * (clamp(difficulty, 0, 1) - KEEPER.typical), 0.6, 1.45);
  return clamp(KEEPER.onTheSpot * night, 0, KEEPER.ceiling);
}

/**
 * The best answer on the board: somewhere he is not.
 *
 * Under this model every zone but his is a goal, so "best" is a matter of taste rather than
 * arithmetic - and the taste is the opposite angle, which is where a footballer puts it and
 * what a replay wants to draw. Exported because the screen names it and the tests aim at
 * it, and because `gap` has always meant WHERE THE KEEPER IS NOT: pointing it at him
 * instead, even for one commit, inverted every caller that had ever trusted the name.
 */
const OPPOSITE = {
  "arriba-izquierda": "abajo-derecha",
  "arriba-derecha": "abajo-izquierda",
  centro: "abajo-derecha",
  "abajo-izquierda": "arriba-derecha",
  "abajo-derecha": "arriba-izquierda",
};

export function bestAgainst(options = [], keeperAt = null) {
  const wanted = OPPOSITE[keeperAt];
  if (wanted && options.includes(wanted) && wanted !== keeperAt) return options.indexOf(wanted);
  const other = options.findIndex((option) => option !== keeperAt);
  return other < 0 ? 0 : other;
}

/**
 * How often the shot simply is not good enough - over, wide, or straight at him.
 *
 * Rises with what the night is worth and falls with the man taking it. Nothing to do with
 * where the keeper went: this happens before he is involved at all, which is why the feed
 * calls it what it is rather than calling it a save.
 */
export function offTargetOdds(difficulty = KEEPER.typical, ovr = 75) {
  const nerve = clamp(
    1 - (ovr - KEEPER.nerveFrom) / (KEEPER.nerveTo - KEEPER.nerveFrom),
    0.25,
    1,
  );
  return clamp(KEEPER.pressure * clamp(difficulty, 0, 1) * nerve, 0, KEEPER.wildest);
}

/**
 * What a blind shot is worth against an ordinary keeper.
 *
 * Derived from the model rather than written down beside it, because the two used to be two
 * numbers: `shotScoringRate` asserted a third and the opposition was a coin that happened to
 * agree. One shot in five finds the zone he chose, and he keeps most of those - so the rest
 * is a goal, which is roughly where a real penalty sits and a good deal higher than the
 * one-in-three this game used to assume. The season budget reads it: see `conversionRate`.
 */
export const BLIND_CONVERSION =
  (1 - offTargetOdds(KEEPER.typical, 75)) *
  (1 - saveOdds(ZONES[0], ZONES[0], KEEPER.typical) / ZONES.length);

/**
 * One weight per zone: how likely he is to GO there.
 *
 * A zone this player keeps using is one he expects, so it pulls him towards it. A keeper
 * who has seen nothing spreads himself evenly. Its own function because `keeperTell` has to
 * read exactly the same numbers the dive is drawn from - a read that named a different zone
 * from the one he was actually leaning towards would be worse than no read at all.
 *
 * `avoid` turns the whole thing round, and it has to exist because half the chances in the
 * game are seen from the other side of the duel. When the PLAYER is the keeper, this is
 * drawing where the SHOOTER put it - and a shooter aims away from the corner you keep
 * diving to, not into it. Same memory, opposite sign.
 */
function diveWeights(zones, memory, difficulty, avoid = false, structural = true) {
  const seen = (memory ?? []).slice(-KEEPER.recall);
  const lean = clamp(difficulty, 0, 1) * KEEPER.memory;
  /*
   * And he does not need a season to be sure. A keeper facing the same taker for the second
   * time in one match has seen everything there is to see; the curve used to treat one shot
   * as two-fifths of an opinion, which is a scouting report rather than a pair of eyes.
   */
  const confidence = seen.length / (seen.length + 0.6);
  return zones.map((zone) => {
    const times = seen.filter((entry) => entry === zone).length;
    const expected = seen.length ? times / seen.length : 0;
    const pull = lean * expected * confidence * zones.length;
    // He does not have to commit to hold the middle, so he is there more often. Applied
    // before the inversion, so a SHOOTER read from the other side avoids it just as much.
    const home = structural && zone === "centro" ? KEEPER.middle : 1;
    return (avoid ? 1 / (1 + pull) : 1 + pull) * home;
  });
}

/**
 * WHERE HE GOES.
 *
 * Not "which placement do I leave open" - which was the old question, and the wrong one,
 * because it made the keeper a hole in a wall rather than a man. He commits, and the zone
 * he commits to is the only one he can stop - see `saveOdds` - so this draw is the whole of
 * his night. It leans towards the zones this player has been using.
 */
export function keeperDive({
  seed,
  season,
  fixtureId,
  attempt = 0,
  zones = ZONES,
  memory = [],
  difficulty = KEEPER.base,
  avoid = false,
}) {
  if (!zones.length) return zones[0];
  const weights = diveWeights(zones, memory, difficulty, avoid);

  const next = createStream(seed, "keeper", fixtureId, season, attempt);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let target = next() * total;
  for (let index = 0; index < zones.length; index += 1) {
    target -= weights[index];
    if (target <= 0) return zones[index];
  }
  return zones[zones.length - 1];
}

/**
 * What the keeper is allowed to have watched: the placements from this fixture so far, and
 * whatever the career carries in from recent nights.
 *
 * Kept here rather than assembled at the call site because the ORDER matters - the memory
 * is read most-recent-first - and because two different callers were going to get it
 * subtly different.
 */
/**
 * THE ZONE HE IS LEANING TOWARDS, or null when there is nothing to see.
 *
 * What a rating buys on a chance used to be `ruledOut`: one option struck off the list.
 * That was information under the old model, where the keeper covered everything but one
 * place; under this one it is the opposite of a favour, because four of the five zones are
 * a goal and taking one away can only cost you.
 *
 * So the read is a read. It names the zone his memory is pulling him towards - which is to
 * say, the one you have been using - and it only appears when there is a lean worth naming.
 * It is not a promise: he goes there more often than anywhere else, not always.
 */
export function keeperTell({ zones = ZONES, memory = [], difficulty = KEEPER.typical }) {
  /*
   * Read off the MEMORY alone. The middle carries a standing weight of its own - it is the
   * one place he holds without committing, see KEEPER.middle - and folding that in made the
   * read a constant: every card in every career came back "he is going to stay central",
   * which is furniture rather than a read on this player.
   */
  const weights = diveWeights(zones, memory, difficulty, false, false);
  const top = weights.reduce((best, weight, index) => (weight > weights[best] ? index : best), 0);
  const flat = weights.reduce((sum, weight) => sum + weight, 0) / weights.length;
  // A lean of less than a quarter over the average is a keeper with no habit to give away.
  return weights[top] > flat * 1.25 ? zones[top] : null;
}

export const keeperMemory = (career = [], fixture = []) =>
  [...(career ?? []), ...(fixture ?? [])].filter(Boolean).slice(-KEEPER.recall);

/** The career-long tail, trimmed. Stored on the run so a keeper can read a whole season. */
export const rememberShot = (shots = [], choice) =>
  (choice ? [...shots, choice] : [...shots]).slice(-KEEPER.recall);
