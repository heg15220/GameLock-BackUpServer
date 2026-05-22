import React, { useCallback, useEffect, useRef, useState } from "react";
import PongRuntime from "./pong/PongRuntime";
import { DIFFICULTY_ORDER, DIFFICULTY_PRESETS, PONG_WIDTH, PONG_HEIGHT } from "./pong/constants";

const createDefaultSnapshot = () => ({
  variant: "pong",
  mode: "menu",
  message: "Pulsa START para jugar",
  playerScore: 0,
  aiScore: 0,
  targetScore: 9,
  secondsRemaining: 120,
  timerLabel: "02:00",
  rallyHits: 0,
  longestRally: 0,
  bestRally: 0,
  playerWins: 0,
  winner: null,
  difficultyKey: "arcade",
  difficultyLabel: "Arcade",
  ballMaxSpeed: 1060,
  aiProfile: "BAL",
  soundEnabled: true,
  playerControlMode: "keyboard",
  fullscreen: false,
  fps: 60,
  goalTop: 151,
  goalBottom: 389
});

function PongGame() {
  const canvasRef  = useRef(null);
  const runtimeRef = useRef(null);
  const shellRef   = useRef(null);
  const [snapshot, setSnapshot] = useState(createDefaultSnapshot);

  // — fullscreen helper ──────────────────────────────────────────────────────
  const requestFullscreen = useCallback(() => {
    const el = shellRef.current;
    if (!el) return;
    const rfs = el.requestFullscreen || el.webkitRequestFullscreen;
    if (rfs) rfs.call(el);
  }, []);

  // — mount runtime ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const runtime = new PongRuntime({
      canvas,
      onSnapshot: (snap) => setSnapshot(snap),
      initialDifficulty: "arcade",
      onFullscreenRequest: requestFullscreen
    });

    runtimeRef.current = runtime;
    runtime.start();

    return () => {
      runtime.destroy();
      runtimeRef.current = null;
    };
  }, [requestFullscreen]);

  // — sync fullscreen state ──────────────────────────────────────────────────
  useEffect(() => {
    const onChange = () => {
      const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      runtimeRef.current?.setFullscreenState(isFs);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  // — action callbacks ───────────────────────────────────────────────────────
  const handleStart = useCallback(() => runtimeRef.current?.startMatch(), []);
  const handleRestart = useCallback(() => runtimeRef.current?.restartMatch(), []);
  const handleTogglePause = useCallback(() => runtimeRef.current?.togglePause(), []);
  const handleToggleSound = useCallback(() => runtimeRef.current?.toggleSound(), []);
  const handleSelectDifficulty = useCallback((event) => {
    runtimeRef.current?.setDifficulty(event.target.value);
  }, []);
  const handleVirtualAxis = useCallback((v) => runtimeRef.current?.setVirtualAxis(v), []);

  const isActive  = snapshot.mode === "playing" || snapshot.mode === "countdown" || snapshot.mode === "roundBreak";
  const isMenu    = snapshot.mode === "menu";
  const isPaused  = snapshot.mode === "paused";
  const isFinished = snapshot.mode === "finished";

  return (
    <div className="mini-game pong-game">

      {/* ── header strip ───────────────────────────────────────────────── */}
      <div className="mini-head" data-mobile-menu-root="true">
        <div>
          <h4>Pong Neon Arena</h4>
          <p>Pong clásico 1 vs IA con física de english, dificultad adaptativa y audio Web.</p>
        </div>
        <div className="pong-actions">
          {(isMenu || isFinished) && (
            <button type="button" onClick={handleStart}>START</button>
          )}
          {isActive && (
            <button type="button" onClick={handleTogglePause}>PAUSA</button>
          )}
          {isPaused && (
            <button type="button" onClick={handleTogglePause}>CONTINUAR</button>
          )}
          {!isMenu && (
            <button type="button" onClick={handleRestart}>REINICIAR</button>
          )}
          <label className="pong-actions__field">
            <span>IA</span>
            <select
              value={snapshot.difficultyKey}
              onChange={handleSelectDifficulty}
              aria-label="Nivel de IA"
            >
              {DIFFICULTY_ORDER.map((difficultyKey) => (
                <option key={difficultyKey} value={difficultyKey}>
                  {DIFFICULTY_PRESETS[difficultyKey]?.label ?? difficultyKey}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={handleToggleSound}>
            {snapshot.soundEnabled ? "AUDIO" : "MUDO"}
          </button>
          <button type="button" onClick={requestFullscreen} title="Pantalla completa">[ ]</button>
        </div>
      </div>

      {/* ── scoreboard HUD ─────────────────────────────────────────────── */}
      <div className="pong-hud">
        <div className="pong-hud-player">
          <span className="pong-hud-label">1P</span>
          <span className="pong-hud-score player">{snapshot.playerScore}</span>
        </div>

        <div className="pong-hud-center">
          <span className="pong-hud-timer">{snapshot.timerLabel}</span>
          <span className="pong-hud-status">{snapshot.message}</span>
        </div>

        <div className="pong-hud-player">
          <span className="pong-hud-score ai">{snapshot.aiScore}</span>
          <span className="pong-hud-label">COM</span>
        </div>
      </div>

      {/* ── canvas stage ───────────────────────────────────────────────── */}
      <div className="phaser-canvas-shell pong-stage" ref={shellRef}>
        <div className="phaser-canvas-host">
          <canvas
            ref={canvasRef}
            width={PONG_WIDTH}
            height={PONG_HEIGHT}
            aria-label="Pong canvas"
          />
        </div>
      </div>

      {/* ── touch controls ─────────────────────────────────────────────── */}
      <div className="pong-touch-controls">
        <button
          type="button"
          className="pong-btn pong-btn-up"
          onMouseDown={() => handleVirtualAxis(-1)}
          onMouseUp={() => handleVirtualAxis(0)}
          onMouseLeave={() => handleVirtualAxis(0)}
          onTouchStart={(e) => { e.preventDefault(); handleVirtualAxis(-1); }}
          onTouchEnd={(e)   => { e.preventDefault(); handleVirtualAxis(0);  }}
          onTouchCancel={() => handleVirtualAxis(0)}
        >
          ▲
        </button>
        <button
          type="button"
          className="pong-btn pong-btn-down"
          onMouseDown={() => handleVirtualAxis(1)}
          onMouseUp={() => handleVirtualAxis(0)}
          onMouseLeave={() => handleVirtualAxis(0)}
          onTouchStart={(e) => { e.preventDefault(); handleVirtualAxis(1);  }}
          onTouchEnd={(e)   => { e.preventDefault(); handleVirtualAxis(0);  }}
          onTouchCancel={() => handleVirtualAxis(0)}
        >
          ▼
        </button>
        {(isMenu || isFinished) && (
          <button type="button" className="pong-btn pong-btn-start" onClick={handleStart}>
            START
          </button>
        )}
        {(isActive || isPaused) && (
          <button type="button" className="pong-btn pong-btn-pause" onClick={handleTogglePause}>
            {isPaused ? "▶" : "⏸"}
          </button>
        )}
      </div>

      {/* ── rally / stats strip ────────────────────────────────────────── */}
      <div className="pong-stats">
        <span>Rally: <strong>{snapshot.rallyHits}</strong></span>
        <span>Mejor: <strong>{snapshot.longestRally}</strong></span>
        <span>Récord: <strong>{snapshot.bestRally}</strong></span>
        <span>Victorias: <strong>{snapshot.playerWins}</strong></span>
        <span className="pong-ai-tag">IA {snapshot.aiProfile}</span>
      </div>

    </div>
  );
}

export default PongGame;
