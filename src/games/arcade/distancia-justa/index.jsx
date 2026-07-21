import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import { getCopy } from "./copy.js";
import { createDistanciaJustaAudio, readStoredDistanciaMuted } from "./audio.js";
import { DistanciaJustaRuntime } from "./runtime.js";
import { drawScene } from "./render.js";

const DIFF_ORDER = ["facil", "normal", "dificil"];

export default function DistanciaJustaGame() {
  const locale = useMemo(() => (resolveBrowserLanguage() === "es" ? "es" : "en"), []);
  const copy = getCopy(locale);
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const rtRef = useRef(null);
  const [snap, setSnap] = useState(null);

  // Every input source that can drive movement, unified into one direction.
  const moveSrc = useRef({ kf: false, kb: false, ptrFwd: false, ptrBack: false });
  const applyMove = useCallback(() => {
    const s = moveSrc.current;
    const dir = s.kf || s.ptrFwd ? 1 : s.kb || s.ptrBack ? -1 : 0;
    rtRef.current?.setMove(dir);
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
    const audio = createDistanciaJustaAudio(readStoredDistanciaMuted());
    const rt = new DistanciaJustaRuntime({
      locale,
      audio,
      onSnapshot: setSnap,
      onFullscreen: handleFS,
    });
    rtRef.current = rt;

    let cssW = 320;
    let cssH = 240;
    let dpr = 1;
    const sizeCanvas = () => {
      // Cap the ratio so 4 lanes on a 3x phone don't blow up the buffer, but
      // still render at device resolution instead of a blurry 1x upscale.
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cssW = Math.max(320, Math.floor(canvas.clientWidth));
      cssH = Math.max(240, Math.floor(canvas.clientHeight));
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
      const s = rt.advanceTime(dt); // updates + returns snapshot
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

  // Keyboard: hold to walk, Enter to confirm/advance screens.
  useEffect(() => {
    const onDown = (e) => {
      const c = e.code;
      const screen = rtRef.current?.snapshot()?.screen;
      if (c === "ArrowRight" || c === "KeyD") {
        moveSrc.current.kf = true;
        applyMove();
        e.preventDefault();
      } else if (c === "ArrowLeft" || c === "KeyA") {
        moveSrc.current.kb = true;
        applyMove();
        e.preventDefault();
      } else if (c === "Space") {
        e.preventDefault();
        if (screen === "run") {
          moveSrc.current.kf = true;
          applyMove();
        } else if (!e.repeat) {
          press("Space");
        }
      } else if (c === "Enter") {
        if (!e.repeat) press("Enter");
      } else if (["KeyR", "KeyP", "KeyF", "KeyM"].includes(c)) {
        if (!e.repeat) press(c);
      }
    };
    const onUp = (e) => {
      const c = e.code;
      if (c === "ArrowRight" || c === "KeyD" || c === "Space") {
        moveSrc.current.kf = false;
        applyMove();
      } else if (c === "ArrowLeft" || c === "KeyA") {
        moveSrc.current.kb = false;
        applyMove();
      }
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [applyMove, press]);

  // Touch/press the track itself to walk forward.
  const onStageDown = useCallback(
    (e) => {
      if (rtRef.current?.snapshot()?.screen !== "run") return;
      e.preventDefault();
      moveSrc.current.ptrFwd = true;
      applyMove();
    },
    [applyMove],
  );
  const releaseStage = useCallback(() => {
    moveSrc.current.ptrFwd = false;
    applyMove();
  }, [applyMove]);

  const holdBtn = useCallback(
    (which, value) => ({
      onPointerDown: (e) => {
        e.preventDefault();
        e.stopPropagation();
        moveSrc.current[which] = value;
        applyMove();
      },
      onPointerUp: (e) => {
        e.stopPropagation();
        moveSrc.current[which] = false;
        applyMove();
      },
      onPointerLeave: () => {
        moveSrc.current[which] = false;
        applyMove();
      },
      onPointerCancel: () => {
        moveSrc.current[which] = false;
        applyMove();
      },
    }),
    [applyMove],
  );

  const screen = snap?.screen ?? "menu";
  const audioMuted = snap?.audio?.muted ?? readStoredDistanciaMuted();
  const running = screen === "run";
  const lowTime = running && (snap?.timeLeftSeconds ?? 30) <= 5;

  const medal = (rank) => ["🥇", "🥈", "🥉"][rank] ?? `${rank + 1}${copy.rankSuffix}`;

  return (
    <div ref={rootRef} className="mini-game distancia-justa">
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="dj-actions">
          {running ? (
            <button type="button" onClick={() => press("KeyP")}>
              {snap?.paused ? copy.resume : copy.pause}
            </button>
          ) : null}
          <button type="button" onClick={() => press("KeyR")}>
            {copy.restart}
          </button>
          <button
            id="distancia-justa-sound-btn"
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

      <div className="dj-stage">
        <canvas
          ref={canvasRef}
          className="dj-canvas"
          onPointerDown={onStageDown}
          onPointerUp={releaseStage}
          onPointerLeave={releaseStage}
          onPointerCancel={releaseStage}
        />

        {/* Run HUD */}
        {running ? (
          <div className="dj-hud">
            <span className="dj-hud-round">
              {copy.round} {snap?.round}/{snap?.totalRounds}
            </span>
            <span className="dj-hud-target">
              {copy.target} <strong>{snap?.targetMeters}{copy.meters}</strong>
            </span>
            <span className={`dj-hud-time${lowTime ? " is-low" : ""}`}>
              {copy.time} <strong>{snap?.timeLeftSeconds}s</strong>
            </span>
          </div>
        ) : null}

        {snap?.waitingForRivals ? (
          <div className="dj-waiting">
            <span className="dj-waiting-dot" />
            {copy.waiting} ({snap.confirmedCount}/4)
          </div>
        ) : null}

        {/* Menu / difficulty */}
        {screen === "menu" ? (
          <div className="dj-overlay">
            <div className="dj-panel">
              <p className="dj-lead">{copy.menuLead}</p>
              <span className="dj-choose">{copy.chooseDifficulty}</span>
              <div className="dj-diff-row">
                {DIFF_ORDER.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`dj-diff dj-diff--${d}`}
                    onClick={() => rtRef.current?.startGame(d)}
                  >
                    <strong>{copy.difficulties[d]}</strong>
                    <em>{copy.difficultyHints[d]}</em>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Announcement */}
        {screen === "announce" ? (
          <div className="dj-overlay">
            <div className="dj-announce" onClick={() => press("Enter")}>
              <span className="dj-announce-lead">{copy.getReady}</span>
              <span className="dj-announce-big">
                {copy.walkTarget} {snap?.targetMeters} {copy.meters}!
              </span>
            </div>
          </div>
        ) : null}

        {/* Round reveal */}
        {screen === "reveal" && snap?.lastRound ? (
          <div className="dj-overlay">
            <div className="dj-panel dj-panel--result">
              <span className="dj-result-title">
                {copy.roundResult} · {copy.target} <strong>{snap?.targetMeters}{copy.meters}</strong>
              </span>
              <ul className="dj-result-list">
                {snap.lastRound.map((r, i) => {
                  const worst = Math.max(...snap.lastRound.map((x) => x.error), 0.001);
                  const prox = 14 + (1 - r.error / worst) * 86; // closest → fullest bar
                  return (
                    <li
                      key={r.id}
                      className={`${r.isPlayer ? "is-player " : ""}dj-rank-${r.rank}`}
                      style={{ "--dj-c": r.color, animationDelay: `${i * 70}ms` }}
                    >
                      <span className="dj-medal">{medal(r.rank)}</span>
                      <div className="dj-row-main">
                        <div className="dj-row-top">
                          <span className="dj-name">{r.isPlayer ? copy.you : r.name}</span>
                          <span className="dj-meters">
                            {r.meters}{copy.meters} <em>±{r.error}{copy.meters}</em>
                          </span>
                        </div>
                        <div className="dj-bar">
                          <div className="dj-bar-fill" style={{ width: `${prox}%`, background: r.color }} />
                        </div>
                      </div>
                      <span className="dj-pts">+{r.points}</span>
                    </li>
                  );
                })}
              </ul>
              <button type="button" className="dj-primary" onClick={() => press("Enter")}>
                ▶ {snap?.round >= snap?.totalRounds ? copy.finalStandings : copy.next}
              </button>
            </div>
          </div>
        ) : null}

        {/* Game over / standings */}
        {screen === "gameover" && snap?.standings ? (
          <div className="dj-overlay">
            <div className="dj-panel">
              <span className="dj-result-title">{copy.finalStandings}</span>
              {snap.championId === "you" ? (
                <span className="dj-champion">🏆 {copy.youWin}</span>
              ) : null}
              <ul className="dj-result-list dj-standings">
                {snap.standings.map((r, i) => (
                  <li
                    key={r.id}
                    className={`${r.isPlayer ? "is-player " : ""}dj-rank-${i}`}
                    style={{ "--dj-c": r.color, animationDelay: `${i * 80}ms` }}
                  >
                    <span className="dj-medal">{medal(i)}</span>
                    <span className="dj-name">{r.isPlayer ? copy.you : r.name}</span>
                    <span className="dj-pts">{r.total} {copy.points}</span>
                  </li>
                ))}
              </ul>
              <div className="dj-over-actions">
                <button type="button" className="dj-primary" onClick={() => press("Enter")}>
                  ▶ {copy.again}
                </button>
                <button type="button" className="dj-act-back" onClick={() => rtRef.current?.backToMenu()}>
                  {copy.changeDifficulty}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {snap?.paused ? (
          <div className="dj-overlay dj-overlay--paused">
            <span className="dj-paused">{copy.paused}</span>
          </div>
        ) : null}
      </div>

      <section className="dj-controls" aria-label={copy.title}>
        <div className="dj-move-deck">
          <button type="button" className="dj-hold dj-hold--back" disabled={!running} {...holdBtn("ptrBack", true)}>
            ◀ {copy.back}
          </button>
          <button type="button" className="dj-hold dj-hold--fwd" disabled={!running} {...holdBtn("ptrFwd", true)}>
            {copy.advance} ▶
          </button>
          <button
            type="button"
            className="dj-hold dj-hold--confirm"
            disabled={!running || snap?.player?.confirmed}
            onClick={(e) => {
              e.stopPropagation();
              rtRef.current?.confirmPlayer();
            }}
          >
            ✓ {snap?.player?.confirmed ? copy.confirmed : copy.confirm}
          </button>
        </div>
        <div className="dj-stats">
          <span>
            {copy.round} <strong>{Math.max(1, snap?.round || 1)}/{snap?.totalRounds ?? 5}</strong>
          </span>
          <span>
            {copy.best} <strong>{snap?.best ?? 0}</strong>
          </span>
          <span>
            {snap?.difficultyLabel ?? copy.difficulties.normal}
          </span>
        </div>
        <p className="dj-hint">{copy.hint}</p>
      </section>
    </div>
  );
}
