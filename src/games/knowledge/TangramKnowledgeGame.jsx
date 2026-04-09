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
  TANGRAM_BOARD_CONFIG,
  TANGRAM_PIECES,
  TANGRAM_SHAPES_BY_TYPE,
  buildInitialTangramPieces,
  buildTangramChallenge,
  computeTangramOverlapPairs,
  findSnapCandidateForPiece,
  formatTangramElapsed,
  getBoardSlotsForChallenge,
  getTangramPolygonForPiece,
  normalizeRotationSteps,
  transformTangramPolygon
} from "./tangramEngine";

const COPY = {
  es: {
    title: "Tangram Pro",
    subtitle:
      "Usa las 7 tans (2 triangulos grandes, 1 mediano, 2 pequenos, 1 cuadrado y 1 paralelogramo) para reconstruir la silueta.",
    match: "Partida",
    challenge: "Silueta",
    locked: "Encajadas",
    overlap: "Solapes",
    moves: "Movimientos",
    time: "Tiempo",
    status: "Estado",
    statusPlaying: "En curso",
    statusSolved: "Resuelto",
    restart: "Reiniciar",
    next: "Nueva silueta",
    hintOn: "Mostrar guia",
    hintOff: "Ocultar guia",
    rotateLeft: "Rotar -45",
    rotateRight: "Rotar +45",
    flip: "Voltear",
    snap: "Ajustar pieza",
    trayLabel: "Zona de piezas",
    targetLabel: "Objetivo",
    selected: "Pieza seleccionada",
    noneSelected: "Ninguna",
    help:
      "Arrastra piezas al objetivo. Q/E rotan, F voltea el paralelogramo, Enter intenta encajar, H alterna guia, R reinicia y N carga otra silueta.",
    startMessage:
      "Recrea la silueta usando las 7 tans sin solapar piezas.",
    moved: "Pieza movida.",
    snapped: "Pieza encajada.",
    rotated: "Rotacion aplicada.",
    flipped: "Volteo aplicado.",
    flipOnlyParallelogram: "Solo el paralelogramo necesita volteo.",
    overlapWarning: (count) => `Hay ${count} solape(s): separa piezas para validar.`,
    solved: (time) => `Silueta completada en ${time}.`,
    hintShown: "Guia visual activada.",
    hintHidden: "Guia visual desactivada."
  },
  en: {
    title: "Tangram Pro",
    subtitle:
      "Use all 7 tans (2 large triangles, 1 medium, 2 small, 1 square and 1 parallelogram) to rebuild the silhouette.",
    match: "Match",
    challenge: "Silhouette",
    locked: "Locked",
    overlap: "Overlaps",
    moves: "Moves",
    time: "Time",
    status: "Status",
    statusPlaying: "In progress",
    statusSolved: "Solved",
    restart: "Restart",
    next: "New silhouette",
    hintOn: "Show guide",
    hintOff: "Hide guide",
    rotateLeft: "Rotate -45",
    rotateRight: "Rotate +45",
    flip: "Flip",
    snap: "Snap piece",
    trayLabel: "Piece zone",
    targetLabel: "Target",
    selected: "Selected piece",
    noneSelected: "None",
    help:
      "Drag pieces into the target. Q/E rotate, F flips the parallelogram, Enter snaps, H toggles guide, R restarts, and N loads another silhouette.",
    startMessage:
      "Rebuild the silhouette using all 7 tans without overlapping pieces.",
    moved: "Piece moved.",
    snapped: "Piece snapped.",
    rotated: "Rotation applied.",
    flipped: "Flip applied.",
    flipOnlyParallelogram: "Only the parallelogram needs flipping.",
    overlapWarning: (count) => `${count} overlap(s) detected: separate pieces to validate.`,
    solved: (time) => `Silhouette completed in ${time}.`,
    hintShown: "Guide layer enabled.",
    hintHidden: "Guide layer hidden."
  }
};

