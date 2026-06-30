const STORAGE_KEY = "lumen_relay_high_score_v1";

const readHighScore = () => {
  if (typeof window === "undefined") return 0;
  const value = Number(window.localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
};

const writeHighScore = (score) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, String(Math.max(0, Math.floor(score))));
};

export default class GameState {
  constructor({ lives = 3, startLevel = 1, maxLevel = 3 } = {}) {
    this.defaultLives = lives;
    this.defaultStartLevel = startLevel;
    this.maxLevel = maxLevel;

    this.highScore = readHighScore();
    this.score = 0;
    this.lives = lives;
    this.level = startLevel;
    this.mode = "menu";
    this.message = "Press Start to play.";

    this.fps = 60;
    this.frameTime = 16.67;

    this.debug = false;
    this.soundEnabled = true;
  }

  setMetrics({ fps, frameTime }) {
    this.fps = fps;
    this.frameTime = frameTime;
  }

  setMode(mode, message = this.message) {
    this.mode = mode;
    this.message = message;
  }

  toggleDebug() {
    this.debug = !this.debug;
    return this.debug;
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = Boolean(enabled);
  }

  resetRun() {
    this.score = 0;
    this.lives = this.defaultLives;
    this.level = this.defaultStartLevel;
    this.mode = "playing";
    this.message = "Ready.";
  }

  addScore(points) {
    const amount = Math.max(0, Math.floor(Number(points) || 0));
    this.score += amount;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      writeHighScore(this.highScore);
    }
    return this.score;
  }

  loseLife() {
    this.lives = Math.max(0, this.lives - 1);
    if (this.lives <= 0) {
      this.mode = "gameover";
      this.message = "Game Over.";
      return false;
    }
    this.mode = "lifeLost";
    this.message = "Life lost.";
    return true;
  }

  completeLevel() {
    if (this.level >= this.maxLevel) {
      this.mode = "win";
      this.message = "Victory.";
      return false;
    }

    this.level += 1;
    this.mode = "playing";
    this.message = `Level ${this.level}`;
    return true;
  }

  toSnapshot() {
    return {
      score: this.score,
      highScore: this.highScore,
      lives: this.lives,
      level: this.level,
      mode: this.mode,
      message: this.message,
      fps: this.fps,
      frameTime: this.frameTime,
      debug: this.debug,
      soundEnabled: this.soundEnabled,
      maxLevel: this.maxLevel
    };
  }
}
