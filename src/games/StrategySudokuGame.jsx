import React, { useCallback, useEffect, useMemo, useState } from "react";
import useGameRuntimeBridge from "../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../utils/resolveBrowserLanguage";

const GRID_SIZE = 9;
const BOX_SIZE = 3;
const MATCH_COUNT = 10000;
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const COLUMN_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];

const BASE_SOLUTION = [
  [1, 2, 3, 4, 5, 6, 7, 8, 9],
  [4, 5, 6, 7, 8, 9, 1, 2, 3],
  [7, 8, 9, 1, 2, 3, 4, 5, 6],
  [2, 3, 4, 5, 6, 7, 8, 9, 1],
  [5, 6, 7, 8, 9, 1, 2, 3, 4],
  [8, 9, 1, 2, 3, 4, 5, 6, 7],
  [3, 4, 5, 6, 7, 8, 9, 1, 2],
  [6, 7, 8, 9, 1, 2, 3, 4, 5],
  [9, 1, 2, 3, 4, 5, 6, 7, 8]
];

const DIFFICULTIES = [
  { id: "easy", clues: 40 },
  { id: "normal", clues: 34 },
  { id: "hard", clues: 30 }
];

const DIFFICULTY_BY_ID = Object.fromEntries(DIFFICULTIES.map((difficulty) => [difficulty.id, difficulty]));

const TECHNIQUE_KEYS = {
  groupComplete: "groupComplete",
  boxScan: "boxScan",
  lineScan: "lineScan",
  count: "count"
};

