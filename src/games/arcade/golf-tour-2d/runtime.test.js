import { describe, expect, it } from "vitest";
import GolfTourRuntime from "./runtime";
import { UI_COPY, localize } from "./copy";
import { GOLF_LEVELS } from "./levels";

function createCanvasStub() {
  const handler = {
    get: (_target, prop) => {
      if (prop === "addEventListener" || prop === "removeEventListener") return () => {};
      if (prop === "setPointerCapture" || prop === "releasePointerCapture") return () => {};
      if (prop === "getContext") {
        return () => new Proxy({}, { get: () => () => ({ addColorStop: () => {} }) });
      }
      if (prop === "getBoundingClientRect") {
        return () => ({ left: 0, top: 0, right: 960, bottom: 540, width: 960, height: 540 });
      }
      if (prop === "style") return {};
      if (prop === "width" || prop === "height") return 960;
      return () => {};
    },
    set: () => true,
  };
  return new Proxy({}, handler);
}

function createRuntime(locale = "es") {
  const ui = localize(UI_COPY, locale);
  return new GolfTourRuntime({
    canvas: createCanvasStub(),
    locale,
    ui,
    onSnapshot: () => {},
    onFullscreenRequest: () => {},
    deviceProfile: "desktop",
  });
}

describe("GolfTourRuntime catalog", () => {
  it("ships exactly 400 levels", () => {
    expect(GOLF_LEVELS).toHaveLength(400);
  });

  it("has multi-zone levels in the masters tour expansion", () => {
    const multiZone = GOLF_LEVELS.filter((level) => (level.zoneCount ?? 1) > 1);
    expect(multiZone.length).toBeGreaterThanOrEqual(80);
    multiZone.forEach((level) => {
      expect(level.zones[0].tee).toBeTruthy();
      expect(level.zones[level.zones.length - 1].hole).toBeTruthy();
    });
  });

  it("keeps each zone within reachable distance with a passable cup", () => {
    GOLF_LEVELS.forEach((level) => {
      const zones = level.zones && level.zones.length > 0 ? level.zones : [{
        terrain: level.terrain, tee: level.tee, hole: level.hole, obstacles: level.obstacles,
      }];
      zones.forEach((zone, idx) => {
        const isFinal = idx === zones.length - 1;
        if (isFinal) {
          expect(zone.hole).toBeTruthy();
          expect(zone.hole.cupWidth).toBeGreaterThanOrEqual(22);
          expect(zone.hole.x).toBeLessThanOrEqual(925);
        }
        if (idx === 0) {
          expect(zone.tee).toBeTruthy();
          expect(zone.tee.x).toBeGreaterThanOrEqual(60);
          expect(zone.tee.x).toBeLessThanOrEqual(240);
        }
      });
    });
  });
});

describe("GolfTourRuntime zone transitions", () => {
  it("synthesizes a single-zone level for legacy levels", () => {
    const runtime = createRuntime();
    runtime.prepareLevel(0);
    runtime.startCampaign();
    expect(runtime.zones.length).toBe(1);
    expect(runtime.currentZoneIndex).toBe(0);
    expect(runtime.level.terrain).toBe(runtime.zones[0].terrain);
  });

  it("activates the first zone of a multi-zone masters tour level", () => {
    const runtime = createRuntime();
    const multiZoneLevel = GOLF_LEVELS.findIndex((level) => (level.zoneCount ?? 1) >= 2);
    expect(multiZoneLevel).toBeGreaterThan(-1);
    runtime.save.unlockedLevelIndex = multiZoneLevel;
    runtime.prepareLevel(multiZoneLevel);
    runtime.startCampaign();
    expect(runtime.zones.length).toBeGreaterThanOrEqual(2);
    expect(runtime.currentZoneIndex).toBe(0);
    expect(runtime.level.tee).toBeTruthy();
    // first zone hole must be the off-screen sentinel
    expect(runtime.level.hole.x).toBeLessThan(0);
  });

  it("advanceZone wraps the ball coordinates and does not add strokes", () => {
    const runtime = createRuntime();
    const multiZoneLevel = GOLF_LEVELS.findIndex((level) => (level.zoneCount ?? 1) >= 2);
    runtime.save.unlockedLevelIndex = multiZoneLevel;
    runtime.prepareLevel(multiZoneLevel);
    runtime.startCampaign();
    runtime.aim.angleDeg = -25;
    runtime.aim.power = 1;
    runtime.launchBall();
    const strokesAfterLaunch = runtime.levelStrokes;
    // Simulate the ball flying past the right edge, the same condition the update loop tests.
    runtime.ball.x = 1015;
    runtime.ball.y = 200;
    runtime.ball.vx = 800;
    runtime.ball.vy = -120;
    const advanced = runtime.advanceZone();
    expect(advanced).toBe(true);
    expect(runtime.currentZoneIndex).toBe(1);
    expect(runtime.levelStrokes).toBe(strokesAfterLaunch);
    expect(runtime.ball.x).toBeGreaterThan(0);
    expect(runtime.ball.x).toBeLessThan(960);
    // velocity must be preserved through the checkpoint
    expect(runtime.ball.vx).toBeCloseTo(800, 0);
  });

  it("advanceZone refuses to advance past the final zone", () => {
    const runtime = createRuntime();
    runtime.prepareLevel(0);
    runtime.startCampaign();
    expect(runtime.advanceZone()).toBe(false);
  });

  it("only emboca on the final zone", () => {
    const runtime = createRuntime();
    const multiZoneLevel = GOLF_LEVELS.findIndex((level) => (level.zoneCount ?? 1) >= 2);
    runtime.save.unlockedLevelIndex = multiZoneLevel;
    runtime.prepareLevel(multiZoneLevel);
    runtime.startCampaign();
    // Place ball near the off-screen hole sentinel and force motion - should NOT trigger cup capture
    runtime.ball.x = -2000;
    runtime.ball.y = -2000;
    runtime.ball.moving = true;
    runtime.ball.vx = 0;
    runtime.ball.vy = 0;
    runtime.updateCupCapture(16);
    expect(runtime.ball.inCup).toBe(false);
  });
});
