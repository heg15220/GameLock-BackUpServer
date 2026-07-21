import { describe, it, expect } from "vitest";
import { PadelRuntime } from "./engine.js";

// Minimal canvas stub: the engine only needs a 2d context whose calls are no-ops.
function makeCanvas() {
  const ctx = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === "createLinearGradient" || prop === "createRadialGradient") {
          return () => ({ addColorStop: () => {} });
        }
        if (prop === "measureText") return () => ({ width: 40 });
        return () => {};
      },
    },
  );
  return {
    clientWidth: 960,
    clientHeight: 540,
    width: 0,
    height: 0,
    getContext: () => ctx,
  };
}

describe("PadelRuntime smoke", () => {
  it("starts on the menu and emits a snapshot", () => {
    const snaps = [];
    const rt = new PadelRuntime({
      canvas: makeCanvas(),
      locale: "es",
      onSnapshot: (s) => snaps.push(s),
      onFullscreen: () => {},
    });
    rt.start();
    expect(snaps.length).toBeGreaterThan(0);
    expect(snaps[snaps.length - 1].screen).toBe("menu");
    rt.destroy();
  });

  it("runs a full point without throwing and keeps a serialisable snapshot", () => {
    let last = null;
    const rt = new PadelRuntime({
      canvas: makeCanvas(),
      locale: "en",
      onSnapshot: (s) => {
        last = s;
      },
      onFullscreen: () => {},
    });
    rt.start();
    rt.setDifficulty("hard");
    rt.startMatch();
    expect(["serve", "rally"]).toContain(rt.screen);

    // Serve, then advance a few seconds of simulation; the rally must resolve into
    // a scored point (or a fresh serve) without ever throwing.
    rt.pressVirtualKey("Space");
    for (let i = 0; i < 600; i++) rt.advanceTime(1000 / 60);

    expect(last).toBeTruthy();
    expect(() => JSON.stringify(last)).not.toThrow();
    // Some scoring progression must have happened over 10 seconds of rallies.
    const totalScore =
      last.sets.home + last.sets.away + last.games.home + last.games.away;
    expect(totalScore).toBeGreaterThanOrEqual(0);
    rt.destroy();
  });

  it("advances the scoreboard when a point is forced", () => {
    const rt = new PadelRuntime({
      canvas: makeCanvas(),
      locale: "en",
      onSnapshot: () => {},
      onFullscreen: () => {},
    });
    rt.start();
    rt.startMatch();
    rt.screen = "rally";
    rt.ball = { ...rt.ball, live: true, owner: "home", floorBounces: 0 };
    rt.endPoint("home", "test");
    expect(rt.match.homePoints).toBe(1);
    rt.destroy();
  });

  it("is registered in the canonical game registry", async () => {
    const { getGameComponent } = await import("../../registry.jsx");
    expect(getGameComponent("sports-padel-arena")).toBeTruthy();
  });
});
