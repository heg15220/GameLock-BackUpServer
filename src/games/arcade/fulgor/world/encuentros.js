import { buildConversation } from "../dialogueBank.js";
import { getCopy } from "../copy.js";

/**
 * FULGOR — hablar con alguien ES gastar el bloque.
 *
 * Éste es el archivo donde el rediseño se paga. En la versión anterior, un bloque del día
 * se gastaba pulsando uno de nueve botones en una lista: `entrenar`, `taller`, `quedar`.
 * Aquí no hay lista. Chapa está de pie en la subestación del Polígono Norte y hablar con él
 * ES entrenar en el taller; Nuria está sentada en la plaza de las Aguas y hablar con ella
 * ES quedar.
 *
 * Y LO QUE ESO COMPRA, que es el motivo entero: el Pilar 2 del diseño dice que el juego va
 * de "elegir a quién fallas". En un menú, fallarle a Nuria es no pulsar un botón, y no
 * pulsar un botón no cuesta nada. Aquí Nuria está *sentada, a la vista, esperando*, y para
 * irte al Polígono tienes que darle la espalda y cruzar la plaza andando. La regla del
 * motor no ha cambiado ni una línea. Lo que ha cambiado es dónde ocurre la decisión.
 *
 * LO QUE ESTE MÓDULO NO HACE: no decide si la acción es legal. Eso ya lo sabe
 * `calendar.js` con su tabla `soloEn`, y preguntárselo dos veces sería tener la regla en
 * dos sitios. Aquí sólo se pregunta, y si la respuesta es no, el personaje lo dice con su
 * voz — que es mejor interfaz que un botón gris.
 *
 * ══ EL ARREGLO DEL 2026-08-27 ══════════════════════════════════════════════════════
 *
 * Esta función tenía un fallo silencioso que se llevaba por delante todo el trabajo de
 * escritura del juego. `encuentro()` construía las líneas de `SALUDOS` —escritas a mano,
 * una por persona y por sitio— y acto seguido las TIRABA:
 *
 *     const contextual = (!accion || legal) ? buildConversation(...) : null;
 *     return { lineas: contextual ?? fuente.map(...) };
 *
 * Como `buildConversation` devolvía algo siempre, el `??` no llegaba nunca a su derecha. En
 * pantalla no se veía ni una sola de las líneas de este archivo: se veía el generador
 * combinatorio, que era justo la parte impersonal. Ahora las dos cosas se suman en el orden
 * que tiene sentido — **el saludo sitúa, la conversación avanza** — y ninguna pisa a la otra.
 */

/**
 * Qué acción de bloque ofrece cada persona, por distrito.
 *
 * Un mismo personaje puede ofrecer cosas distintas en sitios distintos: Nuria en la plaza
 * es `quedar`, Nuria en el patio del instituto es `quedar` también, pero Requena en su
 * laboratorio es `obligacion` y no lo sería en la calle.
 */
export const OFRECE = {
  aguas: { nuria: "quedar", pilar: "contramedidas", isma: "investigar", tomas: "obligacion" },
  concha: { carmen: "obligacion", yusuf: "trabajar", marga: "contramedidas", oscar: "quedar" },
  instituto: { requena: "obligacion", julia: "investigar", tuerca: "entrenar", nuria: "quedar" },
  poligono: { chapa: "taller", sordo: "entrenar", hierro: null },
  puerto: { yusuf: "trabajar", iria: "investigar" },
  faro: { vigia: "entrenar" },
  financiero: { julia: "investigar", ezequiel: null, sabater: "contramedidas" },
  hospital: { carmen: "obligacion", iria: "contramedidas" },
  tolvas: { larga: null, cero: null },
};

