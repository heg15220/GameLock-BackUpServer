import React, { Suspense, useEffect, useState } from "react";
import { useTranslations, getLocalizedGame } from "../i18n";
import { getGameComponent, CONTROL_HINTS_BY_LOCALE } from "../games/registry.jsx";
import { MOBILE_SHELL_CATEGORIES } from "../utils/mobileShellProfile";
import useMobileGameViewport from "../mobile/useMobileGameViewport";
import MobileGameShell from "../mobile/MobileGameShell";
import { getResponsiveMobileShellMode } from "../mobile/mobileGameProfiles";

const NATIVE_MOBILE_GAME_IDS = new Set([
  "knowledge-domino-chain",
  "knowledge-crucigrama-mini",
  "knowledge-sopa-letras-mega",
  "knowledge-tabla-periodica-total",
  "knowledge-mapas-atlas",
  "knowledge-mapas-camino-corto",
  "knowledge-cronologia-maestra",
  "knowledge-wikipedia-gacha",
  "strategy-sudoku-tecnicas",
  "strategy-mansion-triple-enigma",
]);

function GameLaunchModal({ game, onClose }) {
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
  const useMobileGameShell =
    mobileShellEligible &&
    viewport.isMobile &&
    !NATIVE_MOBILE_GAME_IDS.has(String(game.id ?? ""));
  const viewportFormFactor = viewport.formFactor ?? "desktop";
  const launchPlaygroundClassName = [
    "game-playground",
    "launch-game-playground",
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
    useMobileGameShell ? `launch-overlay--device-${viewportFormFactor}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const launchGameAreaClassName = [
    "launch-game-area",
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
          {ActiveGame ? (
            useMobileGameShell ? (
              <MobileGameShell
                game={game}
                viewport={viewport}
                locale={locale}
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
                className={launchPlaygroundClassName}
                data-category={String(game.category ?? "").toLowerCase()}
                data-game-id={game.id}
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
            )
          ) : (
            <p className="launch-unsupported">{t("unsupported")}</p>
          )}
        </section>

      </div>
    </div>
  );
}

export default GameLaunchModal;
