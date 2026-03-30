import {
  FIXED_STEP_MS,
  INTERACT_RANGE,
  ORDER_SPAWN_INTERVAL_MS,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  SESSION_DURATION_MS,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  STATION_HINT_RANGE,
} from "./constants";
import {
  FRIDGE_INGREDIENT_ORDER,
  createIngredientConfig,
  getIngredientDefinition,
} from "./data/ingredients";
import { createKitchenStations, isHeatedStation, listStations } from "./entities/stations";
import { Ingredient } from "./entities/Ingredient";
import { performCut } from "./systems/cuttingSystem";
import {
  canDropIngredientOnStation,
  resolveCookingMethodFromStationType,
  updateIngredientInStation,
} from "./systems/cookingSystem";
import { updateOrderTimers, spawnOrderIfNeeded } from "./systems/orderSystem";
import { evaluateDelivery } from "./systems/recipeSystem";
import {
  createCutParticles,
  createFrySpark,
  createSmokeParticle,
  createSteamParticle,
  createSuccessBurst,
  pushParticles,
  spawnBoilBubble,
  updateParticles,
} from "./systems/particleSystem";
import { drawKitchenScene } from "./render/drawKitchen";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getStationTargetConfig(stationType) {
  if (stationType === "pot") {
    return { min: 70, max: 100, step: 5, presets: [80, 90, 100] };
  }
  if (stationType === "pan") {
    return { min: 120, max: 220, step: 10, presets: [160, 180, 200] };
  }
  if (stationType === "oven") {
    return { min: 150, max: 230, step: 10, presets: [160, 180, 200, 220] };
  }
  return null;
}

function createInitialState(locale) {
  const stations = createKitchenStations();
  const stationList = listStations(stations);
  const platingStation = stations.plating_1;
  const servingStation = stations.serving_1;
  const platingCenter = platingStation.getCenter();
  const servingCenter = servingStation.getCenter();

  return {
    locale,
    mode: "menu",
    playState: "idle",
    coordinates: "origin_top_left_x_right_y_down_pixels",
    elapsedMs: 0,
    remainingMs: SESSION_DURATION_MS,
    score: 0,
    combo: 0,
    bestCombo: 0,
    mistakes: 0,
    ordersCompleted: 0,
    ordersFailed: 0,
    nextOrderId: 1,
    nextIngredientId: 1,
    orderSpawnTimerMs: ORDER_SPAWN_INTERVAL_MS,
    selectedIngredientType: FRIDGE_INGREDIENT_ORDER[0],
    availableIngredientTypes: [...FRIDGE_INGREDIENT_ORDER],
    chef: {
      x: 270,
      y: 430,
      holdingId: null,
    },
    nearestStationId: null,
    stations,
    stationList,
    ingredients: [],
    activeOrders: [],
    plateItemIds: [],
    plateLocation: "plating",
    particles: [],
    feedback: {
      text: locale === "es" ? "Inicia tu turno de cocina" : "Start your kitchen shift",
      kind: "info",
      timerMs: 2600,
    },
    message:
      locale === "es"
        ? "Corta, cocina, emplata y entrega antes del tiempo limite."
        : "Slice, cook, plate, and deliver before timers run out.",
    fullscreen: false,
    platingCenter,
    servingCenter,
  };
}

export { STAGE_WIDTH, STAGE_HEIGHT };

export default class KitchenRushRuntime {
  constructor({
    canvas,
    locale = "en",
    onSnapshot,
    onFullscreenRequest,
  }) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.locale = locale;
    this.onSnapshot = onSnapshot;
    this.onFullscreenRequest = onFullscreenRequest;
    this.state = createInitialState(locale);

    this.input = {
      left: false,
      right: false,
      up: false,
      down: false,
    };

    this.actions = {
      interact: false,
      cut: false,
      heat: false,
      serve: false,
    };

    this.animationFrame = 0;
    this.lastTime = 0;
    this.accumulator = 0;