/**
 * EL SALUDO Y EL «AHORA NO».
 *
 * `saluda` es cómo te recibe esa persona EN ESE SITIO: una frase de situación, no de trama.
 * Sitúa el encuentro —dónde estás, qué está haciendo el otro, en qué tono— y después entra
 * la conversación del acto, que es la que mueve la historia (`voces/`). Se rotan por día
 * para que volver mañana no empiece con la misma frase.
 *
 * `noToca` es lo que dicen cuando el calendario no permite la acción que ofrecen. Que el
 * "ahora no" tenga voz propia por persona es lo que separa un mundo de un menú con sprites:
 * Doña Pilar no te dice "acción no disponible", te dice que a estas horas ella ya está en
 * la cama. Y no gasta bloque, porque no ha pasado nada.
 *
 * Dos idiomas, como todo el resto del juego (§13).
 */
const SALUDOS = {
  es: {
    nuria: {
      saluda: [
        { animo: "decidido", texto: "¡Has venido! Llevo aquí desde las seis, ¿sabes?" },
        { animo: "neutro", texto: "Anda. Pensaba que hoy tampoco aparecías." },
      ],
      noToca: [{ animo: "neutro", texto: "Ahora no, que mamá me mata. Luego, ¿vale? Prométemelo." }],
    },
    carmen: {
      saluda: [
        { animo: "neutro", texto: "Dani. Ven, que me pillas con cinco minutos justos." },
        { animo: "tenso", texto: "Siéntate ahí un momento y déjame mirarte bien." },
      ],
      noToca: [{ animo: "neutro", texto: "Ahora entro de turno. Hablamos en casa." }],
    },
    tomas: {
      saluda: [
        { animo: "neutro", texto: "Hombre. Baja el volumen de la radio y siéntate." },
        { animo: "neutro", texto: "Estoy con los partes. Puedes quedarte, si no hablas mucho." },
      ],
      noToca: [{ animo: "neutro", texto: "Ahora no, hijo, que tengo una avería en el Polígono." }],
    },
    isma: {
      saluda: [
        { animo: "decidido", texto: "¡Eh! Ven, ven, ven. Siéntate. Que tengo cosas." },
        { animo: "neutro", texto: "Llegas tarde a todo menos a esto, fíjate." },
      ],
      noToca: [{ animo: "neutro", texto: "Ahora tengo clase. Y tú también, por cierto." }],
    },
    julia: {
      saluda: [
        { animo: "neutro", texto: "No te pares a mi lado. Camina y hablamos." },
        { animo: "tenso", texto: "Dos minutos. Y no mires hacia la puerta." },
      ],
      noToca: [{ animo: "neutro", texto: "Ahora no. Hay demasiada gente delante." }],
    },
    oscar: {
      saluda: [
        { animo: "tenso", texto: "Vaya, vaya. Mira quién se digna." },
        { animo: "neutro", texto: "¿Qué? ¿Vienes a hablar o vienes a mirar el suelo?" },
      ],
      noToca: [{ animo: "neutro", texto: "No tengo tiempo para ti ahora mismo." }],
    },
    requena: {
      saluda: [
        { animo: "neutro", texto: "Cierra la puerta. Y el pestillo, si no te importa." },
        { animo: "decidido", texto: "Justo estaba pensando en ti. Siéntate, Vela." },
      ],
      noToca: [{ animo: "neutro", texto: "El laboratorio está cerrado. Mañana a primera hora." }],
    },
    pilar: {
      saluda: [
        { animo: "neutro", texto: "Ay, hijo, espera, que dejo la fregona." },
        { animo: "tenso", texto: "Ven aquí un momento, que tengo que contarte una cosa." },
      ],
      noToca: [{ animo: "neutro", texto: "A estas horas yo ya no estoy para conversaciones." }],
    },
    yusuf: {
      saluda: [
        { animo: "decidido", texto: "Pasa. Y cierra, que se va el calor." },
        { animo: "neutro", texto: "Deja eso donde está y siéntate en el taburete." },
      ],
      noToca: [{ animo: "neutro", texto: "El almacén está cerrado. Vuelve por la tarde." }],
    },
    marga: {
      saluda: [
        { animo: "tenso", texto: "Chaval. Justo tú. Ven un segundo." },
        { animo: "neutro", texto: "Espera, que apago la grabadora. Ya está. Habla." },
      ],
      noToca: [{ animo: "neutro", texto: "Voy a cierre. Si tienes algo, que sea mañana." }],
    },
    sabater: {
      saluda: [
        { animo: "neutro", texto: "Ah, hola. Qué casualidad tan poco casual." },
        { animo: "neutro", texto: "¿Tienes un minuto? Es sólo un minuto, de verdad." },
      ],
      noToca: [{ animo: "neutro", texto: "Ahora estoy de servicio. Y contigo prefiero no estarlo." }],
    },
    ezequiel: {
      saluda: [
        { animo: "decidido", texto: "Pasa, pasa. Nadie se queda de pie en mi planta." },
        { animo: "neutro", texto: "Siéntate. Tienes cara de haber dormido cuatro horas." },
      ],
      noToca: [{ animo: "neutro", texto: "Estoy en consejo. Pide cita como todo el mundo." }],
    },
    iria: {
      saluda: [
        { animo: "tenso", texto: "No aquí. Ven, hacia la escalera, que no hay cámara." },
        { animo: "neutro", texto: "Tengo seis minutos hasta que me echen en falta." },
      ],
      noToca: [{ animo: "neutro", texto: "Ahora no puedo. Estoy fichada dentro del edificio." }],
    },
    tuerca: {
      saluda: [
        { animo: "decidido", texto: "¡Vela! Justo iba a cerrar el campo. Pasa, anda." },
        { animo: "neutro", texto: "Cámbiate y date una vuelta de calentamiento. Hablamos andando." },
      ],
      noToca: [{ animo: "neutro", texto: "El campo está cerrado a estas horas, tío." }],
    },
    chapa: {
      saluda: [
        { animo: "neutro", texto: "Trae. Y no me lo dejes encima de la mesa buena." },
        { animo: "decidido", texto: "Llegas justo. Tenía el banco libre y la lámpara caliente." },
      ],
      noToca: [{ animo: "neutro", texto: "De día no. Hay gente y aquí no viene nadie a vernos." }],
    },
    sordo: {
      saluda: [
        { animo: "tenso", texto: "Otra vez tú. Venga, quítate la sudadera." },
        { animo: "decidido", texto: "Guardia arriba antes de hablar. Se habla mejor con la guardia arriba." },
      ],
      noToca: [{ animo: "neutro", texto: "Ahora no. Estoy trabajando, aunque no lo parezca." }],
    },
    hierro: {
      saluda: [
        { animo: "tenso", texto: "Otra vez. Y ni siquiera te has parado a mirar si había alguien." },
      ],
      noToca: [{ animo: "tenso", texto: "Te he dicho que te des la vuelta." }],
    },
    tasador: {
      saluda: [
        { animo: "neutro", texto: "Buenas noches. No, no corras: si quisiera irme, ya me habría ido." },
      ],
      noToca: [{ animo: "neutro", texto: "A esta hora no se tasa. Se duerme, que es más rentable." }],
    },
    larga: {
      saluda: [
        { animo: "neutro", texto: "Has tardado. Llevo aquí desde que apagaron la última farola." },
      ],
      noToca: [{ animo: "tenso", texto: "Hoy no. Y agradécemelo, que hoy no es un regalo." }],
    },
    vigia: {
      saluda: [
        { animo: "neutro", texto: "Has subido los ciento doce escalones. Nadie los sube por casualidad." },
        { animo: "tenso", texto: "Siéntate en el borde. Se piensa mejor con los pies colgando." },
      ],
      noToca: [{ animo: "neutro", texto: "De día no subas. De día este faro es sólo un faro roto." }],
    },
    cero: {
      saluda: [
        { animo: "neutro", texto: "Adelante. La puerta lleva cuarenta años sin cerrarse por dentro." },
      ],
      noToca: [{ animo: "neutro", texto: "Vuelve de noche. Lo que hay aquí no se enseña con luz." }],
    },
  },

  en: {
    nuria: {
      saluda: [
        { animo: "decidido", texto: "You came! I've been sitting here since six, you know." },
        { animo: "neutro", texto: "Well. I thought you'd bail again today." },
      ],
      noToca: [{ animo: "neutro", texto: "Not now, Mum will kill me. Later, though? Promise me." }],
    },
    carmen: {
      saluda: [
        { animo: "neutro", texto: "Dani. Come here — you've caught me with exactly five minutes." },
        { animo: "tenso", texto: "Sit down there a second and let me look at you properly." },
      ],
      noToca: [{ animo: "neutro", texto: "My shift starts now. We'll talk at home." }],
    },
    tomas: {
      saluda: [
        { animo: "neutro", texto: "There he is. Turn the radio down and sit." },
        { animo: "neutro", texto: "I'm on the reports. You can stay if you don't talk much." },
      ],
      noToca: [{ animo: "neutro", texto: "Not now, son. There's a fault out in the Polígono." }],
    },
    isma: {
      saluda: [
        { animo: "decidido", texto: "Oi! Come here, come here, come here. Sit down. I've got things." },
        { animo: "neutro", texto: "Late for everything except this. Look at that." },
      ],
      noToca: [{ animo: "neutro", texto: "I've got class. So do you, by the way." }],
    },
    julia: {
      saluda: [
        { animo: "neutro", texto: "Don't stop next to me. Walk and we'll talk." },
        { animo: "tenso", texto: "Two minutes. And don't look at the door." },
      ],
      noToca: [{ animo: "neutro", texto: "Not now. Too many people in front of me." }],
    },
    oscar: {
      saluda: [
        { animo: "tenso", texto: "Well, well. Look who's gracing us." },
        { animo: "neutro", texto: "What? Here to talk or here to study the floor?" },
      ],
      noToca: [{ animo: "neutro", texto: "Haven't got time for you right now." }],
    },
    requena: {
      saluda: [
        { animo: "neutro", texto: "Shut the door. And the latch, if you don't mind." },
        { animo: "decidido", texto: "I was just thinking about you. Sit down, Vela." },
      ],
      noToca: [{ animo: "neutro", texto: "The lab's locked. First thing tomorrow." }],
    },
    pilar: {
      saluda: [
        { animo: "neutro", texto: "Oh, love, hang on, let me put the mop down." },
        { animo: "tenso", texto: "Come here a minute, I've got something to tell you." },
      ],
      noToca: [{ animo: "neutro", texto: "At this hour I'm past conversation." }],
    },
    yusuf: {
      saluda: [
        { animo: "decidido", texto: "Come in. And shut it, you're letting the heat out." },
        { animo: "neutro", texto: "Leave that where it is and take the stool." },
      ],
      noToca: [{ animo: "neutro", texto: "Warehouse is shut. Come back this afternoon." }],
    },
    marga: {
      saluda: [
        { animo: "tenso", texto: "Kid. You specifically. Come here a second." },
        { animo: "neutro", texto: "Hang on, I'll kill the recorder. Done. Talk." },
      ],
      noToca: [{ animo: "neutro", texto: "I'm filing. If you've got something, make it tomorrow." }],
    },
    sabater: {
      saluda: [
        { animo: "neutro", texto: "Ah, hello. What an uncoincidental coincidence." },
        { animo: "neutro", texto: "Have you a minute? It really is only a minute." },
      ],
      noToca: [{ animo: "neutro", texto: "I'm on duty. And with you I'd rather not be." }],
    },
    ezequiel: {
      saluda: [
        { animo: "decidido", texto: "Come in, come in. Nobody stands on my floor." },
        { animo: "neutro", texto: "Sit. You look like a man who slept four hours." },
      ],
      noToca: [{ animo: "neutro", texto: "I'm in board. Request an appointment like everybody else." }],
    },
    iria: {
      saluda: [
        { animo: "tenso", texto: "Not here. Come towards the stairwell, there's no camera." },
        { animo: "neutro", texto: "I've got six minutes before I'm missed." },
      ],
      noToca: [{ animo: "neutro", texto: "I can't now. I'm badged in inside the building." }],
    },
    tuerca: {
      saluda: [
        { animo: "decidido", texto: "Vela! I was about to lock the pitch. Get in here." },
        { animo: "neutro", texto: "Get changed and do a warm-up lap. We'll talk walking." },
      ],
      noToca: [{ animo: "neutro", texto: "Pitch is closed this late, mate." }],
    },
    chapa: {
      saluda: [
        { animo: "neutro", texto: "Give it here. And not on the good bench." },
        { animo: "decidido", texto: "Perfect timing. Bench free and the lamp's warm." },
      ],
      noToca: [{ animo: "neutro", texto: "Not in daylight. Nobody comes here to be seen." }],
    },
    sordo: {
      saluda: [
        { animo: "tenso", texto: "You again. Go on, hoodie off." },
        { animo: "decidido", texto: "Guard up before you talk. You talk better with your guard up." },
      ],
      noToca: [{ animo: "neutro", texto: "Not now. I'm working, whatever it looks like." }],
    },
    hierro: {
      saluda: [
        { animo: "tenso", texto: "Again. And you didn't even stop to check if anyone was here." },
      ],
      noToca: [{ animo: "tenso", texto: "I said turn around." }],
    },
    tasador: {
      saluda: [
        { animo: "neutro", texto: "Good evening. Don't run — if I wanted to leave I'd have left." },
      ],
      noToca: [{ animo: "neutro", texto: "One doesn't appraise at this hour. One sleeps. More profitable." }],
    },
    larga: {
      saluda: [
        { animo: "neutro", texto: "You took your time. I've been here since the last streetlight went." },
      ],
      noToca: [{ animo: "tenso", texto: "Not today. And be grateful — today isn't a gift." }],
    },
    vigia: {
      saluda: [
        { animo: "neutro", texto: "You climbed all hundred and twelve steps. Nobody does that by accident." },
        { animo: "tenso", texto: "Sit on the edge. You think better with your feet hanging." },
      ],
      noToca: [{ animo: "neutro", texto: "Don't come up in daylight. In daylight this is just a broken lighthouse." }],
    },
    cero: {
      saluda: [
        { animo: "neutro", texto: "Come in. That door hasn't locked from the inside in forty years." },
      ],
      noToca: [{ animo: "neutro", texto: "Come back at night. What's here isn't shown in daylight." }],
    },
  },
};

