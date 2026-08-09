import { describe, expect, it } from "vitest";

import {
  cohere,
  formFactor,
  fortunateChance,
  poisson,
  probit,
  standardNormal,
  unfortunateChance,
} from "./fortune.js";
import { createStream } from "./rng.js";

const SAMPLES = 20000;

const meanOf = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const varianceOf = (xs) => {
  const mean = meanOf(xs);
  return xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
};

/** One long stream, so consecutive draws are independent rather than re-seeded. */
const stream = (key) => createStream("fortune-test", key);

const sample = (n, draw) => Array.from({ length: n }, draw);

describe("probit", () => {
  it("inverts the normal CDF at the values a textbook prints", () => {
    expect(probit(0.5)).toBeCloseTo(0, 9);
    expect(probit(0.975)).toBeCloseTo(1.959964, 5);
    expect(probit(0.025)).toBeCloseTo(-1.959964, 5);
    expect(probit(0.99)).toBeCloseTo(2.326348, 5);
    // Deep in the tail, where a small trophy's odds actually live.
    expect(probit(0.005)).toBeCloseTo(-2.575829, 5);
    expect(probit(0.001)).toBeCloseTo(-3.090232, 4);
  });

  it("is monotone and saturates at the ends", () => {
    let last = -Infinity;
    for (let p = 0.001; p < 1; p += 0.001) {
      const z = probit(p);
      expect(z).toBeGreaterThan(last);
      last = z;
    }
    expect(probit(0)).toBe(-Infinity);
    expect(probit(1)).toBe(Infinity);
  });
});

describe("standardNormal", () => {
  it("has mean 0 and variance 1", () => {
    const next = stream("normal");
    const xs = sample(SAMPLES, () => standardNormal(next));
    expect(meanOf(xs)).toBeCloseTo(0, 1);
    expect(varianceOf(xs)).toBeCloseTo(1, 1);
  });

  it("puts about two thirds inside one sigma", () => {
    const next = stream("sigma");
    const xs = sample(SAMPLES, () => standardNormal(next));
    const inside = xs.filter((x) => Math.abs(x) <= 1).length / xs.length;
    expect(inside).toBeGreaterThan(0.65);
    expect(inside).toBeLessThan(0.71);
  });
});

describe("poisson", () => {
  it("has mean and variance equal to its rate", () => {
    for (const lambda of [0.4, 2, 8, 25]) {
      const next = stream(`poisson-${lambda}`);
      const xs = sample(SAMPLES, () => poisson(next, lambda));
      expect(meanOf(xs) / lambda).toBeCloseTo(1, 1);
      expect(varianceOf(xs) / lambda).toBeCloseTo(1, 1);
    }
  });

  it("blanks at exactly e^-lambda", () => {
    const next = stream("poisson-zero");
    const xs = sample(SAMPLES, () => poisson(next, 1.7));
    expect(xs.filter((x) => x === 0).length / xs.length).toBeCloseTo(Math.exp(-1.7), 2);
  });

  it("returns whole non-negative counts, and nothing at all for a rate of nought", () => {
    const next = stream("poisson-int");
    for (let i = 0; i < 200; i += 1) {
      const value = poisson(next, 6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
    expect(poisson(next, 0)).toBe(0);
    expect(poisson(next, -3)).toBe(0);
  });

  it("keeps its mean past the point where it stops counting exactly", () => {
    const next = stream("poisson-big");
    const xs = sample(6000, () => poisson(next, 90));
    expect(meanOf(xs)).toBeGreaterThan(88);
    expect(meanOf(xs)).toBeLessThan(92);
  });
});

describe("the copula", () => {
  it("fires at exactly the probability it was given, at every cohesion", () => {
    for (const p of [0.005, 0.05, 0.25, 0.7]) {
      for (const rho of [0, 0.35, 0.55, 1]) {
        const next = stream(`marginal-${p}-${rho}`);
        const latents = stream(`latent-${p}-${rho}`);
        const hits = sample(SAMPLES, () =>
          fortunateChance(next, p, standardNormal(latents), rho) ? 1 : 0,
        );
        // The whole point of the change: correlation is added and the marginal is not
        // touched, so nothing measured in tables.js has to be re-measured.
        expect(meanOf(hits)).toBeCloseTo(p, 1.5);
      }
    }
  });

  it("still returns a standard normal once cohered", () => {
    const next = stream("cohere");
    const latents = stream("cohere-latent");
    const xs = sample(SAMPLES, () => cohere(standardNormal(latents), next, 0.55));
    expect(meanOf(xs)).toBeCloseTo(0, 1);
    expect(varianceOf(xs)).toBeCloseTo(1, 1);
  });

  it("makes two outcomes of the same season arrive together", () => {
    const next = stream("joint");
    const latents = stream("joint-latent");
    const p = 0.4;
    let both = 0;
    let first = 0;
    for (let i = 0; i < SAMPLES; i += 1) {
      const latent = standardNormal(latents);
      const a = fortunateChance(next, p, latent, 0.55);
      const b = fortunateChance(next, p, latent, 0.5);
      if (a) first += 1;
      if (a && b) both += 1;
    }
    // Independence would put the pair at p^2; the shared season lifts it well past that.
    expect(both / SAMPLES).toBeGreaterThan(p * p * 1.3);
    expect(both / first).toBeGreaterThan(p * 1.3);
  });

  it("has no correlation left at cohesion zero, which is the old model", () => {
    const next = stream("independent");
    const latents = stream("independent-latent");
    const p = 0.4;
    let both = 0;
    for (let i = 0; i < SAMPLES; i += 1) {
      const latent = standardNormal(latents);
      if (fortunateChance(next, p, latent, 0) && fortunateChance(next, p, latent, 0)) both += 1;
    }
    expect(both / SAMPLES).toBeCloseTo(p * p, 1);
  });

  it("pushes the other way for something a good season should prevent", () => {
    const next = stream("bad");
    const p = 0.3;
    // A season the club is running away with: the latent is well below zero.
    const goodYear = sample(4000, () => (unfortunateChance(next, p, -1.5, 0.5) ? 1 : 0));
    const badYear = sample(4000, () => (unfortunateChance(next, p, 1.5, 0.5) ? 1 : 0));
    expect(meanOf(goodYear)).toBeLessThan(p);
    expect(meanOf(badYear)).toBeGreaterThan(p);
  });
});

describe("form", () => {
  it("averages exactly one, so no rate table quietly pays out more", () => {
    const next = stream("form");
    const latents = stream("form-latent");
    const xs = sample(SAMPLES, () => formFactor(standardNormal(latents), next, 0.2, 0.3));
    expect(meanOf(xs)).toBeCloseTo(1, 1);
  });

  it("is never negative and collapses to one without a sigma", () => {
    const next = stream("form-bounds");
    for (let i = 0; i < 500; i += 1) {
      expect(formFactor(standardNormal(next), next, 0.2, 0.3)).toBeGreaterThan(0);
    }
    expect(formFactor(2, next, 0, 0.3)).toBe(1);
  });

  it("runs high in the season the club is having a good one", () => {
    const next = stream("form-latent-sign");
    // Low latent is a good season, so form has to come out above 1 there.
    expect(formFactor(-1.5, next, 0.2, 1)).toBeGreaterThan(1.2);
    expect(formFactor(1.5, next, 0.2, 1)).toBeLessThan(0.85);
  });
});