const COPY_BY_LOCALE = {
  es: {
    title: "Sudoku Tecnicas Pro 9x9",
    subtitle: "Resuelve por logica con tecnicas clasicas de Sudoku en formato estrategico.",
    randomMatch: "Partida aleatoria",
    hint: "Aplicar pista",
    clear: "Limpiar",
    match: "Partida",
    moves: "Movimientos",
    conflicts: "Conflictos",
    hintsUsed: "Pistas",
    status: "Estado",
    statusPlaying: "En curso",
    statusWon: "Resuelto",
    difficulty: "Dificultad",
    boardAria: "Tablero de sudoku estrategico 9x9",
    startMessage: "Completa el tablero 9x9 aplicando logica.",
    solvedMessage: "Sudoku completado con exito.",
    conflictMessage: "Hay conflictos: revisa filas, columnas o recuadros.",
    noHintMessage: "No hay una pista basica directa disponible en este estado.",
    fixedCellMessage: "Esa casilla es fija y no se puede modificar.",
    cellClearedMessage: (cell) => `Casilla ${cell} limpiada.`,
    cellUpdatedMessage: (cell, value) => `Casilla ${cell} actualizada con ${value}.`,
    hintAppliedMessage: (technique, cell, value, detail) =>
      `Pista (${technique}): coloca ${value} en ${cell}. ${detail}`,
    difficultyLabel: {
      easy: "Facil",
      normal: "Media",
      hard: "Dificil"
    },
    techniqueLabel: {
      groupComplete: "Grupo completo",
      boxScan: "Barrido",
      lineScan: "Barrido sobre una linea",
      count: "Recuento"
    },
    reason: {
      groupRow: (row, value) => `Fila ${row + 1}: solo falta el numero ${value}.`,
      groupColumn: (col, value) => `Columna ${COLUMN_LABELS[col]}: solo falta el numero ${value}.`,
      groupBox: (boxRow, boxCol, value) =>
        `Recuadro ${boxRow + 1}-${boxCol + 1}: solo falta el numero ${value}.`,
      boxScan: (boxRow, boxCol, value) =>
        `En el recuadro ${boxRow + 1}-${boxCol + 1}, el ${value} solo cabe en una casilla.`,
      lineScanRow: (row, value) =>
        `En la fila ${row + 1}, el ${value} solo tiene una posicion valida.`,
      lineScanColumn: (col, value) =>
        `En la columna ${COLUMN_LABELS[col]}, el ${value} solo tiene una posicion valida.`,
      count: (cell, value) => `En ${cell} solo encaja el numero ${value}.`
    },
    techniquesTitle: "Tecnicas de referencia",
    techniquesSubtitle: "Basado en metodos clasicos de resolucion logica:",
    techniques: [
      "Reglas de Sudoku",
      "Grupo completo",
      "Barrido",
      "Barrido sobre una linea",
      "Recuento",
      "Numeros bloqueados",
      "Mellizos",
      "Gemelos",
      "Duo oculto",
      "Duo solo",
      "Reduccion en recuadro",
      "Reduccion en linea",
      "Par oculto",
      "Par solo",
      "Dobles conectados"
    ],
    keyboardHelp:
      "Controles: flechas para mover seleccion, 1-9 o QWE/ASD/UIO para escribir, Backspace para borrar, P pista, R partida aleatoria."
  },
  en: {
    title: "Sudoku Techniques Pro 9x9",
    subtitle: "Solve by logic using classic Sudoku techniques in a strategy format.",
    randomMatch: "Random match",
    hint: "Apply hint",
    clear: "Clear",
    match: "Match",
    moves: "Moves",
    conflicts: "Conflicts",
    hintsUsed: "Hints",
    status: "Status",
    statusPlaying: "In progress",
    statusWon: "Solved",
    difficulty: "Difficulty",
    boardAria: "Strategic 9x9 sudoku board",
    startMessage: "Complete the 9x9 board using logic.",
    solvedMessage: "Sudoku solved successfully.",
    conflictMessage: "There are conflicts: review rows, columns, or boxes.",
    noHintMessage: "No direct basic hint is available in this position.",
    fixedCellMessage: "That cell is fixed and cannot be edited.",
    cellClearedMessage: (cell) => `Cell ${cell} cleared.`,
    cellUpdatedMessage: (cell, value) => `Cell ${cell} set to ${value}.`,
    hintAppliedMessage: (technique, cell, value, detail) =>
      `Hint (${technique}): place ${value} in ${cell}. ${detail}`,
    difficultyLabel: {
      easy: "Easy",
      normal: "Medium",
      hard: "Hard"
    },
    techniqueLabel: {
      groupComplete: "Complete group",
      boxScan: "Box scan",
      lineScan: "Line scan",
      count: "Counting"
    },
    reason: {
      groupRow: (row, value) => `Row ${row + 1}: only number ${value} is missing.`,
      groupColumn: (col, value) => `Column ${COLUMN_LABELS[col]}: only number ${value} is missing.`,
      groupBox: (boxRow, boxCol, value) =>
        `Box ${boxRow + 1}-${boxCol + 1}: only number ${value} is missing.`,
      boxScan: (boxRow, boxCol, value) =>
        `In box ${boxRow + 1}-${boxCol + 1}, number ${value} fits only one cell.`,
      lineScanRow: (row, value) => `In row ${row + 1}, number ${value} has only one valid spot.`,
      lineScanColumn: (col, value) =>
        `In column ${COLUMN_LABELS[col]}, number ${value} has only one valid spot.`,
      count: (cell, value) => `Only number ${value} fits in ${cell}.`
    },
    techniquesTitle: "Technique reference",
    techniquesSubtitle: "Built around classic logical solving methods:",
    techniques: [
      "Sudoku rules",
      "Complete group",
      "Scan",
      "Line scan",
      "Counting",
      "Locked numbers",
      "Twins",
      "Gemini pairs",
      "Hidden pair",
      "Naked pair",
      "Box reduction",
      "Line reduction",
      "Hidden pair",
      "Naked pair",
      "Connected doubles"
    ],
    keyboardHelp:
      "Controls: arrows move selection, 1-9 or QWE/ASD/UIO to write, Backspace clears, P hint, R random match."
  }
};

