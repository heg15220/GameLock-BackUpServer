import React, { useCallback, useEffect, useMemo, useState } from "react";
import useMobileGameViewport from "../../mobile/useMobileGameViewport";
import useGameRuntimeBridge from "../../utils/useGameRuntimeBridge";
import {
  getRandomKnowledgeMatchId,
  getRandomKnowledgeMatchIdExcept,
  resolveKnowledgeArcadeLocale
} from "./knowledgeArcadeUtils";
import {
  KNOWLEDGE_WORD_LEXICON_META,
  KNOWLEDGE_WORD_TARGET_COUNT,
  computeWordleFeedback,
  getKnowledgeWordEntry,
  mergeWordleKeyboardState,
  normalizeKnowledgeGuess
} from "./knowledgeWordLexicon";

const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

const COPY_BY_LOCALE = {
  es: {
    title: "Wordle Pro",
    subtitle: "Adivina la palabra oculta. Banco real de 10.000 palabras por idioma (ES/EN).",
    restart: "Partida aleatoria",
    match: "Partida",
    length: "Longitud",
    attempts: "Intentos",
    status: "Estado",
    statusPlaying: "En curso",
    statusWon: "Resuelta",
    statusLost: "Fallida",
    clue: "Pista",
    typeHint: "Escribe letras, Enter valida, Backspace borra y usa el boton de partida aleatoria para cambiar.",
    startMessage: (length) => `Adivina una palabra de ${length} letras.`,
    notEnoughLetters: (length) => `Debes completar ${length} letras antes de validar.`,
    tooManyLetters: (length) => `Solo se permiten ${length} letras en esta partida.`,
    letterAdded: (letter) => `Letra ${letter} anadida.`,
    letterDeleted: "Ultima letra borrada.",
    solved: (word) => `Perfecto: ${word} es correcta.`,
    failed: (word) => `Sin intentos. La palabra era ${word}.`,
    guessStored: "Intento registrado.",
    alreadyFinished: "La partida ha terminado. Pulsa Enter o Partida aleatoria.",
    solution: "Respuesta correcta",
    legendCorrect: "Correcta",
    legendPresent: "Esta pero en otra posicion",
    legendAbsent: "No aparece",
    inputLabel: "Entrada actual",
    submit: "Validar",
    clear: "Borrar"
  },
  en: {
    title: "Wordle Pro",
    subtitle: "Guess the hidden word. Real 10,000-word bank per locale (ES/EN).",
    restart: "Random match",
    match: "Match",
    length: "Length",
    attempts: "Attempts",
    status: "Status",
    statusPlaying: "In progress",
    statusWon: "Solved",
    statusLost: "Failed",
    clue: "Clue",
    typeHint: "Type letters, Enter to submit, Backspace to delete, and use the random-match button to change.",
    startMessage: (length) => `Guess a ${length}-letter word.`,
    notEnoughLetters: (length) => `You need ${length} letters before submitting.`,
    tooManyLetters: (length) => `Only ${length} letters are allowed in this match.`,
    letterAdded: (letter) => `Letter ${letter} added.`,
    letterDeleted: "Last letter deleted.",
    solved: (word) => `Great: ${word} is correct.`,
    failed: (word) => `No attempts left. The word was ${word}.`,
    guessStored: "Guess submitted.",
    alreadyFinished: "The match is over. Press Enter or Random match.",
    solution: "Correct answer",
    legendCorrect: "Correct",
    legendPresent: "Present in another slot",
    legendAbsent: "Not present",
    inputLabel: "Current input",
    submit: "Submit",
    clear: "Delete"
  }
};

const normalizeSingleLetter = (value) => normalizeKnowledgeGuess(value).slice(0, 1);

const resolveMaxAttempts = (wordLength) => {
  if (wordLength <= 6) return 6;
  if (wordLength <= 8) return 7;
  return 8;
};

const parseMatchParam = (raw) => {
  if (raw == null) return null;
  const parsed = Number.parseInt(String(raw), 10);
  if (!Number.isInteger(parsed)) return null;
  if (parsed >= 0 && parsed < KNOWLEDGE_WORD_TARGET_COUNT) {
    return parsed;
  }
  if (parsed >= 1 && parsed <= KNOWLEDGE_WORD_TARGET_COUNT) {
    return parsed - 1;
  }
  return null;
};

const resolveMatchIdFromLocation = () => {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  const hashMatch = parseMatchParam(new URLSearchParams(hash).get("match"));
  if (hashMatch != null) return hashMatch;

  const queryMatch = parseMatchParam(new URLSearchParams(window.location.search).get("match"));
  if (queryMatch != null) return queryMatch;

  return null;
};

