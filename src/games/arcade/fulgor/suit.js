/**
 * El traje (§6). PURE.
 *
 * Not a cosmetic. It is the hero's character sheet, and every one of its six slots is a
 * negotiation between power and concealment: the mask that hides you best is the one you
 * see worst through, the conductive weave that carries the most charge is the one that
 * glows in the dark, and the cloak that stops the most damage is the first thing to tear —
 * which makes it the number one source of Física clues in the game.
 *
 * THE JOIN WITH PILLAR 1 (§6.2) is the reason this file is not just a stat block. Integrity
 * is not durability: below 60 the piece becomes RECOGNISABLE, which upgrades a Testimonial
 * clue from "a boy in a mask" to "a boy whose cloak was burnt on the right shoulder" — and
 * two clues that agree on a detail reinforce each other. Below 30 it starts leaving
 * fragments in the scenario, each one a named Física clue sitting at a known address,
 * waiting for a recovery mission. The suit is how the combat system files evidence.
 *
 * AND THE PAYMENT OF THE PARADOX (§6.3). The fifth generation cannot be written as a fixed
 * row, because its stats depend literally on how many people the player let in. That is
 * the moment §2's paradox is cashed, and it is modelled here rather than narrated.
 */

import { chance, clamp } from "./rng.js";
import {
  INTEGRITY_BANDS,
  MATERIALS,
  OCCULTATION_CAP,
  REPAIR_COST_FACTOR,
  SUIT_COST,
  SUIT_GENERATIONS,
  SUIT_GENERATION_ORDER,
  SUIT_SLOTS,
  SUIT_SLOT_RULES,
  WEAR_PER_DUEL,
  WEAR_PER_HIT_TAKEN,
} from "./tables.js";

/* ── Construcción ────────────────────────────────────────────────────────────────── */

/**
 * A suit is six pieces of the same generation, each with its own integrity. Pieces wear
 * independently, so a player finishes chapter 5 with a shredded cloak and an intact mask —
 * which is exactly the shape of the story the design wants told there.
 */
export function createSuit(generacion = "improvisado") {
  const gen = SUIT_GENERATIONS[generacion];
  if (!gen) throw new Error(`generación de traje desconocida: ${generacion}`);
  return {
    generacion,
    piezas: Object.fromEntries(
      SUIT_SLOTS.map((slot) => [slot, { slot, integridad: gen.integridadMax, generacion }]),
    ),
  };
}

export function generationIndex(generacion) {
  return SUIT_GENERATION_ORDER.indexOf(generacion);
}

/** Which generation the story has unlocked by this chapter. */
export function availableGeneration(capitulo) {
  let mejor = SUIT_GENERATION_ORDER[0];
  for (const id of SUIT_GENERATION_ORDER) {
    if (SUIT_GENERATIONS[id].capitulo <= capitulo) mejor = id;
  }
  return mejor;
}

export function buildCost(generacion) {
  return { ...SUIT_COST[generacion] };
}

export function canBuild(generacion, materiales) {
  const coste = buildCost(generacion);
  return Object.entries(coste).every(([m, n]) => (materiales?.[m] ?? 0) >= n);
}

/** Spend the materials and hand back the new suit. Refuses rather than going into debt. */
export function build(generacion, materiales) {
  if (!canBuild(generacion, materiales)) return null;
  const coste = buildCost(generacion);
  const restantes = { ...materiales };
  for (const [m, n] of Object.entries(coste)) restantes[m] -= n;
  return { traje: createSuit(generacion), materiales: restantes };
}

/* ── Integridad (§6.2) ───────────────────────────────────────────────────────────── */

export function integrityBand(pieza) {
  const v = clamp(pieza?.integridad ?? 0, 0, 100);
  for (const banda of INTEGRITY_BANDS) {
    if (v >= banda.min) return banda;
  }
  return INTEGRITY_BANDS[INTEGRITY_BANDS.length - 1];
}

