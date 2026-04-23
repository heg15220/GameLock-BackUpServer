import React from "react";

function ArcheryHorizonAdvancedPanel({
  ui,
  snapshot,
  minYaw,
  maxYaw,
  minElevation,
  maxElevation,
  minIntensity,
  maxIntensity,
  onSetAimYaw,
  onSetAimElevation,
  onSetAimIntensity,
  onSelectLevel,
}) {
  const controlsDisabled = snapshot.screen !== "play" || snapshot.playState !== "aiming" || snapshot.paused;

  return (
    <>
      <section>
        <h5>{ui.labels.objective}</h5>
        <p>{ui.labels.objectiveBody}</p>
      </section>

      <section>
        <h5>{ui.labels.controls}</h5>
        <p>{ui.labels.controlsBody}</p>
      </section>

      <section className="archery-horizon-stats-grid">
        <article>
          <span>{ui.labels.level}</span>
          <strong>{snapshot.level.index}/{snapshot.level.total}</strong>
        </article>
        <article>
          <span>{ui.labels.unlocked}</span>
          <strong>{snapshot.level.unlocked}/{snapshot.level.total}</strong>
        </article>
        <article>
          <span>{ui.labels.distance}</span>
          <strong>{snapshot.level.distance.toFixed(1)} m</strong>
        </article>
        <article>
          <span>{ui.labels.difficulty}</span>
          <strong>{snapshot.level.difficulty}</strong>
        </article>
        <article>
          <span>{ui.labels.environment}</span>
          <strong>{snapshot.level.environment}</strong>
        </article>
        <article>
          <span>{ui.labels.wind}</span>
          <strong>{snapshot.level.windX >= 0 ? "+" : ""}{snapshot.level.windX.toFixed(2)} m/s</strong>
        </article>
      </section>

      <section className="archery-horizon-slider-card">
        <h5>{ui.labels.trajectory}</h5>
        <label>
          <span>{ui.labels.yaw}: {snapshot.aim.yawDeg.toFixed(1)} deg</span>
          <input
            type="range"
            min={minYaw}
            max={maxYaw}
            step="0.1"
            value={snapshot.aim.yawDeg}
            disabled={controlsDisabled}
            onChange={(event) => onSetAimYaw(Number(event.target.value))}
          />
        </label>
        <label>
          <span>{ui.labels.trajectory}: {snapshot.aim.elevationDeg.toFixed(1)} deg</span>
          <input
            type="range"
            min={minElevation}
            max={maxElevation}
            step="0.1"
            value={snapshot.aim.elevationDeg}
            disabled={controlsDisabled}
            onChange={(event) => onSetAimElevation(Number(event.target.value))}
          />
        </label>
        <label>
          <span>{ui.labels.intensity}: {Math.round(snapshot.aim.intensity * 100)}%</span>
          <input
            type="range"
            min={minIntensity}
            max={maxIntensity}
            step="0.001"
            value={snapshot.aim.intensity}
            disabled={controlsDisabled}
            onChange={(event) => onSetAimIntensity(Number(event.target.value))}
          />
        </label>
      </section>

      <section>
        <h5>{ui.labels.levelSelector}</h5>
        <input
          type="range"
          min="1"
          max={snapshot.level.unlocked}
          step="1"
          value={snapshot.level.index}
          onChange={(event) => onSelectLevel(Number(event.target.value))}
        />
        <p>{snapshot.level.index}/{snapshot.level.unlocked}</p>
      </section>

      <section className="archery-horizon-stats-grid">
        <article>
          <span>{ui.labels.attempts}</span>
          <strong>{snapshot.stats.attempts}</strong>
        </article>
        <article>
          <span>{ui.labels.hits}</span>
          <strong>{snapshot.stats.hits}</strong>
        </article>
        <article>
          <span>{ui.labels.bullseyes}</span>
          <strong>{snapshot.stats.bullseyes}</strong>
        </article>
        <article>
          <span>{ui.labels.score}</span>
          <strong>{snapshot.stats.score}</strong>
        </article>
        <article>
          <span>{ui.labels.streak}</span>
          <strong>{snapshot.stats.streak}</strong>
        </article>
        <article>
          <span>{ui.labels.bestStreak}</span>
          <strong>{snapshot.stats.bestStreak}</strong>
        </article>
      </section>
    </>
  );
}

export default ArcheryHorizonAdvancedPanel;
