import React, { useEffect, useMemo, useState } from "react";
import { formatMobileStatus, isPreplayState } from "./mobileStatusFormatter";

function buildMenuControls(scopeElement) {
  if (!scopeElement) {
    return { buttons: [], selects: [] };
  }

  const hiddenRoots = scopeElement.querySelectorAll("[data-mobile-stage-hidden='true']");
  const buttonMap = new Map();
  const selectMap = new Map();

  hiddenRoots.forEach((root, rootIndex) => {
    root.querySelectorAll("button").forEach((button, buttonIndex) => {
      const label = button.textContent?.replace(/\s+/g, " ").trim();
      if (!label) {
        return;
      }
      const key = button.id || `${rootIndex}-btn-${buttonIndex}-${label}`;
      buttonMap.set(key, {
        id: key,
        label,
        disabled: Boolean(button.disabled),
        target: button,
      });
    });

    root.querySelectorAll("select").forEach((select, selectIndex) => {
      const options = Array.from(select.options).map((option) => ({
        value: option.value,
        label: option.textContent?.trim() || option.value,
      }));

      if (!options.length) {
        return;
      }

      const key = select.id || `${rootIndex}-select-${selectIndex}`;
      selectMap.set(key, {
        id: key,
        disabled: Boolean(select.disabled),
        value: select.value,
        target: select,
        options,
      });
    });
  });

  return {
    buttons: Array.from(buttonMap.values()).slice(0, 18),
    selects: Array.from(selectMap.values()).slice(0, 3),
  };
}

function filterContextButtons(buttons, snapshot) {
  if (!buttons.length || !snapshot || typeof snapshot !== "object") {
    return [];
  }

  const buttonIdMatches = (button, pattern) =>
    pattern.test(String(button.target?.id ?? button.id ?? ""));
  const buttonLabelMatches = (button, pattern) =>
    pattern.test(String(button.label ?? ""));

  if (snapshot.mode === "billiards_pool") {
    if (snapshot.pendingDecision) {
      return buttons.filter((button) => buttonIdMatches(button, /^billiards-decision-/));
    }

    if (snapshot.needsPocketCall) {
      return buttons.filter((button) => buttonIdMatches(button, /^billiards-pocket-/));
    }

    if (snapshot.status === "rack-over") {
      return buttons.filter(
        (button) =>
          buttonIdMatches(button, /^billiards-next-rack-btn$/)
          || buttonLabelMatches(button, /prepare next rack|siguiente rack|replay rack|repetir rack|new match|nuevo match/i)
      );
    }

    if (snapshot.status === "match-over") {
      return buttons.filter(
        (button) => buttonLabelMatches(button, /back to menu|volver al menu|new match|nuevo match/i)
      );
    }
  }

  return [];
}

export default function MobileGameStatusPanel({
  locale,
  scopeElement,
  snapshot,
}) {
  const [menuControls, setMenuControls] = useState({ buttons: [], selects: [] });
  const status = useMemo(
    () => formatMobileStatus(snapshot, locale),
    [locale, snapshot]
  );
  const contextButtons = useMemo(
    () => filterContextButtons(menuControls.buttons, snapshot),
    [menuControls.buttons, snapshot]
  );
  const allowPostMatchSetup =
    snapshot?.mode === "billiards_pool" &&
    snapshot?.status === "match-over";
  const visibleMenuButtons = allowPostMatchSetup
    ? contextButtons
    : menuControls.buttons;
  const showMenuControls =
    (isPreplayState(snapshot) || allowPostMatchSetup) &&
    (menuControls.buttons.length > 0 || menuControls.selects.length > 0);
  const showContextButtons =
    !isPreplayState(snapshot) &&
    !allowPostMatchSetup &&
    contextButtons.length > 0;

  useEffect(() => {
    if (!scopeElement) {
      return undefined;
    }

    const refreshControls = () => {
      setMenuControls(buildMenuControls(scopeElement));
    };

    refreshControls();
    const observer = new MutationObserver(refreshControls);
    observer.observe(scopeElement, { childList: true, subtree: true, attributes: true });
    const intervalId = window.setInterval(refreshControls, 300);

    return () => {
      observer.disconnect();
      window.clearInterval(intervalId);
    };
  }, [scopeElement]);

  return (
    <section className="mobile-game-status-panel">
      <div className="mobile-game-status-panel__header">
        <strong>{locale === "en" ? "Match status" : "Estado de partida"}</strong>
        {status.primaryText ? <p>{status.primaryText}</p> : null}
      </div>

      {status.entries.length ? (
        <div className="mobile-game-status-panel__chips">
          {status.entries.map((entry) => (
            <article key={`${entry.label}-${entry.value}`} className="mobile-game-status-panel__chip">
              <span>{entry.label}</span>
              <strong>{entry.value}</strong>
            </article>
          ))}
        </div>
      ) : null}

      {showMenuControls ? (
        <div className="mobile-game-status-panel__menu">
          <strong>{locale === "en" ? "Pre-game controls" : "Controles previos"}</strong>

          {menuControls.selects.length ? (
            <div className="mobile-game-status-panel__selects">
              {menuControls.selects.map((field) => (
                <label key={field.id}>
                  <select
                    value={field.value}
                    disabled={field.disabled}
                    onChange={(event) => {
                      field.target.value = event.target.value;
                      field.target.dispatchEvent(new Event("input", { bubbles: true }));
                      field.target.dispatchEvent(new Event("change", { bubbles: true }));
                      setMenuControls(buildMenuControls(scopeElement));
                    }}
                  >
                    {field.options.map((option) => (
                      <option key={`${field.id}-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          ) : null}

          {visibleMenuButtons.length ? (
            <div className="mobile-game-status-panel__buttons">
              {visibleMenuButtons.map((button) => (
                <button
                  key={button.id}
                  type="button"
                  disabled={button.disabled}
                  onClick={() => {
                    button.target.click();
                    setMenuControls(buildMenuControls(scopeElement));
                  }}
                >
                  {button.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {showContextButtons ? (
        <div className="mobile-game-status-panel__menu">
          <strong>{locale === "en" ? "Context controls" : "Controles contextuales"}</strong>
          <div className="mobile-game-status-panel__buttons">
            {contextButtons.map((button) => (
              <button
                key={button.id}
                type="button"
                disabled={button.disabled}
                onClick={() => {
                  button.target.click();
                  setMenuControls(buildMenuControls(scopeElement));
                }}
              >
                {button.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
