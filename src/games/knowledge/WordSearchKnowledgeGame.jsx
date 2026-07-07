import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useMobileGameViewport from "../../mobile/useMobileGameViewport";
import useGameRuntimeBridge from "../../utils/useGameRuntimeBridge";
import {
  KNOWLEDGE_ARCADE_MATCH_COUNT,
  getRandomKnowledgeMatchId,
  getRandomKnowledgeMatchIdExcept,
  resolveKnowledgeArcadeLocale
} from "./knowledgeArcadeUtils";
import {
  buildWordSearchPath,
  buildWordSearchPathKey,
  createWordSearchMatch,
  resolveWordSearchDragSelection
} from "./wordSearchGenerator";

const COPY_BY_LOCALE = {
  es: {
    title: "Sopa de Letras Mega",
    subtitle:
      "Tablero grande con 10.000 combinaciones ES/EN. Selecciona palabras en horizontal, vertical o diagonal, normal o al reves.",
    restart: "Partida aleatoria",
    revealWords: "Revelar palabras",
    hideWords: "Ocultar palabras",
    match: "Partida",
    board: "Tablero",
    progress: "Encontradas",
    status: "Estado",
    statusPlaying: "En curso",
    statusWon: "Completada",
    words: "Palabras objetivo",
    controls:
      "Arrastra (o marca inicio-fin) para trazar una linea recta. Tambien puedes seleccionar una palabra al reves.",
    startMessage: "Encuentra las palabras ocultas en el tablero.",
    anchorSelected: "Origen seleccionado. Marca la letra final para validar.",
    invalidSelection: "Traza una linea recta horizontal, vertical o diagonal.",
    miss: "Esa seleccion no coincide con ninguna palabra objetivo.",
    foundWord: (word) => `Palabra encontrada: ${word}.`,
    alreadyFound: (word) => `${word} ya estaba encontrada.`,
    solved: "Sopa completada. Has encontrado todas las palabras."
  },
  en: {
    title: "Mega Word Search",
    subtitle:
      "Large board with 10,000 ES/EN combinations. Select words horizontally, vertically, or diagonally, forward or reverse.",
    restart: "Random match",
    revealWords: "Reveal words",
    hideWords: "Hide words",
    match: "Match",
    board: "Board",
    progress: "Found",
    status: "Status",
    statusPlaying: "In progress",
    statusWon: "Solved",
    words: "Target words",
    controls:
      "Drag (or click start-end) to trace a straight line. Reverse selection is also supported.",
    startMessage: "Find the hidden words in the board.",
    anchorSelected: "Start cell selected. Pick an end cell to validate.",
    invalidSelection: "Trace a straight horizontal, vertical, or diagonal line.",
    miss: "That selection does not match a target word.",
    foundWord: (word) => `Word found: ${word}.`,
    alreadyFound: (word) => `${word} was already found.`,
    solved: "Word search solved. All target words were found."
  }
};

const cellKey = (row, col) => `${row},${col}`;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const isPrimarySelectionPointer = (event) => {
  const pointerButton = Number.isFinite(event.button) ? event.button : 0;
  if (event.pointerType === "mouse") {
    return pointerButton === 0;
  }
  if (pointerButton === 0 || pointerButton === -1) return true;
  if (typeof event.isPrimary === "boolean") return event.isPrimary;
  return true;
};

const parseMatchParam = (raw) => {
  if (raw == null) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) return null;
  if (parsed >= 0 && parsed < KNOWLEDGE_ARCADE_MATCH_COUNT) {
    return parsed;
  }
  if (parsed >= 1 && parsed <= KNOWLEDGE_ARCADE_MATCH_COUNT) {
    return parsed - 1;
  }
  return null;
};

const resolveMatchIdFromHash = () => {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  const hashMatch = parseMatchParam(new URLSearchParams(hash).get("match"));
  if (hashMatch != null) return hashMatch;

  const searchMatch = parseMatchParam(new URLSearchParams(window.location.search).get("match"));
  if (searchMatch != null) return searchMatch;

  return null;
};

const createInitialState = (matchId, match, copy) => {
  const wordIdByPathKey = match.words.reduce((accumulator, word) => ({
    ...accumulator,
    [word.pathKey]: word.id
  }), {});

  return {
    ...match,
    matchId,
    wordIdByPathKey,
    foundWordIds: [],
    selectionStart: null,
    selectionEnd: null,
    previewPath: [],
    cursor: { row: 0, col: 0 },
    status: "playing",
    message: copy.startMessage
  };
};

