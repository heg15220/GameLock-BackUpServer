import React, { Suspense, useEffect, useState } from "react";
import { useTranslations, getLocalizedGame } from "../i18n";
import { getGameComponent, CONTROL_HINTS_BY_LOCALE } from "../games/registry.jsx";
import { MOBILE_SHELL_CATEGORIES } from "../utils/mobileShellProfile";
import useMobileGameViewport from "../mobile/useMobileGameViewport";
import MobileGameShell from "../mobile/MobileGameShell";
import { getResponsiveMobileShellMode } from "../mobile/mobileGameProfiles";
import { NATIVE_MOBILE_GAME_IDS } from "../mobile/nativeMobileGameIds";
import AdPreviewCard from "./AdPreviewCard";
import {
  DESKTOP_AD_SLOTS,
  MOBILE_APP_BOTTOM_AD_SLOT,
  TABLET_APP_SIDE_AD_SLOTS,
} from "../config/adPreview";

const TABLET_DESKTOP_LAYOUT_GAME_IDS = new Set([
  "strategy-poker-holdem-no-bet",
]);

const TABLET_LANDSCAPE_AD_DISABLED_GAME_IDS = new Set([]);

const PORTRAIT_APP_BOTTOM_AD_GAME_IDS = new Set([
  "knowledge-crucigrama-mini",
  "knowledge-sopa-letras-mega",
]);

