import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useMobileGameViewport from "../../mobile/useMobileGameViewport";
import useGameRuntimeBridge from "../../utils/useGameRuntimeBridge";
import {
  blurVirtualKeyboardOnEnter,
  resolveKnowledgeArcadeLocale
} from "./knowledgeArcadeUtils";
import {
  CROSSWORD_MATCH_COUNT,
  buildWordMaps,
  createCrosswordMatch,
  createEntries,
  evaluateWordFeedback,
  findFirstCell,
  getRandomCrosswordMatchId,
  getRandomCrosswordMatchIdExcept,
  getWordKeysForCell,
  isBlocked,
  isComplete,
  isSolved,
  keyForCell,
  moveSelection,
  nextCellInRow
} from "./crosswordGenerator";

const hashText = (text) => {
  let hash = 2166136261;
  const source = String(text || "");
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const pickByWord = (word, options) => {
  if (!Array.isArray(options) || options.length === 0) return "";
  return options[hashText(word) % options.length];
};

const stripMojibake = (value) => String(value || "")
  .replace(/Â/g, "")
  .replace(/Ã¡/g, "a")
  .replace(/Ã©/g, "e")
  .replace(/Ã­/g, "i")
  .replace(/Ã³/g, "o")
  .replace(/Ãº/g, "u")
  .replace(/Ã±/g, "n")
  .replace(/Ã¼/g, "u")
  .replace(/Ã/g, "");

const normalizeAscii = (value) => stripMojibake(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ")
  .trim();

const ensureSentence = (value, fallback) => {
  const safe = String(value || "").replace(/\s+/g, " ").trim() || fallback;
  const first = safe.charAt(0).toUpperCase();
  const tail = safe.slice(1);
  const sentence = `${first}${tail}`;
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
};

const detectPosHint = (rawClue, locale) => {
  const clue = normalizeAscii(rawClue).toLowerCase();
  if (!clue) return "generic";

  if (locale === "es") {
    if (clue.startsWith("adjetivo")) return "adjective";
    if (clue.startsWith("verbo") || clue.startsWith("accion")) return "verb";
    if (clue.startsWith("adverbio")) return "adverb";
    if (clue.startsWith("sustantivo")) return "noun";
    return "generic";
  }

  if (clue.startsWith("adjective")) return "adjective";
  if (clue.startsWith("verb") || clue.startsWith("action")) return "verb";
  if (clue.startsWith("adverb")) return "adverb";
  if (clue.startsWith("noun")) return "noun";
  return "generic";
};

const extractAnchor = (rawClue) => {
  const normalized = normalizeAscii(rawClue);
  if (!normalized) return "";

  const quoted = normalized.match(/"([^"]+)"/);
  if (quoted?.[1]) {
    return quoted[1].trim().toLowerCase();
  }

  const tail = normalized.match(/\b(?:de|del|about|for|of)\s+([a-z0-9\s-]+)[.!?]?$/i);
  if (tail?.[1]) {
    return tail[1]
      .trim()
      .toLowerCase()
      .replace(/^(el|la|los|las|un|una|the|a|an)\s+/i, "");
  }

  return "";
};

const inferAnchorType = (anchor, locale) => {
  const safe = normalizeAscii(anchor).toLowerCase();
  if (!safe) return "generic";

  if (locale === "es") {
    if (/(ar|er|ir)$/.test(safe)) return "verb";
    if (/mente$/.test(safe)) return "adverb";
    return "noun";
  }

  if (/(ate|ify|ise|ize|ing)$/.test(safe)) return "verb";
  if (/ly$/.test(safe)) return "adverb";
  return "noun";
};

const resolveDefinitionType = (posHint, anchorType) => (
  posHint !== "generic" ? posHint : anchorType
);

const buildSpanishDefinitionClue = ({ word, anchor, type }) => {
  const safeAnchor = normalizeAscii(anchor).toLowerCase();
  if (!safeAnchor) {
    const generic = pickByWord(word, [
      `Entrada del espanol de ${word.length} letras`,
      `Vocablo de uso comun con ${word.length} letras`,
      `Definicion breve de una palabra de ${word.length} letras`
    ]);
    return ensureSentence(generic, `Entrada del espanol de ${word.length} letras.`);
  }

  if (type === "verb") {
    const sentence = pickByWord(word, [
      `Accion de ${safeAnchor}`,
      `Proceso que implica ${safeAnchor}`,
      `Acto expresado como ${safeAnchor}`
    ]);
    return ensureSentence(sentence, `Accion de ${safeAnchor}.`);
  }

  if (type === "adjective") {
    const sentence = pickByWord(word, [
      `Que presenta rasgos de ${safeAnchor}`,
      `Cualidad cercana a ${safeAnchor}`,
      `Describe algo con caracter ${safeAnchor}`
    ]);
    return ensureSentence(sentence, `Que presenta rasgos de ${safeAnchor}.`);
  }

  if (type === "adverb") {
    const sentence = pickByWord(word, [
      `De manera ${safeAnchor}`,
      `Modo vinculado con ${safeAnchor}`,
      `Forma de actuar relacionada con ${safeAnchor}`
    ]);
    return ensureSentence(sentence, `De manera ${safeAnchor}.`);
  }

  if (type === "noun") {
    const sentence = pickByWord(word, [
      `Nombre usado para ${safeAnchor}`,
      `Concepto del vocabulario comun sobre ${safeAnchor}`,
      `Elemento de uso comun relacionado con ${safeAnchor}`
    ]);
    return ensureSentence(sentence, `Nombre usado para ${safeAnchor}.`);
  }

  const sentence = pickByWord(word, [
    `Definicion breve vinculada con ${safeAnchor}`,
    `Idea del vocabulario comun sobre ${safeAnchor}`,
    `Significado relacionado con ${safeAnchor}`
  ]);
  return ensureSentence(sentence, `Definicion breve vinculada con ${safeAnchor}.`);
};

const buildEnglishDefinitionClue = ({ word, anchor, type }) => {
  const safeAnchor = normalizeAscii(anchor).toLowerCase();
  if (!safeAnchor) {
    const generic = pickByWord(word, [
      `Common entry with ${word.length} letters`,
      `Short definition for a ${word.length} letter word`,
      `General vocabulary item of ${word.length} letters`
    ]);
    return ensureSentence(generic, `Common entry with ${word.length} letters.`);
  }

  if (type === "verb") {
    const sentence = pickByWord(word, [
      `Action of ${safeAnchor}`,
      `Process involving ${safeAnchor}`,
      `Act expressed as ${safeAnchor}`
    ]);
    return ensureSentence(sentence, `Action of ${safeAnchor}.`);
  }

  if (type === "adjective") {
    const sentence = pickByWord(word, [
      `Having a quality close to ${safeAnchor}`,
      `Describes something with a ${safeAnchor} trait`,
      `Quality related to ${safeAnchor}`
    ]);
    return ensureSentence(sentence, `Having a quality close to ${safeAnchor}.`);
  }

  if (type === "adverb") {
    const sentence = pickByWord(word, [
      `In a ${safeAnchor} manner`,
      `Manner linked to ${safeAnchor}`,
      `Way of acting related to ${safeAnchor}`
    ]);
    return ensureSentence(sentence, `In a ${safeAnchor} manner.`);
  }

  if (type === "noun") {
    const sentence = pickByWord(word, [
      `Name used for ${safeAnchor}`,
      `Common concept about ${safeAnchor}`,
      `General vocabulary item related to ${safeAnchor}`
    ]);
    return ensureSentence(sentence, `Name used for ${safeAnchor}.`);
  }

  const sentence = pickByWord(word, [
    `Short definition linked to ${safeAnchor}`,
    `General meaning connected with ${safeAnchor}`,
    `Vocabulary idea about ${safeAnchor}`
  ]);
  return ensureSentence(sentence, `Short definition linked to ${safeAnchor}.`);
};

const rewriteCrosswordClue = (meta, locale) => {
  const fallback = locale === "es"
    ? "Definicion breve del termino."
    : "Short definition of the term.";
  const fromBank = String(meta?.clue || "").trim();
  return fromBank || fallback;
};

const formatClueStart = (start, locale) => {
  const row = Number.isFinite(start?.row) ? start.row + 1 : 1;
  const col = Number.isFinite(start?.col) ? start.col + 1 : 1;
  if (locale === "es") {
    return `(fila ${row}, columna ${col})`;
  }
  return `(row ${row}, column ${col})`;
};

const COPY_BY_LOCALE = {
  es: {
    title: "Crucigrama Dinamico",
    subtitle: "Rellena la rejilla 15x15 usando pistas horizontales y verticales.",
    loading: "Cargando crucigrama...",
    loadingTitle: "Runtime y cache bajo demanda",
    loadingBody: "Se esta cargando solo el shard del cache necesario para esta partida.",
    restart: "Partida aleatoria",
    match: "Partida",
    board: "Tablero",
    moves: "Movimientos",
    status: "Estado",
    statusWon: "Resuelto",
    statusRevealed: "Revelado",
    statusPlaying: "En curso",
    clearCell: "Borrar celda",
    check: "Comprobar",
    reveal: "Revelar",
    clues: "Pistas",
    acrossClues: "Horizontales",
    downClues: "Verticales",
    wordsSummary: (acrossCount, downCount) => `H: ${acrossCount} | V: ${downCount}`,
    startMessage: "Rellena la rejilla con las pistas.",
    pendingCells: "Aun quedan celdas por completar.",
    wrongLetters: "Hay letras incorrectas.",
    solved: "Crucigrama completado.",
    revealed: "Has revelado el tablero completo.",
    letterSaved: (letter) => `Letra ${letter} registrada.`,
    cleared: "Celda limpiada.",
    backspace: "Retroceso aplicado.",
    wordCorrect: (count) =>
      count === 1
        ? "La palabra seleccionada es correcta."
        : "Las palabras seleccionadas son correctas.",
    wordWrong: (count) =>
      count === 1
        ? "La palabra seleccionada tiene letras incorrectas."
        : "Hay palabras seleccionadas con letras incorrectas.",
    wordPending: (count) =>
      count === 1
        ? "Completa la palabra seleccionada antes de comprobar."
        : "Completa todas las palabras seleccionadas antes de comprobar.",
    acrossHint: (meta) => rewriteCrosswordClue(meta, "es"),
    downHint: (meta) => rewriteCrosswordClue(meta, "es"),
    acrossClue: (id, text, start) => `#${id} ${formatClueStart(start, "es")}: ${text}`,
    downClue: (id, text, start) => `#${id} ${formatClueStart(start, "es")}: ${text}`
  },
  en: {
    title: "Dynamic Crossword",
    subtitle: "Fill the fixed 15x15 grid using across and down clues.",
    loading: "Loading crossword...",
    loadingTitle: "Runtime and cache on demand",
    loadingBody: "Only the cache shard needed for this match is being loaded.",
    restart: "Random match",
    match: "Match",
    board: "Board",
    moves: "Moves",
    status: "Status",
    statusWon: "Solved",
    statusRevealed: "Revealed",
    statusPlaying: "In progress",
    clearCell: "Clear cell",
    check: "Check",
    reveal: "Reveal",
    clues: "Clues",
    acrossClues: "Across",
    downClues: "Down",
    wordsSummary: (acrossCount, downCount) => `A: ${acrossCount} | D: ${downCount}`,
    startMessage: "Fill the grid with the clues.",
    pendingCells: "There are still empty cells.",
    wrongLetters: "There are incorrect letters.",
    solved: "Crossword solved.",
    revealed: "You revealed the full board.",
    letterSaved: (letter) => `Letter ${letter} saved.`,
    cleared: "Cell cleared.",
    backspace: "Backspace applied.",
    wordCorrect: (count) =>
      count === 1
        ? "The selected word is correct."
        : "The selected words are correct.",
    wordWrong: (count) =>
      count === 1
        ? "The selected word has incorrect letters."
        : "Some selected words have incorrect letters.",
    wordPending: (count) =>
      count === 1
        ? "Complete the selected word before checking."
        : "Complete all selected words before checking.",
    acrossHint: (meta) => rewriteCrosswordClue(meta, "en"),
    downHint: (meta) => rewriteCrosswordClue(meta, "en"),
    acrossClue: (id, text, start) => `#${id} ${formatClueStart(start, "en")}: ${text}`,
    downClue: (id, text, start) => `#${id} ${formatClueStart(start, "en")}: ${text}`
  }
};

const normalizeLetter = (value) => value.trim().toUpperCase().slice(0, 1);

const filterWordKeysByDirection = (wordKeys, direction) =>
  (wordKeys || []).filter((wordKey) => wordKey.startsWith(`${direction}-`));

const resolveDirectionalWordKeys = (cellWordMap, row, col, direction) => {
  const wordKeys = getWordKeysForCell(cellWordMap, row, col);
  const directional = filterWordKeysByDirection(wordKeys, direction);
  if (directional.length) return directional;
  if (wordKeys.length) return [wordKeys[0]];
  return [];
};

const resolveCellDirection = (cellWordMap, row, col, activeDirection, shouldToggle = false) => {
  const wordKeys = getWordKeysForCell(cellWordMap, row, col);
  const hasAcross = filterWordKeysByDirection(wordKeys, "across").length > 0;
  const hasDown = filterWordKeysByDirection(wordKeys, "down").length > 0;

  if (shouldToggle && hasAcross && hasDown) {
    return activeDirection === "down" ? "across" : "down";
  }
  if (activeDirection === "down" && hasDown) return "down";
  if (activeDirection === "across" && hasAcross) return "across";
  if (hasAcross) return "across";
  if (hasDown) return "down";
  return activeDirection;
};

const resolveNextSelection = (solution, selected, direction, step) => {
  if (direction === "down") {
    return moveSelection(solution, selected, step, 0);
  }
  return nextCellInRow(solution, selected, step);
};

const createInitialState = async (matchId, locale, copy) => {
  const crossword = await createCrosswordMatch(matchId, locale, copy);
  const { wordByKey, cellWordMap } = buildWordMaps(crossword.clues);
  return {
    matchId,
    puzzleKey: crossword.puzzleKey,
    solution: crossword.solution,
    clues: crossword.clues,
    cellNumbers: crossword.cellNumbers,
    grid: crossword.grid,
    entries: createEntries(crossword.solution),
    selected: findFirstCell(crossword.solution),
    moves: 0,
    status: "playing",
    message: copy.startMessage,
    activeDirection: "across",
    wordByKey,
    cellWordMap,
    wordFeedback: {},
    cellFeedback: {},
    feedbackToken: 0
  };
};

const allWordKeys = (snapshot) => Object.keys(snapshot.wordByKey);

function CrosswordRuntimeLoading({ copy }) {
  return (
    <div className="mini-game knowledge-game knowledge-arcade-game knowledge-crucigrama">
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="crossword-head-actions">
          <button type="button" disabled>{copy.loading ?? "Loading crossword..."}</button>
        </div>
      </div>
      <section className="knowledge-mode-shell">
        <div className="phaser-canvas-shell" style={{ minHeight: 520, display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ maxWidth: 560, textAlign: "center" }}>
            <strong>{copy.loadingTitle ?? copy.title}</strong>
            <p>{copy.loadingBody ?? copy.subtitle}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function CrosswordKnowledgeGameRuntimeLoaded({
  copy,
  locale,
  viewport,
  initialState,
  requestRestart
}) {
  const mobileInputRef = useRef(null);
  const [state, setState] = useState(initialState);

  useEffect(() => {
    setState(initialState);
  }, [initialState]);

  const selectedWordKeys = useMemo(() => (
    new Set(
      resolveDirectionalWordKeys(
        state.cellWordMap,
        state.selected.row,
        state.selected.col,
        state.activeDirection
      )
    )
  ), [state.activeDirection, state.cellWordMap, state.selected.col, state.selected.row]);

  const acrossClues = useMemo(() => (
    [...(state.clues.across || [])]
      .sort((left, right) => left.id - right.id || left.key.localeCompare(right.key))
  ), [state.clues.across]);

  const downClues = useMemo(() => (
    [...(state.clues.down || [])]
      .sort((left, right) => left.id - right.id || left.key.localeCompare(right.key))
  ), [state.clues.down]);

  const cellSize = useMemo(() => {
    const maxSide = Math.max(state.grid.rows, state.grid.cols);
    if (viewport.isMobile) {
      const viewportWidth = Math.max(280, viewport.width || 360);
      const boardWidth = Math.max(228, viewportWidth - 88);
      const dynamicCell = Math.floor((boardWidth - Math.max(0, (maxSide - 1) * 3)) / maxSide);
      if (maxSide <= 5) return Math.min(42, Math.max(34, dynamicCell));
      if (maxSide <= 8) return Math.min(34, Math.max(28, dynamicCell));
      if (maxSide <= 10) return Math.min(30, Math.max(24, dynamicCell));
      if (maxSide <= 12) return Math.min(27, Math.max(22, dynamicCell));
      return Math.min(25, Math.max(20, dynamicCell));
    }
    if (maxSide >= 15) return 34;
    if (maxSide >= 12) return 36;
    if (maxSide <= 5) return 56;
    if (maxSide <= 6) return 52;
    if (maxSide <= 8) return 46;
    if (maxSide <= 10) return 40;
    return 36;
  }, [state.grid.cols, state.grid.rows, viewport.isMobile, viewport.width]);

  const restart = useCallback(() => {
    requestRestart(state.matchId);
  }, [requestRestart, state.matchId]);

  const writeLetter = useCallback((letter) => {
    setState((previous) => {
      if (previous.status !== "playing") return previous;
      const safeLetter = normalizeLetter(letter);
      if (!/^[A-Z]$/.test(safeLetter)) return previous;

      const { row, col } = previous.selected;
      if (isBlocked(previous.solution, row, col)) return previous;

      const nextEntries = previous.entries.map((entryRow) => [...entryRow]);
      nextEntries[row][col] = safeLetter;
      const complete = isComplete(nextEntries);
      const solved = complete && isSolved(nextEntries, previous.solution);

      let message = copy.letterSaved(safeLetter);
      let wordFeedback = {};
      let cellFeedback = {};
      let feedbackToken = previous.feedbackToken;

      const scopedWordKeys = resolveDirectionalWordKeys(
        previous.cellWordMap,
        row,
        col,
        previous.activeDirection
      );
      if (!solved && scopedWordKeys.length) {
        const feedback = evaluateWordFeedback({
          entries: nextEntries,
          solution: previous.solution,
          wordByKey: previous.wordByKey,
          targetWordKeys: scopedWordKeys
        });
        if (feedback.summary.wrong > 0 || feedback.summary.correct > 0) {
          wordFeedback = feedback.wordFeedback;
          cellFeedback = feedback.cellFeedback;
          feedbackToken = 1 - previous.feedbackToken;
          message = feedback.summary.wrong > 0
            ? copy.wordWrong(feedback.summary.wrong)
            : copy.wordCorrect(feedback.summary.correct);
        }
      }

      if (solved) {
        const solvedFeedback = evaluateWordFeedback({
          entries: nextEntries,
          solution: previous.solution,
          wordByKey: previous.wordByKey,
          targetWordKeys: allWordKeys(previous)
        });
        wordFeedback = solvedFeedback.wordFeedback;
        cellFeedback = solvedFeedback.cellFeedback;
        feedbackToken = 1 - previous.feedbackToken;
        message = copy.solved;
      }

      return {
        ...previous,
        entries: nextEntries,
        selected: resolveNextSelection(
          previous.solution,
          previous.selected,
          previous.activeDirection,
          1
        ),
        moves: previous.moves + 1,
        status: solved ? "won" : "playing",
        message,
        wordFeedback,
        cellFeedback,
        feedbackToken
      };
    });
  }, [copy]);

  const clearCell = useCallback(() => {
    setState((previous) => {
      if (previous.status !== "playing") return previous;
      const { row, col } = previous.selected;
      if (isBlocked(previous.solution, row, col)) return previous;

      const nextEntries = previous.entries.map((entryRow) => [...entryRow]);
      if (nextEntries[row][col]) {
        nextEntries[row][col] = "";
        return {
          ...previous,
          entries: nextEntries,
          moves: previous.moves + 1,
          status: "playing",
          message: copy.cleared,
          wordFeedback: {},
          cellFeedback: {}
        };
      }

      const previousCell = resolveNextSelection(
        previous.solution,
        previous.selected,
        previous.activeDirection,
        -1
      );
      if (previousCell.row === row && previousCell.col === col) {
        return previous;
      }
      nextEntries[previousCell.row][previousCell.col] = "";
      return {
        ...previous,
        entries: nextEntries,
        selected: previousCell,
        moves: previous.moves + 1,
        status: "playing",
        message: copy.backspace,
        wordFeedback: {},
        cellFeedback: {}
      };
    });
  }, [copy]);

  const checkNow = useCallback(() => {
    setState((previous) => {
      if (previous.status !== "playing") return previous;
      const complete = isComplete(previous.entries);
      const selectedKeys = resolveDirectionalWordKeys(
        previous.cellWordMap,
        previous.selected.row,
        previous.selected.col,
        previous.activeDirection
      );
      const targetWordKeys = complete
        ? allWordKeys(previous)
        : selectedKeys.length ? selectedKeys : allWordKeys(previous);

      const feedback = evaluateWordFeedback({
        entries: previous.entries,
        solution: previous.solution,
        wordByKey: previous.wordByKey,
        targetWordKeys
      });

      const solved = complete && isSolved(previous.entries, previous.solution);
      let message;
      if (solved) {
        message = copy.solved;
      } else if (complete) {
        message = copy.wrongLetters;
      } else if (feedback.summary.wrong > 0) {
        message = copy.wordWrong(feedback.summary.wrong);
      } else if (feedback.summary.pending > 0) {
        message = copy.wordPending(feedback.summary.pending);
      } else if (feedback.summary.correct > 0) {
        message = copy.wordCorrect(feedback.summary.correct);
      } else {
        message = copy.pendingCells;
      }

      return {
        ...previous,
        status: solved ? "won" : "playing",
        message,
        wordFeedback: feedback.wordFeedback,
        cellFeedback: feedback.cellFeedback,
        feedbackToken: 1 - previous.feedbackToken
      };
    });
  }, [copy]);

  const revealSolution = useCallback(() => {
    setState((previous) => {
      if (previous.status !== "playing") return previous;

      const revealedEntries = previous.solution.map((row) =>
        row.map((cell) => (cell === "#" ? "#" : cell))
      );
      const feedback = evaluateWordFeedback({
        entries: revealedEntries,
        solution: previous.solution,
        wordByKey: previous.wordByKey,
        targetWordKeys: allWordKeys(previous)
      });

      return {
        ...previous,
        entries: revealedEntries,
        status: "revealed",
        message: copy.revealed,
        wordFeedback: feedback.wordFeedback,
        cellFeedback: feedback.cellFeedback,
        feedbackToken: 1 - previous.feedbackToken
      };
    });
  }, [copy]);

  const focusMobileKeyboard = useCallback(() => {
    if (!viewport.isMobile) return;
    const input = mobileInputRef.current;
    if (!input) return;
    input.value = "";
    try {
      input.focus({ preventScroll: true });
    } catch {
      input.focus();
    }
  }, [viewport.isMobile]);

  const selectCell = useCallback((row, col) => {
    setState((previous) => {
      if (isBlocked(previous.solution, row, col)) return previous;
      const shouldToggle =
        previous.selected.row === row &&
        previous.selected.col === col;
      return {
        ...previous,
        selected: { row, col },
        activeDirection: resolveCellDirection(
          previous.cellWordMap,
          row,
          col,
          previous.activeDirection,
          shouldToggle
        )
      };
    });
    focusMobileKeyboard();
  }, [focusMobileKeyboard]);

  const selectClue = useCallback((clue, direction) => {
    if (!clue?.start) return;
    setState((previous) => ({
      ...previous,
      selected: {
        row: clue.start.row,
        col: clue.start.col
      },
      activeDirection: direction
    }));
    focusMobileKeyboard();
  }, [focusMobileKeyboard]);

  const handleClueKeyDown = useCallback((event, clue, direction) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    selectClue(clue, direction);
  }, [selectClue]);

  const handleMobileInputChange = useCallback((event) => {
    const nextLetter = String(event.target.value ?? "").slice(-1);
    if (/^[a-z]$/i.test(nextLetter)) {
      writeLetter(nextLetter);
    }
    event.target.value = "";
  }, [writeLetter]);

  const handleMobileInputKeyDown = useCallback((event) => {
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      clearCell();
      event.currentTarget.value = "";
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      checkNow();
      event.currentTarget.value = "";
      blurVirtualKeyboardOnEnter(event);
    }
  }, [checkNow, clearCell]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key;

      if (key === "ArrowUp") {
        event.preventDefault();
        setState((previous) => ({
          ...previous,
          selected: moveSelection(previous.solution, previous.selected, -1, 0),
          activeDirection: "down"
        }));
        return;
      }
      if (key === "ArrowDown") {
        event.preventDefault();
        setState((previous) => ({
          ...previous,
          selected: moveSelection(previous.solution, previous.selected, 1, 0),
          activeDirection: "down"
        }));
        return;
      }
      if (key === "ArrowLeft") {
        event.preventDefault();
        setState((previous) => ({
          ...previous,
          selected: moveSelection(previous.solution, previous.selected, 0, -1),
          activeDirection: "across"
        }));
        return;
      }
      if (key === "ArrowRight") {
        event.preventDefault();
        setState((previous) => ({
          ...previous,
          selected: moveSelection(previous.solution, previous.selected, 0, 1),
          activeDirection: "across"
        }));
        return;
      }
      if (key === "Backspace" || key === "Delete") {
        event.preventDefault();
        clearCell();
        return;
      }
      if (/^[a-z]$/i.test(key)) {
        writeLetter(key);
        return;
      }
      if (key === "Enter") {
        checkNow();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [checkNow, clearCell, writeLetter]);

  const payloadBuilder = useCallback((snapshot) => ({
    mode: "knowledge-arcade",
    variant: "crucigrama",
    coordinates: "crossword_grid_origin_top_left_hash_blocked",
    locale,
    match: {
      current: snapshot.matchId + 1,
      total: CROSSWORD_MATCH_COUNT
    },
    status: snapshot.status,
    activeDirection: snapshot.activeDirection,
    selected: snapshot.selected,
    moves: snapshot.moves,
    entries: snapshot.entries,
    clues: snapshot.clues,
    grid: snapshot.grid,
    feedback: {
      words: snapshot.wordFeedback,
      cells: snapshot.cellFeedback
    },
    message: snapshot.message
  }), [locale]);

  const advanceTime = useCallback(() => undefined, []);
  useGameRuntimeBridge(state, payloadBuilder, advanceTime);

  const statusLabel = state.status === "won"
    ? copy.statusWon
    : state.status === "revealed"
      ? copy.statusRevealed
      : copy.statusPlaying;

  return (
    <div
      className={[
        "mini-game",
        "knowledge-game",
        "knowledge-arcade-game",
        "knowledge-crucigrama",
        viewport.isMobile ? "is-mobile" : "",
        viewport.isMobile ? `is-mobile-${viewport.orientation}` : ""
      ].filter(Boolean).join(" ")}
    >
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="crossword-head-actions">
          <button type="button" onClick={restart}>{copy.restart}</button>
        </div>
      </div>

      <section
        className={[
          "knowledge-mode-shell",
          viewport.isMobile ? "knowledge-mobile-shell" : ""
        ].filter(Boolean).join(" ")}
      >
        <input
          ref={mobileInputRef}
          className="crossword-mobile-input"
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          aria-label={copy.title}
          onChange={handleMobileInputChange}
          onKeyDown={handleMobileInputKeyDown}
        />

        <div className="knowledge-status-row">
          <span>{copy.match}: {state.matchId + 1}/{CROSSWORD_MATCH_COUNT}</span>
          <span>{copy.board}: {state.grid.rows}x{state.grid.cols} ({state.grid.openCells})</span>
          <span>{copy.wordsSummary(acrossClues.length, downClues.length)}</span>
          <span>{copy.moves}: {state.moves}</span>
          <span>{copy.status}: {statusLabel}</span>
        </div>

        <div className="crossword-layout">
          <div className="crossword-board-panel">
            <div
              className="crossword-grid"
              style={{
                "--crossword-cols": state.grid.cols,
                "--crossword-cell-size": `${cellSize}px`
              }}
            >
              {state.entries.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  const blocked = cell === "#";
                  const selected = state.selected.row === rowIndex && state.selected.col === colIndex;
                  const cellId = keyForCell(rowIndex, colIndex);
                  const cellNumber = state.cellNumbers[cellId] ?? null;
                  const startsWord = cellNumber !== null;
                  const feedback = state.cellFeedback[cellId] ?? null;
                  const feedbackClass = feedback ? `feedback-${feedback}` : "";
                  const tokenClass = feedback ? `feedback-token-${state.feedbackToken}` : "";

                  return (
                    <button
                      key={`${state.puzzleKey}-${rowIndex}-${colIndex}`}
                      type="button"
                      className={[
                        "crossword-cell",
                        blocked ? "blocked" : "",
                        startsWord ? "start-cell" : "",
                        selected ? "selected" : "",
                        feedbackClass,
                        tokenClass
                      ].filter(Boolean).join(" ")}
                      disabled={blocked}
                      onClick={() => selectCell(rowIndex, colIndex)}
                    >
                      {!blocked && cellNumber !== null ? <span className="crossword-number">{cellNumber}</span> : null}
                      {!blocked ? <span className="crossword-letter">{cell}</span> : null}
                    </button>
                  );
                })
              )}
            </div>

            <div className="crossword-toolbar">
              <button type="button" onClick={clearCell}>{copy.clearCell}</button>
              <button type="button" onClick={checkNow}>{copy.check}</button>
              <button type="button" onClick={revealSolution}>{copy.reveal}</button>
            </div>
          </div>

          <div className="crossword-clues">
            <article>
              <h5>{copy.clues} | {copy.acrossClues}</h5>
              <ul>
                {acrossClues.map((clue) => {
                  const feedback = state.wordFeedback[clue.key] ?? null;
                  const isActive = selectedWordKeys.has(clue.key);
                  return (
                    <li
                      key={clue.key}
                      className={[
                        isActive ? "active-word" : "",
                        feedback ? `feedback-${feedback}` : "",
                        feedback ? `feedback-token-${state.feedbackToken}` : ""
                      ].filter(Boolean).join(" ")}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isActive}
                      onClick={() => selectClue(clue, "across")}
                      onKeyDown={(event) => handleClueKeyDown(event, clue, "across")}
                    >
                      {clue.text}
                    </li>
                  );
                })}
              </ul>
            </article>
            <article>
              <h5>{copy.clues} | {copy.downClues}</h5>
              <ul>
                {downClues.map((clue) => {
                  const feedback = state.wordFeedback[clue.key] ?? null;
                  const isActive = selectedWordKeys.has(clue.key);
                  return (
                    <li
                      key={clue.key}
                      className={[
                        isActive ? "active-word" : "",
                        feedback ? `feedback-${feedback}` : "",
                        feedback ? `feedback-token-${state.feedbackToken}` : ""
                      ].filter(Boolean).join(" ")}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isActive}
                      onClick={() => selectClue(clue, "down")}
                      onKeyDown={(event) => handleClueKeyDown(event, clue, "down")}
                    >
                      {clue.text}
                    </li>
                  );
                })}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <p className="game-message">{state.message}</p>
    </div>
  );
}

