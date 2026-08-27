/**
 * FULGOR — Marés, distrito a distrito.
 *
 * Los mapas son DATOS y se escriben a mano. No hay generación procedural aquí y es
 * deliberado: el §1.1 del diseño dice que el mundo tiene que ser *memorizable*, y un
 * distrito generado no se memoriza porque no tiene intención. Que la farola esté frente al
 * portal de Dani, y que Doña Pilar esté siempre debajo de esa farola, es el motivo por el
 * que a la tercera hora de partida el jugador sabe dónde está sin mirar.
 *
 * FORMATO. Cada distrito es una rejilla de caracteres de 32×24 tiles —512×384 píxeles—
 * sobre una vista de 176×144, así que siempre hay más mundo del que cabe en pantalla.
 * `LEYENDA` traduce carácter a tipo de tile.
 *
 * CÓMO SE DIBUJA UN EDIFICIO, que es la regla que más se nota y la que más cuesta acertar:
 *
 *     TTTTTTT#TTTTTT      tejado, con MEDIANERAS (#) que separan un portal del siguiente
 *     EEEEEEEEEEEEEE      cornisa: canalón, vuelo y la sombra del alero
 *     WFWFWFW#WFWFWF      la fila de ventanas
 *     FFFFFFFFFFFFFF      el zócalo, donde la fachada se encuentra con la acera
 *     ,,,,,,,,,,,,,,      acera
 *
 * La primera versión de estos mapas ponía una sola fila de fachada bajo el tejado y las
 * manzanas salían como BANDAS: dos franjas de color pegadas que el ojo lee como dos suelos
 * distintos y no como un volumen. Las cuatro filas de arriba, y sobre todo la cornisa y las
 * medianeras, son lo que convierte una franja en una calle con portales.
 *
 * LOS BULTOS Y LOS NPC SE COLOCAN EN COORDENADAS DE TILE, no de píxel, porque escribir un
 * mapa a mano en píxeles es insufrible. `compilar()` los convierte y de paso calcula las
 * cajas sólidas una sola vez, al cargar el distrito — nunca por fotograma.
 *
 * LOS DISTRITOS SE ABREN POR CAPÍTULOS y esa tabla ya existe: es `DISTRICTS` de
 * `tables.js`, que el motor de reglas usa desde el primer día. Aquí no se repite.
 */

import { TILE } from "./tiles.js";
import { cajaSolida } from "./props.js";

const ANCHO_BASE = 32;
const ALTO_BASE = 24;
export const ESCALA_MUNDO = 2;
export const ANCHO = ANCHO_BASE * ESCALA_MUNDO;
export const ALTO = ALTO_BASE * ESCALA_MUNDO;

/** Cámara un 18% más abierta: da contexto de ruta sin convertir a Dani en una miniatura. */
export const VISTA = { w: 208, h: 168 };

export const LEYENDA = {
  ".": "asfalto",
  ",": "acera",
  o: "adoquin",
  h: "hierba",
  t: "tierra",
  a: "arena",
  c: "cesped",
  C: "cespedClaro",
  "|": "marca",
  m: "muelle",
  b: "baldosa",
  n: "nave",
  N: "naveLinea",
  z: "azotea",
  r: "rail",
  M: "metal",
  "~": "agua",
  "#": "muro",
  S: "seto",
  V: "verja",
  E: "cornisa",
  F: "fachada",
  W: "ventana",
  P: "puerta",
  T: "techo",
  " ": "vacio",

  /* Interiores del instituto. */
  p: "parquet",
  l: "linoleo",
  g: "azulejo",
  I: "paredInt",
  Z: "pizarra",
  Q: "taquilla",
  K: "corcho",
};

/* ── Barrio de las Aguas ─────────────────────────────────────────────────────────── */

/**
 * Casa. "Cálido y estrecho", dice `copy.js`, y el plano lo dice también: dos manzanas que
 * aprietan una calle estrecha, y al fondo la dársena que le da nombre al barrio.
 *
 * La plaza está ABIERTA DESDE EL PORTAL. Nuria espera en ella, a la vista, y para irse al
 * norte hay que darle la espalda mientras se la ve. Es el Pilar 2 del diseño —"elegir a
 * quién fallas"— escrito en el plano en vez de en un menú.
 */
const AGUAS = [
  "TTTTTTT#TTTTTT....TTTTTT#TTTTTTT",
  "TTTTTTT#TTTTTT....TTTTTT#TTTTTTT",
  "EEEEEEEEEEEEEE....EEEEEEEEEEEEEE",
  "WFWFWFW#WFWFWF....WFWFWF#WFWFWFW",
  "FFFPFFFFFFPFFF....FFFPFFFFFFPFFF",
  ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
  "................................",
  "................................",
  ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
  "TTTTT#TTTTT.........TTTT#TTTTTTT",
  "TTTTT#TTTTT.........TTTT#TTTTTTT",
  "EEEEEEEEEEE.........EEEEEEEEEEEE",
  "WFWFW#WFWFW.........WFWF#WFWFWFW",
  "FFFFFFFFFPF.........FFPFFFFFFFFF",
  ",,,,,,,,,,,.........,,,,,,,,,,,,",
  "oooooooooooooooooooooooooooooooo",
  "oooSShhhSSooooooooooooSShhhSSooo",
  "oooSShhhSSooooooooooooSShhhSSooo",
  "oooooooooooooooooooooooooooooooo",
  "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm",
  "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm",
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
];

/* ── La Concha ───────────────────────────────────────────────────────────────────── */

/**
 * "Comercios y plaza. Cámaras por todas partes." La plaza es grande y abierta a propósito:
 * es el distrito donde peor sale usar un poder, y el plano tiene que decirlo antes que
 * ningún número — no hay dónde meterse. El seto del centro es la única cobertura, y es
 * bajo.
 */
