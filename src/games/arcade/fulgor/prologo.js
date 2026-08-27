/**
 * FULGOR — el prólogo jugable y la apertura, como datos.
 *
 * ══ POR QUÉ EXISTE ═════════════════════════════════════════════════════════════════
 *
 * El juego empezaba en la pantalla de título y de ahí saltaba al capítulo 1 con una
 * entradilla de una línea. Un jugador que llegase sin haber leído el documento de diseño se
 * encontraba andando por una plaza con trece expedientes abiertos, tres bloques de día y
 * nueve acciones repartidas por la ciudad, y nadie le había dicho ni de qué iba la cosa ni
 * quién era la niña sentada en el banco.
 *
 * Así que ahora hay dos cosas antes del primer bloque, y son dos cosas distintas a propósito:
 *
 *   1. **El prólogo** explica. Qué es el juego, quién es quién, qué se te pide y cómo se
 *      juega. Es información, va en cartas y se puede saltar entera.
 *   2. **La apertura** no explica nada. Son ocho frases sobre negro que ponen el tono y
 *      dejan la pregunta del capítulo 12 flotando desde el primer minuto.
 *
 * Ponerlas al revés sería un error de ritmo: la apertura tiene que ser lo último que se ve
 * antes del juego, para que el corte a la clase de Requena signifique algo.
 *
 * ══ LO QUE NO HAY AQUÍ ═════════════════════════════════════════════════════════════
 *
 * Ni una cadena de texto. Las claves apuntan a `copy.prologo` y `copy.apertura`, como todo
 * lo demás del juego (§13.1). Aquí sólo está la ESTRUCTURA: cuántas cartas, en qué orden, y
 * qué cara acompaña a cada una.
 */

/**
 * Las cinco cartas del prólogo.
 *
 * `retratos` son ids del reparto: la carta de "quién es quién" enseña las cuatro caras que
 * de verdad importan el primer día —tu hermana, tu profesor, la portera y la inspectora—
 * porque son los cuatro expedientes que más rápido se llenan en el acto I.
 *
 * `icono` es la alternativa para las cartas que no van de gente. No se usan las dos a la vez.
 */
export const CARTAS = [
  {
    id: "queEs",
    titulo: "queEsTitulo",
    lineas: ["queEsUno", "queEsDos", "queEsTres"],
    retratos: ["dani"],
    icono: null,
  },
  {
    id: "quien",
    titulo: "quienTitulo",
    lineas: ["quienUno", "quienDos", "quienTres"],
    retratos: ["nuria", "requena", "pilar", "sabater"],
    icono: null,
  },
  {
    id: "objetivo",
    titulo: "objetivoTitulo",
    lineas: ["objetivoUno", "objetivoDos", "objetivoTres"],
    retratos: ["isma", "carmen", "marga"],
    icono: null,
  },
  {
    id: "dosVidas",
    titulo: "dosVidasTitulo",
    lineas: ["dosVidasUno", "dosVidasDos", "dosVidasTres"],
    retratos: [],
    icono: "reloj",
  },
  {
    id: "controles",
    titulo: "controlesTitulo",
    lineas: ["controlesUno", "controlesDos", "controlesTres"],
    retratos: [],
    icono: "ruta",
  },
];

export const TOTAL_CARTAS = CARTAS.length;

/**
 * Las ocho frases de la apertura, en orden.
 *
 * Ocho y no diez: a la novena, una cartela sobre negro deja de ser tono y empieza a ser
 * una pantalla de carga con pretensiones.
 */
export const FRASES_APERTURA = ["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8"];

/**
 * El ritmo de la apertura, en milisegundos.
 *
 * `entra` es lo que tarda una frase en aparecer; `sostiene` lo que se queda quieta; `sale`
 * lo que tarda en irse. La suma por frase es 2.6 s y las ocho son veintiún segundos, que es
 * exactamente lo que dura la intro de un capítulo de la referencia antes del logotipo.
 *
 * Y se puede saltar en cualquier momento, porque en una partida de ocho horas nadie quiere
 * ver esto dos veces (§11.5).
 */
export const RITMO_APERTURA = { entra: 620, sostiene: 1400, sale: 580 };

export const DURACION_FRASE = RITMO_APERTURA.entra + RITMO_APERTURA.sostiene + RITMO_APERTURA.sale;

/** Cuánto dura la apertura entera. Lo usa el test para que nadie la alargue sin querer. */
export const DURACION_APERTURA = DURACION_FRASE * FRASES_APERTURA.length;
