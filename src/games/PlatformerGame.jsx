import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PlatformerEngine from "./platformer/core/PlatformerEngine";
import { createInitialSnapshot } from "./platformer/ui/hudModel";
import useGameRuntimeBridge from "../utils/useGameRuntimeBridge";

const INITIAL_SNAPSHOT = createInitialSnapshot();

const statusByScreen = {
  start: "Ready",
  playing: "Playing",
  level_complete: "Sector Clear",
  game_over: "Run Failed",
  game_complete: "Route Cleared"
};

const resolveDeviceProfile = () => {
  if (typeof window === "undefined") {
    return "desktop";
  }
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches;
  const hasTouchPoints = (navigator.maxTouchPoints ?? 0) > 0;
  return coarsePointer || hasTouchPoints ? "touch" : "desktop";
};

const formatSeconds = (value) => `${Math.max(0, Math.ceil(value || 0))}s`;

function PlatformerGame() {
  const canvasRef = useRef(null);
  const shellRef = useRef(null);
  const engineRef = useRef(null);

  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);
  const [deviceProfile, setDeviceProfile] = useState(resolveDeviceProfile);
  const [fullscreen, setFullscreen] = useState(false);
  const [uiConfig, setUiConfig] = useState(() => ({
    compactHud: false,
    showRoute: true,
    showMechanics: true,
    showHelp: true,
    showTouchControls: resolveDeviceProfile() === "touch"
  }));

  const toggleUiConfig = useCallback((key) => {
    setUiConfig((current) => ({
      ...current,
      [key]: !current[key]
    }));
  }, []);

  const requestFullscreen = useCallback(async () => {
    const element = shellRef.current;
    if (!element) {
      return;
    }
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      } else if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      }
    } catch {
      // Ignore browser policy fullscreen errors.
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current || engineRef.current) {
      return undefined;
    }

    let isMounted = true;
    const engine = new PlatformerEngine(canvasRef.current, {
      onSnapshot: (nextSnapshot) => {
        if (!isMounted) {
          return;
        }
        setSnapshot(nextSnapshot);
      }
    });

    engineRef.current = engine;

    return () => {
      isMounted = false;
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const media = window.matchMedia?.("(pointer: coarse)");
    const updateDeviceProfile = () => setDeviceProfile(resolveDeviceProfile());
    updateDeviceProfile();
    window.addEventListener("resize", updateDeviceProfile);
    media?.addEventListener?.("change", updateDeviceProfile);
    return () => {
      window.removeEventListener("resize", updateDeviceProfile);
      media?.removeEventListener?.("change", updateDeviceProfile);
    };
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    };
  }, []);

  const withEngine = (callback) => (event) => {
    if (event?.cancelable) {
      event.preventDefault();
    }
    if (!engineRef.current) {
      return;
    }
    callback(engineRef.current);
  };

  const onAxisPress = useCallback((axis) => withEngine((engine) => engine.setVirtualAxis(axis)), []);
  const onAxisRelease = useCallback(withEngine((engine) => engine.setVirtualAxis(0)), []);
  const onStart = useCallback(withEngine((engine) => engine.start()), []);
  const onRestart = useCallback(withEngine((engine) => engine.restart()), []);
  const onAction = useCallback(withEngine((engine) => engine.action()), []);
  const onJumpDown = useCallback(
    withEngine((engine) => {
      engine.setVirtualJumpHeld(true);
      engine.jump();
    }),
    []
  );
  const onJumpUp = useCallback(withEngine((engine) => engine.setVirtualJumpHeld(false)), []);

  const buildTextPayload = useCallback((currentSnapshot) => {
    return {
      mode: "platformer_arcade",
      coordinates: currentSnapshot.coordinates,
      screen: currentSnapshot.screen,
      catalogLevelCount: currentSnapshot.catalogLevelCount,
      level: {
        index: currentSnapshot.levelIndex + 1,
        total: currentSnapshot.levelCount,
        id: currentSnapshot.levelId,
        name: currentSnapshot.levelName,
        biome: currentSnapshot.levelBiome,
        subtitle: currentSnapshot.levelSubtitle,
        difficulty: currentSnapshot.levelDifficulty,
        mechanics: currentSnapshot.levelMechanics
      },
      campaign: {
        route: currentSnapshot.runLevelIds,
        stages: currentSnapshot.runStages,
        bossLevels: currentSnapshot.runBossLevelCount
      },
      layout: currentSnapshot.levelLayout,
      visualStyle: currentSnapshot.levelVisualStyle,
      isBossLevel: currentSnapshot.isBossLevel,
      checkpoints: currentSnapshot.checkpoints,
      activeWind: currentSnapshot.activeWind,
      hazardCount: currentSnapshot.hazardCount,
      boss: currentSnapshot.activeBoss,
      score: currentSnapshot.score,
      lives: currentSnapshot.lives,
      timeLeft: currentSnapshot.timeLeft,
      coins: {
        collected: currentSnapshot.coinsCollected,
        total: currentSnapshot.coinsTotal
      },
      player: currentSnapshot.player,
      enemies: currentSnapshot.enemies,
      items: currentSnapshot.items,
      projectiles: currentSnapshot.projectiles,
      goal: currentSnapshot.goal,
      camera: currentSnapshot.camera,
      message: currentSnapshot.message
    };
  }, []);

  const advanceTime = useCallback((ms) => {
    return engineRef.current?.advanceTime(ms);
  }, []);

  useGameRuntimeBridge(snapshot, buildTextPayload, advanceTime);

  const statusLabel = statusByScreen[snapshot.screen] || snapshot.screen;
  const routeProgress = snapshot.levelCount > 0 ? snapshot.levelIndex / snapshot.levelCount : 0;
  const bossProgress = snapshot.runBossLevelCount > 0 && snapshot.runStages.length
    ? snapshot.runStages
      .slice(0, snapshot.levelIndex + (snapshot.screen === "level_complete" || snapshot.screen === "game_complete" ? 1 : 0))
      .filter((stage) => stage.isBossLevel).length / snapshot.runBossLevelCount
    : 0;
  const canRestart = useMemo(() => snapshot.screen !== "start", [snapshot.screen]);
  const mechanics = snapshot.levelMechanics || [];
  const routeStages = snapshot.runStages || [];
  const isTouchLayout = deviceProfile === "touch";
  const showTouchControls = isTouchLayout || uiConfig.showTouchControls;
  const controlsCopy = isTouchLayout
    ? "Touch controls: hold Left/Right to move, hold Jump for variable jump, tap Action to fire, Start to begin and Restart to reload the sector."
    : "Keyboard controls: A/D or Arrow keys move, W/Up/Space jumps, F/J/B uses action, Enter starts run and R restarts the current sector.";
  const helpHints = [
    snapshot.activeWind
      ? `Wind active (${snapshot.activeWind.label}): X ${snapshot.activeWind.forceX}, Y ${snapshot.activeWind.forceY}.`
      : "No active wind zone around the player.",
    snapshot.checkpoints.activeId
      ? `Active checkpoint: ${snapshot.checkpoints.activeId}.`
      : "No checkpoint active yet. Respawn remains at sector spawn.",
    snapshot.isBossLevel
      ? (snapshot.activeBoss
        ? `Boss objective: defeat ${snapshot.activeBoss.name} before capturing the beacon.`
        : "Boss objective: secure the beacon after clearing enemies.")
      : `Coin objective: ${snapshot.coinsCollected}/${snapshot.coinsTotal} collected.`,
    snapshot.hazardCount > 0
      ? `Hazards in sector: ${snapshot.hazardCount}.`
      : "No hazard lanes detected in this sector."
  ];
  const routeCompletion = `${Math.round(routeProgress * 100)}%`;
  const bossCompletion = `${Math.round(bossProgress * 100)}%`;

  return (
    <div className={`mini-game sky-runner-dx-game sky-runner-dx-game--${deviceProfile}`}>
      <div className="mini-head sky-runner-dx-head">
        <div>
          <p className="sky-runner-dx-world">Skyline Route</p>
          <h4>Sky Runner DX</h4>
          <p>
            32 handcrafted sectors with route progression, checkpoint routing, spring tech, wind lanes and boss arenas.
          </p>
        </div>
        <div className="sky-runner-dx-actions">
          <button type="button" onClick={onStart}>
            {snapshot.screen === "start" ? "Start Route" : "Resume Run"}
          </button>
          <button type="button" onClick={onRestart} disabled={!canRestart}>
            Restart Sector
          </button>
          <button type="button" onClick={requestFullscreen}>
            {fullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
        </div>
      </div>

      <div className="sky-runner-dx-shell">
        <div className="sky-runner-dx-side">
          <section className="sky-runner-dx-panel sky-runner-dx-panel-primary">
            <div className={`sky-runner-dx-stat-grid ${uiConfig.compactHud ? "compact" : ""}`.trim()}>
              <div>
                <span>Status</span>
                <strong>{statusLabel}</strong>
              </div>
              <div>
                <span>Sector</span>
                <strong>{snapshot.levelIndex + 1}/{snapshot.levelCount}</strong>
              </div>
              <div>
                <span>Score</span>
                <strong>{snapshot.score}</strong>
              </div>
              <div>
                <span>Lives</span>
                <strong>{snapshot.lives}</strong>
              </div>
              <div>
                <span>Coins</span>
                <strong>{snapshot.coinsCollected}/{snapshot.coinsTotal}</strong>
              </div>
              <div>
                <span>Time</span>
                <strong>{formatSeconds(snapshot.timeLeft)}</strong>
              </div>
              <div>
                <span>Route</span>
                <strong>{routeCompletion}</strong>
              </div>
              <div>
                <span>Bosses</span>
                <strong>{bossCompletion}</strong>
              </div>
            </div>
            <div className="sky-runner-dx-current-level">
              <strong>{snapshot.levelName}</strong>
              <p>{snapshot.levelSubtitle || "Deterministic arcade platforming sector."}</p>
              <p>Biome: {snapshot.levelBiome} | Difficulty: {snapshot.levelDifficulty}/5</p>
            </div>
            {uiConfig.showHelp ? (
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
              <button type="button" onClick={() => toggleUiConfig("compactHud")}>
                HUD density: {uiConfig.compactHud ? "Compact" : "Detailed"}
              </button>
              <button type="button" onClick={() => toggleUiConfig("showHelp")}>
                Help text: {uiConfig.showHelp ? "On" : "Off"}
              </button>
              <button type="button" onClick={() => toggleUiConfig("showRoute")}>
                Route strip: {uiConfig.showRoute ? "On" : "Off"}
              </button>
              <button type="button" onClick={() => toggleUiConfig("showMechanics")}>
                Mechanics chips: {uiConfig.showMechanics ? "On" : "Off"}
              </button>
              <button type="button" onClick={() => toggleUiConfig("showTouchControls")}>
                Virtual controls: {showTouchControls ? "On" : "Off"}
              </button>
              <button type="button" onClick={requestFullscreen}>
                Display: {fullscreen ? "Fullscreen" : "Window"}
              </button>
            </div>
          </section>
        </div>

        <div className="sky-runner-dx-stage-wrap">
          <div className="sky-runner-dx-stage-head">
            <div>
              <strong>{snapshot.levelName}</strong>
              <p>{snapshot.levelSubtitle || "Sector runtime telemetry synchronized with gameplay canvas."}</p>
            </div>
            <div className="sky-runner-dx-stage-chips">
              <span>{snapshot.levelBiome}</span>
              <span>Time {formatSeconds(snapshot.timeLeft)}</span>
              <span>Checkpoints {snapshot.checkpoints.activated}/{snapshot.checkpoints.total}</span>
              {snapshot.isBossLevel ? <span>Boss sector</span> : null}
            </div>
          </div>

          {uiConfig.showRoute ? (
            <div className="sky-runner-dx-route-strip">
              {routeStages.map((stage, index) => (
                <span
                  key={`${stage.id}-${index}`}
                  className={[
                    "sky-runner-dx-route-node",
                    index === snapshot.levelIndex ? "active" : "",
                    index < snapshot.levelIndex ? "cleared" : "",
                    stage.isBossLevel ? "boss" : ""
                  ].join(" ").trim()}
                >
                  {index + 1}. {stage.name}
                </span>
              ))}
            </div>
          ) : null}

          {uiConfig.showMechanics && mechanics.length ? (
            <div className="sky-runner-dx-mechanics-band">
              {mechanics.map((mechanic) => (
                <span key={mechanic}>{mechanic}</span>
              ))}
            </div>
          ) : null}

          <div className="sky-runner-dx-canvas-shell" ref={shellRef}>
            <canvas ref={canvasRef} className="sky-runner-dx-canvas" aria-label="Sky Runner DX canvas" />
          </div>

          <div className="sky-runner-dx-stage-footer">
            <p>{snapshot.message || "Ready to deploy on the skyline route."}</p>
            <p className="sky-runner-dx-callout">
              Player ({snapshot.player.x}, {snapshot.player.y}) | Vel ({snapshot.player.vx}, {snapshot.player.vy}) |
              Boss {snapshot.activeBoss ? `${snapshot.activeBoss.health}/${snapshot.activeBoss.maxHealth}` : "inactive"}
            </p>
          </div>

          {showTouchControls ? (
            <div className="sky-runner-dx-touch-controls" role="group" aria-label="Sky Runner DX touch controls">
              <button
                type="button"
                onMouseDown={onAxisPress(-1)}
                onMouseUp={onAxisRelease}
                onMouseLeave={onAxisRelease}
                onTouchStart={onAxisPress(-1)}
                onTouchEnd={onAxisRelease}
                onTouchCancel={onAxisRelease}
              >
                Left
              </button>
              <button
                type="button"
                onMouseDown={onAxisPress(1)}
                onMouseUp={onAxisRelease}
                onMouseLeave={onAxisRelease}
                onTouchStart={onAxisPress(1)}
                onTouchEnd={onAxisRelease}
                onTouchCancel={onAxisRelease}
              >
                Right
              </button>
              <button
                type="button"
                onMouseDown={onJumpDown}
                onMouseUp={onJumpUp}
                onMouseLeave={onJumpUp}
                onTouchStart={onJumpDown}
                onTouchEnd={onJumpUp}
                onTouchCancel={onJumpUp}
              >
                Jump
              </button>
              <button type="button" onClick={onAction}>
                Action
              </button>
              <button type="button" onClick={onStart}>
                Start
              </button>
              <button type="button" onClick={onRestart} disabled={!canRestart}>
                Restart
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default PlatformerGame;
