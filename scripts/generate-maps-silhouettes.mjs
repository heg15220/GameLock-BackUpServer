import fs from "node:fs";
import path from "node:path";
import {
  CONTINENT_MAPS,
  COUNTRY_MAPS,
  resolveMapDefinition
} from "../src/games/knowledge/mapsKnowledgeData.js";
import { MAP_COUNTRY_PROVINCE_CATALOG } from "../src/games/knowledge/mapsCountryProvincesData.js";

const ROOT = process.cwd();
const COUNTRIES_PATH = path.join(ROOT, "tmp-countries-dataset.geojson");
const SPAIN_PROVINCES_PATH = path.join(ROOT, "tmp-spain-provinces.geojson");
const OUTPUT_PATH = path.join(ROOT, "src/games/knowledge/mapsSilhouettesData.js");
const OUTPUT_THEME_DIR = path.join(ROOT, "src/games/knowledge/mapsSilhouettesThemes");

const MAP_REGION_BOUNDS = {
  europe: { minLon: -32, maxLon: 46, minLat: 26, maxLat: 73 },
  "south-america": { minLon: -93, maxLon: -28, minLat: -58, maxLat: 18 },
  spain: { minLon: -19.5, maxLon: 5.5, minLat: 27, maxLat: 45.5 },
  "countries-africa": { minLon: -25, maxLon: 60, minLat: -38, maxLat: 40 },
  "countries-america": { minLon: -171, maxLon: -28, minLat: -58, maxLat: 84 },
  "countries-asia": { minLon: 24, maxLon: 181, minLat: -12, maxLat: 82 },
  "countries-oceania": { minLon: 109, maxLon: 181, minLat: -50, maxLat: 32 }
};

const MAP_SIMPLIFICATION = {
  world: { minDistance: 0.75, maxPoints: 95, minArea: 0.08, paddingPercent: 4.5 },
  europe: { minDistance: 0.18, maxPoints: 90, minArea: 0.02, paddingPercent: 5 },
  "south-america": { minDistance: 0.16, maxPoints: 90, minArea: 0.02, paddingPercent: 5 },
  spain: { minDistance: 0.1, maxPoints: 70, minArea: 0.01, paddingPercent: 4.2 },
  "countries-africa": { minDistance: 0.14, maxPoints: 92, minArea: 0.015, paddingPercent: 5.5 },
  "countries-america": { minDistance: 0.14, maxPoints: 92, minArea: 0.015, paddingPercent: 5.5 },
  "countries-asia": { minDistance: 0.14, maxPoints: 92, minArea: 0.015, paddingPercent: 5.5 },
  "countries-oceania": { minDistance: 0.13, maxPoints: 90, minArea: 0.012, paddingPercent: 5.5 }
};

const COUNTRY_FALLBACK_NAMES = {
  "north-macedonia": ["Macedonia", "North Macedonia"],
  czechia: ["Czech Republic"],
  "vatican-city": ["Vatican"],
  netherlands: ["Netherlands", "The Netherlands"],
  "bosnia-herzegovina": ["Bosnia and Herzegovina"],
  "united-kingdom": ["United Kingdom", "United Kingdom of Great Britain and Northern Ireland"],
  moldova: ["Moldova", "Moldova, Republic of"],
  serbia: ["Republic of Serbia"],
  turkey: ["Turkey", "Turkiye"],
  russia: ["Russia", "Russian Federation"],
  belarus: ["Belarus"]
};

const normalizeToken = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const splitNameTokens = (value) =>
  String(value ?? "")
    .split(/[\/,()\-]/g)
    .map((part) => normalizeToken(part))
    .filter(Boolean);

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const geometryToPolygons = (geometry) => {
  if (!geometry) return [];
  if (geometry.type === "Polygon") {
    return [geometry.coordinates];
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates;
  }
  return [];
};

const ringArea = (ring) => {
  let sum = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[index + 1];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
};

const polygonArea = (polygon) => {
  if (!polygon.length) return 0;
  return polygon.reduce((total, ring, index) => {
    const area = Math.abs(ringArea(ring));
    return total + (index === 0 ? area : -area);
  }, 0);
};

