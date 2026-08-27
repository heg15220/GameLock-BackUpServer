/**
 * El Duelo (§5). PURE.
 *
 * The scene freezes, the lower panel fills with commands, and a dice roll happens behind
 * a cut of camera. This is Level-5's real trick and the reason the mould works on a phone
 * at all: skill lives in the choice and the position, never in the reflexes, so there is
 * no collision detection, no 60 fps input window, and nothing here that a slow finger
 * loses (§1.2).
 *
 * TWO RESOURCES, TWO DIFFERENT PUNISHMENTS (§5.2). Carga is spent and buys spectacle;
 * running out means you still have your fists. Compostura is worn down and buys
 * everything else; running out means you fall. They are deliberately not two health bars:
 * Compostura's punishment is a ladder of qualitative losses, and the rung that matters
 * most is the third one, where **being tired raises the visibility of everything you do**.
 * That single line is where pillar 1 and pillar 3 meet, and it is why exhaustion in this
 * game does not merely make you lose — it makes you get caught.
 *
 * WHAT THIS MODULE DOES NOT DO. It never decides whether a clue was generated; it reports
 * the visibility of what happened and `suspicion.js` decides who saw it. Keeping those
 * apart is what lets the duel panel print the visibility dots BEFORE the player commits
 * (§5.5) without the act of previewing advancing a single random stream.
 */

import { clamp } from "./rng.js";
import {
  AFFINITY_BEATS,
  AFFINITY_BONUS,
  BASIC_ACTION_RULES,
  CARGA_BASE,
  CARGA_PER_AGUANTE,
  CARGA_SOURCE_REFILL,
  COMPOSTURA_BASE,
  COMPOSTURA_PER_TEMPLE,
  COMPOSURE_TIERS,
  CONTAIN,
  DUEL,
  FAMILY_RULES,
  POSITION_BONUS,
  STAT_ROLES,
  TECHNIQUES,
  TEMPLE_BONUS,
  TEMPLE_BONUS_AT,
} from "./tables.js";

/* ── Los dos recursos (§5.2) ─────────────────────────────────────────────────────── */

export function maxCarga(stats, bonoTraje = 0) {
  return Math.round(CARGA_BASE + (stats?.aguante ?? 0) * CARGA_PER_AGUANTE + bonoTraje);
}

export function maxCompostura(stats) {
  return Math.round(COMPOSTURA_BASE + (stats?.temple ?? 0) * COMPOSTURA_PER_TEMPLE);
}

/**
 * The composure ladder, with the difficulty offset applied to every rung at once.
 *
 * §10 asks that the steps "start 15 lower" on Leyenda urbana and "10 higher" on Sin
 * máscara. Shifting the rungs rather than writing three tables is what keeps the
 * qualitative shape of the punishment identical in all three modes: the same things break
 * in the same order, you just have more or less room before they do.
 */
export function composureTier(compostura, dif = null) {
  const offset = dif?.composturaOffset ?? 0;
  const pct = clamp(compostura, 0, 100);
  for (const tier of COMPOSURE_TIERS) {
    if (pct >= Math.max(0, tier.min + offset)) return tier;
  }
  return COMPOSURE_TIERS[COMPOSURE_TIERS.length - 1];
}

export function hasFallen(compostura) {
  return compostura <= 0;
}

/* ── Afinidades (§5.3) ───────────────────────────────────────────────────────────── */

/**
 * ±0.13, the same weight the reference gives its elements. `AFFINITY_BEATS` resolves the
 * direction; see the note at the top of `tables.js` for why Materia beats Rayo and not the
 * other way round.
 */
export function affinityBonus(atacante, defensor) {
  if (!atacante || !defensor || atacante === defensor) return 0;
  if (AFFINITY_BEATS[atacante] === defensor) return AFFINITY_BONUS;
  if (AFFINITY_BEATS[defensor] === atacante) return -AFFINITY_BONUS;
  return 0;
}

/* ── El menú de acciones (§5.5) ──────────────────────────────────────────────────── */

