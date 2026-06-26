export const COOKIE_CONSENT_STORAGE_KEY = "playforge.cookieConsent.v1";
export const COOKIE_CONSENT_COOKIE_NAME = "playforge_cookie_consent";
export const COOKIE_CONSENT_EVENT = "playforge:cookie-consent-change";
export const COOKIE_SETTINGS_EVENT = "playforge:open-cookie-settings";
export const COOKIE_CONSENT_VERSION = 1;

const CONSENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
const CONSENT_MAX_AGE_MS = CONSENT_COOKIE_MAX_AGE_SECONDS * 1000;
const GA_COOKIE_PREFIXES = ["_ga", "_gid", "_gat", "_gac_", "_gcl_"];

export const COOKIE_CATEGORIES = [
  { id: "necessary", required: true },
  { id: "preferences", required: false },
  { id: "analytics", required: false },
  { id: "advertising", required: false },
  { id: "affiliate", required: false },
];

export const DEFAULT_COOKIE_PREFERENCES = COOKIE_CATEGORIES.reduce((acc, category) => {
  acc[category.id] = category.required;
  return acc;
}, {});

export const ACCEPT_ALL_COOKIE_PREFERENCES = COOKIE_CATEGORIES.reduce((acc, category) => {
  acc[category.id] = true;
  return acc;
}, {});

export function normalizeCookiePreferences(preferences = {}) {
  return COOKIE_CATEGORIES.reduce((acc, category) => {
    acc[category.id] = category.required ? true : Boolean(preferences[category.id]);
    return acc;
  }, {});
}

export function createCookieConsent(preferences = DEFAULT_COOKIE_PREFERENCES) {
  return {
    version: COOKIE_CONSENT_VERSION,
    decided: true,
    updatedAt: new Date().toISOString(),
    preferences: normalizeCookiePreferences(preferences),
  };
}

function readConsentCookie() {
  if (typeof document === "undefined") return null;
  const prefix = `${COOKIE_CONSENT_COOKIE_NAME}=`;
  const entry = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!entry) return null;

  try {
    return JSON.parse(decodeURIComponent(entry.slice(prefix.length)));
  } catch {
    return null;
  }
}

function writeConsentCookie(consent) {
  if (typeof document === "undefined") return;

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const value = encodeURIComponent(JSON.stringify({
    v: consent.version,
    d: true,
    t: consent.updatedAt,
    p: consent.preferences,
  }));

  document.cookie = [
    `${COOKIE_CONSENT_COOKIE_NAME}=${value}`,
    "Path=/",
    `Max-Age=${CONSENT_COOKIE_MAX_AGE_SECONDS}`,
    "SameSite=Lax",
    secure,
  ].join("; ");
}

function normalizeStoredConsent(rawConsent) {
  if (!rawConsent || typeof rawConsent !== "object") return null;
  const version = Number(rawConsent.version ?? rawConsent.v);
  if (version !== COOKIE_CONSENT_VERSION) return null;
  const updatedAt = String(rawConsent.updatedAt ?? rawConsent.t ?? "");
  const updatedAtMs = Date.parse(updatedAt);
  if (!Number.isFinite(updatedAtMs) || Date.now() - updatedAtMs > CONSENT_MAX_AGE_MS) {
    return null;
  }

  return {
    version: COOKIE_CONSENT_VERSION,
    decided: true,
    updatedAt,
    preferences: normalizeCookiePreferences(rawConsent.preferences ?? rawConsent.p),
  };
}

export function readCookieConsent() {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    const parsed = stored ? normalizeStoredConsent(JSON.parse(stored)) : null;
    if (parsed) return parsed;
    if (stored) window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch {
    // Ignore blocked storage and fall back to the consent cookie.
  }

  return normalizeStoredConsent(readConsentCookie());
}

export function applyGoogleConsentMode(consent) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  const preferences = normalizeCookiePreferences(consent?.preferences);
  const granted = (enabled) => (enabled ? "granted" : "denied");

  window.gtag("consent", "update", {
    ad_storage: granted(preferences.advertising),
    ad_user_data: granted(preferences.advertising),
    ad_personalization: granted(preferences.advertising),
    analytics_storage: granted(preferences.analytics),
    functionality_storage: granted(preferences.preferences),
    personalization_storage: granted(preferences.preferences),
    security_storage: "granted",
  });
}

export function saveCookieConsent(preferences) {
  if (typeof window === "undefined") return createCookieConsent(preferences);

  const consent = createCookieConsent(preferences);

  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // The consent cookie still lets this browser remember the choice.
  }

  writeConsentCookie(consent);
  applyGoogleConsentMode(consent);
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: consent }));
  return consent;
}

export function hasCookieConsent(categoryId) {
  const consent = readCookieConsent();
  return Boolean(consent?.preferences?.[categoryId]);
}

function expireCookie(name, domain) {
  if (typeof document === "undefined") return;
  const domainPart = domain ? `; Domain=${domain}` : "";
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${domainPart}`;
}

export function clearGoogleAnalyticsCookies() {
  if (typeof document === "undefined") return;
  const hostname = window.location.hostname;
  const parentDomain = hostname.includes(".")
    ? `.${hostname.split(".").slice(-2).join(".")}`
    : null;

  document.cookie
    .split(";")
    .map((part) => part.trim().split("=")[0])
    .filter((name) => GA_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix)))
    .forEach((name) => {
      expireCookie(name);
      if (parentDomain) expireCookie(name, parentDomain);
    });
}
