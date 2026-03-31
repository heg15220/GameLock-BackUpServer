import { canMoveFromTile, distanceBetweenEntities, moveEntityOnGrid } from "../world/Collision";
import { findPathDistance } from "../ai/Pathfinding";
import { oppositeDirection } from "../world/directions";

const chooseRandom = (items, rng = Math.random) => {
  if (!items.length) return null;
  const index = Math.floor(rng() * items.length);
  return items[index];
};

export default class GhostBase {
  constructor({ id, color, spawnTile, scatterTarget, homeTile, speedFactor = 1 }) {
    this.id = id;
    this.color = color;
    this.spawnTile = { ...spawnTile };
    this.scatterTarget = { ...scatterTarget };
    this.homeTile = { ...homeTile };
    this.speedFactor = speedFactor;

    this.x = 0;
    this.y = 0;
    this.row = spawnTile.row;
    this.col = spawnTile.col;
    this.direction = "left";
    this.stateMode = "scatter";
    this.allowReverseNextTurn = true;
    this.targetTile = { ...scatterTarget };
    this.radius = 0;
  }

  reset(tileMap, mode = "scatter") {
    const spawn = tileMap.tileToWorld(this.spawnTile.row, this.spawnTile.col);
    this.x = spawn.x;
    this.y = spawn.y;
    this.row = this.spawnTile.row;
    this.col = this.spawnTile.col;
    this.direction = "left";
    this.stateMode = mode;
    this.allowReverseNextTurn = true;
    this.targetTile = { ...this.scatterTarget };
    this.radius = tileMap.tileSize * 0.42;
  }

  isFrightened() {
    return this.stateMode === "frightened";
  }

  isEaten() {
    return this.stateMode === "eaten";
  }

  canHarmPacman() {
    return !this.isFrightened() && !this.isEaten();
  }

  overlapsPacman(pacman, threshold = 0) {
    return distanceBetweenEntities(this, pacman) <= this.radius + pacman.radius + threshold;
  }

  setMode(nextMode) {
    if (this.stateMode === nextMode) {
      return;
    }

    this.stateMode = nextMode;
    this.allowReverseNextTurn = true;
    if (this.direction) {
      this.direction = oppositeDirection(this.direction);
    }
  }

  markEaten() {
    this.stateMode = "eaten";
    this.allowReverseNextTurn = true;
    if (this.direction) {
      this.direction = oppositeDirection(this.direction);
    }
  }

  resolveChaseTarget({ pacmanTile }) {
    return pacmanTile;
  }

  resolveSpeed(levelConfig) {
    if (this.stateMode === "eaten") {
      return levelConfig.ghostEatenSpeed;
    }
    if (this.stateMode === "frightened") {
      return levelConfig.ghostFrightenedSpeed;
    }
    return levelConfig.ghostSpeed * this.speedFactor;
  }

  chooseDirection({ tileMap, navigationGraph, levelConfig, pacman, blinky, rng }) {
    const currentTile = tileMap.worldToClampedTile(this.x, this.y);

    const options = navigationGraph.getAvailableDirections(
      currentTile.row,
      currentTile.col,
      this.direction,
      {
        entityType: "ghost",
        allowReverse: this.allowReverseNextTurn || this.stateMode === "eaten"
      }
    );

    if (!options.length) {
      return;
    }

    if (this.stateMode === "frightened") {
      this.targetTile = { ...currentTile };
      this.direction = chooseRandom(options, rng) ?? options[0];
      this.allowReverseNextTurn = false;
      return;
    }

    const pacmanTile = { row: pacman.row, col: pacman.col };
    const blinkyTile = blinky ? { row: blinky.row, col: blinky.col } : pacmanTile;

    if (this.stateMode === "eaten") {
      this.targetTile = { ...this.homeTile };
    } else if (this.stateMode === "scatter") {
      this.targetTile = { ...this.scatterTarget };
    } else {
      this.targetTile = this.resolveChaseTarget({
        tileMap,
        pacmanTile,
        pacmanDirection: pacman.direction ?? "left",
        blinkyTile,
        ghostTile: { row: currentTile.row, col: currentTile.col },
        scatterTarget: this.scatterTarget,
        levelConfig
      });
    }

    let bestDirection = options[0];
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const direction of options) {
      const nextTile = navigationGraph.stepTile(currentTile.row, currentTile.col, direction);
      const distance = findPathDistance(tileMap, navigationGraph, nextTile, this.targetTile, {
        entityType: "ghost"
      });

      const isBetter = distance < bestDistance;
      const isTieWithBetterPriority =
        distance === bestDistance
        && navigationGraph.directionPriority(direction) < navigationGraph.directionPriority(bestDirection);

      if (isBetter || isTieWithBetterPriority) {
        bestDistance = distance;
        bestDirection = direction;
      }
    }

    this.direction = bestDirection;
    this.allowReverseNextTurn = false;
  }

  update(deltaSeconds, context) {
    const {
      tileMap,
      navigationGraph,
      globalMode,
      modeChanged,
      levelConfig,
      pacman,
      blinky,
      rng = Math.random
    } = context;
    const selectDirection = () => {
      this.chooseDirection({
        tileMap,
        navigationGraph,
        levelConfig,
        pacman,
        blinky,
        rng
      });
    };

    const desiredMode = this.isEaten() ? "eaten" : globalMode;
    if (modeChanged && !this.isEaten()) {
      this.allowReverseNextTurn = true;
    }
    if (desiredMode !== this.stateMode && !this.isEaten()) {
      this.setMode(desiredMode);
    }

    const movementSpeed = this.resolveSpeed(levelConfig);
    const frameDistance = movementSpeed * deltaSeconds;
    const centerTolerance = Math.max(
      0.75,
      Math.min(tileMap.tileSize * 0.08, frameDistance * 0.9)
    );
    if (tileMap.isNearTileCenter(this.x, this.y, centerTolerance)) {
      tileMap.alignToTileCenter(this);

      if (
        this.stateMode === "eaten"
        && this.row === this.homeTile.row
        && this.col === this.homeTile.col
      ) {
        this.stateMode = globalMode === "frightened" ? "scatter" : globalMode;
        this.allowReverseNextTurn = true;
      }

      selectDirection();
    }

    const currentTile = tileMap.worldToClampedTile(this.x, this.y);
    if (this.direction && !canMoveFromTile(tileMap, currentTile.row, currentTile.col, this.direction, "ghost")) {
      // Rare safety net: if a level update leaves the ghost facing a blocked lane, repick immediately.
      this.allowReverseNextTurn = true;
      tileMap.alignToTileCenter(this);
      selectDirection();
    }

    let movedDistance = moveEntityOnGrid({
      tileMap,
      entity: this,
      direction: this.direction,
      distance: frameDistance,
      entityType: "ghost"
    });

    if (movedDistance <= 0) {
      tileMap.alignToTileCenter(this);
      this.allowReverseNextTurn = true;
      selectDirection();
      movedDistance = moveEntityOnGrid({
        tileMap,
        entity: this,
        direction: this.direction,
        distance: frameDistance,
        entityType: "ghost"
      });
    }

    const tile = tileMap.worldToClampedTile(this.x, this.y);
    this.row = tile.row;
    this.col = tile.col;
  }
}