const CONCHA = [
  "TTTTTTT#TTTTTTTT#TTTTTTT#TTTTTTT",
  "TTTTTTT#TTTTTTTT#TTTTTTT#TTTTTTT",
  "EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE",
  "WFWFWFW#WFWFWFWF#WFWFWFW#WFWFWFW",
  "FFFPFFFFFFPFFFFFFPFFFFFFPFFFFFFF",
  ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
  "oooooooooooooooooooooooooooooooo",
  "ooooooooooSSSSSSSSSSoooooooooooo",
  "oooooooooohhhhhhhhhhoooooooooooo",
  "oooooooooohhhhhhhhhhoooooooooooo",
  "ooooooooooSSSSSSSSSSoooooooooooo",
  "oooooooooooooooooooooooooooooooo",
  "oooooooooooooooooooooooooooooooo",
  ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
  "TTTTTTT#TT,,,,,,,,,,,TTTT#TTTTTT",
  "EEEEEEEEEE,,,,,,,,,,,EEEEEEEEEEE",
  "WFWFWFW#WF,,,,,,,,,,,WFWF#WFWFWF",
  "FFFPFFFFFF,,,,,,,,,,,FFFFPFFFFFF",
  ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
  "................................",
  "................................",
  ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
];

/* ── IES Miguel Servet ───────────────────────────────────────────────────────────── */

/**
 * "Clase, azotea, el laboratorio de Requena. La vida que arriesgas." El campo ocupa media
 * pantalla porque es donde el chaval sigue siendo un chaval, y la verja lo separa del
 * patio: dos sitios distintos, no un descampado.
 */
const INSTITUTO = [
  "TTTTTTTTTTTTTTT##TTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTT,,TTTTTTTTTTTTTTT",
  "EEEEEEEEEEEEEEE,,EEEEEEEEEEEEEEE",
  "WFWFWFWFWFWFWFW,,WFWFWFWFWFWFWFW",
  "FFFFFFPFFFFFFFF,,FFFFFFFFPFFFFFF",
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
  "VVVVVVVVVVVVVV,,,,VVVVVVVVVVVVVV",
  "cc|CccCCccCCccCCccCCccCCccCCcc|C",
  "cc|CccCCccCCccCCccCCccCCccCCcc|C",
  "cc|CccCCccCCccCCccCCccCCccCCcc|C",
  "cc|CccCCccCCccCCccCCccCCccCCcc|C",
  "cc|CccCCccCCccCCccCCccCCccCCcc|C",
  "cc|CccCCccCCccCCccCCccCCccCCcc|C",
  "cc|CccCCccCCccCCccCCccCCccCCcc|C",
  "cc|CccCCccCCccCCccCCccCCccCCcc|C",
  "cc|CccCCccCCccCCccCCccCCccCCcc|C",
  "cc|CccCCccCCccCCccCCccCCccCCcc|C",
  "cc|CccCCccCCccCCccCCccCCccCCcc|C",
  "tttttttttttttttttttttttttttttttt",
  "tttttttttttttttttttttttttttttttt",
  "SSSSSSSSSSSSSSSStttSSSSSSSSSSSSS",
  "SSSSSSSSSSSSSSSStttSSSSSSSSSSSSS",
];

/* ── Polígono Norte ──────────────────────────────────────────────────────────────── */

/**
 * "La subestación y las naves. Donde todo empezó." El único distrito con vía de tren, y el
 * único donde la línea amarilla del suelo marca un pasillo: aquí hay reglas de sitio de
 * trabajo, y el jugador las lee sin que nadie se las cuente. El recinto vallado del sur es
 * la subestación, y se entra por un solo hueco.
 */
const POLIGONO = [
  "nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn",
  "nNNNNNNNNNNNNnnnnnNNNNNNNNNNNNNn",
  "nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn",
  "TTTTTTTTTTTT#nnnn#TTTTTTTTTTTTTT",
  "TTTTTTTTTTTT#nnnn#TTTTTTTTTTTTTT",
  "EEEEEEEEEEEEEnnnnEEEEEEEEEEEEEEE",
  "FFFFWFFPFWFFFnnnnFFFFWFPFFWFFFFF",
  "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
  "................................",
  "................................",
  "rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
  "rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
  "................................",
  "................................",
  "tttttttttttttttttttttttttttttttt",
  "tttttt####################tttttt",
  "tttttt#nnnnnnnnnnnnnnnnnn#tttttt",
  "tttttt#nnnnnnnnnnnnnnnnnn#tttttt",
  "tttttt#nnnnnnnnnnnnnnnnnn#tttttt",
  "tttttt#nnnnnnnnnnnnnnnnnn#tttttt",
  "tttttt####nnnnnnnnnnnn####tttttt",
  "tttttttttttttttttttttttttttttttt",
  "tttttttttttttttttttttttttttttttt",
  "tttttttttttttttttttttttttttttttt",
];

/* Cinco distritos adicionales. Comparten gramática de tile con los cuatro originales,
 * pero cambian material, densidad y lectura. Así la campaña completa ocurre caminando. */
const PUERTO = POLIGONO.map((fila, y) => y > 19 ? fila.replaceAll("t", "m") : fila.replaceAll("r", "m"));
const FARO = INSTITUTO.map((fila) => fila.replaceAll("c", "h").replaceAll("C", "h").replaceAll("b", "t"));
const FINANCIERO = CONCHA.map((fila) => fila.replaceAll("o", "b").replaceAll("h", "C"));
const HOSPITAL = INSTITUTO.map((fila) => fila.replaceAll("c", "b").replaceAll("C", "b").replaceAll("t", ","));
const TOLVAS = POLIGONO.map((fila) => fila.replaceAll("n", "z").replaceAll("N", "M").replaceAll("t", "."));

/* ── El catálogo ─────────────────────────────────────────────────────────────────── */