const cloneBoard = (board) => board.map((row) => [...row]);
const keyForCell = (row, col) => `${row},${col}`;
const toCellLabel = (row, col) => `${COLUMN_LABELS[col]}${row + 1}`;

const createSeededRandom = (seed) => {
  let state = (Number(seed) >>> 0) || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

const shuffle = (values, random) => {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

const createSolvedBoard = (seed) => {
  const random = createSeededRandom(seed);
  const digitPermutation = shuffle(DIGITS, random);
  const bandOrder = shuffle([0, 1, 2], random);
  const stackOrder = shuffle([0, 1, 2], random);
  const rowOrder = bandOrder.flatMap((band) =>
    shuffle([0, 1, 2], random).map((offset) => band * BOX_SIZE + offset)
  );
  const colOrder = stackOrder.flatMap((stack) =>
    shuffle([0, 1, 2], random).map((offset) => stack * BOX_SIZE + offset)
  );

  return rowOrder.map((row) =>
    colOrder.map((col) => digitPermutation[BASE_SOLUTION[row][col] - 1])
  );
};

const collectBlockedDigits = (board, row, col) => {
  const blocked = new Array(10).fill(false);

  for (let index = 0; index < GRID_SIZE; index += 1) {
    blocked[board[row][index]] = true;
    blocked[board[index][col]] = true;
  }

  const boxRowStart = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxColStart = Math.floor(col / BOX_SIZE) * BOX_SIZE;
  for (let rowIndex = boxRowStart; rowIndex < boxRowStart + BOX_SIZE; rowIndex += 1) {
    for (let colIndex = boxColStart; colIndex < boxColStart + BOX_SIZE; colIndex += 1) {
      blocked[board[rowIndex][colIndex]] = true;
    }
  }

  return blocked;
};

const getCandidates = (board, row, col) => {
  if (board[row][col] !== 0) {
    return [];
  }
  const blocked = collectBlockedDigits(board, row, col);
  return DIGITS.filter((digit) => !blocked[digit]);
};

const findBestEmptyCell = (board) => {
  let best = null;
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (board[row][col] !== 0) continue;
      const candidates = getCandidates(board, row, col);
      if (candidates.length === 0) {
        return { row, col, candidates };
      }
      if (!best || candidates.length < best.candidates.length) {
        best = { row, col, candidates };
      }
      if (best.candidates.length === 1) {
        return best;
      }
    }
  }
  return best;
};

const countSolutions = (board, limit = 2) => {
  const working = cloneBoard(board);

  const search = (currentCount) => {
    if (currentCount >= limit) {
      return currentCount;
    }

    const next = findBestEmptyCell(working);
    if (!next) {
      return currentCount + 1;
    }
    if (!next.candidates.length) {
      return currentCount;
    }

    let solvedCount = currentCount;
    for (const candidate of next.candidates) {
      working[next.row][next.col] = candidate;
      solvedCount = search(solvedCount);
      if (solvedCount >= limit) {
        break;
      }
    }
    working[next.row][next.col] = 0;
    return solvedCount;
  };

  return search(0);
};

const createPuzzleFromSolution = (solution, clueTarget, seed) => {
  const random = createSeededRandom(seed);
  const puzzle = cloneBoard(solution);
  const cells = shuffle(Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => index), random);
  let clues = GRID_SIZE * GRID_SIZE;

  for (const index of cells) {
    if (clues <= clueTarget) break;
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    const previous = puzzle[row][col];
    puzzle[row][col] = 0;
    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[row][col] = previous;
      continue;
    }
    clues -= 1;
  }

  return puzzle;
};

