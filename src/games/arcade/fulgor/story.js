/**
 * La campaña, COMO DATOS (§14.1). Sin lógica de juego.
 *
 * Twelve chapters, each with the same cadence as a chapter of the reference: civilian
 * opening → free days → escalation → decisive Intervention → epilogue (§9). What lives here
 * is triggers, scenes, flags, what each chapter opens and what each chapter grants. What
 * does NOT live here is a single rule — `game.js` reads this table and acts on it, and that
 * separation is what makes `story.test.js` able to prove things about the campaign without
 * running it.
 *
 * FLAGS ARE THE WHOLE STRUCTURE, and they are the thing that breaks silently. A chapter
 * that reads `ismaLoSabe` before any chapter writes it does not throw: it just quietly takes
 * the wrong branch forever, and by the time anyone notices, forty scenes have been written
 * on top of it. So every chapter declares `escribe` and `lee` explicitly, and the test walks
 * the graph and refuses any read that no earlier chapter can satisfy.
 *
 * A NOTE ON `decisiva`. Some are not fights. Chapter 1's is an escape in the dark from a
 * building while the body will not answer — an inverted tutorial where the player learns to
 * move through nodes while being able to do nothing at all. `sinCombate: true` is how that
 * is said, and it matters that the shape of the ritual is the same even when the content is
 * the opposite.
 */

import { TOTAL_CHAPTERS } from "./tables.js";

/* ── Los doce capítulos ──────────────────────────────────────────────────────────── */

