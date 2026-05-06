import React, { useCallback, useEffect, useMemo, useState } from "react";
import useMobileGameViewport from "../../mobile/useMobileGameViewport";
import useGameRuntimeBridge from "../../utils/useGameRuntimeBridge";
import {
  KNOWLEDGE_ARCADE_MATCH_COUNT,
  getRandomKnowledgeMatchId,
  getRandomKnowledgeMatchIdExcept,
  resolveKnowledgeArcadeLocale
} from "./knowledgeArcadeUtils";
import { loadPasapalabraMatchCacheEntry } from "./pasapalabraMatchCache.generated";
import { loadPasapalabraWordBankLocale } from "./pasapalabraWordBank.generated";

const ROUND_TIME = 900;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

const COPY_BY_LOCALE = {
  es: {
    title: "Rosco",
    subtitle: "Rosco completo con 10.000 partidas cacheadas por idioma.",
    restart: "Partida aleatoria",
    match: "Partida",
    status: "Estado",
    score: "Aciertos",
    misses: "Fallos",
    pending: "Pendientes",
    time: "Tiempo",
    answer: "Respuesta",
    submit: "Responder",
    pass: "Pasapalabra",
    next: "Siguiente",
    clue: "Pista",
    starts: "Empieza por",
    contains: "Contiene",
    playing: "En curso",
    won: "Completado",
    lost: "Terminado",
    loading: "Cargando rosco...",
    startMessage: "Responde o pasa palabra para recorrer el rosco.",
    correct: (word) => `Correcto: ${word}.`,
    wrong: (word) => `Incorrecto. La respuesta era ${word}.`,
    passed: "Pasapalabra.",
    completed: "Rosco completado.",
    timeUp: "Tiempo agotado.",
    typeHint: "Pulsa las letras, Enter valida, Espacio pasa palabra y R carga otro rosco.",
    solution: "Respuesta correcta",
    clear: "Borrar"
  },
  en: {
    title: "Rondo",
    subtitle: "Full alphabet ring with 10,000 cached matches per locale.",
    restart: "Random match",
    match: "Match",
    status: "Status",
    score: "Correct",
    misses: "Misses",
    pending: "Pending",
    time: "Time",
    answer: "Answer",
    submit: "Submit",
    pass: "Pass",
    next: "Next",
    clue: "Clue",
    starts: "Starts with",
    contains: "Contains",
    playing: "In progress",
    won: "Complete",
    lost: "Finished",
    loading: "Loading ring...",
    startMessage: "Answer or pass to move around the ring.",
    correct: (word) => `Correct: ${word}.`,
    wrong: (word) => `Wrong. The answer was ${word}.`,
    passed: "Passed.",
    completed: "Ring completed.",
    timeUp: "Time is up.",
    typeHint: "Tap the letters, Enter submits, Space passes and R loads another ring.",
    solution: "Correct answer",
    clear: "Delete"
  }
};

const normalizeAnswer = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^A-Za-z]/g, "")
  .toUpperCase();

const parseMatchParam = (raw) => {
  if (raw == null) return null;
  const parsed = Number.parseInt(String(raw), 10);
  if (!Number.isInteger(parsed)) return null;
  if (parsed >= 0 && parsed < KNOWLEDGE_ARCADE_MATCH_COUNT) return parsed;
  if (parsed >= 1 && parsed <= KNOWLEDGE_ARCADE_MATCH_COUNT) return parsed - 1;
  return null;
};

const resolveMatchIdFromLocation = () => {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  const hashMatch = parseMatchParam(new URLSearchParams(hash).get("match"));
  if (hashMatch != null) return hashMatch;
  return parseMatchParam(new URLSearchParams(window.location.search).get("match"));
};

const unpackQuestion = (packed, wordBank) => {
  const entry = wordBank[packed[2]] ?? { word: "", clue: "" };
  return {
    letter: packed[0],
    mode: packed[1] === "S" ? "starts" : "contains",
    word: entry.word,
    clue: entry.clue
  };
};

