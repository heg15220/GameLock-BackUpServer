import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useMobileGameViewport from "../../mobile/useMobileGameViewport";
import useGameRuntimeBridge from "../../utils/useGameRuntimeBridge";
import {
  KNOWLEDGE_ARCADE_MATCH_COUNT,
  getRandomKnowledgeMatchId,
  getRandomKnowledgeMatchIdExcept,
  resolveKnowledgeArcadeLocale
} from "./knowledgeArcadeUtils";
import {
  CONTINENT_MAPS,
  COUNTRY_MAPS,
  CITY_MAPS,
  DEFAULT_CONTINENT_ID,
  DEFAULT_COUNTRY_ID,
  DEFAULT_CITY_ID,
  MAP_SCOPE_OPTIONS,
  resolveMapDefinition,
  resolveMapVisualRegion
} from "./mapsKnowledgeData";
import { MAP_SILHOUETTES_BY_THEME } from "./mapsSilhouettesData";

const COPY_BY_LOCALE = {
  es: {
    title: "Mapas Atlas",
    subtitle: "Descubre nombres ocultos en mundo, continentes, paises y provincias.",
    restart: "Reiniciar mapa",
    randomMap: "Mapa aleatorio",
    scope: "Escala",
    map: "Mapa",
    continent: "Continente",
    country: "Pais",
    city: "Ciudades",
    discovered: "Descubiertos",
    pending: "Pendientes",
    attempts: "Intentos",
    accuracy: "Precision",
    status: "Estado",
    statusPlaying: "En curso",
    statusCompleted: "Completado",
    guessLabel: "Nombre geografico",
    guessPlaceholder: "Ej: Europa, Asia, Oceano Atlantico, Zaragoza...",
    submit: "Validar",
    clear: "Limpiar",
    help:
      "Escribe el nombre y pulsa Enter. Atajos globales: R reinicia el mapa actual y N carga un mapa aleatorio del modo elegido.",
    listTitle: "Objetivos del mapa",
    listHint: "Cada acierto desbloquea el nombre oculto.",
    hiddenName: "Oculto",
    hiddenNodeLabel: (index) => `#${index}`,
    emptyGuess: "Introduce un nombre antes de validar.",
    wrongGuess: (pending) =>
      `No coincide con un objetivo pendiente. Te quedan ${pending} por descubrir.`,
    alreadyFound: (name) => `${name} ya estaba descubierto.`,
    correctGuess: (name, pending) =>
      `Correcto: ${name}. Restan ${pending} objetivos ocultos.`,
    completedMessage: (attempts) =>
      `Mapa completado en ${attempts} intentos. Puedes reiniciar o cambiar de escala.`,
    kindLabels: {
      continent: "Continente",
      ocean: "Oceano",
      country: "Pais",
      province: "Provincia",
      city: "Ciudad"
    }
  },
  en: {
    title: "Atlas Maps",
    subtitle: "Discover hidden names across world, continents, countries and provinces.",
    restart: "Restart map",
    randomMap: "Random map",
    scope: "Scope",
    map: "Map",
    continent: "Continent",
    country: "Country",
    city: "Cities",
    discovered: "Discovered",
    pending: "Pending",
    attempts: "Attempts",
    accuracy: "Accuracy",
    status: "Status",
    statusPlaying: "In progress",
    statusCompleted: "Completed",
    guessLabel: "Geographic name",
    guessPlaceholder: "Ex: Europe, Asia, Atlantic Ocean, Zaragoza...",
    submit: "Check",
    clear: "Clear",
    help:
      "Type a name and press Enter. Global shortcuts: R restarts current map and N loads a random map in the chosen scope.",
    listTitle: "Map targets",
    listHint: "Each correct guess unlocks one hidden name.",
    hiddenName: "Hidden",
    hiddenNodeLabel: (index) => `#${index}`,
    emptyGuess: "Type a name before checking.",
    wrongGuess: (pending) =>
      `That does not match any pending target. ${pending} targets remain hidden.`,
    alreadyFound: (name) => `${name} is already unlocked.`,
    correctGuess: (name, pending) =>
      `Correct: ${name}. ${pending} hidden targets left.`,
    completedMessage: (attempts) =>
      `Map complete in ${attempts} attempts. You can restart or switch scope.`,
    kindLabels: {
      continent: "Continent",
      ocean: "Ocean",
      country: "Country",
      province: "Province",
      city: "City"
    }
  }
};

