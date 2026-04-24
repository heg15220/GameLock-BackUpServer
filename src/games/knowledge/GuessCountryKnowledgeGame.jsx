import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../../utils/useGameRuntimeBridge";
import useMobileGameViewport from "../../mobile/useMobileGameViewport";
import {
  KNOWLEDGE_ARCADE_MATCH_COUNT,
  createSeededRandom,
  getRandomKnowledgeMatchId,
  getRandomKnowledgeMatchIdExcept,
  resolveKnowledgeArcadeLocale,
  shuffleWithRandom
} from "./knowledgeArcadeUtils";
import { MAP_COUNTRY_GROUPS } from "./mapsCountryGroupsData";
import { useMapSilhouetteThemes } from "./mapsSilhouettesData";

const ROUND_COUNT = 5;
const MAX_RECOMMENDED_VISIBLE = 14;
const AUTO_NEXT_ROUND_MS = 2000;
const SILHOUETTE_THEMES = [
  "world",
  "countries-america",
  "countries-africa",
  "countries-asia",
  "countries-oceania"
];

const COPY_BY_LOCALE = {
  es: {
    title: "Adivina el pais",
    subtitle: "5 rondas por partida: identifica el pais por su silueta.",
    restart: "Nueva partida",
    nextRound: "Siguiente ronda",
    round: "Ronda",
    score: "Aciertos",
    attempts: "Intentos",
    status: "Estado",
    statusPlaying: "En juego",
    statusReview: "Revisando ronda",
    statusFinished: "Finalizada",
    guessLabel: "Nombre del pais",
    guessPlaceholder: "Escribe un pais...",
    submit: "Validar",
    clear: "Limpiar",
    answer: "Respuesta",
    hiddenAnswer: "La respuesta se revela al validar.",
    help:
      "Escribe el nombre del pais y valida con Enter. Se muestran recomendados en tiempo real segun las letras.",
    recommendedTitle: "Recomendados",
    typeToRecommend: "Empieza a escribir para ver paises compatibles.",
    noRecommendations: "No hay paises compatibles con esas letras.",
    moreRecommendations: (count) => `+${count} paises mas`,
    correct: (name) => `Correcto: ${name}.`,
    wrong: (name) => `No coincide. Era ${name}.`,
    emptyGuess: "Escribe un pais antes de validar.",
    nextRoundHint: (round, total) => `Ronda ${round}/${total}.`,
    finished: (hits, total) => `Partida cerrada: ${hits}/${total} aciertos.`,
    historyTitle: "Historial",
    historyCorrect: "Acertada",
    historyWrong: "Fallada",
    yourGuess: "Tu respuesta",
    loadingData: "Cargando siluetas del mapa...",
    waitingData: "No hay suficientes siluetas para iniciar esta modalidad."
  },
  en: {
    title: "Guess The Country",
    subtitle: "5 rounds per match: identify the country silhouette.",
    restart: "New match",
    nextRound: "Next round",
    round: "Round",
    score: "Hits",
    attempts: "Attempts",
    status: "Status",
    statusPlaying: "Playing",
    statusReview: "Reviewing round",
    statusFinished: "Finished",
    guessLabel: "Country name",
    guessPlaceholder: "Type a country...",
    submit: "Check",
    clear: "Clear",
    answer: "Answer",
    hiddenAnswer: "The answer is revealed after checking.",
    help:
      "Type the country name and submit with Enter. Live recommendations update while you type.",
    recommendedTitle: "Recommended",
    typeToRecommend: "Start typing to see matching countries.",
    noRecommendations: "No countries match these letters.",
    moreRecommendations: (count) => `+${count} more countries`,
    correct: (name) => `Correct: ${name}.`,
    wrong: (name) => `Not correct. It was ${name}.`,
    emptyGuess: "Type a country before checking.",
    nextRoundHint: (round, total) => `Round ${round}/${total}.`,
    finished: (hits, total) => `Match complete: ${hits}/${total} correct.`,
    historyTitle: "History",
    historyCorrect: "Correct",
    historyWrong: "Wrong",
    yourGuess: "Your guess",
    loadingData: "Loading map silhouettes...",
    waitingData: "Not enough silhouettes are available to start this mode."
  }
};