const createInitialState = (matchId, packed, wordBank, copy) => {
  const questions = (packed?.q || []).map((question) => unpackQuestion(question, wordBank));
  return {
    matchId,
    questions,
    currentIndex: 0,
    input: "",
    statuses: questions.map(() => "pending"),
    correct: 0,
    misses: 0,
    timeLeft: ROUND_TIME,
    phase: "playing",
    message: copy.startMessage,
    lastSolution: null
  };
};

const findNextPlayableIndex = (statuses, fromIndex) => {
  if (!statuses.some((status) => status === "pending" || status === "passed")) return -1;
  for (let offset = 1; offset <= statuses.length; offset += 1) {
    const index = (fromIndex + offset) % statuses.length;
    if (statuses[index] === "pending" || statuses[index] === "passed") return index;
  }
  return -1;
};

const formatTime = (seconds) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
};

function PasapalabraKnowledgeGame() {
  const locale = useMemo(resolveKnowledgeArcadeLocale, []);
  const copy = useMemo(() => COPY_BY_LOCALE[locale] ?? COPY_BY_LOCALE.en, [locale]);
  const viewport = useMobileGameViewport();
  const initialMatchId = useMemo(
    () => resolveMatchIdFromLocation() ?? getRandomKnowledgeMatchId(),
    []
  );
  const [state, setState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMatch = useCallback((matchId) => {
    setIsLoading(true);
    setState(null);
    return loadPasapalabraMatchCacheEntry(locale, matchId).then((packed) => {
      return loadPasapalabraWordBankLocale(locale).then((wordBank) => {
        setState(createInitialState(matchId, packed, wordBank, copy));
        setIsLoading(false);
      });
    });
  }, [copy, locale]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setState(null);
    Promise.all([
      loadPasapalabraMatchCacheEntry(locale, initialMatchId),
      loadPasapalabraWordBankLocale(locale)
    ]).then(([packed, wordBank]) => {
      if (cancelled) return;
      setState(createInitialState(initialMatchId, packed, wordBank, copy));
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [copy, initialMatchId, locale]);

  const currentQuestion = state?.questions[state.currentIndex] ?? null;
  const pendingCount = useMemo(
    () => state?.statuses.filter((status) => status === "pending" || status === "passed").length ?? 0,
    [state?.statuses]
  );

  const restart = useCallback(() => {
    const currentMatchId = state?.matchId ?? initialMatchId;
    void loadMatch(getRandomKnowledgeMatchIdExcept(currentMatchId));
  }, [initialMatchId, loadMatch, state?.matchId]);

  const passQuestion = useCallback(() => {
    setState((previous) => {
      if (!previous || previous.phase !== "playing") return previous;
      const statuses = [...previous.statuses];
      if (statuses[previous.currentIndex] === "pending") {
        statuses[previous.currentIndex] = "passed";
      }
      const nextIndex = findNextPlayableIndex(statuses, previous.currentIndex);
      if (nextIndex < 0) {
        return {
          ...previous,
          statuses,
          phase: "won",
          input: "",
          message: copy.completed
        };
      }
      return {
        ...previous,
        statuses,
        currentIndex: nextIndex,
        input: "",
        message: copy.passed,
        lastSolution: null
      };
    });
  }, [copy.completed, copy.passed]);

  const addLetter = useCallback((value) => {
    const letter = normalizeAnswer(value).slice(0, 1);
    if (!letter) return;
    setState((previous) => {
      if (!previous || previous.phase !== "playing") return previous;
      return { ...previous, input: `${previous.input}${letter}` };
    });
  }, []);

  const clearLetter = useCallback(() => {
    setState((previous) => {
      if (!previous || previous.phase !== "playing") return previous;
      if (!previous.input.length) return previous;
      return { ...previous, input: previous.input.slice(0, -1) };
    });
  }, []);

  const submitAnswer = useCallback(() => {
    setState((previous) => {
      if (!previous || previous.phase !== "playing") return previous;
      const question = previous.questions[previous.currentIndex];
      const guess = normalizeAnswer(previous.input);
      if (!guess) return previous;

      const isCorrect = guess === question.word;
      const statuses = [...previous.statuses];
      statuses[previous.currentIndex] = isCorrect ? "correct" : "wrong";
      const nextIndex = findNextPlayableIndex(statuses, previous.currentIndex);
      const completed = nextIndex < 0;

      return {
        ...previous,
        statuses,
        currentIndex: completed ? previous.currentIndex : nextIndex,
        input: "",
        correct: previous.correct + (isCorrect ? 1 : 0),
        misses: previous.misses + (isCorrect ? 0 : 1),
        phase: completed ? "won" : "playing",
        message: completed ? copy.completed : isCorrect ? copy.correct(question.word) : copy.wrong(question.word),
        lastSolution: isCorrect ? null : question.word
      };
    });
  }, [copy]);

  useEffect(() => {
    if (!state || state.phase !== "playing") return undefined;
    const timerId = window.setTimeout(() => {
      setState((previous) => {
        if (!previous || previous.phase !== "playing") return previous;
        if (previous.timeLeft <= 1) {
          return {
            ...previous,
            timeLeft: 0,
            phase: "lost",
            message: copy.timeUp
          };
        }
        return {
          ...previous,
          timeLeft: previous.timeLeft - 1
        };
      });
    }, 1000);
    return () => window.clearTimeout(timerId);
  }, [copy.timeUp, state?.phase, state?.timeLeft]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key;
      if (key === "Enter") {
        event.preventDefault();
        if (state?.phase === "playing") submitAnswer();
        else restart();
        return;
      }
      if (key === " " && state?.phase === "playing") {
        event.preventDefault();
        passQuestion();
        return;
      }
      if ((key === "Backspace" || key === "Delete") && state?.phase === "playing") {
        event.preventDefault();
        clearLetter();
        return;
      }
      if (state?.phase === "playing" && /^[a-zA-Z]$/.test(key)) {
        event.preventDefault();
        addLetter(key);
        return;
      }
      if (state?.phase !== "playing" && key.toLowerCase() === "r") {
        restart();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addLetter, clearLetter, passQuestion, restart, state?.phase, submitAnswer]);

  const payloadBuilder = useCallback((snapshot) => {
    if (!snapshot) {
      return {
        mode: "knowledge-arcade",
        variant: "pasapalabra-rondo",
        coordinates: "alphabet_ring",
        locale,
        loading: true,
        status: "loading"
      };
    }
    const active = snapshot.questions[snapshot.currentIndex] ?? null;
    return {
      mode: "knowledge-arcade",
      variant: "pasapalabra-rondo",
      coordinates: "alphabet_ring",
      locale,
      match: {
        current: snapshot.matchId + 1,
        total: KNOWLEDGE_ARCADE_MATCH_COUNT
      },
      status: snapshot.phase,
      timeLeft: snapshot.timeLeft,
      correct: snapshot.correct,
      misses: snapshot.misses,
      pending: snapshot.statuses.filter((status) => status === "pending" || status === "passed").length,
      activeLetter: active?.letter ?? null,
      activeMode: active?.mode ?? null,
      clue: active?.clue ?? null,
      ring: snapshot.questions.map((question, index) => ({
        letter: question.letter,
        status: snapshot.statuses[index]
      })),
      message: snapshot.message
    };
  }, [locale]);
  const advanceTime = useCallback(() => undefined, []);
  useGameRuntimeBridge(state, payloadBuilder, advanceTime);

  const rootClassName = [
    "mini-game",
    "knowledge-game",
    "knowledge-arcade-game",
    "knowledge-pasapalabra",
    viewport.isMobile ? "is-mobile" : "",
    viewport.isMobile ? `is-mobile-${viewport.orientation}` : ""
  ].filter(Boolean).join(" ");

  if (!state || isLoading) {
    return (
      <div className={rootClassName}>
        <div className="mini-head">
          <div>
            <h4>{copy.title}</h4>
            <p>{copy.subtitle}</p>
          </div>
          <button type="button" className="knowledge-ui-btn" disabled>{copy.loading}</button>
        </div>
      </div>
    );
  }

  const statusLabel = state.phase === "won"
    ? copy.won
    : state.phase === "lost"
      ? copy.lost
      : copy.playing;
  const questionPrefix = currentQuestion?.mode === "starts"
    ? `${copy.starts} ${currentQuestion.letter}`
    : `${copy.contains} ${currentQuestion?.letter}`;

  return (
    <div className={rootClassName}>
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <button type="button" className="knowledge-ui-btn knowledge-ui-btn-primary" onClick={restart}>
          {copy.restart}
        </button>
      </div>

      <section className="knowledge-mode-shell pasapalabra-shell">
        <div className="knowledge-status-row">
          <span>{copy.match}: {state.matchId + 1}/{KNOWLEDGE_ARCADE_MATCH_COUNT}</span>
          <span>{copy.status}: {statusLabel}</span>
          <span>{copy.time}: {formatTime(state.timeLeft)}</span>
          <span>{copy.score}: {state.correct}</span>
          <span>{copy.misses}: {state.misses}</span>
          <span>{copy.pending}: {pendingCount}</span>
        </div>

        <div className="pasapalabra-layout">
          <div className="pasapalabra-stage">
            <div className="pasapalabra-ring" aria-label="Alphabet ring">
              {state.questions.map((question, index) => {
                const status = state.statuses[index];
                const angle = (index / state.questions.length) * Math.PI * 2 - Math.PI / 2;
                const x = 50 + Math.cos(angle) * 42;
                const y = 50 + Math.sin(angle) * 42;
                return (
                  <button
                    key={question.letter}
                    type="button"
                    className={[
                      "pasapalabra-letter",
                      status,
                      index === state.currentIndex ? "active" : ""
                    ].filter(Boolean).join(" ")}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    onClick={() => {
                      if (state.phase !== "playing") return;
                      if (status === "pending" || status === "passed") {
                        setState((previous) => ({ ...previous, currentIndex: index, input: "", lastSolution: null }));
                      }
                    }}
                  >
                    {question.letter}
                  </button>
                );
              })}
              <div className="pasapalabra-ring-core">
                <strong>{state.correct}</strong>
                <span>{formatTime(state.timeLeft)}</span>
              </div>
            </div>
            <article className="pasapalabra-clue-card">
              <span>{questionPrefix}</span>
              <p><strong>{copy.clue}:</strong> {currentQuestion?.clue}</p>
            </article>
            {state.lastSolution ? (
              <p className="wordle-solution">{copy.solution}: {state.lastSolution}</p>
            ) : null}
          </div>

          <div className="pasapalabra-panel">
            <p className="wordle-help">{copy.typeHint}</p>
            <label className="pasapalabra-input-row">
              <span>{copy.answer}</span>
              <input
                type="text"
                value={state.input}
                readOnly
                aria-readonly="true"
                inputMode="none"
                tabIndex={-1}
                autoComplete="off"
              />
            </label>
            <div className="wordle-actions">
              <button type="button" className="knowledge-ui-btn knowledge-ui-btn-secondary" disabled={state.phase !== "playing" || !state.input.length} onClick={clearLetter}>
                {copy.clear}
              </button>
              <button type="button" className="knowledge-ui-btn knowledge-ui-btn-secondary" disabled={state.phase !== "playing"} onClick={submitAnswer}>
                {copy.submit}
              </button>
              <button type="button" className="knowledge-ui-btn knowledge-ui-btn-accent" disabled={state.phase !== "playing"} onClick={passQuestion}>
                {copy.pass}
              </button>
            </div>
            <div className="wordle-keyboard">
              {KEYBOARD_ROWS.map((row) => (
                <div key={row} className="wordle-keyboard-row">
                  {row.split("").map((letter) => (
                    <button
                      key={letter}
                      type="button"
                      className="wordle-key"
                      onClick={() => addLetter(letter)}
                      disabled={state.phase !== "playing"}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <p className="game-message">{state.message}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PasapalabraKnowledgeGame;
