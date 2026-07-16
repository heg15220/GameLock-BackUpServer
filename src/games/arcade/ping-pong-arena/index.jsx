import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import { PingPongRuntime } from "./engine.js";
import { getCopy } from "./copy.js";

export default function PingPongArenaGame() {
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
    const rt = new PingPongRuntime({ canvas, locale, onSnapshot: setSnap, onFullscreen: handleFS });
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
  const setDifficulty = useCallback((id) => rtRef.current?.setDifficulty(id), []);
  const setFormat = useCallback((n) => rtRef.current?.setFormat(n), []);
  const startMatch = useCallback(() => rtRef.current?.startMatch(), []);
  const toggleAudio = useCallback(() => rtRef.current?.toggleAudio(), []);

  const screen = snap?.screen ?? "menu";
  const difficulty = snap?.difficulty ?? "medium";
  const bestOf = snap?.bestOf ?? 3;
  // Default to on so the control reads correctly on the very first frame,
  // before the runtime has pushed its first snapshot.
  const audioEnabled = snap?.audioEnabled ?? true;

  return (
    <div ref={rootRef} className="mini-game ping-pong-arena-game">
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="ping-pong-arena-actions">
          {screen !== "menu" ? (
            <button type="button" onClick={() => press("KeyP")}>
              {snap?.paused ? copy.resume : copy.pause}
            </button>
          ) : null}
          <button
            type="button"
            className={audioEnabled ? "is-on" : ""}
            onClick={toggleAudio}
            aria-label={copy.soundLabel}
            aria-pressed={audioEnabled}
            title={copy.soundLabel}
          >
            {audioEnabled ? `🔊 ${copy.soundOn}` : `🔇 ${copy.soundOff}`}
          </button>
          <button type="button" onClick={() => press("KeyR")}>
            {copy.restart}
          </button>
          <button type="button" onClick={handleFS}>
            {copy.fullscreen}
          </button>
        </div>
      </div>

      <div className="ping-pong-arena-stage">
        <canvas ref={canvasRef} className="ping-pong-arena-canvas" />
      </div>

      {screen === "menu" ? (
        <section className="ping-pong-arena-controls" aria-label={copy.difficulty}>
          <div className="ping-pong-arena-choice">
            <span>{copy.difficulty}</span>
            <div className="ping-pong-arena-choice-row">
              {[
                ["easy", copy.easy],
                ["medium", copy.medium],
                ["hard", copy.hard],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={difficulty === id ? "is-on" : ""}
                  onClick={() => setDifficulty(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="ping-pong-arena-choice">
            <span>{copy.format}</span>
            <div className="ping-pong-arena-choice-row">
              {[
                [1, copy.best1],
                [3, copy.best3],
                [5, copy.best5],
              ].map(([n, label]) => (
                <button
                  key={n}
                  type="button"
                  className={bestOf === n ? "is-on" : ""}
                  onClick={() => setFormat(n)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="ping-pong-arena-action-strip">
            <button type="button" className="ping-pong-arena-primary" onClick={startMatch}>
              ▶ {copy.start}
            </button>
          </div>
          <p className="ping-pong-arena-hint">{copy.hint}</p>
        </section>
      ) : (
        <section className="ping-pong-arena-controls" aria-label={copy.title}>
          <div className="ping-pong-arena-action-strip">
            {screen === "serve" ? (
              <button type="button" className="ping-pong-arena-primary" onClick={() => press("Space")}>
                {copy.serve}
              </button>
            ) : null}
            {screen === "over" ? (
              <button type="button" className="ping-pong-arena-primary" onClick={() => press("Enter")}>
                ▶ {copy.again}
              </button>
            ) : null}
            <button type="button" onClick={() => press("KeyP")}>
              {snap?.paused ? copy.resume : copy.pause}
            </button>
          </div>
          <p className="ping-pong-arena-hint">{copy.hint}</p>
        </section>
      )}
    </div>
  );
}
