function deriveKeyFromCode(code) {
  if (!code) {
    return "";
  }
  if (code.startsWith("Key")) {
    return code.slice(3).toLowerCase();
  }
  if (code.startsWith("Digit")) {
    return code.slice(5);
  }
  if (code === "Space") {
    return " ";
  }
  if (code === "ShiftLeft" || code === "ShiftRight") {
    return "Shift";
  }
  return code;
}

const TAP_RELEASE_MS = 90;

function collectTargets(scopeElement) {
  const frameTargets = [];
  if (scopeElement) {
    const frames = scopeElement.querySelectorAll("iframe");
    frames.forEach((frame) => {
      try {
        if (frame.contentWindow) {
          frameTargets.push(frame.contentWindow);
        }
      } catch {
        // Ignore cross-origin or not-ready frames.
      }
    });
  }

  if (frameTargets.length) {
    return frameTargets;
  }

  return typeof window !== "undefined" ? [window] : [];
}

function createKeyboardEvent(targetWindow, type, input) {
  const KeyboardEventCtor = targetWindow?.KeyboardEvent ?? KeyboardEvent;
  return new KeyboardEventCtor(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    code: input.code,
    key: input.key ?? deriveKeyFromCode(input.code),
    repeat: false,
  });
}

function dispatchKeyboardEvent(targetWindow, type, input) {
  if (!targetWindow) {
    return;
  }

  try {
    targetWindow.focus?.();
  } catch {
    // Best effort only.
  }

  const dispatchTarget = targetWindow.document ?? targetWindow;
  dispatchTarget.dispatchEvent?.(createKeyboardEvent(targetWindow, type, input));
}

export function tapInputs(inputs, scopeElement) {
  const targets = collectTargets(scopeElement);
  targets.forEach((targetWindow) => {
    inputs.forEach((input) => dispatchKeyboardEvent(targetWindow, "keydown", input));
  });
  window.setTimeout(() => {
    collectTargets(scopeElement).forEach((targetWindow) => {
      inputs.forEach((input) => dispatchKeyboardEvent(targetWindow, "keyup", input));
    });
  }, TAP_RELEASE_MS);
}

export function holdInputs(inputs, scopeElement, active, nextValue) {
  const targets = collectTargets(scopeElement);
  if (!inputs?.length || !targets.length) {
    return nextValue;
  }

  if (nextValue) {
    inputs.forEach((input) => {
      if (active.has(input.code)) {
        return;
      }
      targets.forEach((targetWindow) => dispatchKeyboardEvent(targetWindow, "keydown", input));
    });
    return true;
  }

  inputs.forEach((input) => {
    if (!active.has(input.code)) {
      return;
    }
    targets.forEach((targetWindow) => dispatchKeyboardEvent(targetWindow, "keyup", input));
  });
  return false;
}

export function releaseAllInputs(activeCodes, scopeElement) {
  if (!activeCodes?.size) {
    return;
  }
  const targets = collectTargets(scopeElement);
  activeCodes.forEach((code) => {
    const input = { code };
    targets.forEach((targetWindow) => dispatchKeyboardEvent(targetWindow, "keyup", input));
  });
}
