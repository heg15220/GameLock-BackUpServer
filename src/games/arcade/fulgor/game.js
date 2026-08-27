/**
 * La máquina de fases (§14.1). PURE — un reductor y nada más.
 *
 *   CAPITULO → BLOQUE → ESCENA → INTERVENCION → DUELO → BALANCE → BLOQUE → … → EPILOGO
 *
 * Every rule the game has lives in one of the seven pure modules; this file's whole job is
 * to know WHICH ONE TO ASK and in what order, and to be the only place where their answers
 * meet. That is why it is a reducer: `(state, action) => state`, no timers, no React, no
 * randomness of its own — every draw comes from a stream keyed off the campaign seed, so
 * `balance.test.js` can run a thousand campaigns through this same function.
 *
 * THE ONE PLACE THE PILLARS TOUCH is `applyExposure`. An action happens in a duel; `duel.js`
 * reports what it cost and how visible it was; `intervention.js` says who could see it from
 * where; `suit.js` says whether it shed anything; and `suspicion.js` decides what each
 * witness actually files. Four modules, one join, and the join is written once here rather
 * than being re-derived at each call site — because the day someone forgets to run the suit's
 * fragment roll, the game stops being about the thing it is about.
 */

import { createStream } from "./rng.js";
import {
  DIFFICULTY_MODES,
  DEFAULT_DIFFICULTY,
  DISTRICTS,
  DOSSIERS,
  RESULT_RULES,
  TOTAL_CHAPTERS,
  resolveDifficulty,
} from "./tables.js";
import * as suspicion from "./suspicion.js";
import * as duel from "./duel.js";
import * as intervention from "./intervention.js";
import * as suit from "./suit.js";
import * as bonds from "./bonds.js";
import * as calendar from "./calendar.js";
import * as progress from "./progress.js";
import { CHAPTERS, grantsUpTo, resolveEnding, scenesFor } from "./story.js";

export const PHASES = {
  TITULO: "titulo",
  CAPITULO: "capitulo",
  BLOQUE: "bloque",
  ESCENA: "escena",
  EMERGENCIA: "emergencia",
  INTERVENCION: "intervencion",
  DUELO: "duelo",
  BALANCE: "balance",
  EPILOGO: "epilogo",
};

/* ── Estado inicial ──────────────────────────────────────────────────────────────── */

export function createGame({ semilla = "fulgor", dificultad = DEFAULT_DIFFICULTY, idioma = "es" } = {}) {
  return {
    fase: PHASES.TITULO,
    semilla,
    idioma,
    dificultad: DIFFICULTY_MODES.includes(dificultad) ? dificultad : DEFAULT_DIFFICULTY,
    capitulo: 1,
    calendario: calendar.createCalendar(1),
    progreso: progress.createProgress(),
    sospecha: suspicion.createSuspicion({ capitulo: 1 }),
    vinculos: bonds.createBonds(),
    traje: null,
    banderas: new Set(),
    mentores: [],
    villanos: [],
    escenasVistas: [],
    escenario: null,
    duelo: null,
    balance: null,
    emergencia: null,
    final: null,
    tirada: 0,
    log: [],
  };
}

/** The resolved difficulty row. No pure module below ever sees the mode's name (§10.5). */
export function dif(state) {
  return resolveDifficulty(state.dificultad);
}

/**
 * A fresh stream per event, keyed by the campaign seed and a description of the moment.
 * `tirada` advances so that two identical-looking events in the same block are still
 * independent draws — without it, patrolling twice on the same night would produce the same
 * skirmish twice.
 */
function stream(state, ...partes) {
  return createStream(state.semilla, ...partes.map(String), String(state.tirada));
}

const bump = (state) => ({ ...state, tirada: state.tirada + 1 });

/* ── El motivo por el que estos siete módulos son un juego ───────────────────────── */

