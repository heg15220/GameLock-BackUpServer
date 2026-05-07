import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdPreviewCard from "../components/AdPreviewCard";
import {
  AD_PREVIEW_STORAGE_KEY,
  DEFAULT_AD_PREVIEW_ENABLED,
  MOBILE_APP_COMPACT_AD_SLOT,
  resolveStoredAdPreviewEnabled,
} from "../config/adPreview";
import useGameRuntimeBridge from "../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../utils/resolveBrowserLanguage";

const DIFFICULTY_PRESETS = {
  beginner: { rows: 9, cols: 9, mines: 10, labelEs: "Principiante", labelEn: "Beginner" },
  intermediate: { rows: 16, cols: 16, mines: 40, labelEs: "Intermedio", labelEn: "Intermediate" },
  expert: { rows: 16, cols: 30, mines: 99, labelEs: "Experto", labelEn: "Expert" },
};

const AI_LEVELS = {
  beginner: { labelEs: "IA basica", labelEn: "Basic AI" },
  intermediate: { labelEs: "IA tactica", labelEn: "Tactical AI" },
  expert: { labelEs: "IA avanzada", labelEn: "Advanced AI" },
};

const NUMBER_COLORS = {
  1: "#2563eb",
  2: "#15803d",
  3: "#b91c1c",
  4: "#4338ca",
  5: "#7c2d12",
  6: "#0f766e",
  7: "#334155",
  8: "#0f172a",
};

const NEIGHBOR_OFFSETS = [
  { row: -1, col: -1 },
  { row: -1, col: 0 },
  { row: -1, col: 1 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
];

const INITIAL_DIFFICULTY = "beginner";
const INITIAL_AI_LEVEL = "intermediate";
const INITIAL_CUSTOM_CONFIG = { rows: 12, cols: 20, mines: 38 };
const COMPETITIVE_RIVALS = 25;
const LONG_PRESS_MS = 360;

function readAdPreviewEnabled() {
  if (typeof window === "undefined") {
    return DEFAULT_AD_PREVIEW_ENABLED;
  }
  const stored = window.localStorage.getItem(AD_PREVIEW_STORAGE_KEY);
  return resolveStoredAdPreviewEnabled(stored);
}

const COMPETITIVE_NAMES_ES = [
  "Atlas", "Nexus", "Vulcan", "Nova", "Aquila", "Orion", "Iris", "Draco", "Lyra",
  "Titan", "Kappa", "Rayo", "Pixel", "Vector", "Helix", "Raptor", "Delta", "Kronos",
  "Sigma", "Zenit", "Echo", "Spectra", "Cometa", "Boreal", "Fenix", "Aster", "Trueno",
  "Vega", "Mamba", "Cirrus", "Onix", "Nebula"
];

const COMPETITIVE_NAMES_EN = [
  "Atlas", "Nexus", "Vulcan", "Nova", "Aquila", "Orion", "Iris", "Draco", "Lyra",
  "Titan", "Kappa", "Ray", "Pixel", "Vector", "Helix", "Raptor", "Delta", "Kronos",
  "Sigma", "Zenith", "Echo", "Spectra", "Comet", "Boreal", "Phoenix", "Aster", "Thunder",
  "Vega", "Mamba", "Cirrus", "Onyx", "Nebula"
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function computeScore(openedSafe, safeTarget, elapsedMs, mode) {
  const seconds = Math.floor(Math.max(0, elapsedMs) / 1000);
  const progressScore = Math.max(0, openedSafe) * 100;
  const winBonus = mode === "won" ? 1500 + Math.max(0, 700 - seconds * 4) : 0;
  const timePenalty = seconds * 2;
  return Math.max(0, Math.round(progressScore + winBonus - timePenalty));
}

function hashStringToSeed(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createCompetitiveRivals(seedTag, safeTarget, localeIsEs) {
  const rng = createRng(hashStringToSeed(seedTag));
  const names = localeIsEs ? COMPETITIVE_NAMES_ES : COMPETITIVE_NAMES_EN;
  const rivals = [];

  for (let index = 0; index < COMPETITIVE_RIVALS; index += 1) {
    const baseName = names[index % names.length];
    const suffix = Math.floor(rng() * 90 + 10);
    const name = `${baseName}-${suffix}`;
    const solved = rng() < 0.32;
    const progressRatio = solved
      ? 1
      : clamp(0.45 + rng() * 0.52 - index * 0.003, 0.18, 0.96);
    const openedSafe = clamp(
      Math.round(safeTarget * progressRatio),
      1,
      safeTarget
    );
    const seconds = solved
      ? Math.round(42 + rng() * 160 + index * 1.6)
      : Math.round(85 + rng() * 240 + index * 2.2);
    const mode = solved ? "won" : "playing";

    rivals.push({
      id: `rival-${index + 1}`,
      name,
      openedSafe,
      safeTarget,
      timeSeconds: seconds,
      mode,
      score: computeScore(openedSafe, safeTarget, seconds * 1000, mode),
    });
  }

  return rivals;
}

function createCell() {
  return {
    mine: false,
    around: 0,
    revealed: false,
    flagged: false,
    question: false,
    exploded: false,
  };
}

function createEmptyBoard(rows, cols) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => createCell())
  );
}

function cloneBoard(board) {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

function forEachNeighbor(rows, cols, row, col, callback) {
  for (const offset of NEIGHBOR_OFFSETS) {
    const nextRow = row + offset.row;
    const nextCol = col + offset.col;
    if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) {
      continue;
    }
    callback(nextRow, nextCol);
  }
}

