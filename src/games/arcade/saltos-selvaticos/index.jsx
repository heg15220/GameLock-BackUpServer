import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import { getCopy } from "./copy.js";
import { createSaltosSelvaticosAudio, readStoredSaltosMuted } from "./audio.js";
import { SaltosSelvaticosRuntime } from "./runtime.js";
import { drawScene } from "./render.js";

const DIFF_ORDER = ["facil", "normal", "dificil"];

export default function SaltosSelvaticosGame() {
  const locale = useMemo(() => (resolveBrowserLanguage() === "es" ? "es" : "en"), []);
  const copy = getCopy(locale);
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
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
    const audio = createSaltosSelvaticosAudio(readStoredSaltosMuted());
    const rt = new SaltosSelvaticosRuntime({
      locale,
      audio,
      onSnapshot: setSnap,
      onFullscreen: handleFS,
    });
    rtRef.current = rt;
    rt.start();

    let cssW = 320;
    let cssH = 240;
    let dpr = 1;
    const sizeCanvas = () => {
      // Cap the ratio so a 3x phone doesn't blow up the backing store, while
      // still rendering at device resolution instead of a blurry 1x upscale.
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
  const pump = useCallback((dir) => rtRef.current?.pump(dir), []);
  const jump = useCallback(() => rtRef.current?.jump(), []);

  // Keyboard: ◀ / ▶ (arrows or A/D) throw your weight each way, Enter/J lets go.
  useEffect(() => {
    const onDown = (e) => {
      const c = e.code;
      const back = c === "ArrowLeft" || c === "KeyA";
      const fwd = c === "ArrowRight" || c === "KeyD";
      if (back || fwd) {
        e.preventDefault();
        if (e.repeat) return; // holding a key must not auto-fire the shake
        if (rtRef.current?.snapshot()?.screen === "swing") pump(back ? -1 : 1);
      } else if (c === "Space") {
        e.preventDefault();
        // Space only advances screens; the swing needs a direction.
        if (!e.repeat && rtRef.current?.snapshot()?.screen !== "swing") press("Space");
      } else if (c === "Enter" || c === "KeyJ") {
        if (!e.repeat) press(c);
      } else if (["KeyR", "KeyP", "KeyF", "KeyM"].includes(c)) {
        if (!e.repeat) press(c);
      }
    };
    window.addEventListener("keydown", onDown);
    return () => window.removeEventListener("keydown", onDown);
  }, [press, pump]);

  // Tapping the clearing shakes the vine, and which half you tap is which way
  // you throw your weight — the closest thing to waving the remote.
  const onStageDown = useCallback(
    (e) => {
      if (rtRef.current?.snapshot()?.screen !== "swing") return;
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      pump(e.clientX - rect.left < rect.width / 2 ? -1 : 1);
    },
    [pump],
  );

  const screen = snap?.screen ?? "menu";
  const audioMuted = snap?.audio?.muted ?? readStoredSaltosMuted();
  const swinging = screen === "swing";
  const player = snap?.player;
  const lowTime = swinging && (snap?.timeLeftSeconds ?? 18) <= 5;
  const power = Math.round((player?.power ?? 0) * 100);
  const canAct = swinging && !player?.released;

  const medal = (rank) => ["🥇", "🥈", "🥉"][rank] ?? `${rank + 1}${copy.rankSuffix}`;

  return (
    <div ref={rootRef} className="mini-game saltos-selvaticos">
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="ss-actions">
          {swinging || screen === "intro" ? (
            <button type="button" onClick={() => press("KeyP")}>
              {snap?.paused ? copy.resume : copy.pause}
            </button>
          ) : null}
          <button type="button" onClick={() => press("KeyR")}>
            {copy.restart}
          </button>
          <button
            id="saltos-selvaticos-sound-btn"
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

      <div className="ss-stage">
        <canvas
          ref={canvasRef}
          className="ss-canvas"
          onPointerDown={onStageDown}
        />

        {/* Scoreboard, mirroring the original: one card per jumper on the left,
            the record on the right. */}
        {screen !== "menu" ? (
          <>
            <ul className="ss-board" aria-label={copy.scoreboard}>
              {(snap?.jumpers ?? []).map((j) => (
                <li
                  key={j.id}
                  className={`ss-board-row${j.isPlayer ? " is-player" : ""}${j.landed ? " is-done" : ""}`}
                  style={{ "--ss-c": j.color }}
                >
                  <span className="ss-board-dot" aria-hidden="true" />
                  <span className="ss-board-name">{j.isPlayer ? copy.you : j.name}</span>
                  <span className="ss-board-dist">{j.landed ? j.distance : 0}{copy.meters}</span>
                </li>
              ))}
            </ul>
            <div className="ss-record">
              🏆 {snap?.best ?? 0}{copy.meters}
            </div>
          </>
        ) : null}

        {swinging || screen === "intro" ? (
          <div className="ss-hud">
            <span className="ss-hud-round">
              {copy.round} {snap?.round}/{snap?.totalRounds}
            </span>
            {lowTime ? (
              <span className="ss-hud-time is-low">
                {copy.time} <strong>{snap?.timeLeftSeconds}s</strong>
              </span>
            ) : null}
          </div>
        ) : null}

        {/* Momentum gauge, measured against the rope's own breaking point. */}
        {canAct ? (
          <div className={`ss-gauge${player?.atRisk ? " is-risk" : ""}`} aria-hidden="true">
            <span className="ss-gauge-label">{copy.power}</span>
            <div className="ss-gauge-track">
              <div className="ss-gauge-fill" style={{ width: `${power}%` }} />
              <span className="ss-gauge-limit" />
            </div>
            <span className="ss-gauge-num">{player?.amplitudeDeg ?? 0}°</span>
          </div>
        ) : null}

        {canAct && player?.atRisk ? <div className="ss-risk-cue">{copy.riskWarn}</div> : null}
        {canAct && !player?.atRisk && player?.lastPumpWrongWay ? (
          <div className="ss-wrong-cue">{copy.wrongWay}</div>
        ) : null}
        {canAct && player?.inWindow && !player?.atRisk ? (
          <div className="ss-window-cue">{copy.releaseNow}</div>
        ) : null}
        {player?.slack ? <div className="ss-slack-cue">{copy.slackCue}</div> : null}

        {snap?.waitingForRivals ? (
          <div className="ss-waiting">
            <span className="ss-waiting-dot" />
            {copy.waiting} ({snap.landedCount}/4)
          </div>
        ) : null}

        {screen === "menu" ? (
          <div className="ss-overlay">
            <div className="ss-panel">
              <p className="ss-lead">{copy.menuLead}</p>
              <span className="ss-choose">{copy.chooseDifficulty}</span>
              <div className="ss-diff-row">
                {DIFF_ORDER.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`ss-diff ss-diff--${d}`}
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

        {screen === "intro" ? (
          <div className="ss-overlay ss-overlay--intro">
            <div className="ss-announce" onClick={() => press("Enter")}>
              <span className="ss-announce-lead">{copy.getReady}</span>
              <span className="ss-announce-big">
                {copy.round} {snap?.round}/{snap?.totalRounds}
              </span>
            </div>
          </div>
        ) : null}

        {screen === "reveal" && snap?.lastRound ? (
          <div className="ss-overlay">
            <div className="ss-panel ss-panel--result">
              <span className="ss-result-title">{copy.roundResult}</span>
              <ul className="ss-result-list">
                {snap.lastRound.map((r, i) => {
                  const far = Math.max(...snap.lastRound.map((x) => x.distance), 0.001);
                  const bar = 12 + (r.distance / far) * 88;
                  return (
                    <li
                      key={r.id}
                      className={`${r.isPlayer ? "is-player " : ""}ss-rank-${r.rank}`}
                      style={{ "--ss-c": r.color, animationDelay: `${i * 70}ms` }}
                    >
                      <span className="ss-medal">{medal(r.rank)}</span>
                      <div className="ss-row-main">
                        <div className="ss-row-top">
                          <span className="ss-name">{r.isPlayer ? copy.you : r.name}</span>
                          <span className="ss-dist">
                            {r.distance}{copy.meters}{" "}
                            <em>
                              {r.slack
                                ? copy.slackMsg
                                : r.forced
                                  ? copy.tooLate
                                  : `${copy.swingAngle} ${r.ampDeg}° · ${copy.releaseAngle} ${r.releaseDeg}°`}
                            </em>
                          </span>
                        </div>
                        <div className="ss-bar">
                          <div className="ss-bar-fill" style={{ width: `${bar}%`, background: r.color }} />
                        </div>
                      </div>
                      <span className="ss-pts">+{r.points}</span>
                    </li>
                  );
                })}
              </ul>
              <button type="button" className="ss-primary" onClick={() => press("Enter")}>
                ▶ {snap?.round >= snap?.totalRounds ? copy.finalStandings : copy.next}
              </button>
            </div>
          </div>
        ) : null}

        {screen === "gameover" && snap?.standings ? (
          <div className="ss-overlay">
            <div className="ss-panel">
              <span className="ss-result-title">{copy.finalStandings}</span>
              {snap.championId === "you" ? <span className="ss-champion">🏆 {copy.youWin}</span> : null}
              <ul className="ss-result-list ss-standings">
                {snap.standings.map((r, i) => (
                  <li
                    key={r.id}
                    className={`${r.isPlayer ? "is-player " : ""}ss-rank-${i}`}
                    style={{ "--ss-c": r.color, animationDelay: `${i * 80}ms` }}
                  >
                    <span className="ss-medal">{medal(i)}</span>
                    <span className="ss-name">{r.isPlayer ? copy.you : r.name}</span>
                    <span className="ss-pts">{r.total} {copy.points}</span>
                  </li>
                ))}
              </ul>
              <div className="ss-over-actions">
                <button type="button" className="ss-primary" onClick={() => press("Enter")}>
                  ▶ {copy.again}
                </button>
                <button type="button" className="ss-act-back" onClick={() => rtRef.current?.backToMenu()}>
                  {copy.changeDifficulty}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {snap?.paused ? (
          <div className="ss-overlay ss-overlay--paused">
            <span className="ss-paused">{copy.paused}</span>
          </div>
        ) : null}
      </div>

      <section className="ss-controls" aria-label={copy.title}>
        <div className="ss-move-deck">
          <button
            type="button"
            className={`ss-act ss-act--pump ss-act--pump-back${player?.pumpCue === -1 ? " is-cued" : ""}${player?.pumpCue === -1 && player?.pumpSweet ? " is-sweet" : ""}`}
            disabled={!canAct}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              pump(-1);
            }}
          >
            ◀ {copy.pumpBack}
          </button>
          <button
            type="button"
            className={`ss-act ss-act--pump ss-act--pump-fwd${player?.pumpCue === 1 ? " is-cued" : ""}${player?.pumpCue === 1 && player?.pumpSweet ? " is-sweet" : ""}`}
            disabled={!canAct}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              pump(1);
            }}
          >
            {copy.pumpFwd} ▶
          </button>
          <button
            type="button"
            className={`ss-act ss-act--jump${player?.inWindow ? " is-cued" : ""}`}
            disabled={!canAct}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              jump();
            }}
          >
            🐒 {copy.jump}
          </button>
        </div>
        <div className="ss-stats">
          <span>
            {copy.round} <strong>{Math.max(1, snap?.round || 1)}/{snap?.totalRounds ?? 3}</strong>
          </span>
          <span>
            {copy.best} <strong>{snap?.best ?? 0}{copy.meters}</strong>
          </span>
          <span>{snap?.difficultyLabel ?? copy.difficulties.normal}</span>
        </div>
        <p className="ss-hint">{copy.hint}</p>
      </section>
    </div>
  );
}
