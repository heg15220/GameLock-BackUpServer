import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../utils/useGameRuntimeBridge";
import {
  COLORS,
  PIECES,
  canClaimDraw,
  claimDraw,
  cloneGameState,
  createInitialChessState,
  getMoveHistoryRows,
  getPieceSummary,
  indexToSquare,
  makeMove,
  moveToUci,
  toCol,
  toRow
} from "./chess/chessEngine";
import {
  CHESS_AI_LEVELS,
  chooseAIMove,
  getAiLevelById
} from "./chess/chessAI";
import { createChessAudio, readStoredChessMuted } from "./chess/chessAudio";

const WHITE = COLORS.WHITE;
const BLACK = COLORS.BLACK;
const AI_MOVE_DELAY_MS = 2000;
const PIECE_LABEL = {
  [PIECES.KING]: "R",
  [PIECES.QUEEN]: "D",
  [PIECES.ROOK]: "T",
  [PIECES.BISHOP]: "A",
  [PIECES.KNIGHT]: "C",
  [PIECES.PAWN]: "P"
};
const PROMOTION_LABEL = {
  [PIECES.QUEEN]: "Dama",
  [PIECES.ROOK]: "Torre",
  [PIECES.BISHOP]: "Alfil",
  [PIECES.KNIGHT]: "Caballo"
};
const PIECE_GLYPH = {
  [WHITE]: {
    [PIECES.KING]: "♚",
    [PIECES.QUEEN]: "♛",
    [PIECES.ROOK]: "♜",
    [PIECES.BISHOP]: "♝",
    [PIECES.KNIGHT]: "♞",
    [PIECES.PAWN]: "♟"
  },
  [BLACK]: {
    [PIECES.KING]: "♚",
    [PIECES.QUEEN]: "♛",
    [PIECES.ROOK]: "♜",
    [PIECES.BISHOP]: "♝",
    [PIECES.KNIGHT]: "♞",
    [PIECES.PAWN]: "♟"
  }
};

const SIDE_OPTIONS = {
  white: { id: "white", label: "Blancas" },
  black: { id: "black", label: "Negras" },
  random: { id: "random", label: "Aleatorio" }
};

const resolvePlayerColor = (sideOption) => {
  if (sideOption === SIDE_OPTIONS.white.id) return WHITE;
  if (sideOption === SIDE_OPTIONS.black.id) return BLACK;
  return Math.random() < 0.5 ? WHITE : BLACK;
};

const createVisualAxis = (playerColor) => {
  const rows = playerColor === WHITE ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const cols = playerColor === WHITE ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  return { rows, cols };
};

const formatCapturedLabel = (pieceType, pieceColor) => (
  PIECE_GLYPH[pieceColor]?.[pieceType] || PIECE_LABEL[pieceType] || "?"
);

const squareColorClass = (square) => ((toRow(square) + toCol(square)) % 2 === 0 ? "light" : "dark");

const safeNumber = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }
  return numeric;
};

const END_SCENE_PARTICLES = [
  { x: -190, y: -120, rotate: -48, delay: "0s" },
  { x: -128, y: -136, rotate: -32, delay: "0.08s" },
  { x: -72, y: -152, rotate: -24, delay: "0.14s" },
  { x: -16, y: -166, rotate: -12, delay: "0.2s" },
  { x: 38, y: -154, rotate: 8, delay: "0.26s" },
  { x: 92, y: -140, rotate: 18, delay: "0.34s" },
  { x: 148, y: -126, rotate: 26, delay: "0.42s" },
  { x: 196, y: -102, rotate: 40, delay: "0.5s" },
  { x: -162, y: -44, rotate: -52, delay: "0.56s" },
  { x: -84, y: -30, rotate: -36, delay: "0.62s" },
  { x: -8, y: -18, rotate: -16, delay: "0.68s" },
  { x: 66, y: -26, rotate: 16, delay: "0.74s" },
  { x: 142, y: -34, rotate: 34, delay: "0.8s" },
  { x: 210, y: -44, rotate: 52, delay: "0.88s" }
];

