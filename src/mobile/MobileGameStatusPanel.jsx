import React, { useEffect, useMemo, useState } from "react";
import { formatMobileStatus, isPreplayState } from "./mobileStatusFormatter";

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function extractLabelText(label) {
  if (!label) {
    return "";
  }

  const clone = label.cloneNode(true);
  clone.querySelectorAll("select, option, input, button, textarea").forEach((node) => {
    node.remove();
  });
  return normalizeText(clone.textContent);
}

function titleCase(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isStrategyCategory(gameCategory) {
  const categoryKey = normalizeText(gameCategory).toLowerCase();
  return categoryKey === "estrategia" || categoryKey === "strategy";
}

function isKnowledgeCategory(gameCategory) {
  const categoryKey = normalizeText(gameCategory).toLowerCase();
  return categoryKey === "conocimiento" || categoryKey === "knowledge";
}

function isVisibleControl(element) {
  if (!element || typeof element.getBoundingClientRect !== "function") {
    return false;
  }

  const doc = element.ownerDocument;
  const win = doc?.defaultView;
  if (!win) {
    return false;
  }

  if (element.hidden || element.disabled) {
    return false;
  }

  const style = win.getComputedStyle(element);
  if (
    style.display === "none"
    || style.visibility === "hidden"
    || style.opacity === "0"
  ) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function extractControlLabel(button) {
  const ariaLabel = normalizeText(button.getAttribute("aria-label"));
  if (ariaLabel) {
    return ariaLabel;
  }

  const heading = normalizeText(
    button.querySelector("strong, [data-mobile-label], .qt, .nn")?.textContent
  );
  if (heading) {
    return heading;
  }

  return normalizeText(button.textContent);
}

function extractSelectLabel(select) {
  if (!select) {
    return "";
  }

  const ariaLabel = normalizeText(select.getAttribute("aria-label"));
  if (ariaLabel) {
    return ariaLabel;
  }

  const wrapperLabel = normalizeText(
    select.closest("label")?.querySelector("span, strong, [data-mobile-label]")?.textContent
  );
  if (wrapperLabel) {
    return wrapperLabel;
  }

  const inlineLabel = extractLabelText(select.closest("label"));
  if (inlineLabel) {
    return inlineLabel;
  }

  return normalizeText(
    select.previousElementSibling?.textContent
    || select.parentElement?.querySelector("span, strong, [data-mobile-label]")?.textContent
  );
}

function extractValleToolLabel(button) {
  if (!button) {
    return "";
  }

  const clone = button.cloneNode(true);
  clone.querySelector(".ti")?.remove();
  clone.querySelector(".cost")?.remove();
  return normalizeText(clone.textContent).replace(/\s+/g, " ");
}

function extractValleIcon(element, selector = ".ti") {
  return normalizeText(element?.querySelector(selector)?.textContent);
}

function collectControlsFromRoot(root, rootKey, group, includeHidden = false) {
  const buttonEntries = [];
  const selectEntries = [];

  root.querySelectorAll("button").forEach((button, buttonIndex) => {
    const label = extractControlLabel(button);
    if (!label || (!includeHidden && !isVisibleControl(button))) {
      return;
    }
    const key = button.id || `${rootKey}-btn-${buttonIndex}-${label}`;
    buttonEntries.push({
      id: key,
      label,
      disabled: Boolean(button.disabled),
      target: button,
      group,
    });
  });

  root.querySelectorAll("select").forEach((select, selectIndex) => {
    const label = extractSelectLabel(select);
    const options = Array.from(select.options).map((option) => ({
      value: option.value,
      label: normalizeText(option.textContent) || option.value,
    }));

    if (!options.length || (!includeHidden && !isVisibleControl(select))) {
      return;
    }

    const key = select.id || `${group}-select-${label || selectIndex}`;
    selectEntries.push({
      id: key,
      label,
      disabled: Boolean(select.disabled),
      value: select.value,
      target: select,
      options,
      group,
    });
  });

  return {
    buttons: buttonEntries,
    selects: selectEntries,
  };
}

function shouldCollectHiddenMenuRoot(root) {
  if (!root) {
    return false;
  }

  const className = String(root.className ?? "");
  const looksLikeActionArea = /(action|actions|toolbar|controls|footer|dock|panel|side|keypad|config|switch|score|stats|post|meta|setup)/i.test(className);

  return (
    root.matches(".mini-head") ||
    Boolean(root.querySelector("select")) ||
    (looksLikeActionArea && Boolean(root.querySelector("button, select")))
  );
}

function setNativeSelectValue(select, value) {
  if (!select) {
    return;
  }

  const win = select.ownerDocument?.defaultView;
  const prototype = win?.HTMLSelectElement?.prototype;
  const valueSetter = prototype
    ? Object.getOwnPropertyDescriptor(prototype, "value")?.set
    : null;

  if (valueSetter) {
    valueSetter.call(select, value);
  } else {
    select.value = value;
  }
}

function dispatchSelectEvents(select) {
  const win = select?.ownerDocument?.defaultView;
  if (!select || !win) {
    return;
  }

  select.dispatchEvent(new win.Event("input", { bubbles: true }));
  select.dispatchEvent(new win.Event("change", { bubbles: true }));
}

function buildMenuControls(scopeElement) {
  if (!scopeElement) {
    return { buttons: [], selects: [] };
  }

  const buttonMap = new Map();
  const selectMap = new Map();
  const registerEntries = (entries) => {
    entries.buttons.forEach((button) => {
      buttonMap.set(button.id, button);
    });
    entries.selects.forEach((select) => {
      selectMap.set(select.id, select);
    });
  };

  scopeElement.querySelectorAll("[data-mobile-stage-hidden='true']").forEach((root, rootIndex) => {
    if (!shouldCollectHiddenMenuRoot(root)) {
      return;
    }
    registerEntries(
      collectControlsFromRoot(root, `hidden-${rootIndex}`, "hidden", true)
    );
  });

  scopeElement.querySelectorAll("iframe").forEach((frame, frameIndex) => {
    const doc = frame.contentDocument;
    if (!doc) {
      return;
    }

    const modalRoots = [
      ...doc.querySelectorAll(
        "#mb.on, #worldSelect:not(.hidden), #panelOverlay:not(.hidden), #treasureRoomOverlay:not(.hidden), #endingOverlay:not(.hidden), .overlay:not(.hidden)"
      ),
    ];
    modalRoots.forEach((root, rootIndex) => {
      registerEntries(
        collectControlsFromRoot(root, `iframe-${frameIndex}-modal-${rootIndex}`, "modal")
      );
    });

    const actionRoots = [
      ...doc.querySelectorAll("#actb, .action-row, #guide-actions"),
    ];
    actionRoots.forEach((root, rootIndex) => {
      registerEntries(
        collectControlsFromRoot(root, `iframe-${frameIndex}-actions-${rootIndex}`, "actions", true)
      );
    });

    const visibleStandaloneSelects = [...doc.querySelectorAll("select")].filter((select) => {
      if (select.closest("#mb.on, .overlay:not(.hidden), #panelOverlay:not(.hidden), #worldSelect:not(.hidden)")) {
        return;
      }
      return isVisibleControl(select);
    });
    visibleStandaloneSelects.forEach((select, selectIndex) => {
      registerEntries({
        buttons: [],
        selects: [{
          id: select.id || `iframe-${frameIndex}-select-${selectIndex}`,
          label: extractSelectLabel(select),
          disabled: Boolean(select.disabled),
          value: select.value,
          target: select,
          options: Array.from(select.options).map((option) => ({
            value: option.value,
            label: normalizeText(option.textContent) || option.value,
          })),
          group: "visible-select",
        }],
      });
    });
  });

  scopeElement.querySelectorAll(".parchis-actions").forEach((root, rootIndex) => {
    registerEntries(
      collectControlsFromRoot(root, `visible-stage-${rootIndex}`, "visible-stage", true)
    );
  });

  return {
    buttons: Array.from(buttonMap.values()).slice(0, 18),
    selects: Array.from(selectMap.values()).slice(0, 3),
  };
}

function buildSupplementalSections(scopeElement, snapshot, locale) {
  if (
    !scopeElement
    || snapshot?.variant !== "valle-tranquilo"
    || !["running", "modal"].includes(String(snapshot?.screen ?? ""))
  ) {
    return [];
  }

  const frame = scopeElement.querySelector("iframe");
  const doc = frame?.contentDocument;
  if (!doc) {
    return [];
  }

  const tools = Array.from(doc.querySelectorAll("#pl .tb")).map((button, index) => ({
    id: button.id || `valle-tool-${index}`,
    label: extractValleToolLabel(button),
    icon: extractValleIcon(button),
    disabled: Boolean(button.disabled),
    active: button.classList.contains("on"),
    target: button,
  }));

  const inventory = Array.from(doc.querySelectorAll("#invw .is:not(.e)"))
    .map((slot, index) => {
      const label = normalizeText(slot.querySelector(".il")?.textContent);
      if (!label) {
        return null;
      }
      const icon = normalizeText(slot.childNodes?.[0]?.textContent);

      return {
        id: slot.dataset.item || `valle-item-${index}`,
        label: titleCase(label),
        icon,
        meta: `x ${normalizeText(slot.querySelector(".iq")?.textContent) || "1"}`,
      };
    })
    .filter(Boolean);

  const quests = Array.from(doc.querySelectorAll("#qsl .qi"))
    .map((entry, index) => {
      const label = normalizeText(entry.querySelector(".qt")?.textContent || entry.textContent);
      if (!label) {
        return null;
      }

      return {
        id: `valle-quest-${index}`,
        label,
        meta: normalizeText(entry.querySelector(".qm")?.textContent),
      };
    })
    .filter(Boolean);

  const sections = [];

  if (tools.length) {
    sections.push({
      id: "valle-tools",
      title: locale === "en" ? "Tools" : "Herramientas",
      type: "buttons",
      items: tools,
    });
  }

  sections.push({
    id: "valle-inventory",
    title: locale === "en" ? "Inventory" : "Inventario",
    type: "list",
    emptyLabel: locale === "en" ? "Empty backpack" : "Mochila vacia",
    items: inventory.slice(0, 8),
  });

  const questItems = quests.length
    ? quests.slice(0, 4)
    : (snapshot?.guide?.current
        ? [{
            id: "valle-guide-current",
            label: snapshot.guide.current,
            meta: snapshot.guide.progress ?? "",
          }]
        : []);

  sections.push({
    id: "valle-quests",
    title: locale === "en" ? "Quests" : "Misiones",
    type: "list",
    emptyLabel: locale === "en" ? "No active quests" : "Sin encargos activos",
    items: questItems,
  });

  return sections;
}

function filterContextButtons(buttons, snapshot, gameCategory) {
  if (!buttons.length || !snapshot || typeof snapshot !== "object") {
    return [];
  }

  const modeKey = String(snapshot.mode ?? "").toLowerCase();
  const isStrategyFamily = isStrategyCategory(gameCategory);
  const isKnowledgeFamily = isKnowledgeCategory(gameCategory);
  const actionButtons = buttons.filter((button) => button.group === "actions");
  const buttonIdMatches = (button, pattern) =>
    pattern.test(String(button.target?.id ?? button.id ?? ""));
  const buttonLabelMatches = (button, pattern) =>
    pattern.test(String(button.label ?? ""));

  if (snapshot.mode === "arcade-dig-hole-treasure" || snapshot.variant === "valle-tranquilo") {
    return actionButtons.slice(0, 6);
  }

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

  if (
    (
      modeKey.startsWith("strategy") ||
      modeKey.startsWith("knowledge") ||
      isStrategyFamily ||
      isKnowledgeFamily
    ) &&
    buttons.some((button) => button.group === "hidden" || button.group === "visible-stage")
  ) {
    return buttons
      .filter((button) => button.group === "hidden" || button.group === "visible-stage")
      .filter((button) => !buttonLabelMatches(button, /fullscreen|pantalla completa/i))
      .slice(0, 10);
  }

  return [];
}

function isConfigurationButton(button) {
  const text = normalizeText(
    `${button?.label || ""} ${button?.target?.id || ""} ${button?.target?.className || ""}`
  ).toLowerCase();

  return /(new game|nueva partida|restart|reiniciar|rematch|revancha|apply|aplicar|adjust|ajustes|settings|config|setup|score|marcador|stats|estad|rules|reglas)/i.test(text);
}

export default function MobileGameStatusPanel({
  gameCategory,
  locale,
  scopeElement,
  snapshot,
}) {
  const [menuControls, setMenuControls] = useState({ buttons: [], selects: [] });
  const [supplementalSections, setSupplementalSections] = useState([]);
  const status = useMemo(
    () => formatMobileStatus(snapshot, locale),
    [locale, snapshot]
  );
  const contextButtons = useMemo(
    () => filterContextButtons(menuControls.buttons, snapshot, gameCategory),
    [gameCategory, menuControls.buttons, snapshot]
  );
  const derivedPreplayState =
    isPreplayState(snapshot) ||
    (isStrategyCategory(gameCategory) && snapshot?.started === false);
  const strategyOrKnowledgeContextSelects =
    !derivedPreplayState &&
    (isStrategyCategory(gameCategory) || isKnowledgeCategory(gameCategory)) &&
    menuControls.selects.length > 0;
  const allowPostMatchSetup =
    snapshot?.mode === "billiards_pool" &&
    snapshot?.status === "match-over";
  const preplayButtons = menuControls.buttons
    .filter((button) => button.group !== "actions")
    .filter((button) => !/fullscreen|pantalla completa/i.test(String(button.label ?? "")));
  const visibleMenuButtons = allowPostMatchSetup
    ? contextButtons
    : preplayButtons;
  const showMenuControls =
    (derivedPreplayState || allowPostMatchSetup) &&
    (preplayButtons.length > 0 || menuControls.selects.length > 0);
  const showContextButtons =
    !derivedPreplayState &&
    !allowPostMatchSetup &&
    contextButtons.length > 0;
  const strategyOrKnowledgeContext = isStrategyCategory(gameCategory) || isKnowledgeCategory(gameCategory);
  const contextSetupButtons = strategyOrKnowledgeContext
    ? contextButtons.filter((button) => isConfigurationButton(button))
    : [];
  const contextActionButtons = strategyOrKnowledgeContext
    ? contextButtons.filter((button) => !isConfigurationButton(button))
    : contextButtons;
  const showContextSetup =
    !derivedPreplayState &&
    !allowPostMatchSetup &&
    strategyOrKnowledgeContext &&
    (strategyOrKnowledgeContextSelects || contextSetupButtons.length > 0);
  const showContextActions =
    !derivedPreplayState &&
    !allowPostMatchSetup &&
    contextActionButtons.length > 0;

  useEffect(() => {
    if (!scopeElement) {
      return undefined;
    }

    const refreshControls = () => {
      setMenuControls(buildMenuControls(scopeElement));
      setSupplementalSections(buildSupplementalSections(scopeElement, snapshot, locale));
    };

    refreshControls();
    const observer = new MutationObserver(refreshControls);
    observer.observe(scopeElement, { childList: true, subtree: true, attributes: true });
    const intervalId = window.setInterval(refreshControls, 300);

    return () => {
      observer.disconnect();
      window.clearInterval(intervalId);
    };
  }, [locale, scopeElement, snapshot]);

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
                  {field.label ? <span>{field.label}</span> : null}
                  <select
                    value={field.value}
                    disabled={field.disabled}
                    onChange={(event) => {
                      setNativeSelectValue(field.target, event.target.value);
                      dispatchSelectEvents(field.target);
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

      {showContextSetup ? (
        <div className="mobile-game-status-panel__menu mobile-game-status-panel__menu--setup">
          <strong>{locale === "en" ? "Match setup" : "Configuracion de partida"}</strong>
          {strategyOrKnowledgeContextSelects ? (
            <div className="mobile-game-status-panel__selects">
              {menuControls.selects.map((field) => (
                <label key={`setup-${field.id}`}>
                  {field.label ? <span>{field.label}</span> : null}
                  <select
                    value={field.value}
                    disabled={field.disabled}
                    onChange={(event) => {
                      setNativeSelectValue(field.target, event.target.value);
                      dispatchSelectEvents(field.target);
                      setMenuControls(buildMenuControls(scopeElement));
                    }}
                  >
                    {field.options.map((option) => (
                      <option key={`setup-${field.id}-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          ) : null}
          {contextSetupButtons.length ? (
            <div className="mobile-game-status-panel__buttons">
              {contextSetupButtons.map((button) => (
                <button
                  key={`setup-btn-${button.id}`}
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

      {showContextButtons && !showContextSetup ? (
        <div className="mobile-game-status-panel__menu mobile-game-status-panel__menu--actions">
          <strong>{locale === "en" ? "Context controls" : "Controles contextuales"}</strong>
          {strategyOrKnowledgeContextSelects ? (
            <div className="mobile-game-status-panel__selects">
              {menuControls.selects.map((field) => (
                <label key={`context-${field.id}`}>
                  {field.label ? <span>{field.label}</span> : null}
                  <select
                    value={field.value}
                    disabled={field.disabled}
                    onChange={(event) => {
                      setNativeSelectValue(field.target, event.target.value);
                      dispatchSelectEvents(field.target);
                      setMenuControls(buildMenuControls(scopeElement));
                    }}
                  >
                    {field.options.map((option) => (
                      <option key={`context-${field.id}-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          ) : null}
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

      {showContextActions && (showContextSetup || !showContextButtons) ? (
        <div className="mobile-game-status-panel__menu mobile-game-status-panel__menu--actions">
          <strong>{locale === "en" ? "In-match actions" : "Acciones de partida"}</strong>
          <div className="mobile-game-status-panel__buttons">
            {contextActionButtons.map((button) => (
              <button
                key={`action-${button.id}`}
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

      {supplementalSections.map((section) => (
        <div key={section.id} className="mobile-game-status-panel__menu">
          <strong>{section.title}</strong>

          {section.type === "buttons" ? (
            <div className="mobile-game-status-panel__buttons">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.disabled}
                  className={item.active ? "is-selected" : ""}
                  onClick={() => {
                    item.target?.click?.();
                    setSupplementalSections(buildSupplementalSections(scopeElement, snapshot, locale));
                  }}
                >
                  {item.icon ? `${item.icon} ${item.label}` : item.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="mobile-game-status-panel__detail-list">
              {section.items.length ? section.items.map((item) => (
                <article key={item.id} className="mobile-game-status-panel__detail-item">
                  <strong>{item.icon ? `${item.icon} ${item.label}` : item.label}</strong>
                  {item.meta ? <span>{item.meta}</span> : null}
                </article>
              )) : (
                <article className="mobile-game-status-panel__detail-item is-empty">
                  <strong>{section.emptyLabel}</strong>
                </article>
              )}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