const normalizeToken = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const resolveCountryName = (country, locale) =>
  country?.label?.[locale] ?? country?.label?.en ?? country?.label?.es ?? country?.id ?? "";

const findSilhouetteRef = (countryId, silhouettesByTheme) => {
  for (const theme of SILHOUETTE_THEMES) {
    const shape = silhouettesByTheme[theme]?.[countryId];
    if (shape?.paths?.length) {
      return { theme, paths: shape.paths };
    }
  }
  return null;
};

const buildCountryPool = (silhouettesByTheme) => {
  const mergedById = new Map();
  Object.values(MAP_COUNTRY_GROUPS).forEach((entries) => {
    entries.forEach((entry) => {
      if (!entry?.id) return;
      const previous = mergedById.get(entry.id) || {
        id: entry.id,
        label: {
          es: entry.labelEs || entry.labelEn || entry.id,
          en: entry.labelEn || entry.labelEs || entry.id
        },
        aliases: []
      };
      const aliasSet = new Set([
        ...(previous.aliases || []),
        ...(entry.aliases || [])
      ]);
      mergedById.set(entry.id, {
        ...previous,
        label: {
          es: entry.labelEs || previous.label.es || entry.id,
          en: entry.labelEn || previous.label.en || entry.labelEs || entry.id
        },
        aliases: [...aliasSet]
      });
    });
  });

  const out = [];
  mergedById.forEach((country) => {
    const silhouette = findSilhouetteRef(country.id, silhouettesByTheme);
    if (!silhouette) return;
    const aliasSet = new Set([
      country.id.replace(/-/g, " "),
      country.label.es,
      country.label.en,
      ...(country.aliases || [])
    ]);
    const searchEntries = [...aliasSet]
      .map((raw) => ({
        raw,
        token: normalizeToken(raw),
        preferred: raw === country.label.es || raw === country.label.en
      }))
      .filter((entry) => entry.token.length > 0);
    const acceptedTokens = new Set(searchEntries.map((entry) => entry.token));
    out.push({
      ...country,
      theme: silhouette.theme,
      paths: silhouette.paths,
      searchEntries,
      acceptedTokens
    });
  });

  return out.sort((a, b) =>
    resolveCountryName(a, "en").localeCompare(resolveCountryName(b, "en"))
  );
};

const buildRounds = (matchId, countryPool) => {
  if (!countryPool.length) return [];
  const random = createSeededRandom((Number(matchId) || 0) + 1);
  const shuffled = shuffleWithRandom(countryPool, random);
  return shuffled.slice(0, Math.min(ROUND_COUNT, shuffled.length));
};

const getRecommendations = (draft, locale, countryPool) => {
  const query = normalizeToken(draft);
  if (!query) return { total: 0, visible: [] };

  const matches = [];
  countryPool.forEach((country) => {
    let bestScore = null;
    country.searchEntries.forEach((entry) => {
      const index = entry.token.indexOf(query);
      if (index < 0) return;
      const score = (index === 0 ? 0 : 100) + (entry.preferred ? 0 : 10) + index;
      if (bestScore === null || score < bestScore) {
        bestScore = score;
      }
    });
    if (bestScore === null) return;
    matches.push({
      id: country.id,
      score: bestScore,
      name: resolveCountryName(country, locale)
    });
  });

  matches.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
  return {
    total: matches.length,
    visible: matches.slice(0, MAX_RECOMMENDED_VISIBLE)
  };
};

const createInitialState = (
  copy,
  countryPool,
  matchId = getRandomKnowledgeMatchId(),
  emptyMessage = copy.waitingData
) => {
  const rounds = buildRounds(matchId, countryPool);
  return {
    matchId,
    rounds,
    roundIndex: 0,
    draft: "",
    attempts: 0,
    hits: 0,
    status: rounds.length ? "playing" : "empty",
    revealCurrent: false,
    history: [],
    message: rounds.length ? copy.help : emptyMessage
  };
};

