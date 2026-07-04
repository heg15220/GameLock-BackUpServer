// Evaluacion estatica de posiciones de ajedrez para el motor de busqueda.
//
// Convencion: `evaluate(state, pov)` devuelve una puntuacion en centipeones
// (100 = un peon) desde la perspectiva del color `pov`. Positivo = `pov` esta
// mejor. La busqueda la llama siempre con el color del bando al turno.
//
// El tablero usa index = row*8 + col, con row 0 = fila 8 (arriba) y row 7 =
// fila 1 (abajo). Las blancas parten abajo (rows 6-7) y promocionan en row 0.
// Las piece-square tables estan escritas para las BLANCAS con la fila 8 en la
// parte superior, de modo que el indice del tablero indexa la tabla
// directamente; para las negras se refleja verticalmente (row -> 7 - row).

import { COLORS, PIECES, toRow, toCol } from "./chessEngine";

const WHITE = COLORS.WHITE;
const BLACK = COLORS.BLACK;

export const PIECE_VALUE = {
  [PIECES.PAWN]: 100,
  [PIECES.KNIGHT]: 320,
  [PIECES.BISHOP]: 330,
  [PIECES.ROOK]: 500,
  [PIECES.QUEEN]: 900,
  [PIECES.KING]: 0
};

// Material no-peon total inicial (sin reyes): usado para interpolar fase.
const PHASE_MAX = 2 * (320 + 330 + 500) + 900; // = 3200 por bando al inicio

const PST_PAWN = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 20, 20, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0
];

const PST_KNIGHT = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50
];

const PST_BISHOP = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 5, 0, 0, 0, 0, 5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20
];

const PST_ROOK = [
  0, 0, 0, 0, 0, 0, 0, 0,
  5, 10, 10, 10, 10, 10, 10, 5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  0, 0, 0, 5, 5, 0, 0, 0
];

const PST_QUEEN = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20
];

const PST_KING_MID = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  20, 20, 0, 0, 0, 0, 20, 20,
  20, 30, 10, 0, 0, 10, 30, 20
];

const PST_KING_END = [
  -50, -40, -30, -20, -20, -30, -40, -50,
  -30, -20, -10, 0, 0, -10, -20, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -30, 0, 0, 0, 0, -30, -30,
  -50, -30, -30, -30, -30, -30, -30, -50
];

// Refleja un indice del tablero verticalmente (para leer las tablas desde la
// perspectiva de las negras).
const mirror = (index) => {
  const row = toRow(index);
  const col = toCol(index);
  return (7 - row) * 8 + col;
};

const pstValue = (table, index, color) => (
  color === WHITE ? table[index] : table[mirror(index)]
);

// Bonus por peon pasado segun lo avanzado que este (indice = filas desde su
// casilla de salida, 0 recien salido .. 6 a punto de coronar).
const PASSED_BONUS = [0, 12, 20, 32, 56, 92, 140, 0];

// "relative rank": para las blancas, 7 arriba (cerca de coronar); simetrico
// para las negras.
const relativeRank = (row, color) => (color === WHITE ? 7 - row : row);

// Evalua la estructura de peones de un color con contadores numericos por
// columna (sin asignar listas por llamada). `count` = nº de peones por columna,
// `front` = fila del peon mas avanzado hacia la coronacion (la menor para las
// blancas, que promocionan en row 0; la mayor para las negras).
const pawnStructure = (count, front, enemyCount, enemyFront, color) => {
  let score = 0;
  for (let col = 0; col < 8; col += 1) {
    if (count[col] === 0) continue;

    // Doblados.
    if (count[col] > 1) {
      score -= 14 * (count[col] - 1);
    }

    // Aislados: sin peones amigos en columnas adyacentes.
    const leftHas = col > 0 && count[col - 1] > 0;
    const rightHas = col < 7 && count[col + 1] > 0;
    if (!leftHas && !rightHas) {
      score -= 16;
    }

    // Pasado: ningun peon enemigo por delante del peon frontal en su columna
    // ni en las adyacentes. Se evalua el peon mas avanzado de la columna.
    const frontRow = front[col];
    let blocked = false;
    for (let c = Math.max(0, col - 1); c <= Math.min(7, col + 1); c += 1) {
      if (enemyCount[c] === 0) continue;
      const enemyAhead = color === WHITE
        ? enemyFront[c] < frontRow // enemigo negro mas arriba (row menor) bloquea al blanco
        : enemyFront[c] > frontRow;
      if (enemyAhead) {
        blocked = true;
        break;
      }
    }
    if (!blocked) {
      score += PASSED_BONUS[relativeRank(frontRow, color)];
    }
  }
  return score;
};

