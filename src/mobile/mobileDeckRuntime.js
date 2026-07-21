// Snapshot-driven resolution for control deck buttons: which ones apply right
// now and what they should read. Pure logic, kept out of the React component so
// it can be tested without a DOM.

export function resolveBilliardsPhase(snapshot) {
  const status = String(snapshot?.status ?? "").toLowerCase();
  if (status === "rack-over") {
    return "rack-over";
  }
  if (status === "match-over") {
    return "match-over";
  }
  return "play";
}

export function evaluateVisibility(button, snapshot) {
  const rule = button?.visibility;
  if (!rule) {
    return true;
  }

  if (Array.isArray(rule.billiardsPhases) && rule.billiardsPhases.length > 0) {
    const phase = resolveBilliardsPhase(snapshot);
    if (!phase || !rule.billiardsPhases.includes(phase)) {
      return false;
    }
  }

  // Phase gating for games that publish a `screen` in their runtime snapshot
  // (menu / playing / over …), so setup buttons and in-match actions take turns
  // in the same deck slot. While the snapshot is still unread we keep the button
  // visible: a missing poll must never leave a game without controls.
  if (Array.isArray(rule.screens) && rule.screens.length > 0 && snapshot) {
    if (!rule.screens.includes(String(snapshot.screen ?? ""))) {
      return false;
    }
  }

  return true;
}

export function resolveRuntimeButton(button, snapshot) {
  if (!evaluateVisibility(button, snapshot)) {
    return { ...button, hiddenRuntime: true };
  }

  // Labels that follow the run: one deck slot can read "Empezar", "¡PARAR!" or
  // "Otra vez" depending on the screen the game is on.
  const screenLabel = button.screenLabels?.[String(snapshot?.screen ?? "")];
  const resolved = screenLabel ? { ...button, label: screenLabel } : button;

  if (resolved.action !== "valle-travel-context") {
    return resolved;
  }

  const shortcut = snapshot?.travelShortcut;
  if (!shortcut?.state) {
    return {
      ...resolved,
      hiddenRuntime: true,
    };
  }

  return {
    ...resolved,
    action: "invoke-frame",
    frameFunction: "useTravelShortcut",
    frameGuard: null,
    hiddenRuntime: false,
    label: resolved.stateLabels?.[shortcut.state] ?? resolved.label,
  };
}

// A deck button that clicks a control inside the game reflects that control's
// own selected state (the game marks it with `is-on`/`is-selected`/aria-pressed),
// so the chosen difficulty or map reads as chosen on the deck too.
export function isSelectedTarget(target) {
  if (!target) {
    return false;
  }
  return (
    target.getAttribute?.("aria-pressed") === "true" ||
    Boolean(target.classList?.contains("is-on")) ||
    Boolean(target.classList?.contains("is-selected"))
  );
}
