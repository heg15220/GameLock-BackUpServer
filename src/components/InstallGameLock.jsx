import React, { useEffect, useState } from "react";

const INSTALL_REMINDER_KEY = "gamelock_install_reminder_after";
const INSTALL_PROMPT_COUNT_KEY = "gamelock_install_prompt_count";
const INSTALL_REMINDER_DAYS = 14;
const INITIAL_PROMPT_VISITS = 2;
const FIRST_PROMPT_DELAY_MS = 4000;

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)")?.matches ||
  window.navigator.standalone === true;

const getReminderAfter = () => {
  try {
    const value = Number.parseInt(window.localStorage.getItem(INSTALL_REMINDER_KEY) || "0", 10);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
};

const getPromptCount = () => {
  try {
    const value = Number.parseInt(window.localStorage.getItem(INSTALL_PROMPT_COUNT_KEY) || "0", 10);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
};

const recordAutomaticPrompt = () => {
  const nextCount = getPromptCount() + 1;
  try {
    window.localStorage.setItem(INSTALL_PROMPT_COUNT_KEY, String(nextCount));
  } catch {
    // The reminder still works for the current visit when storage is blocked.
  }
  return nextCount;
};

const postponeReminder = () => {
  try {
    const reminderAfter = Date.now() + INSTALL_REMINDER_DAYS * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(INSTALL_REMINDER_KEY, String(reminderAfter));
  } catch {
    // Installation remains available even when storage is blocked.
  }
};

const clearReminder = () => {
  try {
    window.localStorage.removeItem(INSTALL_REMINDER_KEY);
    window.localStorage.removeItem(INSTALL_PROMPT_COUNT_KEY);
  } catch {
    // Nothing else is required when storage is blocked.
  }
};

const getPlatform = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIos =
    /iphone|ipad|ipod/.test(userAgent) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  const isAndroid = /android/.test(userAgent);
  const isMobile = isIos || isAndroid;

  return { isIos, isAndroid, isMobile };
};

const getDesktopBrowser = () => {
  const userAgent = window.navigator.userAgent;

  if (/Edg\//.test(userAgent)) return "edge";
  if (/OPR\//.test(userAgent)) return "opera";
  if (/Firefox\//.test(userAgent)) return "firefox";
  if (/Chrome\//.test(userAgent) || /Chromium\//.test(userAgent)) return "chrome";
  if (/Safari\//.test(userAgent)) return "safari";
  return "other";
};

function InstallGameLock({ locale = "es" }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const copy =
    locale === "en"
      ? {
          install: "Install GameLock",
          title: "Add GameLock to your home screen",
          close: "Close",
          automatic: "Your browser can install GameLock as an application.",
          ios:
            "Open the browser Share menu, then tap “Add to Home Screen” and confirm the name GameLock.",
          android:
            "Open the browser menu and tap “Install app” or “Add to Home screen”. Confirm the name GameLock.",
          desktop: {
            chrome:
              "In Chrome, open the ⋮ menu and choose “Cast, save and share” → “Install GameLock” or “Create shortcut”.",
            edge:
              "In Edge, open the ⋯ menu and choose “Apps” → “Install GameLock”.",
            opera:
              "In Opera, open the browser menu and choose “Apps” or “Install GameLock”. If it is unavailable, create a desktop shortcut from the browser menu.",
            firefox:
              "Firefox does not provide automatic PWA installation on desktop. Create a bookmark for GameLock or drag the padlock/site icon from the address bar onto the desktop.",
            safari:
              "In Safari, open “File” → “Add to Dock”. On older versions, create a bookmark or drag the website address onto the desktop.",
            other:
              "Open the browser menu and choose “Install app”, “Create shortcut”, “Add to Dock” or create a bookmark for GameLock.",
          },
        }
      : {
          install: "Instalar GameLock",
          title: "Añade GameLock a tu dispositivo",
          close: "Cerrar",
          automatic: "Tu navegador permite instalar GameLock como una aplicación.",
          ios:
            "Abre el menú Compartir del navegador, pulsa “Añadir a pantalla de inicio” y confirma el nombre GameLock.",
          android:
            "Abre el menú del navegador y pulsa “Instalar aplicación” o “Añadir a pantalla de inicio”. Confirma el nombre GameLock.",
          desktop: {
            chrome:
              "En Chrome, abre el menú ⋮ y elige “Enviar, guardar y compartir” → “Instalar GameLock” o “Crear acceso directo”.",
            edge:
              "En Edge, abre el menú ⋯ y elige “Aplicaciones” → “Instalar GameLock”.",
            opera:
              "En Opera, abre el menú del navegador y elige “Aplicaciones” o “Instalar GameLock”. Si no aparece, crea un acceso directo desde el menú.",
            firefox:
              "Firefox no ofrece instalación PWA automática en ordenador. Guarda GameLock como marcador o arrastra el icono del sitio situado junto a la dirección hasta el escritorio.",
            safari:
              "En Safari, abre “Archivo” → “Añadir al Dock”. En versiones anteriores, crea un marcador o arrastra la dirección de la web al escritorio.",
            other:
              "Abre el menú del navegador y elige “Instalar aplicación”, “Crear acceso directo”, “Añadir al Dock” o guarda GameLock como marcador.",
          },
        };

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return undefined;
    }

    const promptCount = getPromptCount();
    const shouldShowInitialPrompt = promptCount < INITIAL_PROMPT_VISITS;
    const shouldShowPeriodicPrompt = getReminderAfter() <= Date.now();
    const reminderTimer =
      shouldShowInitialPrompt || shouldShowPeriodicPrompt
        ? window.setTimeout(() => {
            recordAutomaticPrompt();
            setShowHelp(true);
          }, FIRST_PROMPT_DELAY_MS)
        : null;

    const handleInstallAvailable = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowHelp(false);
      clearReminder();
    };

    window.addEventListener("beforeinstallprompt", handleInstallAvailable);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      if (reminderTimer) window.clearTimeout(reminderTimer);
      window.removeEventListener("beforeinstallprompt", handleInstallAvailable);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const closeHelp = () => {
    if (getPromptCount() >= INITIAL_PROMPT_VISITS) postponeReminder();
    setShowHelp(false);
  };

  const requestInstall = async () => {
    if (!installPrompt) {
      setShowHelp(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === "dismissed") {
      if (getPromptCount() >= INITIAL_PROMPT_VISITS) postponeReminder();
      setShowHelp(false);
    }
  };

  if (installed) return null;

  const { isIos, isAndroid, isMobile } = getPlatform();
  const desktopBrowser = getDesktopBrowser();
  const instructions = installPrompt
    ? copy.automatic
    : isIos
      ? copy.ios
      : isAndroid
        ? copy.android
        : copy.desktop[desktopBrowser];

  return (
    <>
      <button type="button" className="pwa-install-button" onClick={requestInstall}>
        <span className="pwa-install-button__icon" aria-hidden="true">↓</span>
        {copy.install}
      </button>

      {showHelp && (
        <div className="pwa-install-dialog-backdrop" role="presentation" onMouseDown={closeHelp}>
          <section
            className="pwa-install-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <img src="/icons/gamelock-192.png" alt="" width="72" height="72" />
            <h2 id="pwa-install-title">{copy.title}</h2>
            <p>{instructions}</p>
            {!isMobile && !window.isSecureContext && (
              <p className="pwa-install-dialog__note">
                {locale === "en"
                  ? "Application installation requires the published website to use HTTPS."
                  : "La instalación como aplicación requiere que la web publicada utilice HTTPS."}
              </p>
            )}
            {installPrompt && (
              <button type="button" className="pwa-install-dialog__primary" onClick={requestInstall}>
                {copy.install}
              </button>
            )}
            <button type="button" onClick={closeHelp}>
              {copy.close}
            </button>
          </section>
        </div>
      )}
    </>
  );
}

export default InstallGameLock;
