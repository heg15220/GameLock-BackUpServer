/**
 * La Intervención (§4). PURE.
 *
 * The repeatable ritual — the "match". One system, two scales: a three-node Escaramuza
 * off a night patrol, and a fourteen-node Intervención decisiva at the end of a chapter.
 * Never two combat systems (§1.1).
 *
 * FOUR THINGS EVERY INTERVENTION HAS, and each one is a design commitment this module
 * has to keep honest:
 *
 *  1. A CLOCK THAT IS NOT A FAILURE TIMER. It is a worsening meter. Every turn spent makes
 *     the situation concretely worse — the fire climbs a floor, the thief reaches the car —
 *     and `nextEscalation` exists so the panel can always print what is about to happen.
 *     A clock the player cannot read is just punishment.
 *
 *  2. A SCENARIO THAT IS ALWAYS SOLVABLE. `intervention.test.js` proves the graph is
 *     connected and that every objective is reachable inside the clock from any valid
 *     route. A generated scenario that cannot be won is the worst bug this game could
 *     ship, because the player would read it as his own failure.
 *
 *  3. WITNESSES PLACED IN THE OPEN. Visible before the first move (§4.1): "la información
 *     nunca es una trampa". This module never hides a witness, and the one technique that
 *     reveals more — Barrido — reveals *cameras*, not people.
 *
 *  4. NO RETRY. `settle` grades what happened and the story moves on (§4.5). There is no
 *     `restart` in this file on purpose.
 */

import { chance, clamp, pick, randInt, shuffle } from "./rng.js";
import {
  DISTRICTS,
  RESULT_RULES,
  ROUTE_COST,
  ROUTE_SPEED_DISCOUNT_AT,
  SCENARIO_SIZE,
} from "./tables.js";

/* ── Arquetipos de escenario ─────────────────────────────────────────────────────── */

/**
 * §4.3's answer to writing forty skirmishes by hand: a bank of parametrised shapes.
 * Topology is what makes two interventions feel different, so the archetypes are shapes
 * and not decorations — a tower is a line you must climb, a block is a loop you can go
 * round either way, and the choice between them is the whole tactical difference.
 */
export const ARCHETYPES = {
  calle:   { forma: "malla",  sombraRatio: 0.35, ventajas: ["cobertura", "ninguna", "descubierto"] },
  azotea:  { forma: "linea",  sombraRatio: 0.55, ventajas: ["altura", "sombra", "ninguna"] },
  torre:   { forma: "linea",  sombraRatio: 0.25, ventajas: ["altura", "descubierto", "cobertura"] },
  muelle:  { forma: "malla",  sombraRatio: 0.50, ventajas: ["agua", "cobertura", "sombra"] },
  edificio:{ forma: "arbol",  sombraRatio: 0.40, ventajas: ["cobertura", "ninguna", "altura"] },
  plaza:   { forma: "estrella", sombraRatio: 0.15, ventajas: ["descubierto", "ninguna", "cobertura"] },
  tunel:   { forma: "linea",  sombraRatio: 0.75, ventajas: ["sombra", "cobertura", "ninguna"] },
  ruina:   { forma: "malla",  sombraRatio: 0.65, ventajas: ["sombra", "altura", "descubierto"] },
};

/** Which archetypes a district can plausibly host. Marés is small and specific (§7.3). */
export const DISTRICT_ARCHETYPES = {
  aguas:      ["calle", "edificio", "azotea"],
  instituto:  ["edificio", "azotea", "plaza"],
  concha:     ["plaza", "calle", "azotea"],
  puerto:     ["muelle", "tunel", "calle"],
  financiero: ["torre", "plaza", "tunel"],
  faro:       ["azotea", "ruina", "calle"],
  poligono:   ["edificio", "tunel", "ruina"],
  hospital:   ["edificio", "plaza", "calle"],
  tolvas:     ["ruina", "tunel", "torre"],
};

