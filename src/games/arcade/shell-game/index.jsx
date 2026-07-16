import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import { ShellGameRuntime } from "./engine.js";
import { getCopy } from "./copy.js";

export default function ShellGameGame() {
  const locale = useMemo(() => (resolveBrowserLanguage() === "es" ? "es" : "en"), []);
  const copy = getCopy(locale);
  const canvasRef = useRef(null);
  const rootRef = useRef(null);
  const rtRef = useRef(null);
  const [snap, setSnap] = useState(null);

  const handleFS = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const rt = new ShellGameRuntime({
      canvas,
      locale,
      onSnapshot: setSnap,
      onFullscreen: handleFS,
    });
    rtRef.current = rt;
    rt.start();
    return () => {
      rt.destroy();
      rtRef.current = null;
    };
  }, [locale, handleFS]);

  const buildPayload = useCallback((s) => s ?? {}, []);
  const advanceHandler = useCallback((ms) => rtRef.current?.advanceTime(ms), []);
  useGameRuntimeBridge(snap, buildPayload, advanceHandler);

  const press = useCallback((code) => rtRef.current?.pressVirtualKey(code), []);
  const startGame = useCallback(() => rtRef.current?.startGame(), []);

  const screen = snap?.screen ?? "menu";

  return (
    <div ref={rootRef} className="mini-game shell-game">
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="shell-game-actions">
          {screen !== "menu" && screen !== "over" ? (
            <button type="button" onClick={() => press("KeyP")}>
              {snap?.paused ? copy.resume : copy.pause}
            </button>
          ) : null}
          <button type="button" onClick={() => press("KeyR")}>
            {copy.restart}
          </button>
          <button type="button" onClick={handleFS}>
            {copy.fullscreen}
          </button>
        </div>
      </div>

      <div className="shell-game-stage">
        <canvas ref={canvasRef} className="shell-game-canvas" />
      </div>

      <section className="shell-game-controls" aria-label={copy.title}>
        {screen === "menu" ? (
          <div className="shell-game-action-strip">
            <button type="button" className="shell-game-primary" onClick={startGame}>
              ▶ {copy.start}
            </button>
          </div>
        ) : null}
        {screen === "over" ? (
          <div className="shell-game-action-strip">
            <button type="button" className="shell-game-primary" onClick={() => press("Enter")}>
              ▶ {copy.again}
            </button>
          </div>
        ) : null}
        {screen !== "menu" && screen !== "over" ? (
          <div className="shell-game-stats">
            <span>
              {copy.level} <strong>{snap?.level ?? 1}</strong>
            </span>
            <span>
              {copy.score} <strong>{snap?.score ?? 0}</strong>
            </span>
            <span>
              {copy.streak} <strong>×{snap?.streak ?? 0}</strong>
            </span>
            <span>
              {copy.lives} <strong>{snap?.lives ?? 3}</strong>
            </span>
          </div>
        ) : null}
        <p className="shell-game-hint">{copy.hint}</p>
      </section>
    </div>
  );
}
