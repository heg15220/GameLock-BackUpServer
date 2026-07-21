import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import { getCopy } from "./copy.js";
import { createTerrorZombiAudio, readStoredTerrorZombiMuted } from "./audio.js";
import { TerrorZombiRuntime, MAPS } from "./runtime.js";
import { drawScene } from "./render.js";

const DIFF_ORDER = ["facil", "normal", "dificil"];
const MAP_ORDER = MAPS.map((m) => m.id);

export default function TerrorZombiGame() {
  const locale = useMemo(() => (resolveBrowserLanguage() === "es" ? "es" : "en"), []);
  const copy = getCopy(locale);
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const rtRef = useRef(null);
  const [snap, setSnap] = useState(null);

  // Movement is fed from three sources unified into one 2D direction: held keys
  // (WASD/arrows), the on-screen D-pad, and a drag-joystick on the field. A drag
  // takes over while active; otherwise the boolean keys decide the vector.
  const keys = useRef({ up: false, down: false, left: false, right: false });
  const drag = useRef(null); // { x, y } normalized, or null
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
    const audio = createTerrorZombiAudio(readStoredTerrorZombiMuted());
    const rt = new TerrorZombiRuntime({
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

  // Keyboard: hold to move, Enter/Space to start/advance screens.
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
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        press(e.code);
      } else if (["KeyR", "KeyP", "KeyF", "KeyM"].includes(e.code)) {
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

  // Drag-joystick on the field: the vector from where the finger landed to where
  // it is now steers the survivor, so movement is a natural thumb push.
  const dragOrigin = useRef(null);
  const onFieldDown = useCallback(
    (e) => {
      if (rtRef.current?.snapshot()?.screen !== "playing") return;
      e.preventDefault();
      dragOrigin.current = { x: e.clientX, y: e.clientY };
      drag.current = { x: 0, y: 0 };
      canvasRef.current?.setPointerCapture?.(e.pointerId);
    },
    [],
  );
  const onFieldMove = useCallback(
    (e) => {
      const o = dragOrigin.current;
      if (!o) return;
      const dx = e.clientX - o.x;
      const dy = e.clientY - o.y;
      const m = Math.hypot(dx, dy);
      // A small dead-zone stops a stationary tap from jittering the survivor.
      if (m < 6) {
        drag.current = { x: 0, y: 0 };
      } else {
        drag.current = { x: dx / m, y: dy / m };
      }
      applyMove();
    },
    [applyMove],
  );
  const releaseField = useCallback(() => {
    dragOrigin.current = null;
    drag.current = null;
    applyMove();
  }, [applyMove]);

  // On-screen D-pad: hold buttons feed the same key booleans.
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

  const screen = snap?.screen ?? "menu";
  const audioMuted = snap?.audio?.muted ?? readStoredTerrorZombiMuted();
  const playing = screen === "playing";
  const survived = (snap?.elapsedSeconds ?? 0).toFixed(1);
  const result = snap?.result ?? null;

  const medal = (rank) => ["🥇", "🥈", "🥉", "4"][rank] ?? `${rank + 1}`;

  return (
    <div ref={rootRef} className="mini-game terror-zombi">
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="tz-actions">
          {/* Menu: pick the graveyard then a difficulty (which starts the round).
              These live in the toolbar — not only on the canvas overlay — so they
              stay reachable in the mobile shell, exactly like Restart/Sound. */}
          {screen === "menu" ? (
            <>
              <span className="tz-act-group" role="group" aria-label={copy.chooseMap}>
                {MAP_ORDER.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`tz-act-map tz-act-map--${id}${(snap?.mapId ?? MAP_ORDER[0]) === id ? " is-selected" : ""}`}
                    aria-pressed={(snap?.mapId ?? MAP_ORDER[0]) === id}
                    title={copy.maps[id].hint}
                    onClick={() => rtRef.current?.setMap(id)}
                  >
                    {copy.maps[id].name}
                  </button>
                ))}
              </span>
              <span className="tz-act-group" role="group" aria-label={copy.chooseDifficulty}>
                {DIFF_ORDER.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`tz-act-diff tz-act-diff--${d}`}
                    title={copy.difficultyHints[d]}
                    onClick={() => rtRef.current?.startGame(d)}
                  >
                    {copy.difficulties[d]}
                  </button>
                ))}
              </span>
            </>
          ) : null}
          {/* Result: replay or return to setup, mirroring the on-canvas panel. */}
          {screen === "over" ? (
            <>
              <button type="button" className="tz-act-primary" onClick={() => press("Enter")}>
                ▶ {copy.again}
              </button>
              <button type="button" className="tz-act-back" onClick={() => rtRef.current?.backToMenu()}>
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
            id="terror-zombi-sound-btn"
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

      <div className="tz-stage">
        <canvas
          ref={canvasRef}
          className="tz-canvas"
          onPointerDown={onFieldDown}
          onPointerMove={onFieldMove}
          onPointerUp={releaseField}
          onPointerLeave={releaseField}
          onPointerCancel={releaseField}
        />

        {/* Run HUD */}
        {playing ? (
          <div className="tz-hud">
            <span className="tz-hud-time">
              {copy.survived} <strong>{survived}{copy.seconds}</strong>
            </span>
            <span className="tz-hud-count">
              {copy.humansLeft} <strong>{snap?.humansLeft}/{snap?.totalHumans}</strong>
            </span>
            <span className="tz-hud-count tz-hud-zombies">
              {copy.zombies} <strong>{snap?.zombies}</strong>
            </span>
          </div>
        ) : null}

        {playing && snap?.graceActive ? (
          <div className="tz-grace">{copy.grace}</div>
        ) : null}

        {playing && snap?.playerInfected ? (
          <div className="tz-infected">{copy.infectedBanner}</div>
        ) : null}

        {/* Menu: the picker itself lives in the toolbar; this panel is the brief
            and echoes the current graveyard so the choice is legible on screen. */}
        {screen === "menu" ? (
          <div className="tz-overlay">
            <div className="tz-panel">
              <p className="tz-lead">{copy.menuLead}</p>
              <span className="tz-choose">
                {copy.chooseMap}: <strong>{copy.maps[snap?.mapId ?? MAP_ORDER[0]].name}</strong>
              </span>
              <span className="tz-prompt">{copy.menuPrompt}</span>
            </div>
          </div>
        ) : null}

        {/* Game over */}
        {screen === "over" && result ? (
          <div className="tz-overlay">
            <div className="tz-panel">
              <span className={`tz-result-title${result.win ? " is-win" : ""}`}>
                {result.win ? `🏆 ${copy.youWin}` : `☠ ${copy.youLose}`}
              </span>
              <span className="tz-result-sub">
                {copy.survived} <strong>{result.survivedSeconds.toFixed(1)}{copy.seconds}</strong>
                {" · "}
                {copy.rankLabel} <strong>{result.rank}{copy.rankSuffix}</strong>
              </span>
              <ul className="tz-result-list">
                {result.ranking.map((r, i) => (
                  <li
                    key={r.id}
                    className={`${r.isPlayer ? "is-player " : ""}tz-rank-${i}`}
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <span className="tz-medal">{medal(i)}</span>
                    <span className="tz-name">{r.isPlayer ? copy.you : r.name}</span>
                    <span className="tz-time">
                      {(r.survivedMs / 1000).toFixed(1)}{copy.seconds}
                      {r.survived ? ` · ${copy.winnerLabel}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
              <span className="tz-prompt">{copy.overPrompt}</span>
            </div>
          </div>
        ) : null}

        {snap?.paused ? (
          <div className="tz-overlay tz-overlay--paused">
            <span className="tz-paused">{copy.paused}</span>
          </div>
        ) : null}
      </div>

      <section className="tz-controls" aria-label={copy.title}>
        <div className="tz-dpad" role="group" aria-label={copy.move}>
          <button type="button" className="tz-dir tz-dir--up" disabled={!playing} {...padBtn("up")}>▲</button>
          <button type="button" className="tz-dir tz-dir--left" disabled={!playing} {...padBtn("left")}>◀</button>
          <button type="button" className="tz-dir tz-dir--right" disabled={!playing} {...padBtn("right")}>▶</button>
          <button type="button" className="tz-dir tz-dir--down" disabled={!playing} {...padBtn("down")}>▼</button>
        </div>
        <div className="tz-stats">
          <span>
            {copy.humansLeft} <strong>{snap?.humansLeft ?? 4}/{snap?.totalHumans ?? 4}</strong>
          </span>
          <span>
            {copy.best} <strong>{(snap?.best ?? 0).toFixed(1)}{copy.seconds}</strong>
          </span>
          <span>{snap?.difficultyLabel ?? copy.difficulties.normal}</span>
        </div>
        <p className="tz-hint">{copy.hint}</p>
      </section>
    </div>
  );
}