function placeMinesAndHints(board, rows, cols, mineCount, safeRow, safeCol) {
  const blocked = new Set();
  blocked.add(`${safeRow}:${safeCol}`);
  forEachNeighbor(rows, cols, safeRow, safeCol, (row, col) => {
    blocked.add(`${row}:${col}`);
  });

  const candidates = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!blocked.has(`${row}:${col}`)) {
        candidates.push({ row, col });
      }
    }
  }

  const minesToPlace = Math.min(mineCount, candidates.length);
  for (let index = 0; index < minesToPlace; index += 1) {
    const swapIndex =
      index + Math.floor(Math.random() * Math.max(1, candidates.length - index));
    const temp = candidates[index];
    candidates[index] = candidates[swapIndex];
    candidates[swapIndex] = temp;

    const spot = candidates[index];
    board[spot.row][spot.col].mine = true;
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cell = board[row][col];
      if (cell.mine) {
        continue;
      }
      let minesAround = 0;
      forEachNeighbor(rows, cols, row, col, (nextRow, nextCol) => {
        if (board[nextRow][nextCol].mine) {
          minesAround += 1;
        }
      });
      cell.around = minesAround;
    }
  }
}

function revealConnectedSafeCells(board, rows, cols, startRow, startCol) {
  const queue = [{ row: startRow, col: startCol }];
  let openedSafe = 0;

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) {
      continue;
    }
    const cell = board[current.row][current.col];
    if (cell.revealed || cell.flagged || cell.mine) {
      continue;
    }

    cell.revealed = true;
    cell.question = false;
    openedSafe += 1;

    if (cell.around !== 0) {
      continue;
    }

    forEachNeighbor(rows, cols, current.row, current.col, (nextRow, nextCol) => {
      const nextCell = board[nextRow][nextCol];
      if (!nextCell.revealed && !nextCell.flagged && !nextCell.mine) {
        queue.push({ row: nextRow, col: nextCol });
      }
    });
  }

  return openedSafe;
}

function revealAllMines(board, explodedRow, explodedCol) {
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const cell = board[row][col];
      if (cell.mine) {
        cell.revealed = true;
        cell.exploded = row === explodedRow && col === explodedCol;
      }
    }
  }
}

function openAroundIfFlagsMatch(board, rows, cols, row, col) {
  const centerCell = board[row][col];
  if (!centerCell.revealed || centerCell.around <= 0) {
    return { openedSafe: 0, explodedCell: null };
  }

  let flaggedAround = 0;
  const candidates = [];
  forEachNeighbor(rows, cols, row, col, (nextRow, nextCol) => {
    const cell = board[nextRow][nextCol];
    if (cell.flagged) {
      flaggedAround += 1;
    } else if (!cell.revealed) {
      candidates.push({ row: nextRow, col: nextCol });
    }
  });

  if (flaggedAround !== centerCell.around) {
    return { openedSafe: 0, explodedCell: null };
  }

  let openedSafe = 0;
  let explodedCell = null;

  for (const candidate of candidates) {
    const cell = board[candidate.row][candidate.col];
    if (cell.revealed || cell.flagged) {
      continue;
    }
    if (cell.mine) {
      explodedCell = { row: candidate.row, col: candidate.col };
      revealAllMines(board, candidate.row, candidate.col);
      break;
    }
    openedSafe += revealConnectedSafeCells(
      board,
      rows,
      cols,
      candidate.row,
      candidate.col
    );
  }

  return { openedSafe, explodedCell };
}

function countFlags(board) {
  let flags = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell.flagged) {
        flags += 1;
      }
    }
  }
  return flags;
}

function clampCustomConfig(config) {
  const rows = clamp(Number(config.rows) || 12, 8, 24);
  const cols = clamp(Number(config.cols) || 20, 8, 30);
  const maxMines = Math.max(1, rows * cols - 9);
  const mines = clamp(Number(config.mines) || 20, 1, maxMines);
  return { rows, cols, mines };
}

function createGameState(config, difficultyId, aiLevelId) {
  return {
    mode: "ready",
    board: createEmptyBoard(config.rows, config.cols),
    rows: config.rows,
    cols: config.cols,
    minesTotal: config.mines,
    openedSafe: 0,
    flagsPlaced: 0,
    firstMoveDone: false,
    elapsedMs: 0,
    cursor: { row: 0, col: 0 },
    explodedCell: null,
    difficultyId,
    aiLevelId,
    aiLastDecision: null,
  };
}

function collectDeterministicMoves(board, rows, cols, onlyBasicPatterns) {
  const revealMap = new Map();
  const flagMap = new Map();

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cell = board[row][col];
      if (!cell.revealed || cell.mine || cell.around <= 0) {
        continue;
      }
      if (onlyBasicPatterns && cell.around > 2) {
        continue;
      }

      let flaggedAround = 0;
      const hiddenNeighbors = [];
      forEachNeighbor(rows, cols, row, col, (nextRow, nextCol) => {
        const neighbor = board[nextRow][nextCol];
        if (neighbor.flagged) {
          flaggedAround += 1;
        } else if (!neighbor.revealed) {
          hiddenNeighbors.push({ row: nextRow, col: nextCol });
        }
      });

      if (hiddenNeighbors.length === 0) {
        continue;
      }

      const minesMissing = cell.around - flaggedAround;
      if (minesMissing === 0) {
        for (const move of hiddenNeighbors) {
          revealMap.set(`${move.row}:${move.col}`, move);
        }
      } else if (minesMissing === hiddenNeighbors.length) {
        for (const move of hiddenNeighbors) {
          flagMap.set(`${move.row}:${move.col}`, move);
        }
      }
    }
  }

  return {
    revealMoves: Array.from(revealMap.values()),
    flagMoves: Array.from(flagMap.values()),
  };
}

