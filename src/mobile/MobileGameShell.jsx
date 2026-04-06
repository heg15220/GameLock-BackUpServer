import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import MobileControlDeck from "./MobileControlDeck";
import MobileGameStatusPanel from "./MobileGameStatusPanel";
import {
  getMobileControlProfile,
  getResponsiveMobileShellMode,
} from "./mobileGameProfiles";
import { getMobileStageSelectors } from "./mobileStageProfiles";
import useMobileRuntimeSnapshot from "./useMobileRuntimeSnapshot";
import "./mobile-game-shell.css";

function clearStageIsolation(viewport) {
  viewport.removeAttribute("data-mobile-stage-isolated");
  viewport
    .querySelectorAll(
      "[data-mobile-stage-hidden],[data-mobile-stage-branch],[data-mobile-stage-target]"
    )
    .forEach((node) => {
      node.removeAttribute("data-mobile-stage-hidden");
      node.removeAttribute("data-mobile-stage-branch");
      node.removeAttribute("data-mobile-stage-target");
    });
}

function isolateStageBranch(viewport, selectors) {
  clearStageIsolation(viewport);

  const stageTarget = selectors
    .map((selector) => viewport.querySelector(selector))
    .find(Boolean);

  if (!stageTarget) {
    return false;
  }

  stageTarget.setAttribute("data-mobile-stage-target", "true");

  let current = stageTarget;
  while (current && current !== viewport) {
    current.setAttribute("data-mobile-stage-branch", "true");
    const parent = current.parentElement;
    if (!parent) {
      break;
    }
    Array.from(parent.children).forEach((sibling) => {
      if (sibling !== current && sibling.tagName !== "STYLE") {
        sibling.setAttribute("data-mobile-stage-hidden", "true");
      }
    });
    current = parent;
  }

  viewport.setAttribute("data-mobile-stage-isolated", "true");
  return true;
}

export default function MobileGameShell({
  game,
  viewport,
  locale,
  fallback,
  children,
}) {
  const shellRef = useRef(null);
  const [stageViewportNode, setStageViewportNode] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const shellMode = useMemo(
    () => getResponsiveMobileShellMode(game, viewport),
    [game, viewport]
  );
  const runtimeSnapshot = useMobileRuntimeSnapshot(stageViewportNode);
  const profile = useMemo(
    () => getMobileControlProfile(game, locale),
    [game, locale]
  );
  const isDualScreen = shellMode === "dual-screen";
  const isPortrait = viewport.orientation === "portrait";
  const stageSelectors = useMemo(
    () => getMobileStageSelectors(game?.id),
    [game?.id]
  );

  useEffect(() => {
    const viewportNode = stageViewportNode;
    if (!viewportNode) {
      return undefined;
    }

    const syncIsolation = () => isolateStageBranch(viewportNode, stageSelectors);
    syncIsolation();

    const observer = new MutationObserver(() => {
      syncIsolation();
    });
    observer.observe(viewportNode, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      clearStageIsolation(viewportNode);
    };
  }, [stageSelectors, stageViewportNode]);

  useEffect(() => {
    const syncFullscreen = () => {
      const currentShell = shellRef.current;
      setIsFullscreen(
        Boolean(
          currentShell &&
          (document.fullscreenElement === currentShell
            || document.webkitFullscreenElement === currentShell)
        )
      );
    };

    syncFullscreen();
    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("webkitfullscreenchange", syncFullscreen);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      document.removeEventListener("webkitfullscreenchange", syncFullscreen);
    };
  }, []);

  const requestFullscreen = async () => {
    const target = shellRef.current;
    if (!target) {
      return;
    }

    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
        return;
      }
      if (target.requestFullscreen) {
        await target.requestFullscreen();
      } else if (target.webkitRequestFullscreen) {
        target.webkitRequestFullscreen();
      }
    } catch {
      // Ignore fullscreen failures in embedded browsers.
    }
  };

  const shellClassName = [
    "mobile-game-shell",
    `mobile-game-shell--${isPortrait ? "portrait" : "landscape"}`,
    `mobile-game-shell--${shellMode}`,
    isFullscreen ? "mobile-game-shell--fullscreen" : "",
    isDualScreen ? "mobile-game-shell--has-controls" : "mobile-game-shell--touch-native",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClassName} ref={shellRef} data-game-id={game.id}>
      <div className="mobile-game-shell__hardware">
        <div className="mobile-game-shell__topbar">
          <span className="mobile-game-shell__camera" aria-hidden="true" />
          <span className="mobile-game-shell__brand">
            {isDualScreen ? "Arcade DS" : "Touch Stage"}
          </span>
          <button
            type="button"
            className="mobile-game-shell__fullscreen"
            onClick={requestFullscreen}
          >
            {locale === "en" ? "Fullscreen" : "Pantalla completa"}
          </button>
        </div>

        <div className="mobile-game-shell__body">
          <section className="mobile-game-shell__stage-shell">
            <div className="mobile-game-shell__screen-frame">
              <div className="mobile-game-shell__screen-glass">
                <div
                  className="mobile-game-shell__stage-viewport"
                  ref={(node) => {
                    setStageViewportNode(node);
                  }}
                >
                  <Suspense fallback={fallback}>{children}</Suspense>
                </div>
              </div>
            </div>
          </section>

          {isDualScreen ? (
            <section className="mobile-game-shell__controls-shell">
              <div className="mobile-game-shell__hinge" aria-hidden="true" />
              <div className="mobile-game-shell__controls-panel">
                <div className="mobile-game-shell__controls-stack">
                  <MobileGameStatusPanel
                    locale={locale}
                    scopeElement={stageViewportNode}
                    snapshot={runtimeSnapshot}
                  />
                  <MobileControlDeck
                    profile={profile}
                    scopeElement={stageViewportNode}
                    onRequestFullscreen={requestFullscreen}
                  />
                </div>
              </div>
            </section>
          ) : (
            <section className="mobile-game-shell__touch-copy">
              <MobileGameStatusPanel
                locale={locale}
                scopeElement={stageViewportNode}
                snapshot={runtimeSnapshot}
              />
              <strong>{locale === "en" ? "Touch-native mode" : "Modo táctil nativo"}</strong>
              <p>
                {locale === "en"
                  ? "Play directly on the game surface in portrait. Rotate to landscape for a wider fullscreen stage."
                  : "Juega directamente sobre la superficie del juego en vertical. Gira a horizontal para una vista más amplia y pantalla completa."}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
