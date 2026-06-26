import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ACCEPT_ALL_COOKIE_PREFERENCES,
  COOKIE_CATEGORIES,
  normalizeCookiePreferences,
} from "../utils/cookieConsent";
import { useConsent } from "./ConsentContext";

const CATEGORY_COPY = {
  es: {
    necessary: {
      title: "Necesarias",
      description:
        "Imprescindibles para que el sitio funcione, recordar este aviso y conservar partidas o preferencias locales del navegador.",
      label: "Tecnicas / funcionales",
      requiredLabel: "Siempre activas",
    },
    preferences: {
      title: "Preferencias",
      description:
        "Guardan opciones elegidas por ti, como idioma, experiencia o ajustes de visualizacion.",
      label: "Permitir preferencias",
    },
    analytics: {
      title: "Analitica",
      description:
        "Nos ayudara a medir uso, rendimiento y errores de forma agregada para mejorar la plataforma.",
      label: "Permitir analitica",
    },
    advertising: {
      title: "Publicidad",
      description:
        "Permitira mostrar y medir anuncios contextuales o personalizados cuando se active una solucion valida.",
      label: "Permitir publicidad",
    },
    affiliate: {
      title: "Afiliacion",
      description:
        "Permitira enlaces o mediciones de programas de afiliacion, como Amazon Afiliados, si se implementan.",
      label: "Permitir afiliacion",
    },
  },
  en: {
    necessary: {
      title: "Necessary",
      description:
        "Essential for the site to work, remember this notice and keep local browser saves or preferences.",
      label: "Technical / functional",
      requiredLabel: "Always active",
    },
    preferences: {
      title: "Preferences",
      description:
        "Store choices you make, such as language, experience or display settings.",
      label: "Allow preferences",
    },
    analytics: {
      title: "Analytics",
      description:
        "Will help us measure usage, performance and errors in aggregate form to improve the platform.",
      label: "Allow analytics",
    },
    advertising: {
      title: "Advertising",
      description:
        "Will allow showing and measuring contextual or personalized ads when a valid solution is enabled.",
      label: "Allow advertising",
    },
    affiliate: {
      title: "Affiliate",
      description:
        "Will allow affiliate links or measurement, such as Amazon Associates, if implemented.",
      label: "Allow affiliate",
    },
  },
};

