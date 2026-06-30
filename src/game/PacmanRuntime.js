import GameLoop from "./engine/GameLoop";
import InputManager from "./engine/InputManager";
import AudioManager from "./engine/AudioManager";
import NavigationGraph from "./world/NavigationGraph";
import LevelManager from "./state/LevelManager";
import GameState from "./state/GameState";
import GhostFSM from "./ai/GhostFSM";
import Pacman from "./entities/Pacman";
import Blinky from "./entities/Blinky";
import Pinky from "./entities/Pinky";
import Inky from "./entities/Inky";
import Clyde from "./entities/Clyde";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const RELAY_ANGLE = {
  right: 0,
  left: Math.PI,
  up: -Math.PI * 0.5,
  down: Math.PI * 0.5
};

const GHOST_DRAW_ORDER = ["blinky", "pinky", "inky", "clyde"];

export default class PacmanRuntime {
  constructor({ canvas, onSnapshot, maxLevel = 3 }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onSnapshot = onSnapshot;

    this.levelManager = new LevelManager({ tileSize: 20 });
    this.gameState = new GameState({ lives: 3, startLevel: 1, maxLevel });
    this.input = new InputManager(window);
    this.audio = new AudioManager();
    this.audio.setEnabled(this.gameState.soundEnabled);

    this.tileMap = null;
    this.navigationGraph = null;
    this.levelConfig = null;
    this.fsm = null;
    this.pacman = null;
    this.ghosts = [];

    this.lifeLostTimer = 0;
    this.levelClearTimer = 0;
    this.snapshotCooldown = 0;

    this.rng = Math.random;

    this.loop = new GameLoop({
      update: (dt) => this.update(dt),
      render: (_, metrics) => this.render(metrics)
    });

    this.loadLevel(this.gameState.level, { resetPellets: true, preserveMode: true });
    this.gameState.setMode("menu", "Press Start to play.");
    this.emitSnapshot();
  }

  getDimensions() {
    return {
      width: this.tileMap?.pixelWidth ?? 0,
      height: this.tileMap?.pixelHeight ?? 0
    };
  }

  start() {
    this.loop.start();
  }

  destroy() {
    this.loop.stop();
    this.input.destroy();
  }

  setSnapshotListener(listener) {
    this.onSnapshot = listener;
  }

  emitSnapshot(force = false) {
    if (!this.onSnapshot) return;
    if (!force && this.snapshotCooldown > 0) return;

    this.snapshotCooldown = 0.08;
    this.onSnapshot(this.buildSnapshot());
  }

  buildSnapshot() {
    const state = this.gameState.toSnapshot();
    const pacman = this.pacman
      ? {
          x: Number(this.pacman.x.toFixed(2)),
          y: Number(this.pacman.y.toFixed(2)),
          row: this.pacman.row,
          col: this.pacman.col,
          direction: this.pacman.direction,
          queuedDirection: this.pacman.queuedDirection
        }
      : null;

    const ghosts = GHOST_DRAW_ORDER.map((id) => this.ghosts.find((ghost) => ghost.id === id))
      .filter(Boolean)
      .map((ghost) => ({
        id: ghost.id,
        row: ghost.row,
        col: ghost.col,
        x: Number(ghost.x.toFixed(2)),
        y: Number(ghost.y.toFixed(2)),
        direction: ghost.direction,
        mode: ghost.stateMode,
        target: ghost.targetTile
      }));

    return {
      ...state,
      variant: "lumen_relay",
      coordinates: "origin_top_left_x_right_y_down_tile_centers",
      pelletsRemaining: this.tileMap?.remainingPellets ?? 0,
      frightenedRemaining: Number((this.fsm?.frightenedTimer ?? 0).toFixed(2)),
      phaseMode: this.fsm?.phaseMode ?? "scatter",
      pacman,
      ghosts,
      map: {
        rows: this.tileMap?.rows ?? 0,
        cols: this.tileMap?.cols ?? 0,
        tileSize: this.tileMap?.tileSize ?? 0
      }
    };
  }

