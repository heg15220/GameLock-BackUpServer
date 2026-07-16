// Adaptive racket-sport AI, shared by tennis and table tennis.
//
// Three layers:
//
//   A. TIERS          – five stepped skill profiles.  Pure parameter vectors.
//   B. resolveParams  – bends those parameters, inside a band the tier itself
//                       controls, according to the live match situation.
//   C. chooseShot     – picks a stroke by expected value over candidates whose
//                       landing probability the caller obtained by rolling out
//                       the *real* physics.
//
// The AI never cheats: it plays through the same integrator the human does.  A
// higher tier is not faster than physics allows, it just misreads the ball less
// and picks better.  And because layer C scores candidates with rollouts of the
// actual engine, changing the surface, the net height or the ball's drag
// changes the AI's decisions with nothing here retuned.

export const TIER_IDS = ["rookie", "amateur", "pro", "elite", "legend"];

export const TIER_LABELS = {
  es: {
    rookie: "Novato",
    amateur: "Amateur",
    pro: "Pro",
    elite: "Élite",
    legend: "Leyenda",
  },
  en: {
    rookie: "Rookie",
    amateur: "Amateur",
    pro: "Pro",
    elite: "Elite",
    legend: "Legend",
  },
};

// reactionMs   ms before it starts moving to intercept
// readError    metres of error in the predicted bounce point, at 1s out
// footSpeed    m/s top movement speed
// accel        m/s^2
// timingJitter ms of error on the contact instant -> mishits
// aimSigma     radians of scatter around the intended target
// powerControl 0..1 fidelity of the pace it actually applies
// spinSkill    0..1 ability to impart and to read spin
// anticipation 0..1 how early it reads the opponent's shot (0 = only on contact)
// riskAppetite 0..1 baseline willingness to go for a winner
// stamina      0..1 resistance to fatigue over long rallies and matches
// composure    0..1 how the tier reacts to pressure; also sets the width of the
//              layer-B modulation band, so a rookie swings wildly with the
//              situation and a legend barely moves.
// decisionNoise softmax temperature in layer C; high = sometimes picks a
//              dominated shot
export const TIERS = {
  rookie: {
    id: "rookie",
    reactionMs: 340,
    readError: 1.45,
    footSpeed: 3.6,
    accel: 7.0,
    timingJitter: 62,
    aimSigma: 0.115,
    powerControl: 0.55,
    spinSkill: 0.22,
    anticipation: 0.05,
    riskAppetite: 0.30,
    stamina: 0.40,
    composure: 0.15,
    decisionNoise: 0.85,
  },
  amateur: {
    id: "amateur",
    reactionMs: 265,
    readError: 1.00,
    footSpeed: 4.5,
    accel: 9.0,
    timingJitter: 44,
    aimSigma: 0.078,
    powerControl: 0.68,
    spinSkill: 0.42,
    anticipation: 0.18,
    riskAppetite: 0.40,
    stamina: 0.56,
    composure: 0.32,
    decisionNoise: 0.58,
  },
  pro: {
    id: "pro",
    reactionMs: 205,
    readError: 0.66,
    footSpeed: 5.4,
    accel: 11.5,
    timingJitter: 30,
    aimSigma: 0.050,
    powerControl: 0.80,
    spinSkill: 0.62,
    anticipation: 0.36,
    riskAppetite: 0.50,
    stamina: 0.70,
    composure: 0.52,
    decisionNoise: 0.36,
  },
  elite: {
    id: "elite",
    reactionMs: 160,
    readError: 0.40,
    footSpeed: 6.2,
    accel: 13.8,
    timingJitter: 19,
    aimSigma: 0.031,
    powerControl: 0.90,
    spinSkill: 0.80,
    anticipation: 0.56,
    riskAppetite: 0.60,
    stamina: 0.84,
    composure: 0.74,
    decisionNoise: 0.20,
  },
  legend: {
    id: "legend",
    reactionMs: 125,
    readError: 0.24,
    footSpeed: 6.9,
    accel: 15.6,
    timingJitter: 11,
    aimSigma: 0.019,
    powerControl: 0.96,
    spinSkill: 0.93,
    anticipation: 0.74,
    riskAppetite: 0.68,
    stamina: 0.94,
    composure: 0.92,
    decisionNoise: 0.11,
  },
};

export function getTier(id) {
  return TIERS[id] ?? TIERS.pro;
}