const createSudokuMatch = (matchId, difficultyId) => {
  const safeMatchId = ((Number(matchId) || 0) + MATCH_COUNT) % MATCH_COUNT;
  const difficulty = DIFFICULTY_BY_ID[difficultyId] ?? DIFFICULTIES[1];
  const baseSeed = (((safeMatchId + 1) * 2654435761) ^ (difficulty.clues * 2246822519)) >>> 0;
  const solution = createSolvedBoard(baseSeed);
  const puzzle = createPuzzleFromSolution(solution, difficulty.clues, baseSeed ^ 3266489917);
  return { solution, puzzle, matchId: safeMatchId, difficultyId: difficulty.id };
};

const findFirstEditableCell = (puzzle) => {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
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

  for (let row = 0; row < GRID_SIZE; row += 1) {
    markDuplicates(board[row].map((value, col) => ({ row, col, value })));
  }

  for (let col = 0; col < GRID_SIZE; col += 1) {
    const column = [];
    for (let row = 0; row < GRID_SIZE; row += 1) {
      column.push({ row, col, value: board[row][col] });
    }
    markDuplicates(column);
  }

  for (let boxRow = 0; boxRow < BOX_SIZE; boxRow += 1) {
    for (let boxCol = 0; boxCol < BOX_SIZE; boxCol += 1) {
      const cells = [];
      for (let row = boxRow * BOX_SIZE; row < boxRow * BOX_SIZE + BOX_SIZE; row += 1) {
        for (let col = boxCol * BOX_SIZE; col < boxCol * BOX_SIZE + BOX_SIZE; col += 1) {
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

const buildCandidateGrid = (board) =>
  board.map((row, rowIndex) =>
    row.map((_, colIndex) => getCandidates(board, rowIndex, colIndex))
  );

const findGroupCompleteHint = (board, copy) => {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    const empties = [];
    const present = new Array(10).fill(false);
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const value = board[row][col];
      if (value === 0) {
        empties.push({ row, col });
      } else {
        present[value] = true;
      }
    }
    if (empties.length === 1) {
      const value = DIGITS.find((digit) => !present[digit]);
      if (value) {
        return {
          row: empties[0].row,
          col: empties[0].col,
          value,
          techniqueKey: TECHNIQUE_KEYS.groupComplete,
          detail: copy.reason.groupRow(row, value)
        };
      }
    }
  }

  for (let col = 0; col < GRID_SIZE; col += 1) {
    const empties = [];
    const present = new Array(10).fill(false);
    for (let row = 0; row < GRID_SIZE; row += 1) {
      const value = board[row][col];
      if (value === 0) {
        empties.push({ row, col });
      } else {
        present[value] = true;
      }
    }
    if (empties.length === 1) {
      const value = DIGITS.find((digit) => !present[digit]);
      if (value) {
        return {
          row: empties[0].row,
          col: empties[0].col,
          value,
          techniqueKey: TECHNIQUE_KEYS.groupComplete,
          detail: copy.reason.groupColumn(col, value)
        };
      }
    }
  }

  for (let boxRow = 0; boxRow < BOX_SIZE; boxRow += 1) {
    for (let boxCol = 0; boxCol < BOX_SIZE; boxCol += 1) {
      const empties = [];
      const present = new Array(10).fill(false);
      for (let row = boxRow * BOX_SIZE; row < boxRow * BOX_SIZE + BOX_SIZE; row += 1) {
        for (let col = boxCol * BOX_SIZE; col < boxCol * BOX_SIZE + BOX_SIZE; col += 1) {
          const value = board[row][col];
          if (value === 0) {
            empties.push({ row, col });
          } else {
            present[value] = true;
          }
        }
      }
      if (empties.length === 1) {
        const value = DIGITS.find((digit) => !present[digit]);
        if (value) {
          return {
            row: empties[0].row,
            col: empties[0].col,
            value,
            techniqueKey: TECHNIQUE_KEYS.groupComplete,
            detail: copy.reason.groupBox(boxRow, boxCol, value)
          };
        }
      }
    }
  }

  return null;
};

const findBoxScanHint = (board, candidates, copy) => {
  for (let boxRow = 0; boxRow < BOX_SIZE; boxRow += 1) {
    for (let boxCol = 0; boxCol < BOX_SIZE; boxCol += 1) {
      for (const value of DIGITS) {
        const positions = [];
        for (let row = boxRow * BOX_SIZE; row < boxRow * BOX_SIZE + BOX_SIZE; row += 1) {
          for (let col = boxCol * BOX_SIZE; col < boxCol * BOX_SIZE + BOX_SIZE; col += 1) {
            if (board[row][col] !== 0) continue;
            if (candidates[row][col].includes(value)) {
              positions.push({ row, col });
            }
          }
        }
        if (positions.length === 1) {
          return {
            row: positions[0].row,
            col: positions[0].col,
            value,
            techniqueKey: TECHNIQUE_KEYS.boxScan,
            detail: copy.reason.boxScan(boxRow, boxCol, value)
          };
        }
      }
    }
  }
  return null;
};

const findLineScanHint = (board, candidates, copy) => {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (const value of DIGITS) {
      const positions = [];
      for (let col = 0; col < GRID_SIZE; col += 1) {
        if (board[row][col] !== 0) continue;
        if (candidates[row][col].includes(value)) {
          positions.push({ row, col });
        }
      }
      if (positions.length === 1) {
        return {
          row: positions[0].row,
          col: positions[0].col,
          value,
          techniqueKey: TECHNIQUE_KEYS.lineScan,
          detail: copy.reason.lineScanRow(row, value)
        };
      }
    }
  }

  for (let col = 0; col < GRID_SIZE; col += 1) {
    for (const value of DIGITS) {
      const positions = [];
      for (let row = 0; row < GRID_SIZE; row += 1) {
        if (board[row][col] !== 0) continue;
        if (candidates[row][col].includes(value)) {
          positions.push({ row, col });
        }
      }
      if (positions.length === 1) {
        return {
          row: positions[0].row,
          col: positions[0].col,
          value,
          techniqueKey: TECHNIQUE_KEYS.lineScan,
          detail: copy.reason.lineScanColumn(col, value)
        };
      }
    }
  }

  return null;
};

const findCountHint = (board, candidates, copy) => {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (board[row][col] !== 0) continue;
      if (candidates[row][col].length === 1) {
        const value = candidates[row][col][0];
        return {
          row,
          col,
          value,
          techniqueKey: TECHNIQUE_KEYS.count,
          detail: copy.reason.count(toCellLabel(row, col), value)
        };
      }
    }
  }
  return null;
};

