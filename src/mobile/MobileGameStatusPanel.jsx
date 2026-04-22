import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatMobileStatus, isPreplayState } from "./mobileStatusFormatter";

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

const PARCHIS_DIE_PIPS = {
  1: [[28, 28]],
  2: [[14, 14], [42, 42]],
  3: [[14, 14], [28, 28], [42, 42]],
  4: [[14, 14], [42, 14], [14, 42], [42, 42]],
  5: [[14, 14], [42, 14], [28, 28], [14, 42], [42, 42]],
  6: [[14, 12], [42, 12], [14, 28], [42, 28], [14, 44], [42, 44]],
};

function ParchisMobileDie({ value, aiActive = false, ownerLabel = "" }) {
  const parsed = Number(value);
  const pips = Number.isFinite(parsed) ? (PARCHIS_DIE_PIPS[parsed] || []) : [];
  const label = Number.isFinite(parsed) ? String(parsed) : "--";
  const ariaLabel = ownerLabel
    ? `Dado ${label}, ${ownerLabel}`
    : `Dado ${label}`;

  return (
    <svg
      viewBox="0 0 56 56"
      className={`mobile-game-status-panel__parchis-die-svg${aiActive ? " is-ai-active" : ""}`}
      role="img"
      aria-label={ariaLabel}
    >
      <rect
        x="3"
        y="3"
        width="50"
        height="50"
        rx="10"
        ry="10"
        className="mobile-game-status-panel__parchis-die-face"
      />
      {pips.length ? pips.map(([cx, cy], index) => (
        <circle
          key={`mobile-die-${label}-pip-${index}`}
          cx={cx}
          cy={cy}
          r="5"
          className="mobile-game-status-panel__parchis-die-pip"
        />
      )) : (
        <text
          x="28"
          y="32"
          textAnchor="middle"
          className="mobile-game-status-panel__parchis-die-fallback"
        >
          {label}
        </text>
      )}
    </svg>
  );
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

function hashString(value) {
  let hash = 0;
  const source = String(value ?? "");
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function resolveButtonActive(button) {
  if (!button) {
    return false;
  }

  const ariaPressed = normalizeText(button.getAttribute("aria-pressed")).toLowerCase();
  const ariaSelected = normalizeText(button.getAttribute("aria-selected")).toLowerCase();
  const ariaCurrent = normalizeText(button.getAttribute("aria-current")).toLowerCase();
  const dataState = normalizeText(
    button.dataset?.state
    || button.dataset?.active
    || button.dataset?.selected
    || button.dataset?.pressed
    || button.dataset?.mode
  ).toLowerCase();

  if (
    ariaPressed === "true"
    || ariaSelected === "true"
    || (ariaCurrent && ariaCurrent !== "false")
    || ["active", "selected", "checked", "on", "current", "open"].includes(dataState)
  ) {
    return true;
  }

  return Array.from(button.classList ?? []).some((token) =>
    /^(active|selected|is-selected|is-active|current|on|checked)$/.test(token)
  );
}

function buildSetupButtonStyle(gameId, button) {
  const gameSeed = hashString(gameId || "mobile-shell");
  const buttonSeed = hashString(`${button?.id || ""}:${button?.label || ""}`);
  const hueStart = gameSeed % 360;
  const hueEnd = (hueStart + 20 + (buttonSeed % 42)) % 360;
  const borderHue = (hueStart + 8) % 360;
  const glowHue = (hueEnd + 18) % 360;

  return {
    "--mobile-setup-btn-bg": `linear-gradient(135deg, hsl(${hueStart}deg 86% 95%), hsl(${hueEnd}deg 78% 83%))`,
    "--mobile-setup-btn-border": `hsla(${borderHue}, 72%, 36%, 0.28)`,
    "--mobile-setup-btn-color": `hsl(${(hueStart + 234) % 360}deg 34% 20%)`,
    "--mobile-setup-btn-shadow": `0 10px 18px hsla(${glowHue}, 64%, 48%, 0.18)`,
    "--mobile-setup-btn-selected-bg": `linear-gradient(135deg, hsl(${hueStart}deg 78% 46%), hsl(${hueEnd}deg 72% 38%))`,
    "--mobile-setup-btn-selected-color": "hsl(0deg 0% 100%)",
    "--mobile-setup-btn-selected-border": `hsla(${borderHue}, 78%, 24%, 0.74)`,
    "--mobile-setup-btn-selected-shadow": `0 14px 24px hsla(${glowHue}, 76%, 34%, 0.28)`,
  };
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
      active: resolveButtonActive(button),
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

function buttonSourceWeight(button) {
  if (button?.group === "visible-stage") {
    return 4;
  }
  if (button?.group === "actions") {
    return 3;
  }
  if (button?.group === "hidden") {
    return 2;
  }
  return 1;
}

function dedupeButtons(buttons) {
  const seen = new Map();

  buttons.forEach((button, index) => {
    const labelKey = normalizeText(button?.label).toLowerCase();
    if (!labelKey) {
      return;
    }

    const candidate = {
      button,
      index,
      score: (button.disabled ? 0 : 10) + buttonSourceWeight(button),
    };
    const current = seen.get(labelKey);

    if (!current || candidate.score > current.score) {
      seen.set(labelKey, candidate);
    }
  });

  return Array.from(seen.values())
    .sort((left, right) => left.index - right.index)
    .map((entry) => entry.button);
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

  scopeElement.querySelectorAll("[data-mobile-menu-root='true']").forEach((root, rootIndex) => {
    registerEntries(
      collectControlsFromRoot(root, `menu-root-${rootIndex}`, "hidden", true)
    );
  });

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

    const visibleStandaloneButtons = [...doc.querySelectorAll("button")].filter((button) => {
      if (
        button.closest(
          "#mb.on, .overlay:not(.hidden), #panelOverlay:not(.hidden), #worldSelect:not(.hidden), #endingOverlay:not(.hidden), #treasureRoomOverlay:not(.hidden), #actb, .action-row, #guide-actions"
        )
      ) {
        return false;
      }

      return isVisibleControl(button);
    });

    visibleStandaloneButtons.forEach((button, buttonIndex) => {
      registerEntries({
        buttons: [{
          id: button.id || `iframe-${frameIndex}-visible-button-${buttonIndex}`,
          label: extractControlLabel(button),
          disabled: Boolean(button.disabled),
          target: button,
          group: "visible-stage",
        }],
        selects: [],
      });
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
    selects: Array.from(selectMap.values()),
  };
}

function buildSupplementalSections(scopeElement, snapshot, locale) {
  if (snapshot?.mode === "chess_fide_board") {
    const whiteCaptured = Array.isArray(snapshot?.capturedSummary?.white)
      ? snapshot.capturedSummary.white
      : [];
    const blackCaptured = Array.isArray(snapshot?.capturedSummary?.black)
      ? snapshot.capturedSummary.black
      : [];

    return [{
      id: "chess-captures",
      title: locale === "en" ? "Captured pieces" : "Piezas capturadas",
      type: "list",
      items: [
        {
          id: "chess-captures-white",
          label: locale === "en" ? "White" : "Blancas",
          meta: whiteCaptured.length ? whiteCaptured.join(" ") : "-",
        },
        {
          id: "chess-captures-black",
          label: locale === "en" ? "Black" : "Negras",
          meta: blackCaptured.length ? blackCaptured.join(" ") : "-",
        },
      ],
    }];
  }

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
    return dedupeButtons(
      [
        ...actionButtons,
        ...buttons.filter((button) => button.group === "visible-stage"),
      ]
        .filter((button) => !buttonLabelMatches(button, /fullscreen|pantalla completa/i))
        .filter((button) => !buttonIdMatches(button, /^exit-interior-btn$/i))
        .filter((button) => {
          if (snapshot.variant !== "valle-tranquilo") {
            return true;
          }

          return (
            buttonSourceWeight(button) >= 3
            || buttonIdMatches(button, /fish-cancel/i)
          );
        })
    ).slice(0, snapshot.variant === "valle-tranquilo" ? 10 : 8);
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

  if (snapshot.variant === "minesweeper-classic") {
    return dedupeButtons(
      buttons
        .filter((button) => button.group === "hidden" || button.group === "visible-stage")
        .filter((button) => !button.disabled)
        .filter((button) => !buttonLabelMatches(button, /fullscreen|pantalla completa/i))
    ).slice(0, 10);
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
    return dedupeButtons(
      buttons
        .filter((button) => button.group === "hidden" || button.group === "visible-stage")
        .filter((button) => !button.disabled)
        .filter((button) => !buttonLabelMatches(button, /fullscreen|pantalla completa/i))
    ).slice(0, 10);
  }

  return [];
}

function isConfigurationButton(button) {
  const text = normalizeText(
    `${button?.label || ""} ${button?.target?.id || ""} ${button?.target?.className || ""}`
  ).toLowerCase();

  return /(new game|nueva partida|restart|reiniciar|rematch|revancha|apply|aplicar|adjust|ajustes|settings|config|setup|score|marcador|stats|estad|rules|reglas)/i.test(text);
}

function isPenaltyShootoutSnapshot(snapshot) {
  return snapshot?.mode === "arcade-penalty-neural-keeper";
}

function isPenaltyMenuButton(button) {
  const buttonId = String(button?.target?.id ?? button?.id ?? "");
  return /^penalty-mobile-(start|menu)-btn$/i.test(buttonId);
}

function isPenaltyDifficultySelect(field) {
  const selectId = String(field?.target?.id ?? field?.id ?? "");
  return /^penalty-mobile-difficulty-select$/i.test(selectId);
}

export default function MobileGameStatusPanel({
  gameId,
  gameCategory,
  locale,
  scopeElement,
  snapshot,
  bottomContent = null,
}) {
  const panelRef = useRef(null);
  const parchisActionPanelRef = useRef(null);
  const parchisDicePanelRef = useRef(null);
  const [menuControls, setMenuControls] = useState({ buttons: [], selects: [] });
  const [supplementalSections, setSupplementalSections] = useState([]);
  const [selectedSetupButtonId, setSelectedSetupButtonId] = useState(null);
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
  const isMinesweeper = snapshot?.variant === "minesweeper-classic";
  const isPenaltyShootout = isPenaltyShootoutSnapshot(snapshot);
  const penaltyMenuButtons = useMemo(
    () => dedupeButtons(menuControls.buttons.filter((button) => isPenaltyMenuButton(button))),
    [menuControls.buttons]
  );
  const penaltyMenuSelects = useMemo(
    () => menuControls.selects.filter((field) => isPenaltyDifficultySelect(field)),
    [menuControls.selects]
  );
  const activeMenuSelects = isPenaltyShootout ? penaltyMenuSelects : menuControls.selects;
  const splitContextSelects =
    !derivedPreplayState &&
    (
      isStrategyCategory(gameCategory) ||
      isKnowledgeCategory(gameCategory) ||
      isMinesweeper
    ) &&
    activeMenuSelects.length > 0;
  const allowPostMatchSetup =
    snapshot?.mode === "billiards_pool" &&
    snapshot?.status === "match-over";
  const preplayButtons = dedupeButtons(
    (isPenaltyShootout ? penaltyMenuButtons : menuControls.buttons)
      .filter((button) => button.group !== "actions")
      .filter((button) => !button.disabled)
      .filter((button) => !/fullscreen|pantalla completa/i.test(String(button.label ?? "")))
  );
  const visibleMenuButtons = allowPostMatchSetup
    ? contextButtons
    : preplayButtons;
  const showPenaltyMenuControls =
    isPenaltyShootout &&
    (preplayButtons.length > 0 || activeMenuSelects.length > 0);
  const showMenuControls =
    showPenaltyMenuControls ||
    (derivedPreplayState || allowPostMatchSetup) &&
    (preplayButtons.length > 0 || activeMenuSelects.length > 0);
  const showContextButtons =
    !derivedPreplayState &&
    !isPenaltyShootout &&
    !allowPostMatchSetup &&
    contextButtons.length > 0;
  const supportsSplitContextPanels =
    isStrategyCategory(gameCategory) ||
    isKnowledgeCategory(gameCategory) ||
    isMinesweeper;
  const contextSetupButtons = supportsSplitContextPanels
    ? contextButtons.filter((button) => isConfigurationButton(button))
    : [];
  const contextActionButtons = supportsSplitContextPanels
    ? contextButtons.filter((button) => !isConfigurationButton(button))
    : contextButtons;
  const showContextSetup =
    !derivedPreplayState &&
    !allowPostMatchSetup &&
    supportsSplitContextPanels &&
    (splitContextSelects || contextSetupButtons.length > 0);
  const isParchis =
    snapshot?.mode === "strategy-parchis-ludoteka"
    || snapshot?.variant === "parchis-4p-human-vs-3ai";
  const parchisDiceFaces = useMemo(() => {
    const faces = Array.isArray(snapshot?.diceUi?.faces) && snapshot.diceUi.faces.length >= 2
      ? snapshot.diceUi.faces.slice(0, 2)
      : [snapshot?.dice, snapshot?.diceAux];

    return faces.map((face) => {
      const parsed = Number(face);
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 6) {
        return String(parsed);
      }
      return snapshot?.diceUi?.rolling ? "..." : "--";
    });
  }, [snapshot]);
  const parchisPinnedButtons = useMemo(
    () => (
      isParchis
        ? dedupeButtons(
            contextActionButtons.filter(
              (button) =>
                !button.disabled &&
                /tirar dado|roll dice/i.test(String(button.label ?? ""))
            )
          )
        : []
    ),
    [contextActionButtons, isParchis]
  );
  const visibleContextActionButtons = useMemo(
    () => (
      isParchis
        ? contextActionButtons.filter(
            (button) => !parchisPinnedButtons.some((pinned) => pinned.id === button.id)
          )
        : contextActionButtons
    ),
    [contextActionButtons, isParchis, parchisPinnedButtons]
  );
  const showContextActions =
    !derivedPreplayState &&
    !allowPostMatchSetup &&
    visibleContextActionButtons.length > 0;
  const showParchisActionTransform = isParchis && showContextActions;
  const showDefaultContextButtons =
    showContextButtons &&
    !showContextSetup &&
    !isParchis;
  const showDefaultContextActions =
    showContextActions &&
    (showContextSetup || !showContextButtons) &&
    !isParchis;
  const showParchisDicePanel =
    !derivedPreplayState &&
    isParchis &&
    (parchisDiceFaces.length > 0 || parchisPinnedButtons.length > 0);
  const parchisRollingOwnerId = normalizeText(snapshot?.diceUi?.activeOwner);
  const parchisRollingOwnerLabel = useMemo(() => {
    if (!parchisRollingOwnerId) {
      return "";
    }
    const playerEntry = Array.isArray(snapshot?.players)
      ? snapshot.players.find((player) => normalizeText(player?.id) === parchisRollingOwnerId)
      : null;
    return normalizeText(playerEntry?.label || parchisRollingOwnerId);
  }, [parchisRollingOwnerId, snapshot?.players]);
  const parchisAiRolling =
    isParchis &&
    Boolean(snapshot?.diceUi?.rolling) &&
    /^ai-/i.test(parchisRollingOwnerId);
  const shouldFocusParchisDicePanel =
    isParchis &&
    showParchisDicePanel &&
    (snapshot?.phase === "await-roll" || Boolean(snapshot?.diceUi?.rolling));

  const scrollParchisPanelIntoView = useCallback((targetNode) => {
    const scrollHost = panelRef.current?.closest(".mobile-game-shell__touch-copy");
    if (!scrollHost || typeof scrollHost.scrollTo !== "function" || !targetNode) {
      return;
    }

    const scrollHostRect = scrollHost.getBoundingClientRect();
    const targetRect = targetNode.getBoundingClientRect();
    const nextTop = Math.max(
      0,
      scrollHost.scrollTop + (targetRect.top - scrollHostRect.top) - 10
    );

    scrollHost.scrollTo({ top: nextTop, behavior: "smooth" });
  }, []);

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

  useEffect(() => {
    setSelectedSetupButtonId(null);
  }, [gameId, scopeElement]);

  useEffect(() => {
    if (!shouldFocusParchisDicePanel) {
      return;
    }

    scrollParchisPanelIntoView(parchisDicePanelRef.current);
  }, [scrollParchisPanelIntoView, shouldFocusParchisDicePanel, snapshot?.phase, snapshot?.diceUi?.rolling, snapshot?.turn, snapshot?.started]);

  useEffect(() => {
    if (!showParchisActionTransform) {
      return;
    }

    scrollParchisPanelIntoView(parchisActionPanelRef.current);
  }, [scrollParchisPanelIntoView, showParchisActionTransform, snapshot?.phase, snapshot?.turn, snapshot?.steps]);

  return (
    <section className="mobile-game-status-panel" ref={panelRef}>
      {showParchisActionTransform ? (
        <div
          ref={parchisActionPanelRef}
          className="mobile-game-status-panel__menu mobile-game-status-panel__menu--parchis-action-transform"
        >
          <strong>{locale === "en" ? "In-match actions" : "Acciones de partida"}</strong>
          {status.primaryText ? (
            <p className="mobile-game-status-panel__parchis-action-copy">{status.primaryText}</p>
          ) : null}
          <div className="mobile-game-status-panel__buttons mobile-game-status-panel__buttons--parchis-top-actions">
            {visibleContextActionButtons.map((button) => (
              <button
                key={`parchis-action-${button.id}`}
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

      {!showParchisActionTransform ? (
        <div className="mobile-game-status-panel__header">
          <strong>{locale === "en" ? "Match status" : "Estado de partida"}</strong>
          {status.primaryText ? <p>{status.primaryText}</p> : null}
        </div>
      ) : null}

      {!showParchisActionTransform && status.entries.length ? (
        <div className="mobile-game-status-panel__chips">
          {status.entries.map((entry) => (
            <article key={`${entry.label}-${entry.value}`} className="mobile-game-status-panel__chip">
              <span>{entry.label}</span>
              <strong>{entry.value}</strong>
            </article>
          ))}
        </div>
      ) : null}

      {showParchisDicePanel ? (
        <div
          ref={parchisDicePanelRef}
          className="mobile-game-status-panel__menu mobile-game-status-panel__menu--parchis-dice"
        >
          <strong>{locale === "en" ? "Dice tray" : "Zona de dados"}</strong>
          {parchisAiRolling ? (
            <div className="mobile-game-status-panel__parchis-turn-badge" aria-live="polite">
              {locale === "en"
                ? `${parchisRollingOwnerLabel} is rolling`
                : `${parchisRollingOwnerLabel} está tirando`}
            </div>
          ) : null}
          <div className="mobile-game-status-panel__parchis-dice">
            {parchisDiceFaces.map((face, index) => (
              <article
                key={`parchis-die-${index}`}
                className={`mobile-game-status-panel__parchis-die${parchisAiRolling ? " is-ai-active" : ""}`}
              >
                <span>{locale === "en" ? `Die ${index + 1}` : `Dado ${index + 1}`}</span>
                <ParchisMobileDie
                  value={face}
                  aiActive={parchisAiRolling}
                  ownerLabel={parchisRollingOwnerLabel}
                />
              </article>
            ))}
          </div>
          {parchisPinnedButtons.length ? (
            <div className="mobile-game-status-panel__buttons mobile-game-status-panel__buttons--parchis-roll">
              {parchisPinnedButtons.map((button) => (
                <button
                  key={`parchis-pinned-${button.id}`}
                  type="button"
                  className="mobile-game-status-panel__parchis-roll-button"
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

      {showMenuControls ? (
        <div className="mobile-game-status-panel__menu">
          <strong>{locale === "en" ? "Pre-game controls" : "Controles previos"}</strong>

          {activeMenuSelects.length ? (
            <div className="mobile-game-status-panel__selects">
              {activeMenuSelects.map((field) => (
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
                  className={[
                    "mobile-game-status-panel__setup-button",
                    (button.active || selectedSetupButtonId === button.id) ? "is-selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={button.disabled}
                  aria-pressed={button.active || selectedSetupButtonId === button.id}
                  style={buildSetupButtonStyle(gameId, button)}
                  onClick={() => {
                    setSelectedSetupButtonId(button.id);
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
          {splitContextSelects ? (
            <div className="mobile-game-status-panel__selects">
              {activeMenuSelects.map((field) => (
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
                  className={[
                    "mobile-game-status-panel__setup-button",
                    (button.active || selectedSetupButtonId === button.id) ? "is-selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={button.disabled}
                  aria-pressed={button.active || selectedSetupButtonId === button.id}
                  style={buildSetupButtonStyle(gameId, button)}
                  onClick={() => {
                    setSelectedSetupButtonId(button.id);
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

      {showDefaultContextButtons ? (
        <div className="mobile-game-status-panel__menu mobile-game-status-panel__menu--actions">
          <strong>{locale === "en" ? "Context controls" : "Controles contextuales"}</strong>
          {splitContextSelects ? (
            <div className="mobile-game-status-panel__selects">
              {activeMenuSelects.map((field) => (
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

      {showDefaultContextActions ? (
        <div className="mobile-game-status-panel__menu mobile-game-status-panel__menu--actions">
          <strong>{locale === "en" ? "In-match actions" : "Acciones de partida"}</strong>
          <div className="mobile-game-status-panel__buttons">
            {visibleContextActionButtons.map((button) => (
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

      {bottomContent ? (
        <div className="mobile-game-status-panel__bottom-slot">
          {bottomContent}
        </div>
      ) : null}
    </section>
  );
}

