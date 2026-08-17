/**
 * Idolatría: what a crowd remembers, club by club.
 *
 * Until now every force in the model pushed the same way. Delta rewards you for finding
 * the club where you are worth the most, and nothing pushed back, so the optimal career
 * was a tour. This is the counterweight: standing still compounds, and leaving costs.
 *
 * Borrowed in shape from the genre, but bent to our thesis rather than theirs:
 *
 *  - A trophy you won from the bench is worth a fraction of one you played for. Our
 *    cabinet already refuses to pretend those are the same thing; the crowd agrees.
 *  - The cost of leaving is published on the offer before you take it. The point of this
 *    game is that choosing a club is a decision, not a dice roll, so a hidden loyalty
 *    tax would break the one rule the rest of the design keeps.
 *  - Without a single trophy the crowd stops at `CEILING_WITHOUT_TITLE`. You can give one
 *    club twenty-four years and still not get the statue. That is the same sentence the
 *    retirement verdict has always said, now with a number attached.
 *
 * Idolatría is per club and never expires, so going back to where you started picks up
 * where you left off - minus what walking out cost you.
 */

/** The five rungs. `min` is inclusive; the list is ordered high to low. */
export const IDOLATRY_LEVELS = [
  { min: 95, key: "leyenda" },
  { min: 75, key: "idolo" },
  { min: 50, key: "referente" },
  { min: 25, key: "querido" },
  { min: 0, key: "recien_llegado" },
];

export const IDOLATRY = {
  /** Simply being there, per season. The single biggest source over a career. */
  perSeason: 2.2,
  /** After this many seasons the crowd takes you for granted. */
  veteranFrom: 5,
  perSeasonVeteran: 1.8,

  perGoal: 0.08,
  perAssist: 0.04,

  /** OUR CALL: the split the cabinet already makes, priced. */
  titleEarned: 9,
  titleAttended: 2.5,
  promotion: 10,
  nationalTitle: 5,
  award: 7,
  debut: 5,

  /**
   * Not every cup is the same cup.
   *
   * Until now a league, a domestic cup and a European Cup were all worth `titleEarned`,
   * which is a claim no supporter of any club anywhere has ever made. A side wins its
   * league most decades and its continent once or twice in its history; the night it wins
   * the second one is the night the players in it stop being players and become the
   * photograph in the corridor. So the trophy carries a multiplier, and the continental is
   * where nearly all of it lives.
   *
   * A multiplier rather than a flat bonus, deliberately: it scales the earned/attended
   * split rather than flattening it, so a Champions League won from the bench is still
   * worth a fraction of one won on the pitch. Anything not listed is worth one.
   */
  titleWeight: {
    league: 1,
    cup: 1,
    /** The one that changes what a career is. */
    continental_a: 2.2,
    continental_b: 1.35,
    club_world_cup: 1.7,
  },

  /**
   * And the same, for what they give you on your own.
   *
   * A Balón de Oro is not a good season, it is the sentence a stand uses about you for the
   * next forty years, and it was priced at exactly one Bota de Oro. The keeper's award sits
   * with it because it is the same award: the best in the world at what you do.
   */
  awardWeight: {
    ballon_dor: 2.2,
    golden_glove: 2.2,
    golden_boot: 1.2,
  },

  /**
   * What the wage costs you, per season, per doubling above the role you actually played.
   *
   * This is the only place money touches the model, and it touches the crowd rather than
   * the football: a wage is a standard, not a budget. Signing one rung above what you end
   * up playing roughly halves what a season earns you; two rungs above and an ordinary
   * season goes backwards. Below par it works the other way, because a crowd forgives a
   * cheap player almost anything.
   */
  perWageStep: 2.6,

  leaving: -10,
  /** Walking out within this many seasons of signing is remembered differently. */
  earlyExitBefore: 3,
  leavingEarly: -16,
  /** On top of the exit, per season still left on the contract you tore up. */
  perBreachYear: -3.5,
  maxBreach: -14,
  /**
   * Turning down a club that has already paid your buy-out.
   *
   * The single loudest thing a player can say to a stand, and the only line in this table
   * that is paid for doing nothing. It is worth more than a season and less than a trophy,
   * because that is roughly where a crowd files it.
   */
  refusedClause: 9,

  /**
   * Seasons of patience a crowd's favourite is given before the club moves him on.
   *
   * This is the counterweight to OUR CALL #8. When most contracts ran four years, the deal
   * itself was what stopped a club binning you after one quiet season - `clubWantsOut` is
   * suppressed while a contract runs, and in `normal` mode a single season on the bench
   * sets it. Cut the deals to one year and that shield disappears with them: measured over
   * 220 always-renew careers, Leyenda fell from 12.8% to 0.9%, because nobody was allowed
   * to stay anywhere long enough to become one.
   *
   * So the shield moves from the paperwork to the stand, which is where it belongs and
   * where it has to be earned. A club does not sell a man the ground sings about over one
   * bad year. One extra season of rope at `referente`, two at `ídolo` and above.
   */
  patienceStep: 40,
  maxPatience: 2,
  /** Leaving for another club in the same league, once the crowd had adopted you. */
  leavingToRival: -22,
  betrayalFrom: 75,
  rivalCeiling: 49,

  /** No trophy, no statue - however long you stay. */
  ceilingWithoutTitle: 80,
  /** Past here the crowd has run out of ways to love you more. */
  softCapFrom: 85,
  softCapFactor: 0.2,
  /** Abroad you are always slightly the foreigner. */
  foreignFactor: 0.75,

  max: 100,
};

