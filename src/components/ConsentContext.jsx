import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  ACCEPT_ALL_COOKIE_PREFERENCES,
  COOKIE_CONSENT_EVENT,
  COOKIE_SETTINGS_EVENT,
  DEFAULT_COOKIE_PREFERENCES,
  applyGoogleConsentMode,
  clearGoogleAnalyticsCookies,
  hasCookieConsent,
  normalizeCookiePreferences,
  readCookieConsent,
  saveCookieConsent,
} from "../utils/cookieConsent";
import { insertRawScriptOnce, loadScriptOnce, unloadAllByPrefix } from "../utils/ScriptManager";

const ConsentContext = createContext(null);

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const GTM_CONTAINER_ID = import.meta.env.VITE_GTM_CONTAINER_ID;

function loadAnalyticsScripts() {
  if (!GA_MEASUREMENT_ID) return;

  loadScriptOnce(
    "analytics:gtag",
    `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`
  );
  insertRawScriptOnce("analytics:init", `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = window.gtag || gtag;
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      functionality_storage: 'denied',
      personalization_storage: 'denied',
      security_storage: 'granted'
    });
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}', { anonymize_ip: true });
  `);
}

function loadAdvertisingScripts() {
  if (!GTM_CONTAINER_ID) return;

  loadScriptOnce(
    "ads:gtm",
    `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_CONTAINER_ID)}`
  );
}

function syncThirdPartyScripts(preferences) {
  if (preferences.analytics) {
    loadAnalyticsScripts();
  } else {
    unloadAllByPrefix("analytics:");
    clearGoogleAnalyticsCookies();
  }

  if (preferences.advertising) {
    loadAdvertisingScripts();
  } else {
    unloadAllByPrefix("ads:");
  }

  applyGoogleConsentMode({ preferences });
}

export function ConsentProvider({ children }) {
  const [loaded, setLoaded] = useState(false);
  const [consent, setConsent] = useState(null);
  const [preferences, setPreferences] = useState(DEFAULT_COOKIE_PREFERENCES);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    const storedConsent = readCookieConsent();

    if (storedConsent) {
      setConsent(storedConsent);
      setPreferences(storedConsent.preferences);
      applyGoogleConsentMode(storedConsent);
      syncThirdPartyScripts(storedConsent.preferences);
      setBannerOpen(false);
    } else {
      setPreferences(DEFAULT_COOKIE_PREFERENCES);
      setBannerOpen(true);
    }

    setLoaded(true);

    const onConsentChange = (event) => {
      if (!event.detail) return;
      setConsent(event.detail);
      setPreferences(event.detail.preferences);
      syncThirdPartyScripts(event.detail.preferences);
    };

    const onOpenSettings = () => openSettings();

    window.PlayforgeCookieConsent = {
      get: readCookieConsent,
      has: hasCookieConsent,
      openSettings,
      save: persist,
    };

    window.addEventListener(COOKIE_CONSENT_EVENT, onConsentChange);
    window.addEventListener(COOKIE_SETTINGS_EVENT, onOpenSettings);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, onConsentChange);
      window.removeEventListener(COOKIE_SETTINGS_EVENT, onOpenSettings);
    };
  }, []);

  const persist = (nextPreferences) => {
    const nextConsent = saveCookieConsent(nextPreferences);
    setConsent(nextConsent);
    setPreferences(nextConsent.preferences);
    syncThirdPartyScripts(nextConsent.preferences);
    return nextConsent;
  };

  const acceptAll = () => {
    persist(ACCEPT_ALL_COOKIE_PREFERENCES);
    setBannerOpen(false);
    setConfigOpen(false);
  };

  const rejectAll = () => {
    persist(DEFAULT_COOKIE_PREFERENCES);
    setBannerOpen(false);
    setConfigOpen(false);
  };

  const openSettings = () => {
    const currentConsent = readCookieConsent();
    if (!currentConsent) {
      setConsent(null);
      setPreferences(DEFAULT_COOKIE_PREFERENCES);
      setBannerOpen(true);
      setConfigOpen(false);
      return;
    }

    setPreferences(currentConsent.preferences);
    setBannerOpen(true);
    setConfigOpen(true);
  };

  const save = (nextPreferences) => {
    const nextConsent = persist(normalizeCookiePreferences(nextPreferences));
    setBannerOpen(false);
    setConfigOpen(false);
    return nextConsent;
  };

  const value = useMemo(
    () => ({
      loaded,
      consent,
      preferences,
      necessary: true,
      preferencesAllowed: preferences.preferences,
      analytics: preferences.analytics,
      advertising: preferences.advertising,
      affiliate: preferences.affiliate,
      bannerOpen,
      setBannerOpen,
      configOpen,
      setConfigOpen,
      openSettings,
      acceptAll,
      rejectAll,
      save,
      hasConsent: hasCookieConsent,
    }),
    [loaded, consent, preferences, bannerOpen, configOpen]
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent() {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error("useConsent must be used within <ConsentProvider />");
  }
  return context;
}

export function useOptionalConsent() {
  return useContext(ConsentContext);
}