const findLogicalHint = (board, copy) => {
  const groupHint = findGroupCompleteHint(board, copy);
  if (groupHint) return groupHint;

  const candidates = buildCandidateGrid(board);
  const boxHint = findBoxScanHint(board, candidates, copy);
  if (boxHint) return boxHint;

  const lineHint = findLineScanHint(board, candidates, copy);
  if (lineHint) return lineHint;

  return findCountHint(board, candidates, copy);
};

const getRandomMatchId = () => Math.floor(Math.random() * MATCH_COUNT);

const getRandomMatchIdExcept = (matchId) => {
  if (MATCH_COUNT <= 1) return 0;
  const current = ((Number(matchId) || 0) + MATCH_COUNT) % MATCH_COUNT;
  const candidate = getRandomMatchId();
  if (candidate !== current) {
    return candidate;
  }
  return (candidate + 1 + Math.floor(Math.random() * (MATCH_COUNT - 1))) % MATCH_COUNT;
};

const createInitialState = (matchId, difficultyId, copy) => {
  const match = createSudokuMatch(matchId, difficultyId);
  return {
    matchId: match.matchId,
    difficultyId: match.difficultyId,
    puzzle: match.puzzle,
    solution: match.solution,
    board: cloneBoard(match.puzzle),
    selected: findFirstEditableCell(match.puzzle),
    conflicts: [],
    status: "playing",
    moves: 0,
    hintsUsed: 0,
    message: copy.startMessage,
    hintTarget: null,
    lastTechnique: null
  };
};

