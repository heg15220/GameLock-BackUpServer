import React, { useCallback, useEffect, useMemo, useState } from "react";
import useMobileGameViewport from "../../mobile/useMobileGameViewport";
import useGameRuntimeBridge from "../../utils/useGameRuntimeBridge";
import {
  KNOWLEDGE_ARCADE_MATCH_COUNT,
  getRandomKnowledgeMatchId,
  getRandomKnowledgeMatchIdExcept,
  resolveKnowledgeArcadeLocale
} from "./knowledgeArcadeUtils";

const BASE_SOLUTION = [
  [1, 2, 3, 4],
  [3, 4, 1, 2],
  [2, 1, 4, 3],
  [4, 3, 2, 1]
];

const MASK_PATTERNS = [
  [
    [1, 0, 0, 1],
    [0, 1, 1, 0],
    [1, 0, 1, 0],
    [0, 1, 0, 1]
  ],
  [
    [1, 1, 0, 0],
    [0, 0, 1, 1],
    [1, 0, 1, 0],
    [0, 1, 0, 1]
  ],
  [
    [0, 1, 0, 1],
    [1, 0, 1, 0],
    [0, 1, 1, 0],
    [1, 0, 0, 1]
  ],
  [
    [1, 0, 1, 0],
    [0, 1, 0, 1],
    [1, 0, 0, 1],
    [0, 1, 1, 0]
  ],
  [
    [0, 1, 1, 0],
    [1, 0, 0, 1],
    [0, 1, 0, 1],
    [1, 0, 1, 0]
  ],
  [
    [1, 0, 0, 1],
    [1, 0, 1, 0],
    [0, 1, 0, 1],
    [0, 1, 1, 0]
  ],
  [
    [0, 1, 0, 1],
    [0, 1, 1, 0],
    [1, 0, 0, 1],
    [1, 0, 1, 0]
  ],
  [
    [1, 1, 0, 0],
    [0, 1, 0, 1],
    [1, 0, 1, 0],
    [0, 0, 1, 1]
  ],
  [
    [0, 0, 1, 1],
    [1, 0, 1, 0],
    [0, 1, 0, 1],
    [1, 1, 0, 0]
  ],
  [
    [1, 0, 1, 0],
    [1, 0, 0, 1],
    [0, 1, 1, 0],
    [0, 1, 0, 1]
  ]
];

const DIGIT_PERMUTATIONS = [
  [1, 2, 3, 4],
  [1, 2, 4, 3],
  [1, 3, 2, 4],
  [1, 3, 4, 2],
  [1, 4, 2, 3],
  [1, 4, 3, 2],
  [2, 1, 3, 4],
  [2, 1, 4, 3],
  [2, 3, 1, 4],
  [2, 3, 4, 1],
  [2, 4, 1, 3],
  [2, 4, 3, 1],
  [3, 1, 2, 4],
  [3, 1, 4, 2],
  [3, 2, 1, 4],
  [3, 2, 4, 1],
  [3, 4, 1, 2],
  [3, 4, 2, 1],
  [4, 1, 2, 3],
  [4, 1, 3, 2],
  [4, 2, 1, 3],
  [4, 2, 3, 1],
  [4, 3, 1, 2],
  [4, 3, 2, 1]
];

const COPY_BY_LOCALE = {
  es: {
    title: "Sudoku Sprint 4x4",
    subtitle: "Completa la rejilla sin repetir numeros en fila, columna ni bloque 2x2.",
    restart: "Partida aleatoria",
    moves: "Movimientos",
    conflicts: "Conflictos",
    status: "Estado",
    statusWon: "Resuelto",
    statusPlaying: "En curso",
    clear: "Limpiar",
    seed: "Partida",
    startMessage: "Completa el tablero 4x4.",
    solvedMessage: "Sudoku completado.",
    conflictMessage: "Hay conflictos en la rejilla.",
    updateCell: (row, col) => `Celda ${row + 1},${col + 1} actualizada.`
  },
  en: {
    title: "Sudoku Sprint 4x4",
    subtitle: "Complete the grid without repeating numbers in any row, column or 2x2 block.",
    restart: "Random match",
    moves: "Moves",
    conflicts: "Conflicts",
    status: "Status",
    statusWon: "Solved",
    statusPlaying: "In progress",
    clear: "Clear",
    seed: "Match",
    startMessage: "Complete the 4x4 board.",
    solvedMessage: "Sudoku solved.",
    conflictMessage: "There are conflicts in the grid.",
    updateCell: (row, col) => `Cell ${row + 1},${col + 1} updated.`
  }
};

const cloneBoard = (board) => board.map((row) => [...row]);
const keyForCell = (row, col) => `${row},${col}`;

