// Evaluacion estatica de posiciones de damas para el motor de busqueda.
//
// `evaluate(state, pov)` devuelve una puntuacion desde la perspectiva del color
// `pov` (positivo = `pov` esta mejor). El tablero usa index = row*8 + col con
// row 0 arriba (fila 8). Las blancas parten abajo (filas altas) y promocionan
// en row 0; las negras al reves.

import { COLORS, oppositeColor, toRow, toCol } from "./checkersEngine";

const WHITE = COLORS.WHITE;
const BLACK = COLORS.BLACK;

const MAN_VALUE = 100;
const KING_VALUE = 175;

// Distancia al centro (0 en el centro, mayor en los bordes).
const centerDistance = (index) => Math.abs(toRow(index) - 3.5) + Math.abs(toCol(index) - 3.5);

// Puntua toda la posicion desde la perspectiva de las blancas y ajusta el
// signo al final segun `pov`. Concentrar el calculo en un unico recorrido del
// tablero mantiene la evaluacion barata (se llama en cada hoja de la busqueda).
export const evaluate = (state, pov) => {
  const board = state.board;
  let score = 0;

  for (let index = 0; index < board.length; index += 1) {
    const piece = board[index];
    if (!piece) continue;
    const sign = piece.color === WHITE ? 1 : -1;
    const row = toRow(index);
    const col = toCol(index);

    // Material.
    score += sign * (piece.king ? KING_VALUE : MAN_VALUE);

    // Centralidad: las damas valoran mas el centro; los hombres, algo menos.
    const central = Math.max(-3, 3.6 - centerDistance(index));
    score += sign * central * (piece.king ? 6 : 4);

    if (!piece.king) {
      // Presion de promocion: cuanto mas cerca de coronar, mejor.
      const promotionPressure = piece.color === WHITE ? 7 - row : row;
      score += sign * promotionPressure * 2.2;

      // Defensa de la fila propia: un hombre en su fila de salida dificulta la
      // promocion del rival (baluarte defensivo).
      const homeRow = piece.color === WHITE ? 7 : 0;
      if (row === homeRow) {
        score += sign * 6;
      }

      // Los hombres en los bordes tienen poca movilidad.
      if (col === 0 || col === 7) {
        score += sign * -4;
      }
    }
  }

  // Terminos ligados al bando al turno (todos en perspectiva de las blancas).
  const turnSign = state.turn === WHITE ? 1 : -1;

  const mobility = state.legalMoves.length;
  score += turnSign * mobility * 1.6;

  let captures = 0;
  for (const move of state.legalMoves) {
    if (move.captureIndex != null) captures += 1;
  }
  score += turnSign * captures * 6;

  if (state.forcedPiece != null) {
    score += turnSign * 10;
  }

  if (state.turnMeta && state.turnMeta.singlePieceExtraAvailable && !state.turnMeta.extraMoveUsed) {
    score += turnSign * 12;
  }

  // Errores reglados (regla propia de esta variante): acercarse al limite de
  // errores es una desventaja concreta.
  if (state.mistakes) {
    const whiteMistakes = state.mistakes[WHITE] || 0;
    const blackMistakes = state.mistakes[BLACK] || 0;
    score += (blackMistakes - whiteMistakes) * 26;
  }

  return pov === WHITE ? score : -score;
};

export { MAN_VALUE, KING_VALUE };
