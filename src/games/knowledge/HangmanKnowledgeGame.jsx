import React, { useCallback, useEffect, useMemo, useState } from "react";
import useMobileGameViewport from "../../mobile/useMobileGameViewport";
import useGameRuntimeBridge from "../../utils/useGameRuntimeBridge";
import {
  KNOWLEDGE_ARCADE_MATCH_COUNT,
  getRandomKnowledgeMatchId,
  getRandomKnowledgeMatchIdExcept,
  resolveKnowledgeArcadeLocale
} from "./knowledgeArcadeUtils";
import { getHangmanEntry } from "./hangmanWordBank";

const MAX_ERRORS = 6;

const COPY_BY_LOCALE = {
  es: {
    title: "Ahorcado Flash",
    subtitle: "Adivina la palabra antes de quedarte sin intentos.",
    restart: "Partida aleatoria",
    attempts: "Intentos",
    wrong: "Fallos",
    status: "Estado",
    statusPlaying: "En curso",
    statusWon: "Ganada",
    statusLost: "Perdida",
    clue: "Pista",
    noWrong: "Sin fallos",
    match: "Partida",
    startMessage: "Escribe letras para adivinar la palabra.",
    alreadyTried: (letter) => `La letra ${letter} ya fue probada.`,
    correct: (letter) => `Letra ${letter} correcta.`,
    solved: (word) => `Palabra resuelta: ${word}.`,
    wrongLetter: (letter) => `Letra ${letter} incorrecta.`,
    lost: (word) => `Sin intentos. Palabra: ${word}.`,
    currentWordLabel: (maskedWord) => `Palabra actual: ${maskedWord}`
  },
  en: {
    title: "Hangman Flash",
    subtitle: "Guess the word before you run out of attempts.",
    restart: "Random match",
    attempts: "Attempts",
    wrong: "Wrong",
    status: "Status",
    statusPlaying: "In progress",
    statusWon: "Won",
    statusLost: "Lost",
    clue: "Clue",
    noWrong: "No mistakes",
    match: "Match",
    startMessage: "Type letters to guess the word.",
    alreadyTried: (letter) => `Letter ${letter} was already tried.`,
    correct: (letter) => `Letter ${letter} is correct.`,
    solved: (word) => `Word solved: ${word}.`,
    wrongLetter: (letter) => `Letter ${letter} is wrong.`,
    lost: (word) => `No attempts left. Word: ${word}.`,
    currentWordLabel: (maskedWord) => `Current word: ${maskedWord}`
  }
};

const normalizeLetter = (value) => value.trim().toUpperCase().slice(0, 1);

const createGeneratedWord = (matchId, locale) => {
  const safeId = Math.abs(Number(matchId) || 0) % KNOWLEDGE_ARCADE_MATCH_COUNT;
  return getHangmanEntry(safeId, locale);
};

const createInitialState = (matchId, locale, copy) => {
  const generated = createGeneratedWord(matchId, locale);
  return {
    matchId,
    word: generated.word,
    clue: generated.clue,
    guessedLetters: [],
    wrongLetters: [],
    attemptsLeft: MAX_ERRORS,
    status: "playing",
    message: copy.startMessage
  };
};

