/**
 * Where you put it, chosen with the hand you have.
 *
 * The placements have always been three buttons in a row, and on a phone that is the wrong
 * instrument for the question. "Al segundo palo" is a DIRECTION - the one spatial fact the
 * whole moment turns on - and a list of words asks you to read it, translate it and press
 * a rectangle. On a touchscreen the honest input is the gesture the situation is: you flick
 * the ball where you want it to go.
 *
 * So the same choice has two faces and one model behind it:
 *
 *   COARSE POINTER - a phone, a tablet. The goal fills the frame with its five zones
 *   marked on it, and you drag from the ball towards the one you want. The nearest to where
 *   you let go is the one you took.
 *   FINE POINTER - a mouse, a trackpad. Buttons, as before, because a swipe with a mouse is
 *   a worse version of a click and nobody has ever enjoyed one.
 *
 * Nothing about the model moves. Both hand `onAim(placement)` exactly what the buttons
 * always handed `onShoot`, which is the point: the device changes how you say it, never
 * what you are allowed to say. See `keeperDive` for the half of this that answers back.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Ball, CAMERA_BOX, CAMERA_VIEWBOX, Figure, PitchStage, at } from "./pitch.jsx";
import { Furniture, PLACEMENTS, SITUATIONS, cameraFor, flight } from "./scene.jsx";

/**
 * Which kind of pointer is in front of us.
 *
 * `(pointer: coarse)` rather than a width breakpoint or a user-agent string: what decides
 * this is whether there is a finger on the glass, and a tablet in landscape is as wide as a
 * laptop. Re-read on change, because a tablet with a keyboard attached is both.
 */
export function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const query = window.matchMedia?.("(pointer: coarse)");
    if (!query) return undefined;
    setCoarse(query.matches);
    const onChange = (event) => setCoarse(event.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);
  return coarse;
}

/** How far the finger has to travel before it counts as a direction rather than a tap. */
const SWIPE_MIN = 0.09;

/** Where a pointer landed inside an element, in 0..1 of its own box. */
const pointIn = (element, event) => {
  const box = element?.getBoundingClientRect?.() ?? { left: 0, top: 0, width: 1, height: 1 };
  return {
    x: Math.max(0, Math.min(1, (event.clientX - box.left) / Math.max(1, box.width))),
    y: Math.max(0, Math.min(1, (event.clientY - box.top) / Math.max(1, box.height))),
  };
};

/**
 * The swipe surface: the goal, the five places you can put it, and the ball at your feet.
 *
 * Deliberately the same drawing the replay uses - `PitchStage`, the same camera, the same
 * `PLACEMENTS` - so what you aim at and what you then watch are one picture at two moments
 * rather than a control panel followed by a cutscene.
 */
export function AimSurface({ type, options = [], ruledOut = null, label, hint, onAim }) {
  const surface = useRef(null);
  const [tip, setTip] = useState(null);
  const dragging = useRef(false);
  const situation = SITUATIONS[type] ?? SITUATIONS.penal;
  const camera = cameraFor(type);
  const box = CAMERA_BOX[camera];

  /** Every placement on offer, as a point in the picture. Ruled-out ones are not aimable. */
  const targets = useMemo(
    () =>
      options
        .map((option, index) => ({ option, index, spot: PLACEMENTS[option] }))
        .filter((entry) => entry.spot && entry.index !== ruledOut)
        .map((entry) => ({ ...entry, point: at(entry.spot[0], entry.spot[1]) })),
    [options, ruledOut],
  );

  /** Where the swipe starts: the ball, in the same coordinates everything else is in. */
  const origin = { x: situation.from[0], y: situation.from[1] };
  const toStage = useCallback(
    (point) => ({ x: box.x + point.x * box.width, y: box.y + point.y * box.height }),
    [box],
  );

  /** The placement the finger is currently closest to, or null while it is still at home. */
  const aimed = useMemo(() => {
    if (!tip) return null;
    const travelled = Math.hypot(tip.x - tip.originX, tip.y - tip.originY);
    if (travelled < SWIPE_MIN * box.width) return null;
    let best = null;
    for (const target of targets) {
      const distance = Math.hypot(target.point.x - tip.x, target.point.y - tip.y);
      if (!best || distance < best.distance) best = { ...target, distance };
    }
    return best;
  }, [tip, targets, box.width]);

  const finish = useCallback(() => {
    dragging.current = false;
    const chosen = aimed;
    setTip(null);
    if (chosen) onAim?.(chosen.option);
  }, [aimed, onAim]);

  return (
    <div className="tr-aimer">
      <p className="tr-aimer__prompt">{label}</p>
      <div
        className="tr-aimer__stage"
        ref={surface}
        role="application"
        aria-label={label}
        onPointerDown={(event) => {
          dragging.current = true;
          event.currentTarget.setPointerCapture?.(event.pointerId);
          const point = toStage(pointIn(surface.current, event));
          setTip({ ...point, originX: origin.x, originY: origin.y });
        }}
        onPointerMove={(event) => {
          if (!dragging.current) return;
          const point = toStage(pointIn(surface.current, event));
          setTip({ ...point, originX: origin.x, originY: origin.y });
        }}
        onPointerUp={finish}
        onPointerCancel={() => {
          dragging.current = false;
          setTip(null);
        }}
      >
        <svg viewBox={CAMERA_VIEWBOX[camera]} aria-hidden="true">
          <PitchStage camera={camera}>
            <Furniture type={type} />

            <Figure
              x={at(situation.keeper[0], situation.keeper[1]).x}
              y={68}
              height={34}
              pose={situation.keeperPose ?? "stand"}
              className="tr-scene__keeper"
            />

            {/* The places it can go, marked before you choose - the question is which of
                them, not whether you can find one. Drawn OVER the keeper, because he is
                standing in front of one and a target you cannot see is one you cannot
                choose. */}
            {targets.map((target) => (
              <circle
                key={target.option}
                cx={target.point.x}
                cy={target.point.y}
                r="7"
                className={`tr-aimer__target${aimed?.option === target.option ? " is-aimed" : ""}`}
              />
            ))}

            {/* The line from your boot to your finger, bending the way the strike bends -
                so the flick you make is the flight you are about to watch. */}
            {aimed ? (
              <path
                d={flight(situation.from, aimed.point, situation.bend)}
                className="tr-aimer__flight"
              />
            ) : null}

            <Ball x={origin.x} y={origin.y} />
          </PitchStage>
        </svg>
      </div>
      <p className="tr-aimer__hint">{hint}</p>

      {/*
        The same choices, for anybody who is not dragging anything: a keyboard, a
        screen reader, a switch. Off-screen rather than absent - a gesture that is the only
        way to answer a question is a question some people cannot answer.
      */}
      <div className="tr-aimer__fallback">
        {targets.map((target) => (
          <button key={target.option} type="button" onClick={() => onAim?.(target.option)}>
            {target.option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default AimSurface;
