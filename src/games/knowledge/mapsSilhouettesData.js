import { useEffect, useMemo, useState } from "react";

export const MAP_SILHOUETTE_THEME_IDS = [
  "world",
  "europe",
  "south-america",
  "countries-africa",
  "countries-america",
  "countries-asia",
  "countries-oceania",
  "spain",
  "germany",
  "argentina",
  "australia",
  "austria",
  "belgium",
  "brazil",
  "canada",
  "czechia",
  "china",
  "colombia",
  "cuba",
  "denmark",
  "united-states",
  "finland",
  "france",
  "greece",
  "hungary",
  "india",
  "united-kingdom",
  "iran",
  "ireland",
  "isle-of-man",
  "italy",
  "japan",
  "latvia",
  "liberia",
  "luxembourg",
  "malaysia",
  "mexico",
  "new-zealand",
  "oman",
  "netherlands",
  "pakistan",
  "poland",
  "portugal",
  "romania",
  "russia",
  "serbia",
  "south-africa",
  "sweden",
  "switzerland",
  "taiwan"
];

export const MAP_SILHOUETTE_THEME_LOADERS = {
  "world": () => import("./mapsSilhouettesThemes/world.js"),
  "europe": () => import("./mapsSilhouettesThemes/europe.js"),
  "south-america": () => import("./mapsSilhouettesThemes/south-america.js"),
  "countries-africa": () => import("./mapsSilhouettesThemes/countries-africa.js"),
  "countries-america": () => import("./mapsSilhouettesThemes/countries-america.js"),
  "countries-asia": () => import("./mapsSilhouettesThemes/countries-asia.js"),
  "countries-oceania": () => import("./mapsSilhouettesThemes/countries-oceania.js"),
  "spain": () => import("./mapsSilhouettesThemes/spain.js"),
  "germany": () => import("./mapsSilhouettesThemes/germany.js"),
  "argentina": () => import("./mapsSilhouettesThemes/argentina.js"),
  "australia": () => import("./mapsSilhouettesThemes/australia.js"),
  "austria": () => import("./mapsSilhouettesThemes/austria.js"),
  "belgium": () => import("./mapsSilhouettesThemes/belgium.js"),
  "brazil": () => import("./mapsSilhouettesThemes/brazil.js"),
  "canada": () => import("./mapsSilhouettesThemes/canada.js"),
  "czechia": () => import("./mapsSilhouettesThemes/czechia.js"),
  "china": () => import("./mapsSilhouettesThemes/china.js"),
  "colombia": () => import("./mapsSilhouettesThemes/colombia.js"),
  "cuba": () => import("./mapsSilhouettesThemes/cuba.js"),
  "denmark": () => import("./mapsSilhouettesThemes/denmark.js"),
  "united-states": () => import("./mapsSilhouettesThemes/united-states.js"),
  "finland": () => import("./mapsSilhouettesThemes/finland.js"),
  "france": () => import("./mapsSilhouettesThemes/france.js"),
  "greece": () => import("./mapsSilhouettesThemes/greece.js"),
  "hungary": () => import("./mapsSilhouettesThemes/hungary.js"),
  "india": () => import("./mapsSilhouettesThemes/india.js"),
  "united-kingdom": () => import("./mapsSilhouettesThemes/united-kingdom.js"),
  "iran": () => import("./mapsSilhouettesThemes/iran.js"),
  "ireland": () => import("./mapsSilhouettesThemes/ireland.js"),
  "isle-of-man": () => import("./mapsSilhouettesThemes/isle-of-man.js"),
  "italy": () => import("./mapsSilhouettesThemes/italy.js"),
  "japan": () => import("./mapsSilhouettesThemes/japan.js"),
  "latvia": () => import("./mapsSilhouettesThemes/latvia.js"),
  "liberia": () => import("./mapsSilhouettesThemes/liberia.js"),
  "luxembourg": () => import("./mapsSilhouettesThemes/luxembourg.js"),
  "malaysia": () => import("./mapsSilhouettesThemes/malaysia.js"),
  "mexico": () => import("./mapsSilhouettesThemes/mexico.js"),
  "new-zealand": () => import("./mapsSilhouettesThemes/new-zealand.js"),
  "oman": () => import("./mapsSilhouettesThemes/oman.js"),
  "netherlands": () => import("./mapsSilhouettesThemes/netherlands.js"),
  "pakistan": () => import("./mapsSilhouettesThemes/pakistan.js"),
  "poland": () => import("./mapsSilhouettesThemes/poland.js"),
  "portugal": () => import("./mapsSilhouettesThemes/portugal.js"),
  "romania": () => import("./mapsSilhouettesThemes/romania.js"),
  "russia": () => import("./mapsSilhouettesThemes/russia.js"),
  "serbia": () => import("./mapsSilhouettesThemes/serbia.js"),
  "south-africa": () => import("./mapsSilhouettesThemes/south-africa.js"),
  "sweden": () => import("./mapsSilhouettesThemes/sweden.js"),
  "switzerland": () => import("./mapsSilhouettesThemes/switzerland.js"),
  "taiwan": () => import("./mapsSilhouettesThemes/taiwan.js")
};