export const evaluate = (state, pov) => {
  const board = state.board;

  let material = { [WHITE]: 0, [BLACK]: 0 };
  let pstMid = { [WHITE]: 0, [BLACK]: 0 };
  let pstEnd = { [WHITE]: 0, [BLACK]: 0 };
  let nonPawnMaterial = 0;
  const bishops = { [WHITE]: 0, [BLACK]: 0 };
  // Peones por columna: contador y fila del mas avanzado hacia la coronacion
  // (las blancas promocionan en row 0 -> nos quedamos con la fila menor; las
  // negras en row 7 -> la mayor). Valores iniciales "imposibles".
  const pCount = { [WHITE]: new Array(8).fill(0), [BLACK]: new Array(8).fill(0) };
  const pFront = { [WHITE]: new Array(8).fill(99), [BLACK]: new Array(8).fill(-1) };
  const rooks = { [WHITE]: [], [BLACK]: [] };

  for (let index = 0; index < 64; index += 1) {
    const piece = board[index];
    if (!piece) continue;
    const color = piece.color;
    const value = PIECE_VALUE[piece.type] || 0;
    material[color] += value;

    if (piece.type !== PIECES.PAWN && piece.type !== PIECES.KING) {
      nonPawnMaterial += value;
    }

    if (piece.type === PIECES.PAWN) {
      pstMid[color] += pstValue(PST_PAWN, index, color);
      pstEnd[color] += pstValue(PST_PAWN, index, color);
      const col = toCol(index);
      const row = toRow(index);
      pCount[color][col] += 1;
      if (color === WHITE) {
        if (row < pFront[WHITE][col]) pFront[WHITE][col] = row;
      } else if (row > pFront[BLACK][col]) {
        pFront[BLACK][col] = row;
      }
    } else if (piece.type === PIECES.KNIGHT) {
      const v = pstValue(PST_KNIGHT, index, color);
      pstMid[color] += v;
      pstEnd[color] += v;
    } else if (piece.type === PIECES.BISHOP) {
      const v = pstValue(PST_BISHOP, index, color);
      pstMid[color] += v;
      pstEnd[color] += v;
      bishops[color] += 1;
    } else if (piece.type === PIECES.ROOK) {
      const v = pstValue(PST_ROOK, index, color);
      pstMid[color] += v;
      pstEnd[color] += v;
      rooks[color].push(index);
    } else if (piece.type === PIECES.QUEEN) {
      const v = pstValue(PST_QUEEN, index, color);
      pstMid[color] += v;
      pstEnd[color] += v;
    } else if (piece.type === PIECES.KING) {
      pstMid[color] += pstValue(PST_KING_MID, index, color);
      pstEnd[color] += pstValue(PST_KING_END, index, color);
    }
  }

  // Fase de juego: 1 = apertura/medio juego, 0 = final. Se interpola la tabla
  // del rey (agresivo en el centro en finales, refugiado al principio).
  const phase = Math.max(0, Math.min(1, nonPawnMaterial / (2 * PHASE_MAX)));

  const termFor = (color) => {
    let s = material[color];
    s += pstMid[color] * phase + pstEnd[color] * (1 - phase);

    // Pareja de alfiles.
    if (bishops[color] >= 2) s += 30;

    // Estructura de peones.
    const enemy = color === WHITE ? BLACK : WHITE;
    s += pawnStructure(pCount[color], pFront[color], pCount[enemy], pFront[enemy], color);

    // Torres en columnas abiertas o semiabiertas.
    for (const rookIndex of rooks[color]) {
      const col = toCol(rookIndex);
      if (pCount[WHITE][col] === 0 && pCount[BLACK][col] === 0) {
        s += 22; // columna abierta
      } else if (pCount[color][col] === 0) {
        s += 11; // columna semiabierta
      }
    }

    // Seguridad del rey (solo relevante fuera del final): escudo de peones
    // delante del rey en su propia columna y adyacentes.
    if (phase > 0.25) {
      s += kingShield(board, pCount, color) * phase;
    }

    return s;
  };

  let score = termFor(WHITE) - termFor(BLACK);

  // Movilidad del bando al turno (aproximada con el numero de jugadas legales
  // ya generadas por el motor).
  const mobility = (state.legalMoves ? state.legalMoves.length : 0) * 1.5;
  score += state.turn === WHITE ? mobility : -mobility;

  // Pequena penalizacion por estar en jaque al turno.
  if (state.inCheck) {
    score += state.turn === WHITE ? -18 : 18;
  }

  return pov === WHITE ? score : -score;
};

// Devuelve una bonificacion (o penalizacion) por el escudo de peones delante
// del rey. `pCount` es el contador de peones por columna y color.
const kingShield = (board, pCount, color) => {
  const kingIndex = findKing(board, color);
  if (kingIndex == null) return 0;
  const kingCol = toCol(kingIndex);
  const kingRow = toRow(kingIndex);
  // Solo consideramos reyes enrocados / cerca de su base.
  const onHome = color === WHITE ? kingRow >= 6 : kingRow <= 1;
  if (!onHome) return -6;

  let shield = 0;
  for (let c = Math.max(0, kingCol - 1); c <= Math.min(7, kingCol + 1); c += 1) {
    if (pCount[color][c] > 0) {
      shield += 6;
    } else {
      shield -= 8; // columna abierta delante del rey: peligrosa
    }
  }
  return shield;
};

const findKing = (board, color) => {
  for (let index = 0; index < 64; index += 1) {
    const piece = board[index];
    if (piece && piece.type === PIECES.KING && piece.color === color) {
      return index;
    }
  }
  return null;
};