/**
 * Every action is normalised to the same shape before anything looks at it, so that a
 * punch, a hissatsu and pulling down a scaffold are all the same kind of thing to the
 * resolver. `fuente` is only kept so the panel can group them in the order §5.5 fixes:
 * básicas, técnicas, entorno, contener.
 */
export function describeAction(accionId, { nodo = null } = {}) {
  if (BASIC_ACTION_RULES[accionId]) {
    const r = BASIC_ACTION_RULES[accionId];
    return { id: accionId, fuente: "basica", familia: null, afinidad: null, carga: 0, ...r };
  }
  if (accionId === "contener") {
    return { id: "contener", fuente: "contener", familia: null, afinidad: null, carga: 0, resolves: true, ...CONTAIN };
  }
  const tech = TECHNIQUES[accionId];
  if (tech) {
    return {
      id: accionId,
      fuente: "tecnica",
      familia: tech.familia,
      afinidad: tech.afinidad,
      carga: tech.carga,
      vis: tech.vis,
      poder: tech.poder,
      stat: FAMILY_RULES[tech.familia].stat,
      // Sólo un efecto declarado termina un duelo de un golpe. Todo lo demás lo termina
      // agotando la Compostura del rival, que es lo que hace que un duelo sea un duelo.
      resolves: tech.efecto === "resuelveDuelo" || tech.efecto === "resuelveNodo",
      ofensiva: FAMILY_RULES[tech.familia].ofensiva,
      efecto: tech.efecto,
      pistaGarantizada: tech.pistaGarantizada ?? null,
      opposed: FAMILY_RULES[tech.familia].opposed,
    };
  }
  const entorno = nodo?.entorno?.find((e) => e.id === accionId);
  if (entorno) {
    // El entorno hace daño, y a veces mucho, pero tampoco termina un duelo por decreto:
    // tirar un andamio encima de alguien lo deja sin Compostura, que es otra cosa.
    return { id: accionId, fuente: "entorno", familia: null, afinidad: entorno.afinidad ?? null, carga: 0, resolves: false, ofensiva: true, ...entorno };
  }
  return null;
}

/**
 * What the lower panel offers, in §5.5's order, with everything the player needs to judge
 * the trade already attached: cost, affinity, and the visibility dots.
 *
 * `disponible: false` is returned rather than the entry being dropped, because a technique
 * greyed out for want of Carga still tells the player something — it says the battery is
 * the reason, and a lamppost is a turn away.
 */
export function actionMenu(heroe, { nodo = null, dif = null } = {}) {
  const tier = composureTier(heroe.compostura, dif);
  const entries = [];

  for (const id of Object.keys(BASIC_ACTION_RULES)) {
    entries.push({ ...describeAction(id), disponible: true, visibilidadReal: visibilityOf(describeAction(id), heroe, dif) });
  }

  for (const id of heroe.equipadas ?? []) {
    const a = describeAction(id, { nodo });
    if (!a) continue;
    const sinCarga = a.carga > heroe.carga;
    const bloqueada = tier.bloquea.includes(a.familia);
    entries.push({
      ...a,
      disponible: !sinCarga && !bloqueada,
      motivo: bloqueada ? "compostura" : sinCarga ? "carga" : null,
      visibilidadReal: visibilityOf(a, heroe, dif),
    });
  }

  for (const e of nodo?.entorno ?? []) {
    const a = describeAction(e.id, { nodo });
    entries.push({ ...a, disponible: !e.usado, motivo: e.usado ? "agotado" : null, visibilidadReal: visibilityOf(a, heroe, dif) });
  }

  entries.push({ ...describeAction("contener"), disponible: true, visibilidadReal: 0 });
  return entries;
}

/**
 * The dots the player sees before choosing.
 *
 * Being worn out adds one (§5.2's third rung), and that is deliberately shown here rather
 * than hidden until after the roll: the design's promise is that "el jugador nunca se
 * delata sin saber que se estaba delatando", and a hidden penalty would break it in the
 * exact situation where the player most needs the warning.
 */
