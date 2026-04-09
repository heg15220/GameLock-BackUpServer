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
  PERIODIC_TABLE_BY_ATOMIC,
  PERIODIC_TABLE_BY_GRID,
  PERIODIC_TABLE_ELEMENT_COUNT,
  PERIODIC_TABLE_ELEMENTS,
  PERIODIC_TABLE_PLACEHOLDER_BY_GRID
} from "./periodicTableElements";

const GRID_ROWS = 9;
const GRID_COLS = 18;

const COPY_BY_LOCALE = {
  es: {
    title: "Tabla Periodica Total",
    subtitle: "Rellena las 118 casillas vacias con el elemento correcto.",
    restart: "Partida aleatoria",
    solved: "Completadas",
    remaining: "Pendientes",
    attempts: "Intentos",
    mistakes: "Errores",
    status: "Estado",
    statusPlaying: "En curso",
    statusWon: "Completa",
    selectedCell: "Casilla activa",
    period: "Periodo",
    group: "Grupo",
    series: "Serie",
    seriesMain: "Principal",
    seriesLanthanide: "Lantanidos",
    seriesActinide: "Actinidos",
    currentValue: "Valor actual",
    hiddenElement: "Elemento oculto",
    inputLabel: "Escribe simbolo o nombre",
    inputPlaceholder: "Ej: H, Helio, Oxygen...",
    submit: "Validar",
    clear: "Limpiar casilla",
    nextPending: "Siguiente vacia",
    help: "Flechas mueven entre casillas, Enter valida, N salta a la siguiente pendiente y R reinicia.",
    startMessage: "Selecciona una casilla y escribe el elemento correspondiente.",
    emptyInput: "Introduce un simbolo o nombre antes de validar.",
    correctMessage: (symbol) => `Correcto: ${symbol}.`,
    incorrectMessage: "No coincide con el elemento de esa casilla. Revisa y vuelve a probar.",
    clearedCell: "Casilla limpiada.",
    completedMessage: (attempts, mistakes) =>
      `Tabla completada. Intentos: ${attempts}. Errores: ${mistakes}.`,
    noPending: "No quedan casillas pendientes.",
    placeholderLanthanides: "Bloque lantanidos",
    placeholderActinides: "Bloque actinidos"
  },
  en: {
    title: "Full Periodic Table",
    subtitle: "Fill all 118 empty cells with the correct element.",
    restart: "Random match",
    solved: "Solved",
    remaining: "Remaining",
    attempts: "Attempts",
    mistakes: "Mistakes",
    status: "Status",
    statusPlaying: "In progress",
    statusWon: "Completed",
    selectedCell: "Active cell",
    period: "Period",
    group: "Group",
    series: "Series",
    seriesMain: "Main",
    seriesLanthanide: "Lanthanides",
    seriesActinide: "Actinides",
    currentValue: "Current value",
    hiddenElement: "Hidden element",
    inputLabel: "Type symbol or name",
    inputPlaceholder: "Ex: H, Helium, Oxygen...",
    submit: "Check",
    clear: "Clear cell",
    nextPending: "Next empty",
    help: "Arrows move between cells, Enter checks, N jumps to next pending, and R restarts.",
    startMessage: "Pick a cell and type the corresponding element.",
    emptyInput: "Enter a symbol or name before checking.",
    correctMessage: (symbol) => `Correct: ${symbol}.`,
    incorrectMessage: "That does not match this cell. Adjust and try again.",
    clearedCell: "Cell cleared.",
    completedMessage: (attempts, mistakes) =>
      `Table completed. Attempts: ${attempts}. Mistakes: ${mistakes}.`,
    noPending: "No pending cells left.",
    placeholderLanthanides: "Lanthanide block",
    placeholderActinides: "Actinide block"
  }
};

const ADDITIONAL_ACCEPTED_ALIASES = {
  13: ["ALUMINIUM"],
  16: ["SULPHUR"],
  55: ["CAESIUM"],
  74: ["WOLFRAM"]
};