/** True if a witness can describe this piece specifically — the §6.2 clue upgrade. */
export function isRecognisable(traje) {
  return SUIT_SLOTS.some((slot) => integrityBand(traje.piezas[slot]).reconocible);
}

/** Which pieces are recognisable, so `copy.js` can name the detail a witness would give. */
export function recognisablePieces(traje) {
  return SUIT_SLOTS.filter((slot) => integrityBand(traje.piezas[slot]).reconocible);
}

/**
 * Wear from a duel. Guardia buys some of it back, which is the only place in the game where
 * a defensive stat pays you in something other than survival: it pays you in evidence not
 * left behind.
 */
export function wear(traje, { duelos = 1, golpesRecibidos = 0, guardia = 0, foco = null } = {}) {
  const bruto = duelos * WEAR_PER_DUEL + golpesRecibidos * WEAR_PER_HIT_TAKEN;
  const factor = clamp(1 - guardia * 0.008, 0.4, 1);
  const total = bruto * factor;

  const piezas = { ...traje.piezas };
  for (const slot of SUIT_SLOTS) {
    // The cloak takes the brunt, as §6.1 says it does; `foco` lets a scripted beat aim the
    // damage at a specific piece (the grúa in chapter 5 tears the manto and nothing else).
    //
    // The weight is applied per piece and NOT divided across the six, which is the whole
    // difference between a suit that degrades over a chapter and one that would outlast the
    // campaign: at 4 points a duel, a sixth of that is 0.7, and nothing would ever break.
    const peso = foco ? (slot === foco ? 3 : 0.2) : slot === "manto" ? 1.5 : 0.6;
    piezas[slot] = {
      ...piezas[slot],
      integridad: clamp(piezas[slot].integridad - total * peso, 0, 100),
    };
  }
  return { ...traje, piezas };
}

/**
 * Does the suit leave a fragment behind? §6.2: below 30 integrity, 40% per duel, and the
 * clue is NAMED and LOCATED — recoverable later, which is what turns a bad night into a
 * mission rather than into a number.
 */
export function fragmentRoll(next, traje, { nodoId = null, capitulo = 1 } = {}) {
  const fragmentos = [];
  for (const slot of SUIT_SLOTS) {
    const banda = integrityBand(traje.piezas[slot]);
    if (banda.fragmentoP <= 0) continue;
    const p = banda.fragmentoP * (SUIT_SLOT_RULES[slot].fuentePistaFisica ?? 1);
    if (chance(next, clamp(p, 0, 0.95))) {
      fragmentos.push({
        id: `fragmento:${slot}:c${capitulo}:${nodoId ?? "escena"}`,
        slot,
        nodoId,
        capitulo,
        tipo: "fisica",
        origen: `fragmento.${slot}`,
      });
    }
  }
  return fragmentos;
}

/**
 * §6.1's gloves. Good conductors get hot, and hot conductors burn your hands — an Íntima
 * clue that no countermeasure lifts and that only the people closest to you can read.
 * The best gloves in the game are the ones most likely to tell your mother.
 */
export function intimateRisk(traje) {
  const guantes = traje.piezas.guantes;
  if (!guantes || integrityBand(guantes).statFactor === 0) return 0;
  const gen = SUIT_GENERATIONS[guantes.generacion];
  const potencia = gen?.potencia ?? 0;
  return clamp((SUIT_SLOT_RULES.guantes.riesgoIntimo ?? 0) * (1 + potencia / 12), 0, 0.6);
}

/* ── Reparar (§6.2) ──────────────────────────────────────────────────────────────── */

export function repairCost(traje, slot) {
  const pieza = traje.piezas[slot];
  const base = SUIT_COST[pieza.generacion];
  const falta = 1 - pieza.integridad / (SUIT_GENERATIONS[pieza.generacion].integridadMax || 100);
  return Object.fromEntries(
    Object.entries(base)
      .map(([m, n]) => [m, Math.ceil(n * REPAIR_COST_FACTOR * falta)])
      .filter(([, n]) => n > 0),
  );
}

