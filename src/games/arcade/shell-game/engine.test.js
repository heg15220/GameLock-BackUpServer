import { describe, expect, it } from "vitest";
import { ShellGameRuntime } from "./engine.js";
import { LIFT_RATIO, slotAtPoint, layoutFor, slotX } from "./scene.js";

// A canvas stub: every 2d call is a no-op, so the runtime can be driven headless
// and we can assert on its state rather than on pixels.
function stubCtx() {
  const gradient = { addColorStop() {} };
  return new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "createLinearGradient" || prop === "createRadialGradient") return () => gradient;
        if (prop === "measureText") return () => ({ width: 10 });
        if (prop === "canvas") return { width: 960, height: 540 };
        return () => {};
      },
      set() {
        return true;
      },
    },
  );
}

function makeRuntime(seed = 7) {
  const ctx = stubCtx();
  const canvas = {
    clientWidth: 960,
    clientHeight: 540,
    width: 960,
    height: 540,
    style: {},
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }),
    addEventListener() {},
    removeEventListener() {},
  };
  const snapshots = [];
  const rt = new ShellGameRuntime({
    canvas,
    locale: "en",
    onSnapshot: (s) => snapshots.push(s),
    onFullscreen() {},
    seed,
  });
  // No start()/handleResize() here: those reach for `window`, and the
  // constructor already sizes the stage from the canvas.
  return { rt, snapshots };
}

// Run the clock until the runtime leaves `screen`, or give up.
function runUntilLeaves(rt, screen, cap = 4000) {
  for (let i = 0; i < cap && rt.screen === screen; i++) rt.update(1 / 60);
  return rt.screen;
}

const toPick = (rt) => {
  rt.startGame();
  runUntilLeaves(rt, "place");
  runUntilLeaves(rt, "shuffle");
  return rt;
};

describe("shell game runtime — a round end to end", () => {
  it("walks menu → place → shuffle → pick", () => {
    const { rt } = makeRuntime();
    expect(rt.screen).toBe("menu");
    rt.startGame();
    expect(rt.screen).toBe("place");
    expect(runUntilLeaves(rt, "place")).toBe("shuffle");
    expect(runUntilLeaves(rt, "shuffle")).toBe("pick");
  });

  it("scores the cup the ball actually ended under", () => {
    // The end-to-end version of the fairness contract: whatever the plan says,
    // picking the slot the ball's cup settled on has to be a hit.
    for (let seed = 1; seed <= 25; seed++) {
      const { rt } = makeRuntime(seed);
      toPick(rt);
      rt.guess(rt.plan.finalBallSlot);
      expect(rt.pickCorrect).toBe(true);
      expect(rt.state.streak).toBe(1);
      expect(rt.state.lives).toBe(3);
    }
  });

  it("counts any other cup as a miss", () => {
    const { rt } = makeRuntime(3);
    toPick(rt);
    const wrong = (rt.plan.finalBallSlot + 1) % rt.plan.cups;
    rt.guess(wrong);
    expect(rt.pickCorrect).toBe(false);
    expect(rt.state.lives).toBe(2);
  });

  it("climbs to the next round after a hit and ends after three misses", () => {
    const { rt } = makeRuntime(11);
    toPick(rt);
    rt.guess(rt.plan.finalBallSlot);
    expect(rt.screen).toBe("reveal");
    runUntilLeaves(rt, "reveal");
    expect(rt.screen).toBe("place");
    expect(rt.state.level).toBe(2);

    for (let i = 0; i < 3; i++) {
      runUntilLeaves(rt, "place");
      runUntilLeaves(rt, "shuffle");
      rt.guess((rt.plan.finalBallSlot + 1) % rt.plan.cups);
      runUntilLeaves(rt, "reveal");
    }
    expect(rt.screen).toBe("over");
    expect(rt.state.over).toBe(true);
  });

  it("ignores guesses outside the pick phase", () => {
    const { rt } = makeRuntime();
    rt.startGame();
    rt.guess(0); // still placing
    expect(rt.screen).toBe("place");
    expect(rt.state.rounds).toBe(0);
  });

  it("ignores a guess at a cup that is not on the table", () => {
    const { rt } = makeRuntime();
    toPick(rt);
    rt.guess(9);
    expect(rt.screen).toBe("pick");
  });

  it("reports the round to the mobile bridge", () => {
    const { rt, snapshots } = makeRuntime();
    toPick(rt);
    rt.guess(rt.plan.finalBallSlot);
    const last = snapshots[snapshots.length - 1];
    expect(last.mode).toBe("arcade-shell-game");
    expect(last.level).toBe(2);
    expect(last.streak).toBe(1);
    expect(last.cups).toBe(3);
  });
});

