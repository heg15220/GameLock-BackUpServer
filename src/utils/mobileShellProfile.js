export const MOBILE_SHELL_CATEGORIES = new Set(["Arcade", "Deportes", "Sports"]);

export const MOBILE_FIRST_GAME_IDS = new Set([
  "arcade-orchard-match-blast",
  "arcade-reactor-toss",
  "arcade-golf-tour-2d",
]);

export function getViewportProfile() {
  if (typeof window === "undefined") {
    return {
      isMobile: false,
      orientation: "landscape",
    };
  }

  const width = window.innerWidth || 0;
  const height = window.innerHeight || 0;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const hasTouch = (navigator.maxTouchPoints ?? 0) > 0;
  const shortestSide = Math.min(width, height);

  return {
    isMobile: width <= 920 || ((coarsePointer || hasTouch) && shortestSide <= 1024),
    orientation: height >= width ? "portrait" : "landscape",
  };
}

export function getMobileShellMode(game, viewport) {
  const categoryKey = String(game?.category ?? "");
  if (!MOBILE_SHELL_CATEGORIES.has(categoryKey) || !viewport?.isMobile) {
    return "desktop";
  }
  return MOBILE_FIRST_GAME_IDS.has(game?.id) ? "mobile-first" : "dual-screen";
}
