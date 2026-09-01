import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import { getCopy } from "./copy.js";
import { createCombaAudio, readStoredCombaMuted } from "./audio.js";
import { LaCombaRuntime, DIFFICULTIES } from "./runtime.js";
import { drawScene } from "./scene.js";

export default function LaCombaGame() {
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

    const audio = createCombaAudio(readStoredCombaMuted());
    const rt = new LaCombaRuntime({
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
    const codes = ["Space", "Enter", "ArrowUp", "KeyR", "KeyP", "KeyF", "KeyM"];
    const onKey = (e) => {
      if (!codes.includes(e.code)) return;
      if (e.code === "Space" || e.code === "ArrowUp") e.preventDefault();
      // Holding a key must not machine-gun the rope: one turn per press.
      if (e.repeat) return;
      rtRef.current?.pressVirtualKey(e.code);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The whole stage is the beat pad while a run is going.
  const onStagePointer = useCallback((event) => {
    if (rtRef.current?.snapshot()?.screen === "playing") {
      event.preventDefault();
      rtRef.current.turn();
    }
  }, []);

  const chooseDifficulty = useCallback((key) => {
    setDifficulty(key);
    rtRef.current?.setDifficulty(key);
  }, []);

  const startRound = useCallback(() => {
    rtRef.current?.startRound(difficulty);
  }, [difficulty]);

  const screen = snap?.screen ?? "menu";
  const audioMuted = snap?.audio?.muted ?? readStoredCombaMuted();
  const urgent = screen === "playing" && (snap?.secondsLeft ?? 60) <= 8;
  const timePct = Math.max(0, Math.min(100, (1 - (snap?.timeProgress ?? 0)) * 100));
  const jumpPct = Math.max(0, Math.min(100, ((snap?.jumps ?? 0) / (snap?.target || 1)) * 100));
  const syncPct = Math.round((snap?.sync ?? 1) * 100);

  return (
    <div ref={rootRef} className="mini-game la-comba">
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="comba-actions">
          {screen === "playing" ? (
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
            id="la-comba-sound-btn"
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
        className={`comba-stage comba-stage--${screen}`}
        onPointerDown={onStagePointer}
        role={screen === "playing" ? "button" : undefined}
        aria-label={screen === "playing" ? copy.turn : undefined}
      >
        <canvas ref={canvasRef} className="comba-canvas" aria-label={copy.title} />

        {screen !== "menu" ? (
          <div className="comba-topbar">
            <span className="comba-jumps">
              {copy.jumps} <strong>{snap?.jumps ?? 0}</strong>/{snap?.target ?? 0}
            </span>
            <div className={`comba-timer${urgent ? " is-urgent" : ""}`}>
              <span className="comba-timer-value">{snap?.secondsLeft ?? 60}</span>
              <div className="comba-timer-track">
                <div className="comba-timer-fill" style={{ width: `${timePct}%` }} />
              </div>
            </div>
            <span className="comba-combo">
              {copy.combo} <strong>{snap?.combo ?? 0}</strong>
            </span>
          </div>
        ) : null}

        {screen === "playing" && snap?.recovering ? (
          <div className="comba-recover">{copy.recovering}</div>
        ) : null}

        {screen === "menu" ? (
          <div className="comba-overlay">
            <div className="comba-panel">
              <p className="comba-lead">{copy.menuLead}</p>
              <p className="comba-tip">{copy.menuTip}</p>
              <span className="comba-panel-label">{copy.difficulty}</span>
              <div className="comba-diffs">
                {DIFFICULTIES.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`comba-diff comba-diff--${key}${difficulty === key ? " is-active" : ""}`}
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
                className="comba-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  startRound();
                }}
              >
                ▶ {copy.start}
              </button>
            </div>
          </div>
        ) : null}

        {screen === "playing" && snap?.paused ? (
          <div className="comba-overlay">
            <div className="comba-panel comba-panel--slim">
              <span className="comba-panel-label">{copy.paused}</span>
              <button
                type="button"
                className="comba-primary"
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
          <div className="comba-overlay">
            <div className="comba-panel">
              <span className="comba-outcome">
                {screen === "won" ? copy.winLead : copy.loseLead}
              </span>
              <div className="comba-final-stats">
                <span>
                  {copy.jumps} <strong>{snap?.jumps ?? 0}</strong>/{snap?.target ?? 0}
                </span>
                <span>
                  {copy.combo} <strong>{snap?.bestCombo ?? 0}</strong>
                </span>
                <span>
                  {copy.trips} <strong>{snap?.trips ?? 0}</strong>
                </span>
                <span>
                  {copy.best} <strong>{snap?.bestJumps ?? 0}</strong>
                </span>
                <span>
                  {copy.wins} <strong>{snap?.wins ?? 0}</strong>
                </span>
              </div>
              <div className="comba-final-actions">
                <button
                  type="button"
                  className="comba-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    startRound();
                  }}
                >
                  ▶ {copy.again}
                </button>
                <button
                  type="button"
                  className="comba-act-back"
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

      <div className="comba-meters">
        <span className="comba-meter">
          <em>{copy.target}</em>
          <span className="comba-bar">
            <span className="comba-bar-fill" style={{ width: `${jumpPct}%` }} />
          </span>
        </span>
        <span className="comba-meter">
          <em>{copy.sync}</em>
          <span className="comba-bar comba-bar--sync">
            <span
              className={`comba-bar-fill${syncPct <= 36 ? " is-low" : ""}`}
              style={{ width: `${syncPct}%` }}
            />
          </span>
        </span>
      </div>

      <p className="comba-hint">{copy.hint}</p>
    </div>
  );
}