const computeBounds = (polygons) => {
  let minLon = Number.POSITIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [lon, lat] of ring) {
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }

  if (!Number.isFinite(minLon) || !Number.isFinite(maxLon) || !Number.isFinite(minLat) || !Number.isFinite(maxLat)) {
    return { minLon: -1, maxLon: 1, minLat: -1, maxLat: 1 };
  }

  return { minLon, maxLon, minLat, maxLat };
};

const centroidFromRing = (ring) => {
  let lonTotal = 0;
  let latTotal = 0;
  let count = 0;
  for (const [lon, lat] of ring) {
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    lonTotal += lon;
    latTotal += lat;
    count += 1;
  }
  if (!count) {
    return { lon: 0, lat: 0 };
  }
  return { lon: lonTotal / count, lat: latTotal / count };
};

const createProjector = (rawBounds, paddingPercent = 4) => {
  const lonSpan = Math.max(1e-6, rawBounds.maxLon - rawBounds.minLon);
  const latSpan = Math.max(1e-6, rawBounds.maxLat - rawBounds.minLat);
  const padLon = lonSpan * (paddingPercent / 100);
  const padLat = latSpan * (paddingPercent / 100);
  const minLon = rawBounds.minLon - padLon;
  const maxLon = rawBounds.maxLon + padLon;
  const minLat = rawBounds.minLat - padLat;
  const maxLat = rawBounds.maxLat + padLat;
  const safeLonSpan = maxLon - minLon;
  const safeLatSpan = maxLat - minLat;

  return ([lon, lat]) => {
    const x = ((lon - minLon) / safeLonSpan) * 100;
    const y = ((maxLat - lat) / safeLatSpan) * 100;
    return [Number(x.toFixed(3)), Number(y.toFixed(3))];
  };
};

const dedupeAndSimplifyRing = (ring, minDistance, maxPoints) => {
  if (!ring || ring.length < 4) return [];
  const deduped = [];
  for (const point of ring) {
    const previous = deduped[deduped.length - 1];
    if (!previous || previous[0] !== point[0] || previous[1] !== point[1]) {
      deduped.push(point);
    }
  }
  if (deduped.length < 4) return [];

  const simplified = [deduped[0]];
  for (let index = 1; index < deduped.length - 1; index += 1) {
    const point = deduped[index];
    const previous = simplified[simplified.length - 1];
    const dx = point[0] - previous[0];
    const dy = point[1] - previous[1];
    if (Math.hypot(dx, dy) >= minDistance) {
      simplified.push(point);
    }
  }
  simplified.push(deduped[deduped.length - 1]);

  let sampled = simplified;
  if (sampled.length > maxPoints) {
    const step = Math.ceil(sampled.length / maxPoints);
    sampled = sampled.filter((_, index) => (
      index === 0 ||
      index === sampled.length - 1 ||
      index % step === 0
    ));
  }

  const first = sampled[0];
  const last = sampled[sampled.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    sampled.push(first);
  }

  if (sampled.length < 4) {
    let fallback = [...deduped];
    if (fallback.length > maxPoints) {
      const step = Math.ceil(fallback.length / maxPoints);
      fallback = fallback.filter((_, index) => (
        index === 0 ||
        index === fallback.length - 1 ||
        index % step === 0
      ));
    }
    const fallbackFirst = fallback[0];
    const fallbackLast = fallback[fallback.length - 1];
    if (fallbackFirst && fallbackLast && (fallbackFirst[0] !== fallbackLast[0] || fallbackFirst[1] !== fallbackLast[1])) {
      fallback.push(fallbackFirst);
    }
    if (fallback.length < 4) return [];
    return fallback;
  }
  return sampled;
};

const ringToPath = (ring) => {
  const [first, ...rest] = ring;
  const firstToken = `${first[0]},${first[1]}`;
  const lineTokens = rest.map((point) => `${point[0]},${point[1]}`).join("L");
  return `M${firstToken}L${lineTokens}Z`;
};

