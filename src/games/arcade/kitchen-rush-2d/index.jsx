import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import KitchenRushRuntime, { STAGE_HEIGHT, STAGE_WIDTH } from "./runtime";
import "./styles.css";

const UI = {
  es: {
    title: "Kitchen Rush 2D",
    subtitle:
      "Cocina 2D por sistemas: corte, coccion por estacion, estados de ingredientes, emplatado y entregas con tiempo.",
    start: "Iniciar",
    pause: "Pausa",
    resume: "Reanudar",
    restart: "Reiniciar",
    fullscreen: "Pantalla completa",
    objectiveTitle: "Objetivo",
    objectiveText:
      "Gestiona pedidos activos: recoge ingredientes en nevera, corta en tabla, cocina en olla/sarten/horno, emplata y entrega antes de que caduquen.",
    controlsTitle: "Controles",
    controlsText:
      "WASD/flechas mover, E interactuar, Espacio cortar, T encender/apagar estaciones, Enter entregar, 1-6 seleccion en nevera, P pausa, R reinicia. Usa el boton de plato para llevarlo a Entrega y +/- o presets para ajustar objetivo en olla/sarten/horno.",
    tutorialTitle: "Mini tutorial de encargo",
    tutorialSteps: [
      "Inicia la partida y revisa el pedido activo (receta y tiempo restante).",
      "Selecciona ingrediente, acercate a la nevera y pulsa E para cogerlo.",
      "Lleva el ingrediente a tabla/olla/sarten/horno segun receta y procesa cada paso.",
      "Usa Espacio para cortar en tabla y T para activar/desactivar estaciones de calor.",
      "Cuando un ingrediente este listo, llevalo a emplatado y repite con el resto.",
      "Con el plato completo, ve a Entrega y pulsa Enter antes de que expire el pedido.",
    ],
    ingredientsTitle: "Nevera",
    ordersTitle: "Pedidos activos",
    stationsTitle: "Estaciones",
    stationTemp: "Temp",
    stationTarget: "Objetivo",
    stationPresets: "Presets",
    stationItems: "Items",
    movePlateButton: "Llevar plato a Entrega",
    tempDownLabel: "Bajar objetivo",
    tempUpLabel: "Subir objetivo",
    score: "Score",
    combo: "Combo",
    mistakes: "Errores",
    time: "Tiempo",
    noOrders: "Sin pedidos. Llegara uno en breve.",
    touchTitle: "Controles tactiles",
    guideTitle: "Guia del pedido",
    guideEmpty: "Cuando llegue un pedido, veras aqui que estacion usar, si cortar y cuando emplatar/entregar.",
    flowTitle: "Flujo recomendado",
    codedNote:
      "Si, este flujo esta codificado: se valida el estado final de cada ingrediente al entregar en la zona de Entrega.",
    status_pending: "Pendiente",
    status_in_progress: "En progreso",
    status_ready: "Listo para emplatar",
    status_plated: "Emplatado",
    needsCutYes: "Si",
    needsCutNo: "No",
    stepIngredient: "Ingrediente",
    stepTarget: "Estado objetivo",
    stepStation: "Estacion",
    stepNeedsCut: "Requiere corte",
    routePlate: "Pasa por Emplatado (E).",
    routeServe: "Con todo emplatado, ve a Entrega y pulsa Enter.",
  },
  en: {
    title: "Kitchen Rush 2D",
    subtitle:
      "Layered 2D cooking loop: slicing, station-based heat, ingredient states, plating, and timed deliveries.",
    start: "Start",
    pause: "Pause",
    resume: "Resume",
    restart: "Restart",
    fullscreen: "Fullscreen",
    objectiveTitle: "Objective",
    objectiveText:
      "Handle active tickets: pull ingredients from the fridge, slice on the board, cook in pot/pan/oven, plate, and deliver before orders expire.",
    controlsTitle: "Controls",
    controlsText:
      "WASD/arrows move, E interact, Space cut, T toggle station heat, Enter serve, 1-6 select fridge ingredient, P pause, R restart. Use the dish button to move it to Serving and +/- or presets to adjust pot/pan/oven target temperature.",
    tutorialTitle: "Mini order tutorial",
    tutorialSteps: [
      "Start the shift and read the active ticket (recipe and remaining time).",
      "Pick an ingredient, move to the fridge, and press E to take it.",
      "Carry it to board/pot/pan/oven depending on the recipe and process each step.",
      "Use Space to cut on the board and T to toggle heat stations on/off.",
      "Once an ingredient is ready, move it to plating and repeat for all required items.",
      "With the dish complete, go to Serving and press Enter before the order expires.",
    ],
    ingredientsTitle: "Fridge",
    ordersTitle: "Active orders",
    stationsTitle: "Stations",
    stationTemp: "Temp",
    stationTarget: "Target",
    stationPresets: "Presets",
    stationItems: "Items",
    movePlateButton: "Move Dish To Serving",
    tempDownLabel: "Lower target",
    tempUpLabel: "Raise target",
    score: "Score",
    combo: "Combo",
    mistakes: "Mistakes",
    time: "Time",
    noOrders: "No orders yet. One is spawning soon.",
    touchTitle: "Touch controls",
    guideTitle: "Order guide",
    guideEmpty: "When an order appears, this panel will show station, cutting needs, and plating/serving sequence.",
    flowTitle: "Recommended flow",
    codedNote:
      "Yes, this flow is coded: final ingredient states are validated when serving at the Serving station.",
    status_pending: "Pending",
    status_in_progress: "In progress",
    status_ready: "Ready to plate",
    status_plated: "Plated",
    needsCutYes: "Yes",
    needsCutNo: "No",
    stepIngredient: "Ingredient",
    stepTarget: "Target state",
    stepStation: "Station",
    stepNeedsCut: "Needs cutting",
    routePlate: "Move it through Plating (E).",
    routeServe: "With all items plated, go to Serving and press Enter.",
  },
};