function WordSearchKnowledgeGame() {
  const locale = useMemo(resolveKnowledgeArcadeLocale, []);
  const copy = useMemo(() => COPY_BY_LOCALE[locale] ?? COPY_BY_LOCALE.en, [locale]);
  const viewport = useMobileGameViewport();
  const initialMatchId = useMemo(
    () => resolveMatchIdFromHash() ?? getRandomKnowledgeMatchId(),
    []
  );
  const boardRef = useRef(null);
  const selectingRef = useRef(false);
  const selectingPointerIdRef = useRef(null);
  const reanchorCandidateRef = useRef(null);
  const [state, setState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [revealSolution, setRevealSolution] = useState(false);
  const wordsearchCellSize = useMemo(() => {
    if (!state) {
      return viewport.isMobile ? 18 : 28;
    }
    if (!viewport.isMobile) return 28;
    const viewportWidth = Math.max(280, viewport.width || 360);
    const boardWidth = Math.max(230, viewportWidth - 86);
    const dynamicCell = Math.floor((boardWidth - Math.max(0, (state.boardSize - 1) * 2)) / state.boardSize);
    return Math.min(26, Math.max(16, dynamicCell));
  }, [state, viewport.isMobile, viewport.width]);

  const loadMatch = useCallback((matchId) => {
    selectingRef.current = false;
    selectingPointerIdRef.current = null;
    reanchorCandidateRef.current = null;
    setRevealSolution(false);
    setIsLoading(true);
    setState(null);
    return createWordSearchMatch(matchId, locale).then((match) => {
      setState(createInitialState(matchId, match, copy));
      setIsLoading(false);
    });
  }, [copy, locale]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setState(null);
    createWordSearchMatch(initialMatchId, locale).then((match) => {
      if (cancelled) return;
      setState(createInitialState(initialMatchId, match, copy));
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [copy, initialMatchId, locale]);

  const restart = useCallback(() => {
    const currentMatchId = state?.matchId ?? initialMatchId;
    void loadMatch(getRandomKnowledgeMatchIdExcept(currentMatchId));
  }, [initialMatchId, loadMatch, state]);

  const startSelection = useCallback((row, col, announceAnchor = false) => {
    setState((previous) => {
      if (previous.status === "won") {
        return previous;
      }
      return {
        ...previous,
        selectionStart: { row, col },
        selectionEnd: { row, col },
        previewPath: [{ row, col }],
        cursor: { row, col },
        message: announceAnchor ? copy.anchorSelected : previous.message
      };
    });
  }, [copy.anchorSelected]);

  const updateSelection = useCallback((row, col) => {
    setState((previous) => {
      if (!previous.selectionStart || previous.status === "won") {
        return previous;
      }

      const end = { row, col };
      const { start, reanchored, previewPath } = resolveWordSearchDragSelection(
        previous.selectionStart,
        end,
        reanchorCandidateRef.current
      );
      if (reanchored) {
        // The pointer dragged away from where it was pressed: a fresh selection began,
        // so discard the stale start-cell anchor left over from a previous tap.
        reanchorCandidateRef.current = null;
      }
      return {
        ...previous,
        selectionStart: start,
        selectionEnd: end,
        cursor: end,
        previewPath
      };
    });
  }, []);

  const getCellFromPoint = useCallback((clientX, clientY) => {
    if (typeof document === "undefined") return null;
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;

    const node = document.elementFromPoint(clientX, clientY);
    if (!(node instanceof Element)) return null;
    const cell = node.closest("[data-wordsearch-cell='true']");
    if (!(cell instanceof HTMLElement)) return null;
    if (boardRef.current && !boardRef.current.contains(cell)) return null;

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
    return { row, col };
  }, []);

  const updateSelectionFromPointer = useCallback((event) => {
    if (!selectingRef.current) return null;
    if (
      selectingPointerIdRef.current != null &&
      Number.isFinite(event.pointerId) &&
      event.pointerId !== selectingPointerIdRef.current
    ) {
      return null;
    }

    const nextCell = getCellFromPoint(event.clientX, event.clientY);
    if (!nextCell) return null;
    updateSelection(nextCell.row, nextCell.col);
    return nextCell;
  }, [getCellFromPoint, updateSelection]);

  const clearSelection = useCallback((snapshot) => ({
    ...snapshot,
    selectionStart: null,
    selectionEnd: null,
    previewPath: []
  }), []);

  const finishSelection = useCallback((explicitEnd = null) => {
    setState((previous) => {
      if (!previous.selectionStart || previous.status === "won") {
        return clearSelection(previous);
      }

      const end = explicitEnd || previous.selectionEnd || previous.selectionStart;
      const path = buildWordSearchPath(previous.selectionStart, end);
      if (path.length < 2) {
        const sameCell = (
          previous.selectionStart.row === end.row &&
          previous.selectionStart.col === end.col
        );
        if (!sameCell) {
          return clearSelection({
            ...previous,
            message: copy.invalidSelection
          });
        }

        return {
          ...previous,
          selectionStart: end,
          selectionEnd: end,
          previewPath: [end],
          status: "playing",
          message: copy.anchorSelected
        };
      }

      const pathKey = buildWordSearchPathKey(path);
      const matchedWordId = previous.wordIdByPathKey[pathKey];
      if (!matchedWordId) {
        return clearSelection({
          ...previous,
          message: copy.miss
        });
      }

      if (previous.foundWordIds.includes(matchedWordId)) {
        const knownWord = previous.words.find((word) => word.id === matchedWordId);
        return clearSelection({
          ...previous,
          message: copy.alreadyFound(knownWord?.word ?? matchedWordId)
        });
      }

      const matchedWord = previous.words.find((word) => word.id === matchedWordId);
      const nextFoundWordIds = [...previous.foundWordIds, matchedWordId];
      const solved = nextFoundWordIds.length >= previous.words.length;

      return clearSelection({
        ...previous,
        foundWordIds: nextFoundWordIds,
        status: solved ? "won" : "playing",
        message: solved ? copy.solved : copy.foundWord(matchedWord?.word ?? matchedWordId)
      });
    });
  }, [clearSelection, copy]);

  useEffect(() => {
    // NOTE: these window-level listeners must NOT be gated on `state`. The
    // handlers only touch refs and stable callbacks, so attaching them once
    // on mount is safe. Gating on `state` while it is absent from the
    // dependency array meant the effect bailed out on the first (loading)
    // render and never re-ran once the match loaded, so pointerup never
    // finalized a selection and found words were never marked.
    const onPointerMove = (event) => {
      if (!selectingRef.current) return;
      updateSelectionFromPointer(event);
    };

    const onPointerUp = (event) => {
      if (!selectingRef.current) return;
      if (
        selectingPointerIdRef.current != null &&
        Number.isFinite(event.pointerId) &&
        event.pointerId !== selectingPointerIdRef.current
      ) {
        return;
      }
      const explicitEnd = updateSelectionFromPointer(event);
      selectingRef.current = false;
      selectingPointerIdRef.current = null;
      reanchorCandidateRef.current = null;
      finishSelection(explicitEnd || null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [finishSelection, updateSelectionFromPointer]);

  useEffect(() => {
    if (!state) {
      return undefined;
    }
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (key === "arrowup") {
        event.preventDefault();
        setState((previous) => ({
          ...previous,
          cursor: {
            row: clamp(previous.cursor.row - 1, 0, previous.boardSize - 1),
            col: previous.cursor.col
          }
        }));
        return;
      }
      if (key === "arrowdown") {
        event.preventDefault();
        setState((previous) => ({
          ...previous,
          cursor: {
            row: clamp(previous.cursor.row + 1, 0, previous.boardSize - 1),
            col: previous.cursor.col
          }
        }));
        return;
      }
      if (key === "arrowleft") {
        event.preventDefault();
        setState((previous) => ({
          ...previous,
          cursor: {
            row: previous.cursor.row,
            col: clamp(previous.cursor.col - 1, 0, previous.boardSize - 1)
          }
        }));
        return;
      }
      if (key === "arrowright") {
        event.preventDefault();
        setState((previous) => ({
          ...previous,
          cursor: {
            row: previous.cursor.row,
            col: clamp(previous.cursor.col + 1, 0, previous.boardSize - 1)
          }
        }));
        return;
      }
      if (key === "r") {
        event.preventDefault();
        restart();
        return;
      }
      if (key === "escape") {
        event.preventDefault();
        setState((previous) => clearSelection({
          ...previous,
          status: "playing",
          message: copy.startMessage
        }));
        return;
      }
      if (event.key === "Enter" && state.status === "won") {
        event.preventDefault();
        restart();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const cursor = state.cursor;
        if (!state.selectionStart) {
          startSelection(cursor.row, cursor.col, true);
          return;
        }
        updateSelection(cursor.row, cursor.col);
        finishSelection({ row: cursor.row, col: cursor.col });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    clearSelection,
    copy.startMessage,
    finishSelection,
    restart,
    startSelection,
    state,
    updateSelection
  ]);

  const wordsById = useMemo(() => {
    if (!state) {
      return {};
    }
    return state.words.reduce((accumulator, word) => ({
      ...accumulator,
      [word.id]: word
    }), {});
  }, [state]);

  const foundWordIdsSet = useMemo(() => new Set(state?.foundWordIds ?? []), [state]);

  const foundCellSet = useMemo(() => {
    const cells = new Set();
    (state?.foundWordIds ?? []).forEach((wordId) => {
      const word = wordsById[wordId];
      if (!word) return;
      word.cells.forEach((cell) => cells.add(cellKey(cell.row, cell.col)));
    });
    return cells;
  }, [state, wordsById]);

  const previewCellSet = useMemo(() => {
    const cells = new Set();
    (state?.previewPath ?? []).forEach((cell) => cells.add(cellKey(cell.row, cell.col)));
    return cells;
  }, [state]);

  // When the player asks for a hint, light up the board cells that spell the
  // words still left to find. Already-found words keep their "found" style.
  const revealedCellSet = useMemo(() => {
    const cells = new Set();
    if (!revealSolution || !state) {
      return cells;
    }
    state.words.forEach((word) => {
      if (foundWordIdsSet.has(word.id)) return;
      word.cells.forEach((cell) => cells.add(cellKey(cell.row, cell.col)));
    });
    return cells;
  }, [revealSolution, state, foundWordIdsSet]);

  const anchorCellKey = state?.selectionStart
    ? cellKey(state.selectionStart.row, state.selectionStart.col)
    : null;

  const payloadBuilder = useCallback((snapshot) => {
    if (!snapshot) {
      return {
        mode: "knowledge-arcade",
        variant: "sopa-letras",
        coordinates: "grid_row_col_origin_top_left",
        locale,
        loading: true,
        status: "loading",
        message: copy.startMessage
      };
    }
    const foundSet = new Set(snapshot.foundWordIds);
    return {
      mode: "knowledge-arcade",
      variant: "sopa-letras",
      coordinates: "grid_row_col_origin_top_left",
      locale,
      match: {
        current: snapshot.matchId + 1,
        total: KNOWLEDGE_ARCADE_MATCH_COUNT
      },
      status: snapshot.status,
      boardSize: snapshot.boardSize,
      wordsTotal: snapshot.words.length,
      wordsFound: snapshot.foundWordIds.length,
      foundWords: snapshot.words
        .filter((word) => foundSet.has(word.id))
        .map((word) => word.word),
      pendingWords: snapshot.words
        .filter((word) => !foundSet.has(word.id))
        .map((word) => word.word),
      targets: snapshot.words.map((word) => ({
        word: word.word,
        start: word.start,
        end: word.end,
        direction: word.direction,
        found: foundSet.has(word.id)
      })),
      cursor: snapshot.cursor,
      previewPath: snapshot.previewPath,
      message: snapshot.message
    };
  }, [copy.startMessage, locale]);

  const advanceTime = useCallback(() => undefined, []);
  useGameRuntimeBridge(state, payloadBuilder, advanceTime);

  if (!state || isLoading) {
    return (
      <div
        className={[
          "mini-game",
          "knowledge-game",
          "knowledge-arcade-game",
          "knowledge-sopa-letras",
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
          <p className="wordsearch-note">{copy.controls}</p>
          <p className="game-message">{copy.startMessage}</p>
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
        "knowledge-sopa-letras",
        viewport.isMobile ? "is-mobile" : "",
        viewport.isMobile ? `is-mobile-${viewport.orientation}` : ""
      ].filter(Boolean).join(" ")}
    >
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="wordsearch-head-actions">
          <button
            type="button"
            className={`wordsearch-reveal-toggle ${revealSolution ? "is-active" : ""}`.trim()}
            aria-pressed={revealSolution}
            onClick={() => setRevealSolution((previous) => !previous)}
          >
            {revealSolution ? copy.hideWords : copy.revealWords}
          </button>
          <button type="button" onClick={restart}>{copy.restart}</button>
        </div>
      </div>

      <section
        className={[
          "knowledge-mode-shell",
          viewport.isMobile ? "knowledge-mobile-shell" : ""
        ].filter(Boolean).join(" ")}
      >
        <div className="knowledge-status-row">
          <span>{copy.match}: {state.matchId + 1}/{KNOWLEDGE_ARCADE_MATCH_COUNT}</span>
          <span>{copy.board}: {state.boardSize}x{state.boardSize}</span>
          <span>{copy.progress}: {state.foundWordIds.length}/{state.words.length}</span>
          <span>{copy.status}: {state.status === "won" ? copy.statusWon : copy.statusPlaying}</span>
        </div>

        <p className="wordsearch-note">{copy.controls}</p>

        <div className="wordsearch-shell">
          <div className="wordsearch-board-shell">
            <div
              ref={boardRef}
              className="wordsearch-board"
              role="grid"
              style={{
                "--wordsearch-size": state.boardSize,
                "--wordsearch-cell-size": `${wordsearchCellSize}px`
              }}
              onPointerMove={(event) => {
                if (!selectingRef.current) return;
                updateSelectionFromPointer(event);
              }}
            >
              {state.board.map((row, rowIndex) =>
                row.map((letter, colIndex) => {
                  const id = cellKey(rowIndex, colIndex);
                  const isFound = foundCellSet.has(id);
                  const isPreview = previewCellSet.has(id);
                  const isAnchor = anchorCellKey === id;
                  const isCursor = state.cursor.row === rowIndex && state.cursor.col === colIndex;
                  const isRevealed = !isFound && revealedCellSet.has(id);
                  const className = [
                    "wordsearch-cell",
                    isFound ? "found" : "",
                    isRevealed ? "revealed" : "",
                    isPreview ? "preview" : "",
                    isAnchor ? "anchor" : "",
                    isCursor ? "cursor" : ""
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <button
                      key={id}
                      type="button"
                      className={className}
                      data-wordsearch-cell="true"
                      data-row={rowIndex}
                      data-col={colIndex}
                      draggable={false}
                      onContextMenu={(event) => event.preventDefault()}
                      onPointerDown={(event) => {
                        if (!isPrimarySelectionPointer(event)) return;
                        event.preventDefault();
                        if (Number.isFinite(event.pointerId)) {
                          selectingPointerIdRef.current = event.pointerId;
                          event.currentTarget.setPointerCapture?.(event.pointerId);
                        } else {
                          selectingPointerIdRef.current = null;
                        }
                        selectingRef.current = true;
                        if (state.selectionStart && state.previewPath.length === 1) {
                          // A start cell was already anchored by a previous tap. This press is
                          // ambiguous: releasing without moving completes the start-end selection,
                          // but dragging means the user is starting a brand-new selection here.
                          // Remember the pressed cell so the first drag movement re-anchors to it
                          // instead of tracing from the stale anchor across the board.
                          reanchorCandidateRef.current = { row: rowIndex, col: colIndex };
                          updateSelection(rowIndex, colIndex);
                          return;
                        }
                        reanchorCandidateRef.current = null;
                        startSelection(rowIndex, colIndex, false);
                      }}
                      onPointerEnter={(event) => {
                        if (!selectingRef.current) return;
                        if (
                          selectingPointerIdRef.current != null &&
                          Number.isFinite(event.pointerId) &&
                          event.pointerId !== selectingPointerIdRef.current
                        ) {
                          return;
                        }
                        updateSelection(rowIndex, colIndex);
                      }}
                    >
                      {letter}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="wordsearch-words-shell">
            <h5>{copy.words}</h5>
            <ul className="wordsearch-words">
              {state.words.map((word) => (
                <li
                  key={word.id}
                  className={`wordsearch-word ${foundWordIdsSet.has(word.id) ? "found" : ""}`.trim()}
                >
                  {word.word}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <p className="game-message">{state.message}</p>
    </div>
  );
}

export default WordSearchKnowledgeGame;