const normalizeToken = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const resolveLocalizedText = (entry, locale) => entry?.[locale] ?? entry?.en ?? entry?.es ?? "";

const buildTargetIndex = (targets) => {
  const byId = new Map();
  const byAlias = new Map();
  for (const target of targets) {
    byId.set(target.id, target);
    const variants = new Set([
      target.label.es,
      target.label.en,
      ...(target.aliases ?? [])
    ]);
    for (const variant of variants) {
      const normalized = normalizeToken(variant);
      if (normalized && !byAlias.has(normalized)) {
        byAlias.set(normalized, target.id);
      }
    }
  }
  return { byId, byAlias };
};

const pickRandomDifferentId = (items, currentId) => {
  if (!items.length) return currentId;
  if (items.length === 1) return items[0].id;
  const pool = items.filter((entry) => entry.id !== currentId);
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex]?.id ?? currentId;
};

const createInitialState = ({
  copy,
  matchId = getRandomKnowledgeMatchId(),
  scopeMode = "world",
  continentId = DEFAULT_CONTINENT_ID,
  countryId = DEFAULT_COUNTRY_ID,
  cityId = DEFAULT_CITY_ID
}) => ({
  matchId,
  scopeMode,
  continentId,
  countryId,
  cityId,
  revealedIds: [],
  attempts: 0,
  draft: "",
  status: "playing",
  message: copy.help
});

