import React, { useCallback, useEffect, useMemo, useState } from "react";
import useMobileGameViewport from "../../mobile/useMobileGameViewport";
import useGameRuntimeBridge from "../../utils/useGameRuntimeBridge";
import {
  KNOWLEDGE_ARCADE_MATCH_COUNT,
  getRandomKnowledgeMatchId,
  getRandomKnowledgeMatchIdExcept,
  resolveKnowledgeArcadeLocale,
} from "./knowledgeArcadeUtils";
import {
  buildTimelineMission,
  evaluateTimelineRound,
  formatTimelineYear,
  getTimelineEventText,
} from "./timelineKnowledgeEngine";
import { loadTimelineEventLocale } from "./timelineEventBank";

const COPY = {
  es: {
    title: "Cronologia Maestra",
    subtitle: "Ordena los 7 eventos de mas antiguo a mas reciente.",
    restart: "Nueva partida",
    submit: "Comprobar",
    clear: "Borrar orden",
    events: "Eventos",
    order: "Tu orden",
    result: "Resultado",
    placed: "colocados",
    oldest: "Mas antiguo",
    newest: "Mas reciente",
    emptySlot: (index) => `Hueco ${index}`,
    addCard: "Anadir",
    swapAction: "Cambiar",
    hiddenYear: "Fecha oculta",
    ready: "Partida lista.",
    loading: "Preparando eventos...",
    orderCleared: "Orden borrado.",
    pickSwap: "Elige otro evento colocado para cambiar posiciones.",
    swapped: "Posiciones intercambiadas.",
    correctTitle: "Correcto",
    wrongTitle: "No es correcto",
    correctMessage: "Has ordenado los 7 eventos correctamente.",
    wrongMessage: "El orden no coincide.",
    needCards: (count) => `Faltan ${count} eventos.`,
    coordinates: "Ordena de arriba a abajo: del evento mas antiguo al mas reciente.",
  },
  en: {
    title: "Master Timeline",
    subtitle: "Order the 7 events from oldest to newest.",
    restart: "New game",
    submit: "Check",
    clear: "Clear order",
    events: "Events",
    order: "Your order",
    result: "Result",
    placed: "placed",
    oldest: "Oldest",
    newest: "Newest",
    emptySlot: (index) => `Slot ${index}`,
    addCard: "Add",
    swapAction: "Swap",
    hiddenYear: "Hidden date",
    ready: "Game ready.",
    loading: "Preparing events...",
    orderCleared: "Order cleared.",
    pickSwap: "Choose another placed event to swap positions.",
    swapped: "Positions swapped.",
    correctTitle: "Correct",
    wrongTitle: "Not correct",
    correctMessage: "You ordered all 7 events correctly.",
    wrongMessage: "The order does not match.",
    needCards: (count) => `${count} events missing.`,
    coordinates: "Order top to bottom: oldest event to newest event.",
  },
};

const getRound = (snapshot) => snapshot.mission?.rounds?.[snapshot.roundIndex] ?? null;
const findById = (round, eventId) => round?.events?.find((event) => event.id === eventId) ?? null;

const createInitialState = (copy, options = {}) => {
  const matchId = options.matchId ?? getRandomKnowledgeMatchId();
  const mission = buildTimelineMission(matchId);
  return {
    matchId: mission.matchId,
    mission,
    roundIndex: 0,
    phase: "playing",
    placedOrderIds: [],
    selectedPlacedId: null,
    history: [],
    message: copy.ready,
  };
};

