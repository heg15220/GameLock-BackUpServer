import { resolveCutTransition } from "../data/transformations";

export const KNIFE_ANIMATION = {
  frameWidth: 64,
  frameHeight: 64,
  frames: 6,
  speed: 0.08,
  loop: false,
};

export function performCut(ingredient) {
  if (!ingredient || !ingredient.traits?.canCut) {
    return { changed: false, stateChanged: false };
  }

  ingredient.cut();
  const nextState = resolveCutTransition(ingredient);
  if (!nextState) {
    ingredient.spriteKey = `${ingredient.type}_${ingredient.state}`;
    return {
      changed: true,
      stateChanged: false,
      cutLevel: ingredient.cutLevel,
      state: ingredient.state,
    };
  }

  ingredient.state = nextState;
  ingredient.spriteKey = `${ingredient.type}_${nextState}`;
  return {
    changed: true,
    stateChanged: true,
    cutLevel: ingredient.cutLevel,
    state: ingredient.state,
  };
}
