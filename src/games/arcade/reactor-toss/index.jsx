import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import { UI_COPY, localize } from "./copy";
import { STAGE_HEIGHT, STAGE_WIDTH } from "./core/physics/constants";
import { WORLD1_LEVELS } from "./core/level/world1";
import FluxBasinRuntime from "./runtime";

const DEFAULT_SNAPSHOT = {
  mode: "menu",
  playState: "idle",
  locale: "en",
  worldName: "Neon Foundry",
  worldSubtitle: "",
  levelId: "flux-01",
  levelIndex: 0,
  levelTotal: WORLD1_LEVELS.length,
  levelName: "Calibration",
  taxonomy: "direct",
  score: 0,
  bestScore: 0,
  starsEarned: 0,
  totalStars: 0,
  attempts: 1,
  launches: 0,
  rebounds: 0,
  elapsedMs: 0,
  timeLimitMs: 300000,
  selectedSkinId: "ember-core",
  selectedSkinName: "Ember",
  unlockedSkinIds: ["ember-core"],
  settings: {
    soundEnabled: true,
    vibrationEnabled: true,
    inputProfile: "standard",
    showTrajectoryHelp: true,
    autoRetry: true,
  },
  levels: [],
  ball: { active: false, x: 0, y: 0, vx: 0, vy: 0, radius: 18, targetDwellMs: 0 },
  target: { x: 0, y: 0, w: 108, h: 110 },
  obstacles: [],
  aim: { angleDeg: -34, power: 0.56, launchSpeed: 0, isDragging: false, dots: [] },
  result: "none",
  resultLabel: "",
  medalLabel: "",
  message: "",
  callout: "",
  levelHints: [],
  coordinates: "origin_top_left_x_right_y_down_pixels",
  fullscreen: false,
  deviceProfile: "desktop",
};

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function resolveDeviceProfile() {
  if (typeof window === "undefined") {
    return "desktop";
  }
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches;
  const hasTouchPoints = (navigator.maxTouchPoints ?? 0) > 0;
  return coarsePointer || hasTouchPoints ? "touch" : "desktop";
}

