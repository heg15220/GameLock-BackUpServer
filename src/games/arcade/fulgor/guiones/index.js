/**
 * FULGOR — el guion de la campaña, listo para la caja de diálogo.
 *
 * `story.js` sabe QUÉ escena toca y qué banderas escribe. Este módulo sabe QUÉ SE DICE en
 * ella. La separación es la misma que hay entre `tables.js` y los siete módulos puros: la
 * estructura por un lado, el texto por otro, y ninguno de los dos importando al otro.
 *
 * LA CONVERSIÓN QUE HACE FALTA. Los tres archivos de acto están escritos para leerse —
 * `quien`, `animo`, `texto`— y la caja de `scene/dialogue.jsx` espera otra forma —`hablante`,
 * `nombre`, `animo`, `texto`. La traducción vive aquí y en un solo sitio, y de paso resuelve
 * el nombre desde `copy.personajes`, que es donde vive cada nombre del juego.
 *
 * EL NARRADOR NO ES UN PERSONAJE. `quien: null` sale con `hablante: null`, y de eso vive la
 * caja: sin hablante no pinta retrato ni placa, y la misma caja sirve para una conversación
 * y para una voz en off. Es lo que permite que un capítulo alterne «Requena escribe en la
 * pizarra» con «—Dani. Las manos.» sin cambiar de componente.
 */

import { getCopy } from "../copy.js";
import { ACTO_I } from "./acto1.js";
import { ACTO_II } from "./acto2.js";
import { ACTO_III } from "./acto3.js";

export const GUIONES = { ...ACTO_I, ...ACTO_II, ...ACTO_III };

export const ESCENAS_ESCRITAS = Object.keys(GUIONES);

/** ¿Hay texto escrito para esta escena? `story.js` no lo sabe y no tiene por qué saberlo. */
export function tieneGuion(escenaId) {
  return Boolean(GUIONES[escenaId]);
}

/**
 * Las líneas de una escena, en la forma que come `scene/dialogue.jsx`.
 *
 * @param {string} escenaId
 * @param {string} idioma
 * @returns {object[]} vacío si la escena no tiene guion escrito
 */
export function escenaGuion(escenaId, idioma = "es") {
  const ficha = GUIONES[escenaId];
  if (!ficha) return [];
  const lengua = idioma === "en" ? "en" : "es";
  const lineas = ficha[lengua] ?? ficha.es ?? [];
  const copy = getCopy(lengua);
  const nombreDe = (quien) => (quien ? copy.personajes?.[quien] ?? quien : null);

  return lineas.map((l) => {
    const base = {
      hablante: l.quien ?? null,
      nombre: nombreDe(l.quien),
      animo: l.animo ?? "neutro",
      texto: l.texto,
    };
    if (!l.opciones?.length) return base;

    /**
     * Una escena de elección. Los `id` NO son `honesto`/`proteger`/`preguntar` como en las
     * conversaciones del mundo: son los nombres de las banderas excluyentes que `story.js`
     * declara en `eleccion`, porque lo que se elige aquí no es un vínculo, es un final.
     */
    return {
      ...base,
      opciones: l.opciones.map((o) => ({
        id: o.id,
        label: o.label,
        response: [
          { speaker: "dani", name: nombreDe("dani"), mood: "decidido", text: o.dice },
          { speaker: o.quienResponde, name: nombreDe(o.quienResponde), mood: "neutro", text: o.responde },
        ],
      })),
    };
  });
}

/** Las banderas que puede escribir una escena de elección, leídas del propio guion. */
export function eleccionesDe(escenaId) {
  const ficha = GUIONES[escenaId];
  if (!ficha) return [];
  const conOpciones = (ficha.es ?? []).find((l) => l.opciones?.length);
  return conOpciones ? conOpciones.opciones.map((o) => o.id) : [];
}

/* ── Dónde pasa cada escena ─────────────────────────────────────────── */

/**
 * La sala en la que ocurre una escena, cuando ocurre en un sitio concreto.
 *
 * Sin esto, la primera línea del juego —«IES Miguel Servet. Tercera hora»— se leeía con
 * Dani parado en mitad de la plaza de las Aguas, que es el mismo desajuste que tenía la
 * brújula: el texto dice un sitio y la pantalla enseña otro.
 *
 * Sólo están las escenas cuyo texto NOMBRA el sitio. Una escena sin entrada aquí se juega
 * donde esté el jugador, que para una conversación de calle es lo correcto.
 */
export const ESCENARIO_DE = {
  c1_aula: "aula",
  c1_pasillo: "pasillo",
  c2_requena: "aula",
  c2_isma: "aula",
  c4_sabater: "pasillo",
  c4_instituto: "pasillo",
  c8_carpeta: "laboratorio",
  c8_azotea: "azotea",
};

/** Dónde hay que estar para leer esta escena, o `null` si da igual. */
export function escenarioDe(escenaId) {
  return ESCENARIO_DE[escenaId] ?? null;
}

export { ACTO_I, ACTO_II, ACTO_III };
