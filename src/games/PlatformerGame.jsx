import React, { Suspense, lazy, useCallback, useState } from "react";

const loadPlatformerGameRuntime = () => import("./PlatformerGameRuntime");
const PlatformerGameRuntime = lazy(loadPlatformerGameRuntime);

function PlatformerGameLoadingShell() {
  return (
    <div className="mini-game sky-runner-dx-game sky-runner-dx-game--desktop">
      <div className="mini-head sky-runner-dx-head">
        <div>
          <p className="sky-runner-dx-world">Skyline Route</p>
          <h4>Sky Runner DX</h4>
          <p>Preparing route runtime, sector catalog, renderer, and boss arenas.</p>
        </div>
        <div className="sky-runner-dx-actions">
          <button type="button" disabled>
            Loading Route...
          </button>
        </div>
      </div>
      <div className="sky-runner-dx-shell">
        <div className="sky-runner-dx-side">
          <section className="sky-runner-dx-panel sky-runner-dx-panel-primary">
            <div className="sky-runner-dx-current-level">
              <strong>Route runtime on demand</strong>
              <p>The full 32-sector campaign loads only when the player actually opens it.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function PlatformerGameShell({ onOpen }) {
  return (
    <div className="mini-game sky-runner-dx-game sky-runner-dx-game--desktop">
      <div className="mini-head sky-runner-dx-head">
        <div>
          <p className="sky-runner-dx-world">Skyline Route</p>
          <h4>Sky Runner DX</h4>
          <p>32 handcrafted sectors with route progression, checkpoint routing, spring tech, wind lanes and boss arenas.</p>
        </div>
        <div className="sky-runner-dx-actions">
          <button
            type="button"
            onClick={onOpen}
            onPointerEnter={loadPlatformerGameRuntime}
            onFocus={loadPlatformerGameRuntime}
          >
            Open Route
          </button>
        </div>
      </div>

      <div className="sky-runner-dx-shell">
        <div className="sky-runner-dx-side">
          <section className="sky-runner-dx-panel sky-runner-dx-panel-primary">
            <div className="sky-runner-dx-current-level">
              <strong>Deferred campaign runtime</strong>
              <p>The heavy renderer and full sector catalog stay out of the entry path until the player starts the route.</p>
              <p>Hover or focus the button to preload before opening.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function PlatformerGame() {
  const [shouldLoadRuntime, setShouldLoadRuntime] = useState(false);
  const openRuntime = useCallback(() => {
    setShouldLoadRuntime(true);
  }, []);

  if (!shouldLoadRuntime) {
    return <PlatformerGameShell onOpen={openRuntime} />;
  }

  return (
    <Suspense fallback={<PlatformerGameLoadingShell />}>
      <PlatformerGameRuntime />
    </Suspense>
  );
}

export default PlatformerGame;