export function visibilityOf(accion, heroe, dif = null) {
  if (!accion) return 0;
  const base = accion.vis ?? 0;
  if (base <= 0) return 0; // Sentido y las rutas de sombra son inmunes al cansancio.
  const tier = composureTier(heroe?.compostura ?? 100, dif);
  return clamp(base + tier.visExtra, 0, 3);
}

/* ── Resolución (§5.4) ───────────────────────────────────────────────────────────── */

/**
 * The formula of §5.4, term by term, returning its own breakdown.
 *
 * The breakdown is not debug furniture: the panel shows the player where his odds came
 * from, and a game whose whole subject is information management cannot be coy about its
 * own arithmetic.
 *
 * Floor 5%, ceiling 95% — 90% on Sin máscara. The floor is never moved by anything,
 * including difficulty: "nada es seguro y nada es imposible" is what keeps eight hours of
 * duels from becoming arithmetic, and a mode that made something impossible would be
 * removing the tension rather than raising it.
 */
export function successChance({ accion, atacante, defensor = null, defensa = null, nodo = null, dif = null }) {
  const statKey = accion?.stat ?? "potencia";
  const mine = atacante.stats?.[statKey] ?? 0;

  const opposedKey = STAT_ROLES[statKey]?.opposedBy ?? "guardia";
  const theirs = accion?.opposed === false || !defensor ? 0 : defensor.stats?.[opposedKey] ?? 0;

  const poder = accion?.poder ?? 0;
  const resistencia = defensa?.poder ?? 0;

  const tier = composureTier(atacante.compostura, dif);
  const temple = atacante.compostura > TEMPLE_BONUS_AT ? TEMPLE_BONUS : 0;
  const posicion = POSITION_BONUS[nodo?.ventaja ?? "ninguna"] ?? 0;
  const afinidad = affinityBonus(accion?.afinidad ?? atacante.afinidad, defensor?.afinidad ?? null);

  const terminos = {
    base: DUEL.base,
    stats: (mine - theirs) * DUEL.porStat,
    poder: (poder - resistencia) * DUEL.porPoder,
    afinidad,
    posicion,
    temple,
    compostura: tier.exito,
    anticipo: atacante.bonoProximaAccion ?? 0,
  };

  const bruto = Object.values(terminos).reduce((a, b) => a + b, 0);
  const techo = dif?.techoExito ?? DUEL.techoExito;
  return { p: clamp(bruto, DUEL.sueloExito, techo), terminos, techo, suelo: DUEL.sueloExito };
}

/**
 * One exchange. Returns the new pair of combatants and a report of what happened, which
 * the caller hands to `suspicion.js` (for the clue roll) and to `scene.jsx` (for the cut).
 *
 * Note that a FAILED action still has its visibility. Missing loudly is the single most
 * characteristic way to get caught in this game, and it falls straight out of resolving
 * exposure independently of success.
 */
export function resolveAction(next, { accion, atacante, defensor = null, defensa = null, nodo = null, dif = null }) {
  if (!accion) throw new Error("resolveAction sin acción");

  const { p, terminos } = successChance({ accion, atacante, defensor, defensa, nodo, dif });
  const roll = next();
  const exito = roll < p;

  const tier = composureTier(atacante.compostura, dif);
  const visibilidad = visibilityOf(accion, atacante, dif);

  let heroe = { ...atacante, carga: Math.max(0, atacante.carga - (accion.carga ?? 0)), bonoProximaAccion: 0 };
  let rival = defensor ? { ...defensor } : null;

  // Damage is spent on Composure, never on a hit-point pool: this game does not kill (§17).
  const dano = exito ? Math.round(6 + (accion.poder ?? 0) * 0.55) : 0;
  if (rival && dano) {
    const absorbido = Math.round(dano * clamp(1 - (rival.stats?.guardia ?? 0) * 0.006, 0.35, 1));
    rival = { ...rival, compostura: Math.max(0, rival.compostura - absorbido) };
  }
  // Failing costs the attacker composure too — flailing is tiring and it is seen.
  if (!exito) heroe = { ...heroe, compostura: Math.max(0, heroe.compostura - 6) };

  // Torpeza: at the fourth rung, a quarter of everything you do leaves an extra trace.
  const torpe = tier.torpeza > 0 && next() < tier.torpeza;

  const resuelto =
    accion.id === "contener" ? "contenido"
      : exito && (accion.resolves || (rival && rival.compostura <= 0)) ? "ganado"
        : null;

  return {
    heroe,
    rival,
    reporte: {
      accionId: accion.id,
      familia: accion.familia,
      afinidad: accion.afinidad,
      exito,
      p,
      roll,
      terminos,
      dano,
      visibilidad: clamp(visibilidad + (torpe ? 1 : 0), 0, 3),
      torpe,
      resuelto,
      pistaGarantizada: accion.pistaGarantizada ?? null,
      turnos: accion.turnos ?? 1,
      cut: accion.fuente === "tecnica",
    },
  };
}