function pickSafestHiddenCell(board, rows, cols, minesRemaining) {
  const hiddenCells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cell = board[row][col];
      if (!cell.revealed && !cell.flagged) {
        hiddenCells.push({ row, col });
      }
    }
  }

  if (hiddenCells.length === 0) {
    return null;
  }

  const globalRisk = minesRemaining / hiddenCells.length;
  let best = null;

  for (const candidate of hiddenCells) {
    const localRisks = [];

    forEachNeighbor(rows, cols, candidate.row, candidate.col, (nextRow, nextCol) => {
      const clueCell = board[nextRow][nextCol];
      if (!clueCell.revealed || clueCell.mine || clueCell.around <= 0) {
        return;
      }

      let flaggedAround = 0;
      const hiddenAround = [];
      forEachNeighbor(rows, cols, nextRow, nextCol, (aroundRow, aroundCol) => {
        const aroundCell = board[aroundRow][aroundCol];
        if (aroundCell.flagged) {
          flaggedAround += 1;
        } else if (!aroundCell.revealed) {
          hiddenAround.push({ row: aroundRow, col: aroundCol });
        }
      });

      if (hiddenAround.length === 0) {
        return;
      }

      const participates = hiddenAround.some(
        (spot) => spot.row === candidate.row && spot.col === candidate.col
      );
      if (!participates) {
        return;
      }

      const minesMissing = clueCell.around - flaggedAround;
      if (minesMissing <= 0) {
        localRisks.push(0);
      } else {
        localRisks.push(minesMissing / hiddenAround.length);
      }
    });

    const risk = localRisks.length > 0 ? Math.max(...localRisks) : globalRisk;

    if (!best || risk < best.risk) {
      best = { ...candidate, risk };
    }
  }

  return best;
}

function pickAiDecision(state, aiLevelId) {
  if (state.mode === "lost" || state.mode === "won") {
    return null;
  }

  const deterministic = collectDeterministicMoves(
    state.board,
    state.rows,
    state.cols,
    aiLevelId === "beginner"
  );

  if (deterministic.revealMoves.length > 0) {
    const move =
      deterministic.revealMoves[
        Math.floor(Math.random() * deterministic.revealMoves.length)
      ];
    return {
      type: "reveal",
      row: move.row,
      col: move.col,
      source: "logic",
      confidence: 1,
      risk: 0,
    };
  }

  if (deterministic.flagMoves.length > 0) {
    const move =
      deterministic.flagMoves[
        Math.floor(Math.random() * deterministic.flagMoves.length)
      ];
    return {
      type: "flag",
      row: move.row,
      col: move.col,
      source: "logic",
      confidence: 1,
      risk: 1,
    };
  }

  const hiddenCells = [];
  for (let row = 0; row < state.rows; row += 1) {
    for (let col = 0; col < state.cols; col += 1) {
      const cell = state.board[row][col];
      if (!cell.revealed && !cell.flagged) {
        hiddenCells.push({ row, col });
      }
    }
  }

  if (hiddenCells.length === 0) {
    return null;
  }

  if (aiLevelId === "intermediate") {
    return null;
  }

  if (aiLevelId === "expert") {
    const safest = pickSafestHiddenCell(
      state.board,
      state.rows,
      state.cols,
      Math.max(0, state.minesTotal - state.flagsPlaced)
    );
    if (!safest) {
      return null;
    }
    return {
      type: "reveal",
      row: safest.row,
      col: safest.col,
      source: "probability",
      confidence: Math.max(0.2, 1 - safest.risk),
      risk: safest.risk,
    };
  }

  const randomMove = hiddenCells[Math.floor(Math.random() * hiddenCells.length)];
  return {
    type: "reveal",
    row: randomMove.row,
    col: randomMove.col,
    source: "random",
    confidence: 0.15,
    risk: null,
  };
}

function applyRevealMove(prev, row, col) {
  if (row < 0 || row >= prev.rows || col < 0 || col >= prev.cols) {
    return prev;
  }
  if (prev.mode === "won" || prev.mode === "lost") {
    return prev;
  }

  const sourceCell = prev.board[row][col];
  if (sourceCell.flagged) {
    return prev;
  }

  const safeTarget = prev.rows * prev.cols - prev.minesTotal;

  if (prev.firstMoveDone && sourceCell.revealed) {
    const board = cloneBoard(prev.board);
    const aroundResult = openAroundIfFlagsMatch(board, prev.rows, prev.cols, row, col);
    if (aroundResult.openedSafe === 0 && !aroundResult.explodedCell) {
      return prev;
    }

    const openedSafe = prev.openedSafe + aroundResult.openedSafe;
    let mode = aroundResult.explodedCell ? "lost" : "playing";
    let flagsPlaced = prev.flagsPlaced;

    if (!aroundResult.explodedCell && openedSafe >= safeTarget) {
      mode = "won";
      for (let boardRow = 0; boardRow < prev.rows; boardRow += 1) {
        for (let boardCol = 0; boardCol < prev.cols; boardCol += 1) {
          const cell = board[boardRow][boardCol];
          if (cell.mine) {
            cell.revealed = true;
            cell.flagged = true;
          }
        }
      }
      flagsPlaced = prev.minesTotal;
    }

    return {
      ...prev,
      board,
      mode,
      openedSafe,
      flagsPlaced,
      explodedCell: aroundResult.explodedCell,
    };
  }

  const board = cloneBoard(prev.board);
  if (!prev.firstMoveDone) {
    placeMinesAndHints(board, prev.rows, prev.cols, prev.minesTotal, row, col);
  }

  const targetCell = board[row][col];
  if (targetCell.revealed || targetCell.flagged) {
    return prev;
  }

  if (targetCell.mine) {
    revealAllMines(board, row, col);
    return {
      ...prev,
      board,
      mode: "lost",
      firstMoveDone: true,
      explodedCell: { row, col },
    };
  }

  const openedSafe = prev.openedSafe + revealConnectedSafeCells(board, prev.rows, prev.cols, row, col);
  let mode = "playing";
  let flagsPlaced = prev.flagsPlaced;

  if (openedSafe >= safeTarget) {
    mode = "won";
    for (let boardRow = 0; boardRow < prev.rows; boardRow += 1) {
      for (let boardCol = 0; boardCol < prev.cols; boardCol += 1) {
        const cell = board[boardRow][boardCol];
        if (cell.mine) {
          cell.revealed = true;
          cell.flagged = true;
        }
      }
    }
    flagsPlaced = prev.minesTotal;
  }

  return {
    ...prev,
    board,
    mode,
    firstMoveDone: true,
    openedSafe,
    flagsPlaced,
    explodedCell: null,
  };
}

