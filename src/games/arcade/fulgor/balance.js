/**
 * El jugador simulado: políticas y campañas completas. PURE.
 *
 * Existe por el §14.3: mil campañas con políticas distintas, por los tres modos, para
 * responder dos preguntas que el diseño hace y que ninguna otra cosa puede contestar —
 * ¿gana siempre alguna política?, y ¿son los tres modos tres experiencias o tres etiquetas?
 *
 * ESTO NO ES UNA IA DE JUEGO. Es un instrumento de medida. Cada política es una caricatura
 * deliberada de una forma de jugar que el diseño nombra, porque lo que se quiere medir es si
 * el espacio de decisiones tiene forma, no si un bot juega bien:
 *
 *   temerario  Usa siempre lo más potente. Gana los combates y se deja la ciudad llena de
 *              pruebas. Es la política que el §2 dice que debería terminar desenmascarada.
 *   prudente   Prioriza visibilidad cero, contiene en vez de ganar, gasta bloques en
 *              contramedidas. Debería sobrevivir — y llegar débil.
 *   social     Gasta casi todo en vínculos. Consigue coartadas y confidentes, y a la vez
 *              cuatro expedientes que le leen las manos. Es la paradoja del §2, jugada.
 *   aislado    No queda con nadie. Ni coartadas ni Íntimas. La tesis de Cero, jugada.
 *
 * Si una de las cuatro ganara siempre, el juego tendría una jugada dominante y los tres
 * pilares se caerían. Que ninguna gane siempre es lo que `balance.test.js` comprueba.
 */

import { createStream } from "./rng.js";
import * as juego from "./game.js";
import * as duel from "./duel.js";
import * as intervention from "./intervention.js";
import * as suspicion from "./suspicion.js";
import { TOTAL_CHAPTERS } from "./tables.js";

/* ── Las cuatro políticas ────────────────────────────────────────────────────────── */

export const POLICIES = {
  temerario: {
    // Lo más potente que quepa en la Carga. Que lo vea quien lo vea.
    elegirAccion: (opciones) => masAlta(opciones, (a) => (a.poder ?? 0) + (a.resolves ? 20 : 0)),
    bloque: ["patrullar", "entrenar", "taller", "trabajar"],
    contieneSiPuede: false,
  },
  prudente: {
    // Visibilidad cero por encima de todo; el entorno antes que la fuerza.
    elegirAccion: (opciones) => masAlta(opciones, (a) => (a.fuente === "entorno" ? 30 : 0) - a.visibilidadReal * 12 + (a.poder ?? 0) * 0.3),
    bloque: ["contramedidas", "descansar", "entrenar", "taller"],
    contieneSiPuede: true,
  },
  social: {
    elegirAccion: (opciones) => masAlta(opciones, (a) => (a.poder ?? 0) * 0.6 - a.visibilidadReal * 5),
    bloque: ["quedar", "obligacion", "quedar", "descansar"],
    contieneSiPuede: true,
  },
  aislado: {
    elegirAccion: (opciones) => masAlta(opciones, (a) => (a.poder ?? 0) * 0.8 - a.visibilidadReal * 7),
    bloque: ["entrenar", "taller", "investigar", "patrullar"],
    contieneSiPuede: false,
  },
};

export const POLICY_NAMES = Object.keys(POLICIES);

function masAlta(opciones, puntuar) {
  let mejor = null;
  let mejorP = -Infinity;
  for (const a of opciones) {
    if (!a.disponible) continue;
    const p = puntuar(a);
    if (p > mejorP) { mejorP = p; mejor = a; }
  }
  return mejor;
}

/* ── Una Intervención, jugada por la máquina ─────────────────────────────────────── */

/**
 * Walks to the objective and fights whatever is in the way, with a hard cap on iterations.
 * The cap is not paranoia: a policy that can never afford any action would otherwise spin,
 * and a Monte Carlo that hangs is a Monte Carlo nobody runs.
 */
function jugarIntervencion(estado, politica, limite = 60) {
  let actual = estado;
  let vueltas = 0;

  while (actual.escenario && vueltas < limite) {
    vueltas += 1;

    if (actual.fase === juego.PHASES.DUELO && actual.duelo) {
      const nodo = actual.escenario.nodos.find((n) => n.id === actual.duelo.nodo);
      const opciones = duel.actionMenu(actual.duelo.heroe, { nodo, dif: juego.dif(actual) });
      const contener = opciones.find((a) => a.id === "contener");
      const elegida = politica.contieneSiPuede && actual.duelo.heroe.compostura < 45 && contener
        ? contener
        : politica.elegirAccion(opciones) ?? opciones.find((a) => a.id === "golpear");

      const salida = juego.duelAction(actual, elegida.id);
      actual = salida.error ? juego.duelAction(actual, "golpear").state : salida.state;
      if (actual.fase === juego.PHASES.BALANCE || actual.fase === juego.PHASES.EPILOGO) return actual;
      continue;
    }

    if (intervention.timeUp(actual.escenario)) break;

    const pendiente = actual.escenario.objetivos.find((o) => !o.cumplido);
    if (!pendiente) break;

    if (pendiente.nodo === actual.escenario.posicion) {
      actual = { ...actual, escenario: intervention.completeObjective(actual.escenario, pendiente.id) };
      continue;
    }

    const salida = juego.move(actual, pendiente.nodo);
    if (salida.error) break;
    actual = salida.state;
  }

  return juego.settleIntervention(actual, { caido: actual.duelo ? duel.hasFallen(actual.duelo.heroe.compostura) : false });
}

