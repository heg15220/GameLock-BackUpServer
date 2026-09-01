import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import { getCopy } from "./copy.js";
import { createObstaculosAudio, readStoredObstaculosMuted } from "./audio.js";
import { ObstaculosRuntime, DIFFICULTIES } from "./runtime.js";
import { drawScene } from "./scene.js";

const RUNNER_COLORS = ["#2f6fe0", "#e04f5f", "#2f9e4f", "#e8a317"];

export default function ObstaculosRodantesGame() {
  const locale = useMemo(() => (resolveBrowserLanguage() === "es" ? "es" : "en"), []);
  const copy = getCopy(locale);
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const rtRef = useRef(null);
  const [snap, setSnap] = useState(null);
  const [difficulty, setDifficulty] = useState("normal");
  const sizeRef = useRef({ w: 320, h: 200 });

  const handleFS = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const audio = createObstaculosAudio(readStoredObstaculosMuted());
    const rt = new ObstaculosRuntime({
      locale,
      audio,
      onSnapshot: setSnap,
      onFullscreen: handleFS,
    });
    rtRef.current = rt;

    // Measure the stage, never the canvas: the mobile shell styles stage
    // canvases with `object-fit: contain` and only wins on `height`.
    const sizeCanvas = () => {
      const stage = canvas.parentElement;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(320, Math.floor(stage?.clientWidth || canvas.clientWidth));
      const h = Math.max(200, Math.floor(stage?.clientHeight || canvas.clientHeight));
      sizeRef.current = { w, h };
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      const context = canvas.getContext("2d");
      if (context) context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sizeCanvas();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sizeCanvas) : null;
    ro?.observe(canvas);
    if (canvas.parentElement) ro?.observe(canvas.parentElement);

    let raf = 0;
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(60, now - last);
      last = now;
      const s = rt.advanceTime(dt);
      const context = canvas.getContext("2d");
      const { w, h } = sizeRef.current;
      if (context) drawScene(context, s, w, h, now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      rt.destroy();
      rtRef.current = null;
    };
  }, [locale, handleFS]);

  const buildPayload = useCallback((s) => s ?? {}, []);
  const advanceHandler = useCallback((ms) => rtRef.current?.advanceTime(ms), []);
  useGameRuntimeBridge(snap, buildPayload, advanceHandler);

  const press = useCallback((code) => rtRef.current?.pressVirtualKey(code), []);
  const toggleSound = useCallback(() => rtRef.current?.toggleAudioMuted(), []);

  useEffect(() => {
    const codes = ["Space", "ArrowUp", "KeyW", "Enter", "KeyR", "KeyP", "KeyF", "KeyM"];
    const onKey = (e) => {
      if (!codes.includes(e.code)) return;
      if (e.code === "Space" || e.code === "ArrowUp") e.preventDefault();
      // A held key must not auto-fire the hover: every press is a deliberate
      // shake, exactly as the original asks for.
      if (e.repeat) return;
      rtRef.current?.pressVirtualKey(e.code);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onStagePointer = useCallback((event) => {
    if (rtRef.current?.snapshot()?.screen === "racing") {
      event.preventDefault();
      rtRef.current.jump();
    }
  }, []);

  const chooseDifficulty = useCallback((key) => {
    setDifficulty(key);
    rtRef.current?.setDifficulty(key);
  }, []);

  const startRace = useCallback(() => {
    rtRef.current?.startRace(difficulty);
  }, [difficulty]);

  const screen = snap?.screen ?? "menu";
  const audioMuted = snap?.audio?.muted ?? readStoredObstaculosMuted();
  const seconds = ((snap?.raceMs ?? 0) / 1000).toFixed(1);
  const bestSeconds = snap?.bestMs ? (snap.bestMs / 1000).toFixed(1) : null;

  return (
    <div ref={rootRef} className="mini-game obstaculos-rodantes">
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="obst-actions">
          {screen === "racing" ? (
            <button type="button" onClick={() => press("KeyP")}>
              {snap?.paused ? copy.resume : copy.pause}
            </button>
          ) : null}
          {screen !== "menu" ? (
            <button type="button" onClick={() => press("KeyR")}>
              {copy.restart}
            </button>
          ) : null}
          <button
            id="obstaculos-rodantes-sound-btn"
            type="button"
            onClick={toggleSound}
            aria-pressed={!audioMuted}
            title={audioMuted ? copy.soundEnable : copy.soundDisable}
          >
            {audioMuted ? copy.soundOff : copy.soundOn}
          </button>
          <button type="button" onClick={handleFS}>
            {copy.fullscreen}
          </button>
        </div>
      </div>

      <div
        className={`obst-stage obst-stage--${screen}${snap?.you?.stumbling ? " is-impact" : ""}`}
        onPointerDown={onStagePointer}
        role={screen === "racing" ? "button" : undefined}
        aria-label={screen === "racing" ? copy.jump : undefined}
      >
        <canvas ref={canvasRef} className="obst-canvas" aria-label={copy.title} />

        {screen !== "menu" ? (
          <div className="obst-topbar">
            <span>
              {copy.distance} <strong>{Math.round(snap?.you?.dist ?? 0)}</strong>/{snap?.trackM ?? 100} m
            </span>
            <span>
              {copy.time} <strong>{seconds}s</strong>
            </span>
            <span>
              {copy.hits} <strong>{snap?.hits ?? 0}</strong>
            </span>
          </div>
        ) : null}

        {screen === "racing" ? (
          <div className="obst-physics-hud" aria-label={copy.speed}>
            <div className="obst-speed-readout">
              <span>{copy.speed}</span>
              <strong>{(snap?.you?.speed ?? 0).toFixed(1)} m/s</strong>
            </div>
            <div className="obst-speed-track" aria-hidden="true">
              <span style={{ width: `${Math.min(100, Math.max(0, (snap?.you?.speedRatio ?? 0) * 100))}%` }} />
            </div>
            <div className="obst-impulses">
              <span>{copy.impulse}</span>
              {Array.from({ length: snap?.you?.maxHovers ?? 3 }, (_, index) => (
                <i key={index} className={index < (snap?.you?.hoversLeft ?? 0) ? "is-ready" : ""} />
              ))}
            </div>
          </div>
        ) : null}

        {screen === "racing" && !snap?.paused ? (
          <div className="obst-jump-cue" aria-hidden="true">
            <kbd>{copy.jumpCue}</kbd>
            <span>{snap?.you?.airborne ? copy.hover : copy.jump}</span>
          </div>
        ) : null}

        {screen === "menu" ? (
          <div className="obst-overlay">
            <div className="obst-panel">
              <p className="obst-lead">{copy.menuLead}</p>
              <p className="obst-tip">{copy.menuTip}</p>
              <span className="obst-panel-label">{copy.difficulty}</span>
              <div className="obst-diffs">
                {DIFFICULTIES.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`obst-diff obst-diff--${key}${difficulty === key ? " is-active" : ""}`}
                    aria-pressed={difficulty === key}
                    onClick={(e) => {
                      e.stopPropagation();
                      chooseDifficulty(key);
                    }}
                  >
                    <strong>{copy.difficulties[key]}</strong>
                    <em>{copy.difficultyNotes[key]}</em>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="obst-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  startRace();
                }}
              >
                ▶ {copy.start}
              </button>
            </div>
          </div>
        ) : null}

        {screen === "racing" && snap?.paused ? (
          <div className="obst-overlay">
            <div className="obst-panel obst-panel--slim">
              <span className="obst-panel-label">{copy.paused}</span>
              <button
                type="button"
                className="obst-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  press("KeyP");
                }}
              >
                ▶ {copy.resume}
              </button>
            </div>
          </div>
        ) : null}

        {screen === "won" || screen === "lost" ? (
          <div className="obst-overlay">
            <div className="obst-panel">
              <span className="obst-outcome">
                {screen === "won" ? copy.winLead : copy.loseLead}
              </span>
              <div className="obst-final-stats">
                <span>
                  {copy.place} <strong>{snap?.placement ?? "—"}º</strong>
                </span>
                <span>
                  {copy.time} <strong>{seconds}s</strong>
                </span>
                <span>
                  {copy.hits} <strong>{snap?.hits ?? 0}</strong>
                </span>
                {bestSeconds ? (
                  <span>
                    {copy.best} <strong>{bestSeconds}s</strong>
                  </span>
                ) : null}
                <span>
                  {copy.wins} <strong>{snap?.wins ?? 0}</strong>
                </span>
              </div>
              <div className="obst-final-actions">
                <button
                  type="button"
                  className="obst-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    startRace();
                  }}
                >
                  ▶ {copy.again}
                </button>
                <button
                  type="button"
                  className="obst-act-back"
                  onClick={(e) => {
                    e.stopPropagation();
                    rtRef.current?.backToMenu();
                  }}
                >
                  {copy.changeSetup}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* The position bar: where the other three actually are, the way the
          original shows it under the track. */}
      <div className="obst-positions" aria-label={copy.distance}>
        {(snap?.runners ?? []).map((runner) => (
          <span
            key={runner.id}
            className={`obst-lane${runner.isHuman ? " is-you" : ""}${runner.stumbling ? " is-stumbling" : ""}`}
            style={{ "--obst-color": RUNNER_COLORS[runner.lane] }}
          >
            <em className="obst-lane-name">{runner.isHuman ? copy.you : `${copy.rival} ${runner.lane}`}</em>
            <span className="obst-lane-track">
              <span className="obst-lane-fill" style={{ width: `${runner.progress * 100}%` }} />
              <span className="obst-lane-dot" style={{ left: `${runner.progress * 100}%` }} />
            </span>
          </span>
        ))}
      </div>

      <p className="obst-hint">{copy.hint}</p>
    </div>
  );
}
