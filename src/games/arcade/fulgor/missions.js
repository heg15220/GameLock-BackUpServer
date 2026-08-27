/**
 * FULGOR — la brújula narrativa: qué toca hacer AHORA.
 *
 * ══ POR QUÉ SE REHIZO ══════════════════════════════════════════════════════════════
 *
 * La versión anterior era una tabla de doce filas escrita a mano, una por capítulo, y no
 * miraba nada del mundo al que apuntaba. El resultado en pantalla, en el minuto uno de
 * partida:
 *
 *     SIGUIENTE MISIÓN
 *     Vuelve a casa con Isma
 *     Cruza el Barrio de las Aguas y habla con Nuria antes de que anochezca.
 *
 * Tres errores en tres líneas. El título nombra a Isma y la instrucción a Nuria. El contacto
 * de la fila era `nuria`, y lo que Nuria ofrece en la plaza es `quedar`, que según `soloEn`
 * es de tarde y de noche — así que el capítulo empieza por la mañana mandándote a hacer algo
 * que el calendario prohíbe, y el personaje te contesta «ahora no» con toda la razón.
 *
 * Y no era el capítulo 1: la auditoría de las doce filas dio esto.
 *
 *   · Nueve de las doce apuntaban a una acción ilegal en el bloque de apertura.
 *   · El 8 mandaba al instituto a buscar a Isma, que sólo está en las Aguas.
 *   · El 11 mandaba a las Tolvas a por Sabater, que está en el Distrito Financiero.
 *   · El 12 apuntaba a Larga, que no ofrece ninguna acción en ningún sitio.
 *
 * ══ LA REGLA NUEVA ═════════════════════════════════════════════════════════════════
 *
 *   **La brújula nunca pide algo que el juego no deje hacer en este momento.**
 *
 * Por eso los objetivos van por CAPÍTULO Y BLOQUE, no por capítulo: por la mañana en Marés
 * sólo se puede cumplir con una obligación o entrenar, y de nada sirve señalar a Chapa hasta
 * que caiga la tarde. Cada objetivo nombra a UNA persona, la misma en el título y en la
 * instrucción, que está de pie en ese distrito y cuya acción es legal en ese bloque.
 *
 * `missions.test.js` lo comprueba contra `OFRECE` (quién ofrece qué y dónde),
 * `BLOCK_ACTION_RULES.soloEn` (en qué bloque es legal) y `openDistricts` (si el capítulo ha
 * abierto ese distrito). Las tres tablas son la verdad; esto es sólo un dedo que apunta.
 */

import { BLOCKS } from "./tables.js";

/**
 * Un objetivo por capítulo y bloque: `[título, instrucción, distrito, contacto]`.
 *
 * El contacto es siempre el nombre que aparece en el texto. Si mañana alguien mueve a una
 * persona de distrito o cambia su acción, el test se pone rojo aquí y no en una partida.
 */
