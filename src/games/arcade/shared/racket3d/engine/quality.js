// Quality tiers.
//
// The same scene has to hold 60 fps on a desktop GPU and on a mid-range phone, so
// everything expensive is behind a named switch rather than sprinkled through the
// scene code.  The tier is picked once from the device, and then *demoted at
// runtime* if the frame time says we were wrong — which is the only measurement
// that is ever right.

export const TIERS = {
  high: {
    id: "high",
    maxPixelRatio: 2,
    shadows: "soft",          // PCF shadow map
    shadowMapSize: 2048,
    crowd: "animated",        // instanced, per-instance idle + celebration
    crowdCount: 2400,
    stringBed: true,          // individually rendered racket strings
    netMesh: true,            // instanced net cords that deform on impact
    ballTrail: 26,
    lightBeams: true,
    cameraShake: true,
    antialias: true,
  },
  medium: {
    id: "medium",
    maxPixelRatio: 1.75,
    shadows: "hard",
    shadowMapSize: 1024,
    crowd: "static",
    crowdCount: 1200,
    stringBed: true,
    netMesh: true,
    ballTrail: 16,
    lightBeams: false,
    cameraShake: true,
    antialias: true,
  },
  low: {
    id: "low",
    maxPixelRatio: 1.5,
    shadows: "blob",          // a projected disc, no shadow map at all
    shadowMapSize: 0,
    crowd: "impostor",        // a couple of textured planes
    crowdCount: 0,
    stringBed: false,
    netMesh: false,
    ballTrail: 10,
    lightBeams: false,
    cameraShake: false,
    antialias: false,
  },
};

const isCoarsePointer = () =>
  typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;

export function detectTier() {
  if (typeof navigator === "undefined") return TIERS.medium;

  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = navigator.deviceMemory ?? 4;
  const coarse = isCoarsePointer();
  const width = typeof window !== "undefined" ? window.innerWidth : 1280;

  // A phone: coarse pointer, narrow viewport.
  if (coarse && width < 820) return TIERS.low;
  // A tablet, or a weak laptop.
  if (coarse || cores <= 4 || memory <= 4) return TIERS.medium;
  return TIERS.high;
}

// Watches the frame time and steps down a tier when the budget is blown for long
// enough that it is clearly not a hiccup.  It never steps back up: oscillating
// between tiers looks far worse than sitting one notch too low.
export function createTierGovernor(initial, onChange) {
  const order = ["high", "medium", "low"];
  let current = initial.id;
  let overBudget = 0;

  return {
    get tier() {
      return TIERS[current];
    },
    sample(frameMs) {
      const index = order.indexOf(current);
      if (index >= order.length - 1) return;

      // 20 ms is a comfortable 50 fps; below that we are not in trouble.
      if (frameMs > 20) overBudget += 1;
      else overBudget = Math.max(0, overBudget - 1);

      if (overBudget > 90) {
        current = order[index + 1];
        overBudget = 0;
        onChange?.(TIERS[current]);
      }
    },
  };
}
