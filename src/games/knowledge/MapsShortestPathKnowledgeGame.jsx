import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../utils/useGameRuntimeBridge";
import useMobileGameViewport from "../../mobile/useMobileGameViewport";
import {
  KNOWLEDGE_ARCADE_MATCH_COUNT,
  createSeededRandom,
  getRandomKnowledgeMatchId,
  getRandomKnowledgeMatchIdExcept,
  resolveKnowledgeArcadeLocale
} from "./knowledgeArcadeUtils";
import { CONTINENT_MAPS } from "./mapsKnowledgeData";
import { MAP_COUNTRY_PROVINCE_CATALOG } from "./mapsCountryProvincesData.js";
import { MAP_COUNTRY_GROUPS } from "./mapsCountryGroupsData";
import { MAP_COUNTRY_ADJACENCY } from "./mapsCountryAdjacencyData";
import { MAP_PROVINCE_ADJACENCY } from "./mapsProvinceAdjacencyData.js";
import { MAP_SILHOUETTES_BY_THEME } from "./mapsSilhouettesData";

const COPY = {
  es: {
    title: "Adivina el camino mas corto",
    subtitle: "Modo paises o provincias: conecta origen y destino por el camino mas corto.",
    mode: "Modo",
    modeCountries: "Paises por continente",
    modeProvinces: "Provincias por pais",
    continent: "Continente",
    country: "Pais",
    map: "Mapa",
    restart: "Reiniciar ruta",
    nextRoute: "Nueva ruta",
    origin: "Origen",
    destination: "Destino",
    optimal: "Minimo",
    taken: "Pasos",
    attempts: "Intentos",
    remain: "Minimo restante",
    status: "Estado",
    statusPlaying: "En curso",
    statusDone: "Completado",
    guessLabel: "Siguiente territorio",
    guessPlaceholder: "Ej: Kenia, Baviera, Berlin, Japon...",
    submit: "Validar",
    clear: "Limpiar",
    help:
      "Introduce un territorio vecino del actual y pulsa Enter. Atajos globales: R reinicia la ruta y N crea una nueva ruta en el mapa activo.",
    legendIdeal: "Camino ideal",
    legendAlt: "Ruta alternativa",
    routeTitle: "Ruta construida",
    routeHint: "Cada acierto revela la silueta del pais en el mapa.",
    neighborsTitle: "Vecinos del territorio actual",
    neighborsHint: (name) => `Desde ${name} puedes pasar a:`,
    noNeighbors: "Sin vecinos disponibles",
    caption: (origin, destination, optimal) => `${origin} -> ${destination} (${optimal} pasos minimos)`,
    empty: "Escribe un pais antes de validar.",
    unknown: "Ese nombre no pertenece al mapa activo.",
    duplicate: (name) => `${name} ya esta en tu ruta.`,
    notNeighbor: (name, current) => `${name} no comparte frontera directa con ${current}.`,
    unreachable: (name) => `${name} no permite llegar al destino.`,
    idealStep: (name, remain) => `Paso ideal: ${name}. Te quedan ${remain} pasos minimos.`,
    altStep: (name, remain) => `Ruta alternativa: ${name}. Aun quedan ${remain} pasos minimos.`,
    done: (taken, optimal, usedAlt) =>
      usedAlt
        ? `Destino alcanzado en ${taken} pasos. El minimo era ${optimal}.`
        : `Ruta ideal completada en ${taken} pasos (minimo ${optimal}).`,
    alreadyDone: "Ruta completada. Pulsa N para nueva ruta o R para reiniciar."
  },
  en: {
    title: "Guess the shortest path",
    subtitle: "Countries or provinces mode: connect origin and destination by shortest path.",
    mode: "Mode",
    modeCountries: "Countries by continent",
    modeProvinces: "Provinces by country",
    continent: "Continent",
    country: "Country",
    map: "Map",
    restart: "Restart route",
    nextRoute: "New route",
    origin: "Origin",
    destination: "Destination",
    optimal: "Minimum",
    taken: "Steps",
    attempts: "Attempts",
    remain: "Best remaining",
    status: "Status",
    statusPlaying: "In progress",
    statusDone: "Completed",
    guessLabel: "Next territory",
    guessPlaceholder: "Ex: Kenya, Bavaria, Berlin, Japan...",
    submit: "Check",
    clear: "Clear",
    help:
      "Type a neighboring territory from the current one and press Enter. Global shortcuts: R restarts route, N creates a new route in the active map.",
    legendIdeal: "Ideal path",
    legendAlt: "Alternative route",
    routeTitle: "Built route",
    routeHint: "Each valid step reveals that country silhouette on the map.",
    neighborsTitle: "Neighbors of current territory",
    neighborsHint: (name) => `From ${name} you can move to:`,
    noNeighbors: "No neighbors available",
    caption: (origin, destination, optimal) => `${origin} -> ${destination} (${optimal} minimum steps)`,
    empty: "Type a country before checking.",
    unknown: "That name is not in the active map.",
    duplicate: (name) => `${name} is already in your route.`,
    notNeighbor: (name, current) => `${name} does not share a direct border with ${current}.`,
    unreachable: (name) => `${name} cannot reach destination.`,
    idealStep: (name, remain) => `Ideal step: ${name}. ${remain} minimum steps remain.`,
    altStep: (name, remain) => `Alternative route: ${name}. ${remain} minimum steps remain.`,
    done: (taken, optimal, usedAlt) =>
      usedAlt
        ? `Destination reached in ${taken} steps. Minimum was ${optimal}.`
        : `Ideal route completed in ${taken} steps (minimum ${optimal}).`,
    alreadyDone: "Route completed. Press N for a new route or R to restart."
  }
};

