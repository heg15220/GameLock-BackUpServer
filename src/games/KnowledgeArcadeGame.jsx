import React from "react";
import SudokuKnowledgeGame from "./knowledge/SudokuKnowledgeGame";
import DominoKnowledgeGame from "./knowledge/DominoKnowledgeGame";
import HangmanKnowledgeGame from "./knowledge/HangmanKnowledgeGame";
import SolitaireKnowledgeGame from "./knowledge/SolitaireKnowledgeGame";
import PuzzleKnowledgeGame from "./knowledge/PuzzleKnowledgeGame";
import CrosswordKnowledgeGame from "./knowledge/CrosswordKnowledgeGame";
import WordSearchKnowledgeGame from "./knowledge/WordSearchKnowledgeGame";
import WordleKnowledgeGame from "./knowledge/WordleKnowledgeGame";
import AnagramsKnowledgeGame from "./knowledge/AnagramsKnowledgeGame";
import MentalMathKnowledgeGame from "./knowledge/MentalMathKnowledgeGame";
import PeriodicTableKnowledgeGame from "./knowledge/PeriodicTableKnowledgeGame";
import MapsKnowledgeGame from "./knowledge/MapsKnowledgeGame";
import MapsShortestPathKnowledgeGame from "./knowledge/MapsShortestPathKnowledgeGame";
import GuessCountryKnowledgeGame from "./knowledge/GuessCountryKnowledgeGame";
import ProverbsKnowledgeGame from "./knowledge/ProverbsKnowledgeGame";
import TimelineKnowledgeGame from "./knowledge/TimelineKnowledgeGame";
import TangramKnowledgeGame from "./knowledge/TangramKnowledgeGame";
import IQMastersKnowledgeGame from "./knowledge/IQMastersKnowledgeGame";

function KnowledgeArcadeGame({ variant }) {
  if (variant === "sudoku") {
    return <SudokuKnowledgeGame />;
  }
  if (variant === "domino") {
    return <DominoKnowledgeGame />;
  }
  if (variant === "ahorcado") {
    return <HangmanKnowledgeGame />;
  }
  if (variant === "paciencia") {
    return <SolitaireKnowledgeGame />;
  }
  if (variant === "puzle") {
    return <PuzzleKnowledgeGame />;
  }
  if (variant === "crucigrama") {
    return <CrosswordKnowledgeGame />;
  }
  if (variant === "sopa-letras") {
    return <WordSearchKnowledgeGame />;
  }
  if (variant === "wordle") {
    return <WordleKnowledgeGame />;
  }
  if (variant === "anagramas") {
    return <AnagramsKnowledgeGame />;
  }
  if (variant === "calculo-mental") {
    return <MentalMathKnowledgeGame />;
  }
  if (variant === "tabla-periodica") {
    return <PeriodicTableKnowledgeGame />;
  }
  if (variant === "mapas") {
    return <MapsKnowledgeGame />;
  }
  if (variant === "mapas-camino-corto") {
    return <MapsShortestPathKnowledgeGame />;
  }
  if (variant === "adivina-pais") {
    return <GuessCountryKnowledgeGame />;
  }
  if (variant === "refranes") {
    return <ProverbsKnowledgeGame />;
  }
  if (variant === "cronologia") {
    return <TimelineKnowledgeGame />;
  }
  if (variant === "tangram") {
    return <TangramKnowledgeGame />;
  }
  if (variant === "iq-masters") {
    return <IQMastersKnowledgeGame />;
  }
  return <SudokuKnowledgeGame />;
}

export default KnowledgeArcadeGame;

