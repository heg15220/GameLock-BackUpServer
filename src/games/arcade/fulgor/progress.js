/**
 * Nivel, estadísticas, árbol de técnicas y Rango (§5.1, §5.3, §4.5). PURE.
 *
 * The progression spine of the game is NOT the level: it is the affinities (§5.3). Dani
 * starts as pure Rayo and learns Luz in chapter 6, Materia in 9 and Sombra — his
 * antagonist's own affinity — in 11, as a narrative act. Levels make the numbers move;
 * affinities change what the player is able to think about doing. This module keeps both,
 * and keeps them separate.
 *
 * RANK IS A DOUBLE-EDGED RESOURCE (§7, §8.2). It buys the city's help and Marga's
 * headlines, and it feeds Sabater's interest at six points a rung. Fame in this game is
 * literally the thing that gets you caught, so `rank` is not a score and never renders as
 * one.
 */

import { clamp } from "./rng.js";
import {
  AFFINITIES,
  AFFINITY_UNLOCK_CHAPTER,
  MAX_LEVEL,
  POINTS_PER_LEVEL,
  RANK_MAX,
  RANK_MIN,
  STARTING_TECHNIQUES,
  START_STATS,
  STATS,
  STAT_MAX,
  STAT_MIN,
  TECHNIQUES,
  TECHNIQUE_SLOTS,
  TRAINING_DIMINISH_AT,
  TRAINING_GAIN,
  XP_CURVE,
  DISTRICTS,
} from "./tables.js";

/* ── Estado ──────────────────────────────────────────────────────────────────────── */

export function createProgress() {
  return {
    nivel: 1,
    xp: 0,
    puntosLibres: 0,
    stats: { ...START_STATS },
    afinidades: ["rayo"],
    aprendidas: [...STARTING_TECHNIQUES],
    equipadas: STARTING_TECHNIQUES.slice(0, TECHNIQUE_SLOTS),
    rango: 0,
    entrenamientos: {},
    materiales: { cobre: 0, fibra: 0, ceramica: 0, neodimio: 0, optica: 0, nucleo: 0 },
    dinero: 0,
  };
}

/* ── Nivel ───────────────────────────────────────────────────────────────────────── */

export function xpToNext(nivel) {
  return XP_CURVE(nivel);
}

/**
 * Gain experience, levelling as many times as it takes. Free points accumulate rather than
 * auto-spending: three points a level is a decision the player makes, and taking it away
 * would remove the only build choice the hero has.
 */
export function gainXp(prog, cantidad) {
  let { nivel, xp, puntosLibres } = prog;
  xp += Math.max(0, cantidad);
  const subidas = [];
  while (nivel < MAX_LEVEL && xp >= xpToNext(nivel)) {
    xp -= xpToNext(nivel);
    nivel += 1;
    puntosLibres += POINTS_PER_LEVEL;
    subidas.push(nivel);
  }
  return { ...prog, nivel, xp, puntosLibres, subidas };
}

export function spendPoint(prog, stat) {
  if (!STATS.includes(stat) || prog.puntosLibres <= 0) return prog;
  if (prog.stats[stat] >= STAT_MAX) return prog;
  return {
    ...prog,
    puntosLibres: prog.puntosLibres - 1,
    stats: { ...prog.stats, [stat]: clamp(prog.stats[stat] + 1, STAT_MIN, STAT_MAX) },
  };
}

/* ── Entrenamiento (§5.1) ────────────────────────────────────────────────────────── */

/**
 * Training points scattered around Marés, each specialised: the breakwater raises Cuerpo,
 * the substation raises Aguante, the school roof raises Velocidad. Diminishing after six
 * visits, so a player cannot grind one bench into a god — and because a block spent
 * training is a block not spent with anyone, the diminishing return is what stops the
 * optimal play from being "never see your family".
 */
export function trainAt(prog, distrito) {
  const stat = DISTRICTS[distrito]?.entrena;
  if (!stat) return null;
  const veces = prog.entrenamientos[distrito] ?? 0;
  const rinde = veces < TRAINING_DIMINISH_AT || veces % 2 === 0;
  const entrenamientos = { ...prog.entrenamientos, [distrito]: veces + 1 };
  if (!rinde) return { ...prog, entrenamientos, ganado: null };
  return {
    ...prog,
    entrenamientos,
    stats: { ...prog.stats, [stat]: clamp(prog.stats[stat] + TRAINING_GAIN, STAT_MIN, STAT_MAX) },
    ganado: stat,
  };
}

/* ── Afinidades: la espina dorsal (§5.3) ─────────────────────────────────────────── */

export function hasAffinity(prog, afinidad) {
  return prog.afinidades.includes(afinidad);
}

export function learnAffinity(prog, afinidad) {
  if (!AFFINITIES.includes(afinidad) || hasAffinity(prog, afinidad)) return prog;
  return { ...prog, afinidades: [...prog.afinidades, afinidad] };
}

/** Which affinities the story has reached by this chapter, so `story.js` can hand them over. */
export function affinitiesByChapter(capitulo) {
  return AFFINITIES.filter((a) => AFFINITY_UNLOCK_CHAPTER[a] <= capitulo);
}

/* ── El libro de técnicas ────────────────────────────────────────────────────────── */

/**
 * Whether a technique's unlock condition is met. The four kinds of key are the four ways
 * the design hands power over — the story, an affinity, a mentor's affection, and a
 * defeated villain — and keeping them as one parsed string means adding a forty-first
 * technique is a line in `tables.js` and nothing here.
 */
