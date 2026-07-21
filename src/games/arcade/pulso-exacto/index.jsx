import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import { getCopy } from "./copy.js";
import { createPulsoExactoAudio, readStoredPulsoMuted } from "./audio.js";
import { PulsoExactoRuntime } from "./runtime.js";

const fmt2 = (s) => (Number.isFinite(s) ? s.toFixed(2) : "0.00");
const fmt1 = (s) => (Number.isFinite(s) ? s.toFixed(1) : "0.0");
const clampPct = (v) => Math.max(0, Math.min(100, v));

// End-of-round reveal: a marker sweeps a time track from 0 up to the player's
// stop, landing next to the fixed target mark while the big readout counts up.
// The gap between the two marks is the score, colour-coded by how close it was.
function RoundReveal({ targetSeconds, result, copy }) {
  const [animate, setAnimate] = useState(false);
  const [count, setCount] = useState(0);
  const stopped = result.stoppedSeconds;

  useEffect(() => {
    setAnimate(false);
    setCount(0);
    const DURATION = 850;
    const startAt = performance.now();
    let countRaf = 0;
    const step = (now) => {
      const p = Math.min(1, (now - startAt) / DURATION);
      const eased = 1 - (1 - p) ** 3; // easeOutCubic — fast then settles
      setCount(stopped * eased);
      if (p < 1) countRaf = requestAnimationFrame(step);
    };
    countRaf = requestAnimationFrame(step);
    // Flip the class on the next frame so the CSS transitions actually run.
    const flipRaf = requestAnimationFrame(() => setAnimate(true));
    return () => {
      cancelAnimationFrame(countRaf);
      cancelAnimationFrame(flipRaf);
    };
  }, [stopped, targetSeconds]);

  const maxVal = Math.max(targetSeconds, stopped, 0.001) * 1.12;
  const posYou = clampPct((stopped / maxVal) * 100);
  const posTarget = clampPct((targetSeconds / maxVal) * 100);
  const gapLeft = Math.min(posYou, posTarget);
  const gapWidth = Math.abs(posYou - posTarget);
  const quality = result.perfect ? "perfect" : result.points > 0 ? "good" : "miss";
  const errorAbs = Math.abs(result.errorSeconds);
  const sign = result.errorSeconds > 0 ? "+" : result.errorSeconds < 0 ? "−" : "";
  const dir = result.errorSeconds > 0 ? copy.late : result.errorSeconds < 0 ? copy.early : "";

  return (
    <div className={`pulso-reveal pulso-reveal--${quality}${animate ? " is-animate" : ""}`}>
      {result.perfect ? <span className="pulso-perfect">{copy.perfect}</span> : null}

      <div className="pulso-reveal-clock">
        {fmt2(count)}
        <em>{copy.seconds}</em>
      </div>

      <div className="pulso-track" aria-hidden="true">
        <div className="pulso-track-fill" style={{ width: animate ? `${posYou}%` : "0%" }} />
        <div className="pulso-track-gap" style={{ left: `${gapLeft}%`, width: `${gapWidth}%` }} />
        <div className="pulso-track-target" style={{ left: `${posTarget}%` }}>
          <span className="pulso-flag pulso-flag--target">
            {copy.target} {fmt1(targetSeconds)}
            {copy.seconds}
          </span>
        </div>
        <div className="pulso-track-you" style={{ left: animate ? `${posYou}%` : "0%" }}>
          <span className="pulso-flag pulso-flag--you">{copy.yourTime}</span>
        </div>
      </div>

      <div className="pulso-reveal-meta">
        <span className="pulso-reveal-error">
          {copy.error} <strong>{sign}{fmt2(errorAbs)}{copy.seconds}</strong>
          {dir ? <em> · {dir}</em> : null}
        </span>
        <span className="pulso-reveal-points">+{result.points}</span>
      </div>
    </div>
  );
}

