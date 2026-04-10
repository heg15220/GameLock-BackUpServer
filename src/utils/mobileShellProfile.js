export const MOBILE_SHELL_CATEGORIES = new Set([
  "Arcade",
  "Juegos",
  "Games",
  "Deportes",
  "Sports",
  "Conocimiento",
  "Knowledge",
  "Estrategia",
  "Strategy",
]);

export const MOBILE_FIRST_GAME_IDS = new Set([
  "arcade-orchard-match-blast",
  "arcade-reactor-toss",
  "arcade-golf-tour-2d",
]);

export function getViewportProfile() {
  if (typeof window === "undefined") {
    return {
      width: 0,
      height: 0,
      shortestSide: 0,
      longestSide: 0,
      isMobile: false,
      isPhone: false,
      isTablet: false,
      formFactor: "desktop",
      isTouch: false,
      orientation: "landscape",
    };
  }

  const width = window.innerWidth || 0;
  const height = window.innerHeight || 0;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const hasTouch = (navigator.maxTouchPoints ?? 0) > 0;
  const shortestSide = Math.min(width, height);
  const longestSide = Math.max(width, height);
  const isTouch = coarsePointer || hasTouch;
  const isPhone = shortestSide <= 540;
  const isTablet = !isPhone && shortestSide <= 1024 && longestSide <= 1400;
  const isMobile = isPhone || isTablet;

  return {
    width,
    height,
    shortestSide,
    longestSide,
    isMobile,
    isPhone,
    isTablet,
    formFactor: isPhone ? "phone" : isTablet ? "tablet" : "desktop",
    isTouch,
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
