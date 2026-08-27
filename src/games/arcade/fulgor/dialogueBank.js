/**
 * FULGOR — LAS CONVERSACIONES DE MARÉS, ESCRITAS UNA A UNA.
 *
 * ══ POR QUÉ ESTE ARCHIVO SE REESCRIBIÓ ENTERO ══════════════════════════════════════
 *
 * La versión anterior era un generador combinatorio: seis aperturas, seis cierres y seis
 * plantillas de asunto, COMPARTIDAS POR LOS VEINTIÚN PERSONAJES, con un sintagma nominal
 * incrustado dentro. Multiplicaba a 216 variantes por voz y el número quedaba muy bien en
 * un test. En pantalla producía esto:
 *
 *     Doña Pilar — «Marés está rara hoy, ¿no te parece?»
 *     Doña Pilar — «Quiero hablar de las horas a las que vuelves.»
 *     Doña Pilar — «La ciudad guarda memoria, aunque tú no quieras.»
 *
 * Tres frases que no son de Doña Pilar. Son de nadie. La primera y la tercera se las dice
 * igual Sabater, Yusuf y tu hermana pequeña de doce años, y la del medio es una plantilla
 * con un complemento metido con calzador. Eso es lo que suena a robot: no la falta de
 * variantes, sino que la variante no sale de la boca de quien habla.
 *
 * ══ LA REGLA NUEVA ═════════════════════════════════════════════════════════════════
 *
 *   **Ninguna frase de este archivo puede decirla más de un personaje.**
 *
 * No hay pozo común. No hay plantilla con hueco. Cada conversación está escrita entera para
 * una persona concreta en un momento concreto de la campaña, y si se la pusieras en la boca
 * a otro, cantaría. Ése es el único listón que separa un diálogo humano de un formulario, y
 * `dialogue.test.js` lo comprueba como un hecho y no como una intención.
 *
 * ══ LOS TRES EJES QUE MUEVEN UNA CONVERSACIÓN ══════════════════════════════════════
 *
 *  1. **EL ACTO.** La campaña son tres actos (§9) y la gente no habla igual en los tres.
 *     Nuria en el acto I te está esperando en la plaza; en el II ya ha dejado de esperarte
 *     y te lo dice; en el III sabe algo y ha decidido no preguntar. Esa curva es la que
 *     hace que hablar con alguien doce capítulos seguidos no sea repetir una escena.
 *
 *  2. **EL MOMENTO.** Dentro de un acto, cada personaje tiene varios «asuntos» escritos, y
 *     cuál toca lo decide el capítulo, el día y el bloque. No es azar: es determinista, así
 *     que dos partidas con la misma semilla cuentan la misma historia, y volver a un guardado
 *     no reescribe lo que ya oíste.
 *
 *  3. **LA VISITA.** Volver a hablar con alguien el mismo día NO repite la conversación.
 *     Cada persona tiene su forma de decir «ya hemos hablado hoy», y esa forma también es
 *     suya: Sabater te lo dice como una funcionaria, Isma como alguien a quien le acabas de
 *     hacer un feo. Es más honesto que fingir doscientas variantes y menos molesto que oír
 *     la misma frase dos veces.
 *
 * ══ LAS RESPUESTAS DE DANI ═════════════════════════════════════════════════════════
 *
 * Los tres identificadores no se tocan —`honesto`, `proteger`, `preguntar`, porque
 * `index.jsx` los traduce a movimiento de vínculo— pero el TEXTO de los tres es distinto
 * para cada persona y para cada acto. «No puedo contártelo todo» a tu madre y «no puedo
 * contártelo todo» a la inspectora que te está investigando no son la misma frase aunque
 * lleven las mismas palabras, así que aquí no las llevan.
 *
 * Y la réplica del personaje a cada elección también es suya. Ahí es donde se nota si el
 * juego te ha oído: mentirle a Nuria tiene que doler distinto que mentirle a Marga.
 *
 * ══ EL NOMBRE VIENE DE `copy.js` ═══════════════════════════════════════════════════
 *
 * La placa del retrato la escribe `copy.personajes[id]` y no una copia local. La versión
 * anterior tenía «Ismael Doblas» aquí y «Isma Doblas» en `copy.js`, y el juego llamaba al
 * mismo chaval de dos maneras según qué caja lo pintara.
 */

import { getCopy } from "./copy.js";

/* ── Los tres actos (§9) ─────────────────────────────────────────────────────────── */

/** Acto I: el elegido (1-4). Acto II: el héroe (5-8). Acto III: el nombre (9-12). */
export const ACTOS = { 1: [1, 2, 3, 4], 2: [5, 6, 7, 8], 3: [9, 10, 11, 12] };