export default function PulsoExactoGame() {
  const locale = useMemo(() => (resolveBrowserLanguage() === "es" ? "es" : "en"), []);
  const copy = getCopy(locale);
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
    const audio = createPulsoExactoAudio(readStoredPulsoMuted());
    const rt = new PulsoExactoRuntime({
      locale,
      audio,
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
  const toggleSound = useCallback(() => rtRef.current?.toggleAudioMuted(), []);

  // Physical keyboard: the same keys the on-screen controls expose.
  useEffect(() => {
    const onKey = (e) => {
      const code = e.code;
      if (["Space", "Enter", "KeyR", "KeyP", "KeyF", "KeyM"].includes(code)) {
        if (code === "Space") e.preventDefault(); // never scroll the page on stop
        rtRef.current?.pressVirtualKey(code);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const screen = snap?.screen ?? "menu";
  const audioMuted = snap?.audio?.muted ?? readStoredPulsoMuted();
  const clockVisible = Boolean(snap?.clockVisible);

  // Tapping anywhere on the stage stops the clock while it is running.
  const onStagePointer = useCallback(() => {
    if (rtRef.current?.snapshot()?.screen === "running") {
      rtRef.current.primaryAction();
    }
  }, []);

  const clockText =
    screen === "running" && !clockVisible ? "– – –" : fmt2(snap?.displaySeconds ?? 0);

  const result = snap?.lastResult ?? null;

  return (
    <div ref={rootRef} className="mini-game pulso-exacto">
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="pulso-actions">
          {screen === "running" ? (
            <button type="button" onClick={() => press("KeyP")}>
              {snap?.paused ? copy.resume : copy.pause}
            </button>
          ) : null}
          <button type="button" onClick={() => press("KeyR")}>
            {copy.restart}
          </button>
          <button
            id="pulso-exacto-sound-btn"
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
        className={`pulso-stage pulso-stage--${screen}${clockVisible ? " is-live" : ""}`}
        onPointerDown={onStagePointer}
        role={screen === "running" ? "button" : undefined}
        aria-label={screen === "running" ? copy.stop : undefined}
      >
        {screen === "menu" ? (
          <div className="pulso-panel">
            <p className="pulso-lead">{copy.menuLead}</p>
            <button
              type="button"
              className="pulso-primary"
              onClick={(e) => {
                e.stopPropagation();
                press("Space");
              }}
            >
              ▶ {copy.start}
            </button>
          </div>
        ) : null}

        {screen === "ready" ? (
          <div className="pulso-panel">
            <span className="pulso-target-label">{copy.target}</span>
            <span className="pulso-target-value">
              {fmt1(snap?.targetSeconds ?? 0)}
              <em>{copy.seconds}</em>
            </span>
            <p className="pulso-lead">{copy.readyLead}</p>
            <button
              type="button"
              className="pulso-primary"
              onClick={(e) => {
                e.stopPropagation();
                press("Space");
              }}
            >
              ▶ {copy.startRound}
            </button>
          </div>
        ) : null}

        {screen === "running" ? (
          <div className="pulso-panel">
            <span className="pulso-target-label">
              {copy.target} {fmt1(snap?.targetSeconds ?? 0)}
              {copy.seconds}
            </span>
            <span className={`pulso-clock${clockVisible ? " is-live" : " is-hidden"}`}>
              {clockText}
            </span>
            <p className="pulso-lead">
              {snap?.paused ? copy.paused : clockVisible ? copy.watchGuide : copy.hidden}
            </p>
            <button
              type="button"
              className="pulso-primary pulso-stop"
              onClick={(e) => {
                e.stopPropagation();
                press("Space");
              }}
            >
              {copy.stop}
            </button>
          </div>
        ) : null}

        {screen === "result" && result ? (
          <div className="pulso-panel">
            <RoundReveal
              key={snap?.round}
              targetSeconds={snap?.targetSeconds ?? 0}
              result={result}
              copy={copy}
            />
            <button
              type="button"
              className="pulso-primary"
              onClick={(e) => {
                e.stopPropagation();
                press("Space");
              }}
            >
              ▶ {snap?.round >= snap?.totalRounds ? copy.finalScore : copy.next}
            </button>
          </div>
        ) : null}

        {screen === "gameover" ? (
          <div className="pulso-panel">
            <span className="pulso-target-label">{copy.finalScore}</span>
            <span className="pulso-final-score">{snap?.totalScore ?? 0}</span>
            <span className="pulso-rating">{copy.ratings[snap?.ratingKey] ?? ""}</span>
            <button
              type="button"
              className="pulso-primary"
              onClick={(e) => {
                e.stopPropagation();
                press("Space");
              }}
            >
              ▶ {copy.again}
            </button>
          </div>
        ) : null}
      </div>

      <section className="pulso-controls" aria-label={copy.title}>
        <div className="pulso-stats">
          <span>
            {copy.round} <strong>{Math.min(snap?.round || 1, snap?.totalRounds || 5)}/{snap?.totalRounds ?? 5}</strong>
          </span>
          <span>
            {copy.score} <strong>{snap?.totalScore ?? 0}</strong>
          </span>
          <span>
            {copy.best} <strong>{snap?.best ?? 0}</strong>
          </span>
        </div>
        <p className="pulso-hint">{copy.hint}</p>
      </section>
    </div>
  );
}