const createInitialState = (matchId, locale, copy) => {
  const entry = getKnowledgeWordEntry(locale, matchId);
  const maxAttempts = resolveMaxAttempts(entry.length);

  return {
    matchId,
    targetWord: entry.word,
    clue: entry.clue,
    wordLength: entry.length,
    maxAttempts,
    guesses: [],
    currentInput: "",
    keyboardState: {},
    status: "playing",
    message: copy.startMessage(entry.length)
  };
};

function WordleKnowledgeGame() {
  const locale = useMemo(resolveKnowledgeArcadeLocale, []);
  const copy = useMemo(() => COPY_BY_LOCALE[locale] ?? COPY_BY_LOCALE.en, [locale]);
  const viewport = useMobileGameViewport();
  const [state, setState] = useState(() =>
    createInitialState(resolveMatchIdFromLocation() ?? getRandomKnowledgeMatchId(), locale, copy)
  );

  const statusLabel = state.status === "won"
    ? copy.statusWon
    : state.status === "lost"
      ? copy.statusLost
      : copy.statusPlaying;

  const restart = useCallback(() => {
    setState((previous) =>
      createInitialState(getRandomKnowledgeMatchIdExcept(previous.matchId), locale, copy)
    );
  }, [copy, locale]);

  const addLetter = useCallback((letterValue) => {
    const letter = normalizeSingleLetter(letterValue);
    if (!/^[A-Z]$/.test(letter)) {
      return;
    }

    setState((previous) => {
      if (previous.status !== "playing") {
        return {
          ...previous,
          message: copy.alreadyFinished
        };
      }
      if (previous.currentInput.length >= previous.wordLength) {
        return {
          ...previous,
          message: copy.tooManyLetters(previous.wordLength)
        };
      }

      return {
        ...previous,
        currentInput: `${previous.currentInput}${letter}`,
        message: copy.letterAdded(letter)
      };
    });
  }, [copy]);

  const clearLetter = useCallback(() => {
    setState((previous) => {
      if (previous.status !== "playing") {
        return previous;
      }
      if (!previous.currentInput.length) {
        return previous;
      }
      return {
        ...previous,
        currentInput: previous.currentInput.slice(0, -1),
        message: copy.letterDeleted
      };
    });
  }, [copy.letterDeleted]);

  const submitGuess = useCallback(() => {
    setState((previous) => {
      if (previous.status !== "playing") {
        return previous;
      }

      const guess = normalizeKnowledgeGuess(previous.currentInput);
      if (guess.length !== previous.wordLength) {
        return {
          ...previous,
          message: copy.notEnoughLetters(previous.wordLength)
        };
      }

      const feedback = computeWordleFeedback(guess, previous.targetWord);
      if (feedback.length !== previous.wordLength) {
        return {
          ...previous,
          message: copy.notEnoughLetters(previous.wordLength)
        };
      }

      const nextGuesses = [...previous.guesses, { guess, feedback }];
      const won = guess === previous.targetWord;
      const lost = !won && nextGuesses.length >= previous.maxAttempts;

      return {
        ...previous,
        guesses: nextGuesses,
        currentInput: "",
        keyboardState: mergeWordleKeyboardState(previous.keyboardState, guess, feedback),
        status: won ? "won" : lost ? "lost" : "playing",
        message: won
          ? copy.solved(previous.targetWord)
          : lost
            ? copy.failed(previous.targetWord)
            : copy.guessStored
      };
    });
  }, [copy]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key;
      if (/^[a-z]$/i.test(key)) {
        event.preventDefault();
        addLetter(key);
        return;
      }

      if (key === "Backspace" || key === "Delete") {
        event.preventDefault();
        clearLetter();
        return;
      }

      if (key === "Enter") {
        event.preventDefault();
        if (state.status === "playing") {
          submitGuess();
        } else {
          restart();
        }
        return;
      }

    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addLetter, clearLetter, restart, state.status, submitGuess]);

  const paddedRows = useMemo(() => {
    const rows = [...state.guesses];
    while (rows.length < state.maxAttempts) {
      rows.push({ guess: "", feedback: [] });
    }
    return rows;
  }, [state.guesses, state.maxAttempts]);

  const boardStyle = useMemo(() => {
    const targetCell = state.maxAttempts > 6 ? 40 : 44;
    const gap = 6;
    const maxWidth = state.wordLength * targetCell + (state.wordLength - 1) * gap;
    return {
      "--wordle-cols": state.wordLength,
      "--wordle-grid-gap": `${gap}px`,
      "--wordle-max-width": `${maxWidth}px`
    };
  }, [state.maxAttempts, state.wordLength]);

  const payloadBuilder = useCallback((snapshot) => ({
    mode: "knowledge-arcade",
    variant: "wordle",
    coordinates: "grid_row_col_origin_top_left",
    locale,
    lexicon: KNOWLEDGE_WORD_LEXICON_META,
    match: {
      current: snapshot.matchId + 1,
      total: KNOWLEDGE_WORD_TARGET_COUNT
    },
    status: snapshot.status,
    wordLength: snapshot.wordLength,
    attempts: {
      used: snapshot.guesses.length,
      max: snapshot.maxAttempts,
      remaining: Math.max(0, snapshot.maxAttempts - snapshot.guesses.length)
    },
    clue: snapshot.clue,
    guesses: snapshot.guesses,
    currentInput: snapshot.currentInput,
    keyboardState: snapshot.keyboardState,
    message: snapshot.message,
    solution: snapshot.status === "playing" ? null : snapshot.targetWord
  }), [locale]);

  const advanceTime = useCallback(() => undefined, []);
  useGameRuntimeBridge(state, payloadBuilder, advanceTime);

  return (
    <div
      className={[
        "mini-game",
        "knowledge-game",
        "knowledge-arcade-game",
        "knowledge-wordle",
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
          viewport.isMobile ? "knowledge-mobile-shell" : ""
        ].filter(Boolean).join(" ")}
      >
        <div className="knowledge-status-row">
          <span>{copy.match}: {state.matchId + 1}/{KNOWLEDGE_WORD_TARGET_COUNT}</span>
          <span>{copy.length}: {state.wordLength}</span>
          <span>{copy.attempts}: {state.guesses.length}/{state.maxAttempts}</span>
          <span>{copy.status}: {statusLabel}</span>
        </div>

        <p className="wordle-help">{copy.typeHint}</p>
        <p className="wordle-clue"><strong>{copy.clue}:</strong> {state.clue}</p>
        {state.status === "lost" ? (
          <p className="wordle-solution">
            <strong>{copy.solution}:</strong> {state.targetWord}
          </p>
        ) : null}

        <div className="wordle-grid" style={boardStyle}>
          {paddedRows.map((row, rowIndex) => {
            const activeRow = rowIndex === state.guesses.length && state.status === "playing";
            const letters = activeRow ? state.currentInput.split("") : row.guess.split("");

            return Array.from({ length: state.wordLength }, (_, colIndex) => {
              const letter = letters[colIndex] || "";
              const feedback = row.feedback[colIndex] || "";
              const className = [
                "wordle-cell",
                feedback,
                activeRow ? "active-row" : "",
                letter ? "filled" : ""
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <span key={`${rowIndex}-${colIndex}`} className={className}>
                  {letter || " "}
                </span>
              );
            });
          })}
        </div>

        <div className="wordle-toolbar">
          <label>
            {copy.inputLabel}
            <input value={state.currentInput} readOnly aria-readonly="true" />
          </label>
          <div className="wordle-actions">
            <button
              type="button"
              className="knowledge-ui-btn knowledge-ui-btn-secondary"
              onClick={clearLetter}
              disabled={!state.currentInput.length || state.status !== "playing"}
            >
              {copy.clear}
            </button>
            <button
              type="button"
              className="knowledge-ui-btn knowledge-ui-btn-accent"
              onClick={submitGuess}
              disabled={state.status !== "playing"}
            >
              {copy.submit}
            </button>
          </div>
        </div>

        <div className="wordle-keyboard">
          {KEYBOARD_ROWS.map((row) => (
            <div key={row} className="wordle-keyboard-row">
              {row.split("").map((letter) => (
                <button
                  key={letter}
                  type="button"
                  className={`wordle-key ${state.keyboardState[letter] || ""}`.trim()}
                  onClick={() => addLetter(letter)}
                  disabled={state.status !== "playing"}
                >
                  {letter}
                </button>
              ))}
            </div>
          ))}
        </div>

        <ul className="wordle-legend">
          <li><span className="wordle-dot correct" />{copy.legendCorrect}</li>
          <li><span className="wordle-dot present" />{copy.legendPresent}</li>
          <li><span className="wordle-dot absent" />{copy.legendAbsent}</li>
        </ul>
      </section>

      <p className="game-message">{state.message}</p>
    </div>
  );
}

export default WordleKnowledgeGame;
