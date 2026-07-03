// Strategy helpers for deciding how the mobile shell should go "fullscreen".
//
// iOS Safari does not support the element Fullscreen API on generic elements
// (only <video> via webkitEnterFullscreen). On iPhone `requestFullscreen` /
// `webkitRequestFullscreen` are simply undefined, and on iPad the behaviour is
// inconsistent. Attempting the native API there enters an optimistic
// "transitioning" state that is only cleared by a `fullscreenchange` event that
// never fires, leaving the game surface stuck at opacity:0 (blank screen).
//
// For those devices we fall back to a CSS-based pseudo fullscreen overlay that
// works reliably and never touches the transitioning state.

export function supportsNativeElementFullscreen(
  target,
  doc = typeof document !== "undefined" ? document : undefined
) {
  if (!target || !doc) {
    return false;
  }
  const enabled = doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled ?? false;
  const canRequest =
    typeof target.requestFullscreen === "function" ||
    typeof target.webkitRequestFullscreen === "function";
  return Boolean(enabled && canRequest);
}

export function isIosLikeDevice(
  nav = typeof navigator !== "undefined" ? navigator : undefined
) {
  if (!nav) {
    return false;
  }
  const ua = nav.userAgent || "";
  const platform = nav.platform || "";
  const maxTouchPoints = nav.maxTouchPoints || 0;

  if (/iPad|iPhone|iPod/.test(ua)) {
    return true;
  }
  if (/iP(hone|ad|od)/.test(platform)) {
    return true;
  }
  // iPadOS 13+ requests desktop sites by default and reports itself as a
  // touch-capable Mac. There are no touch-screen Macs running Safari, so this
  // combination reliably identifies an iPad.
  if (platform === "MacIntel" && maxTouchPoints > 1) {
    return true;
  }
  return false;
}

// Decide whether the shell should use the CSS pseudo fullscreen overlay instead
// of the native Fullscreen API.
export function shouldUsePseudoFullscreen({
  formFactor,
  isPortrait,
  iosLike,
  nativeFullscreenSupported,
}) {
  // Existing behaviour: tablets in landscape already use the pseudo overlay.
  if (formFactor === "tablet" && !isPortrait) {
    return true;
  }
  // iOS devices cannot rely on the native element Fullscreen API.
  if (iosLike) {
    return true;
  }
  // Any other environment that lacks native element fullscreen support.
  if (!nativeFullscreenSupported) {
    return true;
  }
  return false;
}