/* ── Una campaña completa ────────────────────────────────────────────────────────── */

/**
 * Twelve chapters, start to finish, deterministic under the seed. Returns the summary the
 * balance test needs — and NOT a score, because this game does not have one.
 */
export function simulateCampaign({ semilla = "mc", modo = "medio", politica = "prudente" } = {}) {
  const guion = POLICIES[politica] ?? POLICIES.prudente;
  let estado = juego.openChapter(juego.createGame({ semilla, dificultad: modo }), 1);
  const next = createStream(semilla, "mc", modo, politica);

  let bloquesGastados = 0;
  let intervenciones = 0;
  let capitulosCompletados = 0;

  for (let capitulo = 1; capitulo <= TOTAL_CHAPTERS; capitulo += 1) {
    if (estado.fase === juego.PHASES.EPILOGO) break;
    if (estado.capitulo !== capitulo) estado = juego.openChapter(estado, capitulo);

    let seguridad = 0;
    while (estado.fase !== juego.PHASES.EPILOGO && seguridad < 80) {
      seguridad += 1;

      if (estado.fase === juego.PHASES.INTERVENCION || estado.fase === juego.PHASES.DUELO) {
        estado = jugarIntervencion(estado, guion);
        intervenciones += 1;
        if (estado.fase === juego.PHASES.EPILOGO) break;
        continue;
      }

      if (estado.fase === juego.PHASES.BALANCE) break;

      if (estado.fase === juego.PHASES.EMERGENCIA) {
        // Las políticas contestan a la ciudad de forma distinta, y eso también se mide.
        const acepta = politica === "temerario" || (politica !== "aislado" && next() < 0.6);
        estado = acepta ? juego.acceptEmergency(estado).state : juego.refuseEmergency(estado).state;
        continue;
      }

      const accion = guion.bloque[bloquesGastados % guion.bloque.length];
      const salida = juego.spendBlock(estado, accion, {
        objetivo: "isma",
        distrito: "faro",
        expediente: Object.values(estado.sospecha.abiertos).find((d) => d.pistas.length)?.id,
      });
      bloquesGastados += 1;

      if (salida.error) {
        // Acción ilegal en este bloque: se descansa, que siempre lo es.
        const alternativa = juego.spendBlock(estado, "descansar");
        estado = alternativa.error ? estado : alternativa.state;
        if (alternativa.error) break;
      } else {
        estado = salida.state;
        const conEmergencia = juego.rollEmergency(estado);
        if (conEmergencia.emergencia) estado = conEmergencia.state;
      }
    }

    if (estado.fase === juego.PHASES.EPILOGO) break;
    capitulosCompletados = capitulo;
    estado = juego.nextChapter(estado);
  }

  if (estado.fase !== juego.PHASES.EPILOGO) estado = juego.endCampaign(estado);

  const confidentes = suspicion.confidants(estado.sospecha);
  return {
    modo,
    politica,
    semilla,
    final: estado.final?.id ?? null,
    // Desenmascarado en el sentido del §10.5: alguien cerró un expediente en ruina.
    desenmascarado: suspicion.isRuined(estado.sospecha) || estado.final?.id === "desenmascarado",
    capitulosCompletados,
    intervenciones,
    bloquesGastados,
    confidentes: confidentes.length,
    expedientesCerrados: Object.keys(estado.sospecha.cerrados).length,
    rango: estado.progreso.rango,
    nivel: estado.progreso.nivel,
    // §9.2's budget, applied: chapter minutes plus what the extra Interventions cost.
    minutos: estimarMinutos(capitulosCompletados, intervenciones, bloquesGastados),
  };
}

/**
 * §9.2's budget turned into an estimate. Not a stopwatch — a model, built from the document's
 * own split: 150 minutes of scenes and dialogue, 145 of decisive Interventions, 95 of
 * civilian blocks, 50 of skirmishes, 40 of management.
 */
export function estimarMinutos(capitulos, intervenciones, bloques) {
  const escenas = capitulos * 12.5;
  const decisivas = Math.min(capitulos, TOTAL_CHAPTERS) * 12;
  const extras = Math.max(0, intervenciones - capitulos) * 3.5;
  const civil = bloques * 0.9;
  const gestion = capitulos * 3.3;
  return Math.round(escenas + decisivas + extras + civil + gestion);
}

/** Runs a batch and returns the aggregate the design argues about. */
export function runBatch({ n = 200, modo = "medio", politica = "prudente", prefijo = "lote" } = {}) {
  const partidas = [];
  for (let i = 0; i < n; i += 1) {
    partidas.push(simulateCampaign({ semilla: `${prefijo}:${i}`, modo, politica }));
  }
  const desenmascaradas = partidas.filter((p) => p.desenmascarado).length;
  const minutos = partidas.map((p) => p.minutos).sort((a, b) => a - b);
  return {
    modo,
    politica,
    n,
    desenmascaradas,
    tasaDesenmascarado: desenmascaradas / n,
    minutosMediana: minutos[Math.floor(minutos.length / 2)],
    minutosMin: minutos[0],
    minutosMax: minutos[minutos.length - 1],
    confidentesMedia: media(partidas.map((p) => p.confidentes)),
    capitulosMedia: media(partidas.map((p) => p.capitulosCompletados)),
    finales: contar(partidas.map((p) => p.final)),
  };
}

const media = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

const contar = (xs) => xs.reduce((acc, x) => ({ ...acc, [x]: (acc[x] ?? 0) + 1 }), {});
