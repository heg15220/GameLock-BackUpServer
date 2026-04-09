import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../utils/useGameRuntimeBridge";
import useMobileGameViewport from "../../mobile/useMobileGameViewport";
import {
  PROVERB_BANK_META,
  createProverbRounds,
  getRandomProverbSessionId,
  isCorrectProverbGuess,
  resolveProverbLocale,
} from "./proverbBank";

const ROUND_COUNT = 5;

const COPY_BY_LOCALE = {
  es: {
    title: "Reto de Refranes",
    subtitle: "5 rondas: completa la segunda mitad del refrán.",
    restart: "Nueva partida",
    playAgain: "Jugar otra vez",
    backToCatalog: "Volver al catálogo",
    nextRound: "Siguiente ronda",
    round: "Ronda",
    score: "Aciertos",
    attempts: "Intentos",
    status: "Estado",
    bank: "Banco",
    bankLabel: "Refranero español",
    statusPlaying: "En juego",
    statusReview: "Respuesta vista",
    statusFinished: "Partida cerrada",
    promptLabel: "Inicio del refrán",
    answerLabel: "Refrán completo",
    answerHidden: "La respuesta se muestra al validar.",
    inputLabel: "Completa la parte restante",
    inputPlaceholder: "Escribe el final del refrán...",
    submit: "Validar",
    clear: "Limpiar",
    help:
      "Escribe solo la continuación. También se acepta el refrán completo si prefieres teclearlo entero.",
    emptyGuess: "Escribe una continuación antes de validar.",
    correct: (proverb) => `Correcto: ${proverb}.`,
    wrong: (proverb) => `No coincide. La respuesta correcta era: ${proverb}.`,
    nextHint: (round, total) => `Ronda ${round}/${total}.`,
    finished: (hits, total) => `Partida terminada: ${hits}/${total} aciertos.`,
    finalTitle: "Resultado final",
    finalSummary: (hits, total) => `Has acertado ${hits} de ${total} refranes en esta partida.`,
    historyTitle: "Historial",
    historyCorrect: "Acertado",
    historyWrong: "Fallado",
    yourGuess: "Tu respuesta",
    emptyHistory: "Todavía no has validado ninguna ronda.",
  },
  en: {
    title: "Proverb Relay",
    subtitle: "5 rounds: complete the second half of the proverb.",
    restart: "New match",
    playAgain: "Play again",
    backToCatalog: "Back to catalog",
    nextRound: "Next round",
    round: "Round",
    score: "Hits",
    attempts: "Attempts",
    status: "Status",
    bank: "Bank",
    bankLabel: "English proverb bank",
    statusPlaying: "Playing",
    statusReview: "Answer shown",
    statusFinished: "Match complete",
    promptLabel: "Proverb opening",
    answerLabel: "Full proverb",
    answerHidden: "The answer is revealed after checking.",
    inputLabel: "Complete the missing part",
    inputPlaceholder: "Type the ending of the proverb...",
    submit: "Check",
    clear: "Clear",
    help:
      "Type only the continuation. The full proverb is also accepted if you prefer entering it whole.",
    emptyGuess: "Type a continuation before checking.",
    correct: (proverb) => `Correct: ${proverb}.`,
    wrong: (proverb) => `Not correct. The right answer was: ${proverb}.`,
    nextHint: (round, total) => `Round ${round}/${total}.`,
    finished: (hits, total) => `Match complete: ${hits}/${total} correct.`,
    finalTitle: "Final score",
    finalSummary: (hits, total) => `You got ${hits} out of ${total} proverbs right in this match.`,
    historyTitle: "History",
    historyCorrect: "Correct",
    historyWrong: "Wrong",
    yourGuess: "Your guess",
    emptyHistory: "No rounds have been checked yet.",
  },
};

function createInitialState(locale, copy, sessionId = getRandomProverbSessionId()) {
  const rounds = createProverbRounds(locale, sessionId, ROUND_COUNT);
  return {
    sessionId,
    rounds,
    roundIndex: 0,
    draft: "",
    hits: 0,
    attempts: 0,
    revealCurrent: false,
    status: rounds.length ? "playing" : "empty",
    history: [],
    message: rounds.length ? copy.help : "",
  };
}