const normalizeToken = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const ACCEPTED_VALUES_BY_ATOMIC = new Map(
  PERIODIC_TABLE_ELEMENTS.map((element) => {
    const accepted = new Set([
      normalizeToken(element.symbol),
      normalizeToken(element.nameEs),
      normalizeToken(element.nameEn),
      String(element.atomicNumber)
    ]);

    const aliases = ADDITIONAL_ACCEPTED_ALIASES[element.atomicNumber] ?? [];
    aliases.forEach((alias) => accepted.add(normalizeToken(alias)));

    return [element.atomicNumber, accepted];
  })
);

const createInitialState = (matchId, copy) => ({
  matchId,
  selectedAtomic: 1,
  entries: {},
  draft: "",
  solvedCount: 0,
  attempts: 0,
  mistakes: 0,
  status: "playing",
  message: copy.startMessage
});

const countSolvedEntries = (entries) =>
  PERIODIC_TABLE_ELEMENTS.reduce(
    (total, element) => total + (entries[element.atomicNumber]?.correct ? 1 : 0),
    0
  );

const resolveNextPendingAtomic = (entries, fromAtomic) => {
  for (let offset = 1; offset <= PERIODIC_TABLE_ELEMENT_COUNT; offset += 1) {
    const candidate = ((fromAtomic - 1 + offset) % PERIODIC_TABLE_ELEMENT_COUNT) + 1;
    if (!entries[candidate]?.correct) {
      return candidate;
    }
  }
  return fromAtomic;
};

const resolveNeighborAtomic = (currentAtomic, deltaRow, deltaCol) => {
  const current = PERIODIC_TABLE_BY_ATOMIC.get(currentAtomic);
  if (!current) return currentAtomic;

  let row = current.row;
  let col = current.col;
  for (let step = 0; step < 40; step += 1) {
    row += deltaRow;
    col += deltaCol;
    if (row < 1 || row > GRID_ROWS || col < 1 || col > GRID_COLS) {
      break;
    }
    const candidate = PERIODIC_TABLE_BY_GRID.get(`${row},${col}`);
    if (candidate) {
      return candidate;
    }
  }
  return currentAtomic;
};

