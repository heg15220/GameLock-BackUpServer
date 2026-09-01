import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import { getCopy } from "./copy.js";
import { createCaidaAudio, readStoredCaidaMuted } from "./audio.js";
import { CaidaLibreRuntime, DIFFICULTIES } from "./runtime.js";
import { drawScene, sideAt, PLAYER_COLORS } from "./scene.js";

export default function CaidaLibreGame() {
  const locale = useMemo(() => (resolveBrowserLanguage() === "es" ? "es" : "en"), []);
  const copy = getCopy(locale);
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const rtRef = useRef(null);
  const [snap, setSnap] = useState(null);
  const [difficulty, setDifficulty] = useState("normal");
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

    const audio = createCaidaAudio(readStoredCaidaMuted());
    const rt = new CaidaLibreRuntime({
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
      "ArrowLeft", "ArrowRight", "KeyA", "KeyD",
      "Space", "Enter", "KeyR", "KeyP", "KeyF", "KeyM",
    ];
    const onKey = (e) => {
      if (!codes.includes(e.code)) return;
      if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
      rtRef.current?.pressVirtualKey(e.code);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pointerSide = useCallback((event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0) return null;
    const { w } = sizeRef.current;
    return sideAt(w, ((event.clientX - rect.left) / rect.width) * w);
  }, []);

  const onPointerMove = useCallback((event) => {
    hoverRef.current = pointerSide(event);
  }, [pointerSide]);

  const onPointerLeave = useCallback(() => {
    hoverRef.current = null;
  }, []);

  const onPointerDown = useCallback((event) => {
    const side = pointerSide(event);
    hoverRef.current = side;
    if (side) rtRef.current?.choose(side);
  }, [pointerSide]);

  const chooseDifficulty = useCallback((key) => {
    setDifficulty(key);
    rtRef.current?.setDifficulty(key);
  }, []);

  const startRun = useCallback(() => {
    rtRef.current?.startRun(difficulty);
  }, [difficulty]);

  const screen = snap?.screen ?? "menu";
  const audioMuted = snap?.audio?.muted ?? readStoredCaidaMuted();
  const choosing = screen === "choosing";
  const urgent = choosing && (snap?.secondsLeft ?? 5) <= 2;
  const timePct = Math.max(0, Math.min(100, (1 - (snap?.chooseProgress ?? 0)) * 100));
  const you = (snap?.players ?? [])[0] ?? null;

  return (
    <div ref={rootRef} className="mini-game caida-libre">
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="caida-actions">
          {choosing || screen === "opening" || screen === "settling" ? (
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
            id="caida-libre-sound-btn"
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

      <div className={`caida-stage caida-stage--${screen}${you?.fell ? " is-falling" : ""}`}>
        <canvas
          ref={canvasRef}
          className="caida-canvas"
          aria-label={copy.title}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onPointerDown={onPointerDown}
        />

        {screen !== "menu" ? (
          <div className="caida-topbar">
            <span className="caida-progress-readout">
              {copy.platform} <strong>{(snap?.platform ?? 0) + 1}</strong>/{snap?.platforms ?? 3}
              <small>{copy.score} · {snap?.score ?? 0}</small>
            </span>
            <div className={`caida-timer${urgent ? " is-urgent" : ""}`}>
              <span className="caida-timer-value">{choosing ? snap?.secondsLeft ?? 5 : "—"}</span>
              <div className="caida-timer-track">
                <div className="caida-timer-fill" style={{ width: `${choosing ? timePct : 0}%` }} />
              </div>
            </div>
            <span className="caida-strikes" aria-label={copy.strikes}>
              {Array.from({ length: snap?.strikesOut ?? 2 }, (_, i) => (
                <em key={i} className={i < (you?.strikes ?? 0) ? "is-hit" : "is-safe"} />
              ))}
            </span>
          </div>
        ) : null}

        {screen !== "menu" && screen !== "won" && screen !== "lost" ? (
          <div className="caida-flight-hud" aria-label={copy.altitude}>
            <div className="caida-depth-route">
              {Array.from({ length: snap?.platforms ?? 3 }, (_, i) => (
                <i key={i} className={`${i < (snap?.platform ?? 0) ? "is-passed" : ""}${i === (snap?.platform ?? 0) ? " is-current" : ""}`} />
              ))}
            </div>
            <div className="caida-crowd-readout">
              <span>← {snap?.crowd?.left ?? 0}</span>
              <em>{copy.crowd}</em>
              <span>{snap?.crowd?.right ?? 0} →</span>
            </div>
          </div>
        ) : null}

        {choosing && !snap?.paused ? (
          <button type="button" className="caida-lock" onClick={() => rtRef.current?.lockIn()}>
            <span>{copy.lockNow}</span>
            <strong>+{Math.round((1 - (snap?.chooseProgress ?? 0)) * 250)}</strong>
            <em>{copy.bravery}</em>
          </button>
        ) : null}

        {screen === "menu" ? (
          <div className="caida-overlay">
            <div className="caida-panel">
              <p className="caida-lead">{copy.menuLead}</p>
              <p className="caida-tip">{copy.menuTip}</p>
              <p className="caida-mechanic-tip">{copy.mechanicTip}</p>
              <span className="caida-panel-label">{copy.difficulty}</span>
              <div className="caida-diffs">
                {DIFFICULTIES.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`caida-diff caida-diff--${key}${difficulty === key ? " is-active" : ""}`}
                    aria-pressed={difficulty === key}
                    onClick={() => chooseDifficulty(key)}
                  >
                    <strong>{copy.difficulties[key]}</strong>
                    <em>{copy.difficultyNotes[key]}</em>
                  </button>
                ))}
              </div>
              <button type="button" className="caida-primary" onClick={startRun}>
                ▶ {copy.start}
              </button>
            </div>
          </div>
        ) : null}

        {snap?.paused && (choosing || screen === "opening" || screen === "settling") ? (
          <div className="caida-overlay">
            <div className="caida-panel caida-panel--slim">
              <span className="caida-panel-label">{copy.paused}</span>
              <button type="button" className="caida-primary" onClick={() => press("KeyP")}>
                ▶ {copy.resume}
              </button>
            </div>
          </div>
        ) : null}

        {screen === "won" || screen === "lost" ? (
          <div className="caida-overlay">
            <div className="caida-panel">
              <span className="caida-outcome">
                {screen === "won" ? copy.winLead : copy.loseLead}
              </span>
              <p className="caida-tip">{copy.oddsNote}</p>
              <div className="caida-final-stats">
                <span>
                  {copy.strikes} <strong>{you?.strikes ?? 0}</strong>
                </span>
                <span>
                  {copy.wins} <strong>{snap?.wins ?? 0}</strong>
                </span>
                <span>
                  {copy.runs} <strong>{snap?.runs ?? 0}</strong>
                </span>
              </div>
              <div className="caida-final-actions">
                <button type="button" className="caida-primary" onClick={startRun}>
                  ▶ {copy.again}
                </button>
                <button
                  type="button"
                  className="caida-act-back"
                  onClick={() => rtRef.current?.backToMenu()}
                >
                  {copy.changeSetup}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* The two doors as real buttons: the canvas halves work, but a labelled
          control is what the mobile deck and a keyboard user need. */}
      <div className={`caida-doors caida-doors--${screen}`} role="group" aria-label={copy.chooseSide}>
        {["left", "right"].map((side) => (
          <button
            key={side}
            type="button"
            className={`caida-door caida-door--${side}${you?.side === side ? " is-picked" : ""}${
              snap?.badSide === side ? " is-cloud" : snap?.badSide ? " is-safe" : ""
            }`}
            aria-pressed={you?.side === side}
            disabled={!choosing || Boolean(snap?.paused)}
            onClick={() => rtRef.current?.choose(side)}
          >
            <span className="caida-door-arrow">{side === "left" ? "←" : "→"}</span>
            <span className="caida-door-name">{side === "left" ? copy.left : copy.right}</span>
          </button>
        ))}
      </div>

      <div className="caida-board" aria-label={copy.strikes}>
        {(snap?.players ?? []).map((player) => (
          <span
            key={player.id}
            className={`caida-chip${player.isHuman ? " is-you" : ""}${player.out ? " is-out" : ""}`}
            style={{ "--caida-color": PLAYER_COLORS[player.lane] }}
          >
            <em className="caida-chip-dot" />
            {player.isHuman ? copy.you : `${copy.rival} ${player.lane}`}
            <strong>{player.out ? copy.out : `${player.strikes}/${snap?.strikesOut ?? 2}`}</strong>
          </span>
        ))}
      </div>

      <p className="caida-hint">{copy.hint}</p>
    </div>
  );
}