export function isUnlocked(id, { prog, capitulo = 1, mentores = [], villanos = [] }) {
  const tech = TECHNIQUES[id];
  if (!tech) return false;
  const [tipo, valor] = String(tech.unlock).split(":");
  if (tipo === "start") return true;
  if (tipo === "afinidad") return hasAffinity(prog, valor);
  if (tipo === "mentor") return mentores.includes(valor);
  if (tipo === "villano") return villanos.includes(valor);
  if (tipo === "historia") return capitulo >= Number(valor.replace("c", ""));
  return false;
}

export function learnableNow(ctx) {
  return Object.keys(TECHNIQUES).filter(
    (id) => !ctx.prog.aprendidas.includes(id) && isUnlocked(id, ctx),
  );
}

export function learn(prog, id) {
  if (!TECHNIQUES[id] || prog.aprendidas.includes(id)) return prog;
  return { ...prog, aprendidas: [...prog.aprendidas, id] };
}

/**
 * Six slots, exactly like the hissatsu slots of the reference. Equipping a seventh is
 * refused rather than silently dropping one, because a loadout the player did not choose
 * is the kind of thing that loses a duel and gets blamed on the dice.
 */
export function equip(prog, id, ranura = null) {
  if (!prog.aprendidas.includes(id)) return prog;
  const equipadas = [...prog.equipadas];
  if (ranura !== null && ranura >= 0 && ranura < TECHNIQUE_SLOTS) {
    equipadas[ranura] = id;
  } else {
    if (equipadas.includes(id)) return prog;
    if (equipadas.length >= TECHNIQUE_SLOTS) return prog;
    equipadas.push(id);
  }
  return { ...prog, equipadas: equipadas.filter(Boolean).slice(0, TECHNIQUE_SLOTS) };
}

export function unequip(prog, id) {
  return { ...prog, equipadas: prog.equipadas.filter((t) => t !== id) };
}

/**
 * Fills the EMPTY slots with the best of what has just been learned.
 *
 * Learning and equipping are different things, and keeping them apart is right: which six
 * you carry is the only build decision the hero has (§5.5). But a chapter that teaches nine
 * Light techniques and leaves the player fighting with the four he started with in chapter 2
 * is not preserving a decision — it is hiding the new toys behind a screen the player may
 * never open. So empty slots fill themselves, and full ones are never touched.
 *
 * `preferir` lets a caller weigh what "best" means — the balance simulator's four policies
 * disagree about it on purpose, which is the whole point of them.
 */
export function autoEquip(prog, { preferir = null } = {}) {
  const libres = TECHNIQUE_SLOTS - prog.equipadas.filter(Boolean).length;
  if (libres <= 0) return prog;

  const puntuar = preferir ?? ((id) => (TECHNIQUES[id].poder ?? 0) - TECHNIQUES[id].vis * 4);
  const candidatas = prog.aprendidas
    .filter((id) => !prog.equipadas.includes(id))
    .sort((a, b) => puntuar(b) - puntuar(a))
    .slice(0, libres);

  return candidatas.reduce((acc, id) => equip(acc, id), prog);
}

/**
 * Swaps the loadout wholesale for the best six by a given preference — what a player does at
 * the workshop after a chapter hands him nine new techniques.
 */
export function refitLoadout(prog, { preferir = null } = {}) {
  const puntuar = preferir ?? ((id) => (TECHNIQUES[id].poder ?? 0) - TECHNIQUES[id].vis * 4);
  const mejores = [...prog.aprendidas].sort((a, b) => puntuar(b) - puntuar(a)).slice(0, TECHNIQUE_SLOTS);
  return { ...prog, equipadas: mejores };
}

/** Are the six equipped techniques usable at all? A slot holding a locked id is a bug. */
export function loadoutIsValid(prog) {
  return prog.equipadas.every((id) => prog.aprendidas.includes(id))
    && prog.equipadas.length <= TECHNIQUE_SLOTS
    && new Set(prog.equipadas).size === prog.equipadas.length;
}

/* ── Rango (§4.5, §8.2) ──────────────────────────────────────────────────────────── */

/**
 * What the city thinks it knows. Rises with clean results, falls with failures, and every
 * rung of it is six points of Sabater's attention — which `suspicion.applyRank` charges,
 * not this module. Keeping the payment on the other side of the wall is what stops rank
 * from ever being read as a score.
 */
export function adjustRank(prog, delta) {
  return { ...prog, rango: clamp(prog.rango + delta, RANK_MIN, RANK_MAX) };
}

/** Materials and money, from interventions, skirmishes and errands with Yusuf (§6.4). */
export function gainMaterials(prog, ganancias = {}, factor = 1) {
  const materiales = { ...prog.materiales };
  for (const [m, n] of Object.entries(ganancias)) {
    materiales[m] = (materiales[m] ?? 0) + Math.round(n * factor);
  }
  return { ...prog, materiales };
}

export function gainMoney(prog, cantidad) {
  return { ...prog, dinero: Math.max(0, prog.dinero + cantidad) };
}

/* ── El bloque de estadísticas efectivo ──────────────────────────────────────────── */

/**
 * The stats that actually go into a duel: the hero plus what the suit contributes. Every
 * caller uses this rather than `prog.stats`, so nobody has to remember to add the suit —
 * forgetting once would make a whole screen quietly wrong.
 */
export function effectiveStats(prog, statsTraje = {}) {
  const out = { ...prog.stats };
  for (const key of STATS) {
    out[key] = clamp(out[key] + (statsTraje[key] ?? 0), STAT_MIN, STAT_MAX);
  }
  return out;
}

/** XP awarded for a duel, scaled by what it was against. Contener grants none, by design. */
export function duelXp({ nivelRival = 1, contenido = false, decisiva = false } = {}) {
  if (contenido) return 0;
  return Math.round((8 + nivelRival * 4) * (decisiva ? 2.5 : 1));
}