/**
 * LOS LUGARES QUE HACEN LO QUE NO HACE NADIE.
 *
 * Siete de las nueve acciones del día son una persona. Dormir y salir de ronda no tienen
 * interlocutor, así que son sitios: el portal de tu bloque y el muelle. Hablan con la voz
 * del narrador —sin retrato, sin placa— porque no hay nadie ahí; sólo tú y la decisión.
 */
const LUGARES = {
  es: {
    portal: {
      nombre: "Tu portal",
      saluda: [
        { texto: "El portal. Arriba está tu cama, y mañana empieza otra vez." },
        { texto: "Subir ahora es aceptar que hoy ya no vas a arreglar nada más." },
      ],
      noToca: [{ texto: "Subir ahora sería tirar la tarde. Todavía hay luz." }],
    },
    muelle: {
      nombre: "El muelle",
      saluda: [
        { texto: "Marés se queda callada a esta hora. Sólo el agua contra el hormigón." },
        { texto: "Si sales, sales como el otro. Y el otro deja rastro." },
      ],
      noToca: [{ texto: "De día esto es un muelle con gente cargando cajas. Nada que hacer aquí." }],
    },
  },
  en: {
    portal: {
      nombre: "Your doorway",
      saluda: [
        { texto: "The doorway. Your bed is up there, and tomorrow starts again." },
        { texto: "Going up now means accepting you'll fix nothing else today." },
      ],
      noToca: [{ texto: "Going up now would waste the afternoon. There's still light." }],
    },
    muelle: {
      nombre: "The quay",
      saluda: [
        { texto: "Marés goes quiet at this hour. Just water against concrete." },
        { texto: "If you go out, you go out as the other one. And the other one leaves traces." },
      ],
      noToca: [{ texto: "By day this is a quay with people hauling crates. Nothing to do here." }],
    },
  },
};