const UI_COPY = {
  es: {
    label: "Privacidad y cookies",
    title: "Aviso de privacidad",
    intro:
      "GameLock usa cookies tecnicas y almacenamiento local para prestar los juegos, recordar tu consentimiento, conservar preferencias y guardar partidas o records en este navegador.",
    details:
      "Puedes aceptar todas las cookies ahora o configurar cada categoria. Las cookies no necesarias, como analitica, publicidad o afiliacion, no se activaran hasta que exista consentimiento.",
    acceptAll: "Aceptar y continuar",
    configure: "Configurar ajustes",
    settingsTitle: "Preferencias de cookies",
    settingsIntro:
      "Activa o desactiva cada tipo de cookie. Las necesarias no se pueden desactivar porque guardan el consentimiento y funciones basicas.",
    acceptSettings: "Aceptar ajustes",
    rejectAll: "Rechazar",
    purposesSummary: "Ver finalidades y caracteristicas",
    purposesTitle: "Finalidades de uso",
    purposesList: [
      "Almacenar y/o acceder a informacion en el dispositivo para prestar funciones tecnicas, recordar el consentimiento y conservar partidas o ajustes locales.",
      "Recordar preferencias elegidas por el usuario, como idioma o ajustes de visualizacion, si se habilitan.",
      "Medir uso, rendimiento y errores de forma anonima o agregada para mejorar la plataforma, si se acepta analitica.",
      "Mostrar y medir publicidad contextual o personalizada solo si se activa una solucion valida y existe consentimiento suficiente.",
      "Medir enlaces de afiliacion solo si se incorporan programas externos y el usuario acepta esa categoria.",
    ],
    specialTitle: "Funciones tecnicas necesarias",
    specialList: [
      "Permitir la navegacion, la seguridad del sitio y la comunicacion de datos necesaria para prestar el servicio solicitado.",
      "Ofrecer el contenido y los juegos solicitados por el usuario.",
      "Guardar, aplicar y comunicar las preferencias de privacidad del usuario.",
    ],
    featuresTitle: "Caracteristicas del tratamiento",
    featuresList: [
      "Guardar elecciones para futuras visitas desde el mismo navegador.",
      "No crear cuentas de usuario ni perfiles propios de usuario en la plataforma.",
      "Cargar scripts externos solo cuando la categoria correspondiente este aceptada y exista el proveedor configurado.",
    ],
    storageSummary: "Ver cookies y almacenamientos",
    tableHead: ["Nombre", "Dominio", "Finalidad", "Duracion", "Tipo", "Categoria"],
    currentDomain: "Dominio actual",
    futureProvider: "Proveedor externo",
    rows: {
      consentPurpose: "Guardar preferencias de consentimiento.",
      consentDuration: "180 dias",
      consentType: "Tecnica propia",
      localConsentPurpose: "Copia local de preferencias de consentimiento.",
      localConsentType: "Almacenamiento local propio",
      localGamePurpose: "Partidas, records o ajustes locales de juegos.",
      localGameDuration: "Persistente hasta borrado del navegador",
      localGameType: "Funcional propio",
      languagePurpose: "Recordar idioma, experiencia o ajustes de visualizacion si se habilitan.",
      languageDuration: "Persistente hasta borrado del navegador",
      languageType: "Preferencias propias",
      gaPurpose: "Distinguir usuarios y sesiones si se activa Google Analytics.",
      gaDuration: "Hasta 2 anos",
      gaType: "Analitica de terceros",
      adsPurpose: "Publicidad y medicion de anuncios si se activa AdSense/GTM.",
      adsDuration: "Segun proveedor",
      adsType: "Publicidad de terceros",
      affiliatePurpose: "Medicion de enlaces de afiliacion si se activa Amazon Afiliados.",
      affiliateDuration: "Segun proveedor",
      affiliateType: "Afiliacion de terceros",
    },
  },
  en: {
    label: "Privacy and cookies",
    title: "Privacy notice",
    intro:
      "GameLock uses technical cookies and local storage to provide games, remember your consent, keep preferences and save games or scores in this browser.",
    details:
      "You can accept all cookies now or configure each category. Non-essential cookies, such as analytics, advertising or affiliate measurement, will not be enabled until consent exists.",
    acceptAll: "Accept and continue",
    configure: "Configure settings",
    settingsTitle: "Cookie preferences",
    settingsIntro:
      "Turn each cookie type on or off. Necessary cookies cannot be disabled because they store consent and core functions.",
    acceptSettings: "Accept settings",
    rejectAll: "Reject",
    purposesSummary: "View purposes and features",
    purposesTitle: "Use purposes",
    purposesList: [
      "Store and/or access information on the device to provide technical functions, remember consent and keep local game saves or settings.",
      "Remember preferences chosen by the user, such as language or display settings, if enabled.",
      "Measure usage, performance and errors anonymously or in aggregate form to improve the platform, if analytics is accepted.",
      "Show and measure contextual or personalized advertising only if a valid solution is enabled and sufficient consent exists.",
      "Measure affiliate links only if external programs are added and the user accepts that category.",
    ],
    specialTitle: "Required technical functions",
    specialList: [
      "Enable browsing, site security and data communication required to provide the requested service.",
      "Deliver the content and games requested by the user.",
      "Store, apply and communicate the user's privacy preferences.",
    ],
    featuresTitle: "Processing characteristics",
    featuresList: [
      "Save choices for future visits from the same browser.",
      "Do not create user accounts or first-party user profiles on the platform.",
      "Load external scripts only when the related category has been accepted and the provider is configured.",
    ],
    storageSummary: "View cookies and storage",
    tableHead: ["Name", "Domain", "Purpose", "Duration", "Type", "Category"],
    currentDomain: "Current domain",
    futureProvider: "External provider",
    rows: {
      consentPurpose: "Store consent preferences.",
      consentDuration: "180 days",
      consentType: "First-party technical",
      localConsentPurpose: "Local copy of consent preferences.",
      localConsentType: "First-party local storage",
      localGamePurpose: "Game saves, best scores or local game settings.",
      localGameDuration: "Persistent until browser deletion",
      localGameType: "First-party functional",
      languagePurpose: "Remember language, experience or display settings if enabled.",
      languageDuration: "Persistent until browser deletion",
      languageType: "First-party preferences",
      gaPurpose: "Distinguish users and sessions if Google Analytics is enabled.",
      gaDuration: "Up to 2 years",
      gaType: "Third-party analytics",
      adsPurpose: "Advertising and ad measurement if AdSense/GTM is enabled.",
      adsDuration: "Set by provider",
      adsType: "Third-party advertising",
      affiliatePurpose: "Affiliate link measurement if Amazon Associates is enabled.",
      affiliateDuration: "Set by provider",
      affiliateType: "Third-party affiliate",
    },
  },
};

