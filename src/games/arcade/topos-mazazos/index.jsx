import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import { ToposRuntime } from "./engine.js";
import { getCopy } from "./copy.js";

export default function ToposMazazosGame() {
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
    const rt = new ToposRuntime({ canvas, locale, onSnapshot: setSnap, onFullscreen: handleFS });
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
  const startMatch = useCallback(() => rtRef.current?.startMatch(), []);
  const toggleAudio = useCallback(() => rtRef.current?.toggleAudio(), []);

  const screen = snap?.screen ?? "menu";
  const difficulty = snap?.difficulty ?? "medium";
  const audioEnabled = snap?.audioEnabled ?? true;

  const DIFFS = [
    { id: "easy", label: copy.easy, dot: "🟢", desc: copy.easyDesc },
    { id: "medium", label: copy.medium, dot: "🟡", desc: copy.mediumDesc },
    { id: "hard", label: copy.hard, dot: "🔴", desc: copy.hardDesc },
  ];
  const activeDiff = DIFFS.find((d) => d.id === difficulty) ?? DIFFS[1];

  return (
    <div ref={rootRef} className="mini-game topos-game">
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="topos-actions">
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

      <div className="topos-stage">
        <canvas ref={canvasRef} className="topos-canvas" />
      </div>

      {screen === "menu" ? (
        <section className="topos-controls topos-menu" aria-label={copy.difficulty}>
          <div className="topos-choice">
            <span className="topos-choice-label">{copy.difficulty}</span>
            <div className="topos-seg" role="group" aria-label={copy.difficulty}>
              {DIFFS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`topos-seg-btn topos-seg-btn--${d.id}${difficulty === d.id ? " is-on" : ""}`}
                  aria-pressed={difficulty === d.id}
                  onClick={() => setDifficulty(d.id)}
                >
                  <span className="topos-seg-dot" aria-hidden="true">{d.dot}</span>
                  <span className="topos-seg-name">{d.label}</span>
                </button>
              ))}
            </div>
            <p className="topos-choice-desc">{activeDiff.desc}</p>
          </div>
          {snap?.best ? <p className="topos-best">🏆 {copy.best}: {snap.best}</p> : null}
          <button type="button" className="topos-start" onClick={startMatch}>
            <span aria-hidden="true">▶</span> {copy.start}
          </button>
          <details className="topos-help">
            <summary>{copy.whack}</summary>
            <p className="topos-hint">{copy.hint}</p>
          </details>
        </section>
      ) : (
        <section className="topos-controls" aria-label={copy.title}>
          <div className="topos-action-strip">
            {screen === "over" ? (
              <button type="button" className="topos-primary" onClick={() => press("Enter")}>
                ▶ {copy.again}
              </button>
            ) : (
              <button type="button" className="topos-primary" onClick={() => press("Space")}>
                🔨 {copy.whack}
              </button>
            )}
            <button type="button" className="topos-secondary" onClick={() => press("KeyP")}>
              {snap?.paused ? `▶ ${copy.resume}` : `⏸ ${copy.pause}`}
            </button>
          </div>
          <p className="topos-hint">{copy.hint}</p>
        </section>
      )}
    </div>
  );
}
