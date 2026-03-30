export const RECIPES = [
  {
    id: "soup_01",
    nameEs: "Sopa Rustica",
    nameEn: "Rustic Soup",
    summaryEs: "Cebolla, tomate y patata cortados + coccion en olla.",
    summaryEn: "Diced onion, tomato, potato boiled in pot.",
    steps: [
      { type: "onion", state: "boiled_cooked" },
      { type: "tomato", state: "boiled_cooked" },
      { type: "potato", state: "boiled_cooked" },
    ],
    scoreWindow: {
      perfectMs: 42000,
      goodMs: 20000,
    },
    baseScore: 260,
  },
  {
    id: "burger_01",
    nameEs: "Burger Clasica",
    nameEn: "Classic Burger",
    summaryEs: "Carne en sarten, cebolla salteada y pan tostado.",
    summaryEn: "Pan-fried patty, sauteed onion, toasted bun.",
    steps: [
      { type: "meat_patty", state: "fried_cooked" },
      { type: "onion", state: "sauteed" },
      { type: "bun", state: "toasted" },
    ],
    scoreWindow: {
      perfectMs: 38000,
      goodMs: 17000,
    },
    baseScore: 320,
  },
  {
    id: "pizza_01",
    nameEs: "Pizza Flash",
    nameEn: "Pizza Flash",
    summaryEs: "Masa horneada con tomate en cubos preparado.",
    summaryEn: "Baked dough with prepared diced tomato.",
    steps: [
      { type: "dough", state: "baked_cooked" },
      { type: "tomato", state: "diced" },
    ],
    scoreWindow: {
      perfectMs: 45000,
      goodMs: 22000,
    },
    baseScore: 300,
  },
  {
    id: "mushroom_burger",
    nameEs: "Burger Champinon",
    nameEn: "Mushroom Burger",
    summaryEs: "Carne frita, champinon salteado y pan tostado.",
    summaryEn: "Fried patty, sauteed mushroom, toasted bun.",
    steps: [
      { type: "meat_patty", state: "fried_cooked" },
      { type: "mushroom", state: "fried_cooked" },
      { type: "bun", state: "toasted" },
    ],
    scoreWindow: {
      perfectMs: 40000,
      goodMs: 18000,
    },
    baseScore: 380,
  },
  {
    id: "veggie_pizza",
    nameEs: "Pizza de Queso",
    nameEn: "Cheese Pizza",
    summaryEs: "Masa horneada con tomate, queso derretido.",
    summaryEn: "Baked dough with diced tomato and melted cheese.",
    steps: [
      { type: "dough", state: "baked_cooked" },
      { type: "tomato", state: "diced" },
      { type: "cheese", state: "melted" },
    ],
    scoreWindow: {
      perfectMs: 48000,
      goodMs: 24000,
    },
    baseScore: 420,
  },
  {
    id: "chicken_bake",
    nameEs: "Bandeja de Pollo",
    nameEn: "Chicken Tray",
    summaryEs: "Pollo horneado con patata y cebolla cocidos.",
    summaryEn: "Baked chicken with boiled potato and onion.",
    steps: [
      { type: "chicken", state: "baked_cooked" },
      { type: "potato", state: "boiled_cooked" },
      { type: "onion", state: "boiled_cooked" },
    ],
    scoreWindow: {
      perfectMs: 52000,
      goodMs: 26000,
    },
    baseScore: 460,
  },
  {
    id: "caesar_salad",
    nameEs: "Ensalada Cesar",
    nameEn: "Caesar Salad",
    summaryEs: "Lechuga troceada, tomate en cubos y cebolla picada.",
    summaryEn: "Shredded lettuce, diced tomato and diced onion.",
    steps: [
      { type: "lettuce", state: "shredded" },
      { type: "tomato", state: "diced" },
      { type: "onion", state: "diced" },
    ],
    scoreWindow: {
      perfectMs: 35000,
      goodMs: 16000,
    },
    baseScore: 280,
  },
];

export function getRecipeById(recipeId) {
  return RECIPES.find((recipe) => recipe.id === recipeId) ?? null;
}

export function pickRandomRecipe(randomFn = Math.random) {
  const index = Math.floor(randomFn() * RECIPES.length);
  return RECIPES[index] ?? RECIPES[0];
}
