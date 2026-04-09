import React, { useCallback, useEffect, useMemo, useState } from "react";
import useMobileGameViewport from "../../mobile/useMobileGameViewport";
import useGameRuntimeBridge from "../../utils/useGameRuntimeBridge";
import {
  KNOWLEDGE_ARCADE_MATCH_COUNT,
  getRandomKnowledgeMatchId,
  getRandomKnowledgeMatchIdExcept,
  resolveKnowledgeArcadeLocale
} from "./knowledgeArcadeUtils";

const SOLVED = [1, 2, 3, 4, 5, 6, 7, 8, 0];
const DIRECTIONS = ["up", "down", "left", "right"];

const COPY_BY_LOCALE = {
  es: {
    title: "Puzle Deslizante 8",
    subtitle: "Ordena las fichas del 1 al 8 moviendo el espacio vacio.",
    restart: "Partida aleatoria",
    moves: "Movimientos",
    status: "Estado",
    statusWon: "Resuelto",
    statusPlaying: "En curso",
    match: "Partida",
    startMessage: "Ordena las fichas del 1 al 8.",
    movedTile: "Ficha movida.",
    movedBlank: "Movimiento aplicado.",
    solved: "Puzle resuelto."
  },
  en: {
    title: "Sliding Puzzle 8",
    subtitle: "Order tiles 1 to 8 by moving the empty space.",
    restart: "Random match",
    moves: "Moves",
    status: "Status",
    statusWon: "Solved",
    statusPlaying: "In progress",
    match: "Match",
    startMessage: "Order tiles from 1 to 8.",
    movedTile: "Tile moved.",
    movedBlank: "Move applied.",
    solved: "Puzzle solved."
  }
};

const arraysEqual = (left, right) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const swap = (items, left, right) => {
  const next = [...items];
  [next[left], next[right]] = [next[right], next[left]];
  return next;
};

const moveBlank = (tiles, direction) => {
  const blankIndex = tiles.indexOf(0);
  const row = Math.floor(blankIndex / 3);
  const col = blankIndex % 3;

  if (direction === "up" && row > 0) return swap(tiles, blankIndex, blankIndex - 3);
  if (direction === "down" && row < 2) return swap(tiles, blankIndex, blankIndex + 3);
  if (direction === "left" && col > 0) return swap(tiles, blankIndex, blankIndex - 1);
  if (direction === "right" && col < 2) return swap(tiles, blankIndex, blankIndex + 1);
  return null;
};

const serializeTiles = (tiles) => tiles.join(",");

const buildPuzzleCatalog = (limit) => {
  const queue = [SOLVED];
  const seen = new Set([serializeTiles(SOLVED)]);
  const catalog = [SOLVED];
  let pointer = 0;

  while (pointer < queue.length && catalog.length < limit) {
    const current = queue[pointer];
    pointer += 1;

    for (const direction of DIRECTIONS) {
      const next = moveBlank(current, direction);
      if (!next) continue;
      const key = serializeTiles(next);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push(next);
      catalog.push(next);
      if (catalog.length >= limit) {
        break;
      }
    }
  }

  return catalog;
};

const PUZZLE_CATALOG = buildPuzzleCatalog(KNOWLEDGE_ARCADE_MATCH_COUNT + 1);

const boardForMatch = (matchId) => {
  const index = (Number(matchId) || 0) % KNOWLEDGE_ARCADE_MATCH_COUNT;
  return [...(PUZZLE_CATALOG[index + 1] ?? SOLVED)];
};

const createInitialState = (matchId, copy) => ({
  matchId,
  tiles: boardForMatch(matchId),
  moves: 0,
  status: "playing",
  message: copy.startMessage
});

function PuzzleKnowledgeGame() {
  const locale = useMemo(resolveKnowledgeArcadeLocale, []);
  const copy = useMemo(() => COPY_BY_LOCALE[locale] ?? COPY_BY_LOCALE.en, [locale]);
  const viewport = useMobileGameViewport();
  const [state, setState] = useState(() =>
    createInitialState(getRandomKnowledgeMatchId(), copy)
  );

  const restart = useCallback(() => {
    setState((previous) => createInitialState(getRandomKnowledgeMatchIdExcept(previous.matchId), copy));
  }, [copy]);

  const moveByDirection = useCallback((direction) => {
    setState((previous) => {
      if (previous.status === "won") return previous;
      const nextTiles = moveBlank(previous.tiles, direction);
      if (!nextTiles) return previous;
      const solved = arraysEqual(nextTiles, SOLVED);
      return {
        ...previous,
        tiles: nextTiles,
        moves: previous.moves + 1,
        status: solved ? "won" : "playing",
        message: solved ? copy.solved : copy.movedBlank
      };
    });
  }, [copy]);

  const moveTile = useCallback((index) => {
    setState((previous) => {
      if (previous.status === "won") return previous;
      const blankIndex = previous.tiles.indexOf(0);
      const blankRow = Math.floor(blankIndex / 3);
      const blankCol = blankIndex % 3;
      const tileRow = Math.floor(index / 3);
      const tileCol = index % 3;
      const distance = Math.abs(blankRow - tileRow) + Math.abs(blankCol - tileCol);
      if (distance !== 1) return previous;
      const nextTiles = swap(previous.tiles, blankIndex, index);
      const solved = arraysEqual(nextTiles, SOLVED);
      return {
        ...previous,
        tiles: nextTiles,
        moves: previous.moves + 1,
        status: solved ? "won" : "playing",
        message: solved ? copy.solved : copy.movedTile
      };
    });
  }, [copy]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key;
      const normalized = key.toLowerCase();

      if (key === "ArrowUp") {
        event.preventDefault();
        moveByDirection("up");
        return;
      }
      if (key === "ArrowDown") {
        event.preventDefault();
        moveByDirection("down");
        return;
      }
      if (key === "ArrowLeft") {
        event.preventDefault();
        moveByDirection("left");
        return;
      }
      if (key === "ArrowRight") {
        event.preventDefault();
        moveByDirection("right");
        return;
      }
      if (normalized === "r") {
        restart();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moveByDirection, restart]);

  const payloadBuilder = useCallback((snapshot) => ({
    mode: "knowledge-arcade",
    variant: "puzle",
    coordinates: "3x3_grid_origin_top_left",
    locale,
    match: {
      current: snapshot.matchId + 1,
      total: KNOWLEDGE_ARCADE_MATCH_COUNT
    },
    status: snapshot.status,
    moves: snapshot.moves,
    tiles: snapshot.tiles,
    blankIndex: snapshot.tiles.indexOf(0),
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
        "knowledge-puzle",
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
          <span>{copy.moves}: {state.moves}</span>
          <span>{copy.status}: {state.status === "won" ? copy.statusWon : copy.statusPlaying}</span>
        </div>

        <div className="puzzle-grid">
          {state.tiles.map((tile, index) => (
            <button
              key={`${tile}-${index}`}
              type="button"
              className={`puzzle-tile ${tile === 0 ? "blank" : ""} ${tile !== 0 && tile === SOLVED[index] ? "aligned" : ""}`.trim()}
              onClick={() => moveTile(index)}
            >
              {tile === 0 ? "" : tile}
            </button>
          ))}
        </div>
      </section>

      <p className="game-message">{state.message}</p>
    </div>
  );
}

export default PuzzleKnowledgeGame;