const polygonWithinBounds = (polygon, bounds) => {
  if (!bounds) return true;
  const centroid = centroidFromRing(polygon[0] ?? []);
  return (
    centroid.lon >= bounds.minLon &&
    centroid.lon <= bounds.maxLon &&
    centroid.lat >= bounds.minLat &&
    centroid.lat <= bounds.maxLat
  );
};

const selectRelevantPolygons = (polygons, bounds) => {
  if (!bounds) return polygons;
  const within = polygons.filter((polygon) => polygonWithinBounds(polygon, bounds));
  if (within.length) return within;
  if (!polygons.length) return [];

  let winner = polygons[0];
  let maxArea = polygonArea(winner);
  for (let index = 1; index < polygons.length; index += 1) {
    const area = polygonArea(polygons[index]);
    if (area > maxArea) {
      maxArea = area;
      winner = polygons[index];
    }
  }
  return [winner];
};

const buildFeatureLookups = (features) => {
  const byCode = new Map();
  const byName = new Map();

  for (const feature of features) {
    const propertyValues = Object.values(feature.properties ?? {})
      .filter((value) => typeof value === "string")
      .map((value) => String(value).trim())
      .filter((value) => value.length >= 2 && value.length <= 90)
      .filter((value) => /[a-zA-Z]/.test(value));
    const candidateNames = new Set([feature.properties?.name, ...propertyValues]);

    for (const name of candidateNames) {
      const normalizedName = normalizeToken(name);
      if (normalizedName && !byName.has(normalizedName)) {
        byName.set(normalizedName, feature);
      }

      for (const token of splitNameTokens(name)) {
        if (token && !byName.has(token)) {
          byName.set(token, feature);
        }
      }
    }

    const code = String(feature.properties?.["ISO3166-1-Alpha-3"] ?? "").toUpperCase();
    if (code && code !== "-99" && !byCode.has(code)) {
      byCode.set(code, feature);
    }
  }

  return { byCode, byName };
};

const resolveCountryFeature = (target, lookups) => {
  const candidateTokens = new Set([
    normalizeToken(target.label?.es),
    normalizeToken(target.label?.en),
    ...((target.aliases ?? []).map((alias) => normalizeToken(alias))),
    ...((COUNTRY_FALLBACK_NAMES[target.id] ?? []).map((name) => normalizeToken(name)))
  ]);

  for (const token of candidateTokens) {
    if (!token) continue;
    const byName = lookups.byName.get(token);
    if (byName) return byName;
  }

  return null;
};

const detectContinentTarget = (feature) => {
  const polygons = geometryToPolygons(feature.geometry);
  if (!polygons.length) return null;
  const centroid = centroidFromRing(polygons[0][0] ?? []);
  const { lon, lat } = centroid;

  if (lat <= -60) return "antarctica";
  if (lon <= -25) return lat >= 15 ? "north-america" : "south-america";
  if (lon >= 110 && lat <= 25) return "oceania";
  if (lon >= -25 && lon <= 60 && lat >= 33) return "europe";
  if (lon >= -25 && lon <= 55 && lat < 33 && lat > -38) return "africa";
  return "asia";
};

