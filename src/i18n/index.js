import { useMemo } from "react";
import resolveBrowserLanguage from "../utils/resolveBrowserLanguage";
import { gameCatalogDescriptions } from "../data/gameCatalogDescriptions";

const STRINGS = {
  es: {
    pill: "SaaS de juegos web",
    heroTitle: "Playforge Studio",
    heroCopy:
      "Catálogo de juegos jugables y técnicamente viables. Cada categoría incorpora dirección artística de referencia para llevar la experiencia a nivel profesional en móvil, tablet y escritorio.",
    statsGames: "Juegos disponibles",
    statsThemes: "Temáticas activas",
    statsViability: "Viabilidad técnica",
    statsViabilityValue: "100% Alta",
    exploreTitle: "Explorar juegos",
    allCategories: "Todas",
    difficulty: "Dificultad",
    startGame: "Comenzar",
    objective: "Objetivo",
    howToPlay: "Cómo jugar",
    controls: "Controles",
    playNow: "Jugando",
    loading: "Cargando motor del juego...",
    unsupported: "Este juego todavía no tiene motor jugable asignado.",
    back: "← Volver al catálogo",
    showInfo: "? Instrucciones",
    hideInfo: "✕ Ocultar",
    sessionLabel: "Sesión",
    modeLabel: "Modo",
    footerNote:
      "Plataforma orientada a modelo SaaS: cada categoría puede crecer con nuevos juegos completos sin romper la arquitectura del frontend.",
  },
  en: {
    pill: "Web games SaaS",
    heroTitle: "Playforge Studio",
    heroCopy:
      "A catalog of playable, technically viable games. Each category includes reference art direction to deliver a professional experience across mobile, tablet and desktop.",
    statsGames: "Available games",
    statsThemes: "Active themes",
    statsViability: "Technical viability",
    statsViabilityValue: "100% High",
    exploreTitle: "Explore games",
    allCategories: "All",
    difficulty: "Difficulty",
    startGame: "Play",
    objective: "Objective",
    howToPlay: "How to play",
    controls: "Controls",
    playNow: "Now playing",
    loading: "Loading game engine...",
    unsupported: "This game does not have a playable engine assigned yet.",
    back: "← Back to catalog",
    showInfo: "? Instructions",
    hideInfo: "✕ Hide",
    sessionLabel: "Session",
    modeLabel: "Mode",
    footerNote:
      "SaaS-oriented platform: each category can grow with new complete games without breaking the frontend architecture.",
  },
};

const CATEGORY_NAMES = {
  Aventura: { es: "Aventura", en: "Adventure" },
  Accion: { es: "Acción", en: "Action" },
  Arcade: { es: "Arcade", en: "Arcade" },
  Juegos: { es: "Juegos", en: "Games" },
  Deportes: { es: "Deportes", en: "Sports" },
  Carreras: { es: "Carreras", en: "Racing" },
  Conocimiento: { es: "Conocimiento", en: "Knowledge" },
  Estrategia: { es: "Estrategia", en: "Strategy" },
  RPG: { es: "RPG", en: "RPG" },
};

export function useLocale() {
  return useMemo(resolveBrowserLanguage, []);
}

export function useTranslations() {
  const locale = useLocale();
  const strings = STRINGS[locale] ?? STRINGS.en;
  return {
    t: (key) => strings[key] ?? key,
    locale,
  };
}

export function localizeCategory(categoryKey, locale) {
  return CATEGORY_NAMES[categoryKey]?.[locale] ?? categoryKey;
}

export function getLocalizedGame(game, locale) {
  const isEn = locale === "en";
  const catalogCopy = gameCatalogDescriptions[game.id];
  return {
    ...game,
    tagline: isEn ? game.tagline_en ?? game.tagline : game.tagline,
    catalogDescription: isEn
      ? catalogCopy?.en ?? game.catalogDescription_en ?? game.description_en ?? game.description
      : catalogCopy?.es ?? game.catalogDescription ?? game.description,
    category: isEn ? game.category_en ?? game.category : game.category,
    description: isEn ? game.description_en ?? game.description : game.description,
    highlights: isEn ? game.highlights_en ?? game.highlights : game.highlights,
    difficulty: isEn ? game.difficulty_en ?? game.difficulty : game.difficulty,
    multiplayer: isEn ? game.multiplayer_en ?? game.multiplayer : game.multiplayer,
    objective: isEn ? game.objective_en : game.objective_es,
    howToPlay: isEn ? game.howToPlay_en : game.howToPlay_es,
  };
}