/** What the environment of a node can offer. Always cheap, always quiet, always clever (§5.5). */
const ENVIRONMENT_BANK = {
  altura:      [{ id: "tirarAndamio", stat: "cuerpo", poder: 22, vis: 1 }],
  sombra:      [{ id: "cortarLuz", stat: "control", poder: 18, vis: 0 }],
  agua:        [{ id: "abrirBocaRiego", stat: "control", poder: 20, vis: 1 }],
  cobertura:   [{ id: "volcarContenedor", stat: "cuerpo", poder: 16, vis: 1 }],
  descubierto: [{ id: "subirCatenaria", stat: "velocidad", poder: 14, vis: 2 }],
  ninguna:     [{ id: "cerrarCuadro", stat: "control", poder: 12, vis: 0 }],
};

/* ── Generación del escenario ────────────────────────────────────────────────────── */

/**
 * Builds a spanning tree first and only then adds shortcuts.
 *
 * That order is the whole trick: a spanning tree is connected by construction, so no
 * amount of later randomness can produce an island. `intervention.test.js` still checks
 * it — a guarantee you do not test is a guarantee you used to have.
 */
function buildGraph(next, n, forma) {
  const nodos = Array.from({ length: n }, (_, i) => ({ id: `n${i}` }));
  const aristas = [];
  const link = (a, b) => {
    if (a === b) return;
    if (aristas.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))) return;
    aristas.push({ a, b });
  };

  for (let i = 1; i < n; i += 1) {
    let padre;
    if (forma === "linea") padre = i - 1;
    else if (forma === "estrella") padre = 0;
    else if (forma === "arbol") padre = Math.floor((i - 1) / 2);
    else padre = randInt(next, Math.max(0, i - 3), i - 1); // malla
    link(nodos[padre].id, nodos[i].id);
  }

  // Shortcuts: a scenario with only one route is a corridor, and a corridor has no
  // decision in it. A star keeps none, because its whole point is the forced hub.
  const extra = forma === "estrella" ? 0 : Math.max(1, Math.round(n * (forma === "malla" ? 0.45 : 0.2)));
  for (let k = 0; k < extra; k += 1) {
    link(nodos[randInt(next, 0, n - 1)].id, nodos[randInt(next, 0, n - 1)].id);
  }
  return { nodos, aristas };
}

/** Breadth-first hop count from one node, ignoring turn cost. Used for the reachability guard. */
export function hopDistances(scenario, desde) {
  const vecinos = adjacency(scenario);
  const dist = { [desde]: 0 };
  const cola = [desde];
  while (cola.length) {
    const actual = cola.shift();
    for (const v of vecinos[actual] ?? []) {
      if (dist[v] === undefined) {
        dist[v] = dist[actual] + 1;
        cola.push(v);
      }
    }
  }
  return dist;
}

export function adjacency(scenario) {
  const map = {};
  for (const n of scenario.nodos) map[n.id] = [];
  for (const e of scenario.aristas) {
    map[e.a].push(e.b);
    map[e.b].push(e.a);
  }
  return map;
}

export function isConnected(scenario) {
  const dist = hopDistances(scenario, scenario.nodos[0].id);
  return scenario.nodos.every((n) => dist[n.id] !== undefined);
}

/**
 * The cheapest route between two nodes in TURNS, which is the currency the clock spends.
 *
 * Dijkstra rather than BFS because the two kinds of edge do not cost the same: a visible
 * street is fast and exposed, a shadow route over the rooftops is slow and clean (§4.2).
 * `Velocidad` buys the difference away — at `ROUTE_SPEED_DISCOUNT_AT` a shadow route
 * costs what a street costs, which is the moment the stat stops being a convenience and
 * becomes a way of playing.
 */
