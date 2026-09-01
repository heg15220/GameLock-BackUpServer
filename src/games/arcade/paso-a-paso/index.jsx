import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import { getCopy } from "./copy.js";
import { createPasoAPasoAudio, readStoredPasoMuted } from "./audio.js";
import { PasoAPasoRuntime, DIFFICULTIES, NUMBERS, PICK_MS } from "./runtime.js";
import { drawScene } from "./scene.js";

// The Wii original puts the three numbers on the d-pad: 1 left, 3 up, 5 right.
// The cards keep that arrangement so the arrow keys and the layout agree.
const CARD_ARROW = { 1: "←", 3: "↑", 5: "→" };

function playerName(player, copy) {
  return player.isHuman ? copy.you : copy.rivalNames[player.id] ?? player.id;
}

export default function PasoAPasoGame() {
  const locale = useMemo(() => (resolveBrowserLanguage() === "es" ? "es" : "en"), []);
  const copy = getCopy(locale);
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const rtRef = useRef(null);
  const [snap, setSnap] = useState(null);
  const [difficulty, setDifficulty] = useState("normal");

  const handleFS = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const audio = createPasoAPasoAudio(readStoredPasoMuted());
    const rt = new PasoAPasoRuntime({
      locale,
      audio,
      onSnapshot: setSnap,
      onFullscreen: handleFS,
    });
    rtRef.current = rt;

    let cssW = 320;
    let cssH = 180;
    // Measure the *stage*, never the canvas. The mobile shell styles canvases
    // inside an isolated stage with `object-fit: contain` and only wins on
    // `height`, so a canvas asked for its own width reports the width its
    // buffer ratio implies rather than the width it has to fill — on a tablet
    // in landscape that left 40% of the stage unpainted. Sizing the buffer to
    // the stage makes the intrinsic ratio agree with the box either way.
    const sizeCanvas = () => {
      const stage = canvas.parentElement;
      // Cap the ratio so a 3x phone does not allocate a buffer it cannot paint
      // at 60fps, while still rendering above a blurry 1x upscale.
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cssW = Math.max(320, Math.floor(stage?.clientWidth || canvas.clientWidth));
      cssH = Math.max(180, Math.floor(stage?.clientHeight || canvas.clientHeight));
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
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
      if (context) drawScene(context, s, cssW, cssH, now);
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
      "ArrowLeft", "ArrowUp", "ArrowRight",
      "Digit1", "Digit3", "Digit5",
      "Numpad1", "Numpad3", "Numpad5",
      "Space", "Enter", "KeyR", "KeyP", "KeyF", "KeyM",
    ];
    const onKey = (e) => {
      if (!codes.includes(e.code)) return;
      // Arrows and Space would scroll the page out from under the stage.
      if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
      rtRef.current?.pressVirtualKey(e.code);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const screen = snap?.screen ?? "menu";
  const audioMuted = snap?.audio?.muted ?? readStoredPasoMuted();
  const players = snap?.players ?? [];
  const you = players[0] ?? null;
  const winners = snap?.winners ?? [];
  const secondsLeft = snap?.secondsLeft ?? 0;
  const timePct = Math.max(0, Math.min(100, (1 - (snap?.pickProgress ?? 0)) * 100));
  const urgent = screen === "pick" && secondsLeft <= 3;

  const chooseDifficulty = useCallback((key) => {
    setDifficulty(key);
    rtRef.current?.setDifficulty(key);
  }, []);

  const startMatch = useCallback(() => {
    rtRef.current?.startMatch(difficulty);
  }, [difficulty]);

  const outcome = useMemo(() => {
    if (screen !== "gameover" || winners.length === 0) return null;
    if (winners.length > 1) return copy.winnerTie;
    if (winners[0] === "you") return copy.winnerYou;
    const winner = players.find((p) => p.id === winners[0]);
    return `${winner ? playerName(winner, copy) : ""} ${copy.winnerOther}`;
  }, [screen, winners, players, copy]);

  return (
    <div ref={rootRef} className="mini-game paso-a-paso">
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="pap-actions">
          {screen === "pick" || screen === "reveal" || screen === "climb" ? (
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
            id="paso-a-paso-sound-btn"
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

      <div className={`pap-stage pap-stage--${screen}`}>
        <canvas ref={canvasRef} className="pap-canvas" aria-label={copy.title} />

        {screen !== "menu" ? (
          <div className="pap-topbar" aria-hidden={screen === "gameover"}>
            <span className="pap-round">
              {copy.round} <strong>{snap?.round ?? 1}</strong>
            </span>
            <div className={`pap-timer${urgent ? " is-urgent" : ""}`}>
              <span className="pap-timer-value">
                {screen === "pick" ? secondsLeft : "—"}
              </span>
              <div className="pap-timer-track">
                <div className="pap-timer-fill" style={{ width: `${screen === "pick" ? timePct : 0}%` }} />
              </div>
            </div>
            <span className="pap-phase">
              {screen === "pick"
                ? copy.pickPrompt
                : screen === "reveal"
                  ? copy.revealLead
                  : screen === "climb"
                    ? copy.climbLead
                    : ""}
            </span>
          </div>
        ) : null}

        {screen === "menu" ? (
          <div className="pap-overlay">
            <div className="pap-panel">
              <p className="pap-lead">{copy.menuLead}</p>
              <p className="pap-tip">{copy.menuTip}</p>
              <span className="pap-panel-label">{copy.difficulty}</span>
              <div className="pap-diffs">
                {DIFFICULTIES.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`pap-diff pap-diff--${key}${difficulty === key ? " is-active" : ""}`}
                    aria-pressed={difficulty === key}
                    onClick={() => chooseDifficulty(key)}
                  >
                    <strong>{copy.difficulties[key]}</strong>
                    <em>{copy.difficultyNotes[key]}</em>
                  </button>
                ))}
              </div>
              <button type="button" className="pap-primary" onClick={startMatch}>
                ▶ {copy.start}
              </button>
            </div>
          </div>
        ) : null}

        {screen === "pick" && snap?.paused ? (
          <div className="pap-overlay">
            <div className="pap-panel pap-panel--slim">
              <span className="pap-panel-label">{copy.paused}</span>
              <button type="button" className="pap-primary" onClick={() => press("KeyP")}>
                ▶ {copy.resume}
              </button>
            </div>
          </div>
        ) : null}

        {screen === "gameover" ? (
          <div className="pap-overlay">
            <div className="pap-panel">
              <span className="pap-outcome">{outcome}</span>
              {!winners.includes("you") ? <p className="pap-lead">{copy.loseLead}</p> : null}
              <div className="pap-final-stats">
                <span>
                  {copy.finalRounds} <strong>{snap?.round ?? 0}</strong>
                </span>
                <span>
                  {copy.wins} <strong>{snap?.wins ?? 0}</strong>
                </span>
                {snap?.bestRounds ? (
                  <span>
                    {copy.bestRounds} <strong>{snap.bestRounds} {copy.rounds}</strong>
                  </span>
                ) : null}
              </div>
              <div className="pap-final-actions">
                <button type="button" className="pap-primary" onClick={startMatch}>
                  ▶ {copy.again}
                </button>
                <button
                  type="button"
                  className="pap-act-back"
                  onClick={() => rtRef.current?.backToMenu()}
                >
                  {copy.changeSetup}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* The cards live under the stage, not over it: on a phone the stage is
          barely 200px tall and an overlay would sit exactly where the climbers
          start. They stay mounted between rounds so the row never jumps — they
          just lock, and the one you chose keeps showing what you chose. */}
      <div
        className={`pap-cards pap-cards--${screen}`}
        role="group"
        aria-label={copy.pickPrompt}
      >
        {NUMBERS.map((n) => {
          const chosen = you?.pick === n;
          const state = screen === "pick" || !chosen
            ? ""
            : you?.unique
              ? " is-good"
              : " is-clash";
          return (
            <button
              key={n}
              type="button"
              className={`pap-card pap-card--${n}${chosen ? " is-picked" : ""}${state}`}
              aria-pressed={chosen}
              disabled={screen !== "pick" || Boolean(snap?.paused)}
              onClick={() => rtRef.current?.choose(n)}
            >
              <span className="pap-card-arrow">{CARD_ARROW[n]}</span>
              <span className="pap-card-number">{n}</span>
            </button>
          );
        })}
      </div>

      <section className="pap-board" aria-label={copy.steps}>
        {players.map((player) => {
          const name = playerName(player, copy);
          const closing = player.needs <= 5 && player.needs > 0;
          return (
            <article
              key={player.id}
              className={`pap-row${player.isHuman ? " is-you" : ""}${player.unique && player.gain > 0 ? " is-climbing" : ""}`}
              style={{ "--pap-color": player.color }}
            >
              <span className="pap-chip" aria-hidden="true" />
              <span className="pap-name">
                {name}
                {player.personality ? (
                  <em title={copy.personalityNotes[player.personality]}>
                    {copy.personalities[player.personality]}
                  </em>
                ) : null}
              </span>
              <span className="pap-steps">
                <strong>{player.step}</strong>/{snap?.topStep ?? 12}
              </span>
              <span className={`pap-needs${closing ? " is-closing" : ""}`}>
                {player.isHuman ? copy.needsYou : copy.needsRival.replace("{name}", name)}{" "}
                {player.needs}
              </span>
              <span className="pap-track" aria-hidden="true">
                <span
                  className="pap-track-fill"
                  style={{ width: `${(player.step / (snap?.topStep ?? 12)) * 100}%` }}
                />
              </span>
              <span className="pap-history" aria-label={copy.picksHistory}>
                {player.history.map((value, i) => (
                  <em key={`${player.id}-${i}`}>{value ?? "–"}</em>
                ))}
              </span>
            </article>
          );
        })}
      </section>

      <p className="pap-hint">{copy.hint}</p>
    </div>
  );
}

export { PICK_MS };
