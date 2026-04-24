import { useEffect } from "react";

// Sibling to <ActiveGame /> inside Suspense. When this effect runs, the
// lazy chunk has loaded and the game component is mounted. Two RAFs of
// buffer so the first paint is actually on screen, then resolve both
// ready and matchStarted.
//
// For games with a prep phase (menu to dismiss, countdown, etc.), the
// Playwright harness handles it externally by sending start-game inputs
// after ready and then measuring input/frame metrics from that point.
export default function BenchReadyMarker({ gameId }) {
  useEffect(() => {
    const bench = window.__bench;
    if (!bench) return undefined;
    let cancelled = false;
    let raf2Id = 0;
    const raf1Id = requestAnimationFrame(() => {
      if (cancelled) return;
      raf2Id = requestAnimationFrame(() => {
        if (cancelled) return;
        bench._resolveReady();
        bench._resolveMatchStarted();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1Id);
      if (raf2Id) cancelAnimationFrame(raf2Id);
    };
  }, [gameId]);
  return null;
}