const buildSilhouetteSet = ({
  targets,
  rawPolygonsByTargetId,
  simplification,
  regionBounds
}) => {
  const polygonsForBounds = [];
  for (const target of targets) {
    const polygons = rawPolygonsByTargetId[target.id] ?? [];
    const selected = selectRelevantPolygons(polygons, regionBounds);
    rawPolygonsByTargetId[target.id] = selected;
    polygonsForBounds.push(...selected);
  }

  const mapBounds = computeBounds(polygonsForBounds);
  const project = createProjector(mapBounds, simplification.paddingPercent);
  const output = {};

  for (const target of targets) {
    const polygons = rawPolygonsByTargetId[target.id] ?? [];
    const paths = [];
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let fallbackPath = null;
    let fallbackBounds = null;
    let fallbackArea = Number.NEGATIVE_INFINITY;

    for (const polygon of polygons) {
      const ringPaths = [];
      for (const ring of polygon) {
        const projectedRing = ring.map(project);
        const simplifiedRing = dedupeAndSimplifyRing(
          projectedRing,
          simplification.minDistance,
          simplification.maxPoints
        );
        if (simplifiedRing.length < 4) continue;
        ringPaths.push(simplifiedRing);
      }

      if (!ringPaths.length) continue;
      const area = Math.abs(ringArea(ringPaths[0]));
      const updateBounds = (ring) => {
        for (const [x, y] of ring) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      };

      const localBounds = (() => {
        let localMinX = Number.POSITIVE_INFINITY;
        let localMaxX = Number.NEGATIVE_INFINITY;
        let localMinY = Number.POSITIVE_INFINITY;
        let localMaxY = Number.NEGATIVE_INFINITY;
        for (const [x, y] of ringPaths[0]) {
          if (x < localMinX) localMinX = x;
          if (x > localMaxX) localMaxX = x;
          if (y < localMinY) localMinY = y;
          if (y > localMaxY) localMaxY = y;
        }
        return {
          minX: localMinX,
          maxX: localMaxX,
          minY: localMinY,
          maxY: localMaxY
        };
      })();

      const path = ringPaths.map(ringToPath).join("");
      if (area < simplification.minArea) {
        if (area > fallbackArea) {
          fallbackArea = area;
          fallbackPath = path;
          fallbackBounds = localBounds;
        }
        continue;
      }

      paths.push(path);
      updateBounds(ringPaths[0]);
    }

    if (!paths.length && fallbackPath && fallbackBounds) {
      paths.push(fallbackPath);
      minX = fallbackBounds.minX;
      maxX = fallbackBounds.maxX;
      minY = fallbackBounds.minY;
      maxY = fallbackBounds.maxY;
    }

    if (!paths.length) continue;
    output[target.id] = {
      center: [
        Number(((minX + maxX) / 2).toFixed(3)),
        Number(((minY + maxY) / 2).toFixed(3))
      ],
      paths
    };
  }

  return output;
};

const countriesGeo = readJson(COUNTRIES_PATH);
const spainProvincesGeo = readJson(SPAIN_PROVINCES_PATH);

const countryLookups = buildFeatureLookups(countriesGeo.features);
const toLookupFeatures = (features) =>
  (features ?? []).map((feature) => ({
    ...feature,
    properties: {
      ...feature.properties,
      "ISO3166-1-Alpha-3": feature.properties?.name
    }
  }));

const provinceLookupsByTheme = {
  spain: buildFeatureLookups(toLookupFeatures(spainProvincesGeo.features))
};

for (const countryEntry of MAP_COUNTRY_PROVINCE_CATALOG) {
  const sourcePath = path.join(ROOT, countryEntry.source);
  if (!fs.existsSync(sourcePath)) continue;
  const countryGeo = readJson(sourcePath);
  provinceLookupsByTheme[countryEntry.id] = buildFeatureLookups(
    toLookupFeatures(countryGeo.features)
  );
}

const worldTargets = resolveMapDefinition("world").targets.filter((target) => target.kind === "continent");
const worldRawPolygons = Object.fromEntries(worldTargets.map((target) => [target.id, []]));

for (const feature of countriesGeo.features) {
  const continentTarget = detectContinentTarget(feature);
  if (!continentTarget || !worldRawPolygons[continentTarget]) continue;
  const polygons = geometryToPolygons(feature.geometry);
  worldRawPolygons[continentTarget].push(...polygons);
}

const resolveProvinceFeature = (target, lookups) => {
  const candidates = [
    target.label?.es,
    target.label?.en,
    ...(target.aliases ?? [])
  ];

  let feature = null;
  for (const candidate of candidates) {
    const token = normalizeToken(candidate);
    if (token && lookups?.byName.has(token)) {
      feature = lookups.byName.get(token);
      break;
    }
  }

  if (!feature) {
    for (const candidate of candidates) {
      for (const token of splitNameTokens(candidate)) {
        if (lookups?.byName.has(token)) {
          feature = lookups.byName.get(token);
          break;
        }
      }
      if (feature) break;
    }
  }

  return feature;
};

