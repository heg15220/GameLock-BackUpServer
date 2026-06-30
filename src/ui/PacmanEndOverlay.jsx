import React from "react";

function PacmanEndOverlay({ mode, score, highScore, onRestart }) {
  const isWin = mode === "win";

  return (
    <div className="pacman-overlay-card" role="dialog" aria-label={isWin ? "Lumen Relay stabilized" : "Lumen Relay signal lost"}>
      <h5>{isWin ? "Network Stable" : "Signal Lost"}</h5>
      <p>{isWin ? "All configured sectors are online." : "The probe has no charge left."}</p>
      <p>Score: <strong>{score}</strong> | High Score: <strong>{highScore}</strong></p>
      <div className="pacman-overlay-actions">
        <button type="button" onClick={onRestart}>Play again</button>
      </div>
    </div>
  );
}

export default PacmanEndOverlay;