/**
 * Lo mismo que `encuentro`, pero para un sitio.
 *
 * Devuelve `hablante: null`, y de eso vive la caja de diálogo: sin hablante no pinta
 * retrato ni placa, y la misma caja sirve para una conversación y para un pensamiento.
 */
export function encuentroLugar(lugarId, accion, { legal = true, idioma = "es", dia = 1 } = {}) {
  const tabla = LUGARES[idioma] ?? LUGARES.es;
  const ficha = tabla[lugarId];
  if (!ficha) return { lineas: [], accion: null };
  const fuente = legal ? ficha.saluda : ficha.noToca;
  const elegida = fuente[(dia - 1) % fuente.length] ?? fuente[0];
  return {
    lineas: [{ hablante: null, nombre: ficha.nombre, animo: "neutro", texto: elegida.texto }],
    accion: legal ? accion : null,
  };
}

/**
 * Qué pasa al hablar con alguien.
 *
 * El orden importa y es el orden de una conversación de verdad:
 *
 *   1. **El saludo sitúa.** Una frase de dónde estás y de qué está haciendo el otro. Rota
 *      por día para que volver mañana no empiece igual, y sólo suena la primera vez del día.
 *   2. **La conversación avanza.** Lo que esa persona tiene que decirte EN ESTE ACTO, de
 *      `voces/`, con las tres respuestas de Dani escritas para ella.
 *   3. **Volver es volver.** A partir de la segunda visita del día, su línea de repetición y
 *      nada más: ni saludo, ni conversación, ni bloque gastado dos veces.
 *
 * Y si el calendario dice que ahora no toca, se sustituye todo por el "ahora no" de esa
 * persona y `accion` sale a null, que es lo que impide que el bloque se gaste.
 *
 * @param {string} npcId
 * @param {string} distrito
 * @param {boolean} legal  ¿permite el calendario la acción que ofrece esta persona?
 * @returns {{ lineas: object[], accion: string|null, npcId: string }}
 */
