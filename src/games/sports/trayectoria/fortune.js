/**
 * Trayectoria - the shape of a season's luck.
 *
 * Everything in this file exists to fix two things the model got wrong about randomness,
 * and it fixes both without moving a single average. That property is the point: the
 * balance of this game was measured over thousands of careers, and a change to how the
 * dice are shaped must not quietly become a change to how often you win.
 *
 * ── 1. A season was too predictable ────────────────────────────────────────────
 *
 * Goals used to be `round(expected x U)` with U uniform on [0.75, 1.25]. That gives a
 * standard deviation of 0.144 x expected at every level, so the *relative* spread of a
 * season was constant. Real counting outcomes go the other way: the more you are expected
 * to score, the more predictable the tally is, because sd/mean falls as 1/sqrt(mean).
 * Measured on the old model, a fringe striker expected to score 1.7 goals scored 1 or 2
 * in four thousand simulated seasons - never nought, never five. There was no bad year to
 * come back from and no season that surprised anybody.
 *
 * What replaces it is the standard model for this: a Poisson count around a rate that is
 * itself random. Draw a `form` factor with mean exactly 1, then count with a Poisson at
 * `expected x form`. The variance becomes
 *
 *     Var = expected + expected^2 x (e^(sigma^2) - 1)
 *
 * - the Poisson term dominates the small numbers (a fringe player's season is mostly
 * chance) and the form term dominates the big ones (a 20-goal striker's season is mostly
 * whether he was any good that year). Both means are untouched, because a Poisson is
 * unbiased and the form factor is built to average 1.
 *
 * ── 2. A season had no shape ───────────────────────────────────────────────────
 *
 * Every trophy was an independent coin. So a club could win the league while being no
 * more likely than usual to win the cup, and the player's goals had nothing to do with
 * either. Football does not work like that: teams have years, and the good ones sweep.
 *
 * The fix is a Gaussian copula. One latent `z` stands for how the season went for
 * everyone involved - LOW z IS A GOOD SEASON, throughout this file. Each outcome gets its
 * own normal built as
 *
 *     z_i = sqrt(rho) x z + sqrt(1 - rho) x e_i        with e_i independent
 *
 * which is again exactly standard normal, so thresholding it at `probit(p)` fires with
 * probability exactly `p`. Every marginal in tables.js survives untouched; all that
 * changes is that the outcomes now happen *together*. Doubles cluster, barren years are
 * barren, and the striker's form is drawn off the same latent, so the year the team
 * clicked is the year he scored 28.
 *
 * Pure and seed-derived like everything else here: no clock, no globals.
 */

/** Above this rate the exact method costs more than the approximation is worth. */
const POISSON_EXACT_MAX = 60;

/**
 * One standard normal from a uniform stream (Box-Muller). The stream never returns
 * exactly 0, so the logarithm is always finite.
 */
export function standardNormal(next) {
  const u1 = next();
  const u2 = next();
  return Math.sqrt(-2 * Math.log(u1 || Number.MIN_VALUE)) * Math.cos(2 * Math.PI * u2);
}

/* Acklam's rational approximation to the inverse normal CDF, good to ~1e-9 - far past
 * anything a probability in tables.js is quoted to. */
const A = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
const B = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
const C = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
const D = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
const P_LOW = 0.02425;

/** The z a probability sits at: `probit(p)` is the value a standard normal is below with probability p. */
export function probit(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  if (p < P_LOW || p > 1 - P_LOW) {
    const tail = p < P_LOW ? p : 1 - p;
    const q = Math.sqrt(-2 * Math.log(tail));
    const x =
      (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) /
      ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1);
    return p < P_LOW ? x : -x;
  }

  const q = p - 0.5;
  const r = q * q;
  return (
    ((((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) * q) /
    (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1)
  );
}

/**
 * A Poisson count. Knuth's product method is exact and costs one uniform per unit of
 * rate, which is nothing at the scale of a football season; past that the normal
 * approximation is inside a goal and the loop is not worth running.
 */
export function poisson(next, lambda) {
  if (!(lambda > 0)) return 0;

  if (lambda < POISSON_EXACT_MAX) {
    const limit = Math.exp(-lambda);
    let count = 0;
    let product = next();
    while (product > limit) {
      count += 1;
      product *= next();
    }
    return count;
  }
  return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * standardNormal(next)));
}

/**
 * Tie an outcome to the season's latent.
 *
 * `cohesion` is how much of this outcome is the season and how much is its own luck: 0
 * restores the old independent coin, 1 makes it a pure function of how the year went.
 * The result is standard normal for every cohesion, which is what keeps the marginals.
 */
export function cohere(latent, next, cohesion) {
  const rho = Math.max(0, Math.min(1, cohesion));
  if (rho <= 0) return standardNormal(next);
  if (rho >= 1) return latent;
  return Math.sqrt(rho) * latent + Math.sqrt(1 - rho) * standardNormal(next);
}

/**
 * The copula's replacement for `chance`: fires with probability exactly `p`, but in
 * sympathy with the rest of the season.
 */
export function fortunateChance(next, p, latent, cohesion) {
  if (p <= 0) return false;
  if (p >= 1) return true;
  return cohere(latent, next, cohesion) < probit(p);
}

/**
 * The same idea for something the season should make *less* likely. Relegation is the
 * case: a side having its best year in a decade does not go down.
 */
export function unfortunateChance(next, p, latent, cohesion) {
  return fortunateChance(next, p, -latent, cohesion);
}

/**
 * A multiplicative form factor with mean exactly 1, drawn off the season's latent.
 *
 * Lognormal because form is multiplicative - a good year is "a fifth more of everything",
 * not "plus four goals" - and because it cannot go negative. The `-sigma^2/2` is the
 * correction that makes the mean 1 rather than the median: without it every season would
 * quietly pay out more than the tables promise.
 */
export function formFactor(latent, next, sigma, cohesion) {
  if (!(sigma > 0)) return 1;
  const z = cohere(latent, next, cohesion);
  // Negated because low latent is a good season and a good season means high form.
  return Math.exp(-sigma * z - (sigma * sigma) / 2);
}
