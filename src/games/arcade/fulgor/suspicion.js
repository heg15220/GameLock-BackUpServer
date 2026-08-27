/**
 * Expedientes y pistas — el sistema central (§3).
 *
 * PURE. No React, no DOM, no clock, no `Math.random`. Every draw arrives as a stream from
 * `rng.js` and every tuning number arrives from `tables.js` or from a resolved difficulty
 * object. Nothing here knows the name of a difficulty mode (§10.5) and nothing here knows
 * a word of Spanish or English: a clue carries an `origen` key that `copy.js` turns into
 * "llevaba el manto quemado en el hombro derecho".
 *
 * WHAT MAKES THIS THE IMPORTANT FILE. It is the only system in the game that never
 * resets (§3.6). Interventions are won and finished; dossiers accumulate for eight hours.
 * In hour one the player uses his strongest technique because it is the one he has; in
 * hour six he thinks twice, because Sabater is two clues away. Same action, different
 * meaning — and the difference lives entirely in this file's state.
 *
 * THE SHAPE OF THE STATE
 *
 *   {
 *     abiertos: { sabater: { id, interes, pistas: [clue], umbral, estado, desenlace,
 *                            cerradoEn: null } },
 *     cerrados: { isma: { desenlace: "aliado", capitulo: 8 } },
 *   }
 *
 * A closed dossier keeps its outcome and drops its clue list, which is both the truthful
 * model (it is over; the list no longer does anything) and the one compression §15.2 asks
 * for by name.
 *
 * A clue is `{ id, tipo, origen, capitulo, dia }` — permanent unless actively lifted, and
 * `id` is stable so a Contramedidas block can name the exact one being buried.
 */

import { clamp } from "./rng.js";
import {
  ATTENTION,
  CLUE_CONTEXT,
  CLUE_RULES,
  CLUE_TYPES,
  DIRTY_RESULT_INTEREST,
  DISTRICTS,
  DOSSIERS,
  DOSSIER_STATE_AT,
  INTEREST_DECAY_PER_DAY,
  INTIMATE_BOND_GATE,
  NEAR_MISS_BAND,
  NEAR_MISS_INTEREST,
  OBSESSIVE_THRESHOLD_RELIEF,
  OCCULTATION_CAP,
  SABATER_INTEREST_PER_RANK,
} from "./tables.js";

/* ── Construcción ────────────────────────────────────────────────────────────────── */

export function createDossier(id) {
  const def = DOSSIERS[id];
  if (!def) throw new Error(`expediente desconocido: ${id}`);
  return {
    id,
    interes: def.interesSuelo,
    pistas: [],
    umbral: def.umbral,
    estado: def.interesSuelo >= DOSSIER_STATE_AT.obsesivo ? "obsesivo"
      : def.interesSuelo >= DOSSIER_STATE_AT.activo ? "activo" : "latente",
    desenlace: def.desenlace,
    cerradoEn: null,
  };
}

/** Every dossier the campaign has opened by this chapter, in table order. */
export function createSuspicion({ capitulo = 1 } = {}) {
  const abiertos = {};
  for (const [id, def] of Object.entries(DOSSIERS)) {
    if (def.abreEnCapitulo <= capitulo) abiertos[id] = createDossier(id);
  }
  return { abiertos, cerrados: {} };
}

/** Chapter transitions call this; opening one that is already open is a no-op. */
export function openDossier(state, id) {
  if (state.abiertos[id] || state.cerrados[id]) return state;
  return { ...state, abiertos: { ...state.abiertos, [id]: createDossier(id) } };
}

/* ── Percepción: la puerta dura del §3.2 ─────────────────────────────────────────── */

/**
 * Can this character even see a clue of this type?
 *
 * Two gates, and both of them are absolute. The `sesgos` list is what the character is
 * capable of noticing at all — Óscar Nieto reads testimony and nothing else, so a security
 * camera could film the whole thing and his dossier would not move. And Íntima needs bond
 * 3 whatever the biases say, because burnt hands and the smell of ozone are only legible
 * to someone who is close enough to be looking at your hands.
 */
export function canPerceive(id, tipo, vinculo = 0) {
  const def = DOSSIERS[id];
  if (!def) return false;
  if (!def.sesgos.includes(tipo)) return false;
  const rule = CLUE_RULES[tipo];
  if (!rule) return false;
  if (tipo === "intima" && vinculo < INTIMATE_BOND_GATE) return false;
  return vinculo >= rule.minBond;
}

/**
 * §2's paradox as arithmetic. Attention rises with interest — obvious — and also with
 * bond, which is the part that hurts: the people who love you look at you more closely
 * than the inspector does, and that is precisely why letting anyone in is dangerous.
 */