function GameLaunchModal({ game, onClose, adPreviewEnabled }) {
  const { t, locale } = useTranslations();
  const lg = getLocalizedGame(game, locale);
  const ActiveGame = getGameComponent(game.id);
  const controlHint = CONTROL_HINTS_BY_LOCALE[locale]?.[game.id];

  const [infoOpen, setInfoOpen] = useState(false);
  const viewport = useMobileGameViewport();

  // Lock body scroll while the modal is open so the body scrollbar
  // doesn't compete with the overlay's own scrollbar.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    const handleCloseRequest = () => {
      onClose();
    };
    window.addEventListener("launch-game-close", handleCloseRequest);
    return () => window.removeEventListener("launch-game-close", handleCloseRequest);
  }, [onClose]);

  const mobileShellMode = getResponsiveMobileShellMode(game, viewport);
  const mobileShellEligible = MOBILE_SHELL_CATEGORIES.has(String(game.category ?? ""));
  const forceDesktopTabletLayout =
    viewport.formFactor === "tablet" &&
    TABLET_DESKTOP_LAYOUT_GAME_IDS.has(String(game.id ?? ""));
  const gameId = String(game.id ?? "");
  const useMobileGameShell =
    mobileShellEligible &&
    viewport.isMobile &&
    !NATIVE_MOBILE_GAME_IDS.has(gameId) &&
    !forceDesktopTabletLayout;
  const viewportFormFactor = viewport.formFactor ?? "desktop";
  const categoryKey = String(game.category ?? "");
  const isStrategyCategory = categoryKey === "Estrategia" || categoryKey === "Strategy";
  const isKnowledgeCategory = categoryKey === "Conocimiento" || categoryKey === "Knowledge";
  const showPortraitKnowledgeBottomAd =
    isKnowledgeCategory &&
    viewport.orientation === "portrait" &&
    (useMobileGameShell || PORTRAIT_APP_BOTTOM_AD_GAME_IDS.has(gameId));
  const useCompactPortraitBottomAd = PORTRAIT_APP_BOTTOM_AD_GAME_IDS.has(gameId);
  const showMobileSystemBottomAd =
    adPreviewEnabled &&
    viewportFormFactor !== "desktop" &&
    ((isStrategyCategory && useMobileGameShell) || showPortraitKnowledgeBottomAd);
  const showShellManagedSystemBottomAd =
    showMobileSystemBottomAd &&
    isStrategyCategory &&
    useMobileGameShell;
  const showExternalMobileSystemBottomAd =
    showMobileSystemBottomAd &&
    !showShellManagedSystemBottomAd;
  const hasDesktopAdRails = viewportFormFactor === "desktop";
  const hasTabletLandscapeAdRails =
    viewportFormFactor === "tablet" &&
    viewport.orientation === "landscape" &&
    !isKnowledgeCategory &&
    !TABLET_LANDSCAPE_AD_DISABLED_GAME_IDS.has(gameId);
  const showDesktopAdRails = adPreviewEnabled && hasDesktopAdRails;
  const showTabletLandscapeAdRails = adPreviewEnabled && hasTabletLandscapeAdRails;
  const desktopAdColumns = {
    left: DESKTOP_AD_SLOTS.filter((slot) => slot.side === "left"),
    right: DESKTOP_AD_SLOTS.filter((slot) => slot.side === "right"),
  };
  const tabletAdColumns = {
    left: TABLET_APP_SIDE_AD_SLOTS.filter((slot) => slot.side === "left"),
    right: TABLET_APP_SIDE_AD_SLOTS.filter((slot) => slot.side === "right"),
  };
  const launchPlaygroundClassName = [
    "game-playground",
    "launch-game-playground",
    adPreviewEnabled ? "game-playground--ad-preview" : "game-playground--ad-preview-off",
    useMobileGameShell ? "playground-mobile-enabled" : "",
    viewport.isMobile ? "playground-mobile-active" : "",
    `playground-device-${viewportFormFactor}`,
    viewport.orientation === "portrait" ? "playground-mobile-portrait" : "playground-mobile-landscape",
    mobileShellMode === "dual-screen" ? "playground-mobile-dual-screen" : "",
    mobileShellMode === "mobile-first" ? "playground-mobile-first" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const launchOverlayClassName = [
    "launch-overlay",
    useMobileGameShell ? "launch-overlay--mobile-shell" : "",
    viewport.isMobile ? `launch-overlay--device-${viewportFormFactor}` : "",
    showExternalMobileSystemBottomAd ? "launch-overlay--with-system-bottom-ad" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const launchGameAreaClassName = [
    "launch-game-area",
    hasDesktopAdRails ? "launch-game-area--with-ads" : "",
    hasTabletLandscapeAdRails ? "launch-game-area--with-tablet-ads" : "",
    useMobileGameShell ? "launch-game-area--mobile-shell" : "",
    useMobileGameShell ? `launch-game-area--device-${viewportFormFactor}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={launchOverlayClassName}
      role="dialog"
      aria-modal="true"
      aria-label={lg.title}
    >
      {/* ── Top-bar ─────────────────────────────────────────────────────── */}
      <div className="launch-topbar">
        <button
          type="button"
          className="launch-back-btn"
          onClick={onClose}
          aria-label={t("back")}
        >
          {t("back")}
        </button>

        <div className="launch-topbar-meta">
          <span className="tag">{lg.category}</span>
          <span className="launch-topbar-title">{lg.title}</span>
        </div>

        <div className="launch-topbar-badges">
          <span className="chip">{game.sessionTime}</span>
          <span className="chip">{lg.difficulty}</span>
        </div>

        {!useMobileGameShell ? (
          <button
            type="button"
            className={`launch-info-toggle${infoOpen ? " active" : ""}`}
            onClick={() => setInfoOpen((o) => !o)}
            aria-expanded={infoOpen}
          >
            {infoOpen ? t("hideInfo") : t("showInfo")}
          </button>
        ) : null}

      </div>

      {/* ── Scrollable body: info strip + game area ─────────────────────── */}
      <div className="launch-body">

        {/* Info strip (colapsable) */}
        {infoOpen && !useMobileGameShell && (
          <header className="launch-info">
            <p className="launch-tagline">{lg.tagline}</p>

            <dl className="launch-facts">
              {lg.objective && (
                <div className="launch-fact">
                  <dt>{t("objective")}</dt>
                  <dd>{lg.objective}</dd>
                </div>
              )}

              {lg.howToPlay && (
                <div className="launch-fact">
                  <dt>{t("howToPlay")}</dt>
                  <dd>{lg.howToPlay}</dd>
                </div>
              )}

              {controlHint && (
                <div className="launch-fact">
                  <dt>{t("controls")}</dt>
                  <dd>{controlHint}</dd>
                </div>
              )}
            </dl>
          </header>
        )}

        {/* Game area */}
        <section className={launchGameAreaClassName} aria-label={t("playNow")}>
          {hasTabletLandscapeAdRails ? (
            <aside className="launch-tablet-ad-rail launch-tablet-ad-rail--left" aria-hidden={!adPreviewEnabled} style={adPreviewEnabled ? undefined : { visibility: "hidden" }}>
              {tabletAdColumns.left.map((slot) => (
                <AdPreviewCard
                  key={slot.id}
                  slot={slot}
                  locale={locale}
                  className="launch-tablet-ad-card"
                />
              ))}
            </aside>
          ) : null}
          {hasTabletLandscapeAdRails ? (
            <aside className="launch-tablet-ad-rail launch-tablet-ad-rail--right" aria-hidden={!adPreviewEnabled} style={adPreviewEnabled ? undefined : { visibility: "hidden" }}>
              {tabletAdColumns.right.map((slot) => (
                <AdPreviewCard
                  key={slot.id}
                  slot={slot}
                  locale={locale}
                  className="launch-tablet-ad-card"
                />
              ))}
            </aside>
          ) : null}
          {ActiveGame ? (
            useMobileGameShell ? (
              <MobileGameShell
                game={game}
                viewport={viewport}
                locale={locale}
                showAdPreview={adPreviewEnabled}
                showSystemBottomAd={showMobileSystemBottomAd}
                fallback={
                  <div className="launch-loading">
                    <span className="launch-loading-dot" />
                    <span className="launch-loading-dot" />
                    <span className="launch-loading-dot" />
                    <p>{t("loading")}</p>
                  </div>
                }
              >
                <ActiveGame />
              </MobileGameShell>
            ) : (
              <div
                className={[
                  "launch-game-area-layout",
                  hasDesktopAdRails ? "launch-game-area-layout--with-ads" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {hasDesktopAdRails ? (
                  <aside className="playground-ad-column playground-ad-column--left" aria-hidden={!adPreviewEnabled} style={adPreviewEnabled ? undefined : { visibility: "hidden" }}>
                    {desktopAdColumns.left.map((slot) => (
                      <AdPreviewCard
                        key={slot.id}
                        slot={slot}
                        locale={locale}
                        className="playground-ad-column__card"
                      />
                    ))}
                  </aside>
                ) : null}

                <div className="launch-game-area-stage">
                  <div
                    className={launchPlaygroundClassName}
                    data-category={String(game.category ?? "").toLowerCase()}
                    data-game-id={gameId}
                    data-mobile-shell={mobileShellMode}
                    data-mobile-orientation={viewport.orientation}
                    data-device-form-factor={viewportFormFactor}
                  >
                    <div className="playground-device-shell">
                      <div className="playground-device-bezel">
                        {mobileShellMode === "dual-screen" && viewport.orientation === "portrait" ? (
                          <div className="playground-device-hinge" aria-hidden="true" />
                        ) : null}
                        <div className="playground-device-content">
                          <Suspense
                            fallback={
                              <div className="launch-loading">
                                <span className="launch-loading-dot" />
                                <span className="launch-loading-dot" />
                                <span className="launch-loading-dot" />
                                <p>{t("loading")}</p>
                              </div>
                            }
                          >
                            <ActiveGame />
                          </Suspense>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {hasDesktopAdRails ? (
                  <aside className="playground-ad-column playground-ad-column--right" aria-hidden={!adPreviewEnabled} style={adPreviewEnabled ? undefined : { visibility: "hidden" }}>
                    {desktopAdColumns.right.map((slot) => (
                      <AdPreviewCard
                        key={slot.id}
                        slot={slot}
                        locale={locale}
                        className="playground-ad-column__card"
                      />
                    ))}
                  </aside>
                ) : null}
              </div>
            )
          ) : (
            <p className="launch-unsupported">{t("unsupported")}</p>
          )}
        </section>

      </div>

      {showExternalMobileSystemBottomAd ? (
        <div className="launch-system-bottom-ad-wrap">
          <AdPreviewCard
            slot={MOBILE_APP_BOTTOM_AD_SLOT}
            locale={locale}
            className={[
              "launch-system-bottom-ad",
              useCompactPortraitBottomAd ? "launch-system-bottom-ad--compact-knowledge" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        </div>
      ) : null}
    </div>
  );
}

export default GameLaunchModal;