export const CHAPTERS = {
  1: {
    n: 1,
    clave: "c1",
    minutos: 30,
    distritoFoco: "poligono",
    abre: { distritos: ["aguas", "instituto", "concha", "poligono"], expedientes: [] },
    escenas: [
      { id: "c1_aula", bloque: "manana" },
      { id: "c1_pasillo", bloque: "manana" },
      { id: "c1_casa", bloque: "tarde" },
      { id: "c1_llave", bloque: "tarde", escribe: ["llaveEncontrada"] },
      { id: "c1_subestacion", bloque: "noche", lee: ["llaveEncontrada"] },
      { id: "c1_rayo", bloque: "noche", escribe: ["rayoRecibido"] },
    ],
    decisiva: {
      id: "huidaSubestacion",
      tipo: "decisiva",
      distrito: "poligono",
      arquetipo: "edificio",
      sinCombate: true,
      textoApertura: "c1_huida",
      testigos: [],
      // La primera pista del juego, y el jugador no puede evitarla: dejas la llave.
      pistaForzada: { tipo: "fisica", origen: "llaveAlmacen", id: "llaveAlmacen" },
    },
    otorga: { afinidades: ["rayo"] },
    epilogo: "c1_epilogo",
    escribe: ["llaveEncontrada", "rayoRecibido", "llaveDejadaEnAlmacen"],
    lee: [],
  },

  2: {
    n: 2,
    clave: "c2",
    minutos: 35,
    distritoFoco: "aguas",
    abre: { distritos: ["hospital"], expedientes: ["nuria", "isma", "pilar"] },
    escenas: [
      { id: "c2_bombilla", bloque: "manana", lee: ["rayoRecibido"] },
      { id: "c2_requena", bloque: "manana", escribe: ["requenaVioLasManos"] },
      { id: "c2_isma", bloque: "tarde", escribe: ["carpetaIsma"] },
      { id: "c2_movil", bloque: "tarde" },
      { id: "c2_hospital", bloque: "noche", lee: ["incendioResuelto"] },
    ],
    decisiva: {
      id: "incendioAguas",
      tipo: "decisiva",
      distrito: "aguas",
      arquetipo: "edificio",
      textoApertura: "c2_incendio",
      testigos: [{ id: "pilar" }],
      civilesEnRiesgo: 3,
    },
    otorga: { traje: "improvisado" },
    epilogo: "c2_epilogo",
    escribe: ["trajeImprovisado", "incendioResuelto", "requenaVioLasManos", "carpetaIsma"],
    lee: ["rayoRecibido"],
  },

  3: {
    n: 3,
    clave: "c3",
    minutos: 40,
    distritoFoco: "concha",
    abre: { distritos: ["puerto"], expedientes: ["carmen", "requena", "oscar", "yusuf"] },
    escenas: [
      { id: "c3_joyeria", bloque: "manana" },
      { id: "c3_yusuf", bloque: "tarde", escribe: ["yusufConocido"] },
      { id: "c3_camaras", bloque: "noche", lee: ["tasadorDerrotado"] },
    ],
    decisiva: {
      id: "tasadorJoyeria",
      tipo: "decisiva",
      distrito: "concha",
      arquetipo: "plaza",
      textoApertura: "c3_leccion",
      // La lección del capítulo: Materia vence a Rayo, y hay cámaras en las cuatro esquinas.
      antagonista: { id: "tasador", afinidad: "materia", tecnicas: ["yunque", "sobrecarga", "martillo"] },
      testigos: [{ id: "pilar" }, { id: "oscar" }],
      camaras: 4,
    },
    otorga: { tecnicas: ["aguanteTec"], villanos: ["tasador"], mentores: ["requena"] },
    epilogo: "c3_epilogo",
    escribe: ["puertoAbierto", "yusufConocido", "tasadorDerrotado", "leccionAfinidad"],
    lee: ["trajeImprovisado"],
  },

  4: {
    n: 4,
    clave: "c4",
    minutos: 40,
    distritoFoco: "concha",
    abre: { distritos: [], expedientes: ["julia", "tomas", "marga", "sabater"] },
    escenas: [
      { id: "c4_sabater", bloque: "manana", escribe: ["sabaterLlega"] },
      { id: "c4_panel", bloque: "tarde", escribe: ["expedientesAbiertos", "contramedidasAbiertas"] },
      { id: "c4_instituto", bloque: "tarde" },
      { id: "c4_marga", bloque: "noche", escribe: ["margaPublica"], lee: ["tasadorDerrotado"] },
    ],
    decisiva: {
      id: "atracoConcha",
      textoApertura: "c4_atraco",
      tipo: "decisiva",
      distrito: "concha",
      arquetipo: "calle",
      antagonista: { id: "cabos", afinidad: "materia", tecnicas: ["yunque"] },
      testigos: [{ id: "sabater" }, { id: "marga" }],
      rehenes: 2,
    },
    otorga: { tecnicas: ["arcoVoltaico", "jaula"], traje: "taller" },
    epilogo: "c4_epilogo",
    escribe: ["sabaterLlega", "expedientesAbiertos", "contramedidasAbiertas", "margaPublica"],
    lee: ["tasadorDerrotado", "yusufConocido"],
  },

  5: {
    n: 5,
    clave: "c5",
    minutos: 40,
    distritoFoco: "puerto",
    abre: { distritos: [], expedientes: [] },
    escenas: [
      { id: "c5_taller", bloque: "manana" },
      { id: "c5_cumple", bloque: "tarde", escribe: ["cumpleNuria"] },
      { id: "c5_aviso", bloque: "tarde", lee: ["cumpleNuria"] },
    ],
    decisiva: {
      id: "hierroGruas",
      textoApertura: "c5_gruas",
      tipo: "decisiva",
      distrito: "puerto",
      arquetipo: "muelle",
      antagonista: { id: "hierro", afinidad: "materia", tecnicas: ["yunque", "martillo", "ancla"] },
      testigos: [{ id: "yusuf" }],
      // El capítulo donde el traje se rompe por primera vez, y se rompe por el manto.
      rompeTraje: "manto",
    },
    otorga: { tecnicas: ["punoTormenta", "relampago", "truenoSeco", "ancla"], villanos: ["hierro"] },
    epilogo: "c5_epilogo",
    escribe: ["hierroDerrotado", "trajeRoto", "cumpleNuria"],
    lee: ["margaPublica", "expedientesAbiertos"],
  },

  6: {
    n: 6,
    clave: "c6",
    minutos: 40,
    distritoFoco: "faro",
    abre: { distritos: ["faro"], expedientes: [] },
    escenas: [
      { id: "c6_seguido", bloque: "noche", lee: ["trajeRoto"] },
      { id: "c6_vigia", bloque: "noche", escribe: ["vigiaConocida"] },
    ],
    decisiva: {
      id: "dosALaVez",
      textoApertura: "c6_dos",
      tipo: "decisiva",
      distrito: "concha",
      arquetipo: "calle",
      // El capítulo donde el juego deja de perdonar: dos a la vez y sólo puedes ir a una.
      simultanea: { distrito: "aguas", arquetipo: "edificio" },
      testigos: [{ id: "marga" }, { id: "sabater" }],
    },
    otorga: {
      afinidades: ["luz"],
      traje: "aislado",
      mentores: ["vigia"],
      tecnicas: ["destello", "espejismo", "estela", "prisma", "aurora", "alba", "chispaFria", "cupula", "presagio"],
    },
    epilogo: "c6_epilogo",
    escribe: ["vigiaConocida", "afinidadLuz", "dosIntervenciones", "unaSeQuedoSinTi"],
    lee: ["trajeRoto", "hierroDerrotado"],
  },

  7: {
    n: 7,
    clave: "c7",
    minutos: 40,
    distritoFoco: "concha",
    abre: { distritos: ["financiero"], expedientes: ["ezequiel"] },
    escenas: [
      { id: "c7_trato", bloque: "tarde", escribe: ["tratoMarga"], lee: ["margaPublica"] },
      { id: "c7_nombre", bloque: "tarde", escribe: ["heroeNombrado"] },
      { id: "c7_ciudad", bloque: "tarde" },
      { id: "c7_chinchetas", bloque: "noche", lee: ["sabaterLlega"] },
    ],
    decisiva: {
      id: "conPublico",
      textoApertura: "c7_publico",
      tipo: "decisiva",
      distrito: "concha",
      arquetipo: "plaza",
      // Ganar es fácil. Ganar sin salir en cuarenta vídeos, no.
      multitudGrabando: true,
      testigos: [{ id: "marga" }, { id: "sabater" }, { id: "julia" }, { id: "oscar" }],
    },
    otorga: { tecnicas: [] },
    epilogo: "c7_epilogo",
    escribe: ["tratoMarga", "heroeNombrado", "prensaAbierta"],
    lee: ["margaPublica", "sabaterLlega", "afinidadLuz"],
  },

  8: {
    n: 8,
    clave: "c8",
    minutos: 45,
    distritoFoco: "instituto",
    abre: { distritos: [], expedientes: [] },
    escenas: [
      // Guionizado: Isma completa su expediente pase lo que pase. La variable es CÓMO.
      { id: "c8_carpeta", bloque: "manana" },
      { id: "c8_azotea", bloque: "tarde", escribe: ["ismaLoSabe"], lee: ["carpetaIsma"] },
    ],
    decisiva: {
      id: "largaPrimera",
      textoApertura: "c8_larga",
      tipo: "decisiva",
      distrito: "instituto",
      arquetipo: "azotea",
      antagonista: { id: "larga", afinidad: "sombra", tecnicas: ["cortina", "vaho", "sombraLarga", "eco"] },
      // Primera derrota obligatoria: se lleva algo del laboratorio y te deja tirado.
      derrotaGuionizada: true,
      testigos: [],
    },
    otorga: { cierraExpediente: "isma" },
    epilogo: "c8_epilogo",
    escribe: ["ismaLoSabe", "largaPrimera", "laboratorioRobado"],
    lee: ["carpetaIsma", "heroeNombrado"],
  },

  9: {
    n: 9,
    clave: "c9",
    minutos: 45,
    distritoFoco: "financiero",
    abre: { distritos: [], expedientes: ["iria"] },
    escenas: [
      { id: "c9_julia", bloque: "tarde", lee: ["largaPrimera"] },
      { id: "c9_iria", bloque: "tarde", escribe: ["iriaFuente"] },
      { id: "c9_firma", bloque: "noche", escribe: ["firmaPadre"] },
    ],
    decisiva: {
      id: "salirDeLaTorre",
      textoApertura: "c9_torre",
      tipo: "decisiva",
      distrito: "financiero",
      arquetipo: "torre",
      // Puro sigilo con reloj: la Intervención con más peso de Sentido y Sombra del juego.
      sigilo: true,
      testigos: [{ id: "ezequiel" }, { id: "sabater" }],
    },
    otorga: {
      afinidades: ["materia"],
      traje: "conductor",
      tecnicas: ["yunque", "sobrecarga", "malla", "reflejo", "rastro", "cortocircuito", "martillo", "tierra"],
    },
    epilogo: "c9_epilogo",
    escribe: ["torreInfiltrada", "firmaPadre", "afinidadMateria", "iriaFuente"],
    lee: ["largaPrimera", "ismaLoSabe"],
  },

  10: {
    n: 10,
    clave: "c10",
    minutos: 45,
    distritoFoco: "hospital",
    abre: { distritos: ["tolvas"], expedientes: [] },
    escenas: [
      { id: "c10_aviso", bloque: "noche" },
      { id: "c10_apagon", bloque: "noche", escribe: ["apagon"], lee: ["firmaPadre"] },
      { id: "c10_calle", bloque: "noche" },
    ],
    decisiva: {
      id: "quirofano",
      textoApertura: "c10_quirofano",
      tipo: "decisiva",
      distrito: "hospital",
      arquetipo: "edificio",
      antagonista: { id: "larga", afinidad: "sombra", tecnicas: ["cortina", "sombraLarga", "eco", "vaho"] },
      // La secuencia insignia: mantener con vida el quirófano donde opera tu madre.
      emergenciasSimultaneas: 6,
      atendiblesComoMucho: 3,
      testigos: [{ id: "carmen" }],
    },
    otorga: {},
    epilogo: "c10_epilogo",
    escribe: ["apagon", "quirofanoSalvado", "tolvasAbiertas"],
    lee: ["firmaPadre", "torreInfiltrada"],
  },

  11: {
    n: 11,
    clave: "c11",
    minutos: 40,
    distritoFoco: "tolvas",
    abre: { distritos: [], expedientes: [] },
    escenas: [
      { id: "c11_cofre", bloque: "tarde", escribe: ["ceroConocido"], lee: ["tolvasAbiertas"] },
      { id: "c11_cuatro", bloque: "tarde" },
      { id: "c11_larga", bloque: "tarde", escribe: ["largaRevelada"], lee: ["largaPrimera"] },
      { id: "c11_chantaje", bloque: "noche", escribe: ["chantajeSese"] },
    ],
    decisiva: {
      id: "carreraContramedidas",
      textoApertura: "c11_carrera",
      tipo: "decisiva",
      distrito: "tolvas",
      arquetipo: "ruina",
      // No es un combate: es una carrera por vaciar el expediente de Sabater antes de que
      // se cierre, con el reloj de la campaña encima.
      carreraDeContramedidas: true,
      objetivoExpediente: "sabater",
      testigos: [{ id: "sabater" }],
    },
    otorga: {
      afinidades: ["sombra"],
      traje: "fulgor",
      tecnicas: ["vaho", "fuga", "cortina", "anticipo", "silencio", "eco", "sombraLarga", "escucha"],
      villanos: ["larga"],
    },
    epilogo: "c11_epilogo",
    escribe: ["ceroConocido", "afinidadSombra", "largaRevelada", "chantajeSese"],
    lee: ["tolvasAbiertas", "largaPrimera", "apagon"],
  },

  12: {
    n: 12,
    clave: "c12",
    minutos: 40,
    distritoFoco: "poligono",
    abre: { distritos: [], expedientes: [] },
    escenas: [
      { id: "c12_central", bloque: "manana", escribe: ["centralActivada"], lee: ["chantajeSese"] },
      { id: "c12_reparto", bloque: "manana" },
      // La última pregunta, y el juego te deja elegir de verdad.
      {
        id: "c12_mascara",
        bloque: "noche",
        eleccion: ["desenmascaradoVoluntario", "relevoAceptado", "seguirEnmascarado"],
        escribe: ["desenmascaradoVoluntario", "relevoAceptado", "seguirEnmascarado"],
      },
    ],
    decisiva: {
      id: "laCentral",
      textoApertura: "c12_fases",
      tipo: "decisiva",
      distrito: "poligono",
      arquetipo: "ruina",
      fases: 2,
      antagonista: { id: "larga", afinidad: "sombra", tecnicas: ["sombraLarga", "cortina", "eco", "descargaCero"] },
      testigos: [{ id: "sabater" }, { id: "marga" }],
    },
    otorga: { tecnicas: ["fulgor", "descargaCero"], villanos: ["cero"] },
    epilogo: "c12_epilogo",
    escribe: ["centralActivada", "desenmascaradoVoluntario", "relevoAceptado", "seguirEnmascarado"],
    lee: ["chantajeSese", "afinidadSombra", "largaRevelada"],
  },
};

