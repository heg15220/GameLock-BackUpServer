import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../utils/useGameRuntimeBridge";
import useMobileGameViewport from "../../mobile/useMobileGameViewport";
import {
  KNOWLEDGE_ARCADE_MATCH_COUNT,
  createSeededRandom,
  getRandomKnowledgeMatchId,
  getRandomKnowledgeMatchIdExcept,
  resolveKnowledgeArcadeLocale
} from "./knowledgeArcadeUtils";

const TOTAL_ROUNDS = 10;
const TOTAL_TIME_MS = 40000;
const TIMER_TICK_MS = 100;

const COPY_BY_LOCALE = {
  es: {
    title: "Calculo Mental Flash 10",
    subtitle: "10 rondas de operaciones mixtas. Resuelve todo antes de que se agoten 40 segundos.",
    restart: "Partida aleatoria",
    timer: "Tiempo",
    rounds: "Ronda",
    solved: "Aciertos",
    mistakes: "Fallos",
    status: "Estado",
    statusPlaying: "En curso",
    statusCompleted: "Completada",
    statusTimeout: "Sin tiempo",
    sessionComplete: "Sesion completada",
    answerLabel: "Tu respuesta",
    answerPlaceholder: "Escribe numero y pulsa Enter",
    submit: "Validar",
    clear: "Borrar",
    help: "Atajos: Enter valida, Backspace borra y R inicia una nueva partida.",
    historyTitle: "Historial de rondas",
    emptyHistory: "Sin rondas resueltas todavia.",
    correctRound: (nextRound) => `Correcto. Preparado para la ronda ${nextRound}.`,
    incorrectRound: (answer, nextRound) =>
      `Incorrecto. Resultado correcto: ${answer}. Pasa a la ronda ${nextRound}.`,
    invalidAnswer: "Introduce un numero valido antes de validar.",
    timeoutMessage: (correct) => `Tiempo agotado. Aciertos: ${correct}/${TOTAL_ROUNDS}.`,
    completedMessage: (correct, timeLeftMs) =>
      `Partida completada. Aciertos: ${correct}/${TOTAL_ROUNDS}. Tiempo restante: ${(timeLeftMs / 1000).toFixed(1)} s.`,
    startMessage: "Comienza la ronda 1.",
    answeredRounds: "Rondas resueltas",
    accuracy: "Precision",
    solvedTag: "OK",
    failedTag: "KO"
  },
  en: {
    title: "Mental Math Flash 10",
    subtitle: "10 mixed-operation rounds. Solve everything before 40 seconds run out.",
    restart: "Random match",
    timer: "Time",
    rounds: "Round",
    solved: "Correct",
    mistakes: "Wrong",
    status: "Status",
    statusPlaying: "In progress",
    statusCompleted: "Completed",
    statusTimeout: "Out of time",
    sessionComplete: "Session complete",
    answerLabel: "Your answer",
    answerPlaceholder: "Type a number and press Enter",
    submit: "Submit",
    clear: "Clear",
    help: "Shortcuts: Enter submits, Backspace deletes, and R starts a new match.",
    historyTitle: "Round history",
    emptyHistory: "No solved rounds yet.",
    correctRound: (nextRound) => `Correct. Ready for round ${nextRound}.`,
    incorrectRound: (answer, nextRound) =>
      `Incorrect. Correct answer: ${answer}. Moving to round ${nextRound}.`,
    invalidAnswer: "Enter a valid number before submitting.",
    timeoutMessage: (correct) => `Time is up. Score: ${correct}/${TOTAL_ROUNDS}.`,
    completedMessage: (correct, timeLeftMs) =>
      `Match completed. Score: ${correct}/${TOTAL_ROUNDS}. Time left: ${(timeLeftMs / 1000).toFixed(1)} s.`,
    startMessage: "Round 1 started.",
    answeredRounds: "Resolved rounds",
    accuracy: "Accuracy",
    solvedTag: "OK",
    failedTag: "MISS"
  }
};