function GuessCountryKnowledgeGame() {
  const locale = useMemo(resolveKnowledgeArcadeLocale, []);
  const copy = useMemo(() => COPY_BY_LOCALE[locale] ?? COPY_BY_LOCALE.en, [locale]);
  const viewport = useMobileGameViewport();
  const { silhouettesByTheme, isLoading } = useMapSilhouetteThemes(SILHOUETTE_THEMES);
  const countryPool = useMemo(
    () => buildCountryPool(silhouettesByTheme),
    [silhouettesByTheme]
  );
  const [state, setState] = useState(() =>
    createInitialState(copy, [], getRandomKnowledgeMatchId(), copy.loadingData)
  );
  const inputRef = useRef(null);
  const shapeRef = useRef(null);
  const [shapeTransform, setShapeTransform] = useState("");

  useEffect(() => {
    setState((previous) =>
      createInitialState(
        copy,
        countryPool,
        previous.matchId,
        isLoading ? copy.loadingData : copy.waitingData
      )
    );
  }, [copy, countryPool, isLoading]);

  const currentRound = state.rounds[state.roundIndex] ?? null;
  const currentCountryName = resolveCountryName(currentRound, locale);
  const recommendations = useMemo(
    () => getRecommendations(state.draft, locale, countryPool),
    [countryPool, locale, state.draft]
  );
  const hiddenRecommendedCount = Math.max(
    0,
    recommendations.total - recommendations.visible.length
  );
  const statusLabel = state.status === "finished"
    ? copy.statusFinished
    : state.revealCurrent
      ? copy.statusReview
      : copy.statusPlaying;

  const restart = useCallback(() => {
    setState((previous) =>
      createInitialState(
        copy,
        countryPool,
        getRandomKnowledgeMatchIdExcept(previous.matchId),
        isLoading ? copy.loadingData : copy.waitingData
      )
    );
  }, [copy, countryPool, isLoading]);

  const nextRound = useCallback(() => {
    setState((previous) => {
      if (!previous.revealCurrent) return previous;
      if (previous.status === "finished") return previous;
      const nextRoundIndex = previous.roundIndex + 1;
      if (nextRoundIndex >= previous.rounds.length) return previous;
      return {
        ...previous,
        roundIndex: nextRoundIndex,
        draft: "",
        revealCurrent: false,
        status: "playing",
        message: copy.nextRoundHint(nextRoundIndex + 1, previous.rounds.length)
      };
    });
  }, [copy]);

  const clearDraft = useCallback(() => {
    setState((previous) => ({ ...previous, draft: "" }));
  }, []);

  const onDraftChange = useCallback((event) => {
    const value = event.target.value.slice(0, 56);
    setState((previous) => ({ ...previous, draft: value }));
  }, []);

  const submitGuess = useCallback(() => {
    setState((previous) => {
      if (!previous.rounds.length) return previous;
      if (previous.revealCurrent) return previous;
      const round = previous.rounds[previous.roundIndex];
      if (!round) return previous;
      const normalizedGuess = normalizeToken(previous.draft);
      if (!normalizedGuess) {
        return {
          ...previous,
          message: copy.emptyGuess
        };
      }

      const isCorrect = round.acceptedTokens.has(normalizedGuess);
      const attempts = previous.attempts + 1;
      const hits = previous.hits + (isCorrect ? 1 : 0);
      const isLastRound = previous.roundIndex >= previous.rounds.length - 1;
      const roundMessage = isCorrect
        ? copy.correct(resolveCountryName(round, locale))
        : copy.wrong(resolveCountryName(round, locale));
      const historyItem = {
        round: previous.roundIndex + 1,
        countryId: round.id,
        country: resolveCountryName(round, locale),
        guess: String(previous.draft || "").trim(),
        correct: isCorrect
      };

      return {
        ...previous,
        draft: "",
        attempts,
        hits,
        revealCurrent: true,
        status: isLastRound ? "finished" : "review",
        history: [...previous.history, historyItem],
        message: isLastRound
          ? `${roundMessage} ${copy.finished(hits, previous.rounds.length)}`
          : roundMessage
      };
    });
  }, [copy, locale]);

  useEffect(() => {
    if (viewport.isMobile) return;
    if (!inputRef.current) return;
    if (state.revealCurrent || state.status === "finished") return;
    inputRef.current.focus();
    inputRef.current.select();
  }, [state.roundIndex, state.revealCurrent, state.status, viewport.isMobile]);

  useEffect(() => {
    if (!state.revealCurrent || state.status === "finished") return undefined;
    const timer = window.setTimeout(() => {
      nextRound();
    }, AUTO_NEXT_ROUND_MS);
    return () => window.clearTimeout(timer);
  }, [nextRound, state.revealCurrent, state.status]);

  useEffect(() => {
    setShapeTransform("");
    if (!shapeRef.current || !currentRound) return undefined;
    const frame = window.requestAnimationFrame(() => {
      try {
        const bbox = shapeRef.current.getBBox();
        if (!bbox.width || !bbox.height) return;
        const targetSize = 84;
        const scale = Math.min(targetSize / bbox.width, targetSize / bbox.height);
        const centerX = bbox.x + bbox.width / 2;
        const centerY = bbox.y + bbox.height / 2;
        const translateX = 50 - centerX * scale;
        const translateY = 50 - centerY * scale;
        setShapeTransform(
          `translate(${translateX.toFixed(4)} ${translateY.toFixed(4)}) scale(${scale.toFixed(5)})`
        );
      } catch {
        setShapeTransform("");
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentRound?.id, currentRound?.theme]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const tagName = event.target?.tagName?.toLowerCase();
      const isInputContext =
        tagName === "input" || tagName === "textarea" || event.target?.isContentEditable;
      if (isInputContext) return;

      const key = String(event.key || "").toLowerCase();
      if (key === "r") {
        event.preventDefault();
        restart();
        return;
      }
      if (key === "n") {
        event.preventDefault();
        nextRound();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nextRound, restart]);

  const payloadBuilder = useCallback((snapshot) => {
    const snapshotRound = snapshot.rounds[snapshot.roundIndex] ?? null;
    const snapshotRecommendations = getRecommendations(snapshot.draft, locale, countryPool);
    return {
      mode: "knowledge-arcade",
      variant: "adivina-pais",
      locale,
      coordinates:
        "Silhouette paths are normalized with uniform scale+translate inside a fixed SVG viewBox 0..100 (origin top-left, +x right, +y down).",
      match: {
        current: snapshot.matchId + 1,
        total: KNOWLEDGE_ARCADE_MATCH_COUNT,
        round: snapshot.roundIndex + 1,
        rounds: snapshot.rounds.length
      },
      status: snapshot.status,
      revealCurrent: snapshot.revealCurrent,
      score: {
        hits: snapshot.hits,
        attempts: snapshot.attempts
      },
      input: {
        draft: snapshot.draft,
        recommendations: snapshotRecommendations.visible.map((entry) => entry.name),
        recommendationCount: snapshotRecommendations.total
      },
      currentRound: snapshotRound
        ? {
            id: snapshotRound.id,
            country: snapshot.revealCurrent
              ? resolveCountryName(snapshotRound, locale)
              : null,
            theme: snapshotRound.theme,
            pathCount: snapshotRound.paths.length
          }
        : null,
      history: snapshot.history.slice(-5),
      message: snapshot.message
    };
  }, [countryPool, locale]);

  const advanceTime = useCallback(() => undefined, []);
  useGameRuntimeBridge(state, payloadBuilder, advanceTime);

  if (!state.rounds.length) {
    return (
      <div
        className={[
          "mini-game",
          "knowledge-game",
          "knowledge-arcade-game",
          "knowledge-adivina-pais",
          viewport.isMobile ? "is-mobile" : "",
          viewport.isMobile ? `is-mobile-${viewport.orientation}` : ""
        ].filter(Boolean).join(" ")}
      >
        <div className="mini-head">
          <div>
            <h4>{copy.title}</h4>
            <p>{copy.subtitle}</p>
          </div>
          <button
            type="button"
            className="knowledge-ui-btn knowledge-ui-btn-primary"
            onClick={restart}
          >
            {copy.restart}
          </button>
        </div>
        <p className="game-message">{isLoading ? copy.loadingData : copy.waitingData}</p>
      </div>
    );
  }

  return (
    <div
      className={[
        "mini-game",
        "knowledge-game",
        "knowledge-arcade-game",
        "knowledge-adivina-pais",
        viewport.isMobile ? "is-mobile" : "",
        viewport.isMobile ? `is-mobile-${viewport.orientation}` : ""
      ].filter(Boolean).join(" ")}
    >
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="guess-country-head-actions">
          {state.revealCurrent && state.status !== "finished" ? (
            <button
              type="button"
              className="knowledge-ui-btn knowledge-ui-btn-secondary"
              onClick={nextRound}
            >
              {copy.nextRound}
            </button>
          ) : null}
          <button
            type="button"
            className="knowledge-ui-btn knowledge-ui-btn-primary"
            onClick={restart}
          >
            {copy.restart}
          </button>
        </div>
      </div>

      <section
        className={[
          "knowledge-mode-shell",
          "guess-country-shell",
          viewport.isMobile ? "knowledge-mobile-shell" : ""
        ].filter(Boolean).join(" ")}
      >
        <div className="knowledge-status-row guess-country-status">
          <span>{copy.round}: {Math.min(state.roundIndex + 1, state.rounds.length)}/{state.rounds.length}</span>
          <span>{copy.score}: {state.hits}</span>
          <span>{copy.attempts}: {state.attempts}</span>
          <span>{copy.status}: {statusLabel}</span>
        </div>

        <p className="guess-country-help">{copy.help}</p>

        <div className="guess-country-layout">
          <div className="guess-country-board-wrap">
            <div
              className={`guess-country-board ${state.revealCurrent ? "revealed" : "hidden"}`}
              role="img"
              aria-label={
                state.revealCurrent
                  ? `${copy.answer}: ${currentCountryName}`
                  : copy.hiddenAnswer
              }
            >
              <svg
                className="guess-country-silhouette"
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
              >
                <g transform={shapeTransform || undefined}>
                  <g ref={shapeRef}>
                    {currentRound.paths.map((path, index) => (
                      <path
                        key={`${currentRound.id}-shape-${index}`}
                        d={path}
                        className={`guess-country-shape ${state.revealCurrent ? "revealed" : "hidden"}`}
                      />
                    ))}
                  </g>
                </g>
              </svg>
            </div>
            <p className="guess-country-answer">
              <strong>{copy.answer}:</strong>{" "}
              {state.revealCurrent ? currentCountryName : copy.hiddenAnswer}
            </p>
            {state.revealCurrent && state.status !== "finished" ? (
              <div className="guess-country-next-inline">
                <button
                  type="button"
                  className="knowledge-ui-btn knowledge-ui-btn-secondary"
                  onClick={nextRound}
                >
                  {copy.nextRound}
                </button>
              </div>
            ) : null}
          </div>

          <aside className="guess-country-side">
            <form
              className="guess-country-input-shell"
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
                  disabled={state.revealCurrent}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitGuess();
                    }
                  }}
                />
              </label>
              <div className="guess-country-input-actions">
                <button
                  type="button"
                  className="knowledge-ui-btn knowledge-ui-btn-secondary"
                  onClick={clearDraft}
                  disabled={!state.draft.length || state.revealCurrent}
                >
                  {copy.clear}
                </button>
                <button
                  type="submit"
                  className="knowledge-ui-btn knowledge-ui-btn-accent"
                  disabled={state.revealCurrent}
                >
                  {copy.submit}
                </button>
              </div>
            </form>

            <div className="guess-country-suggestions">
              <h5>{copy.recommendedTitle}</h5>
              {recommendations.visible.length ? (
                <>
                  <ul>
                    {recommendations.visible.map((entry) => (
                      <li key={`recommended-${entry.id}`}>{entry.name}</li>
                    ))}
                  </ul>
                  {hiddenRecommendedCount > 0 ? (
                    <p className="more-count">{copy.moreRecommendations(hiddenRecommendedCount)}</p>
                  ) : null}
                </>
              ) : (
                <p>
                  {state.draft
                    ? copy.noRecommendations
                    : copy.typeToRecommend}
                </p>
              )}
            </div>

            <div className="guess-country-history">
              <h5>{copy.historyTitle}</h5>
              <ul>
                {state.history.length ? (
                  state.history.map((entry) => (
                    <li key={`history-round-${entry.round}`} className={entry.correct ? "correct" : "wrong"}>
                      <span>#{entry.round}</span>
                      <span>{entry.country}</span>
                      <span>{entry.correct ? copy.historyCorrect : copy.historyWrong}</span>
                      <span>
                        {copy.yourGuess}: <strong>{entry.guess || "-"}</strong>
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="empty">{copy.help}</li>
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

export default GuessCountryKnowledgeGame;
