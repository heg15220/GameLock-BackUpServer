const ACTIVE_TEMPERATURE = {
  boil: 70,
  fry: 120,
  bake: 145,
};

const IDEAL_TEMPERATURE = {
  boil: 92,
  fry: 190,
  bake: 180,
};

export const COOKING_PROFILE = {
  onion: {
    boil: {
      ideal: 8,
      overcook: 13,
      burn: null,
      states: {
        ideal: "boiled_cooked",
        overcook: "boiled_overcooked",
      },
    },
    fry: {
      ideal: 6,
      overcook: 10,
      burn: 15,
      states: {
        ideal: "sauteed",
        overcook: "caramelized",
        burn: "burned",
      },
    },
  },
  tomato: {
    boil: {
      ideal: 7,
      overcook: 11,
      burn: null,
      states: {
        ideal: "boiled_cooked",
        overcook: "boiled_overcooked",
      },
    },
    fry: {
      ideal: 5,
      overcook: 8,
      burn: 12,
      states: {
        ideal: "fried_cooked",
        overcook: "fried_overcooked",
        burn: "burned",
      },
    },
  },
  potato: {
    boil: {
      ideal: 9,
      overcook: 13,
      burn: null,
      states: {
        ideal: "boiled_cooked",
        overcook: "boiled_overcooked",
      },
    },
  },
  meat_patty: {
    fry: {
      ideal: 6,
      overcook: 9,
      burn: 12,
      states: {
        ideal: "fried_cooked",
        overcook: "fried_overcooked",
        burn: "burned",
      },
    },
  },
  bun: {
    bake: {
      ideal: 8,
      overcook: 11,
      burn: 14,
      states: {
        ideal: "toasted",
        overcook: "baked_overcooked",
        burn: "burned",
      },
    },
  },
  dough: {
    bake: {
      ideal: 11,
      overcook: 16,
      burn: 22,
      states: {
        ideal: "baked_cooked",
        overcook: "baked_overcooked",
        burn: "burned",
      },
    },
  },
  cheese: {
    bake: {
      ideal: 5,
      overcook: 9,
      burn: 14,
      states: {
        ideal: "melted",
        overcook: "baked_overcooked",
        burn: "burned",
      },
    },
  },
  mushroom: {
    fry: {
      ideal: 5,
      overcook: 8,
      burn: 12,
      states: {
        ideal: "fried_cooked",
        overcook: "fried_overcooked",
        burn: "burned",
      },
    },
  },
  chicken: {
    fry: {
      ideal: 8,
      overcook: 12,
      burn: 17,
      states: {
        ideal: "fried_cooked",
        overcook: "fried_overcooked",
        burn: "burned",
      },
    },
    bake: {
      ideal: 10,
      overcook: 15,
      burn: 20,
      states: {
        ideal: "baked_cooked",
        overcook: "baked_overcooked",
        burn: "burned",
      },
    },
  },
};

function resolveMethodFromStation(stationType) {
  if (stationType === "pot") return "boil";
  if (stationType === "pan") return "fry";
  if (stationType === "oven") return "bake";
  return null;
}

export function canDropIngredientOnStation(ingredient, station) {
  if (!ingredient || !station) {
    return false;
  }

  if (station.type === "cutting_board") return Boolean(ingredient.traits.canCut);
  if (station.type === "pot") return Boolean(ingredient.traits.canBoil);
  if (station.type === "pan") return Boolean(ingredient.traits.canFry);
  if (station.type === "oven") return Boolean(ingredient.traits.canBake);
  if (station.type === "plating") return true;
  return false;
}

export function getProfile(type, method) {
  return COOKING_PROFILE[type]?.[method] ?? null;
}

export function updateCooking(ingredient, deltaTime, method, stationTemperature) {
  const profile = getProfile(ingredient.type, method);
  if (!profile) {
    return ingredient;
  }

  const minTemp = ACTIVE_TEMPERATURE[method] ?? 80;
  if (stationTemperature < minTemp) {
    ingredient.temperature = stationTemperature;
    return ingredient;
  }

  const idealTemperature = IDEAL_TEMPERATURE[method] ?? minTemp;
  const heatRatio = Math.max(0.25, Math.min(2, stationTemperature / idealTemperature));
  const cookDelta = deltaTime * heatRatio;

  ingredient.cook(cookDelta);
  ingredient.temperature = stationTemperature;
  ingredient.cookMethod = method;

  if (profile.burn !== null && ingredient.cookLevel >= profile.burn) {
    ingredient.state = profile.states.burn ?? "burned";
    ingredient.cookQuality = "burned";
    ingredient.burn(cookDelta * 0.8);
  } else if (profile.overcook !== null && ingredient.cookLevel >= profile.overcook) {
    ingredient.state = profile.states.overcook ?? `${method}_overcooked`;
    ingredient.cookQuality = "overcooked";
    ingredient.burn(cookDelta * 0.2);
  } else if (ingredient.cookLevel >= profile.ideal) {
    ingredient.state = profile.states.ideal ?? `${method}_cooked`;
    ingredient.cookQuality = "ideal";
  } else {
    ingredient.cookQuality = "undercooked";
  }

  ingredient.spriteKey = `${ingredient.type}_${ingredient.state}`;
  return ingredient;
}

export function updateIngredientInStation(ingredient, station, deltaTime) {
  if (!station || !station.isOn) {
    return ingredient;
  }

  const method = resolveMethodFromStation(station.type);
  if (!method) {
    return ingredient;
  }

  return updateCooking(ingredient, deltaTime, method, station.temperature);
}

export function evaluateCookLevel(cookLevel, ideal, goodMargin) {
  const diff = Math.abs(cookLevel - ideal);
  if (diff <= 1) return "perfect";
  if (diff <= goodMargin) return "good";
  if (cookLevel > ideal + goodMargin) return "overcooked";
  return "undercooked";
}

export function getCookTint(cookLevel, ideal, burn) {
  if (cookLevel < ideal) return 0;
  if (!burn) {
    return Math.min(0.45, (cookLevel - ideal) * 0.06);
  }
  if (cookLevel >= burn) return 0.72;
  return ((cookLevel - ideal) / (burn - ideal)) * 0.72;
}

export function resolveCookingMethodFromStationType(stationType) {
  return resolveMethodFromStation(stationType);
}
