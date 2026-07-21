import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import { PadelRuntime } from "./engine.js";
import { getCopy } from "./copy.js";

export default function PadelArenaGame() {
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
    const rt = new PadelRuntime({ canvas, locale, onSnapshot: setSnap, onFullscreen: handleFS });
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
  const release = useCallback((code) => rtRef.current?.releaseVirtualKey(code), []);

  // Los golpes se mantienen para cargar potencia, así que van por puntero y no
  // por click: pointerdown/up cubre ratón y dedo con el mismo código, y salir
  // del botón o cancelar el gesto sueltan igual (si no, la carga se quedaría
  // colgada al arrastrar el dedo fuera). El click quedaría redundante y además
  // llega después del pointerup, así que reiniciaría la carga ya gastada.
  const holdShot = useCallback(
    (code) => ({
      onPointerDown: (e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        press(code);
      },
      onPointerUp: () => release(code),
      onPointerLeave: () => release(code),
      onPointerCancel: () => release(code),
      // Teclado: el botón enfocado se activa con Enter/Espacio y no emite
      // eventos de puntero, así que sin esto no se podría golpear con tabulador.
      onKeyDown: (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!e.repeat) press(code);
        }
      },
      onKeyUp: (e) => {
        if (e.key === "Enter" || e.key === " ") release(code);
      },
    }),
    [press, release],
  );
  const setDifficulty = useCallback((id) => rtRef.current?.setDifficulty(id), []);
  const setFormat = useCallback((n) => rtRef.current?.setFormat(n), []);
  const startMatch = useCallback(() => rtRef.current?.startMatch(), []);
  const toggleAudio = useCallback(() => rtRef.current?.toggleAudio(), []);

  const screen = snap?.screen ?? "menu";
  const difficulty = snap?.difficulty ?? "medium";
  const bestOf = snap?.bestOf ?? 3;
  const audioEnabled = snap?.audioEnabled ?? true;

  const DIFFS = [
    { id: "easy", label: copy.easy, dot: "🟢", desc: copy.easyDesc },
    { id: "medium", label: copy.medium, dot: "🟡", desc: copy.mediumDesc },
    { id: "hard", label: copy.hard, dot: "🔴", desc: copy.hardDesc },
  ];
  const FORMATS = [
    { n: 1, label: copy.best1, desc: copy.best1Desc },
    { n: 3, label: copy.best3, desc: copy.best3Desc },
  ];
  const activeDiff = DIFFS.find((d) => d.id === difficulty) ?? DIFFS[1];
  const serving = snap?.server === "home" ? copy.yourServe : copy.cpuServe;

  return (
    <div ref={rootRef} className="mini-game padel-arena-game">
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="padel-arena-actions">
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

      <div className="padel-arena-stage">
        <canvas ref={canvasRef} className="padel-arena-canvas" />
      </div>

      {screen === "menu" ? (
        <section className="padel-arena-controls padel-arena-menu" aria-label={copy.difficulty}>
          <div className="padel-arena-choice">
            <span className="padel-arena-choice-label">{copy.difficulty}</span>
            <div className="padel-arena-seg padel-arena-seg--three" role="group" aria-label={copy.difficulty}>
              {DIFFS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`padel-arena-seg-btn${difficulty === d.id ? " is-on" : ""}`}
                  aria-pressed={difficulty === d.id}
                  onClick={() => setDifficulty(d.id)}
                >
                  <span className="padel-arena-seg-dot" aria-hidden="true">{d.dot}</span>
                  <span className="padel-arena-seg-name">{d.label}</span>
                </button>
              ))}
            </div>
            <p className="padel-arena-choice-desc">{activeDiff.desc}</p>
          </div>

          <div className="padel-arena-choice">
            <span className="padel-arena-choice-label">{copy.format}</span>
            <div className="padel-arena-seg padel-arena-seg--two" role="group" aria-label={copy.format}>
              {FORMATS.map((f) => (
                <button
                  key={f.n}
                  type="button"
                  className={`padel-arena-seg-btn${bestOf === f.n ? " is-on" : ""}`}
                  aria-pressed={bestOf === f.n}
                  onClick={() => setFormat(f.n)}
                >
                  <span className="padel-arena-seg-name">{f.label}</span>
                  <span className="padel-arena-seg-sub">{f.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="padel-arena-start" onClick={startMatch}>
            <span aria-hidden="true">▶</span> {copy.start}
          </button>

          <details className="padel-arena-help">
            <summary>{copy.howTo}</summary>
            <p className="padel-arena-hint">{copy.hint}</p>
          </details>
        </section>
      ) : (
        <section className="padel-arena-controls" aria-label={copy.title}>
          {(screen === "serve" || screen === "rally") && !snap?.paused ? (
            <p className={`padel-arena-status${snap?.server === "home" ? " is-you" : ""}`}>
              {screen === "serve" ? serving : copy.hit}
            </p>
          ) : null}
          {screen === "serve" ? (
            <div className="padel-arena-action-strip">
              <button type="button" className="padel-arena-primary" onClick={() => press("KeyF")}>
                🎾 {copy.serve}
              </button>
              <button type="button" className="padel-arena-secondary" onClick={() => press("KeyP")}>
                {snap?.paused ? `▶ ${copy.resume}` : `⏸ ${copy.pause}`}
              </button>
            </div>
          ) : null}

          {screen === "rally" ? (
            <>
              <div className="padel-arena-shots" role="group" aria-label={copy.shotsLabel}>
                <button type="button" className="padel-arena-shot padel-arena-shot--primary" {...holdShot("KeyF")}>
                  <span className="padel-arena-shot-name">🎾 {copy.shotVolea}</span>
                  <span className="padel-arena-shot-key">F</span>
                </button>
                <button type="button" className="padel-arena-shot" {...holdShot("KeyG")}>
                  <span className="padel-arena-shot-name">↩ {copy.shotReves}</span>
                  <span className="padel-arena-shot-key">G</span>
                </button>
                <button type="button" className="padel-arena-shot" {...holdShot("KeyH")}>
                  <span className="padel-arena-shot-name">⤴ {copy.shotGlobo}</span>
                  <span className="padel-arena-shot-key">H</span>
                </button>
                <button type="button" className="padel-arena-shot" {...holdShot("KeyJ")}>
                  <span className="padel-arena-shot-name">⤵ {copy.shotDejada}</span>
                  <span className="padel-arena-shot-key">J</span>
                </button>
              </div>
              <div className="padel-arena-action-strip">
                <button type="button" className="padel-arena-secondary" onClick={() => press("KeyP")}>
                  {snap?.paused ? `▶ ${copy.resume}` : `⏸ ${copy.pause}`}
                </button>
              </div>
            </>
          ) : null}

          {screen === "point" || screen === "over" ? (
            <div className="padel-arena-action-strip">
              {screen === "over" ? (
                <button type="button" className="padel-arena-primary" onClick={() => press("Enter")}>
                  ▶ {copy.again}
                </button>
              ) : null}
              <button type="button" className="padel-arena-secondary" onClick={() => press("KeyP")}>
                {snap?.paused ? `▶ ${copy.resume}` : `⏸ ${copy.pause}`}
              </button>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
