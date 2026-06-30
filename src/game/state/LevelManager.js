import TileMap, { TILE_SYMBOLS } from "../world/TileMap";

const buildRelayMap = (level) => {
  const size = 21;
  const grid = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) =>
      row === 0 || row === size - 1 || col === 0 || col === size - 1 ? "#" : "."
    )
  );

  // Sparse circuit islands keep every node reachable while avoiding the
  // characteristic symmetrical maze and central enclosure of the reference.
  const offset = (Math.max(1, Number(level) || 1) - 1) % 3;
  const islands = [
    [3, 3], [3, 9], [3, 15],
    [7, 6], [7, 13],
    [11, 3], [11, 9], [11, 16],
    [15, 6], [15, 13],
  ];
  for (const [baseRow, baseCol] of islands) {
    const row = Math.min(size - 3, baseRow + (baseCol % 2 ? offset : 0));
    const col = Math.min(size - 3, baseCol + (baseRow % 2 ? 0 : offset));
    grid[row][col] = "#";
    grid[row][col + 1] = "#";
    grid[row + 1][col] = "#";
  }

  grid[10][0] = ".";
  grid[10][size - 1] = ".";
  [[1, 1], [1, 19], [19, 1], [19, 19]].forEach(([row, col]) => { grid[row][col] = "o"; });
  grid[18][10] = "P";
  grid[2][2] = "B";
  grid[2][18] = "Y";
  grid[18][2] = "I";
  grid[18][18] = "C";
  grid[10][10] = "H";
  return grid.map((row) => row.join(""));
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default class LevelManager {
  constructor({ tileSize = 20 } = {}) {
    this.tileSize = tileSize;
  }

  getLevelConfig(level) {
    const safeLevel = Math.max(1, Number(level) || 1);
    const speedScale = 1 + (safeLevel - 1) * 0.07;

    return {
      level: safeLevel,
      tileSize: this.tileSize,
      pacmanSpeed: 78 * speedScale,
      ghostSpeed: 72 * speedScale,
      ghostFrightenedSpeed: 52 * speedScale,
      ghostEatenSpeed: 118,
      frightenedDuration: clamp(6.8 - (safeLevel - 1) * 0.65, 2.4, 6.8),
      lifeLostDelay: 1.2,
      levelClearDelay: 1.4,
      cornerBufferPx: this.tileSize * 0.22
    };
  }

  createLevel(level) {
    const config = this.getLevelConfig(level);
    const tileMap = TileMap.fromRows(buildRelayMap(level), { tileSize: config.tileSize });

    const pacmanSpawn = tileMap.getSpawnTile(TILE_SYMBOLS.PACMAN_SPAWN, { row: 15, col: 10 });
    const homeTile = tileMap.getSpawnTile(TILE_SYMBOLS.GHOST_HOME, { row: 10, col: 10 });

    const ghostSpawns = {
      blinky: tileMap.getSpawnTile(TILE_SYMBOLS.BLINKY_SPAWN, { row: 9, col: 9 }),
      pinky: tileMap.getSpawnTile(TILE_SYMBOLS.PINKY_SPAWN, { row: 9, col: 10 }),
      inky: tileMap.getSpawnTile(TILE_SYMBOLS.INKY_SPAWN, { row: 9, col: 11 }),
      clyde: tileMap.getSpawnTile(TILE_SYMBOLS.CLYDE_SPAWN, { row: 10, col: 9 })
    };

    const scatterTargets = {
      blinky: { row: 1, col: tileMap.cols - 2 },
      pinky: { row: 1, col: 1 },
      inky: { row: tileMap.rows - 2, col: tileMap.cols - 2 },
      clyde: { row: tileMap.rows - 2, col: 1 }
    };

    return {
      config,
      tileMap,
      pacmanSpawn,
      homeTile,
      ghostSpawns,
      scatterTargets
    };
  }
}