export function attentionOf(dossier, vinculo = 0) {
  const interes = dossier?.interes ?? 0;
  return clamp(
    ATTENTION.base + interes * ATTENTION.fromInteres + vinculo * ATTENTION.fromVinculo,
    0,
    1.2,
  );
}

/* ── Generación de pistas (§3.3) ─────────────────────────────────────────────────── */

/**
 * The formula, verbatim:
 *
 *   P = visibilidad × proximidad × (1 − ocultación) × atención × contexto
 *
 * `visibilidad` arrives as the 0-3 the player saw on the technique button and is
 * normalised here, which has the consequence the design wants without a special case:
 * a visibility-0 action — the entire Sentido family — has probability exactly zero. The
 * expert player's family cannot betray him, ever, and it falls out of the arithmetic
 * rather than being bolted on.
 */
export function clueChance({
  visibilidad = 0,
  proximidad = 1,
  ocultacion = 0,
  atencion = 1,
  hora = "tarde",
  clima = "despejado",
  distrito = null,
  dif = null,
}) {
  if (visibilidad <= 0) return 0;
  const contexto =
    (CLUE_CONTEXT.hora[hora] ?? 1) *
    (CLUE_CONTEXT.clima[clima] ?? 1) *
    (distrito && DISTRICTS[distrito] ? DISTRICTS[distrito].camara : 1);

  const p =
    clamp(visibilidad, 0, 3) / 3 *
    clamp(proximidad, 0, 1) *
    (1 - clamp(ocultacion, 0, OCCULTATION_CAP)) *
    clamp(atencion, 0, 1.2) *
    contexto *
    (dif?.pistaFactor ?? 1);

  return clamp(p, 0, 0.95);
}

/**
 * One roll against one witness.
 *
 * The near miss is the quiet half of the design (§3.3): a roll that fails inside the 15%
 * band leaves no clue but raises interest by five. It is what lets a character walk from
 * latente to obsesivo without ever having found anything — they got a fright, and now
 * they are looking where they were not looking before. Scares count.
 */
export function rollClue(next, params) {
  const p = clueChance(params);
  const roll = next();
  if (roll < p) return { generada: true, cerca: false, p, roll };
  return { generada: false, cerca: roll - p < NEAR_MISS_BAND, p, roll };
}

/* ── Mutaciones ──────────────────────────────────────────────────────────────────── */

const withDossier = (state, id, patch) => {
  const prev = state.abiertos[id];
  if (!prev) return state;
  const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
  return { ...state, abiertos: { ...state.abiertos, [id]: refreshState(next) } };
};

/** §3.4's state ladder, recomputed whenever interest moves. Closed dossiers never move. */
function refreshState(dossier) {
  if (dossier.cerradoEn != null) return dossier;
  const estado =
    dossier.interes >= DOSSIER_STATE_AT.obsesivo ? "obsesivo"
      : dossier.interes >= DOSSIER_STATE_AT.activo ? "activo" : "latente";
  return estado === dossier.estado ? dossier : { ...dossier, estado };
}

export function bumpInterest(state, id, amount) {
  return withDossier(state, id, (d) => ({
    ...d,
    interes: clamp(d.interes + amount, DOSSIERS[id].interesSuelo, 100),
  }));
}

/**
 * Add a clue. Idempotent by clue id, so an event replayed from a save cannot double-count,
 * and silently refused if the character could not have perceived it — the gate lives here
 * as well as in `canPerceive`, because this is the function every other module calls.
 */
export function addClue(state, id, clue, { vinculo = 0 } = {}) {
  const dossier = state.abiertos[id];
  if (!dossier || dossier.cerradoEn != null) return state;
  if (!canPerceive(id, clue.tipo, vinculo)) return state;
  if (dossier.pistas.some((p) => p.id === clue.id)) return state;
  return withDossier(state, id, (d) => ({ ...d, pistas: [...d.pistas, clue] }));
}

/**
 * Contramedidas (§7.2). Íntima is refused here rather than being made expensive: burnt
 * hands and clumsy lies cannot be retracted, only outlived, and the design is explicit
 * that no block of time buys them back.
 */
export function removeClue(state, id, clueId) {
  const dossier = state.abiertos[id];
  if (!dossier) return { state, retirada: null };
  const clue = dossier.pistas.find((p) => p.id === clueId);
  if (!clue || !CLUE_RULES[clue.tipo].removable) return { state, retirada: null };
  return {
    state: withDossier(state, id, (d) => ({ ...d, pistas: d.pistas.filter((p) => p.id !== clueId) })),
    retirada: clue,
  };
}

/** Which clues a Contramedidas block could actually lift, cheapest first. */
export function removableClues(state, id) {
  const dossier = state.abiertos[id];
  if (!dossier) return [];
  return dossier.pistas
    .filter((p) => CLUE_RULES[p.tipo].removable)
    .sort((a, b) => CLUE_RULES[a.tipo].removalCost - CLUE_RULES[b.tipo].removalCost);
}

