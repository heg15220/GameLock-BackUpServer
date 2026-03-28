import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import { UI_COPY, localize } from "./copy";
import GolfTourRuntime from "./runtime";
import { LEVEL_COUNT, STAGE_HEIGHT, STAGE_WIDTH } from "./levels";

const DEFAULT_SNAPSHOT = {
  mode: "menu",
  playState: "idle",
  locale: "en",
  coordinates: "origin_top_left_x_right_y_down_pixels",
  level: {
    id: "",
    index: 1,
    total: LEVEL_COUNT,
    worldIndex: 1,
    worldLevel: 1,
    worldName: "",
    worldSubtitle: "",
    name: "",
    par: 3,
    difficulty: "Rookie",
  },
  score: {
    strokes: 0,
    totalStrokesSession: 0,
    starsAwarded: 0,
    totalStars: 0,
  },
  best: {
    stars: 0,
    strokes: null,
    timeMs: null,
  },
  timing: {
    elapsedMs: 0,
    timeLimitMs: 0,
  },
  ball: {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 9,
    moving: false,
  },
  aim: {
    angleDeg: -20,
    power: 0.5,
    dragging: false,
    preview: [],
  },
  physics: {
    surface: "fairway",
    friction: 0.986,
    bounce: 0.86,
    speed: 0,
    wind: { x: 0, y: 0 },
  },
  statusLabel: "",
  message: "",
  shotQuality: "standard",
  levelSummary: [],
  walls: [],
  zones: [],
  movers: [],
  bumpers: [],
  portals: [],
  hole: { x: 0, y: 0, radius: 14 },
  trail: [],
  fullscreen: false,
  deviceProfile: "desktop",
};

function resolveDeviceProfile() {
  if (typeof window === "undefined") {
    return "desktop";
  }
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
  const touchPoints = (navigator.maxTouchPoints ?? 0) > 0;
  return coarse || touchPoints ? "touch" : "desktop";
}

function renderEarnedStars(stars) {
  const safeStars = Math.max(0, Math.min(3, Number(stars) || 0));
  return "★".repeat(safeStars) || "☆";
}