/**
 * Cada entrada añade a la rejilla lo que la rejilla no puede decir: qué hay de pie, quién
 * está y por dónde se sale.
 *
 * `salidas` no lleva coordenadas de destino: sólo dice a qué distrito da. Quién decide en
 * qué punto aparece el héroe al llegar es `entradas`, del distrito de destino, indexado
 * por el distrito de origen. Así, mover una puerta no obliga a tocar los ocho mapas
 * vecinos, y `validar()` puede comprobar que ninguna salida se queda sin su vuelta.
 */
/* ══ INTERIORES DEL INSTITUTO ════════════════════════════════════════
 *
 * Cuatro salas dentro del IES Miguel Servet. NO son distritos: el distrito sigue siendo
 * `instituto` y por eso Requena sigue ofreciendo `obligacion` cuando hablas con él dentro
 * del aula. Lo que cambia al cruzar una puerta es el MAPA que se pisa, no el sitio en el
 * que el motor cree que estás. `DISTRITO_DE` es la tabla que sostiene esa distinción.
 *
 * Todos miden 32×24 como cualquier otro plano, aunque una sala ocupe menos: el sobrante son
 * `vacio`, que es sólido, y así el mismo motor de cámara y de colisión vale sin tocar nada.
 */

/* ── Aula ──────────────────────────────────────────────────────────
 * El encerado ocupa el centro de la pared del fondo, con ventanas a la izquierda —por donde
 * entra la luz— y el corcho a la derecha. La puerta está abajo a la derecha, que es por
 * donde se entra tarde a clase.
 */
const AULA = [
  "                                ",
  "         IIIIIIIIIIIIII         ",
  "         IWWIZZZZZZIKKI         ",
  "         IIIIIIIIIIIIII         ",
  "         pppppppppppppp         ",
  "         pppppppppppppp         ",
  "         pppppppppppppp         ",
  "         pppppppppppppp         ",
  "         pppppppppppppp         ",
  "         pppppppppppppp         ",
  "         pppppppppppppp         ",
  "         pppppppppppppp         ",
  "         pppppppppppppp         ",
  "         pppppppppppppp         ",
  "         pppppppppppppp         ",
  "         pppppppppppppp         ",
  "         pppppppppppppp         ",
  "         pppppppppppppp         ",
  "         IIIIIIIIIIPIII         ",
  "                  ll            ",
  "                                ",
  "                                ",
  "                                ",
  "                                ",
];

/* ── Pasillo ──────────────────────────────────────────────────────
 * Largo y estrecho, taquillas en las dos paredes y tres puertas: aula, laboratorio y la
 * escalera de incendios que sube a la azotea. La salida al patio está abajo.
 */
const PASILLO = [
  "                                ",
  "                                ",
  "  IIIIIIIIIIIIIIIIIIIIIIIIIIII  ",
  "  IQQQQPQQQQQQKQQQQQPQQQQQQQQI  ",
  "  IIIIIIIIIIIIIIIIIIIIIIIIIIII  ",
  "  llllllllllllllllllllllllllll  ",
  "  llllllllllllllllllllllllllll  ",
  "  llllllllllllllllllllllllllll  ",
  "  llllllllllllllllllllllllllll  ",
  "  llllllllllllllllllllllllllll  ",
  "  llllllllllllllllllllllllllll  ",
  "  llllllllllllllllllllllllllll  ",
  "  llllllllllllllllllllllllllll  ",
  "  IIIIIIIIIIIIIIIIIIIIIIIIIIII  ",
  "  IQQQQQQQQQQQQQQQQQQQQQQQQPPI  ",
  "  IIIIIIIIIIIIIIIIIIIIIIIIIIII  ",
  "                          ll    ",
  "                          ll    ",
  "                                ",
  "                                ",
  "                                ",
  "                                ",
  "                                ",
  "                                ",
];

/* ── Laboratorio ────────────────────────────────────────────────
 * El sitio del que alguien se llevó un cuaderno de tapas rojas sin forzar la puerta.
 */
const LABORATORIO = [
  "                                ",
  "                                ",
  "                                ",
  "          IIIIIIIIIIII          ",
  "          IWWIIIIIWWII          ",
  "          IIIIIIIIIIII          ",
  "          gggggggggggg          ",
  "          gggggggggggg          ",
  "          gggggggggggg          ",
  "          gggggggggggg          ",
  "          gggggggggggg          ",
  "          gggggggggggg          ",
  "          gggggggggggg          ",
  "          gggggggggggg          ",
  "          gggggggggggg          ",
  "          IIIIIPIIIIII          ",
  "               ll               ",
  "                                ",
  "                                ",
  "                                ",
  "                                ",
  "                                ",
  "                                ",
  "                                ",
];

/* ── Azotea ─────────────────────────────────────────────────────
 * Se sube por la escalera de incendios y lo sabe medio tercero. Aquí pasa el capítulo 8.
 */
const AZOTEA_IES = [
  "                                ",
  "     EEEEEEEEEEEEEEEEEEEEEE     ",
  "     EzzzzzzzzzzzzzzzzzzzzE     ",
  "     EzzzzzzzzzzzzzzzzzzzzE     ",
  "     EzzzzzzzzzzzzzzzzzzzzE     ",
  "     EzzzzzzzzzzzzzzzzzzzzE     ",
  "     EzzzzzzzzzzzzzzzzzzzzE     ",
  "     EzzzzzzzzzzzzzzzzzzzzE     ",
  "     EzzzzzzzzzzzzzzzzzzzzE     ",
  "     EzzzzzzzzzzzzzzzzzzzzE     ",
  "     EzzzzzzzzzzzzzzzzzzzzE     ",
  "     EzzzzzzzzzzzzzzzzzzzzE     ",
  "     EzzzzzzzzzzzzzzzzzzzzE     ",
  "     EzzzzzzzzzzzzzzzzzzzzE     ",
  "     EzzzzzzzzzzzzzzzzzzzzE     ",
  "     EzzzzzzzzzzzzzzzzzzzzE     ",
  "     EzzzzzzzzzzzzzzzzzzzzE     ",
  "     EEEEEEEEEEEEzzEEEEEEEE     ",
  "                 zz             ",
  "                                ",
  "                                ",
  "                                ",
  "                                ",
  "                                ",
];