/**
 * One action, resolved against the whole cast (§3.2).
 *
 * This is the join. Read it as four questions asked in order:
 *
 *   1. WHAT DID IT LOOK LIKE?      `visibilidad` came out of `duel.js`, already carrying the
 *                                  Composure penalty, so being tired is already priced in.
 *   2. WHO COULD SEE IT?           `intervention.exposureAt` turns the scenario's geometry
 *                                  into a proximity per witness. A witness three nodes away
 *                                  is not a witness.
 *   3. DID THE SUIT SHED ANYTHING? `suit.fragmentRoll` may leave a NAMED, LOCATED Física clue
 *                                  — the thing that turns a bad night into next chapter's
 *                                  recovery objective.
 *   4. WHAT DOES EACH PERSON FILE? `suspicion.applyAction`, which refuses any clue type the
 *                                  witness cannot perceive, and turns a near miss into
 *                                  attention rather than evidence.
 */
export function applyExposure(state, reporte, { escenario = null, nodoId = null, tipos = null } = {}) {
  const escena = escenario ?? state.escenario;
  const nodo = nodoId ?? escena?.posicion ?? null;
  const contexto = {
    distrito: escena?.distrito ?? CHAPTERS[state.capitulo]?.distritoFoco,
    hora: calendar.currentBlock(state.calendario),
    clima: "despejado",
  };

  const exposicion = escena && nodo ? intervention.exposureAt(escena, nodo, reporte.visibilidad) : null;
  const testigos = (escena?.testigos ?? []).map((t) => ({
    id: t.id,
    proximidad: exposicion?.proximidades?.[t.id] ?? 1,
    vinculo: bonds.bondOf(state.vinculos, t.id),
  }));

  const accion = {
    id: `${reporte.accionId}:c${state.capitulo}:t${state.tirada}`,
    origen: reporte.origen ?? "descargaIncendio",
    visibilidad: reporte.visibilidad,
    ocultacion: suit.suitStats(state.traje ?? suit.createSuit("improvisado")).ocultacion,
    tipos: tipos ?? tiposDe(reporte, contexto.distrito),
    pistaGarantizada: reporte.pistaGarantizada,
  };

  let next = bump(state);
  const salida = suspicion.applyAction(next.sospecha, accion, testigos, {
    next: stream(next, "pista", reporte.accionId),
    dif: dif(next),
    contexto,
    capitulo: next.capitulo,
    dia: next.calendario.dia,
  });
  next = { ...next, sospecha: salida.state };

  // El traje puede soltar un trozo, y ese trozo tiene nombre y sitio (§6.2).
  const fragmentos = next.traje
    ? suit.fragmentRoll(stream(next, "fragmento", reporte.accionId), next.traje, { nodoId: nodo, capitulo: next.capitulo })
    : [];
  for (const f of fragmentos) {
    for (const t of testigos) {
      next = { ...next, sospecha: suspicion.addClue(next.sospecha, t.id, f, { vinculo: t.vinculo }) };
    }
  }

  return { state: next, generadas: salida.generadas, sustos: salida.sustos, fragmentos };
}

/**
 * Which kinds of trace an action is even capable of leaving.
 *
 * THE FIRST VERSION OF THIS TIED DIGITAL TO VISIBILITY, and that was wrong twice over. A
 * camera is a property of the PLACE, not of how loud you were — §3.3 makes district camera
 * density its own multiplier and §7.3 gives La Concha "cámaras por todas partes" as its
 * defining trait. With Digital gated behind visibility 2, Sabater — whose biases are
 * Digital, Temporal and Física — could not receive anything at all from a careful player,
 * so the inspector who is supposed to be the campaign's clock never moved.
 *
 * Now the district decides whether there is a lens, the action decides whether there was
 * anything to film, and `suspicion.js` decides who can read what. Which is the division of
 * labour the design describes.
 */
function tiposDe(reporte, distrito) {
  if (reporte.visibilidad <= 0) return [];
  const tipos = ["testimonial"];
  // Donde hay cámara, hay archivo. El Puerto Viejo (0.7) casi nunca; La Concha (1.4) casi siempre.
  if ((DISTRICTS[distrito]?.camara ?? 1) >= 0.9) tipos.push("digital");
  // Un tropiezo, o un traje que se está deshaciendo, dejan algo en el suelo.
  if (reporte.torpe || reporte.visibilidad >= 3) tipos.push("fisica");
  return tipos;
}

