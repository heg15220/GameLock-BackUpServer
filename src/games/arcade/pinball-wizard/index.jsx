import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PinballRuntime, { W, H } from './runtime';
import { drawPinballScene } from './render';
import useGameRuntimeBridge from '../../../utils/useGameRuntimeBridge';

const DEFAULT_SNAP = {
  phase:         'menu',
  score:         0,
  hiScore:       0,
  ballsLeft:     3,
  multiplier:    1,
  plungerCharge: 0,
  message:       '',
  msgTimer:      0,
  ball:          { x: 378, y: 638, vx: 0, vy: 0, r: 10 },
  bumpers:       [],
  targets:       [],
  rollovers:     [],
  leftFlipper:   { angle: 0.489, active: false },
  rightFlipper:  { angle: 2.653, active: false },
  particles:     [],
};

export default function PinballWizardGame() {
  const canvasRef  = useRef(null);
  const shellRef   = useRef(null);
  const runtimeRef = useRef(null);
  const [snap, setSnap] = useState(DEFAULT_SNAP);

  // Wire runtime — renders directly into canvas via rAF
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Patch render so runtime draws itself each frame
    const rt = new PinballRuntime({ canvas, onSnapshot: setSnap });
    // Override _render to use render.js
    rt._render = function () {
      const state = {
        phase:         this.phase,
        score:         this.score,
        hiScore:       this._hiScore,
        ballsLeft:     this.ballsLeft,
        multiplier:    this.multiplier,
        plungerCharge: this.plungerCharge,
        message:       this.message,
        msgTimer:      this.msgTimer,
        ball:          this.ball,
        bumpers:       this.bumpers,
        targets:       this.targets,
        rollovers:     this.rollovers,
        leftFlipper:   this.leftFlipper,
        rightFlipper:  this.rightFlipper,
        particles:     this.particles,
      };
      drawPinballScene(this.ctx, state);
    };

    runtimeRef.current = rt;
    rt.start();
    return () => { rt.destroy(); runtimeRef.current = null; };
  }, []);

  // Fullscreen helper
  const requestFullscreen = useCallback(async () => {
    const el = shellRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document);
      } else {
        await (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
      }
    } catch { /**/ }
  }, []);

  // Touch handlers (prevent scroll)
  const flipL = useCallback((down) => (e) => {
    e.preventDefault();
    runtimeRef.current?.setFlipLeft(down);
  }, []);
  const flipR = useCallback((down) => (e) => {
    e.preventDefault();
    runtimeRef.current?.setFlipRight(down);
  }, []);
  const plunge = useCallback((down) => (e) => {
    e.preventDefault();
    runtimeRef.current?.setPlungeTouch(down);
    // Also trigger the launch key logic
    if (down) {
      runtimeRef.current?.keys && (runtimeRef.current.keys[' '] = true);
    } else {
      runtimeRef.current?.keys && (runtimeRef.current.keys[' '] = false);
    }
  }, []);
  const startGame = useCallback(() => {
    const rt = runtimeRef.current;
    if (!rt) return;
    if (rt.phase === 'menu')     { rt._startGame(); return; }
    if (rt.phase === 'gameOver') { rt._init(); return; }
    if (rt.phase === 'ballLost') { rt._placeBallOnLauncher(); return; }
  }, []);

  // QA bridge
  const buildTextPayload = useCallback((s) => ({
    mode:       'arcade-pinball-wizard',
    phase:      s.phase,
    score:      s.score,
    hiScore:    s.hiScore,
    ballsLeft:  s.ballsLeft,
    multiplier: s.multiplier,
    ball:       s.ball,
  }), []);
  const advanceTime = useCallback((ms) => runtimeRef.current?.advanceTime(ms), []);
  useGameRuntimeBridge(snap, buildTextPayload, advanceTime);

  return (
    <div className="mini-game pinball-game">
      <div className="mini-head pinball-head">
        <div>
          <p className="pinball-tag">ARCADE</p>
          <h4>Pinball Wizard</h4>
          <p>Hit bumpers, targets &amp; slingshots — keep the ball alive!</p>
        </div>
        <div className="pinball-head-actions">
          <button type="button" onClick={startGame}>
            {snap.phase === 'menu' || snap.phase === 'gameOver' ? 'Play' : 'Continue'}
          </button>
          <button type="button" onClick={() => runtimeRef.current?._init?.()}>Restart</button>
          <button type="button" onClick={requestFullscreen}>Fullscreen</button>
        </div>
      </div>

      <div className="pinball-layout">
        {/* Side panel */}
        <aside className="pinball-panel">
          <section>
            <h5>Score</h5>
            <strong className="pinball-score">{String(snap.score).padStart(8, '0')}</strong>
          </section>
          <section>
            <span>Best</span>
            <strong>{String(snap.hiScore).padStart(8, '0')}</strong>
          </section>
          <section>
            <span>Multiplier</span>
            <strong>×{snap.multiplier}</strong>
          </section>
          <section>
            <span>Balls left</span>
            <div className="pinball-balls">
              {[0, 1, 2].map(i => (
                <span key={i} className={i < snap.ballsLeft ? 'ball-dot active' : 'ball-dot'} />
              ))}
            </div>
          </section>
          <hr />
          <section>
            <h5>Controls</h5>
            <p><kbd>Z</kbd> / <kbd>←</kbd> Left flipper</p>
            <p><kbd>X</kbd> / <kbd>→</kbd> Right flipper</p>
            <p><kbd>Space</kbd> Charge &amp; launch</p>
            <p><kbd>R</kbd> Restart</p>
          </section>
          <section>
            <h5>Goals</h5>
            <p>Hit all 5 targets → ×Multiplier</p>
            <p>Light 3 lanes → +5000 bonus</p>
            <p>Bumper combos → extra pts</p>
          </section>
        </aside>

        {/* Canvas shell */}
        <div ref={shellRef} className="pinball-shell">
          <canvas
            ref={canvasRef}
            className="pinball-canvas"
            width={W}
            height={H}
            aria-label="Pinball Wizard game canvas"
          />

          {/* Touch controls overlay */}
          <div className="pinball-touch-controls">
            <button
              type="button"
              className="pinball-btn-flip"
              onTouchStart={flipL(true)}
              onTouchEnd={flipL(false)}
              onTouchCancel={flipL(false)}
              onMouseDown={flipL(true)}
              onMouseUp={flipL(false)}
              onMouseLeave={flipL(false)}
              aria-label="Left flipper"
            >
              ← FLIP
            </button>
            <button
              type="button"
              className="pinball-btn-plunge"
              onTouchStart={plunge(true)}
              onTouchEnd={plunge(false)}
              onTouchCancel={plunge(false)}
              onMouseDown={plunge(true)}
              onMouseUp={plunge(false)}
              onMouseLeave={plunge(false)}
              aria-label="Plunge"
            >
              ▲ LAUNCH
            </button>
            <button
              type="button"
              className="pinball-btn-flip"
              onTouchStart={flipR(true)}
              onTouchEnd={flipR(false)}
              onTouchCancel={flipR(false)}
              onMouseDown={flipR(true)}
              onMouseUp={flipR(false)}
              onMouseLeave={flipR(false)}
              aria-label="Right flipper"
            >
              FLIP →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
