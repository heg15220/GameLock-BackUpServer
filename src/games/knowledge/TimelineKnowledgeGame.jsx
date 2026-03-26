import React, { useCallback, useEffect, useMemo, useState } from "react";
import useGameRuntimeBridge from "../../utils/useGameRuntimeBridge";
import {
  KNOWLEDGE_ARCADE_MATCH_COUNT,
  getRandomKnowledgeMatchId,
  getRandomKnowledgeMatchIdExcept,
  resolveKnowledgeArcadeLocale,
} from "./knowledgeArcadeUtils";
import {
  TIMELINE_DIFFICULTY_CONFIG,
  TIMELINE_MODE_CONFIG,
  buildTimelineMission,
  evaluateTimelineRound,
  fillTimelineOrder,
  formatTimelineYear,
  getTimelineEventText,
  summarizeTimelineMission,
} from "./timelineKnowledgeEngine";

const COPY = {
  es: {
    title: "Cronologia Maestra",
    subtitle: "Ordena eventos reales por fecha en misiones por rondas.",
    mode: "Modo",
    difficulty: "Dificultad",
    round: "Ronda",
    score: "Puntos",
    streak: "Racha",
    intel: "Intel",
    timer: "Tiempo",
    status: "Estado",
    statusPlaying: "Resolviendo",
    statusReview: "Revision",
    statusFinished: "Finalizada",
    restart: "Nueva mision",
    nextRound: "Siguiente ronda",
    hintRange: "Escaner (-1 Intel)",
    hintExact: "Fecha exacta (-2 Intel)",
    hintRelation: "Relacion con ancla (-1 Intel)",
    submit: "Validar ronda",
    clear: "Limpiar orden",
    orderCleared: "Orden vaciado.",
    anchorTitle: "Evento ancla",
    pending: "Eventos pendientes",
    timeline: "Linea temporal",
    review: "Informe",
    expected: "Orden correcto",
    yours: "Tu orden",
    summary: "Resumen",
    rank: "Rango",
    rankLabels: { S: "Leyenda", A: "Elite", B: "Solido", C: "En progreso", D: "Aprendiz" },
    avgAccuracy: "Precision media",
    avgChronology: "Consistencia media",
    logTitle: "Bitacora",
    coordinates: "Los huecos avanzan de izquierda a derecha, del evento mas antiguo al mas reciente.",
    noPendingEvents: "No quedan eventos pendientes.",
    noIntel: "No tienes Intel suficiente.",
    noTargets: "No hay objetivos para esa pista.",
    hiddenYear: "Ano oculto",
    modeLabels: { mix: "Mix global", science: "Ciencia y tecnologia", geopolitics: "Geopolitica", culture: "Cultura y medios" },
    difficultyLabels: { analyst: "Analista", expert: "Experto", master: "Maestro" },
    shortcut: "Atajos: 1-9 colocar, Backspace quitar, Enter validar, H/J/K pistas, N siguiente ronda, R nueva mision.",
    relationBefore: "antes del ancla",
    relationAfter: "despues del ancla",
    missionLoaded: (r, c) => `Mision cargada: ${r} rondas, ${c} eventos por ronda.`,
    roundStarted: (r, t) => `Ronda ${r}/${t} lista.`,
    rangeHintApplied: (n, a, b) => `Escaner ${n}: ${a} - ${b}.`,
    exactHintApplied: (n, y) => `${n}: fecha ${y}.`,
    relationHintApplied: (n, rel, anchor) => `${n} ocurre ${rel} ${anchor}.`,
    cardPlaced: (name) => `Anadido: ${name}.`,
    cardRemoved: (name) => `Retirado: ${name}.`,
    needCards: (count) => `Faltan ${count} eventos por colocar.`,
    roundPerfect: (score, streak) => `Orden perfecto. +${score}. Racha ${streak}.`,
    roundResolved: (correct, total, score) => `Ronda: ${correct}/${total} exactas. +${score}.`,
    roundTimeout: (correct, total, score) => `Tiempo agotado: ${correct}/${total} exactas. +${score}.`,
    missionFinished: (rank, score) => `Mision finalizada. Rango ${rank}. Puntuacion ${score}.`,
  },
  en: {
    title: "Master Timeline",
    subtitle: "Sort real events by date in round-based missions.",
    mode: "Mode",
    difficulty: "Difficulty",
    round: "Round",
    score: "Score",
    streak: "Streak",
    intel: "Intel",
    timer: "Timer",
    status: "Status",
    statusPlaying: "Solving",
    statusReview: "Review",
    statusFinished: "Finished",
    restart: "New mission",
    nextRound: "Next round",
    hintRange: "Scan (-1 Intel)",
    hintExact: "Exact year (-2 Intel)",
    hintRelation: "Anchor relation (-1 Intel)",
    submit: "Validate round",
    clear: "Clear order",
    orderCleared: "Order cleared.",
    anchorTitle: "Anchor event",
    pending: "Pending events",
    timeline: "Timeline",
    review: "Report",
    expected: "Correct order",
    yours: "Your order",
    summary: "Summary",
    rank: "Rank",
    rankLabels: { S: "Legend", A: "Elite", B: "Solid", C: "In progress", D: "Apprentice" },
    avgAccuracy: "Average accuracy",
    avgChronology: "Average consistency",
    logTitle: "Log",
    coordinates: "Slots go left to right, from oldest to newest event.",
    noPendingEvents: "No pending events.",
    noIntel: "You do not have enough Intel.",
    noTargets: "No targets available for this hint.",
    hiddenYear: "Hidden year",
    modeLabels: { mix: "Global mix", science: "Science and technology", geopolitics: "Geopolitics", culture: "Culture and media" },
    difficultyLabels: { analyst: "Analyst", expert: "Expert", master: "Master" },
    shortcut: "Shortcuts: 1-9 place, Backspace remove, Enter validate, H/J/K hints, N next round, R new mission.",
    relationBefore: "before anchor",
    relationAfter: "after anchor",
    missionLoaded: (r, c) => `Mission loaded: ${r} rounds, ${c} events each.`,
    roundStarted: (r, t) => `Round ${r}/${t} ready.`,
    rangeHintApplied: (n, a, b) => `Scan ${n}: ${a} - ${b}.`,
    exactHintApplied: (n, y) => `${n}: year ${y}.`,
    relationHintApplied: (n, rel, anchor) => `${n} happens ${rel} ${anchor}.`,
    cardPlaced: (name) => `Added: ${name}.`,
    cardRemoved: (name) => `Removed: ${name}.`,
    needCards: (count) => `${count} events still missing.`,
    roundPerfect: (score, streak) => `Perfect order. +${score}. Streak ${streak}.`,
    roundResolved: (correct, total, score) => `Round: ${correct}/${total} exact. +${score}.`,
    roundTimeout: (correct, total, score) => `Time over: ${correct}/${total} exact. +${score}.`,
    missionFinished: (rank, score) => `Mission complete. Rank ${rank}. Score ${score}.`,
  },
};

