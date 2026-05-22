import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdPreviewCard from "./components/AdPreviewCard";
import CookieConsentManager from "./components/CookieConsentManager";
import { useConsent } from "./components/ConsentContext";
import GameGrid from "./components/GameGrid";
import GameLaunchModal from "./components/GameLaunchModal";
import RouteAnalyticsTracker from "./components/RouteAnalyticsTracker";
import SeoGameIndex from "./components/SeoGameIndex";
import SeoManager from "./components/SeoManager";
import { AD_PREVIEW_STORAGE_KEY, DESKTOP_AD_SLOTS, isAdPreviewEnabledByCode } from "./config/adPreview";
import { games } from "./data/games";
import { useTranslations, localizeCategory } from "./i18n";
import gameLockLogo from "./assets/brand/gamelock-logo.png";
import {
  buildLocalizedCategoryPath,
  buildLocalizedGamePath,
  buildLocalizedPath,
  getCategoryKeyFromSlug,
  parseLocalizedPath,
} from "./seo/seoRoutes";

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

function App() {
  const location = useLocation();
  const route = useMemo(() => parseLocalizedPath(location.pathname), [location.pathname]);
  const locale = route.locale;
  const { t } = useTranslations(locale);
  const {
    advertising,
    openSettings: openCookieSettings,
  } = useConsent();
  const navigate = useNavigate();
  const matchedGameId = route.section === "games" ? route.id : null;
  const routeCategoryKey =
    route.section === "categories" && route.id ? getCategoryKeyFromSlug(route.id) : null;
  const launchedGameId = matchedGameId && games.some((g) => g.id === matchedGameId)
    ? matchedGameId
    : null;

  const [activeCategory, setActiveCategory] = useState(ALL_KEY);
  const [currentPage, setCurrentPage] = useState(1);
  const catalogTopRef = useRef(null);
  const adPreviewEnabled = isAdPreviewEnabledByCode() && Boolean(advertising);

  useEffect(() => {
    if (route.hasLocalePrefix) return;
    const localizedPath = buildLocalizedPath(locale, location.pathname);
    navigate(`${localizedPath}${location.search}${location.hash}`, { replace: true });
  }, [locale, location.hash, location.pathname, location.search, navigate, route.hasLocalePrefix]);

  // Legacy hash links (e.g. /#game=arcade-pinball-wizard) get migrated once on
  // mount so existing bookmarks keep working under BrowserRouter.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const legacyGameId = params.get("game");
    if (legacyGameId && games.some((g) => g.id === legacyGameId)) {
      navigate(buildLocalizedGamePath(locale, legacyGameId), { replace: true });
    } else {
      const url = new URL(window.location.href);
      url.hash = "";
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    }
  }, [locale, navigate]);

  const categoryKeys = useMemo(() => {
    const uniqueKeys = [...new Set(games.map((g) => g.category))];
    const orderedKeys = CATEGORY_ORDER.filter((key) => uniqueKeys.includes(key));
    const remainingKeys = uniqueKeys.filter((key) => !CATEGORY_ORDER.includes(key));
    return [...orderedKeys, ...remainingKeys];
  }, []);

  const filteredGames = useMemo(() => {
    if (routeCategoryKey) {
      return games.filter((g) => g.category === routeCategoryKey);
    }
    if (activeCategory === ALL_KEY) {
      return games;
    }
    return games.filter((g) => g.category === activeCategory);
  }, [activeCategory, routeCategoryKey]);

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
    if (!games.some((g) => g.id === gameId)) return;
    navigate(buildLocalizedGamePath(locale, gameId));
  };

  const closeModal = () => {
    navigate(buildLocalizedPath(locale, "/"), { replace: true });
  };

  const scrollCatalogToTop = () => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      const mobileViewport = window.matchMedia?.("(max-width: 767px)")?.matches;
      catalogTopRef.current?.scrollIntoView({
        block: "start",
        behavior: reducedMotion || mobileViewport ? "auto" : "smooth",
      });
    });
  };

  const changeCatalogPage = (direction) => {
    const nextPage = Math.min(totalPages, Math.max(1, currentPage + direction));
    if (nextPage === currentPage) return;
    setCurrentPage(nextPage);
    scrollCatalogToTop();
  };

  const selectCategory = (key) => {
    setActiveCategory(key);
    setCurrentPage(1);
    navigate(key === ALL_KEY ? buildLocalizedPath(locale, "/") : buildLocalizedCategoryPath(locale, key));
  };

  useEffect(() => {
    setCurrentPage(1);
    if (routeCategoryKey) {
      setActiveCategory(routeCategoryKey);
    } else if (route.section !== "games") {
      setActiveCategory(ALL_KEY);
    }
  }, [route.section, routeCategoryKey]);

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
        navigate(buildLocalizedGamePath(locale, id));
      }
    };
    const closeHandler = () => navigate(buildLocalizedPath(locale, "/"), { replace: true });
    window.addEventListener("bench:open-game", openHandler);
    window.addEventListener("bench:close-game", closeHandler);
    return () => {
      window.removeEventListener("bench:open-game", openHandler);
      window.removeEventListener("bench:close-game", closeHandler);
    };
  }, [locale, navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(AD_PREVIEW_STORAGE_KEY, String(adPreviewEnabled));
    window.dispatchEvent(new StorageEvent("storage", {
      key: AD_PREVIEW_STORAGE_KEY,
      newValue: String(adPreviewEnabled),
    }));
  }, [adPreviewEnabled]);

  const effectiveCategory = routeCategoryKey ?? activeCategory;
  const showSportsCatalogSubliminal = SPORTS_CATEGORY_KEYS.has(effectiveCategory);

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
            <div className="brand-logo-frame">
              <img className="brand-logo" src={gameLockLogo} alt="GameLock" />
            </div>
            {!launchedGame ? (
              <h1 className="hero-title-text">
                {routeCategoryKey
                  ? locale === "en"
                    ? `${localizeCategory(routeCategoryKey, locale)} browser games`
                    : `Juegos de ${localizeCategory(routeCategoryKey, locale).toLowerCase()} online gratis`
                  : locale === "en"
                    ? "GameLock - free instant browser games"
                    : "GameLock - juegos online gratis e instantaneos"}
              </h1>
            ) : null}
            <p className="hero-tagline">{t("heroTagline")}</p>
          </header>

          <section className="catalog-toolbar" ref={catalogTopRef}>
            <h2>{t("exploreTitle")}</h2>
            <div className="filter-group">
              <a
                key={ALL_KEY}
                href={buildLocalizedPath(locale, "/")}
                className={effectiveCategory === ALL_KEY ? "active" : ""}
                onClick={(event) => {
                  event.preventDefault();
                  selectCategory(ALL_KEY);
                }}
              >
                {t("allCategories")}
              </a>

              {categoryKeys.map((key) => (
                <a
                  key={key}
                  href={buildLocalizedCategoryPath(locale, key)}
                  className={effectiveCategory === key ? "active" : ""}
                  onClick={(event) => {
                    event.preventDefault();
                    selectCategory(key);
                  }}
                >
                  {localizeCategory(key, locale)}
                </a>
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
                    onClick={() => changeCatalogPage(-1)}
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
                    onClick={() => changeCatalogPage(1)}
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

            <SeoGameIndex games={games} locale={locale} onLaunchGame={launchGame} />
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

      {launchedGame && (
        <GameLaunchModal
          game={launchedGame}
          onClose={closeModal}
          adPreviewEnabled={adPreviewEnabled}
          locale={locale}
        />
      )}
      <CookieConsentManager locale={locale} />
      <SeoManager games={games} activeGame={launchedGame} activeCategory={routeCategoryKey} locale={locale} />
      <RouteAnalyticsTracker />
    </>
  );
}

export default App;