  startGame() {
    this.audio.unlock();
    if (this.gameState.mode === "playing") return;

    if (this.gameState.mode === "menu" || this.gameState.mode === "gameover" || this.gameState.mode === "win") {
      this.gameState.resetRun();
      this.loadLevel(this.gameState.level, { resetPellets: true });
    }

    this.gameState.setMode("playing", "Ready.");
    this.loop.setPaused(false);
    this.audio.play("start");
    this.emitSnapshot(true);
  }

  restartGame() {
    this.gameState.resetRun();
    this.loadLevel(this.gameState.level, { resetPellets: true });
    this.gameState.setMode("playing", "Restarted.");
    this.loop.setPaused(false);
    this.audio.play("start");
    this.emitSnapshot(true);
  }

  togglePause() {
    if (this.gameState.mode === "menu" || this.gameState.mode === "gameover" || this.gameState.mode === "win") {
      return this.gameState.mode;
    }

    if (this.gameState.mode === "paused") {
      this.gameState.setMode("playing", "Resume.");
      this.loop.setPaused(false);
      this.emitSnapshot(true);
      return this.gameState.mode;
    }

    if (this.gameState.mode === "playing") {
      this.gameState.setMode("paused", "Paused.");
      this.loop.setPaused(true);
      this.emitSnapshot(true);
      return this.gameState.mode;
    }

    return this.gameState.mode;
  }

  toggleSound() {
    const enabled = this.audio.toggleEnabled();
    this.gameState.setSoundEnabled(enabled);
    this.emitSnapshot(true);
    return enabled;
  }

  toggleDebug() {
    const debug = this.gameState.toggleDebug();
    this.emitSnapshot(true);
    return debug;
  }

  queueDirection(direction) {
    this.input.queueDirection(direction);
  }

  setVirtualDirection(direction) {
    this.input.setVirtualDirection(direction);
  }

  clearVirtualDirection() {
    this.input.setVirtualDirection(null);
  }

  advanceTime(ms) {
    this.loop.advanceTime(ms);
    this.emitSnapshot(true);
  }

  loadLevel(level, { resetPellets = true, preserveMode = false } = {}) {
    const levelData = this.levelManager.createLevel(level);
    this.levelConfig = levelData.config;
    this.tileMap = levelData.tileMap;

    if (!resetPellets) {
      this.tileMap.resetDynamicTiles();
    }

    this.canvas.width = this.tileMap.pixelWidth;
    this.canvas.height = this.tileMap.pixelHeight;

    this.navigationGraph = new NavigationGraph(this.tileMap);
    this.fsm = new GhostFSM(level);

    this.pacman = new Pacman({
      spawnTile: levelData.pacmanSpawn,
      speed: this.levelConfig.pacmanSpeed,
      tileMap: this.tileMap
    });

    this.ghosts = [
      new Blinky({
        spawnTile: levelData.ghostSpawns.blinky,
        scatterTarget: levelData.scatterTargets.blinky,
        homeTile: levelData.homeTile
      }),
      new Pinky({
        spawnTile: levelData.ghostSpawns.pinky,
        scatterTarget: levelData.scatterTargets.pinky,
        homeTile: levelData.homeTile
      }),
      new Inky({
        spawnTile: levelData.ghostSpawns.inky,
        scatterTarget: levelData.scatterTargets.inky,
        homeTile: levelData.homeTile
      }),
      new Clyde({
        spawnTile: levelData.ghostSpawns.clyde,
        scatterTarget: levelData.scatterTargets.clyde,
        homeTile: levelData.homeTile
      })
    ];

    for (const ghost of this.ghosts) {
      ghost.reset(this.tileMap, this.fsm.phaseMode);
    }

    this.lifeLostTimer = 0;
    this.levelClearTimer = 0;

    if (!preserveMode && this.gameState.mode === "playing") {
      this.gameState.message = `Level ${this.gameState.level}`;
    }
  }

