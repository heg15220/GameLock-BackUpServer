import React, { useEffect, useMemo, useRef, useState } from "react";
import { holdInputs, releaseAllInputs, tapInputs } from "./mobileInputBridge";

function isElementVisible(element) {
  if (!element || element.hidden || element.disabled) {
    return false;
  }

  const view = element.ownerDocument?.defaultView;
  const style = view?.getComputedStyle?.(element);
  if (!style || style.display === "none" || style.visibility === "hidden") {
    return false;
  }

  const rect = element.getBoundingClientRect?.();
  return Boolean(rect && rect.width > 0 && rect.height > 0);
}

function resolveActionTarget(button, scopeElement) {
  const isClickAction = button.action === "click-target" || button.action === "click-any-target";
  if (!isClickAction || !button.targetSelector || !scopeElement) {
    return null;
  }
  const allowHidden = button.action === "click-any-target";

  const roots = [scopeElement];
  scopeElement.querySelectorAll("iframe").forEach((frame) => {
    try {
      if (frame.contentDocument) {
        roots.push(frame.contentDocument);
      }
    } catch {
      // Ignore cross-origin or not-ready frames.
    }
  });

  for (const root of roots) {
    try {
      const candidate = root.querySelector(button.targetSelector);
      if (candidate && (allowHidden || isElementVisible(candidate))) {
        return candidate;
      }
    } catch {
      // Ignore transient iframe/query issues.
    }
  }

  return null;
}