function PeriodicTableKnowledgeGame() {
  const locale = useMemo(resolveKnowledgeArcadeLocale, []);
  const copy = useMemo(() => COPY_BY_LOCALE[locale] ?? COPY_BY_LOCALE.en, [locale]);
  const viewport = useMobileGameViewport();
  const [state, setState] = useState(() =>
    createInitialState(getRandomKnowledgeMatchId(), copy)
  );
  const inputRef = useRef(null);

  const selectCell = useCallback((atomicNumber) => {
    setState((previous) => ({
      ...previous,
      selectedAtomic: atomicNumber,
      draft: previous.entries[atomicNumber]?.value ?? ""
    }));
  }, []);

  const restart = useCallback(() => {
    setState((previous) =>
      createInitialState(getRandomKnowledgeMatchIdExcept(previous.matchId), copy)
    );
  }, [copy]);

  const clearCell = useCallback(() => {
    setState((previous) => {
      const nextEntries = { ...previous.entries };
      delete nextEntries[previous.selectedAtomic];
      return {
        ...previous,
        entries: nextEntries,
        solvedCount: countSolvedEntries(nextEntries),
        draft: "",
        message: copy.clearedCell
      };
    });
  }, [copy.clearedCell]);

  const jumpToNextPending = useCallback(() => {
    setState((previous) => {
      const nextAtomic = resolveNextPendingAtomic(previous.entries, previous.selectedAtomic);
      if (nextAtomic === previous.selectedAtomic && previous.entries[nextAtomic]?.correct) {
        return {
          ...previous,
          message: copy.noPending
        };
      }
      return {
        ...previous,
        selectedAtomic: nextAtomic,
        draft: previous.entries[nextAtomic]?.value ?? ""
      };
    });
  }, [copy.noPending]);

  const submitCell = useCallback(() => {
    setState((previous) => {
      if (previous.status === "won") {
        return previous;
      }

      const element = PERIODIC_TABLE_BY_ATOMIC.get(previous.selectedAtomic);
      if (!element) {
        return previous;
      }

      const rawValue = previous.draft.trim();
      if (!rawValue) {
        return {
          ...previous,
          message: copy.emptyInput
        };
      }

      const normalized = normalizeToken(rawValue);
      const acceptedValues = ACCEPTED_VALUES_BY_ATOMIC.get(element.atomicNumber);
      const isCorrect = acceptedValues?.has(normalized) ?? false;

      const nextEntries = {
        ...previous.entries,
        [element.atomicNumber]: {
          value: rawValue,
          correct: isCorrect
        }
      };

      const solvedCount = countSolvedEntries(nextEntries);
      const won = solvedCount >= PERIODIC_TABLE_ELEMENT_COUNT;
      const nextSelectedAtomic = isCorrect && !won
        ? resolveNextPendingAtomic(nextEntries, element.atomicNumber)
        : element.atomicNumber;
      const nextAttempts = previous.attempts + 1;
      const nextMistakes = previous.mistakes + (isCorrect ? 0 : 1);

      return {
        ...previous,
        entries: nextEntries,
        solvedCount,
        attempts: nextAttempts,
        mistakes: nextMistakes,
        status: won ? "won" : "playing",
        selectedAtomic: nextSelectedAtomic,
        draft: nextEntries[nextSelectedAtomic]?.value ?? "",
        message: won
          ? copy.completedMessage(nextAttempts, nextMistakes)
          : isCorrect
            ? copy.correctMessage(element.symbol)
            : copy.incorrectMessage
      };
    });
  }, [copy]);

  const moveSelection = useCallback((deltaRow, deltaCol) => {
    setState((previous) => {
      const nextAtomic = resolveNeighborAtomic(previous.selectedAtomic, deltaRow, deltaCol);
      if (nextAtomic === previous.selectedAtomic) {
        return previous;
      }
      return {
        ...previous,
        selectedAtomic: nextAtomic,
        draft: previous.entries[nextAtomic]?.value ?? ""
      };
    });
  }, []);

  const onDraftChange = useCallback((event) => {
    const value = event.target.value;
    setState((previous) => ({
      ...previous,
      draft: value.slice(0, 24)
    }));
  }, []);

  useEffect(() => {
    if (viewport.isMobile) {
      return;
    }
    if (inputRef.current && state.status !== "won") {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [state.selectedAtomic, state.status, viewport.isMobile]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveSelection(-1, 0);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveSelection(1, 0);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveSelection(0, -1);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveSelection(0, 1);
        return;
      }
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        jumpToNextPending();
        return;
      }
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        restart();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [jumpToNextPending, moveSelection, restart]);

  const statusLabel = state.status === "won" ? copy.statusWon : copy.statusPlaying;
  const remainingCount = PERIODIC_TABLE_ELEMENT_COUNT - state.solvedCount;
  const selectedElement = PERIODIC_TABLE_BY_ATOMIC.get(state.selectedAtomic);
  const selectedEntry = state.entries[state.selectedAtomic];

  const resolveSeriesLabel = useCallback((series) => {
    if (series === "lanthanide") return copy.seriesLanthanide;
    if (series === "actinide") return copy.seriesActinide;
    return copy.seriesMain;
  }, [copy.seriesActinide, copy.seriesLanthanide, copy.seriesMain]);

  const payloadBuilder = useCallback((snapshot) => ({
    mode: "knowledge-arcade",
    variant: "tabla-periodica",
    coordinates: "periodic_table_rows_1_to_9_cols_1_to_18_origin_top_left",
    locale,
    match: {
      current: snapshot.matchId + 1,
      total: KNOWLEDGE_ARCADE_MATCH_COUNT
    },
    status: snapshot.status,
    selectedAtomic: snapshot.selectedAtomic,
    solvedCount: snapshot.solvedCount,
    remainingCount: PERIODIC_TABLE_ELEMENT_COUNT - snapshot.solvedCount,
    attempts: snapshot.attempts,
    mistakes: snapshot.mistakes,
    message: snapshot.message,
    cells: PERIODIC_TABLE_ELEMENTS.map((element) => {
      const entry = snapshot.entries[element.atomicNumber];
      return {
        atomicNumber: element.atomicNumber,
        row: element.row,
        col: element.col,
        value: entry?.value ?? "",
        correct: Boolean(entry?.correct)
      };
    })
  }), [locale]);

  const advanceTime = useCallback(() => undefined, []);
  useGameRuntimeBridge(state, payloadBuilder, advanceTime);

  return (
    <div
      className={[
        "mini-game",
        "knowledge-game",
        "knowledge-arcade-game",
        "knowledge-tabla-periodica",
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

      <section
        className={[
          "knowledge-mode-shell",
          "periodic-shell",
          viewport.isMobile ? "knowledge-mobile-shell" : ""
        ].filter(Boolean).join(" ")}
      >
        <div className="knowledge-status-row">
          <span>{copy.solved}: {state.solvedCount}/{PERIODIC_TABLE_ELEMENT_COUNT}</span>
          <span>{copy.remaining}: {remainingCount}</span>
          <span>{copy.attempts}: {state.attempts}</span>
          <span>{copy.mistakes}: {state.mistakes}</span>
          <span>{copy.status}: {statusLabel}</span>
        </div>

        <p className="periodic-help">{copy.help}</p>

        <div className="periodic-layout">
          <div className="periodic-board-shell">
            <div className="periodic-grid" role="grid" aria-label={copy.title}>
              {Array.from({ length: GRID_ROWS }, (_, rowIndex) => {
                const row = rowIndex + 1;
                return Array.from({ length: GRID_COLS }, (_, colIndex) => {
                  const col = colIndex + 1;
                  const key = `${row},${col}`;
                  const atomicNumber = PERIODIC_TABLE_BY_GRID.get(key);
                  const placeholder = PERIODIC_TABLE_PLACEHOLDER_BY_GRID.get(key);

                  if (!atomicNumber) {
                    if (placeholder) {
                      const placeholderLabel = placeholder.id === "lanthanides-bridge"
                        ? copy.placeholderLanthanides
                        : copy.placeholderActinides;
                      return (
                        <div
                          key={key}
                          className="periodic-placeholder"
                          title={placeholderLabel}
                        >
                          <span>{placeholder.label}</span>
                        </div>
                      );
                    }
                    return <div key={key} className="periodic-gap" aria-hidden="true" />;
                  }

                  const element = PERIODIC_TABLE_BY_ATOMIC.get(atomicNumber);
                  const entry = state.entries[atomicNumber];
                  const selected = state.selectedAtomic === atomicNumber;
                  const value = entry?.correct
                    ? element.symbol
                    : (entry?.value ?? "").slice(0, 3).toUpperCase();

                  return (
                    <button
                      key={key}
                      type="button"
                      className={`periodic-cell ${selected ? "selected" : ""} ${entry?.correct ? "correct" : ""} ${entry && !entry.correct ? "incorrect" : ""}`.trim()}
                      onClick={() => selectCell(atomicNumber)}
                      title={`Z=${element.atomicNumber}`}
                    >
                      <span className="periodic-atomic">{element.atomicNumber}</span>
                      <span className="periodic-value">{value || " "}</span>
                    </button>
                  );
                });
              })}
            </div>
          </div>

          <aside className="periodic-entry-panel">
            <h5>{copy.selectedCell}: Z={selectedElement?.atomicNumber}</h5>
            <p>{copy.period}: {selectedElement?.period}</p>
            <p>{copy.group}: {selectedElement?.group ?? "-"}</p>
            <p>{copy.series}: {resolveSeriesLabel(selectedElement?.series)}</p>
            <p>{copy.currentValue}: {selectedEntry?.value || "-"}</p>
            <p>
              {copy.hiddenElement}:{" "}
              <strong>{selectedEntry?.correct ? selectedElement?.symbol : "?"}</strong>
            </p>

            <label>
              {copy.inputLabel}
              <input
                ref={inputRef}
                type="text"
                value={state.draft}
                placeholder={copy.inputPlaceholder}
                onChange={onDraftChange}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitCell();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    clearCell();
                  }
                }}
                disabled={state.status === "won"}
              />
            </label>

            <div className="periodic-actions">
              <button
                type="button"
                className="knowledge-ui-btn knowledge-ui-btn-accent"
                onClick={submitCell}
                disabled={state.status === "won"}
              >
                {copy.submit}
              </button>
              <button
                type="button"
                className="knowledge-ui-btn knowledge-ui-btn-secondary"
                onClick={clearCell}
              >
                {copy.clear}
              </button>
              <button
                type="button"
                className="knowledge-ui-btn"
                onClick={jumpToNextPending}
              >
                {copy.nextPending}
              </button>
            </div>
          </aside>
        </div>
      </section>

      <p className="game-message">{state.message}</p>
    </div>
  );
}

export default PeriodicTableKnowledgeGame;