  resetEntityPositions() {
    this.pacman.reset(this.tileMap);
    this.pacman.setSpeed(this.levelConfig.pacmanSpeed);
    this.fsm.resetAfterLife();

    for (const ghost of this.ghosts) {
      ghost.reset(this.tileMap, this.fsm.phaseMode);
    }
  }

  handleLifeLost() {
    this.audio.play("death");
    const hasLivesLeft = this.gameState.loseLife();

    if (!hasLivesLeft) {
      this.loop.setPaused(true);
      this.emitSnapshot(true);
      return;
    }

    this.lifeLostTimer = this.levelConfig.lifeLostDelay;
    this.resetEntityPositions();
    this.loop.setPaused(false);
    this.emitSnapshot(true);
  }

  handlePelletAtPacman() {
    const pellet = this.tileMap.eatPellet(this.pacman.row, this.pacman.col);
    if (!pellet) return;

    this.gameState.addScore(pellet.points);
    this.audio.play(pellet.type === "power" ? "power" : "pellet");

    if (pellet.type === "power") {
      const changed = this.fsm.enterFrightened(this.levelConfig.frightenedDuration);
      if (changed) {
        for (const ghost of this.ghosts) {
          if (!ghost.isEaten()) {
            ghost.setMode("frightened");
          }
        }
      }
    }
  }

  handleGhostCollisions() {
    for (const ghost of this.ghosts) {
      if (!ghost.overlapsPacman(this.pacman, -this.tileMap.tileSize * 0.1)) {
        continue;
      }

      if (ghost.isFrightened()) {
        ghost.markEaten();
        const bonus = this.fsm.registerGhostEaten();
        this.gameState.addScore(bonus);
        this.gameState.message = `Sentinel disrupted +${bonus}`;
        this.audio.play("ghost");
        continue;
      }

      if (ghost.canHarmPacman()) {
        this.handleLifeLost();
        break;
      }
    }
  }

  handleLevelClear() {
    if (this.tileMap.remainingPellets > 0) {
      return;
    }

    this.gameState.addScore(1200 + this.gameState.level * 100);
    this.gameState.setMode("levelTransition", `Level ${this.gameState.level} clear.`);
    this.levelClearTimer = this.levelConfig.levelClearDelay;
    this.audio.play("level");
  }

  update(deltaSeconds) {
    const dt = clamp(deltaSeconds, 0, 0.1);
    this.snapshotCooldown = Math.max(0, this.snapshotCooldown - dt);

    if (this.input.consumeAction("toggleSound")) {
      this.toggleSound();
    }
    if (this.input.consumeAction("toggleDebug")) {
      this.toggleDebug();
    }
    if (this.input.consumeAction("restart")) {
      this.restartGame();
      return;
    }
    if (this.input.consumeAction("start")) {
      if (["menu", "gameover", "win"].includes(this.gameState.mode)) {
        this.startGame();
        return;
      }
      if (this.gameState.mode === "paused") {
        this.togglePause();
      }
    }
    if (this.input.consumeAction("pause")) {
      this.togglePause();
      return;
    }

    if (this.gameState.mode === "paused" || this.gameState.mode === "menu" || this.gameState.mode === "gameover" || this.gameState.mode === "win") {
      return;
    }

    if (this.gameState.mode === "lifeLost") {
      this.lifeLostTimer = Math.max(0, this.lifeLostTimer - dt);
      if (this.lifeLostTimer <= 0) {
        this.gameState.setMode("playing", "Ready.");
      }
      return;
    }

    if (this.gameState.mode === "levelTransition") {
      this.levelClearTimer = Math.max(0, this.levelClearTimer - dt);
      if (this.levelClearTimer <= 0) {
        const hasNextLevel = this.gameState.completeLevel();
        if (hasNextLevel) {
          this.loadLevel(this.gameState.level, { resetPellets: true });
          this.gameState.setMode("playing", `Level ${this.gameState.level}`);
          this.emitSnapshot(true);
        } else {
          this.loop.setPaused(true);
          this.emitSnapshot(true);
        }
      }
      return;
    }

    const fsmTick = this.fsm.update(dt);
    const inputDirection = this.input.peekDirection();

    this.pacman.update(dt, {
      tileMap: this.tileMap,
      navigationGraph: this.navigationGraph,
      inputDirection,
      cornerBufferPx: this.levelConfig.cornerBufferPx
    });

    this.handlePelletAtPacman();

    const blinky = this.ghosts.find((ghost) => ghost.id === "blinky");
    for (const ghost of this.ghosts) {
      ghost.update(dt, {
        tileMap: this.tileMap,
        navigationGraph: this.navigationGraph,
        globalMode: this.fsm.mode,
        modeChanged: fsmTick.changed,
        levelConfig: this.levelConfig,
        pacman: this.pacman,
        blinky,
        rng: this.rng
      });
    }

    this.handleGhostCollisions();
    this.handleLevelClear();
  }

