import React from "react";

function OrchardAdvancedPanel({
  targetScoreLabel,
  targetPresetHint,
  targetScoreOptions,
  selectedTargetOptionId,
  onSelectTargetScorePreset,
  selectionDisabled,
  infoItems,
  controlsCopy,
}) {
  return (
    <>
      <div className="orchard-target-controls">
        <span>{targetScoreLabel}</span>
        <div className="orchard-target-options" role="group" aria-label={targetScoreLabel}>
          {targetScoreOptions.map((option) => {
            const active = option.id === selectedTargetOptionId;
            return (
              <button
                key={option.id}
                type="button"
                className={active ? "is-active" : ""}
                onClick={() => onSelectTargetScorePreset(option.id)}
                disabled={selectionDisabled}
                aria-pressed={active}
                style={{ "--orchard-target-accent": option.accent }}
              >
                <strong>{option.label}</strong>
                <span>{option.metaLabel}</span>
              </button>
            );
          })}
        </div>
        <p>{targetPresetHint}</p>
      </div>

      <div className="orchard-info-strip">
        {infoItems.map(({ label, value }) => (
          <span key={label}>
            {label}: <strong>{value}</strong>
          </span>
        ))}
      </div>

      <p className="orchard-controls">{controlsCopy}</p>
    </>
  );
}

export default OrchardAdvancedPanel;
