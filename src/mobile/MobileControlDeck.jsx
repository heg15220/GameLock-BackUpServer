import React, { useEffect, useMemo, useRef, useState } from "react";
import { holdInputs, releaseAllInputs, tapInputs } from "./mobileInputBridge";

function MobileControlButton({
  button,
  active,
  scopeElement,
  onRequestFullscreen,
  onHoldStateChange,
  setTappedId,
}) {
  const buttonClassName = [
    "mobile-control-deck__button",
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

export default function MobileControlDeck({
  profile,
  scopeElement,
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

  const isButtonActive = (button) => {
    if (tappedId === button.id) {
      return true;
    }
    return button.inputs?.some((entry) => activeMap.has(entry.code));
  };

  if (!profile) {
    return null;
  }

  return (
    <div className={`mobile-control-deck layout-${profile.layout}`}>
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
          <div className="mobile-control-deck__cluster mobile-control-deck__cluster--pad">
            {profile.leftPad.map((button) => (
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

          <div className="mobile-control-deck__cluster mobile-control-deck__cluster--actions">
            {profile.rightPad.map((button) => (
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
        </div>
      )}

      {profile.utilities?.length ? (
        <div className="mobile-control-deck__utilities">
          {profile.utilities.map((button) => (
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