const pct = (value) => `${Math.round((Number(value) || 0) * 100)}%`;
const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const pushLog = (items, value) => [value, ...(items ?? [])].slice(0, 8);
const getRound = (snapshot) => snapshot.mission?.rounds?.[snapshot.roundIndex] ?? null;
const findById = (round, eventId) => round?.events?.find((event) => event.id === eventId) ?? null;
const phaseLabel = (copy, phase) => (phase === "review" ? copy.statusReview : phase === "finished" ? copy.statusFinished : copy.statusPlaying);
const formatRankLabel = (copy, rank) => {
  const label = copy.rankLabels?.[rank];
  return label ? `${rank} - ${label}` : rank;
};

const createInitialState = (copy, options = {}) => {
  const matchId = options.matchId ?? getRandomKnowledgeMatchId();
  const mission = buildTimelineMission(matchId, options.modeId, options.difficultyId);
  const message = copy.missionLoaded(mission.totalRounds, mission.cardsPerRound);
  return {
    matchId: mission.matchId,
    mission,
    modeId: mission.modeId,
    difficultyId: mission.difficultyId,
    roundIndex: 0,
    phase: "playing",
    roundClock: mission.secondsPerRound,
    placedOrderIds: [],
    hintRanges: {},
    hintExact: {},
    hintRelation: {},
    hintsUsedRound: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    intel: mission.startIntel,
    history: [],
    message,
    log: [message],
  };
};

