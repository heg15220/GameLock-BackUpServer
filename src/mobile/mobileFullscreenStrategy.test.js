import { describe, expect, it } from "vitest";
import {
  isIosLikeDevice,
  shouldUsePseudoFullscreen,
  supportsNativeElementFullscreen,
} from "./mobileFullscreenStrategy";

describe("supportsNativeElementFullscreen", () => {
  it("returns false on iPhone Safari (no fullscreen API on elements)", () => {
    const doc = { fullscreenEnabled: false };
    const target = {}; // no requestFullscreen / webkitRequestFullscreen
    expect(supportsNativeElementFullscreen(target, doc)).toBe(false);
  });

  it("returns true when the document allows fullscreen and the element can request it", () => {
    const doc = { fullscreenEnabled: true };
    const target = { requestFullscreen: () => {} };
    expect(supportsNativeElementFullscreen(target, doc)).toBe(true);
  });

  it("returns false when the document disallows fullscreen even if the element exposes the method", () => {
    const doc = { fullscreenEnabled: false, webkitFullscreenEnabled: false };
    const target = { webkitRequestFullscreen: () => {} };
    expect(supportsNativeElementFullscreen(target, doc)).toBe(false);
  });

  it("returns false without a target or document", () => {
    expect(supportsNativeElementFullscreen(null, { fullscreenEnabled: true })).toBe(false);
    expect(supportsNativeElementFullscreen({ requestFullscreen: () => {} }, undefined)).toBe(false);
  });
});

describe("isIosLikeDevice", () => {
  it("detects an iPhone", () => {
    expect(
      isIosLikeDevice({
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        platform: "iPhone",
        maxTouchPoints: 5,
      })
    ).toBe(true);
  });

  it("detects an iPad in desktop mode (reports as MacIntel with touch)", () => {
    expect(
      isIosLikeDevice({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
        platform: "MacIntel",
        maxTouchPoints: 5,
      })
    ).toBe(true);
  });

  it("does not flag a real desktop Mac (no touch points)", () => {
    expect(
      isIosLikeDevice({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
        platform: "MacIntel",
        maxTouchPoints: 0,
      })
    ).toBe(false);
  });

  it("does not flag an Android phone", () => {
    expect(
      isIosLikeDevice({
        userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36",
        platform: "Linux armv8l",
        maxTouchPoints: 5,
      })
    ).toBe(false);
  });
});

describe("shouldUsePseudoFullscreen", () => {
  it("uses pseudo fullscreen on an iPhone in portrait (root cause of the blank screen)", () => {
    expect(
      shouldUsePseudoFullscreen({
        formFactor: "phone",
        isPortrait: true,
        iosLike: true,
        nativeFullscreenSupported: false,
      })
    ).toBe(true);
  });

  it("uses pseudo fullscreen on an iPad in portrait", () => {
    expect(
      shouldUsePseudoFullscreen({
        formFactor: "tablet",
        isPortrait: true,
        iosLike: true,
        nativeFullscreenSupported: true,
      })
    ).toBe(true);
  });

  it("keeps native fullscreen on an Android phone that supports it", () => {
    expect(
      shouldUsePseudoFullscreen({
        formFactor: "phone",
        isPortrait: true,
        iosLike: false,
        nativeFullscreenSupported: true,
      })
    ).toBe(false);
  });

  it("keeps existing tablet-landscape pseudo fullscreen behaviour", () => {
    expect(
      shouldUsePseudoFullscreen({
        formFactor: "tablet",
        isPortrait: false,
        iosLike: false,
        nativeFullscreenSupported: true,
      })
    ).toBe(true);
  });

  it("falls back to pseudo fullscreen whenever native support is missing", () => {
    expect(
      shouldUsePseudoFullscreen({
        formFactor: "phone",
        isPortrait: true,
        iosLike: false,
        nativeFullscreenSupported: false,
      })
    ).toBe(true);
  });
});