function HangmanKnowledgeGame() {
  const locale = useMemo(resolveKnowledgeArcadeLocale, []);
  const copy = useMemo(() => COPY_BY_LOCALE[locale] ?? COPY_BY_LOCALE.en, [locale]);
  const viewport = useMobileGameViewport();
  const [state, setState] = useState(() =>
    createInitialState(getRandomKnowledgeMatchId(), locale, copy)
  );

  const wrongCount = MAX_ERRORS - state.attemptsLeft;

  const guessLetter = useCallback((letter) => {
    setState((previous) => {
      if (previous.status !== "playing") {
        return previous;
      }
      const safeLetter = normalizeLetter(letter);
      if (!/^[A-Z]$/.test(safeLetter)) {
        return previous;
      }
      if (previous.guessedLetters.includes(safeLetter) || previous.wrongLetters.includes(safeLetter)) {
        return {
          ...previous,
          message: copy.alreadyTried(safeLetter)
        };
      }

      if (previous.word.includes(safeLetter)) {
        const nextGuessed = [...previous.guessedLetters, safeLetter];
        const solved = [...new Set(previous.word.split(""))].every((value) => nextGuessed.includes(value));
        return {
          ...previous,
          guessedLetters: nextGuessed,
          status: solved ? "won" : "playing",
          message: solved ? copy.solved(previous.word) : copy.correct(safeLetter)
        };
      }

      const nextAttempts = previous.attemptsLeft - 1;
      const lost = nextAttempts <= 0;
      return {
        ...previous,
        wrongLetters: [...previous.wrongLetters, safeLetter],
        attemptsLeft: Math.max(0, nextAttempts),
        status: lost ? "lost" : "playing",
        message: lost ? copy.lost(previous.word) : copy.wrongLetter(safeLetter)
      };
    });
  }, [copy]);

  const restart = useCallback(() => {
    setState((previous) =>
      createInitialState(getRandomKnowledgeMatchIdExcept(previous.matchId), locale, copy)
    );
  }, [copy, locale]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key;
      if (/^[a-z]$/i.test(key)) {
        guessLetter(key);
        return;
      }
      if (key === "Enter" && state.status !== "playing") {
        restart();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [guessLetter, restart, state.status]);

  const maskedWord = useMemo(
    () =>
      state.word
        .split("")
        .map((letter) => (state.guessedLetters.includes(letter) ? letter : "_"))
        .join(" "),
    [state.guessedLetters, state.word]
  );

  const maskedTokens = useMemo(
    () =>
      state.word.split("").map((letter) => ({
        letter,
        revealed: state.guessedLetters.includes(letter)
      })),
    [state.guessedLetters, state.word]
  );

  const usedLetters = useMemo(
    () => new Set([...state.guessedLetters, ...state.wrongLetters]),
    [state.guessedLetters, state.wrongLetters]
  );

  const statusLabel = state.status === "won"
    ? copy.statusWon
    : state.status === "lost"
      ? copy.statusLost
      : copy.statusPlaying;

  const payloadBuilder = useCallback((snapshot) => ({
    mode: "knowledge-arcade",
    variant: "ahorcado",
    coordinates: "ui_linear",
    locale,
    match: {
      current: snapshot.matchId + 1,
      total: KNOWLEDGE_ARCADE_MATCH_COUNT
    },
    status: snapshot.status,
    attemptsLeft: snapshot.attemptsLeft,
    guessedLetters: snapshot.guessedLetters,
    wrongLetters: snapshot.wrongLetters,
    clue: snapshot.clue,
    maskedWord: snapshot.word
      .split("")
      .map((letter) => (snapshot.guessedLetters.includes(letter) ? letter : "_"))
      .join(""),
    message: snapshot.message
  }), [locale]);

  const advanceTime = useCallback(() => undefined, []);
  useGameRuntimeBridge(state, payloadBuilder, advanceTime);

  return (
    <div
      className={[
        "mini-game",
        "knowledge-game",
        "knowledge-arcade-game",
        "knowledge-ahorcado",
        viewport.isMobile ? "is-mobile" : "",
        viewport.isMobile ? `is-mobile-${viewport.orientation}` : ""
      ].filter(Boolean).join(" ")}
    >
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <button type="button" onClick={restart}>{copy.restart}</button>
      </div>

      <section
        className={[
          "knowledge-mode-shell",
          viewport.isMobile ? "knowledge-mobile-shell" : ""
        ].filter(Boolean).join(" ")}
      >
        <div className="knowledge-status-row">
          <span>{copy.match}: {state.matchId + 1}/{KNOWLEDGE_ARCADE_MATCH_COUNT}</span>
          <span>{copy.attempts}: {state.attemptsLeft}</span>
          <span>{copy.wrong}: {state.wrongLetters.join(" ") || "-"}</span>
          <span>{copy.status}: {statusLabel}</span>
        </div>

        <div className="hangman-stage">
          <div className="hangman-gallows" aria-hidden="true">
            <span className="gallows-base" />
            <span className="gallows-post" />
            <span className="gallows-arm" />
            <span className="gallows-rope" />

            <span className={`hangman-draw head ${wrongCount >= 1 ? "active" : ""}`.trim()} />
            <span className={`hangman-draw torso ${wrongCount >= 2 ? "active" : ""}`.trim()} />
            <span className={`hangman-draw arm-left ${wrongCount >= 3 ? "active" : ""}`.trim()} />
            <span className={`hangman-draw arm-right ${wrongCount >= 4 ? "active" : ""}`.trim()} />
            <span className={`hangman-draw leg-left ${wrongCount >= 5 ? "active" : ""}`.trim()} />
            <span className={`hangman-draw leg-right ${wrongCount >= 6 ? "active" : ""}`.trim()} />
          </div>

          <ol className="hangman-fails" aria-label={copy.wrong}>
            {state.wrongLetters.map((letter) => (
              <li key={letter}>{letter}</li>
            ))}
            {!state.wrongLetters.length ? <li className="placeholder">{copy.noWrong}</li> : null}
          </ol>
        </div>

        <p className="hangman-word" aria-label={copy.currentWordLabel(maskedWord)}>
          {maskedTokens.map((token, index) => (
            <span key={`${token.letter}-${index}`} className={token.revealed ? "revealed" : "hidden"}>
              {token.revealed ? token.letter : "_"}
            </span>
          ))}
        </p>
        <p className="hangman-clue">{copy.clue}: {state.clue}</p>

        <div className="hangman-keyboard">
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
            <button
              key={letter}
              type="button"
              disabled={usedLetters.has(letter) || state.status !== "playing"}
              onClick={() => guessLetter(letter)}
            >
              {letter}
            </button>
          ))}
        </div>
      </section>

      <p className="game-message">{state.message}</p>
    </div>
  );
}

export default HangmanKnowledgeGame;