function resolveFrameWindows(scopeElement) {
  if (!scopeElement) {
    return [];
  }

  const targets = [];
  scopeElement.querySelectorAll("iframe").forEach((frame) => {
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

function invokeFrameAction(button, scopeElement) {
  if (button.action !== "invoke-frame" || !button.frameFunction) {
    return false;
  }

  const targets = resolveFrameWindows(scopeElement);
  let invoked = false;

  targets.forEach((targetWindow) => {
    try {
      const guardResult = button.frameGuard
        ? targetWindow[button.frameGuard]?.()
        : true;
      if (!guardResult) {
        return;
      }

      const frameFunction = targetWindow[button.frameFunction];
      if (typeof frameFunction === "function") {
        frameFunction.call(targetWindow);
        invoked = true;
      }
    } catch {
      // Ignore transient iframe runtime issues.
    }
  });

  return invoked;
}

function resolveBilliardsPhase(snapshot) {
  const status = String(snapshot?.status ?? "").toLowerCase();
  if (status === "rack-over") {
    return "rack-over";
  }
  if (status === "match-over") {
    return "match-over";
  }
  return "play";
}

function evaluateVisibility(button, snapshot) {
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

  return true;
}

function resolveRuntimeButton(button, snapshot) {
  if (!evaluateVisibility(button, snapshot)) {
    return { ...button, hiddenRuntime: true };
  }

  if (button.action !== "valle-travel-context") {
    return button;
  }

  const shortcut = snapshot?.travelShortcut;
  if (!shortcut?.state) {
    return {
      ...button,
      hiddenRuntime: true,
    };
  }

  return {
    ...button,
    action: "invoke-frame",
    frameFunction: "useTravelShortcut",
    frameGuard: null,
    hiddenRuntime: false,
    label: button.stateLabels?.[shortcut.state] ?? button.label,
  };
}

function MobileControlButton({
  button,
  active,
  scopeElement,
  onRequestFullscreen,
  onHoldStateChange,
  setTappedId,
  extraClassName = "",
}) {
  const buttonClassName = [
    "mobile-control-deck__button",
    extraClassName,
    button.extraClassName ?? "",
    `tone-${button.tone ?? "default"}`,
    active ? "is-active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const triggerTap = () => {
    if (button.action === "fullscreen") {
      onRequestFullscreen?.();
      return;
    }
    if (button.action === "invoke-frame") {
      const invoked = invokeFrameAction(button, scopeElement);
      if (!invoked) {
        return;
      }
      setTappedId(button.id);
      window.setTimeout(() => setTappedId(null), 130);
      return;
    }
    if (button.action === "click-target" || button.action === "click-any-target") {
      const actionTarget = resolveActionTarget(button, scopeElement);
      if (!actionTarget) {
        return;
      }
      actionTarget?.click?.();
      setTappedId(button.id);
      window.setTimeout(() => setTappedId(null), 130);
      return;
    }
    tapInputs(button.inputs, scopeElement);
    setTappedId(button.id);
    window.setTimeout(() => setTappedId(null), 130);
  };

  return (
    <button
      type="button"
      className={buttonClassName}
      onPointerDown={(event) => {
        event.preventDefault();
        if (button.type === "hold") {
          onHoldStateChange(button.inputs, true);
          return;
        }
        triggerTap();
      }}
      onPointerUp={() => {
        if (button.type === "hold") {
          onHoldStateChange(button.inputs, false);
        }
      }}
      onPointerLeave={() => {
        if (button.type === "hold") {
          onHoldStateChange(button.inputs, false);
        }
      }}
      onPointerCancel={() => {
        if (button.type === "hold") {
          onHoldStateChange(button.inputs, false);
        }
      }}
    >
      <span>{button.label}</span>
    </button>
  );
}

function resolveDirectionalSlot(button) {
  const probe = String(button?.id ?? "").toLowerCase();

  if (probe.includes("up") || probe.includes("jump") || probe.includes("thrust")) {
    return "up";
  }
  if (probe.includes("left")) {
    return "left";
  }
  if (probe.includes("right")) {
    return "right";
  }
  if (probe.includes("down")) {
    return "down";
  }

  return null;
}

function collectUniqueInputs(buttons) {
  const inputMap = new Map();
  buttons.forEach((button) => {
    button?.inputs?.forEach((input) => {
      if (!inputMap.has(input.code)) {
        inputMap.set(input.code, input);
      }
    });
  });
  return Array.from(inputMap.values());
}

function MobileJoystick({
  buttonsBySlot,
  activeSlots,
  onDirectionChange,
}) {
  const joystickRef = useRef(null);
  const pointerIdRef = useRef(null);
  const previousSlotsRef = useRef([]);
  const [thumb, setThumb] = useState({ x: 0, y: 0, active: false });

  const emitSlots = (nextSlots) => {
    const previousSlots = previousSlotsRef.current;
    const previousKey = previousSlots.slice().sort().join("|");
    const nextKey = nextSlots.slice().sort().join("|");

    if (previousKey !== nextKey) {
      onDirectionChange(previousSlots, nextSlots);
      previousSlotsRef.current = nextSlots;
    }
  };

  const updateFromPointer = (event) => {
    const element = joystickRef.current;
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rawX = (event.clientX - centerX) / (rect.width / 2);
    const rawY = (event.clientY - centerY) / (rect.height / 2);
    const distance = Math.hypot(rawX, rawY);

    let dx = rawX;
    let dy = rawY;
    if (distance > 1) {
      dx /= distance;
      dy /= distance;
    }

    const deadZone = 0.24;
    const nextSlots = [];

    if (dx <= -deadZone && buttonsBySlot.left) {
      nextSlots.push("left");
    }
    if (dx >= deadZone && buttonsBySlot.right) {
      nextSlots.push("right");
    }
    if (dy <= -deadZone && buttonsBySlot.up) {
      nextSlots.push("up");
    }
    if (dy >= deadZone && buttonsBySlot.down) {
      nextSlots.push("down");
    }

    setThumb({
      x: dx * 26,
      y: dy * 26,
      active: true,
    });
    emitSlots(nextSlots);
  };

  const releaseJoystick = () => {
    setThumb({ x: 0, y: 0, active: false });
    emitSlots([]);
    pointerIdRef.current = null;
  };

  useEffect(() => () => emitSlots([]), []);

  return (
    <div className="mobile-control-deck__joystick-wrap">
      <div
        ref={joystickRef}
        className={`mobile-control-deck__joystick${thumb.active ? " is-active" : ""}`}
        onPointerDown={(event) => {
          event.preventDefault();
          pointerIdRef.current = event.pointerId;
          event.currentTarget.setPointerCapture?.(event.pointerId);
          updateFromPointer(event);
        }}
        onPointerMove={(event) => {
          if (pointerIdRef.current !== event.pointerId) {
            return;
          }
          updateFromPointer(event);
        }}
        onPointerUp={(event) => {
          if (pointerIdRef.current !== event.pointerId) {
            return;
          }
          event.currentTarget.releasePointerCapture?.(event.pointerId);
          releaseJoystick();
        }}
        onPointerCancel={(event) => {
          if (pointerIdRef.current !== event.pointerId) {
            return;
          }
          event.currentTarget.releasePointerCapture?.(event.pointerId);
          releaseJoystick();
        }}
        onLostPointerCapture={(event) => {
          if (pointerIdRef.current !== event.pointerId) {
            return;
          }
          releaseJoystick();
        }}
      >
        <span className={`mobile-control-deck__joystick-mark slot-up${activeSlots.includes("up") ? " is-live" : ""}`} />
        <span className={`mobile-control-deck__joystick-mark slot-right${activeSlots.includes("right") ? " is-live" : ""}`} />
        <span className={`mobile-control-deck__joystick-mark slot-down${activeSlots.includes("down") ? " is-live" : ""}`} />
        <span className={`mobile-control-deck__joystick-mark slot-left${activeSlots.includes("left") ? " is-live" : ""}`} />
        <span
          className="mobile-control-deck__joystick-thumb"
          style={{
            transform: `translate(${thumb.x}px, ${thumb.y}px)`,
          }}
        />
      </div>
    </div>
  );
}

function renderCluster({
  buttons,
  variant,
  preferJoystick,
  isButtonActive,
  scopeElement,
  onRequestFullscreen,
  onHoldStateChange,
  onDirectionChange,
  setTappedId,
}) {
  if (!buttons.length) {
    return null;
  }

  const directionalSlots = buttons.map((button) => ({
    button,
    slot: resolveDirectionalSlot(button),
  }));
  const hasDirectionalLayout = directionalSlots.every((entry) => entry.slot);
  const isPairLayout =
    hasDirectionalLayout &&
    directionalSlots.length === 2 &&
    directionalSlots.some((entry) => entry.slot === "left") &&
    directionalSlots.some((entry) => entry.slot === "right");
  const clusterClassName = [
    "mobile-control-deck__cluster",
    variant,
    preferJoystick && hasDirectionalLayout
      ? "mobile-control-deck__cluster--joystick"
      : hasDirectionalLayout
      ? isPairLayout
        ? "mobile-control-deck__cluster--pair"
        : "mobile-control-deck__cluster--dpad"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (preferJoystick && hasDirectionalLayout) {
    const buttonsBySlot = directionalSlots.reduce((accumulator, entry) => {
      accumulator[entry.slot] = entry.button;
      return accumulator;
    }, {});
    const activeSlots = directionalSlots
      .filter((entry) => isButtonActive(entry.button))
      .map((entry) => entry.slot);

    return (
      <div className={clusterClassName}>
        <MobileJoystick
          buttonsBySlot={buttonsBySlot}
          activeSlots={activeSlots}
          onDirectionChange={(previousSlots, nextSlots) => {
            const previousButtons = previousSlots.map((slot) => buttonsBySlot[slot]).filter(Boolean);
            const nextButtons = nextSlots.map((slot) => buttonsBySlot[slot]).filter(Boolean);
            const previousInputs = collectUniqueInputs(previousButtons);
            const nextInputs = collectUniqueInputs(nextButtons);
            const previousCodes = new Set(previousInputs.map((input) => input.code));
            const nextCodes = new Set(nextInputs.map((input) => input.code));
            const releaseInputs = previousInputs.filter((input) => !nextCodes.has(input.code));
            const pressInputs = nextInputs.filter((input) => !previousCodes.has(input.code));

            onDirectionChange(releaseInputs, pressInputs);
          }}
        />
      </div>
    );
  }

  return (
    <div className={clusterClassName}>
      {(hasDirectionalLayout ? directionalSlots : buttons.map((button) => ({ button, slot: null }))).map(({ button, slot }) => (
        <MobileControlButton
          key={button.id}
          button={button}
          active={isButtonActive(button)}
          scopeElement={scopeElement}
          onRequestFullscreen={onRequestFullscreen}
          onHoldStateChange={onHoldStateChange}
          setTappedId={setTappedId}
          extraClassName={slot ? `slot-${slot}` : ""}
        />
      ))}
    </div>
  );
}

export default function MobileControlDeck({
  profile,
  scopeElement,
  snapshot,
  onRequestFullscreen,
}) {
  const [activeCodes, setActiveCodes] = useState(() => new Set());
  const [tappedId, setTappedId] = useState(null);
  const activeCodesRef = useRef(activeCodes);

  useEffect(() => {
    activeCodesRef.current = activeCodes;
  }, [activeCodes]);

  useEffect(() => () => releaseAllInputs(activeCodesRef.current, scopeElement), [scopeElement]);

  const activeMap = useMemo(() => {
    const next = new Map();
    activeCodes.forEach((code) => next.set(code, true));
    return next;
  }, [activeCodes]);

  const updateHoldState = (inputs, nextValue) => {
    setActiveCodes((previous) => {
      const next = new Set(previous);
      holdInputs(inputs, scopeElement, previous, nextValue);
      inputs.forEach((entry) => {
        if (nextValue) {
          next.add(entry.code);
        } else {
          next.delete(entry.code);
        }
      });
      return next;
    });
  };

  const updateDirectionalState = (releaseInputs, pressInputs) => {
    setActiveCodes((previous) => {
      const next = new Set(previous);

      if (releaseInputs.length) {
        holdInputs(releaseInputs, scopeElement, previous, false);
        releaseInputs.forEach((entry) => next.delete(entry.code));
      }

      if (pressInputs.length) {
        holdInputs(pressInputs, scopeElement, previous, true);
        pressInputs.forEach((entry) => next.add(entry.code));
      }

      return next;
    });
  };

  const isButtonActive = (button) => {
    if (tappedId === button.id) {
      return true;
    }
    return button.inputs?.some((entry) => activeMap.has(entry.code));
  };

  if (!profile) {
    return null;
  }

  const mapButtons = (buttons = []) => buttons.map((button) => resolveRuntimeButton(button, snapshot));
  const preferLeftJoystick = profile.leftPadMode !== "buttons";
  const shouldRenderButton = (button) => {
    if (button.hiddenRuntime) {
      return false;
    }
    if (button.action === "invoke-frame") {
      return true;
    }
    return !button.hideWhenUnavailable || resolveActionTarget(button, scopeElement);
  };
  const leftPadButtons = mapButtons(profile.leftPad);
  const leftSupportButtons = mapButtons(profile.leftSupportPad);
  const rightPadButtons = mapButtons(profile.rightPad);
  const utilityButtons = mapButtons(profile.utilities);
  const leftPadNode = renderCluster({
    buttons: leftPadButtons.filter(shouldRenderButton),
    variant: "mobile-control-deck__cluster--pad",
    preferJoystick: preferLeftJoystick,
    isButtonActive,
    scopeElement,
    onRequestFullscreen,
    onHoldStateChange: updateHoldState,
    onDirectionChange: updateDirectionalState,
    setTappedId,
  });
  const leftSupportNode = leftSupportButtons?.length
    ? renderCluster({
        buttons: leftSupportButtons.filter(shouldRenderButton),
        variant: "mobile-control-deck__cluster--left-support",
        preferJoystick: false,
        isButtonActive,
        scopeElement,
        onRequestFullscreen,
        onHoldStateChange: updateHoldState,
        onDirectionChange: updateDirectionalState,
        setTappedId,
      })
    : null;
  const leftColumnNode = leftSupportNode ? (
    <div className="mobile-control-deck__left-stack">
      {leftPadNode}
      {leftSupportNode}
    </div>
  ) : leftPadNode;

  const isBilliardsSnapshot = snapshot?.mode === "billiards_pool";
  const billiardsPhase = isBilliardsSnapshot ? resolveBilliardsPhase(snapshot) : null;
  const deckClassName = [
    `mobile-control-deck layout-${profile.layout}`,
    billiardsPhase ? `mobile-control-deck--billiards-${billiardsPhase}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={deckClassName}>
      <div className="mobile-control-deck__meta">
        <strong>{profile.heading}</strong>
        {profile.hint ? <p>{profile.hint}</p> : null}
      </div>

      {profile.layout === "zones" ? (
        <div className="mobile-control-deck__zones">
          {profile.zones.map((button) => (
            <MobileControlButton
              key={button.id}
              button={button}
              active={isButtonActive(button)}
              scopeElement={scopeElement}
              onRequestFullscreen={onRequestFullscreen}
              onHoldStateChange={updateHoldState}
              setTappedId={setTappedId}
            />
          ))}
        </div>
      ) : (
        <div className="mobile-control-deck__clusters">
          {leftColumnNode}

          {renderCluster({
            buttons: rightPadButtons.filter(shouldRenderButton),
            variant: "mobile-control-deck__cluster--actions",
            preferJoystick: false,
            isButtonActive,
            scopeElement,
            onRequestFullscreen,
            onHoldStateChange: updateHoldState,
            onDirectionChange: updateDirectionalState,
            setTappedId,
          })}
        </div>
      )}

      {utilityButtons?.length ? (
        <div className="mobile-control-deck__utilities">
          {utilityButtons.filter(shouldRenderButton).map((button) => (
            <MobileControlButton
              key={button.id}
              button={button}
              active={isButtonActive(button)}
              scopeElement={scopeElement}
              onRequestFullscreen={onRequestFullscreen}
              onHoldStateChange={updateHoldState}
              setTappedId={setTappedId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