export function cheapestRoute(scenario, desde, hasta, { velocidad = 0, dif = null, via = null } = {}) {
  const vecinos = adjacency(scenario);
  const coste = { [desde]: 0 };
  const previo = {};
  const pendientes = new Set(scenario.nodos.map((n) => n.id));

  while (pendientes.size) {
    let actual = null;
    for (const id of pendientes) {
      if (coste[id] === undefined) continue;
      if (actual === null || coste[id] < coste[actual]) actual = id;
    }
    if (actual === null) break;
    pendientes.delete(actual);
    if (actual === hasta) break;

    for (const v of vecinos[actual]) {
      const arista = scenario.aristas.find(
        (e) => (e.a === actual && e.b === v) || (e.a === v && e.b === actual),
      );
      if (via && arista.via !== via) continue;
      const c = coste[actual] + edgeTurns(arista, { velocidad, dif });
      if (coste[v] === undefined || c < coste[v]) {
        coste[v] = c;
        previo[v] = actual;
      }
    }
  }

  if (coste[hasta] === undefined) return null;
  const ruta = [hasta];
  while (ruta[0] !== desde) ruta.unshift(previo[ruta[0]]);
  return { ruta, turnos: coste[hasta], visibilidad: routeVisibility(scenario, ruta) };
}

export function edgeTurns(arista, { velocidad = 0, dif = null } = {}) {
  const base = ROUTE_COST[arista.via].turnos;
  const descuento = arista.via === "sombra" && velocidad >= ROUTE_SPEED_DISCOUNT_AT ? 1 : 0;
  const cansancio = dif?.rutaExtra ?? 0;
  return Math.max(1, base - descuento + cansancio);
}

/** The worst visibility along a route: one exposed street undoes four rooftops. */
export function routeVisibility(scenario, ruta) {
  let peor = 0;
  for (let i = 1; i < ruta.length; i += 1) {
    const arista = scenario.aristas.find(
      (e) => (e.a === ruta[i - 1] && e.b === ruta[i]) || (e.a === ruta[i] && e.b === ruta[i - 1]),
    );
    peor = Math.max(peor, ROUTE_COST[arista.via].visibilidad);
  }
  return peor;
}

/* ── El escenario completo ───────────────────────────────────────────────────────── */

/**
 * `testigos` are placed and returned face-up. The design is emphatic that the player knows
 * who is watching and from where before he moves, so this function has no notion of a
 * hidden witness and no flag that could introduce one.
 */
export function createScenario(next, {
  tipo = "escaramuza",
  distrito = "puerto",
  capitulo = 1,
  arquetipo = null,
  testigos = [],
  dif = null,
  objetivosExtra = [],
} = {}) {
  const size = SCENARIO_SIZE[tipo];
  const n = randInt(next, size.nodos[0], size.nodos[1]);
  const arq = arquetipo ?? pick(next, DISTRICT_ARCHETYPES[distrito] ?? ["calle"]);
  const forma = ARCHETYPES[arq].forma;

  const { nodos: crudos, aristas: crudas } = buildGraph(next, n, forma);

  const nodos = crudos.map((nodo, i) => {
    const ventaja = pick(next, ARCHETYPES[arq].ventajas);
    return {
      id: nodo.id,
      indice: i,
      ventaja,
      // Camera density is a property of the district, so the same rooftop is a different
      // proposition in La Concha than in the Puerto Viejo (§3.3).
      visibilidad: clamp((DISTRICTS[distrito]?.camara ?? 1) * (ventaja === "descubierto" ? 1.4 : ventaja === "sombra" ? 0.4 : 1), 0.2, 2),
      entorno: (ENVIRONMENT_BANK[ventaja] ?? []).map((e) => ({ ...e, usado: false })),
      fuenteElectrica: chance(next, 0.3),
      adversario: null,
      civil: false,
      prueba: null,
    };
  });

  const aristas = crudas.map((e) => ({
    ...e,
    via: chance(next, ARCHETYPES[arq].sombraRatio) ? "sombra" : "visible",
  }));

  const scenario = {
    tipo, distrito, arquetipo: arq, capitulo,
    nodos, aristas,
    entrada: nodos[0].id,
    posicion: nodos[0].id,
    testigos: testigos.map((t) => ({ ...t, nodo: t.nodo ?? pick(next, nodos).id })),
    objetivos: [],
    reloj: { turno: 0, max: 0, agravamientos: [] },
    log: [],
  };

  // Objectives go as far from the entrance as the graph allows, so that the clock has
  // something to be about. `placeObjectives` is also what the reachability guard checks.
  const cuantos = randInt(next, size.objetivos[0], size.objetivos[1]);
  scenario.objetivos = placeObjectives(next, scenario, cuantos, objetivosExtra);

  const turnos = randInt(next, size.turnos[0], size.turnos[1]) + (dif?.relojDelta ?? 0);
  scenario.reloj = {
    turno: 0,
    max: Math.max(minimumTurns(scenario) + 1, turnos),
    agravamientos: buildEscalation(next, scenario, turnos),
  };

  // Adversaries sit on the nodes the objectives are on or next to: a duel is what happens
  // when you arrive somewhere that matters, not a random encounter on the way.
  for (const obj of scenario.objetivos) {
    const nodo = nodos.find((x) => x.id === obj.nodo);
    if (obj.tipo !== "recuperar" && chance(next, 0.7)) {
      nodo.adversario = { plantilla: "cabo", nivel: capitulo };
    }
    if (obj.tipo === "rescatar") nodo.civil = true;
    if (obj.tipo === "recuperar") nodo.prueba = obj.prueba ?? { tipo: "fisica" };
  }

  return scenario;
}

