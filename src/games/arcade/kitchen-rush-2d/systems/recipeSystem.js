function stateMatches(expected, currentState) {
  if (Array.isArray(expected)) {
    return expected.includes(currentState);
  }
  return expected === currentState;
}

function hasBurnedItems(items) {
  return items.some((item) => item.state === "burned" || item.cookQuality === "burned");
}

function hasOvercookedItems(items) {
  return items.some((item) => {
    if (item.cookQuality === "overcooked") {
      return true;
    }
    return String(item.state).includes("overcooked") || item.state === "caramelized";
  });
}

export function matchRecipeSteps(recipe, preparedItems) {
  const usedIds = new Set();
  const matchedItems = [];
  const missingSteps = [];

  for (const step of recipe.steps) {
    const found = preparedItems.find((item) => {
      if (usedIds.has(item.id)) {
        return false;
      }
      if (item.type !== step.type) {
        return false;
      }
      return stateMatches(step.state, item.state);
    });

    if (!found) {
      missingSteps.push(step);
      continue;
    }

    usedIds.add(found.id);
    matchedItems.push(found);
  }

  return {
    success: missingSteps.length === 0,
    matchedItems,
    matchedIds: [...usedIds],
    missingSteps,
  };
}

export function checkRecipeCompletion(recipe, preparedItems) {
  return matchRecipeSteps(recipe, preparedItems).success;
}

export function evaluateDelivery(order, preparedItems, nowMs, combo = 0) {
  const result = matchRecipeSteps(order.recipe, preparedItems);
  if (!result.success) {
    return {
      success: false,
      quality: "wrong",
      scoreDelta: -30,
      messageKey: "wrong",
      matchedIds: [],
      missingSteps: result.missingSteps,
    };
  }

  if (hasBurnedItems(result.matchedItems)) {
    return {
      success: false,
      quality: "burned",
      scoreDelta: -60,
      messageKey: "burned",
      matchedIds: result.matchedIds,
      missingSteps: [],
    };
  }

  const remainingMs = Math.max(0, order.deadlineAtMs - nowMs);
  const scoreWindow = order.recipe.scoreWindow ?? { perfectMs: 30000, goodMs: 14000 };
  const includesOvercooked = hasOvercookedItems(result.matchedItems);

  let quality = "late";
  let multiplier = 0.42;

  if (includesOvercooked) {
    quality = "overcooked";
    multiplier = 0.35;
  } else if (remainingMs >= scoreWindow.perfectMs) {
    quality = "perfect";
    multiplier = 1;
  } else if (remainingMs >= scoreWindow.goodMs) {
    quality = "good";
    multiplier = 0.78;
  } else {
    quality = "late";
    multiplier = 0.58;
  }

  const comboBonus = Math.max(0, combo) * 12;
  const timeBonus = Math.round((remainingMs / Math.max(1, order.durationMs)) * 80);
  const scoreDelta = Math.round(order.recipe.baseScore * multiplier) + comboBonus + timeBonus;

  return {
    success: true,
    quality,
    scoreDelta,
    messageKey: quality,
    matchedIds: result.matchedIds,
    missingSteps: [],
  };
}