const REGION_IDS = ["europe", "africa", "america", "asia", "oceania"];
const SCOPE_OPTIONS = [
  { id: "countries", copyKey: "modeCountries" },
  { id: "provinces", copyKey: "modeProvinces" }
];

const normalizeToken = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const resolveText = (entry, locale) => entry?.[locale] ?? entry?.en ?? entry?.es ?? "";

const hashValue = (value) => {
  let hash = 2166136261;
  const text = String(value ?? "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const euclidean = (centers, leftId, rightId) => {
  const left = centers.get(leftId) ?? [50, 50];
  const right = centers.get(rightId) ?? [50, 50];
  return Math.hypot(left[0] - right[0], left[1] - right[1]);
};

const bfsPath = (graph, startId, destinationId) => {
  if (!startId || !destinationId) return [];
  if (startId === destinationId) return [startId];
  const parent = new Map([[startId, null]]);
  const queue = [startId];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    for (const next of graph[current] ?? []) {
      if (parent.has(next)) continue;
      parent.set(next, current);
      if (next === destinationId) {
        const path = [];
        let cursor = destinationId;
        while (cursor !== null) {
          path.push(cursor);
          cursor = parent.get(cursor) ?? null;
        }
        return path.reverse();
      }
      queue.push(next);
    }
  }
  return [];
};

const bfsDistances = (graph, startId) => {
  const distances = new Map([[startId, 0]]);
  const queue = [startId];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    const dist = distances.get(current) ?? 0;
    for (const next of graph[current] ?? []) {
      if (distances.has(next)) continue;
      distances.set(next, dist + 1);
      queue.push(next);
    }
  }
  return distances;
};

const buildGraph = (countryIds, baseAdjacency, centers) => {
  const graphSets = Object.fromEntries(countryIds.map((id) => [id, new Set()]));
  const addEdge = (leftId, rightId) => {
    if (!graphSets[leftId] || !graphSets[rightId] || leftId === rightId) return;
    graphSets[leftId].add(rightId);
    graphSets[rightId].add(leftId);
  };

  for (const id of countryIds) {
    for (const neighbor of baseAdjacency[id] ?? []) {
      if (graphSets[neighbor]) addEdge(id, neighbor);
    }
  }

  for (const id of countryIds) {
    if ((graphSets[id]?.size ?? 0) > 0) continue;
    const nearest = [...countryIds]
      .filter((candidate) => candidate !== id)
      .sort((left, right) => {
        const diff = euclidean(centers, id, left) - euclidean(centers, id, right);
        if (diff !== 0) return diff;
        return left.localeCompare(right);
      })
      .slice(0, 2);
    for (const neighbor of nearest) addEdge(id, neighbor);
  }

  const getComponents = () => {
    const visited = new Set();
    const components = [];
    for (const id of countryIds) {
      if (visited.has(id)) continue;
      const component = [];
      const stack = [id];
      visited.add(id);
      while (stack.length) {
        const current = stack.pop();
        component.push(current);
        for (const next of graphSets[current] ?? []) {
          if (visited.has(next)) continue;
          visited.add(next);
          stack.push(next);
        }
      }
      components.push(component);
    }
    return components;
  };

  let components = getComponents();
  let guard = 0;
  while (components.length > 1 && guard < countryIds.length * countryIds.length) {
    guard += 1;
    let bestLeft = null;
    let bestRight = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let leftIndex = 0; leftIndex < components.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < components.length; rightIndex += 1) {
        for (const leftId of components[leftIndex]) {
          for (const rightId of components[rightIndex]) {
            const distance = euclidean(centers, leftId, rightId);
            if (distance < bestDistance) {
              bestDistance = distance;
              bestLeft = leftId;
              bestRight = rightId;
            }
          }
        }
      }
    }
    if (!bestLeft || !bestRight) break;
    addEdge(bestLeft, bestRight);
    components = getComponents();
  }

  return Object.fromEntries(countryIds.map((id) => [id, [...graphSets[id]].sort()]));
};