export function tierIndex(id) {
  const i = TIER_IDS.indexOf(id);
  return i < 0 ? 2 : i;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// How far layer B may push a tier's numbers.  A rookie's band is wide (they
// fall apart), a legend's is narrow (they stay themselves).
const MAX_BAND = 0.55;

// ── Layer B: situation ──────────────────────────────────────────────────────

// Normalises whatever the game knows into the context the modulator consumes.
// Every field is dimensionless so tennis and table tennis feed the same shape.
export function buildContext({
  // scoring pressure signals
  breakPoint = false,
  setPoint = false,
  matchPoint = false,
  deuce = false,
  facingPressure = false, // true when the *AI* is the one who can lose the game
  // flow
  rallyLength = 0,
  fatigue = 0,          // 0..1, accumulated over the match
  momentum = 0,         // -1..1, recent points from the AI's point of view
  // geometry
  selfOffBalance = 0,   // 0..1, how far the AI is from its recovery position
  oppOffBalance = 0,    // 0..1, how far the human is out of position
  // incoming ball
  incomingSpeed = 0,    // 0..1 normalised against the game's fast ball
  incomingSpin = 0,     // 0..1 absolute spin magnitude, normalised
  incomingDepth = 0,    // 0..1, 1 = pinned right on the baseline / end of table
  contactHeight = 0.5,  // 0..1, 0 = scraping the floor, 1 = comfortable strike zone
} = {}) {
  let pressure = 0;
  if (deuce) pressure += 0.25;
  if (breakPoint) pressure += 0.45;
  if (setPoint) pressure += 0.60;
  if (matchPoint) pressure += 0.85;
  pressure = clamp(pressure, 0, 1);
  // Facing a point you can lose is heavier than holding one you can win.
  if (!facingPressure) pressure *= 0.55;

  const incomingDifficulty = clamp(
    0.42 * incomingSpeed +
      0.24 * incomingSpin +
      0.24 * incomingDepth +
      0.30 * (1 - contactHeight),
    0,
    1
  );

  return {
    pressure,
    fatigue: clamp(fatigue, 0, 1),
    momentum: clamp(momentum, -1, 1),
    rallyLength,
    rallyStrain: clamp(rallyLength / 18, 0, 1),
    selfOffBalance: clamp(selfOffBalance, 0, 1),
    oppOffBalance: clamp(oppOffBalance, 0, 1),
    incomingDifficulty,
    contactHeight: clamp(contactHeight, 0, 1),
  };
}

// Bends the tier vector with the situation, always inside the tier's own band.
//
// The signature move here: pressure makes a low-composure player worse *and*
// more timid, while it makes a high-composure player sharper *and* bolder.  The
// same break point produces opposite behaviour at opposite ends of the ladder.
export function resolveParams(tier, ctx) {
  const band = MAX_BAND * (1 - tier.composure);

  // +1 = rattled by pressure, -1 = sharpened by it.
  const pressureResponse = ctx.pressure * (1 - 2 * tier.composure);

  const staminaDrain = ctx.fatigue * (1 - tier.stamina);

  const errorInflation = clamp(
    band *
      (1.00 * pressureResponse +
        0.85 * staminaDrain +
        0.55 * ctx.rallyStrain * (1 - tier.stamina) +
        0.70 * ctx.selfOffBalance +
        0.60 * ctx.incomingDifficulty -
        0.40 * Math.max(0, ctx.momentum)),
    -band,
    band * 1.6
  );

  // Risk moves the other way from error: it rises when you smell blood and
  // falls when you are scrambling.
  const riskShift = clamp(
    band *
      (-0.90 * pressureResponse +
        0.85 * ctx.oppOffBalance -
        1.00 * ctx.selfOffBalance -
        0.45 * ctx.incomingDifficulty +
        0.35 * ctx.momentum),
    -band * 1.4,
    band * 1.4
  );

  const degrade = 1 + errorInflation;
  const sharpen = 1 - 0.55 * errorInflation;

  return {
    tierId: tier.id,
    band,
    pressureResponse,

    reactionMs: clamp(tier.reactionMs * degrade, 60, 900),
    readError: clamp(tier.readError * degrade, 0.02, 4),
    timingJitter: clamp(tier.timingJitter * degrade, 3, 220),
    aimSigma: clamp(tier.aimSigma * degrade, 0.004, 0.45),

    footSpeed: clamp(tier.footSpeed * (1 - 0.30 * staminaDrain), 1.5, 9),
    accel: clamp(tier.accel * (1 - 0.30 * staminaDrain), 3, 20),

    powerControl: clamp(tier.powerControl * sharpen, 0.2, 1),
    spinSkill: clamp(tier.spinSkill * sharpen, 0.05, 1),
    anticipation: clamp(tier.anticipation * sharpen, 0, 1),

    riskAppetite: clamp(tier.riskAppetite + riskShift, 0.04, 0.97),
    decisionNoise: clamp(tier.decisionNoise * degrade, 0.03, 1.6),
  };
}

// ── Layer C: decision ───────────────────────────────────────────────────────

// Candidates are produced by the game (it knows its own stroke vocabulary), but
// `landProb` must come from rolling out the real physics — that is the whole
// point.  Fields:
//   id          stroke identifier
//   intent      whatever the game needs to execute it
//   landProb    0..1 chance it lands in, given this AI's own error model
//   winProb     0..1 chance it wins the point outright or forces an error
//   positional  -1..1 how much better the AI's court position ends up
//   risk        0..1 chance of an unforced error if slightly mistimed
export function scoreShot(candidate, params) {
  const riskAversion = (1 - params.riskAppetite) * 1.6;
  const reward =
    1.00 * (candidate.winProb ?? 0) + 0.45 * (candidate.positional ?? 0);
  return (
    (candidate.landProb ?? 0) * reward - riskAversion * (candidate.risk ?? 0)
  );
}

export function chooseShot(candidates, params, rng = Math.random) {
  if (!candidates.length) return null;

  const scored = candidates.map((c) => ({ ...c, ev: scoreShot(c, params) }));

  const temperature = Math.max(0.03, params.decisionNoise);
  const max = Math.max(...scored.map((s) => s.ev));
  let total = 0;
  for (const s of scored) {
    s.weight = Math.exp((s.ev - max) / temperature);
    total += s.weight;
  }

  let pick = rng() * total;
  for (const s of scored) {
    pick -= s.weight;
    if (pick <= 0) return s;
  }
  return scored[scored.length - 1];
}

// ── Execution error ─────────────────────────────────────────────────────────

// Box–Muller, so mishits cluster around the intent instead of being uniformly
// wrong.
export function gaussian(rng = Math.random) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Turns an intended shot into the one actually played.  This is applied to the
// AI's own stroke, so its errors flow through the same physics as yours.
//
// It applies *error*, and only error.  How much spin a player can generate at
// all is skill, and skill is already spent: both games scale their stroke's spin
// by `spinSkill` when they build the intent.  Scaling it again here would charge
// the player for their own hands twice — and worse, it would mean the candidate
// the AI rolled out is not the ball it goes on to hit, so layer C would be
// choosing its shot by a rollout of a ball that never gets played.  What skill
// buys here is *consistency*: the weaker the hands, the wider the spin scatters
// around what was intended.
export function applyExecutionError(intent, params, rng = Math.random) {
  const aimError = gaussian(rng) * params.aimSigma;
  const powerError = gaussian(rng) * (1 - params.powerControl) * 0.22;
  const spinError = gaussian(rng) * (1 - params.spinSkill) * 0.30;
  const timingError = gaussian(rng) * params.timingJitter;

  return {
    ...intent,
    aimAngle: (intent.aimAngle ?? 0) + aimError,
    power: clamp((intent.power ?? 0.7) * (1 + powerError), 0.15, 1.25),
    spin: (intent.spin ?? 0) * clamp(1 + spinError, 0, 1.2),
    timingErrorMs: timingError,
  };
}

// Where the AI *thinks* the ball will land.  Error shrinks as the ball gets
// close, which is why a rookie commits early to the wrong spot and has to
// scramble, while a legend is already there.
export function predictLanding(trueLanding, params, timeToArrive, rng = Math.random) {
  const decay = clamp(timeToArrive / 1.0, 0.12, 1.6);
  const sigma = params.readError * decay;
  return {
    x: trueLanding.x + gaussian(rng) * sigma,
    z: trueLanding.z + gaussian(rng) * sigma * 0.7,
  };
}

// How far ahead of your contact the AI starts moving.  Anticipation buys it a
// head start; below that it pays the full reaction cost.
export function reactionDelayMs(params, opponentTellStrength = 0.5) {
  const headStart = params.anticipation * opponentTellStrength * 220;
  return Math.max(40, params.reactionMs - headStart);
}