/**
 * What this particular cup or honour is worth, against the ordinary one.
 *
 * Unlisted is one, on purpose: a table that has to name everything is a table that goes
 * quietly wrong the first time a trophy is added to the model.
 */
export const weightOf = (table, id) => table?.[id] ?? 1;

export const levelOf = (value) =>
  IDOLATRY_LEVELS.find((level) => value >= level.min) ?? IDOLATRY_LEVELS[IDOLATRY_LEVELS.length - 1];

export const idolatryAt = (record, clubId) => record?.[clubId] ?? 0;

/** The club that loved you most, which is the number a career is remembered by. */
export function peakIdolatry(record = {}) {
  let best = null;
  for (const [clubId, value] of Object.entries(record)) {
    if (!best || value > best.value) best = { clubId, value };
  }
  return best;
}

/**
 * The ceiling for this club: a betrayal caps you low, and a club you never won anything
 * with caps you below the statue no matter how long you stayed.
 */
export function ceilingFor({ wonTitleHere = false, betrayed = false }) {
  if (betrayed) return IDOLATRY.rivalCeiling;
  return wonTitleHere ? IDOLATRY.max : IDOLATRY.ceilingWithoutTitle;
}

/**
 * Fold a change in, applying the soft cap on the way up and the ceiling at the end.
 * Losses are never damped - walking out costs full price.
 */
export function applyIdolatry(current, change, context = {}) {
  let next = current;
  if (change > 0) {
    const belowCap = Math.max(0, IDOLATRY.softCapFrom - current);
    const full = Math.min(change, belowCap);
    next = current + full + (change - full) * IDOLATRY.softCapFactor;
  } else {
    next = current + change;
  }
  return Math.max(0, Math.min(ceilingFor(context), next));
}

/**
 * What a season at this club was worth to its crowd. Returns the raw change; the caller
 * folds it in so the same function can drive both the number and the preview.
 */
