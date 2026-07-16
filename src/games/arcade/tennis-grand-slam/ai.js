// Tennis-specific layer of the AI: it owns the stroke vocabulary and turns the
// live point into the candidate list that adaptiveAi scores.
//
// Every candidate's landing probability comes from `predictShot`, i.e. from
// flying the shot through the real integrator, over the real net, onto the real
// surface.  Nothing here contains a hand-written table of "good shots".
import {
  buildContext,
  resolveParams,
  chooseShot,
  applyExecutionError,
  predictLanding,
  reactionDelayMs,
  getTier,
} from "../shared/racket3d/adaptiveAi";
import { getStyle } from "./players";
import {
  COURT_HALF_LENGTH,
  COURT_HALF_WIDTH,
  solveShot,
  predictShot,
  spinFor,
  inServiceBox,
  serviceBox,
} from "./physics";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Normal CDF (Abramowitz–Stegun 7.1.26).  Turns a margin-to-the-line into a
// probability given the AI's own scatter.
function phi(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

// Pace, in m/s at the racket, for a normalised power 0..1.  Shared with the
// human's stroke so both sides of the net hit the same ball.
export const MIN_PACE = 14;
export const MAX_PACE = 47;
export const paceFor = (power) =>
  MIN_PACE + (MAX_PACE - MIN_PACE) * clamp(power, 0, 1.15);

// The stroke vocabulary.  `power` and `spin` are intents; the solver turns them
// into a launch velocity and the integrator decides what actually happens.
export const STROKES = {
  flat:    { kind: "flat",    power: 0.92, spin: 0.30, branch: "low",  styleKey: "power" },
  topspin: { kind: "topspin", power: 0.74, spin: 0.85, branch: "low",  styleKey: "topspin" },
  slice:   { kind: "slice",   power: 0.55, spin: 0.75, branch: "low",  styleKey: "slice" },
  drop:    { kind: "drop",    power: 0.24, spin: 0.90, branch: "low",  styleKey: "dropShot" },
  lob:     { kind: "lob",     power: 0.48, spin: 0.55, branch: "high", styleKey: "lob" },
};

export const STROKE_IDS = Object.keys(STROKES);

// Where a stroke is aimed.  `side` is the hitter's half (-1 near, +1 far); the
// ball is aimed into the other half.
function targetsFor(side, stroke) {
  const far = -side;
  const deep = COURT_HALF_LENGTH * 0.86;
  const mid = COURT_HALF_LENGTH * 0.62;
  const short = COURT_HALF_LENGTH * 0.28;
  const wide = COURT_HALF_WIDTH * 0.84;

  if (stroke.kind === "drop") {
    return [
      { x: -wide * 0.55, z: far * short, tag: "drop-left" },
      { x: wide * 0.55, z: far * short, tag: "drop-right" },
    ];
  }
  if (stroke.kind === "lob") {
    return [
      { x: -wide * 0.5, z: far * deep, tag: "lob-left" },
      { x: wide * 0.5, z: far * deep, tag: "lob-right" },
    ];
  }
  return [
    { x: -wide, z: far * deep, tag: "deep-left" },
    { x: wide, z: far * deep, tag: "deep-right" },
    { x: 0, z: far * deep, tag: "deep-centre" },
    { x: -wide * 0.9, z: far * mid, tag: "angle-left" },
    { x: wide * 0.9, z: far * mid, tag: "angle-right" },
  ];
}

// Estimated scatter of the landing point, given how far the ball has to fly and
// how good this AI is right now.
function scatter(params, flightDistance) {
  return {
    lateral: flightDistance * params.aimSigma + 0.10,
    depth: flightDistance * (1 - params.powerControl) * 0.30 + 0.15,
    vertical: flightDistance * params.aimSigma * 0.55 + (1 - params.powerControl) * 0.18 + 0.03,
  };
}

// Probability the shot is legal: it has to clear the tape and land inside three
// lines, and the AI's own error model decides how likely each of those is.
function landingProbability(prediction, params, flightDistance) {
  if (prediction.outcome === "net" && (prediction.netClearance ?? -1) < -0.25) return 0.02;

  const s = scatter(params, flightDistance);

  const pNet = clamp(phi((prediction.netClearance ?? 0) / s.vertical), 0.01, 0.995);

  const marginSide = COURT_HALF_WIDTH - Math.abs(prediction.x);
  const marginDepth = COURT_HALF_LENGTH - Math.abs(prediction.z);

  const pSide = clamp(phi(marginSide / s.lateral), 0.01, 0.998);
  const pDepth = clamp(phi(marginDepth / s.depth), 0.01, 0.998);

  return pNet * pSide * pDepth;
}

// How much trouble the shot puts the opponent in: can they physically get
// there in time?
function pressureOnOpponent(prediction, opponent, opponentSpeed = 5.6) {
  const dx = prediction.x - opponent.x;
  const dz = prediction.z - opponent.z;
  const chase = Math.sqrt(dx * dx + dz * dz);
  const available = prediction.time + 0.30;
  const shortfall = chase - opponentSpeed * available;
  // Sigmoid: comfortably reachable -> ~0, clearly beyond them -> ~1.
  return clamp(1 / (1 + Math.exp(-shortfall / 0.55)), 0, 1);
}

// How good the AI's own court position is after playing this shot: depth is
// good, and being dragged far from your recovery spot is bad.
function positionalValue(prediction, self, restZ) {
  const depth = clamp(Math.abs(prediction.z) / COURT_HALF_LENGTH, 0, 1);
  const recovery = clamp(
    Math.sqrt(self.x * self.x + (Math.abs(self.z) - Math.abs(restZ)) ** 2) / 6,
    0,
    1
  );
  return clamp(depth - 0.7 * recovery, -1, 1);
}

// Builds every legal option for this ball and scores it.  This is layer C's
// input; layer A/B decide how well it is executed and how boldly it is chosen.
export function buildCandidates({
  contact,       // {x, y, z} where the AI meets the ball
  self,          // {x, z} AI position
  opponent,      // {x, z} human position
  side,          // -1 near, +1 far — the AI's half
  world,
  params,
  style,
  restZ,
}) {
  const candidates = [];

  for (const strokeId of STROKE_IDS) {
    const stroke = STROKES[strokeId];
    const styleWeight = style[stroke.styleKey] ?? 1;

    // Power the AI is *trying* for, nudged by its style and the pace it can
    // currently control.
    const intendedPower = clamp(
      stroke.power * (style.power ?? 1) * (0.72 + 0.28 * params.powerControl),
      0.12,
      1
    );
    const pace = paceFor(intendedPower);
    const spinMag = stroke.spin * (0.35 + 0.65 * params.spinSkill) * (style.topspin ?? 1);

    for (const target of targetsFor(side, stroke)) {
      const dirZ = Math.sign(target.z - contact.z) || -side;
      const spin = spinFor(stroke.kind, spinMag, dirZ);

      const launch = solveShot({
        from: contact,
        target,
        speed: pace,
        spin,
        branch: stroke.branch,
      });
      if (!launch) continue;

      const prediction = predictShot(launch, contact, world);
      const dx = target.x - contact.x;
      const dz = target.z - contact.z;
      const flight = Math.sqrt(dx * dx + dz * dz);

      const landProb = landingProbability(prediction, params, flight);
      const winProb = pressureOnOpponent(prediction, opponent) * (0.55 + 0.45 * (pace / MAX_PACE));
      const positional = positionalValue(prediction, self, restZ);

      candidates.push({
        id: `${strokeId}:${target.tag}`,
        strokeId,
        kind: stroke.kind,
        target,
        launch,
        pace,
        spin,
        landProb: landProb * clamp(styleWeight, 0.35, 1.6) ** 0.35,
        winProb,
        positional,
        // Risk is the chance it goes astray, weighted by how little margin the
        // shot left itself.
        risk: (1 - landProb) * (stroke.kind === "drop" || stroke.kind === "flat" ? 1.15 : 0.9),
        intent: { aimAngle: 0, power: intendedPower, spin: spinMag, kind: stroke.kind },
      });
    }
  }

  return candidates;
}

// One AI decision: pick a stroke, then miss it a bit, exactly as a human would.
export function decideStroke(input, rng = Math.random) {
  const candidates = buildCandidates(input);
  if (!candidates.length) return null;

  const picked = chooseShot(candidates, input.params, rng);
  if (!picked) return null;

  const executed = applyExecutionError(picked.intent, input.params, rng);

  // Re-solve with the pace and spin actually produced, and rotate the aim by the
  // execution error.  The AI now lives with whatever the physics does to it.
  const dx = picked.target.x - input.contact.x;
  const dz = picked.target.z - input.contact.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz) + executed.aimAngle;
  const aimed = {
    x: input.contact.x + Math.sin(angle) * dist,
    z: input.contact.z + Math.cos(angle) * dist,
  };

  const dirZ = Math.sign(aimed.z - input.contact.z) || 1;
  const spin = spinFor(picked.kind, executed.spin, dirZ);
  const launch = solveShot({
    from: input.contact,
    target: aimed,
    speed: paceFor(executed.power),
    spin,
    branch: STROKES[picked.strokeId].branch,
  });

  return launch ? { ...picked, launch, executed, aimed } : picked;
}

