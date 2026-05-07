import React, { useEffect, useMemo, useRef, useState } from "react";
import { COOKIE_CATEGORIES, DEFAULT_COOKIE_PREFERENCES, normalizeCookiePreferences } from "../utils/cookieConsent";
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
      "Usamos el navegador del usuario para recordar preferencias y partidas locales. Tambien dejamos preparada la gestion de consentimiento para futura analitica, publicidad y afiliacion.",
    details:
      "Puedes aceptar todas las cookies ahora o configurar cada categoria. Las cookies no necesarias no se activaran hasta que exista consentimiento.",
    acceptAll: "Aceptar",
    configure: "Configurar ajustes",
    settingsTitle: "Preferencias de cookies",
    settingsIntro:
      "Activa o desactiva cada tipo de cookie. Las necesarias no se pueden desactivar porque guardan el consentimiento y funciones basicas.",
    acceptSettings: "Aceptar ajustes",
    rejectAll: "Rechazar",
    purposesSummary: "Ver finalidades y caracteristicas",
    purposesTitle: "Finalidades",
    purposesList: [
      "Almacenar y/o acceder a informacion en el dispositivo para funciones tecnicas.",
      "Recordar preferencias elegidas por el usuario.",
      "Analitica de uso anonima o agregada para mejorar el servicio.",
      "Publicidad y medicion de anuncios, personalizada solo si se activa y existe base valida.",
      "Medicion de enlaces de afiliacion si se incorporan programas externos.",
    ],
    specialTitle: "Propositos obligatorios",
    specialList: [
      "Garantizar seguridad, evitar abusos y corregir fallos.",
      "Ofrecer el contenido y los juegos solicitados.",
      "Guardar y comunicar las preferencias de privacidad.",
    ],
    featuresTitle: "Caracteristicas",
    featuresList: [
      "Guardar elecciones para futuras visitas desde el mismo navegador.",
      "No crear cuentas ni perfiles propios de usuario en la plataforma.",
      "Cargar scripts externos solo cuando la categoria correspondiente este permitida.",
    ],
    storageSummary: "Ver cookies y almacenamientos",
    tableHead: ["Nombre", "Dominio", "Finalidad", "Duracion", "Tipo", "Categoria"],
    currentDomain: "Dominio actual",
    futureProvider: "Proveedor externo",
    rows: {
      consentPurpose: "Guardar preferencias de consentimiento.",
      consentDuration: "180 dias",
      consentType: "Cookie propia",
      localConsentPurpose: "Copia local de preferencias de consentimiento.",
      localConsentType: "LocalStorage propio",
      localGamePurpose: "Partidas, records o ajustes locales de juegos.",
      localGameDuration: "Persistente hasta borrado del navegador",
      gaPurpose: "Distinguir usuarios y sesiones si se activa Google Analytics.",
      gaDuration: "Hasta 2 anos",
      gaType: "Cookie propia de GA4",
      adsPurpose: "Publicidad y medicion de anuncios si se activa AdSense/GTM.",
      adsDuration: "Segun proveedor",
      adsType: "Cookie o almacenamiento publicitario",
      affiliatePurpose: "Medicion de enlaces de afiliacion si se activa Amazon Afiliados.",
      affiliateDuration: "Segun proveedor",
      affiliateType: "Cookie o parametro de afiliacion",
    },
  },
  en: {
    label: "Privacy and cookies",
    title: "Privacy notice",
    intro:
      "We use the user's browser to remember preferences and local game saves. Consent management is also prepared for future analytics, advertising and affiliate integrations.",
    details:
      "You can accept all cookies now or configure each category. Non-essential cookies will not be enabled until consent exists.",
    acceptAll: "Accept",
    configure: "Configure settings",
    settingsTitle: "Cookie preferences",
    settingsIntro:
      "Turn each cookie type on or off. Necessary cookies cannot be disabled because they store consent and core functions.",
    acceptSettings: "Accept settings",
    rejectAll: "Reject",
    purposesSummary: "View purposes and features",
    purposesTitle: "Purposes",
    purposesList: [
      "Store and/or access information on the device for technical functions.",
      "Remember preferences chosen by the user.",
      "Anonymous or aggregate usage analytics to improve the service.",
      "Advertising and ad measurement, personalized only if enabled and valid.",
      "Affiliate link measurement if external programs are added.",
    ],
    specialTitle: "Required purposes",
    specialList: [
      "Ensure security, prevent abuse and fix errors.",
      "Deliver the requested content and games.",
      "Store and communicate privacy preferences.",
    ],
    featuresTitle: "Features",
    featuresList: [
      "Save choices for future visits from the same browser.",
      "Do not create user accounts or first-party user profiles on the platform.",
      "Load external scripts only when the related category is allowed.",
    ],
    storageSummary: "View cookies and storage",
    tableHead: ["Name", "Domain", "Purpose", "Duration", "Type", "Category"],
    currentDomain: "Current domain",
    futureProvider: "External provider",
    rows: {
      consentPurpose: "Store consent preferences.",
      consentDuration: "180 days",
      consentType: "First-party cookie",
      localConsentPurpose: "Local copy of consent preferences.",
      localConsentType: "First-party localStorage",
      localGamePurpose: "Game saves, best scores or local game settings.",
      localGameDuration: "Persistent until browser deletion",
      gaPurpose: "Distinguish users and sessions if Google Analytics is enabled.",
      gaDuration: "Up to 2 years",
      gaType: "GA4 first-party cookie",
      adsPurpose: "Advertising and ad measurement if AdSense/GTM is enabled.",
      adsDuration: "Set by provider",
      adsType: "Advertising cookie or storage",
      affiliatePurpose: "Affiliate link measurement if Amazon Associates is enabled.",
      affiliateDuration: "Set by provider",
      affiliateType: "Affiliate cookie or parameter",
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
    ["localStorage de juegos", copy.currentDomain, copy.rows.localGamePurpose, copy.rows.localGameDuration, copy.rows.localConsentType, "necessary / preferences"],
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
  const [localPreferences, setLocalPreferences] = useState(DEFAULT_COOKIE_PREFERENCES);

  const openConfigPanel = () => {
    // First-time configure: pre-enable commercial categories so the user can
    // accept settings as-is and have advertising/affiliate ON by default.
    // Untouched categories stay at this seed; toggling overrides it.
    if (!consent) {
      setLocalPreferences(normalizeCookiePreferences({
        ...DEFAULT_COOKIE_PREFERENCES,
        advertising: true,
        affiliate: true,
      }));
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
    setLocalPreferences(preferences);
  }, [bannerOpen, preferences]);

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