function getCopy(locale) {
  return UI_COPY[locale] ?? UI_COPY.en;
}

function getCategoryCopy(locale, id) {
  return CATEGORY_COPY[locale]?.[id] ?? CATEGORY_COPY.en[id];
}

function CookieSwitch({ category, checked, locale, onChange }) {
  const categoryCopy = getCategoryCopy(locale, category.id);

  return (
    <label className="cookie-consent-switch">
      <input
        type="checkbox"
        checked={checked}
        disabled={category.required}
        onChange={(event) => onChange(category.id, event.target.checked)}
        aria-label={categoryCopy.label}
      />
      <span aria-hidden="true" />
    </label>
  );
}

function StorageTable({ copy }) {
  const rows = [
    ["playforge_cookie_consent", copy.currentDomain, copy.rows.consentPurpose, copy.rows.consentDuration, copy.rows.consentType, "necessary"],
    ["playforge.cookieConsent.v1", copy.currentDomain, copy.rows.localConsentPurpose, copy.rows.consentDuration, copy.rows.localConsentType, "necessary"],
    ["localStorage de juegos", copy.currentDomain, copy.rows.localGamePurpose, copy.rows.localGameDuration, copy.rows.localGameType, "necessary / preferences"],
    ["preferencias locales", copy.currentDomain, copy.rows.languagePurpose, copy.rows.languageDuration, copy.rows.languageType, "preferences"],
    ["_ga, _ga_<id>", "Google Analytics", copy.rows.gaPurpose, copy.rows.gaDuration, copy.rows.gaType, "analytics"],
    ["AdSense / GTM", "Google", copy.rows.adsPurpose, copy.rows.adsDuration, copy.rows.adsType, "advertising"],
    ["Amazon Afiliados", copy.futureProvider, copy.rows.affiliatePurpose, copy.rows.affiliateDuration, copy.rows.affiliateType, "affiliate"],
  ];

  return (
    <div className="cookie-consent-table-wrap">
      <table className="cookie-consent-table">
        <thead>
          <tr>
            {copy.tableHead.map((head) => (
              <th key={head}>{head}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell) => (
                <td key={cell}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CookieConsentManager({ locale = "es" }) {
  const copy = getCopy(locale);
  const {
    bannerOpen,
    configOpen,
    setConfigOpen,
    consent,
    preferences,
    acceptAll,
    rejectAll,
    save,
  } = useConsent();
  const [localPreferences, setLocalPreferences] = useState(ACCEPT_ALL_COOKIE_PREFERENCES);
  const isNewConsentFlow = !consent;

  const openConfigPanel = () => {
    if (isNewConsentFlow) {
      setLocalPreferences(ACCEPT_ALL_COOKIE_PREFERENCES);
    }
    setConfigOpen(true);
  };
  const configRef = useRef(null);

  const normalizedPreferences = useMemo(
    () => normalizeCookiePreferences(localPreferences),
    [localPreferences]
  );

  useEffect(() => {
    if (!bannerOpen) return;
    setLocalPreferences(isNewConsentFlow ? ACCEPT_ALL_COOKIE_PREFERENCES : preferences);
  }, [bannerOpen, isNewConsentFlow, preferences]);

  useEffect(() => {
    if (!bannerOpen || !configOpen) return;
    requestAnimationFrame(() => {
      configRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [bannerOpen, configOpen]);

  const updateCategory = (categoryId, checked) => {
    setLocalPreferences((current) => normalizeCookiePreferences({
      ...current,
      [categoryId]: checked,
    }));
  };

  const saveSettings = () => {
    save(normalizedPreferences);
  };

  if (!bannerOpen) return null;

  return (
    <div className="cookie-consent-layer">
      <section
        className={["cookie-consent-modal", configOpen ? "is-settings" : ""]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-consent-title"
      >
        <p className="cookie-consent-eyebrow">{copy.label}</p>
        <h2 id="cookie-consent-title">{configOpen ? copy.settingsTitle : copy.title}</h2>
        <p>{configOpen ? copy.settingsIntro : copy.intro}</p>
        {!configOpen && <p>{copy.details}</p>}

        <details className="cookie-consent-details">
          <summary>{copy.purposesSummary}</summary>
          <div className="cookie-consent-purposes">
            <h3>{copy.purposesTitle}</h3>
            <ul>{copy.purposesList.map((item) => <li key={item}>{item}</li>)}</ul>
            <h3>{copy.specialTitle}</h3>
            <ul>{copy.specialList.map((item) => <li key={item}>{item}</li>)}</ul>
            <h3>{copy.featuresTitle}</h3>
            <ul>{copy.featuresList.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </details>

        {configOpen && (
          <div ref={configRef} className="cookie-consent-settings">
            <div className="cookie-consent-category-list">
              {COOKIE_CATEGORIES.map((category) => {
                const categoryCopy = getCategoryCopy(locale, category.id);
                const checked = normalizedPreferences[category.id];
                return (
                  <div
                    key={category.id}
                    className={[
                      "cookie-consent-category",
                      checked ? "is-enabled" : "",
                      category.required ? "is-required" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    <div className="cookie-consent-category__copy">
                      <h3>{categoryCopy.title}</h3>
                      <p>{categoryCopy.description}</p>
                      {category.required && (
                        <span>{categoryCopy.requiredLabel}</span>
                      )}
                    </div>
                    <CookieSwitch
                      category={category}
                      checked={checked}
                      locale={locale}
                      onChange={updateCategory}
                    />
                  </div>
                );
              })}
            </div>

            <details className="cookie-consent-details cookie-consent-storage">
              <summary>{copy.storageSummary}</summary>
              <StorageTable copy={copy} />
            </details>
          </div>
        )}

        <div className={["cookie-consent-actions", configOpen ? "cookie-consent-actions--settings" : ""].join(" ")}>
          {configOpen ? (
            <>
              <button
                type="button"
                className="cookie-consent-primary"
                onClick={saveSettings}
              >
                {copy.acceptSettings}
              </button>
              <button
                type="button"
                className="cookie-consent-plain"
                onClick={rejectAll}
              >
                {copy.rejectAll}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="cookie-consent-primary"
                onClick={acceptAll}
              >
                {copy.acceptAll}
              </button>
              <button
                type="button"
                className="cookie-consent-secondary"
                onClick={openConfigPanel}
              >
                {copy.configure}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default CookieConsentManager;