function applyMarkMove(prev, row, col) {
  if (row < 0 || row >= prev.rows || col < 0 || col >= prev.cols) {
    return prev;
  }
  if (prev.mode === "won" || prev.mode === "lost") {
    return prev;
  }

  const board = cloneBoard(prev.board);
  const targetCell = board[row][col];
  if (targetCell.revealed) {
    return prev;
  }

  if (targetCell.flagged) {
    targetCell.flagged = false;
    targetCell.question = true;
  } else if (targetCell.question) {
    targetCell.question = false;
  } else {
    targetCell.flagged = true;
    targetCell.question = false;
  }

  return {
    ...prev,
    board,
    flagsPlaced: countFlags(board),
  };
}

function formatTimer(elapsedMs) {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getCellSymbol(cell) {
  if (cell.flagged && !cell.revealed) {
    return "F";
  }
  if (cell.question && !cell.revealed) {
    return "?";
  }
  if (!cell.revealed) {
    return ".";
  }
  if (cell.mine) {
    return cell.exploded ? "X" : "M";
  }
  return String(cell.around);
}

function toBoardSnapshot(board) {
  return board.map((row) => row.map((cell) => getCellSymbol(cell)).join(""));
}

function formatAiFeedback(decision, localeIsEs, executed) {
  if (!decision) {
    return localeIsEs
      ? "La IA no detecta una jugada segura con su nivel actual."
      : "The AI did not find a safe move at this level.";
  }

  const verb =
    decision.type === "flag"
      ? localeIsEs
        ? executed
          ? "marca"
          : "marcaria"
        : executed
          ? "flags"
          : "would flag"
      : localeIsEs
        ? executed
          ? "abre"
          : "abriria"
        : executed
          ? "opens"
          : "would open";
  const origin =
    decision.source === "logic"
      ? localeIsEs
        ? "logica"
        : "logic"
      : decision.source === "probability"
        ? localeIsEs
          ? "probabilidad"
          : "probability"
        : localeIsEs
          ? "aleatorio"
          : "random";
  const riskText =
    typeof decision.risk === "number"
      ? localeIsEs
        ? ` Riesgo estimado: ${Math.round(decision.risk * 100)}%.`
        : ` Estimated risk: ${Math.round(decision.risk * 100)}%.`
      : "";
  const coordinate = `(${decision.row + 1}, ${decision.col + 1})`;

  return localeIsEs
    ? `IA ${verb} ${coordinate} usando ${origin}.${riskText}`
    : `AI ${verb} ${coordinate} using ${origin}.${riskText}`;
}

function MinesweeperGame() {
  const locale = useMemo(resolveBrowserLanguage, []);
  const localeIsEs = locale === "es";

  const [difficultyId, setDifficultyId] = useState(INITIAL_DIFFICULTY);
  const [aiLevelId, setAiLevelId] = useState(INITIAL_AI_LEVEL);
  const [matchMode, setMatchMode] = useState("casual");
  const [customConfig, setCustomConfig] = useState(INITIAL_CUSTOM_CONFIG);
  const [flagMode, setFlagMode] = useState(false);
  const [showAdPreview, setShowAdPreview] = useState(readAdPreviewEnabled);
  const [aiFeedback, setAiFeedback] = useState("");
  const [competitiveRivals, setCompetitiveRivals] = useState([]);
  const [game, setGame] = useState(() =>
    createGameState(DIFFICULTY_PRESETS[INITIAL_DIFFICULTY], INITIAL_DIFFICULTY, INITIAL_AI_LEVEL)
  );
  const touchStateRef = useRef(new Map());
  const touchIgnoreClickRef = useRef(new Map());
  const rowOptions = useMemo(() => Array.from({ length: 17 }, (_, index) => 8 + index), []);
  const colOptions = useMemo(() => Array.from({ length: 23 }, (_, index) => 8 + index), []);
  const mineOptions = useMemo(() => {
    const maxMines = Math.max(
      1,
      Number(customConfig.rows) * Number(customConfig.cols) - 1
    );
    return Array.from({ length: maxMines }, (_, index) => index + 1);
  }, [customConfig.cols, customConfig.rows]);

  const startNewGame = useCallback(
    (
      nextDifficultyId = difficultyId,
      nextCustomConfig = customConfig,
      nextMatchMode = matchMode
    ) => {
      const config =
        nextDifficultyId === "custom"
          ? clampCustomConfig(nextCustomConfig)
          : DIFFICULTY_PRESETS[nextDifficultyId] ?? DIFFICULTY_PRESETS.beginner;
      setGame(createGameState(config, nextDifficultyId, aiLevelId));
      if (nextMatchMode === "competitive") {
        const safeTarget = config.rows * config.cols - config.mines;
        const seedTag = `${Date.now()}-${Math.random()}`;
        setCompetitiveRivals(createCompetitiveRivals(seedTag, safeTarget, localeIsEs));
      } else {
        setCompetitiveRivals([]);
      }
      setAiFeedback("");
      setFlagMode(false);
    },
    [aiLevelId, customConfig, difficultyId, localeIsEs, matchMode]
  );

  const runCellAction = useCallback((row, col, actionType) => {
    setGame((prev) => {
      const cursorChanged =
        prev.cursor.row !== row || prev.cursor.col !== col
          ? { ...prev, cursor: { row, col } }
          : prev;
      const nextState =
        actionType === "mark"
          ? applyMarkMove(cursorChanged, row, col)
          : applyRevealMove(cursorChanged, row, col);
      return nextState;
    });
    setAiFeedback("");
  }, []);

  const clearTouchState = useCallback((key) => {
    const snapshot = touchStateRef.current.get(key);
    if (!snapshot) {
      return null;
    }
    window.clearTimeout(snapshot.timerId);
    touchStateRef.current.delete(key);
    return snapshot;
  }, []);

  const markTouchClickIgnore = useCallback((key) => {
    touchIgnoreClickRef.current.set(key, Date.now() + 700);
  }, []);

  const shouldIgnoreClick = useCallback((key) => {
    const expiresAt = touchIgnoreClickRef.current.get(key);
    if (!expiresAt) {
      return false;
    }
    if (expiresAt < Date.now()) {
      touchIgnoreClickRef.current.delete(key);
      return false;
    }
    return true;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleStorage = (event) => {
      if (event.key !== AD_PREVIEW_STORAGE_KEY) {
        return;
      }
      setShowAdPreview(resolveStoredAdPreviewEnabled(event.newValue));
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const moveCursor = useCallback((deltaRow, deltaCol) => {
    setGame((prev) => {
      const nextRow = clamp(prev.cursor.row + deltaRow, 0, prev.rows - 1);
      const nextCol = clamp(prev.cursor.col + deltaCol, 0, prev.cols - 1);
      if (nextRow === prev.cursor.row && nextCol === prev.cursor.col) {
        return prev;
      }
      return {
        ...prev,
        cursor: { row: nextRow, col: nextCol },
      };
    });
  }, []);

  const runCursorAction = useCallback((actionType) => {
    setGame((prev) => {
      const row = prev.cursor.row;
      const col = prev.cursor.col;
      return actionType === "mark"
        ? applyMarkMove(prev, row, col)
        : applyRevealMove(prev, row, col);
    });
    setAiFeedback("");
  }, []);

  const requestAiHint = useCallback(() => {
    const decision = pickAiDecision(game, aiLevelId);
    setGame((prev) => ({
      ...prev,
      aiLastDecision: decision,
    }));
    setAiFeedback(formatAiFeedback(decision, localeIsEs, false));
  }, [aiLevelId, game, localeIsEs]);

  const applyAiMove = useCallback(() => {
    let decision = null;

    setGame((prev) => {
      decision = pickAiDecision(prev, aiLevelId);
      if (!decision) {
        return prev;
      }

      const movedState =
        decision.type === "flag"
          ? applyMarkMove(prev, decision.row, decision.col)
          : applyRevealMove(prev, decision.row, decision.col);

      if (movedState === prev) {
        return prev;
      }

      return {
        ...movedState,
        cursor: { row: decision.row, col: decision.col },
        aiLastDecision: decision,
      };
    });

    setAiFeedback(formatAiFeedback(decision, localeIsEs, true));
  }, [aiLevelId, localeIsEs]);

  useEffect(() => {
    if (game.mode !== "playing") {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setGame((prev) =>
        prev.mode === "playing"
          ? { ...prev, elapsedMs: prev.elapsedMs + 1000 }
          : prev
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [game.mode]);

  useEffect(() => {
    return () => {
      for (const snapshot of touchStateRef.current.values()) {
        window.clearTimeout(snapshot.timerId);
      }
      touchStateRef.current.clear();
      touchIgnoreClickRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveCursor(-1, 0);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveCursor(1, 0);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveCursor(0, -1);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveCursor(0, 1);
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        runCursorAction(flagMode ? "mark" : "reveal");
        return;
      }
      if (key === "f") {
        event.preventDefault();
        runCursorAction("mark");
        return;
      }
      if (key === "h") {
        event.preventDefault();
        requestAiHint();
        return;
      }
      if (key === "a") {
        event.preventDefault();
        applyAiMove();
        return;
      }
      if (key === "r") {
        event.preventDefault();
        startNewGame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [applyAiMove, flagMode, moveCursor, requestAiHint, runCursorAction, startNewGame]);

  const safeTarget = game.rows * game.cols - game.minesTotal;
  const safeCellsLeft = safeTarget - game.openedSafe;
  const minesRemaining = game.minesTotal - game.flagsPlaced;
  const timerLabel = formatTimer(game.elapsedMs);
  const playerScore = computeScore(game.openedSafe, safeTarget, game.elapsedMs, game.mode);
  const playerSeconds = Math.floor(game.elapsedMs / 1000);
  const boardCellSize =
    game.cols >= 26 ? 20 : game.cols >= 20 ? 22 : game.cols >= 16 ? 24 : 28;

  const leaderboard = useMemo(() => {
    if (matchMode !== "competitive") {
      return [];
    }
    const playerEntry = {
      id: "player",
      name: localeIsEs ? "Tu" : "You",
      openedSafe: game.openedSafe,
      safeTarget,
      timeSeconds: playerSeconds,
      mode: game.mode,
      score: playerScore,
      isPlayer: true,
    };
    return [playerEntry, ...competitiveRivals]
      .sort((entryA, entryB) => {
        if (entryB.score !== entryA.score) {
          return entryB.score - entryA.score;
        }
        if (entryA.timeSeconds !== entryB.timeSeconds) {
          return entryA.timeSeconds - entryB.timeSeconds;
        }
        return entryA.name.localeCompare(entryB.name);
      })
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [
    competitiveRivals,
    game.mode,
    game.openedSafe,
    localeIsEs,
    matchMode,
    playerScore,
    playerSeconds,
    safeTarget,
  ]);

  const playerRanking =
    matchMode === "competitive"
      ? leaderboard.find((entry) => entry.isPlayer)?.rank ?? null
      : null;

  const statusLine = useMemo(() => {
    if (game.mode === "ready") {
      return localeIsEs
        ? "Primer clic siempre seguro. Marca minas con click derecho o pulsacion larga en movil."
        : "First click is always safe. Mark mines with right click or long press on mobile.";
    }
    if (game.mode === "lost") {
      return localeIsEs
        ? `Has detonado una mina. Puntuacion final: ${playerScore}.`
        : `You triggered a mine. Final score: ${playerScore}.`;
    }
    if (game.mode === "won") {
      return localeIsEs
        ? `Victoria. Todas las celdas seguras abiertas. Puntuacion: ${playerScore}.`
        : `Victory. All safe cells opened. Score: ${playerScore}.`;
    }
    return localeIsEs
      ? `Partida en curso. Celdas seguras pendientes: ${safeCellsLeft}. Puntuacion actual: ${playerScore}.`
      : `Run in progress. Safe cells remaining: ${safeCellsLeft}. Current score: ${playerScore}.`;
  }, [game.mode, localeIsEs, playerScore, safeCellsLeft]);

  const buildTextPayload = useCallback((state) => {
    const safePending = state.rows * state.cols - state.minesTotal - state.openedSafe;
    const safeTargetCount = state.rows * state.cols - state.minesTotal;
    const currentScore = computeScore(
      state.openedSafe,
      safeTargetCount,
      state.elapsedMs,
      state.mode
    );
    const difficultyPreset = DIFFICULTY_PRESETS[state.difficultyId];
    const difficultyLabel =
      state.difficultyId === "custom"
        ? "custom"
        : difficultyPreset
          ? difficultyPreset.labelEn.toLowerCase()
          : state.difficultyId;

    return {
      variant: "minesweeper-classic",
      mode: state.mode,
      boardSize: { rows: state.rows, cols: state.cols },
      coordinateSystem: "origin top-left; x grows to the right; y grows downward",
      difficultyId: state.difficultyId,
      difficultyLabel,
      aiLevelId: state.aiLevelId,
      firstClickSafe: true,
      minesTotal: state.minesTotal,
      flagsPlaced: state.flagsPlaced,
      minesRemaining: state.minesTotal - state.flagsPlaced,
      openedSafe: state.openedSafe,
      scoringRule: "score = discoveredSafe*100 + winBonus - timeSeconds*2",
      score: currentScore,
      safeCellsLeft: safePending,
      timerSeconds: Math.floor(state.elapsedMs / 1000),
      matchMode,
      ranking: matchMode === "competitive" ? playerRanking : null,
      cursor: { x: state.cursor.col, y: state.cursor.row },
      aiLastDecision: state.aiLastDecision
        ? {
            type: state.aiLastDecision.type,
            row: state.aiLastDecision.row,
            col: state.aiLastDecision.col,
            source: state.aiLastDecision.source,
            confidence: state.aiLastDecision.confidence,
            risk: state.aiLastDecision.risk,
          }
        : null,
      leaderboardTop5:
        matchMode === "competitive"
          ? leaderboard.slice(0, 5).map((entry) => ({
              rank: entry.rank,
              name: entry.name,
              score: entry.score,
              timeSeconds: entry.timeSeconds,
              isPlayer: Boolean(entry.isPlayer),
            }))
          : [],
      board: toBoardSnapshot(state.board),
    };
  }, [leaderboard, matchMode, playerRanking]);

  const advanceTime = useCallback((ms) => {
    const safeMs = Math.max(0, Number(ms) || 0);
    if (safeMs <= 0) {
      return;
    }
    setGame((prev) =>
      prev.mode === "playing"
        ? { ...prev, elapsedMs: prev.elapsedMs + safeMs }
        : prev
    );
  }, []);

  useGameRuntimeBridge(game, buildTextPayload, advanceTime);

  const labelForDifficulty = (id) => {
    const preset = DIFFICULTY_PRESETS[id];
    if (!preset) {
      return localeIsEs ? "Personalizado" : "Custom";
    }
    return localeIsEs ? preset.labelEs : preset.labelEn;
  };

  const labelForAiLevel = (id) => {
    const level = AI_LEVELS[id];
    return localeIsEs ? level.labelEs : level.labelEn;
  };

  const handleDifficultyChange = (event) => {
    const nextDifficultyId = event.target.value;
    setDifficultyId(nextDifficultyId);
    if (nextDifficultyId === "custom") {
      const clamped = clampCustomConfig(customConfig);
      setCustomConfig(clamped);
      startNewGame("custom", clamped);
      return;
    }
    startNewGame(nextDifficultyId);
  };

  const handleAiLevelChange = (event) => {
    const nextAiLevelId = event.target.value;
    setAiLevelId(nextAiLevelId);
    setGame((prev) => ({
      ...prev,
      aiLevelId: nextAiLevelId,
      aiLastDecision: null,
    }));
    setAiFeedback("");
  };

  const handleMatchModeChange = (event) => {
    const nextMode = event.target.value;
    setMatchMode(nextMode);
    startNewGame(difficultyId, customConfig, nextMode);
  };

  const handleApplyCustom = () => {
    const clamped = clampCustomConfig(customConfig);
    setCustomConfig(clamped);
    setDifficultyId("custom");
    startNewGame("custom", clamped);
  };

  const handleCustomRowsChange = (event) => {
    const nextRows = Number(event.target.value);
    setCustomConfig((prev) => {
      const nextMaxMines = Math.max(1, nextRows * Number(prev.cols) - 1);
      return {
        ...prev,
        rows: nextRows,
        mines: clamp(Number(prev.mines), 1, nextMaxMines),
      };
    });
  };

  const handleCustomColsChange = (event) => {
    const nextCols = Number(event.target.value);
    setCustomConfig((prev) => {
      const nextMaxMines = Math.max(1, Number(prev.rows) * nextCols - 1);
      return {
        ...prev,
        cols: nextCols,
        mines: clamp(Number(prev.mines), 1, nextMaxMines),
      };
    });
  };

  const handleCustomMinesChange = (event) => {
    const nextMines = Number(event.target.value);
    setCustomConfig((prev) => ({
      ...prev,
      mines: nextMines,
    }));
  };

  return (
    <div className="mini-game minesweeper-game">
      <div className="mini-head" data-mobile-menu-root="true">
        <div>
          <h4>{localeIsEs ? "Buscaminas IA Classic" : "Minesweeper IA Classic"}</h4>
          <p>
            {localeIsEs
              ? "Buscaminas con primer clic seguro, banderas, teclado y tres perfiles de IA."
              : "Minesweeper with safe first click, flags, keyboard controls and three AI profiles."}
          </p>
        </div>
        <div className="mines-toolbar">
          <label>
            <span>{localeIsEs ? "Modo" : "Mode"}</span>
            <select value={matchMode} onChange={handleMatchModeChange}>
              <option value="casual">{localeIsEs ? "Casual" : "Casual"}</option>
              <option value="competitive">{localeIsEs ? "Competitivo" : "Competitive"}</option>
            </select>
          </label>
          <label>
            <span>{localeIsEs ? "Dificultad" : "Difficulty"}</span>
            <select value={difficultyId} onChange={handleDifficultyChange}>
              <option value="beginner">{labelForDifficulty("beginner")}</option>
              <option value="intermediate">{labelForDifficulty("intermediate")}</option>
              <option value="expert">{labelForDifficulty("expert")}</option>
              <option value="custom">{localeIsEs ? "Personalizado" : "Custom"}</option>
            </select>
          </label>
          <label>
            <span>{localeIsEs ? "Nivel IA" : "AI level"}</span>
            <select value={aiLevelId} onChange={handleAiLevelChange}>
              <option value="beginner">{labelForAiLevel("beginner")}</option>
              <option value="intermediate">{labelForAiLevel("intermediate")}</option>
              <option value="expert">{labelForAiLevel("expert")}</option>
            </select>
          </label>
          <button type="button" onClick={() => startNewGame()}>
            {localeIsEs ? "Reiniciar" : "Restart"}
          </button>
          <button type="button" onClick={requestAiHint}>
            {localeIsEs ? "Sugerencia IA" : "AI hint"}
          </button>
          <button type="button" onClick={applyAiMove}>
            {localeIsEs ? "Jugada IA" : "AI move"}
          </button>
          <button
            type="button"
            className={flagMode ? "active" : ""}
            onClick={() => setFlagMode((prev) => !prev)}
          >
            {localeIsEs ? "Modo bandera" : "Flag mode"}
          </button>
        </div>
      </div>

      <div className="mines-custom-panel" data-mobile-menu-root="true">
        <label>
          <span>{localeIsEs ? "Filas" : "Rows"}</span>
          <select value={String(customConfig.rows)} onChange={handleCustomRowsChange}>
            {rowOptions.map((rows) => (
              <option key={`rows-${rows}`} value={rows}>
                {rows}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{localeIsEs ? "Columnas" : "Columns"}</span>
          <select value={String(customConfig.cols)} onChange={handleCustomColsChange}>
            {colOptions.map((cols) => (
              <option key={`cols-${cols}`} value={cols}>
                {cols}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{localeIsEs ? "Minas" : "Mines"}</span>
          <select value={String(customConfig.mines)} onChange={handleCustomMinesChange}>
            {mineOptions.map((mines) => (
              <option key={`mines-${mines}`} value={mines}>
                {mines}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={handleApplyCustom}>
          {localeIsEs ? "Aplicar personalizado" : "Apply custom"}
        </button>
      </div>

      <div className="mines-hud">
        <div>
          <span>{localeIsEs ? "Tiempo" : "Time"}</span>
          <strong>{timerLabel}</strong>
        </div>
        <div>
          <span>{localeIsEs ? "Minas restantes" : "Mines left"}</span>
          <strong>{minesRemaining}</strong>
        </div>
        <div>
          <span>{localeIsEs ? "Celdas seguras" : "Safe cells"}</span>
          <strong>{safeCellsLeft}</strong>
        </div>
        <div>
          <span>{localeIsEs ? "Puntuacion" : "Score"}</span>
          <strong>{playerScore}</strong>
        </div>
        {matchMode === "competitive" ? (
          <div>
            <span>{localeIsEs ? "Ranking" : "Ranking"}</span>
            <strong>{playerRanking ? `#${playerRanking}/26` : "-"}</strong>
          </div>
        ) : null}
        <div>
          <span>{localeIsEs ? "Cursor" : "Cursor"}</span>
          <strong>
            {game.cursor.row + 1},{game.cursor.col + 1}
          </strong>
        </div>
      </div>

      <p className={`mines-status mode-${game.mode}`}>{statusLine}</p>
      {aiFeedback ? <p className="mines-ai-feedback">{aiFeedback}</p> : null}

      {matchMode === "competitive" ? (
        <div className="mines-leaderboard">
          <div className="mines-leaderboard-head">
            <strong>
              {localeIsEs
                ? "Clasificacion competitiva (25 rivales)"
                : "Competitive leaderboard (25 rivals)"}
            </strong>
            <span>
              {localeIsEs
                ? "Misma partida, puntuacion por celdas descubiertas y tiempo."
                : "Same board, score based on discovered cells and time."}
            </span>
          </div>
          <div className="mines-leaderboard-table">
            {leaderboard.slice(0, 8).map((entry) => (
              <div
                key={entry.id}
                className={`mines-rank-row ${entry.isPlayer ? "is-player" : ""}`}
              >
                <span className="rank">#{entry.rank}</span>
                <span className="name">{entry.name}</span>
                <span className="score">{entry.score}</span>
                <span className="time">{entry.timeSeconds}s</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mines-board-shell">
        <div className="mines-board-shell__content">
          <div
            className="mines-board"
            style={{
              "--mines-cols": game.cols,
              "--mines-cell": `${boardCellSize}px`,
              gridTemplateColumns: `repeat(${game.cols}, var(--mines-cell))`,
            }}
          >
            {game.board.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const isCursor =
                  game.cursor.row === rowIndex && game.cursor.col === colIndex;
                const cellKey = `${rowIndex}:${colIndex}`;
                const valueLabel =
                  cell.revealed && !cell.mine && cell.around > 0
                    ? cell.around
                    : cell.flagged
                      ? "F"
                      : cell.question
                        ? "?"
                        : cell.mine && cell.revealed
                          ? "M"
                          : "";

                return (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    type="button"
                    className={[
                      "mines-cell",
                      cell.revealed ? "is-revealed" : "is-hidden",
                      cell.flagged && !cell.revealed ? "is-flagged" : "",
                      cell.question && !cell.revealed ? "is-question" : "",
                      cell.mine && cell.revealed ? "is-mine" : "",
                      cell.exploded ? "is-exploded" : "",
                      isCursor ? "is-cursor" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    data-cell={`${rowIndex}-${colIndex}`}
                    data-row={rowIndex}
                    data-col={colIndex}
                    onClick={() => {
                      if (shouldIgnoreClick(cellKey)) {
                        return;
                      }
                      runCellAction(rowIndex, colIndex, flagMode ? "mark" : "reveal");
                    }}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      runCellAction(rowIndex, colIndex, "mark");
                    }}
                    onTouchStart={(event) => {
                      event.preventDefault();
                      clearTouchState(cellKey);
                      const timerId = window.setTimeout(() => {
                        runCellAction(rowIndex, colIndex, "mark");
                        markTouchClickIgnore(cellKey);
                        touchStateRef.current.delete(cellKey);
                      }, LONG_PRESS_MS);
                      touchStateRef.current.set(cellKey, {
                        timerId,
                      });
                    }}
                    onTouchEnd={(event) => {
                      event.preventDefault();
                      const snapshot = clearTouchState(cellKey);
                      if (!snapshot) {
                        return;
                      }
                      runCellAction(rowIndex, colIndex, "reveal");
                      markTouchClickIgnore(cellKey);
                    }}
                    onTouchCancel={() => {
                      clearTouchState(cellKey);
                      markTouchClickIgnore(cellKey);
                    }}
                    style={{
                      color:
                        cell.revealed && cell.around > 0
                          ? NUMBER_COLORS[cell.around] ?? "#0f172a"
                          : undefined,
                    }}
                    aria-label={`cell-${rowIndex}-${colIndex}`}
                  >
                    {valueLabel}
                  </button>
                );
              })
            )}
          </div>
          {showAdPreview ? (
            <AdPreviewCard
              slot={MOBILE_APP_COMPACT_AD_SLOT}
              locale={locale}
              className="mines-stage-ad"
            />
          ) : null}
        </div>
      </div>

      <div className="mines-help">
        <span>
          {localeIsEs
            ? "Teclado: flechas mueven cursor, Enter/Space abre, F marca, H sugerencia IA, A jugada IA, R reinicia. Movil: toque rapido abre, pulsacion larga marca."
            : "Keyboard: arrows move cursor, Enter/Space open, F marks, H AI hint, A AI move, R restart. Mobile: quick tap reveals, long press marks."}
        </span>
      </div>
    </div>
  );
}

export default MinesweeperGame;
