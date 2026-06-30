import React from "react";

function PacmanPauseOverlay({ onResume, onRestart }) {
  return (
    <div className="pacman-overlay-card" role="dialog" aria-label="Lumen Relay pause">
      <h5>Paused</h5>
      <p>Game loop halted. Resume when you are ready.</p>
      <div className="pacman-overlay-actions">
        <button type="button" onClick={onResume}>Resume</button>
        <button type="button" onClick={onRestart}>Restart run</button>
      </div>
    </div>
  );
}

export default PacmanPauseOverlay;
