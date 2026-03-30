import { getIngredientDefinition } from "./ingredients";

export const TRANSFORMATIONS = {
  onion: {
    cut: {
      whole: "sliced",
      sliced: "diced",
    },
    fry: {
      whole: "burned",
      sliced: "sauteed",
      diced: "caramelized",
    },
    boil: {
      diced: "boiled_cooked",
    },
  },
  tomato: {
    cut: {
      whole: "sliced",
      sliced: "diced",
    },
    fry: {
      sliced: "fried_cooked",
      diced: "fried_cooked",
    },
    boil: {
      diced: "boiled_cooked",
    },
  },
  potato: {
    cut: {
      whole: "diced",
    },
    boil: {
      diced: "boiled_cooked",
    },
  },
  meat_patty: {
    fry: {
      raw: "fried_cooked",
    },
  },
  bun: {
    bake: {
      raw: "toasted",
    },
  },
  dough: {
    bake: {
      raw: "baked_cooked",
    },
  },
  cheese: {
    bake: {
      sliced: "melted",
    },
  },
  lettuce: {
    cut: {
      whole: "shredded",
    },
  },
  mushroom: {
    cut: {
      whole: "sliced",
    },
    fry: {
      sliced: "fried_cooked",
    },
  },
  chicken: {
    fry: {
      raw: "fried_cooked",
    },
    bake: {
      raw: "baked_cooked",
    },
  },
};

export function applyActionToIngredient(ingredient, action) {
  const rules = TRANSFORMATIONS[ingredient.type];
  if (!rules || !rules[action]) {
    return ingredient;
  }
  const nextState = rules[action][ingredient.state];
  if (!nextState) {
    return ingredient;
  }

  ingredient.state = nextState;
  ingredient.spriteKey = `${ingredient.type}_${nextState}`;
  return ingredient;
}

export function resolveCutTransition(ingredient) {
  const definition = getIngredientDefinition(ingredient.type);
  if (!definition || !Array.isArray(definition.cutTransitions) || definition.cutTransitions.length === 0) {
    return null;
  }

  for (const transition of definition.cutTransitions) {
    if (ingredient.state === transition.from && ingredient.cutLevel >= transition.threshold) {
      return transition.to;
    }
  }
  return null;
}