const buildChallengePool = (graph, countryIds) => {
  const strict = [];
  const relaxed = [];
  const size = countryIds.length;
  const minDistance = size >= 50 ? 4 : size >= 30 ? 3 : 2;
  const maxDistance = size >= 50 ? 12 : size >= 30 ? 10 : 7;
  for (const startId of countryIds) {
    const dist = bfsDistances(graph, startId);
    for (const destinationId of countryIds) {
      if (destinationId === startId) continue;
      const distance = dist.get(destinationId);
      if (!Number.isInteger(distance) || distance <= 0) continue;
      const pair = { startId, destinationId, distance };
      relaxed.push(pair);
      if (distance >= minDistance && distance <= maxDistance) strict.push(pair);
    }
  }
  if (strict.length) return strict;
  if (relaxed.length) return relaxed;
  if (countryIds.length > 1) {
    return [{ startId: countryIds[0], destinationId: countryIds[1], distance: 1 }];
  }
  return [];
};

const CONTINENT_BY_ID = new Map(CONTINENT_MAPS.map((entry) => [entry.id, entry]));

const createRegion = (regionId) => {
  const rawCountries = MAP_COUNTRY_GROUPS[regionId] ?? [];
  if (!rawCountries.length) return null;
  const continentData = CONTINENT_BY_ID.get(regionId);
  const theme = continentData?.theme ?? (regionId === "europe" ? "europe" : `countries-${regionId}`);
  const silhouettes = MAP_SILHOUETTES_BY_THEME[theme] ?? {};
  const targetById = new Map((continentData?.targets ?? []).map((target) => [target.id, target]));

  const countries = rawCountries.map((country) => ({
    id: country.id,
    label: {
      es: country.labelEs,
      en: country.labelEn ?? country.labelEs
    },
    aliases: [...(country.aliases ?? [])]
  }));

  const countryById = new Map(countries.map((country) => [country.id, country]));
  const aliasToId = new Map();
  for (const country of countries) {
    const variants = new Set([
      country.id,
      country.id.replace(/-/g, " "),
      country.label.es,
      country.label.en,
      ...(country.aliases ?? [])
    ]);
    for (const variant of variants) {
      const normalized = normalizeToken(variant);
      if (normalized && !aliasToId.has(normalized)) aliasToId.set(normalized, country.id);
    }
  }

  const centers = new Map(
    countries.map((country, index) => {
      const silhouetteCenter = silhouettes[country.id]?.center;
      const mapTarget = targetById.get(country.id);
      const fallbackHash = hashValue(`${country.id}:${index}`);
      const fallback = [
        8 + ((fallbackHash % 8400) / 100),
        10 + ((Math.floor(fallbackHash / 113) % 7600) / 100)
      ];
      const center = Array.isArray(silhouetteCenter)
        && Number.isFinite(silhouetteCenter[0])
        && Number.isFinite(silhouetteCenter[1])
        ? [silhouetteCenter[0], silhouetteCenter[1]]
        : Number.isFinite(mapTarget?.x) && Number.isFinite(mapTarget?.y)
          ? [mapTarget.x, mapTarget.y]
          : fallback;
      return [country.id, center];
    })
  );

  const ids = countries.map((country) => country.id);
  const graph = buildGraph(ids, MAP_COUNTRY_ADJACENCY[regionId] ?? {}, centers);
  return {
    id: regionId,
    name: continentData?.name ?? { es: regionId, en: regionId },
    theme,
    countries,
    countryById,
    aliasToId,
    centers,
    silhouettes,
    graph,
    pool: buildChallengePool(graph, ids)
  };
};

const REGIONS = REGION_IDS.map((id) => createRegion(id)).filter(Boolean);
const REGION_BY_ID = new Map(REGIONS.map((region) => [region.id, region]));
const DEFAULT_REGION_ID = REGIONS[0]?.id ?? "europe";

const COUNTRY_VISUAL_REGION_BY_ID = (() => {
  const byId = new Map();
  for (const [groupId, entries] of Object.entries(MAP_COUNTRY_GROUPS ?? {})) {
    const visualRegion = groupId === "america" ? "america" : groupId;
    for (const entry of entries ?? []) {
      byId.set(entry.id, visualRegion);
    }
  }
  return byId;
})();

const PROVINCE_COUNTRIES = (MAP_COUNTRY_PROVINCE_CATALOG ?? [])
  .filter((entry) => (entry.targets?.length ?? 0) >= 2)
  .map((entry) => ({
    id: entry.id,
    name: entry.name,
    targets: entry.targets ?? []
  }));
const PROVINCE_COUNTRY_BY_ID = new Map(PROVINCE_COUNTRIES.map((entry) => [entry.id, entry]));
const DEFAULT_PROVINCE_COUNTRY_ID = PROVINCE_COUNTRIES[0]?.id ?? "";
const PROVINCE_SCOPE_CACHE = new Map();

