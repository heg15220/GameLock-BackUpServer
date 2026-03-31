import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../utils/useGameRuntimeBridge";
import PacmanRuntime from "../game/PacmanRuntime";
import PacmanMenu from "../ui/PacmanMenu";
import PacmanPauseOverlay from "../ui/PacmanPauseOverlay";
import PacmanEndOverlay from "../ui/PacmanEndOverlay";

const createDefaultSnapshot = () => ({
  variant: "pacman",
  coordinates: "origin_top_left_x_right_y_down_tile_centers",
  score: 0,
  highScore: 0,
  lives: 3,
  level: 1,
  mode: "menu",
  message: "Press Start to play.",
  fps: 60,
  frameTime: 16.67,
  debug: false,
  soundEnabled: true,
  maxLevel: 3,
  pelletsRemaining: 0,
  frightenedRemaining: 0,
  phaseMode: "scatter",
  pacman: null,
  ghosts: [],
  map: { rows: 0, cols: 0, tileSize: 0 }
});

function PacmanGame() {
  const canvasRef = useRef(null);
  const runtimeRef = useRef(null);
  const [snapshot, setSnapshot] = useState(createDefaultSnapshot);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const runtime = new PacmanRuntime({
      canvas,
      onSnapshot: (nextSnapshot) => setSnapshot(nextSnapshot),
      maxLevel: 3
    });

    runtimeRef.current = runtime;
    runtime.start();

    return () => {
      runtime.destroy();
      runtimeRef.current = null;
    };
  }, []);

  const startGame = useCallback(() => runtimeRef.current?.startGame(), []);
  const restartGame = useCallback(() => runtimeRef.current?.restartGame(), []);
  const togglePause = useCallback(() => runtimeRef.current?.togglePause(), []);
  const toggleSound = useCallback(() => runtimeRef.current?.toggleSound(), []);
  const toggleDebug = useCallback(() => runtimeRef.current?.toggleDebug(), []);

  const setVirtualDirection = useCallback((direction) => {
    runtimeRef.current?.setVirtualDirection(direction);
    if (direction) {
      runtimeRef.current?.queueDirection(direction);
    }
  }, []);

  const clearVirtualDirection = useCallback(() => {
    runtimeRef.current?.clearVirtualDirection();
  }, []);

  const buildTextPayload = useCallback((state) => ({
    mode: "pacman_arcade",
    coordinates: state.coordinates,
    status: state.mode,
    score: state.score,
    highScore: state.highScore,
    lives: state.lives,
    level: state.level,
    pelletsRemaining: state.pelletsRemaining,
    phaseMode: state.phaseMode,
    frightenedRemaining: state.frightenedRemaining,
    fps: state.fps,
    frameTime: state.frameTime,
    pacman: state.pacman,
    ghosts: state.ghosts,
    message: state.message,
    map: state.map,
    controls: {
      keyboard: "WASD/Arrows move, Enter/Space start, P/Esc pause, R restart",
      touch: "D-pad buttons queue/hold direction"
    }
  }), []);

  const advanceTime = useCallback((ms) => {
    runtimeRef.current?.advanceTime(ms);
  }, []);

  useGameRuntimeBridge(snapshot, buildTextPayload, advanceTime);

  const showMenu = snapshot.mode === "menu";
  const showPause = snapshot.mode === "paused";
  const showEnd = snapshot.mode === "gameover" || snapshot.mode === "win";
  const canPause = !showMenu && !showEnd;
  const startLabel = showMenu || showEnd ? "Start Run" : (showPause ? "Resume" : "Start");

  const statusMessage = useMemo(() => {
    if (snapshot.mode === "levelTransition") {
      return `Level ${snapshot.level} clear. Loading next maze...`;
    }
    if (snapshot.mode === "lifeLost") {
      return "Life lost. Respawning...";
    }
    return snapshot.message;
  }, [snapshot.level, snapshot.message, snapshot.mode]);

  return (
    <div className="mini-game pacman-game pacman-game--sky-runner sky-runner-dx-game">
      <div className="mini-head sky-runner-dx-head">
        <div>
          <p className="sky-runner-dx-world">Maze Route</p>
          <h4>Pac-Man Maze Protocol</h4>
          <p>Arcade chase con FSM de fantasmas, pellets, power mode, vidas y progresion por nivel.</p>
        </div>
        <div className="sky-runner-dx-actions">
          <button type="button" onClick={startGame}>
            {startLabel}
          </button>
          <button type="button" onClick={togglePause} disabled={!canPause}>
            {showPause ? "Resume" : "Pause"}
          </button>
          <button type="button" onClick={restartGame}>
            Restart
          </button>
          <button type="button" onClick={toggleSound}>
            {snapshot.soundEnabled ? "Sound On" : "Sound Off"}
          </button>
        </div>
      </div>

      <div className="sky-runner-dx-shell">
        <div className="sky-runner-dx-side">
          <section className="sky-runner-dx-panel sky-runner-dx-panel-primary">
            <div className="sky-runner-dx-stat-grid compact">
              <div>
                <span>Score</span>
                <strong>{snapshot.score}</strong>
              </div>
              <div>
                <span>High</span>
                <strong>{snapshot.highScore}</strong>
              </div>
              <div>
                <span>Lives</span>
                <strong>{snapshot.lives}</strong>
              </div>
              <div>
                <span>Level</span>
                <strong>{snapshot.level}/{snapshot.maxLevel}</strong>
              </div>
              <div>
                <span>Pellets</span>
                <strong>{snapshot.pelletsRemaining}</strong>
              </div>
              <div>
                <span>Phase</span>
                <strong>{snapshot.phaseMode}</strong>
              </div>
              <div>
                <span>FPS</span>
                <strong>{Math.round(snapshot.fps)}</strong>
              </div>
              <div>
                <span>Frame</span>
                <strong>{snapshot.frameTime.toFixed(1)} ms</strong>
              </div>
            </div>
          </section>

          <section className="sky-runner-dx-panel sky-runner-dx-panel-settings">
            <div className="sky-runner-dx-settings-head">
              <strong>Pac-Man Controls</strong>
              <p>WASD/flechas mueven, Enter/Espacio inicia, P/Esc pausa, R reinicia.</p>
            </div>
            <ul className="sky-runner-dx-hints">
              <li>Frightened restante: {snapshot.frightenedRemaining.toFixed(1)}s.</li>
              <li>Modo runtime: {snapshot.mode}.</li>
              <li>Debug: {snapshot.debug ? "enabled" : "disabled"}.</li>
            </ul>
            <div className="sky-runner-dx-toggle-grid">
              <button type="button" onClick={toggleDebug}>
                {snapshot.debug ? "Debug On" : "Debug Off"}
              </button>
              <button type="button" onClick={toggleSound}>
                {snapshot.soundEnabled ? "Sound On" : "Sound Off"}
              </button>
              <button type="button" onClick={restartGame}>
                Restart Run
              </button>
              <button type="button" onClick={togglePause} disabled={!canPause}>
                {showPause ? "Resume" : "Pause"}
              </button>
            </div>
          </section>
        </div>

        <div className="sky-runner-dx-stage-wrap pacman-stage-wrap--sky">
          <div className="sky-runner-dx-stage-head">
            <div>
              <strong>Maze {snapshot.level}</strong>
              <p>{statusMessage}</p>
            </div>
            <div className="sky-runner-dx-stage-chips">
              <span>Status {snapshot.mode}</span>
              <span>Ghosts {snapshot.ghosts.length}</span>
              <span>Lives {snapshot.lives}</span>
            </div>
          </div>

          <div className="sky-runner-dx-canvas-shell pacman-stage-shell">
            <canvas
              ref={canvasRef}
              className="sky-runner-dx-canvas pacman-canvas"
              aria-label="Pac-Man game canvas"
            />

            {showMenu ? <PacmanMenu onStart={startGame} onToggleSound={toggleSound} soundEnabled={snapshot.soundEnabled} /> : null}
            {showPause ? <PacmanPauseOverlay onResume={togglePause} onRestart={restartGame} /> : null}
            {showEnd ? <PacmanEndOverlay mode={snapshot.mode} score={snapshot.score} highScore={snapshot.highScore} onRestart={restartGame} /> : null}
          </div>

          <div className="sky-runner-dx-stage-footer">
            <p>{statusMessage}</p>
            <p className="sky-runner-dx-callout">
              Pac-Man ({snapshot.pacman?.row ?? "-"}, {snapshot.pacman?.col ?? "-"}) | Pellets {snapshot.pelletsRemaining}
            </p>
          </div>

          <div className="sky-runner-dx-touch-controls pacman-touch-controls" role="group" aria-label="Pac-Man touch controls">
            <button
              type="button"
              onMouseDown={() => setVirtualDirection("up")}
              onMouseUp={clearVirtualDirection}
              onMouseLeave={clearVirtualDirection}
              onTouchStart={() => setVirtualDirection("up")}
              onTouchEnd={clearVirtualDirection}
              onTouchCancel={clearVirtualDirection}
            >
              Up
            </button>
            <button
              type="button"
              onMouseDown={() => setVirtualDirection("left")}
              onMouseUp={clearVirtualDirection}
              onMouseLeave={clearVirtualDirection}
              onTouchStart={() => setVirtualDirection("left")}
              onTouchEnd={clearVirtualDirection}
              onTouchCancel={clearVirtualDirection}
            >
              Left
            </button>
            <button
              type="button"
              onMouseDown={() => setVirtualDirection("down")}
              onMouseUp={clearVirtualDirection}
              onMouseLeave={clearVirtualDirection}
              onTouchStart={() => setVirtualDirection("down")}
              onTouchEnd={clearVirtualDirection}
              onTouchCancel={clearVirtualDirection}
            >
              Down
            </button>
            <button
              type="button"
              onMouseDown={() => setVirtualDirection("right")}
              onMouseUp={clearVirtualDirection}
              onMouseLeave={clearVirtualDirection}
              onTouchStart={() => setVirtualDirection("right")}
              onTouchEnd={clearVirtualDirection}
              onTouchCancel={clearVirtualDirection}
            >
              Right
            </button>
            <button type="button" onClick={togglePause} disabled={!canPause}>Pause</button>
            <button type="button" onClick={startGame}>{startLabel}</button>
          </div>
        </div>
      </div>

      <p className="game-message">{statusMessage}</p>
    </div>
  );
}

export default PacmanGame;
