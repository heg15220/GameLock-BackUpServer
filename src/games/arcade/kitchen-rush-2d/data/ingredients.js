const BASE_SIZE = { w: 46, h: 46 };

export const INGREDIENT_DEFINITIONS = {
  onion: {
    type: "onion",
    nameEs: "Cebolla",
    nameEn: "Onion",
    initialState: "whole",
    spriteBase: "onion",
    traits: {
      canCut: true,
      canBoil: true,
      canFry: true,
      canBake: false,
    },
    cutTransitions: [
      { from: "whole", to: "sliced", threshold: 2 },
      { from: "sliced", to: "diced", threshold: 4 },
    ],
  },
  tomato: {
    type: "tomato",
    nameEs: "Tomate",
    nameEn: "Tomato",
    initialState: "whole",
    spriteBase: "tomato",
    traits: {
      canCut: true,
      canBoil: true,
      canFry: true,
      canBake: false,
    },
    cutTransitions: [
      { from: "whole", to: "sliced", threshold: 2 },
      { from: "sliced", to: "diced", threshold: 4 },
    ],
  },
  potato: {
    type: "potato",
    nameEs: "Patata",
    nameEn: "Potato",
    initialState: "whole",
    spriteBase: "potato",
    traits: {
      canCut: true,
      canBoil: true,
      canFry: false,
      canBake: false,
    },
    cutTransitions: [
      { from: "whole", to: "diced", threshold: 3 },
    ],
  },
  meat_patty: {
    type: "meat_patty",
    nameEs: "Carne",
    nameEn: "Patty",
    initialState: "raw",
    spriteBase: "meat_patty",
    traits: {
      canCut: false,
      canBoil: false,
      canFry: true,
      canBake: false,
    },
    cutTransitions: [],
  },
  bun: {
    type: "bun",
    nameEs: "Pan",
    nameEn: "Bun",
    initialState: "raw",
    spriteBase: "bun",
    traits: {
      canCut: false,
      canBoil: false,
      canFry: false,
      canBake: true,
    },
    cutTransitions: [],
  },
  dough: {
    type: "dough",
    nameEs: "Masa",
    nameEn: "Dough",
    initialState: "raw",
    spriteBase: "dough",
    traits: {
      canCut: false,
      canBoil: false,
      canFry: false,
      canBake: true,
    },
    cutTransitions: [],
  },
  cheese: {
    type: "cheese",
    nameEs: "Queso",
    nameEn: "Cheese",
    initialState: "whole",
    spriteBase: "cheese",
    traits: {
      canCut: true,
      canBoil: false,
      canFry: false,
      canBake: true,
    },
    cutTransitions: [
      { from: "whole", to: "sliced", threshold: 2 },
    ],
  },
  lettuce: {
    type: "lettuce",
    nameEs: "Lechuga",
    nameEn: "Lettuce",
    initialState: "whole",
    spriteBase: "lettuce",
    traits: {
      canCut: true,
      canBoil: false,
      canFry: false,
      canBake: false,
    },
    cutTransitions: [
      { from: "whole", to: "shredded", threshold: 3 },
    ],
  },
  mushroom: {
    type: "mushroom",
    nameEs: "Champinon",
    nameEn: "Mushroom",
    initialState: "whole",
    spriteBase: "mushroom",
    traits: {
      canCut: true,
      canBoil: false,
      canFry: true,
      canBake: false,
    },
    cutTransitions: [
      { from: "whole", to: "sliced", threshold: 2 },
    ],
  },
  chicken: {
    type: "chicken",
    nameEs: "Pollo",
    nameEn: "Chicken",
    initialState: "raw",
    spriteBase: "chicken",
    traits: {
      canCut: false,
      canBoil: false,
      canFry: true,
      canBake: true,
    },
    cutTransitions: [],
  },
};

export const FRIDGE_INGREDIENT_ORDER = [
  "onion",
  "tomato",
  "potato",
  "meat_patty",
  "bun",
  "dough",
  "cheese",
  "lettuce",
  "mushroom",
  "chicken",
];

export function getIngredientDefinition(type) {
  return INGREDIENT_DEFINITIONS[type] ?? null;
}

export function createIngredientConfig(type, id, position) {
  const definition = getIngredientDefinition(type);
  if (!definition) {
    throw new Error(`Unknown ingredient type: ${type}`);
  }

  const state = definition.initialState;
  return {
    id,
    type,
    state,
    cutLevel: 0,
    cookLevel: 0,
    burnLevel: 0,
    temperature: 20,
    stationId: null,
    position: position ?? { x: 0, y: 0 },
    size: { ...BASE_SIZE },
    stackable: false,
    spriteKey: `${type}_${state}`,
    traits: { ...definition.traits },
    cookMethod: null,
    cookQuality: "raw",
  };
}
