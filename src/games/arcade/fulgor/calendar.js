/**
 * La vida civil: días, bloques, agenda e interrupciones (§7). PURE.
 *
 * PILLAR 2 LIVES HERE. The eight hours of this game are not eight hours of combat: they
 * are eight hours of choosing who to let down. Going to the emergency means missing
 * Nuria's birthday; missing Nuria's birthday cools that bond; that cooled bond was the
 * alibi she was giving you without knowing it. This module is where those sentences turn
 * into state transitions.
 *
 * THE TWO RULES `calendar.test.js` HOLDS:
 *
 *  - the blocks add up. A day is exactly three, a chapter is exactly `CHAPTER_DAYS[n]`
 *    days, and no action can quietly produce a fourth block or consume zero.
 *  - interruptions cannot chain forever. An emergency turns a block into an Intervention;
 *    without a cap, a bad night could eat a whole chapter and leave the player with no
 *    civilian life at all, which would dissolve the half of the game that makes the other
 *    half mean anything.
 */

import { chance, clamp, randInt } from "./rng.js";
import {
  BLOCKS,
  BLOCK_ACTIONS,
  BLOCK_ACTION_RULES,
  CHAPTER_DAYS,
  DISTRICTS,
  PATROL_FATIGUE,
  TOTAL_CHAPTERS,
} from "./tables.js";

/** How many emergencies a single day is allowed to interrupt, whatever the rolls say. */
export const MAX_INTERRUPTIONS_PER_DAY = 1;
/** And across a whole chapter, so a run of bad luck cannot eat the civilian half. */
export const MAX_INTERRUPTIONS_PER_CHAPTER = 3;

/* ── Estado ──────────────────────────────────────────────────────────────────────── */

export function createCalendar(capitulo = 1) {
  return {
    capitulo,
    dia: 1,
    diasDelCapitulo: CHAPTER_DAYS[capitulo - 1] ?? 6,
    bloque: 0,
    nochesSeguidas: 0,
    interrupcionesHoy: 0,
    interrupcionesCapitulo: 0,
    agenda: [],
    historial: [],
  };
}

export function currentBlock(cal) {
  return BLOCKS[cal.bloque];
}

export function isChapterOver(cal) {
  return cal.dia > cal.diasDelCapitulo;
}

/** Total blocks a chapter contains. Three a day, no exceptions — that is the budget. */
export function blocksInChapter(capitulo) {
  return (CHAPTER_DAYS[capitulo - 1] ?? 6) * BLOCKS.length;
}

/* ── Qué se puede hacer ahora ────────────────────────────────────────────────────── */

/**
 * The menu for this block. An action that is illegal right now is returned with its reason
 * rather than hidden, for the same reason the duel panel greys techniques out instead of
 * dropping them: "you cannot patrol in the morning" is information, and this is a game
 * about information.
 */
export function availableActions(cal, { distritosAbiertos = null } = {}) {
  const bloque = currentBlock(cal);
  return BLOCK_ACTIONS.map((id) => {
    const regla = BLOCK_ACTION_RULES[id];
    const legal = regla.soloEn.includes(bloque);
    return {
      id,
      disponible: legal,
      motivo: legal ? null : "bloque",
      bloque,
      distritos: distritosAbiertos ?? openDistricts(cal.capitulo),
    };
  });
}

export function openDistricts(capitulo) {
  return Object.entries(DISTRICTS)
    .filter(([, d]) => d.abreEnCapitulo <= capitulo)
    .map(([id]) => id);
}

/* ── Gastar un bloque ────────────────────────────────────────────────────────────── */

/**
 * The core transition. One action, one block, and the day rolls over after the third.
 *
 * `nochesSeguidas` is §7.1's sleep debt: patrolling two nights running costs 15 of the
 * next day's starting Composure, three costs 30. Sleep is a resource, and the only way to
 * pay it back is a block you did not spend on anything else.
 */
export function spendBlock(cal, accion, { objetivo = null, distrito = null } = {}) {
  const bloque = currentBlock(cal);
  const regla = BLOCK_ACTION_RULES[accion];
  if (!regla || !regla.soloEn.includes(bloque)) return null;

  const entrada = { dia: cal.dia, bloque, accion, objetivo, distrito, capitulo: cal.capitulo };
  const patrullando = accion === "patrullar";
  const durmiendo = accion === "descansar" && bloque === "noche";

  let next = {
    ...cal,
    historial: [...cal.historial, entrada],
    nochesSeguidas: bloque === "noche"
      ? (patrullando ? cal.nochesSeguidas + 1 : durmiendo ? 0 : cal.nochesSeguidas)
      : cal.nochesSeguidas,
  };
  return advanceBlock(next);
}