function ProverbsKnowledgeGame() {
  const locale = useMemo(resolveProverbLocale, []);
  const copy = useMemo(() => COPY_BY_LOCALE[locale] ?? COPY_BY_LOCALE.en, [locale]);
  const viewport = useMobileGameViewport();
  const [state, setState] = useState(() => createInitialState(locale, copy));
  const inputRef = useRef(null);

  const currentEntry = state.rounds[state.roundIndex] ?? null;
  const bankSize = PROVERB_BANK_META.counts[locale] ?? PROVERB_BANK_META.counts.en;
  const statusLabel = state.status === "finished"
    ? copy.statusFinished
    : state.revealCurrent
      ? copy.statusReview
      : copy.statusPlaying;

  const restart = useCallback(() => {
    setState(() => createInitialState(locale, copy));
  }, [copy, locale]);

  const returnToCatalog = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("launch-game-close"));
    }
  }, []);

  const clearDraft = useCallback(() => {
    setState((previous) => ({ ...previous, draft: "" }));
  }, []);

  const autofillCurrentAnswer = useCallback(() => {
    setState((previous) => {
      if (previous.revealCurrent) return previous;
      const entry = previous.rounds[previous.roundIndex];
      if (!entry) return previous;
      return {
        ...previous,
        draft: entry.answer,
      };
    });
  }, []);

  const nextRound = useCallback(() => {
    setState((previous) => {
      if (!previous.revealCurrent || previous.status === "finished") {
        return previous;
      }

      const nextRoundIndex = previous.roundIndex + 1;
      if (nextRoundIndex >= previous.rounds.length) {
        return previous;
      }

      return {
        ...previous,
        roundIndex: nextRoundIndex,
        draft: "",
        revealCurrent: false,
        status: "playing",
        message: copy.nextHint(nextRoundIndex + 1, previous.rounds.length),
      };
    });
  }, [copy]);

  const submitGuess = useCallback(() => {
    setState((previous) => {
      if (!previous.rounds.length || previous.revealCurrent) {
        return previous;
      }

      const entry = previous.rounds[previous.roundIndex];
      if (!entry) {
        return previous;
      }

      const draft = String(previous.draft ?? "").trim();
      if (!draft) {
        return {
          ...previous,
          message: copy.emptyGuess,
        };
      }

      const correct = isCorrectProverbGuess(entry, draft);
      const attempts = previous.attempts + 1;
      const hits = previous.hits + (correct ? 1 : 0);
      const isLastRound = previous.roundIndex >= previous.rounds.length - 1;
      const roundMessage = correct ? copy.correct(entry.proverb) : copy.wrong(entry.proverb);

      return {
        ...previous,
        draft: "",
        hits,
        attempts,
        revealCurrent: true,
        status: isLastRound ? "finished" : "review",
        history: [
          ...previous.history,
          {
            round: previous.roundIndex + 1,
            prompt: entry.prompt,
            proverb: entry.proverb,
            guess: draft,
            correct,
          },
        ],
        message: isLastRound
          ? `${roundMessage} ${copy.finished(hits, previous.rounds.length)}`
          : roundMessage,
      };
    });
  }, [copy]);

  useEffect(() => {
    if (viewport.isMobile) {
      return;
    }
    if (!inputRef.current || state.revealCurrent || state.status === "finished") {
      return;
    }
    inputRef.current.focus();
    inputRef.current.select();
  }, [state.roundIndex, state.revealCurrent, state.status, viewport.isMobile]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const tagName = event.target?.tagName?.toLowerCase();
      const isInputContext =
        tagName === "input" || tagName === "textarea" || event.target?.isContentEditable;
      if (isInputContext) return;

      const key = String(event.key || "").toLowerCase();
      if (key === "r") {
        event.preventDefault();
        restart();
        return;
      }
      if (key === "q") {
        event.preventDefault();
        autofillCurrentAnswer();
        return;
      }
      if (key === "enter") {
        event.preventDefault();
        if (state.status === "finished") {
          restart();
        } else if (state.revealCurrent) {
          nextRound();
        } else {
          submitGuess();
        }
        return;
      }
      if (key === "n") {
        event.preventDefault();
        nextRound();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [autofillCurrentAnswer, nextRound, restart, state.revealCurrent, state.status, submitGuess]);

  const payloadBuilder = useCallback((snapshot) => {
    const snapshotEntry = snapshot.rounds[snapshot.roundIndex] ?? null;
    return {
      mode: "knowledge-arcade",
      variant: "refranes",
      locale,
      coordinates: "ui_linear",
      bankSize,
      match: {
        sessionId: snapshot.sessionId,
        round: snapshot.roundIndex + 1,
        rounds: snapshot.rounds.length,
      },
      status: snapshot.status,
      revealCurrent: snapshot.revealCurrent,
      score: {
        hits: snapshot.hits,
        attempts: snapshot.attempts,
      },
      currentRound: snapshotEntry
        ? {
            prompt: snapshotEntry.prompt,
            answer: snapshot.revealCurrent ? snapshotEntry.answer : null,
            proverb: snapshot.revealCurrent ? snapshotEntry.proverb : null,
          }
        : null,
      input: {
        draft: snapshot.draft,
      },
      history: snapshot.history.slice(-5),
      message: snapshot.message,
    };
  }, [bankSize, locale]);

  const advanceTime = useCallback(() => undefined, []);
  useGameRuntimeBridge(state, payloadBuilder, advanceTime);

  return (
    <div
      className={[
        "mini-game",
        "knowledge-game",
        "knowledge-arcade-game",
        "knowledge-refranes",
        viewport.isMobile ? "is-mobile" : "",
        viewport.isMobile ? `is-mobile-${viewport.orientation}` : ""
      ].filter(Boolean).join(" ")}
    >
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="proverb-head-actions">
          {state.revealCurrent && state.status !== "finished" ? (
            <button
              type="button"
              className="knowledge-ui-btn knowledge-ui-btn-secondary"
              onClick={nextRound}
            >
              {copy.nextRound}
            </button>
          ) : null}
          {state.status !== "finished" ? (
            <button
              type="button"
              className="knowledge-ui-btn knowledge-ui-btn-primary"
              onClick={restart}
            >
              {copy.restart}
            </button>
          ) : null}
        </div>
      </div>

      <section
        className={[
          "knowledge-mode-shell",
          "proverb-shell",
          viewport.isMobile ? "knowledge-mobile-shell" : ""
        ].filter(Boolean).join(" ")}
      >
        <div className="knowledge-status-row proverb-status">
          <span>{copy.round}: {Math.min(state.roundIndex + 1, state.rounds.length)}/{state.rounds.length}</span>
          <span>{copy.score}: {state.hits}</span>
          <span>{copy.attempts}: {state.attempts}</span>
          <span>{copy.bank}: {copy.bankLabel} ({bankSize})</span>
          <span>{copy.status}: {statusLabel}</span>
        </div>

        <p className="proverb-help">{copy.help}</p>

        <div className="proverb-layout">
          <div className="proverb-focus-card">
            <p className="proverb-label">{copy.promptLabel}</p>
            <blockquote className="proverb-prompt">
              {currentEntry ? `${currentEntry.prompt} ...` : "..."}
            </blockquote>

            <div className={`proverb-answer-panel ${state.revealCurrent ? "revealed" : "hidden"}`}>
              <p className="proverb-label">{copy.answerLabel}</p>
              <p className="proverb-answer-value">
                {state.revealCurrent && currentEntry ? currentEntry.proverb : copy.answerHidden}
              </p>
            </div>
          </div>

          <aside className="proverb-side">
            {state.status === "finished" ? (
              <div className="proverb-finish-card">
                <p className="proverb-label">{copy.finalTitle}</p>
                <h5>{copy.finished(state.hits, state.rounds.length)}</h5>
                <p>{copy.finalSummary(state.hits, state.rounds.length)}</p>
                <div className="proverb-finish-actions">
                  <button
                    type="button"
                    className="knowledge-ui-btn knowledge-ui-btn-primary"
                    onClick={restart}
                  >
                    {copy.playAgain}
                  </button>
                  <button
                    type="button"
                    className="knowledge-ui-btn knowledge-ui-btn-secondary"
                    onClick={returnToCatalog}
                  >
                    {copy.backToCatalog}
                  </button>
                </div>
              </div>
            ) : (
              <form
                className="proverb-input-shell"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (state.revealCurrent) {
                    nextRound();
                    return;
                  }
                  submitGuess();
                }}
              >
                <label>
                  {copy.inputLabel}
                  <textarea
                    ref={inputRef}
                    value={state.draft}
                    onChange={(event) => {
                      const value = event.target.value.slice(0, 180);
                      setState((previous) => ({ ...previous, draft: value }));
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        if (state.revealCurrent) {
                          nextRound();
                        } else {
                          submitGuess();
                        }
                      }
                    }}
                    placeholder={copy.inputPlaceholder}
                    disabled={state.revealCurrent}
                    rows={3}
                  />
                </label>

                <div className="proverb-input-actions">
                  <button
                    type="button"
                    className="knowledge-ui-btn knowledge-ui-btn-secondary"
                    onClick={clearDraft}
                    disabled={!state.draft.length || state.revealCurrent}
                  >
                    {copy.clear}
                  </button>
                  <button
                    type="submit"
                    className="knowledge-ui-btn knowledge-ui-btn-accent"
                  >
                    {state.revealCurrent ? copy.nextRound : copy.submit}
                  </button>
                </div>
              </form>
            )}

            <div className="proverb-history">
              <h5>{copy.historyTitle}</h5>
              <ul>
                {state.history.length ? (
                  state.history.map((item) => (
                    <li key={`proverb-round-${item.round}`} className={item.correct ? "correct" : "wrong"}>
                      <span>#{item.round}</span>
                      <span>{item.correct ? copy.historyCorrect : copy.historyWrong}</span>
                      <span>{item.prompt} ...</span>
                      <span>{copy.yourGuess}: <strong>{item.guess}</strong></span>
                    </li>
                  ))
                ) : (
                  <li className="empty">{copy.emptyHistory}</li>
                )}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <p className="game-message">{state.message}</p>
    </div>
  );
}

export default ProverbsKnowledgeGame;