/**
 * A day passes (§3.4). Interest decays toward the character's floor; clues never decay.
 * That asymmetry is the whole engine: time forgives attention and never forgives evidence.
 */
export function decay(state, dias = 1, { dif = null } = {}) {
  const rate = INTEREST_DECAY_PER_DAY * (dif?.decaimientoFactor ?? 1) * dias;
  let next = state;
  for (const id of Object.keys(state.abiertos)) {
    const suelo = DOSSIERS[id].interesSuelo + (dif?.sueloDelta ?? 0);
    next = withDossier(next, id, (d) => ({ ...d, interes: Math.max(suelo, d.interes - rate) }));
  }
  return next;
}

/** §8.2. Being famous is a cost that only Sabater charges, and she charges it per rank. */
export function applyRank(state, rango) {
  if (!state.abiertos.sabater) return state;
  return bumpInterest(state, "sabater", rango * SABATER_INTEREST_PER_RANK);
}

/** §4.5. A Sucio result raises the interest of everyone who was standing there. */
export function applyDirtyResult(state, testigos = []) {
  return testigos.reduce((acc, id) => bumpInterest(acc, id, DIRTY_RESULT_INTEREST), state);
}

/* ── Cierre (§3.5) ───────────────────────────────────────────────────────────────── */

/**
 * The threshold in force right now. Difficulty shifts it, and an obsessive character
 * lowers his own by one — someone who is already following you needs less to be sure.
 */
export function effectiveThreshold(dossier, dif = null) {
  const relief = dossier.estado === "obsesivo" ? OBSESSIVE_THRESHOLD_RELIEF : 0;
  return Math.max(1, dossier.umbral + (dif?.umbralDelta ?? 0) - relief);
}

export function cluesToClose(dossier, dif = null) {
  return Math.max(0, effectiveThreshold(dossier, dif) - dossier.pistas.length);
}

/**
 * Would this dossier close now, and as what?
 *
 * The ruina gate is the one place the game protects itself from its own systems. A
 * campaign cannot end in chapter 2 because the player was unlucky twice, so `ruina` is
 * held shut until the chapter the difficulty row names (4 / 6 / 11). Held shut, not
 * cancelled: the dossier stays full and closes the moment the door opens, which is a far
 * more frightening state to be in than a reset.
 *
 * §3.5's other clause — anyone obsessive becomes a ruina risk once three dossiers are
 * already closed — is the late-game tightening, and it is why a player who has been
 * collecting confidants finds the last two chapters harder than the first ten.
 */
export function closureFor(dossier, { capitulo = 1, dif = null, cerradosPrevios = 0 } = {}) {
  if (!dossier || dossier.cerradoEn != null) return null;
  if (dossier.pistas.length < effectiveThreshold(dossier, dif)) return null;

  let desenlace = dossier.desenlace;
  if (desenlace !== "ruina" && dossier.estado === "obsesivo" && cerradosPrevios >= 3) {
    desenlace = "ruina";
  }
  if (desenlace === "ruina" && capitulo < (dif?.ruinaDesdeCapitulo ?? 4)) {
    return { desenlace: "retenido", motivo: "ruinaBloqueada" };
  }
  return { desenlace };
}

/** Close it: the outcome is kept, the clue list is dropped (§15.2). */
export function closeDossier(state, id, desenlace, capitulo) {
  const dossier = state.abiertos[id];
  if (!dossier) return state;
  const abiertos = { ...state.abiertos };
  delete abiertos[id];
  return {
    ...state,
    abiertos,
    cerrados: { ...state.cerrados, [id]: { desenlace, capitulo } },
  };
}

/**
 * Sweep every open dossier and close the ones that are full. Returns the new state plus
 * the list of what just happened, because a closure is always a scene and the caller needs
 * to know which one to play.
 */
export function resolveClosures(state, { capitulo = 1, dif = null } = {}) {
  let next = state;
  const eventos = [];
  const orden = Object.keys(state.abiertos);
  for (const id of orden) {
    const cerradosPrevios = Object.keys(next.cerrados).length;
    const dossier = next.abiertos[id];
    const verdict = closureFor(dossier, { capitulo, dif, cerradosPrevios });
    if (!verdict || verdict.desenlace === "retenido") continue;
    next = closeDossier(next, id, verdict.desenlace, capitulo);
    eventos.push({ id, desenlace: verdict.desenlace, capitulo });
  }
  return { state: next, eventos };
}

/* ── El evento: una acción delante de unos testigos ──────────────────────────────── */

