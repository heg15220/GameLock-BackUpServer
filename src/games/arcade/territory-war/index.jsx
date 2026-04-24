import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";

const loadTerritoryWarRuntime = () => import("./TerritoryWarRuntime");
const TerritoryWarRuntime = lazy(loadTerritoryWarRuntime);

function TerritoryWarLoadingShell() {
  return (
    <div className="mini-game">
      <div className="mini-head">
        <div>
          <h4>Territory War</h4>
          <p>Preparing battlefield runtime, terrain set, squads, and tactical HUD.</p>
        </div>
      </div>
      <div className="phaser-canvas-shell" style={{ minHeight: 520, display: "grid", placeItems: "center" }}>
        <p>Loading battlefield...</p>
      </div>
    </div>
  );
}

function TerritoryWarShell({ onOpen }) {
  return (
    <div className="mini-game">
      <div className="mini-head">
        <div>
          <h4>Territory War</h4>
          <p>Tactical stick duel with long-range throws, cannon control, and battlefield terrain.</p>
        </div>
        <div className="mini-actions">
          <button
            type="button"
            onClick={onOpen}
            onPointerEnter={loadTerritoryWarRuntime}
            onFocus={loadTerritoryWarRuntime}
          >
            Open Battlefield
          </button>
        </div>
      </div>
      <div className="phaser-canvas-shell" style={{ minHeight: 520, display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 560, textAlign: "center" }}>
          <strong>Deferred battle runtime</strong>
          <p>The map set, AI turn simulation, tactical HUD, and touch overlay now load only when the player opens the match.</p>
          <p>Hover or focus the button to preload before entering.</p>
        </div>
      </div>
    </div>
  );
}

export default function TerritoryWar() {
  const shellRef = useRef(null);
  const [shouldLoadRuntime, setShouldLoadRuntime] = useState(false);
  const openRuntime = useCallback(() => {
    setShouldLoadRuntime(true);
  }, []);

  useEffect(() => {
    const shellElement = shellRef.current;
    if (!shellElement) {
      return;
    }

    if (shellElement.closest(".mobile-game-shell")) {
      setShouldLoadRuntime(true);
    }
  }, []);

  if (!shouldLoadRuntime) {
    return (
      <div ref={shellRef}>
        <TerritoryWarShell onOpen={openRuntime} />
      </div>
    );
  }

  return (
    <div ref={shellRef}>
      <Suspense fallback={<TerritoryWarLoadingShell />}>
        <TerritoryWarRuntime />
      </Suspense>
    </div>
  );
}