/* ── Capítulo ────────────────────────────────────────────────────────────────────── */

/**
 * Opening a chapter is where the story table becomes state: districts open, dossiers open,
 * affinities and techniques arrive, and the suit moves a generation. All of it read from
 * `story.js`, none of it written here.
 */
export function openChapter(state, n = state.capitulo) {
  const cap = CHAPTERS[n];
  if (!cap) return state;
  let next = { ...state, capitulo: n, fase: PHASES.CAPITULO, calendario: calendar.createCalendar(n) };

  for (const id of cap.abre?.expedientes ?? []) {
    next = { ...next, sospecha: suspicion.openDossier(next.sospecha, id) };
  }

  const otorgado = grantsUpTo(n);
  let prog = next.progreso;
  for (const a of otorgado.afinidades) prog = progress.learnAffinity(prog, a);
  for (const t of otorgado.tecnicas) {
    if (progress.isUnlocked(t, { prog, capitulo: n, mentores: otorgado.mentores, villanos: otorgado.villanos })) {
      prog = progress.learn(prog, t);
    }
  }

  // Aprender no es llevar equipado, pero una ranura vacía no es una decisión: se rellena.
  prog = progress.autoEquip(prog);

  const traje = otorgado.traje && (!next.traje || suit.generationIndex(otorgado.traje) > suit.generationIndex(next.traje.generacion))
    ? suit.createSuit(otorgado.traje)
    : next.traje;

  next = {
    ...next,
    progreso: prog,
    traje,
    mentores: otorgado.mentores,
    villanos: otorgado.villanos,
    vinculos: bonds.rollChapter(next.vinculos),
    log: [...next.log, { tipo: "capitulo", n }],
  };

  /**
   * El cierre guionizado (§9, capítulo 8). "Isma completa su expediente pase lo que pase —
   * está guionizado, y la única variable es CÓMO". Es el punto medio obligatorio de la
   * campaña, y sin esta línea no ocurría nunca: la escena estaba escrita, la bandera estaba
   * puesta y el expediente seguía abierto, así que Isma no llegaba a ser confidente y el
   * final "Los dos" —que pide cuatro— quedaba fuera de alcance en toda partida.
   */
  const guionizado = cap.otorga?.cierraExpediente;
  if (guionizado && next.sospecha.abiertos[guionizado]) {
    next = {
      ...next,
      sospecha: suspicion.closeDossier(next.sospecha, guionizado, DOSSIERS[guionizado].desenlace, n),
      log: [...next.log, { tipo: "expediente", id: guionizado, desenlace: DOSSIERS[guionizado].desenlace, capitulo: n, guionizado: true }],
    };
  }

  return next;
}

/**
 * Del cartel de capítulo al primer bloque del día.
 *
 * NO GASTA NADA, y el que no gaste es justo el arreglo. Antes, el botón «Siguiente» del
 * cartel despachaba directamente un bloque de «obligacion», con lo que el capítulo empezaba
 * con la mañana ya consumida y el calendario en la tarde. Con las escenas de guion enganchadas
 * eso se volvió destructivo: `pendingScenes` filtra por el bloque en curso, así que las
 * escenas de mañana de los doce capítulos —la clase de Requena, el pasillo con Isma— se
 * saltaban enteras sin que nadie se enterase. Aquí sólo se levanta el telón.
 */
export function enterBlock(state) {
  return state.fase === PHASES.CAPITULO ? { ...state, fase: PHASES.BLOQUE } : state;
}

/* ── Bloques ─────────────────────────────────────────────────────────────────────── */

/**
 * One block spent. Everything the design says a block costs is charged here, in one place:
 * the bond it moves, the stat it raises, the clue it lifts, the fatigue it accrues — and,
 * at the end of every day, the decay that quietly forgives attention and never forgives
 * evidence.
 */