// ── Serving ─────────────────────────────────────────────────────────────────

export const SERVES = {
  flat: { kind: "flat", power: 1.0, spin: 0.20 },
  kick: { kind: "kick", power: 0.72, spin: 0.90 },
  slice: { kind: "slice", power: 0.80, spin: 0.60 },
};

export function decideServe({ contact, side, court, world, params, style, first }, rng = Math.random) {
  const box = serviceBox(side, court);
  const options = [];

  for (const [serveId, serve] of Object.entries(SERVES)) {
    // A second serve trades pace for margin — every player does this, but the
    // better ones give up less.
    const safety = first ? 1 : 0.72 + 0.20 * params.powerControl;
    const pace = paceFor(clamp(serve.power * (style.serve ?? 1) * safety, 0.2, 1.15));
    const spinMag = serve.spin * (0.4 + 0.6 * params.spinSkill) * (first ? 1 : 1.25);

    // Aim at the T, the body, and out wide.
    const insideX = (box.xMin + box.xMax) / 2;
    const tX = box.xMin === 0 ? box.xMax * 0.18 : box.xMin * 0.18;
    const wideX = box.xMin === 0 ? box.xMax * 0.82 : box.xMin * 0.82;
    const depthZ = (box.zMin + box.zMax) / 2 + (box.zMax - box.zMin) * 0.28 * (first ? 1 : 0.6);

    for (const [tag, x] of [["t", tX], ["body", insideX], ["wide", wideX]]) {
      const target = { x, z: depthZ };
      const dirZ = Math.sign(target.z - contact.z) || 1;
      const spin = spinFor(serve.kind, spinMag, dirZ, tag === "wide" ? 0.6 : 0);
      const launch = solveShot({ from: contact, target, speed: pace, spin, branch: "low" });
      if (!launch) continue;

      const prediction = predictShot(launch, contact, world);
      const legal = inServiceBox(prediction.x, prediction.z, side, court);
      const dx = target.x - contact.x;
      const dz = target.z - contact.z;
      const flight = Math.sqrt(dx * dx + dz * dz);

      const raw = landingProbability(prediction, params, flight);
      const landProb = legal ? raw : raw * 0.15;

      options.push({
        id: `${serveId}:${tag}`,
        strokeId: serveId,
        kind: serve.kind,
        target,
        launch,
        pace,
        spin,
        landProb,
        // An ace is pace plus placement away from the returner's middle.
        winProb: clamp((pace / MAX_PACE) * (tag === "body" ? 0.45 : 0.85), 0, 1),
        positional: first ? 0.2 : 0,
        risk: (1 - landProb) * (first ? 0.85 : 1.35),
        intent: { aimAngle: 0, power: pace / MAX_PACE, spin: spinMag, kind: serve.kind },
      });
    }
  }

  if (!options.length) return null;
  const picked = chooseShot(options, params, rng);
  const executed = applyExecutionError(picked.intent, params, rng);

  const dx = picked.target.x - contact.x;
  const dz = picked.target.z - contact.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz) + executed.aimAngle;
  const aimed = {
    x: contact.x + Math.sin(angle) * dist,
    z: contact.z + Math.cos(angle) * dist,
  };
  const dirZ = Math.sign(aimed.z - contact.z) || 1;
  const spin = spinFor(picked.kind, executed.spin, dirZ);
  const launch = solveShot({
    from: contact,
    target: aimed,
    speed: paceFor(executed.power),
    spin,
    branch: "low",
  });

  return launch ? { ...picked, launch, aimed } : picked;
}

