import { describe, expect, it } from "vitest";
import {
  TIERS,
  TIER_IDS,
  buildContext,
  resolveParams,
  chooseShot,
  scoreShot,
  applyExecutionError,
  predictLanding,
  reactionDelayMs,
} from "./adaptiveAi";

const calm = buildContext({});

describe("the ladder (layer A)", () => {
  it("is monotonic: every rung is strictly better than the one below", () => {
    for (let i = 1; i < TIER_IDS.length; i += 1) {
      const lower = TIERS[TIER_IDS[i - 1]];
      const upper = TIERS[TIER_IDS[i]];

      // Errors shrink as you climb...
      expect(upper.reactionMs).toBeLessThan(lower.reactionMs);
      expect(upper.readError).toBeLessThan(lower.readError);
      expect(upper.timingJitter).toBeLessThan(lower.timingJitter);
      expect(upper.aimSigma).toBeLessThan(lower.aimSigma);
      expect(upper.decisionNoise).toBeLessThan(lower.decisionNoise);

      // ...and capability grows.
      expect(upper.footSpeed).toBeGreaterThan(lower.footSpeed);
      expect(upper.powerControl).toBeGreaterThan(lower.powerControl);
      expect(upper.spinSkill).toBeGreaterThan(lower.spinSkill);
      expect(upper.anticipation).toBeGreaterThan(lower.anticipation);
      expect(upper.composure).toBeGreaterThan(lower.composure);
      expect(upper.stamina).toBeGreaterThan(lower.stamina);
    }
  });
});

describe("situational modulation (layer B)", () => {
  const pressure = buildContext({
    breakPoint: true,
    matchPoint: true,
    facingPressure: true,
  });

  it("rattles a rookie and sharpens a legend under the same pressure", () => {
    const rookieCalm = resolveParams(TIERS.rookie, calm);
    const rookieHot = resolveParams(TIERS.rookie, pressure);
    const legendCalm = resolveParams(TIERS.legend, calm);
    const legendHot = resolveParams(TIERS.legend, pressure);

    // The rookie's aim falls apart...
    expect(rookieHot.aimSigma).toBeGreaterThan(rookieCalm.aimSigma);
    // ...and they get timid.
    expect(rookieHot.riskAppetite).toBeLessThan(rookieCalm.riskAppetite);

    // The legend does the opposite on both counts: this is what "clutch" means.
    expect(legendHot.aimSigma).toBeLessThan(legendCalm.aimSigma);
    expect(legendHot.riskAppetite).toBeGreaterThan(legendCalm.riskAppetite);
  });

  it("keeps a higher tier better than a lower one even at its worst", () => {
    // A legend having a nightmare must still be sharper than a rookie at their
    // best, or the ladder would stop meaning anything.
    const legendWorst = resolveParams(
      TIERS.legend,
      buildContext({
        matchPoint: true,
        facingPressure: true,
        fatigue: 1,
        rallyLength: 30,
        selfOffBalance: 1,
        incomingSpeed: 1,
        incomingSpin: 1,
        incomingDepth: 1,
        contactHeight: 0,
        momentum: -1,
      })
    );
    const rookieBest = resolveParams(
      TIERS.rookie,
      buildContext({ momentum: 1, oppOffBalance: 1 })
    );

    expect(legendWorst.aimSigma).toBeLessThan(rookieBest.aimSigma);
    expect(legendWorst.reactionMs).toBeLessThan(rookieBest.reactionMs);
  });

  it("gives a rookie a wider band to swing around in than a legend", () => {
    expect(resolveParams(TIERS.rookie, calm).band).toBeGreaterThan(
      resolveParams(TIERS.legend, calm).band
    );
  });

  it("gets bolder when the opponent is out of position", () => {
    const open = buildContext({ oppOffBalance: 1 });
    for (const id of TIER_IDS) {
      const base = resolveParams(TIERS[id], calm);
      const smellsBlood = resolveParams(TIERS[id], open);
      expect(smellsBlood.riskAppetite).toBeGreaterThan(base.riskAppetite);
    }
  });

  it("gets safer when it is the one scrambling", () => {
    const stretched = buildContext({ selfOffBalance: 1 });
    for (const id of TIER_IDS) {
      const base = resolveParams(TIERS[id], calm);
      const scrambling = resolveParams(TIERS[id], stretched);
      expect(scrambling.riskAppetite).toBeLessThan(base.riskAppetite);
      // And a stretched player misses more.
      expect(scrambling.aimSigma).toBeGreaterThan(base.aimSigma);
    }
  });

  it("wears a low-stamina tier down faster than a high-stamina one", () => {
    const tired = buildContext({ fatigue: 1 });
    const rookieDrop =
      resolveParams(TIERS.rookie, calm).footSpeed -
      resolveParams(TIERS.rookie, tired).footSpeed;
    const legendDrop =
      resolveParams(TIERS.legend, calm).footSpeed -
      resolveParams(TIERS.legend, tired).footSpeed;
    expect(rookieDrop).toBeGreaterThan(legendDrop);
  });
});

