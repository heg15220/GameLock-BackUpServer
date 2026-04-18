import React, { useEffect, useRef, useState } from "react";
import AdPreviewCard from "../../../components/AdPreviewCard";
import { MOBILE_APP_COMPACT_AD_SLOT } from "../../../config/adPreview";
import { syncEmbeddedFrameLayout } from "../../../utils/syncEmbeddedFrameLayout";
import fightingGameHtml from "./fighting_game.html?raw";

const FALLBACK_PAYLOAD = JSON.stringify({
  mode: "arcade-stick-brawl-showdown",
  phase: "loading",
  coordinates: "origin_top_left_x_right_y_down_pixels",
});

export default function StickBrawlShowdown() {
  const frameRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const adLocale = typeof document !== "undefined" && String(document.documentElement?.lang ?? "").toLowerCase().startsWith("en")
    ? "en"
    : "es";

  useEffect(() => {
    const renderProxy = () => {
      const childWindow = frameRef.current?.contentWindow;
      if (!childWindow) {
        return FALLBACK_PAYLOAD;
      }
      try {
        if (typeof childWindow.render_game_to_text === "function") {
          return childWindow.render_game_to_text();
        }
      } catch {
        return FALLBACK_PAYLOAD;
      }
      return FALLBACK_PAYLOAD;
    };

    const advanceProxy = (ms = 0) => {
      const childWindow = frameRef.current?.contentWindow;
      if (!childWindow) {
        return undefined;
      }
      try {
        if (typeof childWindow.advanceTime === "function") {
          return childWindow.advanceTime(ms);
        }
      } catch {
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
      syncEmbeddedFrameLayout(frame, "arcade-stick-brawl-showdown");
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
    <div className="mini-game stick-brawl-showdown-game">
      <div className="fighter-stage phaser-canvas-shell stick-brawl-showdown-stage">
        {!isReady ? (
          <div className="stick-brawl-showdown-loading">
            Loading Stick Brawl...
          </div>
        ) : null}
        <div className="stick-brawl-showdown-frame-wrap">
          <iframe
            ref={frameRef}
            title="Stick Brawl Showdown"
            srcDoc={fightingGameHtml}
            className="stick-brawl-showdown-frame"
            sandbox="allow-scripts allow-same-origin allow-pointer-lock"
            onLoad={() => {
              setIsReady(true);
              syncEmbeddedFrameLayout(frameRef.current, "arcade-stick-brawl-showdown");
              frameRef.current?.contentWindow?.focus?.();
            }}
          />
        </div>
      </div>
      <div className="stick-brawl-showdown-inline-ad">
        <AdPreviewCard
          slot={MOBILE_APP_COMPACT_AD_SLOT}
          locale={adLocale}
          className="stick-brawl-showdown-inline-ad__card"
        />
      </div>
    </div>
  );
}
