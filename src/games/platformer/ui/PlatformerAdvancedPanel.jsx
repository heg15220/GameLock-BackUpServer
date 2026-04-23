import React from "react";

function PlatformerAdvancedPanel({
  compactHud,
  stats,
  levelTitle,
  levelSubtitle,
  biomeLabel,
  difficultyLabel,
  showHelp,
  helpHints,
  controlsCopy,
  showRoute,
  showMechanics,
  showTouchControls,
  fullscreen,
  onToggleUiConfig,
  onRequestFullscreen,
}) {
  return (
    <>
      <section className="sky-runner-dx-panel sky-runner-dx-panel-primary">
        <div className={`sky-runner-dx-stat-grid ${compactHud ? "compact" : ""}`.trim()}>
          {stats.map(({ label, value }) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="sky-runner-dx-current-level">
          <strong>{levelTitle}</strong>
          <p>{levelSubtitle}</p>
          <p>Biome: {biomeLabel} | Difficulty: {difficultyLabel}</p>
        </div>
        {showHelp ? (
          <ul className="sky-runner-dx-hints">
            {helpHints.map((hint) => <li key={hint}>{hint}</li>)}
          </ul>
        ) : null}
        <p className="sky-runner-dx-controls-copy">{controlsCopy}</p>
      </section>

      <section className="sky-runner-dx-panel sky-runner-dx-panel-settings">
        <div className="sky-runner-dx-settings-head">
          <strong>Configuration</strong>
          <p>Layout controls for HUD, route map and on-screen actions.</p>
        </div>
        <div className="sky-runner-dx-toggle-grid">
          <button type="button" onClick={() => onToggleUiConfig("compactHud")}>
            HUD density: {compactHud ? "Compact" : "Detailed"}
          </button>
          <button type="button" onClick={() => onToggleUiConfig("showHelp")}>
            Help text: {showHelp ? "On" : "Off"}
          </button>
          <button type="button" onClick={() => onToggleUiConfig("showRoute")}>
            Route strip: {showRoute ? "On" : "Off"}
          </button>
          <button type="button" onClick={() => onToggleUiConfig("showMechanics")}>
            Mechanics chips: {showMechanics ? "On" : "Off"}
          </button>
          <button type="button" onClick={() => onToggleUiConfig("showTouchControls")}>
            Virtual controls: {showTouchControls ? "On" : "Off"}
          </button>
          <button type="button" onClick={onRequestFullscreen}>
            Display: {fullscreen ? "Fullscreen" : "Window"}
          </button>
        </div>
      </section>
    </>
  );
}

export default PlatformerAdvancedPanel;
