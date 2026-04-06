import React, { useEffect, useRef, useState } from "react";
import { syncEmbeddedFrameLayout } from "../../../utils/syncEmbeddedFrameLayout";

const FALLBACK_PAYLOAD = JSON.stringify({
  mode: "arcade",
  variant: "valle-tranquilo",
  phase: "loading",
  coordinates: "x increases to the right; y increases downward.",
});

export default function ValleTranquiloGame() {
  const frameRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const renderProxy = () => {
      const childWindow = frameRef.current?.contentWindow;
      if (!childWindow) return FALLBACK_PAYLOAD;
      try {
        if (typeof childWindow.render_game_to_text === "function") {
          return childWindow.render_game_to_text();
        }
      } catch (error) {
        return FALLBACK_PAYLOAD;
      }
      return FALLBACK_PAYLOAD;
    };

    const advanceProxy = (ms = 0) => {
      const childWindow = frameRef.current?.contentWindow;
      if (!childWindow) return undefined;
      try {
        if (typeof childWindow.advanceTime === "function") {
          return childWindow.advanceTime(ms);
        }
      } catch (error) {
        return undefined;
      }
      return undefined;
    };

    window.render_game_to_text = renderProxy;
    window.advanceTime = advanceProxy;

    return () => {
      if (window.render_game_to_text === renderProxy) {
        window.render_game_to_text = undefined;
      }
      if (window.advanceTime === advanceProxy) {
        window.advanceTime = undefined;
      }
    };
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !isReady) {
      return undefined;
    }

    const syncLayout = () => {
      syncEmbeddedFrameLayout(frame, "arcade-valle-tranquilo");
    };

    syncLayout();
    const resizeObserver = new ResizeObserver(syncLayout);
    resizeObserver.observe(frame);
    window.addEventListener("resize", syncLayout);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncLayout);
    };
  }, [isReady]);

  return (
    <div className="arcade-neon-rush-shell">
      {!isReady ? (
        <div className="arcade-neon-rush-loading">
          Loading Valle Tranquilo...
        </div>
      ) : null}
      <iframe
        ref={frameRef}
        src="/arcade/valle-tranquilo/index.html"
        title="Valle Tranquilo"
        className="arcade-neon-rush-frame"
        onLoad={() => {
          setIsReady(true);
          syncEmbeddedFrameLayout(frameRef.current, "arcade-valle-tranquilo");
          frameRef.current?.contentWindow?.focus?.();
        }}
      />
    </div>
  );
}
