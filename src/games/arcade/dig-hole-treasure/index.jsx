import React, { useEffect, useRef, useState } from "react";
import { syncEmbeddedFrameLayout } from "../../../utils/syncEmbeddedFrameLayout";

const FALLBACK_PAYLOAD = JSON.stringify({
  mode: "arcade-dig-hole-treasure",
  screen: "loading",
  coordinates: "x increases to the right; y increases downward.",
});

function shouldForward(code) {
  return [
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Space",
    "Enter",
    "Escape",
    "KeyA",
    "KeyB",
    "KeyD",
    "KeyE",
    "KeyF",
    "KeyI",
    "KeyJ",
    "KeyK",
    "KeyL",
    "KeyM",
    "KeyP",
    "KeyR",
    "KeyT",
    "KeyW",
    "Digit1",
    "Digit2",
    "Digit3",
  ].includes(code);
}

function cloneKeyboardEvent(targetWindow, eventName, event) {
  return new targetWindow.KeyboardEvent(eventName, {
    key: event.key,
    code: event.code,
    location: event.location,
    repeat: event.repeat,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
    metaKey: event.metaKey,
    bubbles: true,
    cancelable: true,
  });
}

export default function DigHoleTreasureGame() {
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
      } catch {
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
      } catch {
        return undefined;
      }
      return undefined;
    };

    const forwardKeyboardEvent = (eventName) => (event) => {
      if (!shouldForward(event.code)) {
        return;
      }
      const childWindow = frameRef.current?.contentWindow;
      if (!childWindow) {
        return;
      }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) {
        event.preventDefault();
      }
      try {
        const forwarded = cloneKeyboardEvent(childWindow, eventName, event);
        childWindow.dispatchEvent(forwarded);
        childWindow.document?.dispatchEvent(forwarded);
      } catch {
        // Ignore forwarding failures.
      }
    };

    const onKeyDown = forwardKeyboardEvent("keydown");
    const onKeyUp = forwardKeyboardEvent("keyup");

    window.render_game_to_text = renderProxy;
    window.advanceTime = advanceProxy;
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);

    return () => {
      if (window.render_game_to_text === renderProxy) {
        window.render_game_to_text = undefined;
      }
      if (window.advanceTime === advanceProxy) {
        window.advanceTime = undefined;
      }
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
    };
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !isReady) {
      return undefined;
    }

    const syncLayout = () => {
      syncEmbeddedFrameLayout(frame, "arcade-dig-hole-treasure");
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
          Loading Dig The Hole...
        </div>
      ) : null}
      <iframe
        ref={frameRef}
        src="/arcade/dig-hole-treasure/index.html"
        title="Dig The Hole"
        className="arcade-neon-rush-frame"
        onLoad={() => {
          setIsReady(true);
          syncEmbeddedFrameLayout(frameRef.current, "arcade-dig-hole-treasure");
          frameRef.current?.contentWindow?.focus?.();
        }}
      />
    </div>
  );
}