export function spendBlock(state, accion, opciones = {}) {
  const cal = calendar.spendBlock(state.calendario, accion, opciones);
  if (!cal) return { state, error: "bloqueIlegal" };

  let next = bump({ ...state, calendario: cal });
  const d = dif(next);

  switch (accion) {
    case "quedar":
      if (opciones.objetivo) next = { ...next, vinculos: bonds.spendTimeWith(next.vinculos, opciones.objetivo) };
      break;
    case "obligacion":
      next = { ...next, vinculos: bonds.keepObligation(next.vinculos, opciones.con ?? ["requena", "carmen"]) };
      break;
    case "entrenar": {
      const prog = progress.trainAt(next.progreso, opciones.distrito);
      if (prog) next = { ...next, progreso: prog };
      break;
    }
    case "trabajar":
      next = { ...next, progreso: progress.gainMoney(next.progreso, 25) };
      break;
    case "descansar":
      next = { ...next, sospecha: suspicion.decay(next.sospecha, 1, { dif: d }) };
      break;
    case "contramedidas":
      next = applyCountermeasure(next, opciones).state;
      break;
    case "patrullar":
      return { state: { ...next, fase: PHASES.INTERVENCION, escenario: buildSkirmish(next) }, error: null };
    default:
      break;
  }

  // El día que termina cobra su decaimiento: las pistas no, el interés sí (§3.4).
  if (cal.dia !== state.calendario.dia) {
    next = { ...next, sospecha: suspicion.decay(next.sospecha, 1, { dif: d }) };
  }

  if (calendar.isChapterOver(next.calendario)) {
    return { state: { ...next, fase: PHASES.INTERVENCION, escenario: buildDecisive(next) }, error: null };
  }
  return { state: { ...next, fase: PHASES.BLOQUE }, error: null };
}

/**
 * Contramedidas (§7.2). On Sin máscara it fails a quarter of the time AND still costs the
 * block, which is the difficulty axis working exactly as §10 intends: the block is gone
 * either way, and what changed is how much the city forgives.
 */
export function applyCountermeasure(state, { expediente, pista } = {}) {
  const d = dif(state);
  let next = bump(state);
  if (d.contramedidaFalloP > 0 && stream(next, "contramedida", expediente)() < d.contramedidaFalloP) {
    return { state: { ...next, log: [...next.log, { tipo: "contramedidaFallida", expediente }] }, retiradas: [] };
  }

  const retiradas = [];
  let sospechaActual = next.sospecha;
  const candidatas = pista
    ? [pista]
    : suspicion.removableClues(sospechaActual, expediente).slice(0, d.contramedidasPorBloque).map((p) => p.id);

  for (const id of candidatas.slice(0, d.contramedidasPorBloque)) {
    const salida = suspicion.removeClue(sospechaActual, expediente, id);
    if (salida.retirada) {
      sospechaActual = salida.state;
      retiradas.push(salida.retirada);
    }
  }
  return { state: { ...next, sospecha: sospechaActual }, retiradas };
}

/* ── Escenarios ──────────────────────────────────────────────────────────────────── */

function witnessesFor(state, lista = []) {
  return lista.filter((t) => state.sospecha.abiertos[t.id]);
}

/**
 * A skirmish off a night's patrol (§4.3). Witnesses are whoever is currently fixated: on
 * Sin máscara an obsessive character follows you into the scenario as a moving witness,
 * which is the single nastiest thing that difficulty row does.
 */
export function buildSkirmish(state) {
  const d = dif(state);
  const obsesivos = d.testigoMovilObsesivo
    ? Object.values(state.sospecha.abiertos).filter((x) => x.estado === "obsesivo").map((x) => ({ id: x.id }))
    : [];
  const distritos = calendar.openDistricts(state.capitulo);
  const next = stream(state, "escaramuza", state.calendario.dia);
  return intervention.createScenario(next, {
    tipo: "escaramuza",
    distrito: distritos[Math.floor(next() * distritos.length)],
    capitulo: state.capitulo,
    testigos: witnessesFor(state, obsesivos),
    dif: d,
  });
}

