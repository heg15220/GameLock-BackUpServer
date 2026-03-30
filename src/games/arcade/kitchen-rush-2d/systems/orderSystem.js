import { MAX_ACTIVE_ORDERS, ORDER_PATIENCE_MS, ORDER_SPAWN_INTERVAL_MS } from "../constants";
import { pickRandomRecipe } from "../data/recipes";

export function createOrder({ id, recipe, nowMs, durationMs }) {
  return {
    id,
    recipe,
    createdAtMs: nowMs,
    durationMs,
    deadlineAtMs: nowMs + durationMs,
  };
}

export function getDynamicOrderSpawnInterval(completedOrders) {
  const reduction = Math.floor(completedOrders / 3) * 1200;
  return Math.max(7000, ORDER_SPAWN_INTERVAL_MS - reduction);
}

export function getDynamicOrderPatience(completedOrders) {
  const reduction = Math.floor(completedOrders / 4) * 7000;
  return Math.max(52000, ORDER_PATIENCE_MS - reduction);
}

export function spawnOrderIfNeeded(state, randomFn = Math.random) {
  if (state.activeOrders.length >= MAX_ACTIVE_ORDERS) {
    return false;
  }

  if (state.orderSpawnTimerMs > 0) {
    return false;
  }

  const recipe = pickRandomRecipe(randomFn);
  const patienceMs = getDynamicOrderPatience(state.ordersCompleted);
  const order = createOrder({
    id: `order_${state.nextOrderId++}`,
    recipe,
    nowMs: state.elapsedMs,
    durationMs: patienceMs,
  });

  state.activeOrders.push(order);
  state.orderSpawnTimerMs = getDynamicOrderSpawnInterval(state.ordersCompleted);
  return true;
}

export function updateOrderTimers(state, deltaMs) {
  state.orderSpawnTimerMs = Math.max(0, state.orderSpawnTimerMs - deltaMs);

  if (state.activeOrders.length === 0) {
    return [];
  }

  const expiredOrders = [];
  state.activeOrders = state.activeOrders.filter((order) => {
    const isExpired = order.deadlineAtMs <= state.elapsedMs;
    if (isExpired) {
      expiredOrders.push(order);
      return false;
    }
    return true;
  });

  return expiredOrders;
}
