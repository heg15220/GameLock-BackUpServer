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
  createDeterministicAnagram,
  getKnowledgeWordEntry,
  hasSameLetters,
  normalizeKnowledgeGuess
} from "./knowledgeWordLexicon";

const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

const COPY_BY_LOCALE = {
  es: {
    title: "Anagramas Pro",
    subtitle: "Reordena letras para descubrir la palabra objetivo. Banco real de 10.000 palabras ES/EN.",
    restart: "Partida aleatoria",
    reshuffle: "Mezclar letras",
    match: "Partida",
    length: "Longitud",
    attempts: "Intentos",
    status: "Estado",
    statusPlaying: "En curso",
    statusWon: "Resuelta",
    statusLost: "Fallida",
    clue: "Pista",
    typeHint: "Escribe con las mismas letras, Enter valida, Backspace borra, M mezcla y usa el boton para cambiar de partida.",
    startMessage: (length) => `Forma una palabra valida de ${length} letras usando todas las letras dadas.`,
    notEnoughLetters: (length) => `Necesitas ${length} letras para validar.`,
    tooManyLetters: (length) => `Solo se permiten ${length} letras en esta partida.`,
    wrongComposition: "Esa propuesta no usa exactamente las mismas letras.",
    solved: (word) => `Correcto: ${word} es la solucion.`,
    failed: (word) => `Sin intentos. La solucion era ${word}.`,
    validButNotTarget: "Anagrama valido, pero no es la palabra objetivo.",
    solution: "Respuesta correcta",
    letterAdded: (letter) => `Letra ${letter} anadida.`,
    letterDeleted: "Ultima letra borrada.",
    shuffled: "Letras reordenadas.",
    inputLabel: "Entrada actual",
    submit: "Validar",
    clear: "Borrar",
    guesses: "Intentos registrados",
    guessExact: "Objetivo",
    guessNear: "Anagrama",
    guessInvalid: "Invalido"
  },
  en: {
    title: "Anagrams Pro",
    subtitle: "Reorder letters to discover the target word. Real 10,000-word ES/EN bank.",
    restart: "Random match",
    reshuffle: "Shuffle letters",
    match: "Match",
    length: "Length",
    attempts: "Attempts",
    status: "Status",
    statusPlaying: "In progress",
    statusWon: "Solved",
    statusLost: "Failed",
    clue: "Clue",
    typeHint: "Type with the same letters, Enter submits, Backspace deletes, M shuffles, and use the random button to change match.",
    startMessage: (length) => `Build a valid ${length}-letter word using all provided letters.`,
    notEnoughLetters: (length) => `You need ${length} letters before submitting.`,
    tooManyLetters: (length) => `Only ${length} letters are allowed in this match.`,
    wrongComposition: "That guess does not use exactly the same letters.",
    solved: (word) => `Correct: ${word} is the target.`,
    failed: (word) => `No attempts left. The solution was ${word}.`,
    validButNotTarget: "Valid anagram, but not the target word.",
    solution: "Correct answer",
    letterAdded: (letter) => `Letter ${letter} added.`,
    letterDeleted: "Last letter deleted.",
    shuffled: "Letters shuffled.",
    inputLabel: "Current input",
    submit: "Submit",
    clear: "Delete",
    guesses: "Submitted guesses",
    guessExact: "Exact",
    guessNear: "Anagram",
    guessInvalid: "Invalid"
  }
};

const normalizeSingleLetter = (value) => normalizeKnowledgeGuess(value).slice(0, 1);