/** The chapter's decisive Intervention, built from the story table (§4.4). */
export function buildDecisive(state) {
  const cap = CHAPTERS[state.capitulo];
  const d = dif(state);
  const obsesivos = d.testigoMovilObsesivo
    ? Object.values(state.sospecha.abiertos).filter((x) => x.estado === "obsesivo").map((x) => ({ id: x.id }))
    : [];
  const escenario = intervention.createScenario(stream(state, "decisiva", state.capitulo), {
    tipo: "decisiva",
    distrito: cap.decisiva.distrito,
    arquetipo: cap.decisiva.arquetipo,
    capitulo: state.capitulo,
    testigos: witnessesFor(state, [...(cap.decisiva.testigos ?? []), ...obsesivos]),
    dif: d,
  });
  return { ...escenario, guion: cap.decisiva };
}

/* ── Movimiento ──────────────────────────────────────────────────────────────────── */

export function move(state, destino) {
  if (!state.escenario) return { state, error: "sinEscenario" };
  const stats = progress.effectiveStats(state.progreso, suit.suitStats(state.traje ?? undefined));
  const salida = intervention.moveTo(state.escenario, destino, { velocidad: stats.velocidad, dif: dif(state) });
  if (!salida) return { state, error: "rutaImposible" };

  const nodo = salida.scenario.nodos.find((n) => n.id === destino);
  const hayDuelo = !!nodo?.adversario;
  return {
    state: {
      ...bump(state),
      escenario: salida.scenario,
      fase: hayDuelo ? PHASES.DUELO : PHASES.INTERVENCION,
      duelo: hayDuelo ? openDuel(state, nodo) : null,
    },
    ruta: salida.ruta,
    error: null,
  };
}

function openDuel(state, nodo) {
  const stats = progress.effectiveStats(state.progreso, suit.suitStats(state.traje ?? undefined));
  const trajeStats = suit.suitStats(state.traje ?? suit.createSuit("improvisado"));
  return {
    nodo: nodo.id,
    heroe: {
      id: "dani",
      stats,
      carga: state.duelo?.heroe?.carga ?? duel.maxCarga(stats, trajeStats.cargaMax),
      compostura: state.duelo?.heroe?.compostura ?? duel.maxCompostura(stats),
      afinidad: state.progreso.afinidades[state.progreso.afinidades.length - 1],
      equipadas: state.progreso.equipadas,
      bonoCargaTraje: trajeStats.cargaMax,
    },
    rival: rivalFor(state, nodo),
    turno: 0,
  };
}

function rivalFor(state, nodo) {
  const guion = state.escenario?.guion?.antagonista;
  const nivel = nodo.adversario?.nivel ?? state.capitulo;
  const base = { potencia: 10 + nivel * 2, cuerpo: 10 + nivel * 2, control: 8 + nivel, guardia: 9 + nivel * 2, velocidad: 9 + nivel, aguante: 10 + nivel, temple: 10 + nivel };
  if (guion) {
    return { id: guion.id, stats: base, carga: 60, compostura: 100, afinidad: guion.afinidad, tecnicas: guion.tecnicas };
  }
  return { id: "cabo", stats: base, carga: 30, compostura: 80, afinidad: "materia", tecnicas: ["yunque"] };
}

/* ── Duelo ───────────────────────────────────────────────────────────────────────── */

/**
 * One exchange, and everything it costs. Note the order: the hero acts, exposure is filed,
 * the suit wears, THEN the rival answers. Filing the exposure before the rival's turn is
 * what makes "I won but Sabater saw it" a thing that happens inside a single beat rather
 * than a summary at the end.
 */
