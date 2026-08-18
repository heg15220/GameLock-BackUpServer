/**
 * The placement, chosen with the hand in front of it.
 *
 * A placement is a DIRECTION, and three words in a row is the wrong instrument for one on a
 * phone: you read it, translate it and press a rectangle. These are the two things the
 * touch face has to be true about - that the gesture says what it looks like it says, and
 * that it hands the model exactly what the buttons always handed it.
 */

// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import React from "react";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";

import AimSurface from "./aim.jsx";
import { PLACEMENTS, SITUATIONS, cameraFor } from "./scene.jsx";
import { CAMERA_BOX, at } from "./pitch.jsx";
import { SHOT_TYPES } from "./bigmatch.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const SURFACE = { left: 0, top: 0, width: 400, height: 240 };

function mount(element) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(element));
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

/** Where a stage point sits inside the surface, as the pixels a finger would land on. */
const pixelsFor = (type, point) => {
  const box = CAMERA_BOX[cameraFor(type)];
  return {
    clientX: ((point.x - box.x) / box.width) * SURFACE.width,
    clientY: ((point.y - box.y) / box.height) * SURFACE.height,
  };
};

const stage = (container) => {
  const el = container.querySelector(".tr-aimer__stage");
  el.getBoundingClientRect = () => SURFACE;
  el.setPointerCapture = () => {};
  return el;
};

const drag = (el, to) => {
  for (const [type, point] of [["pointerdown", to], ["pointermove", to], ["pointerup", to]]) {
    const event = new window.MouseEvent(type, { bubbles: true, ...point });
    act(() => el.dispatchEvent(event));
  }
};

describe("flicking the ball where you want it", () => {
  const type = "penal";
  const options = SHOT_TYPES[type];

  it("takes the placement the finger let go on", () => {
    for (const option of options) {
      const onAim = vi.fn();
      const view = mount(React.createElement(AimSurface, { type, options, onAim, label: "x" }));
      const el = stage(view.container);
      drag(el, pixelsFor(type, at(...PLACEMENTS[option])));
      expect(onAim, `swiping at ${option} chose nothing`).toHaveBeenCalledTimes(1);
      expect(onAim).toHaveBeenCalledWith(option);
      view.unmount();
    }
  });

  /**
   * A tap is not a direction. Without this the surface answers the moment it is touched,
   * which on a phone means a scroll that grazed it has taken your penalty.
   */
  it("ignores a touch that never went anywhere", () => {
    const onAim = vi.fn();
    const view = mount(React.createElement(AimSurface, { type, options, onAim, label: "x" }));
    const el = stage(view.container);
    drag(el, pixelsFor(type, { x: SITUATIONS[type].from[0], y: SITUATIONS[type].from[1] }));
    expect(onAim).not.toHaveBeenCalled();
    view.unmount();
  });

  it("marks the target the finger is on before it is let go", () => {
    const view = mount(
      React.createElement(AimSurface, { type, options, onAim: () => {}, label: "x" }),
    );
    const el = stage(view.container);
    expect(view.container.querySelector(".tr-aimer__target.is-aimed")).toBeNull();

    const point = pixelsFor(type, at(...PLACEMENTS[options[2]]));
    act(() => el.dispatchEvent(new window.MouseEvent("pointerdown", { bubbles: true, ...point })));
    expect(view.container.querySelector(".tr-aimer__target.is-aimed")).toBeTruthy();
    // And the flight it would take, so the flick you make is the flight you watch.
    expect(view.container.querySelector(".tr-aimer__flight")).toBeTruthy();
    view.unmount();
  });

  /**
   * `ruledOut` is the read a high rating buys: one option removed. It has to be removed
   * from the SURFACE too, or the one thing the rating bought is a target you can still hit.
   */
  it("will not let you aim at the option his read has ruled out", () => {
    const onAim = vi.fn();
    const view = mount(
      React.createElement(AimSurface, { type, options, ruledOut: 0, onAim, label: "x" }),
    );
    const el = stage(view.container);
    expect(view.container.querySelectorAll(".tr-aimer__target")).toHaveLength(
      options.length - 1,
    );
    drag(el, pixelsFor(type, at(...PLACEMENTS[options[0]])));
    // The nearest LIVE target wins instead - never the one that was taken away.
    expect(onAim).toHaveBeenCalledTimes(1);
    expect(onAim.mock.calls[0][0]).not.toBe(options[0]);
    view.unmount();
  });

  it("offers every chance in the game a surface that can be aimed", () => {
    for (const [shotType, shotOptions] of Object.entries(SHOT_TYPES)) {
      const onAim = vi.fn();
      const view = mount(
        React.createElement(AimSurface, { type: shotType, options: shotOptions, onAim, label: "x" }),
      );
      expect(
        view.container.querySelectorAll(".tr-aimer__target"),
        `${shotType} drew no targets`,
      ).toHaveLength(shotOptions.length);
      const el = stage(view.container);
      drag(el, pixelsFor(shotType, at(...PLACEMENTS[shotOptions[1]])));
      expect(onAim, `${shotType} could not be aimed`).toHaveBeenCalledWith(shotOptions[1]);
      view.unmount();
    }
  });

  it("still answers a keyboard, for anybody who is not dragging anything", () => {
    const onAim = vi.fn();
    const view = mount(React.createElement(AimSurface, { type, options, onAim, label: "x" }));
    const buttons = view.container.querySelectorAll(".tr-aimer__fallback button");
    expect(buttons).toHaveLength(options.length);
    act(() => buttons[1].dispatchEvent(new window.MouseEvent("click", { bubbles: true })));
    expect(onAim).toHaveBeenCalledWith(options[1]);
    view.unmount();
  });
});
