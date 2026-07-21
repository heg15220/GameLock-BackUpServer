import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import { getCopy } from "./copy.js";
import { createBrileAudio, readStoredBrileMuted } from "./audio.js";
import { BrileRuntime } from "./runtime.js";
import { drawScene } from "./render.js";

const DIFF_ORDER = ["facil", "normal", "dificil"];

export default function BrileGame() {
  const locale = useMemo(() => (resolveBrowserLanguage() === "es" ? "es" : "en"), []);
  const copy = getCopy(locale);
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const rtRef = useRef(null);
  const [snap, setSnap] = useState(null);

  const keys = useRef({ up: false, down: false, left: false, right: false });
  const drag = useRef(null);
  const applyMove = useCallback(() => {
    const d = drag.current;
    if (d) {
      rtRef.current?.setMove(d.x, d.y);
      return;
    }
    const k = keys.current;
    const x = (k.right ? 1 : 0) - (k.left ? 1 : 0);
    const y = (k.down ? 1 : 0) - (k.up ? 1 : 0);
    rtRef.current?.setMove(x, y);
  }, []);

  const handleFS = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const audio = createBrileAudio(readStoredBrileMuted());
    const rt = new BrileRuntime({ locale, audio, onSnapshot: setSnap, onFullscreen: handleFS });
    rtRef.current = rt;

    let cssW = 320;
    let cssH = 240;
    let dpr = 1;
    const sizeCanvas = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cssW = Math.max(320, Math.floor(canvas.clientWidth));
      cssH = Math.max(220, Math.floor(canvas.clientHeight));
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
    };
    sizeCanvas();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sizeCanvas) : null;
    ro?.observe(canvas);

    const ctx = canvas.getContext("2d");
    let raf = 0;
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(60, now - last);
      last = now;
      const s = rt.advanceTime(dt);
      setSnap(s);
      if (ctx) drawScene(ctx, rt, cssW, cssH, dpr);
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
    const setKey = (code, down) => {
      const k = keys.current;
      if (code === "ArrowUp" || code === "KeyW") k.up = down;
      else if (code === "ArrowDown" || code === "KeyS") k.down = down;
      else if (code === "ArrowLeft" || code === "KeyA") k.left = down;
      else if (code === "ArrowRight" || code === "KeyD") k.right = down;
      else return false;
      return true;
    };
    const onDown = (e) => {
      if (setKey(e.code, true)) {
        applyMove();
        e.preventDefault();
        return;
      }
      if (e.repeat) return;
      if (["Enter", "Space", "KeyJ", "KeyK", "ShiftLeft", "ShiftRight", "KeyR", "KeyP", "KeyF", "KeyM"].includes(e.code)) {
        if (e.code === "Space") e.preventDefault();
        press(e.code);
      }
    };
    const onUp = (e) => {
      if (setKey(e.code, false)) applyMove();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [applyMove, press]);

  const dragOrigin = useRef(null);
  const onFieldDown = useCallback((e) => {
    if (rtRef.current?.snapshot()?.screen !== "playing") return;
    e.preventDefault();
    dragOrigin.current = { x: e.clientX, y: e.clientY };
    drag.current = { x: 0, y: 0 };
    canvasRef.current?.setPointerCapture?.(e.pointerId);
  }, []);
  const onFieldMove = useCallback(
    (e) => {
      const o = dragOrigin.current;
      if (!o) return;
      const dx = e.clientX - o.x;
      const dy = e.clientY - o.y;
      const m = Math.hypot(dx, dy);
      drag.current = m < 6 ? { x: 0, y: 0 } : { x: dx / m, y: dy / m };
      applyMove();
    },
    [applyMove],
  );
  const releaseField = useCallback(() => {
    dragOrigin.current = null;
    drag.current = null;
    applyMove();
  }, [applyMove]);

  const padBtn = useCallback(
    (dir) => ({
      onPointerDown: (e) => {
        e.preventDefault();
        e.stopPropagation();
        keys.current[dir] = true;
        applyMove();
      },
      onPointerUp: (e) => {
        e.stopPropagation();
        keys.current[dir] = false;
        applyMove();
      },
      onPointerLeave: () => {
        keys.current[dir] = false;
        applyMove();
      },
      onPointerCancel: () => {
        keys.current[dir] = false;
        applyMove();
      },
    }),
    [applyMove],
  );

  const actionBtn = useCallback(
    (code) => ({
      onPointerDown: (e) => {
        e.preventDefault();
        e.stopPropagation();
        press(code);
      },
    }),
    [press],
  );

  const screen = snap?.screen ?? "menu";
  const audioMuted = snap?.audio?.muted ?? readStoredBrileMuted();
  const playing = screen === "playing";
  const result = snap?.result ?? null;

  return (
    <div ref={rootRef} className="mini-game brile">
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="brile-actions">
          {screen === "menu" ? (
            <span className="brile-act-group" role="group" aria-label={copy.chooseDifficulty}>
              {DIFF_ORDER.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`brile-act-diff brile-act-diff--${d}`}
                  title={copy.difficultyHints[d]}
                  onClick={() => rtRef.current?.startGame(d)}
                >
                  {copy.difficulties[d]}
                </button>
              ))}
            </span>
          ) : null}
          {screen === "over" ? (
            <>
              <button type="button" className="brile-act-primary" onClick={() => press("Enter")}>
                ▶ {copy.again}
              </button>
              <button type="button" onClick={() => rtRef.current?.backToMenu()}>
                {copy.changeDifficulty}
              </button>
            </>
          ) : null}
          {playing ? (
            <button type="button" onClick={() => press("KeyP")}>
              {snap?.paused ? copy.resume : copy.pause}
            </button>
          ) : null}
          {playing ? (
            <button type="button" onClick={() => press("KeyR")}>
              {copy.restart}
            </button>
          ) : null}
          <button
            id="brile-sound-btn"
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

      <div className="brile-stage">
        <canvas
          ref={canvasRef}
          className="brile-canvas"
          onPointerDown={onFieldDown}
          onPointerMove={onFieldMove}
          onPointerUp={releaseField}
          onPointerLeave={releaseField}
          onPointerCancel={releaseField}
        />

        {playing ? (
          <div className="brile-hud">
            <span className="brile-hud-team brile-hud-team--you">
              {copy.teamYou} <strong>{snap?.aCourt}</strong>
            </span>
            <span className="brile-hud-clock">{(snap?.elapsedSeconds ?? 0).toFixed(0)}{copy.seconds}</span>
            <span className="brile-hud-team brile-hud-team--rival">
              {copy.teamRival} <strong>{snap?.bCourt}</strong>
            </span>
          </div>
        ) : null}

        {playing && snap?.graceActive ? <div className="brile-grace">{copy.grace}</div> : null}
        {playing && snap?.incoming ? <div className="brile-incoming">{copy.incoming}</div> : null}
        {playing && snap?.playerZone === "prison" ? <div className="brile-prison">{copy.prisonBanner}</div> : null}
        {playing && snap?.playerHolding ? <div className="brile-throwcue">{copy.throwPrompt}</div> : null}

        {screen === "menu" ? (
          <div className="brile-overlay">
            <div className="brile-panel">
              <p className="brile-lead">{copy.menuLead}</p>
              <span className="brile-choose">{copy.chooseDifficulty}</span>
              <ul className="brile-diff-hints">
                {DIFF_ORDER.map((d) => (
                  <li key={d}>
                    <strong>{copy.difficulties[d]}</strong> — {copy.difficultyHints[d]}
                  </li>
                ))}
              </ul>
              <span className="brile-prompt">{copy.menuPrompt ?? ""}</span>
            </div>
          </div>
        ) : null}

        {screen === "over" && result ? (
          <div className="brile-overlay">
            <div className="brile-panel">
              <span className={`brile-result-title${result.win ? " is-win" : ""}`}>
                {result.win ? `🏆 ${copy.youWin}` : `☠ ${copy.youLose}`}
              </span>
              <ul className="brile-result-list">
                <li>
                  <span>{copy.durationLabel}</span>
                  <strong>{result.durationSeconds.toFixed(1)}{copy.seconds}</strong>
                </li>
                <li>
                  <span>{copy.hitsLabel}</span>
                  <strong>{result.hits}</strong>
                </li>
                <li>
                  <span>{copy.catchesLabel}</span>
                  <strong>{result.catches}</strong>
                </li>
              </ul>
              <span className="brile-prompt">{copy.overPrompt ?? ""}</span>
            </div>
          </div>
        ) : null}

        {snap?.paused ? (
          <div className="brile-overlay brile-overlay--paused">
            <span className="brile-paused">{copy.paused}</span>
          </div>
        ) : null}
      </div>

      <section className="brile-controls" aria-label={copy.title}>
        <div className="brile-dpad" role="group" aria-label={copy.move}>
          <button type="button" className="brile-dir brile-dir--up" disabled={!playing} {...padBtn("up")}>▲</button>
          <button type="button" className="brile-dir brile-dir--left" disabled={!playing} {...padBtn("left")}>◀</button>
          <button type="button" className="brile-dir brile-dir--right" disabled={!playing} {...padBtn("right")}>▶</button>
          <button type="button" className="brile-dir brile-dir--down" disabled={!playing} {...padBtn("down")}>▼</button>
        </div>
        <div className="brile-action-cluster">
          <button
            type="button"
            className={`brile-big brile-big--catch${snap?.catchArmed ? " is-armed" : ""}`}
            disabled={!playing}
            {...actionBtn("KeyK")}
          >
            {copy.catch}
          </button>
          <button
            type="button"
            className={`brile-big brile-big--throw${snap?.playerHolding ? " is-ready" : ""}`}
            disabled={!playing}
            {...actionBtn("Space")}
          >
            {copy.throw}
          </button>
        </div>
        <div className="brile-stats">
          <span>
            {copy.teamYou} <strong>{snap?.aCourt ?? 5}</strong> · {copy.teamRival} <strong>{snap?.bCourt ?? 5}</strong>
          </span>
          <span>
            {copy.best} <strong>{(snap?.best ?? 0) > 0 ? `${(snap?.best).toFixed(1)}${copy.seconds}` : "—"}</strong>
          </span>
          <span>{snap?.difficultyLabel ?? copy.difficulties.normal}</span>
        </div>
        <p className="brile-hint">{copy.hint}</p>
      </section>
    </div>
  );
}