const resolveMaxAttempts = (wordLength) => {
  if (wordLength <= 6) return 4;
  if (wordLength <= 8) return 5;
  return 6;
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

const buildScrambledWord = (targetWord, seed, previous = "") => {
  for (let offset = 0; offset < 8; offset += 1) {
    const candidate = createDeterministicAnagram(targetWord, seed + offset * 131);
    if (candidate && candidate !== previous) {
      return candidate;
    }
  }
  return createDeterministicAnagram(targetWord, seed);
};

const createInitialState = (matchId, entry, copy) => {
  return {
    matchId,
    targetWord: entry.word,
    clue: entry.clue,
    wordLength: entry.length,
    maxAttempts: resolveMaxAttempts(entry.length),
    guesses: [],
    currentInput: "",
    status: "playing",
    reshuffles: 0,
    scrambledWord: buildScrambledWord(entry.word, matchId + 37),
    message: copy.startMessage(entry.length)
  };
};

function AnagramsKnowledgeGame() {
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
    return getKnowledgeWordEntry(locale, matchId).then((entry) => {
      setState(createInitialState(matchId, entry, copy));
      setIsLoading(false);
    });
  }, [copy, locale]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setState(null);
    getKnowledgeWordEntry(locale, initialMatchId).then((entry) => {
      if (cancelled) return;
      setState(createInitialState(initialMatchId, entry, copy));
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [copy, initialMatchId, locale]);

  const statusLabel = state?.status === "won"
    ? copy.statusWon
    : state?.status === "lost"
      ? copy.statusLost
      : copy.statusPlaying;

  const restart = useCallback(() => {
    const currentMatchId = state?.matchId ?? initialMatchId;
    void loadMatch(getRandomKnowledgeMatchIdExcept(currentMatchId));
  }, [initialMatchId, loadMatch, state]);

  const reshuffle = useCallback(() => {
    setState((previous) => {
      if (previous.status !== "playing") {
        return previous;
      }
      const nextReshuffles = previous.reshuffles + 1;
      return {
        ...previous,
        reshuffles: nextReshuffles,
        scrambledWord: buildScrambledWord(
          previous.targetWord,
          previous.matchId + nextReshuffles * 97 + 37,
          previous.scrambledWord
        ),
        message: copy.shuffled
      };
    });
  }, [copy.shuffled]);

  const addLetter = useCallback((letterValue) => {
    const letter = normalizeSingleLetter(letterValue);
    if (!/^[A-Z]$/.test(letter)) {
      return;
    }

    setState((previous) => {
      if (previous.status !== "playing") {
        return previous;
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

      if (!hasSameLetters(guess, previous.targetWord)) {
        const nextGuesses = [...previous.guesses, { guess, exact: false, valid: false }];
        const lost = nextGuesses.length >= previous.maxAttempts;
        return {
          ...previous,
          guesses: nextGuesses,
          currentInput: "",
          status: lost ? "lost" : "playing",
          message: lost ? copy.failed(previous.targetWord) : copy.wrongComposition
        };
      }

      const nextGuesses = [...previous.guesses, {
        guess,
        exact: guess === previous.targetWord,
        valid: true
      }];

      const won = guess === previous.targetWord;
      const lost = !won && nextGuesses.length >= previous.maxAttempts;

      return {
        ...previous,
        guesses: nextGuesses,
        currentInput: "",
        status: won ? "won" : lost ? "lost" : "playing",
        message: won
          ? copy.solved(previous.targetWord)
          : lost
            ? copy.failed(previous.targetWord)
            : copy.validButNotTarget
      };
    });
  }, [copy]);

  useEffect(() => {
    if (!state) {
      return undefined;
    }
    const onKeyDown = (event) => {
      const key = event.key;
      if (key.toLowerCase() === "m" || key === " ") {
        event.preventDefault();
        reshuffle();
        return;
      }

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
  }, [addLetter, clearLetter, reshuffle, restart, state?.status, submitGuess]);

  const payloadBuilder = useCallback((snapshot) => {
    if (!snapshot) {
      return {
        mode: "knowledge-arcade",
        variant: "anagramas",
        coordinates: "ui_linear",
        locale,
        lexicon: KNOWLEDGE_WORD_LEXICON_META,
        loading: true,
        status: "loading",
        message: copy.startMessage(0)
      };
    }
    return {
      mode: "knowledge-arcade",
      variant: "anagramas",
      coordinates: "ui_linear",
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
      scrambledWord: snapshot.scrambledWord,
      guesses: snapshot.guesses,
      currentInput: snapshot.currentInput,
      reshuffles: snapshot.reshuffles,
      message: snapshot.message,
      solution: snapshot.status === "playing" ? null : snapshot.targetWord
    };
  }, [copy, locale]);

  const advanceTime = useCallback(() => undefined, []);
  useGameRuntimeBridge(state, payloadBuilder, advanceTime);

  if (!state || isLoading) {
    return (
      <div
        className={[
          "mini-game",
          "knowledge-game",
          "knowledge-arcade-game",
          "knowledge-anagramas",
          viewport.isMobile ? "is-mobile" : "",
          viewport.isMobile ? `is-mobile-${viewport.orientation}` : ""
        ].filter(Boolean).join(" ")}
      >
        <div className="mini-head">
          <div>
            <h4>{copy.title}</h4>
            <p>{copy.subtitle}</p>
          </div>
        </div>

        <section
          className={[
            "knowledge-mode-shell",
            viewport.isMobile ? "knowledge-mobile-shell" : ""
          ].filter(Boolean).join(" ")}
        >
          <p className="anagram-help">{copy.typeHint}</p>
          <p className="game-message">{copy.startMessage(5)}</p>
        </section>
      </div>
    );
  }

  return (
    <div
      className={[
        "mini-game",
        "knowledge-game",
        "knowledge-arcade-game",
        "knowledge-anagramas",
        viewport.isMobile ? "is-mobile" : "",
        viewport.isMobile ? `is-mobile-${viewport.orientation}` : ""
      ].filter(Boolean).join(" ")}
    >
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="anagram-head-actions">
          <button
            type="button"
            className="knowledge-ui-btn knowledge-ui-btn-secondary"
            onClick={reshuffle}
            disabled={state.status !== "playing"}
          >
            {copy.reshuffle}
          </button>
          <button
            type="button"
            className="knowledge-ui-btn knowledge-ui-btn-primary"
            onClick={restart}
          >
            {copy.restart}
          </button>
        </div>
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

        <p className="anagram-help">{copy.typeHint}</p>
        <p className="anagram-clue"><strong>{copy.clue}:</strong> {state.clue}</p>
        {state.status === "lost" ? (
          <p className="anagram-solution">
            <strong>{copy.solution}:</strong> {state.targetWord}
          </p>
        ) : null}

        <div className="anagram-tiles" aria-label="Scrambled letters">
          {state.scrambledWord.split("").map((letter, index) => (
            <span key={`${letter}-${index}`} className="anagram-tile">{letter}</span>
          ))}
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
                  className="wordle-key anagram-key"
                  onClick={() => addLetter(letter)}
                  disabled={state.status !== "playing"}
                >
                  {letter}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="anagram-guess-list">
          <h5>{copy.guesses}</h5>
          <ul>
            {state.guesses.map((item, index) => (
              <li
                key={`${item.guess}-${index}`}
                className={item.exact ? "exact" : item.valid ? "near" : "invalid"}
              >
                <span>{item.guess}</span>
                <strong>{item.exact ? copy.guessExact : item.valid ? copy.guessNear : copy.guessInvalid}</strong>
              </li>
            ))}
            {!state.guesses.length ? <li className="empty">-</li> : null}
          </ul>
        </div>
      </section>

      <p className="game-message">{state.message}</p>
    </div>
  );
}

export default AnagramsKnowledgeGame;