const OBJETIVOS = {
  es: {
    1: {
      manana: ["Entra a clase de Requena", "Tercera hora en el IES Miguel Servet. Hoy toca inducción, y Requena lleva media clase mirándote las manos.", "instituto", "requena"],
      tarde: ["Vuelve a casa con Nuria", "Cruza el Barrio de las Aguas y quédate un rato con tu hermana. Lleva desde las seis esperándote.", "aguas", "nuria"],
      noche: ["Sube al Polígono Norte", "El Sordo entrena en una nave del polígono. La 7 está al fondo, y esa llave abre su candado.", "poligono", "sordo"],
    },
    2: {
      manana: ["Deja que Requena te vea las manos", "No las escondas. Es el único adulto de Marés que sabe lo que está mirando.", "instituto", "requena"],
      tarde: ["Mira la carpeta de Isma", "Recortes, un mapa y chinchetas de verdad. Averigua cuánto tiene antes de que se lo enseñe a otro.", "aguas", "isma"],
      noche: ["Baja al portal con Doña Pilar", "Oyó un chisporroteo a la una menos cuarto y lo apuntó. Que no lo apunte dos veces.", "aguas", "pilar"],
    },
    3: {
      manana: ["Acompaña a tu madre a La Concha", "Carmen sale de turno por la plaza. La joyería de la esquina amaneció abierta y sin un arañazo.", "concha", "carmen"],
      tarde: ["Descarga cajas para Yusuf", "Hay faena en el Puerto Viejo hasta las nueve, paga en mano y ninguna pregunta.", "puerto", "yusuf"],
      noche: ["Adelántate a Marga", "Tiene quince testigos y ninguna hora. Cuatro cámaras te grabaron ganando: quítale una a la historia.", "concha", "marga"],
    },
    4: {
      manana: ["Ve a clase con Requena", "Hay una inspectora en el pasillo hablando con alumnos de tu curso. Contigo tardará nueve minutos.", "instituto", "requena"],
      tarde: ["Camina con Julia por el instituto", "Ha visto que Sabater pidió los partes de faltas del trimestre. Y sabe qué martes faltas tú.", "instituto", "julia"],
      noche: ["Alcanza a Marga antes del cierre", "Publica a las once. Lo que le des antes de las once lo escribe ella; lo de después, su jefe.", "concha", "marga"],
    },
    5: {
      manana: ["Da las vueltas de Tuerca", "Cinco al campo del instituto. Vas a necesitar el aire esta noche, en las grúas.", "instituto", "tuerca"],
      tarde: ["Móntate el traje con Chapa", "En la subestación del Polígono. Seis piezas, y lo que rompas se apunta.", "poligono", "chapa"],
      noche: ["Llega al cumpleaños de Nuria", "Trece años y una tarta que quiere cortar ella. En casa, a las ocho.", "aguas", "nuria"],
    },
    6: {
      manana: ["Aprende del Sordo a no hacer ruido", "Pega corto y sal limpio. Alguien lleva cuatro noches siguiéndote y te oye desde la puerta.", "poligono", "sordo"],
      tarde: ["Sube a ver a la Vigía", "Ciento doce escalones hasta el Cerro del Faro. Lleva cuatro noches siguiéndote y hoy ha dejado que la vieras.", "faro", "vigia"],
      noche: ["Escucha a la Vigía", "No vas a ganarle y no hace falta. Mira cómo pelea quien ya no tiene nada que proteger.", "faro", "vigia"],
    },
    7: {
      manana: ["Pasa la mañana en el instituto", "Requena te cubre la falta de ayer. Media Marés lleva desde el jueves diciendo tu otro nombre.", "instituto", "requena"],
      tarde: ["Cierra el trato con Marga", "Le das una cosa que nadie tenga y ella controla el relato. Si no, escribe igual y peor.", "concha", "marga"],
      noche: ["Mira el mapa de Sabater", "Nueve chinchetas y una circunferencia de novecientos metros. Quítale una antes de que la cierre.", "financiero", "sabater"],
    },
    8: {
      manana: ["Aguanta la mañana con Requena", "Tiene el laboratorio abierto y una cara que no le habías visto. Alguien le ha entrado de noche.", "instituto", "requena"],
      tarde: ["Busca a Isma en las Aguas", "Ya no es una carpeta: es una caja de zapatos con una hoja titulada «coincidencias que no me gustan».", "aguas", "isma"],
      noche: ["Deja que Isma pregunte", "Va a decirlo esta noche pase lo que pase. Lo único que eliges es si se entera por ti.", "aguas", "isma"],
    },
    9: {
      manana: ["Cumple con Requena una vez más", "Cuatro nombres en un cuaderno rojo, y él lleva veinte años sin poder decir el cuarto.", "instituto", "requena"],
      tarde: ["Reúnete con Julia en el Financiero", "Su tarjeta abre de la nueve a la catorce y caduca el viernes. Ella no te la va a dar en la mano.", "financiero", "julia"],
      noche: ["Encuentra a Iria Lem en el puerto", "Sólo habla lejos de la torre y sin cámaras delante. Trae un sobre de papel.", "puerto", "iria"],
    },
    10: {
      manana: ["Acompaña a Carmen al hospital", "Entra de turno en el Hospital del Puerto. Esta noche opera, y esta noche Marés se va a quedar a oscuras.", "hospital", "carmen"],
      tarde: ["Pídele los partes a tu padre", "Tomás guardó copia del archivo muerto. Cuatro subestaciones no caen a la vez por avería.", "aguas", "tomas"],
      noche: ["Llega a Iria antes del apagón", "Está en el hospital y sabe qué generadores hay. Que son ninguno.", "hospital", "iria"],
    },
    11: {
      manana: ["Recoge la carta de Requena", "Tres folios contando lo que hicieron en 2004. Se publica el día que tú digas y no antes.", "instituto", "requena"],
      tarde: ["Vacía el expediente de Sabater", "Sesé tiene su número directo. Cada pista que le quites es una hora que le ganas al reloj.", "financiero", "sabater"],
      noche: ["Pon a Isma a tapar", "Se le da mejor esconder que encontrar. Dile cuáles y él se encarga del foro.", "aguas", "isma"],
    },
    12: {
      manana: ["Escucha al Sordo por última vez", "No ganes por fuerte. Gana por listo, que los fuertes están en el cementerio del puerto.", "poligono", "sordo"],
      tarde: ["Recoge el traje Fulgor", "Chapa lo ha cortado, Yusuf puso el forro e Iria calculó el aislamiento. Tú sólo lo llevas puesto.", "poligono", "chapa"],
      noche: ["Sube a ver a Nuria", "La central arranca por la mañana. Antes de eso hay una casa, y en la casa hay alguien despierto.", "aguas", "nuria"],
    },
  },

  en: {
    1: {
      manana: ["Get to Requena's class", "Third period at IES Miguel Servet. Induction today, and Requena has spent half the lesson looking at your hands.", "instituto", "requena"],
      tarde: ["Walk home with Nuria", "Cross the Barrio de las Aguas and stay a while with your sister. She's been waiting since six.", "aguas", "nuria"],
      noche: ["Head up to the Polígono Norte", "El Sordo trains in one of the units. Number 7 is at the far end, and that key fits its padlock.", "poligono", "sordo"],
    },
    2: {
      manana: ["Let Requena see your hands", "Don't hide them. He's the only adult in Marés who knows what he's looking at.", "instituto", "requena"],
      tarde: ["Look inside Isma's folder", "Cuttings, a map and actual pins. Find out how much he has before he shows somebody else.", "aguas", "isma"],
      noche: ["Go down to Doña Pilar's hall", "She heard a crackle at quarter to one and wrote it down. Don't let her write it twice.", "aguas", "pilar"],
    },
    3: {
      manana: ["Walk your mother to La Concha", "Carmen comes off shift across the plaza. The jeweller's on the corner opened without a scratch on it.", "concha", "carmen"],
      tarde: ["Unload crates for Yusuf", "Work at the Old Port until nine. Cash in hand and no questions.", "puerto", "yusuf"],
      noche: ["Get ahead of Marga", "Fifteen witnesses and no agreed time. Four cameras filmed you winning: take one back off the story.", "concha", "marga"],
    },
    4: {
      manana: ["Sit through Requena's lesson", "There's an inspector in the corridor talking to your year. With you she'll take nine minutes.", "instituto", "requena"],
      tarde: ["Walk the corridor with Julia", "She's seen Sabater request the term's absence records. And she knows which Tuesdays you miss.", "instituto", "julia"],
      noche: ["Catch Marga before she files", "She goes to press at eleven. What you give her before eleven she writes; after that, her editor does.", "concha", "marga"],
    },
    5: {
      manana: ["Run Tuerca's laps", "Five round the school pitch. You'll want the air tonight, up on the cranes.", "instituto", "tuerca"],
      tarde: ["Build the suit with Chapa", "At the Polígono substation. Six pieces, and whatever you break gets written down.", "poligono", "chapa"],
      noche: ["Make it to Nuria's birthday", "Thirteen, and a cake she wants to cut herself. Home, eight o'clock.", "aguas", "nuria"],
    },
    6: {
      manana: ["Learn quiet from El Sordo", "Punch short and walk out clean. Somebody's been following you four nights and hears you from the door.", "poligono", "sordo"],
      tarde: ["Go up to the Vigía", "A hundred and twelve steps to Cerro del Faro. She's followed you four nights and today she let you see her.", "faro", "vigia"],
      noche: ["Hear the Vigía out", "You won't beat her and you don't need to. Watch how someone fights with nothing left to protect.", "faro", "vigia"],
    },
    7: {
      manana: ["Spend the morning at school", "Requena covers yesterday's absence. Half of Marés has been saying your other name since Thursday.", "instituto", "requena"],
      tarde: ["Close the deal with Marga", "Give her something nobody else has and she controls the story. Refuse and she writes it anyway, worse.", "concha", "marga"],
      noche: ["Look at Sabater's map", "Nine pins and a nine-hundred-metre circle. Take one out before she closes it.", "financiero", "sabater"],
    },
    8: {
      manana: ["Sit the morning out with Requena", "The lab is open and he's wearing a face you haven't seen. Somebody got in overnight.", "instituto", "requena"],
      tarde: ["Find Isma in the Aguas", "It isn't a folder now: it's a shoebox with a sheet headed 'coincidences I don't like'.", "aguas", "isma"],
      noche: ["Let Isma ask", "He's going to say it tonight whatever happens. All you choose is whether he hears it from you.", "aguas", "isma"],
    },
    9: {
      manana: ["Show up for Requena once more", "Four names in a red notebook, and twenty years of not being able to say the fourth.", "instituto", "requena"],
      tarde: ["Meet Julia in the Financiero", "Her card opens nine to fourteen and expires Friday. She won't put it in your hand.", "financiero", "julia"],
      noche: ["Find Iria Lem at the port", "She only talks away from the tower and out of shot. She's carrying a paper envelope.", "puerto", "iria"],
    },
    10: {
      manana: ["Walk Carmen to the hospital", "Her shift starts at the Hospital del Puerto. She operates tonight, and tonight Marés goes dark.", "hospital", "carmen"],
      tarde: ["Ask your father for the reports", "Tomás kept a copy of the dead archive. Four substations don't drop at once by accident.", "aguas", "tomas"],
      noche: ["Reach Iria before the blackout", "She's at the hospital and she knows what generators there are. Which is none.", "hospital", "iria"],
    },
    11: {
      manana: ["Collect Requena's letter", "Three pages setting out what they did in 2004. It runs the day you say and not before.", "instituto", "requena"],
      tarde: ["Empty Sabater's file", "Sesé has her direct number. Every clue you pull is an hour you buy off the clock.", "financiero", "sabater"],
      noche: ["Put Isma on cover", "He's better at hiding than finding. Tell him which ones and he'll handle the forum.", "aguas", "isma"],
    },
    12: {
      manana: ["Hear El Sordo one last time", "Don't win by being strong. Win by being clever — the strong ones are in the port cemetery.", "poligono", "sordo"],
      tarde: ["Collect the Fulgor suit", "Chapa cut it, Yusuf lined it and Iria ran the insulation. You only wear it.", "poligono", "chapa"],
      noche: ["Go up and see Nuria", "The station starts in the morning. Before that there's a house, and somebody in it is awake.", "aguas", "nuria"],
    },
  },
};