  drawMap() {
    const ctx = this.ctx;
    const tileSize = this.tileMap.tileSize;

    const gradient = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    gradient.addColorStop(0, "#071a24");
    gradient.addColorStop(0.55, "#10283a");
    gradient.addColorStop(1, "#1b1638");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.tileMap.forEachTile((tile, row, col) => {
      const x = col * tileSize;
      const y = row * tileSize;

      if (tile === "#") {
        ctx.fillStyle = (row + col) % 2 ? "#21485a" : "#28566a";
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, tileSize - 4, tileSize - 4, 4);
        ctx.fill();
        ctx.strokeStyle = "rgba(124, 244, 220, 0.2)";
        ctx.stroke();
        return;
      }

      if (tile === "=") {
        ctx.strokeStyle = "#f9a8d4";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + tileSize * 0.5);
        ctx.lineTo(x + tileSize - 2, y + tileSize * 0.5);
        ctx.stroke();
        return;
      }

      if (tile === ".") {
        ctx.fillStyle = "#7cf4dc";
        ctx.fillRect(x + tileSize * 0.42, y + tileSize * 0.42, tileSize * 0.16, tileSize * 0.16);
      } else if (tile === "o") {
        const pulse = 0.14 + Math.abs(Math.sin(performance.now() * 0.008)) * 0.1;
        ctx.fillStyle = "#ff8e6e";
        ctx.beginPath();
        ctx.arc(x + tileSize * 0.5, y + tileSize * 0.5, tileSize * pulse, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  drawPacman() {
    const ctx = this.ctx;
    const angle = RELAY_ANGLE[this.pacman.direction] ?? 0;
    const pulse = 0.82 + Math.abs(Math.sin(this.pacman.mouthPhase)) * 0.18;
    ctx.save();
    ctx.translate(this.pacman.x, this.pacman.y);
    ctx.rotate(angle);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = "#7cf4dc";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#7cf4dc";
    ctx.beginPath();
    ctx.moveTo(this.pacman.radius, 0);
    ctx.lineTo(-this.pacman.radius * 0.72, -this.pacman.radius * 0.72);
    ctx.lineTo(-this.pacman.radius * 0.35, 0);
    ctx.lineTo(-this.pacman.radius * 0.72, this.pacman.radius * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawGhost(ghost) {
    const ctx = this.ctx;
    const radius = ghost.radius;
    const frightened = ghost.stateMode === "frightened";
    const eaten = ghost.stateMode === "eaten";

    let bodyColor = ghost.color;
    if (frightened) {
      const blink = this.fsm.frightenedTimer <= 2 && Math.floor(performance.now() / 130) % 2 === 0;
      bodyColor = blink ? "#e2e8f0" : "#2563eb";
    }
    if (eaten) {
      bodyColor = "rgba(15, 23, 42, 0.4)";
    }

    ctx.save();
    ctx.translate(ghost.x, ghost.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = bodyColor;
    ctx.shadowColor = bodyColor;
    ctx.shadowBlur = frightened ? 14 : 7;
    ctx.fillRect(-radius * 0.72, -radius * 0.72, radius * 1.44, radius * 1.44);
    ctx.strokeStyle = "#f4fbff";
    ctx.lineWidth = 2;
    ctx.strokeRect(-radius * 0.4, -radius * 0.4, radius * 0.8, radius * 0.8);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = "#071a24";
    ctx.fillRect(-radius * 0.5, -2, radius, 4);
    ctx.restore();
    return;

    const top = ghost.y - radius;
    const left = ghost.x - radius;

    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(ghost.x, top + radius, radius, Math.PI, 0, false);
    ctx.lineTo(left + radius * 2, top + radius * 2);

    const waveHeight = radius * 0.28;
    for (let i = 3; i >= 0; i -= 1) {
      const px = left + (i * radius * 2) / 4;
      const py = top + radius * 2 + (i % 2 === 0 ? 0 : waveHeight);
      ctx.lineTo(px, py);
    }

    ctx.closePath();
    ctx.fill();

    const eyeY = ghost.y - radius * 0.18;
    const leftEyeX = ghost.x - radius * 0.34;
    const rightEyeX = ghost.x + radius * 0.18;

    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.ellipse(leftEyeX, eyeY, radius * 0.2, radius * 0.26, 0, 0, Math.PI * 2);
    ctx.ellipse(rightEyeX, eyeY, radius * 0.2, radius * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();

    const pupilOffset = {
      up: { x: 0, y: -radius * 0.07 },
      down: { x: 0, y: radius * 0.08 },
      left: { x: -radius * 0.08, y: 0 },
      right: { x: radius * 0.08, y: 0 }
    }[ghost.direction] ?? { x: 0, y: 0 };

    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(leftEyeX + pupilOffset.x, eyeY + pupilOffset.y, radius * 0.08, 0, Math.PI * 2);
    ctx.arc(rightEyeX + pupilOffset.x, eyeY + pupilOffset.y, radius * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  drawDebug() {
    if (!this.gameState.debug) return;

    const ctx = this.ctx;
    const tileSize = this.tileMap.tileSize;

    ctx.save();
    ctx.globalAlpha = 0.6;

    for (const node of this.navigationGraph.intersections) {
      const center = this.tileMap.tileToWorld(node.row, node.col);
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(center.x, center.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const ghost of this.ghosts) {
      if (!ghost.targetTile) continue;
      const target = this.tileMap.tileToWorld(ghost.targetTile.row, ghost.targetTile.col);
      ctx.strokeStyle = ghost.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ghost.x, ghost.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();

      ctx.strokeStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(ghost.x, ghost.y, ghost.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(this.pacman.x, this.pacman.y, this.pacman.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  drawCenterMessage() {
    const mode = this.gameState.mode;
    let text = "";

    if (mode === "menu") text = "ACTIVATE RELAY";
    else if (mode === "paused") text = "PAUSED";
    else if (mode === "gameover") text = "SIGNAL LOST";
    else if (mode === "win") text = "NETWORK STABLE";
    else if (mode === "lifeLost") text = "RECALIBRATING";
    else if (mode === "levelTransition") text = `SECTOR ${this.gameState.level} STABLE`;

    if (!text) return;

    this.ctx.fillStyle = "rgba(2, 6, 23, 0.58)";
    this.ctx.fillRect(0, this.canvas.height * 0.42, this.canvas.width, this.canvas.height * 0.16);

    this.ctx.fillStyle = "#f8fafc";
    this.ctx.font = "700 24px Bricolage Grotesque, sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText(text, this.canvas.width * 0.5, this.canvas.height * 0.51);
  }

  render(metrics) {
    this.gameState.setMetrics({
      fps: Number(metrics.fps.toFixed(1)),
      frameTime: Number(metrics.frameTime.toFixed(2))
    });

    this.drawMap();
    this.drawPacman();

    for (const id of GHOST_DRAW_ORDER) {
      const ghost = this.ghosts.find((entry) => entry.id === id);
      if (ghost) {
        this.drawGhost(ghost);
      }
    }

    this.drawDebug();
    this.drawCenterMessage();
    this.emitSnapshot();
  }
}
