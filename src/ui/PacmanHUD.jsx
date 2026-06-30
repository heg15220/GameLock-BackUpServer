import React from "react";

function PacmanHUD({ snapshot, onPause, onRestart, onToggleSound, onToggleDebug }) {
  return (
    <div className="pacman-hud">
      <div className="pacman-hud-row">
        <span>Score: <strong>{snapshot.score}</strong></span>
        <span>High: <strong>{snapshot.highScore}</strong></span>
        <span>Lives: <strong>{snapshot.lives}</strong></span>
        <span>Level: <strong>{snapshot.level}</strong></span>
      </div>
      <div className="pacman-hud-row">
        <span>Nodes: <strong>{snapshot.pelletsRemaining}</strong></span>
        <span>Mode: <strong>{snapshot.phaseMode}</strong></span>
        <span>FPS: <strong>{Math.round(snapshot.fps)}</strong></span>
        <span>Frame: <strong>{snapshot.frameTime.toFixed(1)}ms</strong></span>
      </div>
      <div className="pacman-hud-actions">
        <button type="button" onClick={onPause}>{snapshot.mode === "paused" ? "Resume" : "Pause"}</button>
        <button type="button" onClick={onRestart}>Restart</button>
        <button type="button" onClick={onToggleSound}>{snapshot.soundEnabled ? "Sound On" : "Sound Off"}</button>
        <button type="button" onClick={onToggleDebug}>{snapshot.debug ? "Debug On" : "Debug Off"}</button>
      </div>
    </div>
  );
}

export default PacmanHUD;