const BLOQUE_POR_DEFECTO = "manana";

/**
 * El objetivo de este capítulo en este bloque.
 *
 * @param {number} chapter
 * @param {string} locale
 * @param {string} currentDistrict  dónde está el jugador ahora, para el «Estás aquí»
 * @param {string} bloque           "manana" | "tarde" | "noche"
 */
export function activeMission(chapter = 1, locale = "es", currentDistrict = "aguas", bloque = BLOQUE_POR_DEFECTO) {
  const tabla = OBJETIVOS[locale] ?? OBJETIVOS.es;
  const capitulo = tabla[chapter] ?? tabla[MISSION_COUNT];
  const b = BLOCKS.includes(bloque) ? bloque : BLOQUE_POR_DEFECTO;
  const fila = capitulo[b] ?? capitulo[BLOQUE_POR_DEFECTO];

  return {
    id: `c${chapter}-${b}`,
    title: fila[0],
    instruction: fila[1],
    district: fila[2],
    contact: fila[3],
    bloque: b,
    here: fila[2] === currentDistrict,
  };
}

/** Todos los objetivos de un capítulo, en orden de bloque. Lo usa el test y nadie más. */
export function chapterMissions(chapter, locale = "es") {
  const tabla = OBJETIVOS[locale] ?? OBJETIVOS.es;
  return BLOCKS.map((b) => activeMission(chapter, locale, null, b)).filter(() => Boolean(tabla[chapter]));
}

export const MISSION_COUNT = 12;
export { OBJETIVOS };