const THEME_CACHE = new Map();
const THEME_PROMISES = new Map();

const normalizeThemeIds = (themeIds) => {
  if (!Array.isArray(themeIds)) return [];
  return [...new Set(themeIds.filter((themeId) => typeof themeId === "string" && themeId.length > 0))];
};

export const getMapSilhouetteThemeSync = (themeId) => THEME_CACHE.get(themeId) ?? {};

export const getMapSilhouettesByThemeSync = (themeIds) => {
  const normalizedThemeIds = normalizeThemeIds(themeIds);
  return Object.fromEntries(
    normalizedThemeIds.map((themeId) => [themeId, getMapSilhouetteThemeSync(themeId)])
  );
};

export const loadMapSilhouetteTheme = async (themeId) => {
  if (!themeId || !MAP_SILHOUETTE_THEME_LOADERS[themeId]) return {};
  if (THEME_CACHE.has(themeId)) return THEME_CACHE.get(themeId) ?? {};
  if (!THEME_PROMISES.has(themeId)) {
    THEME_PROMISES.set(
      themeId,
      MAP_SILHOUETTE_THEME_LOADERS[themeId]().then((module) => {
        const themeData = module.default ?? module.MAP_SILHOUETTE_THEME ?? {};
        THEME_CACHE.set(themeId, themeData);
        return themeData;
      })
    );
  }
  return THEME_PROMISES.get(themeId) ?? {};
};

export const loadMapSilhouetteThemes = async (themeIds) => {
  const normalizedThemeIds = normalizeThemeIds(themeIds);
  await Promise.all(normalizedThemeIds.map((themeId) => loadMapSilhouetteTheme(themeId)));
  return getMapSilhouettesByThemeSync(normalizedThemeIds);
};

export const useMapSilhouetteThemes = (themeIds) => {
  const themeKey = Array.isArray(themeIds)
    ? themeIds.filter((themeId) => typeof themeId === "string" && themeId.length > 0).join("|")
    : "";
  const normalizedThemeIds = useMemo(() => normalizeThemeIds(themeIds), [themeKey]);
  const [loadedVersion, setLoadedVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const missingThemeIds = normalizedThemeIds.filter((themeId) => !THEME_CACHE.has(themeId));
    if (!missingThemeIds.length) return undefined;
    Promise.all(missingThemeIds.map((themeId) => loadMapSilhouetteTheme(themeId)))
      .then(() => {
        if (!cancelled) {
          setLoadedVersion((value) => value + 1);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadedVersion((value) => value + 1);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [normalizedThemeIds]);

  const silhouettesByTheme = useMemo(
    () => getMapSilhouettesByThemeSync(normalizedThemeIds),
    [normalizedThemeIds, loadedVersion]
  );

  return {
    silhouettesByTheme,
    isLoading: normalizedThemeIds.some((themeId) => !THEME_CACHE.has(themeId))
  };
};
