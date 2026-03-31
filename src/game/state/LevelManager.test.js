import { describe, expect, it } from "vitest";
import LevelManager from "./LevelManager";
import GameState from "./GameState";
import { TILE_SYMBOLS } from "../world/TileMap";

const CARDINAL_DIRECTIONS = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 }
];

const collectReachableTiles = (tileMap, startTile, entityType = "pacman") => {
  const queue = [startTile];
  const visited = new Set([`${startTile.row},${startTile.col}`]);

  while (queue.length > 0) {
    const current = queue.shift();
    for (const direction of CARDINAL_DIRECTIONS) {
      const nextRow = current.row + direction.row;
      if (nextRow < 0 || nextRow >= tileMap.rows) continue;

      const nextCol = tileMap.wrapColumn(nextRow, current.col + direction.col);
      const key = `${nextRow},${nextCol}`;
      if (visited.has(key)) continue;
      if (!tileMap.isWalkable(nextRow, nextCol, { entityType })) continue;

      visited.add(key);
      queue.push({ row: nextRow, col: nextCol });
    }
  }

  return visited;
};

const findInaccessiblePellets = (tileMap, visitedTiles) => {
  const inaccessible = [];
  tileMap.forEachTile((tile, row, col) => {
    const isPellet = tile === TILE_SYMBOLS.PELLET || tile === TILE_SYMBOLS.POWER_PELLET;
    if (!isPellet) return;
    if (!visitedTiles.has(`${row},${col}`)) {
      inaccessible.push({ row, col, tile });
    }
  });
  return inaccessible;
};

describe("LevelManager", () => {
  it("keeps all pellets reachable for Pacman in every configured level", () => {
    const manager = new LevelManager({ tileSize: 20 });
    const maxLevel = new GameState().maxLevel;

    for (let level = 1; level <= maxLevel; level += 1) {
      const { tileMap, pacmanSpawn } = manager.createLevel(level);
      const reachable = collectReachableTiles(tileMap, pacmanSpawn);
      const inaccessiblePellets = findInaccessiblePellets(tileMap, reachable);

      expect(inaccessiblePellets, `inaccessible pellets in level ${level}`).toEqual([]);
    }
  });

  it("keeps ghost spawn/home network connected to avoid dead-end locks", () => {
    const manager = new LevelManager({ tileSize: 20 });
    const maxLevel = new GameState().maxLevel;

    for (let level = 1; level <= maxLevel; level += 1) {
      const { tileMap, homeTile, ghostSpawns } = manager.createLevel(level);
      const reachableGhostTiles = collectReachableTiles(tileMap, homeTile, "ghost");

      Object.values(ghostSpawns).forEach((spawn) => {
        expect(reachableGhostTiles.has(`${spawn.row},${spawn.col}`), `ghost spawn disconnected at level ${level}`).toBe(true);
      });

      tileMap.forEachTile((_, row, col) => {
        if (!tileMap.isWalkable(row, col, { entityType: "ghost" })) return;
        const exits = CARDINAL_DIRECTIONS.filter((direction) => {
          const nextRow = row + direction.row;
          if (nextRow < 0 || nextRow >= tileMap.rows) return false;
          const nextCol = tileMap.wrapColumn(nextRow, col + direction.col);
          return tileMap.isWalkable(nextRow, nextCol, { entityType: "ghost" });
        });
        expect(exits.length, `ghost dead-end tile at level ${level} (${row},${col})`).toBeGreaterThan(0);
      });
    }
  });
});