export const CHAPTER_LIST = Object.values(CHAPTERS).sort((a, b) => a.n - b.n);

/* ── Consultas ───────────────────────────────────────────────────────────────────── */

export function chapter(n) {
  return CHAPTERS[n] ?? null;
}

export function nextChapterNumber(n) {
  return n >= TOTAL_CHAPTERS ? null : n + 1;
}

/** Everything the campaign has written by the end of chapter `n`. */
export function flagsWrittenBy(n) {
  const set = new Set();
  for (const c of CHAPTER_LIST) {
    if (c.n > n) break;
    for (const f of c.escribe) set.add(f);
    for (const e of c.escenas) for (const f of e.escribe ?? []) set.add(f);
  }
  return set;
}

/** Which affinities, techniques, suits and mentors a chapter hands over (§5.3, §6.3). */
export function grantsUpTo(n) {
  const out = { afinidades: [], tecnicas: [], mentores: [], villanos: [], traje: null };
  for (const c of CHAPTER_LIST) {
    if (c.n > n) break;
    const g = c.otorga ?? {};
    for (const a of g.afinidades ?? []) if (!out.afinidades.includes(a)) out.afinidades.push(a);
    for (const t of g.tecnicas ?? []) if (!out.tecnicas.includes(t)) out.tecnicas.push(t);
    for (const m of g.mentores ?? []) if (!out.mentores.includes(m)) out.mentores.push(m);
    for (const v of g.villanos ?? []) if (!out.villanos.includes(v)) out.villanos.push(v);
    if (g.traje) out.traje = g.traje;
  }
  return out;
}

