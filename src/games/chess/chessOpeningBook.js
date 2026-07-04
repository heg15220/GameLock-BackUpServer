// Libro de aperturas compacto para el ajedrez. Cubre las primeras jugadas de
// varias aperturas solidas con ambos colores. Se indexa por POSICION (clave
// tipo FEN), de modo que las transposiciones se combinan de forma natural y la
// IA elige entre las jugadas de libro disponibles con probabilidad ponderada
// -> aperturas correctas y con variedad, sin gastar tiempo de calculo.

import {
  createChessStateFromFen,
  exportFen,
  findLegalMoveByUci,
  makeMove
} from "./chessEngine";

// Cada linea es una secuencia de jugadas en notacion UCI desde la posicion
// inicial. Compartir posiciones entre lineas genera variedad automaticamente.
const LINES = [
  // 1.e4 e5
  ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6", "b5a4", "g8f6", "e1g1"], // Ruy Lopez
  ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "c2c3", "g8f6", "d2d3"], // Italiana
  ["e2e4", "e7e5", "g1f3", "b8c6", "b1c3", "g8f6"],                          // Cuatro caballos
  // 1.e4 c5 (Siciliana)
  ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3"],
  ["e2e4", "c7c5", "g1f3", "b8c6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3"],
  // 1.e4 c6 (Caro-Kann)
  ["e2e4", "c7c6", "d2d4", "d7d5", "b1c3", "d5e4", "c3e4", "b8d7"],
  // 1.e4 e6 (Francesa)
  ["e2e4", "e7e6", "d2d4", "d7d5", "b1c3", "g8f6"],
  // 1.d4 d5
  ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3", "g8f6", "c1g5", "f8e7"], // Gambito de dama declinado
  ["d2d4", "d7d5", "c2c4", "c7c6", "g1f3", "g8f6"],                  // Eslava
  // 1.d4 Nf6
  ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "f8g7", "e2e4", "d7d6"], // India de rey
  ["d2d4", "g8f6", "c2c4", "e7e6", "b1c3", "f8b4"],                  // Nimzo-India
  // 1.c4 (Inglesa)
  ["c2c4", "e7e5", "b1c3", "g8f6", "g1f3", "b8c6"],
  // 1.Nf3 (Reti)
  ["g1f3", "d7d5", "d2d4", "g8f6", "c2c4", "e7e6"]
];

// Clave de posicion: los cuatro primeros campos del FEN (colocacion, turno,
// enroques y al paso). Ignora los contadores de jugadas.
const positionKey = (state) => exportFen(state).split(" ").slice(0, 4).join(" ");

const buildBook = () => {
  const book = new Map();
  for (const line of LINES) {
    let state = createChessStateFromFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    for (const uci of line) {
      const key = positionKey(state);
      const entry = book.get(key) || new Map();
      entry.set(uci, (entry.get(uci) || 0) + 1);
      book.set(key, entry);

      const move = findLegalMoveByUci(state, uci);
      if (!move) break; // linea mal escrita: cortamos con seguridad
      state = makeMove(state, move);
      if (state.result) break;
    }
  }
  return book;
};

const BOOK = buildBook();

// Devuelve una jugada de libro para la posicion, o null si esta fuera de libro.
// `rng` permite reproducibilidad en tests.
export const getOpeningMove = (state, rng = Math.random) => {
  const entry = BOOK.get(positionKey(state));
  if (!entry || entry.size === 0) return null;

  let total = 0;
  for (const weight of entry.values()) total += weight;

  let roll = rng() * total;
  let chosenUci = null;
  for (const [uci, weight] of entry) {
    roll -= weight;
    if (roll <= 0) {
      chosenUci = uci;
      break;
    }
  }
  if (!chosenUci) return null;
  return findLegalMoveByUci(state, chosenUci);
};

export const isInBook = (state) => BOOK.has(positionKey(state));