const decodeSudokuConfig = (matchId) => {
  let code = Number(matchId) || 0;
  const maskIndex = code % MASK_PATTERNS.length;
  code = Math.floor(code / MASK_PATTERNS.length);

  const digitPermutationIndex = code % DIGIT_PERMUTATIONS.length;
  code = Math.floor(code / DIGIT_PERMUTATIONS.length);

  const rowSwap0 = code % 2;
  code = Math.floor(code / 2);
  const rowSwap1 = code % 2;
  code = Math.floor(code / 2);
  const colSwap0 = code % 2;
  code = Math.floor(code / 2);
  const colSwap1 = code % 2;
  code = Math.floor(code / 2);
  const rowBandSwap = code % 2;
  code = Math.floor(code / 2);
  const colBandSwap = code % 2;

  return {
    maskIndex,
    digitPermutationIndex,
    rowSwap0,
    rowSwap1,
    colSwap0,
    colSwap1,
    rowBandSwap,
    colBandSwap
  };
};

const buildOrder = (swapA, swapB, swapBands) => {
  const firstBand = swapA ? [1, 0] : [0, 1];
  const secondBand = swapB ? [3, 2] : [2, 3];
  if (swapBands) {
    return [...secondBand, ...firstBand];
  }
  return [...firstBand, ...secondBand];
};

const createSudokuMatch = (matchId) => {
  const config = decodeSudokuConfig(matchId);
  const digitPermutation = DIGIT_PERMUTATIONS[config.digitPermutationIndex];
  const rowOrder = buildOrder(config.rowSwap0, config.rowSwap1, config.rowBandSwap);
  const colOrder = buildOrder(config.colSwap0, config.colSwap1, config.colBandSwap);
  const mask = MASK_PATTERNS[config.maskIndex];

  const solution = rowOrder.map((rowIndex) =>
    colOrder.map((colIndex) => digitPermutation[BASE_SOLUTION[rowIndex][colIndex] - 1])
  );
  const puzzle = solution.map((row, rowIndex) =>
    row.map((value, colIndex) => (mask[rowIndex][colIndex] ? value : 0))
  );

  return { solution, puzzle };
};

const firstEditableCell = (puzzle) => {
  for (let row = 0; row < puzzle.length; row += 1) {
    for (let col = 0; col < puzzle[row].length; col += 1) {
      if (puzzle[row][col] === 0) {
        return { row, col };
      }
    }
  }
  return { row: 0, col: 0 };
};

const findConflicts = (board) => {
  const conflicts = new Set();

  const markDuplicates = (cells) => {
    const byValue = {};
    cells.forEach(({ row, col, value }) => {
      if (!value) return;
      if (!byValue[value]) {
        byValue[value] = [];
      }
      byValue[value].push({ row, col });
    });
    Object.values(byValue).forEach((positions) => {
      if (positions.length <= 1) return;
      positions.forEach(({ row, col }) => conflicts.add(keyForCell(row, col)));
    });
  };

  for (let row = 0; row < 4; row += 1) {
    markDuplicates(board[row].map((value, col) => ({ row, col, value })));
  }

  for (let col = 0; col < 4; col += 1) {
    const cells = [];
    for (let row = 0; row < 4; row += 1) {
      cells.push({ row, col, value: board[row][col] });
    }
    markDuplicates(cells);
  }

  for (let startRow = 0; startRow < 4; startRow += 2) {
    for (let startCol = 0; startCol < 4; startCol += 2) {
      const cells = [];
      for (let row = startRow; row < startRow + 2; row += 1) {
        for (let col = startCol; col < startCol + 2; col += 1) {
          cells.push({ row, col, value: board[row][col] });
        }
      }
      markDuplicates(cells);
    }
  }

  return [...conflicts];
};

const isSolved = (board, solution) =>
  board.every((row, rowIndex) => row.every((value, colIndex) => value === solution[rowIndex][colIndex]));

const createInitialState = (matchId, copy) => {
  const { puzzle, solution } = createSudokuMatch(matchId);
  return {
    matchId,
    puzzle,
    solution,
    board: cloneBoard(puzzle),
    selected: firstEditableCell(puzzle),
    conflicts: [],
    moves: 0,
    status: "playing",
    message: copy.startMessage
  };
};