// ── The controller the runtime drives ───────────────────────────────────────

export function createAiPlayer({ tierId, styleId, side }) {
  return {
    tier: getTier(tierId),
    style: getStyle(styleId),
    side,
    params: null,
    reactionTimer: 0,
    committed: null, // where it thinks the ball will land
    fatigue: 0,
  };
}

// Called the moment the human strikes: the AI starts its clock and commits to a
// (possibly wrong) read of where the ball is going.
export function onOpponentContact(ai, { trueLanding, timeToArrive, matchContext, rng = Math.random }) {
  ai.params = resolveParams(ai.tier, matchContext);
  ai.reactionTimer = reactionDelayMs(ai.params) / 1000;
  ai.committed = predictLanding(trueLanding, ai.params, timeToArrive, rng);
  return ai;
}

// The AI re-reads the ball as it gets closer: the error term shrinks with time
// to arrival, so a rookie visibly corrects late while a legend was already
// standing there.
export function refineRead(ai, { trueLanding, timeToArrive, rng = Math.random }) {
  if (!ai.params || !ai.committed) return ai;
  const fresh = predictLanding(trueLanding, ai.params, timeToArrive, rng);
  // Blend toward the new read rather than snapping, so movement stays smooth.
  const blend = clamp(1 - timeToArrive / 1.2, 0.05, 0.5);
  ai.committed = {
    x: ai.committed.x + (fresh.x - ai.committed.x) * blend,
    z: ai.committed.z + (fresh.z - ai.committed.z) * blend,
  };
  return ai;
}

export function buildMatchContext(raw) {
  return buildContext(raw);
}
