import React, { useEffect, useRef, useCallback } from 'react';
import BubbleRuntime, { W, H } from './runtime.js';
import { drawBubbleScene } from './render.js';

export default function BubbleStormGame() {
  const canvasRef = useRef(null);
  const rtRef     = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rt = new BubbleRuntime({ canvas, onSnapshot: null });

    // Patch render so it is called each frame from the runtime loop
    rt._render = () => drawBubbleScene(rt.ctx, rt);

    const onKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'Tab') e.preventDefault();
      rt.handleKey(true, e.key);
    };
    window.addEventListener('keydown', onKeyDown);

    rt.start();
    rtRef.current = rt;

    return () => {
      rt.destroy();
      window.removeEventListener('keydown', onKeyDown);
      rtRef.current = null;
    };
  }, []);

  // Map client pointer position → canvas logical coordinates
  const toCanvasPos = useCallback((clientX, clientY, canvas) => {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top)  * scaleY,
    };
  }, []);

  const handleMouseMove = useCallback((e) => {
    const rt = rtRef.current;
    if (!rt || rt.phase !== 'playing') return;
    const { x, y } = toCanvasPos(e.clientX, e.clientY, e.currentTarget);
    rt.setAim(x, y);
  }, [toCanvasPos]);

  const handleClick = useCallback((e) => {
    const rt = rtRef.current;
    if (!rt) return;
    if (rt.phase === 'menu')    { rt._startGame(); return; }
    if (rt.phase === 'gameover'){ rt._init();      return; }
    const { x, y } = toCanvasPos(e.clientX, e.clientY, e.currentTarget);
    rt.setAim(x, y);
    rt.shoot();
  }, [toCanvasPos]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    const rt = rtRef.current;
    if (!rt || rt.phase !== 'playing') return;
    const t = e.touches[0];
    const { x, y } = toCanvasPos(t.clientX, t.clientY, e.currentTarget);
    rt.setAim(x, y);
  }, [toCanvasPos]);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    const rt = rtRef.current;
    if (!rt) return;
    if (rt.phase === 'menu')    { rt._startGame(); return; }
    if (rt.phase === 'gameover'){ rt._init();      return; }
    const t = e.changedTouches[0];
    const { x, y } = toCanvasPos(t.clientX, t.clientY, e.currentTarget);
    rt.setAim(x, y);
    rt.shoot();
  }, [toCanvasPos]);

  return (
    <div className="bubble-game">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="bubble-canvas"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'none', cursor: 'crosshair' }}
      />
    </div>
  );
}