function CrosswordKnowledgeGameRuntime() {
  const locale = useMemo(resolveKnowledgeArcadeLocale, []);
  const copy = useMemo(() => COPY_BY_LOCALE[locale] ?? COPY_BY_LOCALE.en, [locale]);
  const viewport = useMobileGameViewport();
  const [initialState, setInitialState] = useState(null);

  const loadMatch = useCallback(async (matchId) => {
    const nextState = await createInitialState(matchId, locale, copy);
    setInitialState(nextState);
  }, [copy, locale]);

  useEffect(() => {
    let cancelled = false;
    const matchId = getRandomCrosswordMatchId();
    setInitialState(null);
    createInitialState(matchId, locale, copy)
      .then((nextState) => {
        if (!cancelled) {
          setInitialState(nextState);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInitialState(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [copy, locale]);

  const requestRestart = useCallback((currentMatchId) => {
    const nextMatchId = getRandomCrosswordMatchIdExcept(currentMatchId);
    setInitialState(null);
    void loadMatch(nextMatchId);
  }, [loadMatch]);

  if (!initialState) {
    return <CrosswordRuntimeLoading copy={copy} />;
  }

  return (
    <CrosswordKnowledgeGameRuntimeLoaded
      copy={copy}
      locale={locale}
      viewport={viewport}
      initialState={initialState}
      requestRestart={requestRestart}
    />
  );
}

export default CrosswordKnowledgeGameRuntime;