const createProvinceScope = (countryId) => {
  const countryEntry = PROVINCE_COUNTRY_BY_ID.get(countryId);
  if (!countryEntry) return null;
  const theme = countryEntry.id;
  const silhouettes = MAP_SILHOUETTES_BY_THEME[theme] ?? {};

  const nodes = countryEntry.targets.map((target) => ({
    id: target.id,
    label: {
      es: target.labelEs,
      en: target.labelEn ?? target.labelEs
    },
    aliases: [...(target.aliases ?? [])]
  }));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const aliasToId = new Map();
  for (const node of nodes) {
    const variants = new Set([
      node.id,
      node.id.replace(/-/g, " "),
      node.label.es,
      node.label.en,
      ...(node.aliases ?? [])
    ]);
    for (const variant of variants) {
      const normalized = normalizeToken(variant);
      if (normalized && !aliasToId.has(normalized)) aliasToId.set(normalized, node.id);
    }
  }

  const centers = new Map(
    nodes.map((node, index) => {
      const silhouetteCenter = silhouettes[node.id]?.center;
      const fallbackHash = hashValue(`${countryId}:${node.id}:${index}`);
      const fallback = [
        8 + ((fallbackHash % 8400) / 100),
        10 + ((Math.floor(fallbackHash / 113) % 7600) / 100)
      ];
      const center = Array.isArray(silhouetteCenter)
        && Number.isFinite(silhouetteCenter[0])
        && Number.isFinite(silhouetteCenter[1])
        ? [silhouetteCenter[0], silhouetteCenter[1]]
        : fallback;
      return [node.id, center];
    })
  );

  const ids = nodes.map((node) => node.id);
  const graph = buildGraph(ids, MAP_PROVINCE_ADJACENCY[countryId] ?? {}, centers);

  return {
    id: countryId,
    name: countryEntry.name ?? { es: countryId, en: countryId },
    theme,
    countries: nodes,
    countryById: nodeById,
    aliasToId,
    centers,
    silhouettes,
    graph,
    pool: buildChallengePool(graph, ids),
    visualRegion: COUNTRY_VISUAL_REGION_BY_ID.get(countryId) ?? "global"
  };
};

const getProvinceScope = (countryId) => {
  const safeId = PROVINCE_COUNTRY_BY_ID.has(countryId) ? countryId : DEFAULT_PROVINCE_COUNTRY_ID;
  if (!safeId) return null;
  if (!PROVINCE_SCOPE_CACHE.has(safeId)) {
    const scope = createProvinceScope(safeId);
    if (scope) PROVINCE_SCOPE_CACHE.set(safeId, scope);
  }
  return PROVINCE_SCOPE_CACHE.get(safeId) ?? null;
};

const resolveScopeContext = (scopeMode, regionId, provinceCountryId) =>
  scopeMode === "provinces"
    ? getProvinceScope(provinceCountryId)
    : (REGION_BY_ID.get(regionId) ?? REGIONS[0] ?? null);

const countryName = (region, countryId, locale) =>
  resolveText(region?.countryById.get(countryId)?.label, locale) || countryId;

const pickChallenge = (region, matchId) => {
  const ids = region?.countries?.map((country) => country.id) ?? [];
  if (!region || !ids.length) {
    return { startId: "", destinationId: "", idealPath: [], optimalSteps: 0 };
  }
  const pool = region.pool ?? [];
  const fallbackStart = ids[0] ?? "";
  const fallbackDestination = ids[1] ?? fallbackStart;
  if (!pool.length) {
    const path = bfsPath(region.graph, fallbackStart, fallbackDestination);
    return {
      startId: fallbackStart,
      destinationId: fallbackDestination,
      idealPath: path.length ? path : [fallbackStart],
      optimalSteps: Math.max(0, path.length - 1)
    };
  }
  const random = createSeededRandom((matchId + 1) ^ hashValue(region.id));
  const candidate = pool[Math.floor(random() * pool.length)] ?? pool[0];
  const idealPath = bfsPath(region.graph, candidate.startId, candidate.destinationId);
  if (idealPath.length >= 2) {
    return {
      startId: candidate.startId,
      destinationId: candidate.destinationId,
      idealPath,
      optimalSteps: idealPath.length - 1
    };
  }
  for (const fallback of pool) {
    const path = bfsPath(region.graph, fallback.startId, fallback.destinationId);
    if (path.length >= 2) {
      return {
        startId: fallback.startId,
        destinationId: fallback.destinationId,
        idealPath: path,
        optimalSteps: path.length - 1
      };
    }
  }
  return {
    startId: fallbackStart,
    destinationId: fallbackDestination,
    idealPath: [fallbackStart],
    optimalSteps: 0
  };
};

const metricsFromRoute = (route, challenge, graph) => {
  const currentId = route[route.length - 1]?.countryId ?? challenge.startId;
  const remainPath = bfsPath(graph, currentId, challenge.destinationId);
  const takenSteps = Math.max(0, route.length - 1);
  const idealSteps = route.filter((step) => step.status === "ideal").length;
  const alternativeSteps = route.filter((step) => step.status === "alternative").length;
  return {
    takenSteps,
    idealSteps,
    alternativeSteps,
    remainingBest: Math.max(0, remainPath.length - 1)
  };
};