const buildRawPolygonsByTarget = (targets, resolver) => {
  const rawPolygons = {};
  for (const target of targets) {
    const feature = resolver(target);
    rawPolygons[target.id] = feature ? geometryToPolygons(feature.geometry) : [];
  }
  return rawPolygons;
};

const output = {
  world: buildSilhouetteSet({
    targets: worldTargets,
    rawPolygonsByTargetId: worldRawPolygons,
    simplification: MAP_SIMPLIFICATION.world
  })
};

const unresolved = {};

for (const mapDefinition of CONTINENT_MAPS) {
  const rawPolygonsByTargetId = buildRawPolygonsByTarget(
    mapDefinition.targets,
    (target) => resolveCountryFeature(target, countryLookups)
  );
  output[mapDefinition.theme] = buildSilhouetteSet({
    targets: mapDefinition.targets,
    rawPolygonsByTargetId,
    simplification:
      MAP_SIMPLIFICATION[mapDefinition.theme] ??
      MAP_SIMPLIFICATION.europe,
    regionBounds: MAP_REGION_BOUNDS[mapDefinition.theme]
  });
  unresolved[mapDefinition.theme] = mapDefinition.targets
    .filter((target) => !output[mapDefinition.theme][target.id])
    .map((target) => target.id);
}

for (const mapDefinition of COUNTRY_MAPS) {
  const usesProvinces = mapDefinition.targets.some((target) => target.kind === "province");
  const provinceLookups = provinceLookupsByTheme[mapDefinition.theme];
  const rawPolygonsByTargetId = buildRawPolygonsByTarget(
    mapDefinition.targets,
    (target) => (
      usesProvinces
        ? resolveProvinceFeature(target, provinceLookups)
        : resolveCountryFeature(target, countryLookups)
    )
  );
  output[mapDefinition.theme] = buildSilhouetteSet({
    targets: mapDefinition.targets,
    rawPolygonsByTargetId,
    simplification: MAP_SIMPLIFICATION[mapDefinition.theme] ?? MAP_SIMPLIFICATION.europe,
    regionBounds: MAP_REGION_BOUNDS[mapDefinition.theme]
  });
  unresolved[mapDefinition.theme] = mapDefinition.targets
    .filter((target) => !output[mapDefinition.theme][target.id])
    .map((target) => target.id);
}

fs.rmSync(OUTPUT_THEME_DIR, { recursive: true, force: true });
fs.mkdirSync(OUTPUT_THEME_DIR, { recursive: true });

for (const [themeId, themeData] of Object.entries(output)) {
  const themeFilePath = path.join(OUTPUT_THEME_DIR, `${themeId}.js`);
  const themeContent = [
    "const MAP_SILHOUETTE_THEME = ",
    JSON.stringify(themeData, null, 2),
    ";\n\nexport default MAP_SILHOUETTE_THEME;\n"
  ].join("");
  fs.writeFileSync(themeFilePath, themeContent, "utf8");
}

const themeIds = Object.keys(output);
const loaderEntries = themeIds
  .map((themeId) => `  "${themeId}": () => import("./mapsSilhouettesThemes/${themeId}.js")`)
  .join(",\n");

