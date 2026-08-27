/**
 * Vínculos, coartadas y confidentes (§2, §3.5, §7.2). PURE.
 *
 * THE PARADOX IS THIS FILE'S ONLY REAL JOB. Raising a bond protects you: alibis, help,
 * materials, techniques. Raising a bond exposes you: whoever loves you looks closer, and
 * perceives Íntima clues a stranger could never see. There is no dominant play — the
 * player who isolates himself to stay safe arrives at chapter 10 with nothing, and the one
 * who surrounds himself arrives strong with four dossiers nearly full.
 *
 * So `bonds.js` and `suspicion.js` read the same number in opposite directions, and that
 * is deliberate. `attentionOf` in `suspicion.js` takes the bond as a term that RAISES
 * detection; `alibiFor` here takes the same bond as the thing that BURIES a clue. One
 * number, two consequences, no way to have only the good one.
 *
 * CONFIDANTS INHERIT YOUR PROBLEM (§3.5). Each one is a permanent resource and a new way
 * out for the truth: they can be questioned, followed and used against you. `exposure`
 * below is what charges that, and it is why the "Los dos" ending is the hardest in the
 * game rather than simply the nicest.
 */

import { chance, clamp } from "./rng.js";
import { BOND_MAX, BOND_MIN, BLOCK_ACTION_RULES, DOSSIERS, SKIPPED_MORNING } from "./tables.js";

/* ── Estado ──────────────────────────────────────────────────────────────────────── */

export function createBonds() {
  return {
    vinculos: Object.fromEntries(Object.entries(DOSSIERS).map(([id, d]) => [id, d.vinculoInicial])),
    coartadasUsadas: {},
    favoresUsados: {},
  };
}

export function bondOf(state, id) {
  return clamp(state.vinculos[id] ?? 0, BOND_MIN, BOND_MAX);
}

export function setBond(state, id, valor) {
  return { ...state, vinculos: { ...state.vinculos, [id]: clamp(valor, BOND_MIN, BOND_MAX) } };
}

export function adjustBond(state, id, delta) {
  if (state.vinculos[id] === undefined) return state;
  return setBond(state, id, bondOf(state, id) + delta);
}

/* ── Lo que hacen los bloques (§7.2) ─────────────────────────────────────────────── */

/** Spending an afternoon with someone. The plainest, most expensive thing in the game. */
export function spendTimeWith(state, id) {
  return adjustBond(state, id, BLOCK_ACTION_RULES.quedar.vinculo);
}

/** Turning up to the things you are supposed to turn up to. */
export function keepObligation(state, ids = []) {
  return ids.reduce((acc, id) => adjustBond(acc, id, BLOCK_ACTION_RULES.obligacion.vinculo), state);
}

/**
 * Missing the morning. §7.1 charges it to Requena and to your mother, and it opens a
 * Temporal clue if the hero was out that morning — the two halves of the same absence.
 */
export function missObligation(state, ids = ["requena", "carmen"]) {
  return ids.reduce((acc, id) => adjustBond(acc, id, SKIPPED_MORNING.vinculo), state);
}

/** Missing something that was actually about someone: a birthday, a hospital shift. */
export function missPersonalEvent(state, id, peso = 2) {
  return adjustBond(state, id, -peso);
}

/* ── Coartadas (§3.2, §7.2) ──────────────────────────────────────────────────────── */

/**
 * Who could cover for you right now, and at what price.
 *
 * The gate is bond ≥ 3, the same gate that makes Íntima clues visible — which is the
 * paradox stated as a single number. The people who can lie for you are, to the letter,
 * the people who can tell you are lying.
 *
 * A confidant gives it free and automatically once a chapter (Nuria, §8.1). Anyone else
 * spends a point of bond, because asking someone to cover for you without telling them why
 * costs something real and the game should charge it.
 */
export function alibiCandidates(state, { capitulo = 1, confidentes = [] } = {}) {
  return Object.keys(state.vinculos)
    .filter((id) => bondOf(state, id) >= 3)
    .map((id) => {
      const esConfidente = confidentes.includes(id);
      const usada = state.coartadasUsadas[`${id}:${capitulo}`];
      return {
        id,
        vinculo: bondOf(state, id),
        automatica: esConfidente,
        disponible: !(esConfidente && usada),
        costeVinculo: esConfidente ? 0 : 1,
      };
    })
    .filter((c) => c.disponible)
    .sort((a, b) => b.vinculo - a.vinculo);
}

