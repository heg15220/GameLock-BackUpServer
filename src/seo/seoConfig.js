export const SITE_NAME = "GameLock";

export const DEFAULT_LOCALE = "en";

export const SUPPORTED_LOCALES = ["en", "es"];

export const SITE_COPY = {
  es: {
    homeTitle: "Juegos online gratis e instantaneos | GameLock",
    homeDescription:
      "Juega online gratis en GameLock: arcade, puzzles, estrategia, deportes, carreras, accion, RPG y juegos de conocimiento sin registro.",
    playAction: "Jugar ahora",
  },
  en: {
    homeTitle: "Free instant browser games | GameLock",
    homeDescription:
      "Play free browser games on GameLock: arcade, puzzles, strategy, sports, racing, action, RPG and knowledge games with no sign-up.",
    playAction: "Play now",
  },
};

export function getConfiguredSiteUrl() {
  return String(import.meta.env.VITE_SITE_URL || "").trim().replace(/\/+$/, "");
}

export function getRuntimeOrigin() {
  const configuredUrl = getConfiguredSiteUrl();
  if (configuredUrl) return configuredUrl;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

export function buildAbsoluteUrl(pathname = "/") {
  const origin = getRuntimeOrigin();
  const cleanPath = String(pathname || "/").startsWith("/")
    ? String(pathname || "/")
    : `/${pathname}`;
  return origin ? `${origin}${cleanPath}` : cleanPath;
}

export function normalizeLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}