export function encuentro(npcId, distrito, {
  legal = true, idioma = "es", capitulo = 1, dia = 1, bloque = "tarde", visita = 0,
} = {}) {
  const tabla = SALUDOS[idioma] ?? SALUDOS.es;
  const ficha = tabla[npcId];
  const accion = OFRECE[distrito]?.[npcId] ?? null;
  // La placa sale de `copy.personajes`, igual que en `voces/`: un solo sitio para cada nombre.
  const nombre = getCopy(idioma).personajes?.[npcId] ?? npcId;
  const enVoz = (l) => ({ hablante: npcId, nombre, animo: l.animo ?? "neutro", texto: l.texto });

  // Hay acción que ofrecer pero el calendario dice que ahora no: lo dice él, y no se gasta.
  if (accion && !legal) {
    const noToca = ficha?.noToca ?? [];
    if (noToca.length) return { lineas: noToca.map(enVoz), accion: null, npcId };
  }

  const conversacion = buildConversation(npcId, {
    locale: idioma, chapter: capitulo, day: dia, block: bloque, visit: visita,
  }) ?? [];

  // Segunda visita del mismo día: sólo su línea de repetición, sin saludo delante.
  const saludo = visita === 0 && ficha?.saluda?.length
    ? [enVoz(ficha.saluda[(dia - 1) % ficha.saluda.length])]
    : [];

  const lineas = [...saludo, ...conversacion];
  if (!lineas.length) return { lineas: [], accion: null, npcId };

  return { lineas, accion: accion && legal ? accion : null, npcId };
}

/** Quién ofrece algo en este distrito. Lo usa la interfaz para orientar sin decir dónde ir. */
export function ofertasDe(distrito) {
  return Object.entries(OFRECE[distrito] ?? {})
    .filter(([, accion]) => accion)
    .map(([id, accion]) => ({ id, accion }));
}