/**
 * The elegance the design claims for itself (§3.2) is that ONE action produces DIFFERENT
 * clues depending on who is standing there. That is this function, and it is the only
 * place where an action meets a cast.
 *
 * Put out a fire with a discharge in front of a council camera and it is a Digital clue,
 * filed with Sabater and with Marga. Do it in front of your neighbour and it is a
 * Testimonial one, filed with Doña Pilar. Come home with burnt hands and it is an Íntima
 * one, and only your mother and your sister can read it.
 *
 * `accion` is `{ visibilidad, tipos, origen, id }` — `tipos` being which kinds of trace
 * this action is even capable of leaving. `testigos` is `[{ id, proximidad, vinculo }]`.
 */
export function applyAction(state, accion, testigos, { next, dif = null, contexto = {}, capitulo = 1, dia = 1 } = {}) {
  let acc = state;
  const generadas = [];
  const sustos = [];

  for (const testigo of testigos) {
    const dossier = acc.abiertos[testigo.id];
    if (!dossier || dossier.cerradoEn != null) continue;

    for (const tipo of accion.tipos ?? []) {
      if (!canPerceive(testigo.id, tipo, testigo.vinculo ?? 0)) continue;

      const params = {
        visibilidad: accion.visibilidad ?? 0,
        proximidad: testigo.proximidad ?? 1,
        ocultacion: accion.ocultacion ?? 0,
        atencion: attentionOf(dossier, testigo.vinculo ?? 0),
        dif,
        ...contexto,
      };
      // Weighted by type: a photograph is harder to explain away than a glimpse.
      params.visibilidad *= CLUE_RULES[tipo].weight;

      const outcome = rollClue(next, params);
      if (outcome.generada) {
        const clue = {
          id: `${tipo}:${accion.id ?? accion.origen}:${testigo.id}`,
          tipo,
          origen: accion.origen,
          capitulo,
          dia,
        };
        acc = addClue(acc, testigo.id, clue, { vinculo: testigo.vinculo ?? 0 });
        generadas.push({ testigo: testigo.id, clue });
      } else if (outcome.cerca) {
        acc = bumpInterest(acc, testigo.id, NEAR_MISS_INTEREST);
        sustos.push({ testigo: testigo.id, tipo });
      }
    }
  }

  // A technique that guarantees a trace does so regardless of the rolls: Fulgor is seen.
  if (accion.pistaGarantizada) {
    for (const testigo of testigos) {
      if (!canPerceive(testigo.id, accion.pistaGarantizada, testigo.vinculo ?? 0)) continue;
      const clue = {
        id: `${accion.pistaGarantizada}:${accion.id ?? accion.origen}:garantizada:${testigo.id}`,
        tipo: accion.pistaGarantizada,
        origen: accion.origen,
        capitulo,
        dia,
      };
      if (!acc.abiertos[testigo.id]?.pistas.some((p) => p.id === clue.id)) {
        acc = addClue(acc, testigo.id, clue, { vinculo: testigo.vinculo ?? 0 });
        generadas.push({ testigo: testigo.id, clue, garantizada: true });
      }
    }
  }

  return { state: acc, generadas, sustos };
}

/* ── Lo que la interfaz tiene permitido enseñar (§10.2-§10.4) ────────────────────── */

/**
 * Difficulty is also a disclosure setting, and that belongs here rather than in the panel,
 * because "how much the game tells you about what is happening behind your back" is a rule
 * and not a rendering choice. Three modes, three answers:
 *
 *   completos  Leyenda urbana — how many clues are still missing, and a warning at obsesivo
 *   estado     Doble vida     — the clues they have and their state, never the distance
 *   ninguno    Sin máscara    — the count and nothing else. You find out when it happens.
 */
export function disclose(state, { dif = null } = {}) {
  const nivel = dif?.avisos ?? "estado";
  return Object.values(state.abiertos).map((d) => {
    const base = { id: d.id, pistas: d.pistas.length, desenlace: d.desenlace };
    if (nivel === "ninguno") return base;
    const conEstado = { ...base, estado: d.estado, detalle: d.pistas };
    if (nivel === "estado") return conEstado;
    return { ...conEstado, faltan: cluesToClose(d, dif), avisoObsesivo: d.estado === "obsesivo" };
  });
}

/** Confidants: closed as allies. `bonds.js` turns these into the resources they grant. */
export function confidants(state) {
  return Object.entries(state.cerrados)
    .filter(([, v]) => v.desenlace === "aliado")
    .map(([id, v]) => ({ id, capitulo: v.capitulo }));
}

/** True once the campaign has been ended by a dossier rather than by the player. */
export function isRuined(state) {
  return Object.values(state.cerrados).some((v) => v.desenlace === "ruina");
}

export const CLUE_TYPE_LIST = CLUE_TYPES;