function MapsKnowledgeGame() {
  const locale = useMemo(resolveKnowledgeArcadeLocale, []);
  const copy = useMemo(() => COPY_BY_LOCALE[locale] ?? COPY_BY_LOCALE.en, [locale]);
  const viewport = useMobileGameViewport();
  const [state, setState] = useState(() => createInitialState({ copy }));
  const inputRef = useRef(null);

  const activeMap = useMemo(
    () => resolveMapDefinition(state.scopeMode, state.continentId, state.countryId, state.cityId),
    [state.scopeMode, state.continentId, state.countryId, state.cityId]
  );
  const visualRegion = useMemo(
    () => resolveMapVisualRegion(state.scopeMode, state.continentId, state.countryId, state.cityId),
    [state.scopeMode, state.continentId, state.countryId, state.cityId]
  );
  const mapTitle = resolveLocalizedText(activeMap.name, locale);
  const mapSubtitle = resolveLocalizedText(activeMap.subtitle, locale);
  const isFlatSilhouetteScope = state.scopeMode === "country" || state.scopeMode === "city";
  const boardClassName = [
    "maps-board",
    `maps-theme-${activeMap.theme}`,
    `maps-scope-${state.scopeMode}`,
    `maps-region-${visualRegion}`,
    isFlatSilhouetteScope ? "maps-board-flat" : ""
  ].filter(Boolean).join(" ");
  const activeSilhouettes = useMemo(
    () => MAP_SILHOUETTES_BY_THEME[activeMap.theme] ?? {},
    [activeMap.theme]
  );
  const baseSilhouetteShapes = useMemo(() => {
    if (!activeMap.baseSilhouette?.theme) return [];
    const baseTheme = MAP_SILHOUETTES_BY_THEME[activeMap.baseSilhouette.theme] ?? {};
    const shapeIds = activeMap.baseSilhouette.ids?.length
      ? activeMap.baseSilhouette.ids
      : Object.keys(baseTheme);
    return shapeIds
      .map((shapeId) => ({
        id: shapeId,
        paths: baseTheme[shapeId]?.paths ?? []
      }))
      .filter((shape) => shape.paths.length);
  }, [activeMap.baseSilhouette]);
  const revealedSet = useMemo(() => new Set(state.revealedIds), [state.revealedIds]);

  const scopeOptions = useMemo(
    () =>
      MAP_SCOPE_OPTIONS.map((entry) => ({
        id: entry.id,
        label: resolveLocalizedText(entry.label, locale)
      })),
    [locale]
  );
  const continentOptions = useMemo(
    () =>
      CONTINENT_MAPS.map((entry) => ({
        id: entry.id,
        label: resolveLocalizedText(entry.name, locale)
      })),
    [locale]
  );
  const countryOptions = useMemo(
    () =>
      COUNTRY_MAPS.map((entry) => ({
        id: entry.id,
        label: resolveLocalizedText(entry.name, locale)
      })),
    [locale]
  );
  const cityOptions = useMemo(
    () =>
      CITY_MAPS.map((entry) => ({
        id: entry.id,
        label: resolveLocalizedText(entry.name, locale)
      })),
    [locale]
  );
  const scopeLabel = scopeOptions.find((entry) => entry.id === state.scopeMode)?.label ?? state.scopeMode;

  const discoveredCount = state.revealedIds.length;
  const totalTargets = activeMap.targets.length;
  const pendingCount = Math.max(0, totalTargets - discoveredCount);
  const accuracy = state.attempts ? Math.round((discoveredCount / state.attempts) * 100) : 0;
  const statusLabel = state.status === "completed" ? copy.statusCompleted : copy.statusPlaying;

  const resetState = useCallback((resolver) => {
    setState((previous) => {
      const nextState = resolver(previous);
      return createInitialState({ copy, ...nextState });
    });
  }, [copy]);

  const restartCurrentMap = useCallback(() => {
    resetState((previous) => ({
      matchId: getRandomKnowledgeMatchIdExcept(previous.matchId),
      scopeMode: previous.scopeMode,
      continentId: previous.continentId,
      countryId: previous.countryId,
      cityId: previous.cityId
    }));
  }, [resetState]);

  const randomizeMap = useCallback(() => {
    resetState((previous) => {
      if (previous.scopeMode === "continent") {
        const randomContinentId = pickRandomDifferentId(CONTINENT_MAPS, previous.continentId);
        return {
          matchId: getRandomKnowledgeMatchIdExcept(previous.matchId),
          scopeMode: "continent",
          continentId: randomContinentId,
          countryId: previous.countryId,
          cityId: previous.cityId
        };
      }
      if (previous.scopeMode === "country") {
        const randomCountryId = pickRandomDifferentId(COUNTRY_MAPS, previous.countryId);
        return {
          matchId: getRandomKnowledgeMatchIdExcept(previous.matchId),
          scopeMode: "country",
          continentId: previous.continentId,
          countryId: randomCountryId,
          cityId: previous.cityId
        };
      }
      if (previous.scopeMode === "city") {
        const randomCityId = pickRandomDifferentId(CITY_MAPS, previous.cityId);
        return {
          matchId: getRandomKnowledgeMatchIdExcept(previous.matchId),
          scopeMode: "city",
          continentId: previous.continentId,
          countryId: previous.countryId,
          cityId: randomCityId
        };
      }
      return {
        matchId: getRandomKnowledgeMatchIdExcept(previous.matchId),
        scopeMode: "world",
        continentId: previous.continentId,
        countryId: previous.countryId,
        cityId: previous.cityId
      };
    });
  }, [resetState]);

  const onScopeChange = useCallback((event) => {
    const scopeMode = event.target.value;
    resetState((previous) => ({
      matchId: getRandomKnowledgeMatchIdExcept(previous.matchId),
      scopeMode,
      continentId: previous.continentId,
      countryId: previous.countryId,
      cityId: previous.cityId
    }));
  }, [resetState]);

  const onContinentChange = useCallback((event) => {
    const continentId = event.target.value;
    resetState((previous) => ({
      matchId: getRandomKnowledgeMatchIdExcept(previous.matchId),
      scopeMode: "continent",
      continentId,
      countryId: previous.countryId,
      cityId: previous.cityId
    }));
  }, [resetState]);

  const onCountryChange = useCallback((event) => {
    const countryId = event.target.value;
    resetState((previous) => ({
      matchId: getRandomKnowledgeMatchIdExcept(previous.matchId),
      scopeMode: "country",
      continentId: previous.continentId,
      countryId,
      cityId: previous.cityId
    }));
  }, [resetState]);

  const onCityChange = useCallback((event) => {
    const cityId = event.target.value;
    resetState((previous) => ({
      matchId: getRandomKnowledgeMatchIdExcept(previous.matchId),
      scopeMode: "city",
      continentId: previous.continentId,
      countryId: previous.countryId,
      cityId
    }));
  }, [resetState]);

  const onDraftChange = useCallback((event) => {
    const value = event.target.value.slice(0, 42);
    setState((previous) => ({
      ...previous,
      draft: value
    }));
  }, []);

  const clearDraft = useCallback(() => {
    setState((previous) => ({
      ...previous,
      draft: ""
    }));
  }, []);

  const submitGuess = useCallback(() => {
    setState((previous) => {
      const nextMap = resolveMapDefinition(
        previous.scopeMode,
        previous.continentId,
        previous.countryId,
        previous.cityId
      );
      const nextIndex = buildTargetIndex(nextMap.targets);
      const normalizedGuess = normalizeToken(previous.draft);

      if (!normalizedGuess) {
        return {
          ...previous,
          message: copy.emptyGuess
        };
      }

      const guessedTargetId = nextIndex.byAlias.get(normalizedGuess);
      const nextAttempts = previous.attempts + 1;
      if (!guessedTargetId) {
        return {
          ...previous,
          attempts: nextAttempts,
          draft: "",
          message: copy.wrongGuess(nextMap.targets.length - previous.revealedIds.length)
        };
      }

      if (previous.revealedIds.includes(guessedTargetId)) {
        const discoveredTarget = nextIndex.byId.get(guessedTargetId);
        return {
          ...previous,
          attempts: nextAttempts,
          draft: "",
          message: copy.alreadyFound(resolveLocalizedText(discoveredTarget?.label, locale))
        };
      }

      const nextRevealedIds = [...previous.revealedIds, guessedTargetId];
      const finished = nextRevealedIds.length >= nextMap.targets.length;
      const discoveredTarget = nextIndex.byId.get(guessedTargetId);

      return {
        ...previous,
        attempts: nextAttempts,
        revealedIds: nextRevealedIds,
        draft: "",
        status: finished ? "completed" : "playing",
        message: finished
          ? copy.completedMessage(nextAttempts)
          : copy.correctGuess(
            resolveLocalizedText(discoveredTarget?.label, locale),
            nextMap.targets.length - nextRevealedIds.length
          )
      };
    });
  }, [copy, locale]);

  useEffect(() => {
    if (viewport.isMobile) {
      return;
    }
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [
    state.scopeMode,
    state.continentId,
    state.countryId,
    state.cityId,
    state.revealedIds.length,
    state.status,
    viewport.isMobile
  ]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const tagName = event.target?.tagName?.toLowerCase();
      const isInputContext =
        tagName === "input" || tagName === "textarea" || event.target?.isContentEditable;
      if (isInputContext) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "r") {
        event.preventDefault();
        restartCurrentMap();
        return;
      }
      if (key === "n") {
        event.preventDefault();
        randomizeMap();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [randomizeMap, restartCurrentMap]);

  const payloadBuilder = useCallback((snapshot) => {
    const mapDefinition = resolveMapDefinition(
      snapshot.scopeMode,
      snapshot.continentId,
      snapshot.countryId,
      snapshot.cityId
    );
    const visibleTargets = new Set(snapshot.revealedIds);
    const discovered = snapshot.revealedIds.length;

    return {
      mode: "knowledge-arcade",
      variant: "mapas",
      coordinates: "map_percent_origin_top_left",
      locale,
      match: {
        current: snapshot.matchId + 1,
        total: KNOWLEDGE_ARCADE_MATCH_COUNT
      },
      scopeMode: snapshot.scopeMode,
      cityId: snapshot.cityId,
      map: {
        id: mapDefinition.id,
        title: resolveLocalizedText(mapDefinition.name, locale),
        subtitle: resolveLocalizedText(mapDefinition.subtitle, locale),
        theme: mapDefinition.theme,
        totalTargets: mapDefinition.targets.length
      },
      progress: {
        discovered,
        pending: mapDefinition.targets.length - discovered,
        attempts: snapshot.attempts,
        accuracy: snapshot.attempts
          ? Math.round((discovered / snapshot.attempts) * 100)
          : 0,
        status: snapshot.status
      },
      input: {
        draft: snapshot.draft,
        message: snapshot.message
      },
      targets: mapDefinition.targets.map((target) => ({
        id: target.id,
        kind: target.kind,
        x: (MAP_SILHOUETTES_BY_THEME[mapDefinition.theme]?.[target.id]?.center?.[0] ?? target.x),
        y: (MAP_SILHOUETTES_BY_THEME[mapDefinition.theme]?.[target.id]?.center?.[1] ?? target.y),
        silhouette: Boolean(MAP_SILHOUETTES_BY_THEME[mapDefinition.theme]?.[target.id]),
        revealed: visibleTargets.has(target.id),
        label: visibleTargets.has(target.id)
          ? resolveLocalizedText(target.label, locale)
          : null
      }))
    };
  }, [locale]);

  const advanceTime = useCallback(() => undefined, []);
  useGameRuntimeBridge(state, payloadBuilder, advanceTime);

  return (
    <div
      className={[
        "mini-game",
        "knowledge-game",
        "knowledge-arcade-game",
        "knowledge-mapas",
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
            onClick={randomizeMap}
          >
            {copy.randomMap}
          </button>
          <button
            type="button"
            className="knowledge-ui-btn knowledge-ui-btn-primary"
            onClick={restartCurrentMap}
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
          <span>{copy.scope}: {scopeLabel}</span>
          <span>{copy.map}: {mapTitle}</span>
          <span>{copy.discovered}: {discoveredCount}/{totalTargets}</span>
          <span>{copy.pending}: {pendingCount}</span>
          <span>{copy.attempts}: {state.attempts}</span>
          <span>{copy.accuracy}: {accuracy}%</span>
          <span>{copy.status}: {statusLabel}</span>
        </div>

        <div className="maps-toolbar">
          <label>
            {copy.scope}
            <select value={state.scopeMode} onChange={onScopeChange}>
              {scopeOptions.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>

          {state.scopeMode === "continent" ? (
            <label>
              {copy.continent}
              <select value={state.continentId} onChange={onContinentChange}>
                {continentOptions.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {state.scopeMode === "country" ? (
            <label>
              {copy.country}
              <select value={state.countryId} onChange={onCountryChange}>
                {countryOptions.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {state.scopeMode === "city" ? (
            <label>
              {copy.city}
              <select value={state.cityId} onChange={onCityChange}>
                {cityOptions.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <p className="maps-help">{copy.help}</p>

        <div className="maps-layout">
          <div
            className={boardClassName}
            role="img"
            aria-label={`${mapTitle}. ${mapSubtitle}`}
          >
            <p className="maps-board-caption">{mapSubtitle}</p>
            <svg
              className="maps-silhouette-layer"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {baseSilhouetteShapes.flatMap((shape) =>
                shape.paths.map((shapePath, index) => (
                  <path
                    key={`base-${shape.id}-${index}`}
                    d={shapePath}
                    className="maps-shape base"
                  />
                ))
              )}
              {activeMap.targets.flatMap((target) => {
                const silhouette = activeSilhouettes[target.id];
                if (!silhouette) return [];
                const discovered = revealedSet.has(target.id);
                return silhouette.paths.map((shapePath, index) => (
                  <path
                    key={`${target.id}-shape-${index}`}
                    d={shapePath}
                    className={`maps-shape ${discovered ? "revealed" : "hidden"} kind-${target.kind}`.trim()}
                  />
                ));
              })}
            </svg>

            {activeMap.targets.map((target, index) => {
              const discovered = revealedSet.has(target.id);
              const targetName = resolveLocalizedText(target.label, locale);
              const silhouette = activeSilhouettes[target.id];
              const markerX = silhouette?.center?.[0] ?? target.x;
              const markerY = silhouette?.center?.[1] ?? target.y;
              return (
                <div
                  key={target.id}
                  className={`maps-node ${discovered ? "revealed" : "hidden"} kind-${target.kind}`.trim()}
                  style={{
                    left: `${markerX}%`,
                    top: `${markerY}%`
                  }}
                  title={discovered ? targetName : copy.hiddenName}
                >
                  <span className="maps-node-pin">{discovered ? "o" : "?"}</span>
                  <span className="maps-node-label">
                    {discovered ? targetName : copy.hiddenNodeLabel(index + 1)}
                  </span>
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
                >
                  {copy.submit}
                </button>
              </div>
            </form>

            <div className="maps-target-panel">
              <h5>{copy.listTitle}</h5>
              <p>{copy.listHint}</p>
              <ul className="maps-target-list">
                {activeMap.targets.map((target, index) => {
                  const discovered = revealedSet.has(target.id);
                  const targetName = resolveLocalizedText(target.label, locale);
                  return (
                    <li key={`target-${target.id}`} className={discovered ? "revealed" : "hidden"}>
                      <span className="target-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className="target-name">{discovered ? targetName : copy.hiddenName}</span>
                      <span className="target-kind">
                        {copy.kindLabels[target.kind] ?? target.kind}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <p className="game-message">{state.message}</p>
    </div>
  );
}

export default MapsKnowledgeGame;