const CRUDOS = {
  /* ══ Salas del instituto ═══════════════════════════════════════ */

  /**
   * EL AULA, CON LA CLASE DENTRO.
   *
   * Cinco filas de pupitres y un alumno sentado en cada uno de los de delante. El truco de
   * los sentados no está en el sprite sino en la `y`: el alumno se coloca 0,6 tiles POR
   * ENCIMA de su pupitre, así que se pinta antes y el tablero le tapa las piernas. Y llevan
   * `decorativo: true` para que el botón de hablar no los ofrezca: son la clase, no el reparto.
   *
   * Requena está DE PIE junto al encerado, en la tarima, mirando al sur. Julia y Nuria sí
   * son del reparto y están sentadas donde les toca — Julia delante, Nuria al fondo.
   */
  aula: {
    suelo: AULA,
    spawn: { tx: 18, ty: 17, dir: "norte" },
    bultos: [
      // La mesa del profesor, delante del encerado y a un lado: si estuviera en el centro,
      // taparia a quien explica, que es justo la persona que hay que ver.
      { id: "mesaProfe", tx: 17.5, ty: 6.6 },
      { id: "pupitre", tx: 11.5, ty: 9.4 }, { id: "pupitre", tx: 15, ty: 9.4 }, { id: "pupitre", tx: 18.5, ty: 9.4 },
      { id: "pupitre", tx: 11.5, ty: 11.8 }, { id: "pupitre", tx: 15, ty: 11.8 }, { id: "pupitre", tx: 18.5, ty: 11.8 },
      { id: "pupitre", tx: 11.5, ty: 14.2 }, { id: "pupitre", tx: 15, ty: 14.2 }, { id: "pupitre", tx: 18.5, ty: 14.2 },
      { id: "pupitre", tx: 11.5, ty: 16.6 }, { id: "pupitre", tx: 18.5, ty: 16.6 },
      { id: "papelera", tx: 20.4, ty: 5.8 },
      { id: "extintor", tx: 10.2, ty: 5.2 },
    ],
    /**
     * MEDIO TILE POR ENCIMA DE SU PUPITRE. Los alumnos van a `ty` del pupitre menos 0.5, y
     * eso es lo que los sienta: se pintan antes que el tablero y el tablero les tapa de la
     * cintura para abajo. Cambiar esa diferencia los levanta de la silla.
     */
    npcs: [
      { id: "requena", tx: 13.5, ty: 6.2, dir: "sur" },
      { id: "julia", tx: 15, ty: 8.9, dir: "norte" },
      { id: "nuria", tx: 18.5, ty: 13.7, dir: "norte" },
      { id: "alumnoA", tx: 11.5, ty: 8.9, dir: "norte", decorativo: true },
      { id: "alumnoB", tx: 18.5, ty: 8.9, dir: "norte", decorativo: true },
      { id: "alumnoC", tx: 11.5, ty: 11.3, dir: "norte", decorativo: true },
      { id: "alumnoD", tx: 15, ty: 11.3, dir: "norte", decorativo: true },
      { id: "alumnoE", tx: 18.5, ty: 11.3, dir: "norte", decorativo: true },
      { id: "alumnoF", tx: 11.5, ty: 13.7, dir: "norte", decorativo: true },
      { id: "alumnoG", tx: 15, ty: 13.7, dir: "norte", decorativo: true },
      { id: "oscar", tx: 11.5, ty: 16.1, dir: "norte" },
    ],
    salidas: [{ rect: { tx: 18, ty: 18.4, tw: 1.6, th: 1.4 }, destino: "pasillo" }],
    entradas: { pasillo: { tx: 18.5, ty: 17.2, dir: "norte" } },
  },

  /** El pasillo: taquillas en las dos paredes y tres puertas. */
  pasillo: {
    suelo: PASILLO,
    spawn: { tx: 26.5, ty: 12, dir: "norte" },
    bultos: [
      { id: "banco", tx: 8, ty: 12.4 }, { id: "banco", tx: 21, ty: 12.4 },
      { id: "papelera", tx: 12, ty: 12.6 },
      { id: "extintor", tx: 16.2, ty: 4.4 },
      { id: "silla", tx: 24, ty: 6.6 },
    ],
    npcs: [
      { id: "isma", tx: 14, ty: 8, dir: "sur", decorativo: true },
      {
        id: "tuerca", tx: 6, ty: 9, dir: "este",
        rutina: { tipo: "paseo", pausa: 1.6, puntos: [{ tx: 6, ty: 9 }, { tx: 22, ty: 9 }] },
      },
    ],
    salidas: [
      { rect: { tx: 5.6, ty: 4.4, tw: 1.4, th: 1.2 }, destino: "aula" },
      { rect: { tx: 19.6, ty: 4.4, tw: 1.4, th: 1.2 }, destino: "laboratorio" },
      { rect: { tx: 26, ty: 16, tw: 2, th: 1.6 }, destino: "instituto" },
      { rect: { tx: 2.4, ty: 5.4, tw: 1.2, th: 2 }, destino: "azotea" },
    ],
    entradas: {
      aula: { tx: 6.3, ty: 5.6, dir: "sur" },
      laboratorio: { tx: 20.3, ty: 5.6, dir: "sur" },
      instituto: { tx: 26.5, ty: 12.4, dir: "norte" },
      azotea: { tx: 4.2, ty: 6.4, dir: "este" },
    },
  },

  /** El laboratorio de Requena. Donde estaba el cuaderno de tapas rojas. */
  laboratorio: {
    suelo: LABORATORIO,
    spawn: { tx: 15.5, ty: 14, dir: "norte" },
    bultos: [
      { id: "mesaLab", tx: 13, ty: 9 }, { id: "mesaLab", tx: 18, ty: 9 },
      { id: "mesaLab", tx: 13, ty: 12.4 }, { id: "mesaLab", tx: 18, ty: 12.4 },
      { id: "estanteria", tx: 11, ty: 6.4 }, { id: "estanteria", tx: 20, ty: 6.4 },
      { id: "extintor", tx: 21.2, ty: 5.4 },
    ],
    npcs: [{ id: "requena", tx: 15.5, ty: 6.4, dir: "sur" }],
    salidas: [{ rect: { tx: 15, ty: 15.4, tw: 1.4, th: 1.4 }, destino: "pasillo" }],
    entradas: { pasillo: { tx: 15.5, ty: 14.2, dir: "norte" } },
  },

  /** La azotea. Capítulo 8: aquí Isma deja la hoja boca arriba entre los dos. */
  azotea: {
    suelo: AZOTEA_IES,
    spawn: { tx: 17.5, ty: 16, dir: "norte" },
    bultos: [
      { id: "antena", tx: 8, ty: 5 }, { id: "antena", tx: 24, ty: 5 },
      { id: "caja", tx: 10, ty: 12 }, { id: "caja", tx: 11.4, ty: 13 },
      { id: "transformador", tx: 22, ty: 11 },
    ],
    npcs: [{ id: "isma", tx: 14, ty: 9, dir: "sur" }],
    salidas: [{ rect: { tx: 17, ty: 17.6, tw: 2, th: 1.4 }, destino: "pasillo" }],
    entradas: { pasillo: { tx: 17.5, ty: 16.4, dir: "norte" } },
  },

  aguas: {
    suelo: AGUAS,
    spawn: { tx: 16, ty: 15.5, dir: "sur" },
    bultos: [
      { id: "farola", tx: 6, ty: 8.9 }, { id: "farola", tx: 26, ty: 8.9 },
      { id: "farola", tx: 16, ty: 4.9 },
      { id: "contenedor", tx: 3, ty: 8.7 },
      // Aparcados contra el bordillo, no en mitad del carril.
      { id: "coche", tx: 10, ty: 8.8 }, { id: "coche", tx: 22, ty: 8.8 },
      { id: "papelera", tx: 29, ty: 8.9 },
      { id: "cabina", tx: 2, ty: 14.8 },
      { id: "arbol", tx: 6, ty: 17.9 }, { id: "arbol", tx: 25, ty: 17.9 },
      { id: "banco", tx: 13, ty: 18.5 }, { id: "banco", tx: 19, ty: 18.5 },
      // Apartada del punto de partida: en tx 16 quedaba pegada al portal y Dani chocaba
      // con ella antes de dar dos pasos hacia la plaza.
      { id: "papelera", tx: 21, ty: 15.9 },
      { id: "bolardo", tx: 4, ty: 20.6 }, { id: "bolardo", tx: 11, ty: 20.6 },
      { id: "bolardo", tx: 18, ty: 20.6 }, { id: "bolardo", tx: 25, ty: 20.6 },
      { id: "palmera", tx: 29, ty: 18.6 },
    ],
    npcs: [
      { id: "nuria", tx: 16, ty: 18.4, dir: "norte" },
      { id: "pilar", tx: 9, ty: 14.7, dir: "sur" },
      // Tomás tenía voz escrita en `voces/familia.js` y no estaba de pie en ningún mapa, así
      // que la única manera de oírle era una escena de guion. Y el acto III gira sobre su
      // firma: hace falta poder ir a buscarle. Junto al portal, que es donde vive.
      { id: "tomas", tx: 12, ty: 18.4, dir: "este" },
      {
        // Entre los dos coches aparcados, no encima de uno: la caja sólida del coche llega
        // hasta la acera y con tx 22 Ismael nacía dentro del maletero.
        id: "isma", tx: 18, ty: 7.5, dir: "oeste",
        rutina: { tipo: "paseo", pausa: 2.2, puntos: [{ tx: 18, ty: 7.5 }, { tx: 13, ty: 7.5 }] },
      },
    ],
    /**
     * LOS DOS SITIOS QUE NO SON PERSONAS.
     *
     * Siete de las nueve acciones del día son alguien con quien hablar. Las otras dos no
     * tienen interlocutor —dormir y salir de ronda— y por eso son LUGARES: el portal de tu
     * bloque y el muelle desde el que se sale de noche. Sin ellos habría que dejar un par
     * de botones sueltos abajo, y ese par de botones es exactamente lo que este rediseño
     * vino a quitar.
     */
    lugares: [
      { id: "portal", accion: "descansar", rect: { tx: 8.2, ty: 14, tw: 2.4, th: 1 } },
      { id: "muelle", accion: "patrullar", rect: { tx: 2, ty: 19, tw: 4, th: 2 } },
    ],
    salidas: [
      { rect: { tx: 0, ty: 5, tw: 1.2, th: 4 }, destino: "instituto" },
      { rect: { tx: 30.8, ty: 5, tw: 1.2, th: 4 }, destino: "concha" },
      { rect: { tx: 14, ty: 0, tw: 4, th: 1.2 }, destino: "poligono" },
    ],
    entradas: {
      instituto: { tx: 2, ty: 7.5, dir: "este" },
      concha: { tx: 29.5, ty: 7.5, dir: "oeste" },
      poligono: { tx: 16, ty: 3.5, dir: "sur" },
    },
  },

  concha: {
    suelo: CONCHA,
    spawn: { tx: 16, ty: 12.5, dir: "sur" },
    bultos: [
      { id: "farola", tx: 6, ty: 6.8 }, { id: "farola", tx: 26, ty: 6.8 },
      { id: "farola", tx: 6, ty: 12.8 }, { id: "farola", tx: 26, ty: 12.8 },
      { id: "arbol", tx: 12, ty: 9.9 }, { id: "arbol", tx: 18, ty: 9.9 },
      { id: "banco", tx: 8, ty: 11.5 }, { id: "banco", tx: 23, ty: 11.5 },
      { id: "banco", tx: 13, ty: 12.6 }, { id: "banco", tx: 19, ty: 12.6 },
      { id: "papelera", tx: 9, ty: 12.9 }, { id: "papelera", tx: 22, ty: 12.9 },
      { id: "cabina", tx: 29, ty: 12.9 },
      { id: "senal", tx: 3, ty: 18.9 }, { id: "senal", tx: 28, ty: 18.9 },
      { id: "coche", tx: 7, ty: 21.6 }, { id: "coche", tx: 14, ty: 21.6 },
      { id: "coche", tx: 24, ty: 21.6 },
    ],
    npcs: [
      { id: "oscar", tx: 21, ty: 12.6, dir: "oeste" },
      { id: "yusuf", tx: 8, ty: 5.7, dir: "sur" },
      {
        id: "marga", tx: 24, ty: 18.7, dir: "oeste",
        rutina: { tipo: "paseo", pausa: 1.8, puntos: [{ tx: 24, ty: 18.7 }, { tx: 8, ty: 18.7 }, { tx: 8, ty: 12.6 }] },
      },
      {
        id: "carmen", tx: 13, ty: 5.7, dir: "sur",
        rutina: { tipo: "paseo", pausa: 3.0, puntos: [{ tx: 13, ty: 5.7 }, { tx: 21, ty: 5.7 }] },
      },
    ],
    salidas: [
      { rect: { tx: 0, ty: 18, tw: 1.2, th: 4 }, destino: "aguas" },
      { rect: { tx: 30.8, ty: 18, tw: 1.2, th: 4 }, destino: "puerto" },
      { rect: { tx: 11, ty: 17.2, tw: 9, th: 1 }, destino: "instituto" },
    ],
    entradas: {
      aguas: { tx: 2, ty: 19.5, dir: "este" },
      puerto: { tx: 29.5, ty: 19.5, dir: "oeste" },
      instituto: { tx: 15.5, ty: 15.5, dir: "norte" },
    },
  },

  instituto: {
    suelo: INSTITUTO,
    spawn: { tx: 16.5, ty: 4.5, dir: "sur" },
    bultos: [
      { id: "porteria", tx: 16, ty: 10.2 },
      { id: "porteria", tx: 16, ty: 19.9 },
      { id: "banco", tx: 5, ty: 7.8 }, { id: "banco", tx: 27, ty: 7.8 },
      { id: "papelera", tx: 8, ty: 7.9 },
      { id: "senal", tx: 20, ty: 6.9 },
      { id: "arbol", tx: 3, ty: 21.9 }, { id: "arbol", tx: 29, ty: 21.9 },
      { id: "antena", tx: 6, ty: 2.6 }, { id: "antena", tx: 26, ty: 2.6 },
    ],
    npcs: [
      { id: "requena", tx: 12, ty: 6.5, dir: "sur" },
      { id: "julia", tx: 22, ty: 6.5, dir: "sur" },
      { id: "nuria", tx: 19, ty: 7.5, dir: "oeste" },
      {
        id: "tuerca", tx: 9, ty: 14, dir: "este",
        rutina: { tipo: "paseo", pausa: 1.2, puntos: [{ tx: 9, ty: 14 }, { tx: 23, ty: 14 }, { tx: 16, ty: 17 }] },
      },
    ],
    salidas: [
      { rect: { tx: 30.8, ty: 5, tw: 1.2, th: 3 }, destino: "aguas" },
      { rect: { tx: 16, ty: 22.8, tw: 3, th: 1.2 }, destino: "concha" },
      // La puerta de la fachada: por aquí se entra al edificio. El plano ya tenía dibujada
      // una `P` en la fila 4 y hasta hoy no llevaba a ninguna parte.
      { rect: { tx: 5.6, ty: 4.6, tw: 1.6, th: 1 }, destino: "pasillo" },
    ],
    entradas: {
      aguas: { tx: 29.5, ty: 6.5, dir: "oeste" },
      concha: { tx: 17, ty: 21.5, dir: "norte" },
      pasillo: { tx: 6.4, ty: 5.8, dir: "sur" },
    },
  },

  poligono: {
    suelo: POLIGONO,
    spawn: { tx: 16, ty: 9.5, dir: "sur" },
    bultos: [
      { id: "transformador", tx: 10, ty: 19.6 }, { id: "transformador", tx: 16, ty: 19.6 },
      { id: "transformador", tx: 22, ty: 19.6 },
      { id: "caja", tx: 4, ty: 9.6 }, { id: "caja", tx: 5.9, ty: 9.6 },
      { id: "caja", tx: 5, ty: 8.4 },
      { id: "barril", tx: 27, ty: 9.6 }, { id: "barril", tx: 28.6, ty: 9.6 },
      { id: "palet", tx: 8, ty: 13.6 }, { id: "palet", tx: 9.5, ty: 13.6 },
      { id: "contenedor", tx: 24, ty: 13.7 },
      { id: "farola", tx: 3, ty: 9.8 }, { id: "farola", tx: 29, ty: 9.8 },
      { id: "antena", tx: 8, ty: 2.6 }, { id: "antena", tx: 24, ty: 2.6 },
      { id: "senal", tx: 13, ty: 13.9 },
    ],
    npcs: [
      { id: "chapa", tx: 16, ty: 13.4, dir: "norte" },
      { id: "sordo", tx: 21, ty: 9.4, dir: "oeste" },
      {
        id: "hierro", tx: 7, ty: 22.5, dir: "este",
        rutina: { tipo: "paseo", pausa: 2.6, puntos: [{ tx: 7, ty: 22.5 }, { tx: 25, ty: 22.5 }, { tx: 16, ty: 21.5 }] },
      },
    ],
    salidas: [
      { rect: { tx: 14, ty: 22.8, tw: 4, th: 1.2 }, destino: "aguas" },
    ],
    entradas: {
      aguas: { tx: 16, ty: 21.5, dir: "norte" },
    },
  },

  puerto: {
    suelo: PUERTO,
    spawn: { tx: 18, ty: 9.5, dir: "sur" },
    bultos: [
      { id: "grua", tx: 5, ty: 13.5 }, { id: "contenedor", tx: 10, ty: 13.7 },
      { id: "contenedor", tx: 23, ty: 13.7 }, { id: "palet", tx: 16, ty: 9.6 },
      { id: "farola", tx: 3, ty: 9.8 }, { id: "farola", tx: 29, ty: 9.8 },
      { id: "barril", tx: 26, ty: 18.8 }, { id: "caja", tx: 7, ty: 18.8 },
    ],
    npcs: [
      { id: "yusuf", tx: 12, ty: 9.4, dir: "este" },
      { id: "iria", tx: 22, ty: 13.4, dir: "oeste" },
    ],
    salidas: [
      { rect: { tx: 0, ty: 8, tw: 1.2, th: 4 }, destino: "concha" },
      { rect: { tx: 30.8, ty: 8, tw: 1.2, th: 4 }, destino: "faro" },
    ],
    entradas: {
      concha: { tx: 2, ty: 9.5, dir: "este" },
      faro: { tx: 29.5, ty: 9.5, dir: "oeste" },
    },
  },

  faro: {
    suelo: FARO,
    spawn: { tx: 16.5, ty: 4.5, dir: "sur" },
    bultos: [
      { id: "antena", tx: 6, ty: 2.6 }, { id: "antena", tx: 26, ty: 2.6 },
      { id: "banco", tx: 8, ty: 7.8 }, { id: "banco", tx: 24, ty: 7.8 },
      { id: "arbol", tx: 4, ty: 20.8 }, { id: "arbol", tx: 28, ty: 20.8 },
    ],
    npcs: [{ id: "vigia", tx: 16, ty: 15, dir: "norte" }],
    salidas: [
      { rect: { tx: 30.8, ty: 5, tw: 1.2, th: 3 }, destino: "puerto" },
      { rect: { tx: 16, ty: 22.8, tw: 3, th: 1.2 }, destino: "financiero" },
    ],
    entradas: {
      puerto: { tx: 29.5, ty: 6.5, dir: "oeste" },
      financiero: { tx: 17, ty: 21.5, dir: "norte" },
    },
  },

  financiero: {
    suelo: FINANCIERO,
    spawn: { tx: 16, ty: 12.5, dir: "sur" },
    bultos: [
      { id: "camaraPoste", tx: 6, ty: 6.8 }, { id: "camaraPoste", tx: 26, ty: 6.8 },
      { id: "camaraDomo", tx: 6, ty: 12.8 }, { id: "camaraDomo", tx: 26, ty: 12.8 },
      { id: "coche", tx: 8, ty: 21.6 }, { id: "coche", tx: 24, ty: 21.6 },
      { id: "banco", tx: 13, ty: 12.6 }, { id: "banco", tx: 19, ty: 12.6 },
    ],
    npcs: [
      { id: "julia", tx: 12, ty: 12.5, dir: "este" },
      { id: "ezequiel", tx: 21, ty: 12.5, dir: "oeste" },
      { id: "sabater", tx: 24, ty: 18.7, dir: "oeste" },
    ],
    salidas: [
      { rect: { tx: 0, ty: 18, tw: 1.2, th: 4 }, destino: "faro" },
      { rect: { tx: 30.8, ty: 18, tw: 1.2, th: 4 }, destino: "hospital" },
    ],
    entradas: {
      faro: { tx: 2, ty: 19.5, dir: "este" },
      hospital: { tx: 29.5, ty: 19.5, dir: "oeste" },
    },
  },

  hospital: {
    suelo: HOSPITAL,
    spawn: { tx: 16.5, ty: 4.5, dir: "sur" },
    bultos: [
      { id: "ambulancia", tx: 6, ty: 7.6 }, { id: "ambulancia", tx: 26, ty: 7.6 },
      { id: "banco", tx: 12, ty: 7.8 }, { id: "botiquin", tx: 20, ty: 7.8 },
      { id: "generador", tx: 16, ty: 19.5 },
    ],
    npcs: [
      { id: "carmen", tx: 13, ty: 10.5, dir: "sur" },
      { id: "iria", tx: 21, ty: 10.5, dir: "oeste" },
    ],
    salidas: [
      { rect: { tx: 30.8, ty: 5, tw: 1.2, th: 3 }, destino: "financiero" },
      { rect: { tx: 16, ty: 22.8, tw: 3, th: 1.2 }, destino: "tolvas" },
    ],
    entradas: {
      financiero: { tx: 29.5, ty: 6.5, dir: "oeste" },
      tolvas: { tx: 17, ty: 21.5, dir: "norte" },
    },
  },

  tolvas: {
    suelo: TOLVAS,
    spawn: { tx: 16, ty: 9.5, dir: "sur" },
    bultos: [
      { id: "generador", tx: 10, ty: 19.6 }, { id: "generador", tx: 22, ty: 19.6 },
      { id: "bobina", tx: 16, ty: 19.6 }, { id: "contenedor", tx: 24, ty: 13.7 },
      { id: "caja", tx: 5, ty: 9.6 }, { id: "antena", tx: 24, ty: 2.6 },
    ],
    npcs: [
      { id: "larga", tx: 12, ty: 13.4, dir: "este" },
      { id: "cero", tx: 21, ty: 13.4, dir: "oeste" },
    ],
    salidas: [{ rect: { tx: 14, ty: 22.8, tw: 4, th: 1.2 }, destino: "hospital" }],
    entradas: { hospital: { tx: 16, ty: 21.5, dir: "norte" } },
  },
};