function TimelineKnowledgeGame() {
  const locale = useMemo(resolveKnowledgeArcadeLocale, []);
  const copy = useMemo(() => COPY[locale] ?? COPY.en, [locale]);
  const viewport = useMobileGameViewport();
  const [state, setState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMissionState = useCallback((options = {}) => {
    setIsLoading(true);
    setState(null);
    return loadTimelineEventLocale(locale).then(() => {
      setState(createInitialState(copy, options));
      setIsLoading(false);
    });
  }, [copy, locale]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setState(null);
    loadTimelineEventLocale(locale).then(() => {
      if (cancelled) return;
      setState(createInitialState(copy));
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [copy, locale]);

  const round = getRound(state ?? {});
  const eventById = useMemo(() => new Map((round?.events ?? []).map((event) => [event.id, event])), [round]);
  const latestRoundResult = state?.history?.[state.history.length - 1] ?? null;
  const hasWon = Boolean(latestRoundResult?.exactOrder);

  const remainingEvents = useMemo(() => {
    const placed = new Set(state?.placedOrderIds ?? []);
    return (round?.shuffledOrderIds ?? [])
      .filter((eventId) => !placed.has(eventId))
      .map((eventId) => eventById.get(eventId))
      .filter(Boolean);
  }, [eventById, round, state]);

  const restart = useCallback(() => {
    const currentMatchId = state?.matchId ?? getRandomKnowledgeMatchId();
    void loadMissionState({
      matchId: getRandomKnowledgeMatchIdExcept(currentMatchId),
    });
  }, [loadMissionState, state]);

  const placeCard = useCallback((eventId) => {
    setState((prev) => {
      if (!prev || prev.phase !== "playing" || prev.placedOrderIds.includes(eventId)) return prev;
      const currentRound = getRound(prev);
      const event = findById(currentRound, eventId);
      if (!event) return prev;
      return {
        ...prev,
        placedOrderIds: [...prev.placedOrderIds, eventId],
        selectedPlacedId: null,
        message: copy.ready,
      };
    });
  }, [copy]);

  const removeCard = useCallback((eventId) => {
    setState((prev) => {
      if (!prev || prev.phase !== "playing" || !prev.placedOrderIds.includes(eventId)) return prev;
      return {
        ...prev,
        placedOrderIds: prev.placedOrderIds.filter((id) => id !== eventId),
        selectedPlacedId: prev.selectedPlacedId === eventId ? null : prev.selectedPlacedId,
        message: copy.ready,
      };
    });
  }, [copy]);

  const selectPlacedCard = useCallback((eventId) => {
    setState((prev) => {
      if (!prev || prev.phase !== "playing" || !prev.placedOrderIds.includes(eventId)) return prev;
      if (!prev.selectedPlacedId) {
        return { ...prev, selectedPlacedId: eventId, message: copy.pickSwap };
      }
      if (prev.selectedPlacedId === eventId) {
        return { ...prev, selectedPlacedId: null, message: copy.ready };
      }
      const firstIndex = prev.placedOrderIds.indexOf(prev.selectedPlacedId);
      const secondIndex = prev.placedOrderIds.indexOf(eventId);
      if (firstIndex < 0 || secondIndex < 0) {
        return { ...prev, selectedPlacedId: null, message: copy.ready };
      }
      const placedOrderIds = [...prev.placedOrderIds];
      [placedOrderIds[firstIndex], placedOrderIds[secondIndex]] = [placedOrderIds[secondIndex], placedOrderIds[firstIndex]];
      return {
        ...prev,
        placedOrderIds,
        selectedPlacedId: null,
        message: copy.swapped,
      };
    });
  }, [copy]);

  const clearOrder = useCallback(() => {
    setState((prev) => {
      if (!prev || prev.phase !== "playing") return prev;
      return {
        ...prev,
        placedOrderIds: [],
        selectedPlacedId: null,
        message: copy.orderCleared,
      };
    });
  }, [copy]);

  const finalizeRound = useCallback(() => {
    setState((prev) => {
      if (!prev || prev.phase !== "playing") return prev;
      const currentRound = getRound(prev);
      if (!currentRound) return prev;
      const missing = Math.max(0, prev.mission.cardsPerRound - prev.placedOrderIds.length);
      if (missing > 0) {
        return { ...prev, message: copy.needCards(missing) };
      }
      const evaluation = evaluateTimelineRound({
        round: currentRound,
        placedOrderIds: prev.placedOrderIds,
        secondsLeft: 0,
        hintsUsed: 0,
        streakBefore: 0,
      });
      return {
        ...prev,
        phase: "review",
        selectedPlacedId: null,
        history: [{ roundNumber: 1, reason: "submit", ...evaluation }],
        message: evaluation.exactOrder ? copy.correctMessage : copy.wrongMessage,
      };
    });
  }, [copy]);

  useEffect(() => {
    if (!state) return undefined;
    const onKeyDown = (event) => {
      const tag = event.target?.tagName?.toLowerCase?.();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      const key = event.key.toLowerCase();

      if (/^[1-9]$/.test(key) && state.phase === "playing") {
        const index = Number(key) - 1;
        if (index < remainingEvents.length) {
          event.preventDefault();
          placeCard(remainingEvents[index].id);
        }
        return;
      }
      if (key === "backspace" && state.phase === "playing") {
        event.preventDefault();
        const lastId = state.placedOrderIds[state.placedOrderIds.length - 1];
        if (lastId) removeCard(lastId);
        return;
      }
      if (key === "r") {
        event.preventDefault();
        restart();
        return;
      }
      if (key === "enter") {
        event.preventDefault();
        if (state.phase === "playing") {
          finalizeRound();
          return;
        }
        restart();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    finalizeRound,
    hasWon,
    placeCard,
    remainingEvents,
    removeCard,
    restart,
    state,
  ]);

  const payloadBuilder = useCallback((snapshot) => {
    if (!snapshot) {
      return {
        mode: "knowledge-arcade",
        variant: "cronologia",
        locale,
        coordinates: copy.coordinates,
        loading: true,
        status: "loading",
        message: copy.loading,
      };
    }
    const activeRound = getRound(snapshot);
    const roundById = new Map((activeRound?.events ?? []).map((event) => [event.id, event]));
    const result = snapshot.history?.[snapshot.history.length - 1] ?? null;
    return {
      mode: "knowledge-arcade",
      variant: "cronologia",
      locale,
      coordinates: copy.coordinates,
      match: { current: snapshot.matchId + 1, total: KNOWLEDGE_ARCADE_MATCH_COUNT },
      phase: snapshot.phase,
      cardsPerRound: snapshot.mission.cardsPerRound,
      pending: (activeRound?.shuffledOrderIds ?? [])
        .filter((eventId) => !snapshot.placedOrderIds.includes(eventId))
        .map((eventId) => ({
          id: eventId,
          title: getTimelineEventText(roundById.get(eventId), locale, "title"),
        })),
      order: snapshot.placedOrderIds.map((eventId, index) => {
        const event = roundById.get(eventId);
        return {
          slot: index + 1,
          id: eventId,
          title: getTimelineEventText(event, locale, "title"),
          year: snapshot.phase === "review" ? event?.year ?? null : null,
        };
      }),
      result: result ? { exactOrder: result.exactOrder, correctSlots: result.correctSlots } : null,
      selectedPlacedId: snapshot.selectedPlacedId,
      message: snapshot.message,
    };
  }, [copy, locale]);

  const advanceTime = useCallback(() => undefined, []);
  useGameRuntimeBridge(state, payloadBuilder, advanceTime);

  const rootClassName = [
    "mini-game",
    "knowledge-game",
    "knowledge-arcade-game",
    "knowledge-cronologia",
    viewport.isMobile ? "is-mobile" : "",
    viewport.isMobile ? `is-mobile-${viewport.orientation}` : ""
  ].filter(Boolean).join(" ");

  if (!state || isLoading) {
    return (
      <div className={rootClassName}>
        <div className="mini-head timeline-hero">
          <div className="timeline-hero-copy">
            <h4>{copy.title}</h4>
            <p>{copy.subtitle}</p>
          </div>
        </div>
        <section className="knowledge-mode-shell timeline-shell">
          <p className="game-message timeline-game-message">{copy.loading}</p>
        </section>
      </div>
    );
  }

  const placedCount = state.placedOrderIds.length;
  const canSubmit = state.phase === "playing" && placedCount === state.mission.cardsPerRound;

  return (
    <div className={rootClassName}>
      <div className="mini-head timeline-hero">
        <div className="timeline-hero-copy">
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="timeline-head-actions">
          <button type="button" className="knowledge-ui-btn knowledge-ui-btn-primary" onClick={restart}>
            {copy.restart}
          </button>
        </div>
      </div>

      <section
        className={[
          "knowledge-mode-shell",
          "timeline-shell",
          viewport.isMobile ? "knowledge-mobile-shell" : ""
        ].filter(Boolean).join(" ")}
      >
        <div className="timeline-status-row">
          <strong>{placedCount}/{state.mission.cardsPerRound}</strong>
          <span>{copy.placed}</span>
        </div>

        <div className="timeline-board">
          <section className="timeline-track timeline-track-panel">
            <div className="timeline-panel-head">
              <h5>{copy.order}</h5>
              <span>{copy.oldest} - {copy.newest}</span>
            </div>
            <ol className="timeline-track-slots">
              {Array.from({ length: state.mission.cardsPerRound }, (_, index) => {
                const eventId = state.placedOrderIds[index] ?? null;
                const event = eventId ? eventById.get(eventId) ?? null : null;
                const eventSummary = event ? getTimelineEventText(event, locale, "summary").trim() : "";
                const slotResult = latestRoundResult?.slotBreakdown?.[index] ?? null;
                const slotClassName = [
                  "timeline-slot-card",
                  event ? "filled" : "",
                  event && state.selectedPlacedId === event.id ? "is-selected" : "",
                  state.phase === "review" && slotResult ? (slotResult.error === 0 ? "is-correct" : "is-wrong") : "",
                ].filter(Boolean).join(" ");
                return (
                  <li key={`slot-${index}`}>
                    {event ? (
                      <button
                        type="button"
                        className={slotClassName}
                        onClick={() => selectPlacedCard(event.id)}
                        disabled={state.phase !== "playing"}
                        style={{ "--timeline-order": index }}
                      >
                        <span className="timeline-slot-index">{index + 1}</span>
                        <strong>{getTimelineEventText(event, locale, "title")}</strong>
                        {eventSummary ? <span className="timeline-event-summary">{eventSummary}</span> : null}
                        <span className="timeline-event-year">
                          {state.phase === "review" ? formatTimelineYear(event.year, locale) : copy.swapAction}
                        </span>
                      </button>
                    ) : (
                      <button type="button" className="timeline-slot-card" disabled>
                        <span className="timeline-slot-index">{index + 1}</span>
                        <strong>{copy.emptySlot(index + 1)}</strong>
                        <span>{index === 0 ? copy.oldest : index === state.mission.cardsPerRound - 1 ? copy.newest : copy.hiddenYear}</span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="timeline-pool timeline-pool-panel">
            <div className="timeline-panel-head">
              <h5>{copy.events}</h5>
              <span>{remainingEvents.length}</span>
            </div>
            {remainingEvents.length ? (
              <ul>
                {remainingEvents.map((event, index) => {
                  const eventSummary = getTimelineEventText(event, locale, "summary").trim();
                  return (
                    <li key={event.id}>
                      <button
                        type="button"
                        className="timeline-event-card"
                        onClick={() => placeCard(event.id)}
                        disabled={state.phase !== "playing"}
                        style={{ "--timeline-order": index }}
                      >
                        <span className="timeline-event-key">{index + 1}</span>
                        <strong>{getTimelineEventText(event, locale, "title")}</strong>
                        {eventSummary ? <span className="timeline-event-summary">{eventSummary}</span> : null}
                        <span className="timeline-event-year">{copy.addCard}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="timeline-empty">{copy.needCards(0)}</p>
            )}
          </section>
        </div>

        {latestRoundResult ? (
          <section className={["timeline-result-panel", hasWon ? "is-success" : "is-fail"].join(" ")}>
            <h5>{hasWon ? copy.correctTitle : copy.wrongTitle}</h5>
            <p>{state.message}</p>
          </section>
        ) : null}

        <section className="timeline-actions-dock">
          {state.phase === "playing" ? (
            <>
              <button type="button" className="knowledge-ui-btn" onClick={clearOrder} disabled={!placedCount}>
                {copy.clear}
              </button>
              <button
                type="button"
                className="knowledge-ui-btn knowledge-ui-btn-accent"
                onClick={finalizeRound}
                disabled={!canSubmit}
              >
                {copy.submit}
              </button>
            </>
          ) : (
            <button type="button" className="knowledge-ui-btn knowledge-ui-btn-primary" onClick={restart}>
              {copy.restart}
            </button>
          )}
        </section>
      </section>

      <p className="game-message timeline-game-message">{state.message}</p>
    </div>
  );
}

export default TimelineKnowledgeGame;
