import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import { TennisRuntime } from "./runtime";
import { load as loadTournament } from "./tournament";
import { UI } from "./copy";

export default function TennisGrandSlamGame() {
  const locale = useMemo(() => (resolveBrowserLanguage() === "es" ? "es" : "en"), []);
  const canvasRef = useRef(null);
  const rootRef = useRef(null);
  const rtRef = useRef(null);
  const [snap, setSnap] = useState(null);
  const copy = UI[locale] ?? UI.en;

  const handleFullscreen = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const rt = new TennisRuntime({
      canvas,
      locale,
      onSnapshot: setSnap,
      onFullscreen: handleFullscreen,
    });
    rtRef.current = rt;
    rt.start();

    // Offer to pick a saved Grand Slam run back up where it was left.
    const saved = loadTournament();
    if (saved && saved.status === "playing") rt.resumeTournament(saved);

    return () => {
      rt.destroy();
      rtRef.current = null;
    };
  }, [locale, handleFullscreen]);

  const buildPayload = useCallback((s) => s ?? {}, []);
  const advance = useCallback((ms) => rtRef.current?.advanceTime(ms), []);
  useGameRuntimeBridge(snap, buildPayload, advance);

  // Movement and aim are held; strokes are held to charge and released to hit.
  const bindHold = useCallback(
    (code) => ({
      onPointerDown: (event) => {
        event.preventDefault();
        rtRef.current?.setVirtualKey(code, true);
      },
      onPointerUp: () => rtRef.current?.setVirtualKey(code, false),
      onPointerLeave: () => rtRef.current?.setVirtualKey(code, false),
      onPointerCancel: () => rtRef.current?.setVirtualKey(code, false),
    }),
    []
  );

  const tap = useCallback((code) => rtRef.current?.pressVirtualKey(code), []);

  const screen = snap?.screen ?? "menu";
  const inPlay = screen === "play";

  return (
    <div ref={rootRef} className="mini-game tennis-grand-slam-game">
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="tennis-actions">
          {screen === "menu" ? (
            <>
              <button type="button" onClick={() => tap("Digit1")}>
                {copy.menuExhibition}
              </button>
              <button type="button" onClick={() => tap("Digit2")}>
                {locale === "es" ? "Torneo" : "Tournament"}
              </button>
            </>
          ) : null}
          <button type="button" onClick={() => tap("KeyR")}>
            {locale === "es" ? "Reiniciar" : "Restart"}
          </button>
          <button type="button" onClick={handleFullscreen}>
            {locale === "es" ? "Pantalla completa" : "Fullscreen"}
          </button>
        </div>
      </div>

      <div className="tennis-stage">
        <canvas ref={canvasRef} className="tennis-canvas" />
      </div>

      <section
        className="tennis-controls"
        aria-label={locale === "es" ? "Controles táctiles de tenis" : "Tennis touch controls"}
      >
        <div className="tennis-control-pad">
          <span className="tennis-control-caption">
            {locale === "es" ? "Mover / apuntar" : "Move / aim"}
          </span>
          <div className="tennis-dpad">
            <button type="button" className="tennis-dpad-up" {...bindHold("ArrowUp")} aria-label="↑">
              ↑
            </button>
            <button type="button" className="tennis-dpad-left" {...bindHold("ArrowLeft")} aria-label="←">
              ←
            </button>
            <button type="button" className="tennis-dpad-right" {...bindHold("ArrowRight")} aria-label="→">
              →
            </button>
            <button type="button" className="tennis-dpad-down" {...bindHold("ArrowDown")} aria-label="↓">
              ↓
            </button>
          </div>
        </div>

        <div className="tennis-control-strokes">
          <span className="tennis-control-caption">
            {inPlay && snap?.serving
              ? locale === "es"
                ? "Mantén para cargar el saque"
                : "Hold to load the serve"
              : locale === "es"
                ? "Mantén para cargar el golpe"
                : "Hold to load the stroke"}
          </span>
          <div className="tennis-stroke-grid">
            <button type="button" className="tennis-stroke tennis-stroke--primary" {...bindHold("Space")}>
              {copy.strokes.topspin}
            </button>
            <button type="button" className="tennis-stroke" {...bindHold("KeyK")}>
              {copy.strokes.flat}
            </button>
            <button type="button" className="tennis-stroke" {...bindHold("KeyL")}>
              {copy.strokes.slice}
            </button>
            <button type="button" className="tennis-stroke" {...bindHold("KeyU")}>
              {copy.strokes.drop}
            </button>
            <button type="button" className="tennis-stroke" {...bindHold("KeyI")}>
              {copy.strokes.lob}
            </button>
          </div>
        </div>

        <div className="tennis-control-utilities">
          <button type="button" onClick={() => tap("Enter")}>
            {locale === "es" ? "Confirmar" : "Confirm"}
          </button>
          <button type="button" onClick={() => tap("KeyP")}>
            {locale === "es" ? "Pausa" : "Pause"}
          </button>
          <button type="button" onClick={() => tap("Escape")}>
            {locale === "es" ? "Menú" : "Menu"}
          </button>
        </div>

        <p className="tennis-hint">{copy.controlsHint}</p>
      </section>
    </div>
  );
}