/* ── Compilación ─────────────────────────────────────────────────────────────────── */

const px = (t) => Math.round(t * TILE * ESCALA_MUNDO);
const ampliarSuelo = (suelo) => suelo.flatMap((fila) => {
  const ampliada = [...fila].map((tile) => tile.repeat(ESCALA_MUNDO)).join("");
  return Array.from({ length: ESCALA_MUNDO }, () => ampliada);
});

/**
 * Convierte un distrito crudo en lo que consume `sim.js`: píxeles, cajas sólidas ya
 * calculadas y disparadores en coordenadas de mundo.
 *
 * `props` sale ordenado por `y` **una sola vez**, aquí. `render.js` tiene que mezclarlo cada
 * fotograma con los personajes, que sí se mueven, y partir de una lista ya ordenada
 * convierte esa mezcla en una fusión lineal en vez de una ordenación completa.
 */
export function compilar(id) {
  const crudo = CRUDOS[id];
  if (!crudo) return null;

  const bultos = (crudo.bultos ?? [])
    .map((b, i) => ({ ...b, x: px(b.tx), y: px(b.ty), v: i % 2 }))
    .sort((a, b) => a.y - b.y);

  return {
    id,
    suelo: ampliarSuelo(crudo.suelo),
    leyenda: LEYENDA,
    spawn: { x: px(crudo.spawn.tx), y: px(crudo.spawn.ty), dir: crudo.spawn.dir },
    props: bultos,
    bultos: bultos.map((b) => cajaSolida(b.id, b.x, b.y)).filter(Boolean),
    npcs: (crudo.npcs ?? []).map((n) => ({
      ...n,
      x: px(n.tx),
      y: px(n.ty),
      rutina: n.rutina
        ? { ...n.rutina, puntos: n.rutina.puntos.map((p) => ({ x: px(p.tx), y: px(p.ty) })) }
        : null,
    })),
    disparadores: [
      ...(crudo.salidas ?? []).map((s) => ({
        tipo: "salida",
        destino: s.destino,
        x: px(s.rect.tx), y: px(s.rect.ty), w: px(s.rect.tw), h: px(s.rect.th),
      })),
      ...(crudo.lugares ?? []).map((l) => ({
        tipo: "lugar",
        id: l.id,
        accion: l.accion,
        x: px(l.rect.tx), y: px(l.rect.ty), w: px(l.rect.tw), h: px(l.rect.th),
      })),
    ],
    entradas: Object.fromEntries(
      Object.entries(crudo.entradas ?? {}).map(([k, v]) => [k, { x: px(v.tx), y: px(v.ty), dir: v.dir }]),
    ),
  };
}