export function duelAction(state, accionId) {
  if (!state.duelo) return { state, error: "sinDuelo" };
  const nodo = state.escenario?.nodos.find((n) => n.id === state.duelo.nodo) ?? null;
  const accion = duel.describeAction(accionId, { nodo });
  if (!accion) return { state, error: "accionDesconocida" };
  if (accion.carga > state.duelo.heroe.carga) return { state, error: "sinCarga" };

  const d = dif(state);
  const salida = duel.resolveAction(stream(state, "duelo", accionId), {
    accion,
    atacante: state.duelo.heroe,
    defensor: state.duelo.rival,
    nodo,
    dif: d,
  });

  let next = { ...bump(state), duelo: { ...state.duelo, heroe: salida.heroe, rival: salida.rival, turno: state.duelo.turno + 1 } };

  // La exposición se archiva aquí y no al final: "he ganado, y Sabater lo ha visto" tiene
  // que ser un mismo latido y no un resumen.
  const exposicion = applyExposure(next, salida.reporte, { escenario: next.escenario, nodoId: next.duelo.nodo });
  next = exposicion.state;
  next = { ...next, duelo: { ...next.duelo, heroe: salida.heroe, rival: salida.rival } };

  if (next.traje) {
    next = { ...next, traje: suit.wear(next.traje, { duelos: 1, guardia: next.duelo.heroe.stats.guardia }) };
  }

  if (salida.reporte.resuelto) {
    return { state: closeDuel(next, salida.reporte), reporte: salida.reporte, exposicion, error: null };
  }

  // El rival responde con su bucle, que es legible a propósito: Lectura promete enseñarlo.
  const intencion = duel.rivalIntent(next.duelo.rival, next.duelo.heroe, { nodo, dif: d });
  const respuesta = duel.resolveAction(stream(next, "duelo", "rival"), {
    accion: intencion,
    atacante: next.duelo.rival,
    defensor: next.duelo.heroe,
    nodo,
    dif: d,
  });
  next = bump({
    ...next,
    duelo: {
      ...next.duelo,
      rival: duel.tick(respuesta.heroe, { dif: d }),
      heroe: duel.tick(respuesta.rival ?? next.duelo.heroe, { dif: d, techo: duel.maxCarga(next.duelo.heroe.stats, next.duelo.heroe.bonoCargaTraje) }),
    },
  });

  if (duel.hasFallen(next.duelo.heroe.compostura)) {
    return { state: settleIntervention(next, { caido: true }), reporte: salida.reporte, exposicion, error: null };
  }
  return { state: next, reporte: salida.reporte, respuesta: respuesta.reporte, exposicion, error: null };
}

function closeDuel(state, reporte) {
  const nodo = state.escenario.nodos.find((n) => n.id === state.duelo.nodo);
  const escenario = {
    ...state.escenario,
    nodos: state.escenario.nodos.map((n) => (n.id === nodo.id ? { ...n, adversario: null } : n)),
  };
  const xp = progress.duelXp({
    nivelRival: state.capitulo,
    contenido: reporte.resuelto === "contenido",
    decisiva: state.escenario.tipo === "decisiva",
  });
  const objetivo = escenario.objetivos.find((o) => o.nodo === nodo.id && !o.cumplido);
  return {
    ...state,
    escenario: objetivo ? intervention.completeObjective(escenario, objetivo.id) : escenario,
    progreso: progress.gainXp(state.progreso, xp),
    duelo: null,
    fase: PHASES.INTERVENCION,
  };
}

/* ── Cierre de la Intervención ───────────────────────────────────────────────────── */

/**
 * The final balance (§4.5), and the two things that follow from it: standing moves, and
 * standing is charged to Sabater. Keeping that payment here rather than in `progress.js` is
 * what stops rank from ever reading as a score — it is a debt, and this is where it is
 * entered.
 */
