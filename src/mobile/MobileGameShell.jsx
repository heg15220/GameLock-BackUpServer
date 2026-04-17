import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdPreviewCard from "../components/AdPreviewCard";
import MobileControlDeck from "./MobileControlDeck";
import MobileBowlingFramesPanel from "./MobileBowlingFramesPanel";
import MobileGameStatusPanel from "./MobileGameStatusPanel";
import MobileHeadSoccerTournamentPanel from "./MobileHeadSoccerTournamentPanel";
import {
  MOBILE_APP_COMPACT_AD_SLOT,
  MOBILE_APP_BOTTOM_AD_SLOT,
  TABLET_APP_SIDE_AD_SLOTS,
} from "../config/adPreview";
import {
  getMobileControlProfile,
  getResponsiveMobileShellMode,
} from "./mobileGameProfiles";
import { getMobileStageSelectors } from "./mobileStageProfiles";
import useMobileRuntimeSnapshot from "./useMobileRuntimeSnapshot";
import MobileStageAdOverlay from "./MobileStageAdOverlay";
import "./mobile-game-shell.css";

const TABLET_LANDSCAPE_STACK_CATEGORIES = new Set([
  "arcade",
  "juegos",
  "games",
  "deportes",
  "sports",
]);

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

function resolveTabletLandscapePanelCopy(locale) {
  return {
    controlsEyebrow: locale === "en" ? "Play deck" : "Zona de juego",
    controlsTitle: locale === "en" ? "Joystick and action buttons" : "Joystick y botones de accion",
    controlsDescription:
      locale === "en"
        ? "Keep the match on the upper stage and use the lower deck for direct play controls."
        : "Mantiene el gameplay en la parte superior y concentra debajo los controles tactiles de juego.",
    statusEyebrow: locale === "en" ? "Match setup" : "Configuracion",
    statusTitle: locale === "en" ? "State and game settings" : "Estado y ajustes de partida",
    statusDescription:
      locale === "en"
        ? "Quick setup, score, and contextual actions stay grouped in the lower management panel."
        : "Reune marcador, opciones previas y acciones contextuales en un panel inferior de gestion.",
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
    .filter((selector) => typeof selector === "string" && !selector.startsWith("iframe:"))
    .map((selector) => {
      try {
        return viewport.querySelector(selector);
      } catch {
        return null;
      }
    })
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
      if (
        sibling !== current &&
        sibling.tagName !== "STYLE" &&
        sibling.getAttribute("data-mobile-stage-overlay") !== "true"
      ) {
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
  showAdPreview = false,
  showSystemBottomAd: showSystemBottomAdOverride,
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
  const tabletPanelCopy = useMemo(
    () => resolveTabletLandscapePanelCopy(locale),
    [locale]
  );
  const isDualScreen = shellMode === "dual-screen";
  const isTouchStage = shellMode === "mobile-first" && shellTheme === "default";
  const isPortrait = viewport.orientation === "portrait";
  const viewportFormFactor = viewport.formFactor ?? "desktop";
  const categoryKey = String(game?.category ?? "").toLowerCase();
  const isStrategyTheme = shellTheme === "strategy";
  const isKnowledgeTheme = shellTheme === "knowledge";
  const isGamesCategory = categoryKey === "juegos" || categoryKey === "games";
  const derivedShowSystemBottomAd =
    showAdPreview &&
    viewportFormFactor !== "desktop" &&
    (isStrategyTheme || (isKnowledgeTheme && isPortrait));
  const showSystemBottomAd = showSystemBottomAdOverride ?? derivedShowSystemBottomAd;
  const showTabletStageSideAds =
    showAdPreview &&
    viewportFormFactor === "tablet" &&
    !isPortrait &&
    isKnowledgeTheme;
  const showTouchPanelBottomAd =
    showSystemBottomAd &&
    viewportFormFactor === "phone" &&
    isStrategyTheme &&
    !isDualScreen;
  const useInlineSystemBottomAd =
    showSystemBottomAd &&
    !showTouchPanelBottomAd &&
    viewportFormFactor === "phone" &&
    isStrategyTheme;
  const showCompactGamesAppAd =
    showAdPreview &&
    viewportFormFactor !== "desktop" &&
    isGamesCategory;
  const showTouchIntroCopy = !isStrategyTheme;
  const showStageAdOverlay =
    showAdPreview &&
    !showCompactGamesAppAd &&
    !showTabletStageSideAds &&
    (isDualScreen || isTouchStage);
  const isTabletLandscapeStack =
    isDualScreen &&
    viewportFormFactor === "tablet" &&
    !isPortrait &&
    TABLET_LANDSCAPE_STACK_CATEGORIES.has(String(game?.category ?? "").toLowerCase());
  const stageSelectors = useMemo(
    () => getMobileStageSelectors(game?.id),
    [game?.id]
  );
  const handleStageViewportRef = useCallback((node) => {
    setStageViewportNode((currentNode) => (
      currentNode === node ? currentNode : node
    ));
  }, []);

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
    showSystemBottomAd ? "mobile-game-shell--with-system-bottom-ad" : "",
    showTabletStageSideAds ? "mobile-game-shell--tablet-stage-side-ads" : "",
    showTouchPanelBottomAd ? "mobile-game-shell--touch-panel-bottom-ad" : "",
    useInlineSystemBottomAd ? "mobile-game-shell--system-bottom-ad-inline" : "",
    showCompactGamesAppAd ? "mobile-game-shell--with-compact-games-ad" : "",
    isTabletLandscapeStack ? "mobile-game-shell--tablet-landscape-stack" : "",
    isFullscreen ? "mobile-game-shell--fullscreen" : "",
    isDualScreen ? "mobile-game-shell--has-controls" : "mobile-game-shell--touch-native",
  ]
    .filter(Boolean)
    .join(" ");

  const controlDeckNode = (
    <MobileControlDeck
      profile={profile}
      scopeElement={stageViewportNode}
      snapshot={runtimeSnapshot}
      onRequestFullscreen={requestFullscreen}
    />
  );
  const isSportsCategory = categoryKey === "deportes" || categoryKey === "sports";
  const isStatusFirstStack =
    game?.id === "arcade-valle-tranquilo" ||
    game?.id === "arcade-dig-hole-treasure" ||
    isSportsCategory;
  const compactGamesAdNode =
    showCompactGamesAppAd ? (
      <AdPreviewCard
        slot={MOBILE_APP_COMPACT_AD_SLOT}
        locale={locale}
        className="mobile-game-shell__compact-app-ad"
      />
    ) : null;

  const statusPanelsNode = (
    <>
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
    </>
  );

  const tabletControlsSectionNode = (
    <section className="mobile-game-shell__tablet-section mobile-game-shell__tablet-section--controls">
      <header className="mobile-game-shell__tablet-section-header">
        <span>{tabletPanelCopy.controlsEyebrow}</span>
        <strong>{tabletPanelCopy.controlsTitle}</strong>
        <p>{tabletPanelCopy.controlsDescription}</p>
      </header>
      <div className="mobile-game-shell__controls-primary">
        {controlDeckNode}
      </div>
    </section>
  );

  const tabletStatusSectionNode = (
    <section className="mobile-game-shell__tablet-section mobile-game-shell__tablet-section--status">
      <header className="mobile-game-shell__tablet-section-header">
        <span>{tabletPanelCopy.statusEyebrow}</span>
        <strong>{tabletPanelCopy.statusTitle}</strong>
        <p>{tabletPanelCopy.statusDescription}</p>
      </header>
      <div className="mobile-game-shell__controls-secondary">
        {statusPanelsNode}
      </div>
    </section>
  );

  const fullscreenSystemAdSpacerNode =
    showSystemBottomAd && isFullscreen && !useInlineSystemBottomAd ? (
      <div className="mobile-game-shell__system-bottom-spacer" aria-hidden="true" />
    ) : null;
  const inlineSystemBottomAdNode =
    useInlineSystemBottomAd ? (
      <AdPreviewCard
        slot={MOBILE_APP_BOTTOM_AD_SLOT}
        locale={locale}
        className="mobile-game-shell__system-bottom-ad mobile-game-shell__system-bottom-ad--inline"
      />
    ) : null;
  const touchPanelBottomAdNode =
    showTouchPanelBottomAd ? (
      <AdPreviewCard
        slot={MOBILE_APP_BOTTOM_AD_SLOT}
        locale={locale}
        className="mobile-game-shell__system-bottom-ad mobile-game-shell__system-bottom-ad--inline mobile-game-shell__system-bottom-ad--touch-panel"
      />
    ) : null;
  const stageFrameNode = (
    <div className="mobile-game-shell__screen-frame">
      <div className="mobile-game-shell__screen-glass">
        <div
          className="mobile-game-shell__stage-viewport"
          ref={handleStageViewportRef}
        >
          <Suspense fallback={fallback}>{children}</Suspense>
          <MobileStageAdOverlay
            viewportNode={stageViewportNode}
            enabled={showStageAdOverlay}
            locale={locale}
            formFactor={viewportFormFactor}
            gameId={game?.id}
            stageSelectors={stageSelectors}
            preferLandscapeSidePlacements={
              viewportFormFactor === "tablet" &&
              !isPortrait &&
              shellTheme === "default" &&
              isDualScreen
            }
          />
        </div>
      </div>
    </div>
  );

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
            {showTabletStageSideAds ? (
              <div className="mobile-game-shell__stage-shell-grid">
                <div className="mobile-game-shell__stage-side-ad-wrap mobile-game-shell__stage-side-ad-wrap--left">
                  <AdPreviewCard
                    slot={TABLET_APP_SIDE_AD_SLOTS[0]}
                    locale={locale}
                    className="mobile-game-shell__stage-side-ad"
                  />
                </div>
                {stageFrameNode}
                <div className="mobile-game-shell__stage-side-ad-wrap mobile-game-shell__stage-side-ad-wrap--right">
                  <AdPreviewCard
                    slot={TABLET_APP_SIDE_AD_SLOTS[1]}
                    locale={locale}
                    className="mobile-game-shell__stage-side-ad"
                  />
                </div>
              </div>
            ) : (
              stageFrameNode
            )}
          </section>

          {isDualScreen ? (
            <section className="mobile-game-shell__controls-shell">
              <div className="mobile-game-shell__hinge" aria-hidden="true" />
              <div className="mobile-game-shell__controls-panel">
                <div className="mobile-game-shell__controls-stack">
                  {isTabletLandscapeStack ? (
                    <>
                      {isStatusFirstStack ? tabletStatusSectionNode : tabletControlsSectionNode}
                      {isStatusFirstStack ? tabletControlsSectionNode : tabletStatusSectionNode}
                    </>
                  ) : (
                    <>
                      <div className="mobile-game-shell__controls-secondary">
                        {statusPanelsNode}
                      </div>
                      <div className="mobile-game-shell__controls-primary">
                        {controlDeckNode}
                      </div>
                    </>
                  )}
                  {compactGamesAdNode}
                  {inlineSystemBottomAdNode}
                  {fullscreenSystemAdSpacerNode}
                </div>
              </div>
            </section>
          ) : (
            <section className="mobile-game-shell__touch-copy">
              <div className="mobile-game-shell__touch-panel-content">
                <MobileGameStatusPanel
                  gameCategory={game?.category}
                  locale={locale}
                  scopeElement={stageViewportNode}
                  snapshot={runtimeSnapshot}
                  bottomContent={touchPanelBottomAdNode}
                />
                {showTouchIntroCopy ? (
                  <>
                    <strong>{shellCopy.touchTitle}</strong>
                    <p>{shellCopy.touchDescription}</p>
                  </>
                ) : null}
                {compactGamesAdNode}
              </div>
              {inlineSystemBottomAdNode}
              {fullscreenSystemAdSpacerNode}
            </section>
          )}
        </div>
      </div>
      {showSystemBottomAd && isFullscreen && !useInlineSystemBottomAd ? (
        <div className="mobile-game-shell__system-bottom-ad-wrap">
          <AdPreviewCard
            slot={MOBILE_APP_BOTTOM_AD_SLOT}
            locale={locale}
            className="mobile-game-shell__system-bottom-ad"
          />
        </div>
      ) : null}
    </div>
  );
}