export function actoDe(capitulo) {
  const n = Number(capitulo) || 1;
  if (n <= 4) return 1;
  if (n <= 8) return 2;
  return 3;
}

/* ── Selección determinista ──────────────────────────────────────────────────────── */

const hash = (value) => {
  let h = 2166136261;
  for (const ch of String(value)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
};

/**
 * El acto que de verdad se puede servir.
 *
 * Larga aparece en el capítulo 8 y Cero en el 11: pedirles una conversación del acto I es
 * legítimo —el mundo es caminable y nada impide asomarse— pero no hay nada escrito para eso
 * porque no existe. Se cae hacia el primer acto que sí tenga guion, nunca a una plantilla.
 */
function pizarra(voz, acto) {
  return voz[acto] ?? voz[acto - 1] ?? voz[acto + 1] ?? voz[1] ?? voz[2] ?? voz[3] ?? null;
}

/* ── El reparto ──────────────────────────────────────────────────────────────────── */

import { VOCES } from "./voces/index.js";

export { VOCES };
export const DIALOGUE_CHARACTERS = Object.keys(VOCES);

/** Cuántas conversaciones distintas tiene escritas una persona en toda la campaña. */
export function writtenConversations(npcId) {
  const voz = VOCES[npcId]?.es;
  if (!voz) return 0;
  return Object.values(voz).reduce((n, acto) => n + (acto.asuntos?.length ?? 0), 0);
}

/** El total del reparto. Es un hecho sobre el guion, no una promesa combinatoria. */
export const DIALOGUE_WRITTEN_TOTAL = DIALOGUE_CHARACTERS
  .reduce((n, id) => n + writtenConversations(id), 0);

/* ── Construir una conversación ──────────────────────────────────────────────────── */

/**
 * Qué te dice esta persona ahora mismo.
 *
 * @param {string} npcId
 * @param {object} ctx
 * @param {string} ctx.locale   "es" | "en"
 * @param {number} ctx.chapter  1..12 — elige el acto, que es lo que cambia el tono
 * @param {number} ctx.day      día del capítulo
 * @param {string} ctx.block    "manana" | "tarde" | "noche"
 * @param {number} ctx.visit    0 la primera vez del día; ≥1 vuelve con la línea de repetición
 * @returns {object[]|null}     líneas para `scene/dialogue.jsx`, o null si no es del reparto
 */
export function buildConversation(npcId, {
  locale = "es", chapter = 1, day = 1, block = "tarde", visit = 0,
} = {}) {
  const persona = VOCES[npcId];
  if (!persona) return null;

  const idioma = locale === "en" ? "en" : "es";
  const voz = persona[idioma] ?? persona.es;
  const acto = pizarra(voz, actoDe(chapter));
  if (!acto) return null;

  const nombre = getCopy(idioma).personajes?.[npcId] ?? npcId;
  const linea = (l) => ({ hablante: npcId, nombre, animo: l.a ?? "neutro", texto: l.t });

  /**
   * VOLVER A HABLARLE EL MISMO DÍA NO REPITE LA ESCENA.
   *
   * Es la decisión que sustituye a las 216 variantes del generador anterior, y es más
   * honesta: un juego no tiene doscientas cosas que decirte por persona y por tarde, tiene
   * una. Lo que sí tiene —y lo que aquella versión no tenía— es una manera propia de que
   * cada quien te diga que ya habéis hablado.
   */
  if (visit > 0) {
    const repite = acto.repite ?? [];
    if (!repite.length) return null;
    return [linea(repite[(visit - 1) % repite.length])];
  }

  const asuntos = acto.asuntos ?? [];
  if (!asuntos.length) return null;

  // Determinista por capítulo, día y bloque: la misma partida cuenta la misma historia, y
  // cargar un guardado no reescribe la conversación que el jugador ya leyó.
  const asunto = asuntos[hash(`${npcId}:${chapter}:${day}:${block}`) % asuntos.length];

  const opciones = (acto.opciones ?? []).map((o) => ({
    id: o.id,
    label: o.label,
    response: [
      { speaker: "dani", name: getCopy(idioma).personajes?.dani ?? "Dani Vela", mood: o.id === "honesto" ? "decidido" : "tenso", text: o.texto },
      { speaker: npcId, name: nombre, mood: o.id === "proteger" ? "tenso" : "neutro", text: o.replica },
    ],
  }));

  const cierre = {
    hablante: "dani",
    nombre: getCopy(idioma).personajes?.dani ?? "Dani Vela",
    animo: "tenso",
    texto: acto.pregunta,
    opciones,
  };

  return opciones.length ? [...asunto.map(linea), cierre] : asunto.map(linea);
}