function TimelineKnowledgeGame() {
  const locale = useMemo(resolveKnowledgeArcadeLocale, []);
  const copy = useMemo(() => COPY[locale] ?? COPY.en, [locale]);
  const [state, setState] = useState(() => createInitialState(copy));
  const round = getRound(state);
  const eventById = useMemo(() => new Map((round?.events ?? []).map((event) => [event.id, event])), [round]);
  const anchorEvent = round?.anchorId ? eventById.get(round.anchorId) ?? null : null;

  const remainingEvents = useMemo(() => {
    const placed = new Set(state.placedOrderIds);
    return (round?.shuffledOrderIds ?? []).filter((eventId) => !placed.has(eventId)).map((eventId) => eventById.get(eventId)).filter(Boolean);
  }, [state.placedOrderIds, round, eventById]);

  const summary = useMemo(() => summarizeTimelineMission(state.mission, state.history, state.score), [state.mission, state.history, state.score]);

  const restart = useCallback(() => {
    setState((prev) => createInitialState(copy, { matchId: getRandomKnowledgeMatchIdExcept(prev.matchId), modeId: prev.modeId, difficultyId: prev.difficultyId }));
  }, [copy]);

  const switchMode = useCallback((modeId) => {
    setState((prev) => createInitialState(copy, { matchId: getRandomKnowledgeMatchIdExcept(prev.matchId), modeId, difficultyId: prev.difficultyId }));
  }, [copy]);

  const switchDifficulty = useCallback((difficultyId) => {
    setState((prev) => createInitialState(copy, { matchId: getRandomKnowledgeMatchIdExcept(prev.matchId), modeId: prev.modeId, difficultyId }));
  }, [copy]);

  const placeCard = useCallback((eventId) => {
    setState((prev) => {
      if (prev.phase !== "playing") return prev;
      if (prev.placedOrderIds.includes(eventId)) return prev;
      const currentRound = getRound(prev);
      const event = findById(currentRound, eventId);
      if (!event) return prev;
      const message = copy.cardPlaced(getTimelineEventText(event, locale, "title"));
      return { ...prev, placedOrderIds: [...prev.placedOrderIds, eventId], message, log: pushLog(prev.log, message) };
    });
  }, [copy, locale]);

  const removeCard = useCallback((eventId) => {
    setState((prev) => {
      if (prev.phase !== "playing" || !prev.placedOrderIds.includes(eventId)) return prev;
      const event = findById(getRound(prev), eventId);
      const message = copy.cardRemoved(event ? getTimelineEventText(event, locale, "title") : eventId);
      return { ...prev, placedOrderIds: prev.placedOrderIds.filter((id) => id !== eventId), message, log: pushLog(prev.log, message) };
    });
  }, [copy, locale]);

  const clearOrder = useCallback(() => {
    setState((prev) => (prev.phase !== "playing"
      ? prev
      : {
        ...prev,
        placedOrderIds: [],
        message: copy.orderCleared,
        log: pushLog(prev.log, copy.orderCleared),
      }));
  }, [copy]);

  const applyHint = useCallback((type) => {
    setState((prev) => {
      if (prev.phase !== "playing") return prev;
      const currentRound = getRound(prev);
      if (!currentRound) return prev;

      if (type === "range" && prev.intel < 1) {
        return { ...prev, message: copy.noIntel, log: pushLog(prev.log, copy.noIntel) };
      }
      if (type === "exact" && prev.intel < 2) {
        return { ...prev, message: copy.noIntel, log: pushLog(prev.log, copy.noIntel) };
      }
      if (type === "relation" && prev.intel < 1) {
        return { ...prev, message: copy.noIntel, log: pushLog(prev.log, copy.noIntel) };
      }

      const anchor = currentRound.anchorId ? findById(currentRound, currentRound.anchorId) : null;
      let target = null;
      if (type === "range") {
        target = currentRound.shuffledOrderIds.map((id) => findById(currentRound, id)).find((event) => event && !prev.hintRanges[event.id] && !prev.hintExact[event.id]);
      } else if (type === "exact") {
        target = currentRound.shuffledOrderIds.map((id) => findById(currentRound, id)).find((event) => event && !prev.hintExact[event.id]);
      } else {
        target = currentRound.shuffledOrderIds.filter((id) => id !== currentRound.anchorId).map((id) => findById(currentRound, id)).find((event) => event && !prev.hintRelation[event.id]);
      }

      if (!target) {
        return { ...prev, message: copy.noTargets, log: pushLog(prev.log, copy.noTargets) };
      }

      let message = "";
      let intelCost = 0;
      let hintRanges = prev.hintRanges;
      let hintExact = prev.hintExact;
      let hintRelation = prev.hintRelation;

      if (type === "range") {
        const range = [target.year - 25, target.year + 25];
        hintRanges = { ...prev.hintRanges, [target.id]: range };
        intelCost = 1;
        message = copy.rangeHintApplied(getTimelineEventText(target, locale, "title"), formatTimelineYear(range[0], locale), formatTimelineYear(range[1], locale));
      } else if (type === "exact") {
        hintExact = { ...prev.hintExact, [target.id]: true };
        intelCost = 2;
        message = copy.exactHintApplied(getTimelineEventText(target, locale, "title"), formatTimelineYear(target.year, locale));
      } else {
        const relation = anchor && target.year < anchor.year ? copy.relationBefore : copy.relationAfter;
        hintRelation = { ...prev.hintRelation, [target.id]: relation };
        intelCost = 1;
        message = copy.relationHintApplied(getTimelineEventText(target, locale, "title"), relation, anchor ? getTimelineEventText(anchor, locale, "title") : "");
      }

      return {
        ...prev,
        intel: prev.intel - intelCost,
        hintsUsedRound: prev.hintsUsedRound + 1,
        hintRanges,
        hintExact,
        hintRelation,
        message,
        log: pushLog(prev.log, message),
      };
    });
  }, [copy, locale]);

  const finalizeRound = useCallback((reason = "submit") => {
    setState((prev) => {
      if (prev.phase !== "playing") return prev;
      const currentRound = getRound(prev);
      if (!currentRound) return prev;
      const finalOrderIds = fillTimelineOrder(currentRound, prev.placedOrderIds);
      const evaluation = evaluateTimelineRound({
        round: currentRound,
        placedOrderIds: finalOrderIds,
        secondsLeft: prev.roundClock,
        hintsUsed: prev.hintsUsedRound,
        streakBefore: prev.streak,
      });
      const score = prev.score + evaluation.scoreDelta;
      const streak = evaluation.exactOrder ? prev.streak + 1 : 0;
      const intel = prev.intel + (evaluation.exactOrder ? 1 : 0);
      const message = reason === "timeout"
        ? copy.roundTimeout(evaluation.correctSlots, currentRound.events.length, evaluation.scoreDelta)
        : evaluation.exactOrder
          ? copy.roundPerfect(evaluation.scoreDelta, streak)
          : copy.roundResolved(evaluation.correctSlots, currentRound.events.length, evaluation.scoreDelta);
      return {
        ...prev,
        phase: "review",
        placedOrderIds: finalOrderIds,
        score,
        streak,
        bestStreak: Math.max(prev.bestStreak, streak),
        intel,
        history: [...prev.history, { roundNumber: prev.roundIndex + 1, reason, hintsUsed: prev.hintsUsedRound, secondsLeft: prev.roundClock, ...evaluation }],
        message,
        log: pushLog(prev.log, message),
      };
    });
  }, [copy]);

  const nextRound = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== "review") return prev;
      if (prev.roundIndex >= prev.mission.totalRounds - 1) {
        const report = summarizeTimelineMission(prev.mission, prev.history, prev.score);
        const message = copy.missionFinished(formatRankLabel(copy, report.rank), report.totalScore);
        return { ...prev, phase: "finished", message, log: pushLog(prev.log, message) };
      }
      const roundIndex = prev.roundIndex + 1;
      const message = copy.roundStarted(roundIndex + 1, prev.mission.totalRounds);
      return {
        ...prev,
        roundIndex,
        phase: "playing",
        roundClock: prev.mission.secondsPerRound,
        placedOrderIds: [],
        hintRanges: {},
        hintExact: {},
        hintRelation: {},
        hintsUsedRound: 0,
        message,
        log: pushLog(prev.log, message),
      };
    });
  }, [copy]);

  const notifyNeedCards = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== "playing") return prev;
      const missing = Math.max(0, prev.mission.cardsPerRound - prev.placedOrderIds.length);
      const message = copy.needCards(missing);
      return { ...prev, message, log: pushLog(prev.log, message) };
    });
  }, [copy]);

  const trySubmitRound = useCallback(() => {
    if (state.phase !== "playing") return;
    if (state.placedOrderIds.length < state.mission.cardsPerRound) {
      notifyNeedCards();
      return;
    }
    finalizeRound("submit");
  }, [
    finalizeRound,
    notifyNeedCards,
    state.mission.cardsPerRound,
    state.phase,
    state.placedOrderIds.length,
  ]);

  useEffect(() => {
    if (state.phase !== "playing" || state.roundClock <= 0) return undefined;
    const timeoutId = window.setTimeout(() => {
      setState((prev) => {
        if (prev.phase !== "playing") return prev;
        return { ...prev, roundClock: Math.max(0, prev.roundClock - 1) };
      });
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [state.phase, state.roundClock]);

  useEffect(() => {
    if (state.phase === "playing" && state.roundClock === 0) {
      finalizeRound("timeout");
    }
  }, [state.phase, state.roundClock, finalizeRound]);

  useEffect(() => {
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
      if (key === "h") {
        event.preventDefault();
        applyHint("range");
        return;
      }
      if (key === "j") {
        event.preventDefault();
        applyHint("exact");
        return;
      }
      if (key === "k") {
        event.preventDefault();
        applyHint("relation");
        return;
      }
      if (key === "n" && state.phase === "review") {
        event.preventDefault();
        nextRound();
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
          if (state.placedOrderIds.length < state.mission.cardsPerRound) {
            notifyNeedCards();
            return;
          }
          finalizeRound("submit");
          return;
        }
        if (state.phase === "review") {
          nextRound();
          return;
        }
        restart();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    applyHint,
    copy,
    finalizeRound,
    nextRound,
    notifyNeedCards,
    placeCard,
    remainingEvents,
    removeCard,
    restart,
    state.phase,
    state.placedOrderIds,
    state.mission.cardsPerRound,
  ]);

  const payloadBuilder = useCallback((snapshot) => {
    const activeRound = getRound(snapshot);
    const roundById = new Map((activeRound?.events ?? []).map((event) => [event.id, event]));
    const cards = (activeRound?.shuffledOrderIds ?? []).map((eventId) => {
      const event = roundById.get(eventId);
      const exactVisible = snapshot.phase !== "playing" || snapshot.hintExact[eventId] || eventId === activeRound?.anchorId;
      return {
        id: eventId,
        title: getTimelineEventText(event, locale, "title"),
        year: exactVisible ? event?.year ?? null : null,
        range: snapshot.hintRanges[eventId] ?? null,
        relation: snapshot.hintRelation[eventId] ?? null,
        placedIndex: snapshot.placedOrderIds.indexOf(eventId),
      };
    });
    return {
      mode: "knowledge-arcade",
      variant: "cronologia",
      locale,
      coordinates: copy.coordinates,
      match: { current: snapshot.matchId + 1, total: KNOWLEDGE_ARCADE_MATCH_COUNT },
      mission: {
        modeId: snapshot.modeId,
        difficultyId: snapshot.difficultyId,
        round: snapshot.roundIndex + 1,
        totalRounds: snapshot.mission.totalRounds,
        phase: snapshot.phase,
      },
      score: snapshot.score,
      streak: snapshot.streak,
      intel: snapshot.intel,
      timer: snapshot.roundClock,
      hintsUsedRound: snapshot.hintsUsedRound,
      cards,
      historyTail: snapshot.history.slice(-3),
      message: snapshot.message,
    };
  }, [copy, locale]);

  const advanceTime = useCallback(() => undefined, []);
  useGameRuntimeBridge(state, payloadBuilder, advanceTime);

  const latestRoundResult = state.history[state.history.length - 1] ?? null;
  const timerRatio = clamp01(state.roundClock / Math.max(1, state.mission.secondsPerRound));

  return (
    <div className="mini-game knowledge-game knowledge-arcade-game knowledge-cronologia">
      <div className="mini-head timeline-hero">
        <div className="timeline-hero-copy">
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="timeline-head-actions">
          {state.phase === "review" ? (
            <button type="button" className="knowledge-ui-btn knowledge-ui-btn-secondary" onClick={nextRound}>
              {copy.nextRound}
            </button>
          ) : null}
          <button type="button" className="knowledge-ui-btn knowledge-ui-btn-primary" onClick={restart}>
            {copy.restart}
          </button>
        </div>
      </div>

      <section className="knowledge-mode-shell timeline-shell">
        <div className="timeline-command-strip">
          <div className="timeline-kpi-grid">
            <article className="timeline-kpi-card">
              <span>{copy.round}</span>
              <strong>{Math.min(state.roundIndex + 1, state.mission.totalRounds)}/{state.mission.totalRounds}</strong>
            </article>
            <article className="timeline-kpi-card">
              <span>{copy.score}</span>
              <strong>{state.score}</strong>
            </article>
            <article className="timeline-kpi-card">
              <span>{copy.streak}</span>
              <strong>{state.streak}</strong>
            </article>
            <article className="timeline-kpi-card">
              <span>{copy.intel}</span>
              <strong>{state.intel}</strong>
            </article>
            <article className="timeline-kpi-card">
              <span>{copy.status}</span>
              <strong>{phaseLabel(copy, state.phase)}</strong>
            </article>
          </div>
          <article className="timeline-clock-card">
            <span>{copy.timer}</span>
            <div className="timeline-clock-bar" aria-hidden="true">
              <i style={{ width: `${Math.round(timerRatio * 100)}%` }} />
            </div>
            <strong>{state.roundClock}s</strong>
          </article>
        </div>

        <div className="timeline-config-strip">
          <section className="timeline-pill-group">
            <span className="timeline-pill-label">{copy.mode}</span>
            <div className="timeline-pill-track" role="group" aria-label={copy.mode}>
              {TIMELINE_MODE_CONFIG.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={state.modeId === mode.id ? "timeline-pill-button active" : "timeline-pill-button"}
                  onClick={() => switchMode(mode.id)}
                  aria-pressed={state.modeId === mode.id}
                >
                  {copy.modeLabels[mode.id] ?? mode.id}
                </button>
              ))}
            </div>
          </section>

          <section className="timeline-pill-group">
            <span className="timeline-pill-label">{copy.difficulty}</span>
            <div className="timeline-pill-track" role="group" aria-label={copy.difficulty}>
              {TIMELINE_DIFFICULTY_CONFIG.map((difficulty) => (
                <button
                  key={difficulty.id}
                  type="button"
                  className={state.difficultyId === difficulty.id ? "timeline-pill-button active" : "timeline-pill-button"}
                  onClick={() => switchDifficulty(difficulty.id)}
                  aria-pressed={state.difficultyId === difficulty.id}
                >
                  {copy.difficultyLabels[difficulty.id] ?? difficulty.id}
                </button>
              ))}
            </div>
          </section>
        </div>

        <p className="timeline-shortcut-hint">{copy.shortcut}</p>

        <div className="timeline-board">
          {anchorEvent ? (
            <section className="timeline-anchor-card">
              <h5>{copy.anchorTitle}</h5>
              <strong>{getTimelineEventText(anchorEvent, locale, "title")}</strong>
              <span>{formatTimelineYear(anchorEvent.year, locale)}</span>
              <p>{getTimelineEventText(anchorEvent, locale, "summary")}</p>
            </section>
          ) : null}

          <section className="timeline-track timeline-track-panel">
            <div className="timeline-panel-head">
              <h5>{copy.timeline}</h5>
              <span>{state.placedOrderIds.length}/{state.mission.cardsPerRound}</span>
            </div>
            <div className="timeline-track-line" aria-hidden="true" />
            <ol className="timeline-track-slots">
              {Array.from({ length: state.mission.cardsPerRound }, (_, index) => {
                const eventId = state.placedOrderIds[index] ?? null;
                const event = eventId ? eventById.get(eventId) ?? null : null;
                return (
                  <li key={`slot-${index}`}>
                    {event ? (
                      <button
                        type="button"
                        className="timeline-slot-card filled"
                        onClick={() => removeCard(event.id)}
                        disabled={state.phase !== "playing"}
                        style={{ "--timeline-order": index }}
                      >
                        <strong>{getTimelineEventText(event, locale, "title")}</strong>
                        <span>{state.phase === "playing" ? copy.hiddenYear : formatTimelineYear(event.year, locale)}</span>
                      </button>
                    ) : (
                      <button type="button" className="timeline-slot-card" disabled>
                        <strong>{copy.timeline} #{index + 1}</strong>
                        <span>{copy.hiddenYear}</span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="timeline-pool timeline-pool-panel">
            <div className="timeline-panel-head">
              <h5>{copy.pending}</h5>
              <span>{remainingEvents.length}</span>
            </div>
            {remainingEvents.length ? (
              <ul>
                {remainingEvents.map((event, index) => {
                  const exactVisible = state.phase !== "playing" || state.hintExact[event.id];
                  const range = state.hintRanges[event.id];
                  const relation = state.hintRelation[event.id];
                  const yearLabel = exactVisible
                    ? formatTimelineYear(event.year, locale)
                    : range
                      ? `${formatTimelineYear(range[0], locale)} - ${formatTimelineYear(range[1], locale)}`
                      : relation || copy.hiddenYear;
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
                        <p>{getTimelineEventText(event, locale, "summary")}</p>
                        <span className="timeline-event-year">{yearLabel}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="timeline-empty">{copy.noPendingEvents}</p>
            )}
          </section>
        </div>

        <section className="timeline-actions-dock">
          <button type="button" className="knowledge-ui-btn knowledge-ui-btn-secondary" onClick={() => applyHint("range")} disabled={state.phase !== "playing"}>
            {copy.hintRange}
          </button>
          <button type="button" className="knowledge-ui-btn knowledge-ui-btn-secondary" onClick={() => applyHint("exact")} disabled={state.phase !== "playing"}>
            {copy.hintExact}
          </button>
          <button type="button" className="knowledge-ui-btn knowledge-ui-btn-secondary" onClick={() => applyHint("relation")} disabled={state.phase !== "playing" || !anchorEvent}>
            {copy.hintRelation}
          </button>
          <button type="button" className="knowledge-ui-btn" onClick={clearOrder} disabled={state.phase !== "playing" || !state.placedOrderIds.length}>
            {copy.clear}
          </button>
          <button
            type="button"
            className="knowledge-ui-btn knowledge-ui-btn-accent"
            onClick={trySubmitRound}
            disabled={state.phase !== "playing"}
          >
            {copy.submit}
          </button>
        </section>

        {latestRoundResult ? (
          <section className="timeline-review-panel">
            <h5>{copy.review}</h5>
            <div className="timeline-review-grid">
              <article>
                <h6>{copy.expected}</h6>
                <ol>
                  {latestRoundResult.expectedOrderIds.map((eventId) => {
                    const event = eventById.get(eventId);
                    if (!event) return null;
                    return (
                      <li key={`expected-${eventId}`}>
                        <strong>{getTimelineEventText(event, locale, "title")}</strong>
                        <span>{formatTimelineYear(event.year, locale)}</span>
                      </li>
                    );
                  })}
                </ol>
              </article>
              <article>
                <h6>{copy.yours}</h6>
                <ol>
                  {latestRoundResult.finalOrderIds.map((eventId, index) => {
                    const event = eventById.get(eventId);
                    if (!event) return null;
                    const slotData = latestRoundResult.slotBreakdown[index];
                    return (
                      <li key={`actual-${eventId}`}>
                        <strong>{getTimelineEventText(event, locale, "title")}</strong>
                        <span>{formatTimelineYear(event.year, locale)}</span>
                        <em>+{slotData?.error ?? 0}</em>
                      </li>
                    );
                  })}
                </ol>
              </article>
            </div>
          </section>
        ) : null}

        <div className="timeline-feedback-row">
          <section className="timeline-summary-panel">
            <h5>{copy.summary}</h5>
            <ul>
              <li>{copy.status}: <strong>{phaseLabel(copy, state.phase)}</strong></li>
              <li>{copy.score}: <strong>{summary.totalScore}</strong></li>
              <li>{copy.streak}: <strong>{state.bestStreak}</strong></li>
              <li>{copy.round}: <strong>{summary.roundsPlayed}/{summary.roundsTarget}</strong></li>
              <li>{copy.avgAccuracy}: <strong>{pct(summary.averageAccuracy)}</strong></li>
              <li>{copy.avgChronology}: <strong>{pct(summary.averageChronology)}</strong></li>
              <li>{copy.rank}: <strong>{formatRankLabel(copy, summary.rank)}</strong></li>
            </ul>
          </section>

          <section className="timeline-log-panel">
            <h5>{copy.logTitle}</h5>
            <ul>
              {state.log.map((entry, index) => (
                <li key={`log-${index}`}>{entry}</li>
              ))}
            </ul>
          </section>
        </div>
      </section>

      <p className="game-message timeline-game-message">{state.message}</p>
    </div>
  );
}

export default TimelineKnowledgeGame;