describe("shot choice (layer C)", () => {
  const safe = { id: "safe", landProb: 0.95, winProb: 0.10, positional: 0.2, risk: 0.05 };
  const risky = { id: "risky", landProb: 0.45, winProb: 0.90, positional: 0.5, risk: 0.55 };

  it("prefers the winner when it is feeling bold and the safe ball when it is not", () => {
    const bold = { riskAppetite: 0.95, decisionNoise: 0.01 };
    const timid = { riskAppetite: 0.05, decisionNoise: 0.01 };

    expect(scoreShot(risky, bold)).toBeGreaterThan(scoreShot(safe, bold));
    expect(scoreShot(safe, timid)).toBeGreaterThan(scoreShot(risky, timid));
  });

  it("lets a noisy tier pick the worse shot sometimes, and a sharp one almost never", () => {
    const seq = (() => {
      let i = 0;
      return () => ((i = (i * 9301 + 49297) % 233280), i / 233280);
    })();

    const count = (params) => {
      let dominated = 0;
      for (let i = 0; i < 400; i += 1) {
        const pick = chooseShot([safe, risky], params, seq);
        const best =
          scoreShot(safe, params) >= scoreShot(risky, params) ? "safe" : "risky";
        if (pick.id !== best) dominated += 1;
      }
      return dominated;
    };

    const rookieParams = resolveParams(TIERS.rookie, calm);
    const legendParams = resolveParams(TIERS.legend, calm);

    expect(count(rookieParams)).toBeGreaterThan(count(legendParams));
  });

  it("returns null when there is nothing to hit", () => {
    expect(chooseShot([], resolveParams(TIERS.pro, calm))).toBeNull();
  });
});

describe("execution and reading", () => {
  it("scatters a rookie's shots more than a legend's", () => {
    const spread = (tier) => {
      const params = resolveParams(TIERS[tier], calm);
      let sum = 0;
      for (let i = 0; i < 500; i += 1) {
        const out = applyExecutionError({ aimAngle: 0, power: 0.7, spin: 0.5 }, params);
        sum += Math.abs(out.aimAngle);
      }
      return sum / 500;
    };
    expect(spread("rookie")).toBeGreaterThan(spread("legend"));
  });

  it("misreads the bounce more the further out the ball is", () => {
    const params = resolveParams(TIERS.rookie, calm);
    const truth = { x: 2, z: 8 };

    const errorAt = (time) => {
      let sum = 0;
      for (let i = 0; i < 500; i += 1) {
        const read = predictLanding(truth, params, time);
        sum += Math.hypot(read.x - truth.x, read.z - truth.z);
      }
      return sum / 500;
    };

    // The read tightens as the ball closes: a weak tier commits early to the
    // wrong spot and has to correct late.
    expect(errorAt(1.2)).toBeGreaterThan(errorAt(0.2));
  });

  it("lets anticipation buy a head start on the reaction clock", () => {
    const legend = resolveParams(TIERS.legend, calm);
    expect(reactionDelayMs(legend, 1)).toBeLessThan(reactionDelayMs(legend, 0));
    // But never below a human floor.
    expect(reactionDelayMs(legend, 1)).toBeGreaterThanOrEqual(40);
  });
});