const PIECE_LABEL_BY_TYPE = {
  es: {
    largeTriangle: "Triangulo grande",
    mediumTriangle: "Triangulo mediano",
    smallTriangle: "Triangulo pequeno",
    square: "Cuadrado",
    parallelogram: "Paralelogramo"
  },
  en: {
    largeTriangle: "Large triangle",
    mediumTriangle: "Medium triangle",
    smallTriangle: "Small triangle",
    square: "Square",
    parallelogram: "Parallelogram"
  }
};

const pointToString = (polygon) =>
  polygon.map((point) => `${point[0].toFixed(2)},${point[1].toFixed(2)}`).join(" ");

const TANGRAM_BOARD_MARGIN = 18;

const getPolygonBounds = (polygon) => {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const [x, y] of polygon) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY };
};

const confinePieceToBoard = (
  piece,
  boardConfig = TANGRAM_BOARD_CONFIG,
  margin = TANGRAM_BOARD_MARGIN
) => {
  const polygon = getTangramPolygonForPiece(piece, boardConfig.scale);
  const bounds = getPolygonBounds(polygon);
  const minBoundX = margin;
  const maxBoundX = boardConfig.width - margin;
  const minBoundY = margin;
  const maxBoundY = boardConfig.height - margin;

  let shiftX = 0;
  if (bounds.minX < minBoundX) {
    shiftX = minBoundX - bounds.minX;
  } else if (bounds.maxX > maxBoundX) {
    shiftX = maxBoundX - bounds.maxX;
  }

  let shiftY = 0;
  if (bounds.minY < minBoundY) {
    shiftY = minBoundY - bounds.minY;
  } else if (bounds.maxY > maxBoundY) {
    shiftY = maxBoundY - bounds.maxY;
  }

  if (!shiftX && !shiftY) return piece;
  return {
    ...piece,
    x: piece.x + shiftX,
    y: piece.y + shiftY
  };
};

const getSvgPoint = (svg, event) => {
  if (!svg) return null;
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(matrix.inverse());
};

const collectOverlappingPieceIds = (pairs) => {
  const ids = new Set();
  pairs.forEach(([leftId, rightId]) => {
    ids.add(leftId);
    ids.add(rightId);
  });
  return ids;
};

const createTangramState = (matchId, locale, copy) => {
  const challenge = buildTangramChallenge(matchId, locale);
  const pieces = buildInitialTangramPieces(matchId, TANGRAM_BOARD_CONFIG).map((piece) =>
    confinePieceToBoard(piece, TANGRAM_BOARD_CONFIG)
  );
  return {
    matchId,
    challenge,
    pieces,
    overlaps: computeTangramOverlapPairs(pieces, TANGRAM_BOARD_CONFIG.scale),
    selectedPieceId: pieces[0]?.id ?? null,
    status: "playing",
    moves: 0,
    elapsedMs: 0,
    hintVisible: false,
    hintsUsed: 0,
    message: copy.startMessage
  };
};