describe("shell game runtime — the view it hands the scene", () => {
  it("keeps the ball on its cup for the whole shuffle", () => {
    // The scene draws the ball at view.ball.slot and the cup at cups[ballCup];
    // if those ever drift apart the player is watching a lie.
    const { rt } = makeRuntime(5);
    rt.startGame();
    runUntilLeaves(rt, "place");
    for (let i = 0; i < 600 && rt.screen === "shuffle"; i++) {
      const view = rt.buildView();
      expect(view.ball.slot).toBeCloseTo(view.cups[rt.plan.ballCup].slot, 9);
      rt.update(1 / 60);
    }
  });

  it("never leaves two cups sitting on the same spot", () => {
    const { rt } = makeRuntime(9);
    rt.startGame();
    runUntilLeaves(rt, "place");
    for (let i = 0; i < 600 && rt.screen === "shuffle"; i++) {
      const { cups } = rt.buildView();
      for (let a = 0; a < cups.length; a++) {
        for (let b = a + 1; b < cups.length; b++) {
          // Same slot is only allowed when one is genuinely in front of the
          // other — that is what the depth swing is for.
          if (Math.abs(cups[a].slot - cups[b].slot) < 0.22) {
            expect(Math.abs(cups[a].depth - cups[b].depth)).toBeGreaterThan(0.1);
          }
        }
      }
      rt.update(1 / 60);
    }
  });

  it("settles every cup on a whole slot once the shuffle is done", () => {
    const { rt } = makeRuntime(13);
    toPick(rt);
    for (const cup of rt.buildView().cups) {
      expect(Math.abs(cup.slot - Math.round(cup.slot))).toBeLessThan(1e-9);
      expect(cup.depth).toBe(0);
    }
  });

  it("shows the ball while placing, hides it through the shuffle, shows it on reveal", () => {
    const { rt } = makeRuntime();
    rt.startGame();
    expect(rt.buildView().ball.visible).toBe(true);
    runUntilLeaves(rt, "place");
    expect(rt.buildView().ball.visible).toBe(false);
    runUntilLeaves(rt, "shuffle");
    rt.guess(rt.plan.finalBallSlot);
    expect(rt.buildView().ball.visible).toBe(true);
  });
});

describe("shell game runtime — picking a cup on the stage", () => {
  it("maps a tap on a cup back to its slot", () => {
    const layout = layoutFor(960, 540, 4);
    for (let slot = 0; slot < 4; slot++) {
      expect(slotAtPoint(layout, slotX(layout, slot), layout.baseY - layout.cupH * 0.4)).toBe(slot);
    }
  });

  it("ignores a tap on the empty felt above or below the cups", () => {
    const layout = layoutFor(960, 540, 4);
    expect(slotAtPoint(layout, slotX(layout, 0), 5)).toBe(-1);
    expect(slotAtPoint(layout, slotX(layout, 0), 539)).toBe(-1);
  });

  it("fits five cups on the stage without overlapping them", () => {
    const layout = layoutFor(640, 360, 5);
    expect(layout.left).toBeGreaterThanOrEqual(0);
    expect(layout.left + layout.span).toBeLessThanOrEqual(640);
    expect(layout.gap).toBeGreaterThan(0);
    for (let i = 1; i < 5; i++) {
      expect(slotX(layout, i) - slotX(layout, i - 1)).toBeGreaterThan(layout.cupW);
    }
  });
});

describe("shell game layout — uses the whole stage it is given", () => {
  // Mobile fullscreen hands the canvas a tall portrait box. The cups have to
  // grow into it rather than stay pinned at some desktop-shaped size.
  // Portrait fullscreen gives back a 96px band (140px on tablet) for the
  // touch-stage ad vignette, so the stage the canvas actually gets is shorter
  // than the viewport. Both shapes are covered.
  const STAGES = [
    ["desktop 16/9", 960, 540],
    ["phone portrait", 390, 780],
    ["phone portrait minus ad band", 390, 684],
    ["tall phone portrait minus ad band", 412, 819],
    ["phone landscape", 780, 390],
    ["tablet portrait", 820, 1180],
    ["tablet portrait minus ad band", 820, 1040],
  ];

  it("never letterboxes: the cups scale with the stage, with no fixed ceiling", () => {
    for (const cups of [3, 4, 5]) {
      const small = layoutFor(390, 780, cups);
      const large = layoutFor(820, 1180, cups);
      expect(large.cupW).toBeGreaterThan(small.cupW);
      expect(large.cupH).toBeGreaterThan(small.cupH);
    }
  });

  it("keeps the cups on the stage and off each other, on every shape", () => {
    for (const [name, w, h] of STAGES) {
      for (const cups of [3, 4, 5]) {
        const layout = layoutFor(w, h, cups);
        expect(layout.cupW, name).toBeGreaterThan(0);
        expect(layout.left, name).toBeGreaterThanOrEqual(0);
        expect(layout.left + layout.span, name).toBeLessThanOrEqual(w + 1e-9);
        for (let i = 1; i < cups; i++) {
          expect(slotX(layout, i) - slotX(layout, i - 1), name).toBeGreaterThan(layout.cupW);
        }
      }
    }
  });

  it("leaves a raised cup room to rise without colliding with the HUD", () => {
    for (const [name, w, h] of STAGES) {
      for (const cups of [3, 4, 5]) {
        const layout = layoutFor(w, h, cups);
        const topAtFullLift = layout.baseY - layout.cupH * (1 + LIFT_RATIO);
        // The HUD sits in the top tenth of the stage; a cup at full lift on the
        // reveal must not run into it.
        expect(topAtFullLift, `${name} / ${cups} cups`).toBeGreaterThan(h * 0.1);
        expect(layout.baseY, name).toBeLessThan(h);
      }
    }
  });

  it("keeps felt behind a standing cup on every shape", () => {
    // A cup at rest has to read as sitting on the table, not floating against
    // the back wall. (Once raised it is in the air, so the backdrop is fine.)
    for (const [name, w, h] of STAGES) {
      const layout = layoutFor(w, h, 5);
      expect(layout.feltY, name).toBeLessThan(layout.baseY - layout.cupH);
    }
  });

  it("still picks the right cup after the stage changes shape", () => {
    for (const [name, w, h] of STAGES) {
      const layout = layoutFor(w, h, 4);
      for (let slot = 0; slot < 4; slot++) {
        expect(slotAtPoint(layout, slotX(layout, slot), layout.baseY - layout.cupH * 0.4), name).toBe(
          slot,
        );
      }
    }
  });
});