const randomInt = (random, min, max) =>
  Math.floor(random() * (max - min + 1)) + min;

const resolveOperationPool = (roundIndex) => {
  if (roundIndex <= 2) return ["+", "-"];
  if (roundIndex <= 6) return ["+", "-", "*"];
  return ["+", "-", "*", "/"];
};

const createRound = (random, roundIndex) => {
  const pool = resolveOperationPool(roundIndex);
  const operation = pool[randomInt(random, 0, pool.length - 1)];

  if (operation === "+") {
    const left = randomInt(random, 10 + roundIndex * 2, 45 + roundIndex * 4);
    const right = randomInt(random, 4 + roundIndex, 24 + roundIndex * 3);
    return {
      expression: `${left} + ${right}`,
      answer: left + right,
      operation
    };
  }

  if (operation === "-") {
    const left = randomInt(random, 20 + roundIndex * 3, 72 + roundIndex * 4);
    const right = randomInt(random, 3 + roundIndex, Math.max(8 + roundIndex, left - 1));
    const safeRight = Math.min(right, left - 1);
    return {
      expression: `${left} - ${safeRight}`,
      answer: left - safeRight,
      operation
    };
  }

  if (operation === "*") {
    const left = randomInt(random, 2, 8 + Math.floor(roundIndex / 2));
    const right = randomInt(random, 3, 10 + Math.floor(roundIndex / 2));
    return {
      expression: `${left} x ${right}`,
      answer: left * right,
      operation
    };
  }

  const divisor = randomInt(random, 2, 9 + Math.floor(roundIndex / 2));
  const quotient = randomInt(random, 2, 12 + roundIndex);
  const dividend = divisor * quotient;
  return {
    expression: `${dividend} / ${divisor}`,
    answer: quotient,
    operation: "/"
  };
};

const createRounds = (matchId) => {
  const random = createSeededRandom(Number(matchId) + 1);
  return Array.from({ length: TOTAL_ROUNDS }, (_, index) => createRound(random, index));
};

const parseUserAnswer = (value) => {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".");
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const createInitialState = (matchId, copy) => ({
  matchId,
  rounds: createRounds(matchId),
  roundIndex: 0,
  timeLeftMs: TOTAL_TIME_MS,
  currentInput: "",
  history: [],
  correctCount: 0,
  incorrectCount: 0,
  status: "playing",
  message: copy.startMessage
});

const formatTimeLeft = (timeLeftMs) => `${(Math.max(0, timeLeftMs) / 1000).toFixed(1)} s`;

const applyElapsedTime = (snapshot, elapsedMs, copy) => {
  if (snapshot.status !== "playing") {
    return snapshot;
  }
  const nextTimeLeftMs = Math.max(0, snapshot.timeLeftMs - elapsedMs);
  if (nextTimeLeftMs > 0) {
    return {
      ...snapshot,
      timeLeftMs: nextTimeLeftMs
    };
  }
  return {
    ...snapshot,
    timeLeftMs: 0,
    status: "timeout",
    message: copy.timeoutMessage(snapshot.correctCount)
  };
};