function TangramKnowledgeGame() {
  const locale = useMemo(resolveKnowledgeArcadeLocale, []);
  const copy = useMemo(() => COPY[locale] ?? COPY.en, [locale]);
  const viewport = useMobileGameViewport();
  const pieceLabels = useMemo(
    () => PIECE_LABEL_BY_TYPE[locale] ?? PIECE_LABEL_BY_TYPE.en,
    [locale]
  );
  const [state, setState] = useState(() =>
    createTangramState(getRandomKnowledgeMatchId(), locale, copy)
  );

  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const updateWithSelectionMutation = useCallback((mutation, message) => {
    setState((previous) => {
      if (!previous.selectedPieceId) return previous;
      const pieceIndex = previous.pieces.findIndex((piece) => piece.id === previous.selectedPieceId);
      if (pieceIndex < 0) return previous;

      const piece = previous.pieces[pieceIndex];
      const mutatedPiece = confinePieceToBoard({
        ...mutation(piece),
        locked: false,
        targetSlotId: null
      }, TANGRAM_BOARD_CONFIG);
      const nextPieces = [...previous.pieces];
      nextPieces[pieceIndex] = mutatedPiece;
      const overlaps = computeTangramOverlapPairs(nextPieces, TANGRAM_BOARD_CONFIG.scale);

      return {
        ...previous,
        pieces: nextPieces,
        overlaps,
        status: "playing",
        moves: previous.moves + 1,
        message: overlaps.length ? copy.overlapWarning(overlaps.length) : message
      };
    });
  }, [copy]);

  const settlePiece = useCallback((pieceId, moved = false) => {
    setState((previous) => {
      const pieceIndex = previous.pieces.findIndex((piece) => piece.id === pieceId);
      if (pieceIndex < 0) return previous;

      const piece = previous.pieces[pieceIndex];
      const occupiedSlotIds = new Set(
        previous.pieces
          .filter(
            (candidate) =>
              candidate.id !== pieceId && candidate.locked && candidate.targetSlotId
          )
          .map((candidate) => candidate.targetSlotId)
      );

      const snapCandidate = findSnapCandidateForPiece(
        piece,
        previous.challenge,
        occupiedSlotIds,
        TANGRAM_BOARD_CONFIG
      );

      const nextPieces = [...previous.pieces];
      if (snapCandidate) {
        nextPieces[pieceIndex] = {
          ...piece,
          x: snapCandidate.pose.x,
          y: snapCandidate.pose.y,
          rotation: snapCandidate.pose.rotation,
          flip: snapCandidate.pose.flip,
          locked: true,
          targetSlotId: snapCandidate.slot.slotId
        };
      } else {
        nextPieces[pieceIndex] = {
          ...piece,
          locked: false,
          targetSlotId: null
        };
      }

      const overlaps = computeTangramOverlapPairs(nextPieces, TANGRAM_BOARD_CONFIG.scale);
      const solved = nextPieces.every((candidate) => candidate.locked) && overlaps.length === 0;
      const nextTime = formatTangramElapsed(previous.elapsedMs);

      let message = previous.message;
      if (solved) {
        message = copy.solved(nextTime);
      } else if (overlaps.length > 0) {
        message = copy.overlapWarning(overlaps.length);
      } else if (snapCandidate) {
        message = copy.snapped;
      } else if (moved) {
        message = copy.moved;
      }

      return {
        ...previous,
        pieces: nextPieces,
        overlaps,
        selectedPieceId: pieceId,
        status: solved ? "solved" : "playing",
        moves: moved ? previous.moves + 1 : previous.moves,
        message
      };
    });
  }, [copy]);

  const restart = useCallback(() => {
    setState((previous) => createTangramState(previous.matchId, locale, copy));
  }, [copy, locale]);

  const nextChallenge = useCallback(() => {
    setState((previous) =>
      createTangramState(getRandomKnowledgeMatchIdExcept(previous.matchId), locale, copy)
    );
  }, [copy, locale]);

  const rotateSelected = useCallback((delta) => {
    updateWithSelectionMutation(
      (piece) => ({
        ...piece,
        rotation: normalizeRotationSteps(piece.rotation + delta)
      }),
      copy.rotated
    );
  }, [copy, updateWithSelectionMutation]);

  const flipSelected = useCallback(() => {
    const selectedPiece = stateRef.current.pieces.find(
      (piece) => piece.id === stateRef.current.selectedPieceId
    );
    if (!selectedPiece) return;
    if (selectedPiece.type !== "parallelogram") {
      setState((previous) => ({ ...previous, message: copy.flipOnlyParallelogram }));
      return;
    }
    updateWithSelectionMutation(
      (piece) => ({
        ...piece,
        flip: !piece.flip
      }),
      copy.flipped
    );
  }, [copy, updateWithSelectionMutation]);

  const toggleHintLayer = useCallback(() => {
    setState((previous) => {
      const nextVisible = !previous.hintVisible;
      return {
        ...previous,
        hintVisible: nextVisible,
        hintsUsed: nextVisible ? previous.hintsUsed + 1 : previous.hintsUsed,
        message: nextVisible ? copy.hintShown : copy.hintHidden
      };
    });
  }, [copy]);

  const snapSelectedPiece = useCallback(() => {
    const selected = stateRef.current.selectedPieceId;
    if (!selected) return;
    settlePiece(selected, true);
  }, [settlePiece]);

  const onPiecePointerDown = useCallback((event, pieceId) => {
    if (event.button !== 0) return;
    const point = getSvgPoint(svgRef.current, event);
    if (!point) return;

    const currentPiece = stateRef.current.pieces.find((piece) => piece.id === pieceId);
    if (!currentPiece) return;

    dragRef.current = {
      pieceId,
      pointerId: event.pointerId,
      offsetX: currentPiece.x - point.x,
      offsetY: currentPiece.y - point.y,
      moved: false
    };

    setState((previous) => ({
      ...previous,
      selectedPieceId: pieceId,
      pieces: previous.pieces.map((piece) =>
        piece.id === pieceId
          ? { ...piece, locked: false, targetSlotId: null }
          : piece
      ),
      status: "playing"
    }));
  }, []);

  useEffect(() => {
    const onPointerMove = (event) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (event.pointerId !== drag.pointerId) return;
      const point = getSvgPoint(svgRef.current, event);
      if (!point) return;
      drag.moved = true;

      setState((previous) => {
        const pieceIndex = previous.pieces.findIndex((piece) => piece.id === drag.pieceId);
        if (pieceIndex < 0) return previous;
        const nextPieces = [...previous.pieces];
        const currentPiece = nextPieces[pieceIndex];
        const confinedPiece = confinePieceToBoard(
          {
            ...currentPiece,
            x: point.x + drag.offsetX,
            y: point.y + drag.offsetY,
            locked: false,
            targetSlotId: null
          },
          TANGRAM_BOARD_CONFIG
        );
        nextPieces[pieceIndex] = {
          ...currentPiece,
          ...confinedPiece,
          locked: false,
          targetSlotId: null
        };
        return {
          ...previous,
          pieces: nextPieces,
          selectedPieceId: drag.pieceId
        };
      });
    };

    const onPointerRelease = (event) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (event.pointerId !== drag.pointerId) return;
      dragRef.current = null;
      settlePiece(drag.pieceId, drag.moved);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerRelease);
    window.addEventListener("pointercancel", onPointerRelease);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerRelease);
      window.removeEventListener("pointercancel", onPointerRelease);
    };
  }, [settlePiece]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const tagName = target?.tagName?.toLowerCase();
      const writing = tagName === "input" || tagName === "textarea" || target?.isContentEditable;
      if (writing) return;

      const key = event.key.toLowerCase();
      if (key === "r") {
        event.preventDefault();
        restart();
        return;
      }
      if (key === "n") {
        event.preventDefault();
        nextChallenge();
        return;
      }
      if (key === "q") {
        event.preventDefault();
        rotateSelected(-1);
        return;
      }
      if (key === "e") {
        event.preventDefault();
        rotateSelected(1);
        return;
      }
      if (key === "f") {
        event.preventDefault();
        flipSelected();
        return;
      }
      if (key === "h") {
        event.preventDefault();
        toggleHintLayer();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        snapSelectedPiece();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    flipSelected,
    nextChallenge,
    restart,
    rotateSelected,
    snapSelectedPiece,
    toggleHintLayer
  ]);

  useEffect(() => {
    if (state.status !== "playing") return undefined;
    const timer = window.setInterval(() => {
      setState((previous) => (
        previous.status === "playing"
          ? { ...previous, elapsedMs: previous.elapsedMs + 250 }
          : previous
      ));
    }, 250);
    return () => window.clearInterval(timer);
  }, [state.status]);

  const payloadBuilder = useCallback((snapshot) => {
    const targetSlots = getBoardSlotsForChallenge(snapshot.challenge, TANGRAM_BOARD_CONFIG);
    return {
      mode: "knowledge-arcade",
      variant: "tangram",
      coordinates: "svg_px_origin_top_left_xRight_yDown",
      locale,
      match: {
        current: snapshot.matchId + 1,
        total: KNOWLEDGE_ARCADE_MATCH_COUNT
      },
      challenge: {
        id: snapshot.challenge.id,
        label: snapshot.challenge.label,
        rotationVariant: snapshot.challenge.rotationVariant
      },
      board: {
        width: TANGRAM_BOARD_CONFIG.width,
        height: TANGRAM_BOARD_CONFIG.height,
        trayCenter: [TANGRAM_BOARD_CONFIG.trayCenterX, TANGRAM_BOARD_CONFIG.trayCenterY],
        targetCenter: [TANGRAM_BOARD_CONFIG.targetCenterX, TANGRAM_BOARD_CONFIG.targetCenterY]
      },
      progress: {
        status: snapshot.status,
        moves: snapshot.moves,
        elapsedMs: snapshot.elapsedMs,
        elapsedText: formatTangramElapsed(snapshot.elapsedMs),
        hintsUsed: snapshot.hintsUsed,
        overlapCount: snapshot.overlaps.length,
        lockedPieces: snapshot.pieces.filter((piece) => piece.locked).length
      },
      selectedPieceId: snapshot.selectedPieceId,
      message: snapshot.message,
      targetSlots: targetSlots.map((entry) => ({
        slotId: entry.slot.slotId,
        type: entry.slot.type,
        x: entry.pose.x,
        y: entry.pose.y,
        rotation: entry.pose.rotation,
        flip: entry.pose.flip
      })),
      overlaps: snapshot.overlaps.map((pair) => [...pair]),
      pieces: snapshot.pieces.map((piece) => ({
        id: piece.id,
        type: piece.type,
        x: Number(piece.x.toFixed(2)),
        y: Number(piece.y.toFixed(2)),
        rotation: piece.rotation,
        flip: piece.flip,
        locked: piece.locked,
        targetSlotId: piece.targetSlotId ?? null
      }))
    };
  }, [locale]);

  const advanceTime = useCallback((milliseconds) => {
    setState((previous) => (
      previous.status === "playing"
        ? { ...previous, elapsedMs: previous.elapsedMs + milliseconds }
        : previous
    ));
  }, []);

  useGameRuntimeBridge(state, payloadBuilder, advanceTime);

  const selectedPiece = state.pieces.find((piece) => piece.id === state.selectedPieceId) ?? null;
  const overlapIds = collectOverlappingPieceIds(state.overlaps);
  const boardSlots = getBoardSlotsForChallenge(state.challenge, TANGRAM_BOARD_CONFIG);
  const orderedPieces = [...state.pieces].sort((leftPiece, rightPiece) => {
    const leftPriority = leftPiece.id === state.selectedPieceId ? 1 : 0;
    const rightPriority = rightPiece.id === state.selectedPieceId ? 1 : 0;
    return leftPriority - rightPriority;
  });
  const elapsedText = formatTangramElapsed(state.elapsedMs);
  const lockedCount = state.pieces.filter((piece) => piece.locked).length;

  return (
    <div
      className={[
        "mini-game",
        "knowledge-game",
        "knowledge-arcade-game",
        "knowledge-tangram",
        viewport.isMobile ? "is-mobile" : "",
        viewport.isMobile ? `is-mobile-${viewport.orientation}` : ""
      ].filter(Boolean).join(" ")}
    >
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="tangram-head-actions">
          <button
            type="button"
            className="knowledge-ui-btn knowledge-ui-btn-secondary"
            onClick={nextChallenge}
          >
            {copy.next}
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
          "tangram-shell",
          viewport.isMobile ? "knowledge-mobile-shell" : ""
        ].filter(Boolean).join(" ")}
      >
        <div className="knowledge-status-row">
          <span>{copy.match}: {state.matchId + 1}/{KNOWLEDGE_ARCADE_MATCH_COUNT}</span>
          <span>{copy.challenge}: {state.challenge.label}</span>
          <span>{copy.locked}: {lockedCount}/{TANGRAM_PIECES.length}</span>
          <span>{copy.overlap}: {state.overlaps.length}</span>
          <span>{copy.moves}: {state.moves}</span>
          <span>{copy.time}: {elapsedText}</span>
          <span>{copy.status}: {state.status === "solved" ? copy.statusSolved : copy.statusPlaying}</span>
        </div>

        <p className="tangram-help">{copy.help}</p>

        <div className="tangram-tools">
          <span>{copy.selected}: {selectedPiece ? pieceLabels[selectedPiece.type] : copy.noneSelected}</span>
          <div className="tangram-tools-actions">
            <button type="button" className="knowledge-ui-btn" onClick={() => rotateSelected(-1)}>
              {copy.rotateLeft}
            </button>
            <button type="button" className="knowledge-ui-btn" onClick={() => rotateSelected(1)}>
              {copy.rotateRight}
            </button>
            <button type="button" className="knowledge-ui-btn" onClick={flipSelected}>
              {copy.flip}
            </button>
            <button type="button" className="knowledge-ui-btn" onClick={snapSelectedPiece}>
              {copy.snap}
            </button>
            <button
              type="button"
              className={`knowledge-ui-btn ${state.hintVisible ? "knowledge-ui-btn-accent" : ""}`.trim()}
              onClick={toggleHintLayer}
            >
              {state.hintVisible ? copy.hintOff : copy.hintOn}
            </button>
          </div>
        </div>

        <div className="tangram-board-shell">
          <svg
            ref={svgRef}
            className="tangram-board"
            viewBox={`0 0 ${TANGRAM_BOARD_CONFIG.width} ${TANGRAM_BOARD_CONFIG.height}`}
            role="img"
            aria-label={`${copy.title} ${state.challenge.label}`}
          >
            <rect className="tangram-zone tangram-zone-tray" x="18" y="18" width="430" height="524" rx="20" />
            <rect className="tangram-zone tangram-zone-target" x="498" y="18" width="464" height="524" rx="20" />
            <text className="tangram-zone-label" x="44" y="58">{copy.trayLabel}</text>
            <text className="tangram-zone-label" x="526" y="58">{copy.targetLabel}</text>

            <g className="tangram-target-layer">
              {boardSlots.map(({ slot, pose }) => {
                const polygon = transformTangramPolygon(
                  TANGRAM_SHAPES_BY_TYPE[slot.type],
                  pose,
                  TANGRAM_BOARD_CONFIG.scale
                );
                return (
                  <polygon
                    key={`target-${slot.slotId}`}
                    className="tangram-target-shape"
                    points={pointToString(polygon)}
                  />
                );
              })}
            </g>

            {state.hintVisible ? (
              <g className="tangram-hint-layer">
                {boardSlots.map(({ slot, pose }) => {
                  const polygon = transformTangramPolygon(
                    TANGRAM_SHAPES_BY_TYPE[slot.type],
                    pose,
                    TANGRAM_BOARD_CONFIG.scale
                  );
                  return (
                    <polygon
                      key={`hint-${slot.slotId}`}
                      className={`tangram-hint-shape type-${slot.type}`}
                      points={pointToString(polygon)}
                    />
                  );
                })}
              </g>
            ) : null}

            <g className="tangram-piece-layer">
              {orderedPieces.map((piece) => {
                const polygon = getTangramPolygonForPiece(piece, TANGRAM_BOARD_CONFIG.scale);
                const className = [
                  "tangram-piece",
                  `type-${piece.type}`,
                  piece.locked ? "locked" : "",
                  piece.id === state.selectedPieceId ? "selected" : "",
                  overlapIds.has(piece.id) ? "overlap" : ""
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <polygon
                    key={piece.id}
                    className={className}
                    points={pointToString(polygon)}
                    style={{ "--piece-color": piece.color }}
                    onPointerDown={(event) => onPiecePointerDown(event, piece.id)}
                  />
                );
              })}
            </g>
          </svg>
        </div>
      </section>

      <p className="game-message">{state.message}</p>
    </div>
  );
}

export default TangramKnowledgeGame;