/**
 * LAS SALAS NO SON DISTRITOS, y esta distinción sostiene todo el interior del instituto.
 *
 * Un DISTRITO es una unidad del motor: `calendar.js` decide cuándo se abre, `suspicion.js`
 * lo usa para situar una pista y `OFRECE` lo usa para saber qué acción ofrece cada persona
 * ahí. Una SALA es sólo un plano que se pisa. El aula está dentro del distrito `instituto`,
 * así que hablar con Requena entre los pupitres sigue siendo la misma `obligacion` que
 * hablar con él en el patio — que es exactamente lo que tiene que pasar.
 *
 * Si las salas entraran en `DISTRITOS_JUGABLES`, el aula aparecería como destino en el mapa
 * de ciudad, el calendario tendría que decidir en qué capítulo "se abre" un pasillo, y
 * `openDistricts` devolvería sitios que no son sitios.
 */
export const SALAS = {
  aula: "instituto",
  pasillo: "instituto",
  laboratorio: "instituto",
  azotea: "instituto",
};

export const SALAS_IDS = Object.keys(SALAS);

/** Sólo los distritos de verdad, en el orden en que Marés los abre. */
export const DISTRITOS_JUGABLES = Object.keys(CRUDOS).filter((id) => !SALAS[id]);

/** Todos los planos que se pueden pisar, distritos y salas. */
export const MAPAS_JUGABLES = Object.keys(CRUDOS);