function MentalMathKnowledgeGame() {
  const locale = useMemo(resolveKnowledgeArcadeLocale, []);
  const copy = useMemo(() => COPY_BY_LOCALE[locale] ?? COPY_BY_LOCALE.en, [locale]);
  const viewport = useMobileGameViewport();
  const [state, setState] = useState(() =>
    createInitialState(getRandomKnowledgeMatchId(), copy)
  );
  const inputRef = useRef(null);

  const restart = useCallback(() => {
    setState((previous) =>
      createInitialState(getRandomKnowledgeMatchIdExcept(previous.matchId), copy)
    );
  }, [copy]);

  const clearInput = useCallback(() => {
    setState((previous) => ({
      ...previous,
      currentInput: ""
    }));
  }, []);

  const submitAnswer = useCallback(() => {
    setState((previous) => {
      if (previous.status !== "playing") {
        return previous;
      }

      const activeRound = previous.rounds[previous.roundIndex];
      if (!activeRound) {
        return previous;
      }

      const parsedAnswer = parseUserAnswer(previous.currentInput);
      if (parsedAnswer == null) {
        return {
          ...previous,
          message: copy.invalidAnswer
        };
      }

      const isCorrect = parsedAnswer === activeRound.answer;
      const nextRoundIndex = previous.roundIndex + 1;
      const nextCorrect = previous.correctCount + (isCorrect ? 1 : 0);
      const nextIncorrect = previous.incorrectCount + (isCorrect ? 0 : 1);
      const nextHistory = [
        ...previous.history,
        {
          round: previous.roundIndex + 1,
          expression: activeRound.expression,
          expected: activeRound.answer,
          provided: parsedAnswer,
          correct: isCorrect
        }
      ];

      if (nextRoundIndex >= TOTAL_ROUNDS) {
        return {
          ...previous,
          roundIndex: TOTAL_ROUNDS,
          currentInput: "",
          history: nextHistory,
          correctCount: nextCorrect,
          incorrectCount: nextIncorrect,
          status: "completed",
          message: copy.completedMessage(nextCorrect, previous.timeLeftMs)
        };
      }

      return {
        ...previous,
        roundIndex: nextRoundIndex,
        currentInput: "",
        history: nextHistory,
        correctCount: nextCorrect,
        incorrectCount: nextIncorrect,
        message: isCorrect
          ? copy.correctRound(nextRoundIndex + 1)
          : copy.incorrectRound(activeRound.answer, nextRoundIndex + 1)
      };
    });
  }, [copy]);

  const setInputValue = useCallback((event) => {
    const raw = event.target.value;
    if (/^-?\d*([.,]\d*)?$/.test(raw) || raw === "") {
      setState((previous) => ({
        ...previous,
        currentInput: raw
      }));
    }
  }, []);

  useEffect(() => {
    if (state.status !== "playing") {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setState((previous) => applyElapsedTime(previous, TIMER_TICK_MS, copy));
    }, TIMER_TICK_MS);
    return () => window.clearInterval(timer);
  }, [copy, state.status]);

  useEffect(() => {
    if (viewport.isMobile) {
      return;
    }
    if (state.status === "playing" && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [state.roundIndex, state.status, viewport.isMobile]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        restart();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [restart]);

  const answeredRounds = state.history.length;
  const accuracy = answeredRounds
    ? Math.round((state.correctCount / answeredRounds) * 100)
    : 0;
  const currentRound = state.rounds[state.roundIndex] ?? null;
  const statusLabel = state.status === "completed"
    ? copy.statusCompleted
    : state.status === "timeout"
      ? copy.statusTimeout
      : copy.statusPlaying;

  const payloadBuilder = useCallback((snapshot) => ({
    mode: "knowledge-arcade",
    variant: "calculo-mental",
    coordinates: "round_index_origin_one",
    locale,
    match: {
      current: snapshot.matchId + 1,
      total: KNOWLEDGE_ARCADE_MATCH_COUNT
    },
    status: snapshot.status,
    timer: {
      totalMs: TOTAL_TIME_MS,
      remainingMs: snapshot.timeLeftMs
    },
    rounds: {
      total: TOTAL_ROUNDS,
      answered: snapshot.history.length,
      current: snapshot.status === "playing" ? snapshot.roundIndex + 1 : null,
      activeExpression: snapshot.status === "playing"
        ? snapshot.rounds[snapshot.roundIndex]?.expression ?? null
        : null
    },
    score: {
      correct: snapshot.correctCount,
      incorrect: snapshot.incorrectCount,
      accuracy: snapshot.history.length
        ? Math.round((snapshot.correctCount / snapshot.history.length) * 100)
        : 0
    },
    currentInput: snapshot.currentInput,
    history: snapshot.history,
    message: snapshot.message
  }), [locale]);

  const advanceTime = useCallback((ms) => {
    const safeMs = Number.isFinite(ms) ? Math.max(0, ms) : 0;
    if (!safeMs) return;
    setState((previous) => applyElapsedTime(previous, safeMs, copy));
  }, [copy]);

  useGameRuntimeBridge(state, payloadBuilder, advanceTime);

  const recentHistory = state.history.slice(-5).reverse();

  return (
    <div
      className={[
        "mini-game",
        "knowledge-game",
        "knowledge-arcade-game",
        "knowledge-calculo-mental",
        viewport.isMobile ? "is-mobile" : "",
        viewport.isMobile ? `is-mobile-${viewport.orientation}` : ""
      ].filter(Boolean).join(" ")}
    >
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <button
          type="button"
          className="knowledge-ui-btn knowledge-ui-btn-primary"
          onClick={restart}
        >
          {copy.restart}
        </button>
      </div>

      <section
        className={[
          "knowledge-mode-shell",
          "mental-math-shell",
          viewport.isMobile ? "knowledge-mobile-shell" : ""
        ].filter(Boolean).join(" ")}
      >
        <div className="knowledge-status-row">
          <span>{copy.timer}: {formatTimeLeft(state.timeLeftMs)}</span>
          <span>{copy.rounds}: {Math.min(state.roundIndex + 1, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}</span>
          <span>{copy.solved}: {state.correctCount}</span>
          <span>{copy.mistakes}: {state.incorrectCount}</span>
          <span>{copy.status}: {statusLabel}</span>
        </div>

        <p className="mental-math-help">{copy.help}</p>

        <article className="mental-math-problem">
          <p className="mental-math-round-tag">
            {copy.rounds} {Math.min(state.roundIndex + 1, TOTAL_ROUNDS)} / {TOTAL_ROUNDS}
          </p>
          <p className="mental-math-expression">
            {state.status === "playing" && currentRound ? currentRound.expression : copy.sessionComplete}
          </p>
        </article>

        <div className="mental-math-input-shell">
          <label className="mental-math-input-label">
            {copy.answerLabel}
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={state.currentInput}
              placeholder={copy.answerPlaceholder}
              onChange={setInputValue}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (state.status === "playing") {
                    submitAnswer();
                  } else {
                    restart();
                  }
                }
              }}
              disabled={state.status !== "playing"}
            />
          </label>
          <div className="mental-math-actions">
            <button
              type="button"
              className="knowledge-ui-btn knowledge-ui-btn-secondary"
              onClick={clearInput}
              disabled={!state.currentInput.length || state.status !== "playing"}
            >
              {copy.clear}
            </button>
            <button
              type="button"
              className="knowledge-ui-btn knowledge-ui-btn-accent"
              onClick={submitAnswer}
              disabled={state.status !== "playing"}
            >
              {copy.submit}
            </button>
          </div>
        </div>

        <div className="mental-math-metrics">
          <span>{copy.answeredRounds}: {answeredRounds}/{TOTAL_ROUNDS}</span>
          <span>{copy.accuracy}: {accuracy}%</span>
        </div>

        <div className="mental-math-history">
          <h5>{copy.historyTitle}</h5>
          {recentHistory.length ? (
            <ul>
              {recentHistory.map((entry) => (
                <li key={`round-${entry.round}`}>
                  <strong>R{entry.round}</strong>
                  <span>{entry.expression}</span>
                  <span>{entry.provided}</span>
                  <span>{entry.expected}</span>
                  <span className={entry.correct ? "ok" : "ko"}>
                    {entry.correct ? copy.solvedTag : copy.failedTag}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>{copy.emptyHistory}</p>
          )}
        </div>
      </section>

      <p className="game-message">{state.message}</p>
    </div>
  );
}

export default MentalMathKnowledgeGame;