function SudokuKnowledgeGame() {
  const locale = useMemo(resolveKnowledgeArcadeLocale, []);
  const copy = useMemo(() => COPY_BY_LOCALE[locale] ?? COPY_BY_LOCALE.en, [locale]);
  const viewport = useMobileGameViewport();
  const [state, setState] = useState(() =>
    createInitialState(getRandomKnowledgeMatchId(), copy)
  );

  const moveSelection = useCallback((deltaRow, deltaCol) => {
    setState((previous) => ({
      ...previous,
      selected: {
        row: Math.max(0, Math.min(3, previous.selected.row + deltaRow)),
        col: Math.max(0, Math.min(3, previous.selected.col + deltaCol))
      }
    }));
  }, []);

  const setValue = useCallback((value) => {
    setState((previous) => {
      const { row, col } = previous.selected;
      if (previous.puzzle[row][col] !== 0 || previous.status === "won") {
        return previous;
      }
      const safeValue = value >= 1 && value <= 4 ? value : 0;
      const nextBoard = cloneBoard(previous.board);
      nextBoard[row][col] = safeValue;
      const nextConflicts = findConflicts(nextBoard);
      const solved = !nextConflicts.length && isSolved(nextBoard, previous.solution);
      return {
        ...previous,
        board: nextBoard,
        conflicts: nextConflicts,
        moves: previous.moves + 1,
        status: solved ? "won" : "playing",
        message: solved
          ? copy.solvedMessage
          : nextConflicts.length
            ? copy.conflictMessage
            : copy.updateCell(row, col)
      };
    });
  }, [copy]);

  const restart = useCallback(() => {
    setState((previous) => createInitialState(getRandomKnowledgeMatchIdExcept(previous.matchId), copy));
  }, [copy]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key;
      const normalized = key.toLowerCase();
      const mapping = { a: 1, s: 2, d: 3, f: 4 };

      if (key === "ArrowUp") {
        event.preventDefault();
        moveSelection(-1, 0);
        return;
      }
      if (key === "ArrowDown") {
        event.preventDefault();
        moveSelection(1, 0);
        return;
      }
      if (key === "ArrowLeft") {
        event.preventDefault();
        moveSelection(0, -1);
        return;
      }
      if (key === "ArrowRight") {
        event.preventDefault();
        moveSelection(0, 1);
        return;
      }
      if (["1", "2", "3", "4"].includes(key)) {
        setValue(Number(key));
        return;
      }
      if (mapping[normalized]) {
        setValue(mapping[normalized]);
        return;
      }
      if (key === "Backspace" || key === "Delete") {
        event.preventDefault();
        setValue(0);
        return;
      }
      if (normalized === "r") {
        restart();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moveSelection, restart, setValue]);

  const conflictSet = useMemo(() => new Set(state.conflicts), [state.conflicts]);

  const payloadBuilder = useCallback((snapshot) => ({
    mode: "knowledge-arcade",
    variant: "sudoku",
    coordinates: "sudoku_grid_origin_top_left",
    locale,
    match: {
      current: snapshot.matchId + 1,
      total: KNOWLEDGE_ARCADE_MATCH_COUNT
    },
    status: snapshot.status,
    selected: snapshot.selected,
    moves: snapshot.moves,
    conflicts: snapshot.conflicts,
    board: snapshot.board,
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
        "knowledge-sudoku",
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
          <span>{copy.seed}: {state.matchId + 1}/{KNOWLEDGE_ARCADE_MATCH_COUNT}</span>
          <span>{copy.moves}: {state.moves}</span>
          <span>{copy.conflicts}: {state.conflicts.length}</span>
          <span>{copy.status}: {state.status === "won" ? copy.statusWon : copy.statusPlaying}</span>
        </div>

        <div className="sudoku-board-shell">
          <div className="sudoku-board" role="grid">
            {state.board.map((row, rowIndex) =>
              row.map((value, colIndex) => {
                const key = keyForCell(rowIndex, colIndex);
                const fixed = state.puzzle[rowIndex][colIndex] !== 0;
                const selected = state.selected.row === rowIndex && state.selected.col === colIndex;
                const conflict = conflictSet.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    className={`sudoku-cell ${fixed ? "fixed" : ""} ${selected ? "selected" : ""} ${conflict ? "conflict" : ""} ${colIndex === 1 ? "block-right" : ""} ${rowIndex === 1 ? "block-bottom" : ""}`.trim()}
                    onClick={() => setState((previous) => ({
                      ...previous,
                      selected: { row: rowIndex, col: colIndex }
                    }))}
                  >
                    {value || ""}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="quick-actions compact-grid">
          {[1, 2, 3, 4].map((value) => (
            <button key={value} type="button" onClick={() => setValue(value)}>{value}</button>
          ))}
          <button type="button" onClick={() => setValue(0)}>{copy.clear}</button>
        </div>
      </section>

      <p className="game-message">{state.message}</p>
    </div>
  );
}

export default SudokuKnowledgeGame;