/** Move the clock on one block, rolling the day and clearing the day's interruption count. */
export function advanceBlock(cal) {
  const siguiente = cal.bloque + 1;
  if (siguiente < BLOCKS.length) return { ...cal, bloque: siguiente };
  return { ...cal, bloque: 0, dia: cal.dia + 1, interrupcionesHoy: 0 };
}

/** The morning you did not turn up to. Returned as a fact for `bonds.js` to charge. */
export function skipMorning(cal, { heroeSalio = false } = {}) {
  if (currentBlock(cal) !== "manana") return null;
  return {
    cal: advanceBlock({ ...cal, historial: [...cal.historial, { dia: cal.dia, bloque: "manana", accion: "faltar" }] }),
    penalizaVinculo: true,
    pistaTemporal: heroeSalio,
  };
}

/** How much Composure the hero starts tomorrow with, after the nights he has had (§7.1). */
export function fatiguePenalty(cal) {
  const idx = clamp(cal.nochesSeguidas, 0, PATROL_FATIGUE.length - 1);
  return PATROL_FATIGUE[idx];
}

/* ── Interrupciones (§7.2) ───────────────────────────────────────────────────────── */

/**
 * An alert can sound in any block. Accepting it turns the block into an Intervention and
 * CANCELS whatever you were going to do, with all of its consequences; refusing has its
 * own price — the city suffers, rank drops, and sometimes someone with a name dies.
 *
 * The caps are the load-bearing part. Without them, a chapter can be entirely consumed by
 * emergencies, and a player who never gets an afternoon has no bonds, no suit and no
 * countermeasures — he would lose to a system he never got to play.
 */
export function canInterrupt(cal) {
  return cal.interrupcionesHoy < MAX_INTERRUPTIONS_PER_DAY
    && cal.interrupcionesCapitulo < MAX_INTERRUPTIONS_PER_CHAPTER;
}

export function rollInterruption(next, cal, { probabilidad = 0.22, capituloForzado = null } = {}) {
  if (!canInterrupt(cal)) return null;
  if (capituloForzado === null && !chance(next, probabilidad)) return null;
  const abiertos = openDistricts(cal.capitulo);
  return {
    id: `emergencia:c${cal.capitulo}:d${cal.dia}:${currentBlock(cal)}`,
    distrito: capituloForzado ?? abiertos[randInt(next, 0, abiertos.length - 1)],
    bloque: currentBlock(cal),
    dia: cal.dia,
  };
}

/** Take the call. The block is spent on the Intervention and the plan is gone. */
export function acceptInterruption(cal, emergencia) {
  return advanceBlock({
    ...cal,
    interrupcionesHoy: cal.interrupcionesHoy + 1,
    interrupcionesCapitulo: cal.interrupcionesCapitulo + 1,
    historial: [...cal.historial, { dia: cal.dia, bloque: currentBlock(cal), accion: "intervencion", objetivo: emergencia.id }],
  });
}

/**
 * Don't take it. The block is yours — and that is exactly the point: refusing is not free
 * of consequence, it is free of COST, which is a very different and much nastier thing.
 */
export function refuseInterruption(cal, emergencia) {
  return {
    cal: {
      ...cal,
      interrupcionesHoy: cal.interrupcionesHoy + 1,
      interrupcionesCapitulo: cal.interrupcionesCapitulo + 1,
      historial: [...cal.historial, { dia: cal.dia, bloque: currentBlock(cal), accion: "rechazar", objetivo: emergencia.id }],
    },
    rango: -1,
    consecuencia: emergencia.id,
  };
}

/* ── Fin de capítulo ─────────────────────────────────────────────────────────────── */

export function nextChapter(cal) {
  const capitulo = Math.min(TOTAL_CHAPTERS, cal.capitulo + 1);
  return { ...createCalendar(capitulo), historial: cal.historial };
}

/** What the player actually did with a chapter, which is the only honest summary of it. */
export function chapterSummary(cal) {
  const delCapitulo = cal.historial.filter((h) => h.capitulo === cal.capitulo);
  const cuenta = {};
  for (const h of delCapitulo) cuenta[h.accion] = (cuenta[h.accion] ?? 0) + 1;
  return {
    capitulo: cal.capitulo,
    bloquesGastados: delCapitulo.length,
    bloquesTotales: blocksInChapter(cal.capitulo),
    porAccion: cuenta,
    interrupciones: cal.interrupcionesCapitulo,
  };
}