const loaderContent = [
  'import { useEffect, useMemo, useState } from "react";\n\n',
  "export const MAP_SILHOUETTE_THEME_IDS = ",
  JSON.stringify(themeIds, null, 2),
  ";\n\n",
  "export const MAP_SILHOUETTE_THEME_LOADERS = {\n",
  loaderEntries,
  "\n};\n\n",
  "const THEME_CACHE = new Map();\n",
  "const THEME_PROMISES = new Map();\n\n",
  "const normalizeThemeIds = (themeIds) => {\n",
  "  if (!Array.isArray(themeIds)) return [];\n",
  "  return [...new Set(themeIds.filter((themeId) => typeof themeId === \"string\" && themeId.length > 0))];\n",
  "};\n\n",
  "export const getMapSilhouetteThemeSync = (themeId) => THEME_CACHE.get(themeId) ?? {};\n\n",
  "export const getMapSilhouettesByThemeSync = (themeIds) => {\n",
  "  const normalizedThemeIds = normalizeThemeIds(themeIds);\n",
  "  return Object.fromEntries(\n",
  "    normalizedThemeIds.map((themeId) => [themeId, getMapSilhouetteThemeSync(themeId)])\n",
  "  );\n",
  "};\n\n",
  "export const loadMapSilhouetteTheme = async (themeId) => {\n",
  "  if (!themeId || !MAP_SILHOUETTE_THEME_LOADERS[themeId]) return {};\n",
  "  if (THEME_CACHE.has(themeId)) return THEME_CACHE.get(themeId) ?? {};\n",
  "  if (!THEME_PROMISES.has(themeId)) {\n",
  "    THEME_PROMISES.set(\n",
  "      themeId,\n",
  "      MAP_SILHOUETTE_THEME_LOADERS[themeId]().then((module) => {\n",
  "        const themeData = module.default ?? module.MAP_SILHOUETTE_THEME ?? {};\n",
  "        THEME_CACHE.set(themeId, themeData);\n",
  "        return themeData;\n",
  "      })\n",
  "    );\n",
  "  }\n",
  "  return THEME_PROMISES.get(themeId) ?? {};\n",
  "};\n\n",
  "export const loadMapSilhouetteThemes = async (themeIds) => {\n",
  "  const normalizedThemeIds = normalizeThemeIds(themeIds);\n",
  "  await Promise.all(normalizedThemeIds.map((themeId) => loadMapSilhouetteTheme(themeId)));\n",
  "  return getMapSilhouettesByThemeSync(normalizedThemeIds);\n",
  "};\n\n",
  "export const useMapSilhouetteThemes = (themeIds) => {\n",
  "  const themeKey = Array.isArray(themeIds)\n",
  "    ? themeIds.filter((themeId) => typeof themeId === \"string\" && themeId.length > 0).join(\"|\")\n",
  "    : \"\";\n",
  "  const normalizedThemeIds = useMemo(() => normalizeThemeIds(themeIds), [themeKey]);\n",
  "  const [loadedVersion, setLoadedVersion] = useState(0);\n\n",
  "  useEffect(() => {\n",
  "    let cancelled = false;\n",
  "    const missingThemeIds = normalizedThemeIds.filter((themeId) => !THEME_CACHE.has(themeId));\n",
  "    if (!missingThemeIds.length) return undefined;\n",
  "    Promise.all(missingThemeIds.map((themeId) => loadMapSilhouetteTheme(themeId)))\n",
  "      .then(() => {\n",
  "        if (!cancelled) {\n",
  "          setLoadedVersion((value) => value + 1);\n",
  "        }\n",
  "      })\n",
  "      .catch(() => {\n",
  "        if (!cancelled) {\n",
  "          setLoadedVersion((value) => value + 1);\n",
  "        }\n",
  "      });\n",
  "    return () => {\n",
  "      cancelled = true;\n",
  "    };\n",
  "  }, [normalizedThemeIds]);\n\n",
  "  const silhouettesByTheme = useMemo(\n",
  "    () => getMapSilhouettesByThemeSync(normalizedThemeIds),\n",
  "    [normalizedThemeIds, loadedVersion]\n",
  "  );\n\n",
  "  return {\n",
  "    silhouettesByTheme,\n",
  "    isLoading: normalizedThemeIds.some((themeId) => !THEME_CACHE.has(themeId))\n",
  "  };\n",
  "};\n"
].join("");

fs.writeFileSync(OUTPUT_PATH, loaderContent, "utf8");

console.log(`Silhouette loader generated: ${path.relative(ROOT, OUTPUT_PATH)}`);
console.log(`Silhouette theme chunks generated: ${path.relative(ROOT, OUTPUT_THEME_DIR)}`);
console.log("Unresolved targets:", JSON.stringify(unresolved, null, 2));
