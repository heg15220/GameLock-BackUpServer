import React, { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { resolveKnowledgeArcadeLocale } from "./knowledgeArcadeUtils";

const loadCrosswordKnowledgeGameRuntime = () => import("./CrosswordKnowledgeGameRuntime");
const CrosswordKnowledgeGameRuntime = lazy(loadCrosswordKnowledgeGameRuntime);

const COPY_BY_LOCALE = {
  es: {
    title: "Crucigrama Dinamico",
    subtitle: "Rejilla 15x15 con pistas horizontales y verticales generadas desde el catalogo grande.",
    shellTitle: "Motor y catalogo bajo demanda",
    shellBody: "El runtime completo del crucigrama, las pistas y los datos generados se cargan solo cuando abres la partida.",
    shellHint: "Pasa el cursor o enfoca el boton para precargar antes de entrar.",
    open: "Abrir crucigrama",
    loading: "Cargando crucigrama..."
  },
  en: {
    title: "Dynamic Crossword",
    subtitle: "15x15 grid with across and down clues generated from the large shared catalog.",
    shellTitle: "Runtime and catalog on demand",
    shellBody: "The full crossword runtime, clues, and generated data now load only when the player opens the match.",
    shellHint: "Hover or focus the button to preload before entering.",
    open: "Open crossword",
    loading: "Loading crossword..."
  }
};

function CrosswordKnowledgeGameLoadingShell({ copy }) {
  return (
    <div className="mini-game knowledge-game knowledge-arcade-game knowledge-crucigrama">
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="crossword-head-actions">
          <button type="button" disabled>{copy.loading}</button>
        </div>
      </div>
      <section className="knowledge-mode-shell">
        <div className="phaser-canvas-shell" style={{ minHeight: 520, display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ maxWidth: 560, textAlign: "center" }}>
            <strong>{copy.shellTitle}</strong>
            <p>{copy.shellBody}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function CrosswordKnowledgeGameShell({ copy, onOpen }) {
  return (
    <div className="mini-game knowledge-game knowledge-arcade-game knowledge-crucigrama">
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="crossword-head-actions">
          <button
            type="button"
            onClick={onOpen}
            onPointerEnter={loadCrosswordKnowledgeGameRuntime}
            onFocus={loadCrosswordKnowledgeGameRuntime}
          >
            {copy.open}
          </button>
        </div>
      </div>
      <section className="knowledge-mode-shell">
        <div className="phaser-canvas-shell" style={{ minHeight: 520, display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ maxWidth: 560, textAlign: "center" }}>
            <strong>{copy.shellTitle}</strong>
            <p>{copy.shellBody}</p>
            <p>{copy.shellHint}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function CrosswordKnowledgeGame() {
  const locale = useMemo(resolveKnowledgeArcadeLocale, []);
  const copy = useMemo(() => COPY_BY_LOCALE[locale] ?? COPY_BY_LOCALE.en, [locale]);
  const [shouldLoadRuntime, setShouldLoadRuntime] = useState(false);
  const openRuntime = useCallback(() => {
    setShouldLoadRuntime(true);
  }, []);

  if (!shouldLoadRuntime) {
    return <CrosswordKnowledgeGameShell copy={copy} onOpen={openRuntime} />;
  }

  return (
    <Suspense fallback={<CrosswordKnowledgeGameLoadingShell copy={copy} />}>
      <CrosswordKnowledgeGameRuntime />
    </Suspense>
  );
}

export default CrosswordKnowledgeGame;
