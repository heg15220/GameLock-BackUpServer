import React, { useEffect, useMemo, useState } from "react";
import AdPreviewCard from "./components/AdPreviewCard";
import CookieConsentManager from "./components/CookieConsentManager";
import { useConsent } from "./components/ConsentContext";
import GameGrid from "./components/GameGrid";
import GameLaunchModal from "./components/GameLaunchModal";
import { AD_PREVIEW_STORAGE_KEY, DESKTOP_AD_SLOTS, isAdPreviewEnabledByCode } from "./config/adPreview";
import { games } from "./data/games";
import { useTranslations, localizeCategory } from "./i18n";
import gameLockLogo from "./assets/brand/gamelock-logo.png";

const ALL_KEY = "__all__";
const PAGE_SIZE = 16;
const CATEGORY_ORDER = [
  "Aventura",
  "Accion",
  "Arcade",
  "Juegos",
  "Deportes",
  "Carreras",
  "Conocimiento",
  "Estrategia",
  "RPG",
];
const SPORTS_CATEGORY_KEYS = new Set(["Deportes", "Sports"]);

const getInitialGameIdFromHash = () => {
  const hash = window.location.hash.replace(/^#/, "");
  const params = new URLSearchParams(hash);
  const gameId = params.get("game");
  return games.some((g) => g.id === gameId) ? gameId : null;
};

function App() {
  const { t, locale } = useTranslations();
  const {
    advertising,
    openSettings: openCookieSettings,
  } = useConsent();

  const [activeCategory, setActiveCategory] = useState(ALL_KEY);
  const [currentPage, setCurrentPage] = useState(1);
  const [launchedGameId, setLaunchedGameId] = useState(getInitialGameIdFromHash);
  const adPreviewEnabled = isAdPreviewEnabledByCode() && Boolean(advertising);

  const categoryKeys = useMemo(() => {
    const uniqueKeys = [...new Set(games.map((g) => g.category))];
    const orderedKeys = CATEGORY_ORDER.filter((key) => uniqueKeys.includes(key));
    const remainingKeys = uniqueKeys.filter((key) => !CATEGORY_ORDER.includes(key));
    return [...orderedKeys, ...remainingKeys];
  }, []);

  const filteredGames = useMemo(() => {
    if (activeCategory === ALL_KEY) {
      return games;
    }
    return games.filter((g) => g.category === activeCategory);
  }, [activeCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredGames.length / PAGE_SIZE));

  const paginatedGames = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredGames.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredGames]);

  const launchedGame = useMemo(
    () => games.find((g) => g.id === launchedGameId) ?? null,
    [launchedGameId]
  );

  const desktopAdColumns = useMemo(
    () => ({
      left: DESKTOP_AD_SLOTS.filter((slot) => slot.side === "left"),
      right: DESKTOP_AD_SLOTS.filter((slot) => slot.side === "right"),
    }),
    []
  );

  const launchGame = (gameId) => {
    setLaunchedGameId(gameId);
    window.history.replaceState(null, "", `#game=${encodeURIComponent(gameId)}`);
  };

  const closeModal = () => {
    setLaunchedGameId(null);
    window.history.replaceState(null, "", " ");
  };

  const selectCategory = (key) => {
    setActiveCategory(key);
    setCurrentPage(1);
  };

  const pageStart = filteredGames.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, filteredGames.length);
  const paginationSummary =
    locale === "en"
      ? `Showing ${pageStart}-${pageEnd} of ${filteredGames.length}`
      : `Mostrando ${pageStart}-${pageEnd} de ${filteredGames.length}`;
  const pageIndicator =
    locale === "en"
      ? `Page ${currentPage} of ${totalPages}`
      : `Página ${currentPage} de ${totalPages}`;

  useEffect(() => {
    if (!import.meta.env.VITE_BENCH) return;
    if (typeof window === "undefined") return;
    window.__benchGames = games.map((g) => ({ id: g.id, category: g.category }));
    const openHandler = (e) => {
      const id = e?.detail;
      if (typeof id !== "string") return;
      if (games.some((g) => g.id === id)) {
        setLaunchedGameId(id);
      }
    };
    const closeHandler = () => setLaunchedGameId(null);
    window.addEventListener("bench:open-game", openHandler);
    window.addEventListener("bench:close-game", closeHandler);
    return () => {
      window.removeEventListener("bench:open-game", openHandler);
      window.removeEventListener("bench:close-game", closeHandler);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(AD_PREVIEW_STORAGE_KEY, String(adPreviewEnabled));
    window.dispatchEvent(new StorageEvent("storage", {
      key: AD_PREVIEW_STORAGE_KEY,
      newValue: String(adPreviewEnabled),
    }));
  }, [adPreviewEnabled]);

  const showSportsCatalogSubliminal = SPORTS_CATEGORY_KEYS.has(activeCategory);

  return (
    <>
      <div className="app-desktop-layout">
        <aside className="app-desktop-ads app-desktop-ads--left" aria-hidden={!adPreviewEnabled} style={adPreviewEnabled ? undefined : { visibility: "hidden" }}>
          {desktopAdColumns.left.map((slot) => (
            <AdPreviewCard
              key={slot.id}
              slot={slot}
              locale={locale}
              className="app-desktop-ads__card"
            />
          ))}
        </aside>

        <div className="app-shell">
          <div className="background-orb orb-a" aria-hidden="true" />
          <div className="background-orb orb-b" aria-hidden="true" />

          <header className="hero">
            <img className="brand-logo" src={gameLockLogo} alt="GameLock" />
            <p className="hero-tagline">{t("heroTagline")}</p>
          </header>

          <section className="catalog-toolbar">
            <h2>{t("exploreTitle")}</h2>
            <div className="filter-group">
              <button
                key={ALL_KEY}
                type="button"
                className={activeCategory === ALL_KEY ? "active" : ""}
                onClick={() => selectCategory(ALL_KEY)}
              >
                {t("allCategories")}
              </button>

              {categoryKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={activeCategory === key ? "active" : ""}
                  onClick={() => selectCategory(key)}
                >
                  {localizeCategory(key, locale)}
                </button>
              ))}
            </div>
          </section>

          <main>
            <GameGrid
              games={paginatedGames}
              onLaunchGame={launchGame}
              locale={locale}
              showSportsInterstitial={showSportsCatalogSubliminal}
            />

            {filteredGames.length > PAGE_SIZE && (
              <nav className="catalog-pagination" aria-label={pageIndicator}>
                <p className="catalog-pagination-summary">{paginationSummary}</p>
                <div className="catalog-pagination-controls">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    aria-label={locale === "en" ? "Previous page" : "Página anterior"}
                  >
                    <span aria-hidden="true">←</span>
                    <span className="catalog-pagination-btn-label">
                      {locale === "en" ? "Previous" : "Anterior"}
                    </span>
                  </button>
                  <span className="catalog-pagination-indicator">{pageIndicator}</span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    aria-label={locale === "en" ? "Next page" : "Página siguiente"}
                  >
                    <span className="catalog-pagination-btn-label">
                      {locale === "en" ? "Next" : "Siguiente"}
                    </span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
                <div className="catalog-pagination-progress" aria-hidden="true">
                  <span
                    className="catalog-pagination-progress-fill"
                    style={{ width: `${(currentPage / totalPages) * 100}%` }}
                  />
                </div>
              </nav>
            )}
          </main>

          <footer className="site-footer">
            <div className="site-footer-actions">
              <button type="button" className="site-footer-link" onClick={openCookieSettings}>
                {locale === "en" ? "Cookie settings" : "Configuración de cookies"}
              </button>
              <button type="button" className="site-footer-link" onClick={() => {}}>
                {locale === "en" ? "Legal policies" : "Políticas legales"}
              </button>
            </div>
            <p className="site-footer-contact">
              <span className="site-footer-contact-label">
                {locale === "en" ? "Contact email:" : "Correo de contacto:"}
              </span>{" "}
              <span className="site-footer-contact-email">
                {locale === "en" ? "email address" : "dirección correo electrónico"}
              </span>
            </p>
            <p className="site-footer-copyright">
              © {new Date().getFullYear()} GameLock —{" "}
              {locale === "en" ? "All rights reserved" : "Todos los derechos reservados"}
            </p>
          </footer>
        </div>

        <aside className="app-desktop-ads app-desktop-ads--right" aria-hidden={!adPreviewEnabled} style={adPreviewEnabled ? undefined : { visibility: "hidden" }}>
          {desktopAdColumns.right.map((slot) => (
            <AdPreviewCard
              key={slot.id}
              slot={slot}
              locale={locale}
              className="app-desktop-ads__card"
            />
          ))}
        </aside>
      </div>

      {launchedGame && <GameLaunchModal game={launchedGame} onClose={closeModal} adPreviewEnabled={adPreviewEnabled} />}
      <CookieConsentManager locale={locale} />
    </>
  );
}

export default App;
