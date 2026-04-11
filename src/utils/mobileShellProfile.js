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

const PHONE_MAX_SHORTEST_SIDE = 540;
const TABLET_MAX_SHORTEST_SIDE = 1100;
const TABLET_MAX_LONGEST_SIDE = 1600;
const LARGE_TOUCH_TABLET_MAX_SHORTEST_SIDE = 1280;
const LARGE_TOUCH_TABLET_MAX_LONGEST_SIDE = 1800;

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
  const finePointer = window.matchMedia?.("(pointer: fine)")?.matches ?? false;
  const hasTouch = (navigator.maxTouchPoints ?? 0) > 0;
  const shortestSide = Math.min(width, height);
  const longestSide = Math.max(width, height);
  const isTouch = coarsePointer || (hasTouch && !finePointer);
  const isPhone = shortestSide <= PHONE_MAX_SHORTEST_SIDE;
  const fitsDefaultTabletRange =
    shortestSide <= TABLET_MAX_SHORTEST_SIDE && longestSide <= TABLET_MAX_LONGEST_SIDE;
  const fitsLargeTouchTabletRange =
    isTouch &&
    shortestSide <= LARGE_TOUCH_TABLET_MAX_SHORTEST_SIDE &&
    longestSide <= LARGE_TOUCH_TABLET_MAX_LONGEST_SIDE;
  const isTablet =
    !isPhone &&
    isTouch &&
    (fitsDefaultTabletRange || fitsLargeTouchTabletRange);
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