const applyCellValue = (previous, row, col, value, copy, options = {}) => {
  if (previous.status === "won") {
    return previous;
  }
  const editable = previous.puzzle[row][col] === 0;
  if (!editable) {
    return {
      ...previous,
      selected: { row, col },
      message: copy.fixedCellMessage
    };
  }

  const safeValue = value >= 1 && value <= 9 ? value : 0;
  const oldValue = previous.board[row][col];
  if (oldValue === safeValue && !options.forceMessage) {
    return {
      ...previous,
      selected: { row, col }
    };
  }

  const nextBoard = cloneBoard(previous.board);
  nextBoard[row][col] = safeValue;
  const nextConflicts = findConflicts(nextBoard);
  const solved = nextConflicts.length === 0 && isSolved(nextBoard, previous.solution);
  const changed = oldValue !== safeValue;
  const nextTechnique = options.hint?.techniqueKey ?? previous.lastTechnique;
  const hintLabel = options.hint ? copy.techniqueLabel[options.hint.techniqueKey] : null;
  const cellLabel = toCellLabel(row, col);

  let message;
  if (solved) {
    message = copy.solvedMessage;
  } else if (options.hint && hintLabel) {
    message = copy.hintAppliedMessage(hintLabel, cellLabel, safeValue, options.hint.detail);
  } else if (nextConflicts.length) {
    message = copy.conflictMessage;
  } else if (safeValue === 0) {
    message = copy.cellClearedMessage(cellLabel);
  } else {
    message = copy.cellUpdatedMessage(cellLabel, safeValue);
  }

  return {
    ...previous,
    board: nextBoard,
    selected: { row, col },
    conflicts: nextConflicts,
    moves: previous.moves + (changed ? 1 : 0),
    hintsUsed: previous.hintsUsed + (options.hint && changed ? 1 : 0),
    status: solved ? "won" : "playing",
    message,
    hintTarget: options.hint ? { row, col } : null,
    lastTechnique: nextTechnique
  };
};