/**
 * Use one. Returns the new bond state plus the clue type it can bury — a Temporal clue,
 * because an alibi is by definition an answer to "where were you".
 */
export function useAlibi(state, id, { capitulo = 1, confidentes = [] } = {}) {
  const candidato = alibiCandidates(state, { capitulo, confidentes }).find((c) => c.id === id);
  if (!candidato) return null;
  let next = { ...state, coartadasUsadas: { ...state.coartadasUsadas, [`${id}:${capitulo}`]: true } };
  if (candidato.costeVinculo) next = adjustBond(next, id, -candidato.costeVinculo);
  return { state: next, cubre: "temporal", por: id };
}

/* ── Confidentes (§3.5) ──────────────────────────────────────────────────────────── */

/**
 * What each ally grants once their dossier closes. These are permanent resources, and each
 * one is also a new mouth. `RESOURCES` is the good half; `exposure` below is the bill.
 */
export const CONFIDANT_RESOURCES = {
  nuria:    { recurso: "coartadaAutomatica", porCapitulo: 1 },
  isma:     { recurso: "limpiezaDigital", porCapitulo: 2, fallaP: 0.25 },
  julia:    { recurso: "acceso", porCapitulo: 1 },
  requena:  { recurso: "laboratorio", porCapitulo: 1 },
  yusuf:    { recurso: "taller", porCapitulo: 2 },
  carmen:   { recurso: "curas", porCapitulo: 1 },
  tomas:    { recurso: "red", porCapitulo: 1 },
  iria:     { recurso: "informacion", porCapitulo: 1 },
};

export function resourcesOf(confidentes = []) {
  return confidentes.map((id) => CONFIDANT_RESOURCES[id]).filter(Boolean);
}

/**
 * Isma's clause, and the reason he is written as a fifteen-year-old with shaking hands
 * rather than as a tool: every time you use him there is a chance he makes it worse. The
 * failure is not flavour — it returns `empeora`, and the caller files a fresh Digital clue.
 */
export function useConfidant(next, state, id, { capitulo = 1 } = {}) {
  const def = CONFIDANT_RESOURCES[id];
  if (!def) return null;
  const clave = `${id}:${capitulo}`;
  const usados = state.favoresUsados[clave] ?? 0;
  if (usados >= def.porCapitulo) return null;

  const falla = def.fallaP ? chance(next, def.fallaP) : false;
  return {
    state: { ...state, favoresUsados: { ...state.favoresUsados, [clave]: usados + 1 } },
    recurso: def.recurso,
    empeora: falla,
  };
}

/**
 * The bill for being loved (§3.5). Every confidant is another route by which the truth can
 * leave, so the more people know, the more pressure Sabater's own investigation gathers
 * without the player doing anything wrong at all.
 *
 * Kept deliberately mild per head and superlinear in the count: two people who know is a
 * secret, five people who know is a rumour.
 */
export function exposure(confidentes = []) {
  const n = confidentes.length;
  if (n === 0) return 0;
  return Math.round(n * 2 + n * n * 0.6);
}

/* ── Qué desbloquea el afecto ────────────────────────────────────────────────────── */

/**
 * Bonds are also a progression track (§7.2: "a veces técnicas"). Requena teaches Sentido,
 * La Vigía teaches Luz; here we say at which bond each mentor opens up, so `progress.js`
 * can hand the technique over without knowing anything about affection.
 */
export const BOND_UNLOCKS = {
  requena: [{ vinculo: 3, tecnica: "escucha" }, { vinculo: 4, tecnica: "lectura" }, { vinculo: 5, tecnica: "barrido" }],
  yusuf:   [{ vinculo: 3, material: "cobre" }, { vinculo: 4, descuento: 0.2 }],
  isma:    [{ vinculo: 4, recurso: "carpetaTeorias" }],
  julia:   [{ vinculo: 4, recurso: "accesoTorre" }],
  oscar:   [{ vinculo: 3, recurso: "desmentido" }],
};

export function unlocksAt(state, id) {
  const nivel = bondOf(state, id);
  return (BOND_UNLOCKS[id] ?? []).filter((u) => u.vinculo <= nivel);
}

/** Óscar's redemption arc, as a mechanic: he stops being an obstacle and starts refuting. */
export function canDiscredit(state) {
  return bondOf(state, "oscar") >= 3;
}

/** A new chapter clears the per-chapter favour ledger; bonds themselves carry over. */
export function rollChapter(state) {
  return { ...state, coartadasUsadas: {}, favoresUsados: {} };
}
