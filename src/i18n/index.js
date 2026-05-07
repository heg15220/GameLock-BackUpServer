import { useMemo } from "react";
import resolveBrowserLanguage from "../utils/resolveBrowserLanguage";
import { gameCatalogDescriptions } from "../data/gameCatalogDescriptions";

const STRINGS = {
  es: {
    heroTagline: "¡Una plataforma de juegos donde hay variedad para todos los gustos!",
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
  },
  en: {
    heroTagline: "A gaming platform where variety is yours to choose!",
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
    image: isEn ? game.image_en ?? game.image : game.image,
    title: isEn ? game.title_en ?? game.title : game.title,
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
