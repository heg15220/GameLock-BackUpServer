import { useEffect, useState } from "react";

function parseSnapshot(rawValue) {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

function readRuntimeSnapshot(scopeElement) {
  const readers = [];

  if (typeof window !== "undefined" && typeof window.render_game_to_text === "function") {
    readers.push(() => window.render_game_to_text());
  }

  if (scopeElement) {
    scopeElement.querySelectorAll("iframe").forEach((frame) => {
      try {
        if (typeof frame.contentWindow?.render_game_to_text === "function") {
          readers.push(() => frame.contentWindow.render_game_to_text());
        }
      } catch {
        // Ignore cross-origin or not-ready frames.
      }
    });
  }

  for (const read of readers) {
    const snapshot = parseSnapshot(read());
    if (snapshot && typeof snapshot === "object") {
      return snapshot;
    }
  }

  return null;
}

export default function useMobileRuntimeSnapshot(scopeElement) {
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const syncSnapshot = () => {
      setSnapshot(readRuntimeSnapshot(scopeElement));
    };

    syncSnapshot();
    const intervalId = window.setInterval(syncSnapshot, 220);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [scopeElement]);

  return snapshot;
}
