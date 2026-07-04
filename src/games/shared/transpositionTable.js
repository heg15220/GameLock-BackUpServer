// Tabla de transposicion generica para los motores de busqueda (ajedrez y
// damas). Guarda, por clave Zobrist, el resultado de haber buscado una posicion
// a cierta profundidad, para reutilizarlo cuando la misma posicion reaparece
// por otra secuencia de jugadas ("transposicion"). Es, con diferencia, lo que
// mas acelera la poda alfa-beta gracias al "hash move".
//
// Flags de acotacion del valor guardado:
//   EXACT  -> el score es el valor real de la posicion (ventana [alpha,beta]).
//   LOWER  -> el score es una cota inferior (fallo alto, >= beta).
//   UPPER  -> el score es una cota superior (fallo bajo, <= alpha).

export const TT_FLAG = {
  EXACT: 0,
  LOWER: 1,
  UPPER: 2
};

export class TranspositionTable {
  constructor(maxEntries = 1 << 18) {
    this.map = new Map();
    this.maxEntries = maxEntries;
  }

  clear() {
    this.map.clear();
  }

  get(key) {
    return this.map.get(key) || null;
  }

  // Politica de reemplazo sencilla: si la entrada existe, se sustituye solo
  // cuando la nueva busqueda es al menos tan profunda (informacion mas fiable).
  // Si la tabla se llena, se vacia por completo (barato y evita fugas de
  // memoria en partidas largas; la TT se reconstruye enseguida).
  set(key, depth, score, flag, bestMove) {
    const existing = this.map.get(key);
    if (existing && existing.depth > depth) {
      return;
    }
    if (!existing && this.map.size >= this.maxEntries) {
      this.map.clear();
    }
    this.map.set(key, { depth, score, flag, bestMove });
  }
}

// Generador de numeros pseudoaleatorios determinista (mulberry32). Se usa para
// construir las tablas Zobrist de forma reproducible: mismas claves en cada
// arranque, imprescindible para que los tests sean estables.
export const createSeededRng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Una clave Zobrist "de 53 bits seguros" combinando dos mitades de 32 bits en
// un unico Number. JavaScript no tiene XOR de 64 bits sobre Number, asi que
// mantenemos las mitades por separado (hi/lo) y las combinamos en una cadena
// corta como clave del Map. Es rapido y las colisiones son despreciables para
// el tamano de arbol que exploramos.
export const zobristKeyString = (hi, lo) => `${hi >>> 0}:${lo >>> 0}`;