export function settleIntervention(state, { caido = false } = {}) {
  const escenario = state.escenario;
  if (!escenario) return state;
  const d = dif(state);

  const pistas = contarPistasDeEstaIntervencion(state);
  const balance = intervention.settle(escenario, { pistasGeneradas: pistas, caido, dif: d });

  let next = bump({ ...state, balance, fase: PHASES.BALANCE, duelo: null });
  next = { ...next, progreso: progress.adjustRank(next.progreso, balance.rango) };
  if (balance.rango > 0) next = { ...next, sospecha: suspicion.applyRank(next.sospecha, balance.rango) };
  if (balance.grado === "sucio") {
    next = { ...next, sospecha: suspicion.applyDirtyResult(next.sospecha, balance.testigosPresentes) };
  }
  next = {
    ...next,
    progreso: progress.gainMaterials(next.progreso, materialesDe(next), RESULT_RULES[balance.grado].materiales),
  };

  /**
   * Las manos quemadas (§3.2, §6.1).
   *
   * Los buenos conductores se calientan, y una pista Íntima no se deja en el escenario: se
   * lleva puesta a casa. Por eso se tira aquí, al cerrar la Intervención, y no contra los
   * testigos del nodo — la lee quien te ve las manos en la cocina, y sólo con vínculo 3.
   *
   * Es el mecanismo que hace que la paradoja del §2 muerda de verdad: la gente que te quiere
   * es exactamente la que va a acabar sabiéndolo, y no hay contramedida que lo retire.
   */
  if (next.traje && suit.intimateRisk(next.traje) > 0) {
    const tirada = stream(next, "intima", next.calendario.dia);
    if (tirada() < suit.intimateRisk(next.traje)) {
      const clue = {
        id: `intima:manos:c${next.capitulo}:d${next.calendario.dia}`,
        tipo: "intima",
        origen: "manosQuemadas",
        capitulo: next.capitulo,
        dia: next.calendario.dia,
      };
      for (const id of Object.keys(next.sospecha.abiertos)) {
        const vinculo = bonds.bondOf(next.vinculos, id);
        next = { ...next, sospecha: suspicion.addClue(next.sospecha, id, clue, { vinculo }) };
      }
    }
  }

  const cierres = suspicion.resolveClosures(next.sospecha, { capitulo: next.capitulo, dif: d });
  next = { ...next, sospecha: cierres.state, log: [...next.log, ...cierres.eventos.map((e) => ({ tipo: "expediente", ...e }))] };

  if (suspicion.isRuined(next.sospecha)) return endCampaign(next, { forzado: "ruina" });
  return next;
}

function contarPistasDeEstaIntervencion(state) {
  const marca = `c${state.capitulo}`;
  return Object.values(state.sospecha.abiertos)
    .flatMap((d) => d.pistas)
    .filter((p) => p.capitulo === state.capitulo && String(p.id).includes(marca)).length;
}

function materialesDe(state) {
  const base = { cobre: 2, fibra: 2 };
  if (state.capitulo >= 6) base.ceramica = 1;
  if (state.capitulo >= 9) { base.neodimio = 1; base.optica = 1; }
  if (state.capitulo >= 11) base.nucleo = 1;
  return base;
}

/* ── Fin de capítulo y epílogo ───────────────────────────────────────────────────── */

export function nextChapter(state) {
  if (state.capitulo >= TOTAL_CHAPTERS) return endCampaign(state);
  return openChapter({ ...state, balance: null, escenario: null }, state.capitulo + 1);
}

/**
 * The endings (§9.1). Seven, none of them labelled, and the campaign always reaches one:
 * even a ruina is a written epilogue with its own scene, never a red screen (§3.5).
 */
export function endCampaign(state, { forzado = null } = {}) {
  const confidentes = suspicion.confidants(state.sospecha).map((c) => c.id);
  const resumen = {
    capitulo: state.capitulo,
    resultadoFinal: forzado === "ruina" ? "fallido" : state.balance?.grado ?? "limpio",
    sabaterCerrado: !!state.sospecha.cerrados.sabater,
    confidentes: confidentes.length,
    vinculoMaximo: Math.max(0, ...Object.values(state.vinculos.vinculos)),
    rango: state.progreso.rango,
    banderas: state.banderas,
  };
  return {
    ...state,
    fase: PHASES.EPILOGO,
    final: { id: resolveEnding(resumen), resumen, confidentes },
  };
}

/* ── Escenas ─────────────────────────────────────────────────────────────────────── */

export function pendingScenes(state) {
  return scenesFor(state.capitulo, calendar.currentBlock(state.calendario), state.banderas)
    .filter((e) => !state.escenasVistas.includes(e.id));
}