/** The scenes due in this block, in order. */
export function scenesFor(n, bloque, banderas = new Set()) {
  const c = chapter(n);
  if (!c) return [];
  return c.escenas.filter((e) => {
    if (e.bloque && e.bloque !== bloque) return false;
    return (e.lee ?? []).every((f) => banderas.has(f));
  });
}

/* ── Los siete finales (§9.1) ────────────────────────────────────────────────────── */

/**
 * Determined by the state of the dossiers, the standing and the chapter 11-12 decisions.
 * They are NOT ordered and none is labelled good or bad (§17) — the list order here is the
 * document's, and `game.js` picks the first whose condition holds, so the sequence is a
 * specificity ordering and never a ranking.
 */
export const ENDING_ORDER = [
  // Desenmascarado va primero: si Sabater cerró el expediente Y además se falló la central,
  // el hecho grande es que la ciudad tiene un nombre, no que se quedara a oscuras.
  "desenmascarado",
  "ciudadAOscuras",
  "aCaraDescubierta",
  "elRelevo",
  "losDos",
  "laVigia",
  "secretoIntacto",
];

/**
 * Every ending's condition as a predicate over one summary object, so that
 * `story.test.js` can construct a state for each and prove it is reachable — a claim the
 * design makes in §9.1 and that nothing else would ever check.
 */
