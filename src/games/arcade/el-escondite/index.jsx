import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import { getCopy } from "./copy.js";
import { createEscondideAudio, readStoredEscondideMuted } from "./audio.js";
import { ElEscondideRuntime, DIFFICULTIES } from "./runtime.js";
import { drawScene, spotAt } from "./scene.js";

export default function ElEscondideGame() {
  const locale = useMemo(() => (resolveBrowserLanguage() === "es" ? "es" : "en"), []);
  const copy = getCopy(locale);
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const rtRef = useRef(null);
  const [snap, setSnap] = useState(null);
  const [difficulty, setDifficulty] = useState("normal");

  // The pointer position lives in a ref, not in state: it changes on every
  // mousemove and the canvas reads it inside the draw loop, so putting it in
  // state would re-render React sixty times a second for a hover ring.
  const hoverRef = useRef(null);
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

    const audio = createEscondideAudio(readStoredEscondideMuted());
    const rt = new ElEscondideRuntime({
      locale,
      audio,
      onSnapshot: setSnap,
      onFullscreen: handleFS,
    });
    rtRef.current = rt;

    // Measure the stage, never the canvas: the mobile shell styles stage
    // canvases with `object-fit: contain` and only wins on `height`, so a canvas
    // asked for its own width reports what its buffer ratio implies rather than
    // the width it has to fill.
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
      if (context) drawScene(context, s, w, h, now, hoverRef.current);
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
    const codes = [
      "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7",
      "Numpad1", "Numpad2", "Numpad3", "Numpad4", "Numpad5", "Numpad6", "Numpad7",
      "Space", "Enter", "KeyR", "KeyP", "KeyF", "KeyM",
    ];
    const onKey = (e) => {
      if (!codes.includes(e.code)) return;
      if (e.code === "Space") e.preventDefault();
      rtRef.current?.pressVirtualKey(e.code);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pointerSpot = useCallback((event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const { w, h } = sizeRef.current;
    // The canvas element can be letterboxed inside the stage, so map through
    // its rect rather than assuming rect size equals the drawing size.
    const px = ((event.clientX - rect.left) / rect.width) * w;
    const py = ((event.clientY - rect.top) / rect.height) * h;
    return spotAt(w, h, px, py);
  }, []);

  const onPointerMove = useCallback((event) => {
    hoverRef.current = pointerSpot(event);
  }, [pointerSpot]);

  const onPointerLeave = useCallback(() => {
    hoverRef.current = null;
  }, []);

  const onPointerDown = useCallback((event) => {
    const id = pointerSpot(event);
    hoverRef.current = id;
    if (id != null) rtRef.current?.search(id);
  }, [pointerSpot]);

  const chooseDifficulty = useCallback((key) => {
    setDifficulty(key);
    rtRef.current?.setDifficulty(key);
  }, []);

  const startRound = useCallback(() => {
    rtRef.current?.startRound(difficulty);
  }, [difficulty]);

  const screen = snap?.screen ?? "menu";
  const audioMuted = snap?.audio?.muted ?? readStoredEscondideMuted();
  const urgent = screen === "seeking" && (snap?.secondsLeft ?? 30) <= 5;
  const timePct = Math.max(0, Math.min(100, (1 - (snap?.timeProgress ?? 0)) * 100));

  return (
    <div ref={rootRef} className="mini-game el-escondite">
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="esc-actions">
          {screen === "seeking" ? (
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
            id="el-escondite-sound-btn"
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

      <div className={`esc-stage esc-stage--${screen}`}>
        <canvas
          ref={canvasRef}
          className="esc-canvas"
          aria-label={copy.title}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onPointerDown={onPointerDown}
        />

        {screen !== "menu" ? (
          <div className="esc-topbar">
            <span className="esc-found">
              {copy.found} <strong>{snap?.foundCount ?? 0}/{snap?.hiderCount ?? 3}</strong>
            </span>
            <div className={`esc-timer${urgent ? " is-urgent" : ""}`}>
              <span className="esc-timer-value">{snap?.secondsLeft ?? 30}</span>
              <div className="esc-timer-track">
                <div className="esc-timer-fill" style={{ width: `${timePct}%` }} />
              </div>
            </div>
            <span className="esc-searches" aria-label={copy.searches}>
              {Array.from({ length: snap?.maxSearches ?? 5 }, (_, i) => (
                <em key={i} className={i < (snap?.searchesLeft ?? 0) ? "is-left" : "is-used"} />
              ))}
            </span>
          </div>
        ) : null}

        {screen === "menu" ? (
          <div className="esc-overlay">
            <div className="esc-panel">
              <p className="esc-lead">{copy.menuLead}</p>
              <p className="esc-tip">{copy.menuTip}</p>
              <span className="esc-panel-label">{copy.difficulty}</span>
              <div className="esc-diffs">
                {DIFFICULTIES.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`esc-diff esc-diff--${key}${difficulty === key ? " is-active" : ""}`}
                    aria-pressed={difficulty === key}
                    onClick={() => chooseDifficulty(key)}
                  >
                    <strong>{copy.difficulties[key]}</strong>
                    <em>{copy.difficultyNotes[key]}</em>
                  </button>
                ))}
              </div>
              <button type="button" className="esc-primary" onClick={startRound}>
                ▶ {copy.start}
              </button>
            </div>
          </div>
        ) : null}

        {screen === "seeking" && snap?.paused ? (
          <div className="esc-overlay">
            <div className="esc-panel esc-panel--slim">
              <span className="esc-panel-label">{copy.paused}</span>
              <button type="button" className="esc-primary" onClick={() => press("KeyP")}>
                ▶ {copy.resume}
              </button>
            </div>
          </div>
        ) : null}

        {screen === "won" || screen === "lost" ? (
          <div className="esc-overlay">
            <div className="esc-panel">
              <span className="esc-outcome">
                {screen === "won"
                  ? copy.winLead
                  : (snap?.secondsLeft ?? 0) <= 0
                    ? copy.loseTime
                    : copy.loseSearches}
              </span>
              <p className="esc-lead">{copy.revealLead}</p>
              <div className="esc-final-stats">
                <span>
                  {copy.found} <strong>{snap?.foundCount ?? 0}/{snap?.hiderCount ?? 3}</strong>
                </span>
                {screen === "won" ? (
                  <span>
                    {copy.score} <strong>{snap?.lastScore ?? 0}</strong>
                  </span>
                ) : null}
                <span>
                  {copy.best} <strong>{snap?.bestScore ?? 0}</strong>
                </span>
                <span>
                  {copy.wins} <strong>{snap?.wins ?? 0}</strong>
                </span>
              </div>
              <div className="esc-final-actions">
                <button type="button" className="esc-primary" onClick={startRound}>
                  ▶ {copy.again}
                </button>
                <button
                  type="button"
                  className="esc-act-back"
                  onClick={() => rtRef.current?.backToMenu()}
                >
                  {copy.changeSetup}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <p className="esc-hint">{copy.hint}</p>
    </div>
  );
}