const DRAW_REASON_LABEL = {
  stalemate: "tablas por ahogado",
  insufficient_material: "tablas por material insuficiente",
  threefold_repetition: "tablas por triple repeticion",
  fivefold_repetition: "tablas por quintuple repeticion",
  fifty_move_rule: "tablas por regla de 50 movimientos",
  seventy_five_move_rule: "tablas por regla de 75 movimientos"
};

const resolveOutcomePresentation = (result, playerColor) => {
  if (!result) return null;

  if (result.type === "draw") {
    return {
      kind: "draw",
      title: "Tablas",
      subtitle: DRAW_REASON_LABEL[result.reason] || "partida empatada",
      symbol: "1/2",
      animationId: `draw-${result.reason || "generic"}`
    };
  }

  const playerWon = result.winner === playerColor;
  if (playerWon) {
    return {
      kind: "win",
      title: "Victoria",
      subtitle: "jaque mate a la IA",
      symbol: "W",
      animationId: `win-${result.reason || "mate"}`
    };
  }

  return {
    kind: "lose",
    title: "Derrota",
    subtitle: "la IA cierra la partida",
    symbol: "L",
    animationId: `lose-${result.reason || "mate"}`
  };
};

function ChessGame() {
  const containerRef = useRef(null);

  const [sideOption, setSideOption] = useState(SIDE_OPTIONS.white.id);
  const [difficultyId, setDifficultyId] = useState("intermediate");
  const [playerColor, setPlayerColor] = useState(WHITE);
  const [started, setStarted] = useState(false);

  const [gameState, setGameState] = useState(() => createInitialChessState());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [logs, setLogs] = useState(["Configura tu color y dificultad, luego inicia la partida."]);
  const [undoStack, setUndoStack] = useState([]);
  const [audioMuted, setAudioMuted] = useState(readStoredChessMuted);

  const audioRef = useRef(null);
  const gameStateRef = useRef(gameState);
  const playerColorRef = useRef(playerColor);
  const difficultyRef = useRef(difficultyId);
  const startedRef = useRef(started);

  const aiThinkingRef = useRef(false);
  const aiDelayRef = useRef(0);
  const frameRef = useRef(0);
  const lastFrameRef = useRef(0);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    playerColorRef.current = playerColor;
  }, [playerColor]);

  useEffect(() => {
    difficultyRef.current = difficultyId;
  }, [difficultyId]);

  useEffect(() => {
    startedRef.current = started;
  }, [started]);

  // Mount-only: the initial mute state is read once at construction, and every
  // later change goes through toggleAudioMuted so the context is never rebuilt.
  useEffect(() => {
    audioRef.current = createChessAudio(audioMuted);
    return () => {
      audioRef.current?.dispose?.();
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleAudioMuted = useCallback(() => {
    audioRef.current?.unlock?.();
    const nextMuted = audioRef.current?.toggleMuted?.();
    setAudioMuted(Boolean(nextMuted));
  }, []);

  const pushLog = useCallback((text) => {
    setLogs((previous) => [text, ...previous].slice(0, 10));
  }, []);

  const stopAiThinking = useCallback(() => {
    aiThinkingRef.current = false;
    aiDelayRef.current = 0;
    setAiThinking(false);
  }, []);

  const aiColorForCurrentPlayer = useCallback(() => (
    playerColorRef.current === WHITE ? BLACK : WHITE
  ), []);

  const scheduleAiIfNeeded = useCallback((state) => {
    if (!startedRef.current) {
      stopAiThinking();
      return;
    }

    const aiColor = aiColorForCurrentPlayer();
    if (state.result || state.turn !== aiColor) {
      stopAiThinking();
      return;
    }

    aiThinkingRef.current = true;
    aiDelayRef.current = AI_MOVE_DELAY_MS;
    setAiThinking(true);
  }, [aiColorForCurrentPlayer, stopAiThinking]);

  const commitGameState = useCallback((nextState, options = {}) => {
    const { pushUndo = true } = options;
    const current = gameStateRef.current;
    if (pushUndo) {
      setUndoStack((previous) => [...previous, cloneGameState(current)].slice(-220));
    }

    setGameState(nextState);
    gameStateRef.current = nextState;

    if (nextState.result) {
      pushLog(nextState.statusText);
      stopAiThinking();
    } else {
      scheduleAiIfNeeded(nextState);
    }
  }, [pushLog, scheduleAiIfNeeded, stopAiThinking]);

  const clearSelection = useCallback(() => {
    setSelectedSquare(null);
    setPendingPromotion(null);
  }, []);

  const performMove = useCallback((move, actor) => {
    const current = gameStateRef.current;
    const next = makeMove(current, move);
    if (next === current) {
      return false;
    }

    // After the rejection guard, so an illegal move stays silent. lastMove is the
    // engine's normalized record, which folds en passant in as a capture.
    audioRef.current?.play(
      next.lastMove?.capture || next.lastMove?.isEnPassant ? "capture" : "move",
    );

    commitGameState(next, { pushUndo: true });
    clearSelection();

    const san = next.lastMove?.san || moveToUci(move);
    if (actor === "ai") {
      pushLog(`IA juega ${san}`);
    } else {
      pushLog(`Tu juegas ${san}`);
    }

    return true;
  }, [clearSelection, commitGameState, pushLog]);

  const startMatch = useCallback(() => {
    // This click is the gesture the context needs. Matters when the player takes
    // black: the AI moves first, from a timer, with no gesture of its own to ride.
    audioRef.current?.unlock?.();
    const resolvedPlayerColor = resolvePlayerColor(sideOption);
    const initial = createInitialChessState();

    stopAiThinking();
    setStarted(true);
    setPlayerColor(resolvedPlayerColor);

    gameStateRef.current = initial;
    setGameState(initial);
    setUndoStack([]);
    clearSelection();

    const sideText = resolvedPlayerColor === WHITE ? "blancas" : "negras";
    setLogs([`Partida iniciada. Juegas con ${sideText}.`]);

    if (resolvedPlayerColor === BLACK) {
      scheduleAiIfNeeded(initial);
      pushLog("La IA mueve primero con blancas.");
    }
  }, [clearSelection, pushLog, scheduleAiIfNeeded, sideOption, stopAiThinking]);

  const restartMatch = useCallback(() => {
    startMatch();
  }, [startMatch]);

  const undoLastMove = useCallback(() => {
    let restored = null;
    setUndoStack((previous) => {
      if (!previous.length) return previous;
      restored = previous[previous.length - 1];
      return previous.slice(0, -1);
    });

    if (!restored) return;

    stopAiThinking();
    clearSelection();
    setGameState(restored);
    gameStateRef.current = restored;
    pushLog("Ultimo movimiento deshecho.");
  }, [clearSelection, pushLog, stopAiThinking]);

  const claimDrawIfAvailable = useCallback(() => {
    const current = gameStateRef.current;
    const next = claimDraw(current);
    if (next === current) {
      return;
    }
    setGameState(next);
    gameStateRef.current = next;
    pushLog(next.statusText);
    stopAiThinking();
  }, [pushLog, stopAiThinking]);

  const executeAiMove = useCallback(() => {
    const current = gameStateRef.current;
    if (!startedRef.current || current.result) {
      stopAiThinking();
      return;
    }

    const aiColor = aiColorForCurrentPlayer();
    if (current.turn !== aiColor) {
      stopAiThinking();
      return;
    }

    const move = chooseAIMove(current, difficultyRef.current);
    stopAiThinking();
    if (!move) {
      return;
    }
    performMove(move, "ai");
  }, [aiColorForCurrentPlayer, performMove, stopAiThinking]);

  const tickAi = useCallback((ms) => {
    if (!aiThinkingRef.current) return;
    aiDelayRef.current -= ms;
    if (aiDelayRef.current <= 0) {
      executeAiMove();
    }
  }, [executeAiMove]);

  const advanceTime = useCallback((ms) => {
    let remaining = safeNumber(ms);
    while (remaining > 0 && aiThinkingRef.current) {
      const step = Math.min(60, remaining);
      tickAi(step);
      remaining -= step;
    }
  }, [tickAi]);

  useEffect(() => {
    const animate = (time) => {
      if (!lastFrameRef.current) {
        lastFrameRef.current = time;
      }
      const delta = Math.min(120, time - lastFrameRef.current);
      lastFrameRef.current = time;
      tickAi(delta);
      frameRef.current = window.requestAnimationFrame(animate);
    };

    frameRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [tickAi]);

  const toggleFullscreen = useCallback(async () => {
    const element = containerRef.current;
    if (!element) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await element.requestFullscreen();
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === "KeyF") {
        event.preventDefault();
        toggleFullscreen();
        return;
      }
      if (event.code === "Escape") {
        if (pendingPromotion) {
          event.preventDefault();
          setPendingPromotion(null);
          return;
        }
        if (selectedSquare != null) {
          event.preventDefault();
          setSelectedSquare(null);
          return;
        }
      }
      if (event.code === "Enter" && !startedRef.current) {
        event.preventDefault();
        startMatch();
        return;
      }
      if (event.code === "KeyR") {
        event.preventDefault();
        restartMatch();
        return;
      }
      if (event.code === "KeyU") {
        event.preventDefault();
        undoLastMove();
        return;
      }
      if (event.code === "KeyD") {
        event.preventDefault();
        claimDrawIfAvailable();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    claimDrawIfAvailable,
    pendingPromotion,
    restartMatch,
    selectedSquare,
    startMatch,
    toggleFullscreen,
    undoLastMove
  ]);

  const boardAxis = useMemo(() => createVisualAxis(playerColor), [playerColor]);

  const selectedMoves = useMemo(() => {
    if (selectedSquare == null) {
      return [];
    }
    return gameState.legalMoves.filter((move) => move.from === selectedSquare);
  }, [gameState.legalMoves, selectedSquare]);

  const targetInfo = useMemo(() => {
    const map = new Map();
    selectedMoves.forEach((move) => {
      const current = map.get(move.to) || { capture: false, promotions: [] };
      current.capture = current.capture || Boolean(move.capture || move.isEnPassant);
      if (move.promotion) {
        current.promotions.push(move.promotion);
      }
      map.set(move.to, current);
    });
    return map;
  }, [selectedMoves]);

  const checkedKingSquare = useMemo(() => {
    if (!gameState.inCheck) return null;
    return gameState.kingPos[gameState.turn];
  }, [gameState.inCheck, gameState.kingPos, gameState.turn]);

  const capturedSummary = useMemo(() => getPieceSummary(gameState.board), [gameState.board]);
  const moveRows = useMemo(() => getMoveHistoryRows(gameState.moveHistory), [gameState.moveHistory]);
  const drawClaimAvailable = canClaimDraw(gameState);
  const outcomePresentation = useMemo(
    () => resolveOutcomePresentation(gameState.result, playerColor),
    [gameState.result, playerColor]
  );
  const outcomeAnimationKey = useMemo(() => (
    outcomePresentation
      ? `${outcomePresentation.animationId}-${gameState.moveHistory.length}-${gameState.turn}`
      : "none"
  ), [gameState.moveHistory.length, gameState.turn, outcomePresentation]);

  const handleSquareClick = useCallback((square) => {
    if (!startedRef.current || gameStateRef.current.result || aiThinkingRef.current || pendingPromotion) {
      return;
    }

    const current = gameStateRef.current;
    if (current.turn !== playerColorRef.current) {
      return;
    }

    const piece = current.board[square];

    if (selectedSquare == null) {
      if (piece && piece.color === playerColorRef.current) {
        setSelectedSquare(square);
      }
      return;
    }

    if (square === selectedSquare) {
      setSelectedSquare(null);
      return;
    }

    if (piece && piece.color === playerColorRef.current) {
      const selectedPiece = current.board[selectedSquare];
      const canTryRookCastling =
        selectedPiece?.type === PIECES.KING &&
        selectedPiece.color === playerColorRef.current &&
        piece.type === PIECES.ROOK;
      if (canTryRookCastling) {
        const castleSide = toCol(square) > toCol(selectedSquare) ? "K" : "Q";
        const castleMove = current.legalMoves.find(
          (move) => move.from === selectedSquare && move.isCastle === castleSide
        );
        if (castleMove) {
          performMove(castleMove, "player");
          return;
        }
      }

      setSelectedSquare(square);
      return;
    }

    const matching = current.legalMoves.filter((move) => move.from === selectedSquare && move.to === square);
    if (!matching.length) {
      setSelectedSquare(null);
      return;
    }

    if (matching.length > 1) {
      setPendingPromotion({
        from: selectedSquare,
        to: square,
        moves: matching
      });
      return;
    }

    performMove(matching[0], "player");
  }, [pendingPromotion, performMove, selectedSquare]);

  const choosePromotion = useCallback((promotionType) => {
    if (!pendingPromotion) return;
    const move = pendingPromotion.moves.find((candidate) => candidate.promotion === promotionType);
    if (!move) return;
    performMove(move, "player");
  }, [pendingPromotion, performMove]);

  const bridgeState = useMemo(() => ({
    started,
    playerColor,
    difficultyId,
    aiThinking,
    selectedSquare,
    pendingPromotion,
    capturedSummary,
    audioMuted,
    gameState
  }), [started, playerColor, difficultyId, aiThinking, selectedSquare, pendingPromotion, capturedSummary, audioMuted, gameState]);

  const payloadBuilder = useCallback((snapshot) => {
    const boardPieces = [];
    for (let square = 0; square < snapshot.gameState.board.length; square += 1) {
      const piece = snapshot.gameState.board[square];
      if (!piece) continue;
      boardPieces.push({
        square: indexToSquare(square),
        row: toRow(square),
        col: toCol(square),
        color: piece.color,
        type: piece.type
      });
    }

    return {
      mode: "chess_fide_board",
      coordinates: "row_0_rank_8_col_0_file_a",
      started: snapshot.started,
      playerColor: snapshot.playerColor,
      aiColor: snapshot.playerColor === WHITE ? BLACK : WHITE,
      difficultyId: snapshot.difficultyId,
      aiThinking: snapshot.aiThinking,
      turn: snapshot.gameState.turn,
      inCheck: snapshot.gameState.inCheck,
      statusText: snapshot.gameState.statusText,
      result: snapshot.gameState.result,
      drawClaims: snapshot.gameState.drawClaims,
      selectedSquare: snapshot.selectedSquare == null ? null : indexToSquare(snapshot.selectedSquare),
      pendingPromotion: snapshot.pendingPromotion
        ? {
          from: indexToSquare(snapshot.pendingPromotion.from),
          to: indexToSquare(snapshot.pendingPromotion.to),
          options: snapshot.pendingPromotion.moves.map((move) => move.promotion)
        }
        : null,
      legalMovesCount: snapshot.gameState.legalMoves.length,
      legalMoves: snapshot.gameState.legalMoves.map((move) => moveToUci(move)),
      lastMove: snapshot.gameState.lastMove,
      moveHistory: snapshot.gameState.moveHistory.slice(-24).map((move) => move.san),
      capturedSummary: {
        white: (snapshot.capturedSummary?.w || []).map((piece) => formatCapturedLabel(piece, WHITE)),
        black: (snapshot.capturedSummary?.b || []).map((piece) => formatCapturedLabel(piece, BLACK)),
      },
      audio: audioRef.current?.snapshot?.() || null,
      boardPieces
    };
  }, []);

  useGameRuntimeBridge(bridgeState, payloadBuilder, advanceTime);

  return (
    <div className="mini-game chess-game" ref={containerRef}>
      <div className="mini-head">
        <div>
          <h4>Ajedrez FIDE Arena</h4>
          <p>Motor completo con reglas FIDE, notacion algebraica y IA por niveles.</p>
        </div>
        <div className="chess-head-actions">
          <button type="button" onClick={started ? restartMatch : startMatch}>
            {started ? "Nueva partida" : "Iniciar partida"}
          </button>
          <button type="button" onClick={undoLastMove} disabled={!undoStack.length || aiThinking}>
            Deshacer
          </button>
          <button
            type="button"
            onClick={toggleAudioMuted}
            aria-pressed={!audioMuted}
            title={audioMuted ? "Activar sonido" : "Silenciar sonido"}
          >
            {audioMuted ? "Sonido OFF" : "Sonido ON"}
          </button>
          <button type="button" onClick={toggleFullscreen}>
            {fullscreen ? "Salir pantalla completa" : "Pantalla completa"}
          </button>
        </div>
      </div>

      <div className="chess-config">
        <label htmlFor="chess-side">
          Tu color
          <select
            id="chess-side"
            value={sideOption}
            onChange={(event) => setSideOption(event.target.value)}
            disabled={started && gameState.moveHistory.length > 0}
          >
            {Object.values(SIDE_OPTIONS).map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>

        <label htmlFor="chess-difficulty">
          Dificultad IA
          <select
            id="chess-difficulty"
            value={difficultyId}
            onChange={(event) => setDifficultyId(event.target.value)}
          >
            {Object.values(CHESS_AI_LEVELS).map((level) => (
              <option key={level.id} value={level.id}>{level.label}</option>
            ))}
          </select>
        </label>

        <button type="button" className="secondary" onClick={restartMatch}>
          Reiniciar tablero
        </button>
      </div>

      <div className="status-row chess-status-row">
        <span className={`status-pill ${gameState.result ? "finished" : gameState.inCheck ? "playing" : "idle"}`}>
          {gameState.result ? "finalizada" : aiThinking ? "ia pensando" : "en juego"}
        </span>
        <span>Turno: {gameState.turn === WHITE ? "Blancas" : "Negras"}</span>
        <span>Juegas: {playerColor === WHITE ? "Blancas" : "Negras"}</span>
        <span>IA: {getAiLevelById(difficultyId).label}</span>
        <span>Movs: {gameState.moveHistory.length}</span>
        {gameState.drawClaims.threefold ? <span>Triple repeticion disponible</span> : null}
        {gameState.drawClaims.fiftyMove ? <span>Regla 50 movimientos disponible</span> : null}
      </div>

      <div className="chess-captured-row">
        <div>
          <strong>Capturadas blancas</strong>
          <div className="chess-captured-list">
            {capturedSummary.w.length ? capturedSummary.w.map((piece, index) => (
              <span key={`cw-${piece}-${index}`} className="chip-piece white">{formatCapturedLabel(piece, WHITE)}</span>
            )) : <span className="chip-piece muted">-</span>}
          </div>
        </div>
        <div>
          <strong>Capturadas negras</strong>
          <div className="chess-captured-list">
            {capturedSummary.b.length ? capturedSummary.b.map((piece, index) => (
              <span key={`cb-${piece}-${index}`} className="chip-piece black">{formatCapturedLabel(piece, BLACK)}</span>
            )) : <span className="chip-piece muted">-</span>}
          </div>
        </div>
      </div>

      <div className="chess-board-shell">
        <div className="chess-board-grid" role="grid" aria-label="Tablero de ajedrez 8x8">
          {boardAxis.rows.map((row, visualRowIndex) =>
            boardAxis.cols.map((col, visualColIndex) => {
              const square = row * 8 + col;
              const piece = gameState.board[square];
              const target = targetInfo.get(square);
              const isSelected = square === selectedSquare;
              const isLastMove = gameState.lastMove && (square === gameState.lastMove.from || square === gameState.lastMove.to);
              const isCheckedKing = checkedKingSquare === square;
              const rankLabelVisible = visualColIndex === 0;
              const fileLabelVisible = visualRowIndex === 7;
              const rankText = String(8 - row);
              const fileText = String.fromCharCode(97 + col);

              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  className={[
                    "chess-square",
                    squareColorClass(square),
                    isSelected ? "selected" : "",
                    target ? "target" : "",
                    target?.capture ? "capture" : "",
                    isLastMove ? "last" : "",
                    isCheckedKing ? "checked" : ""
                  ].filter(Boolean).join(" ")}
                  onClick={() => handleSquareClick(square)}
                >
                  {rankLabelVisible ? <span className="coord rank">{rankText}</span> : null}
                  {fileLabelVisible ? <span className="coord file">{fileText}</span> : null}
                  {piece ? (
                    <span className={`chess-piece ${piece.color === WHITE ? "white" : "black"}`}>
                      {PIECE_GLYPH[piece.color]?.[piece.type] || PIECE_LABEL[piece.type]}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        {outcomePresentation ? (
          <div
            key={outcomeAnimationKey}
            className={`chess-end-overlay outcome-${outcomePresentation.kind}`}
            role="status"
            aria-live="polite"
          >
            <div className="chess-end-ribbon">
              <span className="chess-end-symbol">{outcomePresentation.symbol}</span>
              <div className="chess-end-copy">
                <strong>{outcomePresentation.title}</strong>
                <span>{outcomePresentation.subtitle}</span>
              </div>
            </div>
            <div className="chess-end-particles" aria-hidden="true">
              {END_SCENE_PARTICLES.map((particle, index) => (
                <span
                  // Particle map keeps the visual burst deterministic for QA captures.
                  key={`${outcomePresentation.kind}-${index}`}
                  style={{
                    "--particle-x": `${particle.x}px`,
                    "--particle-y": `${particle.y}px`,
                    "--particle-rotate": `${particle.rotate}deg`,
                    "--particle-delay": particle.delay
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* Vive dentro del tablero: el shell movil aisla la rama del escenario y
            oculta a sus hermanos, asi que un dialogo fuera de aqui seria invisible
            y dejaria la partida bloqueada esperando una eleccion imposible. */}
        {pendingPromotion ? (
          <div
            className="chess-promotion-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Elegir promocion"
            data-mobile-stage-overlay="true"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setPendingPromotion(null);
              }
            }}
          >
            <div className="chess-promotion-card">
              <p>Elige pieza de promocion</p>
              <div className="chess-promotion-options">
                {[PIECES.QUEEN, PIECES.ROOK, PIECES.BISHOP, PIECES.KNIGHT].map((pieceType) => (
                  <button
                    key={pieceType}
                    type="button"
                    onClick={() => choosePromotion(pieceType)}
                    aria-label={PROMOTION_LABEL[pieceType]}
                    title={PROMOTION_LABEL[pieceType]}
                  >
                    {PIECE_GLYPH[playerColor]?.[pieceType] || PIECE_LABEL[pieceType]}
                  </button>
                ))}
              </div>
              <button type="button" className="cancel" onClick={() => setPendingPromotion(null)}>
                Cancelar
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="chess-footer-actions">
        <button type="button" onClick={claimDrawIfAvailable} disabled={!drawClaimAvailable || aiThinking}>
          Reclamar tablas
        </button>
        <button type="button" className="secondary" onClick={clearSelection}>
          Limpiar seleccion
        </button>
      </div>

      <div className="chess-move-table" role="table" aria-label="Historial de movimientos">
        <div className="chess-move-head" role="row">
          <span>#</span>
          <span>Blancas</span>
          <span>Negras</span>
        </div>
        <div className="chess-move-body">
          {moveRows.length ? moveRows.map((row) => (
            <div key={`mv-${row.number}`} className="chess-move-row" role="row">
              <span>{row.number}</span>
              <span>{row.white || "-"}</span>
              <span>{row.black || "-"}</span>
            </div>
          )) : (
            <div className="chess-move-row empty">
              <span>-</span>
              <span>Sin movimientos</span>
              <span>-</span>
            </div>
          )}
        </div>
      </div>

      <p className="game-message chess-message">
        {gameState.statusText} Controles: clic para mover, Enter iniciar, R reiniciar, U deshacer, D reclamar tablas, F pantalla completa.
      </p>

      <ul className="game-log chess-log">
        {logs.map((entry, index) => (
          <li key={`${entry}-${index}`}>{entry}</li>
        ))}
      </ul>
    </div>
  );
}

export default ChessGame;