    this.boundLoop = this.loop.bind(this);
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    this.boundBlur = this.onBlur.bind(this);
  }

  start() {
    this.canvas.width = STAGE_WIDTH;
    this.canvas.height = STAGE_HEIGHT;

    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);
    window.addEventListener("blur", this.boundBlur);

    this.emitSnapshot();
    this.render();

    this.lastTime = performance.now();
    this.animationFrame = window.requestAnimationFrame(this.boundLoop);
  }

  destroy() {
    window.cancelAnimationFrame(this.animationFrame);
    window.removeEventListener("keydown", this.boundKeyDown);
    window.removeEventListener("keyup", this.boundKeyUp);
    window.removeEventListener("blur", this.boundBlur);
  }

  loop(timestamp) {
    const delta = Math.min(50, timestamp - this.lastTime);
    this.lastTime = timestamp;
    this.accumulator += delta;

    while (this.accumulator >= FIXED_STEP_MS) {
      this.step(FIXED_STEP_MS);
      this.accumulator -= FIXED_STEP_MS;
    }

    this.render();
    this.animationFrame = window.requestAnimationFrame(this.boundLoop);
  }

  advanceTime(ms = FIXED_STEP_MS) {
    const safeMs = Math.max(0, Number(ms) || 0);
    let remaining = safeMs;
    while (remaining > 0) {
      const stepMs = Math.min(FIXED_STEP_MS, remaining);
      this.step(stepMs);
      remaining -= stepMs;
    }
    this.render();
    this.emitSnapshot();
  }

  onBlur() {
    Object.keys(this.input).forEach((key) => {
      this.input[key] = false;
    });
    this.resetActions();
  }

  isTypingContext(event) {
    const tagName = event.target?.tagName?.toLowerCase();
    return tagName === "input" || tagName === "textarea" || event.target?.isContentEditable;
  }

  onKeyDown(event) {
    if (this.isTypingContext(event)) {
      return;
    }

    const { key } = event;

    if (key === "ArrowLeft" || key === "a" || key === "A") {
      this.input.left = true;
      event.preventDefault();
      return;
    }
    if (key === "ArrowRight" || key === "d" || key === "D") {
      this.input.right = true;
      event.preventDefault();
      return;
    }
    if (key === "ArrowUp" || key === "w" || key === "W") {
      this.input.up = true;
      event.preventDefault();
      return;
    }
    if (key === "ArrowDown" || key === "s" || key === "S") {
      this.input.down = true;
      event.preventDefault();
      return;
    }

    if (key === " ") {
      if (this.state.mode === "menu" || this.state.mode === "gameover") {
        this.startRun();
      } else {
        this.actions.cut = true;
      }
      event.preventDefault();
      return;
    }

    if (key === "e" || key === "E") {
      this.actions.interact = true;
      event.preventDefault();
      return;
    }

    if (key === "t" || key === "T") {
      this.actions.heat = true;
      event.preventDefault();
      return;
    }

    if (key === "Enter") {
      if (this.state.mode === "menu" || this.state.mode === "gameover") {
        this.startRun();
      } else {
        this.actions.serve = true;
      }
      event.preventDefault();
      return;
    }

    if (key === "p" || key === "P" || key === "Escape") {
      this.togglePause();
      event.preventDefault();
      return;
    }

    if (key === "r" || key === "R") {
      this.restart();
      event.preventDefault();
      return;
    }

    if (key === "f" || key === "F") {
      this.onFullscreenRequest?.();
      event.preventDefault();
      return;
    }

    const ingredientIndex = this.resolveDigitToIngredientIndex(key);
    if (ingredientIndex !== null) {
      const type = this.state.availableIngredientTypes[ingredientIndex];
      if (type) {
        this.setSelectedIngredient(type);
      }
      event.preventDefault();
    }
  }

  onKeyUp(event) {
    const { key } = event;

    if (key === "ArrowLeft" || key === "a" || key === "A") {
      this.input.left = false;
      return;
    }
    if (key === "ArrowRight" || key === "d" || key === "D") {
      this.input.right = false;
      return;
    }
    if (key === "ArrowUp" || key === "w" || key === "W") {
      this.input.up = false;
      return;
    }
    if (key === "ArrowDown" || key === "s" || key === "S") {
      this.input.down = false;
    }
  }

  resolveDigitToIngredientIndex(key) {
    const maybeNumber = Number(key);
    if (!Number.isInteger(maybeNumber)) {
      return null;
    }
    if (maybeNumber < 1) {
      return null;
    }
    return maybeNumber - 1;
  }

  setVirtualControl(control, active) {
    const enabled = Boolean(active);
    if (control === "left") this.input.left = enabled;
    if (control === "right") this.input.right = enabled;
    if (control === "up") this.input.up = enabled;
    if (control === "down") this.input.down = enabled;

    if (!enabled) {
      return;
    }

    if (control === "interact") this.actions.interact = true;
    if (control === "cut") this.actions.cut = true;
    if (control === "heat") this.actions.heat = true;
    if (control === "serve") this.actions.serve = true;
  }

  setSelectedIngredient(type, options = {}) {
    if (!this.state.availableIngredientTypes.includes(type)) {
      return;
    }

    const source = options?.source === "ui" ? "ui" : "keyboard";
    this.state.selectedIngredientType = type;

    const nearbyStation = this.getNearestStationWithinRange();
    const canQuickPickFromFridge =
      source === "ui" &&
      this.state.mode === "playing" &&
      nearbyStation?.type === "fridge" &&
      !this.state.chef.holdingId;

    if (canQuickPickFromFridge) {
      this.handleFridgeInteraction();
      this.emitSnapshot();
      return;
    }

    const selectionHint =
      this.state.mode === "playing"
        ? (this.locale === "es"
          ? " Acercate a la nevera y pulsa E para cogerlo."
          : " Move to the fridge and press E to pick it.")
        : "";

    this.showFeedback(
      this.locale === "es"
        ? `Seleccionado: ${resolveIngredientName(type, this.locale)}.${selectionHint}`
        : `Selected: ${resolveIngredientName(type, this.locale)}.${selectionHint}`,
      "info",
      1100
    );
    this.emitSnapshot();
  }

  setFullscreenState(value) {
    this.state.fullscreen = Boolean(value);
    this.emitSnapshot();
  }

  adjustStationTarget(stationType, direction = 0) {
    const config = getStationTargetConfig(stationType);
    if (!config || !Number.isFinite(direction) || direction === 0) {
      return;
    }

    const station = this.state.stationList.find((entry) => entry.type === stationType);
    if (!station) {
      return;
    }

    const current =
      typeof station.targetTemperature === "number"
        ? station.targetTemperature
        : clamp(Math.round(station.temperature), config.min, config.max);
    const next = clamp(current + Math.sign(direction) * config.step, config.min, config.max);
    station.targetTemperature = next;

    this.showFeedback(
      this.locale === "es"
        ? `${station.labelEs}: objetivo ${Math.round(next)}C`
        : `${station.labelEn}: target ${Math.round(next)}C`,
      "info",
      850
    );
    this.emitSnapshot();
  }

  setStationTarget(stationType, targetTemperature) {
    const config = getStationTargetConfig(stationType);
    if (!config || !Number.isFinite(targetTemperature)) {
      return;
    }

    const station = this.state.stationList.find((entry) => entry.type === stationType);
    if (!station) {
      return;
    }

    const next = clamp(Math.round(targetTemperature), config.min, config.max);
    station.targetTemperature = next;

    this.showFeedback(
      this.locale === "es"
        ? `${station.labelEs}: objetivo ${Math.round(next)}C`
        : `${station.labelEn}: target ${Math.round(next)}C`,
      "info",
      850
    );
    this.emitSnapshot();
  }

  movePlateToServingZone() {
    if (this.state.mode !== "playing") {
      return;
    }

    if (this.state.activeOrders.length === 0) {
      this.showFeedback(this.locale === "es" ? "No hay pedidos activos" : "No active orders", "wrong", 900);
      return;
    }

    if (this.state.plateItemIds.length === 0) {
      this.showFeedback(this.locale === "es" ? "No hay plato para mover" : "No plated dish to move", "wrong", 900);
      return;
    }

    const preparedItems = this.state.plateItemIds
      .map((id) => this.findIngredientById(id))
      .filter(Boolean);
    const hasCompleteOrder = this.state.activeOrders.some((order) => evaluateDelivery(order, preparedItems, this.state.elapsedMs, this.state.combo).success);
    if (!hasCompleteOrder) {
      this.showFeedback(
        this.locale === "es"
          ? "Completa el pedido en el plato antes de moverlo"
          : "Complete the order on the plate before moving it",
        "info",
        1100
      );
      return;
    }

    if (this.state.plateLocation === "serving") {
      this.showFeedback(
        this.locale === "es" ? "El plato ya esta en Entrega" : "Dish is already at Serving",
        "info",
        850
      );
      return;
    }

    this.state.plateLocation = "serving";
    this.state.chef.x = this.state.servingCenter.x;
    this.state.chef.y = clamp(this.state.servingCenter.y + 56, 106, STAGE_HEIGHT - PLAYER_RADIUS);
    this.updateNearestStation();
    this.showFeedback(
      this.locale === "es"
        ? "Plato en entrega. Pulsa Enter para servir"
        : "Dish moved to serving. Press Enter to deliver",
      "good",
      1150
    );
    this.emitSnapshot();
  }

  startRun() {
    if (this.state.mode === "playing") {
      return;
    }

    this.state.mode = "playing";
    this.state.playState = "running";
    this.state.feedback = {
      text: this.locale === "es" ? "Turno iniciado" : "Shift started",
      kind: "info",
      timerMs: 900,
    };
    if (this.state.activeOrders.length === 0) {
      this.state.orderSpawnTimerMs = 200;
    }
    this.emitSnapshot();
  }

  restart() {
    const wasFullscreen = this.state.fullscreen;
    this.state = createInitialState(this.locale);
    this.state.fullscreen = wasFullscreen;
    this.startRun();
  }

  togglePause() {
    if (this.state.mode === "menu" || this.state.mode === "gameover") {
      return;
    }

    if (this.state.mode === "paused") {
      this.state.mode = "playing";
      this.state.playState = "running";
      this.showFeedback(this.locale === "es" ? "Reanudado" : "Resumed", "info", 650);
    } else {
      this.state.mode = "paused";
      this.state.playState = "paused";
      this.showFeedback(this.locale === "es" ? "Pausa" : "Paused", "info", 650);
    }
    this.emitSnapshot();
  }

  step(stepMs) {
    this.updateFeedback(stepMs);

    if (this.state.mode !== "playing") {
      this.resetActions();
      return;
    }

    this.state.elapsedMs += stepMs;
    this.state.remainingMs = Math.max(0, SESSION_DURATION_MS - this.state.elapsedMs);

    if (this.state.remainingMs <= 0) {
      this.finishRun();
      this.resetActions();
      return;
    }

    const deltaTime = stepMs / 1000;

    this.updateMovement(deltaTime);
    this.updateNearestStation();

    this.updateStations(deltaTime, stepMs);
    this.updateOrders(stepMs);

    this.processActions();

    this.alignIngredientsInStations();
    this.alignPlateItems();

    updateParticles(this.state, stepMs);
    this.emitSnapshot();
    this.resetActions();
  }

  updateMovement(deltaTime) {
    let moveX = 0;
    let moveY = 0;

    if (this.input.left) moveX -= 1;
    if (this.input.right) moveX += 1;
    if (this.input.up) moveY -= 1;
    if (this.input.down) moveY += 1;

    const magnitude = Math.hypot(moveX, moveY);
    if (magnitude > 0) {
      moveX /= magnitude;
      moveY /= magnitude;
    }

    this.state.chef.x = clamp(this.state.chef.x + moveX * PLAYER_SPEED * deltaTime, PLAYER_RADIUS, STAGE_WIDTH - PLAYER_RADIUS);
    this.state.chef.y = clamp(this.state.chef.y + moveY * PLAYER_SPEED * deltaTime, 106, STAGE_HEIGHT - PLAYER_RADIUS);

    const heldIngredient = this.getHeldIngredient();
    if (heldIngredient) {
      heldIngredient.moveTo(this.state.chef.x, this.state.chef.y - 24);
    }
  }

  updateNearestStation() {
    const { chef } = this.state;
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const station of this.state.stationList) {
      const center = station.getCenter();
      const distance = Math.hypot(center.x - chef.x, center.y - chef.y);
      if (distance < nearestDistance && distance <= STATION_HINT_RANGE) {
        nearest = station;
        nearestDistance = distance;
      }
    }

    this.state.nearestStationId = nearest?.id ?? null;
  }

  updateStations(deltaTime, stepMs) {
    for (const station of this.state.stationList) {
      station.update(deltaTime);

      if (station.type === "cutting_board") {
        station.cuttingState.knifeTimerMs = Math.max(0, station.cuttingState.knifeTimerMs - stepMs);
      }

      if (!isHeatedStation(station.type)) {
        continue;
      }

      for (const ingredientId of station.contents) {
        const ingredient = this.findIngredientById(ingredientId);
        if (!ingredient) {
          continue;
        }

        updateIngredientInStation(ingredient, station, deltaTime);

        if (station.type === "pot" && station.isOn && station.temperature > 72) {
          const center = station.getCenter();
          if (Math.random() < 0.24) {
            pushParticles(this.state, [spawnBoilBubble(center.x, center.y + 10)]);
          }
          if (Math.random() < 0.12) {
            pushParticles(this.state, [createSteamParticle(center.x, center.y - 4)]);
          }
        }

        if (station.type === "pan" && station.isOn && station.temperature > 120 && Math.random() < 0.18) {
          const center = station.getCenter();
          pushParticles(this.state, [createFrySpark(center.x + (Math.random() - 0.5) * 26, center.y + 5)]);
        }

        if (station.type === "oven" && station.isOn && station.temperature > 140 && Math.random() < 0.1) {
          const center = station.getCenter();
          pushParticles(this.state, [createSteamParticle(center.x, center.y - 14)]);
        }

        if (ingredient.state === "burned" && Math.random() < 0.16) {
          pushParticles(this.state, [createSmokeParticle(ingredient.position.x, ingredient.position.y - 8)]);
        }
      }
    }
  }

  updateOrders(stepMs) {
    const expired = updateOrderTimers(this.state, stepMs);
    if (expired.length > 0) {
      this.state.ordersFailed += expired.length;
      this.state.mistakes += expired.length;
      this.state.combo = 0;
      this.state.score = Math.max(0, this.state.score - expired.length * 45);
      this.showFeedback(
        this.locale === "es" ? "Pedido expirado" : "Order expired",
        "wrong",
        1200
      );
    }

    const didSpawn = spawnOrderIfNeeded(this.state, Math.random);
    if (didSpawn) {
      this.showFeedback(
        this.locale === "es" ? "Nuevo pedido" : "New order",
        "info",
        800
      );
    }
  }

  processActions() {
    const station = this.getNearestStationWithinRange();
    if (!station) {
      return;
    }

    if (this.actions.heat) {
      this.handleHeatToggle(station);
    }

    if (this.actions.cut) {
      this.handleCutAction(station);
    }

    if (this.actions.interact) {
      this.handleInteract(station);
    }

    if (this.actions.serve) {
      this.handleServe(station);
    }
  }

  handleInteract(station) {
    switch (station.type) {
      case "fridge":
        this.handleFridgeInteraction();
        break;
      case "cutting_board":
      case "pot":
      case "pan":
      case "oven":
        this.handleStationTransfer(station);
        break;
      case "plating":
        this.handlePlatingInteraction(station);
        break;
      case "serving":
        this.handleServe(station);
        break;
      default:
        this.showFeedback(this.locale === "es" ? "Sin accion" : "No action", "info", 650);
        break;
    }
  }

  handleFridgeInteraction() {
    if (this.state.chef.holdingId) {
      this.showFeedback(this.locale === "es" ? "Ya llevas un ingrediente" : "You are already carrying an ingredient", "info", 700);
      return;
    }

    const type = this.state.selectedIngredientType;
    const ingredientConfig = createIngredientConfig(
      type,
      `ing_${this.state.nextIngredientId++}`,
      { x: this.state.chef.x, y: this.state.chef.y - 24 }
    );

    const ingredient = new Ingredient(ingredientConfig);
    this.state.ingredients.push(ingredient);
    this.state.chef.holdingId = ingredient.id;

    this.showFeedback(
      this.locale === "es" ? `${resolveIngredientName(type, this.locale)} recogido` : `${resolveIngredientName(type, this.locale)} picked`,
      "info",
      700
    );
  }

  handleStationTransfer(station) {
    const heldIngredient = this.getHeldIngredient();

    if (heldIngredient) {
      if (!canDropIngredientOnStation(heldIngredient, station)) {
        this.showFeedback(this.locale === "es" ? "Ingrediente no compatible" : "Ingredient not compatible", "wrong", 750);
        return;
      }

      if (station.contents.length >= 3 && station.type !== "cutting_board") {
        this.showFeedback(this.locale === "es" ? "Estacion llena" : "Station is full", "wrong", 750);
        return;
      }

      this.placeHeldIngredientOnStation(station, heldIngredient);
      return;
    }

    if (station.contents.length === 0) {
      this.showFeedback(this.locale === "es" ? "No hay ingredientes" : "No ingredients here", "info", 650);
      return;
    }

    if (this.state.chef.holdingId) {
      this.showFeedback(this.locale === "es" ? "Manos ocupadas" : "Hands are busy", "wrong", 650);
      return;
    }

    const itemId = station.contents[0];
    const ingredient = this.findIngredientById(itemId);
    if (!ingredient) {
      station.removeItem(itemId);
      return;
    }

    station.removeItem(itemId);
    ingredient.stationId = null;
    ingredient.moveTo(this.state.chef.x, this.state.chef.y - 24);
    this.state.chef.holdingId = ingredient.id;
    this.showFeedback(this.locale === "es" ? "Ingrediente recogido" : "Ingredient picked up", "info", 650);
  }

  placeHeldIngredientOnStation(station, ingredient) {
    station.addItem(ingredient.id);
    ingredient.stationId = station.id;
    ingredient.cookMethod = resolveCookingMethodFromStationType(station.type);
    this.state.chef.holdingId = null;

    const center = station.getCenter();
    ingredient.moveTo(
      center.x + (Math.random() - 0.5) * 22,
      center.y + (Math.random() - 0.5) * 14
    );

    const message = this.locale === "es"
      ? `${resolveIngredientName(ingredient.type, this.locale)} en ${station.labelEs}`
      : `${resolveIngredientName(ingredient.type, this.locale)} to ${station.labelEn}`;
    this.showFeedback(message, "info", 680);
  }

  handlePlatingInteraction(station) {
    const heldIngredient = this.getHeldIngredient();

    if (heldIngredient) {
      this.state.chef.holdingId = null;
      heldIngredient.stationId = "plate_stack";
      this.state.plateItemIds.push(heldIngredient.id);
      this.state.plateLocation = "plating";
      heldIngredient.moveTo(station.x + station.w / 2, station.y + station.h / 2 - 6);
      this.showFeedback(this.locale === "es" ? "Ingrediente emplatado" : "Ingredient plated", "good", 700);
      return;
    }

    if (this.state.plateItemIds.length === 0) {
      this.showFeedback(this.locale === "es" ? "Plato vacio" : "Plate is empty", "info", 700);
      return;
    }

    const lastItemId = this.state.plateItemIds.pop();
    const ingredient = this.findIngredientById(lastItemId);
    if (!ingredient) {
      return;
    }

    ingredient.stationId = null;
    this.state.plateLocation = "plating";
    ingredient.moveTo(this.state.chef.x, this.state.chef.y - 24);
    this.state.chef.holdingId = ingredient.id;
    this.showFeedback(this.locale === "es" ? "Retirado del plato" : "Removed from plate", "info", 700);
  }

  handleCutAction(station) {
    if (station.type !== "cutting_board") {
      return;
    }
    if (station.contents.length === 0) {
      this.showFeedback(this.locale === "es" ? "Pon algo en la tabla" : "Put an item on the board", "info", 650);
      return;
    }

    const ingredient = this.findIngredientById(station.contents[0]);
    if (!ingredient) {
      return;
    }

    const result = performCut(ingredient);
    if (!result.changed) {
      this.showFeedback(this.locale === "es" ? "No se puede cortar" : "Cannot cut this ingredient", "wrong", 700);
      return;
    }

    station.cuttingState.ingredientId = ingredient.id;
    station.cuttingState.progress = ingredient.cutLevel;
    station.cuttingState.knifeTimerMs = 220;

    pushParticles(this.state, createCutParticles(ingredient.position.x, ingredient.position.y - 6, ingredient.type));

    if (result.stateChanged) {
      this.showFeedback(
        this.locale === "es"
          ? `${resolveIngredientName(ingredient.type, this.locale)} -> ${ingredient.state}`
          : `${resolveIngredientName(ingredient.type, this.locale)} -> ${ingredient.state}`,
        "good",
        800
      );
    } else {
      this.showFeedback(this.locale === "es" ? "Corte preciso" : "Clean cut", "info", 500);
    }
  }

  handleHeatToggle(station) {
    if (!isHeatedStation(station.type)) {
      return;
    }

    station.isOn = !station.isOn;
    if (this.locale === "es") {
      this.showFeedback(station.isOn ? `${station.labelEs} encendida` : `${station.labelEs} apagada`, "info", 700);
    } else {
      this.showFeedback(station.isOn ? `${station.labelEn} on` : `${station.labelEn} off`, "info", 700);
    }
  }

  handleServe(station) {
    if (station.type !== "serving") {
      return;
    }

    if (this.state.plateItemIds.length === 0) {
      this.showFeedback(this.locale === "es" ? "No hay plato para entregar" : "No dish to serve", "wrong", 850);
      return;
    }

    if (this.state.activeOrders.length === 0) {
      this.showFeedback(this.locale === "es" ? "No hay pedidos activos" : "No active orders", "wrong", 850);
      return;
    }

    const preparedItems = this.state.plateItemIds
      .map((id) => this.findIngredientById(id))
      .filter(Boolean);

    let best = null;
    for (const order of this.state.activeOrders) {
      const evaluation = evaluateDelivery(order, preparedItems, this.state.elapsedMs, this.state.combo);
      if (!evaluation.success) {
        continue;
      }
      if (!best || evaluation.scoreDelta > best.evaluation.scoreDelta) {
        best = { order, evaluation };
      }
    }

    if (!best) {
      const fallback = evaluateDelivery(this.state.activeOrders[0], preparedItems, this.state.elapsedMs, this.state.combo);
      this.state.mistakes += 1;
      this.state.ordersFailed += 1;
      this.state.combo = 0;
      this.state.score = Math.max(0, this.state.score + fallback.scoreDelta);
      this.clearPlateIngredients();
      this.showFeedback(
        this.locale === "es" ? "Entrega incorrecta" : "Wrong delivery",
        fallback.messageKey,
        1300
      );
      return;
    }

    const { order, evaluation } = best;
    this.state.activeOrders = this.state.activeOrders.filter((entry) => entry.id !== order.id);
    this.state.ordersCompleted += 1;
    this.state.combo += 1;
    this.state.bestCombo = Math.max(this.state.bestCombo, this.state.combo);
    this.state.score += evaluation.scoreDelta;

    const servingStation = this.state.stations.serving_1;
    const center = servingStation.getCenter();
    pushParticles(this.state, createSuccessBurst(center.x, center.y - 16));

    this.clearPlateIngredients();

    this.showFeedback(
      this.resolveQualityMessage(evaluation.quality, evaluation.scoreDelta),
      evaluation.quality,
      1500
    );
  }

  resolveQualityMessage(quality, scoreDelta) {
    if (this.locale === "es") {
      if (quality === "perfect") return `Perfect +${scoreDelta}`;
      if (quality === "good") return `Buen plato +${scoreDelta}`;
      if (quality === "late") return `Entrega justa +${scoreDelta}`;
      if (quality === "overcooked") return `Algo pasado +${scoreDelta}`;
      return `+${scoreDelta}`;
    }

    if (quality === "perfect") return `Perfect +${scoreDelta}`;
    if (quality === "good") return `Great +${scoreDelta}`;
    if (quality === "late") return `Late +${scoreDelta}`;
    if (quality === "overcooked") return `Overcooked +${scoreDelta}`;
    return `+${scoreDelta}`;
  }

  clearPlateIngredients() {
    if (this.state.plateItemIds.length === 0) {
      return;
    }

    const toRemove = new Set(this.state.plateItemIds);
    this.state.ingredients = this.state.ingredients.filter((ingredient) => !toRemove.has(ingredient.id));
    this.state.plateItemIds = [];
    this.state.plateLocation = "plating";
  }

  getNearestStationWithinRange() {
    if (!this.state.nearestStationId) {
      return null;
    }

    const station = this.state.stations[this.state.nearestStationId];
    if (!station) {
      return null;
    }

    const center = station.getCenter();
    const distance = Math.hypot(center.x - this.state.chef.x, center.y - this.state.chef.y);
    if (distance > INTERACT_RANGE) {
      return null;
    }

    return station;
  }

  findIngredientById(id) {
    return this.state.ingredients.find((ingredient) => ingredient.id === id) ?? null;
  }

  getHeldIngredient() {
    if (!this.state.chef.holdingId) {
      return null;
    }
    return this.findIngredientById(this.state.chef.holdingId);
  }

  alignIngredientsInStations() {
    for (const station of this.state.stationList) {
      if (station.contents.length === 0) {
        continue;
      }

      const center = station.getCenter();
      const spacing = 14;
      station.contents.forEach((itemId, index) => {
        const ingredient = this.findIngredientById(itemId);
        if (!ingredient) {
          return;
        }

        const offsetX = (index - (station.contents.length - 1) / 2) * spacing;
        const offsetY = index % 2 === 0 ? -2 : 6;
        ingredient.moveTo(center.x + offsetX, center.y + offsetY);
      });
    }
  }

  alignPlateItems() {
    if (this.state.plateItemIds.length === 0) {
      return;
    }
    const center = this.state.plateLocation === "serving" ? this.state.servingCenter : this.state.platingCenter;
    this.state.plateItemIds.forEach((itemId, index) => {
      const ingredient = this.findIngredientById(itemId);
      if (!ingredient) {
        return;
      }
      ingredient.stationId = "plate_stack";
      ingredient.moveTo(center.x + (index % 2) * 8 - 4, center.y - Math.floor(index / 2) * 3);
    });
  }

  updateFeedback(stepMs) {
    if (!this.state.feedback) {
      return;
    }
    this.state.feedback.timerMs = Math.max(0, this.state.feedback.timerMs - stepMs);
  }

  showFeedback(text, kind = "info", timerMs = 900) {
    this.state.feedback = {
      text,
      kind,
      timerMs,
    };
  }

  finishRun() {
    this.state.mode = "gameover";
    this.state.playState = "finished";
    this.showFeedback(
      this.locale === "es" ? "Turno finalizado" : "Shift finished",
      "info",
      2400
    );
  }

  resetActions() {
    Object.keys(this.actions).forEach((key) => {
      this.actions[key] = false;
    });
  }

  emitSnapshot() {
    this.onSnapshot?.(this.buildSnapshot());
  }

  buildSnapshot() {
    return {
      mode: this.state.mode,
      playState: this.state.playState,
      locale: this.state.locale,
      coordinates: this.state.coordinates,
      elapsedMs: Math.round(this.state.elapsedMs),
      remainingMs: Math.round(this.state.remainingMs),
      score: this.state.score,
      combo: this.state.combo,
      bestCombo: this.state.bestCombo,
      mistakes: this.state.mistakes,
      ordersCompleted: this.state.ordersCompleted,
      ordersFailed: this.state.ordersFailed,
      selectedIngredientType: this.state.selectedIngredientType,
      plateLocation: this.state.plateLocation,
      availableIngredientTypes: this.state.availableIngredientTypes.map((type, index) => ({
        type,
        index,
        key: index + 1,
        name: resolveIngredientName(type, this.locale),
      })),
      chef: {
        x: Math.round(this.state.chef.x),
        y: Math.round(this.state.chef.y),
        holdingId: this.state.chef.holdingId,
      },
      nearestStationId: this.state.nearestStationId,
      stations: this.state.stationList.map((station) => ({
        id: station.id,
        type: station.type,
        label: this.locale === "es" ? station.labelEs : station.labelEn,
        isOn: station.isOn,
        temperature: Math.round(station.temperature),
        targetTemperature:
          typeof station.targetTemperature === "number" ? Math.round(station.targetTemperature) : null,
        targetPresets: getStationTargetConfig(station.type)?.presets ?? [],
        maxTemperature: station.maxTemperature,
        itemCount: station.contents.length,
        x: station.x,
        y: station.y,
        w: station.w,
        h: station.h,
      })),
      activeOrders: this.state.activeOrders.map((order) => ({
        id: order.id,
        recipeId: order.recipe.id,
        recipeName: this.locale === "es" ? order.recipe.nameEs : order.recipe.nameEn,
        summary: this.locale === "es" ? order.recipe.summaryEs : order.recipe.summaryEn,
        remainingMs: Math.max(0, Math.round(order.deadlineAtMs - this.state.elapsedMs)),
        durationMs: order.durationMs,
        steps: order.recipe.steps.map((step) => ({
          type: step.type,
          state: step.state,
        })),
      })),
      plate: this.state.plateItemIds
        .map((id) => this.findIngredientById(id))
        .filter(Boolean)
        .map((ingredient) => ingredient.toSnapshot()),
      ingredients: this.state.ingredients.map((ingredient) => ingredient.toSnapshot()),
      feedback: this.state.feedback,
      message: this.state.message,
      fullscreen: this.state.fullscreen,
    };
  }

  render() {
    drawKitchenScene(this.context, {
      ...this.state,
      stationList: this.state.stationList,
    });
  }
}

function resolveIngredientName(type, locale) {
  const definition = getIngredientDefinition(type);
  if (!definition) {
    return type;
  }
  return locale === "es" ? definition.nameEs : definition.nameEn;
}