/* ── El paso de turno ────────────────────────────────────────────────────────────── */

/** Carga regenerates every turn at the rate the difficulty row names (§5.2, §10). */
export function tick(combatiente, { dif = null, techo = null } = {}) {
  const regen = dif?.cargaRegen ?? 8;
  const max = techo ?? maxCarga(combatiente.stats, combatiente.bonoCargaTraje ?? 0);
  return { ...combatiente, carga: Math.min(max, combatiente.carga + regen) };
}

/** A turn spent touching a live source refills the battery (§5.2). */
export function drawFromSource(combatiente, { techo = null } = {}) {
  const max = techo ?? maxCarga(combatiente.stats, combatiente.bonoCargaTraje ?? 0);
  return { ...combatiente, carga: Math.round(max * CARGA_SOURCE_REFILL) };
}

/* ── Lo que el rival hace (§4.4: "un antagonista con su propio bucle") ───────────── */

/**
 * The opponent's policy, kept deliberately legible so that the Sentido family has
 * something real to read. `Lectura` promises to show the rival's next action; that promise
 * is only honest if the decision is deterministic given the state, which it is here.
 */
export function rivalIntent(rival, heroe, { nodo = null, dif = null } = {}) {
  const opciones = (rival.tecnicas ?? [])
    .map((id) => describeAction(id, { nodo }))
    .filter((a) => a && a.carga <= rival.carga);

  if (!opciones.length) return describeAction("golpear");

  // Low on composure, an opponent defends; otherwise it takes its best odds.
  if (rival.compostura < 30) {
    const escudo = opciones.find((a) => a.familia === "escudo");
    if (escudo) return escudo;
  }
  return opciones.reduce((mejor, a) => {
    const pa = successChance({ accion: a, atacante: rival, defensor: heroe, nodo, dif }).p;
    const pm = successChance({ accion: mejor, atacante: rival, defensor: heroe, nodo, dif }).p;
    return pa * (a.poder || 1) > pm * (mejor.poder || 1) ? a : mejor;
  }, opciones[0]);
}

/* ── Utilidad: el compromiso que el jugador negocia todo el rato (§2, pilar 3) ───── */

/**
 * Scores an action the way the player is being asked to: odds of it working, weighed
 * against how much it exposes him. `pesoSigilo` is how much this particular moment cares
 * about not being seen — zero in an empty alley at 4am, high in La Concha with a crowd
 * filming.
 *
 * This exists so `duel.test.js` can ask the design's own question — is any technique
 * dominant? — as arithmetic rather than as opinion, and so the AI and the tutorial can
 * both reason about "good play" with the same function the design defines it with.
 */
export function utility(accion, ctx) {
  const { p } = successChance({ ...ctx, accion });
  const vis = visibilityOf(accion, ctx.atacante, ctx.dif);
  const pesoSigilo = ctx.pesoSigilo ?? 0;
  const cargaLibre = ctx.atacante.carga ?? 0;
  if ((accion.carga ?? 0) > cargaLibre) return -Infinity;

  const ganancia = p * (1 + (accion.poder ?? 0) / 30) * (accion.resolves ? 1.5 : 1);
  const riesgo = vis * pesoSigilo;
  const coste = (accion.carga ?? 0) / Math.max(1, cargaLibre) * 0.35;
  return ganancia - riesgo - coste;
}