export function playScene(state, escenaId, eleccion = null) {
  const escena = CHAPTERS[state.capitulo]?.escenas.find((e) => e.id === escenaId);
  if (!escena) return { state, error: "escenaDesconocida" };

  const banderas = new Set(state.banderas);
  // Una escena de elección escribe UNA de sus banderas, no las tres: son excluyentes.
  const aEscribir = escena.eleccion ? [eleccion].filter((f) => escena.eleccion.includes(f)) : (escena.escribe ?? []);
  for (const f of aEscribir) banderas.add(f);

  return {
    state: {
      ...state,
      banderas,
      escenasVistas: [...state.escenasVistas, escenaId],
      fase: PHASES.BLOQUE,
      log: [...state.log, { tipo: "escena", id: escenaId, eleccion }],
    },
    error: null,
  };
}

/* ── Emergencias ─────────────────────────────────────────────────────────────────── */

export function rollEmergency(state) {
  const emergencia = calendar.rollInterruption(stream(state, "emergencia", state.calendario.dia), state.calendario);
  if (!emergencia) return { state: bump(state), emergencia: null };
  return { state: { ...bump(state), fase: PHASES.EMERGENCIA, emergencia }, emergencia };
}

export function acceptEmergency(state) {
  if (!state.emergencia) return { state, error: "sinEmergencia" };
  const cal = calendar.acceptInterruption(state.calendario, state.emergencia);
  const escenario = intervention.createScenario(stream(state, "emergenciaEscenario", state.emergencia.id), {
    tipo: "estandar",
    distrito: state.emergencia.distrito,
    capitulo: state.capitulo,
    testigos: witnessesFor(state, Object.values(state.sospecha.abiertos).filter((d) => d.estado !== "latente").map((d) => ({ id: d.id }))),
    dif: dif(state),
  });
  return { state: { ...bump(state), calendario: cal, escenario, emergencia: null, fase: PHASES.INTERVENCION }, error: null };
}

/** Refusing is not free of consequence — it is free of COST, which is far worse (§7.2). */
export function refuseEmergency(state) {
  if (!state.emergencia) return { state, error: "sinEmergencia" };
  const salida = calendar.refuseInterruption(state.calendario, state.emergencia);
  return {
    state: {
      ...bump(state),
      calendario: salida.cal,
      progreso: progress.adjustRank(state.progreso, salida.rango),
      emergencia: null,
      fase: PHASES.BLOQUE,
      log: [...state.log, { tipo: "emergenciaRechazada", id: salida.consecuencia }],
    },
    error: null,
  };
}

/* ── Dificultad ──────────────────────────────────────────────────────────────────── */

/**
 * Changeable between chapters, both ways, with no penalty and no mark (§10.5). Inside a
 * chapter it is fixed so the chapter's arithmetic stays coherent — which is why this
 * refuses rather than queueing the change.
 */
export function setDifficulty(state, modo) {
  if (!DIFFICULTY_MODES.includes(modo)) return { state, error: "modoDesconocido" };
  if (state.fase !== PHASES.CAPITULO && state.fase !== PHASES.TITULO) return { state, error: "dentroDeCapitulo" };
  return { state: { ...state, dificultad: modo }, error: null };
}

/* ── El reductor ─────────────────────────────────────────────────────────────────── */

export function reduce(state, action) {
  switch (action.type) {
    case "NUEVA_PARTIDA":
      return openChapter(createGame(action), 1);
    case "ABRIR_CAPITULO":
      return openChapter(state, action.n ?? state.capitulo);
    case "ESCENA":
      return playScene(state, action.id, action.eleccion).state;
    case "ENTRAR_BLOQUE":
      return enterBlock(state);
    case "BLOQUE":
      return spendBlock(state, action.accion, action.opciones ?? {}).state;
    case "EMERGENCIA_ACEPTAR":
      return acceptEmergency(state).state;
    case "EMERGENCIA_RECHAZAR":
      return refuseEmergency(state).state;
    case "MOVER":
      return move(state, action.destino).state;
    case "DUELO":
      return duelAction(state, action.accion).state;
    case "CERRAR_INTERVENCION":
      return settleIntervention(state, action);
    case "SIGUIENTE_CAPITULO":
      return nextChapter(state);
    case "DIFICULTAD":
      return setDifficulty(state, action.modo).state;
    case "IDIOMA":
      return { ...state, idioma: action.idioma };
    default:
      return state;
  }
}