function MapsShortestPathKnowledgeGame() {
  const locale = useMemo(resolveKnowledgeArcadeLocale, []);
  const copy = useMemo(() => COPY[locale] ?? COPY.en, [locale]);
  const viewport = useMobileGameViewport();
  const inputRef = useRef(null);

  const createState = useCallback(({
    scopeMode = "countries",
    regionId = DEFAULT_REGION_ID,
    provinceCountryId = DEFAULT_PROVINCE_COUNTRY_ID,
    matchId = getRandomKnowledgeMatchId()
  } = {}) => {
    const context = resolveScopeContext(scopeMode, regionId, provinceCountryId);
    if (!context) {
      return {
        matchId,
        scopeMode,
        regionId,
        provinceCountryId,
        challenge: { startId: "", destinationId: "", idealPath: [], optimalSteps: 0 },
        route: [],
        attempts: 0,
        draft: "",
        status: "playing",
        message: copy.help
      };
    }
    const challenge = pickChallenge(context, matchId);
    const origin = countryName(context, challenge.startId, locale);
    const destination = countryName(context, challenge.destinationId, locale);
    return {
      matchId,
      scopeMode,
      regionId: scopeMode === "countries" ? context.id : regionId,
      provinceCountryId: scopeMode === "provinces" ? context.id : provinceCountryId,
      challenge,
      route: [{ countryId: challenge.startId, status: "origin" }],
      attempts: 0,
      draft: "",
      status: "playing",
      message: copy.caption(origin, destination, challenge.optimalSteps)
    };
  }, [copy, locale]);

  const [state, setState] = useState(() =>
    createState({
      scopeMode: "countries",
      regionId: DEFAULT_REGION_ID,
      provinceCountryId: DEFAULT_PROVINCE_COUNTRY_ID
    })
  );

  const fallbackRegion = useMemo(() => ({
    id: "global",
    name: { es: "Global", en: "Global" },
    theme: "world",
    countries: [],
    countryById: new Map(),
    aliasToId: new Map(),
    centers: new Map(),
    silhouettes: {},
    graph: {},
    pool: [],
    visualRegion: "global"
  }), []);
  const region = resolveScopeContext(state.scopeMode, state.regionId, state.provinceCountryId)
    ?? fallbackRegion;
  const hasPlayableData = region.countries.length > 0;

  const routeStatusByCountry = useMemo(
    () => new Map(state.route.map((step) => [step.countryId, step.status])),
    [state.route]
  );
  const routeIndexByCountry = useMemo(
    () => new Map(state.route.map((step, index) => [step.countryId, index])),
    [state.route]
  );
  const revealed = useMemo(
    () => new Set(state.route.map((step) => step.countryId)),
    [state.route]
  );
  const metrics = useMemo(
    () => metricsFromRoute(state.route, state.challenge, region.graph),
    [region.graph, state.challenge, state.route]
  );

  const originName = countryName(region, state.challenge.startId, locale);
  const destinationName = countryName(region, state.challenge.destinationId, locale);
  const currentCountryId = state.route[state.route.length - 1]?.countryId ?? state.challenge.startId;
  const currentCountryName = countryName(region, currentCountryId, locale);
  const visualRegion = state.scopeMode === "countries"
    ? region.id
    : (region.visualRegion ?? "global");
  const nodeKindClass = state.scopeMode === "provinces" ? "province" : "country";
  const mapLabel = resolveText(region.name, locale);

  const boardClassName = [
    "maps-board",
    `maps-theme-${region.theme}`,
    `maps-scope-${state.scopeMode === "provinces" ? "province" : "country"}`,
    `maps-region-${visualRegion}`
  ].join(" ");

  const scopeOptions = useMemo(
    () => SCOPE_OPTIONS.map((option) => ({ id: option.id, label: copy[option.copyKey] })),
    [copy]
  );
  const regionOptions = useMemo(
    () =>
      REGIONS.map((entry) => ({
        id: entry.id,
        label: resolveText(entry.name, locale)
      })),
    [locale]
  );
  const provinceCountryOptions = useMemo(
    () =>
      PROVINCE_COUNTRIES.map((entry) => ({
        id: entry.id,
        label: resolveText(entry.name, locale)
      })),
    [locale]
  );

  const currentNeighbors = useMemo(() => {
    const ids = region.graph[currentCountryId] ?? [];
    return [...ids]
      .map((id) => ({ id, name: countryName(region, id, locale) }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [currentCountryId, locale, region]);

  const restartRoute = useCallback(() => {
    setState((previous) =>
      createState({
        scopeMode: previous.scopeMode,
        regionId: previous.regionId,
        provinceCountryId: previous.provinceCountryId,
        matchId: previous.matchId
      })
    );
  }, [createState]);

  const loadNewRoute = useCallback(() => {
    setState((previous) =>
      createState({
        scopeMode: previous.scopeMode,
        regionId: previous.regionId,
        provinceCountryId: previous.provinceCountryId,
        matchId: getRandomKnowledgeMatchIdExcept(previous.matchId)
      })
    );
  }, [createState]);

  const onScopeChange = useCallback((event) => {
    const nextScopeMode = event.target.value;
    setState((previous) =>
      createState({
        scopeMode: nextScopeMode,
        regionId: previous.regionId,
        provinceCountryId: previous.provinceCountryId,
        matchId: getRandomKnowledgeMatchIdExcept(previous.matchId)
      })
    );
  }, [createState]);

  const onContinentChange = useCallback((event) => {
    const nextRegionId = event.target.value;
    setState((previous) =>
      createState({
        scopeMode: "countries",
        regionId: nextRegionId,
        provinceCountryId: previous.provinceCountryId,
        matchId: getRandomKnowledgeMatchIdExcept(previous.matchId)
      })
    );
  }, [createState]);

  const onProvinceCountryChange = useCallback((event) => {
    const nextCountryId = event.target.value;
    setState((previous) =>
      createState({
        scopeMode: "provinces",
        regionId: previous.regionId,
        provinceCountryId: nextCountryId,
        matchId: getRandomKnowledgeMatchIdExcept(previous.matchId)
      })
    );
  }, [createState]);

  const onDraftChange = useCallback((event) => {
    const value = event.target.value.slice(0, 48);
    setState((previous) => ({ ...previous, draft: value }));
  }, []);

  const clearDraft = useCallback(() => {
    setState((previous) => ({ ...previous, draft: "" }));
  }, []);

  const submitGuess = useCallback(() => {
    setState((previous) => {
      const currentRegion = resolveScopeContext(
        previous.scopeMode,
        previous.regionId,
        previous.provinceCountryId
      );
      if (!currentRegion) {
        return previous;
      }
      if (previous.status === "completed") {
        return { ...previous, message: copy.alreadyDone };
      }

      const normalized = normalizeToken(previous.draft);
      if (!normalized) {
        return { ...previous, message: copy.empty };
      }

      const guessedId = currentRegion.aliasToId.get(normalized);
      const nextAttempts = previous.attempts + 1;
      if (!guessedId) {
        return { ...previous, attempts: nextAttempts, draft: "", message: copy.unknown };
      }

      const guessedName = countryName(currentRegion, guessedId, locale);
      const currentId = previous.route[previous.route.length - 1]?.countryId ?? previous.challenge.startId;
      const currentName = countryName(currentRegion, currentId, locale);

      if (previous.route.some((step) => step.countryId === guessedId)) {
        return { ...previous, attempts: nextAttempts, draft: "", message: copy.duplicate(guessedName) };
      }

      const neighbors = currentRegion.graph[currentId] ?? [];
      if (!neighbors.includes(guessedId)) {
        return {
          ...previous,
          attempts: nextAttempts,
          draft: "",
          message: copy.notNeighbor(guessedName, currentName)
        };
      }

      const pathToDestination = bfsPath(currentRegion.graph, guessedId, previous.challenge.destinationId);
      if (!pathToDestination.length) {
        return { ...previous, attempts: nextAttempts, draft: "", message: copy.unreachable(guessedName) };
      }

      const nextIdealId = previous.challenge.idealPath[previous.route.length];
      const stepStatus = guessedId === nextIdealId ? "ideal" : "alternative";
      const nextRoute = [...previous.route, { countryId: guessedId, status: stepStatus }];
      const remainingBest = Math.max(0, pathToDestination.length - 1);
      const completed = guessedId === previous.challenge.destinationId;
      const usedAlternative = nextRoute.some((step) => step.status === "alternative");

      return {
        ...previous,
        attempts: nextAttempts,
        draft: "",
        route: nextRoute,
        status: completed ? "completed" : "playing",
        message: completed
          ? copy.done(nextRoute.length - 1, previous.challenge.optimalSteps, usedAlternative)
          : stepStatus === "ideal"
            ? copy.idealStep(guessedName, remainingBest)
            : copy.altStep(guessedName, remainingBest)
      };
    });
  }, [copy, locale]);

  useEffect(() => {
    if (viewport.isMobile) return;
    if (!inputRef.current) return;
    inputRef.current.focus();
    inputRef.current.select();
  }, [
    state.scopeMode,
    state.regionId,
    state.provinceCountryId,
    state.challenge.startId,
    state.challenge.destinationId,
    state.route.length,
    state.status,
    viewport.isMobile
  ]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target?.tagName?.toLowerCase();
      const inInput = tag === "input" || tag === "textarea" || event.target?.isContentEditable;
      if (inInput) return;
      const key = event.key.toLowerCase();
      if (key === "r") {
        event.preventDefault();
        restartRoute();
        return;
      }
      if (key === "n") {
        event.preventDefault();
        loadNewRoute();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loadNewRoute, restartRoute]);

  const payloadBuilder = useCallback((snapshot) => {
    const currentRegion = resolveScopeContext(
      snapshot.scopeMode,
      snapshot.regionId,
      snapshot.provinceCountryId
    );
    if (!currentRegion) {
      return {
        mode: "knowledge-arcade",
        variant: "mapas-camino-corto",
        coordinates: "map_percent_origin_top_left",
        locale,
        unavailable: true
      };
    }
    const route = snapshot.route.map((step, index) => ({
      index,
      countryId: step.countryId,
      country: countryName(currentRegion, step.countryId, locale),
      status: step.status
    }));
    const statusById = new Map(route.map((step) => [step.countryId, step.status]));
    const progress = metricsFromRoute(snapshot.route, snapshot.challenge, currentRegion.graph);
    return {
      mode: "knowledge-arcade",
      variant: "mapas-camino-corto",
      coordinates: "map_percent_origin_top_left",
      locale,
      match: {
        current: snapshot.matchId + 1,
        total: KNOWLEDGE_ARCADE_MATCH_COUNT
      },
      scopeMode: snapshot.scopeMode,
      continent: {
        id: currentRegion.id,
        name: resolveText(currentRegion.name, locale),
        theme: currentRegion.theme
      },
      challenge: {
        startId: snapshot.challenge.startId,
        startName: countryName(currentRegion, snapshot.challenge.startId, locale),
        destinationId: snapshot.challenge.destinationId,
        destinationName: countryName(currentRegion, snapshot.challenge.destinationId, locale),
        optimalSteps: snapshot.challenge.optimalSteps,
        idealPath: [...snapshot.challenge.idealPath]
      },
      progress: {
        status: snapshot.status,
        attempts: snapshot.attempts,
        takenSteps: progress.takenSteps,
        idealSteps: progress.idealSteps,
        alternativeSteps: progress.alternativeSteps,
        remainingBest: progress.remainingBest
      },
      input: {
        draft: snapshot.draft,
        message: snapshot.message
      },
      route,
      visibleCountries: currentRegion.countries.map((country) => {
        const center = currentRegion.centers.get(country.id) ?? [50, 50];
        const inRoute = statusById.has(country.id);
        return {
          id: country.id,
          country: countryName(currentRegion, country.id, locale),
          x: center[0],
          y: center[1],
          visible: inRoute,
          status: inRoute ? statusById.get(country.id) : "hidden",
          destination: country.id === snapshot.challenge.destinationId
        };
      })
    };
  }, [locale]);

  const advanceTime = useCallback(() => undefined, []);
  useGameRuntimeBridge(state, payloadBuilder, advanceTime);

  if (!hasPlayableData) {
    return (
      <div
        className={[
          "mini-game",
          "knowledge-game",
          "knowledge-arcade-game",
          "knowledge-mapas-camino-corto",
          viewport.isMobile ? "is-mobile" : "",
          viewport.isMobile ? `is-mobile-${viewport.orientation}` : ""
        ].filter(Boolean).join(" ")}
      >
        <p className="unsupported-game">Map shortest path game is unavailable.</p>
      </div>
    );
  }

  return (
    <div
      className={[
        "mini-game",
        "knowledge-game",
        "knowledge-arcade-game",
        "knowledge-mapas-camino-corto",
        viewport.isMobile ? "is-mobile" : "",
        viewport.isMobile ? `is-mobile-${viewport.orientation}` : ""
      ].filter(Boolean).join(" ")}
    >
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="maps-head-actions">
          <button
            type="button"
            className="knowledge-ui-btn knowledge-ui-btn-secondary"
            onClick={loadNewRoute}
          >
            {copy.nextRoute}
          </button>
          <button
            type="button"
            className="knowledge-ui-btn knowledge-ui-btn-primary"
            onClick={restartRoute}
          >
            {copy.restart}
          </button>
        </div>
      </div>

      <section
        className={[
          "knowledge-mode-shell",
          "maps-shell",
          viewport.isMobile ? "knowledge-mobile-shell" : ""
        ].filter(Boolean).join(" ")}
      >
        <div className="knowledge-status-row">
          <span>{copy.mode}: {state.scopeMode === "provinces" ? copy.modeProvinces : copy.modeCountries}</span>
          <span>{copy.map}: {mapLabel}</span>
          <span>{copy.origin}: {originName}</span>
          <span>{copy.destination}: {destinationName}</span>
          <span>{copy.optimal}: {state.challenge.optimalSteps}</span>
          <span>{copy.taken}: {metrics.takenSteps}</span>
          <span>{copy.remain}: {metrics.remainingBest}</span>
          <span>{copy.attempts}: {state.attempts}</span>
          <span>{copy.status}: {state.status === "completed" ? copy.statusDone : copy.statusPlaying}</span>
        </div>

        <div className="maps-toolbar">
          <label>
            {copy.mode}
            <select value={state.scopeMode} onChange={onScopeChange}>
              {scopeOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
          {state.scopeMode === "countries" ? (
            <label>
              {copy.continent}
              <select value={state.regionId} onChange={onContinentChange}>
                {regionOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {state.scopeMode === "provinces" ? (
            <label>
              {copy.country}
              <select value={state.provinceCountryId} onChange={onProvinceCountryChange}>
                {provinceCountryOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <p className="maps-help">{copy.help}</p>
        <div className="maps-shortest-legend">
          <span className="legend-item legend-ideal">{copy.legendIdeal}</span>
          <span className="legend-item legend-alternative">{copy.legendAlt}</span>
        </div>

        <div className="maps-layout">
          <div
            className={boardClassName}
            role="img"
            aria-label={copy.caption(originName, destinationName, state.challenge.optimalSteps)}
          >
            <p className="maps-board-caption">
              {copy.caption(originName, destinationName, state.challenge.optimalSteps)}
            </p>
            <svg
              className="maps-silhouette-layer"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {region.countries.flatMap((country) => {
                const silhouette = region.silhouettes[country.id];
                if (!silhouette) return [];
                const isRevealed = revealed.has(country.id);
                const isDestination = country.id === state.challenge.destinationId;
                const status = routeStatusByCountry.get(country.id);
                const className = [
                  "maps-shape",
                  isRevealed ? "revealed" : "hidden",
                  `kind-${nodeKindClass}`,
                  isRevealed && status ? `path-${status}` : "",
                  !isRevealed && isDestination ? "target-destination" : ""
                ].filter(Boolean).join(" ");
                return silhouette.paths.map((shape, index) => (
                  <path
                    key={`${country.id}-shape-${index}`}
                    d={shape}
                    className={className}
                  />
                ));
              })}
            </svg>

            {region.countries.map((country) => {
              const isRevealed = revealed.has(country.id);
              const isDestination = country.id === state.challenge.destinationId;
              if (!isRevealed && !isDestination) return null;
              const center = region.centers.get(country.id) ?? [50, 50];
              const status = routeStatusByCountry.get(country.id);
              const routeIndex = routeIndexByCountry.get(country.id);
              const label = countryName(region, country.id, locale);
                const className = [
                  "maps-node",
                  isRevealed ? "revealed" : "hidden",
                  `kind-${nodeKindClass}`,
                  isRevealed && status ? `path-${status}` : "",
                  isDestination ? "target-destination" : ""
                ].filter(Boolean).join(" ");
              return (
                <div
                  key={`node-${country.id}`}
                  className={className}
                  style={{ left: `${center[0]}%`, top: `${center[1]}%` }}
                  title={label}
                >
                  <span className="maps-node-pin">
                    {isRevealed ? (routeIndex === 0 ? "S" : String(routeIndex)) : "D"}
                  </span>
                  <span className="maps-node-label">{isRevealed ? label : destinationName}</span>
                </div>
              );
            })}
          </div>

          <aside className="maps-side">
            <form
              className="maps-input-shell"
              onSubmit={(event) => {
                event.preventDefault();
                submitGuess();
              }}
            >
              <label>
                {copy.guessLabel}
                <input
                  ref={inputRef}
                  type="text"
                  value={state.draft}
                  onChange={onDraftChange}
                  placeholder={copy.guessPlaceholder}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitGuess();
                    }
                  }}
                />
              </label>
              <div className="maps-input-actions">
                <button
                  type="button"
                  className="knowledge-ui-btn knowledge-ui-btn-secondary"
                  onClick={clearDraft}
                  disabled={!state.draft.length}
                >
                  {copy.clear}
                </button>
                <button
                  type="submit"
                  className="knowledge-ui-btn knowledge-ui-btn-accent"
                  disabled={state.status === "completed"}
                >
                  {copy.submit}
                </button>
              </div>
            </form>

            <div className="maps-target-panel">
              <h5>{copy.routeTitle}</h5>
              <p>{copy.routeHint}</p>
              <ul className="maps-target-list maps-shortest-route-list">
                {state.route.map((step, index) => (
                  <li key={`${step.countryId}-${index}`} className={`path-${step.status}`}>
                    <span className="target-index">{String(index).padStart(2, "0")}</span>
                    <span className="target-name">{countryName(region, step.countryId, locale)}</span>
                    <span className="target-kind">{step.status}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="maps-target-panel">
              <h5>{copy.neighborsTitle}</h5>
              <p>{copy.neighborsHint(currentCountryName)}</p>
              <ul className="maps-target-list">
                {currentNeighbors.length ? (
                  currentNeighbors.map((neighbor, index) => (
                    <li key={neighbor.id} className="revealed">
                      <span className="target-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className="target-name">{neighbor.name}</span>
                      <span className="target-kind">adj</span>
                    </li>
                  ))
                ) : (
                  <li className="hidden">
                    <span className="target-index">--</span>
                    <span className="target-name">{copy.noNeighbors}</span>
                    <span className="target-kind">adj</span>
                  </li>
                )}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <p className="game-message">{state.message}</p>
    </div>
  );
}

export default MapsShortestPathKnowledgeGame;