export function seasonIdolatry({
  record,
  seasonsAtClub = 0,
  abroad = false,
  debut = false,
  wagePressure = 0,
  fromEvents = 0,
}) {
  if (!record) return 0;
  // A ban is not a season: you were not there. What you SAID in July still happened,
  // though - a suspension wipes the football, not the sentence you gave to a microphone -
  // so the decisions are the one thing that survives it.
  if (record.suspended) return fromEvents;

  const veteran = seasonsAtClub >= IDOLATRY.veteranFrom;
  let change = veteran ? IDOLATRY.perSeasonVeteran : IDOLATRY.perSeason;

  change += record.goals * IDOLATRY.perGoal;
  change += record.assists * IDOLATRY.perAssist;

  for (const title of record.titles ?? []) {
    const base = title.earned ? IDOLATRY.titleEarned : IDOLATRY.titleAttended;
    change += base * weightOf(IDOLATRY.titleWeight, title.trophy);
  }
  for (const title of record.national?.titles ?? []) {
    change += IDOLATRY.nationalTitle;
  }
  for (const award of record.awards ?? []) {
    change += IDOLATRY.award * weightOf(IDOLATRY.awardWeight, award.award);
  }
  if (record.promoted) change += IDOLATRY.promotion;
  if (debut) change += IDOLATRY.debut;

  // Relegation is not punished directly: the season's lost trophies already did that.
  if (abroad) change *= IDOLATRY.foreignFactor;

  // What you cost, measured against what you turned out to be. Applied after the foreign
  // factor because the wage is judged in full wherever you are playing.
  change -= wagePressure * IDOLATRY.perWageStep;
  // Outside the foreign factor on purpose: what you said lands where you said it, at full
  // weight. A press conference in a country that is not yours is not half a press
  // conference.
  return change + fromEvents;
}

/** How many extra seasons out of the side this crowd's regard buys you. */
export const patienceFor = (idolatry = 0) =>
  Math.min(IDOLATRY.maxPatience, Math.floor(Math.max(0, idolatry) / IDOLATRY.patienceStep));

/**
 * The price of leaving, worked out before the player commits.
 *
 * We have no derby data, so betrayal is not "same league" - between two mid-table sides
 * that is an ordinary transfer, and treating it as treason would brand every early move.
 * It is leaving a crowd that had already made you one of their own (`betrayalFrom`) for
 * a side in that same league. Nobody burns a shirt over a squad player.
 */
export function exitCost({
  seasonsAtClub = 0,
  sameCompetition = false,
  idolatryHere = 0,
  breachYears = 0,
  clausePaid = false,
}) {
  // Years still on the deal are charged on top of everything else. A free agent leaving
  // at the end of his contract pays nothing for this line, which is exactly why the
  // length of a deal is a term worth arguing about.
  //
  // A buy-out that has been met is not a deal being torn up: the club named a price and
  // was paid it, so there is no breach to charge. That is the whole return on arguing the
  // clause down at the table - not a discount, an exit that costs you only the ordinary
  // price of leaving.
  const breach = clausePaid
    ? 0
    : Math.max(IDOLATRY.maxBreach, breachYears * IDOLATRY.perBreachYear);

  if (sameCompetition && idolatryHere >= IDOLATRY.betrayalFrom) {
    return { change: IDOLATRY.leavingToRival + breach, breach, betrayal: true };
  }
  const early = seasonsAtClub < IDOLATRY.earlyExitBefore;
  return {
    change: (early ? IDOLATRY.leavingEarly : IDOLATRY.leaving) + breach,
    breach,
    betrayal: false,
  };
}

/**
 * The whole preview for one offer: where you stand now, what signing it would cost, and
 * which rung you would drop to. This is what makes the system fair - it is on the card.
 */
export function exitPreview({
  idolatry = {},
  clubId,
  seasonsAtClub,
  sameCompetition,
  breachYears = 0,
  clausePaid = false,
}) {
  const current = idolatryAt(idolatry, clubId);
  if (!clubId || current <= 0) return null;
  const { change, breach, betrayal } = exitCost({
    seasonsAtClub,
    sameCompetition,
    idolatryHere: current,
    breachYears,
    clausePaid,
  });
  const after = Math.max(0, current + change);
  return {
    current,
    change,
    breach,
    breachYears,
    after,
    betrayal,
    clausePaid,
    from: levelOf(current).key,
    to: levelOf(after).key,
    demotes: levelOf(after).key !== levelOf(current).key,
  };
}