export const ENDING_CONDITIONS = {
  desenmascarado: (s) => s.sabaterCerrado === true,
  // §9.1 lo dice literalmente: «Fallaste el capítulo 12». Un fracaso en el 7 no es este
  // final — es una noche mala, y la campaña sigue. Sin la comprobación de capítulo, una
  // ruina en el 11 se llevaba por delante el epílogo que le tocaba.
  ciudadAOscuras: (s) => s.capitulo >= TOTAL_CHAPTERS && s.resultadoFinal === "fallido",
  aCaraDescubierta: (s) => s.banderas.has("desenmascaradoVoluntario"),
  elRelevo: (s) => s.banderas.has("relevoAceptado"),
  losDos: (s) => s.confidentes >= 4,
  laVigia: (s) => s.confidentes === 0 && s.vinculoMaximo <= 1,
  secretoIntacto: () => true,
};

export function resolveEnding(resumen) {
  for (const id of ENDING_ORDER) {
    if (ENDING_CONDITIONS[id](resumen)) return id;
  }
  return "secretoIntacto";
}

/** The shape `resolveEnding` expects, with everything at its most neutral. */
export function blankEndingSummary(over = {}) {
  return {
    capitulo: TOTAL_CHAPTERS,
    resultadoFinal: "limpio",
    sabaterCerrado: false,
    confidentes: 1,
    vinculoMaximo: 3,
    rango: 8,
    banderas: new Set(),
    ...over,
  };
}