/** A qué distrito pertenece un plano. Un distrito se pertenece a sí mismo. */
export function distritoDe(mapa) {
  return SALAS[mapa] ?? mapa;
}

/**
 * Comprueba que un distrito es coherente.
 *
 * Un mapa escrito a mano con una fila de 31 caracteres no falla al cargarse: se dibuja, y
 * el jugador cae por un agujero invisible en el borde derecho tres horas después. Lo mismo
 * con un NPC colocado dentro de un muro o una salida sin vuelta. Por eso esto es una
 * función pública con un test detrás y no un comentario pidiendo cuidado.
 */
export function validar(id) {
  const crudo = CRUDOS[id];
  if (!crudo) return [`distrito desconocido: ${id}`];
  const errores = [];

  crudo.suelo.forEach((fila, y) => {
    if (fila.length !== ANCHO_BASE) errores.push(`${id}: la fila ${y} mide ${fila.length}, no ${ANCHO_BASE}`);
    for (const ch of fila) {
      if (!(ch in LEYENDA)) errores.push(`${id}: carácter desconocido "${ch}" en la fila ${y}`);
    }
  });
  if (crudo.suelo.length !== ALTO_BASE) errores.push(`${id}: tiene ${crudo.suelo.length} filas, no ${ALTO_BASE}`);

  // Toda salida necesita su entrada de vuelta en el destino, o el jugador cruza la puerta y
  // aparece en el punto de partida del distrito, que se lee como un fallo del juego.
  for (const s of crudo.salidas ?? []) {
    const destino = CRUDOS[s.destino];
    if (!destino) continue; // distrito aún no construido: es la fase 3, no un error
    if (!destino.entradas?.[id]) errores.push(`${id} → ${s.destino}: falta la entrada de vuelta`);
  }
  return errores;
}