function StrategySudokuGame() {
  const locale = useMemo(() => (resolveBrowserLanguage() === "es" ? "es" : "en"), []);
  const copy = useMemo(() => COPY_BY_LOCALE[locale] ?? COPY_BY_LOCALE.en, [locale]);
  const [state, setState] = useState(() =>
    createInitialState(getRandomMatchId(), "normal", copy)
  );

  const setSelectedCell = useCallback((row, col) => {
    setState((previous) => ({
      ...previous,
      selected: { row, col }
    }));
  }, []);

  const moveSelection = useCallback((deltaRow, deltaCol) => {
    setState((previous) => ({
      ...previous,
      selected: {
        row: Math.max(0, Math.min(GRID_SIZE - 1, previous.selected.row + deltaRow)),
        col: Math.max(0, Math.min(GRID_SIZE - 1, previous.selected.col + deltaCol))
      }
    }));
  }, []);

  const setValueAt = useCallback((row, col, value, options = {}) => {
    setState((previous) => applyCellValue(previous, row, col, value, copy, options));
  }, [copy]);

  const setSelectedValue = useCallback((value, options = {}) => {
    setState((previous) =>
      applyCellValue(
        previous,
        previous.selected.row,
        previous.selected.col,
        value,
        copy,
        options
      )
    );
  }, [copy]);

  const applyHint = useCallback(() => {
    setState((previous) => {
      if (previous.status === "won") {
        return previous;
      }
      const hint = findLogicalHint(previous.board, copy);
      if (!hint) {
        return {
          ...previous,
          message: copy.noHintMessage,
          hintTarget: null
        };
      }

      const editable = previous.puzzle[hint.row][hint.col] === 0;
      if (!editable) {
        return previous;
      }

      const oldValue = previous.board[hint.row][hint.col];
      if (oldValue === hint.value) {
        return {
          ...previous,
          selected: { row: hint.row, col: hint.col },
          hintTarget: { row: hint.row, col: hint.col },
          message: copy.noHintMessage
        };
      }

      const nextBoard = cloneBoard(previous.board);
      nextBoard[hint.row][hint.col] = hint.value;
      const nextConflicts = findConflicts(nextBoard);
      const solved = nextConflicts.length === 0 && isSolved(nextBoard, previous.solution);
      const cellLabel = toCellLabel(hint.row, hint.col);
      const hintLabel = copy.techniqueLabel[hint.techniqueKey];
      const message = solved
        ? copy.solvedMessage
        : copy.hintAppliedMessage(hintLabel, cellLabel, hint.value, hint.detail);

      return {
        ...previous,
        board: nextBoard,
        selected: { row: hint.row, col: hint.col },
        conflicts: nextConflicts,
        moves: previous.moves + 1,
        hintsUsed: previous.hintsUsed + 1,
        status: solved ? "won" : "playing",
        message,
        hintTarget: { row: hint.row, col: hint.col },
        lastTechnique: hint.techniqueKey
      };
    });
  }, [copy]);

  const restart = useCallback(() => {
    setState((previous) =>
      createInitialState(getRandomMatchIdExcept(previous.matchId), previous.difficultyId, copy)
    );
  }, [copy]);

  const changeDifficulty = useCallback((difficultyId) => {
    setState((previous) => {
      if (previous.difficultyId === difficultyId) {
        return previous;
      }
      return createInitialState(getRandomMatchId(), difficultyId, copy);
    });
  }, [copy]);

  useEffect(() => {
    const letterDigits = {
      q: 1,
      w: 2,
      e: 3,
      a: 4,
      s: 5,
      d: 6,
      u: 7,
      i: 8,
      o: 9
    };

    const onKeyDown = (event) => {
      const target = event.target;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = event.key;
      const normalized = key.toLowerCase();

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
      if (/^[1-9]$/.test(key)) {
        event.preventDefault();
        setSelectedValue(Number(key));
        return;
      }
      if (letterDigits[normalized]) {
        event.preventDefault();
        setSelectedValue(letterDigits[normalized]);
        return;
      }
      if (key === "Backspace" || key === "Delete") {
        event.preventDefault();
        setSelectedValue(0);
        return;
      }
      if (normalized === "p") {
        event.preventDefault();
        applyHint();
        return;
      }
      if (normalized === "r") {
        event.preventDefault();
        restart();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [applyHint, moveSelection, restart, setSelectedValue]);

  const conflictSet = useMemo(() => new Set(state.conflicts), [state.conflicts]);
  const selectedValue = state.board[state.selected.row]?.[state.selected.col] ?? 0;

  const payloadBuilder = useCallback((snapshot) => ({
    mode: "strategy",
    variant: "sudoku",
    coordinates: "origin_top_left_rows_1_to_9_columns_A_to_I",
    locale,
    match: {
      current: snapshot.matchId + 1,
      total: MATCH_COUNT
    },
    difficulty: snapshot.difficultyId,
    status: snapshot.status,
    selected: snapshot.selected,
    moves: snapshot.moves,
    hintsUsed: snapshot.hintsUsed,
    conflicts: snapshot.conflicts,
    board: snapshot.board,
    puzzle: snapshot.puzzle,
    message: snapshot.message,
    lastTechnique: snapshot.lastTechnique
  }), [locale]);

  const advanceTime = useCallback(() => undefined, []);
  useGameRuntimeBridge(state, payloadBuilder, advanceTime);

  return (
    <div className="mini-game strategy-sudoku-game">
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <button type="button" onClick={restart}>{copy.randomMatch}</button>
      </div>

      <section className="strategy-sudoku-shell">
        <div className="strategy-sudoku-toolbar">
          <div className="strategy-sudoku-difficulty">
            <span>{copy.difficulty}:</span>
            {DIFFICULTIES.map((difficulty) => (
              <button
                key={difficulty.id}
                type="button"
                className={state.difficultyId === difficulty.id ? "active" : ""}
                onClick={() => changeDifficulty(difficulty.id)}
              >
                {copy.difficultyLabel[difficulty.id]}
              </button>
            ))}
          </div>
          <div className="strategy-sudoku-status-row">
            <span>{copy.match}: {state.matchId + 1}/{MATCH_COUNT}</span>
            <span>{copy.moves}: {state.moves}</span>
            <span>{copy.conflicts}: {state.conflicts.length}</span>
            <span>{copy.hintsUsed}: {state.hintsUsed}</span>
            <span>
              {copy.status}: {state.status === "won" ? copy.statusWon : copy.statusPlaying}
            </span>
          </div>
        </div>

        <div className="strategy-sudoku-board-shell">
          <div className="strategy-sudoku-board" role="grid" aria-label={copy.boardAria}>
            {state.board.map((row, rowIndex) =>
              row.map((value, colIndex) => {
                const key = keyForCell(rowIndex, colIndex);
                const fixed = state.puzzle[rowIndex][colIndex] !== 0;
                const selected = state.selected.row === rowIndex && state.selected.col === colIndex;
                const conflict = conflictSet.has(key);
                const sameValue = selectedValue !== 0 && value === selectedValue;
                const inSelectionBox =
                  Math.floor(rowIndex / BOX_SIZE) === Math.floor(state.selected.row / BOX_SIZE) &&
                  Math.floor(colIndex / BOX_SIZE) === Math.floor(state.selected.col / BOX_SIZE);
                const peer =
                  rowIndex === state.selected.row ||
                  colIndex === state.selected.col ||
                  inSelectionBox;
                const hinted =
                  state.hintTarget?.row === rowIndex && state.hintTarget?.col === colIndex;

                return (
                  <button
                    key={key}
                    type="button"
                    className={`strategy-sudoku-cell ${fixed ? "fixed" : ""} ${selected ? "selected" : ""} ${conflict ? "conflict" : ""} ${sameValue ? "same-value" : ""} ${peer ? "peer" : ""} ${hinted ? "hinted" : ""} ${(colIndex + 1) % BOX_SIZE === 0 && colIndex < GRID_SIZE - 1 ? "block-right" : ""} ${(rowIndex + 1) % BOX_SIZE === 0 && rowIndex < GRID_SIZE - 1 ? "block-bottom" : ""}`.trim()}
                    onClick={() => setSelectedCell(rowIndex, colIndex)}
                  >
                    {value || ""}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="strategy-sudoku-keypad">
          {DIGITS.map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => setValueAt(state.selected.row, state.selected.col, digit)}
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            className="utility"
            onClick={() => setValueAt(state.selected.row, state.selected.col, 0)}
          >
            {copy.clear}
          </button>
          <button type="button" className="utility" onClick={applyHint}>{copy.hint}</button>
          <button type="button" className="utility" onClick={restart}>{copy.randomMatch}</button>
        </div>

        <div className="strategy-sudoku-techniques">
          <h5>{copy.techniquesTitle}</h5>
          <p>{copy.techniquesSubtitle}</p>
          <div className="strategy-sudoku-technique-list">
            {copy.techniques.map((technique, index) => (
              <span key={`${index}-${technique}`}>{technique}</span>
            ))}
          </div>
          <p className="strategy-sudoku-keyboard-help">{copy.keyboardHelp}</p>
        </div>
      </section>

      <p className="game-message">{state.message}</p>
      {state.lastTechnique ? (
        <p className="strategy-sudoku-last-technique">
          {copy.hint}: {copy.techniqueLabel[state.lastTechnique]}
        </p>
      ) : null}
    </div>
  );
}

export default StrategySudokuGame;