/**
 * Repairing costs materials AND a block of time, and the block is the real price: it is a
 * block not spent with anyone. Everything in this game competes with the bonds, and this
 * function returns `bloques: 1` so the calendar charges it and the player feels it.
 */
export function repair(traje, slot, materiales) {
  const coste = repairCost(traje, slot);
  if (!Object.entries(coste).every(([m, n]) => (materiales?.[m] ?? 0) >= n)) return null;
  const restantes = { ...materiales };
  for (const [m, n] of Object.entries(coste)) restantes[m] -= n;
  const max = SUIT_GENERATIONS[traje.piezas[slot].generacion].integridadMax;
  return {
    traje: { ...traje, piezas: { ...traje.piezas, [slot]: { ...traje.piezas[slot], integridad: max } } },
    materiales: restantes,
    bloques: 1,
  };
}

/* ── Lo que el traje aporta ──────────────────────────────────────────────────────── */

/**
 * The aggregate. Two things worth reading closely:
 *
 * A destroyed piece contributes NOTHING — its stats disappear until it is rebuilt (§6.2) —
 * and a worn one contributes a fraction, so the suit degrades as a curve and not as a
 * cliff. And concealment is capped at 0.85 whatever the pieces add up to, which is §3.3's
 * promise that no equipment loadout ever makes the hero invisible.
 *
 * `confidentes` is the fifth generation's clause: each person who knows adds to every stat,
 * because the last suit is built with their hands.
 */
export function suitStats(traje, { confidentes = 0 } = {}) {
  const out = { potencia: 0, guardia: 0, velocidad: 0, control: 0, cargaMax: 0, ocultacion: 0, utilidad: 0 };
  if (!traje) return { ...out, ocultacion: 0 };

  for (const slot of SUIT_SLOTS) {
    const pieza = traje.piezas[slot];
    const banda = integrityBand(pieza);
    if (banda.statFactor === 0) continue;
    const gen = SUIT_GENERATIONS[pieza.generacion];
    const regla = SUIT_SLOT_RULES[slot];
    const share = banda.statFactor / SUIT_SLOTS.length;

    // Every slot contributes its sixth of the generation's block, then applies its own
    // characteristic trade on top — which is what makes the six slots differ at all.
    for (const key of ["potencia", "guardia", "velocidad", "control", "cargaMax", "ocultacion"]) {
      out[key] += (gen[key] ?? 0) * share;
    }
    if (regla.da && out[regla.da] !== undefined) out[regla.da] += (gen[regla.da] ?? 0) * share * 0.9;
    if (regla.quita && out[regla.quita] !== undefined) {
      out[regla.quita] -= Math.abs(gen[regla.quita] ?? (regla.quita === "ocultacion" ? 0.08 : 1)) * share * 0.55;
    }
  }

  const bono = confidentes * (SUIT_GENERATIONS[traje.generacion]?.porConfidente ?? 0);
  for (const key of ["potencia", "guardia", "velocidad", "control"]) out[key] += bono;

  return {
    potencia: Math.round(out.potencia),
    guardia: Math.round(out.guardia),
    velocidad: Math.round(out.velocidad),
    control: Math.round(out.control),
    cargaMax: Math.round(out.cargaMax),
    utilidad: Math.round(out.utilidad),
    ocultacion: clamp(out.ocultacion, 0, OCCULTATION_CAP),
  };
}

/** What the workshop screen prints per slot: what you gain, what you pay, how worn it is. */
export function describeSlot(traje, slot) {
  const pieza = traje.piezas[slot];
  const banda = integrityBand(pieza);
  return {
    slot,
    generacion: pieza.generacion,
    integridad: Math.round(pieza.integridad),
    banda: banda.id,
    reconocible: banda.reconocible,
    dejaFragmentos: banda.fragmentoP > 0,
    da: SUIT_SLOT_RULES[slot].da,
    quita: SUIT_SLOT_RULES[slot].quita,
  };
}

export const MATERIAL_LIST = MATERIALS;
