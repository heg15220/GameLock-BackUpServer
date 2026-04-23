import React, { Suspense, lazy } from "react";

const KnowledgeVariantComponents = {
  sudoku: lazy(() => import("./knowledge/SudokuKnowledgeGame")),
  domino: lazy(() => import("./knowledge/DominoKnowledgeGame")),
  ahorcado: lazy(() => import("./knowledge/HangmanKnowledgeGame")),
  paciencia: lazy(() => import("./knowledge/SolitaireKnowledgeGame")),
  puzle: lazy(() => import("./knowledge/PuzzleKnowledgeGame")),
  crucigrama: lazy(() => import("./knowledge/CrosswordKnowledgeGame")),
  "sopa-letras": lazy(() => import("./knowledge/WordSearchKnowledgeGame")),
  wordle: lazy(() => import("./knowledge/WordleKnowledgeGame")),
  anagramas: lazy(() => import("./knowledge/AnagramsKnowledgeGame")),
  "calculo-mental": lazy(() => import("./knowledge/MentalMathKnowledgeGame")),
  "tabla-periodica": lazy(() => import("./knowledge/PeriodicTableKnowledgeGame")),
  mapas: lazy(() => import("./knowledge/MapsKnowledgeGame")),
  "mapas-camino-corto": lazy(() => import("./knowledge/MapsShortestPathKnowledgeGame")),
  "adivina-pais": lazy(() => import("./knowledge/GuessCountryKnowledgeGame")),
  refranes: lazy(() => import("./knowledge/ProverbsKnowledgeGame")),
  cronologia: lazy(() => import("./knowledge/TimelineKnowledgeGame")),
  tangram: lazy(() => import("./knowledge/TangramKnowledgeGame")),
  "iq-masters": lazy(() => import("./knowledge/IQMastersKnowledgeGame")),
};

function KnowledgeArcadeGame({ variant }) {
  const ActiveVariantGame = KnowledgeVariantComponents[variant] ?? KnowledgeVariantComponents.sudoku;

  return (
    <Suspense fallback={<p className="unsupported-game">Loading...</p>}>
      <ActiveVariantGame />
    </Suspense>
  );
}

export default KnowledgeArcadeGame;