const DEFAULT_SNAPSHOT = {
  mode: "menu",
  playState: "idle",
  locale: "en",
  coordinates: "origin_top_left_x_right_y_down_pixels",
  elapsedMs: 0,
  remainingMs: 0,
  score: 0,
  combo: 0,
  bestCombo: 0,
  mistakes: 0,
  ordersCompleted: 0,
  ordersFailed: 0,
  selectedIngredientType: "onion",
  plateLocation: "plating",
  availableIngredientTypes: [],
  chef: { x: 0, y: 0, holdingId: null },
  nearestStationId: null,
  stations: [],
  activeOrders: [],
  plate: [],
  ingredients: [],
  feedback: null,
  message: "",
  fullscreen: false,
};

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil((ms || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const CUT_TARGET_STATES = new Set(["sliced", "diced", "shredded"]);

const TARGET_STATE_LABELS = {
  es: {
    raw: "crudo",
    whole: "entero",
    sliced: "cortado",
    diced: "en cubos",
    shredded: "troceado",
    boiled_cooked: "cocido (olla)",
    boiled_overcooked: "pasado (olla)",
    fried_cooked: "hecho (sarten)",
    fried_overcooked: "pasado (sarten)",
    sauteed: "salteado",
    caramelized: "caramelizado",
    toasted: "tostado",
    baked_cooked: "horneado",
    baked_overcooked: "pasado (horno)",
    melted: "derretido",
    burned: "quemado",
  },
  en: {
    raw: "raw",
    whole: "whole",
    sliced: "sliced",
    diced: "diced",
    shredded: "shredded",
    boiled_cooked: "boiled",
    boiled_overcooked: "overcooked (pot)",
    fried_cooked: "fried",
    fried_overcooked: "overcooked (pan)",
    sauteed: "sauteed",
    caramelized: "caramelized",
    toasted: "toasted",
    baked_cooked: "baked",
    baked_overcooked: "overcooked (oven)",
    melted: "melted",
    burned: "burned",
  },
};

function resolveStationTypeForTargetState(targetState) {
  if (CUT_TARGET_STATES.has(targetState)) {
    return "cutting_board";
  }
  if (targetState.startsWith("boiled_")) {
    return "pot";
  }
  if (targetState.startsWith("fried_") || targetState === "sauteed" || targetState === "caramelized") {
    return "pan";
  }
  if (targetState.startsWith("baked_") || targetState === "toasted" || targetState === "melted") {
    return "oven";
  }
  return "prep";
}

function resolveStationLabel(stationType, locale) {
  if (stationType === "cutting_board") {
    return locale === "es" ? "Tabla" : "Board";
  }
  if (stationType === "pot") {
    return locale === "es" ? "Olla" : "Pot";
  }
  if (stationType === "pan") {
    return locale === "es" ? "Sarten" : "Pan";
  }
  if (stationType === "oven") {
    return locale === "es" ? "Horno" : "Oven";
  }
  return locale === "es" ? "Mesa" : "Prep";
}

function resolveTargetStateLabel(targetState, locale) {
  return TARGET_STATE_LABELS[locale]?.[targetState] ?? targetState;
}

function resolveStepProgress(step, snapshot) {
  const onPlate = snapshot.plate.some((item) => item.type === step.type && item.state === step.state);
  if (onPlate) {
    return "plated";
  }

  const readyInKitchen = snapshot.ingredients.some(
    (item) => item.stationId !== "plate_stack" && item.type === step.type && item.state === step.state
  );
  if (readyInKitchen) {
    return "ready";
  }

  const inProgress = snapshot.ingredients.some((item) => item.type === step.type);
  if (inProgress) {
    return "in_progress";
  }

  return "pending";
}

export default function KitchenRush2DGame() {
  const locale = useMemo(() => (resolveBrowserLanguage() === "es" ? "es" : "en"), []);
  const copy = UI[locale] ?? UI.en;

  const canvasRef = useRef(null);
  const shellRef = useRef(null);
  const runtimeRef = useRef(null);
  const [snapshot, setSnapshot] = useState({ ...DEFAULT_SNAPSHOT, locale });

  const ingredientNameByType = useMemo(() => {
    const map = {};
    snapshot.availableIngredientTypes.forEach((entry) => {
      map[entry.type] = entry.name;
    });
    return map;
  }, [snapshot.availableIngredientTypes]);

  const orderGuides = useMemo(
    () =>
      snapshot.activeOrders.map((order) => {
        const steps = order.steps.map((step) => {
          const stationType = resolveStationTypeForTargetState(step.state);
          const progress = resolveStepProgress(step, snapshot);
          return {
            ...step,
            ingredientName: ingredientNameByType[step.type] ?? step.type,
            targetLabel: resolveTargetStateLabel(step.state, locale),
            stationType,
            stationLabel: resolveStationLabel(stationType, locale),
            needsCut: CUT_TARGET_STATES.has(step.state),
            progress,
            progressLabel: copy[`status_${progress}`] ?? progress,
          };
        });

        return {
          ...order,
          stepsGuide: steps,
          platedCount: steps.filter((step) => step.progress === "plated").length,
        };
      }),
    [snapshot.activeOrders, snapshot.ingredients, snapshot.plate, ingredientNameByType, locale, copy]
  );

  const requestFullscreen = useCallback(async () => {
    const root = shellRef.current;
    if (!root) {
      return;
    }
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      } else if (root.requestFullscreen) {
        await root.requestFullscreen();
      } else if (root.webkitRequestFullscreen) {
        root.webkitRequestFullscreen();
      }
    } catch {
      // Ignore fullscreen failures.
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const runtime = new KitchenRushRuntime({
      canvas,
      locale,
      onSnapshot: setSnapshot,
      onFullscreenRequest: requestFullscreen,
    });

    runtimeRef.current = runtime;
    runtime.start();

    return () => {
      runtime.destroy();
      runtimeRef.current = null;
    };
  }, [locale, requestFullscreen]);

  useEffect(() => {
    const onFullscreen = () => {
      runtimeRef.current?.setFullscreenState(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("webkitfullscreenchange", onFullscreen);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("webkitfullscreenchange", onFullscreen);
    };
  }, []);

  const buildTextPayload = useCallback(
    (state) => ({
      mode: "arcade-kitchen-rush-2d",
      screen: state.mode,
      playState: state.playState,
      coordinates: state.coordinates,
      elapsedMs: state.elapsedMs,
      remainingMs: state.remainingMs,
      score: state.score,
      combo: state.combo,
      mistakes: state.mistakes,
      chef: state.chef,
      selectedIngredientType: state.selectedIngredientType,
      activeOrders: state.activeOrders,
      stations: state.stations,
      plate: state.plate,
      plateLocation: state.plateLocation,
      ingredients: state.ingredients,
      nearestStationId: state.nearestStationId,
      feedback: state.feedback,
      fullscreen: state.fullscreen,
    }),
    []
  );

  const advanceTime = useCallback((ms) => runtimeRef.current?.advanceTime(ms), []);
  useGameRuntimeBridge(snapshot, buildTextPayload, advanceTime);

  const holdProps = useCallback(
    (control) => ({
      onMouseDown: () => runtimeRef.current?.setVirtualControl(control, true),
      onMouseUp: () => runtimeRef.current?.setVirtualControl(control, false),
      onMouseLeave: () => runtimeRef.current?.setVirtualControl(control, false),
      onTouchStart: (event) => {
        event.preventDefault();
        runtimeRef.current?.setVirtualControl(control, true);
      },
      onTouchEnd: (event) => {
        event.preventDefault();
        runtimeRef.current?.setVirtualControl(control, false);
      },
      onTouchCancel: () => runtimeRef.current?.setVirtualControl(control, false),
    }),
    []
  );

  const actionProps = useCallback(
    (control) => ({
      onClick: () => runtimeRef.current?.setVirtualControl(control, true),
      onTouchStart: (event) => {
        event.preventDefault();
        runtimeRef.current?.setVirtualControl(control, true);
      },
    }),
    []
  );

  return (
    <section className="mini-game kitchen-rush-game" ref={shellRef}>
      <div className="mini-head kitchen-rush-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="kitchen-rush-actions">
          <button type="button" onClick={() => runtimeRef.current?.startRun()}>{copy.start}</button>
          <button type="button" onClick={() => runtimeRef.current?.togglePause()}>
            {snapshot.mode === "paused" ? copy.resume : copy.pause}
          </button>
          <button type="button" onClick={() => runtimeRef.current?.restart()}>{copy.restart}</button>
          <button type="button" onClick={() => runtimeRef.current?.movePlateToServingZone()}>{copy.movePlateButton}</button>
          <button type="button" onClick={requestFullscreen}>{copy.fullscreen}</button>
        </div>
      </div>

      <div className="kitchen-rush-layout">
        <aside className="kitchen-rush-panel">
          <section>
            <h5>{copy.objectiveTitle}</h5>
            <p>{copy.objectiveText}</p>
          </section>

          <section className="kitchen-rush-stats">
            <article><span>{copy.score}</span><strong>{snapshot.score}</strong></article>
            <article><span>{copy.combo}</span><strong>x{snapshot.combo}</strong></article>
            <article><span>{copy.mistakes}</span><strong>{snapshot.mistakes}</strong></article>
            <article><span>{copy.time}</span><strong>{formatTime(snapshot.remainingMs)}</strong></article>
          </section>

          <section>
            <h5>{copy.ingredientsTitle}</h5>
            <div className="kitchen-rush-ingredient-grid">
              {snapshot.availableIngredientTypes.map((ingredient) => (
                <button
                  key={ingredient.type}
                  type="button"
                  className={ingredient.type === snapshot.selectedIngredientType ? "active" : ""}
                  onClick={() => runtimeRef.current?.setSelectedIngredient(ingredient.type, { source: "ui" })}
                >
                  <span>{ingredient.key}</span>
                  <strong>{ingredient.name}</strong>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h5>{copy.ordersTitle}</h5>
            {snapshot.activeOrders.length === 0 ? (
              <p className="kitchen-rush-empty">{copy.noOrders}</p>
            ) : (
              <div className="kitchen-rush-order-list">
                {snapshot.activeOrders.map((order) => (
                  <article key={order.id}>
                    <header>
                      <strong>{order.recipeName}</strong>
                      <span>{Math.ceil(order.remainingMs / 1000)}s</span>
                    </header>
                    <p>{order.summary}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="kitchen-rush-guide">
            <h5>{copy.guideTitle}</h5>
            {orderGuides.length === 0 ? (
              <p className="kitchen-rush-empty">{copy.guideEmpty}</p>
            ) : (
              <div className="kitchen-rush-guide-list">
                {orderGuides.map((order) => (
                  <article key={`${order.id}-guide`} className="kitchen-rush-guide-card">
                    <header>
                      <strong>{order.recipeName}</strong>
                      <span>{order.platedCount}/{order.stepsGuide.length}</span>
                    </header>

                    <ul className="kitchen-rush-guide-steps">
                      {order.stepsGuide.map((step) => (
                        <li key={`${order.id}-${step.type}-${step.state}`}>
                          <div className="kitchen-rush-guide-row">
                            <strong>{step.ingredientName}</strong>
                            <em>{step.progressLabel}</em>
                          </div>
                          <p>{copy.stepTarget}: {step.targetLabel}</p>
                          <p>{copy.stepStation}: {step.stationLabel}</p>
                          <p>{copy.stepNeedsCut}: {step.needsCut ? copy.needsCutYes : copy.needsCutNo}</p>
                          <p>
                            {locale === "es"
                              ? `Ruta: Nevera -> ${step.needsCut ? "Tabla -> " : ""}${step.stationLabel} -> Emplatado -> Entrega`
                              : `Route: Fridge -> ${step.needsCut ? "Board -> " : ""}${step.stationLabel} -> Plating -> Serving`}
                          </p>
                        </li>
                      ))}
                    </ul>

                    <p className="kitchen-rush-guide-flow-title">{copy.flowTitle}</p>
                    <p className="kitchen-rush-guide-flow">{copy.routePlate} {copy.routeServe}</p>
                  </article>
                ))}
              </div>
            )}
            <p className="kitchen-rush-guide-note">{copy.codedNote}</p>
          </section>

          <section>
            <h5>{copy.stationsTitle}</h5>
            <div className="kitchen-rush-station-list">
              {snapshot.stations.map((station) => (
                <article key={station.id} className={station.id === snapshot.nearestStationId ? "near" : ""}>
                  <strong>{station.label}</strong>
                  <p>{copy.stationTemp}: {station.temperature}C</p>
                  {(station.type === "pan" || station.type === "oven" || station.type === "pot") && (
                    <>
                      <p>{copy.stationTarget}: {(station.targetTemperature ?? station.temperature)}C</p>
                      <div className="kitchen-rush-temp-controls">
                        <button
                          type="button"
                          aria-label={copy.tempDownLabel}
                          onClick={() => runtimeRef.current?.adjustStationTarget(station.type, -1)}
                        >
                          -
                        </button>
                        <button
                          type="button"
                          aria-label={copy.tempUpLabel}
                          onClick={() => runtimeRef.current?.adjustStationTarget(station.type, 1)}
                        >
                          +
                        </button>
                      </div>
                      {station.targetPresets?.length > 0 && (
                        <div className="kitchen-rush-temp-presets" aria-label={copy.stationPresets}>
                          {station.targetPresets.map((preset) => (
                            <button
                              key={`${station.id}-${preset}`}
                              type="button"
                              className={(station.targetTemperature ?? station.temperature) === preset ? "active" : ""}
                              onClick={() => runtimeRef.current?.setStationTarget(station.type, preset)}
                            >
                              {preset}C
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  <p>{copy.stationItems}: {station.itemCount}</p>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h5>{copy.controlsTitle}</h5>
            <p>{copy.controlsText}</p>
          </section>

          <section className="kitchen-rush-tutorial">
            <h5>{copy.tutorialTitle}</h5>
            <ol>
              {copy.tutorialSteps.map((step, index) => (
                <li key={step}>
                  <span>{index + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </section>
        </aside>

        <div className="kitchen-rush-stage-wrap">
          <div className="kitchen-rush-canvas-shell">
            <canvas
              ref={canvasRef}
              className="kitchen-rush-canvas"
              width={STAGE_WIDTH}
              height={STAGE_HEIGHT}
              aria-label="Kitchen Rush 2D canvas"
            />
          </div>

          <div className="kitchen-rush-touch" role="group" aria-label={copy.touchTitle}>
            <h6>{copy.touchTitle}</h6>
            <div className="kitchen-rush-touch-grid">
              <button type="button" {...holdProps("left")}>Left</button>
              <button type="button" {...holdProps("up")}>Up</button>
              <button type="button" {...holdProps("right")}>Right</button>
              <button type="button" {...holdProps("down")}>Down</button>
              <button type="button" {...actionProps("interact")}>Interact</button>
              <button type="button" {...actionProps("cut")}>Cut</button>
              <button type="button" {...actionProps("heat")}>Heat</button>
              <button type="button" {...actionProps("serve")}>Serve</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
