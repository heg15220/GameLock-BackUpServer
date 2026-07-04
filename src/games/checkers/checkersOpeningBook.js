// "Libro" de aperturas de damas. A diferencia del ajedrez, las damas 8x8 no
// tienen una teoria de aperturas tan codificada y nombrada, y fijar indices de
// casilla a ciegas es fragil. En su lugar usamos un sesgo de apertura robusto:
// durante las primeras jugadas, y mientras no haya capturas en juego, se elige
// de forma ponderada entre los desarrollos que llevan las fichas hacia el
// centro (evita abrir por los bordes y aporta variedad), sin gastar calculo.

import { COLORS, toRow, toCol } from "./checkersEngine";

const WHITE = COLORS.WHITE;
const OPENING_PLIES = 6; // nº de medias jugadas en las que se aplica el sesgo
const TOP_CHOICES = 3;

const centerDistance = (index) => Math.abs(toRow(index) - 3.5) + Math.abs(toCol(index) - 3.5);

// Puntua un desarrollo de apertura: cuanto mas central sea el destino y algo de
// avance hacia el campo rival, mejor.
const developmentScore = (state, move) => {
  const piece = state.board[move.from];
  const advance = piece && piece.color === WHITE ? toRow(move.from) - toRow(move.to) : toRow(move.to) - toRow(move.from);
  return (6 - centerDistance(move.to)) * 2 + advance;
};

export const getOpeningMove = (state, rng = Math.random) => {
  if (!state.moveHistory || state.moveHistory.length >= OPENING_PLIES) return null;
  const moves = state.legalMoves || [];
  if (moves.length < 2) return null;
  // Si ya hay capturas disponibles, la posicion es tactica: mejor que decida el
  // motor de busqueda.
  if (moves.some((move) => move.captureIndex != null)) return null;

  const scored = moves
    .map((move) => ({ move, score: developmentScore(state, move) }))
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, Math.min(TOP_CHOICES, scored.length));
  // Peso decreciente por ranking para dar variedad favoreciendo lo mejor.
  const weights = top.map((_, index) => TOP_CHOICES - index);
  const total = weights.reduce((acc, w) => acc + w, 0);
  let roll = rng() * total;
  for (let i = 0; i < top.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return top[i].move;
  }
  return top[0].move;
};