function FluxBasinGame() {
  const locale = useMemo(() => (resolveBrowserLanguage() === "es" ? "es" : "en"), []);
  const ui = useMemo(() => localize(UI_COPY, locale), [locale]);
  const canvasRef = useRef(null);
  const shellRef = useRef(null);
  const runtimeRef = useRef(null);
  const [snapshot, setSnapshot] = useState(DEFAULT_SNAPSHOT);
  const [deviceProfile, setDeviceProfile] = useState(resolveDeviceProfile);

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
      // ignore fullscreen failures
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const runtime = new FluxBasinRuntime({
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
    const onChange = () => {
      runtimeRef.current?.setFullscreenState(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
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
    runtimeRef.current?.setDeviceProfile(deviceProfile);
  }, [deviceProfile]);

  const buildTextPayload = useCallback(
    (state) => ({
      mode: "flux-basin",
      screen: state.mode,
      playState: state.playState,
      coordinates: state.coordinates,
      world: state.worldName,
      level: {
        id: state.levelId,
        current: state.levelIndex + 1,
        total: state.levelTotal,
        name: state.levelName,
        taxonomy: state.taxonomy,
      },
      score: state.score,
      bestScore: state.bestScore,
      starsEarned: state.starsEarned,
      totalStars: state.totalStars,
      attempts: state.attempts,
      rebounds: state.rebounds,
      time: {
        elapsedMs: state.elapsedMs,
        remainingMs: Math.max(0, state.timeLimitMs - state.elapsedMs),
      },
      settings: state.settings,
      deviceProfile: state.deviceProfile,
      aim: {
        angleDeg: state.aim.angleDeg,
        power: state.aim.power,
        launchSpeed: state.aim.launchSpeed,
        dragging: state.aim.isDragging,
      },
      ball: state.ball,
      target: state.target,
      obstacles: state.obstacles.map((obstacle) => ({
        id: obstacle.id,
        type: obstacle.type,
        x: obstacle.x,
        y: obstacle.y,
        w: obstacle.w,
        h: obstacle.h,
        radius: obstacle.radius,
        open: obstacle.open,
        pairId: obstacle.pairId,
      })),
      levels: state.levels.map((level) => ({
        id: level.id,
        index: level.index + 1,
        stars: level.stars,
        unlocked: level.unlocked,
        completed: level.completed,
      })),
      message: state.message,
      callout: state.callout,
      result: state.result,
    }),
    []
  );

  const advanceTime = useCallback((ms) => runtimeRef.current?.advanceTime(ms), []);

  useGameRuntimeBridge(snapshot, buildTextPayload, advanceTime);

  const holdButtonProps = (name) => ({
    onMouseDown: () => runtimeRef.current?.setVirtualControl(name, true),
    onMouseUp: () => runtimeRef.current?.setVirtualControl(name, false),
    onMouseLeave: () => runtimeRef.current?.setVirtualControl(name, false),
    onTouchStart: (event) => {
      event.preventDefault();
      runtimeRef.current?.setVirtualControl(name, true);
    },
    onTouchEnd: (event) => {
      event.preventDefault();
      runtimeRef.current?.setVirtualControl(name, false);
    },
    onTouchCancel: () => runtimeRef.current?.setVirtualControl(name, false),
  });

  const continueLevel = snapshot.levelId;
  const isLevelComplete = snapshot.mode === "levelComplete";
  const remainingMs = Math.max(0, snapshot.timeLimitMs - snapshot.elapsedMs);
  const activeDeviceProfile = snapshot.deviceProfile ?? deviceProfile;
  const isTouchLayout = activeDeviceProfile === "touch";
  const controlsCopy = isTouchLayout ? ui.sections.controlsTouch : ui.sections.controls;
  const readyMessage = isTouchLayout ? ui.messages.readyTouch : ui.messages.ready;

  return (
    <div className={`mini-game flux-basin-game flux-basin-game--${activeDeviceProfile}`}>
      <div className="mini-head flux-basin-head">
        <div>
          <p className="flux-basin-world">{ui.worldLabel}</p>
          <h4>{ui.title}</h4>
          <p>{ui.subtitle}</p>
        </div>
        <div className="flux-basin-actions">
          <button type="button" onClick={() => runtimeRef.current?.startLevel(continueLevel)}>
            {snapshot.totalStars > 0 ? ui.labels.continue : ui.labels.play}
          </button>
          <button type="button" onClick={() => runtimeRef.current?.openLevelSelect()}>
            {ui.labels.levelSelect}
          </button>
          <button type="button" onClick={() => runtimeRef.current?.togglePause()}>
            {snapshot.playState === "paused" ? ui.labels.resume : ui.labels.pause}
          </button>
          <button type="button" onClick={requestFullscreen}>{ui.labels.fullscreen}</button>
        </div>
      </div>

      <div className="flux-basin-shell">
        <div className="flux-basin-side">
          <section className="flux-basin-panel flux-basin-panel-primary">
            <div className="flux-basin-stat-grid">
              <div>
                <span>{ui.labels.level}</span>
                <strong>{snapshot.levelIndex + 1}/{snapshot.levelTotal}</strong>
              </div>
              <div>
                <span>{ui.labels.stars}</span>
                <strong>{snapshot.totalStars}</strong>
              </div>
              <div>
                <span>{ui.labels.attempts}</span>
                <strong>{snapshot.attempts}</strong>
              </div>
              <div>
                <span>{ui.labels.rebounds}</span>
                <strong>{snapshot.rebounds}</strong>
              </div>
              <div>
                <span>{ui.labels.best}</span>
                <strong>{snapshot.bestScore}</strong>
              </div>
              <div>
                <span>{ui.labels.time}</span>
                <strong>{formatTime(remainingMs)}</strong>
              </div>
            </div>
            <div className="flux-basin-current-level">
              <strong>{snapshot.levelName}</strong>
              <p>{ui.sections.objective}</p>
            </div>
            <ul className="flux-basin-hints">
              {snapshot.levelHints.map((hint) => <li key={hint}>{hint}</li>)}
            </ul>
            <p className="flux-basin-controls-copy">{controlsCopy}</p>
          </section>

          <section className="flux-basin-panel flux-basin-panel-settings">
            <div className="flux-basin-settings-head">
              <strong>{ui.labels.settings}</strong>
              <p>{ui.sections.settingsHint}</p>
            </div>
            <div className="flux-basin-toggle-grid">
              <button type="button" onClick={() => runtimeRef.current?.toggleSound()}>
                {ui.labels.audio}: {snapshot.settings.soundEnabled ? ui.toggles.on : ui.toggles.off}
              </button>
              <button type="button" onClick={() => runtimeRef.current?.toggleVibration()}>
                {ui.labels.vibration}: {snapshot.settings.vibrationEnabled ? ui.toggles.on : ui.toggles.off}
              </button>
              {!isTouchLayout ? (
                <button type="button" onClick={() => runtimeRef.current?.setShowTrajectoryHelp(!snapshot.settings.showTrajectoryHelp)}>
                  {ui.labels.assist}: {snapshot.settings.showTrajectoryHelp ? ui.toggles.on : ui.toggles.off}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => runtimeRef.current?.setInputProfile(snapshot.settings.inputProfile === "standard" ? "comfort" : "standard")}
              >
                {ui.labels.sensitivity}: {snapshot.settings.inputProfile === "standard" ? ui.toggles.standard : ui.toggles.comfort}
              </button>
              <button type="button" onClick={() => runtimeRef.current?.setAutoRetry(!snapshot.settings.autoRetry)}>
                {ui.labels.autoRetry}: {snapshot.settings.autoRetry ? ui.toggles.on : ui.toggles.off}
              </button>
              <button type="button" onClick={() => runtimeRef.current?.cycleSkin()}>
                {ui.labels.skin}: {snapshot.selectedSkinName}
              </button>
            </div>
          </section>
        </div>

        <div className="flux-basin-stage-wrap">
          <div className="flux-basin-stage-head">
            <div>
              <strong>{snapshot.levelName}</strong>
              <p>{ui.sections.menuTagline}</p>
            </div>
            <div className="flux-basin-stage-chips">
              <span>{ui.labels.time}: {formatTime(remainingMs)}</span>
              <span>{ui.labels.stars}: {snapshot.totalStars}</span>
              <span>{ui.labels.skin}: {snapshot.selectedSkinName}</span>
            </div>
          </div>

          <div className="flux-basin-canvas-shell" ref={shellRef}>
            <canvas
              ref={canvasRef}
              className="flux-basin-canvas"
              width={STAGE_WIDTH}
              height={STAGE_HEIGHT}
              aria-label="Flux Basin canvas"
            />

            {snapshot.mode === "menu" ? (
              <div className="flux-basin-overlay">
                <div className="flux-basin-overlay-card">
                  <p className="flux-basin-overlay-eyebrow">{snapshot.worldName}</p>
                  <h5>{ui.title}</h5>
                  <p>{ui.sections.worldSummary}</p>
                  <p>{snapshot.message || ui.messages.menu}</p>
                  <div className="flux-basin-overlay-actions">
                    <button type="button" onClick={() => runtimeRef.current?.startLevel(continueLevel)}>
                      {snapshot.totalStars > 0 ? ui.labels.continue : ui.labels.play}
                    </button>
                    <button type="button" onClick={() => runtimeRef.current?.openLevelSelect()}>
                      {ui.labels.levelSelect}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {snapshot.mode === "levelSelect" ? (
              <div className="flux-basin-overlay">
                <div className="flux-basin-overlay-card flux-basin-overlay-wide">
                  <div className="flux-basin-overlay-title">
                    <div>
                      <p className="flux-basin-overlay-eyebrow">{snapshot.worldName}</p>
                      <h5>{ui.labels.levelSelect}</h5>
                    </div>
                    <button type="button" onClick={() => runtimeRef.current?.openMenu()}>
                      {ui.labels.backMenu}
                    </button>
                  </div>
                  <div className="flux-basin-level-grid">
                    {snapshot.levels.map((level) => (
                      <button
                        key={level.id}
                        type="button"
                        className={`flux-basin-level-button ${level.completed ? "completed" : ""}`}
                        disabled={!level.unlocked}
                        onClick={() => runtimeRef.current?.startLevel(level.id)}
                      >
                        <strong>{level.index + 1}</strong>
                        <span>{level.name}</span>
                        <em>{"\u2605".repeat(level.stars)}{"\u2606".repeat(3 - level.stars)}</em>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {isLevelComplete ? (
              <div className="flux-basin-overlay">
                <div className={`flux-basin-overlay-card ${snapshot.fullscreen ? "" : "flux-basin-overlay-card--compact"}`.trim()}>
                  <p className="flux-basin-overlay-eyebrow">{snapshot.resultLabel}</p>
                  <h5>{snapshot.medalLabel}</h5>
                  <p>{ui.labels.stars}: {"\u2605".repeat(snapshot.starsEarned)}{"\u2606".repeat(3 - snapshot.starsEarned)}</p>
                  <p>{ui.labels.best}: {snapshot.score}</p>
                  <div className="flux-basin-overlay-actions">
                    <button type="button" onClick={() => runtimeRef.current?.nextLevel()}>
                      {ui.labels.nextLevel}
                    </button>
                    <button type="button" onClick={() => runtimeRef.current?.restartLevel()}>
                      {ui.labels.retry}
                    </button>
                    <button type="button" onClick={() => runtimeRef.current?.openLevelSelect()}>
                      {ui.labels.levelSelect}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {snapshot.playState === "paused" ? (
              <div className="flux-basin-overlay flux-basin-overlay-subtle">
                <div className="flux-basin-overlay-card">
                  <p className="flux-basin-overlay-eyebrow">{ui.labels.pause}</p>
                  <h5>{snapshot.levelName}</h5>
                  <div className="flux-basin-overlay-actions">
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
          </div>

          <div className="flux-basin-stage-footer">
            <p>{snapshot.message || readyMessage}</p>
            {snapshot.callout ? <p className="flux-basin-callout">{snapshot.callout}</p> : null}
          </div>

          {!isTouchLayout ? (
            <div className="flux-basin-touch-controls" role="group" aria-label="Flux Basin touch controls">
              <button type="button" {...holdButtonProps("aimLeft")}>Left Aim</button>
              <button type="button" {...holdButtonProps("aimRight")}>Right Aim</button>
              <button type="button" {...holdButtonProps("powerDown")}>Power -</button>
              <button type="button" {...holdButtonProps("powerUp")}>Power +</button>
              <button type="button" onClick={() => runtimeRef.current?.fireBall()}>Launch</button>
              <button type="button" onClick={() => runtimeRef.current?.restartLevel()}>{ui.labels.retry}</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default FluxBasinGame;