function placeObjectives(next, scenario, cuantos, extra) {
  const dist = hopDistances(scenario, scenario.entrada);
  const ordenados = [...scenario.nodos].sort((a, b) => (dist[b.id] ?? 0) - (dist[a.id] ?? 0));
  const tipos = shuffle(next, ["neutralizar", "rescatar", "desactivar", "recuperar"]);

  const objetivos = [];
  objetivos.push({
    id: "principal",
    principal: true,
    tipo: tipos[0],
    nodo: ordenados[0].id,
    cumplido: false,
  });
  for (let i = 1; i < cuantos; i += 1) {
    const nodo = ordenados[Math.min(i, ordenados.length - 1)];
    objetivos.push({
      id: `opcional${i}`,
      principal: false,
      tipo: tipos[i % tipos.length],
      nodo: nodo.id,
      cumplido: false,
    });
  }
  // The chapter can pin extra objectives: recovering the physical clue you left last time
  // is the design's own example, and it is what makes §3 and §4 one system.
  for (const e of extra) {
    objetivos.push({ id: e.id, principal: false, tipo: e.tipo ?? "recuperar", nodo: e.nodo ?? ordenados[ordenados.length - 1].id, cumplido: false, ...e });
  }
  return objetivos;
}

/** The floor under the clock: you cannot be given less time than the walk itself costs. */
export function minimumTurns(scenario, { velocidad = 0 } = {}) {
  const principal = scenario.objetivos.find((o) => o.principal);
  if (!principal) return 1;
  const ruta = cheapestRoute(scenario, scenario.entrada, principal.nodo, { velocidad });
  return ruta ? ruta.turnos : 1;
}

/**
 * The worsening schedule (§4.1). Concrete, legible, and known one step ahead — the panel
 * prints `nextEscalation` before the player commits a turn, because a clock whose effects
 * are a surprise is a punishment and not a decision.
 */
function buildEscalation(next, scenario, turnos) {
  const catalogo = {
    neutralizar: ["refuerzos", "huida"],
    rescatar: ["humo", "desmayo"],
    desactivar: ["propagacion", "cortocircuito"],
    recuperar: ["barridoPolicial", "lluvia"],
  };
  const principal = scenario.objetivos.find((o) => o.principal);
  const banco = catalogo[principal?.tipo ?? "neutralizar"];
  const eventos = [];
  const primero = Math.max(2, Math.round(turnos * 0.4));
  for (let t = primero; t <= turnos; t += Math.max(2, Math.round(turnos * 0.25))) {
    eventos.push({ turno: t, id: banco[eventos.length % banco.length], severidad: eventos.length + 1 });
  }
  return eventos;
}

/** What the panel prints as "esto es lo que va a empeorar". */
export function nextEscalation(scenario) {
  return scenario.reloj.agravamientos.find((a) => a.turno > scenario.reloj.turno) ?? null;
}

/* ── Movimiento y turnos ─────────────────────────────────────────────────────────── */

/**
 * The drag gesture of §4.2, as a state transition. Returns null if the move is illegal
 * rather than throwing, because an illegal drag is a finger slipping and not a bug.
 */
