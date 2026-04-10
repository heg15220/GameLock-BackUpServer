import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import MobileControlDeck from "./MobileControlDeck";
import MobileBowlingFramesPanel from "./MobileBowlingFramesPanel";
import MobileGameStatusPanel from "./MobileGameStatusPanel";
import MobileHeadSoccerTournamentPanel from "./MobileHeadSoccerTournamentPanel";
import {
  getMobileControlProfile,
  getResponsiveMobileShellMode,
} from "./mobileGameProfiles";
import { getMobileStageSelectors } from "./mobileStageProfiles";
import useMobileRuntimeSnapshot from "./useMobileRuntimeSnapshot";
import "./mobile-game-shell.css";

function resolveShellTheme(game) {
  const categoryKey = String(game?.category ?? "");
  if (categoryKey === "Estrategia" || categoryKey === "Strategy") {
    return "strategy";
  }
  if (categoryKey === "Conocimiento" || categoryKey === "Knowledge") {
    return "knowledge";
  }
  return "default";
}

function resolveShellCopy(game, locale, shellMode) {
  const categoryKey = String(game?.category ?? "");
  const isStrategy = categoryKey === "Estrategia" || categoryKey === "Strategy";
  const isKnowledge = categoryKey === "Conocimiento" || categoryKey === "Knowledge";

  if (isStrategy) {
    return {
      brand: locale === "en" ? "Strategy Board" : "Mesa tactica",
      dualScreenBrand:
        shellMode === "dual-screen"
          ? locale === "en" ? "Strategy Desk" : "Mesa estrategica"
          : locale === "en" ? "Strategy Board" : "Mesa tactica",
      touchTitle:
        locale === "en" ? "Touch-first board" : "Tablero tactil",
      touchDescription:
        locale === "en"
          ? "Strategy games prioritize direct board and card interaction. In portrait, use the lower panel for setup and hidden desktop actions."
          : "Los juegos de estrategia priorizan la interaccion directa con tablero y cartas. En vertical, usa el panel inferior para configuracion y acciones de escritorio ocultas.",
    };
  }

  if (isKnowledge) {
    return {
      brand: locale === "en" ? "Knowledge Lab" : "Laboratorio",
      dualScreenBrand:
        shellMode === "dual-screen"
          ? locale === "en" ? "Knowledge Deck" : "Panel de conocimiento"
          : locale === "en" ? "Knowledge Lab" : "Laboratorio",
      touchTitle:
        locale === "en" ? "Reading and answer mode" : "Modo lectura y respuesta",
      touchDescription:
        locale === "en"
          ? "Knowledge games keep prompts, boards, and answer areas inside the main stage. Rotate the device when you need a wider focus area."
          : "Los juegos de conocimiento mantienen en el escenario principal el enunciado, el tablero y la zona de respuesta. Gira el dispositivo cuando necesites una zona de foco mas amplia.",
    };
  }

  return {
    brand: "Touch Stage",
    dualScreenBrand: "Arcade DS",
    touchTitle: locale === "en" ? "Touch-native mode" : "Modo tactil nativo",
    touchDescription:
      locale === "en"
        ? "Play directly on the game surface in portrait. Rotate to landscape for a wider fullscreen stage."
        : "Juega directamente sobre la superficie del juego en vertical. Gira a horizontal para una vista mas amplia y pantalla completa.",
  };
}

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
  const shellTheme = useMemo(
    () => resolveShellTheme(game),
    [game]
  );
  const shellCopy = useMemo(
    () => resolveShellCopy(game, locale, shellMode),
    [game, locale, shellMode]
  );
  const isDualScreen = shellMode === "dual-screen";
  const isPortrait = viewport.orientation === "portrait";
  const viewportFormFactor = viewport.formFactor ?? "desktop";
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
    `mobile-game-shell--device-${viewportFormFactor}`,
    `mobile-game-shell--theme-${shellTheme}`,
    isFullscreen ? "mobile-game-shell--fullscreen" : "",
    isDualScreen ? "mobile-game-shell--has-controls" : "mobile-game-shell--touch-native",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={shellClassName}
      ref={shellRef}
      data-game-id={game.id}
      data-game-category={String(game?.category ?? "").toLowerCase()}
      data-shell-mode={shellMode}
      data-device-form-factor={viewportFormFactor}
    >
      <div className="mobile-game-shell__hardware">
        <div className="mobile-game-shell__topbar">
          <span className="mobile-game-shell__camera" aria-hidden="true" />
          <span className="mobile-game-shell__brand">
            {isDualScreen ? shellCopy.dualScreenBrand : shellCopy.brand}
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
                    gameCategory={game?.category}
                    locale={locale}
                    scopeElement={stageViewportNode}
                    snapshot={runtimeSnapshot}
                  />
                  {game?.id === "sports-head-soccer-arena" ? (
                    <MobileHeadSoccerTournamentPanel
                      locale={locale}
                      scopeElement={stageViewportNode}
                      snapshot={runtimeSnapshot}
                    />
                  ) : null}
                  {game?.id === "arcade-bowling-pro-tour" ? (
                    <MobileBowlingFramesPanel
                      locale={locale}
                      snapshot={runtimeSnapshot}
                    />
                  ) : null}
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
                gameCategory={game?.category}
                locale={locale}
                scopeElement={stageViewportNode}
                snapshot={runtimeSnapshot}
              />
              <strong>{shellCopy.touchTitle}</strong>
              <p>{shellCopy.touchDescription}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
