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

function collectTargets(scopeElement) {
  const targets = [];
  if (typeof window !== "undefined") {
    targets.push(window);
  }

  if (!scopeElement) {
    return targets;
  }

  const frames = scopeElement.querySelectorAll("iframe");
  frames.forEach((frame) => {
    try {
      if (frame.contentWindow) {
        targets.push(frame.contentWindow);
      }
    } catch {
      // Ignore cross-origin or not-ready frames.
    }
  });

  return targets;
}

function dispatchKeyboardEvent(targetWindow, type, input) {
  if (!targetWindow) {
    return;
  }

  const init = {
    bubbles: true,
    cancelable: true,
    composed: true,
    code: input.code,
    key: input.key ?? deriveKeyFromCode(input.code),
    repeat: false,
  };

  try {
    targetWindow.focus?.();
  } catch {
    // Best effort only.
  }

  targetWindow.dispatchEvent(new KeyboardEvent(type, init));
}

export function tapInputs(inputs, scopeElement) {
  const targets = collectTargets(scopeElement);
  targets.forEach((targetWindow) => {
    inputs.forEach((input) => dispatchKeyboardEvent(targetWindow, "keydown", input));
  });
  targets.forEach((targetWindow) => {
    inputs.forEach((input) => dispatchKeyboardEvent(targetWindow, "keyup", input));
  });
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