export function moveTo(scenario, destino, { velocidad = 0, dif = null } = {}) {
  if (destino === scenario.posicion) return null;
  const ruta = cheapestRoute(scenario, scenario.posicion, destino, { velocidad, dif });
  if (!ruta) return null;
  const after = advance(scenario, ruta.turnos);
  return {
    scenario: { ...after, posicion: destino },
    ruta,
  };
}

/** Spend turns. The clock only ever moves forward (§14.3). */
export function advance(scenario, turnos = 1) {
  const turno = scenario.reloj.turno + Math.max(1, turnos);
  const disparados = scenario.reloj.agravamientos.filter(
    (a) => a.turno > scenario.reloj.turno && a.turno <= turno,
  );
  return {
    ...scenario,
    reloj: { ...scenario.reloj, turno },
    log: [...scenario.log, ...disparados.map((a) => ({ turno: a.turno, agravamiento: a.id }))],
  };
}

export function timeUp(scenario) {
  return scenario.reloj.turno >= scenario.reloj.max;
}

export function completeObjective(scenario, objetivoId) {
  return {
    ...scenario,
    objetivos: scenario.objetivos.map((o) => (o.id === objetivoId ? { ...o, cumplido: true } : o)),
  };
}

/** Free movement — Paso Corto and Relámpago (§5.7) — moves without spending the clock. */
export function teleport(scenario, destino) {
  return scenario.nodos.some((n) => n.id === destino) ? { ...scenario, posicion: destino } : scenario;
}

/* ── El balance final (§4.5) ─────────────────────────────────────────────────────── */

/**
 * Grades what happened. Note what is NOT here: a retry, a score, and any notion of the
 * player deserving another go. §4.5 is explicit — a failed intervention is not repeated,
 * it changes the chapter, and the story carries on from there. Offering a retry would turn
 * every failure into paperwork.
 */
export function settle(scenario, { pistasGeneradas = 0, caido = false, dif = null } = {}) {
  const principal = scenario.objetivos.find((o) => o.principal);
  const opcionales = scenario.objetivos.filter((o) => !o.principal);
  const cumplidos = opcionales.filter((o) => o.cumplido).length;

  let grado;
  if (caido) grado = "fallido";
  else if (principal?.cumplido) {
    grado = pistasGeneradas === 0 ? "impecable" : pistasGeneradas <= 1 ? "limpio" : "sucio";
  } else grado = cumplidos > 0 ? "parcial" : "fallido";

  // Leyenda urbana never lets a failure be a failure (§10.2): it lands as Parcial and the
  // story keeps its shape for a player who came for the story.
  if (grado === "fallido" && dif?.falloSeVuelveParcial) grado = "parcial";

  const regla = RESULT_RULES[grado];
  return {
    grado,
    rango: regla.rango,
    materiales: regla.materiales,
    prensa: regla.prensa,
    pistasGeneradas,
    objetivoPrincipal: !!principal?.cumplido,
    opcionalesCumplidos: cumplidos,
    opcionalesTotales: opcionales.length,
    turnosUsados: scenario.reloj.turno,
    turnosDisponibles: scenario.reloj.max,
    testigosPresentes: scenario.testigos.map((t) => t.id),
    interesTestigos: regla.interesTestigos ?? 0,
  };
}

/**
 * The exposure a route or an action carries into `suspicion.js`. Kept here rather than
 * there because visibility is a property of the SCENARIO — the same technique in a tunnel
 * and in the middle of the plaza are not the same act.
 */
export function exposureAt(scenario, nodoId, visibilidadAccion) {
  const nodo = scenario.nodos.find((n) => n.id === nodoId);
  return {
    visibilidad: visibilidadAccion,
    distrito: scenario.distrito,
    proximidades: Object.fromEntries(
      scenario.testigos.map((t) => {
        const dist = hopDistances(scenario, t.nodo)[nodoId];
        // A witness two streets away sees a fraction of what one in the same node sees.
        const proximidad = dist === undefined ? 0 : clamp(1 - dist * 0.35, 0, 1);
        return [t.id, proximidad * (nodo?.visibilidad ?? 1)];
      }),
    ),
  };
}