function GolfTour2DGame() {
  const locale = useMemo(() => (resolveBrowserLanguage() === "es" ? "es" : "en"), []);
  const ui = useMemo(() => localize(UI_COPY, locale), [locale]);
  const canvasRef = useRef(null);
  const shellRef = useRef(null);
  const runtimeRef = useRef(null);
  const [snapshot, setSnapshot] = useState(DEFAULT_SNAPSHOT);
  const [deviceProfile, setDeviceProfile] = useState(resolveDeviceProfile);

  const requestFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      } else if (shell.requestFullscreen) {
        await shell.requestFullscreen();
      } else if (shell.webkitRequestFullscreen) {
        shell.webkitRequestFullscreen();
      }
    } catch {
      // Ignore fullscreen errors.
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const runtime = new GolfTourRuntime({
      canvas,
      locale,
      ui,
      onSnapshot: setSnapshot,
      onFullscreenRequest: requestFullscreen,
      deviceProfile,
    });
    runtimeRef.current = runtime;
    runtime.start();
    return () => {
      runtime.destroy();
      runtimeRef.current = null;
    };
  }, [deviceProfile, locale, requestFullscreen, ui]);

  useEffect(() => {
    const onFullscreen = () => {
      runtimeRef.current?.setFullscreenState(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("webkitfullscreenchange", onFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("webkitfullscreenchange", onFullscreen);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const media = window.matchMedia?.("(pointer: coarse)");
    const update = () => setDeviceProfile(resolveDeviceProfile());
    update();
    window.addEventListener("resize", update);
    media?.addEventListener?.("change", update);
    return () => {
      window.removeEventListener("resize", update);
      media?.removeEventListener?.("change", update);
    };
  }, []);

  useEffect(() => {
    runtimeRef.current?.setDeviceProfile(deviceProfile);
  }, [deviceProfile]);

  const buildTextPayload = useCallback(
    (state) => ({
      mode: "arcade-golf-tour-2d",
      screen: state.mode,
      playState: state.playState,
      coordinates: state.coordinates,
      level: state.level,
      score: state.score,
      best: state.best,
      timing: state.timing,
      ball: state.ball,
      aim: state.aim,
      physics: state.physics,
      statusLabel: state.statusLabel,
      shotQuality: state.shotQuality,
      message: state.message,
      hole: state.hole,
      zones: state.zones,
      movers: state.movers,
      portals: state.portals,
    }),
    []
  );

  const advanceTime = useCallback((ms) => runtimeRef.current?.advanceTime(ms), []);
  useGameRuntimeBridge(snapshot, buildTextPayload, advanceTime);

  const holdProps = useCallback(
    (key) => ({
      onMouseDown: () => runtimeRef.current?.setVirtualControl(key, true),
      onMouseUp: () => runtimeRef.current?.setVirtualControl(key, false),
      onMouseLeave: () => runtimeRef.current?.setVirtualControl(key, false),
      onTouchStart: (event) => {
        event.preventDefault();
        runtimeRef.current?.setVirtualControl(key, true);
      },
      onTouchEnd: (event) => {
        event.preventDefault();
        runtimeRef.current?.setVirtualControl(key, false);
      },
      onTouchCancel: () => runtimeRef.current?.setVirtualControl(key, false),
    }),
    []
  );

  const modeTag = ui.modeTags[snapshot.mode] ?? ui.modeTags.menu;
  const isTouchLayout = snapshot.deviceProfile === "touch" || deviceProfile === "touch";
  return (
    <div className={`mini-game golf-tour-game ${isTouchLayout ? "golf-tour-touch" : "golf-tour-desktop"}`}>
      <div className="mini-head golf-tour-head">
        <div>
          <p className="golf-tour-tag">{modeTag}</p>
          <h4>{ui.title}</h4>
          <p>{ui.subtitle}</p>
        </div>
        <div className="golf-tour-actions">
          <button type="button" onClick={() => runtimeRef.current?.startCampaign()}>
            {snapshot.score.totalStars > 0 ? ui.labels.continue : ui.labels.play}
          </button>
          <button type="button" onClick={() => runtimeRef.current?.openLevelSelect()}>
            {ui.labels.levelSelect}
          </button>
          <button type="button" onClick={() => runtimeRef.current?.restartLevel()}>
            {ui.labels.restart}
          </button>
          <button type="button" onClick={() => runtimeRef.current?.togglePause()}>
            {snapshot.mode === "paused" ? ui.labels.resume : ui.labels.pause}
          </button>
          <button type="button" onClick={requestFullscreen}>
            {ui.labels.fullscreen}
          </button>
        </div>
      </div>

      <div className="golf-tour-shell">
        <aside className="golf-tour-panel">
          <section>
            <h5>{ui.labels.objective}</h5>
            <p>{ui.objective}</p>
          </section>
          <section className="golf-tour-stats-grid">
            <article>
              <span>{ui.labels.level}</span>
              <strong>{snapshot.level.index}/{snapshot.level.total}</strong>
            </article>
            <article>
              <span>{ui.labels.world}</span>
              <strong>{snapshot.level.worldName}</strong>
            </article>
            <article>
              <span>{ui.labels.par}</span>
              <strong>{snapshot.level.par}</strong>
            </article>
            <article>
              <span>{ui.labels.strokes}</span>
              <strong>{snapshot.score.strokes}</strong>
            </article>
            <article>
              <span>{ui.labels.stars}</span>
              <strong>{snapshot.score.starsAwarded}</strong>
            </article>
          </section>
          <section className="golf-tour-status">
            <p>{ui.labels.status}: <strong>{snapshot.statusLabel}</strong></p>
            <p>{ui.labels.quality}: <strong>{ui.quality[snapshot.shotQuality] ?? snapshot.shotQuality}</strong></p>
            <p>{ui.labels.surface}: <strong>{snapshot.physics.surface}</strong></p>
            <p>{ui.labels.wind}: <strong>{snapshot.physics.wind.x} / {snapshot.physics.wind.y}</strong></p>
            <p>{ui.metrics.friction}: <strong>{snapshot.physics.friction}</strong></p>
            <p>{ui.metrics.bounce}: <strong>{snapshot.physics.bounce}</strong></p>
            <p>{ui.metrics.speed}: <strong>{snapshot.physics.speed}</strong></p>
          </section>
          <section>
            <h5>{ui.labels.controls}</h5>
            <p>{isTouchLayout ? ui.controlsTouch : ui.controlsDesktop}</p>
            <p className="golf-tour-coords">{ui.metrics.coordinates}</p>
          </section>
        </aside>

        <section className="golf-tour-stage-wrap">
          <div className="golf-tour-stage-head">
            <div>
              <strong>{snapshot.level.name}</strong>
              <p>{snapshot.level.worldSubtitle}</p>
            </div>
            <div className="golf-tour-head-chips">
              <span>{ui.labels.best}: {snapshot.best.stars}\u2605</span>
              <span>{ui.labels.totalStrokes}: {snapshot.score.totalStrokesSession}</span>
            </div>
          </div>

          <div ref={shellRef} className="golf-tour-canvas-shell">
            <canvas
              ref={canvasRef}
              className="golf-tour-canvas"
              width={STAGE_WIDTH}
              height={STAGE_HEIGHT}
              aria-label="Golf Tour 2D canvas"
            />

            {snapshot.mode === "menu" ? (
              <div className="golf-tour-overlay">
                <div className="golf-tour-overlay-card">
                  <h5>{ui.title}</h5>
                  <p>{ui.overlays.menuDescription}</p>
                  <p>{ui.overlays.continueHint}</p>
                  <div className="golf-tour-overlay-actions">
                    <button type="button" onClick={() => runtimeRef.current?.startCampaign()}>
                      {snapshot.score.totalStars > 0 ? ui.labels.continue : ui.labels.play}
                    </button>
                    <button type="button" onClick={() => runtimeRef.current?.openLevelSelect()}>
                      {ui.labels.levelSelect}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {snapshot.mode === "paused" ? (
              <div className="golf-tour-overlay">
                <div className="golf-tour-overlay-card">
                  <h5>{ui.labels.pause}</h5>
                  <p>{ui.overlays.pausedHint}</p>
                  <div className="golf-tour-overlay-actions">
                    <button type="button" onClick={() => runtimeRef.current?.togglePause()}>
                      {ui.labels.resume}
                    </button>
                    <button type="button" onClick={() => runtimeRef.current?.restartLevel()}>
                      {ui.labels.retry}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {snapshot.mode === "levelComplete" ? (
              <div className="golf-tour-overlay">
                <div className="golf-tour-overlay-card">
                  <h5>{snapshot.level.name}</h5>
                  <p>{ui.overlays.completeHint}</p>
                  <p>{renderEarnedStars(snapshot.score.starsAwarded)}</p>
                  <p>{ui.labels.strokes}: {snapshot.score.strokes}</p>
                  <div className="golf-tour-overlay-actions">
                    <button type="button" onClick={() => runtimeRef.current?.nextLevel()}>
                      {ui.labels.next}
                    </button>
                    <button type="button" onClick={() => runtimeRef.current?.restartLevel()}>
                      {ui.labels.retry}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {snapshot.mode === "campaignComplete" ? (
              <div className="golf-tour-overlay">
                <div className="golf-tour-overlay-card">
                  <h5>{ui.modeTags.campaignComplete}</h5>
                  <p>{ui.overlays.campaignHint}</p>
                  <p>{ui.labels.stars}: {snapshot.score.totalStars}</p>
                  <p>{ui.labels.totalStrokes}: {snapshot.score.totalStrokesSession}</p>
                  <div className="golf-tour-overlay-actions">
                    <button type="button" onClick={() => runtimeRef.current?.openLevelSelect()}>
                      {ui.labels.levelSelect}
                    </button>
                    <button type="button" onClick={() => runtimeRef.current?.openMenu()}>
                      {ui.labels.backMenu}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {snapshot.mode === "levelSelect" ? (
              <div className="golf-tour-overlay">
                <div className="golf-tour-overlay-card golf-tour-overlay-wide">
                  <div className="golf-tour-level-head">
                    <h5>{ui.labels.levelSelect}</h5>
                    <button type="button" onClick={() => runtimeRef.current?.openMenu()}>
                      {ui.labels.backMenu}
                    </button>
                  </div>
                  <div className="golf-tour-level-grid">
                    {snapshot.levelSummary.map((level) => (
                      <button
                        key={level.id}
                        type="button"
                        className={`golf-tour-level-button ${level.stars > 0 ? "cleared" : ""}`}
                        disabled={!level.unlocked}
                        onClick={() => runtimeRef.current?.playLevel(level.index)}
                      >
                        <strong>{level.index + 1}</strong>
                        <span>{level.name}</span>
                        <em>Par {level.par} · {"\u2605".repeat(level.stars)}{"\u2606".repeat(3 - level.stars)}</em>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="golf-tour-stage-foot">
            <p>{snapshot.message}</p>
          </div>

          <div className="golf-tour-touch-controls">
            <button type="button" {...holdProps("aimLeft")}>Angle -</button>
            <button type="button" {...holdProps("aimRight")}>Angle +</button>
            <button type="button" {...holdProps("powerDown")}>Power -</button>
            <button type="button" {...holdProps("powerUp")}>Power +</button>
            <button type="button" onClick={() => runtimeRef.current?.launchBall()}>
              {ui.labels.launch}
            </button>
            <button type="button" onClick={() => runtimeRef.current?.restartLevel()}>
              {ui.labels.retry}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default GolfTour2DGame;
