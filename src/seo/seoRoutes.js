import { DEFAULT_LOCALE, SUPPORTED_LOCALES, normalizeLocale } from "./seoConfig";
import resolveBrowserLanguage from "../utils/resolveBrowserLanguage";

export const CATEGORY_SLUGS = {
  Accion: { en: "action", es: "accion" },
  Arcade: { en: "arcade", es: "arcade" },
  Aventura: { en: "adventure", es: "aventura" },
  Carreras: { en: "racing", es: "carreras" },
  Conocimiento: { en: "knowledge", es: "conocimiento" },
  Deportes: { en: "sports", es: "deportes" },
  Estrategia: { en: "strategy", es: "estrategia" },
  Juegos: { en: "games", es: "juegos" },
  RPG: { en: "rpg", es: "rpg" },
};

export function getLocalePrefix(locale) {
  return `/${normalizeLocale(locale)}`;
}

export function buildLocalizedPath(locale, pathname = "/") {
  const prefix = getLocalePrefix(locale);
  const cleanPath = String(pathname || "/").startsWith("/")
    ? String(pathname || "/")
    : `/${pathname}`;
  return cleanPath === "/" ? `${prefix}/` : `${prefix}${cleanPath}`;
}

export function buildLocalizedGamePath(locale, gameId) {
  return buildLocalizedPath(locale, `/games/${encodeURIComponent(gameId)}`);
}

export function getCategorySlug(categoryKey, locale) {
  return CATEGORY_SLUGS[categoryKey]?.[normalizeLocale(locale)] ?? encodeURIComponent(String(categoryKey).toLowerCase());
}

export function getCategoryKeyFromSlug(slug) {
  const cleanSlug = String(slug || "").toLowerCase();
  return Object.entries(CATEGORY_SLUGS).find(([, localizedSlugs]) =>
    Object.values(localizedSlugs).includes(cleanSlug)
  )?.[0] ?? null;
}

export function buildLocalizedCategoryPath(locale, categoryKey) {
  return buildLocalizedPath(locale, `/categories/${getCategorySlug(categoryKey, locale)}`);
}

export function parseLocalizedPath(pathname) {
  const segments = String(pathname || "/").split("/").filter(Boolean);
  const maybeLocale = segments[0];
  const hasLocalePrefix = SUPPORTED_LOCALES.includes(maybeLocale);
  const locale = hasLocalePrefix ? maybeLocale : resolveBrowserLanguage();
  const routeSegments = hasLocalePrefix ? segments.slice(1) : segments;

  return {
    locale,
    hasLocalePrefix,
    section: routeSegments[0] ?? "",
    id: routeSegments[1] ? decodeURIComponent(routeSegments[1]) : null,
  };
}

export function buildAlternatePaths(canonicalPath) {
  const parsed = parseLocalizedPath(canonicalPath);
  let basePath = "/";

  if (parsed.section === "games" && parsed.id) {
    basePath = `/games/${encodeURIComponent(parsed.id)}`;
  } else if (parsed.section === "categories" && parsed.id) {
    const categoryKey = getCategoryKeyFromSlug(parsed.id);
    return {
      en: categoryKey ? buildLocalizedCategoryPath("en", categoryKey) : buildLocalizedPath("en", canonicalPath),
      es: categoryKey ? buildLocalizedCategoryPath("es", categoryKey) : buildLocalizedPath("es", canonicalPath),
      "x-default": categoryKey ? buildLocalizedCategoryPath(DEFAULT_LOCALE, categoryKey) : buildLocalizedPath(DEFAULT_LOCALE, canonicalPath),
    };
  }

  return {
    en: buildLocalizedPath("en", basePath),
    es: buildLocalizedPath("es", basePath),
    "x-default": buildLocalizedPath(DEFAULT_LOCALE, basePath),
  };
}
